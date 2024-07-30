declare const enum ScrollConsts {
    calibrationBoundary = 150, maxCalibration = 1.6, minCalibration = 0.5, SpeedChangeInterval = 47,
    minDuration = 120, durationScaleForAmount = 20, // 120 ~= 20 * ln(400)
    maxS = 1.05, minS = 0.95, delayToChangeSpeed = 75, tickForUnexpectedTime = 17, firstTick = 17,
    FirefoxMinFakeInterval = 100, // https://developer.mozilla.org/en-US/docs/Web/API/Performance/now

    DelayMinDelta = 60, DelayTolerance = 60,
    FrameIntervalMs = 16.67,
    // https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/cc978658(v=technet.10)
    //            delay         interval  # delay - interval (not so useful)
    // high:  60f / 1000ms :  400ms / 24f # 660 / 28
    // low:   15f /  250ms :   33ms /  2f # 200 / 6

    AmountLimitToScrollAndWaitRepeatedKeys = 40,
    MinLatencyToAutoPreventHover = 20,
    DEBUG = 0,
}
interface ElementScrollInfo {
  /** area */ a: number;
  /** element */ e: SafeElement;
  /** height (cropped) */ h: number;
}

import {
  isAlive_, setupEventListener, timeout_, clearTimeout_, fgCache, doc, noRAF_old_cr_, readyState_, chromeVer_,
  vApi, weakRef_not_ff, max_, math, min_, Lower, OnChrome, OnFirefox, OnEdge, WithDialog,
  isTop, injector, isTY, promiseDefer_, weakRef_ff, Stop_, abs_, queueTask_
} from "../lib/utils"
import {
  rAF_, scrollingEl_, SafeEl_not_ff_, docEl_unsafe_, NONE, frameElement_, OnDocLoaded_, GetParent_unsafe_, elFromPoint_,
  querySelector_unsafe_, getComputedStyle_, isSafeEl_, HDN, isRawStyleVisible, fullscreenEl_unsafe_, getEventPath,
  doesSupportDialog, attr_s, getSelection_, isIFrameElement, derefInDoc_, isHTML_, IsAInB_, getRootNode_mounted,
  getEditableType_, dispatchAsync_, newEvent_, findSelectorByHost, dispatchEvent_
} from "../lib/dom_utils"
import {
  scrollWndBy_, wndSize_, getZoom_, wdZoom_, bZoom_, isNotInViewport, prepareCrop_, boundingRect_, instantScOpt,
  getBoundingClientRect_, getVisibleBoundingRect_, getVisibleClientRect_, dimSize_, scrollingTop, set_scrollingTop,
  isSelARange
} from "../lib/rect"
import {
  getParentVApi, resetSelectionToDocStart, checkHidden, addElementList, curModalElement, removeModal
} from "./dom_ui"
import { isCmdTriggered } from "./key_handler"
import { detectUsableChild, hint_box, tryNestedFrame } from "./link_hints"
import { setPreviousMarkPosition } from "./marks"
import { isRepeated_, keyNames_, prevent_ } from "../lib/keyboard_utils"
import { post_, runFallbackKey } from "./port"

const kSE = "scrollend"

let toggleAnimation: ((scrolling?: BOOL | /** resume */ 4) => void) | null = null
let maxKeyInterval = 1
let minDelay: number
let currentScrolling: WeakRef<SafeElement> | null = null
let cachedScrollable: WeakRef<SafeElement> | null = null
let keyIsDown = 0
let preventPointEvents: BOOL | 2 | ScrollConsts.MinLatencyToAutoPreventHover
let scale = 1
let joined: VApiTy | null | undefined
let scrolled: 0 | 1 | 2 = 0
let isTopScrollable: -1 | 0 | 1 = 1

export { currentScrolling, cachedScrollable, keyIsDown, scrolled }
export const setNewScrolling = (el: Element | null): void => {
  currentScrolling = OnFirefox ? weakRef_ff(el as SafeElement | null, kElRef.currentScrolling)
      : weakRef_not_ff!(SafeEl_not_ff_!(el))
  cachedScrollable = null
}
export function set_cachedScrollable (_newCurSc: typeof currentScrolling): void { cachedScrollable = _newCurSc }

const norm = (i: number) => parseFloat(i.toFixed(2))
const norm3 = (i: number) => parseFloat(i.toFixed(3))
const norm4 = (i: number) => parseFloat(i.toFixed(4))

