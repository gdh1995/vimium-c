import {
  cPort, cRepeat, get_cOptions, set_cPort, set_cOptions, set_cRepeat, framesForTab_, findCSS_, cKey, reqH_, runOnTee_,
  curTabId_, settingsCache_, OnChrome, visualWordsRe_, CurCVer_, OnEdge, OnFirefox, substitute_, CONST_, set_runOnTee_,
  helpDialogData_, set_helpDialogData_, curWndId_, vomnibarPage_f, IsLimited, vomnibarBgOptions_, setTeeTask_, blank_,
  curIncognito_, OnOther_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, downloadFile, getTabUrl, runtimeError_, selectTab, R_, Q_, browser_, import2, getCurWnd, makeWindow, Windows_
} from "./browser"
import { convertToUrl_, createSearchUrl_, normalizeSVG_ } from "./normalize_urls"
import { showHUD, complainLimits, ensureInnerCSS, getParentFrame, getPortUrl_, safePost } from "./ports"
import { getFindCSS_cr_ } from "./ui_css"
import { getI18nJson, trans_ } from "./i18n"
import { keyMappingErrors_, visualGranularities_, visualKeys_ } from "./key_mappings"
import {
  wrapFallbackOptions, copyCmdOptions, parseFallbackOptions, portSendFgCmd, sendFgCmd, replaceCmdOptions,
  overrideOption, runNextCmd, hasFallbackOptions, getRunNextCmdBy, kRunOn, overrideCmdOptions
} from "./run_commands"
import { parseReuse, newTabIndex, openUrlWithActions } from "./open_urls"
import { FindModeHistory_ } from "./tools"
import C = kBgCmd

