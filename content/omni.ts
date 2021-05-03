/// <reference path="../lib/base.omni.d.ts" />
import {
  injector, isAlive_, keydownEvents_, readyState_, timeout_, clearTimeout_, loc_, recordLog, chromeVer_, math, OnChrome,
  interval_, clearInterval_, locHref, vApi, createRegExp, isTY, safeObj, isTop, OnFirefox, OnEdge, safeCall
} from "../lib/utils"
import { removeHandler_, replaceOrSuppressMost_, getMappedKey, isEscape_ } from "../lib/keyboard_utils"
import {
  isHTML_, fullscreenEl_unsafe_, setDisplaying_s, createElement_, removeEl_s, setClassName_s, setOrRemoveAttr_s,
  toggleClass_s
} from "../lib/dom_utils"
import { getViewBox_, docZoom_, dScale_, prepareCrop_, bZoom_, wndSize_, viewportRight } from "../lib/rect"
import { beginScroll, scrollTick } from "./scroller"
import {
  getSelectionText, adjustUI, setupExitOnClick, addUIElement, getParentVApi, evalIfOK, checkHidden, kExitOnClick,
} from "./dom_ui"
import { tryNestedFrame } from "./link_hints"
import { insert_Lock_ } from "./insert"
import { hudTip, hud_box } from "./hud"
import { post_, send_ } from "./port"

export declare const enum Status {
  NeedRedo = -3, KeepBroken = -2, NotInited = -1, Inactive = 0, Initing = 1, ToShow = 2, Showing = 3
}
interface OmniPort {
  postMessage<K extends keyof VomnibarNS.CReq> (this: OmniPort, msg: VomnibarNS.CReq[K]): void | 1
  close (this: OmniPort): void | 1
}
interface IFrameWindow extends Window {
  onmessage (this: void, ev: { source: Window; data: VomnibarNS.MessageData; ports: VomnibarNS.IframePort[] }): void | 1
}
type BaseFullOptions = CmdOptions[kFgCmd.vomnibar] & VomnibarNS.BaseFgOptions & Partial<VomnibarNS.ContentOptions>
      & SafeObject & OptionsWithForce
interface FullOptions extends BaseFullOptions {
  /** top URL */ u?: string
  /** request Name */ N?: VomnibarNS.kCReq.activate
}

let box: HTMLIFrameElement & { contentWindow: IFrameWindow } & SafeHTMLElement | null = null
let portToOmni: OmniPort = null as never
let status = Status.NotInited
let omniOptions: VomnibarNS.FgOptionsToFront | null = null
let secondActivateWithNewOptions: (() => void) | null = null
let timer: ValidTimeoutID = TimerID.None

export { box as omni_box, status as omni_status }

type InnerHide = (fromInner?: 1 | null) => void
export const hide = ((fromInner?: 1 | null): void => {
    const oldIsActive = status > Status.Inactive
    status = Status.Inactive
    setupExitOnClick(kExitOnClick.vomnibar | kExitOnClick.REMOVE)
    if (fromInner == null) {
      oldIsActive && postToOmni(VomnibarNS.kCReq.hide)
      return
    }
    // needed, in case the iframe is focused and then a `<esc>` is pressed before removing suppressing
    removeHandler_(kHandler.omni)
    oldIsActive || focus()
    if (OnChrome && Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval) {
      let style_old_cr = box!.style
      style_old_cr!.height = style_old_cr!.top = ""
      setDisplaying_s(box!)
    } else {
      box!.style.cssText = "display:none"
    }
}) as InnerHide as (_arg?: null) => void

