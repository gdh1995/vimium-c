import {
  set_cPort, set_cRepeat, set_cOptions, needIcon_, set_cKey, cKey, get_cOptions, set_reqH_, reqH_, restoreSettings_,
  innerCSS_, framesForTab_, cRepeat, curTabId_, Completion_, CurCVer_, OnChrome, OnEdge, OnFirefox, setIcon_, blank_,
  substitute_, paste_, keyToCommandMap_, CONST_, copy_, set_cEnv, settingsCache_, vomnibarBgOptions_, replaceTeeTask_,
  curIncognito_, inlineRunKey_, CurFFVer_, Origin2_, focusAndExecuteOn_, set_focusAndExecuteOn_, curWndId_, bgC_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  tabsUpdate, runtimeError_, selectTab, selectWnd, browserSessions_, browserWebNav_, downloadFile, import2, Q_,
  getCurTab, getGroupId, Tabs_, tabsGet, selectWndIfNeed
} from "./browser"
import { convertToUrl_ } from "./normalize_urls"
import { findUrlEndingWithPunctuation_, parseSearchUrl_, parseUpperUrl_ } from "./parse_urls"
import * as settings_ from "./settings"
import {
  findCPort, isNotVomnibarPage, indexFrame, safePost, complainNoSession, showHUD, complainLimits, ensureInnerCSS,
  getParentFrame, sendResponse, showHUDEx, getFrames_, requireURL_
} from "./ports"
import { exclusionListening_, getExcluded_ } from "./exclusions"
import { setMediaState_ } from "./ui_css"
import { contentI18n_, extTrans_, i18nReadyExt_, loadContentI18n_, transPart_, trans_ } from "./i18n"
import { keyRe_, makeCommand_ } from "./key_mappings"
import {
  sendFgCmd, replaceCmdOptions, onConfirmResponse, executeCommand, portSendFgCmd, executeExternalCmd, runNextCmdBy,
  waitAndRunKeyReq, parseFallbackOptions, onBeforeConfirm, concatOptions, overrideCmdOptions
} from "./run_commands"
import { parseEmbeddedOptions, runKeyWithCond } from "./run_keys"
import { FindModeHistory_, Marks_ } from "./tools"
import { focusOrLaunch_, openJSUrl, openUrlReq, parseOpenPageUrlOptions } from "./open_urls"
import {
  initHelp, openImgReq, framesGoBack, enterVisualMode, showVomnibar, parentFrame, nextFrame, performFind, focusFrame,
  handleImageUrl, findContentPort_
} from "./frame_commands"
import { onSessionRestored_ } from "./tab_commands"

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
  /** kFgReq.fromInjectedPages: */ (request: FgReq[kFgReq.fromInjectedPages], port: Port): void => {
    const name = request.handler
    if (!name || typeof name !== "string") { return }
    if (name === kFgReq.focus) {
      if (!(port.s.flags_ & Frames.Flags.userActed)) {
        (port.s as Frames.Sender).flags_ |= Frames.Flags.userActed
        port.postMessage({ N: kBgReq.exitGrab })
      }
      reqH_[kFgReq.exitGrab]({}, port)
    } else if (name === kFgReq.command) {
      executeExternalCmd(request as ExternalMsgs[kFgReq.command]["req"], null, port)
    } else if (name === kFgReq.tip) {
      set_cPort(indexFrame(port.s.tabId_, 0) || port)
      showHUD(request.tip || "Error: Lack .tip")
    }
  },
  /** kFgReq.blank: */ (): FgRes[kFgReq.blank] => 0,
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
    let o2 = request.o || parseOpenPageUrlOptions(request.n), exOut: InfoOnSed = {}
    query = request.t.trim() && substitute_(request.t.trim(), SedContext.pageText, o2.s, exOut).trim()
        || (request.c ? paste_(o2.s, 0, exOut = {}) : "")
    void Promise.resolve(query).then((query2: string | null): void => {
      let err = query2 === null ? "It's not allowed to read clipboard"
        : (query2 = query2.trim()) ? "" : trans_("noSelOrCopied")
      if (err) {
        set_cPort(port)
        showHUD(err)
        request.n && runNextCmdBy(0, request.n)
        return
      }
      o2.k = exOut.keyword_ ?? (o2.k == null ? search!.k : o2.k) // not change .testUrl, in case a user specifies it
      reqH_[kFgReq.openUrl]({ u: query2!, o: o2, r: ReuseType.current, n: parseFallbackOptions(request.n) || {} }, port)
    })
  },
  /** kFgReq.gotoSession: */ (request: FgReq[kFgReq.gotoSession], port?: Port): void => {
    const id = request.s, active = request.a !== 0, forceInCurWnd = request.a === 2, curWndId = curWndId_
    set_cPort(findCPort(port)!) // no port if on browser:// tab and called from omnibox
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
    const curTabId = port && port.s.tabId_ >= 0 ? port.s.tabId_ : curTabId_ >= 0 ? curTabId_ : null
    const activeId = active ? null : curTabId
    browserSessions_().restore(id[1], (res): void => {
      const err = runtimeError_()
      err ? showHUD(trans_("noSessionItem")) : onSessionRestored_(curWndId, res, activeId).then(newTab => {
        if (forceInCurWnd && curTabId && newTab && newTab.windowId !== curWndId) {
          tabsGet(curTabId, (tab): void => {
            Tabs_.move(newTab.id, { windowId: curWndId, index: tab ? tab.index + 1 : -1 }, runtimeError_)
            tabsUpdate(newTab.id, { active: true })
          })
        }
      })
      return err
    })
    activeId && selectTab(activeId, runtimeError_)
  },
  /** kFgReq.openUrl: */ _AsReqH<kFgReq.openUrl>(openUrlReq),
  /** kFgReq.onFrameFocused: */ (_0: FgReq[kFgReq.onFrameFocused], port: Port): void => {
    if (OnFirefox) {
      if (port.s.flags_ & Frames.Flags.otherExtension) {
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
      if (!port) {
        const ref = framesForTab_.get((request as ExclusionsNS.Details).tabId)
        ref && ref.flags_ & Frames.Flags.ResReleased && (ref.flags_ |= Frames.Flags.UrlUpdated)
        return
      }
    }
    const { s: sender } = port, oldUrl = sender.url_, ref = framesForTab_.get(sender.tabId_)
    const url = sender.url_ = from_content ? request.u! : (request as ExclusionsNS.Details).url
    if (ref && ref.lock_) { return }
    const pattern = !exclusionListening_ ? null : getExcluded_(url, sender),
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
    } else if (ref = getFrames_(port)) {
      focusFrame(ref.cur_, ref.ports_.length <= 2, request.o ? FrameMaskType.onOmniHide : FrameMaskType.NoMask)
    } else {
      safePost(port, { N: kBgReq.omni_returnFocus, l: cKey })
    }
  },
  /** kFgReq.exitGrab: */ (_: FgReq[kFgReq.exitGrab], port: Port): void => {
    const ref = getFrames_(port)
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
      , msgId?: number): FgRes[kFgReq.execInChild] | Port | void => {
    const tabId = port.s.tabId_, ref = getFrames_(port), url = request.u, frameId = request.f
    if (!ref || ref.ports_.length < 2) { return false }
    const childOrigin = !OnFirefox && url.startsWith("http") ? new URL(url).origin : null
    let iport: Port | 0 | undefined, iport2: Port | 0 | undefined
    if (OnFirefox && (Build.MinFFVer >= FirefoxBrowserVer.Min$runtime$$getFrameId
        || CurFFVer_ > FirefoxBrowserVer.Min$runtime$$getFrameId - 1)) {
      iport = ref.ports_.find(i => i.s.frameId_ === frameId)
    }
    else for (const i of ref.ports_) {
      if (i !== ref.top_ && i !== port) {
        if (i.s.url_ === url) {
          if (!(iport = iport ? 0 : i)) { break }
        }
        if (childOrigin && iport2 !== 0 && i.s.url_.startsWith("http") && new URL(i.s.url_).origin === childOrigin) {
          iport2 = iport2 ? 0 : i
        }
      }
    }
    iport = iport ?? iport2
    if (iport && iport !== port) {
      set_cKey(request.k)
      focusAndExecute(request, port, iport, 1, 1)
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
          focusAndExecute(request, port, port2, 1, 1)
        }
        OnChrome || msgId && sendResponse(port, msgId, !!port2)
        // here seems useless if to retry to inject content scripts,
        // see https://github.com/philc/vimium/issues/3353#issuecomment-505564921
      })
      return msgId ? port : false
    }
  },
  /** kFgReq.initHelp: */ _AsReqH<kFgReq.initHelp>(initHelp),
  /** kFgReq.css: */ (_0: FgReq[kFgReq.css], port: Port): void => {
    const ref = getFrames_(port)!
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
      let url = request.u, exOut: InfoOnSed = {}
      url = isLinkJob ? findUrlEndingWithPunctuation_(url, true) : url
      url = substitute_(url, isLinkJob ? SedContext.pageURL : SedContext.pageText, request.o && request.o.s, exOut)
      replaceCmdOptions<kBgCmd.showVomnibar>({ url, newtab: t != null ? !!t : !isLinkJob
          , keyword: exOut.keyword_ ?? request.o.k })
      replaceForwardedOptions(request.f)
      set_cRepeat(1)
    } else if (request.r !== 9) {
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
    showVomnibar(!!inner)
  },
  /** kFgReq.omni: */ (request: FgReq[kFgReq.omni], port: Port): void => {
    if (isNotVomnibarPage(port, false)) { return }
    Completion_.filter_(request.q, request,
        /*#__NOINLINE__*/ onCompletions.bind<Port, 0 | 1 | 2, Parameters<CompletersNS.Callback>, void>(
          port, (request.i! | 0) as 0 | 1 | 2))
  },
  /** kFgReq.copy: */ (request: FgReq[kFgReq.copy], port: Port): void => {
    if (request.i != null) {
      const richText = (request.r || "") + "" as Extract<typeof request.r, string>
      const i0 = request.i, title = richText.includes("name") ? request.u : ""
      void Promise.all<"data:" | "" | [Blob | null, string] | null | 0, [Tab] | never[] | null | undefined>([
        (<RegExpI> /^data:/i).test(i0) ? Promise.resolve(i0) : BgUtils_.fetchOnlineResources_(i0 || request.u),
        OnFirefox && !curIncognito_ ? Q_(getCurTab) : null
      ]).then(([res, curTab]) => {
        const isStr = typeof res === "string", dataUrl = isStr ? res : res ? res[1] : ""
        set_cPort(port)
        let prefixLen = dataUrl.indexOf(",") + 1, contentType = dataUrl.slice(5, Math.max(5, prefixLen)).toLowerCase()
        const mime = contentType.split(";")[0]
        if (!res || mime.startsWith("text/")) {
          res ? showHUD("", kTip.notImg) : showHUD(trans_(res === 0 ? "downloadTimeout" : "downloadFail"))
          return
        }
        let head = dataUrl.slice(prefixLen, prefixLen + 24)
        head = contentType.includes("base64") ? BgUtils_.DecodeURLPart_(head, "atob") : head.slice(0, 16)
        const tag = head.startsWith("\x89PNG") ? "PNG" : head.startsWith("\xff\xd8\xff") ? "JPEG"
            : (<RegExpOne> /^GIF8[79]a/).test(head) ? "GIF"
            : (<RegExpOne> /^ftypavi[fs]/).test(head.slice(4)) ? "AVIF"
            : (<RegExpOne> /^\xff\xd8\xff(\xdb|\xe0|\xee|\xe1[^][^]Exif\0\0)/).test(head) ? "JPEG"
            : head.slice(8, 12) === "WEBP" ? "WebP"
            : (mime.split("/")[1] || "").toUpperCase() || mime
        const text = title && (<RegExpI> /^(http|ftp|file)/i).test(title) ? title : ""
        const wantSafe = richText.includes("safe") && tag !== "GIF" || richText.includes("force")
        handleImageUrl(Build.MV3 ? dataUrl as "data:" : isStr ? res : "", isStr ? null : res[0]
            , wantSafe && tag !== "PNG" ? kTeeTask.DrawAndCopy : kTeeTask.CopyImage, (ok): void => {
          showHUD(trans_(ok ? "imgCopied" : "failCopyingImg", [ok === 1 ? "HTML" : wantSafe ? "PNG" : tag]))
        }, title, text, null, OnFirefox ? !curTab || !curTab[0] || getGroupId(curTab[0]) !== null : false)
        BgUtils_.resetRe_()
      })
      return
    }
    const oriOptions = request.n as CmdOptions[kFgCmd.autoOpen] | undefined
    const opts2 = request.o || oriOptions && parseOpenPageUrlOptions(oriOptions) || {}
    const isInOpenAndCopy = !!(oriOptions && oriOptions.copy && oriOptions.o)
    const rawStr = request.s
    const mode1 = rawStr != null && request.m || HintMode.DEFAULT
    const sed = isInOpenAndCopy ? null : opts2.s, keyword = isInOpenAndCopy ? null : opts2.k
    const correctUrl = mode1 >= HintMode.min_link_job && mode1 <= HintMode.max_link_job
        && (!sed || sed.r !== false)
    if (!rawStr && oriOptions && !(oriOptions.type === "frame"
        || request.u && !port.s.frameId_ && "tab-url tab".includes(oriOptions.type || ""))) {
      const type = oriOptions.type
      const opts = concatOptions(oriOptions, BgUtils_.safer_({ url: null,
          type: type === "tab" && oriOptions.url || type === "tab-url" ? null : type === "tab-title" ? "title" : type
      } satisfies KnownOptions<kBgCmd.copyWindowInfo> & { url: null }))
      const topPort = getFrames_(port)!.top_
      port = topPort && !(topPort.s.flags_ & Frames.Flags.ResReleased) ? topPort : port
      set_cEnv(null)
      executeCommand(makeCommand_("copyCurrentUrl", opts), 1, cKey, port, 1
          , oriOptions.$f && {c: oriOptions.$f, r: oriOptions.$retry, u: 0, w: 0 })
      return
    }
    let str: string | string[] | object[] | undefined = request.u || rawStr || ""
    const decode = !rawStr && (request.d ? opts2.d !== false : !!opts2.d)
    const rawTrim = request.t ?? oriOptions?.trim
    if (rawTrim) {
      const trim: (s: string) => string = rawTrim === "start" || rawTrim === "left" ? i => i.trimLeft()
          : rawTrim === "end" || rawTrim === "right" ? i => i.trimRight() : i => i.trim()
      if (typeof str === "string") {
        str = trim(str)
      } else {
        for (let i = str.length; 0 <= --i; ) { str[i] = trim(str[i] as AllowToString + "") }
      }
    }
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
      str = str.length < 4 && !str.trim() && (str[0] === " " || "\n\n\n".includes(str)) ? "" : str
    }
    let hasStr = !!str, str2 = str && copy_(str, request.j, sed, keyword, rawTrim === false)
    str2 = rawStr && typeof rawStr === "object" ? `[${rawStr.length}] ` + rawStr.slice(-1)[0] : str2
    Promise.resolve(str2).then((str3): void => {
      const encodeHex = (s: string): string => {
        s = JSON.stringify(s).slice(1, -1)
        return s.trim() ? s : s < "\xff" ? "\\x" + (s.charCodeAt(0) + 0x100).toString(16).slice(1)
          : BgUtils_.encodeUnicode_(s)
      }
      set_cPort(port)
      oriOptions && runNextCmdBy(hasStr ? 1 : 0, oriOptions) ||
      showHUD(decode ? str3.replace(<RegExpG & RegExpSearchable<0>> /%[0-7][\dA-Fa-f]/g, decodeURIComponent)
            : str3.replace(<RegExpG & RegExpSearchable<0>> (str3.trim() ? /[^\S ]/g : /[^]/g), encodeHex)
          , request.u ? kTip.noUrlCopied : kTip.noTextCopied)
    })
  },
  /** kFgReq.key: */ (request: FgReq[kFgReq.key], port: Port | null): void => {
    const sender = port != null ? (port as Frames.Port).s : null
    if (sender !== null && !(sender.flags_ & Frames.Flags.userActed)) {
      sender.flags_ |= Frames.Flags.userActed
      const ref = getFrames_(port!)
      ref && (ref.flags_ |= Frames.Flags.userActed)
    }
    let key: string = request.k, count = 1
      , arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
    if (arr != null) {
      let prefix = arr[0]
      key = key.slice(prefix.length)
      count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
    } else if (key.length > 6 && key.startsWith(`<${GlobalConsts.ForcedMapNum}${key[5]}>`)) {
      key = key[5] + key.slice(7)
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
  /** kFgReq.marks: */ (request: FgReq[kFgReq.marks], urlPort: Port): void => {
    if (request.c === kMarkAction.clear) {
      const removed = Marks_.clear_(request.u)
      request.f && runNextCmdBy(removed > 0 ? 1 : 0, request.f)
      return
    }
    const forced = !!request.f
    const exOpts: KnownOptions<kBgCmd.marksActivate> = request.c.o satisfies OpenPageUrlOptions | Req.FallbackOptions
    forced || set_cPort(urlPort)
    const p = !forced && findContentPort_(urlPort, exOpts.type, request.l) || urlPort
    void Promise.resolve(p).then((upperPort): void => {
      if (!forced && (upperPort !== urlPort || !request.u)) {
        const req2 = request as Req.fg<kFgReq.marks> satisfies Omit<Req.queryUrl<kFgReq.marks>, "U"
            > as Req.queryUrl<kFgReq.marks>
        req2.U = ((exOpts.extUrl ? 1 : 0) | (request.c.a ? 2 : 0)) as 0 | 1 | 2 | 3
        ; (req2 as Extract<FgReq[kFgReq.marks], { c: CmdOptions[kFgCmd.marks] }>).f = true
        void requireURL_(req2, true, 1, upperPort)
        return
      }
      if (request.c.a === kMarkAction.create) {
        Marks_.set_(request satisfies MarksNS.FgQuery as MarksNS.FgCreateQuery, urlPort.s.incognito_, urlPort.s.tabId_)
        showHUDEx(urlPort, "mNormalMarkTask", 1, [ ["mCreate"], [request.l ? "Local" : "Global"], request.n ])
        runNextCmdBy(1, exOpts)
      } else {
        Marks_.goToMark_(exOpts, request as MarksNS.FgGotoQuery, urlPort, request.l && forced ? request.k : 0)
      }
    })
  },
  /** kFgReq.focusOrLaunch: */ _AsReqH<kFgReq.focusOrLaunch, false>(focusOrLaunch_),
  /** kFgReq.beforeCmd: */ _AsReqH<kFgReq.beforeCmd>(onBeforeConfirm),
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
        showHUD(trans_(succeed ? "delSug" : "notDelSug", [sugs && transPart_(sugs as "t(sugs)", type[0]) || name]))
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
        focusAndExecute(req, port, port2 || getFrames_(port)?.top_ || null, req.f)
      })
      return
    }
    // Now that content scripts always auto-reconnect, it's not needed to find a parent frame.
    focusAndExecute(req, port, getFrames_(port)?.top_ || null, req.f)
  },
  /** kFgReq.omniToggleMedia: */ (req: FgReq[kFgReq.omniToggleMedia], omni_port: Port): void => {
    if (!req.t) {
      setMediaState_(MediaNS.kName.PrefersColorScheme, req.v, req.b ? 2 : 9, omni_port)
    } else {
      overrideCmdOptions<kBgCmd.toggleVomnibarStyle>({ enable: req.v, forced: true }  )
      bgC_[kBgCmd.toggleVomnibarStyle](null as never, blank_)
    }
  },
  /** kFgReq.findFromVisual: */ (req: FgReq[kFgReq.findFromVisual], port: Port): void => {
    replaceCmdOptions<kBgCmd.performFind>({ active: true, returnToViewport: true
        , extend: !!(req.c & 1), direction: req.c >= VisualAction.EmbeddedFindModeToPrev ? "before" : null })
    set_cPort(port), set_cRepeat(1)
    performFind()
  },
  /** kFgReq.framesGoBack: */ _AsReqH<kFgReq.framesGoBack>(framesGoBack),
  /** kFgReq.i18n: */ (_, port, msgId): FgRes[kFgReq.i18n] | Port => {
    if (Build.MV3 && Build.MinCVer < BrowserVer.MinBg$i18n$$getMessage$InMV3 && i18nReadyExt_ !== 1) {
      (extTrans_("name") as Promise<string>).then((): void => {
        loadContentI18n_ && loadContentI18n_()
        sendResponse(port, msgId, contentI18n_)
      })
      return port
    }
    loadContentI18n_ && loadContentI18n_()
    return contentI18n_
  },
  /** kFgReq.cssLearnt: */ (_req: FgReq[kFgReq.cssLearnt], port: Port): void => {
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
    const o2 = req.o || {}, exOut: InfoOnSed = {}
    let url = substitute_(findUrlEndingWithPunctuation_(req.u, true), SedContext.pageURL, o2.s, exOut)
    const keyword = exOut.keyword_ ?? o2.k
    url = url !== req.u || keyword ? convertToUrl_(url, keyword, Urls.WorkType.Default) : url
    set_cPort(port)
    showHUD(url, kTip.downloaded)
    downloadFile(url, req.f, req.r || "").then(req.m < HintMode.DOWNLOAD_LINK ? (succeed): void => {
      succeed || reqH_[kFgReq.openImage]({ m: HintMode.OPEN_IMAGE, f: req.f, u: url }, port)
    } : void 0)
  },
  /** kFgReq.wait: */ (req: FgReqWithRes[kFgReq.wait], port, msgId): Port | TimerType.fake => {
    if (req === 0) { return TimerType.fake }
    setTimeout(() => { sendResponse(port, msgId, TimerType.fake) }, req)
    return port
  },
  /** kFgReq.optionToggled: */ ({ k: key, v: val }: FgReq[kFgReq.optionToggled]): void => {
    const notBool = val !== !!val
    showHUD(trans_(notBool ? "useVal" : val ? "turnOn" : "turnOff", [key, notBool ? JSON.stringify(val) : ""]))
  },
  /** kFgReq.keyFromOmni: */ (req: FgReq[kFgReq.keyFromOmni], port): void => {
    reqH_[kFgReq.key](req, findCPort(port))
  },
  /** kFgReq.pages: */ (req: FgReqWithRes[kFgReq.pages], port: Frames.PagePort, msgId?: number): false | Port => {
    if (port.s !== false && !port.s.url_.startsWith(Origin2_)) { return false }
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
    let join = title && url ? (vomnibarBgOptions_.actions.find(i => i.startsWith("itemJoin=")) || "").slice(9) : ""
    join = join ? join.includes("\\") ? BgUtils_.tryParse(join[0] === '"' ? join : `"${join}"`)
        : BgUtils_.DecodeURLPart_(join) : "\n"
    reqH_[kFgReq.copy]({ s: title && url ? title + join + url : url || title
        , d: false, m: HintMode.DEFAULT }, findCPort(port)!)
  },
  /** kFgReq.omniCopy: */ (req: FgReq[kFgReq.omniCopied], port): void => {
    set_cPort(findCPort(port)!)
    showHUD(req.t, kTip.noTextCopied)
  },
  /** kFgReq.didLocalMarkTask: */ (req: FgReq[kFgReq.didLocalMarkTask], port): void => {
    showHUDEx(port, "mLocalMarkTask", 1, [ [req.n ? "mCreate" : "mJumpTo"], req.i > 1 ? req.i : ["mLastMark"] ])
    set_cPort(port)
    runNextCmdBy(1, req.c.o)
  },
  /** kFgReq.recheckTee: */ (): FgRes[kFgReq.recheckTee] => {
    const taskOnce = replaceTeeTask_(null, null)
    if (taskOnce) {
      clearTimeout(taskOnce.i)
      taskOnce.r && taskOnce.r(false)
    }
    return !taskOnce
  },
  /** kFgReq.afterTee: */ (req: FgReqWithRes[kFgReq.afterTee], port: Port): FgRes[kFgReq.afterTee] => {
    const otherPort = req > 0 && indexFrame(port.s.tabId_, req)
    if (otherPort) {
      focusFrame(otherPort, false, FrameMaskType.NoMask, 1)
      return FrameMaskType.NoMask
    }
    req <= 0 && reqH_[kFgReq.recheckTee]()
    return req ? FrameMaskType.NormalNext : FrameMaskType.NoMask
  },
  /** kFgReq._deleted1: */ (_req: FgReq[kFgReq._deleted1], _port): void => {
  },
  /** kFgReq.syncStatus: */ (req: FgReq[kFgReq.syncStatus], port): void => {
    const [ locked, isPassKeysReversed, passKeys ] = req.s
    const newPassKeys = passKeys && (isPassKeysReversed ? "^ " : "") + passKeys.join(" ")
    const resetMsg: Req.bg<kBgReq.reset> = { N: kBgReq.reset, p: newPassKeys, f: locked }
    port.postMessage(resetMsg)
    const ref = getFrames_(port)
    const status = locked === Frames.Flags.lockedAndDisabled ? Frames.Status.disabled : Frames.Status.enabled
    if (!ref || ref.lock_ && ref.lock_.status_ === status && ref.lock_.passKeys_ === newPassKeys) { return }
    ref.lock_ = { status_: status, passKeys_: newPassKeys }
    needIcon_ && ref.cur_.s.status_ !== status && setIcon_(port.s.tabId_, status)
    for (const port of ref.ports_) {
      port.s.status_ = status
      port.s.flags_ & Frames.Flags.ResReleased || port.postMessage(resetMsg)
    }
  },
  /** kFgReq.focusCurTab: */ (_req: FgReq[kFgReq.focusCurTab], port): void => {
    let tabId = port.s.tabId_, tick = 0, timer = setInterval(() => {
      const ref = framesForTab_.get(tabId)
      if (tabId !== curTabId_ && ref) {
        clearInterval(timer)
        if (ref.ports_.includes(port) || port.s.flags_ & Frames.Flags.ResReleased) {
          selectTab(tabId, selectWndIfNeed)
        }
      } else if (++tick >= 12 || !ref) {
        clearInterval(timer)
      }
    }, 17)
  }
])

