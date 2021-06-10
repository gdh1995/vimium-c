import {
  browserTabs, runtimeError_, getCurTab, getCurShownTabs_ff_only, getCurTabs, tabsGet, getCurWnd
} from "./browser"
import {
  framesForTab, get_cOptions, cPort, cRepeat, reqH_, bgC_, cmdInfo_,
  set_cOptions, set_cPort, cKey, set_cKey, set_cRepeat, set_cNeedConfirm
} from "./store"
import {
  shortcutRegistry_, normalizedOptions_, envRegistry_, parseOptions_, normalizeCommand_, availableCommands_,
  makeCommand_
} from "./key_mappings"
import { ensureInnerCSS, getPortUrl, indexFrame, safePost, showHUD } from "./ports"
import C = kBgCmd

const abs = Math.abs
let _gCmdTimer = 0
let _confirmationMayFail = 0
let gOnConfirmCallback: ((force1: boolean, arg?: FakeArg) => void) | null | undefined

/** operate command options */

export const replaceCmdOptions = <T extends keyof BgCmdOptions> (known: CmdOptionSafeToClone<T>): void => {
  set_cOptions(BgUtils_.safer_(known))
}

/** skip commands' private ".$xxx" options and ".$count", except those shared public fields */
export const copyCmdOptions = (dest: CommandsNS.RawOptions, src: CommandsNS.Options
    , allow$f: BOOL): CommandsNS.RawOptions => {
  for (const i in src) {
    if (i[0] !== "$" || !i.includes("=") && "$then=$else=$retry=".includes(i + "=") || (allow$f && i === "$f")) {
      i in dest || (dest[i] = src[i])
    }
  }
  return dest
}

/** keep all private and public fields in cOptions */
export const overrideCmdOptions = <T extends keyof BgCmdOptions> (known: CmdOptionSafeToClone<T>
    , disconnected?: true): void => {
  BgUtils_.extendIf_(BgUtils_.safer_(known as KnownOptions<T>), get_cOptions<T, true>());
  if (!disconnected) {
    (known as any as CommandsNS.Options).$o = get_cOptions<T, true>()
  }
  set_cOptions(known as KnownOptions<T> as KnownOptions<T> & SafeObject)
}

type StrStartWith$<K extends string> = K extends `$${string}` ? K : never
type BgCmdCanBeOverride = keyof SafeStatefulBgCmdOptions | keyof StatefulBgCmdOptions
type KeyCanBeOverride<T extends BgCmdCanBeOverride> =
    T extends keyof SafeStatefulBgCmdOptions ? SafeStatefulBgCmdOptions[T]
    : T extends keyof StatefulBgCmdOptions
    ? (StatefulBgCmdOptions[T] extends null ? never : StatefulBgCmdOptions[T] & keyof BgCmdOptions[T])
      | Exclude<StrStartWith$<keyof BgCmdOptions[T] & string>, keyof Req.FallbackOptions>
    : never
export const overrideOption = <T extends BgCmdCanBeOverride, K extends KeyCanBeOverride<T> = KeyCanBeOverride<T>>(
    field: K, value: K extends keyof BgCmdOptions[T] ? NonNullable<BgCmdOptions[T][K]> : never,
    curOptions?: KnownOptions<T>): void => {
  curOptions = curOptions || get_cOptions<T, true>() as KnownOptions<T>
  curOptions[field as keyof BgCmdOptions[T]] = value!
  const parentOptions = (curOptions as unknown as CommandsNS.Options).$o
  if (parentOptions != null) { overrideOption(field, value, parentOptions as unknown as KnownOptions<T>) }
}

/** execute a command normally */

const executeCmdOnTabs = (tabs: Tab[] | [Tab] | undefined): void => {
  const callback = gOnConfirmCallback
  gOnConfirmCallback = null
  callback && (callback as unknown as BgCmdCurWndTabs<kBgCmd>)(tabs!)
  return tabs ? void 0 : runtimeError_()
}

const onLargeCountConfirmed = (registryEntry: CommandsNS.Item): void => {
  executeCommand(registryEntry, 1, cKey, cPort, cRepeat)
}

