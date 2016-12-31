"use strict";
var Clipboard = {
  getTextArea: function() {
    var el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-99px";
    el.style.width = "0";
    this.getTextArea = function() { return el; };
    return el;
  },
  tailSpacesRe: /[ \t]+\n/g,
  format: function(data) {
    data = data.replace(Utils.A0Re, " ").replace(this.tailSpacesRe, "\n");
    var i = data.charCodeAt(data.length - 1);
    if (i !== 32 && i !== 9) {
    } else if (i = data.lastIndexOf('\n') + 1) {
      data = data.substring(0, i) + data.substring(i).trimRight();
    } else if ((i = data.charCodeAt(0)) !== 32 && i !== 9) {
      data = data.trimRight();
    }
    return data;
  },
  copy: function(data) {
    data = this.format(data);
    var textArea = this.getTextArea();
    textArea.value = data;
    document.documentElement.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    textArea.value = "";
    Utils.resetRe();
  },
  paste: function() {
    var textArea = this.getTextArea(), value;
    document.documentElement.appendChild(textArea);
    textArea.focus();
    document.execCommand("paste");
    value = textArea.value;
    textArea.remove();
    textArea.value = "";
    value = value.replace(Utils.A0Re, " ");
    Utils.resetRe();
    return value;
  }
},
Marks = { // NOTE: all members should be static
  createMark: function(request, port) {
    var tabId = port.sender.tabId;
    if (request.scroll) {
      localStorage.setItem(Marks.getLocationKey(request.markName), JSON.stringify({
        tabId: tabId,
        url: request.url,
        scroll: request.scroll
      }));
      return true;
    }
    (port = Settings.indexFrame(tabId, 0) || port) && port.postMessage({
      name: "createMark",
      markName: request.markName,
    });
  },
  gotoMark: function(request) {
    var str, markInfo;
    str = localStorage.getItem(Marks.getLocationKey(request.markName));
    if (!str) {
      return false;
    }
    markInfo = JSON.parse(str);
    markInfo.markName = request.markName;
    markInfo.prefix = request.prefix !== false && request.scroll[0] === 0 && request.scroll[1] === 0;
    if (Settings.indexPorts(markInfo.tabId)) {
      chrome.tabs.get(markInfo.tabId, Marks.checkTab.bind(markInfo));
    } else {
      g_requestHandlers.focusOrLaunch(markInfo);
    }
    return true;
  },
  checkTab: function(tab) {
    var url = tab.url.split("#", 1)[0];
    if (url === this.url || this.prefix && this.url.startsWith(url)) {
      g_requestHandlers.gotoSession({ sessionId: tab.id });
      Marks.scrollTab(this, tab);
    } else {
      g_requestHandlers.focusOrLaunch(this);
    }
  },
  getLocationKey: function(keyChar) {
    return "vimiumGlobalMark|" + keyChar;
  },
  scrollTab: function(markInfo, tab) {
    var tabId = tab.id, port;
    (port = Settings.indexFrame(tabId, 0)) && port.postMessage({
      name: "scroll",
      scroll: markInfo.scroll,
      markName: markInfo.markName
    });
    if (markInfo.tabId !== tabId && markInfo.markName) {
      localStorage.setItem(Marks.getLocationKey(markInfo.markName), JSON.stringify({
        tabId: tabId,
        url: markInfo.url,
        scroll: markInfo.scroll
      }));
    }
  },
  clearGlobal: function() {
    var key_start, storage, i, key;
    key_start = Marks.getLocationKey("");
    storage = localStorage;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i);
      if (key.startsWith(key_start)) {
        storage.removeItem(key);
      }
    }
    return g_requestHandlers.ShowHUD("Global marks have been cleared.");
  }
},
FindModeHistory = {
  key: "findModeRawQueryList",
  max: 50,
  list: null,
  listI: null,
  timer: 0,
  init: function() {
    var str = Settings.get(this.key);
    this.list = str ? str.split("\n") : [];
    this.init = null;
  },
  initI: function() {
    var list = this.listI = this.list.slice(0);
    chrome.windows.onRemoved.addListener(this.OnWndRemvoed);
    return list;
  },
  query: function(incognito, query, index) {
    this.init && this.init();
    var list = incognito ? this.listI || this.initI() : this.list, str;
    if (!query) {
      return list[list.length - (index || 1)] || "";
    }
    if (incognito) {
      this.refreshIn(query, list, true);
      return;
    }
    str = this.refreshIn(query, list);
    str && Settings.set(this.key, str);
    this.listI && this.refreshIn(query, this.listI, true);
  },
  refreshIn: function(query, list, result) {
    var ind = list.lastIndexOf(query);
    if (ind >= 0) {
      if (ind === list.length - 1) { return; }
      list.splice(ind, 1);
    }
    else if (list.length >= this.max) { list.shift(); }
    list.push(query);
    return result || list.join("\n");
  },
  removeAll: function(incognito) {
    if (incognito) {
      this.listI && (this.listI = []);
      return;
    }
    this.init = null;
    this.list = [];
    Settings.set(this.key, "");
  },
  OnWndRemvoed: function() {
    var _this = FindModeHistory;
    if (!_this.listI) { return; }
    _this.timer = _this.timer || setTimeout(_this.TestIncognitoWnd, 34);
  },
  TestIncognitoWnd: function() {
    FindModeHistory.timer = 0;
    var left = false, i, port, arr = Settings.indexPorts();
    for (i in arr) {
      port = arr[i][0];
      if (port.sender.incognito) { left = true; break; }
    }
    if (!left) { FindModeHistory.cleanI(); return; }
    if (Settings.CONST.ChromeVersion >= 52) { return; }
    chrome.windows.getAll(function(wnds) {
      wnds.some(function(wnd) { return wnd.incognito; }) || FindModeHistory.cleanI();
    });
  },
  cleanI: function() {
    this.listI = null;
    chrome.windows.onRemoved.removeListener(this.OnWndRemvoed);
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