let performAnimate = (newEl: SafeElement | null, newDi: ScrollByY, newAmount: number
    , newOpts?: CmdOptions[kFgCmd.scroll]): ReturnType<VApiTy["$"]> => {
  const hasNewScrollEnd =
      OnChrome && (Build.MinCVer >= BrowserVer.MinEnsuredScrollend || chromeVer_ > BrowserVer.MinEnsuredScrollend - 1)
      || (OnFirefox || OnChrome && (Build.MinCVer >= BrowserVer.MinScrollEndForInstantScrolling
        || chromeVer_ > BrowserVer.MinScrollEndForInstantScrolling - 1)) && ("on" + kSE) in Image.prototype
  let amount: number, sign: number, calibration: number, di: ScrollByY, duration: number, element: SafeElement | null,
  elementRoot: DocumentFragment | Document | 0,
  beforePos: number, timestamp: number, rawTimestamp: number, totalDelta: number, totalElapsed: number, min_delta = 0,
  running = 0, flags: kScFlag & number, calibTime: number, lostFrames: number, totalTick: number,
  styleTop: SafeElement | HTMLElement | null | undefined, onFinish: ((succeed: number) => void) | 0 | undefined,
  wait2: number | boolean | null | undefined, timer: ValidTimeoutID = TimerID.None, padding: number,
  animate = (newRawTimestamp: number): void => {
    const continuous = keyIsDown > 0
    let rawElapsed = newRawTimestamp - rawTimestamp
    let newTimestamp = newRawTimestamp, elapsed: number, delay2: number;
    // although timestamp is mono, Firefox adds too many limits to its precision
    if (!timestamp) {
      newTimestamp = performance.now()
      elapsed = max_(newRawTimestamp + (min_delta || ScrollConsts.firstTick) - newTimestamp, 1)
      newTimestamp = max_(newRawTimestamp, newTimestamp)
      beforePos = dimSize_(element, kDim.positionX + di)
    } else if (rawElapsed < 3 && totalTick < 2) {
      elapsed = min_delta || ScrollConsts.tickForUnexpectedTime
      newTimestamp = timestamp + elapsed
    } else if (rawElapsed < 1e-5) {
      if (OnFirefox && rawElapsed > -1e-5) {
        elapsed = min_delta || ScrollConsts.tickForUnexpectedTime
        newTimestamp = timestamp + elapsed
      } else /** when (rawElapsed < -1e-5 || rawElapsed ~= 0 && !OnFirefox) */ {
        elapsed = 0
      }
    } else if (timer) {
      elapsed = min_delta; timer = TimerID.None
    } else {
      elapsed = newRawTimestamp > timestamp ? newRawTimestamp - timestamp : 0
      if (OnFirefox && rawElapsed > ScrollConsts.FirefoxMinFakeInterval - 1
          && (rawElapsed === parseInt(rawElapsed as number | string as string))) {
        if (elapsed > 1.5 * (min_delta || ScrollConsts.tickForUnexpectedTime)) {
          elapsed = min_delta || ScrollConsts.tickForUnexpectedTime
        }
        newTimestamp = timestamp + elapsed
      } else {
        if (preventPointEvents > ScrollConsts.MinLatencyToAutoPreventHover - 1 && rawElapsed > preventPointEvents
            && min_delta > 4 && rawElapsed > min_delta * 1.8 && ++lostFrames > 2) {
          preventPointEvents = 2
          toggleAnimation!(1)
        }
        min_delta = !rawTimestamp ? min_delta : !min_delta ? rawElapsed < 3 && rawTimestamp !== timestamp ? 0
            : min_(max_(rawTimestamp !== timestamp ? 11 : 6, rawElapsed + 0.1), ScrollConsts.firstTick)
            : rawElapsed < min_delta * 0.7 ? 0.85 * min_delta : rawElapsed < min_delta * 1.3
            ? (min_delta + rawElapsed) / 2 : (min_delta * 7 + rawElapsed) / 8
      }
    }
    totalElapsed += elapsed
    totalTick++
    if (ScrollConsts.DEBUG & 1) {
      console.log("rawOld>rawNew: +%o = %o ; old>new: +%o = %o ; elapsed: +%o = %o; min_delta = %o (%o fps)"
          , norm3((rawTimestamp ? newRawTimestamp : newRawTimestamp % 3e5) - rawTimestamp)
          , norm3(newRawTimestamp % 3e5)
          , norm3((timestamp ? newTimestamp : newTimestamp % 3e5) - timestamp)
          , norm3(newTimestamp % 3e5)
          , norm(elapsed), norm(totalElapsed), norm4(min_delta)
          , min_delta ? math.round(1000 / min_delta * 10) / 10 : -1
      )
    }
    rawTimestamp = newRawTimestamp
    timestamp = newTimestamp
    if (!running || !isAlive_) { toggleAnimation!(); return }
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
    let near_elapsed = elapsed
    if (min_delta && elapsed < 1.2 * min_delta && elapsed > 0.9 * min_delta) {
      const fps_test = 1e3 / min_delta
      const step = fps_test < 95 ? fps_test < 55 ? 1 : 15 : fps_test > 149 ? fps_test < 195 ? 5 : 10 : 0
      near_elapsed = 1e3 / (step ? (math.round(fps_test / step) || 1) * step
          : fps_test < 110 ? 100 : fps_test < 132 ? 120 : 144)
    }
    let delta = max_(amount * near_elapsed / duration * calibration - padding, 1)
    if (!continuous || (totalDelta < amount || flags & kScFlag.TO) && totalElapsed < minDelay) {
      delta = max_(0, min_(delta + 2 > amount - totalDelta && delta > 4 ? amount : delta, amount - totalDelta))
    }
    if (delta > 0) {
      const wanted = delta, beforeScPos = ScrollConsts.DEBUG & 2 ? dimSize_(element, kDim.scPosX + di) : -1,
      visual = !(ScrollConsts.DEBUG & 2 && element === scrollingTop) ? null
          : !OnFirefox || Build.MinFFVer >= FirefoxBrowserVer.MinEnsured$visualViewport$ ? visualViewport
          : (window as {} as typeof globalThis).visualViewport
      const beforeViewOffset = ScrollConsts.DEBUG & 2 && visual?.[di ? "offsetTop" : "offsetLeft"] || 0
      const beforeViewPos = ScrollConsts.DEBUG & 2 && visual?.[di ? "pageTop" : "pageLeft"] || 0
      // here should keep safe even if there're bounce effects
      delta = performScroll(element, di, sign * (delta > 4 ? math.round : math.ceil)(delta), beforePos)
      if (ScrollConsts.DEBUG & 2) {
        const near_fps = 1e3 / near_elapsed, resScPos = dimSize_(element, kDim.scPosX + di)
        const resViewOffset = ScrollConsts.DEBUG & 2 && visual?.[di ? "offsetTop" : "offsetLeft"] || 0
        const resViewPos = ScrollConsts.DEBUG & 2 && visual?.[di ? "pageTop" : "pageLeft"] || 0
        console.log("do scroll: e := %o + ~(%o fps %s %o px = %o) => %o ; "
              + "r := mem %o / sc %o / view %o/%o + ~ %s%o / d %o => %o / %o / %o/%o; %o, %o"
            , /* e := */ norm(totalDelta), /* + ~( */ near_fps > 300 ? -1 : norm(near_fps) /* fps */
                , padding > 0 ? "-" : "+", norm(abs_(padding)), /* px = */ norm(wanted) /* ) */
                , /* => */ norm(totalDelta + sign * (wanted > 4 ? math.round : math.ceil)(wanted))
            , /* r := mem */ norm(beforePos), /* / sc */ norm(beforeScPos)
                , /* / view */ norm(beforeViewOffset), /* / */ norm(beforeViewPos)
                , /* + ~ */ sign > 0 ? "" : "-", norm(wanted), /* / d */norm(delta), /* => */ norm(beforePos + delta)
                , /* / */ norm(resScPos), /* / */ norm(resViewOffset), /* / */ norm(resViewPos)
            , /* am= */ norm(amount), norm(keyIsDown))
      }
      padding = wanted > 4 && abs_(delta - wanted) < 2 ? delta - wanted : 0
      // if `scrollPageDown`, then amount is very large, but when it has been at page top/bottom,
      // `performScroll` will only return 0, then `delta || 1` is never enough.
      // In such cases stop directly
      beforePos += delta
      totalDelta += abs_(delta)
    }
    if (delta && (!onFinish || totalDelta < amount)) {
      if (wait2 != 0 && totalDelta >= amount && continuous
          && totalElapsed < (delay2 = wait2! > 1 ? +wait2! : minDelay) - min_delta
          && (wait2! > 1 || flags & kScFlag.TO || amount < ScrollConsts.AmountLimitToScrollAndWaitRepeatedKeys)) {
        running = 0
        timer = timeout_(/*#__NOINLINE__*/ resumeAnimation, delay2 - totalElapsed)
        totalElapsed = delay2
        if (ScrollConsts.DEBUG) {
          console.log(">>> [animation] wait for %o - %o ms", delay2, norm(totalElapsed))
        }
      } else {
        rAF_(animate)
      }
    } else if (elapsed) {
      const el2 = element
      if (!Build.NDEBUG) { totalElapsed -= elapsed }
      onFinish && onFinish(totalDelta)
      toggleAnimation!()
      if (!OnFirefox) { // split code and avoid `return` to make released file smaller
        // according to tests on C75, no "scrollend" events if scrolling behavior is "instant";
        // the doc on Google Docs requires no "overscroll" events for programmatic scrolling
        if (OnChrome && hasNewScrollEnd) { // ignore Chrome 74~77 with EXP enabled, to make code smaller
          const notEl: boolean = !el2 || el2 === scrollingEl_()
          // queueMicrotask can not be used to avoid async stack tracing on Chrome 114
          dispatchEvent_(notEl ? doc : el2!, newEvent_(kSE, 1, 1, !notEl))
        }
        checkCurrent(el2)
      } else if (hasNewScrollEnd) { // avoiding async stack tracing on Firefox 114
        const notEl: boolean = !el2 || el2 === scrollingEl_();
        void dispatchAsync_(notEl ? doc : el2!, newEvent_(kSE, 1, 1, !notEl))
            .then(checkCurrent.bind(0, el2))
      } else {
        checkCurrent(el2)
      }
    } else {
      rAF_(animate)
    }
  },
  domFeatures: 0 | 1 | 2 | 3 = 0,
  awaitAndAnimate = (): number => rAF_(() => rAF_(() => rAF_(animate))),
  resumeAnimation = (): void => {
    padding = 0
    if (!keyIsDown) { toggleAnimation!(); return }
    flags & kScFlag.TO && amount > fgCache.t && (amount = min_(amount, dimSize_(element, di + kDim.viewW) / 2) | 0)
    running = running || rAF_(animate);
  };
  toggleAnimation = (scrolling?: BOOL | 4): void => {
    if (scrolling === 4) { wait2 || timer && (clearTimeout_(timer), resumeAnimation()); return }
    if (!scrolling) {
      if (ScrollConsts.DEBUG) {
        console.log(">>> [animation] end after %o ms / %o px / %o ticks"
            , norm(totalElapsed), norm(totalDelta), totalTick)
      }
      (OnChrome || OnFirefox) && hasNewScrollEnd && setupEventListener(elementRoot, kSE, Stop_, 1)
      elementRoot = totalTick =
      running = timestamp = rawTimestamp = beforePos = calibTime = preventPointEvents = lostFrames = onFinish = 0
      element = null
      set_scrollingTop(null)
    }
    const P = "pointerEvents"
    let el: SafeElement & ElementToHTMLOrForeign | HTMLElement | null
    let style: CSSStyleDeclaration | null | undefined
    if (!(OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement) && !domFeatures && isHTML_()) {
      domFeatures = // here should not use inert - it affects too many DOM APIs
          OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement || WithDialog && doesSupportDialog() ? 2
          : 1
    }
    if (!isHTML_()) { /* empty */ }
    else if (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement || domFeatures > 1) {
      scrolling ? curModalElement || addElementList([], [0, 0], 1) : curModalElement !== hint_box && removeModal()
    } else {
      el = (scrolling ? OnFirefox ? docEl_unsafe_() : SafeEl_not_ff_!(docEl_unsafe_())
                : styleTop) as SafeElement & ElementToHTMLOrForeign | null
      style = el && el.style
      styleTop = scrolling && style && !style[P] ? el : null
      style && (style[P] = scrolling ? NONE : "")
    }
  };
  performAnimate = (newEl1, newDi1, newAmount1, options): ReturnType<VApiTy["$"]> => {
    amount = max_(1, newAmount1 > 0 ? newAmount1 : -newAmount1), calibration = 1.0, di = newDi1
    flags = options ? options.f! | 0 : 0
    wait2 = options && options.wait
    duration = math.round(max_(1, ScrollConsts.durationScaleForAmount * math.log(amount) / ScrollConsts.minDuration
        ) * fgCache.u)
    element = newEl1
    sign = newAmount1 < 0 ? -1 : 1
    clearTimeout_(timer)
    timer = TimerID.None
    totalDelta = totalElapsed = padding = 0.0
    timestamp = rawTimestamp = calibTime = lostFrames = onFinish = totalTick = 0
    const keyboard = fgCache.k;
    keyboard.length > 2 && (min_delta = min_(min_delta, +keyboard[2]! || min_delta))
    maxKeyInterval = max_(min_delta, keyboard[1]) * 2 + ScrollConsts.DelayTolerance
    minDelay = keyboard[0] + max_(keyboard[1], ScrollConsts.DelayMinDelta) + ScrollConsts.DelayTolerance;
    (preventPointEvents === 2 || preventPointEvents === 1 && !isSelARange(getSelection_())) && toggleAnimation!(1)
    if ((OnChrome || OnFirefox) && hasNewScrollEnd) {
      elementRoot = element ? getRootNode_mounted(element as EnsuredMountedElement & typeof element) : doc
      elementRoot = elementRoot !== doc ? elementRoot : 0
      setupEventListener(elementRoot, kSE)
    }
    if (ScrollConsts.DEBUG) {
      console.log("%c[animation]%c start with axis = %o, amount = %o, dir = %o, duration = %o, min_delta = %o%s %s"
          , "color: #1155cc", "color: auto", di ? "y" : "x", norm(amount), sign, duration
          , norm4(min_delta)
          , `\n  keyInterval = ${maxKeyInterval}, minDelay = ${minDelay}` // lgtm [js/useless-expression]
          , `flags = ${flags}, wait2 = ${wait2 ?? -1}`) // lgtm [js/useless-expression]
    }
    if (OnFirefox) {
      const visual_ff = element !== scrollingTop ? null
          : Build.MinFFVer >= FirefoxBrowserVer.MinEnsured$visualViewport$ ? visualViewport
          : (window as {} as typeof globalThis).visualViewport
      if (visual_ff && visual_ff.scale > 1) {
        const scPos = dimSize_(element, kDim.scPosX + di)
        const oriSize = wndSize_((1 - di) as BOOL)
        const lacked = max_(2, min_(amount, 30)) - (sign < 0 ? scPos
            : dimSize_(element, kDim.scrollW + di) - oriSize - scPos)
        if (lacked > 0) {
          const offset = di ? visual_ff!.offsetTop : visual_ff!.offsetLeft
          const fromScaledViewEnd = sign < 0 ? oriSize - visual_ff!.height - offset + lacked : offset + lacked
          if (fromScaledViewEnd > 0) {
            const stat_ = (): [scrollLeftTop: number, visualOffsetLeftTop: number] | null => ScrollConsts.DEBUG & 2
                ? [dimSize_(element, kDim.scPosX + di), visual_ff![di ? "offsetTop" : "offsetLeft"]] : null
            const st1 = stat_()
            performScroll(element, di, -sign * fromScaledViewEnd, 0)
            const st2 = stat_()
            performScroll(element, di, sign * fromScaledViewEnd, 0)
            if (ScrollConsts.DEBUG & 2) {
              console.log("fix scaled view: %o, %o / %o + ~ => %o / %o, - ~ => %o / %o"
                  , ...[fromScaledViewEnd].concat(st1!, st2!, stat_()!).map(norm))
            }
            running = awaitAndAnimate()
          }
        }
      }
    }
    running = running || rAF_(animate)
    let defer: ReturnType<(typeof promiseDefer_<number>)>
    return options && (options.$then || options.$else) && (defer = promiseDefer_(), onFinish = defer.r, defer.p) || 0
  };
  return performAnimate(newEl, newDi, newAmount, newOpts)
}

