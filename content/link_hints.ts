import HintItem = HintsNS.HintItem
import LinkEl = HintsNS.LinkEl
import FilteredHintItem = HintsNS.FilteredHintItem
interface Executor {
    (this: void, linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintItem, "r">): void | boolean;
}
interface ModeOpt extends ReadonlyArray<Executor | HintMode> {
    [0]: Executor;
    [1]: HintMode;
}
export interface KeyStatus {
    /** curHints */ c: readonly HintItem[];
    /** keySequence */ k: string;
    /** textSequence */ t: string;
    /** known */ n: BOOL;
    /** tab */ b: number;
}
interface HinterStatus {
  /** isActive */ a: BOOL
  /** box */ b: HTMLDivElement | HTMLDialogElement | null
  /** keyStatus */ k: Readonly<KeyStatus>
  /** mode */ m: HintMode
  /** is newly activated */ n: boolean | BOOL | null
}
interface BaseHinter extends HintsNS.BaseHinter {
  /** get stat */ $ (): Readonly<HinterStatus>
  /** clear */ c: typeof clear
  /** dialogMode */ d: boolean
  /** executeHint */ e: typeof executeHintInOfficer
  /** getPreciseChildRect */ g: typeof getPreciseChildRect
  /** hasExecuted */ h: BOOL
  /** delayToExecute */ j: typeof delayToExecute
  /** highlightHint */ l: typeof highlightHint
  /** collectFrameHints */ o: typeof collectFrameHints
  /** manager */ p: HintManager | null
  /** render */ r: typeof render
  /** rotate1 */ t: typeof rotate1
  /** checkLast_ */ x: typeof checkLast
  /** yankedList */ y: string[]
}
interface HintManager extends BaseHinter {
    hints_?: readonly HintItem[] | null
    /** get stat (also reset mode if needed) */ $ (resetMode?: 1): Readonly<HinterStatus>
    /** reinit */ i: typeof reinit
    /** onKeydown */ n: typeof onKeydown
    p: null;
    /** resetMode */ s: typeof resetMode
    /** onFrameUnload */ u: typeof onFrameUnload
    /** resetHints */ v (): void;
    /** setupCheck */ w (officer?: BaseHinter | null, el?: LinkEl | null, r?: Rect | null): void
}
interface HintOfficer extends BaseHinter {
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

import {
  VTr, isAlive_, isEnabled_, setupEventListener, keydownEvents_, set_keydownEvents_, timeout_,
  clearTimeout_, VOther, fgCache, doc, readyState_, chromeVer_, vApi, deref_,
} from "../lib/utils"
import { frameElement_, querySelector_unsafe_, isHTML_, getViewBox_, prepareCrop_, scrollingEl_, bZoom_, wdZoom_,
  dScale_, getBoundingClientRect_, docEl_unsafe_, IsInDOM_, docZoom_, bScale_, GetParent_unsafe_, getComputedStyle_,
  isStyleVisible_, getInnerHeight, padClientRect_,
} from "../lib/dom_utils"
import {
  pushHandler_, SuppressMost_, removeHandler_, getMappedKey, keybody_, isEscape_, getKeyStat_, keyNames_, suppressTail_,
  BSP,
  ENTER,
} from "../lib/keyboard_utils"
import { send_ } from "./port"
import {
  style_ui, addElementList, ensureBorder, adjustUI, flash_, getParentVApi, getWndVApi_ff, checkHidden, removeModal,
} from "./dom_ui"
import { scrollTick, beginScroll } from "./scroller"
import { omni_box, focusOmni } from "./omni"
import { hudTip, hudShow, hudHide, hud_tipTimer } from "./hud"
import { set_onWndBlur2 } from "./insert"
import {
  getVisibleElements, localLinkClear, frameNested_, checkNestedFrame, set_frameNested_, filterOutNonReachable,
} from "./local_links"
import {
  rotateHints, matchHintsByKey, zIndexes_, rotate1, initFilterEngine, initAlphabetEngine, renderMarkers,
  getMatchingHints, activeHint_, hintFilterReset, hintFilterClear, resetZIndexes, adjustMarkers, createHint,
  generateHintText,
} from "./hint_filters"
import {
  linkActions, executeHintInOfficer, removeFlash, set_hintModeAction, resetRemoveFlash, resetHintKeyCode, hintKeyCode,
} from "./link_actions"
import { lastHovered_, resetLastHovered } from "./async_dispatcher"

let box_: HTMLDivElement | HTMLDialogElement | null = null
let wantDialogMode_: boolean | null = null
let hints_: readonly HintItem[] | null = null
let frameList_: FrameHintsInfo[] = []
let mode_ = HintMode.empty
let mode1_ = HintMode.empty
let forHover_ = false
let count_ = 0
let lastMode_: HintMode = 0
let tooHigh_: null | boolean = false
let forceToScroll_ = 0
let isClickListened_ = true
let chars_ = ""
let useFilter_ = false
let keyStatus_: KeyStatus = null as never
  /** must be called from a manager, required by {@link #delayToExecute_ } */
let onTailEnter: ((this: unknown, event: HandlerNS.Event, key: string, keybody: kChar) => void) | null = null
let onWaitingKey: HandlerNS.RefHandler | null = null
let isActive: BOOL = 0
let noHUD_ = false
let options_: HintsNS.ContentOptions = null as never
let _timer = TimerID.None
let kSafeAllSelector = Build.BTypes & ~BrowserType.Firefox ? ":not(form)" as const : "*" as const
const kEditableSelector = "input,textarea,[contenteditable]" as const
let manager_: HintManager | null = null
let api_: VApiTy = null as never
const unwrap_ff = (!(Build.BTypes & BrowserType.Firefox) ? 0 as never
      : <T extends object> (obj: T): T => (obj as XrayedObject<T>).wrappedJSObject || obj) as {
    <T extends SafeElement>(obj: T): T;
    (obj: Element): unknown;
    <T extends object>(obj: T): T;
}
  /** return whether the element's VHints is not accessible */
let addChildFrame: ((child: BaseHinter
      , el: HTMLIFrameElement | HTMLFrameElement, rect: Rect | null) => boolean) | null = null

export {
  isActive as isHintsActive,
  hints_ as allHints, keyStatus_ as hintKeyStatus, useFilter_, frameList_, chars_ as hintChars,
  mode_, mode1_, options_ as hintOptions,
  forHover_, isClickListened_, forceToScroll_, tooHigh_,
  kSafeAllSelector, kEditableSelector, unwrap_ff, addChildFrame,
  api_ as hintApi, manager_ as hintManager,
}
export function set_kSafeAllSelector (_newKSafeAll: string): void { kSafeAllSelector = _newKSafeAll as any }
export function set_isClickListened_ (_newIsClickListened: boolean): void { isClickListened_ = _newIsClickListened }

export const activate = (options: HintsNS.ContentOptions, count: number): void => {
    if (isActive || !isEnabled_) { return; }
    if (checkHidden(kFgCmd.linkHints, count, options)) {
      return clear()
    }
    if (doc.body === null) {
      clear()
      if (!_timer && readyState_ > "l") {
        pushHandler_(SuppressMost_, coreHints)
        _timer = timeout_(activate.bind(0 as never, options, count), 300)
        return;
      }
    }
    const parApi = Build.BTypes & BrowserType.Firefox ? getParentVApi()
        : frameElement_() && getParentVApi();
    if (parApi) {
      parApi.l(style_ui)
      // recursively go up and use the topest frame in a same origin
      parApi.h(options, count)
      return;
    }
    const useFilter0 = options.useFilter, useFilter = useFilter0 != null ? !!useFilter0 : fgCache.f,
    frameList: FrameHintsInfo[] = frameList_ = [{h: [], v: null as never, s: coreHints}],
    toClean: HintOfficer[] = [],
    s0 = options.characters, chars = s0 ? s0 + "" : useFilter ? fgCache.n : fgCache.c;
    if (chars.length < GlobalConsts.MinHintCharSetSize) {
      hudTip(kTip.fewChars, 1000)
      return clear()
    }
    if (Build.BTypes & BrowserType.ChromeOrFirefox) {
      if (Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredShadowDOMV1
          || BrowserVer.MinEnsuredHTMLDialogElement < BrowserVer.MinShadowDOMV0
              && Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinShadowDOMV0) {
        removeModal()
      }
      coreHints.d = (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement
            || typeof HTMLDialogElement === "function")
        && !!(wantDialogMode_ != null ? wantDialogMode_ : querySelector_unsafe_("dialog[open]"))
    }
    let allHints: readonly HintItem[], child: ChildFrame | undefined, insertPos = 0
      , frameInfo: FrameHintsInfo, total: number
    {
      const childFrames: ChildFrame[] = [],
      addChild: typeof addChildFrame = function (child, el, rect) {
        const childApi = detectUsableChild(el),
        officer: HintOfficer | null | undefined = childApi && (childApi.b as HintOfficer)
        if (officer) {
          childApi!.l(style_ui)
          childFrames.splice(insertPos, 0, {
            v: rect && child.g(el, rect),
            s: officer
          });
        }
        return !officer;
      };
      coreHints.o(count, options, chars, useFilter, null, null, frameList[0], addChild)
      allHints = frameList[0].h;
      while (child = childFrames.pop()) {
        if (child.v) {
          insertPos = childFrames.length;
          frameList.push(frameInfo = {h: [], v: null as never, s: child.s});
          child.s.o(count, options, chars, useFilter, child.v, coreHints, frameInfo, addChild);
          // ensure allHints always belong to the manager frame
          allHints = frameInfo.h.length ? allHints.concat(frameInfo.h) : allHints;
        } else if (child.s.$().a) {
          toClean.push(child.s);
        }
      }
      for (const i of toClean) { i.p = null; i.c() }
      total = allHints.length;
      if (!total || total > GlobalConsts.MaxCountToHint) {
        hudTip(total ? kTip.tooManyLinks : kTip.noLinks, 1000)
        return clear()
      }
      hints_ = keyStatus_.c = allHints
      if (!Build.NDEBUG) { coreHints.hints_ = hints_ }
    }
    noHUD_ = !(useFilter || frameList[0].v[3] > 40 && frameList[0].v[2] > 320)
        || (options.hideHUD || options.hideHud) === true;
    useFilter ? initFilterEngine(allHints as readonly FilteredHintItem[]) : initAlphabetEngine(allHints)
    renderMarkers(allHints)
    setMode(mode_);
    for (const frame of frameList) {
      frame.s.r(frame.h, frame.v, vApi);
    }
}

const collectFrameHints = (count: number, options: HintsNS.ContentOptions
      , chars: string, useFilter: boolean, outerView: Rect | null
      , manager: HintManager | null, frameInfo: FrameHintsInfo
      , newAddChildFrame: NonNullable<typeof addChildFrame>
      ): void => {
    (coreHints as BaseHinter).p = manager_ =
        Build.BTypes & BrowserType.Firefox ? manager && unwrap_ff(manager) : manager
    resetHints();
    scrollTick(2);
    let modeAction: ModeOpt | undefined;
    if (options_ !== options) {
      /** ensured by {@link ../background/commands.ts#Commands.makeCommand_} */
      let mode = options.mode as number;
      for (let modes of linkActions) {
        if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
            ? modes.indexOf(mode & ~HintMode.queue) > 0 : modes.includes!(mode & ~HintMode.queue)) {
          modeAction = modes;
          break;
        }
      }
      if (!modeAction) {
        modeAction = linkActions[8];
        mode = HintMode.DEFAULT;
      }
      mode = count > 1 ? mode ? mode | HintMode.queue : HintMode.OPEN_WITH_QUEUE : mode;
      set_hintModeAction(modeAction);
      options_ = options;
      count_ = count;
      setMode(mode, 1);
    }
    chars_ = chars;
    useFilter_ = useFilter
    if (!isHTML_()) {
      return;
    }
    const view: ViewBox = getViewBox_(Build.BTypes & BrowserType.Chrome && (manager || coreHints
        ).d ? 2 : 1);
    prepareCrop_(1, outerView);
    if (tooHigh_ !== null) {
      tooHigh_ = scrollingEl_(1)!.scrollHeight / getInnerHeight() > GlobalConsts.LinkHintTooHighThreshold
    }
    removeModal()
    forceToScroll_ = options.scroll === "force" ? 2 : 0;
    addChildFrame = newAddChildFrame;
    const elements = getVisibleElements(view);
    const hintItems = elements.map(createHint);
    addChildFrame = null as never;
    bZoom_ !== 1 && adjustMarkers(hintItems, elements);
    for (let i = useFilter_ ? hintItems.length : 0; 0 <= --i; ) {
      hintItems[i].h = generateHintText(elements[i], i, hintItems)
    }
    frameInfo.h = hintItems;
    frameInfo.v = view;
}

