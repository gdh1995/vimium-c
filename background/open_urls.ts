import C = kBgCmd
import {
  PopWindow, InfoToCreateMultiTab, openInactiveTabs,
  selectFrom, selectWnd, getCurTab, runtimeError_, tabsGet, getTabUrl, getCurWnd, Tab, Window, browserTabs,
  browserWindows, getAllWindows, tabsCreate, safeUpdate, openMultiTab, makeWindow, browser_, selectTab
} from "./browser"
import {
  framesForTab, cKey, cPort, cRepeat, get_cOptions, settings, set_cOptions, set_cPort, set_cRepeat
} from "./store"
import {
  ensureInnerCSS, safePost, showHUD, complainLimits, findCPort, isNotVomnibarPage, portSendFgCmd
} from "./ports"
import { parseSedOptions_, paste_, substitute_ } from "./clipboard"

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

export const newTabIndex = (tab: Readonly<Pick<Tab, "index">>, pos: OpenUrlOptions["position"] | UnknownValue
      , openerTabId?: boolean | null): number | undefined =>
    pos === "before" ? tab.index : pos === "start" || pos === "begin" ? 0
    : pos === "after" || !pos ? tab.index + 1
    /** pos is "end" or "default" */ 
    : Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
      && pos === "end" && openerTabId ? 3e4
    // Chrome: open at end; Firefox: (if opener) at the end of its children, just like a normal click
    : undefined

const normalizeWndType = (wndType: string | boolean | null | undefined): "popup" | "normal" | undefined =>
    wndType === "popup" || wndType === "normal" ? wndType : undefined

