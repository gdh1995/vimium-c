"use strict";
var Commands = {
  // NOTE: [^\s] is for spliting passed keys
  keyRegex: /<(?:(?:a-(?:c-)?(?:m-)?|c-(?:m-)?|m-).[^>]*|[A-Za-z][0-9A-Za-z]+)>|[^\s]/g,
  availableCommands: {},
  keyToCommandRegistry: {},
  addCommand: function(command, description, options) {
    if (command in this.availableCommands) { // #if DEBUG
      console.warn("Bug:", command, "is already defined!");
      return;
    } // #endif
    this.availableCommands[command] = {
      noRepeat: options && options.noRepeat || 0,
      background: options && options.background ? true : false,
      description: description || command
    };
  },
  mapKeyToCommand: function(key, command, argv) {
    var commandDetails;
    if (commandDetails = this.availableCommands[command]) {
      this.keyToCommandRegistry[key] = {
        noRepeat: commandDetails.noRepeat,
        background: commandDetails.background,
        command: command
      };
    } else {
      console.log("Command %c" + command, "color:red;", "doesn't exist!");
    }
  },
  unmapKey: function(key) {
    if (key in this.keyToCommandRegistry) {
      delete this.keyToCommandRegistry[key];
    } else {
      console.log("Unmapping:", key, "has not been mapped");
    }
  },
  _keyLeftRegex: /<((?:[acmACM]-){1,3})?(.+?)>/g,
  _upperRegex: /[A-Z]/,
  onNormalize: function(match, option, key) {
    option = option ? option.toLowerCase() : "";
    if (Commands._upperRegex.test(key)) {
      key = key.toUpperCase();
    }
    return "<" + option + key + ">";
  },
  normalizeKey: function(key) {
    return key.replace(this._keyLeftRegex, this.onNormalize);
  },
  parseKeyMappings: function(line) {
    var key, lines, splitLine, _i, _len, defaultmap;
    defaultmap = this.defaultKeyMappings;
    this.keyToCommandRegistry = {};
    for (key in defaultmap) {
      this.mapKeyToCommand(key, defaultmap[key]);
    }
    lines = line.replace(/[\t ]+/g, " ").split("\n");
    for (_i = 0, _len = lines.length; _i < _len; _i++) {
      line = lines[_i].trim();
      key = line[0]; 
      if (key === "\"" || key === "#") {
        continue;
      }
      splitLine = line.split(" ");
      key = splitLine[0];
      if (key === "map") {
        if (splitLine.length >= 3) {
          key = this.normalizeKey(splitLine[1]);
          this.mapKeyToCommand(key, splitLine[2], splitLine.slice(3));
        }
      } else if (key === "unmap") {
        if (splitLine.length === 2) {
          this.unmapKey(this.normalizeKey(splitLine[1]));
        }
      } else if (key === "unmapAll") {
        this.keyToCommandRegistry = {};
      }
    }
    this.keyToCommandRegistry.__proto__ = null;
  },
  commandGroups: null,
  advancedCommands: null,
  defaultKeyMappings: null
};
Commands.__proto__ = null;
Commands.availableCommands.__proto__ = null;

