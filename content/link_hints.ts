import HintItem = HintsNS.HintItem
import FilteredHintItem = HintsNS.FilteredHintItem
import MarkerElement = HintsNS.MarkerElement
import Filter = HintsNS.Filter
const enum ClickType {
  Default = 0, edit,
  MaxNotWeak = edit, attrListener, MinWeak = attrListener, codeListener, classname, tabindex, MaxWeak = tabindex,
  MinNotWeak, // should <= MaxNotBox
  MaxNotBox = 6, frame, scrollX, scrollY,
}
  type LinkEl = Hint[0];
  interface Executor {
    (this: void, linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintItem, "r">): void | boolean;
  }
  interface ModeOpt extends ReadonlyArray<Executor | HintMode> {
    [0]: Executor;
    [1]: HintMode;
  }
  type NestedFrame = false | 0 | null | HTMLIFrameElement | HTMLFrameElement;
  type Stack = number[];
  type Stacks = Stack[];
  interface KeyStatus {
    /** curHints */ c: readonly HintItem[];
    /** keySequence */ k: string;
    /** textSequence */ t: string;
    /** known */ n: BOOL;
    /** tab */ b: number;
  }
  type HintSources = readonly SafeElement[] | NodeListOf<SafeElement>;
interface MinimalHUDTy {
  /** accessText */ a (beforeExecute?: 1): void;
  /** show */ s (tid: kTip | HintMode, args?: Array<string | number>, embed?: boolean): void;
  /** duration is default to 1500 */
  /** tip */ t (tid: kTip, duration?: number, args?: Array<string | number>): void;
  /** copied */ c (text: string, type?: "url" | ""): void;
}
interface BaseHinter extends HintsNS.BaseHinter {
  /** isActive */ a: BOOL
  /** box */ b: HTMLDivElement | HTMLDialogElement | null
  /** clear */ c: typeof clear
  /** dialogMode */ d: boolean
  /** executeHint */ e: typeof executeHint
  /** getPreciseChildRect */ g: typeof getPreciseChildRect
  /** hasExecuted */ h: BOOL
  /** delayToExecute */ j: typeof delayToExecute
  /** hints */ readonly l: readonly HintItem[] | null
  /** collectFrameHints */ o: typeof collectFrameHints
  /** master */ p: Master | null
  $: typeof highlightHint
  /** render */ r: typeof render
  /** rotate1 */ t: typeof rotate1
  /** checkLast_ */ x: typeof checkLast
  /** yankedList */ y: string[]
}
  interface Master extends BaseHinter {
    /** frameList */ readonly f: FrameHintsInfo[];
    /** reinit */ i: typeof reinit
    /** keyStatus */ readonly k: KeyStatus
    /** mode */ m: HintMode;
    /** onKeydown */ n: typeof onKeydown
    p: null;
    /** promptTimer */ q: TimerID
    /** resetMode */ s: typeof resetMode
    /** onFrameUnload */ u: typeof onFrameUnload
    /** resetHints */ v (): void;
    /** setupCheck */ w (slave?: BaseHinter | null, el?: LinkEl | null, r?: Rect | null): void
    /** postExecute_ */ z: typeof postExecute
  }
  interface Slave extends BaseHinter {
    p: Master | null;
  }
  interface ChildFrame {
    v: Rect | null;
    s: Slave;
  }
  interface FrameHintsInfo {
    h: readonly HintItem[];
    v: ViewBox;
    s: Master | Slave;
  }

import {
  clickable_, VTr, isAlive_, isEnabled_, setupEventListener, keydownEvents_, set$keydownEvents_, timeout_,
  clearTimeout_, safer, VOther, fgCache, jsRe_, doc, readyState_,
} from "../lib/utils"
import { frameElement_, querySelector_unsafe_, isHTML_, getViewBox_, prepareCrop_, scrollingEl_, bZoom_, wdZoom_,
  dScale_, getBoundingClientRect_, docEl_unsafe_, IsInDOM_, docZoom_, bScale_, GetParent_unsafe_, getComputedStyle_,
  createElement_, getVisibleClientRect_, uneditableInputs_, getZoomedAndCroppedRect_, findMainSummary_,
  getClientRectsForAreas_, htmlTag_, isAriaNotTrue_, getCroppedRect_, cropRectToVisible_, isStyleVisible_,
  fullscreenEl_unsafe_, set$bZoom_, notSafe_not_ff_, isContaining_, unsafeFramesetTag_old_cr_, isDocZoomStrange_,
  querySelectorAll_unsafe_, SubtractSequence_, lastHovered_, set$lastHovered_, unhover_, getEditableType_, hover_,
  center_, mouse_, view_,
} from "../lib/dom_utils";
import {
  pushHandler_, SuppressMost_, removeHandler_, key_, keybody_, isEscape_, getKeyStat_, keyNames_, suppressTail_,
  prevent_, kBackspace, kDelete,
} from "../lib/keyboard_utils";
import { send_, post_ } from "./port"
import {
  style_ui, addElementList, ensureBorder, adjustUI, ui_root, ui_box, flash_, getRect, lastFlashEl, click_, select_,
  getParentVApi, getWndVApi_ff, evalIfOK, checkHidden,
} from "./dom_ui"
import {
  scrollTick, shouldScroll_need_safe, getPixelScaleToScroll, scrolled, resetScrolled,
  suppressScroll, beginScroll, set$currentScrolling, syncCachedScrollable,
} from "./scroller"
import { omni_box, focusOmni } from "./vomnibar"
import { find_box } from "./mode_find"
import { hudTip, hudShow, hudCopied, hudResetTextProp, hudHide, hud_text } from "./hud"
import { insert_Lock_, set$onWndBlur2 } from "./mode_insert"

let box_: HTMLDivElement | HTMLDialogElement | null = null
let wantDialogMode_: boolean | null = null
let hints_: readonly HintItem[] | null = null
let frameList_: FrameHintsInfo[] = []
let mode_ = HintMode.empty
let mode1_ = HintMode.empty
let modeOpt_: ModeOpt = null as never
let forHover_ = false
let count_ = 0
let lastMode_: HintMode = 0
let tooHigh_: null | boolean = false
let forceToScroll_ = 0
let isClickListened_ = true
let ngEnabled: boolean | null = null
let jsaEnabled_: boolean | null = null
let chars_ = ""
let useFilter_ = false
let keyStatus_: KeyStatus = null as never
let removeFlash = null as (() => void) | null
  /** must be called from a master, required by {@link #delayToExecute_ } */
let onTailEnter: ((this: unknown, event: HandlerNS.Event, key: string, keybody: kChar) => void) | null = null
let onWaitingKey: HandlerNS.RefHandler | null = null
let keyCode_ = kKeyCode.None
let isActive: BOOL = 0
let noHUD_ = false
let options_: HintsNS.ContentOptions = null as never
let _timer = TimerID.None
let kSafeAllSelector = Build.BTypes & ~BrowserType.Firefox ? ":not(form)" as const : "*" as const
const kEditableSelector = "input,textarea,[contenteditable]" as const
const kNumbers = "0123456789" as const
let master_: Master | null = null
let hud_: MinimalHUDTy = null as never
let api_: VApiTy = null as never
const unwrap_ff = (!(Build.BTypes & BrowserType.Firefox) ? 0 as never
      : <T extends object> (obj: T): T => (obj as XrayedObject<T>).wrappedJSObject || obj) as {
    <T extends SafeElement>(obj: T): T;
    (obj: Element): unknown;
    <T extends object>(obj: T): T;
}
  /** return whether the element's VHints is not accessible */
let addChildFrame: ((this: BaseHinter
      , el: HTMLIFrameElement | HTMLFrameElement, rect: Rect | null) => boolean) | null = null
let maxLeft_ = 0
let maxTop_ = 0
let maxRight_ = 0
let zIndexes_: null | 0 | Stacks = null
let frameNested_: NestedFrame = false

let activeHint_: FilteredHintItem | null = null
let pageNumberHints_: FilteredHintItem[] = null as never
let reForNonMatch_: RegExpG & RegExpOne = null as never
let maxPrefixLen_ = 0

export {
  hints_ as allLinkHints, keyStatus_ as curKeyStatus, ngEnabled,
  kSafeAllSelector, kEditableSelector, unwrap_ff
}
export function set$kSafeAllSelector (selector: string): void { kSafeAllSelector = selector as any; }

export const activate = (count: number, options: HintsNS.ContentOptions): void => {
    if (isActive) { return; }
    if (checkHidden(kFgCmd.linkHints, count, options)) {
      return clear()
    }
    if (doc.body === null) {
      clear()
      if (!_timer && readyState_ > "l") {
        pushHandler_(SuppressMost_, activate)
        _timer = timeout_(activate.bind(0 as never, count, options), 300)
        return;
      }
    }
    const parApi = Build.BTypes & BrowserType.Firefox ? getParentVApi()
        : frameElement_() && getParentVApi();
    if (parApi) {
      parApi.l(style_ui)
      // recursively go up and use the topest frame in a same origin
      parApi.h(count, options)
      return;
    }
    const useFilter0 = options.useFilter, useFilter = useFilter0 != null ? !!useFilter0 : fgCache.f,
    frameList: FrameHintsInfo[] = (baseHinter as Writable<Master>).f = frameList_
        = [{h: [], v: null as never, s: baseHinter}],
    toClean: Slave[] = [],
    s0 = options.characters, chars = (s0 ? s0 + "" : useFilter ? fgCache.n : fgCache.c).toUpperCase();
    if (chars.length < GlobalConsts.MinHintCharSetSize) {
      clear(1)
      return hudTip(kTip.fewChars, 1000);
    }
    if (Build.BTypes & BrowserType.Chrome) {
      baseHinter.d && box_ && box_.remove()
      baseHinter.d = !!(wantDialogMode_ != null ? wantDialogMode_ : querySelector_unsafe_("dialog[open]"))
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement
            || typeof HTMLDialogElement === "function");
    }
    let allHints: readonly HintItem[], child: ChildFrame | undefined, insertPos = 0
      , frameInfo: FrameHintsInfo, total: number
    {
      const childFrames: ChildFrame[] = [],
      addChild: typeof addChildFrame = function (el, rect) {
        const core = detectUsableChild(el),
        slave: Slave | null | undefined = core && (core.b as Slave)
        if (slave) {
          core!.l(style_ui)
          childFrames.splice(insertPos, 0, {
            v: rect && this.g(el, rect),
            s: slave
          });
        }
        return !slave;
      };
      collectFrameHints(count, options, chars, useFilter, null, null, frameList[0], addChild)
      allHints = frameList[0].h;
      while (child = childFrames.pop()) {
        if (child.v) {
          insertPos = childFrames.length;
          frameList.push(frameInfo = {h: [], v: null as never, s: child.s});
          child.s.o(count, options, chars, useFilter, child.v, baseHinter, frameInfo, addChild);
          // ensure allHints always belong to the master frame
          allHints = frameInfo.h.length ? allHints.concat(frameInfo.h) : allHints;
        } else if (child.s.a) {
          toClean.push(child.s);
        }
      }
      for (const i of toClean) { i.p = null; i.c() }
      total = allHints.length;
      if (!total || total > GlobalConsts.MaxCountToHint) {
        clear(1)
        return hudTip(total ? kTip.tooManyLinks : kTip.noLinks, 1000);
      }
      (baseHinter as Writable<BaseHinter>).l = hints_ = keyStatus_.c = allHints
    }
    noHUD_ = !(useFilter || frameList[0].v[3] > 40 && frameList[0].v[2] > 320)
        || (options.hideHUD || options.hideHud) === true;
    useFilter ? initFilterEngine(allHints as readonly FilteredHintItem[]) : initAlphabetEngine(allHints)
    renderMarkers(allHints)
    hud_ = {
      s: hudShow,
      t: hudTip,
      c: hudCopied,
      a: accessHudText,
    }
    setMode(mode_);
    for (const frame of frameList) {
      frame.s.r(frame.h, frame.v, hud_, VApi);
    }
}