const performScroll = ((el: SafeElement | null, di: ScrollByY, amount: number, before?: number): number => {
    before = before != null ? before : dimSize_(el, kDim.positionX + di)
    if (el) {
      (OnChrome ? Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior : !OnEdge) ||
      // avoid using `Element`, so that users may override it
      el.scrollBy
      ? el.scrollBy(instantScOpt(di ? 0 : amount, di && amount))
      : di ? el.scrollTop = before + amount : el.scrollLeft = before + amount
    } else {
      scrollWndBy_(di ? 0 : amount, di && amount)
    }
    return dimSize_(el, kDim.positionX + di) - before
}) as {
  (el: SafeElement | null, di: ScrollByY, amount: number, before?: number): number
}

/** should not use `scrollingTop` (including `dimSize_(scrollingTop, clientH/W)`) */
export const $sc: VApiTy["$"] = (element, di, amount, options): ReturnType<VApiTy["$"]> => {
    let ret: ReturnType<VApiTy["$"]>;
    if (hasSpecialScrollSnap(element)) {
      while (amount * amount >= 1 && !(ret = performScroll(element, di, amount))) {
        amount /= 2;
      }
      checkCurrent(element)
    } else if ((options && options.smooth != null ? options.smooth : fgCache.s)
        && !(OnChrome && Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage && noRAF_old_cr_)) {
      amount && (ret = performAnimate(element, di, amount, options))
      scrollTick(1)
    } else if (amount) {
      ret = performScroll(element, di, amount)
      checkCurrent(element)
    }
    return ret
}

