import {
  cPort, cRepeat, get_cOptions, set_cPort, set_cOptions, set_cRepeat, framesForTab_, findCSS_, cKey, reqH_, runOnTee_,
  curTabId_, settingsCache_, OnChrome, visualWordsRe_, CurCVer_, OnEdge, OnFirefox, substitute_, CONST_, set_runOnTee_,
  curWndId_, vomnibarPage_f, vomnibarBgOptions_, replaceTeeTask_, blank_, offscreenPort_, teeTask_,
  curIncognito_, OnOther_, keyToCommandMap_, Origin2_, CurFFVer_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, downloadFile, getTabUrl, runtimeError_, selectTab, R_, Q_, browser_, getCurWnd, makeWindow, Windows_,
  executeScript_, getFindCSS_cr_
} from "./browser"
import { convertToUrl_, createSearchUrl_, normalizeSVG_ } from "./normalize_urls"
import {
  showHUD, complainLimits, ensureInnerCSS, getParentFrame, getPortUrl_, safePost, getCurFrames_, getFrames_,
  waitForPorts_, postTeeTask_, resetOffscreenPort_
} from "./ports"
import { createSimpleUrlMatcher_, matchSimply_ } from "./exclusions"
import { trans_ } from "./i18n"
import { keyMappingErrors_, normalizedOptions_, visualGranularities_, visualKeys_ } from "./key_mappings"
import {
  wrapFallbackOptions, copyCmdOptions, parseFallbackOptions, portSendFgCmd, sendFgCmd, replaceCmdOptions, runNextCmdBy,
  overrideOption, runNextCmd, hasFallbackOptions, getRunNextCmdBy, kRunOn, overrideCmdOptions, initHelpDialog
} from "./run_commands"
import { parseReuse, newTabIndex, openUrlWithActions } from "./open_urls"
import { FindModeHistory_ } from "./tools"
import C = kBgCmd

const DEBUG_OFFSCREEN: BOOL | boolean = false
let _lastOffscreenWndId = 0
let _offscreenFailed = false
let _offscreenLoading = false

set_runOnTee_(((task, serializable, data): Promise<boolean | string> => {
  if (Build.MV3 && task === kTeeTask.Paste && OnChrome && serializable >= 0) {
    return navigator.permissions!.query({ name: "clipboard-read" }).catch(blank_)
        .then((res) => !!res && res.state !== "denied" && runOnTee_(kTeeTask.Paste, -1 - <number> serializable, null))
  }
  const useOffscreen = !!Build.MV3 && !_offscreenFailed && OnChrome && (Build.MinCVer >= BrowserVer.MinOffscreenAPIs
        || CurCVer_ > BrowserVer.MinOffscreenAPIs - 1)
      && (task !== kTeeTask.CopyImage && task !== kTeeTask.DrawAndCopy)
  const frames = useOffscreen ? null : framesForTab_.get(curTabId_) || cPort && getCurFrames_()
  let port = useOffscreen ? null : frames ? frames.cur_ : cPort as typeof cPort | null
  if (frames && frames.top_ && port !== frames.top_ && !(frames.top_.s.flags_ & Frames.Flags.ResReleased)
      // here can not check `!port!.s.url_.startsWith(location.protocol)` - such an ext iframe is limited by default
      && (!BgUtils_.protocolRe_.test(frames.top_.s.url_) || port!.s.flags_ & Frames.Flags.ResReleased
          || !port!.s.url_.startsWith((BgUtils_.safeParseURL_(frames.top_.s.url_)?.origin || "") + "/"))) {
    port = frames.top_
  }
  const id = setTimeout((): void => {
    const latest = replaceTeeTask_(id, null)
    latest && latest.r && latest.r(false)
  }, 40_000)
  const deferred = BgUtils_.deferPromise_<boolean | string>()
  replaceTeeTask_(null, { i: id, t: task, s: serializable, d: Build.MV3 ? null : data, r: deferred.resolve_ })
  if (useOffscreen) {
    if (offscreenPort_) {
      try {
        if (!Build.NDEBUG && DEBUG_OFFSCREEN) {
          Windows_.update(_lastOffscreenWndId, { focused: true }, (): void => {
            postTeeTask_(offscreenPort_!, teeTask_!)
          })
        } else {
          postTeeTask_(offscreenPort_, teeTask_!)
        }
      } catch {
        resetOffscreenPort_()
      }
    }
    if (offscreenPort_) { /* empty */ }
    else if (!Build.NDEBUG && DEBUG_OFFSCREEN) {
      Windows_.create({ url: CONST_.OffscreenFrame_ }, (wnd): void => { _lastOffscreenWndId = wnd.id })
    } else if (!_offscreenLoading) {
      const all_reasons = browser_.offscreen.Reason
      const reasons: chrome.offscreen.kReason[] = [all_reasons.BLOBS, all_reasons.CLIPBOARD, all_reasons.MATCH_MEDIA
          ].filter(<T> (i: T | undefined): i is T => !!i)
      _offscreenLoading = true
      browser_.offscreen.createDocument({
        reasons: reasons.length > 0 ? reasons : ["CLIPBOARD"], url: CONST_.OffscreenFrame_,
        justification: "read and write system clipboard",
      }, (): void => {
        const err = runtimeError_()
        _offscreenLoading = false
        if (err) {
          _offscreenFailed = true
          resetOffscreenPort_()
          return err
        }
      })
    }
  } else if (port) {
    const allow = task === kTeeTask.CopyImage || task === kTeeTask.Copy || task === kTeeTask.DrawAndCopy
        || Build.MV3 && task === kTeeTask.Paste ? "clipboard-write; clipboard-read" : ""
    portSendFgCmd(port, kFgCmd.callTee, 1, { u: CONST_.TeeFrame_, c: "R TEE UI", a: allow, t: 3000,
        i: frames && port !== frames.cur_ && !(frames.cur_.s.flags_ & Frames.Flags.ResReleased)
            ? frames.cur_.s.frameId_ : 0 }, 1)
  } else {
    let promise = deferred.promise_
    getCurWnd(false, (curWnd): void => {
      const lastWndId = curWnd ? curWnd.id : curWndId_
      makeWindow({ type: "popup", url: CONST_.TeeFrame_, focused: true, incognito: false
          , left: 0, top: 0, width: 100, height: 32  }, "", (wnd): void => {
        const teeTask = wnd ? null : replaceTeeTask_(null, null)
        if (wnd) {
          const newWndId = wnd.id
          void promise.then((): void => {
            lastWndId !== curWndId_ && Windows_.update(lastWndId, { focused: true }, runtimeError_)
            Windows_.remove(newWndId, runtimeError_)
          })
          promise = null as never
        } else if (teeTask && teeTask.i === id) {
          clearTimeout(teeTask.i)
          teeTask.r && teeTask.r(false)
        }
      })
    })
  }
  return deferred.promise_
}) satisfies typeof runOnTee_)

