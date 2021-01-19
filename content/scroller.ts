declare const enum ScrollConsts {
    calibrationBoundary = 150, maxCalibration = 1.6, minCalibration = 0.5, SpeedChangeInterval = 47,
    minDuration = 100, durationScaleForAmount = 20,
    maxS = 1.05, minS = 0.95, delayToChangeSpeed = 75, tickForUnexpectedTime = 17, firstTick = 17,
    FirefoxMinFakeInterval = 100, // https://developer.mozilla.org/en-US/docs/Web/API/Performance/now

    DelayMinDelta = 60, DelayTolerance = 60,
    FrameIntervalMs = 16.67,
    // https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/cc978658(v=technet.10)
    //            delay         interval  # delay - interval (not so useful)
    // high:  60f / 1000ms :  400ms / 24f # 660 / 28
    // low:   15f /  250ms :   33ms /  2f # 200 / 6

    AmountLimitToScrollAndWaitRepeatedKeys = 20,
    DEBUG = 0,
}
interface ElementScrollInfo {
  /** area */ a: number;
  /** element */ e: SafeElement;
  /** height (cropped) */ h: number;
}

import {
  isAlive_, setupEventListener, timeout_, clearTimeout_, fgCache, doc, allowRAF_, readyState_, loc_, chromeVer_,
  vApi, deref_, weakRef_, VTr, createRegExp, max_, math, min_, VOther, Lower
} from "../lib/utils"
import {
  rAF_, scrollingEl_, SafeEl_not_ff_, docEl_unsafe_, NONE, frameElement_, OnDocLoaded_, GetParent_unsafe_, UNL,
  querySelector_unsafe_, getComputedStyle_, notSafe_not_ff_, HDN, isRawStyleVisible, fullscreenEl_unsafe_,
  doesSupportDialog, attr_s, getSelection_
} from "../lib/dom_utils"
import {
  scrollWndBy_, wndSize_, getZoom_, wdZoom_, bZoom_, isNotInViewport, prepareCrop_, padClientRect_, instantScOpt,
  getBoundingClientRect_, cropRectToVisible_, getVisibleClientRect_, dimSize_, scrollingTop, set_scrollingTop, isSelARange,
} from "../lib/rect"
import {
  getParentVApi, resetSelectionToDocStart, checkHidden, addElementList, curModalElement, removeModal
} from "./dom_ui"
import { isCmdTriggered } from "./key_handler"
import { hint_box, tryNestedFrame } from "./link_hints"
import { setPreviousMarkPosition } from "./marks"
import { keyNames_, prevent_ } from "../lib/keyboard_utils"

let toggleAnimation: ((scrolling?: BOOL) => void) | null = null
let maxKeyInterval = 1
let minDelay: number
let currentScrolling: WeakRef<SafeElement> | null = null
let cachedScrollable: WeakRef<SafeElement> | 0 | null = 0
let keyIsDown = 0
let preventPointEvents: BOOL | 2
let scale = 1
let joined: VApiTy | null | undefined
let scrolled = 0

export { currentScrolling, cachedScrollable, keyIsDown, scrolled }
export function set_scrolled (_newScrolled: 0): void { scrolled = _newScrolled }
export function set_currentScrolling (_newCurSc: WeakRef<SafeElement> | null): void { currentScrolling = _newCurSc }
export function set_cachedScrollable (_newCachedSc: typeof cachedScrollable): void { cachedScrollable = _newCachedSc }

