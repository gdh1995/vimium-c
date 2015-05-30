"use strict";
var Scroller = {
  Core: {
    activatedElement: null,
    activationTime: 0,
    calibrationBoundary: 150,
    isLastEventRepeat: false,
    keyIsDown: false,
    maxCalibration: 1.6,
    minCalibration: 0.5,
    time: 0,
    Animate: null,
    checkVisibility: function(element) {
      if (!DomUtils.isVisibile(element)) {
        this.activatedElement = element;
      }
    },
    init: function() {
      handlerStack.push({
        _this: this,
        DOMActivate: function(event) {
          this.activatedElement = event.target;
          return true;
        },
        keydown: function(event) {
          this.keyIsDown = true;
          this.isLastEventRepeat = event.repeat;
          if (!event.repeat) {
            this.time += 1;
          }
          return true;
        },
        keyup: function() {
          this.keyIsDown = false;
          this.time += 1;
          return true;
        }
      });
    },
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
    Reset: null,
    scroll: function(element, di, amount) {
      if (!amount) {
        return;
      }
      if (!settings.values.smoothScroll) {
        this.performScroll(element, di, amount);
        this.checkVisibility(element);
        return;
      }
      if (this.isLastEventRepeat) {
        return;
      }
      this.activationTime = ++this.time;
      this.Reset(amount, di, element);
      requestAnimationFrame(this.Animate);
    },
    wouldNotInitiateScroll: function() {
      return settings.values.smoothScroll && this.isLastEventRepeat;
    },
  },
  Properties: [{
    axisName: "scrollLeft",
    max: "scrollWidth",
    viewSize: "clientWidth"
  }, {
    axisName: "scrollTop",
    max: "scrollHeight",
    viewSize: "clientHeight"
  }],
  init: function() {
    this.Core.init();
  },
  scrollBy: function(direction, amount, factor, zoomX) {
    var element, di;
    if (this.Core.wouldNotInitiateScroll()) { return; }
    di = direction === "y" ? 1 : 0;
    element = this.findScrollable(this.getActivatedElement(), di, amount, factor);
    amount *= this.getDimension(element, di, factor);
    this.Core.scroll(element, di, amount);
  },
  scrollTo: function(direction, pos) {
    var amount, element, di = direction === "y" ? 1 : 0;;
    pos >= 0 ? (amount = pos, pos = "") : (amount = 1);
    element = this.findScrollable(this.getActivatedElement(), di, amount, pos);
    amount = amount * this.getDimension(element, di, pos) - (element
      ? element[this.Properties[di].axisName] : di ? window.scrollY : window.scrollX);
    this.Core.scroll(element, di, amount);
  },
  findScrollable: function(element, di, amount, factor) {
    while (element !== document.body && !(this.scrollDo(element, di, amount, factor)
        && this.shouldScroll(element, di))) {
      element = element.parentElement || document.body;
    }
    return element;
  },
  getActivatedElement: function() {
    var element = this.Core.activatedElement;
    if (element) {
      return element;
    }
    return element = this.Core.activatedElement =
      document.body ? (this.selectFirst(document.body) || document.body) : null;
  },
  getDimension: function(el, di, name) {
    return !name ? 1
      : (!el) ? document.documentElement[this.Properties[di][name]]
      : (name !== "viewSize" || el !== document.body) ? el[this.Properties[di][name]]
      : di ? window.innerHeight : window.innerWidth;
  },
  getSign: function(val) {
    return val === 0 ? 0 : val < 0 ? -1 : 1;
  },
  scrollDo: function(element, di, amount, factor) {
    var delta = amount * this.getDimension(element, di, factor) > 0 ? 1 : -1;
    return this.Core.performScroll(element, di, delta) && this.Core.performScroll(element, di, -delta);
  },
  selectFirst: function(element) {
    if (this.scrollDo(element, 1, 1, 1) || this.scrollDo(element, 1, -1, 1)) {
      return element;
    }
    var children = [], rect, _ref = element.children, _len = _ref.length;
    while (0 <= --_len) {
      element = _ref[_len];
      if (rect = DomUtils.getVisibleClientRect(element)) {
        children.push([(rect[2] - rect[0]) * (rect[3] - rect[1]), element]);
      }
    }
    if (_len = children.length) {
      children = children.sort(this.sortBy0);
      while (0 <= --_len) {
        if (element = this.selectFirst(children[_len][1])) {
          return element;
        }
      }
    }
    return null;
  },
  shouldScroll: function(element, di) {
    var computedStyle = window.getComputedStyle(element), _ref;
    return (computedStyle.getPropertyValue("display") === "none") //
      || (computedStyle.getPropertyValue(di ? "overflow-y" : "overflow-x") === "hidden") //
      || ((_ref = computedStyle.getPropertyValue("visibility")) === "hidden" || _ref === "collapse") //
      ? false : true;
  },
  sortBy0: function(a, b) {
    return a[0] - b[0];
  }
};

(function () {
  var amount = 0, calibration = 1.0, di = 0, duration = 0, element = null, //
  sign = 0, timestamp = -1, totalDelta = 0, totalElapsed = 0.0, //
  animate = function(new_timestamp) {
    var int1 = timestamp, elapsed, _this = Scroller.Core;
    elapsed = (int1 !== -1) ? (new_timestamp - int1) : 0;
    if (elapsed === 0) {
      requestAnimationFrame(animate);
    } else {
      totalElapsed += elapsed;
    }
    timestamp = new_timestamp;
    if (_this.time === _this.activationTime && _this.keyIsDown) {
      int1 = calibration;
      if (75 <= totalElapsed && (_this.minCalibration <= int1 && int1 <= _this.maxCalibration)) {
        int1 = _this.calibrationBoundary / amount / int1;
        calibration *= (int1 > 1.05) ? 1.05 : (int1 < 0.95) ? 0.95 : 1.0;
      }
      int1 = Math.ceil(amount * (elapsed / duration) * calibration);
    } else {
      int1 = Math.ceil(amount * (elapsed / duration) * calibration);
      int1 = Math.max(0, Math.min(int1, amount - totalDelta));
    }
    if (int1 && _this.performScroll(element, di, sign * int1)) {
      totalDelta += int1;
      requestAnimationFrame(animate);
    } else if (element) {
      _this.checkVisibility(element);
      if (elapsed !== 0) {
        element = null;
      }
    }
  };
  Scroller.Core.Reset = function(new_amount, new_di, new_el) {
    amount = Math.abs(new_amount), calibration = 1.0, di = new_di;
    duration = Math.max(100, 20 * Math.log(amount)), element = new_el;
    sign = Scroller.getSign(new_amount);
    timestamp = -1, totalDelta = 0, totalElapsed = 0.0;
  };
  Scroller.Core.Animate = animate;
})();
