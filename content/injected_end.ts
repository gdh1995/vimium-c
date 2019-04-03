[VDom, VHints, VKeyboard, VOmni, VScroller, VMarks,
  VFind, VSettings, VHUD, VVisual,
  VUtils, VEvent, VPort
  ].forEach(Object.seal);
VDom.allowScripts_ = 0;

declare var VimiumClickable: WeakSet<Element> | undefined | null;

(function () {
  const injector = VimiumInjector as VimiumInjector, clickable = VimiumClickable;
  clickable ? (VUtils.clickable_ = clickable) : (VimiumClickable = injector.clickable = null);

  injector.checkIfEnabled = (function (this: null
      , func: <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void): void {
    func({ H: kFgReq.checkIfEnabled, u: location.href });
  }).bind(null, injector.checkIfEnabled);
  injector.getCommandCount = (function (this: null, func: (this: void) => string): number {
    var currentKeys = func();
    return currentKeys !== "-" ? parseInt(currentKeys, 10) || 1 : -1;
  }).bind(null, injector.getCommandCount as (this: void) => (string | number) as (this: void) => string);

  // Note: should keep the same with frontend.ts
  const useBrowser = !(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser !== "undefined" &&
    browser && (browser as typeof chrome).runtime && !((browser as typeof chrome | Element) instanceof Element),
  runtime: typeof chrome.runtime = (useBrowser ? browser as typeof chrome : chrome).runtime;
  if (runtime.onMessageExternal) {
    injector.alive = 1;
  } else {
    injector.alive = 0.5;
    console.log("%cVimium C%c: injected %cpartly%c into %c" + (runtime.id || location.host)
      , "color:red", "color:auto", "color:red", "color:auto", "color:#0c85e9");
  }
})();

VDom.DocReady_(function () {
  VimiumInjector &&
  addEventListener("hashchange", VimiumInjector.checkIfEnabled);
});

VSettings.execute_ = function (cmd): void {
  let injector = VimiumInjector;
  if (cmd === kContentCmd.Destroy && injector) {
    removeEventListener("hashchange", injector.checkIfEnabled);
    injector.alive = 0;
    injector.destroy = injector.checkIfEnabled = injector.getCommandCount = null as never;
  }
};

(VimiumInjector as VimiumInjector).destroy = VSettings.destroy_;
