/// <reference path="../background/bg.d.ts" />

(function(): void {
const BG: any | null = chrome.extension.getBackgroundPage();
if (BG && !BG.Settings.get("dialogMode")) {
  (BG.g_requestHandlers as Window["g_requestHandlers"]).focusOrLaunch({
    url: BG.Settings.CONST.OptionsPage as string,
    reuse: ReuseType.reuse
  });
} else if (BG) {
  window.location.href = BG.Settings.CONST.OptionsPage + "#chrome-ui";
  return;
} else {
  chrome.tabs.create({ url: "pages/options.html" });
}
window.close();
})();