export const activate = (options: CmdOptions[kFgCmd.scroll] & SafeObject, count: number): void => {
    if (options.$c == null) {
      options.$c = isCmdTriggered
    }
    if (checkHidden(kFgCmd.scroll, options, count)) { return }
    if (tryNestedFrame(kFgCmd.scroll, options, count)) { return }
    const di: ScrollByY = options.axis === "x" ? 0 : 1, oriCount = count,
    dest = options.dest;
    let fromMax = dest === "max";
    count = abs_(count) < (options.outer! | 0) ? 1 : count
    if (dest) {
      if (count < 0) { fromMax = !fromMax; count = -count; }
      count--;
      count = max_(0, count + (+options.offset! || 0))
    }
    count *= +(options.dir!) || 1
    executeScroll(di, count, dest ? fromMax ? kScFlag.toMax : kScFlag.toMin : kScFlag.scBy as never
        , options.view as undefined, options, oriCount)
    if (keyIsDown && !options.$c) {
      scrollTick(0)
    }
}

  /**
   * @param amount0 can not be 0 if without `kScFlag.TO` else can not be negative
   * @param factor the scale factor of `amount0`
   * @param fromMax can not be true, if without `kScFlag.TO`
   */
export const executeScroll: VApiTy["c"] = function (di: ScrollByY, amount0: number, flags: kScFlag & number
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined
      , options?: CmdOptions[kFgCmd.scroll], oriCount?: number, force?: 1): void {
    const toFlags = flags & (kScFlag.TO | kScFlag.INC), toMax = (toFlags - kScFlag.TO) as BOOL
    let core: ReturnType<typeof getParentVApi> | false
    {
      const childFrame = !force && derefInDoc_(currentScrolling)
      core = childFrame && isIFrameElement(childFrame) && detectUsableChild(childFrame)
      if (core) {
        core.c(di, amount0, flags as 0, factor, options, oriCount)
        if (core.y().k) {
          scrollTick(1)
          joined = core
        }
        return
      }
    }
    set_scrollingTop(scrollingEl_(1))
    if (scrollingTop) {
      getPixelScaleToScroll()
    }
    const outer = options && +options.outer! || 0
    const element = findScrollable(di, toFlags ? toMax || -1 : amount0
        , outer > 0 ? oriCount! <= outer ? abs_(oriCount!) : 1 : -outer | 0
        , options && (options.scroll ? options.scroll === "force"
            : options.evenIf != null ? (options.evenIf & kHidden.OverflowHidden) as 0 | 2 : null)
        , options && options.scrollable)
    const elementIsTop = element === scrollingTop
    const mayUpperFrame = !isTop && elementIsTop && element && !fullscreenEl_unsafe_()
    let viewSize: number | undefined, toDoInSelf: BOOL = 1,
    amount = elementIsTop && isTopScrollable < 1 ? 0 : !factor ?
        (!di && amount0 && element && dimSize_(element, kDim.scrollW)
            <= dimSize_(element, kDim.scrollH) * (dimSize_(element, kDim.scrollW) < 720 ? 2 : 1)
          ? amount0 * 0.6 : amount0) * fgCache.t
      : factor === 1 ? amount0
      : amount0 && amount0 * (viewSize = dimSize_(element, di + kDim.viewW),
            factor !== "max" ? viewSize : dimSize_(element, di + kDim.scrollW) - viewSize)
    if (toFlags) {
      viewSize = viewSize || dimSize_(element, di + kDim.viewW)
      const curPos = dimSize_(element, di + kDim.positionX),
      rawMax = (toMax || amount) && dimSize_(element, di + kDim.scrollW),
      boundingMax = elementIsTop && element ? getBoundingClientRect_(element).height : 0,
      max = (boundingMax > rawMax && boundingMax < rawMax + 1 ? boundingMax : rawMax) - viewSize
      const oldAmount = amount
      amount = max_(0, min_(toMax ? max - amount : amount, max)) - curPos
      amount = oldAmount > 0 && amount * amount < 1 ? 0 : amount
      amount = amount0 ? amount : toMax ? max_(amount, 0) : min_(amount, 0)
      if (ScrollConsts.DEBUG & 8) {
        console.log("[scrollTo] cur=%o view=%o max=%o amount=%o, so final amount=%o", norm(curPos), norm(viewSize)
            , norm(max), norm(oldAmount), norm(amount))
      }
    }
    amount = amount * amount > 0.01 ? amount : 0
    if (mayUpperFrame && (core = getParentVApi())
        && (!amount || Lower(attr_s(frameElement_()!, "scrolling") || "") === "no"
            || !doesScroll(element, di, amount || toMax))) {
        core.c(di, amount0, flags as 0, factor, options, oriCount, 1)
        if (core.y().k) {
          scrollTick(1)
          joined = core
        }
        amount = toDoInSelf = 0
    } else if (mayUpperFrame && options && !injector && !(options as OptionsWithForce).$forced
        && options.acrossFrames !== false
        && (!amount || !core && !doesScroll(element, di, amount || toMax))) {
      post_({ H: kFgReq.gotoMainFrame, f: 1, c: kFgCmd.scroll, n: oriCount!, a: options as OptionsWithForce })
      amount = toDoInSelf = 0
    }
    if (toFlags && elementIsTop && amount) {
      di && setPreviousMarkPosition(1)
      if (!joined && options && (options as Extract<typeof options, {dest: string}>).sel === "clear") {
        resetSelectionToDocStart()
      }
    }
    isTopScrollable = 1
    const keepHover = options && options.keepHover
    preventPointEvents = keepHover === !1 ? 1 : keepHover === "never" ? 2
        : keepHover === "auto" ? ScrollConsts.MinLatencyToAutoPreventHover
        : keepHover! > ScrollConsts.MinLatencyToAutoPreventHover - 1
        ? keepHover as ScrollConsts.MinLatencyToAutoPreventHover : 0
    ; ((options || (options = {} as { dest: "min" | "max" } as CmdOptions[kFgCmd.scroll])).f = flags)
    if (amount && readyState_ > "i" && overrideScrollRestoration) {
      overrideScrollRestoration("scrollRestoration", "manual")
    }
    const ret = toDoInSelf && vApi.$(element, di, amount, options)
    preventPointEvents = keyIsDown ? preventPointEvents : 0
    keyIsDown || set_scrollingTop(null)
    scrolled = 0
    if (ret && isTY(ret, kTY.obj)) {
      void ret.then((succeed): void => { runFallbackKey(options!, succeed ? 0 : 2) })
    } else if (toDoInSelf) {
      runFallbackKey(options, ret ? 0 : 2)
    }
}

