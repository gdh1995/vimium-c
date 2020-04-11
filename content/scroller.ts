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
// eslint-disable-next-line no-var
var VSc = {
_animate (e: SafeElement | null, d: ScrollByY, a: number): void {
  let amount = 0, calibration = 1.0, di: ScrollByY = 0, duration = 0, element: SafeElement | null = null, //
  sign = 0, timestamp = 0, totalDelta = 0.0, totalElapsed = 0.0, //
  running = 0, next = requestAnimationFrame, timer = TimerID.None,
  top: SafeElement | null = null,
  self = VSc,
  animate = (newTimestamp: number): void => {
    if (!VSc || !running) { toggleRunning(); return; }
    const
    // although timestamp is mono, Firefox adds too many limits to its precision
    elapsed = !timestamp ? (newTimestamp = performance.now(), ScrollerNS.Consts.firstTick)
              : newTimestamp > timestamp ? newTimestamp - timestamp
              : (newTimestamp += ScrollerNS.Consts.tickForUnexpectedTime, ScrollerNS.Consts.tickForUnexpectedTime),
    continuous = self.keyIsDown_ > 0;
    timestamp = newTimestamp;
    totalElapsed += elapsed;
    if (amount < ScrollerNS.Consts.AmountLimitToScrollAndWaitRepeatedKeys
        && continuous && totalDelta >= amount && totalElapsed < self.minDelay_ - 2) {
      running = 0;
      timer = VKey.timeout_(startAnimate, self.minDelay_ - totalElapsed);
      return;
    }
    if (continuous) {
      if (totalElapsed >= ScrollerNS.Consts.delayToChangeSpeed) {
        if (totalElapsed > self.minDelay_) { --self.keyIsDown_; }
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
    delta = delta > 0 ? Math.abs(self._performScroll(element, di, sign * Math.ceil(delta))) : 0;
    if (delta) {
      totalDelta += delta;
      next(animate);
    } else {
      if ((!(Build.BTypes & BrowserType.Chrome) || VDom.cache_.v >= BrowserVer.MinMaybeScrollEndAndOverScrollEvents)
          && "onscrollend" in (Build.BTypes & ~BrowserType.Firefox ? Image.prototype : document)) {
        // according to tests on C75, no "scrollend" events if scrolling behavior is "instant";
        // the doc on Google Docs requires no "overscroll" events for programmatic scrolling
        const notEl: boolean = !element || element === VDom.scrollingEl_();
        (notEl ? document : element!).dispatchEvent(
            new Event("scrollend", {cancelable: false, bubbles: notEl}));
      }
      self._checkCurrent(element);
      toggleRunning();
    }
  },
  startAnimate = (): void => {
    timer = TimerID.None;
    running = running || next(animate);
  },
  toggleRunning = self._toggleAnimation = (scrolling?: BOOL): void => {
    const el = (scrolling ? Build.BTypes & ~BrowserType.Firefox ? VDom.SafeEl_not_ff_!(VDom.docEl_unsafe_())
        : VDom.docEl_unsafe_() : top
        ) as SafeElement & TypeToAssert<Element, HTMLElement | SVGElement, "style"> | null;
    top = scrolling ? el : (running = 0, element = null);
    el && el.style ? el.style.pointerEvents = scrolling ? "none" : "" : 0;
  };
  self._animate = (newEl, newDi, newAmount): void => {
    const math = Math, max = math.max;
    amount = max(1, math.abs(newAmount)); calibration = 1.0; di = newDi;
    duration = max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * math.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    totalDelta = totalElapsed = 0.0;
    timestamp = 0;
    if (timer) {
      VKey.clearTimeout_(timer);
    }
    const keyboard = VDom.cache_.k;
    self.maxInterval_ = math.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF;
    self.minDelay_ = (((keyboard[0] + max(keyboard[1], ScrollerNS.Consts.DelayMinDelta)
          + ScrollerNS.Consts.DelayTolerance) / ScrollerNS.Consts.DelayUnitMs) | 0)
      * ScrollerNS.Consts.DelayUnitMs;
    self.preventPointEvents_ && toggleRunning(1);
    startAnimate();
  };
  self._animate(e, d, a);
},
_toggleAnimation: 0 as 0 | (() => void),
  maxInterval_: ScrollerNS.Consts.DefaultMaxIntervalF as number,
  minDelay_: ScrollerNS.Consts.DefaultMinDelayMs as number,
  _performScroll (el: SafeElement | null, di: ScrollByY, amount: number, before?: number): number {
    let newPos: number, kInstant = "instant" as const;
    if (di) {
      if (el) {
        before = before == null ? el.scrollTop : before;
        !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
        !(Build.BTypes & ~BrowserType.Firefox) ||
        el.scrollBy ? el.scrollBy({behavior: kInstant, top: amount}) : (el.scrollTop += amount);
        newPos = el.scrollTop;
      } else {
        before = scrollY;
        // avoid using `Element`, so that users may override it
        VDom.scrollWndBy_(0, amount);
        newPos = scrollY;
      }
    } else if (el) {
      before = before == null ? el.scrollLeft : before;
      !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
      !(Build.BTypes & ~BrowserType.Firefox) ||
      el.scrollBy ? el.scrollBy({behavior: kInstant, left: amount}) : (el.scrollLeft += amount);
      newPos = el.scrollLeft;
    } else {
      before = scrollX;
      VDom.scrollWndBy_(amount, 0);
      newPos = scrollX;
    }
    return newPos - before;
  },
  $sc (element: SafeElement | null, di: ScrollByY, amount: number): void {
    if (this.hasSpecialScrollSnap_(element)) {
      while (Math.abs(amount) >= 1 && !this._performScroll(element, di, amount)) {
        amount /= 2;
      }
      this._checkCurrent(element);
    } else if (VDom.cache_.s
        && (Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage || !(Build.BTypes & BrowserType.Chrome)
            || VDom.allowRAF_)) {
      amount && this._animate(element, di, amount);
      this.scrollTick_(1);
    } else if (amount) {
      this._performScroll(element, di, amount);
      this._checkCurrent(element);
    }
  },

  /** @NEED_SAFE_ELEMENTS */
  top_: null as SafeElement | null,
  doseForceToScroll_: 0 as BOOL,
  keyIsDown_: 0,
  preventPointEvents_: 1 as BOOL | boolean,
  scale_: 1,
  activateS_ (this: void, count: number, options: CmdOptions[kFgCmd.scroll] & SafeObject): void {
    if (options.$c == null) {
      options.$c = VApi.isCmdTriggered_();
    }
    if (VApi.checkHidden_(kFgCmd.scroll, count, options)) { return; }
    if (VHints.TryNestedFrame_(kFgCmd.scroll, count, options)) { return; }
    const a = VSc, di: ScrollByY = options.axis === "x" ? 0 : 1,
    dest = options.dest;
    let fromMax = dest === "max";
    if (dest) {
      if (count < 0) { fromMax = !fromMax; count = -count; }
      count--;
    } else {
      count *= +(options.dir!) || 1;
    }
    a.scroll_(di, count, dest ? 1 as never : 0, options.view, fromMax as false, options);
    if (a.keyIsDown_ && !options.$c) {
      a.scrollTick_(0);
    }
  },
  /**
   * @param amount0 can not be 0, if `isTo` is 0; can not be negative, if `isTo` is 1
   * @param factor `!!factor` can be true only if `isTo` is 0
   * @param fromMax can not be true, if `isTo` is 0
   */
  scroll_: function (this: {}, di: ScrollByY, amount0: number, isTo: BOOL
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: boolean
      , options?: CmdOptions[kFgCmd.scroll]): void {
    const a = this as typeof VSc;
    a.prepareTop_();
    const element = a.findScrollable_(di, isTo ? fromMax ? 1 : -1 : amount0);
    let amount = !factor ? a._adjustAmount(di, amount0, element)
      : factor === 1 ? amount0
      : amount0 * a.getDimension_(element, di, factor === "max" ? kScrollDim.scrollSize : kScrollDim.viewSize);
    if (isTo) {
      const curPos = a.getDimension_(element, di, kScrollDim.position),
      viewSize = a.getDimension_(element, di, kScrollDim.viewSize),
      max = (fromMax || amount) && a.getDimension_(element, di, kScrollDim.scrollSize) - viewSize;
      amount = element ? Math.max(0, Math.min(fromMax ? max - amount : amount, max)) - curPos
          : fromMax ? viewSize : amount - curPos;
    }
    let core: ReturnType<typeof VDom.parentCore_ff_>;
    if (element === a.top_ && element
        && (core = Build.BTypes & BrowserType.Firefox ? VDom.parentCore_ff_!()
                : VDom.frameElement_() && parent as Window)) {
      const vSc = core.VSc as typeof VSc;
      if (vSc && !a._doesScroll(element, di, amount || (fromMax ? 1 : 0))) {
        vSc.scroll_(di, amount0, isTo as 0, factor, fromMax as false);
        if (vSc.keyIsDown_) {
          a.scrollTick_(1);
          a._joined = vSc;
        }
        amount = 0;
      }
    }
    if (isTo && element === a.top_) {
      amount && di && VMarks.setPreviousPosition_();
      if (!a._joined && options && (options as Extract<typeof options, {dest: string}>).sel === "clear") {
        VCui.resetSelectionToDocStart_();
      }
    }
    a.preventPointEvents_ = !(options && options.keepHover);
    a.$sc(element, di, amount);
    a.preventPointEvents_ = 1;
    a.scrolled_ = 0;
    a.top_ = null;
    if (amount && VDom.readyState_ > "i" && VSc._overrideScrollRestoration) {
      VSc._overrideScrollRestoration("scrollRestoration", "manual", "unload");
    }
  } as {
    (di: ScrollByY, amount: number, isTo: 0
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: false
      , options?: CmdOptions[kFgCmd.scroll]): void;
    (di: ScrollByY, amount: number, isTo: 1
      , factor?: undefined | 0, fromMax?: boolean, options?: CmdOptions[kFgCmd.scroll]): void;
  },
  _joined: null as unknown,
  _overrideScrollRestoration: function (kScrollRestoration, kManual, kUnload): void {
    const h = history, old = h[kScrollRestoration], listen = VKey.SetupEventListener_,
    reset = (): void => { h[kScrollRestoration] = old; listen(0, kUnload, reset, 1); };
    if (old && old !== kManual) {
      h[kScrollRestoration] = kManual;
      VSc._overrideScrollRestoration = 0 as never;
      VDom.OnDocLoaded_(() => { VKey.timeout_(reset, 1); }, 1);
      listen(0, kUnload, reset);
    }
  } as ((key: "scrollRestoration", kManual: "manual", kUnload: "unload") => void) | 0,
  /** @argument willContinue 1: continue; 0: skip middle steps; 2: abort further actions */
  scrollTick_ (willContinue: BOOL | 2): void {
    const a = this;
    a.keyIsDown_ = willContinue - 1 ? 0 : a.maxInterval_;
    willContinue > 1 && a._toggleAnimation && a._toggleAnimation();
    if (a._joined) {
      (a._joined as typeof VSc).scrollTick_(willContinue);
      if (willContinue - 1) {
        a._joined = null;
      }
    }
  },
  BeginScroll_ (eventWrapper: 0 | Pick<HandlerNS.Event, "e">, key: string, keybody: kChar): void {
    if (key.includes("s-") || key.includes("a-")) { return; }
    const index = VKey.keyNames_.indexOf(keybody) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
    vSc = VSc;
    (index > 2 || key === keybody) && eventWrapper && VKey.prevent_(eventWrapper.e);
    if (index > 4) {
      vSc.scroll_((~index & 1) as BOOL, index < 7 ? -1 : 1, 0);
    } else if (index > 2) {
      vSc.scroll_(1, 0, 1, 0, index < 4);
    } else if (key === keybody) {
      vSc.scroll_(1, index - 1.5, 0, 2);
    }
  },
  OnScrolls_ (event: KeyboardEventToPrevent): boolean {
    let repeat = Build.MinCVer < BrowserVer.Min$KeyboardEvent$$Repeat$ExistsButNotWork
        && Build.BTypes & BrowserType.Chrome ? !!event.repeat : event.repeat;
    repeat && VKey.prevent_(event);
    VSc.scrollTick_(<BOOL> +repeat);
    return repeat;
  },
  _adjustAmount (di: ScrollByY, amount: number, element: SafeElement | null): number {
    amount *= VDom.cache_.t;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * (element.scrollWidth < 720 ? 2 : 1)
      ? amount * 0.6 : amount;
  },
  /**
   * @param amount should not be 0
   */
  findScrollable_ (di: ScrollByY, amount: number): SafeElement | null {
    const a = this, top = a.top_, ui = VCui, activeEl: SafeElement | null = ui.activeEl_;
    let element = activeEl;
    if (element) {
      let reason: number, notNeedToRecheck = !di;
      while (element !== top && (reason = a.shouldScroll_need_safe_(element!
              , element === ui.cachedScrollable_ ? (di + 2) as 2 | 3 : di
              , amount)) < 1) {
        if (!reason) {
          notNeedToRecheck = notNeedToRecheck || a._doesScroll(element!, 1, -amount);
        }
        element = (Build.BTypes & ~BrowserType.Firefox
            ? VDom.SafeEl_not_ff_!(VDom.GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent))
            : VDom.GetParent_unsafe_(element!, PNType.RevealSlotAndGotoParent) as SafeElement | null
          ) || top;
      }
      element = element !== top || notNeedToRecheck ? element : null;
      ui.cachedScrollable_ = element;
    }
    if (!element) {
      // note: twitter auto focuses its dialog panel, so it's not needed to detect it here
      const candidate = (<RegExpOne> /^(new|www)?\.?reddit\.com$/).test(location.host)
          ? VDom.querySelector_unsafe_("#overlayScrollContainer") : null;
      element = Build.BTypes & ~BrowserType.Firefox ? VDom.SafeEl_not_ff_!(candidate) : candidate as SafeElement | null;
    }
    if (!element && top) {
      const candidate = a._selectFirst({ area_: 0, element_: top, height_: 0 });
      element = candidate && candidate.element_ !== top
          && (!activeEl || candidate.height_ > innerHeight / 2)
          ? candidate.element_ : top;
      // if VCui.activeEl_, then delay update to VCui.activeEl_, until scrolling ends and ._checkCurrent is called;
      // otherwise, cache selected element for less further cost
      activeEl || (ui.activeEl_ = element, ui.cachedScrollable_ = 0);
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
    /** https://drafts.csswg.org/cssom-view/#dom-element-scrolltop
     * Imported on 2013-05-15 by https://github.com/w3c/csswg-drafts/commit/ad01664359641f791d99f0b3fce545b55579acdc
     * Firefox is still using `int`: https://bugzilla.mozilla.org/show_bug.cgi?id=1217330 (filed on 2015-10-22)
     */
    this.scale_ = (Build.BTypes & BrowserType.Firefox ? 2 : 1) / Math.min(1, VDom.wdZoom_) / Math.min(1, VDom.bZoom_);
  },
  _checkCurrent (el: SafeElement | null): void {
    const ui = VCui, cur = ui.activeEl_;
    if (cur !== el && cur && VDom.NotVisible_(cur)) { ui.activeEl_ = el; ui.cachedScrollable_ = 0; }
  },
  /** if `el` is null, then return viewSize for `kScrollDim.scrollSize` */
  getDimension_ (el: SafeElement | null, di: ScrollByY, index: kScrollDim & number): number {
    let visual;
    return el !== this.top_ || index && el
      ? !index ? di ? el!.clientHeight : el!.clientWidth
        : index < kScrollDim.position ? di ? el!.scrollHeight : el!.scrollWidth
        : di ? el!.scrollTop : el!.scrollLeft
      : index > kScrollDim.scrollSize ? di ? scrollY : scrollX
      : (visual = visualViewport,
          !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$
          || visual && (!(Build.BTypes & BrowserType.Chrome)
              || Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$ || visual.width)
          ? di ? visual!.height : visual!.width!
          : di ? innerHeight : innerWidth);
  },
  hasSpecialScrollSnap_ (el: SafeElement | null): boolean {
    const scrollSnap: string | null | undefined = el && VDom.getComputedStyle_(el).scrollSnapType;
    return !!scrollSnap && scrollSnap !== "none";
  },
  _doesScroll (el: SafeElement, di: ScrollByY, amount: number): boolean {
    /** @todo: re-check whether it's scrollable when hasSpecialScrollSnap_ on Firefox */
    // Currently, Firefox corrects positions before .scrollBy returns,
    // so it always fails if amount < next-box-size
    const before = this.getDimension_(el, di, kScrollDim.position),
    changed = this._performScroll(el, di, (amount > 0 ? 1 : -1) * this.scale_, before);
    if (changed) {
      if (!di && this.hasSpecialScrollSnap_(el)) {
        /**
         * Here needs the third scrolling, because in `X Prox. LTR` mode, a second scrolling may jump very far.
         * Tested on https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type .
         */
        let changed2 = this._performScroll(el, 0, -changed, before);
        Math.abs(changed2) > 0.2 && this._performScroll(el, 0, -changed2, before);
      } else if (!(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior
          || !(Build.BTypes & ~BrowserType.Firefox) || el.scrollTo) {
        el.scrollTo({behavior: "instant", [di ? "top" : "left"]: before });
      } else {
        di ? (el.scrollTop = before) : (el.scrollLeft = before);
      }
      this.scrolled_ = this.scrolled_ || 1;
    }
    return !!changed;
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
      element = _ref[_len]! as /** fake `as` */ SafeElement;
      // here assumes that a <form> won't be a main scrollable area
      if (Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_not_ff_!(element)) { continue; }
      const rect = VDom.getBoundingClientRect_(element),
      visible = rect.height > 0 ? VDom.cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)
        : VDom.getVisibleClientRect_(element);
      if (visible) {
        let height_ = visible.b - visible.t;
        children.push({ area_: (visible.r - visible.l) * height_, element_: element, height_});
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
    VCui.activeEl_ = el;
    VCui.cachedScrollable_ = 0;
    if (hasX || hasY) {
      for (let el2: Element | null = el; el2; el2 = VDom.GetParent_unsafe_(el2, PNType.RevealSlotAndGotoParent)) {
        const pos = VDom.getComputedStyle_(el2).position;
        if (pos === "fixed" || pos === "sticky") {
          hasX = hasY = 0;
          break;
        }
      }
      if (hasX) {
        (hasY ? a._performScroll : a.$sc).call<typeof a, [SafeElement | null, BOOL, number], number | void>(
            a, a.findScrollable_(0, hasX), 0, hasX);
      }
      if (hasY) {
        a.$sc(a.findScrollable_(1, hasY), 1, hasY);
      }
    }
    a.scrolled_ = 0;
    a.scrollTick_(0); // it's safe to only clean keyIsDown here
  },
  scrolled_: 0,
  /** @NEED_SAFE_ELEMENTS */
  shouldScroll_need_safe_ (element: SafeElement, di: BOOL | 2 | 3, amount: number): -1 | 0 | 1 {
    const st = VDom.getComputedStyle_(element);
    return (di ? st.overflowY : st.overflowX) === "hidden" && di < 2
      || st.display === "none" || st.visibility !== "visible" ? -1
      : <BOOL> +this._doesScroll(element, (di & 1) as BOOL
                  , amount || +!(di ? element.scrollTop : element.scrollLeft));
  },
  suppressScroll_ (): void {
    if (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage && Build.BTypes & BrowserType.Chrome
        && !VDom.allowRAF_) {
      this.scrolled_ = 0;
      return;
    }
    this.scrolled_ = 2;
    VKey.SetupEventListener_(0, "scroll");
    requestAnimationFrame(function (): void {
      VSc.scrolled_ = 0;
      VKey.SetupEventListener_(0, "scroll", null, 1);
    });
  },
  sortByArea_ (this: void, a: ElementScrollInfo, b: ElementScrollInfo): number {
    return b.area_ - a.area_;
  }
};
