import {
  PopWindow, InfoToCreateMultiTab, getGroupId,
  selectFrom, selectWnd, getCurTab, runtimeError_, getTabUrl, getCurWnd, Tab, Window, browserTabs,
  browserWindows, getAllWindows, tabsCreate, safeUpdate, openMultiTabs, selectWndIfNeed, makeWindow, browser_, selectTab
} from "./browser"
import {
  framesForTab, cKey, cPort, cRepeat, get_cOptions, settings, set_cOptions, set_cPort, set_cRepeat
} from "./store"
import { ensureInnerCSS, safePost, showHUD, complainLimits, findCPort, isNotVomnibarPage } from "./ports"
import { parseSedOptions_, paste_, substitute_ } from "./clipboard"
import {
  copyCmdOptions, runNextCmdBy, parseFallbackOptions, portSendFgCmd, replaceCmdOptions, overrideOption, runNextCmd,
  overrideCmdOptions, runNextOnTabLoaded
} from "./run_commands"
import C = kBgCmd

type ShowPageData = [string, typeof Settings_.temp_.shownHash_, number]

const ReuseValues: {
  [K in Exclude<UserReuseType & string
        , "newfg" | "new-fg" | "newFg" | "newwindow" | "newWindow" | "new-window"> as NormalizeKeywords<K>]:
      K extends keyof typeof ReuseType ? (typeof ReuseType)[K] : never
} = {
  current: ReuseType.current, reuse: ReuseType.reuse, newwnd: ReuseType.newWnd,
  newbg: ReuseType.newBg, lastwndfg: ReuseType.lastWndFg, lastwnd: ReuseType.lastWndFg,
  lastwndbg: ReuseType.lastWndBg, iflastwnd: ReuseType.ifLastWnd,
  lastwndbgbg: ReuseType.lastWndBgInactive, lastwndbginactive: ReuseType.lastWndBgInactive
}

/** if not opener, then return `tab.index + 1` by default; otherwise a default position is `undefined` */
export const newTabIndex = (tab: Readonly<Tab>
      , pos: OpenUrlOptions["position"] | UnknownValue, opener: boolean
      , doesGroup: OpenUrlOptions["group"]): number | undefined =>
    pos === "before" ? tab.index : pos === "after" || pos === "next" ? tab.index + 1
    : doesGroup !== false && getGroupId(tab) != null ? pos === "start" || pos === "begin" ? tab.index : undefined
    : pos === "start" || pos === "begin" ? 0
    : As_<"end" | "default" | UnknownValue>(pos) === "end" ? opener ? 3e4 : undefined
    /** pos is undefined, or "default" */
    : Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
      && opener || pos === "default" ? undefined : tab.index + 1

export const preferLastWnd = <T extends Pick<Window, "id">> (wnds: T[]): T => {
  return wnds.find(i => i.id === TabRecency_.lastWnd_) || wnds[wnds.length - 1]!
}

const normalizeIncognito = (incognito: OpenUrlOptions["incognito"]): boolean | null => {
  return incognito === !!incognito ? incognito
      : !incognito ? null
      : incognito === "force" ? true
      : incognito === "reverse" ? TabRecency_.incognito_ !== IncognitoType.true
      : incognito === "same" || incognito === "keep" ? TabRecency_.incognito_ === IncognitoType.true
      : null
}

const normalizeWndType = (wndType: string | boolean | null | undefined): "popup" | "normal" | undefined =>
    wndType === "popup" || wndType === "normal" ? wndType : undefined

const findLastVisibleWindow = (wndType: "popup" | "normal" | undefined, alsoCur: boolean
    , incognito: boolean | null): Promise<Window | null> => {
  const filter = (wnd: Window): boolean =>
      (!wndType || wnd.type === wndType) && (incognito == null || wnd.incognito === incognito)
      && wnd.state !== "minimized"
  const p = (TabRecency_.lastWnd_ < 0 ? Promise.resolve(null) : new Promise<Window | null>(resolve => {
    browserWindows.get(TabRecency_.lastWnd_, wnd => {
      resolve(wnd ? filter(wnd) ? wnd : null : (TabRecency_.lastWnd_ = GlobalConsts.WndIdNone, null))
      return runtimeError_()
    })
  }))
  return p.then(wnd => wnd || new Promise(resolve => getAllWindows((wnds): void => {
    const last = wnds.filter(i => filter(i) && i.id !== TabRecency_.curWnd_)
    const wnd2 = last.length > 0 ? last.sort((i, j) => j.id - i.id)[0] : null
    wnd2 && TabRecency_.lastWnd_ < 0 && (TabRecency_.lastWnd_ = wnd2.id)
    resolve(wnd2 || !alsoCur ? wnd2
        : wnds.find(w => w.id === TabRecency_.curWnd_) || wnds.find(w => w.focused) || null)
  })))
}

const findUrlInText = (url: string, testUrl: OpenPageUrlOptions["testUrl"] | UnknownValue): string => {
  return typeof testUrl === "string" && testUrl.toLowerCase().startsWith("whole")
    ? BgUtils_.fixCharsInUrl_(url) : BgUtils_.detectLinkDeclaration_(url)
}

