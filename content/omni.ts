/// <reference path="../lib/base.omni.d.ts" />
import {
  isAlive_, keydownEvents_, readyState_, timeout_, clearTimeout_, recordLog, chromeVer_, math, OnChrome,
  interval_, locHref, vApi, createRegExp, safer, isTop, OnFirefox, OnEdge, safeCall, WithDialog, VTr, firefoxVer_, min_, isAsContent
} from "../lib/utils"
import { removeHandler_, replaceOrSuppressMost_, getMappedKey, isEscape_ } from "../lib/keyboard_utils"
import {
  isHTML_, fullscreenEl_unsafe_, setDisplaying_s, createElement_, removeEl_s, setClassName_s, setOrRemoveAttr_s,
  toggleClass_s, doesSupportDialog, hasInCSSFilter_, appendNode_s, frameElement_
} from "../lib/dom_utils"
import { getViewBox_, docZoom_, dScale_, prepareCrop_, bZoom_, wndSize_, viewportRight } from "../lib/rect"
import { beginScroll, scrollTick } from "./scroller"
import {
  getSelectionText, adjustUI, setupExitOnClick, addUIElement, getParentVApi, evalIfOK, checkHidden, kExitOnClick,
  focusIframeContentWnd_,
} from "./dom_ui"
import { coreHints, isHintsActive, tryNestedFrame } from "./link_hints"
import { insert_Lock_ } from "./insert"
import { hudTip, hud_box } from "./hud"
import { post_, send_ } from "./port"

export declare const enum Status {
  BrokenOnce = -2, NotInited = -1, Inactive = 0, Initing = 1, ToShow = 2, Showing = 3
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
  /** request Name */ N?: VomnibarNS.kCReq.activate
}

let box: HTMLIFrameElement & { contentWindow: IFrameWindow } & SafeHTMLElement | null = null
let portToOmni: OmniPort = null as never
let status = Status.NotInited
let omniOptions: VomnibarNS.FgOptionsToFront | null = null
let secondActivateWithNewOptions: (() => void) | null = null
let timer_: ValidTimeoutID = TimerID.None
let dialog_non_ff: HTMLDialogElement | false | null | undefined

export { box as omni_box, status as omni_status, dialog_non_ff as omni_dialog_non_ff }

