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
  injector, isAlive_, keydownEvents_, readyState_, VOther, timeout_, clearTimeout_, fgCache, loc_,
} from "../lib/utils"
import { removeHandler_, pushHandler_, SuppressMost_, key_, isEscape_ } from "../lib/keyboard_utils";
import {
  createElement_, docZoom_, devRatio_, frameElement_, isHTML_, getViewBox_, fullscreenEl_unsafe_, dScale_,
  prepareCrop_, bZoom_,
} from "../lib/dom_utils";
import { beginScroll, scrollTick } from "./scroller"
import {
  getSelectionText, adjustUI, setupExitOnClick, addUIElement, getParentVApi, evalIfOK, checkHidden,
} from "./dom_ui"
import { tryNestedFrame } from "./link_hints"
import { insert_Lock_ } from "./mode_insert"
import { hudTip, hud_box } from "./hud"
import { post_, send_ } from "./port"

let box: HTMLIFrameElement & { contentWindow: IFrameWindow } = null as never
let portToOmni: OmniPort = null as never
let status = VomnibarNS.Status.NotInited
let omniOptions: VomnibarNS.FgOptionsToFront | null = null
let onReset: (() => void) | null = null
let timer = TimerID.None
  // unit: physical pixel (if C<52)
let screenHeight = 0
let canUseVW = true

export { box as omni_box, status as omni_status }

export const activate = function (count: number, options: FullOptions): void {
    // hide all further key events to wait iframe loading and focus changing from JS
    removeHandler_(activate)
    pushHandler_(SuppressMost_, activate)
    let timer1 = timeout_(refreshKeyHandler, GlobalConsts.TimeOfSuppressingTailKeydownEvents)
    if (checkHidden(kFgCmd.vomnibar, count, options)) { return; }
    if (status === VomnibarNS.Status.KeepBroken) {
      return hudTip(kTip.omniFrameFail, 2000)
    }
    if (!options || !options.k || !options.v) { return; }
    if (readyState_ > "l") {
      if (!timer) {
        clearTimeout_(timer1);
        timer = timeout_(activate.bind(0, count, options), 500)
        return;
      }
    }
    timer = TimerID.None
    let url = options.url, isTop = top === window;
    if (isTop || !options.u || typeof options.u !== "string") {
      options.u = loc_.href;
    }
    if (url === true || count !== 1 && url == null) {
      // update options.url to string, so that this block can only run once per command
      if (options.url = url = url ? getSelectionText() : "") {
        options.newtab = 1;
      }
    }
    let parApi: ReturnType<typeof getParentVApi>;
    if (!isTop && !options.$forced) { // check $forced to avoid dead loops
      if (parent === top
          && (parApi = Build.BTypes & BrowserType.Firefox ? getParentVApi() : frameElement_() && getParentVApi())) {
        parApi.o(count, options)
      } else {
        post_({ H: kFgReq.gotoMainFrame, f: 0, c: kFgCmd.vomnibar, n: count, a: options })
      }
      return;
    }
    if (!isHTML_()) { return; }
    omniOptions = null
    getViewBox_();
    canUseVW = (Build.MinCVer >= BrowserVer.MinCSSWidthUnit$vw$InCalc
            || !!(Build.BTypes & BrowserType.Chrome) && fgCache.v > BrowserVer.MinCSSWidthUnit$vw$InCalc - 1)
        && !fullscreenEl_unsafe_() && docZoom_ === 1 && dScale_ === 1;
    let scale = devRatio_();
    let width = canUseVW ? innerWidth : !(Build.BTypes & ~BrowserType.Firefox) ? prepareCrop_()
        : prepareCrop_() * docZoom_ * bZoom_;
    if (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
        && (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)) {
      options.w = width * scale;
      options.h = screenHeight = innerHeight * scale;
    } else {
      options.w = width;
      options.h = screenHeight = innerHeight
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
      if (tryNestedFrame(kFgCmd.vomnibar, count, options)) { return; }
      status = VomnibarNS.Status.Initing
      init(options)
    } else if (isAboutBlank()) {
      onReset = function (): void { onReset = null; activate(count, options); }
      return;
    } else if (status === VomnibarNS.Status.Inactive) {
      status = VomnibarNS.Status.ToShow
    } else if (status > VomnibarNS.Status.ToShow) {
      focusOmni()
      status = VomnibarNS.Status.ToShow
    }
    box.classList.toggle("O2", !canUseVW)
    setupExitOnClick(0, options.exitOnClick ? hide : 0)
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
      url = VData.getOmni_(url);
    }
    send_(kFgReq.parseSearchUrl, { t: options.s, p: upper, u: url }, function (search): void {
      options.p = search;
      if (search != null) { options.url = ""; }
      status > VomnibarNS.Status.Initing ? postToOmni(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
          : (omniOptions = options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront)
    });
} as (count: number, options: CmdOptions[kFgCmd.vomnibar]) => void

