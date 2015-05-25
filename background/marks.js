"use strict";
var Marks = {
  _marks: {},
  Create: function(req, tab) {
    Marks._marks[req.markName] = {
      tabId: tab.id,
      scroll: req.scroll
    };
    return true;
  },
  RemoveMarksForTab: function(id) {
    var marks = Marks._marks, markName;
    for (var markName in marks) {
      if (marks[markName].tabId === id) {
        delete marks[markName];
      }
    }
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
      selected: true
    });
  }
};

chrome.tabs.onRemoved.addListener(Marks.RemoveMarksForTab);
