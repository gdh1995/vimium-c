"use strict";
/* eslint-env webextensions */
(function() {
  var curEl = document.currentScript, scriptSrc = curEl.src, i = scriptSrc.indexOf("://") + 3,
  extId = scriptSrc.substring(i, scriptSrc.indexOf("/", i));
chrome.runtime.sendMessage(extId, { handler: "content_scripts" }, function(content_scripts) {
  if (!content_scripts) {
    console.log("%cVimium++%c: %cfail%c to inject into %c" + chrome.runtime.id
      , "color: red;", "color: auto;", "color: red;", "color: auto;", "color: blue;");
    if (content_scripts === null) { // disabled
      EventTarget.vimiumRemoveHooks && EventTarget.vimiumRemoveHooks();
    }
    return chrome.runtime.lastError;
  }
  /* globals VimiumInjector */
  if (window.VimiumInjector && typeof VimiumInjector.destroy === "function") {
    VimiumInjector.destroy();
  }

  window.VimiumInjector = {
    id: extId,
    alive: 0,
    destroy: null
  };
  var insertLocation = document.contains(curEl) ? curEl : document.head.firstChild
    , defer = scriptSrc.indexOf("#defer", scriptSrc.length - 6) > 0
    , i = 0, len = content_scripts.length, scriptElement
    , parentElement = insertLocation.parentElement;
  while (i < len) {
    scriptElement = document.createElement("script");
    scriptElement.async = false;
    scriptElement.defer = defer;
    scriptElement.src = content_scripts[i++];
    parentElement.insertBefore(scriptElement, insertLocation).remove();
  }
});
})();

(function(obj) {
var cls = obj.prototype, _listen = cls.addEventListener, newListen;
if (_listen.vimiumHooked === true) { return; }

cls.addEventListener = newListen = function(type, listener, useCapture) {
  if (type === "click" && this instanceof Element) {
    this.vimiumHasOnclick = true;
  }
  return _listen.call(this, type, listener, useCapture);
};
cls.addEventListener.vimiumHooked = true;
obj.vimiumRemoveHooks = function() {
  delete obj.vimiumRemoveHooks;
  cls.addEventListener === newListen && (cls.addEventListener = _listen);
};
})(EventTarget);