const render = (hints: readonly HintItem[], arr: ViewBox, raw_apis: VApiTy): void => {
    const managerOrA = manager_ || coreHints;
    if (box_) { box_.remove(); box_ = null; }
    removeModal()
    api_ = Build.BTypes & BrowserType.Firefox && manager_ ? unwrap_ff(raw_apis) : raw_apis;
    ensureBorder(wdZoom_ / dScale_);
    if (hints.length) {
      if (Build.BTypes & BrowserType.Chrome) {
        box_ = addElementList(hints, arr, managerOrA.d);
      } else {
        box_ = addElementList(hints, arr);
      }
    } else if (coreHints === managerOrA) {
      adjustUI();
    }
    /*#__INLINE__*/ set_keydownEvents_((Build.BTypes & BrowserType.Firefox ? api_ : raw_apis).a())
    /*#__INLINE__*/ set_onWndBlur2(managerOrA.s);
    removeHandler_(coreHints)
    pushHandler_(coreHints.n, coreHints)
    manager_ && setupEventListener(0, "unload", clear);
    isActive = 1;
}

/** must be called from the manager context, or be used to sync mode from the manager */
export const setMode = (mode: HintMode, silent?: 1): void => {
    mode_ - mode ? lastMode_ = mode_ = mode : 0
    mode1_ = mode & ~HintMode.queue;
    forHover_ = mode1_ > HintMode.min_hovering - 1 && mode1_ < HintMode.max_hovering + 1;
    if (silent || noHUD_ || hud_tipTimer) { return }
    let msg = VTr(mode_), textSeq = keyStatus_.t;
    msg += useFilter_ ? ` [${textSeq}]` : "";
    if (Build.BTypes & BrowserType.Chrome) {
      msg += (manager_ || coreHints).d ? VTr(kTip.modalHints) : "";
    }
    hudShow(kTip.raw, [msg], true)
}

