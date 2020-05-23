/**
 * Note(gdh1995):
 * - All private members are @NEED_SAFE_ELEMENTS
 * - Untagged public members are @safe_even_if_any_overridden_property
 */
declare namespace ScrollerNS {
  const enum Consts {
    calibrationBoundary = 150, maxCalibration = 1.6, minCalibration = 0.5,
    minDuration = 100, durationScaleForAmount = 20,
    maxS = 1.05, minS = 0.95, delayToChangeSpeed = 75, tickForUnexpectedTime = 17, firstTick = 17,

    DelayMinDelta = 60, DelayTolerance = 60,
    DelayUnitMs = 30, FrameIntervalMs = 16.67, MaxSkippedF = 4,
    // https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/cc978658(v=technet.10)
    //            delay         interval  # delay - interval (not so useful)
    // high:  60f / 1000ms :  400ms / 24f # 660 / 28
    // low:   15f /  250ms :   33ms /  2f # 200 / 6
    HighDelayMs = 1000, LowDelayMs = 250, DefaultMinDelayMs = 660,
    HighIntervalF = 24, LowIntervalF = 2, DefaultMaxIntervalF = HighIntervalF + MaxSkippedF,

    AmountLimitToScrollAndWaitRepeatedKeys = 20,
  }
}
declare const enum kScrollDim {
  _mask = "",
  viewSize = 0,
  scrollSize = 1,
  position = 2,
}
interface ElementScrollInfo {
  /** area */ a: number;
  /** element */ e: SafeElement;
  /** height (cropped) */ h: number;
}

import {
  isAlive_, setupEventListener, timeout_, clearTimeout_, fgCache, doc, allowRAF_, readyState_, loc_, chromeVer_, vApi, deref_, weakRef_,
} from "../lib/utils"
import { getParentVApi, resetSelectionToDocStart, checkHidden } from "./dom_ui"
import { isCmdTriggered } from "./key_handler"
import { tryNestedFrame } from "./link_hints"
import { setPreviousMarkPosition } from "./marks"
import {
  scrollingEl_, SafeEl_not_ff_, docEl_unsafe_, scrollWndBy_, frameElement_, rAF_, getVisibleClientRect_,
  OnDocLoaded_, GetParent_unsafe_, querySelector_unsafe_, getZoom_, wdZoom_, bZoom_, NotVisible_, getComputedStyle_,
  prepareCrop_, notSafe_not_ff_, getBoundingClientRect_, cropRectToVisible_, getInnerHeight, HDN, NONE,
} from "../lib/dom_utils"
import { keyNames_, prevent_ } from "../lib/keyboard_utils"

let toggleAnimation: ((scrolling?: BOOL) => void) | null = null
let maxInterval = ScrollerNS.Consts.DefaultMaxIntervalF as number
let minDelay = ScrollerNS.Consts.DefaultMinDelayMs as number
/** @NEED_SAFE_ELEMENTS */
let scrollingTop: SafeElement | null = null
/** @NEED_SAFE_ELEMENTS */
let currentScrolling: WeakRef<SafeElement> | null = null
/** @NEED_SAFE_ELEMENTS */
let cachedScrollable: WeakRef<SafeElement> | 0 | null = 0
let keyIsDown = 0
let preventPointEvents: BOOL | boolean | undefined
let scale = 1
let joined: VApiTy | null = null
let scrolled = 0

export { currentScrolling, cachedScrollable, keyIsDown, scrolled }
export function clearTop (): void { scrollingTop = null }
export function resetScrolled (): void { scrolled = 0 }
export function set_currentScrolling (_newCurSc: WeakRef<SafeElement> | null): void { currentScrolling = _newCurSc }
export function resetCurrentScrolling (): void { currentScrolling = null }
export function clearCachedScrollable (): void { cachedScrollable = 0 }
export function syncCachedScrollable (): void { cachedScrollable = currentScrolling }

