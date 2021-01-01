import {
  browserTabs, runtimeError_, selectTab, safeUpdate, selectWnd, browserSessions, browserWebNav
} from "./browser"
import {
  set_cPort, set_cRepeat, set_cOptions, needIcon_, set_cKey, cKey, get_cOptions, set_reqH_, reqH_, executeCommand,
  settings, innerCSS_
} from "./store"
import {
  findCPort, isNotVomnibarPage, framesForTab, indexFrame, onExitGrab, focusFrame, sendFgCmd, safePost,
  complainNoSession, showHUD, complainLimits
} from "./ports"
import { paste_, substitute_ } from "./clipboard"
import { openShowPage, focusAndExecute, focusOrLaunch, openJSUrl, openUrlReq } from "./open_urls"
import {
  initHelp, openImgReq, setOmniStyle, framesGoBack, onConfirmResponse, enterVisualMode, showVomnibar, parentFrame,
  nextFrame, performFind
} from "./frame_commands"
import { copyData } from "./tab_commands"

/** any change to `cRepeat` should ensure it won't be `0` */
let gTabIdOfExtWithVomnibar: number = GlobalConsts.TabIdNone

set_reqH_([
  /** kFgReq.setSetting: */ (request: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>, port: Port): void => {
    const k = request.k, allowed = settings.frontUpdateAllowed_
    if (!(k >= 0 && k < allowed.length)) {
      set_cPort(port)
      return complainLimits(trans_("notModify", [k]))
    }
    const key = allowed[k], p = settings.restore_ && settings.restore_()
    if (settings.get_(key) === request.v) { return }
    p ? p.then(() => { settings.set_(key, request.v) }) : settings.set_(key, request.v)
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
    return FindModeHistory_.query_(port.s.a, request.q, request.i)
  },
  /** kFgReq.parseSearchUrl: */ (request: FgReqWithRes[kFgReq.parseSearchUrl]
      , port: Port): FgRes[kFgReq.parseSearchUrl] | void => {
    let search = Backend_.parse_(request)
    if ("i" in request) {
      port.postMessage({ N: kBgReq.omni_parsed, i: request.i!, s: search })
    } else {
      return search
    }
  },
  /** kFgReq.parseUpperUrl: */ ((request: FgReqWithRes[kFgReq.parseUpperUrl]
      , port?: Port | null): FgRes[kFgReq.parseUpperUrl] | void => {
    if ((request as FgReq[kFgReq.parseUpperUrl]).e) {
      (request as FgReq[kFgReq.parseUpperUrl]).e = false
      const result = reqH_[kFgReq.parseUpperUrl](request)
      if (result.p == null) {
        set_cPort(port!)
        showHUD(result.u)
      } else if (port) {
        sendFgCmd(kFgCmd.framesGoBack, false, { r: 1, url: result.u })
      } else {
        browserTabs.update({ url: result.u })
      }
      return
    }
    let { u: url } = request, url_l = url.toLowerCase()
    if (request.p === 1) {
      let url2 = substitute_(url, SedContext.goToRoot, request.s)
      if (url2 !== url && url2 && url2 !== url + "/" && url2 + "/" !== url) {
        BgUtils_.convertToUrl_(url2, null, Urls.WorkType.KeepAll)
        if (BgUtils_.lastUrlType_ === Urls.Type.Full) {
          return { u: url2, p: "(sed)" }
        }
      }
    }
    if (!BgUtils_.protocolRe_.test(BgUtils_.removeComposedScheme_(url_l))) {
      BgUtils_.resetRe_()
      return { u: "This url has no upper paths", p: null }
    }
    const enc = encodeURIComponent
    let hash = "", str: string, arr: RegExpExecArray | null, startWithSlash = false, endSlash = false
      , removeSlash = false
      , path: string | null = null, i: number, start = 0, end = 0, decoded = false, arr2: RegExpExecArray | null
    if (i = url.lastIndexOf("#") + 1) {
      hash = url.slice(i + +(url.substr(i, 1) === "!"))
      str = BgUtils_.DecodeURLPart_(hash)
      i = str.lastIndexOf("/")
      if (i > 0 || (i === 0 && str.length > 1)) {
        decoded = str !== hash
        const argRe = <RegExpOne> /([^&=]+=)([^&\/=]*\/[^&]*)/
        arr = argRe.exec(str) || (<RegExpOne> /(^|&)([^&\/=]*\/[^&=]*)(?:&|$)/).exec(str)
        path = arr ? arr[2] : str
        // here `path` is ensured not empty
        if (path === "/" || path.includes("://")) { path = null }
        else if (!arr) { start = 0 }
        else if (!decoded) { start = arr.index + arr[1].length }
        else {
          str = "https://example.com/"
          str = encodeURI(str + path).slice(str.length)
          i = hash.indexOf(str)
          if (i < 0) {
            i = hash.indexOf(str = enc(path))
          }
          if (i < 0) {
            decoded = false
            i = hash.indexOf(str = path)
          }
          end = i + str.length
          if (i < 0 && arr[1] !== "&") {
            i = hash.indexOf(str = arr[1])
            if (i < 0) {
              decoded = true
              str = arr[1]
              str = enc(str.slice(0, -1))
              i = hash.indexOf(str)
            }
            if (i >= 0) {
              i += str.length
              end = hash.indexOf("&", i) + 1
            }
          }
          if (i >= 0) {
            start = i
          } else if (arr2 = argRe.exec(hash)) {
            path = BgUtils_.DecodeURLPart_(arr2[2])
            start = arr2.index + arr2[1].length
            end = start + arr2[2].length
          } else if ((str = arr[1]) !== "&") {
            i = url.length - hash.length
            hash = str + enc(path)
            url = url.slice(0, i) + hash
            start = str.length
            end = 0
          }
        }
        if (path) {
          i = url.length - hash.length
          start += i
          end > 0 && (end += i)
        }
      }
    }
    if (!path) {
      if (url_l.startsWith(BrowserProtocol_) && !request.f) {
        BgUtils_.resetRe_()
        return { u: "An extension has no upper-level pages", p: null }
      }
      hash = ""
      start = url.indexOf("/", url.indexOf("://") + 3)
      if (url_l.startsWith("filesystem:")) { start = url.indexOf("/", start + 1) }
      start = start < 0 ? 0 : start
      i = url.indexOf("?", start)
      end = url.indexOf("#", start)
      i = end < 0 ? i : i < 0 ? end : i < end ? i : end
      i = i > 0 ? i : url.length
      path = url.slice(start, i)
      end = 0
      decoded = false
    }
    // Note: here should ensure `end` >= 0
    i = request.p
    startWithSlash = path.startsWith("/")
    if (!hash && url_l.startsWith("file:")) {
      if (path.length <= 1 || url.length === 11 && url.endsWith(":/")) {
        if (request.f) {
          i = 0
        } else {
          BgUtils_.resetRe_()
          return { u: "This has been the root path", p: null }
        }
      }
      endSlash = true
      request.f || i === 1 && (i = -1)
    } else if (!hash && url_l.startsWith("ftp:")) {
      endSlash = true
    } else {
      endSlash = request.t != null ? !!request.t : request.r != null ? !!request.r
          : path.length > 1 && path.endsWith("/")
            || (<RegExpI> /\.([a-z]{2,3}|apng|jpeg|tiff)$/i).test(path) // just a try: not include .html
    }
    {
      const arr3 = path.slice(+startWithSlash, path.length - +path.endsWith("/")).split("/")
      const len = arr3.length, level = i < 0 ? i + len : i
      removeSlash = len <= 1 && i <= -2 && url.lastIndexOf("#", start) > 0
      i = level > len ? len : i > 0 ? level - 1 : level > 0 ? level : 0
      {
        arr3.length = i
        path = arr3.join("/")
      }
    }
    if (str = request.a || "") {
      path += str[0] === "/" ? str : "/" + str
    }
    path = path ? (path[0] === "/" ? "" : "/") + path + (!endSlash || path.endsWith("/") ? "" : "/") : "/"
    if (!end && url.lastIndexOf("git", start - 3) > 0) {
      path = /*#__NOINLINE__*/ upperGitUrls(url, path) || path
    }
    if (removeSlash && (!path || path === "/")) {
      url = url.split("#", 1)[0]
    } else {
      str = decoded ? enc(path) : path
      url = url.slice(0, start) + (end ? str + url.slice(end) : str)
    }
    let substituted = substitute_(url, SedContext.gotoUrl, request.s) || url
    if (substituted !== url) {
      // if substitution returns an invalid URL, then refuse it
      BgUtils_.convertToUrl_(substituted, null, Urls.WorkType.KeepAll)
      url = BgUtils_.lastUrlType_ === Urls.Type.Full ? substituted : url
    }
    BgUtils_.resetRe_()
    return { u: url, p: path }
  }) as BackendHandlersNS.SpecialHandlers[kFgReq.parseUpperUrl],
  /** kFgReq.searchAs: */ (request: FgReq[kFgReq.searchAs], port: Port): void => {
    let search = Backend_.parse_(request), query: string | null | Promise<string | null>
    if (!search || !search.k) {
      set_cPort(port)
      return showHUD(trans_("noEngineFound"))
    }
    query = request.t.trim() || (request.c ? paste_(request.s) : "")
    const doSearch = (query2: string | null): void => {
      let err = query2 === null ? "It's not allowed to read clipboard"
        : (query2 = query2.trim()) ? "" : trans_("noSelOrCopied")
      if (err) {
        set_cPort(port)
        showHUD(err)
        return
      }
      query2 = BgUtils_.createSearchUrl_(query2!.split(BgUtils_.spacesRe_), search!.k)
      openShowPage(query2, ReuseType.current, {}) || safeUpdate(query2)
    }
    if (query instanceof Promise) {
      query.then(doSearch)
      return
    }
    doSearch(query)
  },
  /** kFgReq.gotoSession: */ (request: FgReq[kFgReq.gotoSession], port?: Port): void => {
    const id = request.s, active = request.a !== false
    set_cPort(findCPort(port))
    if (typeof id === "number") {
      browserTabs.update(id, {active: true}, (tab): void => {
        runtimeError_() ? showHUD(trans_("noTabItem")) : selectWnd(tab)
        return runtimeError_()
      })
      return
    }
    if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
          || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions) && !browserSessions()) {
      complainNoSession()
      return
    }
    browserSessions().restore(id, (): void => {
      const err = runtimeError_()
      err && showHUD(trans_("noSessionItem"))
      return err
    })
    if (active) { return }
    let tabId = port!.s.t
    tabId >= 0 || (tabId = TabRecency_.curTab_)
    if (tabId >= 0) { selectTab(tabId) }
  },
  /** kFgReq.openUrl: */ openUrlReq,
  /** kFgReq.onFrameFocused: */ (_0: FgReq[kFgReq.onFrameFocused], port: Port): void => {
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox) {
      if (port.s.f & Frames.Flags.OtherExtension) {
        port.postMessage({ N: kBgReq.injectorRun, t: InjectorTask.reportLiving })
      }
    }
    let tabId = port.s.t, ref = framesForTab[tabId], status: Frames.ValidStatus
    if (!ref) {
      needIcon_ && Backend_.setIcon_(tabId, port.s.s)
      return
    }
    if (port === ref[0]) { return }
    if (needIcon_ && (status = port.s.s) !== ref[0].s.s) {
      (ref as Writable<typeof ref>)[0] = port
      Backend_.setIcon_(tabId, status)
      return
    }
    (ref as Writable<typeof ref>)[0] = port
  },
  /** kFgReq.checkIfEnabled: */ (request: ExclusionsNS.Details | FgReq[kFgReq.checkIfEnabled]
      , from_content?: Frames.Port): void => {
    let port: Frames.Port | null | undefined = from_content
    if (!port) {
      port = indexFrame((request as ExclusionsNS.Details).tabId, (request as ExclusionsNS.Details).frameId)
      if (!port) { return }
    }
    const { s: sender } = port, { u: oldUrl } = sender,
    url1: string | undefined = (request as ExclusionsNS.Details).url,
    pattern = Backend_.getExcluded_(sender.u = from_content ? (request as FgReq[kFgReq.checkIfEnabled]).u
                : url1
      , sender),
    status = pattern === null ? Frames.Status.enabled : pattern ? Frames.Status.partial : Frames.Status.disabled
    if (sender.s !== status) {
      if (sender.f & Frames.Flags.locked) { return }
      sender.s = status
      if (needIcon_ && framesForTab[sender.t]![0] === port) {
        Backend_.setIcon_(sender.t, status)
      }
    } else if (!pattern || pattern === Backend_.getExcluded_(oldUrl, sender)) {
      return
    }
    port.postMessage({ N: kBgReq.reset, p: pattern, f: 0 })
  },
  /** kFgReq.nextFrame: */ (request: FgReq[kFgReq.nextFrame], port: Port): void => {
    set_cPort(port)
    set_cRepeat(1)
    set_cKey(request.k)
    const type = request.t || Frames.NextType.Default
    let ports: Frames.Frames | undefined
    if (type !== Frames.NextType.current) {
      type === Frames.NextType.parent ? parentFrame() : nextFrame()
    } else if (ports = framesForTab[port.s.t]) {
      focusFrame(ports[0], ports.length <= 3, FrameMaskType.NoMask)
    } else {
      safePost(port, { N: kBgReq.omni_returnFocus, l: cKey })
    }
  },
  /** kFgReq.exitGrab: */ onExitGrab,
  /** kFgReq.execInChild: */ (request: FgReqWithRes[kFgReq.execInChild]
      , port: Port): FgRes[kFgReq.execInChild] => {
    const tabId = port.s.t, ports = framesForTab[tabId], url = request.u
    if (!ports || ports.length < 3) { return false }
    let iport: Port | null = null, i = ports.length
    while (1 <= --i) {
      if (ports[i].s.u === url) {
        if (iport) { iport = null; break }
        iport = ports[i]
      }
    }
    if (iport) {
      set_cKey(request.k)
      focusAndExecute(request, port, iport, 1)
    } else {
      browserWebNav() && browserWebNav()!.getAllFrames({tabId: port.s.t}, (frames): void => {
        let childId = 0, self = port.s.i
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
        // here seems useless if to retry to inject content scripts,
        // see https://github.com/philc/vimium/issues/3353#issuecomment-505564921
      })
    }
    return !!iport
  },
  /** kFgReq.initHelp: */ initHelp,
  /** kFgReq.css: */ (_0: {}, port: Port): void => {
    (port as Frames.Port).s.f |= Frames.Flags.hasCSSAndActed
    port.postMessage({ N: kBgReq.showHUD, H: innerCSS_ })
  },
  /** kFgReq.vomnibar: */ (request: FgReq[kFgReq.vomnibar]
      , port: Port): void => {
    const { c: count, i: inner } = request
    set_cKey(kKeyCode.None) // it's only from LinkHints' task / Vomnibar reloading, so no Key to suppress
    if (count != null) {
      delete request.c, delete (request as Partial<Req.baseFg<kFgReq.vomnibar>>).H, delete request.i
      set_cRepeat(+count || 1)
      set_cOptions<CommandsNS.Options>(BgUtils_.safer_(request))
    } else if (request.r !== true) {
      return
    } else if (get_cOptions<any>() == null || get_cOptions<kBgCmd.showVomnibar>().secret !== -1) {
      if (inner) { return }
      set_cOptions(BgUtils_.safeObj_())
      set_cRepeat(1)
    } else if (inner && get_cOptions<kBgCmd.showVomnibar>().v === settings.CONST_.VomnibarPageInner_) {
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
  /** kFgReq.copy: */ copyData,
  /** kFgReq.key: */ (request: FgReq[kFgReq.key], port: Port): void => {
    (port as Frames.Port).s.f |= Frames.Flags.userActed
    let key: string = request.k, count = 1
      , arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
    if (arr != null) {
      let prefix = arr[0]
      key = key.slice(prefix.length)
      count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
    }
    const ref = CommandsData_.keyToCommandRegistry_
    if (!ref.has(key)) {
      arr = key.match(BgUtils_.keyRe_)!
      key = arr[arr.length - 1]
      count = 1
    }
    const registryEntry = ref.get(key)!
    BgUtils_.resetRe_()
    executeCommand(registryEntry, count, request.l, port, 0)
  },
  /** kFgReq.marks: */ (request: FgReq[kFgReq.marks], port: Port): void => {
    set_cPort(port)
    switch (request.a) {
    case kMarkAction.create: return Marks_.createMark_(request, port)
    case kMarkAction.goto: return Marks_.gotoMark_(request, port)
    case kMarkAction.clear: return Marks_.clear_(request.u)
    default: return
    }
  },
  /** kFgReq.focusOrLaunch: */ focusOrLaunch,
  /** kFgReq.cmd: */ onConfirmResponse,
  /** kFgReq.removeSug: */ (req: FgReq[kFgReq.removeSug], port?: Port): void => {
    Backend_.removeSug_(req, port)
  },
  /** kFgReq.openImage: */ openImgReq,
  /** kFgReq.evalJSFallback" */ (req: FgReq[kFgReq.evalJSFallback], port: Port): void => {
    set_cPort(null)
    openJSUrl(req.u, (): void => {
      set_cPort(port)
      showHUD(trans_("jsFail"))
    })
  },
  /** kFgReq.gotoMainFrame: */ (req: FgReq[kFgReq.gotoMainFrame], port: Port): void => {
    // Now that content scripts always auto-reconnect, it's not needed to find a parent frame.
    focusAndExecute(req, port, indexFrame(port.s.t, 0), req.f)
  },
  /** kFgReq.setOmniStyle: */ setOmniStyle,
  /** kFgReq.findFromVisual */ (_: FgReq[kFgReq.findFromVisual], port: Port): void => {
    set_cOptions(BgUtils_.safer_<UnknownOptions<kBgCmd.performFind>>({ active: true, returnToViewport: true }))
    set_cPort(port), set_cRepeat(1)
    performFind()
  },
  /** kFgReq.framesGoBack: */ framesGoBack,
  /** kFgReq.i18n: */ (): FgRes[kFgReq.i18n] => {
    settings.temp_.loadI18nPayload_ && settings.temp_.loadI18nPayload_()
    return { m: settings.i18nPayload_ }
  },
  /** kFgReq.learnCSS */ (_req: FgReq[kFgReq.learnCSS], port: Port): void => {
    (port as Frames.Port).s.f |= Frames.Flags.hasCSS
  },
  /** kFgReq.visualMode: */ (request: FgReq[kFgReq.visualMode], port: Port): void => {
    const isCaret = !!request.c
    set_cOptions(BgUtils_.safer_<UnknownOptions<kBgCmd.visualMode>>({ mode: isCaret ? "caret" : "", start: true }))
    set_cPort(port), set_cRepeat(1)
    enterVisualMode()
  }
])

  
const upperGitUrls = (url: string, path: string): string | void | null => {
  const obj = BgUtils_.safeParseURL_(url), host: string | undefined = obj ? obj.host : ""
  if (!host) { return }
  if (!(<RegExpI> /git\b|\bgit/i).test(host) || !(<RegExpI> /^[\w\-]+(\.\w+)?(:\d{2,5})?$/).test(host)) {
    return
  }
  let arr = path.split("/"), lastIndex = arr.length - 1
  if (!arr[lastIndex]) { lastIndex--, arr.pop() }
  let last = arr[lastIndex]
  if (host === "github.com") {
    if (lastIndex === 3) {
      return last === "pull" || last === "milestone" || last === "commit" ? path + "s"
        : last === "tree" || last === "blob" ? arr.slice(0, 3).join("/")
        : null
    } else if (lastIndex === 4 && arr[3] === "releases" && (arr[4] === "tag" || arr[4] === "edit")) {
      return arr.slice(0, 4).join("/")
    } else if (lastIndex > 3) {
      return arr[3] === "blob" ? (arr[3] = "tree", arr.join("/")) : null
    }
  }
}

