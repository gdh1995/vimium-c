export interface EscF {
  <T extends Exclude<HandlerResult, HandlerResult.ExitPassMode>> (this: void, i: T): T;
  (this: void, i: HandlerResult.ExitPassMode): unknown;
}

export let VOther: BrowserType = !(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
    || !(Build.BTypes & ~BrowserType.Edge)
    ? Build.BTypes as number
    : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
    : Build.BTypes & BrowserType.Firefox && browser ? BrowserType.Firefox
    : BrowserType.Chrome
export function set_VOther (_newRealBrowser: BrowserType): void { VOther = _newRealBrowser }

/** its initial value should be 0, need by {@link #hook} */
export let chromeVer_: BrowserVer = 0 // should be used only if BTypes includes Chrome
export function set_chromeVer_ (_newRealChromeVer: BrowserVer): void { chromeVer_ = _newRealChromeVer }

export const isTop = top === window
export const injector = VimiumInjector
export const doc = document
export const loc_ = location
export const initialDocState = doc.readyState
export const jsRe_ = <RegExpI & RegExpOne> /^javascript:/i

let esc: EscF | null

/** ==== Status ==== */

export { esc as isAlive_ }

export let isEnabled_ = false
export function set_isEnabled_ (_newIsEnabled: boolean): void { isEnabled_ = _newIsEnabled }

export let isLocked_ = false
export function set_isLocked_ (_newIsLocked: boolean): void { isLocked_ = _newIsLocked }

export let readyState_: Document["readyState"] = initialDocState
export function set_readyState_ (_newReadyState: Document["readyState"]): void { readyState_ = _newReadyState }

// note: scripts always means allowing timers - vPort.ClearPort requires this assumption
export let allowScripts_: 0 | 1 | 2 = 1
export function set_allowScripts_ (_newAllowScripts: 0 | 1 | 2): void { allowScripts_ = _newAllowScripts }

export let allowRAF_: BOOL = 1
export function set_allowRAF_ (_newAllowRAF: BOOL): void { allowRAF_ = _newAllowRAF }

/** ==== Cache ==== */

export let fgCache: OnlyEnsureItemsNonNull<SettingsNS.FrontendSettingCache>
export function set_fgCache (_newCache: SettingsNS.FrontendSettingCache): void { fgCache = _newCache as typeof fgCache }

export let clickable_: ElementSet
export function set_clickable_ (_newClickable: ElementSet): void { clickable_ = _newClickable }

export let keydownEvents_: KeydownCacheArray;
export const set_keydownEvents_ = (_newKeydownEvents: KeydownCacheArray): void => { keydownEvents_ = _newKeydownEvents }
export const setupKeydownEvents = function (arr?: KeydownCacheArray): KeydownCacheArray | boolean {
  if (!arr) { return keydownEvents_; }
  return !isEnabled_ || !(keydownEvents_ = arr);
} as {
  (this: void, srcCacheArray: KeydownCacheArray): boolean
  (this: void): KeydownCacheArray
}

/** ==== util functions ==== */

export { esc }
export function set_esc (_newEsc: EscF): void { esc = _newEsc }

export let vApi: VApiTy
export function set_vApi (_newVApi: VApiTy): void { vApi = _newVApi }

let i18n_getMsg: typeof chrome.i18n.getMessage
export let VTr: VTransType = (tid, args) => i18n_getMsg("" + tid, args)
export function set_VTr (_newVTr: VTransType): void { VTr = _newVTr }
export function set_i18n_getMsg (_newGetMsg: typeof i18n_getMsg): void { i18n_getMsg = _newGetMsg }

export const callFunc = (callback: (this: void) => any): void => { callback(); }

export const getTime = Date.now

export let onWndFocus = function (this: void): void { /* empty */ }
export function set_onWndFocus (_newOnWndFocus: (this: void) => void): void { onWndFocus = _newOnWndFocus; }

export const safeObj = Object.create as { (o: null): any; <T>(o: null): SafeDict<T> }

export const safer: <T extends object> (opt: T) => T & SafeObject
    = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
        && !Object.setPrototypeOf
      ? <T extends object> (obj: T): T & SafeObject => { (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null);

export let weakRef_ = (Build.BTypes & BrowserType.Chrome ? <T extends object>(val: T | null | undefined
      ): WeakRef<T> | null | undefined => val && new (WeakRef as WeakRefConstructor)(val)
    : (_newObj: object) => _newObj) as {
  <T extends object>(val: T): WeakRef<T>
  <T extends object>(val: T | null): WeakRef<T> | null
  <T extends object>(val: T | null | undefined): WeakRef<T> | null | undefined
}
export const deref_ = !(Build.BTypes & BrowserType.Chrome) ? weakRef_ as any as never
    : WeakRef ? <T extends object>(val: WeakRef<T> | null | undefined
      ): T | null | undefined => val && val.deref()
    : (weakRef_ = ((val: object) => val) as any) as never

type TimerFunc = (func: (this: void, fake?: TimerType.fake) => void, time: number) => TimerID.Valid | TimerID.Others
export let timeout_: TimerFunc = Build.NDEBUG ? setTimeout : (func, timeout) => setTimeout(func, timeout)
export let interval_: TimerFunc = Build.NDEBUG ? setInterval : (func, period) => setInterval(func, period)
export const clearTimeout_: (timer: TimerID) => void = Build.NDEBUG ? clearTimeout : (timer) => clearTimeout(timer)
export const clearInterval_: (timer: TimerID) => void = Build.NDEBUG ? clearInterval : (timer) => clearInterval(timer)

export function replaceBrokenTimerFunc (_newTimerFunc: TimerFunc): void { timeout_ = interval_ = _newTimerFunc }

/**
 * @param target Default to `window`
 * @param eventType string
 * @param func Default to `Stop_`
 * @param disable Default to `0`
 * @param activeMode Default to `{passive: true, capture: true}`; `1` means `passive: false`
 */
export const setupEventListener =
  <T extends EventTarget, Active extends 1 | undefined = undefined, E extends string = string> (
    target: T | 0, eventType: E
    , func?: ((this: T, e: E extends keyof HTMLElementEventMap
      ? Active extends 1 ? HTMLElementEventMap[E] & ToPrevent : HTMLElementEventMap[E]
      : Active extends 1 ? EventToPrevent : Event) => void) | null | EventListenerObject
    , disable?: boolean | BOOL, activeMode?: Active): void => {
  (disable ? removeEventListener : addEventListener).call(target || window, eventType,
    <(this: T, e: EventToPrevent) => void> func || Stop_,
    {passive: !activeMode, capture: true} as EventListenerOptions | boolean as boolean);
}

export const suppressCommonEvents = (target: Window | SafeHTMLElement, extraEvents: string): void => {
    // note: if wheel is listened, then mousewheel won't be dispatched even on Chrome 35
  for (const i of (VTr(kTip.kCommonEvents) + extraEvents).split(" ")) {
    setupEventListener(target, i);
  }
}

export const Stop_ = (event: Pick<Event, "stopImmediatePropagation">): void => { event.stopImmediatePropagation(); }

export const isImageUrl = (str: string | null): boolean => {
  if (!str || str[0] === "#" || str.length < 5 || jsRe_.test(str)) {
    return false;
  }
  const end = str.lastIndexOf("#") + 1 || str.length;
  // eslint-disable-next-line @typescript-eslint/ban-types
  str = str.substring!(str.lastIndexOf("/", str.lastIndexOf("?") + 1 || end), end);
  return (<RegExpI & RegExpOne> /\.(?:bmp|gif|icon?|jpe?g|a?png|svg|tiff?|webp)\b/i).test(str);
}

export const recordLog = (tip: kTip | string): void => {
  console.log(tip > 0 ? VTr(<kTip> tip) : tip, loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"), getTime())
}
