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
    performScroll: function(element, direction, amount) {
      var before, el = element;
      if (direction === "x") {
        if (el) {
          before = el.scrollLeft;
        } else {
          before = window.scrollX;
          el = document.documentElement;
        }
        if (el.clientWidth <= el.clientHeight * 2) {
          amount = Math.ceil(amount * 0.6);
        }
        if (element) {
          el.scrollLeft += amount;
          return el.scrollLeft !== before;
        }
        window.scrollBy(amount, 0);
        return window.scrollX !== before;
      } else if (el) {
        before = element.scrollTop;
        element.scrollTop += amount;
        return element.scrollTop !== before;
      } else {
        before = window.scrollY;
        window.scrollBy(0, amount);
        return window.scrollY !== before;
      }
    },
    Reset: null,
    scroll: function(element, direction, amount) {
      if (!amount) {
        return;
      }
      if (!settings.values.smoothScroll) {
        this.performScroll(element, direction, amount);
        this.checkVisibility(element);
        return;
      }
      if (this.isLastEventRepeat) {
        return;
      }
      this.activationTime = ++this.time;
      this.Reset(amount, direction, element);
      requestAnimationFrame(this.Animate);
    },
    wouldNotInitiateScroll: function() {
      return settings.values.smoothScroll && this.isLastEventRepeat;
    },
  },
  Properties: {
    x: {
      axisName: "scrollLeft",
      max: "scrollWidth",
      viewSize: "clientWidth"
    },
    y: {
      axisName: "scrollTop",
      max: "scrollHeight",
      viewSize: "clientHeight"
    }
  },
  init: function() {
    this.Core.init();
  },
  scrollBy: function(direction, amount, factor) {
    var element, elementAmount;
    element = this.getActivatedElement();
    if (!this.Core.wouldNotInitiateScroll()) {
      element = this.findScrollable(element, direction, amount, factor);
      elementAmount = amount * this.getDimension(element, direction, factor);
      this.Core.scroll(element, direction, elementAmount);
    }
  },
  scrollTo: function(direction, pos) {
    var amount, element;
    pos >= 0 ? (amount = pos, pos = "") : (amount = 1);
    element = this.findScrollable(this.getActivatedElement(), direction, amount, pos);
    amount = amount * this.getDimension(element, direction, pos) - (element
      ? element[this.Properties[direction].axisName]
      : direction === "x" ? window.scrollX : window.scrollY);
    this.Core.scroll(element, direction, amount);
  },
  findScrollable: function(element, direction, amount, factor) {
    while (element !== document.body && !(this.scrollDo(element, direction, amount, factor)
        && this.shouldScroll(element, direction))) {
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
  getDimension: function(el, direction, name) {
    return !name ? 1
      : (!el) ? document.documentElement[this.Properties[direction][name]]
      : (name !== "viewSize" || el !== document.body) ? el[this.Properties[direction][name]]
      : (direction === "x") ? window.innerWidth : window.innerHeight;
  },
  getSign: function(val) {
    return val === 0 ? 0 : val < 0 ? -1 : 1;
  },
  scrollDo: function(element, direction, amount, factor) {
    var delta = amount * this.getDimension(element, direction, factor) > 0 ? 1 : -1;
    return this.Core.performScroll(element, direction, delta) && this.Core.performScroll(element, direction, -delta);
  },
  selectFirst: function(element) {
    if (this.scrollDo(element, "y", 1, 1) || this.scrollDo(element, "y", -1, 1)) {
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
  shouldScroll: function(element, direction) {
    var computedStyle = window.getComputedStyle(element), _ref;
    return (computedStyle.getPropertyValue("display") === "none") //
      || (computedStyle.getPropertyValue("overflow-" + direction) === "hidden") //
      || ((_ref = computedStyle.getPropertyValue("visibility")) === "hidden" || _ref === "collapse") //
      ? false : true;
  },
  sortBy0: function(a, b) {
    return a[0] - b[0];
  }
};

(function () {
  var amount = 0, calibration = 1.0, direction = "", duration = 0, element = null, //
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
    if (int1 && _this.performScroll(element, direction, sign * int1)) {
      totalDelta += int1;
      requestAnimationFrame(animate);
    } else if (element) {
      _this.checkVisibility(element);
      if (elapsed !== 0) {
        element = null;
      }
    }
  };
  Scroller.Core.Reset = function(new_amount, new_dire, new_el) {
    amount = Math.abs(new_amount), calibration = 1.0, direction = new_dire;
    duration = Math.max(100, 20 * Math.log(amount)), element = new_el;
    sign = Scroller.getSign(new_amount);
    timestamp = -1, totalDelta = 0, totalElapsed = 0.0;
  };
  Scroller.Core.Animate = animate;
})();
