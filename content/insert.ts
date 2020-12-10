const enum kNodeInfo {
  NONE = 0,
  ShadowBlur = 1, ShadowFull = 2,
}
interface ShadowNodeMap {
  set (node: Node, info: kNodeInfo.ShadowBlur | kNodeInfo.ShadowFull): any
  get (node: Node): kNodeInfo | undefined
  delete (node: Node): any
}

import {
  doc, keydownEvents_, safeObj, fgCache, isTop, set_keydownEvents_, setupEventListener, VOther, Stop_,
  esc, onWndFocus, isEnabled_, readyState_, injector, recordLog, weakRef_
} from "../lib/utils"
import { post_, safePost } from "./port"
import { getParentVApi, ui_box } from "./dom_ui"
import { hudHide } from "./hud"
import { set_currentScrolling, scrollTick, set_cachedScrollable } from "./scroller"
import { set_isCmdTriggered, resetAnyClickHandler } from "./key_handler"
import {
  activeEl_unsafe_, isHTML_, docEl_unsafe_, getEditableType_, GetShadowRoot_, getSelection_, frameElement_,
  SafeEl_not_ff_, MDW, fullscreenEl_unsafe_, removeEl_s, isNode_, BU
} from "../lib/dom_utils"
import { pushHandler_, removeHandler_, prevent_ } from "../lib/keyboard_utils"

let shadowNodeMap: ShadowNodeMap | undefined
let lock_ = null as LockableElement | null
let insert_global_: InsertModeOptions | null = null
let isHintingInput: BOOL = 0
let inputHint: { /** box */ b: HTMLDivElement | null; /** hints */ h: HintsNS.InputHintItem[] } | null = null
let suppressType: string | null = null
let insert_last_: WeakRef<LockableElement> | null | undefined
let is_last_mutable: BOOL = 1
let lastWndFocusTime = 0
let grabBackFocus: boolean | ((event: Event, target: LockableElement) => void) = readyState_ > "l"
let exitPassMode: ((this: void) => void) | undefined | null
let onExitSuppress: ((this: void) => void) | null = null
let onWndBlur2: ((this: void) => void) | undefined | null

export {
  lock_ as raw_insert_lock, insert_global_,
  insert_last_, is_last_mutable as insert_last_mutable,
  grabBackFocus, suppressType, inputHint as insert_inputHint, onWndBlur2, exitPassMode,
}
export function set_insert_global_ (_newIGlobal: InsertModeOptions): void { insert_global_ = _newIGlobal }
export function set_insert_last_ (_newILast: WeakRef<LockableElement> | null): void { insert_last_ = _newILast }
export function set_is_last_mutable (_newIsLastMutable: BOOL): void { is_last_mutable = _newIsLastMutable }
export function set_inputHint (_newIHint: typeof inputHint): void { inputHint = _newIHint }
export function set_isHintingInput (_newIsHintingInput: BOOL): void { isHintingInput = _newIsHintingInput }
export function set_grabBackFocus (_newGrabBackFocus: typeof grabBackFocus): void { grabBackFocus = _newGrabBackFocus }
export function set_onWndBlur2 (_newOnBlur: typeof onWndBlur2): void { onWndBlur2 = _newOnBlur }
export function set_exitPassMode <T extends typeof exitPassMode> (_nEPM: T): T { return exitPassMode = _nEPM }

export const insertInit = (): void => {
  /** if `notBody` then `activeEl` is not null */
  let activeEl = activeEl_unsafe_(),
  notBody = activeEl !== doc.body && (!(Build.BTypes & BrowserType.Firefox)
        || Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox
        || isHTML_() || activeEl !== docEl_unsafe_()) && !!activeEl;
  set_keydownEvents_(safeObj(null))
  if (fgCache.g && grabBackFocus) {
    let counter = 0
    if (notBody = notBody && !!getEditableType_(activeEl!)) {
      insert_last_ = null;
      counter = 1
      recordLog(kTip.logGrabFocus);
      (activeEl as LockableElement).blur();
      // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
      notBody = (activeEl = activeEl_unsafe_()) !== doc.body;
    }
    if (!notBody) {
      grabBackFocus = (event: Event, target: LockableElement): void => {
        const activeEl1 = activeEl_unsafe_();
        if (activeEl1 === target || activeEl1 && GetShadowRoot_(activeEl1)) {
          Stop_(event);
          counter++ || recordLog(kTip.logGrabFocus)
          target.blur();
        }
      };
      pushHandler_(exitGrab, kHandler.grabBackFocus)
      setupEventListener(0, MDW, exitGrab);
      return;
    }
  }
  grabBackFocus = false;
  if (notBody && getEditableType_(activeEl!)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    lock_ = activeEl as LockableElement;
  }
}

