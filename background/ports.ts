import {
  needIcon_, cPort, set_cPort, reqH_, contentPayload_, omniPayload_, innerCSS_, extAllowList_, framesForTab_, findCSS_,
  framesForOmni_, getNextFakeTabId, curTabId_, vomnibarPage_f, OnChrome, CurCVer_, OnEdge, setIcon_,
  keyFSM_, mappedKeyRegistry_, CONST_, mappedKeyTypes_, recencyForTab_, setTeeTask_
} from "./store"
import { asyncIter_, deferPromise_, getOmniSecret_, isNotPriviledged, keys_ } from "./utils"
import {
  removeTempTab, tabsGet, runtimeError_, getCurTab, getTabUrl, browserWebNav_, Q_, executeScript_, getFindCSS_cr_,
  selectTab, selectWndIfNeed
} from "./browser"
import { exclusionListening_, getExcluded_, exclusionListenHash_ } from "./exclusions"
import { I18nNames, transEx_ } from "./i18n"

const DEBUG: BOOL | boolean = 0

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
  }
  let tabId = sender.tabId_
  const ref = tabId >= 0 ? framesForTab_.get(tabId)
      : ((tabId = (sender as Writable<Frames.Sender>).tabId_ = getNextFakeTabId()), undefined)
  const isNewFrameInSameTab = (type & (PortType.isTop | PortType.reconnect)) !== PortType.isTop
  let status: Frames.ValidStatus
  let passKeys: null | string, flags: BgReq[kBgReq.reset]["f"]
  if (ref !== undefined && ref.lock_ !== null && isNewFrameInSameTab) {
    passKeys = ref.lock_.passKeys_
    status = ref.lock_.status_
    flags = status === Frames.Status.disabled ? Frames.Flags.lockedAndDisabled : Frames.Flags.locked
  } else {
    passKeys = exclusionListening_ ? getExcluded_(url, sender) : null
    status = passKeys === null ? Frames.Status.enabled : passKeys ? Frames.Status.partial : Frames.Status.disabled
    flags = Frames.Flags.blank
  }
  sender.status_ = status
  if (ref !== undefined && isNewFrameInSameTab) {
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
    if ((Build.MV3 || Build.LessPorts) && type & Frames.Flags.UrlUpdated || ref === undefined) {
      port.postMessage({ N: kBgReq.reset, p: passKeys, f: flags & Frames.Flags.MASK_LOCK_STATUS })
    }
    /*#__NOINLINE__*/ _recoverStates(ref, port, type as number as Frames.Flags)
  } else {
    port.postMessage({
      N: kBgReq.init, f: flags, c: contentPayload_, p: passKeys,
      m: mappedKeyRegistry_, t: mappedKeyTypes_, k: keyFSM_!
    })
  }
  if (!OnChrome) { (port as Frames.BrowserPort).sender.tab = null as never }
  port.onDisconnect.addListener(onDisconnect)
  port.onMessage.addListener(/*#__NOINLINE__*/ onMessage)
  if (OnChrome && Build.MinCVer < BrowserVer.MinWithFrameId && CurCVer_ < BrowserVer.MinWithFrameId) {
    (sender as Writable<Frames.Sender>).frameId_ = (type & PortType.isTop) ? 0 : ((Math.random() * 9999997) | 0) + 2
  }
  if (ref !== undefined && isNewFrameInSameTab) {
    if (type & PortType.hasFocus) {
      needIcon_ && ref.cur_.s.status_ !== status && setIcon_(tabId, status)
      ref.cur_ = port
    }
    type & PortType.isTop && ((ref as Writable<typeof ref>).top_ = port)
    ref.ports_.push(port)
  } else {
    framesForTab_.set(tabId, {
      cur_: port, top_: type & PortType.isTop ? port : null, ports_: [port],
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
  if (!ref) { return }
  const ports = ref.ports_
  i = ports.lastIndexOf(port)
  if (!port.s.frameId_) {
    i >= 0 && framesForTab_.delete(tabId)
    return
  }
  if (i === ports.length - 1) {
    --ports.length
  } else if (i >= 0) {
    ports.splice(i, 1)
  }
  if (!ports.length) {
    framesForTab_.delete(tabId)
  } else if (port === ref.cur_) {
    ref.cur_ = ports[0]
  }
}

const _onOmniConnect = (port: Frames.Port, type: PortType, isOmniUrl: boolean): void => {
  if (type > PortType.omnibar - 1) {
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

/**
 * @returns "" - in a child frame, so need to send request to content
 * @returns string - valid URL
 * @returns Promise&lt;string> - valid URL or empty string for a top frame in "port's or the current" tab
 */
export const getPortUrl_ = (port?: Port | null, ignoreHash?: boolean, request?: Req.baseFg<kFgReq>
    ): string | Promise<string> => {
  port = port || framesForTab_.get(curTabId_)?.top_
  return port && exclusionListening_ && (ignoreHash || exclusionListenHash_) ? port.s.url_
      : new Promise<string>((resolve): void => {
    const webNav = !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId
            || CurCVer_ > BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId - 1)
        && port && port.s.frameId_ ? browserWebNav_() : null
    port ? (webNav ? webNav.getFrame : tabsGet as never as typeof chrome.webNavigation.getFrame)(
        webNav ? {tabId: port.s.tabId_, frameId: port.s.frameId_}
          : port.s.tabId_ satisfies Parameters<typeof chrome.tabs.get>[0] as never,
        (tab?: chrome.webNavigation.GetFrameResultDetails | Tab | null): void => {
      const url = tab ? tab.url : ""
      if (!url && webNav) {
        (request! as unknown as Req.bg<kBgReq.url>).N = kBgReq.url
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

export const requireURL_ = <k extends keyof FgReq>(request: Req.fg<k> & {u: "url"}, ignoreHash?: true
    ): Promise<string> | void => {
  type T1 = keyof FgReq
  type Req1 = { [K in T1]: (req: FgReq[K], port: Frames.Port) => void }
  type Req2 = { [K in T1]: <T extends T1>(req: FgReq[T], port: Frames.Port) => void }
  set_cPort(cPort || framesForTab_.get(curTabId_)?.top_)
  const res = getPortUrl_(cPort, ignoreHash, request)
  if (typeof res !== "string") {
    return res.then(url => {
      request.u = url as "url"
      url && (reqH_ as Req1 as Req2)[request.H](request, cPort)
      return url
    })
  } else {
    request.u = res as "url"
    (reqH_ as Req1 as Req2)[request.H](request, cPort)
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

const show2 = (tipId: kTip | undefined, text: string): void => { showHUD(text, tipId) }

export const showHUD = (text: string | Promise<string>, tipId?: kTip): void => {
  if (typeof text !== "string") { void text.then(/*#__NOINLINE__*/ show2.bind(null, tipId)); return }
  const isCopy = tipId === kTip.noUrlCopied || tipId === kTip.noTextCopied
  if (isCopy) {
    if (text.startsWith(CONST_.BrowserProtocol_ + "-") && text.includes("://")) {
      text = text.slice(text.indexOf("/", text.indexOf("/") + 2) + 1) || text
    }
    text = text.length > 41 ? text.slice(0, 41) + "\u2026" : text && text + "."
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
      if ((Build.MV3 || Build.LessPorts) && frames.flags_ & Frames.Flags.ResReleased && itemUpdatedFlag) {
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
const MAX_KEEP_ALIVE = Build.NDEBUG ? 5 : 2

; (Build.MV3 || Build.LessPorts) && setInterval((): void => {
  const now = performance.now()
  for (let port of framesForOmni_) {
    if (!(port.s.flags_ & Frames.Flags.OldEnough)) {
      (port.s.flags_ satisfies Frames.Flags) |= Frames.Flags.OldEnough
      continue
    }
    const doesRelease = port.s.flags_ !== curTabId_
    ; (Build.MV3 || doesRelease) && port.postMessage({ N: kBgReq.omni_refresh, d: doesRelease })
  }
  let oldestToKeepAlive = 0
  {
    const visited: number[] = []
    framesForTab_.forEach((frames, tabId): void => {
      const visit = frames.ports_.length && tabId >= 0 && recencyForTab_.get(tabId) || 0
      visit > 0 && visited.push(visit)
    })
    visited.sort((i, j) => j - i)
    oldestToKeepAlive = Math.max(now - RELEASE_TIMEOUT, visited.length
        ? visited[Math.min(MAX_KEEP_ALIVE, visited.length - 1)] : 0) - 1000
  }
  let lastMaxVisit = -1, lastMaxFrames: Frames.Frames | null = null
  const listToRelease: Frames.Frames[] = []
  framesForTab_.forEach((frames, tabId): void => {
    const ports = frames.ports_
    if (!(Build.MV3 && lastMaxVisit >= 0) && !ports.length) { return }
    let hasOld = false
    for (const i of ports) {
      if (i.s.flags_ & Frames.Flags.OldEnough) {
        Build.MV3 && ((i.s.flags_ satisfies Frames.Flags) |= Frames.Flags.ResReleased)
        hasOld = true; break
      }
      (i.s.flags_ satisfies Frames.Flags) |= Frames.Flags.OldEnough
    }
    const visit = tabId >= 0 && recencyForTab_.get(tabId) || 0
    if (Build.MV3 && lastMaxVisit >= -1 && visit > lastMaxVisit
        && (!lastMaxFrames || ports.length || !lastMaxFrames.ports_.length)) {
      lastMaxVisit = visit, lastMaxFrames = frames
    }
    if (!hasOld) { Build.MV3 && ports.length && (lastMaxVisit = -2); return }
    const doesRelease: boolean = visit < oldestToKeepAlive && tabId !== curTabId_
        && (ports.length === 1 && !(frames.flags_ & Frames.Flags.HadIFrames) && ports[0] === frames.top_
             || ports.some(isNotPriviledged))
    if (Build.MV3 ? ports.length : doesRelease) {
      Build.MV3 && !doesRelease || (frames.flags_ = Frames.Flags.ResReleased)
      listToRelease.push(frames)
    }
  })
  for (const frames of listToRelease) {
    const doesRelease = !!(!Build.MV3 || frames.flags_ & Frames.Flags.ResReleased) && frames !== lastMaxFrames
    let hadIFrames = !!(frames.flags_ & Frames.Flags.HadIFrames) || frames.ports_.length > 1, failed: BOOL = 0
    const stillAlive: Port[] = []
    for (const port of frames.ports_) {
      if (Build.MV3 && !(port.s.flags_ & Frames.Flags.ResReleased)) {
        lastMaxVisit = -3
        stillAlive.push(port)
      } else if (doesRelease && (!hadIFrames || isNotPriviledged(port))) {
        port.disconnect()
        Build.MV3 || (port.s.flags_ |= Frames.Flags.ResReleased)
        port.s.frameId_ && (frames.flags_ |= Frames.Flags.HadIFrames)
      } else if (Build.MV3) {
        _safeRefreshPort(port) ? failed = 1 : lastMaxVisit = -4
      } else {
        stillAlive.push(port)
      }
    }
    if (!Build.NDEBUG && DEBUG) {
      console.log("free ports: tab=%o, release=%o, ports=%o, result.alive=%o", frames.cur_.s.tabId_, doesRelease
          , frames.ports_.length, stillAlive.length)
    }
    frames.ports_.length = 0
    Build.MV3 ? failed && /** never */ (stillAlive.forEach(_safeRefreshPort), refreshPorts_(frames, 1))
        : stillAlive.length && frames.ports_.push(...stillAlive)
  }
  if (Build.MV3 && lastMaxVisit >= 0) {
    refreshPorts_(lastMaxFrames!, 0)
  }
}, RELEASE_TIMEOUT / 2)

export const refreshPorts_ = Build.MV3 || Build.LessPorts ? (frames: Frames.Frames, forced: BOOL): void => {
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
} : 0 as never

const _recoverStates = (frames: Frames.Frames | undefined, port: Port, type: PortType | Frames.Flags): void => {
  (port.s.flags_ satisfies Frames.Flags) |= PortType.hasCSS === <number> Frames.Flags.hasCSS ? type & PortType.hasCSS
      : (type & PortType.hasCSS) && Frames.Flags.hasCSS
  frames || refreshPorts_({ cur_: port, top_: null, ports_: [], lock_: null, flags_: Frames.Flags.Default }, 0)
  if (!(Build.MV3 || Build.LessPorts)) { return }
  if (!(type & PortType.refreshInBatch)) {
    if (!(type & PortType.hasFocus) // frame is not focused - on refreshing ports of inactive tabs
        || !frames || !(frames.flags_ & Frames.Flags.ResReleased)) { // no old data to sync
      return
    }
    type = frames.flags_ & (Frames.Flags.MASK_UPDATES | Frames.Flags.HadIFrames)
    if (type & Frames.Flags.HadIFrames || port.s.frameId_) { refreshPorts_(frames, 0) }
  }
  if (type & Frames.Flags.SettingsUpdated) {
    port.postMessage({ N: kBgReq.settingsUpdate, d: contentPayload_ })
  }
  if (type & Frames.Flags.KeyMappingsUpdated) {
    port.postMessage({ N: kBgReq.keyFSM, m: mappedKeyRegistry_, t: mappedKeyTypes_
        , k: type & Frames.Flags.KeyFSMUpdated ? keyFSM_ : null })
  }
  if (type & Frames.Flags.CssUpdated && port.s.flags_ & Frames.Flags.hasCSS) {
    (port.s.flags_ satisfies Frames.Flags) |= Frames.Flags.hasFindCSS
    port.postMessage({ N: kBgReq.showHUD, H: innerCSS_, f: OnChrome ? getFindCSS_cr_!(port.s) : findCSS_ })
  }
}

export const waitForPorts_ = (frames: Frames.Frames | undefined): Promise<void> => {
  if (!(Build.MV3 || Build.LessPorts)) { return Promise.resolve() }
  const defer = deferPromise_<void>()
  if (!frames || !(frames.flags_ & Frames.Flags.ResReleased)) {
    defer.resolve_()
  } else {
    refreshPorts_(frames, 0)
    ; (<RegExpOne> /^(?:http|file|ftp)/i).test(frames.cur_.s.url_) || selectTab(frames.cur_.s.tabId_, selectWndIfNeed)
    let tick = 0, interval = setInterval(() => {
      tick++
      if (tick === 5 || frames.top_ && !(frames.top_.s.flags_ & Frames.Flags.ResReleased)) {
        clearInterval(interval)
        defer.resolve_()
      }
    }, 33)
  }
  return defer.promise_
}
