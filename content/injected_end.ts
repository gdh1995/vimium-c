[VDom, VKey, VCui, VHints, VSc, VOmni, VFind, VVisual, VMarks,
  VHud, VApi
  ].forEach(Object.seal);
VDom.allowScripts_ = 0;

VHints.unwrap_ = (e: object): any => e;

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
  let i18nMessages: FgRes[kFgReq.i18n]["m"] = null,
  i18nCallback: ((res: FgRes[kFgReq.i18n]) => void) | null = res => {
    i18nMessages = res.m;
    if (!i18nMessages && i18nCallback) {
      VKey.timeout_(() => VApi.send_(kFgReq.i18n, {}, i18nCallback as NonNullable<typeof i18nCallback>), 150);
    }
    i18nCallback = null;
  };
  VApi.send_(kFgReq.i18n, {}, i18nCallback);
  VTr = (tid, args): string => {
    if (typeof tid === "string") {
      return tid;
    }
    return !i18nMessages ? args && args.length ? `T${tid}: ${args.join(", ")}` : "T" + tid
        : args ? i18nMessages[tid].replace(transArgsRe, s => <string> args[+s[1] - 1])
        : i18nMessages[tid];
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
    let currentKeys = func();
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
  let livingCheckTimer = TimerID.None;
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
        livingCheckTimer && VKey.clearTimeout_(livingCheckTimer);
        livingCheckTimer = VKey.timeout_(onTimeout, GlobalConsts.FirefoxFocusResponseTimeout);
        return;
      case InjectorTask.reportLiving:
        VKey.clearTimeout_(livingCheckTimer);
        return;
      }
    }
    switch (task) {
    case InjectorTask.extInited:
      const injector1 = VimiumInjector as VimiumInjectorTy;
      injector1.cache = VDom.cache_;
      injector1.callback && injector1.callback(2, "complete");
      return;
    }
  };
  function onTimeout(): void {
    if (Build.BTypes & BrowserType.Firefox) {
      VApi.destroy_(9); // note: here Firefox is just like a (9)
      VApi.OnWndFocus_();
    }
  }

  injector.cache = VDom.cache_;
  injector.destroy = VApi.destroy_;
  injector.callback && injector.callback(1, "initing");
  if (VDom.cache_) { // has loaded before this script file runs
    injector.$r(InjectorTask.extInited);
  }
})();

VDom.OnDocLoaded_(function (): void {
  const injector = VimiumInjector;
  injector && addEventListener("hashchange", injector.checkIfEnabled);
});
