/**
 * Note(gdh1995):
 * - All private members are @NEED_SAFE_ELEMENTS
 * - Untagged public members are @safe_even_if_any_overridden_property
 */
declare namespace ScrollerNS {
  const enum Consts {
    calibrationBoundary = 150, maxCalibration = 1.6, minCalibration = 0.5,
    invalidTime = 0, minDuration = 100, durationScaleForAmount = 20,
    maxS = 1.05, minS = 0.95, delayToChangeSpeed = 75, tickForUnexpectedTime = 17,

    DelayMinDelta = 60, DelayTolerance = 60,
    DelayUnitMs = 30, FrameIntervalMs = 16.67, MaxSkippedF = 4,
    // https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-2000-server/cc978658(v=technet.10)
    //            delay         interval  # delay - interval (not so useful)
    // high:  60f / 1000ms :  400ms / 24f # 660 / 28
    // low:   15f /  250ms :   33ms /  2f # 200 / 6
    HighDelayMs = 1000, LowDelayMs = 250, DefaultMinDelayMs = 660,
    HighIntervalF = 24, LowIntervalF = 2, DefaultMaxIntervalF = HighIntervalF + MaxSkippedF,
  }
}
declare const enum kScrollDim {
  _mask = "",
  viewSize = 0,
  scrollSize = 1,
  position = 2,
}
var VScroller = {
_animate (e: SafeElement | null, d: ScrollByY, a: number): void | number {
  let amount = 0, calibration = 1.0, di: ScrollByY = 0, duration = 0, element: SafeElement | null = null, //
  sign = 0, timestamp = ScrollerNS.Consts.invalidTime as number, totalDelta = 0.0, totalElapsed = 0.0, //
  last = 0 as BOOL;
  function animate(newTimestamp: number): void {
    let int1 = timestamp, elapsed: number, continuous: boolean;
    timestamp = newTimestamp;
    if (int1 !== ScrollerNS.Consts.invalidTime) {
      elapsed = newTimestamp - int1;
      // although timestamp is mono
      elapsed = elapsed > 0 ? elapsed : ScrollerNS.Consts.tickForUnexpectedTime;
      int1 = (totalElapsed += elapsed);
      const _this = VScroller;
      if (!_this) { return; }
      if (continuous = _this.keyIsDown_ > 0) {
        if (int1 >= ScrollerNS.Consts.delayToChangeSpeed) {
          if (int1 > _this.minDelay_) { --_this.keyIsDown_; }
          int1 = calibration;
          if (ScrollerNS.Consts.minCalibration <= int1 && int1 <= ScrollerNS.Consts.maxCalibration) {
            int1 = ScrollerNS.Consts.calibrationBoundary / amount / int1;
            calibration *= (int1 > ScrollerNS.Consts.maxS) ? ScrollerNS.Consts.maxS
              : (int1 < ScrollerNS.Consts.minS) ? ScrollerNS.Consts.minS : 1.0;
          }
        }
      }
      int1 = Math.ceil(amount * (elapsed / duration) * calibration);
      continuous || (int1 = Math.min(int1, amount - totalDelta));
      if (int1 > 0 && _this._performScroll(element, di, sign * int1)) {
        totalDelta += int1;
      } else {
        _this._checkCurrent(element);
        element = null;
        last = 0;
        return;
      }
    }
    requestAnimationFrame(animate);
  }
  this._animate = (function (this: typeof VScroller, newEl, newDi, newAmount): void | number {
    const M = Math;
    amount = M.abs(newAmount); calibration = 1.0; di = newDi;
    duration = M.max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * M.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    timestamp = ScrollerNS.Consts.invalidTime; totalDelta = totalElapsed = 0.0;
    const keyboard = VUtils.cache_.keyboard;
    this.maxInterval_ = M.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF;
    this.minDelay_ = (((keyboard[0] + M.max(keyboard[1], ScrollerNS.Consts.DelayMinDelta)
          + ScrollerNS.Consts.DelayTolerance) / ScrollerNS.Consts.DelayUnitMs) | 0)
      * ScrollerNS.Consts.DelayUnitMs;
    this.keyIsDown_ = this.maxInterval_;
    if (last) { return; }
    last = 1;
    return requestAnimationFrame(animate);
  });
  return this._animate(e, d, a);
},
  maxInterval_: ScrollerNS.Consts.DefaultMaxIntervalF as number,
  minDelay_: ScrollerNS.Consts.DefaultMinDelayMs as number,
  _performScroll (el: SafeElement | null, di: ScrollByY, amount: number, before?: number): boolean {
    if (di) {
      if (el) {
        before = before == null ? el.scrollTop : before;
        !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
        !(Build.BTypes & ~BrowserType.Firefox) ||
        el.scrollBy ? el.scrollBy({behavior: "instant", top: amount}) : (el.scrollTop += amount);
        return el.scrollTop !== before;
      } else {
        before = scrollY;
        // avoid using `Element`, so that users may override it
        VDom.scrollWndBy_(0, amount);
        return scrollY !== before;
      }
    } else if (el) {
      before = before == null ? el.scrollTop : before;
      !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
      !(Build.BTypes & ~BrowserType.Firefox) ||
      el.scrollBy ? el.scrollBy({behavior: "instant", left: amount}) : (el.scrollLeft += amount);
      return el.scrollLeft !== before;
    } else {
      before = scrollX;
      VDom.scrollWndBy_(amount, 0);
      return scrollX !== before;
    }
  },
  scroll_ (element: SafeElement | null, di: ScrollByY, amount: number): void | number | boolean {
    if (!amount) { return; }
    if (VUtils.cache_.smoothScroll && (Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage || VDom.allowRAF_)) {
      return this._animate(element, di, amount);
    }
    this._performScroll(element, di, amount);
    return this._checkCurrent(element);
  },

  /** @NEED_SAFE_ELEMENTS */
  current_: null as SafeElement | null,
  /** @NEED_SAFE_ELEMENTS */
  top_: null as SafeElement | null,
  keyIsDown_: 0,
  scale_: 1,
  Sc (this: void, count: number, options: CmdOptions[kFgCmd.scroll] & SafeObject): void {
    if (VEvent.checkHidden_(kFgCmd.scroll, count, options)) { return; }
    if (VHints.TryNestedFrame_("VScroller", "Sc", count, options)) { return; }
    const a = VScroller, di: ScrollByY = options.axis === "x" ? 0 : 1;
    if (options.dest) {
      let fromMax: BOOL = options.dest === "max" ? 1 : 0;
      if (count < 0) { fromMax = (1 - fromMax as BOOL); count = -count; }
      return a.scrollTo_(di, count - 1, fromMax);
    }
    return a.scrollBy_(di, (+<number> options.dir || 1) * count, options.view);
  },
  /** amount: can not be 0 */
  scrollBy_ (di: ScrollByY, amount: number, factor: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined): void {
    const a = this;
    VMarks.setPreviousPosition_();
    a.prepareTop_();
    const element = a.findScrollable_(di, amount);
    amount = !factor ? a._adjustAmount(di, amount, element)
      : factor === 1 ? (amount > 0 ? Math.ceil : Math.floor)(amount)
      : amount * a.getDimension_(element, di, factor === "max" ? kScrollDim.scrollSize : kScrollDim.viewSize);
    a.scroll_(element, di, amount);
    a.top_ = null;
  },
  /** `amount`: default to be `0` */
  scrollTo_ (di: ScrollByY, amount: number, fromMax: BOOL): void {
    const a = this;
    a.prepareTop_();
    const element = a.findScrollable_(di, fromMax ? 1 : -1);
    amount = a._adjustAmount(di, amount, element);
    if (fromMax) {
      amount = a.getDimension_(element, di, kScrollDim.scrollSize) - amount
        - a.getDimension_(element, di, kScrollDim.viewSize);
    }
    amount -= element ? a.getDimension_(element, di, kScrollDim.position) : di ? scrollY : scrollX;
    a.scroll_(element, di, amount);
    a.top_ = null;
  },
  _adjustAmount (di: ScrollByY, amount: number, element: SafeElement | null): number {
    amount *= VUtils.cache_.scrollStepSize;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * (element.scrollWidth < 720 ? 2 : 1)
      ? Math.ceil(amount * 0.6) : amount;
  },
  /**
   * @param amount should not be 0
   */
  findScrollable_ (di: ScrollByY, amount: number): SafeElement | null {
    const a = this;
    let element: SafeElement | null = a.current_, top = a.top_;
    if (element) {
      let reason, notNeedToRecheck = !di;
      type Element2 = NonNullable<typeof element>;
      while (element !== top && (reason = a.shouldScroll_unsafe_(element as Element2, di, amount)) < 1) {
        if (!reason) {
          notNeedToRecheck = notNeedToRecheck || a._scrollDo(element as Element2, 1, -amount);
        }
        element = (Build.BTypes & ~BrowserType.Firefox
            ? VDom.SafeEl_(VDom.GetParent_(element as Element, PNType.RevealSlotAndGotoParent))
            : VDom.GetParent_(element as Element, PNType.RevealSlotAndGotoParent) as SafeElement | null
          ) || top;
      }
      element = element !== top || notNeedToRecheck ? element : null;
    }
    if (!element && top) {
      element = a.current_ = a._selectFirst(top) || top;
    }
    a.scrolled_ = 0;
    return element;
  },
  prepareTop_ (): void {
    this.top_ = VDom.scrollingEl_(1);
    if (this.top_) {
      VDom.getZoom_(1);
      this.getScale_();
    }
  },
  getScale_ (): void {
    /** https://drafts.csswg.org/cssom-view/#dom-element-scrolltop
     * Imported on 2013-05-15 by https://github.com/w3c/csswg-drafts/commit/ad01664359641f791d99f0b3fce545b55579acdc
     * Firefox is still using `int`: https://bugzilla.mozilla.org/show_bug.cgi?id=1217330 (filed on 2015-10-22)
     */
    this.scale_ = (Build.BTypes & BrowserType.Firefox ? 2 : 1) / Math.min(1, VDom.wdZoom_) / Math.min(1, VDom.bZoom_);
  },
  _checkCurrent (el: SafeElement | null): void {
    const cur = this.current_;
    if (cur !== el && cur && VDom.NotVisible_(cur)) { this.current_ = el; }
  },
  getDimension_ (el: SafeElement | null, di: ScrollByY, index: kScrollDim & number): number {
    return el !== this.top_ || index && el
      ? index === kScrollDim.viewSize ? di ? (el as SafeElement).clientHeight : (el as SafeElement).clientWidth
        : index === kScrollDim.scrollSize ? di ? (el as SafeElement).scrollHeight : (el as SafeElement).scrollWidth
        : di ? (el as SafeElement).scrollTop : (el as SafeElement).scrollLeft
      : di ? innerHeight : innerWidth;
  },
  _scrollDo (el: SafeElement, di: ScrollByY, amount: number): boolean {
    const before = this.getDimension_(el, di, kScrollDim.position),
    changed = this._performScroll(el, di, (amount > 0 ? 1 : -1) * this.scale_, before);
    if (changed) {
      if (!(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior
          || !(Build.BTypes & ~BrowserType.Firefox) || el.scrollTo) {
        let arg: ScrollToOptions = {behavior: "instant"};
        arg[di ? "top" : "left"] = before;
        el.scrollTo(arg);
      } else {
        di ? (el.scrollTop = before) : (el.scrollLeft = before);
      }
      this.scrolled_ = this.scrolled_ || 1;
    }
    return changed;
  },
  _selectFirst (element: SafeElement, skipPrepare?: 1): SafeElement | null {
    if (element.clientHeight + 3 < element.scrollHeight &&
        (this._scrollDo(element, 1, 1) || element.scrollTop > 0 && this._scrollDo(element, 1, 0))) {
      return element as SafeElement;
    }
    skipPrepare || VDom.prepareCrop_();
    let children = [] as Array<{area: number, el: Element}>, _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len] as Element as /** fake `as` */ SafeElement;
      // here assumes that a <form> won't be a main scrollable area
      if (Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(element)) { continue; }
      const rect = VDom.getBoundingClientRect_(element),
      visible = rect.height > 0 ? VDom.cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)
        : VDom.getVisibleClientRect_(element);
      if (visible) {
        children.push({ area: (visible[2] - visible[0]) * (visible[3] - visible[1]), el: element});
      }
    }
    children.sort(this.sortByArea_);
    for (_len = children.length; 0 < _len--; ) {
      if (element = this._selectFirst(children[_len].el as Element as SafeElement, 1) as SafeElement) {
        return element;
      }
    }
    return null;
  },
  /** @NEED_SAFE_ELEMENTS */
  scrollIntoView_unsafe_: function (this: {}, el: SafeElement | Element | null): void {
    const rect = (el as SafeElement).getClientRects()[0] as ClientRect | undefined;
    if (!rect) { return; }
    let a = this as typeof VScroller, { innerWidth: iw, innerHeight: ih} = window,
    { min, max } = Math, ihm = min(96, ih / 2), iwm = min(64, iw / 2),
    { bottom: b, top: t, right: r, left: l } = rect,
    hasY = b < ihm ? max(b - ih + ihm, t - ihm) : ih < t + ihm ? min(b - ih + ihm, t - ihm) : 0,
    hasX = r < 0 ? max(l - iwm, r - iw + iwm) : iw < l ? min(r - iw + iwm, l - iwm) : 0;
    a.current_ = el as SafeElement;
    if (hasX || hasY) {
      for (; el; el = VDom.GetParent_(el, PNType.RevealSlotAndGotoParent)) {
        const pos = getComputedStyle(el).position;
        if (pos === "fixed" || pos === "sticky") {
          hasX = hasY = 0;
          break;
        }
      }
      if (hasX) {
        (hasY ? a._performScroll : a.scroll_).call(a, a.findScrollable_(0, hasX), 0, hasX);
      }
      if (hasY) {
        a.scroll_(a.findScrollable_(1, hasY), 1, hasY);
      }
    }
    a.keyIsDown_ = 0; // it's safe to only clean keyIsDown here
  } as (el: SafeElement) => void,
  scrolled_: 0,
  /** @NEED_SAFE_ELEMENTS */
  shouldScroll_unsafe_ (element: SafeElement, di: ScrollByY, amount?: number): -1 | 0 | 1 {
    const st = getComputedStyle(element);
    return (di ? st.overflowY : st.overflowX) === "hidden" || st.display === "none" || st.visibility !== "visible" ? -1
      : <BOOL> +this._scrollDo(element, di, amount != null ? amount : +!(di ? element.scrollTop : element.scrollLeft));
  },
  supressScroll_ (): void {
    if (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage && !VDom.allowRAF_) { this.scrolled_ = 0; return; }
    this.scrolled_ = 2;
    VUtils.suppressAll_(window, "scroll");
    requestAnimationFrame(function (): void {
      VScroller.scrolled_ = 0;
      VUtils.suppressAll_(window, "scroll", true);
    });
  },
  sortByArea_ (this: void, a: {area: number, el: Element}, b: {area: number, el: Element}): number {
    return a.area - b.area;
  }
};
