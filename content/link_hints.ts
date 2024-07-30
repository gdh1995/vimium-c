interface ContentOptions extends HintsNS.Options, SafeObject { $s?: 1 }
type LinkEl = Hint[0]
export interface MarkerElement extends SafeHTMLElement {
  readonly localName: "span"
  readonly firstChild: HTMLSpanElement | Text | null
  readonly firstElementChild: HTMLSpanElement | null
  readonly childNodes: NodeListOf<HTMLSpanElement | Text>
}
export interface BaseHintItem {
  /** marker */ m: MarkerElement | null
  /** dest */ d: LinkEl
}
export interface ExecutableHintItem extends BaseHintItem {
  /** refer */ r: HTMLElementUsingMap | LinkEl | null
}
export interface DrawableHintItem extends BaseHintItem { m: MarkerElement }
export interface HintText {
  /** rawText */ t: string
  /** words */ w: string[] | null
}
export interface HintItem extends DrawableHintItem, ExecutableHintItem {
  /** marker */ m: MarkerElement
  /** key */ a: string
  /** text */ h: HintText | null
  /** score (if not filterHints, it's count of matched characters) */ i: number
  /** zIndex */ z?: number
}
export interface FilteredHintItem extends HintItem { h: HintText }
export interface InputHintItem extends DrawableHintItem { d: SafeHTMLElement }

export interface KeyStatus extends HintsNS.BaseKeyStatus {
    /** curHints */ c: readonly HintItem[];
    /** keySequence */ k: string;
    /** textSequence */ t: string;
    /** known */ n: BOOL;
    /** tab */ b: number;
}
interface HintStatus extends HintsNS.BaseHintStatus {
  /** keyStatus */ k: Readonly<KeyStatus>
}
interface BaseHintWorker extends HintsNS.BaseHintWorker {
  /** get stat */ $ (): Readonly<HintStatus>
  /** clear */ c: typeof clear
  /** dialogMode */ d: BOOL | 3
  /** executeHint */ e: typeof executeHintInOfficer
  /** getPreciseChildRect */ g: typeof getPreciseChildRect
  /** has just started: neg means a fresh command; pos means a reinited one */ h: number
  /** delayToExecute */ j: typeof delayToExecute
  /** highlightHint */ l: typeof highlightHint
  /** collectFrameHints */ o: typeof collectFrameHints
  /** manager */ p: HintManager | null
  /** render */ r (hints: readonly HintItem[], arr: ViewBox, raw_apis: VApiTy): void
  /** rotate1 */ t: typeof rotate1
  /** checkLast_ */ x: {
    (el?: WeakRef<LinkEl> | undefined, r?: Rect | null | undefined, hasJustReinited?: BOOL | boolean | null): BOOL
    (el: 1, r?: undefined): 1 | 2
  }
  /** yankedList */ y: string[]
}
interface HintManager extends BaseHintWorker {
    hints_?: readonly HintItem[] | null
    keyStatus_?: KeyStatus | null
    /** get stat (also reset mode if needed) */ $ (doesResetMode?: 1): Readonly<HintStatus>
    /** reinit */ i (auto: 1, _arg2?: undefined): void
    /** onKeydown */ n: typeof onKeydown
    p: null;
    /** resetMode */ s: typeof resetMode
    /** onFrameUnload */ u: typeof onFrameUnload
    /** resetHints */ v (): void;
}
interface HintOfficer extends BaseHintWorker {
    p: HintManager | null
}
interface ChildFrame {
    v: Rect | null;
    s: HintOfficer
}
interface FrameHintsInfo {
    h: readonly HintItem[];
    v: ViewBox;
    s: HintManager | HintOfficer
}
/** return whether the element's VHints is not accessible */
export type AddChildDirectly = (officer: BaseHintWorker, el: AccessableIFrameElement, rect: Rect | null) => boolean

import {
  VTr, isAlive_, isEnabled_, setupEventListener, keydownEvents_, set_keydownEvents_, timeout_, max_, min_, abs_, OnEdge,
  clearTimeout_, fgCache, doc, readyState_, chromeVer_, vApi, deref_, getTime, unwrap_ff, OnFirefox, OnChrome,
  WithDialog, Lower, safeCall, os_, firefoxVer_, weakRef_not_ff, weakRef_ff, isTY, isIFrameInAbout_, findOptByHost
} from "../lib/utils"
import {
  querySelector_unsafe_, isHTML_, scrollingEl_, docEl_unsafe_, IsAInB_, GetParent_unsafe_, hasInCSSFilter_,derefInDoc_,
  getComputedStyle_, isStyleVisible_, htmlTag_, fullscreenEl_unsafe_, removeEl_s, PGH, toggleClass_s, doesSupportDialog,
  getSelectionFocusEdge_, SafeEl_not_ff_, compareDocumentPosition, deepActiveEl_unsafe_, frameElement_, getSelection_,
} from "../lib/dom_utils"
import {
  ViewBox, getViewBox_, prepareCrop_, wndSize_, bZoom_, wdZoom_, dScale_, boundingRect_,
  docZoom_, bScale_, dimSize_, isSelARange, view_, isNotInViewport, kInvisibility,
} from "../lib/rect"
import {
  replaceOrSuppressMost_, removeHandler_, getMappedKey, keybody_, isEscape_, getKeyStat_, keyNames_, suppressTail_,
  BSP, ENTER, SPC, isRepeated_,
} from "../lib/keyboard_utils"
import {
  style_ui, addElementList, ensureBorder, adjustUI, flash_, getParentVApi, getWndVApi_ff, checkHidden, removeModal,
  getSelected, getSelectionBoundingBox_, hasPopover_
} from "./dom_ui"
import { scrollTick, beginScroll, currentScrolling } from "./scroller"
import { hudTip, hudShow, hudHide, hud_tipTimer } from "./hud"
import {
  set_onWndBlur2, insert_Lock_, set_grabBackFocus, insertInit, raw_insert_lock, insert_last_, insert_last2_
} from "./insert"
import {
  getVisibleElements, localLinkClear, frameNested_, checkNestedFrame, set_frameNested_, filterOutNonReachable, traverse,
  ClickType, initTestRegExps, excludeHints
} from "./local_links"
import {
  matchHintsByKey, zIndexes_, rotate1, initFilterEngine, initAlphabetEngine, renderMarkers, generateHintText,
  getMatchingHints, activeHint_, hintFilterReset, set_maxPrefixLen_, set_zIndexes_, adjustMarkers, createHint
} from "./hint_filters"
import { executeHintInOfficer, removeFlash, set_removeFlash } from "./link_actions"
import { hover_async, lastHovered_ } from "./async_dispatcher"
import { HookAction, hookOnWnd, contentCommands_, runFallbackKey } from "./port"
import { isInteractiveInPage } from "./pagination"