let performAnimate = (newEl: SafeElement | null, newDi: ScrollByY, newAmount: number): void => {
  let amount: number, sign: number, calibration: number, di: ScrollByY, duration: number, element: SafeElement | null,
  beforePos: number, timestamp: number, rawTimestamp: number, totalDelta: number, totalElapsed: number, min_delta = 0,
  running = 0, timer: ValidTimeoutID = TimerID.None, calibTime: number,
  styleTop: SafeElement | null = null,
  animate = (newRawTimestamp: number): void => {
    const continuous = keyIsDown > 0, rawElapsed = newRawTimestamp - rawTimestamp
    let newTimestamp = newRawTimestamp, elapsed: number
    // although timestamp is mono, Firefox adds too many limits to its precision
    if (!timestamp) {
      newTimestamp = performance.now()
      elapsed = max_(newRawTimestamp + (min_delta || ScrollConsts.firstTick) - newTimestamp, 0)
      newTimestamp = max_(newRawTimestamp, newTimestamp)
      beforePos = dimSize_(element, kDim.positionX + di)
    } else if (rawElapsed < 1e-5) {
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || VOther & BrowserType.Firefox) && rawElapsed > -1e-5) {
        elapsed = min_delta || ScrollConsts.tickForUnexpectedTime
        newTimestamp = timestamp + elapsed
      } else /** when (rawElapsed < -1e-5 || rawElapsed ~= 0 && VOther !== BrowserType.Firefox) */ {
        elapsed = 0
      }
    } else {
      elapsed = newRawTimestamp > timestamp ? newRawTimestamp - timestamp : 0
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || VOther & BrowserType.Firefox)
          && rawElapsed > ScrollConsts.FirefoxMinFakeInterval - 1 && (rawElapsed === parseInt(<any> rawElapsed))) {
        if (elapsed > 1.5 * (min_delta || ScrollConsts.tickForUnexpectedTime)) {
          elapsed = min_delta || ScrollConsts.tickForUnexpectedTime
        }
        newTimestamp = timestamp + elapsed
      } else {
        rawTimestamp && (min_delta = min_(rawElapsed + 0.1, min_delta || 1e5))
      }
    }
    if (!Build.NDEBUG && ScrollConsts.DEBUG & 1) {
      console.log("rawOld>rawNew: +%o = %o ; old>new: +%o = %o ; elapsed = %o ; min_delta = %o"
          , (((newRawTimestamp - rawTimestamp) * 1e2) | 0) / 1e2
          , newRawTimestamp % 1e4 , (((newTimestamp - timestamp) * 1e2) | 0) / 1e2, newTimestamp % 1e4
          , ((elapsed * 1e2) | 0) / 1e2, ((min_delta * 1e2) | 0) / 1e2)
    }
    rawTimestamp = newRawTimestamp
    timestamp = newTimestamp
    totalElapsed += elapsed;
    if (!isAlive_ || !running) { toggleAnimation!(); return }
    if (amount < ScrollConsts.AmountLimitToScrollAndWaitRepeatedKeys
        && continuous && totalDelta >= amount && totalElapsed < minDelay - 2) {
      running = 0;
      timer = timeout_(startAnimate, minDelay - totalElapsed)
      return;
    }
    if (continuous) {
      if (totalElapsed >= ScrollConsts.delayToChangeSpeed) {
        if (totalElapsed > minDelay) { keyIsDown = keyIsDown > elapsed ? keyIsDown - elapsed : 0 }
        calibTime += elapsed
        if (ScrollConsts.minCalibration <= calibration && calibration <= ScrollConsts.maxCalibration
            && calibTime > ScrollConsts.SpeedChangeInterval) {
          const calibrationScale = ScrollConsts.calibrationBoundary / amount / calibration;
          calibration *= calibrationScale > ScrollConsts.maxS ? ScrollConsts.maxS
            : calibrationScale < ScrollConsts.minS ? ScrollConsts.minS : 1;
          calibTime = 0
        }
      }
    }
    let delta = amount * (elapsed / duration) * calibration;
    continuous || (delta = min_(delta, amount - totalDelta))
    // not use `sign * _performScroll()`, so that the code is safer even though there're bounce effects
    if (delta > 0) {
      if (!Build.NDEBUG && ScrollConsts.DEBUG & 2) {
        console.log("do scroll: %o + ceil(%o); amount=%o ; keyIsDown=%o"
            , ((totalDelta * 100) | 0) / 100, ((elapsed * 100) | 0) / 100, amount
            , ((keyIsDown * 10) | 0) / 10)
      }
      delta = performScroll(element, di, sign * math.ceil(delta), beforePos)
      beforePos += delta
      totalDelta += math.abs(delta) || 1
      rAF_(animate);
    } else if (elapsed) {
      if ((!(Build.BTypes & BrowserType.Chrome) || chromeVer_ > BrowserVer.MinMaybeScrollEndAndOverScrollEvents - 1)
          && "onscrollend" in (Build.BTypes & ~BrowserType.Firefox ? Image.prototype : doc)) {
        // according to tests on C75, no "scrollend" events if scrolling behavior is "instant";
        // the doc on Google Docs requires no "overscroll" events for programmatic scrolling
        const notEl: boolean = !element || element === scrollingEl_();
        (notEl ? doc : element!).dispatchEvent(
            new Event("scrollend", {cancelable: false, bubbles: notEl}));
      }
      checkCurrent(element)
      toggleAnimation!();
    } else {
      rAF_(animate)
    }
  },
  hasDialog = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement
      || !!(Build.BTypes & BrowserType.ChromeOrFirefox) && doesSupportDialog(),
  startAnimate = (): void => {
    timer = TimerID.None;
    running = running || rAF_(animate);
  };
  toggleAnimation = (scrolling?: BOOL): void => {
    if (!scrolling) {
      running = rawTimestamp = beforePos = calibTime = 0
      element = null
    }
    if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement
        || Build.BTypes & BrowserType.ChromeOrFirefox && hasDialog) {
      scrolling ? curModalElement || addElementList([], [0, 0], 1) : curModalElement !== hint_box && removeModal()
      return
    }
    const el = (scrolling ? Build.BTypes & ~BrowserType.Firefox ? SafeEl_not_ff_!(docEl_unsafe_()) : docEl_unsafe_()
                : styleTop) as SafeElement & ElementToHTMLorOtherFormatted | null
    styleTop = scrolling ? el : null
    el && el.style ? el.style.pointerEvents = scrolling ? NONE : "" : 0;
  };
  performAnimate = (newEl1, newDi1, newAmount1): void => {
    amount = max_(1, newAmount1 > 0 ? newAmount1 : -newAmount1), calibration = 1.0, di = newDi1
    duration = max_(ScrollConsts.minDuration, ScrollConsts.durationScaleForAmount * math.log(amount))
    element = newEl1
    sign = newAmount1 < 0 ? -1 : 1
    totalDelta = totalElapsed = 0.0
    timestamp = rawTimestamp = calibTime = 0
    if (timer) {
      clearTimeout_(timer);
    }
    const keyboard = fgCache.k;
    keyboard.length > 2 && (min_delta = min_(min_delta, +keyboard[2]! || min_delta))
    maxKeyInterval = keyboard[1] * 2 + ScrollConsts.DelayTolerance
    minDelay = keyboard[0] + max_(keyboard[1], ScrollConsts.DelayMinDelta) + ScrollConsts.DelayTolerance
    preventPointEvents && (preventPointEvents > 1 || !isSelARange(getSelection_())) && toggleAnimation!(1)
    startAnimate();
  };
  performAnimate(newEl, newDi, newAmount)
}