export const hide = (fromInner?: 1): void => {
    const active = status > VomnibarNS.Status.Inactive,
    style_old_cr = Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval
        && Build.BTypes & BrowserType.Chrome ? box.style : 0 as never as null;
    status = VomnibarNS.Status.Inactive
    screenHeight = 0; canUseVW = !0
    setupExitOnClick(0, 0)
    if (fromInner == null) {
      active && postToOmni(VomnibarNS.kCReq.hide)
      return
    }
    // needed, in case the iframe is focused and then a `<esc>` is pressed before removing suppressing
    refreshKeyHandler()
    active || focus();
    if (Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval && Build.BTypes & BrowserType.Chrome) {
      style_old_cr!.height = style_old_cr!.top = ""; style_old_cr!.display = "none";
    } else {
      box.style.cssText = "display:none"
    }
}

export const init = ({k: secret, v: page, t: type, i: inner}: FullOptions): void => {
    const el = createElement_("iframe") as typeof box
    el.className = "R UI Omnibar";
    el.style.display = "none";
    if (type !== VomnibarNS.PageType.web) { /* empty */ }
    else if (page.startsWith("http:") && loc_.origin.startsWith("https:")) {
      // not allowed by Chrome; recheck because of `tryNestedFrame`
      reload();
    } else {
      el.referrerPolicy = "no-referrer";
      if (!(Build.BTypes & ~BrowserType.Chrome)
          || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome) {
        el.sandbox = "allow-scripts";
      }
    }
    el.src = page;
    function reload(): void {
      type = VomnibarNS.PageType.inner;
      el.removeAttribute("referrerPolicy");
      // not skip the line below: in case main world JS adds some sandbox attributes
      el.removeAttribute("sandbox");
      el.src = page = inner!;
      omniOptions && (omniOptions.t = type)
    }
    let loaded = false;
    el.onload = function (): void {
      loaded = true;
      if (onReset) { return; }
      if (type !== VomnibarNS.PageType.inner && isAboutBlank()) {
        console.log("Vimium C: use the built-in Vomnibar page because the preferred is too old.");
        return reload();
      }
      const wnd = (this as typeof el).contentWindow,
      sec: VomnibarNS.MessageData = [secret, omniOptions as VomnibarNS.FgOptionsToFront],
      // eslint-disable-next-line @typescript-eslint/ban-types
      origin = (page as EnsureNonNull<String>).substring(0
          , page.startsWith("file:") ? 7 : page.indexOf("/", page.indexOf("://") + 3)),
      checkBroken = function (i?: TimerType.fake | 1): void {
        const ok = !isAlive_ || status !== VomnibarNS.Status.Initing
        if (ok || i) { isAlive_ && box && (box.onload = omniOptions = null as never); return; }
        if (type !== VomnibarNS.PageType.inner) { return reload(); }
        reset()
        focus();
        status = VomnibarNS.Status.KeepBroken
        activate(1, {} as FullOptions)
      }
      if (loc_.origin !== origin || !origin || type === VomnibarNS.PageType.web) {
        timeout_(checkBroken, 600)
        const channel = new MessageChannel();
        portToOmni = channel.port1
        channel.port1.onmessage = onOmniMessage
        wnd.postMessage(sec, type !== VomnibarNS.PageType.web && origin || "*", [channel.port2]);
        return;
      }
      // check it to make "debugging VOmni on options page" easier
      if (!Build.NDEBUG && !wnd.onmessage) { return checkBroken(); }
      type FReq = VomnibarNS.FReq;
      type CReq = VomnibarNS.CReq;
      const port: IframePort = {
        sameOrigin: true,
        onmessage: null as never,
        postMessage<K extends keyof FReq> (data: FReq[K] & VomnibarNS.Msg<K>): void | 1 {
          isAlive_ && onOmniMessage<K>({ data })
        }
      };
      portToOmni = {
        close (): void { port.postMessage = function () { /* empty */ }; },
        postMessage (data: CReq[keyof CReq]): void | 1 { return port.onmessage({ data }); }
      }
      wnd.onmessage({ source: window, data: sec, ports: [port] });
      checkBroken(1);
    };
    addUIElement(box = el, AdjustType.MustAdjust, hud_box)
    type !== VomnibarNS.PageType.inner &&
    timeout_(function (i): void {
      loaded || (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) ||
      onReset || reload()
    }, 2000);
}