let box_: HTMLDivElement | HTMLDialogElement | null = null
let wantDialogMode_: boolean | null | undefined
let hints_: readonly HintItem[] | null = null
let frameArray: FrameHintsInfo[] = []
let mode_ = HintMode.empty
let mode1_ = HintMode.empty
let forHover_: BOOL = 0
let count_ = 0
let lastMode_: HintMode = 0
let noHUD_: BOOL = 0
let tooHigh_: null | BOOL = 0
let isClickListened_ = true
let chars_ = ""
let useFilter_: boolean
let keyStatus_: KeyStatus
  /** must be called from a manager, required by {@link #delayToExecute_ } */
let onTailEnter: ((this: unknown, event: HandlerNS.Event, key: string, keybody: kChar) => void) | null | undefined
let onWaitingKey: HandlerNS.VoidHandler<HandlerResult> | null | undefined
let isActive: BOOL = 0
let options_: ContentOptions = null as never
let _timer: ValidTimeoutID = TimerID.None, _reinitTime = 0
let kSafeAllSelector = OnFirefox ? "*" as const : ":not(form)" as const
let manager_: HintManager | null = null
let api_: VApiTy = null as never
let addChildFrame_: AddChildDirectly | null | undefined
let isHC_: boolean | null | undefined
let doesAllowModifierEvents_ff: BOOL = 0

export {
  isActive as isHintsActive, box_ as hint_box, wantDialogMode_,
  hints_ as allHints, keyStatus_ as hintKeyStatus, useFilter_, chars_ as hintChars,
  mode_ as hintMode_, mode1_, options_ as hintOptions, count_ as hintCount_,
  forHover_, isClickListened_, tooHigh_, kSafeAllSelector, addChildFrame_,
  api_ as hintApi, manager_ as hintManager, isHC_
}
export function set_kSafeAllSelector (_newKSafeAll: string): void { kSafeAllSelector = _newKSafeAll as any }
export function set_isClickListened_ (_newIsClickListened: boolean): void { isClickListened_ = _newIsClickListened }

export const activate = (options: ContentOptions, count: number, force?: 2 | TimerType.fake): void => {
    const oldTimer = _timer, xy = options.xy as HintsNS.StdXY | undefined
    _timer = _reinitTime = coreHints.h = 0
    clearTimeout_(oldTimer)
    if (isActive && force !== 2 || !isEnabled_) { return; }
    if (checkHidden(kFgCmd.linkHints, options, count)) {
      return clear(1)
    }
    if (doc.body === null) {
      manager_ || clear()
      if (!oldTimer && readyState_ > "l") {
        reinitLinkHintsIn(300, contentCommands_[kFgCmd.linkHints].bind(0 as never, options, count, 0))
        return replaceOrSuppressMost_(kHandler.linkHints)
      }
    }
    OnFirefox || isClickListened_ && vApi.e
        && vApi.e(oldTimer ? kContentCmd.ManuallyReportKnownAtOnce : kContentCmd.AutoReportKnownAtOnce_not_ff)
    if (xy && !xy.n) { xy.n = count, count = 1 }
    if (options.direct) { return activateDirectly(options, count) }
    const parApi = !fullscreenEl_unsafe_() && getParentVApi()
    if (parApi) {
      parApi.l(style_ui)
      // recursively go up and use the topmost frame in a same origin
      return parApi.f(kFgCmd.linkHints, options, count, 2, frameElement_())
    }
    const useFilter0 = options.useFilter, useFilter = useFilter0 != null ? !!useFilter0 : fgCache.f,
    topFrameInfo: FrameHintsInfo = {h: [], v: null as never, s: coreHints},
    toCleanArray: HintOfficer[] = [], wantTop = options.onTop,
    chars: string = options.c ? options.c : useFilter ? fgCache.n : fgCache.c
    frameArray = [topFrameInfo]
    isHC_ = matchMedia(VTr(
        OnChrome && Build.MinCVer < BrowserVer.MinForcedColorsMode && chromeVer_ < BrowserVer.MinForcedColorsMode
        ? kTip.highContrast_WOB : kTip.forcedColors)).matches
    if (WithDialog) {
      if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredShadowDOMV1
          ? firefoxVer_ < FirefoxBrowserVer.MinEnsuredShadowDOMV1
          : OnChrome && BrowserVer.MinEnsuredHTMLDialogElement < BrowserVer.MinShadowDOMV0
              && Build.MinCVer < BrowserVer.MinShadowDOMV0 && chromeVer_ < BrowserVer.MinShadowDOMV0) {
        removeModal()
      }
      coreHints.d = !(OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement || doesSupportDialog()) ? 0
        : hasPopover_ > 1 || querySelector_unsafe_("dialog[open]") ? 3
        : <BOOL> +!!(wantDialogMode_ != null ? wantDialogMode_
            : isTY(wantTop) ? findOptByHost(wantTop, 0) : wantTop != null ? wantTop : hasInCSSFilter_())
    }
    let allHints: readonly HintItem[], child: ChildFrame | undefined, insertPos = 0
      , frameInfo: FrameHintsInfo, total: number
      const childFrames: ChildFrame[] = [],
      addChild: AddChildDirectly = (officer, el, rect): boolean => {
        const childApi = detectUsableChild(el),
        childOfficer: HintOfficer | null | undefined = childApi && (childApi.b as HintOfficer)
        if (childOfficer) {
          childApi!.l(style_ui)
          childFrames.splice(insertPos, 0, {
            v: rect && officer.g(el, rect),
            s: childOfficer
          });
        }
        return !childOfficer
      };
    {
      coreHints.o(options, count, chars, useFilter, null, null, topFrameInfo, addChild)
      allHints = topFrameInfo.h
      while (child = childFrames.pop()) {
        if (child.v) {
          insertPos = childFrames.length;
          frameArray.push(frameInfo = {h: [], v: null as never, s: child.s});
          child.s.o(options, count, chars, useFilter, child.v, coreHints, frameInfo, addChild);
          // ensure allHints always belong to the manager frame
          allHints = frameInfo.h.length ? allHints.concat(frameInfo.h) : allHints;
        } else if (child.s.$().a) {
          toCleanArray.push(child.s)
        }
      }
      for (const i of toCleanArray) { i.p = null; i.c() }
      total = allHints.length;
      if (!total || total > GlobalConsts.MaxCountToHint) {
        runFallbackKey(options
            , total ? kTip.tooManyLinks : mode_ < HintMode.min_job && !options.match ? kTip.noLinks : kTip.noTargets)
        return clear()
      }
      hints_ = keyStatus_.c = allHints
      if (!Build.NDEBUG) { coreHints.hints_ = allHints }
    }
    noHUD_ = !(useFilter || topFrameInfo.v[3] > 40 && topFrameInfo.v[2] > 320) || options.hideHUD ? 1 : 0
    useFilter ? /*#__NOINLINE__*/ initFilterEngine(allHints as readonly FilteredHintItem[])
        : initAlphabetEngine(allHints)
    renderMarkers(allHints)
    coreHints.h = -getTime()
    for (const frame of frameArray) {
      frame.s.r(frame.h, frame.v, vApi);
    }
}

