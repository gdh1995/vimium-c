/// <reference path="../typings/base/index.d.ts" />
/// <reference path="../typings/lib/index.d.ts" />
/// <reference path="../typings/build/index.d.ts" />
/// <reference path="../background/bg.d.ts" />
/// <reference path="../background/utils.ts" />
/// <reference path="../background/settings.ts" />
/* eslint-disable @typescript-eslint/prefer-string-starts-ends-with, @typescript-eslint/prefer-includes */
// eslint-disable-next-line no-var
var VimiumInjector: VimiumInjectorTy | undefined | null = null;
if (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser !== "undefined" && browser && (browser as typeof chrome).runtime) {
  window.chrome = browser as typeof chrome;
}
chrome.runtime && chrome.runtime.getManifest && (function () {
  let loader = document.currentScript as HTMLScriptElement;
  const head = loader.parentElement as HTMLElement
    , scripts: HTMLScriptElement[] = [loader]
    , prefix = chrome.runtime.getURL("")
    , curPath = location.pathname.toLowerCase()
    , arr = chrome.runtime.getManifest().content_scripts[0].js;
  if (!(Build.BTypes & BrowserType.Edge)) {
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
    if (Build.BTypes & BrowserType.Firefox && Build.MayOverrideNewTab
        && (bg = chrome.extension.getBackgroundPage() as BgWindow2)
        && bg.Settings_ && bg.Settings_.CONST_.OverrideNewTab_
        && curPath.indexOf("newtab") >= 0) {
      setTimeout(function (): void {
        const api = (window as {} as {VApi?: VApiTy}).VApi;
        api && api.t(kTip.firefoxRefuseURL, 2560);
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
      let s = (Build.BTypes & BrowserType.Firefox && bg0 && bg0.trans_ || chrome.i18n.getMessage)("vBlank");
      s && (document.title = s);
    }
  }
  if (!Build.NDEBUG) {
    (window as {} as {updateUI(): void}).updateUI = function (): void {
      const settings = (chrome.extension.getBackgroundPage() as BgWindow2).Settings_;
      delete (settings.cache_ as Partial<SettingsNS.FullCache>).helpDialog
      settings.fetchFile_("baseCSS", function (): void {
        settings.postUpdate_("userDefinedCss");
      });
    };
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
  if (Build.BTypes & BrowserType.Edge) {
    setTimeout(function (): void {
      next(0);
    }, 100);
  }
})();
