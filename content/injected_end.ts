VApi!.e = function (cmd, el2): void {
  const injector = VimiumInjector;
  if (cmd === kContentCmd.Destroy && injector) {
    const rEL = removeEventListener, onHashChnage = injector.checkIfEnabled
    if (onHashChnage) {
      rEL("hashchange", onHashChnage); rEL("hashchange", onHashChnage, true)
    }
    injector.alive = 0;
    injector.destroy = injector.checkIfEnabled = injector.getCommandCount = null as never;
    injector.$ = injector.$r = injector.$m = null as never;
    injector.clickable = null;
    injector.callback && injector.callback(3, "destroy")
  } else if (cmd === kContentCmd.ShowPicker_cr_mv3 && Build.BTypes & BrowserType.Chrome && Build.MV3) {
    (el2 as HTMLInputElement).showPicker!()
  }
};

(function (): void {
  const _OnOther: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
      ? Build.BTypes as number
      : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Safari && typeof safari !== "undefined" && safari ? BrowserType.Safari
      : !(Build.BTypes & BrowserType.Chrome) || Build.BTypes & BrowserType.Firefox && typeof browser !== "undefined"
        && browser && (browser as typeof chrome).runtime
        && (browser as typeof chrome).runtime.getURL("").startsWith("moz")
      ? BrowserType.Firefox : BrowserType.Chrome
  const OnChrome = Build.BTypes === BrowserType.Chrome as number
      || !!(Build.BTypes & BrowserType.Chrome) && _OnOther === BrowserType.Chrome
  const OnFirefox = Build.BTypes === BrowserType.Firefox as number
      || !!(Build.BTypes & BrowserType.Firefox) && _OnOther === BrowserType.Firefox
  const OnEdge = Build.BTypes === BrowserType.Edge as number
      || !!(Build.BTypes & BrowserType.Edge) && _OnOther === BrowserType.Edge

  const thisApi = VApi!
  const injector = VimiumInjector!
  const trArgsRe = <RegExpSearchable<0>> /\$\d/g
  const runtime = (OnChrome ? chrome : browser as typeof chrome).runtime
  const safeFrameElement_ = (): HTMLIFrameElement | HTMLFrameElement | null | void => {
    if (OnChrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement || OnEdge) {
      try {
        return frameElement as HTMLIFrameElement | HTMLFrameElement
      } catch {}
    } else {
      return frameElement as HTMLIFrameElement | HTMLFrameElement
    }
  }
  let jsEvalPromise: Promise<void> | undefined
  const tryEval = (code: string): unknown => {
    const injector1 = VimiumInjector!
    if (injector1.eval) { const ret2 = injector1.eval(code); if (ret2 !== code) { return ret2 } }
    jsEvalPromise = jsEvalPromise || new Promise((resolve): void => {
      const script = document.createElement("script")
      script.src = `${location.protocol}//${injector1.host || injector1.id}/lib/simple_eval.js`
      script.onload = (): void => { script.remove(); resolve() }
      (document.head as HTMLHeadElement | null || document.documentElement!).appendChild(script)
    })
    const ret = jsEvalPromise.then(() => VApi!.v !== tryEval ? (VApi!.v = VApi!.v.tryEval || VApi!.v)(code) : undefined)
    type TryResult = ReturnType<VApiTy["v"]["tryEval"]>
    const composedRet = ret as unknown as TryResult
    composedRet.result = (ret as Promise<TryResult>).then(i => i && "ok" in i && "result" in i ? i.result : i)
    composedRet.ok = (ret as Promise<TryResult>).then(i => i && "ok" in i && "result" in i ? i.ok : i) as never
    return ret
  }

  let i18nMessages: FgRes[kFgReq.i18n] | null = null
  const ref = thisApi.r
  ref[0](kFgReq.i18n, 0, (res): void => {
    i18nMessages = res;
    if (VApi!.z) {
      VimiumInjector!.$r(InjectorTask.extInited)
    }
  })
  ref[2]!(2, (tid, args): string => {
    return !i18nMessages ? "$Msg-" + tid
        : args ? i18nMessages[tid].replace(trArgsRe, s => typeof args === "string" ? args : <string> args[+s[1] - 1])
        : i18nMessages[tid].replace(trArgsRe, "")
  })

  const parentInjector = top !== window
      && safeFrameElement_()
      && (parent as Window & {VimiumInjector?: typeof VimiumInjector}).VimiumInjector,
  // share the set of all clickable, if .dataset.vimiumHooks is not "false"
  clickable = injector.clickable = parentInjector && parentInjector.clickable || injector.clickable;
  clickable && (ref[2]!(1, clickable));

  injector.checkIfEnabled = (function (this: null, func: NonNullable<(typeof ref)[1]>): void {
    func({ H: kFgReq.checkIfEnabled, u: location.href });
  }).bind(null, ref[1]!);
  injector.getCommandCount = ((func: (typeof ref)[2]): number => {
    let currentKeys = func!(0)
    return currentKeys !== "-" ? parseInt(currentKeys, 10) || 1 : -1;
  }).bind(null, ref[2]!);

  ref[1] = ref[2] = void 0
  if (OnFirefox) {
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
  let livingCheckTimer: number = TimerID.None;
  injector.$r = function (task): void {
    if (task === InjectorTask.reload) {
      const injector1 = VimiumInjector;
      injector1 && injector1.reload(InjectorTask.reload);
      return;
    }
    if (OnFirefox) {
      switch (task) {
      case InjectorTask.recheckLiving:
        livingCheckTimer && clearTimeout(livingCheckTimer);
        livingCheckTimer = setTimeout(onTimeout, GlobalConsts.FirefoxFocusResponseTimeout);
        return;
      case InjectorTask.reportLiving:
        livingCheckTimer && clearTimeout(livingCheckTimer)
        livingCheckTimer = 0
        return;
      }
    }
    switch (task) {
    case InjectorTask.extInited:
      const injector1 = VimiumInjector!;
      injector1.cache = VApi!.z
      if (i18nMessages) {
        VApi!.v = tryEval
        injector1.callback && injector1.callback(2, "complete")
      }
      // not listen hash here; a 3rd-party page may add listeners by itself if it indeed wants
      return;
    }
  };
  function onTimeout(): void {
    if (OnFirefox && VApi) {
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
