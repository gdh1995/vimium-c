"use strict";
VSettings.checkIfEnabled = function() {
  VPort.safePost({
    handler: "checkIfEnabled",
    url: window.location.href
  });
};

Vomnibar.destroy = function(delayed) {
  if (!delayed) {
    setTimeout(function() { Vomnibar && Vomnibar.destroy(true); }, 100);
    return;
  }
  this.box.remove();
  VHandler.remove(this);
  this.port.close();
  var i, f = Object.prototype.hasOwnProperty;
  for (var i in this) { f.call(this, i) && (this[i] = null); }
  this.activate = function() {
    VHUD.showForDuration("Sorry, Vimium++ reloaded and Vomnibar is broken.", 2000);
    setTimeout(function() {
      VHUD.showForDuration("Please refresh the page to reopen Vomnibar.", 2000);
    }, 1900);
  };
  this.hide = function() {};
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

[VKeyboard, VDom, VRect, VHints, Vomnibar, VScroller, VMarks,
  VFindMode, VSettings, VHUD, VPort, VVisualMode,
  VimiumInjector].forEach(Object.seal);
[VUtils, VKeyCodes, VHandler].forEach(Object.freeze);
