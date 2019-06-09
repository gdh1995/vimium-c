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
  area_: number;
  element_: SafeElement;
  height_: number; /* cropped visible */
}
var VScroller = {
_animate (e: SafeElement | null, d: ScrollByY, a: number): void {
  let amount = 0, calibration = 1.0, di: ScrollByY = 0, duration = 0, element: SafeElement | null = null, //
  sign = 0, timestamp = 0, totalDelta = 0.0, totalElapsed = 0.0, //
  running = 0 as number, next = requestAnimationFrame, timer = 0;
  function animate(newTimestamp: number): void {
    const _this = VScroller,
    // although timestamp is mono, Firefox adds too many limits to its precision
    elapsed = !timestamp ? (newTimestamp = performance.now(), ScrollerNS.Consts.firstTick)
              : newTimestamp > timestamp ? newTimestamp - timestamp
              : (newTimestamp += ScrollerNS.Consts.tickForUnexpectedTime, ScrollerNS.Consts.tickForUnexpectedTime),
    continuous = _this.keyIsDown_ > 0;
    if (!_this) { return; }
    timestamp = newTimestamp;
    totalElapsed += elapsed;
    if (amount < ScrollerNS.Consts.AmountLimitToScrollAndWaitRepeatedKeys
        && continuous && totalDelta >= amount && totalElapsed < _this.minDelay_ - 2) {
      running = 0;
      timer = setTimeout(startAnimate, _this.minDelay_ - totalElapsed);
      return;
    }
    if (continuous) {
      if (totalElapsed >= ScrollerNS.Consts.delayToChangeSpeed) {
        if (totalElapsed > _this.minDelay_) { --_this.keyIsDown_; }
        if (ScrollerNS.Consts.minCalibration <= calibration && calibration <= ScrollerNS.Consts.maxCalibration) {
          const calibrationScale = ScrollerNS.Consts.calibrationBoundary / amount / calibration;
          calibration *= calibrationScale > ScrollerNS.Consts.maxS ? ScrollerNS.Consts.maxS
            : calibrationScale < ScrollerNS.Consts.minS ? ScrollerNS.Consts.minS : 1;
        }
      }
    }
    let delta = Math.ceil(amount * (elapsed / duration) * calibration);
    continuous || (delta = Math.min(delta, amount - totalDelta));
    if (delta > 0 && _this._performScroll(element, di, sign * delta)) {
      totalDelta += delta;
      next(animate);
    } else {
      _this._checkCurrent(element);
      element = null;
      running = 0;
    }
  }
  function startAnimate(): void {
    timer = 0;
    running = running || next(animate);
  }
  this._animate = function (this: typeof VScroller, newEl, newDi, newAmount): void {
    const M = Math;
    amount = M.max(1, M.abs(newAmount)); calibration = 1.0; di = newDi;
    duration = M.max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * M.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    totalDelta = totalElapsed = 0.0;
    timestamp = 0;
    if (timer) {
      clearTimeout(timer);
    }
    const keyboard = VDom.cache_.keyboard;
    this.maxInterval_ = M.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF;
    this.minDelay_ = (((keyboard[0] + M.max(keyboard[1], ScrollerNS.Consts.DelayMinDelta)
          + ScrollerNS.Consts.DelayTolerance) / ScrollerNS.Consts.DelayUnitMs) | 0)
      * ScrollerNS.Consts.DelayUnitMs;
    this.scrollTick_(1);
    startAnimate();
  };
  this._animate(e, d, a);
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
      before = before == null ? el.scrollLeft : before;
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
  /** @param amount can not be 0 */
  _innerScroll (element: SafeElement | null, di: ScrollByY, amount: number): void {
    if (VDom.cache_.smoothScroll
        && (Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage || !(Build.BTypes & BrowserType.Chrome)
            || VDom.allowRAF_)) {
      this._animate(element, di, amount);
    } else {
      this._performScroll(element, di, amount);
      this._checkCurrent(element);
    }
  },

  /** @NEED_SAFE_ELEMENTS */
  current_: null as SafeElement | null,
  /** @NEED_SAFE_ELEMENTS */
  top_: null as SafeElement | null,
  keyIsDown_: 0,
  scale_: 1,
  activate_ (this: void, count: number, options: CmdOptions[kFgCmd.scroll] & SafeObject): void {
    if (VEvent.checkHidden_(kFgCmd.scroll, count, options)) { return; }
    if (VHints.TryNestedFrame_(kFgCmd.scroll, count, options)) { return; }
    const a = VScroller, di: ScrollByY = options.axis === "x" ? 0 : 1,
    dest = options.dest;
    let fromMax = dest === "max";
    if (dest) {
      if (count < 0) { fromMax = !fromMax; count = -count; }
      count--;
    } else {
      count *= +<number> options.dir || 1;
    }
    a.scroll_(di, count, dest ? 1 as never : 0, options.view, fromMax as false);
  },
  /**
   * @param amount0 can not be 0, if `isTo` is 0
   * @param factor `!!factor` can be true only if `isTo` is 0
   * @param fromMax can not be true, if `isTo` is 0
   */
  scroll_: function (this: {}, di: ScrollByY, amount0: number, isTo: BOOL
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: boolean): void {
    const a = this as typeof VScroller;
    a.prepareTop_();
    isTo && di && VMarks.setPreviousPosition_();
    let amount = amount0;
    const element = a.findScrollable_(di, isTo ? fromMax ? 1 : -1 : amount);
    amount = !factor ? a._adjustAmount(di, amount, element)
      : factor === 1 ? amount
      : amount * a.getDimension_(element, di, factor === "max" ? kScrollDim.scrollSize : kScrollDim.viewSize);
    if (fromMax) {
      amount = a.getDimension_(element, di, kScrollDim.scrollSize) - amount
        - a.getDimension_(element, di, kScrollDim.viewSize);
    }
    if (isTo) {
      amount -= a.getDimension_(element, di, kScrollDim.position);
    }
    if (amount && element === a.top_ && element && VDom.isSameOriginChild_) {
      const p = parent as Window & { VScroller: typeof VScroller; }, Sc = p && p.VScroller;
      if (Sc && !a._doesScroll(element, di, amount)) {
        Sc.scroll_(di, amount0, isTo as 0, factor, fromMax as false);
        if (Sc.keyIsDown_) {
          a.scrollTick_(1);
          a._joined = Sc;
        }
        amount = 0;
      }
      a.scrolled_ = 0;
    }
    amount && a._innerScroll(element, di, amount);
    a.top_ = null;
  } as {
    (di: ScrollByY, amount: number, isTo: 0
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: false): void;
    (di: ScrollByY, amount: number, isTo: 1
      , factor?: undefined | 0, fromMax?: boolean): void;
  },
  _joined: null as unknown,
  scrollTick_ (willContinue: BOOL | boolean): void {
    const a = this;
    a.keyIsDown_ = willContinue ? a.maxInterval_ : 0;
    if (a._joined) {
      (a._joined as typeof VScroller).scrollTick_(willContinue);
      if (!willContinue) {
        a._joined = null;
      }
    }
  },
  _adjustAmount (di: ScrollByY, amount: number, element: SafeElement | null): number {
    amount *= VDom.cache_.scrollStepSize;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * (element.scrollWidth < 720 ? 2 : 1)
      ? amount * 0.6 : amount;
  },
  /**
   * @param amount should not be 0
   */
  findScrollable_ (di: ScrollByY, amount: number): SafeElement | null {
    const a = this, top = a.top_;
    let element: SafeElement | null = a.current_;
    if (element) {
      let reason, notNeedToRecheck = !di;
      type Element2 = NonNullable<typeof element>;
      while (element !== top && (reason = a.shouldScroll_need_safe_(element as Element2, di, amount)) < 1) {
        if (!reason) {
          notNeedToRecheck = notNeedToRecheck || a._doesScroll(element as Element2, 1, -amount);
        }
        element = (Build.BTypes & ~BrowserType.Firefox
            ? VDom.SafeEl_(VDom.GetParent_(element as Element, PNType.RevealSlotAndGotoParent))
            : VDom.GetParent_(element as Element, PNType.RevealSlotAndGotoParent) as SafeElement | null
          ) || top;
      }
      element = element !== top || notNeedToRecheck ? element : null;
    }
    if (!element) {
      // note: twitter auto focuses its dialog panel, so it's not needed to detect it here
      const candidate = (<RegExpOne> /^(new|www)?\.?reddit\.com$/).test(location.host)
          ? document.querySelector("#overlayScrollContainer") : null;
      element = Build.BTypes & ~BrowserType.Firefox ? VDom.SafeEl_(candidate) : candidate as SafeElement | null;
    }
    if (!element && top) {
      const candidate = a._selectFirst({ area_: 0, element_: top, height_: 0 });
      a.current_ = element = candidate && candidate.element_ !== top
          && (!a.current_ || candidate.height_ > innerHeight / 2)
          ? candidate.element_ : top;
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
      ? !index ? di ? (el as SafeElement).clientHeight : (el as SafeElement).clientWidth
        : index === kScrollDim.scrollSize ? di ? (el as SafeElement).scrollHeight : (el as SafeElement).scrollWidth
        : di ? (el as SafeElement).scrollTop : (el as SafeElement).scrollLeft
      : index ? di ? scrollY : scrollX : di ? innerHeight : innerWidth;
  },
  _doesScroll (el: SafeElement, di: ScrollByY, amount: number): boolean {
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
  _selectFirst (info: ElementScrollInfo, skipPrepare?: 1): ElementScrollInfo | null {
    let element = info.element_;
    if (element.clientHeight + 3 < element.scrollHeight &&
        (this._doesScroll(element, 1, 1) || element.scrollTop > 0 && this._doesScroll(element, 1, 0))) {
      return info;
    }
    skipPrepare || VDom.prepareCrop_();
    let children: ElementScrollInfo[] = [], child: ElementScrollInfo | null
      , _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len] as Element as /** fake `as` */ SafeElement;
      // here assumes that a <form> won't be a main scrollable area
      if (Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(element)) { continue; }
      const rect = VDom.getBoundingClientRect_(element),
      visible = rect.height > 0 ? VDom.cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)
        : VDom.getVisibleClientRect_(element);
      if (visible) {
        let height_ = visible[3] - visible[1];
        children.push({ area_: (visible[2] - visible[0]) * height_, element_: element, height_});
      }
    }
    children.sort(this.sortByArea_);
    for (const info1 of children) {
      if (child = this._selectFirst(info1, 1)) {
        return child;
      }
    }
    return null;
  },
  /** @NEED_SAFE_ELEMENTS */
  scrollIntoView_need_safe_ (el: SafeElement): void {
    const rect = el.getClientRects()[0] as ClientRect | undefined;
    if (!rect) { return; }
    let a = this, { innerWidth: iw, innerHeight: ih} = window,
    { min, max } = Math, ihm = min(96, ih / 2), iwm = min(64, iw / 2),
    { bottom: b, top: t, right: r, left: l } = rect,
    hasY = b < ihm ? max(b - ih + ihm, t - ihm) : ih < t + ihm ? min(b - ih + ihm, t - ihm) : 0,
    hasX = r < 0 ? max(l - iwm, r - iw + iwm) : iw < l ? min(r - iw + iwm, l - iwm) : 0;
    a.current_ = el as SafeElement;
    if (hasX || hasY) {
      for (let el2: Element | null = el; el2; el2 = VDom.GetParent_(el2, PNType.RevealSlotAndGotoParent)) {
        const pos = getComputedStyle(el2).position;
        if (pos === "fixed" || pos === "sticky") {
          hasX = hasY = 0;
          break;
        }
      }
      if (hasX) {
        (hasY ? a._performScroll : a._innerScroll).call(a, a.findScrollable_(0, hasX), 0, hasX);
      }
      if (hasY) {
        a._innerScroll(a.findScrollable_(1, hasY), 1, hasY);
      }
    }
    a.scrollTick_(0); // it's safe to only clean keyIsDown here
  },
  scrolled_: 0,
  /** @NEED_SAFE_ELEMENTS */
  shouldScroll_need_safe_ (element: SafeElement, di: ScrollByY, amount?: number): -1 | 0 | 1 {
    const st = getComputedStyle(element);
    return (di ? st.overflowY : st.overflowX) === "hidden" || st.display === "none" || st.visibility !== "visible" ? -1
      : <BOOL> +this._doesScroll(element, di
                  , amount != null ? amount : +!(di ? element.scrollTop : element.scrollLeft));
  },
  supressScroll_ (): void {
    if (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage && Build.BTypes & BrowserType.Chrome
        && !VDom.allowRAF_) {
      this.scrolled_ = 0;
      return;
    }
    this.scrolled_ = 2;
    VKey.SuppressAll_(window, "scroll");
    requestAnimationFrame(function (): void {
      VScroller.scrolled_ = 0;
      VKey.SuppressAll_(window, "scroll", true);
    });
  },
  sortByArea_ (this: void, a: ElementScrollInfo, b: ElementScrollInfo): number {
    return b.area_ - a.area_;
  }
};
