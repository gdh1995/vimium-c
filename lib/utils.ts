export type XrayedObject<T extends object> = T & { wrappedJSObject: T }
export declare const enum kNextTarget { parent = 0, child = 1, realClick = 2, nonCss = 3, _mask = "" }

const OnOther_: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
    ? Build.BTypes as number
    : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
    : Build.BTypes & BrowserType.Safari && typeof safari !== "undefined" && safari ? BrowserType.Safari
    : !(Build.BTypes & BrowserType.Chrome) || Build.BTypes & BrowserType.Firefox && typeof browser !== "undefined"
      && browser && (browser as typeof chrome).runtime
      && (!(Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith) || "".startsWith)
      && (browser as typeof chrome).runtime.getURL("").startsWith("moz")
    ? BrowserType.Firefox : BrowserType.Chrome
export const OnChrome: boolean = Build.BTypes === BrowserType.Chrome as number
    || !!(Build.BTypes & BrowserType.Chrome) && OnOther_ === BrowserType.Chrome
export const OnFirefox: boolean = Build.BTypes === BrowserType.Firefox as number
    || !!(Build.BTypes & BrowserType.Firefox) && OnOther_ === BrowserType.Firefox
export const OnEdge: boolean = Build.BTypes === BrowserType.Edge as number
    || !!(Build.BTypes & BrowserType.Edge) && OnOther_ === BrowserType.Edge
export const OnSafari: boolean = Build.BTypes === BrowserType.Safari as number
    || !!(Build.BTypes & BrowserType.Safari) && OnOther_ === BrowserType.Safari
export const WithDialog: boolean = !OnEdge

/** its initial value should be 0, need by {@see ../content/request_handlers#hookOnWnd} */
export let chromeVer_: BrowserVer = 0
/** its placeholder value should be 0, need by {@see ../content/mode_find.ts#onLoad2} */
export let firefoxVer_: FirefoxBrowserVer = 0
export function set_chromeVer_ (_newRealChromeVer: BrowserVer): void { chromeVer_ = _newRealChromeVer }
export function set_firefoxVer_ (_newRealVer: FirefoxBrowserVer): void { firefoxVer_ = _newRealVer }
export let os_: kOS
if (!(Build.OS & (Build.OS - 1))) {
  os_ = Build.OS < 8 ? (Build.OS / 2) | 0 : Build.OS as number === 8 ? 3 : Math.log2(Build.OS)
}
export function set_os_ (_newOS: kOS): void { os_ = _newOS }

export const isTop = top === window
export const injector = VimiumInjector
export const isAsContent = injector === void 0
export const doc = document
export const loc_ = location
// contentDocument.open may replace a location of `about:blank` with the parent frame's
export const isIFrameInAbout_ = !isTop && loc_.protocol === "about:"
export const runtime_ff = OnFirefox ? (browser as typeof chrome).runtime : null

let esc: {
  <T extends Exclude<HandlerResult, HandlerResult.ExitNormalMode>> (this: void, i: T): T;
  (this: void, i: HandlerResult.ExitNormalMode): unknown;
} | null

/** ==== Status ==== */

export { esc as isAlive_ }

export let isEnabled_ = false
export function set_isEnabled_ (_newIsEnabled: boolean): void { isEnabled_ = _newIsEnabled }

export let isLocked_: Frames.Flags.blank | Frames.Flags.locked | Frames.Flags.lockedAndDisabled = 0
export function set_isLocked_ (_newIsLocked: typeof isLocked_): void { isLocked_ = _newIsLocked }

export let readyState_: Document["readyState"] | /** from vimium://status */ "c" = doc.readyState
export function set_readyState_ (_newReadyState: typeof readyState_): void { readyState_ = _newReadyState }

export let noRAF_old_cr_: BOOL | undefined
export function set_noRAF_old_cr_ (_newNoRAF: BOOL): void { noRAF_old_cr_ = _newNoRAF }

/** ==== Cache ==== */

export let fgCache: OnlyEnsureItemsNonNull<SettingsNS.FrontendSettingCache>
export function set_fgCache (_newCache: SettingsNS.FrontendSettingCache): void { fgCache = _newCache as typeof fgCache }

export let confVersion = 0
export function set_confVersion (_newConfVer: number): void { confVersion = _newConfVer }

export let inherited_: 0 | PortType.confInherited = 0
export function set_inherited_ (_newInherited: typeof inherited_): void { inherited_ = _newInherited }

export let clickable_: ElementSet
export function set_clickable_ (_newClickable: ElementSet): void { clickable_ = _newClickable }

export let evenHidden_: kHidden = kHidden.None
export function set_evenHidden_ (_newEvenHidden_: kHidden): void { evenHidden_ = _newEvenHidden_ }