const collectFrameHints = (options: ContentOptions, count: number
      , chars: string, useFilter: boolean, outerView: Rect | null
      , manager: HintManager | null, frameInfo: FrameHintsInfo
      , newAddChildFrame: AddChildDirectly): void => {
    (coreHints as BaseHintWorker).p = manager_ = OnFirefox ? manager && unwrap_ff(manager) : manager
    coreHints.v()
    scrollTick(2);
    if (options_ !== options) {
      /** ensured by {@link ../background/key_mappings.ts#KeyMappings.makeCommand_} */
      options_ = options;
      count_ = count;
      setMode(count > 1 ? (options.m || (HintMode.OPEN_WITH_QUEUE & ~HintMode.queue)) | HintMode.queue : options.m, 1)
    }
    chars_ = chars;
    useFilter_ = useFilter
    if (!isHTML_()) {
      return;
    }
    const view: ViewBox = getViewBox_(WithDialog ? (((manager || coreHints).d satisfies 0 | 1 | 3) | 1) as 1 | 3 : 1)
    prepareCrop_(1, outerView);
    if (tooHigh_ !== null) {
      const scrolling = !options.longPage && scrollingEl_(1)
      tooHigh_ = scrolling
          && dimSize_(scrolling, kDim.scrollH) / wndSize_() > GlobalConsts.LinkHintTooHighThreshold ? 1 : 0
    }
    removeModal()
    initTestRegExps() // needed by generateHintText
    addChildFrame_ = newAddChildFrame
    const elements = /*#__NOINLINE__*/ getVisibleElements(view)
    const hintItems = elements.map(createHint);
    addChildFrame_ = null
    bZoom_ !== 1 && /*#__NOINLINE__*/ adjustMarkers(hintItems, elements);
    for (let i = useFilter ? hintItems.length : 0; 0 <= --i; ) {
      hintItems[i].h = generateHintText(elements[i], i, hintItems)
    }
    frameInfo.h = hintItems;
    frameInfo.v = view;
}

const render: BaseHintWorker["r"] = (hints, arr: FrameHintsInfo["v"], raw_apis): void => {
    const managerOrA = manager_ || coreHints;
    let body = doc.body
    if (manager_ && (body && htmlTag_(body) && body.isContentEditable || isIFrameInAbout_)) {
      hookOnWnd(HookAction.Install)
    }
    removeBox()
    api_ = OnFirefox && manager_ ? unwrap_ff(raw_apis) : raw_apis
    ensureBorder(wdZoom_ / dScale_);
    manager_ || setMode(mode_)
    if (hints.length) {
      if (WithDialog) {
        box_ = addElementList(hints, arr, ((managerOrA.d satisfies 0 | 1 | 3) | coreHints.d) as typeof managerOrA.d)
      } else {
        box_ = addElementList(hints, arr);
      }
    } else if (!manager_) {
      adjustUI();
    }
    set_keydownEvents_((OnFirefox ? api_ : raw_apis).a())
    set_onWndBlur2(managerOrA.s)
    replaceOrSuppressMost_(kHandler.linkHints, coreHints.n)
    manager_ && setupEventListener(0, PGH, clear) // "unload" is deprecated
    isActive = 1;
    options_.suppressInput && insertInit(true)
}

/** must be called from the manager context, or be used to sync mode from the manager */
export const setMode = (mode: HintMode, silent?: BOOL): void => {
    mode_ - mode ? lastMode_ = mode_ = mode : 0
    mode1_ = mode & ~HintMode.queue;
    forHover_ = mode1_ > HintMode.min_hovering - 1 && mode1_ < HintMode.max_hovering + 1 ? 1 : 0
    if (silent || noHUD_ || hud_tipTimer) { return }
    let key: string | undefined
    let msg = onTailEnter && !onWaitingKey ? VTr(kTip.waitForEnter) : VTr(mode_)
        + (useFilter_ || isHC_ ? ` [${key = isHC_ ? keyStatus_.k + keyStatus_.t : keyStatus_.t}]` : "")
        + (WithDialog && !((useFilter_ || isHC_) && key) && coreHints.d ? VTr(kTip.modalHints) : "")
    hudShow(kTip.raw, msg, true)
}