const collectFrameHints = (count: number, options: HintsNS.ContentOptions
      , chars: string, useFilter: boolean, outerView: Rect | null
      , master: Master | null, frameInfo: FrameHintsInfo
      , newAddChildFrame: NonNullable<typeof addChildFrame>
      ): void => {
    master_ = Build.BTypes & BrowserType.Firefox ? master && unwrap_ff(master) : master;
    resetHints();
    scrollTick(2);
    if (options_ !== options) {
      /** ensured by {@link ../background/commands.ts#Commands.makeCommand_} */
      let modeOpt: ModeOpt | undefined, mode = options.mode as number;
      for (let modes of Modes_) {
        if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
            ? modes.indexOf(mode & ~HintMode.queue) > 0 : modes.includes!(mode & ~HintMode.queue)) {
          modeOpt = modes;
          break;
        }
      }
      if (!modeOpt) {
        modeOpt = Modes_[8];
        mode = HintMode.DEFAULT;
      }
      mode = count > 1 ? mode ? mode | HintMode.queue : HintMode.OPEN_WITH_QUEUE : mode;
      modeOpt_ = modeOpt;
      options_ = options;
      count_ = count;
      setMode(mode, 1);
    }
    chars_ = chars;
    useFilter_ = useFilter
    if (!isHTML_()) {
      return;
    }
    if ((master || baseHinter).d  && box_) {
      box_.remove()
      baseHinter.b = box_ = null
    }
    const view: ViewBox = getViewBox_(Build.BTypes & BrowserType.Chrome && (master || baseHinter
        ).d ? 2 : 1);
    prepareCrop_(1, outerView);
    if (tooHigh_ !== null) {
      tooHigh_ = scrollingEl_(1)!.scrollHeight / innerHeight
        > GlobalConsts.LinkHintTooHighThreshold;
    }
    forceToScroll_ = options.scroll === "force" ? 2 : 0;
    addChildFrame = newAddChildFrame;
    const elements = getVisibleElements(view);
    const hintItems = elements.map(createHint);
    addChildFrame = null as never;
    bZoom_ !== 1 && adjustMarkers(hintItems, elements);
    frameInfo.h = hintItems;
    frameInfo.v = view;
}

const render = (hints: readonly HintItem[], arr: ViewBox, hud: MinimalHUDTy, raw_apis: VApiTy): void => {
    const masterOrA = master_ || baseHinter;
    if (box_) { box_.remove(); box_ = null; }
    hud_ = Build.BTypes & BrowserType.Firefox && master_ ? unwrap_ff(hud) : hud;
    api_ = Build.BTypes & BrowserType.Firefox && master_ ? unwrap_ff(raw_apis) : raw_apis;
    ensureBorder(wdZoom_ / dScale_);
    if (hints.length) {
      if (Build.BTypes & BrowserType.Chrome) {
        box_ = addElementList(hints, arr, masterOrA.d);
      } else {
        box_ = addElementList(hints, arr);
      }
    } else if (baseHinter === masterOrA) {
      adjustUI();
    }
    baseHinter.b = box_;
    /*#__INLINE__*/ set$keydownEvents_((Build.BTypes & BrowserType.Firefox ? api_ : raw_apis).a())
    /*#__INLINE__*/ set$onWndBlur2(masterOrA.s);
    removeHandler_(activate);
    pushHandler_(onKeydown, activate);
    master_ && setupEventListener(0, "unload", clear);
    baseHinter.a = isActive = 1;
}

const setMode = (mode: HintMode, silent?: 1): void => {
    lastMode_ = baseHinter.m = mode_ = mode;
    mode1_ = mode = mode & ~HintMode.queue;
    forHover_ = mode > HintMode.min_hovering - 1 && mode < HintMode.max_hovering + 1;
    if (silent || noHUD_) { return; }
    if (baseHinter.q < 0) {
      baseHinter.q = timeout_(SetHUDLater, 1500);
      return;
    }
    let msg = VTr(mode_), textSeq = keyStatus_.t;
    msg += useFilter_ ? ` [${textSeq}]` : "";
    if (Build.BTypes & BrowserType.Chrome) {
      msg += (master_ || baseHinter).d ? VTr(kTip.modalHints) : "";
    }
    return hud_.s(kTip.raw, [msg], true);
}

const SetHUDLater = (): void => {
    if (isAlive_ && isActive) { baseHinter.q = TimerID.None; setMode(mode_); }
}

const getPreciseChildRect = (frameEl: HTMLIFrameElement | HTMLElement, view: Rect): Rect | null => {
    const max = Math.max, min = Math.min, kVisible = "visible",
    brect = getBoundingClientRect_(frameEl),
    docEl = docEl_unsafe_(), body = doc.body, inBody = !!body && IsInDOM_(frameEl, body, 1),
    zoom = (Build.BTypes & BrowserType.Chrome ? docZoom_ * (inBody ? bZoom_ : 1) : 1
        ) / dScale_ / (inBody ? bScale_ : 1);
    let x0 = min(view.l, brect.left), y0 = min(view.t, brect.top), l = x0, t = y0, r = view.r, b = view.b;
    for (let el: Element | null = frameEl; el = GetParent_unsafe_(el, PNType.RevealSlotAndGotoParent); ) {
      const st = getComputedStyle_(el);
      if (st.overflow !== kVisible) {
        let outer = getBoundingClientRect_(el), hx = st.overflowX !== kVisible, hy = st.overflowY !== kVisible,
        scale = el !== docEl && inBody ? dScale_ * bScale_ : dScale_;
        hx && (l = max(l, outer.left), r = l + min(r - l, outer.width , hy ? el.clientWidth * scale : r));
        hy && (t = max(t, outer.top ), b = t + min(b - t, outer.height, hx ? el.clientHeight * scale : b));
      }
    }
    l = max(l, view.l), t = max(t, view.t);
    return l + 7 < r && t + 7 < b ? {
        l: (l - x0) * zoom, t: (t - y0) * zoom, r: (r - x0) * zoom, b: (b - y0) * zoom} : null;
}

export const tryNestedFrame = (
      cmd: Exclude<FgCmdAcrossFrames, kFgCmd.linkHints>, count: number, options: SafeObject): boolean => {
    if (frameNested_ !== null) {
      prepareCrop_();
      checkNestedFrame();
    }
    if (!frameNested_) { return false; }
    // let events: VApiTy | undefined, core: ContentWindowCore | null | 0 | void | undefined = null;
    const core = detectUsableChild(frameNested_);
    if (core) {
      core.f(cmd, count, options);
      if (readyState_ > "i") { frameNested_ = false; }
    } else {
      // It's cross-site, or Vimium C on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      frameNested_ = null;
    }
    return !!core;
}

const createHint = (link: Hint): HintItem => {
    let i: number = link.length < 4 ? link[1].l : (link as Hint4)[3][0].l + (link as Hint4)[3][1];
    const marker = createElement_("span") as MarkerElement, st = marker.style,
    isBox = link[2] > ClickType.MaxNotBox;
    marker.className = isBox ? "LH BH" : "LH";
    st.left = i + "px";
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && i > maxLeft_ && maxRight_) {
      st.maxWidth = maxRight_ - i + "px";
    }
    i = link[1].t;
    st.top = i + "px";
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && i > maxTop_) {
      st.maxHeight = maxTop_ - i + GlobalConsts.MaxHeightOfLinkHintMarker + "px";
    }
    return { // the order of keys is for easier debugging
      a: "",
      d: link[0],
      h: useFilter_ ? generateHintText(link) : null,
      i: 0,
      m: marker,
      r: link.length > 4 ? (link as Hint5)[4] : isBox ? link[0] : null
    };
}

const adjustMarkers = (arr: readonly HintItem[], elements: readonly Hint[]): void => {
    const zi = bZoom_;
    let i = arr.length - 1;
    if (!ui_root || i < 0 || arr[i].d !== omni_box && !ui_root.querySelector("#HelpDialog")) { return; }
    const z = Build.BTypes & ~BrowserType.Firefox ? ("" + 1 / zi).slice(0, 5) : "",
    mr = Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
        ? maxRight_ * zi : 0,
    mt = Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
        ? maxTop_ * zi : 0;
    while (0 <= i && ui_root.contains(arr[i].d)) {
      let st = arr[i--].m.style;
      Build.BTypes & ~BrowserType.Firefox && (st.zoom = z);
      if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinAbsolutePositionNotCauseScrollbar) {
        continue;
      }
      st.maxWidth && (st.maxWidth = mr - elements[i][1].l + "px");
      st.maxHeight && (st.maxHeight = mt - elements[i][1].t + 18 + "px");
    }
}

  /**
   * Must ensure only call {@link scroller.ts#VSc.shouldScroll_need_safe_} during {@link #getVisibleElements_}
   */
const getClickable = (hints: Hint[], element: SafeHTMLElement): void => {
    let arr: Rect | null | undefined, isClickable = null as boolean | null, s: string | null
      , type = ClickType.Default, anotherEl: Element | null, clientSize = 0;
    const tag = element.localName;
    switch (tag) {
    case "a":
      isClickable = true;
      arr = checkAnchor(element as HTMLAnchorElement);
      break;
    case "audio": case "video": isClickable = true; break;
    case "frame": case "iframe":
      if (isClickable = element !== find_box) {
        arr = getVisibleClientRect_(element);
        if (element !== omni_box) {
          isClickable = addChildFrame ? addChildFrame.call(baseHinter, 
              element as HTMLIFrameElement | HTMLFrameElement, arr) : !!arr;
        } else if (arr) {
          (arr as WritableRect).l += 12; (arr as WritableRect).t += 9;
        }
      }
      type = isClickable ? ClickType.frame : ClickType.Default;
      break;
    case "input":
      if ((element as HTMLInputElement).type === "hidden") { return; } // no break;
    case "textarea":
      // on C75, a <textarea disabled> is still focusable
      if ((element as TextElement).disabled && mode1_ < HintMode.max_mouse_events + 1) { return; }
      if (tag === "input" && uneditableInputs_[(element as HTMLInputElement).type]) {
        const st = getComputedStyle_(element), visible = <number> <string | number> st.opacity > 0;
        isClickable = visible || !(element as HTMLInputElement).labels.length;
        if (isClickable) {
          arr = getZoomedAndCroppedRect_(element as HTMLInputElement, st, !visible);
          type = arr ? ClickType.edit : ClickType.Default;
        }
      } else if (!(element as TextElement).readOnly || mode1_ > HintMode.min_job - 1) {
        type = ClickType.edit;
        isClickable = true;
      }
      break;
    case "details":
      isClickable = isNotReplacedBy(findMainSummary_(element as HTMLDetailsElement), hints);
      break;
    case "label":
      isClickable = isNotReplacedBy((element as HTMLLabelElement).control as SafeHTMLElement | null);
      break;
    case "button": case "select":
      isClickable = !(element as HTMLButtonElement | HTMLSelectElement).disabled
        || mode1_ > HintMode.max_mouse_events;
      break;
    case "object": case "embed":
      s = (element as HTMLObjectElement | HTMLEmbedElement).type;
      if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
      if (tag !== "embed"
          && (element as HTMLObjectElement).useMap) {
        getClientRectsForAreas_(element as HTMLObjectElement, hints);
      }
      return;
    case "img":
      if ((element as HTMLImageElement).useMap) {
        getClientRectsForAreas_(element as HTMLImageElement, hints);
      }
      if ((forHover_ && (!(anotherEl = element.parentElement) || htmlTag_(anotherEl) !== "a"))
          || ((s = element.style.cursor!) ? s !== "default"
              : (s = getComputedStyle_(element).cursor!) && (s.includes("zoom") || s.startsWith("url"))
          )) {
        isClickable = true;
      }
      break;
    case "div": case "ul": case "pre": case "ol": case "code": case "table": case "tbody":
      clientSize = 1;
      break;
    }
    if (isClickable === null) {
      type = (s = element.contentEditable) !== "inherit" && s && s !== "false" ? ClickType.edit
        : (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
            ? (anotherEl = (element as XrayedObject<SafeHTMLElement>).wrappedJSObject || element).onclick
              || (anotherEl as TypeToAssert<Element, SafeHTMLElement, "onmousedown">).onmousedown
            : element.getAttribute("onclick"))
          || (s = element.getAttribute("role")) && (<RegExpI> /^(?:button|checkbox|link|radio|tab)$|^menuitem/i).test(s)
          || ngEnabled && element.getAttribute("ng-click")
          || forHover_ && element.getAttribute("onmouseover")
          || jsaEnabled_ && (s = element.getAttribute("jsaction")) && checkJSAction(s)
        ? ClickType.attrListener
        : clickable_.has(element) && isClickListened_
          && inferTypeOfListener(element, tag)
        ? ClickType.codeListener
        : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 && !element.shadowRoot ? ClickType.tabindex
        : clientSize
          && ((clientSize = element.clientHeight) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
                && clientSize + 5 < element.scrollHeight ? ClickType.scrollY
              : clientSize > /* scrollbar:12 + font:9 */ 20
                && (clientSize = element.clientWidth) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
                && clientSize + 5 < element.scrollWidth ? ClickType.scrollX
              : ClickType.Default)
          || ((s = element.className)
                && (<RegExpOne> /\b(?:[Bb](?:utto|t)n|[Cc]lose|hate|like)(?:$|[-\sA-Z_])/).test(s)
                && (!(anotherEl = element.parentElement)
                    || (s = htmlTag_(anotherEl), !s.includes("button") && s !== "a"))
              || element.hasAttribute("aria-selected") ? ClickType.classname : ClickType.Default);
    }
    if ((isClickable || type !== ClickType.Default)
        && (arr = tag === "img" ? getZoomedAndCroppedRect_(element as HTMLImageElement, null, true)
                : arr || getVisibleClientRect_(element, null))
        && (type < ClickType.scrollX
          || shouldScroll_need_safe(element
              , (((type - ClickType.scrollX) as ScrollByY) + forceToScroll_) as BOOL | 2 | 3, 0) > 0)
        && isAriaNotTrue_(element, kAria.hidden)
        && (mode_ > HintMode.min_job - 1 || isAriaNotTrue_(element, kAria.disabled))
    ) { hints.push([element, arr, type]); }
}

