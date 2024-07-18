import {
  doc, keydownEvents_, safeObj, isTop, set_keydownEvents_, setupEventListener, Stop_, OnChrome, OnFirefox, weakRef_ff,
  esc, onWndFocus, isEnabled_, readyState_, recordLog, weakRef_not_ff, OnEdge, getTime, abs_, fgCache, deref_,
  isTY, timeout_, timeStamp_, chromeVer_, VTr
} from "../lib/utils"
import {
  activeEl_unsafe_, getEditableType_, getEventPath, getSelection_, frameElement_, deepActiveEl_unsafe_, blur_unsafe,
  SafeEl_not_ff_, MDW, fullscreenEl_unsafe_, removeEl_s, isNode_, BU, docHasFocus_, getRootNode_mounted, testMatch,
  TryGetShadowRoot_, isAriaFalse_, findSelectorByHost
} from "../lib/dom_utils"
import { post_, runFallbackKey, runtime_port, safePost } from "./port"
import { getParentVApi, ui_box, ui_root } from "./dom_ui"
import { hudHide } from "./hud"
import { setNewScrolling, scrollTick } from "./scroller"
import { set_isCmdTriggered, resetAnyClickHandler_cr, onPassKey } from "./key_handler"
import { handler_stack, removeHandler_, prevent_, isEscape_, consumeKey_mac } from "../lib/keyboard_utils"
import { InputHintItem } from "./link_hints"
import { find_box } from "./mode_find"

const enum kNodeInfo { NONE = 0, ShadowBlur = 1, ShadowFull = 2 }
interface ShadowNodeMap {
  set (node: Node, info: kNodeInfo.ShadowBlur | kNodeInfo.ShadowFull): any
  get (node: Node): kNodeInfo | undefined
  delete (node: Node): any
}

let shadowNodeMap: ShadowNodeMap | undefined
let lock_ = null as LockableElement | null
let insert_global_: InsertModeOptions & Req.FallbackOptions | null = null
let isHintingInput: BOOL = 0
let inputHint: { /** box */ b: HTMLDivElement | null; /** hints */ h: InputHintItem[] } | null = null
let suppressType: string | 0 = 0
let insert_last_: WeakRef<LockableElement> | null | undefined
let insert_last2_: WeakRef<LockableElement> | null | undefined
let is_last_mutable: BOOL = 1
let lastWndFocusTime = 0
// the `readyState_ > "i"` is to grab focus on `chrome://*/*` URLs and `about:*` iframes
let grabBackFocus: boolean | ((event: Event, target: LockableElement) => void) = readyState_ > "i"
let onExitSuppress: ((this: void) => void) | 0 | undefined
let onWndBlur2: ((this: void) => void) | undefined | null
let passAsNormal: BOOL = 0
let readonlyFocused_: 0 | 1 | -1 = 0

export {
  lock_ as raw_insert_lock, insert_global_, passAsNormal, readonlyFocused_,
  insert_last_, insert_last2_, is_last_mutable as insert_last_mutable,
  grabBackFocus, suppressType, inputHint as insert_inputHint, onWndBlur2,
}
export function set_insert_global_ (_newIGlobal: typeof insert_global_): void { insert_global_ = _newIGlobal }
export function set_insert_last_ (_newILast: WeakRef<LockableElement> | null): void { insert_last_ = _newILast }
export function set_insert_last2_ (_newILast2: typeof insert_last2_): void { insert_last2_ = _newILast2 }
export function set_is_last_mutable (_newIsLastMutable: BOOL): void { is_last_mutable = _newIsLastMutable }
export function set_inputHint (_newIHint: typeof inputHint): void { inputHint = _newIHint }
export function set_isHintingInput (_newIsHintingInput: BOOL): void { isHintingInput = _newIsHintingInput }
export function set_grabBackFocus (_newGrabBackFocus: typeof grabBackFocus): void { grabBackFocus = _newGrabBackFocus }
export function set_onWndBlur2 (_newOnBlur: typeof onWndBlur2): void { onWndBlur2 = _newOnBlur }
export function set_passAsNormal (_newNormal: BOOL): void { passAsNormal = _newNormal }
export function set_readonlyFocused_ (_newRoFocused: 0 | 1 | -1): 0 | 1 | -1 { return readonlyFocused_ = _newRoFocused }
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion

export const insertInit = (doesGrab?: boolean | null, inLoading?: 1): void => {
  let activeEl = deepActiveEl_unsafe_() // https://github.com/gdh1995/vimium-c/issues/381#issuecomment-873529695
  let counter = inLoading ? 0 : 1, tick = 0
  if (doesGrab) {
    if (activeEl && getEditableType_(activeEl)) {
      if (inLoading) {
        insert_last_ = insert_last2_ = null
        counter = 1
        recordLog(kTip.logGrabFocus)()
      }
      activeEl.blur()
      // here ignore the rare case of an XMLDocument with an editable node on Firefox, for smaller code
      activeEl = deepActiveEl_unsafe_()
    } else {
      activeEl = null
    }
    if (!activeEl) {
      grabBackFocus = (event: Event, target: LockableElement): void => {
        const activeEl1 = activeEl_unsafe_(), now = getTime()
        // on Chrome, password saver won't set doc.activeElement when dispatching "focus" events
        if (activeEl1 === target || activeEl1 && TryGetShadowRoot_(activeEl1)) {
          Stop_(event);
          counter && abs_(now - tick) > 512 ? counter = 1 : counter++ || recordLog(kTip.logGrabFocus)()
          tick = now
          counter > GlobalConsts.MaxCountToGrabBackFocus - 1 ? exitGrab(event) :
          target.blur();
        }
      };
      if (!inLoading) { return }
      handler_stack.push(exitGrab, kHandler.grabBackFocus)
      setupEventListener(0, MDW, exitGrab);
      return;
    }
  }
  grabBackFocus = false;
  if (activeEl && getEditableType_(activeEl)) {
    lock_ = activeEl
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
  if (OnFirefox && lock_) {
    const root = getRootNode_mounted(lock_)
    lock_ = root && (root as TypeToPick<Node, DocumentOrShadowRoot, "activeElement"> // check `root &&`: safer
        ).activeElement === lock_ ? lock_ : null;
  }
  return lock_;
}

export const findNewEditable = (): LockableElement | null => {
  // ignore those in Shadow DOMs, since no issues have been reported
  const el: Element | null = activeEl_unsafe_();
  /* eslint-disable max-len */
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
  /* eslint-enable max-len */
  if (el && (el as TypeToAssert<Element, HTMLElement, "isContentEditable">).isContentEditable) {
    esc!(HandlerResult.Nothing);
    lock_ = el as LockableElement;
  }
  return lock_
}

export const setupSuppress = (onExit?: (this: void) => void): void => {
  const f = onExitSuppress;
  onExitSuppress = suppressType = 0
  if (onExit) {
    suppressType = getSelection_().type;
    onExitSuppress = onExit;
  }
  if (f) { f() }
}

/** should only be called during keydown events */
export const focusUpper = (key: kKeyCode, force: boolean, event: ToPrevent | 0): void | 1 => {
  const parEl = frameElement_() && !fullscreenEl_unsafe_();
  if (!parEl && (!force || isTop)) { return; }
  event && prevent_(event); // safer
  if (parEl) {
    Build.OS & kBOS.MAC ? consumeKey_mac(key, event as KeyboardEventToPrevent) : (keydownEvents_[key] = 1)
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

export const exitInsertMode = <(target: Element, event?: HandlerNS.Event) => HandlerResult> ((
    target: LockableElement | null, event?: HandlerNS.Event): HandlerResult => {
  if (target === lock_ || TryGetShadowRoot_(target as Element)) {
    target = lock_
    lock_ = null
  } else {
    target = getEditableType_(target!) ? target : null
  }
  const ret = insert_global_ && insert_global_.p || target && event
      && testConfiguredSelector_<"passEsc">(target, 1)
      && isEscape_(event.c) ? HandlerResult.Nothing : HandlerResult.Prevent
  if (target) {
    ret ? target.blur() : timeout_(blur_unsafe.bind(0, target), 0)
  }
  if (insert_global_) {
    runFallbackKey(insert_global_, 0)
    insert_global_ = null
    hudHide();
  }
  return ret
})

export const exitInputHint = (): void => {
  if (inputHint) {
    inputHint.b && removeEl_s(inputHint.b)
    inputHint = null;
    removeHandler_(kHandler.focusInput)
  }
}

export const resetInsertAndScrolling = (): void => { // force terser to mark it inline
  setNewScrolling(insert_last_ = insert_last2_ = lock_ = insert_global_ = null), is_last_mutable = 1,
  exitGrab(), setupSuppress()
  readonlyFocused_ > 0 && hudHide()
}

export const onFocus = (event: Event | FocusEvent): void => {
  if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
      ? !event.isTrusted : event.isTrusted === false) { return; }
  // on Firefox, target may also be `document`
  let target: EventTarget | Element | Window | Document = event.target;
  let el2: SafeElement & { _: 1 } | LockableElement | null | undefined
  if (target === window) {
    lastWndFocusTime = timeStamp_(event)
    onWndFocus()
    return
  }
  if (!isEnabled_) { return }
  if (OnFirefox && target === doc) { return }
  // since BrowserVer.MinMaybeAutoFillInShadowDOM , Chrome will auto fill a password in a shadow tree
  if (lock_ && lock_ === (OnChrome ? deepActiveEl_unsafe_() : activeEl_unsafe_())) { return; }
  if (target === ui_box) { Stop_(event); return }
  // on Edge 107 and MV3 mode, chrome.dom may throw `invalid extension context`
  const sr = OnChrome ? TryGetShadowRoot_(<Element> target, runtime_port ? 0 : 1) : TryGetShadowRoot_(target as Element)
  if (sr) {
    const path = getEventPath(event)
    let topOfPath: EventTarget | undefined
    /**
     * isNormalHost is true if one of:
     * - Chrome is since BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
     * - `event.currentTarget` (`this`) is a shadowRoot
     */
    const isNormalHost = !OnEdge && (!OnChrome
          || Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
          || Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM)
      ? (topOfPath = path![0]) !== target
      : !!(topOfPath = path && path[0]) && topOfPath !== window && topOfPath !== target
    hookOnShadowRoot(isNormalHost ? path! : [sr, target], target as Element);
    target = isNormalHost ? topOfPath as Element : target
  }
  if (!lastWndFocusTime || timeStamp_(event) - lastWndFocusTime > 30) {
    if (!OnFirefox) {
      el2 = SafeEl_not_ff_!(target as Element) satisfies SafeElement | null as SafeElement & { _: 1 } | null
      el2 && setNewScrolling(el2)
    } else {
      setNewScrolling(target as SafeElement)
    }
  }
  lastWndFocusTime = 0;
  let editableParent: SafeElement | null, type: EditableType | boolean
  if (type = getEditableType_<EventTarget>(target)) {
    if (grabBackFocus) {
      (grabBackFocus as Exclude<typeof grabBackFocus, boolean>)(event, target);
    } else {
      esc!(HandlerResult.Nothing)
      lock_ = target
      // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
      if (activeEl_unsafe_() !== doc.body) {
        if (is_last_mutable) {
          el2 = deref_(insert_last_)
          insert_last2_ = !el2 || el2 === target ? insert_last2_
              : OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinWeakRefReliableForDom
              ? weakRef_ff(el2, kElRef.lastEditable2) : insert_last_
          insert_last_ = OnFirefox ? weakRef_ff(target, kElRef.lastEditable) : weakRef_not_ff!(target)
        } else {
          insert_last2_ = OnFirefox ? weakRef_ff(target, kElRef.lastEditable2) : weakRef_not_ff!(target)
        }
      }
      editableParent = (type as number | boolean as EditableType) !== EditableType.ContentEditable
          || OnChrome && Build.MinCVer < BrowserVer.Min$Element$$closest && chromeVer_ < BrowserVer.Min$Element$$closest
          ? target
          : OnFirefox ? target.closest!("[contenteditable]") satisfies Element | null as SafeElement | null
          : SafeEl_not_ff_!(target.closest!("[contenteditable]"))
      readonlyFocused_ = editableParent && testConfiguredSelector_<"ignoreReadonly">(editableParent, 0) ? -1
        : (type as number | boolean as EditableType) > EditableType.MaxNotEditableElement
          && editableParent && !isAriaFalse_(editableParent, kAria.readOnly)
          || (type as number|boolean as EditableType) > EditableType.MaxNotTextBox && (target as TextElement).readOnly
        ? 1 : 0
      readonlyFocused_ > 0 && hudHide()
    }
  }
}

export const onBlur = (event: Event | FocusEvent): void => {
  if (!isEnabled_
      || (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
          ? !event.isTrusted : event.isTrusted === false)) { return; }
  let target: EventTarget | Element | Window | Document = event.target, topOfPath: EventTarget | undefined
  if (target === window) { onWndBlur(); return }
  if (OnFirefox && target === doc) { return; }
  const sr = OnChrome ? TryGetShadowRoot_(target as Element, runtime_port ? 0 : 1) : TryGetShadowRoot_(<Element> target)
  if (sr && target !== ui_box) {
  const path = getEventPath(event)
  const same = !OnEdge && (!OnChrome
          || Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
          || Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM)
        ? (topOfPath = path![0]) === target
        : !(topOfPath = path && path[0]) || topOfPath === window || topOfPath === target
  if (same) {
    shadowNodeMap || hookOnShadowRoot([sr, 0], 0) // in case of unexpect wrong states made by onFocus
    shadowNodeMap!.set(sr, kNodeInfo.ShadowBlur)
  } else {
    hookOnShadowRoot(path!, target as Element, 1);
    target = topOfPath!
  }
  }
  if (lock_ === target) {
    lock_ = null;
    if (inputHint && !isHintingInput && docHasFocus_()) {
      exitInputHint();
    }
    readonlyFocused_ > 0 && hudHide()
  }
}

const onShadow = function (this: ShadowRoot, event: FocusEvent): void {
  if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
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
  for (let len = !OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$path$IsStdArrayAndIncludesWindow
        ? (path as Array<EventTarget | 0>).indexOf(target) : ([] as Array<EventTarget | 0>).indexOf.call(path, target)
      ; 0 <= --len; ) {
    const root = (path as EventPath)[len] as Document | Element | ShadowRoot
    // root is target or inside target, so always a Node
    if (isNode_(root, kNode.DOCUMENT_FRAGMENT_NODE)) {
      setupEventListener(root, "focus", onShadow, disable)
      setupEventListener(root, BU, onShadow, disable)
      disable ? shadowNodeMap && shadowNodeMap.delete(root)
      : (shadowNodeMap || (shadowNodeMap = OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6WeakMapAndWeakSet
            ? /*#__NOINLINE__*/ getSimpleNodeMap() : new WeakMap!()
        )).set(root, kNodeInfo.ShadowFull);
    }
  }
}

const onWndBlur = (): void => {
  scrollTick(0);
  onWndBlur2 && onWndBlur2();
  onPassKey && onPassKey()
  if (!find_box || find_box !== (OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
      || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
      || !OnEdge && ui_box !== ui_root ? (ui_root as ShadowRoot).activeElement : activeEl_unsafe_())) {
    set_keydownEvents_(safeObj<any>(null))
  }
  set_isCmdTriggered(kKeyCode.None)
  OnChrome && /*#__NOINLINE__*/ resetAnyClickHandler_cr()
  esc!(HandlerResult.ExitNormalMode);
}

const getSimpleNodeMap = (): ShadowNodeMap => {
  interface NodeWithInfo extends Node { vimiumC?: kNodeInfo }
  return WeakMap ? new WeakMap() : {
    set (node: Node, info: Exclude<kNodeInfo, kNodeInfo.NONE>): any { (node as NodeWithInfo).vimiumC = info },
    get (node: Node): kNodeInfo | undefined { return (node as NodeWithInfo).vimiumC },
    delete (node: Node): any { (node as NodeWithInfo).vimiumC = kNodeInfo.NONE }
  }
}

const testConfiguredSelector_ = <T extends "passEsc" | "ignoreReadonly">(target: SafeElement
    , passEsc: T extends "passEsc" ? 1 : 0): boolean | 0 => {
  let selector: string | [string] | 0 | void = (passEsc ? fgCache.p : fgCache.y) as string | [string] | 0
  if (isTY(selector)) {
    if (OnEdge) {
      selector = selector.replace(<RegExpG & RegExpSearchable<0>> /:default/g
          , () => VTr(passEsc + kTip.defaultIgnoreReadonly))
    }
    selector = findSelectorByHost(selector, target)
    selector = selector ? (!OnEdge ? [selector.replace(":default"
        , VTr(passEsc + kTip.defaultIgnoreReadonly) as "css")] : [selector]) : 0
    fgCache[("yp"[passEsc]) as "y" | "p"] = (selector satisfies [string] | 0) as never
  }
  return selector && testMatch(selector[0], target)
}