let performAnimate = (e: SafeElement | null, d: ScrollByY, a: number): void => {
  let amount = 0, calibration = 1.0, di: ScrollByY = 0, duration = 0, element: SafeElement | null = null, //
  sign = 0, timestamp = 0, totalDelta = 0.0, totalElapsed = 0.0, //
  running = 0, timer = TimerID.None,
  top: SafeElement | null = null,
  animate = (newTimestamp: number): void => {
    if (!isAlive_ || !running) { toggleAnimation!(); return; }
    const
    // although timestamp is mono, Firefox adds too many limits to its precision
    elapsed = !timestamp ? (newTimestamp = performance.now(), ScrollerNS.Consts.firstTick)
              : newTimestamp > timestamp ? newTimestamp - timestamp
              : (newTimestamp += ScrollerNS.Consts.tickForUnexpectedTime, ScrollerNS.Consts.tickForUnexpectedTime),
    continuous = keyIsDown > 0
    timestamp = newTimestamp;
    totalElapsed += elapsed;
    if (amount < ScrollerNS.Consts.AmountLimitToScrollAndWaitRepeatedKeys
        && continuous && totalDelta >= amount && totalElapsed < minDelay - 2) {
      running = 0;
      timer = timeout_(startAnimate, minDelay - totalElapsed)
      return;
    }
    if (continuous) {
      if (totalElapsed >= ScrollerNS.Consts.delayToChangeSpeed) {
        if (totalElapsed > minDelay) { --keyIsDown; }
        if (ScrollerNS.Consts.minCalibration <= calibration && calibration <= ScrollerNS.Consts.maxCalibration) {
          const calibrationScale = ScrollerNS.Consts.calibrationBoundary / amount / calibration;
          calibration *= calibrationScale > ScrollerNS.Consts.maxS ? ScrollerNS.Consts.maxS
            : calibrationScale < ScrollerNS.Consts.minS ? ScrollerNS.Consts.minS : 1;
        }
      }
    }
    let delta = amount * (elapsed / duration) * calibration;
    continuous || (delta = Math.min(delta, amount - totalDelta));
    // not use `sign * _performScroll()`, so that the code is safer even though there're bounce effects
    delta = delta > 0 ? Math.abs(performScroll(element, di, sign * Math.ceil(delta))) : 0
    if (delta) {
      totalDelta += delta;
      rAF_(animate);
    } else {
      if ((!(Build.BTypes & BrowserType.Chrome) || chromeVer_ >= BrowserVer.MinMaybeScrollEndAndOverScrollEvents)
          && "onscrollend" in (Build.BTypes & ~BrowserType.Firefox ? Image.prototype : doc)) {
        // according to tests on C75, no "scrollend" events if scrolling behavior is "instant";
        // the doc on Google Docs requires no "overscroll" events for programmatic scrolling
        const notEl: boolean = !element || element === scrollingEl_();
        (notEl ? doc : element!).dispatchEvent(
            new Event("scrollend", {cancelable: false, bubbles: notEl}));
      }
      checkCurrent(element)
      toggleAnimation!();
    }
  },
  startAnimate = (): void => {
    timer = TimerID.None;
    running = running || rAF_(animate);
  };
  toggleAnimation = (scrolling?: BOOL): void => {
    const el = (scrolling ? Build.BTypes & ~BrowserType.Firefox ? SafeEl_not_ff_!(docEl_unsafe_())
        : docEl_unsafe_() : top
        ) as SafeElement & TypeToAssert<Element, HTMLElement | SVGElement, "style"> | null;
    top = scrolling ? el : (running = 0, element = null);
    el && el.style ? el.style.pointerEvents = scrolling ? NONE : "" : 0;
  };
  performAnimate = (newEl, newDi, newAmount): void => {
    const math = Math, max = math.max;
    amount = max(1, math.abs(newAmount)); calibration = 1.0; di = newDi;
    duration = max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * math.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    totalDelta = totalElapsed = 0.0;
    timestamp = 0;
    if (timer) {
      clearTimeout_(timer);
    }
    const keyboard = fgCache.k;
    maxInterval = math.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF
    minDelay = (((keyboard[0] + max(keyboard[1], ScrollerNS.Consts.DelayMinDelta)
          + ScrollerNS.Consts.DelayTolerance) / ScrollerNS.Consts.DelayUnitMs) | 0)
      * ScrollerNS.Consts.DelayUnitMs
    preventPointEvents && toggleAnimation!(1)
    startAnimate();
  };
  performAnimate(e, d, a)
}

