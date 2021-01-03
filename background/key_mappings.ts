interface EnvCond {
  sys?: string
  browser?: BrowserType
}
type RawCmdDesc<c extends kCName, e extends CmdNameIds[c] = CmdNameIds[c]> =
    e extends keyof CmdOptions ? [e, 0, 0 | 1, CmdOptions[e]?]
    : e extends keyof BgCmdOptions ? [e, 1, 0 | 1, Partial<BgCmdOptions[e] & {count: number}>?]
    : never
/** [ enum, is background, count limit, default options ] */
type NameMetaMap = {
  readonly [k in kCName]: k extends kCName ? RawCmdDesc<k> : never
}
type NameMetaMapEx = NameMetaMap & {
  readonly [k in keyof OtherCNamesForDebug]: OtherCNamesForDebug[k] extends keyof BgCmdOptions
      ? [OtherCNamesForDebug[k], 1, 0 | 1, Partial<BgCmdOptions[OtherCNamesForDebug[k]]>?]
      : never
}

// eslint-disable-next-line no-var
declare var CommandsData_: CommandsDataTy

var AsC_ = <T extends kCName> (i: T): T => i
// eslint-disable-next-line no-var
var KeyMappings = {
  getOptions_ (item: string[], start: number): CommandsNS.Options | null {
    let opt: CommandsNS.RawOptions, i = start, len = item.length, ind: number, str: string | undefined, val: string;
    if (len <= i) { return null; }
    opt = BgUtils_.safeObj_();
    while (i < len) {
      str = item[i++];
      ind = str.indexOf("=");
      if (ind === 0 || str === "__proto__"
          || str[0] === "$" && !"$if=$key=$desc=$count=".includes(str.slice(0, ind + 1))) {
        this.logError_("%s option key:", ind === 0 ? "Missing" : "Unsupported", str);
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
    if (!details) { details = this.availableCommands_[command]!; }
    let opt: CommandsNS.Options | null, help: CommandsNS.CustomHelpInfo | null = null
      , repeat = details[2];
    opt = details.length < 4 ? null : BgUtils_.safer_(details[3]!);
    if (options) {
      if (options.$count) {
        let n = parseFloat(options.$count) || 1;
        delete options.$count;
        options.count = n;
      } else if ("count" in options) {
        options.count = details[2] === 1 ? 1 : (parseFloat(options.count) || 1) * (opt && opt.count || 1);
      }
      if (options.$desc || options.$key) {
        help = { key_: options.$key || "", desc_: options.$desc || "" };
        delete options.$key;
        delete options.$desc;
      }
      if (options.$if) {
        if (this.doesNotMatchEnv_(options)) {
          return null;
        }
        delete options.$if;
      }
      if (opt) {
        BgUtils_.extendIf_(options, opt);
      }
      if (details[0] === kFgCmd.linkHints && !details[1]) {
        let mode: number | string | null | undefined = options.mode, stdMode = (options as OptionalHintsOptions).m!
        const rawChars: string | null | undefined = options.characters
        const chars = rawChars && Settings_.updatePayload_<"c" | "n">("c", rawChars)
        type OptionalHintsOptions = Partial<HintsNS.Options>;
        if (rawChars) {
          delete options.characters;
          (options as OptionalHintsOptions).c = chars!
        }
        if (mode != null) {
          delete options.mode
          if (typeof mode !== "number") {
            mode = (this.hintModes_[(options as OptionalHintsOptions).action || mode || 0
              ] as number | undefined | {} as number) | 0;
          }
        } else {
          mode = stdMode
        }
        if (mode > HintMode.max_mouse_events) {
          mode = mode === HintMode.EDIT_TEXT ? (options as OptionalHintsOptions).url ? HintMode.EDIT_LINK_URL : mode
            : mode === HintMode.COPY_TEXT
              ? (options as OptionalHintsOptions).join ? HintMode.COPY_TEXT | HintMode.queue | HintMode.list : mode
            : mode > HintMode.min_disable_queue + HintMode.queue - 1 ? mode - HintMode.queue : mode;
        }
        if (mode != stdMode) {
          (options as OptionalHintsOptions).m = mode
        }
        repeat = mode > HintMode.min_disable_queue - 1 ? 1 : repeat;
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
      repeat_: repeat
    };
  },
  doesNotMatchEnv_ (options: CommandsNS.RawOptions | null): boolean | null {
    const condition: EnvCond | null | undefined = options && options.$if;
    return condition ? !!condition.sys && condition.sys !== Settings_.CONST_.Platform_
        || !!condition.browser
          && !(condition.browser & (Build.BTypes & ~BrowserType.Chrome
                  && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge
                ? OnOther : Build.BTypes & BrowserType._mask))
        : null
  },
  // eslint-disable-next-line object-shorthand
  parseKeyMappings_: (function (this: {}, line: string): void {
    let key: string | undefined, lines: string[], splitLine: string[], mk = 0, _i: number
      , _len: number, details: CommandsNS.Description | undefined, errors = 0, ch: number
      , registry: CommandsDataTy["keyToCommandRegistry_"] = new Map()
      , cmdMap: CommandsDataTy["shortcutRegistry_"] = new Map()
      , builtinKeys: TextSet | null = null
      , regItem: CommandsNS.Item | null
      , mkReg = BgUtils_.safeObj_<string>();
    const a = this as typeof KeyMappings, available = a.availableCommands_;
    const colorRed = "color:red", shortcutLogPrefix = 'Shortcut %c"%s"';
    CommandsData_.errors_ = null
    lines = line.replace(<RegExpSearchable<0>> /\\\\?\n/g, t => t.length === 3 ? "\\\n" : ""
               ).replace(<RegExpG> /[\t ]+/g, " ").split("\n");
    if (lines[0] !== "unmapAll" && lines[0] !== "unmapall") {
      builtinKeys = new Set!()
      const defaultMap = a.defaultKeyMappings_.split(" ");
      for (_i = defaultMap.length; 0 < _i; ) {
        _i -= 2;
        registry.set(defaultMap[_i], a.makeCommand_(defaultMap[_i + 1])!)
        builtinKeys.add(defaultMap[_i])
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
        key = splitLine[1] || ""
        if (!key || key === "__proto__") {
          a.logError_('Unsupported key sequence %c"%s"', colorRed, key || '""', `for "${splitLine[2] || ""}"`);
        } else if (registry.has(key) && !(builtinKeys && builtinKeys.has(key))) {
          a.logError_('Key %c"%s"', colorRed, key, "has been mapped to", registry.get(key)!.command_)
        } else if (splitLine.length < 3) {
          a.logError_('Lacking command when mapping %c"%s"', colorRed, key);
        } else if (!(details = available[splitLine[2]])) {
          a.logError_('Command %c"%s"', colorRed, splitLine[2], "doesn't exist!");
        } else if ((ch = key.charCodeAt(0)) > kCharCode.maxNotNum && ch < kCharCode.minNotNum
            || ch === kCharCode.dash) {
          a.logError_('Invalid key: %c"%s"', colorRed, key, "(the first char can not be '-' or number)");
        } else {
          regItem = a.makeCommand_(splitLine[2], a.getOptions_(splitLine, 3), details);
          if (regItem) {
            registry.set(key, regItem)
            builtinKeys && builtinKeys.delete(key)
          }
          continue;
        }
      } else if (key === "unmapAll" || key === "unmapall") {
        registry = new Map()
        cmdMap = new Map()
        builtinKeys = null;
        mkReg = BgUtils_.safeObj_<string>(), mk = 0;
        if (errors > 0) {
          a.logError_("All key mappings is unmapped, but there %s been %c%d error%s%c before this instruction"
            , errors > 1 ? "have" : "has", colorRed, errors, errors > 1 ? "s" : "", "color:auto");
        }
        continue;
      } else if (key === "mapkey" || key === "mapKey") {
        if (splitLine.length === 4) {
          const doesNotMatchEnv = a.doesNotMatchEnv_(a.getOptions_(splitLine, 3));
          if (doesNotMatchEnv != null) {
            if (doesNotMatchEnv) { continue }
            splitLine.length = 3;
          }
        }
        if (splitLine.length !== 3) {
          a.logError_(`mapKey: need %s source and target keys:`, splitLine.length > 3 ? "only" : "both", line);
        } else if ((key = splitLine[1]).length > 1
            && !(<RegExpOne> /^<(?!<[^:])([acms]-){0,4}.\w*?(:[a-z])?>$/).test(key)) {
          a.logError_("mapKey: a source key should be a single key with an optional mode id:", line);
        } else if (splitLine[2].length > 1 && !(<RegExpOne> /^<(?!<)(.-){0,4}.\w*?>$/).test(splitLine[2])) {
          a.logError_("mapKey: a target key should be a single key:", line);
        } else if (key = BgUtils_.stripKey_(key), key in mkReg && mkReg[key] !== BgUtils_.stripKey_(splitLine[2])) {
          key = mkReg[key]!;
          a.logError_('The key %c"%s"', colorRed, splitLine[1], "has been mapped to another key:"
              , key.length > 1 ? `<${key}>` : key);
        } else {
          mkReg[key] = BgUtils_.stripKey_(splitLine[2]);
          mk++;
          continue;
        }
      } else if (key === "shortcut" || key === "command") {
        key = splitLine[1];
        if (splitLine.length < 3) {
          a.logError_("Lacking command name and options in shortcut:", line);
        } else if (!(key.startsWith(CNameLiterals.userCustomized) && key.length > 14)
            && (Settings_.CONST_.GlobalCommands_ as Array<StandardShortcutNames | string>).indexOf(key) < 0) {
          a.logError_(shortcutLogPrefix, colorRed, key, "is not a valid name");
        } else if (cmdMap.has(key as StandardShortcutNames)) {
          a.logError_(shortcutLogPrefix, colorRed, key, "has been configured");
        } else {
          key = a.setupUserCustomized_(cmdMap, key as StandardShortcutNames, a.getOptions_(splitLine, 2))
          if (!key) { continue; }
          a.logError_(shortcutLogPrefix, colorRed, splitLine[1], key);
        }
      } else if (key !== "unmap") {
        a.logError_('Unknown mapping command: %c"%s"', colorRed, key, "in", line);
      } else if (splitLine.length !== 2) {
        a.logError_("Unmap needs one mapped key:", line);
      } else if (registry.has(key = splitLine[1])) {
        builtinKeys && builtinKeys.delete(key)
        registry.delete(key)
        continue;
      } else {
        a.logError_('Unmapping: %c"%s"', colorRed, key, "has not been mapped");
      }
      ++errors;
    }
    for (const shortcut of Settings_.CONST_.GlobalCommands_) {
      if (!shortcut.startsWith("user") && !cmdMap.has(shortcut)) {
        if (regItem = a.makeCommand_(shortcut)) {
          cmdMap.set(shortcut, regItem)
        }
      }
    }
    CommandsData_.keyToCommandRegistry_ = registry;
    CommandsData_.builtinKeys_ = builtinKeys;
    CommandsData_.shortcutRegistry_ = cmdMap
    CommandsData_.mappedKeyRegistry_ = Settings_.omniPayload_.k = mk > 0 ? mkReg : null;
    Settings_.temp_.cmdErrors_ = Settings_.temp_.cmdErrors_ > 0 ? ~errors : errors;
  }),
  setupUserCustomized_ (cmdMap: CommandsDataTy["shortcutRegistry_"], key: StandardShortcutNames
      , options: CommandsNS.Options | null): string {
    let has_cmd: BOOL = 1
      , command: string = options && options.command || (has_cmd = 0, key.startsWith("user") ? "" : key)
      , regItem: CommandsNS.Item | null
      , ret: 0 | 1 | 2 = command ? 1 : 0;
    if (ret && (command in this.availableCommands_)) {
      has_cmd && delete (options as CommandsNS.RawOptions).command;
      if (regItem = this.makeCommand_(command, options)) {
        cmdMap.set(key, regItem)
      }
      ret = 2;
    }
    return ret < 1 ? 'requires a "command" option' : ret > 1 ? "" : "gets an unknown command";
  },
  collectMapKeyTypes_ (this: void, mapKeys: NonNullable<CommandsDataTy["mappedKeyRegistry_"]>): kMapKey {
    let types = kMapKey.NONE
    for (const key in mapKeys) {
      const len = key.length
      if (len < 2) {
        const val = mapKeys[key]!
        types |= val.length > 1 ? kMapKey.normal | kMapKey.normal_long
            : key.toUpperCase() !== key && val.toUpperCase() !== val ? kMapKey.char : kMapKey.normal
      } else if (len > 2 && key[len - 2] === GlobalConsts.DelimeterForKeyCharAndMode) {
        types |= key[len - 1] === GlobalConsts.InsertModeId ? kMapKey.insertMode : kMapKey.otherMode
      } else {
        types |= mapKeys[key]!.length > 1 ? kMapKey.normal | kMapKey.normal_long : kMapKey.normal
      }
    }
    return types
  },
  populateKeyMap_: (function (this: void, hasFoundChanges: boolean): void {
    const d = CommandsData_, ref = d.keyFSM_ = BgUtils_.safeObj_<ValidKeyAction | ChildKeyFSM>(),
    keyRe = BgUtils_.keyRe_,
    strip = BgUtils_.stripKey_,
    builtinKeys = d.builtinKeys_,
    allKeys = BgUtils_.keys_(d.keyToCommandRegistry_),
    mappedKeyReg = CommandsData_.mappedKeyRegistry_,
    customKeys = builtinKeys ? allKeys.filter(i => !builtinKeys.has(i)) : allKeys,
    countOfCustomKeys = customKeys.length,
    sortedKeys = builtinKeys ? customKeys.concat(BgUtils_.keys_(builtinKeys)) : allKeys,
    C = KeyMappings,
    d2 = Settings_.temp_, oldErrors = d2.cmdErrors_;
    if (oldErrors < 0) { d2.cmdErrors_ = ~oldErrors; }
    if (hasFoundChanges) {
      const mayHaveInsert = allKeys.join().includes(":i>") ? kMapKey.directInsert : kMapKey.NONE
      d.mappedKeyTypes_ = mappedKeyReg ? C.collectMapKeyTypes_(mappedKeyReg) | mayHaveInsert : mayHaveInsert
    }
    for (let ch = 10; 0 <= --ch; ) { ref[ch] = KeyAction.count; }
    ref["-"] = KeyAction.count;
    for (let index = 0; index < sortedKeys.length; index++) {
      const key = sortedKeys[index];
      const arr = key.match(keyRe)!, last = arr.length - 1;
      if (last === 0) {
        let key2 = strip(key);
        if (key2 in ref) {
          if (index >= countOfCustomKeys) {
            d.keyToCommandRegistry_.delete(key)
            continue;
          }
          hasFoundChanges && C.warnInactive_(ref[key2] as ReadonlyChildKeyFSM, key);
        }
        ref[key2] = KeyAction.cmd;
        continue;
      }
      let ref2 = ref as ChildKeyFSM, tmp: ChildKeyFSM | ValidChildKeyAction | undefined, j = 0;
      while ((tmp = ref2[strip(arr[j])]) && j < last) { j++; ref2 = tmp; }
      if (tmp != null && (index >= countOfCustomKeys || tmp === KeyAction.cmd)) {
        index >= countOfCustomKeys ? d.keyToCommandRegistry_.delete(key) :
        hasFoundChanges && C.warnInactive_(key, arr.slice(0, j + 1).join(""));
        continue;
      }
      tmp != null && hasFoundChanges && C.warnInactive_(tmp, key);
      while (j < last) { ref2 = ref2[strip(arr[j++])] = BgUtils_.safeObj_() as ChildKeyFSM; }
      ref2[strip(arr[last])] = KeyAction.cmd;
    }
    if (hasFoundChanges && d2.cmdErrors_) {
      console.log("%c%o errors found.", "background-color:#fffbe5", d2.cmdErrors_);
    } else if (oldErrors < 0) {
      console.log("The new key mappings have no errors");
    }
    CommandsData_.builtinKeys_ = null;
    if (hasFoundChanges && CommandsData_.errors_) {
      console.groupEnd();
    }
    const maybePassed = Exclusions.getAllPassed_();
    const func = function (obj: ChildKeyFSM): void {
      for (const key in obj) {
        const val = obj[key]!;
        if (val !== KeyAction.cmd) { func(val); }
        else if (maybePassed !== true && ref[key] === KeyAction.cmd && !(maybePassed && key in maybePassed)
            || key.startsWith("v-")) {
          delete obj[key];
        }
      }
    };
    for (const key in ref) {
      const val = ref[key]!;
      if (val === KeyAction.cmd) {
        if (key.startsWith("v-")) {
          delete ref[key]
        }
      } else if (val !== KeyAction.count) {
        func(val)
      }
    }
  }) as (this: void, detectNewError: boolean) => void,
  logError_: function (): void {
    if (!CommandsData_.errors_) {
      console.group("Errors in custom Key mappings:");
      CommandsData_.errors_ = [];
    }
    CommandsData_.errors_.push([].slice.call(arguments, 0))
    console.log.apply(console, arguments);
  } as (firstMsg: string, ...args: any[]) => void ,
  warnInactive_ (obj: ReadonlyChildKeyFSM | string, newKey: string): void {
    this.logError_('Inactive key: %o with "%s"', obj, newKey);
    ++Settings_.temp_.cmdErrors_;
  },
  execute_ (message: Partial<ExternalMsgs[kFgReq.command]["req"]>, sender: chrome.runtime.MessageSender
      , exec: (registryEntry: CommandsNS.Item, count: number, lastKey: kKeyCode, port: Port, oCount: number) => void
      ): void {
    let command = message.command;
    command = command ? command + "" : "";
    const description = command ? this.availableCommands_[command] : null;
    if (!description) { return; }
    const port: Port | null = sender.tab ? Backend_.indexPorts_(sender.tab.id, sender.frameId || 0)
            || (Backend_.indexPorts_(sender.tab.id) || [null])[0] : null;
    if (!port && !description[1]) { /** {@link index.d.ts#CommandsNS.FgDescription} */
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
    lastKey = 0 | lastKey!;
    exec(regItem, count, lastKey, port!, 0);
  },

defaultKeyMappings_:
  "? "     +AsC_("showHelp")           +" d "     +AsC_("scrollPageDown")  +" f "      +AsC_("LinkHints.activate")  +
  " gf "   +AsC_("nextFrame")          +" gg "    +AsC_("scrollToTop")     +" gi "     +AsC_("focusInput")          +
  " gn "   +AsC_("toggleVomnibarStyle")+" gs "    +AsC_("toggleViewSource")+" gt "     +AsC_("nextTab")             +
  " gu "   +AsC_("goUp")               +" gF "    +AsC_("mainFrame")       +" gT "     +AsC_("previousTab")         +
  " gU "   +AsC_("goToRoot")           +" g0 "    +AsC_("firstTab")        +" g$ "     +AsC_("lastTab")             +
  " h "    +AsC_("scrollLeft")         +" i "     +AsC_("enterInsertMode") +" j "      +AsC_("scrollDown")          +
  " k "    +AsC_("scrollUp")           +" l "     +AsC_("scrollRight")     +" n "      +AsC_("performFind")         +
  " o "    +AsC_("Vomnibar.activate")  +" r "     +AsC_("reload")          +" t "      +AsC_("createTab")           +
  " u "    +AsC_("scrollPageUp")       +" v "     +AsC_("enterVisualMode") +" x "      +AsC_("removeTab")           +
  " yt "   +AsC_("duplicateTab")       +" yy "    +AsC_("copyCurrentUrl")  +" zH "     +AsC_("scrollToLeft")        +
  " zL "   +AsC_("scrollToRight")      +" G "     +AsC_("scrollToBottom")  +" H "      +AsC_("goBack")              +
  " L "    +AsC_("goForward")          +" R "     +AsC_("reloadGivenTab")  +" V "      +AsC_("enterVisualLineMode") +
  " K "    +AsC_("nextTab")            +" J "     +AsC_("previousTab")     +" N "      +AsC_("performBackwardsFind")+
  " W "    +AsC_("moveTabToNextWindow")+" X "     +AsC_("restoreTab")      +" / "      +AsC_("enterFindMode")       +
  " ` "    +AsC_("Marks.activate")     +" ^ "     +AsC_("visitPreviousTab")+" [[ "     +AsC_("goPrevious")          +
  " ]] "   +AsC_("goNext")             +" << "    +AsC_("moveTabLeft")     +" >> "     +AsC_("moveTabRight")        +
  " <a-c> "+AsC_("previousTab")        +" <a-v> " +AsC_("nextTab")         +" <a-m> "  +AsC_("toggleMuteTab")       +
  " <a-n> "+AsC_("performAnotherFind") +" <a-p> " +AsC_("togglePinTab")    +" <a-r> "  +AsC_("reloadTab")           +
  " <a-t> "+AsC_("createTab")          +" <a-R> " +AsC_("reopenTab")       +" <c-e> "  +AsC_("scrollDown")          +
  " <c-y> "+AsC_("scrollUp")           +" <f1> "  +AsC_("simBackspace")    +" <f2> "   +AsC_("switchFocus")         +
  " <f8> " +AsC_("enterVisualMode")    +" <s-f1> "+AsC_("switchFocus")     +" <a-s-c> "+AsC_("nextTab")             +
  " b "    +AsC_("Vomnibar.activateBookmarks")         + " ge "    + AsC_("Vomnibar.activateUrl")                   +
  " gE "   +AsC_("Vomnibar.activateUrlInNewTab")       + " m "     + AsC_("Marks.activateCreateMode")               +
  " p "    +AsC_("openCopiedUrlInCurrentTab")          + " yf "    + AsC_("LinkHints.activateModeToCopyLinkUrl")    +
  " B "    +AsC_("Vomnibar.activateBookmarksInNewTab") + " F "     + AsC_("LinkHints.activateModeToOpenInNewTab")   +
  " O "    +AsC_("Vomnibar.activateInNewTab")          + " P "     + AsC_("openCopiedUrlInNewTab")                  +
  " T "    +AsC_("Vomnibar.activateTabSelection")      + " <a-f> " + AsC_("LinkHints.activateModeWithQueue")        +
  ""
,
availableCommands_: <{[key: string]: CommandsNS.Description | undefined} & SafeObject>
    As_<NameMetaMap & SafeObject>({
  __proto__: null as never,
  "LinkHints.activate": [ kFgCmd.linkHints, 0, 0, { m: HintMode.DEFAULT } ],
  "LinkHints.activateMode": [ kFgCmd.linkHints, 0, 0, { m: HintMode.DEFAULT } ],
  "LinkHints.activateModeToCopyLinkText": [ kFgCmd.linkHints, 0, 0, { m: HintMode.COPY_TEXT } ],
  "LinkHints.activateModeToCopyLinkUrl": [ kFgCmd.linkHints, 0, 0, { m: HintMode.COPY_URL } ],
  "LinkHints.activateModeToDownloadImage": [ kFgCmd.linkHints, 0, 0, { m: HintMode.DOWNLOAD_MEDIA } ],
  "LinkHints.activateModeToDownloadLink": [ kFgCmd.linkHints, 0, 0, { m: HintMode.DOWNLOAD_LINK } ],
  "LinkHints.activateModeToEdit": [ kFgCmd.linkHints, 0, 1, { m: HintMode.FOCUS_EDITABLE } ],
  "LinkHints.activateModeToHover": [ kFgCmd.linkHints, 0, 0, { m: HintMode.HOVER } ],
  "LinkHints.activateModeToLeave": [ kFgCmd.linkHints, 0, 0, { m: HintMode.UNHOVER } ],
  "LinkHints.activateModeToUnhover": [ kFgCmd.linkHints, 0, 0, { m: HintMode.UNHOVER } ],
  "LinkHints.activateModeToOpenImage": [ kFgCmd.linkHints, 0, 0, { m: HintMode.OPEN_IMAGE } ],
  "LinkHints.activateModeToOpenIncognito": [ kFgCmd.linkHints, 0, 0, { m: HintMode.OPEN_INCOGNITO_LINK } ],
  "LinkHints.activateModeToOpenInNewForegroundTab": [ kFgCmd.linkHints, 0, 0, {m: HintMode.OPEN_IN_NEW_FG_TAB} ],
  "LinkHints.activateModeToOpenInNewTab": [ kFgCmd.linkHints, 0, 0, { m: HintMode.OPEN_IN_NEW_BG_TAB } ],
  "LinkHints.activateModeToOpenVomnibar": [ kFgCmd.linkHints, 0, 1, { m: HintMode.EDIT_TEXT } ],
  "LinkHints.activateModeToSearchLinkText": [ kFgCmd.linkHints, 0, 0, { m: HintMode.SEARCH_TEXT } ],
  "LinkHints.activateModeToSelect": [ kFgCmd.linkHints, 0, 0, { m: HintMode.ENTER_VISUAL_MODE } ],
  "LinkHints.activateModeWithQueue": [ kFgCmd.linkHints, 0, 0, { m: HintMode.OPEN_WITH_QUEUE } ],
  "LinkHints.click": [ kFgCmd.linkHints, 0, 0, { direct: true, m: HintMode.DEFAULT } ],
  "LinkHints.unhoverLast": [ kFgCmd.insertMode, 0, 1, { u: true } ],
  "Marks.activate": [ kFgCmd.marks, 0, 0 ],
  "Marks.activateCreateMode": [ kFgCmd.marks, 0, 0, { mode: "create" } ],
  "Marks.activateGotoMode": [ kFgCmd.marks, 0, 0 ],
  "Marks.clearGlobal": [ kBgCmd.clearMarks, 1, 1 ],
  "Marks.clearLocal": [ kBgCmd.clearMarks, 1, 1, { local: true } ],
  "Vomnibar.activate": [ kBgCmd.showVomnibar, 1, 0 ],
  "Vomnibar.activateBookmarks": [ kBgCmd.showVomnibar, 1, 1, { mode: "bookm", autoSelect: 1 } ],
  "Vomnibar.activateBookmarksInNewTab": [ kBgCmd.showVomnibar, 1, 1, { mode: "bookm", newtab: 1, autoSelect: 1 } ],
  "Vomnibar.activateEditUrl": [ kBgCmd.showVomnibar, 1, 0, { url: true } ],
  "Vomnibar.activateEditUrlInNewTab": [ kBgCmd.showVomnibar, 1, 0, { url: true, newtab: 1 } ],
  "Vomnibar.activateHistory": [ kBgCmd.showVomnibar, 1, 1, { mode: "history", autoSelect: 1 } ],
  "Vomnibar.activateHistoryInNewTab": [ kBgCmd.showVomnibar, 1, 1, { mode: "history", newtab: 1, autoSelect: 1 } ],
  "Vomnibar.activateInNewTab": [ kBgCmd.showVomnibar, 1, 0, { newtab: 1 } ],
  "Vomnibar.activateTabSelection": [ kBgCmd.showVomnibar, 1, 1, { mode: "tab", newtab: 1, autoSelect: 1 } ],
  "Vomnibar.activateUrl": [ kBgCmd.showVomnibar, 1, 0, { url: true } ],
  "Vomnibar.activateUrlInNewTab": [ kBgCmd.showVomnibar, 1, 0, { url: true, newtab: 1 } ],
  addBookmark: [ kBgCmd.addBookmark, 1, /* 20 in all_commands.ts */ 0 ],
  autoCopy: [ kFgCmd.autoOpen, 0, 1, { copy: true } ],
  autoOpen: [ kFgCmd.autoOpen, 0, 1, { o: 1 } ],
  blank: [ kBgCmd.blank, 1, 1 ],
  clearCS: [ kBgCmd.clearCS, 1, 1, { type: "images" } ],
  clearFindHistory: [ kBgCmd.clearFindHistory, 1, 1 ],
  closeDownloadBar: [ kBgCmd.moveTabToNewWindow, 1, 1, { all: 1 } ],
  closeOtherTabs: [ kBgCmd.removeTabsR, 1, 1, { other: true } ],
  closeTabsOnLeft: [ kBgCmd.removeTabsR, 1, 0, { count: -1e6 } ],
  closeTabsOnRight: [ kBgCmd.removeTabsR, 1, 0, { count: 1e6 } ],
  captureTab: [ kBgCmd.captureTab, 1, 1 ],
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
      id_mask: "$id", url_mask: ""
    }],
  discardTab: [ kBgCmd.discardTab, 1, /* 20 in all_commands.ts */ 0 ],
  duplicateTab: [ kBgCmd.duplicateTab, 1, 20 as 0 ],
  editText: [ kFgCmd.editText, 0, 0 ],
  enableCSTemp: [ kBgCmd.toggleCS, 1, 0, { type: "images", incognito: true } ],
  enterFindMode: [ kBgCmd.performFind, 1, 1, {active: true, selected: true} ],
  enterInsertMode: [ kBgCmd.insertMode, 1, 1, { insert: true } ],
  enterVisualLineMode: [ kBgCmd.visualMode, 1, 1, { mode: "line" } ],
  enterVisualMode: [ kBgCmd.visualMode, 1, 1 ],
  firstTab: [ kBgCmd.goToTab, 1, 0, { absolute: true } ],
  focusInput: [ kFgCmd.focusInput, 0, 0 ],
  focusOrLaunch: [ kBgCmd.openUrl, 1, 1, { reuse: ReuseType.reuse } ],
  goBack: [ kFgCmd.framesGoBack, 0, 0, { count: -1 } ],
  goForward: [ kFgCmd.framesGoBack, 0, 0 ],
  goNext: [ kBgCmd.goNext, 1, 0, { sed: true } ],
  goPrevious: [ kBgCmd.goNext, 1, 0, { sed: true, rel: "prev" } ],
  goToRoot: [ kBgCmd.goUp, 1, 0, { } ],
  goUp: [ kBgCmd.goUp, 1, 0, { count: -1, type: "frame" } ],
  joinTabs: [ kBgCmd.joinTabs, 1, 1 ],
  lastTab: [ kBgCmd.goToTab, 1, 0, { count: -1, absolute: true } ],
  mainFrame: [ kBgCmd.mainFrame, 1, 1 ],
  moveTabLeft: [ kBgCmd.moveTab, 1, 0, { count: -1 } ],
  moveTabRight: [ kBgCmd.moveTab, 1, 0 ],
  moveTabToIncognito: [ kBgCmd.moveTabToNewWindow, 1, 1, { incognito: true } ],
  moveTabToNewWindow: [ kBgCmd.moveTabToNewWindow, 1, /** 30 in tab_commands.ts */ 0 ],
  moveTabToNextWindow: [ kBgCmd.moveTabToNextWindow, 1, 0 ],
  newTab: [ kBgCmd.createTab, 1, 20 as 0 ],
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
  reload: [ kFgCmd.framesGoBack, 0, 1, { r: 1 } ],
  reloadGivenTab: [ kBgCmd.reloadTab, 1, 0, { single: true } ],
  reloadTab: [ kBgCmd.reloadTab, 1, /** 20 in tab_commands.ts */ 0 ],
  removeRightTab: [ kBgCmd.removeRightTab, 1, 0 ],
  removeTab: [ kBgCmd.removeTab, 1, /** 20 in tab_commands.ts */ 0 ],
  reopenTab: [ kBgCmd.reopenTab, 1, 1 ],
  reset: [kFgCmd.insertMode, 0, 1, { r: 1 }],
  restoreGivenTab: [ kBgCmd.restoreGivenTab, 1, 0 ],
  restoreTab: [ kBgCmd.restoreTab, 1, 25 as 0 ],
  runKey: [ kBgCmd.runKey, 1, 0 ],
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
  scrollSelect: [ kFgCmd.scrollSelect, 0, 0 ],
  scrollTo: [ kFgCmd.scroll, 0, 0, { dest: "min" } ],
  scrollToBottom: [ kFgCmd.scroll, 0, 0, { dest: "max" } ],
  scrollToLeft: [ kFgCmd.scroll, 0, 0, { axis: "x", dest: "min" } ],
  scrollToRight: [ kFgCmd.scroll, 0, 0, { axis: "x", dest: "max" } ],
  scrollToTop: [ kFgCmd.scroll, 0, 0, { dest: "min" } ],
  scrollUp: [ kFgCmd.scroll, 0, 0, { dir: -1 } ],
  searchAs: [ kFgCmd.autoOpen, 0, 1, { s: 1, copied: true, selected: true } ],
  searchInAnother: [ kBgCmd.searchInAnother, 1, 1 ],
  sendToExtension: [ kBgCmd.sendToExtension, 1, 0 ],
  showHelp: [ kBgCmd.showHelp, 1, 1 ],
  showTip: [ kBgCmd.showTip, 1, 1 ],
  simBackspace: [ kFgCmd.focusInput, 0, 1, { act: "backspace" } ],
  sortTabs: [ kBgCmd.joinTabs, 1, 1, { sort: "recency", windows: "current" } ],
  switchFocus: [ kFgCmd.focusInput, 0, 1, { act: "switch" } ],
  toggleCS: [ kBgCmd.toggleCS, 1, 0, { type: "images" } ],
  toggleLinkHintCharacters: [ kBgCmd.toggle, 1, 1, { key: "linkHintCharacters" } ],
  toggleMuteTab: [ kBgCmd.toggleMuteTab, 1, 1 ],
  togglePinTab: [ kBgCmd.togglePinTab, 1, /** 30 in all_commands.ts */ 0 ],
  toggleStyle: [ kFgCmd.toggleStyle, 0, 1 ],
  toggleSwitchTemp: [ kBgCmd.toggle, 1, 1 ],
  toggleViewSource: [ kBgCmd.toggleTabUrl, 1, 1, { opener: true } ],
  toggleReaderMode: [ kBgCmd.toggleTabUrl, 1, 1, { reader: true, reuse: ReuseType.current, opener: true } ],
  toggleVomnibarStyle: [ kBgCmd.toggleVomnibarStyle, 1, 1, { style: "dark" } ],
  visitPreviousTab: [ kBgCmd.visitPreviousTab, 1, 0 ],
  zoomIn: [ kBgCmd.toggleZoom, 1, 0 ],
  zoomOut: [ kBgCmd.toggleZoom, 1, 0, { count: -1 } ]
}),
  hintModes_: As_<Dict<HintMode>>({
    "copy-text": HintMode.COPY_TEXT, focus: HintMode.FOCUS, hover: HintMode.HOVER,
    image: HintMode.OPEN_IMAGE, input: HintMode.FOCUS_EDITABLE, leave: HintMode.UNHOVER,
    text: HintMode.COPY_TEXT, unhover: HintMode.UNHOVER, url: HintMode.COPY_URL, visual: HintMode.ENTER_VISUAL_MODE
  })
},
CommandsData_: CommandsDataTy = CommandsData_ as never || {
  keyFSM_: null as never as KeyFSM,
  mappedKeyRegistry_: null,
  mappedKeyTypes_: kMapKey.NONE,
  keyToCommandRegistry_: null as never as Map<string, CommandsNS.Item>,
  builtinKeys_: null,
  errors_: null,
  shortcutRegistry_: null as never as Map<StandardShortcutNames, CommandsNS.Item>,
  visualGranularities_: ["character", "word", "", "lineboundary", "line", "sentence", "paragraph", "documentboundary"],
  visualKeys_: <VisualModeNS.KeyMap> As_<{ [key: string]: VisualAction | { [key: string]: VisualAction } }>({
    l: VisualAction.char | VisualAction.inc, h: VisualAction.char | VisualAction.dec,
    j: VisualAction.line | VisualAction.inc, k: VisualAction.line | VisualAction.dec,
    $: VisualAction.lineBoundary | VisualAction.inc, 0: VisualAction.lineBoundary | VisualAction.dec,
    "}": VisualAction.paragraph | VisualAction.inc, "{": VisualAction.paragraph | VisualAction.dec,
    ")": VisualAction.sentence | VisualAction.inc, "(": VisualAction.sentence | VisualAction.dec,
    w: VisualAction.vimWord | VisualAction.inc, /* same as w */ W: VisualAction.vimWord | VisualAction.inc,
    e: VisualAction.word | VisualAction.inc, b: VisualAction.word | VisualAction.dec,
    /* same as b */ B: VisualAction.word | VisualAction.dec,
    G: VisualAction.documentBoundary | VisualAction.inc, g: { g: VisualAction.documentBoundary | VisualAction.dec },
    gg: VisualAction.documentBoundary | VisualAction.dec,

    o: VisualAction.Reverse, a: { w: VisualAction.LexicalWord, s: VisualAction.LexicalSentence },
    aw: VisualAction.LexicalWord, as: VisualAction.LexicalSentence,

    y: VisualAction.Yank, Y: VisualAction.YankLine, C: VisualAction.YankWithoutExit, "c-s-c": VisualAction.YankRichText,
    p: VisualAction.YankAndOpen, P: VisualAction.YankAndNewTab,

    n: VisualAction.FindNext, N: VisualAction.FindPrevious,
    f1: VisualAction.HighlightRange, "a-f1": VisualAction.HighlightRange,

    v: VisualAction.VisualMode, V: VisualAction.VisualLineMode, c: VisualAction.CaretMode,
    "/": VisualAction.EmbeddedFindMode,

    "c-e": VisualAction.ScrollDown, "c-y": VisualAction.ScrollUp,
    "c-down": VisualAction.ScrollDown, "c-up": VisualAction.ScrollUp
  })
};

if (!Build.NDEBUG) {
  (KeyMappings.availableCommands_ as unknown as NameMetaMap as Writable<NameMetaMapEx>)["focusOptions"] = [
    kBgCmd.openUrl, 1, 1, { reuse: ReuseType.reuse, url: "vimium://options" }
  ];
  KeyMappings.defaultKeyMappings_ += ` <a-s-f12> ${CNameLiterals.debugBackground}`
  KeyMappings.defaultKeyMappings_ += ` <s-f12> ${CNameLiterals.focusOptions}`
}
if (Backend_.onInit_) {
  if (Settings_.temp_.initing_ & BackendHandlersNS.kInitStat.platformInfo) {
    KeyMappings.parseKeyMappings_(Settings_.get_("keyMappings"));
    KeyMappings.populateKeyMap_(true);
    if (!Settings_.get_("vimSync") && !Settings_.temp_.hasEmptyLocalStorage_) {
      KeyMappings = null as never;
    }
  }
  (Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox)
      && !chrome.commands ||
  (chrome.commands.onCommand as chrome.events.Event<
        (command: StandardShortcutNames | kShortcutAliases & string, exArg: FakeArg) => void
      >).addListener(Backend_.ExecuteShortcut_);
}
if (KeyMappings) {
Settings_.updateHooks_.keyMappings = function (this: {}, value: string | null): void {
  const oldMappedKeys = CommandsData_.mappedKeyRegistry_, oldFSM = CommandsData_.keyFSM_
  value != null && KeyMappings.parseKeyMappings_(value);
  KeyMappings.populateKeyMap_(value != null);
  const f = JSON.stringify, curMapped = CommandsData_.mappedKeyRegistry_,
  updatesInMappedKeys = oldMappedKeys ? !curMapped || f(oldMappedKeys) !== f(curMapped) : !!curMapped;
  (updatesInMappedKeys || f(CommandsData_.keyFSM_) !== f(oldFSM)) && Settings_.broadcast_({
    N: kBgReq.keyFSM,
    m: CommandsData_.mappedKeyRegistry_,
    t: CommandsData_.mappedKeyTypes_,
    k: CommandsData_.keyFSM_
  });
  updatesInMappedKeys && Settings_.broadcastOmni_({
    N: kBgReq.omni_updateOptions,
    d: {
      k: CommandsData_.mappedKeyRegistry_
    }
  });
};
}