const getPreciseChildRect = (frameEl: HTMLIFrameElement | HTMLFrameElement, view: Rect): Rect | null => {
    const max = Math.max, min = Math.min, V = "visible",
    brect = padClientRect_(getBoundingClientRect_(frameEl)),
    docEl = docEl_unsafe_(), body = doc.body, inBody = !!body && IsInDOM_(frameEl, body, 1),
    zoom = (Build.BTypes & BrowserType.Chrome ? docZoom_ * (inBody ? bZoom_ : 1) : 1
        ) / dScale_ / (inBody ? bScale_ : 1);
    let x0 = min(view.l, brect.l), y0 = min(view.t, brect.t), l = x0, t = y0, r = view.r, b = view.b
    for (let el: Element | null = frameEl; el = GetParent_unsafe_(el, PNType.RevealSlotAndGotoParent); ) {
      const st = getComputedStyle_(el);
      if (st.overflow !== V) {
        let outer = padClientRect_(getBoundingClientRect_(el)), hx = st.overflowX !== V, hy = st.overflowY !== V,
        scale = el !== docEl && inBody ? dScale_ * bScale_ : dScale_;
        hx && (l = max(l, outer.l), r = l + min(r - l, outer.r - outer.l, hy ? el.clientWidth * scale : r))
        hy && (t = max(t, outer.t), b = t + min(b - t, outer.b - outer.t, hx ? el.clientHeight * scale : b))
      }
    }
    l = max(l, view.l), t = max(t, view.t);
    const cropped = l + 7 < r && t + 7 < b ? {
        l: (l - x0) * zoom, t: (t - y0) * zoom, r: (r - x0) * zoom, b: (b - y0) * zoom} : null;
    let hints: Hint[] | null;
    return cropped && (
        filterOutNonReachable(hints = [[frameEl as SafeHTMLElement, cropped, HintsNS.ClickType.frame]]),
        hints.length) ? cropped : null
}