const onEvalUrl_ = (workType: Urls.WorkType, options: KnownOptions<C.openUrl>, tabs: [Tab] | [] | undefined
    , arr: Urls.SpecialUrl): void => {
  if (arr instanceof Promise) {
    void arr.then(onEvalUrl_.bind(0, workType, options, tabs))
    return
  }
  BgUtils_.resetRe_()
  switch (arr[1]) {
  case Urls.kEval.copy:
    showHUD((arr as Urls.CopyEvalResult)[0], kTip.noTextCopied)
    runNextCmdBy(1, options as {})
    break
  case Urls.kEval.paste:
  case Urls.kEval.plainUrl:
    replaceCmdOptions(options)
    if (arr[1] === Urls.kEval.plainUrl || options.$p) {
      workType = Urls.WorkType.Default
    } else { // `.$p` may be computed from clipboard text and then unstable
      overrideCmdOptions<C.openUrl>({}, true)
      overrideOption<C.openUrl, "$p">("$p", 1)
    }
    openUrlWithActions(BgUtils_.convertToUrl_((arr as Urls.PasteEvalResult)[0]), workType, tabs)
    break
  case Urls.kEval.status:
    if (workType >= Urls.WorkType.EvenAffectStatus) {
      Backend_.forceStatus_((arr as Urls.StatusEvalResult)[0])
      runNextCmdBy(1, options as {})
    }
    break
  }
}

const makeWindowFrom = (url: string | string[], focused: boolean, incognito: boolean, options: OpenUrlOptions
    , exOpts: chrome.windows.CreateDataEx, wnd: Pick<Window, "state"> | null | undefined): void => {
  makeWindow({ url, focused, incognito,
    type: (typeof url === "string" || url.length === 1) ? normalizeWndType(options.window) : undefined,
    left: exOpts.left, top: exOpts.top, width: exOpts.width, height: exOpts.height
  }, exOpts.state != null ? exOpts.state as chrome.windows.ValidStates
      : wnd && wnd.state !== "minimized" ? wnd.state : "", (wnd2): void => {
    wnd2 && runNextOnTabLoaded(options, wnd2.tabs[0])
    return runtimeError_()
  })
}

const openUrlInIncognito = (urls: string[], reuse: ReuseType
    , options: Readonly<Pick<OpenUrlOptions, "position" | "opener" | "window" | "group">>
    , tab: Tab | undefined, wnds: Array<Pick<Window, "id" | "focused" | "incognito" | "type" | "state">>): void => {
  const active = reuse !== ReuseType.newBg
  const curWndId = tab ? tab.windowId : TabRecency_.curWnd_
  const curWnd = wnds.find(wnd => wnd.id === curWndId), inCurWnd = curWnd != null && curWnd.incognito
  // eslint-disable-next-line arrow-body-style
  if (!options.window && reuse !== ReuseType.newWnd
      && (inCurWnd || (wnds = wnds.filter(w => w.incognito && w.type === "normal")).length > 0)) {
    const args: InfoToCreateMultiTab & { windowId: number } = {
      url: urls[0], active, windowId: inCurWnd ? curWndId : preferLastWnd(wnds).id
    }
    if (inCurWnd) {
      const opener = options.opener === true
      args.index = newTabIndex(tab!, options.position, opener, options.group)
      opener && (args.openerTabId = tab!.id)
    }
    openMultiTabs(args, cRepeat, true, urls, inCurWnd && options.group, tab, (tab2): void => {
      !inCurWnd && active && selectWnd(tab2)
      runNextOnTabLoaded(options, tab2)
    })
  } else {
    makeWindowFrom(urls, true, true, options, options as any, curWnd)
  }
}

export const parseReuse = (reuse: UserReuseType | null | undefined): ReuseType =>
    reuse == null ? ReuseType.newFg
    : typeof reuse !== "string" ? isNaN(+reuse) ? ReuseType.newFg : reuse | 0
    : (reuse = reuse.toLowerCase().replace("window", "wnd").replace(<RegExpG & { source: "-" }> /-/g, ""),
      reuse in ReuseValues ? ReuseValues[reuse as keyof typeof ReuseValues] : ReuseType.newFg)