type InnerHide = (fromInner?: BOOL | null) => void
export const hide: (fromInner?: 0 | null | undefined) => void = <InnerHide> ((fromInner): void => {
    const oldIsActive = status > Status.Inactive
    status < Status.Inactive || (status = Status.Inactive)
    setupExitOnClick(kExitOnClick.vomnibar | kExitOnClick.REMOVE)
    removeHandler_(kHandler.omni)
    if (!fromInner) {
      oldIsActive && fromInner !== 0 && postToOmni(VomnibarNS.kCReq.hide)
      return
    }
    !OnFirefox && WithDialog && dialog_non_ff ? (dialog_non_ff.close(), setDisplaying_s(dialog_non_ff))
        : setDisplaying_s(box!)
    box!.style.height = ""
})

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
    if (type !== VomnibarNS.PageType.web) { /* empty */ }
    else if (OnChrome && timeout_ !== interval_ // there's no usable interval_
        || (!Build.NDEBUG && !VTr(kTip.nonLocalhostRe) || createRegExp(kTip.nonLocalhostRe, "i").test(page))
            && !(<RegExpOne> /^http:/).test(locHref())) {
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
        recordLog(kTip.logOmniFallback)()
        reload()
        return
      }
      !Build.NDEBUG && !isAsContent || timeout_((): void => {
        // Note: if JavaScript is disabled on `chrome://settings/content/siteDetails`,
        // then the iframe will always fail if only when DevTools is open
        clearTimeout_(initMsgInterval)
        if (!isAlive_ || status !== Status.Initing) {
          // only clear `onload` when receiving `VomnibarNS.kFReq.iframeIsAlive`, to avoid checking `i`
          isAlive_ && secondActivateWithNewOptions && secondActivateWithNewOptions()
          return
        }
        if (type !== VomnibarNS.PageType.inner) { reload(); return }
        resetWhenBoxExists()
        focus();
        status = Status.BrokenOnce
        activate(safer({}) as never, 1)
        status = Status.NotInited
        hudTip(kTip.omniFrameFail, 2)
      }, 400)
      const doPostMsg = (postMsgStat?: TimerType.fake | 1): void => {
        const wnd = el.contentWindow, isFile = page.startsWith("file:")
        if (status !== Status.Initing || !wnd
            || postMsgStat !== 1 && safeCall(isAboutBlank_throwable) || isFile && el.src !== page) { return }
        const channel = new MessageChannel();
        portToOmni = channel.port1;
        (portToOmni as typeof channel.port1).onmessage = onOmniMessage
        const sec: VomnibarNS.MessageData = ["VimiumC", secret, omniOptions as VomnibarNS.FgOptionsToFront]
        wnd.postMessage(sec, !isFile ? new URL(page).origin : "*" // lgtm [js/cross-window-information-leak]
            , [channel.port2])
      }
      type === VomnibarNS.PageType.web ? initMsgInterval = interval_(doPostMsg, 66) : doPostMsg(1)
    };
    if (!OnFirefox && WithDialog) {
      dialog_non_ff = (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement || doesSupportDialog())
          && hasInCSSFilter_() && createElement_("dialog")
      if (dialog_non_ff) {
        setClassName_s(dialog_non_ff, "R DLG")
        appendNode_s(dialog_non_ff, el)
      }
    }
    box = el
    addUIElement(!OnFirefox && WithDialog && dialog_non_ff || el, AdjustType.MustAdjust, hud_box)
    slowLoadTimer = type !== VomnibarNS.PageType.inner ? timeout_(function (i): void {
      clearTimeout_(initMsgInterval)
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
    removeEl_s(!OnFirefox && WithDialog && dialog_non_ff || box!)
    portToOmni = box = omniOptions = null as never
    !OnFirefox && WithDialog && (dialog_non_ff = null)
    refreshKeyHandler(); // just for safer code
    if (secondActivateWithNewOptions) { secondActivateWithNewOptions(); }
    else if (redo && oldStatus > Status.ToShow - 1) {
      post_({ H: kFgReq.vomnibar, r: 9, i: 1 })
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
      const style = box!.style, zoom = Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && OnChrome ? docZoom_ * wndSize_(2) : docZoom_
      const height2 = math.ceil(data.h / zoom) + "px"
      style.height !== height2 && (style.height = height2)
      if (status === Status.ToShow) {
        status = Status.Showing
        !OnFirefox && WithDialog && dialog_non_ff && (dialog_non_ff.open || dialog_non_ff.showModal())
        // on C118+U22, `box.focus()` may make contentWindow blur while the although itself does become "activeElement"
        focusIframeContentWnd_(box!, 0)
        clearTimeout_(timer1)
        timeout_(refreshKeyHandler, GlobalConsts.TimeOfSuppressingTailKeydownEvents - 40)
      }
      break;
    case VomnibarNS.kFReq.focus: vApi.f(); keydownEvents_[data.l] = 1; break
    case VomnibarNS.kFReq.hide: (hide as InnerHide)(1); break
    case VomnibarNS.kFReq.scroll: beginScroll(0, data.k, data.b); break
    case VomnibarNS.kFReq.scrollGoing: // no break;
    case VomnibarNS.kFReq.stopScroll: scrollTick((VomnibarNS.kFReq.stopScroll - data.N) as BOOL); break
    case VomnibarNS.kFReq.evalJS: evalIfOK(data); break
    case VomnibarNS.kFReq.broken: focus(); // no break;
    case VomnibarNS.kFReq.unload: isAlive_ && resetWhenBoxExists(data.N === VomnibarNS.kFReq.broken); break
    case VomnibarNS.kFReq.hud: hudTip(data.k); break
    case VomnibarNS.kFReq.scaled_old_cr:
      if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent) {
        box!.style.top = data.t && data.t + (canUseVW ? "vh" : "%")
      }
      break
    default: if (0) { data satisfies never; } break
    }
} as <K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }) => void | 1

