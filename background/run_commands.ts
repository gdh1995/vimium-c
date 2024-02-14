import {
  framesForTab_, get_cOptions, cPort, cRepeat, bgC_, cmdInfo_, set_helpDialogData_, helpDialogData_, inlineRunKey_,
  set_cOptions, set_cPort, cKey, set_cKey, set_cRepeat, curTabId_, OnEdge, runOneMapping_, blank_, set_cEnv,
  substitute_, readInnerClipboard_, CONST_, OnChrome
} from "./store"
import * as BgUtils_ from "./utils"
import { Tabs_, runtimeError_, getCurTab, getCurShownTabs_, tabsGet, import2 } from "./browser"
import { headClipNameRe_, tailClipNameRe_, tailSedKeysRe_ } from "./normalize_urls"
import {
  ensureInnerCSS, ensuredExitAllGrab, indexFrame, showHUD, getCurFrames_, refreshPorts_, waitForPorts_
} from "./ports"
import { getI18nJson, trans_ } from "./i18n"
import {
  shortcutRegistry_, normalizedOptions_, availableCommands_,
  makeCommand_
} from "./key_mappings"
import C = kBgCmd

const abs = Math.abs
let _gCmdTimer = 0
let gOnConfirmCallback: ((force1: boolean, arg?: FakeArg) => void) | null | undefined
let _gCmdHasNext: boolean | null
let _cNeedConfirm: BOOL = 1
let _helpDialogModule: typeof import("./help_dialog") | undefined

/** operate command options */

export const replaceCmdOptions = <T extends keyof BgCmdOptions> (known: CmdOptionSafeToClone<T>): void => {
  set_cOptions(BgUtils_.safer_(known))
}

/** skip commands' private ".$xxx" options and ".$count", except those shared public fields */
export const copyCmdOptions = (dest: CommandsNS.RawOptions, src: CommandsNS.Options): CommandsNS.RawOptions => {
  for (const i in src) {
    if (i[0] !== "$" || "$then=$else=$retry=$f=".includes(i + "=") && !i.includes("=")) {
      dest[i] !== void 0 || (dest[i] = src[i])
    }
  }
  return dest
}

export const concatOptions = (base?: CommandsNS.Options | CommandsNS.EnvItemOptions | null
    , updates?: CommandsNS.Options | null): CommandsNS.Options | null => {
  return !updates || !base ? (base as CommandsNS.Options | null | undefined) || updates || null
      : copyCmdOptions(copyCmdOptions(BgUtils_.safeObj_(), updates), base as CommandsNS.Options)
}

/** keep all private and public fields in cOptions */
export const overrideCmdOptions = <T extends keyof BgCmdOptions> (known: CmdOptionSafeToClone<T>
    , disconnected?: boolean, oriOptions?: Readonly<KnownOptions<T>> & SafeObject): void => {
  const old = oriOptions || get_cOptions<T, true>()
  BgUtils_.extendIf_(BgUtils_.safer_(known as KnownOptions<T>), old)
  if (!disconnected) {
    (known as any as CommandsNS.Options).$o = old
  } else {
    delete (known as any as CommandsNS.Options).$o
  }
  oriOptions || set_cOptions(known as KnownOptions<T> as KnownOptions<T> & SafeObject)
}

type StrStartingWith$<K extends string> = K extends `$${string}` ? K : never
type BgCmdCanBeOverride = keyof SafeStatefulBgCmdOptions | keyof StatefulBgCmdOptions
type KeyCanBeOverride<T extends BgCmdCanBeOverride> =
    T extends keyof SafeStatefulBgCmdOptions ? SafeStatefulBgCmdOptions[T]
    : T extends keyof StatefulBgCmdOptions
    ? (StatefulBgCmdOptions[T] extends null ? never : StatefulBgCmdOptions[T] & keyof BgCmdOptions[T])
      | Exclude<StrStartingWith$<keyof BgCmdOptions[T] & string>, keyof Req.FallbackOptions>
    : never
export const overrideOption = <T extends BgCmdCanBeOverride, K extends KeyCanBeOverride<T> = KeyCanBeOverride<T>>(
    field: K, value: K extends keyof BgCmdOptions[T]
        ? K extends `$${string}` ? BgCmdOptions[T][K] : NonNullable<BgCmdOptions[T][K]> : never,
    curOptions?: KnownOptions<T>): void => {
  curOptions = curOptions || get_cOptions<T, true>() as KnownOptions<T>
  curOptions[field as keyof BgCmdOptions[T]] = value
  const parentOptions = (curOptions as unknown as CommandsNS.Options).$o
  if (parentOptions != null) { overrideOption<T, K>(field, value, parentOptions as unknown as KnownOptions<T>) }
}