let overrideScrollRestoration = function (kScrollRestoration, kManual): void {
  const h = history, old = h[kScrollRestoration]
  if (old && old !== kManual) {
      h[kScrollRestoration] = kManual;
      overrideScrollRestoration = 0 as never
    OnDocLoaded_(() => { timeout_((): void => { h[kScrollRestoration] = old }, 1); }, 1)
  }
} as ((key: "scrollRestoration", kManual: "manual") => void) | 0

  /** @argument willContinue 1: continue; 0: skip middle steps; 2: abort further actions; 5: resume */
export const scrollTick: VApiTy["k"] = (willContinue: 0 | 1 | 2 | 5): void => {
    if (ScrollConsts.DEBUG & 4 && (keyIsDown || willContinue === 1)) {
      console.log("update keyIsDown from", norm(keyIsDown), "to", willContinue & 1 ? maxKeyInterval : 0, "@"
          , norm(performance.now() % 3e5))
    }
    keyIsDown = willContinue & 1 ? maxKeyInterval : 0
    willContinue > 1 && toggleAnimation && toggleAnimation((willContinue & 4) as 0 | 4)
    if (joined) {
      joined.k(willContinue)
      willContinue & 1 || (joined = null)
    }
}

export const beginScroll = (eventWrapper: 0 | Pick<HandlerNS.Event, "e">, key: string, keybody: kChar): void => {
    if (key.includes("s-") || key.includes("a-")) { return; }
    const index = keyNames_.indexOf(keybody); // [0..8]
    (index > 2 || key === keybody) && eventWrapper && prevent_(eventWrapper.e);
    if (index > 4) {
      executeScroll((~index & 1) as BOOL, index < 7 ? -1 : 1, kScFlag.scBy)
    } else if (index > 2) {
      executeScroll(1, 0, (6 - index) as 2 | 3 as kScFlag.toMin | kScFlag.toMax, 0)
    } else if (key === keybody) {
      executeScroll(1, index - 1.5, kScFlag.scBy, 2)
    }
}

