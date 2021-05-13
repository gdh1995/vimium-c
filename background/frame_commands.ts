import C = kBgCmd
import { browserTabs, browserWebNav, getTabUrl, runtimeError_, selectTab } from "./browser"
import {
  cPort, NoFrameId, cRepeat, get_cOptions, set_cPort, getSecret, set_cOptions, set_cRepeat, set_cNeedConfirm,
  framesForTab, framesForOmni,
  executeCommand, reqH_, omniPayload, settings, findCSS_, visualWordsRe_, set_cKey, cKey
} from "./store"
import {
  indexFrame, portSendFgCmd, focusFrame, sendFgCmd, showHUD, complainLimits, safePost
} from "./ports"
import { parseOptions_ } from "./key_mappings"
import { parseSedOptions_, substitute_ } from "./clipboard"
import { parseReuse, newTabIndex, openUrlWithActions } from "./open_urls"
import { envRegistry_, normalizedOptions_, shortcutRegistry_, visualGranularities_, visualKeys_ } from "./key_mappings"

export const nextFrame = (): void | kBgCmd.nextFrame => {
  let port = cPort, ind = -1
  const ref = framesForTab.get(port.s.tabId_), ports = ref && ref.ports_
  if (ports && ports.length > 1) {
    ind = ports.indexOf(port)
    for (let count = Math.abs(cRepeat); count > 0; count--) {
      ind += cRepeat > 0 ? 1 : -1
      if (ind === ports.length) { ind = 0 }
      else if (ind < 0) { ind = ports.length - 1 }
    }
    port = ports[ind]
  }
  focusFrame(port, port.s.frameId_ === 0
    , port !== cPort && ref && port !== ref.cur_ ? FrameMaskType.NormalNext : FrameMaskType.OnlySelf)
}

export const parentFrame = (): void | kBgCmd.parentFrame => {
  const sender = cPort.s,
  msg = Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId
    ? `Vimium C can not know parent frame before Chrome ${BrowserVer.MinWithFrameId}`
    : !(sender.tabId_ >= 0 && framesForTab.get(sender.tabId_)) ? "Vimium C can not access frames in current tab" : null
  msg && showHUD(msg)
  if (!sender.frameId_
      || Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId
      || !browserWebNav()) {
    mainFrame()
    return
  }
  let self = sender.frameId_, frameId = self, found: boolean, count = cRepeat
  browserWebNav()!.getAllFrames({ tabId: sender.tabId_ }, (frames): void => {
    do {
      found = false
      for (const i of frames) {
        if (i.frameId === frameId) {
          frameId = i.parentFrameId
          found = frameId > 0
          break
        }
      }
    } while (found && 0 < --count)
    const port = frameId > 0 && frameId !== self ? indexFrame(sender.tabId_, frameId) : null
    port ? focusFrame(port, true, FrameMaskType.ForcedSelf) : mainFrame()
  })
}

export const performFind = (): void | kBgCmd.performFind => {
  const sender = cPort.s, absRepeat = cRepeat < 0 ? -cRepeat : cRepeat, rawIndex = get_cOptions<C.performFind>().index,
  nth = rawIndex ? rawIndex === "other" ? absRepeat + 1 : rawIndex === "count" ? absRepeat
            : rawIndex >= 0 ? -1 - (0 | <number> <number | string> rawIndex) : 0 : 0,
  leave = !!nth || !get_cOptions<C.performFind>().active
  let sentFindCSS: CmdOptions[kFgCmd.findMode]["f"] = null
  if (!(sender.flags_ & Frames.Flags.hasFindCSS)) {
    sender.flags_ |= Frames.Flags.hasFindCSS
    sentFindCSS = findCSS_
  }
  sendFgCmd(kFgCmd.findMode, true, {
    c: nth > 0 ? cRepeat / absRepeat : cRepeat, l: leave, f: sentFindCSS,
    fallback: get_cOptions<C.performFind, true>().fallback,
    $f: get_cOptions<C.performFind, true>().$f,
    m: !!get_cOptions<C.performFind>().highlight, n: !!get_cOptions<C.performFind>().normalize,
    r: get_cOptions<C.performFind>().returnToViewport === true,
    s: !nth && absRepeat < 2 && !!get_cOptions<C.performFind>().selected,
    p: !!get_cOptions<C.performFind>().postOnEsc,
    q: leave || get_cOptions<C.performFind>().last ? FindModeHistory_.query_(sender.incognito_, "", nth < 0 ? -nth : nth) : ""
  })
}