export const tryNestedFrame = (
      cmd: Exclude<FgCmdAcrossFrames, kFgCmd.linkHints>, count: number, options: SafeObject): boolean => {
    if (frameNested_ !== null) {
      prepareCrop_();
      checkNestedFrame();
    }
    if (!frameNested_) { return false; }
    // let events: VApiTy | undefined, core: ContentWindowCore | null | 0 | void | undefined = null;
    const childApi = detectUsableChild(frameNested_);
    if (childApi) {
      childApi.f(cmd, count, options);
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
    if (manager_) {
      /*#__INLINE__*/ set_keydownEvents_(api_.a());
      return manager_.n(event);
    } else if (Build.BTypes & BrowserType.Chrome && onWaitingKey) {
      onWaitingKey(event);
    } else if (event.e.repeat || !isActive) {
      // NOTE: should always prevent repeated keys.
    } else if (i === kKeyCode.ime) {
      hudTip(kTip.exitForIME)
      clear()
      return HandlerResult.Nothing;
    } else if (key = getMappedKey(event, kModeId.Link), keybody = keybody_(key),
        isEscape_(key) || onTailEnter && keybody === BSP) {
      clear();
    } else if (i === kKeyCode.esc && isEscape_(keybody)) {
      return HandlerResult.Suppress;
    } else if (onTailEnter && keybody !== kChar.f12) {
      onTailEnter(event, key, keybody);
    } else if (keybody > kChar.maxNotF_num && keybody < kChar.minNotF_num && key !== kChar.f1) { // exclude plain <f1>
      if (keybody > kChar.f1 && keybody !== kChar.f2) { resetMode(); return HandlerResult.Nothing; }
      i = getKeyStat_(event);
      if (keybody < kChar.f2) {
        resetMode();
        if (key[0] === "a" && useFilter_) {
          locateHint(activeHint_!).l(activeHint_!);
        } else if (key[0] === "s") {
          // `/^s-(f1|f0[a-z0-9]+)$/`
          for (const frame of frameList_) {
            frame.s.$().b!.classList.toggle("HM-" + keybody);
          }
        }
        return HandlerResult.Prevent;
      }
      if (key.includes("-s")) {
        fgCache.e = !fgCache.e;
      } else if (key[0] === "a") {
        if (!(Build.BTypes & BrowserType.Chrome)) { resetMode(); return HandlerResult.Prevent; }
        wantDialogMode_ = !wantDialogMode_;
      } else if ("cm".includes(key[0])) {
        options_.useFilter = fgCache.f = !useFilter_;
      } else if (key !== keybody) { // <s-f2>
        isClickListened_ = !isClickListened_;
      } else {
        if (Build.BTypes & BrowserType.Firefox
              && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
              && isClickListened_
            || !vApi.e) {
          resetMode(); return HandlerResult.Prevent;
        }
        isClickListened_ = true;
        if (Build.BTypes & ~BrowserType.Firefox) {
          vApi.e(kContentCmd.ManuallyFindAllOnClick);
        }
      }
      resetMode(1);
      if (Build.MinCVer < BrowserVer.MinEnsuredES6ArrowFunction && Build.BTypes & BrowserType.Chrome) {
        timeout_(/*#__NOINLINE__*/ reinitHintsIgnoringArgs, 0)
      } else {
        timeout_((): void => reinit(), 0)
      }
    } else if ((i < kKeyCode.maxAcsKeys + 1 && i > kKeyCode.minAcsKeys - 1
            || !fgCache.o && (i > kKeyCode.maxNotMetaKey && i < kKeyCode.minNotMetaKeyOrMenu))
        && !key) {
      const mode = mode_, mode1 = mode1_,
      mode2 = mode1 > HintMode.min_copying - 1 && mode1 < HintMode.max_copying + 1
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
      if (mode2 !== mode) {
        setMode(mode2);
        i = getKeyStat_(event);
        (i & (i - 1)) || (lastMode_ = mode);
      }
    } else if (i = keyNames_.indexOf(keybody), i > 0 && i < 9) {
      beginScroll(event, key, keybody);
      resetMode();
    } else if (keybody === kChar.tab && !useFilter_ && !keyStatus_.k) {
      tooHigh_ = null;
      resetMode();
      if (Build.MinCVer < BrowserVer.MinEnsuredES6ArrowFunction && Build.BTypes & BrowserType.Chrome) {
        timeout_(/*#__NOINLINE__*/ reinitHintsIgnoringArgs, 0)
      } else {
        timeout_((): void => reinit(), 0)
      }
    } else if (keybody === kChar.space && (!useFilter_ || key !== keybody)) {
      keyStatus_.t = keyStatus_.t.replace("  ", " ");
      zIndexes_ !== 0 && rotateHints(key === "s-" + keybody);
      resetMode();
    } else if (matchedHint = matchHintsByKey(keyStatus_, event, key, keybody), matchedHint === 0) {
      // then .keyStatus_.hintSequence_ is the last key char
      clear(0, keyStatus_.n ? 0 : fgCache.k[0]);
    } else if (matchedHint !== 2) {
      lastMode_ = mode_;
      callExecuteHint(matchedHint, event)
    }
    return HandlerResult.Prevent;
}

export const reinitHintsIgnoringArgs = (): void => { reinit() }

const callExecuteHint = (hint: HintItem, event?: HandlerNS.Event): void => {
  const selectedHinter = locateHint(hint), clickEl = hint.d,
  result = selectedHinter.e(hint, event)
  result !== 0 && timeout_((): void => {
    removeFlash && removeFlash()
    resetRemoveFlash()
    if (!(mode_ & HintMode.queue)) {
      setupCheck(selectedHinter, clickEl)
      clear(0, 0)
    } else {
      postExecute(selectedHinter, clickEl, result);
    }
  }, 0)
}

const locateHint = (matchedHint: HintItem): BaseHinter => {
    /** safer; necessary since {@link #_highlightChild} calls {@link #detectUsableChild_} */
    const arr = frameList_;
    for (const list of arr.length > 1 && matchedHint ? arr : []) {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
          ? list.h.indexOf(matchedHint) >= 0 : list.h.includes!(matchedHint)) {
        return list.s;
      }
    }
    return coreHints;
}