export const fillOptionWithMask = <Cmd extends keyof BgCmdOptions>(template: string
    , rawMask: MaskOptions["mask"] | UnknownValue, valueKey: (keyof BgCmdOptions[Cmd]) & string | ""
    , stopWords: readonly (Exclude<keyof BgCmdOptions[Cmd], `$${string}` | `o.${string}`>)[]
    , count: number, options?: UnknownOptions<Cmd> & SafeObject
    ): { ok: 1 | -1, value: string, result: string, useCount: boolean, useDict: number
        } | { ok: 0, result: number } => {
  let ok: 1 | -1 = -1, toDelete: string | undefined, mask = rawMask, useDefaultMask = mask === true || mask === ""
  if (useDefaultMask) {
    let re = <RegExpG & RegExpSearchable<0>> /\$\$|[$%][sS]/g, arr: RegExpExecArray | null
    while ((arr = re.exec(template)) && arr[0] === "$$") { /* empty */ }
    mask = arr && arr[0] || "$s"
  }
  let value: string | null = null, maskCount: string, useCount = false
  const hasMask0 = !!mask && typeof mask === "string" && template.includes(mask)
  const usableOptions = options || get_cOptions<Cmd>()
  const getValue = (): string => {
    if (value !== null || keysLen !== 1) { return value || "" }
    let name = valueKey && usableOptions[valueKey] as string | UnknownValue
    if (!name) {
      const keys = Object.keys(usableOptions).filter(i => i[0] !== "$" && !stopWords.includes(i)
          && (usableOptions as Dict<unknown>)[i] === true)
      if (keys.length === 1) {
        name = toDelete = keys[0]
      } else {
        if (rawMask !== "") { keysLen = keys.length; return "" }
        name = ""
      }
    } else {
      toDelete = valueKey
    }
    ok = 1
    value = name + ""
    value = mask === "$s" || mask === "%s" ? BgUtils_.encodeAsciiComponent_(value) : value
    return value
  }
  let keysLen = 1, useDict = 0
  if (useDefaultMask) {
    if ((template.includes(maskCount = "$c") || template.includes(maskCount = "%c"))) {
      ok = 1; useCount = true
    }
    template = template.replace(<RegExpG & RegExpSearchable<1>> new RegExp("\\$\\{([^}]*)}|\\$\\$"
          + (useCount ? "|" + BgUtils_.escapeAllForRe_(maskCount) : "")
          + (hasMask0 ? "|" + BgUtils_.escapeAllForRe_(mask as string) : ""), "g")
        , (s: string, body?: string): string => {
      if (s === mask) { return getValue() }
      if (s === maskCount) { return count + "" }
      if (!body) { return "$" }
      ok = 1
      useDict++
      let encode = false
      const sed = tailSedKeysRe_.exec(body)
      sed && (body = body.slice(0, sed.index))
      if ((<RegExpOne> /^[sS]:/).test(body)) { encode = body[0] === "s"; body = body.slice(2) }
      const clip = tailClipNameRe_.exec(body) || headClipNameRe_.exec(body)
      if (clip) { body = clip[0][0] === "<" ? body.slice(0, clip.index) : body.slice(clip[0].length) }
      let val = clip ? readInnerClipboard_(clip[0][0] === "<" ? clip[0].slice(1) : clip[0].slice(0, -1))
          : body === "__proto__" || body[0] === "$" ? "" : body ? (usableOptions as Dict<any>)[body] : getValue()
      val = typeof val === "string" ? val : val && typeof val === "object" ? JSON.stringify(val) : val + ""
      sed && (val = substitute_(val, SedContext.NONE, BgUtils_.DecodeURLPart_(sed[0].slice(1))))
      return encode ? BgUtils_.encodeAsciiComponent_(val) : val
    })
  } else if (hasMask0) {
    getValue()
    if (value !== null) {
      template = template.replace(mask as string, (): string => value!)
    }
  }
  if (keysLen !== 1) { return { ok: 0, result: keysLen } }
  if (mask && typeof mask === "string") {
    const newOptions: UnknownOptions<Cmd> = options || {}
    options || overrideCmdOptions<C.blank>(newOptions);
    (newOptions as KnownOptions<C.runKey>).$masked = true
    if (toDelete) {
      delete (newOptions as KnownOptions<C.runKey>)[toDelete as keyof BgCmdOptions[C.runKey]]
    }
  }
  return { ok, value: value || "", result: template, useCount, useDict }
}

