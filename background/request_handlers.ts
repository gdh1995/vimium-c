import {
  set_cPort, set_cRepeat, set_cOptions, needIcon_, set_cKey, cKey, get_cOptions, set_reqH_, reqH_, restoreSettings_,
  innerCSS_, framesForTab_, cRepeat, curTabId_, Completion_, CurCVer_, OnChrome, OnEdge, OnFirefox, setIcon_, blank_,
  substitute_, paste_, keyToCommandMap_, CONST_, copy_, set_cEnv, settingsCache_, vomnibarBgOptions_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  tabsUpdate, runtimeError_, selectTab, selectWnd, browserSessions_, browserWebNav_, downloadFile, import2
} from "./browser"
import { findUrlEndingWithPunctuation_, parseSearchUrl_, parseUpperUrl_ } from "./parse_urls"
import * as settings_ from "./settings"
import {
  findCPort, isNotVomnibarPage, indexFrame, safePost, complainNoSession, showHUD, complainLimits, ensureInnerCSS,
  getParentFrame, sendResponse, showHUDEx
} from "./ports"
import { exclusionListening_, getExcluded_ } from "./exclusions"
import { setOmniStyle_ } from "./ui_css"
import { contentI18n_, extTrans_, i18nReadyExt_, loadContentI18n_, transPart_, trans_ } from "./i18n"
import { keyRe_, parseVal_ } from "./key_mappings"
import {
  sendFgCmd, replaceCmdOptions, onConfirmResponse, executeCommand, portSendFgCmd,
  waitAndRunKeyReq, runNextCmdBy, parseFallbackOptions
} from "./run_commands"
import { inlineRunKey_, parseEmbeddedOptions, runKeyWithCond } from "./run_keys"
import { focusOrLaunch_, openJSUrl, openUrlReq } from "./open_urls"
import {
  initHelp, openImgReq, framesGoBack, enterVisualMode, showVomnibar, parentFrame, nextFrame, performFind, focusFrame
} from "./frame_commands"
import { FindModeHistory_, Marks_ } from "./tools"
import { convertToUrl_ } from "./normalize_urls"

let gTabIdOfExtWithVomnibar: number = GlobalConsts.TabIdNone
let _pageHandlers: Promise<typeof import("./page_handlers")> | null

const _AsReqH = <K extends (keyof FgReq) & keyof BackendHandlersNS.FgRequestHandlers, RequirePort = true>(
    handler: (req: FgReq[K], port: RequirePort extends true ? Port : Port | null | undefined) => void
        ): (req: FgReq[K], port: RequirePort extends true ? Port : Port | null | undefined) => void => {
  if (!(Build.NDEBUG || handler != null)) {
    throw new ReferenceError("Refer a request handler before it gets inited")
  }
  return Build.NDEBUG ? handler : (req, port) => { handler(req, port) }
}

