import { contentPayload, executeCommand } from "./store"

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
type ValidMappingInstructions = "map" | "mapkey" | "mapKey" | "env" | "shortcut" | "command"
    | "unmap" | "unmapAll" | "unmapall"

let builtinKeys_: Set<string> | null | undefined
let mappedKeyTypes_ = kMapKey.NONE
let shortcutRegistry_: Map<StandardShortcutNames, CommandsNS.Item | null> | null | undefined
let envRegistry_: Map<string, CommandsNS.EnvItem | "__not_parsed__"> | null | undefined

export { builtinKeys_, mappedKeyTypes_, envRegistry_, shortcutRegistry_ }

const getOptions_ = (line: string, start: number): CommandsNS.RawOptions | "__not_parsed__" | null => {
  return line.length <= start ? null
      : line.includes(" $if=", start) ? parseOptions_(line.slice(start + 1))
      : line.slice(start + 1) as "__not_parsed__"
}

export const parseOptions_ = (options_line: string): CommandsNS.RawOptions | null => {
    let opt: CommandsNS.RawOptions, ind: number, str: string | undefined, val: string;
    opt = BgUtils_.safeObj_();
    for (str of options_line.split(" ")) {
      ind = str.indexOf("=");
      if (ind === 0 || str === "__proto__"
          || str[0] === "$" && !"$if=$key=$desc=$count=".includes(str.slice(0, ind + 1))) {
        logError_("%s option key:", ind === 0 ? "Missing" : "Unsupported", str)
      } else if (ind < 0) {
        opt[str] = true;
      } else {
        val = str.slice(ind + 1);
        str = str.slice(0, ind);
        opt[str] = val && parseVal_(val)
      }
    }
    return str ? opt : null;
}

const parseVal_ = (val: string): any => {
    try {
      return JSON.parse(val);
    } catch {}
    return val;
}

const normalizeCommand_ = (cmd: Writable<CommandsNS.BaseItem>, details?: CommandsNS.Description
      ): cmd is CommandsNS.NormalizedItem => {
    let options: CommandsNS.RawOptions | string | null = cmd.options_, command = cmd.command_
    if (!details) { details = availableCommands_[command]! }
    let opt: CommandsNS.Options | null
    opt = details.length < 4 ? null : BgUtils_.safer_(details[3]!);
    if (typeof options === "string") {
      options = parseOptions_(options)
    }
    if (options) {
      if (options.$count) {
        let n = parseFloat(options.$count) || 1;
        delete options.$count;
        options.count = n;
      } else if ("count" in options) {
        options.count = details[2] === 1 ? 1 : (parseFloat(options.count!) || 1) * (opt && opt.count || 1);
      }
      if (options.$desc || options.$key) {
        cmd.help_ = { key_: options.$key || "", desc_: options.$desc || "" }
        delete options.$key;
        delete options.$desc;
      }
      if (options.$if) {
        if (doesMatchEnv_(options) === "f") { return false }
        delete options.$if;
      }
      if (opt) {
        BgUtils_.extendIf_<CommandsNS.RawOptions, CommandsNS.RawOptions>(options, opt)
      }
      if (details[0] === kFgCmd.linkHints && !details[1]) {
        const lhOpt = options as Partial<HintsNS.Options> & CommandsNS.RawLinkHintsOptions
        let mode = lhOpt.mode, stdMode = lhOpt.m!
        const rawChars = lhOpt.characters
        const action = lhOpt.action
        const chars = rawChars && Settings_.updatePayload_<"c" | "n">("c", rawChars)
        if (rawChars) {
          delete lhOpt.characters
          lhOpt.c = chars!
        }
        action && delete lhOpt.action
        if (mode != null) {
          delete lhOpt.mode
          if (typeof mode !== "number") {
            mode = (hintModes_[action || mode || 0] as number | undefined | {} as number) | 0
          }
        } else {
          mode = action ? hintModes_[action] : null
          mode = mode != null ? mode : stdMode
        }
        if (mode > HintMode.max_mouse_events) {
          mode = mode === HintMode.EDIT_TEXT ? lhOpt.url ? HintMode.EDIT_LINK_URL : mode
            : mode === HintMode.COPY_TEXT
              ? lhOpt.join ? HintMode.COPY_TEXT | HintMode.queue | HintMode.list : mode
            : mode > HintMode.min_disable_queue + HintMode.queue - 1 ? mode - HintMode.queue : mode;
        }
        if (mode != stdMode) {
          lhOpt.m = mode
        }
        if (mode > HintMode.min_disable_queue - 1) {
          cmd.repeat_ = 1
        }
      }
    } else {
      options = opt;
    }
    cmd.options_ = options
    return true
}

