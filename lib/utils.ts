import { Stop_ } from "./keyboard_utils.js"

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
export function setOnOther (realBrowser: BrowserType): void { VOther = realBrowser }

/** its initial value should be 0, need by {@link #hook} */
export let browserVer: BrowserVer = 0 // should be used only if BTypes includes Chrome
export function setChromeVer (realVer: BrowserVer): void { browserVer = realVer }

export const isTop = top === window

export const injector = VimiumInjector
export const doc = document
export const initialDocState = doc.readyState

export let VTr: VTransType
export function setTr (newTr: VTransType): void { VTr = newTr }

let esc: EscF | null

/** ==== Status ==== */

export { esc as isAlive_ }

export let isEnabled_ = false
export function setVEnabled (newEnabled: boolean): void { isEnabled_ = newEnabled }

export let isLocked_ = false
export function setStatusLocked (newLocked: boolean): void { isLocked_ = newLocked }

/** ==== Cache ==== */

export let fgCache: OnlyEnsureItemsNonNull<SettingsNS.FrontendSettingCache> = null as never
export function setFgCache (newCache: SettingsNS.FrontendSettingCache): void { fgCache = newCache as typeof fgCache }

export let clickable_: ElementSet = null as never
export function setClickable (newClickable: ElementSet): void { clickable_ = newClickable }
export function setClickableForInjector (newClickable: ElementSet): void { clickable_ = newClickable }

export let keydownEvents_: KeydownCacheArray;
export const rawSetKeydownEvents = (arr: KeydownCacheArray): void => { keydownEvents_ = arr }
export const setupKeydownEvents = function (arr?: KeydownCacheArray): KeydownCacheArray | boolean {
  if (!arr) { return keydownEvents_; }
  return !isEnabled_ || !(keydownEvents_ = arr);
} as {
  (this: void, srcCacheArray: KeydownCacheArray): boolean
  (this: void): KeydownCacheArray
}

/** ==== util functions ==== */

export { esc }
export function setEsc (newEsc: EscF): void { esc = newEsc }

export let onWndFocus = function (this: void): void { /* empty */ }
export function setOnWndFocus (f: (this: void) => void): void { onWndFocus = f; }

export const safeObj = Object.create as { (o: null): any; <T>(o: null): SafeDict<T> }

export const safer: <T extends object> (opt: T) => T & SafeObject
    = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
        && !Object.setPrototypeOf
      ? <T extends object> (obj: T): T & SafeObject => { (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null);

export const timeout_: (func: (this: void, fake?: TimerType.fake) => void, timeout: number
    ) => TimerID.Valid | TimerID.Others = setTimeout

export const clearTimeout_: (timer: TimerID) => void = clearTimeout

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
