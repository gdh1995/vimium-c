"use strict";
Settings.RequestHandlers.regExt = function(request) {
  if (this.reg(request)) {
    return true;
  }
  if (window.top === window && chrome.runtime.id) {
    MainPort.postMessage({
      handler: "regExt",
      extId: chrome.runtime.id
    });
  }
};

DomUtils.DocumentReady(function() {
  if (Settings.RequestHandlers.regExt()) {
    return;
  }
  var ELs = Settings.ELs;
  window.addEventListener("unload", ELs.onUnload);
  window.addEventListener("hashchange", ELs.onHashChange);
  window.addEventListener("focus", ELs.onFocus = (function(event) {
    if (event.target == window) {
      this();
    }
  }).bind(MainPort.safePost.bind(MainPort, ELs.focusMsg
  , Settings.RequestHandlers.refreshKeyQueue, setTimeout.bind(null, function() {
      if (!MainPort._port) {
        Settings.ELs.destroy();
      }
    }, 50) //
  )));
});

Settings.ELs.onMessage = (function(request, sender) {
  if (sender.id === "hfjbmagddngcpeloejdejnfgbamkjaeg") {
    this(request["vimium++"]);
  }
}).bind(Settings.ELs.onMessage);
chrome.runtime.onMessageExternal.addListener(Settings.ELs.onMessage);

Settings.ELs.onDestroy.injected = function() {
  window.removeEventListener("unload", this.onUnload);
  window.removeEventListener("focus", this.onFocus);
  window.removeEventListener("hashchange", this.onHashChange);
  try {
    chrome.runtime.onMessageExternal.removeEventListener(this.onMessage);
  } catch (e) {}
}