const getClickableInMaybeSVG = (hints: Hint[], element: SVGElement | OtherSafeElement): void => {
    let anotherEl: SVGElement;
    let arr: Rect | null | undefined, s: string | null , type = ClickType.Default;
    const tabIndex = (element as ElementToHTMLorSVG).tabIndex;
    { // not HTML*
      {
        /** not use .codeListener | .classname, {@see #VHints.deduplicate_} */
        type = clickable_.has(element)
            || tabIndex != null && (!(Build.BTypes & ~BrowserType.Firefox)
                || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
                ? ((anotherEl = unwrap_ff(element as SVGElement))
                    ).onclick || anotherEl.onmousedown
                : element.getAttribute("onclick") || element.getAttribute("onmousedown"))
            || (s = element.getAttribute("role")) && (<RegExpI> /^button$/i).test(s)
            || ngEnabled && element.getAttribute("ng-click")
            || jsaEnabled_ && (s = element.getAttribute("jsaction")) && checkJSAction(s)
          ? ClickType.attrListener
          : tabIndex != null && tabIndex >= 0 ? element.localName === "a" ? ClickType.attrListener : ClickType.tabindex
          : ClickType.Default;
        if (type > ClickType.Default && (arr = getVisibleClientRect_(element, null))
            && isAriaNotTrue_(element, kAria.hidden)
            && (mode_ > HintMode.min_job - 1 || isAriaNotTrue_(element, kAria.disabled))
            ) {
          hints.push([element, arr, type]);
        }
      }
    }
}

const checkJSAction = (str: string): boolean => {
    for (let s of str.split(";")) {
      s = s.trim();
      const t = s.startsWith("click:") ? (s = s.slice(6)) : s && !s.includes(":") ? s : null;
      if (t && t !== "none" && !(<RegExpOne> /\._\b(?![\$\.])/).test(t)) {
        return true;
      }
    }
    return false;
}

const checkAnchor = (anchor: HTMLAnchorElement): Rect | null => {
    // for Google search result pages
    let mayBeSearchResult = !!(anchor.rel
          || (Build.BTypes & ~BrowserType.Chrome ? anchor.getAttribute("ping") : anchor.ping)),
    el = mayBeSearchResult && anchor.querySelector("h3,h4")
          || (mayBeSearchResult || anchor.childElementCount === 1) && anchor.firstElementChild as Element | null
          || null,
    tag = el ? htmlTag_(el) : "";
    return el && (mayBeSearchResult
          // use `^...$` to exclude custom tags
        ? (<RegExpOne> /^h\d$/).test(tag) && isNotReplacedBy(el as HTMLHeadingElement & SafeHTMLElement)
          ? getVisibleClientRect_(el as HTMLHeadingElement & SafeHTMLElement) : null
        : tag === "img" && !anchor.clientHeight
          ? getCroppedRect_(el as HTMLImageElement, getVisibleClientRect_(el as HTMLImageElement))
        : null);
}

const isNotReplacedBy = (element: SafeHTMLElement | null, isExpected?: Hint[]): boolean | null => {
    const arr2: Hint[] = [], clickListened = isClickListened_;
    if (element) {
      if (!isExpected && (element as TypeToAssert<HTMLElement, HTMLInputElement, "disabled">).disabled) { return !1; }
      isExpected && (clickable_.add(element), isClickListened_ = !0);
      getClickable(arr2, element);
      isClickListened_ = clickListened;
      if (!clickListened && isExpected && arr2.length && arr2[0][2] === ClickType.codeListener) {
        getClickable(arr2, element);
        if (arr2.length < 2) { // note: excluded during normal logic
          isExpected.push(arr2[0]);
        }
      }
    }
    return element ? !arr2.length : !!isExpected || null;
}

const inferTypeOfListener = (el: SafeHTMLElement, tag: string): boolean => {
    // Note: should avoid nested calling to isNotReplacedBy_
    let el2: Element | null | undefined;
    return tag !== "div" && tag !== "li"
        ? tag === "tr"
          ? (el2 = el.querySelector("input[type=checkbox]") as SafeElement | null,
            !!(el2 && htmlTag_(el2) && isNotReplacedBy(el2 as SafeHTMLElement)))
          : tag !== "table"
        : !(el2 = el.firstElementChild as Element | null) ||
          !(!el.className && !el.id && tag === "div"
            || ((tag = htmlTag_(el2)) === "div" || tag === "span") && clickable_.has(el2)
                && el2.getClientRects().length
            || ((tag !== "div"
                  || !!(el2 = (el2 as HTMLDivElement).firstElementChild as Element | null,
                        tag = el2 ? htmlTag_(el2) : ""))
                && (<RegExpOne> /^h\d$/).test(tag)
                && (el2 = (el2 as HTMLHeadingElement).firstElementChild as Element | null)
                && htmlTag_(el2) === "a")
          );
}

  /** Note: required by {@link #kFgCmd.focusInput}, should only add LockableElement instances */
export const getEditable = (hints: Hint[], element: SafeHTMLElement): void => {
    let arr: Rect | null, s: string;
    switch (element.localName) {
    case "input":
      if (uneditableInputs_[(element as HTMLInputElement).type]) {
        return;
      } // no break;
    case "textarea":
      if ((element as TextElement).disabled || (element as TextElement).readOnly) { return; }
      break;
    default:
      if ((s = element.contentEditable) === "inherit" || s === "false" || !s) {
        return;
      }
      break;
    }
    if (arr = getVisibleClientRect_(element)) {
      hints.push([element as LockableElement, arr, ClickType.edit]);
    }
}

const getLinks = (hints: Hint[], element: SafeHTMLElement): void => {
    let a: string | null | false, arr: Rect | null;
    if ((a = element.dataset.vimUrl || element.localName === "a" && element.getAttribute("href")) && a !== "#"
        && !jsRe_.test(a)) {
      if (arr = getVisibleClientRect_(element)) {
        hints.push([element, arr, ClickType.Default]);
      }
    }
}

const getImages = (hints: Hint[], element: SafeHTMLElement): void => {
    const tag = element.localName;
    let str: string | null | undefined, cr: Rect | null | undefined;
    if (tag === "img") {
      // according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement#Browser_compatibility,
      // <img>.currentSrc is since C45
      str = element.getAttribute("src") || (element as HTMLImageElement).currentSrc || element.dataset.src;
      if (str) {
        let rect = getBoundingClientRect_(element)
          , l = rect.left, t = rect.top, w = rect.width, h = rect.height;
        if (w < 8 && h < 8) {
          w = h = w === h && (w ? w === 3 : l || t) ? 8 : 0;
        } else {
          w > 3 ? 0 : w = 3;
          h > 3 ? 0 : h = 3;
        }
        cr = cropRectToVisible_(l, t, l + w, t + h);
        cr = cr && isStyleVisible_(element) ? getCroppedRect_(element, cr) : null;
      }
    } else {
      if (mode1_ === HintMode.DOWNLOAD_MEDIA && (tag === "video" || tag === "audio")) {
        str = (element as unknown as HTMLImageElement).currentSrc || (element as unknown as HTMLImageElement).src;
      } else {
        str = element.dataset.src || element.getAttribute("href");
        if (!isImageUrl(str)) {
          str = element.style.backgroundImage!;
          str = str && (<RegExpI> /^url\(/i).test(str) ? str : "";
        }
      }
      cr = str ? getVisibleClientRect_(element) : cr;
    }
    cr && hints.push([element, cr, ClickType.Default]);
  }

  /** @safe_even_if_any_overridden_property */
export const traverse = function (selector: string
      , filter: Filter<Hint | SafeHTMLElement>, notWantVUI?: boolean
      , wholeDoc?: true): Hint[] | SafeHTMLElement[] {
    if (!Build.NDEBUG && Build.BTypes & ~BrowserType.Firefox && selector === "*") {
      selector = kSafeAllSelector; // for easier debugging
    }
    const matchAll = selector === kSafeAllSelector,
    output: Hint[] | SafeHTMLElement[] = [],
    wantClickable = filter === getClickable,
    isInAnElement = !Build.NDEBUG && !!wholeDoc && (wholeDoc as unknown) instanceof Element,
    box = !wholeDoc && fullscreenEl_unsafe_()
        || !Build.NDEBUG && isInAnElement && wholeDoc as unknown as Element
        || doc,
    isD = box === doc,
    querySelectorAll = Build.BTypes & ~BrowserType.Firefox
      ? /* just smaller code */ (isD ? doc : Element.prototype).querySelectorAll : box.querySelectorAll;
    let list: HintSources | null = querySelectorAll.call(box, selector) as NodeListOf<SafeElement>;
    wantClickable && getPixelScaleToScroll();
    if (matchAll) {
      if (ngEnabled === null) {
        ngEnabled = !!querySelector_unsafe_(".ng-scope");
      }
      if (jsaEnabled_ === null) {
        jsaEnabled_ = !!querySelector_unsafe_("[jsaction]");
      }
    }
    if (!matchAll) {
      list = addChildTrees(list, querySelectorAll.call(box, kSafeAllSelector) as NodeListOf<SafeElement>);
    }
    if (!wholeDoc && tooHigh_ && isD && list.length >= GlobalConsts.LinkHintPageHeightLimitToCheckViewportFirst) {
      list = getElementsInViewport(list);
    }
    if (!Build.NDEBUG && isInAnElement) {
      // just for easier debugging
      list = [].slice.call(list);
      (list as SafeElement[]).unshift(wholeDoc as unknown as SafeElement);
    }
    for (const tree_scopes: Array<[HintSources, number]> = [[list, 0]]; tree_scopes.length > 0; ) {
      let cur_scope = tree_scopes[tree_scopes.length - 1], [cur_tree, i] = cur_scope, len = cur_tree.length;
      for (; i < len; ) {
        const el = cur_tree[i++] as SafeElement & {lang?: undefined} | SafeHTMLElement;
        if (el.lang != null) {
          filter(output, el);
          const shadowRoot = (Build.BTypes & BrowserType.Chrome
                && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                && fgCache.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
              ? el.webkitShadowRoot : el.shadowRoot) as ShadowRoot | null | undefined;
          if (shadowRoot) {
            let sub_tree: HintSources = shadowRoot.querySelectorAll(selector) as NodeListOf<SafeElement>;
            if (!matchAll) {
              sub_tree = addChildTrees(sub_tree,
                  shadowRoot.querySelectorAll(kSafeAllSelector) as NodeListOf<SafeElement>);
            }
            cur_scope[1] = i;
            tree_scopes.push([sub_tree, i = 0]);
            break;
          }
        } else if (wantClickable) {
          /*#__NOINLINE__*/ getClickableInMaybeSVG(output as Exclude<typeof output, SafeHTMLElement[]>
              , el as SVGElement | OtherSafeElement);
        }
      }
      if (i >= len) {
        tree_scopes.pop();
      }
    }
    if (wholeDoc && (Build.NDEBUG || !isInAnElement)) {
      // this requires not detecting scrollable elements if wholeDoc
      if (!(Build.NDEBUG || !wantClickable && !isInAnElement)) {
        console.log("Assert error: `!wantClickable if wholeDoc` in VHints.traverse_");
      }
      return output;
    }
    list = null;
    if (Build.BTypes & ~BrowserType.Edge && ui_root
        && ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          || ui_root !== ui_box)
        // now must have shadow DOM, because `UI.root_` !== `UI.box_`
        && !notWantVUI
        && (Build.NDEBUG && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
          || ui_root.mode === "closed")
        ) {
      const bz = bZoom_, notHookScroll = scrolled === 0;
      if (bz !== 1 && isD) {
        /*#__INLINE__*/ set$bZoom_(1)
        prepareCrop_(1);
      }
      for (const el of (<ShadowRoot> ui_root).querySelectorAll(selector)) {
        filter(output, el as SafeHTMLElement);
      }
      /*#__INLINE__*/ set$bZoom_(bz)
      if (notHookScroll) {
        /*#__INLINE__*/ resetScrolled()
      }
    }
    scrolled === 1 && suppressScroll();
    if (wantClickable) { deduplicate(output as Hint[]); }
    if (frameNested_ === null) { /* empty */ }
    else if (wantClickable) {
      checkNestedFrame(output as Hint[]);
    } else if (output.length > 0) {
      frameNested_ = null;
    }
    return output;
} as {
    (key: string, filter: Filter<SafeHTMLElement>, notWantVUI?: true, wholeDoc?: true): SafeHTMLElement[];
    (key: string, filter: Filter<Hint>, notWantVUI?: boolean): Hint[];
}

