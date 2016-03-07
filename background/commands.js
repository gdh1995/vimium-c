"use strict";
var Commands = {
  // NOTE: [^\s] is for spliting passed keys
  keyRe: /<(?:.-){0,3}.[^>]*>|./g,
  keyToCommandRegistry: null,
  setKeyRe: function(keyReSource) {
    this.keyRe = new RegExp(keyReSource, "g");
  },
  getOptions: function(item) {
    var opt = {}, i, len, ind, str, val;
    for (i = 3, len = item.length; i < len; ) {
      str = item[i++];
      ind = str.indexOf("=");
      if (ind === 0) {
        console.log("missing option key:", str);
        continue;
      } else if (ind < 0) {
        opt[str] = true;
      } else {
        val = str.substring(ind + 1);
        str = str.substring(0, ind);
        opt[str] = val && this.Parse(val);
      }
    }
    return str ? opt : null;
  },
  Parse: function(val) {
    try {
      val = JSON.parse(val);
    } catch (e) {}
    return val;
  },
  makeCommand: function(command, options, details) {
    var opt;
    details || (details = this.availableCommands[command]);
    opt = details[3];
    if (options) {
      opt && Utils.extendIf(options, opt);
      if (options.count == null) {}
      else if (details[1] === 1 || (options.count |= 0) <= 0) {
        delete options.count;
      }
    } else {
      options = opt;
    }
    return {
      alias: details[4] || null,
      background: details[2],
      command: command,
      options: options || null,
      repeat: details[1]
    };
  },
  loadDefaults: function() {
    var defaultMap = this.defaultKeyMappings, registry = this.keyToCommandRegistry
      , key;
    for (key in defaultMap) {
      registry[key] = this.makeCommand(defaultMap[key]);
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
          registry[splitLine[1]] =
            this.makeCommand(key, this.getOptions(splitLine), details);
        } else {
          console.log("Command %c" + key, "color:red;", "doesn't exist!");
        }
      } else if (key === "unmapAll") {
        registry = this.keyToCommandRegistry = Object.create(null);
      } else if (key !== "unmap" || splitLine.length !== 2) {
        console.log("Unknown mapping command: '" + key + "' in", line);
      } else if ((key = splitLine[1]) in registry) {
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
    , "focusInput", "LinkHints.activate", "LinkHints.activateModeToOpenInNewTab"
    , "LinkHints.activateModeToOpenInNewForegroundTab", "LinkHints.activateModeWithQueue"
    , "LinkHints.activateModeToDownloadImage", "LinkHints.activateModeToOpenImage"
    , "LinkHints.activateModeToDownloadLink", "LinkHints.activateModeToOpenIncognito"
    , "LinkHints.activateModeToHover", "LinkHints.activateModeToLeave", "LinkHints.unhoverLast"
    , "LinkHints.activateModeToSearchLinkText", "LinkHints.activateModeToOpenVomnibar"
    , "goPrevious", "goNext", "nextFrame", "mainFrame"
    , "enterInsertMode"
    , "Marks.activateCreateMode", "Marks.activate"
    , "Marks.clearLocal", "clearGlobalMarks", "openUrl", "focusOrLaunch"
    ],
  vomnibarCommands: ["Vomnibar.activate", "Vomnibar.activateInNewTab"
    , "Vomnibar.activateBookmarks", "Vomnibar.activateBookmarksInNewTab", "Vomnibar.activateHistory"
    , "Vomnibar.activateHistoryInNewTab", "Vomnibar.activateTabSelection"],
  historyNavigation: ["goBack", "goForward", "reopenTab"],
  findCommands: ["enterFindMode", "performFind", "performBackwardsFind"],
  tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab", "duplicateTab"
    , "removeTab", "removeRightTab", "restoreTab", "restoreGivenTab", "moveTabToNextWindow"
    , "moveTabToNewWindow", "moveTabToIncognito", "togglePinTab", "visitPreviousTab"
    , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
    , "enableCSTemp", "toggleCS", "clearCS"],
  misc: ["showHelp", "autoCopy", "autoOpen", "searchAs", "toggleLinkHintCharacters"
    , "toggleSwitchTemp", "passNextKey", "debugBackground", "blank"]
},
advancedCommands: ["scrollToLeft", "scrollToRight", "moveTabToNextWindow"
  , "moveTabToNewWindow", "moveTabToIncognito", "reloadGivenTab", "focusOrLaunch"
  , "goUp", "goToRoot", "focusInput", "LinkHints.activateModeWithQueue", "enableCSTemp"
  , "toggleCS", "clearCS", "LinkHints.activateModeToDownloadImage", "reopenTab"
  , "LinkHints.activateModeToOpenImage", "searchAs", "removeRightTab"
  , "LinkHints.activateModeToDownloadLink", "restoreGivenTab"
  , "LinkHints.activateModeToOpenIncognito", "passNextKey"
  , "goNext", "goPrevious", "Marks.clearLocal", "Marks.clearGlobal"
  , "moveTabLeft", "moveTabRight", "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs"
  , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight", "debugBackground", "blank"
  , "LinkHints.activateModeToHover", "LinkHints.unhoverLast"
  , "toggleLinkHintCharacters", "toggleSwitchTemp", "LinkHints.activateModeToLeave"
],
defaultKeyMappings: {
  __proto__: null,
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
  f: "LinkHints.activate",
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
  "^": "visitPreviousTab",
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
  "`": "Marks.activate"
},