const fillUrlMasks = (url: string, tabs: [Tab?] | undefined, url_mark: string | UnknownValue): string => {
  const tabUrl = tabs && tabs.length > 0 ? getTabUrl(tabs[0]!) : ""
  const masks: Array<string | UnknownValue> = [url_mark,
    get_cOptions<C.openUrl>().host_mask || get_cOptions<C.openUrl>().host_mark,
    get_cOptions<C.openUrl>().tabid_mask || get_cOptions<C.openUrl>().tabId_mask
      || get_cOptions<C.openUrl>().tabid_mark || get_cOptions<C.openUrl>().tabId_mark,
    get_cOptions<C.openUrl>().title_mask || get_cOptions<C.openUrl>().title_mark,
    get_cOptions<C.openUrl>().id_mask || get_cOptions<C.openUrl>().id_mark || get_cOptions<C.openUrl>().id_marker
  ]
  const matches: [number, number, string][] = []
  for (let i = 0; i < masks.length; i++) {
    const mask = masks[i] != null ? masks[i] + "" : "", ind = mask ? url.indexOf(mask) : -1
    if (ind >= 0) {
      let end = ind + mask.length
      for (const j of matches) { if (ind < j[1] && end >= j[0]) { continue } }
      matches.push([ ind, end, i === 0
          ? (<RegExpOne> /[%$]s/).test(mask) ? BgUtils_.encodeAsciiComponent(tabUrl) : tabUrl
          : i === 1 ? new URL(tabUrl).host : i === 2 ? tabUrl && "" + tabs![0]!.id
          : i === 3 ? tabUrl && "" + BgUtils_.encodeAsciiComponent(tabs![0]!.title) : browser_.runtime.id ])
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

const openUrlInAnotherWindow = (urls: string[], reuse: Exclude<ReuseType, ReuseType.reuse | ReuseType.current>
    , isCurWndIncognito: boolean
    , options: Readonly<OpenUrlOptions>): void => {
  const incognito = normalizeIncognito(options.incognito)
  let p: Promise<PopWindow | null>
  p = reuse > ReuseType.OFFSET_LAST_WINDOW ? new Promise(resolve => {
    getCurWnd(true, wnd => (resolve(wnd || null), runtimeError_()))
  }) : findLastVisibleWindow(normalizeWndType(options.window), true, incognito).then(wnd => wnd &&
    new Promise(resolve => browserWindows.get(wnd.id, { populate: true }, i => resolve((i || wnd) as PopWindow))))
  void p.then((wnd): void => {
    const isWndLast = !!wnd && !wnd.focused && wnd.id !== TabRecency_.curWnd_ // in case a F12 window is focused
    const fallbackInCur = reuse === ReuseType.ifLastWnd && !isWndLast
    if (!wnd || !(isWndLast || reuse === ReuseType.ifLastWnd && (incognito == null || wnd.incognito === !!incognito))) {
      makeWindowFrom(urls, reuse > ReuseType.lastWndBgInactive, incognito != null ? !!incognito : isCurWndIncognito
          , options, options as any, wnd)
      return
    }
    const curTab = wnd.tabs && wnd.tabs.length > 0 ? selectFrom(wnd.tabs) : null
    openMultiTabs({
      url: urls[0], active: reuse > ReuseType.lastWndBg || fallbackInCur, windowId: wnd.id,
      pinned: !!options.pinned,
      index: curTab ? newTabIndex(curTab, options.position, false, options.group) : undefined
    }, cRepeat, !!options.incognito && typeof options.incognito === "string"
    , urls, options.group, curTab, (newTab): void => {
      if (reuse > ReuseType.lastWndBg) {
        isWndLast && selectWnd(newTab)
        runNextOnTabLoaded(options, newTab)
      } else {
        reuse > ReuseType.lastWndBgInactive && !fallbackInCur && selectTab(newTab.id)
        runNextOnTabLoaded(options, null)
      }
    })
  })
}

const openUrlInNewTab = (urls: string[], reuse: Exclude<ReuseType, ReuseType.reuse | ReuseType.current>
    , options: Readonly<OpenUrlOptions>
    , tabs: [Tab] | [] | undefined): void => {
  const tab: Tab | undefined = tabs && tabs[0], tabIncognito = !!tab && tab.incognito,
  isCurWndIncognito = tabIncognito || TabRecency_.incognito_ === IncognitoType.true,
  active = reuse !== ReuseType.newBg && reuse !== ReuseType.lastWndBgInactive
  let window: boolean = reuse === ReuseType.newWnd || reuse < ReuseType.OFFSET_LAST_WINDOW + 1 || !!options.window
  let incognito = normalizeIncognito(options.incognito)
  const useForcedIncognito = incognito != null && typeof options.incognito === "string"
  let inReader: boolean | undefined
  if (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)) {
    for (let i = 0; i < urls.length; i++) {
      if (urls[i].startsWith("about:reader?url=")) {
        urls[i] = BgUtils_.decodeEscapedURL_(urls[i].slice(17))
        inReader = urls.length === 1
      }
    }
  }
  if (!useForcedIncognito && urls.some(url => BgUtils_.isRefusingIncognito_(url))) {
    window = isCurWndIncognito || window
    incognito = false
  } else if (isCurWndIncognito) {
    window = incognito === false || window
  } else if (incognito) {
    if (reuse > ReuseType.OFFSET_LAST_WINDOW) {
      getAllWindows((/*#__NOINLINE__*/ openUrlInIncognito).bind(null, urls, reuse, options, tab))
      return
    }
  }
  if (window) {
    /*#__NOINLINE__*/ openUrlInAnotherWindow(urls, reuse, isCurWndIncognito, options)
    return
  }
  let openerTabId = options.opener && tab ? tab.id : undefined
  const args: Parameters<BackendHandlersNS.BackendHandlers["reopenTab_"]>[2] & { url: string, active: boolean } = {
    url: urls[0], active, windowId: tab ? tab.windowId : undefined,
    openerTabId, pinned: !!options.pinned,
    index: tab ? newTabIndex(tab, options.position, openerTabId != null, options.group) : undefined
  }
  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox) && inReader) {
    args.openInReaderMode = inReader
  }
  openMultiTabs(args, cRepeat, useForcedIncognito, urls, options.group, tab, (tab2): void => {
    active && selectWndIfNeed(tab2)
    runNextOnTabLoaded(options, active && tab2)
  })
}