export const nextFrame = (): void | kBgCmd.nextFrame => {
  let port = cPort, ind = -1
  const ref = getCurFrames_(), ports = ref && ref.ports_
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
  msg = OnChrome && Build.MinCVer < BrowserVer.MinWithFrameId && CurCVer_ < BrowserVer.MinWithFrameId
    ? `Vimium C can not know parent frame before Chrome ${BrowserVer.MinWithFrameId}`
    : !(sender.tabId_ >= 0 && getFrames_(cPort)) ? "Vimium C can not access frames in current tab" : null
  msg && showHUD(msg)
  void getParentFrame(sender.tabId_, sender.frameId_, cRepeat).then(port => {
    port ? focusFrame(port, true, FrameMaskType.ForcedSelf) : mainFrame()
  })
}

export const performFind = (): void | kBgCmd.performFind => {
  const sender = cPort.s, absRepeat = cRepeat < 0 ? -cRepeat : cRepeat, rawIndex = get_cOptions<C.performFind>().index,
  nth = rawIndex ? rawIndex === "other" ? absRepeat + 1 : rawIndex === "count" ? absRepeat
            : rawIndex >= 0 ? -1 - (0 | <number> <number | string> rawIndex) : 0 : 0,
  highlight = get_cOptions<C.performFind>().highlight, extend = get_cOptions<C.performFind>().extend,
  direction = extend === "before" || get_cOptions<C.performFind>().direction === "before" ? -1 : 1,
  leave = !!nth || !get_cOptions<C.performFind>().active
  let sentFindCSS: CmdOptions[kFgCmd.findMode]["f"] = null
  if (!(sender.flags_ & Frames.Flags.hasFindCSS)) {
    sender.flags_ |= Frames.Flags.hasFindCSS
    sentFindCSS = OnChrome ? getFindCSS_cr_!(sender) : findCSS_
  }
  sendFgCmd(kFgCmd.findMode, true, wrapFallbackOptions<kFgCmd.findMode, C.performFind>({
    c: nth > 0 ? cRepeat / absRepeat : cRepeat, l: leave ? 1 : 0, f: sentFindCSS,
    d: direction,
    m: typeof highlight === "number" ? highlight >= 1 ? Math.min(highlight | 0, 200) : 0
        : highlight ? leave ? 100 : 20 : 0,
    n: !!get_cOptions<C.performFind>().normalize,
    r: get_cOptions<C.performFind>().returnToViewport === true,
    s: !nth && absRepeat < 2 && !!get_cOptions<C.performFind>().selected,
    t: extend ? direction > 0 ? 2 : 1 : 0,
    p: !!get_cOptions<C.performFind>().postOnEsc,
    e: !!get_cOptions<C.performFind>().restart,
    u: OnChrome ? !!get_cOptions<C.performFind>().scroll && get_cOptions<C.performFind>().scroll !== "auto" : 0,
    q: get_cOptions<C.performFind>().query ? get_cOptions<C.performFind>().query + ""
      : leave || get_cOptions<C.performFind>().last
      ? FindModeHistory_.query_(sender.incognito_, "", nth < 0 ? -nth : nth) : ""
  }))
}

