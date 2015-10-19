"use strict";
(function() {
  var insertLocation, insertLink, insertJS;
  insertLocation = document.querySelector('script[src$="content_script_loader.js"]') || document.head.firstChild;
  insertJS = function(src) {
    var scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    scriptElement.async = false;
    scriptElement.src = (src[0] !== "/") ? ("/" + src) : src;
    insertLocation.parentElement.insertBefore(scriptElement, insertLocation);
  };
  chrome.runtime.getManifest().content_scripts[0].js.forEach(insertJS);
})();
