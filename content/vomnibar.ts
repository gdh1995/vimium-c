declare namespace VomnibarNS {
  interface ContentOptions extends GlobalOptions {
    trailing_slash: boolean;
    url: boolean | string | null;
  }
  interface Port {
    postMessage<K extends keyof CReq> (this: Port, msg: CReq[K]): void | 1;
    close (this: Port): void | 1;
  }
  interface IFrameWindow extends Window {
    Vomnibar: object;
    VPort?: object;
    onmessage: (this: void, ev: { source: Window, data: VomnibarNS.MessageData, ports: IframePort[] }) => void | 1;
  }
  type BaseFullOptions = CmdOptions["Vomnibar.activate"] & VomnibarNS.BaseFgOptions & Partial<ContentOptions> & SafeObject;
  interface FullOptions extends BaseFullOptions {
    topUrl?: string;
    name: string;
  }
}

var Vomnibar = {
  box: null as never as HTMLIFrameElement & { contentWindow: VomnibarNS.IFrameWindow },
  port: null as never as VomnibarNS.Port,
  status: VomnibarNS.Status.NotInited,
  options: null as VomnibarNS.FgOptionsToFront | null,
  onReset: null as (() => void) | null,
  timer: 0,
  screenHeight: 0,
  maxBoxHeight: 0,
  defaultTop: "",
  top: "",
  sameOrigin: false,
  activate (count: number, options: VomnibarNS.FullOptions): void {
    if (this.status === VomnibarNS.Status.KeepBroken) {
      return VHUD.showForDuration("Sorry, Vomnibar page seems to fail to load.", 2000);
    }
    if (!options || !options.secret || !options.vomnibar) { return; }
    if (document.readyState === "loading") {
      if (!this.timer) {
        this.timer = setTimeout(this.activate.bind(this, count, options), 500);
        return;
      }
    }
    this.timer = 0;
    if (!VDom.isHTML()) { return; }
    if ((options.url === true || count !== 1) && (window.top === window || !options.topUrl || typeof options.topUrl !== "string")) {
      options.topUrl = window.location.href;
    }
    this.options = null;
    VDom.dbZoom = 1;
    const iw = VDom.prepareCrop(), ih = this.screenHeight = window.innerHeight;
    options.width = iw, options.height = ih;
    VDom.getZoom();
    // note: here require: that Inactive must be NotInited + 1
    this.status > VomnibarNS.Status.Inactive || VUtils.push(VDom.UI.SuppressMost, this);
    this.box && VDom.UI.adjust();
    if (this.status === VomnibarNS.Status.NotInited) {
      if (VHints.tryNestedFrame("Vomnibar.activate", count, options)) { return VUtils.remove(this); }
      this.status = VomnibarNS.Status.Initing;
      this.init(options);
    } else if (this.isABlank()) {
      this.onReset = function(this: typeof Vomnibar): void { this.onReset = null; return this.activate(count, options); };
      return;
    } else if (this.status === VomnibarNS.Status.Inactive) {
      this.status = VomnibarNS.Status.ToShow;
    } else if (this.status > VomnibarNS.Status.ToShow) {
      this.focus();
      this.onShown();
    }
    options.secret = 0; options.vomnibar = options.vomnibar2 = options.CSS = "";
    options.name = "activate";
    let url = options.url, upper = 0;
    if (url === true) {
      if (url = VDom.UI.getSelectionText()) {
        options.force = true;
      } else {
        url = options.topUrl as string;
      }
      upper = count > 1 ? 1 - count : count < 0 ? -count : 0;
      options.url = url;
    } else if (url != null) {
      url = options.url = typeof url === "string" ? url : null;
    } else if (count !== 1) {
      url = options.url = options.topUrl;
      upper = count > 1 ? 1 - count : -count;
    }
    options.topUrl = "";
    if (!url || url.indexOf("://") === -1) {
      options.search = "";
      return this.setOptions(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    }
    if ((window as any).shownNode && !("VimiumInjector" in window)) {
      url = url.split("#", 1)[0] + window.name;
    }
    const trail = options.trailing_slash;
    return VPort.send({
      handler: "parseSearchUrl",
      trailing_slash: trail != null ? !!trail : null,
      upper, url
    }, function(search): void {
      options.search = search;
      if (search != null) { options.url = ""; }
      return Vomnibar.setOptions(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    });
  },
  setOptions (options: VomnibarNS.FgOptionsToFront): void {
    this.status > VomnibarNS.Status.Initing ? this.port.postMessage(options) : (this.options = options);
  },
  hide (fromInner?: 1): void {
    const active = this.status > VomnibarNS.Status.Inactive;
    this.status = VomnibarNS.Status.Inactive;
    this.screenHeight = 0;
    this.defaultTop = "";
    if (fromInner == null) {
      active && this.port.postMessage<"hide">("hide");
      return;
    } 
    VUtils.remove(this);
    active || window.focus();
    this.box.style.cssText = "display: none;";
  },
  init ({secret, vomnibar: page, ptype: type, vomnibar2: inner, CSS}: VomnibarNS.FullOptions): void {
    const el = VDom.createElement("iframe") as typeof Vomnibar.box, UI = VDom.UI;
    el.className = "R UI Omnibar";
    if (type !== VomnibarNS.PageType.web) {}
    else if (page.startsWith("http:") && location.origin.startsWith("https:")) {
      // not allowed by Chrome; recheck because of `tryNestedFrame`
      reload();
    } else {
      el.referrerPolicy = "no-referrer";
      (el as any).sandbox = "allow-scripts";
    }
    el.src = page;
    function reload(): void {
      type = VomnibarNS.PageType.inner;
      el.removeAttribute("referrerPolicy");
      el.removeAttribute("sandbox");
      el.src = page = inner as string; inner = null;
      let opts = Vomnibar.options; opts && (opts.ptype = type);
    }
    el.style.visibility = "hidden";
    let loaded = false;
    el.onload = function(this: typeof el): void {
      const _this = Vomnibar;
      loaded = true;
      if (_this.onReset) { return; }
      if (type !== VomnibarNS.PageType.inner && _this.isABlank()) {
        console.log("Vimium++: use built-in Vomnibar page because the preferred is too old.");
        return reload();
      }
      const wnd = this.contentWindow,
      sec: VomnibarNS.MessageData = [secret, _this.options as VomnibarNS.FgOptionsToFront],
      origin = page.substring(0, page.startsWith("file:") ? 7 : page.indexOf("/", page.indexOf("://") + 3));
      if (inner || (VSettings.cache.browserVer < BrowserVer.MinSafeWndPostMessageAcrossProcesses)) setTimeout(function(i): void {
        const a = Vomnibar, ok = !a || a.status !== VomnibarNS.Status.Initing;
        if (ok || i) { a && a.box && (a.box.onload = a.options = null as never); return; }
        if (type !== VomnibarNS.PageType.inner) { return reload(); }
        a.reset();
        (VDom.UI.box as HTMLElement).style.display = "";
        window.focus();
        a.status = VomnibarNS.Status.KeepBroken;
        return (a as any).activate();
      }, 1000); else {
        this.onload = null as never;
      }
      if (location.origin !== origin || !origin.startsWith("chrome")) {
        const channel = new MessageChannel();
        _this.port = channel.port1;
        channel.port1.onmessage = _this.onMessage.bind(_this);
        wnd.postMessage(sec, type !== VomnibarNS.PageType.web ? origin : "*", [channel.port2]);
        return;
      }
      if (!(wnd.Vomnibar && wnd.onmessage)) { return reload(); }
      type FReq = VomnibarNS.FReq;
      type CReq = VomnibarNS.CReq;
      const port: VomnibarNS.IframePort = {
        sameOrigin: true,
        onmessage: null as never as VomnibarNS.IframePort["onmessage"],
        postMessage<K extends keyof FReq> (data: FReq[K] & VomnibarNS.Msg<K>): void | 1 {
          return Vomnibar.onMessage<K>({ data });
        }
      };
      _this.sameOrigin = true;
      _this.port = {
        close (): void { port.postMessage = function() {}; },
        postMessage<K extends keyof CReq> (data: CReq[K]): void | 1 { return port.onmessage<K>({ data }); }
      };
      if (location.hash === "#chrome-ui" && !("VimiumInjector" in window)) { _this.top = "8px"; }
      wnd.onmessage({ source: window, data: sec, ports: [port] });
    };
    if (CSS) {
      UI.css("");
    }
    UI.addElement(this.box = el, AdjustType.AdjustButNotShow, VHUD.box);
    if (CSS) {
      UI.css(CSS);
    }
    type !== VomnibarNS.PageType.inner && setTimeout(function(i): void { loaded || i || Vomnibar.onReset || reload(); }, 2000);
  },
  reset (redo?: boolean): void | 1 {
    if (this.status === VomnibarNS.Status.NotInited) { return; }
    const oldStatus = this.status;
    this.status = VomnibarNS.Status.NotInited;
    this.port.close();
    this.box.remove();
    this.port = this.box = null as never;
    this.sameOrigin = false;
    this.defaultTop = "";
    VUtils.remove(this);
    this.options = null;
    if (this.onReset) { return this.onReset(); }
    if (!redo || oldStatus < VomnibarNS.Status.ToShow) { return; }
    return VPort.post({ handler: "activateVomnibar", redo: true, inner: true });
  },
  isABlank (): boolean {
    try {
      const doc = this.box.contentDocument;
      if (doc && doc.URL === "about:blank") { return true; }
    } catch (e) {}
    return false;
  },
  onMessage<K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }): void | 1 {
    type Req = VomnibarNS.FReq;
    switch (data.name) {
    case "uiComponentIsReady":
      this.status = VomnibarNS.Status.ToShow;
      let opt = this.options;
      if (opt) { this.options = null; return this.port.postMessage<"activate">(opt as VomnibarNS.FgOptionsToFront); }
      break;
    case "style":
      this.box.style.height = (data as Req["style"]).height / VDom.wdZoom + "px";
      if (this.status === VomnibarNS.Status.Initing || this.status === VomnibarNS.Status.ToShow) {
        this.maxBoxHeight = (data as Req["style"]).max as number;
        this.onShown();
      }
      break;
    case "focus": window.focus(); return VEventMode.suppress((data as Req["focus"]).key);
    case "hide": return this.hide(1);
    case "scroll": return VEventMode.scroll(data as Req["scroll"]);
    case "scrollGoing": VScroller.keyIsDown = VScroller.maxInterval; break;
    case "scrollEnd": VScroller.keyIsDown = 0; break;
    case "evalJS": VPort.evalIfOK((data as Req["evalJS"]).url); break;
    case "broken": (data as Req["broken"]).active && window.focus(); // no break;
    case "unload": return Vomnibar ? this.reset(data.name === "broken") : undefined;
    case "hud": VHUD.showForDuration((data as Req["hud"]).text); return;
    default: console.log("[%d] Vimium++: unknown message \"%s\" from Vomnibar page", Date.now(), data.name);
    }
  },
  onShown (): number {
    this.status = VomnibarNS.Status.Showing;
    let style = this.box.style, bh = this.maxBoxHeight;
    if (bh > 0) {
      const sh = this.screenHeight,
      NormalTopHalf = (bh * 0.6) | 0, ScreenHeightThreshold = (VomnibarNS.PixelData.MarginTop + NormalTopHalf) * 2;
      this.defaultTop = sh > ScreenHeightThreshold ? (50 - NormalTopHalf / sh * 100) + "%" : "";
    }
    style.top = VDom.wdZoom !== 1 ? ((VomnibarNS.PixelData.MarginTop / VDom.wdZoom) | 0) + "px" : this.top || this.defaultTop;
    if (style.visibility) {
      style.visibility = "";
      const box = VDom.UI.box as HTMLElement;
      box.hasAttribute("style") && box.removeAttribute("style");
    } else {
      style.display = "";
    }
    VUtils.remove(this);
    return VUtils.push(this.onKeydown, this);
  },
  onKeydown (event: KeyboardEvent): HandlerResult {
    if (VEventMode.lock()) { return HandlerResult.Nothing; }
    if (VKeyboard.isEscape(event)) { this.hide(); return HandlerResult.Prevent; }
    const key = event.keyCode - VKeyCodes.f1;
    if (key === 0 || key === 1) {
      this.focus();
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  },
  focus (): void | 1 {
    if (this.status < VomnibarNS.Status.Showing) { return; }
    return this.port.postMessage("focus");
  }
};
