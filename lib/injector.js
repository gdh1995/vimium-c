"use strict";
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
  if (window.VimiumInjector && typeof VimiumInjector.destroy === "function") {
    VimiumInjector.destroy();
  }
  window.VimiumInjector = {
    id: "hfjbmagddngcpeloejdejnfgbamkjaeg",
    alive: 0,
    destroy: null,
    execute: null
  };
  var arr, insertLocation = document.querySelector(
    'script[src^="chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/lib/injector.js"]'
    ) || document.head.firstChild, parentElement = insertLocation.parentElement;
  arr = content_scripts.css;
  if (arr && arr.length > 0) {
    arr.forEach(function(src) {
      var styleElement = document.createElementNS("http://www.w3.org/1999/xhtml", "link");
      styleElement.type = "text/css";
      styleElement.rel = "stylesheet";
      styleElement.href = src;
      parentElement.insertBefore(styleElement, insertLocation);
    });
  }
  arr = content_scripts.js;
  if (arr && arr.length > 0) {
    arr.forEach(function(src) {
      var scriptElement = document.createElementNS("http://www.w3.org/1999/xhtml", "script");
      scriptElement.type = "text/javascript";
      scriptElement.async = false;
      scriptElement.defer = true;
      scriptElement.src = src;
      parentElement.insertBefore(scriptElement, insertLocation);
    });
  }
});