export const reset = (redo?: boolean): void | 1 => {
    const oldStatus = status
    if (oldStatus === VomnibarNS.Status.NotInited) { return; }
    status = VomnibarNS.Status.NotInited
    portToOmni && portToOmni.close()
    box.remove()
    portToOmni = box = null as never
    refreshKeyHandler(); // just for safer code
    omniOptions = null
    if (onReset) { onReset(); }
    else if (redo && oldStatus > VomnibarNS.Status.ToShow - 1) {
      post_({ H: kFgReq.vomnibar, r: true, i: true })
    }
}

export const isAboutBlank = (): boolean => {
    try {
      const doc = box.contentDocument
      if (doc && doc.URL === "about:blank") { return true; }
    } catch {}
    return false;
}

const onOmniMessage = function (msg: { data: any }): void {
    type Req = VomnibarNS.FReq;
    type ReqTypes<K> = K extends keyof Req ? Req[K] & VomnibarNS.Msg<K> : never;
    const data = msg.data as ReqTypes<keyof Req>
    switch (data.N) {
    case VomnibarNS.kFReq.iframeIsAlive:
      status = VomnibarNS.Status.ToShow
      let opt = omniOptions
      omniOptions = null
      if (!data.o && opt) {
        postToOmni<VomnibarNS.kCReq.activate>(opt)
      }
      break;
    case VomnibarNS.kFReq.style:
      box.style.height = Math.ceil(data.h / docZoom_
          / (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && (!(Build.BTypes & ~BrowserType.Chrome)
                  || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
              ? devRatio_() : 1)) + "px"
      if (status === VomnibarNS.Status.ToShow) {
        onShown(data.m!)
      }
      break;
    case VomnibarNS.kFReq.focus:
      focus();
      keydownEvents_[data.l] = 1
      break
    case VomnibarNS.kFReq.hide: return hide(1)
    case VomnibarNS.kFReq.scroll: return beginScroll(0, data.k, data.b)
    case VomnibarNS.kFReq.scrollGoing: // no break;
    case VomnibarNS.kFReq.scrollEnd: return scrollTick((VomnibarNS.kFReq.scrollEnd - data.N) as BOOL)
    case VomnibarNS.kFReq.evalJS: evalIfOK(data); break
    case VomnibarNS.kFReq.broken: focus(); // no break;
    case VomnibarNS.kFReq.unload: isAlive_ && reset(data.N === VomnibarNS.kFReq.broken); break
    case VomnibarNS.kFReq.hud:
      return hudTip(data.k)
    }
} as <K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }) => void | 1

const onShown = (maxBoxHeight: number): void => {
    status = VomnibarNS.Status.Showing
    const style = box.style,
    topHalfThreshold = maxBoxHeight * 0.6 + VomnibarNS.PixelData.MarginTop *
        (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && (!(Build.BTypes & ~BrowserType.Chrome)
              || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
          ? devRatio_() : 1),
    top = screenHeight > topHalfThreshold * 2 ? ((50 - maxBoxHeight * 0.6 / screenHeight * 100) | 0
        ) + (canUseVW ? "vh" : "%") : ""
    style.top = !Build.NoDialogUI && VimiumInjector === null && loc_.hash === "#dialog-ui" ? "8px" : top;
    style.display = "";
    timeout_(refreshKeyHandler, 160)
}

const refreshKeyHandler = (): void => {
  status < VomnibarNS.Status.Showing && status > VomnibarNS.Status.Inactive || removeHandler_(activate)
  status > VomnibarNS.Status.ToShow && pushHandler_(onKeydown, activate)
}

export const onKeydown = (event: HandlerNS.Event): HandlerResult => {
    if (insert_Lock_()) { return HandlerResult.Nothing; }
    const key = key_(event, kModeId.Omni)
    if (isEscape_(key)) { hide(); return HandlerResult.Prevent; }
    if (key === kChar.f1 || key === kChar.f2) {
      focusOmni()
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
}

export const focusOmni = (): void => {
    if (status < VomnibarNS.Status.Showing) { return; }
    if (Build.MinCVer < BrowserVer.MinFocus3rdPartyIframeDirectly
        && Build.BTypes & BrowserType.Chrome) {
      box.contentWindow.focus()
    }
    postToOmni(VomnibarNS.kCReq.focus)
}

const postToOmni = <K extends keyof VomnibarNS.CReq> (msg: VomnibarNS.CReq[K]): void => {
  portToOmni.postMessage(msg)
}
