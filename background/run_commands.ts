import {
  framesForTab_, get_cOptions, cPort, cRepeat, reqH_, bgC_, cmdInfo_, set_helpDialogData_, helpDialogData_,
  set_cOptions, set_cPort, cKey, set_cKey, set_cRepeat, set_cNeedConfirm, curTabId_, OnEdge, keyToCommandMap_, blank_
} from "./store"
import * as BgUtils_ from "./utils"
import { Tabs_, runtimeError_, getCurTab, getCurShownTabs_, tabsGet, getCurWnd } from "./browser"
import { ensureInnerCSS, getPortUrl_, indexFrame, safePost, showHUD } from "./ports"
import * as Exclusions from "./exclusions"
import { getI18nJson, trans_ } from "./i18n"
import {
  shortcutRegistry_, normalizedOptions_, envRegistry_, parseOptions_, normalizeCommand_, availableCommands_,
  makeCommand_
} from "./key_mappings"
import C = kBgCmd
import NormalizedEnvCond = CommandsNS.NormalizedEnvCond

const kRunKeyInSeq = "<v-runkey:s>"
const abs = Math.abs
let _gCmdTimer = 0
let gOnConfirmCallback: ((force1: boolean, arg?: FakeArg) => void) | null | undefined
let _gCmdHasNext: boolean | null

/** operate command options */

export const replaceCmdOptions = <T extends keyof BgCmdOptions> (known: CmdOptionSafeToClone<T>): void => {
  set_cOptions(BgUtils_.safer_(known))
}

/** skip commands' private ".$xxx" options and ".$count", except those shared public fields */
export const copyCmdOptions = (dest: CommandsNS.RawOptions, src: CommandsNS.Options): CommandsNS.RawOptions => {
  for (const i in src) {
    if (i[0] !== "$" || "$then=$else=$retry=$f=".includes(i + "=") && !i.includes("=")) {
      i in dest || (dest[i] = src[i])
    }
  }
  return dest
}

