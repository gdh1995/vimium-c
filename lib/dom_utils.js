"use strict";
var DomUtils = {
  UI: null,
  createElement: function(tagName) {
    var node = document.createElement(tagName), valid = node instanceof HTMLElement;
    this.createElement = valid
      ? document.createElement.bind(document)
      : document.createElementNS.bind(document, "http://www.w3.org/1999/xhtml");
    return valid ? node : this.createElement(tagName);
  },
  isSandboxed: function() {
    return window.onunload == null;
  },
  documentReady: function(callback) {
    if (document.readyState !== "loading") {
      this.documentReady = function(callback) { callback(); };
      callback();
      return;
    }
    var listeners = [callback], eventHandler = function() {
      var ref, i, len, func;
      DomUtils.documentReady = function(callback) { callback(); };
      window.removeEventListener("DOMContentLoaded", eventHandler, true);
      ref = listeners;
      for (i = 0, len = ref.length; i < len; i++) { (func = ref[i])(); }
    };
    this.documentReady = function(callback) {
      listeners.push(callback);
    };
    window.addEventListener("DOMContentLoaded", eventHandler, true);
  },
  getSelectionText: function() {
    var sel = window.getSelection();
    return sel.type === "Range" ? sel.toString().trim() : "";
  },
  namespaceResolver: function(namespace) {
    return (namespace === "xhtml") ? "http://www.w3.org/1999/xhtml" : null;
  },
  evaluateXPath: function(xpath, resultType) {
    return document.evaluate(xpath, document.webkitIsFullScreen ? document.webkitFullscreenElement
      : document.documentElement, this.namespaceResolver, resultType, null);
  },
  isStyleVisible: function(style) {
    return style.visibility === 'visible' && style.display !== "none";
  },
  prepareCrop: function() {
    var iw, ih, iws, ihs;
    this.prepareCrop = function() {
      iw = window.innerWidth; ih = window.innerHeight;
      iws = iw - 6; ihs = ih - 8;
    };
    VRect.cropRectToVisible = function(left, top, right, bottom) {
      var cr;
      if (top > ihs || bottom < 3) {
        return null;
      }
      cr = [ //
        left   >=  0 ? (left   | 0) :  0, //
        top    >=  0 ? (top    | 0) :  0, //
        right  <= iw ? (right  | 0) : iw, //
        bottom <= ih ? (bottom | 0) : ih  //
      ];
      return (cr[2] - cr[0] >= 3 && cr[3] - cr[1] >= 3) ? cr : null;
    };
    this.prepareCrop();
  },
  getVisibleClientRect: function(element, el_style) {
    var cr, rect, arr, style, _i, _j, _len, _len1, _ref, isVisible, notInline, str;
    arr = element.getClientRects();
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      rect = arr[_i];
      if (rect.width > 0 && rect.height > 0) {
        if (isVisible == null) {
          el_style || (el_style = window.getComputedStyle(element));
          isVisible = el_style.visibility === 'visible';
        }
        if (isVisible) {
          cr = VRect.cropRectToVisible(rect.left, rect.top, rect.right, rect.bottom);
          if (cr) { return cr; }
        }
        continue;
      }
      if (_ref) { continue; }
      _ref = element.children;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        style = window.getComputedStyle(_ref[_j]);
        if (style.float !== 'none' ||
            (str = style.position) === 'absolute' || str === 'fixed') {}
        else if (rect.height !== 0) {
          if (notInline == null) {
            el_style || (el_style = window.getComputedStyle(element));
            notInline = el_style.fontSize !== "0px" || !el_style.display.startsWith("inline");
          }
          if (notInline || !style.display.startsWith("inline")) { continue; }
        } else { continue; }
        if (cr = this.getVisibleClientRect(_ref[_j], style)) { return cr; }
      }
      style = null;
    }
    return null;
  },
  getClientRectsForAreas: function(output, cr, map, areas) {
    if (!map) { return; }
    areas = areas || map.getElementsByTagName("area");
    var area, coords, diff, sqrt2 = Math.sqrt(2)
      , rect, x1, x2, y1, y2, _i, _len
      , toInt = function(a) { return ~~a; };
    for (_i = 0, _len = areas.length; _i < _len; _i++) {
      area = areas[_i];
      coords = area.coords.split(",").map(toInt);
      if (!(coords[2] > 0)) { continue; }
      switch (area.shape.toLowerCase()) {
      case "circle": case "circ":
        y1 = coords[0]; y2 = coords[1]; diff = coords[2] / sqrt2;
        x1 = y1 - diff; x2 = y1 + diff; y1 = y2 - diff; y2 = y2 + diff;
        break;
      case "default":
        x1 = 0; y1 = 0; x2 = cr.width; y2 = cr.height;
        break;
      case "rect": case "rectangle": default:
        x1 = coords[0]; y1 = coords[1]; x2 = coords[2]; y2 = coords[3];
        break;
      }
      rect = VRect.cropRectToVisible(x1 + cr.left, y1 + cr.top //
        , x2 + cr.left, y2 + cr.top);
      if (rect) {
        output.push([area, rect, true]);
      }
    }
  },
  isVisibile: function(element) {
    var rect = element.getBoundingClientRect();
    return !(rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0
      || rect.left >= window.innerWidth || rect.height < 0.5 || rect.width < 0.5);
  },
  uneditableInputs: { __proto__: null,
    button: 1, checkbox: 1, color: 1, file: 1, hidden: 1, //
    image: 1, radio: 1, range: 1, reset: 1, submit: 1
  },
  _elTypes: {input: 4, textarea: 3, select: 2, embed: 1, object: 1},
  getEditableType: function(element) {
    var ty = this._elTypes[element.nodeName.toLowerCase()];
    return ty !== 4 ? (ty || (element.isContentEditable ? 3 : 0))
      : (element.type in this.uneditableInputs) ? 0 : 3;
  },
  simulateSelect: function(element) {
    if (element !== document.activeElement) {
      element.focus();
      var len = element.value ? +element.value.length : -1;
      if (len > 0) {
        try {
          if (element.setSelectionRange && !element.selectionEnd) {
            element.setSelectionRange(len, len);
          }
        } catch (element) {}
      }
    }
    this.simulateClick(element);
  },
  simulateMouse: function(element, type, related) {
    var mouseEvent = document.createEvent("MouseEvents");
    mouseEvent.initMouseEvent(type, true, true, window, 1, 0, 0, 0, 0
      , false, false, false, false, 0, related || null);
    element.dispatchEvent(mouseEvent);
  },
  _eventSequence: ["click", "mouseup", "mousedown", "mouseover"],
  defaultMouseKeys: { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  simulateClick: function(element, modifiers) {
    var eventSequence = this._eventSequence, mouseEvent, _i;
    modifiers || (modifiers = this.defaultMouseKeys);
    for (_i = eventSequence.length; 0 <= --_i; ) {
      mouseEvent = document.createEvent("MouseEvents");
      mouseEvent.initMouseEvent(eventSequence[_i], true, true, window, 1, 0, 0, 0, 0 //
        , modifiers.ctrlKey, modifiers.altKey, modifiers.shiftKey, modifiers.metaKey, 0, null);
      element.dispatchEvent(mouseEvent);
    }
  },
  simulateBackspace: function(element) {
    var start = element.selectionStart, end = element.selectionEnd, event;
    if (!element.setRangeText) { return; }
    if (start >= end) {
      if (start <= 0 || !element.setSelectionRange) { return; }
      element.setSelectionRange(start - 1, start);
    }
    element.setRangeText("");
    event = document.createEvent("HTMLEvents");
    event.initEvent("input", true, false);
    element.dispatchEvent(event);
  },
  SuppressPropagation: function(event) {
    event.stopImmediatePropagation();
  },
  suppressEvent: function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},

