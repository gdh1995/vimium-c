"use strict";
var Vomnibar = {
  box: null,
  port: null,
  status: -1,
  options: null,
  width: 0,
  zoom: 0,
  defaultTop: "",
  sameOrigin: false,
  activate: function(count, options, forceCurrent) {
    if (!options.secret || !options.vomnibar) { return false; }
    if (document.readyState === "loading") {
      if (!this.width) {
        this.width = setTimeout(this.activate.bind(this, options), 500);
        return;
      }
      this.width = 0;
    }
    if (!VDom.isHTML()) { return false; }
    Object.setPrototypeOf(options || (options = {}), null);
    if (options.url === true && !options.topUrl) {
      options.topUrl = window.location.href;
      options.count = +count || 1;
    }
    if ((forceCurrent |= 0) < 2 &&
        VHints.tryNestedFrame("Vomnibar.activate", [1, options, 2])) {
      return;
    }
    this.options = null;
    this.width = Math.max(window.innerWidth - 24, document.documentElement.clientWidth);
    this.zoom = VDom.UI.getZoom();
    this.status > 0 || VHandler.push(VDom.UI.SuppressMost, this);
    var url, upper = 0, first = !VDom.UI.root;
    first || VDom.UI.adjust();
    if (this.status < 0) {
      this.init(options.secret, options.vomnibar);
      first && VDom.UI.adjust();
      this.status = 1;
    } else if (this.CheckAlive()) {
      return;
    } else if (!this.status) {
      this.status = 2;
    } else if (this.status > 2) {
      this.box.contentWindow.focus();
      this.onShown();
    }
    delete options.secret; delete options.vomnibar;
    options.width = this.width, options.name = "activate";
    url = options.url;
    if (url === true) {
      if (url = VDom.getSelectionText()) {
        options.forceNewTab = true;
      } else {
        url = options.topUrl;
      }
      upper = 1 - options.count;
      delete options.topUrl; delete options.count;
      options.url = url;
    }
    if (!url || url.indexOf("://") === -1) {
      options.search = "";
      return this.setOptions(options);
    }
    VPort.send({
      handler: "parseSearchUrl",
      upper: upper,
      trailing_slash: options.trailing_slash,
      url: url
    }, function(search) {
      options.search = search;
      if (search != null) { options.url = ""; }
      Vomnibar.setOptions(options);
    });
  },
  setOptions: function(options) {
    return this.status > 1 ? this.port.postMessage(options) : (this.options = options);
  },
  hide: function(action) {
    if (this.status <= 0) { return; }
    VHandler.remove(this);
    this.width = this.zoom = this.status = 0;
    if (!this.box) { return; }
    this.box.style = "display: none";
    if (action < 0) {
      this.port.postMessage("hide");
      action === -1 && setTimeout(function() { window.focus(); }, 17);
      return;
    }
    var next, act = function() { Vomnibar.port.postMessage("onHidden"); };
    action ? (next = requestAnimationFrame)(function() { next(act); }) : act();
  },
  init: function(secret, page) {
    var el = VDom.createElement("iframe"), reinit;
    el.src = page;
    el.className = "LS Omnibar";
    el.style.visibility = "hidden";
    el.onload = function() {
      var _this = Vomnibar, channel, port, i = page.indexOf("://"), wnd = this.contentWindow;
      this.onload = null;
      secret = [secret, _this.options];
      _this.options = null;
      page = page.substring(0, page.indexOf("/", i + 3));
      if (location.origin !== page) {
        channel = new MessageChannel();
        _this.port = channel.port1;
        _this.port.onmessage = _this.onMessage.bind(_this);
        wnd.postMessage(secret, page, [channel.port2]);
        return;
      }
      port = {
        onmessage: null,
        postMessage: function(data) { Vomnibar.onMessage({ data: data }); }
      };
      _this.sameOrigin = true;
      _this.port = { close: function() {}, postMessage: function(data) { port.onmessage({ data: data}); } };
      if (location.hash === "#chrome-ui") { _this.defaultTop = "5px"; }
      wnd.Vomnibar.showFavIcon = true;
      wnd.onmessage({ source: window, data: secret, ports: [port] });
    };
    return VDom.UI.addElement(this.box = el, false);
  },
  _forceRedo: false,
  reset: function(redo) {
    var oldStatus = this.status;
    this.port.close();
    this.box.remove();
    this.port = this.box = null;
    VHandler.remove(this);
    this.status = -1;
    if (this._forceRedo) { this._forceRedo = false; }
    else if (!redo || oldStatus < 2 || oldStatus > 3) { return; }
    VPort.post({ handler: "activateVomnibar", redo: true });
  },
  CheckAlive: function() {
    var a = Vomnibar;
    try {
      if (a.sameOrigin && a.box.contentWindow.VPort) { return false; }
      a.box && a.box.contentDocument;
    } catch (e) { return false; }
    return a._forceRedo = true;
  },
  onMessage: function(event) {
    var data = event.data;
    switch (data.name || data) {
    case "uiComponentIsReady":
      this.status = 2;
      if (data = this.options) { this.options = null; this.port.postMessage(data); }
      break;
    case "style":
      this.box.style.height = data.height / this.zoom + "px";
      return this.status !== 1 && this.status !== 2 || this.onShown();
    case "focus": window.focus(); VEventMode.suppress(data.lastKey); break;
    case "hide": this.hide(data.waitFrame); break;
    case "scrollBy": VScroller.scrollBy(1, data.amount); break;
    case "scrollGoing": VScroller.keyIsDown = VScroller.Core.maxInterval; break;
    case "scrollEnd": VScroller.keyIsDown = 0; break;
    case "evalJS": VUtils.evalIfOK(data.url); break;
    case "broken": data.active && window.focus(); // no break;
    case "unload": Vomnibar && this.reset(data !== "unload"); break;
    default: break;
    }
  },
  onShown: function() {
    this.status = 3;
    var style = this.box.style, width = this.width * 0.8;
    style.width = width !== (width | 0) ? (width | 0) / (width / 0.8) * 100 + "%" : "";
    style.top = this.zoom !== 1 ? ((70 / this.zoom) | 0) + "px" : this.defaultTop;
    if (style.visibility) {
      style.visibility = "";
      style = VDom.UI.box.style;
    }
    style.display = "";
    VHandler.remove(this);
    VHandler.push(this.onKeydown, this);
  },
  onKeydown: function(event) {
    if (VEventMode.lock()) { return 0; }
    if (VKeyboard.isEscape(event)) { this.hide(-1); return 2; }
    var key = event.keyCode - VKeyCodes.f1;
    if (key === 0 || key === 1) {
      this.focus(key);
      return 2;
    }
    return 0;
  },
  focus: function(f2) {
    if (this.status < 3) { return; }
    this.box.contentWindow.focus();
    this.port.postMessage(f2 ? "focus" : "backspace");
  }
};
