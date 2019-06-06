[VDom, VHints, VKey, VOmni, VScroller, VMarks,
  VFind, VHud, VVisual,
  VLib, VEvent, VPort
  ].forEach(Object.seal);
VDom.allowScripts_ = 0;

(function () {
  let parentFrame_: typeof frameElement | undefined | false;
  if (Build.MinCVer >= BrowserVer.MinSafeGlobal$frameElement || !(Build.BTypes & BrowserType.Chrome)) {
    parentFrame_  = frameElement;
  } else try {
    parentFrame_ = window !== top && frameElement as (HTMLFrameElement | HTMLIFrameElement) & SafeElement | null;
  } catch {}
  const injector = VimiumInjector as VimiumInjectorTy,
  parentInjector = parentFrame_
      && (parent as Window & {VimiumInjector?: typeof VimiumInjector}).VimiumInjector,
  // share the set of all clickable, if .dataset.vimiumHooks is not "false"
  clickable = injector.clickable = parentInjector && parentInjector.clickable || injector.clickable;
  clickable && (VDom.clickable_ = clickable);
  VDom.isSameOriginChild_ = !!parentInjector;

  injector.checkIfEnabled = (function (this: null
      , func: <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void): void {
    func({ H: kFgReq.checkIfEnabled, u: location.href });
  }).bind(null, (injector.$p as NonNullable<VimiumInjectorTy["$p"]>)[0]);
  injector.getCommandCount = (function (this: null, func: (this: void) => string): number {
    var currentKeys = func();
    return currentKeys !== "-" ? parseInt(currentKeys, 10) || 1 : -1;
  }).bind(null, (injector.$p as NonNullable<VimiumInjectorTy["$p"]>)[1]);
  injector.$p = null;

  // Note: should keep the same with frontend.ts
  const useBrowser = !(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : !!(browser && (browser as typeof chrome).runtime && (browser as typeof chrome).runtime.connect),
  OnOther = !(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
      || !(Build.BTypes & ~BrowserType.Edge)
    ? Build.BTypes as number
    : Build.BTypes & BrowserType.Chrome && !useBrowser ? BrowserType.Chrome
    : !(Build.BTypes & BrowserType.Firefox)
      || Build.BTypes & BrowserType.Edge && ((window as {} as {StyleMedia: unknown}).StyleMedia)
    ? BrowserType.Edge
    : BrowserType.Firefox
    ,
  runtime: typeof chrome.runtime = (!(Build.BTypes & BrowserType.Chrome)
      || Build.BTypes & ~BrowserType.Chrome && useBrowser ? browser as typeof chrome : chrome).runtime;
  if (runtime.onMessageExternal) {
    injector.alive = 1;
  } else {
    injector.alive = 0.5;
    const colorRed = "color:red", colorAuto = "color:auto";
    console.log("%cVimium C%c: injected %cpartly%c into %c%s"
      , colorRed, colorAuto, colorRed, colorAuto, "color:#0c85e9"
      , runtime.id || location.host, ".");
  }
  let livingCheckTimer = 0;
  injector.$r = function (task): void {
    if (task === InjectorTask.reload) {
      const injector1 = VimiumInjector;
      injector1 && injector1.reload(InjectorTask.reload);
      return;
    }
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || (Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox)) {
      switch (task) {
      case InjectorTask.recheckLiving:
        livingCheckTimer && clearTimeout(livingCheckTimer);
        livingCheckTimer = setTimeout(onTimeout, GlobalConsts.FirefoxFocusResponseTimeout);
        return;
      case InjectorTask.reportLiving:
        clearTimeout(livingCheckTimer);
        return;
      }
    }
    switch (task) {
    case InjectorTask.extInited:
      (VimiumInjector as VimiumInjectorTy).cache = VDom.cache_;
      return;
    }
  };
  function onTimeout() {
    if (Build.BTypes & BrowserType.Firefox) {
      VEvent.destroy_(9); // note: here Firefox is just like a (9)
      VEvent.OnWndFocus_();
    }
  }
})();

VDom.OnDocLoaded_(function () {
  const injector = VimiumInjector;
  injector && addEventListener("hashchange", injector.checkIfEnabled);
});

VEvent.execute_ = function (cmd): void {
  const injector = VimiumInjector;
  if (cmd === kContentCmd.Destroy && injector) {
    removeEventListener("hashchange", injector.checkIfEnabled);
    injector.alive = 0;
    injector.destroy = injector.checkIfEnabled = injector.getCommandCount = null as never;
    injector.$r = injector.$m = null as never;
    injector.clickable = null;
  }
};

(VimiumInjector as VimiumInjectorTy).cache = VDom.cache_;
(VimiumInjector as VimiumInjectorTy).destroy = VEvent.destroy_;