availableCommands: {
  __proto__: null,
  showHelp: [ "Show help", 1, false ],
  debugBackground: [ "Debug the background page", 1, true,
    { reuse: true, url: "chrome://extensions/?id=" + chrome.runtime.id }, "openUrl" ],
  blank: [ "Do nothing", 1, true ],
  toggleLinkHintCharacters: [ "Toggle the other link hints (use value)", 1, false ],
  toggleSwitchTemp: [ "Toggle switch only in currnet page (use key[, value])", 1, false ],
  scrollDown: [ "Scroll down", 0, false, null, "scrollBy" ],
  scrollUp: [ "Scroll up", 0, false, { dir: -1 }, "scrollBy" ],
  scrollLeft: [ "Scroll left", 0, false, { dir: -1, axis: "x" }, "scrollBy" ],
  scrollRight: [ "Scroll right", 0, false, { axis: "x" }, "scrollBy" ],
  scrollPxDown: [ "Scroll 1px down", 0, false, { view: 1 }, "scrollBy" ],
  scrollPxUp: [ "Scroll 1px up", 0, false, { dir: -1, view: 1 }, "scrollBy" ],
  scrollPxLeft: [ "Scroll 1px left", 0, false, { dir: -1, axis: "x", view: 1 }, "scrollBy" ],
  scrollPxRight: [ "Scroll 1px right", 0, false, { axis: "x", view: 1 }, "scrollBy" ],
  scrollTo: [ "Scroll to custom position", 0, false ],
  scrollToTop: [ "Scroll to the top of the page", 0, false, null, "scrollTo" ],
  scrollToBottom: [ "Scroll to the bottom of the page", 1, false, { dest: "max" }, "scrollTo" ],
  scrollToLeft: [ "Scroll all the way to the left", 1, false, { axis: "x" }, "scrollTo" ],
  scrollToRight: [ "Scroll all the way to the right", 1, false, { axis: "x", dest: "max" }, "scrollTo" ],
  scrollPageDown: [ "Scroll a page down", 0, false, { dir: 0.5, view: "viewSize" }, "scrollBy" ],
  scrollPageUp: [ "Scroll a page up", 0, false, { dir: -0.5, view: "viewSize" }, "scrollBy" ],
  scrollFullPageDown: [ "Scroll a full page down", 0, false, { view: "viewSize" }, "scrollBy" ],
  scrollFullPageUp: [ "Scroll a full page up", 0, false, { dir: -1, view: "viewSize" }, "scrollBy" ],
  reload: [ "Reload current frame", 1, false ],
  reloadTab: [ "Reload N tab(s)", 20, true ],
  reloadGivenTab: [ "Reload N-th tab", 0, true ],
  reopenTab: [ "Reopen current page", 1, true ],
  toggleViewSource: [ "View page source", 1, true ],
  copyCurrentTitle: [ "Copy current tab's title", 1, true, { type: "title" }, "copyTabInfo" ],
  copyCurrentUrl: [ "Copy page's info (use type=url/frame/title)", 1, true, null, "copyTabInfo" ],
  autoCopy: [ "Copy selected text or current frame's title or url (use url=false)", 1, false ],
  autoOpen: [ "Open selected or copied text in a new tab", 1, false ],
  searchAs: [ "Search selected or copied text using current search engine", 1, false ],
  "LinkHints.activateModeToCopyLinkUrl": [ "Copy a link URL to the clipboard", 0, false,
    { mode: "COPY_LINK_URL" }, "LinkHints.activate" ],
  "LinkHints.activateModeToCopyLinkText": [ "Copy a link text to the clipboard", 0, false,
    { mode: "COPY_TEXT" }, "LinkHints.activate" ],
  "LinkHints.activateModeToSearchLinkText": [ "Open or search a link text", 0, false,
    { mode: "SEARCH_TEXT" }, "LinkHints.activate" ],
  "LinkHints.activateModeToOpenVomnibar": [ "Edit a link text on Vomnibar (use url=false)", 1, false,
    { mode: "EDIT_TEXT" }, "LinkHints.activate" ],
  openCopiedUrlInCurrentTab: [ "Open the clipboard's URL in the current tab", 1, true ],
  openCopiedUrlInNewTab: [ "Open the clipboard's URL in N new tab(s)", 20, true ],
  enterInsertMode: [ "Enter insert mode (use code=27, stat=0)", 1, false ],
  passNextKey: [ "Pass the next key(s) to Chrome", 0, false ],
  focusInput: [ "Focus the first text box on the page. Cycle between them using tab", 0, false ],
  "LinkHints.activate": [ "Open a link in the current tab", 0, false, { mode: "OPEN_IN_CURRENT_TAB" } ],
  "LinkHints.activateModeToOpenInNewTab": [ "Open a link in a new tab", 0, false,
    { mode: "OPEN_IN_NEW_BG_TAB" }, "LinkHints.activate" ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ "Open a link in a new tab &amp; switch to it", 0, false,
    { mode: "OPEN_IN_NEW_FG_TAB" }, "LinkHints.activate" ],
  "LinkHints.activateModeWithQueue": [ "Open multiple links in a new tab", 0, false,
    { mode: "OPEN_WITH_QUEUE" }, "LinkHints.activate" ],
  "LinkHints.activateModeToOpenIncognito": [ "Open a link in incognito window", 0, false,
    { mode: "OPEN_INCOGNITO_LINK" }, "LinkHints.activate" ],
  "LinkHints.activateModeToDownloadImage": [ "Download &lt;img> image", 0, false,
    { mode: "DOWNLOAD_IMAGE" }, "LinkHints.activate" ],
  "LinkHints.activateModeToOpenImage": [ "Show &lt;img> image in new extension's tab", 0, false,
    { mode: "OPEN_IMAGE" }, "LinkHints.activate" ],
  "LinkHints.activateModeToDownloadLink": [ "Download link url", 0, false,
    { mode: "DOWNLOAD_LINK" }, "LinkHints.activate" ],
  "LinkHints.activateModeToHover": [ "select an element and hover", 0, false,
    { mode: "HOVER" }, "LinkHints.activate" ],
  "LinkHints.activateModeToLeave": [ "let mouse leave link", 0, false,
    { mode: "LEAVE" }, "LinkHints.activate" ],
  "LinkHints.unhoverLast": [ "Stop hovering at last location", 0, false ],
  enterFindMode: [ "Enter find mode", 1, false ],
  performFind: [ "Cycle forward to the next find match", 0, false ],
  performBackwardsFind: [ "Cycle backward to the previous find match", 0, false, { dir: -1 }, "performFind" ],
  switchFocus: [ "blur activeElement or refocus it", 1, false ],
  simBackspace: [ "simulate backspace for once if focused", 1, false ],
  goPrevious: [ "Follow the link labeled previous or &lt;", 1, false, { dir: "prev" }, "goNext" ],
  goNext: [ "Follow the link labeled next or >", 1, false ],
  goBack: [ "Go back in history", 0, false ],
  goForward: [ "Go forward in history", 0, false, { dir: 1 }, "goBack" ],
  goUp: [ "Go up the URL hierarchy", 0, false ],
  goToRoot: [ "Go to root of current URL hierarchy", 1, true ],
  nextTab: [ "Go one tab right", 0, true, null, "gotoTab" ],
  previousTab: [ "Go one tab left", 0, true, { dir: -1 }, "gotoTab" ],
  visitPreviousTab: [ "Go to previously-visited tab on current window", 0, true ],
  firstTab: [ "Go to the first N-th tab", 0, true, { absolute: true }, "gotoTab" ],
  lastTab: [ "Go to the last N-th tab", 0, true, { dir: -1, absolute: true }, "gotoTab" ],
  createTab: [ "Create new tab(s)", 20, true ],
  duplicateTab: [ "Duplicate current tab for N times", 20, true ],
  removeTab: [ "Close N tab(s)", chrome.sessions ? chrome.sessions.MAX_SESSION_RESULTS : 25, true ],
  removeRightTab: [ "Close N-th tab on the right", 0, true ],
  restoreTab: [ "Restore closed tab(s)", chrome.sessions ? chrome.sessions.MAX_SESSION_RESULTS : 25, true ],
  restoreGivenTab: [ "Restore the last N-th tab", 0, true ],
  moveTabToNewWindow: [ "Move N tab(s) to new window", 20, true ],
  moveTabToNextWindow: [ "Move tab to next window", 1, true ],
  moveTabToIncognito: [ "Make tab in a incognito window", 1, true ],
  togglePinTab: [ "Pin/unpin current tab", 20, true ],
  closeTabsOnLeft: [ "Close tabs on the left", 0, true, { dir: -1 }, "closeTabs" ],
  closeTabsOnRight: [ "Close tabs on the right", 0, true, { dir: 1 }, "closeTabs" ],
  closeOtherTabs: [ "Close all other tabs", 1, true, null, "closeTabs" ],
  moveTabLeft: [ "Move tab to the left", 0, true, null, "moveTab" ],
  moveTabRight: [ "Move tab to the right", 0, true, { dir: 1 }, "moveTab" ],
  enableCSTemp: [ "enable the site's CS temporarily (use type=images)", 1, true, { type: "images" } ],
  toggleCS: [ "turn on/off the site's CS (use type=images)", 1, true, { type: "images" } ],
  clearCS: [ "clear extension's content settings (use type=images)", 1, true, { type: "images" } ],
  "Vomnibar.activate": [
    "Open URL, bookmark, or history entry<br/> (use keyword='', url=false/&lt;string>)", 1, false ],
  "Vomnibar.activateInNewTab": [
    "Open URL, history, etc,<br/> in a new tab (use keyword, url)", 1, false,
    { force: true }, "Vomnibar.activate" ],
  "Vomnibar.activateTabSelection": [ "Search through your open tabs", 1, false,
    { mode: "tabs", first: true, force: true }, "Vomnibar.activate" ],
  "Vomnibar.activateBookmarks": [ "Open a bookmark", 1, false,
    { mode: "bookmarks", first: true }, "Vomnibar.activate" ],
  "Vomnibar.activateBookmarksInNewTab": [ "Open a bookmark in a new tab", 1, false,
    { mode: "bookmarks", first: true, force: true }, "Vomnibar.activate" ],
  "Vomnibar.activateHistory": [ "Open a history", 1, false,
    { mode: "history", first: true }, "Vomnibar.activate" ],
  "Vomnibar.activateHistoryInNewTab": [ "Open a history in a new tab", 1, false,
    { mode: "history", first: true, force: true }, "Vomnibar.activate" ],
  nextFrame: [ "Cycle forward to the next frame on the page", 0, true ],
  mainFrame: [ "Select the tab's main/top frame", 1, true ],
  "Marks.activateCreateMode": [ "Create a new mark", 1, false, { mode: "create" }, "Marks.activate" ],
  "Marks.activate": [ "Go to a mark", 1, false ],
  "Marks.clearLocal": [ "Remove all local marks for this site", 1, false ],
  clearGlobalMarks: [ "Remove all global marks", 1, true ],
  openUrl: [ "open url (use url, reuse=[-2..1])", 20, true ],
  focusOrLaunch: [ 'focus a tab with arg "url" or open it', 1, true, { reuse: 1 }, "openUrl" ]
}
};

setTimeout(function() {
  Commands.parseKeyMappings(Settings.get("keyMappings"));
  setTimeout(Settings.updateHooks.PopulateCommandKeys, 3);
}, 67);