"use strict";
var Vomnibar = {
  box: null,
  port: null,
  status: 0,
  options: null,
  width: 0,
  activate: function(_0, options, forceCurrent) {
    if (!options.secret || !options.page) { return false; }
    if (document.readyState === "loading") {
      if (!this.width) {
        this.width = setTimeout(this.activate.bind(this, options), 500);
        return;
      }
      this.width = 0;
    }
    if (!(document.documentElement instanceof HTMLHtmlElement)) { return false; }
    Object.setPrototypeOf(options || (options = {}), null);
    options.url === true && !options.topUrl && (options.topUrl = window.location.href);
    if ((forceCurrent |= 0) < 2 &&
        VHints.tryNestedFrame("Vomnibar.activate", [1, options, 2])) {
      return;
    }
    var secret = options.secret, url = options.page;
    delete options.secret; delete options.page;
    this.width = document.documentElement.clientWidth;
    this.options = options;
    VHandler.remove(this);
    VHandler.push(VDom.UI.SuppressMost, this);
    if (this.Init) {
      setTimeout(this.Init, 0, secret, url);
      this.status = 1;
      this.Init = null;
    } else if (!this.status) {
      this.status = 2;
      this.show();
    }
  },
  show: function() {
    if (this.status < 2) { return; }
    var width = this.width, options = this.options, url;
    options.width = width, options.name = "activate";
    this.options = null, this.width = 0;
    url = options.url;
    if (url === true) {
      if (url = VDom.getSelectionText()) {
        options.forceNewTab = true;
      } else {
        url = options.topUrl;
      }
      delete options.topUrl;
      options.url = url;
    }
    width *= 0.8;
    if (width !== (width | 0)) {
      this.box.style.width = (width | 0) / (width / 0.8) * 100 + "%";
    }
    if (!url || url.indexOf("://") === -1) {
      options.search = "";
      this.port.postMessage(options);
      return;
    }
    VPort.sendMessage({
      handler: "parseSearchUrl",
      url: url
    }, function(search) {
      options.search = search;
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
    isMsg === true || this.port.postMessage("hide");
  },
  Init: function(secret, page) {
    var _this = Vomnibar, el;
    el = _this.box = VDom.createElement("iframe");
    el.style.display = "none";
    el.className = "Omnibar";
    el.src = page;
    el.onload = function() {
      var channel = new MessageChannel(), i = page.indexOf("://");
      _this.port = channel.port1;
      _this.port.onmessage = _this.onMessage.bind(_this);
      page = page.substring(0, page.indexOf("/", i + 3));
      this.contentWindow.postMessage(secret, page, [channel.port2]);
    };
    VDom.UI.addElement(el);
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
      this.box.style.height = data.height + "px";
      this.status === 2 && this.onShown();
      break;
    case "focus": window.focus(); break;
    case "hide": this.hide(true); break;
    case "scrollBy": VScroller.scrollBy(1, data.amount); break;
    case "scrollGoing": VScroller.keyIsDown = VScroller.Core.maxInterval; break;
    case "scrollEnd": VScroller.keyIsDown = 0; break;
    case "evalJS": VUtils.evalIfOK(data.url); break;
    default: break;
    }
  },
  onShown: function() {
    this.status = 3;
    this.box.style.display = "";
    VHandler.remove(this);
    VHandler.push(this.onKeydown, this);
  },
  onKeydown: function() {
    var key = event.keyCode, i;
    if (key == VKeyCodes.esc) {
      return VKeyboard.isPlain(event) ? (this.hide(), 2) : 0;
    }
    i = VKeyCodes.f1;
    if (key === i || key === i + 1) {
      this.box.contentWindow.focus();
      this.port.postMessage(key === i ? "backspace" : "focus");
      return 2;
    }
    return 0;
  }
};
