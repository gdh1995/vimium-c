interface ContentOptions extends HintsNS.Options, SafeObject {}
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
export interface InputHintItem extends DrawableHintItem { d: LockableElement }

export interface KeyStatus {
    /** curHints */ c: readonly HintItem[];
    /** keySequence */ k: string;
    /** textSequence */ t: string;
    /** known */ n: BOOL;
    /** tab */ b: number;
}
interface HintStatus extends HintsNS.BaseHintStatus {
  /** keyStatus */ k: Readonly<KeyStatus>
  /** is newly activated */ n: boolean | BOOL | null
}
interface BaseHintWorker extends HintsNS.BaseHintWorker {
  /** get stat */ $ (): Readonly<HintStatus>
  /** clear */ c: typeof clear
  /** dialogMode */ d: BOOL
  /** executeHint */ e: typeof executeHintInOfficer
  /** getPreciseChildRect */ g: typeof getPreciseChildRect
  /** has just started */ h: number
  /** delayToExecute */ j: typeof delayToExecute
  /** highlightHint */ l: typeof highlightHint
  /** collectFrameHints */ o: typeof collectFrameHints
  /** manager */ p: HintManager | null
  /** render */ r (hints: readonly HintItem[], arr: ViewBox, raw_apis: VApiTy): void
  /** rotate1 */ t: typeof rotate1
  /** checkLast_ */ x: {
    (el?: WeakRef<LinkEl> | TimerType.fake, r?: Rect | 0): void | BOOL
    (el: 1, r?: undefined): void | 1 | 2
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
export type AddChildDirectly = (officer: BaseHintWorker, el: KnownIFrameElement, rect: Rect | null) => boolean

import {
  VTr, isAlive_, isEnabled_, setupEventListener, keydownEvents_, set_keydownEvents_, timeout_, max_, min_, math, OnEdge,
  clearTimeout_, fgCache, doc, readyState_, chromeVer_, vApi, deref_, getTime, weakRef_, unwrap_ff, OnFirefox, OnChrome,
  WithDialog, Lower, safeCall, loc_, os_
} from "../lib/utils"
import {
  querySelector_unsafe_, isHTML_, scrollingEl_, docEl_unsafe_, IsInDOM_, GetParent_unsafe_, hasInCSSFilter_,
  getComputedStyle_, isStyleVisible_, htmlTag_, fullscreenEl_unsafe_, removeEl_s, UNL, toggleClass_s, doesSupportDialog,
  getSelectionFocusEdge_, SafeEl_not_ff_, rangeCount_, compareDocumentPosition, deepActiveEl_unsafe_
} from "../lib/dom_utils"
import {
  ViewBox, getViewBox_, prepareCrop_, wndSize_, bZoom_, wdZoom_, dScale_, padClientRect_, getBoundingClientRect_,
  docZoom_, bScale_, dimSize_, isSelARange, getSelectionBoundingBox_, view_,
} from "../lib/rect"
import {
  replaceOrSuppressMost_, removeHandler_, getMappedKey, keybody_, isEscape_, getKeyStat_, keyNames_, suppressTail_,
  BSP, ENTER, SPC,
} from "../lib/keyboard_utils"
import {
  style_ui, addElementList, ensureBorder, adjustUI, flash_, getParentVApi, getWndVApi_ff, checkHidden, removeModal,
  getSelected
} from "./dom_ui"
import { scrollTick, beginScroll, currentScrolling } from "./scroller"
import { hudTip, hudShow, hudHide, hud_tipTimer } from "./hud"
import { set_onWndBlur2, insert_Lock_ } from "./insert"
import {
  getVisibleElements, localLinkClear, frameNested_, checkNestedFrame, set_frameNested_, filterOutNonReachable, traverse,
  getIfOnlyVisible, ClickType
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
let forHover_ = false
let count_ = 0
let lastMode_: HintMode = 0
let tooHigh_: null | boolean = false
let isClickListened_ = true
let chars_ = ""
let useFilter_ = false
let keyStatus_: KeyStatus = null as never
  /** must be called from a manager, required by {@link #delayToExecute_ } */
let onTailEnter: ((this: unknown, event: HandlerNS.Event, key: string, keybody: kChar) => void) | null | undefined
let onWaitingKey: HandlerNS.VoidHandler<HandlerResult> | null | undefined
let isActive: BOOL = 0
let noHUD_ = false
let options_: ContentOptions = null as never
let _timer: ValidTimeoutID = TimerID.None
let kSafeAllSelector = OnFirefox ? "*" as const : ":not(form)" as const
let manager_: HintManager | null = null
let api_: VApiTy = null as never
let addChildFrame_: AddChildDirectly | null | undefined
let isHC_: boolean | null | undefined

export {
  isActive as isHintsActive, box_ as hint_box, wantDialogMode_,
  hints_ as allHints, keyStatus_ as hintKeyStatus, useFilter_, frameArray, chars_ as hintChars,
  mode_ as hintMode_, mode1_, options_ as hintOptions, count_ as hintCount_,
  forHover_, isClickListened_, tooHigh_, kSafeAllSelector, addChildFrame_,
  api_ as hintApi, manager_ as hintManager, isHC_
}
export function set_kSafeAllSelector (_newKSafeAll: string): void { kSafeAllSelector = _newKSafeAll as any }
export function set_isClickListened_ (_newIsClickListened: boolean): void { isClickListened_ = _newIsClickListened }
export function set_addChildFrame_<T extends typeof addChildFrame_> (_newACF: T): void { addChildFrame_ = _newACF }

export const activate = (options: ContentOptions, count: number, force?: 2 | TimerType.fake): void => {
    if (isActive && force !== 2 || !isEnabled_) { return; }
    if (checkHidden(kFgCmd.linkHints, options, count)) {
      return clear(1)
    }
    if (options.direct && !isActive) {
      return activateDirectly(options, count)
    }
    if (doc.body === null) {
      manager_ || clear()
      if (!_timer && readyState_ > "l") {
        _timer = timeout_(contentCommands_[kFgCmd.linkHints].bind(0 as never, options, count, 0), 300)
        return replaceOrSuppressMost_(kHandler.linkHints)
      }
    }
    const parApi = !fullscreenEl_unsafe_() && getParentVApi()
    if (parApi) {
      parApi.l(style_ui)
      // recursively go up and use the topest frame in a same origin
      return parApi.f(kFgCmd.linkHints, options, count, 2)
    }
    const useFilter0 = options.useFilter, useFilter = useFilter0 != null ? !!useFilter0 : fgCache.f,
    topFrameInfo: FrameHintsInfo = {h: [], v: null as never, s: coreHints},
    toCleanArray: HintOfficer[] = [],
    s0 = options.c, chars = s0 ? s0 + "" : useFilter ? fgCache.n : fgCache.c;
    frameArray = [topFrameInfo]
    if (chars.length < GlobalConsts.MinHintCharSetSize) {
      hudTip(kTip.fewChars, 1000)
      return clear()
    }
    isHC_ = matchMedia(VTr(
        OnChrome && Build.MinCVer < BrowserVer.MinForcedColorsMode && chromeVer_ < BrowserVer.MinForcedColorsMode
        ? kTip.highContrast_WOB : kTip.forcedColors)).matches
    if (WithDialog) {
      if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredShadowDOMV1
          || BrowserVer.MinEnsuredHTMLDialogElement < BrowserVer.MinShadowDOMV0
              && OnChrome && Build.MinCVer < BrowserVer.MinShadowDOMV0) {
        removeModal()
      }
      coreHints.d = <BOOL> +(
        (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement || doesSupportDialog())
        && (wantDialogMode_ != null ? wantDialogMode_ : hasInCSSFilter_() || !!querySelector_unsafe_("dialog[open]"))
        )
    }
    let allHints: readonly HintItem[], child: ChildFrame | undefined, insertPos = 0
      , frameInfo: FrameHintsInfo, total: number
    {
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
        hudTip(total ? kTip.tooManyLinks : mode_ < HintMode.min_job && !options.match ? kTip.noLinks : kTip.noTargets)
        return clear()
      }
      hints_ = keyStatus_.c = allHints
      if (!Build.NDEBUG) { coreHints.hints_ = allHints }
    }
    noHUD_ = !(useFilter || topFrameInfo.v[3] > 40 && topFrameInfo.v[2] > 320) || !!(options.hideHUD || options.hideHud)
    useFilter ? /*#__NOINLINE__*/ initFilterEngine(allHints as readonly FilteredHintItem[])
        : initAlphabetEngine(allHints)
    renderMarkers(allHints)
    coreHints.h = 1
    for (const frame of frameArray) {
      frame.s.r(frame.h, frame.v, vApi);
    }
}

const collectFrameHints = (options: ContentOptions, count: number
      , chars: string, useFilter: boolean, outerView: Rect | null
      , manager: HintManager | null, frameInfo: FrameHintsInfo
      , newAddChildFrame: AddChildDirectly): void => {
    (coreHints as BaseHintWorker).p = manager_ = OnFirefox ? manager && unwrap_ff(manager) : manager
    resetHints();
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
    const view: ViewBox = getViewBox_(OnEdge ? 1 : ((manager || coreHints).d + 1) as 1 | 2)
    prepareCrop_(1, outerView);
    if (tooHigh_ !== null) {
      const scrolling = scrollingEl_(1)
      tooHigh_ = !!scrolling
          && dimSize_(scrolling, kDim.scrollH) / wndSize_() > GlobalConsts.LinkHintTooHighThreshold
    }
    removeModal()
    addChildFrame_ = newAddChildFrame
    const elements = /*#__NOINLINE__*/ getVisibleElements(view)
    const hintItems = elements.map(createHint);
    addChildFrame_ = null
    bZoom_ !== 1 && /*#__NOINLINE__*/ adjustMarkers(hintItems, elements);
    for (let i = useFilter_ ? hintItems.length : 0; 0 <= --i; ) {
      hintItems[i].h = generateHintText(elements[i], i, hintItems)
    }
    frameInfo.h = hintItems;
    frameInfo.v = view;
}

const render: BaseHintWorker["r"] = (hints, arr, raw_apis): void => {
    const managerOrA = manager_ || coreHints;
    let body = doc.body
    if (manager_ && (body && htmlTag_(body) && body.isContentEditable || loc_.href.startsWith("about"))) {
      hookOnWnd(HookAction.Install)
    }
    removeBox()
    api_ = OnFirefox && manager_ ? unwrap_ff(raw_apis) : raw_apis
    ensureBorder(wdZoom_ / dScale_);
    manager_ || setMode(mode_)
    if (hints.length) {
      if (WithDialog) {
        box_ = addElementList(hints, arr, managerOrA.d || coreHints.d)
      } else {
        box_ = addElementList(hints, arr);
      }
    } else if (!manager_) {
      adjustUI();
    }
    set_keydownEvents_((OnFirefox ? api_ : raw_apis).a())
    set_onWndBlur2(managerOrA.s)
    replaceOrSuppressMost_(kHandler.linkHints, coreHints.n)
    manager_ && setupEventListener(0, UNL, clear);
    isActive = 1;
}

/** must be called from the manager context, or be used to sync mode from the manager */
export const setMode = (mode: HintMode, silent?: BOOL): void => {
    mode_ - mode ? lastMode_ = mode_ = mode : 0
    mode1_ = mode & ~HintMode.queue;
    forHover_ = mode1_ > HintMode.min_hovering - 1 && mode1_ < HintMode.max_hovering + 1;
    if (silent || noHUD_ || hud_tipTimer) { return }
    let key: string | undefined
    let msg = onTailEnter && !onWaitingKey ? VTr(kTip.waitForEnter) : VTr(mode_)
        + (useFilter_ || isHC_ ? ` [${key = isHC_ ? keyStatus_.k + keyStatus_.t : keyStatus_.t}]` : "")
        + (WithDialog && !((useFilter_ || isHC_) && key) && (manager_ || coreHints).d ? VTr(kTip.modalHints) : "")
    hudShow(kTip.raw, msg, true)
}

const getPreciseChildRect = (frameEl: KnownIFrameElement, view: Rect): Rect | null => {
    const V = "visible",
    brect = padClientRect_(getBoundingClientRect_(frameEl)),
    docEl = docEl_unsafe_(), body = doc.body, inBody = !!body && IsInDOM_(frameEl as SafeHTMLElement, body, 1),
    zoom = (OnChrome ? docZoom_ * (inBody ? bZoom_ : 1) : 1) / dScale_ / (inBody ? bScale_ : 1);
    let x0 = min_(view.l, brect.l), y0 = min_(view.t, brect.t), l = x0, t = y0, r = view.r, b = view.b
    for (let el: Element | null = frameEl; el = GetParent_unsafe_(el, PNType.RevealSlotAndGotoParent); ) {
      const st = getComputedStyle_(el);
      if (st.overflow !== V) {
        let outer = padClientRect_(getBoundingClientRect_(el)), hx = st.overflowX !== V, hy = st.overflowY !== V,
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
    let childApi: VApiTy | null
    if (frameNested_ !== null) {
      prepareCrop_();
      checkNestedFrame();
    }
    if (!frameNested_) { return false; }
    childApi = detectUsableChild(frameNested_);
    if (childApi) {
      childApi.f(cmd, options, count)
      if (readyState_ > "i") { set_frameNested_(false) }
    } else {
      // It's cross-site, or Vimium C on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      set_frameNested_(null)
    }
    return !!childApi;
}

const onKeydown = (event: HandlerNS.Event): HandlerResult => {
    let matchedHint: ReturnType<typeof matchHintsByKey>, i: number = event.i, key: string, keybody: kChar;
    let ret = HandlerResult.Prevent, num1: number | undefined, mode = mode_, mode1 = mode1_
    if (manager_) {
      set_keydownEvents_(api_.a())
      ret = manager_.n(event)
    } else if (onWaitingKey && !isEscape_(getMappedKey(event, kModeId.Link))) {
      onWaitingKey()
    } else if (event.e.repeat || !isActive) {
      // NOTE: should always prevent repeated keys.
    } else if (i === kKeyCode.ime) {
      hudTip(kTip.exitForIME)
      clear()
      ret = HandlerResult.Nothing
    } else if (key = getMappedKey(event, kModeId.Link), keybody = keybody_(key),
        isEscape_(key) || onTailEnter && keybody === BSP) {
      clear();
    } else if (i === kKeyCode.esc && isEscape_(keybody)) {
      ret = HandlerResult.Suppress
    } else if (onTailEnter && keybody !== kChar.f12) {
      onTailEnter(event, key, keybody);
    } else if (keybody > kChar.maxNotF_num && keybody < kChar.minNotF_num && key !== kChar.f1) { // exclude plain <f1>
      if (keybody > kChar.f1 && keybody !== kChar.f2) { ret = HandlerResult.Nothing }
      else if (keybody < kChar.f2) {
        if (key < "b" && useFilter_) {
          locateHint(activeHint_!).l(activeHint_!);
        } else if (key > "s") {
          // `/^s-(f1|f0[a-z0-9]+)$/`
          frameArray.forEach((/*#__NOINLINE__*/ toggleClassForKey).bind(0, keybody))
        }
      } // the below mens f2, f0***
      else if (num1 = 1, key.includes("-s")) {
        fgCache.e = !fgCache.e;
      } else if (key < "b") { // a-
        WithDialog ? wantDialogMode_ = !wantDialogMode_ : num1 = 0
      } else if ("cm".includes(key[0])) {
        options_.useFilter = fgCache.f = !useFilter_;
      } else if (key !== keybody) { // <s-f2>
        isClickListened_ = !isClickListened_;
      } else if (OnFirefox && isClickListened_ || !vApi.e) {
        num1 = 0
      } else {
        isClickListened_ = true;
        if (!OnFirefox) {
          vApi.e(kContentCmd.ManuallyFindAllOnClick);
        }
      }
      resetMode(num1 as BOOL | undefined)
      num1 && timeout_(reinit, 0)
    } else if ((i < kKeyCode.maxAcsKeys + 1 && i > kKeyCode.minAcsKeys - 1
            || !os_ && (i > kKeyCode.maxNotMetaKey && i < kKeyCode.minNotMetaKeyOrMenu))
        && !key) {
      num1 = mode1 > HintMode.min_copying - 1 && mode1 < HintMode.max_copying + 1
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
        : mode;
      if (num1 !== mode) {
        setMode(num1);
        i = getKeyStat_(event.e);
        (i & (i - 1)) || (lastMode_ = mode);
      }
    } else if (i = keyNames_.indexOf(keybody), i > 0) {
      i > 2 && insert_Lock_ || beginScroll(event, key, keybody);
      resetMode();
      ret = i > 2 && insert_Lock_ ? HandlerResult.Suppress : HandlerResult.Prevent
    } else if (keybody === kChar.tab && !useFilter_ && !keyStatus_.k) {
      tooHigh_ = null;
      resetMode();
      timeout_(reinit, 0)
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

const toggleClassForKey = (name: string, frame: FrameHintsInfo): void => { toggleClass_s(frame.s.$().b!, "HM-" + name) }

const rotateHints = (reverse: boolean, list: FrameHintsInfo): void => {
  list.s.t(list.h, reverse, !keyStatus_.k && !keyStatus_.t)
}

const callExecuteHint = (hint: ExecutableHintItem, event?: HandlerNS.Event): void => {
  const selectedHintWorker = locateHint(hint), clickEl = weakRef_(hint.d),
  p = selectedHintWorker.e(hint, event)
  p && p.then(result => timeout_((): void => {
    (<RegExpOne> /a?/).test("")
    removeFlash && removeFlash()
    set_removeFlash(null)
    runFallbackKey(options_, false)
    if (!(mode_ & HintMode.queue)) {
      setupCheck(selectedHintWorker, clickEl, result)
      clear(0, 0)
    } else {
      clearTimeout_(_timer)
      timeout_((): void => {
        reinit(0, selectedHintWorker, clickEl, result)
        if (isActive && 1 === (--count_)) {
          setMode(mode1_)
        }
      }, frameArray.length > 1 ? 50 : 18)
    }
  }, isActive = 0))
}

const activateDirectly = (options: ContentOptions, count: number): void => {
  const d = options.direct! as string, exOpts = options.directOptions || {},
  _ei = exOpts.index, elIndex = _ei != null ? _ei : options.index,
  offset = exOpts.offset || "", wholeDoc = ("" + exOpts.search).startsWith("doc"),
  allTypes = (d as typeof options.direct) === !0, mode = options.m &= ~HintMode.queue,
  next = (): void => {
    let rect: ClientRect | 0, sel: Selection
    if (count < 1) { clear(); return }
    count = IsInDOM_(el!) ? (coreHints.e({d: el as LinkEl, r: null, m: null}, 0
      , isSel && (sel = getSelected(), rect = rangeCount_(sel) && getSelectionBoundingBox_(sel),
                  rect && padClientRect_(rect))
    ), count - 1) : 0
    count || runFallbackKey(options_, false)
    timeout_(next, count > 99 ? 1 : count && 17)
  },
  computeOffset = (): number => {
    const cur = deref_(currentScrolling)
    let low = 0, mid: number | undefined,
    high = cur && IsInDOM_(cur) ? matches!.length - 1 : -1
    while (low <= high) {
      mid = (low + high) >> 1
      const midEl = matches![mid][0]
      if (midEl === cur) { low = mid + <number> <number | boolean> (matchIndex >= 0); break }
      compareDocumentPosition(midEl, cur as Element) & kNode.DOCUMENT_POSITION_FOLLOWING // midEl < cur
      ? low = mid + 1 : high = mid - 1
    }
    return low < -matchIndex ? matches!.length : low + matchIndex
  }, testD = offset.includes.bind(d + "")
  let isSel: boolean | undefined
  let matches: (Hint | Hint0)[] | undefined, oneMatch: Hint | Hint0 | undefined, matchIndex: number
  let el: SafeElement | null | undefined
  el = (prepareCrop_(), allTypes || testD("elem")) && options.match // element
      && (matches = traverse(kSafeAllSelector, options, wholeDoc ? (hints: Hint0[], el1: SafeElement): void => {
                isInteractiveInPage(el1) && hints.push([el1 as SafeElementForMouse])
              } : getIfOnlyVisible, 1, wholeDoc),
          oneMatch = matches.slice((matchIndex = elIndex === "count" ? count < 0 ? count : count - 1 : +elIndex! || 0,
              offset > "e" ? ~matchIndex : offset < "c" ? matchIndex : computeOffset()))[0])
      ? oneMatch[0]
      : (allTypes || testD("sel")) // selected
          && isSelARange(getSelection()) && (el = getSelectionFocusEdge_(getSelected()), isSel = !!el, el)
      || (allTypes || testD("f")) // focused
          && (insert_Lock_()
              || (OnFirefox ? <SafeElement | null> deepActiveEl_unsafe_() : SafeEl_not_ff_!(deepActiveEl_unsafe_())))
      || (allTypes || testD("h") || testD("cl")) && deref_(lastHovered_) // hover | clicked
      || (!allTypes && (testD("s") || testD("a")) ? deref_(currentScrolling) // currentScrollable / DOMActivate
        : null)
  el = mode < HintMode.min_job || el && htmlTag_(el) ? el : null
  if (!el || !IsInDOM_(el)) {
    runFallbackKey(options, kTip.noTargets)
  } else {
    count = mode < HintMode.min_job ? min_(count, 3e3) : 1
    api_ = vApi
    options_ = options
    setMode(mode, count_ = isActive = 1)
    wholeDoc && view_(el)
    next()
  }
}

const locateHint = (matchedHint: ExecutableHintItem): BaseHintWorker => {
    /** safer; necessary since {@link #highlightChild} calls {@link #detectUsableChild} */
  let i = frameArray.length
  while (0 < --i) {
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
        ? frameArray[i].h.indexOf(matchedHint as HintItem) >= 0 : frameArray[i].h.includes!(matchedHint as HintItem)) {
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
      if (d[kKeyCode.ctrlKey] || d[kKeyCode.metaKey] || d[kKeyCode.shiftKey] || d[kKeyCode.altKey]
          || d[kKeyCode.osRightMac] || d[kKeyCode.osRightNonMac]) {
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
      onWaitingKey = suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents, callback)
    } else {
      setMode(mode_)
    }
}

/** reinit: should only be called on manager */
const reinit = (auto?: BOOL | TimerType.fake, officer?: BaseHintWorker | null
    , lastEl?: WeakRef<LinkEl> | null, rect?: Rect | null): void => {
  if (!isEnabled_) { isAlive_ && clear() }
  else {
    isActive = 0;
    resetHints();
    contentCommands_[kFgCmd.linkHints](options_, 0);
    setupCheck(officer, lastEl!, rect!)
    onWaitingKey = auto ? suppressTail_(GlobalConsts.TimeOfSuppressingUnexpectedKeydownEvents
        , /*#__NOINLINE__*/ resetOnWaitKey) : onWaitingKey
  }
}

const resetOnWaitKey = (): void => { onWaitingKey = null }

/** should only be called on manager */
const setupCheck = (officer: BaseHintWorker | null | undefined, el: WeakRef<LinkEl>, r: Rect | null): void => {
    clearTimeout_(_timer)
    _timer = officer && mode1_ < HintMode.min_job ? timeout_((i): void => {
      _timer = TimerID.None;
      let doesReinit: BOOL | boolean | void | undefined
      try {
        doesReinit = !(OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i)
            && (OnFirefox ? unwrap_ff(officer) : officer).x(el, r || 0)
      } catch {}
      doesReinit && reinit(1) // to simplify logic, not wait for unhovering a hidden element in a child iframe
      coreHints.h = isActive && getTime()
    }, frameArray.length > 1 ? 380 : 255) : TimerID.None;
}

// checkLast: if not el, then reinit if only no key stroke and hints.length < 64
const checkLast = ((el?: WeakRef<LinkEl> | LinkEl | TimerType.fake | 9 | 1 | null, r?: Rect | 0): BOOL | 2 => {
  const hasEl = (!OnChrome || Build.MinCVer >= BrowserVer.MinNo$TimerType$$Fake || el !== TimerType.fake) && el
  let r2: Rect | null | undefined, hidden: boolean
  if (!isAlive_) { return 0 }
  else if (window.closed) { return 1 }
  else if (el === 1) { return 2 }
  else {
    r2 = hasEl && (el = deref_(el as WeakRef<LinkEl>)) ? padClientRect_(getBoundingClientRect_(el)) : null
    hidden = !r2 || (r2.r - r2.l) * (r2.b - r2.t) < 4 || !isStyleVisible_(el as LinkEl)
    if (hidden && deref_(lastHovered_) === el) {
      void hover_async()
    }
    if ((!r2 || r) && (manager_ || coreHints).$().n
        && (hidden || math.abs(r2!.l - (r as Rect).l) > 100 || math.abs(r2!.t - (r as Rect).t) > 60)) {
      return hasEl && !doesWantToReloadLinkHints("cl") ? 0
          : manager_ || r != null ? 1 : (timeout_(() => reinit(1), 0), 0)
    } else {
      return 0
    }
  }
}) as BaseHintWorker["x"]

const resetHints = (): void => {
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
    const manager = coreHints.p as HintManager | null;
    isActive = _timer = 0
    manager_ = coreHints.p = null;
    manager && manager.c(onlySelfOrEvent, suppressTimeout);
    frameArray.forEach(safeCall.bind<void, (ori_arg: FrameHintsInfo) => void, [arg1: FrameHintsInfo], void>(0,
        (frameInfo: FrameHintsInfo): void => {
      let frame = frameInfo.s, hasManager = frame.p
      frame.p = null
      hasManager && frame.c(0, suppressTimeout)
    }), suppressTimeout);
    coreHints.y = frameArray = [];
    setupEventListener(0, UNL, clear, 1);
    resetHints();
    removeHandler_(kHandler.linkHints)
    suppressTimeout != null && suppressTail_(suppressTimeout);
    set_onWndBlur2(null)
    removeFlash && removeFlash();
    isHC_ = api_ = options_ = null as never
    set_removeFlash(null)
    /*#__INLINE__*/ localLinkClear()
    set_maxPrefixLen_(0)
    lastMode_ = mode_ = mode1_ = count_ = coreHints.h = 0
    useFilter_ = noHUD_ = tooHigh_ = false
    if (WithDialog) { coreHints.d = 0 }
    chars_ = "";
    removeBox()
    hud_tipTimer || hudHide()
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

export const detectUsableChild = (el: KnownIFrameElement): VApiTy | null => {
  let err: boolean | null = true, childEvents: VApiTy | null | void | undefined
  try {
    err = !el.contentDocument
      || !(childEvents = OnFirefox ? getWndVApi_ff!(el.contentWindow) : el.contentWindow.VApi)
      || childEvents.a(keydownEvents_);
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
  return err ? null : childEvents || null;
}

export const doesWantToReloadLinkHints = (reason: NonNullable<ContentOptions["autoReload"]>): boolean => {
  let conf = options_.autoReload, accept = !conf || conf === "all" || Lower(conf).includes(reason)
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
    return { a: isActive, b: box_, k: keyStatus_, m: doesResetMode ? mode_ = HintMode.DEFAULT : mode_,
      n: isActive && hints_ && hints_.length < (frameArray.length > 1 ? 200 : 100) && !keyStatus_.k }
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
if (!(Build.NDEBUG || BrowserVer.Min$Array$$find$$findIndex <= BrowserVer.MinEnsuredES6$Array$$Includes)) {
  console.log("Assert error: BrowserVer.Min$Array$$find$$findIndex <= BrowserVer.MinEnsuredES6$Array$$Includes")
}
