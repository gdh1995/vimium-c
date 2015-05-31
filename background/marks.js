"use strict";
var Marks = {
  _marks: {},
  Create: function(req, tabs) {
    Marks._marks[req.markName] = {
      tabId: tab[0].id,
      scroll: req.scroll
    };
    return true;
  },
  GoTo: function(req) {
    var mark = Marks._marks[req.markName];
    if (!mark) { return; }
    chrome.tabs.sendMessage(mark.tabId, {
      name: "gotoMark",
      frameId: 0,
      scroll: mark.scroll,
      markName: req.markName
    });
    chrome.tabs.update(mark.tabId, {
      active: true
    });
  }
};