const makeCommand_ = <T extends CommandsNS.RawOptions | "__not_parsed__" | null> (command: string, options: T
    , details?: CommandsNS.Description
    ): CommandsNS.Item | (CommandsNS.RawOptions | "__not_parsed__" extends T ? null : never) => {
  if (!details) { details = availableCommands_[command]! }
  const cmd: Writable<CommandsNS.BaseItem> = {
      alias_: details[0] as Exclude<typeof details[0], kFgCmd>,
      background_: details[1] as Exclude<typeof details[1], 0>,
      command_: command as kCName,
      help_: null,
      options_: options || (details.length < 4 ? null : BgUtils_.safer_(details[3]!)),
      repeat_: details[2]
  }
  if (options && typeof options === "object") {
    if (!normalizeCommand_(cmd, details)) {
      return null as CommandsNS.RawOptions | string extends T ? null : never
    }
  }
  return cmd as CommandsNS.Item
}

export const normalizedOptions_ = (item: CommandsNS.ValidItem): CommandsNS.NormalizedItem["options_"] => {
  let opts = item.options_
  if (typeof opts === "string") {
    normalizeCommand_(item)
    opts = (item as CommandsNS.NormalizedItem).options_
  }
  return opts
}

const doesMatchEnv_ = (options: CommandsNS.RawOptions | string | null): "t" | "f" | "" => {
    const condition = options && typeof options === "object" && options.$if
    return condition ? !!condition.sys && condition.sys !== Settings_.CONST_.Platform_
        || !!condition.browser
          && !(condition.browser & (Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
                ? Build.BTypes : OnOther)) ? "f" : "t"
        : ""
}

