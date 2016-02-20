"use strict";
var Clipboard = {
  _getTextArea: function() {
    var el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-100%";
    this._getTextArea = function() { return el; }
    return el;
  },
  copy: function(data) {
    var textArea = this._getTextArea();
    textArea.value = data;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
    textArea.value = "";
  },
  paste: function() {
    var textArea = this._getTextArea(), value;
    document.body.appendChild(textArea);
    textArea.focus();
    document.execCommand("Paste");
    value = textArea.value;
    textArea.remove();
    textArea.value = "";
    return value;
  }
},
TabRecency = {
  tabs: null,
  last: null,
  rCompare: null,
};

setTimeout(function() {
  var cache = Object.create(null), last = 0, stamp = 1, time = 0,
  _this = TabRecency, clean = function() {
    var ref = cache, i;
    for (i in ref) {
      if (ref[i] <= 896) { delete ref[i]; }
      else {ref[i] -= 895; }
    }
    stamp = 128;
  }, listener;
  listener = function(activeInfo) {
    var now = Date.now(), tabId = activeInfo.tabId;
    if (now - time > 500) {
      cache[last] = ++stamp;
      if (stamp === 1023) { clean(); }
    }
    last = tabId; time = now;
  }
  chrome.tabs.onActivated.addListener(listener);
  chrome.windows.onFocusChanged.addListener(function(wnd) {
    if (wnd === chrome.windows.WINDOW_ID_NONE) { return; }
    chrome.tabs.query({windowId: wnd, active: true}, function(tabs) {
      tabs[0] && listener({tabId: tabs[0].id});
      return chrome.runtime.lastError;
    });
  });
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
    time = Date.now();
    if (chrome.runtime.lastError) { return chrome.runtime.lastError; }
    last = tabs[0] ? tabs[0].id : chrome.tabs.TAB_ID_NONE;
  });
  _this.tabs = cache;
  _this.last = function() { return last; };
  _this.rCompare = function(a, b) {
    return cache[a.id] < cache[b.id];
  };
}, 120);
