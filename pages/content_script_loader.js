"use strict";
(function() {
  var insertLocation, insertLink, insertJS;
  insertLocation = document.querySelector('script[src*="content_script_loader.js"]') || document.head.firstChild,
  insertLink = function(src) {
    var styleElement = document.createElement("link");
    styleElement.type = "text/css";
    styleElement.rel = "stylesheet";
    styleElement.href = (src[0] !== "/") ? ("/" + src) : src;
    insertLocation.parentElement.insertBefore(styleElement, insertLocation);
  };
  insertJS = function(src) {
    var scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    scriptElement.async = false;
    scriptElement.src = (src[0] !== "/") ? ("/" + src) : src;
    insertLocation.parentElement.insertBefore(scriptElement, insertLocation);
  };
  chrome.runtime.getManifest().content_scripts.forEach(function(scriptInfo) {
    if (scriptInfo.matches.indexOf("<all_urls>") === -1) {
      return;
    }
    if (scriptInfo.css) {
      scriptInfo.css.forEach(insertLink);
    }
    if (scriptInfo.js) {
      scriptInfo.js.forEach(insertJS);
    }
  });
})();
