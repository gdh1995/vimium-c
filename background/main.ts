var Backend: BackendHandlersNS.BackendHandlers;
(function() {
  type Tab = chrome.tabs.Tab;
  type Window = chrome.windows.Window;
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
  interface InfoToCreateMultiTab {
    url: string;
    active: boolean;
    windowId?: number;
    index?: number;
    openerTabId?: number;
    pinned?: boolean;
  }
  const enum UseTab { NoTab = 0, ActiveTab = 1, CurWndTabs = 2 }
  type BgCmdNoTab = (this: void, _fakeArg?: undefined) => void;
  type BgCmdActiveTab = (this: void, tabs1: [Tab] | never[]) => void;
  type BgCmdActiveTabOrNoTab = (this: void, tabs1?: [Tab] | never[]) => void;
  type BgCmdCurWndTabs = (this: void, tabs1: Tab[]) => void;
  interface BgCmdInfoNS {
    [kBgCmd.createTab]: UseTab.ActiveTab | UseTab.NoTab;
    [kBgCmd.openUrl]: UseTab.ActiveTab | UseTab.NoTab;

    [kBgCmd.goTab]: UseTab.CurWndTabs;
    [kBgCmd.removeTab]: UseTab.CurWndTabs;
    [kBgCmd.removeTabsR]: UseTab.CurWndTabs;
    [kBgCmd.removeRightTab]: UseTab.CurWndTabs;
    [kBgCmd.togglePinTab]: UseTab.CurWndTabs;
    [kBgCmd.reloadTab]: UseTab.CurWndTabs;
    [kBgCmd.moveTab]: UseTab.CurWndTabs;
    [kBgCmd.visitPreviousTab]: UseTab.CurWndTabs;

    [kBgCmd.moveTabToNextWindow]: UseTab.ActiveTab;
    [kBgCmd.toggleCS]: UseTab.ActiveTab;
    [kBgCmd.searchInAnother]: UseTab.ActiveTab;
    [kBgCmd.reopenTab]: UseTab.ActiveTab;
    [kBgCmd.goToRoot]: UseTab.ActiveTab;
    [kBgCmd.copyTabInfo]: UseTab.ActiveTab;
    [kBgCmd.toggleViewSource]: UseTab.ActiveTab;
  }

  interface ReopenOptions extends chrome.tabs.CreateProperties {
    id: number;
    url: string;
  }
  interface OpenUrlOptions {
    incognito?: boolean;
    position?: "start" | "end" | "before" | "after";
    opener?: boolean;
    window?: boolean;
  }
  const enum RefreshTabStep {
    start = 0,
    s1, s2, s3, s4,
    end,
  }
  interface SpecialHandlers {
    [kFgReq.setSetting]: (this: void, request: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>, port: Port) => void;
    [kFgReq.gotoSession]: BackendHandlersNS.BackendHandlers["gotoSession_"];
    [kFgReq.checkIfEnabled]: BackendHandlersNS.checkIfEnabled;
    [kFgReq.parseUpperUrl]: {
      (this: void, request: FgReqWithRes[kFgReq.parseUpperUrl] & { execute: true }, port: Port): void;
      (this: void, request: FgReqWithRes[kFgReq.parseUpperUrl], port?: Port): FgRes[kFgReq.parseUpperUrl];
    };
    [kFgReq.focusOrLaunch]: (this: void, request: MarksNS.FocusOrLaunch, _port?: Port | null, notFolder?: true) => void;
  }

  /** any change to `commandCount` should ensure it won't be `0` */
  let cOptions: CommandsNS.Options = null as never, cPort: Frames.Port = null as never, commandCount: number = 1,
  _fakeTabId: number = GlobalConsts.MaxImpossibleTabId,
  needIcon = false, cKey: VKeyCodes = VKeyCodes.None, gCmdTimer = 0, gTabIdOfExtWithVomnibar: number = GlobalConsts.TabIdNone;

  function tabsCreate(args: chrome.tabs.CreateProperties, callback?: ((this: void, tab: Tab) => void) | null): 1 {
    let { url } = args, type: Urls.NewTabType | undefined;
    if (!url) {
      delete args.url;
    } else if (!(type = Settings.newTabs[url])) {}
    else if (type === Urls.NewTabType.browser) {
      delete args.url;
    } else if (type === Urls.NewTabType.vimium) {
      args.url = Settings.cache.newTabUrl_f;
    }
    IsEdge && (delete args.openerTabId);
    return chrome.tabs.create(args, callback);
  }
  /** if count <= 1, only open once */
  function openMultiTab(this: void, option: InfoToCreateMultiTab, count: number): void {
    const wndId = option.windowId, hasIndex = option.index != null;
    tabsCreate(option, option.active ? function(tab) {
      wndId != null && tab.windowId !== wndId && selectWnd(tab);
    } : null);
    if (count < 2) { return; }
    option.active = false;
    do {
      hasIndex && ++(option as {index: number}).index;
      chrome.tabs.create(option);
    } while(--count > 1);
  }

  const framesForTab: Frames.FramesMap = Object.create<Frames.Frames>(null),
  NoFrameId = Settings.CONST.ChromeVersion < BrowserVer.MinWithFrameId;
    function isExtIdAllowed (this: void, extId: string | null | undefined): boolean {
      if (extId == null) { extId = "unknown sender"; }
      const stat = Settings.extWhiteList_[extId];
      if (stat != null) { return stat; }
      console.log("%cReceive message from an extension/sender not in the white list: %c%s",
        "background-color: #fffbe5", "background-color:#fffbe5; color: red", extId);
      return Settings.extWhiteList_[extId] = false;
    }
    function selectFrom (this: void, tabs: Tab[]): ActiveTab {
      for (let i = tabs.length; 0 < --i; ) {
        if (tabs[i].active) {
          return tabs[i] as ActiveTab;
        }
      }
      return tabs[0] as ActiveTab;
    }
    function newTabIndex (this: void, tab: Readonly<Tab>, pos: OpenUrlOptions["position"]): number | undefined {
      return pos === "before" ? tab.index : pos === "start" ? 0
        : pos !== "end" ? tab.index + 1 : undefined;
    }
    function makeWindow (this: void, option: chrome.windows.CreateData, state?: chrome.windows.ValidStates | ""
        , callback?: ((wnd: Window) => void) | null): void {
      if (option.focused === false) {
        state !== "minimized" && (state = "normal");
      } else if (state === "minimized") {
        state = "normal";
      }
      if (state && Settings.CONST.ChromeVersion >= BrowserVer.MinCreateWndWithState) {
        option.state = state;
        state = "";
      }
      const focused = option.focused !== false;
      option.focused = true;
      chrome.windows.create(option, state || !focused ? function(wnd: Window) {
        callback && callback(wnd);
        if (!wnd) { return; } // do not return lastError: just throw errors for easier debugging
        const opt: chrome.windows.UpdateInfo = focused ? {} : { focused: false };
        state && (opt.state = state);
        chrome.windows.update(wnd.id, opt);
      } : callback || null);
    }
    function makeTempWindow (this: void, tabIdUrl: number | string, incognito: boolean, callback: (wnd: Window) => void): void {
      const isId = typeof tabIdUrl === "number", option: chrome.windows.CreateData = {
        type: "normal",
        focused: false,
        incognito,
        state: "minimized",
        tabId: isId ? tabIdUrl as number : undefined,
        url: isId ? undefined : tabIdUrl as string
      };
      if (Settings.CONST.ChromeVersion < BrowserVer.MinCreateWndWithState) {
        option.state = undefined;
        option.left = option.top = 0; option.width = option.height = 50;
      }
      chrome.windows.create(option, callback);
    }
    function onRuntimeError (this: void): void {
      return chrome.runtime.lastError;
    }
    function safeUpdate (this: void, url: string, secondTimes?: true, tabs1?: [Tab]): void {
      if (!tabs1) {
        if (Utils.isRefusingIncognito_(url) && secondTimes !== true) {
          getCurTab(function(tabs1: [Tab]): void {
            return safeUpdate(url, true, tabs1);
          });
          return;
        }
      } else if (tabs1.length > 0 && tabs1[0].incognito && Utils.isRefusingIncognito_(url)) {
        tabsCreate({ url });
        Utils.resetRe_();
        return;
      }
      const arg = { url }, cb = onRuntimeError;
      if (tabs1) {
        chrome.tabs.update(tabs1[0].id, arg, cb);
      } else {
        chrome.tabs.update(arg, cb);
      }
      Utils.resetRe_();
    }
    function onEvalUrl (this: void, arr: Urls.SpecialUrl): void {
      if (arr instanceof Promise) { arr.then(onEvalUrl); return; }
      Utils.resetRe_();
      switch(arr[1]) {
      case "copy":
        return Backend.showHUD_((arr as Urls.CopyEvalResult)[0], true);
      case "status":
        return Backend.forceStatus((arr as Urls.StatusEvalResult)[0]);
      }
    }
    function complainNoSession (this: void): void {
      return Settings.CONST.ChromeVersion >= BrowserVer.MinSession ? Backend.complain_("control tab sessions")
        : Backend.showHUD_(`Vimium C can not control tab sessions before Chrome ${BrowserVer.MinSession}`);
    }
    const isNotVomnibarPage = IsEdge ? function() { return false; } : function (this: void, port: Frames.Port, nolog?: boolean): boolean {
      interface SenderEx extends Frames.Sender { isVomnibar?: boolean; warned?: boolean; }
      const info = port.sender as SenderEx;
      if (info.isVomnibar == null) {
        info.isVomnibar = info.url === Settings.cache.vomnibarPage_f || info.url === Settings.CONST.VomnibarPageInner_;
      }
      if (info.isVomnibar) { return false; }
      if (!nolog && !info.warned) {
        console.warn("Receive a request from %can unsafe source page%c (should be vomnibar) :\n %s @ tab %o",
          "color:red", "color:auto", info.url, info.tabId);
        info.warned = true;
      }
      return true;
    } as {
      /** `true` means `port` is NOT vomnibar port */
      (this: void, port: Port, nolog: true): boolean;
      (this: void, port: Frames.Port, nolog?: false): boolean;
    };
    function PostCompletions (this: Port, favIcon0: 0 | 1 | 2, list: Readonly<Suggestion>[]
        , autoSelect: boolean, matchType: CompletersNS.MatchType, total: number): void {
      let { url } = this.sender, favIcon = favIcon0 === 2 ? 2 : 0 as 0 | 1 | 2;
      if (favIcon0 == 1 && Settings.CONST.ChromeVersion >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon) {
        url = url.substring(0, url.indexOf("/", url.indexOf("://") + 3) + 1);
        const map = framesForTab;
        let frame1 = gTabIdOfExtWithVomnibar >= 0 ? indexFrame(gTabIdOfExtWithVomnibar, 0) : null;
        if (frame1 != null) {
          if (frame1.sender.url.startsWith(url)) {
            favIcon = 1;
          } else {
            gTabIdOfExtWithVomnibar = GlobalConsts.TabIdNone;
          }
        }
        if (!favIcon)
        for (const tabId in map) {
          let frames = map[+tabId] as Frames.Frames;
          for (let i = 1, len = frames.length; i < len; i++) {
            let { sender } = frames[i];
            if (sender.frameId === 0) {
              if (sender.url.startsWith(url)) {
                favIcon = 1;
                gTabIdOfExtWithVomnibar = +tabId;
              }
              break;
            }
          }
          if (favIcon) { break; }
        }
      }
      Utils.resetRe_();
      try {
      this.postMessage({ name: kBgReq.omni_omni, autoSelect, matchType, list, favIcon, total });
      } catch (e) {}
    }
    function indexFrame (this: void, tabId: number, frameId: number): Port | null {
      const ref = framesForTab[tabId];
      if (!ref) { return null; }
      for (let i = 1, len = ref.length; i < len; i++) {
        if (ref[i].sender.frameId === frameId) {
          return ref[i];
        }
      }
      return null;
    }
    function confirm (this: void, command: string, count: number): boolean {
      let msg = (CommandsData.availableCommands_[command] as CommandsNS.Description)[0];
      msg = msg.replace(<RegExpOne>/ \(use .*|&nbsp\(.*|<br\/>/, "");
      return window.confirm(
`You have asked Vimium C to perform ${count} repeats of the command:
        ${Utils.unescapeHTML_(msg)}

Are you sure you want to continue?`);
    }
    function requireURL <K extends keyof FgReq> (request: Req.fg<K> & BgReq[kBgReq.url], ignoreHash?: true): void {
      if (Exclusions == null || Exclusions.rules.length <= 0
          || !(ignoreHash || Settings.get("exclusionListenHash", true))) {
        request.name = kBgReq.url;
        cPort.postMessage(request as Req.bg<kBgReq.url>);
        return;
      }
      request.url = cPort.sender.url;
      type T1 = keyof FgReq;
      (requestHandlers as { [K in T1]: (req: FgReq[K], port: Frames.Port) => void; } as {
        [K in T1]: <K extends T1>(req: FgReq[K], port: Frames.Port) => void;
      })[request.handler](request, cPort);
    }
    function ensureInnerCSS (this: void, port: Frames.Port): string | null {
      const { sender } = port;
      if (sender.flags & Frames.Flags.hasCSS) { return null; }
      sender.flags |= Frames.Flags.hasCSSAndActed;
      return Settings.cache.innerCSS;
    }
    function retryCSS (port: Frames.Port, tick: number): void {
      let frames = framesForTab[port.sender.tabId];
      if (!frames || frames.indexOf(port) < 0) { return; }
      let CSS = Settings.cache.innerCSS;
      if (CSS) {
        port.postMessage({ name: kBgReq.showHUD, CSS });
      } else if (tick < 10) {
        setTimeout(retryCSS, 34 * tick, port, tick + 1);
      }
    }
    function execute (command: string, options: CommandsNS.RawOptions | null, count: number | string, port: Port | null, lastKey?: VKeyCodes): void {
      count = count !== "-" ? parseInt(count as string, 10) || 1 : -1;
      options && typeof options === "object" ?
          Object.setPrototypeOf(options, null) : (options = null);
      lastKey = (+<number>lastKey || VKeyCodes.None) as VKeyCodes;
      return executeCommand(command, Utils.makeCommand_(command, options), count, lastKey, port as Port);
    }

    const
    getCurTab = chrome.tabs.query.bind<null, { active: true, currentWindow: true }
        , [(result: [Tab], _ex: FakeArg) => void], 1>(null, { active: true, currentWindow: true }),
    getCurTabs = chrome.tabs.query.bind(null, {currentWindow: true}),
    getCurWnd = function (populate: boolean, callback: (window: chrome.windows.Window, exArg: FakeArg) => void): 1 {
      const wndId = TabRecency.lastWnd;
      return wndId >= 0 ? chrome.windows.get(wndId, { populate }, callback)
        : chrome.windows.getCurrent({ populate }, callback);
    } as {
      (populate: true, callback: (window: (chrome.windows.Window & { tabs: chrome.tabs.Tab[] }) | null | undefined
        , exArg: FakeArg) => void): 1;
      (populate: false, callback: (window: chrome.windows.Window, exArg: FakeArg) => void): 1;
    };
    function findCPort (port: Port | null | undefined): Port | null {
      const frames = framesForTab[port ? port.sender.tabId : TabRecency.last];
      return frames ? frames[0] : null as never as Port;
    }

    function openUrlInIncognito (this: void, url: string, active: boolean, opts: Readonly<OpenUrlOptions>, tab: Tab, wnds: Window[]): void {
      let oldWnd: Window | undefined, inCurWnd: boolean;
      oldWnd = wnds.filter(wnd => wnd.id === tab.windowId)[0];
      inCurWnd = oldWnd != null && oldWnd.incognito;
      if (!opts.window && (inCurWnd || (wnds = wnds.filter((wnd: Window): wnd is IncNormalWnd => {
        return wnd.incognito && wnd.type === "normal";
      })).length > 0)) {
        const options: InfoToCreateMultiTab & { windowId: number } = {
          url, active,
          windowId: inCurWnd ? tab.windowId : wnds[wnds.length - 1].id
        };
        if (inCurWnd) {
          options.index = newTabIndex(tab, opts.position);
          opts.opener && (options.openerTabId = tab.id);
        }
        openMultiTab(options, commandCount);
        return !inCurWnd && active ? selectWnd(options) : undefined;
      }
      return makeWindow({
        url,
        incognito: true, focused: active
      }, oldWnd && oldWnd.type === "normal" ? oldWnd.state : "");
    }

    const
    createTab = [function(url, onlyNormal, tabs): void {
      if (cOptions.url || cOptions.urls) {
        BackgroundCommands[kBgCmd.openUrl](tabs as [Tab] | undefined);
        return chrome.runtime.lastError;
      }
      let tab: Tab | null = null;
      if (!tabs) {}
      else if (tabs.length > 0) { tab = tabs[0]; }
      else if (TabRecency.last >= 0) {
        chrome.tabs.get(TabRecency.last, function(lastTab): void {
          createTab[0](url, onlyNormal, lastTab && [lastTab]);
        });
        return chrome.runtime.lastError;
      }
      if (!tab) {
        openMultiTab({url, active: true}, commandCount);
        return chrome.runtime.lastError;
      }
      if (tab.incognito && onlyNormal) { url = ""; }
      return openMultiTab({
        url, active: tab.active, windowId: tab.windowId,
        index: newTabIndex(tab, cOptions.position)
      }, commandCount);
    }, function(wnd): void {
      if (cOptions.url || cOptions.urls) {
        return BackgroundCommands[kBgCmd.openUrl]([selectFrom((wnd as PopWindow).tabs)]);
      }
      if (!wnd) {
        tabsCreate({url: this});
        return chrome.runtime.lastError;
      }
      const tab = selectFrom(wnd.tabs);
      if (wnd.incognito && wnd.type !== "normal") {
        // url is disabled to be opened in a incognito window directly
        return createTab[2](this, tab, commandCount > 1 ? (id: number): void => {
          for (let count = commandCount; 0 < --count; ) {
            chrome.tabs.duplicate(id);
          }
        } : null, wnd.tabs);
      }
      return openMultiTab({
        url: this, active: tab.active, windowId: wnd.type === "normal" ? tab.windowId : undefined,
        index: newTabIndex(tab, cOptions.position)
      }, commandCount);
    }, function(url, tab, repeat, allTabs): void {
      const urlLower = url.toLowerCase().split('#', 1)[0];
      allTabs = allTabs.filter(function(tab1) {
        const url = tab1.url.toLowerCase(), end = url.indexOf("#");
        return ((end < 0) ? url : url.substring(0, end)) === urlLower;
      });
      if (allTabs.length === 0) {
        chrome.windows.getAll(createTab[3].bind(url, tab, repeat));
        return;
      }
      const tabs = allTabs.filter(tab1 => tab1.index >= tab.index);
      tab = tabs.length > 0 ? tabs[0] : allTabs[allTabs.length - 1];
      chrome.tabs.duplicate(tab.id);
      if (repeat) { return repeat(tab.id); }
    }, function(tab, repeat, wnds): void {
      wnds = wnds.filter(function(wnd) {
        return !wnd.incognito && wnd.type === "normal";
      });
      if (wnds.length > 0) {
        return createTab[4](this, tab, repeat, wnds[0]);
      }
      return makeTempWindow("about:blank", false, //
      createTab[4].bind(null, this, tab, function(newTabId: number, newWndId: number): void {
        chrome.windows.remove(newWndId);
        if (repeat) { return repeat(newTabId); }
      }));
    }, function(url, tab, callback, wnd) {
      tabsCreate({
        active: false,
        windowId: wnd.id,
        url
      }, function(newTab) {
        return makeTempWindow(newTab.id, true, createTab[5].bind(tab, callback, newTab));
      });
    }, function(callback, newTab) {
      chrome.tabs.move(newTab.id, {
        index: this.index + 1,
        windowId: this.windowId
      }, function(): void {
        callback && callback(newTab.id, newTab.windowId);
        return selectTab(newTab.id);
      });
    }] as [
      (this: void, url: string, onlyNormal?: boolean, tabs?: Tab[]) => void,
      (this: string, wnd?: PopWindow) => void,
      (this: void, url: string, tab: Tab, repeat: ((this: void, tabId: number) => void) | null, allTabs: Tab[]) => void,
      (this: string, tab: Tab, repeat: ((this: void, tabId: number) => void) | null, wnds: Window[]) => void,
      (this: void, url: string, tab: Tab
        , callback: ((this: void, tabId: number, wndId: number) => void) | null, wnd: Window) => void,
      (this: Tab, callback: ((this: void, tabId: number, wndId: number) => void) | null, newTab: Tab) => void
    ]
    function openUrl (url: Urls.Url, workType: Urls.WorkType, tabs?: [Tab] | never[]): void {
      if (typeof url === "string") {
        let mask: string | undefined = cOptions.url_mask;
        if (mask) {
          url = url && url.replace(mask + "", (tabs as Tab[]).length > 0 ? (tabs as [Tab])[0].url : "");
        }
        if (mask = cOptions.id_mask || cOptions.id_mark || cOptions.id_marker) {
          url = url && url.replace(mask + "", chrome.runtime.id);
        }
        if (workType !== Urls.WorkType.FakeType) {
          url = Utils.convertToUrl(url + "", cOptions.keyword + "", workType);
        }
      }
      const reuse: ReuseType = cOptions.reuse == null ? ReuseType.newFg : (cOptions.reuse | 0),
      options = cOptions as OpenUrlOptions;
      cOptions = null as never;
      Utils.resetRe_();
      return typeof url !== "string" ? onEvalUrl(url as Urls.SpecialUrl)
        : openShowPage[0](url, reuse, options) ? void 0
        : Utils.isJSUrl_(url) ? openJSUrl(url)
        : reuse === ReuseType.reuse ? requestHandlers[kFgReq.focusOrLaunch]({ url })
        : reuse === ReuseType.current ? safeUpdate(url)
        : tabs ? openUrlInNewTab(url, reuse, options, tabs as [Tab])
        : void getCurTab(openUrlInNewTab.bind(null, url, reuse, options));
        ;
    }
    function openCopiedUrl (this: void, tabs: [Tab] | never[] | undefined, url: string | null): void {
      if (url === null) { return Backend.complain_("read clipboard"); }
      if (!(url = url.trim())) { return Backend.showHUD_("No text copied!"); }
      if (Utils.quotedStringRe_.test(url)) {
        url = url.slice(1, -1);
      } else {
        const kw: any = cOptions.keyword;
        if (!kw || kw === "~") {
          url = Utils.detectLinkDeclaration_(url);
        }
      }
      return openUrl(url, Urls.WorkType.ActAnyway, tabs);
    }
    function openUrlInNewTab (this: void, url: string, reuse: ReuseType, options: Readonly<OpenUrlOptions>, tabs: [Tab]): void {
      const tab = tabs[0] as Tab | undefined, tabIncognito = tab ? tab.incognito : false,
      { incognito } = options, active = reuse !== ReuseType.newBg;
      let window = options.window;
      if (Utils.isRefusingIncognito_(url)) {
        if (tabIncognito || TabRecency.incognito === IncognitoType.true) {
          window = true;
        }
      } else if (tabIncognito) {
        if (incognito !== false) {
          return openUrlInIncognito(url, active, options, tab as Tab, [{ id: (tab as Tab).windowId, incognito: true } as Window]);
        }
        window = true;
      } else if (incognito) {
        chrome.windows.getAll(openUrlInIncognito.bind(null, url, active, options, tab as Tab));
        return;
      }
      if (window) {
        getCurWnd(false, function({ state }): void {
          return makeWindow({ url, focused: active },
            state !== "minimized" && state !== "docked" ? state : "");
        })
        return;
      }
      return openMultiTab({
        url, active, windowId: tab ? tab.windowId : undefined,
        openerTabId: options.opener && tab ? tab.id : undefined,
        index: tab ? newTabIndex(tab, options.position) : undefined
      }, commandCount);
    }
    function openJSUrl (url: string): void {
      if (cPort) {
        try { cPort.postMessage({ name: kBgReq.eval, url }); } catch (e) {}
      } else { // e.g.: use Chrome omnibox at once on starting
        chrome.tabs.update({ url }, onRuntimeError);
      }
    }
    const
    openShowPage = [function(url, reuse, options, tab): boolean {
      const prefix = Settings.CONST.ShowPage_;
      if (!url.startsWith(prefix) || url.length < prefix.length + 3) { return false; }
      if (!tab) {
        getCurTab(function(tabs: [Tab]): void {
          if (!tabs || tabs.length <= 0) { return chrome.runtime.lastError; }
          openShowPage[0](url, reuse, options, tabs[0]);
        });
        return true;
      }
      const { incognito } = tab;
      url = url.substring(prefix.length);
      if (reuse === ReuseType.current && !incognito) {
        chrome.tabs.update(tab.id, { url: prefix });
      } else
      tabsCreate({
        active: reuse !== ReuseType.newBg,
        index: incognito ? undefined : newTabIndex(tab, options.position),
        windowId: incognito ? undefined : tab.windowId,
        openerTabId: !incognito && options.opener ? tab.id : undefined,
        url: prefix
      });
      const arr: [string, ((this: void) => string) | null, number] = [url, null, 0];
      Settings.temp.shownHash = arr[1] = function(this: void): string {
        clearTimeout(arr[2]);
        Settings.temp.shownHash = null; return arr[0];
      };
      arr[2] = setTimeout(openShowPage[1], 1200, arr);
      return true;
    }, function(arr) {
      arr[0] = "#!url vimium://error (vimium://show: sorry, the info has expired.)";
      arr[2] = setTimeout(function() {
        if (Settings.temp.shownHash === arr[1]) { Settings.temp.shownHash = null; }
        arr[0] = "", arr[1] = null;
      }, 2000);
    }] as [
      (url: string, reuse: ReuseType, options: OpenUrlOptions, tab?: Tab) => boolean,
      (arr: [string, ((this: void) => string) | null, number]) => void
    ]
    // use Urls.WorkType.Default
    function openUrls (tabs: [Tab]): void {
      const tab = tabs[0], { windowId } = tab;
      let urls: string[] = cOptions.urls, repeat = commandCount;
      for (let i = 0; i < urls.length; i++) {
        urls[i] = Utils.convertToUrl(urls[i] + "");
      }
      tab.active = !(cOptions.reuse < ReuseType.newFg);
      cOptions = null as never;
      do {
        for (let i = 0, index = tab.index + 1, { active } = tab; i < urls.length; i++, active = false, index++) {
          tabsCreate({ url: urls[i], index, windowId, active });
        }
      } while (0 < --repeat);
    }
    function removeTab (this: void, tab: Tab, curTabs: Tab[], wnds: Window[]): void {
      let url = false, windowId: number | undefined, wnd: Window;
      wnds = wnds.filter(wnd => wnd.type === "normal");
      if (wnds.length <= 1) {
        // protect the last window
        url = true;
        if (!(wnd = wnds[0])) {}
        else if (wnd.id !== tab.windowId) { url = false; } // the tab may be in a popup window
        else if (wnd.incognito && !Utils.isRefusingIncognito_(Settings.cache.newTabUrl_f)) {
          windowId = wnd.id;
        }
        // other urls will be disabled if incognito else auto in current window
      }
      else if (!tab.incognito) {
        // protect the only "normal & not incognito" window if it has currentTab
        wnds = wnds.filter(wnd => !wnd.incognito);
        if (wnds.length === 1 && wnds[0].id === tab.windowId) {
          windowId = wnds[0].id;
          url = true;
        }
      }
      if (url) {
        const tabIds = (curTabs.length > 1) ? curTabs.map(tab => tab.id) : [tab.id];
        tabsCreate({ index: tabIds.length, url: Settings.cache.newTabUrl_f, windowId });
        chrome.tabs.remove(tabIds);
      } else {
        chrome.windows.remove(tab.windowId);
      }
    }
    /** if `alsoWnd`, then it's safe when tab does not exist */
    function selectTab (this: void, tabId: number, alsoWnd?: boolean): void {
      chrome.tabs.update(tabId, {active: true}, alsoWnd ? selectWnd : null);
    }
    function selectWnd (this: void, tab?: { windowId: number }): void {
      tab && chrome.windows.update(tab.windowId, { focused: true });
      return chrome.runtime.lastError;
    }
    /** `direction` is treated as limited */
    function removeTabsRelative (this: void, activeTab: {index: number, pinned: boolean}, direction: number, tabs: Tab[]): void {
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
        tabs = tabs.filter(tab => !tab.pinned);
      }
      if (tabs.length > 0) {
        chrome.tabs.remove(tabs.map(tab => tab.id), onRuntimeError);
      }
    }
    /** safe when cPort is null */
    const
    focusOrLaunch = [function(tabs): void {
      if (TabRecency.incognito !== IncognitoType.true) {
        tabs && (tabs = tabs.filter(tab => !tab.incognito));
      }
      if (tabs && tabs.length > 0) {
        getCurWnd(false, focusOrLaunch[2].bind(this, tabs));
        return;
      }
      getCurTab(focusOrLaunch[1].bind(this));
      return chrome.runtime.lastError;
    }, function(tabs) {
      // if `@scroll`, then `typeof @` is `MarksNS.MarkToGo`
      const callback = this.scroll ? focusOrLaunch[3].bind(this, 0) : null;
      if (tabs.length <= 0 || TabRecency.incognito === IncognitoType.true && !tabs[0].incognito) {
        chrome.windows.create({url: this.url}, callback && function(wnd: Window): void {
          if (wnd.tabs && wnd.tabs.length > 0) { return callback(wnd.tabs[0]); }
        });
        return;
      }
      tabsCreate({
        index: tabs[0].index + 1,
        url: this.url,
        windowId: tabs[0].windowId
      }, callback);
    }, function(tabs, wnd): void {
      const wndId = wnd.id, url = this.url;
      let tabs2 = tabs.filter(tab => tab.windowId === wndId);
      if (tabs2.length <= 0) {
        tabs2 = wnd.incognito ? tabs : tabs.filter(tab => !tab.incognito);
        if (tabs2.length <= 0) {
          getCurTab(focusOrLaunch[1].bind(this));
          return;
        }
      }
      this.prefix && tabs2.sort((a, b) => a.url.length - b.url.length);
      let tab: Tab = selectFrom(tabs2);
      if (tab.url.length > tabs2[0].url.length) { tab = tabs2[0]; }
      chrome.tabs.update(tab.id, {
        url: tab.url === url || tab.url.startsWith(url) ? undefined : url,
        active: true
      }, this.scroll ? focusOrLaunch[3].bind(this, 0) : null);
      if (tab.windowId !== wndId) { return selectWnd(tab); }
    }, function(this: MarksNS.MarkToGo, tick: 0 | 1 | 2, tab: Tab): void {
      if (!tab) { return chrome.runtime.lastError; }
      if (tab.status === "complete" || tick >= 2) {
        return Marks.scrollTab(this, tab);
      }
      setTimeout(() => { chrome.tabs.get(tab.id, focusOrLaunch[3].bind(this, tick + 1)) }, 800);
    }] as [
      (this: MarksNS.FocusOrLaunch, tabs: Tab[]) => void,
      (this: MarksNS.FocusOrLaunch, tabs: [Tab] | never[]) => void,
      (this: MarksNS.FocusOrLaunch, tabs: Tab[], wnd: Window) => void,
      (this: MarksNS.MarkToGo, tick: 0 | 1 | 2, tabs: Tab | undefined) => void
    ]
    function executeGlobal (cmd: string, ports: Frames.Frames | null | undefined): void {
      if (gCmdTimer) {
        clearTimeout(gCmdTimer);
        gCmdTimer = 0;
      }
      if (!ports) {
        return execute(cmd, CommandsData.cmdMap_[cmd] || null, 1, null);
      }
      gCmdTimer = setTimeout(executeGlobal, 100, cmd, null);
      ports[0].postMessage({ name: kBgReq.count, cmd, id: gCmdTimer });
    };
  const
  BgCmdInfo: { [K in kBgCmd & number]: K extends keyof BgCmdInfoNS ? BgCmdInfoNS[K] : UseTab.NoTab; } = [
    UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.ActiveTab, UseTab.ActiveTab,
    UseTab.NoTab, UseTab.CurWndTabs, UseTab.CurWndTabs, UseTab.CurWndTabs, UseTab.CurWndTabs,
    UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.ActiveTab,
    UseTab.CurWndTabs, UseTab.NoTab, UseTab.CurWndTabs, UseTab.NoTab, UseTab.ActiveTab,
    UseTab.ActiveTab, UseTab.NoTab, UseTab.CurWndTabs, UseTab.NoTab, UseTab.NoTab,
    UseTab.NoTab, UseTab.CurWndTabs, UseTab.ActiveTab, UseTab.NoTab, UseTab.NoTab,
    UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.NoTab,
    UseTab.ActiveTab, UseTab.NoTab, UseTab.NoTab,
  ],
  BackgroundCommands: {
    [K in kBgCmd & number]:
      K extends keyof BgCmdInfoNS ?
        BgCmdInfoNS[K] extends UseTab.ActiveTab ? BgCmdActiveTab :
        BgCmdInfoNS[K] extends UseTab.CurWndTabs ? BgCmdCurWndTabs :
        BgCmdInfoNS[K] extends UseTab.ActiveTab | UseTab.NoTab ? BgCmdActiveTabOrNoTab :
        never :
      BgCmdNoTab;
  } = [
    /* createTab: */ function (): void {},
    /* duplicateTab: */ function (): void {
      const tabId = cPort.sender.tabId;
      if (tabId < 0) {
        return Backend.complain_("duplicate such a tab");
      }
      chrome.tabs.duplicate(tabId);
      if (commandCount < 2) { return; }
      if (Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito
          || TabRecency.incognito === IncognitoType.ensuredFalse) {
        chrome.tabs.get(tabId, fallback);
      } else {
        chrome.windows.getCurrent({populate: true}, function(wnd: PopWindow): void {
          const tab = wnd.tabs.filter(tab => tab.id === tabId)[0];
          if (!wnd.incognito || tab.incognito) {
            return fallback(tab);
          }
          for (let count = commandCount; 0 < --count; ) {
            chrome.tabs.duplicate(tabId);
          }
        });
      }
      function fallback(tab: Tab): void {
        return openMultiTab({
          url: tab.url, active: false, windowId: tab.windowId,
          pinned: tab.pinned,
          index: tab.index + 2 , openerTabId: tab.id
        }, commandCount - 1);
      }
    },
    /* moveTabToNewWindow: */ function (): void {
      const incognito = !!cOptions.incognito;
      if (incognito && (cPort ? cPort.sender.incognito : TabRecency.incognito === IncognitoType.true)) {
        return reportNoop();
      }
      chrome.windows.getCurrent({populate: true}, incognito ? moveTabToIncognito : moveTabToNewWindow0);
      function moveTabToNewWindow0(this: void, wnd: PopWindow): void {
        const total = wnd.tabs.length;
        if (total <= 1) { return; } // not need to show a tip
        const tab = selectFrom(wnd.tabs), i = tab.index, rawCount = commandCount, absCount = Math.abs(rawCount),
        limited = cOptions.limited != null ? !!cOptions.limited : absCount > total;
        let count = Math.min(absCount, limited ? rawCount < 0 ? i + 1 : total - i : total);
        if (count >= total) { return Backend.showHUD_("It does nothing to move all tabs of this window"); }
        if (count > 30 && !confirm("moveTabToNewWindow", count)) { return; }
        rawCount < 0 && (count = -count);
        return makeWindow({
          tabId: tab.id,
          incognito: tab.incognito
        }, wnd.type === "normal" ? wnd.state : "", absCount > 1 ?
        function(wnd2: Window): void {
          let tabs: Tab[] | undefined = wnd.tabs, tabs2: Tab[] | undefined;
          const curTab = tabs[i], len = tabs.length, end = i + count;
          if (end > len || end < -1) {
            tabs2 = count > 0 ? tabs.slice(len - count, i) : tabs.slice(i + 1, -count);
          }
          tabs = count > 0 ? tabs.slice(i + 1, end) : tabs.slice(Math.max(0, end + 1), i);
          if (wnd.incognito && Settings.CONST.ChromeVersion < BrowserVer.MinNoUnmatchedIncognito) {
            let {incognito} = curTab, filter = (tab: Tab): boolean => tab.incognito === incognito;
            tabs = tabs.filter(filter);
            tabs2 && (tabs2 = tabs2.filter(filter));
          }
          if (count < 0) {
            let tmp = tabs2;
            tabs2 = tabs; tabs = tmp;
          }
          let curInd = 0;
          const getId = (tab: Tab): number => tab.id;
          if (tabs2 && tabs2.length > 0) {
            chrome.tabs.move(tabs2.map(getId), {index: 0, windowId: wnd2.id}, onRuntimeError);
            curInd = tabs2.length;
            if (curInd > 1) { // Chrome only accepts the first two tabs of tabs2
              chrome.tabs.move(curTab.id, {index: curInd});
            }
          }
          if (tabs && tabs.length > 0) {
            chrome.tabs.move(tabs.map(getId), {index: curInd + 1, windowId: wnd2.id}, onRuntimeError);
          }
        } : null);
      }
      function reportNoop(): void {
        return Backend.showHUD_("This tab has been in an incognito window");
      }
      function moveTabToIncognito(wnd: PopWindow): void {
        const tab = selectFrom(wnd.tabs);
        if (wnd.incognito && tab.incognito) { return reportNoop(); }
        const options: chrome.windows.CreateData = {tabId: tab.id, incognito: true}, url = tab.url;
        if (tab.incognito) {
        } else if (Utils.isRefusingIncognito_(url)) {
          if (wnd.incognito) {
            return reportNoop();
          }
          if (Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito || Settings.CONST.DisallowIncognito_) {
            return Backend.complain_("open this URL in incognito mode");
          }
        } else if (wnd.incognito) {
          ++tab.index;
          return Backend.reopenTab_(tab);
        } else {
          options.url = url;
        }
        (wnd as Window).tabs = undefined;
        chrome.windows.getAll(function(wnds): void {
          let tabId: number | undefined;
          wnds = wnds.filter((wnd: Window): wnd is IncNormalWnd => {
            return wnd.incognito && wnd.type === "normal";
          });
          if (wnds.length) {
            chrome.tabs.query({ windowId: wnds[wnds.length - 1].id, active: true }, function([tab2]): void {
              const tabId = options.tabId as number;
              if (options.url) {
                chrome.tabs.create({url: options.url, index: tab2.index + 1, windowId: tab2.windowId});
                selectWnd(tab2);
                chrome.tabs.remove(tabId);
                return;
              }
              return makeTempWindow(tabId, true, function(): void {
                chrome.tabs.move(tabId, {index: tab2.index + 1, windowId: tab2.windowId}, function(): void {
                  return selectTab(tabId, true);
                });
              });
            });
            return;
          }
          let state: chrome.windows.ValidStates | "" = wnd.type === "normal" ? wnd.state : "";
          if (options.url) {
            tabId = options.tabId;
            options.tabId = undefined;
            if (Settings.CONST.DisallowIncognito_) {
              options.focused = true;
              state = "";
            }
          }
          // in tests on Chrome 46/51, Chrome hangs at once after creating a new normal window from an incognito tab
          // so there's no need to worry about stranger edge cases like "normal window + incognito tab + not allowed"
          makeWindow(options, state);
          if (tabId != null) {
            chrome.tabs.remove(tabId);
          }
        });
      }
    },
    /* moveTabToNextWindow: */ function (this: void, [tab]: [Tab]): void {
      chrome.windows.getAll(function (wnds0: Window[]): void {
        let wnds: Window[], ids: number[], index = tab.windowId;
        wnds = wnds0.filter(wnd => wnd.incognito === tab.incognito && wnd.type === "normal");
        if (wnds.length > 0) {
          ids = wnds.map(wnd => wnd.id);
          index = ids.indexOf(index);
          if (ids.length >= 2 || index === -1) {
            let dest = (index + commandCount) % ids.length;
            index === -1 && commandCount < 0 && dest++;
            dest < 0 && (dest += ids.length);
            chrome.tabs.query({windowId: ids[dest], active: true}, function([tab2]): void {
              return index >= 0 ? callback() : makeTempWindow(tab.id, tab.incognito, callback);
              function callback(): void {
                chrome.tabs.move(tab.id, {index: tab2.index + 1, windowId: tab2.windowId}, function(): void {
                  return selectTab(tab.id, true);
                });
              }
            });
            return;
          }
        } else {
          wnds = wnds0.filter(wnd => wnd.id === index);
        }
        return makeWindow({
          tabId: tab.id,
          incognito: tab.incognito
        }, wnds.length === 1 && wnds[0].type === "normal" ? wnds[0].state : "");
      });
    },
    /* toggleCS: */ function (this: void, tabs: [Tab]): void {
      return ContentSettings.toggleCS(commandCount, cOptions, tabs);
    },
    /* clearCS: */ function (this: void): void {
      return ContentSettings.clearCS(cOptions, cPort);
    },
    /* goTab: */ function (this: void, tabs: Tab[]): void {
      if (tabs.length < 2) { return; }
      let count = ((cOptions.dir | 0) || 1) * commandCount, len = tabs.length, toSelect: Tab;
      count = cOptions.absolute
        ? count > 0 ? Math.min(len, count) - 1 : Math.max(0, len + count)
        : Math.abs(commandCount) > tabs.length * 2 ? (count > 0 ? -1 : 0)
        : selectFrom(tabs).index + count;
      toSelect = tabs[(count >= 0 ? 0 : len) + (count % len)];
      if (!toSelect.active) { return selectTab(toSelect.id); }
    },
    /* removeTab: */ function (this: void, tabs: Tab[]): void {
      if (!tabs || tabs.length <= 0) { return chrome.runtime.lastError; }
      const total = tabs.length, rawCount = commandCount, absCount = Math.abs(rawCount),
      limited = cOptions.limited != null ? !!cOptions.limited : absCount > total;
      let tab = tabs[0];
      if (cOptions.allow_close === true) {} else
      if (absCount >= total && (tab.active
            || !limited && (!tab.pinned || selectFrom(tabs).pinned))
      ) {
        chrome.windows.getAll(removeTab.bind(null, tab, tabs));
        return;
      }
      if (!tab.active) {
        tab = selectFrom(tabs);
      }
      const i = tab.index, goLeft = cOptions.left, firstIsLeft = rawCount < 0, firstSide = firstIsLeft ? i + 1 : total - i,
      count = Math.min(absCount, limited ? firstSide : total);
      if (count > 20 && !confirm("removeTab", count)) {
        return;
      }
      chrome.tabs.remove(tab.id, onRuntimeError);
      if (count <= 1) {
        if (goLeft && i > 0) {
          chrome.tabs.update(tabs[i - 1].id, { active: true });
        }
        return;
      }
      const isFirstNotPinned = i > 0 && tabs[i - 1].pinned && !tab.pinned, dir = firstIsLeft ? -1 : 1;
      if (!firstIsLeft || !isFirstNotPinned) {
        removeTabsRelative(tab, dir * (count - 1), tabs);
      }
      if (count <= firstSide || !firstIsLeft && isFirstNotPinned) {
        if (goLeft && count < firstSide && i > 0) {
          chrome.tabs.update(tabs[i - 1].id, { active: true });
        }
        return;
      }
      return removeTabsRelative(tab, dir * (firstSide - count), tabs);
    },
    /* removeTabsR: */ function (this: void, tabs: Tab[]): void {
      let dir = cOptions.dir | 0;
      dir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
      return removeTabsRelative(selectFrom(tabs), dir * commandCount, tabs);
    },
    /* removeRightTab: */ function (this: void, tabs: Tab[]): void {
      const last = tabs.length - 1, count = commandCount;
      if (!tabs || count > last || count < -last) { return; }
      const ind = selectFrom(tabs).index + count;
      chrome.tabs.remove(tabs[ind > last ? last - count : ind < 0 ? -count : ind].id);
    },
    /* restoreTab: */ function (this: void): void {
      if (!chrome.sessions) {
        return complainNoSession();
      }
      let count = commandCount;
      if (count < 2 && count > -2 && cPort.sender.incognito) {
        return Backend.showHUD_("Can not restore a tab in incognito mode!");
      }
      const limit = (chrome.sessions.MAX_SESSION_RESULTS as number) | 0;
      count > limit && limit > 0 && (count = limit);
      do {
        chrome.sessions.restore(null, onRuntimeError);
      } while (0 < --count);
    },
    /* restoreGivenTab: */ function (): void {
      if (!chrome.sessions) {
        return complainNoSession();
      }
      function doRestore (this: void, list: chrome.sessions.Session[]): void {
        if (commandCount > list.length) {
          return Backend.showHUD_("The session index provided is out of range.");
        }
        const session = list[commandCount - 1], item = session.tab || session.window;
        item && chrome.sessions.restore(item.sessionId);
      }
      if (commandCount > (chrome.sessions.MAX_SESSION_RESULTS || 25)) {
        return doRestore([]);
      }
      if (commandCount <= 1) {
        chrome.sessions.restore(null, onRuntimeError);
        return;
      }
      chrome.sessions.getRecentlyClosed(doRestore);
    },
    /* blank: */ function (this: void): void {},
    /* openUrl: */ function (this: void, tabs?: [Tab] | never[]): void {
      if (cOptions.urls) {
        if (!(cOptions.urls instanceof Array)) { cOptions = null as never; return; }
        return tabs && tabs.length > 0 ? openUrls(tabs as [Tab]) : void getCurTab(openUrls);
      }
      if (cOptions.url_mask && !tabs) {
        return <any>chrome.runtime.lastError || <any>void getCurTab(BackgroundCommands[kBgCmd.openUrl]);
      }
      let url: Urls.Url | Promise<string | null> | undefined | null, workType: Urls.WorkType = Urls.WorkType.FakeType;
      if (url = <string>cOptions.url) {
        url = url + "";
        workType = Urls.WorkType.Default;
      } else if (cOptions.copied) {
        url = VClipboard.paste();
        if (url instanceof Promise) {
          url.then(openCopiedUrl.bind(null, tabs), openCopiedUrl.bind(null, null as never, null));
          return;
        }
        return openCopiedUrl(tabs, url);
      } else {
        url = cOptions.url_f as string || "";
      }
      return openUrl(url, workType, tabs);
    },
    /* searchInAnother: */ function (this: void, tabs: [Tab]): void {
      let keyword = (cOptions.keyword || "") + "";
      const query = Backend.parse_({ url: tabs[0].url });
      if (!query || !keyword) {
        Backend.showHUD_(keyword ? "No search engine found!"
          : 'This key mapping lacks an arg "keyword"');
        return;
      }
      let url_f = Utils.createSearchUrl_(query.url.split(" "), keyword, Urls.WorkType.ActAnyway);
      cOptions = Object.setPrototypeOf({
        reuse: cOptions.reuse | 0,
        opener: true,
        url_f
      }, null);
      BackgroundCommands[kBgCmd.openUrl](tabs);
    },
    /* togglePinTab: */ function (this: void, tabs: Tab[]): void {
      const tab = selectFrom(tabs);
      let i = tab.index;
      let len = Math.max(-1, Math.min(i + commandCount, tabs.length)), dir = i < len ? 1 : -1,
      pin = !tab.pinned, action = {pinned: pin};
      if ((i < len) !== pin) { i = len - dir; len = tab.index - dir; dir = -dir; }
      do {
        chrome.tabs.update(tabs[i].id, action);
        i += dir;
      } while (len != i && i < tabs.length && i >= 0 && (pin || tabs[i].pinned));
    },
    /* toggleMuteTab: */ function (): void {
      if (Settings.CONST.ChromeVersion < BrowserVer.MinMuted) {
        return Backend.showHUD_(`Vimium C can not control mute state before Chrome ${BrowserVer.MinMuted}`);
      }
      if (!(cOptions.all || cOptions.other)) {
        getCurTab(function([tab]: [Tab]): void {
          chrome.tabs.update(tab.id, { muted: !tab.mutedInfo.muted });
        })
        return;
      }
      chrome.tabs.query({audible: true}, function(tabs: Tab[]): void {
        let curId = cOptions.other ? cPort.sender.tabId : GlobalConsts.TabIdNone
          , muted = false, action = { muted: true };
        for (let i = tabs.length; 0 <= --i; ) {
          const tab = tabs[i];
          if (tab.id !== curId && !tab.mutedInfo.muted) {
            muted = true;
            chrome.tabs.update(tab.id, action);
          }
        }
        if (muted) { return; }
        action.muted = false;
        for (let i = tabs.length; 0 <= --i; ) {
          const j = tabs[i].id;
          j !== curId && chrome.tabs.update(j, action);
        }
      });
    },
    /* reloadTab: */ function (this: void, tabs: Tab[] | never[]): void {
      if (tabs.length <= 0) {
        getCurWnd(true, function(wnd) {
          if (!wnd) { return chrome.runtime.lastError; }
          wnd.tabs.length > 0 && BackgroundCommands[kBgCmd.reloadTab](wnd.tabs);
        });
        return;
      }
      let reloadProperties = { bypassCache: (cOptions.hard || cOptions.bypassCache) === true }
        , ind = selectFrom(tabs).index, len = tabs.length, tail = len - 1
        , count = commandCount, dir = count > 0 ? 1 : -1, last = ind + count - dir;
      if (cOptions.single) {
        ind = last > tail ? count > len ? 0 : len - count : last < 0 ? count < -len ? tail : dir - count : last;
        last = ind + dir;
      } else if (last > tail) {
        last = len;
        count <= len && (ind = len - count);
      } else if (last < 0) {
        last = dir;
        count >= -len && (ind = dir - count);
      } else {
        last += dir;
      }
      // now `last` is the real end of iteration
      do {
        chrome.tabs.reload(tabs[ind].id, reloadProperties);
        ind += dir;
      } while (last != ind && ind < len && ind >= 0);
    },
    /* reloadGivenTab: */ function (): void {
      if (commandCount < 2 && commandCount > -2) {
        chrome.tabs.reload();
        return;
      }
      getCurTabs(BackgroundCommands[kBgCmd.reloadTab]);
    },
    /* reopenTab: */ function (this: void, tabs: [Tab] | never[]): void {
      if (tabs.length <= 0) { return; }
      const tab = tabs[0];
      ++tab.index;
      if (Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito || Settings.CONST.DisallowIncognito_
          || TabRecency.incognito === IncognitoType.ensuredFalse || !Utils.isRefusingIncognito_(tab.url)) {
        return Backend.reopenTab_(tab);
      }
      chrome.windows.get(tab.windowId, function(wnd): void {
        if (wnd.incognito && !tab.incognito) {
          (tab as ReopenOptions).openerTabId = (tab as ReopenOptions).windowId = undefined;
        }
        return Backend.reopenTab_(tab);
      });
    },
    /* goToRoot: */ function (this: void, tabs: [Tab]): void {
      const trail = cOptions.trailing_slash,
      { path, url } = requestHandlers[kFgReq.parseUpperUrl]({
        trailing_slash: trail != null ? !!trail : null,
        url: tabs[0].url, upper: commandCount
      });
      if (path != null) {
        chrome.tabs.update(tabs[0].id, {url});
        return;
      }
      return Backend.showHUD_(url);
    },
    /* goUp: */ function (this: void): void {
      const trail = cOptions.trailing_slash;
      requireURL({
        handler: kFgReq.parseUpperUrl,
        url: "", // just a hack to make TypeScript compiler happy
        upper: -commandCount,
        trailing_slash: trail != null ? !!trail : null,
        execute: true
      });
    },
    /* moveTab: */ function (this: void, tabs: Tab[]): void {
      const tab = selectFrom(tabs), dir = cOptions.dir > 0 ? 1 : -1, pinned = tab.pinned;
      let index = Math.max(0, Math.min(tabs.length - 1, tab.index + dir * commandCount));
      while (pinned !== tabs[index].pinned) { index -= dir; }
      if (index != tab.index) {
        chrome.tabs.move(tab.id, { index });
      }
    },
    /* nextFrame: */ function (this: void): void {
      let port = cPort, ind = -1;
      const frames = framesForTab[port.sender.tabId];
      if (frames && frames.length > 2) {
        ind = Math.max(0, frames.indexOf(port, 1));
        for (let count = Math.abs(commandCount), dir = commandCount > 0 ? 1 : -1; count > 0; count--) {
          ind += dir;
          if (ind === frames.length) { ind = 1; }
          else if (ind < 1) { ind = frames.length - 1; }
        }
        port = frames[ind];
      }
      port.postMessage({
        name: kBgReq.focusFrame,
        CSS: port.sender.frameId === 0 || !(port.sender.flags & Frames.Flags.hasCSS)
          ? ensureInnerCSS(port) : null,
        key: cKey,
        mask: port !== cPort ? FrameMaskType.NormalNext : FrameMaskType.OnlySelf
      });
    },
    /* mainFrame: */ function (): void {
      const tabId = cPort ? cPort.sender.tabId : TabRecency.last, port = indexFrame(tabId, 0);
      if (!port) { return; }
      port.postMessage({
        name: kBgReq.focusFrame,
        CSS: ensureInnerCSS(port),
        key: cKey,
        mask: (framesForTab[tabId] as Frames.Frames)[0] === port ? FrameMaskType.OnlySelf : FrameMaskType.ForcedSelf
      });
    },
    /* parentFrame: */ function (): void {
      const sender = cPort.sender as Frames.Sender | undefined,
      msg = NoFrameId ? `Vimium C can not know parent frame before Chrome ${BrowserVer.MinWithFrameId}`
        : !(sender && sender.tabId >= 0 && framesForTab[sender.tabId])
          ? "Vimium C can not access frames in current tab"
        : null;
      msg && Backend.showHUD_(msg);
      if (!sender || !sender.frameId || NoFrameId || !chrome.webNavigation) {
        return BackgroundCommands[kBgCmd.mainFrame]();
      }
      chrome.webNavigation.getAllFrames({
        tabId: sender.tabId
      }, function (frames: chrome.webNavigation.GetAllFrameResultDetails[]): void {
        let frameId = sender.frameId, found: boolean, count = commandCount;
        do {
          found = false;
          for (const i of frames) {
            if (i.frameId === frameId) {
              frameId = i.parentFrameId;
              found = frameId > 0;
              break;
            }
          }
        } while (found && 0 < --count);
        const port = frameId > 0 ? indexFrame(sender.tabId, frameId) : null;
        if (!port) {
          return BackgroundCommands[kBgCmd.mainFrame]();
        }
        port.postMessage({
          name: kBgReq.focusFrame,
          CSS: ensureInnerCSS(port),
          key: cKey,
          mask: FrameMaskType.ForcedSelf
        });
      });
    },
    /* visitPreviousTab: */ function (this: void, tabs: Tab[]): void {
      if (tabs.length < 2) { return; }
      tabs.splice(selectFrom(tabs).index, 1);
      tabs = tabs.filter(i => i.id in TabRecency.tabs).sort(TabRecency.rCompare);
      const tab = tabs[commandCount > 0 ? Math.min(commandCount, tabs.length) - 1 : Math.max(0, tabs.length + commandCount)];
      tab && selectTab(tab.id);
    },
    /* copyTabInfo: */ function (this: void, tabs: [Tab]): void {
      let str: string, decoded = !!(cOptions.decoded || cOptions.decode);
      switch (cOptions.type) {
      case "title": str = tabs[0].title; break;
      case "frame":
        if (needIcon && (str = cPort.sender.url)) { break; }
        cPort.postMessage<1, kFgCmd.autoCopy>({
          name: kBgReq.execute,
          CSS: ensureInnerCSS(cPort),
          command: kFgCmd.autoCopy, count: 1,
          options: { url: true, decoded }
        });
        return;
      default: str = tabs[0].url; break;
      }
      decoded && (str = Utils.DecodeURLPart_(str, decodeURI));
      VClipboard.copy(str);
      return Backend.showHUD_(str, true);
    },
    /* goNext: */ function (): void {
      let rel: string | undefined = cOptions.rel || cOptions.dir, p2: string[] = []
        , patterns: string | string[] | boolean | number = cOptions.patterns;
      rel = rel ? rel + "" : "next";
      if (patterns instanceof Array) {
        for (let i of patterns) {
          i = i && (i + "").trim();
          i && p2.push(i.toLowerCase());
        }
      } else {
        typeof patterns === "string" || (patterns = "");
        patterns = (patterns as string) || Settings.get(rel !== "next" ? "previousPatterns" : "nextPatterns", true);
        patterns = patterns.trim().toLowerCase().split(",");
        for (let i of patterns) {
          i = i.trim();
          i && p2.push(i);
        }
      }
      if (p2.length > GlobalConsts.MaxNumberOfNextPatterns) { p2.length = GlobalConsts.MaxNumberOfNextPatterns; }
      cPort.postMessage<1, kFgCmd.goNext>({ name: kBgReq.execute,
        CSS: null, command: kFgCmd.goNext, count: 1,
        options: {
          rel,
          patterns: p2
        }
      });
    },
    /* enterInsertMode: */ function (): void {
      let code = cOptions.code | 0, stat: KeyStat = cOptions.stat | 0;
      code = stat !== KeyStat.plain ? code || VKeyCodes.esc : code === VKeyCodes.esc ? 0 : code;
      let
      hud = cOptions.hideHUD != null ? !cOptions.hideHUD : cOptions.hideHud != null ? !cOptions.hideHud
        : !Settings.get("hideHud", true);
      cPort.postMessage<1, kFgCmd.insertMode>({ name: kBgReq.execute,
        CSS: hud ? ensureInnerCSS(cPort) : null,
        command: kFgCmd.insertMode,
        count: 1,
        options: {
          code, stat,
          passExitKey: !!cOptions.passExitKey,
          hud
        }
      });
    },
    /* enterVisualMode: */ function (): void {
      const { sender } = cPort;
      let options: CmdOptions[kFgCmd.visualMode] = cOptions as Partial<CmdOptions[kFgCmd.visualMode]> as CmdOptions[kFgCmd.visualMode];
      if (!(sender.flags & Frames.Flags.hadVisualMode)) {
        sender.flags |= Frames.Flags.hadVisualMode;
        options = Utils.extendIf_(Object.create(null) as typeof options, options);
        options.words = CommandsData.wordsRe_;
      }
      const str = typeof options.mode === "string" ? (options.mode as string).toLowerCase() : "";
      options.mode = str === "caret" ? VisualModeNS.Mode.Caret : str === "line" ? VisualModeNS.Mode.Line : VisualModeNS.Mode.Visual;
      cPort.postMessage<1, kFgCmd.visualMode>({ name: kBgReq.execute,
        CSS: ensureInnerCSS(cPort), command: kFgCmd.visualMode, count: 1,
        options
      });
    },
    /* performFind: */ function (): void {
      const leave = !cOptions.active,
      query = leave || cOptions.last ? FindModeHistory.query(cPort.sender.incognito) : "";
      cPort.postMessage<1, kFgCmd.findMode>({ name: kBgReq.execute
          , CSS: ensureInnerCSS(cPort), command: kFgCmd.findMode, count: 1
          , options: {
        count: cOptions.dir <= 0 ? -commandCount : commandCount,
        leave,
        query
      }});
    },
    /* showVomnibar: */ function (this: void, forceInner?: boolean): void {
      let port = cPort as Port | null;
      if (!port) {
        port = cPort = indexFrame(TabRecency.last, 0) as Port;
        if (!port) { return; }
      } else if (port.sender.frameId !== 0 && port.sender.tabId >= 0) {
        port = indexFrame(port.sender.tabId, 0) || port;
      }
      const page = Settings.cache.vomnibarPage_f, { url } = port.sender, preferWeb = !page.startsWith(BrowserProtocol),
      inner = forceInner || !page.startsWith(location.origin) ? Settings.CONST.VomnibarPageInner_ : page;
      forceInner = (preferWeb ? url.startsWith(BrowserProtocol) || page.startsWith("file:") && !url.startsWith("file:")
          // it has occurred since Chrome 50 (BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) that https refusing http iframes.
          || page.startsWith("http:") && url.startsWith("https:")
        : port.sender.incognito) || url.startsWith(location.origin) || !!forceInner;
      const useInner: boolean = forceInner || page === inner || port.sender.tabId < 0,
      options: CmdOptions[kFgCmd.vomnibar] & SafeObject = Utils.extendIf_(Object.setPrototypeOf<CmdOptions[kFgCmd.vomnibar]>({
        vomnibar: useInner ? inner : page,
        vomnibar2: useInner ? null : inner,
        ptype: useInner ? VomnibarNS.PageType.inner : preferWeb ? VomnibarNS.PageType.web : VomnibarNS.PageType.ext,
        script: useInner ? "" : Settings.CONST.VomnibarScript_f_,
        secret: getSecret(),
        CSS: ensureInnerCSS(port)
      }, null), cOptions as {} as CmdOptions[kFgCmd.vomnibar]);
      port.postMessage<1, kFgCmd.vomnibar>({
        name: kBgReq.execute, CSS: null,
        command: kFgCmd.vomnibar, count: commandCount,
        options
      });
      options.secret = -1;
      cOptions = options;
    },
    /* clearFindHistory: */ function (this: void): void {
      const { incognito } = cPort.sender;
      FindModeHistory.removeAll(incognito);
      return Backend.showHUD_((incognito ? "incognito " : "") + "find history has been cleared.");
    },
    /* showHelp: */ function (this: void): void {
      if (cPort.sender.frameId === 0 && !(window.HelpDialog && (cPort.sender.flags & Frames.Flags.hadHelpDialog))) {
        return requestHandlers[kFgReq.initHelp]({}, cPort);
      }
      if (!window.HelpDialog) {
        Utils.require<BaseHelpDialog>('HelpDialog');
      }
      cPort.postMessage<1, kFgCmd.showHelp>({
        name: kBgReq.execute,
        CSS: null,
        command: kFgCmd.showHelp,
        count: 1,
        options: null
      });
    },
    /* toggleViewSource: */ function (this: void, tabs: [Tab]): void {
      let tab = tabs[0], url = tab.url;
      if (url.startsWith(BrowserProtocol)) {
        return Backend.complain_("visit HTML of an extension's page");
      }
      url = url.startsWith("view-source:") ? url.substring(12) : ("view-source:" + url);
      tabsCreate({
        url, active: tab.active, windowId: tab.windowId,
        index: tab.index + 1, openerTabId: tab.id
      });
    },
    /* clearMarks: */ function (this: void): void {
      cOptions.local ? requireURL({ handler: kFgReq.marks, url:"", action: "clear" }, true) : Marks.clear();
    },
    /* toggle: */ function (this: void): void {
      type Keys = CmdOptions[kFgCmd.toggle]["key"];
      const all = Settings.payload, key: Keys = (cOptions.key || "") + "" as Keys,
      old = all[key], keyRepr = '"' + key + '"';
      let value = cOptions.value, isBool = typeof value === "boolean", msg = "";
      if (Settings.valuesToLoad_.indexOf(key) < 0) {
        msg = 'unknown option ' + keyRepr;
      } else if (typeof old === "boolean") {
        isBool || (value = null);
      } else if (value === undefined) {
        msg = 'need value=... for option ' + keyRepr;
      } else if (isBool) {
        msg = keyRepr + ' is not a boolean switch';
      } else if (typeof value !== typeof old) {
        msg = JSON.stringify(old);
        msg = 'value of ' + keyRepr + ' should be like ' +
          (msg.length > 10 ? msg.substring(0, 9) + "\u2026" : msg);
      }
      if (msg) {
        Backend.showHUD_(msg);
      } else {
        cPort.postMessage<1, kFgCmd.toggle>({
          name: kBgReq.execute,
          CSS: ensureInnerCSS(cPort),
          command: kFgCmd.toggle, count: 1,
          options: { key, value }
        });
      }
    }
  ],
  numHeadRe = <RegExpOne>/^-?\d+|^-/;
  function executeCommand (command: string, registryEntry: CommandsNS.Item
      , count: number, lastKey: VKeyCodes, port: Port): void {
    const { options, repeat } = registryEntry;
    let scale: number | undefined;
    if (options && (scale = options.count)) { count = count * scale; }
    count = count >= 1e4 ? 9999 : count <= -1e4 ? 9999 : (count | 0) || 1;
    if (count === 1) {}
    else if (repeat === 1) { count = 1; }
    else if (repeat > 0 && (count > repeat || count < -repeat) && !confirm(command, Math.abs(count))) { return; }
    else { count = count || 1; }
    if (!registryEntry.background) {
      const { alias } = registryEntry,
      dot = ((
        (1 << kFgCmd.linkHints) | (1 << kFgCmd.unhoverLast) | (1 << kFgCmd.marks) |
        (1 << kFgCmd.passNextKey) | (1 << kFgCmd.autoCopy) | (1 << kFgCmd.focusInput)
      ) >> alias) & 1;
      port.postMessage({ name: kBgReq.execute, CSS: dot ? ensureInnerCSS(port) : null, command: alias, count, options });
      return;
    }
    const { alias } = registryEntry, func = BackgroundCommands[alias];
    cOptions = options || Object.create(null);
    cPort = port;
    commandCount = count;
    cKey = lastKey;
    count = BgCmdInfo[alias];
    if (count < UseTab.ActiveTab) {
      return (func as BgCmdNoTab)();
    } else if (count === UseTab.ActiveTab) {
      getCurTab(func as BgCmdActiveTab);
    } else {
      getCurTabs(func as BgCmdCurWndTabs);
    }
  }
  const
  requestHandlers: {
    [K in keyof FgReqWithRes | keyof FgReq]:
      K extends keyof SpecialHandlers ? SpecialHandlers[K] :
      K extends keyof FgReqWithRes ? (((this: void, request: FgReqWithRes[K], port: Port) => FgRes[K])
        | (K extends keyof FgReq ? (this: void, request: FgReq[K], port: Port) => void : never)) :
      K extends keyof FgReq ? ((this: void, request: FgReq[K], port: Port) => void) :
      never;
  } = [
    /** blank: */ function (this: void): void {},
    /** setSetting: */ function (this: void, request: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>, port: Port): void {
      const key = request.key;
      if (!(key in Settings.frontUpdateAllowed_)) {
        cPort = port;
        return Backend.complain_(`modify ${key} setting`);
      }
      Settings.set(key, request.value);
      if (key in Settings.payload) {
        type CacheValue = SettingsNS.FullCache[keyof SettingsNS.FrontUpdateAllowedSettings];
        (Settings.payload as SafeDict<CacheValue>)[key] = Settings.cache[key];
      }
    },
    /** findQuery: */ function (this: void, request: FgReq[kFgReq.findQuery] | FgReqWithRes[kFgReq.findQuery], port: Port): FgRes[kFgReq.findQuery] | void {
      return FindModeHistory.query(port.sender.incognito, request.query, request.index);
    },
    /** parseSearchUrl: */ function (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl], port: Port): FgRes[kFgReq.parseSearchUrl] | void {
      let search = Backend.parse_(request);
      if ("id" in request) {
        port.postMessage({ name: kBgReq.omni_parsed, id: request.id as number, search });
      } else {
        return search;
      }
    },
    /** parseUpperUrl: */ function (this: void, request: FgReqWithRes[kFgReq.parseUpperUrl], port?: Port): FgRes[kFgReq.parseUpperUrl] | void {
      if (port && (request as FgReq[kFgReq.parseUpperUrl]).execute) {
        const result = requestHandlers[kFgReq.parseUpperUrl](request);
        if (result.path != null) {
          port.postMessage<1, kFgCmd.reload>({ name: kBgReq.execute,
            CSS: null, command: kFgCmd.reload, count: 1,
            options: { url: result.url } });
          return;
        }
        cPort = port;
        Backend.showHUD_(result.url);
        return;
      }
      let { url } = request, url_l = url.toLowerCase();
      if (!Utils.protocolRe_.test(Utils.removeComposedScheme_(url_l))) {
        Utils.resetRe_();
        return { url: "This url has no upper paths", path: null };
      }
      let hash = "", str: string, arr: RegExpExecArray | null, startSlash = false, endSlash = false
        , path: string | null = null, i: number, start = 0, end = 0, decoded = false, arr2: RegExpExecArray | null;
      if (i = url.lastIndexOf("#") + 1) {
        hash = url.substring(i + +(url[i] === "!"));
        str = Utils.DecodeURLPart_(hash);
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
            str = "https://example.com/";
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
              path = Utils.DecodeURLPart_(arr2[2]);
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
        if (url_l.startsWith(BrowserProtocol)) {
          Utils.resetRe_();
          return { url: "An extension has no upper-level pages", path: null };
        }
        hash = "";
        start = url.indexOf("/", url.indexOf("://") + 3);
        if (url_l.startsWith("filesystem:")) { start = url.indexOf("/", start + 1); }
        i = url.indexOf("?", start);
        end = url.indexOf("#", start);
        i = end < 0 ? i : i < 0 ? end : i < end ? i : end;
        i = i > 0 ? i : url.length;
        path = url.substring(start, i);
        end = 0;
        decoded = false;
      }
      i = request.upper;
      startSlash = path.startsWith("/");
      if (!hash && url_l.startsWith("file:")) {
        if (path.length <= 1 || url.length === 11 && url.endsWith(":/")) {
          Utils.resetRe_();
          return { url: "This has been the root path", path: null };
        }
        endSlash = true;
        i === 1 && (i = -1);
      } else if (!hash && url_l.startsWith("ftp:")) {
        endSlash = true;
      } else {
        endSlash = request.trailing_slash != null ? !!request.trailing_slash
          : path.length > 1 && path.endsWith("/");
      }
      if (!i || i === 1) {
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
      Utils.resetRe_();
      return { url, path };
    } as SpecialHandlers[kFgReq.parseUpperUrl],
    /** searchAs: */ function (this: void, request: FgReq[kFgReq.searchAs], port: Port): void {
      let search = Backend.parse_(request), query: string | null | Promise<string | null>;
      if (!search || !search.keyword) {
        cPort = port;
        return Backend.showHUD_("No search engine found!");
      }
      query = request.search.trim() || VClipboard.paste();
      if (query instanceof Promise) {
        query.then(doSearch, () => doSearch(null));
        return;
      }
      return doSearch(query);
      function doSearch(this: void, query: string | null): void {
        let err = query === null ? "It's not allowed to read clipboard"
          : (query = (query as string).trim()) ? "" : "No selected or copied text found";
        if (err) {
          cPort = port;
          return Backend.showHUD_(err);
        }
        query = Utils.createSearchUrl_((query as string).split(Utils.spacesRe), (search as ParsedSearch).keyword);
        return safeUpdate(query);
      }
    },
    /** gotoSession: */ function (this: void, request: FgReq[kFgReq.gotoSession], port?: Port): void {
      const id = request.sessionId, active = request.active !== false;
      if (typeof id === "number") {
        return selectTab(id, true);
      }
      if (!chrome.sessions) {
        cPort = findCPort(port) as Port;
        return complainNoSession();
      }
      chrome.sessions.restore(id, onRuntimeError);
      if (active) { return; }
      let tabId = (port as Port).sender.tabId;
      tabId >= 0 || (tabId = TabRecency.last);
      if (tabId >= 0) { return selectTab(tabId); }
    },
    /** openUrl: */ function (this: void, request: FgReq[kFgReq.openUrl] & { url_f?: Urls.Url, opener?: boolean }, port?: Port): void {
      Object.setPrototypeOf(request, null);
      let unsafe = port != null && isNotVomnibarPage(port, true);
      cPort = unsafe ? port as Port : findCPort(port) || cPort;
      let url: Urls.Url | undefined = request.url;
      if (url) {
        if (url[0] === ":" && request.omni && (<RegExpOne>/^:[bdhost]\s/).test(url)) {
          url = url.substring(2).trim();
          url || (unsafe = false);
        }
        url = Utils.fixCharsInUrl_(url);
        url = Utils.convertToUrl(url, request.keyword || null, unsafe ? Urls.WorkType.ConvertKnown : Urls.WorkType.ActAnyway);
        const type = Utils.lastUrlType;
        if (request.https != null && (type === Urls.Type.NoSchema || type === Urls.Type.NoProtocolName)) {
          url = (request.https ? "https" : "http") + (url as string).substring((url as string)[4] === "s" ? 5 : 4);
        } else if (unsafe && type === Urls.Type.PlainVimium && (url as string).startsWith("vimium:")) {
          url = Utils.convertToUrl(url as string);
        }
        request.url = "";
        request.keyword = "";
        request.url_f = url;
        request.opener = unsafe;
      } else {
        request.opener = false;
      }
      commandCount = 1;
      // { url_f: string, keyword: "", url: "", ... } | { copied: true, ... }
      cOptions = request as (typeof request) & SafeObject;
      return BackgroundCommands[kBgCmd.openUrl]();
    },
    /** focus: */ function (this: void, _0: FgReq[kFgReq.focus], port: Port): void {
      let tabId = port.sender.tabId, ref = framesForTab[tabId] as Frames.WritableFrames | undefined, status: Frames.ValidStatus;
      if (!ref) {
        return needIcon ? Backend.setIcon_(tabId, port.sender.status) : undefined;
      }
      if (port === ref[0]) { return; }
      if (needIcon && (status = port.sender.status) !== ref[0].sender.status) {
        ref[0] = port;
        return Backend.setIcon_(tabId, status);
      }
      ref[0] = port;
    },
    /** checkIfEnabled: */ function (this: void, request: ExclusionsNS.Details | FgReq[kFgReq.checkIfEnabled]
        , port?: Frames.Port | null): void {
      if (!port || !port.postMessage) {
        port = indexFrame((request as ExclusionsNS.Details).tabId, (request as ExclusionsNS.Details).frameId);
        if (!port) { return; }
      }
      const { sender } = port, { url: oldUrl, tabId } = sender
        , pattern = Backend.getExcluded_(sender.url = request.url)
        , status = pattern === null ? Frames.Status.enabled : pattern
            ? Frames.Status.partial : Frames.Status.disabled;
      if (sender.status !== status) {
        if (sender.flags & Frames.Flags.locked) { return; }
        sender.status = status;
        if (needIcon && (framesForTab[tabId] as Frames.Frames)[0] === port) {
          Backend.setIcon_(tabId, status);
        }
      } else if (!pattern || pattern === Backend.getExcluded_(oldUrl)) {
        return;
      }
      port.postMessage({ name: kBgReq.reset, passKeys: pattern });
    },
    /** nextFrame: */ function (this: void, request: FgReq[kFgReq.nextFrame], port: Port): void {
      cPort = port;
      commandCount = 1;
      cKey = request.key;
      const type = request.type || Frames.NextType.Default;
      if (type !== Frames.NextType.current) {
        return BackgroundCommands[type === Frames.NextType.parent ? kBgCmd.parentFrame : kBgCmd.nextFrame]();
      }
      const ports = framesForTab[port.sender.tabId];
      if (ports) {
        ports[0].postMessage({
          name: kBgReq.focusFrame,
          key: cKey,
          mask: FrameMaskType.NoMask
        });
        return;
      }
      try { port.postMessage({ name: kBgReq.omni_returnFocus, key: cKey }); } catch (e) {}
    },
    /** exitGrab: */ function (this: void, _0: FgReq[kFgReq.exitGrab], port: Port): void {
      const ports = framesForTab[port.sender.tabId];
      if (!ports) { return; }
      ports[0].sender.flags |= Frames.Flags.userActed;
      if (ports.length < 3) { return; }
      for (let msg = { name: kBgReq.exitGrab as kBgReq.exitGrab }, i = ports.length; 0 < --i; ) {
        const p = ports[i];
        if (p !== port) {
          p.postMessage(msg);
          p.sender.flags |= Frames.Flags.userActed;
        }
      }
    },
    /** execInChild: */ function (this: void, request: FgReqWithRes[kFgReq.execInChild], port: Port): FgRes[kFgReq.execInChild] {
      const ports = framesForTab[port.sender.tabId], url = request.url;
      if (!ports || ports.length < 3) { return false; }
      let iport: Port | null = null, i = ports.length;
      while (1 <= --i) {
        if (ports[i].sender.url === url) {
          if (iport) { return false; }
          iport = ports[i];
        }
      }
      if (iport) {
        iport.postMessage({
          name: kBgReq.execute,
          CSS: request.CSS ? ensureInnerCSS(iport) : null,
          command: request.command, count: request.count || 1, options: request.options
        });
        return true;
      }
      return false;
    },
    /** initHelp: */ function (this: void, request: FgReq[kFgReq.initHelp], port: Port): void {
      if (port.sender.url.startsWith(Settings.CONST.OptionsPage)) {
        request.unbound = true;
        request.names = true;
      }
      Promise.all([
        Utils.require<BaseHelpDialog>('HelpDialog'),
        request, port,
        new Promise<void>(function(resolve, reject) {
          const xhr = Settings.fetchFile("helpDialog", resolve);
          xhr instanceof XMLHttpRequest && (xhr.onerror = reject);
        })
      ]).then(function(args): void {
        const port = args[1].wantTop && indexFrame(args[2].sender.tabId, 0) || args[2];
        (port.sender as Frames.Sender).flags |= Frames.Flags.hadHelpDialog;
        port.postMessage({
          name: kBgReq.showHelpDialog,
          CSS: ensureInnerCSS(port),
          html: args[0].render_(args[1]),
          optionUrl: Settings.CONST.OptionsPage,
          advanced: Settings.get("showAdvancedCommands", true)
        });
      }, function(args): void {
        console.error("Promises for initHelp failed:", args[0], ';', args[3]);
      });
    },
    /** css: */ function (this: void, _0: {}, port: Port): void {
      const CSS = ensureInnerCSS(port);
      if (CSS) {
        port.postMessage({ name: kBgReq.showHUD, CSS });
      } else if (!Settings.cache.innerCSS) {
        setTimeout(retryCSS, 34, port, 1);
      }
    },
    /** vomnibar: */ function (this: void, request: FgReq[kFgReq.vomnibar] & Req.baseFg<kFgReq.vomnibar>, port: Port): void {
      const { count, inner } = request;
      if (count != null) {
        delete request.count, delete request.handler, delete request.inner;
        commandCount = +count || 1;
        cOptions = Object.setPrototypeOf(request, null);
      } else if (request.redo !== true) {
        return;
      } else if (cOptions == null || cOptions.secret !== -1) {
        if (inner) { return; }
        cOptions = Object.create(null);
        commandCount = 1;
      } else if (inner && (cOptions as any as CmdOptions[kFgCmd.vomnibar]).vomnibar === Settings.CONST.VomnibarPageInner_) {
        return;
      }
      cPort = port;
      return (BackgroundCommands[kBgCmd.showVomnibar] as (this: void, forceInner?: boolean) => void)(inner);
    },
    /** omni: */ function (this: void, request: FgReq[kFgReq.omni], port: Port): void {
      if (isNotVomnibarPage(port)) { return; }
      return Completion.filter_(request.query, request,
      PostCompletions.bind<Port, 0 | 1 | 2, [Readonly<CompletersNS.Suggestion>[], boolean, CompletersNS.MatchType, number], void>(port
        , (<number>request.favIcon | 0) as number as 0 | 1 | 2));
    },
    /** copy: */ function (this: void, request: FgReq[kFgReq.copy]): void {
      VClipboard.copy(request.data);
    },
    /** key: */ function (this: void, request: FgReq[kFgReq.key], port: Port): void {
      (port.sender as Frames.RawSender).flags |= Frames.Flags.userActed;
      let key: string = request.key, count = 1;
      let arr: null | string[] = numHeadRe.exec(key);
      if (arr != null) {
        let prefix = arr[0];
        key = key.substring(prefix.length);
        count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1;
      }
      const ref = CommandsData.keyToCommandRegistry_;
      if (!(key in ref)) {
        arr = key.match(Utils.keyRe_) as string[];
        key = arr[arr.length - 1];
        count = 1;
      }
      const registryEntry = ref[key] as CommandsNS.Item;
      Utils.resetRe_();
      return executeCommand(registryEntry.command, registryEntry, count, request.lastKey, port);
    },
    /** marks: */ function (this: void, request: FgReq[kFgReq.marks], port: Port): void {
      cPort = port;
      switch (request.action) {
      case "create": return Marks.createMark(request, port);
      case "goto": return Marks.gotoMark(request, port);
      case "clear": return Marks.clear(request.url);
      default: return;
      }
    },
    /** safe when cPort is null */
    /** focusOrLaunch: */ function (this: void, request: MarksNS.FocusOrLaunch, _port?: Port | null, notFolder?: true): void {
      // * do not limit windowId or windowType
      let url = Utils.reformatURL_(request.url.split("#", 1)[0]), callback = focusOrLaunch[0];
      let cb2: (result: Tab[], exArg: FakeArg) => void;
      if (url.startsWith("file:") && !notFolder && url.substring(url.lastIndexOf("/") + 1).indexOf(".") < 0) {
        url += "/";
        cb2 = function(tabs): void {
          return tabs && tabs.length > 0 ? callback.call(request, tabs) : requestHandlers[kFgReq.focusOrLaunch](request, null, true);
        };
      } else {
        request.prefix && (url += "*");
        cb2 = callback.bind(request);
      }
      chrome.tabs.query({ url, windowType: "normal" }, cb2);
    },
    /** cmd: */ function (this: void, request: FgReq[kFgReq.cmd], port: Port): void {
      const cmd = request.cmd, id = request.id;
      if (id && gCmdTimer !== id) { return; } // an old / aborted message
      if (gCmdTimer) {
        clearTimeout(gCmdTimer);
        gCmdTimer = 0;
      }
      execute(cmd, CommandsData.cmdMap_[cmd] || null, request.count, port);
    },
    /** blurTest: */ function (this: void, _0: FgReq[kFgReq.blurTest], port: Port): void {
      if (port.sender.tabId < 0) {
        port.postMessage({ name: kBgReq.omni_blurred });
        return;
      }
      setTimeout(function(): void {
        if (port.sender.tabId === TabRecency.last && framesForOmni.indexOf(port) >= 0) {
          port.postMessage({ name: kBgReq.omni_blurred });
        }
      }, 50);
    },
    /** removeSug: */ function (this: void, req: FgReq[kFgReq.removeSug], port?: Port): void {
      return Backend.removeSug_(req, port);
    }
  ],
    framesForOmni: Frames.WritableFrames = [null as never];
    function OnMessage <K extends keyof FgReq, T extends keyof FgRes> (this: void, request: Req.fg<K> | Req.fgWithRes<T>, port: Frames.Port): void {
      type ReqK = keyof FgReq;
      type ResK = keyof FgRes;
      if (request.handler !== kFgReq.msg) {
        return (requestHandlers as {
          [T2 in ReqK]: (req: Req.fg<T2>, port: Frames.Port) => void;
        } as {
          [T2 in ReqK]: <T3 extends ReqK>(req: Req.fg<T3>, port: Frames.Port) => void;
        })[request.handler](request as Req.fg<K>, port);
      }
      port.postMessage<T>({
        name: kBgReq.msg,
        mid: (request as Req.fgWithRes<T>).mid,
        response: (requestHandlers as {
          [T2 in ResK]: (req: Req.fgWithRes<T2>, port: Frames.Port) => FgRes[T2];
        } as {
          [T2 in ResK]: <T3 extends ResK>(req: Req.fgWithRes<T3>, port: Frames.Port) => FgRes[T3];
        })[(request as Req.fgWithRes<T>).msg](request as Req.fgWithRes<T>, port)
      });
    }
    function OnConnect (this: void, port: Frames.Port): void {
      const type = (port.name.substring(9) as string | number as number) | 0,
      sender = formatPortSender(port), { tabId, url } = sender;
      let status: Frames.ValidStatus, ref = framesForTab[tabId] as Frames.WritableFrames | undefined;
      if (type >= PortType.omnibar || (url === Settings.cache.vomnibarPage_f)) {
        if (type < PortType.knownStatusBase) {
          if (onOmniConnect(port, tabId, type)) {
            return;
          }
          status = Frames.Status.enabled;
          sender.flags = Frames.Flags.userActed;
        } else if (type === PortType.CloseSelf) {
          sender.frameId || chrome.tabs.remove(tabId);
          return;
        } else {
          status = ((type >>> PortType.BitOffsetOfKnownStatus) & PortType.MaskOfKnownStatus) - 1;
          sender.flags = ((type & PortType.isLocked) ? Frames.Flags.lockedAndUserActed : Frames.Flags.userActed
            ) + ((type & PortType.hasCSS) && Frames.Flags.hasCSS);
        }
        port.postMessage({
          name: kBgReq.settingsUpdate,
          delta: Settings.payload
        });
      } else {
        let pass: null | string, flags: Frames.Flags = Frames.Flags.blank;
        if (ref && ((flags = sender.flags = ref[0].sender.flags & Frames.Flags.InheritedFlags) & Frames.Flags.locked)) {
          status = ref[0].sender.status;
          pass = status !== Frames.Status.disabled ? null : "";
        } else {
          pass = Backend.getExcluded_(url);
          status = pass === null ? Frames.Status.enabled : pass ? Frames.Status.partial : Frames.Status.disabled;
        }
        port.postMessage({
          name: kBgReq.init,
          flags,
          load: Settings.payload,
          passKeys: pass,
          mapKeys: CommandsData.mapKeyRegistry_,
          keyMap: CommandsData.keyMap_
        });
      }
      sender.status = status;
      port.onDisconnect.addListener(OnDisconnect);
      port.onMessage.addListener(OnMessage);
      if (ref) {
        ref.push(port);
        if (type & PortType.hasFocus) {
          if (needIcon && ref[0].sender.status !== status) {
            Backend.setIcon_(tabId, status);
          }
          ref[0] = port;
        }
      } else {
        framesForTab[tabId] = [port, port];
        status !== Frames.Status.enabled && needIcon && Backend.setIcon_(tabId, status);
      }
      if (NoFrameId) {
        (sender as any).frameId = (type & PortType.isTop) ? 0 : ((Math.random() * 9999997) | 0) + 2;
      }
    }
    function OnDisconnect (this: void, port: Port): void {
      let { tabId } = port.sender, i: number, ref = framesForTab[tabId] as Frames.WritableFrames | undefined;
      if (!ref) { return; }
      i = ref.lastIndexOf(port);
      if (!port.sender.frameId) {
        if (i >= 0) {
          delete framesForTab[tabId];
        }
        return;
      }
      if (i === ref.length - 1) {
        --ref.length;
      } else if (i >= 1) {
        ref.splice(i, 1);
      }
      if (ref.length <= 1) {
        delete framesForTab[tabId];
        return;
      }
      if (port === ref[0]) {
        ref[0] = ref[1];
      }
    }
    function onOmniConnect (port: Frames.Port, tabId: number, type: PortType): boolean {
      if (type >= PortType.omnibar) {
        if (!isNotVomnibarPage(port)) {
          framesForOmni.push(port);
          if (tabId < 0) {
            (port.sender as Frames.RawSender).tabId = type !== PortType.omnibar ? _fakeTabId--
               : cPort ? cPort.sender.tabId : TabRecency.last;
          }
          port.onDisconnect.addListener(OnOmniDisconnect);
          port.onMessage.addListener(OnMessage);
          port.postMessage({
            name: kBgReq.omni_secret,
            browserVersion: Settings.CONST.ChromeVersion,
            secret: getSecret()
          });
          return true;
        }
      } else if (tabId < 0 // should not be true; just in case of misusing
        || Settings.CONST.ChromeVersion < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
        || port.sender.frameId === 0
        ) {
      } else {
        chrome.tabs.executeScript(tabId, {
          file: Settings.CONST.VomnibarScript_,
          frameId: port.sender.frameId,
          runAt: "document_start"
        });
        port.disconnect();
        return true;
      }
      return false;
    }
    function OnOmniDisconnect (this: void, port: Port): void {
      const ref = framesForOmni, i = ref.lastIndexOf(port);
      if (i === ref.length - 1) {
        --ref.length;
      } else if (i >= 0) {
        ref.splice(i, 1);
      }
    }
    function formatPortSender (port: Frames.RawPort): Frames.Sender {
      const sender = port.sender, tab = sender.tab || {
        id: _fakeTabId--,
        url: "",
        incognito: false
      };
      return port.sender = {
        frameId: sender.frameId || 0,
        incognito: tab.incognito,
        status: Frames.Status.enabled,
        flags: Frames.Flags.blank,
        tabId: tab.id,
        url: sender.url || (tab as any).url || ""
      };
    }
  const
  getSecret = (function (this: void): (this: void) => number {
    let secret = 0, time = 0;
    return function(this: void): number {
      const now = Date.now();
      if (now - time > GlobalConsts.VomnibarSecretTimeout) {
        secret = 1 + (0 | (Math.random() * 0x6fffffff));
      }
      time = now;
      return secret;
    };
  })();

  Backend = {
    gotoSession_: requestHandlers[kFgReq.gotoSession],
    openUrl_: requestHandlers[kFgReq.openUrl],
    checkIfEnabled_: requestHandlers[kFgReq.checkIfEnabled],
    focus: requestHandlers[kFgReq.focusOrLaunch],
    getExcluded_: Utils.getNull_,
    IconBuffer_: null,
    removeSug_ (this: void, { type, url }: FgReq[kFgReq.removeSug], port?: Port | null): void {
      const name = type === "tab" ? type : type + " item";
      cPort = findCPort(port) as Port;
      if (type === "tab" && TabRecency.last === +url) {
        return Backend.showHUD_("The current tab should be kept.");
      }
      return Completion.removeSug_(url, type, function(succeed): void {
        return Backend.showHUD_(succeed ? `Succeed to delete a ${name}` : `The ${name} is not found!`);
      });
    },
    setIcon_ (): void {},
    complain_ (action: string): void {
      return this.showHUD_("It's not allowed to " + action);
    },
    parse_ (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl]): FgRes[kFgReq.parseSearchUrl] {
      let s0 = request.url, url = s0.toLowerCase(), pattern: Search.Rule | undefined
        , arr: string[] | null = null, _i: number, selectLast = false;
      if (!Utils.protocolRe_.test(Utils.removeComposedScheme_(url))) {
        Utils.resetRe_();
        return null;
      }
      if (request.upper) {
        const obj = requestHandlers[kFgReq.parseUpperUrl](request as FgReqWithRes[kFgReq.parseUpperUrl]);
        obj.path != null && (s0 = obj.url);
        return { keyword: '', start: 0, url: s0 };
      }
      const decoders = Settings.cache.searchEngineRules;
      if (_i = Utils.IsURLHttp_(url)) {
        url = url.substring(_i);
        s0 = s0.substring(_i);
      }
      for (_i = decoders.length; 0 <= --_i; ) {
        pattern = decoders[_i];
        if (!url.startsWith(pattern.prefix)) { continue; }
        arr = s0.substring(pattern.prefix.length).match(pattern.matcher);
        if (arr) { break; }
      }
      if (!arr || !pattern) { Utils.resetRe_(); return null; }
      if (arr.length > 1 && !pattern.matcher.global) { arr.shift(); }
      const re = pattern.delimiter;
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
      url = "";
      for (_i = 0; _i < arr.length; _i++) { url += " " + Utils.DecodeURLPart_(arr[_i]); }
      url = url.trim().replace(Utils.spacesRe, " ");
      Utils.resetRe_();
      return {
        keyword: pattern.name,
        url,
        start: selectLast ? url.lastIndexOf(" ") + 1 : 0
      };
    },
    reopenTab_ (this: void, tab: Tab, refresh?: boolean): void {
      if (refresh) {
        chrome.tabs.remove(tab.id, onRuntimeError);
        let step = RefreshTabStep.start;
        const tabId = tab.id, onRefresh = function(this: void): void {
          const err = chrome.runtime.lastError;
          if (err as any) {
            chrome.sessions.restore();
            return err;
          }
          step = step + 1;
          if (step >= RefreshTabStep.end) { return; }
          setTimeout(function(): void {
            chrome.tabs.get(tabId, onRefresh);
          }, 50 * step * step);
        }
        chrome.tabs.get(tabId, onRefresh);
        return;
      }
      tabsCreate({
        windowId: tab.windowId,
        index: tab.index,
        url: tab.url,
        active: tab.active,
        pinned: tab.pinned,
        openerTabId: tab.openerTabId,
      });
      chrome.tabs.remove(tab.id);
      // not seems to need to restore muted status
    },
    showHUD_ (message: string, isCopy?: boolean): void {
      try {
        cPort && cPort.postMessage({
          name: kBgReq.showHUD,
          CSS: ensureInnerCSS(cPort),
          text: message,
          isCopy: isCopy === true
        });
      } catch (e) {
        cPort = null as never;
      }
    },
    forceStatus (act: Frames.ForcedStatusText, tabId?: number): void {
      const ref = framesForTab[tabId || (tabId = TabRecency.last)];
      if (!ref) { return; }
      act = act.toLowerCase() as Frames.ForcedStatusText;
      const always_enabled = Exclusions == null || Exclusions.rules.length <= 0, oldStatus = ref[0].sender.status,
      stat = act === "enable" ? Frames.Status.enabled : act === "disable" ? Frames.Status.disabled
        : act === "toggle" ? oldStatus === Frames.Status.disabled ? Frames.Status.enabled : Frames.Status.disabled
        : null,
      locked = stat !== null, unknown = !(locked || always_enabled),
      msg: Req.bg<kBgReq.reset> = { name: kBgReq.reset, passKeys: stat !== Frames.Status.disabled ? null : "", forced: locked };
      cPort = indexFrame(tabId, 0) || ref[0];
      if (stat === null && tabId < 0) {
        oldStatus !== Frames.Status.disabled && this.showHUD_("Got an unknown action on status: " + act);
        return;
      }
      let pattern: string | null, newStatus = locked ? stat as Frames.ValidStatus : Frames.Status.enabled;
      for (let i = ref.length; 1 <= --i; ) {
        const port = ref[i], sender = port.sender;
        sender.flags = locked ? sender.flags | Frames.Flags.locked : sender.flags & ~Frames.Flags.locked;
        if (unknown) {
          pattern = msg.passKeys = this.getExcluded_(sender.url);
          newStatus = pattern === null ? Frames.Status.enabled : pattern
            ? Frames.Status.partial : Frames.Status.disabled;
          if (newStatus !== Frames.Status.partial && sender.status === newStatus) { continue; }
        }
        // must send "reset" messages even if port keeps enabled by 'v.st enable' - frontend may need to reinstall listeners
        sender.status = newStatus;
        port.postMessage(msg);
      }
      newStatus !== Frames.Status.disabled && this.showHUD_("Now the page status is " + (
        newStatus === Frames.Status.enabled ? "enabled" : "partially disabled" ));
      if (needIcon && (newStatus = ref[0].sender.status) !== oldStatus) {
        return this.setIcon_(tabId, newStatus);
      }
    },
    ExecuteGlobal_ (this: void, cmd: string): void {
      const tabId = TabRecency.last, ports = framesForTab[tabId];
      if (cmd === "quickNext") { cmd = "nextTab"; }
      if (ports == null || (ports[0].sender.flags & Frames.Flags.userActed)) {
        return executeGlobal(cmd, ports);
      }
      ports && (ports[0].sender.flags |= Frames.Flags.userActed);
      chrome.tabs.get(tabId, function(tab): void {
        executeGlobal(cmd, tab && tab.status === "complete" ? framesForTab[tab.id] : null);
        return chrome.runtime.lastError;
      });
    },
    indexPorts: function (tabId?: number, frameId?: number): Frames.FramesMap | Frames.Frames | Port | null {
      return tabId == null ? framesForTab : frameId == null ? (framesForTab[tabId] || null)
        : indexFrame(tabId, frameId);
    } as BackendHandlersNS.BackendHandlers["indexPorts"],
    onInit_(): void {
      // the line below requires all necessary have inited when calling this
      Backend.onInit_ = null;
    chrome.runtime.onConnect.addListener(OnConnect);
    if (!chrome.runtime.onConnectExternal) { return; }
    Settings.extWhiteList_ || Settings.postUpdate_("extWhiteList");
    chrome.runtime.onConnectExternal.addListener(function(port): void {
      const { sender } = port;
      if (sender && isExtIdAllowed(sender.id)
          && port.name.startsWith("vimium-c")) {
        return OnConnect(port as Frames.RawPort as Frames.Port);
      } else {
        port.disconnect();
      }
    });
  }
  };

  if (Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito) {
    (createTab as Array<Function>).length = 1;
  }
  Settings.updateHooks_.newTabUrl_f = function(url) {
    const onlyNormal = Utils.isRefusingIncognito_(url), mayForceIncognito = createTab.length > 1 && onlyNormal;
    BackgroundCommands[kBgCmd.createTab] = mayForceIncognito ? function(): void {
      getCurWnd(true, createTab[1].bind(url));
    } : createTab[0].bind(null, url, onlyNormal);
    BgCmdInfo[kBgCmd.createTab] = mayForceIncognito ? UseTab.NoTab : UseTab.ActiveTab;
  };

  Settings.updateHooks_.showActionIcon = function (value) {
    needIcon = value && !!chrome.browserAction;
  };

  chrome.runtime.onMessageExternal && (chrome.runtime.onMessageExternal.addListener(function(this: void, message, sender, sendResponse): void {
    let command: string | undefined;
    if (!isExtIdAllowed(sender.id)) {
      sendResponse(false);
      return;
    }
    if (typeof message === "string") {
      command = message;
      if (command && CommandsData.availableCommands_[command]) {
        const tab = sender.tab, frames = tab ? framesForTab[tab.id] : null,
        port = frames ? indexFrame((tab as Tab).id, sender.frameId || 0) || frames[0] : null;
        return execute(command, null, 1, port);
      }
      return;
    }
    if (typeof message !== "object") { return; }
    switch (message.handler as kFgReq) {
    case kFgReq.command:
      command = message.command ? message.command + "" : "";
      if (command && CommandsData.availableCommands_[command]) {
        const tab = sender.tab, frames = tab ? framesForTab[tab.id] : null,
        port = frames ? indexFrame((tab as Tab).id, sender.frameId || 0) || frames[0] : null;
        return execute(command, message.options, message.count, port, message.key);
      }
      return;
    case kFgReq.inject:
      (sendResponse as (res: ExternalMsgs[kFgReq.inject]["res"]) => void | 1)({
        scripts: Settings.CONST.ContentScripts_, version: Settings.CONST.CurrentVersion
      });
      return;
    }
  }), Settings.postUpdate_("extWhiteList"));

  chrome.tabs.onReplaced && chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    const ref = framesForTab, frames = ref[removedTabId];
    if (!frames) { return; }
    delete ref[removedTabId];
    ref[addedTabId] = frames;
    for (let i = frames.length; 0 < --i; ) {
      (frames[i].sender as Frames.RawSender).tabId = addedTabId;
    }
  });

  Settings.postUpdate_("payload", null);
  Settings.postUpdate_("vomnibarPage"); // not wait 34ms in case that Vomnibar is wanted at once
  Settings.postUpdate_("searchUrl", null); // will also update newTabUrl

  // will run only on <F5>, not on runtime.reload
  window.onunload = function(event): void {
    if (event && event.isTrusted === false) { return; }
    let ref = framesForTab as Frames.FramesMapToDestroy;
    ref.omni = framesForOmni;
    for (const tabId in ref) {
      const arr = ref[tabId], end = arr.length;
      for (let i = 1; i < end; i++) {
        arr[i].disconnect();
      }
    }
  };
})();
