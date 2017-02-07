"use strict";
(function() {
var BG = chrome.extension.getBackgroundPage();
if (BG && !BG.Settings.get("dialogMode")) {
  BG.g_requestHandlers.focusOrLaunch({
    url: BG.Settings.CONST.OptionsPage,
    reuse: 1
  });
} else if (BG) {
  window.location.href = BG.Settings.CONST.OptionsPage + "#chrome-ui";
  return;
} else {
  chrome.tabs.create({ url: "pages/options.html" });
}
window.close();
})();
