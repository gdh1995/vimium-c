"use strict";
var Commands = {
  // NOTE: [^\s] is for spliting passed keys
  keyRe: /<(?:.-){0,3}.[^>]*>|./g,
  keyToCommandRegistry: null,
  normalizeKey: function(key) { return key; },
  setStrict: function(keyReSource) {
    var keyLeftRe = /<((?:[acmACM]-){0,3})(.[^>]*)>/g, upRe = Utils.upperRe,
    func = function(_0, option, key) {
      return (option ? ("<" + option.toLowerCase()) : "<")
        + (upRe.test(key) ? key.toUpperCase() : key)
        + ">";
    };
    this.normalizeKey = function(key) { return key.replace(keyLeftRe, func); };
    this.keyRe = new RegExp(keyReSource, "g");
    this.setStrict = null;
  },
  defaultOption: Object.create(null),
  getOptions: function(item) {
    var opt = {}, i, len, ind, str, val;
    for (i = 3, len = item.length; i < len; ) {
      str = item[i++];
      ind = str.indexOf("=");
      if (ind <= 0) {
        val = str;
        str = "" + (i - 3);
      } else {
        val = str.substring(ind + 1);
        str = str.substring(0, ind);
      }
      opt[str] = val && this.parseDecoded(val);
    }
    return str ? opt : this.defaultOption;
  },
  parseDecoded: function(val) {
    try {
      val = decodeURIComponent(val);
      val = JSON.parse(val);
    } catch (e) {}
    return val;
  },
  loadDefaults: function() {
    var defaultMap = this.defaultKeyMappings, available = this.availableCommands
      , registry = this.keyToCommandRegistry
      , key, command, details, options = this.defaultOption;
    for (key in defaultMap) {
      details = available[command = defaultMap[key]];
      registry[key] = {
        background: details[2],
        command: command,
        options: options,
        repeat: details[1]
      };
    }
  },
  parseKeyMappings: function(line) {
    var key, lines, splitLine, _i = 0, _len, registry, details, available;
    registry = this.keyToCommandRegistry = Object.create(null);
    available = this.availableCommands;
    lines = line.replace(/\\\n/g, "").replace(/[\t ]+/g, " ").split("\n");
    lines[0] !== "unmapAll" ? this.loadDefaults() : (_i = 1);
    for (_len = lines.length; _i < _len; _i++) {
      line = lines[_i].trim();
      if (!(line.charCodeAt(0) > 35)) { continue; } // mask: /[ !"#]/
      splitLine = line.split(" ");
      key = splitLine[0];
      if (key === "map") {
        if (splitLine.length < 3) {
        } else if (details = available[key = splitLine[2]]) {
          registry[this.normalizeKey(splitLine[1])] = {
            background: details[2],
            command: key,
            options: this.getOptions(splitLine),
            repeat: details[1]
          };
        } else {
          console.log("Command %c" + key, "color:red;", "doesn't exist!");
        }
      } else if (key === "unmapAll") {
        registry = this.keyToCommandRegistry = Object.create(null);
      } else if (key !== "unmap" || splitLine.length !== 2) {
        console.log("Unknown mapping command: '" + key + "' in", line);
      } else if ((key = this.normalizeKey(splitLine[1])) in registry) {
        delete registry[key];
      } else {
        console.log("Unmapping:", key, "has not been mapped.");
      }
    }
  },

commandGroups: {
  pageNavigation: ["scrollDown", "scrollUp", "scrollLeft", "scrollRight", "scrollToTop"
    , "scrollToBottom", "scrollToLeft", "scrollToRight", "scrollPageDown", "scrollPageUp"
    , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight"
    , "scrollFullPageUp", "scrollFullPageDown", "reload", "reloadTab", "reloadGivenTab"
    , "toggleViewSource"
    , "copyCurrentUrl", "copyCurrentTitle", "switchFocus", "simBackspace"
    , "LinkHints.activateModeToCopyLinkUrl", "LinkHints.activateModeToCopyLinkText"
    , "openCopiedUrlInCurrentTab", "openCopiedUrlInNewTab", "goUp", "goToRoot"
    , "focusInput", "LinkHints.activateMode", "LinkHints.activateModeToOpenInNewTab"
    , "LinkHints.activateModeToOpenInNewForegroundTab", "LinkHints.activateModeWithQueue"
    , "LinkHints.activateModeToDownloadImage", "LinkHints.activateModeToOpenImage"
    , "LinkHints.activateModeToDownloadLink", "LinkHints.activateModeToOpenIncognito"
    , "LinkHints.activateModeToHover", "LinkHints.activateModeToLeave", "LinkHints.unhoverLast"
    , "LinkHints.activateModeToSearchLinkText", "LinkHints.activateModeToOpenVomnibar"
    , "goPrevious", "goNext", "nextFrame", "mainFrame"
    , "enterInsertMode"
    , "Marks.activateCreateMode", "Marks.activateGotoMode"
    , "Marks.clearLocal", "clearGlobalMarks", "openUrl", "focusOrLaunch"
    ],
  vomnibarCommands: ["Vomnibar.activate", "Vomnibar.activateInNewTab"
    , "Vomnibar.activateBookmarks", "Vomnibar.activateBookmarksInNewTab", "Vomnibar.activateHistory"
    , "Vomnibar.activateHistoryInNewTab", "Vomnibar.activateTabSelection"],
  historyNavigation: ["goBack", "goForward", "reopenTab"],
  findCommands: ["enterFindMode", "performFind", "performBackwardsFind"],
  tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab", "duplicateTab"
    , "removeTab", "removeRightTab", "restoreTab", "restoreGivenTab", "moveTabToNextWindow"
    , "moveTabToNewWindow", "moveTabToIncognito", "togglePinTab"
    , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
    , "enableCSTemp", "toggleCS", "clearCS"],
  misc: ["showHelp", "autoCopy", "autoOpen", "searchAs", "toggleLinkHintCharacters"
    , "toggleSwitchTemp", "debugBackground", "blank"]
},
advancedCommands: ["scrollToLeft", "scrollToRight", "moveTabToNextWindow"
  , "moveTabToNewWindow", "moveTabToIncognito", "reloadGivenTab", "focusOrLaunch"
  , "goUp", "goToRoot", "focusInput", "LinkHints.activateModeWithQueue", "enableCSTemp"
  , "toggleCS", "clearCS", "LinkHints.activateModeToDownloadImage", "reopenTab"
  , "LinkHints.activateModeToOpenImage", "searchAs", "removeRightTab"
  , "LinkHints.activateModeToDownloadLink", "restoreGivenTab"
  , "LinkHints.activateModeToOpenIncognito"
  , "goNext", "goPrevious", "Marks.clearLocal", "Marks.clearGlobal"
  , "moveTabLeft", "moveTabRight", "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs"
  , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight", "debugBackground", "blank"
  , "LinkHints.activateModeToHover", "LinkHints.unhoverLast"
  , "toggleLinkHintCharacters", "toggleSwitchTemp", "LinkHints.activateModeToLeave"
],
defaultKeyMappings: {
  "?": "showHelp",
  j: "scrollDown",
  k: "scrollUp",
  h: "scrollLeft",
  l: "scrollRight",
  gg: "scrollToTop",
  G: "scrollToBottom",
  zH: "scrollToLeft",
  zL: "scrollToRight",
  "<c-e>": "scrollDown",
  "<c-y>": "scrollUp",
  d: "scrollPageDown",
  u: "scrollPageUp",
  r: "reload",
  R: "reloadTab",
  "<a-r>": "reloadGivenTab",
  "<a-R>": "reopenTab",
  gs: "toggleViewSource",
  i: "enterInsertMode",
  H: "goBack",
  L: "goForward",
  gu: "goUp",
  gU: "goToRoot",
  gi: "focusInput",
  f: "LinkHints.activateMode",
  F: "LinkHints.activateModeToOpenInNewTab",
  "<a-f>": "LinkHints.activateModeWithQueue",
  "/": "enterFindMode",
  n: "performFind",
  N: "performBackwardsFind",
  "[[": "goPrevious",
  "]]": "goNext",
  yy: "copyCurrentUrl",
  yf: "LinkHints.activateModeToCopyLinkUrl",
  p: "openCopiedUrlInCurrentTab",
  P: "openCopiedUrlInNewTab",
  K: "nextTab",
  J: "previousTab",
  gt: "nextTab",
  gT: "previousTab",
  "<<": "moveTabLeft",
  ">>": "moveTabRight",
  g0: "firstTab",
  "g$": "lastTab",
  W: "moveTabToNextWindow",
  t: "createTab",
  yt: "duplicateTab",
  x: "removeTab",
  X: "restoreTab",
  "<a-p>": "togglePinTab",
  o: "Vomnibar.activate",
  O: "Vomnibar.activateInNewTab",
  T: "Vomnibar.activateTabSelection",
  b: "Vomnibar.activateBookmarks",
  B: "Vomnibar.activateBookmarksInNewTab",
  gf: "nextFrame",
  gF: "mainFrame",
  "<f1>": "simBackspace",
  "<F1>": "switchFocus",
  "<f2>": "switchFocus",
  m: "Marks.activateCreateMode",
  "`": "Marks.activateGotoMode"
},

