/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
/// <reference path="../background/bg.d.ts" />
/// <reference path="../background/utils.ts" />
/// <reference path="../background/settings.ts" />
declare var browser: unknown;
var VimiumInjector: VimiumInjector | undefined | null = null;
if (typeof browser !== "undefined" && browser && (browser as any).runtime) {
  window.chrome = browser as typeof chrome;
}
window.chrome && chrome.runtime && chrome.runtime.getManifest && (function () {
  let loader = (document as any).currentScript as HTMLScriptElement;
  const head = loader.parentElement as HTMLElement
    , scripts: HTMLScriptElement[] = [loader]
    , prefix = chrome.runtime.getURL("")
    , arr = chrome.runtime.getManifest().content_scripts[0].js;
  for (const src of arr) {
    const scriptElement = document.createElement("script");
    scriptElement.async = false;
    scriptElement.src = src[0] === "/" || src.lastIndexOf(prefix, 0) === 0 ? src : "/" + src;
    head.appendChild(scriptElement);
    scripts.push(scriptElement);
  }
  scripts[scripts.length - 1].onload = function (): void {
    for (let i = scripts.length; 0 <= --i; ) { scripts[i].remove(); }
    (window as any).VDom && ((window as any).VDom.Scripts_ = false);
  };
  interface BgWindow extends Window { Settings: typeof Settings; }
  if (location.pathname.indexOf("options") < 0) {
    const bg = chrome.extension.getBackgroundPage() as BgWindow;
    if (bg && bg.Backend && bg.Backend.isDark_()) {
      const style = document.createElement("style");
      style.textContent = "body { background: #000; color: #aaa; }";
      (document.head as HTMLHeadElement).appendChild(style);
    }
  }
  if (typeof NDEBUG === "undefined" || !NDEBUG) {
    (window as {} as {updateCSS(): void}).updateCSS = function (): void {
      const settings = (chrome.extension.getBackgroundPage() as BgWindow).Settings;
      settings.fetchFile_("baseCSS", function (): void {
        settings.postUpdate_("userDefinedCss");
      });
    };
  }
})();
