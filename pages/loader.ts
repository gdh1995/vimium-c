/// <reference path="../lib/base.d.ts" />
/// <reference path="../background/index.d.ts" />
/// <reference path="../background/utils.ts" />
/// <reference path="../background/settings.ts" />
/* eslint-disable @typescript-eslint/prefer-string-starts-ends-with, @typescript-eslint/prefer-includes */
(window as PartialOf<typeof globalThis, "VimiumInjector">).VimiumInjector = null
if (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser !== "undefined" && browser && (browser as typeof chrome).runtime) {
  window.chrome = browser as typeof chrome;
}
chrome.runtime && chrome.runtime.getManifest && (function () {
  const OnOther: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
      ? Build.BTypes as number
      : Build.BTypes & BrowserType.Chrome
        && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
            || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
      ? BrowserType.Chrome
      : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
      : /* an invalid state */ BrowserType.Unknown
  let loader = document.currentScript as HTMLScriptElement;
  const head = loader.parentElement as HTMLElement
    , scripts: HTMLScriptElement[] = [loader]
    , prefix = chrome.runtime.getURL("")
    , curPath = location.pathname.toLowerCase()
    , arr = chrome.runtime.getManifest().content_scripts[0].js;
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
      for (const scriptEl of scripts) {
        head.appendChild(scriptEl);
      }
    }, 100);
  }
  interface BgWindow2 extends Window { Settings_: typeof Settings_ }
  function onLastLoad(): void {
    for (let i = scripts.length; 0 <= --i; ) { scripts[i].remove(); }
    let bg: BgWindow2;
    if (OnOther === BrowserType.Firefox && Build.MayOverrideNewTab
        && (bg = chrome.extension.getBackgroundPage() as BgWindow2)
        && bg.Settings_ && bg.Settings_.CONST_.OverrideNewTab_
        && curPath.indexOf("newtab") >= 0) {
      setTimeout(function (): void {
        const api = (window as {} as {VApi?: VApiTy}).VApi;
        api && api.t({ k: kTip.firefoxRefuseURL })
      }, 100);
    }
  }
  const bg0 = chrome.extension.getBackgroundPage() as BgWindow2;
  if (bg0 && bg0.Settings_) {
    bg0.Settings_.updateMediaQueries_();
    if (curPath.indexOf("options") < 0) {
      const uiStyles = bg0.Settings_.omniPayload_.s;
      if (uiStyles && ` ${uiStyles} `.indexOf(" dark ") >= 0) {
        const style = document.createElement("style");
        style.textContent = "body { background: #000; color: #aab0b6; }";
        (document.head as HTMLHeadElement).appendChild(style);
      }
    }
  }
  if (curPath.indexOf("blank") > 0) {
    if (chrome.i18n.getMessage("lang1")) {
      let s = (OnOther === BrowserType.Firefox && bg0 && bg0.trans_ || chrome.i18n.getMessage)("vBlank");
      s && (document.title = s);
    }
  }
  (window as {} as {updateUI(): void}).updateUI = function (): void {
      const settings = (chrome.extension.getBackgroundPage() as BgWindow2).Settings_;
      delete (settings.cache_ as Partial<SettingsNS.FullCache>).helpDialog
      settings.reloadCSS_(2)
  };
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
