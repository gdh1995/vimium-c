"use strict";
VSettings.checkIfEnabled = function() {
  VPort.safePost({
    handler: "checkIfEnabled",
    url: window.location.href
  });
};

Vomnibar._init = Vomnibar.Init;
Vomnibar.destroy = function() {
  var oldStatus = this.status;
  this.box.remove();
  this.port.close();
  this.port = this.box = null;
  VHandler.remove(this);
  this.Init = this._init;
  this.status = 0;
  if (oldStatus !== 2) { return; }
  VPort.port.postMessage({ handler: "reactivateVomnibar" });
};

VDom.documentReady(function() {
  if (VPort.safePost({ handler: "reg", visible: true })) {
    return;
  }
  addEventListener("hashchange", VSettings.checkIfEnabled);
  VEventMode.onWndFocus(VPort.safePost.bind(VPort, {
    handler: "frameFocused"
  }, function() {
    setTimeout(function() {
      if (VPort && !VPort.port) {
        VSettings.destroy();
      }
    }, 50);
  }));
  Object.freeze(VEventMode);
});

if (chrome.runtime.onMessageExternal) {
  VimiumInjector.alive = 1;
} else {
  VimiumInjector.alive = 0.5;
  console.log("%cVimium++%c: injected %cpartly%c into %c" + chrome.runtime.id
    , "color: red;", "color: auto;"
    , "color: red;", "color: auto;", "color: blue;");
}

VSettings.onDestroy = function() {
  removeEventListener("hashchange", VSettings.checkIfEnabled);
  if (VPort.port) {
    try {
      VPort.port.disconnect();
    } catch (e) {}
  }
  EventTarget.vimiumRemoveHooks && EventTarget.vimiumRemoveHooks();
  var injector = VimiumInjector;
  injector.alive = 0;
  injector.destroy = null;
};

VimiumInjector.destroy = VSettings.destroy;

[VDom, VRect, VHints, Vomnibar, VScroller, VMarks,
  VFindMode, VSettings, VHUD, VPort, VVisualMode,
  VimiumInjector].forEach(Object.seal);
[VUtils, VKeyboard, VKeyCodes, VHandler].forEach(Object.freeze);