export const initHelp = (request: FgReq[kFgReq.initHelp], port: Port): Promise<void> => {
  return initHelpDialog().then((helpDialog): void => {
    if (!helpDialog) { return }
    const port2 = request.w && getFrames_(port)?.top_ || port,
    isOptionsPage = port2.s.url_.startsWith(CONST_.OptionsPage_)
    let options = request.a || {};
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (port2.s as Frames.Sender).flags_ |= Frames.Flags.hadHelpDialog
    set_cPort(port2)
    if (request.f) {
      let cmdRegistry = keyToCommandMap_.get("?")
      let matched = cmdRegistry && cmdRegistry.alias_ === kBgCmd.showHelp && cmdRegistry.background_ ? "?" : ""
      matched || keyToCommandMap_.forEach((item, key): void => {
        if (item.alias_ === kBgCmd.showHelp && item.background_) {
          matched = matched && matched.length < key.length ? matched : (cmdRegistry = item, key)
        }
      })
      options = matched && normalizedOptions_(cmdRegistry!) as KnownOptions<C.showHelp> | null || options
    }
    sendFgCmd(kFgCmd.showHelpDialog, true, {
      h: helpDialog.render_(isOptionsPage, options.commandNames),
      o: CONST_.OptionsPage_, f: request.f,
      e: !!options.exitOnClick,
      c: isOptionsPage && !!keyMappingErrors_ || settingsCache_.showAdvancedCommands
    })
  })
}

export const showVomnibar = (forceInner?: boolean): void => {
  let port = cPort as Port | null
  let optUrl: VomnibarNS.GlobalOptions["url"] | UnknownValue = get_cOptions<C.showVomnibar>().url
  if (optUrl != null && optUrl !== true && typeof optUrl !== "string") {
    optUrl = null
    delete get_cOptions<C.showVomnibar, true>().url
  }
  if (!port) {
    port = getCurFrames_()?.top_ || null
    if (!port) { return }
    set_cPort(port)
    // not go to the top frame here, so that a current frame can suppress keys for a while
  }
  let defaultUrl: string | null = null
  if (optUrl != null && get_cOptions<C.showVomnibar>().urlSedKeys) {
    const res = typeof optUrl === "string" ? optUrl : typeof get_cOptions<C.showVomnibar>().u === "string"
        ? get_cOptions<C.showVomnibar, true>().u! : getPortUrl_()
    if (res && res instanceof Promise) {
      void res.then((url): void => {
        overrideCmdOptions<C.showVomnibar>({ u: url || "" }, true)
        showVomnibar(forceInner)
      })
      return
    }
    const exOut: InfoOnSed = {}
    defaultUrl = substitute_(res, SedContext.NONE, {r: null, k: get_cOptions<C.showVomnibar,true>().urlSedKeys!}, exOut)
    exOut.keyword_ != null && overrideCmdOptions<C.openUrl>({ keyword: exOut.keyword_ })
  }
  if (get_cOptions<C.showVomnibar>().mode === "bookmark") { overrideOption<C.showVomnibar, "mode">("mode", "bookm") }
  const page = vomnibarPage_f, { url_: url } = port.s,
  preferWeb = !page.startsWith(CONST_.BrowserProtocol_),
  isCurOnExt = url.startsWith(CONST_.BrowserProtocol_),
  inner = forceInner || !page.startsWith(Origin2_) ? CONST_.VomnibarPageInner_ : page
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
  options: CmdOptions[kFgCmd.vomnibar] & SafeObject & KnownOptions<C.showVomnibar> = copyCmdOptions(
      BgUtils_.safer_<CmdOptions[kFgCmd.vomnibar]>({
    v: useInner ? inner : page,
    i: useInner ? null : inner,
    t: useInner ? VomnibarNS.PageType.inner : preferWeb ? VomnibarNS.PageType.web : VomnibarNS.PageType.ext,
    s: trailingSlash,
    j: useInner ? "" : CONST_.VomnibarScript_f_,
    e: !!(get_cOptions<C.showVomnibar>()).exitOnClick,
    u: defaultUrl,
    url: typeof optUrl === "string" ? defaultUrl || optUrl : optUrl,
    k: BgUtils_.getOmniSecret_(true),
    h: vomnibarBgOptions_.maxBoxHeight_,
  }), get_cOptions<C.showVomnibar, true>()) as CmdOptions[kFgCmd.vomnibar] & SafeObject
  if (options.icase == null) {
    if (vomnibarBgOptions_.actions.includes("icase")) { options.icase = true }
  }
  if ((OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinCssMinMax && CurFFVer_ < FirefoxBrowserVer.MinCssMinMax
        || OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinCssMinMax && CurCVer_ < BrowserVer.MinCssMinMax)) {
    options.m = vomnibarBgOptions_.maxWidthInPixel_![0]
    options.x = vomnibarBgOptions_.maxWidthInPixel_![1]
  }
  portSendFgCmd(port, kFgCmd.vomnibar, true, options, cRepeat)
  options.k = "omni"
  set_cOptions(options) // safe on renaming
}

export const findContentPort_ = (port: Port, type: KnownOptions<kBgCmd.marksActivate>["type"], local: boolean
    ): PromiseOr<Port> => {
  const rawId = port.s.tabId_, tabId = rawId >= 0 ? rawId : curTabId_
  const ref = port.s.frameId_ || rawId < 0 ? framesForTab_.get(tabId) : null
  if (ref) {
    if (rawId < 0 && (port.s.flags_ & Frames.Flags.aboutIframe || port.s.url_.startsWith("about:"))) { port = ref.cur_ }
    if (type === "tab" || !type && !local && rawId < 0) {
      (ref.top_ || rawId < 0) && (port = ref.top_ || ref.cur_)
    }
    if (port.s.flags_ & Frames.Flags.aboutIframe || port.s.url_.startsWith("blob:")) {
      return getParentFrame(tabId, port.s.frameId_, 1).then((port2): Port => {
        return port2 || ref.top_ || ref.cur_
      })
    }
  }
  return port
}

