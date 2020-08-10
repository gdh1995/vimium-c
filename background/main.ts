(function (): void {
  interface LatestPromise extends Promise<void> {
    finally (onFinally: (() => void) | Promise<void>): LatestPromise;
  }
  type Tab = chrome.tabs.Tab;
  type Window = chrome.windows.Window;
  type WindowWithTabs = Window & { tabs: Tab[] };
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
  interface InfoToCreateMultiTab extends
      Partial<Pick<chrome.tabs.CreateProperties, "index" | "openerTabId" | "windowId">> {
    url: string;
    active: boolean;
    pinned?: boolean;
  }
  const enum UseTab { NoTab = 0, ActiveTab = 1, CurWndTabsIfRepeat = 2, CurWndTabs = 3, CurShownTabs = 4 }
  type BgCmdNoTab = (this: void, _fakeArg?: undefined) => void;
  type BgCmdActiveTab = (this: void, tabs1: [Tab]) => void;
  type BgCmdActiveTabOrNoTab = (this: void, tabs1?: [Tab]) => void;
  type BgCmdCurWndTabs = (this: void, tabs1: Tab[]) => void;
  interface BgCmdInfoNS {
    [kBgCmd.createTab]: UseTab.ActiveTab | UseTab.NoTab;
    [kBgCmd.openUrl]: UseTab.ActiveTab | UseTab.NoTab;

    [kBgCmd.goToTab]: UseTab.CurShownTabs | UseTab.CurWndTabs;
    [kBgCmd.removeTabsR]: UseTab.CurWndTabs;
    [kBgCmd.removeRightTab]: UseTab.CurWndTabs;
    [kBgCmd.discardTab]: UseTab.CurWndTabs;
    [kBgCmd.togglePinTab]: UseTab.CurWndTabsIfRepeat;
    [kBgCmd.reloadTab]: UseTab.CurWndTabsIfRepeat;
    [kBgCmd.moveTab]: UseTab.CurWndTabs;
    [kBgCmd.visitPreviousTab]: UseTab.CurShownTabs | UseTab.CurWndTabs;

    [kBgCmd.moveTabToNextWindow]: UseTab.ActiveTab;
    [kBgCmd.toggleCS]: UseTab.ActiveTab;
    [kBgCmd.searchInAnother]: UseTab.ActiveTab;
    [kBgCmd.reopenTab]: UseTab.ActiveTab;
    [kBgCmd.toggleTabUrl]: UseTab.ActiveTab;
    [kBgCmd.toggleVomnibarStyle]: UseTab.ActiveTab;
    [kBgCmd.goBackFallback]: UseTab.ActiveTab;
  }

  interface ReopenOptions extends chrome.tabs.CreateProperties {
    id: number;
    url: string;
  }
  interface OpenUrlOptionsInBgCmd extends OpenUrlOptions {
    url_f?: Urls.Url;
    reuse?: UserReuseType;
    copied?: boolean;
    keyword?: string | null;
    testUrl?: boolean | null
  }
  type ShowPageData = [string, typeof Settings_.temp_.shownHash_, number];

  const enum RefreshTabStep {
    start = 0,
    s1, s2, s3, s4,
    end,
  }
  interface SpecialHandlers {
    [kFgReq.setSetting]: (this: void
      , request: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>, port: Port) => void;
    [kFgReq.gotoSession]: BackendHandlersNS.BackendHandlers["gotoSession_"];
    [kFgReq.checkIfEnabled]: ExclusionsNS.Listener & (
        (this: void, request: FgReq[kFgReq.checkIfEnabled], port: Frames.Port) => void);
    [kFgReq.parseUpperUrl]: {
      (this: void,
        request: FgReqWithRes[kFgReq.parseUpperUrl] & Pick<FgReq[kFgReq.parseUpperUrl], "e">, port: Port | null): void;
      (this: void, request: FgReqWithRes[kFgReq.parseUpperUrl], port?: Port): FgRes[kFgReq.parseUpperUrl];
    };
    [kFgReq.focusOrLaunch]: (this: void, request: MarksNS.FocusOrLaunch, _port?: Port | null, notFolder?: true) => void;
    [kFgReq.setOmniStyle]: (this: void, request: FgReq[kFgReq.setOmniStyle], _port?: Port) => void;
    [kFgReq.framesGoBack]: {
      (this: void, req: FgReq[kFgReq.framesGoBack], port: Port): void;
      (this: void, req: FgReq[kFgReq.framesGoBack], port: null
          , tabId: Pick<Tab, "id" | "url" | "pendingUrl" | "index">): void
    };
  }
  interface SpecialCommands {
    [kBgCmd.removeTab]: (this: void, called?: 1 | 2, tabs?: readonly Tab[]) => void;
  }

  /** any change to `cRepeat` should ensure it won't be `0` */
  let cOptions: CommandsNS.Options = null as never, cPort: Frames.Port = null as never, cRepeat = 1,
  cNeedConfirm: BOOL = 1, gOnConfirmCallback: ((arg: FakeArg) => void) | null | undefined = null,
  _fakeTabId: number = GlobalConsts.MaxImpossibleTabId,
  needIcon = false, cKey: kKeyCode = kKeyCode.None,
  _lockToRemoveTempTab: {p: LatestPromise} | null | 0 = Build.BTypes & BrowserType.Firefox ? null : 0,
  gCmdTimer = 0, gTabIdOfExtWithVomnibar: number = GlobalConsts.TabIdNone;
  const getSecret = (function (this: void): (this: void) => number {
    let secret = 0, time = 0;
    return function (this: void): number {
      const now = Date.now(); // safe for time changes
      if (now - time > GlobalConsts.VomnibarSecretTimeout) {
        secret = 1 + (0 | (Math.random() * 0x6fffffff)) + (now & 0xfff)
      }
      time = now;
      return secret;
    };
  })(), abs = Math.abs;
  function setupSingletonCmdTimer(newTimer: number): void {
    if (gCmdTimer) {
      clearTimeout(gCmdTimer);
    }
    gCmdTimer = newTimer;
  }

  /* if not args.url, then "openerTabId" must not in args */
  function tabsCreate(args: chrome.tabs.CreateProperties, callback?: ((this: void, tab: Tab) => void) | null
      , evenIncognito?: boolean | -1): 1 {
    let { url } = args, type: Urls.NewTabType | undefined;
    if (!url) {
      url = Settings_.cache_.newTabUrl_f;
      if (TabRecency_.incognito_ === IncognitoType.true
          && (evenIncognito == -1 ? url.endsWith(Settings_.CONST_.BlankNewTab_) && url.startsWith(location.origin)
              : !evenIncognito && url.startsWith(location.protocol))) { /* empty */ }
      else if (Build.MayOverrideNewTab && Settings_.CONST_.OverrideNewTab_
          ? Settings_.cache_.focusNewTabContent
          : !(Build.BTypes & BrowserType.Firefox)
            || (Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox)
            || !Settings_.newTabs_[url]) {
        args.url = url;
      }
      if (!args.url) {
        delete args.url;
      }
    } else if (!(type = Settings_.newTabs_[url])) { /* empty */ }
    else if (type === Urls.NewTabType.browser) {
      // ignore Build.MayOverrideNewTab and other things,
      // so that if another extension manages the NTP, this line still works
      delete args.url;
    } else if (Build.MayOverrideNewTab && type === Urls.NewTabType.vimium) {
      /** if not MayOverride, no .vimium cases in {@link settings.ts#__init__} */
      args.url = Settings_.cache_.newTabUrl_f;
    }
    Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge) &&
      (delete args.openerTabId);
    return chrome.tabs.create(args, callback);
  }
  /** if count <= 1, only open once; option.url should not be required for kBgCmd.createTab */
  function openMultiTab(this: void, option: InfoToCreateMultiTab, count: number, evenIncognito?: boolean | -1): void {
    const wndId = option.windowId, hasIndex = option.index != null;
    tabsCreate(option, option.active ? function (tab) {
      tab && tab.windowId !== wndId && selectWnd(tab);
    } : null, evenIncognito);
    if (count < 2) { return; }
    option.active = false;
    do {
      hasIndex && ++option.index!;
      chrome.tabs.create(option);
    } while (--count > 1);
  }

  const framesForTab: Frames.FramesMap = BgUtils_.safeObj_<Frames.Frames>(),
  onRuntimeError = BgUtils_.runtimeError_,
  NoFrameId = Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome
      && CurCVer_ < BrowserVer.MinWithFrameId;
  function isExtIdAllowed(this: void, extId: string | null | undefined, url: string | undefined): boolean {
    if (extId == null) { extId = "unknown_sender"; }
    const list = Settings_.extAllowList_, stat = list[extId] as boolean | undefined;
    if (stat != null) { return stat; }
    if (url === Settings_.cache_.vomnibarPage_f) { return true; }
    if (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
        && stat == null && url) {
      url = new URL(url).host;
      if (list[url] === true) {
        return list[extId] = true;
      }
      if (url !== extId) {
        list[url] = extId;
      }
    }
    const backgroundLightYellow = "background-color:#fffbe5";
    console.log("%cReceive message from an extension/sender not in the allow list: %c%s",
      backgroundLightYellow, backgroundLightYellow + ";color:red", extId);
    return list[extId] = false;
  }
  function selectFrom(this: void, tabs: readonly Tab[], overrideIndexes?: BOOL): ActiveTab {
    Build.BTypes & BrowserType.Firefox && overrideIndexes && BgUtils_.overrideTabsIndexes_ff_!(tabs)
    for (let i = tabs.length; 0 < --i; ) {
      if (tabs[i].active) {
        return tabs[i]! as ActiveTab;
      }
    }
    return tabs[0]! as ActiveTab;
  }
  function newTabIndex(this: void, tab: Readonly<Pick<Tab, "index">>, pos: OpenUrlOptions["position"]
      , openerTabId?: boolean): number | undefined {
    return pos === "before" ? tab.index : pos === "start" || pos === "begin" ? 0
      : pos !== "end" ? tab.index + 1
      : Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & BrowserType.Firefox) || OnOther & BrowserType.Firefox)
        && openerTabId ? 3e4
      : undefined;
  }
  function makeWindow(this: void, option: chrome.windows.CreateData, state?: chrome.windows.ValidStates | ""
      , callback?: ((wnd: Window & {tabs: [Tab]}) => void) | null): void {
    const focused = option.focused !== false;
    if (!focused) {
      state !== "minimized" && (state = "normal");
    } else if (state === "minimized") {
      state = "normal";
    }
    if (state && (Build.MinCVer >= BrowserVer.MinCreateWndWithState || !(Build.BTypes & BrowserType.Chrome)
                  || CurCVer_ >= BrowserVer.MinCreateWndWithState)) {
      option.state = state;
      state = "";
    }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
      delete option.focused;
    } else {
      option.focused = true;
    }
    chrome.windows.create(option, state || !focused ? function (wnd) {
      callback && callback(wnd);
      if (!wnd) { return; } // do not return lastError: just throw errors for easier debugging
      const opt: chrome.windows.UpdateInfo = focused ? {} : { focused: false };
      state && (opt.state = state);
      chrome.windows.update(wnd.id, opt);
    } : callback || null);
  }
  function makeTempWindow(this: void, tabIdUrl: number | string, incognito: boolean
      , callback: (wnd: Window) => void): void {
    const isId = typeof tabIdUrl === "number", option: chrome.windows.CreateData = {
      type: "normal",
      focused: false,
      incognito,
      state: "minimized",
      tabId: isId ? tabIdUrl as number : undefined,
      url: isId ? undefined : tabIdUrl as string
    };
    if (Build.MinCVer < BrowserVer.MinCreateWndWithState && Build.BTypes & BrowserType.Chrome
        && CurCVer_ < BrowserVer.MinCreateWndWithState) {
      option.state = undefined;
      option.left = option.top = 0; option.width = option.height = 50;
    }
    chrome.windows.create(option, callback);
  }
  function safeUpdate(this: void, url: string, secondTimes?: true, tabs1?: [Tab]): void {
    if (!tabs1) {
      if (BgUtils_.isRefusingIncognito_(url) && secondTimes !== true) {
        getCurTab(safeUpdate.bind(null, url, true))
        return;
      }
    } else if (tabs1.length > 0 && tabs1[0].incognito && BgUtils_.isRefusingIncognito_(url)) {
      tabsCreate({ url });
      BgUtils_.resetRe_();
      return;
    }
    const arg = { url }, cb = onRuntimeError;
    if (tabs1) {
      chrome.tabs.update(tabs1[0].id, arg, cb);
    } else {
      chrome.tabs.update(arg, cb);
    }
    BgUtils_.resetRe_();
  }
  function onEvalUrl_(this: void, workType: Urls.WorkType, options: OpenUrlOptions, tabs: [Tab] | [] | undefined
      , arr: Urls.SpecialUrl): void {
    if (arr instanceof Promise) { arr.then(onEvalUrl_.bind(null, workType, options, tabs)); return; }
    BgUtils_.resetRe_();
    switch (arr[1]) {
    case Urls.kEval.copy:
      return Backend_.showHUD_((arr as Urls.CopyEvalResult)[0], kTip.noTextCopied);
    case Urls.kEval.paste:
    case Urls.kEval.plainUrl:
      if (options.$p || arr[1] === Urls.kEval.plainUrl) {
        workType = Urls.WorkType.Default;
      } else {
        options = BgUtils_.extendIf_(BgUtils_.safeObj_(), options);
        options.$p = 1;
      }
      cOptions = options as CommandsNS.Options;
      return openUrl(BgUtils_.convertToUrl_((arr as Urls.PasteEvalResult)[0]), workType, tabs);
    case Urls.kEval.status:
      if (workType >= Urls.WorkType.EvenAffectStatus) {
        Backend_.forceStatus_((arr as Urls.StatusEvalResult)[0]);
      }
      return;
    }
  }
  function complainNoSession(this: void): void {
    (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
    || Build.MinCVer >= BrowserVer.MinSessions || CurCVer_ >= BrowserVer.MinSessions
      ? Backend_.complain_("control tab sessions")
      : Backend_.showHUD_(`Vimium C can not control tab sessions before Chrome ${BrowserVer.MinSessions}`);
  }
  function upperGitUrls(url: string, path: string): string | void | null {
    const obj = BgUtils_.safeParseURL_(url), host: string | undefined = obj ? obj.host : "";
    if (!host) { return; }
    if (!(<RegExpI> /git\b|\bgit/i).test(host) || !(<RegExpI> /^[\w\-]+(\.\w+)?(:\d{2,5})?$/).test(host)) {
      return;
    }
    let arr = path.split("/"), lastIndex = arr.length - 1;
    if (!arr[lastIndex]) { lastIndex--; arr.pop(); }
    let last = arr[lastIndex];
    if (host === "github.com") {
      if (lastIndex === 3) {
        return last === "pull" || last === "milestone" ? path + "s"
          : last === "tree" || last === "blob" ? arr.slice(0, 3).join("/")
          : null;
      } else if (lastIndex === 4 && arr[3] === "releases" && (arr[4] === "tag" || arr[4] === "edit")) {
        return arr.slice(0, 4).join("/");
      } else if (lastIndex > 3) {
        return arr[3] === "blob" ? (arr[3] = "tree", arr.join("/")) : null;
      }
    }
  }
  /** `true` means `port` is NOT vomnibar port */
  function isNotVomnibarPage(this: void, port: Frames.Port, noLog: boolean): boolean {
    let info = port.s, f = info.f;
    if (!(f & Frames.Flags.vomnibarChecked)) {
      f |= Frames.Flags.vomnibarChecked |
        (info.u === Settings_.cache_.vomnibarPage_f || info.u === Settings_.CONST_.VomnibarPageInner_
          ? Frames.Flags.isVomnibar : 0);
      info.f = f;
    }
    if (f & Frames.Flags.isVomnibar) { return false; }
    if (!noLog && !(f & Frames.Flags.sourceWarned)) {
      console.warn("Receive a request from %can unsafe source page%c (should be vomnibar) :\n %s @ tab %o",
        "color:red", "color:auto", info.u.slice(0, 128), info.t);
      info.f |= f;
    }
    return true;
  }
  function PostCompletions(this: Port, favIcon0: 0 | 1 | 2, list: Array<Readonly<Suggestion>>
      , autoSelect: boolean, matchType: CompletersNS.MatchType, sugTypes: CompletersNS.SugType, total: number): void {
    let { u: url } = this.s, favIcon: 0 | 1 | 2 = favIcon0 === 2 ? 2 : 0;
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
      favIcon = list.some(i => i.e === "tab") ? favIcon && 2 : 0;
    }
    else if (Build.BTypes & BrowserType.Edge
        && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)) {
      favIcon = 0;
    }
    else if (Build.BTypes & BrowserType.Chrome && favIcon0 === 1
        && (Build.MinCVer >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon
          || CurCVer_ >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon)) {
      url = url.slice(0, url.indexOf("/", url.indexOf("://") + 3) + 1);
      const map = framesForTab;
      let frame1 = gTabIdOfExtWithVomnibar >= 0 ? indexFrame(gTabIdOfExtWithVomnibar, 0) : null;
      if (frame1 != null) {
        if (frame1.s.u.startsWith(url)) {
          favIcon = 1;
        } else {
          gTabIdOfExtWithVomnibar = GlobalConsts.TabIdNone;
        }
      }
      if (!favIcon) {
      for (const tabId in map) {
        let frames = map[+tabId]!;
        for (let i = 1, len = frames.length; i < len; i++) {
          let { s: sender } = frames[i];
          if (sender.i === 0) {
            if (sender.u.startsWith(url)) {
              favIcon = 1;
              gTabIdOfExtWithVomnibar = +tabId;
            }
            break;
          }
        }
        if (favIcon) { break; }
      }
      }
    }
    safePost(this, { N: kBgReq.omni_omni, a: autoSelect, m: matchType, s: sugTypes, l: list, i: favIcon, t: total });
    BgUtils_.resetRe_();
  }
  function safePost<K extends keyof FullBgReq>(port: Port, req: Req.bg<K>): BOOL {
    try {
      port.postMessage(req);
      return 1;
    } catch { return 0; }
  }
  function indexFrame(this: void, tabId: number, frameId: number): Port | null {
    const ref = framesForTab[tabId];
    if (!ref) { return null; }
    for (let i = 1, len = ref.length; i < len; i++) {
      if (ref[i].s.i === frameId) {
        return ref[i];
      }
    }
    return null;
  }
  function getTabRange(current: number, total: number, countToAutoLimitBeforeScale?: number
      , /** must be positive */ extraCount?: number | null
  ): [number, number] {
    let count = cRepeat;
    if (extraCount) { count += count > 0 ? extraCount : -extraCount; }
    const end = current + count, pos = count > 0;
    return end <= total && end > -2 ? pos ? [current, end] : [end + 1, current + 1] // normal range
      : !cOptions.limited && abs(count) < (countToAutoLimitBeforeScale || total
          ) * GlobalConsts.ThresholdToAutoLimitTabOperation
        ? abs(count) < total ? pos ? [total - count, total] : [0, -count] // go forward and backward
        : [0, total] // all
      : pos ? [current, total] : [0, current + 1] // limited
      ;
  }
  function confirm_<T extends kCName, force extends BOOL = 0> (this: void
      , command: CommandsNS.CmdNameIds[T] extends kBgCmd ? T : force extends 1 ? kCName : never
      , count: number, callback?: (_arg: FakeArg) => void): number | void {
    if (!(Build.NDEBUG || !command.includes("."))) {
      console.log("Assert error: command should has no limit on repeats: %c%s", "color:red", command);
    }
    let msg = trans_("cmdConfirm", [count, trans_(command)]);
    if (Build.BTypes & ~BrowserType.Chrome) {
      gOnConfirmCallback = callback;
      setupSingletonCmdTimer(setTimeout(onConfirm, 3000, 0));
      cPort ? (indexFrame(cPort.s.t, 0) || cPort).postMessage({
        N: kBgReq.count,
        c: "",
        i: gCmdTimer,
        m: msg
      }) : onConfirm(1);
      return;
    }
    const now = Date.now(), result = window.confirm(msg);
    return abs(Date.now() - now) > 9 ? result ? count : 0
        : (Build.NDEBUG || console.log("A confirmation dialog may fail in showing."), 1);
  }
  function onConfirm(response: Exclude<FgReq[kFgReq.cmd]["r"], null | undefined>): void {
    let callback = gOnConfirmCallback;
    gOnConfirmCallback = null;
    if (response > 1 && callback) {
      if (response < 3) {
        cRepeat = cRepeat > 0 ? 1 : -1;
      }
      cNeedConfirm = 0;
      (callback as () => void)();
      cNeedConfirm = 1;
    }
  }
  function requireURL <k extends keyof FgReq>(request: Req.fg<k> & BgReq[kBgReq.url], ignoreHash?: true): void {
    type T1 = keyof FgReq;
    type Req1 = { [K in T1]: (req: FgReq[K], port: Frames.Port) => void; };
    type Req2 = { [K in T1]: <T extends T1>(req: FgReq[T], port: Frames.Port) => void; };
    cPort = cPort || indexFrame(TabRecency_.curTab_, 0);
    const res = Backend_.getPortUrl_(cPort, ignoreHash);
    if (typeof res !== "string") {
      res.then(url => {
        request.u = url;
        url && (requestHandlers as Req1 as Req2)[request.H](request, cPort);
      });
    } else if (res) {
      request.u = res;
      (requestHandlers as Req1 as Req2)[request.H](request, cPort);
    }
  }
  function ensureInnerCSS(this: void, port: Frames.Port): string | null {
    const { s: sender } = port;
    if (sender.f & Frames.Flags.hasCSS) { return null; }
    sender.f |= Frames.Flags.hasCSSAndActed;
    return Settings_.cache_.innerCSS;
  }
  /** this functions needs to accept any types of arguments and normalize them */
  function executeExternalCmd(message: Partial<ExternalMsgs[kFgReq.command]["req"]>
      , sender: chrome.runtime.MessageSender): void {
    BgUtils_.GC_();
    if (!Commands) { BgUtils_.require_("Commands").then(() => executeExternalCmd(message, sender)); return; }
    Commands.execute_(message, sender, executeCommand);
  }
  function notifyCKey(): void {
    cPort && cPort.postMessage({ N: kBgReq.focusFrame,
      H: null, k: cKey, c: 0, m: FrameMaskType.NoMaskAndNoFocus
    });
  }
  function getTabUrl(tab_may_pending: Pick<Tab, "url" | "pendingUrl">): string {
    return Build.BTypes & BrowserType.Chrome ? tab_may_pending.url || tab_may_pending.pendingUrl : tab_may_pending.url
  }

  const
  getCurTab = chrome.tabs.query.bind<null, { active: true; currentWindow: true }
      , [(result: [Tab], _ex: FakeArg) => void], 1>(null, { active: true, currentWindow: true }),
  getCurTabs = chrome.tabs.query.bind(null, {currentWindow: true}),
  getCurShownTabs_ff_only = Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
    ? chrome.tabs.query.bind(null, { currentWindow: true, hidden: false }) : 0 as never as null,
  getCurWnd = function (populate: boolean, callback: (window: Window, exArg: FakeArg) => void): 1 {
    const wndId = TabRecency_.curWnd_, args = { populate };
    return wndId >= 0 ? chrome.windows.get(wndId, args, callback) : chrome.windows.getCurrent(args, callback);
  } as {
    (populate: true, callback: (window: WindowWithTabs | null | undefined
      , exArg: FakeArg) => void): 1;
    (populate: false, callback: (window: Window, exArg: FakeArg) => void): 1;
  },
  tabsGet = chrome.tabs.get;
  function findCPort(port: Port | null | undefined): Port | null {
    const frames = framesForTab[port ? port.s.t : TabRecency_.curTab_];
    return frames ? frames[0] : null as never as Port;
  }

  function openUrlInIncognito(this: void, url: string, active: boolean
      , opts: Readonly<Pick<OpenUrlOptions, "position" | "opener" | "window">>
      , tab: Tab | undefined
      , wnds: Array<Pick<Window, "id" | "focused" | "incognito" | "type" | "state">>): void {
    let oldWnd = tab && wnds.filter(wnd => wnd.id === tab.windowId)[0]
      , inCurWnd = oldWnd != null && oldWnd.incognito;
    // eslint-disable-next-line arrow-body-style
    if (!opts.window && (inCurWnd || (wnds = wnds.filter(w => w.incognito && w.type === "normal")).length > 0)) {
      const options: InfoToCreateMultiTab & { windowId: number } = {
        url, active,
        windowId: inCurWnd ? tab!.windowId : wnds[wnds.length - 1].id
      };
      if (inCurWnd) {
        options.index = newTabIndex(tab!, opts.position, opts.opener);
        opts.opener && (options.openerTabId = tab!.id);
      }
      openMultiTab(options, cRepeat);
      return !inCurWnd && active ? selectWnd(options) : undefined;
    }
    makeWindow({
      url,
      incognito: true, focused: active
    }, oldWnd && oldWnd.type === "normal" ? oldWnd.state : "");
  }
  function standardCreateTab(this: void, onlyNormal?: boolean, tabs?: [Tab]): void {
    if (cOptions.url || cOptions.urls) {
      BackgroundCommands[kBgCmd.openUrl](tabs);
      return onRuntimeError();
    }
    let tab: Tab | null = null;
    if (!tabs) { /* empty */ }
    else if (tabs.length > 0) { tab = tabs[0]; }
    else if (TabRecency_.curTab_ >= 0) {
      tabsGet(TabRecency_.curTab_, function (lastTab): void {
        standardCreateTab(onlyNormal, lastTab && [lastTab]);
      });
      return onRuntimeError();
    }
    openMultiTab((tab ? {
      active: tab.active, windowId: tab.windowId,
      index: newTabIndex(tab, cOptions.position)
    } : {active: true}) as InfoToCreateMultiTab, cRepeat, cOptions.evenIncognito);
    return onRuntimeError();
  }

  const hackedCreateTab =
      (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
        || !Build.CreateFakeIncognito || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
      ? null : [function (wnd): void {
    if (cOptions.url || cOptions.urls) {
      return BackgroundCommands[kBgCmd.openUrl]([selectFrom(wnd!.tabs)]);
    }
    if (!wnd) {
      tabsCreate({url: this});
      return onRuntimeError();
    }
    const tab = selectFrom(wnd.tabs);
    if (wnd.incognito && wnd.type !== "normal") {
      // url is disabled to be opened in a incognito window directly
      return hackedCreateTab[1](this, tab, cRepeat > 1 ? (id: number): void => {
        for (let count = cRepeat; 0 < --count; ) {
          chrome.tabs.duplicate(id);
        }
      } : null, wnd.tabs);
    }
    openMultiTab({
      url: "", active: tab.active, windowId: wnd.type === "normal" ? tab.windowId : undefined,
      index: newTabIndex(tab, cOptions.position)
    }, cRepeat);
  }, function (url, tab, repeat, allTabs): void {
    const urlLower = url.toLowerCase().split("#", 1)[0];
    allTabs = allTabs.filter(tab1 => tab1.url.split("#", 1)[0].toLowerCase() === urlLower);
    if (allTabs.length === 0) {
      chrome.windows.getAll(hackedCreateTab[2].bind(url, tab, repeat));
      return;
    }
    const tabs = allTabs.filter(tab1 => tab1.index >= tab.index);
    tab = tabs.length > 0 ? tabs[0] : allTabs[allTabs.length - 1];
    chrome.tabs.duplicate(tab.id);
    if (repeat) { return repeat(tab.id); }
  }, function (tab, repeat, wnds): void {
    wnds = wnds.filter(function (wnd) {
      return !wnd.incognito && wnd.type === "normal";
    });
    if (wnds.length > 0) {
      return hackedCreateTab[3](this, tab, repeat, wnds[0]);
    }
    return makeTempWindow("about:blank", false, //
    hackedCreateTab[3].bind(null, this, tab, function (newTabId: number, newWndId: number): void {
      chrome.windows.remove(newWndId);
      if (repeat) { return repeat(newTabId); }
    }));
  }, function (url, tab, callback, wnd) {
    tabsCreate({
      active: false,
      windowId: wnd.id,
      url
    }, function (newTab) {
      return makeTempWindow(newTab.id, true, function () {
        chrome.tabs.move(newTab.id, {
          index: tab.index + 1,
          windowId: tab.windowId
        }, function (): void {
          callback && callback(newTab.id, newTab.windowId);
          return selectTab(newTab.id);
        });
      });
    });
  }]) as [
    (this: string, wnd?: PopWindow | null) => void,
    (this: void, url: string, tab: Tab, repeat: ((this: void, tabId: number) => void) | null, allTabs: Tab[]) => void,
    (this: string, tab: Tab, repeat: ((this: void, tabId: number) => void) | null, wnds: Window[]) => void,
    (this: void, url: string, tab: Tab
      , callback: ((this: void, tabId: number, wndId: number) => void) | null, wnd: Window) => void,
  ];
  function parseReuse (reuse: UserReuseType | null | undefined): ReuseType {
    return reuse == null ? ReuseType.newFg
        : typeof reuse !== "string" ? (<number> <number | null | undefined> reuse) | 0
        : reuse === "reuse" ? ReuseType.reuse : reuse === "newWindow" ? ReuseType.newWindow
        : reuse === "newFg" ? ReuseType.newFg : reuse === "newBg" ? ReuseType.newBg
        : reuse === "lastWndFg" ? ReuseType.lastWndFg : reuse === "lastWndBg" ? ReuseType.lastWndBg
        : ReuseType.newFg
  }
  function fillUrlMasks(url: string, tabs: [Tab?] | undefined, url_mark: string): string {
      const tabUrl = tabs && tabs.length > 0 ? getTabUrl(tabs[0]!) : ""
      const masks: Array<string | null | undefined> = [url_mark,
        cOptions.host_mask || cOptions.host_mark,
        cOptions.tabid_mask || cOptions.tabId_mask || cOptions.tabid_mark,
        cOptions.title_mask || cOptions.title_mark,
        cOptions.id_mask || cOptions.id_mark || cOptions.id_marker,
      ]
      const matches: [number, number, string][] = []
      for (let i = 0; i < masks.length; i++) {
        const mask = masks[i], ind = mask ? url.indexOf(mask) : -1
        if (ind >= 0) {
          let end = ind + mask!.length
          for (const j of matches) { if (ind < j[1] && end >= j[0]) { continue } }
          matches.push([ ind, end, i === 0
              ? (<RegExpOne> /[%$]s/).test(mask!) ? BgUtils_.encodeAsciiComponent(tabUrl) : tabUrl
              : i === 1 ? new URL(tabUrl).host : i === 2 ? tabUrl && "" + tabs![0]!.id
              : i === 3 ? tabUrl && "" + BgUtils_.encodeAsciiComponent(tabs![0]!.title) : chrome.runtime.id ])
        }
      }
      if (matches.length) {
        let s = "", lastEnd = 0
        matches.sort((a, b) => a[0] - b[0])
        for (const match of matches) {
          s = s + url.slice(lastEnd, match[0]) + match[2]
          lastEnd = match[1]
        }
        url = s + url.slice(lastEnd)
      }
      return url
  }
  function openUrl(url: Urls.Url, workType: Urls.WorkType, tabs?: [Tab] | []): void {
    if (typeof url !== "string") { /* empty */ }
    else if (url || workType !== Urls.WorkType.FakeType) {
      let url_mask: string | null | undefined = cOptions.url_mask, umark: typeof url_mask = cOptions.url_mark
      url = url_mask != null || umark != null ? fillUrlMasks(url, tabs, url_mask != null ? url_mask : umark!) : url
      if (workType !== Urls.WorkType.FakeType) {
        const _rawKey = (cOptions as OpenUrlOptionsInBgCmd).keyword, keyword = (_rawKey || "") + ""
        const _rawTest = (cOptions as OpenUrlOptionsInBgCmd).testUrl, testUrl = _rawTest != null ? _rawTest : !keyword
        url = testUrl ? BgUtils_.convertToUrl_(url, keyword, workType)
            : BgUtils_.createSearchUrl_(url.trim().split(BgUtils_.spacesRe_), keyword || "~")
      }
    } else {
      url = Settings_.cache_.newTabUrl_f
    }
    let reuse: ReuseType = parseReuse(cOptions.reuse), options = cOptions as OpenUrlOptions
    cOptions = null as never;
    BgUtils_.resetRe_();
    if (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
        && typeof url === "string" && url.startsWith("about:reader?url=")) {
      reuse = reuse !== ReuseType.newBg ? ReuseType.newFg : reuse
    }
    typeof url !== "string"
      ? /*#__NOINLINE__*/ onEvalUrl_(workType, options, tabs, url)
      : openShowPage(url, reuse, options) ? 0
      : BgUtils_.isJSUrl_(url) ? /*#__NOINLINE__*/ openJSUrl(url)
      : reuse === ReuseType.reuse ? requestHandlers[kFgReq.focusOrLaunch]({ u: url })
      : reuse === ReuseType.current ? safeUpdate(url)
      : tabs ? openUrlInNewTab(url, reuse, options, tabs)
      : getCurTab(openUrlInNewTab.bind(null, url, reuse, options))
      ;
  }
  function openCopiedUrl(this: void, tabs: [Tab] | [] | undefined, url: string | null): void {
    if (url === null) { return Backend_.complain_("read clipboard"); }
    if (!(url = url.trim())) { return Backend_.showHUD_(trans_("noCopied")); }
    if (BgUtils_.quotedStringRe_.test(url)) {
      url = url.slice(1, -1);
    } else {
      const keyword = (cOptions as OpenUrlOptionsInBgCmd).keyword;
      if (!keyword || keyword === "~" || (cOptions as OpenUrlOptionsInBgCmd).testUrl) {
        url = BgUtils_.detectLinkDeclaration_(url);
      }
    }
    let start = url.indexOf("://") + 3;
    if (start > 3 && BgUtils_.protocolRe_.test(url)) {
      // an origin with "/"
      let arr: RegExpExecArray | null;
      const end = url.indexOf("/", start) + 1 || url.length,
      host = url.slice(start, end),
      type = host.startsWith("0.0.0.0") ? 7
          : host.includes(":::") && (arr = (<RegExpOne> /^(\[?::\]?):\d{2,5}$/).exec(host))
          ? arr[1].length : 0;
      url = type ? url.slice(0, start) + (type > 6 ? "127.0.0.1" : "[::1]") + url.slice(start + type) : url;
    }
    openUrl(url, Urls.WorkType.ActAnyway, tabs);
  }
  function openUrlInNewTab(this: void, url: string, reuse: Exclude<ReuseType, ReuseType.reuse | ReuseType.current>
      , options: Readonly<Pick<OpenUrlOptions, "position" | "opener" | "window" | "incognito">>
      , tabs: [Tab] | []): void {
    const tab: Tab | undefined = tabs[0], tabIncognito = !!tab && tab.incognito,
    incognito = options.incognito, active = reuse !== ReuseType.newBg && reuse !== ReuseType.lastWndBg;
    let window = reuse === ReuseType.newWindow || reuse < ReuseType.lastWndFg + 1 || options.window;
    let inReader: boolean | undefined
    if (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
        && url.startsWith("about:reader?url=")) {
      url = BgUtils_.decodeEscapedURL_(url.slice(17))
      inReader = true
    }
    if (BgUtils_.isRefusingIncognito_(url)) {
      if (tabIncognito || TabRecency_.incognito_ === IncognitoType.true) {
        window = true;
      }
    } else if (tabIncognito) {
      if (incognito !== false) {
        return openUrlInIncognito(url, active, options, tab
          , [{ id: tab!.windowId, incognito: true, type: "normal", state: "normal", focused: true }]);
      }
      window = true;
    } else if (incognito) {
      chrome.windows.getAll(openUrlInIncognito.bind(null, url, active, options, tab));
      return;
    }
    if (window) {
      if (reuse < ReuseType.lastWndFg + 1 && TabRecency_.lastWnd_ >= 0) {
        chrome.tabs.create({ windowId: TabRecency_.lastWnd_, url, active: reuse > ReuseType.lastWndBg }, (): void => {
          if (onRuntimeError()) {
            openUrlInNewTab(url, ReuseType.newWindow, options, tabs)
            return onRuntimeError()
          }
        })
        return;
      }
      getCurWnd(false, function ({ state }): void {
        makeWindow({ url, focused: active }, state !== "minimized" && state !== "docked" ? state : "");
      });
      return;
    }
    let openerTabId = options.opener && tab ? tab.id : undefined;
    const args: Parameters<BackendHandlersNS.BackendHandlers["reopenTab_"]>[2] & { url: string, active: boolean } = {
      url, active, windowId: tab ? tab.windowId : undefined,
      openerTabId,
      index: tab ? newTabIndex(tab, options.position, openerTabId != null) : undefined
    }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox) && inReader) {
      args.openInReaderMode = inReader
    }
    openMultiTab(args, cRepeat);
  }
  function openJSUrl(url: string, onBrowserFail?: () => void): void {
    if ("void 0;void(0);".includes(url.slice(11).trim())) {
      return;
    }
    if (!onBrowserFail && cPort) {
      if (safePost(cPort, { N: kBgReq.eval, u: url })) {
        return;
      }
      cPort = null as never;
    }
    const callback1 = function (opt?: object | -1): void {
      if (opt !== -1 && !onRuntimeError()) { return; }
      const code = BgUtils_.DecodeURLPart_(url.slice(11));
      chrome.tabs.executeScript({ code }, (): void => {
        onRuntimeError() && onBrowserFail && onBrowserFail();
        return onRuntimeError()
      })
      return onRuntimeError();
    };
    // e.g.: use Chrome omnibox at once on starting
    if (Build.MinCVer < BrowserVer.Min$Tabs$$Update$DoesNotAcceptJavaScriptURLs && Build.BTypes & BrowserType.Chrome &&
        CurCVer_ < BrowserVer.Min$Tabs$$Update$DoesNotAcceptJavaScriptURLs) {
      chrome.tabs.update({ url }, callback1);
    } else {
      callback1(-1);
    }
  }
  const
  openShowPage = function (url: string, reuse: ReuseType, options: OpenUrlOptions, tab?: Tab): boolean {
    const prefix = Settings_.CONST_.ShowPage_;
    if (url.length < prefix.length + 3 || !url.startsWith(prefix)) { return false; }
    if (!tab) {
      getCurTab(function (tabs: [Tab]): void {
        if (!tabs || tabs.length <= 0) { return onRuntimeError(); }
        openShowPage(url, reuse, options, tabs[0]);
      });
      return true;
    }
    url = url.slice(prefix.length);
    if (url.startsWith("#!image ") && TabRecency_.incognito_ === IncognitoType.true) {
      url = "#!image incognito=1&" + url.slice(8).trim();
    }
    const { incognito } = tab;
    const arr: ShowPageData = [url, null, 0];
    Settings_.temp_.shownHash_ = arr[1] = function (this: void) {
      clearTimeout(arr[2]);
      Settings_.temp_.shownHash_ = null;
      return arr[0];
    };
    arr[2] = setTimeout(() => {
      arr[0] = "#!url vimium://error (vimium://show: sorry, the info has expired.)";
      arr[2] = setTimeout(function () {
        if (Settings_.temp_.shownHash_ === arr[1]) { Settings_.temp_.shownHash_ = null; }
        arr[0] = "", arr[1] = null;
      }, 2000);
    }, 1200);
    cRepeat = 1;
    if (reuse === ReuseType.current && !incognito) {
      let views = Build.BTypes & BrowserType.ChromeOrFirefox
            && (!(Build.BTypes & ~BrowserType.ChromeOrFirefox) || OnOther & BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & ~BrowserType.Firefox)
                || Build.MinCVer >= BrowserVer.Min$Extension$$GetView$AcceptsTabId
                || CurCVer_ >= BrowserVer.Min$Extension$$GetView$AcceptsTabId)
            && !tab.url.split("#", 2)[1]
        ? chrome.extension.getViews({ tabId: tab.id }) : [];
      if (Build.BTypes & BrowserType.ChromeOrFirefox && views.length > 0
          && views[0].location.href.startsWith(prefix) && views[0].onhashchange) {
        (views[0].onhashchange as () => void)();
      } else {
        chrome.tabs.update(tab.id, { url: prefix });
      }
    } else if (incognito) {
      tabsCreate({ url: prefix, active: reuse !== ReuseType.newBg });
    } else {
      // reuse may be ReuseType.reuse, but just treat it as .newFg
      openUrlInNewTab(prefix, reuse as Exclude<ReuseType, ReuseType.current | ReuseType.reuse>, options, [tab]);
    }
    return true;
  };
  // use Urls.WorkType.Default
  function openUrls(tabs: [Tab] | [] | undefined): void {
    const tab = tabs && tabs[0], windowId = tab && tab.windowId;
    interface OptionEx { formatted_?: 1 }
    let urls: string[] = cOptions.urls, repeat = cRepeat;
    if (!(cOptions as OptionEx).formatted_) {
      for (let i = 0; i < urls.length; i++) {
        urls[i] = BgUtils_.convertToUrl_(urls[i] + "");
      }
      (cOptions as OptionEx).formatted_ = 1;
    }
    const reuse = parseReuse(cOptions.reuse),
    wndOpt: chrome.windows.CreateData | null = reuse === ReuseType.newWindow || cOptions.window ? {
      url: urls, incognito: !!cOptions.incognito
    } : null;
    let active = reuse > ReuseType.newFg - 1, index = tab && newTabIndex(tab, cOptions.position);
    cOptions = null as never;
    do {
      if (wndOpt) {
        chrome.windows.create(wndOpt, onRuntimeError);
        continue;
      }
      for (const url of urls) {
        tabsCreate({ url, index, windowId, active });
        active = false;
        index != null && index++;
      }
    } while (0 < --repeat);
    return onRuntimeError();
  }
  function removeAllTabsInWnd(this: void, tab: Tab, curTabs: readonly Tab[], wnds: Window[]): void {
    let protect = false, windowId: number | undefined, wnd: Window;
    wnds = wnds.filter(wnd2 => wnd2.type === "normal");
    if (cOptions.keepWindow === "always") {
      protect = !wnds.length || wnds.some(i => i.id === tab.windowId)
    } else if (wnds.length <= 1) {
      // protect the last window
      protect = true;
      if (!(wnd = wnds[0])) { /* empty */ }
      else if (wnd.id !== tab.windowId) { protect = false; } // the tab may be in a popup window
      else if (wnd.incognito && !BgUtils_.isRefusingIncognito_(Settings_.cache_.newTabUrl_f)) {
        windowId = wnd.id;
      }
      // other urls will be disabled if incognito else auto in current window
    }
    else if (!tab.incognito) {
      // protect the only "normal & not incognito" window if it has currentTab
      wnds = wnds.filter(wnd2 => !wnd2.incognito);
      if (wnds.length === 1 && wnds[0].id === tab.windowId) {
        windowId = wnds[0].id;
        protect = true;
      }
    }
    if (protect) {
      tabsCreate({ index: curTabs.length, url: "", windowId });
    }
    removeTabsInOrder(tab, curTabs, 0, curTabs.length);
  }
  function removeTabsInOrder(tab: Tab, tabs: readonly Tab[], start: number, end: number): void {
    const browserTabs = chrome.tabs, i = tab.index;
    browserTabs.remove(tab.id, onRuntimeError);
    let parts1 = tabs.slice(i + 1, end), parts2 = tabs.slice(start, i);
    if (cRepeat < 0) {
      let tmp = parts1;
      parts1 = parts2;
      parts2 = tmp;
    }
    parts1.length > 0 && browserTabs.remove(parts1.map(j => j.id), onRuntimeError);
    parts2.length > 0 && browserTabs.remove(parts2.map(j => j.id), onRuntimeError);
  }
  function addBookmarks (this: chrome.bookmarks.BookmarkTreeNode, tabs?: Tab[]): void {
    if (!tabs || !tabs.length) { onRuntimeError(); return }
    const ind = (Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index
    let [start, end] = getTabRange(ind, tabs.length)
    let count = end - start
    if (count > 20) {
      if (Build.BTypes & ~BrowserType.Chrome) {
        if (cNeedConfirm) {
          confirm_(kCName.addBookmark, end, addBookmarks.bind(this, tabs))
          return
        }
      } else {
        if (!(count = confirm_(kCName.addBookmark, count)!)) { return }
        if (count === 1) { start = ind, end = ind + 1 }
      }
    }
    for (const tab of tabs.slice(start, end)) {
      chrome.bookmarks.create({ parentId: this.id, title: tab.title, url: getTabUrl(tab) }, onRuntimeError)
    }
    Backend_.showHUD_(`Add ${end - start} bookmark${end > start + 1 ? "s" : ""}.`)
  }
  /** if `alsoWnd`, then it's safe when tab does not exist */
  function selectTab(this: void, tabId: number, alsoWnd?: boolean): void {
    chrome.tabs.update(tabId, {active: true}, alsoWnd ? selectWnd : null);
  }
  function selectWnd(this: void, tab?: { windowId: number }): void {
    tab && chrome.windows.update(tab.windowId, { focused: true });
    return onRuntimeError();
  }
  /** safe when cPort is null */
  const
  focusOrLaunch = [function (tabs): void {
    if (TabRecency_.incognito_ !== IncognitoType.true) {
      tabs && (tabs = tabs.filter(tab => !tab.incognito));
    }
    if (tabs && tabs.length > 0) {
      getCurWnd(false, focusOrLaunch[2].bind(this, tabs));
      return;
    }
    getCurTab(focusOrLaunch[1].bind(this));
    return onRuntimeError();
  }, function (tabs) {
    // if `this.s`, then `typeof this` is `MarksNS.MarkToGo`
    const callback = this.s ? focusOrLaunch[3].bind(this as MarksNS.MarkToGo, 0) : null;
    if (tabs.length <= 0 || TabRecency_.incognito_ === IncognitoType.true && !tabs[0].incognito) {
      chrome.windows.create({url: this.u}, callback && function (wnd: Window): void {
        if (wnd.tabs && wnd.tabs.length > 0) { return callback(wnd.tabs[0]); }
      });
      return;
    }
    tabsCreate({
      index: tabs[0].index + 1,
      url: this.u,
      windowId: tabs[0].windowId
    }, callback);
  }, function (tabs, wnd): void {
    const wndId = wnd.id, url = this.u;
    let tabs2 = tabs.filter(tab2 => tab2.windowId === wndId);
    if (tabs2.length <= 0) {
      tabs2 = wnd.incognito ? tabs : tabs.filter(tab2 => !tab2.incognito);
      if (tabs2.length <= 0) {
        getCurTab(focusOrLaunch[1].bind(this));
        return;
      }
    }
    this.p && tabs2.sort((a, b) => a.url.length - b.url.length);
    let tab: Tab = selectFrom(tabs2);
    if (tab.url.length > tabs2[0].url.length) { tab = tabs2[0]; }
    if (!Build.NDEBUG && Build.BTypes & BrowserType.Chrome
        && url.startsWith(Settings_.CONST_.OptionsPage_) && !framesForTab[tab.id] && !this.s) {
      tabsCreate({ url });
      chrome.tabs.remove(tab.id);
      return;
    }
    chrome.tabs.update(tab.id, {
      url: tab.url === url || tab.url.startsWith(url) ? undefined : url,
      active: true
    }, this.s ? focusOrLaunch[3].bind(this as MarksNS.MarkToGo, 0) : null);
    if (tab.windowId !== wndId) { return selectWnd(tab); }
  }, function (this: MarksNS.MarkToGo, tick: 0 | 1 | 2, tab: Tab): void {
    if (!tab) { return onRuntimeError(); }
    if (tab.status === "complete" || tick >= 2) {
      return Marks_.scrollTab_(this, tab);
    }
    setTimeout(() => { tabsGet(tab.id, focusOrLaunch[3].bind(this, (tick + 1) as 1 | 2)); }, 800);
  }] as [
    (this: MarksNS.FocusOrLaunch, tabs: Tab[]) => void,
    (this: MarksNS.FocusOrLaunch, tabs: [Tab] | never[]) => void,
    (this: MarksNS.FocusOrLaunch, tabs: Tab[], wnd: Window) => void,
    (this: MarksNS.MarkToGo, tick: 0 | 1 | 2, tabs: Tab | undefined) => void
  ];
  function focusAndRun(req: Omit<FgReq[kFgReq.gotoMainFrame], "f">
      , port: Port, mainPort: Port | null, focusAndShowFrameBorder: BOOL): void {
    if (mainPort && mainPort.s.s !== Frames.Status.disabled) {
      mainPort.postMessage({
        N: kBgReq.focusFrame,
        H: focusAndShowFrameBorder || req.c !== kFgCmd.scroll ? ensureInnerCSS(port) : null,
        m: focusAndShowFrameBorder ? FrameMaskType.ForcedSelf : FrameMaskType.NoMaskAndNoFocus,
        c: req.c, n: req.n,
        k: focusAndShowFrameBorder ? cKey : kKeyCode.None,
        a: req.a
      });
    } else {
      req.a.$forced = true;
      port.postMessage({
        N: kBgReq.execute,
        H: null,
        c: req.c, n: req.n,
        a: req.a
      });
    }
  }
  function executeShortcut(shortcutName: keyof ShortcutInfoMap, ports: Frames.Frames | null | undefined): void {
    setupSingletonCmdTimer(0);
    if (ports) {
      let port = ports[0];
      setupSingletonCmdTimer(setTimeout(executeShortcut, 100, shortcutName, null));
      port.postMessage({ N: kBgReq.count, c: shortcutName, i: gCmdTimer, m: "" });
      if (!(port.s.f & Frames.Flags.hasCSSAndActed)) {
        requestHandlers[kFgReq.exitGrab]({}, port);
      }
      port.s.f |= Frames.Flags.userActed;
    } else {
      let registry = CommandsData_.shortcutRegistry_[shortcutName], cmdName = registry.command_,
      cmdFallback: kBgCmd & number = 0;
      if (cmdName === "goBack" || cmdName === "goForward") {
        if (Build.BTypes & BrowserType.Chrome
            && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
          cmdFallback = kBgCmd.goBackFallback;
        }
      } else if (cmdName === "autoOpen") {
        cmdFallback = kBgCmd.autoOpenFallback;
      }
      if (cmdFallback) {
        /** this object shape should keep the same as the one in {@link commands.ts#Commands.makeCommand_} */
        registry = {
          alias_: cmdFallback,
          background_: 1,
          command_: cmdName,
          help_: null,
          options_: registry.options_,
          repeat_: registry.repeat_
        };
      }
      if (!registry.background_) { return; }
      if (registry.alias_ > kBgCmd.MAX_NEED_CPORT || registry.alias_ < kBgCmd.MIN_NEED_CPORT) {
        executeCommand(registry, 1, kKeyCode.None, null as never as Port, 0);
      } else {
        let opts = registry.options_ || ((registry as Writable<typeof registry>).options_ = BgUtils_.safeObj_<any>());
        if (!opts.$noWarn) {
          (opts as Writable<typeof opts>).$noWarn = true;
          console.log("Error: Command", cmdName, "must run on pages which are not privileged");
        }
      }
    }
  }
  const
  BgCmdInfo: { [K in kBgCmd & number]: K extends keyof BgCmdInfoNS ? BgCmdInfoNS[K] : UseTab.NoTab; } = [
    UseTab.NoTab,
    UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.NoTab,
    UseTab.NoTab, UseTab.NoTab, UseTab.NoTab, UseTab.NoTab,
    Build.MinCVer < BrowserVer.MinNoAbnormalIncognito && Build.BTypes & BrowserType.Chrome
        && Build.CreateFakeIncognito ? UseTab.NoTab : UseTab.ActiveTab,
    UseTab.NoTab, UseTab.NoTab, UseTab.ActiveTab, UseTab.NoTab, UseTab.ActiveTab,
    UseTab.NoTab, Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        ? UseTab.CurShownTabs : UseTab.CurWndTabs,
      UseTab.NoTab, UseTab.CurWndTabs, UseTab.CurWndTabs,
    UseTab.NoTab, UseTab.NoTab, UseTab.CurWndTabs, UseTab.NoTab, UseTab.ActiveTab,
    UseTab.CurWndTabsIfRepeat, UseTab.NoTab, UseTab.CurWndTabsIfRepeat, UseTab.ActiveTab,
    UseTab.NoTab, UseTab.NoTab, UseTab.CurWndTabs, UseTab.NoTab,
    Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        ? UseTab.CurShownTabs : UseTab.CurWndTabs, UseTab.NoTab, UseTab.NoTab,
    UseTab.ActiveTab, UseTab.NoTab, UseTab.ActiveTab, UseTab.ActiveTab, UseTab.NoTab, UseTab.NoTab,
    UseTab.NoTab
  ],
  BackgroundCommands: {
    [K in kBgCmd & number]:
      K extends keyof SpecialCommands ? SpecialCommands[K] :
      K extends keyof BgCmdInfoNS ?
        BgCmdInfoNS[K] extends UseTab.ActiveTab ? BgCmdActiveTab :
        BgCmdInfoNS[K] extends UseTab.CurWndTabsIfRepeat | UseTab.CurWndTabs | UseTab.CurShownTabs ? BgCmdCurWndTabs :
        BgCmdInfoNS[K] extends UseTab.ActiveTab | UseTab.NoTab ? BgCmdActiveTabOrNoTab :
        never :
      BgCmdNoTab;
  } = [
    /* kBgCmd.blank: */ BgUtils_.blank_,
    /* kBgCmd.nextFrame: */ function (this: void): void {
      let port = cPort, ind = -1;
      const frames = framesForTab[port.s.t];
      if (frames && frames.length > 2) {
        ind = Math.max(0, frames.indexOf(port, 1));
        for (let count = abs(cRepeat); count > 0; count--) {
          ind += cRepeat > 0 ? 1 : -1;
          if (ind === frames.length) { ind = 1; }
          else if (ind < 1) { ind = frames.length - 1; }
        }
        port = frames[ind];
      }
      port.postMessage({
        N: kBgReq.focusFrame,
        H: port.s.i === 0 ? ensureInnerCSS(port) : null,
        k: cKey,
        c: 0,
        m: port !== cPort && frames && port !== frames[0] ? FrameMaskType.NormalNext : FrameMaskType.OnlySelf
      });
    },
    /* kBgCmd.parentFrame: */ function (): void {
      const sender = cPort.s,
      msg = Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId
        ? `Vimium C can not know parent frame before Chrome ${BrowserVer.MinWithFrameId}`
        : !(sender.t >= 0 && framesForTab[sender.t])
          ? "Vimium C can not access frames in current tab"
        : null;
      msg && Backend_.showHUD_(msg);
      if (!sender.i
          || Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId
          || !chrome.webNavigation) {
        return BackgroundCommands[kBgCmd.mainFrame]();
      }
      chrome.webNavigation.getAllFrames({
        tabId: sender.t
      }, function (frames: chrome.webNavigation.GetAllFrameResultDetails[]): void {
        let self = sender.i, frameId = self, found: boolean, count = cRepeat;
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
        const port = frameId > 0 && frameId !== self ? indexFrame(sender.t, frameId) : null;
        if (!port) {
          return BackgroundCommands[kBgCmd.mainFrame]();
        }
        port.postMessage({
          N: kBgReq.focusFrame,
          H: ensureInnerCSS(port),
          k: cKey,
          c: 0,
          m: FrameMaskType.ForcedSelf
        });
      });
    },
    /* kBgCmd.goNext: */ function (): void {
      let rel: string | undefined = cOptions.rel, p2: string[] = []
        , patterns: string | string[] | boolean | number = cOptions.patterns;
      rel = rel ? rel + "" : "next";
      if (!(patterns instanceof Array)) {
        typeof patterns === "string" || (patterns = "");
        patterns = patterns
            || (rel !== "next" ? Settings_.cache_.previousPatterns : Settings_.cache_.nextPatterns);
        patterns = patterns.split(",");
      }
      for (let i of patterns) {
        i = i && (i + "").trim();
        i && p2.push(GlobalConsts.SelectorPrefixesInPatterns.includes(i[0]) ? i : i.toLowerCase());
        if (p2.length === GlobalConsts.MaxNumberOfNextPatterns) { break; }
      }
      const maxLens: number[] = p2.map(i => Math.max(i.length + 12, i.length * 4)),
      totalMaxLen: number = Math.max.apply(Math, maxLens);
      cPort.postMessage<1, kFgCmd.goNext>({ N: kBgReq.execute,
        H: null, c: kFgCmd.goNext, n: 1,
        a: {
          r: rel,
          p: p2,
          l: maxLens,
          m: totalMaxLen > 0 && totalMaxLen < 99 ? totalMaxLen : 32
        }
      });
    },
    /* kBgCmd.toggle: */ function (this: void): void {
      type Keys = SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][0];
      type ManualNamesMap = SelectNameToKey<SettingsNS.ManuallySyncedItems>;
      const all = Settings_.payload_, key: Keys = (cOptions.key || "") + "" as Keys,
      key2 = key === "darkMode" ? "d" as ManualNamesMap["darkMode"]
          : key === "reduceMotion" ? "m" as ManualNamesMap["reduceMotion"]
          : Settings_.valuesToLoad_[key],
      old = key2 ? all[key2] : 0, keyRepr = trans_("quoteA", [key]);
      let value = cOptions.value, isBool = typeof value === "boolean", msg = "";
      if (!key2) {
        msg = trans_(key in Settings_.defaults_ ? "notFgOpt" : "unknownA", [keyRepr]);
      } else if (typeof old === "boolean") {
        isBool || (value = null);
      } else if (isBool || value === undefined) {
        msg = trans_(isBool ? "notBool" : "needVal", [keyRepr]);
      } else if (typeof value !== typeof old) {
        msg = JSON.stringify(old);
        msg = trans_("unlikeVal", [keyRepr, msg.length > 10 ? msg.slice(0, 9) + "\u2026" : msg]);
      }
      if (msg) {
        Backend_.showHUD_(msg);
      } else {
        value = Settings_.updatePayload_(key2, value)
        const ports = Backend_.indexPorts_(cPort.s.t)!;
        for (let i = 1; i < ports.length; i++) {
          ports[i].postMessage<1, kFgCmd.toggle>({
            N: kBgReq.execute,
            H: ports[i] === ports[0] ? ensureInnerCSS(cPort) : null,
            c: kFgCmd.toggle, n: 1,
            a: { k: key2, n: ports[i] === ports[0] ? keyRepr : "", v: value }
          });
        }
      }
    },
    /* kBgCmd.showHelp: */ function (this: void): void {
      if (cPort.s.i === 0 && !(cPort.s.f & Frames.Flags.hadHelpDialog)) {
        requestHandlers[kFgReq.initHelp]({ a: cOptions as {} }, cPort)
        return
      }
      if (!window.HelpDialog) {
        BgUtils_.require_("HelpDialog");
      }
      cPort.postMessage<1, kFgCmd.showHelpDialog>({
        N: kBgReq.execute, H: ensureInnerCSS(cPort),
        c: kFgCmd.showHelpDialog, n: 1,
        a: cOptions as ShowHelpDialogOptions
      })
    },
    /* kBgCmd.enterInsertMode: */ function (): void {
      let key = cOptions.key,
      hud = cOptions.hideHUD != null ? !cOptions.hideHUD : cOptions.hideHud != null ? !cOptions.hideHud
          : !Settings_.cache_.hideHud;
      key = key && typeof key === "string" ? key : "";
      let k2 = BgUtils_.stripKey_(key);
      cPort.postMessage<1, kFgCmd.insertMode>({ N: kBgReq.execute,
        H: hud ? ensureInnerCSS(cPort) : null,
        c: kFgCmd.insertMode,
        n: 1,
        a: {
          u: !!cOptions.unhover,
          r: <BOOL> +!!cOptions.reset,
          i: !!cOptions.insert,
          k: k2 || null,
          p: !!cOptions.passExitKey,
          h: hud ? [trans_("" + kTip.globalInsertMode, [k2 && ": " + key])] : null
        }
      });
    },
    /* kBgCmd.enterVisualMode: */ function (): void {
      if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)) {
        return Backend_.complain_("control selection on MS Edge");
      }
      const str = typeof cOptions.mode === "string" ? cOptions.mode.toLowerCase() : "";
      const sender = cPort.s
      let findCSS: CmdOptions[kFgCmd.visualMode]["f"] = null
      let words = "", keyMap: CmdOptions[kFgCmd.visualMode]["k"] = null;
      let granularities: CmdOptions[kFgCmd.visualMode]["g"] = null;
      if (~sender.f & Frames.Flags.hadVisualMode) {
        if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
          || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
        ) {
          words = Settings_.CONST_.words;
        }
        if (!(sender.f & Frames.Flags.hasFindCSS)) {
          sender.f |= Frames.Flags.hasFindCSS
          findCSS = Settings_.cache_.findCSS
        }
        keyMap = CommandsData_.visualKeys_;
        granularities = CommandsData_.visualGranularities_
        sender.f |= Frames.Flags.hadVisualMode;
      }
      cPort.postMessage<1, kFgCmd.visualMode>({ N: kBgReq.execute,
        H: ensureInnerCSS(cPort), c: kFgCmd.visualMode, n: 1,
        a: {
          m: str === "caret" ? VisualModeNS.Mode.Caret
              : str === "line" ? VisualModeNS.Mode.Line : VisualModeNS.Mode.Visual,
          f: findCSS,
          g: granularities,
          k: keyMap,
          t: !!cOptions.richText,
          w: words
        }
      });
    },
    /* kBgCmd.performFind: */ function (): void {
      const sender = cPort.s, absRepeat = cRepeat < 0 ? -cRepeat : cRepeat, rawIndex = cOptions.index,
      nth = rawIndex ? rawIndex === "other" ? absRepeat + 1 : rawIndex === "count" ? absRepeat
                : rawIndex >= 0 ? -1 - (0 | rawIndex) : 0 : 0,
      leave = !!nth || !cOptions.active;
      let findCSS: CmdOptions[kFgCmd.findMode]["f"] = null;
      if (!(sender.f & Frames.Flags.hasFindCSS)) {
        sender.f |= Frames.Flags.hasFindCSS;
        findCSS = Settings_.cache_.findCSS
      }
      cPort.postMessage<1, kFgCmd.findMode>({ N: kBgReq.execute
          , H: ensureInnerCSS(cPort), c: kFgCmd.findMode, n: 1
          , a: {
        n: nth > 0 ? cRepeat / absRepeat : cRepeat,
        l: leave,
        f: findCSS,
        r: cOptions.returnToViewport === true,
        s: !nth && absRepeat < 2 && !!cOptions.selected,
        p: !!cOptions.postOnEsc,
        q: leave || cOptions.last ? FindModeHistory_.query_(sender.a, "", nth < 0 ? -nth : nth) : ""
      }});
    },
    /* kBgCmd.showVomnibar: */ function (this: void, forceInner?: boolean): void {
      let port = cPort as Port | null, optUrl: VomnibarNS.GlobalOptions["url"] = cOptions.url;
      if (optUrl != null && optUrl !== true && typeof optUrl !== "string") {
        optUrl = null;
        delete (cOptions as {} as VomnibarNS.GlobalOptions).url;
      }
      if (!port) {
        port = cPort = indexFrame(TabRecency_.curTab_, 0)!;
        if (!port) { return; }
        // not go to the top frame here, so that a current frame can suppress keys for a while
      }
      const page = Settings_.cache_.vomnibarPage_f, { u: url } = port.s, preferWeb = !page.startsWith(BrowserProtocol_),
      isCurOnExt = url.startsWith(BrowserProtocol_),
      inner = forceInner || !page.startsWith(location.origin) ? Settings_.CONST_.VomnibarPageInner_ : page;
      forceInner = forceInner ? forceInner
        : preferWeb ? isCurOnExt || page.startsWith("file:") && !url.startsWith("file:///")
          // it has occurred since Chrome 50 (BrowserVer.Min$tabs$$executeScript$hasFrameIdArg)
          // that HTTPS refusing HTTP iframes.
          || page.startsWith("http:") && !(<RegExpOne> /^http:/).test(url)
             && !(<RegExpOne>/^http:\/\/localhost[:/]/i).test(page)
        : port.s.a || isCurOnExt && !page.startsWith(url.slice(0, url.indexOf("/", url.indexOf("://") + 3) + 1));
      const useInner: boolean = forceInner || page === inner || port.s.t < 0,
      trailingSlash0 = cOptions.trailingSlash,
      trailingSlash: boolean | null | undefined = trailingSlash0 != null ? trailingSlash0 : cOptions.trailing_slash,
      options: CmdOptions[kFgCmd.vomnibar] & SafeObject & Partial<VomnibarNS.GlobalOptions> = BgUtils_.extendIf_(
          BgUtils_.safer_<CmdOptions[kFgCmd.vomnibar]>({
        v: useInner ? inner : page,
        i: useInner ? null : inner,
        t: useInner ? VomnibarNS.PageType.inner : preferWeb ? VomnibarNS.PageType.web : VomnibarNS.PageType.ext,
        s: trailingSlash,
        j: useInner ? "" : Settings_.CONST_.VomnibarScript_f_,
        e: !!(cOptions as Partial<VomnibarNS.GlobalOptions>).exitOnClick,
        k: getSecret()
      }), cOptions as {} as CmdOptions[kFgCmd.vomnibar] & Partial<VomnibarNS.GlobalOptions>);
      if (options.mode === "bookmark") {
        options.mode = "bookm";
      }
      port.postMessage<1, kFgCmd.vomnibar>({
        N: kBgReq.execute, H: ensureInnerCSS(port),
        c: kFgCmd.vomnibar, n: cRepeat,
        a: options
      });
      options.k = -1;
      cOptions = options; // safe on renaming
    },
    /* kBgCmd.createTab: */ BgUtils_.blank_,
    /* kBgCmd.duplicateTab: */ function (): void {
      const tabId = cPort ? cPort.s.t : TabRecency_.curTab_;
      if (tabId < 0) {
        return Backend_.complain_(trans_("dupTab"));
      }
      chrome.tabs.duplicate(tabId);
      if (cRepeat < 2) { return; }
      if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
          || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
          || TabRecency_.incognito_ === IncognitoType.ensuredFalse
          || Settings_.CONST_.DisallowIncognito_
          ) {
        tabsGet(tabId, fallback);
      } else {
        chrome.windows.getCurrent({populate: true}, function (wnd: PopWindow): void {
          const tab = wnd.tabs.filter(tab2 => tab2.id === tabId)[0];
          if (!wnd.incognito || tab.incognito) {
            return fallback(tab);
          }
          for (let count = cRepeat; 0 < --count; ) {
            chrome.tabs.duplicate(tabId);
          }
        });
      }
      function fallback(tab: Tab): void {
        return openMultiTab({
          url: getTabUrl(tab), active: false, windowId: tab.windowId,
          pinned: tab.pinned,
          index: tab.index + 2 , openerTabId: tab.id
        }, cRepeat - 1);
      }
    },
    /* kBgCmd.moveTabToNewWindow: */ function (): void {
      const incognito = !!cOptions.incognito;
      if (incognito && (cPort ? cPort.s.a : TabRecency_.incognito_ === IncognitoType.true)) {
        return reportNoop();
      }
      chrome.windows.getCurrent({populate: true}, incognito ? moveTabToIncognito : moveTabToNewWindow0);
      function moveTabToNewWindow0(this: void, wnd: PopWindow): void {
        const tabs = wnd.tabs, total = tabs.length, all = !!cOptions.all;
        if (!all && total <= 1) { return; } // not need to show a tip
        const tab = selectFrom(tabs), { incognito: curIncognito, index: activeTabIndex } = tab;
        let range: [number, number], count: number;
        if (all) {
          range = [0, count = total];
        } else {
          range = getTabRange(activeTabIndex, total), count = range[1] - range[0];
          if (count >= total) { return Backend_.showHUD_(trans_("moveAllTabs")); }
          if (count > 30) {
            if (Build.BTypes & ~BrowserType.Chrome) {
              if (cNeedConfirm) {
                confirm_(kCName.moveTabToNewWindow, count, moveTabToNewWindow0.bind(null, wnd))
                return;
              }
            } else {
              if (!(count = confirm_(kCName.moveTabToNewWindow, count)!)) { return }
              if (count < 2) { range = [activeTabIndex, activeTabIndex + 1]; }
            }
          }
        }
        return makeWindow({
          tabId: tabs[activeTabIndex].id,
          incognito: curIncognito
        }, wnd.type === "normal" ? wnd.state : "", count > 1 ?
        function (wnd2: Window): void {
          notifyCKey();
          let leftTabs = tabs.slice(range[0], activeTabIndex), rightTabs = tabs.slice(activeTabIndex + 1, range[1]);
          if (Build.MinCVer < BrowserVer.MinNoAbnormalIncognito
              && Build.BTypes & BrowserType.Chrome
              && wnd.incognito && CurCVer_ < BrowserVer.MinNoAbnormalIncognito) {
            const filter = (tab2: Tab): boolean => tab2.incognito === curIncognito;
            leftTabs = leftTabs.filter(filter);
            rightTabs = rightTabs.filter(filter);
          }
          const leftNum = leftTabs.length, rightNum = rightTabs.length;
          const getId = (tab2: Tab): number => tab2.id;
          if (!leftNum) { /* empty */ }
          else if (Build.BTypes & BrowserType.Firefox
              && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
            for (let i = 0; i < leftNum; i++) {
              chrome.tabs.move(leftTabs[i].id, { index: i, windowId: wnd2.id }, onRuntimeError);
            }
          } else {
            chrome.tabs.move(leftTabs.map(getId), {index: 0, windowId: wnd2.id}, onRuntimeError);
            if (leftNum > 1) {
              // on Chrome, current order is [left[0], activeTabIndex, ...left[1:]], so need to move again
              chrome.tabs.move(tabs[activeTabIndex].id, { index: leftNum });
            }
          }
          if (!rightNum) { /* empty */ }
          else if (Build.BTypes & BrowserType.Firefox
              && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
            for (let i = 0; i < rightNum; i++) {
              chrome.tabs.move(rightTabs[i].id, { index: leftNum + 1 + i, windowId: wnd2.id }, onRuntimeError);
            }
          } else {
            chrome.tabs.move(rightTabs.map(getId), { index: leftNum + 1, windowId: wnd2.id }, onRuntimeError);
          }
        } : notifyCKey);
      }
      function reportNoop(): void {
        return Backend_.showHUD_(trans_("hasIncog"));
      }
      function moveTabToIncognito(wnd: PopWindow): void {
        const tab = selectFrom(wnd.tabs);
        if (wnd.incognito && tab.incognito) { return reportNoop(); }
        const options: chrome.windows.CreateData & {url?: string} = {tabId: tab.id, incognito: true},
        url = getTabUrl(tab);
        if (tab.incognito) { /* empty */ }
        else if (Build.MinCVer < BrowserVer.MinNoAbnormalIncognito && Build.BTypes & BrowserType.Chrome
            && wnd.incognito) {
          if (BgUtils_.isRefusingIncognito_(url)) {
            return reportNoop();
          }
          ++tab.index;
          return Backend_.reopenTab_(tab);
        } else if (BgUtils_.isRefusingIncognito_(url)) {
          if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome) ||
              !Build.CreateFakeIncognito ||
              CurCVer_ >= BrowserVer.MinNoAbnormalIncognito || Settings_.CONST_.DisallowIncognito_) {
            return Backend_.complain_(trans_("openIncog"));
          }
        } else {
          options.url = url;
        }
        wnd.tabs = null as never;
        chrome.windows.getAll(function (wnds): void {
          let tabId: number | undefined;
          // eslint-disable-next-line arrow-body-style
          wnds = wnds.filter((wnd2: Window): wnd2 is IncNormalWnd => {
            return wnd2.incognito && wnd2.type === "normal";
          });
          if (wnds.length) {
            chrome.tabs.query({ windowId: wnds[wnds.length - 1].id, active: true }, function ([tab2]): void {
              const tabId2 = options.tabId!;
              if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
                  || !Build.CreateFakeIncognito || options.url) {
                chrome.tabs.create({url: options.url, index: tab2.index + 1, windowId: tab2.windowId});
                selectWnd(tab2);
                chrome.tabs.remove(tabId2);
              } else {
                makeTempWindow(tabId2, true, function (): void {
                  chrome.tabs.move(tabId2, {index: tab2.index + 1, windowId: tab2.windowId}, function (): void {
                    selectTab(tabId2, true);
                    notifyCKey();
                  });
                });
              }
            });
            return;
          }
          let state: chrome.windows.ValidStates | "" = wnd.type === "normal" ? wnd.state : "";
          if (options.url) {
            tabId = options.tabId;
            options.tabId = undefined;
            if (Settings_.CONST_.DisallowIncognito_) {
              options.focused = true;
              state = "";
            }
          }
          // in tests on Chrome 46/51, Chrome hangs at once after creating a new normal window from an incognito tab
          // so there's no need to worry about stranger edge cases like "normal window + incognito tab + not allowed"
          makeWindow(options, state, tabId ? null : notifyCKey);
          if (tabId) {
            chrome.tabs.remove(tabId);
          }
        });
      }
    },
    /* kBgCmd.moveTabToNextWindow: */ function (this: void, [tab]: [Tab]): void {
      chrome.windows.getAll(function (wnds0: Window[]): void {
        let wnds: Window[], ids: number[], index = tab.windowId;
        wnds = wnds0.filter(wnd => wnd.incognito === tab.incognito && wnd.type === "normal");
        if (wnds.length > 0) {
          ids = wnds.map(wnd => wnd.id);
          index = ids.indexOf(index);
          if (ids.length >= 2 || index < 0) {
            let dest = (index + cRepeat) % ids.length;
            index < 0 && cRepeat < 0 && dest++;
            dest < 0 && (dest += ids.length);
            chrome.tabs.query({windowId: ids[dest], active: true}, function ([tab2]): void {
              Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
              ? chrome.tabs.move(tab.id, {
                index: tab2.index + (cOptions.right > 0 ? 1 : 0), windowId: tab2.windowId
              }, function (): void {
                notifyCKey();
                selectTab(tab.id, true);
              })
              : index >= 0 || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito ? callback()
              : makeTempWindow(tab.id, tab.incognito, callback);
              function callback(): void {
                chrome.tabs.move(tab.id, {
                  index: tab2.index + (cOptions.right > 0 ? 1 : 0), windowId: tab2.windowId
                }, function (): void {
                  notifyCKey();
                  selectTab(tab.id, true);
                });
              }
            });
            return;
          }
        } else {
          wnds = wnds0.filter(wnd => wnd.id === index);
        }
        makeWindow({
          tabId: tab.id,
          incognito: tab.incognito
        }, wnds.length === 1 && wnds[0].type === "normal" ? wnds[0].state : "", notifyCKey);
      });
    },
    /* kBgCmd.joinTabs: */ function (this: void): void {
      if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther & BrowserType.Edge)) {
        Backend_.showHUD_("Can not collect tab info of all windows");
        return;
      }
      chrome.windows.getAll(Build.MinCVer < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
          && Build.BTypes & BrowserType.Chrome && CurCVer_ < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
          ? {populate: true} : {populate: true, windowTypes: ["normal", "popup"]},
      (wnds: Array<Window & {tabs: Tab[]}>) => {
        if (Build.MinCVer < BrowserVer.Min$windows$$GetAll$SupportWindowTypes && Build.BTypes & BrowserType.Chrome
            && CurCVer_ < BrowserVer.Min$windows$$GetAll$SupportWindowTypes) {
          wnds = wnds.filter(wnd => wnd.type === "normal" || wnd.type === "popup");
        }
        const curIncognito = TabRecency_.incognito_ === IncognitoType.true, curWndId = TabRecency_.curWnd_;
        wnds = wnds.filter(wnd => wnd.incognito === curIncognito);
        const _cur0 = wnds.filter(wnd => wnd.id === curWndId), _curWnd = _cur0.length ? _cur0[0] : null;
        if (!_curWnd) { return; }
        const cb = (curWnd: typeof wnds[0]): void => {
          const tabIds: number[] = [], push = (j: Tab): void => { tabIds.push(j.id); };
          wnds.sort((i, j) => i.id - j.id).forEach(i => i.tabs.forEach(push));
          if (!tabIds.length) { return; }
          if (!(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox) {
            let start = curWnd.tabs.length;
            for (const tabId of tabIds) {
              chrome.tabs.move(tabId, { windowId: curWnd.id, index: start++ });
            }
          } else {
            chrome.tabs.move(tabIds, { windowId: curWnd.id, index: curWnd.tabs.length });
          }
        };
        if (_curWnd.type === "popup" && _curWnd.tabs.length) {
          // always convert a popup window to a normal one
          let curTabId = _curWnd.tabs[0].id;
          _curWnd.tabs = _curWnd.tabs.filter(i => i.id !== curTabId);
          makeWindow({
            tabId: curTabId,
            incognito: curIncognito
          }, _curWnd.state, cb);
        } else {
          wnds = wnds.filter(wnd => wnd.id !== curWndId);
          cb(_curWnd);
        }
      });
    },
    /* kBgCmd.toggleCS: */ function (this: void, tabs: [Tab]): void {
      if (!Build.PContentSettings) {
        (ContentSettings_.complain_ as () => any)();
        return;
      }
      return ContentSettings_.toggleCS_(cRepeat, cOptions, tabs);
    },
    /* kBgCmd.clearCS: */ function (this: void): void {
      if (!Build.PContentSettings) {
        (ContentSettings_.complain_ as () => any)();
        return;
      }
      return ContentSettings_.clearCS_(cOptions, cPort);
    },
    /* kBgCmd.goToTab: */ function (this: void, tabs: Tab[]): void {
      if (tabs.length < 2) { return; }
      const count = cRepeat, len = tabs.length;
      let cur: Tab | undefined, index = cOptions.absolute
        ? count > 0 ? Math.min(len, count) - 1 : Math.max(0, len + count)
        : abs(count) > tabs.length * 2 ? (count > 0 ? -1 : 0)
        : (cur = Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index + count;
      index = (index >= 0 ? 0 : len) + (index % len);
      let toSelect: Tab = tabs[index];
      if (toSelect.pinned && count < 0 && cOptions.noPinned) {
        let curIndex = (cur || (Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs))).index;
        if (curIndex > index && !tabs[curIndex - 1].pinned) {
          while (tabs[index].pinned) { index++; }
          toSelect = tabs[index];
        }
      }
      if (!toSelect.active) { return selectTab(toSelect.id); }
    },
    /* kBgCmd.removeTab: */ function (this: void, phase?: 1 | 2, tabs?: readonly Tab[]): void {
      const optHighlighted: undefined | boolean | "no-current" = cOptions.highlighted;
      if (!phase) {
        const needTabs = abs(cRepeat) > 1 || optHighlighted || cOptions.goto || cOptions.left;
        (needTabs ? getCurTabs : getCurTab)(BackgroundCommands[kBgCmd.removeTab].bind(null, needTabs ? 2 : 1));
        return;
      }
      if (!tabs || !tabs.length) { return onRuntimeError(); }
      const total = tabs.length, tab = selectFrom(tabs), i = tab.index;
      let count = 1, start = i, end = i + 1;
      if (abs(cRepeat) > 1 && total > 1) {
        const noPinned = tabs[0].pinned !== tab.pinned && !(cRepeat < 0 && tabs[i - 1].pinned);
        let skipped = 0;
        if (noPinned) {
          while (tabs[skipped].pinned) { skipped++; }
        }
        const range = getTabRange(i, total - skipped, total);
        count = range[1] - range[0];
        if (count > 20) {
          if (Build.BTypes & ~BrowserType.Chrome) {
            if (cNeedConfirm) {
              confirm_(kCName.removeTab, count, BackgroundCommands[kBgCmd.removeTab].bind(null, 2, tabs))
              return;
            }
          } else if (!(count = confirm_(kCName.removeTab, count)!)) {
            return;
          }
        }
        if (count > 1) {
          start = skipped + range[0], end = skipped + range[1];
        }
      } else if (optHighlighted) {
        const highlighted = tabs.filter(j => j.highlighted), noCurrent = optHighlighted === "no-current";
        count = highlighted.length;
        if (count > 1 && (noCurrent || count < total)) {
          chrome.tabs.remove(highlighted.filter(j => j !== tab).map(j => j.id), onRuntimeError);
          count = 1;
        }
        if (noCurrent) { return; }
      }
      if (!start && count >= total && (cOptions.mayClose != null ? cOptions.mayClose : cOptions.allow_close) !== true) {
        if (phase < 2) { // from `getCurTab`
          getCurTabs(BackgroundCommands[kBgCmd.removeTab].bind(null, 2));
        } else {
          chrome.windows.getAll(removeAllTabsInWnd.bind(null, tab, tabs));
        }
        return;
      } else if (phase < 2) {
        start = tab.index = 0, end = 1;
      }
      let goto = cOptions.goto || (cOptions.left ? "left" : ""),
      goToIndex = count >= total ? total : goto === "left" ? start > 0 ? start - 1 : end
          : goto === "right" ? end < total ? end : start - 1
          : goto === "previous" ? -2 : total;
      if (goToIndex === -2) {
        let nextTab: Tab | null | undefined = end < total && !(tabs[end].id in TabRecency_.tabs_) ? tabs[end]
          : tabs.filter((j, ind) => (ind < start || ind >= end) && j.id in TabRecency_.tabs_)
            .sort(TabRecency_.rCompare_)[0];
        goToIndex = nextTab ? nextTab.index : total;
      }
      if (goToIndex >= 0 && goToIndex < total) {
        // note: here not wait real removing, otherwise the browser window may flicker
        selectTab(tabs[goToIndex].id);
      }
      removeTabsInOrder(tab, tabs, start, end);
    },
    /* kBgCmd.removeTabsR: */ function (this: void, tabs: Tab[]): void {
      /** `direction` is treated as limited; limited by pinned */
      let activeTab = selectFrom(tabs), direction = cOptions.other ? 0 : cRepeat;
      let i = activeTab.index, noPinned = false;
      const filter: string = cOptions.filter;
      if (direction > 0) {
        ++i;
        tabs = tabs.slice(i, i + direction);
      } else {
        noPinned = i > 0 && tabs[0].pinned && !tabs[i - 1].pinned;
        if (direction < 0) {
          tabs = tabs.slice(Math.max(i + direction, 0), i);
        } else {
          tabs.splice(i, 1);
        }
      }
      if (noPinned) {
        tabs = tabs.filter(tab => !tab.pinned);
      }
      if (filter) {
        const title = filter.includes("title") ? activeTab.title : "",
        full = filter.includes("hash"), activeTabUrl = getTabUrl(activeTab),
        onlyHost = filter.includes("host") ? BgUtils_.safeParseURL_(activeTabUrl) : null,
        urlToFilter = full ? activeTabUrl : onlyHost ? onlyHost.host : activeTabUrl.split("#", 1)[0];
        tabs = tabs.filter(tab => {
          const tabUrl = getTabUrl(tab), parsed = onlyHost ? BgUtils_.safeParseURL_(activeTabUrl) : null
          const url = parsed ? parsed.host : full ? tabUrl : tabUrl.split("#", 1)[0]
          return url === urlToFilter && (!title || tab.title === title)
        });
      }
      if (tabs.length > 0) {
        chrome.tabs.remove(tabs.map(tab => tab.id), onRuntimeError);
      }
    },
    /* kBgCmd.removeRightTab: */ function (this: void, tabs: Tab[]): void {
      if (!tabs) { return; }
      const ind = selectFrom(tabs).index, [start, end] = getTabRange(ind, tabs.length, 0, 1);
      chrome.tabs.remove(tabs[ind + 1 === end || cRepeat > 0 && start !== ind ? start : end - 1].id);
    },
    /* kBgCmd.restoreTab: */ function (this: void): void {
      if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions) && !chrome.sessions) {
        return complainNoSession();
      }
      let count = cRepeat;
      if (abs(count) < 2 && (cPort ? cPort.s.a : TabRecency_.incognito_ === IncognitoType.true)) {
        return Backend_.showHUD_(trans_("notRestoreIfIncog"));
      }
      const limit = chrome.sessions.MAX_SESSION_RESULTS;
      count > limit && (count = limit);
      do {
        chrome.sessions.restore(null, onRuntimeError);
      } while (0 < --count);
    },
    /* kBgCmd.restoreGivenTab: */ function (): void {
      if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions) && !chrome.sessions) {
        return complainNoSession();
      }
      function doRestore(this: void, list: chrome.sessions.Session[]): void {
        if (cRepeat > list.length) {
          return Backend_.showHUD_(trans_("indexOOR"));
        }
        const session = list[cRepeat - 1], item = session.tab || session.window;
        item && chrome.sessions.restore(item.sessionId);
      }
      if (cRepeat > chrome.sessions.MAX_SESSION_RESULTS) {
        return doRestore([]);
      }
      if (cRepeat <= 1) {
        chrome.sessions.restore(null, onRuntimeError);
        return;
      }
      chrome.sessions.getRecentlyClosed(doRestore);
    },
    /* kBgCmd.discardTab: */ function (this: void, tabs: Tab[]): void {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$tabs$$discard
          && CurCVer_ < BrowserVer.Min$tabs$$discard) {
        Backend_.showHUD_(trans_("noDiscardIfOld", [BrowserVer.Min$tabs$$discard]));
      }
      let current = (Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index
        , end = Math.max(0, Math.min(current + cRepeat, tabs.length - 1)),
      count = abs(end - current), step = end > current ? 1 : -1;
      if (count > 20) {
        if (Build.BTypes & ~BrowserType.Chrome) {
          if (cNeedConfirm) {
            confirm_(kCName.discardTab, count, BackgroundCommands[kBgCmd.discardTab].bind(null, tabs))
            return;
          }
        } else {
          count = confirm_(kCName.discardTab, count)!
        }
      }
      if (!count) {
        return;
      }
      const near = tabs[current + step];
      if (!near.discarded && (count < 2 || near.autoDiscardable)) {
        chrome.tabs.discard(near.id, count > 1 ? onRuntimeError : function (): void {
          const err = onRuntimeError();
          err && Backend_.showHUD_(trans_("discardFail"));
          return err;
        });
      }
      for (let i = 2; i <= count; i++) {
        const tab = tabs[current + step * i];
        if (!tab.discarded && tab.autoDiscardable) {
          chrome.tabs.discard(tab.id, onRuntimeError);
        }
      }
    },
    /* kBgCmd.openUrl: */ function (this: void, tabs?: [Tab] | []): void {
      if (cOptions.urls) {
        if (cOptions.urls instanceof Array) {
          tabs && tabs.length > 0 ? openUrls(tabs) : getCurTab(openUrls);
          return onRuntimeError();
        }
      }
      if ((cOptions.url_mask != null || cOptions.url_mark != null) && !tabs) {
        return onRuntimeError() || <any> void getCurTab(BackgroundCommands[kBgCmd.openUrl]);
      }
      let sed = Clipboard_.parseSedOptions_(cOptions as OpenUrlOptions)
      if (cOptions.url) {
        let url = cOptions.url + "";
        if (sed) {
          url = Clipboard_.substitute_(url, sed.k ? SedContext.NONE : SedContext.paste, sed);
        }
        openUrl(url, Urls.WorkType.EvenAffectStatus, tabs);
      } else if (cOptions.copied) {
        const url = BgUtils_.paste_(sed);
        if (url instanceof Promise) {
          url.then(openCopiedUrl.bind(null, tabs));
          return;
        }
        openCopiedUrl(tabs, url);
      } else {
        let url_f = cOptions.url_f as Urls.Url;
        if (sed && typeof url_f === "string" && url_f) {
          url_f = Clipboard_.substitute_(url_f, sed.k ? SedContext.NONE : SedContext.paste, sed);
        }
        openUrl(url_f || "", Urls.WorkType.FakeType, tabs);
      }
    },
    /* kBgCmd.searchInAnother: */ function (this: void, tabs: [Tab]): void {
      let keyword = (cOptions.keyword || "") + "";
      const query = Backend_.parse_({ u: getTabUrl(tabs[0]) });
      if (!query || !keyword) {
        Backend_.showHUD_(trans_(keyword ? "noQueryFound" : "noKw"));
        return;
      }
      let url_f = BgUtils_.createSearchUrl_(query.u.split(" "), keyword, Urls.WorkType.ActAnyway);
      cOptions = BgUtils_.safer_({
        reuse: cOptions.reuse == null ? ReuseType.current : cOptions.reuse,
        opener: true,
        url_f
      });
      BackgroundCommands[kBgCmd.openUrl](tabs);
    },
    /* kBgCmd.togglePinTab: */ function (this: void, tabs: Tab[]): void {
      const tab = selectFrom(tabs), pin = !tab.pinned, action = {pinned: pin}, offset = pin ? 0 : 1;
      let skipped = 0;
      if (abs(cRepeat) > 1 && pin) {
        while (tabs[skipped].pinned) { skipped++; }
      }
      const range = getTabRange(tabs.length < 2 ? 0 : tab.index, tabs.length - skipped, tabs.length);
      let start = skipped + range[offset] - offset, end = skipped + range[1 - offset] - offset;
      let wantedTabIds: number[] = [];
      for (; start !== end; start += pin ? 1 : -1) {
        if (pin || tabs[start].pinned) {
          wantedTabIds.push(tabs[start].id);
        }
      }
      end = wantedTabIds.length;
      if (end > 30) {
        if (Build.BTypes & ~BrowserType.Chrome) {
          if (cNeedConfirm) {
            confirm_(kCName.togglePinTab, end, BackgroundCommands[kBgCmd.togglePinTab].bind(null, tabs))
            return;
          }
        } else {
          if (!(end = confirm_(kCName.togglePinTab, end)!)) {
            return;
          }
          if (end === 1) {
            wantedTabIds = [tab.id];
          }
        }
      }
      for (start = 0; start < end; start++) {
        chrome.tabs.update(wantedTabIds[start], action);
      }
    },
    /* kBgCmd.toggleMuteTab: */ function (): void {
      if (!(Build.BTypes & ~BrowserType.Edge)
          || (Build.BTypes & BrowserType.Edge && OnOther === BrowserType.Edge)
          || Build.MinCVer < BrowserVer.MinMuted && Build.BTypes & BrowserType.Chrome
              && CurCVer_ < BrowserVer.MinMuted) {
        return Backend_.showHUD_(trans_("noMute", [BrowserVer.MinMuted]));
      }
      if (!(cOptions.all || cOptions.other)) {
        getCurTab(function ([tab]: [Tab]): void {
          const wanted = Build.MinCVer < BrowserVer.MinMutedInfo && Build.BTypes & BrowserType.Chrome
              && CurCVer_ < BrowserVer.MinMutedInfo ? !tab.muted : !tab.mutedInfo.muted;
          chrome.tabs.update(tab.id, { muted: wanted });
          Backend_.showHUD_(trans_(wanted ? "muted" : "unmuted"));
        });
        return;
      }
      chrome.tabs.query({audible: true}, function (tabs: Tab[]): void {
        let curId = cOptions.other ? cPort ? cPort.s.t : TabRecency_.curTab_ : GlobalConsts.TabIdNone
          , prefix = curId === GlobalConsts.TabIdNone ? "All" : "Other"
          , muted = false, action = { muted: true };
        for (let i = tabs.length; 0 <= --i; ) {
          const tab = tabs[i];
          if (tab.id !== curId && (Build.MinCVer < BrowserVer.MinMutedInfo && Build.BTypes & BrowserType.Chrome
                  && CurCVer_ < BrowserVer.MinMutedInfo ? !tab.muted : !tab.mutedInfo.muted)) {
            muted = true;
            chrome.tabs.update(tab.id, action);
          }
        }
        if (muted) { return Backend_.showHUD_(trans_("mute", [prefix])); }
        action.muted = false;
        for (let i = tabs.length; 0 <= --i; ) {
          const j = tabs[i].id;
          j !== curId && chrome.tabs.update(j, action);
        }
        Backend_.showHUD_(trans_("unmute", [prefix]));
      });
    },
    /* kBgCmd.reloadTab: */ function (this: void, tabs?: Tab[] | never[] | [Tab]): void {
      const reloadProperties = { bypassCache: (cOptions.hard || cOptions.bypassCache) === true },
      reload = chrome.tabs.reload;
      if (!tabs || tabs.length < 1) {
        if (tabs) {
          getCurWnd(true, wnd => {
            wnd && wnd.tabs.length && BackgroundCommands[kBgCmd.reloadTab](wnd.tabs);
            return onRuntimeError();
          });
        }
        return onRuntimeError();
      }
      if (abs(cRepeat) < 2) {
        reload(selectFrom(tabs).id, reloadProperties);
        return;
      }
      let ind = selectFrom(tabs).index
        , [start, end] = getTabRange(ind, tabs.length);
      if (cOptions.single) {
        ind = ind + 1 === end || cRepeat > 0 && start !== ind ? start : end - 1;
        start = ind; end = ind + 1;
      }
      let count = end - start;
      if (count > 20) {
        if (Build.BTypes & ~BrowserType.Chrome) {
          if (cNeedConfirm) {
            confirm_(kCName.reloadTab, end, BackgroundCommands[kBgCmd.reloadTab].bind(null, tabs))
            return;
          }
        } else {
          if (!(count = confirm_(kCName.reloadTab, count)!)) {
            return;
          }
          if (count === 1) {
            start = ind, end = ind + 1;
          }
        }
      }
      reload(tabs[ind].id, reloadProperties);
      for (; start !== end; start++) {
        start !== ind && reload(tabs[start].id, reloadProperties);
      }
    },
    /* kBgCmd.reopenTab: */ function (this: void, tabs: [Tab] | never[]): void {
      if (tabs.length <= 0) { return; }
      const tab = tabs[0];
      ++tab.index;
      if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
          || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
          || TabRecency_.incognito_ === IncognitoType.ensuredFalse
          || Settings_.CONST_.DisallowIncognito_
          || !BgUtils_.isRefusingIncognito_(getTabUrl(tab))) {
        return Backend_.reopenTab_(tab);
      }
      chrome.windows.get(tab.windowId, function (wnd): void {
        if (wnd.incognito && !tab.incognito) {
          (tab as ReopenOptions).openerTabId = (tab as ReopenOptions).windowId = undefined;
        }
        return Backend_.reopenTab_(tab);
      });
    },
    /* kBgCmd.addBookmark: */ function (this: void): void {
      const path: string = cOptions.folder || cOptions.path
      const nodes = path ? (path + "").replace(<RegExpG> /\\/g, "/").split("/").filter(i => i) : []
      if (!nodes.length) { Backend_.showHUD_('Need "path" to a bookmark folder.'); return }
      chrome.bookmarks.getTree((tree): void => {
        if (!tree) { return onRuntimeError() }
        let roots = tree[0].children!
        let doesMatchRoot = roots.filter(i => i.title === nodes[0])
        if (doesMatchRoot.length) {
          roots = doesMatchRoot
        } else {
          interface ArrayWithReduce<T> extends Array<T> {
            reduce<S>(callbackfn: (previousValue: S, currentValue: T, currentIndex: number, array: ReadonlyArray<T>
                ) => S, initialValue?: S): S;
          }
          roots = (roots.map(i => i.children!) as ArrayWithReduce<(typeof roots)>).reduce((i, j) => i.concat(j))
        }
        let folder: chrome.bookmarks.BookmarkTreeNode | null = null
        for (let node of nodes) {
          roots = roots.filter(i => i.title === node)
          if (!roots.length) {
            return Backend_.showHUD_("The bookmark folder is not found.")
          }
          folder = roots[0]
          roots = folder.children!
          if (!roots) { break }
        }
        (cRepeat * cRepeat < 2 ? getCurTab : Build.BTypes & BrowserType.Firefox
            && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
            ? getCurShownTabs_ff_only! : getCurTabs)(addBookmarks.bind(folder!))
      })
    },
    /* kBgCmd.goUp: */ function (this: void): void {
      if (cRepeat > 0 && cPort && cPort.s.i) {
        cPort = indexFrame(cPort.s.t, 0) || cPort;
      }
      requireURL({
        H: kFgReq.parseUpperUrl,
        u: "", // just a hack to make TypeScript compiler happy
        p: cRepeat,
        t: cOptions.trailingSlash, r: cOptions.trailing_slash,
        s: Clipboard_.parseSedOptions_(cOptions as {}),
        e: true
      });
    },
    /* kBgCmd.moveTab: */ function (this: void, tabs: Tab[]): void {
      const tab = selectFrom(tabs), pinned = tab.pinned;
      let index = Math.max(0, Math.min(tabs.length - 1, tab.index + cRepeat));
      while (pinned !== tabs[index].pinned) { index -= cRepeat > 0 ? 1 : -1; }
      if (index !== tab.index) {
        chrome.tabs.move(tab.id, { index });
      }
    },
    /* kBgCmd.mainFrame: */ function (): void {
      const tabId = cPort ? cPort.s.t : TabRecency_.curTab_, port = indexFrame(tabId, 0);
      if (!port) { return; }
      port.postMessage({
        N: kBgReq.focusFrame,
        H: ensureInnerCSS(port),
        k: cKey,
        c: 0,
        m: framesForTab[tabId]![0] === port ? FrameMaskType.OnlySelf : FrameMaskType.ForcedSelf
      });
    },
    /* kBgCmd.visitPreviousTab: */ function (this: void, tabs: Tab[]): void {
      if (tabs.length < 2) { return; }
      tabs.splice((Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index, 1);
      tabs = tabs.filter(i => i.id in TabRecency_.tabs_).sort(TabRecency_.rCompare_);
      const tab = tabs[cRepeat > 0 ? Math.min(cRepeat, tabs.length) - 1
        : Math.max(0, tabs.length + cRepeat)];
      tab && selectTab(tab.id);
    },
    /* kBgCmd.copyWindowInfo: */ function (this: void): void {
      let decoded = !!(cOptions.decoded || cOptions.decode), type = cOptions.type as string | undefined;
      if (type === "frame" && cPort) {
        requireURL({ H: kFgReq.copy, u: "" as "url", d: decoded, e: Clipboard_.parseSedOptions_(cOptions as {}) });
        return;
      }
      // include those hidden on Firefox
      chrome.tabs.query(type === "browser" ? {windowType: "normal"}
          : { active: type !== "window" && (type !== "tab" || abs(cRepeat) < 2) || void 0,
              currentWindow: true }, (tabs): void => {
        if (!type || type === "title" || type === "frame" || type === "url") {
          requestHandlers[kFgReq.copy]({
            u: (type === "title" ? tabs[0].title : getTabUrl(tabs[0])) as "url",
            d: decoded, e: Clipboard_.parseSedOptions_(cOptions as {})
          }, cPort);
          return;
        }
        const incognito = cPort ? cPort.s.a : TabRecency_.incognito_ === IncognitoType.true,
        rawFormat = cOptions.format, format = "" + (rawFormat || "${title}: ${url}"),
        join = cOptions.join, isPlainJSON = join === "json" && !rawFormat,
        nameRe = <RegExpG & RegExpSearchable<1>> /\$\{([^}]+)\}/g;
        if (type === "tab") {
          const ind = tabs.length < 2 ? 0 : selectFrom(tabs).index, range = getTabRange(ind, tabs.length);
          tabs = tabs.slice(range[0], range[1]);
        } else {
          tabs = tabs.filter(i => i.incognito === incognito);
          tabs.sort((a, b) => (a.windowId - b.windowId || a.index - b.index));
        }
        const data: any[] = tabs.map(i => isPlainJSON ? {
          title: i.title, url: decoded ? BgUtils_.decodeUrlForCopy_(getTabUrl(i)) : getTabUrl(i)
        } : format.replace(nameRe, (_, s1): string => { // eslint-disable-line arrow-body-style
          return decoded && s1 === "url" ? BgUtils_.decodeUrlForCopy_(getTabUrl(i))
            : s1 !== "__proto__" && (i as Dict<any>)[s1] || "";
        })),
        result = BgUtils_.copy_(data, join, Clipboard_.parseSedOptions_(cOptions as {}));
        Backend_.showHUD_(type === "tab" && tabs.length < 2 ? result : trans_("copiedWndInfo")
            , type === "url" ? kTip.noUrlCopied : kTip.noTextCopied)
      });
    },
    /* kBgCmd.clearFindHistory: */ function (this: void): void {
      const incognito = cPort ? cPort.s.a : TabRecency_.incognito_ === IncognitoType.true;
      FindModeHistory_.removeAll_(incognito);
      return Backend_.showHUD_(trans_("fhCleared", [incognito ? trans_("incog") : ""]));
    },
    /* kBgCmd.toggleTabUrl: */ function (this: void, tabs: [Tab]): void {
      let tab = tabs[0], url = getTabUrl(tab);
      const reader = cOptions.reader, keyword = cOptions.keyword
      if (url.startsWith(BrowserProtocol_)) {
        Backend_.complain_(trans_(reader ? "noReader" : "openExtSrc"))
        return
      }
      if (reader && keyword) {
        const query = Backend_.parse_({ u: url });
        if (query && query.k === keyword) {
          cOptions = BgUtils_.extendIf_({keyword: ""}, cOptions)
          openUrl(query.u, Urls.WorkType.Default, tabs)
        } else {
          url = BgUtils_.convertToUrl_(query && cOptions.parsed ? query.u : url, keyword)
          openUrl(url, Urls.WorkType.FakeType, tabs)
        }
        return
      }
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
          && reader) {
        (browser as typeof chrome & {
          tabs: typeof chrome.tabs & { toggleReaderMode? (tabId: number): Promise<void> }
        }).tabs.toggleReaderMode!(tab.id).catch((): void => {
          Backend_.reopenTab_(tab, 0, { openInReaderMode: true })
        });
        return;
      }
      if (reader) {
        if (Build.BTypes & BrowserType.Chrome && IsEdg_ && BgUtils_.protocolRe_.test(url)) {
          url = url.startsWith("read:") ? BgUtils_.DecodeURLPart_(url.slice(url.indexOf("?url=") + 5))
              : `read://${new URL(url).origin.replace(<RegExpG> /:\/\/|:/g, "_")}/?url=${
                  BgUtils_.encodeAsciiComponent(url)}`
          openUrl(url, Urls.WorkType.FakeType, tabs)
        } else {
          Backend_.complain_(trans_("noReader"))
        }
        return
      }
      url = url.startsWith("view-source:") ? url.slice(12) : ("view-source:" + url);
      openUrl(url, Urls.WorkType.FakeType, tabs)
    },
    /* kBgCmd.clearMarks: */ function (this: void): void {
      cOptions.local ? requireURL({ H: kFgReq.marks, u: "", a: kMarkAction.clear }, true) : Marks_.clear_();
    },
    /* kBgCmd.toggleVomnibarStyle: */ function (this: void, tabs: [Tab]): void {
      const tabId = tabs[0].id, toggled = ((cOptions.style || "") + "").trim(), current = !!cOptions.current;
      if (!toggled) {
        Backend_.showHUD_(trans_("noStyleName"));
        return;
      }
      for (const frame of framesForOmni) {
        if (frame.s.t === tabId) {
          frame.postMessage({ N: kBgReq.omni_toggleStyle, t: toggled, c: current });
          return;
        }
      }
      if (current) { return; }
      requestHandlers[kFgReq.setOmniStyle]({ t: toggled, o: 1 });
    },
    // only work on Chrome: Firefox has neither tabs.goBack, nor support for tabs.update("javascript:...")
    /* kBgCmd.goBackFallback: */ Build.BTypes & BrowserType.Chrome ? function (tabs: [Tab]): void {
      if (!tabs.length) { return onRuntimeError(); }
      requestHandlers[kFgReq.framesGoBack]({
        s: cRepeat, r: cOptions.reuse as UserReuseType | null | undefined
      }, null, tabs[0])
    } : BgUtils_.blank_,
    /* kBgCmd.showTip: */ function (this: void): void {
      let text = cOptions.text;
      Backend_.showHUD_(text ? text + "" : trans_("needText"));
    },
    /* kBgCmd.autoOpenFallback: */ function (this: void): void {
      cOptions = BgUtils_.safer_<OpenUrlOptionsInBgCmd>({
        copied: true,
        keyword: cOptions.keyword
      });
      BackgroundCommands[kBgCmd.openUrl]();
    },
    /* kBgCmd.toggleZoom: */ function (this: void): void {
      if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
          || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox && !chrome.tabs.getZoom) {
        Backend_.complain_("control zoom settings of tabs");
        return;
      }
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Tabs$$setZoom
          && CurCVer_ < BrowserVer.Min$Tabs$$setZoom) {
        Backend_.showHUD_(`Vimium C can not control zoom settings before Chrome ${BrowserVer.Min$Tabs$$setZoom}`);
        return;
      }
      chrome.tabs.getZoom(curZoom => {
        if (!curZoom) { return onRuntimeError(); }
        cRepeat < -4 && (cRepeat = -cRepeat);
        let newZoom = curZoom, m = Math;
        if (cRepeat > 4) {
          newZoom = cRepeat / (cRepeat > 1000 ? cRepeat : cRepeat > 49 ? 100 : 10);
          newZoom = !(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
              ? m.max(0.3, m.min(newZoom, 3)) : m.max(0.25, m.min(newZoom, 5));
        } else {
          let nearest = 0, delta = 9,
          steps = !(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
              ? [0.3, 0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.2, 1.33, 1.5, 1.7, 2, 2.4, 3]
              : [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
          for (let ind = 0, d2 = 0; ind < steps.length && (d2 = abs(steps[ind] - curZoom)) < delta; ind++) {
            nearest = ind; delta = d2;
          }
          newZoom = steps[nearest + cRepeat < 0 ? 0 : m.min(nearest + cRepeat, steps.length - 1)];
        }
        if (abs(newZoom - curZoom) > 0.005) {
          chrome.tabs.setZoom(newZoom);
        }
      });
    }
  ],
  numHeadRe = <RegExpOne> /^-?\d+|^-/,
  onLargeCountConfirmed = function (this: CommandsNS.Item): void {
    executeCommand(this, 1, cKey, cPort, cRepeat);
  },
  executeCommand = (registryEntry: CommandsNS.Item
      , count: number, lastKey: kKeyCode, port: Port, overriddenCount: number): void => {
    const { options_: options, repeat_: repeat } = registryEntry;
    let scale: number | undefined;
    if (options && (scale = options.count)) { count = count * scale; }
    count = Build.BTypes & ~BrowserType.Chrome && overriddenCount
      || (count >= GlobalConsts.CommandCountLimit + 1 ? GlobalConsts.CommandCountLimit
          : count <= -GlobalConsts.CommandCountLimit - 1 ? -GlobalConsts.CommandCountLimit
          : (count | 0) || 1);
    if (count === 1) { /* empty */ }
    else if (repeat === 1) { count = 1; }
    else if (repeat > 0 && (count > repeat || count < -repeat)) {
      if (Build.BTypes & ~BrowserType.Chrome) {
        if (!overriddenCount) {
          cKey = lastKey;
          cPort = port;
          confirm_<kCName, 1>(registryEntry.command_, abs(cRepeat = count), onLargeCountConfirmed.bind(registryEntry))
          return;
        }
      } else {
        count = confirm_<kCName, 1>(registryEntry.command_, abs(count))! * (count < 0 ? -1 : 1)
      }
      if (!count) { return; }
    } else { count = count || 1; }
    if (!registryEntry.background_) {
      const { alias_: fgAlias } = registryEntry,
      dot = (kEnds.FgCmd <= 32 || fgAlias < 32) && ((
        (1 << kFgCmd.marks) | (1 << kFgCmd.passNextKey) | (1 << kFgCmd.focusInput)
      ) >> fgAlias) & 1;
      port.postMessage({ N: kBgReq.execute, H: dot ? ensureInnerCSS(port) : null, c: fgAlias, n: count, a: options });
      return;
    }
    const { alias_: alias } = registryEntry, func = BackgroundCommands[alias];
    // safe on renaming
    cOptions = options || BgUtils_.safeObj_();
    cPort = port;
    cRepeat = count;
    cKey = lastKey;
    count = BgCmdInfo[alias];
    if (count < UseTab.ActiveTab) {
      return (func as BgCmdNoTab)();
    } else if (count < UseTab.CurWndTabsIfRepeat || count === UseTab.CurWndTabsIfRepeat && abs(cRepeat) < 2) {
      getCurTab(func as BgCmdActiveTab);
    } else if (Build.BTypes & BrowserType.Firefox && count > UseTab.CurWndTabs) {
      getCurShownTabs_ff_only!(func as BgCmdCurWndTabs);
    } else {
      getCurTabs(func as BgCmdCurWndTabs);
    }
  },
  requestHandlers: {
    [K in keyof FgReqWithRes | keyof FgReq]:
      K extends keyof SpecialHandlers ? SpecialHandlers[K] :
      K extends keyof FgReqWithRes ? (((this: void, request: FgReqWithRes[K], port: Port) => FgRes[K])
        | (K extends keyof FgReq ? (this: void, request: FgReq[K], port: Port) => void : never)) :
      K extends keyof FgReq ? ((this: void, request: FgReq[K], port: Port) => void) :
      never;
  } = [
    /** kFgReq.setSetting: */ function (this: void, request: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>
        , port: Port): void {
      const k = request.k, allowed = Settings_.frontUpdateAllowed_;
      if (!(k >= 0 && k < allowed.length)) {
        cPort = port;
        return Backend_.complain_(trans_("notModify", [k]));
      }
      const key = allowed[k], p = Settings_.restore_ && Settings_.restore_();
      if (Settings_.get_(key) === request.v) { return; }
      p ? p.then(() => { Settings_.set_(key, request.v); }) : Settings_.set_(key, request.v);
      interface BaseCheck { key: 123 }
      type Map1<T> = T extends keyof SettingsNS.DirectlySyncedItems ? T : 123;
      interface Check extends BaseCheck { key: Map1<keyof SettingsNS.FrontUpdateAllowedSettings> }
      if (!Build.NDEBUG) { // just a type assertion
        let obj: Check = {
          key: key as keyof SettingsNS.FrontUpdateAllowedSettings & keyof SettingsNS.DirectlySyncedItems
        };
        console.log("updated from content scripts:", obj);
      }
    },
    /** kFgReq.findQuery: */ function (this: void, request: FgReq[kFgReq.findQuery] | FgReqWithRes[kFgReq.findQuery]
        , port: Port): FgRes[kFgReq.findQuery] | void {
      return FindModeHistory_.query_(port.s.a, request.q, request.i);
    },
    /** kFgReq.parseSearchUrl: */ function (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl]
        , port: Port): FgRes[kFgReq.parseSearchUrl] | void {
      let search = Backend_.parse_(request);
      if ("i" in request) {
        port.postMessage({ N: kBgReq.omni_parsed, i: request.i!, s: search });
      } else {
        return search;
      }
    },
    /** kFgReq.parseUpperUrl: */ function (this: void, request: FgReqWithRes[kFgReq.parseUpperUrl]
        , port?: Port | null): FgRes[kFgReq.parseUpperUrl] | void {
      if ((request as FgReq[kFgReq.parseUpperUrl]).e) {
        (request as FgReq[kFgReq.parseUpperUrl]).e = false;
        const result = requestHandlers[kFgReq.parseUpperUrl](request);
        if (result.p == null) {
          cPort = port!;
          Backend_.showHUD_(result.u);
        } else if (port) {
          port.postMessage<1, kFgCmd.framesGoBack>({ N: kBgReq.execute,
            H: null, c: kFgCmd.framesGoBack, n: 1,
            a: { r: 1, url: result.u } });
        } else {
          chrome.tabs.update({ url: result.u });
        }
        return;
      }
      let { u: url } = request, url_l = url.toLowerCase();
      if (!BgUtils_.protocolRe_.test(BgUtils_.removeComposedScheme_(url_l))) {
        BgUtils_.resetRe_();
        return { u: "This url has no upper paths", p: null };
      }
      const enc = encodeURIComponent;
      let hash = "", str: string, arr: RegExpExecArray | null, startWithSlash = false, endSlash = false
        , removeSlash = false
        , path: string | null = null, i: number, start = 0, end = 0, decoded = false, arr2: RegExpExecArray | null;
      if (i = url.lastIndexOf("#") + 1) {
        hash = url.slice(i + +(url.substr(i, 1) === "!"));
        str = BgUtils_.DecodeURLPart_(hash);
        i = str.lastIndexOf("/");
        if (i > 0 || (i === 0 && str.length > 1)) {
          decoded = str !== hash;
          const argRe = <RegExpOne> /([^&=]+=)([^&\/=]*\/[^&]*)/;
          arr = argRe.exec(str) || (<RegExpOne> /(^|&)([^&\/=]*\/[^&=]*)(?:&|$)/).exec(str);
          path = arr ? arr[2] : str;
          // here `path` is ensured not empty
          if (path === "/" || path.includes("://")) { path = null; }
          else if (!arr) { start = 0; }
          else if (!decoded) { start = arr.index + arr[1].length; }
          else {
            str = "https://example.com/";
            str = encodeURI(str + path).slice(str.length);
            i = hash.indexOf(str);
            if (i < 0) {
              i = hash.indexOf(str = enc(path));
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
                str = enc(str.slice(0, -1));
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
              path = BgUtils_.DecodeURLPart_(arr2[2]);
              start = arr2.index + arr2[1].length;
              end = start + arr2[2].length;
            } else if ((str = arr[1]) !== "&") {
              i = url.length - hash.length;
              hash = str + enc(path);
              url = url.slice(0, i) + hash;
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
        if (url_l.startsWith(BrowserProtocol_) && !request.f) {
          BgUtils_.resetRe_();
          return { u: "An extension has no upper-level pages", p: null };
        }
        hash = "";
        start = url.indexOf("/", url.indexOf("://") + 3);
        if (url_l.startsWith("filesystem:")) { start = url.indexOf("/", start + 1); }
        start = start < 0 ? 0 : start;
        i = url.indexOf("?", start);
        end = url.indexOf("#", start);
        i = end < 0 ? i : i < 0 ? end : i < end ? i : end;
        i = i > 0 ? i : url.length;
        path = url.slice(start, i);
        end = 0;
        decoded = false;
      }
      // Note: here should ensure `end` >= 0
      i = request.p;
      startWithSlash = path.startsWith("/");
      if (!hash && url_l.startsWith("file:")) {
        if (path.length <= 1 || url.length === 11 && url.endsWith(":/")) {
          if (request.f) {
            i = 0;
          } else {
            BgUtils_.resetRe_();
            return { u: "This has been the root path", p: null };
          }
        }
        endSlash = true;
        request.f || i === 1 && (i = -1);
      } else if (!hash && url_l.startsWith("ftp:")) {
        endSlash = true;
      } else {
        endSlash = request.t != null ? !!request.t : request.r != null ? !!request.r
          : path.length > 1 && path.endsWith("/")
            || (<RegExpI> /\.([a-z]{2,3}|apng|jpeg|tiff)$/i).test(path); // just a try: not include .html
      }
      {
        const arr3 = path.slice(+startWithSlash, path.length - +path.endsWith("/")).split("/");
        const len = arr3.length, level = i < 0 ? i + len : i;
        removeSlash = len <= 1 && i <= -2 && url.lastIndexOf("#", start) > 0;
        i = level > len ? len : i > 0 ? level - 1 : level > 0 ? level : 0;
        {
          arr3.length = i;
          path = arr3.join("/");
        }
      }
      if (str = request.a || "") {
        path += str[0] === "/" ? str : "/" + str;
      }
      path = path ? (path[0] === "/" ? "" : "/") + path + (!endSlash || path.endsWith("/") ? "" : "/") : "/";
      if (!end && url.lastIndexOf("git", start - 3) > 0) {
        path = /*#__NOINLINE__*/ upperGitUrls(url, path) || path;
      }
      if (removeSlash && (!path || path === "/")) {
        url = url.split("#", 1)[0];
      } else {
        str = decoded ? enc(path) : path;
        url = url.slice(0, start) + (end ? str + url.slice(end) : str);
      }
      let substituted = Clipboard_.substitute_(url, SedContext.gotoUrl, request.s) || url
      if (substituted !== url) {
        // if substitution returns an invalid URL, then refuse it
        BgUtils_.convertToUrl_(substituted, null, Urls.WorkType.KeepAll)
        url = BgUtils_.lastUrlType_ === Urls.Type.Full ? substituted : url
      }
      BgUtils_.resetRe_();
      return { u: url, p: path };
    } as SpecialHandlers[kFgReq.parseUpperUrl],
    /** kFgReq.searchAs: */ function (this: void, request: FgReq[kFgReq.searchAs], port: Port): void {
      let search = Backend_.parse_(request), query: string | null | Promise<string | null>;
      if (!search || !search.k) {
        cPort = port;
        return Backend_.showHUD_(trans_("noEngineFound"));
      }
      query = request.t.trim() || (request.c ? BgUtils_.paste_(request.s) : "");
      if (query instanceof Promise) {
        query.then(doSearch);
        return;
      }
      doSearch(query);
      function doSearch(this: void, query2: string | null): void {
        let err = query2 === null ? "It's not allowed to read clipboard"
          : (query2 = query2.trim()) ? "" : trans_("noSelOrCopied");
        if (err) {
          cPort = port;
          Backend_.showHUD_(err);
          return;
        }
        query2 = BgUtils_.createSearchUrl_(query2!.split(BgUtils_.spacesRe_), search!.k);
        openShowPage(query2, ReuseType.current, {}) || safeUpdate(query2);
      }
    },
    /** kFgReq.gotoSession: */ function (this: void, request: FgReq[kFgReq.gotoSession], port?: Port): void {
      const id = request.s, active = request.a !== false;
      cPort = findCPort(port)!;
      if (typeof id === "number") {
        chrome.tabs.update(id, {active: true}, function (tab): void {
          const err = onRuntimeError();
          err ? Backend_.showHUD_(trans_("noTabItem") ) : selectWnd(tab);
          return err;
        });
        return;
      }
      if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions) && !chrome.sessions) {
        return complainNoSession();
      }
      chrome.sessions.restore(id, function (): void {
        const err = onRuntimeError();
        err && Backend_.showHUD_(trans_("noSessionItem"));
        return err;
      });
      if (active) { return; }
      let tabId = port!.s.t;
      tabId >= 0 || (tabId = TabRecency_.curTab_);
      if (tabId >= 0) { return selectTab(tabId); }
    },
    /** kFgReq.openUrl: */ function (this: void, request: FgReq[kFgReq.openUrl] & { url_f?: Urls.Url; opener?: boolean }
        , port?: Port): void {
      BgUtils_.safer_(request);
      let unsafe = port != null && isNotVomnibarPage(port, true);
      cPort = unsafe ? port! : findCPort(port) || cPort;
      let url: Urls.Url | undefined = request.u;
      // { url_f: string, ... } | { copied: true, ... }
      const opts: OpenUrlOptionsInBgCmd & SafeObject = BgUtils_.safeObj_();
      const _rawKey = request.k, keyword = (_rawKey || "") + ""
      const _rawTest = request.t, testUrl = _rawTest != null ? _rawTest : !keyword
      const incognito = request.i === "reverse" ? cPort ? !cPort.s.a : null : request.i
      const reuse = request.r
      opts.reuse = incognito != null && (!reuse || reuse === "current") && (!cPort || incognito !== cPort.s.a)
          ? ReuseType.newFg : reuse
      opts.incognito = incognito
      opts.sed = request.e;
      if (url) {
        if (url[0] === ":" && request.o && (<RegExpOne> /^:[bdhostw]\s/).test(url)) {
          url = url.slice(2).trim();
          url || (unsafe = false);
        }
        if (request.f) { /* empty */ }
        else if (testUrl) {
          url = BgUtils_.fixCharsInUrl_(url);
          url = BgUtils_.convertToUrl_(url, keyword
              , unsafe ? Urls.WorkType.ConvertKnown : Urls.WorkType.EvenAffectStatus);
          const type = BgUtils_.lastUrlType_;
          if (request.h != null && (type === Urls.Type.NoSchema || type === Urls.Type.NoProtocolName)) {
            url = (request.h ? "https" : "http") + (url as string).slice((url as string)[4] === "s" ? 5 : 4);
          } else if (unsafe && type === Urls.Type.PlainVimium && (url as string).startsWith("vimium:")) {
            url = BgUtils_.convertToUrl_(url as string);
          }
        } else {
          url = BgUtils_.createSearchUrl_(url.trim().split(BgUtils_.spacesRe_), keyword || "~")
        }
        opts.opener = unsafe && !request.n;
        opts.url_f = url;
      } else {
        opts.copied = request.c; opts.keyword = keyword; opts.testUrl = _rawTest
      }
      cRepeat = 1;
      cOptions = opts;
      BackgroundCommands[kBgCmd.openUrl]();
    },
    /** kFgReq.focus: */ function (this: void, _0: FgReq[kFgReq.focus], port: Port): void {
      if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox) {
        if (port.s.f & Frames.Flags.OtherExtension) {
          port.postMessage({ N: kBgReq.injectorRun, t: InjectorTask.reportLiving });
        }
      }
      let tabId = port.s.t, ref = framesForTab[tabId], status: Frames.ValidStatus;
      if (!ref) {
        needIcon && Backend_.setIcon_(tabId, port.s.s);
        return;
      }
      if (port === ref[0]) { return; }
      if (needIcon && (status = port.s.s) !== ref[0].s.s) {
        (ref as Writable<typeof ref>)[0] = port;
        Backend_.setIcon_(tabId, status);
        return;
      }
      (ref as Writable<typeof ref>)[0] = port;
    },
    /** kFgReq.checkIfEnabled: */ function (this: void, request: ExclusionsNS.Details | FgReq[kFgReq.checkIfEnabled]
        , from_content?: Frames.Port): void {
      let port: Frames.Port | null | undefined = from_content;
      if (!port) {
        port = indexFrame((request as ExclusionsNS.Details).tabId, (request as ExclusionsNS.Details).frameId);
        if (!port) { return; }
      }
      const { s: sender } = port, { u: oldUrl } = sender,
      url1: string | undefined = (request as ExclusionsNS.Details).url,
      pattern = Backend_.getExcluded_(sender.u = from_content ? (request as FgReq[kFgReq.checkIfEnabled]).u
                  : url1
        , sender),
      status = pattern === null ? Frames.Status.enabled : pattern ? Frames.Status.partial : Frames.Status.disabled;
      if (sender.s !== status) {
        if (sender.f & Frames.Flags.locked) { return; }
        sender.s = status;
        if (needIcon && framesForTab[sender.t]![0] === port) {
          Backend_.setIcon_(sender.t, status);
        }
      } else if (!pattern || pattern === Backend_.getExcluded_(oldUrl, sender)) {
        return;
      }
      port.postMessage({ N: kBgReq.reset, p: pattern });
    },
    /** kFgReq.nextFrame: */ function (this: void, request: FgReq[kFgReq.nextFrame], port: Port): void {
      cPort = port;
      cRepeat = 1;
      cKey = request.k;
      const type = request.t || Frames.NextType.Default;
      if (type !== Frames.NextType.current) {
        return BackgroundCommands[type === Frames.NextType.parent ? kBgCmd.parentFrame : kBgCmd.nextFrame]();
      }
      const ports = framesForTab[port.s.t];
      if (ports) {
        ports[0].postMessage({
          N: kBgReq.focusFrame,
          H: null,
          k: cKey,
          c: 0,
          m: FrameMaskType.NoMask
        });
        return;
      }
      safePost(port, { N: kBgReq.omni_returnFocus, l: cKey });
    },
    /** kFgReq.exitGrab: */ function (this: void, _0: FgReq[kFgReq.exitGrab], port: Port): void {
      const ports = framesForTab[port.s.t];
      if (!ports) { return; }
      ports[0].s.f |= Frames.Flags.userActed;
      if (ports.length < 3) { return; }
      for (let msg: Req.bg<kBgReq.exitGrab> = { N: kBgReq.exitGrab }, i = ports.length; 0 < --i; ) {
        const p = ports[i];
        if (p !== port) {
          p.postMessage(msg);
          p.s.f |= Frames.Flags.userActed;
        }
      }
    },
    /** kFgReq.execInChild: */ function (this: void, request: FgReqWithRes[kFgReq.execInChild]
        , port: Port): FgRes[kFgReq.execInChild] {
      const tabId = port.s.t, ports = framesForTab[tabId], url = request.u;
      if (!ports || ports.length < 3) { return false; }
      let iport: Port | null = null, i = ports.length;
      while (1 <= --i) {
        if (ports[i].s.u === url) {
          if (iport) { iport = null; break; }
          iport = ports[i];
        }
      }
      if (iport) {
        cKey = request.k;
        focusAndRun(request, port, iport, 1);
      } else {
        const nav = chrome.webNavigation;
        nav && nav.getAllFrames({tabId: port.s.t}, (frames): void => {
          let childId = 0, self = port.s.i;
          for (const i1 of frames) {
            if (i1.parentFrameId === self) {
              if (childId) { childId = 0; break; }
              childId = i1.frameId;
            }
          }
          const port2 = childId && indexFrame(tabId, childId);
          if (port2) {
            cKey = request.k;
            focusAndRun(request, port, port2, 1);
          }
          // here seems useless if to retry to inject content scripts,
          // see https://github.com/philc/vimium/issues/3353#issuecomment-505564921
        });
      }
      return !!iport;
    },
    /** kFgReq.initHelp: */ function (this: void, request: FgReq[kFgReq.initHelp], port: Port): void {
      Promise.all([
        BgUtils_.require_("HelpDialog"),
        new Promise<void>(function (resolve) {
          Settings_.fetchFile_("helpDialog", resolve);
        })
      ]).then(function (args): void {
        const port2 = request.w && indexFrame(port.s.t, 0) || port,
        isOptionsPage = port2.s.u.startsWith(Settings_.CONST_.OptionsPage_),
        options = request.a || {};
        (port2 as Frames.Port).s.f |= Frames.Flags.hadHelpDialog;
        port2.postMessage<1, kFgCmd.showHelpDialog>({
          N: kBgReq.execute, H: ensureInnerCSS(port2),
          c: kFgCmd.showHelpDialog, n: 1,
          a: {
          h: args[0].render_(isOptionsPage),
          o: Settings_.CONST_.OptionsPage_,
          e: !!options.exitOnClick,
          c: Settings_.get_("showAdvancedCommands", true) || isOptionsPage && Settings_.temp_.cmdErrors_ !== 0
          }
        });
      }, Build.NDEBUG ? null : function (args): void {
        console.error("Promises for initHelp failed:", args[0], ";", args[1]);
      });
    },
    /** kFgReq.css: */ function (this: void, _0: {}, port: Port): void {
      (port as Frames.Port).s.f |= Frames.Flags.hasCSSAndActed;
      port.postMessage({ N: kBgReq.showHUD, H: Settings_.cache_.innerCSS });
    },
    /** kFgReq.vomnibar: */ function (this: void, request: FgReq[kFgReq.vomnibar]
        , port: Port): void {
      const { c: count, i: inner } = request;
      cKey = kKeyCode.None; // it's only from VHints' task / VOmni reloading, so no Key to suppress
      if (count != null) {
        delete request.c, delete (request as Partial<Req.baseFg<kFgReq.vomnibar>>).H, delete request.i;
        cRepeat = +count || 1;
        cOptions = BgUtils_.safer_(request);
      } else if (request.r !== true) {
        return;
      } else if (cOptions == null || cOptions.secret !== -1) {
        if (inner) { return; }
        cOptions = BgUtils_.safeObj_();
        cRepeat = 1;
      } else if (inner && (cOptions as any as CmdOptions[kFgCmd.vomnibar]).v === Settings_.CONST_.VomnibarPageInner_) {
        return;
      }
      cPort = port;
      return (BackgroundCommands[kBgCmd.showVomnibar] as (this: void, forceInner?: boolean) => void)(inner);
    },
    /** kFgReq.omni: */ function (this: void, request: FgReq[kFgReq.omni], port: Port): void {
      if (isNotVomnibarPage(port, false)) { return; }
      return Completion_.filter_(request.q, request,
      PostCompletions.bind<Port, 0 | 1 | 2
          , Parameters<CompletersNS.Callback>, void>(port
        , (request.i! | 0) as 0 | 1 | 2));
    },
    /** kFgReq.copy: */ function (this: void, request: FgReq[kFgReq.copy], port: Port): void {
      let str: string | string[] | object[] | undefined
      str = request.u || request.s;
      if (request.d) {
        if (typeof str !== "string") {
          for (let i = str.length; 0 <= --i; ) {
            str[i] = BgUtils_.decodeUrlForCopy_(str[i] + "")
          }
        } else {
          str = BgUtils_.decodeUrlForCopy_(str)
        }
      } else {
        if (str.length < 4 && !(str as string).trim() && str[0] === " ") {
          str = "";
        }
      }
      str = str && BgUtils_.copy_(str, request.j, request.e);
      cPort = port;
      str = request.s && typeof request.s === "object" ? `[${request.s.length}] ` + request.s.slice(-1)[0] : str
      Backend_.showHUD_(request.d ? str.replace(<RegExpG & RegExpSearchable<0>> /%(20|0[9ADad])/g, decodeURIComponent)
          : str, request.u ? kTip.noUrlCopied : kTip.noTextCopied);
    },
    /** kFgReq.key: */ function (this: void, request: FgReq[kFgReq.key], port: Port): void {
      (port as Frames.Port).s.f |= Frames.Flags.userActed;
      let key: string = request.k, count = 1
        , arr: null | string[] = numHeadRe.exec(key);
      if (arr != null) {
        let prefix = arr[0];
        key = key.slice(prefix.length);
        count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1;
      }
      const ref = CommandsData_.keyToCommandRegistry_;
      if (!(key in ref)) {
        arr = key.match(BgUtils_.keyRe_)!;
        key = arr[arr.length - 1];
        count = 1;
      }
      const registryEntry = ref[key]!;
      BgUtils_.resetRe_();
      executeCommand(registryEntry, count, request.l, port, 0);
    },
    /** kFgReq.marks: */ function (this: void, request: FgReq[kFgReq.marks], port: Port): void {
      cPort = port;
      switch (request.a) {
      case kMarkAction.create: return Marks_.createMark_(request, port);
      case kMarkAction.goto: return Marks_.gotoMark_(request, port);
      case kMarkAction.clear: return Marks_.clear_(request.u);
      default: return;
      }
    },
    /** safe when cPort is null */
    /** kFgReq.focusOrLaunch: */ function (this: void, request: MarksNS.FocusOrLaunch
        , _port?: Port | null, notFolder?: true): void {
      // * do not limit windowId or windowType
      let url = BgUtils_.reformatURL_(request.u.split("#", 1)[0]), callback = focusOrLaunch[0];
      let cb2: (result: Tab[], exArg: FakeArg) => void;
      if (!notFolder && url.startsWith("file:") && !url.includes(".", url.lastIndexOf("/") + 1)) {
        url += "/";
        cb2 = function (tabs): void {
          return tabs && tabs.length > 0 ? callback.call(request, tabs)
            : requestHandlers[kFgReq.focusOrLaunch](request, null, true);
        };
      } else {
        request.p && (url += "*");
        cb2 = callback.bind(request);
      }
      chrome.tabs.query({ url, windowType: "normal" }, cb2);
    },
    /** kFgReq.cmd: */ function (this: void, request: FgReq[kFgReq.cmd], port: Port): void {
      const cmd = request.c as keyof ShortcutInfoMap, id = request.i;
      if (id >= -1 && gCmdTimer !== id) { return; } // an old / aborted / test message
      setupSingletonCmdTimer(0);
      if (request.r) {
        onConfirm(request.r);
        return;
      }
      executeCommand(CommandsData_.shortcutRegistry_[cmd]
          , request.n, kKeyCode.None, port, 0);
    },
    /** kFgReq.removeSug: */ function (this: void, req: FgReq[kFgReq.removeSug], port?: Port): void {
      return Backend_.removeSug_(req, port);
    },
    /** kFgReq.openImage: */ function (req: FgReq[kFgReq.openImage], port: Port): void {
      let url = req.u
      if (!BgUtils_.safeParseURL_(url)) {
        cPort = port;
        Backend_.showHUD_(trans_("invalidImg"));
        return;
      }
      let prefix = Settings_.CONST_.ShowPage_ + "#!image ";
      if (req.f) {
        prefix += "download=" + BgUtils_.encodeAsciiComponent(req.f) + "&";
      }
      if (req.a !== false) {
        prefix += "auto=once&";
      }
      url = req.e ? Clipboard_.substitute_(url, SedContext.paste, req.e) : url
      openShowPage(prefix + url, req.r, { opener: true });
    },
    /** kFgReq.evalJSFallback" */ (req: FgReq[kFgReq.evalJSFallback], port: Port): void => {
      cPort = null as never
      openJSUrl(req.u, (): void => {
        cPort = port
        Backend_.showHUD_(trans_("jsFail"))
      })
    },
    /** kFgReq.gotoMainFrame: */ function (this: void, req: FgReq[kFgReq.gotoMainFrame], port: Port): void {
      // Now that content scripts always auto-reconnect, it's not needed to find a parent frame.
      focusAndRun(req, port, indexFrame(port.s.t, 0), req.f);
    },
    /** kFgReq.setOmniStyle: */ function (this: void, req: FgReq[kFgReq.setOmniStyle], port?: Port): void {
      let styles: string, payload = Settings_.omniPayload_, curStyles = payload.s;
      if (!req.o && Settings_.temp_.omniStyleOverridden_) {
        return;
      }
      {
        let toggled = ` ${req.t} `, extSt = curStyles && ` ${curStyles} `, exists = extSt.includes(toggled),
        newExist = req.e != null ? req.e : exists;
        styles = newExist ? exists ? curStyles : curStyles + toggled : extSt.replace(toggled, " ");
        styles = styles.trim().replace(BgUtils_.spacesRe_, " ");
        if (req.b === false) { payload.s = styles; return; }
        if (req.o) {
          Settings_.temp_.omniStyleOverridden_ = newExist !==
              (` ${Settings_.cache_.vomnibarOptions.styles} `.includes(toggled));
        }
      }
      if (styles === curStyles) { return; }
      payload.s = styles;
      const request2: Req.bg<kBgReq.omni_updateOptions> = { N: kBgReq.omni_updateOptions, d: { s: styles } };
      for (const frame of framesForOmni) {
        frame !== port && frame.postMessage(request2);
      }
    },
    /** kFgReq.findFromVisual */ function (this: void, _: FgReq[kFgReq.findFromVisual], port: Port): void {
      cOptions = BgUtils_.safer_({ active: true, returnToViewport: true });
      cPort = port;
      cRepeat = 1;
      BackgroundCommands[kBgCmd.performFind]();
    },
    /** kFgReq.framesGoBack: */ function (this: void, req: FgReq[kFgReq.framesGoBack], port: Port | null
        , curTab?: Pick<Tab, "id" | "url" | "pendingUrl" | "index">): void {
      const tabID = Build.BTypes & BrowserType.Chrome && curTab ? curTab.id : port!.s.t,
      count = req.s, reuse = parseReuse(req.r || ReuseType.current);
      let needToExecCode: boolean = Build.BTypes & BrowserType.Chrome ? false : true;
      if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.Min$Tabs$$goBack)
          && (!(Build.BTypes & BrowserType.Chrome)
              || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
              || CurCVer_ < BrowserVer.Min$Tabs$$goBack)) {
        // on old Chrome || on other browsers
        const url = Build.BTypes & BrowserType.Chrome && curTab ? getTabUrl(curTab)
          : (port!.s.i ? indexFrame(tabID, 0)! : port!).s.u;
        if (!url.startsWith(BrowserProtocol_)
            || !!(Build.BTypes & BrowserType.Firefox)
                && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
                && url.startsWith(location.origin)) {
          /* empty */
        } else {
          cPort = port! /* Port | null -> Port */;
          Backend_.showHUD_(trans_("noTabHistory"));
          return;
        }
        if (Build.BTypes & BrowserType.Chrome) {
          needToExecCode = true;
        }
      }
      if (!(Build.BTypes & BrowserType.Chrome) || reuse) {
        const position = req.p
        chrome.tabs.duplicate(tabID, function (tab): void {
          if (!tab) { return onRuntimeError(); }
          if (reuse === ReuseType.newBg) {
            selectTab(tabID);
          }
          if (!(Build.BTypes & BrowserType.Chrome)
              || (Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.Min$Tabs$$goBack)
                  && needToExecCode) {
            execGoBack(tab, count);
          } else {
            requestHandlers[kFgReq.framesGoBack]({ s: count, r: ReuseType.current }, null, tab);
          }
          const newTabIdx = tab.index--
          const wantedIdx = position === "end" ? 3e4 : newTabIndex(tab, position)
          if (wantedIdx != null && wantedIdx !== newTabIdx) {
            chrome.tabs.move(tab.id, { index: wantedIdx }, onRuntimeError)
          }
        });
        return;
      } else {
        // Chrome + reuse=0: must be from a shortcut or Chrome is new enough
      }
      const jump = count > 0 ? chrome.tabs.goForward : chrome.tabs.goBack;
      if (!jump) {
        execGoBack(curTab!, count);
        return;
      }
      for (let i = 0, end = count > 0 ? count : -count; i < end; i++) {
        jump(tabID, onRuntimeError);
      }
      function execGoBack(tab: Pick<Tab, "id">, goStep: number): void {
        chrome.tabs.executeScript(tab.id, {
          code: `history.go(${goStep})`,
          runAt: "document_start"
        }, onRuntimeError);
      }
    },
    /** kFgReq.i18n: */ function (this: void): FgRes[kFgReq.i18n] {
      Settings_.temp_.loadI18nPayload_ && Settings_.temp_.loadI18nPayload_();
      return { m: Settings_.i18nPayload_ };
    },
    /** kFgReq.learnCSS */ function (this: void, _req: FgReq[kFgReq.learnCSS], port: Port): void {
      (port as Frames.Port).s.f |= Frames.Flags.hasCSS;
    }
  ],
  framesForOmni: Frames.WritableFrames = [];
  function OnMessage <K extends keyof FgReq, T extends keyof FgRes>(this: void, request: Req.fg<K> | Req.fgWithRes<T>
      , port: Frames.Port): void {
    type ReqK = keyof FgReq;
    type ResK = keyof FgRes;
    if (request.H !== kFgReq.msg) {
      return (requestHandlers as {
        [T2 in ReqK]: (req: Req.fg<T2>, port: Frames.Port) => void;
      } as {
        [T2 in ReqK]: <T3 extends ReqK>(req: Req.fg<T3>, port: Frames.Port) => void;
      })[request.H](request as Req.fg<K>, port);
    }
    port.postMessage<2>({
      N: kBgReq.msg,
      m: (request as Req.fgWithRes<T>).i,
      r: (requestHandlers as {
        [T2 in ResK]: (req: Req.fgWithRes<T2>["a"], port: Frames.Port) => FgRes[T2];
      } as {
        [T2 in ResK]: <T3 extends ResK>(req: Req.fgWithRes<T3>["a"], port: Frames.Port) => FgRes[T3];
      })[(request as Req.fgWithRes<T>).c]((request as Req.fgWithRes<T>).a, port)
    });
  }
  function OnConnect(this: void, port: Frames.Port, type: number): void {
    const sender = /*#__NOINLINE__*/ formatPortSender(port), { t: tabId, u: url } = sender
      , ref = framesForTab[tabId]
      , isOmni = url === Settings_.cache_.vomnibarPage_f;
    let status: Frames.ValidStatus = Frames.Status.enabled;
    if (type >= PortType.omnibar || isOmni) {
      if (type < PortType.knownStatusBase || isOmni) {
        if (/*#__NOINLINE__*/ onOmniConnect(port, tabId, type)) {
          return;
        }
        sender.f = Frames.Flags.userActed;
      } else if (type === PortType.CloseSelf) {
        if (Build.BTypes & ~BrowserType.Chrome && tabId >= 0 && !sender.i) {
          removeTempTab(tabId, (port as chrome.runtime.Port).sender.tab!.windowId, sender.u);
        }
        return;
      } else {
        status = ((type >>> PortType.BitOffsetOfKnownStatus) & PortType.MaskOfKnownStatus) - 1;
        sender.f = ((type & PortType.isLocked) ? Frames.Flags.lockedAndUserActed : Frames.Flags.userActed
          ) + ((type & PortType.hasCSS) && Frames.Flags.hasCSS);
      }
    }
    if (type >= PortType.knownStatusBase) {
      port.postMessage({
        N: kBgReq.settingsUpdate,
        d: Settings_.payload_
      });
    } else {
      let pass: null | string, flags: Frames.Flags = Frames.Flags.blank;
      if (ref && ((flags = sender.f = ref[0].s.f & Frames.Flags.InheritedFlags) & Frames.Flags.locked)) {
        status = ref[0].s.s;
        pass = status !== Frames.Status.disabled ? null : "";
      } else {
        pass = Backend_.getExcluded_(url, sender);
        status = pass === null ? Frames.Status.enabled : pass ? Frames.Status.partial : Frames.Status.disabled;
      }
      port.postMessage({
        N: kBgReq.init,
        s: flags,
        c: Settings_.payload_,
        p: pass,
        m: CommandsData_.mappedKeyRegistry_,
        k: CommandsData_.keyFSM_
      });
    }
    sender.s = status;
    if (Build.BTypes & ~BrowserType.Chrome) {
      (port as chrome.runtime.Port).sender.tab = null as never;
    }
    port.onDisconnect.addListener(OnDisconnect);
    port.onMessage.addListener(OnMessage);
    if (ref) {
      (ref as Frames.WritableFrames).push(port);
      if (type & PortType.hasFocus) {
        if (needIcon && ref[0].s.s !== status) {
          Backend_.setIcon_(tabId, status);
        }
        (ref as Frames.WritableFrames)[0] = port;
      }
    } else {
      framesForTab[tabId] = [port, port];
      status !== Frames.Status.enabled && needIcon && Backend_.setIcon_(tabId, status);
    }
    if (Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId) {
      (sender as Writable<Frames.Sender>).i = (type & PortType.isTop) ? 0 : ((Math.random() * 9999997) | 0) + 2;
    }
  }
  function OnDisconnect(this: void, port: Port): void {
    let { t: tabId } = port.s, i: number, ref = framesForTab[tabId] as Frames.WritableFrames | undefined;
    if (!ref) { return; }
    i = ref.lastIndexOf(port);
    if (!port.s.i) {
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
  function onOmniConnect(port: Frames.Port, tabId: number, type: PortType): boolean {
    if (type >= PortType.omnibar) {
      if (!isNotVomnibarPage(port, false)) {
        if (tabId < 0) {
          (port.s as Writable<Frames.Sender>).t = type !== PortType.omnibar ? _fakeTabId--
              : cPort ? cPort.s.t : TabRecency_.curTab_;
        }
        framesForOmni.push(port);
        if (Build.BTypes & ~BrowserType.Chrome) {
          (port as chrome.runtime.Port).sender.tab = null as never;
        }
        (port.onDisconnect as chrome.events.Event<(port: Port, exArg: FakeArg) => void>).addListener(OnOmniDisconnect);
        (port.onMessage as chrome.events.Event<(message: any, port: Port, exArg: FakeArg) => void>
            ).addListener(OnMessage);
        type === PortType.omnibar &&
        port.postMessage({
          N: kBgReq.omni_init,
          l: Settings_.omniPayload_,
          s: getSecret()
        });
        return true;
      }
    } else if (tabId < 0 // should not be true; just in case of misusing
      || (Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
          && Build.BTypes & BrowserType.Chrome
          && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg)
      || port.s.i === 0
      ) { /* empty */ }
    else {
      chrome.tabs.executeScript(tabId, {
        file: Settings_.CONST_.VomnibarScript_,
        frameId: port.s.i,
        runAt: "document_start"
      }, onRuntimeError);
      port.disconnect();
      return true;
    }
    return false;
  }
  function OnOmniDisconnect(this: void, port: Port): void {
    const ref = framesForOmni, i = ref.lastIndexOf(port);
    if (i === ref.length - 1) {
      --ref.length;
    } else if (i >= 0) {
      ref.splice(i, 1);
    }
  }
  function formatPortSender(port: Port): Frames.Sender {
    const sender = (port as chrome.runtime.Port).sender, tab = sender.tab || {
      id: _fakeTabId--,
      url: "",
      incognito: false
    }, url = Build.BTypes & BrowserType.Edge ? sender.url || tab.url || "" : sender.url!;
    if (!(Build.BTypes & ~BrowserType.Chrome)) {
      sender.tab = null as never;
    }
    return (port as Frames.Port).s = {
      i: Build.MinCVer >= BrowserVer.MinWithFrameId || !(Build.BTypes & BrowserType.Chrome)
          ? sender.frameId! : sender.frameId || 0,
      a: tab.incognito,
      s: Frames.Status.enabled,
      f: Frames.Flags.blank,
      t: tab.id,
      u: url
    };
  }

  function removeTempTab(tabId: number, wndId: number, url: string): void {
    let lock: Partial<typeof _lockToRemoveTempTab> = {},
    p = _removeTempTab(tabId, wndId, url, lock);
    lock.p = _lockToRemoveTempTab ? _lockToRemoveTempTab.p.finally(p) : p as LatestPromise;
    _lockToRemoveTempTab = lock as EnsureItemsNonNull<typeof lock>;
  }

  async function _removeTempTab(tabId: number, windowId: number, url: string, selfLock: object): Promise<void> {
    await ((browser as typeof chrome).tabs.remove(tabId) as never as Promise<void>).catch(BgUtils_.blank_);
    const sessions = await (browser as typeof chrome).sessions.getRecentlyClosed({ maxResults: 1 }),
    tab = sessions && sessions[0] && sessions[0].tab;
    if (tab && tab.url === url) {
      await (browser as typeof chrome).sessions.forgetClosedTab(windowId
          , tab.sessionId!).catch(BgUtils_.blank_);
    }
    if (_lockToRemoveTempTab === selfLock) {
      _lockToRemoveTempTab = null;
    }
  }

  Backend_ = {
    gotoSession_: requestHandlers[kFgReq.gotoSession],
    openUrl_: requestHandlers[kFgReq.openUrl],
    checkIfEnabled_: requestHandlers[kFgReq.checkIfEnabled],
    focus_: requestHandlers[kFgReq.focusOrLaunch],
    setOmniStyle_: requestHandlers[kFgReq.setOmniStyle],
    getExcluded_: BgUtils_.getNull_,
    getPortUrl_ (port?: Port | null, ignoreHash?: boolean): string | Promise<string> {
      const excl = Exclusions;
      port = port || indexFrame(TabRecency_.curTab_, 0);
      return port && excl && excl.rules_.length > 0 && (ignoreHash || excl._listeningHash) ? port.s.u
          : new Promise<string>((resolve): void => {
        let webNav = Build.BTypes & BrowserType.Chrome
            && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
            && CurCVer_ > BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId - 1
            && port && port.s.i ? chrome.webNavigation : null;
        port ? (webNav ? webNav.getFrame : tabsGet as never as typeof chrome.webNavigation.getFrame)(
            webNav ? {tabId: port.s.t, frameId: port.s.i}
              : port.s.t as Parameters<typeof chrome.tabs.get>[0] as never,
            (tab?: chrome.webNavigation.GetFrameResultDetails | chrome.tabs.Tab | null): void => {
          resolve(tab ? tab.url : "");
          return onRuntimeError();
        }) : getCurTab((tabs): void => {
          resolve(tabs && tabs.length ? getTabUrl(tabs[0]) : "");
          return onRuntimeError();
        });
      });
    },
    removeSug_ (this: void, { t: type, u: url }: FgReq[kFgReq.removeSug], port?: Port | null): void {
      const name = type === "tab" ? type : type + " item";
      cPort = findCPort(port)!;
      if (type === "tab" && TabRecency_.curTab_ === +url) {
        return Backend_.showHUD_(trans_("notRemoveCur"));
      }
      return Completion_.removeSug_(url, type, function (succeed): void {
        return Backend_.showHUD_(trans_(succeed ? "delSug" : "notDelSug", [trans_("sug_" + type) || name]));
      });
    },
    setIcon_ (): void { /* empty */ },
    complain_ (action: string): void {
      Backend_.showHUD_(trans_("notAllowA", [action]));
    },
    parse_ (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl]): FgRes[kFgReq.parseSearchUrl] {
      let s0 = request.u, url = s0.toLowerCase(), pattern: Search.Rule | undefined
        , arr: string[] | null = null, _i: number, selectLast = false;
      if (!BgUtils_.protocolRe_.test(BgUtils_.removeComposedScheme_(url))) {
        BgUtils_.resetRe_();
        return null;
      }
      if (request.p) {
        const obj = requestHandlers[kFgReq.parseUpperUrl](request),
        didSucceed = obj.p != null;
        return { k: "", s: 0, u: didSucceed ? obj.u : s0, e: didSucceed ? obj.p : obj.u };
      }
      const decoders = Settings_.cache_.searchEngineRules;
      if (_i = BgUtils_.IsURLHttp_(url)) {
        url = url.slice(_i);
        s0 = s0.slice(_i);
      }
      for (_i = decoders.length; 0 <= --_i; ) {
        pattern = decoders[_i];
        if (!url.startsWith(pattern.prefix_)) { continue; }
        arr = s0.slice(pattern.prefix_.length).match(pattern.matcher_ as RegExpG);
        if (arr) { break; }
      }
      if (!arr || !pattern) { BgUtils_.resetRe_(); return null; }
      if (arr.length > 1 && !pattern.matcher_.global) { arr.shift(); }
      const re = pattern.delimiter_;
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
      for (_i = 0; _i < arr.length; _i++) { url += " " + BgUtils_.DecodeURLPart_(arr[_i]); }
      url = url.trim().replace(BgUtils_.spacesRe_, " ");
      BgUtils_.resetRe_();
      return {
        k: pattern.name_,
        u: url,
        s: selectLast ? url.lastIndexOf(" ") + 1 : 0
      };
    },
    reopenTab_ (this: void, tab: Tab, refresh, exProps): void {
      const tabId = tab.id, needTempBlankTab = refresh === 1;
      if (Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions
          ? refresh && chrome.sessions : refresh) {
        let step = RefreshTabStep.start,
        tempTabId = -1,
        onRefresh = function (this: void): void {
          const err = onRuntimeError();
          if (err) {
            chrome.sessions.restore();
            tempTabId >= 0 && chrome.tabs.remove(tempTabId);
            tempTabId = 0;
            return err;
          }
          step = step + 1;
          if (step >= RefreshTabStep.end) { return; }
          setTimeout(function (): void {
            tabsGet(tabId, onRefresh);
          }, 50 * step * step);
        };
        if (needTempBlankTab) {
          chrome.tabs.create({url: "about:blank", active: false, windowId: tab.windowId}, (temp_tab): void => {
            tempTabId /* === -1 */ ? (tempTabId = temp_tab.id) : chrome.tabs.remove(temp_tab.id);
          });
        }
        chrome.tabs.remove(tabId, onRuntimeError);
        tabsGet(tabId, onRefresh);
        return;
      }
      let callback: ((this: void, tab: Tab) => void) | null | undefined
      if (!(Build.BTypes & ~BrowserType.Edge)
          || (Build.BTypes & BrowserType.Edge && OnOther === BrowserType.Edge)
          || Build.MinCVer < BrowserVer.MinMuted && Build.BTypes & BrowserType.Chrome
              && CurCVer_ < BrowserVer.MinMuted) {
      } else {
        callback = (tab2: Tab): void => { chrome.tabs.update(tab2.id, { muted: tab.muted }) }
      }
      const args: Parameters<BackendHandlersNS.BackendHandlers["reopenTab_"]>[2] = {
        windowId: tab.windowId,
        index: tab.index,
        url: getTabUrl(tab),
        active: tab.active,
        pinned: tab.pinned,
        openerTabId: tab.openerTabId
      }
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox) && exProps) {
        BgUtils_.extendIf_(args, exProps)
      }
      tabsCreate(args, callback);
      chrome.tabs.remove(tabId);
      // should never remove its session item - in case that goBack/goForward might be wanted
      // not seems to need to restore muted status
    },
    showHUD_ (text: string, isCopy?: kTip): void {
      if (isCopy) {
        if (text.startsWith(!(Build.BTypes & ~BrowserType.Firefox) ? "moz-" : "chrome-") && text.includes("://")) {
          text = text.slice(text.indexOf("/", text.indexOf("/") + 2) + 1) || text
        }
        text = (text.length > 41 ? text.slice(0, 41) + "\u2026" : text + ".")
      }
      if (cPort && !safePost(cPort, {
          N: kBgReq.showHUD,
          H: ensureInnerCSS(cPort),
          k: isCopy ? text ? kTip.copiedIs : isCopy : kTip.raw,
          t: text,
        })) {
        cPort = null as never;
      }
    },
    forceStatus_ (act: Frames.ForcedStatusText, tabId?: number): void {
      const ref = framesForTab[tabId || (tabId = TabRecency_.curTab_)];
      if (!ref) { return; }
      let spaceInd = act.indexOf(" "), newPassedKeys = spaceInd > 0 ? act.slice(spaceInd + 1) : "";
      act = act.toLowerCase() as Frames.ForcedStatusText;
      if (spaceInd > 0) {
        act = act.slice(0, spaceInd) as Frames.ForcedStatusText;
      }
      const silent = !!newPassedKeys && (<RegExpOne> /^silent/i).test(newPassedKeys);
      newPassedKeys = (silent ? newPassedKeys.slice(7) : newPassedKeys).trimLeft();
      if (newPassedKeys && !newPassedKeys.startsWith("^ ")) {
        console.log('"vimium://status" only accepts a list of hooked keys');
        newPassedKeys = "";
      } else {
        newPassedKeys = newPassedKeys && newPassedKeys.replace(<RegExpG> /<(\S+)>/g, "$1");
      }
      const always_enabled = Exclusions == null || Exclusions.rules_.length <= 0, oldStatus = ref[0].s.s,
      stat = act === "enable" ? Frames.Status.enabled : act === "disable" ? Frames.Status.disabled
        : act === "toggle" || act === "next"
        ? oldStatus !== Frames.Status.enabled ? Frames.Status.enabled : Frames.Status.disabled
        : null,
      locked = stat !== null, unknown = !(locked || always_enabled),
      msg: Req.bg<kBgReq.reset> = {
        N: kBgReq.reset,
        p: stat !== Frames.Status.disabled ? null : newPassedKeys,
        f: locked
      };
      cPort = indexFrame(tabId, 0) || ref[0];
      if (stat === null && tabId < 0) {
        silent || oldStatus !== Frames.Status.disabled && Backend_.showHUD_(trans_("unknownStatAction", [act]));
        return;
      }
      let pattern: string | null, newStatus: Frames.ValidStatus = locked ? stat! : Frames.Status.enabled;
      for (let i = ref.length; 1 <= --i; ) {
        const port = ref[i], sender = port.s;
        sender.f = locked ? sender.f | Frames.Flags.locked : sender.f & ~Frames.Flags.locked;
        if (unknown) {
          pattern = msg.p = Backend_.getExcluded_(sender.u, sender);
          newStatus = pattern === null ? Frames.Status.enabled : pattern
            ? Frames.Status.partial : Frames.Status.disabled;
          if (newStatus !== Frames.Status.partial && sender.s === newStatus) { continue; }
        }
        // must send "reset" messages even if port keeps enabled by 'v.st enable'
        // - frontend may need to reinstall listeners
        sender.s = newStatus;
        port.postMessage(msg);
      }
      silent || newStatus !== Frames.Status.disabled && Backend_.showHUD_(trans_("newStat", [
        trans_(newStatus === Frames.Status.enabled ? "fullEnabled" : "halfDisabled")
      ]));
      if (needIcon && (newStatus = ref[0].s.s) !== oldStatus) {
        Backend_.setIcon_(tabId, newStatus);
      }
    },
    ExecuteShortcut_ (this: void, cmd: string): void {
      const tabId = TabRecency_.curTab_, ports = framesForTab[tabId];
      if (cmd === <string> <unknown> kShortcutAliases.nextTab1) { cmd = kCName.nextTab; }
      type NullableShortcutMap = ShortcutInfoMap & { [key: string]: CommandsNS.Item | null | undefined };
      const map = CommandsData_.shortcutRegistry_ as NullableShortcutMap;
      if (!map || !map[cmd]) {
        // usually, only userCustomized* and those from 3rd-party extensions will enter this branch
        if (map && map[cmd] !== null) {
          map[cmd] = null;
          console.log("Shortcut %o has not been configured.", cmd);
        }
        return;
      }
      if (ports == null || (ports[0].s.f & Frames.Flags.userActed) || tabId < 0) {
        return executeShortcut(cmd as keyof typeof CommandsData_.shortcutRegistry_, ports);
      }
      tabsGet(tabId, function (tab): void {
        executeShortcut(cmd as keyof typeof CommandsData_.shortcutRegistry_,
          tab && tab.status === "complete" ? framesForTab[tab.id] : null);
        return onRuntimeError();
      });
    },
    indexPorts_: function (tabId?: number, frameId?: number): Frames.FramesMap | Frames.Frames | Port | null {
      return tabId == null ? framesForTab
        : frameId == null ? (tabId === GlobalConsts.VomnibarFakeTabId ? framesForOmni : framesForTab[tabId] || null)
        : indexFrame(tabId, frameId);
    } as BackendHandlersNS.BackendHandlers["indexPorts_"],
    onInit_(): void {
      if (Settings_.temp_.initing_ !== BackendHandlersNS.kInitStat.FINISHED) { return; }
      if (!CommandsData_.keyFSM_) {
        Settings_.postUpdate_("keyMappings");
        if (!Settings_.get_("vimSync") && !Settings_.temp_.hasEmptyLocalStorage_) {
          Commands = null as never
        }
      }
      if (Settings_.payload_.o === kOS.mac) {
        CommandsData_.visualKeys_["m-s-c"] = VisualAction.YankRichText
      }
      // the line below requires all necessary have inited when calling this
      Backend_.onInit_ = null;
      Settings_.get_("hideHud", true);
      Settings_.get_("nextPatterns", true);
      Settings_.get_("previousPatterns", true);
      chrome.runtime.onConnect.addListener(function (port): void {
        if (!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && OnOther & BrowserType.Edge) {
          let name = port.name, pos = name.indexOf(PortNameEnum.Delimiter), type = pos > 0 ? name.slice(0, pos) : name;
          port.sender.url = name.slice(type.length + 1);
          return OnConnect(port as Frames.Port, (type as string | number as number) | 0);
        }
        return OnConnect(port as Frames.Port, (port.name as string | number as number) | 0);
      });
      if (Build.BTypes & BrowserType.Edge && !chrome.runtime.onConnectExternal) {
        return;
      }
      (chrome.runtime.onConnectExternal as chrome.runtime.ExtensionConnectEvent).addListener(function (port): void {
        let { sender, name } = port, arr: string[];
        if (sender
            && isExtIdAllowed(sender.id, sender.url)
            && name.startsWith(PortNameEnum.Prefix) && (arr = name.split(PortNameEnum.Delimiter)).length > 1) {
          if (arr[1] !== Settings_.CONST_.GitVer) {
            (port as Port).postMessage({ N: kBgReq.injectorRun, t: InjectorTask.reload });
            port.disconnect();
            return;
          }
          OnConnect(port as Frames.Port, (arr[0].slice(PortNameEnum.PrefixLen) as string | number as number) | 0);
          if (Build.BTypes & BrowserType.Firefox) {
            (port as Frames.Port).s.f |= Frames.Flags.OtherExtension;
          }
        } else {
          port.disconnect();
        }
      });
    }
  };

  Settings_.updateHooks_.newTabUrl_f = function (url) {
    const onlyNormal = BgUtils_.isRefusingIncognito_(url),
    mayForceIncognito = Build.MinCVer < BrowserVer.MinNoAbnormalIncognito && Build.BTypes & BrowserType.Chrome
        && Build.CreateFakeIncognito ? onlyNormal && CurCVer_ < BrowserVer.MinNoAbnormalIncognito : false;
    BackgroundCommands[kBgCmd.createTab] = Build.MinCVer < BrowserVer.MinNoAbnormalIncognito
        && Build.BTypes & BrowserType.Chrome && Build.CreateFakeIncognito
        && mayForceIncognito ? function (): void {
      getCurWnd(true, hackedCreateTab[0].bind(url));
    } : standardCreateTab.bind(null, onlyNormal);
    if (Build.MinCVer < BrowserVer.MinNoAbnormalIncognito && Build.BTypes & BrowserType.Chrome
        && Build.CreateFakeIncognito) {
      BgCmdInfo[kBgCmd.createTab] = mayForceIncognito ? UseTab.NoTab : UseTab.ActiveTab;
    }
  };

  Settings_.updateHooks_.showActionIcon = function (value) {
    needIcon = value && !!chrome.browserAction;
  };

  (!(Build.BTypes & BrowserType.Edge) || chrome.runtime.onMessageExternal) &&
  (chrome.runtime.onMessageExternal!.addListener(function (this: void
      , message: boolean | number | string | null | undefined | ExternalMsgs[keyof ExternalMsgs]["req"]
      , sender, sendResponse): void {
    if (!isExtIdAllowed(sender.id, sender.url)) {
      sendResponse(false);
      return;
    }
    if (typeof message === "string") {
      executeExternalCmd({command: message}, sender);
      return;
    }
    else if (typeof message !== "object" || !message) {
      return;
    }
    switch (message.handler) {
    case kFgReq.shortcut:
      let shortcut = message.shortcut;
      if (shortcut) {
        Backend_.ExecuteShortcut_(shortcut + "");
      }
      break;
    case kFgReq.id:
      (sendResponse as (res: ExternalMsgs[kFgReq.id]["res"]) => void | 1)({
        name: "Vimium C",
        host: location.host,
        shortcuts: true,
        injector: Settings_.CONST_.Injector_,
        version: Settings_.CONST_.VerCode_
      });
      break;
    case kFgReq.inject:
      (sendResponse as (res: ExternalMsgs[kFgReq.inject]["res"]) => void | 1)({
        s: message.scripts ? Settings_.CONST_.ContentScripts_ : null,
        version: Settings_.CONST_.VerCode_,
        host: !(Build.BTypes & ~BrowserType.Chrome) ? "" : location.host,
        h: PortNameEnum.Delimiter + Settings_.CONST_.GitVer
      });
      break;
    case kFgReq.command:
      executeExternalCmd(message, sender);
      break;
    }
  }), Settings_.postUpdate_("extAllowList"));

  chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
    const ref = framesForTab, frames = ref[removedTabId];
    if (!frames) { return; }
    delete ref[removedTabId];
    ref[addedTabId] = frames;
    for (let i = frames.length; 0 < --i; ) {
      (frames[i].s as Writable<Frames.Sender>).t = addedTabId;
    }
  });

  Settings_.postUpdate_("vomnibarPage", null);
  Settings_.postUpdate_("searchUrl", null); // will also update newTabUrl
  Settings_.postUpdate_("vomnibarOptions");

  // will run only on <kbd>F5</kbd>, not on runtime.reload
  window.onunload = function (event): void {
    if (event
        && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    let ref = framesForTab as Frames.FramesMapToDestroy;
    ref.o = framesForOmni;
    for (const tabId in ref) {
      const arr = ref[tabId];
      for (let i = arr.length; 0 < --i; ) {
        arr[i].disconnect();
      }
    }
    if (framesForOmni.length > 0) {
      framesForOmni[0].disconnect();
    }
  };
})();