const performScroll = (el: SafeElement | null, di: ScrollByY, amount: number, before?: number): number => {
    let newPos: number, I = "instant" as const;
    if (di) {
      if (el) {
        before = before == null ? el.scrollTop : before;
        !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
        !(Build.BTypes & ~BrowserType.Firefox) ||
        el.scrollBy ? el.scrollBy({behavior: I, top: amount}) : (el.scrollTop += amount);
        newPos = el.scrollTop;
      } else {
        before = scrollY;
        // avoid using `Element`, so that users may override it
        scrollWndBy_(0, amount);
        newPos = scrollY;
      }
    } else if (el) {
      before = before == null ? el.scrollLeft : before;
      !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
      !(Build.BTypes & ~BrowserType.Firefox) ||
      el.scrollBy ? el.scrollBy({behavior: I, left: amount}) : (el.scrollLeft += amount);
      newPos = el.scrollLeft;
    } else {
      before = scrollX;
      scrollWndBy_(amount, 0);
      newPos = scrollX;
    }
    return newPos - before;
}

export const $sc = (element: SafeElement | null, di: ScrollByY, amount: number): void => {
    if (hasSpecialScrollSnap(element)) {
      while (Math.abs(amount) >= 1 && !performScroll(element, di, amount)) {
        amount /= 2;
      }
      checkCurrent(element)
    } else if (fgCache.s
        && (Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage || !(Build.BTypes & BrowserType.Chrome)
            || allowRAF_)) {
      amount && performAnimate(element, di, amount)
      scrollTick(1)
    } else if (amount) {
      performScroll(element, di, amount)
      checkCurrent(element)
    }
}

export const activate = (options: CmdOptions[kFgCmd.scroll] & SafeObject, count: number): void => {
    if (options.$c == null) {
      options.$c = isCmdTriggered
    }
    if (checkHidden(kFgCmd.scroll, count, options)) { return; }
    if (tryNestedFrame(kFgCmd.scroll, count, options)) { return; }
    const di: ScrollByY = options.axis === "x" ? 0 : 1,
    dest = options.dest;
    let fromMax = dest === "max";
    if (dest) {
      if (count < 0) { fromMax = !fromMax; count = -count; }
      count--;
    } else {
      count *= +(options.dir!) || 1;
    }
    executeScroll(di, count, dest ? 1 as never : 0, options.view, fromMax as false, options)
    if (keyIsDown && !options.$c) {
      scrollTick(0)
    }
}

  /**
   * @param amount0 can not be 0, if `isTo` is 0; can not be negative, if `isTo` is 1
   * @param factor `!!factor` can be true only if `isTo` is 0
   * @param fromMax can not be true, if `isTo` is 0
   */
export const executeScroll = function (di: ScrollByY, amount0: number, isTo: BOOL
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: boolean
      , options?: CmdOptions[kFgCmd.scroll]): void {
    prepareTop()
    const element = findScrollable(di, isTo ? fromMax ? 1 : -1 : amount0)
    let amount = !factor ? adjustAmount(di, amount0, element)
      : factor === 1 ? amount0
      : amount0 * getDimension(element, di, factor === "max" ? kScrollDim.scrollSize : kScrollDim.viewSize)
    if (isTo) {
      const curPos = getDimension(element, di, kScrollDim.position),
      viewSize = getDimension(element, di, kScrollDim.viewSize),
      max = (fromMax || amount) && getDimension(element, di, kScrollDim.scrollSize) - viewSize
      amount = element ? Math.max(0, Math.min(fromMax ? max - amount : amount, max)) - curPos
          : fromMax ? viewSize : amount - curPos;
    }
    let core: ReturnType<typeof getParentVApi>;
    if (element === scrollingTop && element
      && (core = Build.BTypes & BrowserType.Firefox ? getParentVApi()
              : frameElement_() && getParentVApi())
      && !doesScroll(element, di, amount || (fromMax ? 1 : 0))) {
        core.c(di, amount0, isTo as 0, factor, fromMax as false);
        if (core.y().k) {
          scrollTick(1)
          joined = core
        }
        amount = 0;
    }
    if (isTo && element === scrollingTop) {
      amount && di && setPreviousMarkPosition()
      if (!joined && options && (options as Extract<typeof options, {dest: string}>).sel === "clear") {
        resetSelectionToDocStart()
      }
    }
    preventPointEvents = options && options.keepHover === !1
    vApi.$(element, di, amount)
    preventPointEvents = 0
    scrolled = 0
    scrollingTop = null
    if (amount && readyState_ > "i" && overrideScrollRestoration) {
      overrideScrollRestoration("scrollRestoration", "manual", "unload")
    }
} as {
    (di: ScrollByY, amount: number, isTo: 0
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: false
      , options?: CmdOptions[kFgCmd.scroll]): void;
    (di: ScrollByY, amount: number, isTo: 1
      , factor?: undefined | 0, fromMax?: boolean, options?: CmdOptions[kFgCmd.scroll]): void;
}

