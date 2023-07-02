import {
  needIcon_, cPort, set_cPort, reqH_, contentPayload_, omniPayload_, innerCSS_, extAllowList_, framesForTab_, findCSS_,
  framesForOmni_, getNextFakeTabId, curTabId_, vomnibarPage_f, OnChrome, CurCVer_, OnEdge, setIcon_, lastKeptTabId_,
  keyFSM_, mappedKeyRegistry_, CONST_, mappedKeyTypes_, recencyForTab_, setTeeTask_, OnFirefox, blank_, UseZhLang_,
  isLastKeptTabPrivate_, set_isLastKeptTabPrivate_, set_lastKeptTabId_, settingsCache_
} from "./store"
import { asyncIter_, deferPromise_, getOmniSecret_, isNotPriviledged, keys_ } from "./utils"
import {
  removeTempTab, tabsGet, runtimeError_, getCurTab, getTabUrl, browserWebNav_, Q_, executeScript_, getFindCSS_cr_,
  selectTab, selectWndIfNeed, getCurWnd, Windows_, Tabs_, browser_
} from "./browser"
import { exclusionListening_, getExcluded_, exclusionListenHash_ } from "./exclusions"
import { I18nNames, transEx_ } from "./i18n"

const DEBUG: BOOL | boolean = false
let _timeoutToTryToKeepAliveOnce_mv3_non_ff = 0

const onMessage = <K extends keyof FgReq, T extends keyof FgRes> (request: Req.fg<K> | Req.fgWithRes<T>
    , port: Frames.Port): void => {
  type ReqK = keyof FgReq
  type ResK = keyof FgRes;
  if (request.H !== kFgReq.msg) {
    (reqH_ as {
      [T2 in ReqK]: (req: Req.fg<T2>, port: Frames.Port) => void
    } as {
      [T2 in ReqK]: <T3 extends ReqK>(req: Req.fg<T3>, port: Frames.Port) => void
    })[request.H](request as Req.fg<K>, port)
  } else {
    const ret = (reqH_ as {
        [T2 in ResK]: (req: Req.fgWithRes<T2>["a"], port: Port, msgId: number) => FgRes[T2] | Port
      } as {
        [T2 in ResK]: <T3 extends ResK>(req: Req.fgWithRes<T3>["a"], port: Port, msgId: number) => FgRes[T3] | Port
      })[(request as Req.fgWithRes<T>).c]((request as Req.fgWithRes<T>).a, port, (request as Req.fgWithRes<T>).i)
    ret !== port &&
    port.postMessage<2>({ N: kBgReq.msg, m: (request as Req.fgWithRes<T>).i, r: ret as FgRes[T] })
  }
}

export const sendResponse = <T extends keyof FgRes> (port: Port, msgId: number, response: FgRes[T]): void => {
  const frames = getFrames_(port)
  if (frames && frames.ports_.includes(port)) { // for less exceptions
    try {
      port.postMessage<2>({ N: kBgReq.msg, m: msgId, r: response })
    } catch {}
  }
}