export const initHelp = (request: FgReq[kFgReq.initHelp], port: Port): void => {
  const kHD = "helpDialog";
  Promise.all(As_<readonly [Promise<BaseHelpDialog>, unknown]>([
    BgUtils_.require_("HelpDialog"),
    (kHD in settings.cache_) || new Promise<void>((resolve): void => {
      settings.fetchFile_(kHD, (text) => { settings.set_(kHD, text); resolve() })
    })
  ])).then((args): void => {
    const port2 = request.w && indexFrame(port.s.tabId_, 0) || port,
    isOptionsPage = port2.s.url_.startsWith(settings.CONST_.OptionsPage_),
    options = request.a || {};
    (port2 as Frames.Port).s.flags_ |= Frames.Flags.hadHelpDialog
    set_cPort(port2)
    sendFgCmd(kFgCmd.showHelpDialog, true, {
      h: args[0].render_(isOptionsPage),
      o: settings.CONST_.OptionsPage_,
      e: !!options.exitOnClick,
      c: settings.get_("showAdvancedCommands", true) || isOptionsPage && settings.temp_.cmdErrors_ !== 0
    })
  }, Build.NDEBUG ? Build.MinCVer < BrowserVer.Min$Promise$$Then$Accepts$null && Build.BTypes & BrowserType.Chrome
      ? undefined : null as never : (args): void => {
    console.error("Promises for initHelp failed:", args[0], ";", args[1])
  })
}

export const showVomnibar = (forceInner?: boolean): void | kBgCmd.showVomnibar => {
  let port = cPort as Port | null
  let optUrl: VomnibarNS.GlobalOptions["url"] | UnknownValue = get_cOptions<C.showVomnibar>().url
  if (optUrl != null && optUrl !== true && typeof optUrl !== "string") {
    optUrl = null
    delete get_cOptions<C.showVomnibar, true>().url
  }
  if (!port) {
    port = indexFrame(TabRecency_.curTab_, 0)
    set_cPort(port)
    if (!port) { return }
    // not go to the top frame here, so that a current frame can suppress keys for a while
  }
  const page = settings.cache_.vomnibarPage_f, { url_: url } = port.s, preferWeb = !page.startsWith(BrowserProtocol_),
  isCurOnExt = url.startsWith(BrowserProtocol_),
  inner = forceInner || !page.startsWith(location.origin) ? settings.CONST_.VomnibarPageInner_ : page
  forceInner = forceInner ? forceInner
    : preferWeb ? isCurOnExt || page.startsWith("file:") && !url.startsWith("file:///")
      // it has occurred since Chrome 50 (BrowserVer.Min$tabs$$executeScript$hasFrameIdArg)
      // that HTTPS refusing HTTP iframes.
      || page.startsWith("http:") && !(<RegExpOne> /^http:/).test(url)
          && !(<RegExpOne>/^http:\/\/localhost[:/]/i).test(page)
    : port.s.incognito_ || isCurOnExt && !page.startsWith(url.slice(0, url.indexOf("/", url.indexOf("://") + 3) + 1))
  const useInner: boolean = forceInner || page === inner || port.s.tabId_ < 0,
  _trailingSlash0 = get_cOptions<C.showVomnibar>().trailingSlash,
  _trailingSlash1 = get_cOptions<C.showVomnibar>().trailing_slash,
  trailingSlash: boolean | null | undefined = _trailingSlash0 != null ? !!_trailingSlash0
      : _trailingSlash1 != null ? !!_trailingSlash1 : null,
  options: CmdOptions[kFgCmd.vomnibar] & SafeObject & KnownOptions<C.showVomnibar> = BgUtils_.extendIf_(
      BgUtils_.safer_<CmdOptions[kFgCmd.vomnibar]>({
    v: useInner ? inner : page,
    i: useInner ? null : inner,
    t: useInner ? VomnibarNS.PageType.inner : preferWeb ? VomnibarNS.PageType.web : VomnibarNS.PageType.ext,
    s: trailingSlash,
    j: useInner ? "" : settings.CONST_.VomnibarScript_f_,
    e: !!(get_cOptions<C.showVomnibar>()).exitOnClick,
    d: parseSedOptions_(get_cOptions<C.showVomnibar, true>()),
    k: getSecret()
  }), get_cOptions<C.showVomnibar, true>())
  if (options.mode === "bookmark") {
    options.mode = "bookm"
  }
  portSendFgCmd(port, kFgCmd.vomnibar, true, options, cRepeat)
  options.k = -1
  set_cOptions(options) // safe on renaming
}

