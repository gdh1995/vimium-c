"use strict";
/* eslint-env webextensions */
(function() {
  var curEl = document.currentScript, scriptSrc = curEl.src, i = scriptSrc.indexOf("://") + 3,
  tick = 1, extId = scriptSrc.substring(i, scriptSrc.indexOf("/", i)), handler;
chrome.runtime.sendMessage(extId, { handler: "content_scripts" }, handler = function(content_scripts) {
  if (!content_scripts) {
    var msg, str, host, noBackend;
    msg = chrome.runtime.lastError && chrome.runtime.lastError.message;
    host = chrome.runtime.id || location.host || location.protocol;
    noBackend = !!(msg && msg.lastIndexOf("not exist") >= 0 && chrome.runtime.id);
    if (content_scripts === false) { // disabled
      str = ": not in the white list.";
    } else if (!noBackend && chrome.runtime.lastError) {
      str = msg ? ":\n\t" + msg : ": no backend found.";
    } else if (tick > 3) {
      str = msg ? ":\n\t" + msg : ": retried but failed (" + content_scripts + ").";
      noBackend = false;
    } else {
      setTimeout(function() {
        chrome.runtime.sendMessage(extId, { handler: "content_scripts" }, handler);
      }, 200 * tick);
      tick++;
      noBackend = true;
    }
    if (!noBackend) {
      EventTarget.vimiumRemoveHooks && EventTarget.vimiumRemoveHooks();
      console.log("%cVimium++%c: %cfail%c to inject into %c%s%c %s"
        , "color: red;", "color: auto;", "color: red;", "color: auto;", "color: blue;"
        , host, "color: auto", str ? str : " (" + tick + " retries).");
    }
  }
  /* globals VimiumInjector: false */
  if (window.VimiumInjector && typeof VimiumInjector.destroy === "function") {
    VimiumInjector.destroy(true);
  }

  window.VimiumInjector = {
    id: extId,
    alive: 0,
    destroy: null
  };
  if (!content_scripts) {
    return chrome.runtime.lastError;
  }
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