export let keydownEvents_: KeydownCacheArray;
export function set_keydownEvents_ (_newKeydownEvents: KeydownCacheArray): void { keydownEvents_ = _newKeydownEvents }
export const setupKeydownEvents = function (arr?: KeydownCacheArray): KeydownCacheArray | boolean {
  if (!arr) { return keydownEvents_; }
  return !isEnabled_ || !(keydownEvents_ = arr);
} as {
  (this: void, srcCacheArray: KeydownCacheArray): boolean
  (this: void): KeydownCacheArray
}

/** ==== util functions ==== */

export { esc }
export function set_esc (_newEsc: typeof esc): void { esc = _newEsc }

export let vApi: VApiTy
export function set_vApi (_newVApi: VApiTy): void { vApi = _newVApi }

let i18n_getMsg: typeof chrome.i18n.getMessage
export let VTr: VTransType = (tid, args) => i18n_getMsg("" + tid, args)
export function set_VTr (_newVTr: VTransType): void { VTr = _newVTr }
export function set_i18n_getMsg (_newGetMsg: typeof i18n_getMsg): void { i18n_getMsg = _newGetMsg }

export const callFunc = (callback: (this: void) => any): void => { callback(); }

export const locHref = (): string => loc_.href

export const timeStamp_ = (event: Event): number => event.timeStamp

export const getTime = Date.now

export let onWndFocus = function (this: void): void { /* empty */ }
export function set_onWndFocus (_newOnWndFocus: (this: void) => void): void { onWndFocus = _newOnWndFocus; }

export const safeObj = Object.create as { (o: null): any; <T>(o: null): SafeDict<T> }

export const safer: <T extends object> (opt: T) => T & SafeObject
    = OnChrome && Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && !Object.setPrototypeOf
      ? <T extends object> (obj: T) => ("__proto__" in obj && ((obj as any).__proto__ = null), obj as T & SafeObject)
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null);

export let weakRef_not_ff = (!OnEdge ? <T extends object>(val: T | null | undefined
      ): WeakRef<T> | null | undefined => val && new (WeakRef as WeakRefConstructor)(val)
    : (_newObj: object | null | undefined) => _newObj) as {
  <T extends object>(val: T): WeakRef<T>
  <T extends object>(val: T | null): WeakRef<T> | null
  <T extends object>(val: T | null | undefined): WeakRef<T> | null | undefined
} | null

export let weakRef_ff = (!OnFirefox ? null as never : weakRef_not_ff) as {
  <T extends object>(val: T, id: kElRef): WeakRef<T>
  <T extends object>(val: T | null, id: kElRef): WeakRef<T> | null
  <T extends object>(val: T | null | undefined, id: kElRef): WeakRef<T> | null | undefined
}
export function set_weakRef_ff (new_weakRef: typeof weakRef_ff) { weakRef_ff = new_weakRef }

export const deref_ = OnEdge ? weakRef_not_ff as never
    : OnChrome && Build.MinCVer >= BrowserVer.MinEnsured$WeakRef || OnSafari || WeakRef
    ? <T extends object>(val: WeakRef<T> | null | undefined): T | null | undefined => val && val.deref()
    : (OnFirefox ? weakRef_ff = <T> (val: T): T => val : weakRef_not_ff = <T> (val: T): T => val) as never

export const raw_unwrap_ff = OnFirefox ? <T extends object> (val: T): T | undefined => {
  return (val as XrayedObject<T>).wrappedJSObject
} : 0 as never

export const unwrap_ff = (OnFirefox ? <T extends object> (obj: T): T => (obj as XrayedObject<T>).wrappedJSObject || obj
    : 0 as never) as {
  <T extends Element>(obj: T): never
  <T extends object>(obj: T): T extends XrayedObject<infer S> ? S : T
}

type TimerFunc<R> = (func: (this: void, fake?: TimerType.fake) => void, time: number) => R
export let timeout_: TimerFunc<ValidTimeoutID> =
    (Build.Inline ? setTimeout : (func, timeout) => setTimeout(func, timeout)) as TimerFunc<ValidTimeoutID>
export let interval_: TimerFunc<ValidIntervalID> =
    (Build.Inline ? setInterval : (func, period) => setInterval(func, period)) as TimerFunc<ValidIntervalID>
export let clearTimeout_ = (timer: ValidTimeoutID | ValidIntervalID): void => { timer && clearTimeout(timer as number) }

export const setupTimerFunc_cr = !OnChrome ? 0 as never : (_newTimerFunc: TimerFunc<number>
    , _newClearTimer: (timer: ValidTimeoutID | ValidIntervalID) => void): void => {
  timeout_ = interval_ = _newTimerFunc as TimerFunc<TimerID & number>
  clearTimeout_ = _newClearTimer
}

