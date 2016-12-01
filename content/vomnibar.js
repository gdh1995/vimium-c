"use strict";
var Vomnibar = {
  box: null,
  port: null,
  status: 0,
  options: null,
  width: 0,
  destroy: null,
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
    if (!(document.documentElement instanceof HTMLElement)) { return false; }
    Object.setPrototypeOf(options || (options = {}), null);
    if (options.url === true && !options.topUrl) {
      options.topUrl = window.location.href;
      options.count = +count || 1;
    }
    if ((forceCurrent |= 0) < 2 &&
        VHints.tryNestedFrame("Vomnibar.activate", [1, options, 2])) {
      return;
    }
    var secret = options.secret, url = options.vomnibar;
    delete options.secret; delete options.vomnibar;
    this.width = Math.max(window.innerWidth - 24, document.documentElement.clientWidth);
    this.options = options;
    if (this.Init) {
      setTimeout(this.Init, 0, secret, url);
      this.status = 1;
      this.Init = null;
    } else if (!this.status) {
      this.status = 2;
      this.show();
    } else if (this.status >= 3) {
      this.box.contentWindow.focus();
      return this.show();
    }
    VHandler.remove(this);
    VHandler.push(VDom.UI.SuppressMost, this);
  },
  show: function() {
    if (this.status < 2) { return; }
    var options = this.options, url, upper = 0;
    options.width = this.width, options.name = "activate";
    this.options = null;
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
      this.port.postMessage(options);
      return;
    }
    VPort.sendMessage({
      handler: "parseSearchUrl",
      upper: upper,
      trailing_slash: options.trailing_slash,
      url: url
    }, function(search) {
      options.search = search;
      if (search != null) { options.url = ""; }
      Vomnibar.port.postMessage(options);
    });
  },
  hide: function(isMsg) {
    if (!this.status) { return; }
    VHandler.remove(this);
    this.width = this.status = 0;
    this.options = null;
    if (!this.box) { return; }
    var style = this.box.style;
    style.display = "none", style.width = "", style.height = "";
    if (isMsg !== true) {
      this.port.postMessage("hide");
      setTimeout(function() { window.focus(); }, 17);
    }
  },
  Init: function(secret, page) {
    var _this = Vomnibar, el;
    el = _this.box = VDom.createElement("iframe");
    el.className = "LS Omnibar";
    el.style.visibility = "hidden";
    if (location.hash === "#chrome-ui") { el.style.top = "5px"; }
    el.src = page;
    el.onload = function() {
      var channel, port, i = page.indexOf("://");
      page = page.substring(0, page.indexOf("/", i + 3));
      if (location.origin === page) {
        port = {
          onmessage: null,
          postMessage: function(data) { Vomnibar.onMessage({ data: data }); }
        };
        _this.sameOrigin = true;
        _this.port = { postMessage: function(data) { port.onmessage({ data: data}); } };
        this.contentWindow.Vomnibar.showFavIcon = true;
        this.contentWindow.onmessage({ source: window, data: secret, ports: [port] });
        return;
      }
      channel = new MessageChannel();
      _this.port = channel.port1;
      _this.port.onmessage = _this.onMessage.bind(_this);
      this.contentWindow.postMessage(secret, page, [channel.port2]);
    };
    VDom.UI.addElement(el, false);
  },
  onMessage: function(event) {
    var data = event.data;
    switch (data.name || data) {
    case "uiComponentIsReady":
      this.box.onload = null;
      if (this.status !== 1) { return; }
      this.status = 2;
      this.show();
      break;
    case "style":
      if (this.status < 2) { return; }
      if (this.status === 2) {
        this.port.postMessage("afterOmni");
        this.onShown();
      }
      this.box.style.height = data.height + "px";
      break;
    case "focus": window.focus(); VEventMode.suppress(data.lastKey); break;
    case "hide": this.hide(true); break;
    case "scrollBy": VScroller.scrollBy(1, data.amount); break;
    case "scrollGoing": VScroller.keyIsDown = VScroller.Core.maxInterval; break;
    case "scrollEnd": VScroller.keyIsDown = 0; break;
    case "evalJS": VUtils.evalIfOK(data.url); break;
    case "broken": window.focus(); Vomnibar && this.destroy && this.destroy(); break;
    default: break;
    }
  },
  onShown: function() {
    this.status = 3;
    var style = this.box.style, width = this.width * 0.8;
    if (style.visibility) {
      style.visibility = "";
      style = VDom.UI.box.style;
    }
    this.sameOrigin ? (style.display = "")
      : setTimeout(function() { style.display = ""; }, 0);
    if (width !== (width | 0)) {
      this.box.style.width = (width | 0) / (width / 0.8) * 100 + "%";
    }
    VHandler.remove(this);
    VHandler.push(this.onKeydown, this);
  },
  onKeydown: function(event) {
    if (VKeyboard.isEscape(event)) { this.hide(); return 2; }
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
