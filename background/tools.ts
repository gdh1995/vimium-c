import {
  curIncognito_, curTabId_, curWndId_, framesForTab_, incognitoFindHistoryList_, recencyForTab_, set_curIncognito_,
  set_curTabId_, set_curWndId_, set_incognitoFindHistoryList_, set_lastWndId_, incognitoMarkCache_, focusAndExecuteOn_,
  set_incognitoMarkCache_, settingsCache_, OnFirefox, OnChrome, CurCVer_, updateHooks_, set_cKey, set_lastVisitTabTime_,
  OnEdge, isHighContrast_ff_, omniPayload_, blank_, CONST_, storageCache_, os_, vomnibarBgOptions_, cPort, CurFFVer_,
  lastKeptTabId_, set_saveRecency_, lastVisitTabTime_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, Windows_, browser_, tabsGet, getCurWnd, getTabUrl, runtimeError_, browserSessions_, getCurTab, selectTab,
  selectWndIfNeed, executeScript_
} from "./browser"
import { hostRe_, removeComposedScheme_ } from "./normalize_urls"
import { prepareReParsingPrefix_ } from "./parse_urls"
import * as settings_ from "./settings"
import {
  complainLimits, refreshPorts_, showHUD, showHUDEx, tryToKeepAliveIfNeeded_mv3_non_ff, waitForPorts_,
  resetInnerKeepAliveTick_
} from "./ports"
import { MediaWatcher_ } from "./ui_css"
import { transEx_, trans_ } from "./i18n"
import { parseFallbackOptions, runNextCmd, getRunNextCmdBy, kRunOn, runNextCmdBy, portSendFgCmd } from "./run_commands"
import { focusOrLaunch_, parseOpenPageUrlOptions, preferLastWnd } from "./open_urls"
import { reopenTab_ } from "./tab_commands"

type CSTypes = chrome.contentSettings.ValidTypes;

