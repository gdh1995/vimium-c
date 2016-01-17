"use strict";
Settings.RequestHandlers.regExt = function(request) {
  if (Settings.RequestHandlers.reg(request)) {
    return true;
  }
  var id = chrome.runtime.id;
  if (typeof id === "string" && id.length === 32) {
    MainPort.port.postMessage({
      handler: "ext",
      extId: id
    });
  }
};

DomUtils.isSandboxed = function () {
  var i = 0, node;
  if (window.onunload == null) {
    node = this.createElement('div');
    node.onclick = function() { ++i };
    node.click();
    if (i === 0) {
      this.isSandboxed = function() { return true; };
      return true;
    }
  }
  this.isSandboxed = function() { return false; };
  return false;
};

DomUtils.documentReady(function() {
  if (Settings.RequestHandlers.regExt()) {
    return;
  }
  var ELs = Settings.ELs;
  window.addEventListener("unload", ELs.onUnload);
  window.addEventListener("hashchange", Settings.RequestHandlers.checkIfEnabled);
  ELs.onWndFocus = MainPort.safePost.bind(MainPort, ELs.focusMsg, null, function() {
    setTimeout(function() {
      if (MainPort && !MainPort.port) {
        Settings.ELs.destroy();
      }
    }, 50);
  });
});

(function() {
var _listen = EventTarget.prototype.addEventListener;
if (_listen.vimiumHooked === true) { return; }

EventTarget.prototype.addEventListener = function(type, listener, useCapture) {
  if (type === "click" && this instanceof Element) {
    this.vimiumHasOnclick = true;
  }
  return _listen.call(this, type, listener, useCapture);
};
EventTarget.prototype.addEventListener.vimiumHooked = true;
})();

if (chrome.runtime.onMessageExternal) {
  Settings.ELs.onMessage = (function(request, sender) {
    if (sender.id === "hfjbmagddngcpeloejdejnfgbamkjaeg") {
      request = request["vimium++"];
      if (request && (request.tabId ? request.tabId === Settings.ELs.focusMsg.tabId : true)) {
        this(request.request);
      }
    }
  }).bind(Settings.ELs.onMessage);
  chrome.runtime.onMessageExternal.addListener(Settings.ELs.onMessage);
  VimiumInjector.alive = 1;
} else {
  Settings.ELs.onMessage = null;
  VimiumInjector.alive = 0.5;
  console.log("%cVimium++ %c#" + Settings.ELs.focusMsg.frameId
    + "%c: injected %cpartly%c into %c" + chrome.runtime.id
    , "color: red;", "color: blue;", "color: auto;"
    , "color: red;", "color: auto;", "color: blue;");
}

Settings.onDestroy.injected = function() {
  window.removeEventListener("unload", this.onUnload);
  window.removeEventListener("hashchange", Settings.RequestHandlers.checkIfEnabled);
  try {
    this.onMessage && chrome.runtime.onMessageExternal.removeListener(this.onMessage);
  } catch (e) {}
  if (MainPort.port) {
    try {
      MainPort.port.disconnect();
    } catch (e) {}
  }
  var injector = VimiumInjector;
  injector.alive = 0;
  injector.oldFrameId = this.focusMsg.frameId;
  injector.destroy = null;
  [].forEach.call(document.querySelectorAll(
  'script[src^="chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/"]'
  ), function(node) { node.remove(); });
};

VimiumInjector.destroy = function() { Settings.ELs.destroy(); };
