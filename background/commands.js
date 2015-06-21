"use strict";
var Commands = {
  // NOTE: [^\s] is for spliting passed keys
  keyRegex: /<(?:(?:a-(?:c-)?(?:m-)?|c-(?:m-)?|m-)([A-Z][0-9A-Z]+|[a-z][0-9a-z]+|[^\s])|[A-Z][0-9A-Z]+|[a-z][0-9a-z]+)>|[^\s]/g,
  availableCommands: {},
  keyToCommandRegistry: {},
  _keyLeftRegex: /<((?:[acmACM]-){0,3})([A-Za-z][0-9A-Za-z]+|.)>/g,
  _upperRegex: /[A-Z]/,
  onNormalize: function(match, option, key) {
    return (option ? ("<" + option.toLowerCase()) : "<")
      + (Commands._upperRegex.test(key) ? key.toUpperCase() : key)
      + ">";
  },
  normalizeKey: function(key) {
    return key.replace(this._keyLeftRegex, this.onNormalize);
  },
  getOptions: function(argv) {
    var opt = {}, i, len, ind, str, val, e;
    for (i = 0, len = argv.length; i < len; ) {
      str = argv[i++];
      ind = str.indexOf("=");
      if (ind <= 0 || ind === str.length) { continue; }
      val = str.substring(ind + 1);
      try {
        val = decodeURIComponent(val);
        val = JSON.parse(val);
      } catch (e) {}
      opt[str.substring(0, ind)] = val;
    }
    return opt;
  },
  parseKeyMappings: function(line) {
    var key, lines, splitLine, _i, _len, defaultMap, registry, details;
    defaultMap = this.defaultKeyMappings;
    registry = this.keyToCommandRegistry = {};
    lines = line.replace(/\\\n/g, "").replace(/[\t ]+/g, " ").split("\n");
    for (key in defaultMap) {
      line = defaultMap[key];
      details = this.availableCommands[line];
      registry[key] = {
        background: details.background,
        command: line,
        options: {},
        repeat: details.repeat
      };
    }
    for (_i = 0, _len = lines.length; _i < _len; _i++) {
      line = lines[_i].trim();
      if (!(line.charCodeAt(0) > 35)) { continue; } // mask: /[ !"#]/
      splitLine = line.split(" ");
      key = splitLine[0];
      if (key === "map") {
        if (splitLine.length < 3) {
        } else if (details = this.availableCommands[key = splitLine[2]]) {
          this.keyToCommandRegistry[this.normalizeKey(splitLine[1])] = {
            background: details.background,
            command: key,
            options: this.getOptions(splitLine.slice(3)),
            repeat: details.repeat
          };
        } else {
          console.log("Command %c" + command, "color:red;", "doesn't exist!");
        }
      } else if (key === "unmapAll") {
        registry = this.keyToCommandRegistry = {};
      } else if (key !== "unmap" || splitLine.length !== 2) {
      } else if ((key = this.normalizeKey(splitLine[1])) in registry) {
        delete registry[key];
      } else {
        console.log("Unmapping:", key, "has not been mapped");
      }
    }
    this.keyToCommandRegistry.__proto__ = null;
  },
  commandGroups: null,
  advancedCommands: null,
  defaultKeyMappings: null
};
Commands.__proto__ = null;