export const setupTimerFunc_cr_mv3 = !OnChrome || !Build.MV3 ? 0 as never: (
    newTout: typeof timeout_, newInt: typeof interval_, newCT: typeof clearTimeout_) => {
  timeout_ = newTout, interval_ = newInt, clearTimeout_ = newCT
}

/**
 * @param target Default to `window`
 * @param eventType string
 * @param func Default to `Stop_`
 * @param disable Default to `0`
 * @param activeMode Default to `{passive: true, capture: true}`; `1` means `passive: false`;
 *        on Firefox, `3` means "on bubbling and not passive"
 */
export const setupEventListener = <
      T extends EventTarget, Active extends 3 | 1 | 0 | undefined = undefined, E extends string = string> (
    target: T | 0, eventType: E
    , func?: ((this: T, e: E extends keyof HTMLElementEventMap
      ? Active extends 1 ? HTMLElementEventMap[E] & ToPrevent : HTMLElementEventMap[E]
      : Active extends 1 ? EventToPrevent : Event) => void) | null | EventListenerObject
    , disable?: boolean | BOOL, activeMode?: Active): void => {
  (disable ? removeEventListener : addEventListener).call(target as unknown as Window || window, eventType,
    <(this: T, e: EventToPrevent) => void> func || Stop_,
    OnFirefox && activeMode === 3 ? !1
    : {passive: !activeMode, capture: true} as EventListenerOptions | boolean as boolean)
}

export const suppressCommonEvents = (target: Window | SafeHTMLElement, extraEvents: string): void => {
    // note: if wheel is listened, then mousewheel won't be dispatched even on Chrome 35
  for (const i of (VTr(kTip.kCommonEvents) + extraEvents).split(" ")) {
    setupEventListener(target, i);
  }
}

export const Stop_ = (event: Pick<Event, "stopImmediatePropagation">): void => { event.stopImmediatePropagation(); }

export const isJSUrl = (str: string): boolean => (<RegExpI & RegExpOne> /^javascript:/i).test(str)

let imgExtRe_: RegExpI | undefined
export const isImageUrl = (str: string | null): boolean => {
  if (!str || str[0] === "#" || str.length < 5 || isJSUrl(str)) {
    return false;
  }
  const end = str.lastIndexOf("#") + 1 || str.length;
  // eslint-disable-next-line @typescript-eslint/ban-types
  str = str.substring!(str.lastIndexOf("/", str.lastIndexOf("?") + 1 || end), end);
  return (imgExtRe_ || (imgExtRe_ = createRegExp(kTip.imgExt, "i"))).test(str)
}

