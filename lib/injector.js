"use strict";
chrome.runtime.id !== "hfjbmagddngcpeloejdejnfgbamkjaeg" &&
chrome.runtime.sendMessage("hfjbmagddngcpeloejdejnfgbamkjaeg", {
  handler: "content_scripts"
}, function(content_scripts) {
  window.VimiumInjector = "hfjbmagddngcpeloejdejnfgbamkjaeg";
  var insertLocation = document.querySelector(
    'script[src^="chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/lib/injector.js"]'
    ) || document.head.firstChild, parentElement = insertLocation.parentElement;
  content_scripts.css.forEach(function(src) {
    var styleElement = document.createElement("link");
    styleElement.type = "text/css";
    styleElement.rel = "stylesheet";
    styleElement.href = src;
    parentElement.insertBefore(styleElement, insertLocation);
  });
  content_scripts.js.forEach(function(src) {
    var scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    scriptElement.async = false;
    scriptElement.defer = true;
    scriptElement.src = src;
    parentElement.insertBefore(scriptElement, insertLocation);
  });
});
