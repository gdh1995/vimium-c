import { removeTempTab, tabsGet, runtimeError_, getCurTab, getTabUrl, browserTabs, browserWebNav } from "./browser"
import { mappedKeyTypes_ } from "./key_mappings"
import {
  needIcon_, NoFrameId, cPort, getSecret, set_cPort, cKey, reqH_, contentPayload, omniPayload, settings, innerCSS_,
  framesForOmni, framesForTab, getNextFakeTabId
} from "./store"

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
    port.postMessage<2>({ N: kBgReq.msg, m: (request as Req.fgWithRes<T>).i,
      r: (reqH_ as {
        [T2 in ResK]: (req: Req.fgWithRes<T2>["a"], port: Frames.Port) => FgRes[T2]
      } as {
        [T2 in ResK]: <T3 extends ResK>(req: Req.fgWithRes<T3>["a"], port: Frames.Port) => FgRes[T3]
      })[(request as Req.fgWithRes<T>).c]((request as Req.fgWithRes<T>).a, port)
    })
  }
}

export const OnConnect = (port: Frames.Port, type: number): void => {
  const sender = /*#__NOINLINE__*/ formatPortSender(port), { tabId_: tabId, url_: url } = sender
    , ref = framesForTab.get(tabId)
    , isOmni = url === settings.cache_.vomnibarPage_f
  let status: Frames.ValidStatus = Frames.Status.enabled
  if (type >= PortType.omnibar || isOmni) {
    if (type < PortType.knownStatusBase || isOmni) {
      if (/*#__NOINLINE__*/ onOmniConnect(port, tabId, type)) {
        return
      }
      sender.flags_ = Frames.Flags.userActed
    } else if (type === PortType.CloseSelf) {
      Build.BTypes & ~BrowserType.Chrome && tabId >= 0 && !sender.frameId_ &&
      removeTempTab(tabId, (port as Frames.BrowserPort).sender.tab!.windowId, sender.url_)
      return
    } else {
      status = ((type >>> PortType.BitOffsetOfKnownStatus) & PortType.MaskOfKnownStatus) - 1
      if (type & PortType.isLocked && status === Frames.Status.partial) {
        status = type & PortType.isLockedAsDisabled ? Frames.Status.disabled : Frames.Status.enabled
      }
      sender.flags_ = ((type & PortType.isLocked) ? Frames.Flags.lockedAndUserActed : Frames.Flags.userActed
        ) + ((type & PortType.hasCSS) && Frames.Flags.hasCSS)
    }
  }
  if (type >= PortType.knownStatusBase) {
    port.postMessage({ N: kBgReq.settingsUpdate, d: contentPayload })
  } else {
    let pass: null | string, flags: Frames.Flags = Frames.Flags.blank
    if (ref && ((flags = sender.flags_ = ref.cur_.s.flags_ & Frames.Flags.InheritedFlags) & Frames.Flags.locked)) {
      status = ref.cur_.s.status_
      // @todo: rewrite framesForTab to store forced passKeys
      pass = status !== Frames.Status.disabled ? null : ""
    } else {
      pass = Backend_.getExcluded_(url, sender)
      status = pass === null ? Frames.Status.enabled : pass ? Frames.Status.partial : Frames.Status.disabled
    }
    port.postMessage({
      N: kBgReq.init, s: flags, c: contentPayload, p: pass,
      m: CommandsData_.mappedKeyRegistry_, t: mappedKeyTypes_, k: CommandsData_.keyFSM_
    })
  }
  sender.status_ = status
  if (Build.BTypes & ~BrowserType.Chrome) { (port as Frames.BrowserPort).sender.tab = null as never }
  port.onDisconnect.addListener(/*#__NOINLINE__*/ onDisconnect)
  port.onMessage.addListener(/*#__NOINLINE__*/ onMessage)
  if (ref) {
    ref.ports_.push(port)
    if (type & PortType.hasFocus) {
      if (needIcon_ && ref.cur_.s.status_ !== status) {
        Backend_.setIcon_(tabId, status)
      }
      ref.cur_ = port
    }
    if (!sender.frameId_ && !ref.top_) {
      (ref as Writable<Frames.Frames>).top_ = port
    }
  } else {
    framesForTab.set(tabId, {
      cur_: port, top_: sender.frameId_ ? null : port, ports_: [port],
      lock_: null, flags_: Frames.Flags.Default
    })
    status !== Frames.Status.enabled && needIcon_ && Backend_.setIcon_(tabId, status)
  }
  if (Build.MinCVer < BrowserVer.MinWithFrameId && Build.BTypes & BrowserType.Chrome && NoFrameId) {
    (sender as Writable<Frames.Sender>).frameId_ = (type & PortType.isTop) ? 0 : ((Math.random() * 9999997) | 0) + 2
  }
}