export const OnConnect = (port: Frames.Port, type: PortType): void => {
  if (type & PortType.selfPages) {
    /*#__NOINLINE__*/ _onPageConnect(port, type)
    return
  }
  const lifecycle = (port as Frames.BrowserPort).sender.documentLifecycle
  const isInactive = !!lifecycle && lifecycle !== "active"
  const sender = /*#__NOINLINE__*/ formatPortSender(port)
  const url = sender.url_, isOmni = url === vomnibarPage_f
  if (type > PortType.reconnect - 1 || isOmni) {
    if (type === PortType.CloseSelf) {
      sender.tabId_ >= 0 && !sender.frameId_ &&
      removeTempTab(sender.tabId_, (port as Frames.BrowserPort).sender.tab!.windowId, sender.url_)
      return
    } else if (type & PortType.omnibar || isOmni) {
      /*#__NOINLINE__*/ _onOmniConnect(port, type, isOmni || url === CONST_.VomnibarPageInner_)
      return
    }
    if (isInactive) {
      port.disconnect()
      if (!Build.NDEBUG && DEBUG) {
        console.log("on inactive port reconnect: tab=%o, frameId=%o, lifecycle=%o"
            , sender.tabId_, sender.frameId_, lifecycle)
      }
      return
    }
  }
  let tabId = sender.tabId_
  const ref = tabId >= 0 ? framesForTab_.get(tabId)
      : ((tabId = (sender as Writable<Frames.Sender>).tabId_ = getNextFakeTabId()), undefined)
  const isNewFrameInSameTab = (type & (PortType.isTop | PortType.reconnect)) !== PortType.isTop
      && (type & (PortType.isTop | PortType.onceFreezed)) !== (PortType.isTop | PortType.onceFreezed)
      && ref !== undefined
  let status: Frames.ValidStatus
  let passKeys: null | string, flags: BgReq[kBgReq.reset]["f"];
  if (isNewFrameInSameTab && ref.lock_ !== null) {
    passKeys = ref.lock_.passKeys_
    status = ref.lock_.status_
    flags = status === Frames.Status.disabled ? Frames.Flags.lockedAndDisabled : Frames.Flags.locked
  } else {
    passKeys = exclusionListening_ && !(type & PortType.reconnect) ? getExcluded_(url, sender) : null
    status = passKeys === null ? Frames.Status.enabled : passKeys ? Frames.Status.partial : Frames.Status.disabled
    flags = Frames.Flags.blank
  }
  sender.status_ = status
  if (type & PortType.aboutIframe) { sender.flags_ = (flags |= Frames.Flags.aboutIframe) }
  if (isNewFrameInSameTab) {
    flags |= ref.flags_ & Frames.Flags.userActed
    if (type & PortType.otherExtension) {
      flags |= Frames.Flags.otherExtension
      ref.flags_ |= Frames.Flags.otherExtension
    }
    sender.flags_ = flags
  }
  if (type & PortType.reconnect) {
    if (!Build.NDEBUG && DEBUG) {
      console.log("on port reconnect: tab=%o, frameId=%o, frames.flag=%o, old-ports=%o"
          , sender.tabId_, sender.frameId_, ref ? ref.flags_ : -1, ref ? ref.ports_.length : 0)
    }
    if (type & Frames.Flags.UrlUpdated) {
      port.postMessage({ N: kBgReq.reset, p: flags & Frames.Flags.locked ? passKeys : getExcluded_(url, sender)
          , f: flags & Frames.Flags.MASK_LOCK_STATUS })
    }
    /*#__NOINLINE__*/ _recoverStates(ref, port, type)
  } else {
    port.postMessage<kBgReq.init>(type & PortType.confInherited ? {
      N: kBgReq.init, c: null as never as SettingsNS.FrontendSettingCache, d: isInactive, f: flags, p: passKeys
    } satisfies Omit<Req.bg<kBgReq.init>, keyof BgReq[kBgReq.keyFSM]> as Req.bg<kBgReq.init> : {
      N: kBgReq.init, c: contentPayload_, d: isInactive, f: flags,
      k: keyFSM_!, m: mappedKeyRegistry_, p: passKeys, t: mappedKeyTypes_
    })
    if (isInactive) {
      port.disconnect()
      if (!Build.NDEBUG && DEBUG) {
        console.log("on inactive port connect: tab=%o, frameId=%o, lifecycle=%o"
            , sender.tabId_, sender.frameId_, lifecycle)
      }
      return
    }
  }
  if (!OnChrome) { (port as Frames.BrowserPort).sender.tab = null as never }
  port.onDisconnect.addListener(onDisconnect)
  port.onMessage.addListener(/*#__NOINLINE__*/ onMessage)
  if (OnChrome && Build.MinCVer < BrowserVer.MinWithFrameId && CurCVer_ < BrowserVer.MinWithFrameId) {
    (sender as Writable<Frames.Sender>).frameId_ = (type & PortType.isTop) ? 0 : ((Math.random() * 9999997) | 0) + 2
  }
  const isTopFrame = sender.frameId_ === 0
  if (isNewFrameInSameTab) {
    if (type & PortType.hasFocus) {
      needIcon_ && ref.cur_.s.status_ !== status && setIcon_(tabId, status)
      ref.cur_ = port
    }
    isTopFrame && ((ref as Writable<typeof ref>).top_ = port)
    ref.ports_.push(port)
  } else {
    framesForTab_.set(tabId, {
      cur_: port, top_: isTopFrame ? port : null, ports_: [port],
      lock_: null, flags_: Frames.Flags.Default
    })
    status !== Frames.Status.enabled && needIcon_ && setIcon_(tabId, status)
    if (ref !== undefined) {
      /*#__NOINLINE__*/ revokeOldPorts(ref.ports_) // those in a new page will auto re-connect
    }
  }
}

const onDisconnect = (port: Port): void => {
  let { tabId_: tabId } = port.s, i: number, ref = framesForTab_.get(tabId)
  if (!ref) { return runtimeError_() }
  const ports = ref.ports_
  i = ports.lastIndexOf(port)
  if (!port.s.frameId_) {
    if (i >= 0) {
      framesForTab_.delete(tabId)
      if (Build.MV3 && !OnFirefox && tabId === lastKeptTabId_) { tryToKeepAliveIfNeeded_mv3_non_ff(tabId) }
    }
    return
  }
  if (i === ports.length - 1) {
    --ports.length
  } else if (i >= 0) {
    ports.splice(i, 1)
  }
  if (!ports.length) {
    if (!(ref.flags_ & Frames.Flags.ResReleased)) {
      framesForTab_.delete(tabId)
    }
    if (Build.MV3 && !OnFirefox && tabId === lastKeptTabId_) { tryToKeepAliveIfNeeded_mv3_non_ff(tabId) }
  } else if (port === ref.cur_) {
    ref.cur_ = ports[0]
  }
  return runtimeError_()
}

