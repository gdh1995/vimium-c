"use strict";
(function() {
  var loader, arr, head;
  if (!chrome.runtime.getManifest) { return; }
  loader = document.querySelector('script[src$="loader.js"]');
  head = loader ? loader.parentElement : document.head;
  arr = chrome.runtime.getManifest().content_scripts[0].js;
  arr.pop();
  arr.forEach(function(src) {
    var scriptElement = document.createElement("script");
    scriptElement.async = false;
    scriptElement.src = (src[0] !== "/") ? ("/" + src) : src;
    head.replaceChild(scriptElement, loader);
    loader = scriptElement;
  });
  loader.remove();
})();
