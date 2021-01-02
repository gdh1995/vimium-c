import C = kBgCmd
import { browserTabs, browserWebNav, getTabUrl, runtimeError_, selectTab } from "./browser"
import {
  cPort, NoFrameId, cRepeat, get_cOptions, set_cPort, getSecret, set_cOptions, set_cRepeat, set_cNeedConfirm,
  executeCommand, reqH_, omniPayload, settings, findCSS_, visualWordsRe_, set_cKey
} from "./store"
import {
  framesForTab, indexFrame, portSendFgCmd, framesForOmni, focusFrame, sendFgCmd, showHUD, complainLimits
} from "./ports"
import { parseSedOptions_, substitute_ } from "./clipboard"
import { parseReuse, newTabIndex, openUrlWithActions } from "./open_urls"

export const nextFrame = (): void | kBgCmd.nextFrame => {
  let port = cPort, ind = -1
  const frames = framesForTab[port.s.t]
  if (frames && frames.length > 2) {
    ind = Math.max(0, frames.indexOf(port, 1))
    for (let count = Math.abs(cRepeat); count > 0; count--) {
      ind += cRepeat > 0 ? 1 : -1
      if (ind === frames.length) { ind = 1 }
      else if (ind < 1) { ind = frames.length - 1 }
    }
    port = frames[ind]
  }
  focusFrame(port, port.s.i === 0
    , port !== cPort && frames && port !== frames[0] ? FrameMaskType.NormalNext : FrameMaskType.OnlySelf)
}

export const parentFrame = (): void | kBgCmd.parentFrame => {
  const sender = cPort.s,
  msg = Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId
    ? `Vimium C can not know parent frame before Chrome ${BrowserVer.MinWithFrameId}`
    : !(sender.t >= 0 && framesForTab[sender.t]) ? "Vimium C can not access frames in current tab" : null
  msg && showHUD(msg)
  if (!sender.i
      || Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId
      || !browserWebNav()) {
    mainFrame()
    return
  }
  let self = sender.i, frameId = self, found: boolean, count = cRepeat
  browserWebNav()!.getAllFrames({ tabId: sender.t }, (frames): void => {
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
    const port = frameId > 0 && frameId !== self ? indexFrame(sender.t, frameId) : null
    port ? focusFrame(port, true, FrameMaskType.ForcedSelf) : mainFrame()
  })
}

