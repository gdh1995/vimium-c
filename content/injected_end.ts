/** @todo: */
// isHTML_ = () => document instanceof HTMLDocument;

VApi.e = function (cmd): void {
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
      : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox && browser ? BrowserType.Firefox
      : BrowserType.Chrome,
  transArgsRe = <RegExpSearchable<0>> /\$\d/g;
  let frameElement_ = (): Element | null | void => {
    let el: typeof frameElement | undefined;
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement
        || Build.BTypes & BrowserType.Edge) {
      try {
        if (!(Build.BTypes & BrowserType.Firefox)) { return frameElement; }
        else { el = frameElement; }
      } catch {}
    } else {
      if (!(Build.BTypes & BrowserType.Firefox)) { return frameElement; }
      el = frameElement;
    }
    if (Build.BTypes & BrowserType.Firefox) {
      return el;
    }
  }
  if (Build.BTypes & BrowserType.Firefox) {
    if (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) {
      // frameElement_ = () => frameElement;
    }
  }
  let i18nMessages: FgRes[kFgReq.i18n]["m"] = null,
  i18nCallback: ((res: FgRes[kFgReq.i18n]) => void) | null = res => {
    i18nMessages = res.m;
    if (!i18nMessages && i18nCallback) {
      setTimeout(() => VApi.s(kFgReq.i18n, {}, i18nCallback!), 150);
    }
    i18nCallback = null;
  };
  VApi.s(kFgReq.i18n, {}, i18nCallback);
  VApi.r!((tid, args): string => {
    if (typeof tid === "string") {
      return tid;
    }
    return !i18nMessages ? args && args.length ? `T${tid}: ${args.join(", ")}` : "T" + tid
        : args ? i18nMessages[tid].replace(transArgsRe, s => <string> args[+s[1] - 1])
        : i18nMessages[tid];
  })
  const injector = VimiumInjector!,
  parentInjector = top !== window
      && frameElement_()
      && (parent as Window & {VimiumInjector?: typeof VimiumInjector}).VimiumInjector,
  // share the set of all clickable, if .dataset.vimiumHooks is not "false"
  clickable = injector.clickable = parentInjector && parentInjector.clickable || injector.clickable;
  clickable && (injector.$p![2](clickable));

  injector.checkIfEnabled = (function (this: null
      , func: <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void): void {
    func({ H: kFgReq.checkIfEnabled, u: location.href });
  }).bind(null, injector.$p![0]);
  injector.getCommandCount = (function (this: null, func: (this: void) => string): number {
    let currentKeys = func();
    return currentKeys !== "-" ? parseInt(currentKeys, 10) || 1 : -1;
  }).bind(null, injector.$p![1]);
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
    if (Build.BTypes & BrowserType.Firefox) {
      VApi.d(9); // note: here Firefox is just like a (9)
      VApi.y().w()
    }
  }

  injector.cache = VApi.z;
  injector.destroy = VApi.d;
  injector.callback && injector.callback(1, "initing");
  if (VApi.z) { // has loaded before this script file runs
    injector.$r(InjectorTask.extInited);
  }
})();