export const marksActivate_ = (): void | kBgCmd.marksActivate => {
  let mode = get_cOptions<C.marksActivate>().mode, count = cRepeat < 2 || cRepeat > 10 ? 1 : cRepeat
  const action = mode && (mode + "").toLowerCase() === "create" ? kMarkAction.create : kMarkAction.goto
  const key = get_cOptions<C.marksActivate>().key
  const options: CmdOptions[kFgCmd.marks] = {
    a: action, n: !get_cOptions<C.marksActivate>().storeCount, s: get_cOptions<C.marksActivate>().swap !== true,
    t: "", o: get_cOptions<C.marksActivate, true>() as OpenPageUrlOptions & Req.FallbackOptions
  }
  if (typeof key === "string" && key.trim().length === 1) {
    options.a = kMarkAction.goto
    reqH_[kFgReq.marks]({ H: kFgReq.marks, c: options, k: cKey, n: key.trim(), s: 0, u: ""
        , l: !!get_cOptions<C.marksActivate>().local } satisfies Req.fg<kFgReq.marks> as FgReq[kFgReq.marks], cPort)
    return
  }
  void Promise.resolve(trans_(action === kMarkAction.create ? "mBeginCreate" : "mBeginGoto")).then((title): void => {
    options.t = title
    portSendFgCmd(cPort, kFgCmd.marks, true, options, count)
  })
}

export const enterVisualMode = (): void | kBgCmd.visualMode => {
  if (OnEdge) {
    complainLimits("control selection on MS Edge")
    return
  }
  const _rawMode = get_cOptions<C.visualMode>().mode
  const start = get_cOptions<C.visualMode>().start
  const str = typeof _rawMode === "string" ? _rawMode.toLowerCase() : ""
  const sender = cPort.s
  let sentFindCSS: CmdOptions[kFgCmd.visualMode]["f"] = null
  let words = "", keyMap: CmdOptions[kFgCmd.visualMode]["k"] = null
  let granularities: CmdOptions[kFgCmd.visualMode]["g"] = null
  if (~sender.flags_ & Frames.Flags.hadVisualMode) {
    if (OnFirefox && !Build.NativeWordMoveOnFirefox
            && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
      words = visualWordsRe_
    }
    if (!(sender.flags_ & Frames.Flags.hasFindCSS)) {
      sender.flags_ |= Frames.Flags.hasFindCSS
      sentFindCSS = OnChrome ? getFindCSS_cr_!(sender) : findCSS_
    }
    keyMap = visualKeys_
    granularities = visualGranularities_
    sender.flags_ |= Frames.Flags.hadVisualMode
  }
  const opts2 = BgUtils_.extendIf_<CmdOptions[kFgCmd.visualMode], KnownOptions<kBgCmd.visualMode>>({
    m: str === "caret" ? VisualModeNS.Mode.Caret : str === "line" ? VisualModeNS.Mode.Line : VisualModeNS.Mode.Visual,
    f: sentFindCSS, g: granularities, k: keyMap,
    t: !!get_cOptions<C.visualMode>().richText, s: start != null ? !!start : null, w: words
  }, get_cOptions<C.visualMode, true>())
  delete opts2.mode
  delete opts2.start
  delete opts2.richText
  sendFgCmd(kFgCmd.visualMode, true, opts2)
}

let _tempBlob_mv2: [number, string] | null | undefined

const revokeBlobUrl_mv2 = Build.MV3 ? 0 as never : (url: string): void => { try { URL.revokeObjectURL(url) } catch {} }