const replaceOrOpenInNewTab = <Reuse extends Exclude<ReuseType, ReuseType.current>> (
    url: string, reuse: Reuse, replace: KnownOptions<C.openUrl>["replace"]
    , options: Reuse extends ReuseType.reuse ? null : KnownOptions<C.openUrl>
    , reuseOptions: Reuse extends ReuseType.reuse ? MarksNS.FocusOrLaunch : null
    , curTabs?: [Tab] | []): void => {
  const matcher = !replace ? null
      : typeof replace === "string" ? Exclusions.createSimpleUrlMatcher_(replace)
      : typeof replace !== "object" || !replace.t || !replace.v ? null : replace
  const allWindows = reuse === ReuseType.newWnd || reuse === ReuseType.reuse
  const rawWndType = reuse === ReuseType.reuse ? reuseOptions!.q!.w : options!.window
  const wndType = normalizeWndType(rawWndType)
  const incognito = normalizeIncognito(reuse !== ReuseType.reuse
          ? options!.incognito : reuseOptions!.q && reuseOptions!.q.i)
  const useGroup = (reuse !== ReuseType.reuse ? options!.group : reuseOptions!.q && reuseOptions!.q.g) === true
  set_cRepeat(1)
  if (reuse !== ReuseType.reuse && options!.replace != null) { options!.replace = matcher }
  let p: Promise<Pick<Window, "id"> | null>
  if (reuse < ReuseType.OFFSET_LAST_WINDOW + 1 && matcher) {
    p = findLastVisibleWindow(wndType, reuse === ReuseType.ifLastWnd, incognito)
  } else {
    p = Promise.resolve(!allWindows && TabRecency_.curWnd_ >= 0 ? {id: TabRecency_.curWnd_} : null)
  }
  void Promise.all([p, !useGroup || curTabs ? null : new Promise<void>(resolve => {
    getCurTab(curTabs2 => { curTabs = curTabs2 || []; resolve() })
  })]).then<Tab | null>(([preferredWnd, _]) => !matcher || !preferredWnd && !allWindows ? null : new Promise(r => {
    browserTabs.query(preferredWnd ? { windowId: preferredWnd.id } : {
      windowType: wndType || undefined
    }, (tabs): void => {
      const refused = incognito != null ? !incognito
          : reuse > ReuseType.OFFSET_LAST_WINDOW ? TabRecency_.incognito_ !== IncognitoType.true : -2
      let matched = (tabs || []).filter(tab => Exclusions.matchSimply_(matcher, tab.url) && tab.incognito !== refused)
      if (useGroup && matched.length > 0 && curTabs!.length > 0) {
        const curGroup = getGroupId(curTabs![0]!)
        tabs && (matched = matched.filter(tab => getGroupId(tab) === curGroup))
      }
      matched.sort((a, b) => {
        const cachedB = TabRecency_.tabs_.get(b.id), cachedA = TabRecency_.tabs_.get(a.id)
        return cachedA ? cachedB ? cachedB.i - cachedA.i : 1 : cachedB ? -1 : b.id - a.id
      })
      if (reuse === ReuseType.reuse) {
        const inCurWnd = matched.filter(tab => tab.windowId === TabRecency_.curWnd_)
        matched = inCurWnd.length > 0 ? inCurWnd : matched
      }
      r(matched.length ? matched[0] : null)
      return runtimeError_()
    })
  })).then<void>(matchedTab => {
    if (matchedTab == null || matchedTab.id === TabRecency_.curTab_ && reuse !== ReuseType.reuse) {
      reuse === ReuseType.reuse ? focusOrLaunch(reuseOptions!)
      : runNextCmdBy(0, options!) ? 0
      : curTabs ? openUrlInNewTab([url], reuse, options!, curTabs)
      : getCurTab(openUrlInNewTab.bind(null, [url], reuse, options!))
    } else {
      const active = reuse !== ReuseType.newBg && reuse !== ReuseType.lastWndBgInactive
      const activeWnd = matchedTab.windowId !== TabRecency_.curWnd_ && reuse > ReuseType.lastWndBg
      browserTabs.update(matchedTab.id, { url }, (): void => {
        active && selectTab(matchedTab.id)
        if (activeWnd) {
          selectWnd(matchedTab)
        }
        runNextOnTabLoaded(reuse === ReuseType.reuse ? reuseOptions!.f || {} : options!, activeWnd && matchedTab)
      })
    }
  })
}

export const openJSUrl = (url: string, options: Req.FallbackOptions, onBrowserFail?: (() => void) | null): void => {
  if ("void 0;void(0);".includes(url.slice(11).trim())) {
    return
  }
  if (!onBrowserFail && cPort) {
    if (safePost(cPort, { N: kBgReq.eval, u: url, f: parseFallbackOptions(options)})) {
      return
    }
    set_cPort(null as never)
  }
  const callback1 = (opt?: object | -1): void => {
    if (opt !== -1 && !runtimeError_()) { runNextOnTabLoaded(options, null); return; }
    const code = BgUtils_.DecodeURLPart_(url.slice(11))
    browserTabs.executeScript({ code }, (): void => {
      runtimeError_() ? onBrowserFail && onBrowserFail() : runNextOnTabLoaded(options, null)
      return runtimeError_()
    })
    return runtimeError_()
  }
  // e.g.: use Chrome omnibox at once on starting
  if (Build.MinCVer < BrowserVer.Min$Tabs$$Update$DoesNotAcceptJavaScriptURLs && Build.BTypes & BrowserType.Chrome &&
      CurCVer_ < BrowserVer.Min$Tabs$$Update$DoesNotAcceptJavaScriptURLs) {
    browserTabs.update({ url }, callback1)
  } else {
    callback1(-1)
  }
}

