/// <reference path="../typings/base/index.d.ts" />
/// <reference path="../typings/lib/index.d.ts" />
/// <reference path="../typings/build/index.d.ts" />
interface LocalStorageEx extends Storage, MappedType<SettingsNS.BaseBackendSettings, string | undefined> {
}
let storage_ = localStorage as LocalStorageEx,
focusContent_ = !!Build.MayOverrideNewTab && storage_.focusNewTabContent !== "false",
isNotChrome_ = !(Build.BTypes & BrowserType.Chrome)
    || !!(Build.BTypes & ~BrowserType.Chrome) && typeof browser === "object" && !!browser,
url_ = storage_.newTabUrl_f,
isRedirecting_ = url_ !== location.href,
loadContent_ = (): void => {
  const script = document.createElement("script");
  location.href = "#too-many-redirects";
  script.src = "loader.js";
  (document.head as HTMLHeadElement).appendChild(script);
},
chrome_ = (!(Build.BTypes & ~BrowserType.Chrome) ? chrome
    : !(Build.BTypes & ~BrowserType.Firefox) ? browser as typeof chrome
    : window.browser as never || chrome
    );
isRedirecting_ ?
chrome_.tabs[focusContent_ ? "create" as const : "update" as const]({
  url: url_ || "about:blank"
}, !(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && isNotChrome_
    ? function (): void {
  let error = chrome_.runtime.lastError;
  if (error as void | object) {
    console.log("%o", error);
    loadContent_();
    return error;
  }
  if (focusContent_) {
    chrome_.runtime.connect({ name: PortNameEnum.Prefix + PortType.CloseSelf });
  }
} : undefined) : loadContent_();
if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || !isNotChrome_)
    && focusContent_ && isRedirecting_) {
  (close as () => {})();
}