export const handleImageUrl = (url: `data:${string}` | "", buffer: Blob | null
    , actions: kTeeTask.CopyImage | kTeeTask.ShowImage | kTeeTask.Download | kTeeTask.DrawAndCopy
    , resolve: (ok: BOOL | boolean) => void
    , title: string, text: string, doShow?: ((url: string) => void) | null, inGroup?: boolean): void => {
  if (!actions) { resolve(1); return }
  const copyFromBlobUrl_mv2 = !Build.MV3 && !!(actions & kTeeTask.CopyImage)
      && curIncognito_ !== IncognitoType.true && (!cPort || !cPort.s.incognito_)
      && (!OnFirefox || actions === kTeeTask.DrawAndCopy && !inGroup)
  const needBlob_mv2 = !Build.MV3 && (actions & kTeeTask.Download || copyFromBlobUrl_mv2)
  if (!Build.MV3 && needBlob_mv2 && !buffer) {
    const p = BgUtils_.fetchFile_(url as "data:", "blob")
    Build.NDEBUG || p.catch((err: any | Event): void => { console.log("handleImageUrl can't request `data:` :", err) })
    void p.then((buffer2): void => {
      handleImageUrl(url, buffer2, actions, resolve, title, text, doShow, inGroup)
    })
    return
  }
  if (!Build.MV3 && _tempBlob_mv2) {
    clearTimeout(_tempBlob_mv2[0]), revokeBlobUrl_mv2(_tempBlob_mv2[1])
    _tempBlob_mv2 = null
  }
  const blobRef_mv2 = !Build.MV3 && needBlob_mv2 ? URL.createObjectURL(buffer) : ""
  if (!Build.MV3 && blobRef_mv2) {
    _tempBlob_mv2 = [setTimeout((): void => {
      _tempBlob_mv2 && revokeBlobUrl_mv2(_tempBlob_mv2[1]); _tempBlob_mv2 = null
    }, actions & kTeeTask.Download ? 30000 : 5000), blobRef_mv2]
    const outResolve = resolve
    resolve = ! [kTeeTask.CopyImage, kTeeTask.Download, kTeeTask.DrawAndCopy].includes(actions) ? outResolve
        : (ok: BOOL | boolean) => {
      outResolve(ok)
      _tempBlob_mv2 && revokeBlobUrl_mv2(blobRef_mv2)
      _tempBlob_mv2 && _tempBlob_mv2[1] === blobRef_mv2 && (clearTimeout(_tempBlob_mv2[0]), _tempBlob_mv2 = null)
    }
  }
  if (actions & kTeeTask.CopyImage) {
    if (OnFirefox && actions !== kTeeTask.DrawAndCopy) {
      const bufType = (url ? url.slice(5, 15) : buffer!.type).toLowerCase() === "image/jpeg" ? "jpeg" : "png"
      void (buffer ? buffer.arrayBuffer() : BgUtils_.fetchFile_(url as "data:", "arraybuffer"))
          .then((buf): void => {
        browser_.clipboard.setImageData(buf, bufType).then((): void => {
          resolve(true)
        }, (err): void => { console.log("Error when copying image: " + err); resolve(0) })
      })
    } else {
      // on Chrome 103, a tee.html in an incognito tab can not access `blob:` URLs
      type Result = BOOL | boolean | string;
      void (OnEdge || OnChrome
          && Build.MinCVer < BrowserVer.MinEnsured$Clipboard$$write$and$ClipboardItem
          && CurCVer_ < BrowserVer.MinEnsured$Clipboard$$write$and$ClipboardItem ? Promise.resolve(false)
      : (url || !Build.MV3 && copyFromBlobUrl_mv2 ? Promise.resolve()
          : BgUtils_.convertToDataURL_(buffer!).then((u2): void => { url = u2 }))
      .then((): Promise<Result> => {
        return runOnTee_(actions === kTeeTask.DrawAndCopy ? kTeeTask.DrawAndCopy : kTeeTask.CopyImage, {
          u: !Build.MV3 && copyFromBlobUrl_mv2 ? blobRef_mv2 : url, t: text,
          b: Build.BTypes && !(Build.BTypes & (Build.BTypes - 1)) ? Build.BTypes as number : OnOther_
        }, buffer!)
      }))
      .then(async (ok): Promise<void> => {
        if (OnFirefox && typeof ok === "string") {
          handleImageUrl(ok as "data:", null, kTeeTask.CopyImage, resolve, title, text)
          return
        }
        if (Build.MV3 || ok) { resolve(!!ok); return }
        const doc = (globalThis as MaybeWithWindow).document!
        const img = doc.createElement("img")
        img.alt = title.replace(BgUtils_.getImageExtRe_(), "")
        img.src = url || await BgUtils_.convertToDataURL_(buffer!)
        doc.documentElement!.appendChild(img)
        const sel = doc.getSelection(), range = doc.createRange()
        range.selectNode(img)
        sel.removeAllRanges()
        sel.addRange(range)
        doc.execCommand("copy")
        img.remove()
        resolve(1)
      })
    }
  }
  if (actions & kTeeTask.ShowImage) {
    doShow!(Build.MV3 ? url : url || blobRef_mv2)
    actions & kTeeTask.CopyImage || resolve(1)
    return
  }
  if (actions & kTeeTask.Download) {
    const port = getCurFrames_()?.top_ || cPort
    const p2 = BgUtils_.deferPromise_<unknown>()
    if (actions & kTeeTask.CopyImage && !(OnFirefox && actions !== kTeeTask.DrawAndCopy)) {
      setTimeout(p2.resolve_, 800)
    } else {
      p2.resolve_(0)
    }
    p2.promise_.then(() => downloadFile(blobRef_mv2, title, port ? port.s.url_ : null)).then((succeed): void => {
      const clickAnchor_cr = (): void => {
        const a = (globalThis as MaybeWithWindow).document!.createElement("a")
        a.href = blobRef_mv2
        a.download = title
        a.target = "_blank"
        a.click()
      }
      succeed ? 0 : Build.MV3 || OnFirefox ? doShow!(Build.MV3 ? url : url || blobRef_mv2) : clickAnchor_cr()
      actions === kTeeTask.Download && resolve(true)
    })
  }
}

