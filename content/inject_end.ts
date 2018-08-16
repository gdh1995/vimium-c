VDom.allowScripts = false;
VimiumInjector.checkIfEnabled = (function (this: null, func: any): void {
  return func({ handler: "checkIfEnabled", url: window.location.href });
}).bind(null, VimiumInjector.checkIfEnabled);
VDom.documentReady(function() {
  if (!VimiumInjector) { return; }
  addEventListener("hashchange", VimiumInjector.checkIfEnabled);
});

if (chrome.runtime.onMessageExternal) {
  VimiumInjector.alive = 1;
} else {
  VimiumInjector.alive = 0.5;
  console.log("%cVimium++%c: injected %cpartly%c into %c" + chrome.runtime.id
    , "color:red", "color:auto", "color:red", "color:auto", "color:#0c85e9");
}

VSettings.uninit = function(type: number): void {
  let injector = VimiumInjector;
  if (type > 1 && injector) {
    removeEventListener("hashchange", injector.checkIfEnabled);
    injector.alive = 0;
    injector.destroy = injector.checkIfEnabled = injector.getCommandCount = null as never;
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