export const enterVisualMode = (): void | kBgCmd.visualMode => {
  if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)) {
    complainLimits("control selection on MS Edge")
    return
  }
  const _rawMode = get_cOptions<C.visualMode>().mode
  const str = typeof _rawMode === "string" ? _rawMode.toLowerCase() : ""
  const sender = cPort.s
  let sentFindCSS: CmdOptions[kFgCmd.visualMode]["f"] = null
  let words = "", keyMap: CmdOptions[kFgCmd.visualMode]["k"] = null
  let granularities: CmdOptions[kFgCmd.visualMode]["g"] = null
  if (~sender.flags_ & Frames.Flags.hadVisualMode) {
    if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
        || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
      words = visualWordsRe_
    }
    if (!(sender.flags_ & Frames.Flags.hasFindCSS)) {
      sender.flags_ |= Frames.Flags.hasFindCSS
      sentFindCSS = findCSS_
    }
    keyMap = visualKeys_
    granularities = visualGranularities_
    sender.flags_ |= Frames.Flags.hadVisualMode
  }
  sendFgCmd(kFgCmd.visualMode, true, {
    m: str === "caret" ? VisualModeNS.Mode.Caret : str === "line" ? VisualModeNS.Mode.Line : VisualModeNS.Mode.Visual,
    fallback: get_cOptions<C.visualMode, true>().fallback,
    $f: get_cOptions<C.visualMode, true>().$f,
    f: sentFindCSS, g: granularities, k: keyMap,
    t: !!get_cOptions<C.visualMode>().richText, s: !!get_cOptions<C.visualMode>().start, w: words
  })
}

let _tempBlob: [number, string] | null | undefined

export const captureTab = (tabs?: [Tab]): void | kBgCmd.captureTab => {
  const show = get_cOptions<C.captureTab>().show,
  jpeg = Math.min(Math.max(get_cOptions<C.captureTab, true>().jpeg! | 0, 0), 100)
  const cb = (url?: string): void => {
    if (!url) { return runtimeError_() }
    const onerror = (err: any | Event) => {
      console.log("captureTab: can not request a data: URL:", err)
    }
    const cb2 = (msg: Blob | string) => {
      if (typeof msg !== "string") { msg = URL.createObjectURL(msg) }
      if (msg.startsWith("blob:")) {
        if (_tempBlob) {
          clearTimeout(_tempBlob[0]), URL.revokeObjectURL(_tempBlob[1])
        }
        _tempBlob = [setTimeout((): void => {
          _tempBlob && URL.revokeObjectURL(_tempBlob[1]); _tempBlob = null
        }, !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox
            || show ? 5000 : 30000), msg]
      }
      if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox
          || show) {
        openImgReq({ o: "pixel=1&",
          u: msg, f: title, a: false, e: null, r: ReuseType.newFg
        }, cPort)
        return
      }
      const a = document.createElement("a")
      a.href = msg
      a.download = title
      a.target = "_blank"
      a.click()
    }
    if (url.startsWith("data:")) {
      if (Build.MinCVer >= BrowserVer.MinFetchExtensionFiles || !(Build.BTypes & BrowserType.Chrome)
          || CurCVer_ >= BrowserVer.MinFetchDataURL) {
        const p = fetch(url).then(r => r.blob()).then(cb2)
        if (!Build.NDEBUG) { p.catch(onerror) }
      } else {
        const req = new XMLHttpRequest() as BlobXHR
        req.responseType = "blob"
        if (!Build.NDEBUG) { req.onerror = onerror }
        req.onload = function (this: typeof req) { cb2(this.response) }
        req.open("GET", url, true)
        req.send()
      }
    } else {
      cb2(url)
    }
  }
  const tabId = tabs && tabs[0] ? tabs[0].id : TabRecency_.curTab_
  let title = tabs && tabs[0] ? tabs[0].title : ""
  title = get_cOptions<C.captureTab>().name === "title" || !title || tabId < 0 ? title || "" + tabId : tabId + "-" + title
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFormatOptionWhenCaptureTab
      && CurCVer_ < BrowserVer.MinFormatOptionWhenCaptureTab) {
    title += ".jpg"
    browserTabs.captureVisibleTab(cb)
  } else {
    title += jpeg > 0 ? ".jpg" : ".png"
    browserTabs.captureVisibleTab(jpeg > 0 ? {format: "jpeg", quality: jpeg} : {format: "png"}, cb)
  }
}

