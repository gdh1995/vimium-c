type CSTypes = chrome.contentSettings.ValidTypes;
type Tab = chrome.tabs.Tab;

const ContentSettings_ = Build.PContentSettings ? {
  makeKey_ (this: void, contentType: CSTypes, url?: string): string {
    return "vimiumContent|" + contentType + (url ? "|" + url : "");
  },
  complain_ (this: void, contentType: CSTypes, url: string): boolean {
    const css = chrome.contentSettings;
    if (!css) {
      Backend_.showHUD_("This version of Vimium C has no permissions to set CSs");
      return true;
    }
    if (!css[contentType] || (<RegExpOne> /^[A-Z]/).test(contentType) || !css[contentType].get) {
      Backend_.showHUD_(trans_("unknownCS", [contentType]));
      return true;
    }
    if ((!(Build.BTypes & BrowserType.Chrome) || !url.startsWith("read:"))
        && BgUtils_.protocolRe_.test(url) && !url.startsWith(BrowserProtocol_)) {
      return false;
    }
    Backend_.complain_(trans_("changeItsCS"));
    return true;
  },
  parsePattern_ (this: void, pattern: string, level: number): string[] {
    if (pattern.startsWith("file:")) {
      const a = Build.MinCVer >= BrowserVer.MinFailToToggleImageOnFileURL
          || CurCVer_ >= BrowserVer.MinFailToToggleImageOnFileURL ? 1 : level > 1 ? 2 : 0;
      if (a) {
        Backend_.complain_(a === 1 ? trans_("setFileCS", [BrowserVer.MinFailToToggleImageOnFileURL])
          : trans_("setFolderCS"));
        return [];
      }
      return [pattern.split(<RegExpOne> /[?#]/, 1)[0]];
    }
    if (pattern.startsWith("ftp:")) {
      Backend_.complain_(trans_("setFTPCS"));
      return [];
    }
    let info: string[] = pattern.match(<RegExpOne> /^([^:]+:\/\/)([^\/]+)/)!
      , hosts = BgUtils_.hostRe_.exec(info[2])!
      , result: string[], host = hosts[3] + (hosts[4] || "");
    pattern = info[1];
    result = [pattern + host + "/*"];
    if (level < 2 || BgUtils_.isIPHost_(hosts[3], 0)) { return result; }
    hosts = null as never;
    const [arr, partsNum] = BgUtils_.splitByPublicSuffix_(host),
    end = Math.min(arr.length - partsNum, level - 1);
    for (let j = 0; j < end; j++) {
      host = host.slice(arr[j].length + 1);
      result.push(pattern + host + "/*");
    }
    result.push(pattern + "*." + host + "/*");
    if (end === arr.length - partsNum && pattern === "http://") {
      result.push("https://*." + host + "/*");
    }
    return result;
  },
  hasOtherOrigins_ (ports: Frames.Frames): boolean {
    let last: string | undefined, i = ports.length, cur: string;
    do {
      cur = new URL(ports[--i].s.u).host;
      last || (last = cur);
    } while (1 < i && cur === last);
    return cur !== last;
  },
  Clear_ (this: void, contentType: CSTypes, incognito?: Frames.Sender["a"]): void {
    const css = chrome.contentSettings, cs = css && css[contentType],
    kIncognito = "incognito_session_only", kRegular = "regular";
    if (!cs || !cs.clear) { return; }
    if (incognito != null) {
      cs.clear({ scope: (incognito ? kIncognito : kRegular) });
      return;
    }
    cs.clear({ scope: kRegular });
    cs.clear({ scope: kIncognito }, BgUtils_.runtimeError_);
    localStorage.removeItem(ContentSettings_.makeKey_(contentType));
  },
  clearCS_ (options: KnownOptions<kBgCmd.clearCS>, port: Port | null): void {
    const ty = ("" + options.type!) as NonNullable<typeof options.type>
    if (!ContentSettings_.complain_(ty, "http://a.cc/")) {
      ContentSettings_.Clear_(ty, port ? port.s.a : TabRecency_.incognito_ === IncognitoType.true);
      return Backend_.showHUD_(trans_("csCleared", [trans_(ty) || ty]));
    }
  },
  toggleCS_ (count: number, options: KnownOptions<kBgCmd.toggleCS>, tabs: [Tab]): void {
    const ty = ("" + options.type!) as NonNullable<typeof options.type>, tab = tabs[0];
    return options.incognito ? ContentSettings_.ensureIncognito_(count, ty, tab)
      : ContentSettings_.toggleCurrent_(count, ty, tab, options.action === "reopen");
  },
  toggleCurrent_ (this: void, count: number, contentType: CSTypes, tab: Tab, reopen: boolean): void {
    const pattern = BgUtils_.removeComposedScheme_(tab.url);
    if (ContentSettings_.complain_(contentType, pattern)) { return; }
    chrome.contentSettings[contentType].get({
      primaryUrl: pattern,
      incognito: tab.incognito
    }, function (opt): void {
      ContentSettings_.setAllLevels_(contentType, pattern, count, {
        scope: tab.incognito ? "incognito_session_only" : "regular",
        setting: (opt && opt.setting === "allow") ? "block" : "allow"
      }, function (err): void {
        if (err) { return; }
        if (!tab.incognito) {
          const key = ContentSettings_.makeKey_(contentType);
          localStorage.getItem(key) !== "1" && localStorage.setItem(key, "1");
        }
        let arr: Frames.Frames | null,
        couldNotRefresh = !!(Build.BTypes & BrowserType.Edge
                || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
                || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions) && !chrome.sessions
            || !!(Build.BTypes & BrowserType.Chrome)
                // work around a bug of Chrome
                && (Build.MinCVer >= BrowserVer.MinIframeInRestoredSessionTabHasPreviousTopFrameContentSettings
                    || CurCVer_ >= BrowserVer.MinIframeInRestoredSessionTabHasPreviousTopFrameContentSettings)
                && (arr = Backend_.indexPorts_(tab.id)) && arr.length > 2 && ContentSettings_.hasOtherOrigins_(arr)
            ;
        if (tab.incognito || reopen) {
          ++tab.index;
          return Backend_.reopenTab_(tab);
        } else if (tab.index > 0) {
          return Backend_.reopenTab_(tab, couldNotRefresh ? 0 : 2);
        }
        chrome.windows.getCurrent({populate: true}, function (wnd) {
          !wnd || wnd.type !== "normal" ? chrome.tabs.reload(BgUtils_.runtimeError_)
            : Backend_.reopenTab_(tab, couldNotRefresh ? 0 : wnd.tabs.length > 1 ? 2 : 1);
          return BgUtils_.runtimeError_();
        });
      });
    });
  },
  ensureIncognito_ (this: void, count: number, contentType: CSTypes, tab: Tab): void {
    if (Settings_.CONST_.DisallowIncognito_) {
      return Backend_.complain_("setIncogCS");
    }
    const pattern = BgUtils_.removeComposedScheme_(tab.url);
    if (ContentSettings_.complain_(contentType, pattern)) { return; }
    chrome.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function (opt): void {
      if (BgUtils_.runtimeError_()) {
        chrome.contentSettings[contentType].get({primaryUrl: pattern}, function (opt2) {
          if (opt2 && opt2.setting === "allow") { return; }
          const wndOpt: chrome.windows.CreateData = {
            type: "normal", incognito: true, focused: false, url: "about:blank"
          };
          if (Build.BTypes & BrowserType.Firefox
              && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
            delete wndOpt.focused;
          }
          chrome.windows.create(wndOpt, function (wnd: chrome.windows.Window): void {
            const leftTabId = wnd.tabs![0].id;
            return ContentSettings_.setAndUpdate_(count, contentType, tab, pattern, wnd.id, true, function (): void {
              chrome.tabs.remove(leftTabId);
            });
          });
        });
        return BgUtils_.runtimeError_();
      }
      if (opt && opt.setting === "allow" && tab.incognito) {
        return ContentSettings_.updateTab_(tab);
      }
      chrome.windows.getAll(function (wnds): void {
        wnds = wnds.filter(wnd => wnd.incognito && wnd.type === "normal");
        if (!wnds.length) {
          console.log("%cContentSettings.ensure", "color:red"
            , "get incognito content settings", opt, " but can not find an incognito window.");
          return;
        } else if (opt && opt.setting === "allow") {
          return ContentSettings_.updateTab_(tab, wnds[wnds.length - 1].id);
        }
        const wndId = tab.windowId, isIncNor = tab.incognito && wnds.some(wnd => wnd.id === wndId);
        return ContentSettings_.setAndUpdate_(count, contentType, tab, pattern
          , isIncNor ? undefined : wnds[wnds.length - 1].id);
      });
    });
  },
  // `callback` must be executed
  setAndUpdate_: function (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string
      , wndId?: number, syncState?: boolean, callback?: (this: void) => void): void {
    const cb = ContentSettings_.updateTabAndWindow_.bind(null, tab, wndId, callback);
    return ContentSettings_.setAllLevels_(contentType, pattern, count
      , { scope: "incognito_session_only", setting: "allow" }
      , syncState && wndId !== tab.windowId
      ? function (err): void {
        if (err) { return cb(err); }
        chrome.windows.get(tab.windowId, cb);
      } : cb);
  } as {
    (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string
      // eslint-disable-next-line @typescript-eslint/unified-signatures
      , wndId: number, syncState: boolean, callback?: (this: void) => void): void;
    (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string, wndId?: number): void;
  },
  setAllLevels_ (this: void, contentType: CSTypes, url: string, count: number
      , settings: Readonly<Pick<chrome.contentSettings.SetDetails, "scope" | "setting">>
      , callback: (this: void, has_err: boolean) => void): void {
    let left: number, has_err = false;
    const ref = chrome.contentSettings[contentType], func = function (): void {
      const err = BgUtils_.runtimeError_();
      err && console.log("[%o]", Date.now(), err);
      if (has_err) { return err; }
      --left; has_err = !!<boolean> <boolean | void> err;
      if (has_err || left === 0) {
        setTimeout(callback, 0, has_err);
      }
      return err;
    }, arr = ContentSettings_.parsePattern_(url, count | 0);
    left = arr.length;
    if (left <= 0) { return callback(true); }
    BgUtils_.safer_(settings);
    for (const pattern of arr) {
      const info = BgUtils_.extendIf_(BgUtils_.safeObj_() as any as chrome.contentSettings.SetDetails, settings);
      info.primaryPattern = pattern;
      ref.set(info, func);
    }
  },
  updateTabAndWindow_ (this: void, tab: Tab, wndId: number | undefined, callback: ((this: void) => void) | undefined
      , oldWnd: chrome.windows.Window | boolean): void {
    if (oldWnd !== true) { ContentSettings_.updateTab_(tab, wndId); }
    callback && callback();
    if (oldWnd === true) { return; }
    wndId && chrome.windows.update(wndId, {
      focused: true,
      state: oldWnd ? oldWnd.state : undefined
    });
  },
  updateTab_ (this: void, tab: Tab, newWindowId?: number): void {
    tab.active = true;
    if (typeof newWindowId !== "number" || tab.windowId === newWindowId) {
      ++tab.index;
    } else {
      (tab as chrome.tabs.CreateProperties).index = undefined;
      tab.windowId = newWindowId;
    }
    Backend_.reopenTab_(tab);
  }
} : {
  complain_ () {
    Backend_.showHUD_("This version of Vimium C has no permissions to set CSs");
  }
} as never,
Marks_ = { // NOTE: all public members should be static
  cache_: localStorage,
  cacheI_: null as Map<string, string> | null,
  set_ ({ l: local, n: markName, u: url, s: scroll }: MarksNS.NewMark, incognito: boolean, tabId?: number): void {
    if (local && scroll[0] === 0 && scroll[1] === 0) {
      if (scroll.length === 2) {
        const i = url.indexOf("#");
        i > 0 && i < url.length - 1 && scroll.push(url.slice(i));
      } else if ((scroll[2] || "").length < 2) { // '#' or (wrongly) ''
        scroll.pop();
      }
    }
    const key = Marks_.getLocationKey_(markName, local ? url : "")
    const val = JSON.stringify<MarksNS.StoredGlobalMark | MarksNS.ScrollInfo>(local ? scroll
        : { tabId: tabId!, url, scroll })
    incognito ? (Marks_.cacheI_ || (IncognitoWatcher_.watch_(), Marks_.cacheI_ = new Map())).set(key, val)
        : Marks_.cache_.setItem(key, val)
  },
  _goto (port: Port, options: CmdOptions[kFgCmd.goToMarks]) {
    port.postMessage<1, kFgCmd.goToMarks>({ N: kBgReq.execute, H: null, c: kFgCmd.goToMarks, n: 1, a: options});
  },
  createMark_ (this: void, request: MarksNS.NewTopMark | MarksNS.NewMark, port: Port): void {
    let tabId = port.s.t;
    if (request.s) {
      Marks_.set_(request, port.s.a, tabId)
      return
    }
    (port = Backend_.indexPorts_(tabId, 0) || port) && port.postMessage({
      N: kBgReq.createMark,
      n: request.n
    });
  },
  gotoMark_ (this: void, request: MarksNS.FgQuery, port: Port): void {
    const { l: local, n: markName } = request, key = Marks_.getLocationKey_(markName, local ? request.u : "");
    const str = port.s.a && Marks_.cacheI_ && Marks_.cacheI_.get(key) || Marks_.cache_.getItem(key)
    if (local) {
      let scroll: MarksNS.FgMark | null = str ? JSON.parse(str) as MarksNS.FgMark : null;
      if (!scroll) {
        let oldPos = (request as MarksNS.FgLocalQuery).o, x: number, y: number;
        if (oldPos && (x = +oldPos.x) >= 0 && (y = +oldPos.y) >= 0) {
          (request as MarksNS.NewMark).s = scroll = [x, y, oldPos.h];
        }
      }
      if (scroll) {
        return Marks_._goto(port, { n: markName, s: scroll, l: 2 });
      }
    }
    if (!str) {
      return Backend_.showHUD_(trans_("noMark", [trans_(local ? "Local_" : "Global_"), markName]));
    }
    const stored = JSON.parse(str) as MarksNS.StoredGlobalMark;
    const tabId = +stored.tabId, markInfo: MarksNS.MarkToGo = {
      u: stored.url, s: stored.scroll, t: stored.tabId,
      n: markName, p: true
    };
    markInfo.p = request.p !== false && markInfo.s[1] === 0 && markInfo.s[0] === 0 &&
        !!BgUtils_.IsURLHttp_(markInfo.u);
    if (tabId >= 0 && Backend_.indexPorts_(tabId)) {
      chrome.tabs.get(tabId, Marks_.checkTab_.bind(0, markInfo));
    } else {
      return Backend_.reqH_[kFgReq.focusOrLaunch](markInfo);
    }
  },
  checkTab_ (this: 0, mark: MarksNS.MarkToGo, tab: chrome.tabs.Tab): void {
    const url = (Build.BTypes & BrowserType.Chrome ? tab.url || tab.pendingUrl : tab.url).split("#", 1)[0]
    if (url === mark.u || mark.p && mark.u.startsWith(url)) {
      Backend_.reqH_[kFgReq.gotoSession]({ s: tab.id });
      return Marks_.scrollTab_(mark, tab);
    } else {
      return Backend_.reqH_[kFgReq.focusOrLaunch](mark);
    }
  },
  getLocationKey_ (markName: string, url: string | undefined): string {
    return url ? "vimiumMark|" + BgUtils_.prepareReParsingPrefix_(url.split("#", 1)[0])
        + (url.length > 1 ? "|" + markName : "") : "vimiumGlobalMark|" + markName
  },
  scrollTab_ (this: void, markInfo: MarksNS.InfoToGo, tab: chrome.tabs.Tab): void {
    const tabId = tab.id, port = Backend_.indexPorts_(tabId, 0);
    port && Marks_._goto(port, { n: markInfo.n, s: markInfo.s, l: 0 });
    if (markInfo.t !== tabId && markInfo.n) {
      return Marks_.set_(markInfo as MarksNS.MarkToGo, TabRecency_.incognito_ === IncognitoType.true, tabId);
    }
  },
  clear_ (this: void, url?: string): void {
    const key_start = Marks_.getLocationKey_("", url);
    let toRemove: string[] = [], storage = Marks_.cache_;
    for (let i = 0, end = storage.length; i < end; i++) {
      const key = storage.key(i)!;
      if (key.startsWith(key_start)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) { storage.removeItem(key); }
    let num = toRemove.length;
    const storage2 = Marks_.cacheI_
    storage2 && storage2.forEach((_v, key): void => {
      if (key.startsWith(key_start)) {
        num++
        storage2.delete(key)
      }
    })
    return Backend_.showHUD_(trans_("markRemoved", [
      num, trans_(url ? url === "#" ? "allLocal" : kTip.local + "" : kTip.global + ""),
      trans_(num !== 1 ? "have" : "has")
    ]));
  }
},
FindModeHistory_ = {
  key_: "findModeRawQueryList" as const,
  list_: null as string[] | null,
  listI_: null as string[] | null,
  timer_: 0,
  init_ (): void {
    const str: string = Settings_.get_(FindModeHistory_.key_);
    FindModeHistory_.list_ = str ? str.split("\n") : [];
    FindModeHistory_.init_ = null as never;
  },
  query_: function (incognito: boolean, query?: string, nth?: number): string | void {
    const a = FindModeHistory_;
    a.init_ && a.init_();
    const list = incognito ? a.listI_ || (IncognitoWatcher_.watch_(), a.listI_ = a.list_!.slice(0)) : a.list_!;
    if (!query) {
      return list[list.length - (nth || 1)] || "";
    }
    query = query.replace(/\n/g as RegExpG, " ");
    if (incognito) {
      return a.refreshIn_(query, list, true);
    }
    query = BgUtils_.unicodeSubstring_(query, 0, 99);
    const str = a.refreshIn_(query, list);
    str && Settings_.set_(a.key_, str);
    if (a.listI_) { return a.refreshIn_(query, a.listI_, true); }
  } as {
    (incognito: boolean, query?: undefined | "", nth?: number): string;
    (incognito: boolean, query: string, nth?: undefined): void;
    (incognito: boolean, query: string | undefined, nth: number | undefined): void | string;
  },
  refreshIn_: function (query: string, list: string[], skipResult?: boolean): string | void {
    const ind = list.lastIndexOf(query);
    if (ind >= 0) {
      if (ind === list.length - 1) { return; }
      list.splice(ind, 1);
    }
    else if (list.length >= GlobalConsts.MaxFindHistory) { list.shift(); }
    list.push(query);
    if (!skipResult) {
      return list.join("\n");
    }
  } as {
    (query: string, list: string[], skipResult?: false): string | void;
    (query: string, list: string[], skipResult: true): void;
  },
  removeAll_ (incognito: boolean): void {
    if (incognito) {
      FindModeHistory_.listI_ && (FindModeHistory_.listI_ = []);
      return;
    }
    FindModeHistory_.init_ = null as never;
    FindModeHistory_.list_ = [];
    Settings_.set_(FindModeHistory_.key_, "");
  }
},
IncognitoWatcher_ = {
  watching_: false,
  timer_: 0,
  watch_ (): void {
    if (IncognitoWatcher_.watching_) { return; }
    chrome.windows.onRemoved.addListener(IncognitoWatcher_.OnWndRemoved_);
    IncognitoWatcher_.watching_ = true;
  },
  OnWndRemoved_ (this: void): void {
    if (!IncognitoWatcher_.watching_) { return; }
    IncognitoWatcher_.timer_ = IncognitoWatcher_.timer_ || setTimeout(IncognitoWatcher_.TestIncognitoWnd_, 34);
  },
  TestIncognitoWnd_ (this: void): void {
    IncognitoWatcher_.timer_ = 0;
    if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
        || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito) {
      let left = false, arr = Backend_.indexPorts_();
      for (const i in arr) {
        if (arr[+i]![0].s.a) { left = true; break; }
      }
      if (left) { return; }
    }
    chrome.windows.getAll(function (wnds): void {
      wnds.some(wnd => wnd.incognito) || IncognitoWatcher_.cleanI_();
    });
  },
  cleanI_ (): void {
    FindModeHistory_.listI_ = null;
    Marks_.cacheI_ = null;
    chrome.windows.onRemoved.removeListener(IncognitoWatcher_.OnWndRemoved_);
    IncognitoWatcher_.watching_ = false;
  }
},
MediaWatcher_ = {
  watchers_: [
    !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinMediaQuery$PrefersReducedMotion)
      && !(Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersReducedMotion)
    ? MediaNS.Watcher.NotWatching
    : Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    ? CurCVer_ >= BrowserVer.MinMediaQuery$PrefersReducedMotion ? MediaNS.Watcher.NotWatching
      : MediaNS.Watcher.InvalidMedia
    : Build.DetectAPIOnFirefox ? MediaNS.Watcher.WaitToTest : MediaNS.Watcher.NotWatching,
    !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinMediaQuery$PrefersColorScheme)
      && !(Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme)
    ? MediaNS.Watcher.NotWatching
    : Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    ? CurCVer_ >= BrowserVer.MinMediaQuery$PrefersColorScheme ? MediaNS.Watcher.NotWatching
      : MediaNS.Watcher.InvalidMedia
    : MediaNS.Watcher.WaitToTest
  ] as { [k in MediaNS.kName]: MediaNS.Watcher | MediaQueryList } & Array<MediaNS.Watcher | MediaQueryList>,
  _timer: 0,
  get_ (key: MediaNS.kName): boolean | null {
    let watcher = MediaWatcher_.watchers_[key];
    return typeof watcher === "object" ? watcher.matches : null;
  },
  listen_ (key: MediaNS.kName, doListen: boolean): void {
    let a = MediaWatcher_, watchers = a.watchers_, cur = watchers[key],
    name = !key ? "prefers-reduced-motion" as const : "prefers-color-scheme" as const;
    if (cur === MediaNS.Watcher.WaitToTest && doListen) {
      watchers[key] = cur = matchMedia(`(${name})`).matches ? MediaNS.Watcher.NotWatching
          : MediaNS.Watcher.InvalidMedia;
    }
    if (doListen && cur === MediaNS.Watcher.NotWatching) {
      const query = matchMedia(`(${name}: ${!key ? "reduce" : "dark"})`);
      query.onchange = a._onChange;
      watchers[key] = query;
      if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          && (!(Build.BTypes & BrowserType.Firefox)
              || Build.MinFFVer >= FirefoxBrowserVer.MinMediaChangeEventsOnBackgroundPage)
          && (!(Build.BTypes & BrowserType.Chrome)
              || Build.MinCVer >= BrowserVer.MinMediaChangeEventsOnBackgroundPage)) { /* empty */ }
      else if (!a._timer) {
        if (!(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
            ? CurFFVer_ < FirefoxBrowserVer.MinMediaChangeEventsOnBackgroundPage
            : !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome
            ? CurCVer_ < BrowserVer.MinMediaChangeEventsOnBackgroundPage
            : true) {
          a._timer = setInterval(MediaWatcher_.RefreshAll_, GlobalConsts.MediaWatchInterval);
        }
      }
      a.update_(key, 0);
    } else if (!doListen && typeof cur === "object") {
      cur.onchange = null;
      watchers[key] = MediaNS.Watcher.NotWatching;
      if (a._timer > 0) {
        if (!watchers.some(i => typeof i === "object")) {
          clearInterval(a._timer);
          a._timer = 0;
        }
      }
      a.update_(key, 0);
    }
  },
  update_ (this: void, key: MediaNS.kName, embed?: 1 | 0): void {
    type ObjWatcher = Exclude<typeof watcher, number>;
    let watcher = MediaWatcher_.watchers_[key], isObj = typeof watcher === "object";
    if ((!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox)
        && embed == null && isObj) {
      let watcher2 = matchMedia((watcher as ObjWatcher).media);
      watcher2.onchange = (watcher as ObjWatcher).onchange;
      (watcher as ObjWatcher).onchange = null;
      MediaWatcher_.watchers_[key] = watcher = watcher2;
    }
    const settings = Settings_, payload = settings.payload_,
    omniToggled = key ? "dark" : "less-motion",
    bMatched: boolean = isObj ? (watcher as ObjWatcher).matches : false;
    const payloadKey = key ? "d" : "m", newPayloadVal = settings.updatePayload_(payloadKey, bMatched)
    if (payload[payloadKey] !== newPayloadVal) {
      (payload as Generalized<Pick<typeof payload, typeof payloadKey>>)[payloadKey] = newPayloadVal;
      embed || settings.broadcast_({ N: kBgReq.settingsUpdate, d: [payloadKey] });
    }
    Backend_.reqH_[kFgReq.setOmniStyle]({
      t: omniToggled,
      e: bMatched || ` ${settings.cache_.vomnibarOptions.styles} `.includes(` ${omniToggled} `),
      b: !embed
    });
  },
  RefreshAll_ (this: void): void {
    for (let arr = MediaWatcher_.watchers_, i = arr.length; 0 <= --i; ) {
      let watcher = arr[i];
      if (typeof watcher === "object") {
        MediaWatcher_.update_(i);
      }
    }
  },
  _onChange (this: MediaQueryList): void {
    if (MediaWatcher_._timer > 0) {
      clearInterval(MediaWatcher_._timer);
    }
    MediaWatcher_._timer = -1;
    let index = MediaWatcher_.watchers_.indexOf(this);
    if (index >= 0) {
      MediaWatcher_.update_(index);
    }
    if (!Build.NDEBUG) {
      console.log("Media watcher:", this.media, "has changed to",
          matchMedia(this.media).matches, "/", index < 0 ? index : MediaWatcher_.get_(index));
    }
  }
},
TabRecency_ = {
  tabs_: new Map<number, { /* index */ i: number; /* mono clock */ t: number }>(),
  curTab_: (chrome.tabs.TAB_ID_NONE || GlobalConsts.TabIdNone) as number,
  curWnd_: (!(Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox) || chrome.windows)
      && chrome.windows.WINDOW_ID_NONE || GlobalConsts.WndIdNone,
  lastWnd_: GlobalConsts.WndIdNone as number,
  incognito_: Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
      ? IncognitoType.ensuredFalse : IncognitoType.mayFalse,
  rCompare_: null as never as (a: {id: number}, b: {id: number}) => number
};

