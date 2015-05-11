"use strict";
(function() {
  var BackgroundCommands, checkKeyQueue //
    , frameIdsForTab, urlForTab, ContentSettings //
    , handleMainPort, handleResponse, postResponse, funcDict //
    , helpDialogHtmlForCommandGroup, resetKeys //
    , openMultiTab //
    , populateKeyCommands, executeCommand, commandCount //
    , requestHandlers //
    , firstKeys, splitKeyQueue //
    , secondKeys, currentCount, currentFirst;

  frameIdsForTab = {};

  window.urlForTab = urlForTab = {};

  window.helpDialogHtml = function(showUnboundCommands, showCommandNames, customTitle) {
    var command, commandsToKey, dialogHtml, group, key;
    commandsToKey = {};
    for (key in Commands.keyToCommandRegistry) {
      command = Commands.keyToCommandRegistry[key].command;
      commandsToKey[command] = (commandsToKey[command] || []).concat(key);
    }
    dialogHtml = Settings.get("help_dialog");
    return dialogHtml.replace(new RegExp("\\{\\{(version|title|" + Object.keys(Commands.commandGroups).join('|') + ")\\}\\}", "g"), function(_, group) {
      return (group === "version") ? Utils.getCurrentVersion()
        : (group === "title") ? (customTitle || "Help")
        : helpDialogHtmlForCommandGroup(group, commandsToKey, Commands.availableCommands, showUnboundCommands, showCommandNames);
    });
  };

  helpDialogHtmlForCommandGroup = function(group, commandsToKey, availableCommands, showUnboundCommands, showCommandNames) {
    var bindings, command, html, isAdvanced, _i, _len, _ref;
    html = [];
    _ref = Commands.commandGroups[group];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      command = _ref[_i];
      bindings = (commandsToKey[command] || [""]).join(", ");
      if (showUnboundCommands || commandsToKey[command]) {
        isAdvanced = Commands.advancedCommands.indexOf(command) >= 0;
        html.push("<tr class='vimB vimI vimHelpTr" + (isAdvanced ? " vimHelpAdvanced" : "")
          , "'>\n\t<td class='vimB vimI vimHelpTd vimHelpShortKey'>\n\t\t<span class='vimB vimI vimHelpShortKey2'>", Utils.escapeHtml(bindings)
          , "</span>\n\t</td>\n\t<td class='vimB vimI vimHelpTd'>:</td>\n\t<td class='vimB vimI vimHelpTd vimHelpCommandInfo'>"
          , Utils.escapeHtml(availableCommands[command].description));
        if (showCommandNames) {
          html.push("\n\t\t<span class='vimB vimI vimHelpCommandName'>(" + command + ")</span>");
        }
        html.push("</td>\n</tr>\n");
      }
    }
    return html.join("");
  };

  openMultiTab = function(rawUrl, count, parentTab) {
    if (!(count >= 1)) return;
    var wndId = parentTab.windowId, option = {
      url: rawUrl,
      windowId: wndId,
      index: parentTab.index + 1,
      openerTabId: parentTab.id,
      selected: parentTab.active
    };
    chrome.tabs.create(option, option.selected ? function(tab) {
      if (tab.windowId !== wndId) {
        chrome.windows.update(tab.windowId, {focused: true});
      }
    } : null);
    if (count < 2) return;
    option.selected = false;
    do {
      ++option.index;
      chrome.tabs.create(option);
    } while(--count > 1);
  };

  ContentSettings = {
    _urlHeadRegex: /^[a-z]+:\/\/[^\/]+\//,
    clear: function(contentType, tab) {
      var cs = chrome.contentSettings[contentType];
      if (tab) {
        cs.clear({ scope: (tab.incognito ? "incognito_session_only" : "regular") });
        return;
      }
      cs.clear({ scope: "regular" });
      cs.clear({ scope: "incognito_session_only" }, function() {
        return chrome.runtime.lastError;
      });
    },
    turnCurrent: function(contentType, tab) {
      if (!Utils.hasOrdinaryUrlPrefix(tab.url) || tab.url.startsWith("chrome")) {
        return;
      }
      var pattern = tab.url, _this = this;
      chrome.contentSettings[contentType].get({
        primaryUrl: pattern,
        incognito: tab.incognito
      }, function (opt) {
        if (!pattern.startsWith("file:")) {
          pattern = _this._urlHeadRegex.exec(pattern)[0] + "*";
        }
        chrome.contentSettings[contentType].set({
          primaryPattern: pattern,
          scope: tab.incognito ? "incognito_session_only" : "regular",
          setting: (opt && opt.setting === "allow") ? "block" : "allow"
        }, function() {
          ++tab.index;
          funcDict.reopenTab(tab);
        });
      });
    },
    ensure: function (contentType, tab) {
      if (!Utils.hasOrdinaryUrlPrefix(tab.url) || tab.url.startsWith("chrome")) {
        return;
      }
      var pattern = tab.url, _this = this;
      chrome.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function(opt) {
        if (!pattern.startsWith("file:")) {
          pattern = _this._urlHeadRegex.exec(pattern)[0] + "*";
        }
        if (chrome.runtime.lastError) {
          chrome.contentSettings[contentType].get({primaryUrl: tab.url}, function (opt) {
            if (opt && opt.setting === "allow") { return; }
            opt = {type: "normal", incognito: true, focused: false, url: "about:blank"};
            chrome.windows.create(opt, function (wnd) {
              var leftTabId = wnd.tabs[0].id;
              _this.setAndUpdate(contentType, tab, pattern, wnd.id, true, function() {
                chrome.tabs.remove(leftTabId);
              });
            });
          });
          return chrome.runtime.lastError;
        }
        if (opt && opt.setting === "allow" && tab.incognito) {
          _this.updateTab(tab);
          return;
        }
        chrome.windows.getAll(function(wnds) {
          wnds = wnds.filter(funcDict.isIncNor);
          if (!wnds.length) {
            console.log("%cContentSettings.ensure", "color:red;", "get incognito content settings", opt //
              , " but can not find a incognito window");
          } else if (opt && opt.setting === "allow") {
            _this.updateTab(tab, wnds[wnds.length - 1].id);
          } else if (tab.incognito && wnds.filter(function(wnd) { return wnd.id === tab.windowId; }).length === 1) {
            _this.setAndUpdate(contentType, tab, pattern);
          } else {
            _this.setAndUpdate(contentType, tab, pattern, wnds[wnds.length - 1].id);
          }
        });
      });
    },
    setAndUpdate: function(contentType, tab, pattern, wndId, doSyncWnd, callback) {
      callback = this.updateTabAndWindow.bind(this, tab, wndId, callback);
      this.setAllowInIncognito(contentType, pattern, doSyncWnd && wndId !== tab.windowId
        ? chrome.windows.get.bind(chrome.windows, tab.windowId, callback) : callback);
    },
    setAllowInIncognito: function(contentType, pattern, callback) {
      chrome.contentSettings[contentType].set({
        primaryPattern: pattern,
        scope: "incognito_session_only",
        setting: "allow"
      }, function() {
        if (callback) {
          callback();
        }
        return chrome.runtime.lastError;
      });
    },
    updateTabAndWindow: function(tab, wndId, callback, oldWnd) {
      this.updateTab(tab, wndId, callback);
      wndId && chrome.windows.update(wndId, {
        focused: true,
        state: oldWnd ? oldWnd.state : undefined
      });
    },
    updateTab: function(tab, newWindowId, callback) {
      tab.windowId = newWindowId ? newWindowId : tab.windowId;
      tab.selected = true;
      if (!newWindowId || tab.windowId === newWindowId) {
        ++tab.index;
      } else {
        delete tab.index;
      }
      funcDict.reopenTab(tab);
      if (callback) {
        callback();
      }
    }
  };

  funcDict = {
    isIncNor: function(wnd) {
      return wnd.incognito && wnd.type === "normal";
    },
    selectFrom: function(tabs) {
      var i = tabs.length;
      while (0 < --i) {
        if (tabs[i].selected) {
          return tabs[i];
        }
      }
      return tabs[0];
    },
    reopenTab: function(tab) {
      chrome.tabs.create({
        windowId: tab.windowId,
        selected: true,
        url: tab.url,
        openerTabId: tab.openerTabId,
        index: tab.index
      });
      chrome.tabs.remove(tab.id);
    },
    makeTempWindow: function(tabIdUrl, incognito, callback) {
      chrome.windows.create({
        type: "normal",
        left: 0, top: 0, width: 50, height: 50,
        focused: false,
        incognito: incognito,
        tabId: tabIdUrl > 0 ? tabIdUrl : undefined,
        url: tabIdUrl > 0 ? undefined : tabIdUrl
      }, callback);
    },

    openUrlInIncognito: function(request, tab, wnds) {
      wnds = wnds.filter(funcDict.isIncNor);
      request.active = (request.active !== false);
      request.url = Utils.convertToUrl(request.url);
      if (wnds.length) {
        var inCurWnd = wnds.filter(function(wnd) {
          return wnd.id === tab.windowId
        }).length > 0, options = {
          url: request.url,
          windowId: inCurWnd ? tab.windowId : wnds[wnds.length - 1].id
        };
        if (inCurWnd) {
          options.index = tab.index + 1;
          options.openerTabId = tab.id;
        }
        chrome.tabs.create(options);
        if (request.active && !inCurWnd) {
          chrome.windows.update(options.windowId, {focused: true});
        }
        return;
      }
      chrome.windows.create({
        type: "normal",
        url: request.url,
        incognito: true
      }, function(newWnd) {
        if (!request.active) {
          chrome.windows.update(tab.windowId, {focused: true});
        }
        chrome.windows.get(tab.windowId, function(wnd) {
          if (wnd.type === "normal") {
            chrome.windows.update(newWnd.id, {state: wnd.state});
          }
        });
      })
    },

    createTab: [function(wnd) {
      var tab = funcDict.selectFrom(wnd.tabs);
      if (wnd.type !== "normal") {
        tab.windowId = undefined;
        tab.index = 999;
      } else if (wnd.incognito) {
        // newTabUrl_f is disabled to be opened in a incognito window directly
        funcDict.createTab[1](Settings.get("newTabUrl_f"), tab
          , (--commandCount > 0) ? funcDict.duplicateTab[1] : null, wnd.tabs);
        return;
      }
      tab.id = undefined;
      openMultiTab(Settings.get("newTabUrl_f"), commandCount, tab);
    }, function(url, tab, repeat, allTabs) {
      var urlLower = url.toLowerCase().split('#', 1)[0], tabs;
      allTabs = allTabs.filter(function(tab1) {
        var url = tab1.url.toLowerCase(), end = url.indexOf("#");
        return ((end < 0) ? url : url.substring(0, end)) === urlLower;
      });
      if (allTabs.length === 0) {
        chrome.windows.getAll(funcDict.createTab[2].bind(url, tab, repeat));
        return;
      }
      tabs = allTabs.filter(function(tab1) { return tab1.index >= tab.index; });
      tab = tabs.length > 0 ? tabs[0] : allTabs[allTabs.length - 1];
      chrome.tabs.duplicate(tab.id);
      repeat && repeat(tab.id);
    }, function(tab, repeat, wnds) {
      wnds = wnds.filter(function(wnd) {
        return !wnd.incognito && wnd.type === "normal";
      });
      if (wnds.length > 0) {
        funcDict.createTab[3](this, tab, repeat, wnds[0]);
        return;
      }
      funcDict.makeTempWindow("about:blank", false, //
      funcDict.createTab[3].bind(null, this, tab, function(newTab) {
        chrome.windows.remove(newTab.windowId);
        repeat && repeat(newTab.id);
      }));
    }, function(url, tab, callback, wnd) {
      chrome.tabs.create({
        selected: false,
        windowId: wnd.id,
        url: url
      }, function(newTab) {
        funcDict.makeTempWindow(newTab.id, true, //
        funcDict.createTab[4].bind(tab, callback, newTab));
      });
    }, function(callback, newTab) {
      chrome.tabs.move(newTab.id, {
        index: this.index + 1,
        windowId: this.windowId
      }, function() {
        callback && callback(newTab);
        chrome.tabs.update(newTab.id, { selected: true });
      });
    }, function(tab) {
      tab.id = undefined;
      openMultiTab(Settings.get("newTabUrl_f"), commandCount, tab);
    }],
    duplicateTab: [function(tab, wnd) {
      if (wnd.incognito && !tab.incognito) {
        funcDict.duplicateTab[1](tab.id);
      } else {
        ++tab.index;
        tab.active = false;
        openMultiTab(tab.url, commandCount, tab);
      }
    }, function(id) {
      var count = commandCount;
      while (--count >= 0) {
        chrome.tabs.duplicate(id);
      }
    }],
    moveTabToNextWindow: [function(tab, wnds0) {
      var wnds, ids, index, state;
      wnds = wnds0.filter(function(wnd) { return wnd.incognito === tab.incognito && wnd.type === "normal"; });
      if (wnds.length > 0) {
        ids = wnds.map(function(wnd) { return wnd.id; });
        index = ids.indexOf(tab.windowId);
        if (ids.length >= 2 || index === -1) {
          chrome.tabs.getSelected(ids[(index + 1) % ids.length] //
            , funcDict.moveTabToNextWindow[1].bind(null, tab, index));
          return;
        }
      } else {
        index = tab.windowId;
        wnds = wnds0.filter(function(wnd) { return wnd.id === index; });
      }
      if (wnds.length === 1 && wnds[0].type === "normal") {
        state = wnds[0].state;
      }
      chrome.windows.create({
        type: "normal",
        tabId: tab.id,
        incognito: tab.incognito
      }, state ? function(wnd) {
        chrome.windows.update(wnd.id, {state: state});
      } : null);
    }, function(tab, oldIndex, tab2) {
      if (oldIndex >= 0) {
        funcDict.moveTabToNextWindow[2](tab.id, tab2);
        return;
      }
      funcDict.makeTempWindow(tab.id, tab.incognito, //
      funcDict.moveTabToNextWindow[2].bind(null, tab.id, tab2));
    }, function(tabId, tab2) {
      chrome.tabs.move(tabId, {index: tab2.index + 1, windowId: tab2.windowId});
      chrome.tabs.update(tabId, {selected: true});
      chrome.windows.update(tab2.windowId, {focused: true});
    }],
    moveTabToIncognito: [function(tab, wnd) {
      if (wnd.incognito && tab.incognito) { return; }
      var options = {type: "normal", tabId: tab.id, incognito: true}, url = tab.url;
      if (tab.incognito) {
      } else if (Utils.isRefusingIncognito(url)) {
        if (wnd.incognito) {
          return;
        }
      } else if (wnd.incognito) {
        ++tab.index;
        funcDict.reopenTab(tab);
        return;
      } else {
        options.url = url;
      }
      chrome.windows.getAll(funcDict.moveTabToIncognito[1].bind(null, options, wnd));
    }, function(options, wnd, wnds) {
      var tabId;
      wnds = wnds.filter(funcDict.isIncNor);
      if (wnds.length) {
        chrome.tabs.getSelected(wnds[wnds.length - 1].id,
        funcDict.moveTabToIncognito[2].bind(null, options));
        return;
      }
      if (options.url) {
        tabId = options.tabId;
        options.tabId = undefined;
      }
      chrome.windows.create(options, wnd.type !== "normal" ? null : function(newWnd) {
        chrome.windows.update(newWnd.id, {state: wnd.state});
      });
      if (options.url) {
        chrome.tabs.remove(tabId);
      }
    }, function(options, tab2) {
      if (options.url) {
        chrome.tabs.create({url: options.url, index: tab2.index + 1, windowId: tab2.windowId});
        chrome.tabs.remove(options.tabId);
        chrome.windows.update(tab2.windowId, {focused: true});
        return;
      }
      funcDict.makeTempWindow(options.tabId, true, //
      funcDict.moveTabToNextWindow[2].bind(null, options.tabId, tab2));
    }],
    removeTab: function(tab, curTabs, wnds) {
      var url = Settings.get("newTabUrl_f"), toCreate;
      wnds = wnds.filter(function(wnd) { return wnd.type === "normal"; });
      if (wnds.length <= 1) {
        // protect the last window
        toCreate = {};
        if (wnds.length === 1 && wnds[0].incognito && !Utils.isRefusingIncognito(url)) {
          toCreate.windowId = wnds[0].id;
        }
        // other urls will be disabled if incognito else auto in current window
      }
      else if (!tab.incognito) {
        // protect the last "normal & not incognito" window which has currentTab if it exists
        wnds = wnds.filter(function(wnd) { return !wnd.incognito; });
        if (wnds.length === 1 && wnds[0].id === tab.windowId) {
          toCreate = { windowId: tab.windowId };
        }
      }
      if (toCreate) {
        curTabs = (curTabs.length > 1) ? curTabs.map(function(tab) { return tab.id; }) : [tab.id];
        toCreate.index = curTabs.length;
        toCreate.url = url;
        chrome.tabs.create(toCreate);
        chrome.tabs.remove(curTabs);
      } else {
        chrome.windows.remove(tab.windowId);
      }
    },
    selectTab: function(tabs, ind) {
      var len = tabs.length, toSelect;
      if (len > 1) {
        toSelect = tabs[(ind >= 0 ? 0 : len) + (ind % len)];
        if (!toSelect.selected) {
          chrome.tabs.update(toSelect.id, {
            selected: true
          });
        }
      }
    },
    removeTabsRelative: function(activeTab, direction, tabs) {
      var i = activeTab.index;
      if (direction > 0) {
        ++i;
        tabs = tabs.slice(i, i + direction);
      } else {
        if (direction < 0) {
          tabs = tabs.slice(Math.max(i + direction, 0), i);
        } else {
          tabs.splice(i, 1);
        }
        if (!activeTab.pinned) {
          tabs = tabs.filter(function(tab) { return !tab.pinned; });
        }
      }
      if (tabs.length > 0) {
        chrome.tabs.remove(tabs.map(function(tab) { return tab.id; }));
      }
    }
  };
  funcDict.__proto__ = null;

  // function (const Tab tab <% if .useTab is 1 else %> const Tab tabs[]);
  BackgroundCommands = {
    createTab: null,
    duplicateTab: function(tab) {
      chrome.tabs.duplicate(tab.id);
      if (--commandCount > 0) {
        chrome.windows.get(tab.windowId, funcDict.duplicateTab[0].bind(null, tab));
      }
    },
    moveTabToNextWindow: function(tab) {
      chrome.windows.getAll(funcDict.moveTabToNextWindow[0].bind(null, tab));
    },
    moveTabToIncognito: function(tab) {
      chrome.windows.get(tab.windowId, funcDict.moveTabToIncognito[0].bind(null, tab));
    },
    enableImageTemp: function(tab) {
      ContentSettings.ensure("images", tab);
    },
    toggleImage: function(tab) {
      ContentSettings.turnCurrent("images", tab);
    },
    clearImageCS: function(tab) {
      ContentSettings.clear("images", tab);
    },
    nextTab: function(tabs) {
      funcDict.selectTab(tabs, funcDict.selectFrom(tabs).index + commandCount);
    },
    previousTab: function(tabs) {
      funcDict.selectTab(tabs, funcDict.selectFrom(tabs).index - commandCount);
    },
    firstTab: function(tabs) {
      funcDict.selectTab(tabs, 0);
    },
    lastTab: function(tabs) {
      funcDict.selectTab(tabs, -1);
    },
    removeTab: function(tabs) {
      var tab = tabs[0];
      if (tab.selected && tabs.length <= commandCount) {
        chrome.windows.getAll(funcDict.removeTab.bind(null, tab, tabs));
        return;
      }
      tab = funcDict.selectFrom(tabs);
      if (1 < commandCount) {
        --tab.index;
        funcDict.removeTabsRelative(tab, commandCount, tabs);
      } else {
        chrome.tabs.remove(tab.id);
      }
    },
    restoreTab: function() {
      var count = commandCount;
      while (--count >= 0) {
        chrome.sessions.restore();
      }
    },
    restoreGivenTab: function() {
      chrome.sessions.getRecentlyClosed(function(list) {
        if (commandCount <= list.length) {
          chrome.sessions.restore(list[commandCount - 1].tab.sessionId);
        }
      });
    },
    blank: function() {},
    openCopiedUrlInCurrentTab: function() {
      requestHandlers.openUrlInCurrentTab({
        url: Clipboard.paste()
      });
    },
    openCopiedUrlInNewTab: function(tab) {
      openMultiTab(Utils.convertToUrl(Clipboard.paste()), commandCount, tab);
    },
    togglePinTab: function(tab) {
      chrome.tabs.update(tab.id, {
        pinned: !tab.pinned
      });
    },
    reloadTab: function() {
      if (commandCount <= 1) {
        chrome.tabs.reload();
        return;
      }
      chrome.tabs.getAllInWindow(null, function(tabs) {
        tabs.slice(funcDict.selectFrom(tabs).index, commandCount) //
        .forEach(function(tab1) {
          chrome.tabs.reload(tab1.id);
        });
      });
    },
    reopenTab: function(tab) {
      ++tab.index;
      if (!Utils.isRefusingIncognito(tab.url)) {
        funcDict.reopenTab(tab);
        return;
      }
      chrome.windows.get(tab.windowId, function(wnd) {
        if (!wnd.incognito) {
          funcDict.reopenTab(tab);
        }
      });
    },
    moveTabLeft: function(tab) {
      chrome.tabs.move(tab.id, {
        index: Math.max(0, tab.index - commandCount)
      });
    },
    moveTabRight: function(tab) {
      chrome.tabs.move(tab.id, {
        index: tab.index + commandCount
      });
    },
    nextFrame: function(tab, frameId) {
      var tabId = tab.id, frames = frameIdsForTab[tabId], count;
      if (!frames || frames.length <= 2) { return; }
      if (frameId != null) {
        count = 1;
      } else {
        frameId = frames[0];
        count = commandCount;
      }
      count += Math.max(0, frames.indexOf(frameId, 1));
      if (count %= frames.length - 1) {} else {
        count = frames.length - 1;
      }
      if (frames[count] !== frames[0]) {
        chrome.tabs.sendMessage(tabId, {
          name: "focusFrame",
          frameId: frames[count]
        });
      }
    },
    mainFrame: function(tab) {
      chrome.tabs.sendMessage(tab.id, {
        name: "focusFrame",
        frameId: 0
      });
    },
    closeTabsOnLeft: function(tabs) {
      funcDict.removeTabsRelative(funcDict.selectFrom(tabs), -commandCount, tabs);
    },
    closeTabsOnRight: function(tabs) {
      funcDict.removeTabsRelative(funcDict.selectFrom(tabs), commandCount, tabs);
    },
    closeOtherTabs: function(tabs) {
      funcDict.removeTabsRelative(funcDict.selectFrom(tabs), 0, tabs);
    },
    copyCurrentTitle: function(tab) {
      Clipboard.copy(tab.title);
    },
    copyCurrentUrl: function(tab) {
      Clipboard.copy(tab.url);
    },
    toggleViewSource: function(tab) {
      if (tab.url.startsWith("view-source:")) {
        tab.url = tab.url.substring(12);
      } else {
        tab.url = "view-source:" + tab.url;
      }
      requestHandlers.openUrlInNewTab(tab, tab);
    }
  };
  BackgroundCommands.__proto__ = null;

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status !== "loading" || frameIdsForTab[tabId]) {
      return; // topFrame is alive, so loading is caused by may an iframe
    }
    Marks.RemoveMarksForTab(tabId);
  });

  resetKeys = function() {
    currentFirst = null;
    currentCount = 0;
  };

  populateKeyCommands = function() {
    var key, ref1, ref2, first, arr, keyRegex = Commands.keyRegex;
    resetKeys();
    ref1 = firstKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    ref2 = secondKeys = {"": ["0"]}; // "0" is for key queues like "10n"
    ref2.__proto__ = null;
    for (key in Commands.keyToCommandRegistry) {
      if (key.charCodeAt(0) >= 48 && key.charCodeAt(0) <= 57) {
        console.warn("invalid key command:", key, "(the first char can not be [0-9])");
      } else if ((arr = key.match(keyRegex)).length === 1) {
        ref1.push(key);
      } else if (arr.length !== 2) {
        console.warn("invalid key command:", key, "=>", arr);
      } else if ((first = arr[0]) in ref2) {
        ref2[first].push(arr[1]);
      } else {
        ref1.push(first);
        ref2[first] = [arr[1]];
      }
    }
    ref1.sort().reverse();
    for (first in ref2) {
      ref1 = ref2[first];
      ref1.sort().reverse();
    }
  };

  handleResponse = function(msgId, func, request, tab) {
    this.postMessage({_msgId: msgId, response: func(request, tab)});
  };
  
  postResponse = function(msgId, response) {
    this.postMessage({_msgId: msgId, response: response});
  };

  handleMainPort = function(request, port) {
    var key, func, id;
    if (id = request._msgId) {
      request = request.request;
      if (key = request.handler) {
        func = requestHandlers[key];
        if (func.useTab) {
          chrome.tabs.getSelected(null, handleResponse.bind(port, id, func, request));
        } else {
          port.postMessage({_msgId: id, response: func(request)})
        }
      }
      else if (key = request.handlerOmni) {
        func = Completers[key];
        key = request.query;
        func.filter(key ? key.split(" ") : [], postResponse.bind(port, id));
      }
    }
    else if (key = request.handlerKey) {
      key = checkKeyQueue(key, port);
      if (currentFirst !== key) {
        currentFirst = key;
        port.postMessage({
          name: "refreshKeyQueue",
          currentFirst: key
        });
      }
    }
    else if (key = request.handler) {
      func = requestHandlers[key];
      if (func.useTab) {
        chrome.tabs.getSelected(null, func.bind(null, request));
      } else {
        func(request);
      }
    }
    else if (key = request.handlerSettings) {
      var i, ref;
      id = port.sender.tab.id;
      switch (key) {
      case "load":
        port.postMessage({
          name: "settings",
          load: Settings.bufferToLoad,
          response: ((request = request.request) //
            ? requestHandlers[request.handler](request, id) : null)
        });
        break;
      case "reg":
        port.postMessage({
          name: "registerFrame",
          css: Settings.get("userDefinedCss_f")
        });
        // no `break;`
      case "rereg":
        i = request.frameId;
        ref = frameIdsForTab[id];
        if (ref) {
          ref.push(i);
        } else {
          frameIdsForTab[id] = [i, i];
        }
        break;
      case "doreg":
        i = request.frameId;
        ref = frameIdsForTab[id];
        if (ref) {
          if (ref.indexOf(i) === -1) {
            ref.push(i);
          }
        } else {
          frameIdsForTab[id] = [i, i];
        }
        break;
      case "unreg":
        if (i = request.frameId) {
          if (ref = frameIdsForTab[id]) {
            i = ref.indexOf(i, 1);
            if (i === ref.length - 1) {
              ref.pop();
            } else if (i >= 0) {
              ref.splice(i, 1);
            }
          }
        } else {
          delete frameIdsForTab[id];
          delete urlForTab[id];
        }
        break;
      }
    }
  };

  checkKeyQueue = function(command, port) {
    var count, registryEntry;
    if (currentFirst) {
      if (registryEntry = Commands.keyToCommandRegistry[currentFirst + command]) {
        count = currentCount || 1;
      }
      currentCount = 0;
    }
    if (registryEntry) {
    } else if ((count = command.charCodeAt(0) - 48) >= 0 && count <= 9) {
      return (currentCount = currentCount * 10 + count) ? "" : null;
    } else if (registryEntry = Commands.keyToCommandRegistry[command]) {
      count = currentCount || 1;
      currentCount = 0;
    } else if (command in secondKeys) {
      return command;
    } else {
      currentCount = 0;
      return null;
    }
    if (!registryEntry.background) {
      currentFirst = null;
    }
    executeCommand(registryEntry.command, registryEntry, count, port);
    return null;
  };

  executeCommand = function(command, registryEntry, count, port) {
    if (registryEntry.noRepeat === true) {
      count = 1;
    } else if (!(registryEntry.noRepeat > 0 && count > registryEntry.noRepeat)) {
    } else if (!
      confirm("You have asked Vimium++ to perform " + count + " repeats of the command:\n\t"
        + Commands.availableCommands[command].description
        + "\n\nAre you sure you want to continue?")
    ) {
      return;
    }
    if (registryEntry.background) {
      commandCount = count;
      var func = BackgroundCommands[command];
      count = func.useTab;
      if (count === 2) {
        chrome.tabs.getAllInWindow(null, func);
      } else if (count) {
        chrome.tabs.getSelected(null, func);
      } else {
        func();
      }
      return;
    }
    port.postMessage({
      name: "executePageCommand",
      command: command,
      count: count
    });
  };

  // function (request, Tab tab = null);
  window.g_requestHandlers = requestHandlers = {
    setSetting: function(request) {
      Settings.set(request.key, request.value);
    },
    parseSearchUrl: function(request) {
      var url = request.url, map, decoders, pattern, _i, str, arr;
      if (!Utils.hasOrdinaryUrlPrefix(url)) {
        return "";
      }
      map = Settings.get("searchEnginesMap");
      decoders = map[""];
      if (url.startsWith("https:")) {
        url = "http:" + url.substring(6);
      }
      for (_i = decoders.length; 0 <= --_i; ) {
        pattern = decoders[_i];
        if (url.startsWith(str = pattern[0])) {
          arr = pattern[1].exec(url.substring(str.length));
          if (arr && (str = arr[1])) {
            url = pattern[2];
            if (map[url].$s) {
              str = str.split("+").map(Utils.decodeURLPart).join(" ");
            } else {
              str = Utils.decodeURLPart(str);
            }
            str = str.replace(Utils.spacesRegex, " ").trim();
            return url + " " + str;
          }
        }
      }
      return "";
    },
    restoreSession: function(request) {
      chrome.sessions.restore(request.sessionId);
    },
    openRawUrl: function(request, tab) {
      openMultiTab(request.url, 1, tab);
    },
    openUrlInNewTab: function(request, tab) {
      openMultiTab(Utils.convertToUrl(request.url), 1, tab);
    },
    openUrlInIncognito: function(request, tab) {
      chrome.windows.getAll(funcDict.openUrlInIncognito.bind(null, request, tab));
    },
    openUrlInCurrentTab: function(request) {
      var url = Utils.convertToUrl(request.url);
      chrome.tabs.update(null, {
        url: url
      }, function() {
        if (chrome.runtime.lastError) {
          console.log("Error when update tab to: ", url);
        }
        return chrome.runtime.lastError;
      });
    },
    dispatchMsg: function(request) {
      chrome.tabs.sendMessage(request.tabId, {
        name: "dispatchMsg", frameId: 0,
        target: request.target, source: request.source,
        command: request.command, args: request.args
      });
    },
    frameFocused: function(request) {
      var tabId = request.tabId, frames;
      if (tabId) {
        urlForTab[tabId] = request.url;
        // frames would be undefined if in a tab, all "reg" messages were sent
        //   to a closing port, which means the frontend try `runtime.connect`
        //   but background kept not prepared.
        // This can only happen when the system is too slow.
        // For example, Chrome's first startup since the system boots.
        if (frames = frameIdsForTab[tabId]) {
          frames[0] = request.frameId;
        }
        requestHandlers.setIcon(tabId, request.status);
      }
      return {
        currentFirst: currentFirst
      };
    },
    checkIfEnabled: function(request) {
      return Exclusions.getPattern(request.url);
    },
    initIfEnabled: function(request, tabId) {
      var pass = Exclusions.getPattern(request.url);
      if (request.focused) {
        requestHandlers.setIcon(tabId, pass !== null ? (pass ? "partial" : "disabled") : "enabled");
      }
      return {
        name: "ifEnabled",
        passKeys: pass,
        currentFirst: currentFirst,
        firstKeys: firstKeys,
        secondKeys: secondKeys,
        tabId: tabId
      };
    },
    nextFrame: function(request) {
      BackgroundCommands.nextFrame({id: request.tabId}, request.frameId);
    },
    initHelp: function() {
      return {
        html: helpDialogHtml(),
        advanced: Settings.get("showAdvancedCommands")
      };
    },
    initVomnibar: function() {
      return {
        html: Settings.get("vomnibar"),
        relevancy: Settings.get("showOmniRelevancy")
      };
    },
    copyToClipboard: function(request) {
      Clipboard.copy(request.data);
    },
    copyCurrentUrl: function(_0, tab) {
      Clipboard.copy(tab.url);
    },
    saveHelpDialogSettings: function(request) {
      Settings.set("showAdvancedCommands", request.showAdvancedCommands);
    },
    selectTab: function(request) {
      chrome.tabs.update(request.tabId, { selected: true });
      chrome.tabs.get(request.tabId, function(tab) {
        chrome.windows.update(tab.windowId, { focused: true });
      });
    },
    refreshCompleter: function(request) {
      Completers[request.omni].refresh();
    },
    setBadge: function() {},
    setIcon: function() {},
    esc: resetKeys,
    createMark: Marks.Create,
    gotoMark: Marks.GoTo
  };
  requestHandlers.__proto__ = null;

  Settings.reloadFiles();
  Settings.postUpdate("searchEngines", null);
  Settings.postUpdate("userDefinedCss");

  Settings.updateHooks.newTabUrl = function(url) {
    url = (/^\/?[^:\s]*$/.test(url)) ? chrome.runtime.getURL(url) : Utils.convertToUrl(url);
    this.set('newTabUrl_f', url);
    BackgroundCommands.createTab = Utils.isRefusingIncognito(url)
    ? chrome.windows.getCurrent.bind(chrome.windows, {populate: true}, funcDict.createTab[0])
    : chrome.tabs.getSelected.bind(chrome.tabs, null, funcDict.createTab[5]);
  };
  Settings.postUpdate("newTabUrl");

  Settings.updateHooks.exclusionRules = function(rules) {
    Exclusions.setRules(rules);
    resetKeys();
    this.postUpdate("updateAll", {
      name: "checkIfEnabled"
    });
  };

  Settings.updateHooks.keyMappings = function(value) {
    Commands.parseKeyMappings(value);
    populateKeyCommands(); // resetKeys has been called in this
    this.postUpdate("updateAll", {
      name: "refreshKeyMappings",
      firstKeys: firstKeys,
      secondKeys: secondKeys
    });
  };

  Settings.buildBuffer();

  chrome.commands.onCommand.addListener(function(command) {
    var count;
    if (currentFirst !== null) {
      count = currentFirst ? 1 : (currentCount || 1);
      resetKeys();
      chrome.tabs.getSelected(null, function(tab) {
        // `frameId: 0` is not needed, for currentFirst is refreshed frequently
        chrome.tabs.sendMessage(tab.id, { name: "esc" });
      });
    } else {
      count = 0;
    }
    executeCommand(command, Commands.availableCommands[command], count);
  });

  chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "main") {
      port.onMessage.addListener(handleMainPort);
    } else {
      port.disconnect();
    }
  });

  window.onunload = function() {
    ContentSettings.clear("images");
  };

  Commands.parseKeyMappings(Settings.get("keyMappings"));
  populateKeyCommands();
  Exclusions.setRules(Settings.get("exclusionRules"));

  (function() {
    var ref, i, ref2;
    ref = ["copyCurrentUrl", "openUrlInNewTab", "openUrlInIncognito" //
      , "openRawUrl", "createMark" //
    ];
    ref2 = requestHandlers;
    for (i = ref.length; 0 <= --i; ) {
      ref2[ref[i]].useTab = 1;
    }

    ref = ["nextTab", "previousTab", "firstTab", "lastTab", "removeTab" //
      , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs" //
    ];
    ref2 = BackgroundCommands;
    for (i = ref.length; 0 <= --i; ) {
      ref2[ref[i]].useTab = 2;
    }
    ref = ["duplicateTab", "moveTabToNextWindow", "moveTabToIncognito" //
      , "enableImageTemp", "toggleImage", "clearImageCS" //
      , "openCopiedUrlInNewTab", "togglePinTab" //
      , "reopenTab", "moveTabLeft", "moveTabRight", "nextFrame", "mainFrame" //
      , "copyCurrentTitle", "copyCurrentUrl", "toggleViewSource"
    ];
    for (i = ref.length; 0 <= --i; ) {
      ref2[ref[i]].useTab = 1;
    }
  })();
})();
