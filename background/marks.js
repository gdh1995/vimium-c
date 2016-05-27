"use strict";
// NOTE: all members should be static
var Marks = {
  createMark: function(request, port) {
    var tabId = port.sender.tab.id;
    if (request.scroll) {
      localStorage[Marks.getMarkKey(request.markName)] = JSON.stringify({
        tabId: tabId,
        url: request.url,
        scroll: request.scroll
      });
      return true;
    }
    (port = Settings.indexFrame(tabId, 0)) && port.postMessage({
      name: "createMark",
      markName: request.markName,
    });
  },
  gotoMark: function(request) {
    var str, markInfo;
    str = localStorage[Marks.getMarkKey(request.markName)];
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
        localStorage[Marks.getMarkKey(markInfo.markName)] = JSON.stringify({
          tabId: tabId,
          url: markInfo.url,
          scroll: markInfo.scroll
        });
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
};