set_reqH_([
  /** kFgReq.setSetting: */ (request: FgReq[kFgReq.setSetting], port: Port): void => {
    const k = request.k, allowed = settings_.frontUpdateAllowed_
    if (!(k >= 0 && k < allowed.length)) {
      set_cPort(port)
      return complainLimits(trans_("notModify", [k]))
    }
    const key = allowed[k], p = restoreSettings_
    if (settingsCache_[key] === request.v) { return }
    p ? void p.then(() => { settings_.set_(key, request.v) }) : settings_.set_(key, request.v)
    interface BaseCheck { key: 123 }
    type Map1<T> = T extends keyof SettingsNS.DirectlySyncedItems ? T : 123
    interface Check extends BaseCheck { key: Map1<keyof SettingsNS.FrontUpdateAllowedSettings> }
    if (!Build.NDEBUG) { // just a type assertion
      let obj: Check = {
        key: key as keyof SettingsNS.FrontUpdateAllowedSettings & keyof SettingsNS.DirectlySyncedItems
      }
      console.log("updated from content scripts:", obj)
    }
  },
  /** kFgReq.findQuery: */ (request: FgReq[kFgReq.findQuery] | FgReqWithRes[kFgReq.findQuery]
      , port: Port): FgRes[kFgReq.findQuery] | void => {
    const isObj = typeof request === "object", query = isObj ? request.q : "", index = isObj ? 1 : request
    return FindModeHistory_.query_(port.s.incognito_, query, index)
  },
  /** kFgReq.parseSearchUrl: */ ((request: FgReqWithRes[kFgReq.parseSearchUrl]
      , port: Port): FgRes[kFgReq.parseSearchUrl] | void => {
    let search = parseSearchUrl_(request)
    if (request.i != null) {
      port.postMessage({ N: kBgReq.omni_parsed, i: request.i, s: search })
    } else {
      return search
    }
  }) as BackendHandlersNS.FgRequestHandlers[kFgReq.parseSearchUrl],
  /** kFgReq.parseUpperUrl: */ (request: FgReq[kFgReq.parseUpperUrl], port?: Port | null): void => {
    const oldUrl = request.u, alwaysExec = request.e as boolean
    const result = parseUpperUrl_(request)
    BgUtils_.resetRe_()
    request.e = result
      if (result.p == null) {
        set_cPort(port!)
        showHUD(result.u)
      } else if (!alwaysExec && oldUrl === result.u) {
        set_cPort(port!)
        showHUD("Here is just root")
        request.e = { p: null, u: "(just root)" }
      } else if (port
          && (result.u.slice(0, 7).toLowerCase() !== "file://" || oldUrl.slice(0, 7).toLowerCase() === "file://")) {
        sendFgCmd(kFgCmd.framesGoBack, false, { r: 1, u: result.u })
      } else {
        tabsUpdate({ url: result.u })
      }
  },
  /** kFgReq.searchAs: */ (request: FgReq[kFgReq.searchAs], port: Port): void => {
    let search = parseSearchUrl_(request), query: string | null | Promise<string | null>
    if (!search || !search.k) {
      set_cPort(port)
      showHUD(trans_("noEngineFound"))
      request.n && runNextCmdBy(0, request.n)
      return
    }
    const o2 = request.o || {}
    query = request.t.trim() && substitute_(request.t.trim(), SedContext.pageText, o2.s).trim()
        || (request.c ? paste_(o2.s) : "")
    void Promise.resolve(query).then((query2: string | null): void => {
      let err = query2 === null ? "It's not allowed to read clipboard"
        : (query2 = query2.trim()) ? "" : trans_("noSelOrCopied")
      if (err) {
        set_cPort(port)
        showHUD(err)
        request.n && runNextCmdBy(0, request.n)
        return
      }
      o2.k = o2.k == null ? search!.k : o2.k // not change .testUrl, in case a user specifies it
      reqH_[kFgReq.openUrl]({ u: query2!, o: o2, r: ReuseType.current, n: parseFallbackOptions(request.n) || {} }, port)
    })
  },
  /** kFgReq.gotoSession: */ (request: FgReq[kFgReq.gotoSession], port?: Port): void => {
    const id = request.s, active = request.a !== false
    set_cPort(findCPort(port)!)
    if (typeof id === "number") {
      selectTab(id, (tab): void => {
        runtimeError_() ? showHUD(trans_("noTabItem")) : selectWnd(tab)
        return runtimeError_()
      })
      return
    }
    if (OnEdge || !browserSessions_()) {
      complainNoSession()
      return
    }
    browserSessions_().restore(id[1], (): void => {
      const err = runtimeError_()
      err && showHUD(trans_("noSessionItem"))
      return err
    })
    if (active) { return }
    let tabId = port!.s.tabId_
    tabId >= 0 || (tabId = curTabId_)
    if (tabId >= 0) { selectTab(tabId) }
  },
  /** kFgReq.openUrl: */ _AsReqH<kFgReq.openUrl>(openUrlReq),
  /** kFgReq.onFrameFocused: */ (_0: FgReq[kFgReq.onFrameFocused], port: Port): void => {
    if (OnFirefox) {
      if (port.s.flags_ & Frames.Flags.OtherExtension) {
        port.postMessage({ N: kBgReq.injectorRun, t: InjectorTask.reportLiving })
      }
    }
    let tabId = port.s.tabId_, ref = framesForTab_.get(tabId), status: Frames.ValidStatus
    if (!ref) {
      needIcon_ && setIcon_(tabId, port.s.status_)
      return
    }
    let last = ref.cur_
    if (port === last) { return }
    ref.cur_ = port
    if (needIcon_ && (status = port.s.status_) !== last.s.status_) {
      setIcon_(tabId, status)
    }
  },
  /** kFgReq.checkIfEnabled: */ (request: ExclusionsNS.Details & {u?: undefined} | FgReq[kFgReq.checkIfEnabled]
      , from_content?: Frames.Port): void => {
    let port: Frames.Port | null | undefined = from_content
    if (!port) {
      port = indexFrame((request as ExclusionsNS.Details).tabId, (request as ExclusionsNS.Details).frameId)
      if (!port) { return }
    }
    const { s: sender } = port, { url_: oldUrl } = sender,
    ref = framesForTab_.get(sender.tabId_)
    if (ref && ref.lock_) { return }
    const pattern = !exclusionListening_ ? null
        : getExcluded_(sender.url_ = from_content ? request.u! : (request as ExclusionsNS.Details).url, sender),
    status = pattern === null ? Frames.Status.enabled : pattern ? Frames.Status.partial : Frames.Status.disabled
    if (sender.status_ !== status) {
      sender.status_ = status
      if (needIcon_ && ref!.cur_ === port) {
        setIcon_(sender.tabId_, status)
      }
    } else if (!pattern || pattern === getExcluded_(oldUrl, sender)) {
      return
    }
    port.postMessage({ N: kBgReq.reset, p: pattern, f: 0 })
  },
  /** kFgReq.nextFrame: */ (request: FgReq[kFgReq.nextFrame], port: Port): void => {
    const type = request.t || Frames.NextType.Default
    set_cPort(port)
    set_cRepeat(type || cRepeat > 0 ? 1 : -1)
    set_cKey(request.k)
    replaceCmdOptions<kBgCmd.nextFrame>(request.f || {})
    let ref: Frames.Frames | undefined
    if (type !== Frames.NextType.current) {
      type === Frames.NextType.parent ? parentFrame() : nextFrame()
    } else if (ref = framesForTab_.get(port.s.tabId_)) {
      focusFrame(ref.cur_, ref.ports_.length <= 2, request.o ? FrameMaskType.onOmniHide : FrameMaskType.NoMask
          , get_cOptions<kBgCmd.nextFrame, true>())
    } else {
      safePost(port, { N: kBgReq.omni_returnFocus, l: cKey })
    }
  },
  /** kFgReq.exitGrab: */ (_: FgReq[kFgReq.exitGrab], port: Port): void => {
    const ref = framesForTab_.get(port.s.tabId_)
    if (!ref) { return }
    (port.s as Frames.Sender).flags_ |= Frames.Flags.userActed
    ref.flags_ |= Frames.Flags.userActed
    if (ref.ports_.length < 2) { return }
    const msg: Req.bg<kBgReq.exitGrab> = { N: kBgReq.exitGrab }
    for (const p of ref.ports_) {
      const flags = p.s.flags_
      p.s.flags_ |= Frames.Flags.userActed
      if (!(flags & Frames.Flags.userActed)) {
        p.postMessage(msg)
      }
    }
  },
  /** kFgReq.execInChild: */ (request: FgReqWithRes[kFgReq.execInChild], port: Port
      , msgId: number): FgRes[kFgReq.execInChild] | Port => {
    const tabId = port.s.tabId_, ref = framesForTab_.get(tabId), url = request.u
    if (!ref || ref.ports_.length < 2) { return false }
    let iport: Port | null | undefined
    for (const i of ref.ports_) {
      if (i.s.url_ === url) {
        if (iport) { iport = null; break }
        iport = i
      }
    }
    if (iport) {
      set_cKey(request.k)
      focusAndExecute(request, port, iport, 1)
      return true
    } else if (!browserWebNav_()) {
      return false
    } else {
      browserWebNav_()!.getAllFrames({tabId: port.s.tabId_}, (frames): void => {
        let childId = 0, self = port.s.frameId_
        for (const i1 of frames) {
          if (i1.parentFrameId === self) {
            if (childId) { childId = 0; break }
            childId = i1.frameId
          }
        }
        const port2 = childId && indexFrame(tabId, childId)
        if (port2) {
          set_cKey(request.k)
          focusAndExecute(request, port, port2, 1)
        }
        sendResponse(port, msgId, !!port2)
        // here seems useless if to retry to inject content scripts,
        // see https://github.com/philc/vimium/issues/3353#issuecomment-505564921
      })
      return port
    }
  },
  /** kFgReq.initHelp: */ (req: FgReq[kFgReq.initHelp], port): void => { void initHelp(req, port) },
  /** kFgReq.css: */ (_0: FgReq[kFgReq.css], port: Port): void => {
    const ref = framesForTab_.get(port.s.tabId_)!
    ref.flags_ |= Frames.Flags.userActed;
    (port as Frames.Port).s.flags_ |= Frames.Flags.hasCSS | Frames.Flags.userActed
    port.postMessage({ N: kBgReq.showHUD, H: innerCSS_ })
  },
  /** kFgReq.vomnibar: */ (request: FgReq[kFgReq.vomnibar]
      , port: Port): void => {
    const { i: inner } = request
    set_cKey(kKeyCode.None) // it's only from LinkHints' task / Vomnibar reloading, so no Key to suppress
    if (request.u != null) {
      const {m, t} = request, isLinkJob = m >= HintMode.min_link_job && m <= HintMode.max_link_job
      let url = request.u
      url = isLinkJob ? findUrlEndingWithPunctuation_(url, true) : url
      url = substitute_(url, isLinkJob ? SedContext.pageURL : SedContext.pageText)
      replaceCmdOptions<kBgCmd.showVomnibar>({ url, newtab: t != null ? !!t : !isLinkJob, keyword: request.o.k })
      replaceForwardedOptions(request.f)
      set_cRepeat(1)
    } else if (request.r !== true) {
      return
    } else if (get_cOptions<any>() == null
        || (get_cOptions<kBgCmd.showVomnibar>() as SafeObject as SafeObject & CmdOptions[kFgCmd.vomnibar]
            ).k !== "omni") {
      if (inner) { return }
      set_cOptions(BgUtils_.safeObj_())
      set_cRepeat(1)
    } else if (inner && (get_cOptions<kBgCmd.showVomnibar>() as SafeObject & CmdOptions[kFgCmd.vomnibar]
        ).v === CONST_.VomnibarPageInner_) {
      return
    }
    set_cPort(port)
    showVomnibar(inner)
  },
  /** kFgReq.omni: */ (request: FgReq[kFgReq.omni], port: Port): void => {
    if (isNotVomnibarPage(port, false)) { return }
    Completion_.filter_(request.q, request,
        /*#__NOINLINE__*/ onCompletions.bind<Port, 0 | 1 | 2, Parameters<CompletersNS.Callback>, void>(
          port, (request.i! | 0) as 0 | 1 | 2))
  },
  /** kFgReq.copy: */ (request: FgReq[kFgReq.copy], port: Port): void => {
    let str: string | string[] | object[] | undefined
    str = request.u || request.s || ""
    const opts2 = request.o || {}
    const mode1 = request.s != null && request.m || HintMode.DEFAULT
    const sed = opts2.s, keyword = opts2.k
    const correctUrl = mode1 >= HintMode.min_link_job && mode1 <= HintMode.max_link_job
    && (!sed || sed.r !== false)
    const decode = request.d ? opts2.d !== false : !!opts2.d
    if (decode) {
      if (typeof str !== "string") {
        for (let i = str.length; 0 <= --i; ) {
          correctUrl && (str[i] = findUrlEndingWithPunctuation_(str[i] as AllowToString + ""))
          str[i] = BgUtils_.decodeUrlForCopy_(str[i] as AllowToString + "")
        }
      } else {
        correctUrl && (str = findUrlEndingWithPunctuation_(str))
        str = BgUtils_.decodeUrlForCopy_(str)
      }
    } else if (typeof str === "string") {
      if (str.length < 4 && str.trim() && str[0] === " ") {
        str = ""
      }
    }
    str = str && copy_(str, request.j, sed, keyword)
    set_cPort(port)
    str = request.s && typeof request.s === "object" ? `[${request.s.length}] ` + request.s.slice(-1)[0] : str
    showHUD(decode ? str.replace(<RegExpG & RegExpSearchable<0>> /%[0-7][\dA-Fa-f]/g, decodeURIComponent)
        : str, request.u ? kTip.noUrlCopied : kTip.noTextCopied)
  },
  /** kFgReq.key: */ (request: FgReq[kFgReq.key], port: Port | null): void => {
    const sender = port != null ? (port as Frames.Port).s : null
    if (sender !== null && !(sender.flags_ & Frames.Flags.userActed)) {
      sender.flags_ |= Frames.Flags.userActed
      const ref = framesForTab_.get(sender.tabId_)
      ref && (ref.flags_ |= Frames.Flags.userActed)
    }
    let key: string = request.k, count = 1
      , arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
    if (arr != null) {
      let prefix = arr[0]
      key = key.slice(prefix.length)
      count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
    }
    let registryEntry = keyToCommandMap_.get(key)
    if (!registryEntry) {
      arr = key.match(keyRe_)!
      key = arr[arr.length - 1]
      count = 1
      registryEntry = keyToCommandMap_.get(key)
    }
    BgUtils_.resetRe_()
    if (registryEntry) {
      if (registryEntry.alias_ === kBgCmd.runKey && registryEntry.background_) { inlineRunKey_(registryEntry) }
      request.e && set_cEnv({ element: BgUtils_.normalizeElDesc_(request.e) })
      executeCommand(registryEntry, count, request.l, port, 0, null)
    }
  },
  /** kFgReq.nextKey: */ _AsReqH<kFgReq.nextKey>(waitAndRunKeyReq),
  /** kFgReq.marks: */ (request: FgReq[kFgReq.marks], port: Port): void => {
    set_cPort(port)
    switch (request.a) {
    case kMarkAction.create: return Marks_.createMark_(request, port)
    case kMarkAction.goto: return Marks_.gotoMark_(request, port)
    case kMarkAction.clear: return Marks_.clear_(request.u)
    default: return
    }
  },
  /** kFgReq.focusOrLaunch: */ _AsReqH<kFgReq.focusOrLaunch, false>(focusOrLaunch_),
  /** kFgReq.cmd: */ _AsReqH<kFgReq.cmd>(onConfirmResponse),
  /** kFgReq.removeSug: */ (req: FgReq[kFgReq.removeSug], port?: Port | null): void => {
    if (req.t === "e") {
      showHUD(trans_("cannotDelSug"))
      return
    }
    const { t: rawType, s: sId, u: url } = req
    const type = rawType === "history" && sId != null ? "session" : rawType
    const name = type === "tab" ? type : type + " item"
    const cb = (succeed?: boolean | BOOL | void): void => {
      void Promise.resolve(trans_("sugs")).then((sugs): void => {
        showHUD(trans_(succeed ? "delSug" : "notDelSug", [transPart_(sugs as "t(sugs)", type[0]) || name]))
      })
    }
    set_cPort(findCPort(port)!)
    if (type === "tab" && curTabId_ === sId) {
      showHUD(trans_("notRemoveCur"))
    } else if (type !== "session") {
      Completion_.removeSug_(type === "tab" ? sId as number : url, type, cb)
    } else if (!OnEdge && browserSessions_()?.forgetClosedTab) {
      const sessionId = sId as Extract<CompletersNS.SessionId, object>
      void browserSessions_().forgetClosedTab(sessionId[0], sessionId[1])
          .then(() => 1 as const, blank_).then(cb)
    }
  },
  /** kFgReq.openImage: */ _AsReqH<kFgReq.openImage>(openImgReq),
  /** kFgReq.evalJSFallback" */ (req: FgReq[kFgReq.evalJSFallback], port: Port): void => {
    set_cPort(null as never)
    openJSUrl(req.u, {}, (): void => {
      set_cPort(port)
      showHUD(trans_("jsFail"))
    })
  },
  /** kFgReq.gotoMainFrame: */ (req: FgReq[kFgReq.gotoMainFrame], port: Port): void => {
    if (req.c === kFgCmd.linkHints || req.c === kFgCmd.scroll) {
      void getParentFrame(port.s.tabId_, port.s.frameId_, 1).then((port2): void => {
        focusAndExecute(req, port, port2 || framesForTab_.get(port.s.tabId_)?.top_ || null, req.f)
      })
      return
    }
    // Now that content scripts always auto-reconnect, it's not needed to find a parent frame.
    focusAndExecute(req, port, framesForTab_.get(port.s.tabId_)?.top_ || null, req.f)
  },
  /** kFgReq.setOmniStyle: */ _AsReqH<kFgReq.setOmniStyle>(setOmniStyle_),
  /** kFgReq.findFromVisual: */ (_: FgReq[kFgReq.findFromVisual], port: Port): void => {
    replaceCmdOptions<kBgCmd.performFind>({ active: true, returnToViewport: true })
    set_cPort(port), set_cRepeat(1)
    performFind()
  },
  /** kFgReq.framesGoBack: */ _AsReqH<kFgReq.framesGoBack>(framesGoBack),
  /** kFgReq.i18n: */ (_, port, msgId): FgRes[kFgReq.i18n] | Port => {
    if (Build.MV3 && i18nReadyExt_ !== 1) {
      (extTrans_("name") as Promise<string>).then((): void => {
        loadContentI18n_ && loadContentI18n_()
        sendResponse(port, msgId, contentI18n_)
      })
      return port
    }
    loadContentI18n_ && loadContentI18n_()
    return contentI18n_
  },
  /** kFgReq.learnCSS: */ (_req: FgReq[kFgReq.learnCSS], port: Port): void => {
    (port as Frames.Port).s.flags_ |= Frames.Flags.hasCSS
  },
  /** kFgReq.visualMode: */ (request: FgReq[kFgReq.visualMode], port: Port): void => {
    const isCaret = !!request.c
    replaceCmdOptions<kBgCmd.visualMode>({ mode: isCaret ? "caret" : "", start: true })
    replaceForwardedOptions(request.f)
    set_cPort(port), set_cRepeat(1)
    enterVisualMode()
  },
  /** kFgReq.respondForRunAs: */ (request: FgReq[kFgReq.respondForRunKey]): void => {
    if (performance.now() - request.r.n < 500) {
      const info = request.r.c
      info.element = BgUtils_.normalizeElDesc_(request.e)
      runKeyWithCond(info)
    }
  },
  /** kFgReq.downloadLink: */ (req: FgReq[kFgReq.downloadLink], port): void => {
    const o2 = req.o || {}
    let url = substitute_(findUrlEndingWithPunctuation_(req.u, true), SedContext.pageURL, o2.s)
    url = (url !== req.u || o2.k) ? convertToUrl_(url, o2.k, Urls.WorkType.Default) : url
    set_cPort(port)
    showHUD(url, kTip.downloaded)
    downloadFile(url, req.f, req.r || "", req.m < HintMode.DOWNLOAD_LINK ? (succeed): void => {
      succeed || reqH_[kFgReq.openImage]({ m: HintMode.OPEN_IMAGE, f: req.f, u: url }, port)
    } : null)
  },
  /** kFgReq.wait: */ (req: FgReqWithRes[kFgReq.wait], port, msgId): Port => {
    setTimeout(() => { sendResponse(port, msgId, TimerType.fake) }, req)
    return port
  },
  /** kFgReq.optionToggled: */ ({ k: key, v: val }: FgReq[kFgReq.optionToggled]): void => {
    const notBool = val !== !!val
    showHUD(trans_(notBool ? "useVal" : val ? "turnOn" : "turnOff", [key, notBool ? JSON.stringify(val) : ""]))
  },
  /** kFgReq.keyFromOmni: */ (req: FgReq[kFgReq.keyFromOmni], port): void => {
    const tabId = port.s.tabId_, frames = framesForTab_.get(tabId >= 0 ? tabId : curTabId_)
    reqH_[kFgReq.key](req, frames ? frames.cur_ : null)
  },
  /** kFgReq.pages: */ (req: FgReqWithRes[kFgReq.pages], port: Frames.PagePort, msgId?: number): false | Port => {
    if (port.s !== false && !port.s.url_.startsWith(location.origin + "/")) { return false }
    onPagesReq(req.q, req.i, port).then((res): void => {
      port.postMessage<2>(msgId ? { N: kBgReq.msg, m: msgId, r: res } : res as never)
    })
    return port as Port
  },
  /** kFgReq.showUrl: */ (req: FgReq[kFgReq.showUrl], port): void => {
    let text = req.u, n = text.indexOf("://")
    text = n > 0 ? text.slice(text.indexOf("/", n + 4) + 1) : text
    text = text.length > 40 ? text.slice(0, 39) + "\u2026" : text
    set_cPort(port)
    showHUD(text, kTip.downloaded)
  },
  /** kFgReq.omniCopy: */ (req: FgReq[kFgReq.omniCopy], port): void => {
    const title = req.t, url = BgUtils_.decodeUrlForCopy_(req.u)
    let join = (vomnibarBgOptions_.actions.find(i => i.startsWith("itemJoin=")) || "").slice(9)
    join = join ? join.includes("\\") ? parseVal_(join[0] === '"' ? join : `"${join}"`)
        : BgUtils_.DecodeURLPart_(join) : ": "
    reqH_[kFgReq.copy]({ s: title ? title + join + url : url, d: false, m: HintMode.DEFAULT }, findCPort(port)!);
  },
  /** kFgReq.didLocalMarkTask: */ (req: FgReq[kFgReq.didLocalMarkTask], port): void => {
    if (req.i != null) {
      showHUDEx(port, "mLocalMarkTask", 1, [ [req.m ? "mJumpTo" : "mCreate"], req.i || ["mLastMark"] ])
    } else {
      showHUDEx(port, "mCreateLastMark", 1, [])
    }
  }
])