const getPreciseChildRect = (frameEl: KnownIFrameElement, view: Rect): Rect | null => {
    const V = "visible", brect = boundingRect_(frameEl), // not check <iframe>s referred by <slot>s
    docEl = docEl_unsafe_(), body = doc.body, inBody = !!body && IsAInB_(frameEl as SafeHTMLElement, body),
    zoom = (OnChrome ? docZoom_ * (inBody ? bZoom_ : 1) : 1) / dScale_ / (inBody ? bScale_ : 1);
    let x0 = min_(view.l, brect.l), y0 = min_(view.t, brect.t), l = x0, t = y0, r = view.r, b = view.b
    for (let el: Element | null = frameEl; el = GetParent_unsafe_(el, PNType.RevealSlotAndGotoParent); ) {
      const st = getComputedStyle_(el);
      if (st.overflow !== V) {
        let outer = boundingRect_(el), hx = st.overflowX !== V, hy = st.overflowY !== V,
        scale = el !== docEl && inBody ? dScale_ * bScale_ : dScale_;
        /** Note: since `el` is not safe, `dimSize_(el, *)` may returns `NaN` */
        hx && (l = max_(l, outer.l), r = l + min_(r - l, outer.r - outer.l
              , hy && dimSize_(el as SafeElement, kDim.elClientW) * scale || r))
        hy && (t = max_(t, outer.t), b = t + min_(b - t, outer.b - outer.t
              , hx && dimSize_(el as SafeElement, kDim.elClientH) * scale || b))
      }
    }
    l = max_(l, view.l), t = max_(t, view.t)
    const cropped = l + 7 < r && t + 7 < b ? {
        l: (l - x0) * zoom, t: (t - y0) * zoom, r: (r - x0) * zoom, b: (b - y0) * zoom} : null;
    let hints: Hint[] | null;
    return !cropped || fgCache.e && !(
        filterOutNonReachable(hints = [[frameEl as SafeHTMLElement, {l, t, r, b}, ClickType.frame]]),
        hints.length) ? null : cropped
}

export const tryNestedFrame = (
      cmd: Exclude<FgCmdAcrossFrames, kFgCmd.linkHints>, options: SafeObject, count: number): boolean => {
    if (frameNested_ !== null) {
      prepareCrop_();
      checkNestedFrame();
    }
    if (!frameNested_) { return false; }
    const childApi = detectUsableChild(frameNested_)
    if (childApi) {
      childApi.f(cmd, options, count)
      if (readyState_ > "i") { set_frameNested_(false) }
    } else {
      // It's cross-site, or Vimium C on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      set_frameNested_(null)
    }
    return !!childApi
}

const onKeydown = (event: HandlerNS.Event): HandlerResult => {
    let matchedHint: ReturnType<typeof matchHintsByKey>, i: number = event.i, key: string, keybody: kChar;
    let ret = HandlerResult.Prevent
    if (manager_) {
      set_keydownEvents_(api_.a())
      ret = manager_.n(event)
    } else if (onWaitingKey && !isEscape_(getMappedKey(event, kModeId.Link))) {
      onWaitingKey()
    } else if (!isActive) {
      isEscape_(getMappedKey(event, kModeId.Link)) && clear()
    } else if (isRepeated_(event)) {
      // NOTE: should always prevent repeated keys.
    } else if (i === kKeyCode.ime) {
      hudTip(kTip.exitForIME)
      clear()
      ret = HandlerResult.Nothing
    } else if (key = getMappedKey(event, kModeId.Link), keybody = keybody_(key),
        isEscape_(key) || onTailEnter && keybody === BSP) {
      clear();
    } else if (i === kKeyCode.esc || event.v) {
      ret = HandlerResult.Suppress
    } else if (onTailEnter && keybody !== kChar.f12) {
      onTailEnter(event, key, keybody);
    } else if (keybody > kChar.maxNotF_num && keybody < kChar.minNotF_num && key !== kChar.f1) { // exclude plain <f1>
      i = 0
      if (keybody > kChar.f1 && keybody !== kChar.f2) { ret = HandlerResult.Nothing }
      else if (keybody < kChar.f2) { // <*-f1> or <*-f0***>
        if (key < "b" && useFilter_) { // <a-*-f1>
          locateHint(activeHint_!).l(activeHint_!);
        } else if (key > "s") { // <s-f1> or <s-f0[_a-z0-9]+>
          frameArray.forEach((/*#__NOINLINE__*/ toggleClassForKey).bind(0, keybody))
        }
      } // the below mens <*-f2>
      else if (i = 1, key.includes("-s")) { // <a-s-f2>, <c-s-f2>
        fgCache.e = !fgCache.e;
      } else if (key < "b") { // <a-f2> or <a-c-f2>
        WithDialog ? wantDialogMode_ = !coreHints.d : i = 0
      } else if (key < "d" && key[0] === "m") { // <c-f2> or <m-f2>
        options_.useFilter = fgCache.f = !useFilter_;
      } else if (key !== keybody) { // <s-f2>
        isClickListened_ = !isClickListened_;
      } else if (OnFirefox && isClickListened_ || !vApi.e) {
        i = 0
      } else { // plain <f2>
        isClickListened_ = true;
      }
      resetMode(i as BOOL | undefined)
      i && timeout_(reinit, 0)
    } else if (keybody === kChar.tab && !useFilter_ && !keyStatus_.k) {
      tooHigh_ = null;
      resetMode();
      timeout_(reinit, 0)
    } else if (coreHints.h = 0, i < kKeyCode.maxAcsKeys + 1 && i > kKeyCode.minAcsKeys - 1
          || Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !os_)
            && (i > kKeyCode.maxNotMetaKey && i < kKeyCode.minNotMetaKeyOrMenu || OnFirefox && i === kKeyCode.os_ff_mac)
        ) {
      OnFirefox && (doesAllowModifierEvents_ff = 1)
      key && keybody !== kChar.Modifier || toggleModesOnModifierKey(event, i)
    } else if (keybody === "alt") {
      toggleModesOnModifierKey(event, kKeyCode.altKey)
    } else if (key[0] === (Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !os_) ? "m" : "c")
        && "0-=".includes(key[2]) && !chars_.includes(key[2])) {
      ret = HandlerResult.PassKey
    } else if (i = keyNames_.indexOf(keybody), i > 0) {
      i > 2 && raw_insert_lock || beginScroll(event, key, keybody);
      resetMode();
      ret = i > 2 && raw_insert_lock ? HandlerResult.Suppress : HandlerResult.Prevent
    } else if (keybody === SPC && (!useFilter_ || key !== keybody)) {
      keyStatus_.t = keyStatus_.t.replace("  ", " ");
      if (zIndexes_ !== 0) {
        frameArray.forEach((/*#__NOINLINE__*/ rotateHints).bind(0, key === "s-" + keybody))
      }
      resetMode();
    } else if (matchedHint = /*#__NOINLINE__*/ matchHintsByKey(keyStatus_, event, key, keybody), matchedHint === 0) {
      // then .keyStatus_.hintSequence_ is the last key char
      clear(0, keyStatus_.n ? 0 : fgCache.k[0]);
    } else if (matchedHint !== 2) {
      lastMode_ = mode_;
      callExecuteHint(matchedHint, event)
    }
    return ret;
}