export const recordLog = (tip: kTip | string): (() => void) =>
    console.log.bind(console, tip > 0 ? VTr(<kTip> tip) : tip
        , loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"), getTime())

export const splitEntries_ = <T, LongArr extends boolean = false> (
    map: (LongArr extends true ? (T extends [string, infer A] ? Dict<A> : never) | T[] : [string, T]) | string | boolean
    , sep?: "," | ";" | "##" | "//"): LongArr extends true ? T[] : [string, T] => {
  let arr: unknown[]
  if (isTY(map as object, kTY.obj) && (map as ArrayLike<unknown>).length == null) {
    if (OnChrome && Build.BTypes < BrowserVer.MinEnsuredES$Object$$values$and$$entries
        && chromeVer_ < BrowserVer.MinEnsuredES$Object$$values$and$$entries) {
      arr = []
      for (let key in map as Dict<unknown>) { arr.push([key, (map as EnsuredDict<unknown>)[key]]) }
    } else {
      arr = Object.entries!(map as object) as [string, unknown][]
    }
  } else {
    arr = (map + "").split(sep!)
  }
  return arr as any
}

type MayBeSelector = "" | true | false | 0 | null | void | undefined
export let findOptByHost: {
  (rules: kTip, cssCheckEl?: undefined): "css-selector" | void
  (rules: string | kTip | object | MayBeSelector | void, cssCheckEl: SafeElement
      , mapMode: kNextTarget.child | kNextTarget.realClick | kNextTarget.nonCss): string | boolean | void
  (rules: string | object | MayBeSelector | void, cssCheckEl: 0): string | void
  (rules: string | object | MayBeSelector | void, cssCheckEl?: SafeElement): "css-selector" | void
}
export function set_findOptByHost (newFindOptByHost: typeof findOptByHost): void { findOptByHost = newFindOptByHost }

export const parseSedOptions = (opts: UserSedOptions): ParsedSedOpts => {
  const sed = opts.sed
  return isTY(sed, kTY.obj) && sed ? !(sed as string[]).length ? sed as Exclude<typeof sed, string[]>
        : { r: "", k: findOptByHost(sed as string[], 0) satisfies string | void as string | undefined }
      : { r: sed, k: opts.sedKeys || opts.sedKey }
}

type EnsureExisting<T> = { [P in keyof T]-?: T[P] }
type AllowUndefined<T> = { [P in keyof T]: T[P] | undefined }
export const parseOpenPageUrlOptions = ((opts, decoded?: boolean | null
    ): AllowUndefined<EnsureExisting<ParsedOpenPageUrlOptions>> => ({
  d: (decoded = opts.decoded, decoded != null ? decoded : opts.decode),
  g: opts.group, i: opts.incognito, k: opts.keyword, m: opts.replace, o: opts.opener, p: opts.position,
  r: opts.reuse, s: parseSedOptions(opts), t: opts.testUrl, w: opts.window
})) as (opts: OpenPageUrlOptions & UserSedOptions) => ParsedOpenPageUrlOptions

export const escapeAllForRe = (str: string): string => str.replace(<RegExpG> /[$()*+.?\[\\\]\^{|}]/g, "\\$&")

export const createRegExp = <S extends kTip, T extends "g" | "i" | ""> (pattern: S, flags: T
    ): T extends "" ? RegExpOne : T extends "i" ? RegExpI : RegExpG =>
    <any> new RegExp(Build.NDEBUG ? VTr(pattern) : VTr(pattern) || "^(?!)", flags as "g")

export const tryCreateRegExp = function (pattern: string, flags: string ): RegExp | void {
  return safeCall(RegExp as any, pattern, flags) // eslint-disable-line @typescript-eslint/no-unsafe-argument
} as {
  <T extends "g" | "gi" | "gim" | "gm" | "i" | "u" | ""> (pattern: string, flags: T
    ): (T extends "" ? RegExpOne : T extends "i" ? RegExpI : RegExpG) | void
  (pattern: string): RegExpOne | void
}

export const safeCall = (<T1, T2, Ret>(func: (arg1: T1, arg2: T2) => Ret, arg1: T1, arg2: T2): Ret | void => {
  try { return func(arg1, arg2) } catch {}
}) as {
  <Ret>(func: (arg1?: undefined, arg2?: undefined) => Ret): Ret | void
  <T1, Ret>(func: (arg1: T1, args2?: undefined) => Ret, arg1: T1): Ret | void
  <T1, T2, Ret>(func: (arg1: T1, arg2: T2) => Ret, arg1: T1, arg2: T2): Ret | void
}

export const reflectApply_not_cr = OnChrome ? 0 as never as null : Reflect!.apply

export const promiseDefer_ = <T> (): { p: Promise<T>, r: (value: T) => void } => {
  let r: ((value: T) => void) | undefined, p = new Promise<T>((resolve): void => { r = resolve })
  return { p, r: r! }
}

// if `var queueMicrotask`, on Firefox globalThis.queueMicrotask is undefined even when window.queueMicrotask exists
export const queueTask_: typeof queueMicrotask | undefined = Build.NDEBUG && (!(Build.BTypes & BrowserType.Edge
      || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.Min$queueMicrotask
      || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$queueMicrotask) || !OnFirefox)
    ? queueMicrotask
    : (window as {} as typeof globalThis).queueMicrotask
      && (window as {} as typeof globalThis).queueMicrotask.bind(window)

/** ==== shortcuts of constant code ==== */

type PlainObject = { arguments?: undefined } & Dict<any>
type kTyOf<V> = V extends PlainObject ? kTY.obj : V extends Function ? kTY.func : V extends number ? kTY.num : never
interface TyMap { [kTY.obj]: null | object; [kTY.func]: Function; [kTY.num]: number  }

const TYPES = ["string", "object", "function", "number"]
export { TYPES as OBJECT_TYPES }
export const isTY = ((obj: any, ty?: kTY): boolean => typeof obj == TYPES[ty || kTY.str]) as {
  <V extends void | undefined | null | boolean | number | string | Function | PlainObject, T extends kTyOf<V>> (
    obj: V, ty: T): obj is Extract<V, TyMap[T]>
  (obj: void | undefined | null | boolean | number| PlainObject): unknown
  (obj: void | undefined | null | boolean | number| string | PlainObject): obj is string
}

export const Lower = (str: string): string => str.toLowerCase()

export const math = Math
export const max_: (...args: number[]) => number = Build.Inline ? math.max : (...args): number => math.max(...args)
export const min_: (...args: number[]) => number = Build.Inline ? math.min : (...args): number => math.min(...args)
export const abs_: (num: number) => number = Build.Inline ? math.abs : (arg): number => math.abs(arg)

export function includes_<T> (this: T[] | readonly T[], el: T): boolean { return this.indexOf(el) >= 0 }

export const urlSameIgnoringHash = (s1: string, s2: string): boolean | "" => s2 && s1.split("#")[0] === s2.split("#")[0]