const _onOmniConnect = (port: Frames.Port, type: PortType, isOmniUrl: boolean): void => {
  if (type & PortType.omnibar) {
    if (isOmniUrl) {
      if (port.s.tabId_ < 0) {
        (port.s as Writable<Frames.Sender>).tabId_ = type & PortType.reconnect ? getNextFakeTabId()
            : cPort ? cPort.s.tabId_ : curTabId_
      }
      port.s.flags_ |= Frames.Flags.isVomnibar
      framesForOmni_.push(port)
      if (!OnChrome) { (port as Frames.BrowserPort).sender.tab = null as never }
      port.onDisconnect.addListener(/*#__NOINLINE__*/ onOmniDisconnect)
      port.onMessage.addListener(/*#__NOINLINE__*/ onMessage)
      type & PortType.reconnect ||
      port.postMessage({ N: kBgReq.omni_init, l: omniPayload_, s: getOmniSecret_(false) })
      return
    }
  } else if (port.s.tabId_ < 0 // e.g.: inside a sidebar on MS Edge
      || (OnChrome && Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
          && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg)
      || port.s.frameId_ === 0
      ) { /* empty */ }
  else {
    executeScript_(port.s.tabId_, port.s.frameId_, [CONST_.VomnibarScript_])
  }
  port.disconnect()
}

const onOmniDisconnect = (port: Port): void => {
  const ref = framesForOmni_, i = ref.lastIndexOf(port)
  if (i === ref.length - 1) {
    --ref.length
  } else if (i >= 0) {
    ref.splice(i, 1)
  }
  return runtimeError_()
}

const _onPageConnect = (port: Port, type: PortType): void => {
  if (type & PortType.otherExtension) {
    port.disconnect()
    return
  }
  (port as Frames.Port).s = false as never
  if (type & PortType.Tee) {
    let taskOnce = setTeeTask_(null, null)
    if (taskOnce && taskOnce.t) {
      taskOnce.d = null
      port.postMessage({ N: kBgReq.omni_runTeeTask, t: taskOnce.t, s: taskOnce.s })
      const callback = (res: any): void => {
        if (taskOnce) {
          clearTimeout(taskOnce.i)
          taskOnce.r && taskOnce.r(res)
        }
        taskOnce = null
      }
      port.onMessage.addListener(callback)
      port.onDisconnect.addListener((): void => { callback(false) })
    } else {
      port.disconnect()
    }
    return
  }
  port.onMessage.addListener(onMessage)
}

const formatPortSender = (port: Port): Frames.Sender => {
  const sender = (port as Frames.BrowserPort).sender
  const tab = sender.tab // || { id: -3, incognito: false }
  if (OnChrome) { sender.tab = null as never }
  return (port as Frames.Port).s = {
    frameId_: sender.frameId || 0, // frameId may not exist if no sender.tab
    flags_: Frames.Flags.blank, status_: Frames.Status.enabled,
    incognito_: tab != null ? tab.incognito : false,
    tabId_: tab != null ? tab.id : -3,
    url_: OnEdge ? sender.url || tab != null && tab.url || "" : sender.url!
  }
}

const revokeOldPorts = (ports_: Frames.Port[]) => {
  for (const port of ports_) {
    if (port.s.frameId_) {
      _safeRefreshPort(port)
    }
  }
}

const _safeRefreshPort = (port: Port): void | /** failed */ 1 => {
  try {
    (port.s.flags_ satisfies Frames.Flags) |= Frames.Flags.ResReleased
    port.onDisconnect.removeListener(onDisconnect)
    port.postMessage({ N: kBgReq.refreshPort })
  } catch {
    port.disconnect()
    return 1
  }
}

export const OnFreeze = (_: unknown, port: Port): void => {
  port.onDisconnect.removeListener(onDisconnect)
  port.s.frameId_ || ((port.s.frameId_ as number) = 2)
  onDisconnect(port)
}

/**
 * @returns "" - in a child frame, so need to send request to content
 * @returns string - valid URL
 * @returns Promise&lt;string> - valid URL or empty string for a top frame in "port's or the current" tab
 */
export const getPortUrl_ = (port?: Port | null, ignoreHash?: boolean, noSender?: BOOL, request?: Req.queryUrl<kFgReq>
    ): PromiseOr<string> => {
  port = port || framesForTab_.get(curTabId_)?.top_ || null
  return port && !noSender && exclusionListening_ && (ignoreHash || exclusionListenHash_) ? port.s.url_
      : new Promise<string>((resolve): void => {
    const webNav = !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId
            || CurCVer_ > BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId - 1)
        && port && port.s.frameId_ && isNotPriviledged(port) ? browserWebNav_() : null
    port ? (!port.s.frameId_ ? tabsGet as never as typeof chrome.webNavigation.getFrame
            : webNav ? webNav.getFrame : (_: unknown, callback: (result: null) => void) => callback(null))(
        webNav ? {tabId: port.s.tabId_, frameId: port.s.frameId_}
          : port.s.tabId_ satisfies Parameters<typeof tabsGet>[0] as never,
        (tab?: chrome.webNavigation.GetFrameResultDetails | Tab | null): void => {
      const url = tab ? tab.url : ""
      if (!url && request) {
        (request as Req.bgUrl<kFgReq>).N = kBgReq.url
        safePost(port!, request as Req.bg<kBgReq.url>)
      }
      resolve(url)
      return runtimeError_()
    }) : getCurTab((tabs): void => {
      resolve(tabs && tabs.length ? getTabUrl(tabs[0]) : "")
      return runtimeError_()
    })
  })
}