/** execute a command normally */

const executeCmdOnTabs = (tabs: Tab[] | [Tab] | undefined): void => {
  const callback = gOnConfirmCallback
  gOnConfirmCallback = null
  if (callback) {
    if (_gCmdHasNext) {
      const { promise_, resolve_ } = BgUtils_.deferPromise_<CmdResult>();
      (callback as unknown as BgCmdCurWndTabs<kBgCmd>)(tabs!, resolve_)
      void promise_.then(runNextCmdByResult)
    } else {
      (callback as unknown as BgCmdCurWndTabs<kBgCmd>)(tabs!, blank_)
    }
  }
  set_cEnv(null)
  return tabs ? void 0 : runtimeError_()
}

const onLargeCountConfirmed = (registryEntry: CommandsNS.Item): void => {
  executeCommand(registryEntry, 1, cKey, cPort, cRepeat)
}

export const executeCommand = (registryEntry: CommandsNS.Item, count: number, lastKey: kKeyCode, port: Port | null
    , overriddenCount: number, fallbackCounter?: FgReq[kFgReq.nextKey]["f"] | null): void => {
  setupSingletonCmdTimer(0)
  if (gOnConfirmCallback) {
    gOnConfirmCallback = null // just in case that some callbacks were thrown away
    set_cEnv(null)
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
  else if (repeat > 1 && (count > repeat || count < -repeat)) {
    if (fallbackCounter != null) {
      count = count < 0 ? -1 : 1
    } else if (!overriddenCount && (!options || options.confirmed !== true)) {
        set_cKey(lastKey)
        set_cOptions(null)
        set_cPort(port!)
        set_cRepeat(count)
        set_cEnv(null)
        void confirm_(registryEntry.command_ as never, abs(count))
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
      showHUD(`Has run sequential commands for ${maxRetried} times`)
      set_cEnv(null)
      return
    }
    const context = makeFallbackContext(fallbackCounter.c, 1, fallbackCounter.u)
    if (options && ((registryEntry.alias_ === kBgCmd.runKey || context.t) && registryEntry.background_
          || hasFallbackOptions(options as Req.FallbackOptions))) {
      const opt2: Req.FallbackOptions = {}
      overrideCmdOptions<kBgCmd.blank>(opt2 as {}, false, options)
      opt2.$retry = -maxRetried, opt2.$f = context
      context.t && registryEntry.background_ && !(options as Req.FallbackOptions).$else && (opt2.$else = "showTip")
      options = opt2 as typeof opt2 & SafeObject
    }
  }
  if (registryEntry.background_) { /* empty */ }
  else if (port != null) {
    const { alias_: fgAlias } = registryEntry,
    wantCSS = (kFgCmd.END <= 32 || fgAlias < 32) && <BOOL> (((
      (1 << kFgCmd.linkHints) | (1 << kFgCmd.marks) | (1 << kFgCmd.passNextKey) | (1 << kFgCmd.focusInput)
    ) >> fgAlias) & 1)
        || fgAlias === kFgCmd.scroll && (!!options && (options as CmdOptions[kFgCmd.scroll]).keepHover === false)
    set_cPort(port!)
    set_cEnv(null)
    portSendFgCmd(port, fgAlias, wantCSS, options as Dict<any>, count)
    return
  } else {
    let fgAlias = registryEntry.alias_, newAlias: keyof BgCmdOptions = 0
    if (fgAlias === kFgCmd.framesGoBack) {
      if (!OnEdge && Tabs_.goBack) { newAlias = kBgCmd.goBackFallback }
    } else if (fgAlias === kFgCmd.autoOpen) { newAlias = kBgCmd.autoOpenFallback }
    if (!newAlias) { return }
    registryEntry = makeCommand_(registryEntry.command_, options, [newAlias, 1, registryEntry.repeat_]
        ) as CommandsNS.NormalizedItem & { readonly alias_: keyof BgCmdOptions; readonly background_: 1 }
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
      void promise_.then(runNextCmdByResult)
    } else {
      (func as BgCmdNoTab<kBgCmd>)(blank_)
    }
    set_cEnv(null)
  } else {
    _gCmdHasNext = registryEntry.hasNext_
    gOnConfirmCallback = func as BgCmdCurWndTabs<kBgCmd> as any;
    (count < kCmdInfo.CurShownTabsIfRepeat || count === kCmdInfo.CurShownTabsIfRepeat && abs(cRepeat) < 2 ? getCurTab
        : getCurShownTabs_)(/*#__NOINLINE__*/ executeCmdOnTabs)
  }
}

