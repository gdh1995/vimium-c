/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
/// <reference path="../types/build/index.d.ts" />
interface LocalStorageEx extends Storage, MappedType<SettingsNS.BaseBackendSettings, string> {
}
let storage_ = localStorage as LocalStorageEx, focusContent_ = storage_.focusNewTabContent !== "false",
chrome_ = (!(Build.BTypes & ~BrowserType.Chrome) ? chrome
    : !(Build.BTypes & ~BrowserType.Firefox) ? browser as typeof chrome
    : window.chrome || browser as typeof chrome
    );
chrome_.tabs[focusContent_ ? "create" as const : "update" as const]({
  url: storage_.newTabUrl_f || "about:blank"
}, Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox)
        || typeof browser === "object" && browser)
    ? function (): void {
  let error = chrome_.runtime.lastError;
  if (error as void | object) {
    console.log("%o", error);
    const script = document.createElement("script");
    script.src = "loader.js";
    (document.head as HTMLHeadElement).appendChild(script);
  }
  else if (!focusContent_) { /* empty */ }
  else if (!(Build.BTypes & ~BrowserType.Firefox)) {
    chrome_.runtime.connect({ name: PortNameEnum.Prefix + PortType.CloseSelf });
  } else {
    setTimeout(function (): void {
      chrome_.runtime.connect({ name: PortNameEnum.Prefix + PortType.CloseSelf });
    }, 33);
  }
  return error;
} : undefined);
if (Build.BTypes & ~BrowserType.Firefox && focusContent_) {
  (close as () => {})();
}