export const requireURL_ = <K extends keyof FgReq> (request: Req.queryUrl<K>, ignoreHash?: boolean, noSender?: BOOL
    , port?: Port): Promise<string> | void => {
  type T1 = keyof FgReq
  type Req1 = { [K in T1]: (req: FgReq[K], port: Frames.Port) => void }
  type Req2 = { [K in T1]: <T extends T1>(req: FgReq[T], port: Frames.Port) => void }
  if (!port) { set_cPort(port = cPort || framesForTab_.get(curTabId_)?.top_) }
  const res = getPortUrl_(port, ignoreHash, noSender, request)
  if (typeof res !== "string") {
    return res.then(url => {
      request.u = url
      url && (reqH_ as Req1 as Req2)[request.H](request, port!)
      return url
    })
  } else {
    request.u = res;
    (reqH_ as Req1 as Req2)[request.H](request, port!)
  }
}

export const findCPort = (port: Port | null | undefined): Port | null => {
  const frames = framesForTab_.get(port && port.s.tabId_ >= 0 ? port.s.tabId_ : curTabId_)
  return frames ? frames.cur_ : null
}

export const isExtIdAllowed = (sender: chrome.runtime.MessageSender): boolean | string => {
  const extId: string = sender.id != null ? sender.id : "unknown_sender"
  let url: string | undefined = sender.url, tab = sender.tab
  const list = extAllowList_, stat = list.get(extId)
  if (stat !== true && tab) {
    const ref = framesForTab_.get(tab.id), oldInfo = ref ? ref.unknownExt_ : null
    if (ref && (oldInfo == null || oldInfo !== extId && typeof oldInfo === "string")) {
      ref.unknownExt_ = oldInfo == null ? extId : 2
    }
  }
  if (stat != null) { return stat }
  if (url === vomnibarPage_f) { return true }
  if (!OnChrome && stat == null && url) {
    url = new URL(url).host
    if (list.get(url) === true) {
      list.set(extId, true)
      return true
    }
    if (url !== extId) {
      list.set(url, extId)
    }
  }
  const backgroundLightYellow = "background-color:#fffbe5"
  console.log("%cReceive message from an extension/sender not in the allow list: %c%s",
    backgroundLightYellow, backgroundLightYellow + ";color:red", extId)
  list.set(extId, false)
  return false
}

export const getCurFrames_ = (): Frames.Frames | undefined => framesForTab_.get(cPort ? cPort.s.tabId_ : curTabId_)

export const getFrames_ = (port: Port): Frames.Frames | undefined => framesForTab_.get(port.s.tabId_)

export const indexFrame = (tabId: number, frameId: number): Port | null => {
  const ref = framesForTab_.get(tabId)
  for (const port of ref ? ref.ports_ : []) {
    if (port.s.frameId_ === frameId) {
      return port
    }
  }
  return null
}

export const ensureInnerCSS = (sender: Frames.Sender): string | null => {
  if (sender.flags_ & Frames.Flags.hasCSS) { return null }
  const ref = framesForTab_.get(sender.tabId_)
  ref && (ref.flags_ |= Frames.Flags.userActed)
  sender.flags_ |= Frames.Flags.hasCSS | Frames.Flags.userActed
  return innerCSS_
}

/** `true` means `port` is NOT vomnibar port */
export const isNotVomnibarPage = (port: Frames.Port, noLog: boolean): boolean => {
  let info = port.s, f = info.flags_
  if (f & Frames.Flags.isVomnibar) { return false }
  if (!noLog && !(f & Frames.Flags.SOURCE_WARNED)) {
    console.warn("Receive a request from %can unsafe source page%c (should be vomnibar) :\n %s @ tab %o",
      "color:red", "color:auto", info.url_.slice(0, 128), info.tabId_)
    info.flags_ |= Frames.Flags.SOURCE_WARNED
  }
  return true
}

/** action section */

export const safePost = <K extends keyof FullBgReq>(port: Port, req: Req.bg<K>): BOOL => {
  try {
    const released = port.s.flags_ & Frames.Flags.ResReleased
    released || port.postMessage(req)
    return released ? 0 : 1
  } catch { return 0 }
}

const show2 = (tipId: kTip | undefined, text: string | 0): void => { showHUD(text + "", tipId) }

export const showHUD = (text: string | Promise<string | 0>, tipId?: kTip): void => {
  if (typeof text !== "string") { void text.then(/*#__NOINLINE__*/ show2.bind(null, tipId)); return }
  const isCopy = tipId === kTip.noUrlCopied || tipId === kTip.noTextCopied
  if (isCopy) {
    if (text.startsWith(CONST_.BrowserProtocol_ + "-") && text.includes("://")) {
      text = text.slice(text.indexOf("/", text.indexOf("/") + 2) + 1) || text
    }
    text = text.length > 41 ? text.slice(0, 41) + "\u2026" : text && text + (UseZhLang_ ? "\u3002" : ".")
  }
  if (cPort && !safePost(cPort, {
      N: kBgReq.showHUD, H: ensureInnerCSS(cPort.s), k: isCopy && text ? kTip.copiedIs : tipId || kTip.raw, t: text
  })) {
    set_cPort(null as never)
  }
}