export const executeCommand = (registryEntry: CommandsNS.Item, count: number, lastKey: kKeyCode, port: Port | null
    , overriddenCount: number, fallbackCounter?: FgReq[kFgReq.key]["f"]): void => {
  setupSingletonCmdTimer(0)
  if (gOnConfirmCallback) {
    gOnConfirmCallback = null // just in case that some callbacks were thrown away
    return
  }
  let scale: number | undefined
  let options = normalizedOptions_(registryEntry), repeat = registryEntry.repeat_
  // .count may be invalid, if from other extensions
  if (options && (scale = options.$count)) { count = count * scale || 1 }
  count = Build.BTypes & ~BrowserType.Chrome && overriddenCount
    || (count >= GlobalConsts.CommandCountLimit + 1 ? GlobalConsts.CommandCountLimit
        : count <= -GlobalConsts.CommandCountLimit - 1 ? -GlobalConsts.CommandCountLimit
        : (count | 0) || 1)
  if (count === 1) { /* empty */ }
  else if (repeat === 1) { count = 1 }
  else if (repeat > 0 && (count > repeat || count < -repeat)) {
    if (fallbackCounter != null) {
      count = count < 0 ? -1 : 1
    } else if (Build.BTypes & ~BrowserType.Chrome) {
      if (!overriddenCount) {
        set_cKey(lastKey)
        set_cOptions(null)
        set_cPort(port!)
        set_cRepeat(count)
        confirm_<kCName, 1>(registryEntry.command_, abs(count),
        (/*#__NOINLINE__*/ onLargeCountConfirmed).bind(null, registryEntry))
        return
      }
    } else {
      count = confirm_<kCName, 1>(registryEntry.command_, abs(count))! * (count < 0 ? -1 : 1)
      if (!count) { return }
    }
  } else { count = count || 1 }
  if (fallbackCounter != null) {
    let maxRetried = fallbackCounter.r! | 0
    maxRetried = Math.max(1, maxRetried >= 0 && maxRetried < 100 ? Math.min(maxRetried || 6, 20) : abs(maxRetried))
    if (fallbackCounter.c >= maxRetried) {
      set_cPort(port!)
      showHUD(`Has ran sequential commands for ${maxRetried} times`)
      return
    }
    if (options && (registryEntry.alias_ === kBgCmd.runKey || parseFallbackOptions(options as Req.FallbackOptions))) {
      set_cOptions(options)
      overrideCmdOptions<kBgCmd.runKey>(As_<Req.FallbackOptions>({
        $f: (fallbackCounter.c | 0) + 1, $retry: -maxRetried
      }))
      options = get_cOptions()
    }
  }
  if (!registryEntry.background_) {
    const { alias_: fgAlias } = registryEntry,
    wantCSS = (kFgCmd.END <= 32 || fgAlias < 32) && <BOOL> (((
      (1 << kFgCmd.linkHints) | (1 << kFgCmd.marks) | (1 << kFgCmd.passNextKey) | (1 << kFgCmd.focusInput)
    ) >> fgAlias) & 1)
        || fgAlias === kFgCmd.scroll && (!!options && (options as CmdOptions[kFgCmd.scroll]).keepHover === false)
    set_cPort(port!)
    port == null || portSendFgCmd(port, fgAlias, wantCSS, options as any, count)
    return
  }
  const { alias_: alias } = registryEntry, func = bgC_[alias]
  // safe on renaming
  set_cKey(lastKey)
  set_cOptions(options || ((registryEntry as Writable<typeof registryEntry>).options_ = BgUtils_.safeObj_()))
  set_cPort(port!)
  set_cRepeat(count)
  count = cmdInfo_[alias]
  if (port == null && alias < kBgCmd.MAX_NEED_CPORT + 1 && alias > kBgCmd.MIN_NEED_CPORT - 1) {
    /* empty */
  } else if (count < kCmdInfo.ActiveTab) {
    (func as BgCmdNoTab<kBgCmd>)()
  } else {
    gOnConfirmCallback = func as BgCmdCurWndTabs<kBgCmd> as any;
    (count < kCmdInfo.CurWndTabsIfRepeat || count === kCmdInfo.CurWndTabsIfRepeat && abs(cRepeat) < 2 ? getCurTab
        : Build.BTypes & BrowserType.Firefox && count > kCmdInfo.CurWndTabs ? getCurShownTabs_ff_only!
        : getCurTabs)(/*#__NOINLINE__*/ executeCmdOnTabs)
  }
}

/** show a confirmation dialog */