set_runOnTee_(As_<typeof runOnTee_>((task, serializable, data): Promise<boolean | string> => {
  const frames = framesForTab_.get(curTabId_) || cPort && framesForTab_.get(cPort.s.tabId_)
  const port = frames ? frames.cur_ : cPort as typeof cPort | null
  if (Build.MV3 && task === kTeeTask.Paste && OnChrome && !serializable) {
    return navigator.permissions!.query({ name: "clipboard-read" }).catch(blank_)
        .then((res) => !!res && res.state !== "denied" && runOnTee_(kTeeTask.Paste, true, null))
  }
  const id = setTimeout((): void => {
      const latest = setTeeTask_(id, null)
    latest && latest.r && latest.r(false)
  }, 40_000)
  const deferred = BgUtils_.deferPromise_<boolean | string>()
    setTeeTask_(null, { i: id, t: task, s: serializable, d: Build.MV3 ? null : data, r: deferred.resolve_ })
    const allow = !OnChrome ? ""
        : task === kTeeTask.CopyImage || task === kTeeTask.Copy || task === kTeeTask.DrawAndCopy
        ? "clipboard-write" : Build.MV3 && task === kTeeTask.Paste ? "clipboard-read" : ""
  if (port) {
    portSendFgCmd(port, kFgCmd.callTee, 1, { u: CONST_.TeeFrame_, c: "R TEE UI", a: allow, t: 3000 }, 1)
  } else {
    let promise = deferred.promise_
    getCurWnd(false, (curWnd): void => {
      const lastWndId = curWnd ? curWnd.id : curWndId_
      makeWindow({ type: "popup", url: CONST_.TeeFrame_, focused: true, incognito: false
          , left: 0, top: 0, width: 100, height: 32  }, "", (wnd): void => {
        const teeTask = wnd ? null : setTeeTask_(null, null)
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
}))

export const nextFrame = (): void | kBgCmd.nextFrame => {
  let port = cPort, ind = -1
  const ref = framesForTab_.get(port.s.tabId_), ports = ref && ref.ports_
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
    , port !== cPort && ref && port !== ref.cur_ ? FrameMaskType.NormalNext : FrameMaskType.OnlySelf
    , get_cOptions<C.nextFrame, true>())
}

export const parentFrame = (): void | kBgCmd.parentFrame => {
  const sender = cPort.s,
  msg = OnChrome && Build.MinCVer < BrowserVer.MinWithFrameId && CurCVer_ < BrowserVer.MinWithFrameId
    ? `Vimium C can not know parent frame before Chrome ${BrowserVer.MinWithFrameId}`
    : !(sender.tabId_ >= 0 && framesForTab_.get(sender.tabId_)) ? "Vimium C can not access frames in current tab" : null
  msg && showHUD(msg)
  void getParentFrame(sender.tabId_, sender.frameId_, cRepeat).then(port => {
    port ? focusFrame(port, true, FrameMaskType.ForcedSelf, get_cOptions<C.parentFrame, true>()) : mainFrame()
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
    sentFindCSS = OnChrome ? getFindCSS_cr_!(sender) : findCSS_
  }
  sendFgCmd(kFgCmd.findMode, true, wrapFallbackOptions<kFgCmd.findMode, C.performFind>({
    c: nth > 0 ? cRepeat / absRepeat : cRepeat, l: leave, f: sentFindCSS,
    m: !!get_cOptions<C.performFind>().highlight, n: !!get_cOptions<C.performFind>().normalize,
    r: get_cOptions<C.performFind>().returnToViewport === true,
    s: !nth && absRepeat < 2 && !!get_cOptions<C.performFind>().selected,
    p: !!get_cOptions<C.performFind>().postOnEsc,
    e: !!get_cOptions<C.performFind>().restart,
    q: get_cOptions<C.performFind>().query ? get_cOptions<C.performFind>().query + ""
      : leave || get_cOptions<C.performFind>().last
      ? FindModeHistory_.query_(sender.incognito_, "", nth < 0 ? -nth : nth) : ""
  }))
}

export const initHelp = (request: FgReq[kFgReq.initHelp], port: Port): Promise<void> => {
  const curHData = helpDialogData_ || []
  return Promise.all([
    import2<typeof import("./help_dialog")>(CONST_.HelpDialogJS),
    curHData[0] != null ? null : BgUtils_.fetchFile_("help_dialog.html"),
    curHData[1] != null ? null : getI18nJson("help_dialog")
  ]).then(([helpDialog, temp1, temp2]): void => {
    const port2 = request.w && framesForTab_.get(port.s.tabId_)?.top_ || port,
    isOptionsPage = port2.s.url_.startsWith(CONST_.OptionsPage_),
    options = request.a || {};
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (port2.s as Frames.Sender).flags_ |= Frames.Flags.hadHelpDialog
    set_cPort(port2)
    const newHData = helpDialogData_ || set_helpDialogData_([null, null])
    temp1 && (newHData[0] = temp1)
    temp2 && (newHData[1] = temp2)
    sendFgCmd(kFgCmd.showHelpDialog, true, {
      h: helpDialog.render_(isOptionsPage, options.commandNames),
      o: CONST_.OptionsPage_, f: request.f,
      e: !!options.exitOnClick,
      c: isOptionsPage && !!keyMappingErrors_ || settingsCache_.showAdvancedCommands
    })
  }, Build.NDEBUG ? OnChrome && Build.MinCVer < BrowserVer.Min$Promise$$Then$Accepts$null
      ? undefined : null as never : (args): void => {
    console.error("Promises for initHelp failed: %o ; %o", args[0], args[1])
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
    port = framesForTab_.get(curTabId_)?.top_ || null
    if (!port) { return }
    set_cPort(port)
    // not go to the top frame here, so that a current frame can suppress keys for a while
  }
  let defaultUrl: string | null = null
  if (optUrl != null && get_cOptions<C.showVomnibar>().urlSedKeys) {
    const res = typeof optUrl === "string" ? optUrl : typeof get_cOptions<C.showVomnibar>().u === "string"
        ? get_cOptions<C.showVomnibar>().u as string : getPortUrl_()
    if (res && res instanceof Promise) {
      void res.then((url): void => {
        overrideCmdOptions<C.showVomnibar>({ u: url || "" }, true)
        showVomnibar(forceInner)
      })
      return
    }
    defaultUrl = substitute_(res, SedContext.NONE, { r: null, k: get_cOptions<C.showVomnibar, true>().urlSedKeys! })
  }
  if (get_cOptions<C.showVomnibar>().mode === "bookmark") { overrideOption<C.showVomnibar, "mode">("mode", "bookm") }
  const page = vomnibarPage_f, { url_: url } = port.s,
  preferWeb = !page.startsWith(CONST_.BrowserProtocol_),
  isCurOnExt = url.startsWith(CONST_.BrowserProtocol_),
  inner = forceInner || !page.startsWith(location.origin + "/") ? CONST_.VomnibarPageInner_ : page
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
    k: BgUtils_.getOmniSecret_(true)
  }), get_cOptions<C.showVomnibar, true>()) as CmdOptions[kFgCmd.vomnibar] & SafeObject
  if (options.icase == null) {
    if (vomnibarBgOptions_.actions.includes("icase")) { options.icase = true }
  }
  portSendFgCmd(port, kFgCmd.vomnibar, true, options, cRepeat)
  options.k = "omni"
  set_cOptions(options) // safe on renaming
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

let _tempBlob: [number, string] | null | undefined

export const handleImageUrl = (url: `data:${string}` | "", buffer: Blob | null
    , actions: kTeeTask.CopyImage | kTeeTask.ShowImage | kTeeTask.Download | kTeeTask.DrawAndCopy
    , resolve: (ok: BOOL | boolean) => void
    , title: string, text: string, doShow?: ((url: string) => void) | null, inGroup?: boolean): void => {
  if (!actions) { resolve(1); return }
  const copyFromBlobUrl = !!(actions & kTeeTask.CopyImage)
      && curIncognito_ !== IncognitoType.true && (!cPort || !cPort.s.incognito_)
      && (!OnFirefox || actions === kTeeTask.DrawAndCopy && !inGroup)
  const needBlob = actions & kTeeTask.Download || copyFromBlobUrl
  if (needBlob && !buffer) {
    const p = BgUtils_.fetchFile_(url as "data:", "blob")
    Build.NDEBUG || p.catch((err: any | Event): void => { console.log("handleImageUrl can't request `data:` :", err) })
    void p.then((buffer2): void => {
      handleImageUrl(url, buffer2, actions, resolve, title, text, doShow, inGroup)
    })
    return
  }
  if (_tempBlob) {
    clearTimeout(_tempBlob[0]), BgUtils_.revokeBlobUrl_(_tempBlob[1])
    _tempBlob = null
  }
  const blobRef = needBlob ? URL.createObjectURL(buffer) : ""
  if (blobRef) {
    _tempBlob = [setTimeout((): void => {
      _tempBlob && BgUtils_.revokeBlobUrl_(_tempBlob[1]); _tempBlob = null
    }, actions & kTeeTask.Download ? 30000 : 5000), blobRef]
    const outResolve = resolve
    resolve = ! [kTeeTask.CopyImage, kTeeTask.Download, kTeeTask.DrawAndCopy].includes(actions) ? outResolve
        : (ok: BOOL | boolean) => {
      outResolve(ok)
      _tempBlob && BgUtils_.revokeBlobUrl_(blobRef)
      _tempBlob && _tempBlob[1] === blobRef && (clearTimeout(_tempBlob[0]), _tempBlob = null)
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
      // on Chrome 103, a tee.html in a incognito tab can not access `blob:` URLs
      type Result = BOOL | boolean | string;
      void (OnEdge || OnChrome
          && Build.MinCVer < BrowserVer.MinEnsured$Clipboard$$write$and$ClipboardItem
          && CurCVer_ < BrowserVer.MinEnsured$Clipboard$$write$and$ClipboardItem ? Promise.resolve(false)
      : (url || copyFromBlobUrl ? Promise.resolve()
          : BgUtils_.convertToDataURL_(buffer!).then((u2): void => { url = u2 }))
      .then(((buffer2: Blob): Promise<Result> => {
        return runOnTee_(actions === kTeeTask.DrawAndCopy ? actions : kTeeTask.CopyImage, {
          u: copyFromBlobUrl ? blobRef : url, t: text,
          b: Build.BTypes && !(Build.BTypes & (Build.BTypes - 1)) ? Build.BTypes as number : OnOther_
        }, buffer2)
      }).bind(0, buffer!)))
      .then((ok): void => {
        if (OnFirefox && typeof ok === "string") {
          handleImageUrl(ok as "data:", null, kTeeTask.CopyImage, resolve, title, text)
          return
        }
        if (Build.MV3 && IsLimited || ok) { resolve(!!ok); return }
        const doc = (globalThis as MaybeWithWindow).document!
        const img = doc.createElement("img")
        img.alt = title.replace(BgUtils_.getImageExtRe_(), "")
        img.src = url
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
    doShow!(url || blobRef)
    actions & kTeeTask.CopyImage || resolve(1)
    return
  }
  if (actions & kTeeTask.Download) {
    const port = framesForTab_.get(cPort ? cPort.s.tabId_ : curTabId_)?.top_ || cPort
    const p2 = BgUtils_.deferPromise_<unknown>()
    if (actions & kTeeTask.CopyImage && !(OnFirefox && actions !== kTeeTask.DrawAndCopy)) {
      setTimeout(p2.resolve_, 300)
    } else {
      p2.resolve_(0)
    }
    p2.promise_.then((): void => {
    downloadFile(blobRef, title, port ? port.s.url_ : null, (succeed): void => {
      const clickAnchor_cr = (): void => {
        const a = (globalThis as MaybeWithWindow).document!.createElement("a")
        a.href = blobRef
        a.download = title
        a.target = "_blank"
        a.click()
      }
      succeed ? 0 : Build.MV3 && IsLimited || OnFirefox ? doShow!(url || blobRef) : clickAnchor_cr()
      actions === kTeeTask.Download && resolve(true)
    })
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
  if (req.f) {
    prefix += "download=" + BgUtils_.encodeAsciiComponent_(req.f) + "&"
  }
  if (req.a !== false) {
    prefix += "auto=once&"
  }
  req.t && (prefix += req.t)
  const opts2 = req.o || As_<ParsedOpenPageUrlOptions>(BgUtils_.safeObj_() as {})
  const keyword = OnFirefox && req.m === HintMode.DOWNLOAD_MEDIA ? "" : opts2.k
  const testUrl = opts2.t ?? !keyword
  const urlAfterSed = opts2.s ? substitute_(url, SedContext.paste, opts2.s) : url
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
      && (!urlToOpen.startsWith(location.protocol) || urlToOpen.startsWith(location.origin + "/")) ? prefix + urlToOpen
      : urlToOpen, Urls.WorkType.FakeType)
}

export const framesGoBack = (req: FgReq[kFgReq.framesGoBack], port: Port | null, curTab?: Tab): void => {
  const hasTabsGoBack: boolean = OnChrome && Build.MinCVer >= BrowserVer.Min$tabs$$goBack
      || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.Min$tabs$$goBack
      || !OnEdge && !!Tabs_.goBack
  if (!hasTabsGoBack) {
    const url = curTab ? getTabUrl(curTab)
        : (port!.s.frameId_ ? framesForTab_.get(port!.s.tabId_)!.top_! : port!).s.url_
    if (!url.startsWith(CONST_.BrowserProtocol_) || OnFirefox && url.startsWith(location.origin + "/")) {
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
    Tabs_.executeScript(tab.id, {
      code: `history.go(${goStep})`,
      runAt: "document_start"
    }, onApiCallback)
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
      const wantedIdx = position === "end" ? 3e4 : newTabIndex(tab, position, false, true)
      if (wantedIdx != null && wantedIdx !== newTabIdx) {
        Tabs_.move(tab.id, { index: wantedIdx }, runtimeError_)
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
  const tabId = cPort ? cPort.s.tabId_ : curTabId_, ref = framesForTab_.get(tabId),
  port = ref && ref.top_
  if (port && port === ref.cur_ && get_cOptions<C.mainFrame>().$else
      && typeof get_cOptions<C.mainFrame>().$else === "string") {
    runNextCmd<C.mainFrame>(0)
  } else {
    port && focusFrame(port, true, port === ref.cur_ ? FrameMaskType.OnlySelf : FrameMaskType.ForcedSelf
      , get_cOptions<C.mainFrame, true>())
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

export const focusFrame = (port: Port, css: boolean, mask: FrameMaskType, fallback?: Req.FallbackOptions): void => {
  port.postMessage({ N: kBgReq.focusFrame, H: css ? ensureInnerCSS(port.s) : null, m: mask, k: cKey, c: 0,
    f: fallback && parseFallbackOptions(fallback) || {}
  })
}
