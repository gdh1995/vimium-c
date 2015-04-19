"use strict";
var Marks = {
  _marks: {},
  Create: function(req, tab) {
    Marks._marks[req.markName] = {
      tabId: tab.id,
      scrollX: req.scrollX,
      scrollY: req.scrollY
    };
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
    chrome.tabs.update(mark.tabId, {
      selected: true
    });
    chrome.tabs.sendMessage(mark.tabId, {
      name: "setScrollPosition",
      scroll: [mark.scrollX, mark.scrollY]
    });
    chrome.tabs.sendMessage(mark.tabId, {
      name: "showHUDforDuration",
      text: "Jumped to global mark '" + req.markName + "'",
      duration: 1000
    });
  }
};

chrome.tabs.onRemoved.addListener(Marks.RemoveMarksForTab);