export const showHUDEx = (port: Port | null | undefined, name: I18nNames
    , duration: BgReq[kBgReq.showHUD]["d"], args: (string | number | Promise<string | number> | [I18nNames])[]
    , _name2?: string): void => {
  if (!port) { return }
  let text = _name2 || transEx_(name, args)
  if (typeof text !== "string") {
    void text.then(showHUDEx.bind(null, port, "NS", duration, []))
    return
  }
  safePost(port, {
    N: kBgReq.showHUD, H: ensureInnerCSS(port.s), k: kTip.raw, d: duration, t: text
  })
}

export const ensuredExitAllGrab = (ref: Frames.Frames): void => {
  const msg: Req.bg<kBgReq.exitGrab> = { N: kBgReq.exitGrab }
  for (const p of ref.ports_) {
    if (!(p.s.flags_ & Frames.Flags.userActed)) {
      p.s.flags_ |= Frames.Flags.userActed
      p.postMessage(msg)
    }
  }
  ref.flags_ |= Frames.Flags.userActed
  return
}

export const asyncIterFrames_ = (itemUpdatedFlag: Frames.Flags
    , callback: (frames: Frames.Frames) => void, doesContinue?: () => boolean | void): void => {
  const MIN_ASYNC_ITER = 10
  const knownKeys = keys_(framesForTab_), knownCurTabId = curTabId_
  const iter = (tab: number): number => {
    let frames = framesForTab_.get(tab), weight = 0
    if (frames !== undefined) {
      if (frames.flags_ & Frames.Flags.ResReleased && itemUpdatedFlag) {
        frames.flags_ |= itemUpdatedFlag
      }
      weight = Math.min(frames.ports_.length, 8)
      callback(frames)
    }
    return weight
  }
  if (knownKeys.length >= MIN_ASYNC_ITER) {
    const ind1 = knownKeys.indexOf(knownCurTabId)
    if (ind1 >= 0) {
      knownKeys.splice(ind1, 1)
      iter(knownCurTabId)
    }
    asyncIter_(knownKeys, iter, doesContinue)
  } else {
    knownKeys.forEach(iter)
  }
}

export const complainLimits = (action: string | Promise<string>): void => {
  showHUDEx(cPort, "notAllowA", 0, [action])
}

export const complainNoSession = (): void => {
  !OnChrome || Build.MinCVer >= BrowserVer.MinSessions || CurCVer_ >= BrowserVer.MinSessions
  ? complainLimits("control tab sessions")
  : showHUD(`Vimium C can not control tab sessions before Chrome ${BrowserVer.MinSessions}`)
}

if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
    && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
  framesForTab_.forEach = recencyForTab_.forEach = function (callback: (value: any, key: number) => void): void {
    const map = (this as any as SimulatedMap).map_ as Dict<any> as Dict<Frames.Frames>
    for (const key in map) {
      callback(map[key]!, +key)
    }
  }
}

export const getParentFrame = (tabId: number, curFrameId: number, level: number): Promise<Port | null> => {
  if (!curFrameId || OnChrome && Build.MinCVer < BrowserVer.MinWithFrameId && CurCVer_ < BrowserVer.MinWithFrameId
      || !browserWebNav_()) {
    return Promise.resolve(null)
  }
  if (!OnEdge && level === 1 && (!OnChrome || Build.MinCVer >= BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId
      || CurCVer_ > BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId - 1)) {
    return Q_(browserWebNav_()!.getFrame, { tabId, frameId: curFrameId }).then(frame => {
      const frameId = frame ? frame.parentFrameId : 0
      return frameId > 0 ? indexFrame(tabId, frameId) : null
    })
  }
  return Q_(browserWebNav_()!.getAllFrames, { tabId }).then(frames => {
    let found = false, frameId = curFrameId
    if (!frames) { return null }
    do {
      found = false
      for (const i of frames) {
        if (i.frameId === frameId) {
          frameId = i.parentFrameId
          found = frameId > 0
          break
        }
      }
    } while (found && 0 < --level)
    return frameId > 0 && frameId !== curFrameId ? indexFrame(tabId, frameId) : null
  })
}

const RELEASE_TIMEOUT = Build.NDEBUG ? 1000 * (60 * 4 + 48) : 1000 * 100
const RELEASE_TIMEOUT_IF_NO_ALIVE = 30_000
const MAX_KEEP_ALIVE = Build.NDEBUG ? 5 : 2

