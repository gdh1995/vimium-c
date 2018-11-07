declare namespace ScrollerNS {
  const enum Consts {
    calibrationBoundary = 150, maxCalibration = 1.6, minCalibration = 0.5,
    invalidTime = 0, minDuration = 100, durationScaleForAmount = 20,
    maxS = 1.05, minS = 0.95, delayToChangeSpeed = 75, tickForUnexpectedTime = 17,

    DelayUnitMs = 30, FrameIntervalMs = 16.67, MaxSkippedF = 4,
    //            delay         interval  # delay - interval (not so useful)
    // high:  60f / 1000ms :  400ms / 24f # 600 / 28
    // low:   15f /  250ms :   33ms /  2f # 200 / 6
    HighDelayMs = 1000, LowDelayMs = 250, DefaultMinDelayMs = 600,
    HighIntervalF = 24, LowIntervalF = 2, DefaultMaxIntervalF = HighIntervalF + MaxSkippedF,
  }
}
var VScroller = {
animate_ (e: Element | null, d: ScrollByY, a: number): void | number {
  let amount = 0, calibration = 1.0, di: ScrollByY = 0, duration = 0, element: Element | null = null, //
  sign = 0, timestamp = ScrollerNS.Consts.invalidTime as number, totalDelta = 0.0, totalElapsed = 0.0, //
  last = 0 as BOOL;
  function animate(newTimestamp: number): void {
    let int1 = timestamp, elapsed: number, continuous: boolean;
    timestamp = newTimestamp;
    if (int1 !== ScrollerNS.Consts.invalidTime) {
      elapsed = newTimestamp - int1;
      elapsed = elapsed > 0 ? elapsed : ScrollerNS.Consts.tickForUnexpectedTime;
      int1 = (totalElapsed += elapsed);
      const _this = VScroller;
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
      if (int1 > 0 && _this.performScroll_(element, di, sign * int1)) {
        totalDelta += int1;
      } else {
        _this.checkCurrent_(element);
        element = null;
        last = 0;
        return;
      }
    }
    requestAnimationFrame(animate);
  };
  this.animate_ = (function(this: typeof VScroller, newEl, newDi, newAmount): void | number {
    amount = Math.abs(newAmount); calibration = 1.0; di = newDi;
    duration = Math.max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * Math.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    timestamp = ScrollerNS.Consts.invalidTime; totalDelta = totalElapsed = 0.0;
    const keyboard = VSettings.cache.keyboard;
    this.maxInterval_ = Math.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF;
    this.minDelay_ = (((keyboard[0] - keyboard[1]) / ScrollerNS.Consts.DelayUnitMs) | 0) * ScrollerNS.Consts.DelayUnitMs;
    this.keyIsDown_ = this.maxInterval_;
    if (last) { return; }
    last = 1;
    return requestAnimationFrame(animate);
  });
  return this.animate_(e, d, a);
},
  maxInterval_: ScrollerNS.Consts.DefaultMaxIntervalF as number,
  minDelay_: ScrollerNS.Consts.DefaultMinDelayMs as number,
  performScroll_ (el: Element | null, di: ScrollByY, amount: number): boolean {
    let before: number;
    if (di) {
      if (el) {
        before = el.scrollTop;
        el.scrollBy ? el.scrollBy({behavior: "instant", top: amount}) : (el.scrollTop += amount);
        return el.scrollTop !== before;
      } else {
        before = window.scrollY;
        // avoid using `Element`, so that users may override it
        VDom.scrollWndBy_(0, amount);
        return window.scrollY !== before;
      }
    } else if (el) {
      before = el.scrollLeft;
      el.scrollBy ? el.scrollBy({behavior: "instant", left: amount}) : (el.scrollLeft += amount);
      return el.scrollLeft !== before;
    } else {
      before = window.scrollX;
      VDom.scrollWndBy_(amount, 0);
      return window.scrollX !== before;
    }
  },
  scroll_ (element: Element | null, di: ScrollByY, amount: number): void | number | boolean {
    if (!amount) { return; }
    if (VSettings.cache.smoothScroll && VDom.allowRAF_) {
      return this.animate_(element, di, amount);
    }
    this.performScroll_(element, di, amount);
    return this.checkCurrent_(element);
  },

  current_: null as Element | null,
  top_: null as Element | null,
  keyIsDown_: 0,
  scale_: 1,
  Properties_: ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"] as
    ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"],
  ScBy (this: void, count: number, options: CmdOptions["scBy"] & SafeObject): void {
    if (VHints.tryNestedFrame_("VScroller", "ScBy", count, options)) { return; }
    return VScroller.scrollBy_(options.axis === "x" ? 0 : 1, (+<number>options.dir || 1) * count, options.view);
  },
  /** amount: can not be 0 */
  scrollBy_ (di: ScrollByY, amount: number, factor: CmdOptions["scBy"]["view"]): void {
    VMarks.setPreviousPosition_();
    this.prepareTop_();
    const element = this.findScrollable_(di, amount);
    amount = !factor ? this.adjustAmount_(di, amount, element)
      : factor === 1 ? (amount > 0 ? Math.ceil : Math.floor)(amount)
      : amount * this.getDimension_(element, di, factor === "max" ? 2 : 0);
    this.scroll_(element, di, amount);
    this.top_ = null;
  },
  ScTo (this: void, count: number, options: CmdOptions["scTo"] & SafeObject): void {
    if (VHints.tryNestedFrame_("VScroller", "ScTo", count, options)) { return; }
    let fromMax: BOOL = options.dest === "max" ? 1 : 0;
    if (count < 0) { fromMax = (1 - fromMax as BOOL); count = -count; }
    return VScroller.scrollTo_(options.axis === "x" ? 0 : 1, count - 1, fromMax);
  },
  /** `amount`: default to be `0` */
  scrollTo_ (di: ScrollByY, amount: number, fromMax: BOOL): void {
    this.prepareTop_();
    const element = this.findScrollable_(di, fromMax ? 1 : -1);
    amount = this.adjustAmount_(di, amount, element);
    fromMax && (amount = this.getDimension_(element, di, 2) - amount - this.getDimension_(element, di, 0));
    amount -= element ? element[this.Properties_[4 + di]] : di ? window.scrollY : window.scrollX;
    this.scroll_(element, di, amount);
    this.top_ = null;
  },
  adjustAmount_ (di: ScrollByY, amount: number, element: Element | null): number {
    amount *= VSettings.cache.scrollStepSize;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * 2
      ? Math.ceil(amount * 0.6) : amount;
  },
  findScrollable_ (di: ScrollByY, amount: number): Element | null {
    let element: Element | null = this.current_, top = this.top_;
    if (!element) {
      element = top;
      return this.current_ = element && (this.selectFirst_(element) || element);
    }
    const getInsertion = Element.prototype.getDestinationInsertionPoints;
    while (element !== top && !this.shouldScroll_(element as Element, di, amount)) {
      element = VDom.GetParent_(element as Element, getInsertion) || top;
    }
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
    this.scale_ = 1 / Math.min(1, VDom.wdZoom_) / Math.min(1, VDom.bZoom_);
  },
  checkCurrent_ (el: Element | null): void {
    const cur = this.current_;
    if (cur !== el && cur && VDom.NotVisible_(cur)) { this.current_ = el; }
  },
  getDimension_ (el: Element | null, di: ScrollByY, index: 0 | 2): number {
    return el !== this.top_ || (index && el) ? ((el || this.top_) as Element)[this.Properties_[index + di]]
      : di ? innerHeight : innerWidth;
  },
  scrollDo_ (el: Element, di: ScrollByY, amount: number): boolean {
    const key = this.Properties_[4 + di as 4 | 5], before = el[key], k2: "top" | "left" = di ? "top": "left"
      , arg: ScrollToOptions = { behavior: "instant" };
    arg[k2] = (amount > 0 ? 1 : -1) * this.scale_;
    el.scrollBy ? el.scrollBy(arg) : (el[key] += arg[k2] as number);
    let changed = el[key] !== before;
    if (changed) {
      el.scrollTo ? (arg[k2] = before, el.scrollTo(arg)) : (el[key] = before);
      this.scrolled_ === 0 && (this.scrolled_ = 1);
    }
    return changed;
  },
  selectFirst_ (element: Element, skipPrepare?: 1): Element | null {
    if (element.clientHeight + 3 < element.scrollHeight &&
        (this.scrollDo_(element, 1, 1) || element.scrollTop > 0 && this.scrollDo_(element, 1, 0))) {
      this.scrolled_ = 0;
      return element;
    }
    skipPrepare || VDom.prepareCrop_();
    // todo: check form and frameset
    let children = [] as {area: number, el: Element}[], _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len];
      if (VDom.notSafe_(element)) { continue; }
      const rect = element.getBoundingClientRect(),
      visible = rect.height > 0 ? VDom.cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)
        : VDom.getVisibleClientRect_(element);
      if (visible) {
        children.push({ area: (visible[2] - visible[0]) * (visible[3] - visible[1]), el: element});
      }
    }
    children.sort(this.sortByArea_);
    for (_len = children.length; 0 < _len--; ) {
      if (element = this.selectFirst_(children[_len].el, 1) as Element | null as Element) { return element; }
    }
    return null;
  },
  _scrollIntoView (el: Element): void {
    const rect = el.getClientRects()[0] as ClientRect | undefined;
    if (!rect) { return; }
    this.current_ = el;
    const { innerWidth: iw, innerHeight: ih} = window,
    { min, max } = Math, ihm = min(96, ih / 2), iwm = min(64, iw / 2),
    { bottom: b, top: t, right: r, left: l } = rect,
    hasY = b < ihm ? max(b - ih + ihm, t - ihm) : ih < t + ihm ? min(b - ih + ihm, t - ihm) : 0,
    hasX = r < 0 ? max(l - iwm, r - iw + iwm) : iw < l ? min(r - iw + iwm, l - iwm) : 0;
    if (hasX) {
      (hasY ? this.performScroll_ : this.scroll_).call(this, this.findScrollable_(0, hasX), 0, hasX);
    }
    if (hasY) {
      this.scroll_(this.findScrollable_(1, hasY), 1, hasY);
    }
    this.keyIsDown_ = 0; // it's safe to only clean keyIsDown here
  },
  scrolled_: 0,
  shouldScroll_ (element: Element, di: ScrollByY, amount?: number): boolean {
    const st = getComputedStyle(element);
    return (di ? st.overflowY : st.overflowX) !== "hidden" && st.display !== "none" && st.visibility === "visible" &&
      this.scrollDo_(element, di, amount != null ? amount : +!(di ? element.scrollTop : element.scrollLeft));
  },
  supressScroll_ (): void {
    if (!VDom.allowRAF_) { this.scrolled_ = 0; return; }
    this.scrolled_ = 2;
    VUtils.suppressAll_(window, "scroll");
    requestAnimationFrame(function(): void {
      VScroller.scrolled_ = 0;
      VUtils.suppressAll_(window, "scroll", true);
    });
  },
  sortByArea_ (this: void, a: {area: number, el: Element}, b: {area: number, el: Element}): number {
    return a.area - b.area;
  }
};