export const activate = function (options: FullOptions, count: number): void {

const init = ({k: secret, v: page, t: type, i: inner}: FullOptions): void => {
    const reload = (): void => {
      type = VomnibarNS.PageType.inner
      setOrRemoveAttr_s(el, kRef)
      // not skip the line below: in case main world JS adds some sandbox attributes
      setOrRemoveAttr_s(el,"sandbox")
      el.src = page = inner!
      omniOptions && (omniOptions.t = type)
    }
    const el = createElement_("iframe") as NonNullable<typeof box>, kRef = "referrerPolicy"
    setClassName_s(el, "R UI Omnibar")
    setDisplaying_s(el)
    if (type !== VomnibarNS.PageType.web) { /* empty */ }
    else if (createRegExp(kTip.nonLocalhostRe, "i").test(page) && !(<RegExpOne> /^http:/).test(locHref())) {
      // not allowed by Chrome; recheck because of `tryNestedFrame`
      reload();
    } else {
      el[kRef] = "no-referrer";
      // if set .sandbox to "allow-scripts", then wnd.postMessage(msg, origin, [channel]) fails silently
    }
    el.src = page;
    let loaded: BOOL = 0, initMsgInterval: ValidIntervalID = TimerID.None, slowLoadTimer: ValidTimeoutID | undefined
    el.onload = (event): void => {
      if (OnEdge
          || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
          || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredShadowDOMV1) {
        if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
            ? !event.isTrusted : event.isTrusted === false) {
          return
        }
      }
      loaded = 1
      clearTimeout_(slowLoadTimer!) // safe even if undefined
      if (!isAlive_) { return }
      if (type !== VomnibarNS.PageType.inner && safeCall(isAboutBlank_throwable)) {
        recordLog(kTip.logOmniFallback)
        reload()
        return
      }
      timeout_((i?: TimerType.fake): void => {
        clearInterval_(initMsgInterval)
        const ok = !isAlive_ || status !== Status.Initing
        if (OnFirefox ? ok : ok || i) {
          // only clear `onload` when receiving `VomnibarNS.kFReq.iframeIsAlive`, to avoid checking `i`
          isAlive_ && secondActivateWithNewOptions && secondActivateWithNewOptions()
          return
        }
        if (type !== VomnibarNS.PageType.inner) { reload(); return }
        resetWhenBoxExists()
        focus();
        status = Status.KeepBroken
        activate(safeObj(null), 1)
      }, 400)
      const doPostMsg = (postMsgStat?: TimerType.fake | 1): void => {
        const wnd = el.contentWindow, isFile = page.startsWith("file:")
        if (status !== Status.Initing || !wnd
            || postMsgStat !== 1 && safeCall(isAboutBlank_throwable) || isFile && el.src !== page) { return }
        const channel = new MessageChannel();
        portToOmni = channel.port1;
        (portToOmni as typeof channel.port1).onmessage = onOmniMessage
        const sec: VomnibarNS.MessageData = [secret, omniOptions as VomnibarNS.FgOptionsToFront]
        wnd.postMessage(sec, !isFile ? new URL(page).origin : "*" // lgtm [js/cross-window-information-leak]
            , [channel.port2])
      }
      type === VomnibarNS.PageType.web ? initMsgInterval = interval_(doPostMsg, 66) : doPostMsg(1)
    };
    addUIElement(box = el, AdjustType.MustAdjust, hud_box)
    slowLoadTimer = type !== VomnibarNS.PageType.inner ? timeout_(function (i): void {
      clearInterval_(initMsgInterval)
      loaded || (OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) ||
      reload()
    }, 2000) : TimerID.None
}

const resetWhenBoxExists = (redo?: boolean): void | 1 => {
    const oldStatus = status
    if (oldStatus === Status.NotInited) { return; }
    status = Status.NotInited
    portToOmni && portToOmni.close()
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
        && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted) {
      box!.onload = null as never
    }
    removeEl_s(box!)
    portToOmni = box = omniOptions = null as never
    refreshKeyHandler(); // just for safer code
    if (secondActivateWithNewOptions) { secondActivateWithNewOptions(); }
    else if (redo && oldStatus > Status.ToShow - 1) {
      post_({ H: kFgReq.vomnibar, r: true, i: true })
    }
}

const isAboutBlank_throwable = (): boolean | null => {
      const doc = box!.contentDocument
      return doc && doc.URL === "about:blank"
}

