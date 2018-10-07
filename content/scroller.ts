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
animate (e: Element | null, d: ScrollByY, a: number): void | number {
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
      if (continuous = _this.keyIsDown > 0) {
        if (int1 >= ScrollerNS.Consts.delayToChangeSpeed) {
          if (int1 > _this.minDelay) { --_this.keyIsDown; }
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
      } else {
        _this.checkCurrent(element);
        element = null;
        last = 0;
        return;
      }
    }
    requestAnimationFrame(animate);
  };
  this.animate = (function(this: typeof VScroller, newEl, newDi, newAmount): void | number {
    amount = Math.abs(newAmount); calibration = 1.0; di = newDi;
    duration = Math.max(ScrollerNS.Consts.minDuration, ScrollerNS.Consts.durationScaleForAmount * Math.log(amount));
    element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    timestamp = ScrollerNS.Consts.invalidTime; totalDelta = totalElapsed = 0.0;
    const keyboard = VSettings.cache.keyboard;
    this.maxInterval = Math.round(keyboard[1] / ScrollerNS.Consts.FrameIntervalMs) + ScrollerNS.Consts.MaxSkippedF;
    this.minDelay = (((keyboard[0] - keyboard[1]) / ScrollerNS.Consts.DelayUnitMs) | 0) * ScrollerNS.Consts.DelayUnitMs;
    this.keyIsDown = this.maxInterval;
    if (last) { return; }
    last = 1;
    return requestAnimationFrame(animate);
  });
  return this.animate(e, d, a);
},
  maxInterval: ScrollerNS.Consts.DefaultMaxIntervalF as number,
  minDelay: ScrollerNS.Consts.DefaultMinDelayMs as number,
  performScroll (el: Element | null, di: ScrollByY, amount: number): boolean {
    let before: number;
    if (di) {
      if (el) {
        before = el.scrollTop;
        el.scrollBy ? el.scrollBy({behavior: "instant", top: amount}) : (el.scrollTop += amount);
        return el.scrollTop !== before;
      } else {
        before = window.scrollY;
        // avoid using `Element`, so that users may override it
        VDom.scrollWndBy(0, amount);
        return window.scrollY !== before;
      }
    } else if (el) {
      before = el.scrollLeft;
      el.scrollBy ? el.scrollBy({behavior: "instant", left: amount}) : (el.scrollLeft += amount);
      return el.scrollLeft !== before;
    } else {
      before = window.scrollX;
      VDom.scrollWndBy(amount, 0);
      return window.scrollX !== before;
    }
  },
  scroll (element: Element | null, di: ScrollByY, amount: number): void | number | boolean {
    if (!amount) { return; }
    if (VSettings.cache.smoothScroll && VDom.allowRAF) {
      return this.animate(element, di, amount);
    }
    this.performScroll(element, di, amount);
    return this.checkCurrent(element);
  },

  current: null as Element | null,
  top: null as Element | null,
  keyIsDown: 0,
  scale: 1,
  Properties: ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"] as
    ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"],
  ScBy (this: void, count: number, options: CmdOptions["scBy"] & SafeObject): void {
    if (VHints.tryNestedFrame("VScroller", "ScBy", count, options)) { return; }
    return VScroller.scrollBy(options.axis === "x" ? 0 : 1, (+<number>options.dir || 1) * count, options.view);
  },
  /** amount: can not be 0 */
  scrollBy (di: ScrollByY, amount: number, factor: CmdOptions["scBy"]["view"]): void {
    VMarks.setPreviousPosition();
    this.prepareTop();
    const element = this.findScrollable(di, amount);
    amount = !factor ? this.adjustAmount(di, amount, element)
      : factor === 1 ? (amount > 0 ? Math.ceil : Math.floor)(amount)
      : amount * this.getDimension(element, di, factor === "max" ? 2 : 0);
    this.scroll(element, di, amount);
    this.top = null;
  },
  ScTo (this: void, count: number, options: CmdOptions["scTo"] & SafeObject): void {
    if (VHints.tryNestedFrame("VScroller", "ScTo", count, options)) { return; }
    let fromMax: BOOL = options.dest === "max" ? 1 : 0;
    if (count < 0) { fromMax = (1 - fromMax as BOOL); count = -count; }
    return VScroller.scrollTo(options.axis === "x" ? 0 : 1, count - 1, fromMax);
  },
  /** `amount`: default to be `0` */
  scrollTo (di: ScrollByY, amount: number, fromMax: BOOL): void {
    this.prepareTop();
    const element = this.findScrollable(di, fromMax ? 1 : -1);
    amount = this.adjustAmount(di, amount, element);
    fromMax && (amount = this.getDimension(element, di, 2) - amount - this.getDimension(element, di, 0));
    amount -= element ? element[this.Properties[4 + di]] : di ? window.scrollY : window.scrollX;
    this.scroll(element, di, amount);
    this.top = null;
  },
  adjustAmount (di: ScrollByY, amount: number, element: Element | null): number {
    amount *= VSettings.cache.scrollStepSize;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * 2
      ? Math.ceil(amount * 0.6) : amount;
  },
  findScrollable (di: ScrollByY, amount: number): Element | null {
    let element: Element | null = this.current;
    if (!element) {
      element = this.top;
      return this.current = element && (this.selectFirst(element) || element);
    }
    while (element !== this.top && !this.shouldScroll(element as Element, di, amount)) {
      element = VDom.getParent(element as Element) || this.top;
    }
    return element;
  },
  prepareTop (): void {
    this.top = VDom.scrollingEl() || (VDom.isHTML() ? document.documentElement : null);
    if (this.top) {
      VDom.getZoom(1);
      this.getScale();
    }
  },
  getScale (): void {
    this.scale = 1 / Math.min(1, VDom.wdZoom) / Math.min(1, VDom.bZoom);
  },
  checkCurrent (el: Element | null): void {
    const cur = this.current;
    if (cur !== el && cur && VDom.NotVisible(cur)) { this.current = el; }
  },
  getDimension (el: Element | null, di: ScrollByY, index: 0 | 2): number {
    return el !== this.top || (index && el) ? ((el || this.top) as Element)[this.Properties[index + di]]
      : di ? window.innerHeight : window.innerWidth;
  },
  scrollDo (el: Element, di: ScrollByY, amount: number): boolean {
    const key = this.Properties[4 + di as 4 | 5], before = el[key], k2: "top" | "left" = di ? "top": "left"
      , arg: ScrollToOptions = { behavior: "instant" };
    arg[k2] = (amount > 0 ? 1 : -1) * this.scale;
    el.scrollBy ? el.scrollBy(arg) : (el[key] += arg[k2] as number);
    let changed = el[key] !== before;
    if (changed) {
      el.scrollTo ? (arg[k2] = before, el.scrollTo(arg)) : (el[key] = before);
      this.scrolled === 0 && (this.scrolled = 1);
    }
    return changed;
  },
  selectFirst (element: Element, skipPrepare?: 1): Element | null {
    if (element.clientHeight + 3 < element.scrollHeight &&
        (this.scrollDo(element, 1, 1) || element.scrollTop > 0 && this.scrollDo(element, 1, 0))) {
      this.scrolled = 0;
      return element;
    }
    skipPrepare || VDom.prepareCrop();
    let children = [] as {area: number, el: Element}[], _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len];
      if (element instanceof HTMLFormElement) { continue; }
      const rect = element.getBoundingClientRect(),
      visible = rect.height > 0 ? VDom.cropRectToVisible(rect.left, rect.top, rect.right, rect.bottom)
        : VDom.getVisibleClientRect(element);
      if (visible) {
        children.push({ area: (visible[2] - visible[0]) * (visible[3] - visible[1]), el: element});
      }
    }
    children.sort(this.sortByArea);
    for (_len = children.length; 0 < _len--; ) {
      if (element = this.selectFirst(children[_len].el, 1) as any) { return element; }
    }
    return null;
  },
  scrollIntoView (el: Element): void {
    const rect = el.getClientRects()[0] as ClientRect | undefined;
    if (!rect) { return; }
    this.prepareTop();
    this.current = el;
    const { innerWidth: iw, innerHeight: ih} = window,
    { bottom: b, height: h2, top: t, right: r, width: w2, left: l } = rect,
    hasY = b < 0 ? b - Math.min(h2, ih) : ih < t ? t + Math.min(h2 - ih, 0) : 0,
    hasX = r < 0 ? r - Math.min(w2, iw) : iw < l ? l + Math.min(w2 - iw, 0) : 0;
    if (hasX) {
      (hasY ? this.performScroll : this.scroll).call(this, this.findScrollable(0, hasX), 0, hasX);
    }
    if (hasY) {
      this.scroll(this.findScrollable(1, hasY), 1, hasY);
    }
    this.keyIsDown = 0; // it's safe to only clean keyIsDown here
    this.top = null;
  },
  scrolled: 0,
  shouldScroll (element: Element, di: ScrollByY, amount?: number): boolean {
    const st = getComputedStyle(element);
    return (di ? st.overflowY : st.overflowX) !== "hidden" && st.display !== "none" && st.visibility === "visible" &&
      this.scrollDo(element, di, amount != null ? amount : +!(di ? element.scrollTop : element.scrollLeft));
  },
  supressScroll (): void {
    if (!VDom.allowRAF) { this.scrolled = 0; return; }
    this.scrolled = 2;
    VUtils.suppressAll(window, "scroll");
    requestAnimationFrame(function(): void {
      VScroller.scrolled = 0;
      VUtils.suppressAll(window, "scroll", true);
    });
  },
  sortByArea (this: void, a: {area: number, el: Element}, b: {area: number, el: Element}): number {
    return a.area - b.area;
  }
};