const performScroll = ((el: SafeElement | null, di: ScrollByY, amount: number, before?: number): number => {
    before = before != null ? before : dimSize_(el, kDim.positionX + di)
    if (el) {
      !(Build.BTypes & BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
      !(Build.BTypes & ~BrowserType.Firefox) ||
      // avoid using `Element`, so that users may override it
      el.scrollBy ? el.scrollBy(instantScOpt(di, amount))
      : di ? el.scrollTop = before + amount : el.scrollLeft = before + amount
    } else {
      scrollWndBy_(di, amount)
    }
    return dimSize_(el, kDim.positionX + di) - before
}) as {
  (el: SafeElement | null, di: ScrollByY, amount: number, before?: number): number
}

/** should not use `scrollingTop` (including `dimSize_(scrollingTop, clientH/W)`) */
export const $sc = (element: SafeElement | null, di: ScrollByY, amount: number): void => {
    if (hasSpecialScrollSnap(element)) {
      while (amount * amount >= 1 && !performScroll(element, di, amount)) {
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
    if (checkHidden(kFgCmd.scroll, options, count)) { return }
    if (tryNestedFrame(kFgCmd.scroll, options, count)) { return }
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
    set_scrollingTop(scrollingEl_(1))
    if (scrollingTop) {
      getZoom_(1)
      getPixelScaleToScroll()
    }
    const element = findScrollable(di, isTo ? fromMax ? 1 : -1 : amount0)
    let amount = !factor ?
        (!di && amount0 && element && dimSize_(element, kDim.scrollW)
            <= dimSize_(element, kDim.scrollH) * (dimSize_(element, kDim.scrollW) < 720 ? 2 : 1)
          ? amount0 * 0.6 : amount0) * fgCache.t
      : factor === 1 ? amount0
      : amount0 * dimSize_(element, di + (factor === "max" ? kDim.scrollW : kDim.viewW))
    if (isTo) {
      const curPos = dimSize_(element, di + kDim.positionX),
      viewSize = dimSize_(element, di + kDim.viewW),
      max = (fromMax || amount) && dimSize_(element, di + kDim.scrollW) - viewSize
      amount = element ? max_(0, min_(fromMax ? max - amount : amount, max)) - curPos
          : fromMax ? viewSize : amount - curPos;
    }
    let core: ReturnType<typeof getParentVApi> | false;
    if (element === scrollingTop && element
      && (core = Build.BTypes & BrowserType.Firefox ? !fullscreenEl_unsafe_() && getParentVApi()
              : frameElement_() && !fullscreenEl_unsafe_() && getParentVApi())
      && (Lower(attr_s(frameElement_()!, "scrolling") || "") === "no"
          || !doesScroll(element, di, amount || (fromMax ? 1 : 0)))) {
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
    set_scrollingTop(null)
    const keepHover = options && options.keepHover
    preventPointEvents = keepHover === !1 ? 1 : keepHover === "never" ? 2 : 0
    vApi.$(element, di, amount)
    preventPointEvents = 0
    scrolled = 0
    if (amount && readyState_ > "i" && overrideScrollRestoration) {
      overrideScrollRestoration("scrollRestoration", "manual")
    }
} as {
    (di: ScrollByY, amount: number, isTo: 0
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: false
      , options?: CmdOptions[kFgCmd.scroll]): void;
    (di: ScrollByY, amount: number, isTo: 1
      , factor?: undefined | 0, fromMax?: boolean, options?: CmdOptions[kFgCmd.scroll]): void;
}

let overrideScrollRestoration = function (kScrollRestoration, kManual): void {
    const h = history, old = h[kScrollRestoration], listen = setupEventListener,
    reset = (): void => { h[kScrollRestoration] = old; listen(0, UNL, reset, 1); };
    if (old && old !== kManual) {
      h[kScrollRestoration] = kManual;
      overrideScrollRestoration = 0 as never
      OnDocLoaded_(() => { timeout_(reset, 1); }, 1);
      listen(0, UNL, reset);
    }
} as ((key: "scrollRestoration", kManual: "manual") => void) | 0

  /** @argument willContinue 1: continue; 0: skip middle steps; 2: abort further actions */
export const scrollTick = (willContinue: BOOL | 2): void => {
    if (!Build.NDEBUG && ScrollConsts.DEBUG & 4 && (keyIsDown || willContinue === 1)) {
      console.log("update keyIsDown from", ((keyIsDown * 10) | 0) / 10, "to", willContinue - 1 ? 0 : maxKeyInterval, "@"
          , ((performance.now() % 1e3 * 1e2) | 0) / 1e2)
    }
    keyIsDown = willContinue - 1 ? 0 : maxKeyInterval
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

  /**
   * @param amount should not be 0
   */
const findScrollable = (di: ScrollByY, amount: number): SafeElement | null => {
  const selectFirst = (info: ElementScrollInfo, skipPrepare?: 1): ElementScrollInfo | null | undefined => {
    let cur_el = info.e
    if (dimSize_(cur_el, kDim.elClientH) + 3 < dimSize_(cur_el, kDim.scrollH) &&
        ((cur_el === scrollingTop ? shouldScroll_s(cur_el, kDim.byY, 1) > 0 : doesScroll(cur_el, kDim.byY, 1))
          || dimSize_(cur_el, kDim.positionY) > 0 && doesScroll(cur_el, kDim.byY, 0))) {
      return info
    }
    skipPrepare || prepareCrop_()
    let children: ElementScrollInfo[] = []
    for (let _ref = cur_el.children, _len = _ref.length; 0 < _len--; ) {
      cur_el = _ref[_len]! as /** fake `as` */ SafeElement
      // here assumes that a <form> won't be a main scrollable area
      if (Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(cur_el)) { continue }
      const rect = padClientRect_(getBoundingClientRect_(cur_el))
      const visible = rect.b > rect.t ? cropRectToVisible_(rect.l, rect.t, rect.r, rect.b)
          : getVisibleClientRect_(cur_el)
      if (visible) {
        let height_ = visible.b - visible.t
        children.push({ a: (visible.r - visible.l) * height_, e: cur_el, h: height_})
      }
    }
    children.sort((a, b) => b.a - a.a)
    return children.reduce((cur, info1) => cur || selectFirst(info1, 1), null as ElementScrollInfo | null | undefined)
  }

    const top = scrollingTop, activeEl: SafeElement | null | undefined = deref_(currentScrolling)
    let element = activeEl;
    if (element) {;
      while (element !== top && shouldScroll_s(element!
              , element === cachedScrollable ? (di + 2) as 2 | 3 : di
              , amount) < 1) {
        element = (Build.BTypes & ~BrowserType.Firefox
            ? SafeEl_not_ff_!(GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent))
            : GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent) as SafeElement | null
          ) || top;
      }
      element = element !== top ? element : null
      cachedScrollable = weakRef_(element)
    }
    if (!element) {
      // note: twitter auto focuses its dialog panel, so it's not needed to detect it here
      const candidate = createRegExp(kTip.redditHost, "").test(loc_.host)
          ? querySelector_unsafe_(VTr(kTip.redditOverlay)) : null;
      element = Build.BTypes & ~BrowserType.Firefox ? SafeEl_not_ff_!(candidate) : candidate as SafeElement | null;
    }
    if (!element && top) {
      const candidate = selectFirst({ a: 0, e: top, h: 0 })
      element = candidate && candidate.e !== top
          && (!activeEl || candidate.h > wndSize_() / 2)
          ? candidate.e : top;
      // if current_, then delay update to current_, until scrolling ends and ._checkCurrent is called;
      // otherwise, cache selected element for less further cost
      activeEl || (currentScrolling = weakRef_(element), cachedScrollable = 0);
    }
    return element;
}

export const getPixelScaleToScroll = (): void => {
    /** https://drafts.csswg.org/cssom-view/#dom-element-scrolltop
     * Imported on 2013-05-15 by https://github.com/w3c/csswg-drafts/commit/ad01664359641f791d99f0b3fce545b55579acdc
     * Firefox is still using `int`: https://bugzilla.mozilla.org/show_bug.cgi?id=1217330 (filed on 2015-10-22)
     */
  scale = (Build.BTypes & BrowserType.Firefox ? 2 : 1) / min_(1, wdZoom_) / min_(1, bZoom_)
}

const checkCurrent = (el: SafeElement | null): void => {
  let cur = deref_(currentScrolling)
  if (cur ? cur !== el && isNotInViewport(cur) : currentScrolling) {
    currentScrolling = weakRef_(el), cachedScrollable = 0
  }
}

const hasSpecialScrollSnap = (el: SafeElement | null): boolean | string | null | undefined => {
    const scrollSnap: string | null | undefined = el && getComputedStyle_(el).scrollSnapType;
    return scrollSnap !== NONE && scrollSnap;
}

const doesScroll = (el: SafeElement, di: ScrollByY, amount: number): boolean => {
    /** @todo: re-check whether it's scrollable when hasSpecialScrollSnap_ on Firefox */
    // Currently, Firefox corrects positions before .scrollBy returns,
    // so it always fails if amount < next-box-size
    const before = dimSize_(el, di + kDim.positionX),
    changed = performScroll(el, di, (amount > 0 ? 1 : -1) * scale, before)
    if (changed) {
      if (!di && hasSpecialScrollSnap(el)) {
        /**
         * Here needs the third scrolling, because in `X Prox. LTR` mode, a second scrolling may jump very far.
         * Tested on https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type .
         */
        let changed2 = performScroll(el, 0, -changed, before)
        changed2 * changed2 > 0.1 && performScroll(el, 0, -changed2, before)
      } else if (!(Build.BTypes & BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior
          || !(Build.BTypes & ~BrowserType.Firefox) || el.scrollTo) {
        el.scrollTo(instantScOpt(di, before))
      } else {
        di ? (el.scrollTop = before) : (el.scrollLeft = before);
      }
      scrolled = scrolled || 1
    }
    return !!changed;
}

export const scrollIntoView_s = (el?: SafeElement | null): void => {
    const rect = el && el.getClientRects()[0] as ClientRect | undefined
    if (!rect) { return; }
    let r = padClientRect_(rect), iw = wndSize_(1), ih = wndSize_(),
    ihm = min_(96, ih / 2), iwm = min_(64, iw / 2),
    hasY = r.b < ihm ? max_(r.b - ih + ihm, r.t - ihm) : ih < r.t + ihm ? min_(r.b - ih + ihm, r.t - ihm) : 0,
    hasX = r.r < 0 ? max_(r.l - iwm, r.r - iw + iwm) : iw < r.l ? min_(r.r - iw + iwm, r.l - iwm) : 0
    currentScrolling = weakRef_(el!)
    cachedScrollable = 0
    if (hasX || hasY) {
      for (let el2: Element | null = el!; el2; el2 = GetParent_unsafe_(el2, PNType.RevealSlotAndGotoParent)) {
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

export const shouldScroll_s = (element: SafeElement, di: BOOL | 2 | 3, amount: number): -1 | 0 | 1 => {
    const st = getComputedStyle_(element);
    return (di ? st.overflowY : st.overflowX) === HDN && di < 2
      || st.display === NONE || !isRawStyleVisible(st) ? -1
      : <BOOL> +doesScroll(element, (di & 1) as BOOL, amount || +!dimSize_(element, kDim.positionX + di))
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
