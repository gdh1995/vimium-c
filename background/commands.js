"use strict";
var Commands = {
  setKeyRe: function(keyReSource) {
    Utils.keyRe = new RegExp(keyReSource, "g");
  },
  getOptions: function(item) {
    var opt, i = 3, len = item.length, ind, str, val;
    if (len <= i) { return null; }
    opt = Object.create(null);
    while (i < len) {
      str = item[i++];
      ind = str.indexOf("=");
      if (ind === 0) {
        console.log("missing option key:", str);
      } else if (ind < 0) {
        opt[str] = true;
      } else {
        val = str.substring(ind + 1);
        str = str.substring(0, ind);
        opt[str] = val && this.parseVal(val);
      }
    }
    return str ? opt : null;
  },
  hexCharRe: /\\(?:x([\da-z]{2})|\\)/gi,
  parseVal: function(val) {
    try {
      return JSON.parse(val);
    } catch(e) {}
    if (!val.startsWith('"')) { return val; }
    val = val.replace(this.hexCharRe, this.onHex);
    try {
      return JSON.parse(val);
    } catch(e) {}
    return val;
  },
  onHex: function(s, hex) {
    return hex ? "\\u00" + hex : '\\\\';
  },
  loadDefaults: function() {
    var defaultMap = this.defaultKeyMappings, registry = CommandsData.keyToCommandRegistry
      , pair, i = defaultMap.length;
    while (0 <= --i) {
      pair = defaultMap[i];
      registry[pair[0]] = Utils.makeCommand(pair[1]);
    }
  },
  parseKeyMappings: (function(line) {
    var key, lines, splitLine, mk = 0, _i = 0, _len, mkReg, registry, details, available;
    registry = CommandsData.keyToCommandRegistry = Object.create(null);
    mkReg = Object.create(null);
    available = CommandsData.availableCommands;
    lines = line.replace(/\\\n/g, "").replace(/[\t ]+/g, " ").split("\n");
    lines[0] !== "unmapAll" ? this.loadDefaults() : ++_i;
    for (_len = lines.length; _i < _len; _i++) {
      line = lines[_i].trim();
      if (!(line.charCodeAt(0) > 35)) { continue; } // mask: /[!"#]/
      splitLine = line.split(" ");
      key = splitLine[0];
      if (key === "map") {
        if (splitLine.length < 3) {
          console.log("Lacking command when mapping %c" + key + "", "color:red;");
        } else if (!(details = available[key = splitLine[2]])) {
          console.log("Command %c" + key, "color:red;", "doesn't exist!");
        } else if (splitLine[1] in registry) {
          console.log("Key %c" + splitLine[1], "color:red;",
             "has been mapped to", registry[splitLine[1]].command);
        } else {
          registry[splitLine[1]] =
            Utils.makeCommand(key, this.getOptions(splitLine), details);
        }
      } else if (key === "unmapAll") {
        registry = CommandsData.keyToCommandRegistry = Object.create(null);
        mkReg = Object.create(null), mk = 0;
      } else if (key === "mapkey" || key === "mapKey") {
        if (splitLine.length !== 3) {
          console.log("MapKey needs both source and target keys:", line);
        } else if ((key = splitLine[1]).length > 1 && key.match(Utils.keyRe).length > 1
          || splitLine[2].length > 1 && splitLine[2].match(Utils.keyRe).length > 1) {
          console.log("MapKey: a source / target key should be a single key:", line);
        } else if (key in mkReg) {
          console.log("This key %c" + key, "color:red;",
             "has been mapped to another key:", mkReg[key]);
        } else {
          mkReg[key] = splitLine[2];
          mk++;
        }
      } else if (key !== "unmap") {
        console.log("Unknown mapping command: '" + key + "' in", line);
      } else if (splitLine.length !== 2) {
        console.log("Unmap needs one mapped key:", line);
      } else if ((key = splitLine[1]) in registry) {
        delete registry[key];
      } else {
        console.log("Unmapping: %c" + key, "color:red;", "has not been mapped.");
      }
    }
    CommandsData.mapKeyRegistry = mk > 0 ? mkReg : null;
  }),
  populateCommandKeys: (function() {
    var key, ref, ref2, arr, keyRe = Utils.keyRe, ch, j, last, tmp, func;
    ref = Object.create(null);
    for (ch = 10; 0 <= --ch; ) { ref[ch] = 1; }
    for (key in CommandsData.keyToCommandRegistry) {
      ch = key.charCodeAt(0);
      if (ch >= 48 && ch < 58) {
        console.warn("invalid key command:", key, "(the first char can not be [0-9])");
        continue;
      }
      arr = key.match(keyRe);
      if (arr.length === 1) {
        if (key in ref) {
          console.log("inactive keys:", ref[key], "with", key);
        } else {
          ref[key] = 0;
        }
        continue;
      }
      for (ref2 = tmp = ref, j = 0, last = arr.length - 1; j <= last; j++, ref2 = tmp) {
        tmp = ref2[arr[j]];
        if (!tmp || j === last) {
          tmp === 0 && console.warn("inactive key:", key, "with"
              , arr.slice(0, j + 1).join(""));
          break;
        }
      }
      if (tmp === 0) { continue; }
      tmp != null && console.warn("inactive keys:", tmp, "with", key);
      while (j < last) { ref2 = ref2[arr[j++]] = Object.create(null); }
      ref2[arr[last]] = 0;
    }

    func = function(obj) {
      var key, val;
      for (key in obj) {
        val = obj[key];
        if (val !== 0) { func(val); }
        else if (ref[key] === 0) { delete obj[key]; }
      }
    };
    for (key in ref) {
      ref2 = ref[key];
      if (ref2 !== 0 && ref2 !== 1) { func(ref2); }
    }
    Settings.Init && Settings.Init();
    return ref;
  }),

defaultKeyMappings: [
  ["?", "showHelp"],
  ["j", "scrollDown"],
  ["k", "scrollUp"],
  ["h", "scrollLeft"],
  ["l", "scrollRight"],
  ["gg", "scrollToTop"],
  ["G", "scrollToBottom"],
  ["zH", "scrollToLeft"],
  ["zL", "scrollToRight"],
  ["<c-e>", "scrollDown"],
  ["<c-y>", "scrollUp"],
  ["d", "scrollPageDown"],
  ["u", "scrollPageUp"],
  ["r", "reload"],
  ["R", "reloadTab"],
  ["<a-r>", "reloadGivenTab"],
  ["<a-R>", "reopenTab"],
  ["i", "enterInsertMode"],
  ["v", "enterVisualMode"],
  ["V", "enterVisualLineMode"],
  ["<f8>", "enterVisualMode"],
  ["H", "goBack"],
  ["L", "goForward"],
  ["gu", "goUp"],
  ["gU", "goToRoot"],
  ["gi", "focusInput"],
  ["f", "LinkHints.activate"],
  ["F", "LinkHints.activateModeToOpenInNewTab"],
  ["<a-f>", "LinkHints.activateModeWithQueue"],
  ["/", "enterFindMode"],
  ["n", "performFind"],
  ["N", "performBackwardsFind"],
  ["[[", "goPrevious"],
  ["]]", "goNext"],
  ["yy", "copyCurrentUrl"],
  ["yf", "LinkHints.activateModeToCopyLinkUrl"],
  ["p", "openCopiedUrlInCurrentTab"],
  ["P", "openCopiedUrlInNewTab"],
  ["K", "nextTab"],
  ["J", "previousTab"],
  ["gt", "nextTab"],
  ["gT", "previousTab"],
  ["^", "visitPreviousTab"],
  ["<<", "moveTabLeft"],
  [">>", "moveTabRight"],
  ["g0", "firstTab"],
  ["g$", "lastTab"],
  ["W", "moveTabToNextWindow"],
  ["t", "createTab"],
  ["yt", "duplicateTab"],
  ["x", "removeTab"],
  ["X", "restoreTab"],
  ["<a-p>", "togglePinTab"],
  ["<a-m>", "toggleMuteTab"],
  ["o", "Vomnibar.activate"],
  ["O", "Vomnibar.activateInNewTab"],
  ["T", "Vomnibar.activateTabSelection"],
  ["b", "Vomnibar.activateBookmarks"],
  ["B", "Vomnibar.activateBookmarksInNewTab"],
  ["ge", "Vomnibar.activateEditUrl"],
  ["gE", "Vomnibar.activateEditUrlInNewTab"],
  ["gf", "nextFrame"],
  ["gF", "mainFrame"],
  ["<f1>", "simBackspace"],
  ["<F1>", "switchFocus"],
  ["<f2>", "switchFocus"],
  ["m", "Marks.activateCreateMode"],
  ["`", "Marks.activate"]
]
},
CommandsData = CommandsData || {
  keyToCommandRegistry: null,
  mapKeyRegistry: null,
availableCommands: {
  __proto__: null,
  showHelp: [ "Show help", 1, false ],
  debugBackground: [ "Debug the background page", 1, true,
    { reuse: 1, url: "chrome://extensions/?id=$id", id_marker: "$id" }, "openUrl" ],
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
  reloadTab: [ "Reload N tab(s) (use bypassCache)", 20, true ],
  reloadGivenTab: [ "Reload N-th tab", 0, true, { single: true } ],
  reopenTab: [ "Reopen current page", 1, true ],
  toggleViewSource: [ "View page source", 1, true ],
  copyCurrentTitle: [ "Copy current tab's title", 1, true, { type: "title" }, "copyTabInfo" ],
  copyCurrentUrl: [ "Copy page's info (use type=url/frame/title)", 1, true, null, "copyTabInfo" ],
  autoCopy: [ "Copy selected text or current frame's title or url (use url)", 1, false ],
  autoOpen: [ "Open selected or copied text in a new tab", 1, false ],
  searchAs: [ "Search selected or copied text using current search engine", 1, false ],
  searchInAnother: [ "Redo search in another search engine (use keyword, reuse=0)", 1, true ],
  "LinkHints.activateModeToCopyLinkUrl": [ "Copy a link URL to the clipboard", 0, false,
    { mode: "COPY_LINK_URL" }, "VHints.activate" ],
  "LinkHints.activateModeToCopyLinkText": [ "Copy a link text to the clipboard", 0, false,
    { mode: "COPY_TEXT" }, "VHints.activate" ],
  "LinkHints.activateModeToSearchLinkText": [ "Open or search a link text", 0, false,
    { mode: "SEARCH_TEXT" }, "VHints.activate" ],
  "LinkHints.activateModeToEdit": [ "Select an editable area", 1, false,
    { mode: "FOCUS_EDITABLE" }, "VHints.activate" ],
  "LinkHints.activateModeToOpenVomnibar": [ "Edit a link text on Vomnibar (use url)", 1, false,
    { mode: "EDIT_TEXT" }, "VHints.activate" ],
  openCopiedUrlInCurrentTab: [ "Open the clipboard's URL in the current tab", 1, true ],
  openCopiedUrlInNewTab: [ "Open the clipboard's URL in N new tab(s)", 20, true ],
  enterInsertMode: [ "Enter insert mode (use code=27, stat=0)", 1, true ],
  passNextKey: [ "Pass the next key(s) to the page (use normal)", 0, false ],
  enterVisualMode: [ "Enter visual mode", 1, false ],
  enterVisualLineMode: [ "Enter visual line mode", 1, false, { mode: "line" }, "enterVisualMode" ],
  focusInput: [ "Focus the N-th visible text box on the page and cycle using tab", 0, false ],
  "LinkHints.activate": [ "Open a link in the current tab", 0, false, { mode: "OPEN_IN_CURRENT_TAB" }, "VHints.activate" ],
  "LinkHints.activateModeToOpenInNewTab": [ "Open a link in a new tab", 0, false,
    { mode: "OPEN_IN_NEW_BG_TAB" }, "VHints.activate" ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ "Open a link in a new tab &amp; switch to it", 0, false,
    { mode: "OPEN_IN_NEW_FG_TAB" }, "VHints.activate" ],
  "LinkHints.activateModeWithQueue": [ "Open multiple links in a new tab", 0, false,
    { mode: "OPEN_WITH_QUEUE" }, "VHints.activate" ],
  "LinkHints.activateModeToOpenIncognito": [ "Open a link in incognito window", 0, false,
    { mode: "OPEN_INCOGNITO_LINK" }, "VHints.activate" ],
  "LinkHints.activateModeToDownloadImage": [ "Download &lt;img> image", 0, false,
    { mode: "DOWNLOAD_IMAGE" }, "VHints.activate" ],
  "LinkHints.activateModeToOpenImage": [ "Show &lt;img> image in new extension's tab", 0, false,
    { mode: "OPEN_IMAGE" }, "VHints.activate" ],
  "LinkHints.activateModeToDownloadLink": [ "Download link url", 0, false,
    { mode: "DOWNLOAD_LINK" }, "VHints.activate" ],
  "LinkHints.activateModeToHover": [ "select an element and hover", 0, false,
    { mode: "HOVER" }, "VHints.activate" ],
  "LinkHints.activateModeToLeave": [ "let mouse leave link", 0, false,
    { mode: "LEAVE" }, "VHints.activate" ],
  "LinkHints.unhoverLast": [ "Stop hovering at last location", 0, false, null, "VHints.unhoverLast" ],
  enterFindMode: [ "Enter find mode", 1, true, {active: true}, "performFind" ],
  performFind: [ "Cycle forward to the next find match", 0, true ],
  performBackwardsFind: [ "Cycle backward to the previous find match", 0, true, { dir: -1 }, "performFind" ],
  clearFindHistory: ["Clear find mode history", 1, true],
  switchFocus: [ "blur activeElement or refocus it", 1, false ],
  simBackspace: [ "simulate backspace for once if focused", 1, false ],
  goPrevious: [ "Follow the link labeled previous or &lt;", 1, true, { dir: "prev" }, "goNext" ],
  goNext: [ "Follow the link labeled next or >", 1, true ],
  goBack: [ "Go back in history", 0, false ],
  goForward: [ "Go forward in history", 0, false, { dir: 1 }, "goBack" ],
  goUp: [ "Go up the URL hierarchy (use trailing_slash=null/&lt;boolean>)", 0, false ],
  goToRoot: [ "Go to root of current URL hierarchy", 0, true ],
  nextTab: [ "Go one tab right", 0, true, null, "goTab" ],
  previousTab: [ "Go one tab left", 0, true, { dir: -1 }, "goTab" ],
  visitPreviousTab: [ "Go to previously-visited tab on current window", 0, true ],
  firstTab: [ "Go to the first N-th tab", 0, true, { absolute: true }, "goTab" ],
  lastTab: [ "Go to the last N-th tab", 0, true, { dir: -1, absolute: true }, "goTab" ],
  createTab: [ "Create new tab(s)", 20, true ],
  duplicateTab: [ "Duplicate current tab for N times", 20, true ],
  removeTab: [ "Close N tab(s) (use allow_close)", 25, true ],
  removeRightTab: [ "Close N-th tab on the right", 0, true ],
  restoreTab: [ "Restore closed tab(s)", 25, true ],
  restoreGivenTab: [ "Restore the last N-th tab", 0, true ],
  moveTabToNewWindow: [ "Move N tab(s) to new window", 50, true ],
  moveTabToNextWindow: [ "Move tab to next window", 1, true ],
  moveTabToIncognito: [ "Make tab in a incognito window", 1, true ],
  togglePinTab: [ "Pin or unpin N tab(s)", 50, true ],
  toggleMuteTab: [ "Mute or unmute current tab (use all, other)", 1, true ],
  closeTabsOnLeft: [ "Close tabs on the left", 0, true, { dir: -1 }, "removeTabsR" ],
  closeTabsOnRight: [ "Close tabs on the right", 0, true, { dir: 1 }, "removeTabsR" ],
  closeOtherTabs: [ "Close all other tabs", 1, true, null, "removeTabsR" ],
  moveTabLeft: [ "Move tab to the left", 0, true, null, "moveTab" ],
  moveTabRight: [ "Move tab to the right", 0, true, { dir: 1 }, "moveTab" ],
  enableCSTemp: [ "enable the site's CS temporarily (use type=images)", 0, true, { type: "images" } ],
  toggleCS: [ "turn on/off the site's CS (use type=images)", 0, true, { type: "images" } ],
  clearCS: [ "clear extension's content settings (use type=images)", 1, true, { type: "images" } ],
  "Vomnibar.activate": [
    "Open URL, bookmark, or history entry<br/> (use keyword='', url=false/&lt;string>)", 0, true,
    null, "showVomnibar" ],
  "Vomnibar.activateInNewTab": [
    "Open URL, history, etc,<br/> in a new tab (use keyword, url)", 0, true,
    { force: true }, "showVomnibar" ],
  "Vomnibar.activateTabSelection": [ "Search through your open tabs", 1, true,
    { mode: "tab", force: true }, "showVomnibar" ],
  "Vomnibar.activateBookmarks": [ "Open a bookmark", 1, true,
    { mode: "bookm" }, "showVomnibar" ],
  "Vomnibar.activateBookmarksInNewTab": [ "Open a bookmark in a new tab", 1, true,
    { mode: "bookm", force: true }, "showVomnibar" ],
  "Vomnibar.activateHistory": [ "Open a history", 1, true,
    { mode: "history" }, "showVomnibar" ],
  "Vomnibar.activateHistoryInNewTab": [ "Open a history in a new tab", 1, true,
    { mode: "history", force: true }, "showVomnibar" ],
  "Vomnibar.activateEditUrl": [ "Edit the current URL", 0, true,
    { url: true }, "showVomnibar" ],
  "Vomnibar.activateEditUrlInNewTab": [ "Edit the current URL and open in a new tab", 0, true,
    { url: true, force: true }, "showVomnibar" ],
  nextFrame: [ "Cycle forward to the next frame on the page", 0, true ],
  mainFrame: [ "Select the tab's main/top frame", 1, true ],
  parentFrame: [ "Focus parent frame of the current", 1, true ],
  "Marks.activateCreateMode": [ "Create a new mark", 1, false, { mode: "create" }, "VMarks.activate" ],
  "Marks.activate": [ "Go to a mark (use prefix=true)", 1, false, null, "VMarks.activate" ],
  "Marks.clearLocal": [ "Remove all local marks for this site", 1, false, null, "VMarks.clearLocal" ],
  "Marks.clearGlobal": [ "Remove all global marks", 1, true, null, "clearGlobalMarks" ],
  clearGlobalMarks: [ "Remove all global marks (deprecated)", 1, true ],
  openUrl: [ "open url (use url, reuse=[-2..1])", 20, true ],
  focusOrLaunch: [ 'focus a tab with given url or open it (use url="", prefix)', 1, true, { reuse: 1 }, "openUrl" ]
}
};

if (document.readyState !== "complete") {
  Commands.parseKeyMappings(Settings.get("keyMappings"));
  Commands.defaultKeyMappings = null;
  Settings.postUpdate("PopulateCommandKeys", null);
  Commands = null;
  chrome.commands && chrome.commands.onCommand.addListener(Settings.globalCommand);
} else
(Settings.updateHooks.keyMappings = function(value) {
  Commands.parseKeyMappings(value);
  this.broadcast({
    name: "keyMap",
    mapKeys: CommandsData.mapKeyRegistry,
    keyMap: this.postUpdate("PopulateCommandKeys", null)
  });
});