const toggleModesOnModifierKey = (event: HandlerNS.Event, i: kKeyCode, silent?: 1): void => {
  const mode = mode_, mode1 = mode1_
  let num1: number = mode1 > HintMode.min_copying - 1 && mode1 < HintMode.max_copying + 1
      ? i === kKeyCode.ctrlKey || i > kKeyCode.maxNotMetaKey ? (mode1 | HintMode.queue) ^ HintMode.list
        : i === kKeyCode.altKey ? (mode & ~HintMode.list) ^ HintMode.queue
        : mode
      : i === kKeyCode.altKey
      ? mode < HintMode.min_disable_queue
        ? ((mode1 < HintMode.min_job ? HintMode.newTab : HintMode.empty) | mode) ^ HintMode.queue : mode
      : mode1 < HintMode.min_job
      ? (i === kKeyCode.shiftKey) === !options_.swapCtrlAndShift
        ? (mode | HintMode.focused) ^ HintMode.mask_focus_new
        : (mode | HintMode.newTab) ^ HintMode.focused
      : mode
  if (num1 !== mode) {
    setMode(num1, silent)
    num1 = getKeyStat_(event.e);
    (num1 & (num1 - 1)) || (lastMode_ = mode)
  }
}

const toggleClassForKey = (name: string, frame: FrameHintsInfo): void => { toggleClass_s(frame.s.$().b!, "HM-" + name) }

const rotateHints = (reverse: boolean, list: FrameHintsInfo): void => {
  list.s.t(list.h, reverse, !keyStatus_.k && !keyStatus_.t)
}

const callExecuteHint = (hint: ExecutableHintItem, event?: HandlerNS.Event): void => {
  const selectedHintWorker = locateHint(hint),
  clickEl = OnFirefox ? weakRef_ff(hint.d, kElRef.lastClicked) : weakRef_not_ff!(hint.d)
  let i: number, oldMode_ff = -1
  if (OnFirefox && event && (i = getKeyStat_(event.e)) && !doesAllowModifierEvents_ff) {
    oldMode_ff = mode_
    toggleModesOnModifierKey(event, i & KeyStat.PrimaryModifier ? kKeyCode.ctrlKey
        : i & kKeyCode.altKey ? kKeyCode.altKey : kKeyCode.shiftKey, 1)
  }
  const retainedInput = (mode_ & HintMode.queue) && options_.retainInput && keyStatus_ && keyStatus_.t
  const p = selectedHintWorker.e(hint, event)
  p && (onWaitingKey = getTime /** after {@link resetHints} */,
      void p.then((result): void => {
    isActive = 0
    runFallbackKey(options_, mode_ > HintMode.min_job - 1 && 0)
      removeFlash && removeFlash()
      set_removeFlash(null)
      if (!(mode_ & HintMode.queue)) {
        clear(0, 0);
        // always set a timer, so that a next `F` will know there was a recent click (github #638)
        reinitLinkHintsIn(255, selectedHintWorker, clickEl, result)
      }
    if (mode_ & HintMode.queue) {
      reinitLinkHintsIn(frameArray.length > 1 ? 50 : 18, (): void => {
        if (OnFirefox && oldMode_ff >= 0) { setMode(oldMode_ff, 1) }
        reinit(0, selectedHintWorker, clickEl, result, retainedInput)
        isActive && 1 === (--count_) && setMode(mode1_)
      })
    }
  }))
}