export const onScrolls = (event: HandlerNS.Event): boolean => {
    const repeat = isRepeated_(event)
    repeat && prevent_(event.e)
    scrollTick(repeat ? 5 : 0)
    return repeat;
}

  /**
   * @param amount should not be 0
   */
const findScrollable = (di: ScrollByY, amount: number, outer: number
    , evenOverflowHidden?: boolean | 0 | 2 | null | undefined, scrollable?: string): SafeElement | null => {
  const selectFirst = (info: ElementScrollInfo, skipPrepare?: 1): ElementScrollInfo | null | undefined => {
    let cur_el: SafeElement | HTMLFormElement = info.e, type: 0 | 1 | -1
    if (dimSize_(cur_el, kDim.elClientH) + 3 < dimSize_(cur_el, kDim.scrollH) &&
        (type = shouldScroll_s(cur_el, cur_el !== top && cur_el !== body ? selectFirstType : di, 1),
          type > 0 || !type && dimSize_(cur_el, kDim.positionY) > 0 && doesScroll(cur_el, kDim.byY, 0))) {
      return info
    }
    skipPrepare || prepareCrop_()
    let children: ElementScrollInfo[] = []
    for (let _ref = cur_el.children, _len = _ref.length > 50 ? 0 : _ref.length; 0 < _len--; ) {
      cur_el = _ref[_len]! as SafeElement | HTMLFormElement
      // here assumes that a <form> won't be a main scrollable area
      if (!isSafeEl_(cur_el)) { continue }
      const visible = getVisibleBoundingRect_(cur_el) || getVisibleClientRect_(cur_el)
      if (visible) {
        const height = visible.b - visible.t, width = visible.r - visible.l
        height > 199 && width > 199 && children.push({ a: width * height, e: cur_el, h: height})
      }
    }
    children.sort((a, b) => b.a - a.a)
    return children.reduce((cur, info1) => cur || selectFirst(info1, 1), null as ElementScrollInfo | null | undefined)
  }

    const selectFirstType = (evenOverflowHidden != null ? evenOverflowHidden : isTop || injector)
        ? (di + 2) as 2 | 3 : di
    const activeEl: SafeElement | null | undefined = derefInDoc_(currentScrolling) || null
    const lastCachedScrolled = derefInDoc_(cachedScrollable)
    const fullscreen = fullscreenEl_unsafe_(), top: Element | null = fullscreen || scrollingTop, body = doc.body
    const selectAncestor = (): void => {
      while (element !== top && (!fullscreen || IsAInB_(element as SafeElement, fullscreen))
          ? shouldScroll_s(<SafeElement> element, element === lastCachedScrolled ? (di + 2) as 2 | 3 : di, amount) < 1
            || --outer > 0
          : (element = top, 0)) {
        element = (!OnFirefox
            ? SafeEl_not_ff_!(GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent))
            : GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent) as SafeElement | null
          ) || top;
      }
      element = element !== top ? element : null
      outer = 0
    }
    let candidate: false | ElementScrollInfo | null | undefined
    let element: Element | null = activeEl
    activeEl && selectAncestor()
    if (!element) {
      // note: twitter auto focuses its dialog panel, so it's not needed to detect it here
      const selector = findSelectorByHost(scrollable) || findSelectorByHost(kTip.scrollable)
      if (selector) {
          element = OnFirefox ? querySelector_unsafe_(selector) as SafeElement | null
                  : SafeEl_not_ff_!(querySelector_unsafe_(selector))
          element = element && (!fullscreen || IsAInB_(element as SafeElement, fullscreen)) ? element : null
      }
    }
    if (!element && top && isSafeEl_(top)) {
      isTopScrollable = shouldScroll_s(top, di, 0)
      if (isTopScrollable < 1) {
        element = elFromPoint_([wndSize_(1) / 2, wndSize_() / 2], top)
        if (element && getEditableType_(element) && dimSize_(element, kDim.elClientH) < wndSize_() / 2) {
          element = GetParent_unsafe_(element, PNType.RevealSlotAndGotoParent)
        }
        OnFirefox || (element = SafeEl_not_ff_!(element))
        element && selectAncestor()
        candidate = !element && selectFirst({ a: 0, e: top, h: 0 })
      }
      element = candidate && candidate.e !== top && (!activeEl || candidate.h > wndSize_() / 2) ? candidate.e
          : element || top
      // if current_, then delay update to currentScrolling, until scrolling ends and .checkCurrent is called;
      // otherwise, cache selected element for less further cost
      activeEl || fullscreen || setNewScrolling(element)
    }
    return element && !isSafeEl_(element) ? null : element
}

