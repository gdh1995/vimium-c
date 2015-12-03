"use strict";
var Marks, Clipboard, Completers, Commands, g_requestHandlers;
(function() {
  var BackgroundCommands, ContentSettings, checkKeyQueue, commandCount //
    , currentCount, currentFirst, currentCommand, executeCommand, extForTab
    , firstKeys, frameIdsForTab, funcDict, handleMainPort
    , helpDialogHtml, helpDialogHtmlForCommand //
    , helpDialogHtmlForCommandGroup, needIcon, openMultiTab //
    , requestHandlers, resetKeys, secondKeys, sendToTab //
    , urlForTab;

  Settings.frameIdsForTab = frameIdsForTab = { __proto__: null };

  Settings.urlForTab = urlForTab = { __proto__: null };

  extForTab = { __proto__: null };

  needIcon = false;

  currentCommand = {
    options: null,
    port: null
  };

  helpDialogHtml = function(showUnbound, showNames, customTitle) {
    var command, commandsToKey, dialogHtml, group, key, ref = Commands.keyToCommandRegistry;
    commandsToKey = {};
    for (key in ref) {
      command = ref[key].command;
      commandsToKey[command] = (commandsToKey[command] || []).concat(key);
    }
    showUnbound = showUnbound ? true : false;
    showNames = showNames ? true : false;
    customTitle || (customTitle = "Help");
    dialogHtml = Settings.get("helpDialog");
    return dialogHtml.replace(new RegExp("\\{\\{(version|title|" +
        Object.keys(Commands.commandGroups).join('|') + ")\\}\\}", "g"), function(_, group) {
      return (group === "version") ? Settings.CONST.CurrentVersion
        : (group === "title") ? customTitle
        : helpDialogHtmlForCommandGroup(group, commandsToKey, Commands.availableCommands, showUnbound, showNames);
    });
  };

  helpDialogHtmlForCommandGroup = function(group, commandsToKey, availableCommands, showUnbound, showNames) {
    var bindings, command, html, isAdvanced, _i, _len, _ref, keys, description;
    html = [];
    _ref = Commands.commandGroups[group];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      command = _ref[_i];
      if ((keys = commandsToKey[command]) || showUnbound) {
      bindings = keys ? keys.join(", ") : "";
      isAdvanced = Commands.advancedCommands.indexOf(command) >= 0;
      description = availableCommands[command][0];
      if (bindings.length <= 8) {
        helpDialogHtmlForCommand(html, isAdvanced, bindings, description, showNames ? command : "");
      } else {
        helpDialogHtmlForCommand(html, isAdvanced, bindings, "", "");
        helpDialogHtmlForCommand(html, isAdvanced, "", description, showNames ? command : "");
      }
      }
    }
    return html.join("");
  };

  helpDialogHtmlForCommand = function(html, isAdvanced, bindings, description, command) {
    html.push('<tr class="HelpTr', isAdvanced
      ? " HelpAdvanced" : "", '">\n\t');
    if (description) {
      html.push('<td class="HelpTd HelpKey">\n\t\t'
        , '<span class="HelpShortKey">'
        , bindings && Utils.escapeHtml(bindings), "</span>\n\t</td>\n\t"
        , '<td class="HelpTd">', bindings && ":", "</td>\n\t"
        , '<td class="HelpTd HelpCommandInfo">'
        , Utils.escapeHtml(description));
      if (command) {
        html.push('\n\t\t<span class="HelpCommandName">('
          , command, ")</span>\n\t");
      }
    } else {
      html.push('<td class="HelpTd" colspan="3">\n\t\t'
        , '<span class="HelpLongKey">'
        , Utils.escapeHtml(bindings), "</span>&#160;:\n\t");
    }
    html.push("</td>\n</tr>\n");
  };

  openMultiTab = function(rawUrl, count, parentTab) {
    if (!(count >= 1)) return;
    var wndId = parentTab.windowId, option = {
      url: rawUrl,
      windowId: wndId,
      index: parentTab.index + 1,
      openerTabId: parentTab.id,
      active: parentTab.active
    };
    chrome.tabs.create(option, option.active ? function(tab) {
      if (tab.windowId !== wndId) {
        chrome.windows.update(tab.windowId, {focused: true});
      }
    } : null);
    if (count < 2) return;
    option.active = false;
    do {
      ++option.index;
      chrome.tabs.create(option);
    } while(--count > 1);
  };

  sendToTab = Settings.CONST.ChromeVersion < 41
  ? function(request, tabId) {
    chrome.tabs.sendMessage(tabId, request);
    funcDict.sendToExt(request, tabId);
  } : function(request, tabId, frameId, request2) {
    chrome.tabs.sendMessage(tabId, request, frameId != null ? {frameId: frameId}
      : request.frameId === 0 ? {frameId: 0} : null);
    funcDict.sendToExt(request2 || request, tabId);
  };

  ContentSettings = {
    _urlHeadRe: /^[a-z]+:\/\/[^\/]+\//,
    complaint: function(url) {
      if (Utils.hasOrdinaryUrlPrefix(url) && !url.startsWith("chrome")) {
        return false;
      }
      currentCommand.port.postMessage({
        name: "showHUD",
        text: "Chrome doesn't allow Vimium++ to do on this page",
        time: 1500
      });
      return true;
    },
    clear: function(contentType, tab) {
      var cs = chrome.contentSettings[contentType];
      if (tab) {
        cs.clear({ scope: (tab.incognito ? "incognito_session_only" : "regular") });
        return;
      }
      cs.clear({ scope: "regular" });
      cs.clear({ scope: "incognito_session_only" }, funcDict.onRuntimeError);
    },
    toggleCurrent: function(contentType, tab) {
      var pattern = tab.url, _this = this;
      if (this.complaint(pattern)) { return; }
      chrome.contentSettings[contentType].get({
        primaryUrl: pattern,
        incognito: tab.incognito
      }, function (opt) {
        if (!pattern.startsWith("file:")) {
          pattern = _this._urlHeadRe.exec(pattern)[0] + "*";
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
      var pattern = tab.url, _this = this;
      if (this.complaint(pattern)) { return; }
      chrome.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function(opt) {
        if (!pattern.startsWith("file:")) {
          pattern = _this._urlHeadRe.exec(pattern)[0] + "*";
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
            console.log("%cContentSettings.ensure%c", "color:red;", "color:auto;"
              , "get incognito content settings", opt, " but can not find a incognito window.");
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
      tab.active = true;
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
    globalCommand: null,
    globalConnect: null,
    sendToExt: function(request, tabId) {
      var extId;
      if (extId = extForTab[tabId]) {
        request = { "vimium++": {tabId: tabId, request: request} };
        chrome.runtime.sendMessage(extId, request);
      }
    },

    isIncNor: function(wnd) {
      return wnd.incognito && wnd.type === "normal";
    },
    selectFrom: function(tabs) {
      var i = tabs.length;
      while (0 < --i) {
        if (tabs[i].active) {
          return tabs[i];
        }
      }
      return tabs[0];
    },
    reopenTab: function(tab) {
      chrome.tabs.create({
        windowId: tab.windowId,
        url: tab.url,
        openerTabId: tab.openerTabId,
        active: tab.active,
        index: tab.index
      });
      chrome.tabs.remove(tab.id);
    },
    makeWindow: function(option, state) {
      if (state && Settings.CONST.ChromeVersion >= 44) {
        option.state = state;
      }
      chrome.windows.create(option, state && Settings.CONST.ChromeVersion < 44
      ? function(wnd) {
        chrome.windows.update(wnd.id, {state: state});
      } : null);
    },
    makeTempWindow: function(tabIdUrl, incognito, callback) {
      var option = {
        type: "normal", // not popup, because popup windows are always on top
        left: 0, top: 0, width: 50, height: 50,
        focused: false,
        incognito: incognito,
        tabId: tabIdUrl > 0 ? tabIdUrl : undefined,
        url: tabIdUrl > 0 ? undefined : tabIdUrl
      };
      if (Settings.CONST.ChromeVersion >= 44) { option.state = "minimized"; }
      chrome.windows.create(option, callback);
    },
    onRuntimeError: function() {
      return chrome.runtime.lastError;
    },

    openUrlInIncognito: function(request, tab, wnds) {
      wnds = wnds.filter(funcDict.isIncNor);
      request.active = (request.active !== false);
      request.url = Utils.convertToUrl(request.url, request.keyword);
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
      chrome.windows.get(tab.windowId, function(oldWnd) {
        var state, option;
        if (oldWnd.type === "normal") {
          state = oldWnd.state;
        }
        option = {
          type: "normal",
          url: request.url,
          incognito: true
        };
        if (Settings.CONST.ChromeVersion >= 44) { option.state = state; }
        chrome.windows.create(option, function(newWnd) {
          if (!request.active) {
            chrome.windows.update(tab.windowId, {focused: true});
          }
          if (state && Settings.CONST.ChromeVersion < 44) {
            chrome.windows.update(newWnd.id, {state: state});
          }
        });
      });
    },

    createTab: [function(wnd) {
      var tab;
      if (!wnd) {
        chrome.tabs.create({url: this});
        return chrome.runtime.lastError;
      }
      tab = funcDict.selectFrom(wnd.tabs);
      if (wnd.type !== "normal") {
        tab.windowId = undefined;
      } else if (wnd.incognito) {
        // url is disabled to be opened in a incognito window directly
        funcDict.createTab[1](this, tab
          , (--commandCount > 0) ? funcDict.duplicateTab[1] : null, wnd.tabs);
        return;
      }
      tab.id = undefined;
      openMultiTab(this, commandCount, tab);
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
        active: false,
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
        chrome.tabs.update(newTab.id, {active: true});
      });
    }, function(tabs) {
      tabs[0].id = undefined;
      openMultiTab(this, commandCount, tabs[0]);
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
    moveTabToNewWindow: function(wnd) {
      var tab;
      if (wnd.tabs.length <= 1) { return; }
      tab = funcDict.selectFrom(wnd.tabs);
      funcDict.makeWindow({
        type: "normal",
        tabId: tab.id,
        incognito: tab.incognito
      }, wnd.type === "normal" ? wnd.state : null);
    },
    moveTabToNextWindow: [function(tab, wnds0) {
      var wnds, ids, index;
      wnds = wnds0.filter(function(wnd) { return wnd.incognito === tab.incognito && wnd.type === "normal"; });
      if (wnds.length > 0) {
        ids = wnds.map(function(wnd) { return wnd.id; });
        index = ids.indexOf(tab.windowId);
        if (ids.length >= 2 || index === -1) {
          chrome.tabs.query({windowId: ids[(index + 1) % ids.length], active: true},
          funcDict.moveTabToNextWindow[1].bind(null, tab, index));
          return;
        }
      } else {
        index = tab.windowId;
        wnds = wnds0.filter(function(wnd) { return wnd.id === index; });
      }
      funcDict.makeWindow({
        type: "normal",
        tabId: tab.id,
        incognito: tab.incognito
      }, wnds.length === 1 && wnds[0].type === "normal" ? wnds[0].state : null);
    }, function(tab, oldIndex, tab2) {
      tab2 = tab2[0];
      if (oldIndex >= 0) {
        funcDict.moveTabToNextWindow[2](tab.id, tab2);
        return;
      }
      funcDict.makeTempWindow(tab.id, tab.incognito, //
      funcDict.moveTabToNextWindow[2].bind(null, tab.id, tab2));
    }, function(tabId, tab2) {
      chrome.tabs.move(tabId, {index: tab2.index + 1, windowId: tab2.windowId});
      chrome.tabs.update(tabId, {active: true});
      chrome.windows.update(tab2.windowId, {focused: true});
    }],
    moveTabToIncognito: [function(wnd) {
      var tab = funcDict.selectFrom(wnd.tabs);
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
      wnd.tabs = null;
      chrome.windows.getAll(funcDict.moveTabToIncognito[1].bind(null, options, wnd));
    }, function(options, wnd, wnds) {
      var tabId;
      wnds = wnds.filter(funcDict.isIncNor);
      if (wnds.length) {
        chrome.tabs.query({
          windowId: wnds[wnds.length - 1].id,
          active: true
        }, funcDict.moveTabToIncognito[2].bind(null, options));
        return;
      }
      if (options.url) {
        tabId = options.tabId;
        options.tabId = undefined;
      }
      funcDict.makeWindow(options, wnd.type === "normal" ? wnd.state : null);
      if (options.url) {
        chrome.tabs.remove(tabId);
      }
    }, function(options, tab2) {
      tab2 = tab2[0];
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
      var url, windowId;
      wnds = wnds.filter(function(wnd) { return wnd.type === "normal"; });
      if (wnds.length <= 1) {
        // protect the last window
        url = Settings.get("newTabUrl_f");
        if (wnds.length === 1 && wnds[0].incognito && !Utils.isRefusingIncognito(url)) {
          windowId = wnds[0].id;
        }
        // other urls will be disabled if incognito else auto in current window
      }
      else if (!tab.incognito) {
        // protect the last "normal & not incognito" window which has currentTab if it exists
        wnds = wnds.filter(function(wnd) { return !wnd.incognito; });
        if (wnds.length === 1 && wnds[0].id === tab.windowId) {
          windowId = tab.windowId;
          url = Settings.get("newTabUrl_f");
        }
      }
      if (url != null) {
        curTabs = (curTabs.length > 1) ? curTabs.map(function(tab) { return tab.id; }) : [tab.id];
        chrome.tabs.create({
          index: curTabs.length,
          url: url,
          windowId: windowId
        });
        chrome.tabs.remove(curTabs);
      } else {
        chrome.windows.remove(tab.windowId);
      }
    },
    restoreGivenTab: function(list) {
      if (commandCount <= list.length) {
        chrome.sessions.restore(list[commandCount - 1].tab.sessionId);
      }
    },
    selectTab: function(tabs, ind) {
      var len = tabs.length, toSelect;
      if (len > 1) {
        toSelect = tabs[(ind >= 0 ? 0 : len) + (ind % len)];
        if (!toSelect.active) {
          chrome.tabs.update(toSelect.id, {
            active: true
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
    },
    focusOrLaunch: function(request, tabs) {
      if (tabs.length === 0) {
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
          var tab = tabs[0];
          // TODO: how to wait for tab finishing to load
          chrome.tabs.create({
            index: tab.index + 1,
            url: request.url,
            windowId: tab.windowId
          }, function(tab) {
            chrome.windows.update(tab.windowId, {focused: true});
            if (request.scroll) {
              setTimeout(Marks.gotoTab, 1000, request);
            }
          });
        });
        return;
      }
      chrome.windows.getCurrent(function(wnd) {
        var wndId = wnd.id, tabs2;
        tabs2 = tabs.filter(function(tab) {return tab.windowId === wndId;});
        if (tabs2[0]) {
          Marks.gotoTab(request, tabs2[0]);
        } else {
          Marks.gotoTab(request, tabs[0]);
        }
      });
    }
  };

  /*
    function (null <% if .useTab is -1 else %>
      Tab [] tabs <% if .useTab is 1 else %>
      Tab [1] tabs = [selected] <% if not .useTab else ERROR %>
    );
    */
  BackgroundCommands = {
    __proto__: null,
    createTab: function() {},
    duplicateTab: function(tabs) {
      chrome.tabs.duplicate(tabs[0].id);
      if (--commandCount > 0) {
        chrome.windows.get(tabs[0].windowId, funcDict.duplicateTab[0].bind(null, tabs[0]));
      }
    },
    moveTabToNewWindow: chrome.windows.getCurrent.bind(chrome.windows
      , {populate: true}, funcDict.moveTabToNewWindow),
    moveTabToNextWindow: function(tabs) {
      chrome.windows.getAll(funcDict.moveTabToNextWindow[0].bind(null, tabs[0]));
    },
    moveTabToIncognito: chrome.windows.getCurrent.bind(chrome.windows
      , {populate: true}, funcDict.moveTabToIncognito[0]),
    enableCSTemp: function(tabs) {
      ContentSettings.ensure(currentCommand.options.type.toLowerCase(), tabs[0]);
    },
    toggleCS: function(tabs) {
      ContentSettings.toggleCurrent(currentCommand.options.type.toLowerCase(), tabs[0]);
    },
    clearCS: function(tabs) {
      var type = currentCommand.options.type;
      ContentSettings.clear(type.toLowerCase(), tabs[0]);
      currentCommand.port.postMessage({
        name: "showHUD",
        text: type + " content settings have been cleared.",
        time: 1500
      });
    },
    nextTab: function(tabs) {
      if (tabs.length <= 0) { return; }
      funcDict.selectTab(tabs, funcDict.selectFrom(tabs).index + commandCount);
    },
    previousTab: function(tabs) {
      if (tabs.length <= 0) { return; }
      funcDict.selectTab(tabs, funcDict.selectFrom(tabs).index - commandCount);
    },
    firstTab: function(tabs) {
      funcDict.selectTab(tabs, commandCount - 1);
    },
    lastTab: function(tabs) {
      funcDict.selectTab(tabs, -commandCount);
    },
    removeTab: function(tabs) {
      if (!tabs) { return; }
      var tab = tabs[0];
      if (tab.active) {
        if (tabs.length <= commandCount) {
          chrome.windows.getAll(funcDict.removeTab.bind(null, tab, tabs));
          return;
        }
      } else {
        tab = funcDict.selectFrom(tabs);
      }
      if (1 < commandCount) {
        --tab.index;
        funcDict.removeTabsRelative(tab, commandCount, tabs);
      } else {
        chrome.tabs.remove(tab.id);
      }
    },
    removeRightTab: function(tabs) {
      if (!tabs) { return; }
      var ind = funcDict.selectFrom(tabs).index + commandCount;
      if (ind < tabs.length) {
        chrome.tabs.remove(tabs[ind].id);
      }
    },
    restoreTab: function() {
      var count = commandCount;
      while (--count >= 0) {
        chrome.sessions.restore();
      }
    },
    restoreGivenTab: function() {
      chrome.sessions.getRecentlyClosed(funcDict.restoreGivenTab);
    },
    blank: function() {},
    openCopiedUrlInCurrentTab: function() {
      requestHandlers.openCopiedUrlInNewTab([]);
    },
    openCopiedUrlInNewTab: function(tabs) {
      var url = requestHandlers.getCopiedUrl_f(currentCommand.options);
      if (!url) {
        requestHandlers.SendToCurrent({
          name: "showHUD",
          text: "No text copied!",
          time: 1500
        });
      } else if (tabs.length > 0) {
        openMultiTab(url, commandCount, tabs[0]);
      } else {
        chrome.tabs.update(null, { url: url }, funcDict.onRuntimeError);
      }
    },
    openUrl: function() {
      var url = Utils.convertToUrl(currentCommand.options.url || "");
      if (currentCommand.options.newTab === false) {
        chrome.tabs.update(null, { url: url }, funcDict.onRuntimeError);
        return;
      }
      chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        openMultiTab(url, commandCount, tabs[0]);
      });
    },
    focusOrLaunch: function() {
      var url = Utils.convertToUrl(currentCommand.options.url || "");
      requestHandlers.focusOrLaunch({url: url});
    },
    togglePinTab: function(tabs) {
      var tab = funcDict.selectFrom(tabs), i = tab.index
        , len = Math.min(tabs.length, i + commandCount), action = {pinned: true};
      if (tab.pinned) {
        action.pinned = false;
        do {
          chrome.tabs.update(tabs[i].id, action);
        } while (len > ++i && tabs[i].pinned);
      } else {
        do {
          chrome.tabs.update(tabs[i].id, action);
        } while (len > ++i);
      }
    },
    reloadTab: function() {
      if (commandCount <= 1) {
        chrome.tabs.reload();
        return;
      }
      chrome.tabs.query({currentWindow: true}, function(tabs) {
        var ind = funcDict.selectFrom(tabs).index;
        tabs.slice(ind, ind + commandCount).forEach(function(tab1) {
          chrome.tabs.reload(tab1.id);
        });
      });
    },
    reloadGivenTab: function() {
      if (commandCount === 1) {
        chrome.tabs.reload();
        return;
      }
      chrome.tabs.query({currentWindow: true}, function(tabs) {
        var tab = tabs[funcDict.selectFrom(tabs).index + commandCount - 1];
        if (tab) {
          chrome.tabs.reload(tab.id);
        }
      });
    },
    reopenTab: function(tabs) {
      var tab = tabs[0];
      if (!tab) { return; }
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
    goToRoot: function(tabs) {
      var url = tabs[0].url, ind;
      if (url.indexOf("://") === -1) { return; }
      ind = url.indexOf("#!");
      if (ind !== -1 && url.length > ind + 3 && url.indexOf('/', ind) !== -1) {
        url = url.substring(0, ind);
      } else {
        url = (new URL(url)).origin;
      }
      chrome.tabs.update(null, {url: url});
    },
    moveTabLeft: function(tabs) {
      var tab = funcDict.selectFrom(tabs), index = Math.max(0, tab.index - commandCount);
      if (!tab.pinned) {
        while (tabs[index].pinned) { ++index; }
      }
      if (index != tab.index) {
        chrome.tabs.move(tab.id, {index: index});
      }
    },
    moveTabRight: function(tabs) {
      var tab = funcDict.selectFrom(tabs), index;
      index = Math.min(tabs.length - 1, tab.index + commandCount);
      if (tab.pinned) {
        while (!tabs[index].pinned) { --index; }
      }
      if (index != tab.index) {
        chrome.tabs.move(tab.id, {index: index});
      }
    },
    nextFrame: function(tabs, frameId) {
      var tabId = tabs[0].id, frames = frameIdsForTab[tabId], count;
      if (frames && frames.length > 2) {
        if (frameId >= 0) {
          count = 0;
        } else {
          frameId = frames[0];
          count = commandCount - 1;
        }
        count = (count + Math.max(0, frames.indexOf(frameId, 1))) % (frames.length - 1) + 1;
        if (frames[count] !== frames[0]) {
          sendToTab({
            name: "focusFrame",
            frameId: frames[count]
          }, tabId);
          return;
        }
      }
      currentCommand.port.postMessage({
        name: "focusFrame",
        frameId: count > 0 ? frames[0] : -1
      });
    },
    mainFrame: function(tabs) {
      if (tabs.length <= 0) { return; }
      // NOTE: need not check if registered
      sendToTab({
        name: "focusFrame",
        frameId: 0
      }, tabs[0].id);
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
    copyCurrentTitle: function(tabs) {
      var str = tabs[0].title;
      Clipboard.copy(str);
      currentCommand.port.postMessage({name: "showCopied", text: str});
    },
    copyCurrentUrl: function(tabs) {
      var str;
      if (currentCommand.options.frame === true && !(str = urlForTab[tabs[0].id])) {
        currentCommand.port.postMessage({
          name: "execute",
          command: "autoCopy",
          count: 1,
          options: { url: true }
        });
        return;
      } else {
        str = tabs[0].url;
      }
      Clipboard.copy(str);
      currentCommand.port.postMessage({name: "showCopied", text: str});
    },
    toggleViewSource: function(tabs) {
      var url = tabs[0].url;
      url = url.startsWith("view-source:") ? url.substring(12) : ("view-source:" + url);
      openMultiTab(url, 1, tabs[0]);
    },
    debugBackground: function() {
      requestHandlers.focusOrLaunch({
        url: "chrome://extensions/?id=" + chrome.runtime.id
      });
    },
    clearGlobalMarks: function() { Marks.clearGlobal(); }
  };

  resetKeys = function() {
    currentFirst = null;
    currentCount = 0;
  };

  Settings.updateHooks.PopulateCommandKeys = function() {
    var key, ref1, ref2, first, arr, keyRe = Commands.keyRe, ch;
    resetKeys();
    ref1 = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    ref2 = secondKeys = Utils.makeNullProto();
    for (key in Commands.keyToCommandRegistry) {
      ch = key.charCodeAt(0);
      if (ch >= 48 && ch < 58) {
        console.warn("invalid key command:", key, "(the first char can not be [0-9])");
      } else if ((arr = key.match(keyRe)).length === 1) {
        ref1.push(key);
      } else if (arr.length !== 2) {
        console.warn("invalid key command:", key, "=>", arr);
      } else if ((first = arr[0]) in ref2) {
        ref2[first].push(arr[1]);
      } else {
        ref2[first] = [arr[1]];
      }
    }

    for (first in ref2) {
      if (ref1.indexOf(first) !== -1) {
        console.warn("inactive first key:", first, "with", ref2[first].sort());
        delete ref2[first];
      }
    }
    firstKeys = ref1 = ref1.concat(Object.keys(ref2)).sort().reverse();
    keyRe = function(key) { return ref1.indexOf(key) === -1; };
    for (first in ref2) {
      ref2[first] = ref2[first].filter(keyRe).sort().reverse();
    }
    ref2[""] = ["0"]; // "0" is for key queues like "10n"
  };

  handleMainPort = function(request, port) {
    var key, func, id;
    if (id = request._msgId) {
      request = request.request;
      if (key = request.handler) {
        func = requestHandlers[key];
        if (func.useTab) {
          chrome.tabs.query({currentWindow: true, active: true}, function(ts) {
            port.postMessage({_msgId: id, response: func(request, ts)});
          });
        } else {
          port.postMessage({_msgId: id, response: func(request)})
        }
      }
      else if (key = request.handlerOmni) {
        func = Completers[key];
        key = request.query;
        func.filter(key ? key.split(" ") : [], function(response) {
          port.postMessage({_msgId: id, response: response});
        });
      }
    }
    else if (key = request.handlerKey) {
      // NOTE: here is a race condition which is now ignored totally
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
        chrome.tabs.query({currentWindow: true, active: true}, func.bind(null, request));
      } else {
        func(request, port);
      }
    }
    else if (key = request.handlerSettings) {
      var i, ref;
      switch (key) {
      case "load":
        port.postMessage({
          name: "settings",
          load: Settings.bufferToLoad,
          response: ((request = request.request) //
            ? requestHandlers[request.handler](request, port) : null)
        });
        break;
      case "reg":
        ref = Settings.get("userDefinedOuterCss");
        ref && port.postMessage({
          name: "insertCSS",
          css: ref
        });
        // no `break;`
      case "rereg":
        i = request.frameId;
        if (ref = frameIdsForTab[id = port.sender.tab.id]) {
          ref.push(i);
        } else {
          frameIdsForTab[id] = [i, i];
        }
        break;
      case "unreg":
        id = request.tabId;
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
          delete extForTab[id];
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
    if (registryEntry.repeat === 1) {
      count = 1;
    } else if (!(registryEntry.repeat > 0 && count > registryEntry.repeat)) {
    } else if (!
      confirm("You have asked Vimium++ to perform " + count + " repeats of the command:\n        "
        + Commands.availableCommands[command][0]
        + "\n\nAre you sure you want to continue?")
    ) {
      return;
    }
    if (registryEntry.background) {
      var func = BackgroundCommands[command];
      currentCommand.options = registryEntry.options;
      currentCommand.port = port;
      commandCount = count;
      count = func.useTab;
      if (count === 1) {
        chrome.tabs.query({currentWindow: true}, func);
      } else if (count !== -1) {
        chrome.tabs.query({currentWindow: true, active: true}, func);
      } else {
        func();
      }
      return;
    }
    port.postMessage({
      name: "execute",
      command: command,
      count: count,
      options: registryEntry.options
    });
  };

  // Signature: function(request, opt);
  // opt: Tab [1] tabs = [selected] <% if .useTab is 1 else %> Port port
  g_requestHandlers = requestHandlers = {
    __proto__: null,
    setSetting: function(request) {
      var key = request.key;
      Settings.set(key, request.value);
      if (Settings.valuesToLoad.indexOf(key) >= 0) {
        Settings.bufferToLoad[key] = Settings.get(key);
      }
    },
    parseSearchUrl: function(request) {
      var url = request.url.toLowerCase(), decoders, pattern, _i, str, arr;
      if (!(Utils.hasOrdinaryUrlPrefix(url) || url.startsWith("chrome-"))) {
        return "";
      }
      decoders = Settings.get("searchEngineRules");
      if (url.startsWith("http")) {
        _i = url.charAt(4) === 's' ? 8 : 7;
        url = url.substring(_i);
        request.url = request.url.substring(_i);
      }
      for (_i = decoders.length; 0 <= --_i; ) {
        pattern = decoders[_i];
        if (!url.startsWith(pattern[0])) { continue; }
        arr = pattern[1].exec(request.url.substring(pattern[0].length));
        if (!arr) { continue; }
        str = pattern[3];
        if (arr.length !== 2) {
          arr.shift();
        } else if (str instanceof RegExp) {
          url = arr[1]; 
          arr = url.match(str);
          arr ? arr.shift() : (arr = [url]);
        } else {
          arr = arr[1].split(str);
        }
        str = arr.map(Utils.decodeURLPart).join(" ");
        return pattern[2] + " " + str.replace(Utils.spacesRe, " ").trim();
      }
      return "";
    },
    searchAs: function(request) {
      var search = requestHandlers.parseSearchUrl(request), query;
      if (!search) { return "search engine"; }
      if (!(query = request.search)) {
        query = Clipboard.paste().replace(Utils.spacesRe, ' ').trim();
        if (!query) { return "selected or copied text"; }
      }
      search = search.substring(0, search.indexOf(" "));
      query = Utils.createSearchUrl(query.split(" "), search);
      chrome.tabs.update({
        url: query
      });
    },
    restoreSession: function(request) {
      chrome.sessions.restore(request.sessionId, funcDict.onRuntimeError);
    },
    openImageUrl: function(request, tabs) {
      var tab = tabs[0], url = encodeURIComponent(request.url);
      if (request.active === false) { tab.active = false; }
      openMultiTab("/pages/show.html#!image=" + url, 1, tab);
    },
    openUrlInNewTab: function(request, tabs) {
      var tab = tabs[0];
      if (request.active === false) { tab.active = false; }
      openMultiTab(Utils.convertToUrl(request.url, request.keyword), 1, tab);
    },
    openUrlInIncognito: function(request, tabs) {
      chrome.windows.getAll(funcDict.openUrlInIncognito.bind(null, request, tabs[0]));
    },
    openUrlInCurrentTab: function(request) {
      var url = Utils.convertToUrl(request.url, request.keyword);
      chrome.tabs.update(null, {
        url: url
      }, funcDict.onRuntimeError);
    },
    dispatchCommand: function(request, port) {
      var frames = frameIdsForTab[request.tabId];
      request.name = request.handler;
      delete request.handler;
      if (frames && frames.indexOf(request.frameId, 1) > 0) {
        sendToTab(request, request.tabId);
        return;
      }
      request.args.push(true);
      request.frameId = request.source;
      request.source = -1;
      port.postMessage(request);
    },
    ext: function(request, port) {
      var ref = Settings.extIds, extId = request.extId;
      extForTab[port.sender.tab.id] = extId;
      if (ref.indexOf(extId) === -1) {
        ref.push(extId);
      }
    },
    frameFocused: function(request, port) {
      var tabId = request.tabId, frames;
      if (tabId) {
        // frames would be undefined if in a tab, all "reg" messages were sent
        //   to a closing port, which means the frontend tried `runtime.connect`
        //   but background kept not prepared.
        // This can only happen when the system is too slow.
        // For example, Chrome's first startup since the system boots.
        if (frames = frameIdsForTab[tabId]) {
          frames[0] = request.frameId;
        }
        if (needIcon) {
          urlForTab[tabId] = request.url;
          requestHandlers.SetIcon(tabId, request.status);
        }
      }
      port.postMessage({
        name: "refreshKeyQueue",
        currentFirst: currentFirst
      });
    },
    checkIfEnabled: function(request, port) {
      var frames, pattern = Exclusions.getPattern(request.url), ret;
      // NOTE: here request.frameId may be Chrome's, but we may assume that
      //     it won't crash with ours
      if (needIcon && (frames = frameIdsForTab[request.tabId])
          && frames[0] === request.frameId) {
        requestHandlers.SetIcon(request.tabId, null, pattern);
      }
      ret = { name: "reset", passKeys: pattern };
      if (port) {
        port.postMessage(ret);
      } else {
        return ret;
      }
    },
    init: function(request, port) {
      var pass = Exclusions.getPattern(request.url), tabId = port.sender.tab.id;
      if (request.focused) {
        if (needIcon) {
          urlForTab[tabId] = request.url;
          requestHandlers.SetIcon(tabId, null, pass);
        }
      }
      return {
        name: "init",
        passKeys: pass,
        onMac: Settings.CONST.OnMac,
        currentFirst: currentFirst,
        firstKeys: firstKeys,
        secondKeys: secondKeys,
        tabId: tabId
      };
    },
    nextFrame: function(request, port) {
      currentCommand.port = port;
      BackgroundCommands.nextFrame([{id: request.tabId}], request.frameId);
    },
    initHelp: function(request) {
      return {
        name: "showHelpDialog",
        html: helpDialogHtml(request.unbound, request.names, request.title),
        optionUrl: Settings.CONST.OptionsPage,
        advanced: Settings.get("showAdvancedCommands")
      };
    },
    initVomnibar: function() {
      return {
        html: Settings.get("vomnibar"),
        relevancy: Settings.get("showOmniRelevancy")
      };
    },
    initInnerCSS: function() {
      return Settings.get("innerCss");
    },
    getCopiedUrl_f: function(request) {
      var url = Clipboard.paste().trim(), arr;
      if (url) {
        arr = url.match(Utils.filePathRe);
        url = arr ? arr[1] : Utils.convertToUrl(url, request.keyword);
      }
      return url;
    },
    openUrl_fInNewTab: function(request, tabs) {
      openMultiTab(request.url, 1, tabs[0]);
    },
    copyToClipboard: function(request) {
      Clipboard.copy(request.data);
    },
    selectTab: function(request) {
      chrome.tabs.update(request.tabId, {active: true});
      chrome.tabs.get(request.tabId, function(tab) {
        chrome.windows.update(tab.windowId, { focused: true });
      });
    },
    refreshCompleter: function(request) {
      Completers[request.omni].refresh();
    },
    refreshTabId: function(request, port) {
      port.sender.tab.id = request.tabId;
    },
    esc: resetKeys,
    createMark: function(request, tabs) { Marks.createMark(request, tabs); },
    gotoMark: function(request) { Marks.gotoMark(request); },
    focusOrLaunch: function(request) {
      // * request.url is guaranteed to be well formatted by frontend
      // * do not limit windowId or windowType
      // * in this case, chrome will ignore url's hash
      chrome.tabs.query({
        url: request.url
      }, funcDict.focusOrLaunch.bind(null, request));
    },
    SetIcon: function() {},
    SendToTab: sendToTab,
    SendToCurrent: function(request) {
      var port = currentCommand.port;
      try {
        port && port.postMessage(request);
      } catch (e) {
        currentCommand.port = null;
      }
    }
  };

  Settings.updateHooks.newTabUrl_f = function(url) {
    BackgroundCommands.createTab = Utils.isRefusingIncognito(url)
    ? chrome.windows.getCurrent.bind(chrome.windows, {populate: true}
        , funcDict.createTab[0].bind(url))
    : chrome.tabs.query.bind(chrome.tabs, {currentWindow: true, active: true}
        , funcDict.createTab[5].bind(url));
    BackgroundCommands.createTab.useTab = -1;
  };

  Settings.updateHooks.postKeyMappings = function(value) {
    Commands.parseKeyMappings(Settings.get("keyMappings"));
    Settings.postUpdate("PopulateCommandKeys", null);
    // resetKeys has been called
    this.postUpdate("broadcast", {
      name: "refreshKeyMappings",
      currentFirst: null,
      firstKeys: firstKeys,
      secondKeys: secondKeys
    });
  };

  Settings.updateHooks.showActionIcon = function (value) {
    needIcon = chrome.browserAction && value ? true : false;
    if (!needIcon) { urlForTab = Utils.makeNullProto(); }
  };

  funcDict.globalCommand = function(command, options) {
    var count, reg;
    if (currentFirst !== null) {
      count = currentFirst ? 1 : (currentCount || 1);
      resetKeys();
      chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        sendToTab({ name: "refreshKeyQueue", currentFirst: null }, tabs[0].id);
      });
    } else {
      count = 1;
    }
    reg = Commands.availableCommands[command];
    executeCommand(command, {
      background: reg[2],
      command: command,
      options: options || {},
      repeat: reg[1]
    }, count, null);
  };
  setTimeout(function() {
    chrome.commands.onCommand.addListener(funcDict.globalCommand);
  }, 200);

  chrome.runtime.onMessageExternal.addListener(function(message, _1, sendResponse) {
    var command, options = null;
    if (typeof message === "string") {
      command = message;
      if (command && Commands.availableCommands[command]) {
        funcDict.globalCommand(command, options);
      }
      return;
    }
    if (typeof message !== "object") { return; }
    switch (message.handler) {
    case "command":
      command = message.command;
      if (!(command && Commands.availableCommands[command])) { return; }
      if (message.count) {
        currentFirst = "";
        currentCount = message.count;
      }
      options = message.options;
      funcDict.globalCommand(command, typeof options === "object" ? options : null);
      break;
    case "content_scripts":
      sendResponse(Settings.CONST.ContentScripts);
      return;
    }
  });

  funcDict.globalConnect = function(port) {
    if (port.name === "vimium++") {
      port.onMessage.addListener(handleMainPort);
    } else {
      port.disconnect();
    }
  };

  chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    var ref, request = { name: "refreshTabId", tabId: addedTabId };
    chrome.tabs.sendMessage(addedTabId, request);
    funcDict.sendToExt(request, removedTabId);
    ref = frameIdsForTab;
    ref[addedTabId] = ref[removedTabId];
    delete ref[removedTabId];
    ref = extForTab;
    ref[addedTabId] = ref[removedTabId];
    delete ref[removedTabId];
    if (needIcon) {
      ref = urlForTab;
      ref[addedTabId] = ref[removedTabId];
      delete ref[removedTabId];
    }
  });

  setTimeout(function() {
    Exclusions.setRules(Settings.get("exclusionRules"));
    Settings.postUpdate("bufferToLoad", null);

    chrome.runtime.onConnect.addListener(funcDict.globalConnect);
    chrome.runtime.onConnectExternal.addListener(funcDict.globalConnect);
  }, 17);

  setTimeout(function() {
    Settings.postUpdate("files", null);
    Settings.postUpdate("searchUrl"); // will also update newTabUrl

    var ref, i, ref2, key;
    ref2 = requestHandlers;
    for (key in ref2) { ref2[key].useTab = 0; }
    ref = ["openUrlInNewTab", "openUrlInIncognito" //
      , "openImageUrl", "openUrl_fInNewTab", "createMark" //
    ];
    for (i = ref.length; 0 <= --i; ) {
      ref2[ref[i]].useTab = 1;
    }

    ref2 = BackgroundCommands;
    for (key in ref2) { ref2[key].useTab = 0; }
    ref = ["nextTab", "previousTab", "firstTab", "lastTab", "removeTab" //
      , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs", "removeRightTab" //
      , "moveTabLeft", "moveTabRight", "togglePinTab", "debugBackground" //
      , "reloadGivenTab" //
    ];
    for (i = ref.length; 0 <= --i; ) {
      ref2[ref[i]].useTab = 1;
    }
    ref = ["createTab", "restoreTab", "restoreGivenTab", "blank", "reloadTab" //
      , "moveTabToNewWindow", "reloadGivenTab", "openUrl", "focusOrLaunch" //
      , "moveTabToIncognito", "openCopiedUrlInCurrentTab", "clearGlobalMarks" //
    ];
    for (i = ref.length; 0 <= --i; ) {
      ref2[ref[i]].useTab = -1;
    }

    ContentSettings.clear("images");
  }, 50);
})();

setTimeout(function() {
  Settings.postUpdate("searchEngines", null);
}, 100);

Settings.CONST.Timer = setTimeout(function() {
Settings.CONST.Timer = 0;
// currentFirst will be reloaded when window.focus
chrome.tabs.query({status: "complete"}, function(arr) {
  var url, i, o, exts = [chrome.runtime.id], request = {name: "reg", work: "rereg"};
  for (i = arr.length, o = chrome.tabs; 0 <= --i; ) {
    url = arr[i].url;
    if (url.length >= 51 && url.startsWith("chrome-extension:")) {
      url = url.substring(19, 51);
      if (exts.indexOf(url) === -1) { exts.push(url); }
    }
    o.sendMessage(arr[i].id, request);
  }
  o = chrome.runtime;
  request.name = "regExt";
  request = {"vimium++": {request: request}};
  for (i = exts.length; 1 <= --i; ) {
    o.sendMessage(exts[i], request, null);
  }
});
}, 50);