export const findAnElement_ = (options: OptionsToFindElement, count: number, alsoBody?: 1
    ): [element: SafeElement | null | undefined, wholeDoc: boolean, indByCount: boolean, sel?: boolean | BOOL ] => {
  const exOpts = options.directOptions || {},
  elIndex = exOpts.index, indByCount = elIndex === "count" || count < 0,
  offset = exOpts.offset || "", wholeDoc = ("" + exOpts.search).startsWith("doc"),
  matchEl = (hints: Hint0[], el1: SafeElement): void => {
    isInteractiveInPage(el1) && hints.push([el1 as SafeElementForMouse])
  },
  computeOffset = (): number => {
    const cur = derefInDoc_(currentScrolling), end = matches!.length
    let low = 0, mid: number | undefined, high = cur ? end - 1 : -1
    while (low <= high) {
      mid = (low + high) >> 1
      const midEl = matches![mid][0]
      if (midEl === cur) { low = mid + <number> <number | boolean> (matchIndex >= 0); break }
      compareDocumentPosition(midEl, cur as Element) & kNode.DOCUMENT_POSITION_FOLLOWING // midEl < cur
      ? low = mid + 1 : high = mid - 1
    }
    return exOpts.loop ? (low + matchIndex) % end : low < -matchIndex ? end : low + matchIndex
  }
  let isSel: boolean | BOOL | undefined
  let matches: (Hint | Hint0)[] | undefined, oneMatch: Hint | Hint0 | undefined, matchIndex: number
  let el: SafeElement | null | false | 0 | undefined
  let d = options.direct! as string | true, defaultMatch = options.match
  defaultMatch = isTY(defaultMatch) && defaultMatch || null
  d = isTY(d) && d ? d : defaultMatch && d === !0 ? "em" : "em,sel,f,h"
  prepareCrop_()
  for (let i of d.split(d.includes(";") ? ";" : ",")) {
    const key = Lower(i.split("=")[0]), testD = "".includes.bind(key), j = i.slice(key.length + 1).trim()
    isSel = 0
    el = testD("em") ? (options.match = <"css-selector" | ""> j || defaultMatch) // element
      && (matches = traverse(kSafeAllSelector, options, matchEl, 1, wholeDoc, 1),
          matchIndex = indByCount ? count < 0 ? count : count - 1 : +elIndex! || 0,
          oneMatch = matches.slice(offset > "e" ? ~matchIndex : offset < "c" ? matchIndex : computeOffset())[0])
      && oneMatch[0]
      : testD("el") // selected
        ? isSelARange(getSelection_()) && (el = getSelectionFocusEdge_(getSelected()), isSel = !!el, el)
      : testD("sc") || testD("ac") ? derefInDoc_(currentScrolling) // currentScrollable / DOMActivate
      : testD("la") || testD("ec")
        ? /* last-focused / recently-focused */ derefInDoc_(insert_last_) || derefInDoc_(insert_last2_)
      : testD("f") ? /* focused */ insert_Lock_() || (OnFirefox ? <SafeElement | null> deepActiveEl_unsafe_(alsoBody)
            : SafeEl_not_ff_!(deepActiveEl_unsafe_(alsoBody)))
      : (testD("h") || testD("cl")) ? derefInDoc_(lastHovered_) // hovered | clicked
      : testD("b") ? /* body */ OnFirefox ? <SafeElement | null> (doc.body || docEl_unsafe_())
          : SafeEl_not_ff_!(doc.body || docEl_unsafe_())
      : null
    if (!testD("em")) {
      if (el && j) {
        const el2 = OnFirefox ? safeCall(querySelector_unsafe_, j, el) as (SafeElement | null | undefined)
            : SafeEl_not_ff_!(safeCall(querySelector_unsafe_, j, el))
        el = el2 === null && !(OnChrome && Build.MinCVer < BrowserVer.Min$Element$$closest
            && chromeVer_ < BrowserVer.Min$Element$$closest) ? OnFirefox ? el.closest!(j) as SafeElement | null
            : SafeEl_not_ff_!(el.closest!(j)) : el2
      }
      el = el && isNotInViewport(el) < (wholeDoc ? kInvisibility.OutOfView + 1 : kInvisibility.Visible + 1)
        && excludeHints([[el as SafeElementForMouse]], options, 1).length > 0 ? el : null
    }
    if (el) { break }
  }
  return [el as SafeElement | null | undefined, wholeDoc, indByCount, isSel]
}

const activateDirectly = (options: ContentOptions, count: number): void => {
  const mode = options.m,
  next = (): void => {
    if (count < 1) { clear(); return }
    count = IsAInB_(el!) ? (coreHints.e({d: el as LinkEl, r: null, m: null}, 0
        , res[3] && getSelectionBoundingBox_()), count - 1) : 0
    count || runFallbackKey(options_, mode > HintMode.min_job - 1 && 0)
    timeout_(next, count > 99 ? 1 : count && 17)
  },
  res = findAnElement_(options, count), rawEl = res[0],
  el = mode < HintMode.min_job || rawEl && htmlTag_(rawEl) ? rawEl : null
  clear()
  if (!el || !IsAInB_(el)) {
    runFallbackKey(options, kTip.noTargets)
  } else {
    count = mode < HintMode.min_job && !res[2] ? count : 1
    api_ = vApi
    options_ = options
    setMode(mode, count_ = isActive = 1)
    res[1] && view_(el)
    next()
  }
}

const locateHint = (matchedHint: ExecutableHintItem): BaseHintWorker => {
    /** safer; necessary since {@link #highlightChild} calls {@link #detectUsableChild} */
  let i = frameArray.length
  while (0 < --i) {
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES$Array$$Includes
        ? frameArray[i].h.indexOf(matchedHint as HintItem) >= 0 : frameArray[i].h.includes(matchedHint as HintItem)) {
      break
    }
  }
  return frameArray[i].s
}

const highlightHint = (hint: HintItem): void => {
  flash_(hint.m, null, 660, " Sel")
  toggleClass_s(box_!, "HMM")
}

export const resetMode = (silent?: BOOL): void => {
    if (lastMode_ !== mode_ && mode_ < HintMode.min_disable_queue) {
      let d = keydownEvents_;
      if (d[kKeyCode.ctrlKey] || d[kKeyCode.metaKey /** aka .osLeft */] || d[kKeyCode.shiftKey] || d[kKeyCode.altKey]
          || Build.OS & kBOS.MAC && !OnFirefox && d[kKeyCode.osRight_mac /** aka .menuKey */]
          || Build.OS !== kBOS.MAC as number && (OnChrome || OnEdge) && d[kKeyCode.osRight_not_mac]
          || OnFirefox && Build.OS & kBOS.MAC && d[kKeyCode.os_ff_mac]) {
        setMode(lastMode_, silent);
      }
    }
}

