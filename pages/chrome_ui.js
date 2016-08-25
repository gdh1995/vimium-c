"use strict";
var BG = chrome.extension.getBackgroundPage();
if (BG) {
  BG.g_requestHandlers.focusOrLaunch({
    url: BG.Settings.CONST.OptionsPage,
    reuse: 1
  });
} else {
  chrome.tabs.create("options.html");
}
window.close();