export const exitGrab = function (this: void, event?: Req.fg<kFgReq.exitGrab> | Event | HandlerNS.Event
    ): HandlerResult.Nothing | void {
  if (!grabBackFocus) { return /* safer */ HandlerResult.Nothing; }
  grabBackFocus = false;
  removeHandler_(kHandler.grabBackFocus)
  setupEventListener(0, MDW, exitGrab, 1);
  // it's acceptable to not set the userActed flag if there's only the top frame;
  // when an iframe gets clicked, the events are mousedown and then focus, so safePost is needed
  !((event && (event as HandlerNS.Event).e || event) instanceof Event) || !frames.length && isTop ||
  safePost({ H: kFgReq.exitGrab });
  return HandlerResult.Nothing;
} as {
  (this: void, event: HandlerNS.Event): HandlerResult.Nothing;
  (this: void, request: Req.bg<kBgReq.exitGrab>): void;
  (this: void, event?: Event): void;
}

export const insert_Lock_ = (): LockableElement | null => {
  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
      && lock_) {
    const root = lock_.getRootNode!();
    lock_ = root && (root as TypeToPick<Node, DocumentOrShadowRoot, "activeElement">
        ).activeElement === lock_ ? lock_ : null;
  }
  return lock_;
}

export const isInInsert = (): boolean => {
  if (suppressType || lock_ || insert_global_) {
    return !suppressType;
  }
  const el: Element | null = activeEl_unsafe_();
/** Ignore standalone usages of `{-webkit-user-modify:}` without `[contenteditable]`
* On Chromestatus, this is tagged `WebKitUserModify{PlainText,ReadWrite,ReadOnly}Effective`
* * https://www.chromestatus.com/metrics/css/timeline/popularity/338
* * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/element.cc?dr=C&q=IsRootEditableElementWithCounting&g=0&l=218
* `only used {-wum:RW}` in [0.2914%, 0.2926%]
* * Total percentage of `WebKitUserModifyReadWriteEffective` is 0.2926%, `WebKitUserModifyReadOnlyEffective` is ~ 0.000006%
* * `all used [ce=PT]` := `PlainTextEditingEffective - WebKitUserModifyPlainTextEffective` = 0.5754% - 0.5742% = 0.0012%
* * `contributed WebKitUserModifyReadWriteEffective` <= 0.0012%
* `only used {-wum:PT}` in [0, 0.5742%]
* And in top sites only "tre-rj.*.br" (Brazil) and "slatejs.org" causes `WebKitUserModify{RW/PT}Effective`
* * in slatejs.org, there's `[contenteditable=true]` and `{-webkit-user-modify:*plaintext*}` for browser compatibility
*/
  if (el && (el as TypeToAssert<Element, HTMLElement, "isContentEditable">).isContentEditable === true) {
    esc!(HandlerResult.Nothing);
    lock_ = el as LockableElement;
    return true;
  } else {
    return false;
  }
}

export const setupSuppress = (onExit?: (this: void) => void): void => {
  const f = onExitSuppress;
  onExitSuppress = suppressType = null;
  if (onExit) {
    suppressType = getSelection_().type;
    onExitSuppress = onExit;
  }
  if (f) { return f(); }
}