const onDisconnect = (port: Port): void => {
  let { tabId_: tabId } = port.s, i: number, ref = framesForTab.get(tabId)
  if (!ref) { return }
  const ports = ref.ports_
  i = ports.lastIndexOf(port)
  if (!port.s.frameId_) {
    i >= 0 && framesForTab.delete(tabId)
    return
  }
  if (i === ports.length - 1) {
    --ports.length
  } else if (i >= 0) {
    ports.splice(i, 1)
  }
  if (!ports.length) {
    framesForTab.delete(tabId)
  } else if (port === ref.cur_) {
    ref.cur_ = ports[0]
  }
}

const onOmniConnect = (port: Frames.Port, tabId: number, type: PortType): boolean => {
  if (type >= PortType.omnibar) {
    if (!isNotVomnibarPage(port, false)) {
      if (tabId < 0) {
        (port.s as Writable<Frames.Sender>).tabId_ = type !== PortType.omnibar ? getNextFakeTabId()
            : cPort ? cPort.s.tabId_ : TabRecency_.curTab_
      }
      framesForOmni.push(port)
      if (Build.BTypes & ~BrowserType.Chrome) { (port as Frames.BrowserPort).sender.tab = null as never }
      port.onDisconnect.addListener(/*#__NOINLINE__*/ onOmniDisconnect)
      port.onMessage.addListener(/*#__NOINLINE__*/ onMessage)
      type === PortType.omnibar &&
      port.postMessage({ N: kBgReq.omni_init, l: omniPayload, s: getSecret() })
      return true
    }
  } else if (tabId < 0 // should not be true; just in case of misusing
      || (Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg && Build.BTypes & BrowserType.Chrome
          && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg)
      || port.s.frameId_ === 0
      ) { /* empty */ }
  else {
    browserTabs.executeScript(tabId, {
      file: settings.CONST_.VomnibarScript_, frameId: port.s.frameId_, runAt: "document_start"
    }, runtimeError_)
    port.disconnect()
    return true
  }
  return false
}

const onOmniDisconnect = (port: Port): void => {
  const ref = framesForOmni, i = ref.lastIndexOf(port)
  if (i === ref.length - 1) {
    --ref.length
  } else if (i >= 0) {
    ref.splice(i, 1)
  }
}

const formatPortSender = (port: Port): Frames.Sender => {
  const sender = (port as Frames.BrowserPort).sender
  const tab = sender.tab || (Build.BTypes & BrowserType.Edge ? {
      id: getNextFakeTabId(), url: "", incognito: false } : { id: getNextFakeTabId(), incognito: false })
  const url = Build.BTypes & BrowserType.Edge ? sender.url || tab.url || "" : sender.url!
  if (!(Build.BTypes & ~BrowserType.Chrome)) { sender.tab = null as never }
  return (port as Frames.Port).s = {
    frameId_: sender.frameId || 0, // frameId may not exist if no sender.tab
    incognito_: tab.incognito, status_: Frames.Status.enabled, flags_: Frames.Flags.blank, tabId_: tab.id, url_: url
  }
}

