"use strict";
var Clipboard, Commands, CommandsData, Completers, Marks, TabRecency, FindModeHistory, g_requestHandlers;
(function() {
  var BackgroundCommands, Connections, ContentSettings
    , cOptions, cPort, checkKeyQueue, commandCount, executeCommand
    , framesForOmni, framesForTab
    , funcDict, keyQueueRe, needIcon, openMultiTab, requestHandlers, keyMap, getSecret;

  framesForTab = Object.create(null);
  framesForOmni = [];

  needIcon = false;

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
      tab.windowId !== wndId && funcDict.selectWnd(tab);
    } : null);
    if (count < 2) return;
    option.active = false;
    do {
      ++option.index;
      chrome.tabs.create(option);
    } while(--count > 1);
  };

  ContentSettings = {
    makeKey: function(contentType, url) {
      return "vimiumContent|" + contentType + (url ? "|" + url : "");
    },
    complain: function(url) {
      if (!chrome.contentSettings) {
        requestHandlers.ShowHUD("This Vimium++ has no permissions to change your content settings");
        return true;
      }
      if (Utils.protocolRe.test(url) && !url.startsWith("chrome")) {
        return false;
      }
      funcDict.complain("change its content settings");
      return true;
    },
    parsePattern: function(pattern, level) {
      var arr, i;
      if (pattern.startsWith("file:")) {
        if (level > 1) {
          arr = pattern.split("/");
          arr.length = Math.max(arr.length - level + 1, 3);
          arr.length === 3 && arr.push("");
          pattern = arr.join("/");
        }
        return pattern;
      }
      arr = pattern.match(/^([^:]+:\/\/)([^\/]+)\//);
      if (level < 2) {
        return arr[0] + "*";
      }
      pattern = arr[1]; arr = arr[2].split("."); i = arr.length;
      i -= i < 3 ? i : arr[i - 1].length === 2 && Utils.isTld(arr[i - 2]) === 1 ? 3 : 2;
      if (i > 0) {
        i = Math.min(level - 2, i - 1);
        i > 0 && arr.splice(0, i);
        arr[0] = '*';
      } else {
        arr.unshift('*');
      }
      return pattern + arr.join(".") + "/*";
    },
    clear: function(contentType, tab) {
      if (!chrome.contentSettings) { return; }
      var cs = chrome.contentSettings[contentType];
      if (tab) {
        cs.clear({ scope: (tab.incognito ? "incognito_session_only" : "regular") });
        return;
      }
      cs.clear({ scope: "regular" });
      cs.clear({ scope: "incognito_session_only" }, funcDict.onRuntimeError);
      localStorage.removeItem(ContentSettings.makeKey(contentType));
    },
    toggleCurrent: function(contentType, tab) {
      var pattern = Utils.removeComposedScheme(tab.url), _this = this;
      if (this.complain(pattern)) { return; }
      chrome.contentSettings[contentType].get({
        primaryUrl: pattern,
        incognito: tab.incognito
      }, function (opt) {
        _this.setAllLevels(contentType, pattern, commandCount, {
          scope: tab.incognito ? "incognito_session_only" : "regular",
          setting: (opt && opt.setting === "allow") ? "block" : "allow"
        }, function(err) {
          if (err) { return; }
          if (!tab.incognito) {
            var key = ContentSettings.makeKey(contentType);
            localStorage.getItem(key) !== "1" && (localStorage.setItem(key, "1"));
          }
          if (tab.incognito || cOptions.action === "reopen" || !chrome.sessions) {
            ++tab.index;
            funcDict.reopenTab(tab);
            return;
          } else if (tab.index > 0) {
            funcDict.refreshTab[0](tab.id);
            return;
          }
          chrome.windows.getCurrent({populate: true}, function(wnd) {
            !wnd || wnd.type !== "normal" ? chrome.tabs.reload()
            : wnd.tabs.length > 1 ? funcDict.refreshTab[0](tab.id)
            : funcDict.reopenTab(tab);
            return chrome.runtime.lastError;
          });
        });
      });
    },
    ensure: function (contentType, tab) {
      var pattern = Utils.removeComposedScheme(tab.url), _this = this;
      if (this.complain(pattern)) { return; }
      chrome.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function(opt) {
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
      this.setAllLevels(contentType, pattern, commandCount
        , { scope: "incognito_session_only", setting: "allow" }
        , doSyncWnd && wndId !== tab.windowId
        ? function(err) {
          if (err) { return; }
          chrome.windows.get(tab.windowId, callback);
        } : callback);
    },
    setAllLevels: function(contentType, url, count, settings, callback) {
      var ref, i, info, left, has_err = false, func;
      func = function() {
        var err = chrome.runtime.lastError, f;
        if (has_err) { return err; }
        --left; has_err = !!err;
        if ((has_err || left === 0) && callback) {
          f = callback; callback = null;
          f(has_err);
        }
        return err;
      };
      ref = chrome.contentSettings[contentType];
      Object.setPrototypeOf(settings, null);
      count = count | 0;
      for (left = i = count; i > 0; i--) {
        info = Utils.extendIf(Object.create(null), settings);
        info.primaryPattern = this.parsePattern(url, i);
        ref.set(info, func);
      }
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
    refreshTab: [function(tabId) {
      chrome.tabs.remove(tabId, funcDict.onRuntimeError);
      chrome.tabs.get(tabId, funcDict.refreshTab[1]);
    }, function(tab, action) {
      if (chrome.runtime.lastError) {
        chrome.sessions.restore();
        return chrome.runtime.lastError;
      }
      if (action === "reload") { return; }
      setTimeout(funcDict.refreshTab[2], 17, tab ? "get" : "reload", tab ? tab.id : this);
    }, function(action, tabId) {
      chrome.tabs[action](tabId, funcDict.refreshTab[1].bind(tabId, null, action));
    }],
    makeWindow: function(option, state, callback) {
      if (!state) { state = ""; }
      else if (option.focused === false) {
        state !== "minimized" && (state = "normal");
      } else if (state === "minimized") {
        state = "normal";
      }
      if (state && Settings.CONST.ChromeVersion >= 44) {
        option.state = state;
        state = null;
      }
      var focused = option.focused !== false;
      option.focused = true;
      chrome.windows.create(option, state || !focused ? function(wnd) {
        callback && callback(wnd);
        var opt = { focused: focused && undefined };
        state && (opt.state = state);
        chrome.windows.update(wnd.id, opt);
      } : callback || null);
    },
    makeTempWindow: function(tabIdUrl, incognito, callback) {
      var option = {
        type: "normal",
        focused: false,
        incognito: incognito,
        state: "minimized",
        tabId: tabIdUrl > 0 ? tabIdUrl : undefined,
        url: tabIdUrl > 0 ? undefined : tabIdUrl
      };
      if (Settings.CONST.ChromeVersion < 44) {
        option.state = undefined;
        option.left = option.top = 0; option.width = option.height = 50;
      }
      chrome.windows.create(option, callback);
    },
    onRuntimeError: function() {
      return chrome.runtime.lastError;
    },
    onEvalUrl: function(arr) {
      if (arr instanceof Promise) { return arr.then(funcDict.onEvalUrl); }
      switch(arr[1]) {
      case "copy":
        requestHandlers.ShowHUD(arr[0], true);
        break;
      }
    },
    complain: function(action) {
      return requestHandlers.ShowHUD("It's not allowed to " + action);
    },
    checkVomnibarPage: function(port, nolog) {
      if (port.sender.url === Settings.CONST.VomnibarPage) { return false; }
      if (!nolog && !port.sender.warned) {
      console.warn("Receive a request from %can unsafe source page%c (should be vomnibar) :\n ",
        "color: red", "color: auto",
        port.sender.url, '@' + port.sender.tabId);
      port.sender.warned = true;
      }
      return true;
    },
    PostCompletions: function(list, autoSelect, matchType) {
      try {
      this.postMessage({
        name: "omni",
        autoSelect: autoSelect,
        matchType: matchType,
        list: list
      });
      } catch (e) {}
    },

    getCurTab: chrome.tabs.query.bind(null, {currentWindow: true, active: true}),
    getCurTabs: chrome.tabs.query.bind(null, {currentWindow: true}),
    getId: function(tab) { return tab.id; },

    createTabs: function(rawUrl, count, active) {
      if (!(count >= 1)) return;
      var option = {url: rawUrl, active: active};
      chrome.tabs.create(option);
      if (count < 2) return;
      option.active = false;
      do {
        chrome.tabs.create(option);
      } while(--count > 1);
    },
    openUrlInIncognito: function(tab, wnds) {
      var oldWnd, inCurWnd, options, active = !(cOptions.reuse < -1);
      oldWnd = wnds.filter(function(wnd) { return wnd.id === tab.windowId; })[0];
      inCurWnd = oldWnd != null && oldWnd.incognito;
      inCurWnd || (wnds = wnds.filter(funcDict.isIncNor));
      if (inCurWnd || wnds.length > 0) {
        options = {
          url: this,
          windowId: inCurWnd ? tab.windowId : wnds[wnds.length - 1].id
        };
        if (inCurWnd) {
          options.index = tab.index + 1;
          options.openerTabId = tab.id;
          options.active = active;
        }
        chrome.tabs.create(options);
        !inCurWnd && active && funcDict.selectWnd(options);
        return;
      }
      funcDict.makeWindow({
        type: "normal", url: this,
        incognito: true, focused: active
      }, oldWnd && oldWnd.type === "normal" && oldWnd.state);
    },

    createTab: [function(onlyNormal, tabs) {
      var tab = null, url = this;
      if (cOptions.url || cOptions.urls) {
        BackgroundCommands.openUrl(tabs);
        return chrome.runtime.lastError;
      }
      if (!tabs) {}
      else if (tabs.length > 0) { tab = tabs[0]; }
      else if ("id" in tabs) { tab = tabs; }
      else if (TabRecency.last() >= 0) {
        chrome.tabs.get(TabRecency.last(), funcDict.createTab[0].bind(url, onlyNormal));
        return;
      }
      if (!tab) {
        funcDict.createTabs(url, commandCount, true);
        return chrome.runtime.lastError;
      }
      if (tab.incognito && onlyNormal) { url = "chrome://newtab"; }
      tab.id = undefined;
      openMultiTab(url, commandCount, tab);
    }, function(wnd) {
      var tab;
      if (cOptions.url) {
        BackgroundCommands.openUrl([funcDict.selectFrom(wnd.tabs)]);
        return chrome.runtime.lastError;
      }
      if (!wnd) {
        chrome.tabs.create({url: this});
        return chrome.runtime.lastError;
      }
      tab = funcDict.selectFrom(wnd.tabs);
      if (wnd.type !== "normal") {
        tab.windowId = undefined;
      } else if (wnd.incognito) {
        // url is disabled to be opened in a incognito window directly
        funcDict.createTab[2](this, tab
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
        chrome.windows.getAll(funcDict.createTab[3].bind(url, tab, repeat));
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
        funcDict.createTab[4](this, tab, repeat, wnds[0]);
        return;
      }
      funcDict.makeTempWindow("about:blank", false, //
      funcDict.createTab[4].bind(null, this, tab, function(newTab) {
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
        funcDict.createTab[5].bind(tab, callback, newTab));
      });
    }, function(callback, newTab) {
      chrome.tabs.move(newTab.id, {
        index: this.index + 1,
        windowId: this.windowId
      }, function() {
        callback && callback(newTab);
        funcDict.selectTab(newTab.id);
      });
    }],
    duplicateTab: [function(tabId, wnd) {
      var tab = wnd.tabs.filter(function(tab) { return tab.id === tabId; })[0];
      if (wnd.incognito && !tab.incognito) {
        funcDict.duplicateTab[1](tabId);
      } else {
        funcDict.duplicateTab[2](tab);
      }
    }, function(id) {
      var count = commandCount;
      while (--count >= 0) {
        chrome.tabs.duplicate(id);
      }
    }, function(tab) {
      ++tab.index;
      tab.active = false;
      openMultiTab(tab.url, commandCount, tab);
    }],
    openUrlInNewTab: function(reuse, tabs) {
      if (cOptions.incognito) {
        chrome.windows.getAll(funcDict.openUrlInIncognito.bind(this, tabs[0]));
        return;
      }
      if (reuse === -2) { tabs[0].active = false; }
      if (funcDict.openShowPage[0](this, reuse, tabs[0])) { return; }
      openMultiTab(this, commandCount, tabs[0]);
    },
    openShowPage: [function(url, reuse, tab) {
      var prefix = Settings.CONST.ShowPage, arr;
      if (!url.startsWith(prefix) || url.length < prefix.length + 3) { return false; }
      url = url.substring(prefix.length);
      chrome.tabs.create({
        active: reuse !== -2,
        index: tab.incognito ? undefined : tab.index + 1,
        windowId: tab.incognito ? undefined : tab.windowId,
        url: prefix
      });
      arr = [url, null, 0];
      Settings.temp.shownHash = arr[1] = function() {
        clearTimeout(arr[2]);
        this.shownHash = null; return arr[0];
      };
      arr[2] = setTimeout(funcDict.openShowPage[1], 1200, arr);
      return true;
    }, function(arr) {
      arr[0] = "#!url vimium://error (vimium://show: sorry, the info has expired.)";
      arr[1] = setTimeout(function() {
        if (Settings.temp.shownHash === arr[1]) { Settings.temp.shownHash = null; }
        arr[0] = "", arr[1] = null;
      }, 2000);
    }],
    openUrls: function(tabs) {
      var urls = cOptions.urls, i, tab = tabs[0], repeat = commandCount;
      if (cOptions.reuse === -2) { tab.active = false; }
      do {
        for (i = 0; i < urls.length; i++) {
          openMultiTab(urls[i], 1, tab);
          tab.active = false;
          tab.index++;
        }
      } while (0 < --repeat);
    },
    moveTabToNewWindow: [function(wnd) {
      var tab;
      if (wnd.tabs.length <= 1 || wnd.tabs.length === commandCount) { return; }
      tab = funcDict.selectFrom(wnd.tabs);
      funcDict.makeWindow({
        type: "normal",
        tabId: tab.id,
        incognito: tab.incognito
      }, wnd.type === "normal" && wnd.state,
      commandCount > 1 && funcDict.moveTabToNewWindow[1].bind(wnd, tab.index));
    }, function(i, wnd2) {
        var tabs = this.tabs, startTabIndex, tabIds;
        startTabIndex = tabs.length - commandCount;
        if (startTabIndex >= i || startTabIndex <= 0) {
          tabs = tabs.slice(i + 1, i + commandCount);
        } else {
          tabs[i].id = tabs[startTabIndex].id;
          tabs = tabs.slice(startTabIndex + 1);
        }
        tabIds = tabs.map(funcDict.getId);
        chrome.tabs.move(tabIds, {index: 1, windowId: wnd2.id}, funcDict.onRuntimeError);
    }],
    moveTabToNextWindow: [function(tab, wnds0) {
      var wnds, ids, index;
      wnds = wnds0.filter(function(wnd) { return wnd.incognito === tab.incognito && wnd.type === "normal"; });
      if (wnds.length > 0) {
        ids = wnds.map(funcDict.getId);
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
      }, wnds.length === 1 && wnds[0].type === "normal" && wnds[0].state);
    }, function(tab, oldIndex, tab2) {
      tab2 = tab2[0];
      if (oldIndex >= 0) {
        funcDict.moveTabToNextWindow[2](tab.id, tab2);
        return;
      }
      funcDict.makeTempWindow(tab.id, tab.incognito, //
      funcDict.moveTabToNextWindow[2].bind(null, tab.id, tab2));
    }, function(tabId, tab2) {
      chrome.tabs.move(tabId, {index: tab2.index + 1, windowId: tab2.windowId}, function() {
        funcDict.selectTab(tabId, true);
      });
    }],
    moveTabToIncognito: [function(wnd) {
      var tab = funcDict.selectFrom(wnd.tabs);
      if (wnd.incognito && tab.incognito) { return funcDict.moveTabToIncognito[3](); }
      var options = {type: "normal", tabId: tab.id, incognito: true}, url = tab.url;
      if (tab.incognito) {
      } else if (Utils.isRefusingIncognito(url)) {
        if (wnd.incognito) {
          return funcDict.moveTabToIncognito[3]();
        }
        if (Settings.CONST.ChromeVersion >= 52) {
          return funcDict.complain("open this tab in incognito");
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
      funcDict.makeWindow(options, wnd.type === "normal" && wnd.state);
      if (tabId != null) {
        chrome.tabs.remove(tabId);
      }
    }, function(options, tab2) {
      tab2 = tab2[0];
      if (options.url) {
        chrome.tabs.create({url: options.url, index: tab2.index + 1, windowId: tab2.windowId});
        funcDict.selectWnd(tab2);
        chrome.tabs.remove(options.tabId);
        return;
      }
      funcDict.makeTempWindow(options.tabId, true, //
      funcDict.moveTabToNextWindow[2].bind(null, options.tabId, tab2));
    }, function() {
      requestHandlers.ShowHUD("This tab has been in incognito window");
    }],
    removeTab: function(tab, curTabs, wnds) {
      var url, windowId, wnd;
      wnds = wnds.filter(function(wnd) { return wnd.type === "normal"; });
      if (wnds.length <= 1) {
        // protect the last window
        url = Settings.cache.newTabUrl_f;
        if (!(wnd = wnds[0])) {}
        else if (wnd.id !== tab.windowId) { url = null; } // the tab may be in a popup window
        else if (wnd.incognito && !Utils.isRefusingIncognito(url)) {
          windowId = wnd.id;
        }
        // other urls will be disabled if incognito else auto in current window
      }
      else if (!tab.incognito) {
        // protect the last "normal & not incognito" window which has currentTab if it exists
        wnds = wnds.filter(function(wnd) { return !wnd.incognito; });
        if ((wnd = wnds[0]) && wnd.id === tab.windowId) {
          windowId = wnd.id;
          url = Settings.cache.newTabUrl_f;
        }
      }
      if (url != null) {
        curTabs = (curTabs.length > 1) ? curTabs.map(funcDict.getId) : [tab.id];
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
        return;
      }
      requestHandlers.ShowHUD("The session index provided is out of range.");
    },
    selectTab: function(tabId, alsoWnd) {
      chrome.tabs.update(tabId, {active: true}, alsoWnd ? funcDict.selectWnd : null);
    },
    selectWnd: function(tab) {
      tab && chrome.windows.update(tab.windowId, { focused: true });
      return chrome.runtime.lastError;
    },
    removeTabsRelative: function(activeTab, direction, tabs) {
      var i = activeTab.index, noPinned = false;
      if (direction > 0) {
        ++i;
        tabs = tabs.slice(i, i + direction);
      } else if (direction < 0) {
        noPinned = i > 0 && !tabs[i - 1].pinned;
        tabs = tabs.slice(Math.max(i + direction, 0), i);
      } else {
        noPinned = !activeTab.pinned && tabs.length > 1;
        tabs.splice(i, 1);
      }
      if (noPinned && tabs[0].pinned) {
        tabs = tabs.filter(function(tab) { return !tab.pinned; });
      }
      if (tabs.length > 0) {
        chrome.tabs.remove(tabs.map(funcDict.getId), funcDict.onRuntimeError);
      }
    },
    focusParentFrame: function(frames) {
      for (var i = 0, port, curId = this.frameId; i < frames.length; i++) {
        if (frames[i].frameId !== curId) { continue; }
        curId = frames[i].parentFrameId;
        port = Settings.indexFrame(this.tabId, curId);
        port ? port.postMessage({ name: "focusFrame", frameId: 0 })
          : requestHandlers.ShowHUD("Fail to find its parent frame");
        return;
      }
    },
    focusOrLaunch: [function(tabs) {
      if (tabs && tabs.length > 0) {
        chrome.windows.getCurrent(funcDict.focusOrLaunch[2].bind(this, tabs));
        return;
      }
      funcDict.getCurTab(funcDict.focusOrLaunch[1].bind(this));
      return chrome.runtime.lastError;
    }, function(tabs) {
      // TODO: how to wait for tab finishing to load
      var callback = this.scroll ? setTimeout.bind(window, Marks.scrollTab, 1000, this) : null;
      if (tabs.length <= 0) {
        chrome.windows.create({url: this.url}, callback && function(wnd) {
          wnd.tabs && wnd.tabs.length > 0 && callback(wnd.tabs[0]);
        });
        return;
      }
      chrome.tabs.create({
        index: tabs[0].index + 1,
        url: this.url,
        windowId: tabs[0].windowId
      }, callback);
    }, function(tabs, wnd) {
      var wndId = wnd.id, tabs2, tab, url = this.url;
      tabs2 = tabs.filter(function(tab) { return tab.windowId === wndId; });
      if (tabs2.length <= 0) {
        tabs2 = tabs.filter(function(tab) { return tab.incognito === wnd.incognito; });
        if (tabs2.length <= 0) {
          funcDict.getCurTab(funcDict.focusOrLaunch[1].bind(this));
          return;
        }
      }
      this.prefix && tabs2.sort(function(a, b) { return a.url.length - b.url.length; });
      tab = tabs2[0];
      tab.active && (tab = tabs2[1] || tab);
      chrome.tabs.update(tab.id, {
        url: tab.url === url || tab.url.startsWith(url) ? undefined : url,
        active: true
      }, this.scroll ? setTimeout.bind(window, Marks.scrollTab, 800, this) : null);
      tab.windowId !== wndId && funcDict.selectWnd(tab);
    }],
    toggleMuteTab: [function(tabs) {
      var tab = tabs[0];
      chrome.tabs.update(tab.id, { muted: !tab.mutedInfo.muted });
    }, function(tabs) {
      var curId = cOptions.other ? cPort.sender.tabId : -1, i, j,tab
        , muted = false, action = { muted: true };
      for (i = tabs.length; 0 <= --i; ) {
        tab = tabs[i];
        if (tab.id === curId) { continue; }
        if (!tab.mutedInfo.muted) {
          muted = true;
          chrome.tabs.update(tab.id, action);
        }
      }
      if (muted) { return; }
      action.muted = false;
      for (i = tabs.length; 0 <= --i; ) {
        j = tabs[i].id;
        if (j === curId) { continue; }
        chrome.tabs.update(j, action);
      }
    }]
  };

  BackgroundCommands = {
    createTab: function() {},
    duplicateTab: function() {
      var tabId = cPort.sender.tabId;
      if (tabId < 0) {
        return funcDict.complain("duplicate such a tab");
      }
      chrome.tabs.duplicate(tabId);
      if (1 > --commandCount) {}
      else if (Settings.CONST.ChromeVersion >= 52) {
        chrome.tabs.get(tabId, funcDict.duplicateTab[2]);
      } else {
        chrome.windows.getCurrent({populate: true},
        funcDict.duplicateTab[0].bind(null, tabId));
      }
    },
    moveTabToNewWindow: function() {
      chrome.windows.getCurrent({populate: true}, funcDict.moveTabToNewWindow[0]);
    },
    moveTabToNextWindow: function(tabs) {
      chrome.windows.getAll(funcDict.moveTabToNextWindow[0].bind(null, tabs[0]));
    },
    moveTabToIncognito: function() {
      if (cPort && Settings.CONST.ChromeVersion >= 52 && cPort.sender.incognito) {
        return funcDict.moveTabToIncognito[3]();
      }
      chrome.windows.getCurrent({populate: true}, funcDict.moveTabToIncognito[0]);
    },
    enableCSTemp: function(tabs) {
      ContentSettings.ensure(cOptions.type, tabs[0]);
    },
    toggleCS: function(tabs) {
      ContentSettings.toggleCurrent(cOptions.type, tabs[0]);
    },
    clearCS: function(tabs) {
      requestHandlers.ShowHUD(cOptions.type + " content settings have been cleared.");
      ContentSettings.clear(cOptions.type, tabs[0]);
    },
    goTab: function(tabs) {
      if (tabs.length < 2) { return; }
      var count = (cOptions.dir || 1) * commandCount,
        len = tabs.length, toSelect;
      count = cOptions.absolute
        ? count > 0 ? Math.min(len, count) - 1 : Math.max(0, len + count)
        : commandCount > tabs.length * 2 ? (count > 0 ? -1 : 0)
        : funcDict.selectFrom(tabs).index + count;
      toSelect = tabs[(count >= 0 ? 0 : len) + (count % len)];
      toSelect.active || funcDict.selectTab(toSelect.id);
    },
    removeTab: function(tabs) {
      if (!tabs || tabs.length <= 0) { return chrome.runtime.lastError; }
      var tab = tabs[0], i, startTabIndex = tabs.length - commandCount;
      if (cOptions.allow_close === true) {} else
      if (startTabIndex <= 0 && (startTabIndex === 0 || tab.active)) {
        chrome.windows.getAll(funcDict.removeTab.bind(null, tab, tabs));
        return;
      }
      if (!tab.active) {
        tab = funcDict.selectFrom(tabs);
      }
      if (commandCount <= 1) {
        chrome.tabs.remove(tab.id, funcDict.onRuntimeError);
        return;
      }
      i = tab.index--;
      funcDict.removeTabsRelative(tab, commandCount, tabs);
      if (startTabIndex < 0) { return; }
      if (startTabIndex >= i || i > 0 && tabs[i - 1].pinned && !tab.pinned) { return; }
      ++tab.index;
      funcDict.removeTabsRelative(tab, startTabIndex - i, tabs);
    },
    removeTabsR: function(tabs) {
      var dir = cOptions.dir | 0;
      dir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
      funcDict.removeTabsRelative(funcDict.selectFrom(tabs), dir * commandCount, tabs);
    },
    removeRightTab: function(tabs) {
      if (!tabs || commandCount > tabs.length - 1) { return; }
      var ind = funcDict.selectFrom(tabs).index + commandCount;
      chrome.tabs.remove(tabs[ind >= tabs.length ? tabs.length - 1 - commandCount : ind].id);
    },
    restoreTab: function() {
      var count = commandCount, limit;
      if (count === 1 && cPort.sender.incognito) {
        return requestHandlers.ShowHUD("Can not restore a tab in incognito mode!");
      }
      limit = chrome.sessions.MAX_SESSION_RESULTS;
      limit > 0 && limit < count && (count = limit);
      while (--count >= 0) {
        chrome.sessions.restore(null, funcDict.onRuntimeError);
      }
    },
    restoreGivenTab: function() {
      if (commandCount > chrome.sessions.MAX_SESSION_RESULTS) {
        funcDict.restoreGivenTab([]);
        return;
      }
      chrome.sessions.getRecentlyClosed(funcDict.restoreGivenTab);
    },
    blank: function() {},
    openCopiedUrlInCurrentTab: function() {
      return BackgroundCommands.openCopiedUrlInNewTab([]);
    },
    openCopiedUrlInNewTab: function(tabs) {
      Utils.lastUrlType = 0;
      var url = requestHandlers.getCopiedUrl_f(cOptions);
      if (Utils.lastUrlType === 5) {
        funcDict.onEvalUrl(url);
      } else if (!url) {
        requestHandlers.ShowHUD("No text copied!");
      } else if (tabs.length > 0) {
        openMultiTab(url, commandCount, tabs[0]);
      } else {
        chrome.tabs.update(null, { url: url }, funcDict.onRuntimeError);
      }
    },
    openUrl: function(tabs) {
      var url, reuse;
      if (cOptions.urls) {
        return tabs ? funcDict.openUrls(tabs) : funcDict.getCurTab(funcDict.openUrls);
      }
      if (cOptions.url_mask) {
        if (tabs == null) {
          return chrome.runtime.lastError || funcDict.getCurTab(BackgroundCommands.openUrl);
        }
        if (tabs.length > 0) {
          url = cOptions.url_f || cOptions.url;
          url = url.replace(cOptions.url_mask, tabs[0].url);
        }
      }
      url = cOptions.url_f ? url || cOptions.url_f : Utils.convertToUrl(url || cOptions.url || "");
      if (cOptions.id_marker) {
        url = url.replace(cOptions.id_marker, chrome.runtime.id);
      }
      reuse = cOptions.reuse;
      reuse == null && (reuse = -1);
      if (reuse > 0) {
        requestHandlers.focusOrLaunch({url: url});
      } else if (reuse === 0) {
        if (funcDict.openShowPage[0](url, reuse)) { return; }
        chrome.tabs.update(null, { url: url }, funcDict.onRuntimeError);
      } else {
        tabs ? funcDict.openUrlInNewTab.call(url, reuse, tabs)
        : funcDict.getCurTab(funcDict.openUrlInNewTab.bind(url, reuse));
      }
    },
    searchInAnother: function(tabs) {
      var keyword = cOptions.keyword, query;
      query = requestHandlers.parseSearchUrl(tabs[0]);
      if (!query || !keyword) {
        requestHandlers.ShowHUD(keyword ? "No search engine found!"
          : 'This key mapping lacks an arg "keyword"');
        return;
      }
      keyword = Utils.createSearchUrl(query.url.split(" "), keyword);
      cOptions = Object.setPrototypeOf({
        reuse: cOptions.reuse | 0,
        url_f: keyword
      }, null);
      BackgroundCommands.openUrl(tabs);
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
    toggleMuteTab: function() {
      if (Settings.CONST.ChromeVersion < 45) {
        return requestHandlers.ShowHUD("Vimium++ can not control mute state before Chrome 45");
      }
      if (cOptions.all || cOptions.other) {
        chrome.tabs.query({audible: true}, funcDict.toggleMuteTab[1]);
        return;
      }
      funcDict.getCurTab(funcDict.toggleMuteTab[0]);
    },
    reloadTab: function(tabs) {
      if (tabs.length <= 0) {
        chrome.windows.getCurrent({populate: true}, function(wnd) {
          if (!wnd) { return chrome.runtime.lastError; }
          wnd.tabs.length > 0 && BackgroundCommands.reloadTab(wnd.tabs);
        });
        return;
      }
      var reloadProperties = { bypassCache: cOptions.bypassCache === true }
        , ind = funcDict.selectFrom(tabs).index, len = tabs.length
        , end = ind + commandCount;
      if (cOptions.single) {
        ind = end <= len ? end - 1 : len >= commandCount ? len - commandCount : len - 1;
        end = 0;
      } else if (end > len) {
        end = len;
        len >= commandCount && (ind = len - commandCount);
      }
      do {
        chrome.tabs.reload(tabs[ind].id, reloadProperties);
      } while (end > ++ind);
    },
    reloadGivenTab: function() {
      if (commandCount === 1) {
        chrome.tabs.reload();
        return;
      }
      funcDict.getCurTabs(BackgroundCommands.reloadTab);
    },
    reopenTab: function(tabs) {
      var tab = tabs[0];
      if (!tab) { return; }
      ++tab.index;
      if (Settings.CONST.ChromeVersion >= 52 || !Utils.isRefusingIncognito(tab.url)) {
        funcDict.reopenTab(tab);
        return;
      }
      chrome.windows.get(tab.windowId, function(wnd) {
        wnd.incognito || funcDict.reopenTab(tab);
      });
    },
    goToRoot: function(tabs) {
      var url = tabs[0].url, result;
      result = requestHandlers.parseUpperUrl({
        trailing_slash: cOptions.trailing_slash,
        url: url, upper: commandCount - 1
      });
      if (result.path != null) {
        chrome.tabs.update(null, {url: result.url});
        return;
      }
      requestHandlers.ShowHUD(result.url);
    },
    moveTab: function(tabs) {
      var tab = funcDict.selectFrom(tabs), index, dir, pinned;
      dir = cOptions.dir > 0 ? 1 : -1;
      index = Math.max(0, Math.min(tabs.length - 1, tab.index + dir * commandCount));
      pinned = tab.pinned;
      while (pinned !== tabs[index].pinned) { index -= dir; }
      if (index != tab.index) {
        chrome.tabs.move(tab.id, {index: index});
      }
    },
    nextFrame: function(count) {
      var port = cPort, frames = framesForTab[port.sender.tabId], ind;
      if (frames && frames.length > 2) {
        count || (count = commandCount);
        ind = Math.max(0, frames.indexOf(port, 1));
        while (0 < count) {
          if (++ind === frames.length) { ind = 1; }
          --count;
        }
        port = frames[ind];
      }
      port.postMessage({
        name: "focusFrame",
        frameId: ind >= 0 ? port.sender.frameId : -1
      });
    },
    mainFrame: function() {
      var port = Settings.indexFrame(TabRecency.last(), 0);
      port && port.postMessage({
        name: "focusFrame",
        frameId: 0
      });
    },
    parentFrame: function() {
      var frames, sender, msg;
      msg = Settings.CONST.ChromeVersion < 41 ? "Vimium++ can not know parent frame before Chrome 41"
        : !chrome.webNavigation ? "Vimium++ is not permitted to access frames"
        : !((frames = framesForTab[cPort.sender.tabId]) && (sender = frames[0].sender) && sender.tabId > 0)
          ? "Vimium++ can not access frames in current tab"
        : !sender.frameId ? "This page is just the top frame"
        : null;
      if (msg) {
        return requestHandlers.ShowHUD(msg);
      }
      chrome.webNavigation.getAllFrames({tabId: sender.tabId}, funcDict.focusParentFrame.bind(sender));
    },
    visitPreviousTab: function(tabs) {
      var tabId;
      if (tabs.length < 2) { return; }
      tabs.splice(funcDict.selectFrom(tabs).index, 1);
      tabs.sort(TabRecency.rCompare);
      tabId = tabs[Math.min(commandCount, tabs.length) - 1].id;
      funcDict.selectTab(tabId);
    },
    copyTabInfo: function(tabs) {
      var str;
      switch (cOptions.type) {
      case "title": str = tabs[0].title; break;
      case "frame":
        if (needIcon && (str = cPort.sender.url)) { break; }
        cPort.postMessage({
          name: "execute",
          command: "autoCopy",
          count: 1,
          options: { url: true }
        });
        return;
      default: str = tabs[0].url; break;
      }
      Clipboard.copy(str);
      return requestHandlers.ShowHUD(str, true);
    },
    goNext: function() {
      var dir = cOptions.dir || "next", defaultPatterns;
      defaultPatterns = cOptions.patterns ||
        Settings.get(dir === "prev" ? "previousPatterns" : "nextPatterns", true);
      cPort.postMessage({ name: "execute", count: 1, command: "goNext",
        options: {
          dir: dir,
          patterns: defaultPatterns.toLowerCase()
        }
      });
    },
    enterInsertMode: function() {
      var hideHud = cOptions.hideHud;
      cPort.postMessage({ name: "execute", count: 1, command: "enterInsertMode",
        options: {
          code: cOptions.code | 0, stat: cOptions.stat | 0,
          hideHud: hideHud != null ? hideHud : Settings.get("hideHud", true)
        }
      });
    },
    performFind: function() {
      var query = cOptions.active ? null : FindModeHistory.query(cPort.sender.incognito);
      cPort.postMessage({ name: "execute", count: 1, command: "performFind", options: {
        count: commandCount,
        dir: cOptions.dir,
        query: query
      }});
    },
    showVomnibar: function() {
      var port = cPort, options;
      if (!port) {
        port = Settings.indexFrame(TabRecency.last(), 0);
        if (!port) { return; }
      } else if (port.sender.frameId !== 0 && port.sender.tabId >= 0) {
        port = Settings.indexFrame(port.sender.tabId, 0) || port;
      }
      options = Utils.extendIf(Object.setPrototypeOf({
        vomnibar: Settings.CONST.VomnibarPage,
        secret: getSecret(),
      }, null), cOptions);
      port.postMessage({
        name: "execute", count: commandCount,
        command: "Vomnibar.activate",
        options: options
      });
      options.secret = -1;
      cOptions = options;
    },
    clearFindHistory: function() {
      var incognito = cPort.sender.incognito;
      FindModeHistory.removeAll(incognito);
      return requestHandlers.ShowHUD((incognito ? "incognito " : "") + "find history has been cleared.");
    },
    toggleViewSource: function(tabs) {
      var url = tabs[0].url;
      if (url.startsWith("chrome-")) {
        return funcDict.complain("visit HTML of an extension's page");
      }
      url = url.startsWith("view-source:") ? url.substring(12) : ("view-source:" + url);
      openMultiTab(url, 1, tabs[0]);
    },
    clearGlobalMarks: function() { return Marks.clearGlobal(); }
  };

  getSecret = function() {
    var secret = 0, time = 0;
    getSecret = function() {
      var now = Date.now();
      if (now - time > 10000) {
        secret = 1 + (0 | (Math.random() * 0x6fffffff));
      }
      time = now;
      return secret;
    };
    return getSecret();
  };

  Settings.indexFrame = function(tabId, frameId) {
    var ref = framesForTab[tabId], i;
    if (!ref) { return null; }
    for (i = 0; ref.length > ++i; ) {
      if (ref[i].sender.frameId === frameId) {
        return ref[i];
      }
    }
    return null;
  };

  Settings.indexPorts = function(tabId) {
    return tabId ? framesForTab[tabId] : framesForTab;
  };

  Settings.updateHooks.PopulateCommandKeys = function() {
    return keyMap = Commands.populateCommandKeys();
  };

  keyQueueRe = /^\d+/;
  checkKeyQueue = function(request, port) {
    var key = request.key, arr, count = 1, ref, registryEntry;
    arr = keyQueueRe.exec(key);
    if (arr != null) {
      key = key.substring(arr[0].length);
      count = parseInt(arr[0], 10) || 1;
    }
    ref = CommandsData.keyToCommandRegistry;
    if (!(key in ref)) {
      arr = key.match(Utils.keyRe);
      key = arr[arr.length - 1];
      count = 1;
    }
    registryEntry = ref[key];
    Utils.resetRe();
    return executeCommand(registryEntry.command, registryEntry, count, port);
  };

  executeCommand = function(command, registryEntry, count, port) {
    var func, options = registryEntry.options, scale;
    if (options && (scale = +options.count)) { count = Math.max(1, (count * scale) | 0); }
    if (registryEntry.repeat === 1) {
      count = 1;
    } else if (registryEntry.repeat > 0 && count > registryEntry.repeat && !
      confirm("You have asked Vimium++ to perform " + count + " repeats of the command:\n        "
        + CommandsData.availableCommands[command][0]
        + "\n\nAre you sure you want to continue?")
    ) {
      return;
    }
    command = registryEntry.alias || command;
    if (!registryEntry.background) {
      return port.postMessage({
        name: "execute",
        command: command,
        count: count,
        options: options
      });
    }
    func = BackgroundCommands[command];
    cOptions = options || Object.create(null);
    cPort = port;
    commandCount = count;
    count = func.useTab;
    return count === 2 ? funcDict.getCurTabs(func) : count === 1 ? funcDict.getCurTab(func) : func();
  };

  /* globals g_requestHandlers: true */
  g_requestHandlers = requestHandlers = {
    setSetting: function(request, port) {
      var key = request.key;
      if (!(key in Settings.frontUpdateAllowed)) {
        cPort = port;
        return funcDict.complain('modify "' + key + '" setting');
      }
      Settings.set(key, request.value);
      if (key in Settings.bufferToLoad) {
        Settings.bufferToLoad[key] = Settings.cache[key];
      }
    },
    findQuery: function(request, port) {
      return FindModeHistory.query(port.sender.incognito, request.query, request.index);
    },
    parseSearchUrl: function(request) {
      var s0 = request.url, url = s0.toLowerCase(), decoders, pattern, _i, str, arr,
          selectLast, re, obj;
      if (!Utils.protocolRe.test(Utils.removeComposedScheme(url))) {
        return null;
      }
      if (_i = +request.upper) {
        obj = requestHandlers.parseUpperUrl({ url: s0, upper: _i, trailing_slash: request.trailing_slash });
        if (obj.path != null) {
          s0 = obj.url;
        }
        return { keyword: '', start: 0, url: s0 };
      }
      decoders = Settings.cache.searchEngineRules;
      if (url.startsWith("http")) {
        _i = url.charAt(4) === 's' ? 8 : 7;
        url = url.substring(_i);
        s0 = s0.substring(_i);
      }
      for (_i = decoders.length; 0 <= --_i; ) {
        pattern = decoders[_i];
        if (!url.startsWith(pattern[0])) { continue; }
        arr = s0.substring(pattern[0].length).match(pattern[1]);
        if (arr) { break; }
      }
      if (!arr) { return null; }
      if (arr.length > 1 && !pattern[1].global) { arr.shift(); }
      re = pattern[3];
      if (arr.length > 1) {
        selectLast = true;
      } else if (re instanceof RegExp) {
        url = arr[0];
        if (arr = url.match(re)) {
          arr.shift();
          selectLast = true;
        } else {
          arr = [url];
        }
      } else {
        arr = arr[0].split(re);
      }
      str = arr.map(Utils.DecodeURLPart).join(" ");
      url = str.replace(Utils.spacesRe, " ").trim();
      return {
        keyword: pattern[2],
        url: url,
        start: selectLast ? url.lastIndexOf(" ") + 1 : 0
      };
    },
    parseUpperUrl: function(request) {
      var url = request.url, hash, str, arr, startSlash = false, endSlash = false
        , path = null, i, start = 0, end = 0, decoded = false, argRe, arr2;
      if (!Utils.protocolRe.test(Utils.removeComposedScheme(url.toLowerCase()))) {
        return { url: "This url has no upper paths", path: null };
      }
      if (i = url.lastIndexOf("#") + 1) {
        hash = url.substring(i + (url[i] === "!"));
        str = Utils.DecodeURLPart(hash);
        i = str.lastIndexOf("/");
        if (i > 0 || (i === 0 && str.length > 1)) {
          decoded = str !== hash;
          argRe = /([^&=]+=)([^&\/=]*\/[^&]*)/;
          arr = argRe.exec(str) || /(^|&)([^&\/=]*\/[^&=]*)(?:&|$)/.exec(str);
          path = arr ? arr[2] : str;
          if (path === "/" || path.indexOf("://") >= 0) { path = null; }
          else if (!arr) { start = 0; }
          else if (!decoded) { start = arr.index + arr[1].length; }
          else {
            str = "http://example.com/";
            str = encodeURI(str + path).substring(str.length);
            i = hash.indexOf(str);
            if (i < 0) {
              i = hash.indexOf(str = encodeURIComponent(path));
            }
            if (i < 0) {
              decoded = false;
              i = hash.indexOf(str = path);
            }
            end = i + str.length;
            if (i < 0 && arr[1] !== "&") {
              i = hash.indexOf(str = arr[1]);
              if (i < 0) {
                decoded = true;
                str = arr[1];
                str = encodeURIComponent(str.substring(0, str.length - 1));
                i = hash.indexOf(str);
              }
              if (i >= 0) {
                i += str.length;
                end = hash.indexOf("&", i) + 1;
              }
            }
            if (i >= 0) {
              start = i;
            } else if (arr2 = argRe.exec(hash)) {
              path = Utils.DecodeURLPart(arr2[2]);
              start = arr2.index + arr2[1].length;
              end = start + arr2[2].length;
            } else if ((str = arr[1]) !== "&") {
              i = url.length - hash.length;
              hash = str + encodeURIComponent(path);
              url = url.substring(0, i) + hash;
              start = str.length;
              end = 0;
            }
          }
          if (path) {
            i = url.length - hash.length;
            start += i;
            end > 0 && (end += i);
          }
        }
      }
      if (!path) {
        if (url.startsWith("chrome")) {
          return { url: "An extension has no upper-level pages", path: null };
        }
        hash = "";
        start = url.indexOf("/", url.indexOf("://") + 3);
        if (url.startsWith("filesystem:")) { start = url.indexOf("/", start + 1); }
        i = url.indexOf("?", start);
        end = url.indexOf("#", start);
        i = end < 0 ? i : i < 0 ? end : i < end ? i : end;
        i = i > 0 ? i : url.length;
        path = url.substring(start, i);
        end = 0;
        decoded = false;
      }
      i = request.upper | 0;
      startSlash = path.startsWith("/");
      if (!hash && url.startsWith("file:")) {
        if (path.length <= 1 || url.length === 11 && url.endsWith(":/")) {
          return { url: "This has been the root path", path: null };
        }
        endSlash = true;
        i || (i = -1);
      } else if (!hash && url.startsWith("ftp:")) {
        endSlash = true;
      } else {
        endSlash = request.trailing_slash != null ? !!request.trailing_slash
          : path.length > 1 && path.endsWith("/");
      }
      if (i) {
        arr = path.substring(+startSlash, (path.length - path.endsWith("/")) || +startSlash).split("/");
        i < 0 && (i += arr.length);
      }
      if (i <= 0) {
        path = "/";
      } else if (i > 0 && i < arr.length) {
        arr.length = i;
        path = arr.join("/");
        path = (startSlash ? "/" : "") + path + (endSlash ? "/" : "");
      }
      str = decoded ? encodeURIComponent(path) : path;
      url = url.substring(0, start) + (end ? str + url.substring(end) : str);
      return {
        url: url,
        path: path
      };
    },
    searchAs: function(request) {
      var search = requestHandlers.parseSearchUrl(request), query;
      if (!search) { return "No search engine found!"; }
      if (!(query = request.search)) {
        query = Clipboard.paste().replace(Utils.spacesRe, ' ').trim();
        if (!query) { return "No selected or copied text found!"; }
      }
      query = Utils.createSearchUrl(query.split(" "), search.keyword);
      chrome.tabs.update(null, {
        url: query
      });
    },
    gotoSession: function(request, port) {
      var id = request.sessionId, active = request.active !== false, tabId;
      if (typeof id === "number") {
        return funcDict.selectTab(id, true);
      }
      chrome.sessions.restore(id, funcDict.onRuntimeError);
      if (active) { return; }
      tabId = port.sender.tabId;
      tabId >= 0 || (tabId = TabRecency.last());
      tabId >= 0 && funcDict.selectTab(tabId);
    },
    openUrl: function(request, port) {
      Object.setPrototypeOf(request, null);
      request.url_f = Utils.convertToUrl(request.url, request.keyword, 2);
      request.keyword = "";
      var ports;
      cPort = !port ? cPort : funcDict.checkVomnibarPage(port, true) ? port
        : (ports = framesForTab[port.sender.tabId]) ? ports[0] : cPort;
      if (Utils.lastUrlType === 5) {
        funcDict.onEvalUrl(request.url_f);
        return;
      } else if (request.https && Utils.lastUrlType >= 1 && Utils.lastUrlType <= 2) {
        request.url_f = "https" + request.url_f.substring(4);
      }
      commandCount = 1;
      cOptions = request;
      BackgroundCommands.openUrl();
    },
    frameFocused: function(request, port) {
      var tabId = port.sender.tabId, ref = framesForTab[tabId], status;
      if (!ref) {
        needIcon && requestHandlers.SetIcon(tabId, port.sender.status);
        return;
      }
      if (needIcon && (status = port.sender.status) !== ref[0].sender.status) {
        requestHandlers.SetIcon(tabId, status);
      }
      ref[0] = port;
    },
    checkIfEnabled: function(request, port) {
      port && port.sender || (port = Settings.indexFrame(request.tabId, request.frameId));
      if (!port) { return; }
      var oldUrl = port.sender.url, tabId = port.sender.tabId
        , pattern = Settings.getExcluded(port.sender.url = request.url)
        , status = pattern === null ? 0 : pattern ? 1 : 2;
      if (port.sender.status !== status) {
        port.sender.status = status;
        if (needIcon && framesForTab[tabId][0] === port) {
          requestHandlers.SetIcon(tabId, status);
        }
      } else if (!pattern || pattern === Settings.getExcluded(oldUrl)) {
        return;
      }
      port.postMessage({ name: "reset", passKeys: pattern });
    },
    nextFrame: function(request, port) {
      cPort = port;
      BackgroundCommands.nextFrame(1);
    },
    exitGrab: function(_0, port) {
      var ports = Settings.indexPorts(port.sender.tabId), i, msg;
      if (!ports || ports.length < 3) { return; }
      for (msg = { name: "exitGrab" }, i = ports.length; 1 <= --i; ) {
        ports[i] !== port && ports[i].postMessage(msg);
      }
    },
    refocusCurrent: function(request, port) {
      var ports = port.sender.tabId !== -1 ? framesForTab[port.sender.tabId] : null;
      if (ports) {
        return ports[0].postMessage({
          name: "focusFrame",
          lastKey: request.lastKey,
          frameId: -2
        });
      }
      try { port.postMessage({ name: "returnFocus", lastKey: request.lastKey }); } catch (e) {}
    },
    initHelp: function(request, port) {
      Promise.all([
        Utils.require('HelpDialog'),
        request, port,
        new Promise(function(resolve, reject) {
          var xhr = Settings.fetchFile("helpDialog", resolve);
          xhr instanceof XMLHttpRequest && (xhr.onerror = reject);
        })
      ]).then(function(args) {
        args[2].postMessage({
          name: "showHelpDialog",
          html: args[0].render(args[1]),
          optionUrl: Settings.CONST.OptionsPage,
          advanced: Settings.get("showAdvancedCommands", true)
        });
      }, function(args) {
        console.error("Promises for initHelp failed:", args[0], ';', args[3]);
      });
    },
    initInnerCSS: function() {
      return Settings.cache.innerCSS;
    },
    activateVomnibar: function(request, port) {
      cPort = port;
      if (request.count > 0) {
        commandCount = request.count;
        cOptions = Object.setPrototypeOf(request, null);
        delete cOptions.handler; delete cOptions.count;
      } else if (request.redo !== true || cOptions == null || cOptions.secret !== -1) {
        return;
      }
      return BackgroundCommands.showVomnibar();
    },
    omni: function(request, port) {
      if (funcDict.checkVomnibarPage(port)) { return; }
      Completers[request.type].filter(request.query, request, funcDict.PostCompletions.bind(port));
    },
    getCopiedUrl_f: function(request, port) {
      var url = Clipboard.paste().trim(), arr;
      if (!url) {}
      else if (arr = url.match(Utils.filePathRe)) {
        url = arr[1];
      } else {
        url = Utils.convertToUrl(url, request.keyword, port ? 0 : 2);
        if (port && url.substring(0, 11).toLowerCase() !== "javascript:") {
          cOptions = Object.setPrototypeOf({ url_f: url }, null);
          commandCount = 1; url = null;
          BackgroundCommands.openUrl();
        }
      }
      return url;
    },
    copyToClipboard: function(request) {
      Clipboard.copy(request.data);
    },
    key: checkKeyQueue,
    createMark: function(request, port) { return Marks.createMark(request, port); },
    gotoMark: function(request) { return Marks.gotoMark(request); },
    focusOrLaunch: function(request) {
      // * request.url is guaranteed to be well formatted by frontend
      // * do not limit windowId or windowType
      var url = request.url.split("#", 1)[0];
      chrome.tabs.query({
        url: request.prefix ? url + "*" : url
      }, funcDict.focusOrLaunch[0].bind(request));
    },
    secret: function(_0, port) {
      if (funcDict.checkVomnibarPage(port)) { return null; }
      return getSecret();
    },
    SetIcon: function() {},
    ShowHUD: function(message, isCopy) {
      try {
        cPort && cPort.postMessage({
          name: "showHUD",
          text: message,
          isCopy: isCopy === true
        });
      } catch (e) {
        cPort = null;
      }
    }
  };

  Settings.Init = function() {
    if (3 !== ++Connections.state) { return; }
    Settings.Init = null;
    Utils.resetRe();
    chrome.runtime.onConnect.addListener(Connections.OnConnect);
    chrome.runtime.onConnectExternal &&
    chrome.runtime.onConnectExternal.addListener(function(port) {
      if (port.sender && port.sender.id in Settings.extWhiteList
          && port.name.startsWith("vimium++")) {
        Connections.OnConnect(port);
      }
    });
  };

  Connections = {
    state: 0,
    _fakeId: -2,
    OnMessage: function(request, port) {
      var id;
      if (id = request._msgId) {
        request = request.request;
        port.postMessage({
          _msgId: id,
          response: requestHandlers[request.handler](request, port)
        });
      } else {
        requestHandlers[request.handler](request, port);
      }
    },
    OnConnect: function(port) {
      Connections.format(port);
      port.onMessage.addListener(Connections.OnMessage);
      var type = port.name[9] | 0, ref, tabId, pass, status;
      tabId = port.sender.tabId;
      if (type === 8) {
        framesForOmni.push(port);
        if (tabId < 0) {
          port.sender.tabId = cPort ? cPort.sender.tabId : TabRecency.last();
        }
        port.onDisconnect.addListener(Connections.OnOmniDisconnect);
        return;
      }
      port.onDisconnect.addListener(Connections.OnDisconnect);
      pass = Settings.getExcluded(port.sender.url);
      port.postMessage((type & 1) ? {
        name: "init",
        load: Settings.bufferToLoad,
        passKeys: pass,
        mapKeys: CommandsData.mapKeyRegistry,
        keyMap: keyMap
      } : {
        name: "reset",
        passKeys: pass
      });
      status = pass === null ? 0 : pass ? 1 : 2;
      port.sender.status = status;
      if (ref = framesForTab[tabId]) {
        ref.push(port);
        if (type & 2) {
          if (needIcon && ref[0].sender.status !== status) {
            requestHandlers.SetIcon(tabId, status);
          }
          ref[0] = port;
        }
      } else {
        framesForTab[tabId] = [port, port];
        status !== 0 && needIcon && requestHandlers.SetIcon(tabId, status);
      }
      if (Settings.CONST.ChromeVersion < 41) {
        port.sender.frameId = (type & 4) ? 0 : ((Math.random() * 9999997) | 0) + 2;
      }
    },
    OnDisconnect: function(port) {
      var i = port.sender.tabId, ref;
      if (!port.sender.frameId) {
        delete framesForTab[i];
        return;
      }
      if (!(ref = framesForTab[i])) { return; }
      i = ref.indexOf(port, 1);
      if (i === ref.length - 1) {
        --ref.length;
      } else if (i >= 0) {
        ref.splice(i, 1);
      }
      if (port === ref[0]) {
        ref[0] = ref[1];
      }
    },
    OnOmniDisconnect: function(port) {
      var ref = framesForOmni, i = ref.lastIndexOf(port);
      i === ref.length - 1 ? --ref.length : i >= 0 ? ref.splice(i, 1) : 0;
    },
    format: function(port) {
      var sender = port.sender, tab;
      tab = sender.tab || {
        id: this._fakeId--,
        incognito: false
      };
      port.sender = {
        frameId: sender.frameId || 0,
        incognito: tab.incognito,
        status: 0,
        tabId: tab.id,
        url: sender.url
      };
    }
  };

  if (Settings.CONST.ChromeVersion >= 52) {
    funcDict.createTab = [funcDict.createTab[0]];
  }
  Settings.updateHooks.newTabUrl_f = function(url) {
    var f, onlyNormal = Utils.isRefusingIncognito(url);
    BackgroundCommands.createTab = f = Settings.CONST.ChromeVersion < 52 && onlyNormal
    ? chrome.windows.getCurrent.bind(null, {populate: true}
        , funcDict.createTab[1].bind(url))
    : chrome.tabs.query.bind(null, {currentWindow: true, active: true}
        , funcDict.createTab[0].bind(url, onlyNormal));
    f.useTab = 0;
  };

  Settings.updateHooks.showActionIcon = function (value) {
    needIcon = value && chrome.browserAction ? true : false;
  };

  Settings.globalCommand = function(command, options, count) {
    count = Math.max(1, count | 0);
    options && typeof options === "object" ?
        Object.setPrototypeOf(options, null) : (options = null);
    executeCommand(command, Utils.makeCommand(command, options), count, null);
  };

  chrome.runtime.onMessageExternal && (
  chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
    var command;
    if (!(sender.id in Settings.extWhiteList)) {
      sendResponse(false);
      return;
    }
    if (typeof message === "string") {
      command = message;
      if (command && CommandsData.availableCommands[command]) {
        Settings.globalCommand(command);
      }
      return;
    }
    if (typeof message !== "object") { return; }
    switch (message.handler) {
    case "command":
      command = message.command;
      if (!(command && CommandsData.availableCommands[command])) { return; }
      Settings.globalCommand(command, message.options, message.count);
      break;
    case "content_scripts":
      sendResponse(Settings.CONST.ContentScripts);
      return;
    }
  }), Settings.postUpdate("extWhiteList"));

  chrome.tabs.onReplaced &&
  chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    var ref = framesForTab, frames, i;
    frames = ref[removedTabId];
    if (!frames) { return; }
    delete ref[removedTabId];
    ref[addedTabId] = frames;
    for (i = frames.length; 0 < --i; ) {
      frames[i].sender.tabId = addedTabId;
    }
  });

  setTimeout(function() {
    Settings.postUpdate("bufferToLoad", null);
    Settings.get("userDefinedOuterCss", true);
    Settings.Init();
  }, 0);

  (function() {
    var ref, i, ref2 = BackgroundCommands, key;
    for (key in ref2) { ref2[key].useTab = 0; }

    ref = ["goTab", "moveTab", "reloadGivenTab", "reloadTab", "removeRightTab" //
      , "removeTab", "removeTabsR", "togglePinTab", "visitPreviousTab" //
    ];
    for (i = ref.length; 0 <= --i; ) { ref2[ref[i]].useTab = 2; }
    ref = ["clearCS", "copyTabInfo", "enableCSTemp", "goToRoot", "moveTabToNextWindow"//
      , "openCopiedUrlInNewTab", "reopenTab", "toggleCS", "toggleViewSource" //
      , "searchInAnother" //
    ];
    for (i = ref.length; 0 <= --i; ) { ref2[ref[i]].useTab = 1; }
  })();

  setTimeout(function() {
    Settings.fetchFile("baseCSS");
    Settings.postUpdate("searchUrl", null); // will also update newTabUrl

    var arr = ["images", "plugins", "javascript", "cookies"], i;
    for (i = arr.length; 0 < i--; ) {
      localStorage.getItem(ContentSettings.makeKey(arr[i])) != null &&
      setTimeout(ContentSettings.clear, 100, arr[i]);
    }

    document.documentElement.textContent = '';
    document.firstChild.remove();
    Utils.resetRe();
  }, 34);

  // will run only on <F5>, not on runtime.reload
  window.onunload = function() {
    var ref = framesForTab, tabId, ports, i;
    framesForTab = null;
    ref.omni = framesForOmni;
    for (tabId in ref) {
      ports = ref[tabId];
      for (i = ports.length; 0 <= --i; ) {
        ports[i].disconnect();
      }
    }
  };
})();
