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
  zoom: 0,
  defaultTop: "",
  sameOrigin: false,
  activate (count: number, options: VomnibarNS.FullOptions): void {
    if (this.status === VomnibarNS.Status.KeepBroken) {
      return VHUD.showForDuration("Sorry, Vomnibar page seems to fail to load.", 2000);
    }
    if (!options || !options.secret || !options.vomnibar) { return; }
    if (document.readyState === "loading") {
      if (!this.zoom) {
        this.zoom = setTimeout(this.activate.bind(this, count, options), 500);
        return;
      }
    }
    this.zoom = 0;
    if (!VDom.isHTML()) { return; }
    if (options.url === true && (window.top === window || !options.topUrl || typeof options.topUrl !== "string")) {
      options.topUrl = window.location.href;
    }
    if (this.status === VomnibarNS.Status.NotInited && VHints.tryNestedFrame("Vomnibar.activate", count, options)) { return; }
    this.options = null;
    options.width = window.innerWidth; options.height = window.innerHeight;
    this.zoom = VDom.UI.getZoom();
    this.status > VomnibarNS.Status.Inactive || VUtils.push(VDom.UI.SuppressMost, this);
    this.box && VDom.UI.adjust();
    if (this.status === VomnibarNS.Status.NotInited) {
      this.status = VomnibarNS.Status.Initing;
      this.init(options);
    } else if (this.isABlank()) {
      this.onReset = function(this: typeof Vomnibar): void { this.onReset = null; return this.activate(count, options); };
      return;
    } else if (this.status === VomnibarNS.Status.Inactive) {
      this.status = VomnibarNS.Status.ToShow;
    } else if (this.status > VomnibarNS.Status.ToShow) {
      this.box.contentWindow.focus();
      this.onShown();
    }
    options.secret = 0; options.vomnibar = options.CSS = "";
    options.name = "activate";
    let url = options.url, upper = 0;
    if (url === true) {
      if (url = VDom.getSelectionText()) {
        options.force = true;
      } else {
        url = options.topUrl as string;
      }
      upper = 1 - count;
      options.topUrl = "";
      options.url = url;
    } else if (url != null) {
      url = options.url = typeof url === "string" ? url : null;
    }
    if (!url || url.indexOf("://") === -1) {
      options.search = "";
      return this.setOptions(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
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
    this.zoom = 0; this.status = VomnibarNS.Status.Inactive;
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
    type === VomnibarNS.PageType.web && (el.referrerPolicy = "no-referrer");
    el.src = page;
    function reload(): void {
      type = VomnibarNS.PageType.inner;
      el.removeAttribute("referrerPolicy");
      el.src = page = inner as string;
    }
    el.style.visibility = "hidden";
    el.onload = function(this: typeof el): void {
      const _this = Vomnibar, i = page.indexOf("://"), wnd = this.contentWindow,
      sec: VomnibarNS.MessageData = [secret, _this.options as VomnibarNS.FgOptionsToFront];
      if (_this.onReset) { return; }
      if (type !== VomnibarNS.PageType.inner && _this.isABlank()) {
        console.log("Vimium++: use built-in Vomnibar page because the preferred is too old.");
        return reload();
      }
      page = page.substring(0, page.indexOf("/", i + 3));
      inner && setTimeout(function(): void {
        const a = Vomnibar, ok = !a || a.status !== VomnibarNS.Status.Initing;
        if (ok) { a && a.box && (a.box.onload = a.options = null as never); return; }
        if (type !== VomnibarNS.PageType.inner) { return reload(); }
        a.reset();
        (VDom.UI.box as HTMLElement).style.display = "";
        window.focus();
        a.zoom = 0;
        a.status = VomnibarNS.Status.KeepBroken;
        return (a as any).activate();
      }, 1000);
      if (location.origin !== page || !page.startsWith("chrome")) {
        const channel = new MessageChannel();
        _this.port = channel.port1;
        channel.port1.onmessage = _this.onMessage.bind(_this);
        wnd.postMessage(sec, page !== "file://" ? page : "*", [channel.port2]);
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
      if (location.hash === "#chrome-ui") { _this.defaultTop = "5px"; }
      wnd.onmessage({ source: window, data: sec, ports: [port] });
    };
    if (CSS) {
      UI.css("");
    }
    UI.addElement(this.box = el, AdjustType.AdjustButNotShow);
    if (CSS) {
      UI.css(CSS);
    }
  },
  reset (redo?: boolean): void | 1 {
    if (this.status === VomnibarNS.Status.NotInited) { return; }
    const oldStatus = this.status;
    this.status = VomnibarNS.Status.NotInited;
    this.port.close();
    this.box.remove();
    this.port = this.box = null as never;
    this.sameOrigin = false;
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
    switch (data.name as keyof Req) {
    case "uiComponentIsReady":
      this.status = VomnibarNS.Status.ToShow;
      let opt = this.options;
      if (opt) { this.options = null; return this.port.postMessage<"activate">(opt as VomnibarNS.FgOptionsToFront); }
      break;
    case "style":
      this.box.style.height = (data as Req["style"]).height / this.zoom + "px";
      if (this.status === VomnibarNS.Status.Initing || this.status === VomnibarNS.Status.ToShow) { this.onShown(); }
      break;
    case "focus": window.focus(); return VEventMode.suppress((data as Req["focus"]).lastKey);
    case "hide": return this.hide(1);
    case "scroll": return VEventMode.scroll(data as Req["scroll"]);
    case "scrollGoing": VScroller.keyIsDown = VScroller.maxInterval; break;
    case "scrollEnd": VScroller.keyIsDown = 0; break;
    case "evalJS": VUtils.evalIfOK((data as Req["evalJS"]).url); break;
    case "broken": (data as Req["broken"]).active && window.focus(); // no break;
    case "unload": return Vomnibar ? this.reset(data.name === "broken") : undefined;
    }
  },
  onShown (): number {
    this.status = VomnibarNS.Status.Showing;
    let style = this.box.style;
    style.top = this.zoom !== 1 ? ((62 / this.zoom) | 0) + "px" : this.defaultTop;
    if (style.visibility) {
      style.visibility = "";
      style = (VDom.UI.box as HTMLElement).style;
    }
    style.display = "";
    VUtils.remove(this);
    return VUtils.push(this.onKeydown, this);
  },
  onKeydown (event: KeyboardEvent): HandlerResult {
    if (VEventMode.lock()) { return HandlerResult.Nothing; }
    if (VKeyboard.isEscape(event)) { this.hide(); return HandlerResult.Prevent; }
    const key = event.keyCode - VKeyCodes.f1;
    if (key === 0 || key === 1) {
      this.focus(key);
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  },
  focus (f2: BOOL): void | 1 {
    if (this.status < VomnibarNS.Status.Showing) { return; }
    this.box.contentWindow.focus();
    return this.port.postMessage<"focus" | "backspace">(f2 ? "focus" : "backspace");
  }
};