/** should only be called during keydown events */
export const focusUpper = (key: kKeyCode, force: boolean, event: ToPrevent): void | 1 => {
  const parEl = frameElement_() && !fullscreenEl_unsafe_();
  if (!parEl && (!force || isTop)) { return; }
  prevent_(event); // safer
  if (parEl) {
    keydownEvents_[key] = 1;
    const parApi = getParentVApi()
    if (parApi && !parApi.a(keydownEvents_)) {
      parApi.s()
      parApi.f(0, 0 as never, 0 as never, 1)
    } else {
      (parent as Window).focus()
    }
  } else if (keydownEvents_[key] !== 2) { // avoid sending too many messages
    post_({ H: kFgReq.nextFrame, t: Frames.NextType.parent, k: key });
    keydownEvents_[key] = 2;
  }
}

export const exitInsertMode = (target: Element): void => {
  if (GetShadowRoot_(target)) {
    if (target = lock_ as unknown as Element) {
      lock_ = null;
      (target as LockableElement).blur();
    }
  } else if (target === lock_ ? (lock_ = null, 1) : getEditableType_(target)) {
    (target as LockableElement).blur();
  }
  if (insert_global_) {
    lock_ = null; insert_global_ = null;
    hudHide();
  }
}

export const exitInputHint = (): void => {
  if (inputHint) {
    inputHint.b && removeEl_s(inputHint.b)
    inputHint = null;
    removeHandler_(kHandler.focusInput)
  }
}

export const resetInsert = (): void => {
  insert_last_ = lock_ = insert_global_ = null;
  is_last_mutable = 1;
  exitGrab(); setupSuppress();
}

export const onFocus = (event: Event | FocusEvent): void => {
  if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
      ? !event.isTrusted : event.isTrusted === false) { return; }
  // on Firefox, target may also be `document`
  let target: EventTarget | Element | Window | Document = event.target;
  if (target === window) {
    lastWndFocusTime = event.timeStamp
    return onWndFocus();
  }
  if (!isEnabled_ || Build.BTypes & BrowserType.Firefox && target === doc) { return; }
  /**
   * Notes:
   * according to test, Chrome Password Saver won't fill fields inside a shadow DOM
   * it's safe to compare .lock and doc.activeEl here without checking target.shadowRoot,
   *   and .shadowRoot should not block this check
   * DO NOT stop propagation
   * check `lock !== null` first, so that it needs less cost for common (plain) cases
   * use `lock === doc.active`, because:
   *   `lock !== target` ignores the case a blur event is missing or not captured;
   *   `target !== doc.active` lets it mistakenly passes the case of `target === lock === doc.active`
   */
  if (lock_ && lock_ === activeEl_unsafe_()) { return; }
  if (target === ui_box) { return Stop_(event); }
  const sr = GetShadowRoot_(target as Element);
  if (sr) {
    let path = !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        ? event.composedPath!() : event.path
      , topOfPath: EventTarget | undefined,
    /**
     * isNormalHost is true if one of:
     * - Chrome is since BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
     * - `event.currentTarget` (`this`) is a shadowRoot
     */
    isNormalHost = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
        && !(Build.BTypes & ~BrowserType.Chrome)
      || !(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
          && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
      ? (topOfPath = path![0]) !== target
      : !!(topOfPath = path && path[0]) && topOfPath !== window && topOfPath !== target
    hookOnShadowRoot(isNormalHost ? path! : [sr, target], target as Element);
    target = isNormalHost ? topOfPath as Element : target
  }
  if (!lastWndFocusTime || event.timeStamp - lastWndFocusTime > 30) {
    if (Build.BTypes & ~BrowserType.Firefox) {
      let el: SafeElement | null = SafeEl_not_ff_!(target as Element)
      el && set_currentScrolling(weakRef_(el))
    } else {
      set_currentScrolling(weakRef_(target as SafeElement))
    }
    set_cachedScrollable(0)
  }
  lastWndFocusTime = 0;
  if (getEditableType_<2>(target)) {
    if (grabBackFocus) {
      (grabBackFocus as Exclude<typeof grabBackFocus, boolean>)(event, target);
      return;
    }
    esc!(HandlerResult.Nothing)
    lock_ = target;
    if (is_last_mutable) {
      // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
      if (activeEl_unsafe_() !== doc.body) {
        insert_last_ = weakRef_(target);
      }
    }
  }
}