const highlightHint = (hint: HintItem): void => {
  flash_(hint.m, null, 660, " Sel")
  box_!.classList.toggle("HMM")
}

export const resetMode = (silent?: 1): void => {
    if (lastMode_ !== mode_ && mode_ < HintMode.min_disable_queue) {
      let d = keydownEvents_;
      if (d[kKeyCode.ctrlKey] || d[kKeyCode.metaKey] || d[kKeyCode.shiftKey] || d[kKeyCode.altKey]
          || d[kKeyCode.osRightMac] || d[kKeyCode.osRightNonMac]) {
        setMode(lastMode_, silent);
      }
    }
}

const delayToExecute = (officer: BaseHinter, hint: HintItem, flashEl: SafeHTMLElement | null): void => {
    const waitEnter = Build.BTypes & BrowserType.Chrome && fgCache.w,
    callback = (event?: HandlerNS.Event, key?: string, keybody?: string): void => {
      let closed: void | 1 | 2 = 1;
      try {
        closed = officer.x(1);
      } catch {}
      if (closed !== 2) {
        hudTip(kTip.linkRemoved)
        isActive && clear()
      } else if (event) {
        tick = waitEnter && keybody === kChar.space ? tick + 1 : 0;
        tick === 3 || keybody === ENTER ? callExecuteHint(hint, event)
        : key === kChar.f1 && flashEl ? flashEl.classList.toggle("Sel") : 0;
      } else {
        callExecuteHint(hint);
      }
    };
    let tick = 0;
    onTailEnter = callback;
    box_!.remove();
    box_ = null;
    Build.BTypes & BrowserType.Firefox && (officer = unwrap_ff(officer));
    if (Build.BTypes & BrowserType.Chrome && !waitEnter) {
      onWaitingKey = suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents
          , callback);
      removeHandler_(onWaitingKey);
    } else {
      hudShow(kTip.waitEnter);
    }
}