/** keep all private and public fields in cOptions */
export const overrideCmdOptions = <T extends keyof BgCmdOptions> (known: CmdOptionSafeToClone<T>
    , disconnected?: boolean, oriOptions?: KnownOptions<T> & SafeObject): void => {
  const old = oriOptions || get_cOptions<T, true>()
  BgUtils_.extendIf_(BgUtils_.safer_(known as KnownOptions<T>), old);
  if (!disconnected) {
    (known as any as CommandsNS.Options).$o = old
  }
  oriOptions || set_cOptions(known as KnownOptions<T> as KnownOptions<T> & SafeObject)
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
  if (callback) {
    if (_gCmdHasNext) {
      const { promise_, resolve_ } = BgUtils_.deferPromise_<CmdResult>();
      (callback as unknown as BgCmdCurWndTabs<kBgCmd>)(tabs!, resolve_)
      promise_.then(runNextCmdByResult)
    } else {
      (callback as unknown as BgCmdCurWndTabs<kBgCmd>)(tabs!, blank_)
    }
  }
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
  count = overriddenCount
    || (count >= GlobalConsts.CommandCountLimit + 1 ? GlobalConsts.CommandCountLimit
        : count <= -GlobalConsts.CommandCountLimit - 1 ? -GlobalConsts.CommandCountLimit
        : (count | 0) || 1)
  if (count === 1) { /* empty */ }
  else if (repeat === 1) { count = 1 }
  else if (repeat > 0 && (count > repeat || count < -repeat)) {
    if (fallbackCounter != null) {
      count = count < 0 ? -1 : 1
    } else if (!overriddenCount) {
        set_cKey(lastKey)
        set_cOptions(null)
        set_cPort(port!)
        set_cRepeat(count)
        void confirm_(registryEntry.command_ as never, Math.abs(count))
        .then((/*#__NOINLINE__*/ onLargeCountConfirmed).bind(null, registryEntry))
        return
    }
  } else { count = count || 1 }
  if (fallbackCounter != null) {
    let maxRetried = fallbackCounter.r! | 0
    maxRetried = Math.max(1, maxRetried >= 0 && maxRetried < 100 ? Math.min(maxRetried || 6, 20) : abs(maxRetried))
    if (fallbackCounter.c && fallbackCounter.c.i >= maxRetried
        && (!options || (options as Req.FallbackOptions).$else !== "showTip")) {
      set_cPort(port!)
      showHUD(`Has ran sequential commands for ${maxRetried} times`)
      return
    }
    const context = makeFallbackContext(fallbackCounter.c, 1, fallbackCounter.u)
    if (options && (registryEntry.alias_ === kBgCmd.runKey || hasFallbackOptions(options as Req.FallbackOptions)
        || context.t && registryEntry.background_)) {
      const opt2: Req.FallbackOptions = { $retry: -maxRetried, $f: context }
      context.t && registryEntry.background_ && !(options as Req.FallbackOptions).$else && (opt2.$else = "showTip")
      options ? overrideCmdOptions<kBgCmd.blank>(opt2, false, options) : BgUtils_.safer_(opt2)
      options = opt2 as typeof opt2 & SafeObject
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
  _gCmdHasNext = registryEntry.hasNext_
  if (_gCmdHasNext === null) {
    _gCmdHasNext = registryEntry.hasNext_ = options != null && hasFallbackOptions(options as Req.FallbackOptions)
  }
  // safe on renaming
  set_cKey(lastKey)
  set_cOptions(options || ((registryEntry as Writable<typeof registryEntry>).options_ = BgUtils_.safeObj_()))
  set_cPort(port!)
  set_cRepeat(count)
  count = cmdInfo_[alias]
  if (port == null && alias < kBgCmd.MAX_NEED_CPORT + 1 && alias > kBgCmd.MIN_NEED_CPORT - 1) {
    /* empty */
  } else if (count < kCmdInfo.ActiveTab) {
    if (_gCmdHasNext) {
      const { promise_, resolve_ } = BgUtils_.deferPromise_<CmdResult>();
      (func as unknown as BgCmdNoTab<kBgCmd>)(resolve_)
      promise_.then(runNextCmdByResult)
    } else {
      (func as BgCmdNoTab<kBgCmd>)(blank_)
    }
  } else {
    _gCmdHasNext = registryEntry.hasNext_
    gOnConfirmCallback = func as BgCmdCurWndTabs<kBgCmd> as any;
    (count < kCmdInfo.CurShownTabsIfRepeat || count === kCmdInfo.CurShownTabsIfRepeat && abs(cRepeat) < 2 ? getCurTab
        : getCurShownTabs_)(/*#__NOINLINE__*/ executeCmdOnTabs)
  }
}

/** show a confirmation dialog */

/** 0=cancel, 1=force1, count=accept */
export const confirm_ = <T extends kCName> (command: CmdNameIds[T] extends kBgCmd ? T : never
    , askedCount: number): Promise<boolean> => {
  if (!(Build.NDEBUG || !command.includes("."))) {
    console.log("Assert error: command should has no limit on repeats: %c%s", "color:red", command)
  }
  if (!cPort) {
    gOnConfirmCallback = null // clear old commands
    set_cRepeat(cRepeat > 0 ? 1 : -1)
    return Promise.resolve(cRepeat > 0)
  }
  if (!helpDialogData_ || !helpDialogData_[1]) {
    return getI18nJson("help_dialog").then(dict => {
      helpDialogData_ ? helpDialogData_[1] = dict : set_helpDialogData_([null, dict, null])
      return confirm_(command, askedCount)
    })
  }
  let msg = trans_("cmdConfirm", [askedCount, helpDialogData_[1][command] || `### ${command} ###`])
  const { promise_, resolve_ } = BgUtils_.deferPromise_<boolean>()
  const countToReplay = cRepeat, bakOptions = get_cOptions() as any, bakPort = cPort
  setupSingletonCmdTimer(setTimeout(onConfirm, 3000, 0))
  gOnConfirmCallback = (force1: boolean): void => {
    set_cKey(kKeyCode.None)
    set_cOptions(bakOptions)
    set_cPort(bakPort)
    set_cRepeat(force1 ? countToReplay > 0 ? 1 : -1 : countToReplay)
    set_cNeedConfirm(0)
    resolve_(force1)
    setTimeout((): void => { set_cNeedConfirm(1) }, 0)
  }
  (framesForTab_.get(cPort.s.tabId_)?.top_ || cPort).postMessage({
    N: kBgReq.count, c: "", i: _gCmdTimer, m: msg
  })
  return promise_
}

const onConfirm = (response: FgReq[kFgReq.cmd]["r"]): void => {
  const callback = gOnConfirmCallback
  gOnConfirmCallback = null
  response > 1 && callback && callback(response < 3)
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
    if (!OnEdge && Tabs_.goBack) {
      cmdFallback = kBgCmd.goBackFallback
    }
  } else if (cmdName === "autoOpen") {
    cmdFallback = kBgCmd.autoOpenFallback
  }
  if (cmdFallback) {
    /** this object shape should keep the same as the one in {@link key_mappings.ts#makeCommand_} */
    registry = <CommandsNS.Item> As_<CommandsNS.ValidItem>({
      alias_: cmdFallback, background_: 1, command_: cmdName, help_: null,
      options_: registry.options_, hasNext_: null, repeat_: registry.repeat_
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
      || (ref = framesForTab_.get(sender.tab.id), ref ? ref.cur_ : null) : null
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
      const port = framesForTab_.get(cPort ? cPort.s.tabId_ : curTabId_)?.top_ || cPort
      url = port ? port.s.url_ : null
    }
    if (url == null && (url = getPortUrl_(null, true)) instanceof Promise) {
      void url.then((s): void => {
        info.url = s || (cPort ? (framesForTab_.get(cPort.s.tabId_)?.top_ || cPort).s.url_
            : /** should not reach here */ "")
        runKeyWithCond(info)
      })
      return EnvMatchResult.abort
    }
    if (!Exclusions.matchSimply_(host, url)) { return EnvMatchResult.nextEnv }
  }
  if (iframe != null) {
    if (!cPort && iframe !== false) { return EnvMatchResult.nextEnv }
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
        className: BgUtils_.normalizeClassesToMatch_(dot >= 0 ? s.slice(dot + 1, hash > dot ? hash : len) : "")
      })
      return s === "*" || s.includes(" ")
    }) ? (selectorArr.length = 0, "*") : selectorArr)
    const cur = info.element
    if (!selectorArr.length) { /* empty */ }
    else if (cur == null) {
      cPort && safePost(cPort, { N: kBgReq.queryForRunKey, n: performance.now(), c: info })
      return cPort ? EnvMatchResult.abort : EnvMatchResult.nextEnv
    } else if (! selectorArr.some((s): any => cur === 0 ? s.tag === "body" && !s.id && !s.className :
        (!s.tag || cur[0] === s.tag) && (!s.id || cur[1] === s.id) && (!s.className || cur[2].includes(s.className))
    )) {
      return EnvMatchResult.nextEnv
    }
  }
  return EnvMatchResult.matched
}

