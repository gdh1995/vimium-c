"use strict";

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
  VPort.post({ handler: "activateVomnibar", redo: true });
};

VDom.documentReady(function() {
  if (!VSettings) { return; }
  addEventListener("hashchange", VSettings.checkIfEnabled);
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
  var injector = VimiumInjector;
  injector.alive = 0;
  injector.destroy = null;
  try {
    typeof EventTarget.vimiumRemoveHooks === "function" && EventTarget.vimiumRemoveHooks();
  } catch (e) {}
};

VimiumInjector.destroy = VSettings.destroy;

[VDom, VRect, VHints, Vomnibar, VScroller, VMarks,
  VFindMode, VSettings, VHUD, VPort, VVisualMode,
  VimiumInjector].forEach(Object.seal);
[VUtils, VKeyboard, VKeyCodes, VHandler, VEventMode].forEach(Object.freeze);
