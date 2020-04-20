const enum kNodeInfo {
  NONE = 0,
  ShadowBlur = 1, ShadowFull = 2,
}
interface NodeWithInfo extends Node {
  vimiumInfo?: kNodeInfo;
}

import {
  doc, keydownEvents_, safeObj, fgCache, isTop, rawSetKeydownEvents, setupEventListener, VOther,
  esc, onWndFocus, isEnabled_, injector,
} from "../lib/utils.js"
import * as VKey from "../lib/keyboard_utils.js"
import * as VDom from "../lib/dom_utils.js"
import { post_, safePost } from "../lib/port.js"
import { getParentVApi, ui_box } from "./dom_ui.js"
import { hudHide } from "./hud.js"
import { setCurrentScrolling, currentScrolling, setCachedScrollable, scrollTick } from "./scroller.js"
import { resetIsCmdTriggered, resetAnyClickHandler } from "./key_handler.js"

const domNodeMap = Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
    || WeakMap ? new WeakMap!<Node, kNodeInfo>() as never : {
  set (node: Node, info: Exclude<kNodeInfo, kNodeInfo.NONE>): any { (node as NodeWithInfo).vimiumInfo = info; },
  get (node: Node): kNodeInfo | undefined { return (node as NodeWithInfo).vimiumInfo; },
  delete (node: Node): any { delete (node as NodeWithInfo).vimiumInfo; }
}

let lock_ = null as LockableElement | null
let global_: CmdOptions[kFgCmd.insertMode] | null = null
let hinting: BOOL = 0
let inputHint: { /** box */ b: HTMLDivElement; /** hints */ h: HintsNS.InputHintItem[] } | null = null
let suppressType: string | null = null
let last: LockableElement | null = null
let is_last_mutable: BOOL = 1
let lastWndFocusTime = 0
let grabBackFocus: boolean | ((event: Event, target: LockableElement) => void) = VDom.readyState_ > "l"
let exitPassMode: ((this: void) => void) | undefined | null
let onExitSuppress: ((this: void) => void) | null = null
let onWndBlur2: ((this: void) => void) | undefined | null

export {
  lock_ as raw_insert_lock, global_ as insert_global,
  last as insert_last, is_last_mutable as insert_last_mutable,
  grabBackFocus, suppressType, inputHint as insert_inputHint, onWndBlur2, exitPassMode,
}
export const setInsertGlobal = (global: CmdOptions[kFgCmd.insertMode]): void => { global_ = global }
export const setInsertLast = (newLast: LockableElement | null, newMutable: BOOL): void => {
  last = newLast; is_last_mutable = newMutable
}
export const setInputHint = (newHint: typeof inputHint): void => { inputHint = newHint }
export const setInsertHinting = (newHinting: BOOL): void => { hinting = newHinting }
export const setGrabBackFocus = (newGrab: typeof grabBackFocus) => { grabBackFocus = newGrab }
export const setOnWndBlur2 = (f: ((this: void) => void) | undefined | null): void => { onWndBlur2 = f; }
export const setExitPassMode = (f: ((this: void) => void) | undefined | null): void => { exitPassMode = f; }

export const insertInit = (): void => {
  /** if `notBody` then `activeEl` is not null */
  let activeEl = VDom.activeEl_unsafe_(),
  notBody = activeEl !== doc.body && (!(Build.BTypes & BrowserType.Firefox)
        || Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox
        || VDom.isHTML_() || activeEl !== VDom.docEl_unsafe_()) && !!activeEl;
  /*#__INLINE__*/ rawSetKeydownEvents(safeObj(null))
  if (fgCache.g && grabBackFocus) {
    let counter = 0, prompt = function (): void {
      counter++ || console.log("Vimium C blocks auto-focusing.");
    };
    if (notBody = notBody && VDom.getEditableType_(activeEl!)) {
      last = null;
      prompt();
      (activeEl as LockableElement).blur();
      // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
      notBody = (activeEl = VDom.activeEl_unsafe_()) !== doc.body;
    }
    if (!notBody) {
      grabBackFocus = function (event: Event, target: LockableElement): void {
        const activeEl1 = VDom.activeEl_unsafe_();
        if (activeEl1 === target || activeEl1 && VDom.GetShadowRoot_(activeEl1)) {
          VKey.Stop_(event);
          prompt();
          target.blur();
        }
      };
      VKey.pushHandler_(exitGrab, exitGrab);
      setupEventListener(0, "mousedown", exitGrab);
      return;
    }
  }
  grabBackFocus = false;
  if (notBody && VDom.getEditableType_(activeEl!)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    lock_ = activeEl as LockableElement;
  }
}

export const exitGrab = function (this: void, event?: Req.fg<kFgReq.exitGrab> | Event | HandlerNS.Event
    ): HandlerResult.Nothing | void {
  if (!grabBackFocus) { return /* safer */ HandlerResult.Nothing; }
  grabBackFocus = false;
  VKey.removeHandler_(exitGrab);
  setupEventListener(0, "mousedown", exitGrab, 1);
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
  if (suppressType || lock_ || global_) {
    return !suppressType;
  }
  const el: Element | null = VDom.activeEl_unsafe_();
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
    suppressType = VDom.getSelection_().type;
    onExitSuppress = onExit;
  }
  if (f) { return f(); }
}

