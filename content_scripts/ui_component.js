"use strict";
var UIComponent = (function() {
  function UIComponent(iframeUrl, className, handleMessage) {
    this.handleMessage = handleMessage;
    this.iframePort = null;
    this.iframeElement = document.createElement("iframe");
    this.iframeElement.className = className;
    this.iframeElement.seamless = "seamless";
    this.iframeElement.src = chrome.runtime.getURL(iframeUrl);
    this.iframeElement.addEventListener("load", this.openPort.bind(this));
    document.documentElement.appendChild(this.iframeElement);
    this.showing = true;
    this.hide(false);
  }

  UIComponent.prototype.openPort = function() {
    var messageChannel = new MessageChannel();
    this.iframePort = messageChannel.port1;
    this.iframePort.onmessage = this.handleMessage.bind(this);
    chrome.storage.local.get("vimiumSecret", this.onSecret.bind(this, messageChannel.port2));
  };

  UIComponent.prototype.onSecret = function(port2, arg) {
    this.iframeElement.contentWindow.postMessage(arg.vimiumSecret, chrome.runtime.getURL(""), [port2]);
  };

  UIComponent.prototype.postMessage = function(message) {
    this.iframePort.postMessage(message);
  };

  UIComponent.prototype.activate = function(message) {
    if (message != null) {
      this.postMessage(message);
    }
    if (this.showing) {
      this.iframeElement.classList.add("vimUIReactivated");
      var _this = this;
      setTimeout(function() {
        _this.iframeElement.classList.remove("vimUIReactivated");
      }, 200);
    } else {
      this.show();
    }
    this.iframeElement.focus();
  };

  UIComponent.prototype.show = function(message) {
    if (message != null) {
      this.postMessage(message);
    }
    this.iframeElement.classList.remove("vimUIHidden");
    this.iframeElement.classList.add("vimUIShowing");
    this.showing = true;
  };

  UIComponent.prototype.hide = function(focusWindow) {
    if (focusWindow == null) {
      focusWindow = true;
    }
    this.iframeElement.classList.remove("vimUIShowing");
    this.iframeElement.classList.add("vimUIHidden");
    if (focusWindow) {
      window.focus();
    }
    this.showing = false;
  };

  return UIComponent;
})();