let overrideScrollRestoration = function (kScrollRestoration, kManual, kUnload): void {
    const h = history, old = h[kScrollRestoration], listen = setupEventListener,
    reset = (): void => { h[kScrollRestoration] = old; listen(0, kUnload, reset, 1); };
    if (old && old !== kManual) {
      h[kScrollRestoration] = kManual;
      overrideScrollRestoration = 0 as never
      OnDocLoaded_(() => { timeout_(reset, 1); }, 1);
      listen(0, kUnload, reset);
    }
} as ((key: "scrollRestoration", kManual: "manual", kUnload: "unload") => void) | 0

  /** @argument willContinue 1: continue; 0: skip middle steps; 2: abort further actions */
export const scrollTick = (willContinue: BOOL | 2): void => {
    keyIsDown = willContinue - 1 ? 0 : maxInterval
    willContinue > 1 && toggleAnimation && toggleAnimation()
    if (joined) {
      joined.k(willContinue)
      if (willContinue - 1) {
        joined = null
      }
    }
}

export const beginScroll = (eventWrapper: 0 | Pick<HandlerNS.Event, "e">, key: string, keybody: kChar): void => {
    if (key.includes("s-") || key.includes("a-")) { return; }
    const index = keyNames_.indexOf(keybody) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
    (index > 2 || key === keybody) && eventWrapper && prevent_(eventWrapper.e);
    if (index > 4) {
      executeScroll((~index & 1) as BOOL, index < 7 ? -1 : 1, 0)
    } else if (index > 2) {
      executeScroll(1, 0, 1, 0, index < 4)
    } else if (key === keybody) {
      executeScroll(1, index - 1.5, 0, 2)
    }
}

export const onScrolls = (event: KeyboardEventToPrevent): boolean => {
    const repeat = Build.MinCVer < BrowserVer.Min$KeyboardEvent$$Repeat$ExistsButNotWork
        && Build.BTypes & BrowserType.Chrome ? !!event.repeat : event.repeat;
    repeat && prevent_(event);
    scrollTick(<BOOL> +repeat)
    return repeat;
}

const adjustAmount = (di: ScrollByY, amount: number, element: SafeElement | null): number => {
    amount *= fgCache.t;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * (element.scrollWidth < 720 ? 2 : 1)
      ? amount * 0.6 : amount;
}

  /**
   * @param amount should not be 0
   */