const parseKeyMappings_ = (wholeMappings: string): void => {
    let lines: string[], mk = 0, _i: number, key2: string | undefined
      , _len: number, details: CommandsNS.Description | undefined, errors = 0, ch: number
      , registry: CommandsDataTy["keyToCommandRegistry_"] = new Map()
      , cmdMap: typeof shortcutRegistry_ = new Map(), envMap: typeof envRegistry_ = null
      , builtinKeys: TextSet | null = null
      , regItem: CommandsNS.Item | null, options: ReturnType<typeof getOptions_>
      , mkReg = BgUtils_.safeObj_<string>();
    const colorRed = "color:red", shortcutLogPrefix = 'Shortcut %c"%s"';
    CommandsData_.errors_ = null
    lines = wholeMappings.replace(<RegExpSearchable<0>> /\\\\?\n/g, t => t.length === 3 ? "\\\n" : ""
               ).replace(<RegExpG> /[\t ]+/g, " ").split("\n");
    if (lines[0] !== "unmapAll" && lines[0] !== "unmapall") {
      builtinKeys = new Set!()
      const defaultMap = defaultKeyMappings_.split(" ")
      for (_i = defaultMap.length; 0 < _i; ) {
        _i -= 2;
        registry.set(defaultMap[_i], makeCommand_(defaultMap[_i + 1], null))
        builtinKeys.add(defaultMap[_i])
      }
    } else {
      _i = 1;
    }
    for (_len = lines.length; _i < _len; _i++) {
      const line = lines[_i].trim();
      if (line < kChar.minNotCommentHead) { continue; } // mask: /[!"#]/
      const _splitLine = line.split(" ", 3);
      const cmd = _splitLine[0] as ValidMappingInstructions | "__unknown__"
      const key = _splitLine.length > 1 ? _splitLine[1] : ""
      const val = _splitLine.length > 2 ? _splitLine[2] : ""
      const knownLen = cmd.length + key.length + val.length + 2
      if (cmd === "map") {
        if (!key || key.length > 8 && (key === "__proto__" || key.includes("<__proto__>"))) {
          logError_('Unsupported key sequence %c"%s"', colorRed, key || '""', `for "${val || ""}"`)
        } else if (registry.has(key) && !(builtinKeys && builtinKeys.has(key))) {
          logError_('Key %c"%s"', colorRed, key, "has been mapped to", registry.get(key)!.command_)
        } else if (!val) {
          logError_('Lacking command when mapping %c"%s"', colorRed, key)
        } else if (!(details = availableCommands_[val])) {
          logError_('Command %c"%s"', colorRed, val, "doesn't exist!")
        } else if ((ch = key.charCodeAt(0)) > kCharCode.maxNotNum && ch < kCharCode.minNotNum
            || ch === kCharCode.dash) {
          logError_('Invalid key: %c"%s"', colorRed, key, "(the first char can not be '-' or number)")
        } else {
          regItem = makeCommand_(val, getOptions_(line, knownLen), details)
          if (regItem) {
            registry.set(key, regItem)
            builtinKeys && builtinKeys.delete(key)
          }
          continue;
        }
      } else if (cmd === "unmapAll" || key === "unmapall") {
        registry = new Map()
        cmdMap = new Map()
        envMap = null
        builtinKeys = null;
        mkReg = BgUtils_.safeObj_<string>(), mk = 0;
        if (errors > 0) {
          logError_("All key mappings is unmapped, but there %s been %c%d error%s%c before this instruction"
            , errors > 1 ? "have" : "has", colorRed, errors, errors > 1 ? "s" : "", "color:auto");
        }
        continue;
      } else if (cmd === "mapkey" || key === "mapKey") {
        if (!val || line.length > knownLen
            && (key2 = doesMatchEnv_(getOptions_(line, knownLen)), !key2)) {
          logError_(`mapKey: need %s source and target keys:`, val ? "only" : "both", line)
        } else if (line.length > knownLen && key2 === "f") {
          continue
        } else if (key.length > 1 && !(<RegExpOne> /^<(?!<[^:]|__proto__>)([acms]-){0,4}.\w*(:[a-z])?>$/).test(key)) {
          logError_("mapKey: a source key should be a single key with an optional mode id:", line)
        } else if (val.length > 1 && !(<RegExpOne> /^<(?!<|__proto__>)([a-z]-){0,4}.\w*>$/).test(val)) {
          logError_("mapKey: a target key should be a single key:", line)
        } else if (key2 = BgUtils_.stripKey_(key), key2 in mkReg && mkReg[key2] !== BgUtils_.stripKey_(val)) {
          logError_('The key %c"%s"', colorRed, key, "has been mapped to another key:"
              , mkReg[key]!.length > 1 ? `<${mkReg[key]!}>` : mkReg[key]!)
        } else {
          mkReg[key] = BgUtils_.stripKey_(val)
          mk++;
          continue;
        }
      } else if (cmd === "shortcut" || cmd === "command") {
        if (!val) {
          logError_("Lacking command name and options in shortcut:", line)
        } else if (!(key.startsWith(CNameLiterals.userCustomized) && key.length > 14)
            && (Settings_.CONST_.GlobalCommands_ as Array<StandardShortcutNames | string>).indexOf(key) < 0) {
          logError_(shortcutLogPrefix, colorRed, key, "is not a valid name")
        } else if (cmdMap.has(key as StandardShortcutNames)) {
          logError_(shortcutLogPrefix, colorRed, key, "has been configured")
        } else {
          options = getOptions_(line, knownLen - 1 - val.length)
          if (doesMatchEnv_(options) !== "f") {
            key2 = setupUserCustomized_(cmdMap, key as StandardShortcutNames, options)
            if (!key2) { continue; }
            logError_(shortcutLogPrefix, colorRed, key, key2)
          }
        }
      } else if (cmd === "env") {
        if (!val) {
          logError_("Lacking conditions in env declaration:", line)
        } else if (key === "__proto__") {
          logError_('Unsupported env name %c"%s"', colorRed, key)
        } else if (envMap && envMap.has(key)) {
          logError_('The environment name %c"%s"', colorRed, key, "has been used")
        } else {
          options = getOptions_(line, knownLen - 1 - val.length)
          if (doesMatchEnv_(options) !== "f") {
            (envMap || (envMap = new Map())).set(key, options)
          }
          continue
        }
      } else if (cmd !== "unmap") {
        logError_('Unknown mapping command: %c"%s"', colorRed, cmd, "in", line)
      } else if (!key || val) {
        logError_(`unmap: ${val ? "only " : ""}needs one mapped key:`, line)
      } else if (registry.has(key)) {
        builtinKeys && builtinKeys.delete(key)
        registry.delete(key)
        continue;
      } else {
        logError_('Unmapping: %c"%s"', colorRed, key, "has not been mapped")
      }
      ++errors;
    }
    for (const shortcut of Settings_.CONST_.GlobalCommands_) {
      if (!shortcut.startsWith("user") && !cmdMap.has(shortcut)) {
        if (regItem = makeCommand_(shortcut, null)) {
          cmdMap.set(shortcut, regItem)
        }
      }
    }
    CommandsData_.keyToCommandRegistry_ = registry;
    shortcutRegistry_ = cmdMap
    envRegistry_ = envMap
    CommandsData_.mappedKeyRegistry_ = Settings_.omniPayload_.k = mk > 0 ? mkReg : null;
    Settings_.temp_.cmdErrors_ = Settings_.temp_.cmdErrors_ > 0 ? ~errors : errors;
}

