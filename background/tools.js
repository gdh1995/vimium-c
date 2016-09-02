"use strict";
var Clipboard = {
  getTextArea: function() {
    var el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-100%";
    this.getTextArea = function() { return el; };
    return el;
  },
  copy: function(data) {
    var textArea = this.getTextArea();
    textArea.value = data.replace(Utils.A0Re, " ");
    document.documentElement.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    textArea.value = "";
  },
  paste: function() {
    var textArea = this.getTextArea(), value;
    document.documentElement.appendChild(textArea);
    textArea.focus();
    document.execCommand("paste");
    value = textArea.value;
    textArea.remove();
    textArea.value = "";
    return value.replace(Utils.A0Re, " ");
  }
},
Marks = { // NOTE: all members should be static
  createMark: function(request, port) {
    var tabId = port.sender.tab.id;
    if (request.scroll) {
      localStorage.setItem(Marks.getMarkKey(request.markName), JSON.stringify({
        tabId: tabId,
        url: request.url,
        scroll: request.scroll
      }));
      return true;
    }
    (port = Settings.indexFrame(tabId, 0)) && port.postMessage({
      name: "createMark",
      markName: request.markName,
    });
  },
  gotoMark: function(request) {
    var str, markInfo;
    str = localStorage.getItem(Marks.getMarkKey(request.markName));
    if (!str) {
      return false;
    }
    markInfo = JSON.parse(str);
    markInfo.markName = request.markName;
    if (!Settings.indexPorts(markInfo.tabId)) {
      g_requestHandlers.focusOrLaunch(markInfo);
      return null;
    }
    chrome.tabs.get(markInfo.tabId, function(tab) {
      if (!chrome.runtime.lastError && tab.url.startsWith(markInfo.url)) {
        Marks.gotoTab(markInfo, tab);
      } else {
        g_requestHandlers.focusOrLaunch(markInfo);
      }
    });
    return true;
  },
  getMarkKey: function(keyChar) {
    return "vimiumGlobalMark|" + keyChar;
  },
  gotoTab: function(markInfo, tab) {
    var tabId = tab.id, port;
    if (markInfo.scroll) {
      (port = Settings.indexFrame(tabId, 0)) && port.postMessage({
        name: "scroll",
        scroll: markInfo.scroll,
        markName: markInfo.markName
      });
      if (markInfo.tabId !== tabId && markInfo.markName) {
        localStorage.setItem(Marks.getMarkKey(markInfo.markName), JSON.stringify({
          tabId: tabId,
          url: markInfo.url,
          scroll: markInfo.scroll
        }));
      }
    }
    chrome.tabs.update(tabId, {active: true});
    chrome.windows.update(tab.windowId, {focused: true});
  },
  clearGlobal: function() {
    var key_start, storage, i, key;
    key_start = Marks.getMarkKey("");
    storage = localStorage;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i);
      if (key.startsWith(key_start)) {
        storage.removeItem(key);
      }
    }
    g_requestHandlers.SendToCurrent({
      name: "showHUD",
      text: "Global marks have been cleared."
    });
  }
},
TabRecency = {
  tabs: null,
  last: function() { return -1; },
  rCompare: null,
};

setTimeout(function() {
  var cache = Object.create(null), last = -1, stamp = 1, time = 0,
  _this = TabRecency,
  clean = function() {
    var ref = cache, i;
    for (i in ref) {
      if (ref[i] <= 896) { delete ref[i]; }
      else {ref[i] -= 895; }
    }
    stamp = 128;
  },
  listener = function(activeInfo) {
    var now = Date.now(), tabId = activeInfo.tabId;
    if (now - time > 500) {
      cache[last] = ++stamp;
      if (stamp === 1023) { clean(); }
    }
    last = tabId; time = now;
  };
  chrome.tabs.onActivated.addListener(listener);
  chrome.windows.onFocusChanged.addListener(function(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) { return; }
    chrome.tabs.query({windowId: windowId, active: true}, function(tabs) {
      tabs[0] && listener({tabId: tabs[0].id});
    });
  });
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
    time = Date.now();
    if (chrome.runtime.lastError) { return chrome.runtime.lastError; }
    last = tabs[0] ? tabs[0].id : (chrome.tabs.TAB_ID_NONE || -1);
  });
  _this.tabs = cache;
  _this.last = function() { return last; };
  _this.rCompare = function(a, b) {
    return cache[a.id] < cache[b.id];
  };
}, 120);