/** show a confirmation dialog */

export const needConfirm_ = (): boolean | BOOL => {
  return _cNeedConfirm && (get_cOptions<C.blank>() as CommandsNS.Options).confirmed !== true
}

/** 0=cancel, 1=force1, count=accept */
export const confirm_ = <T extends kCName> (command: CmdNameIds[T] extends kBgCmd ? T : [string | [string]]
    , askedCount: number): Promise<boolean> => {
  if (!(Build.NDEBUG || typeof command !== "string" || !command.includes("."))) {
    console.log("Assert error: command should has no limit on repeats: %c%s", "color:red", command)
  }
  if (!cPort) {
    gOnConfirmCallback = null // clear old commands
    set_cRepeat(cRepeat > 0 ? 1 : -1)
    return Promise.resolve(cRepeat > 0)
  }
  const cmdName = typeof command === "string" ? command : typeof command[0] === "string" ? command[0] : null
  if (!_helpDialogModule && cmdName) {
    return initHelpDialog().then((): Promise<boolean> => {
      return confirm_(command as (CmdNameIds[T] extends kBgCmd ? T : never), askedCount)
    })
  }
  const { promise_, resolve_ } = BgUtils_.deferPromise_<boolean>()
  const countToReplay = cRepeat, bakOptions = get_cOptions() as any, bakPort = cPort
  setupSingletonCmdTimer(setTimeout(onConfirm, 2000, 0, void 0))
  gOnConfirmCallback = (force1: boolean): void => {
    set_cKey(kKeyCode.None)
    set_cOptions(bakOptions)
    set_cPort(bakPort)
    set_cRepeat(force1 ? countToReplay > 0 ? 1 : -1 : countToReplay)
    _cNeedConfirm = 0
    resolve_(force1)
    setTimeout((): void => { _cNeedConfirm = 1 }, 0)
  }
  void Promise.resolve(!cmdName ? (command[0] as [string])[0] : trans_("cmdConfirm", [askedCount
      , helpDialogData_![1]!.get(_helpDialogModule!.normalizeCmdName_(cmdName as kCName)) || `### ${cmdName} ###`]))
  .then((msg): void => {
    (getCurFrames_()?.top_ || cPort).postMessage({ N: kBgReq.count, c: "", i: _gCmdTimer, m: msg
        , r: typeof command !== "string" })
  })
  return promise_
}

const onConfirm = (response: Extract<FgReq[kFgReq.cmd], { i: object }>["r"], request?: BgReq[kBgReq.count]): void => {
  const callback = gOnConfirmCallback
  gOnConfirmCallback = null
  ; (response > 1 || request?.i) && callback && callback(response < 3)
}

const setupSingletonCmdTimer = (newTimer: number): void => {
  _gCmdTimer && clearTimeout(_gCmdTimer)
  _gCmdTimer = newTimer
}

export const onBeforeConfirm = (response: FgReq[kFgReq.beforeCmd]) => {
  if (response.i >= -1 && _gCmdTimer === response.i) { clearTimeout(response.i) }
}

