var g_requestHandlers: BgReqHandlerNS.BgReqHandlers;
(function() {
  type Tab = chrome.tabs.Tab;
  type Window = chrome.windows.Window;
  type CSTypes = chrome.contentSettings.ValidTypes;
  interface IncNormalWnd extends Window {
    incognito: true;
    type: "normal";
  }
  interface ActiveTab extends Tab {
    active: true;
  }
  interface PopWindow extends Window {
    tabs: Tab[];
  }
  interface InfoToCreateMultiTab extends chrome.tabs.CreateProperties {
    id?: number;
    index: number;
  }
  const enum UseTab { NoTab = 0, ActiveTab = 1, CurWndTabs = 2 }
  interface BgCmdNoTab {
    useTab?: UseTab.NoTab;
    (this: void): void;
  }
  interface BgCmdActiveTab {
    useTab?: UseTab.ActiveTab;
    (this: void, tabs1: [Tab] | never[]): void;
  }
  interface BgCmdCurWndTabs {
    useTab?: UseTab.CurWndTabs;
    (this: void, tabs1: Tab[]): void;
  }
  type BgCmd = BgCmdNoTab | BgCmdActiveTab | BgCmdCurWndTabs;

  const framesForTab: Frames.FramesMap = Object.create<Frames.Frames>(null), framesForOmni: Frames.Port[] = [],
  NoFrameId = Settings.CONST.ChromeVersion < 41,
  openMultiTab = function(this: void, rawUrl: string, count: number
      , parentTab: InfoToCreateMultiTab): void {
    if (!(count >= 1)) return;
    const wndId = parentTab.windowId, option = {
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
  },
  ContentSettings = {
    makeKey (this: void, contentType: CSTypes, url?: string): string {
      return "vimiumContent|" + contentType + (url ? "|" + url : "");
    },
    complain (this: void, contentType: CSTypes, url: string): boolean {
      if (!chrome.contentSettings) {
        requestHandlers.ShowHUD("This Vimium++ has no permissions to change your content settings");
        return true;
      }
      if (!chrome.contentSettings[contentType] || (<RegExpOne>/^[A-Z]/).test(contentType)) {
        return true;
      }
      if (Utils.protocolRe.test(url) && !url.startsWith("chrome")) {
        return false;
      }
      funcDict.complain("change its content settings");
      return true;
    },
    parsePattern (this: void, pattern: string, level: number): string {
      let arr: string[];
      if (pattern.startsWith("file:")) {
        if (level > 1) {
          arr = pattern.split("/");
          arr.length = Math.max(arr.length - level + 1, 3);
          arr.length === 3 && arr.push("");
          pattern = arr.join("/");
        }
        return pattern;
      }
      arr = pattern.match(/^([^:]+:\/\/)([^\/]+)\//) as RegExpMatchArray;
      if (level < 2) {
        return arr[0] + "*";
      }
      pattern = arr[1]; arr = arr[2].split(".");
      let i = arr.length;
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
    clear (this: void, contentType: CSTypes, tab?: Tab): void {
      if (!chrome.contentSettings) { return; }
      const cs = chrome.contentSettings[contentType];
      if (tab) {
        cs.clear({ scope: (tab.incognito ? "incognito_session_only" : "regular") });
        return;
      }
      cs.clear({ scope: "regular" });
      cs.clear({ scope: "incognito_session_only" }, funcDict.onRuntimeError);
      localStorage.removeItem(ContentSettings.makeKey(contentType));
    },
    toggleCurrent (contentType: CSTypes, tab: Tab): void {
      const pattern = Utils.removeComposedScheme(tab.url), _this = this;
      if (this.complain(contentType, pattern)) { return; }
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
            const key = ContentSettings.makeKey(contentType);
            localStorage.getItem(key) !== "1" && (localStorage.setItem(key, "1"));
          }
          if (tab.incognito || cOptions.action === "reopen" || !chrome.sessions) {
            ++tab.index;
            return funcDict.reopenTab(tab);
          } else if (tab.index > 0) {
            return funcDict.refreshTab[0](tab.id);
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
    ensure (contentType: CSTypes, tab: Tab): void {
      const pattern = Utils.removeComposedScheme(tab.url), _this = this;
      if (this.complain(contentType, pattern)) { return; }
      chrome.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function(opt) {
        if (chrome.runtime.lastError) {
          chrome.contentSettings[contentType].get({primaryUrl: tab.url}, function (opt) {
            if (opt && opt.setting === "allow") { return; }
            const tabOpt = {type: "normal", incognito: true, focused: false, url: "about:blank"};
            chrome.windows.create(tabOpt, function (wnd: Window): void {
              const leftTabId = (wnd.tabs as Tab[])[0].id;
              return _this.setAndUpdate(contentType, tab, pattern, wnd.id, true, function() {
                chrome.tabs.remove(leftTabId);
              });
            });
          });
          return chrome.runtime.lastError;
        }
        if (opt && opt.setting === "allow" && tab.incognito) {
          return _this.updateTab(tab);
        }
        chrome.windows.getAll(function(wnds) {
          wnds = wnds.filter(funcDict.isIncNor);
          if (!wnds.length) {
            console.log("%cContentSettings.ensure%c", "color:red;", "color:auto;"
              , "get incognito content settings", opt, " but can not find an incognito window.");
          } else if (opt && opt.setting === "allow") {
            return _this.updateTab(tab, wnds[wnds.length - 1].id);
          } else if (tab.incognito && wnds.filter(function(wnd) { return wnd.id === tab.windowId; }).length === 1) {
            return _this.setAndUpdate(contentType, tab, pattern);
          } else {
            return _this.setAndUpdate(contentType, tab, pattern, wnds[wnds.length - 1].id);
          }
        });
      });
    },
    setAndUpdate (contentType: CSTypes, tab: Tab, pattern: string
        , wndId?: number, doSyncWnd?: boolean, callback?: (this: void, window: Window | boolean) => void): void {
      callback = this.updateTabAndWindow.bind(this, tab, wndId, callback);
      return this.setAllLevels(contentType, pattern, commandCount
        , { scope: "incognito_session_only", setting: "allow" }
        , doSyncWnd && wndId !== tab.windowId
        ? function(err) {
          if (err) { return; }
          chrome.windows.get(tab.windowId, callback as (this: void, window: Window | boolean) => void);
        } : callback);
    },
    setAllLevels (contentType: CSTypes, url: string, count: number
        , settings: Readonly<Pick<chrome.contentSettings.SetDetails, "scope" | "setting">>
        , callback: (this: void, has_err: boolean) => void): void {
      let info: chrome.contentSettings.SetDetails, i: number, left: number, has_err = false;
      const ref = chrome.contentSettings[contentType], func = function() {
        const err = chrome.runtime.lastError;
        if (has_err) { return err; }
        --left; has_err = !!err;
        if ((has_err || left === 0)) {
          setTimeout(callback, 0, has_err);
        }
        return err;
      };
      Object.setPrototypeOf(settings, null);
      count = count | 0;
      for (left = i = count; i > 0; i--) {
        info = Utils.extendIf(Object.create(null) as typeof info, settings);
        info.primaryPattern = this.parsePattern(url, i);
        ref.set(info, func);
      }
    },
    updateTabAndWindow (tab: Tab, wndId?: number, callback?: (this: void) => void, oldWnd?: Window): void {
      this.updateTab(tab, wndId, callback);
      wndId && chrome.windows.update(wndId, {
        focused: true,
        state: oldWnd ? oldWnd.state : undefined
      });
    },
    updateTab (this: void, tab: Tab, newWindowId?: number, callback?: (this: void) => void): void {
      tab.windowId = newWindowId ? newWindowId : tab.windowId;
      tab.active = true;
      if (!newWindowId || tab.windowId === newWindowId) {
        ++tab.index;
      } else {
        (tab as chrome.tabs.CreateProperties).index = undefined;
      }
      funcDict.reopenTab(tab);
      if (callback) {
        return callback();
      }
    }
  },
  funcDict = {
    isIncNor (this: void, wnd: Window): wnd is IncNormalWnd {
      return wnd.incognito && wnd.type === "normal";
    },
    selectFrom (this: void, tabs: Tab[]): ActiveTab {
      for (let i = tabs.length; 0 < --i; ) {
        if (tabs[i].active) {
          return tabs[i] as ActiveTab;
        }
      }
      return tabs[0] as ActiveTab;
    },
    reopenTab (this: void, tab: Tab): void {
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
      setTimeout(funcDict.refreshTab[2], 17, tab ? "get" : "reload", tab ? tab.id : this as number);
    }, function(action, tabId) {
      (chrome.tabs[action] as (tabId: number, callback?: (tab?: Tab) => void) => 1)(tabId
        , funcDict.refreshTab[1].bind(tabId, null, action));
    }] as [
      (this: void, tabId: number) => void,
      (this: void | number, tab?: Tab | null, action?: "get" | "reload") => void,
      (this: void, action: "get" | "reload", tabId: number) => void
    ],
    makeWindow (this: void, option: chrome.windows.CreateData, state?: chrome.windows.ValidStates | ""
        , callback?: (wnd: Window) => void): void {
      if (!state) { state = ""; }
      else if (option.focused === false) {
        state !== "minimized" && (state = "normal");
      } else if (state === "minimized") {
        state = "normal";
      }
      if (state && Settings.CONST.ChromeVersion >= 44) {
        option.state = state;
        state = "";
      }
      const focused = option.focused !== false;
      option.focused = true;
      chrome.windows.create(option, state || !focused ? function(wnd: Window) {
        callback && callback(wnd);
        const opt = { focused: focused && undefined } as chrome.windows.CreateData;
        state && (opt.state = state);
        chrome.windows.update(wnd.id, opt);
      } : callback || null);
    },
    makeTempWindow (this: void, tabIdUrl: number | string, incognito: boolean, callback: (wnd?: Window) => void): void {
      const isId = typeof tabIdUrl === "number", option: chrome.windows.CreateData = {
        type: "normal",
        focused: false,
        incognito,
        state: "minimized",
        tabId: isId ? tabIdUrl as number : undefined,
        url: isId ? undefined : tabIdUrl as string
      };
      if (Settings.CONST.ChromeVersion < 44) {
        option.state = undefined;
        option.left = option.top = 0; option.width = option.height = 50;
      }
      chrome.windows.create(option, callback);
    },
    onRuntimeError (this: void): void {
      return chrome.runtime.lastError;
    },
    safeUpdate (this: void | boolean | object, url: string, tabs1?: [Tab]): 1 {
      if (!tabs1) {
        if (Utils.isRefusingIncognito(url) && this !== true) {
          return funcDict.getCurTab(funcDict.safeUpdate.bind(true, url));
        }
      } else if (tabs1.length > 0 && tabs1[0].incognito && Utils.isRefusingIncognito(url)) {
        return chrome.tabs.create({ url });
      }
      return chrome.tabs.update({ url }, funcDict.onRuntimeError);
    },
    onEvalUrl (this: void, arr: Urls.SpecialUrl): void {
      if (arr instanceof Promise) { arr.then(funcDict.onEvalUrl); return; }
      switch(arr[1]) {
      case "copy":
        return requestHandlers.ShowHUD((arr as Urls.CopyEvalResult)[0], true);
      }
    },
    complain (this: void, action: string): void {
      return requestHandlers.ShowHUD("It's not allowed to " + action);
    },
    checkVomnibarPage: function (this: void, port: Frames.Port, nolog?: boolean): boolean {
      if (port.sender.url === Settings.CONST.VomnibarPage) { return false; }
      if (!nolog && !(port.sender as Frames.ExSender).warned) {
      console.warn("Receive a request from %can unsafe source page%c (should be vomnibar) :\n ",
        "color: red", "color: auto",
        port.sender.url, '@' + port.sender.tabId);
      (port.sender as Frames.ExSender).warned = true;
      }
      return true;
    } as {
      (this: void, port: Port, nolog: true): boolean
      (this: void, port: Frames.Port, nolog?: false): boolean
    },
    PostCompletions (this: Port, list: Readonly<Suggestion>[]
        , autoSelect: boolean, matchType: CompletersNS.MatchType): void {
      try {
      this.postMessage({ name: "omni", autoSelect, matchType, list });
      } catch (e) {}
    },

    getCurTab: chrome.tabs.query.bind<null, { active: true, currentWindow: true }
        , (result: [Tab] | never[]) => void, 1>(null, { active: true, currentWindow: true }),
    getCurTabs: chrome.tabs.query.bind(null, {currentWindow: true}),
    getId (this: void, tab: { readonly id: number }): number { return tab.id; },

    createTabs (this: void, rawUrl: string, count: number, active: boolean): void {
      if (!(count >= 1)) return;
      const option: chrome.tabs.CreateProperties = {url: rawUrl, active};
      chrome.tabs.create(option);
      if (count < 2) return;
      option.active = false;
      do {
        chrome.tabs.create(option);
      } while(--count > 1);
    },
    openUrlInIncognito (this: string, tab: Tab, wnds: Window[]): void {
      let oldWnd: Window | undefined, inCurWnd: boolean
        , active = !(<ReuseType>cOptions.reuse < ReuseType.newFg);
      oldWnd = wnds.filter(function(wnd) { return wnd.id === tab.windowId; })[0];
      inCurWnd = oldWnd != null && oldWnd.incognito;
      inCurWnd || (wnds = wnds.filter(funcDict.isIncNor));
      if (inCurWnd || wnds.length > 0) {
        const options = {
          url: this,
          windowId: inCurWnd ? tab.windowId : wnds[wnds.length - 1].id
        } as chrome.tabs.CreateProperties & { windowId: number };
        if (inCurWnd) {
          options.index = tab.index + 1;
          options.openerTabId = tab.id;
          options.active = active;
        }
        chrome.tabs.create(options);
        return !inCurWnd && active ? funcDict.selectWnd(options) : undefined;
      }
      return funcDict.makeWindow({
        type: "normal", url: this,
        incognito: true, focused: active
      }, oldWnd && oldWnd.type === "normal" ? oldWnd.state : "");
    },

    createTab: [function(onlyNormal, tabs) {
      if (cOptions.url || cOptions.urls) {
        BackgroundCommands.openUrl(tabs as [Tab] | undefined);
        return chrome.runtime.lastError;
      }
      let tab: (Partial<Tab> & InfoToCreateMultiTab) | null = null, url = this;
      if (!tabs) {}
      else if ((tabs as Tab[]).length > 0) { tab = (tabs as Tab[])[0]; }
      else if ("id" in tabs) { tab = tabs as Tab; }
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
      return openMultiTab(url, commandCount, tab);
    }, function(wnd): void {
      if (cOptions.url || cOptions.urls) {
        return BackgroundCommands.openUrl([funcDict.selectFrom((wnd as PopWindow).tabs)]);
      }
      if (!wnd) {
        chrome.tabs.create({url: this});
        return chrome.runtime.lastError;
      }
      const tab = funcDict.selectFrom(wnd.tabs);
      if (wnd.type !== "normal") {
        (tab as InfoToCreateMultiTab).windowId = undefined;
      } else if (wnd.incognito) {
        // url is disabled to be opened in a incognito window directly
        return funcDict.createTab[2](this, tab
          , (--commandCount > 0) ? funcDict.duplicateTab[1] : null, wnd.tabs);
      }
      (tab as InfoToCreateMultiTab).id = undefined;
      return openMultiTab(this, commandCount, tab);
    }, function(url, tab, repeat, allTabs): void {
      const urlLower = url.toLowerCase().split('#', 1)[0];
      allTabs = allTabs.filter(function(tab1) {
        const url = tab1.url.toLowerCase(), end = url.indexOf("#");
        return ((end < 0) ? url : url.substring(0, end)) === urlLower;
      });
      if (allTabs.length === 0) {
        chrome.windows.getAll(funcDict.createTab[3].bind(url, tab, repeat));
        return;
      }
      const tabs = allTabs.filter(function(tab1) { return tab1.index >= tab.index; });
      tab = tabs.length > 0 ? tabs[0] : allTabs[allTabs.length - 1];
      chrome.tabs.duplicate(tab.id);
      if (repeat) { return repeat(tab.id); }
    }, function(tab, repeat, wnds): void {
      wnds = wnds.filter(function(wnd) {
        return !wnd.incognito && wnd.type === "normal";
      });
      if (wnds.length > 0) {
        return funcDict.createTab[4](this, tab, repeat, wnds[0]);
      }
      return funcDict.makeTempWindow("about:blank", false, //
      funcDict.createTab[4].bind(null, this, tab, function(newTabId: number, newWndId: number): void {
        chrome.windows.remove(newWndId);
        if (repeat) { return repeat(newTabId); }
      }));
    }, function(url, tab, callback, wnd) {
      chrome.tabs.create({
        active: false,
        windowId: wnd.id,
        url
      }, function(newTab) {
        return funcDict.makeTempWindow(newTab.id, true, funcDict.createTab[5].bind(tab, callback, newTab));
      });
    }, function(callback, newTab) {
      chrome.tabs.move(newTab.id, {
        index: this.index + 1,
        windowId: this.windowId
      }, function(): void {
        callback && callback(newTab.id, newTab.windowId);
        return funcDict.selectTab(newTab.id);
      });
    }] as [
      (this: string, onlyNormal?: boolean, tabs?: Tab[] | Tab) => void,
      (this: string, wnd?: PopWindow) => void,
      (this: void, url: string, tab: Tab, repeat: ((this: void, tabId: number) => void) | null, allTabs: Tab[]) => void,
      (this: string, tab: Tab, repeat: ((this: void, tabId: number) => void) | null, wnds: Window[]) => void,
      (this: void, url: string, tab: Tab
        , callback: ((this: void, tabId: number, wndId: number) => void) | null, wnd: Window) => void,
      (this: Tab, callback: ((this: void, tabId: number, wndId: number) => void) | null, newTab: Tab) => void
    ],
    duplicateTab: [function(tabId, wnd): void {
      const tab = wnd.tabs.filter(function(tab) { return tab.id === tabId; })[0];
      return wnd.incognito && !tab.incognito ? funcDict.duplicateTab[1](tabId) : funcDict.duplicateTab[2](tab);
    }, function(id) {
      for (let count = commandCount; --count >= 0; ) {
        chrome.tabs.duplicate(id);
      }
    }, function(tab) {
      ++tab.index;
      tab.active = false;
      return openMultiTab(tab.url, commandCount, tab);
    }] as [
      (tabId: number, wnd: PopWindow) => void,
      (tabId: number) => void,
      (tab: Tab) => void
    ],
    openUrlInNewTab: function(this: string, reuse: ReuseType, tabs: [Tab]): void {
      const tab = tabs[0];
      if (cOptions.incognito) {
        chrome.windows.getAll(funcDict.openUrlInIncognito.bind(this, tab));
        return;
      }
      if (reuse === ReuseType.newBg) { tab.active = false; }
      if (funcDict.openShowPage[0](this, reuse, tab)) { return; }
      return openMultiTab(this, commandCount, tab);
    },
    openShowPage: [function(url, reuse, tab): boolean {
      const prefix = Settings.CONST.ShowPage;
      if (!url.startsWith(prefix) || url.length < prefix.length + 3) { return false; }
      if (!tab) {
        funcDict.getCurTab(function(tabs): void {
          if (!tabs || tabs.length <= 0) { return chrome.runtime.lastError; }
          funcDict.openShowPage[0](url, reuse, tabs[0]);
        });
        return true;
      }
      url = url.substring(prefix.length);
      if (reuse === ReuseType.current && !tab.incognito) {
        chrome.tabs.update({ url: prefix });
      } else
      chrome.tabs.create({
        active: reuse !== ReuseType.newBg,
        index: tab.incognito ? undefined : tab.index + 1,
        windowId: tab.incognito ? undefined : tab.windowId,
        url: prefix
      });
      const arr: [string, (() => void) | null, number] = [url, null, 0];
      Settings.temp.shownHash = arr[1] = function(this: void): string {
        clearTimeout(arr[2]);
        Settings.temp.shownHash = null; return arr[0];
      };
      arr[2] = setTimeout(funcDict.openShowPage[1], 1200, arr);
      return true;
    }, function(arr) {
      arr[0] = "#!url vimium://error (vimium://show: sorry, the info has expired.)";
      arr[2] = setTimeout(function() {
        if (Settings.temp.shownHash === arr[1]) { Settings.temp.shownHash = null; }
        arr[0] = "", arr[1] = null;
      }, 2000);
    }] as [
      (url: string, reuse: ReuseType, tab?: Tab) => boolean,
      (arr: [string, (() => void) | null, number]) => void
    ],
    openUrls: function(tabs: [Tab]): void {
      let urls = cOptions.urls, i, tab = tabs[0], repeat = commandCount;
      if (cOptions.reuse === ReuseType.newBg) { tab.active = false; }
      do {
        for (i = 0; i < urls.length; i++) {
          openMultiTab(urls[i], 1, tab);
          tab.active = false;
          tab.index++;
        }
      } while (0 < --repeat);
    },
    moveTabToNewWindow: [function(wnd): void {
      if (wnd.tabs.length <= 1 || wnd.tabs.length === commandCount) { return; }
      const tab = funcDict.selectFrom(wnd.tabs);
      return funcDict.makeWindow({
        type: "normal",
        tabId: tab.id,
        incognito: tab.incognito
      }, wnd.type === "normal" ? wnd.state : "",
      commandCount > 1 ? funcDict.moveTabToNewWindow[1].bind(wnd, tab.index) : undefined);
    }, function(i, wnd2): void {
        let tabs = this.tabs, startTabIndex = tabs.length - commandCount;
        if (startTabIndex >= i || startTabIndex <= 0) {
          tabs = tabs.slice(i + 1, i + commandCount);
        } else {
          tabs[i].id = tabs[startTabIndex].id;
          tabs = tabs.slice(startTabIndex + 1);
        }
        const tabIds = tabs.map(funcDict.getId);
        chrome.tabs.move(tabIds, {index: 1, windowId: wnd2.id}, funcDict.onRuntimeError);
    }] as [
      (this: void, wnd: PopWindow) => void,
      (this: PopWindow, i: number, wnd2: Window) => void
    ],
    moveTabToNextWindow: [function(tab, wnds0): void {
      let wnds: Window[], ids: number[], index: number;
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
      return funcDict.makeWindow({
        type: "normal",
        tabId: tab.id,
        incognito: tab.incognito
      }, wnds.length === 1 && wnds[0].type === "normal" ? wnds[0].state : "");
    }, function(tab, oldIndex, tabs2): void {
      const tab2 = tabs2[0];
      if (oldIndex >= 0) {
        funcDict.moveTabToNextWindow[2](tab.id, tab2);
        return;
      }
      return funcDict.makeTempWindow(tab.id, tab.incognito, funcDict.moveTabToNextWindow[2].bind(null, tab.id, tab2));
    }, function(tabId, tab2) {
      chrome.tabs.move(tabId, {index: tab2.index + 1, windowId: tab2.windowId}, function(): void {
        return funcDict.selectTab(tabId, true);
      });
    }] as [
      (this: void, tab: Tab, wnds0: Window[]) => void,
      (tab: Tab, oldIndex: number, tabs2: [Tab]) => void,
      (tabId: number, tab2: Tab) => void
    ],
    moveTabToIncognito: [function(wnd): void {
      const tab = funcDict.selectFrom(wnd.tabs);
      if (wnd.incognito && tab.incognito) { return funcDict.moveTabToIncognito[3](); }
      const options: chrome.windows.CreateData = {type: "normal", tabId: tab.id, incognito: true}, url = tab.url;
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
        return funcDict.reopenTab(tab);
      } else {
        options.url = url;
      }
      (wnd as Window).tabs = undefined;
      chrome.windows.getAll(funcDict.moveTabToIncognito[1].bind(null, options, wnd));
    }, function(options, wnd, wnds): void {
      let tabId: number | undefined;
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
      funcDict.makeWindow(options, wnd.type === "normal" ? wnd.state : "");
      if (tabId != null) {
        chrome.tabs.remove(tabId);
      }
    }, function(options, tabs2): void {
      const tab2 = tabs2[0];
      if (options.url) {
        chrome.tabs.create({url: options.url, index: tab2.index + 1, windowId: tab2.windowId});
        funcDict.selectWnd(tab2);
        chrome.tabs.remove(options.tabId as number);
        return;
      }
      return funcDict.makeTempWindow(options.tabId as number, true, //
      funcDict.moveTabToNextWindow[2].bind(null, options.tabId, tab2));
    }, function(): void {
      return requestHandlers.ShowHUD("This tab has been in incognito window");
    }] as [
      (this: void, wnd: PopWindow) => void,
      (this: void, options: chrome.windows.CreateData, wnd: Window, wnds: Window[]) => void,
      (this: void, options: chrome.windows.CreateData, tabs2: [Tab]) => void,
      (this: void, ) => void
    ],
    removeTab (this: void, tab: Tab, curTabs: Tab[], wnds: Window[]): void {
      let url: string | null = null, windowId: number | undefined, wnd: Window;
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
      if (url !== null) {
        const tabIds = (curTabs.length > 1) ? curTabs.map(funcDict.getId) : [tab.id];
        chrome.tabs.create({ index: tabIds.length, url, windowId });
        chrome.tabs.remove(tabIds);
      } else {
        chrome.windows.remove(tab.windowId);
      }
    },
    restoreGivenTab (this: void, list: chrome.sessions.Session[]): void {
      if (commandCount <= list.length) {
        const session = list[commandCount - 1];
        if (session.tab) {
          chrome.sessions.restore(session.tab.sessionId);
        }
        // TODO: what to do if session.window
        return;
      }
      return requestHandlers.ShowHUD("The session index provided is out of range.");
    },
    selectTab (this: void, tabId: number, alsoWnd?: boolean): void {
      chrome.tabs.update(tabId, {active: true}, alsoWnd ? funcDict.selectWnd : null);
    },
    selectWnd (this: void, tab?: { windowId: number }): void {
      tab && chrome.windows.update(tab.windowId, { focused: true });
      return chrome.runtime.lastError;
    },
    removeTabsRelative (this: void, activeTab: Tab, direction: number, tabs: Tab[]): void {
      let i = activeTab.index, noPinned = false;
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
    focusParentFrame: function(this: Frames.Sender, frames: chrome.webNavigation.GetAllFrameResultDetails[]): void {
      for (let i = 0, curId = this.frameId; i < frames.length; i++) {
        if (frames[i].frameId !== curId) { continue; }
        curId = frames[i].parentFrameId;
        const port = Settings.indexFrame(this.tabId, curId);
        port ? port.postMessage({ name: "focusFrame", frameId: 0 })
          : requestHandlers.ShowHUD("Fail to find its parent frame");
        return;
      }
    },
    focusOrLaunch: [function(tabs): void {
      if (tabs && tabs.length > 0) {
        chrome.windows.getCurrent(funcDict.focusOrLaunch[2].bind(this, tabs));
        return;
      }
      funcDict.getCurTab(funcDict.focusOrLaunch[1].bind(this));
      return chrome.runtime.lastError;
    }, function(tabs) {
      // TODO: how to wait for tab finishing to load
      const callback = this.scroll ? /* this is MarksNS.MarkToGo */
        setTimeout.bind<null
          , typeof Marks.scrollTab, number, MarksNS.MarkToGo, Tab
          , void>(null, Marks.scrollTab, 1000, this as MarksNS.MarkToGo)
        : null;
      if (tabs.length <= 0) {
        chrome.windows.create({url: this.url}, callback && function(wnd: Window): void {
          wnd.tabs && wnd.tabs.length > 0 && callback(wnd.tabs[0]);
        });
        return;
      }
      chrome.tabs.create({
        index: tabs[0].index + 1,
        url: this.url,
        windowId: tabs[0].windowId
      }, callback);
    }, function(tabs, wnd): void {
      const wndId = wnd.id, url = this.url;
      let tabs2 = tabs.filter(function(tab) { return tab.windowId === wndId; });
      if (tabs2.length <= 0) {
        tabs2 = tabs.filter(function(tab) { return tab.incognito === wnd.incognito; });
        if (tabs2.length <= 0) {
          funcDict.getCurTab(funcDict.focusOrLaunch[1].bind(this));
          return;
        }
      }
      this.prefix && tabs2.sort(function(a, b) { return a.url.length - b.url.length; });
      let tab = tabs2[0];
      tab.active && (tab = tabs2[1] || tab);
      chrome.tabs.update(tab.id, {
        url: tab.url === url || tab.url.startsWith(url) ? undefined : url,
        active: true
      }, this.scroll ? setTimeout.bind(window, Marks.scrollTab, 800, this) : null);
      if (tab.windowId !== wndId) { return funcDict.selectWnd(tab); }
    }] as [
      (this: MarksNS.FocusOrLaunch, tabs: Tab[]) => void,
      (this: MarksNS.FocusOrLaunch, tabs: [Tab] | never[]) => void,
      (this: MarksNS.FocusOrLaunch, tabs: Tab[], wnd: Window) => void
    ],
    toggleMuteTab: [function(tabs) {
      const tab = tabs[0];
      chrome.tabs.update(tab.id, { muted: !tab.mutedInfo.muted });
    }, function(tabs) {
      let curId = cOptions.other ? cPort.sender.tabId : -1
        , muted = false, action = { muted: true };
      for (let i = tabs.length; 0 <= --i; ) {
        const tab = tabs[i];
        if (tab.id === curId) { continue; }
        if (!tab.mutedInfo.muted) {
          muted = true;
          chrome.tabs.update(tab.id, action);
        }
      }
      if (muted) { return; }
      action.muted = false;
      for (let i = tabs.length; 0 <= --i; ) {
        const j = tabs[i].id;
        if (j === curId) { continue; }
        chrome.tabs.update(j, action);
      }
    }] as [
      (this: void, tabs: [Tab]) => void,
      (this: void, tabs: Tab[]) => void
    ]
  },
  BackgroundCommands = {
    createTab (this: void): void {},
    duplicateTab (): void {
      const tabId = cPort.sender.tabId;
      if (tabId < 0) {
        return funcDict.complain("duplicate such a tab");
      }
      chrome.tabs.duplicate(tabId);
      if (1 > --commandCount) {}
      else if (Settings.CONST.ChromeVersion >= 52) {
        chrome.tabs.get(tabId, funcDict.duplicateTab[2]);
      } else {
        chrome.windows.getCurrent({populate: true}, funcDict.duplicateTab[0].bind(null, tabId));
      }
    },
    moveTabToNewWindow (): void {
      chrome.windows.getCurrent({populate: true}, funcDict.moveTabToNewWindow[0]);
    },
    moveTabToNextWindow (this: void, tabs: [Tab]): void {
      chrome.windows.getAll(funcDict.moveTabToNextWindow[0].bind(null, tabs[0]));
    },
    moveTabToIncognito (): void {
      if (cPort && Settings.CONST.ChromeVersion >= 52 && cPort.sender.incognito) {
        return funcDict.moveTabToIncognito[3]();
      }
      chrome.windows.getCurrent({populate: true}, funcDict.moveTabToIncognito[0]);
    },
    enableCSTemp (this: void, tabs: [Tab]): void {
      return ContentSettings.ensure(cOptions.type, tabs[0]);
    },
    toggleCS (this: void, tabs: [Tab]): void {
      return ContentSettings.toggleCurrent(cOptions.type, tabs[0]);
    },
    clearCS (this: void, tabs: [Tab]): void {
      requestHandlers.ShowHUD(cOptions.type + " content settings have been cleared.");
      return ContentSettings.clear(cOptions.type, tabs[0]);
    },
    goTab (this: void, tabs: Tab[]): void {
      if (tabs.length < 2) { return; }
      let count = (cOptions.dir || 1) * commandCount, len = tabs.length, toSelect: Tab;
      count = cOptions.absolute
        ? count > 0 ? Math.min(len, count) - 1 : Math.max(0, len + count)
        : commandCount > tabs.length * 2 ? (count > 0 ? -1 : 0)
        : funcDict.selectFrom(tabs).index + count;
      toSelect = tabs[(count >= 0 ? 0 : len) + (count % len)];
      if (!toSelect.active) { return funcDict.selectTab(toSelect.id); }
    },
    removeTab (this: void, tabs: Tab[]): void {
      if (!tabs || tabs.length <= 0) { return chrome.runtime.lastError; }
      const startTabIndex = tabs.length - commandCount;
      let tab = tabs[0];
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
      const i = tab.index--;
      funcDict.removeTabsRelative(tab, commandCount, tabs);
      if (startTabIndex < 0) { return; }
      if (startTabIndex >= i || i > 0 && tabs[i - 1].pinned && !tab.pinned) { return; }
      ++tab.index;
      return funcDict.removeTabsRelative(tab, startTabIndex - i, tabs);
    },
    removeTabsR (this: void, tabs: Tab[]): void {
      let dir = cOptions.dir | 0;
      dir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
      return funcDict.removeTabsRelative(funcDict.selectFrom(tabs), dir * commandCount, tabs);
    },
    removeRightTab (this: void, tabs: Tab[]): void {
      if (!tabs || commandCount > tabs.length - 1) { return; }
      const ind = funcDict.selectFrom(tabs).index + commandCount;
      chrome.tabs.remove(tabs[ind >= tabs.length ? tabs.length - 1 - commandCount : ind].id);
    },
    restoreTab (this: void): void {
      let count = commandCount;
      if (count === 1 && cPort.sender.incognito) {
        return requestHandlers.ShowHUD("Can not restore a tab in incognito mode!");
      }
      const limit = chrome.sessions.MAX_SESSION_RESULTS | 0;
      limit > 0 && limit < count && (count = limit);
      while (--count >= 0) {
        chrome.sessions.restore(null, funcDict.onRuntimeError);
      }
    },
    restoreGivenTab (): void {
      if (commandCount > (chrome.sessions.MAX_SESSION_RESULTS || 25)) {
        return funcDict.restoreGivenTab([]);
      }
      chrome.sessions.getRecentlyClosed(funcDict.restoreGivenTab);
    },
    blank (this: void): void {},
    openCopiedUrlInCurrentTab (this: void): void {
      return BackgroundCommands.openCopiedUrlInNewTab([]);
    },
    openCopiedUrlInNewTab (this: void, tabs: [Tab] | never[]): void {
      Utils.lastUrlType = Urls.Type.Default as Urls.Type;
      let url = requestHandlers.getCopiedUrl_f(cOptions);
      if (Utils.lastUrlType === Urls.Type.Functional) {
        return funcDict.onEvalUrl(url as Urls.SpecialUrl);
      } else if (!url) {
        return requestHandlers.ShowHUD("No text copied!");
      } else if (tabs.length > 0) {
        return openMultiTab(url as string, commandCount, tabs[0]);
      } else {
        funcDict.safeUpdate(url as string);
      }
    },
    openUrl (this: void, tabs?: [Tab] | never[] | null): void {
      let url: string | undefined;
      if (cOptions.urls) {
        return tabs && tabs.length > 0 ? funcDict.openUrls(tabs as [Tab]) : void funcDict.getCurTab(funcDict.openUrls);
      }
      if (cOptions.url_mask) {
        if (tabs == null) {
          return chrome.runtime.lastError || void funcDict.getCurTab(BackgroundCommands.openUrl);
        }
        if (tabs.length > 0) {
          url = (cOptions.url_f as string | undefined || cOptions.url as string) || "";
          url = url.replace(cOptions.url_mask, tabs[0].url);
        }
      }
      url = cOptions.url_f ? url || cOptions.url_f as string : Utils.convertToUrl(url || cOptions.url || "");
      if (cOptions.id_marker) {
        url = url.replace(cOptions.id_marker, chrome.runtime.id);
      }
      const reuse: ReuseType = cOptions.reuse == null ? ReuseType.newFg : (cOptions.reuse | 0);
      if (reuse === ReuseType.reuse) {
        requestHandlers.focusOrLaunch({ url });
        return;
      } else if (reuse === ReuseType.current) {
        if (funcDict.openShowPage[0](url, reuse)) { return; }
        funcDict.safeUpdate(url);
      } else if (tabs) {
        return funcDict.openUrlInNewTab.call(url, reuse, tabs);
      } else {
        funcDict.getCurTab(funcDict.openUrlInNewTab.bind(url, reuse));
      }
    },
    searchInAnother (this: void, tabs: [Tab]): void {
      let keyword = cOptions.keyword as string || "";
      const query = requestHandlers.parseSearchUrl(tabs[0]);
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
    togglePinTab (this: void, tabs: Tab[]): void {
      const tab = funcDict.selectFrom(tabs);
      let i = tab.index;
      const len = Math.min(tabs.length, i + commandCount), action = {pinned: true};
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
    toggleMuteTab (): void {
      if (Settings.CONST.ChromeVersion < 45) {
        return requestHandlers.ShowHUD("Vimium++ can not control mute state before Chrome 45");
      }
      if (cOptions.all || cOptions.other) {
        chrome.tabs.query({audible: true}, funcDict.toggleMuteTab[1]);
        return;
      }
      funcDict.getCurTab(funcDict.toggleMuteTab[0]);
    },
    reloadTab (this: void, tabs: Tab[] | never[]): void {
      if (tabs.length <= 0) {
        chrome.windows.getCurrent({populate: true}, function(wnd) {
          if (!wnd) { return chrome.runtime.lastError; }
          wnd.tabs.length > 0 && BackgroundCommands.reloadTab(wnd.tabs);
        });
        return;
      }
      let reloadProperties = { bypassCache: cOptions.bypassCache === true }
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
    reloadGivenTab (): void {
      if (commandCount === 1) {
        chrome.tabs.reload();
        return;
      }
      funcDict.getCurTabs(BackgroundCommands.reloadTab);
    },
    reopenTab (this: void, tabs: [Tab] | never[]): void {
      if (tabs.length <= 0) { return; }
      const tab = tabs[0];
      ++tab.index;
      if (Settings.CONST.ChromeVersion >= 52 || !Utils.isRefusingIncognito(tab.url)) {
        return funcDict.reopenTab(tab);
      }
      chrome.windows.get(tab.windowId, function(wnd): void {
        if (!wnd.incognito) { return funcDict.reopenTab(tab); }
      });
    },
    goToRoot (this: void, tabs: [Tab]): void {
      const url = tabs[0].url, result = requestHandlers.parseUpperUrl({
        trailing_slash: cOptions.trailing_slash,
        url, upper: commandCount - 1
      });
      if (result.path != null) {
        chrome.tabs.update({url: result.url});
        return;
      }
      return requestHandlers.ShowHUD(result.url);
    },
    moveTab (this: void, tabs: Tab[]): void {
      const tab = funcDict.selectFrom(tabs), dir = cOptions.dir > 0 ? 1 : -1, pinned = tab.pinned;
      let index = Math.max(0, Math.min(tabs.length - 1, tab.index + dir * commandCount));
      while (pinned !== tabs[index].pinned) { index -= dir; }
      if (index != tab.index) {
        chrome.tabs.move(tab.id, { index });
      }
    },
    nextFrame: function (this: void, count?: number): void {
      let port = cPort, ind = -1;
      const frames = framesForTab[port.sender.tabId];
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
    mainFrame (): void {
      const port = Settings.indexFrame(TabRecency.last(), 0);
      if (!port) { return; }
      port.postMessage({
        name: "focusFrame",
        frameId: 0
      });
    },
    parentFrame (): void {
      let frames: Frames.Frames | undefined, sender: Frames.Sender | undefined, msg: string | null;
      msg = NoFrameId ? "Vimium++ can not know parent frame before Chrome 41"
        : !chrome.webNavigation ? "Vimium++ is not permitted to access frames"
        : !((frames = framesForTab[cPort.sender.tabId]) && (sender = frames[0].sender) && sender.tabId > 0)
          ? "Vimium++ can not access frames in current tab"
        : !sender.frameId ? "This page is just the top frame"
        : null;
      if (msg) {
        return requestHandlers.ShowHUD(msg);
      }
      chrome.webNavigation.getAllFrames({
        tabId: (sender as Frames.Sender).tabId
      }, funcDict.focusParentFrame.bind(sender as Frames.Sender));
    },
    visitPreviousTab (this: void, tabs: Tab[]): void {
      if (tabs.length < 2) { return; }
      tabs.splice(funcDict.selectFrom(tabs).index, 1);
      tabs.sort(TabRecency.rCompare);
      const tabId = tabs[Math.min(commandCount, tabs.length) - 1].id;
      return funcDict.selectTab(tabId);
    },
    copyTabInfo (this: void, tabs: [Tab]): void {
      let str: string;
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
    goNext (): void {
      let dir: string = cOptions.dir + "" || "next", patterns: CmdOptions["goNext"]["patterns"] = cOptions.patterns;
      if (typeof patterns === "string") {
        patterns = patterns.trim() || Settings.get(dir === "prev" ? "previousPatterns" : "nextPatterns", true).trim();
        patterns = patterns.toLowerCase();
      }
      cPort.postMessage<1, "goNext">({ name: "execute", count: 1, command: "goNext",
        options: {
          dir,
          patterns
        }
      });
    },
    enterInsertMode (): void {
      const hideHud = cOptions.hideHud;
      cPort.postMessage({ name: "execute", count: 1, command: "enterInsertMode",
        options: {
          code: cOptions.code | 0, stat: cOptions.stat | 0,
          hideHud: hideHud != null ? hideHud : Settings.get("hideHud", true)
        }
      });
    },
    performFind (): void {
      const query = cOptions.active ? null : (FindModeHistory.query as FindModeQuery)(cPort.sender.incognito);
      cPort.postMessage({ name: "execute", count: 1, command: "performFind", options: {
        count: commandCount,
        dir: cOptions.dir,
        query
      }});
    },
    showVomnibar (this: void): void {
      let port = cPort as Port | null;
      if (!port) {
        port = Settings.indexFrame(TabRecency.last(), 0);
        if (!port) { return; }
      } else if (port.sender.frameId !== 0 && port.sender.tabId >= 0) {
        port = Settings.indexFrame(port.sender.tabId, 0) || port;
      }
      const options = Utils.extendIf(Object.setPrototypeOf({
        vomnibar: Settings.CONST.VomnibarPage,
        secret: getSecret(),
      } as Dict<any>, null), cOptions);
      port.postMessage({
        name: "execute", count: commandCount,
        command: "Vomnibar.activate",
        options
      });
      options.secret = -1;
      cOptions = options;
    },
    clearFindHistory (this: void): void {
      const incognito = cPort.sender.incognito;
      FindModeHistory.removeAll(incognito);
      return requestHandlers.ShowHUD((incognito ? "incognito " : "") + "find history has been cleared.");
    },
    toggleViewSource (this: void, tabs: [Tab]): void {
      let url = tabs[0].url;
      if (url.startsWith("chrome-")) {
        return funcDict.complain("visit HTML of an extension's page");
      }
      url = url.startsWith("view-source:") ? url.substring(12) : ("view-source:" + url);
      return openMultiTab(url, 1, tabs[0]);
    },
    clearGlobalMarks (this: void): void { return Marks.clearGlobal(); }
  },
  numHeadRe = <RegExpOne>/^\d+/,
  executeCommand = function(command: string, registryEntry: CommandsNS.Item
      , count: number, port: Port): void {
    const options = registryEntry.options;
    let scale: number;
    if (options && (scale = +options.count)) { count = Math.max(1, (count * scale) | 0); }
    if (count === 1) {}
    else if (registryEntry.repeat === 1) {
      count = 1;
    } else if (registryEntry.repeat > 0 && count > registryEntry.repeat && !
      confirm(`You have asked Vimium++ to perform ${count} repeats of the command:
        ${(CommandsData.availableCommands[command] as
           CommandsNS.Description)[0]}\n\nAre you sure you want to continue?`)
    ) {
      return;
    }
    command = registryEntry.alias || command;
    if (!registryEntry.background) {
      port.postMessage({ name: "execute", command, count, options });
      return;
    }
    const func: BgCmd = BackgroundCommands[command as keyof typeof BackgroundCommands];
    cOptions = options || Object.create(null);
    cPort = port;
    commandCount = count;
    count = <UseTab>func.useTab;
    if (count < UseTab.ActiveTab) {
      return (func as BgCmdNoTab)();
    } else if (count === UseTab.ActiveTab) {
      funcDict.getCurTab(func as BgCmdActiveTab);
    } else {
      funcDict.getCurTabs(func as BgCmdNoTab);
    }
  },
  /**
   * type: {
   *  <K in keyof FgRes>(this: void, request: FgReq[K], port: Port): FgRes[K];
   *  <K in keyof FgReq>(this: void, request: FgReq[K], port: Port): void;
   *  [ /^A-Z/ ]: (this: void, ...args: any[]) => void;
   * }
   */
  requestHandlers = {
    setSetting (this: void, request: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>, port: Port): void {
      const key = request.key;
      if (!(key in Settings.frontUpdateAllowed)) {
        cPort = port;
        return funcDict.complain(`modify ${key} setting`);
      }
      Settings.set(key, request.value);
      if (key in Settings.bufferToLoad) {
        type CacheValue = SettingsNS.FullCache[keyof SettingsNS.FrontUpdateAllowedSettings];
        (Settings.bufferToLoad as SafeDict<CacheValue>)[key] = Settings.cache[key];
      }
    },
    findQuery (this: void, request: FgReq["findQuery"], port: Port): FgRes["findQuery"] | void {
      return FindModeHistory.query(port.sender.incognito, request.query, request.index);
    },
    parseSearchUrl (this: void, request: FgReq["parseSearchUrl"]): FgRes["parseSearchUrl"] {
      let s0 = request.url, url = s0.toLowerCase(), pattern: Search.Rule | undefined
        , arr: string[] | null = null, _i: number, str: string, selectLast = false;
      if (!Utils.protocolRe.test(Utils.removeComposedScheme(url))) {
        return null;
      }
      if (_i = (request.upper | 0)) {
        const obj = requestHandlers.parseUpperUrl({ url: s0, upper: _i, trailing_slash: request.trailing_slash });
        if (obj.path != null) {
          s0 = obj.url;
        }
        return { keyword: '', start: 0, url: s0 };
      }
      const decoders = Settings.cache.searchEngineRules;
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
      if (!arr || !pattern) { return null; }
      if (arr.length > 1 && !pattern[1].global) { arr.shift(); }
      const re = pattern[3];
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
        url,
        start: selectLast ? url.lastIndexOf(" ") + 1 : 0
      };
    },
    parseUpperUrl (this: void, request: FgReq["parseUpperUrl"]): FgRes["parseUpperUrl"] {
      let url = request.url;
      if (!Utils.protocolRe.test(Utils.removeComposedScheme(url.toLowerCase()))) {
        return { url: "This url has no upper paths", path: null };
      }
      let hash = "", str: string, arr: RegExpExecArray | null, startSlash = false, endSlash = false
        , path: string | null = null, i: number, start = 0, end = 0, decoded = false, arr2: RegExpExecArray | null;
      if (i = url.lastIndexOf("#") + 1) {
        hash = url.substring(i + +(url[i] === "!"));
        str = Utils.DecodeURLPart(hash);
        i = str.lastIndexOf("/");
        if (i > 0 || (i === 0 && str.length > 1)) {
          decoded = str !== hash;
          const argRe = <RegExpOne> /([^&=]+=)([^&\/=]*\/[^&]*)/;
          arr = argRe.exec(str) || (<RegExpOne> /(^|&)([^&\/=]*\/[^&=]*)(?:&|$)/).exec(str);
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
      if (!i) {
        path = "/";
      } else {
        const arr3 = path.substring(+startSlash, (path.length - +path.endsWith("/")) || +startSlash).split("/");
        i < 0 && (i += arr3.length);
        if (i <= 0) {
          path = "/";
        } else if (i > 0 && i < arr3.length) {
          arr3.length = i;
          path = arr3.join("/");
          path = (startSlash ? "/" : "") + path + (endSlash ? "/" : "");
        }
      }
      str = decoded ? encodeURIComponent(path) : path;
      url = url.substring(0, start) + (end ? str + url.substring(end) : str);
      return { url, path };
    },
    searchAs (this: void, request: FgReq["searchAs"]): FgRes["searchAs"] {
      let search = requestHandlers.parseSearchUrl(request), query;
      if (!search || !search.keyword) { return "No search engine found!"; }
      if (!(query = request.search)) {
        query = Clipboard.paste().replace(Utils.spacesRe, ' ').trim();
        if (!query) { return "No selected or copied text found!"; }
      }
      query = Utils.createSearchUrl(query.split(" "), search.keyword);
      funcDict.safeUpdate(query);
      return "";
    },
    gotoSession: function (this: void, request: FgReq["gotoSession"], port?: Port): void {
      const id = request.sessionId, active = request.active !== false;
      if (typeof id === "number") {
        return funcDict.selectTab(id, true);
      }
      chrome.sessions.restore(id, funcDict.onRuntimeError);
      if (active) { return; }
      let tabId = (port as Port).sender.tabId;
      tabId >= 0 || (tabId = TabRecency.last());
      if (tabId >= 0) { return funcDict.selectTab(tabId); }
    } as BgReqHandlerNS.BgReqHandlers["gotoSession"],
    openUrl: function (this: void, request: FgReq["openUrl"] & { url_f?: Urls.Url}, port?: Port): void {
      Object.setPrototypeOf(request, null);
      request.url_f = Utils.convertToUrl(request.url, request.keyword || null, Urls.WorkType.ActAnyway);
      request.keyword = "";
      let ports;
      cPort = !port ? cPort : funcDict.checkVomnibarPage(port, true) ? port
        : (ports = framesForTab[port.sender.tabId]) ? ports[0] : cPort;
      if (Utils.lastUrlType === Urls.Type.Functional) {
        return funcDict.onEvalUrl(request.url_f as Urls.SpecialUrl);
      } else if (request.https && (Utils.lastUrlType === Urls.Type.NoSchema
          || Utils.lastUrlType === Urls.Type.NoProtocolName)) {
        request.url_f = "https" + (request.url_f as string).substring(4);
      }
      commandCount = 1;
      cOptions = request as FgReq["openUrl"] & { url_f: string, keyword: ""} & SafeObject;
      return BackgroundCommands.openUrl();
    } as BgReqHandlerNS.BgReqHandlers["openUrl"],
    frameFocused (this: void, _0: FgReq["frameFocused"], port: Port): void {
      let tabId = port.sender.tabId, ref = framesForTab[tabId], status: Frames.ValidStatus;
      if (!ref) {
        return needIcon ? requestHandlers.SetIcon(tabId, port.sender.status) : undefined;
      }
      if (port === ref[0]) { return; }
      if (needIcon && (status = port.sender.status) !== ref[0].sender.status) {
        ref[0] = port;
        return requestHandlers.SetIcon(tabId, status);
      }
      ref[0] = port;
    },
    checkIfEnabled: function (this: void, request: ExclusionsNS.Details | FgReq["checkIfEnabled"]
        , port?: Frames.Port | null): void {
      if (!(port && port.sender)) {
        port = Settings.indexFrame((request as ExclusionsNS.Details).tabId, (request as ExclusionsNS.Details).frameId);
      }
      if (!port) { return; }
      const oldUrl = port.sender.url, tabId = port.sender.tabId
        , pattern = Settings.getExcluded(port.sender.url = request.url)
        , status = pattern === null ? Frames.BaseStatus.enabled : pattern
            ? Frames.BaseStatus.partial : Frames.BaseStatus.disabled;
      if (port.sender.status !== status) {
        port.sender.status = status;
        if (needIcon && framesForTab[tabId] && (framesForTab[tabId] as Frames.Frames)[0] === port) {
          requestHandlers.SetIcon(tabId, status);
        }
      } else if (!pattern || pattern === Settings.getExcluded(oldUrl)) {
        return;
      }
      port.postMessage({ name: "reset", passKeys: pattern });
    } as BgReqHandlerNS.checkIfEnabled,
    nextFrame (this: void, _0: FgReq["nextFrame"], port: Port): void {
      cPort = port;
      return BackgroundCommands.nextFrame(1);
    },
    exitGrab (this: void, _0: FgReq["exitGrab"], port: Port): void {
      const ports = Settings.indexPorts(port.sender.tabId);
      if (!ports || ports.length < 3) { return; }
      for (let msg = { name: "exitGrab" as "exitGrab" }, i = ports.length; 1 <= --i; ) {
        ports[i] !== port && ports[i].postMessage(msg);
      }
    },
    refocusCurrent (this: void, request: FgReq["refocusCurrent"], port: Port): void {
      const ports = port.sender.tabId !== -1 ? framesForTab[port.sender.tabId] : undefined;
      if (ports) {
        ports[0].postMessage({
          name: "focusFrame",
          lastKey: request.lastKey,
          frameId: -2
        });
        return;
      }
      try { port.postMessage({ name: "returnFocus", lastKey: request.lastKey }); } catch (e) {}
    },
    initHelp (this: void, request: FgReq["initHelp"], port: Port): void {
      Promise.all([
        Utils.require<typeof HelpDialog>('HelpDialog'),
        request, port,
        new Promise<void>(function(resolve, reject) {
          const xhr = Settings.fetchFile("helpDialog", resolve);
          xhr instanceof XMLHttpRequest && (xhr.onerror = reject);
        })
      ]).then(function(args): void {
        args[2].postMessage({
          name: "showHelpDialog",
          html: args[0].render(args[1]),
          optionUrl: Settings.CONST.OptionsPage,
          advanced: Settings.get("showAdvancedCommands", true)
        });
      }, function(args): void {
        console.error("Promises for initHelp failed:", args[0], ';', args[3]);
      });
    },
    initInnerCSS (this: void): FgRes["initInnerCSS"] {
      return Settings.cache.innerCSS;
    },
    activateVomnibar (this: void, request: FgReq["activateVomnibar"], port: Port): void {
      cPort = port;
      if (((request as { count?: number }).count as number) > 0) {
        commandCount = (request as { count: number }).count;
        cOptions = Object.setPrototypeOf(request, null);
        cOptions.handler = "";
      } else if ((request as { redo?: boolean }).redo !== true || cOptions == null || cOptions.secret !== -1) {
        return;
      }
      return BackgroundCommands.showVomnibar();
    },
    omni (this: void, request: FgReq["omni"], port: Port): void {
      if (funcDict.checkVomnibarPage(port)) { return; }
      return Completers.filter(request.query, request, funcDict.PostCompletions.bind(port));
    },
    getCopiedUrl_f: function (this: void, request: FgReq["getCopiedUrl_f"], port?: Port): Urls.Url {
      let url: Urls.Url = Clipboard.paste().trim(), arr: RegExpMatchArray | null;
      if (!url) {}
      else if (arr = url.match(Utils.filePathRe)) {
        url = arr[1];
      } else if (port) {
        url = Utils.convertToUrl(url, request.keyword || null, Urls.WorkType.Default);
        if (url.substring(0, 11).toLowerCase() !== "javascript:") {
          cOptions = Object.setPrototypeOf({ url_f: url }, null);
          commandCount = 1; url = "";
          BackgroundCommands.openUrl();
        }
      } else {
        url = Utils.convertToUrl(url, request.keyword || null, Urls.WorkType.ActAnyway);
      }
      return url;
    } as {
      (this: void, request: FgReq["getCopiedUrl_f"], port: Port): FgRes["getCopiedUrl_f"];
      (this: void, request: FgReq["getCopiedUrl_f"]): Urls.Url;
    },
    copyToClipboard (this: void, request: FgReq["copyToClipboard"]): FgRes["copyToClipboard"] {
      return Clipboard.copy(request.data);
    },
    key (this: void, request: FgReq["key"], port: Port): void {
      let key: string = request.key, count = 1;
      let arr: null | string[] = numHeadRe.exec(key);
      if (arr != null) {
        key = key.substring(arr[0].length);
        count = parseInt(arr[0], 10) || 1;
      }
      const ref = CommandsData.keyToCommandRegistry;
      if (!(key in ref)) {
        arr = key.match(Utils.keyRe) as string[];
        key = arr[arr.length - 1];
        count = 1;
      }
      const registryEntry = ref[key] as CommandsNS.Item;
      Utils.resetRe();
      executeCommand(registryEntry.command, registryEntry, count, port);
    },
    createMark (this: void, request: FgReq["createMark"], port: Port): void {
       return Marks.createMark(request, port);
    },
    gotoMark (this: void, request: FgReq["gotoMark"]): FgRes["gotoMark"] { return Marks.gotoMark(request); },
    focusOrLaunch (this: void, request: MarksNS.FocusOrLaunch): void {
      // * do not limit windowId or windowType
      const url = request.url.split("#", 1)[0];
      chrome.tabs.query({
        url: request.prefix ? url + "*" : url
      }, funcDict.focusOrLaunch[0].bind(request));
    },
    secret (this: void, _0: FgReq["secret"], port: Frames.Port): FgRes["secret"] {
      if (funcDict.checkVomnibarPage(port)) { return null; }
      return getSecret();
    },
    SetIcon: function(): void {} as (tabId: number, type: Frames.ValidStatus) => void,
    ShowHUD (message: string, isCopy?: boolean): void {
      try {
        cPort && cPort.postMessage({
          name: "showHUD",
          text: message,
          isCopy: isCopy === true
        });
      } catch (e) {
        cPort = null as never;
      }
    }
  },
  Connections = {
    state: 0,
    _fakeId: -2,
    OnMessage (this: void, request: Req.baseFg<string> | Req.baseFgWithRes<string>, port: Frames.Port): void {
      let id;
      if (id = (request as Req.baseFgWithRes<string>)._msgId) {
        request = (request as Req.baseFgWithRes<string>).request;
        port.postMessage<"findQuery">({
          _msgId: id,
          response: requestHandlers[(request as Req.baseFg<string>).handler as
            "findQuery"](request as Req.fg<"findQuery">, port) as FgRes["findQuery"]
        });
      } else {
        return requestHandlers[(request as Req.baseFg<string>).handler as "key"](request as Req.fg<"key">, port);
      }
    },
    OnConnect (this: void, port: Frames.Port): void {
      Connections.format(port);
      port.onMessage.addListener(Connections.OnMessage);
      let type = (port.name[9] as (string | number) as number) | 0, ref: Frames.Frames | undefined
        , tabId = port.sender.tabId;
      if (type === PortType.omnibar) {
        framesForOmni.push(port);
        if (tabId < 0) {
          port.sender.tabId = cPort ? cPort.sender.tabId : TabRecency.last();
        }
        port.onDisconnect.addListener(Connections.OnOmniDisconnect);
        return;
      }
      port.onDisconnect.addListener(Connections.OnDisconnect);
      const pass = Settings.getExcluded(port.sender.url), status = pass === null
          ? Frames.BaseStatus.enabled : pass ? Frames.BaseStatus.partial : Frames.BaseStatus.disabled;
      port.postMessage((type & PortType.initing) ? {
        name: "init",
        load: Settings.bufferToLoad,
        passKeys: pass,
        mapKeys: CommandsData.mapKeyRegistry,
        keyMap: CommandsData.keyMap
      } : {
        name: "reset",
        passKeys: pass
      });
      port.sender.status = status;
      if (ref = framesForTab[tabId]) {
        ref.push(port);
        if (type & PortType.hasFocus) {
          if (needIcon && ref[0].sender.status !== status) {
            requestHandlers.SetIcon(tabId, status);
          }
          ref[0] = port;
        }
      } else {
        framesForTab[tabId] = [port, port];
        status !== 0 && needIcon && requestHandlers.SetIcon(tabId, status);
      }
      if (NoFrameId) {
        (port.sender as any).frameId = (type & PortType.isTop) ? 0 : ((Math.random() * 9999997) | 0) + 2;
      }
    },
    OnDisconnect (this: void, port: Port): void {
      let i = port.sender.tabId, ref: Frames.Frames | undefined;
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
    OnOmniDisconnect (this: void, port: Port): void {
      const ref = framesForOmni, i = ref.lastIndexOf(port);
      if (i === ref.length - 1) {
        --ref.length;
      } else if (i >= 0) {
        ref.splice(i, 1);
      }
    },
    format (port: Frames.RawPort): void {
      const sender = port.sender, tab = sender.tab || {
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

  let cOptions: CommandsNS.Options, cPort: Frames.Port, commandCount: number, needIcon = false,
  getSecret = function(this: void): number {
    let secret = 0, time = 0;
    getSecret = function(this: void): number {
      const now = Date.now();
      if (now - time > 10000) {
        secret = 1 + (0 | (Math.random() * 0x6fffffff));
      }
      time = now;
      return secret;
    };
    return getSecret();
  };

  g_requestHandlers = requestHandlers;

  Settings.Init = function(): void {
    if (3 !== ++Connections.state) { return; }
    Settings.Init = null;
    Utils.resetRe();
    chrome.runtime.onConnect.addListener(Connections.OnConnect);
    chrome.runtime.onConnectExternal &&
    chrome.runtime.onConnectExternal.addListener(function(port): void {
      if (port.sender && (port.sender.id as string) in (Settings.extWhiteList as SafeDict<true>)
          && port.name.startsWith("vimium++")) {
        return Connections.OnConnect(port as Frames.RawPort as Frames.Port);
      }
    });
  };

  if (Settings.CONST.ChromeVersion >= 52) {
    funcDict.createTab = [funcDict.createTab[0]] as typeof funcDict.createTab;
  }
  Settings.updateHooks.newTabUrl_f = function(url) {
    let f: BgCmdNoTab, onlyNormal = Utils.isRefusingIncognito(url);
    BackgroundCommands.createTab = f = Settings.CONST.ChromeVersion < 52 && onlyNormal
    ? chrome.windows.getCurrent.bind(null, {populate: true}
        , funcDict.createTab[1].bind(url))
    : chrome.tabs.query.bind(null, {currentWindow: true, active: true}
        , funcDict.createTab[0].bind(url, onlyNormal));
    f.useTab = UseTab.NoTab;
  };

  Settings.updateHooks.showActionIcon = function (value) {
    needIcon = value && chrome.browserAction ? true : false;
  };

  Settings.globalCommand = function(this: void, command, options, count): void {
    count = Math.max(1, count | 0);
    options && typeof options === "object" ?
        Object.setPrototypeOf(options, null) : (options = null);
    return executeCommand(command, Utils.makeCommand(command, options), count, null as never as Port);
  };

  chrome.runtime.onMessageExternal && (
  chrome.runtime.onMessageExternal.addListener(function(this: void, message: any, sender, sendResponse): void {
    let command: string | undefined;
    if (!((sender.id as string) in (Settings.extWhiteList as SafeDict<true>))) {
      sendResponse(false);
      return;
    }
    if (typeof message === "string") {
      command = message;
      if (command && CommandsData.availableCommands[command]) {
        return Settings.globalCommand(command);
      }
      return;
    }
    if (typeof message !== "object") { return; }
    switch (message.handler) {
    case "command":
      command = message.command;
      if (!(command && CommandsData.availableCommands[command])) { return; }
      return Settings.globalCommand(command, message.options, message.count);
    case "content_scripts":
      sendResponse(Settings.CONST.ContentScripts);
      return;
    }
  }), Settings.postUpdate("extWhiteList"));

  chrome.tabs.onReplaced &&
  chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    const ref = framesForTab, frames = ref[removedTabId];
    if (!frames) { return; }
    delete ref[removedTabId];
    ref[addedTabId] = frames;
    for (let i = frames.length; 0 < --i; ) {
      frames[i].sender.tabId = addedTabId;
    }
  });

  Settings.indexFrame = function(tabId, frameId): Port | null {
    const ref = framesForTab[tabId];
    if (!ref) { return null; }
    for (let i = 1, len = ref.length; i < len; i++) {
      if (ref[i].sender.frameId === frameId) {
        return ref[i];
      }
    }
    return null;
  };

  Settings.indexPorts = function(tabId?: number): Frames.Frames | Frames.FramesMap | undefined {
    return tabId ? framesForTab[tabId] : framesForTab;
  } as typeof Settings.indexPorts;

  setTimeout(function(): void {
    Settings.postUpdate("bufferToLoad" as string as "searchEngines", null);
    Settings.get("userDefinedOuterCss", true);
    return (Settings.Init as (this: void) => void)();
  }, 0);

  (function(): void {
    type Keys = keyof typeof BackgroundCommands;
    let ref: Keys[], i: number, ref2 = BackgroundCommands, key: Keys;
    for (key in ref2) { (ref2[key] as BgCmd).useTab = UseTab.NoTab; }

    ref = ["goTab", "moveTab", "reloadGivenTab", "reloadTab", "removeRightTab" //
      , "removeTab", "removeTabsR", "togglePinTab", "visitPreviousTab" //
    ];
    for (i = ref.length; 0 <= --i; ) { (ref2[ref[i]] as BgCmdCurWndTabs).useTab = UseTab.CurWndTabs; }
    ref = ["clearCS", "copyTabInfo", "enableCSTemp", "goToRoot", "moveTabToNextWindow"//
      , "openCopiedUrlInNewTab", "reopenTab", "toggleCS", "toggleViewSource" //
      , "searchInAnother" //
    ];
    for (i = ref.length; 0 <= --i; ) { (ref2[ref[i]] as BgCmdActiveTab).useTab = UseTab.ActiveTab; }
  })();

  setTimeout(function(): void {
    Settings.fetchFile("baseCSS");
    Settings.postUpdate("searchUrl", null); // will also update newTabUrl

    let arr: CSTypes[] = ["images", "plugins", "javascript", "cookies"], i: number;
    for (i = arr.length; 0 < i--; ) {
      localStorage.getItem(ContentSettings.makeKey(arr[i])) != null &&
      setTimeout(ContentSettings.clear, 100, arr[i]);
    }

    (document.documentElement as HTMLHtmlElement).textContent = '';
    (document.firstChild as DocumentType).remove();
    Utils.resetRe();
  }, 34);

  // will run only on <F5>, not on runtime.reload
  window.onunload = function() {
    let ref = framesForTab as Frames.FramesMapToDestroy, tabId: string;
    ref.omni = framesForOmni;
    for (tabId in ref) {
      for (const port of ref[tabId]) {
        port.disconnect();
      }
    }
  };
})();
