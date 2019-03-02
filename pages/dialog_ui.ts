/// <reference path="../background/bg.d.ts" />
/// <reference path="../background/utils.ts" />
/// <reference path="../background/settings.ts" />

(function (): void {
const BG = chrome.extension.getBackgroundPage() as Window as Window & { Settings: typeof Settings };
if (BG && !BG.Settings.get_("dialogMode")) {
  BG.Backend.focus_({
    u: BG.Settings.CONST_.OptionsPage_,
    r: ReuseType.reuse
  });
} else if (BG) {
  window.location.href = BG.Settings.CONST_.OptionsPage_ + "#dialog-ui";
  return;
} else {
  chrome.tabs.create({ url: "pages/options.html" });
}
window.close();
})();
