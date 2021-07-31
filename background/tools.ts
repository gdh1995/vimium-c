import {
  curIncognito_, curTabId_, curWndId_, framesForTab_, incognitoFindHistoryList_, recencyForTab_, set_curIncognito_,
  set_curTabId_, set_curWndId_, set_incognitoFindHistoryList_, set_lastWndId_, set_recencyForTab_, incognitoMarkCache_,
  set_incognitoMarkCache_, contentPayload_, reqH_, settingsCache_, OnFirefox, OnChrome, CurCVer_,
  OnEdge, isHighContrast_ff_, omniPayload_, blank_, CONST_, RecencyMap
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, Windows_, browser_, tabsGet, getCurWnd, getTabUrl, runtimeError_, browserSessions_, getCurTab
} from "./browser"
import { hostRe_, removeComposedScheme_ } from "./normalize_urls"
import { prepareReParsingPrefix_ } from "./parse_urls"
import * as settings_ from "./settings"
import { complainLimits, showHUD } from "./ports"
import { setOmniStyle_ } from "./ui_css"
import { trans_ } from "./i18n"
import { parseFallbackOptions, runNextCmd, getRunNextCmdBy, kRunOn } from "./run_commands"
import { parseOpenPageUrlOptions, preferLastWnd } from "./open_urls"
import { reopenTab_ } from "./tab_commands"

type CSTypes = chrome.contentSettings.ValidTypes;