const onCompletions = function (this: Port, favIcon0: 0 | 1 | 2, list: Array<Readonly<Suggestion>>
    , autoSelect: boolean, matchType: CompletersNS.MatchType, sugTypes: CompletersNS.SugType, total: number
    , realMode: string, queryComponents: CompletersNS.QComponent): void {
  let { u: url } = this.s, favIcon: 0 | 1 | 2 = favIcon0 === 2 ? 2 : 0
  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
    favIcon = list.some(i => i.e === "tab") ? favIcon && 2 : 0
  }
  else if (Build.BTypes & BrowserType.Edge
      && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)) {
    favIcon = 0
  }
  else if (Build.BTypes & BrowserType.Chrome && favIcon0 === 1
      && (Build.MinCVer >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon
        || CurCVer_ >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon)) {
    url = url.slice(0, url.indexOf("/", url.indexOf("://") + 3) + 1)
    const map = framesForTab
    let frame1 = gTabIdOfExtWithVomnibar >= 0 ? indexFrame(gTabIdOfExtWithVomnibar, 0) : null
    if (frame1 != null) {
      if (frame1.s.u.startsWith(url)) {
        favIcon = 1
      } else {
        gTabIdOfExtWithVomnibar = GlobalConsts.TabIdNone
      }
    }
    if (!favIcon) {
    for (const tabId in map) {
      let frames = map[+tabId]!
      for (let i = 1, len = frames.length; i < len; i++) {
        let { s: sender } = frames[i]
        if (sender.i === 0) {
          if (sender.u.startsWith(url)) {
            favIcon = 1
            gTabIdOfExtWithVomnibar = +tabId
          }
          break
        }
      }
      if (favIcon) { break }
    }
    }
  }
  safePost(this, {
    N: kBgReq.omni_omni, a: autoSelect, c: queryComponents, i: favIcon, l: list, m: matchType,
    r: realMode, s: sugTypes, t: total
  })
  BgUtils_.resetRe_()
}