const onOmniMessage = function (this: OmniPort, msg: { data: any, target?: MessagePort }): void {
    type Req = VomnibarNS.FReq;
    type ReqTypes<K> = K extends keyof Req ? Req[K] & VomnibarNS.Msg<K> : never;
    const data = msg.data as ReqTypes<keyof Req>
    switch (data.N) {
    case VomnibarNS.kFReq.iframeIsAlive:
      status = Status.ToShow
      portToOmni = OnChrome && Build.MinCVer < BrowserVer.MinTestedES6Environment ? this : msg.target! as OmniPort
      !data.o && omniOptions && postToOmni<VomnibarNS.kCReq.activate>(omniOptions)
      box!.onload = omniOptions = null as never
      break;
    case VomnibarNS.kFReq.style:
      const style = box!.style
      style.height = math.ceil(data.h / docZoom_
          / (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && OnChrome ? wndSize_(2) : 1)) + "px"
      if (status === Status.ToShow) {
        status = Status.Showing
        const maxBoxHeight = data.m!,
        topHalfThreshold = maxBoxHeight * 0.6 + VomnibarNS.PixelData.MarginTop *
            (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && OnChrome ? wndSize_(2) : 1),
        top = screenHeight_ > topHalfThreshold * 2 ? ((50 - maxBoxHeight * 0.6 / screenHeight_ * 100) | 0
            ) + (canUseVW ? "vh" : "%") : ""
        style.top = !Build.NoDialogUI && VimiumInjector === null && loc_.hash === "#dialog-ui" ? "8px" : top;
        setDisplaying_s(box!, 1)
        timeout_(refreshKeyHandler, 160)
      }
      break;
    case VomnibarNS.kFReq.focus: focus(); keydownEvents_[data.l] = 1; break
    case VomnibarNS.kFReq.hide: (hide as InnerHide)(1); break
    case VomnibarNS.kFReq.scroll: beginScroll(0, data.k, data.b); break
    case VomnibarNS.kFReq.scrollGoing: // no break;
    case VomnibarNS.kFReq.scrollEnd: scrollTick((VomnibarNS.kFReq.scrollEnd - data.N) as BOOL); break
    case VomnibarNS.kFReq.evalJS: evalIfOK(data); break
    case VomnibarNS.kFReq.broken: focus(); // no break;
    case VomnibarNS.kFReq.unload: isAlive_ && resetWhenBoxExists(data.N === VomnibarNS.kFReq.broken); break
    case VomnibarNS.kFReq.hud: hudTip(data.k); break
    }
} as <K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }) => void | 1

