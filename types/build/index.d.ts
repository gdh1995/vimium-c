/// <reference no-default-lib="true"/>
/// <reference path="../lib/index.d.ts" />

declare const enum Build {
  MinCVer = BrowserVer.MinSupported, // minimum Chrome version
  MinFFVer = FirefoxBrowserVer.MinSupported, // minimum Firefox version
  BTypes = BrowserType.Chrome | BrowserType.Firefox | BrowserType.Edge, // supported browser types
  NDEBUG = 0,
  NoDialogUI = 0,
  NativeWordMoveOnFirefox = 1,
  PContentSettings = 1,
  MayOverrideNewTab = 1,
  DetectAPIOnFirefox = 1,
}
declare const enum BuildStr {
  Commit = "in-developing",
  FirefoxID = "vimium-c@gdh1995.cn",
  FirefoxAddonPage = "https://addons.mozilla.org/en-US/firefox/addon/vimium-c/",
  ChromeWebStorePage = "https://chrome.google.com/webstore/detail/vimium-c/$id/reviews",
}
