/// <reference path="../background/index.d.ts" />
/// <reference path="../background/utils.ts" />
/// <reference path="../background/settings.ts" />

export interface BgWindow extends Window {
  BgUtils_: typeof BgUtils_;
  Settings_: typeof Settings_;
}

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
  (function (): void {
    const StringCls = String.prototype;
    /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
    if (!"".startsWith) {
      StringCls.startsWith = function (this: string, s: string): boolean {
        return this.lastIndexOf(s, 0) === 0;
      };
      StringCls.endsWith = function (this: string, s: string): boolean {
        const i = this.length - s.length;
        return i >= 0 && this.indexOf(s, i) === i;
      };
    } else if (Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
      Promise.resolve || (Promise.resolve = Promise.resolved!)
    }
    StringCls.includes = function (this: string, s: string, pos?: number): boolean {
      // eslint-disable-next-line @typescript-eslint/prefer-includes
      return this.indexOf(s, pos) >= 0;
    };
  })();
}

const OnOther: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
    ? Build.BTypes as number
    : Build.BTypes & BrowserType.Chrome
      && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
          || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
    ? BrowserType.Chrome
    : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
    : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
    : /* an invalid state */ BrowserType.Unknown

export const OnChrome: boolean = !(Build.BTypes & ~BrowserType.Chrome)
    || !!(Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome)
export const OnFirefox: boolean = !(Build.BTypes & ~BrowserType.Firefox)
    || !!(Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox)
export const OnEdge: boolean = !(Build.BTypes & ~BrowserType.Edge)
    || !!(Build.BTypes & BrowserType.Edge && OnOther & BrowserType.Edge)
export const OnSafari: boolean = false

export const CurCVer_: BrowserVer = OnChrome ? 0 | (
    navigator.appVersion.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
    || [0, BrowserVer.assumedVer])[1] as number : BrowserVer.assumedVer
export const CurFFVer_: FirefoxBrowserVer = OnFirefox
    ? 0 | (navigator.userAgent.match(<RegExpOne> /\bFirefox\/(\d+)/) || [0, FirefoxBrowserVer.assumedVer])[1] as number
    : FirefoxBrowserVer.None

export let BG_ = chrome.extension && chrome.extension.getBackgroundPage() as Window as BgWindow
if (!(BG_ && BG_.BgUtils_ && BG_.BgUtils_.convertToUrl_)) {
  BG_ = null as never;
}
export let bgSettings_ = BG_ && BG_.Settings_

export const reloadBG_ = (): void => {
  BG_ = chrome.extension.getBackgroundPage() as Window as BgWindow
  if (BG_) { // a user may call `close()` in the console panel, then `BG_` is null
    bgSettings_ = BG_.Settings_
    if (!bgSettings_) { BG_ = null as never }
  }
}

if (!OnChrome) {
  window.chrome = browser as typeof chrome
}