const findScrollable = (di: ScrollByY, amount: number): SafeElement | null => {
    const top = scrollingTop, activeEl: SafeElement | null | undefined = deref_(currentScrolling)
    let element = activeEl;
    if (element) {;
      let reason: number, notNeedToRecheck = !di
      while (element !== top && (reason = shouldScroll_need_safe(element!
              , element === cachedScrollable ? (di + 2) as 2 | 3 : di
              , amount)) < 1) {
        if (!reason) {
          notNeedToRecheck = notNeedToRecheck || doesScroll(element!, 1, -amount)
        }
        element = (Build.BTypes & ~BrowserType.Firefox
            ? SafeEl_not_ff_!(GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent))
            : GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent) as SafeElement | null
          ) || top;
      }
      element = element !== top || notNeedToRecheck ? element : null
      cachedScrollable = weakRef_(element)
    }
    if (!element) {
      // note: twitter auto focuses its dialog panel, so it's not needed to detect it here
      const candidate = (<RegExpOne> /^(new|www)?\.?reddit\.com$/).test(loc_.host)
          ? querySelector_unsafe_("#overlayScrollContainer") : null;
      element = Build.BTypes & ~BrowserType.Firefox ? SafeEl_not_ff_!(candidate) : candidate as SafeElement | null;
    }
    if (!element && top) {
      const candidate = selectFirst({ a: 0, e: top, h: 0 })
      element = candidate && candidate.e !== top
          && (!activeEl || candidate.h > getInnerHeight() / 2)
          ? candidate.e : top;
      // if current_, then delay update to current_, until scrolling ends and ._checkCurrent is called;
      // otherwise, cache selected element for less further cost
      activeEl || (currentScrolling = weakRef_(element), cachedScrollable = 0);
    }
    return element;
}

export const prepareTop = (): void => {
  scrollingTop = scrollingEl_(1)
  if (scrollingTop) {
      getZoom_(1);
    getPixelScaleToScroll()
  }
}

export const getPixelScaleToScroll = (): void => {
    /** https://drafts.csswg.org/cssom-view/#dom-element-scrolltop
     * Imported on 2013-05-15 by https://github.com/w3c/csswg-drafts/commit/ad01664359641f791d99f0b3fce545b55579acdc
     * Firefox is still using `int`: https://bugzilla.mozilla.org/show_bug.cgi?id=1217330 (filed on 2015-10-22)
     */
  scale = (Build.BTypes & BrowserType.Firefox ? 2 : 1) / Math.min(1, wdZoom_) / Math.min(1, bZoom_)
}

const checkCurrent = (el: SafeElement | null): void => {
  let cur = deref_(currentScrolling)
  if (cur ? cur !== el && NotVisible_(cur) : currentScrolling) {
    currentScrolling = weakRef_(el), cachedScrollable = 0
  }
}

  /** if `el` is null, then return viewSize for `kScrollDim.scrollSize` */
const getDimension = (el: SafeElement | null, di: ScrollByY, index: kScrollDim & number): number => {
    let visual;
    return el !== scrollingTop || index && el
      ? !index ? di ? el!.clientHeight : el!.clientWidth
        : index < kScrollDim.position ? di ? el!.scrollHeight : el!.scrollWidth
        : di ? el!.scrollTop : el!.scrollLeft
      : index > kScrollDim.scrollSize ? di ? scrollY : scrollX
      : (visual = visualViewport,
          !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$
          || visual && (!(Build.BTypes & BrowserType.Chrome)
              || Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$ || visual.width)
          ? di ? visual!.height : visual!.width!
          : di ? getInnerHeight() : innerWidth);
}

const hasSpecialScrollSnap = (el: SafeElement | null): boolean | string | null | undefined => {
    const scrollSnap: string | null | undefined = el && getComputedStyle_(el).scrollSnapType;
    return scrollSnap !== NONE && scrollSnap;
}