const tryToKeepAlive = (rawNotFromInterval?: 1 | TimerType.fake): void => {
  const now = performance.now(), isFromInterval = !Build.MV3 || OnFirefox || rawNotFromInterval !== 1
  if (Build.MV3 && !OnFirefox && _timeoutToTryToKeepAliveOnce_mv3_non_ff) {
    isFromInterval && clearTimeout(_timeoutToTryToKeepAliveOnce_mv3_non_ff)
    _timeoutToTryToKeepAliveOnce_mv3_non_ff = 0
  }
  for (let port of isFromInterval ? framesForOmni_ : []) {
    if (!(port.s.flags_ & Frames.Flags.OldEnough)) {
      (port.s.flags_ satisfies Frames.Flags) |= Frames.Flags.OldEnough
      continue
    }
    const doesRelease = port.s.flags_ !== curTabId_
    ; (Build.MV3 && !OnFirefox || doesRelease) && port.postMessage({ N: kBgReq.omni_refresh, d: doesRelease })
  }
  let oldestToKeepAlive = 0
  if (isFromInterval) {
    const visited: number[] = []
    framesForTab_.forEach((frames, tabId): void => {
      const visit = frames.ports_.length && tabId >= 0 && recencyForTab_.get(tabId) || 0
      visit > 0 && visited.push(visit)
    })
    visited.sort((i, j) => j - i)
    oldestToKeepAlive = Math.max(now - RELEASE_TIMEOUT, visited.length // not need to keep so many
        ? visited[Math.min(MAX_KEEP_ALIVE, visited.length - 1)] - 1000 : 0)
  }
  const enum KKeep {
    None = 0, PrivFresh = 1, PrivWithoutPorts = 2, NormalWoPorts = 3, NormalWithPorts = 4, NormalFresh = 5,
    NormalRefreshed = 6, _mask = "", MIN_NORMAL = NormalWoPorts, MIN_HANDLED = NormalFresh,
  }
  let typeOfFramesToKeep: KKeep & number = KKeep.None, framesToKeep: Frames.Frames | null = null
  const listToRelease: Frames.Frames[] = []
  const lastPrivAlive = Build.MV3 && !OnFirefox && isLastKeptTabPrivate_ ? lastKeptTabId_ : -1
  framesForTab_.forEach((frames, tabId): void => {
    const ports = frames.ports_, portNum = ports.length
    if ((!Build.MV3 || OnFirefox || typeOfFramesToKeep > KKeep.NormalWoPorts) && !portNum) { return }
    if (Build.MV3 && !OnFirefox && (typeOfFramesToKeep < KKeep.MIN_NORMAL
        || portNum && typeOfFramesToKeep === KKeep.NormalWoPorts)) {
      typeOfFramesToKeep = tabId === lastPrivAlive ? portNum ? KKeep.PrivFresh : KKeep.PrivWithoutPorts
          : portNum ? KKeep.NormalWithPorts : KKeep.NormalWoPorts
      framesToKeep = frames
    }
    const mayRelease: Port[] = []
    if (isFromInterval) for (const i of ports) {
      if (i.s.flags_ & Frames.Flags.OldEnough) {
        mayRelease.push(i)
      } else {
        (i.s.flags_ satisfies Frames.Flags) |= Frames.Flags.OldEnough
      }
    }
    if (!mayRelease.length) {
      if (Build.MV3 && !OnFirefox && typeOfFramesToKeep===KKeep.NormalWithPorts && portNum && tabId !== lastPrivAlive) {
        typeOfFramesToKeep = KKeep.NormalFresh, framesToKeep = frames
      }
      return
    }
    const visit = tabId >= 0 && recencyForTab_.get(tabId) || 0
    const doesRelease: boolean = visit < oldestToKeepAlive && tabId !== curTabId_
        && (portNum === 1 && !(frames.flags_ & Frames.Flags.HadIFrames) && ports[0] === frames.top_
             || ports.some(isNotPriviledged))
    if (Build.MV3 && !OnFirefox ? portNum : doesRelease) {
      (!Build.MV3 || OnFirefox || doesRelease) && (frames.flags_ |= Frames.Flags.ResReleased)
      for (const i of mayRelease) { (i.s.flags_ satisfies Frames.Flags) |= Frames.Flags.ResReleased }
      listToRelease.push(frames)
    }
  })
  if (0 as BOOL) { framesToKeep = framesToKeep || framesForTab_.get(0) || null } // just to make tsc happy
  if (Build.MV3 && !OnFirefox && isLastKeptTabPrivate_ && typeOfFramesToKeep > KKeep.MIN_NORMAL - 1) {
    const privFrames = framesForTab_.get(lastKeptTabId_)
    if (privFrames?.cur_.s.url_.startsWith(CONST_.PrivateAlivePage_)) {
      privFrames.flags_ = (privFrames.flags_ & ~Frames.Flags.HadIFrames) | Frames.Flags.ResReleased
      privFrames.ports_.forEach(i => i.s.flags_ |= Frames.Flags.ResReleased)
      listToRelease.push(privFrames)
    }
  }
  const guessedOneToKeep = framesToKeep
  for (const frames of listToRelease) {
    const doesRelease = !Build.MV3 || OnFirefox
        || !!(frames.flags_ & Frames.Flags.ResReleased) && frames !== guessedOneToKeep
    let hadIFrames = !!(frames.flags_ & Frames.Flags.HadIFrames) || frames.ports_.length > 1, failed: BOOL = 0
    const stillAlive: Port[] = []
    for (const port of frames.ports_) {
      if (!(port.s.flags_ & Frames.Flags.ResReleased)) {
        Build.MV3 && !OnFirefox && typeOfFramesToKeep < KKeep.NormalFresh
            && (typeOfFramesToKeep = KKeep.NormalFresh, framesToKeep = frames)
        stillAlive.push(port)
      } else if (!Build.MV3 || OnFirefox || doesRelease && (!hadIFrames || isNotPriviledged(port))) {
        port.disconnect()
        port.s.frameId_ && (frames.flags_ |= Frames.Flags.HadIFrames)
      } else if (Build.MV3 && !OnFirefox) {
        _safeRefreshPort(port) ? failed = 1 : !OnFirefox && typeOfFramesToKeep < KKeep.NormalRefreshed
            && (typeOfFramesToKeep = KKeep.NormalRefreshed, framesToKeep = frames)
      } else {
        stillAlive.push(port)
      }
    }
    if (!Build.NDEBUG && DEBUG) {
      console.log("free ports: tab=%o, release=%o, ports=%o, result.alive=%o", frames.cur_.s.tabId_, doesRelease
          , frames.ports_.length, stillAlive.length)
    }
    if (Build.MV3 && !OnFirefox && frames === guessedOneToKeep) { frames.flags_ &= ~Frames.Flags.ResReleased }
    frames.ports_.length = 0
    Build.MV3 && !OnFirefox ? failed && /** never */ (stillAlive.forEach(_safeRefreshPort), refreshPorts_(frames, 1))
        : stillAlive.length && frames.ports_.push(...stillAlive)
  }
  if (!Build.MV3 || OnFirefox) { return }
  const newAliveTabId = framesToKeep ? framesToKeep.cur_.s.tabId_ : -1
  if (lastKeptTabId_ !== newAliveTabId) {
    if (isLastKeptTabPrivate_) {
      set_isLastKeptTabPrivate_(false)
      tabsGet(lastKeptTabId_, didRemovePriv_)
      if (!Build.NDEBUG && DEBUG) {
        console.log("remove the priv-tab %o and new alive is %o @ %o", lastKeptTabId_, newAliveTabId, Date.now() % 9e5)
      }
    } else if (!Build.NDEBUG && DEBUG) {
      console.log("update last kept tab id to %o @ %o", newAliveTabId, Date.now() % 9e5)
    }
    set_lastKeptTabId_(newAliveTabId)
  } else if (!Build.NDEBUG && DEBUG) {
    console.log("reuse kept tab id: %o @ %o", newAliveTabId, Date.now() % 9e5)
  }
  if (lastKeptTabId_ === -1) {
    settingsCache_.keepWorkerAlive && void createPriv_()
  } else if (typeOfFramesToKeep < KKeep.MIN_HANDLED && typeOfFramesToKeep > KKeep.PrivWithoutPorts - 1) {
    refreshPorts_(framesToKeep!, 0)
  }
}

