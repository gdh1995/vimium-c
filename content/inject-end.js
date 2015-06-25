"use strict";
Settings.RequestHandlers.regExt = function(request) {
  if (Settings.RequestHandlers.reg(request)) {
    return true;
  }
  var id = chrome.runtime.id;
  if (typeof id === "string" && id.length === 32) {
    MainPort.port.postMessage({
      handlerSettings: "ext",
      extId: id
    });
  }
};

DomUtils.isSandboxed = function () {
  var i = 0, node;
  if (window.onunload == null) {
    node = document.createElement('div');
    node.onclick = function() { ++i };
    node.click();
    if (i === 0) {
      DomUtils.isSandboxed = function() { return true; }
      return true;
    }
  }
  DomUtils.isSandboxed = function() { return false; }
  return false;
};

DomUtils.DocumentReady(function() {
  if (Settings.RequestHandlers.regExt()) {
    return;
  }
  var ELs = Settings.ELs;
  ELs.unloadMsg.isExt = true;
  window.addEventListener("unload", ELs.onUnload);
  window.addEventListener("hashchange", Settings.RequestHandlers.checkIfEnabled);
  window.addEventListener("focus", ELs.onFocus = (function(event) {
    if (event.target == window) {
      this();
    }
  }).bind(MainPort.safePost.bind(MainPort, ELs.focusMsg
  , Settings.RequestHandlers.refreshKeyQueue, null
  , setTimeout.bind(null, function() {
      if (MainPort && !MainPort.port) {
        Settings.ELs.destroy();
      }
    }, 50) //
  )));
});

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
} else {
  Settings.ELs.onMessage = null;
  console.log("%cVimium++ %c#" + Settings.ELs.focusMsg.frameId
    + "%c: injected %cpartly%c into %c" + chrome.runtime.id
    , "color: red;", "color: blue;", "color: auto;"
    , "color: red;", "color: auto;", "color: blue;");
}

Settings.onDestroy.injected = function() {
  window.removeEventListener("unload", this.onUnload);
  window.removeEventListener("focus", this.onFocus);
  window.removeEventListener("hashchange", Settings.RequestHandlers.checkIfEnabled);
  try {
    this.onMessage && chrome.runtime.onMessageExternal.removeListener(this.onMessage);
  } catch (e) {}
  Settings.RequestHandlers = Settings.ELs = null;
  var injector = window.VimiumInjector;
  injector.active = false;
  injector.oldFrameId = this.focusMsg.frameId;
  injector.destroy = null;
};

window.VimiumInjector.destroy = Settings.ELs.destroy.bind(Settings.ELs);