const normalizeExpects = (options: KnownOptions<C.runKey>): (NormalizedEnvCond | null)[] => {
  const expected_rules = options.expect
  if (options.$normalized) { return expected_rules as NormalizedEnvCond[] }
  const normalizeKeys = (keys: string | string[] | null | undefined): string[] => {
    return keys ? typeof keys === "string" ? keys.trim().split(<RegExpG> /[, ]+/)
        : keys instanceof Array ? keys : [] : []
  }
  let new_rules: (NormalizedEnvCond | null)[] = []
  if (!expected_rules) { /* empty */ }
  else if (expected_rules instanceof Array) {
    new_rules = expected_rules.map((rule): NormalizedEnvCond | null => rule instanceof Array
        ? { env: rule[0] + "", keys: normalizeKeys(rule[1]), options: rule[2] as any }
        : !rule || typeof rule !== "object" ? null
        : { env: rule.env || rule, keys: normalizeKeys(rule.keys), options: rule.options })
  } else if (typeof expected_rules === "object") {
    new_rules = Object.keys(expected_rules).map((name): NormalizedEnvCond => {
      const val = expected_rules[name], isDict = val && typeof val === "object" && !(val instanceof Array)
      return { env: name, keys: normalizeKeys(isDict ? val.keys : val), options: isDict ? val.options : null }
    })
  } else if (typeof expected_rules === "string" && (<RegExpOne> /^[^{].*?[:=]/).test(expected_rules)) {
    new_rules = expected_rules.split(expected_rules.includes(";") ? <RegExpG> /[;\s]+/g : <RegExpG> /[,\s]+/g)
        .map(i => i.split(<RegExpOne> /[:=]/))
        .map((rule): NormalizedEnvCond | null => rule.length !== 2 ? null
              : ({ env: rule[0], keys: normalizeKeys(rule[1]), options: null }))
  }
  new_rules = new_rules.map((i): NormalizedEnvCond | null =>
        i && i.env && i.env !== "__proto__" && i.keys.length ? i : null)
  overrideOption<C.runKey, "expect">("expect", new_rules, options)
  overrideOption<C.runKey, "keys">("keys", normalizeKeys(options.keys), options)
  overrideOption<C.runKey, "$normalized">("$normalized", true, options)
  return new_rules
}

const collectOptions = (opts: { [key: `o.${string}`]: any }): CommandsNS.Options => {
  const o2 = BgUtils_.safeObj_<any>()
  for (const key in opts) {
    if (key.startsWith("o.") && key.length > 2 && !key.includes("$")) { o2[key.slice(2)] = opts[key as `o.${string}`] }
  }
  return o2
}

/** not call runNextCmd on invalid env/key info, but just show HUD to alert */
export const runKeyWithCond = (info?: CurrentEnvCache): void => {
  const absCRepeat = abs(cRepeat)
  let matched: NormalizedEnvCond | undefined
  const frames = framesForTab_.get(cPort ? cPort.s.tabId_ : curTabId_)
  if (!cPort) {
    set_cPort(frames ? frames.cur_ : null as never)
  }
  frames && (frames.flags_ |= Frames.Flags.userActed)
  info = info || {}
  const expected_rules = normalizeExpects(get_cOptions<C.runKey, true>())
  for (const normalizedRule of expected_rules) {
    if (!normalizedRule) { continue }
    const ruleName = normalizedRule.env
    let rule: CommandsNS.EnvItem | string | undefined = ruleName
    if (typeof rule === "string") {
      if (!envRegistry_) {
        showHUD("No environments have been declared")
        return
      }
      rule = envRegistry_.get(rule)
      if (!rule) {
        showHUD(`No environment named "${ruleName}"`)
        return
      }
      if (typeof rule === "string") {
        rule = parseOptions_(rule) as CommandsNS.EnvItem
        envRegistry_.set(ruleName as string, rule)
      }
    }
    const res = matchEnvRule(rule, info)
    if (res === EnvMatchResult.abort) { return }
    if (res === EnvMatchResult.matched) {
      matched = normalizedRule
      break
    }
  }
  const keys = (matched ? matched.keys : get_cOptions<C.runKey, true>().keys) as (string | BlockNode)[]
  let key: string | BlockNode
  const sub_name = matched ? typeof matched.env === "string" ? `[${matched.env}]: `
      : `(${expected_rules.indexOf(matched)})` : ""
  if (keys.length === 0) {
    showHUD(sub_name + "Require keys: comma-seperated-string | string[]")
  } else if (absCRepeat > keys.length && keys.length !== 1) {
    showHUD(sub_name + "Has no such a key")
  } else if (key = keys[keys.length === 1 ? 0 : absCRepeat - 1],
      typeof key !== "string" && (typeof key !== "object" || key.t !== kN.block) || !key) {
    showHUD(sub_name + "The key is invalid")
  } else {
    const repeat = keys.length === 1 ? cRepeat : absCRepeat !== cRepeat ? -1 : 1
    const options = matched && matched.options || get_cOptions<C.runKey, true>().options
        || collectOptions(get_cOptions<C.runKey, true>())
    if (typeof key !== "string" || (<RegExpOne> /[()?:+%]/).test(key)) {
      typeof key === "string" && (key = keys[keys.length === 1 ? 0 : absCRepeat - 1] = parseKeySeq(key))
      const fakeOptions: KnownOptions<C.runKey> = {
        $seq: { keys: key, repeat, options, cursor: key, timeout: 0 },
        $then: kRunKeyInSeq, $else: "-" + kRunKeyInSeq, $retry: -999
      }
      replaceCmdOptions(fakeOptions)
      keyToCommandMap_.set(kRunKeyInSeq, makeCommand_("runKey", fakeOptions as CommandsNS.Options)!)
      runKeyInSeq(fakeOptions.$seq!, 1, null)
    } else {
      let count = 1, arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
      if (arr != null) {
        let prefix = arr[0]
        key = key.slice(prefix.length)
        count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
      }
      runKeyWithOptions(key, count * repeat, options)
    }
  }
}

declare const enum kN { key = 0, block = 1, ifElse = 2 }
interface BaseNode { t: kN; val: unknown; par: Node | null }
interface KeyNode extends BaseNode { t: kN.key; val: string; par: BlockNode }
interface BlockNode extends BaseNode { t: kN.block; val: (Node | KeyNode)[] }
interface IfElseNode extends BaseNode { t: kN.ifElse; val: { cond: Node, t: Node | null, f: Node | null}; par: Node }
type Node = BlockNode | IfElseNode
export const parseKeySeq = (keys: string): BlockNode => {
  let cur: BlockNode = { t: kN.block, val: [], par: null }, root: BlockNode = cur, last: Node | null
  for (let i = 0; i < keys.length; i++) {
    switch (keys[i]) {
    case "(":
      last = cur; cur = { t: kN.block, val: [], par: cur }; last.val.push(cur)
      break
    case ")": last = cur; do { last = last.par! } while (last.t === kN.ifElse); cur = last; break
    case "?": case ":":
      last = keys[i] === "?" ? null : cur
      while (last && last.t !== kN.ifElse) { last = last.par } 
      if (!last || last.val.f) {
        last = cur.par
        cur.par = { t: kN.ifElse, val: { cond: cur, t: null, f: null },
                    par: last || (root = { t: kN.block, val: [], par: null }) }
        !last ? root.val.push(cur.par)
            : last.t === kN.block ? last.val.splice(last.val.indexOf(cur), 1, cur.par)
            : last.val.t === cur ? last.val.t = cur.par : last.val.f = cur.par
        last = cur.par
      }
      cur = { t: kN.block, val: [], par: last }
      keys[i] === "?" ? last.val.t = cur : last.val.f = cur
      break
    case "+": break
    default:
      const key = (<RegExpOne>/^(?:[$%]c)?(?:[\d-]\d*)?([$%]c)?(?:<(?!<)(?:.-){0,4}.\w*?(?::i)?>|\w+)/
          ).exec(keys.slice(i).split("+")[0])
      key && (cur.val.push({ t: kN.key, val: key[0], par: cur }), i += key[0].length - 1)
      break
    }
  }
  if (!Build.NDEBUG) { (root as Object as {toJSON?: any}).toJSON = exprKeySeq }
  return root
}

const exprKeySeq = function (this: BlockNode): object | string | null {
  const ifNotEmpty = (arr: any[]): any[] | null => arr.some(i => i != null) ? arr : null
  const iter = (node: Node | KeyNode | null): object | string | null => {
    return !node ? null
        : node.t == kN.block ? node.val.length === 1 ? iter(node.val[0])
            : node.val.length === 0 ? null : ifNotEmpty(node.val.map(iter))
        : node.t !== kN.ifElse ? As_<string>(node.val)
        : { if: iter(node.val.cond), then: iter(node.val.t), else: iter(node.val.f) }
  }
  return iter(this)
}

/**
 * syntax: a?b+c+2d:(e+-3f?-4g:h+i)?:j
 * * `"-"` only contributes to number prefixes
 * * `"%c" | "$c"` means the outer repeat
 */
export const runKeyInSeq = (seq: BgCmdOptions[C.runKey]["$seq"], dir: number
    , fallback: Req.FallbackOptions["$f"] | null): void => {
  let cursor: Node | KeyNode | null = seq.cursor as BlockNode | KeyNode
  let down = true
  if (cursor.t === kN.key) {
    const par: BlockNode = cursor.par, ind = par.val.indexOf(cursor)
    cursor = ind < par.val.length - 1 && dir > 0 ? par.val[ind + 1] : (down = false, par)
  }
  while (cursor && cursor.t !== kN.key) {
    if (down && cursor.t === kN.block && cursor.val.length > 0) {
      cursor = cursor.val[0]
    } else if (down && cursor.t === kN.ifElse) {
      cursor = cursor.val.cond
    } else if (!cursor.par) {
      cursor = null
      break
    } else if (cursor.par.t === kN.block) {
      const par: BlockNode = cursor.par, ind = par.val.indexOf(cursor)
      dir < 0 && ind < par.val.length - 1 && (dir = 1)
      down = ind < par.val.length - 1
      cursor = down ? par.val[ind + 1] : par
    } else {
      const par: IfElseNode = cursor.par
      down = cursor === par.val.cond
      cursor = down && (dir > 0 ? par.val.t : (dir = 1, par.val.f)) || (down = false, par)
    }
  }
  if (!cursor) {
    keyToCommandMap_.set(kRunKeyInSeq, makeCommand_("blank", null))
    clearTimeout(seq.timeout || 0)
    dir < 0 && fallback && fallback.t && showHUD(trans_(`${fallback.t as 99}`))
    return
  }
  const timeout = seq.timeout = setTimeout(() => {
    const old = keyToCommandMap_.get(kRunKeyInSeq)
    const opts2 = old && (old.options_ as KnownOptions<C.runKey>)
    if (opts2 && opts2.$seq && opts2.$seq.timeout === timeout) {
      keyToCommandMap_.set(kRunKeyInSeq, makeCommand_("blank", null))
    }
  }, 10000)
  seq.cursor = As_<KeyNode>(cursor)
  let key = cursor.val, hasCount = key.includes("%c")
  hasCount && (key = key.replace("%c", ""))
  let subCount = 1, arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
  if (arr != null) {
    let prefix = arr[0]
    key = key.slice(prefix.length)
    subCount = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
  }
  runKeyWithOptions(key.includes("<") || key in availableCommands_ ? key
      : keyToCommandMap_.has(key) ? key : `<v-${key}>`
      , subCount * (hasCount ? seq.repeat : 1), seq.options)
}

const runKeyWithOptions = (key: string, count: number, exOptions?: CommandsNS.EnvItemOptions | null): void => {
  let registryEntry = key !== "__proto__" ? keyToCommandMap_.get(key) : null
  if (registryEntry == null && key in availableCommands_) {
    registryEntry = makeCommand_(key, null)
  }
  if (registryEntry == null) {
    showHUD(`the "${key}" has not been mapped`)
    return
  } else if (registryEntry.alias_ === kBgCmd.runKey && registryEntry.background_
      && !(exOptions as KnownOptions<C.runKey>).$seq) {
    showHUD('"runKey" can not be nested')
    return
  }
  BgUtils_.resetRe_()
  const fallOpts = parseFallbackOptions(get_cOptions<C.runKey, true>())
  const fStatus = get_cOptions<C.runKey, true>().$f
  if (exOptions && typeof exOptions === "object" || fallOpts || fStatus) {
    const originalOptions = normalizedOptions_(registryEntry)
    registryEntry = BgUtils_.extendIf_(BgUtils_.safeObj_<{}>(), registryEntry)
    let newOptions: CommandsNS.RawOptions & NonNullable<CommandsNS.EnvItem["options"]> = BgUtils_.safeObj_()
    exOptions && copyCmdOptions(newOptions, BgUtils_.safer_(exOptions))
    fallOpts && BgUtils_.extendIf_(newOptions, BgUtils_.safer_(fallOpts))
    originalOptions && copyCmdOptions(newOptions, originalOptions)
    newOptions.$f = fStatus
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

export const hasFallbackOptions = (options: Req.FallbackOptions): boolean => !!(options.$then || options.$else)

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

const makeFallbackContext = (old: Req.FallbackOptions["$f"], counterStep: number, newTip: kTip | 0 | false
    ): NonNullable<Req.FallbackOptions["$f"]> => {
  return {
    i: (old ? old.i : 0) + counterStep,
    t: newTip && newTip !== 2 ? newTip : old ? old.t : 0
  }
}

export const runNextCmd = <T extends KeysWithFallback<BgCmdOptions> = never> (
    useThen: T extends kBgCmd ? BOOL : "need kBgCmd"): boolean => {
  return runNextCmdBy(useThen, get_cOptions<T, true>() as Req.FallbackOptions)
}

export declare const enum kRunOn { otherCb = 0, tabCb = 1, otherPromise = 2, tabPromise = 3 }

export const getRunNextCmdBy = <T extends kRunOn> (isResultTab: T
    ): (result?: T extends kRunOn.tabCb | kRunOn.tabPromise ? Tab : unknown) => void =>
  hasFallbackOptions(get_cOptions<C.blank, true>()) ? (result?: unknown): void => {
    const err = isResultTab & 2 ? result === undefined : runtimeError_(), options = get_cOptions<C.blank, true>()
    err ? runNextCmdBy(0, options) : runNextOnTabLoaded(options, isResultTab & 1 ? result as Tab : null)
    return isResultTab & 2 ? undefined : err
  } : isResultTab & 2 ? blank_ : runtimeError_

const runNextCmdByResult = (result: CmdResult): void => {
  typeof result === "object" ? runNextOnTabLoaded(get_cOptions<C.blank, true>(), result)
  : typeof result === "boolean" ? runNextCmdBy(result ? 1 : 0, get_cOptions<C.blank, true>(), null)
  : As_<0 | 1 | -1 | 50>(result) < 0 ? void 0
  : runNextCmdBy(result ? 1 : 0, get_cOptions<C.blank, true>(), result > 1 ? result : null)
}

export const runNextCmdBy = (useThen: BOOL, options: Req.FallbackOptions, timeout?: number | null): boolean => {
  const nextKey = useThen ? options.$then : options.$else
  const hasFallback = !!nextKey && typeof nextKey === "string"
  if (hasFallback) {
    const fStatus: NonNullable<FgReq[kFgReq.key]["f"]> = { c: options.$f, r: options.$retry, u: 0, w: 0 }
    setupSingletonCmdTimer(setTimeout((): void => {
      const frames = framesForTab_.get(curTabId_),
      port = cPort && cPort.s.tabId_ === curTabId_ && frames && frames.ports_.indexOf(cPort) > 0 ? cPort
          : !frames ? null : frames.cur_.s.status_ === Frames.Status.disabled
          && frames.ports_.filter(i => i.s.status_ !== Frames.Status.disabled)
              .sort((a, b) => a.s.frameId_ - b.s.frameId_)[0] || frames.cur_
      if ((<RegExpI> /^[a-z]+(\.[a-zA-Z]+)?$/i).test(nextKey!) && nextKey! in availableCommands_) {
        executeCommand(makeCommand_(nextKey!, null), 1, kKeyCode.None, port, 0, fStatus)
      } else {
        reqH_[kFgReq.key](As_<Req.fg<kFgReq.key>>({ H: kFgReq.key, k: nextKey!, l: kKeyCode.None, f: fStatus }), port)
      }
    }, timeout || 50))
  }
  return hasFallback
}

export const runNextOnTabLoaded = (options: OpenUrlOptions | Req.FallbackOptions | CommandsNS.Options
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
      // not check injection status - let the command of `wait for="ready"` check it
      // so some commands not using cPort can run earlier
      if (callback && !isTimedOut && !framesForTab_.has(tab1.id)) {
        return
      }
      setupSingletonCmdTimer(0)
      gOnConfirmCallback = null
      callback && callback()
      nextKey && runNextCmdBy(1, options as {}, callback ? 67 : 0)
    }
  }
  const timeout = targetTab !== false ? 1500 : 500
  let tabId = targetTab ? targetTab.id : targetTab !== false ? GlobalConsts.TabIdNone : curTabId_,
  start = Date.now()
  setupSingletonCmdTimer(setInterval((): void => {
    tabsGet(tabId !== GlobalConsts.TabIdNone ? tabId : curTabId_, onTimer)
  }, 100)) // it's safe to clear an interval using `clearTimeout`
}

export const waitAndRunKeyReq = (request: WithEnsured<FgReq[kFgReq.key], "f">, port: Port | null): void => {
  const fallback: Req.FallbackOptions = { $then: request.k, $else: null, $retry: request.f.r,
        $f: makeFallbackContext(request.f.c, 0, request.f.u) }
  set_cKey(request.l)
  set_cPort(port!)
  if (request.f.u === false) {
    runNextOnTabLoaded(fallback, null)
  } else {
    runNextCmdBy(1, fallback, request.f.w)
  }
}