export const openShowPage = (url: string, reuse: ReuseType, options: OpenUrlOptions, tab?: Tab): boolean => {
  const prefix = settings.CONST_.ShowPage_
  if (url.length < prefix.length + 3 || !url.startsWith(prefix)) { return false; }
  if (!tab) {
    getCurTab(function (tabs: [Tab]): void {
      if (!tabs || tabs.length <= 0) { return runtimeError_(); }
      openShowPage(url, reuse, options, tabs[0])
    })
    return true
  }
  url = url.slice(prefix.length)
  const { incognito } = tab
  if (url.startsWith("#!image ") && incognito) {
    url = "#!image incognito=1&" + url.slice(8).trim()
  }
  const arr: ShowPageData = [url, null, 0]
  settings.temp_.shownHash_ = arr[1] = function (this: void) {
    clearTimeout(arr[2])
    settings.temp_.shownHash_ = null
    return arr[0]
  }
  arr[2] = setTimeout(() => {
    arr[0] = "#!url vimium://error (vimium://show: sorry, the info has expired.)"
    arr[2] = setTimeout(function () {
      if (settings.temp_.shownHash_ === arr[1]) { settings.temp_.shownHash_ = null; }
      arr[0] = "", arr[1] = null
    }, 2000)
  }, 1200)
  set_cRepeat(1)
  if (reuse === ReuseType.current && !incognito) {
    let views = Build.BTypes & BrowserType.ChromeOrFirefox
          && (!(Build.BTypes & ~BrowserType.ChromeOrFirefox) || OnOther & BrowserType.ChromeOrFirefox)
          && (!(Build.BTypes & ~BrowserType.Firefox)
              || Build.MinCVer >= BrowserVer.Min$Extension$$GetView$AcceptsTabId
              || CurCVer_ >= BrowserVer.Min$Extension$$GetView$AcceptsTabId)
          && !tab.url.split("#", 2)[1]
      ? browser_.extension.getViews({ tabId: tab.id }) : []
    if (Build.BTypes & BrowserType.ChromeOrFirefox && views.length > 0
        && views[0].location.href.startsWith(prefix) && views[0].onhashchange) {
      (views[0].onhashchange as () => void)()
    } else {
      browserTabs.update(tab.id, { url: prefix })
    }
    runNextOnTabLoaded(options, null)
  } else if (incognito && [ReuseType.current, ReuseType.newBg, ReuseType.newFg].indexOf(reuse) >= 0) {
    /* safe-for-group */ tabsCreate({ url: prefix, active: reuse !== ReuseType.newBg }, newTab => {
      newTab && runNextOnTabLoaded(options, newTab)
    })
  } else {
    if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox & OnOther & BrowserType.Firefox) {
      options.group = false
    }
    options.incognito = false
    // reuse may be ReuseType.reuse, but just treat it as .newFg
    openUrlInNewTab([prefix], reuse as Exclude<ReuseType, ReuseType.current | ReuseType.reuse>, options, [tab])
  }
  return true
}

