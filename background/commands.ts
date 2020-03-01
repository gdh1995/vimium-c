// eslint-disable-next-line no-var
var Commands = {
  getOptions_ (item: string[], start: number): CommandsNS.Options | null {
    let opt: CommandsNS.RawOptions, i = start, len = item.length, ind: number, str: string | undefined, val: string;
    if (len <= i) { return null; }
    opt = BgUtils_.safeObj_();
    while (i < len) {
      str = item[i++];
      ind = str.indexOf("=");
      if (ind === 0 || str === "__proto__"
          || str[0] === "$" && !"$if=$key=$desc=$count=".includes(str.slice(0, ind + 1))) {
        this.logError_(ind === 0 ? "Missing" : "Unsupported", "option key:", str);
      } else if (ind < 0) {
        opt[str] = true;
      } else {
        val = str.slice(ind + 1);
        str = str.slice(0, ind);
        opt[str] = val && this.parseVal_(val);
      }
    }
    return str ? opt : null;
  },
  parseVal_ (val: string): any {
    try {
      return JSON.parse(val);
    } catch {}
    return val;
  },
  makeCommand_ (command: string, options?: CommandsNS.RawOptions | null, details?: CommandsNS.Description
      ): CommandsNS.Item | null {
    let opt: CommandsNS.Options | null, help: CommandsNS.CustomHelpInfo | null = null, condition: any;
    if (!details) { details = this.availableCommands_[command] as CommandsNS.Description; }
    opt = details.length < 4 ? null : BgUtils_.safer_(details[3] as NonNullable<CommandsNS.Description[3]>);
    if (options) {
      if (options.$count) {
        let n = parseFloat(options.$count) || 1;
        delete options.$count;
        options.count = n;
      } else if ("count" in options) {
        options.count = details[0] === 1 ? 1 : (parseFloat(options.count) || 1) * (opt && opt.count || 1);
      }
      if (options.$desc || options.$key) {
        help = { key_: options.$key || "", desc_: options.$desc || "" };
        delete options.$key;
        delete options.$desc;
      }
      if (condition = options.$if) {
        if (condition.sys && condition.sys !== Settings_.CONST_.Platform_
            || condition.browser && ! (condition.browser & (Build.BTypes & ~BrowserType.Chrome
                    && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge
                  ? OnOther : Build.BTypes & BrowserType._mask))
            ) {
          return null;
        }
        delete options.$if;
      }
      if (opt) {
        BgUtils_.extendIf_(options, opt);
      }
    } else {
      options = opt;
    }
    return {
      alias_: details[0] as Exclude<typeof details[0], kFgCmd>,
      background_: details[1] as Exclude<typeof details[1], 0>,
      command_: command as kCName,
      help_: help,
      options_: options,
      repeat_: details[2]
    };
  },
  // eslint-disable-next-line object-shorthand
  parseKeyMappings_: (function (this: {}, line: string): void {
    let key: string | undefined, lines: string[], splitLine: string[], mk = 0, _i: number
      , _len: number, details: CommandsNS.Description | undefined, errors = 0, ch: number
      , registry = BgUtils_.safeObj_<CommandsNS.Item>()
      , cmdMap = BgUtils_.safeObj_<CommandsNS.Item>() as Partial<ShortcutInfoMap>
      , builtinKeys: SafeDict<1> | null = null
      , regItem: CommandsNS.Item | null
      , mkReg = BgUtils_.safeObj_<string>();
    const a = this as typeof Commands, available = a.availableCommands_;
    const strip = BgUtils_.stripKey_;
    const colorRed = "color:red", shortcutLogPrefix = "Shortcut %c%s";
    lines = line.replace(<RegExpSearchable<0>> /\\\\?\n/g, t => t.length === 3 ? "\\\n" : ""
               ).replace(<RegExpG> /[\t ]+/g, " ").split("\n");
    if (lines[0] !== "unmapAll" && lines[0] !== "unmapall") {
      builtinKeys = BgUtils_.safeObj_<1>();
      const defaultMap = a.defaultKeyMappings_.split(" ");
      for (_i = defaultMap.length; 0 < _i; ) {
        _i -= 2;
        registry[defaultMap[_i]] = a.makeCommand_(defaultMap[_i + 1]) as NonNullable<ReturnType<typeof a.makeCommand_>>;
        builtinKeys[defaultMap[_i]] = 1;
      }
    } else {
      _i = 1;
    }
    for (_len = lines.length; _i < _len; _i++) {
      line = lines[_i].trim();
      if (!(line && line.charCodeAt(0) > kCharCode.maxCommentHead)) { continue; } // mask: /[!"#]/
      splitLine = line.split(" ");
      key = splitLine[0];
      if (key === "map") {
        key = BgUtils_.formatKeys_(splitLine[1] || "");
        if (!key || key === "__proto__") {
          a.logError_("Unsupported key sequence %c%s", colorRed, key || '""', `for "${splitLine[2] || ""}"`);
        } else if (key in registry && !(builtinKeys && key in builtinKeys)) {
          a.logError_("Key %c%s", colorRed, key, "has been mapped to", (registry[key] as CommandsNS.Item).command_);
        } else if (splitLine.length < 3) {
          a.logError_("Lacking command when mapping %c%s", colorRed, key);
        } else if (!(details = available[splitLine[2]])) {
          a.logError_("Command %c%s", colorRed, splitLine[2], "doesn't exist!");
        } else if ((ch = key.charCodeAt(0)) > kCharCode.maxNotNum && ch < kCharCode.minNotNum
            || ch === kCharCode.dash) {
              a.logError_("Invalid key: %c%s", colorRed, key, "(the first char can not be '-' or number)");
        } else {
          regItem = a.makeCommand_(splitLine[2], a.getOptions_(splitLine, 3), details);
          if (regItem) {
            registry[key] = regItem;
            builtinKeys && delete builtinKeys[key];
          }
          continue;
        }
      } else if (key === "unmapAll" || key === "unmapall") {
        registry = BgUtils_.safeObj_();
        cmdMap = BgUtils_.safeObj_<CommandsNS.Item>() as Partial<ShortcutInfoMap>;
        builtinKeys = null;
        mkReg = BgUtils_.safeObj_<string>(), mk = 0;
        if (errors > 0) {
          a.logError_("All key mappings is unmapped, but there %s been %c%d error%s%c before this instruction"
            , errors > 1 ? "have" : "has", colorRed, errors, errors > 1 ? "s" : "", "color:auto");
        }
        continue;
      } else if (key === "mapkey" || key === "mapKey") {
        const re = <RegExpG & RegExpSearchable<1>> /<(?!<[^:])([acms]-){0,4}.\w*?(:[a-z])?>|./g;
        if (splitLine.length !== 3) {
          a.logError_(`MapKey needs ${splitLine.length > 3 ? "only" : "both"} source and target keys`, line);
        } else if ((key = splitLine[1]).length > 1 && (key.match(re) as RegExpMatchArray).length > 1
          || splitLine[2].length > 1 && (splitLine[2].match(re) as RegExpMatchArray).length > 1) {
          a.logError_("MapKey: a source / target key should be a single key:", line);
        } else if (strip(key) in mkReg) {
          a.logError_("This key %c%s", colorRed, key, "has been mapped to another key:", mkReg[strip(key)]);
        } else {
          mkReg[key === "<escape>" ? "esc" : strip(key)] = splitLine[2] === "<escape>" ? "esc" : strip(splitLine[2]);
          mk++;
          continue;
        }
      } else if (key === "shortcut" || key === "command") {
        key = splitLine[1];
        if (splitLine.length < 3) {
          a.logError_("Lacking command name and options in shortcut:", line);
        } else if (!key.startsWith(CommandsNS.OtherCNames.userCustomized)
            && (Settings_.CONST_.GlobalCommands_ as Array<keyof ShortcutInfoMap | string>).indexOf(key) < 0) {
          a.logError_(shortcutLogPrefix, colorRed, key, "is not a valid name");
        } else if (key in cmdMap) {
          a.logError_(shortcutLogPrefix, colorRed, key, "has been configured");
        } else {
          key = a.setupUserCustomized_(cmdMap, key as keyof ShortcutInfoMap, a.getOptions_(splitLine, 2));
          if (!key) { continue; }
          a.logError_(shortcutLogPrefix, colorRed, splitLine[1], key);
        }
      } else if (key !== "unmap") {
        a.logError_("Unknown mapping command: %c%s", colorRed, key, "in", line);
      } else if (splitLine.length !== 2) {
        a.logError_("Unmap needs one mapped key:", line);
      } else if ((key = BgUtils_.formatKeys_(splitLine[1])) in registry) {
        builtinKeys && delete builtinKeys[key];
        delete registry[key];
        continue;
      } else {
        a.logError_("Unmapping: %c%s", colorRed, key, "has not been mapped");
      }
      ++errors;
    }
    for (key of Settings_.CONST_.GlobalCommands_) {
      if (!key.startsWith("user") && !cmdMap[key as keyof ShortcutInfoMap]) {
        if (regItem = a.makeCommand_(key)) {
          cmdMap[key as keyof ShortcutInfoMap] = regItem;
        }
      }
    }
    CommandsData_.keyToCommandRegistry_ = registry;
    CommandsData_.builtinKeys_ = builtinKeys;
    CommandsData_.shortcutRegistry_ = cmdMap as ShortcutInfoMap;
    CommandsData_.mappedKeyRegistry_ = Settings_.omniPayload_.k = mk > 0 ? mkReg : null;
    Settings_.temp_.cmdErrors_ = Settings_.temp_.cmdErrors_ > 0 ? ~errors : errors;
  }),
  setupUserCustomized_ (cmdMap: Partial<ShortcutInfoMap>, key: keyof ShortcutInfoMap
      , options: CommandsNS.Options | null): string {
    let has_cmd: BOOL = 1
      , command: string = options && options.command || (has_cmd = 0, key.startsWith("user") ? "" : key)
      , regItem: CommandsNS.Item | null
      , ret: 0 | 1 | 2 = command ? 1 : 0;
    if (ret && (command in this.availableCommands_)) {
      has_cmd && delete (options as CommandsNS.RawOptions).command;
      if (regItem = this.makeCommand_(command, options)) {
        cmdMap[key] = regItem;
      }
      ret = 2;
    }
    return ret < 1 ? 'requires a "command" option' : ret > 1 ? "" : "gets an unknown command";
  },
  populateKeyMap_: (function (this: void, detectNewError: boolean): void {
    const d = CommandsData_, ref = d.keyFSM_ = BgUtils_.safeObj_<ValidKeyAction | ChildKeyFSM>(),
    keyRe = BgUtils_.keyRe_,
    strip = BgUtils_.stripKey_,
    builtinKeys = d.builtinKeys_,
    allKeys = Object.keys(d.keyToCommandRegistry_),
    customKeys = builtinKeys ? allKeys.filter(i => !(i in builtinKeys)) : allKeys,
    countOfCustomKeys = customKeys.length,
    sortedKeys = builtinKeys ? customKeys.concat(Object.keys(builtinKeys)) : allKeys,
    C = Commands,
    d2 = Settings_.temp_, oldErrors = d2.cmdErrors_;
    if (oldErrors < 0) { d2.cmdErrors_ = ~oldErrors; }
    for (let ch = 10; 0 <= --ch; ) { ref[ch] = KeyAction.count; }
    ref["-"] = KeyAction.count;
    for (let index = 0; index < sortedKeys.length; index++) {
      const key = sortedKeys[index];
      const arr = key.match(keyRe) as RegExpMatchArray, last = arr.length - 1;
      if (last === 0) {
        let key2 = strip(key);
        if (key2 in ref) {
          if (index >= countOfCustomKeys) {
            delete d.keyToCommandRegistry_[key];
            continue;
          }
          detectNewError && C.warnInactive_(ref[key2] as ReadonlyChildKeyFSM, key);
        }
        ref[key2] = KeyAction.cmd;
        continue;
      }
      let ref2 = ref as ChildKeyFSM, tmp: ChildKeyFSM | ValidChildKeyAction | undefined = ref2, j = 0;
      while ((tmp = ref2[strip(arr[j])]) && j < last) { j++; ref2 = tmp; }
      if (tmp != null && (index >= countOfCustomKeys || tmp === KeyAction.cmd)) {
        index >= countOfCustomKeys ? delete d.keyToCommandRegistry_[key] :
        detectNewError && C.warnInactive_(key, arr.slice(0, j + 1).join(""));
        continue;
      }
      tmp != null && detectNewError && C.warnInactive_(tmp, key);
      while (j < last) { ref2 = ref2[strip(arr[j++])] = BgUtils_.safeObj_() as ChildKeyFSM; }
      ref2[strip(arr[last])] = KeyAction.cmd;
    }
    if (detectNewError && d2.cmdErrors_) {
      console.log("%cKey Mappings: %o errors found.", "background-color:#fffbe5", d2.cmdErrors_);
    } else if (oldErrors < 0) {
      console.log("The new key mappings have no errors");
    }
    CommandsData_.builtinKeys_ = null;
    const maybePassed = Exclusions ? Exclusions.getAllPassed_() : null;
    const func = function (obj: ChildKeyFSM): void {
      for (const key in obj) {
        const val = obj[key] as NonNullable<ChildKeyFSM[string]>;
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
  }) as (this: void, detectNewError: boolean) => void,
  logError_: function (): void {
    console.log.apply(console, arguments);
  } as (firstMsg: string, ...args: any[]) => void ,
  warnInactive_ (obj: ReadonlyChildKeyFSM | string, newKey: string): void {
    console.log("inactive key:", obj, "with", newKey);
    ++Settings_.temp_.cmdErrors_;
  },
  execute_ (message: Partial<ExternalMsgs[kFgReq.command]["req"]> , sender: chrome.runtime.MessageSender
      , exec: (registryEntry: CommandsNS.Item, count: number, lastKey: kKeyCode, port: Port, oCount: number) => void
      ): void {
    let command = message.command;
    command = command ? command + "" : "";
    const description = command ? this.availableCommands_[command] : null;
    if (!description) { return; }
    const port: Port | null = sender.tab ? Backend_.indexPorts_(sender.tab.id, sender.frameId || 0)
            || (Backend_.indexPorts_(sender.tab.id) || [null])[0] : null;
    if (!port && !description[1]) { /** {@link bg.d.ts#CommandsNS.FgDescription} */
      return;
    }
    let options = message.options as CommandsNS.RawOptions | null | undefined
      , lastKey: kKeyCode | undefined = message.key
      , regItem = this.makeCommand_(command, options)
      , count = message.count as number | string | undefined;
    if (!regItem) { return; }
    count = count !== "-" ? parseInt(count as string, 10) || 1 : -1;
    options && typeof options === "object" ?
        BgUtils_.safer_(options) : (options = null);
    lastKey = 0 | <number> lastKey;
    exec(regItem, count, lastKey, port as Port, 0);
  },

defaultKeyMappings_:
  "? " + kCName.showHelp +
  " j " + kCName.scrollDown +
  " k " + kCName.scrollUp +
  " h " + kCName.scrollLeft +
  " l " + kCName.scrollRight +
  " gg " + kCName.scrollToTop +
  " G " + kCName.scrollToBottom +
  " zH " + kCName.scrollToLeft +
  " zL " + kCName.scrollToRight +
  " <c-e> " + kCName.scrollDown +
  " <c-y> " + kCName.scrollUp +
  " d " + kCName.scrollPageDown +
  " u " + kCName.scrollPageUp +
  " r " + kCName.reload +
  " gs " + kCName.toggleViewSource +
  " R " + kCName.reloadGivenTab +
  " <a-R> " + kCName.reopenTab +
  " <a-r> " + kCName.reloadTab +
  " <a-t> " + kCName.createTab +
  " <a-c> " + kCName.previousTab +
  " <a-s-c> " + kCName.nextTab +
  " <a-v> " + kCName.nextTab +
  " i " + kCName.enterInsertMode +
  " v " + kCName.enterVisualMode +
  " V " + kCName.enterVisualLineMode +
  " <f8> " + kCName.enterVisualMode +
  " H " + kCName.goBack +
  " L " + kCName.goForward +
  " gu " + kCName.goUp +
  " gU " + kCName.goToRoot +
  " gi " + kCName.focusInput +
  " f " + kCName.LinkHints_activate +
  " F " + kCName.LinkHints_activateModeToOpenInNewTab +
  " <a-f> " + kCName.LinkHints_activateModeWithQueue +
  " / " + kCName.enterFindMode +
  " n " + kCName.performFind +
  " N " + kCName.performBackwardsFind +
  " <a-n> " + kCName.performAnotherFind +
  " [[ " + kCName.goPrevious +
  " ]] " + kCName.goNext +
  " yy " + kCName.copyCurrentUrl +
  " yf " + kCName.LinkHints_activateModeToCopyLinkUrl +
  " p " + kCName.openCopiedUrlInCurrentTab +
  " P " + kCName.openCopiedUrlInNewTab +
  " K " + kCName.nextTab +
  " J " + kCName.previousTab +
  " gt " + kCName.nextTab +
  " gT " + kCName.previousTab +
  " ^ " + kCName.visitPreviousTab +
  " << " + kCName.moveTabLeft +
  " >> " + kCName.moveTabRight +
  " g0 " + kCName.firstTab +
  " g$ " + kCName.lastTab +
  " W " + kCName.moveTabToNextWindow +
  " t " + kCName.createTab +
  " yt " + kCName.duplicateTab +
  " x " + kCName.removeTab +
  " X " + kCName.restoreTab +
  " <a-p> " + kCName.togglePinTab +
  " <a-m> " + kCName.toggleMuteTab +
  " o " + kCName.Vomnibar_activate +
  " O " + kCName.Vomnibar_activateInNewTab +
  " T " + kCName.Vomnibar_activateTabSelection +
  " b " + kCName.Vomnibar_activateBookmarks +
  " B " + kCName.Vomnibar_activateBookmarksInNewTab +
  " ge " + kCName.Vomnibar_activateUrl +
  " gE " + kCName.Vomnibar_activateUrlInNewTab +
  " gf " + kCName.nextFrame +
  " gF " + kCName.mainFrame +
  " gn " + kCName.toggleVomnibarStyle +
  " <f1> " + kCName.simBackspace +
  " <s-f1> " + kCName.switchFocus +
  " <f2> " + kCName.switchFocus +
  " m " + kCName.Marks_activateCreateMode +
  " ` " + kCName.Marks_activate
,
availableCommands_: <{[key: string]: CommandsNS.Description | undefined} & SafeObject>
    As_<CommandsNS.NameMetaMap & SafeObject>({
  __proto__: null as never,
  "LinkHints.activate": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.DEFAULT } ],
  "LinkHints.activateMode": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.DEFAULT } ],
  "LinkHints.activateModeToCopyLinkText": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.COPY_TEXT } ],
  "LinkHints.activateModeToCopyLinkUrl": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.COPY_URL } ],
  "LinkHints.activateModeToDownloadImage": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.DOWNLOAD_MEDIA } ],
  "LinkHints.activateModeToDownloadLink": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.DOWNLOAD_LINK } ],
  "LinkHints.activateModeToEdit": [ kBgCmd.linkHints, 1, 1, { mode: HintMode.FOCUS_EDITABLE } ],
  "LinkHints.activateModeToHover": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.HOVER } ],
  "LinkHints.activateModeToLeave": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.UNHOVER } ],
  "LinkHints.activateModeToUnhover": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.UNHOVER } ],
  "LinkHints.activateModeToOpenImage": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.OPEN_IMAGE } ],
  "LinkHints.activateModeToOpenIncognito": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.OPEN_INCOGNITO_LINK } ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ kBgCmd.linkHints, 1, 0, {mode: HintMode.OPEN_IN_NEW_FG_TAB} ],
  "LinkHints.activateModeToOpenInNewTab": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.OPEN_IN_NEW_BG_TAB } ],
  "LinkHints.activateModeToOpenVomnibar": [ kBgCmd.linkHints, 1, 1, { mode: HintMode.EDIT_TEXT } ],
  "LinkHints.activateModeToSearchLinkText": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.SEARCH_TEXT } ],
  "LinkHints.activateModeWithQueue": [ kBgCmd.linkHints, 1, 0, { mode: HintMode.OPEN_WITH_QUEUE } ],
  "LinkHints.unhoverLast": [ kFgCmd.unhoverLast, 0, 1 ],
  "Marks.activate": [ kFgCmd.marks, 0, 0 ],
  "Marks.activateCreateMode": [ kFgCmd.marks, 0, 0, { mode: "create" } ],
  "Marks.clearGlobal": [ kBgCmd.clearMarks, 1, 1 ],
  "Marks.clearLocal": [ kBgCmd.clearMarks, 1, 1, { local: true } ],
  "Vomnibar.activate": [ kBgCmd.showVomnibar, 1, 0 ],
  "Vomnibar.activateBookmarks": [ kBgCmd.showVomnibar, 1, 1, { mode: "bookm" } ],
  "Vomnibar.activateBookmarksInNewTab": [ kBgCmd.showVomnibar, 1, 1, { mode: "bookm", newtab: true } ],
  "Vomnibar.activateEditUrl": [ kBgCmd.showVomnibar, 1, 0, { url: true } ],
  "Vomnibar.activateEditUrlInNewTab": [ kBgCmd.showVomnibar, 1, 0, { url: true, newtab: true } ],
  "Vomnibar.activateHistory": [ kBgCmd.showVomnibar, 1, 1, { mode: "history" } ],
  "Vomnibar.activateHistoryInNewTab": [ kBgCmd.showVomnibar, 1, 1, { mode: "history", newtab: true } ],
  "Vomnibar.activateInNewTab": [ kBgCmd.showVomnibar, 1, 0, { newtab: true } ],
  "Vomnibar.activateTabSelection": [ kBgCmd.showVomnibar, 1, 1, { mode: "tab", newtab: true } ],
  "Vomnibar.activateUrl": [ kBgCmd.showVomnibar, 1, 0, { url: true } ],
  "Vomnibar.activateUrlInNewTab": [ kBgCmd.showVomnibar, 1, 0, { url: true, newtab: true } ],
  autoCopy: [ kFgCmd.autoCopy, 0, 1 ],
  autoOpen: [ kFgCmd.autoOpen, 0, 1 ],
  blank: [ kBgCmd.blank, 1, 1 ],
  clearCS: [ kBgCmd.clearCS, 1, 1, { type: "images" } ],
  clearFindHistory: [ kBgCmd.clearFindHistory, 1, 1 ],
  closeDownloadBar: [ kBgCmd.moveTabToNewWindow, 1, 1, { all: 1 } ],
  closeOtherTabs: [ kBgCmd.removeTabsR, 1, 1, { other: true } ],
  closeTabsOnLeft: [ kBgCmd.removeTabsR, 1, 0, { count: -1e6 } ],
  closeTabsOnRight: [ kBgCmd.removeTabsR, 1, 0, { count: 1e6 } ],
  copyCurrentTitle: [ kBgCmd.copyWindowInfo, 1, 1, { type: "title" } ],
  copyCurrentUrl: [ kBgCmd.copyWindowInfo, 1, 1 ],
  copyWindowInfo: [ kBgCmd.copyWindowInfo, 1, 0, { type: "window" } ],
  createTab: [ kBgCmd.createTab, 1, 20 as 0 ],
  debugBackground: [ kBgCmd.openUrl, 1, 1,
    {
      reuse: ReuseType.reuse,
      url: Build.BTypes & ~BrowserType.Chrome &&
            (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
        ? Build.BTypes & BrowserType.Firefox &&
            (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          ? "about:debugging#addons" : Settings_.CONST_.OptionsPage_
        : "chrome://extensions/?id=$id",
      id_mask: "$id"
    }],
  discardTab: [ kBgCmd.discardTab, 1, /* 20 in main.ts */ 0 ],
  duplicateTab: [ kBgCmd.duplicateTab, 1, 20 as 0 ],
  editText: [ kFgCmd.editText, 0, 0 ],
  enableCSTemp: [ kBgCmd.toggleCS, 1, 0, { type: "images", incognito: true } ],
  enterFindMode: [ kBgCmd.performFind, 1, 1, {active: true, selected: true} ],
  enterInsertMode: [ kBgCmd.enterInsertMode, 1, 1 ],
  enterVisualLineMode: [ kBgCmd.enterVisualMode, 1, 1, { mode: "line" } ],
  enterVisualMode: [ kBgCmd.enterVisualMode, 1, 1 ],
  firstTab: [ kBgCmd.goToTab, 1, 0, { absolute: true } ],
  focusInput: [ kFgCmd.focusInput, 0, 0 ],
  focusOrLaunch: [ kBgCmd.openUrl, 1, 1, { reuse: ReuseType.reuse } ],
  goBack: [ kFgCmd.framesGoBack, 0, 0, { count: -1 } ],
  goForward: [ kFgCmd.framesGoBack, 0, 0 ],
  goNext: [ kBgCmd.goNext, 1, 1 ],
  goPrevious: [ kBgCmd.goNext, 1, 1, { rel: "prev" } ],
  goToRoot: [ kBgCmd.goUp, 1, 0 ],
  goUp: [ kBgCmd.goUp, 1, 0, { count: -1 } ],
  joinTabs: [ kBgCmd.joinTabs, 1, 1 ],
  lastTab: [ kBgCmd.goToTab, 1, 0, { count: -1, absolute: true } ],
  mainFrame: [ kBgCmd.mainFrame, 1, 1 ],
  moveTabLeft: [ kBgCmd.moveTab, 1, 0, { count: -1 } ],
  moveTabRight: [ kBgCmd.moveTab, 1, 0 ],
  moveTabToIncognito: [ kBgCmd.moveTabToNewWindow, 1, 1, { incognito: true } ],
  moveTabToNewWindow: [ kBgCmd.moveTabToNewWindow, 1, /** 30 in main.ts */ 0 ],
  moveTabToNextWindow: [ kBgCmd.moveTabToNextWindow, 1, 0 ],
  nextFrame: [ kBgCmd.nextFrame, 1, 0 ],
  nextTab: [ kBgCmd.goToTab, 1, 0 ],
  openCopiedUrlInCurrentTab: [ kBgCmd.openUrl, 1, 1, { reuse: ReuseType.current, copied: true } ],
  openCopiedUrlInNewTab: [ kBgCmd.openUrl, 1, 20 as 0, {copied: true} ],
  openUrl: [ kBgCmd.openUrl, 1, 20 as 0 ],
  parentFrame: [ kBgCmd.parentFrame, 1, 0 ],
  passNextKey: [ kFgCmd.passNextKey, 0, 0 ],
  performAnotherFind: [ kBgCmd.performFind, 1, 0, { index: "other" } ],
  performBackwardsFind: [ kBgCmd.performFind, 1, 0, { count: -1 } ],
  performFind: [ kBgCmd.performFind, 1, 0 ],
  previousTab: [ kBgCmd.goToTab, 1, 0, { count: -1 } ],
  quickNext: [ kBgCmd.goToTab, 1, 0 ],
  reload: [ kFgCmd.reload, 0, 1 ],
  reloadGivenTab: [ kBgCmd.reloadTab, 1, 0, { single: true } ],
  reloadTab: [ kBgCmd.reloadTab, 1, /** 20 in main.ts */ 0 ],
  removeRightTab: [ kBgCmd.removeRightTab, 1, 0 ],
  removeTab: [ kBgCmd.removeTab, 1, /** 20 in main.ts */ 0 ],
  reopenTab: [ kBgCmd.reopenTab, 1, 1 ],
  restoreGivenTab: [ kBgCmd.restoreGivenTab, 1, 0 ],
  restoreTab: [ kBgCmd.restoreTab, 1, 25 as 0 ],
  scrollDown: [ kFgCmd.scroll, 0, 0 ],
  scrollFullPageDown: [ kFgCmd.scroll, 0, 0, { view: 2 } ],
  scrollFullPageUp: [ kFgCmd.scroll, 0, 0, { dir: -1, view: 2 } ],
  scrollLeft: [ kFgCmd.scroll, 0, 0, { dir: -1, axis: "x" } ],
  scrollPageDown: [ kFgCmd.scroll, 0, 0, { dir: 0.5, view: 2 } ],
  scrollPageUp: [ kFgCmd.scroll, 0, 0, { dir: -0.5, view: 2 } ],
  scrollPxDown: [ kFgCmd.scroll, 0, 0, { view: 1 } ],
  scrollPxLeft: [ kFgCmd.scroll, 0, 0, { dir: -1, axis: "x", view: 1 } ],
  scrollPxRight: [ kFgCmd.scroll, 0, 0, { axis: "x", view: 1 } ],
  scrollPxUp: [ kFgCmd.scroll, 0, 0, { dir: -1, view: 1 } ],
  scrollRight: [ kFgCmd.scroll, 0, 0, { axis: "x" } ],
  scrollTo: [ kFgCmd.scroll, 0, 0, { dest: "min" } ],
  scrollToBottom: [ kFgCmd.scroll, 0, 0, { dest: "max" } ],
  scrollToLeft: [ kFgCmd.scroll, 0, 0, { axis: "x", dest: "min" } ],
  scrollToRight: [ kFgCmd.scroll, 0, 0, { axis: "x", dest: "max" } ],
  scrollToTop: [ kFgCmd.scroll, 0, 0, { dest: "min" } ],
  scrollUp: [ kFgCmd.scroll, 0, 0, { dir: -1 } ],
  searchAs: [ kFgCmd.searchAs, 0, 1, { copied: true, selected: true } ],
  searchInAnother: [ kBgCmd.searchInAnother, 1, 1 ],
  showHelp: [ kBgCmd.showHelp, 1, 1 ],
  showTip: [ kBgCmd.showTip, 1, 1 ],
  simBackspace: [ kFgCmd.switchFocus, 0, 1, { act: "backspace" } ],
  switchFocus: [ kFgCmd.switchFocus, 0, 1 ],
  toggleCS: [ kBgCmd.toggleCS, 1, 0, { type: "images" } ],
  toggleLinkHintCharacters: [ kBgCmd.toggle, 1, 1, { key: "linkHintCharacters" } ],
  toggleMuteTab: [ kBgCmd.toggleMuteTab, 1, 1 ],
  togglePinTab: [ kBgCmd.togglePinTab, 1, /** 30 in main.ts */ 0 ],
  toggleSwitchTemp: [ kBgCmd.toggle, 1, 1 ],
  toggleViewSource: [ kBgCmd.toggleViewSource, 1, 1 ],
  toggleVomnibarStyle: [ kBgCmd.toggleVomnibarStyle, 1, 1, { style: "dark" } ],
  visitPreviousTab: [ kBgCmd.visitPreviousTab, 1, 0 ],
  zoomIn: [ kBgCmd.toggleZoom, 1, 0 ],
  zoomOut: [ kBgCmd.toggleZoom, 1, 0, { count: -1 } ]
})
},
CommandsData_: CommandsDataTy = CommandsData_ as never || {
  keyToCommandRegistry_: null as never as SafeDict<CommandsNS.Item>,
  builtinKeys_: null,
  keyFSM_: null as never as KeyFSM,
  shortcutRegistry_: null as never as ShortcutInfoMap,
  mappedKeyRegistry_: null as SafeDict<string> | null,
  hintModes_: {
    focus: HintMode.FOCUS,
    hover: HintMode.HOVER,
    input: HintMode.FOCUS_EDITABLE,
    leave: HintMode.UNHOVER,
    unhover: HintMode.UNHOVER,
    text: HintMode.COPY_TEXT,
    "copy-text": HintMode.COPY_TEXT,
    url: HintMode.COPY_URL,
    image: HintMode.OPEN_IMAGE
  },
  visualKeys_: {
    l: VisualAction.char | VisualAction.inc, h: VisualAction.char | VisualAction.dec,
    j: VisualAction.line | VisualAction.inc, k: VisualAction.line | VisualAction.dec,
    $: VisualAction.lineBoundary | VisualAction.inc, 0: VisualAction.lineBoundary | VisualAction.dec,
    "}": VisualAction.paragraph | VisualAction.inc, "{": VisualAction.paragraph | VisualAction.dec,
    ")": VisualAction.sentence | VisualAction.inc, "(": VisualAction.sentence | VisualAction.dec,
    w: VisualAction.vimWord | VisualAction.inc, /* same as w */ W: VisualAction.vimWord | VisualAction.inc,
    e: VisualAction.word | VisualAction.inc, b: VisualAction.word | VisualAction.dec,
    /* same as b */ B: VisualAction.word | VisualAction.dec,
    G: VisualAction.documentBoundary | VisualAction.inc, g: { g: VisualAction.documentBoundary | VisualAction.dec },
  
    o: VisualAction.Reverse, a: { w: VisualAction.LexicalWord, s: VisualAction.LexicalSentence },
  
    y: VisualAction.Yank, Y: VisualAction.YankLine, C: VisualAction.YankWithoutExit,
    p: VisualAction.YankAndOpen, P: VisualAction.YankAndNewTab,
  
    n: VisualAction.FindNext, N: VisualAction.FindPrevious,
    f1: VisualAction.HighlightRange, "a-f1": VisualAction.HighlightRange,
  
    v: VisualAction.VisualMode, V: VisualAction.VisualLineMode, c: VisualAction.CaretMode,
    "/": VisualAction.EmbeddedFindMode,
  
    "c-e": VisualAction.ScrollDown, "c-y": VisualAction.ScrollUp,
    "c-down": VisualAction.ScrollDown, "c-up": VisualAction.ScrollUp
  } as { [key: string]: VisualAction | { [key: string]: VisualAction } } as VisualModeNS.KeyMap
};