export const onBlur = (event: Event | FocusEvent): void => {
  if (!isEnabled_
      || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
          ? !event.isTrusted : event.isTrusted === false)) { return; }
  const target: EventTarget | Element | Window | Document = event.target;
  if (target === window) { return onWndBlur(); }
  if (Build.BTypes & BrowserType.Firefox && target === doc) { return; }
  let path = !(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
          && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
      ? event.composedPath!() : event.path
    , topOfPath: EventTarget | undefined
    , same = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
          && !(Build.BTypes & ~BrowserType.Chrome)
        || !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        ? (topOfPath = path![0]) === target
        : !(topOfPath = path && path[0]) || topOfPath === window || topOfPath === target
    , sr = GetShadowRoot_(target as Element);
  if (lock_ === (same ? target : topOfPath)) {
    lock_ = null;
    if (inputHint && !isHintingInput && doc.hasFocus()) {
      exitInputHint();
    }
  }
  if (!sr || target === ui_box) { return; }
  if (same) {
    shadowNodeMap || hookOnShadowRoot([sr, 0], 0) // in case of unexpect wrong states made by onFocus
    shadowNodeMap!.set(sr, kNodeInfo.ShadowBlur)
  } else {
    hookOnShadowRoot(path!, target as Element, 1);
  }
}

const onShadow = function (this: ShadowRoot, event: FocusEvent): void {
  if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
      ? !event.isTrusted : event.isTrusted === false) { return; }
  if (isEnabled_ && event.type === "focus") {
    onFocus(event);
    return;
  }
  if (!isEnabled_ || shadowNodeMap!.get(this) === kNodeInfo.ShadowBlur) {
    hookOnShadowRoot([this, 0 as never], 0, 1);
  }
  if (isEnabled_) {
    onBlur(event);
  }
}

const hookOnShadowRoot = (path: ArrayLike<EventTarget | 0>, target: Node | 0, disable?: 1): void => {
  for (let len = Build.MinCVer >= BrowserVer.Min$Event$$path$IsStdArrayAndIncludesWindow
        || !(Build.BTypes & BrowserType.Chrome)
        ? (path as Array<EventTarget | 0>).indexOf(target) : ([] as Array<EventTarget | 0>).indexOf.call(path, target)
      ; 0 <= --len; ) {
    const root = (path as EventPath)[len] as Document | Element | ShadowRoot
    // root is target or inside target, so always a Node
    if (isNode_(root, kNode.DOCUMENT_FRAGMENT_NODE)) {
      setupEventListener(root, "focus", onShadow, disable)
      setupEventListener(root, BU, onShadow, disable)
      disable ? shadowNodeMap && shadowNodeMap.delete(root)
      : (shadowNodeMap || (shadowNodeMap = Build.MinCVer < BrowserVer.MinEnsuredES6WeakMapAndWeakSet
            && Build.BTypes & BrowserType.Chrome ? /*#__NOINLINE__*/ getSimpleNodeMap() : new WeakMap!()
        )).set(root, kNodeInfo.ShadowFull);
    }
  }
}

export const onWndBlur = (): void => {
  scrollTick(0);
  onWndBlur2 && onWndBlur2();
  exitPassMode && exitPassMode();
  set_keydownEvents_(safeObj(null))
  set_isCmdTriggered(kKeyCode.None)
  if (Build.BTypes & BrowserType.Chrome) {
    /*#__NOINLINE__*/ resetAnyClickHandler();
  }
  injector || (<RegExpOne> /a?/).test("");
  esc!(HandlerResult.ExitPassMode);
}

const getSimpleNodeMap = (): ShadowNodeMap => {
  interface NodeWithInfo extends Node { vimiumC?: kNodeInfo }
  return WeakMap ? new WeakMap() : {
    set (node: Node, info: Exclude<kNodeInfo, kNodeInfo.NONE>): any { (node as NodeWithInfo).vimiumC = info },
    get (node: Node): kNodeInfo | undefined { return (node as NodeWithInfo).vimiumC },
    delete (node: Node): any { (node as NodeWithInfo).vimiumC = kNodeInfo.NONE }
  }
}