export const openImgReq = (req: FgReq[kFgReq.openImage], port?: Port): void => {
  let url = req.u
  if (!BgUtils_.safeParseURL_(url)) {
    set_cPort(port!)
    showHUD(trans_("invalidImg"))
    return
  }
  let prefix = settings.CONST_.ShowPage_ + "#!image "
  if (req.f) {
    prefix += "download=" + BgUtils_.encodeAsciiComponent(req.f) + "&"
  }
  if (req.a !== false) {
    prefix += "auto=once&"
  }
  req.o && (prefix += req.o)
  url = req.e ? substitute_(url, SedContext.paste, req.e) : url
  set_cOptions(BgUtils_.safer_<KnownOptions<C.openUrl>>({ opener: true, reuse: req.r }))
  // not use v:show for those from other extensions
  openUrlWithActions(typeof req.k !== "string"
        && (!url.startsWith(location.protocol) || url.startsWith(location.origin)) ? prefix + url
        : req.k ? BgUtils_.convertToUrl_(url, req.k, Urls.WorkType.ActAnyway) : url
      , Urls.WorkType.FakeType)
}

export const framesGoBack = (req: FgReq[kFgReq.framesGoBack], port: Port | null
    , curTab?: Pick<Tab, "id" | "url" | "pendingUrl" | "index">): void => {
  const hasTabsGoBack = Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
        && Build.MinCVer >= BrowserVer.Min$Tabs$$goBack
      || Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        && Build.MinFFVer >= FirefoxBrowserVer.Min$Tabs$$goBack
      || Build.BTypes & ~BrowserType.Edge
        && (!(Build.BTypes & BrowserType.Edge) || OnOther !== BrowserType.Edge)
        && browserTabs.goBack
  if (!hasTabsGoBack) {
    const url = curTab ? getTabUrl(curTab) : (port!.s.frameId_ ? framesForTab.get(port!.s.tabId_)!.top_! : port!).s.url_
    if (!url.startsWith(BrowserProtocol_)
        || !!(Build.BTypes & BrowserType.Firefox)
            && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
            && url.startsWith(location.origin)) {
      /* empty */
    } else {
      set_cPort(port!) /* Port | null -> Port */
      showHUD(trans_("noTabHistory"))
      return
    }
  }
  const execGoBack = (tab: Pick<Tab, "id">, goStep: number): void => {
    browserTabs.executeScript(tab.id, {
      code: `history.go(${goStep})`,
      runAt: "document_start"
    }, runtimeError_)
  }
  const tabID = curTab ? curTab.id : port!.s.tabId_
  const count = req.s, reuse = parseReuse(req.r || ReuseType.current)
  if (reuse) {
    const position = req.p
    browserTabs.duplicate(tabID, (tab): void => {
      if (!tab) { return runtimeError_() }
      if (reuse === ReuseType.newBg) {
        selectTab(tabID)
      }
      if (!hasTabsGoBack) {
        execGoBack(tab, count)
      } else {
        framesGoBack({ s: count, r: ReuseType.current }, null, tab)
      }
      const newTabIdx = tab.index--
      const wantedIdx = position === "end" ? 3e4 : newTabIndex(tab, position)
      if (wantedIdx != null && wantedIdx !== newTabIdx) {
        browserTabs.move(tab.id, { index: wantedIdx }, runtimeError_)
      }
    })
  } else {
    const jump = count > 0 ? browserTabs.goForward : browserTabs.goBack
    if (hasTabsGoBack || jump) {
      for (let i = 0, end = count > 0 ? count : -count; i < end; i++) {
        jump!(tabID, runtimeError_)
      }
    } else {
      execGoBack(curTab!, count)
    }
  }
}

export const mainFrame = (): void | kBgCmd.mainFrame => {
  const tabId = cPort ? cPort.s.tabId_ : TabRecency_.curTab_, ref = framesForTab.get(tabId),
  port = ref && ref.top_
  port && focusFrame(port, true, port === ref!.cur_ ? FrameMaskType.OnlySelf : FrameMaskType.ForcedSelf)
}

export const setOmniStyle = (req: FgReq[kFgReq.setOmniStyle], port?: Port): void => {
  let styles: string, curStyles = omniPayload.s
  if (!req.o && settings.temp_.omniStyleOverridden_) {
    return
  }
  {
    let toggled = ` ${req.t} `, extSt = curStyles && ` ${curStyles} `, exists = extSt.includes(toggled),
    newExist = req.e != null ? req.e : exists
    styles = newExist ? exists ? curStyles : curStyles + toggled : extSt.replace(toggled, " ")
    styles = styles.trim().replace(BgUtils_.spacesRe_, " ")
    if (req.b === false) { omniPayload.s = styles; return }
    if (req.o) {
      settings.temp_.omniStyleOverridden_ = newExist !==
          (` ${settings.cache_.vomnibarOptions.styles} `.includes(toggled))
    }
  }
  if (styles === curStyles) { return }
  omniPayload.s = styles
  const request2: Req.bg<kBgReq.omni_updateOptions> = { N: kBgReq.omni_updateOptions, d: { s: styles } }
  for (const frame of framesForOmni) {
    frame !== port && frame.postMessage(request2)
  }
}

