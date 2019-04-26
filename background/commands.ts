var Commands = {
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
  parseVal_ (val: string): any {
    try {
      return JSON.parse(val);
    } catch {}
    if (!val.startsWith('"')) { return val; }
    try {
      return JSON.parse(val);
    } catch {}
    return val;
  },
  parseKeyMappings_: (function (this: {}, line: string): void {
    let key: string | undefined, lines: string[], splitLine: string[], mk = 0, _i: number
      , _len: number, details: CommandsNS.Description | undefined, errors = 0, ch: number
      , registry = Object.create<CommandsNS.Item>(null)
      , cmdMap = Object.create<CommandsNS.Item>(null) as Partial<ShortcutInfoMap>
      , userDefinedKeys = Object.create<true>(null)
      , mkReg = Object.create<string>(null);
    const available = CommandsData_.availableCommands_;
    const colorRed = "color:red";
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
      if (!(line && line.charCodeAt(0) > KnownKey.maxCommentHead)) { continue; } // mask: /[!"#]/
      splitLine = line.split(" ");
      key = splitLine[0];
      if (key === "map") {
        key = Utils.formatKeys_(splitLine[1] || "");
        if (!key || key === "__proto__") {
          console.log("Unsupported key sequence %c%s", colorRed, key || '""', `for "${splitLine[2] || ""}"`);
        } else if (key in userDefinedKeys) {
          console.log("Key %c%s", colorRed, key, "has been mapped to", (registry[key] as CommandsNS.Item).command);
        } else if (splitLine.length < 3) {
          console.log("Lacking command when mapping %c%s", colorRed, key);
        } else if (!(details = available[splitLine[2]])) {
          console.log("Command %c%s", colorRed, splitLine[2], "doesn't exist!");
        } else if ((ch = key.charCodeAt(0)) > KnownKey.maxNotNum && ch < KnownKey.minNotNum) {
          console.log("Invalid key: %c%s", colorRed, key, "(the first char can not be '-' or number)");
        } else {
          registry[key] = Utils.makeCommand_(splitLine[2], (<typeof Commands> this).getOptions_(splitLine, 3), details);
          userDefinedKeys[key] = true;
          continue;
        }
      } else if (key === "unmapAll" || key === "unmapall") {
        registry = Object.create(null);
        cmdMap = Object.create<CommandsNS.Item>(null) as Partial<ShortcutInfoMap>;
        userDefinedKeys = Object.create<true>(null);
        mkReg = Object.create<string>(null), mk = 0;
        if (errors > 0) {
          console.log("All key mappings is unmapped, but there %s been %c%d error%s%c before this instruction"
            , errors > 1 ? "have" : "has", colorRed, errors, errors > 1 ? "s" : "", "color:auto");
        }
        continue;
      } else if (key === "mapkey" || key === "mapKey") {
        if (splitLine.length !== 3) {
          console.log("MapKey needs both source and target keys:", line);
        } else if ((key = splitLine[1]).length > 1 && (key.match(Utils.keyRe_) as RegExpMatchArray).length > 1
          || splitLine[2].length > 1 && (splitLine[2].match(Utils.keyRe_) as RegExpMatchArray).length > 1) {
          console.log("MapKey: a source / target key should be a single key:", line);
        } else if (key in mkReg) {
          console.log("This key %c%s", colorRed, key, "has been mapped to another key:", mkReg[key]);
        } else {
          mkReg[key] = splitLine[2];
          mk++;
          continue;
        }
      } else if (key === "shortcut" || key === "commmand") {
        key = splitLine[1];
        if (splitLine.length < 3) {
          console.log("Lacking command name and options in shortcut:", line);
        } else if ((Settings.CONST_.GlobalCommands_ as Array<kShortcutNames | string>).indexOf(key) < 0) {
          console.log("Shortcut %c%s", colorRed, key, "doesn't exist!");
        } else if (key in cmdMap) {
          console.log("Shortcut %c%s", colorRed, key, "has been configured");
        } else {
          cmdMap[key as kShortcutNames] = Utils.makeCommand_(key,
              (this as typeof Commands).getOptions_(splitLine, 2), available[key]);
          continue;
        }
      } else if (key !== "unmap") {
        console.log("Unknown mapping command: %c%s", colorRed, key, "in", line);
      } else if (splitLine.length !== 2) {
        console.log("Unmap needs one mapped key:", line);
      } else if ((key = Utils.formatKeys_(splitLine[1])) in registry) {
        delete userDefinedKeys[key];
        delete registry[key];
        continue;
      } else {
        console.log("Unmapping: %c%s", colorRed, key, "has not been mapped");
      }
      ++errors;
    }
    for (key of Settings.CONST_.GlobalCommands_) {
      if (!cmdMap[key as kShortcutNames]) {
        cmdMap[key as kShortcutNames] = Utils.makeCommand_(key, null, available[key]);
      }
    }
    CommandsData_.keyToCommandRegistry_ = registry;
    CommandsData_.shortcutMap_ = cmdMap as ShortcutInfoMap;
    CommandsData_.mapKeyRegistry_ = mk > 0 ? mkReg : null;
    Settings.temp_.cmdErrors_ = Settings.temp_.cmdErrors_ > 0 ? ~errors : errors;
  }),
  populateCommandKeys_: (function (this: void): void {
    const d = CommandsData_, ref = d.keyMap_ = Object.create<ValidKeyAction | ChildKeyMap>(null), keyRe = Utils.keyRe_,
    d2 = Settings.temp_, oldErrors = d2.cmdErrors_;
    if (oldErrors < 0) { d2.cmdErrors_ = ~oldErrors; }
    for (let ch = 10; 0 <= --ch; ) { ref[ch] = KeyAction.count; }
    ref["-"] = KeyAction.count;
    const C = Commands, R = d.keyToCommandRegistry_;
    for (const key in R) {
      const arr = key.match(keyRe) as RegExpMatchArray, last = arr.length - 1;
      if (last === 0) {
        (key in ref) && C.warnInactive_(ref[key] as ReadonlyChildKeyMap, key);
        ref[key] = KeyAction.cmd;
        continue;
      }
      let ref2 = ref as ChildKeyMap, tmp: ChildKeyMap | ValidChildKeyAction | undefined = ref2, j = 0;
      while ((tmp = ref2[arr[j]]) && j < last) { j++; ref2 = tmp; }
      if (tmp === KeyAction.cmd) {
        C.warnInactive_(key, arr.slice(0, j + 1).join(""));
        continue;
      }
      tmp != null && C.warnInactive_(tmp, key);
      while (j < last) { ref2 = ref2[arr[j++]] = Object.create(null) as ChildKeyMap; }
      ref2[arr[last]] = KeyAction.cmd;
    }
    if (d2.cmdErrors_) {
      console.log("%cKey Mappings: %o errors found.", "background-color:#fffbe5", d2.cmdErrors_);
    } else if (oldErrors < 0) {
      console.log("The new key mappings have no errors");
    }
    const maybePassed = Exclusions ? Exclusions.getAllPassed_() : null;
    const func = function (obj: ChildKeyMap): void {
      for (const key in obj) {
        const val = obj[key] as NonNullable<ChildKeyMap[string]>;
        if (val !== KeyAction.cmd) { func(val); }
        else if (maybePassed !== true && ref[key] === KeyAction.cmd && !(maybePassed && key in maybePassed)) {
          delete obj[key];
        }
      }
    };
    for (const key in ref) {
      const val = ref[key] as NonNullable<(typeof ref)[string]>;
      if (val !== KeyAction.cmd && val !== KeyAction.count) { func(val); }
    }
  }),
  warnInactive_ (obj: ReadonlyChildKeyMap | string, newKey: string): void {
    console.log("inactive key:", obj, "with", newKey);
    ++Settings.temp_.cmdErrors_;
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
  "<a-t>", "createTab",
  "<a-c>", "previousTab",
  "<a-C>", "nextTab",
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
  "<a-n>", "performAnotherFind",
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
  "gn", "toggleVomnibarStyle",
  "<f1>", "simBackspace",
  "<F1>", "switchFocus",
  "<f2>", "switchFocus",
  "m", "Marks.activateCreateMode",
  "`", "Marks.activate"
]
},
CommandsData_: CommandsDataTy = CommandsData_ as never || {
  keyToCommandRegistry_: null as never as SafeDict<CommandsNS.Item>,
  keyMap_: null as never as KeyMap,
  shortcutMap_: null as never as ShortcutInfoMap,
  mapKeyRegistry_: null as SafeDict<string> | null,
availableCommands_: {
  __proto__: null as never,
  showHelp: [ "Show help", 1, 1, kBgCmd.showHelp ],
  debugBackground: [ "Debug the background page", 1, 1,
    kBgCmd.openUrl,
    {
      reuse: ReuseType.reuse,
      url: Build.BTypes & ~BrowserType.Chrome &&
            (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
        ? Build.BTypes & BrowserType.Firefox &&
            (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          ? "about:debugging#addons" : Settings.CONST_.OptionsPage_
        : "chrome://extensions/?id=$id",
      id_mask: "$id"
    }],
  blank: [ "Do nothing", 1, 1, kBgCmd.blank ],
  toggleLinkHintCharacters: [ "Toggle the other link hints (use value)", 1, 1,
    kBgCmd.toggle, { key: "linkHintCharacters" } ],
  toggleSwitchTemp: [ "Toggle switch only on current page (use key[, value])", 1, 1, kBgCmd.toggle ],
  toggleVomnibarStyle: [ "Toggle style(s) of vomnibar page (use style=dark, current)", 1, 1,
    kBgCmd.toggleVomnibarStyle, { style: "dark" } ],
  scrollDown: [ "Scroll down", 0, 0, kFgCmd.scroll ],
  scrollUp: [ "Scroll up", 0, 0, kFgCmd.scroll, { count: -1 } ],
  scrollLeft: [ "Scroll left", 0, 0, kFgCmd.scroll, { count: -1, axis: "x" } ],
  scrollRight: [ "Scroll right", 0, 0, kFgCmd.scroll, { axis: "x" } ],
  scrollPxDown: [ "Scroll 1px down", 0, 0, kFgCmd.scroll, { view: 1 } ],
  scrollPxUp: [ "Scroll 1px up", 0, 0, kFgCmd.scroll, { count: -1, view: 1 } ],
  scrollPxLeft: [ "Scroll 1px left", 0, 0, kFgCmd.scroll, { count: -1, axis: "x", view: 1 } ],
  scrollPxRight: [ "Scroll 1px right", 0, 0, kFgCmd.scroll, { axis: "x", view: 1 } ],
  scrollTo: [ "Scroll to custom position", 0, 0, kFgCmd.scroll, { dest: "min" } ],
  scrollToTop: [ "Scroll to the top of the page", 0, 0, kFgCmd.scroll, { dest: "min" } ],
  scrollToBottom: [ "Scroll to the bottom of the page", 0, 0, kFgCmd.scroll, { dest: "max" } ],
  scrollToLeft: [ "Scroll all the way to the left", 0, 0, kFgCmd.scroll, { axis: "x", dest: "min" } ],
  scrollToRight: [ "Scroll all the way to the right", 0, 0, kFgCmd.scroll, { axis: "x", dest: "max" } ],
  scrollPageDown: [ "Scroll a page down", 0, 0, kFgCmd.scroll, { dir: 0.5, view: "view" } ],
  scrollPageUp: [ "Scroll a page up", 0, 0, kFgCmd.scroll, { dir: -0.5, view: "view" } ],
  scrollFullPageDown: [ "Scroll a full page down", 0, 0, kFgCmd.scroll, { view: "view" } ],
  scrollFullPageUp: [ "Scroll a full page up", 0, 0, kFgCmd.scroll, { count: -1, view: "view" } ],
  reload: [ "Reload current frame (use hard)", 1, 0, kFgCmd.reload ],
  reloadTab: [ "Reload N tab(s) (use hard, bypassCache)",
    /** 20 in main.ts */ 0, 1, kBgCmd.reloadTab ],
  reloadGivenTab: [ "Reload N-th tab (use hard)", 0, 1, kBgCmd.reloadGivenTab, { single: true } ],
  reopenTab: [ "Reopen current page", 1, 1, kBgCmd.reopenTab ],
  toggleViewSource: [ "View page source", 1, 1, kBgCmd.toggleViewSource ],
  copyCurrentTitle: [ "Copy current tab's title", 1, 1, kBgCmd.copyTabInfo, { type: "title" } ],
  copyCurrentUrl: [ "Copy page's info (use type=url/frame, decoded)", 1, 1, kBgCmd.copyTabInfo ],
  autoCopy: [ "Copy selected text or current frame's title or URL (use url, decoded)", 1, 0, kFgCmd.autoCopy ],
  autoOpen: [ "Open selected or copied text in a new tab", 1, 0, kFgCmd.autoOpen ],
  searchAs: [ "Search selected or copied text using current search engine (use copied=true, selected=true)", 1, 0,
    kFgCmd.searchAs, { copied: true, selected: true } ],
  searchInAnother: [ "Redo search in another search engine (use keyword, reuse=0)", 1, 1, kBgCmd.searchInAnother ],
  "LinkHints.activateModeToCopyLinkUrl": [ "Copy a link URL to the clipboard", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.COPY_LINK_URL } ],
  "LinkHints.activateModeToCopyLinkText": [ "Copy a link text to the clipboard", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.COPY_TEXT } ],
  "LinkHints.activateModeToSearchLinkText": [ "Open or search a link text", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.SEARCH_TEXT } ],
  "LinkHints.activateModeToEdit": [ "Select an editable area", 1, 0,
    kFgCmd.linkHints, { mode: HintMode.FOCUS_EDITABLE } ],
  "LinkHints.activateModeToOpenVomnibar": [ "Edit a link text on Vomnibar (use url, newtab)", 1, 0,
    kFgCmd.linkHints, { mode: HintMode.EDIT_TEXT } ],
  openCopiedUrlInCurrentTab: [ "Open the clipboard's URL in the current tab", 1, 1,
    kBgCmd.openUrl, { reuse: ReuseType.current, copied: true } ],
  openCopiedUrlInNewTab: [ "Open the clipboard's URL in N new tab(s)", 20 as 0, 1, kBgCmd.openUrl, {copied: true} ],
  enterInsertMode: [ "Enter insert mode (use code=27, stat=0)", 1, 1, kBgCmd.enterInsertMode ],
  passNextKey: [ "Pass the next key(s) to the page (use normal)", 0, 0, kFgCmd.passNextKey ],
  enterVisualMode: [ "Enter visual mode", 1, 1, kBgCmd.enterVisualMode],
  enterVisualLineMode: [ "Enter visual line mode", 1, 1, kBgCmd.enterVisualMode, { mode: "line" } ],
  focusInput: [
    'Focus the N-th visible text box on the page and cycle using tab (use keep, select=""/all/all-line/start/end)',
    0, 0, kFgCmd.focusInput ],
  "LinkHints.activate": [
    `Open a link in the current tab (use button=""/"right"${
      Build.BTypes & BrowserType.Chrome ? ', touch=""/"auto"' : ""
    })`,
    0, 0, kFgCmd.linkHints],
  "LinkHints.activateMode": [ "Open a link in the current tab", 0, 0,
    kFgCmd.linkHints ],
  "LinkHints.activateModeToOpenInNewTab": [ "Open a link in a new tab", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.OPEN_IN_NEW_BG_TAB } ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ "Open a link in a new tab and switch to it", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.OPEN_IN_NEW_FG_TAB } ],
  "LinkHints.activateModeWithQueue": [ "Open multiple links in a new tab", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.OPEN_WITH_QUEUE } ],
  "LinkHints.activateModeToOpenIncognito": [ "Open a link in incognito window", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.OPEN_INCOGNITO_LINK } ],
  "LinkHints.activateModeToDownloadImage": [ "Download image", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.DOWNLOAD_IMAGE } ],
  "LinkHints.activateModeToOpenImage": [ "Show image in a new tab (use auto=true)", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.OPEN_IMAGE } ],
  "LinkHints.activateModeToDownloadLink": [ "Download link URL", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.DOWNLOAD_LINK } ],
  "LinkHints.activateModeToHover": [ "select an element and hover", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.HOVER } ],
  "LinkHints.activateModeToLeave": [ "let mouse leave link", 0, 0,
    kFgCmd.linkHints, { mode: HintMode.LEAVE } ],
  "LinkHints.unhoverLast": [ "Stop hovering at last location", 1, 0, kFgCmd.unhoverLast ],
  enterFindMode: [ "Enter find mode (use last)", 1, 1, kBgCmd.performFind, {active: true} ],
  performFind: [ "Cycle forward to the next find match", 0, 1, kBgCmd.performFind ],
  performBackwardsFind: [ "Cycle backward to the previous find match", 0, 1, kBgCmd.performFind, { count: -1 } ],
  performAnotherFind: [ "Find the second or even eariler query words", 0, 1, kBgCmd.performFind, { index: "other" } ],
  clearFindHistory: ["Clear find mode history", 1, 1, kBgCmd.clearFindHistory ],
  switchFocus: [ "blur activeElement or refocus it", 1, 0, kFgCmd.switchFocus ],
  simBackspace: [ "simulate backspace for once if focused", 1, 0, kFgCmd.switchFocus, { act: "backspace" } ],
  goPrevious: [ "Follow the link labeled previous or &lt;", 1, 1, kBgCmd.goNext, { rel: "prev" } ],
  goNext: [ "Follow the link labeled next or &gt;", 1, 1, kBgCmd.goNext ],
  goBack: [ "Go back in history", 0,
    !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.Min$Tabs$$goBack
      || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && chrome.tabs.goBack
    ? 1 : 0, kFgCmd.goBack ],
  goForward: [ "Go forward in history", 0,
    !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.Min$Tabs$$goBack
      || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && chrome.tabs.goBack
    ? 1 : 0, kFgCmd.goBack, { count: -1 } ],
  goUp: [ "Go up the URL hierarchy (use trailing_slash=null/&lt;boolean&gt;)", 0, 1, kBgCmd.goUp ],
  goToRoot: [ "Go to root of current URL hierarchy", 0, 1, kBgCmd.goToRoot ],
  nextTab: [ "Go one tab right", 0, 1, kBgCmd.goTab ],
  quickNext: [ "Go one tab right", 0, 1, kBgCmd.goTab ],
  previousTab: [ "Go one tab left", 0, 1, kBgCmd.goTab, { count: -1 } ],
  visitPreviousTab: [ "Go to previously-visited tab on current window", 0, 1, kBgCmd.visitPreviousTab ],
  firstTab: [ "Go to the first N-th tab", 0, 1, kBgCmd.goTab, { absolute: true } ],
  lastTab: [ "Go to the last N-th tab", 0, 1, kBgCmd.goTab, { count: -1, absolute: true } ],
  createTab: [ "Create new tab(s)", 20 as 0, 1, kBgCmd.createTab ],
  duplicateTab: [ "Duplicate current tab for N times", 20 as 0, 1, kBgCmd.duplicateTab ],
  removeTab: [ "Close N tab(s) (use allow_close, limited=null/&lt;boolean&gt;, left)",
    /** 20 in main.ts */ 0, 1, kBgCmd.removeTab ],
  removeRightTab: [ "Close N-th tab on the right", 0, 1, kBgCmd.removeRightTab ],
  restoreTab: [ "Restore closed tab(s)", 25 as 0, 1, kBgCmd.restoreTab ],
  restoreGivenTab: [ "Restore the last N-th tab", 0, 1, kBgCmd.restoreGivenTab ],
  moveTabToNewWindow: [ "Move N tab(s) to new window (use limited=null/&lt;boolean&gt;)",
    /** 30 in main.ts */ 0, 1, kBgCmd.moveTabToNewWindow ],
  moveTabToNextWindow: [ "Move tab to next window (use right)", 0, 1, kBgCmd.moveTabToNextWindow ],
  moveTabToIncognito: [ "Make tab in incognito window", 1, 1, kBgCmd.moveTabToNewWindow, { incognito: true } ],
  togglePinTab: [ "Pin or unpin N tab(s)",
    /** 30 in main.ts */ 0, 1, kBgCmd.togglePinTab ],
  toggleMuteTab: [ "Mute or unmute current tab (use all, other)", 1, 1, kBgCmd.toggleMuteTab ],
  closeTabsOnLeft: [ "Close tabs on the left", 0, 1, kBgCmd.removeTabsR, { dir: -1 } ],
  closeTabsOnRight: [ "Close tabs on the right", 0, 1, kBgCmd.removeTabsR, { dir: 1 } ],
  closeOtherTabs: [ "Close all other tabs", 1, 1, kBgCmd.removeTabsR ],
  moveTabLeft: [ "Move tab to the left", 0, 1, kBgCmd.moveTab ],
  moveTabRight: [ "Move tab to the right", 0, 1, kBgCmd.moveTab, { dir: 1 } ],
  enableCSTemp: [ "enable the site's CS in incognito window (use type=images)", 0, 1,
    kBgCmd.toggleCS, { type: "images", incognito: true } ],
  toggleCS: [ "turn on/off the site's CS (use type=images)", 0, 1, kBgCmd.toggleCS, { type: "images" } ],
  clearCS: [ "clear extension's content settings (use type=images)", 1, 1, kBgCmd.clearCS, { type: "images" } ],
  "Vomnibar.activate": [
    'Open URL, bookmark, or history entry<br/> (use keyword="", url=false/true/&lt;string&gt;)', 0, 1,
    kBgCmd.showVomnibar ],
  "Vomnibar.activateInNewTab": [
    "Open URL, history, etc,<br/> in a new tab (use keyword, url)", 0, 1,
    kBgCmd.showVomnibar, { newtab: true } ],
  "Vomnibar.activateTabSelection": [ "Search through your open tabs", 1, 1,
    kBgCmd.showVomnibar, { mode: "tab", newtab: true } ],
  "Vomnibar.activateBookmarks": [ "Open a bookmark", 1, 1,
    kBgCmd.showVomnibar, { mode: "bookm" } ],
  "Vomnibar.activateBookmarksInNewTab": [ "Open a bookmark in a new tab", 1, 1,
    kBgCmd.showVomnibar, { mode: "bookm", newtab: true } ],
  "Vomnibar.activateHistory": [ "Open a history", 1, 1,
    kBgCmd.showVomnibar, { mode: "history" } ],
  "Vomnibar.activateHistoryInNewTab": [ "Open a history in a new tab", 1, 1,
    kBgCmd.showVomnibar, { mode: "history", newtab: true } ],
  "Vomnibar.activateUrl": [ "Edit the current URL", 0, 1,
    kBgCmd.showVomnibar, { url: true } ],
  "Vomnibar.activateUrlInNewTab": [ "Edit the current URL and open in a new tab", 0, 1,
    kBgCmd.showVomnibar, { url: true, newtab: true } ],
  "Vomnibar.activateEditUrl": [ "Edit the current URL", 0, 1,
    kBgCmd.showVomnibar, { url: true } ],
  "Vomnibar.activateEditUrlInNewTab": [ "Edit the current URL and open in a new tab", 0, 1,
    kBgCmd.showVomnibar, { url: true, newtab: true } ],
  nextFrame: [ "Cycle forward to the next frame on the page", 0, 1, kBgCmd.nextFrame ],
  mainFrame: [ "Select the tab's main/top frame", 1, 1, kBgCmd.mainFrame ],
  parentFrame: [ "Focus a parent frame", 0, 1, kBgCmd.parentFrame ],
  "Marks.activateCreateMode": [ "Create a new mark (use swap)", 0, 0, kFgCmd.marks, { mode: "create" } ],
  "Marks.activate": [ "Go to a mark (use prefix=true, swap)", 0, 0, kFgCmd.marks ],
  "Marks.clearLocal": [ "Remove all local marks for this site", 1, 1, kBgCmd.clearMarks, { local: true } ],
  "Marks.clearGlobal": [ "Remove all global marks", 1, 1, kBgCmd.clearMarks ],
  clearGlobalMarks: [ "Remove all global marks (deprecated)", 1, 1, kBgCmd.clearMarks ],
  openUrl: [ 'open URL (use url="", urls:string[], reuse=-1/0/1/-2, incognito, window, end)', 20 as 0, 1,
    kBgCmd.openUrl ],
  focusOrLaunch: [ 'focus a tab with given URL or open it (use url="", prefix)', 1, 1,
    kBgCmd.openUrl, { reuse: ReuseType.reuse } ]
} as ReadonlySafeDict<CommandsNS.Description>
};

if (Backend.onInit_) {
  Commands.parseKeyMappings_(Settings.get_("keyMappings"));
  Commands.populateCommandKeys_();
  if (!Settings.get_("vimSync")) {
    Commands = null as never;
  }
  Build.BTypes & BrowserType.Edge && !chrome.commands ||
  (chrome.commands.onCommand as chrome.events.Event<
        (command: kShortcutNames | kShortcutAliases & string, exArg: FakeArg) => void
      >).addListener(Backend.ExecuteShortcut_);
}
if (Commands) {
Settings.updateHooks_.keyMappings = function (this: {}, value: string | null): void {
  value != null && Commands.parseKeyMappings_(value);
  Commands.populateCommandKeys_();
  return (this as typeof Settings).broadcast_({
    N: kBgReq.keyMap,
    m: CommandsData_.mapKeyRegistry_,
    k: CommandsData_.keyMap_
  });
};
}
