declare namespace ScrollerNS {
  const enum Consts {
    calibrationBoundary = 150, maxCalibration = 1.6, minCalibration = 0.5,
    invalidTime = -1.0, minDuration = 100, durationScaleForAmount = 20,
    maxS = 1.05, minS = 0.95, delayToChangeSpeed = 75, tickForUnexpectedTime = 17,

    DelayUnitMs = 30, FrameIntervalMs = 16.67, MaxSkippedF = 4,
    //            delay         interval  # delay - interval (not so useful)
    // high:  60f / 1000ms :  400ms / 24f # 600 / 28
    // low:   15f /  250ms :   33ms /  2f # 200 / 6
    HighDelayMs = 1000, LowDelayMs = 250, DefaultMinDelayMs = 600,
    HighIntervalF = 24, LowIntervalF = 2, DefaultMaxIntervalF = HighIntervalF + MaxSkippedF,
  }
  interface Animate {
    (newAmount: number, newDi: ScrollByY, newEl: Element | null): number;
  }
}
var VScroller = {
Core: {
  animate: null as never as ScrollerNS.Animate,
  maxInterval: ScrollerNS.Consts.DefaultMaxIntervalF,
  minDelay: ScrollerNS.Consts.DefaultMinDelayMs,
  performScroll (el: Element | null, di: ScrollByY, amount: number): boolean {
    let before: number;
    if (di) {
      if (el) {
        before = el.scrollTop;
        el.scrollTop += amount;
        return el.scrollTop !== before;
      } else {
        before = window.scrollY;
        window.scrollBy(0, amount);
        return window.scrollY !== before;
      }
    } else if (el) {
      before = el.scrollLeft;
      el.scrollLeft += amount;
      return el.scrollLeft !== before;
    } else {
      before = window.scrollX;
      window.scrollBy(amount, 0);
      return window.scrollX !== before;
    }
  },
  scroll (element: Element | null, di: ScrollByY, amount: number): void | number {
    if (!amount) { return; }
    if (VSettings.cache.smoothScroll) {
      return this.animate(amount, di, element);
    }
    this.performScroll(element, di, amount);
    return VScroller.checkCurrent(element);
  }
},

  current: null as Element | null,
  top: null as Element | null,
  keyIsDown: 0,
  scale: 1,
  Properties: ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"] as
    ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"],
  ScBy (count: number, options: FgOptions): void {
    if (VHints.tryNestedFrame("VScroller.ScBy", count, options)) { return; }
    return VScroller.scrollBy(options.axis === "x" ? 0 : 1, (+options.dir || 1) * count, options.view);
  },
  /** amount: can not be 0 */
  scrollBy (di: ScrollByY, amount: number, factor: 0 | 1 | "max" | "viewSize"): void {
    VMarks.setPreviousPosition();
    const element = this.findScrollable(this.getActivatedElement(), di, amount);
    amount = !factor ? this.adjustAmount(di, amount, element)
      : factor === 1 ? (amount > 0 ? Math.ceil : Math.floor)(amount)
      : amount * this.getDimension(element, di, factor === "max" ? 2 : 0);
    this.Core.scroll(element, di, amount);
    this.top = null;
  },
  ScTo (count: number, options: FgOptions): void {
    if (VHints.tryNestedFrame("VScroller.ScTo", count, options)) { return; }
    return VScroller.scrollTo(options.axis === "x" ? 0 : 1, count - 1, options.dest === "max" ? 1 : 0);
  },
  /** amount: can not be 0 */
  scrollTo (di: ScrollByY, amount: number, fromMax: BOOL): void {
    const element = this.findScrollable(this.getActivatedElement(), di, fromMax ? 1 : -1);
    amount = this.adjustAmount(di, amount, element);
    fromMax && (amount = this.getDimension(element, di, 2) - amount);
    amount -= element ? element[this.Properties[4 + di]] : di ? window.scrollY : window.scrollX;
    this.Core.scroll(element, di, amount);
    this.top = null;
  },
  adjustAmount (di: ScrollByY, amount: number, element: Element | null): number {
    amount *= VSettings.cache.scrollStepSize;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * 2
      ? Math.ceil(amount * 0.6) : amount;
  },
  findScrollable (element: Element | null, di: ScrollByY, amount: number): Element | null {
    while (element !== this.top && !(this.scrollDo(element, di, amount) && this.shouldScroll(element as Element, di))) {
      element = VDom.getParent(element as Element) || this.top;
    }
    return element;
  },
  getActivatedElement (): Element | null {
    let element: Element | null;
    this.top = document.scrollingElement || document.body || (VDom.isHTML() ? document.documentElement : null);
    this.scale = Math.max(1, 1 / (window.devicePixelRatio || 1));
    if (element = this.current) { return element; }
    element = this.top;
    return this.current = element && (this.selectFirst(element) || element);
  },
  checkCurrent (el: Element | null): void {
    if (this.current !== el && !(this.current && VDom.isVisibile(this.current))) { this.current = el; }
  },
  getDimension (el: Element | null, di: ScrollByY, index: 0 | 2): number {
    return el !== this.top || (index && el) ? ((el || this.top) as Element)[this.Properties[index + di]]
      : di ? window.innerHeight : window.innerWidth;
  },
  scrollDo (element: Element | null, di: ScrollByY, amount: number): boolean {
    amount = (amount > 0 ? 1 : -1) * this.scale;
    return this.Core.performScroll(element, di, amount) && this.Core.performScroll(element, di, -amount);
  },
  selectFirst (element: Element): Element | null {
    if (this.scrollDo(element, 1, 1) || this.scrollDo(element, 1, 0)) {
      return element;
    }
    VDom.prepareCrop();
    let children = [] as [number, Element][], rect: VRect | null, _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len];
      if (rect = VDom.getVisibleClientRect(element)) {
        children.push([(rect[2] - rect[0]) * (rect[3] - rect[1]), element]);
      }
    }
    children.sort(this.sortBy0);
    for (_len = children.length; 0 < _len--; ) {
      if (element = this.selectFirst(children[_len][1]) as Element) { return element; }
    }
    return null;
  },
  scrollIntoView (el: Element): void {
    let rect = el.getClientRects()[0] as ClientRect | undefined, hasY, ref, oldSmooth;
    if (!rect) { return; }
    this.getActivatedElement();
    let height = window.innerHeight, width = window.innerWidth,
    amount = rect.bottom < 0 ? rect.bottom - Math.min(rect.height, height)
      : height < rect.top ? rect.top + Math.min(rect.height - height, 0) : 0;
    if (hasY = amount) {
      this.Core.scroll(this.findScrollable(el, 1, amount), 1, amount);
      VScroller.keyIsDown = 0;
    }
    amount = rect.right < 0 ? rect.right - Math.min(rect.width, width)
      : width < rect.left ? rect.left + Math.min(rect.width - width, 0) : 0;
    if (amount) {
      ref = VSettings.cache;
      oldSmooth = ref.smoothScroll;
      ref.smoothScroll = !hasY && oldSmooth;
      this.Core.scroll(this.findScrollable(el, 0, amount), 0, amount);
      ref.smoothScroll = oldSmooth;
      VScroller.keyIsDown = 0;
    }
    this.top = null;
  },
  shouldScroll (element: Element, di: ScrollByY): boolean {
    const st = window.getComputedStyle(element);
    return (di ? st.overflowY : st.overflowX) !== "hidden" && VDom.isStyleVisible(st);
  },
  isScrollable (el: Element, di: ScrollByY): boolean {
    return this.scrollDo(el, di, +!(di ? el.scrollTop : el.scrollLeft)) && this.shouldScroll(el, di);
  },
  sortBy0 (this: void, a: [number, Element], b: [number, Element]): number {
    return a[0] - b[0];
  }
};