if (!Build.NDEBUG) {
  Commands.availableCommands_[CommandsNS.OtherCNames.focusOptions] = [
    kBgCmd.openUrl, 1, 1, { reuse: ReuseType.reuse, url: "vimium://options" }
  ];
  Commands.defaultKeyMappings_ += ` <a-s-f12> ${kCName.debugBackground} <s-f12> ${CommandsNS.OtherCNames.focusOptions}`;
}
if (Backend_.onInit_) {
  if (Settings_.temp_.initing_ & BackendHandlersNS.kInitStat.platformInfo) {
    Commands.parseKeyMappings_(Settings_.get_("keyMappings"));
    Commands.populateKeyMap_(true);
    if (!Settings_.get_("vimSync") && !Settings_.temp_.hasEmptyLocalStorage_) {
      Commands = null as never;
    }
  }
  Build.BTypes & BrowserType.Edge && !chrome.commands ||
  (chrome.commands.onCommand as chrome.events.Event<
        (command: keyof ShortcutInfoMap | kShortcutAliases & string, exArg: FakeArg) => void
      >).addListener(Backend_.ExecuteShortcut_);
}
if (Commands) {
Settings_.updateHooks_.keyMappings = function (this: {}, value: string | null): void {
  value != null && Commands.parseKeyMappings_(value);
  Commands.populateKeyMap_(value != null);
  Settings_.broadcast_({
    N: kBgReq.keyFSM,
    m: CommandsData_.mappedKeyRegistry_,
    k: CommandsData_.keyFSM_
  });
  Settings_.broadcastOmni_({
    N: kBgReq.omni_updateOptions,
    d: {
      k: CommandsData_.mappedKeyRegistry_
    }
  });
};
}
