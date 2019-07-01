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
// Note: one random value must be used only in one .ts file, to avoid issues caused by partly building
declare const enum BuildStr {
  Commit = "dev",
  /** used by {@see ../../content/extend_click.ts} */
  RandomName0 = 1000,
  RandomName1 = 1001,
  RandomName2 = 1002,
  RandomName3 = 0, // for communication safely across unsafe frame worlds
  RandomName3_prefix = 0,
  MarkForName3 = "__VimiumC_", // .length should be {@link #GlobalConsts.MarkForName3Length}
  RandomFunc = 2019, // may be a string if not in release mode
  RandomReq = 2019070,
  FirefoxID = "vimium-c@gdh1995.cn",
  CoreGetterFuncPrefix = "__VimiumC_",
  FirefoxAddonPage = "https://addons.mozilla.org/en-US/firefox/addon/vimium-c/",
  ChromeWebStorePage = "https://chrome.google.com/webstore/detail/vimium-c/$id/reviews",
}
