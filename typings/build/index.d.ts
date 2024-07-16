declare const enum Build {
  MinCVer = 121, // minimum Chrome version
  MinFFVer = 119, // minimum Firefox version
  BTypes = 1, // default browser types: only BrowserType.Chrome - MV3 of Firefox 115 doesn't support service worker yet
  OS = 7, // mac = 1 << 0, linux = 1 << 1, win = 1 << 2
  MV3 = 1,
  OnBrowserNativePages = 1,
  NDEBUG = 0,
  Mangle = 0,
  Inline = 0,
  NativeWordMoveOnFirefox = 1,
  MayAndroidOnFirefox = 1,
  DetectAPIOnFirefox = 1,
  /** used by {@link ../../content/extend_click.ts} */
  RandomClick = 2021831,
  /** used by {@link ../../content/frontend.ts} */
  RandomReq = 2019070,
}
declare const enum BuildStr {
  Commit = "dev",
  CoreGetterFuncName = "__VimiumC_priv__",
  FirefoxID = "vimium-c@gdh1995.cn",
}