export const performFind = (): void | kBgCmd.performFind => {
  const sender = cPort.s, absRepeat = cRepeat < 0 ? -cRepeat : cRepeat, rawIndex = get_cOptions<C.performFind>().index,
  nth = rawIndex ? rawIndex === "other" ? absRepeat + 1 : rawIndex === "count" ? absRepeat
            : rawIndex >= 0 ? -1 - (0 | <number> <number | string> rawIndex) : 0 : 0,
  leave = !!nth || !get_cOptions<C.performFind>().active
  let sentFindCSS: CmdOptions[kFgCmd.findMode]["f"] = null
  if (!(sender.f & Frames.Flags.hasFindCSS)) {
    sender.f |= Frames.Flags.hasFindCSS
    sentFindCSS = findCSS_
  }
  sendFgCmd(kFgCmd.findMode, true, {
    c: nth > 0 ? cRepeat / absRepeat : cRepeat, l: leave, f: sentFindCSS,
    m: !!get_cOptions<C.performFind>().highlight, n: !!get_cOptions<C.performFind>().normalize,
    r: get_cOptions<C.performFind>().returnToViewport === true,
    s: !nth && absRepeat < 2 && !!get_cOptions<C.performFind>().selected,
    p: !!get_cOptions<C.performFind>().postOnEsc,
    q: leave || get_cOptions<C.performFind>().last ? FindModeHistory_.query_(sender.a, "", nth < 0 ? -nth : nth) : ""
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
    const port2 = request.w && indexFrame(port.s.t, 0) || port,
    isOptionsPage = port2.s.u.startsWith(settings.CONST_.OptionsPage_),
    options = request.a || {};
    (port2 as Frames.Port).s.f |= Frames.Flags.hadHelpDialog
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
    port = indexFrame(TabRecency_.curTab_, 0)!
    set_cPort(port)
    if (!port) { return }
    // not go to the top frame here, so that a current frame can suppress keys for a while
  }
  const page = settings.cache_.vomnibarPage_f, { u: url } = port.s, preferWeb = !page.startsWith(BrowserProtocol_),
  isCurOnExt = url.startsWith(BrowserProtocol_),
  inner = forceInner || !page.startsWith(location.origin) ? settings.CONST_.VomnibarPageInner_ : page
  forceInner = forceInner ? forceInner
    : preferWeb ? isCurOnExt || page.startsWith("file:") && !url.startsWith("file:///")
      // it has occurred since Chrome 50 (BrowserVer.Min$tabs$$executeScript$hasFrameIdArg)
      // that HTTPS refusing HTTP iframes.
      || page.startsWith("http:") && !(<RegExpOne> /^http:/).test(url)
          && !(<RegExpOne>/^http:\/\/localhost[:/]/i).test(page)
    : port.s.a || isCurOnExt && !page.startsWith(url.slice(0, url.indexOf("/", url.indexOf("://") + 3) + 1))
  const useInner: boolean = forceInner || page === inner || port.s.t < 0,
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
  if (~sender.f & Frames.Flags.hadVisualMode) {
    if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
        || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
      words = visualWordsRe_
    }
    if (!(sender.f & Frames.Flags.hasFindCSS)) {
      sender.f |= Frames.Flags.hasFindCSS
      sentFindCSS = findCSS_
    }
    keyMap = CommandsData_.visualKeys_
    granularities = CommandsData_.visualGranularities_
    sender.f |= Frames.Flags.hadVisualMode
  }
  sendFgCmd(kFgCmd.visualMode, true, {
    m: str === "caret" ? VisualModeNS.Mode.Caret : str === "line" ? VisualModeNS.Mode.Line : VisualModeNS.Mode.Visual,
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
        }, 60000), msg]
      }
      if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox
          || show) {
        openImgReq({
          u: msg, f: title, a: false, e: null, r: ReuseType.newFg
        }, cPort)
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
        req.open("GET", url, true)
        req.responseType = "blob"
        if (!Build.NDEBUG) { req.onerror = onerror }
        req.onload = function (this: typeof req) { cb2(this.response) }
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
  url = req.e ? substitute_(url, SedContext.paste, req.e) : url
  set_cOptions(BgUtils_.safer_<KnownOptions<C.openUrl>>({ opener: true, reuse: req.r }))
  openUrlWithActions(typeof req.k !== "string" ? prefix + url
        : req.k ? BgUtils_.convertToUrl_(url, req.k, Urls.WorkType.ActAnyway) : url
      , Urls.WorkType.FakeType)
}