export const toggleZoom = (): void | kBgCmd.toggleZoom => {
  if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
      || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox && !browserTabs.getZoom) {
    complainLimits("control zoom settings of tabs")
    return
  }
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Tabs$$setZoom
      && CurCVer_ < BrowserVer.Min$Tabs$$setZoom) {
    showHUD(`Vimium C can not control zoom settings before Chrome ${BrowserVer.Min$Tabs$$setZoom}`)
    return
  }
  browserTabs.getZoom(curZoom => {
    if (!curZoom) { return runtimeError_() }
    cRepeat < -4 && set_cRepeat(-cRepeat)
    let newZoom: number, level = +get_cOptions<kBgCmd.toggleZoom, true>().level!, M = Math
    if (level) {
      newZoom = 1 + level * cRepeat
      newZoom = !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? M.max(0.3, M.min(newZoom, 3)) : M.max(0.25, M.min(newZoom, 5))
    } else if (cRepeat > 4) {
      newZoom = cRepeat / (cRepeat > 1000 ? cRepeat : cRepeat > 49 ? 100 : 10)
      newZoom = !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? M.max(0.3, M.min(newZoom, 3)) : M.max(0.25, M.min(newZoom, 5))
    } else {
      let nearest = 0, delta = 9,
      steps = !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? [0.3, 0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.2, 1.33, 1.5, 1.7, 2, 2.4, 3]
          : [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]
      for (let ind = 0, d2 = 0; ind < steps.length && (d2 = Math.abs(steps[ind] - curZoom)) < delta; ind++) {
        nearest = ind, delta = d2
      }
      newZoom = steps[nearest + cRepeat < 0 ? 0 : M.min(nearest + cRepeat, steps.length - 1)]
    }
    if (Math.abs(newZoom - curZoom) > 0.005) {
      browserTabs.setZoom(newZoom)
    }
  })
}

export const framesGoNext = (isNext: boolean, rel: string): void => {
  let rawPatterns = get_cOptions<C.goNext>().patterns, patterns = rawPatterns, useDefaultPatterns = false
  if (!patterns || !(patterns instanceof Array)) {
    patterns = patterns && typeof patterns === "string" ? patterns
        : (useDefaultPatterns = true, isNext ? settings.cache_.nextPatterns : settings.cache_.previousPatterns)
    patterns = patterns.split(",")
  }
  if (useDefaultPatterns || !get_cOptions<C.goNext>().$n) {
    let p2: string[] = []
    for (let i of patterns) {
      i = i && (i + "").trim()
      i && p2.push(GlobalConsts.SelectorPrefixesInPatterns.includes(i[0]) ? i : i.toLowerCase())
      if (p2.length === GlobalConsts.MaxNumberOfNextPatterns) { break }
    }
    patterns = p2
    if (!useDefaultPatterns) {
      get_cOptions<C.goNext, true>().patterns = patterns
      get_cOptions<C.goNext, true>().$n = 1
    }
  }
  const maxLens: number[] = patterns.map(i => Math.max(i.length + 12, i.length * 4)),
  totalMaxLen: number = Math.max.apply(Math, maxLens)
  sendFgCmd(kFgCmd.goNext, true, {
    r: get_cOptions<C.goNext>().noRel ? "" : rel, n: isNext,
    exclude: (get_cOptions<C.goNext, true>() as CSSOptions).exclude,
    match: get_cOptions<C.goNext, true>().match,
    evenIf: get_cOptions<C.goNext, true>().evenIf,
    p: patterns, l: maxLens, m: totalMaxLen > 0 && totalMaxLen < 99 ? totalMaxLen : 32,
    fallback: get_cOptions<C.goNext, true>().fallback,
    $f: get_cOptions<C.goNext, true>().$f
  })
}

/** `confirm()` simulator section */

export let gOnConfirmCallback: ((force1: boolean, arg?: FakeArg) => void) | null | undefined
let _gCmdTimer = 0

export function set_gOnConfirmCallback (_newGocc: typeof gOnConfirmCallback) { gOnConfirmCallback = _newGocc }