const delayToExecute = (officer: BaseHintWorker, hint: ExecutableHintItem, flashEl: SafeHTMLElement | null): void => {
    const waitEnter = OnChrome && fgCache.w,
    callback = (event?: HandlerNS.Event, key?: string, keybody?: kChar): void => {
      let closed: void | 1 | 2
      try {
        closed = officer.x(1);
      } catch {}
      if (closed !== 2) {
        hudTip(kTip.linkRemoved)
        isActive && clear()
      } else if (event) {
        tick = waitEnter && keybody === SPC ? tick + 1 : 0;
        tick === 3 || keybody === ENTER ? callExecuteHint(hint, event)
        : key === kChar.f1 && flashEl ? toggleClass_s(flashEl, "Sel") : 0;
      } else {
        callExecuteHint(hint);
      }
    };
    let tick = 0;
    onTailEnter = callback;
    removeBox()
    OnFirefox && (officer = unwrap_ff(officer));
    if (OnChrome && !waitEnter) {
      onWaitingKey = suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents, onTailEnter as typeof callback)
    } else {
      setMode(mode_)
    }
}

/** reinit: should only be called on manager */
const reinit = (auto?: BOOL | TimerType.fake, officer?: BaseHintWorker | null
    , lastEl?: WeakRef<LinkEl> | null, rect?: Rect | null, retainedInput?: string | false | 0 | null): void => {
  const now = getTime()
  if (!isEnabled_) { clear() }
  else {
    isActive = 0;
    coreHints.v()
    contentCommands_[kFgCmd.linkHints](options_, 0);
    if (!isActive) { return }
    coreHints.h = now
    retainedInput && useFilter_ && getMatchingHints(keyStatus_, retainedInput, "", 3)
    if (officer && mode1_ < HintMode.min_job) {
      reinitLinkHintsIn(frameArray.length > 1 ? 380 : 255, officer, lastEl!, rect!, now)
    }
    onWaitingKey = auto ? suppressTail_(GlobalConsts.TimeOfSuppressingUnexpectedKeydownEvents
        , /*#__NOINLINE__*/ resetOnWaitKey) : onWaitingKey
  }
}

const resetOnWaitKey = (): void => { onWaitingKey = null }

/** should only be called on manager */
export const reinitLinkHintsIn = ((timeout: number, officer?: BaseHintWorker | null | undefined | (() => void)
    , el?: WeakRef<LinkEl>, r?: Rect | null, start?: number): void => {
  const now = getTime()
  _reinitTime = max_(now, (start || now) + timeout, _reinitTime)
  clearTimeout_(_timer)
  _timer = timeout_(isTY(officer, kTY.func) ? officer : (): void => {
    _timer = _reinitTime = TimerID.None
    let doesReinit: BOOL | boolean | void | undefined
    try { // can not use safeCall, in case `unwrap_ff(officer).x` throws
      doesReinit = (OnFirefox ? officer ? unwrap_ff(officer) : coreHints : officer || coreHints).x(el!, r,
          isActive && coreHints.h && hints_ && hints_.length < (frameArray.length > 1 ? 200 : 99))
    } catch {}
    doesReinit && reinit(1)
  }, OnChrome ? Math.max(_reinitTime - now, GlobalConsts.MinCancelableInBackupTimer) : _reinitTime - now)
}) as {
  (timeout: 380 | 255
    , officer: BaseHintWorker | null | undefined, el: WeakRef<LinkEl>, r: Rect | null, startTimestamp?: number): void
  (timeout: number, doReinit?: (this: void) => void): void
}

// if not el, then reinit if only no key stroke and hints.length < 64
const checkLast = ((el?: WeakRef<LinkEl> | LinkEl | 1 | null, r?: Rect | null
    , hasJustReinited?: boolean | BOOL | null): BOOL | 2 => {
  const hasEl = el
  let r2: Rect | null | undefined, hidden: boolean
  if (!isAlive_) { return 0 }
  else if (window.closed) { return 1 }
  else if (el === 1) { return 2 }
  else {
    r2 = hasEl && (el = derefInDoc_(el as WeakRef<LinkEl>)) ? boundingRect_(el) : null
    hidden = !r2 || (r2.r - r2.l) * (r2.b - r2.t) < 4 || !isStyleVisible_(el as LinkEl)
    if (hidden && el === deref_(lastHovered_)) {
      void hover_async()
    }
    if ((!r2 || r) && hasJustReinited && (hidden || abs_(r2!.l - r!.l) > 100 || abs_(r2!.t - r!.t) > 60)) {
      return !hasEl || doesWantToReloadLinkHints("cl") ? 1 : 0
    } else {
      return 0
    }
  }
}) as BaseHintWorker["x"]

const resetHints: HintManager["v"] = (): void => {
    // here should not consider about .manager_
    onWaitingKey = onTailEnter = hints_ = null as never;
    if (!Build.NDEBUG) { coreHints.hints_ = null }
    /*#__INLINE__*/ hintFilterReset();
    keyStatus_ && (keyStatus_.c = null as never);
    keyStatus_ = {
      c: null as never,
      k: "", t: "",
      n: 0, b: 0
    };
    if (!Build.NDEBUG) { coreHints.keyStatus_ = keyStatus_ }
    for (const frame of frameArray) {
      frame.h = [];
    }
}