const onCompletions = function (this: Port, favIcon0: 0 | 1 | 2, list: Array<Readonly<Suggestion>>
    , autoSelect: boolean, matchType: CompletersNS.MatchType, sugTypes: CompletersNS.SugType, total: number
    , realMode: string, queryComponents: CompletersNS.QComponent): void {
  let { url_: url } = this.s, favIcon: 0 | 1 | 2 = favIcon0 === 2 ? 2 : 0
  let next: IteratorResult<Frames.Frames>
  let top: Frames.Frames["top_"], sender: Frames.Sender | null
  if (Build.MV3) { favIcon = 0 }
  else if (OnFirefox) {
    favIcon = list.some(i => i.e === "tab") ? favIcon : 0
  } else if (OnEdge) {
    favIcon = 0
  }
  else if (OnChrome && favIcon0 === 1
      && (Build.MinCVer >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon
        || CurCVer_ >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon)) {
    url = url.slice(0, url.indexOf("/", url.indexOf("://") + 3) + 1)
    let frame1 = gTabIdOfExtWithVomnibar !== GlobalConsts.TabIdNone
        ? framesForTab_.get(gTabIdOfExtWithVomnibar)?.top_ : null
    if (frame1 != null) {
      if (frame1.s.url_.startsWith(url)) {
        favIcon = 1
      } else {
        gTabIdOfExtWithVomnibar = GlobalConsts.TabIdNone
      }
    }
    if (favIcon) { /* empty */ }
    else if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
      const map = (framesForTab_ as any as SimulatedMap).map_ as Dict<any> as Dict<Frames.Frames>
      for (let tabId in map) {
        top = map[tabId]!.top_, sender = top && top.s
        if (sender && sender.url_.startsWith(url)) {
          favIcon = 1, gTabIdOfExtWithVomnibar = +tabId
          break
        }
      }
    } else if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.BuildMinForOf) {
      const iter = framesForTab_.values() as Iterable<Frames.Frames> as IterableIterator<Frames.Frames>
      while (next = iter.next(), !next.done) {
        top = next.value.top_, sender = top && top.s
        if (sender && sender.url_.startsWith(url)) {
          favIcon = 1, gTabIdOfExtWithVomnibar = sender.tabId_
          break
        }
      }
    } else {
      for (const frames of framesForTab_.values()) {
        top = frames.top_, sender = top && top.s
        if (sender) {
          if (sender.url_.startsWith(url)) {
            favIcon = 1
            gTabIdOfExtWithVomnibar = sender.tabId_
            break
          }
        }
      }
    }
  }
  safePost(this, {
    N: kBgReq.omni_omni, a: autoSelect, c: queryComponents, i: favIcon, l: list, m: matchType,
    r: realMode, s: sugTypes, t: total
  })
  BgUtils_.resetRe_()
}

