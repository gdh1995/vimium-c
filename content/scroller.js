"use strict";
var VScroller = {
Core: {
  animate: null,
  calibrationBoundary: 150,
  maxCalibration: 1.6,
  minCalibration: 0.5,
  // high:  60f / 1000ms :  400ms / 24f # 600 / 28
  // low:   15f /  250ms :   33ms /  2f # 200 / 6
  maxInterval: 28,
  minDelay: 600,
  performScroll: function(el, di, amount) {
    var before;
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
  scroll: function(element, di, amount) {
    if (!amount) { return; }
    if (VSettings.cache.smoothScroll) {
      this.animate(amount, di, element);
      return;
    }
    this.performScroll(element, di, amount);
    VScroller.checkCurrent(element);
  }
},

  current: null,
  top: null,
  keyIsDown: 0,
  scale: 1,
  Properties: ["clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "scrollLeft", "scrollTop"],
  ScBy: function(count, options) {
    if (VHints.tryNestedFrame("VScroller.ScBy", count, options)) { return; }
    return VScroller.scrollBy(options.axis === "x" ? 0 : 1, (options.dir || 1) * count, options.view);
  },
  scrollBy: function(di, amount, factor) {
    VMarks.setPreviousPosition();
    var element = this.findScrollable(this.getActivatedElement(), di, amount);
    amount = !factor ? this.adjustAmount(di, amount, element)
      : factor === 1 ? (amount > 0 ? Math.ceil : Math.floor)(amount)
      : amount * this.getDimension(element, di, factor === "max" ? 2 : 0);
    this.Core.scroll(element, di, amount);
    this.top = null;
  },
  ScTo: function(count, options) {
    if (VHints.tryNestedFrame("VScroller.ScTo", count, options)) { return; }
    return VScroller.scrollTo(options.axis === "x" ? 0 : 1, count - 1, +(options.dest === "max"));
  },
  scrollTo: function(di, amount, fromMax) {
    var element = this.findScrollable(this.getActivatedElement(), di, fromMax ? 1 : -1);
    amount = this.adjustAmount(di, amount, element);
    fromMax && (amount = this.getDimension(element, di, 2) - amount);
    amount -= element ? element[this.Properties[4 + di]] : di ? window.scrollY : window.scrollX;
    this.Core.scroll(element, di, amount);
    this.top = null;
  },
  adjustAmount: function(di, amount, element) {
    amount *= VSettings.cache.scrollStepSize;
    return !di && amount && element && element.scrollWidth <= element.scrollHeight * 2
      ? Math.ceil(amount * 0.6) : amount;
  },
  findScrollable: function(element, di, amount) {
    while (element !== this.top && !(this.scrollDo(element, di, amount) && this.shouldScroll(element, di))) {
      element = VDom.getParent(element) || this.top;
    }
    return element;
  },
  getActivatedElement: function() {
    var element;
    this.top = document.scrollingElement || document.body || (VDom.isHTML() ? document.documentElement : null);
    this.scale = Math.max(1, 1 / (window.devicePixelRatio || 1));
    if (element = this.current) { return element; }
    element = this.top;
    return this.current = element && (this.selectFirst(element) || element);
  },
  checkCurrent: function(el) {
    this.current === el || VDom.isVisibile(this.current) || (this.current = el);
  },
  getDimension: function(el, di, index) {
    return el !== this.top || (index && el) ? (el || this.top)[this.Properties[index + di]]
      : di ? window.innerHeight : window.innerWidth;
  },
  scrollDo: function(element, di, amount) {
    amount = (amount > 0 ? 1 : -1) * this.scale;
    return this.Core.performScroll(element, di, amount) && this.Core.performScroll(element, di, -amount);
  },
  selectFirst: function(element) {
    if (this.scrollDo(element, 1, 1) || this.scrollDo(element, 1, 0)) {
      return element;
    }
    VDom.prepareCrop();
    var children = [], rect, _ref = element.children, _len = _ref.length;
    while (0 < _len--) {
      element = _ref[_len];
      if (rect = VDom.getVisibleClientRect(element)) {
        children.push([(rect[2] - rect[0]) * (rect[3] - rect[1]), element]);
      }
    }
    children.sort(this.sortBy0);
    for (_len = children.length; 0 < _len--; ) {
      if (element = this.selectFirst(children[_len][1])) { return element; }
    }
    return null;
  },
  scrollIntoView: function(el) {
    var rect = el.getClientRects()[0], amount, height, width, hasY, ref, oldSmooth;
    if (!rect) { return; }
    this.getActivatedElement();
    height = window.innerHeight, width = window.innerWidth;
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
  shouldScroll: function(element, di) {
    var st = window.getComputedStyle(element);
    return (di ? st.overflowY : st.overflowX) !== "hidden" && VDom.isStyleVisible(st);
  },
  isScrollable: function(el, di) {
    return this.scrollDo(el, di, +!(di ? el.scrollTop : el.scrollLeft)) && this.shouldScroll(el, di);
  },
  sortBy0: function(a, b) {
    return a[0] - b[0];
  }
};

VScroller.Core.animate = function (a, d, e) {
  var amount = 0, calibration = 1.0, di = 0, duration = 0, element = null, //
  sign = 0, timestamp = -1.0, totalDelta = 0.0, totalElapsed = 0.0, //
  animate = function(newTimestamp) {
    var int1 = timestamp, elapsed, continuous, _this;
    timestamp = newTimestamp;
    if (int1 === -1) {
      requestAnimationFrame(animate);
      return;
    }
    elapsed = newTimestamp - int1;
    elapsed = elapsed > 0 ? elapsed : 17;
    int1 = (totalElapsed += elapsed);
    _this = VScroller.Core;
    if (continuous = VScroller.keyIsDown > 0) {
      if (int1 >= 75) {
        if (int1 > _this.minDelay) { --VScroller.keyIsDown; }
        int1 = calibration;
        if (_this.minCalibration <= int1 && int1 <= _this.maxCalibration) {
          int1 = _this.calibrationBoundary / amount / int1;
          calibration *= (int1 > 1.05) ? 1.05 : (int1 < 0.95) ? 0.95 : 1.0;
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
  this.animate = function(newAmount, newDi, newEl) {
    amount = Math.abs(newAmount); calibration = 1.0; di = newDi;
    duration = Math.max(100, 20 * Math.log(amount)); element = newEl;
    sign = newAmount < 0 ? -1 : 1;
    timestamp = -1.0; totalDelta = totalElapsed = 0.0;
    var keyboard = VSettings.cache.keyboard;
    this.maxInterval = Math.round(keyboard[1] / 16.67) + 4;
    this.minDelay = (((keyboard[0] - keyboard[1]) / 30) | 0) * 30;
    VScroller.keyIsDown = this.maxInterval;
    requestAnimationFrame(animate);
  };
  return this.animate(a, d, e);
};