export const captureTab = (tabs: [Tab] | undefined, resolve: OnCmdResolved): void | kBgCmd.captureTab => {
  const show = get_cOptions<C.captureTab>().show, copy = !!get_cOptions<C.captureTab>().copy,
  rawDownload = get_cOptions<C.captureTab>().download, download = copy ? rawDownload === true : rawDownload !== false,
  png = !!get_cOptions<C.captureTab>().png, richText = !!get_cOptions<C.captureTab>().richText
  let jpeg = png ? 0 : Math.min(Math.max(get_cOptions<C.captureTab, true>().jpeg! | 0, 0), 100)
  const cb = (url?: string): void => {
    if (!url) {
      cPort && showHUD("Can not capture " + (isExt ? "injected extensions" : "this tab"))
      resolve(0); return runtimeError_()
    }
    const actions = (show ? kTeeTask.ShowImage : 0) | (download ? kTeeTask.Download : 0)
        | (copy ? kTeeTask.CopyImage : 0)
    const doShow = (url: string): void => {
      reqH_[kFgReq.openImage]({ t: "pixel=1&", u: url, f: title, a: false, m: HintMode.OPEN_IMAGE, o: {
        r: get_cOptions<C.captureTab, true>().reuse, m: get_cOptions<C.captureTab, true>().replace,
        p: get_cOptions<C.captureTab, true>().position, w: get_cOptions<C.captureTab, true>().window
      } }, cPort)
      return
    }
    handleImageUrl(url as "data:", null, actions, copy ? (ok): void => {
      showHUD(trans_(ok ? "imgCopied" : "failCopyingImg", [ok === 1 ? "HTML" : jpeg ? "JPEG" : "PNG"]))
      resolve(ok)
    } : resolve, title, ((richText || "") + "").includes("name") ? title : "", doShow)
  }
  const tab = tabs && tabs[0], isExt = !!tab && tab.url.startsWith(location.protocol)
  const tabId = tab ? tab.id : curTabId_, wndId = tab ? tab.windowId : curWndId_
  let title = tab ? tab.title : "Tab" + tabId
  title = get_cOptions<C.captureTab>().name === "title" ? title
      : BgUtils_.now().replace(<RegExpG & RegExpSearchable<0>> /[-: ]/g, s => s === " " ? "_" : "") + "-" + title
  title = title.replace(BgUtils_.getImageExtRe_(), "")
  if (OnChrome && Build.MinCVer < BrowserVer.MinFormatOptionWhenCaptureTab
      && CurCVer_ < BrowserVer.MinFormatOptionWhenCaptureTab) {
    title += ".jpg"
    jpeg = 100
    Tabs_.captureVisibleTab(wndId, cb)
  } else {
    title += jpeg > 0 ? ".jpg" : ".png"
    Tabs_.captureVisibleTab(wndId, jpeg > 0 ? {format: "jpeg", quality: jpeg} : {format: "png"}, cb)
  }
}

export const openImgReq = (req: FgReq[kFgReq.openImage], port?: Port): void => {
  let url = req.u
  if ((<RegExpI> /^<svg[\s>]/i).test(url)) {
    url = normalizeSVG_(url)
    if (!url) {
      set_cPort(port!)
      showHUD(trans_("invalidImg"))
      return
    }
    req.f = req.f || "SVG Image"
  }
  if (!BgUtils_.safeParseURL_(url)) {
    set_cPort(port!)
    showHUD(trans_("invalidImg"))
    return
  }
  let prefix = CONST_.ShowPage_ + "#!image "
  if (req.f) { prefix += "download=" + BgUtils_.encodeAsciiComponent_(req.f) + "&" }
  if (req.r) { prefix += "src=" + BgUtils_.encodeAsciiComponent_(req.r) + "&" }
  if (req.a !== false) { prefix += "auto=once&" }
  req.t && (prefix += req.t)
  const opts2: ParsedOpenPageUrlOptions = req.o || BgUtils_.safeObj_() as {}
  const exOut: InfoOnSed = {}, urlAfterSed = opts2.s ? substitute_(url, SedContext.paste, opts2.s, exOut) : url
  const keyword = exOut.keyword_ ?? (OnFirefox && req.m === HintMode.DOWNLOAD_MEDIA ? "" : opts2.k)
  const testUrl = opts2.t ?? !keyword
  const hasSed = urlAfterSed !== url
  const reuse = opts2.r != null ? opts2.r : req.m & HintMode.queue ? ReuseType.newBg : ReuseType.newFg
  url = urlAfterSed
  // no group during openImg
  replaceCmdOptions<C.openUrl>({
    opener: true, reuse, replace: opts2.m, position: opts2.p, window: opts2.w
  })
  set_cRepeat(1)
  const urlToOpen = !keyword && !hasSed ? url : testUrl ? convertToUrl_(url, keyword, Urls.WorkType.ActAnyway)
        : createSearchUrl_(url.trim().split(BgUtils_.spacesRe_), keyword, Urls.WorkType.ActAnyway)
  port && safePost(port, {
    N: kBgReq.showHUD, H: ensureInnerCSS(cPort.s), k: kTip.raw, t: " ", d: 0.0001
  })
  // not use v:show for those from other extensions
  openUrlWithActions(typeof urlToOpen === "string" && testUrl
      && (!urlToOpen.startsWith(location.protocol) || urlToOpen.startsWith(Origin2_)) ? prefix + urlToOpen
      : urlToOpen, Urls.WorkType.FakeType)
}

