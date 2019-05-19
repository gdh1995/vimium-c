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
        } else if ((ch = key.charCodeAt(0)) > KnownKey.maxNotNum && ch < KnownKey.minNotNum || ch === KnownKey.line) {
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
availableCommands_: { __proto__: null as never,
  "LinkHints.activate": [ 0, 0, 0, kFgCmd.linkHints],
  "LinkHints.activateMode": [ 0, 0, 0, kFgCmd.linkHints ],
  "LinkHints.activateModeToCopyLinkText": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.COPY_TEXT } ],
  "LinkHints.activateModeToCopyLinkUrl": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.COPY_LINK_URL } ],
  "LinkHints.activateModeToDownloadImage": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.DOWNLOAD_IMAGE } ],
  "LinkHints.activateModeToDownloadLink": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.DOWNLOAD_LINK } ],
  "LinkHints.activateModeToEdit": [ 0, 1, 0, kFgCmd.linkHints, { mode: HintMode.FOCUS_EDITABLE } ],
  "LinkHints.activateModeToHover": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.HOVER } ],
  "LinkHints.activateModeToLeave": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.LEAVE } ],
  "LinkHints.activateModeToOpenImage": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.OPEN_IMAGE } ],
  "LinkHints.activateModeToOpenIncognito": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.OPEN_INCOGNITO_LINK } ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ 0, 0, 0, kFgCmd.linkHints, {mode: HintMode.OPEN_IN_NEW_FG_TAB} ],
  "LinkHints.activateModeToOpenInNewTab": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.OPEN_IN_NEW_BG_TAB } ],
  "LinkHints.activateModeToOpenVomnibar": [ 0, 1, 0, kFgCmd.linkHints, { mode: HintMode.EDIT_TEXT } ],
  "LinkHints.activateModeToSearchLinkText": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.SEARCH_TEXT } ],
  "LinkHints.activateModeWithQueue": [ 0, 0, 0, kFgCmd.linkHints, { mode: HintMode.OPEN_WITH_QUEUE } ],
  "LinkHints.unhoverLast": [ 0, 1, 0, kFgCmd.unhoverLast ],
  "Marks.activate": [ 0, 0, 0, kFgCmd.marks ],
  "Marks.activateCreateMode": [ 0, 0, 0, kFgCmd.marks, { mode: "create" } ],
  "Marks.clearGlobal": [ 0, 1, 1, kBgCmd.clearMarks ],
  "Marks.clearLocal": [ 0, 1, 1, kBgCmd.clearMarks, { local: true } ],
  "Vomnibar.activate": [ 0, 0, 1, kBgCmd.showVomnibar ],
  "Vomnibar.activateBookmarks": [ 0, 1, 1, kBgCmd.showVomnibar, { mode: "bookm" } ],
  "Vomnibar.activateBookmarksInNewTab": [ 0, 1, 1, kBgCmd.showVomnibar, { mode: "bookm", newtab: true } ],
  "Vomnibar.activateEditUrl": [ 0, 0, 1, kBgCmd.showVomnibar, { url: true } ],
  "Vomnibar.activateEditUrlInNewTab": [ 0, 0, 1, kBgCmd.showVomnibar, { url: true, newtab: true } ],
  "Vomnibar.activateHistory": [ 0, 1, 1, kBgCmd.showVomnibar, { mode: "history" } ],
  "Vomnibar.activateHistoryInNewTab": [ 0, 1, 1, kBgCmd.showVomnibar, { mode: "history", newtab: true } ],
  "Vomnibar.activateInNewTab": [ 0, 0, 1, kBgCmd.showVomnibar, { newtab: true } ],
  "Vomnibar.activateTabSelection": [ 0, 1, 1, kBgCmd.showVomnibar, { mode: "tab", newtab: true } ],
  "Vomnibar.activateUrl": [ 0, 0, 1, kBgCmd.showVomnibar, { url: true } ],
  "Vomnibar.activateUrlInNewTab": [ 0, 0, 1, kBgCmd.showVomnibar, { url: true, newtab: true } ],
  autoCopy: [ 0, 1, 0, kFgCmd.autoCopy ],
  autoOpen: [ 0, 1, 0, kFgCmd.autoOpen ],
  blank: [ 0, 1, 1, kBgCmd.blank ],
  clearCS: [ 0, 1, 1, kBgCmd.clearCS, { type: "images" } ],
  clearFindHistory: [ 0, 1, 1, kBgCmd.clearFindHistory ],
  clearGlobalMarks: [ 0, 1, 1, kBgCmd.clearMarks ],
  closeOtherTabs: [ 0, 1, 1, kBgCmd.removeTabsR, { other: true } ],
  closeTabsOnLeft: [ 0, 0, 1, kBgCmd.removeTabsR, { count: -1 } ],
  closeTabsOnRight: [ 0, 0, 1, kBgCmd.removeTabsR ],
  copyCurrentTitle: [ 0, 1, 1, kBgCmd.copyTabInfo, { type: "title" } ],
  copyCurrentUrl: [ 0, 1, 1, kBgCmd.copyTabInfo ],
  createTab: [ "Create new tab(s)", 20 as 0, 1, kBgCmd.createTab ],
  debugBackground: [ 0, 1, 1, kBgCmd.openUrl,
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
  discardTab: [ "Discard some other tab(s)", /* 20 in main.ts */ 0, 1, kBgCmd.discardTab ],
  duplicateTab: [ "Duplicate current tab for N times", 20 as 0, 1, kBgCmd.duplicateTab ],
  enableCSTemp: [ 0, 0, 1, kBgCmd.toggleCS, { type: "images", incognito: true } ],
  enterFindMode: [ 0, 1, 1, kBgCmd.performFind, {active: true} ],
  enterInsertMode: [ 0, 1, 1, kBgCmd.enterInsertMode ],
  enterVisualLineMode: [ 0, 1, 1, kBgCmd.enterVisualMode, { mode: "line" } ],
  enterVisualMode: [ 0, 1, 1, kBgCmd.enterVisualMode],
  firstTab: [ 0, 0, 1, kBgCmd.goTab, { absolute: true } ],
  focusInput: [ 0, 0, 0, kFgCmd.focusInput ],
  focusOrLaunch: [ 0, 1, 1, kBgCmd.openUrl, { reuse: ReuseType.reuse } ],
  goBack: [ 0, 0, 0, kFgCmd.framesGoBack, { count: -1 } ],
  goForward: [ 0, 0, 0, kFgCmd.framesGoBack ],
  goNext: [ 0, 1, 1, kBgCmd.goNext ],
  goPrevious: [ 0, 1, 1, kBgCmd.goNext, { rel: "prev" } ],
  goToRoot: [ 0, 0, 1, kBgCmd.goToRoot ],
  goUp: [ 0, 0, 1, kBgCmd.goUp ],
  lastTab: [ 0, 0, 1, kBgCmd.goTab, { count: -1, absolute: true } ],
  mainFrame: [ 0, 1, 1, kBgCmd.mainFrame ],
  moveTabLeft: [ 0, 0, 1, kBgCmd.moveTab, { count: -1 } ],
  moveTabRight: [ 0, 0, 1, kBgCmd.moveTab ],
  moveTabToIncognito: [ 0, 1, 1, kBgCmd.moveTabToNewWindow, { incognito: true } ],
  moveTabToNewWindow: [ "Move N tab(s) to new window (use limited=null/&lt;boolean&gt;)",
    /** 30 in main.ts */ 0, 1, kBgCmd.moveTabToNewWindow ],
  moveTabToNextWindow: [ 0, 0, 1, kBgCmd.moveTabToNextWindow ],
  nextFrame: [ 0, 0, 1, kBgCmd.nextFrame ],
  nextTab: [ 0, 0, 1, kBgCmd.goTab ],
  openCopiedUrlInCurrentTab: [ 0, 1, 1, kBgCmd.openUrl, { reuse: ReuseType.current, copied: true } ],
  openCopiedUrlInNewTab: [ "Open the clipboard's URL in N new tab(s)", 20 as 0, 1, kBgCmd.openUrl, {copied: true} ],
  openUrl: [ 'open URL (use url="", urls:string[], reuse=-1/0/1/-2, incognito, window, end)',
    20 as 0, 1, kBgCmd.openUrl ],
  parentFrame: [ 0, 0, 1, kBgCmd.parentFrame ],
  passNextKey: [ 0, 0, 0, kFgCmd.passNextKey ],
  performAnotherFind: [ 0, 0, 1, kBgCmd.performFind, { index: "other" } ],
  performBackwardsFind: [ 0, 0, 1, kBgCmd.performFind, { count: -1 } ],
  performFind: [ 0, 0, 1, kBgCmd.performFind ],
  previousTab: [ 0, 0, 1, kBgCmd.goTab, { count: -1 } ],
  quickNext: [ 0, 0, 1, kBgCmd.goTab ],
  reload: [ 0, 1, 0, kFgCmd.reload ],
  reloadGivenTab: [ 0, 0, 1, kBgCmd.reloadGivenTab, { single: true } ],
  reloadTab: [ "Reload N tab(s) (use hard, bypassCache)", /** 20 in main.ts */ 0, 1, kBgCmd.reloadTab ],
  removeRightTab: [ 0, 0, 1, kBgCmd.removeRightTab ],
  removeTab: [ "Close N tab(s) (use allow_close, limited=null/&lt;boolean&gt;, left)",
    /** 20 in main.ts */ 0, 1, kBgCmd.removeTab ],
  reopenTab: [ 0, 1, 1, kBgCmd.reopenTab ],
  restoreGivenTab: [ 0, 0, 1, kBgCmd.restoreGivenTab ],
  restoreTab: [ "Restore closed tab(s)", 25 as 0, 1, kBgCmd.restoreTab ],
  scrollDown: [ 0, 0, 0, kFgCmd.scroll ],
  scrollFullPageDown: [ 0, 0, 0, kFgCmd.scroll, { view: "view" } ],
  scrollFullPageUp: [ 0, 0, 0, kFgCmd.scroll, { count: -1, view: "view" } ],
  scrollLeft: [ 0, 0, 0, kFgCmd.scroll, { count: -1, axis: "x" } ],
  scrollPageDown: [ 0, 0, 0, kFgCmd.scroll, { dir: 0.5, view: "view" } ],
  scrollPageUp: [ 0, 0, 0, kFgCmd.scroll, { dir: -0.5, view: "view" } ],
  scrollPxDown: [ 0, 0, 0, kFgCmd.scroll, { view: 1 } ],
  scrollPxLeft: [ 0, 0, 0, kFgCmd.scroll, { count: -1, axis: "x", view: 1 } ],
  scrollPxRight: [ 0, 0, 0, kFgCmd.scroll, { axis: "x", view: 1 } ],
  scrollPxUp: [ 0, 0, 0, kFgCmd.scroll, { count: -1, view: 1 } ],
  scrollRight: [ 0, 0, 0, kFgCmd.scroll, { axis: "x" } ],
  scrollTo: [ 0, 0, 0, kFgCmd.scroll, { dest: "min" } ],
  scrollToBottom: [ 0, 0, 0, kFgCmd.scroll, { dest: "max" } ],
  scrollToLeft: [ 0, 0, 0, kFgCmd.scroll, { axis: "x", dest: "min" } ],
  scrollToRight: [ 0, 0, 0, kFgCmd.scroll, { axis: "x", dest: "max" } ],
  scrollToTop: [ 0, 0, 0, kFgCmd.scroll, { dest: "min" } ],
  scrollUp: [ 0, 0, 0, kFgCmd.scroll, { count: -1 } ],
  searchAs: [ 0, 1, 0, kFgCmd.searchAs, { copied: true, selected: true } ],
  searchInAnother: [ 0, 1, 1, kBgCmd.searchInAnother ],
  showHelp: [ 0, 1, 1, kBgCmd.showHelp ],
  simBackspace: [ 0, 1, 0, kFgCmd.switchFocus, { act: "backspace" } ],
  switchFocus: [ 0, 1, 0, kFgCmd.switchFocus ],
  toggleCS: [ 0, 0, 1, kBgCmd.toggleCS, { type: "images" } ],
  toggleLinkHintCharacters: [ 0, 1, 1, kBgCmd.toggle, { key: "linkHintCharacters" } ],
  toggleMuteTab: [ 0, 1, 1, kBgCmd.toggleMuteTab ],
  togglePinTab: [ "Pin or unpin N tab(s)", /** 30 in main.ts */ 0, 1, kBgCmd.togglePinTab ],
  toggleSwitchTemp: [ 0, 1, 1, kBgCmd.toggle ],
  toggleViewSource: [ 0, 1, 1, kBgCmd.toggleViewSource ],
  toggleVomnibarStyle: [ 0, 1, 1, kBgCmd.toggleVomnibarStyle, { style: "dark" } ],
  visitPreviousTab: [ 0, 0, 1, kBgCmd.visitPreviousTab ]
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
