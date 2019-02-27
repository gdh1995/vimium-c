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
    topUrl?: string;
    N: string;
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
  screenHeight_: 0,
  maxBoxHeight_: 0,
  defaultTop_: "",
  top_: "",
  run (this: void, count: number, options: VomnibarNS.FullOptions): void {
    const a = VOmni, CSS = options.S;
    if (CSS) { VDom.UI.css_(CSS), options.S = null };
    if (VEvent.checkHidden_(kFgCmd.vomnibar, count, options)) { return; }
    if (a.status_ === VomnibarNS.Status.KeepBroken) {
      return VHUD.tip_("Sorry, Vomnibar page seems to fail in loading.", 2000);
    }
    if (!options || !options.k || !options.v) { return; }
    if (document.readyState === "loading") {
      if (!a._timer) {
        a._timer = setTimeout(a.run.bind(a as never, count, options), 500);
        return;
      }
    }
    a._timer = 0;
    if (!VDom.isHTML_()) { return; }
    let url = options.url, isTop = window.top === window;
    if (isTop || !options.topUrl || typeof options.topUrl !== "string") {
      options.topUrl = location.href;
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
    a.options_ = null;
    VDom.dbZoom_ = 1;
    const iw = VDom.prepareCrop_(), ih = a.screenHeight_ = innerHeight;
    options.w = iw, options.h = ih;
    VDom.getZoom_();
    // note: here require: that Inactive must be NotInited + 1
    a.status_ > VomnibarNS.Status.Inactive || VUtils.push_(VDom.UI.SuppressMost_, a);
    a.box_ && VDom.UI.adjust_();
    if (a.status_ === VomnibarNS.Status.NotInited) {
      if (VHints.tryNestedFrame_("VOmni", "run", count, options)) { return VUtils.remove_(a); }
      a.status_ = VomnibarNS.Status.Initing;
      a.init_(options, CSS);
    } else if (a.isABlank_()) {
      a.onReset_ = function(this: typeof VOmni): void { this.onReset_ = null; return this.run(count, options); };
      return;
    } else if (a.status_ === VomnibarNS.Status.Inactive) {
      a.status_ = VomnibarNS.Status.ToShow;
    } else if (a.status_ > VomnibarNS.Status.ToShow) {
      a.focus_();
      a.status_ = VomnibarNS.Status.ToShow;
    }
    let upper = 0;
    if (url != null) {
      url = options.url = url || options.topUrl as string;
      upper = count > 1 ? 1 - count : count < 0 ? -count : 0;
    }
    options.k = 0; options.v = options.i = "";
    options.N = "activate";
    options.topUrl = "";
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
    }, function(search): void {
      options.p = search;
      if (search != null) { options.url = ""; }
      VOmni.setOptions_(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    });
  },
  setOptions_ (options: VomnibarNS.FgOptionsToFront): void {
    this.status_ > VomnibarNS.Status.Initing ? this.port_.postMessage(options) : (this.options_ = options);
  },
  hide_ (fromInner?: 1): void {
    const active = this.status_ > VomnibarNS.Status.Inactive;
    this.status_ = VomnibarNS.Status.Inactive;
    this.screenHeight_ = 0;
    this.defaultTop_ = "";
    if (fromInner == null) {
      active && this.port_.postMessage(VomnibarNS.kCReq.hide);
      return;
    } 
    VUtils.remove_(this);
    active || window.focus();
    this.box_.style.cssText = "display: none;";
  },
  init_ ({k: secret, v: page, t: type, i: inner}: VomnibarNS.FullOptions, CSS: BgCSSReq["S"]): void {
    const el = VDom.createElement_("iframe") as typeof VOmni.box_, UI = VDom.UI;
    el.className = "R UI Omnibar";
    if (type !== VomnibarNS.PageType.web) {}
    else if (page.startsWith("http:") && location.origin.startsWith("https:")) {
      // not allowed by Chrome; recheck because of `tryNestedFrame`
      reload();
    } else {
      el.referrerPolicy = "no-referrer";
      el.sandbox = "allow-scripts";
    }
    el.src = page;
    function reload(): void {
      type = VomnibarNS.PageType.inner;
      el.removeAttribute("referrerPolicy");
      el.removeAttribute("sandbox");
      el.src = page = inner as string; inner = null;
      let opts = VOmni.options_; opts && (opts.t = type);
    }
    el.style.visibility = "hidden";
    let loaded = false;
    el.onload = function(this: typeof el): void {
      const _this = VOmni;
      loaded = true;
      if (_this.onReset_) { return; }
      if (type !== VomnibarNS.PageType.inner && _this.isABlank_()) {
        console.log("Vimium C: use the built-in Vomnibar page because the preferred is too old.");
        return reload();
      }
      const wnd = this.contentWindow,
      sec: VomnibarNS.MessageData = [secret, _this.options_ as VomnibarNS.FgOptionsToFront],
      origin = page.substring(0, page.startsWith("file:") ? 7 : page.indexOf("/", page.indexOf("://") + 3));
      if (inner || (VUtils.cache_.browserVer_ < BrowserVer.MinSafeWndPostMessageAcrossProcesses)) setTimeout(function(i): void {
        const a = VOmni, ok = !a || a.status_ !== VomnibarNS.Status.Initing;
        if (ok || i) { a && a.box_ && (a.box_.onload = a.options_ = null as never); return; }
        if (type !== VomnibarNS.PageType.inner) { return reload(); }
        a.reset_();
        (VDom.UI.box_ as HTMLElement).style.display = "";
        window.focus();
        a.status_ = VomnibarNS.Status.KeepBroken;
        (a as typeof VOmni & {run (): void}).run();
      }, 1000); else {
        this.onload = null as never;
      }
      if (location.origin !== origin || origin.indexOf("-") < 0) {
        const channel = new MessageChannel();
        _this.port_ = channel.port1;
        channel.port1.onmessage = _this.onMessage_.bind(_this);
        wnd.postMessage(sec, type !== VomnibarNS.PageType.web ? origin : "*", [channel.port2]);
        return;
      }
      if (!wnd.onmessage) { return reload(); }
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
        close (): void { port.postMessage = function() {}; },
        postMessage (data: CReq[keyof CReq]): void | 1 { return port.onmessage({ data }); }
      };
      if ((typeof NO_DIALOG_UI === "undefined" || !NO_DIALOG_UI) && location.hash === "#dialog-ui" && VimiumInjector === null) { _this.top_ = "8px"; }
      wnd.onmessage({ source: window, data: sec, ports: [port] });
    };
    if (CSS) {
      UI.css_("");
    }
    UI.add_(this.box_ = el, AdjustType.AdjustButNotShow, VHUD.box_);
    if (CSS) {
      UI.css_(CSS);
    }
    type !== VomnibarNS.PageType.inner && setTimeout(function(i): void { loaded || i || VOmni.onReset_ || reload(); }, 2000);
  },
  reset_ (redo?: boolean): void | 1 {
    if (this.status_ === VomnibarNS.Status.NotInited) { return; }
    const oldStatus = this.status_;
    this.status_ = VomnibarNS.Status.NotInited;
    this.port_.close();
    this.box_.remove();
    this.port_ = this.box_ = null as never;
    this.defaultTop_ = "";
    VUtils.remove_(this);
    this.options_ = null;
    if (this.onReset_) { return this.onReset_(); }
    if (!redo || oldStatus < VomnibarNS.Status.ToShow) { return; }
    return VPort.post_({ H: kFgReq.vomnibar, r: true, i: true });
  },
  isABlank_ (): boolean {
    try {
      const doc = this.box_.contentDocument;
      if (doc && doc.URL === "about:blank") { return true; }
    } catch (e) {}
    return false;
  },
  onMessage_<K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }): void | 1 {
    type Req = VomnibarNS.FReq;
    switch (data.N) {
    case VomnibarNS.kFReq.uiComponentIsReady:
      this.status_ = VomnibarNS.Status.ToShow;
      let opt = this.options_;
      if (opt) { this.options_ = null; return this.port_.postMessage<VomnibarNS.kCReq.activate>(opt as VomnibarNS.FgOptionsToFront); }
      break;
    case VomnibarNS.kFReq.style:
      this.box_.style.height = (data as Req[VomnibarNS.kFReq.style]).h / VDom.wdZoom_ + "px";
      if (this.status_ === VomnibarNS.Status.Initing || this.status_ === VomnibarNS.Status.ToShow) {
        this.maxBoxHeight_ = (data as Req[VomnibarNS.kFReq.style]).m as number;
        this.onShown_();
      }
      break;
    case VomnibarNS.kFReq.focus: window.focus(); return VEvent.suppress_((data as Req[VomnibarNS.kFReq.focus]).k);
    case VomnibarNS.kFReq.hide: return this.hide_(1);
    case VomnibarNS.kFReq.test: return VEvent.OnWndFocus_();
    case VomnibarNS.kFReq.scroll: return VEvent.scroll_(data as Req[VomnibarNS.kFReq.scroll]);
    case VomnibarNS.kFReq.scrollGoing: VScroller.keyIsDown_ = VScroller.maxInterval_; break;
    case VomnibarNS.kFReq.scrollEnd: VScroller.keyIsDown_ = 0; break;
    case VomnibarNS.kFReq.evalJS: VPort.evalIfOK_((data as Req[VomnibarNS.kFReq.evalJS]).u); break;
    case VomnibarNS.kFReq.broken: (data as Req[VomnibarNS.kFReq.broken]).a && window.focus(); // no break;
    case VomnibarNS.kFReq.unload: return VOmni ? this.reset_(data.N === VomnibarNS.kFReq.broken) : undefined;
    case VomnibarNS.kFReq.hud: VHUD.tip_((data as Req[VomnibarNS.kFReq.hud]).t); return;
    default: console.log("[%d] Vimium C: unknown message \"%s\" from Vomnibar page", Date.now(), data.N);
    }
  },
  onShown_ (): number {
    this.status_ = VomnibarNS.Status.Showing;
    let style = this.box_.style, bh = this.maxBoxHeight_;
    if (bh > 0) {
      const sh = this.screenHeight_,
      NormalTopHalf = (bh * 0.6) | 0, ScreenHeightThreshold = (VomnibarNS.PixelData.MarginTop + NormalTopHalf) * 2;
      this.defaultTop_ = sh > ScreenHeightThreshold ? (50 - NormalTopHalf / sh * 100) + "%" : "";
    }
    style.top = VDom.wdZoom_ !== 1 ? ((VomnibarNS.PixelData.MarginTop / VDom.wdZoom_) | 0) + "px" : this.top_ || this.defaultTop_;
    if (style.visibility) {
      style.visibility = "";
      const box = VDom.UI.box_ as HTMLElement;
      box.hasAttribute("style") && box.removeAttribute("style");
    } else {
      style.display = "";
    }
    VUtils.remove_(this);
    return VUtils.push_(this.onKeydown_, this);
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
  focus_ (): void | 1 {
    if (this.status_ < VomnibarNS.Status.Showing) { return; }
    return this.port_.postMessage(VomnibarNS.kCReq.focus);
  }
};
