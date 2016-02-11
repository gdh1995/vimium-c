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
  stamp: function() {
    var cache = Object.create(null), last = 0, stamp = 1, time = 0,
    _this = TabRecency, clean = function() {
      var ref = cache, i;
      for (i in ref) {
        if (ref[i] <= 192) { delete ref[i]; }
        else {ref[i] -= 191; }
      }
      stamp = 64;
    };
    chrome.tabs.onActivated.addListener(function(activeInfo) {
      var now = Date.now(), tabId = activeInfo.tabId;
      if (now - time > 500) {
        cache[last] = ++stamp;
        if (stamp === 255) { clean(); }
      }
      last = tabId; time = now;
    });
    chrome.tabs.query({currentWindow: true, active: true}, function(tab) {
      time = Date.now();
      if (chrome.runtime.lastError) { return chrome.runtime.lastError; }
      last = tab.id;
    });
    _this.tabs = cache;
    _this.last = function() { return last; };
    _this.stamp = function() { return stamp; };
  }
};

setTimeout(TabRecency.stamp, 120);