availableCommands: {
  showHelp: [ "Show help", 1, false ],
  debugBackground: [ "Debug the background page", 1, true ],
  blank: [ "Do nothing", 1, true ],
  toggleLinkHintCharacters: [ "Toggle the other link hints (use value)", 1, false ],
  toggleSwitchTemp: [ "Toggle switch only in currnet page (use key[, value])", 1, false ],
  scrollDown: [ "Scroll down", 0, false ],
  scrollUp: [ "Scroll up", 0, false ],
  scrollLeft: [ "Scroll left", 0, false ],
  scrollRight: [ "Scroll right", 0, false ],
  scrollPxDown: [ "Scroll 1px down", 0, false ],
  scrollPxUp: [ "Scroll 1px up", 0, false ],
  scrollPxLeft: [ "Scroll 1px left", 0, false ],
  scrollPxRight: [ "Scroll 1px right", 0, false ],
  scrollToTop: [ "Scroll to the top of the page", 1, false ],
  scrollToBottom: [ "Scroll to the bottom of the page", 1, false ],
  scrollToLeft: [ "Scroll all the way to the left", 1, false ],
  scrollToRight: [ "Scroll all the way to the right", 1, false ],
  scrollPageDown: [ "Scroll a page down", 0, false ],
  scrollPageUp: [ "Scroll a page up", 0, false ],
  scrollFullPageDown: [ "Scroll a full page down", 0, false ],
  scrollFullPageUp: [ "Scroll a full page up", 0, false ],
  reload: [ "Reload current frame", 1, false ],
  reloadTab: [ "Reload N tab(s)", 20, true ],
  reloadGivenTab: [ "Reload N-th tab", 0, true ],
  reopenTab: [ "Reopen current page", 1, true ],
  toggleViewSource: [ "View page source", 1, true ],
  copyCurrentTitle: [ "Copy current tab's title", 1, true ],
  copyCurrentUrl: [ "Copy current page's URL (use frame=false)", 1, true ],
  autoCopy: [ "Copy selected text or current frame's title or url (use url=false)", 1, false ],
  autoOpen: [ "Open selected or copied text in a new tab", 1, false ],
  searchAs: [ "Search selected or copied text using current search engine", 1, false ],
  "LinkHints.activateModeToCopyLinkUrl": [ "Copy a link URL to the clipboard", 1, false ],
  "LinkHints.activateModeToCopyLinkText": [ "Copy a link text to the clipboard", 1, false ],
  "LinkHints.activateModeToSearchLinkText": [ "Open or search a link text", 1, false ],
  "LinkHints.activateModeToOpenVomnibar": [ "Edit a link text on Vomnibar (use url=false)", 1, false ],
  openCopiedUrlInCurrentTab: [ "Open the clipboard's URL in the current tab", 1, true ],
  openCopiedUrlInNewTab: [ "Open the clipboard's URL in N new tab(s)", 20, true ],
  enterInsertMode: [ "Enter insert mode (use code=27, stat=0)", 1, false ],
  focusInput: [ "Focus the first text box on the page. Cycle between them using tab", 0, false ],
  "LinkHints.activateMode": [ "Open a link in the current tab", 1, false ],
  "LinkHints.activateModeToOpenInNewTab": [ "Open a link in a new tab", 1, false ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ "Open a link in a new tab &amp; switch to it", 1, false ],
  "LinkHints.activateModeWithQueue": [ "Open multiple links in a new tab", 1, false ],
  "LinkHints.activateModeToOpenIncognito": [ "Open a link in incognito window", 1, false ],
  "LinkHints.activateModeToDownloadImage": [ "Download &lt;img> image", 1, false ],
  "LinkHints.activateModeToOpenImage": [ "Show &lt;img> image in new extension's tab", 1, false ],
  "LinkHints.activateModeToDownloadLink": [ "Download link url", 1, false ],
  "LinkHints.activateModeToHover": [ "select an element and hover", 1, false ],
  "LinkHints.activateModeToLeave": [ "let mouse leave link", 1, false ],
  "LinkHints.unhoverLast": [ "Stop hovering at last location", 1, false ],
  enterFindMode: [ "Enter find mode", 1, false ],
  performFind: [ "Cycle forward to the next find match", 0, false ],
  performBackwardsFind: [ "Cycle backward to the previous find match", 0, false ],
  switchFocus: [ "blur activeElement or refocus it", 1, false ],
  simBackspace: [ "simulate backspace for once if focused", 1, false ],
  goPrevious: [ "Follow the link labeled previous or &lt;", 1, false ],
  goNext: [ "Follow the link labeled next or >", 1, false ],
  goBack: [ "Go back in history", 0, false ],
  goForward: [ "Go forward in history", 0, false ],
  goUp: [ "Go up the URL hierarchy", 0, false ],
  goToRoot: [ "Go to root of current URL hierarchy", 1, true ],
  nextTab: [ "Go one tab right", 0, true ],
  previousTab: [ "Go one tab left", 0, true ],
  firstTab: [ "Go to the first N-th tab", 1, true ],
  lastTab: [ "Go to the last N-th tab", 1, true ],
  createTab: [ "Create new tab(s)", 20, true ],
  duplicateTab: [ "Duplicate current tab for N times", 20, true ],
  removeTab: [ "Close N tab(s)", chrome.sessions.MAX_SESSION_RESULTS, true ],
  removeRightTab: [ "Close N-th tab on the right", 0, true ],
  restoreTab: [ "Restore closed tab(s)", chrome.sessions.MAX_SESSION_RESULTS, true ],
  restoreGivenTab: [ "Restore the last N-th tab", 0, true ],
  moveTabToNewWindow: [ "Move tab to new window", 1, true ],
  moveTabToNextWindow: [ "Move tab to next window", 1, true ],
  moveTabToIncognito: [ "Make tab in a incognito window", 1, true ],
  togglePinTab: [ "Pin/unpin current tab", 20, true ],
  closeTabsOnLeft: [ "Close tabs on the left", 0, true ],
  closeTabsOnRight: [ "Close tabs on the right", 0, true ],
  closeOtherTabs: [ "Close all other tabs", 1, true ],
  moveTabLeft: [ "Move tab to the left", 0, true ],
  moveTabRight: [ "Move tab to the right", 0, true ],
  enableCSTemp: [ "enable the site's CS temporarily (use type)", 1, true ],
  toggleCS: [ "turn on/off the site's CS (use type)", 1, true ],
  clearCS: [ "clear extension's content settings (use type)", 1, true ],
  "Vomnibar.activate": [
    "Open URL, bookmark, or history entry<br/> (use keyword='', url=false/&lt;string>)", 1, false ],
  "Vomnibar.activateInNewTab": [
    "Open URL, bookmark, history entry,<br/> in a new tab (use url=false/&lt;string>)", 1, false ],
  "Vomnibar.activateTabSelection": [ "Search through your open tabs", 1, false ],
  "Vomnibar.activateBookmarks": [ "Open a bookmark", 1, false ],
  "Vomnibar.activateBookmarksInNewTab": [ "Open a bookmark in a new tab", 1, false ],
  "Vomnibar.activateHistory": [ "Open a history", 1, false ],
  "Vomnibar.activateHistoryInNewTab": [ "Open a history in a new tab", 1, false ],
  nextFrame: [ "Cycle forward to the next frame on the page", 0, true ],
  mainFrame: [ "Select the tab's main/top frame", 1, true ],
  "Marks.activateCreateMode": [ "Create a new mark", 1, false ],
  "Marks.activateGotoMode": [ "Go to a mark", 1, false ],
  "Marks.clearLocal": [ "Remove all local marks for this site", 1, false ],
  clearGlobalMarks: [ "Remove all global marks", 1, true ],
  openUrl: [ "open url (use url, newTab=true)", 20, true ],
  focusOrLaunch: [ 'focus a tab with arg "url" or open it', 1, true ]
}
};

setTimeout(function() {
  Object.setPrototypeOf(Commands.commandGroups, null);
  Object.setPrototypeOf(Commands.defaultKeyMappings, null);
  Object.setPrototypeOf(Commands.availableCommands, null);
  Commands.parseKeyMappings(Settings.get("keyMappings"));
  setTimeout(Settings.updateHooks.PopulateCommandKeys, 3);
}, 67);