export const onConfirmResponse = (response: FgReq[kFgReq.cmd], port: Port): void => {
  const id = typeof response.i !== "number" ? response.i.i : 0
  // if id < -1, then pass it, so that 3rd-party extensions may use kFgReq.cmd to run commands
  if (response.i === 0 || id >= -1 && _gCmdTimer !== id) { return } // an old / aborted / test message
  setupSingletonCmdTimer(0)
  if (response.r) {
    onConfirm(response.r, response.i)
    return
  }
  executeCommand(shortcutRegistry_!.get(response.i.c as StandardShortcutNames)!, response.n, kKeyCode.None, port, 0)
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
  const registry = shortcutRegistry_!.get(shortcutName)!
  const isRunKey = registry.alias_ === kBgCmd.runKey && registry.background_
  if (isRunKey) { inlineRunKey_(registry) }
  setupSingletonCmdTimer(0)
  if (ref && !(ref.cur_.s.flags_ & Frames.Flags.ResReleased)) {
    let port = ref.cur_
    setupSingletonCmdTimer(setTimeout(executeShortcut, 100, shortcutName, null))
    port.postMessage({ N: kBgReq.count, c: shortcutName, i: _gCmdTimer, m: "", r: false })
    ref.flags_ & Frames.Flags.ResReleased && refreshPorts_(ref, 0)
    ensuredExitAllGrab(ref)
    return
  }
  const opts = normalizedOptions_(registry)
  const cmdName: kCName = !isRunKey ? registry.command_ : "runKey"
  const fgAlias = registry.alias_
  let realAlias: keyof BgCmdOptions = 0, realRegistry = registry
  if (registry.background_) { /* empty */ }
  else if (fgAlias === kFgCmd.framesGoBack) {
    if (!OnEdge && Tabs_.goBack) { realAlias = kBgCmd.goBackFallback }
  } else if (fgAlias === kFgCmd.autoOpen) { realAlias = kBgCmd.autoOpenFallback }
  if (realAlias) {
    realRegistry = makeCommand_(cmdName, opts, [realAlias, 1, registry.repeat_])
  } else if (!registry.background_) {
    return
  } else {
    realAlias = registry.alias_
  }
  if (realAlias > kBgCmd.MAX_NEED_CPORT || realAlias < kBgCmd.MIN_NEED_CPORT) {
    executeCommand(realRegistry, 1, kKeyCode.None, null as never as Port, 0)
  } else if (!opts || !opts.$noWarn) {
    ((opts || ((registry as Writable<typeof registry>).options_ = BgUtils_.safeObj_<any>())
      ) as CommandsNS.SharedInnerOptions).$noWarn = true
      console.log("Error: Command", cmdName, "must run on pages which have run Vimium C")
  }
}

/** this functions needs to accept any types of arguments and normalize them */
export const executeExternalCmd = (
    message: Partial<ExternalMsgs[kFgReq.command]["req"]>, sender: chrome.runtime.MessageSender | null,
    port?: Port | null): void => {
  let command = message.command;
  command = command ? command + "" : "";
  const description = command ? availableCommands_[command as kCName] : null
  if (!description) { return; }
  let ref: Frames.Frames | undefined
  port = port || (sender!.tab ? indexFrame(sender!.tab.id, sender!.frameId || 0)
      || (ref = framesForTab_.get(sender!.tab.id), ref ? ref.cur_ : null) : null)
  if (!port && !description[1]) { /** {@link index.d.ts#CommandsNS.FgDescription} */
    return;
  }
  let options = (message.options || null) as CommandsNS.RawOptions | null
    , lastKey: kKeyCode | undefined = message.key
    , regItem = makeCommand_(command as Exclude<keyof typeof availableCommands_, "__proto__">, options)
    , count = message.count as number | string | undefined;
  if (!regItem) { return; }
  count = count !== "-" ? parseInt(count as string, 10) || 1 : -1;
  options && typeof options === "object" ?
      BgUtils_.safer_(options) : (options = null);
  lastKey = 0 | lastKey!;
  executeCommand(regItem, count, lastKey, port, 0)
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
    options_mutable: CmdOptionSafeToClone<T>): CmdOptions[T] => {
  const fallback = parseFallbackOptions(get_cOptions<S, true>() as Partial<BgCmdOptions[S]>)
  fallback && Object.assign(options_mutable as unknown as CmdOptions[T], fallback)
  return options_mutable as unknown as CmdOptions[T]
}

export const makeFallbackContext = (old: Req.FallbackOptions["$f"], counterStep: number, newTip: kTip | 0 | false
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
  : (result satisfies 0 | 1 | -1 | 50) < 0 ? void 0
  : runNextCmdBy(result ? 1 : 0, get_cOptions<C.blank, true>(), result > 1 ? result : null)
}

export const runNextCmdBy = (useThen: BOOL, options: Req.FallbackOptions, timeout?: number | null): boolean => {
  const nextKey = useThen ? options.$then : options.$else
  const hasFallback = !!nextKey && typeof nextKey === "string"
  if (hasFallback) {
    const fStatus: NonNullable<FgReq[kFgReq.nextKey]["f"]> = { c: options.$f, r: options.$retry, u: 0, w: 0 }
    const noDelay = nextKey && (<RegExpOne> /\$D/).test(nextKey.split("#", 1)[0])
    setupSingletonCmdTimer(setTimeout(async (): Promise<void> => {
      const frames = framesForTab_.get(curTabId_)
      await waitForPorts_(frames, true)
      const port = cPort && cPort.s.tabId_ === curTabId_ && frames && frames.ports_.indexOf(cPort) > 0 ? cPort
          : !frames ? null : frames.cur_.s.status_ === Frames.Status.disabled
          && frames.ports_.filter(i => i.s.status_ !== Frames.Status.disabled && !(i.s.flags_&Frames.Flags.ResReleased))
              .sort((a, b) => a.s.frameId_ - b.s.frameId_)[0] || frames.cur_
      frames && ensuredExitAllGrab(frames)
      runOneMapping_(nextKey, port, fStatus)
    }, noDelay ? 0 : timeout || 50))
  }
  return hasFallback
}

