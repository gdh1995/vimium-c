declare const enum Build {
  MinCVer = 73, // minimum Chrome version
  MinFFVer = 63, // minimum Firefox version
  BTypes = 3, // supported browser types: BrowserType.Chrome | BrowserType.Firefox
  EdgeC = 0,
  NDEBUG = 0,
  NoDialogUI = 1,
  NativeWordMoveOnFirefox = 1,
  PContentSettings = 1,
  MayOverrideNewTab = 0,
  DetectAPIOnFirefox = 1,
  CreateFakeIncognito = 0,
}
// Note: one random value must be used only in one .ts file, to avoid issues caused by partly building
declare const enum BuildStr {
  Commit = "dev",
  /** used by {@link ../../content/extend_click.ts} */
  RandomClick = 1000,
  /** used by {@link ../../content/frontend.ts} */
  RandomReq = 2019070,
  CoreGetterFuncName = "__VimiumC_priv__",
  FirefoxID = "vimium-c@gdh1995.cn",
}
