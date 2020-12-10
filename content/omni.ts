import IframePort = VomnibarNS.IframePort
interface OmniPort {
    postMessage<K extends keyof VomnibarNS.CReq> (this: OmniPort, msg: VomnibarNS.CReq[K]): void | 1
    close (this: OmniPort): void | 1
}
interface IFrameWindow extends Window {
  onmessage: (this: void, ev: { source: Window; data: VomnibarNS.MessageData; ports: IframePort[] }) => void | 1
}
type BaseFullOptions = CmdOptions[kFgCmd.vomnibar] & VomnibarNS.BaseFgOptions & Partial<VomnibarNS.ContentOptions>
      & SafeObject & OptionsWithForce;
interface FullOptions extends BaseFullOptions {
    /** top URL */ u?: string;
  /** request Name */ N?: VomnibarNS.kCReq.activate
}
// eslint-disable-next-line no-var
declare var VData: VDataTy

import {
  injector, isAlive_, keydownEvents_, readyState_, VOther, timeout_, clearTimeout_, loc_, recordLog, chromeVer_, math,
  interval_, clearInterval_, locHref, vApi, createRegExp, isTY, safeObj, isTop
} from "../lib/utils"
import { removeHandler_, replaceOrSuppressMost_, getMappedKey, isEscape_ } from "../lib/keyboard_utils"
import {
  frameElement_, isHTML_, fullscreenEl_unsafe_, NONE, createElement_, removeEl_s, setClassName_s, setOrRemoveAttr_s,
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

let box: HTMLIFrameElement & { contentWindow: IFrameWindow } & SafeHTMLElement | null = null
let portToOmni: OmniPort = null as never
let status = VomnibarNS.Status.NotInited
let omniOptions: VomnibarNS.FgOptionsToFront | null = null
let secondActivateWithNewOptions: (() => void) | null = null
let timer: ValidTimeoutID = TimerID.None
  // unit: physical pixel (if C<52)
let screenHeight_ = 0
let canUseVW: boolean

export { box as omni_box, status as omni_status }

export const activate = function (options: FullOptions, count: number): void {
    // hide all further key events to wait iframe loading and focus changing from JS
    replaceOrSuppressMost_(kHandler.omni)
    secondActivateWithNewOptions = null
    let timer1 = timeout_(refreshKeyHandler, GlobalConsts.TimeOfSuppressingTailKeydownEvents)
    if (checkHidden(kFgCmd.vomnibar, options, count)) { return }
    if (status === VomnibarNS.Status.KeepBroken) {
      return hudTip(kTip.omniFrameFail, 2000)
    }
    if (!options || !options.k || !options.v) { return; }
    if (readyState_ > "l") {
      if (!timer) {
        clearTimeout_(timer1);
        timer = timeout_(activate.bind(0, options, count), 500)
        return;
      }
    }
    timer = TimerID.None
    let url = options.url
    if (isTop || !options.u || !isTY(options.u)) {
      options.u = vApi.u()
    }
    if (url === true || count !== 1 && url == null) {
      // update options.url to string, so that this block can only run once per command
      if (options.url = url = url ? getSelectionText() : "") {
        options.newtab = 1;
      }
    }
    let parApi: ReturnType<typeof getParentVApi>;
    if (!isTop && !options.$forced) { // check $forced to avoid dead loops
      if (parent === top && !fullscreenEl_unsafe_()
          && (parApi = Build.BTypes & BrowserType.Firefox ? getParentVApi() : frameElement_() && getParentVApi())) {
        parApi.f(kFgCmd.vomnibar, options, count)
      } else {
        post_({ H: kFgReq.gotoMainFrame, f: 0, c: kFgCmd.vomnibar, n: count, a: options })
      }
      return;
    }
    if (!isHTML_()) { return; }
    omniOptions = null
    getViewBox_();
    // `canUseVW` is computed for the gulp-built version of vomnibar.html
    canUseVW = (Build.MinCVer >= BrowserVer.MinCSSWidthUnit$vw$InCalc
            || !!(Build.BTypes & BrowserType.Chrome) && chromeVer_ > BrowserVer.MinCSSWidthUnit$vw$InCalc - 1)
        && !fullscreenEl_unsafe_() && docZoom_ === 1 && dScale_ === 1;
    let scale = wndSize_(2);
    let width = canUseVW ? innerWidth : (prepareCrop_()
        , !(Build.BTypes & ~BrowserType.Firefox) ? viewportRight : viewportRight * docZoom_ * bZoom_)
    if (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
        && (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)) {
      options.w = width * scale;
      options.h = screenHeight_ = wndSize_() * scale;
    } else {
      options.w = width;
      options.h = screenHeight_ = wndSize_()
    }
    options.z = scale;
    if (!(Build.NDEBUG || VomnibarNS.Status.Inactive - VomnibarNS.Status.NotInited === 1)) {
      console.log("Assert error: VomnibarNS.Status.Inactive - VomnibarNS.Status.NotInited === 1");
    }
    box && adjustUI()
    if (status === VomnibarNS.Status.NotInited) {
      if (!options.$forced) { // re-check it for safety
        options.$forced = 1;
      }
      if (tryNestedFrame(kFgCmd.vomnibar, options, count)) { return; }
      status = VomnibarNS.Status.Initing
      init(options)
    } else if (isAboutBlank()) {
      secondActivateWithNewOptions = activate.bind(0, options, count);
      (status > VomnibarNS.Status.ToShow - 1 || timeout_ != setTimeout) && resetWhenBoxExists()
      return;
    } else if (status === VomnibarNS.Status.Inactive) {
      status = VomnibarNS.Status.ToShow
    } else if (status > VomnibarNS.Status.ToShow) {
      focusOmni()
      status = VomnibarNS.Status.ToShow
    }
    toggleClass_s(box!, "O2", !canUseVW)
    options.e && setupExitOnClick(kExitOnClick.vomnibar)
    let upper = 0;
    if (url != null) {
      url = options.url = url || options.u;
      upper = count > 1 ? 1 - count : count < 0 ? -count : 0;
    }
    options.k = 0; options.v = options.i = "";
    options.N = VomnibarNS.kCReq.activate;
    options.u = "";
    if (!url || !url.includes("://")) {
      options.p = "";
      status > VomnibarNS.Status.Initing ? postToOmni(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
          : (omniOptions = options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
      return;
    }
    if (injector === null && (window as Window & {VData?: Element | VDataTy}).VData) {
      url = VData.o(url);
    }
    send_(kFgReq.parseSearchUrl, { t: options.s, p: upper, u: url }, function (search): void {
      options.p = search;
      if (search != null) { options.url = ""; }
      status > VomnibarNS.Status.Initing ? postToOmni(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
          : (omniOptions = options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
    });
} as (options: CmdOptions[kFgCmd.vomnibar], count: number) => void

type InnerHide = (fromInner?: 1 | null) => void
export const hide = ((fromInner?: 1 | null): void => {
    const oldIsActive = status > VomnibarNS.Status.Inactive
    status = VomnibarNS.Status.Inactive
    screenHeight_ = 0; canUseVW = !0
    setupExitOnClick(kExitOnClick.vomnibar | kExitOnClick.REMOVE)
    if (fromInner == null) {
      oldIsActive && postToOmni(VomnibarNS.kCReq.hide)
      return
    }
    // needed, in case the iframe is focused and then a `<esc>` is pressed before removing suppressing
    refreshKeyHandler()
    oldIsActive || focus()
    if (Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval && Build.BTypes & BrowserType.Chrome) {
      let style_old_cr = box!.style
      style_old_cr!.height = style_old_cr!.top = ""; style_old_cr!.display = NONE;
    } else {
      box!.style.cssText = "display:none"
    }
}) as InnerHide as (_arg?: null) => void

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
    el.style.display = NONE;
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
      if (Build.BTypes & BrowserType.Edge
          || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
          || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredShadowDOMV1) {
        if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false) {
          return
        }
      }
      loaded = 1
      clearTimeout_(slowLoadTimer!) // safe even if undefined
      if (!isAlive_) { return }
      if (type !== VomnibarNS.PageType.inner && isAboutBlank()) {
        recordLog(kTip.logOmniFallback)
        reload()
        return
      }
      timeout_((i?: TimerType.fake): void => {
        clearInterval_(initMsgInterval)
        const ok = !isAlive_ || status !== VomnibarNS.Status.Initing
        if (Build.BTypes & ~BrowserType.Firefox ? ok || i : ok) {
          // only clear `onload` when receiving `VomnibarNS.kFReq.iframeIsAlive`, to avoid checking `i`
          isAlive_ && secondActivateWithNewOptions && secondActivateWithNewOptions()
          return
        }
        if (type !== VomnibarNS.PageType.inner) { reload(); return }
        resetWhenBoxExists()
        focus();
        status = VomnibarNS.Status.KeepBroken
        activate(safeObj(null), 1)
      }, 400)
      const doPostMsg = (postMsgStat?: TimerType.fake | 1): void => {
        const wnd = el.contentWindow, isFile = page.startsWith("file:")
        if (status !== VomnibarNS.Status.Initing || !wnd
            || postMsgStat !== 1 && isAboutBlank() || isFile && el.src !== page) { return }
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
      loaded || (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) ||
      reload()
    }, 2000) : TimerID.None
}

const resetWhenBoxExists = (redo?: boolean): void | 1 => {
    const oldStatus = status
    if (oldStatus === VomnibarNS.Status.NotInited) { return; }
    status = VomnibarNS.Status.NotInited
    portToOmni && portToOmni.close()
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
        && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted) {
      box!.onload = null as never
    }
    removeEl_s(box!)
    portToOmni = box = omniOptions = null as never
    refreshKeyHandler(); // just for safer code
    if (secondActivateWithNewOptions) { secondActivateWithNewOptions(); }
    else if (redo && oldStatus > VomnibarNS.Status.ToShow - 1) {
      post_({ H: kFgReq.vomnibar, r: true, i: true })
    }
}

const isAboutBlank = (): boolean => {
    try {
      const doc = box!.contentDocument
      if (doc && doc.URL === "about:blank") { return true; }
    } catch {}
    return false;
}

const onOmniMessage = function (this: OmniPort, msg: { data: any, target?: MessagePort }): void {
    type Req = VomnibarNS.FReq;
    type ReqTypes<K> = K extends keyof Req ? Req[K] & VomnibarNS.Msg<K> : never;
    const data = msg.data as ReqTypes<keyof Req>
    switch (data.N) {
    case VomnibarNS.kFReq.iframeIsAlive:
      status = VomnibarNS.Status.ToShow
      portToOmni = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinTestedES6Environment
          ? this : msg.target! as OmniPort
      !data.o && omniOptions && postToOmni<VomnibarNS.kCReq.activate>(omniOptions)
      box!.onload = omniOptions = null as never
      break;
    case VomnibarNS.kFReq.style:
      const style = box!.style
      style.height = math.ceil(data.h / docZoom_
          / (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && (!(Build.BTypes & ~BrowserType.Chrome)
                  || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
              ? wndSize_(2) : 1)) + "px"
      if (status === VomnibarNS.Status.ToShow) {
        status = VomnibarNS.Status.Showing
        const maxBoxHeight = data.m!,
        topHalfThreshold = maxBoxHeight * 0.6 + VomnibarNS.PixelData.MarginTop *
            (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && (!(Build.BTypes & ~BrowserType.Chrome)
                  || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
              ? wndSize_(2) : 1),
        top = screenHeight_ > topHalfThreshold * 2 ? ((50 - maxBoxHeight * 0.6 / screenHeight_ * 100) | 0
            ) + (canUseVW ? "vh" : "%") : ""
        style.top = !Build.NoDialogUI && VimiumInjector === null && loc_.hash === "#dialog-ui" ? "8px" : top;
        style.display = "";
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
  status < VomnibarNS.Status.Showing ? status < VomnibarNS.Status.Inactive + 1 ? removeHandler_(kHandler.omni) : 0
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

export const focusOmni = (): void => {
    if (status < VomnibarNS.Status.Showing) { return; }
    if (Build.MinCVer < BrowserVer.MinFocus3rdPartyIframeDirectly
        && Build.BTypes & BrowserType.Chrome) {
      box!.contentWindow.focus()
    }
    postToOmni(VomnibarNS.kCReq.focus)
}

const postToOmni = <K extends keyof VomnibarNS.CReq> (msg: VomnibarNS.CReq[K]): void => {
  portToOmni.postMessage(msg)
}