/** should only be called during keydown events */
export const focusUpper = (key: kKeyCode, force: boolean, event: ToPrevent): void | 1 => {
  const parEl = VDom.frameElement_();
  if (!parEl && (!force || isTop)) { return; }
  VKey.prevent_(event); // safer
  if (parEl) {
    keydownEvents_[key] = 1;
    const parApi = getParentVApi()
    if (parApi && !parApi.setupKeydownEvents_(keydownEvents_)) {
      parApi.suppressTailKeys_(0)
      parApi.focusAndRun_(0, 0 as never, 0 as never, 1)
    } else {
      (parent as Window).focus()
    }
  } else if (keydownEvents_[key] !== 2) { // avoid sending too many messages
    post_({ H: kFgReq.nextFrame, t: Frames.NextType.parent, k: key });
    keydownEvents_[key] = 2;
  }
}

export const exitInsertMode = (target: Element): void => {
  if (VDom.GetShadowRoot_(target)) {
    if (target = lock_ as unknown as Element) {
      lock_ = null;
      (target as LockableElement).blur();
    }
  } else if (target === lock_ ? (lock_ = null, 1) : VDom.getEditableType_(target)) {
    (target as LockableElement).blur();
  }
  if (global_) {
    lock_ = null; global_ = null;
    hudHide();
  }
}

export const exitInputHint = (): void => {
  const hint = inputHint;
  if (!hint) { return; }
  inputHint = null;
  hint.b.remove();
  VKey.removeHandler_(hint);
}

export const resetInsert = (): void => {
  last = lock_ = global_ = null;
  is_last_mutable = 1;
  exitGrab(); setupSuppress();
}

export const onFocus = (event: Event | FocusEvent): void => {
  if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
      ? !event.isTrusted : event.isTrusted === false) { return; }
  // on Firefox, target may also be `document`
  let target: EventTarget | Element | Window | Document = event.target;
  if (target === window) {
    lastWndFocusTime = Date.now();
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
  if (lock_ && lock_ === VDom.activeEl_unsafe_()) { return; }
  if (target === ui_box) { return VKey.Stop_(event); }
  const sr = VDom.GetShadowRoot_(target as Element);
  if (sr) {
    let path = !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        ? event.composedPath!() : event.path
      , top: EventTarget | undefined,
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
      ? (top = path![0]) !== target
      : !!(top = path && path[0]) && top !== window && top !== target;
    hookOnShadowRoot(isNormalHost ? path! : [sr, target], target as Element);
    target = isNormalHost ? top as Element : target;
  }
  if (!lastWndFocusTime || Date.now() - lastWndFocusTime > 30) {
    /*#__INLINE__*/ setCurrentScrolling(Build.BTypes & ~BrowserType.Firefox
        ? VDom.SafeEl_not_ff_!(target as Element) || currentScrolling : target as SafeElement);
    /*#__INLINE__*/ setCachedScrollable(0);
  }
  lastWndFocusTime = 0;
  if (VDom.getEditableType_<2>(target)) {
    if (grabBackFocus) {
      (grabBackFocus as Exclude<typeof grabBackFocus, boolean>)(event, target);
      return;
    }
    esc!(HandlerResult.Nothing)
    lock_ = target;
    if (is_last_mutable) {
      // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
      if (VDom.activeEl_unsafe_() !== doc.body) {
        last = target;
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
    , top: EventTarget | undefined
    , same = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
          && !(Build.BTypes & ~BrowserType.Chrome)
        || !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        ? (top = path![0]) === target
        : !(top = path && path[0]) || top === window || top === target
    , sr = VDom.GetShadowRoot_(target as Element);
  if (lock_ === (same ? target : top)) {
    lock_ = null;
    if (inputHint && !hinting && doc.hasFocus()) {
      exitInputHint();
    }
  }
  if (!sr || target === ui_box) { return; }
  if (same) {
    domNodeMap.set(sr, kNodeInfo.ShadowBlur);
  } else {
    hookOnShadowRoot(path!, target as Element, 1);
  }
}

export const onShadow = function (this: ShadowRoot, event: FocusEvent): void {
  if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
      ? !event.isTrusted : event.isTrusted === false) { return; }
  if (isEnabled_ && event.type === "focus") {
    onFocus(event);
    return;
  }
  if (!isEnabled_ || domNodeMap.get(this) === kNodeInfo.ShadowBlur) {
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
    const root = (path as EventPath)[len] as Node;
    // root is target or inside target, so always a Node
    if (root.nodeType === kNode.DOCUMENT_FRAGMENT_NODE) {
      setupEventListener(root as ShadowRoot, "focus", onShadow, disable);
      setupEventListener(root as ShadowRoot, "blur", onShadow, disable);
      disable ? domNodeMap.delete(root) : domNodeMap.set(root, kNodeInfo.ShadowFull);
    }
  }
}

export const onWndBlur = (): void => {
  scrollTick(0);
  onWndBlur2 && onWndBlur2();
  exitPassMode && exitPassMode();
  /*#__INLINE__*/ rawSetKeydownEvents(safeObj(null))
  /*#__INLINE__*/ resetIsCmdTriggered();
  if (Build.BTypes & BrowserType.Chrome) {
    resetAnyClickHandler();
  }
  injector || (<RegExpOne> /a?/).test("");
  esc!(HandlerResult.ExitPassMode);
}