const postExecute = (officer: BaseHinter, clickEl: LinkEl | null, rect?: Rect | null): void => {
    isActive = 0;
    coreHints.w();
    timeout_(function (): void {
      reinit(officer, clickEl, rect);
      if (isActive && 1 === --count_) {
        setMode(mode1_);
      }
    }, frameList_.length > 1 ? 50 : 18);
}

  /** should only be called on manager */
const reinit = (officer?: BaseHinter | null, lastEl?: LinkEl | null, rect?: Rect | null): void => {
    if (!isEnabled_) {
      isAlive_ && clear();
      return;
    }
    isActive = 0;
    resetHints();
    activate(options_, 0);
    coreHints.w(officer, lastEl, rect);
}

  /** should only be called on manager */
const setupCheck: HintManager["w"] = (officer?: BaseHinter | null, el?: LinkEl | null, r?: Rect | null): void => {
    _timer && clearTimeout_(_timer);
    _timer = officer && el && mode1_ < HintMode.min_job ? timeout_((i): void => {
      _timer = TimerID.None;
      let doesReinit: BOOL | void = 0;
      try {
        Build.BTypes & BrowserType.Firefox && (officer = unwrap_ff(officer!));
        Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i ||
        officer && (doesReinit = officer.x(el, r));
      } catch {}
      doesReinit && reinit();
      for (const frame of isActive ? frameList_ : []) {
        frame.s.h = 1;
      }
    }, frameList_.length > 1 ? 380 : 255) : TimerID.None;
}
  // if not el, then reinit if only no key stroke and hints.length < 64
