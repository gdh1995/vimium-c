VDom.documentReady(function() {
  if (!VSettings) { return; }
  addEventListener("hashchange", VSettings.checkIfEnabled);
});

if (chrome.runtime.onMessageExternal) {
  VimiumInjector.alive = 1;
} else {
  VimiumInjector.alive = 0.5;
  console.log("%cVimium++%c: injected %cpartly%c into %c" + chrome.runtime.id
    , "color:red", "color:auto", "color:red", "color:auto", "color:#0c85e9");
}

VSettings.uninit = function(type: number): void {
  if (type > 1) {
    removeEventListener("hashchange", VSettings.checkIfEnabled);
    let injector = VimiumInjector;
    injector.alive = 0;
    injector.destroy = null;
  }
  type ET2 = EventTargetEx;
  try {
    typeof (EventTarget as ET2).vimiumRemoveHooks === "function" && (EventTarget as ET2).vimiumRemoveHooks();
  } catch (e) {}
};

VimiumInjector.destroy = VSettings.destroy;

[VDom, VHints, VKeyboard, Vomnibar, VScroller, VMarks,
  VFindMode, VSettings, VHUD, VVisualMode,
  VimiumInjector].forEach(Object.seal);
[VUtils, VEventMode, VPort].forEach(Object.freeze);