export const getPixelScaleToScroll = (skipGetZoom?: 1): void => {
    /** https://drafts.csswg.org/cssom-view/#dom-element-scrolltop
     * Imported on 2013-05-15 by https://github.com/w3c/csswg-drafts/commit/ad01664359641f791d99f0b3fce545b55579acdc
     * Firefox is still using `int`: https://bugzilla.mozilla.org/show_bug.cgi?id=1217330 (filed on 2015-10-22)
     */
  skipGetZoom || getZoom_(1)
  scale = (OnFirefox ? 2 : 1) / min_(1, wdZoom_) / min_(1, bZoom_)
}

const checkCurrent = (el: SafeElement | null): void => {
  const cur = derefInDoc_(currentScrolling)
  if (el && (!cur || cur !== el && !(IsAInB_(cur, el) && !isNotInViewport(cur)))) {
    const last = derefInDoc_(cachedScrollable)
    const par: SafeElement = last && el !== last && last !== cur && IsAInB_(last, el) && !isNotInViewport(last) ? last
        : el
    setNewScrolling(par)
    set_cachedScrollable(currentScrolling)
  }
}

const hasSpecialScrollSnap = (el: SafeElement | null): boolean | string | null | undefined => {
    const scrollSnap: string | null | undefined = el && getComputedStyle_(el).scrollSnapType;
    return scrollSnap !== NONE && scrollSnap;
}

