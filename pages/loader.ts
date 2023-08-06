/// <reference path="../typings/lib/window.d.ts" />
/* eslint-disable @typescript-eslint/prefer-string-starts-ends-with, @typescript-eslint/prefer-includes */
var VApi: VApiTy | undefined, VimiumInjector: VimiumInjectorTy | undefined | null = null; // eslint-disable-line no-var

(Build.NDEBUG || (window.browser || window.chrome || {}).runtime) && (function () {
  const MayChrome = !!(Build.BTypes & BrowserType.Chrome), MayNotChrome = Build.BTypes !== BrowserType.Chrome as number
  const mayBrowser_ = MayChrome && MayNotChrome && typeof browser === "object" ? (browser as typeof chrome) : null
  const useBrowser = !MayNotChrome ? false : !MayChrome ? true : !!(mayBrowser_ && mayBrowser_.runtime)
  const browser_ = useBrowser ? browser as never : chrome
  if (!Build.NDEBUG && MayNotChrome && useBrowser) { window.chrome = browser_ }
  const OnOther: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
      ? Build.BTypes as number
      : Build.BTypes & BrowserType.Chrome
        && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
            || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
      ? BrowserType.Chrome
      : Build.BTypes & BrowserType.Edge && (window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
      : /* an invalid state */ BrowserType.Unknown
  const loader = document.currentScript as HTMLScriptElement;
  let jsEvalPromise: Promise<void> | undefined
  const head = loader.parentElement as HTMLElement
    , scripts: HTMLScriptElement[] = []
    , prefix = browser_.runtime.getURL("")
    , curPath = location.pathname.replace("/pages/", "").split(".")[0]
    , arr = browser_.runtime.getManifest().content_scripts[0].js;
  if (OnOther !== BrowserType.Edge) {
    for (const src of arr) {
      const scriptElement = document.createElement("script");
      scriptElement.async = false;
      scriptElement.src = src[0] === "/" || src.lastIndexOf(prefix, 0) === 0 ? src : "/" + src;
      scripts.push(scriptElement);
    }
    scripts[scripts.length - 1].onload = onLastLoad;
    // wait a while so that the page gets ready earlier
    setTimeout(function (): void {
      if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
          || !Build.Inline && head.append) {
        head.append!(...scripts)
        return
      }
      for (const scriptEl of scripts) {
        head.appendChild(scriptEl);
      }
    }, curPath === "options" ? 32 : 100)
  }
  function onLastLoad(): void {
    for (let i = scripts.length; 0 <= --i; ) { scripts[i].remove(); }
    VApi && (VApi.$r = (event: InjectorTask) => {
      event === InjectorTask.extInited &&
      document.dispatchEvent(new CustomEvent(GlobalConsts.kLoadEvent))
    }, VApi.v = function tryEval(code: string): unknown {
      jsEvalPromise = jsEvalPromise || new Promise((resolve): void => {
        const script = document.createElement("script")
        script.src = `/lib/simple_eval.js`
        script.onload = (): void => { script.remove(); resolve() }
        document.head!.appendChild(script)
      })
      const r = jsEvalPromise.then(() => VApi!.v !== tryEval ? (VApi!.v = VApi!.v.tryEval || VApi!.v)(code) : undefined)
      if (!Build.NDEBUG) {
        type TryResult = ReturnType<VApiTy["v"]["tryEval"]>
        const composedRet = r as unknown as TryResult
        composedRet.result = (r as Promise<TryResult>).then(i => i && "ok" in i && "result" in i ? i.result : i)
        composedRet.ok = (r as Promise<TryResult>).then(i => i && "ok" in i && "result" in i ? i.ok : i) as never
      }
      return r

    })
    !(Build.BTypes & BrowserType.Edge)
    && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions)
    && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinES$DynamicImport)
    && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredES$DynamicImport)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    || !Build.NDEBUG && (window as any).define && (window as any).define.noConflict()
  }
  if (curPath === "blank") {
    type Keys = keyof SettingsNS.BaseBackendSettings
    const storage = browser_.storage.local as { get <K extends Keys> (k: K, cb: (r: { [k in K]: any }) => void): void }
    storage.get("autoDarkMode", (res): void => {
      const value = res && res.autoDarkMode as SettingsNS.BaseBackendSettings["autoDarkMode"] | boolean
      if (value === false || value === 1) {
        const el = document.head!.querySelector("meta[name=color-scheme]") as HTMLMetaElement | null
        el && (el.content = value === 1 ? "dark" : "light")
      }
      return browser_.runtime.lastError
    })
    if (browser_.i18n.getMessage("lang1")) {
      const s = browser_.i18n.getMessage("vblank")
      s && (document.title = s)
    }
  }
  if (!Build.NDEBUG) {
      interface WindowExForDebug extends Window { a: unknown; cb: (i: any) => void }
    (window as WindowExForDebug).a = null;
    (window as WindowExForDebug).cb = function (b) { (window as WindowExForDebug).a = b; console.log("%o", b); };
  }
  function next(index: number): void {
    if (index >= arr.length) {
      return onLastLoad();
    }
    const scriptElement = document.createElement("script"), src = arr[index];
    scriptElement.src = src[0] === "/" || src.lastIndexOf(prefix, 0) === 0 ? src : "/" + src;
    scriptElement.onload = () => next(index + 1);
    scripts.push(scriptElement);
    head.appendChild(scriptElement);
  }
  if (OnOther === BrowserType.Firefox) {
    const iconLink = document.createElement("link")
    iconLink.rel = "icon"
    iconLink.href = "../icons/icon128.png"
    iconLink.type = "image/png"
    document.head!.appendChild(iconLink)
  }
  if (OnOther === BrowserType.Edge) {
    setTimeout(function (): void {
      next(0);
    }, 100);
  }
})();
