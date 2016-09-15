"use strict";
chrome.runtime.getManifest && (function() {
  var loader = document.currentScript, arr, head;
  head = loader ? loader.parentElement : document.head;
  arr = chrome.runtime.getManifest().content_scripts[0].js;
  arr.pop();
  arr.forEach(function(src) {
    var scriptElement = document.createElement("script");
    scriptElement.async = false;
    scriptElement.defer = true;
    scriptElement.src = (src[0] !== "/") ? ("/" + src) : src;
    head.replaceChild(scriptElement, loader);
    loader = scriptElement;
  });
  loader.remove();
})();