VScroller.Core.animate = function (this: typeof VScroller.Core, a, d, e) {
  let amount = 0, calibration = 1.0, di: ScrollByY = 0, duration = 0, element: Element | null = null, //
  sign = 0, timestamp = ScrollerNS.Consts.invalidTime, totalDelta = 0.0, totalElapsed = 0.0, //
  animate = function(newTimestamp: number): void {
    let int1 = timestamp, elapsed: number, continuous: boolean;
    timestamp = newTimestamp;
    if (int1 === ScrollerNS.Consts.invalidTime) {
      requestAnimationFrame(animate);
      return;
    }
    elapsed = newTimestamp - int1;
    elapsed = elapsed > 0 ? elapsed : ScrollerNS.Consts.tickForUnexpectedTime;
    int1 = (totalElapsed += elapsed);
    const _this = VScroller.Core;
    if (continuous = VScroller.keyIsDown > 0) {
      if (int1 >= ScrollerNS.Consts.delayToChangeSpeed) {
        if (int1 > _this.minDelay) { --VScroller.keyIsDown; }
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
    if (int1 > 0 && _this.performScroll(element, di, sign * int1)) {
      totalDelta += int1;
      requestAnimationFrame(animate);
      return;
    }
    VScroller.checkCurrent(element);
    element = null;
  };
  this.animate = function(this: typeof VScroller.Core, newAmount, newDi, newEl): number {
    amount = Math.abs(newAmount); calibration = 1.0; di = newDi;
    duration = Math.max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * Math.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    timestamp = ScrollerNS.Consts.invalidTime; totalDelta = totalElapsed = 0.0;
    const keyboard = VSettings.cache.keyboard;
    this.maxInterval = Math.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF;
    this.minDelay = (((keyboard[0] - keyboard[1]) / ScrollerNS.Consts.DelayUnitMs) | 0) * ScrollerNS.Consts.DelayUnitMs;
    VScroller.keyIsDown = this.maxInterval;
    return requestAnimationFrame(animate);
  };
  return this.animate(a, d, e);
};
