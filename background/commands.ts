declare var CommandsData: CommandsData;
var Commands = {
  setKeyRe (keyReSource: string): void {
    Utils.keyRe = new RegExp(keyReSource, "g") as RegExpG & RegExpSearchable<0>;
  },
  getOptions (item: string[], start: number): CommandsNS.Options | null {
    let opt: CommandsNS.RawOptions, i = start, len = item.length, ind: number, str: string | undefined, val: string;
    if (len <= i) { return null; }
    opt = Object.create(null) as CommandsNS.RawOptions;
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
        opt[str] = val && this.parseVal(val);
      }
    }
    return str ? opt : null;
  },
  hexCharRe: <RegExpGI & RegExpSearchable<1>> /\\(?:x([\da-z]{2})|\\)/gi,
  parseVal (val: string): any {
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
  onHex (_s: string, hex: string): string {
    return hex ? "\\u00" + hex : '\\\\';
  },
  loadDefaults (registry: SafeDict<CommandsNS.Item>): void {
    const defaultMap = this.defaultKeyMappings;
    for (let i = defaultMap.length; 0 <= --i; ) {
      const pair = defaultMap[i];
      registry[pair[0]] = Utils.makeCommand(pair[1]);
    }
  },
  parseKeyMappings: (function(this: any, line: string): void {
    let key: string | undefined, lines: string[], splitLine: string[], mk = 0, _i = 0
      , _len: number, details: CommandsNS.Description | undefined, errors = 0, ch: number
      , registry = CommandsData.keyToCommandRegistry = Object.create<CommandsNS.Item>(null)
      , cmdMap = CommandsData.cmdMap = Object.create<CommandsNS.Options | null>(null)
      , userDefinedKeys = Object.create<true>(null)
      , mkReg = Object.create<string>(null);
    const available = CommandsData.availableCommands;
    lines = line.replace(<RegExpG> /\\\n/g, "").replace(<RegExpG> /[\t ]+/g, " ").split("\n");
    lines[0] !== "unmapAll" && lines[0] !== "unmapall" ? (this as typeof Commands).loadDefaults(registry) : ++_i;
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
          registry[key] = Utils.makeCommand(splitLine[2], (this as typeof Commands).getOptions(splitLine, 3), details);
          userDefinedKeys[key] = true;
          continue;
        }
      } else if (key === "unmapAll" || key === "unmapall") {
        registry = CommandsData.keyToCommandRegistry = Object.create(null);
        cmdMap = CommandsData.cmdMap = Object.create<CommandsNS.Options | null>(null);
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
        } else if ((key = splitLine[1]).length > 1 && (key.match(Utils.keyRe) as RegExpMatchArray).length > 1
          || splitLine[2].length > 1 && (splitLine[2].match(Utils.keyRe) as RegExpMatchArray).length > 1) {
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
          cmdMap[key] = Utils.makeCommand(key
            , (this as typeof Commands).getOptions(splitLine, 2), available[key]).options;
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
    CommandsData.mapKeyRegistry = mk > 0 ? mkReg : null;
    CommandsData.errors = CommandsData.errors > 0 ? ~errors : errors;
  }),
  populateCommandKeys: (function(this: void): void {
    const d = CommandsData, ref = d.keyMap = Object.create<0 | 1 | ChildKeyMap>(null), keyRe = Utils.keyRe,
    oldErrors = d.errors;
    if (oldErrors < 0) { d.errors = ~oldErrors; }
    for (let ch = 10; 0 <= --ch; ) { ref[ch] = 1 as 0; }
    ref['-'] = 1;
    for (const key in d.keyToCommandRegistry) {
      const arr = key.match(keyRe) as RegExpMatchArray, last = arr.length - 1;
      if (last === 0) {
        (key in ref) && Commands.warnInactive(ref[key] as ReadonlyChildKeyMap, key);
        ref[key] = 0;
        continue;
      }
      let ref2 = ref as ChildKeyMap, tmp: ChildKeyMap | 0 | 1 | undefined = ref2, j = 0;
      while ((tmp = ref2[arr[j]]) && j < last) { j++; ref2 = tmp; }
      if (tmp === 0) {
        Commands.warnInactive(key, arr.slice(0, j + 1).join(""));
        continue;
      }
      tmp != null && Commands.warnInactive(tmp, key);
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
    if (Backend.Init) { return Backend.Init(); }
  }),
  warnInactive (obj: ReadonlyChildKeyMap | string, newKey: string): void {
    console.log("inactive key:", obj, "with", newKey);
    ++CommandsData.errors;
  },

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
  ["gs", "toggleViewSource"],
  ["R", "reloadGivenTab"],
  ["<a-R>", "reopenTab"],
  ["<a-r>", "reloadTab"],
  ["<a-t>", "previousTab"],
  ["<a-c>", "reloadTab"],
  ["<a-v>", "nextTab"],
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
  ["ge", "Vomnibar.activateUrl"],
  ["gE", "Vomnibar.activateUrlInNewTab"],
  ["gf", "nextFrame"],
  ["gF", "mainFrame"],
  ["<f1>", "simBackspace"],
  ["<F1>", "switchFocus"],
  ["<f2>", "switchFocus"],
  ["m", "Marks.activateCreateMode"],
  ["`", "Marks.activate"]
] as ReadonlyArray<[string, string]>
},
CommandsData = (CommandsData as CommandsData) || {
  keyToCommandRegistry: null as never as SafeDict<CommandsNS.Item>,
  keyMap: null as never as KeyMap,
  cmdMap: null as never as SafeDict<CommandsNS.Options | null>,
  mapKeyRegistry: null as SafeDict<string> | null,
  errors: 0,
availableCommands: {
  __proto__: null as never,
  showHelp: [ "Show help", 1, true ],
  debugBackground: [ "Debug the background page", 1, true,
    { reuse: ReuseType.reuse, url: "chrome://extensions/?id=$id", id_mask: "$id" }, "openUrl" ],
  blank: [ "Do nothing", 1, true ],
  toggleLinkHintCharacters: [ "Toggle the other link hints (use value)", 1, false,
    { key: "linkHintCharacters" }, ".toggleSwitchTemp" ],
  toggleSwitchTemp: [ "Toggle switch only in currnet page (use key[, value])", 1, false, null, "." ],
  scrollDown: [ "Scroll down", 0, false, null, "scBy" ],
  scrollUp: [ "Scroll up", 0, false, { count: -1 }, "scBy" ],
  scrollLeft: [ "Scroll left", 0, false, { count: -1, axis: "x" }, "scBy" ],
  scrollRight: [ "Scroll right", 0, false, { axis: "x" }, "scBy" ],
  scrollPxDown: [ "Scroll 1px down", 0, false, { view: 1 }, "scBy" ],
  scrollPxUp: [ "Scroll 1px up", 0, false, { count: -1, view: 1 }, "scBy" ],
  scrollPxLeft: [ "Scroll 1px left", 0, false, { count: -1, axis: "x", view: 1 }, "scBy" ],
  scrollPxRight: [ "Scroll 1px right", 0, false, { axis: "x", view: 1 }, "scBy" ],
  scrollTo: [ "Scroll to custom position", 0, false, null, "scTo" ],
  scrollToTop: [ "Scroll to the top of the page", 0, false, null, "scTo" ],
  scrollToBottom: [ "Scroll to the bottom of the page", 0, false, { dest: "max" }, "scTo" ],
  scrollToLeft: [ "Scroll all the way to the left", 0, false, { axis: "x" }, "scTo" ],
  scrollToRight: [ "Scroll all the way to the right", 0, false, { axis: "x", dest: "max" }, "scTo" ],
  scrollPageDown: [ "Scroll a page down", 0, false, { dir: 0.5, view: "viewSize" }, "scBy" ],
  scrollPageUp: [ "Scroll a page up", 0, false, { dir: -0.5, view: "viewSize" }, "scBy" ],
  scrollFullPageDown: [ "Scroll a full page down", 0, false, { view: "viewSize" }, "scBy" ],
  scrollFullPageUp: [ "Scroll a full page up", 0, false, { count: -1, view: "viewSize" }, "scBy" ],
  reload: [ "Reload current frame (use hard/force)", 1, false ],
  reloadTab: [ "Reload N tab(s) (use hard/bypassCache)", 20, true ],
  reloadGivenTab: [ "Reload N-th tab", 0, true, { single: true } ],
  reopenTab: [ "Reopen current page", 1, true ],
  toggleViewSource: [ "View page source", 1, true ],
  copyCurrentTitle: [ "Copy current tab's title", 1, true, { type: "title" }, "copyTabInfo" ],
  copyCurrentUrl: [ "Copy page's info (use type=url/frame, decoded)", 1, true, null, "copyTabInfo" ],
  autoCopy: [ "Copy selected text or current frame's title or URL (use url, decoded)", 1, false, null, "." ],
  autoOpen: [ "Open selected or copied text in a new tab", 1, false ],
  searchAs: [ "Search selected or copied text using current search engine", 1, false ],
  searchInAnother: [ "Redo search in another search engine (use keyword, reuse=0)", 1, true ],
  "LinkHints.activateModeToCopyLinkUrl": [ "Copy a link URL to the clipboard", 0, false,
    { mode: HintMode.COPY_LINK_URL }, "Hints.activate" ],
  "LinkHints.activateModeToCopyLinkText": [ "Copy a link text to the clipboard", 0, false,
    { mode: HintMode.COPY_TEXT }, "Hints.activate" ],
  "LinkHints.activateModeToSearchLinkText": [ "Open or search a link text", 0, false,
    { mode: HintMode.SEARCH_TEXT }, "Hints.activate" ],
  "LinkHints.activateModeToEdit": [ "Select an editable area", 1, false,
    { mode: HintMode.FOCUS_EDITABLE }, "Hints.activate" ],
  "LinkHints.activateModeToOpenVomnibar": [ "Edit a link text on Vomnibar (use url, force)", 1, false,
    { mode: HintMode.EDIT_TEXT }, "Hints.activate" ],
  openCopiedUrlInCurrentTab: [ "Open the clipboard's URL in the current tab", 1, true, { reuse: ReuseType.current, copied: true }, "openUrl" ],
  openCopiedUrlInNewTab: [ "Open the clipboard's URL in N new tab(s)", 20, true, { copied: true }, "openUrl" ],
  enterInsertMode: [ "Enter insert mode (use code=27, stat=0)", 1, true ],
  passNextKey: [ "Pass the next key(s) to the page (use normal)", 0, false, null, "." ],
  enterVisualMode: [ "Enter visual mode", 1, false, null, "Visual.activate" ],
  enterVisualLineMode: [ "Enter visual line mode", 1, false, { mode: "line" }, "Visual.activate" ],
  focusInput: [ 'Focus the N-th visible text box on the page and cycle using tab (use keep, select=""/all/all-input/start/end)', 0, false, null, "." ],
  "LinkHints.activate": [ "Open a link in the current tab (use characters=&lt;string&gt;)", 0, false, null, "Hints.activate" ],
  "LinkHints.activateMode": [ "Open a link in the current tab (use characters=&lt;string&gt;)", 0, false, null, "Hints.activate" ],
  "LinkHints.activateModeToOpenInNewTab": [ "Open a link in a new tab", 0, false,
    { mode: HintMode.OPEN_IN_NEW_BG_TAB }, "Hints.activate" ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ "Open a link in a new tab and switch to it", 0, false,
    { mode: HintMode.OPEN_IN_NEW_FG_TAB }, "Hints.activate" ],
  "LinkHints.activateModeWithQueue": [ "Open multiple links in a new tab", 0, false,
    { mode: HintMode.OPEN_WITH_QUEUE }, "Hints.activate" ],
  "LinkHints.activateModeToOpenIncognito": [ "Open a link in incognito window", 0, false,
    { mode: HintMode.OPEN_INCOGNITO_LINK }, "Hints.activate" ],
  "LinkHints.activateModeToDownloadImage": [ "Download &lt;img&gt; image", 0, false,
    { mode: HintMode.DOWNLOAD_IMAGE }, "Hints.activate" ],
  "LinkHints.activateModeToOpenImage": [ "Show &lt;img&gt; image in new extension's tab", 0, false,
    { mode: HintMode.OPEN_IMAGE }, "Hints.activate" ],
  "LinkHints.activateModeToDownloadLink": [ "Download link URL", 0, false,
    { mode: HintMode.DOWNLOAD_LINK }, "Hints.activate" ],
  "LinkHints.activateModeToHover": [ "select an element and hover", 0, false,
    { mode: HintMode.HOVER }, "Hints.activate" ],
  "LinkHints.activateModeToLeave": [ "let mouse leave link", 0, false,
    { mode: HintMode.LEAVE }, "Hints.activate" ],
  "LinkHints.unhoverLast": [ "Stop hovering at last location", 1, false, null, "Hints.unhoverLast" ],
  enterFindMode: [ "Enter find mode (use last)", 1, true, {active: true}, "performFind" ],
  performFind: [ "Cycle forward to the next find match (use dir=1/-1)", 0, true ],
  performBackwardsFind: [ "Cycle backward to the previous find match", 0, true, { count: -1 }, "performFind" ],
  clearFindHistory: ["Clear find mode history", 1, true],
  switchFocus: [ "blur activeElement or refocus it", 1, false ],
  simBackspace: [ "simulate backspace for once if focused", 1, false, { act: "backspace" }, "switchFocus" ],
  goPrevious: [ "Follow the link labeled previous or &lt;", 1, true, { rel: "prev" }, "goNext" ],
  goNext: [ "Follow the link labeled next or &gt;", 1, true ],
  goBack: [ "Go back in history", 0, false ],
  goForward: [ "Go forward in history", 0, false, { count: -1 }, "goBack" ],
  goUp: [ "Go up the URL hierarchy (use trailing_slash=null/&lt;boolean&gt;)", 0, true ],
  goToRoot: [ "Go to root of current URL hierarchy", 0, true ],
  nextTab: [ "Go one tab right", 0, true, null, "goTab" ],
  quickNext: [ "Go one tab right", 0, true, null, "goTab" ],
  previousTab: [ "Go one tab left", 0, true, { count: -1 }, "goTab" ],
  visitPreviousTab: [ "Go to previously-visited tab on current window", 0, true ],
  firstTab: [ "Go to the first N-th tab", 0, true, { absolute: true }, "goTab" ],
  lastTab: [ "Go to the last N-th tab", 0, true, { count: -1, absolute: true }, "goTab" ],
  createTab: [ "Create new tab(s)", 20, true ],
  duplicateTab: [ "Duplicate current tab for N times", 20, true ],
  removeTab: [ "Close N tab(s) (use allow_close, limited=null/&lt;boolean&gt;, left)", 0, true ],
  removeRightTab: [ "Close N-th tab on the right", 0, true ],
  restoreTab: [ "Restore closed tab(s)", 25, true ],
  restoreGivenTab: [ "Restore the last N-th tab", 0, true ],
  moveTabToNewWindow: [ "Move N tab(s) to new window (use limited=null/&lt;boolean&gt;)", 0, true ],
  moveTabToNextWindow: [ "Move tab to next window", 0, true ],
  moveTabToIncognito: [ "Make tab in incognito window", 1, true, { incognito: true }, "moveTabToNewWindow" ],
  togglePinTab: [ "Pin or unpin N tab(s)", 50, true ],
  toggleMuteTab: [ "Mute or unmute current tab (use all, other)", 1, true ],
  closeTabsOnLeft: [ "Close tabs on the left", 0, true, { dir: -1 }, "removeTabsR" ],
  closeTabsOnRight: [ "Close tabs on the right", 0, true, { dir: 1 }, "removeTabsR" ],
  closeOtherTabs: [ "Close all other tabs", 1, true, null, "removeTabsR" ],
  moveTabLeft: [ "Move tab to the left", 0, true, null, "moveTab" ],
  moveTabRight: [ "Move tab to the right", 0, true, { dir: 1 }, "moveTab" ],
  enableCSTemp: [ "enable the site's CS in incognito window (use type=images)", 0, true, { type: "images", incognito: true }, "toggleCS" ],
  toggleCS: [ "turn on/off the site's CS (use type=images)", 0, true, { type: "images" } ],
  clearCS: [ "clear extension's content settings (use type=images)", 1, true, { type: "images" } ],
  "Vomnibar.activate": [
    'Open URL, bookmark, or history entry<br/> (use keyword="", url=false/true/&lt;string&gt;)', 0, true,
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
  "Vomnibar.activateUrl": [ "Edit the current URL", 0, true,
    { url: true }, "showVomnibar" ],
  "Vomnibar.activateUrlInNewTab": [ "Edit the current URL and open in a new tab", 0, true,
    { url: true, force: true }, "showVomnibar" ],
  "Vomnibar.activateEditUrl": [ "Edit the current URL", 0, true,
    { url: true }, "showVomnibar" ],
  "Vomnibar.activateEditUrlInNewTab": [ "Edit the current URL and open in a new tab", 0, true,
    { url: true, force: true }, "showVomnibar" ],
  nextFrame: [ "Cycle forward to the next frame on the page", 0, true ],
  mainFrame: [ "Select the tab's main/top frame", 1, true ],
  parentFrame: [ "Focus a parent frame", 0, true ],
  "Marks.activateCreateMode": [ "Create a new mark (use swap)", 1, false, { mode: "create" }, "Marks.activate" ],
  "Marks.activate": [ "Go to a mark (use prefix=true, swap)", 1, false, null, "Marks.activate" ],
  "Marks.clearLocal": [ "Remove all local marks for this site", 1, true, { local: true }, "clearMarks" ],
  "Marks.clearGlobal": [ "Remove all global marks", 1, true, null, "clearMarks" ],
  clearGlobalMarks: [ "Remove all global marks (deprecated)", 1, true, null, "clearMarks" ],
  openUrl: [ 'open URL (use url="", urls:string[], reuse=-1/0/1/-2, incognito, window, end)', 20, true ],
  focusOrLaunch: [ 'focus a tab with given URL or open it (use url="", prefix)', 1, true, { reuse: ReuseType.reuse }, "openUrl" ]
} as ReadonlySafeDict<CommandsNS.Description>
};

if (document.readyState !== "complete") {
  Commands.parseKeyMappings(Settings.get("keyMappings"));
  Commands.defaultKeyMappings = null as never;
  Commands.populateCommandKeys();
  Commands = null as never;
  chrome.commands && chrome.commands.onCommand.addListener(Backend.ExecuteGlobal);
} else
Settings.updateHooks.keyMappings = function(value: string): void {
  Commands.parseKeyMappings(value);
  Commands.populateCommandKeys();
  return (this as typeof Settings).broadcast({
    name: "keyMap",
    mapKeys: CommandsData.mapKeyRegistry,
    keyMap: CommandsData.keyMap
  });
};
