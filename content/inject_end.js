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
    node = DomUtils.createElement('div');
    node.onclick = function() { ++i };
    node.click();
    if (i === 0) {
      DomUtils.isSandboxed = function() { return true; };
      return true;
    }
  }
  DomUtils.isSandboxed = function() { return false; };
  return false;
};

DomUtils.DocumentReady(function() {
  if (Settings.RequestHandlers.regExt()) {
    return;
  }
  var ELs = Settings.ELs;
  window.addEventListener("unload", ELs.onUnload);
  window.addEventListener("hashchange", Settings.RequestHandlers.checkIfEnabled);
  ELs.onWndFocus = MainPort.safePost.bind(MainPort, ELs.focusMsg, null
    , setTimeout.bind(null, function() {
      if (MainPort && !MainPort.port) {
        Settings.ELs.destroy();
      }
    }, 50) //
  );
});

(function() {
var _listen = Element.prototype.addEventListener, handler;
if (_listen.vimiumHooked === true) { return; }

handler = function(type) {
  if (type === "click" && this instanceof Element) {
    this.hasOnclick = true;
  }
  return _listen.apply(this, arguments);
};
handler.vimiumHooked = true;
EventTarget.prototype.addEventListener = handler;
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