const refreshKeyHandler = (): void => {
  status < Status.Showing ? status < Status.Inactive + 1 ? removeHandler_(kHandler.omni) : 0
      : (replaceOrSuppressMost_(kHandler.omni, ((event: HandlerNS.Event | string): HandlerResult => {
    if (insert_Lock_()) { return HandlerResult.Nothing; }
    event = getMappedKey(event as HandlerNS.Event, kModeId.Plain)
    if (isEscape_(event)) { hide(); return HandlerResult.Prevent }
    if (event === kChar.f1 || event === kChar.f2) {
      postToOmni(VomnibarNS.kCReq.focus)
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  }) as (event: HandlerNS.Event) => HandlerResult),
  isHintsActive && replaceOrSuppressMost_(kHandler.linkHints, coreHints.n))
}

  const timer1 = timeout_(refreshKeyHandler, GlobalConsts.TimeOfSuppressingTailKeydownEvents), oldTimer = timer_
  const scale = wndSize_(2), screenHeight = wndSize_() // unit: logic pixel if not (C<52) else physical pixel
  const notInFullScreen = !fullscreenEl_unsafe_()
  const maxOutHeight = options.h / min_(1, scale), topVH = 50 - maxOutHeight / screenHeight * 60
  let url = options.url, upper = 0
  // hide all further key events to wait iframe loading and focus changing from JS
  replaceOrSuppressMost_(kHandler.omni)
  secondActivateWithNewOptions = null
  timer_ = TimerID.None
  clearTimeout_(oldTimer)
  if (status === Status.BrokenOnce) { return }
  if (checkHidden(kFgCmd.vomnibar, options, count)) { return }
  if (!options || !options.k || !options.v) { return; }
  if (status === Status.NotInited && readyState_ > "l") { // a second `o` should show Vomnibar at once
    if (!oldTimer) {
      clearTimeout_(timer1)
      timer_ = timeout_(activate.bind(0, options, count), 500)
      return
    }
  }
  if (url === true || count !== 1 && url == null) {
    // update options.url to string, so that this block can only run once per command
    if ((options.url = url = url ? getSelectionText() : "") && options.newtab == null) {
      options.newtab = 1
    }
  }
  let parApi: ReturnType<typeof getParentVApi>
  if (!isTop && !options.$forced && notInFullScreen) { // check $forced to avoid dead loops
    if (parent === top && (parApi = getParentVApi())) {
      parApi.f(kFgCmd.vomnibar, options, count, 0, frameElement_())
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
      && notInFullScreen && docZoom_ === 1 && dScale_ === 1
  const width = canUseVW ? wndSize_(1) : (prepareCrop_(), OnFirefox ? viewportRight : viewportRight * docZoom_ * bZoom_)
  options.w = [width, screenHeight, scale]
  if (!(Build.NDEBUG || Status.Inactive - Status.NotInited === 1)) {
    console.log("Assert error: Status.Inactive - Status.NotInited === 1")
  }
  options.u = options.u || vApi.u()
  if (OnFirefox) { options.d = hasInCSSFilter_() }
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
    status > Status.ToShow - 1 && resetWhenBoxExists()
    return
  } else if (status === Status.Inactive) {
    status = Status.ToShow
    !(!OnFirefox && WithDialog && dialog_non_ff) ? setDisplaying_s(box!, 1) : (setDisplaying_s(dialog_non_ff, 1))
  } else if (status > Status.ToShow) {
    postToOmni(VomnibarNS.kCReq.focus)
    status = Status.ToShow
  }
  const style = box!.style
  toggleClass_s(box!, "O2", !canUseVW)
  if ((OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinCssMinMax && firefoxVer_ < FirefoxBrowserVer.MinCssMinMax
        || OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinCssMinMax && chromeVer_ < BrowserVer.MinCssMinMax)
      && width > options.m!) {
    style.left = options.x!
  } else {
    if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinCssMinMax && firefoxVer_ < FirefoxBrowserVer.MinCssMinMax
        || OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinCssMinMax && chromeVer_ < BrowserVer.MinCssMinMax) {
      style.left = ""
    }
  }
  style.top = topVH > 6400 / screenHeight ? topVH.toFixed(1) + (canUseVW ? "vh" : "%") : ""
  if (status !== Status.Showing) {
    style.height = math.ceil(maxOutHeight / docZoom_) + "px"
  }
  ; (!OnFirefox && WithDialog && dialog_non_ff || options.e) && setupExitOnClick(kExitOnClick.vomnibar)
  if (url != null) {
    url = options.url = url || options.u
    upper = count > 1 ? 1 - count : count < 0 ? -count : 0
  }
  options.N = VomnibarNS.kCReq.activate
  options.k = options.v = options.i = options.u = ""
  if (!url || !url.includes("://")) {
    options.p = ""
    status > Status.Initing ? postToOmni(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
        : (omniOptions = options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
    return
  }
  send_(kFgReq.parseSearchUrl, { t: options.s, p: upper, u: url }
      , ((options2: FullOptions, search: ParsedSearch | null): void => {
    options2.p = search
    status > Status.Initing ? postToOmni(options2 as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
        : (omniOptions = options2 as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
  }).bind(0, options))
} as (options: CmdOptions[kFgCmd.vomnibar], count: number) => void

export const postToOmni = <K extends keyof VomnibarNS.CReq> (msg: VomnibarNS.CReq[K]): void => {
  portToOmni.postMessage(msg)
}