const setupUserCustomized_ = (cmdMap: NonNullable<typeof shortcutRegistry_>, key: StandardShortcutNames
      , options: CommandsNS.RawCustomizedOptions | "__not_parsed__" | null): string => {
    options = options && typeof options === "string" ? parseOptions_(options) : options!
    let has_cmd: BOOL = 1
      , command: string = options && options.command || (has_cmd = 0, key.startsWith("user") ? "" : key)
      , regItem: CommandsNS.Item | null
      , ret: 0 | 1 | 2 = command ? 1 : 0;
    if (ret && (command in availableCommands_)) {
      has_cmd && delete options!.command
      if (regItem = makeCommand_(command, options)) {
        cmdMap.set(key, regItem)
      }
      ret = 2;
    }
    return ret < 1 ? 'requires a "command" option' : ret > 1 ? "" : "gets an unknown command";
}

const collectMapKeyTypes_ = (mapKeys: NonNullable<CommandsDataTy["mappedKeyRegistry_"]>): kMapKey => {
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
}

/** @argument detectNewError hasFoundChanges */
const populateKeyMap_ = (hasFoundChanges: boolean): void => {
    const d = CommandsData_, ref = d.keyFSM_ = BgUtils_.safeObj_<ValidKeyAction | ChildKeyFSM>(),
    keyRe = BgUtils_.keyRe_,
    strip = BgUtils_.stripKey_,
    allKeys = BgUtils_.keys_(d.keyToCommandRegistry_),
    mappedKeyReg = CommandsData_.mappedKeyRegistry_,
    customKeys = builtinKeys_ ? allKeys.filter(i => !builtinKeys_!.has(i)) : allKeys,
    countOfCustomKeys = customKeys.length,
    sortedKeys = builtinKeys_ ? customKeys.concat(BgUtils_.keys_(builtinKeys_)) : allKeys,
    d2 = Settings_.temp_, oldErrors = d2.cmdErrors_;
    if (oldErrors < 0) { d2.cmdErrors_ = ~oldErrors; }
    if (hasFoundChanges) {
      const mayHaveInsert = allKeys.join().includes(":i>") ? kMapKey.directInsert : kMapKey.NONE
      mappedKeyTypes_ = mappedKeyReg ? collectMapKeyTypes_(mappedKeyReg) | mayHaveInsert : mayHaveInsert
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
          hasFoundChanges && warnInactive_(ref[key2] as ReadonlyChildKeyFSM, key)
        }
        ref[key2] = KeyAction.cmd;
        continue;
      }
      let ref2 = ref as ChildKeyFSM, tmp: ChildKeyFSM | ValidChildKeyAction | undefined, j = 0;
      while ((tmp = ref2[strip(arr[j])]) && j < last) { j++; ref2 = tmp; }
      if (tmp != null && (index >= countOfCustomKeys || tmp === KeyAction.cmd)) {
        index >= countOfCustomKeys ? d.keyToCommandRegistry_.delete(key) :
        hasFoundChanges && warnInactive_(key, arr.slice(0, j + 1).join(""))
        continue;
      }
      tmp != null && hasFoundChanges && warnInactive_(tmp, key)
      while (j < last) { ref2 = ref2[strip(arr[j++])] = BgUtils_.safeObj_() as ChildKeyFSM; }
      ref2[strip(arr[last])] = KeyAction.cmd;
    }
    if (hasFoundChanges && d2.cmdErrors_) {
      console.log("%c%o errors found.", "background-color:#fffbe5", d2.cmdErrors_);
    } else if (oldErrors < 0) {
      console.log("The new key mappings have no errors");
    }
    builtinKeys_ = null
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
}

const logError_ = function (): void {
    if (!CommandsData_.errors_) {
      console.group("Errors in custom Key mappings:");
      CommandsData_.errors_ = [];
    }
    CommandsData_.errors_.push([].slice.call(arguments, 0))
    console.log.apply(console, arguments);
} as (firstMsg: string, ...args: any[]) => void

const warnInactive_ = (obj: ReadonlyChildKeyFSM | string, newKey: string): void => {
    logError_('Inactive key: %o with "%s"', obj, newKey)
    ++Settings_.temp_.cmdErrors_;
}

  /** this functions needs to accept any types of arguments and normalize them */
