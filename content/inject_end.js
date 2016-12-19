"use strict";

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

[VDom, VRect, VHints, VKeyboard, Vomnibar, VScroller, VMarks,
  VFindMode, VSettings, VHUD, VVisualMode,
  VimiumInjector].forEach(Object.seal);
[VUtils, VKeyCodes, VHandler, VEventMode, VPort].forEach(Object.freeze);