const doesScroll = (el: SafeElement, di: ScrollByY, amount: number): boolean => {
    /** @todo: re-check whether it's scrollable when hasSpecialScrollSnap_ on Firefox */
    // Currently, Firefox corrects positions before .scrollBy returns,
    // so it always fails if amount < next-box-size
    const before = getDimension(el, di, kScrollDim.position),
    changed = performScroll(el, di, (amount > 0 ? 1 : -1) * scale, before)
    if (changed) {
      if (!di && hasSpecialScrollSnap(el)) {
        /**
         * Here needs the third scrolling, because in `X Prox. LTR` mode, a second scrolling may jump very far.
         * Tested on https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type .
         */
        let changed2 = performScroll(el, 0, -changed, before)
        Math.abs(changed2) > 0.2 && performScroll(el, 0, -changed2, before)
      } else if (!(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior
          || !(Build.BTypes & ~BrowserType.Firefox) || el.scrollTo) {
        el.scrollTo({behavior: "instant", [di ? "top" : "left"]: before });
      } else {
        di ? (el.scrollTop = before) : (el.scrollLeft = before);
      }
      scrolled = scrolled || 1
    }
    return !!changed;
}

const selectFirst = (info: ElementScrollInfo, skipPrepare?: 1): ElementScrollInfo | null => {
    let element = info.e;
    if (element.clientHeight + 3 < element.scrollHeight &&
        (doesScroll(element, 1, 1) || element.scrollTop > 0 && doesScroll(element, 1, 0))) {
      return info;
    }
    skipPrepare || prepareCrop_();
    let children: ElementScrollInfo[] = [], child: ElementScrollInfo | null
      , _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len]! as /** fake `as` */ SafeElement;
      // here assumes that a <form> won't be a main scrollable area
      if (Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(element)) { continue; }
      const rect = getBoundingClientRect_(element),
      visible = rect.height > 0 ? cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)
        : getVisibleClientRect_(element);
      if (visible) {
        let height_ = visible.b - visible.t;
        children.push({ a: (visible.r - visible.l) * height_, e: element, h: height_});
      }
    }
    children.sort((a, b) => b.a - a.a)
    for (const info1 of children) {
      if (child = selectFirst(info1, 1)) {
        return child;
      }
    }
    return null;
}

  /** @NEED_SAFE_ELEMENTS */
export const scrollIntoView_need_safe = (el: SafeElement): void => {
    const rect = el.getClientRects()[0] as ClientRect | undefined;
    if (!rect) { return; }
    let iw = innerWidth, ih = getInnerHeight(),
    { min, max } = Math, ihm = min(96, ih / 2), iwm = min(64, iw / 2),
    { bottom: b, top: t, right: r, left: l } = rect,
    hasY = b < ihm ? max(b - ih + ihm, t - ihm) : ih < t + ihm ? min(b - ih + ihm, t - ihm) : 0,
    hasX = r < 0 ? max(l - iwm, r - iw + iwm) : iw < l ? min(r - iw + iwm, l - iwm) : 0;
    currentScrolling = weakRef_(el)
    cachedScrollable = 0
    if (hasX || hasY) {
      for (let el2: Element | null = el; el2; el2 = GetParent_unsafe_(el2, PNType.RevealSlotAndGotoParent)) {
        const pos = getComputedStyle_(el2).position;
        if (pos === "fixed" || pos === "sticky") {
          hasX = hasY = 0;
          break;
        }
      }
      if (hasX) {
        (hasY ? performScroll : vApi.$)(findScrollable(0, hasX), 0, hasX);
      }
      if (hasY) {
        vApi.$(findScrollable(1, hasY), 1, hasY)
      }
    }
    scrolled = 0
    scrollTick(0); // it's safe to only clean keyIsDown here
}

  /** @NEED_SAFE_ELEMENTS */
export const shouldScroll_need_safe = (element: SafeElement, di: BOOL | 2 | 3, amount: number): -1 | 0 | 1 => {
    const st = getComputedStyle_(element);
    return (di ? st.overflowY : st.overflowX) === HDN && di < 2
      || st.display === NONE || st.visibility !== "visible" ? -1
      : <BOOL> +doesScroll(element, (di & 1) as BOOL
                  , amount || +!(di ? element.scrollTop : element.scrollLeft));
}

export const suppressScroll = (): void => {
    if (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage && Build.BTypes & BrowserType.Chrome
        && !allowRAF_) {
      scrolled = 0
      return;
    }
    scrolled = 2
    setupEventListener(0, "scroll");
    rAF_(function (): void {
      scrolled = 0
      setupEventListener(0, "scroll", null, 1);
    });
}

export const onActivate = (event: Event): void => {
  if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
      ? event.isTrusted : event.isTrusted !== false) {
    const path = !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        ? event.composedPath!() : event.path,
    el = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
          && !(Build.BTypes & ~BrowserType.Chrome)
        || !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        || (Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
              || !(Build.BTypes & BrowserType.Chrome)
            ? path : path && path.length > 1)
        ? path![0] as Element : event.target as Element;
    currentScrolling = weakRef_(Build.BTypes & ~BrowserType.Firefox ? SafeEl_not_ff_!(el) : el as SafeElement | null)
    cachedScrollable = 0
  }
}