export const ContentSettings_ = OnChrome ? {
  makeKey_ (this: void, contentType: CSTypes, url?: string): `${string}|${string}` {
    return ("vimiumContent|" + contentType + (url ? "|" + url : "")) as `${string}|${string}`
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
      setTimeout((): void => { focusOrLaunch_({ u: CONST_.OptionsPage_ + "#optionalPermissions" }) }, 800)
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
    if (pattern.startsWith("ftp")) {
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
    settings_.setInLocal_(ContentSettings_.makeKey_(contentType), null)
  },
  clearCS_ (options: KnownOptions<kBgCmd.clearCS>, port: Port | null): boolean {
    const ty = (options.type ? "" + options.type : "images") as NonNullable<typeof options.type>
    if (!ContentSettings_.complain_(ty, "http://a.cc/")) {
      ContentSettings_.Clear_(ty, port ? port.s.incognito_ : curIncognito_ === IncognitoType.true)
      showHUDEx(port, "csCleared", 0, [[(ty[0].toUpperCase() + ty.slice(1)) as "Images"]])
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
          settings_.getInLocal_(key) !== 1 && settings_.setInLocal_(key, 1)
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
      complainLimits(trans_("setIncogCS"))
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
      ref.set(Object.assign<chrome.contentSettings.SetDetails, "primaryPattern">(
          { primaryPattern: pattern }, settings), func)
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
    showHUD("Vimium C has no permissions to set CSs")
  }
} as never

export const Marks_ = { // NOTE: all public members should be static
  set_ ({ l: local, n: markName, s: scroll, u: url }: MarksNS.FgCreateQuery, incognito: boolean, tabId: number): void {
    if (local && scroll[0] === 0 && scroll[1] === 0) {
      if (scroll.length === 2) {
        const i = url.indexOf("#");
        i > 0 && i < url.length - 1 && (scroll = [0, 0, url.slice(i)])
      } else if ((scroll[2] || "").length < 2) { // '#' or (wrongly) ''
        scroll = [0, 0]
      }
    }
    tabId = tabId >= 0 ? tabId : -1
    const sc2 = incognito ? scroll : scroll.length === 2 && !scroll[0] && !scroll[1] ? 0
        : scroll.length !== 2 || scroll[1] > 0x7ffff || scroll[0] > 0x1fff ? scroll
        : Math.max(0, scroll[0]) | (Math.max(0, scroll[1]) << 13)
    const key = Marks_.getLocationKey_(markName, local ? url : "")
    const val: MarksNS.StoredMarkV2 = local ? sc2
        : sc2 ? { s: sc2, t: tabId, u: url.slice(0, 8192) } : { t: tabId, u: url.slice(0, 8192) }
    incognito ? (incognitoMarkCache_ || (IncognitoWatcher_.watch_(), set_incognitoMarkCache_(new Map()))).set(key, val)
        : settings_.setInLocal_(key, val)
  },
  goToMark_ (exOpts: KnownOptions<kBgCmd.marksActivate>, request: MarksNS.FgGotoQuery, port: Port
      , lastKey: kKeyCode): void {
    const { n: markName } = request, key = Marks_.getLocationKey_(markName, request.l ? request.u : "")
    const stored = port.s.incognito_ && incognitoMarkCache_?.get(key)
        || settings_.getInLocal_<MarksNS.StoredMarkV2 | string>(key)
    let parsed: MarksNS.GlobalMarkV1 | MarksNS.ScrollInfo | undefined =
        typeof stored === "number" ? [stored & 0x1fff, stored >>> 13]
        : typeof stored === "string" ? JSON.parse<MarksNS.GlobalMarkV1 | MarksNS.ScrollInfo>(stored)
        : !stored ? stored
        : stored instanceof Array ? stored.slice(0) as unknown as MarksNS.ScrollInfo
        : { url: stored.u, tabId: stored.t,
            scroll: typeof stored.s !== "number" ? stored.s || [0, 0] : [stored.s & 0x1fff, stored.s >>> 13]
    }
    if (typeof stored === "string") {
      Marks_.set_({ l: request.l, n: markName, s: parsed instanceof Array ? parsed : parsed!.scroll || [0, 0]
          , u: request.u }, false, port.s.tabId_)
    }
    if (!parsed && request.s) {
        try {
          const pos: {scrollX: number, scrollY: number, hash?: string} | null = JSON.parse(request.s)
          if (pos && typeof pos === "object") {
            const scrollX = +pos.scrollX, scrollY = +pos.scrollY
            scrollX >= 0 && scrollY >= 0 && (parsed = [scrollX | 0, scrollY | 0, "" + (pos.hash || "")])
          }
        } catch {}
    }
    if (!parsed) {
      showHUDEx(port, "noMark", 0, [[request.l ? "Local" : "Global"], markName])
      runNextCmdBy(0, exOpts)
      return
    }
    const fallback = parseFallbackOptions(exOpts)
    if (parsed instanceof Array) {
      fallback && (fallback.$else = null)
      Marks_.goToInContent_(port.s.tabId_, null, port, true, markName, parsed, 0, fallback, lastKey)
      return
    }
    fallback && (fallback.$else = fallback.$then)
    const tabId = parsed.tabId, wait = exOpts.wait, rawPrefix = exOpts.prefix, rawUrl = parsed.url,
    markInfo: MarksNS.MarkToGo = {
      n: markName, a: !!exOpts.parent && !rawPrefix, p: true,
      q: parseOpenPageUrlOptions(exOpts), s: parsed.scroll || [0, 0], t: tabId, u: rawUrl, f: fallback,
      w: typeof wait === "number" ? Math.min(Math.max(0, wait || 0), 2e3) : wait
    };
    markInfo.p = !!rawPrefix || rawPrefix == null && !markInfo.a && markInfo.s[1] === 0 && markInfo.s[0] === 0
        && !!BgUtils_.IsURLHttp_(rawUrl) && (!rawUrl.includes("#") || request.u.startsWith(rawUrl))
    if (Marks_.CompareUrls_(request.u, rawUrl, markInfo)) {
      Marks_.goToInContent_(port.s.tabId_, null, port, false, markName, markInfo.s, 0, fallback, lastKey)
    } else if (tabId >= 0 && framesForTab_.has(tabId)) {
      tabsGet(tabId, Marks_.checkTab_.bind(0, markInfo, lastKey))
    } else {
      focusOrLaunch_(markInfo)
    }
  },
  CompareUrls_ (tabUrl: string, markUrl: string, markInfo: MarksNS.MarkToGo): boolean {
    const curU = tabUrl.split("#", 1)[0], wantedU = markUrl.split("#", 1)[0]
    return curU === wantedU
        || !!markInfo.p && curU.startsWith(wantedU.endsWith("/") || wantedU.includes("?") ? wantedU : wantedU + "/")
        || !!markInfo.a && wantedU.startsWith(curU.endsWith("/") || curU.includes("?") ? curU : curU + "/")
  },
  checkTab_ (this: 0, mark: MarksNS.MarkToGo, lastKey: kKeyCode, tab: Tab): void {
    const url = getTabUrl(tab)
    if (Marks_.CompareUrls_(url, mark.u, mark)) {
      const useCur = tab.id === curTabId_
      useCur || selectTab(tab.id, selectWndIfNeed)
      Marks_.scrollTab_(mark, tab.id, useCur ? lastKey : kKeyCode.None, true)
    } else {
      focusOrLaunch_(mark)
    }
  },
  getLocationKey_ (markName: string, url: string | undefined): `${string}|${string}` {
    return (url ? "vimiumMark|" + prepareReParsingPrefix_(url.slice(0, 499).split("#", 1)[0])
        + (url.length > 1 ? "|" + markName : "") : "vimiumGlobalMark|" + markName
        ) as `${string}|${string}`
  },
  goToInContent_ (tabId: number, frames: Frames.Frames | null | undefined, port: Port | null
      , local: boolean, name: string | undefined, scroll: MarksNS.ScrollInfo, wait: number | undefined
      , fallback?: Req.FallbackOptions | null, lastKey?: kKeyCode): void {
    port = frames && frames.top_ && !(frames.top_.s.flags_ & Frames.Flags.ResReleased) ? frames.top_ : port
    if (port) {
      const args: CmdOptions[kFgCmd.goToMark] = { g: !local, s: scroll, t: "", f: fallback || {}, w: wait || 0 }
      void Promise.resolve(name && transEx_("mNormalMarkTask", [ ["mJumpTo"], [local ? "Local" : "Global"], name ])
          ).then((tip): void => {
        args.t = tip || ""
        if (lastKey) {
          set_cKey(lastKey)
          focusAndExecuteOn_(port!, kFgCmd.goToMark, args, 1, 1)
        } else {
          portSendFgCmd(port!, kFgCmd.goToMark, true, args, 1)
        }
      })
    } else {
      executeScript_(tabId, 0, null, (x: number, y: number) => { // @ts-ignore
          (window as unknown as typeof globalThis)
          .scrollTo(x, y)
      }, [scroll[0], scroll[1]], fallback ? () => { runNextCmdBy(1, fallback); return runtimeError_() } : null)
    }
  },
  scrollTab_ (this: void, markInfo: MarksNS.MarkToGo, tabId: number, lastKey?: kKeyCode, notANewTab?: boolean): void {
    const frames = framesForTab_.get(tabId), wait = markInfo.w
    void waitForPorts_(frames).then((): void => {
      Marks_.goToInContent_(tabId, frames, null, false, markInfo.n, markInfo.s
          , notANewTab || wait === false ? 0 : typeof wait !== "number" ? 200 : wait, markInfo.f, lastKey)
    })
    if (markInfo.t !== tabId && markInfo.n) {
      Marks_.set_({l: false, n: markInfo.n, s: markInfo.s, u: markInfo.u}, curIncognito_ === IncognitoType.true, tabId)
    }
  },
  clear_ (this: void, url?: string): number {
    const key_start = Marks_.getLocationKey_("", url);
    let num = 0
    storageCache_.forEach((_: unknown, key: string): void => {
      if (key.startsWith(key_start)) {
        num++
        settings_.setInLocal_(key as `${typeof key_start}${string}`, null)
      }
    })
    const storage2 = incognitoMarkCache_
    storage2 && storage2.forEach((_: unknown, key): void => {
      if (key.startsWith(key_start)) {
        num++
        storage2.delete(key)
      }
    })
    showHUDEx(cPort, "markRemoved", 0
        , [num, [url === "#" ? "allLocal" : url ? "Local" : "Global"], [num !== 1 ? "have" : "has"]])
    return num
  }
}

export const FindModeHistory_ = {
  list_: null as string[] | null,
  timer_: 0,
  init_ (): void {
    const str: string = storageCache_.get("findModeRawQueryList") || ""
    FindModeHistory_.list_ = str ? str.split("\n") : [];
    FindModeHistory_.init_ = null as never;
  },
  query_: function (incognito: boolean, query?: string, nth?: number): string | void {
    const a = FindModeHistory_;
    a.init_ && a.init_();
    const list = incognito ? incognitoFindHistoryList_
        || (IncognitoWatcher_.watch_(), set_incognitoFindHistoryList_(a.list_!.slice(0))) : a.list_!
    if (!query) {
      return (list[list.length - (nth || 1)] || "").replace(<RegExpG> /\r/g, "\n")
    }
    query = query.replace(/\n/g as RegExpG, "\r")
    if (incognito) {
      a.refreshIn_(query, list, true)
      return
    }
    query = BgUtils_.unicodeRSubstring_(query, 0, 99)
    const str = a.refreshIn_(query, list);
    str && settings_.setInLocal_("findModeRawQueryList", str)
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
    settings_.setInLocal_("findModeRawQueryList", "")
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

const noneWnd = Build.NDEBUG ? GlobalConsts.WndIdNone : curWndId_, cache = recencyForTab_
export const TabRecency_ = {
  rCompare_: (a: {id: number}, b: {id: number}): number => cache.get(b.id)! - cache.get(a.id)!,
  onWndChange_: blank_
};
let lastSaveRecencyTime = 0

  function onTabActivated(info: chrome.tabs.TabActiveInfo): void {
    const tabId = info.tabId, frames = framesForTab_.get(tabId)
    if (frames && frames.flags_ & Frames.Flags.ResReleased) { refreshPorts_(frames, 0) }
    resetInnerKeepAliveTick_()
    if (info.windowId !== curWndId_) {
      Windows_.get(info.windowId, maybeOnBgWndActiveTabChange)
      return
    }
    const now = performance.now();
    if (now - lastVisitTabTime_ > GlobalConsts.MinStayTimeToRecordTabRecency) {
      const monoNow = (OnChrome || OnFirefox) && Build.OS & kBOS.LINUX_LIKE
          && (Build.OS === kBOS.LINUX_LIKE as number || os_ === kOS.linuxLike) ? Date.now() : now
      cache.set(curTabId_, monoNow)
    }
    set_lastVisitTabTime_(now)
    set_curTabId_(tabId)
    MediaWatcher_.resume_() // not block onActivated listener
  }
  function maybeOnBgWndActiveTabChange(wnd: chrome.windows.Window): void {
    if (!wnd || !wnd.focused) { return runtimeError_() }
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
    onTabActivated({ tabId: a.id, windowId: current })
  }
  Tabs_.onActivated.addListener(onTabActivated)
  OnFirefox && Build.MayAndroidOnFirefox && !Windows_ ||
  Windows_.onFocusChanged.addListener(function (windowId): void {
    if (windowId === noneWnd) { return; }
    // here windowId may pointer to a devTools window on C45 - see BrowserVer.Min$windows$APIsFilterOutDevToolsByDefault
    Tabs_.query({windowId, active: true}, onFocusChanged)
  });
  ; Tabs_.onRemoved.addListener((tabId): void => {
    const existing = framesForTab_.delete(tabId)
    cache.delete(tabId)
    const kAliveIfOnlyAnyAction = Build.MV3 && OnChrome && (Build.MinCVer >= BrowserVer.MinBgWorkerAliveIfOnlyAnyAction
        || CurCVer_ > BrowserVer.MinBgWorkerAliveIfOnlyAnyAction - 1)
    Build.MV3 && !OnFirefox && !kAliveIfOnlyAnyAction && tabId === lastKeptTabId_ && existing
        && tryToKeepAliveIfNeeded_mv3_non_ff(tabId)
  })

void settings_.ready_.then((): void => {
  getCurTab((tabs: [Tab]): void => {
    set_lastVisitTabTime_(performance.now())
    const a = tabs && tabs[0];
    if (!a) { return runtimeError_() }
    set_curTabId_(a.id)
    set_curWndId_(a.windowId)
    set_curIncognito_(a.incognito ? IncognitoType.true
      : !OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
      ? IncognitoType.ensuredFalse : IncognitoType.mayFalse)
    if (!Build.MV3) { return }
    const sessionStorage = browser_.storage.session
    interface RecencyStorage { e: [ tabId: number, monoTime: number ][], b: number }
    const kRecencyField = "recency"
    sessionStorage && sessionStorage.get(kRecencyField).then((rawConf): void => {
      const oldRec = rawConf && rawConf[kRecencyField] as RecencyStorage | undefined
      if (oldRec) {
        const delta = BgUtils_.recencyBase_() - oldRec.b
        for (const [k, v] of oldRec.e) { cache.set(k, v - delta) }
      }
      sessionStorage.remove(kRecencyField)
      set_saveRecency_((): void => {
        if (lastSaveRecencyTime == lastVisitTabTime_) {
          return
        }
        lastSaveRecencyTime = lastVisitTabTime_
        const recency: RecencyStorage = { e: Array.from((cache as any).entries()), b: BgUtils_.recencyBase_() }
        sessionStorage.set({ [kRecencyField]: recency })
      })
    }, blank_)
  });
  if (!OnChrome) { return }
  const items: CSTypes[] = []
  for (const i of ["images", "plugins", "javascript", "cookies"] as const) {
    storageCache_.get(ContentSettings_.makeKey_(i)) != null && items.push(i)
  }
  items.length && browser_.contentSettings && setTimeout(() => {
    for (const i of items) { ContentSettings_.Clear_(i) }
  }, 100)
})

updateHooks_.vomnibarOptions = (options: SettingsNS.BackendSettings["vomnibarOptions"] | null): void => {
  const defaultOptions = settings_.defaults_.vomnibarOptions,
  payload = omniPayload_
  let isSame = true
  let { actions, maxMatches, queryInterval, styles, sizes } = defaultOptions
  if (options !== defaultOptions && options && typeof options === "object") {
    const newMaxMatches = Math.max(3, Math.min((options.maxMatches | 0) || maxMatches
        , GlobalConsts.MaxLimitOfVomnibarMatches)),
    rawNewActions = options.actions,
    newActions = rawNewActions ? rawNewActions.replace(<RegExpG> /[,\s]+/g, " ").trim() : "",
    newInterval = +options.queryInterval,
    newSizes = ((options.sizes || "") + "").trim(),
    rawNewStyles = options.styles,
    newStyles = rawNewStyles instanceof Array ? rawNewStyles : ((rawNewStyles || "") + "").trim(),
    newQueryInterval = Math.max(0, Math.min(newInterval >= 0 ? newInterval : queryInterval, 1200))
    isSame = maxMatches === newMaxMatches && queryInterval === newQueryInterval
              && newSizes === sizes && actions as never as string === newActions
              && styles === newStyles
    if (!isSame) {
      actions = newActions
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
  let finalStyles = styles instanceof Array ? styles.join(" ") : styles
  if (OnFirefox && !Build.MV3 && isHighContrast_ff_ && !(<RegExpOne> /(^|\s)high-contrast(\s|$)/).test(finalStyles)) {
    finalStyles += " high-contrast"
  }
  (settingsCache_ as SettingsNS.SettingsWithDefaults).vomnibarOptions = isSame ? defaultOptions : options!
  payload.n = maxMatches
  payload.i = queryInterval
  payload.s = sizes
  payload.t = finalStyles
  MediaWatcher_.update_(MediaNS.kName.PrefersReduceMotion, 1)
  MediaWatcher_.update_(MediaNS.kName.PrefersColorScheme, 1)
  settings_.broadcastOmniConf_({
    n: maxMatches,
    i: queryInterval,
    s: sizes,
    t: payload.t
  })
  vomnibarBgOptions_.actions = actions.split(" ")
  const sizes2 = sizes.split(",")
  const heightIfEmpty = Math.max(24, Math.min(sizes2.length && +sizes2[0] || VomnibarNS.PixelData.OthersIfEmpty, 320))
  const baseHeightIfNotEmpty = Math.max(24, Math.min(heightIfEmpty + (sizes2.length > 1 && +sizes2[1]
      || (VomnibarNS.PixelData.OthersIfNotEmpty - VomnibarNS.PixelData.OthersIfEmpty)), 320))
  const itemHeight = Math.max(14, Math.min(sizes2.length > 2 && +sizes2[2] || VomnibarNS.PixelData.Item, 120))
  vomnibarBgOptions_.maxBoxHeight_ = maxMatches * itemHeight + baseHeightIfNotEmpty
  if ((OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinCssMinMax && CurFFVer_ < FirefoxBrowserVer.MinCssMinMax
        || OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinCssMinMax && CurCVer_ < BrowserVer.MinCssMinMax)) {
    const scaleX = sizes2.length > 3 && +sizes2[3] || VomnibarNS.PixelData.WindowSizeRatioX
    const rawMaxW = sizes2.length > 4 && +sizes2[4] || VomnibarNS.PixelData.MaxWidthInPixel
    const maxWidth = Math.max(200, Math.min(rawMaxW | 0, 8192))
    vomnibarBgOptions_.maxWidthInPixel_ = [((maxWidth - VomnibarNS.PixelData.MarginH + 3) / scaleX) | 0,
        `calc(50% - ${maxWidth >>> 1}px)`]
  }
}
