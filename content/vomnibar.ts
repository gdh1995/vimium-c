declare namespace VomnibarNS {
  interface ContentOptions extends GlobalOptions {
    trailing_slash: boolean;
    url: true | string;
  }
  interface Port {
    postMessage<K extends keyof CReq> (this: Port, msg: CReq[K]): void | 1;
    close (this: Port): void | 1;
  }
  interface IFrameWindow extends Window {
    Vomnibar: { showFavIcon: boolean };
    VPort?: object;
    onmessage: (this: void, ev: { source: Window, data: [number, FgOptions | null], ports: IframePort[] }) => void | 1;
  }
  type BaseFullOptions = CmdOptions["Vomnibar.activate"] & VomnibarNS.BaseFgOptions & Partial<ContentOptions> & SafeObject;
  interface FullOptions extends BaseFullOptions {
    topUrl?: string;
    count?: number;
    name: string;
  }
}

var Vomnibar = {
  box: null as never as HTMLIFrameElement & { contentWindow: VomnibarNS.IFrameWindow },
  port: null as never as VomnibarNS.Port,
  status: VomnibarNS.Status.NotInited,
  options: null as VomnibarNS.FgOptionsToFront | null,
  width: 0,
  zoom: 0,
  defaultTop: "",
  sameOrigin: false,
  activate (count: number, options: VomnibarNS.FullOptions): void {
    if (!options.secret || !options.vomnibar) { return; }
    if (document.readyState === "loading") {
      if (!this.width) {
        this.width = setTimeout(this.activate.bind(this, count, options), 500);
        return;
      }
      this.width = 0;
    }
    if (!VDom.isHTML()) { return; }
    if (options.url === true) {
      if (window.top === window || !options.topUrl) {
        options.topUrl = window.location.href;
      }
      options.count = count;
    }
    if (VHints.tryNestedFrame("Vomnibar.activate", 1, options)) { return; }
    this.options = null;
    this.width = Math.max(window.innerWidth - 24, (document.documentElement as
      HTMLElement).getBoundingClientRect().width);
    this.zoom = VDom.UI.getZoom();
    this.status > VomnibarNS.Status.Inactive || VHandler.push(VDom.UI.SuppressMost, this);
    this.box && VDom.UI.adjust();
    if (this.status === VomnibarNS.Status.NotInited) {
      this.init(options.secret, options.vomnibar);
      this.status = VomnibarNS.Status.Initing;
    } else if (this.checkAlive()) {
      return;
    } else if (this.status === VomnibarNS.Status.Inactive) {
      this.status = VomnibarNS.Status.ToShow;
    } else if (this.status > VomnibarNS.Status.ToShow) {
      this.box.contentWindow.focus();
      this.onShown();
    }
    options.secret = 0; options.vomnibar = "";
    options.width = this.width, options.name = "activate";
    let url = options.url, upper = 0;
    if (url === true) {
      if (url = VDom.getSelectionText()) {
        options.force = true;
      } else {
        url = options.topUrl;
      }
      upper = 1 - (options.count as number);
      options.topUrl = ""; options.count = 1;
      options.url = url;
    }
    if (!url || url.indexOf("://") === -1) {
      options.search = "";
      return this.setOptions(options as VomnibarNS.FgOptions as VomnibarNS.FgOptionsToFront);
    }
    return VPort.send({
      handler: "parseSearchUrl",
      trailing_slash: options.trailing_slash,
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
  hide (action: VomnibarNS.HideType): void | number {
    if (this.status <= VomnibarNS.Status.Inactive) { return; }
    VHandler.remove(this);
    this.width = this.zoom = 0; this.status = VomnibarNS.Status.Inactive;
    if (!this.box) { return; }
    this.box.style.cssText = "display: none";
    if (action < VomnibarNS.HideType.MinAct) {
      this.port.postMessage<"hide">("hide");
      action === VomnibarNS.HideType.OnlyFocus && setTimeout(function() { window.focus(); }, 17);
      return;
    }
    let f: typeof requestAnimationFrame, act = function(): void | 1 {
      return Vomnibar.port.postMessage<"onHidden">("onHidden");
    };
    return action === VomnibarNS.HideType.WaitAndAct ? (f = requestAnimationFrame)(function() { f(act); }) : act();
  },
  init (secret: number, page: string): HTMLIFrameElement {
    const el = VDom.createElement("iframe") as typeof Vomnibar.box;
    el.src = page;
    el.className = "R UI Omnibar";
    el.style.visibility = "hidden";
    el.onload = function(this: typeof el): void {
      const _this = Vomnibar, i = page.indexOf("://"), wnd = this.contentWindow,
      sec: VomnibarNS.MessageData = [secret, _this.options];
      this.onload = null as never;
      _this.options = null;
      page = page.substring(0, page.indexOf("/", i + 3));
      if (location.origin !== page) {
        const channel = new MessageChannel();
        _this.port = channel.port1;
        channel.port1.onmessage = _this.onMessage.bind(_this);
        wnd.postMessage(sec, page, [channel.port2]);
        return;
      }
      type FReq = VomnibarNS.FReq;
      type CReq = VomnibarNS.CReq;
      const port: VomnibarNS.IframePort = {
        onmessage: null as never as VomnibarNS.IframePort["onmessage"],
        postMessage<K extends keyof FReq> (data: FReq[K] & VomnibarNS.Msg<K>): void | 1 {
          return Vomnibar.onMessage<K>({ data });
        }
      };
      _this.sameOrigin = true;
      _this.port = {
        close (): void {},
        postMessage<K extends keyof CReq> (data: CReq[K]): void | 1 { return port.onmessage<K>({ data }); }
      };
      if (location.hash === "#chrome-ui") { _this.defaultTop = "5px"; }
      wnd.Vomnibar.showFavIcon = true;
      wnd.onmessage({ source: window, data: sec, ports: [port] });
    };
    return VDom.UI.addElement(this.box = el, {adjust: true, showing: false});
  },
  _forceRedo: false,
  reset (redo?: boolean): void | 1 {
    const oldStatus = this.status;
    this.port.close();
    this.box.remove();
    this.port = this.box = null as never;
    VHandler.remove(this);
    this.status = VomnibarNS.Status.NotInited;
    if (this._forceRedo) { this._forceRedo = false; }
    else if (!redo || oldStatus < VomnibarNS.Status.ToShow || oldStatus > VomnibarNS.Status.Showing) { return; }
    return VPort.post({ handler: "activateVomnibar", redo: true });
  },
  checkAlive (): boolean {
    const wnd = this.box.contentWindow;
    try {
      if (wnd && wnd.VPort && this.sameOrigin) { return false; }
    } catch (e) { return false; }
    return this._forceRedo = true;
  },
  onMessage<K extends keyof VomnibarNS.FReq> ({ data }: { data: VomnibarNS.FReq[K] & VomnibarNS.Msg<K> }): void | 1 {
    type Req = VomnibarNS.FReq;
    switch (data.name) {
    case "uiComponentIsReady":
      this.status = VomnibarNS.Status.ToShow;
      let opt = this.options;
      if (opt) { this.options = null; return this.port.postMessage<"activate">(opt); }
      break;
    case "style":
      this.box.style.height = (data as Req["style"]).height / this.zoom + "px";
      if (this.status === VomnibarNS.Status.Initing || this.status === VomnibarNS.Status.ToShow) { this.onShown(); }
      break;
    case "focus": window.focus(); return VEventMode.suppress((data as Req["focus"]).lastKey);
    case "hide": this.hide((data as Req["hide"]).waitFrame); break;
    case "scrollBy": return VScroller.scrollBy(1, (data as Req["scrollBy"]).amount, 0);
    case "scrollGoing": VScroller.keyIsDown = VScroller.Core.maxInterval; break;
    case "scrollEnd": VScroller.keyIsDown = 0; break;
    case "evalJS": VUtils.evalIfOK((data as Req["evalJS"]).url); break;
    case "broken": (data as Req["broken"]).active && window.focus(); // no break;
    case "unload": return Vomnibar ? this.reset(data.name !== "unload") : undefined;
    }
  },
  onShown (): number {
    this.status = VomnibarNS.Status.Showing;
    let style = this.box.style, width = this.width * 0.8;
    style.width = width !== (width | 0) ? (width | 0) / (width / 0.8) * 100 + "%" : "";
    style.top = this.zoom !== 1 ? ((70 / this.zoom) | 0) + "px" : this.defaultTop;
    if (style.visibility) {
      style.visibility = "";
      style = (VDom.UI.box as HTMLElement).style;
    }
    style.display = "";
    VHandler.remove(this);
    return VHandler.push(this.onKeydown, this);
  },
  onKeydown (event: KeyboardEvent): HandlerResult {
    if (VEventMode.lock()) { return HandlerResult.Nothing; }
    if (VKeyboard.isEscape(event)) { this.hide(VomnibarNS.HideType.OnlyFocus); return HandlerResult.Prevent; }
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