/* VRect: int [4] := [left, top, right, bottom] */
VRect = {
  create: function(x1, y1, x2, y2) {
    return [x1, y1, x2, y2];
  },
  isContaining: function(a, b) {
    return a[0] <= b[0] && a[1] <= b[1] && a[2] >= b[2] && a[3] >= b[3];
  },
  fromClientRect: function(rect) {
    return [rect.left | 0, rect.top | 0, rect.right | 0, rect.bottom | 0];
  },
  cropRectToVisible: null,
  SubtractSequence: function(rect2, rect1) { // rect1 - rect2
    var x1 = Math.max(rect1[0], rect2[0]), x2 = Math.min(rect1[2], rect2[2]) //
      , y1 = Math.max(rect1[1], rect2[1]), y2 = Math.min(rect1[3], rect2[3]);
    if (!(x2 > x1 && y2 > y1)) {
      this.push(rect1);
      return;
    }
    // 1 2 4
    // 3   5
    // 6 7 8
    var x0 = rect1[0], x3 = rect1[2], y0 = rect1[1], y3 = rect1[3];
    if (y0 < y1) {
      if (y2 < y3) {
        if (x0 < x1) {
          if (x2 < x3) {
            this.push([x0, y0, x1, y1], [x1, y0, x2, y1], [x0, y1, x1, y2], [x2, y0, x3, y1], [x2, y1, x3, y2], [x0, y2, x1, y3], [x1, y2, x2, y3], [x2, y2, x3, y3]); // 1 2 3 4 5 6 7 8
          } else {
            this.push([x0, y0, x1, y1], [x1, y0, x2, y1], [x0, y1, x1, y2], [x0, y2, x1, y3], [x1, y2, x2, y3]); // 1 2 3 6 7
          }
        } else if (x2 < x3) {
          this.push([x1, y0, x2, y1], [x2, y0, x3, y1], [x2, y1, x3, y2], [x1, y2, x2, y3], [x2, y2, x3, y3]); // 2 4 5 7 8
        } else {
          this.push([x1, y0, x2, y1], [x1, y2, x2, y3]); // 2 7
        }
      } else if (x0 < x1) {
        if (x2 < x3) {
          this.push([x0, y0, x1, y1], [x1, y0, x2, y1], [x0, y1, x1, y2], [x2, y0, x3, y1], [x2, y1, x3, y2]); // 1 2 3 4 5
        } else {
          this.push([x0, y0, x1, y1], [x1, y0, x2, y1], [x0, y1, x1, y2]); // 1 2 3
        }
      } else if (x2 < x3) {
        this.push([x1, y0, x2, y1], [x2, y0, x3, y1], [x2, y1, x3, y2]); // 2 4 5
      } else {
        this.push([x1, y0, x2, y1]); // 2
      }
    } else if (y2 < y3) {
      if (x0 < x1) {
        if (x2 < x3) {
          this.push([x0, y1, x1, y2], [x2, y1, x3, y2], [x0, y2, x1, y3], [x1, y2, x2, y3], [x2, y2, x3, y3]); // 3 5 6 7 8
        } else {
          this.push([x0, y1, x1, y2], [x0, y2, x1, y3], [x1, y2, x2, y3]); // 3 6 7
        }
      } else if (x2 < x3) {
        this.push([x2, y1, x3, y2], [x1, y2, x2, y3], [x2, y2, x3, y3]); // 5 7 8
      } else {
        this.push([x1, y2, x2, y3]); // 7
      }
    } else if (x0 < x1) {
      if (x2 < x3) {
        this.push([x0, y1, x1, y2], [x2, y1, x3, y2]); // 3 5
      } else {
        this.push([x0, y1, x1, y2]); // 3
      }
    } else if (x2 < x3) {
      this.push([x2, y1, x3, y2]); // 5
    }
  }
};
