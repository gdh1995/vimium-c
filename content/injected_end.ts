[VDom, VKey, VCui, VHints, VSc, VOmni, VFind, VVisual, VMarks,
  VHud, VApi
  ].forEach(Object.seal);
VDom.allowScripts_ = 0;

(function (): void {
  const OnOther: BrowserType = !(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
        || !(Build.BTypes & ~BrowserType.Edge)
      ? Build.BTypes as number
      : VOther,
  transArgsRe = <RegExpSearchable<0>> /\$\d/g;
  if (Build.BTypes & BrowserType.Firefox) {
    if (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) {
      VDom.frameElement_ = () => frameElement;
    }
    VDom.parentCore_ = () => VDom.frameElement_() && parent as Window;
  }
  VTr = (tid, fallback, args): string => {
    if (typeof tid === "string") {
      return tid;
    }
    fallback = fallback || "";
    return args ? fallback.replace(transArgsRe, s => <string> args[+s[1] - 1]) : fallback;
  };
  const injector = VimiumInjector as VimiumInjectorTy,
  parentInjector = top !== window
      && VDom.frameElement_()
      && (parent as Window & {VimiumInjector?: typeof VimiumInjector}).VimiumInjector,
  // share the set of all clickable, if .dataset.vimiumHooks is not "false"
  clickable = injector.clickable = parentInjector && parentInjector.clickable || injector.clickable;
  clickable && (VDom.clickable_ = clickable);

  injector.checkIfEnabled = (function (this: null
      , func: <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void): void {
    func({ H: kFgReq.checkIfEnabled, u: location.href });
  }).bind(null, (injector.$p as NonNullable<VimiumInjectorTy["$p"]>)[0]);
  injector.getCommandCount = (function (this: null, func: (this: void) => string): number {
    var currentKeys = func();
    return currentKeys !== "-" ? parseInt(currentKeys, 10) || 1 : -1;
  }).bind(null, (injector.$p as NonNullable<VimiumInjectorTy["$p"]>)[1]);
  injector.$p = null;

  const runtime: typeof chrome.runtime = (!(Build.BTypes & BrowserType.Chrome)
        || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
      ? browser as typeof chrome : chrome).runtime;
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
      VApi.destroy_(9); // note: here Firefox is just like a (9)
      VApi.OnWndFocus_();
    }
  }
})();

VDom.OnDocLoaded_(function () {
  const injector = VimiumInjector;
  injector && addEventListener("hashchange", injector.checkIfEnabled);
});

VApi.execute_ = function (cmd): void {
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
(VimiumInjector as VimiumInjectorTy).destroy = VApi.destroy_;
