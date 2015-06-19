"use strict";
chrome.runtime.id !== "hfjbmagddngcpeloejdejnfgbamkjaeg" &&
chrome.runtime.sendMessage("hfjbmagddngcpeloejdejnfgbamkjaeg", {
  handler: "content_scripts"
}, function(content_scripts) {
  // sometimes iframe will forbid sendMessage by returning at once
  if (!content_scripts) {
    if (chrome.runtime.lastError) {
      console.log("%cVimium++%c: %cfail%c to inject into %c" + chrome.runtime.id
        , "color: red;", "color: auto;", "color: red;", "color: auto;", "color: blue;");
      return chrome.runtime.lastError;
    }
    return;
  }
  window.VimiumInjector = "hfjbmagddngcpeloejdejnfgbamkjaeg";
  var arr, insertLocation = document.querySelector(
    'script[src^="chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/lib/injector.js"]'
    ) || document.head.firstChild, parentElement = insertLocation.parentElement;
  arr = content_scripts.css;
  if (arr && arr.length > 0) {
    arr.forEach(function(src) {
      var styleElement = document.createElement("link");
      styleElement.type = "text/css";
      styleElement.rel = "stylesheet";
      styleElement.href = src;
      parentElement.insertBefore(styleElement, insertLocation);
    });
  }
  arr = content_scripts.js;
  if (arr && arr.length > 0) {
    arr.forEach(function(src) {
      var scriptElement = document.createElement("script");
      scriptElement.type = "text/javascript";
      scriptElement.async = false;
      scriptElement.defer = true;
      scriptElement.src = src;
      parentElement.insertBefore(scriptElement, insertLocation);
    });
  }
});