export const clear = (onlySelfOrEvent?: 0 | 1 | Event, suppressTimeout?: number): void => {
    if (!isAlive_) { return; }
    if (onlySelfOrEvent === 1 || onlySelfOrEvent
        && (OnChrome && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted
            ? onlySelfOrEvent.isTrusted !== !1 : onlySelfOrEvent.isTrusted)
        && onlySelfOrEvent.target === doc) {
      coreHints.p && manager_!.u(coreHints);
      manager_ = null
      if (onlySelfOrEvent !== 1) {
        return;
      }
    }
    const manager = coreHints.p as HintManager | null, oldMode = isActive ? mode1_ : HintMode.max_mouse_events + 1
    clearTimeout_(_timer)
    isActive = _timer = _reinitTime = 0
    OnFirefox && (doesAllowModifierEvents_ff = 0)
    manager_ = coreHints.p = null;
    manager && manager.c(onlySelfOrEvent, suppressTimeout);
    frameArray.forEach(safeCall.bind<void, (ori_arg: FrameHintsInfo) => void, [arg1: FrameHintsInfo], void>(0,
        (frameInfo: FrameHintsInfo): void => {
      let frame = frameInfo.s, hasManager = frame.p
      frame.p = null
      hasManager && frame.c(0, suppressTimeout)
    }))
    coreHints.y = frameArray = [];
    manager && setupEventListener(0, PGH, clear, 1)
    coreHints.v()
    removeHandler_(kHandler.linkHints)
    suppressTimeout != null && suppressTail_(suppressTimeout);
    removeFlash && removeFlash();
    set_onWndBlur2(set_removeFlash(isHC_ = (api_ as unknown) = (options_ as unknown) = null))
    set_maxPrefixLen_(lastMode_ = mode_ = mode1_ = count_ = coreHints.h =
        noHUD_ = forHover_ = tooHigh_ = /*#__INLINE__*/ localLinkClear())
    if (WithDialog) { coreHints.d = 0 }
    set_grabBackFocus(useFilter_ = false)
    chars_ = "";
    removeBox()
    hud_tipTimer || hudHide()
    OnFirefox || oldMode < HintMode.max_mouse_events + 1 && !manager
        && reinitLinkHintsIn(1000) // just a flag to test on re-activate
}

const removeBox = (): void => {
    if (box_) {
      removeEl_s(box_)
      box_ = null
    }
    removeModal()
}

const onFrameUnload = (officer: HintOfficer): void => {
    const frames = frameArray, len = frames.length;
    const wrappedOfficer_ff = OnFirefox ? unwrap_ff(officer) : 0 as never as null
    let i = 0, offset = 0;
    while (i < len && frames[i].s !== (OnFirefox ? wrappedOfficer_ff! : officer)) {
      offset += frames[i++].h.length;
    }
    if (i >= len || !isActive || _timer) { return; }
    const deleteCount = frames[i].h.length
    deleteCount && (hints_ as HintItem[]).splice(offset, deleteCount) // remove `readonly` on purpose
    frames.splice(i, 1);
    if (!deleteCount) { return; }
    onWaitingKey = onTailEnter ? onWaitingKey
        : suppressTail_(GlobalConsts.TimeOfSuppressingUnexpectedKeydownEvents, /*#__NOINLINE__*/ resetOnWaitKey)
    set_zIndexes_(null)
    keyStatus_.c = hints_!
    keyStatus_.n = keyStatus_.b = 0
    if (!hints_!.length) {
      hudTip(kTip.frameUnloaded)
      clear()
    } else if (useFilter_) {
      getMatchingHints(keyStatus_, "", "", 1)
    } else {
      hints_!.forEach(hint => { hint.m.innerText = "" })
      initAlphabetEngine(hints_!)
      renderMarkers(hints_!)
    }
}

export const detectUsableChild = (el: AccessableIFrameElement): VApiTy | null => {
  let err: boolean | null = true, childApi: VApiTy | null | void | undefined
  try {
    err = !el.contentDocument
      || !(childApi = OnFirefox ? getWndVApi_ff!(el.contentWindow) : el.contentWindow.VApi)
      || childApi.a(keydownEvents_);
  } catch (e) {
    if (!Build.NDEBUG) {
      let notDocError = true;
      if (OnChrome && chromeVer_ < BrowserVer.Min$ContentDocument$NotThrow) {
        try {
          notDocError = el.contentDocument !== void 0
        } catch { notDocError = false; }
      }
      if (notDocError) {
        console.log("Assert error: Child frame check breaks:", e);
      }
    }
  }
  return err ? null : childApi || null;
}

export const doesWantToReloadLinkHints = (reason: NonNullable<ContentOptions["autoReload"]>): boolean => {
  let conf = options_.autoReload, accept = !isTY(conf) || conf === "all" || Lower(conf).includes(reason)
  let scheduling: Navigator["scheduling"] | undefined
  if (OnChrome) {
    accept = Build.MinCVer >= BrowserVer.MinEnsuredNavigator$scheduling$$isInputPending
        ? accept && !navigator.scheduling!.isInputPending()
        : accept && !((Build.MinCVer >= BrowserVer.MinMaybeUsableNavigator$scheduling$$isInputPending
              || chromeVer_ > BrowserVer.MinMaybeUsableNavigator$scheduling$$isInputPending - 1)
            && (scheduling = navigator.scheduling) && scheduling.isInputPending({includeContinuous: true}))
  }
  return accept
}

const coreHints: HintManager = {
  $: (doesResetMode?: 1): HintStatus => {
    return { a: isActive, b: box_, k: keyStatus_, m: doesResetMode ? mode_ = HintMode.DEFAULT : mode_ }
  },
  d: 0, h: 0, y: [],
  x: checkLast, c: clear, o: collectFrameHints, j: delayToExecute, e: executeHintInOfficer, g: getPreciseChildRect,
  l: highlightHint, r: render, t: rotate1,
  p: null,
  n: onKeydown, s: resetMode, i: reinit, v: resetHints, u: onFrameUnload
}
if (!Build.NDEBUG) { coreHints.hints_ = coreHints.keyStatus_ = null }

export { HintManager, coreHints }

if (!(Build.NDEBUG || HintMode.min_not_hint <= <number> kTip.START_FOR_OTHERS)) {
  console.log("Assert error: HintMode.min_not_hint <= kTip.START_FOR_OTHERS");
}
if (!(Build.NDEBUG || BrowserVer.Min$Array$$find$$findIndex <= BrowserVer.MinEnsuredES$Array$$Includes)) {
  console.log("Assert error: BrowserVer.Min$Array$$find$$findIndex <= BrowserVer.MinEnsuredES$Array$$Includes")
}