export const tryToKeepAliveIfNeeded_mv3_non_ff = (removedTabId: number): void => {
  if (!(Build.MV3 && !OnFirefox)) { return }
  if (!(removedTabId === lastKeptTabId_ && !_timeoutToTryToKeepAliveOnce_mv3_non_ff && !isLastKeptTabPrivate_)) {
    return
  }
  for (const item of framesForTab_.values()) {
    if (item.ports_.length) {
      set_lastKeptTabId_(removedTabId)
      return
    }
  }
  const nextCheckTime = (RELEASE_TIMEOUT_IF_NO_ALIVE + 1 - (performance.now() % RELEASE_TIMEOUT_IF_NO_ALIVE)) | 0
  const toWait = nextCheckTime > 3_000 ? Math.max(1_000, nextCheckTime - 5_000) | 0
      : nextCheckTime > 1200 ? 0 : -1
  if (toWait < 0) {
    tryToKeepAlive(1)
    return
  }
  set_lastKeptTabId_(-1)
  _timeoutToTryToKeepAliveOnce_mv3_non_ff = setTimeout(tryToKeepAlive, toWait, 1)
  if (!Build.NDEBUG && DEBUG && removedTabId >= 0) {
    console.log("wait for %o ms to try to keep alive once @ %o", toWait, performance.now() % 3e5)
  }
}

export const refreshPorts_ = (frames: Frames.Frames, forced: BOOL): void => {
  if (!(frames.flags_ & Frames.Flags.HadIFrames) && !isNotPriviledged(frames.cur_)) { return }
  if (!Build.NDEBUG && DEBUG) {
    console.log("refresh ports: tab=%o, forced=%o, flags=%o, ports=%o", frames.cur_.s.tabId_, forced
        , frames.flags_, frames.ports_.length)
  }
  executeScript_(frames.cur_.s.tabId_, -1, null, (_: 0, updates: number): void => { // @ts-ignore
    typeof VApi === "object" && VApi && (VApi as Frames.BaseVApi)
      .q(0, updates) // Frames.RefreshPort
  }, [0, PortType.refreshInBatch | (forced ? PortType.reconnect : 0) | (frames.flags_ & Frames.Flags.MASK_UPDATES)])
  frames.flags_ &= ~(Frames.Flags.ResReleased | Frames.Flags.MASK_UPDATES | Frames.Flags.HadIFrames)
}