const addChildTrees = (list: HintSources, allNodes: NodeListOf<SafeElement>): HintSources => {
    let matchWebkit = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                      && fgCache.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0;
    let hosts: SafeElement[] = [], matched: SafeElement | undefined;
    for (let i = 0, len = allNodes.length; i < len; i++) {
      let el = allNodes[i], tag: string;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            && matchWebkit ? el.webkitShadowRoot : el.shadowRoot) {
        hosts.push(matched = el);
      } else if (((tag = el.localName) === "iframe" || tag === "frame") && addChildFrame
          && htmlTag_(el)) {
        if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            || el !== omni_box && el !== find_box) {
          addChildFrame.call(baseHinter, el as HTMLIFrameElement | HTMLFrameElement, getVisibleClientRect_(el));
        }
      }
    }
    return matched ? [].slice.call<ArrayLike<SafeElement>, [], SafeElement[]>(list).concat(hosts) : list;
}

const getElementsInViewport = (list: HintSources): HintSources => {
    const result: SafeElement[] = [], height = innerHeight;
    for (let i = 1, len = list.length; i < len; i++) { // skip docEl
      const el = list[i];
      const cr = getBoundingClientRect_(el);
      if (cr.bottom > 0 && cr.top < height) {
        result.push(el);
        continue;
      }
      const last = el.lastElementChild;
      if (!last) { continue; }
      if (Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(el)) { continue; }
      while (list[++i] !== last) { /* empty */ }
      i--;
    }
    return result.length > 12 ? result : list;
}

const deduplicate = (list: Hint[]): void => {
    let i = list.length, j: number, k: ClickType, s: string, notRemoveParents: boolean;
    let element: Element | null, prect: Rect, crect: Rect | null;
    while (0 <= --i) {
      k = list[i][2];
      notRemoveParents = k === ClickType.classname;
      if (!notRemoveParents) {
        if (k === ClickType.codeListener) {
          if (s = ((element = list[i][0]) as SafeHTMLElement).localName, s === "i" || s === "div") {
            if (notRemoveParents
                = i > 0 && (<RegExpOne> /\b(button|a$)/).test(list[i - 1][0].localName)
                ? (s < "i" || !element.innerHTML.trim()) && isDescendant(element, list[i - 1][0], s < "i")
                : !!(element = (element as SafeHTMLElement).parentElement)
                  && htmlTag_(element) === "button" && (element as HTMLButtonElement).disabled
                ) {
              // icons: button > i; button > div@mousedown; (button[disabled] >) div@mousedown
              list.splice(i, 1);
            }
          } else if (s === "div"
              && (j = i + 1) < list.length
              && (s = list[j][0].localName, s === "div" || s === "a")) {
            prect = list[i][1]; crect = list[j][1];
            if (notRemoveParents
                = crect.l < prect.l + /* icon_16 */ 19 && crect.t < prect.t + 9
                && crect.l > prect.l - 4 && crect.t > prect.t - 4 && crect.b > prect.b - 9
                && (s !== "a" || element.contains(list[j][0]))) {
              // the `<a>` is a single-line box's most left element and the first clickable element,
              // so think the box is just a layout container
              // for [i] is `<div>`, not limit the height of parent `<div>`,
              // if there's more content, it should have hints for itself
              list.splice(i, 1);
            }
          }
        } else if (k === ClickType.tabindex
            && (element = list[i][0]).childElementCount === 1 && i + 1 < list.length) {
          element = element.lastElementChild as Element;
          prect = list[i][1];
          crect = Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(element) ? null
              : getVisibleClientRect_(element as SafeElement);
          if (crect && isContaining_(crect, prect) && htmlTag_(element)) {
            if (list[i + 1][0].parentNode !== element) {
              list[i] = [element as SafeHTMLElement, crect, ClickType.tabindex];
            } else if (list[i + 1][2] === ClickType.codeListener) {
              // [tabindex] > :listened, then [i] is only a layout container
              list.splice(i, 1);
            }
          }
        } else if (notRemoveParents
            = k === ClickType.edit && i > 0 && (element = list[i - 1][0]) === list[i][0].parentNode
            && element.childElementCount < 2 && element.localName === "a"
            && !(element as TypeToPick<Element, HTMLElement, "innerText">).innerText) {
          // a rare case that <a> has only a clickable <input>
          list.splice(--i, 1);
        }
        j = i;
      }
      else if (i + 1 < list.length && list[j = i + 1][2] < ClickType.edit + 1
          && isDescendant(element = list[j][0], list[i][0], 0)
          && (list[j][2] > ClickType.edit - 1 || (<RegExpOne> /\b(button|a$)/).test((element as Hint[0]).localName))) {
        list.splice(i, 1);
      }
      else if (j = i - 1, i < 1 || (k = list[j][2]) > ClickType.MaxWeak
          || !isDescendant(list[i][0], list[j][0], 1)) {
        /* empty */
      } else if (isContaining_(list[j][1], list[i][1])) {
        list.splice(i, 1);
      } else {
        notRemoveParents = k < ClickType.MinWeak;
      }
      if (notRemoveParents) { continue; }
      for (; j > i - 3 && 0 < j
            && (k = list[j - 1][2]) > ClickType.MaxNotWeak && k < ClickType.MinNotWeak
            && isDescendant(list[j][0], list[j - 1][0], 1)
          ; j--) { /* empty */ }
      if (j < i) {
        list.splice(j, i - j);
        i = j;
      }
    }
    while (list.length && ((element = list[0][0]) === docEl_unsafe_() || element === doc.body)) {
      list.shift();
    }
}

const isDescendant = function (c: Element | null, p: Element, shouldBeSingleChild: BOOL | boolean): boolean {
    // Note: currently, not compute normal shadowDOMs / even <slot>s (too complicated)
    let i = 3, f: Node | null;
    while (0 < i-- && c
        && (c = Build.BTypes & ~BrowserType.Firefox ? GetParent_unsafe_(c, PNType.DirectElement)
                : c.parentElement as Element | null)
        && c !== p
        && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
              && unsafeFramesetTag_old_cr_ && notSafe_not_ff_!(c))
        ) { /* empty */ }
    if (c !== p
        || !shouldBeSingleChild || (<RegExpOne> /\b(button|a$)/).test(p.localName as string)) {
      return c === p;
    }
    for (; c.childElementCount === 1
          && ((f = c.firstChild!).nodeType !== kNode.TEXT_NODE || !(f as Text).data.trim())
          && ++i < 3
        ; c = c.lastElementChild as Element | null as Element) { /* empty */ }
    return i > 2;
} as (c: Element, p: Element, shouldBeSingleChild: BOOL | boolean) => boolean

const filterOutNonReachable = (list: Hint[]): void => {
    if (!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && VOther & BrowserType.Edge) { return; }
    if (!fgCache.e) { return; }
    if (Build.BTypes & BrowserType.Chrome && (Build.MinCVer < BrowserVer.Min$Node$$getRootNode
          || Build.MinCVer < BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint)
        && fgCache.v < (BrowserVer.Min$Node$$getRootNode > BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint
            ? BrowserVer.Min$Node$$getRootNode : BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint)) {
      return;
    }
    if (Build.BTypes & BrowserType.Chrome && isDocZoomStrange_ && docZoom_ - 1) {
      return;
    }
    let i = list.length, el: SafeElement, root: Document | ShadowRoot, localName: string,
    fromPoint: Element | null | undefined, temp: Element | null, index2 = 0;
    const zoom = Build.BTypes & BrowserType.Chrome ? docZoom_ * bZoom_ : 1,
    zoomD2 = Build.BTypes & BrowserType.Chrome ? zoom / 2 : 0.5,
    body = doc.body, docEl = docEl_unsafe_(),
    // note: exclude the case of `fromPoint.contains(el)`, to exclude invisible items in lists
    does_hit: (x: number, y: number) => boolean = !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
        ? (x: number, y: number): boolean => {
      fromPoint = root.elementFromPoint(x, y);
      return fromPoint ? el === fromPoint || el.contains(fromPoint) : root === doc;
    } : (x, y): boolean => {
      fromPoint = root.elementFromPoint(x, y);
      return !fromPoint || el === fromPoint || el.contains(fromPoint);
    };
    while (0 <= --i) {
      el = list[i][0];
      root = el.getRootNode!() as Document | ShadowRoot;
      const nodeType = root.nodeType, area = list[i][1],
      cx = (area.l + area.r) * zoomD2, cy = (area.t + area.b) * zoomD2;
      if (nodeType !== kNode.DOCUMENT_NODE && nodeType !== kNode.DOCUMENT_FRAGMENT_NODE
          || does_hit(cx, cy)) {
        continue;
      }
      if (Build.BTypes & BrowserType.Firefox && !fromPoint) {
        list.splice(i, 1);
        continue;
      }
      if (nodeType === kNode.DOCUMENT_FRAGMENT_NODE
          && (temp = el.lastElementChild as Element | null)
          && htmlTag_(temp) === "slot"
          && (root as ShadowRoot).host.contains(fromPoint!)) {
        continue;
      }
      localName = el.localName;
      if (localName === "img"
          ? isDescendant(el, fromPoint!, 0)
          : localName === "area" && fromPoint === list[i][4]) {
        continue;
      }
      const stack = root.elementsFromPoint(cx, cy),
      elPos = stack.indexOf(el);
      if (elPos > 0 ? (index2 = stack.lastIndexOf(fromPoint!, elPos - 1)) >= 0
          : elPos < 0) {
        if (!(Build.BTypes & BrowserType.Firefox) ? elPos < 0
            : Build.BTypes & ~BrowserType.Firefox && VOther & ~BrowserType.Firefox && elPos < 0) {
          for (temp = el
              ; (temp = GetParent_unsafe_(temp, PNType.RevealSlot)) && temp !== body && temp !== docEl
              ; ) {
            if (getComputedStyle_(temp).zoom !== "1") { temp = el; break; }
          }
        } else {
          while (temp = stack[index2], index2++ < elPos
              && !(Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(temp))
              && !isAriaNotTrue_(temp as SafeElement, kAria.hidden)) { /* empty */ }
          temp = temp !== fromPoint && el.contains(temp) ? el : temp;
        }
        temp === el
        || does_hit(cx, Build.BTypes & BrowserType.Chrome ? (area.t + 2) * zoom : area.t + 2) // x=center, y=top
        || does_hit(cx, Build.BTypes & BrowserType.Chrome ? (area.b - 4) * zoom : area.b - 4) // x=center, y=bottom
        || does_hit(Build.BTypes & BrowserType.Chrome ? (area.l + 2) * zoom : area.l + 2, cy) // x=left, y=center
        || does_hit(Build.BTypes & BrowserType.Chrome ? (area.r - 4) * zoom : area.r - 4, cy) // x=right, y=center
        || list.splice(i, 1);
      }
    }
}

const checkNestedFrame = (output?: Hint[]): void => {
    const res = output && output.length > 1 ? null : !frames.length ? false
      : fullscreenEl_unsafe_()
      ? 0 : getNestedFrame(output);
    frameNested_ = res === false && readyState_ < "i" ? null : res;
}

const getNestedFrame = (output?: Hint[]): NestedFrame => {
    if (output == null) {
      if (!isHTML_()) { return false; }
      output = [];
      for (let el of querySelectorAll_unsafe_("a,button,input,frame,iframe")) {
        if ((el as ElementToHTML).lang != null) {
          getClickable(output, el as SafeHTMLElement);
        }
      }
    }
    if (output.length !== 1) {
      return output.length !== 0 && null;
    }
    let rect: ClientRect | undefined, rect2: ClientRect, element = output[0][0];
    if ((<RegExpI> /^i?frame$/).test(htmlTag_(element))
        && (rect = getBoundingClientRect_(element),
            rect2 = getBoundingClientRect_(docEl_unsafe_()!),
            rect.top - rect2.top < 20 && rect.left - rect2.left < 20
            && rect2.right - rect.right < 20 && rect2.bottom - rect.bottom < 20)
        && isStyleVisible_(element)
    ) {
      return element as HTMLFrameElement | HTMLIFrameElement;
    }
    return null;
}