/** 0=cancel, 1=force1, count=accept */
export const confirm_ = <T extends kCName, force extends BOOL = 0> (
    command: CmdNameIds[T] extends kBgCmd ? T : force extends 1 ? kCName : never
    , count: number, callback?: (_arg?: FakeArg) => void): number | void => {
  if (!(Build.NDEBUG || !command.includes("."))) {
    console.log("Assert error: command should has no limit on repeats: %c%s", "color:red", command)
  }
  let msg = trans_("cmdConfirm", [count, trans_(command)])
  if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
    if (cPort) {
      gOnConfirmCallback = onConfirmWrapper.bind(0, get_cOptions() as any, cRepeat, cPort, callback!)
      setupSingletonCmdTimer(setTimeout(onConfirm, 3000, 0));
      (indexFrame(cPort.s.tabId_, 0) || cPort).postMessage({
        N: kBgReq.count, c: "", i: _gCmdTimer, m: msg
      })
    } else {
      gOnConfirmCallback = null // clear old commands
    }
    return
  }
  const now = Date.now(), result = window.confirm(msg)
  return Math.abs(Date.now() - now) > 9 ? result ? count : 0
      : (Build.NDEBUG || _confirmationMayFail || (_confirmationMayFail = 1,
          console.log("A confirmation dialog may fail in showing.")), 1)
}

const onConfirmWrapper = (bakOptions: SafeObject, count: number, port: Port
    , callback: (arg?: FakeArg) => void, force1?: boolean): void => {
  force1 || set_cKey(kKeyCode.None)
  set_cOptions(bakOptions)
  set_cRepeat(force1 ? count > 0 ? 1 : -1 : count)
  set_cPort(port)
  callback()
}

export const onConfirm = (response: FgReq[kFgReq.cmd]["r"]): void => {
  const callback = gOnConfirmCallback
  gOnConfirmCallback = null
  if (response > 1 && callback) {
    set_cNeedConfirm(0)
    callback(response < 3)
    set_cNeedConfirm(1)
  }
}

const setupSingletonCmdTimer = (newTimer: number): void => {
  _gCmdTimer && clearTimeout(_gCmdTimer)
  _gCmdTimer = newTimer
}

export const onConfirmResponse = (request: FgReq[kFgReq.cmd], port: Port): void => {
  const cmd = request.c as StandardShortcutNames, id = request.i
  if (id >= -1 && _gCmdTimer !== id) { return } // an old / aborted / test message
  setupSingletonCmdTimer(0)
  if (request.r) {
    onConfirm(request.r)
    return
  }
  executeCommand(shortcutRegistry_!.get(cmd)!, request.n, kKeyCode.None, port, 0)
}

/** forward a triggered command */

export const sendFgCmd = <K extends keyof CmdOptions> (cmd: K, css: boolean, opts: CmdOptions[K]): void => {
  portSendFgCmd(cPort, cmd, css, opts, 1)
}

export const portSendFgCmd = <K extends keyof CmdOptions> (
    port: Port, cmd: K, css: boolean | BOOL, opts: CmdOptions[K], count: number): void => {
  port.postMessage<1, K>({ N: kBgReq.execute, H: css ? ensureInnerCSS(port.s) : null, c: cmd, n: count, a: opts })
}

export const executeShortcut = (shortcutName: StandardShortcutNames, ref: Frames.Frames | null | undefined): void => {
  setupSingletonCmdTimer(0)
  if (ref) {
    let port = ref.cur_
    setupSingletonCmdTimer(setTimeout(executeShortcut, 100, shortcutName, null))
    port.postMessage({ N: kBgReq.count, c: shortcutName, i: _gCmdTimer, m: "" })
    if (!(port.s.flags_ & Frames.Flags.hasCSS || ref.flags_ & Frames.Flags.userActed)) {
      reqH_[kFgReq.exitGrab]({}, port)
    }
    ref.flags_ |= Frames.Flags.userActed
    return
  }
  let registry = shortcutRegistry_!.get(shortcutName)!, cmdName = registry.command_,
  cmdFallback: keyof BgCmdOptions = 0
  if (cmdName === "goBack" || cmdName === "goForward") {
    if (Build.BTypes & ~BrowserType.Edge
        && (!(Build.BTypes & BrowserType.Edge) || OnOther !== BrowserType.Edge)
        && browserTabs.goBack) {
      cmdFallback = kBgCmd.goBackFallback
    }
  } else if (cmdName === "autoOpen") {
    cmdFallback = kBgCmd.autoOpenFallback
  }
  if (cmdFallback) {
    /** this object shape should keep the same as the one in {@link key_mappings.ts#makeCommand_} */
    registry = <CommandsNS.Item> As_<CommandsNS.ValidItem>({
      alias_: cmdFallback, background_: 1, command_: cmdName, help_: null,
      options_: registry.options_, repeat_: registry.repeat_
    })
  }
  if (!registry.background_) {
    return
  }
  if (registry.alias_ > kBgCmd.MAX_NEED_CPORT || registry.alias_ < kBgCmd.MIN_NEED_CPORT) {
    executeCommand(registry, 1, kKeyCode.None, null as never as Port, 0)
  } else {
    let opts = normalizedOptions_(registry)
    if (!opts || !opts.$noWarn) {
      opts = opts || ((registry as Writable<typeof registry>).options_ = BgUtils_.safeObj_<any>());
      (overrideOption as (field: keyof CommandsNS.SharedInnerOptions, value: true
          , curOptions: CommandsNS.SharedInnerOptions) => void)("$noWarn", true, opts)
      console.log("Error: Command", cmdName, "must run on pages which have run Vimium C")
    }
  }
}