Commands.commandGroups = {
  pageNavigation: ["scrollDown", "scrollUp", "scrollLeft", "scrollRight", "scrollToTop"
    , "scrollToBottom", "scrollToLeft", "scrollToRight", "scrollPageDown", "scrollPageUp"
    , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight"
    , "scrollFullPageUp", "scrollFullPageDown", "reload", "reloadTab", "toggleViewSource"
    , "copyCurrentUrl", "copyCurrentTitle", "switchFocus", "simBackspace"
    , "LinkHints.activateModeToCopyLinkUrl", "LinkHints.activateModeToCopyLinkText"
    , "openCopiedUrlInCurrentTab", "openCopiedUrlInNewTab", "goUp", "goToRoot"
    , "focusInput", "LinkHints.activateMode", "LinkHints.activateModeToOpenInNewTab"
    , "LinkHints.activateModeToOpenInNewForegroundTab", "LinkHints.activateModeWithQueue"
    , "LinkHints.activateModeToDownloadImage", "LinkHints.activateModeToOpenImage"
    , "LinkHints.activateModeToDownloadLink", "LinkHints.activateModeToOpenIncognito"
    , "LinkHints.activateModeToHover", "LinkHints.activateModeToSearchLinkText"
    , "goPrevious", "goNext", "nextFrame", "mainFrame"
    , "enterInsertMode", "enterVisualMode", "enterVisualLineMode"
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
    , "moveTabToNewWindow", "moveTabToIncognito", "togglePinTab"
    , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
    , "enableImageTemp", "toggleImage", "clearImageCS"],
  misc: ["showHelp", "autoCopy", "autoOpen", "searchAs"
    , "toggleSmoothTemp", "debugBackground", "blank"]
};
Commands.advancedCommands = ["scrollToLeft", "scrollToRight", "moveTabToNextWindow"
  , "moveTabToNewWindow", "moveTabToIncognito"
  , "goUp", "goToRoot", "focusInput", "LinkHints.activateModeWithQueue", "enableImageTemp"
  , "toggleImage", "clearImageCS", "LinkHints.activateModeToDownloadImage", "reopenTab"
  , "LinkHints.activateModeToOpenImage", "searchAs", "removeGivenTab"
  , "LinkHints.activateModeToDownloadLink", "Vomnibar.activateEditUrl", "restoreGivenTab"
  , "Vomnibar.activateEditUrlInNewTab", "LinkHints.activateModeToOpenIncognito"
  , "goNext", "goPrevious", "Marks.clearLocal", "Marks.clearGlobal"
  , "moveTabLeft", "moveTabRight", "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs"
  , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight", "debugBackground", "blank"
  , "toggleSmoothTemp"
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
  "V": "enterVisualLineMode",
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
  var command, description, ref = Commands.availableCommands, options;
  descriptions.__proto__ = null;
  ref.__proto__ = null;
  for (command in descriptions) {
    description = descriptions[command];
    if (command in ref) { // #if DEBUG
      console.warn("Bug:", command, "is already defined!");
      continue;
    } // #endif
    options = description[1];
    ref[command] = {
      background: options && options.background ? true : false,
      description: description[0],
      repeat: options && options.repeat || 0
    };
  }
})({
  showHelp: [
    "Show help", {
      repeat: 1
    }
  ],
  debugBackground: [
    "Debug the background page", {
      background: true,
      repeat: 1
    }
  ],
  blank: [
    "Do nothing", {
      background: true,
      repeat: 1
    }
  ],
  toggleSmoothTemp: [
    "Toggle smooth-scroll switch only in currnet page", {
      repeat: 1
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
      repeat: 1
    }
  ],
  scrollToBottom: [
    "Scroll to the bottom of the page", {
      repeat: 1
    }
  ],
  scrollToLeft: [
    "Scroll all the way to the left", {
      repeat: 1
    }
  ],
  scrollToRight: [
    "Scroll all the way to the right", {
      repeat: 1
    }
  ],
  scrollPageDown: ["Scroll a page down"],
  scrollPageUp: ["Scroll a page up"],
  scrollFullPageDown: ["Scroll a full page down"],
  scrollFullPageUp: ["Scroll a full page up"],
  reload: [
    "Reload current frame", {
      repeat: 1
    }
  ],
  reloadTab: [
    "Reload N tab(s)", {
      background: true,
      repeat: 20
    }
  ],
  reopenTab: [
    "Reopen current page", {
      background: true,
      repeat: 1
    }
  ],
  toggleViewSource: [
    "View page source", {
      background: true,
      repeat: 1
    }
  ],
  copyCurrentTitle: [
    "Copy current tab's title", {
      background: true,
      repeat: 1
    }
  ],
  copyCurrentUrl: [
    "Copy current tab's URL", {
      background: true,
      repeat: 1
    }
  ],
  autoCopy: [
    "Copy selected text or current frame's title", {
      repeat: 1
    }
  ],
  autoOpen: [
    "Open selected or copied text in a new tab", {
      repeat: 1
    }
  ],
  searchAs: [
    "Search selected or copied text using current search engine", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToCopyLinkUrl": [
    "Copy a link URL to the clipboard", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToCopyLinkText": [
    "Copy a link text to the clipboard", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToSearchLinkText": [
    "Open or search a link text", {
      repeat: 1
    }
  ],
  openCopiedUrlInCurrentTab: [
    "Open the clipboard's URL in the current tab", {
      background: true,
      repeat: 1
    }
  ],
  openCopiedUrlInNewTab: [
    "Open the clipboard's URL in N new tab(s)", {
      background: true,
      repeat: 20
    }
  ],
  enterInsertMode: [
    "Enter insert mode", {
      repeat: 1
    }
  ],
  enterVisualMode: [
    "Enter visual mode", {
      repeat: 1
    }
  ],
  enterVisualLineMode: [
    "Enter visual line mode (beta feature)", {
      repeat: 1
    }
  ],
  focusInput: [
    "Focus the first text box on the page. Cycle between them using tab"
  ],
  "LinkHints.activateMode": [
    "Open a link in the current tab", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToOpenInNewTab": [
    "Open a link in a new tab", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [
    "Open a link in a new tab & switch to it", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeWithQueue": [
    "Open multiple links in a new tab", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToOpenIncognito": [
    "Open a link in incognito window", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToDownloadImage": [
    "Download <img> image", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToOpenImage": [
    "Show <img> image in new extension's tab", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToDownloadLink": [
    "Download link url", {
      repeat: 1
    }
  ],
  "LinkHints.activateModeToHover": [
    "select an element and hover", {
      repeat: 1
    }
  ],
  enterFindMode: [
    "Enter find mode", {
      repeat: 1
    }
  ],
  performFind: ["Cycle forward to the next find match"],
  performBackwardsFind: ["Cycle backward to the previous find match"],
  switchFocus: [
    "blur activeElement or refocus it", {
      repeat: 1
    }
  ],
  simBackspace: [
    "simulate backspace for once if focused", {
      repeat: 1
    }
  ],
  goPrevious: [
    "Follow the link labeled previous or <", {
      repeat: 1
    }
  ],
  goNext: [
    "Follow the link labeled next or >", {
      repeat: 1
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
      repeat: 1
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
      repeat: 1
    }
  ],
  lastTab: [
    "Go to the last tab", {
      background: true,
      repeat: 1
    }
  ],
  createTab: [
    "Create new tab(s)", {
      background: true,
      repeat: 20
    }
  ],
  duplicateTab: [
    "Duplicate current tab for N times", {
      background: true,
      repeat: 20
    }
  ],
  removeTab: [
    "Close N tab(s)", {
      background: true,
      repeat: chrome.sessions.MAX_SESSION_RESULTS
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
      repeat: chrome.sessions.MAX_SESSION_RESULTS
    }
  ],
  restoreGivenTab: [
    "Restore the last N-th tab", {
      background: true
    }
  ],
  moveTabToNewWindow: [
    "Move tab to new window", {
      background: true,
      repeat: 1
    }
  ],
  moveTabToNextWindow: [
    "Move tab to next window", {
      background: true,
      repeat: 1
    }
  ],
  moveTabToIncognito: [
    "Make tab in a incognito window", {
      background: true,
      repeat: 1
    }
  ],
  togglePinTab: [
    "Pin/unpin current tab", {
      background: true,
      repeat: 20
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
      repeat: 1
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
      repeat: 1
    }
  ],
  toggleImage: [
    "turn on/off the site's image", {
      background: true,
      repeat: 1
    }
  ],
  clearImageCS: [
    "clear extension's image content settings", {
      background: true,
      repeat: 1
    }
  ],
  "Vomnibar.activate": [
    "Open URL, bookmark, or history entry", {
      repeat: 1
    }
  ],
  "Vomnibar.activateInNewTab": [
    "Open URL, bookmark, history entry, in a new tab", {
      repeat: 1
    }
  ],
  "Vomnibar.activateTabSelection": [
    "Search through your open tabs", {
      repeat: 1
    }
  ],
  "Vomnibar.activateBookmarks": [
    "Open a bookmark", {
      repeat: 1
    }
  ],
  "Vomnibar.activateBookmarksInNewTab": [
    "Open a bookmark in a new tab", {
      repeat: 1
    }
  ],
  "Vomnibar.activateHistory": [
    "Open a history", {
      repeat: 1
    }
  ],
  "Vomnibar.activateHistoryInNewTab": [
    "Open a history in a new tab", {
      repeat: 1
    }
  ],
  "Vomnibar.activateEditUrl": [
    "Edit the current URL", {
      repeat: 1
    }
  ],
  "Vomnibar.activateEditUrlInNewTab": [
    "Edit the current URL and open in a new tab", {
      repeat: 1
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
      repeat: 1
    }
  ],
  "Marks.activateCreateMode": [
    "Create a new mark", {
      repeat: 1
    }
  ],
  "Marks.activateGotoMode": [
    "Go to a mark", {
      repeat: 1
    }
  ],
  "Marks.clearLocal": [
    "Remove all local marks for this site", {
      repeat: 1
    }
  ],
  "Marks.clearGlobal": [
    "Remove all global marks", {
      background: true,
      repeat: 1
    }
  ]
});