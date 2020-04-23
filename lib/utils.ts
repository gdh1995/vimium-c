import { Stop_ } from "./keyboard_utils"

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
export function set_VOther (realBrowser: BrowserType): void { VOther = realBrowser }

/** its initial value should be 0, need by {@link #hook} */
export let browserVer: BrowserVer = 0 // should be used only if BTypes includes Chrome
export function set_browserVer (realVer: BrowserVer): void { browserVer = realVer }

export const isTop = top === window
export const injector = VimiumInjector
export const doc = document
export const loc_ = location
export const initialDocState = doc.readyState
export const jsRe_ = <RegExpI & RegExpOne> /^javascript:/i

export let VTr: VTransType
export function set_VTr (newTr: VTransType): void { VTr = newTr }

let esc: EscF | null

/** ==== Status ==== */

export { esc as isAlive_ }

export let isEnabled_ = false
export function set_isEnabled_ (newEnabledVal: boolean): void { isEnabled_ = newEnabledVal }

export let isLocked_ = false
export function set_isLocked_ (newLocked: boolean): void { isLocked_ = newLocked }

export let readyState_: Document["readyState"] = initialDocState
export function set_readyState_ (state: Document["readyState"]): void { readyState_ = state }

// note: scripts always means allowing timers - vPort.ClearPort requires this assumption
export let allowScripts_: 0 | 1 | 2 = 1
export function set_allowScripts_ (stat: 0 | 1 | 2): void { allowScripts_ = stat }

export let allowRAF_: BOOL = 1
export function set_allowRAF_ (stat: BOOL): void { allowRAF_ = stat }

/** ==== Cache ==== */

export let fgCache: OnlyEnsureItemsNonNull<SettingsNS.FrontendSettingCache> = null as never
export function set_fgCache (newCache: SettingsNS.FrontendSettingCache): void { fgCache = newCache as typeof fgCache }

export let clickable_: ElementSet = null as never
export function set_clickable_ (newClickable: ElementSet): void { clickable_ = newClickable }

export let keydownEvents_: KeydownCacheArray;
export const set_keydownEvents_ = (arr: KeydownCacheArray): void => { keydownEvents_ = arr }
export const setupKeydownEvents = function (arr?: KeydownCacheArray): KeydownCacheArray | boolean {
  if (!arr) { return keydownEvents_; }
  return !isEnabled_ || !(keydownEvents_ = arr);
} as {
  (this: void, srcCacheArray: KeydownCacheArray): boolean
  (this: void): KeydownCacheArray
}

/** ==== util functions ==== */

export { esc }
export function set_esc (newEsc: EscF): void { esc = newEsc }

export const callFunc = (callback: (this: void) => any): void => { callback(); }

export let onWndFocus = function (this: void): void { /* empty */ }
export function set_onWndFocus (f: (this: void) => void): void { onWndFocus = f; }

export const safeObj = Object.create as { (o: null): any; <T>(o: null): SafeDict<T> }

export const safer: <T extends object> (opt: T) => T & SafeObject
    = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
        && !Object.setPrototypeOf
      ? <T extends object> (obj: T): T & SafeObject => { (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null);

type TimerFunc = (func: (this: void, fake?: TimerType.fake) => void, time: number) => TimerID.Valid | TimerID.Others
export let timeout_: TimerFunc = Build.NDEBUG ? setTimeout : (func, timeout) => setTimeout(func, timeout)
export let interval_: TimerFunc = Build.NDEBUG ? setInterval : (func, period) => setInterval(func, period)
export let clearTimeout_: (timer: TimerID) => void = Build.NDEBUG ? clearTimeout : (timer) => clearTimeout(timer)

export function replaceBrokenTimerFunc (func: TimerFunc): void { timeout_ = interval_ = func }

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
  for (const i of ("auxclick beforecopy beforecut compositionend compositionstart contextmenu copy cut "
        + "keypress mouseup paste wheel " + extraEvents).split(" ")) {
    setupEventListener(target, i);
  }
}
