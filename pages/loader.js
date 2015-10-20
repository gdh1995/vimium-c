"use strict";
(function() {
  var insertLocation, arr;
  insertLocation = document.querySelector('script[src$="loader.js"]') || document.head.firstChild;
  arr = chrome.runtime.getManifest().content_scripts[0].js;
  arr.pop();
  arr.forEach(function(src) {
    var scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    scriptElement.async = false;
    scriptElement.src = (src[0] !== "/") ? ("/" + src) : src;
    insertLocation.parentElement.insertBefore(scriptElement, insertLocation);
  });
})();
