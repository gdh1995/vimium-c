import { contentPayload } from "./store"

type WiderOmit<T, K> = Pick<T, Exclude<keyof T, K>>
type RawCmdDesc<c extends kCName, e extends CmdNameIds[c] = CmdNameIds[c]> =
    e extends keyof CmdOptions ? [alias: e, bg: 0, repeat: 0 | 1
        , options?: CmdOptions[e] & CommandsNS.SharedPublicOptions]
    : e extends keyof BgCmdOptions ? [alias: e, bg: 1, repeat: 0 | 1
        , options?: e extends keyof StatefulBgCmdOptions
          ? StatefulBgCmdOptions[e] extends null ? never
            : Partial<WiderOmit<BgCmdOptions[e], StatefulBgCmdOptions[e]> & CommandsNS.SharedPublicOptions>
          : Partial<BgCmdOptions[e]> & CommandsNS.SharedPublicOptions
    ] : never
/** [ enum, is background, count limit, default options ] */
type NameMetaMap = {
  readonly [k in keyof CmdNameIds]: RawCmdDesc<k>
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

export { mappedKeyTypes_, envRegistry_, shortcutRegistry_ }

const getOptions_ = (line: string, start: number): CommandsNS.RawOptions | "__not_parsed__" | null => {
  return line.length <= start ? null
      : line.includes(" $", start) || line.includes(" =", start)
      ? parseOptions_(line.slice(start + 1), line.includes(" $if={", start) ? 0 : 1)
      : line.slice(start + 1) as "__not_parsed__"
}

export const parseOptions_ = ((options_line: string, fakeVal?: 1 | 0): CommandsNS.RawOptions | string | null => {
  let opt: CommandsNS.RawOptions = BgUtils_.safeObj_(), hasOpt = 0
  for (let str of options_line.split(" ")) {
    const ind = str.indexOf("=")
    if ("$#/=_".includes(str[0])) {
      if (ind === 0 || str === "__proto__"
          || str[0] === "$" && !"$if=$key=$desc=$count=$then=$else=$retry=".includes(str.slice(0, ind + 1))) {
        fakeVal != null && logError_("%s option key:", ind === 0 ? "Missing" : "Unsupported", str)
        continue
      } else if (str[0] === "#" || str.startsWith("//")) { // treat the following as comment
        break
      }
    }
    if (ind < 0) {
      opt[str] = true;
      hasOpt = 1
    } else {
      const val = str.slice(ind + 1)
      str = str.slice(0, ind);
      opt[str] = fakeVal === 1 ? 1 : val && parseVal_(val)
      hasOpt = 1
    }
  }
  return hasOpt === 1 ? fakeVal === 1 ? options_line : opt : null
}) as {
  (options_line: string, fakeVal: 1 | 0 | undefined): CommandsNS.RawOptions | "__not_parsed__" | null
  (options_line: string): CommandsNS.RawOptions | null
}

const parseVal_ = (val: string): any => {
    try {
      return JSON.parse(val);
    } catch {}
    return val;
}

export const normalizeCommand_ = (cmd: Writable<CommandsNS.BaseItem>, details?: CommandsNS.Description
      ): cmd is CommandsNS.NormalizedItem => {
    let options: CommandsNS.RawOptions | string | null = cmd.options_, command = cmd.command_
    if (details === undefined) { details = availableCommands_[command]! }
    let opt: CommandsNS.Options | null
    opt = details.length < 4 ? null : BgUtils_.safer_(details[3]!);
    if (typeof options === "string") {
      options = parseOptions_(options)
    }
    if (options) {
      if ("$count" in options || "count" in options) {
        details[2] === 1 ? delete options.$count
        : options.$count = options.$count != null ? parseFloat(options.$count) || 1
              : (parseFloat(options.count || 1) || 1) * (opt && opt.$count || 1)
        delete options.count
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
        chars ? lhOpt.c = chars : "c" in lhOpt && delete lhOpt.c
        rawChars != null && delete lhOpt.characters
        "action" in lhOpt && delete lhOpt.action
        "mode" in lhOpt && delete lhOpt.mode
        mode = action ? hintModes_[action] : mode && typeof mode !== "number" ? hintModes_[mode] : null
        mode = mode != null ? mode : Math.max(0, stdMode | 0)
        if (mode > HintMode.max_mouse_events) {
          mode = mode === HintMode.EDIT_TEXT ? lhOpt.url ? HintMode.EDIT_LINK_URL : mode
            : mode === HintMode.COPY_TEXT ? !lhOpt.url
              ? lhOpt.join != null ? HintMode.COPY_TEXT | HintMode.queue | HintMode.list : mode
              : lhOpt.join != null ? HintMode.COPY_URL | HintMode.queue | HintMode.list : HintMode.COPY_URL
            : mode > HintMode.min_disable_queue + HintMode.queue - 1 ? mode - HintMode.queue : mode;
        }
        if (mode !== stdMode) {
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

export const makeCommand_ = <T extends CommandsNS.RawOptions | "__not_parsed__" | null> (
    command: string, options: T, details?: CommandsNS.Description
    ): CommandsNS.Item | (CommandsNS.RawOptions | "__not_parsed__" extends T ? null : never) => {
  if (details === undefined) { details = availableCommands_[command]! }
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
      , _len: number, details: CommandsNS.Description | undefined, ch: number
      , registry: CommandsDataTy["keyToCommandRegistry_"] = new Map()
      , cmdMap: typeof shortcutRegistry_ = new Map(), envMap: typeof envRegistry_ = null
      , regItem: CommandsNS.Item | null, options: ReturnType<typeof getOptions_>
      , mkReg = BgUtils_.safeObj_<string>();
    const colorRed = "color:red", shortcutLogPrefix = 'Shortcut %c"%s"';
    builtinKeys_ = null
    lines = wholeMappings.replace(<RegExpSearchable<0>> /\\\\?\n/g, t => t.length === 3 ? "\\\n" : ""
               ).replace(<RegExpG> /[\t ]+/g, " ").split("\n");
    if (lines[0] !== "unmapAll" && lines[0] !== "unmapall") {
      builtinKeys_ = new Set!()
      const defaultMap = defaultKeyMappings_.split(" ")
      for (_i = defaultMap.length; 0 < _i; ) {
        _i -= 2;
        registry.set(defaultMap[_i], makeCommand_(defaultMap[_i + 1], null))
        builtinKeys_.add(defaultMap[_i])
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
        } else if (registry.has(key) && !(builtinKeys_ && builtinKeys_.has(key))) {
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
            builtinKeys_ && builtinKeys_.delete(key)
          }
        }
      } else if (cmd === "unmapAll" || cmd === "unmapall") {
        registry = new Map()
        cmdMap = new Map()
        envMap = null
        builtinKeys_ = null;
        mkReg = BgUtils_.safeObj_<string>(), mk = 0;
        if (CommandsData_.errors_) {
          logError_("All key mappings is unmapped, but there %s been %c%d error%s%c before this instruction"
              , CommandsData_.errors_.length > 1 ? "have" : "has"
              , colorRed, CommandsData_.errors_.length, CommandsData_.errors_.length > 1 ? "s" : "", "color:auto")
        }
      } else if (cmd === "mapkey" || cmd === "mapKey") {
        if (!val || line.length > knownLen
            && (key2 = doesMatchEnv_(getOptions_(line, knownLen)), !key2)) {
          logError_("mapKey: need %s source and target keys:", val ? "only" : "both", line)
        } else if (line.length > knownLen && key2 === "f") {
          /* empty */
        } else if (key.length > 1 && !(<RegExpOne> /^<(?!<[^:]|__proto__>)([acms]-){0,4}.\w*(:[a-z])?>$/).test(key)) {
          logError_("mapKey: a source key should be a single key with an optional mode id:", line)
        } else if (val.length > 1 && !(<RegExpOne> /^<(?!<|__proto__>)([a-z]-){0,4}.\w*>$/).test(val)) {
          logError_("mapKey: a target key should be a single key:", line)
        } else if (key2 = BgUtils_.stripKey_(key), key2 in mkReg && mkReg[key2] !== BgUtils_.stripKey_(val)) {
          logError_('The key %c"%s"', colorRed, key, "has been mapped to another key:"
              , mkReg[key2]!.length > 1 ? `<${mkReg[key2]!}>` : mkReg[key2]!)
        } else {
          mkReg[key2] = BgUtils_.stripKey_(val)
          mk++;
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
            key2 && logError_(shortcutLogPrefix, colorRed, key, key2)
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
        }
      } else if (As_<"unmap" | "__unknown__">(cmd) !== "unmap") {
        logError_('Unknown mapping command: %c"%s"', colorRed, cmd, "in", line)
      } else if (!key || val) {
        logError_(`unmap: ${val ? "only " : ""}needs one mapped key:`, line)
      } else if (registry.has(key)) {
        builtinKeys_ && builtinKeys_.delete(key)
        registry.delete(key)
      } else {
        logError_('Unmapping: %c"%s"', colorRed, key, "has not been mapped")
      }
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
const populateKeyMap_ = (value: string | null): void => {
    const d = CommandsData_, ref = BgUtils_.safeObj_<ValidKeyAction | ChildKeyFSM>(),
    hasFoundChanges = value !== null,
    keyRe = BgUtils_.keyRe_, strip = BgUtils_.stripKey_,
    kWarn = 'Inactive key: %o with "%s"', isOldWrong = d.errors_ !== null
    if (hasFoundChanges) {
      d.errors_ = d.keyFSM_ = null
      /*#__NOINLINE__*/ parseKeyMappings_(value!)
    }
    const allKeys = BgUtils_.keys_(d.keyToCommandRegistry_),
    mappedKeyReg = d.mappedKeyRegistry_,
    customKeys = builtinKeys_ ? allKeys.filter(i => !builtinKeys_!.has(i)) : allKeys,
    countOfCustomKeys = customKeys.length,
    sortedKeys = builtinKeys_ ? customKeys.concat(BgUtils_.keys_(builtinKeys_)) : allKeys
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
          hasFoundChanges && logError_(kWarn, ref[key2] as ReadonlyChildKeyFSM, key)
        }
        ref[key2] = KeyAction.cmd;
        continue;
      }
      let ref2 = ref as ChildKeyFSM, tmp: ChildKeyFSM | ValidChildKeyAction | undefined, j = 0;
      while ((tmp = ref2[strip(arr[j])]) && j < last) { j++; ref2 = tmp; }
      if (tmp != null && (index >= countOfCustomKeys || tmp === KeyAction.cmd)) {
        index >= countOfCustomKeys ? d.keyToCommandRegistry_.delete(key) :
        hasFoundChanges && logError_(kWarn, key, arr.slice(0, j + 1).join(""))
        continue;
      }
      tmp != null && hasFoundChanges && logError_(kWarn, tmp, key)
      while (j < last) { ref2 = ref2[strip(arr[j++])] = BgUtils_.safeObj_() as ChildKeyFSM; }
      ref2[strip(arr[last])] = KeyAction.cmd;
    }
    if (!hasFoundChanges) { /* empty */ }
    else if (d.errors_) {
      if (d.errors_.length > 1) {
        console.group(d.errors_.length + " Errors in custom Key mappings:");
        d.errors_.map(line => console.log(...line))
        console.groupEnd()
      } else {
        console.log.apply(console, d.errors_[0])
      }
    } else if (isOldWrong) {
      console.log("The new key mappings have no errors");
    }
    d.keyFSM_ = ref
    builtinKeys_ = null
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
  (CommandsData_.errors_ || (CommandsData_.errors_ = [])).push([].slice.call(arguments, 0))
} as (firstMsg: string, ...args: any[]) => void

const defaultKeyMappings_: string =
  "? "     +AsC_("showHelp")            +" <a-c> "  +AsC_("previousTab")     +" <a-s-c> "+AsC_("nextTab")             +
  " d "    +AsC_("scrollPageDown")      +" <c-e> "  +AsC_("scrollDown")      +" f "      +AsC_("LinkHints.activate")  +
  " <f1> " +AsC_("simBackspace")        +" <s-f1> " +AsC_("switchFocus")     +" <f2> "   +AsC_("switchFocus")         +
  " <f8> " +AsC_("enterVisualMode")     +" G "      +AsC_("scrollToBottom")  +" gf "     +AsC_("nextFrame")           +
  " gg "   +AsC_("scrollToTop")         +" gi "     +AsC_("focusInput")      +" gn "     +AsC_("toggleVomnibarStyle") +
  " gs "   +AsC_("toggleViewSource")    +" gt "     +AsC_("nextTab")         +" gu "     +AsC_("goUp")                +
  " gF "   +AsC_("mainFrame")           +" gT "     +AsC_("previousTab")     +" gU "     +AsC_("goToRoot")            +
  " g0 "   +AsC_("firstTab")            +" g$ "     +AsC_("lastTab")         +" h "      +AsC_("scrollLeft")          +
  " H "    +AsC_("goBack")              +" i "      +AsC_("enterInsertMode") +" j "      +AsC_("scrollDown")          +
  " J "    +AsC_("previousTab")         +" K "      +AsC_("nextTab")         +" k "      +AsC_("scrollUp")            +
  " l "    +AsC_("scrollRight")         +" L "      +AsC_("goForward")       +" <a-m> "  +AsC_("toggleMuteTab")       +
  " N "    +AsC_("performBackwardsFind")+" n "      +AsC_("performFind")     +" <a-n> "  +AsC_("performAnotherFind")  +
  " o "    +AsC_("Vomnibar.activate")   +" <a-p> "  +AsC_("togglePinTab")    +" r "      +AsC_("reload")              +
  " R "    +AsC_("reloadGivenTab")      +" <a-r> "  +AsC_("reloadTab")       +" <a-s-r> "+AsC_("reopenTab")           +
  " t "    +AsC_("createTab")           +" <a-t> "  +AsC_("createTab")       +" u "      +AsC_("scrollPageUp")        +
  " V "    +AsC_("enterVisualLineMode") +" v "      +AsC_("enterVisualMode") +" <a-v> "  +AsC_("nextTab")             +
  " W "    +AsC_("moveTabToNextWindow") +" x "      +AsC_("removeTab")       +" X "      +AsC_("restoreTab")          +
  " yt "   +AsC_("duplicateTab")        +" yy "     +AsC_("copyCurrentUrl")  +" <c-y> "  +AsC_("scrollUp")            +
  " zH "   +AsC_("scrollToLeft")        +" zL "     +AsC_("scrollToRight")   +" / "      +AsC_("enterFindMode")       +
  " ` "    +AsC_("Marks.activate")      +" ^ "      +AsC_("visitPreviousTab")+" [[ "     +AsC_("goPrevious")          +
  " ]] "   +AsC_("goNext")              +" << "     +AsC_("moveTabLeft")     +" >> "     +AsC_("moveTabRight")        +
  " b "    +AsC_("Vomnibar.activateBookmarks")             + " ge "    + AsC_("Vomnibar.activateUrl")                 +
  " gE "   +AsC_("Vomnibar.activateUrlInNewTab")           + " m "     + AsC_("Marks.activateCreateMode")             +
  " p "    +AsC_("openCopiedUrlInCurrentTab")              + " yf "    + AsC_("LinkHints.activateModeToCopyLinkUrl")  +
  " B "    +AsC_("Vomnibar.activateBookmarksInNewTab")     + " F "     + AsC_("LinkHints.activateModeToOpenInNewTab") +
  " O "    +AsC_("Vomnibar.activateInNewTab")              + " P "     + AsC_("openCopiedUrlInNewTab")                +
  " T "    +AsC_("Vomnibar.activateTabSelection")          + " <a-f> " + AsC_("LinkHints.activateModeWithQueue")      +
  (Build.NDEBUG ? "" : ` <a-s-f12> ${AsC_("debugBackground")} <s-f12> ${CNameLiterals.focusOptions}`)

export const availableCommands_: Dict<CommandsNS.Description> & SafeObject =
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
  blank: [ kBgCmd.blank, 1, 0 ],
  clearCS: [ kBgCmd.clearCS, 1, 1, { type: "images" } ],
  clearFindHistory: [ kBgCmd.clearFindHistory, 1, 1 ],
  closeDownloadBar: [ kBgCmd.closeDownloadBar, 1, 1, { all: 1 } ],
  closeOtherTabs: [ kBgCmd.removeTabsR, 1, 1, { other: true } ],
  closeTabsOnLeft: [ kBgCmd.removeTabsR, 1, 0, { $count: -1e6 } ],
  closeTabsOnRight: [ kBgCmd.removeTabsR, 1, 0, { $count: 1e6 } ],
  captureTab: [ kBgCmd.captureTab, 1, 1 ],
  copyCurrentTitle: [ kBgCmd.copyWindowInfo, 1, 1, { type: "title" } ],
  copyCurrentUrl: [ kBgCmd.copyWindowInfo, 1, 1 ],
  copyWindowInfo: [ kBgCmd.copyWindowInfo, 1, 0, { type: "window" } ],
  createTab: [ kBgCmd.createTab, 1, 20 as 0 ],
  debugBackground: [ kBgCmd.openUrl, 1, 1,
    {
      reuse: ReuseType.reuse, group: false,
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
  goBack: [ kFgCmd.framesGoBack, 0, 0, { $count: -1 } ],
  goForward: [ kFgCmd.framesGoBack, 0, 0 ],
  goNext: [ kBgCmd.goNext, 1, 0, { sed: true } ],
  goPrevious: [ kBgCmd.goNext, 1, 0, { sed: true, rel: "prev" } ],
  goToRoot: [ kBgCmd.goUp, 1, 0, { } ],
  goUp: [ kBgCmd.goUp, 1, 0, { $count: -1, type: "frame" } ],
  joinTabs: [ kBgCmd.joinTabs, 1, 1 ],
  lastTab: [ kBgCmd.goToTab, 1, 0, { $count: -1, absolute: true } ],
  mainFrame: [ kBgCmd.mainFrame, 1, 1 ],
  moveTabLeft: [ kBgCmd.moveTab, 1, 0, { $count: -1 } ],
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
  performBackwardsFind: [ kBgCmd.performFind, 1, 0, { $count: -1 } ],
  performFind: [ kBgCmd.performFind, 1, 0 ],
  previousTab: [ kBgCmd.goToTab, 1, 0, { $count: -1 } ],
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
  simulateBackspace: [ kFgCmd.focusInput, 0, 1, { act: "backspace" } ],
  sortTabs: [ kBgCmd.joinTabs, 1, 1, { sort: "recency", windows: "current" } ],
  switchFocus: [ kFgCmd.focusInput, 0, 1, { act: "switch" } ],
  toggleCS: [ kBgCmd.toggleCS, 1, 0, { type: "images" } ],
  toggleContentSettings: [ kBgCmd.toggleCS, 1, 0, { type: "images" } ],
  toggleLinkHintCharacters: [ kBgCmd.toggle, 1, 1, { key: "linkHintCharacters" } ],
  toggleMuteTab: [ kBgCmd.toggleMuteTab, 1, 1 ],
  togglePinTab: [ kBgCmd.togglePinTab, 1, /** 30 in all_commands.ts */ 0 ],
  toggleStyle: [ kFgCmd.toggleStyle, 0, 1 ],
  toggleSwitchTemp: [ kBgCmd.toggle, 1, 1 ],
  toggleViewSource: [ kBgCmd.toggleTabUrl, 1, 1, { opener: true } ],
  toggleReaderMode: [ kBgCmd.toggleTabUrl, 1, 1, { reader: true, reuse: ReuseType.current, opener: true } ],
  toggleVomnibarStyle: [ kBgCmd.toggleVomnibarStyle, 1, 1, { style: "dark" } ],
  visitPreviousTab: [ kBgCmd.visitPreviousTab, 1, 0 ],
  wait: [ kBgCmd.blank, 1, 0, { wait: "count" } ],
  zoomIn: [ kBgCmd.toggleZoom, 1, 0 ],
  zoomOut: [ kBgCmd.toggleZoom, 1, 0, { $count: -1 } ],
  zoomReset: [ kBgCmd.toggleZoom, 1, 0, { $count: 9e4 } ]
})

const hintModes_: SafeDict<HintMode> = {
    __proto__: null as never,
  newtab: HintMode.OPEN_IN_NEW_BG_TAB,
  "new-active": HintMode.OPEN_IN_NEW_FG_TAB, "newtab-active": HintMode.OPEN_IN_NEW_FG_TAB,
  hover: HintMode.HOVER, unhover: HintMode.UNHOVER, leave: HintMode.UNHOVER,
  focus: HintMode.FOCUS,
  "download-media": HintMode.DOWNLOAD_MEDIA, "download-image": HintMode.DOWNLOAD_MEDIA,
  image: HintMode.OPEN_IMAGE, "open-image": HintMode.OPEN_IMAGE, media: HintMode.OPEN_IMAGE,
  search: HintMode.SEARCH_TEXT, "search-text": HintMode.SEARCH_TEXT,
  copy: HintMode.COPY_TEXT, "copy-text": HintMode.COPY_TEXT,
  "copy-list": HintMode.COPY_TEXT | HintMode.list | HintMode.queue,
  "copy-url": HintMode.COPY_URL, "copy-url-list": HintMode.COPY_URL | HintMode.list | HintMode.queue,
  download: HintMode.DOWNLOAD_LINK, incognito: HintMode.OPEN_INCOGNITO_LINK,
  "edit-url": HintMode.EDIT_LINK_URL, edit: HintMode.EDIT_TEXT, "edit-text": HintMode.EDIT_TEXT,
  input: HintMode.FOCUS_EDITABLE, "focus-input": HintMode.FOCUS_EDITABLE, editable: HintMode.FOCUS_EDITABLE,
  "focus-editable": HintMode.FOCUS_EDITABLE,
  visual: HintMode.ENTER_VISUAL_MODE
}

CommandsData_ = {
  keyFSM_: null,
  mappedKeyRegistry_: null,
  keyToCommandRegistry_: null as never as Map<string, CommandsNS.Item>,
  errors_: null
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
  (availableCommands_ as unknown as Writable<NameMetaMapEx>).focusOptions = [
    kBgCmd.openUrl, 1, 1, { reuse: ReuseType.reuse, url: "vimium://options", group: false }
  ];
}

if (Settings_.temp_.initing_ & BackendHandlersNS.kInitStat.platformInfo) {
  populateKeyMap_(Settings_.get_("keyMappings"))
  if (Build.BTypes & ~BrowserType.Edge && contentPayload.o === kOS.mac) {
    visualKeys_["m-s-c"] = VisualAction.YankRichText
  }
}

Settings_.updateHooks_.keyMappings = function (this: {}, value: string | null): void {
  const oldMappedKeys = CommandsData_.mappedKeyRegistry_, oldFSM = CommandsData_.keyFSM_
  populateKeyMap_(value)
  const f = JSON.stringify, curMapped = CommandsData_.mappedKeyRegistry_,
  updatesInKeyFSM = !!oldFSM && f(CommandsData_.keyFSM_) !== f(oldFSM),
  updatesInMappedKeys = oldMappedKeys ? !curMapped || f(oldMappedKeys) !== f(curMapped) : !!oldFSM && !!curMapped;
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