BgUtils_.timeout_(120, function (): void {
  const cache = TabRecency_.tabs_, noneWnd = TabRecency_.curWnd_;
  let stamp = 1, time = 0;
  function clean(): void {
    cache.forEach((val, i) => {
      if (val.i < GlobalConsts.MaxTabRecency - GlobalConsts.MaxTabsKeepingRecency + 1) { cache.delete(i) }
      else { val.i -= GlobalConsts.MaxTabRecency - GlobalConsts.MaxTabsKeepingRecency }
    })
    stamp = GlobalConsts.MaxTabsKeepingRecency + 1;
  }
  function listener(info: { tabId: number }): void {
    const now = performance.now();
    if (now - time > GlobalConsts.MinStayTimeToRecordTabRecency) {
      cache.set(TabRecency_.curTab_, {
        i: ++stamp,
        t: Build.BTypes & BrowserType.ChromeOrFirefox && Settings_.payload_.o === kOS.unixLike ? Date.now() : now
      })
      if (stamp >= GlobalConsts.MaxTabRecency) { clean(); }
    }
    TabRecency_.curTab_ = info.tabId; time = now;
  }
  function onFocusChanged(tabs: [chrome.tabs.Tab] | never[]): void {
    if (!tabs || !tabs[0]) { return BgUtils_.runtimeError_() }
    let a = tabs[0], current = a.windowId, last = TabRecency_.curWnd_
    if (current !== last) {
      TabRecency_.curWnd_ = current
      TabRecency_.lastWnd_ = last
    }
    {
      TabRecency_.incognito_ = a.incognito ? IncognitoType.true
        : Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
        ? IncognitoType.ensuredFalse : IncognitoType.mayFalse;
      Completion_.onWndChange_();
      return listener({ tabId: a.id });
    }
  }
  chrome.tabs.onActivated.addListener(listener);
  (!(Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox) || chrome.windows) &&
  chrome.windows.onFocusChanged.addListener(function (windowId): void {
    if (windowId === noneWnd) { return; }
    // here windowId may pointer to a devTools window on C45 - see BrowserVer.Min$windows$APIsFilterOutDevToolsByDefault
    chrome.tabs.query({windowId, active: true}, onFocusChanged);
  });
  chrome.tabs.query({currentWindow: true, active: true}, function (tabs: [chrome.tabs.Tab]): void {
    time = performance.now();
    const a = tabs && tabs[0];
    if (!a) { return BgUtils_.runtimeError_(); }
    TabRecency_.curTab_ = a.id;
    TabRecency_.curWnd_ = a.windowId;
    TabRecency_.incognito_ = a.incognito ? IncognitoType.true
      : Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
      ? IncognitoType.ensuredFalse : IncognitoType.mayFalse;
  });
  TabRecency_.rCompare_ = (a, b): number => cache.get(b.id)!.i - cache.get(a.id)!.i

  const settings = Settings_;
  settings.updateHooks_.autoDarkMode = settings.updateHooks_.autoReduceMotion = (value: boolean
      , keyName: "autoReduceMotion" | "autoDarkMode"): void => {
    const key = keyName.length > 12 ? MediaNS.kName.PrefersReduceMotion
        : MediaNS.kName.PrefersColorScheme;
    MediaWatcher_.listen_(key, value);
  };
  settings.postUpdate_("autoDarkMode");
  settings.postUpdate_("autoReduceMotion");
  settings.updateOmniStyles_ = MediaWatcher_.update_;
  settings.updateMediaQueries_ = MediaWatcher_.RefreshAll_;

  if (!Build.PContentSettings) { return; }
  for (const i of ["images", "plugins", "javascript", "cookies"] as const) {
    localStorage.getItem(ContentSettings_.makeKey_(i)) != null &&
    setTimeout(ContentSettings_.Clear_, 100, i);
  }
});

Settings_.temp_.loadI18nPayload_ = function (): void {
  Settings_.temp_.loadI18nPayload_ = null;
  const arr: string[] = Settings_.i18nPayload_ = [],
  args = ["$1", "$2", "$3", "$4"];
  for (let i = 0; i < kTip.INJECTED_CONTENT_END; i++) {
    arr.push(trans_("" + i, args));
  }
};

Settings_.temp_.initing_ |= BackendHandlersNS.kInitStat.others;
Backend_.onInit_!();

chrome.extension.isAllowedIncognitoAccess(function (isAllowedAccess): void {
  Settings_.CONST_.DisallowIncognito_ = isAllowedAccess === false;
});