const createPriv_ = async (): Promise<void> => {
  if (!Build.NDEBUG && DEBUG) {
    console.log("need to create a new priv-tab to keep alive @ %o", Date.now() % 9e5)
  }
  const wnd = await Q_(getCurWnd, false)
  let windowId = wnd && wnd.type === "normal" ? wnd.id : undefined
  if (windowId == null) {
    const wnds = await Q_(Windows_.getAll, { windowTypes: ["normal"] })
    windowId = wnds && wnds.length ? wnds[0].id : undefined
  }
  const privTab = await Q_(Tabs_.create, { url: CONST_.PrivateAlivePage_, windowId, active: false })
  if (!privTab) { return }
  const tabId = privTab.id
  set_lastKeptTabId_(tabId), set_isLastKeptTabPrivate_(true)
  if (!Build.NDEBUG && DEBUG) {
    console.log("    created a priv-tab of %o", tabId)
  }
  Tabs_.update(tabId, { autoDiscardable: false }, runtimeError_)
  if (!browser_.tabGroups) { return }
  const logErr = (tag: string, err: unknown) => void console.log(tag, err)
  const groupId = await Tabs_.group({ tabIds: [tabId], createProperties: { windowId: privTab.windowId }
      }).catch(Build.NDEBUG ? blank_ : logErr.bind(null, "add group"))
  groupId != null && void browser_.tabGroups.update(groupId, {
    collapsed: true, title: "VimiumC", color: OnChrome ? "grey" : undefined
  }).catch(Build.NDEBUG ? blank_ : logErr.bind(null, "collapse group"))
}

const didRemovePriv_ = (tab: Tab): void => {
  if (!tab) { return runtimeError_() }
  if (tab && tab.url.startsWith(CONST_.PrivateAlivePage_)) {
    const tabId = tab.id
    Tabs_.remove(tabId, (): void => {
      const err = runtimeError_() // e.g.: a user is moving its tab label
      if (err) { set_lastKeptTabId_(tabId), set_isLastKeptTabPrivate_(true) }
      return err
    })
  }
}

const _recoverStates = (frames: Frames.Frames | undefined, port: Port, type: PortType | Frames.Flags): void => {
  (port.s.flags_ satisfies Frames.Flags) |= PortType.hasCSS === <number> Frames.Flags.hasCSS ? type & PortType.hasCSS
      : (type & PortType.hasCSS) && Frames.Flags.hasCSS
  frames || refreshPorts_({ cur_: port, top_: null, ports_: [], lock_: null, flags_: Frames.Flags.HadIFrames }, 0)
  let flag = type as Frames.Flags
  if (!(type & PortType.refreshInBatch)) {
    if (!(type & PortType.hasFocus) // frame is not focused - on refreshing ports of inactive tabs
        || !frames || !(frames.flags_ & Frames.Flags.ResReleased)) { // no old data to sync
      return
    }
    flag = frames.flags_ & (Frames.Flags.MASK_UPDATES | Frames.Flags.HadIFrames)
    if (flag & Frames.Flags.HadIFrames || port.s.frameId_) { refreshPorts_(frames, 0) }
  }
  if (flag & Frames.Flags.SettingsUpdated) {
    port.postMessage({ N: kBgReq.settingsUpdate, d: contentPayload_ })
  }
  if (flag & Frames.Flags.KeyMappingsUpdated) {
    port.postMessage({ N: kBgReq.keyFSM, m: mappedKeyRegistry_, t: mappedKeyTypes_
        , k: flag & Frames.Flags.KeyFSMUpdated ? keyFSM_ : null })
  }
  if (flag & Frames.Flags.CssUpdated && port.s.flags_ & Frames.Flags.hasCSS) {
    (port.s.flags_ satisfies Frames.Flags) |= Frames.Flags.hasFindCSS
    port.postMessage({ N: kBgReq.showHUD, H: innerCSS_, f: OnChrome ? getFindCSS_cr_!(port.s) : findCSS_ })
  }
}

export const waitForPorts_ = (frames: Frames.Frames | undefined, checkCur?: boolean): Promise<void> => {
  const defer = deferPromise_<void>()
  const oldChecked = frames && (checkCur ? frames.cur_ : frames.top_)
  if (!frames || oldChecked && !(oldChecked.s.flags_ & Frames.Flags.ResReleased)) {
    defer.resolve_()
  } else {
    refreshPorts_(frames, 0)
    ; (<RegExpOne> /^(?:http|file|ftp)/i).test(frames.cur_.s.url_) || selectTab(frames.cur_.s.tabId_, selectWndIfNeed)
    let tick = 0, interval = setInterval(() => {
      tick++
      const checked = checkCur ? frames.cur_ : frames.top_
      if (tick === 5 || checked && !(checked.s.flags_ & Frames.Flags.ResReleased)) {
        clearInterval(interval)
        defer.resolve_()
      }
    }, 33)
  }
  return defer.promise_
}

if (!OnChrome || Build.MinCVer >= BrowserVer.BuildMinForOf || CurCVer_ > BrowserVer.BuildMinForOf - 1) {
  setInterval(tryToKeepAlive, RELEASE_TIMEOUT / 2)
}
Build.MV3 && !OnFirefox && (_timeoutToTryToKeepAliveOnce_mv3_non_ff = setTimeout(tryToKeepAlive, 22_000, 1))
