declare namespace VomnibarNS {
  interface ContentOptions extends GlobalOptions {
    trailing_slash: boolean;
  }
  interface Port {
    postMessage<K extends keyof CReq> (this: Port, msg: CReq[K]): void | 1;
    close (this: Port): void | 1;
  }
  interface IFrameWindow extends Window {
    onmessage: (this: void, ev: { source: Window, data: VomnibarNS.MessageData, ports: IframePort[] }) => void | 1;
  }
  type BaseFullOptions = CmdOptions[kFgCmd.vomnibar] & VomnibarNS.BaseFgOptions & Partial<ContentOptions> & SafeObject;
  interface FullOptions extends BaseFullOptions {
    /** top URL */ T?: string;
    /** request Name */ N: VomnibarNS.kCReq.activate;
  }
}
declare var VData: VDataTy;

var VOmni = {
  box_: null as never as HTMLIFrameElement & { contentWindow: VomnibarNS.IFrameWindow },
  port_: null as never as VomnibarNS.Port,
  status_: VomnibarNS.Status.NotInited,
  options_: null as VomnibarNS.FgOptionsToFront | null,
  onReset_: null as (() => void) | null,
  _timer: 0,
  // unit: physical pixel (if C<52)
  screenHeight_: 0,
  docZoom_: 0,
  run (this: void, count: number, options: VomnibarNS.FullOptions): void {
    const a = VOmni;
    if (VEvent.checkHidden_(kFgCmd.vomnibar, count, options)) { return; }
    if (a.status_ === VomnibarNS.Status.KeepBroken) {
      return VHud.tip_("Sorry, Vomnibar page seems to fail in loading.", 2000);
    }
    if (!options || !options.k || !options.v) { return; }
    if (VDom.OnDocLoaded_ !== VDom.execute_) {
      if (!a._timer) {
        a._timer = setTimeout(a.run.bind(a as never, count, options), 500);
        return;
      }
    }
    a._timer = 0;
    let url = options.url, isTop = top === window;
    if (isTop || !options.T || typeof options.T !== "string") {
      options.T = location.href;
    }
    if (url === true || count !== 1 && url == null) {
      // update options.url to string, so that this block can only run once per command
      if (options.url = url = url ? VDom.UI.getSelectionText_() : "") {
        options.newtab = true;
      }
      if (!isTop) {
        VPort.post_({ H: kFgReq.gotoMainFrame, c: kFgCmd.vomnibar, n: count, a: options });
        return;
      }
    }
    if (!VDom.isHTML_()) { return; }
    a.options_ = null;
    VDom.dbZoom_ = 1;
    let scale = devicePixelRatio;
    if (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
        && (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.BTypes & BrowserType.Chrome && VDom.cache_.browser_ === BrowserType.Chrome)) {
      options.w = VDom.prepareCrop_() * scale;
      options.h = a.screenHeight_ = innerHeight * scale;
    } else {
      options.w = VDom.prepareCrop_();
      options.h = a.screenHeight_ = innerHeight;
    }
    options.z = scale;
    a.docZoom_ = VDom.getZoom_();
    if (!(Build.NDEBUG || VomnibarNS.Status.Inactive - VomnibarNS.Status.NotInited === 1)) {
      console.log("Assert error: VomnibarNS.Status.Inactive - VomnibarNS.Status.NotInited === 1");
    }
    a.status_ > VomnibarNS.Status.Inactive || VUtils.push_(VDom.UI.SuppressMost_, a);
    a.box_ && VDom.UI.adjust_();
    if (a.status_ === VomnibarNS.Status.NotInited) {
      if (VHints.TryNestedFrame_("VOmni", "run", count, options)) { return VUtils.remove_(a); }
      a.status_ = VomnibarNS.Status.Initing;
      a.init_(options);
    } else if (a.isABlank_()) {
      a.onReset_ = function (this: typeof VOmni): void { this.onReset_ = null; return this.run(count, options); };
      return;
    } else if (a.status_ === VomnibarNS.Status.Inactive) {
      a.status_ = VomnibarNS.Status.ToShow;
    } else if (a.status_ > VomnibarNS.Status.ToShow) {
      a.focus_();
      a.status_ = VomnibarNS.Status.ToShow;
    }
    let upper = 0;
    if (url != null) {
      url = options.url = url || options.T as string;
      upper = count > 1 ? 1 - count : count < 0 ? -count : 0;
    }
    options.k = 0; options.v = options.i = "";
    options.N = VomnibarNS.kCReq.activate;
    options.T = "";
    if (!url || url.indexOf("://") === -1) {
      options.p = "";
      return a.setOptions_(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    }
    if (VimiumInjector === null && (window as Window & {VData?: Element | VDataTy}).VData && VData.full) {
      url = url.split("#", 1)[0] + VData.full.replace(<RegExpOne> /^-?\d+ /, "");
    }
    const trail = options.trailing_slash;
    VPort.send_({
      c: kFgReq.parseSearchUrl,
      a: {
        t: trail != null ? !!trail : null,
        p: upper, u: url
      }
    }, function (search): void {
      options.p = search;
      if (search != null) { options.url = ""; }
      VOmni.setOptions_(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    });
  },
  setOptions_ (options: VomnibarNS.FgOptionsToFront): void {
    this.status_ > VomnibarNS.Status.Initing ? this.port_.postMessage(options) : (this.options_ = options);
  },
  hide_ (fromInner?: 1): void {
    const a = this, active = a.status_ > VomnibarNS.Status.Inactive;
    a.status_ = VomnibarNS.Status.Inactive;
    a.screenHeight_ = a.docZoom_ = 0;
    if (fromInner == null) {
      active && a.port_.postMessage(VomnibarNS.kCReq.hide);
      return;
    }
    VUtils.remove_(a);
    active || focus();
    a.box_.style.cssText = "display:none";
  },
  init_ ({k: secret, v: page, t: type, i: inner}: VomnibarNS.FullOptions): void {
    const el = VDom.createElement_("iframe") as typeof VOmni.box_, UI = VDom.UI;
    el.className = "R UI Omnibar";
    el.style.display = "none";
    if (type !== VomnibarNS.PageType.web) { /* empty */ }
    else if (page.startsWith("http:") && location.origin.startsWith("https:")) {
      // not allowed by Chrome; recheck because of `tryNestedFrame`
      reload();
    } else {
      el.referrerPolicy = "no-referrer";
      if (!(Build.BTypes & ~BrowserType.Chrome)
          || Build.BTypes & BrowserType.Chrome && VDom.cache_.browser_ === BrowserType.Chrome) {
        el.sandbox = "allow-scripts";
      }
    }
    el.src = page;
    function reload(): void {
      type = VomnibarNS.PageType.inner;
      el.removeAttribute("referrerPolicy");
      // not skip the line below: in case main world JS adds some sandbox attributes
      el.removeAttribute("sandbox");
      el.src = page = inner as string;
      let opts = VOmni.options_; opts && (opts.t = type);
    }
    let loaded = false;
    el.onload = function (this: typeof el): void {
      const _this = VOmni;
      loaded = true;
      if (_this.onReset_) { return; }
      if (type !== VomnibarNS.PageType.inner && _this.isABlank_()) {
        console.log("Vimium C: use the built-in Vomnibar page because the preferred is too old.");
        return reload();
      }
      const wnd = this.contentWindow,
      sec: VomnibarNS.MessageData = [secret, _this.options_ as VomnibarNS.FgOptionsToFront],
      origin = page.substring(0, page.startsWith("file:") ? 7 : page.indexOf("/", page.indexOf("://") + 3)),
      checkBroken = function (i?: TimerType.fake | 1): void {
        const a = VOmni, ok = !a || a.status_ !== VomnibarNS.Status.Initing;
        if (ok || i) { a && a.box_ && (a.box_.onload = a.options_ = null as never); return; }
        if (type !== VomnibarNS.PageType.inner) { return reload(); }
        a.reset_();
        focus();
        a.status_ = VomnibarNS.Status.KeepBroken;
        a.run(1, {} as VomnibarNS.FullOptions);
      };
      if (location.origin !== origin || type === VomnibarNS.PageType.web) {
        setTimeout(checkBroken, 600);
        const channel = new MessageChannel();
        _this.port_ = channel.port1;
        channel.port1.onmessage = _this.onMessage_.bind(_this);
        wnd.postMessage(sec, type !== VomnibarNS.PageType.web ? origin : "*", [channel.port2]);
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
      _this.port_ = {
        close (): void { port.postMessage = function () { /* empty */ }; },
        postMessage (data: CReq[keyof CReq]): void | 1 { return port.onmessage({ data }); }
      };
      wnd.onmessage({ source: window, data: sec, ports: [port] });
      checkBroken(1);
    };
    UI.add_(this.box_ = el, AdjustType.MustAdjust, VHud.box_);
    type !== VomnibarNS.PageType.inner &&
    setTimeout(function (i): void {
      loaded || (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) ||
      VOmni.onReset_ || reload();
    }, 2000);
  },
  reset_ (redo?: boolean): void | 1 {
    const a = this, oldStatus = a.status_;
    if (oldStatus === VomnibarNS.Status.NotInited) { return; }
    a.status_ = VomnibarNS.Status.NotInited;
    a.port_ && a.port_.close();
    a.box_.remove();
    a.port_ = a.box_ = null as never;
    VUtils.remove_(a);
    a.options_ = null;
    if (a.onReset_) { return a.onReset_(); }
    if (!redo || oldStatus < VomnibarNS.Status.ToShow) { return; }
    return VPort.post_({ H: kFgReq.vomnibar, r: true, i: true });
  },
  isABlank_ (): boolean {
    try {
      const doc = this.box_.contentDocument;
      if (doc && doc.URL === "about:blank") { return true; }
    } catch {}
    return false;
  },
  onMessage_<K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }): void | 1 {
    type Req = VomnibarNS.FReq;
    const a = this;
    switch (data.N) {
    case VomnibarNS.kFReq.iframeIsAlive:
      a.status_ = VomnibarNS.Status.ToShow;
      let opt = a.options_;
      a.options_ = null;
      if (!(data as VomnibarNS.FReq[VomnibarNS.kFReq.iframeIsAlive]).o && opt) {
        return a.port_.postMessage<VomnibarNS.kCReq.activate>(opt as VomnibarNS.FgOptionsToFront);
      }
      break;
    case VomnibarNS.kFReq.style:
      a.box_.style.height = Math.ceil((data as Req[VomnibarNS.kFReq.style]).h / a.docZoom_
          / (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && (!(Build.BTypes & ~BrowserType.Chrome)
                  || Build.BTypes & BrowserType.Chrome && VDom.cache_.browser_ === BrowserType.Chrome)
              ? devicePixelRatio : 1)) + "px";
      if (a.status_ === VomnibarNS.Status.ToShow) {
        a.onShown_((data as Req[VomnibarNS.kFReq.style]).m as number);
      }
      break;
    case VomnibarNS.kFReq.focus:
      focus();
      return VEvent.keydownEvents_()[(data as Req[VomnibarNS.kFReq.focus]).l] = 1;
    case VomnibarNS.kFReq.hide: return a.hide_(1);
    case VomnibarNS.kFReq.scroll: return VEvent.scroll_(data as Req[VomnibarNS.kFReq.scroll]);
    case VomnibarNS.kFReq.scrollGoing: VScroller.keyIsDown_ = VScroller.maxInterval_; break;
    case VomnibarNS.kFReq.scrollEnd: VScroller.keyIsDown_ = 0; break;
    case VomnibarNS.kFReq.evalJS: VPort.evalIfOK_((data as Req[VomnibarNS.kFReq.evalJS]).u); break;
    case VomnibarNS.kFReq.broken: focus(); // no break;
    case VomnibarNS.kFReq.unload: return VOmni ? a.reset_(data.N === VomnibarNS.kFReq.broken) : undefined;
    case VomnibarNS.kFReq.hud: VHud.tip_((data as Req[VomnibarNS.kFReq.hud]).t); return;
    }
  },
  onShown_ (maxBoxHeight: number): void {
    const a = this;
    a.status_ = VomnibarNS.Status.Showing;
    const style = a.box_.style,
    topHalfThreshold = maxBoxHeight * 0.6 + VomnibarNS.PixelData.MarginTop *
        (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && (!(Build.BTypes & ~BrowserType.Chrome)
              || Build.BTypes & BrowserType.Chrome && VDom.cache_.browser_ === BrowserType.Chrome)
          ? devicePixelRatio : 1),
    top = a.screenHeight_ > topHalfThreshold * 2 ? ((50 - maxBoxHeight * 0.6 / a.screenHeight_ * 100) | 0) + "%" : "";
    style.top = !Build.NoDialogUI && VimiumInjector === null && location.hash === "#dialog-ui" ? "8px" : top;
    style.display = "";
    setTimeout(function (): void {
      const a2 = VOmni;
      VUtils.remove_(a2);
      a2 && a2.status_ === VomnibarNS.Status.Showing && VUtils.push_(a2.onKeydown_, a2);
    }, 160);
  },
  onKeydown_ (event: KeyboardEvent): HandlerResult {
    if (VEvent.lock_()) { return HandlerResult.Nothing; }
    if (VKeyboard.isEscape_(event)) { this.hide_(); return HandlerResult.Prevent; }
    const key = event.keyCode - VKeyCodes.f1;
    if (key === 0 || key === 1) {
      this.focus_();
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  },
  focus_ (): void {
    if (this.status_ < VomnibarNS.Status.Showing) { return; }
    if (Build.MinCVer < BrowserVer.MinFocus3rdPartyIframeDirectly
        && Build.BTypes & BrowserType.Chrome) {
      this.box_.contentWindow.focus();
    }
    this.port_.postMessage(VomnibarNS.kCReq.focus);
  }
};