/** 0=cancel, 1=force1, count=accept */
export const confirm_ = <T extends kCName, force extends BOOL = 0> (
    command: CmdNameIds[T] extends kBgCmd ? T : force extends 1 ? kCName : never
    , count: number, callback?: (_arg?: FakeArg) => void): number | void => {
  if (!(Build.NDEBUG || !command.includes("."))) {
    console.log("Assert error: command should has no limit on repeats: %c%s", "color:red", command)
  }
  let msg = trans_("cmdConfirm", [count, trans_(command)])
  if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
    if (cPort) {
      gOnConfirmCallback = onConfirmWrapper.bind(0, get_cOptions() as any, cRepeat, cPort, callback!)
      setupSingletonCmdTimer(setTimeout(onConfirm, 3000, 0));
      (indexFrame(cPort.s.tabId_, 0) || cPort).postMessage({
        N: kBgReq.count, c: "", i: _gCmdTimer, m: msg
      })
    } else {
      gOnConfirmCallback = null // clear old commands
    }
    return
  }
  const now = Date.now(), result = window.confirm(msg)
  return Math.abs(Date.now() - now) > 9 ? result ? count : 0
      : (Build.NDEBUG || console.log("A confirmation dialog may fail in showing."), 1)
}

const onConfirmWrapper = (bakOptions: SafeObject, count: number, port: Port
    , callback: (arg?: FakeArg) => void, force1?: boolean) => {
  force1 || set_cKey(kKeyCode.None)
  set_cOptions(bakOptions)
  set_cRepeat(force1 ? count > 0 ? 1 : -1 : count)
  set_cPort(port)
  callback()
}

export const onConfirm = (response: FgReq[kFgReq.cmd]["r"]): void => {
  const callback = gOnConfirmCallback
  gOnConfirmCallback = null
  if (response > 1 && callback) {
    set_cNeedConfirm(0)
    callback(response < 3)
    set_cNeedConfirm(1)
  }
}

export const setupSingletonCmdTimer = (newTimer: number): void => {
  _gCmdTimer && clearTimeout(_gCmdTimer)
  _gCmdTimer = newTimer
}

export const onConfirmResponse = (request: FgReq[kFgReq.cmd], port: Port): void => {
  const cmd = request.c as StandardShortcutNames, id = request.i
  if (id >= -1 && _gCmdTimer !== id) { return } // an old / aborted / test message
  setupSingletonCmdTimer(0)
  if (request.r) {
    onConfirm(request.r)
    return
  }
  executeCommand(shortcutRegistry_!.get(cmd)!, request.n, kKeyCode.None, port, 0)
}

export const executeShortcut = (shortcutName: StandardShortcutNames, ref: Frames.Frames | null | undefined): void => {
  setupSingletonCmdTimer(0)
  if (ref) {
    let port = ref.cur_
    setupSingletonCmdTimer(setTimeout(executeShortcut, 100, shortcutName, null))
    port.postMessage({ N: kBgReq.count, c: shortcutName, i: _gCmdTimer, m: "" })
    if (!(port.s.flags_ & Frames.Flags.hasCSS || ref.flags_ & Frames.Flags.userActed)) {
      reqH_[kFgReq.exitGrab]({}, port)
    }
    ref.flags_ |= Frames.Flags.userActed
    return
  }
  let registry = shortcutRegistry_!.get(shortcutName)!, cmdName = registry.command_,
  cmdFallback: keyof BgCmdOptions = 0
  if (cmdName === "goBack" || cmdName === "goForward") {
    if (Build.BTypes & ~BrowserType.Edge
        && (!(Build.BTypes & BrowserType.Edge) || OnOther !== BrowserType.Edge)
        && browserTabs.goBack) {
      cmdFallback = kBgCmd.goBackFallback
    }
  } else if (cmdName === "autoOpen") {
    cmdFallback = kBgCmd.autoOpenFallback
  }
  if (cmdFallback) {
    /** this object shape should keep the same as the one in {@link key_mappings.ts#makeCommand_} */
    registry = <CommandsNS.Item> As_<CommandsNS.ValidItem>({
      alias_: cmdFallback, background_: 1, command_: cmdName, help_: null,
      options_: registry.options_, repeat_: registry.repeat_
    })
  }
  if (!registry.background_) {
    return
  }
  if (registry.alias_ > kBgCmd.MAX_NEED_CPORT || registry.alias_ < kBgCmd.MIN_NEED_CPORT) {
    executeCommand(registry, 1, kKeyCode.None, null as never as Port, 0)
  } else {
    let opts = normalizedOptions_(registry)
    if (!opts || !opts.$noWarn) {
      let rawOpts: CommandsNS.Options = (registry as Writable<typeof registry>).options_ = BgUtils_.safeObj_<any>()
      opts && BgUtils_.extendIf_(rawOpts, opts)
      rawOpts.$noWarn = true
      console.log("Error: Command", cmdName, "must run on pages which are not privileged")
    }
  }
}

