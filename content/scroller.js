"use strict";
var Scroller = {
  __proto__: null,
  Animate: null,
  Reset: null,
  calibrationBoundary: 150,
  handlerId: 0,
  maxCalibration: 1.6,
  minCalibration: 0.5,
  keyIsDown: 0,
  removeTimer: 0,
  checkVisibility: function(element) {
    if (!DomUtils.isVisibile(element)) {
      Scroller.activatedElement = element;
    }
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
  scroll: function(element, di, amount) {
    if (!amount) { return; }
    if (!Settings.values.smoothScroll) {
      this.performScroll(element, di, amount);
      this.checkVisibility(element);
      return;
    }
    this.keyIsDown = 1;
    this.removeTimer && clearTimeout(this.removeTimer);
    this.handlerId && handlerStack.remove(this.handlerId);
    this.handlerId = handlerStack.push({
      _this: this,
      keydown: this.keydown,
      keyup: this.stopHandler
    });
    this.Reset(amount, di, element);
    requestAnimationFrame(this.Animate);
  },
  keydown: function(event) {
    return event.repeat ? (this.keyIsDown = 2, false) : this.stopHandler();
  },
  stopHandler: function() {
    this.keyIsDown = 0;
    handlerStack.remove(this.handlerId);
    this.handlerId = 0;
    return true; // keyup should be handled by KeydownEvents
  },
  RemoveHandler: function() {
    var _this = Scroller.Core;
    _this.removeTimer = 0;
    _this.keyIsDown === 1 && _this.stopHandler();
  }
};

Scroller = {
  __proto__: null,
  Core: Scroller,
  activatedElement: null,  
  Properties: [{
    axisName: "scrollLeft",
    max: "scrollWidth",
    viewSize: "clientWidth"
  }, {
    axisName: "scrollTop",
    max: "scrollHeight",
    viewSize: "clientHeight"
  }],
  scrollBy: function(direction, amount, factor, zoomX) {
    var element, di;
    di = direction === "y" ? 1 : 0;
    element = this.findScrollable(this.getActivatedElement(), di, amount, factor);
    amount *= this.getDimension(element, di, factor);
    if (zoomX && element && di === 0 && element.clientWidth <= element.clientHeight * 2) {
      amount = Math.ceil(amount * 0.6);
    }
    this.Core.scroll(element, di, amount);
  },
  scrollTo: function(direction, factor) {
    var amount, element, di = direction === "y" ? 1 : 0;;
    factor >= 0 ? (amount = factor, factor = "") : (amount = 1);
    element = this.findScrollable(this.getActivatedElement(), di, amount, factor);
    amount = amount * this.getDimension(element, di, factor) - (element
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
    var element = this.activatedElement;
    if (element) {
      return element;
    }
    element = document.body;
    return element = this.activatedElement = element
      ? (this.selectFirst(element) || element) : null;
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
    amount = amount * this.getDimension(element, di, factor) > 0 ? 1 : -1;
    return this.Core.performScroll(element, di, amount) && this.Core.performScroll(element, di, -amount);
  },
  selectFirst: function(element) {
    if (this.scrollDo(element, 1, 1, "") || this.scrollDo(element, 1, -1, "")) {
      return element;
    }
    DomUtils.prepareCrop();
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
  animate = Scroller.Core.Animate = function(new_timestamp) {
    var int1 = timestamp, elapsed, _this = Scroller.Core;
    elapsed = (int1 !== -1) ? (new_timestamp - int1) : 0;
    if (elapsed === 0) {
      requestAnimationFrame(animate);
    } else {
      totalElapsed += elapsed;
    }
    timestamp = new_timestamp;
    if (_this.keyIsDown) {
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
        if (_this.keyIsDown === 1) {
          // this time should be large enough - as tested, 200 is not safe
          _this.removeTimer = setTimeout(_this.RemoveHandler, 330);
        }
      }
    }
  };
  Scroller.Core.Reset = function(new_amount, new_di, new_el) {
    amount = Math.abs(new_amount), calibration = 1.0, di = new_di;
    duration = Math.max(100, 20 * Math.log(amount)), element = new_el;
    sign = Scroller.getSign(new_amount);
    timestamp = -1, totalDelta = 0, totalElapsed = 0.0;
  };
})();