const getVisibleElements = (view: ViewBox): readonly Hint[] => {
    let _i: number = mode1_,
    visibleElements = _i > HintMode.min_media - 1 && _i < HintMode.max_media + 1
      // not check `img[src]` in case of `<img srcset=... >`
      ? traverse("a[href],img,div[style],span[style],[data-src]"
          + (Build.BTypes & ~BrowserType.Firefox ? kSafeAllSelector : "")
          + (_i - HintMode.DOWNLOAD_MEDIA ? "" : ",video,audio"), getImages, true)
      : _i > HintMode.min_link_job - 1 && _i < HintMode.max_link_job + 1
      ? traverse("a,[role=link]" + (Build.BTypes & ~BrowserType.Firefox ? kSafeAllSelector : ""), getLinks)
      : _i - HintMode.FOCUS_EDITABLE ? traverse(kSafeAllSelector, getClickable)
      : traverse(Build.BTypes & ~BrowserType.Firefox
            ? kEditableSelector + kSafeAllSelector : kEditableSelector, getEditable);
    if (_i < HintMode.max_mouse_events + 1
        && visibleElements.length < GlobalConsts.MinElementCountToStopPointerDetection) {
      filterOutNonReachable(visibleElements);
    }
    maxLeft_ = view[2], maxTop_ = view[3], maxRight_ = view[4];
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && maxRight_ > 0) {
      _i = Math.ceil(Math.log(visibleElements.length) / Math.log(chars_.length));
      maxLeft_ -= 16 * _i + 12;
    }
    visibleElements.reverse();

    const obj = {l: null as never, t: null as never} as {l: Rect[]; t: Rect}, func = SubtractSequence_.bind(obj);
    let r2 = null as Rect[] | null, t: Rect, reason: ClickType, visibleElement: Hint;
    for (let _len = visibleElements.length, _j = Math.max(0, _len - 16); 0 < --_len; ) {
      _j > 0 && --_j;
      visibleElement = visibleElements[_len];
      if (visibleElement[2] > ClickType.MaxNotBox) { continue; }
      let r = visibleElement[1];
      for (_i = _len; _j <= --_i; ) {
        t = visibleElements[_i][1];
        if (r.b > t.t && r.r > t.l && r.l < t.r && r.t < t.b && visibleElements[_i][2] < ClickType.MaxNotBox + 1) {
          obj.l = []; obj.t = t;
          r2 !== null ? r2.forEach(func) : func(r);
          if ((r2 = obj.l).length === 0) { break; }
        }
      }
      if (r2 === null) { continue; }
      if (r2.length > 0) {
        t = r2[0];
        t.t > maxTop_ && t.t > r.t || t.l > maxLeft_ && t.l > r.l ||
          r2.length === 1 && (t.b - t.t < 3 || t.r - t.l < 3) || (visibleElement[1] = t);
      } else if ((reason = visibleElement[2]) > ClickType.MaxNotWeak && reason < ClickType.MinNotWeak
          && visibleElement[0].contains(visibleElements[_i][0])) {
        visibleElements.splice(_len, 1);
      } else {
        visibleElement.length > 3 && (r = (visibleElement as Hint4)[3][0]);
        for (let _k = _len; _i <= --_k; ) {
          t = visibleElements[_k][1];
          if (r.l >= t.l && r.t >= t.t && r.l < t.l + 10 && r.t < t.t + 8) {
            const offset: HintOffset = [r, visibleElement.length > 3 ? (visibleElement as Hint4)[3][1] + 13 : 13];
            (visibleElements[_k] as Hint4)[3] = offset;
            break;
          }
        }
      }
      r2 = null;
    }
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && GlobalConsts.MaxLengthOfShownText > 0 && useFilter_) {
      maxLeft_ -= 16 * (GlobalConsts.MaxLengthOfShownText >>> 2);
    }
    return visibleElements.reverse();
}

const onKeydown = (event: HandlerNS.Event): HandlerResult => {
    let matchedHint: ReturnType<typeof matchHintsByKey>, i: number = event.i, key: string, keybody: kChar;
    if (master_) {
      /*#__INLINE__*/ set$keydownEvents_(api_.a());
      return master_.n(event);
    } else if (Build.BTypes & BrowserType.Chrome && onWaitingKey) {
      onWaitingKey(event);
    } else if (event.e.repeat || !isActive) {
      // NOTE: should always prevent repeated keys.
    } else if (i === kKeyCode.ime) {
      clear(1);
      hudTip(kTip.exitForIME);
      return HandlerResult.Nothing;
    } else if (key = key_(event, kModeId.Link), keybody = keybody_(key),
        isEscape_(key) || onTailEnter && keybody === kBackspace) {
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
          locateHint(activeHint_!).$(activeHint_!);
        } else if (key[0] === "s") {
          // `/^s-(f1|f0[a-z0-9]+)$/`
          for (const frame of frameList_) {
            frame.s.b!.classList.toggle("HM-" + keybody);
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
            || !VApi.e) {
          resetMode(); return HandlerResult.Prevent;
        }
        isClickListened_ = true;
        if (Build.BTypes & ~BrowserType.Firefox) {
          VApi.e(kContentCmd.ManuallyFindAllOnClick);
        }
      }
      resetMode(1);
      /*#__NOINLINE__*/ reinitInNextTick()
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
      /*#__NOINLINE__*/ reinitInNextTick()
    } else if (keybody === kChar.space && (!useFilter_ || key !== keybody)) {
      keyStatus_.t = keyStatus_.t.replace("  ", " ");
      zIndexes_ !== 0 && rotateHints(key === "s-" + keybody);
      resetMode();
    } else if (matchedHint = matchHintsByKey(keyStatus_, event, key, keybody), matchedHint === 0) {
      // then .keyStatus_.hintSequence_ is the last key char
      clear(0, keyStatus_.n ? 0 : fgCache.k[0]);
    } else if (matchedHint !== 2) {
      lastMode_ = mode_;
      locateHint(matchedHint).e(matchedHint, event);
    }
    return HandlerResult.Prevent;
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
    return baseHinter;
}

const highlightHint = (hint: HintItem): void => {
  flash_(hint.m, null, 660, " Sel")
  box_!.classList.toggle("HMM")
}

const resetMode = (silent?: 1): void => {
    if (lastMode_ !== mode_ && mode_ < HintMode.min_disable_queue) {
      let d = keydownEvents_;
      if (d[kKeyCode.ctrlKey] || d[kKeyCode.metaKey] || d[kKeyCode.shiftKey] || d[kKeyCode.altKey]
          || d[kKeyCode.osRightMac] || d[kKeyCode.osRightNonMac]) {
        setMode(lastMode_, silent);
      }
    }
}

const delayToExecute = (slave: BaseHinter, hint: HintItem, flashEl: SafeHTMLElement | null): void => {
    const waitEnter = Build.BTypes & BrowserType.Chrome && fgCache.w,
    callback = (event?: HandlerNS.Event, key?: string, keybody?: string): void => {
      let closed: void | 1 | 2 = 1;
      try {
        closed = slave.x(1);
      } catch {}
      if (closed !== 2) {
        isActive && (clear(), hudTip(kTip.linkRemoved));
        return;
      }
      if (event) {
        tick = waitEnter && keybody === kChar.space ? tick + 1 : 0;
        tick === 3 || keybody === kChar.enter ? slave.e(hint, event)
        : key === kChar.f1 && flashEl ? flashEl.classList.toggle("Sel") : 0;
      } else {
        slave.e(hint);
      }
    };
    let tick = 0;
    onTailEnter = callback;
    box_!.remove();
    baseHinter.b = box_ = null;
    Build.BTypes & BrowserType.Firefox && (slave = unwrap_ff(slave));
    if (Build.BTypes & BrowserType.Chrome && !waitEnter) {
      onWaitingKey = suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents
          , callback);
      removeHandler_(onWaitingKey);
    } else {
      hudShow(kTip.waitEnter);
    }
}

const executeHint = (hint: HintItem, event?: HandlerNS.Event): void => {
    const masterOrA = master_ || baseHinter, keyStatus = masterOrA.k;
    let rect: Rect | null | undefined, clickEl: LinkEl | null = hint.d;
    if (master_) {
      /*#__INLINE__*/ set$keydownEvents_(api_.a());
      setMode(master_.m, 1);
    }
    if (event) {
      prevent_(event.e);
      keydownEvents_[keyCode_ = event.i] = 1;
    }
    masterOrA.v(); // here .keyStatus_ is reset
    hud_.a(1);
    if (IsInDOM_(clickEl)) {
      // must get outline first, because clickEl may hide itself when activated
      // must use UI.getRect, so that zooms are updated, and prepareCrop is called
      rect = getRect(clickEl, hint.r !== clickEl ? hint.r as HTMLElementUsingMap | null : null);
      if (keyStatus.t && !keyStatus.k && !keyStatus.n) {
        if ((!(Build.BTypes & BrowserType.Chrome)
              || Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome
              || Build.MinCVer < BrowserVer.MinUserActivationV2 && fgCache.v < BrowserVer.MinUserActivationV2)
            && !fgCache.w) {
          // e.g.: https://github.com/philc/vimium/issues/3103#issuecomment-552653871
          suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents);
        } else {
          removeFlash = rect && flash_(null, rect, -1);
          return masterOrA.j(baseHinter, hint, rect && lastFlashEl);
        }
      }
      master_ && focus();
      // tolerate new rects in some cases
      const showRect = modeOpt_[0](clickEl, rect, hint);
      if (!removeFlash && showRect !== false && (rect || (rect = getVisibleClientRect_(clickEl)))) {
        timeout_(function (): void {
          (showRect || doc.hasFocus()) && flash_(null, rect!);
        }, 17);
      }
    } else {
      clickEl = null;
      hud_.t(kTip.linkRemoved, 2000);
    }
    removeFlash && removeFlash();
    removeFlash = null;
    hud_.a();
    if (!(mode_ & HintMode.queue)) {
      masterOrA.w(baseHinter, clickEl);
      masterOrA.c(<1 | 0> -masterOrA.q, 0);
      (<RegExpOne> /0?/).test("");
      return;
    }
    masterOrA.z(baseHinter, clickEl, rect);
}

const accessHudText = (beforeExecute?: 1): void => {
  if (beforeExecute) {
    hudResetTextProp()
  } else {
    baseHinter.q = -!!hud_text
  }
}

const postExecute = (slave: BaseHinter, clickEl: LinkEl | null, rect?: Rect | null): void => {
    baseHinter.a = isActive = 0;
    setupCheck();
    timeout_(function (): void {
      reinit(slave, clickEl, rect);
      if (isActive && 1 === --count_) {
        setMode(mode1_);
      }
    }, frameList_.length > 1 ? 50 : 18);
}

const reinitInNextTick = (): void => { timeout_((): void => { reinit() }, 0) }

  /** should only be called on master */
const reinit = (slave?: BaseHinter | null, lastEl?: LinkEl | null, rect?: Rect | null): void => {
    if (!isEnabled_) {
      isAlive_ && clear();
      return;
    }
    baseHinter.a = isActive = 0;
    resetHints();
    activate(0, options_);
    setupCheck(slave, lastEl, rect);
}

  /** should only be called on master */
const setupCheck = (slave?: BaseHinter | null, el?: LinkEl | null, r?: Rect | null): void => {
    _timer && clearTimeout_(_timer);
    _timer = slave && el && mode1_ < HintMode.min_job ? timeout_((i): void => {
      _timer = TimerID.None;
      let doesReinit: BOOL | void = 0;
      try {
        Build.BTypes & BrowserType.Firefox && (slave = unwrap_ff(slave!));
        Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i ||
        slave && (doesReinit = slave.x(el, r));
      } catch {}
      doesReinit && reinit();
      for (const frame of isActive ? frameList_ : []) {
        frame.s.h = 1;
      }
    }, frameList_.length > 1 ? 380 : 255) : TimerID.None;
}
  // if not el, then reinit if only no key stroke and hints.length < 64
export const checkLast = function (this: void, el?: LinkEl | TimerType.fake | 1, r?: Rect | null): void | BOOL | 2 {
    if (!isAlive_) { return; }
    if (window.closed) { return 1; }
    if (el === 1) { return 2; }
    const masterOrA = master_ || baseHinter;
    const r2 = el && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinNo$TimerType$$Fake
                      /** @todo: remove comments here, which was to work around a bug of TypeScript 3.9 beta */
                      /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
                      // @ts-expect-error
                      || el !== TimerType.fake
                      ) ? getBoundingClientRect_(el as LinkEl) : null,
                      /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
    hidden = !r2 || r2.width < 2 && r2.height < 2
        || !isStyleVisible_(el as LinkEl); // use 2px: may be safer
    if (hidden && lastHovered_ === el) {
      /*#__INLINE__*/ set$lastHovered_(null)
    }
    if ((!r2 || r) && masterOrA.a
        && masterOrA.l!.length < (
              masterOrA.f.length > 1 ? 200 : 100)
        && !masterOrA.k.k
        && (hidden || Math.abs(r2!.left - r!.l) > 100 || Math.abs(r2!.top - r!.t) > 60)) {
      if (master_) { return 1; }
      masterOrA.i();
    }
} as {
    (el?: LinkEl | TimerType.fake, r?: Rect | null): void | BOOL;
    (el: 1, r?: Rect | null): void | 1 | 2;
}

const resetHints = (): void => {
    // here should not consider about ._master
    if (Build.BTypes & BrowserType.Chrome) { onWaitingKey = null; }
    onTailEnter = pageNumberHints_ =
    (baseHinter as Writable<BaseHinter>).l = hints_ = zIndexes_ = activeHint_ = null as never;
    baseHinter.q > TimerID.None &&
    (clearTimeout_(baseHinter.q), baseHinter.q = TimerID.None);
    baseHinter.h = 0;
    keyStatus_ && (keyStatus_.c = null as never);
    (baseHinter as Writable<Master>).k = keyStatus_ = {
      c: null as never,
      k: "", t: "",
      n: 0, b: 0
    };
    for (const frame of frameList_) {
      frame.h = [];
    }
}

