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

    DelayUnitMs = 30, FrameIntervalMs = 16.67, MaxSkippedF = 4,
    //            delay         interval  # delay - interval (not so useful)
    // high:  60f / 1000ms :  400ms / 24f # 600 / 28
    // low:   15f /  250ms :   33ms /  2f # 200 / 6
    HighDelayMs = 1000, LowDelayMs = 250, DefaultMinDelayMs = 600,
    HighIntervalF = 24, LowIntervalF = 2, DefaultMaxIntervalF = HighIntervalF + MaxSkippedF,
  }
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
  };
  this._animate = (function(this: typeof VScroller, newEl, newDi, newAmount): void | number {
    amount = Math.abs(newAmount); calibration = 1.0; di = newDi;
    duration = Math.max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * Math.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    timestamp = ScrollerNS.Consts.invalidTime; totalDelta = totalElapsed = 0.0;
    const keyboard = VUtils.cache_.keyboard;
    this.maxInterval_ = Math.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF;
    this.minDelay_ = (((keyboard[0] - keyboard[1]) / ScrollerNS.Consts.DelayUnitMs) | 0) * ScrollerNS.Consts.DelayUnitMs;
    this.keyIsDown_ = this.maxInterval_;
    if (last) { return; }
    last = 1;
    return requestAnimationFrame(animate);
  });
  return this._animate(e, d, a);
},
  maxInterval_: ScrollerNS.Consts.DefaultMaxIntervalF as number,
  minDelay_: ScrollerNS.Consts.DefaultMinDelayMs as number,
  _performScroll (el: SafeElement | null, di: ScrollByY, amount: number): boolean {
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
  scroll_ (element: SafeElement | null, di: ScrollByY, amount: number): void | number | boolean {
    if (!amount) { return; }
    if (VUtils.cache_.smoothScroll && VDom.allowRAF_) {
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
  Properties_: ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"] as
    ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"],
  Sc (this: void, count: number, options: CmdOptions[kFgCmd.scroll] & SafeObject): void {
    if (VEvent.checkHidden_(kFgCmd.scroll, count, options)) { return; }
    if (VHints.tryNestedFrame_("VScroller", "Sc", count, options)) { return; }
    const a = VScroller, di: ScrollByY = options.axis === "x" ? 0 : 1;
    if (options.dest) {
      let fromMax: BOOL = options.dest === "max" ? 1 : 0;
      if (count < 0) { fromMax = (1 - fromMax as BOOL); count = -count; }
      return a.scrollTo_(di, count - 1, fromMax);
    }
    return a.scrollBy_(di, (+<number>options.dir || 1) * count, options.view);
  },
  /** amount: can not be 0 */
  scrollBy_ (di: ScrollByY, amount: number, factor: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined): void {
    VMarks.setPreviousPosition_();
    this.prepareTop_();
    const element = this.findScrollable_(di, amount);
    amount = !factor ? this._adjustAmount(di, amount, element)
      : factor === 1 ? (amount > 0 ? Math.ceil : Math.floor)(amount)
      : amount * this._getDimension(element, di, factor === "max" ? 2 : 0);
    this.scroll_(element, di, amount);
    this.top_ = null;
  },
  /** `amount`: default to be `0` */
  scrollTo_ (di: ScrollByY, amount: number, fromMax: BOOL): void {
    this.prepareTop_();
    const element = this.findScrollable_(di, fromMax ? 1 : -1);
    amount = this._adjustAmount(di, amount, element);
    fromMax && (amount = this._getDimension(element, di, 2) - amount - this._getDimension(element, di, 0));
    amount -= element ? element[this.Properties_[4 + di]] : di ? window.scrollY : window.scrollX;
    this.scroll_(element, di, amount);
    this.top_ = null;
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
    let element: SafeElement | null = this.current_, top = this.top_;
    if (!element) {
      return this.current_ = top && this._selectFirst(top) || top;
    }
    let reason, isCurVerticallyScrollable = di - 1 /** X => -1, Y => 0 */;
    while (element !== top && (reason = this.shouldScroll_unsafe_(element as NonNullable<typeof element>, di, amount)) < 1) {
      if (!reason) {
        isCurVerticallyScrollable = isCurVerticallyScrollable || +this._scrollDo(element as NonNullable<typeof element>, 1, -amount);
      }
      element = VDom.SafeEl_(VDom.GetParent_(element as Element, PNType.RevealSlotAndGotoParent)) || top;
    }
    if (element === top && top && !isCurVerticallyScrollable) {
      element = this.current_ = this._selectFirst(top) || top;
    }
    this.scrolled_ = 0;
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
  _checkCurrent (el: SafeElement | null): void {
    const cur = this.current_;
    if (cur !== el && cur && VDom.NotVisible_(cur)) { this.current_ = el; }
  },
  _getDimension (el: SafeElement | null, di: ScrollByY, index: 0 | 2): number {
    return el !== this.top_ || (index && el) ? ((el || this.top_) as Element)[this.Properties_[index + di]]
      : di ? innerHeight : innerWidth;
  },
  _scrollDo (el: SafeElement, di: ScrollByY, amount: number): boolean {
    const key = this.Properties_[4 + di as 4 | 5], before = el[key], k2: "top" | "left" = di ? "top": "left"
      , arg: ScrollToOptions = { behavior: "instant" };
    arg[k2] = (amount > 0 ? 1 : -1) * this.scale_;
    el.scrollBy ? el.scrollBy(arg) : (el[key] += arg[k2] as number);
    let changed = el[key] !== before;
    if (changed) {
      el.scrollTo ? (arg[k2] = before, el.scrollTo(arg)) : (el[key] = before);
      this.scrolled_ || (this.scrolled_ = 1);
    }
    return changed;
  },
  _selectFirst (element: SafeElement, skipPrepare?: 1): SafeElement | null {
    if (element.clientHeight + 3 < element.scrollHeight &&
        (this._scrollDo(element, 1, 1) || element.scrollTop > 0 && this._scrollDo(element, 1, 0))) {
      this.scrolled_ = 0;
      return element as SafeElement;
    }
    skipPrepare || VDom.prepareCrop_();
    let children = [] as {area: number, el: Element}[], _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len] as Element as /** fake `as` */ SafeElement;
      // here assumes that a <form> won't be a main scrollable area
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
      if (element = this._selectFirst(children[_len].el as Element as SafeElement, 1) as SafeElement) { return element; }
    }
    return null;
  },
  /** @NEED_SAFE_ELEMENTS */
  scrollIntoView_unsafe_ (el: SafeElement): void {
    const rect = el.getClientRects()[0] as ClientRect | undefined;
    if (!rect) { return; }
    this.current_ = el;
    // todo: disable margin for fixed/sticky
    const { innerWidth: iw, innerHeight: ih} = window,
    { min, max } = Math, ihm = min(96, ih / 2), iwm = min(64, iw / 2),
    { bottom: b, top: t, right: r, left: l } = rect,
    hasY = b < ihm ? max(b - ih + ihm, t - ihm) : ih < t + ihm ? min(b - ih + ihm, t - ihm) : 0,
    hasX = r < 0 ? max(l - iwm, r - iw + iwm) : iw < l ? min(r - iw + iwm, l - iwm) : 0;
    if (hasX) {
      (hasY ? this._performScroll : this.scroll_).call(this, this.findScrollable_(0, hasX), 0, hasX);
    }
    if (hasY) {
      this.scroll_(this.findScrollable_(1, hasY), 1, hasY);
    }
    this.keyIsDown_ = 0; // it's safe to only clean keyIsDown here
  },
  scrolled_: 0,
  /** @NEED_SAFE_ELEMENTS */
  shouldScroll_unsafe_ (element: SafeElement, di: ScrollByY, amount?: number): -1 | 0 | 1 {
    const st = getComputedStyle(element);
    return (di ? st.overflowY : st.overflowX) === "hidden" || st.display === "none" || st.visibility !== "visible" ? -1
      : <BOOL> +this._scrollDo(element, di, amount != null ? amount : +!(di ? element.scrollTop : element.scrollLeft));
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