// use Urls.WorkType.Default
const openUrls = (tabs: [Tab] | [] | undefined): void => {
  const options = get_cOptions<C.openUrl, true>()
  let urls: string[] = options.urls!
  if (options.$fmt !== 2) {
    if (options.$fmt !== 1) {
      for (let i = 0; i < urls.length; i++) { urls[i] = BgUtils_.convertToUrl_(urls[i] + "") }
    }
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox) {
      urls = urls.filter(i => settings.newTabs_.get(i) !== Urls.NewTabType.browser && !(<RegExpI> /file:\/\//i).test(i))
      overrideOption<C.openUrl, "urls">("urls", urls)
    }
    overrideOption<C.openUrl, "$fmt">("$fmt", 2)
  }
  for (const url of urls) {
    if (Backend_.checkHarmfulUrl_(url)) {
      return runtimeError_()
    }
  }
  const rawReuse = parseReuse(options.reuse)
  const reuse = rawReuse === ReuseType.reuse || rawReuse === ReuseType.current ? ReuseType.newFg : rawReuse
  set_cOptions(null)
  openUrlInNewTab(urls, reuse, options, tabs)
}

export const openUrlWithActions = (url: Urls.Url, workType: Urls.WorkType, tabs?: [Tab] | []): void => {
  if (typeof url !== "string") { /* empty */ }
  else if (url || workType !== Urls.WorkType.FakeType) {
    let url_mask = get_cOptions<C.openUrl>().url_mask, umark = get_cOptions<C.openUrl>().url_mark
    if (url_mask != null || umark != null) {
      url = /*#__NOINLINE__*/ fillUrlMasks(url, tabs, url_mask != null ? url_mask : umark!)
    }
    if (workType !== Urls.WorkType.FakeType) {
      const _rawKey = get_cOptions<C.openUrl>().keyword, keyword = (_rawKey || "") + ""
      const _rawTest = get_cOptions<C.openUrl>().testUrl,
      testUrl = _rawTest != null ? _rawTest : !keyword
      url = testUrl ? BgUtils_.convertToUrl_(url, keyword, workType)
          : BgUtils_.createSearchUrl_(url.trim().split(BgUtils_.spacesRe_), keyword || "~")
    }
    const goNext = get_cOptions<C.openUrl, true>().goNext
    if (goNext && url && typeof url === "string") {
      url = substitute_(url, SedContext.goNext)
      url = goToNextUrl(url, cRepeat, goNext)[1]
    }
    url = typeof url === "string" ? BgUtils_.reformatURL_(url) : url
  } else {
    url = settings.cache_.newTabUrl_f
  }
  let options = get_cOptions<C.openUrl, true>(), reuse: ReuseType = parseReuse(options.reuse)
  set_cOptions(null)
  BgUtils_.resetRe_()
  if (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
      && typeof url === "string" && url.startsWith("about:reader?url=")) {
    reuse = reuse !== ReuseType.newBg ? ReuseType.newFg : reuse
  }
  typeof url !== "string"
      ? /*#__NOINLINE__*/ onEvalUrl_(workType, options, tabs, url)
      : openShowPage(url, reuse, options) ? 0
      : BgUtils_.isJSUrl_(url) ? /*#__NOINLINE__*/ openJSUrl(url, options)
      : Backend_.checkHarmfulUrl_(url) ? 0
      : reuse === ReuseType.reuse ? replaceOrOpenInNewTab(url, reuse, options.replace
            , null, { u: url, p: options.prefix, q: { g: options.group, i: options.incognito,
              p: options.position, w: options.window }, f: parseFallbackOptions(options) }, tabs)
      : reuse === ReuseType.current ? safeUpdate(url)
      : options.replace ? replaceOrOpenInNewTab(url, reuse, options.replace, options, null, tabs)
      : tabs ? openUrlInNewTab([url], reuse, options, tabs)
      : getCurTab(openUrlInNewTab.bind(null, [url], reuse, options))

}

const openCopiedUrl = (tabs: [Tab] | [] | undefined, url: string | null): void => {
  if (url === null) {
    complainLimits("read clipboard")
    return
  }
  if (!(url = url.trim())) {
    showHUD(trans_("noCopied"))
    return
  }
  let urls: string[]
  const copied = get_cOptions<C.openUrl>().copied, searchLines = typeof copied === "string" && copied.includes("any")
  if ((copied === "urls" || searchLines) && (urls = url.split(<RegExpG> /[\r\n]+/g)).length > 1) {
    const urls2: string[] = [], keyword = searchLines && get_cOptions<C.openUrl>().keyword
        ? get_cOptions<C.openUrl>().keyword + "" : null
    let has_err = false
    for (let i of urls) {
      i = i.trim()
      if (i) {
        i = BgUtils_.convertToUrl_(i, keyword, Urls.WorkType.Default)
        if (searchLines || BgUtils_.lastUrlType_ < Urls.Type.MaxOfInputIsPlainUrl) {
          urls2.push(i)
        } else {
          urls2.length = 0
          has_err = true
          break
        }
      }
    }
    if (urls2.length > 1) {
      set_cOptions(copyCmdOptions(BgUtils_.safeObj_(), get_cOptions<C.openUrl>(), 1))
      get_cOptions<C.openUrl, true>().urls = urls2
      get_cOptions<C.openUrl, true>().$fmt = 1
      tabs && tabs.length > 0 ? openUrls(tabs) : getCurTab(openUrls)
      return
    }
    if (has_err) {
      if (! runNextCmd<C.openUrl>(0)) {
        showHUD("The copied lines are not URLs")
      }
      return
    }
  }
  if (BgUtils_.quotedStringRe_.test(url)) {
    url = url.slice(1, -1)
  } else {
    const _rawTest = get_cOptions<C.openUrl>().testUrl
    if (_rawTest != null ? _rawTest : !get_cOptions<C.openUrl>().keyword) {
      url = findUrlInText(url, _rawTest)
    }
  }
  let start = url.indexOf("://") + 3
  if (start > 3 && BgUtils_.protocolRe_.test(url)) {
    url = (<RegExpOne> /^ttps?:/i).test(url) ? "h" + url : url
    // an origin with "/"
    let arr: RegExpExecArray | null
    const end = url.indexOf("/", start) + 1 || url.length,
    host = url.slice(start, end),
    type = host.startsWith("0.0.0.0") ? 7
        : host.includes(":::") && (arr = (<RegExpOne> /^(\[?::\]?):\d{2,5}$/).exec(host))
        ? arr[1].length : 0
    url = type ? url.slice(0, start) + (type > 6 ? "127.0.0.1" : "[::1]") + url.slice(start + type) : url
  }
  openUrlWithActions(url, Urls.WorkType.ActAnyway, tabs)
}

export const goToNextUrl = (url: string, count: number, abs: true | "absolute"): [found: boolean, newUrl: string] => {
  let matched = false
  let re = <RegExpSearchable<4>> /\$(?:\{(\d+)[,\/#@](\d*):(\d*)(:-?\d*)?\}|\$)/g
  url = url.replace(<RegExpG & RegExpSearchable<4>> re, (s, n, min, end, t): string => {
    if (s === "$$") { return "$" }
    matched = true
    let cur = n && parseInt(n) || 1
    let mini = min && parseInt(min) || 0
    let endi = end && parseInt(end) || 0
    let stepi = t && parseInt(t.slice(1)) || 1
    stepi < 0 && ([mini, endi] = [endi, mini])
    count *= stepi
    cur = abs !== "absolute" ? cur + count : count > 0 ? mini + count - 1 : count < 0 ? endi + count : cur
    return "" + Math.max(mini || 1, Math.min(cur, endi ? endi - 1 : cur))
  })
  return [matched, url]
}

export const openUrl = (tabs?: [Tab] | []): void => {
  if (get_cOptions<C.openUrl>().urls) {
    if (get_cOptions<C.openUrl>().urls instanceof Array) {
      tabs && tabs.length > 0 ? openUrls(tabs) : getCurTab(openUrls)
    }
    return
  }
  if ((get_cOptions<C.openUrl>().url_mask != null || get_cOptions<C.openUrl>().url_mark != null) && !tabs) {
    return runtimeError_() || <any> void getCurTab(openUrl)
  }
  let rawUrl = get_cOptions<C.openUrl>().url
  if (rawUrl) {
    let sed = parseSedOptions_(get_cOptions<C.openUrl, true>())
    rawUrl = sed ? substitute_(rawUrl + "", SedContext.NONE, sed) : rawUrl + ""
    openUrlWithActions(rawUrl, Urls.WorkType.EvenAffectStatus, tabs)
  } else if (get_cOptions<C.openUrl>().copied) {
    const url = paste_(parseSedOptions_(get_cOptions<C.openUrl, true>()))
    if (url instanceof Promise) {
      void url.then(/*#__NOINLINE__*/ openCopiedUrl.bind(null, tabs))
    } else {
      openCopiedUrl(tabs, url)
    }
  } else {
    let url_f = get_cOptions<C.openUrl, true>().url_f!
    // no sed
    openUrlWithActions(url_f || "", Urls.WorkType.FakeType, tabs)
  }
}

export const openUrlReq = (request: FgReq[kFgReq.openUrl], port?: Port): void => {
  BgUtils_.safer_(request)
  let isWeb = port != null && isNotVomnibarPage(port, true)
  set_cPort(isWeb ? port! : findCPort(port) || cPort)
  let url: Urls.Url | undefined = request.u
  // { url_f: string, ... } | { copied: true, ... }
  const opts: KnownOptions<C.openUrl> = {}
  const o2: Readonly<Partial<FgReq[kFgReq.openUrl]["o"]>> = request.o || BgUtils_.safeObj_() as {}
  const _rawKey = o2.k, keyword = (_rawKey || "") + ""
  const _rawTest = o2.t, testUrl = _rawTest != null ? _rawTest : !keyword
  const sed = o2.s
  opts.group = isWeb ? o2.g : true
  opts.incognito = normalizeIncognito(o2.i) != null ? o2.i : request.i
  opts.replace = o2.m
  opts.position = o2.p
  opts.reuse = o2.r != null ? o2.r : request.r
  opts.window = o2.w
  if (url) {
    if (url[0] === ":" && !isWeb && (<RegExpOne> /^:[bhtwWBHdso]\s/).test(url)) {
      url = url.slice(2).trim()
    }
    url = substitute_(url, !isWeb ? SedContext.omni : request.f ? SedContext.NONE : SedContext.pageText, sed)
    if (request.f) {
      url = url !== request.u ? BgUtils_.convertToUrl_(url) : url
    }
    else if (testUrl) {
      url = findUrlInText(url, testUrl)
      url = BgUtils_.convertToUrl_(url, keyword
          , isWeb ? Urls.WorkType.ConvertKnown : Urls.WorkType.EvenAffectStatus)
      const type = BgUtils_.lastUrlType_
      if (request.h != null && (type === Urls.Type.NoScheme || type === Urls.Type.NoProtocolName)) {
        url = (request.h ? "https" : "http") + (url as string).slice((url as string)[4] === "s" ? 5 : 4)
      } else if (isWeb && type === Urls.Type.PlainVimium && (url as string).startsWith("vimium:")) {
        url = BgUtils_.convertToUrl_(url as string)
      }
    } else {
      url = BgUtils_.createSearchUrl_(url.trim().split(BgUtils_.spacesRe_), keyword || "~")
    }
    opts.opener = isWeb ? o2.o !== false : settings.cache_.vomnibarOptions.actions.includes("opener")
    opts.url_f = url
  } else {
    if (request.c === false) { return }
    opts.copied = request.c != null ? request.c : true, opts.keyword = keyword, opts.testUrl = _rawTest
    opts.sed = sed
  }
  set_cRepeat(1)
  replaceCmdOptions(opts)
  openUrl()
}

/** focusOrLaunch section */

export const focusAndExecute = (req: Omit<FgReq[kFgReq.gotoMainFrame], "f">
    , port: Port, targetPort: Port | null, focusAndShowFrameBorder: BOOL): void => {
  if (targetPort && targetPort.s.status_ !== Frames.Status.disabled) {
    targetPort.postMessage({
      N: kBgReq.focusFrame,
      H: focusAndShowFrameBorder || req.c !== kFgCmd.scroll ? ensureInnerCSS(port.s) : null,
      m: focusAndShowFrameBorder ? FrameMaskType.ForcedSelf : FrameMaskType.NoMaskAndNoFocus,
      k: focusAndShowFrameBorder ? cKey : kKeyCode.None,
      f: {},
      c: req.c, n: req.n, a: req.a
    })
  } else {
    req.a.$forced = 1
    portSendFgCmd(port, req.c, false, req.a as any, req.n)
  }
}

/** safe when cPort is null */
export const focusOrLaunch = (request: FgReq[kFgReq.focusOrLaunch], port?: Port | null): void => {

const onMatchedTabs = (tabs: Tab[]): void => {
  const incongito = normalizeIncognito(request.q && request.q.i)
      ?? (TabRecency_.incognito_ !== IncognitoType.true ? false : null)
  if (incongito !== null) {
    tabs && (tabs = tabs.filter(tab => tab.incognito === incongito))
  }
  if (request.q && request.q.g && curTabs.length > 0) {
    const curGroup = getGroupId(curTabs[0]!)
    tabs && (tabs = tabs.filter(tab => getGroupId(tab) === curGroup))
  }
  if (tabs && tabs.length > 0) {
    const tabs2 = tabs.filter(tab2 => tab2.windowId === TabRecency_.curWnd_)
    updateMatchedTab(tabs2.length > 0 ? tabs2 : tabs)
    return
  }
  // if `request.s`, then `typeof request` is `MarksNS.MarkToGo`
  if (request.f && runNextCmdBy(0, request.f)) { /* empty */ }
  else if (curTabs.length <= 0 || request.q && request.q.w
      || TabRecency_.incognito_ === IncognitoType.true && !curTabs[0].incognito) {
    makeWindow({ url: request.u, type: normalizeWndType(request.q && request.q.w),
      incognito: TabRecency_.incognito_ === IncognitoType.true && !BgUtils_.isRefusingIncognito_(request.u)
    }, "", (wnd): void => {
      if (wnd.tabs && wnd.tabs.length > 0) { callback(wnd.tabs[0]) }
    })
  } else {
    openMultiTabs({
      url: request.u, index: newTabIndex(curTabs[0], request.q && request.q.p, false, true),
      windowId: curTabs[0].windowId, active: true
    }, 1, null, [null], request.q ? request.q.g : true, curTabs[0], callback)
  }
  return runtimeError_()
}

const updateMatchedTab = (tabs2: Tab[]): void => {
  const url = request.u
  request.p && tabs2.sort((a, b) => a.url.length - b.url.length)
  let tab: Tab = selectFrom(tabs2)
  if (tab.url.length > tabs2[0].url.length) { tab = tabs2[0]; }
  if (Build.BTypes & BrowserType.Chrome
      && url.startsWith(settings.CONST_.OptionsPage_) && !framesForTab.get(tab.id) && !request.s) {
    /* safe-for-group */ tabsCreate({ url }, callback)
    browserTabs.remove(tab.id)
  } else {
    const cur = Build.BTypes & BrowserType.Chrome && IsEdg_ ? tab.url.replace(<RegExpOne> /^edge:/, "chrome:") : tab.url
    const wanted = Build.BTypes & BrowserType.Chrome && IsEdg_ ? url.replace(<RegExpOne> /^edge:/, "chrome:") : url
    browserTabs.update(tab.id, {
      url: cur.startsWith(wanted) ? undefined : url, active: true
    }, callback)
    selectWndIfNeed(tab)
  }
}

const callback = (tab?: Tab): void => {
  if (!tab) { return runtimeError_(); }
  runNextOnTabLoaded(request.f || {}, tab, request.s && ((): void => {
    Marks_.scrollTab_(request as MarksNS.MarkToGo, tab)
  }))
}

  let curTabs: [Tab] | never[]
  // * do not limit windowId or windowType
  let toTest = BgUtils_.reformatURL_(request.u.split("#", 1)[0])
  if (Backend_.checkHarmfulUrl_(toTest, port)) {
    return
  }
  const opts2 = request.q || (request.q = {})
  if (opts2.g == null || toTest.startsWith(Settings_.CONST_.OptionsPage_)) {
    opts2.g = false // disable group detection by default
  }
  if (opts2.m) {
    const replace = opts2.m
    opts2.m = null
    replaceOrOpenInNewTab(request.u, ReuseType.reuse, replace, null, request)
    return
  }
  getCurTab((curTabs1): void => {
  curTabs = curTabs1
  let preTest: string | undefined, windowType = normalizeWndType(opts2.w) || "normal"
  if ((toTest.startsWith("file:") || toTest.startsWith("ftp:")) && !toTest.includes(".", toTest.lastIndexOf("/") + 1)) {
    preTest = toTest + (request.p ? "/*" : "/")
  }
  request.p && (toTest += "*")
  // if no .replace, then only search in normal windows by intent
    browserTabs.query({ url: preTest || toTest, windowType }, (matched): void => {
      matched && matched.length > 0 || !preTest ? onMatchedTabs(matched)
      : browserTabs.query({ url: toTest, windowType }, onMatchedTabs)
      return runtimeError_()
    })
    return runtimeError_()
  })
}