const doesScroll = (el: SafeElement, di: ScrollByY, amount: number): boolean => {
    /** @todo: (help wanted) it seems not detectable when hasSpecialScrollSnap_ on Firefox */
    // Currently, Firefox corrects positions before .scrollBy returns,
    // so it always fails if amount < next-box-size
    const visualBefore = dimSize_(el, kDim.positionX + di),
    before = OnEdge || el !== scrollingTop ? visualBefore : dimSize_(el, kDim.scPosX + di),
    changed = performScroll(el, di, amount > 0 ? scale : -scale, visualBefore)
    if (changed) {
      if (OnFirefox && el === scrollingTop) {
        el.scrollBy(instantScOpt(di ? 0 : -changed, di && -changed))
      } else if (!OnFirefox && !di && hasSpecialScrollSnap(el)) {
        /**
         * Here needs the third scrolling, because in `X Prox. LTR` mode, a second scrolling may jump very far.
         * Tested on https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type .
         */
        let changed2 = performScroll(el, kDim.byX, -changed, visualBefore)
        changed2 * changed2 > 0.1 && performScroll(el, kDim.byX, -changed2, 0)
      } else if ((OnChrome ? Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior : !OnEdge) || el.scrollTo) {
        el.scrollTo(instantScOpt(di ? void 0 as never : before, di ? before : void 0 as never))
      } else {
        di ? (el.scrollTop = before) : (el.scrollLeft = before);
      }
      scrolled = scrolled || 1
    }
    return !!changed;
}

export const scrollIntoView_s = (el: SafeElement | null, r2: Rect | null, dir: 0 | 1 | 2): void => {
    let rect1 = el && boundingRect_(el)
    rect1 = rect1 && (rect1.t - rect1.b || rect1.l - rect1.r) ? rect1 : r2
    if (!rect1) { return }
    let { l, t, r, b } = rect1
    if (r2) {
      l = min_(max_(l, r2.l), r), t = min_(max_(t, r2.t), b), r = max_(l, min_(r2.r, r)), b = max_(t, min_(r2.b, b))
    }
    dir < 1 ? (r = l, b = t) : dir < 2 && (l = r, t = b)
    let iw = wndSize_(1), ih = wndSize_(),
    ihm = min_(96, ih / 2), iwm = min_(64, iw / 2),
    hasY = b < ihm ? max_(b - ih + ihm, t - ihm) : ih < t + ihm ? min_(b - ih + ihm, t - ihm) : 0,
    hasX = r < 0 ? max_(l - iwm, r - iw + iwm) : iw < l ? min_(r - iw + iwm, l - iwm) : 0
    setNewScrolling(el!)
    for (; el && (hasX || hasY); el = GetParent_unsafe_(el, PNType.RevealSlotAndGotoParent) as SafeElement | null) {
        const pos = getComputedStyle_(el).position;
        if (pos === "fixed" || pos === "sticky") {
          hasX = hasY = 0;
        }
    }
    makeElementScrollBy_(0, hasX, hasY)
}

export const makeElementScrollBy_ = (el: SafeElement | null | 0, hasX: number, hasY: number): void => {
  void (hasX && (hasY ? performScroll : vApi.$)(el !== 0 ? el : findScrollable(kDim.byX, hasX, 0), kDim.byX, hasX))
  void (hasY && vApi.$(el !== 0 ? el : findScrollable(kDim.byY, hasY, 0), kDim.byY, hasY))
  isTopScrollable = 1
  scrolled = 0
  scrollTick(0) // it's safe to only clean keyIsDown here
}

export const shouldScroll_s = (element: SafeElement, di: BOOL | 2 | 3, amount: number): -1 | 0 | 1 => {
    const st = getComputedStyle_(element), overflow = di ? st.overflowY : st.overflowX
    return (overflow === HDN && di < 2 || overflow === "clip")
      || st.display === NONE || !isRawStyleVisible(st) ? -1
      : <BOOL> +doesScroll(element, (di & 1) as BOOL, amount || +!dimSize_(element, kDim.scPosX + (di & 1)))
}

export const suppressScroll = (timedOut?: number): void => {
    timedOut = timedOut || OnChrome && Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage && noRAF_old_cr_ ? 1 : 0
    scrolled = timedOut ? 0 : 2
    setupEventListener(0, "scroll", Stop_, timedOut as BOOL);
    (OnChrome && (Build.MinCVer >= BrowserVer.MinEnsuredScrollend || chromeVer_ > BrowserVer.MinEnsuredScrollend - 1)
      || (OnFirefox || OnChrome && (Build.MinCVer >= BrowserVer.MinScrollEndForInstantScrolling
            || chromeVer_ > BrowserVer.MinScrollEndForInstantScrolling - 1) && ("on" + kSE) in Image.prototype)) &&
    setupEventListener(0, kSE, Stop_, timedOut as BOOL)
    if (!timedOut) {
        Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.Min$queueMicrotask
        || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$queueMicrotask
        || Build.BTypes & BrowserType.Edge ? Promise.resolve(suppressScroll).then(rAF_)
        : queueTask_!(() => rAF_(suppressScroll))
    }
}

export const onActivate = (event: Event): void => {
  if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted ? event.isTrusted : event.isTrusted !== false) {
    const path = getEventPath(event),
    el = !OnEdge && (!OnChrome
              || Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
              || Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)
        || (OnEdge || Build.MinCVer >= BrowserVer.MinEnsured$Event$$Path || path) && path!.length > 1
        ? path![0] as Element : event.target as Element;
    setNewScrolling(el)
  }
}
