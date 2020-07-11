VApi.e = function (cmd): void {
  const injector = VimiumInjector;
  if (cmd === kContentCmd.Destroy && injector) {
    removeEventListener("hashchange", injector.checkIfEnabled);
    injector.alive = 0;
    injector.destroy = injector.checkIfEnabled = injector.getCommandCount = null as never;
    injector.$ = injector.$r = injector.$m = null as never;
    injector.clickable = null;
    injector.callback && injector.callback(3, "destroy")
  }
};

(function (): void {
  const mayBrowser_ = Build.BTypes & BrowserType.Chrome && Build.BTypes & ~BrowserType.Chrome
      && typeof browser === "object" && !("tagName" in (browser as unknown as Element))
      ? browser as typeof chrome : null
  const OnOther: BrowserType = !(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
        || !(Build.BTypes & ~BrowserType.Edge)
      ? Build.BTypes as number
      : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox && mayBrowser_ && mayBrowser_.runtime && mayBrowser_.runtime.connect
      ? BrowserType.Firefox : BrowserType.Chrome
  const thisApi = VApi
  const injector = VimiumInjector!
  const transArgsRe = <RegExpSearchable<0>> /\$\d/g
  const runtime: typeof chrome.runtime = (!(Build.BTypes & BrowserType.Chrome) ? browser as typeof chrome
      : Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
      ? mayBrowser_! : chrome).runtime;
  const safeFrameElement_ = (): Element | null | void => {
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement
        || Build.BTypes & BrowserType.Edge) {
      try {
        return frameElement;
      } catch {}
    } else {
      return frameElement;
    }
  }

  let i18nMessages: FgRes[kFgReq.i18n]["m"] = null,
  i18nCallback: ((res: FgRes[kFgReq.i18n]) => void) | null = res => {
    i18nMessages = res.m;
    if (!i18nMessages && i18nCallback) {
      setTimeout(() => VApi && VApi.r![0](kFgReq.i18n, {}, i18nCallback!), 150);
    }
    i18nCallback = null;
  };
  thisApi.r![0](kFgReq.i18n, {}, i18nCallback);
  thisApi.r![2]!(2, (tid, args): string => {
    return !i18nMessages ? args && args.length ? `T${tid}: ${args.join(", ")}` : "T" + tid
        : args ? i18nMessages[tid].replace(transArgsRe, s => <string> args[+s[1] - 1])
        : i18nMessages[tid];
  })

  const parentInjector = top !== window
      && safeFrameElement_()
      && (parent as Window & {VimiumInjector?: typeof VimiumInjector}).VimiumInjector,
  // share the set of all clickable, if .dataset.vimiumHooks is not "false"
  clickable = injector.clickable = parentInjector && parentInjector.clickable || injector.clickable;
  clickable && (thisApi.r![2]!(1, clickable));

  injector.checkIfEnabled = (function (this: null
      , func: <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void): void {
    func({ H: kFgReq.checkIfEnabled, u: location.href });
  }).bind(null, thisApi.r![1]!);
  injector.getCommandCount = ((func: NonNullable<VApiTy["r"]>[2]): number => {
    let currentKeys = func!(0)
    return currentKeys !== "-" ? parseInt(currentKeys, 10) || 1 : -1;
  }).bind(null, thisApi.r![2]!);

  thisApi.r!.length = 1;
  if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox) {
    (window as Writable<Window>).VApi = thisApi
  }

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
      const injector1 = VimiumInjector!;
      injector1.cache = VApi.z;
      injector1.callback && injector1.callback(2, "complete");
      addEventListener("hashchange", injector1.checkIfEnabled);
      return;
    }
  };
  function onTimeout(): void {
    if (Build.BTypes & BrowserType.Firefox && VApi) {
      VApi.d(9); // note: here Firefox is just like a (9)
      VApi.y().w!()
    }
  }

  injector.$ = thisApi
  injector.cache = thisApi.z
  injector.destroy = thisApi.d
  injector.callback && injector.callback(1, "initing");
  if (thisApi.z) { // has loaded before this script file runs
    injector.$r(InjectorTask.extInited);
  }
})();