export const framesGoBack = (req: FgReq[kFgReq.framesGoBack], port: Port | null, curTab?: Tab): void => {
  const hasTabsGoBack: boolean = OnChrome && Build.MinCVer >= BrowserVer.Min$tabs$$goBack
      || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.Min$tabs$$goBack
      || !OnEdge && !!Tabs_.goBack
  if (!hasTabsGoBack) {
    const url = curTab ? getTabUrl(curTab) : (port!.s.frameId_ ? getFrames_(port!)!.top_! : port!).s.url_
    if (!url.startsWith(CONST_.BrowserProtocol_) || OnFirefox && url.startsWith(Origin2_)) {
      /* empty */
    } else {
      set_cPort(port!) /* Port | null -> Port */
      showHUD(trans_("noTabHistory"))
      runNextCmd<C.goBackFallback>(0)
      return
    }
  }
  const onApiCallback = !hasFallbackOptions(req.o) ? runtimeError_
      : (replaceCmdOptions(req.o) , getRunNextCmdBy(kRunOn.otherCb))
  const execGoBack = (tab: Pick<Tab, "id">, goStep: number): void => {
    executeScript_<[step: number]>(tab.id, 0, null, (step): void => { history.go(step) }, [goStep])
  }
  const tabID = curTab ? curTab.id : port!.s.tabId_
  const count = req.s, reuse = parseReuse(req.o.reuse || ReuseType.current)
  if (reuse) {
    const position = req.o.position
    Tabs_.duplicate(tabID, (tab): void => {
      if (!tab) { return onApiCallback() }
      if (reuse === ReuseType.newBg) {
        selectTab(tabID)
      }
      if (!hasTabsGoBack) {
        execGoBack(tab, count)
      } else {
        const opts: FgReq[kFgReq.framesGoBack]["o"] = parseFallbackOptions(req.o) || {}
        opts.reuse = ReuseType.current
        framesGoBack({ s: count, o: opts }, null, tab)
      }
      const newTabIdx = tab.index--
      const wantedIdx = position === "end" ? -1 : newTabIndex(tab, position, false, true)
      if (wantedIdx != null && wantedIdx !== newTabIdx) {
        Tabs_.move(tab.id, { index: wantedIdx === 3e4 ? -1 : wantedIdx }, runtimeError_)
      }
    })
  } else {
    const jump = count > 0 ? Tabs_.goForward : Tabs_.goBack
    if (hasTabsGoBack || jump) {
      for (let i = 0, end = count > 0 ? count : -count; i < end; i++) {
        jump!(tabID, i ? runtimeError_ : onApiCallback)
      }
    } else {
      execGoBack(curTab!, count)
    }
  }
}

export const mainFrame = (): void | kBgCmd.mainFrame => {
  const ref = getCurFrames_(), port = ref && ref.top_
  if (!port || port === ref.cur_ && get_cOptions<C.mainFrame>().$else
      && typeof get_cOptions<C.mainFrame>().$else === "string") {
    runNextCmd<C.mainFrame>(0)
  } else {
    focusFrame(port, true, port === ref.cur_ ? FrameMaskType.OnlySelf : FrameMaskType.ForcedSelf)
  }
}

export const toggleZoom = (resolve: OnCmdResolved): void | kBgCmd.toggleZoom => {
  if (OnEdge || OnFirefox && Build.MayAndroidOnFirefox && !Tabs_.getZoom) {
    complainLimits("control zoom settings of tabs")
    resolve(0)
    return
  }
  if (OnChrome && Build.MinCVer < BrowserVer.Min$Tabs$$setZoom && CurCVer_ < BrowserVer.Min$Tabs$$setZoom) {
    showHUD(`Vimium C can not control zoom settings before Chrome ${BrowserVer.Min$Tabs$$setZoom}`)
    resolve(0)
    return
  }
  void Q_(Tabs_.getZoom).then((curZoom): void => {
    if (!curZoom) { resolve(0); return }
    let absCount = cRepeat < -4 ? -cRepeat : cRepeat
    if (get_cOptions<kBgCmd.toggleZoom, true>().in || get_cOptions<kBgCmd.toggleZoom, true>().out) {
      absCount = 0
      set_cRepeat(get_cOptions<kBgCmd.toggleZoom, true>().in ? cRepeat : -cRepeat)
    }
    let newZoom: number, level = get_cOptions<kBgCmd.toggleZoom, true>().level, M = Math
    if (get_cOptions<kBgCmd.toggleZoom, true>().reset) {
      newZoom = 1
    } else if (level != null && !isNaN(+level) || absCount > 4) {
      const min = M.max(0.1, M.min((get_cOptions<kBgCmd.toggleZoom, true>().min! | 0) || (OnFirefox ? 0.3 : 0.25), 0.9))
      const max = M.max(1.1, M.min((get_cOptions<kBgCmd.toggleZoom, true>().min! | 0) || (OnFirefox ? 3 : 5), 100))
      newZoom = level != null && !isNaN(+level) ? 1 + level * cRepeat
          : absCount > 1000 ? 1 : absCount / (absCount > 49 ? 100 : 10)
      newZoom = M.max(min, M.min(newZoom, max))
    } else {
      let nearest = 0, delta = 9,
      steps = OnFirefox
          ? [0.3, 0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.2, 1.33, 1.5, 1.7, 2, 2.4, 3]
          : [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]
      for (let ind = 0, d2 = 0; ind < steps.length && (d2 = Math.abs(steps[ind] - curZoom)) < delta; ind++) {
        nearest = ind, delta = d2
      }
      newZoom = steps[nearest + cRepeat < 0 ? 0 : M.min(nearest + cRepeat, steps.length - 1)]
    }
    if (Math.abs(newZoom - curZoom) > 0.005) {
      Tabs_.setZoom(newZoom, R_(resolve))
    } else {
      resolve(0)
    }
  })
}