const onCompletions = function (this: Port, favIcon0: 0 | 1 | 2, list: Array<Readonly<Suggestion>>
    , autoSelect: boolean, matchType: CompletersNS.MatchType, sugTypes: CompletersNS.SugType, total: number
    , realMode: string, queryComponents: CompletersNS.QComponent): void {
  let { url_: url } = this.s, favIcon: 0 | 1 | 2 = favIcon0 === 2 ? 2 : 0
  let next: IteratorResult<Frames.Frames>
  let top: Frames.Frames["top_"], sender: Frames.Sender | null
  if (OnFirefox) {
    favIcon = list.some(i => i.e === "tab") ? favIcon : 0
  } else if (OnEdge) {
    favIcon = 0
  } else if (Build.MV3) {
    if (OnChrome && Build.MinCVer < BrowserVer.MinMV3FaviconAPI && CurCVer_ < BrowserVer.MinMV3FaviconAPI) {
      favIcon = 0
    }
  } else if (OnChrome && favIcon0 === 1
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

set_focusAndExecuteOn_((<T extends FgCmdAcrossFrames> (targetPort: Port, cmd: T, options: CmdOptions[T], count: number
      , focusAndShowFrameBorder: BOOL): void => {
    targetPort.postMessage({
      N: kBgReq.focusFrame,
      H: focusAndShowFrameBorder || cmd !== kFgCmd.scroll ? ensureInnerCSS(targetPort.s) : null,
      m: focusAndShowFrameBorder ? FrameMaskType.ForcedSelf : FrameMaskType.NoMaskAndNoFocus,
      k: focusAndShowFrameBorder ? cKey : kKeyCode.None,
      f: {},
      c: cmd, n: count || 0, a: options as FgOptions
    })
}) satisfies typeof focusAndExecuteOn_)

const focusAndExecute = (req: Omit<FgReq[kFgReq.gotoMainFrame], "f">
    , port: Port, targetPort: Port | null, focusAndShowFrameBorder: BOOL, ignoreStatus?: 1): void => {
  if (targetPort && (ignoreStatus || targetPort.s.status_ !== Frames.Status.disabled)) {
    focusAndExecuteOn_(targetPort, req.c, req.a as CmdOptions[FgCmdAcrossFrames], req.n, focusAndShowFrameBorder)
  } else {
    req.a.$forced = 1
    portSendFgCmd(port, req.c, false, req.a as Dict<any>, req.n || 0)
  }
}

const replaceForwardedOptions = (toForward?: object | Exclude<HintsNS.Options["then"], object>): void => {
  if (!toForward) { return }
  typeof toForward === "string" && (toForward = parseEmbeddedOptions(toForward))
  toForward && typeof toForward === "object" &&
  Object.assign(get_cOptions<kBgCmd.blank, true>(), BgUtils_.safer_(toForward))
}

const onPagesReq = (req: FgReqWithRes[kFgReq.pages]["q"], id: number
    , port: Frames.PagePort | null): Promise<FgRes[kFgReq.pages]> => {
  if (!_pageHandlers) {
    _pageHandlers = (Build.MV3 ? settings_.ready_ : import2("/background/sync.js" as any).then(() => settings_.ready_))
        .then(() => import2<typeof import("./page_handlers")>("/background/page_handlers.js"))
  }
  return _pageHandlers.then(module => Promise.all(req.map(i => module.onReq(i, port))))
      .then(answers => ({ i: id, a: answers.map(i => i !== void 0 ? i : null) }))
}

declare var structuredClone: (<T> (obj: T) => T) | undefined
Build.MV3 || (( // @ts-ignore
  window as BgExports
).onPagesReq = (req): Promise<FgRes[kFgReq.pages]> => {
  if (req.i === GlobalConsts.TeeReqId) {
    const teeTask = replaceTeeTask_(null, null)
    teeTask && clearTimeout(teeTask.i)
    return teeTask as never
  }
  const queries: typeof req.q = !OnFirefox ? req.q
      : Build.MinFFVer >= FirefoxBrowserVer.Min$structuredClone || typeof structuredClone === "function"
      ? structuredClone!(req.q) : JSON.parse(JSON.stringify(req.q))
  return onPagesReq(queries, req.i, null)
})