/** @see {#BackendHandlers.getPortUrl_} */
export const getPortUrl = (port?: Port | null, ignoreHash?: boolean, request?: Req.baseFg<kFgReq>
    ): string | Promise<string> => {
  port = port || indexFrame(TabRecency_.curTab_, 0)
  return port && Exclusions.rules_.length && (ignoreHash || Exclusions._listeningHash) ? port.s.url_
      : new Promise<string>((resolve): void => {
    const webNav = Build.BTypes & ~BrowserType.Edge
        && (!(Build.BTypes & BrowserType.Edge) || OnOther !== BrowserType.Edge)
        && (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.MinCVer >= BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId
            || CurCVer_ > BrowserVer.Min$webNavigation$$getFrame$IgnoreProcessId - 1)
        && port && port.s.frameId_ ? browserWebNav() : null
    port ? (webNav ? webNav.getFrame : tabsGet as never as typeof chrome.webNavigation.getFrame)(
        webNav ? {tabId: port.s.tabId_, frameId: port.s.frameId_}
          : port.s.tabId_ as Parameters<typeof chrome.tabs.get>[0] as never,
        (tab?: chrome.webNavigation.GetFrameResultDetails | chrome.tabs.Tab | null): void => {
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

export const requireURL = <k extends keyof FgReq>(request: Req.fg<k> & {u: "url"}, ignoreHash?: true): void => {
  type T1 = keyof FgReq
  type Req1 = { [K in T1]: (req: FgReq[K], port: Frames.Port) => void }
  type Req2 = { [K in T1]: <T extends T1>(req: FgReq[T], port: Frames.Port) => void }
  set_cPort(cPort || indexFrame(TabRecency_.curTab_, 0))
  const res = getPortUrl(cPort, ignoreHash, request)
  if (typeof res !== "string") {
    res.then(url => {
      request.u = url as "url"
      url && (reqH_ as Req1 as Req2)[request.H](request, cPort)
    })
  } else {
    request.u = res as "url"
    (reqH_ as Req1 as Req2)[request.H](request, cPort)
  }
}

export const findCPort = (port: Port | null | undefined): Port | null => {
  const frames = framesForTab.get(port ? port.s.tabId_ : TabRecency_.curTab_)
  return frames ? frames.cur_ : null as never as Port
}

export const isExtIdAllowed = (extId: string | null | undefined, url: string | undefined): boolean | string => {
  if (extId == null) { extId = "unknown_sender" }
  const list = settings.extAllowList_, stat = list.get(extId)
  if (stat != null) { return stat }
  if (url === settings.cache_.vomnibarPage_f) { return true }
  if (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
      && stat == null && url) {
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

export const indexFrame = (tabId: number, frameId: number): Port | null => {
  const ref = framesForTab.get(tabId)
  if (frameId === 0) { return ref ? ref.top_ : null }
  for (const port of ref ? ref.ports_ : []) {
    if (port.s.frameId_ === frameId) {
      return port
    }
  }
  return null
}

export const ensureInnerCSS = (sender: Frames.Sender): string | null => {
  if (sender.flags_ & Frames.Flags.hasCSS) { return null }
  sender.flags_ |= Frames.Flags.hasCSSAndActed
  return innerCSS_
}

export const onExitGrab = (_0: FgReq[kFgReq.exitGrab], port: Port): void => {
  const ref = framesForTab.get(port.s.tabId_)
  if (!ref) { return }
  ref.cur_.s.flags_ |= Frames.Flags.userActed
  if (ref.ports_.length < 2) { return }
  const msg: Req.bg<kBgReq.exitGrab> = { N: kBgReq.exitGrab }
  for (const p of ref.ports_) {
    if (p !== port) {
      p.postMessage(msg)
      p.s.flags_ |= Frames.Flags.userActed
    }
  }
}

/** `true` means `port` is NOT vomnibar port */
export const isNotVomnibarPage = (port: Frames.Port, noLog: boolean): boolean => {
  let info = port.s, f = info.flags_
  if (!(f & Frames.Flags.vomnibarChecked)) {
    f |= Frames.Flags.vomnibarChecked |
      (info.url_ === settings.cache_.vomnibarPage_f || info.url_ === settings.CONST_.VomnibarPageInner_
        ? Frames.Flags.isVomnibar : 0)
    info.flags_ = f
  }
  if (f & Frames.Flags.isVomnibar) { return false }
  if (!noLog && !(f & Frames.Flags.SOURCE_WARNED)) {
    console.warn("Receive a request from %can unsafe source page%c (should be vomnibar) :\n %s @ tab %o",
      "color:red", "color:auto", info.url_.slice(0, 128), info.tabId_)
    info.flags_ |= f
  }
  return true
}

/** action section */

export const safePost = <K extends keyof FullBgReq>(port: Port, req: Req.bg<K>): BOOL => {
  try {
    port.postMessage(req)
    return 1
  } catch { return 0 }
}

export const focusFrame = (port: Port, css: boolean, mask: FrameMaskType): void => {
  port.postMessage({ N: kBgReq.focusFrame, H: css ? ensureInnerCSS(port.s) : null, m: mask, k: cKey, c: 0 })
}

export const sendFgCmd = <K extends keyof CmdOptions> (cmd: K, css: boolean, opts: CmdOptions[K]): void => {
  portSendFgCmd(cPort, cmd, css, opts, 1)
}

export const portSendFgCmd = <K extends keyof CmdOptions> (
    port: Port, cmd: K, css: boolean | BOOL, opts: CmdOptions[K], count: number): void => {
  port.postMessage<1, K>({ N: kBgReq.execute, H: css ? ensureInnerCSS(port.s) : null, c: cmd, n: count, a: opts })
}

export const showHUD = (text: string, isCopy?: kTip): void => {
  if (isCopy) {
    if (text.startsWith(!(Build.BTypes & ~BrowserType.Firefox) ? "moz-" : "chrome-") && text.includes("://")) {
      text = text.slice(text.indexOf("/", text.indexOf("/") + 2) + 1) || text
    }
    text = (text.length > 41 ? text.slice(0, 41) + "\u2026" : text + ".")
  }
  if (cPort && !safePost(cPort, {
      N: kBgReq.showHUD, H: ensureInnerCSS(cPort.s), k: isCopy ? text ? kTip.copiedIs : isCopy : kTip.raw, t: text
  })) {
    set_cPort(null)
  }
}

export const complainLimits = (action: string): void => { showHUD(trans_("notAllowA", [action])) }

export const complainNoSession = (): void => {
  (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
  || Build.MinCVer >= BrowserVer.MinSessions || CurCVer_ >= BrowserVer.MinSessions
  ? complainLimits("control tab sessions")
  : showHUD(`Vimium C can not control tab sessions before Chrome ${BrowserVer.MinSessions}`)
}


if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.BuildMinForOf) {
  framesForTab.values = (): any[] => {
    let cur: IteratorResult<unknown>
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
      const res: unknown[] = []
      const map = (framesForTab as any as SimulatedMap).map_ as Dict<any> as Dict<Frames.Frames>
      for (let key in map) { res.push(map[key]) }
      return res
    } else {
      const iter = (Map.prototype as any).values.call(framesForTab) as IterableIterator<unknown>
      if (Build.MinCVer < BrowserVer.Min$Array$$From && CurCVer_ < BrowserVer.Min$Array$$From)  {
        const res: any[] = []
        while (cur = iter.next(), !cur.done) { res.push(cur.value) }
        return res
      } else {
        return Array.from(iter as any)
      }
    }
  }
}