export const runNextOnTabLoaded = (options: OpenUrlOptions | Req.FallbackOptions | CommandsNS.Options
    , targetTab: Pick<Tab, "id"> | null | undefined | /* in cur without wait */ false, callback?: () => void): void => {
  const nextKey = (options as Req.FallbackOptions).$then
  if ((!nextKey || typeof nextKey !== "string") && !callback) {
    return
  }
  const onTimer = (tab1?: Tab): void => {
    const now = Date.now(), isTimedOut = now < start - 500 || now - start >= timeout || evenLoading
    // not clear the _gCmdTimer, in case a (new) tab closes itself and opens another tab
    if (!tab1 || !_gCmdTimer) { tabId = GlobalConsts.TabIdNone; return runtimeError_() }
    if (isTimedOut || tab1.status === "complete") {
      // not check injection status - let the command of `wait for="ready"` check it
      // so some commands not using cPort can run earlier
      if (!isTimedOut && !framesForTab_.has(tab1.id) // on Vivaldi in Win 10 VM, it reports "complete" too early
          && (callback || tab1.url.startsWith(location.protocol))) {
        return
      }
      setupSingletonCmdTimer(0)
      gOnConfirmCallback = null
      callback && callback()
      nextKey && runNextCmdBy(1, options as {}, callback ? 67 : 0)
    }
  }
  const timeout = targetTab !== false ? 1500 : 500
  const evenLoading = !!nextKey && (<RegExpOne> /[$%]l/).test(nextKey.split("#", 1)[0])
  let tabId = targetTab ? targetTab.id : targetTab !== false ? GlobalConsts.TabIdNone : curTabId_,
  start = Date.now()
  setupSingletonCmdTimer(setInterval((): void => {
    tabsGet(tabId !== GlobalConsts.TabIdNone ? tabId : curTabId_, onTimer)
  }, evenLoading ? 50 : 100)) // it's safe to clear an interval using `clearTimeout`
  if (nextKey && (<RegExpOne> /\$D/).test(nextKey.split("#", 1)[0])) {
    tabsGet(tabId !== GlobalConsts.TabIdNone ? tabId : curTabId_, onTimer)
  }
}

export const waitAndRunKeyReq = (request: FgReq[kFgReq.nextKey], port: Port | null): void => {
  const fallbackInfo = request.f
  const options: Req.FallbackOptions = { $then: request.k, $else: null, $retry: fallbackInfo && fallbackInfo.r,
        $f: fallbackInfo && makeFallbackContext(fallbackInfo.c, 0, fallbackInfo.u) }
  set_cPort(port!)
  if (fallbackInfo && fallbackInfo.u === false) {
    runNextOnTabLoaded(options, null)
  } else {
    runNextCmdBy(1, options, fallbackInfo && fallbackInfo.w)
  }
}

export const initHelpDialog = (): Promise<typeof import("./help_dialog") | void> => {
  const curHData = helpDialogData_ || []
  return _helpDialogModule ? Promise.resolve(_helpDialogModule) : Promise.all([
    import2<typeof import("./help_dialog")>(CONST_.HelpDialogJS),
    curHData[0] != null ? null : BgUtils_.fetchFile_("help_dialog.html"),
    curHData[1] != null ? null : getI18nJson("help_dialog")
  ]).then(([helpDialog, temp1, temp2]): typeof import("./help_dialog") => {
    const newHData = helpDialogData_ || set_helpDialogData_([null, null])
    temp1 && (newHData[0] = temp1)
    temp2 && (newHData[1] = temp2)
    return _helpDialogModule = helpDialog
  }, Build.NDEBUG ? OnChrome && Build.MinCVer < BrowserVer.Min$Promise$$Then$Accepts$null
      ? undefined : null as never : (args): void => {
    console.error("Promises for initHelp failed: %o ; %o", args[0], args[1])
  })
}