const focusAndExecute = (req: Omit<FgReq[kFgReq.gotoMainFrame], "f">
    , port: Port, targetPort: Port | null, focusAndShowFrameBorder: BOOL): void => {
  if (targetPort && targetPort.s.status_ !== Frames.Status.disabled) {
    targetPort.postMessage({
      N: kBgReq.focusFrame,
      H: focusAndShowFrameBorder || req.c !== kFgCmd.scroll ? ensureInnerCSS(port.s) : null,
      m: focusAndShowFrameBorder ? FrameMaskType.ForcedSelf : FrameMaskType.NoMaskAndNoFocus,
      k: focusAndShowFrameBorder ? cKey : kKeyCode.None,
      f: {},
      c: req.c, n: req.n || 0, a: req.a
    })
  } else {
    req.a.$forced = 1
    portSendFgCmd(port, req.c, false, req.a as Dict<any>, req.n || 0)
  }
}

const replaceForwardedOptions = (toForward?: object | string | null): void => {
  if (!toForward) { return }
  typeof toForward === "string" && (toForward = parseEmbeddedOptions(toForward))
  toForward && typeof toForward === "object" &&
  Object.assign(get_cOptions<kBgCmd.blank, true>(), BgUtils_.safer_(toForward))
}

const onPagesReq = (req: FgReqWithRes[kFgReq.pages]["q"], id: number
    , port: Frames.PagePort | null): Promise<FgRes[kFgReq.pages]> => {
  if (!_pageHandlers) {
    _pageHandlers = (Build.MV3 ? Promise.resolve() : import("/background/sync.js" as any))
        .then(() => settings_.ready_)
        .then(() => import2<typeof import("./page_handlers")>("/background/page_handlers.js"))
  }
  return _pageHandlers.then(module => Promise.all(req.map(i => module.onReq(i, port))))
      .then(answers => ({ i: id, a: answers.map(i => i !== void 0 ? i : null) }))
}

declare var structuredClone: (<T> (obj: T) => T) | undefined
(globalThis as MaybeWithWindow).window && (((globalThis as MaybeWithWindow).window as BgExports).onPagesReq =
    (req): Promise<FgRes[kFgReq.pages]> => {
  const queries = !OnFirefox ? req.q
      : Build.MinFFVer >= FirefoxBrowserVer.Min$structuredClone || typeof structuredClone === "function"
      ? structuredClone!(req.q) : JSON.parse(JSON.stringify(req.q))
  return onPagesReq(queries, req.i, null)
})