declare const enum EnvMatchResult { abort, nextEnv, matched }
interface CurrentEnvCache {
  element_?: Element
  portUrl_?: string
}

const matchEnvRule = (rule: CommandsNS.EnvItem, cur: CurrentEnvCache
      , info?: FgReq[kFgReq.respondForRunKey]): EnvMatchResult => {
    let elSelector = rule.element, host = rule.host, fullscreen = rule.fullscreen
    if (elSelector || fullscreen != null) {
      if (!info) {
        cPort && safePost(cPort, { N: kBgReq.queryForRunKey, n: performance.now() })
        return EnvMatchResult.abort
      }
      if (!elSelector) { /* empty */ }
      else if ((<RegExpOne> /^[A-Za-z][-\w]+$/).test(elSelector)) {
        if (info.t !== elSelector) { return EnvMatchResult.nextEnv }
      } else {
        if (!cur.element_) {
          const activeEl = document.createElement(info.t)
          activeEl.className = info.c
          activeEl.id = info.i
          cur.element_ = activeEl
        }
        if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Element$$matches
            && CurCVer_ < BrowserVer.Min$Element$$matches ? !cur.element_.webkitMatchesSelector!(info.t)
            : !cur.element_.matches!(info.t)) { return EnvMatchResult.nextEnv }
      }
      if (fullscreen != null) {
        if (!!fullscreen !== !info.f) {
          return EnvMatchResult.nextEnv
        }
      }
    }
    if (host) {
      if (!cPort) { return EnvMatchResult.abort }
      if (typeof host === "string") {
        host = rule.host = Exclusions.createSimpleUrlMatcher_(host)
      }
      if (host) {
        let portUrl = cur.portUrl_
        if (!portUrl) {
          portUrl = cPort.s.url_
          if (cPort.s.frameId_ && portUrl.lastIndexOf("://", 5) < 0 && !BgUtils_.protocolRe_.test(portUrl)) {
            const frames = framesForTab.get(cPort.s.tabId_)
            portUrl = frames && frames.top_ ? frames.top_.s.url_ : portUrl
          }
          cur.portUrl_ = portUrl
        }
        if (Exclusions.matchSimply_(host, portUrl)) {
          return EnvMatchResult.nextEnv
        }
      }
    }
    return EnvMatchResult.matched
}

