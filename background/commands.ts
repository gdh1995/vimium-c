declare var CommandsData: CommandsData;
var Commands = {
  SetKeyRe (this: void, keyReSource: string): void {
    Utils.keyRe_ = new RegExp(keyReSource, "g") as RegExpG & RegExpSearchable<0>;
  },
  getOptions_ (item: string[], start: number): CommandsNS.Options | null {
    let opt: CommandsNS.RawOptions, i = start, len = item.length, ind: number, str: string | undefined, val: string;
    if (len <= i) { return null; }
    opt = Object.create(null);
    while (i < len) {
      str = item[i++];
      ind = str.indexOf("=");
      if (ind === 0 || str === "__proto__") {
        console.log(ind === 0 ? "Missing" : "Unsupported", "option key:", str);
      } else if (ind < 0) {
        opt[str] = true;
      } else {
        val = str.substring(ind + 1);
        str = str.substring(0, ind);
        opt[str] = val && this.parseVal_(val);
      }
    }
    return str ? opt : null;
  },
  hexCharRe: <RegExpGI & RegExpSearchable<1>> /\\(?:x([\da-z]{2})|\\)/gi,
  parseVal_ (val: string): any {
    try {
      return JSON.parse(val);
    } catch(e) {}
    if (!val.startsWith('"')) { return val; }
    val = val.replace(this.hexCharRe, this.onHex_);
    try {
      return JSON.parse(val);
    } catch(e) {}
    return val;
  },
  onHex_ (this: void, _s: string, hex: string): string {
    return hex ? "\\u00" + hex : '\\\\';
  },
  parseKeyMappings_: (function(this: {}, line: string): void {
    let key: string | undefined, lines: string[], splitLine: string[], mk = 0, _i: number
      , _len: number, details: CommandsNS.Description | undefined, errors = 0, ch: number
      , registry = CommandsData.keyToCommandRegistry_ = Object.create<CommandsNS.Item>(null)
      , cmdMap = CommandsData.cmdMap_ = Object.create<CommandsNS.Options | null>(null)
      , userDefinedKeys = Object.create<true>(null)
      , mkReg = Object.create<string>(null);
    const available = CommandsData.availableCommands_;
    lines = line.replace(<RegExpG> /\\\n/g, "").replace(<RegExpG> /[\t ]+/g, " ").split("\n");
    if (lines[0] !== "unmapAll" && lines[0] !== "unmapall") {
      const defaultMap = (this as typeof Commands).defaultKeyMappings_;
      for (_i = defaultMap.length; 0 < _i; ) {
        _i -= 2;
        registry[defaultMap[_i]] = Utils.makeCommand_(defaultMap[_i + 1]);
      }
    } else {
      _i = 1;
    }
    for (_len = lines.length; _i < _len; _i++) {
      line = lines[_i].trim();
      if (!(line.charCodeAt(0) > KnownKey.maxCommentHead)) { continue; } // mask: /[!"#]/
      splitLine = line.split(" ");
      key = splitLine[0];
      if (key === "map") {
        key = splitLine[1] as string | undefined;
        if (!key || key === "__proto__") {
          console.log("Unsupported key sequence %c" + (key || '""'), "color:red", `for "${splitLine[2] || ""}"`);
        } else if (key in userDefinedKeys) {
          console.log("Key %c" + key, "color:red", "has been mapped to", (registry[key] as CommandsNS.Item).command);
        } else if (splitLine.length < 3) {
          console.log("Lacking command when mapping %c" + key, "color:red");
        } else if (!(details = available[splitLine[2]])) {
          console.log("Command %c" + splitLine[2], "color:red", "doesn't exist!");
        } else if ((ch = key.charCodeAt(0)) > KnownKey.maxNotNum && ch < KnownKey.minNotNum) {
          console.log("Invalid key: %c" + key, "color:red", "(the first char can not be '-' or number)");
        } else {
          registry[key] = Utils.makeCommand_(splitLine[2], (this as typeof Commands).getOptions_(splitLine, 3), details);
          userDefinedKeys[key] = true;
          continue;
        }
      } else if (key === "unmapAll" || key === "unmapall") {
        registry = CommandsData.keyToCommandRegistry_ = Object.create(null);
        cmdMap = CommandsData.cmdMap_ = Object.create<CommandsNS.Options | null>(null);
        userDefinedKeys = Object.create<true>(null);
        mkReg = Object.create<string>(null), mk = 0;
        if (errors > 0) {
          console.log("All key mappings is unmapped, but there %s been %c%d error%s%c before this instruction"
            , errors > 1 ? "have" : "has", "color:red", errors, errors > 1 ? "s" : "", "color:auto");
        }
        continue;
      } else if (key === "mapkey" || key === "mapKey") {
        if (splitLine.length !== 3) {
          console.log("MapKey needs both source and target keys:", line);
        } else if ((key = splitLine[1]).length > 1 && (key.match(Utils.keyRe_) as RegExpMatchArray).length > 1
          || splitLine[2].length > 1 && (splitLine[2].match(Utils.keyRe_) as RegExpMatchArray).length > 1) {
          console.log("MapKey: a source / target key should be a single key:", line);
        } else if (key in mkReg) {
          console.log("This key %c" + key, "color:red", "has been mapped to another key:", mkReg[key]);
        } else {
          mkReg[key] = splitLine[2];
          mk++;
          continue;
        }
      } else if (key === "shortcut" || key === "commmand") {
        key = splitLine[1];
        if (splitLine.length < 3) {
          console.log("Lacking command name and options in shortcut:", line);
        } else if (Settings.CONST.GlobalCommands.indexOf(key)) {
          console.log("Shortcut %c" + key, "color:red", "doesn't exist!");
        } else if (key in cmdMap) {
          console.log("Shortcut %c" + key, "color:red", "has been configured");
        } else {
          cmdMap[key] = Utils.makeCommand_(key
            , (this as typeof Commands).getOptions_(splitLine, 2), available[key]).options;
          continue;
        }
      } else if (key !== "unmap") {
        console.log("Unknown mapping command: %c" + key, "color:red", "in", line);
      } else if (splitLine.length !== 2) {
        console.log("Unmap needs one mapped key:", line);
      } else if ((key = splitLine[1]) in registry) {
        delete userDefinedKeys[key];
        delete registry[key];
        continue;
      } else {
        console.log("Unmapping: %c" + key, "color:red", "has not been mapped");
      }
      ++errors;
    }
    CommandsData.mapKeyRegistry_ = mk > 0 ? mkReg : null;
    CommandsData.errors = CommandsData.errors > 0 ? ~errors : errors;
  }),
  populateCommandKeys_: (function(this: void): void {
    const d = CommandsData, ref = d.keyMap_ = Object.create<0 | 1 | ChildKeyMap>(null), keyRe = Utils.keyRe_,
    oldErrors = d.errors;
    if (oldErrors < 0) { d.errors = ~oldErrors; }
    for (let ch = 10; 0 <= --ch; ) { ref[ch] = 1 as 0; }
    ref['-'] = 1;
    for (const key in d.keyToCommandRegistry_) {
      const arr = key.match(keyRe) as RegExpMatchArray, last = arr.length - 1;
      if (last === 0) {
        (key in ref) && Commands.warnInactive_(ref[key] as ReadonlyChildKeyMap, key);
        ref[key] = 0;
        continue;
      }
      let ref2 = ref as ChildKeyMap, tmp: ChildKeyMap | 0 | 1 | undefined = ref2, j = 0;
      while ((tmp = ref2[arr[j]]) && j < last) { j++; ref2 = tmp; }
      if (tmp === 0) {
        Commands.warnInactive_(key, arr.slice(0, j + 1).join(""));
        continue;
      }
      tmp != null && Commands.warnInactive_(tmp, key);
      while (j < last) { ref2 = ref2[arr[j++]] = Object.create(null) as ChildKeyMap; }
      ref2[arr[last]] = 0;
    }
    if (d.errors) {
      console.log("%cKey Mappings: %d errors found.", "background-color:#fffbe6", d.errors);
    } else if (oldErrors < 0) {
      console.log("The new key mappings have no errors");
    }

    const func = function(obj: ChildKeyMap): void {
      for (const key in obj) {
        const val = obj[key] as 0 | ChildKeyMap;
        if (val !== 0) { func(val); }
        else if (ref[key] === 0) { delete obj[key]; }
      }
    };
    for (const key in ref) {
      const tmp = ref[key] as 0 | 1 | ChildKeyMap;
      if (tmp !== 0 && tmp !== 1) { func(tmp); }
    }
  }),
  warnInactive_ (obj: ReadonlyChildKeyMap | string, newKey: string): void {
    console.log("inactive key:", obj, "with", newKey);
    ++CommandsData.errors;
  },

defaultKeyMappings_: [
  "?", "showHelp",
  "j", "scrollDown",
  "k", "scrollUp",
  "h", "scrollLeft",
  "l", "scrollRight",
  "gg", "scrollToTop",
  "G", "scrollToBottom",
  "zH", "scrollToLeft",
  "zL", "scrollToRight",
  "<c-e>", "scrollDown",
  "<c-y>", "scrollUp",
  "d", "scrollPageDown",
  "u", "scrollPageUp",
  "r", "reload",
  "gs", "toggleViewSource",
  "R", "reloadGivenTab",
  "<a-R>", "reopenTab",
  "<a-r>", "reloadTab",
  "<a-t>", "previousTab",
  "<a-c>", "reloadTab",
  "<a-v>", "nextTab",
  "i", "enterInsertMode",
  "v", "enterVisualMode",
  "V", "enterVisualLineMode",
  "<f8>", "enterVisualMode",
  "H", "goBack",
  "L", "goForward",
  "gu", "goUp",
  "gU", "goToRoot",
  "gi", "focusInput",
  "f", "LinkHints.activate",
  "F", "LinkHints.activateModeToOpenInNewTab",
  "<a-f>", "LinkHints.activateModeWithQueue",
  "/", "enterFindMode",
  "n", "performFind",
  "N", "performBackwardsFind",
  "[[", "goPrevious",
  "]]", "goNext",
  "yy", "copyCurrentUrl",
  "yf", "LinkHints.activateModeToCopyLinkUrl",
  "p", "openCopiedUrlInCurrentTab",
  "P", "openCopiedUrlInNewTab",
  "K", "nextTab",
  "J", "previousTab",
  "gt", "nextTab",
  "gT", "previousTab",
  "^", "visitPreviousTab",
  "<<", "moveTabLeft",
  ">>", "moveTabRight",
  "g0", "firstTab",
  "g$", "lastTab",
  "W", "moveTabToNextWindow",
  "t", "createTab",
  "yt", "duplicateTab",
  "x", "removeTab",
  "X", "restoreTab",
  "<a-p>", "togglePinTab",
  "<a-m>", "toggleMuteTab",
  "o", "Vomnibar.activate",
  "O", "Vomnibar.activateInNewTab",
  "T", "Vomnibar.activateTabSelection",
  "b", "Vomnibar.activateBookmarks",
  "B", "Vomnibar.activateBookmarksInNewTab",
  "ge", "Vomnibar.activateUrl",
  "gE", "Vomnibar.activateUrlInNewTab",
  "gf", "nextFrame",
  "gF", "mainFrame",
  "<f1>", "simBackspace",
  "<F1>", "switchFocus",
  "<f2>", "switchFocus",
  "m", "Marks.activateCreateMode",
  "`", "Marks.activate"
]
},
CommandsData = (CommandsData as CommandsData) || {
  keyToCommandRegistry_: null as never as SafeDict<CommandsNS.Item>,
  keyMap_: null as never as KeyMap,
  cmdMap_: null as never as SafeDict<CommandsNS.Options | null>,
  mapKeyRegistry_: null as SafeDict<string> | null,
  errors: 0,
availableCommands_: {
  __proto__: null as never,
  showHelp: [ "Show help", 1, true, kBgCmd.showHelp ],
  debugBackground: [ "Debug the background page", 1, true,
    kBgCmd.openUrl,
    {
      reuse: ReuseType.reuse,
      url: IsFirefox ? "about:debugging#addons" : IsEdge ? Settings.CONST.OptionsPage : "chrome://extensions/?id=$id",
      id_mask: "$id"
    }],
  blank: [ "Do nothing", 1, true, kBgCmd.blank ],
  toggleLinkHintCharacters: [ "Toggle the other link hints (use value)", 1, true,
    kBgCmd.toggle, { key: "linkHintCharacters" } ],
  toggleSwitchTemp: [ "Toggle switch only in currnet page (use key[, value])", 1, true, kBgCmd.toggle ],
  scrollDown: [ "Scroll down", 0, false, kFgCmd.scBy ],
  scrollUp: [ "Scroll up", 0, false, kFgCmd.scBy, { count: -1 } ],
  scrollLeft: [ "Scroll left", 0, false, kFgCmd.scBy, { count: -1, axis: "x" } ],
  scrollRight: [ "Scroll right", 0, false, kFgCmd.scBy, { axis: "x" } ],
  scrollPxDown: [ "Scroll 1px down", 0, false, kFgCmd.scBy, { view: 1 } ],
  scrollPxUp: [ "Scroll 1px up", 0, false, kFgCmd.scBy, { count: -1, view: 1 } ],
  scrollPxLeft: [ "Scroll 1px left", 0, false, kFgCmd.scBy, { count: -1, axis: "x", view: 1 } ],
  scrollPxRight: [ "Scroll 1px right", 0, false, kFgCmd.scBy, { axis: "x", view: 1 } ],
  scrollTo: [ "Scroll to custom position", 0, false, kFgCmd.scTo ],
  scrollToTop: [ "Scroll to the top of the page", 0, false, kFgCmd.scTo ],
  scrollToBottom: [ "Scroll to the bottom of the page", 0, false, kFgCmd.scTo, { dest: "max" } ],
  scrollToLeft: [ "Scroll all the way to the left", 0, false, kFgCmd.scTo, { axis: "x" } ],
  scrollToRight: [ "Scroll all the way to the right", 0, false, kFgCmd.scTo, { axis: "x", dest: "max" } ],
  scrollPageDown: [ "Scroll a page down", 0, false, kFgCmd.scBy, { dir: 0.5, view: "viewSize" } ],
  scrollPageUp: [ "Scroll a page up", 0, false, kFgCmd.scBy, { dir: -0.5, view: "viewSize" } ],
  scrollFullPageDown: [ "Scroll a full page down", 0, false, kFgCmd.scBy, { view: "viewSize" } ],
  scrollFullPageUp: [ "Scroll a full page up", 0, false, kFgCmd.scBy, { count: -1, view: "viewSize" } ],
  reload: [ "Reload current frame (use hard)", 1, false, kFgCmd.reload ],
  reloadTab: [ "Reload N tab(s) (use hard/bypassCache)", 20, true, kBgCmd.reloadTab ],
  reloadGivenTab: [ "Reload N-th tab", 0, true, kBgCmd.reloadGivenTab, { single: true } ],
  reopenTab: [ "Reopen current page", 1, true, kBgCmd.reopenTab ],
  toggleViewSource: [ "View page source", 1, true, kBgCmd.toggleViewSource ],
  copyCurrentTitle: [ "Copy current tab's title", 1, true, kBgCmd.copyTabInfo, { type: "title" } ],
  copyCurrentUrl: [ "Copy page's info (use type=url/frame, decoded)", 1, true, kBgCmd.copyTabInfo ],
  autoCopy: [ "Copy selected text or current frame's title or URL (use url, decoded)", 1, false, kFgCmd.autoCopy ],
  autoOpen: [ "Open selected or copied text in a new tab", 1, false, kFgCmd.autoOpen ],
  searchAs: [ "Search selected or copied text using current search engine", 1, false, kFgCmd.searchAs ],
  searchInAnother: [ "Redo search in another search engine (use keyword, reuse=0)", 1, true, kBgCmd.searchInAnother ],
  "LinkHints.activateModeToCopyLinkUrl": [ "Copy a link URL to the clipboard", 0, false,
    kFgCmd.linkHints, { mode: HintMode.COPY_LINK_URL } ],
  "LinkHints.activateModeToCopyLinkText": [ "Copy a link text to the clipboard", 0, false,
    kFgCmd.linkHints, { mode: HintMode.COPY_TEXT } ],
  "LinkHints.activateModeToSearchLinkText": [ "Open or search a link text", 0, false,
    kFgCmd.linkHints, { mode: HintMode.SEARCH_TEXT } ],
  "LinkHints.activateModeToEdit": [ "Select an editable area", 1, false,
    kFgCmd.linkHints, { mode: HintMode.FOCUS_EDITABLE } ],
  "LinkHints.activateModeToOpenVomnibar": [ "Edit a link text on Vomnibar (use url, newtab)", 1, false,
    kFgCmd.linkHints, { mode: HintMode.EDIT_TEXT } ],
  openCopiedUrlInCurrentTab: [ "Open the clipboard's URL in the current tab", 1, true,
    kBgCmd.openUrl, { reuse: ReuseType.current, copied: true } ],
  openCopiedUrlInNewTab: [ "Open the clipboard's URL in N new tab(s)", 20, true, kBgCmd.openUrl, { copied: true } ],
  enterInsertMode: [ "Enter insert mode (use code=27, stat=0)", 1, true, kBgCmd.enterInsertMode ],
  passNextKey: [ "Pass the next key(s) to the page (use normal)", 0, false, kFgCmd.passNextKey ],
  enterVisualMode: [ "Enter visual mode", 1, true, kBgCmd.enterVisualMode],
  enterVisualLineMode: [ "Enter visual line mode", 1, true, kBgCmd.enterVisualMode, { mode: "line" } ],
  focusInput: ['Focus the N-th visible text box on the page and cycle using tab (use keep, select=""/all/all-input/start/end)',
    0, false, kFgCmd.focusInput ],
  "LinkHints.activate": [ "Open a link in the current tab (use characters=&lt;string&gt;)", 0, false, kFgCmd.linkHints ],
  "LinkHints.activateMode": [ "Open a link in the current tab (use characters=&lt;string&gt;)", 0, false, kFgCmd.linkHints ],
  "LinkHints.activateModeToOpenInNewTab": [ "Open a link in a new tab", 0, false,
    kFgCmd.linkHints, { mode: HintMode.OPEN_IN_NEW_BG_TAB } ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ "Open a link in a new tab and switch to it", 0, false,
    kFgCmd.linkHints, { mode: HintMode.OPEN_IN_NEW_FG_TAB } ],
  "LinkHints.activateModeWithQueue": [ "Open multiple links in a new tab", 0, false,
    kFgCmd.linkHints, { mode: HintMode.OPEN_WITH_QUEUE } ],
  "LinkHints.activateModeToOpenIncognito": [ "Open a link in incognito window", 0, false,
    kFgCmd.linkHints, { mode: HintMode.OPEN_INCOGNITO_LINK } ],
  "LinkHints.activateModeToDownloadImage": [ "Download &lt;img&gt; image", 0, false,
    kFgCmd.linkHints, { mode: HintMode.DOWNLOAD_IMAGE } ],
  "LinkHints.activateModeToOpenImage": [ "Show &lt;img&gt; image in new extension's tab", 0, false,
    kFgCmd.linkHints, { mode: HintMode.OPEN_IMAGE } ],
  "LinkHints.activateModeToDownloadLink": [ "Download link URL", 0, false,
    kFgCmd.linkHints, { mode: HintMode.DOWNLOAD_LINK } ],
  "LinkHints.activateModeToHover": [ "select an element and hover", 0, false,
    kFgCmd.linkHints, { mode: HintMode.HOVER } ],
  "LinkHints.activateModeToLeave": [ "let mouse leave link", 0, false,
    kFgCmd.linkHints, { mode: HintMode.LEAVE } ],
  "LinkHints.unhoverLast": [ "Stop hovering at last location", 1, false, kFgCmd.unhoverLast ],
  enterFindMode: [ "Enter find mode (use last)", 1, true, kBgCmd.performFind, {active: true} ],
  performFind: [ "Cycle forward to the next find match (use dir=1/-1)", 0, true, kBgCmd.performFind ],
  performBackwardsFind: [ "Cycle backward to the previous find match", 0, true, kBgCmd.performFind, { count: -1 } ],
  clearFindHistory: ["Clear find mode history", 1, true, kBgCmd.clearFindHistory ],
  switchFocus: [ "blur activeElement or refocus it", 1, false, kFgCmd.switchFocus ],
  simBackspace: [ "simulate backspace for once if focused", 1, false, kFgCmd.switchFocus, { act: "backspace" } ],
  goPrevious: [ "Follow the link labeled previous or &lt;", 1, true, kBgCmd.goNext, { rel: "prev" } ],
  goNext: [ "Follow the link labeled next or &gt;", 1, true, kBgCmd.goNext ],
  goBack: [ "Go back in history", 0, false, kFgCmd.goBack ],
  goForward: [ "Go forward in history", 0, false, kFgCmd.goBack, { count: -1 } ],
  goUp: [ "Go up the URL hierarchy (use trailing_slash=null/&lt;boolean&gt;)", 0, true, kBgCmd.goUp ],
  goToRoot: [ "Go to root of current URL hierarchy", 0, true, kBgCmd.goToRoot ],
  nextTab: [ "Go one tab right", 0, true, kBgCmd.goTab ],
  quickNext: [ "Go one tab right", 0, true, kBgCmd.goTab ],
  previousTab: [ "Go one tab left", 0, true, kBgCmd.goTab, { count: -1 } ],
  visitPreviousTab: [ "Go to previously-visited tab on current window", 0, true, kBgCmd.visitPreviousTab ],
  firstTab: [ "Go to the first N-th tab", 0, true, kBgCmd.goTab, { absolute: true } ],
  lastTab: [ "Go to the last N-th tab", 0, true, kBgCmd.goTab, { count: -1, absolute: true } ],
  createTab: [ "Create new tab(s)", 20, true, kBgCmd.createTab ],
  duplicateTab: [ "Duplicate current tab for N times", 20, true, kBgCmd.duplicateTab ],
  removeTab: [ "Close N tab(s) (use allow_close, limited=null/&lt;boolean&gt;, left)", 0, true, kBgCmd.removeTab ],
  removeRightTab: [ "Close N-th tab on the right", 0, true, kBgCmd.removeRightTab ],
  restoreTab: [ "Restore closed tab(s)", 25, true, kBgCmd.restoreTab ],
  restoreGivenTab: [ "Restore the last N-th tab", 0, true, kBgCmd.restoreGivenTab ],
  moveTabToNewWindow: [ "Move N tab(s) to new window (use limited=null/&lt;boolean&gt;)", 0, true, kBgCmd.moveTabToNewWindow ],
  moveTabToNextWindow: [ "Move tab to next window", 0, true, kBgCmd.moveTabToNextWindow ],
  moveTabToIncognito: [ "Make tab in incognito window", 1, true, kBgCmd.moveTabToNewWindow, { incognito: true } ],
  togglePinTab: [ "Pin or unpin N tab(s)", 50, true, kBgCmd.togglePinTab ],
  toggleMuteTab: [ "Mute or unmute current tab (use all, other)", 1, true, kBgCmd.toggleMuteTab ],
  closeTabsOnLeft: [ "Close tabs on the left", 0, true, kBgCmd.removeTabsR, { dir: -1 } ],
  closeTabsOnRight: [ "Close tabs on the right", 0, true, kBgCmd.removeTabsR, { dir: 1 } ],
  closeOtherTabs: [ "Close all other tabs", 1, true, kBgCmd.removeTabsR ],
  moveTabLeft: [ "Move tab to the left", 0, true, kBgCmd.moveTab ],
  moveTabRight: [ "Move tab to the right", 0, true, kBgCmd.moveTab, { dir: 1 } ],
  enableCSTemp: [ "enable the site's CS in incognito window (use type=images)", 0, true,
    kBgCmd.toggleCS, { type: "images", incognito: true } ],
  toggleCS: [ "turn on/off the site's CS (use type=images)", 0, true, kBgCmd.toggleCS, { type: "images" } ],
  clearCS: [ "clear extension's content settings (use type=images)", 1, true, kBgCmd.clearCS, { type: "images" } ],
  "Vomnibar.activate": [
    'Open URL, bookmark, or history entry<br/> (use keyword="", url=false/true/&lt;string&gt;)', 0, true,
    kBgCmd.showVomnibar ],
  "Vomnibar.activateInNewTab": [
    "Open URL, history, etc,<br/> in a new tab (use keyword, url)", 0, true,
    kBgCmd.showVomnibar, { newtab: true } ],
  "Vomnibar.activateTabSelection": [ "Search through your open tabs", 1, true,
    kBgCmd.showVomnibar, { mode: "tab", newtab: true } ],
  "Vomnibar.activateBookmarks": [ "Open a bookmark", 1, true,
    kBgCmd.showVomnibar, { mode: "bookm" } ],
  "Vomnibar.activateBookmarksInNewTab": [ "Open a bookmark in a new tab", 1, true,
    kBgCmd.showVomnibar, { mode: "bookm", newtab: true } ],
  "Vomnibar.activateHistory": [ "Open a history", 1, true,
    kBgCmd.showVomnibar, { mode: "history" } ],
  "Vomnibar.activateHistoryInNewTab": [ "Open a history in a new tab", 1, true,
    kBgCmd.showVomnibar, { mode: "history", newtab: true } ],
  "Vomnibar.activateUrl": [ "Edit the current URL", 0, true,
    kBgCmd.showVomnibar, { url: true } ],
  "Vomnibar.activateUrlInNewTab": [ "Edit the current URL and open in a new tab", 0, true,
    kBgCmd.showVomnibar, { url: true, newtab: true } ],
  "Vomnibar.activateEditUrl": [ "Edit the current URL", 0, true,
    kBgCmd.showVomnibar, { url: true } ],
  "Vomnibar.activateEditUrlInNewTab": [ "Edit the current URL and open in a new tab", 0, true,
    kBgCmd.showVomnibar, { url: true, newtab: true } ],
  nextFrame: [ "Cycle forward to the next frame on the page", 0, true, kBgCmd.nextFrame ],
  mainFrame: [ "Select the tab's main/top frame", 1, true, kBgCmd.mainFrame ],
  parentFrame: [ "Focus a parent frame", 0, true, kBgCmd.parentFrame ],
  "Marks.activateCreateMode": [ "Create a new mark (use swap)", 1, false, kFgCmd.marks, { mode: "create" } ],
  "Marks.activate": [ "Go to a mark (use prefix=true, swap)", 1, false, kFgCmd.marks ],
  "Marks.clearLocal": [ "Remove all local marks for this site", 1, true, kBgCmd.clearMarks, { local: true } ],
  "Marks.clearGlobal": [ "Remove all global marks", 1, true, kBgCmd.clearMarks ],
  clearGlobalMarks: [ "Remove all global marks (deprecated)", 1, true, kBgCmd.clearMarks ],
  openUrl: [ 'open URL (use url="", urls:string[], reuse=-1/0/1/-2, incognito, window, end)', 20, true, kBgCmd.openUrl ],
  focusOrLaunch: [ 'focus a tab with given URL or open it (use url="", prefix)', 1, true,
    kBgCmd.openUrl, { reuse: ReuseType.reuse } ]
} as ReadonlySafeDict<CommandsNS.Description>,
  wordsRe_: "[_0-9A-Za-z\\xAA\\xB5\\xBA\\xC0-\\xD6\\xD8-\\xF6\\xF8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\
\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u0\
3F7-\\u0481\\u048A-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066\
E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u0\
7A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0\\u08A2-\\\
u08AC\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u099\
3-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u\
0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\\
u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0A\
D0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u\
0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\\
u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C\
33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\\
u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4\
E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\\
u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\
\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F0\
0\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\\
u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u12\
4D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\
\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\\
u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u\
1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F\
5\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\\
u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u\
1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F4\
8-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\\
u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u20\
9C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\\
u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\
\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\\
\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u3\
03B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B\
A\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\\
uA62B\\uA640-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6E5\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\u\
A7A0-\\uA7AA\\uA7F8-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA\
8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44\
-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uA\
AE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uAB\
E2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\
\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uF\
D50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFF\
BE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"
};

if (Backend.onInit_) {
  Commands.parseKeyMappings_(Settings.get("keyMappings"));
  Commands.populateCommandKeys_();
  if (!Settings.get("vimSync")) {
    Commands = null as never;
  }
  chrome.commands && chrome.commands.onCommand.addListener(Backend.ExecuteGlobal_);
}
if (Commands)
Settings.updateHooks_.keyMappings = function(value: string): void {
  Commands.parseKeyMappings_(value);
  Commands.populateCommandKeys_();
  return (this as typeof Settings).broadcast({
    name: kBgReq.keyMap,
    mapKeys: CommandsData.mapKeyRegistry_,
    keyMap: CommandsData.keyMap_
  });
};