/** this functions needs to accept any types of arguments and normalize them */
export const executeExternalCmd = (
    message: Partial<ExternalMsgs[kFgReq.command]["req"]>, sender: chrome.runtime.MessageSender): void => {
  let command = message.command;
  command = command ? command + "" : "";
  const description = command ? availableCommands_[command] : null
  if (!description) { return; }
  let ref: Frames.Frames | undefined
  const port: Port | null = sender.tab ? indexFrame(sender.tab.id, sender.frameId || 0)
      || (ref = framesForTab.get(sender.tab.id), ref ? ref.cur_ : null) : null
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
  executeCommand(regItem, count, lastKey, port, 0)
}

/** execute a command when in a special environment */

declare const enum EnvMatchResult { abort, nextEnv, matched }

export const normalizeClassesToMatch = (s: string): string => {
  s = s && ` ${s.trim().split(<RegExpG> /[.\s]+/g).sort().join(" ").trim()} `
  return s && ` ${s} `
}

const matchEnvRule = (rule: CommandsNS.EnvItem, info: CurrentEnvCache): EnvMatchResult => {
  // avoid sending messages to content scripts - in case a current tab is running slow
  let host = rule.host, iframe = rule.iframe, fullscreen = rule.fullscreen, elSelector = rule.element
  if (host === undefined) {
    host = rule.host = rule.url != null ? rule.url : null
    delete rule.url
  }
  if (typeof host === "string") {
    host = rule.host = Exclusions.createSimpleUrlMatcher_(host)
  }
  if (host != null) {
    let url: string | null | undefined | Promise<string> = info.url
    if (url == null && host.t === kMatchUrl.StringPrefix
        && host.v.indexOf("/", host.v.indexOf("://") + 3) === host.v.length - 1) {
      const port = indexFrame(cPort ? cPort.s.tabId_ : TabRecency_.curTab_, 0) || cPort
      url = port ? port.s.url_ : null
    }
    if (url == null && (url = getPortUrl(null, true)) instanceof Promise) {
      void url.then((s): void => {
        info.url = s || (cPort ? (indexFrame(cPort.s.tabId_, 0) || cPort).s.url_ : /** should not reach here */ "")
        runKeyWithCond(info)
      })
      return EnvMatchResult.abort
    }
    if (!Exclusions.matchSimply_(host, url)) { return EnvMatchResult.nextEnv }
  }
  if (iframe != null) {
    if (!cPort && iframe !== false) { return EnvMatchResult.abort }
    if (typeof iframe === "string") {
      iframe = rule.iframe = Exclusions.createSimpleUrlMatcher_(iframe) || true
    }
    if (typeof iframe === "boolean") {
      if (iframe !== !!(cPort && cPort.s.frameId_)) { return EnvMatchResult.nextEnv }
    } else if (!Exclusions.matchSimply_(iframe, cPort.s.url_)) {
      return EnvMatchResult.nextEnv
    }
  }
  if (fullscreen == null) { /* empty */ }
  else if (info.fullscreen == null) {
    getCurWnd(false, (wnd): void => {
      info.fullscreen = !!wnd && wnd.state.includes("fullscreen")
      runKeyWithCond(info)
      return runtimeError_()
    })
    return EnvMatchResult.abort
  } else if (!!fullscreen !== info.fullscreen) {
    return EnvMatchResult.nextEnv
  }
  if (elSelector && elSelector !== "*") {
    const selectorArr = typeof elSelector === "string" ? [] : elSelector
    typeof elSelector === "string" && (rule.element = elSelector.split(",").some((s): boolean => {
      s = s[0] === "*" ? s.slice(1) : s
      const hash = s.indexOf("#"), dot = s.indexOf("."), len = s.length
      s && selectorArr.push({
        tag: s.slice(0, hash < 0 ? dot < 0 ? len : dot : dot < 0 ? hash : Math.min(dot, hash)),
        id: hash >= 0 ? s.slice(hash + 1, dot > hash ? dot : len) : "",
        className: normalizeClassesToMatch(dot >= 0 ? s.slice(dot + 1, hash > dot ? hash : len) : ""),
      })
      return s === "*" || s.includes(" ")
    }) ? (selectorArr.length = 0, "*") : selectorArr)
    const cur = info.element
    if (!selectorArr.length) { /* empty */ }
    else if (cur == null) {
      cPort && safePost(cPort, { N: kBgReq.queryForRunKey, n: performance.now(), c: info })
      return EnvMatchResult.abort
    } else if (cur === 0 || ! selectorArr.some((s): any =>
        (!s.tag || cur[0] === s.tag) && (!s.id || cur[1] === s.id) && (!s.className || cur[2].includes(s.className))
    )) {
      return EnvMatchResult.nextEnv
    }
  }
  return EnvMatchResult.matched
}