const findLastVisibleWindow = (wndType: "popup" | "normal" | undefined, alsoCur: boolean
    , incognito: OpenUrlOptions["incognito"] | null): Promise<Window | null> => {
  const filter = (wnd: Window): boolean =>
      (!wndType || wnd.type === wndType) && (incognito == null || wnd.incognito === !!incognito)
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

const onEvalUrl_ = (workType: Urls.WorkType, options: OpenUrlOptions, tabs: [Tab] | [] | undefined
    , arr: Urls.SpecialUrl): void => {
  if (arr instanceof Promise) {
    arr.then(onEvalUrl_.bind(0, workType, options, tabs))
    return
  }
  BgUtils_.resetRe_()
  switch (arr[1]) {
  case Urls.kEval.copy:
    showHUD((arr as Urls.CopyEvalResult)[0], kTip.noTextCopied)
    break
  case Urls.kEval.paste:
  case Urls.kEval.plainUrl:
    if (options.$p || arr[1] === Urls.kEval.plainUrl) {
      workType = Urls.WorkType.Default
    } else {
      options = BgUtils_.extendIf_(BgUtils_.safeObj_(), options)
      options.$p = 1
    }
    set_cOptions(options as CommandsNS.Options)
    openUrlWithActions(BgUtils_.convertToUrl_((arr as Urls.PasteEvalResult)[0]), workType, tabs)
    break
  case Urls.kEval.status:
    if (workType >= Urls.WorkType.EvenAffectStatus) {
      Backend_.forceStatus_((arr as Urls.StatusEvalResult)[0])
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
      : wnd && wnd.state !== "minimized" ? wnd.state : "")
}

const openUrlInIncognito = (url: string, reuse: ReuseType
    , opts: Readonly<Pick<OpenUrlOptions, "position" | "opener" | "window">>
    , tab: Tab | undefined, wnds: Array<Pick<Window, "id" | "focused" | "incognito" | "type" | "state">>): void => {
  const active = reuse !== ReuseType.newBg
  let oldWnd = tab && wnds.find(wnd => wnd.id === tab.windowId) || wnds.find(wnd => wnd.id === TabRecency_.curWnd_)
    , inCurWnd = oldWnd != null && oldWnd.incognito
  // eslint-disable-next-line arrow-body-style
  if (!opts.window && reuse !== ReuseType.newWnd
      && (inCurWnd || (wnds = wnds.filter(w => w.incognito && w.type === "normal")).length > 0)) {
    const options: InfoToCreateMultiTab & { windowId: number } = {
      url, active, windowId: inCurWnd ? tab!.windowId : wnds[wnds.length - 1].id
    }
    if (inCurWnd) {
      options.index = newTabIndex(tab!, opts.position, opts.opener)
      opts.opener && (options.openerTabId = tab!.id)
    }
    openMultiTab(options, cRepeat)
    !inCurWnd && active && selectWnd(options)
  } else {
    makeWindowFrom(url, true, true, opts, opts as any, oldWnd)
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
    get_cOptions<C.openUrl>().tabid_mask || get_cOptions<C.openUrl>().tabId_mask || get_cOptions<C.openUrl>().tabid_mark,
    get_cOptions<C.openUrl>().title_mask || get_cOptions<C.openUrl>().title_mark,
    get_cOptions<C.openUrl>().id_mask || get_cOptions<C.openUrl>().id_mark || get_cOptions<C.openUrl>().id_marker,
  ]
  const matches: [number, number, string][] = []
  for (let i = 0; i < masks.length; i++) {
    const mask = masks[i] != null ? masks[i] + "" : "", ind = mask ? url.indexOf(mask) : -1
    if (ind >= 0) {
      let end = ind + mask!.length
      for (const j of matches) { if (ind < j[1] && end >= j[0]) { continue } }
      matches.push([ ind, end, i === 0
          ? (<RegExpOne> /[%$]s/).test(mask!) ? BgUtils_.encodeAsciiComponent(tabUrl) : tabUrl
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

const openUrlInAnotherWindow = (url: string, reuse: Exclude<ReuseType, ReuseType.reuse | ReuseType.current>
    , incognito: OpenUrlOptions["incognito"], isCurWndIncognito: boolean
    , options: Readonly<Pick<OpenUrlOptions, "position" | "opener" | "window" | "incognito" | "pinned">>): void => {
  let p: Promise<PopWindow | null>
  p = reuse > ReuseType.OFFSET_LAST_WINDOW ? new Promise(resolve => {
    getCurWnd(true, wnd => (resolve(wnd || null), runtimeError_()))
  }) : findLastVisibleWindow(normalizeWndType(options.window), true, incognito).then(wnd => wnd &&
    new Promise(resolve => browserWindows.get(wnd.id, { populate: true }, i => resolve((i || wnd) as PopWindow))))
  p.then(wnd => {
    const isWndLast = !!wnd && !wnd.focused && wnd.id !== TabRecency_.curWnd_ // in case a F12 window is focused
    const fallbackInCur = reuse === ReuseType.ifLastWnd && !isWndLast
    if (!wnd || !(isWndLast || reuse === ReuseType.ifLastWnd && (incognito == null || wnd.incognito === !!incognito))) {
      makeWindowFrom(url, reuse > ReuseType.lastWndBgInactive, incognito != null ? !!incognito : isCurWndIncognito
          , options, options as any, wnd)
      return
    }
    const args: InfoToCreateMultiTab = {
      url, active: reuse > ReuseType.lastWndBg || fallbackInCur, windowId: wnd.id,
      pinned: !!options.pinned,
      index: wnd.tabs && wnd.tabs.length > 0 ? newTabIndex(selectFrom(wnd.tabs), options.position) : undefined
    }
    tabsCreate(args, (newTab): void => {
      if (runtimeError_()) { return runtimeError_() }
      if (reuse > ReuseType.lastWndBg) {
        isWndLast && selectWnd(newTab)
      } else if (reuse > ReuseType.lastWndBgInactive && !fallbackInCur) {
        selectTab(newTab.id, false)
      }
      cRepeat > 1 && openInactiveTabs(args, cRepeat - 1, true)
    }, incognito === "force")
  })
}

const openUrlInNewTab = (url: string, reuse: Exclude<ReuseType, ReuseType.reuse | ReuseType.current>
    , options: Readonly<Pick<OpenUrlOptions, "position" | "opener" | "window" | "incognito" | "pinned">>
    , tabs: [Tab] | []): void => {
  const tab: Tab | undefined = tabs[0], tabIncognito = !!tab && tab.incognito,
  isCurWndIncognito = tabIncognito || TabRecency_.incognito_ === IncognitoType.true,
  active = reuse !== ReuseType.newBg && reuse !== ReuseType.lastWndBgInactive
  let window: boolean = reuse === ReuseType.newWnd || reuse < ReuseType.OFFSET_LAST_WINDOW + 1 || !!options.window
  let incognito = options.incognito
  let inReader: boolean | undefined
  if (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
      && url.startsWith("about:reader?url=")) {
    url = BgUtils_.decodeEscapedURL_(url.slice(17))
    inReader = true
  }
  if (incognito !== "force" && BgUtils_.isRefusingIncognito_(url)) {
    window = isCurWndIncognito || window
    incognito = false
  } else if (isCurWndIncognito) {
    window = incognito === false || window
  } else if (incognito) {
    if (reuse > ReuseType.OFFSET_LAST_WINDOW) {
      getAllWindows(openUrlInIncognito.bind(null, url, reuse, options, tab))
      return
    }
  }
  if (window) {
    openUrlInAnotherWindow(url, reuse, incognito, isCurWndIncognito, options)
    return
  }
  let openerTabId = options.opener && tab ? tab.id : undefined
  const args: Parameters<BackendHandlersNS.BackendHandlers["reopenTab_"]>[2] & { url: string, active: boolean } = {
    url, active, windowId: tab ? tab.windowId : undefined,
    openerTabId, pinned: !!options.pinned,
    index: tab ? newTabIndex(tab, options.position, openerTabId != null) : undefined
  }
  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox) && inReader) {
    args.openInReaderMode = inReader
  }
  openMultiTab(args, cRepeat, (incognito as typeof options.incognito) === "force")
}

const replaceOrOpenInNewTab = <Reuse extends Exclude<ReuseType, ReuseType.current>> (
    url: string, reuse: Reuse, replace: KnownOptions<C.openUrl>["replace"], rawWndType: OpenUrlOptions["window"]
    , options: Reuse extends ReuseType.reuse ? MarksNS.FocusOrLaunch : KnownOptions<C.openUrl>
    , tabs?: [Tab] | []): void => {
  const matcher = !replace ? null
      : typeof replace === "string" ? Exclusions.createSimpleUrlMatcher_(replace)
      : typeof replace !== "object" || !replace.t || !replace.v ? null : replace
  const allWindows = reuse === ReuseType.newWnd || reuse === ReuseType.reuse
  const wndType = normalizeWndType(rawWndType)
  const incognito = reuse !== ReuseType.reuse ? (options as KnownOptions<C.openUrl>).incognito : null
  set_cRepeat(1)
  if ("replace" in options) {
    (options as KnownOptions<C.openUrl>).replace = matcher
  }
  let p: Promise<Pick<Window, "id"> | null>
  if (reuse < ReuseType.OFFSET_LAST_WINDOW + 1 && matcher) {
    p = findLastVisibleWindow(wndType, reuse === ReuseType.ifLastWnd, incognito)
  } else {
    p = Promise.resolve(!allWindows && TabRecency_.curWnd_ >= 0 ? {id: TabRecency_.curWnd_} : null)
  }
  p.then<Tab | null>(preferredWnd => !matcher || !preferredWnd && !allWindows ? null : new Promise(resolve => {
    browserTabs.query(preferredWnd ? { windowId: preferredWnd.id } : {
      windowType: wndType || undefined
    }, (tabs): void => {
      const refused = incognito != null ? !incognito
          : reuse > ReuseType.OFFSET_LAST_WINDOW ? TabRecency_.incognito_ !== IncognitoType.true : -2
      let matched = (tabs || []).filter(tab => Exclusions.matchSimply_(matcher, tab.url) && tab.incognito !== refused)
      matched.sort((a, b) => {
        const cachedB = TabRecency_.tabs_.get(b.id), cachedA = TabRecency_.tabs_.get(a.id)
        return cachedA ? cachedB ? cachedB.i - cachedA.i : 1 : cachedB ? -1 : b.id - a.id
      })
      if (reuse === ReuseType.reuse) {
        const inCurWnd = matched.filter(tab => tab.windowId === TabRecency_.curWnd_)
        matched = inCurWnd.length > 0 ? inCurWnd : matched
      }
      resolve(matched.length ? matched[0] : null)
      return runtimeError_()
    })
  })).then<void>(matchedTab => {
    if (matchedTab == null || matchedTab.id === TabRecency_.curTab_ && reuse !== ReuseType.reuse) {
      reuse === ReuseType.reuse ? focusOrLaunch(options as MarksNS.FocusOrLaunch)
      : tabs ? openUrlInNewTab(url, reuse as Exclude<ReuseType, ReuseType.current | ReuseType.reuse>
            , options as KnownOptions<C.openUrl>, tabs)
      : getCurTab(openUrlInNewTab.bind(null, url, reuse as Exclude<ReuseType, ReuseType.current | ReuseType.reuse>
            , options as KnownOptions<C.openUrl>))
    } else {
      browserTabs.update(matchedTab.id, {
        url: url
      }, (): void => {
        if (matchedTab.windowId !== TabRecency_.curWnd_ && reuse > ReuseType.lastWndBg) {
          selectWnd(matchedTab)
        }
      })
      browserTabs.update(matchedTab.id, {active: reuse !== ReuseType.newBg && reuse !== ReuseType.lastWndBgInactive})
    }
  })
}

export const openJSUrl = (url: string, onBrowserFail?: () => void): void => {
  if ("void 0;void(0);".includes(url.slice(11).trim())) {
    return
  }
  if (!onBrowserFail && cPort) {
    if (safePost(cPort, { N: kBgReq.eval, u: url })) {
      return
    }
    set_cPort(null)
  }
  const callback1 = (opt?: object | -1): void => {
    if (opt !== -1 && !runtimeError_()) { return; }
    const code = BgUtils_.DecodeURLPart_(url.slice(11))
    browserTabs.executeScript({ code }, (): void => {
      runtimeError_() && onBrowserFail && onBrowserFail()
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
  } else if (incognito && [ReuseType.current, ReuseType.newBg, ReuseType.newFg].indexOf(reuse) >= 0) {
    tabsCreate({ url: prefix, active: reuse !== ReuseType.newBg })
  } else {
    // reuse may be ReuseType.reuse, but just treat it as .newFg
    openUrlInNewTab(prefix, reuse as Exclude<ReuseType, ReuseType.current | ReuseType.reuse>, options, [tab])
  }
  return true
}

// use Urls.WorkType.Default
const openUrls = (tabs: [Tab] | [] | undefined): void => {
  let urls: string[] = get_cOptions<C.openUrl, true>().urls!, repeat = cRepeat
  if (!get_cOptions<C.openUrl>().$fmt) {
    for (let i = 0; i < urls.length; i++) {
      urls[i] = BgUtils_.convertToUrl_(urls[i] + "")
    }
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox) {
      urls = urls.filter(i => settings.newTabs_.get(i) !== Urls.NewTabType.browser && !(<RegExpI> /file:\/\//i).test(i))
      get_cOptions<C.openUrl, true>().urls = urls
    }
    get_cOptions<C.openUrl, true>().$fmt = 1
  }
  for (const url of urls) {
    if (Backend_.checkHarmfulUrl_(url)) {
      return
    }
  }
  const incognito = get_cOptions<C.openUrl, true>().incognito
  const tab = tabs && (incognito == null || tabs[0] && tabs[0].incognito === !!incognito) && tabs[0] || undefined
  const windowId = tab && tab.windowId
  const reuse = parseReuse(get_cOptions<C.openUrl, true>().reuse), pinned = !!get_cOptions<C.openUrl>().pinned,
  tabIncognito = tab && tab.incognito || TabRecency_.incognito_ === IncognitoType.true,
  newWnd = reuse === ReuseType.newWnd || tabs && !tab || get_cOptions<C.openUrl>().window
  let active = reuse > ReuseType.newFg - 1, index = tab && newTabIndex(tab, get_cOptions<C.openUrl>().position)
  set_cOptions(null)
  do {
    if (newWnd) {
      getCurWnd(false, curWnd => {
        makeWindowFrom(urls, true, incognito != null ? !!incognito : tabIncognito
            , get_cOptions<C.openUrl, true>(), get_cOptions<C.openUrl, true>() as any, curWnd)
      })
      break // not accept repeat if the target .reuse is `newWindow`
    }
    for (const url of urls) {
      tabsCreate({ url, index, windowId, active, pinned })
      active = false
      index != null && index++
    }
  } while (0 < --repeat)
  return runtimeError_()
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
      : BgUtils_.isJSUrl_(url) ? /*#__NOINLINE__*/ openJSUrl(url)
      : Backend_.checkHarmfulUrl_(url) ? 0
      : reuse === ReuseType.reuse ? replaceOrOpenInNewTab(url, reuse, options.replace, options.window
            , { u: url, p: options.prefix, q: { p: options.position, w: options.window } }, tabs)
      : reuse === ReuseType.current ? safeUpdate(url)
      : options.replace ? replaceOrOpenInNewTab(url, reuse, options.replace, options.window, options, tabs)
      : tabs ? openUrlInNewTab(url, reuse, options, tabs)
      : getCurTab(openUrlInNewTab.bind(null, url, reuse, options))

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
  if (BgUtils_.quotedStringRe_.test(url)) {
    url = url.slice(1, -1)
  } else {
    const keyword = get_cOptions<C.openUrl>().keyword
    const _rawTest = get_cOptions<C.openUrl>().testUrl
    if (_rawTest != null ? _rawTest : !keyword || keyword === "~") {
      url = BgUtils_.detectLinkDeclaration_(url)
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
      tabs && tabs.length > 0 ? /*#__NOINLINE__*/ openUrls(tabs) : getCurTab(/*#__NOINLINE__*/ openUrls)
    }
    return
  }
  if ((get_cOptions<C.openUrl>().url_mask != null || get_cOptions<C.openUrl>().url_mark != null) && !tabs) {
    return runtimeError_() || <any> void getCurTab(openUrl)
  }
  let sed = parseSedOptions_(get_cOptions<C.openUrl, true>())
  if (get_cOptions<C.openUrl>().url) {
    let url = get_cOptions<C.openUrl>().url + ""
    if (sed) {
      url = substitute_(url, SedContext.paste, sed)
    }
    openUrlWithActions(url, Urls.WorkType.EvenAffectStatus, tabs)
  } else if (get_cOptions<C.openUrl>().copied) {
    const url = paste_(sed)
    if (url instanceof Promise) {
      url.then(/*#__NOINLINE__*/ openCopiedUrl.bind(null, tabs))
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
  const opts: KnownOptions<C.openUrl> & SafeObject = BgUtils_.safeObj_()
  const o2: Readonly<Partial<FgReq[kFgReq.openUrl]["o"]>> = request.o || BgUtils_.safeObj_() as {}
  const _rawKey = o2.k, keyword = (_rawKey || "") + ""
  const _rawTest = o2.t, testUrl = _rawTest != null ? _rawTest : !keyword
  const incognito = request.i === "reverse" ? cPort ? !cPort.s.incognito_ : null : request.i
  const reuse = request.r, sed = o2.s
  opts.reuse = incognito != null && (!reuse || reuse === "current") && (!cPort || incognito !== cPort.s.incognito_)
      ? ReuseType.newFg : reuse
  opts.incognito = incognito
  opts.replace = o2.m
  opts.position = o2.p
  opts.window = o2.w
  if (url) {
    if (url[0] === ":" && !isWeb && (<RegExpOne> /^:[bhtwWBHdso]\s/).test(url)) {
      url = url.slice(2).trim()
    }
    url = substitute_(url as string, !isWeb ? SedContext.omni : request.f ? SedContext.NONE : SedContext.pageText, sed)
    if (request.f) {
      url = url !== request.u ? BgUtils_.convertToUrl_(url) : url
    }
    else if (testUrl) {
      url = BgUtils_.fixCharsInUrl_(url)
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
    opts.opener = isWeb ? !request.n : settings.cache_.vomnibarOptions.actions.includes("opener")
    opts.url_f = url
  } else {
    opts.copied = request.c, opts.keyword = keyword, opts.testUrl = _rawTest
    opts.sed = sed
  }
  set_cRepeat(1)
  set_cOptions(opts)
  openUrl()
}

/** focusOrLaunch section */

/** safe when cPort is null */
const focusAndExecuteArr = [function (tabs): void {
  if (TabRecency_.incognito_ !== IncognitoType.true) {
    tabs && (tabs = tabs.filter(tab => !tab.incognito))
  }
  if (tabs && tabs.length > 0) {
    getCurWnd(false, focusAndExecuteArr[2].bind(this, tabs))
    return
  }
  getCurTab(focusAndExecuteArr[1].bind(this))
  return runtimeError_()
}, function (tabs) {
  // if `this.s`, then `typeof this` is `MarksNS.MarkToGo`
  const callback = this.s ? focusAndExecuteArr[3].bind(this as MarksNS.MarkToGo, 0) : null
  if (tabs.length <= 0 || this.q && this.q.w
      || TabRecency_.incognito_ === IncognitoType.true && !tabs[0].incognito) {
    makeWindow({ url: this.u, type: normalizeWndType(this.q && this.q.w),
      incognito: TabRecency_.incognito_ === IncognitoType.true && !BgUtils_.isRefusingIncognito_(this.u)
    }, "", callback && function (wnd: Window): void {
      if (wnd.tabs && wnd.tabs.length > 0) { callback(wnd.tabs[0]) }
    })
  } else {
    tabsCreate({ index: newTabIndex(tabs[0], this.q && this.q.p), url: this.u, windowId: tabs[0].windowId }, callback)
  }
}, function (tabs, wnd): void {
  const wndId = wnd.id, url = this.u
  let tabs2 = tabs.filter(tab2 => tab2.windowId === wndId)
  if (tabs2.length <= 0) {
    tabs2 = wnd.incognito ? tabs : tabs.filter(tab2 => !tab2.incognito)
    if (tabs2.length <= 0) {
      getCurTab(focusAndExecuteArr[1].bind(this))
      return
    }
  }
  this.p && tabs2.sort((a, b) => a.url.length - b.url.length)
  let tab: Tab = selectFrom(tabs2)
  if (tab.url.length > tabs2[0].url.length) { tab = tabs2[0]; }
  if (Build.BTypes & BrowserType.Chrome
      && url.startsWith(settings.CONST_.OptionsPage_) && !framesForTab.get(tab.id) && !this.s) {
    tabsCreate({ url })
    browserTabs.remove(tab.id)
  } else {
    const cur = Build.BTypes & BrowserType.Chrome && IsEdg_ ? tab.url.replace(<RegExpOne> /^edge:/, "chrome:") : tab.url
    const wanted = Build.BTypes & BrowserType.Chrome && IsEdg_ ? url.replace(<RegExpOne> /^edge:/, "chrome:") : url
    browserTabs.update(tab.id, {
      url: cur.startsWith(wanted) ? undefined : url, active: true
    }, this.s ? focusAndExecuteArr[3].bind(this as MarksNS.MarkToGo, 0) : null)
    tab.windowId !== wndId && selectWnd(tab)
  }
}, function (this: MarksNS.MarkToGo, tick: 0 | 1 | 2, tab: Tab): void {
  if (!tab) { return runtimeError_(); }
  if (tab.status === "complete" || tick >= 2) {
    Marks_.scrollTab_(this, tab)
  } else {
    setTimeout((): void => { tabsGet(tab.id, focusAndExecuteArr[3].bind(this, (tick + 1) as 1 | 2)); }, 800)
  }
}] as [
  (this: MarksNS.FocusOrLaunch, tabs: Tab[]) => void,
  (this: MarksNS.FocusOrLaunch, tabs: [Tab] | never[]) => void,
  (this: MarksNS.FocusOrLaunch, tabs: Tab[], wnd: Window) => void,
  (this: MarksNS.MarkToGo, tick: 0 | 1 | 2, tabs: Tab | undefined) => void
]

export const focusAndExecute = (req: Omit<FgReq[kFgReq.gotoMainFrame], "f">
    , port: Port, targetPort: Port | null, focusAndShowFrameBorder: BOOL): void => {
  if (targetPort && targetPort.s.status_ !== Frames.Status.disabled) {
    targetPort.postMessage({
      N: kBgReq.focusFrame,
      H: focusAndShowFrameBorder || req.c !== kFgCmd.scroll ? ensureInnerCSS(port.s) : null,
      m: focusAndShowFrameBorder ? FrameMaskType.ForcedSelf : FrameMaskType.NoMaskAndNoFocus,
      k: focusAndShowFrameBorder ? cKey : kKeyCode.None,
      c: req.c, n: req.n, a: req.a
    })
  } else {
    req.a.$forced = true
    portSendFgCmd(port, req.c, false, req.a as any, req.n)
  }
}

/** safe when cPort is null */
export const focusOrLaunch = (request: FgReq[kFgReq.focusOrLaunch], port?: Port | null, notFolder?: true): void => {
  // * do not limit windowId or windowType
  let url = BgUtils_.reformatURL_(request.u.split("#", 1)[0]), callback = focusAndExecuteArr[0]
  if (Backend_.checkHarmfulUrl_(url, port)) {
    return
  }
  if (request.q && request.q.m) {
    const replace = request.q.m
    request.q.m = null
    return replaceOrOpenInNewTab(request.u, ReuseType.reuse, replace, request.q.w, request)
  }
  let cb2: (result: Tab[], exArg?: FakeArg) => void
  if (!notFolder && (url.startsWith("file:") || url.startsWith("ftp:"))
      && !url.includes(".", url.lastIndexOf("/") + 1)) {
    url += "/"
    cb2 = (tabs): void => {
      tabs && tabs.length > 0 ? callback.call(request, tabs) : focusOrLaunch(request, null, true)
    }
  } else {
    request.p && (url += "*")
    cb2 = callback.bind(request)
  }
  // if no .replace, then only search in normal windows by intent
  browserTabs.query({ url, windowType: normalizeWndType(request.q && request.q.w) || "normal" }, cb2)
}