export const runKeyWithCond = (info?: FgReq[kFgReq.respondForRunKey]): void => {
  let expected_rules = get_cOptions<kBgCmd.runKey>().expect
  const absCRepeat = Math.abs(cRepeat)
  const curEnvCache: CurrentEnvCache = {}
  let matchedIndex: number | string = -1
  let matchedRule: KnownOptions<kBgCmd.runKey> | CommandsNS.EnvItem | CommandsNS.EnvItemWithKeys
      = get_cOptions<kBgCmd.runKey, true>()
  let keys: string | string[] | null | undefined
  const frames = framesForTab.get(cPort ? cPort.s.tabId_ : TabRecency_.curTab_)
  if (!cPort) {
    set_cPort(frames ? frames.cur_ : null)
  }
  frames && (frames.flags_ |= Frames.Flags.userActed)
  for (let i = 0, size = expected_rules instanceof Array ? expected_rules.length : 0
        ; i < size; i++) {
    let rule: CommandsNS.EnvItem | "__not_parsed__" | CommandsNS.EnvItemWithKeys | null | undefined
        = (expected_rules as CommandsNS.EnvItemWithKeys[])[i]
    const ruleName = (rule as CommandsNS.EnvItemWithKeys).env
    if (ruleName) {
      if (!envRegistry_) {
        showHUD('No environments have been declared')
        return
      }
      rule = envRegistry_.get(ruleName)
      if (!rule) {
        showHUD(`No environment named "${ruleName}"`)
        return
      }
      if (typeof rule === "string") {
        rule = parseOptions_(rule) as CommandsNS.EnvItem
        envRegistry_.set(ruleName, rule)
      }
    }
    const res = matchEnvRule(rule, curEnvCache, info)
    if (res === EnvMatchResult.abort) { return }
    if (res === EnvMatchResult.matched) {
      matchedIndex = ruleName || i
      matchedRule = rule
      if (ruleName) {
        keys = (expected_rules as CommandsNS.EnvItemWithKeys[])[i].keys
      }
      break
    }
  }
  if (typeof expected_rules === "string" && (<RegExpOne> /^[^{].*?[:=]/).test(expected_rules)) {
    expected_rules = expected_rules.split(<RegExpG> /[,\s]+/g).map((i): string[] => i.split(<RegExpOne> /[:=]/)
        ).reduce((obj, i): SafeDict<string> => {
      if (i.length === 2 && i[0] !== "__proto__" && (<RegExpOne> /^[\x21-\x7f]+$/).test(i[1])) {
        obj[i[0]] = i[1]
      }
      return obj
    }, BgUtils_.safeObj_<string>())
    get_cOptions<kBgCmd.runKey, true>().expect = expected_rules
  }
  if (matchedIndex === -1 && expected_rules
      && typeof expected_rules === "object" && !(expected_rules instanceof Array)) {
    BgUtils_.safer_(expected_rules)
    if (!envRegistry_) {
      showHUD('No environments have been declared')
      return
    }
    for (let ruleName in expected_rules) {
      let rule = envRegistry_.get(ruleName)
      if (!rule) {
        showHUD(`No environment named "${ruleName}"`)
        return
      }
      if (typeof rule === "string") {
        rule = parseOptions_(rule) as CommandsNS.EnvItem
        envRegistry_.set(ruleName, rule)
      }
      const res = matchEnvRule(rule, curEnvCache, info)
      if (res === EnvMatchResult.abort) { return }
      if (res === EnvMatchResult.matched) {
        matchedIndex = ruleName
        matchedRule = rule
        keys = (expected_rules as Exclude<BgCmdOptions[kBgCmd.runKey]["expect"] & object, unknown[]>)[ruleName]
        break
      }
    }
  }
  keys = keys || (matchedRule as KnownOptions<kBgCmd.runKey> | CommandsNS.EnvItemWithKeys).keys
  if (typeof keys === "string") {
    keys = keys.trim().split(BgUtils_.spacesRe_);
    if (typeof matchedIndex === "number") {
      (matchedRule as KnownOptions<kBgCmd.runKey> | CommandsNS.EnvItemWithKeys).keys = keys
    } else {
      (expected_rules as Dict<string | string[]>)[matchedIndex] = keys
    }
  }
  let key: string
  const sub_name = typeof matchedIndex === "number" && matchedIndex >= 0 ? `[${matchedIndex + 1}] ` : ""
  if (!(keys instanceof Array)) {
    showHUD(sub_name + "Require keys: space-seperated-string | string[]")
    return
  } else if (absCRepeat > keys.length && keys.length !== 1) {
    showHUD(sub_name + 'Has no such a key')
    return
  } else if (key = keys[keys.length === 1 ? 0 : absCRepeat - 1], typeof key !== "string" || !key) {
    showHUD(sub_name + 'The key is invalid')
  }
  if (key) {
    let count = 1, arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
    if (arr != null) {
      let prefix = arr[0]
      key = key.slice(prefix.length)
      count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
    }
    let registryEntry = Build.BTypes & BrowserType.Chrome
        && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol && key === "__proto__" ? null
        : CommandsData_.keyToCommandRegistry_.get(key)
    if (!registryEntry) {
      showHUD(`the "${key}" has not been mapped`)
    } else if (registryEntry.alias_ === kBgCmd.runKey && registryEntry.background_) {
      showHUD('"runKey" can not be nested')
    } else {
      BgUtils_.resetRe_()
      count = keys.length === 1 ? count * cRepeat : absCRepeat !== cRepeat ? -count : count
      const specialOptions = matchedRule.options
      if (specialOptions || !expected_rules && Object.keys(get_cOptions<C.runKey>()).length > 1) {
        const originalOptions = normalizedOptions_(registryEntry)
        registryEntry = BgUtils_.extendIf_(BgUtils_.safeObj_<{}>(), registryEntry)
        let newOptions: CommandsNS.Options & KnownOptions<kBgCmd.runKey> = BgUtils_.safeObj_<{}>()
        BgUtils_.extendIf_(newOptions, specialOptions || get_cOptions<C.runKey>())
        specialOptions || delete newOptions.keys
        if (originalOptions) {
          BgUtils_.extendIf_(newOptions, originalOptions);
        }
        (registryEntry as Writable<typeof registryEntry>).options_ = newOptions
      }
      executeCommand(registryEntry, count, cKey, cPort, 0)
    }
  }
}