const checkLast = function (this: void, el?: LinkEl | TimerType.fake | 1, r?: Rect | null): void | BOOL | 2 {
    if (!isAlive_) { return; }
    if (window.closed) { return 1; }
    if (el === 1) { return 2; }
    const managerOrA = manager_ || coreHints;
    const r2 = el && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinNo$TimerType$$Fake
                      /** @todo: remove comments here, which was to work around a bug of TypeScript 3.9 beta */
                      /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
                      // @ts-expect-error
                      || el !== TimerType.fake
                      ) ? padClientRect_(getBoundingClientRect_(el as LinkEl)) : null,
                      /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
    hidden = !r2 || r2.r - r2.l < 2 && r2.b - r2.t < 2
        || !isStyleVisible_(el as LinkEl); // use 2px: may be safer
    if (hidden && deref_(lastHovered_) === el) {
      /*#__INLINE__*/ resetLastHovered()
    }
    if ((!r2 || r) && managerOrA.$().n
        && (hidden || Math.abs(r2!.l - r!.l) > 100 || Math.abs(r2!.t - r!.t) > 60)) {
      if (manager_) { return 1; }
      managerOrA.i();
    }
} as {
    (el?: LinkEl | TimerType.fake, r?: Rect | null): void | BOOL;
    (el: 1, r?: Rect | null): void | 1 | 2;
}

const resetHints = (): void => {
    // here should not consider about .manager_
    if (Build.BTypes & BrowserType.Chrome) { onWaitingKey = null; }
    onTailEnter = hints_ = null as never;
    if (!Build.NDEBUG) { coreHints.hints_ = null }
    /*#__INLINE__*/ hintFilterReset();
    coreHints.h = 0;
    keyStatus_ && (keyStatus_.c = null as never);
    keyStatus_ = {
      c: null as never,
      k: "", t: "",
      n: 0, b: 0
    };
    for (const frame of frameList_) {
      frame.h = [];
    }
}

export const clear = (keepHudOrEvent?: 0 | 1 | Event, suppressTimeout?: number): void => {
    if (!isAlive_) { return; }
    if (keepHudOrEvent === 1 || keepHudOrEvent
        && (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted
            ? keepHudOrEvent.isTrusted !== !1 : keepHudOrEvent.isTrusted)
        && keepHudOrEvent.target === doc) {
      manager_ && manager_.u(coreHints);
      if (keepHudOrEvent !== 1) {
        return;
      }
    }
    const manager = manager_;
    isActive = 0
    manager_ = null;
    manager && manager.c(keepHudOrEvent, suppressTimeout);
    frameList_.forEach(cleanFrameInfo, suppressTimeout);
    coreHints.y = frameList_ = [];
    setupEventListener(0, "unload", clear, 1);
    resetHints();
    removeHandler_(coreHints)
    suppressTimeout != null && suppressTail_(suppressTimeout);
    /*#__INLINE__*/ set_onWndBlur2(null);
    removeFlash && removeFlash();
    api_ = options_ = null as never
    /*#__INLINE__*/ set_hintModeAction(null)
    /*#__INLINE__*/ resetRemoveFlash()
    /*#__INLINE__*/ localLinkClear()
    /*#__INLINE__*/ hintFilterClear()
    lastMode_ = mode_ = mode1_ = count_ =
    coreHints.h = forceToScroll_ = 0;
    /*#__INLINE__*/ resetHintKeyCode()
    useFilter_ =
    noHUD_ = tooHigh_ = false;
    if (Build.BTypes & BrowserType.ChromeOrFirefox) { coreHints.d = false; }
    chars_ = "";
    if (box_) {
      box_.remove();
      box_ = null;
    }
    removeModal()
    hud_tipTimer || hudHide()
}