export const framesGoBack = (req: FgReq[kFgReq.framesGoBack], port: Port | null
    , curTab?: Pick<Tab, "id" | "url" | "pendingUrl" | "index">): void => {
  const tabID = Build.BTypes & BrowserType.Chrome && curTab ? curTab.id : port!.s.t,
  count = req.s, reuse = parseReuse(req.r || ReuseType.current)
  let needToExecCode: boolean = Build.BTypes & BrowserType.Chrome ? false : true
  if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.Min$Tabs$$goBack)
      && (!(Build.BTypes & BrowserType.Chrome)
          || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
          || CurCVer_ < BrowserVer.Min$Tabs$$goBack)) {
    // on old Chrome || on other browsers
    const url = Build.BTypes & BrowserType.Chrome && curTab ? getTabUrl(curTab)
        : (port!.s.i ? indexFrame(tabID, 0)! : port!).s.u
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
    if (Build.BTypes & BrowserType.Chrome) {
      needToExecCode = true
    }
  }
  const execGoBack = (tab: Pick<Tab, "id">, goStep: number): void => {
    browserTabs.executeScript(tab.id, {
      code: `history.go(${goStep})`,
      runAt: "document_start"
    }, runtimeError_)
  }
  if (!(Build.BTypes & BrowserType.Chrome) || reuse) {
    const position = req.p
    browserTabs.duplicate(tabID, (tab): void => {
      if (!tab) { return runtimeError_() }
      if (reuse === ReuseType.newBg) {
        selectTab(tabID)
      }
      if (!(Build.BTypes & BrowserType.Chrome)
          || (Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.Min$Tabs$$goBack)
              && needToExecCode) {
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
    // Chrome + reuse=0: must be from a shortcut or Chrome is new enough
    const jump = count > 0 ? browserTabs.goForward : browserTabs.goBack
    if (jump) {
      for (let i = 0, end = count > 0 ? count : -count; i < end; i++) {
        jump(tabID, runtimeError_)
      }
    } else {
      execGoBack(curTab!, count)
    }
  }
}

export const mainFrame = (): void | kBgCmd.mainFrame => {
  const tabId = cPort ? cPort.s.t : TabRecency_.curTab_, port = indexFrame(tabId, 0)
  port && focusFrame(port, true, framesForTab[tabId]![0] === port ? FrameMaskType.OnlySelf : FrameMaskType.ForcedSelf)
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
    let newZoom: number, M = Math
    if (cRepeat > 4) {
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
    match: get_cOptions<C.goNext, true>().match,
    p: patterns, l: maxLens, m: totalMaxLen > 0 && totalMaxLen < 99 ? totalMaxLen : 32
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
  if (Build.BTypes & ~BrowserType.Chrome) {
    if (cPort) {
      gOnConfirmCallback = onConfirmWrapper.bind(0, get_cOptions() as any, cRepeat, cPort, callback!)
      setupSingletonCmdTimer(setTimeout(onConfirm, 3000, 0));
      (indexFrame(cPort.s.t, 0) || cPort).postMessage({
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
  executeCommand(CommandsData_.shortcutRegistry_.get(cmd)!, request.n, kKeyCode.None, port, 0)
}

export const executeShortcut = (shortcutName: StandardShortcutNames, ports: Frames.Frames | null | undefined): void => {
  setupSingletonCmdTimer(0)
  if (ports) {
    let port = ports[0]
    setupSingletonCmdTimer(setTimeout(executeShortcut, 100, shortcutName, null))
    port.postMessage({ N: kBgReq.count, c: shortcutName, i: _gCmdTimer, m: "" })
    if (!(port.s.f & Frames.Flags.hasCSSAndActed)) {
      reqH_[kFgReq.exitGrab]({}, port)
    }
    port.s.f |= Frames.Flags.userActed
    return
  }
  let registry = CommandsData_.shortcutRegistry_.get(shortcutName)!, cmdName = registry.command_,
  cmdFallback: keyof BgCmdOptions = 0
  if (cmdName === "goBack" || cmdName === "goForward") {
    if (Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
      cmdFallback = kBgCmd.goBackFallback
    }
  } else if (cmdName === "autoOpen") {
    cmdFallback = kBgCmd.autoOpenFallback
  }
  if (cmdFallback) {
    /** this object shape should keep the same as the one in {@link key_mappings.ts#KeyMappings.makeCommand_} */
    registry = { alias_: cmdFallback, background_: 1, command_: cmdName, help_: null,
      options_: registry.options_, repeat_: registry.repeat_
    }
  }
  if (!registry.background_) {
    return
  }
  if (registry.alias_ > kBgCmd.MAX_NEED_CPORT || registry.alias_ < kBgCmd.MIN_NEED_CPORT) {
    executeCommand(registry, 1, kKeyCode.None, null as never as Port, 0)
  } else {
    let opts = registry.options_
    if (!opts || !opts.$noWarn) {
      let rawOpts = (registry as Writable<typeof registry>).options_ = BgUtils_.safeObj_<any>()
      opts && BgUtils_.extendIf_(rawOpts, opts)
      rawOpts.$noWarn = true
      console.log("Error: Command", cmdName, "must run on pages which are not privileged")
    }
  }
}