export const framesGoNext = (isNext: boolean, rel: string): void => {
  let rawPatterns = get_cOptions<C.goNext>().patterns, patterns = rawPatterns, useDefaultPatterns = false
  if (!patterns || !(patterns instanceof Array)) {
    patterns = patterns && typeof patterns === "string" ? patterns
        : (useDefaultPatterns = true, isNext ? settingsCache_.nextPatterns : settingsCache_.previousPatterns)
    patterns = patterns.split(",")
  }
  if (useDefaultPatterns || !get_cOptions<C.goNext>().$fmt) {
    let p2: string[] = []
    for (let i of patterns) {
      i = i && (i + "").trim()
      i && p2.push(GlobalConsts.SelectorPrefixesInPatterns.includes(i[0]) ? i : i.toLowerCase())
      if (p2.length === GlobalConsts.MaxNumberOfNextPatterns) { break }
    }
    patterns = p2
    if (!useDefaultPatterns) {
      overrideOption<C.goNext, "patterns">("patterns", patterns)
      overrideOption<C.goNext, "$fmt">("$fmt", 1)
    }
  }
  const maxLens: number[] = patterns.map(i => Math.max(i.length + 12, i.length * 4)),
  totalMaxLen: number = Math.max.apply(Math, maxLens)
  sendFgCmd(kFgCmd.goNext, true, wrapFallbackOptions<kFgCmd.goNext, C.goNext>({
    r: get_cOptions<C.goNext>().noRel ? "" : rel, n: isNext,
    match: get_cOptions<C.goNext, true>().match,
    clickable: (get_cOptions<C.goNext, true>() as CSSOptions).clickable,
    clickableOnHost: (get_cOptions<C.goNext, true>() as CSSOptions).clickableOnHost,
    exclude: (get_cOptions<C.goNext, true>() as CSSOptions).exclude,
    excludeOnHost: (get_cOptions<C.goNext, true>() as CSSOptions).excludeOnHost,
    evenIf: get_cOptions<C.goNext, true>().evenIf,
    scroll: get_cOptions<C.goNext, true>().scroll,
    p: patterns, l: maxLens, m: totalMaxLen > 0 && totalMaxLen < 99 ? totalMaxLen : 32,
    v: get_cOptions<C.goNext, true>().view !== false,
    a: !!get_cOptions<C.goNext, true>().avoidClick,
  }))
}

export const focusFrame = (port: Port, css: boolean, mask: FrameMaskType, noFallback?: 1): void => {
  port.postMessage({ N: kBgReq.focusFrame, H: css ? ensureInnerCSS(port.s) : null, m: mask, k: cKey, c: 0,
    f: !noFallback && get_cOptions<C.nextFrame>() && parseFallbackOptions(get_cOptions<C.nextFrame, true>()) || {}
  })
}

export const getBlurOption_ = (): MoveTabOptions["blur"] | null | undefined =>
    get_cOptions<C.goToTab, true>().blur ?? get_cOptions<C.goToTab, true>().grabFocus

export const blurInsertOnTabChange = (tab: Tab | undefined): void => {
  let fallback = parseFallbackOptions(get_cOptions<C.goToTab, true>())
  if (fallback && fallback.$then) {
    fallback.$else = fallback.$then
  } else {
    fallback = null
  }
  let blur = getBlurOption_()
  if (typeof blur === "string") {
    const parsed = createSimpleUrlMatcher_(blur) || false
    overrideOption<C.goToTab>(blur === get_cOptions<C.goToTab>().blur ? "blur" : "grabFocus", parsed)
    blur = parsed
  }
  const frames = tab ? framesForTab_.get(tab.id) : null
  if (runtimeError_() || !frames
      || blur && blur !== true && !matchSimply_(blur, frames.cur_.s.frameId_ ? frames.cur_.s.url_ : tab!.url)) {
    // use `.url_` directly: faster is better
    fallback && runNextCmdBy(1, fallback)
    return runtimeError_()
  }
  setTimeout((): void => {
    waitForPorts_(framesForTab_.get(curTabId_), true).then((): void => {
      const frames = framesForTab_.get(curTabId_)
      if (frames && !(frames.flags_ & Frames.Flags.ResReleased)) {
        const options = BgUtils_.safer_({ esc: true } as CmdOptions[kFgCmd.dispatchEventCmd])
        fallback && copyCmdOptions(options, BgUtils_.safer_(fallback))
        portSendFgCmd(frames.cur_, kFgCmd.dispatchEventCmd, false, options, -1)
      } else {
        fallback && runNextCmdBy(1, fallback)
      }
    })
  }, 17)
}