const cleanFrameInfo = function (this: number | undefined, frameInfo: FrameHintsInfo): void {
    try {
      let frame = frameInfo.s, hasManager = frame.p;
      frame.p = null;
      hasManager && frame.c(0, this);
    } catch { /* empty */ }
}

const onFrameUnload = (officer: HintOfficer): void => {
    const frames = frameList_, len = frames.length;
    const wrappedofficer_ff = Build.BTypes & BrowserType.Firefox ? unwrap_ff(officer) : 0 as never as null;
    let i = 0, offset = 0;
    while (i < len && frames[i].s !== (Build.BTypes & BrowserType.Firefox ? wrappedofficer_ff! : officer)) {
      offset += frames[i++].h.length;
    }
    if (i >= len || !isActive || _timer) { return; }
    const keyStat = keyStatus_, hints = keyStat.c = hints_!,
    deleteCount = frames[i].h.length;
    deleteCount && (hints as HintItem[]).splice(offset, deleteCount); // remove `readonly` by intent
    frames.splice(i, 1);
    if (!deleteCount) { return; }
    suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents);
    if (!hints.length) {
      hudTip(kTip.frameUnloaded)
      clear()
      return
    }
    resetZIndexes()
    keyStat.n = keyStat.b = 0;
    if (useFilter_) {
      getMatchingHints(keyStat, "", "", 1);
    } else {
      for (const link of hints) { link.m.innerText = ""; }
      initAlphabetEngine(hints);
      renderMarkers(hints);
    }
}

const detectUsableChild = (el: HTMLIFrameElement | HTMLFrameElement): VApiTy | null => {
  let err: boolean | null = true, childEvents: VApiTy | null | void | undefined
  try {
    err = !el.contentDocument
      || !(childEvents = Build.BTypes & BrowserType.Firefox ? getWndVApi_ff!(el.contentWindow) : el.contentWindow.VApi)
      || childEvents.a(keydownEvents_);
  } catch (e) {
    if (!Build.NDEBUG) {
      let notDocError = true;
      if (Build.BTypes & BrowserType.Chrome && chromeVer_ < BrowserVer.Min$ContentDocument$NotThrow) {
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

export const highlightChild = (el: LinkEl, tag: string): 0 | 1 | 2 => {
  if (!(<RegExpOne> /^i?frame$/).test(tag)) {
    return 0;
  }
  options_.mode = mode_;
  (manager_ || coreHints).$(1)
  if (el === omni_box) {
    focusOmni();
    return 1;
  }
  const childApi = detectUsableChild(el as HTMLIFrameElement | HTMLFrameElement);
  (el as HTMLIFrameElement | HTMLFrameElement).focus();
  if (!childApi) {
    send_(kFgReq.execInChild, {
      u: (el as HTMLIFrameElement | HTMLFrameElement).src,
      c: kFgCmd.linkHints, n: count_, k: hintKeyCode, a: options_
    }, function (res): void {
      if (!res) {
        (el as HTMLIFrameElement | HTMLFrameElement).contentWindow.focus();
      }
    });
  } else {
    childApi.f(kFgCmd.linkHints, count_, options_, 1);
  }
  return 2;
}

const coreHints: HintManager = {
  $: (resetMode?: 1): HinterStatus => {
    return { a: isActive, b: box_, k: keyStatus_, m: resetMode ? mode_ = HintMode.DEFAULT : mode_,
      n: isActive && hints_ && hints_.length < (frameList_.length > 1 ? 200 : 100) && !keyStatus_.k }
  },
  d: Build.BTypes & BrowserType.Chrome ? false : 0 as never, h: 0, y: [],
  x: checkLast, c: clear, o: collectFrameHints, j: delayToExecute, e: executeHintInOfficer, g: getPreciseChildRect,
  l: highlightHint, r: render, t: rotate1,
  p: null,
  n: onKeydown, s: resetMode, i: reinit, v: resetHints, u: onFrameUnload, w: setupCheck
}
if (!Build.NDEBUG) { coreHints.hints_ = null }

export { HintManager, coreHints }

if (!(Build.NDEBUG || HintMode.min_not_hint <= <number> kTip.START_FOR_OTHERS)) {
  console.log("Assert error: HintMode.min_not_hint <= kTip.START_FOR_OTHERS");
}