export const executeExternalCmd = (
      message: Partial<ExternalMsgs[kFgReq.command]["req"]>, sender: chrome.runtime.MessageSender): void => {
    let command = message.command;
    command = command ? command + "" : "";
    const description = command ? availableCommands_[command] : null
    if (!description) { return; }
    let ref: Frames.Frames | null
    const port: Port | null = sender.tab ? Backend_.indexPorts_(sender.tab.id, sender.frameId || 0)
        || (ref = Backend_.indexPorts_(sender.tab.id), ref ? ref.cur_ : null) : null
    if (!port && !description[1]) { /** {@link index.d.ts#CommandsNS.FgDescription} */
      return;
    }
    let options = (message.options || null) as CommandsNS.RawOptions | null
      , lastKey: kKeyCode | undefined = message.key
      , regItem = makeCommand_(command, options)
      , count = message.count as number | string | undefined;
    if (!regItem) { return; }
    count = count !== "-" ? parseInt(count as string, 10) || 1 : -1;
    options && typeof options === "object" ?
        BgUtils_.safer_(options) : (options = null);
    lastKey = 0 | lastKey!;
    executeCommand(regItem, count, lastKey, port!, 0)
}

const defaultKeyMappings_: string =
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
  (Build.NDEBUG ? "" : ` <a-s-f12> ${AsC_("debugBackground")} <s-f12> ${CNameLiterals.focusOptions}`)

const availableCommands_: Dict<CommandsNS.Description> & SafeObject =
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
  closeDownloadBar: [ kBgCmd.closeDownloadBar, 1, 1, { all: 1 } ],
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
  zoomOut: [ kBgCmd.toggleZoom, 1, 0, { count: -1 } ],
  zoomReset: [ kBgCmd.toggleZoom, 1, 0, { count: 9e4 } ]
})

const hintModes_: SafeDict<HintMode> = {
    __proto__: null as never,
    "copy-text": HintMode.COPY_TEXT, focus: HintMode.FOCUS, hover: HintMode.HOVER,
    image: HintMode.OPEN_IMAGE, input: HintMode.FOCUS_EDITABLE, leave: HintMode.UNHOVER,
    text: HintMode.COPY_TEXT, unhover: HintMode.UNHOVER, url: HintMode.COPY_URL, visual: HintMode.ENTER_VISUAL_MODE
}

CommandsData_ = {
  keyFSM_: null as never as KeyFSM,
  mappedKeyRegistry_: null,
  keyToCommandRegistry_: null as never as Map<string, CommandsNS.Item>,
  errors_: null,
}

export const visualGranularities_: GranularityNames = [
    "character", "word", "", "lineboundary", "line", "sentence", "paragraph", "documentboundary"]

export const visualKeys_: VisualModeNS.KeyMap = {
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
}

if (!Build.NDEBUG) {
  (availableCommands_ as unknown as Writable<NameMetaMapEx>)["focusOptions"] = [
    kBgCmd.openUrl, 1, 1, { reuse: ReuseType.reuse, url: "vimium://options" }
  ];
}

if (Settings_.temp_.initing_ & BackendHandlersNS.kInitStat.platformInfo) {
  parseKeyMappings_(Settings_.get_("keyMappings"))
  populateKeyMap_(true)
  if (Build.BTypes & ~BrowserType.Edge && contentPayload.o === kOS.mac) {
    visualKeys_["m-s-c"] = VisualAction.YankRichText
  }
}

Settings_.updateHooks_.keyMappings = function (this: {}, value: string | null): void {
  const oldMappedKeys = CommandsData_.mappedKeyRegistry_, oldFSM = CommandsData_.keyFSM_
  value != null && parseKeyMappings_(value)
  populateKeyMap_(value != null)
  const f = JSON.stringify, curMapped = CommandsData_.mappedKeyRegistry_,
  updatesInKeyFSM = oldFSM ? f(CommandsData_.keyFSM_) !== f(oldFSM) : true,
  updatesInMappedKeys = oldMappedKeys ? !curMapped || f(oldMappedKeys) !== f(curMapped) : !!curMapped;
  (updatesInMappedKeys || updatesInKeyFSM) && Settings_.broadcast_({
    N: kBgReq.keyFSM,
    m: CommandsData_.mappedKeyRegistry_,
    t: mappedKeyTypes_,
    k: updatesInKeyFSM ? CommandsData_.keyFSM_ : null
  });
  updatesInMappedKeys && Settings_.broadcastOmni_({
    N: kBgReq.omni_updateOptions,
    d: {
      k: CommandsData_.mappedKeyRegistry_
    }
  });
};
Settings_.temp_.getNormalizedOptions_ = normalizedOptions_ as (item: CommandsNS.BaseItem) => CommandsNS.Options | null
