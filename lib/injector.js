"use strict";
var VimiumInjector = "hfjbmagddngcpeloejdejnfgbamkjaeg";
chrome.runtime.id !== VimiumInjector &&
chrome.runtime.sendMessage(VimiumInjector, {
  handler: "content_scripts"
}, function(content_scripts) {
  var insertLocation = document.querySelector(
    'script[src^="chrome-extension://' + VimiumInjector + '/lib/injector.js"]'
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
    scriptElement.src = src;
    parentElement.insertBefore(scriptElement, insertLocation);
  });
});