export const runKeyWithCond = (info?: CurrentEnvCache): void => {
  let expected_rules = get_cOptions<kBgCmd.runKey>().expect
  const absCRepeat = Math.abs(cRepeat)
  let matchedIndex: number | string = -1
  let matchedRule: KnownOptions<kBgCmd.runKey> | CommandsNS.EnvItem | CommandsNS.EnvItemWithKeys
      = get_cOptions<kBgCmd.runKey, true>()
  let keys: string | string[] | null | undefined
  const frames = framesForTab.get(cPort ? cPort.s.tabId_ : TabRecency_.curTab_)
  if (!cPort) {
    set_cPort(frames ? frames.cur_ : null as never)
  }
  frames && (frames.flags_ |= Frames.Flags.userActed)
  info = info || {}
  for (let i = 0, size = expected_rules instanceof Array ? expected_rules.length : 0
        ; i < size; i++) {
    let rule: CommandsNS.EnvItem | "__not_parsed__" | CommandsNS.EnvItemWithKeys | null | undefined
        = (expected_rules as CommandsNS.EnvItemWithKeys[])[i]
    const ruleName = (rule as CommandsNS.EnvItemWithKeys).env
    if (ruleName) {
      if (!envRegistry_) {
        showHUD("No environments have been declared")
        return
      }
      rule = envRegistry_.get(ruleName)
      if (!rule) {
        showHUD(`No environment named "${ruleName}"`)
        return
      }
      if (typeof rule === "string") {
        rule = parseOptions_(rule) as CommandsNS.EnvItem
        envRegistry_.set(ruleName, rule)
      }
    } else {
      BgUtils_.safer_(rule)
    }
    const res = matchEnvRule(rule, info)
    if (res === EnvMatchResult.abort) { return }
    if (res === EnvMatchResult.matched) {
      matchedIndex = ruleName || i
      matchedRule = rule
      if (ruleName) {
        keys = (expected_rules as CommandsNS.EnvItemWithKeys[])[i].keys
      }
      break
    }
  }
  if (typeof expected_rules === "string" && (<RegExpOne> /^[^{].*?[:=]/).test(expected_rules)) {
    expected_rules = expected_rules.split(<RegExpG> /[,\s]+/g).map((i): string[] => i.split(<RegExpOne> /[:=]/)
        ).reduce((obj, i): SafeDict<string> => {
      if (i.length === 2 && i[0] !== "__proto__" && (<RegExpOne> /^[\x21-\x7f]+$/).test(i[1])) {
        obj[i[0]] = i[1]
      }
      return obj
    }, BgUtils_.safeObj_<string>())
    overrideOption<C.runKey, "expect">("expect", expected_rules)
  }
  if (matchedIndex === -1 && expected_rules
      && typeof expected_rules === "object" && !(expected_rules instanceof Array)) {
    BgUtils_.safer_(expected_rules)
    if (!envRegistry_) {
      showHUD("No environments have been declared")
      return
    }
    for (let ruleName in expected_rules) {
      let rule = envRegistry_.get(ruleName)
      if (!rule) {
        showHUD(`No environment named "${ruleName}"`)
        return
      }
      if (typeof rule === "string") {
        rule = parseOptions_(rule) as CommandsNS.EnvItem
        envRegistry_.set(ruleName, rule)
      }
      const res = matchEnvRule(rule, info)
      if (res === EnvMatchResult.abort) { return }
      if (res === EnvMatchResult.matched) {
        matchedIndex = ruleName
        matchedRule = rule
        keys = (expected_rules as Exclude<BgCmdOptions[kBgCmd.runKey]["expect"] & object, unknown[]>)[ruleName]
        break
      }
    }
  }
  keys = keys || (matchedRule as KnownOptions<kBgCmd.runKey> | CommandsNS.EnvItemWithKeys).keys
  if (typeof keys === "string") {
    keys = keys.trim().split(BgUtils_.spacesRe_);
    if (typeof matchedIndex === "number") {
      (matchedRule as KnownOptions<kBgCmd.runKey> | CommandsNS.EnvItemWithKeys).keys = keys
    } else {
      (expected_rules as Dict<string | string[]>)[matchedIndex] = keys
    }
  }
  let key: string
  const sub_name = typeof matchedIndex === "number" && matchedIndex >= 0 ? `[${matchedIndex + 1}] ` : ""
  if (!(keys instanceof Array)) {
    showHUD(sub_name + "Require keys: space-seperated-string | string[]")
  } else if (absCRepeat > keys.length && keys.length !== 1) {
    showHUD(sub_name + "Has no such a key")
  } else if (key = keys[keys.length === 1 ? 0 : absCRepeat - 1], typeof key !== "string" || !key) {
    showHUD(sub_name + "The key is invalid")
  } else {
    runKeyWithOptions(key, keys.length === 1 ? cRepeat : absCRepeat !== cRepeat ? -1 : 1
        , matchedRule.options || get_cOptions<kBgCmd.runKey, true>().options)
  }
}

const runKeyWithOptions = (key: string, countScale: number, exOptions?: CommandsNS.EnvItemOptions | null): void => {
  let count = 1, arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
  if (arr != null) {
    let prefix = arr[0]
    key = key.slice(prefix.length)
    count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
  }
  let registryEntry = Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol && key === "__proto__" ? null
      : CommandsData_.keyToCommandRegistry_.get(key)
  if (!registryEntry) {
    showHUD(`the "${key}" has not been mapped`)
    return
  } else if (registryEntry.alias_ === kBgCmd.runKey && registryEntry.background_) {
    showHUD('"runKey" can not be nested')
    return
  }
  BgUtils_.resetRe_()
  count = count * countScale
  const fallOpts = parseFallbackOptions(get_cOptions<C.runKey, true>())
  const fStatus = get_cOptions<C.runKey, true>().$f
  if (exOptions && typeof exOptions === "object" || fallOpts || fStatus) {
    const originalOptions = normalizedOptions_(registryEntry)
    registryEntry = BgUtils_.extendIf_(BgUtils_.safeObj_<{}>(), registryEntry)
    let newOptions: CommandsNS.RawOptions & NonNullable<CommandsNS.EnvItem["options"]> = BgUtils_.safeObj_()
    exOptions && copyCmdOptions(newOptions, BgUtils_.safer_(exOptions), 0)
    fallOpts ? BgUtils_.extendIf_(newOptions, BgUtils_.safer_(fallOpts)) : fStatus && (newOptions.$f = fStatus)
    originalOptions && copyCmdOptions(newOptions, originalOptions, 0)
    if (exOptions && "$count" in exOptions) {
      newOptions.$count = exOptions.$count
    } else if (originalOptions && "$count" in originalOptions) {
      exOptions && "count" in exOptions || (newOptions.$count = originalOptions.$count)
    }
    (registryEntry as Writable<typeof registryEntry>).options_ = newOptions
    if (registryEntry.alias_ === kFgCmd.linkHints && !registryEntry.background_) {
      (registryEntry as Writable<typeof registryEntry>).repeat_ = 0
    }
    normalizeCommand_(registryEntry)
  }
  executeCommand(registryEntry, count, cKey, cPort, 0)
}

/** execute a command referred by .$then or .$else */

export const parseFallbackOptions = (options: Req.FallbackOptions): Req.FallbackOptions | null => {
  const thenKey = options.$then, elseKey = options.$else
  return thenKey || elseKey ? {
    $then: thenKey, $else: elseKey, $retry: options.$retry, $f: options.$f
  } : null
}

export const wrapFallbackOptions = <T extends KeysWithFallback<CmdOptions>, S extends KeysWithFallback<BgCmdOptions>> (
    options: CmdOptionSafeToClone<T>): CmdOptions[T] => {
  const fallback = parseFallbackOptions(get_cOptions<S, true>() as Partial<BgCmdOptions[S]>)
  fallback && BgUtils_.extendIf_(BgUtils_.safer_(options as unknown as CmdOptions[T]), fallback)
  return options as unknown as CmdOptions[T]
}

export const runNextCmd = <T extends KeysWithFallback<BgCmdOptions> = never> (
    useThen: T extends kBgCmd ? BOOL : "need kBgCmd"): boolean => {
  return runNextCmdBy(useThen, get_cOptions<T, true>() as Req.FallbackOptions)
}

export const runNextCmdBy = (useThen: BOOL, options: Req.FallbackOptions, timeout?: number): boolean => {
  const nextKey = useThen ? options.$then : options.$else
  const hasFallback = !!nextKey && typeof nextKey === "string"
  if (hasFallback) {
    const fStatus: NonNullable<FgReq[kFgReq.key]["f"]> = { c: options.$f! | 0, r: options.$retry, w: false }
    setTimeout((): void => {
      const frames = framesForTab.get(TabRecency_.curTab_),
      port = cPort && cPort.s.tabId_ === TabRecency_.curTab_ && frames && frames.ports_.indexOf(cPort) > 0 ? cPort
          : !frames ? null : frames.cur_.s.status_ === Frames.Status.disabled
          && frames.ports_.filter(i => i.s.status_ !== Frames.Status.disabled)
              .sort((a, b) => a.s.frameId_ - b.s.frameId_)[0] || frames.cur_
      if ((<RegExpI> /^[a-z]+(\.[a-zA-Z]+)?$/i).test(nextKey!) && nextKey! in availableCommands_) {
        executeCommand(makeCommand_(nextKey!, null), 1, kKeyCode.None, port, 0, fStatus)
      } else {
        reqH_[kFgReq.key](As_<Req.fg<kFgReq.key>>({ H: kFgReq.key, k: nextKey!, l: kKeyCode.None, f: fStatus }), port)
      }
    }, timeout || 34)
  }
  return hasFallback
}

export const runNextOnTabLoaded = (options: OpenUrlOptions | Req.FallbackOptions
    , targetTab: Tab | null | undefined | /* in cur without wait */ false, callback?: () => void): void => {
  const nextKey = (options as Req.FallbackOptions).$then
  if ((!nextKey || typeof nextKey !== "string") && !callback) {
    return
  }
  const onTimer = (tab1?: Tab): void => {
    const now = Date.now(), isTimedOut = now < start - 500 || now - start >= timeout
    // not clear the _gCmdTimer, in case a (new) tab closes itself and opens another tab
    if (!tab1 || !_gCmdTimer) { tabId = GlobalConsts.TabIdNone; return runtimeError_() }
    if (isTimedOut || tab1.status === "complete") {
      setupSingletonCmdTimer(0)
      callback && callback()
      nextKey && runNextCmdBy(1, options as {}, callback ? 67 : 0)
    }
  }
  const timeout = targetTab !== false ? 1500 : 500
  let tabId = targetTab ? targetTab.id : targetTab !== false ? GlobalConsts.TabIdNone : TabRecency_.curTab_,
  start = Date.now()
  setupSingletonCmdTimer(setInterval((): void => {
    tabsGet(tabId !== GlobalConsts.TabIdNone ? tabId : TabRecency_.curTab_, onTimer)
  }, 100)) // it's safe to clear an interval using `clearTimeout`
}

export const waitAndRunKeyReq = (request: FgReq[kFgReq.key] & Ensure<FgReq[kFgReq.key], "f">): void => {
  request.f.w = false
  set_cKey(request.l)
  runNextOnTabLoaded({ $then: request.k, $else: null, $retry: request.f.r, $f: request.f.c }, null)
}