export const clear = (keepHudOrEvent?: 0 | 1 | 2 | Event, suppressTimeout?: number): void => {
  if (!isAlive_) { return; }
    if (keepHudOrEvent === 2 || keepHudOrEvent && keepHudOrEvent !== 1
        && (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted
            ? keepHudOrEvent.isTrusted !== !1 : keepHudOrEvent.isTrusted)
        && keepHudOrEvent.target === doc) {
      master_ && master_.u(baseHinter);
      if (keepHudOrEvent !== 2) {
        return;
      }
    }
    const master = master_;
    master_ = null;
    master && master.c(keepHudOrEvent, suppressTimeout);
    frameList_.forEach(cleanFrameInfo, suppressTimeout);
    baseHinter.y = (baseHinter as Writable<Master>).f = frameList_ = [];
    setupEventListener(0, "unload", clear, 1);
    resetHints();
    removeHandler_(activate);
    suppressTimeout != null && suppressTail_(suppressTimeout);
    /*#__INLINE__*/ set$onWndBlur2(null);
    removeFlash && removeFlash();
    removeFlash = hud_ = api_ =
    reForNonMatch_ =
    baseHinter.b = options_ = modeOpt_ = null as never;
    lastMode_ = baseHinter.m = mode_ = mode1_ = count_ =
    maxLeft_ = maxTop_ = maxRight_ =
    baseHinter.a = isActive = maxPrefixLen_ = baseHinter.h = forceToScroll_ = 0;
    keyCode_ = kKeyCode.None;
    useFilter_ =
    noHUD_ = tooHigh_ = false;
    if (Build.BTypes & BrowserType.Chrome) { baseHinter.d = false; }
    chars_ = "";
    if (box_) {
      box_.remove();
      box_ = null;
    }
    keepHudOrEvent === 1 || hudHide();
}

const cleanFrameInfo = function (this: number | undefined, frameInfo: FrameHintsInfo): void {
    try {
      let frame = frameInfo.s, hasMaster = frame.p;
      frame.p = null;
      hasMaster && frame.c(1, this);
    } catch { /* empty */ }
}

const onFrameUnload = (slave: Slave): void => {
    const frames = frameList_, len = frames.length;
    const wrappedSlave_ff = Build.BTypes & BrowserType.Firefox ? unwrap_ff(slave) : 0 as never as null;
    let i = 0, offset = 0;
    while (i < len && frames[i].s !== (Build.BTypes & BrowserType.Firefox ? wrappedSlave_ff! : slave)) {
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
      clear(1);
      hudTip(kTip.frameUnloaded);
      return;
    }
    zIndexes_ = null;
    keyStat.n = keyStat.b = 0;
    if (useFilter_) {
      getMatchingHints(keyStat, "", "", 1);
    } else {
      for (const link of hints) { link.m.innerText = ""; }
      initAlphabetEngine(hints);
      renderMarkers(hints);
    }
}
  /** require `.zIndexes_` is not `0` */
const rotateHints = (reverse?: boolean) => {
    const frames = frameList_,
    saveCache = !keyStatus_.k && !keyStatus_.t;
    for (const list of frames) {
      list.s.t(list.h, reverse, saveCache);
    }
}

const rotate1 = (totalHints: readonly HintItem[], reverse: boolean | undefined, saveIfNoOverlap: boolean): void => {
    let stacks = zIndexes_;
    if (!stacks) {
      stacks = [];
      totalHints.forEach(makeStacks, [<Array<ClientRect | null>> [], stacks]);
      stacks = stacks.filter(stack => stack.length > 1);
      if (stacks.length <= 0) {
        zIndexes_ = saveIfNoOverlap ? 0 : null;
        return;
      }
      zIndexes_ = stacks;
    }
    for (const stack of stacks) {
      for (let length = stack.length, j = reverse ? length - 1 : 0, end = reverse ? -1 : length
            , max = Math.max.apply(Math, stack)
            , oldI: number = totalHints[stack[reverse ? 0 : length - 1]].z!
          ; j !== end; reverse ? j-- : j++) {
        const hint = totalHints[stack[j]], { m: { style, classList } } = hint, newI = hint.z!;
        style.zIndex = (hint.z = oldI) as number | string as string;
        classList.toggle("OH", oldI < max); classList.toggle("SH", oldI >= max);
        oldI = newI;
      }
    }
}

const makeStacks = function (this: [Array<ClientRect | null>, Stacks], hint: HintItem, i: number): void {
    let rects = this[0];
    if (hint.m.style.visibility) { rects.push(null); return; }
    hint.z = hint.z || i + 1;
    const stacks = this[1], m = getBoundingClientRect_(hint.m);
    rects.push(m);
    let stackForThisMarker: Stack | null = null;
    for (let j = 0, len2 = stacks.length; j < len2; ) {
      let stack = stacks[j], k = 0, len3 = stack.length;
      for (; k < len3; k++) {
        const t = rects[stack[k]]!;
        if (m.bottom > t.top && m.top < t.bottom && m.right > t.left && m.left < t.right) {
          break;
        }
      }
      if (k >= len3) { /* empty */ }
      else if (stackForThisMarker) {
        stackForThisMarker.push(...stack);
        stacks.splice(j, 1); len2--;
        continue;
      } else {
        stack.push(i);
        stackForThisMarker = stack;
      }
      j++;
    }
    stackForThisMarker || stacks.push([i]);
}

const initFilterEngine = (hints: readonly FilteredHintItem[]): void => {
    const len = chars_ !== kNumbers ? 0 : hints.length;
    let i = 0, idxOfSecond = 0, lastPage = 0, curPage = 0, curRangeSecond = 0, curRangeCountS1 = 0;
    for (; i < len; i++) {
      const text = hints[i].h.t;
      if (text < kChar.minNotNum && text > "0" && (curPage = +text) && curPage < len && curPage === (curPage | 0)) {
        if (curPage - lastPage < 3 && curPage > lastPage && lastPage) {
          lastPage = curPage;
          idxOfSecond ? 0 : idxOfSecond = i;
          continue;
        }
        lastPage = curPage;
      } else {
        lastPage = 0;
      }
      if (idxOfSecond) {
        if (curRangeCountS1 < i - idxOfSecond) {
          curRangeSecond = idxOfSecond;
          curRangeCountS1 = i - idxOfSecond;
        }
        idxOfSecond = 0;
      }
    }
    if (idxOfSecond && curRangeCountS1 < len - idxOfSecond) {
      curRangeSecond = idxOfSecond;
      curRangeCountS1 = len - idxOfSecond;
    }
    pageNumberHints_ = hints.slice(curRangeSecond - 1, curRangeSecond + curRangeCountS1);
    getMatchingHints(keyStatus_, "", "", 0);
}

const generateHintStrings = (hints: readonly HintItem[]): void => {
    const chars = chars_, base = chars.length, is10Digits = chars === kNumbers,
    count = hints.length;
    for (let i = 0; i < count; i++) {
      let hintString = "", num = is10Digits ? 0 : i + 1;
      for (; num; num = (num / base) | 0) {
        hintString = chars[num % base] + hintString;
      }
      hints[i].a = is10Digits ? i + 1 + "" : hintString;
    }
}

const generateHintText = (hint: Hint): HintsNS.HintText => {
    let el = hint[0], text = "", show = false
      , localName = el.localName, isHTML = "lang" in el
      , ind: number;
    switch (isHTML ? localName : "") {
    case "input": case "select": case "textarea":
      let labels = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).labels;
      if (labels && labels.length
          && (text = (labels[0] as SafeHTMLElement).innerText).trim()) {
        show = !labels[0].contains(el);
      } else if (localName[0] === "s") {
        const selected = (el as HTMLSelectElement).selectedOptions[0];
        text = selected ? selected.label : "";
      } else {
        if (localName < "s") {
          if ((el as HTMLInputElement).type === "file") {
            text = "Choose File";
          } else if ((el as HTMLInputElement).type === "password") {
            break;
          }
        }
        text = text || (el as HTMLInputElement | HTMLTextAreaElement).value
            || (el as HTMLInputElement | HTMLTextAreaElement).placeholder;
        if (localName > "t" && !(el as HTMLTextAreaElement).scrollTop) {
          ind = text.indexOf("\n") + 1;
          ind && (ind = text.indexOf("\n", ind)) > 0 ? text = text.slice(0, ind) : 0;
        }
      }
      break;
    case "img":
      text = (el as HTMLImageElement).alt || (el as HTMLImageElement).title;
      break;
    case "details":
      text = "Open"; show = !0;
      break;
    default: // include SVGElement and OtherSafeElement
      if (show = hint[2] > ClickType.MaxNotBox) {
        text = hint[2] > ClickType.frame ? "Scroll" : "Frame";
      } else if (isHTML && (text = (el as SafeHTMLElement).innerText.trim())) {
        ind = text.indexOf("\n") + 1;
        ind && (ind = text.indexOf("\n", ind)) > 0 ? text = text.slice(0, ind) : 0;
      } else if (localName === "a" && isHTML) {
          let el2 = el.firstElementChild as Element | null;
          text = el2 && htmlTag_(el2) === "img"
              ? (el2 as HTMLImageElement).alt || (el2 as HTMLImageElement).title : "";
          show = !0;
      } else if (!isHTML) { // SVG elements or plain `Element` nodes
        // SVG: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text
        // demo: https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfrac on Firefox
        text = el.textContent.replace(<RegExpG> /\s{2,}/g, " ");
      }
      text = isHTML ? text || (el as SafeHTMLElement).title : text;
      break;
    }
    if (text) {
      text = text.trim().slice(0, GlobalConsts.MaxLengthOfHintText).trim();
      if (text && text[0] === ":") {
        text = text.replace(<RegExpOne> /^[:\s]+/, "");
      }
    }
    return { t: show && text ? ":" + text : text, w: null };
}

const getMatchingHints = (keyStatus: KeyStatus, text: string, seq: string
      , inited: 0 | 1 | 2): HintItem | 2 | 0 => {
    const
    oldTextSeq = inited > 1 ? keyStatus.t : "a";
    let hints = keyStatus.c as FilteredHintItem[];
    if (oldTextSeq !== text) {
      const t2 = text.trim(), t1 = oldTextSeq.trim();
      keyStatus.t = text;
      if (t1 !== t2) {
        zIndexes_ = zIndexes_ && null;
        const search = t2.split(" "),
        oldKeySeq = keyStatus.k,
        oldHints = t2.startsWith(t1) ? hints : hints_ as readonly FilteredHintItem[],
        hasSearch = !!t2,
        indStep = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
            ? 0 : 1 / (1 + oldHints.length);
        let newLen = 2,
        ind = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
            ? 0 : hasSearch ? 1 : GlobalConsts.MaxLengthOfHintText + 1;
        keyStatus.k = "";
        if (hasSearch && !(hints_ as readonly FilteredHintItem[])[0].h.w) {
          for (const {h: textHint} of hints_ as readonly FilteredHintItem[]) {
            // cache lower-case versions for smaller memory usage
            const words = textHint.w = (textHint.t = textHint.t.toLowerCase()).split(reForNonMatch_);
            words[0] || words.shift();
            words.length && (words[words.length - 1] || words.pop());
          }
        }
        hasSearch && (hints = []);
        for (const hint of oldHints) {
          if (hasSearch) {
            const s = scoreHint(hint.h, search);
            (hint.i = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
                && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
                ? s : s && s + (ind -= indStep)) &&
            hints.push(hint);
          } else {
            hint.i = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
                && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
                ? hint.h.t.length + 1
                : (ind -= indStep) - hint.h.t.length;
          }
        }
        newLen = hints.length;
        if (newLen) {
          keyStatus.c = hasSearch ? hints : hints = oldHints.slice(0);
          if (hasSearch && newLen < 2) { // in case of only 1 hint in fullHints
            return hints[0];
          }
          if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
              && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)) {
            hints.sort((x1, x2) => x1.i - x2.i);
          } else {
            hints.sort((x1, x2) => x2.i - x1.i);
          }
          if (!hasSearch) {
            for (const item of pageNumberHints_) {
              const n = +item.h.t - 1;
              hints[hints.indexOf(item)] = hints[n];
              hints[n] = item;
            }
          }
          generateHintStrings(hints);
        }
        // hints[].zIndex is reset in .MakeStacks_
        if (inited && (newLen || oldKeySeq)) {
        for (const hint of newLen ? hints : oldHints) {
          const el = hint.m.firstElementChild as Element | null;
          el && el.remove();
          (hint.m.firstChild as Text).data = hint.a;
        }
        for (const hint of oldHints) {
          hint.m.style.visibility = hint.i !== 0 ? "" : "hidden";
        }
        }
        if (!newLen) {
          keyStatus.t = oldTextSeq;
          return 2;
        }
      }
      inited && setMode(mode_);
    }
    const hintsUnderSeq = seq ? hints.filter(hint => hint.a.startsWith(seq)) : hints,
    newUnerSeq = hintsUnderSeq.length;
    if (keyStatus.k !== seq) {
      keyStatus.k = seq;
      zIndexes_ = zIndexes_ && null;
      if (newUnerSeq < 2) { return newUnerSeq ? hintsUnderSeq[0] : 0; }
      for (const { m: marker, a: key } of hints) {
        const match = key.startsWith(seq);
        marker.style.visibility = match ? "" : "hidden";
        if (match) {
          let child = marker.firstChild!, el: HTMLSpanElement;
          if (child.nodeType === kNode.TEXT_NODE) {
            el = marker.insertBefore(createElement_("span"), child);
            el.className = "MC";
          } else {
            el = child;
            child = child.nextSibling as Text;
          }
          el.textContent = seq;
          child.data = key.slice(seq.length);
        }
      }
    }
    hints = hintsUnderSeq;
    const oldActive = activeHint_;
    const newActive = hints[(keyStatus.b < 0 ? (keyStatus.b += newUnerSeq) : keyStatus.b) % newUnerSeq];
    if (oldActive !== newActive) {
      if (oldActive) {
        oldActive.m.classList.remove("MH");
        oldActive.m.style.zIndex = "";
      }
      newActive.m.classList.add("MH");
      newActive.m.style.zIndex = hints_!.length as number | string as string;
      activeHint_ = newActive;
    }
    return 2;
}

  /**
   * total / Math.log(~)
   * * `>=` 1 / `Math.log`(1 + (MaxLengthOfHintText = 256)) `>` 0.18
   * * margin `>=` `0.0001267`
   *
   * so, use `~ * 1e4` to ensure delta > 1
   */