Commands.commandGroups = {
  pageNavigation: ["scrollDown", "scrollUp", "scrollLeft", "scrollRight", "scrollToTop"
    , "scrollToBottom", "scrollToLeft", "scrollToRight", "scrollPageDown", "scrollPageUp"
    , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight"
    , "scrollFullPageUp", "scrollFullPageDown", "reload", "reloadTab", "toggleViewSource"
    , "copyCurrentUrl", "copyCurrentTitle", "switchFocus", "simBackspace"
    , "LinkHints.activateModeToCopyLinkUrl", "LinkHints.activateModeToCopyLinkText"
    , "openCopiedUrlInCurrentTab", "openCopiedUrlInNewTab", "goUp", "goToRoot", "enterInsertMode"
    , "focusInput", "LinkHints.activateMode", "LinkHints.activateModeToOpenInNewTab"
    , "LinkHints.activateModeToOpenInNewForegroundTab", "LinkHints.activateModeWithQueue"
    , "LinkHints.activateModeToDownloadImage", "LinkHints.activateModeToOpenImage"
    , "LinkHints.activateModeToDownloadLink", "LinkHints.activateModeToOpenIncognito"
    , "LinkHints.activateModeToHover", "LinkHints.activateModeToSearchLinkText"
    , "goPrevious", "goNext", "nextFrame", "mainFrame"
    , "Marks.activateCreateMode", "Marks.activateGotoMode"
    , "Marks.clearLocal", "Marks.clearGlobal"
    ],
  vomnibarCommands: ["Vomnibar.activate", "Vomnibar.activateInNewTab"
    , "Vomnibar.activateBookmarks", "Vomnibar.activateBookmarksInNewTab", "Vomnibar.activateHistory"
    , "Vomnibar.activateHistoryInNewTab", "Vomnibar.activateTabSelection"
    , "Vomnibar.activateEditUrl", "Vomnibar.activateEditUrlInNewTab"],
  historyNavigation: ["goBack", "goForward", "reopenTab"],
  findCommands: ["enterFindMode", "performFind", "performBackwardsFind"],
  tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab", "duplicateTab"
    , "removeTab", "removeGivenTab", "restoreTab", "restoreGivenTab", "moveTabToNextWindow"
    , "moveTabToIncognito", "togglePinTab"
    , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
    , "enableImageTemp", "toggleImage", "clearImageCS"],
  misc: ["showHelp", "enterVisualMode", "autoCopy", "autoSearch", "searchAs"
    , "blank"]
};
Commands.advancedCommands = ["scrollToLeft", "scrollToRight", "moveTabToNextWindow", "moveTabToIncognito"
  , "goUp", "goToRoot", "focusInput", "LinkHints.activateModeWithQueue", "enableImageTemp"
  , "toggleImage", "clearImageCS", "LinkHints.activateModeToDownloadImage", "reopenTab"
  , "LinkHints.activateModeToOpenImage", "searchAs", "removeGivenTab"
  , "LinkHints.activateModeToDownloadLink", "Vomnibar.activateEditUrl", "restoreGivenTab"
  , "Vomnibar.activateEditUrlInNewTab", "LinkHints.activateModeToOpenIncognito"
  , "goNext", "goPrevious", "Marks.clearLocal", "Marks.clearGlobal"
  , "moveTabLeft", "moveTabRight", "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs"
  , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight", "blank"
];
Commands.defaultKeyMappings = {
  "?": "showHelp",
  "j": "scrollDown",
  "k": "scrollUp",
  "h": "scrollLeft",
  "l": "scrollRight",
  "gg": "scrollToTop",
  "G": "scrollToBottom",
  "zH": "scrollToLeft",
  "zL": "scrollToRight",
  "<c-e>": "scrollDown",
  "<c-y>": "scrollUp",
  "d": "scrollPageDown",
  "u": "scrollPageUp",
  "r": "reload",
  "R": "reloadTab",
  "<a-r>": "reopenTab",
  "gs": "toggleViewSource",
  "i": "enterInsertMode",
  "v": "enterVisualMode",
  "H": "goBack",
  "L": "goForward",
  "gu": "goUp",
  "gU": "goToRoot",
  "gi": "focusInput",
  "f": "LinkHints.activateMode",
  "F": "LinkHints.activateModeToOpenInNewTab",
  "<a-f>": "LinkHints.activateModeWithQueue",
  "/": "enterFindMode",
  "n": "performFind",
  "N": "performBackwardsFind",
  "[[": "goPrevious",
  "]]": "goNext",
  "yy": "copyCurrentUrl",
  "yf": "LinkHints.activateModeToCopyLinkUrl",
  "p": "openCopiedUrlInCurrentTab",
  "P": "openCopiedUrlInNewTab",
  "K": "nextTab",
  "J": "previousTab",
  "gt": "nextTab",
  "gT": "previousTab",
  "<<": "moveTabLeft",
  ">>": "moveTabRight",
  "g0": "firstTab",
  "g$": "lastTab",
  "W": "moveTabToNextWindow",
  "t": "createTab",
  "yt": "duplicateTab",
  "x": "removeTab",
  "X": "restoreTab",
  "<a-p>": "togglePinTab",
  "o": "Vomnibar.activate",
  "O": "Vomnibar.activateInNewTab",
  "T": "Vomnibar.activateTabSelection",
  "b": "Vomnibar.activateBookmarks",
  "B": "Vomnibar.activateBookmarksInNewTab",
  "ge": "Vomnibar.activateEditUrl",
  "gE": "Vomnibar.activateEditUrlInNewTab",
  "gf": "nextFrame",
  "gF": "mainFrame",
  "<f1>": "simBackspace",
  "<f2>": "switchFocus",
  "m": "Marks.activateCreateMode",
  "`": "Marks.activateGotoMode"
};