const refreshKeyHandler = (): void => {
  status < Status.Showing ? status < Status.Inactive + 1 ? removeHandler_(kHandler.omni) : 0
      : replaceOrSuppressMost_(kHandler.omni, ((event: HandlerNS.Event | string): HandlerResult => {
    if (insert_Lock_()) { return HandlerResult.Nothing; }
    event = getMappedKey(event as HandlerNS.Event, kModeId.Omni)
    if (isEscape_(event)) { hide(); return HandlerResult.Prevent }
    if (event === kChar.f1 || event === kChar.f2) {
      focusOmni()
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  }) as (event: HandlerNS.Event) => HandlerResult)
}

  const timer1 = timeout_(refreshKeyHandler, GlobalConsts.TimeOfSuppressingTailKeydownEvents)
  const scale = wndSize_(2)
  let url = options.url, upper = 0, screenHeight_ = 0 // unit: physical pixel (if C<52)
  // hide all further key events to wait iframe loading and focus changing from JS
  replaceOrSuppressMost_(kHandler.omni)
  secondActivateWithNewOptions = null
  if (checkHidden(kFgCmd.vomnibar, options, count)) { return }
  if (status === Status.KeepBroken) {
    return hudTip(kTip.omniFrameFail, 2000)
  }
  if (!options || !options.k || !options.v) { return; }
  if (readyState_ > "l") {
    if (!timer) {
      clearTimeout_(timer1)
      timer = timeout_(activate.bind(0, options, count), 500)
      return
    }
  }
  timer = TimerID.None
  if (isTop || !options.u || !isTY(options.u)) {
    options.u = vApi.u()
  }
  if (url === true || count !== 1 && url == null) {
    // update options.url to string, so that this block can only run once per command
    if (options.url = url = url ? getSelectionText() : "") {
      options.newtab = 1
    }
  }
  let parApi: ReturnType<typeof getParentVApi>
  if (!isTop && !options.$forced) { // check $forced to avoid dead loops
    if (parent === top && !fullscreenEl_unsafe_() && (parApi = getParentVApi())) {
      parApi.f(kFgCmd.vomnibar, options, count)
    } else {
      post_({ H: kFgReq.gotoMainFrame, f: 0, c: kFgCmd.vomnibar, n: count, a: options })
    }
    return
  }
  if (!isHTML_()) { return; }
  omniOptions = null
  getViewBox_()
  // `canUseVW` is computed for the gulp-built version of vomnibar.html
  const canUseVW = (!OnChrome || Build.MinCVer >= BrowserVer.MinCSSWidthUnit$vw$InCalc
          || chromeVer_ > BrowserVer.MinCSSWidthUnit$vw$InCalc - 1)
      && !fullscreenEl_unsafe_() && docZoom_ === 1 && dScale_ === 1
  let width = canUseVW ? wndSize_(1) : (prepareCrop_()
      , OnFirefox ? viewportRight : viewportRight * docZoom_ * bZoom_)
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent) {
    options.w = width * scale
    options.h = screenHeight_ = wndSize_() * scale
  } else {
    options.w = width
    options.h = screenHeight_ = wndSize_()
  }
  options.z = scale
  if (!(Build.NDEBUG || Status.Inactive - Status.NotInited === 1)) {
    console.log("Assert error: Status.Inactive - Status.NotInited === 1")
  }
  box && adjustUI()
  if (status === Status.NotInited) {
    if (!options.$forced) { // re-check it for safety
      options.$forced = 1
    }
    if (tryNestedFrame(kFgCmd.vomnibar, options, count)) { return; }
    status = Status.Initing
    init(options)
  } else if (safeCall(isAboutBlank_throwable)) {
    secondActivateWithNewOptions = activate.bind(0, options, count);
    (status > Status.ToShow - 1 || timeout_ == interval_) && resetWhenBoxExists()
    return
  } else if (status === Status.Inactive) {
    status = Status.ToShow
  } else if (status > Status.ToShow) {
    focusOmni()
    status = Status.ToShow
  }
  toggleClass_s(box!, "O2", !canUseVW)
  options.e && setupExitOnClick(kExitOnClick.vomnibar)
  if (url != null) {
    url = options.url = url || options.u
    upper = count > 1 ? 1 - count : count < 0 ? -count : 0
  }
  options.k = 0; options.v = options.i = ""
  options.N = VomnibarNS.kCReq.activate
  options.u = ""
  if (!url || !url.includes("://")) {
    options.p = ""
    status > Status.Initing ? postToOmni(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
        : (omniOptions = options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
    return
  }
  if (injector === null && (window as PartialOf<typeof globalThis, "VData">).VData) {
    url = VData!.o(url)
  }
  send_(kFgReq.parseSearchUrl, { t: options.s, p: upper, u: url }, function (search): void {
    options.p = search
    if (search != null) { options.url = ""; }
    status > Status.Initing ? postToOmni(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
        : (omniOptions = options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
  })
} as (options: CmdOptions[kFgCmd.vomnibar], count: number) => void

export const focusOmni = (): void => {
    if (status < Status.Showing) { return; }
    if (OnChrome && Build.MinCVer < BrowserVer.MinFocus3rdPartyIframeDirectly) {
      box!.contentWindow.focus()
    }
    postToOmni(VomnibarNS.kCReq.focus)
}

const postToOmni = <K extends keyof VomnibarNS.CReq> (msg: VomnibarNS.CReq[K]): void => {
  portToOmni.postMessage(msg)
}
