VDom.Scripts = false;
VimiumInjector.checkIfEnabled = (function (this: null
    , func: <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void): void {
  func({ handler: "checkIfEnabled", url: window.location.href });
}).bind(null, VimiumInjector.checkIfEnabled);
VDom.DocReady(function() {
  VimiumInjector &&
  addEventListener("hashchange", VimiumInjector.checkIfEnabled);
});

(function() {
  // Note: should keep the same with frontend.ts
  const notChrome = typeof browser !== "undefined" && !(
    browser && (browser as typeof chrome).runtime || ((browser as typeof chrome | HTMLHtmlElement) instanceof Element)),
  runtime: typeof chrome.runtime = (notChrome ? browser : chrome).runtime;
  if (runtime.onMessageExternal) {
    VimiumInjector.alive = 1;
  } else {
    VimiumInjector.alive = 0.5;
    console.log("%cVimium C%c: injected %cpartly%c into %c" + runtime.id
      , "color:red", "color:auto", "color:red", "color:auto", "color:#0c85e9");
  }
})();

VSettings.uninit_ = function(type: number): void {
  let injector = VimiumInjector;
  if (type >= HookAction.Destroy && injector) {
    removeEventListener("hashchange", injector.checkIfEnabled);
    injector.alive = 0;
    injector.destroy = injector.checkIfEnabled = injector.getCommandCount = null as never;
  }
};

VimiumInjector.destroy = VSettings.destroy;

[VDom, VHints, VKeyboard, Vomnibar, VScroller, VMarks,
  VFindMode, VSettings, VHUD, VVisualMode,
  VimiumInjector].forEach(Object.seal);
[VUtils, VEventMode, VPort].forEach(Object.freeze);
