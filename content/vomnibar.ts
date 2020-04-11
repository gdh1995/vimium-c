declare namespace VomnibarNS {
  interface ContentOptions extends GlobalOptions {
    trailingSlash?: boolean;
    trailing_slash?: boolean;
  }
  interface Port {
    postMessage<K extends keyof CReq> (this: Port, msg: CReq[K]): void | 1;
    close (this: Port): void | 1;
  }
  interface IFrameWindow extends Window {
    onmessage: (this: void, ev: { source: Window; data: VomnibarNS.MessageData; ports: IframePort[] }) => void | 1;
  }
  type BaseFullOptions = CmdOptions[kFgCmd.vomnibar] & VomnibarNS.BaseFgOptions & Partial<ContentOptions>
      & SafeObject & OptionsWithForce;
  interface FullOptions extends BaseFullOptions {
    /** top URL */ u?: string;
    /** request Name */ N: VomnibarNS.kCReq.activate;
  }
  type a = keyof FullOptions;
}
// eslint-disable-next-line no-var
declare var VData: VDataTy;

// eslint-disable-next-line no-var
var VOmni = {
  boxO_: null as never as HTMLIFrameElement & { contentWindow: VomnibarNS.IFrameWindow },
  _portO: null as never as VomnibarNS.Port,
  status_: VomnibarNS.Status.NotInited,
  optionsO_: null as VomnibarNS.FgOptionsToFront | null,
  onReset_: null as (() => void) | null,
  _timerO: TimerID.None,
  // unit: physical pixel (if C<52)
  screenHeight_: 0,
  canUseVW_: true,
  activateO_: function (this: void, count: number, options: VomnibarNS.FullOptions): void {
    const a = VOmni, dom = VDom;
    // hide all further key events to wait iframe loading and focus changing from JS
    VKey.removeHandler_(a);
    VKey.pushHandler_(VKey.SuppressMost_, a);
    let timer1 = VKey.timeout_(a.RefreshKeyHandler_, GlobalConsts.TimeOfSuppressingTailKeydownEvents);
    if (VApi.checkHidden_(kFgCmd.vomnibar, count, options)) { return; }
    if (a.status_ === VomnibarNS.Status.KeepBroken) {
      return VHud.tip_(kTip.omniFrameFail, 2000);
    }
    if (!options || !options.k || !options.v) { return; }
    if (dom.readyState_ > "l") {
      if (!a._timerO) {
        VKey.clearTimeout_(timer1);
        a._timerO = VKey.timeout_(a.activateO_.bind(a as never, count, options), 500);
        return;
      }
    }
    a._timerO = TimerID.None;
    let url = options.url, isTop = top === window;
    if (isTop || !options.u || typeof options.u !== "string") {
      options.u = location.href;
    }
    if (url === true || count !== 1 && url == null) {
      // update options.url to string, so that this block can only run once per command
      if (options.url = url = url ? VCui.getSelectionText_() : "") {
        options.newtab = 1;
      }
    }
    if (!isTop && !options.$forced) { // check $forced to avoid dead loops
      let p: ContentWindowCore | void | 0 | null = parent as Window;
      if (p === top
          && (Build.BTypes & BrowserType.Firefox ? (p = dom.parentCore_ff_!()) : dom.frameElement_())
          && (p as ContentWindowCore).VOmni) {
        ((p as ContentWindowCore).VOmni as typeof VOmni).activateO_(count, options);
      } else {
        VApi.post_({ H: kFgReq.gotoMainFrame, f: 0, c: kFgCmd.vomnibar, n: count, a: options });
      }
      return;
    }
    if (!dom.isHTML_()) { return; }
    a.optionsO_ = null;
    dom.getViewBox_();
    a.canUseVW_ = (Build.MinCVer >= BrowserVer.MinCSSWidthUnit$vw$InCalc
            || !!(Build.BTypes & BrowserType.Chrome) && dom.cache_.v > BrowserVer.MinCSSWidthUnit$vw$InCalc - 1)
        && !dom.fullscreenEl_unsafe_() && dom.docZoom_ === 1 && dom.dScale_ === 1;
    let scale = dom.devRatio_();
    let width = a.canUseVW_ ? innerWidth : !(Build.BTypes & ~BrowserType.Firefox) ? dom.prepareCrop_()
        : dom.prepareCrop_() * dom.docZoom_ * dom.bZoom_;
    if (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
        && (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)) {
      options.w = width * scale;
      options.h = a.screenHeight_ = innerHeight * scale;
    } else {
      options.w = width;
      options.h = a.screenHeight_ = innerHeight;
    }
    options.z = scale;
    if (!(Build.NDEBUG || VomnibarNS.Status.Inactive - VomnibarNS.Status.NotInited === 1)) {
      console.log("Assert error: VomnibarNS.Status.Inactive - VomnibarNS.Status.NotInited === 1");
    }
    a.boxO_ && VCui.adjust_();
    if (a.status_ === VomnibarNS.Status.NotInited) {
      if (!options.$forced) { // re-check it for safety
        options.$forced = 1;
      }
      if (VHints.TryNestedFrame_(kFgCmd.vomnibar, count, options)) { return; }
      a.status_ = VomnibarNS.Status.Initing;
      a.initO_(options);
    } else if (a.isABlank_()) {
      a.onReset_ = function (): void { this.onReset_ = null; this.activateO_(count, options); };
      return;
    } else if (a.status_ === VomnibarNS.Status.Inactive) {
      a.status_ = VomnibarNS.Status.ToShow;
    } else if (a.status_ > VomnibarNS.Status.ToShow) {
      a.focusO_();
      a.status_ = VomnibarNS.Status.ToShow;
    }
    a.boxO_.classList.toggle("O2", !a.canUseVW_);
    VCui.setupExitOnClick_(0, options.exitOnClick ? a.hideO_ : 0);
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
      return a.setOptions_(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    }
    if (VimiumInjector === null && (window as Window & {VData?: Element | VDataTy}).VData) {
      url = VData.getOmni_(url);
    }
    VApi.send_(kFgReq.parseSearchUrl, { t: options.s, p: upper, u: url }, function (search): void {
      options.p = search;
      if (search != null) { options.url = ""; }
      VOmni.setOptions_(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    });
  } as (count: number, options: CmdOptions[kFgCmd.vomnibar]) => void,
  setOptions_ (options: VomnibarNS.FgOptionsToFront): void {
    this.status_ > VomnibarNS.Status.Initing ? this.postO_(options) : (this.optionsO_ = options);
  },
  hideO_ (this: void, fromInner?: 1): void {
    const a = VOmni, active = a.status_ > VomnibarNS.Status.Inactive,
    style_old_cr = Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval
        && Build.BTypes & BrowserType.Chrome ? a.boxO_.style : 0 as never as null;
    a.status_ = VomnibarNS.Status.Inactive;
    a.screenHeight_ = 0; a.canUseVW_ = !0;
    VCui.setupExitOnClick_(0, 0);
    if (fromInner == null) {
      active && a.postO_(VomnibarNS.kCReq.hide);
      return;
    }
    // needed, in case the iframe is focused and then a `<esc>` is pressed before removing suppressing
    a.RefreshKeyHandler_();
    active || focus();
    if (Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval && Build.BTypes & BrowserType.Chrome) {
      style_old_cr!.height = style_old_cr!.top = ""; style_old_cr!.display = "none";
    } else {
      a.boxO_.style.cssText = "display:none";
    }
  },
  initO_ ({k: secret, v: page, t: type, i: inner}: VomnibarNS.FullOptions): void {
    const el = VDom.createElement_("iframe") as typeof VOmni.boxO_;
    el.className = "R UI Omnibar";
    el.style.display = "none";
    if (type !== VomnibarNS.PageType.web) { /* empty */ }
    else if (page.startsWith("http:") && location.origin.startsWith("https:")) {
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
      let opts = VOmni.optionsO_; opts && (opts.t = type);
    }
    let loaded = false;
    el.onload = function (): void {
      const _this = VOmni;
      loaded = true;
      if (_this.onReset_) { return; }
      if (type !== VomnibarNS.PageType.inner && _this.isABlank_()) {
        console.log("Vimium C: use the built-in Vomnibar page because the preferred is too old.");
        return reload();
      }
      const wnd = (this as typeof el).contentWindow,
      sec: VomnibarNS.MessageData = [secret, _this.optionsO_ as VomnibarNS.FgOptionsToFront],
      // eslint-disable-next-line @typescript-eslint/ban-types
      origin = (page as EnsureNonNull<String>).substring(0
          , page.startsWith("file:") ? 7 : page.indexOf("/", page.indexOf("://") + 3)),
      checkBroken = function (i?: TimerType.fake | 1): void {
        const a = VOmni, ok = !a || a.status_ !== VomnibarNS.Status.Initing;
        if (ok || i) { a && a.boxO_ && (a.boxO_.onload = a.optionsO_ = null as never); return; }
        if (type !== VomnibarNS.PageType.inner) { return reload(); }
        a.reset_();
        focus();
        a.status_ = VomnibarNS.Status.KeepBroken;
        a.activateO_(1, {} as VomnibarNS.FullOptions);
      };
      if (location.origin !== origin || !origin || type === VomnibarNS.PageType.web) {
        VKey.timeout_(checkBroken, 600);
        const channel = new MessageChannel();
        _this._portO = channel.port1;
        channel.port1.onmessage = _this.onMessage_.bind(_this);
        wnd.postMessage(sec, type !== VomnibarNS.PageType.web && origin || "*", [channel.port2]);
        return;
      }
      // check it to make "debugging VOmni on options page" easier
      if (!Build.NDEBUG && !wnd.onmessage) { return checkBroken(); }
      type FReq = VomnibarNS.FReq;
      type CReq = VomnibarNS.CReq;
      const port: VomnibarNS.IframePort = {
        sameOrigin: true,
        onmessage: null as never as VomnibarNS.IframePort["onmessage"],
        postMessage<K extends keyof FReq> (data: FReq[K] & VomnibarNS.Msg<K>): void | 1 {
          return VOmni && VOmni.onMessage_<K>({ data });
        }
      };
      _this._portO = {
        close (): void { port.postMessage = function () { /* empty */ }; },
        postMessage (data: CReq[keyof CReq]): void | 1 { return port.onmessage({ data }); }
      };
      wnd.onmessage({ source: window, data: sec, ports: [port] });
      checkBroken(1);
    };
    VCui.add_(this.boxO_ = el, AdjustType.MustAdjust, VHud.boxH_);
    type !== VomnibarNS.PageType.inner &&
    VKey.timeout_(function (i): void {
      loaded || (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) ||
      VOmni.onReset_ || reload();
    }, 2000);
  },
  reset_ (redo?: boolean): void | 1 {
    const a = this, oldStatus = a.status_;
    if (oldStatus === VomnibarNS.Status.NotInited) { return; }
    a.status_ = VomnibarNS.Status.NotInited;
    a._portO && a._portO.close();
    a.boxO_.remove();
    a._portO = a.boxO_ = null as never;
    a.RefreshKeyHandler_(); // just for safer code
    a.optionsO_ = null;
    if (a.onReset_) { return a.onReset_(); }
    if (!redo || oldStatus < VomnibarNS.Status.ToShow) { return; }
    return VApi.post_({ H: kFgReq.vomnibar, r: true, i: true });
  },
  isABlank_ (): boolean {
    try {
      const doc = this.boxO_.contentDocument;
      if (doc && doc.URL === "about:blank") { return true; }
    } catch {}
    return false;
  },
  onMessage_: function (this: {}, msg: { data: any }): void | 1 {
    type Req = VomnibarNS.FReq;
    type ReqTypes<K> = K extends keyof Req ? Req[K] & VomnibarNS.Msg<K> : never;
    const a = this as typeof VOmni, data = msg.data as ReqTypes<keyof Req>;
    switch (data.N) {
    case VomnibarNS.kFReq.iframeIsAlive:
      a.status_ = VomnibarNS.Status.ToShow;
      let opt = a.optionsO_;
      a.optionsO_ = null;
      if (!data.o && opt) {
        return a.postO_<VomnibarNS.kCReq.activate>(opt);
      }
      break;
    case VomnibarNS.kFReq.style:
      a.boxO_.style.height = Math.ceil(data.h / VDom.docZoom_
          / (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && (!(Build.BTypes & ~BrowserType.Chrome)
                  || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
              ? VDom.devRatio_() : 1)) + "px";
      if (a.status_ === VomnibarNS.Status.ToShow) {
        a.onShown_(data.m!);
      }
      break;
    case VomnibarNS.kFReq.focus:
      focus();
      return VApi.keydownEvents_()[data.l] = 1;
    case VomnibarNS.kFReq.hide: return a.hideO_(1);
    case VomnibarNS.kFReq.scroll: return VSc.BeginScroll_(0, data.k, data.b);
    case VomnibarNS.kFReq.scrollGoing: // no break;
    case VomnibarNS.kFReq.scrollEnd: VSc.scrollTick_((VomnibarNS.kFReq.scrollEnd - data.N) as BOOL); break;
    case VomnibarNS.kFReq.evalJS: VApi.evalIfOK_(data.u); break;
    case VomnibarNS.kFReq.broken: focus(); // no break;
    case VomnibarNS.kFReq.unload: return VOmni ? a.reset_(data.N === VomnibarNS.kFReq.broken) : undefined;
    case VomnibarNS.kFReq.hud:
      VHud.tip_(data.k);
      return;
    }
  } as <K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }) => void | 1,
  onShown_ (maxBoxHeight: number): void {
    const a = this;
    a.status_ = VomnibarNS.Status.Showing;
    const style = a.boxO_.style,
    topHalfThreshold = maxBoxHeight * 0.6 + VomnibarNS.PixelData.MarginTop *
        (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && (!(Build.BTypes & ~BrowserType.Chrome)
              || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
          ? VDom.devRatio_() : 1),
    top = a.screenHeight_ > topHalfThreshold * 2 ? ((50 - maxBoxHeight * 0.6 / a.screenHeight_ * 100) | 0
        ) + (a.canUseVW_ ? "vh" : "%") : "";
    style.top = !Build.NoDialogUI && VimiumInjector === null && location.hash === "#dialog-ui" ? "8px" : top;
    style.display = "";
    VKey.timeout_(a.RefreshKeyHandler_, 160);
  },
  RefreshKeyHandler_ (this: void): void {
    const a = VOmni, st = a.status_;
    st < VomnibarNS.Status.Showing && st > VomnibarNS.Status.Inactive || VKey.removeHandler_(a);
    st > VomnibarNS.Status.ToShow && VKey.pushHandler_(a.onKeydownO_, a);
  },
  onKeydownO_ (event: HandlerNS.Event): HandlerResult {
    if (VApi.lock_()) { return HandlerResult.Nothing; }
    const key = VKey.key_(event, kModeId.Omni);
    if (VKey.isEscape_(key)) { this.hideO_(); return HandlerResult.Prevent; }
    if (key === kChar.f1 || key === kChar.f2) {
      this.focusO_();
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  },
  focusO_ (): void {
    if (this.status_ < VomnibarNS.Status.Showing) { return; }
    if (Build.MinCVer < BrowserVer.MinFocus3rdPartyIframeDirectly
        && Build.BTypes & BrowserType.Chrome) {
      this.boxO_.contentWindow.focus();
    }
    this.postO_(VomnibarNS.kCReq.focus);
  },
  postO_ <K extends keyof VomnibarNS.CReq> (msg: VomnibarNS.CReq[K]): void {
    this._portO.postMessage(msg);
  }
};
