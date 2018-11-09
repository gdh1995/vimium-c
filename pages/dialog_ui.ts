/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
/// <reference path="../background/bg.d.ts" />

(function(): void {
const BG = chrome.extension.getBackgroundPage() as Window as Window & { Settings: SettingsTmpl };
if (BG && !BG.Settings.get("dialogMode")) {
  BG.Backend.focus({
    url: BG.Settings.CONST.OptionsPage,
    reuse: ReuseType.reuse
  });
} else if (BG) {
  window.location.href = BG.Settings.CONST.OptionsPage + "#dialog-ui";
  return;
} else {
  chrome.tabs.create({ url: "pages/options.html" });
}
window.close();
})();
