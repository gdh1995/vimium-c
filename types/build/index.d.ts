/// <reference no-default-lib="true"/>
/// <reference path="../lib/index.d.ts" />

declare const enum Build {
  MinCVer = BrowserVer.MinSupported, // minimum Chrome version
  MinFFVer = FirefoxBrowserVer.MinSupported, // minimum Firefox version
  BTypes = BrowserType.Chrome | BrowserType.Firefox | BrowserType.Edge, // supported browser types
  EdgeI = 0,
  NDEBUG = 0,
  NoDialogUI = 0,
  NativeWordMoveOnFirefox = 1,
  PContentSettings = 1,
  MayOverrideNewTab = 0,
  DetectAPIOnFirefox = 1,
  CreateFakeIncognito = 1,
}
// Note: one random value must be used only in one .ts file, to avoid issues caused by partly building
declare const enum BuildStr {
  Commit = "dev",
  /** used by {@link ../../content/extend_click.ts} */
  RandomName0 = 1000,
  RandomName1 = 1001,
  RandomName2 = 1002,
  RandomName3 = 0, // for communication safely across unsafe frame worlds
  RandomName3_public = 0,
  MarkForName3 = "__VimiumC_", // .length should be {@link #GlobalConsts.MarkForName3Length}
  /** used by {@link ../../content/frontend.ts} */
  RandomReq = 2019070,
  CoreGetterFuncName = "__VimiumC_priv__",
  FirefoxID = "vimium-c@gdh1995.cn",
  FirefoxAddonPrefix = "https://addons.mozilla.org/firefox/addon/",
  ChromeWebStorePage = "https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/$id/reviews",
}