const scoreHint = (textHint: HintsNS.HintText, searchWords: readonly string[]): number => {
    let words = textHint.w!, total = 0;
    if (!words.length) { return 0; }
    for (const search of searchWords) {
      let max = 0;
      for (const word of words) {
        const pos = word.indexOf(search);
        max = pos < 0 ? max : Math.max(max,
            pos ? 1 : words.length - search.length ? max ? 2 : 6 : max ? 4 : 8);
      }
      if (!max) { return 0; }
      total += max;
    }
    if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)) {
      return total && Math.log(1 + textHint.t.length) / total;
    }
    return total * GlobalConsts.MatchingScoreFactorForHintText / Math.log(1 + textHint.t.length);
}

const renderMarkers = (hintItems: readonly HintItem[]): void => {
    const noAppend = !!(Build.BTypes & BrowserType.Chrome)
        && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
        && fgCache.v < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
    for (const hint of hintItems) {
      let right: string, marker = hint.m;
      if (useFilter_) {
        marker.textContent = hint.a;
        right = hint.h!.t;
        if (!right || right[0] !== ":") { continue; }
        right = hint.h!.t = right.slice(1);
        right = right.replace(<RegExpG> /[^!-~\xc0-\xfc\u0402"-\u045f\xba\u0621-\u064a]+/g, " "
            ).replace(<RegExpOne> /^[^\w\x80-\uffff]+|:[:\s]*$/, "").trim();
        right = right.length > GlobalConsts.MaxLengthOfShownText
            ? right.slice(0, GlobalConsts.MaxLengthOfShownText - 2).trimRight() + "\u2026" // the "\u2026" is wide
            : right;
        if (!right) { continue; }
        marker.classList.add("TH");
        right = ": " + right;
      } else {
        right = hint.a.slice(-1);
        for (const ch of hint.a.slice(0, -1)) {
          const node = doc.createElement("span");
          node.textContent = ch;
          marker.appendChild(node);
        }
      }
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
          && noAppend) {
        marker.insertAdjacentText("beforeend", right);
      } else {
        marker.append!(right);
      }
    }
}

const initAlphabetEngine = (hintItems: readonly HintItem[]): void => {
    const math = Math, ceil = math.ceil, charSet = chars_, step = charSet.length,
    chars2 = " " + charSet,
    count = hintItems.length, start = (ceil((count - 1) / (step - 1)) | 0) || 1,
    bitStep = ceil(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Math$$log2
          ? math.log(step + 1) / math.LN2 : math.log2(step + 1)) | 0;
    let hints: number[] = [0], next = 1, bitOffset = 0;
    for (let offset = 0, hint = 0; offset < start; ) {
      if (next === offset) { next = next * step + 1, bitOffset += bitStep; }
      hint = hints[offset++];
      for (let ch = 1; ch <= step; ch++) { hints.push((ch << bitOffset) | hint); }
    }
    maxPrefixLen_ = (bitOffset / bitStep - +(next > start)) | 0;
    while (next-- > start) { hints[next] <<= bitStep; }
    hints = hints.slice(start, start + count).sort((i, j) => i - j);
    for (let i = 0, mask = (1 << bitStep) - 1; i < count; i++) {
      let hintString = "", num = hints[i];
      if (!(num & mask)) { num >>= bitStep; }
      for (; num; num >>>= bitStep) { // use ">>>" to prevent potential typos from causing a dead loop
        hintString += chars2[num & mask];
      }
      hintItems[i].a = hintString;
  }
}

const matchHintsByKey = (keyStatus: KeyStatus
      , event: HandlerNS.Event, key: string, keybody: kChar): HintItem | 0 | 2 => {
    let {k: sequence, t: textSeq, b: oldTab, c: hints} = keyStatus
      , doesDetectMatchSingle: 0 | 1 | 2 = 0
      , textSeq0 = textSeq, isSpace = keybody === kChar.space, isTab = keybody === kChar.tab;
    textSeq = textSeq && textSeq.replace("  ", " ");
    keyStatus.b = isSpace ? oldTab
        : isTab ? useFilter_ ? oldTab - 2 * +(key === "s-" + keybody) + 1 : 1 - oldTab
        : (useFilter_ || oldTab && (sequence = sequence.slice(0, -1)), 0);
    keyStatus.n = 1;
    if (isTab) {
      resetMode()
    }
    else if (keybody === kBackspace || keybody === kDelete || keybody === kChar.f1) {
      if (!sequence && !textSeq) {
        return 0;
      }
      sequence ? sequence = sequence.slice(0, -1) : textSeq = textSeq.slice(0, -1);
    } else if (useFilter_ && keybody === kChar.enter || isSpace && textSeq0 !== textSeq) {
      // keep .known_ to be 1 - needed by .executeL_
      return activeHint_!;
    } else if (isSpace) { // then useFilter is true
      textSeq = textSeq0 + " ";
    } else if (!(useFilter_ && (key.includes("c-") || key.includes("m-"))) && event.c.length === 1
        && keybody.length === 1) {
      keybody = useFilter_ ? keybody : keybody.toUpperCase() as kChar;
      useFilter_ && resetMode();
      if (chars_.includes(keybody)
          && !(useFilter_ && key === "a-" + keybody && keybody < kChar.minNotNum && keybody > kChar.maxNotNum)) {
        sequence += keybody;
        doesDetectMatchSingle = useFilter_ || sequence.length < maxPrefixLen_ ? 1 : 2;
      } else if (useFilter_) {
        let lower = keybody.toLowerCase();
        if (keybody !== lower && chars_ !== chars_.toLowerCase() // ignore {Lo} in chars_
            /** this line requires lower.length must be 1 or 0 */
            || (reForNonMatch_ || (reForNonMatch_
                  = <RegExpG & RegExpOne> /[^0-9a-z_\xdf-\xfc\u0430-\u045f\xba\u0621-\u064a]+/g)
                ).test(lower)) {
          return 2;
        } else {
          sequence = "";
          textSeq = textSeq !== " " ? textSeq + lower : lower;
        }
      } else {
        return 0;
      }
    } else {
      return 2;
    }
    keyStatus.n = 0;
    baseHinter.h = 0;
    if (doesDetectMatchSingle > 1) {
      for (const hint of hints) { if (hint.a === sequence) { return hint; } }
    }
    if (useFilter_) {
      return getMatchingHints(keyStatus, textSeq, sequence, 2);
    } else {
      zIndexes_ = zIndexes_ && null;
      keyStatus.k = sequence;
      const notDoSubCheck = !keyStatus.b, wanted = notDoSubCheck ? sequence : sequence.slice(0, -1);
      hints = keyStatus.c = (doesDetectMatchSingle ? hints : hints_!).filter(hint => {
        const pass = hint.a.startsWith(wanted) && (notDoSubCheck || !hint.a.startsWith(sequence));
        hint.m.style.visibility = pass ? "" : "hidden";
        return pass;
      });
      const limit = sequence.length - keyStatus.b;
      type MarkerElementChild = Exclude<MarkerElement["firstChild"], Text | null>;
      for (const { m: { childNodes: ref } } of hints) {
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/dom_token_list.cc?q=DOMTokenList::setValue&g=0&l=258
// shows that `.classList.add()` costs more
        for (let j = ref.length - 1; 0 <= --j; ) {
          !(ref[j] as MarkerElementChild).className !== (j < limit) ||
          ((ref[j] as MarkerElementChild).className = j < limit ? "MC" : "");
        }
      }
      return hints.length ? 2 : 0;
    }
}

export const tryDecodeURL = (url: string, decode?: (this: void, url: string) => string): string => {
  try { url = (decode || decodeURI)(url); } catch {}
  return url;
}

const isImageUrl = (str: string | null): boolean => {
  if (!str || str[0] === "#" || str.length < 5 || jsRe_.test(str)) {
    return false;
  }
  const end = str.lastIndexOf("#") + 1 || str.length;
  // eslint-disable-next-line @typescript-eslint/ban-types
  str = str.substring!(str.lastIndexOf("/", str.lastIndexOf("?") + 1 || end), end);
  return (<RegExpI & RegExpOne> /\.(?:bmp|gif|icon?|jpe?g|a?png|svg|tiff?|webp)\b/i).test(str);
}

const getUrlData = (link: SafeHTMLElement): string => {
  const str = link.dataset.vimUrl;
  if (str) {
    (link = createElement_("a")).href = str.trim();
  }
  // $1.href is ensured well-formed by @GetLinks_
  return link.localName === "a" ? (link as HTMLAnchorElement).href : "";
}