export const ContentSettings_ = OnChrome ? {
  makeKey_ (this: void, contentType: CSTypes, url?: string): string {
    return "vimiumContent|" + contentType + (url ? "|" + url : "");
  },
  complain_ (this: void, contentType: CSTypes, url: string): boolean {
    let bcs: typeof chrome.contentSettings | null = browser_.contentSettings
    try {
      bcs && bcs.images.get({ primaryUrl: "https://127.0.0.1/" }, runtimeError_)
    } catch { // Chrome 89 would throw an exception if .cs was disabled after being used
      bcs = null
    }
    if (!bcs) {
      showHUD("Has not permitted to set contentSettings")
      return true;
    }
    if (!bcs[contentType] || (<RegExpOne> /^[A-Z]/).test(contentType) || !bcs[contentType].get) {
      showHUD(trans_("unknownCS", [contentType]))
      return true;
    }
    if ((!OnChrome || !url.startsWith("read:"))
        && BgUtils_.protocolRe_.test(url) && !url.startsWith(CONST_.BrowserProtocol_)) {
      return false;
    }
    complainLimits(trans_("changeItsCS"))
    return true;
  },
  parsePattern_ (this: void, pattern: string, level: number): string[] {
    if (pattern.startsWith("file:")) {
      const a = Build.MinCVer >= BrowserVer.MinFailToToggleImageOnFileURL
          || CurCVer_ >= BrowserVer.MinFailToToggleImageOnFileURL ? 1 : level > 1 ? 2 : 0;
      if (a) {
        complainLimits(a === 1 ? trans_("setFileCS", [BrowserVer.MinFailToToggleImageOnFileURL])
          : trans_("setFolderCS"));
        return [];
      }
      return [pattern.split(<RegExpOne> /[?#]/, 1)[0]];
    }
    if (pattern.startsWith("ftp:")) {
      complainLimits(trans_("setFTPCS"))
      return [];
    }
    let info: string[] = pattern.match(<RegExpOne> /^([^:]+:\/\/)([^\/]+)/)!
      , hosts = hostRe_.exec(info[2])!
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
  hasOtherOrigins_ (frames: Frames.Frames): boolean {
    let last: string | undefined
    for (const { s: { url_: url } } of frames.ports_) {
      let cur = new URL(url).host
      if (last && last !== cur) { return true }
      last = cur
    }
    return false
  },
  Clear_ (this: void, contentType: CSTypes, incognito?: Frames.Sender["incognito_"]): void {
    const bcs = browser_.contentSettings, cs = bcs[contentType],
    kIncognito = "incognito_session_only", kRegular = "regular";
    if (incognito != null) {
      cs.clear({ scope: (incognito ? kIncognito : kRegular) });
      return;
    }
    cs.clear({ scope: kRegular });
    cs.clear({ scope: kIncognito }, runtimeError_)
    localStorage.removeItem(ContentSettings_.makeKey_(contentType));
  },
  clearCS_ (options: KnownOptions<kBgCmd.clearCS>, port: Port | null): boolean {
    const ty = (options.type ? "" + options.type : "images") as NonNullable<typeof options.type>
    if (!ContentSettings_.complain_(ty, "http://a.cc/")) {
      ContentSettings_.Clear_(ty, port ? port.s.incognito_ : curIncognito_ === IncognitoType.true)
      showHUD(trans_("csCleared", [ty === "images" && trans_(ty) || ty[0].toUpperCase() + ty.slice(1)]))
      return true
    }
    return false
  },
  toggleCS_ (options: KnownOptions<kBgCmd.toggleCS>, count: number, tabs: [Tab], resolve: OnCmdResolved): void {
    const ty = (options.type ? "" + options.type : "images") as NonNullable<typeof options.type>, tab = tabs[0]
    options.incognito ? ContentSettings_.ensureIncognito_(count, ty, tab, resolve)
      : ContentSettings_.toggleCurrent_(ty, count, tab, options.action === "reopen", resolve)
  },
  toggleCurrent_ (this: void, contentType: CSTypes, count: number, tab: Tab, reopen: boolean
      , resolve: OnCmdResolved): void {
    const pattern = removeComposedScheme_(tab.url)
    if (ContentSettings_.complain_(contentType, pattern)) { resolve(0); return }
    browser_.contentSettings[contentType].get({
      primaryUrl: pattern,
      incognito: tab.incognito
    }, function (opt): void {
      ContentSettings_.setAllLevels_(contentType, pattern, count, {
        scope: tab.incognito ? "incognito_session_only" : "regular",
        setting: (opt && opt.setting === "allow") ? "block" : "allow"
      }, function (err): void {
        if (err) { resolve(0); return }
        if (!tab.incognito) {
          const key = ContentSettings_.makeKey_(contentType);
          localStorage.getItem(key) !== "1" && localStorage.setItem(key, "1");
        }
        let arr: Frames.Frames | undefined,
        couldNotRefresh = OnEdge || !browserSessions_()
            || OnChrome
                // work around a bug of Chrome
                && (Build.MinCVer >= BrowserVer.MinIframeInRestoredSessionTabHasPreviousTopFrameContentSettings
                    || CurCVer_ >= BrowserVer.MinIframeInRestoredSessionTabHasPreviousTopFrameContentSettings)
                && (arr = framesForTab_.get(tab.id)) && arr.ports_.length > 1
                && ContentSettings_.hasOtherOrigins_(arr)
            ;
        if (tab.incognito || reopen) {
          reopenTab_(tab)
        } else if (tab.index > 0) {
          reopenTab_(tab, couldNotRefresh ? 0 : 2)
        } else {
          getCurWnd(true, (wnd): void => {
            !wnd || wnd.type !== "normal" ? Tabs_.reload(getRunNextCmdBy(kRunOn.otherCb))
                : reopenTab_(tab, couldNotRefresh ? 0 : wnd.tabs.length > 1 ? 2 : 1)
            return runtimeError_()
          })
        }
      });
    });
  },
  ensureIncognito_ (this: void, count: number, contentType: CSTypes, tab: Tab, resolve: OnCmdResolved): void {
    if (CONST_.DisallowIncognito_) {
      complainLimits("setIncogCS")
      resolve(0)
      return
    }
    const pattern = removeComposedScheme_(tab.url)
    if (ContentSettings_.complain_(contentType, pattern)) { resolve(0); return }
    browser_.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function (opt): void {
      if (runtimeError_()) {
        browser_.contentSettings[contentType].get({primaryUrl: pattern}, function (opt2) {
          if (opt2 && opt2.setting === "allow") { resolve(1); return }
          const wndOpt: chrome.windows.CreateData = {
            type: "normal", incognito: true, focused: false, url: "about:blank"
          };
          if (OnFirefox) {
            delete wndOpt.focused;
          }
          Windows_.create(wndOpt, function (wnd: chrome.windows.Window): void {
            const leftTabId = wnd.tabs![0].id;
            return ContentSettings_.setAndUpdate_(count, contentType, tab, pattern, wnd.id, true, function (): void {
              Tabs_.remove(leftTabId)
            });
          });
        });
        return runtimeError_()
      }
      if (opt && opt.setting === "allow" && tab.incognito) {
        return ContentSettings_.updateTab_(tab);
      }
      Windows_.getAll((wnds): void => {
        wnds = wnds.filter(wnd => wnd.incognito && wnd.type === "normal");
        if (!wnds.length) {
          console.log("%cContentSettings.ensure", "color:red"
            , "get incognito content settings", opt, " but can not find an incognito window.");
          return;
        }
        const preferred = preferLastWnd(wnds)
        if (opt && opt.setting === "allow") {
          return ContentSettings_.updateTab_(tab, preferred.id)
        }
        const wndId = tab.windowId, isIncNor = tab.incognito && wnds.some(wnd => wnd.id === wndId);
        return ContentSettings_.setAndUpdate_(count, contentType, tab, pattern
          , isIncNor ? undefined : preferred.id)
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
        Windows_.get(tab.windowId, cb)
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
    const ref = browser_.contentSettings[contentType], func = (): void => {
      const err = runtimeError_()
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
    if (oldWnd === true) { runNextCmd<kBgCmd.reopenTab>(0); return }
    wndId && Windows_.update(wndId, {
      focused: true,
      state: oldWnd ? oldWnd.state : undefined
    });
  },
  updateTab_ (this: void, tab: Tab, newWindowId?: number): void {
    tab.active = true;
    if (typeof newWindowId === "number" && tab.windowId !== newWindowId) {
      (tab as chrome.tabs.CreateProperties).index = undefined;
      tab.windowId = newWindowId;
    }
    reopenTab_(tab)
  }
} : {
  complain_ () {
    showHUD("This version of Vimium C has no permissions to set CSs")
  }
} as never
export const Marks_ = { // NOTE: all public members should be static
  cache_: localStorage,
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
    incognito ? (incognitoMarkCache_ || (IncognitoWatcher_.watch_(), set_incognitoMarkCache_(new Map()))).set(key, val)
        : Marks_.cache_.setItem(key, val)
  },
  createMark_ (this: void, request: MarksNS.NewTopMark | MarksNS.NewMark, port: Port): void {
    let tabId = port.s.tabId_;
    if (request.s) {
      Marks_.set_(request, port.s.incognito_, tabId)
      return
    }
    (port = framesForTab_.get(tabId)?.top_ || port) && port.postMessage({
      N: kBgReq.createMark,
      n: request.n
    });
  },
  gotoMark_ (this: void, request: Extract<FgReq[kFgReq.marks], { a: kMarkAction.goto }>, port: Port): void {
    const { n: markName } = request, key = Marks_.getLocationKey_(markName, request.u)
    const str = port.s.incognito_ && incognitoMarkCache_?.get(key) || Marks_.cache_.getItem(key)
    const options = request.c
    if (request.l) {
      let scroll: MarksNS.FgMark | null = str ? JSON.parse(str) as MarksNS.FgMark : null;
      if (!scroll) {
        let oldPos = request.o, x: number, y: number
        if (oldPos && (x = +oldPos.x) >= 0 && (y = +oldPos.y) >= 0) {
          scroll = [x, y, oldPos.h]
        }
      }
      if (scroll) {
        port.postMessage({ N: kBgReq.goToMark, l: (kTip.local - kTip.global) as 2, n: markName, s: scroll, f: options })
        return
      }
    }
    if (!str) {
      showHUD(trans_("noMark", [trans_(request.l ? "Local_" : "Global_"), markName]))
      return
    }
    const stored = JSON.parse(str) as MarksNS.StoredGlobalMark;
    const tabId = +stored.tabId, markInfo: MarksNS.MarkToGo = {
      u: stored.url, s: stored.scroll, t: stored.tabId,
      n: markName, p: true,
      q: parseOpenPageUrlOptions(options),
      f: parseFallbackOptions(options)
    };
    markInfo.p = options.prefix !== false && markInfo.s[1] === 0 && markInfo.s[0] === 0 &&
        !!BgUtils_.IsURLHttp_(markInfo.u);
    if (tabId >= 0 && framesForTab_.has(tabId)) {
      tabsGet(tabId, Marks_.checkTab_.bind(0, markInfo))
    } else {
      reqH_[kFgReq.focusOrLaunch](markInfo)
    }
  },
  checkTab_ (this: 0, mark: MarksNS.MarkToGo, tab: Tab): void {
    const url = getTabUrl(tab).split("#", 1)[0]
    if (url === mark.u || mark.p && mark.u.startsWith(url)) {
      reqH_[kFgReq.gotoSession]({ s: tab.id })
      return Marks_.scrollTab_(mark, tab);
    } else {
      reqH_[kFgReq.focusOrLaunch](mark)
    }
  },
  getLocationKey_ (markName: string, url: string | undefined): string {
    return url ? "vimiumMark|" + prepareReParsingPrefix_(url.split("#", 1)[0])
        + (url.length > 1 ? "|" + markName : "") : "vimiumGlobalMark|" + markName
  },
  scrollTab_ (this: void, markInfo: MarksNS.InfoToGo, tab: Tab): void {
    const tabId = tab.id, port = framesForTab_.get(tabId)?.top_
    if (port) {
      port.postMessage({ N: kBgReq.goToMark, l: 0, n: markInfo.n, s: markInfo.s, f: markInfo.f })
    }
    if (markInfo.t !== tabId && markInfo.n) {
      return Marks_.set_(markInfo as MarksNS.MarkToGo, curIncognito_ === IncognitoType.true, tabId)
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
    const storage2 = incognitoMarkCache_
    storage2 && storage2.forEach((_v, key): void => {
      if (key.startsWith(key_start)) {
        num++
        storage2.delete(key)
      }
    })
    return showHUD(trans_("markRemoved", [
      num, trans_(url ? url === "#" ? "allLocal" : (kTip.local + "") as "41" : (kTip.global + "") as "39"),
      trans_(num !== 1 ? "have" : "has")
    ]));
  }
}

export const FindModeHistory_ = {
  key_: "findModeRawQueryList" as const,
  list_: null as string[] | null,
  timer_: 0,
  init_ (): void {
    const str: string = settings_.get_(FindModeHistory_.key_)
    FindModeHistory_.list_ = str ? str.split("\n") : [];
    FindModeHistory_.init_ = null as never;
  },
  query_: function (incognito: boolean, query?: string, nth?: number): string | void {
    const a = FindModeHistory_;
    a.init_ && a.init_();
    const list = incognito ? incognitoFindHistoryList_
        || (IncognitoWatcher_.watch_(), set_incognitoFindHistoryList_(a.list_!.slice(0))) : a.list_!
    if (!query) {
      return list[list.length - (nth || 1)] || "";
    }
    query = query.replace(/\n/g as RegExpG, " ");
    if (incognito) {
      a.refreshIn_(query, list, true)
      return
    }
    query = BgUtils_.unicodeRSubstring_(query, 0, 99)
    const str = a.refreshIn_(query, list);
    str && settings_.set_(a.key_, str)
    if (incognitoFindHistoryList_) { a.refreshIn_(query, incognitoFindHistoryList_, true) }
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
      incognitoFindHistoryList_ && (set_incognitoFindHistoryList_([]))
      return;
    }
    FindModeHistory_.init_ = null as never;
    FindModeHistory_.list_ = [];
    settings_.set_(FindModeHistory_.key_, "")
  }
}
const IncognitoWatcher_ = {
  watching_: false,
  timer_: 0,
  watch_ (): void {
    if (IncognitoWatcher_.watching_) { return; }
    Windows_.onRemoved.addListener(IncognitoWatcher_.OnWndRemoved_)
    IncognitoWatcher_.watching_ = true;
  },
  OnWndRemoved_ (this: void): void {
    if (!IncognitoWatcher_.watching_) { return; }
    IncognitoWatcher_.timer_ = IncognitoWatcher_.timer_ || setTimeout(IncognitoWatcher_.TestIncognitoWnd_, 34);
  },
  TestIncognitoWnd_ (this: void): void {
    IncognitoWatcher_.timer_ = 0;
    let next: IteratorResult<Frames.Frames>
    if (!OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
        || CurCVer_ > BrowserVer.MinNoAbnormalIncognito - 1) {
      if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
        const map = (framesForTab_ as any as SimulatedMap).map_ as Dict<any> as Dict<Frames.Frames>
        for (let tabId in map) {
          if (map[tabId]!.cur_.s.incognito_) { return }
        }
      } else if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.BuildMinForOf) {
        const iter = framesForTab_.values() as Iterable<Frames.Frames> as IterableIterator<Frames.Frames>
        while (next = iter.next(), !next.done) {
          if (next.value.cur_.s.incognito_) { return }
        }
      } else {
        for (let frames of framesForTab_.values()) {
          if (frames.cur_.s.incognito_) { return }
        }
      }
    }
    Windows_.getAll((wnds): void => {
      wnds.some(wnd => wnd.incognito) || IncognitoWatcher_.cleanI_();
    });
  },
  cleanI_ (): void {
    set_incognitoFindHistoryList_(null)
    set_incognitoMarkCache_(null)
    Windows_.onRemoved.removeListener(IncognitoWatcher_.OnWndRemoved_)
    IncognitoWatcher_.watching_ = false;
  }
}
export const MediaWatcher_ = {
  watchers_: [
    !(OnChrome || OnFirefox) ? MediaNS.Watcher.WaitToTest
    : !(OnChrome && Build.MinCVer < BrowserVer.MinMediaQuery$PrefersReducedMotion)
      && !(OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersReducedMotion)
    ? MediaNS.Watcher.NotWatching
    : OnChrome
    ? CurCVer_ >= BrowserVer.MinMediaQuery$PrefersReducedMotion ? MediaNS.Watcher.NotWatching
      : MediaNS.Watcher.InvalidMedia
    : Build.DetectAPIOnFirefox ? MediaNS.Watcher.WaitToTest : MediaNS.Watcher.NotWatching,
    !(OnChrome || OnFirefox) ? MediaNS.Watcher.WaitToTest
    : !(OnChrome && Build.MinCVer < BrowserVer.MinMediaQuery$PrefersColorScheme)
      && !(OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme)
    ? MediaNS.Watcher.NotWatching
    : OnChrome
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
      a._timer = a._timer || setInterval(MediaWatcher_.RefreshAll_, GlobalConsts.MediaWatchInterval)
      a.update_(key, 0);
    } else if (!doListen && typeof cur === "object") {
      cur.onchange = null;
      watchers[key] = MediaNS.Watcher.NotWatching;
      if (a._timer > 0) {
        if (watchers.every(i => typeof i !== "object")) {
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
    if (OnFirefox && embed == null && isObj) {
      let watcher2 = matchMedia((watcher as ObjWatcher).media);
      watcher2.onchange = (watcher as ObjWatcher).onchange;
      (watcher as ObjWatcher).onchange = null;
      MediaWatcher_.watchers_[key] = watcher = watcher2;
    }
    const omniToggled = key ? "dark" : "less-motion",
    bMatched: boolean = isObj ? (watcher as ObjWatcher).matches : false;
    const payloadKey = key ? "d" : "m", newPayloadVal = settings_.updatePayload_(payloadKey, bMatched)
    if (contentPayload_[payloadKey] !== newPayloadVal) {
      (contentPayload_ as Generalized<Pick<typeof contentPayload_, typeof payloadKey>>)[payloadKey] = newPayloadVal
      embed || settings_.broadcast_({ N: kBgReq.settingsUpdate, d: [payloadKey] })
    }
    setOmniStyle_({
      t: omniToggled,
      e: bMatched || ` ${settingsCache_.vomnibarOptions.styles} `.includes(` ${omniToggled} `),
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
}
export const TabRecency_ = {
  rCompare_: null as never as (a: {id: number}, b: {id: number}) => number,
  onWndChange_: blank_
};

setTimeout((): void => {
  const noneWnd = curWndId_
  let cache = recencyForTab_, stamp = 1, time = 0
  const clean = (tabs: Tab[] | undefined): void => {
    const existing = tabs ? tabs.map(i => [i.id, cache.get(i.id)] as const)
        .filter((i): i is [number, {i: number, t: number}] => <boolean> <any> i[1])
        .sort(i => i[1].i) : []
    if (existing.length > GlobalConsts.MaxTabsKeepingRecency) {
      existing.splice(0, existing.length - GlobalConsts.MaxTabsKeepingRecency)
    }
    existing.forEach((i, ind) => i[1].i = ind + 2)
    stamp = existing.length > 0 ? existing[existing.length - 1][1].i : 1
    if (stamp > 1) {
      if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
        cache.clear()
        for (const item of existing) {
          cache.set(item[0], item[1])
        }
      } else {
        set_recencyForTab_(cache = new Map(existing) as RecencyMap)
      }
      return
    }
    cache.forEach((val, i): void => {
      if (val.i < GlobalConsts.MaxTabRecency - GlobalConsts.MaxTabsKeepingRecency + 2) { cache.delete(i as number) }
      else { val.i -= GlobalConsts.MaxTabRecency - GlobalConsts.MaxTabsKeepingRecency }
    })
    stamp = GlobalConsts.MaxTabsKeepingRecency + 1;
  }
  function listener(info: chrome.tabs.TabActiveInfo): void {
    if (info.windowId !== curWndId_) {
      Windows_.get(info.windowId, maybeOnBgWndActiveTabChange)
      return
    }
    const now = performance.now();
    if (now - time > GlobalConsts.MinStayTimeToRecordTabRecency) {
      const old = cache.get(curTabId_),
      monoNow = (OnChrome || OnFirefox) && contentPayload_.o === kOS.unixLike ? Date.now() : now
      old ? (old.i = ++stamp, old.t = monoNow) : cache.set(curTabId_, { i: ++stamp, t: monoNow })
      if (stamp > GlobalConsts.MaxTabRecency - 10) { // with MinStayTimeToRecordTabRecency, safe enough
        Tabs_.query({}, clean)
      }
    }
    set_curTabId_(info.tabId); time = now
  }
  function maybeOnBgWndActiveTabChange(wnd: chrome.windows.Window): void {
    if (!wnd.focused) { return }
    const newWndId = wnd.id
    if (newWndId !== curWndId_) {
      set_lastWndId_(curWndId_)
      set_curWndId_(newWndId)
    }
    Tabs_.query({windowId: newWndId, active: true}, (tabs): void => {
      if (tabs && tabs.length > 0 && newWndId === curWndId_) {
        onFocusChanged(tabs)
      }
    })
  }
  function onFocusChanged(tabs: [Tab] | never[]): void {
    if (!tabs || tabs.length === 0) { return runtimeError_() }
    let a = tabs[0], current = a.windowId, last = curWndId_
    if (current !== last) {
      set_curWndId_(current)
      set_lastWndId_(last)
    }
    set_curIncognito_(a.incognito ? IncognitoType.true
        : !OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
        ? IncognitoType.ensuredFalse : IncognitoType.mayFalse)
    TabRecency_.onWndChange_()
    listener({ tabId: a.id, windowId: current })
  }
  Tabs_.onActivated.addListener(listener)
  OnFirefox && Build.MayAndroidOnFirefox && !Windows_ ||
  Windows_.onFocusChanged.addListener(function (windowId): void {
    if (windowId === noneWnd) { return; }
    // here windowId may pointer to a devTools window on C45 - see BrowserVer.Min$windows$APIsFilterOutDevToolsByDefault
    Tabs_.query({windowId, active: true}, onFocusChanged)
  });
  getCurTab((tabs: [Tab]): void => {
    time = performance.now();
    const a = tabs && tabs[0];
    if (!a) { return runtimeError_() }
    set_curTabId_(a.id)
    set_curWndId_(a.windowId)
    set_curIncognito_(a.incognito ? IncognitoType.true
      : !OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
      ? IncognitoType.ensuredFalse : IncognitoType.mayFalse)
  });
  TabRecency_.rCompare_ = (a, b): number => cache.get(b.id)!.i - cache.get(a.id)!.i

  if (!OnChrome) { return }
  for (const i of ["images", "plugins", "javascript", "cookies"] as const) {
    localStorage.getItem(ContentSettings_.makeKey_(i)) != null &&
    browser_.contentSettings && setTimeout(ContentSettings_.Clear_, 100, i)
  }
}, 120)

settings_.updateHooks_.autoDarkMode = settings_.updateHooks_.autoReduceMotion = (value: boolean
      , keyName: "autoReduceMotion" | "autoDarkMode"): void => {
    const key = keyName.length > 12 ? MediaNS.kName.PrefersReduceMotion
        : MediaNS.kName.PrefersColorScheme;
    MediaWatcher_.listen_(key, value);
}

settings_.updateHooks_.vomnibarOptions = (options: SettingsNS.BackendSettings["vomnibarOptions"] | null): void => {
  const defaultOptions = settings_.defaults_.vomnibarOptions,
  payload = omniPayload_
  let isSame = true
  let { actions, maxMatches, queryInterval, styles, sizes } = defaultOptions
  if (options !== defaultOptions && options && typeof options === "object") {
    const newMaxMatches = Math.max(3, Math.min((options.maxMatches | 0) || maxMatches
        , GlobalConsts.MaxLimitOfVomnibarMatches)),
    newActions = ((options.actions || "") + "").trim(),
    newInterval = +options.queryInterval,
    newSizes = ((options.sizes || "") + "").trim(),
    newStyles = ((options.styles || "") + "").trim(),
    newQueryInterval = Math.max(0, Math.min(newInterval >= 0 ? newInterval : queryInterval, 1200))
    isSame = maxMatches === newMaxMatches && queryInterval === newQueryInterval
              && newSizes === sizes && actions === newActions
              && styles === newStyles
    if (!isSame) {
      maxMatches = newMaxMatches
      queryInterval = newQueryInterval
      sizes = newSizes
      styles = newStyles
    }
    options.actions = newActions
    options.maxMatches = newMaxMatches
    options.queryInterval = newQueryInterval
    options.sizes = newSizes
    options.styles = newStyles
  }
  if (OnFirefox && isHighContrast_ff_ && !(<RegExpOne> /(^|\s)high-contrast(\s|$)/).test(styles)) {
    styles += " high-contrast"
  }
  (settingsCache_ as settings_.WritableSettingsCache).vomnibarOptions = isSame ? defaultOptions : options!
  payload.n = maxMatches
  payload.t = queryInterval
  payload.l = sizes
  payload.s = styles
  MediaWatcher_.update_(MediaNS.kName.PrefersReduceMotion, 1)
  MediaWatcher_.update_(MediaNS.kName.PrefersColorScheme, 1)
  settings_.broadcastOmni_({ N: kBgReq.omni_updateOptions, d: {
    n: maxMatches,
    t: queryInterval,
    l: sizes,
    s: payload.s
  } })
}