(function(descriptions) {
  var command, description, commands = Commands;
  descriptions.__proto__ = null;
  for (command in descriptions) {
    description = descriptions[command];
    commands.addCommand(command, description[0], description[1]);
  }
})({
  showHelp: [
    "Show help", {
      noRepeat: 1
    }
  ],
  blank: [
    "Do nothing", {
      background: true,
      noRepeat: 1
    }
  ],
  scrollDown: ["Scroll down"],
  scrollUp: ["Scroll up"],
  scrollLeft: ["Scroll left"],
  scrollRight: ["Scroll right"],
  scrollPxDown: ["Scroll 1px down"],
  scrollPxUp: ["Scroll 1px up"],
  scrollPxLeft: ["Scroll 1px left"],
  scrollPxRight: ["Scroll 1px right"],
  scrollToTop: [
    "Scroll to the top of the page", {
      noRepeat: 1
    }
  ],
  scrollToBottom: [
    "Scroll to the bottom of the page", {
      noRepeat: 1
    }
  ],
  scrollToLeft: [
    "Scroll all the way to the left", {
      noRepeat: 1
    }
  ],
  scrollToRight: [
    "Scroll all the way to the right", {
      noRepeat: 1
    }
  ],
  scrollPageDown: ["Scroll a page down"],
  scrollPageUp: ["Scroll a page up"],
  scrollFullPageDown: ["Scroll a full page down"],
  scrollFullPageUp: ["Scroll a full page up"],
  reload: [
    "Reload current frame", {
      noRepeat: 1
    }
  ],
  reloadTab: [
    "Reload N tab(s)", {
      background: true,
      noRepeat: 20
    }
  ],
  reopenTab: [
    "Reopen current page", {
      background: true,
      noRepeat: 1
    }
  ],
  toggleViewSource: [
    "View page source", {
      background: true,
      noRepeat: 1
    }
  ],
  copyCurrentTitle: [
    "Copy current tab's title", {
      background: true,
      noRepeat: 1
    }
  ],
  copyCurrentUrl: [
    "Copy current tab's URL", {
      background: true,
      noRepeat: 1
    }
  ],
  autoCopy: [
    "Copy selected text or current frame URL", {
      noRepeat: 1
    }
  ],
  autoSearch: [
    "Open selected text in a new tab", {
      noRepeat: 1
    }
  ],
  searchAs: [
    "Search selected or copied text using current search engine", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToCopyLinkUrl": [
    "Copy a link URL to the clipboard", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToCopyLinkText": [
    "Copy a link text to the clipboard", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToSearchLinkText": [
    "Open or search a link text", {
      noRepeat: 1
    }
  ],
  openCopiedUrlInCurrentTab: [
    "Open the clipboard's URL in the current tab", {
      background: true,
      noRepeat: 1
    }
  ],
  openCopiedUrlInNewTab: [
    "Open the clipboard's URL in N new tab(s)", {
      background: true,
      noRepeat: 20
    }
  ],
  enterInsertMode: [
    "Enter insert mode", {
      noRepeat: 1
    }
  ],
  enterVisualMode: [
    "Enter visual mode", {
      noRepeat: 1
    }
  ],
  focusInput: [
    "Focus the first text box on the page. Cycle between them using tab"
  ],
  "LinkHints.activateMode": [
    "Open a link in the current tab", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToOpenInNewTab": [
    "Open a link in a new tab", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [
    "Open a link in a new tab & switch to it", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeWithQueue": [
    "Open multiple links in a new tab", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToOpenIncognito": [
    "Open a link in incognito window", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToDownloadImage": [
    "Download <img> image", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToOpenImage": [
    "Show <img> image in new extension's tab", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToDownloadLink": [
    "Download link url", {
      noRepeat: 1
    }
  ],
  "LinkHints.activateModeToHover": [
    "select an element and hover", {
      noRepeat: 1
    }
  ],
  enterFindMode: [
    "Enter find mode", {
      noRepeat: 1
    }
  ],
  performFind: ["Cycle forward to the next find match"],
  performBackwardsFind: ["Cycle backward to the previous find match"],
  switchFocus: [
    "blur activeElement or refocus it", {
      noRepeat: 1
    }
  ],
  simBackspace: [
    "simulate backspace for once if focused", {
      noRepeat: 1
    }
  ],
  goPrevious: [
    "Follow the link labeled previous or <", {
      noRepeat: 1
    }
  ],
  goNext: [
    "Follow the link labeled next or >", {
      noRepeat: 1
    }
  ],
  goBack: [
    "Go back in history"
  ],
  goForward: [
    "Go forward in history"
  ],
  goUp: [
    "Go up the URL hierarchy"
  ],
  goToRoot: [
    "Go to root of current URL hierarchy", {
      noRepeat: 1
    }
  ],
  nextTab: [
    "Go one tab right", {
      background: true
    }
  ],
  previousTab: [
    "Go one tab left", {
      background: true
    }
  ],
  firstTab: [
    "Go to the first tab", {
      background: true,
      noRepeat: 1
    }
  ],
  lastTab: [
    "Go to the last tab", {
      background: true,
      noRepeat: 1
    }
  ],
  createTab: [
    "Create new tab(s)", {
      background: true,
      noRepeat: 20
    }
  ],
  duplicateTab: [
    "Duplicate current tab for N times", {
      background: true,
      noRepeat: 20
    }
  ],
  removeTab: [
    "Close N tab(s)", {
      background: true,
      noRepeat: chrome.sessions.MAX_SESSION_RESULTS
    }
  ],
  removeGivenTab: [
    "Close the last N-th tab", {
      background: true
    }
  ],
  restoreTab: [
    "Restore closed tab(s)", {
      background: true,
      noRepeat: chrome.sessions.MAX_SESSION_RESULTS
    }
  ],
  restoreGivenTab: [
    "Restore the last N-th tab", {
      background: true
    }
  ],
  moveTabToNextWindow: [
    "Move tab to next window", {
      background: true,
      noRepeat: 1
    }
  ],
  moveTabToIncognito: [
    "Make tab in a incognito window", {
      background: true,
      noRepeat: 1
    }
  ],
  togglePinTab: [
    "Pin/unpin current tab", {
      background: true,
      noRepeat: 1
    }
  ],
  closeTabsOnLeft: [
    "Close tabs on the left", {
      background: true
    }
  ],
  closeTabsOnRight: [
    "Close tabs on the right", {
      background: true
    }
  ],
  closeOtherTabs: [
    "Close all other tabs", {
      background: true,
      noRepeat: 1
    }
  ],
  moveTabLeft: [
    "Move tab to the left", {
      background: true
    }
  ],
  moveTabRight: [
    "Move tab to the right", {
      background: true
    }
  ],
  enableImageTemp: [
    "enable the site's image temporarily in incognito", {
      background: true,
      noRepeat: 1
    }
  ],
  toggleImage: [
    "turn on/off the site's image", {
      background: true,
      noRepeat: 1
    }
  ],
  clearImageCS: [
    "clear extension's image content settings", {
      background: true,
      noRepeat: 1
    }
  ],
  "Vomnibar.activate": [
    "Open URL, bookmark, or history entry", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateInNewTab": [
    "Open URL, bookmark, history entry, in a new tab", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateTabSelection": [
    "Search through your open tabs", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateBookmarks": [
    "Open a bookmark", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateBookmarksInNewTab": [
    "Open a bookmark in a new tab", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateHistory": [
    "Open a history", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateHistoryInNewTab": [
    "Open a history in a new tab", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateEditUrl": [
    "Edit the current URL", {
      noRepeat: 1
    }
  ],
  "Vomnibar.activateEditUrlInNewTab": [
    "Edit the current URL and open in a new tab", {
      noRepeat: 1
    }
  ],
  nextFrame: [
    "Cycle forward to the next frame on the page", {
      background: true
    }
  ],
  mainFrame: [
    "Select the tab's main/top frame", {
      background: true,
      noRepeat: 1
    }
  ],
  "Marks.activateCreateMode": [
    "Create a new mark", {
      noRepeat: 1
    }
  ],
  "Marks.activateGotoMode": [
    "Go to a mark", {
      noRepeat: 1
    }
  ],
  "Marks.clearLocal": [
    "Remove all local marks for this site", {
      noRepeat: 1
    }
  ],
  "Marks.clearGlobal": [
    "Remove all global marks", {
      background: true,
      noRepeat: 1
    }
  ]
});