/** return: img is HTMLImageElement | HTMLAnchorElement | HTMLElement[style={backgroundImage}] */
const getImageUrl = (img: SafeHTMLElement): string | void => {
  let text: string | null, src = img.dataset.src || "", elTag = img.localName, n: number,
  notImg: 0 | 1 | 2 = elTag !== "img" ? 1 : 0;
  if (!notImg) {
    text = (img as HTMLImageElement).currentSrc || img.getAttribute("src") && (img as HTMLImageElement).src;
    if ((n = (img as HTMLImageElement).naturalWidth) && n < 3
        && (n = (img as HTMLImageElement).naturalHeight) && n < 3) {
      notImg = 2;
      text = "";
    }
  } else {
    text = elTag === "a" ? img.getAttribute("href") && (img as HTMLAnchorElement).href : "";
  }
  if (notImg) {
    if (!isImageUrl(text)) {
      let arr = (<RegExpI> /^url\(\s?['"]?((?:\\['"]|[^'"])+?)['"]?\s?\)/i).exec(
        (notImg > 1 ? getComputedStyle_(img) : img.style).backgroundImage!);
      if (arr && arr[1]) {
        const a1 = createElement_("a");
        a1.href = arr[1].replace(<RegExpG> /\\(['"])/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || jsRe_.test(text)
      || src.length > text.length + 7 && (text === (img as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  return text || hud_.t(kTip.notImg, 1000);
}

const getImageName_ = (img: SafeHTMLElement): string =>
  img.getAttribute("download") || img.getAttribute("alt") || img.title

const openUrl = (url: string, incognito?: boolean): void => {
  api_.p({
    H: kFgReq.openUrl,
    r: mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
    u: url,
    f: incognito,
    i: incognito,
    k: options_.keyword
  });
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
      if (Build.BTypes & BrowserType.Chrome && fgCache.v < BrowserVer.Min$ContentDocument$NotThrow) {
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

const highlightChild = (el: LinkEl, tag: string): 0 | 1 | 2 => {
  if (!(<RegExpOne> /^i?frame$/).test(tag)) {
    return 0;
  }
  options_.mode = mode_;
  (master_ || baseHinter).m = baseHinter.m = mode_ = HintMode.DEFAULT;
  if (el === omni_box) {
    focusOmni();
    return 1;
  }
  const core = detectUsableChild(el as HTMLIFrameElement | HTMLFrameElement);
  (el as HTMLIFrameElement | HTMLFrameElement).focus();
  if (!core) {
    send_(kFgReq.execInChild, {
      u: (el as HTMLIFrameElement | HTMLFrameElement).src,
      c: kFgCmd.linkHints, n: count_, k: keyCode_, a: options_
    }, function (res): void {
      if (!res) {
        (el as HTMLIFrameElement | HTMLFrameElement).contentWindow.focus();
      }
    });
  } else {
    core.f(kFgCmd.linkHints, count_, options_, 1);
  }
  return 2;
}

const unhoverOnEsc = (): void => {
    const exit: HandlerNS.RefHandler = event => {
      removeHandler_(exit);
      if (isEscape_(key_(event, kModeId.Link)) && !insert_Lock_()) {
        unhover_();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    };
    pushHandler_(exit, exit);
}

const Modes_ = [
[
  (element, rect): void => {
    const type = getEditableType_<0>(element), toggleMap = options_.toggle;
    // here not check lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    /*#__INLINE__*/ set$currentScrolling(element);
    hover_(element, center_(rect));
    type || element.focus && !(<RegExpI> /^i?frame$/).test(htmlTag_(element)) && element.focus();
    /*#__INLINE__*/ syncCachedScrollable();
    if (mode1_ < HintMode.min_job) { // called from Modes[-1]
      return hud_.t(kTip.hoverScrollable, 1000);
    }
    mode_ & HintMode.queue || unhoverOnEsc();
    if (!toggleMap || typeof toggleMap !== "object") { return; }
    safer(toggleMap);
    let ancestors: Element[] = [], top: Element | null = element, re = <RegExpOne> /^-?\d+/;
    for (let key in toggleMap) {
      // if no Element::closest, go up by 6 levels and then query the selector
      let selector = key, prefix = re.exec(key), upper = prefix && prefix[0];
      if (upper) {
        selector = selector.slice(upper.length);
      }
      let up = (upper as string | number as number) | 0, selected: Element | null = null;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest && !up) {
        up = element.closest ? 0 : 6;
      }
      selector = selector.trim();
      while (up && up + 1 >= ancestors.length && top) {
        ancestors.push(top);
        top = GetParent_unsafe_(top, PNType.RevealSlotAndGotoParent);
      }
      try {
        if (selector && (selected = up
              ? Build.BTypes & ~BrowserType.Firefox
                ? Element.prototype.querySelector.call(ancestors[Math.max(0, Math.min(up + 1, ancestors.length - 1))]
                    , selector)
                : (ancestors[Math.max(0, Math.min(up + 1, ancestors.length - 1))]).querySelector(selector)
              : element.closest!(selector))) {
          for (const clsName of toggleMap[key].split(" ")) {
            clsName.trim() && selected.classList.toggle(clsName);
          }
        }
      } catch {}
      if (selected) {
        break;
      }
    }
  }
  , HintMode.HOVER
] as ModeOpt,
[
  unhover_
  , HintMode.UNHOVER
] as ModeOpt,
[
  (link): boolean | void => {
    const mode1 = mode1_;
    let isUrl = mode1 > HintMode.min_link_job - 1 && mode1 < HintMode.max_link_job + 1,
        str: string | null | undefined;
    if (isUrl) {
      str = getUrlData(link as SafeHTMLElement);
      str && (<RegExpI> /^mailto:./).test(str) && (str = str.slice(7).trim());
    }
    else if ((str = link.getAttribute("data-vim-text"))
        && (str = str.trim())) { /* empty */ }
    else {
      const tag = htmlTag_(link), isChild = highlightChild(link, tag);
      if (isChild) { return isChild > 1; }
      if (tag === "input") {
        let type = (link as HTMLInputElement).type, f: HTMLInputElement["files"];
        if (type === "password") {
          return hud_.t(kTip.ignorePassword, 2000);
        }
        if (!uneditableInputs_[type]) {
          str = (link as HTMLInputElement).value || (link as HTMLInputElement).placeholder;
        } else if (type === "file") {
          str = (f = (link as HTMLInputElement).files) && f.length > 0 ? f[0].name : "";
        } else if ("button image submit reset".includes(type)) {
          str = (link as HTMLInputElement).value;
        }
      } else {
        str = tag === "textarea" ? (link as HTMLTextAreaElement).value
          : tag === "select" ? ((link as HTMLSelectElement).selectedIndex < 0
              ? "" : (link as HTMLSelectElement).options[(link as HTMLSelectElement).selectedIndex].text)
          : tag && (str = (link as SafeHTMLElement).innerText.trim(),
              (<RegExpI> /^mailto:./).test(str) ? str.slice(7).trim() : str)
            || (str = link.textContent.trim()) && str.replace(<RegExpG> /\s+/g, " ")
          ;
      }
      str = str && str.trim();
      if (!str && tag) {
        str = (link as SafeHTMLElement).title.trim() || (link.getAttribute("aria-label") || "").trim();
      }
    }
    if (!str) {
      return hud_.c("", isUrl ? "url" : "");
    }
    if (mode1 > HintMode.min_edit - 1 && mode1 < HintMode.max_edit + 1) {
      let newtab = options_.newtab
      // this frame is normal, so during Vomnibar.activate, checkHidden will only pass (in most cases)
      type Options = FgReq[kFgReq.vomnibar] & { c: number } & Partial<VomnibarNS.ContentOptions>;
      (post_ as ComplicatedVPort)<kFgReq.vomnibar, Options>({
        H: kFgReq.vomnibar,
        c: 1,
        newtab: newtab != null ? !!newtab : !isUrl,
        url: str,
        keyword: options_.keyword
      });
      return;
    } else if (mode1 === HintMode.SEARCH_TEXT) {
      return openUrl(str);
    }
    // then mode1 can only be copy
    // NOTE: url should not be modified
    // although BackendUtils.convertToUrl does replace '\u3000' with ' '
    str = isUrl ? tryDecodeURL(str) : str;
    let lastYanked = mode1 & HintMode.list ? (master_ || baseHinter).y : 0 as const;
    if (lastYanked) {
      if (lastYanked.indexOf(str) >= 0) {
        return hud_.s(kTip.noNewToCopy);
      }
      lastYanked.push(str);
      hud_.c(`[${lastYanked.length}] ` + str);
    }
    api_.p({
      H: kFgReq.copy,
      j: options_.join,
      e: options_.sed,
      s: lastYanked || str
    });
  }
  , HintMode.SEARCH_TEXT
  , HintMode.COPY_TEXT
  , HintMode.COPY_URL
  , HintMode.COPY_TEXT | HintMode.list
  , HintMode.COPY_URL | HintMode.list
  , HintMode.EDIT_LINK_URL
  , HintMode.EDIT_TEXT
] as ModeOpt,
[
  (link: SafeHTMLElement): void => {
    const url = getUrlData(link);
    if (!evalIfOK(url)) {
      openUrl(url, !0);
    }
  }
  , HintMode.OPEN_INCOGNITO_LINK
] as ModeOpt,
[
  (element: SafeHTMLElement): void => {
    let tag = element.localName, text: string | void;
    if (tag === "video" || tag === "audio") {
      text = (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src;
    } else {
      text = getImageUrl(element);
    }
    if (!text) { return; }
    const url = text, i = text.indexOf("://"), a = createElement_("a");
    if (i > 0) {
      text = text.slice(text.indexOf("/", i + 4) + 1);
    }
    if (text.length > 40) {
      text = text.slice(0, 39) + "\u2026";
    }
    a.href = url;
    a.download = getImageName_(element);
    /** @todo: how to trigger download */
    mouse_(a, "click", [0, 0], [!0, !1, !1, !1]);
    hud_.t(kTip.downloaded, 2000, [text]);
  }
  , HintMode.DOWNLOAD_MEDIA
] as ModeOpt,
[
  (img: SafeHTMLElement): void => {
    const text = getImageUrl(img);
    if (!text) { return; }
    post_({
      H: kFgReq.openImage,
      r: mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      f: getImageName_(img),
      u: text,
      a: options_.auto
    });
  }
  , HintMode.OPEN_IMAGE
] as ModeOpt,
[
  (element: SafeHTMLElement, rect): void => {
    let notAnchor = element.localName !== "a",
    link = notAnchor ? createElement_("a") : element as HTMLAnchorElement,
    oldUrl: string | null = notAnchor ? null : link.getAttribute("href"),
    url = getUrlData(element), changed = notAnchor || url !== link.href;
    if (changed) {
      link.href = url;
      if (notAnchor) {
        let top = scrollingEl_(1);
        top && top.appendChild(link);
      }
    }
    const kDownload = "download", hadNoDownload = !link.hasAttribute(kDownload);
    if (hadNoDownload) {
      link[kDownload] = "";
    }
    click_(link, rect, 0, [!0, !1, !1, !1])
    if (hadNoDownload) {
      link.removeAttribute(kDownload);
    }
    if (!changed) { /* empty */ }
    else if (notAnchor) {
      link.remove();
    }
    else if (oldUrl != null) {
      link.setAttribute("href", oldUrl);
    } else {
      link.removeAttribute("href");
    }
  }
  , HintMode.DOWNLOAD_LINK
] as ModeOpt,
[
  (link, rect): void | false => {
    if (mode_ < HintMode.min_disable_queue) {
      view_(link);
      link.focus && link.focus();
      removeFlash || flash_(link)
    } else {
      select_(link as HintsNS.InputHintItem["d"], rect, !removeFlash)
    }
    return false;
  }
  , HintMode.FOCUS
  , HintMode.FOCUS_EDITABLE
] as ModeOpt,
[
  (link, rect, hint): void | boolean => {
    const tag = htmlTag_(link), isChild = highlightChild(link, tag);
    if (isChild) {
      return isChild > 1;
    }
    if (tag === "details") {
      const summary = findMainSummary_(link as HTMLDetailsElement);
      if (summary) {
          // `HTMLSummaryElement::DefaultEventHandler(event)` in
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_summary_element.cc?l=109
          rect = (link as HTMLDetailsElement).open || !rect ? getVisibleClientRect_(summary) : rect;
          click_(summary, rect, 1);
          removeFlash || rect && flash_(null, rect);
          return false;
      }
      (link as HTMLDetailsElement).open = !(link as HTMLDetailsElement).open;
      return;
    } else if (hint.r && hint.r === link) {
      Modes_[0][0](link, rect, hint);
      return;
    } else if (getEditableType_<0>(link) > EditableType.TextBox - 1) {
      select_(link as LockableElement, rect, !removeFlash);
      return false;
    }
    const mask = mode_ & HintMode.mask_focus_new, isMac = !fgCache.o,
    isRight = options_.button === "right",
    dblClick = !!options_.dblclick && !isRight,
    newTabOption = options_.newtab,
    otherActions = isRight || dblClick,
    newTab = mask > HintMode.newTab - 1 && !otherActions,
    newtab_n_active = newTab && mask > HintMode.newtab_n_active - 1,
    newWindow = newTabOption === "window" && !otherActions,
    cnsForWin = options_.ctrlShiftForWindow,
    noCtrlPlusShiftForActive: boolean | undefined = cnsForWin != null ? cnsForWin : options_.noCtrlPlusShift,
    ctrl = newTab && !(newtab_n_active && noCtrlPlusShiftForActive) || newWindow && !!noCtrlPlusShiftForActive,
    shift = newWindow || newtab_n_active,
    specialActions = dblClick ? kClickAction.forceToDblclick : otherActions || tag !== "a" ? kClickAction.none
        : newTabOption === "force" ? newTab
            ? kClickAction.forceToOpenInNewTab | kClickAction.newTabFromMode : kClickAction.forceToOpenInNewTab
        : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
        ? newWindow ? kClickAction.openInNewWindow
          : newTab // need to work around Firefox's popup blocker
            ? kClickAction.plainMayOpenManually | kClickAction.newTabFromMode : kClickAction.plainMayOpenManually
        : kClickAction.none;
    const ret = click_(link, rect, mask > 0 || (link as ElementToHTMLorSVG).tabIndex! >= 0, [
        !1,
        ctrl && !isMac,
        ctrl && isMac,
        shift
      ], specialActions, isRight ? kClickButton.second : kClickButton.none
      , !(Build.BTypes & BrowserType.Chrome) || otherActions || newTab ? 0 : options_.touch);
    options_.autoUnhover ? unhover_() : mode_ & HintMode.queue || ret && unhoverOnEsc();
  }
  , HintMode.OPEN_IN_CURRENT_TAB
  , HintMode.OPEN_IN_NEW_BG_TAB
  , HintMode.OPEN_IN_NEW_FG_TAB
] as ModeOpt
] as const

const baseHinter: Master = {
  d: Build.BTypes & BrowserType.Chrome ? false : 0 as never,
  b: null,
  l: null,
  a: 0,
  h: 0,
  y: [],

  x: checkLast,
  c: clear,
  o: collectFrameHints,
  j: delayToExecute,
  e: executeHint,
  g: getPreciseChildRect,
  $: highlightHint,
  r: render,
  t: rotate1,

  p: null,
  f: null as never,
  k: null as never,
  m: HintMode.empty,
  q: TimerID.None,

  n: onKeydown,
  s: resetMode,
  i: reinit,
  v: resetHints,
  u: onFrameUnload,
  w: setupCheck,
  z: postExecute
}

export { Master as HintMaster, baseHinter as coreHints }

if (!(Build.NDEBUG || HintMode.min_not_hint <= <number> kTip.START_FOR_OTHERS)) {
  console.log("Assert error: HintMode.min_not_hint <= kTip.START_FOR_OTHERS");
}
if (!(Build.NDEBUG || Modes_.length === 9)) {
  console.log("Assert error: VHints.Modes_ should have 9 items");
}
