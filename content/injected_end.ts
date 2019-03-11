[VDom, VHints, VKeyboard, VOmni, VScroller, VMarks,
  VFind, VSettings, VHUD, VVisual,
  VUtils, VEvent, VPort
  ].forEach(Object.seal);

VUtils.clickable_ = (VimiumInjector as VimiumInjector).clickable;
VDom.allowScripts_ = false;
(VimiumInjector as VimiumInjector).checkIfEnabled = (function (this: null
    , func: <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void): void {
  func({ H: kFgReq.checkIfEnabled, u: location.href });
}).bind(null, (VimiumInjector as VimiumInjector).checkIfEnabled);
VDom.DocReady_(function () {
  VimiumInjector &&
  addEventListener("hashchange", VimiumInjector.checkIfEnabled);
});

(function () {
  // Note: should keep the same with frontend.ts
  const useBrowser = !(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser !== "undefined" &&
    browser && (browser as typeof chrome).runtime && !((browser as typeof chrome | Element) instanceof Element),
  runtime: typeof chrome.runtime = (useBrowser ? browser as typeof chrome : chrome).runtime;
  if (runtime.onMessageExternal) {
    (VimiumInjector as VimiumInjector).alive = 1;
  } else {
    (VimiumInjector as VimiumInjector).alive = 0.5;
    console.log("%cVimium C%c: injected %cpartly%c into %c" + (runtime.id || location.host)
      , "color:red", "color:auto", "color:red", "color:auto", "color:#0c85e9");
  }
})();

VSettings.stop_ = function (type: number): void {
  let injector = VimiumInjector;
  if (type >= HookAction.Destroy && injector) {
    removeEventListener("hashchange", injector.checkIfEnabled);
    injector.alive = 0;
    injector.destroy = injector.checkIfEnabled = injector.getCommandCount = null as never;
  }
};

(VimiumInjector as VimiumInjector).destroy = VSettings.destroy_;
