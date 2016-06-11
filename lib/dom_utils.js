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
  documentReady: function(callback) {
    if (document.readyState !== "loading") {
      this.documentReady = function(callback) { callback(); };
      callback();
      return;
    }
    var listeners = [callback], eventHandler = function() {
      var ref, i, len, func;
      removeEventListener("DOMContentLoaded", eventHandler, true);
      if (!DomUtils) { return; }
      DomUtils.documentReady = function(callback) { callback(); };
      ref = listeners;
      for (i = 0, len = ref.length; i < len; i++) { (func = ref[i])(); }
    };
    this.documentReady = function(callback) {
      listeners.push(callback);
    };
    addEventListener("DOMContentLoaded", eventHandler, true);
  },
  getSelectionText: function() {
    return (window.getSelection() + "").trim();
  },
  namespaceResolver: function(namespace) {
    return namespace === "xhtml" ? "http://www.w3.org/1999/xhtml" : null;
  },
  evaluateXPath: function(xpath, resultType) {
    return document.evaluate(xpath, document.webkitFullscreenElement
      || document.documentElement, this.namespaceResolver, resultType, null);
  },
  isStyleVisible: function(style) {
    return style.visibility === 'visible' && style.display !== "none";
  },
  prepareCrop: function() {
    var iw, ih, iws, ihs;
    this.prepareCrop = function() {
      var doc = document.documentElement;
      iw = doc.clientWidth; ih = doc.clientHeight;
      iws = iw - 6; ihs = ih - 8;
    };
    VRect.cropRectToVisible = function(left, top, right, bottom) {
      var cr;
      if (top > ihs || bottom < 3) {
        return null;
      }
      cr = [ //
        left   >  0 ? (left   | 0) :  0, //
        top    >  0 ? (top    | 0) :  0, //
        right  < iw ? (right  | 0) : iw, //
        bottom < ih ? (bottom | 0) : ih  //
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
        if (cr = VRect.cropRectToVisible(rect.left, rect.top, rect.right, rect.bottom)) {
          if (isVisible == null) {
            el_style || (el_style = window.getComputedStyle(element));
            isVisible = el_style.visibility === 'visible';
          }
          if (isVisible) { return cr; }
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
  getClientRectsForAreas: function(output, cr, map) {
    if (!map) { return; }
    var area, coords, diff, sqrt2 = Math.sqrt(2)
      , rect, x1, x2, y1, y2, _i, _len
      , areas = map.getElementsByTagName("area")
      , toInt = function(a) { return a | 0; };
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
        output.push([area, rect, 1, rect]);
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
  _elTypes: {__proto__: null, input: 4, textarea: 3, select: 2, embed: 1, object: 1},
  getEditableType: function(element) {
    var ty = this._elTypes[element.nodeName.toLowerCase()];
    return ty !== 4 ? (ty || (element.isContentEditable ? 3 : 0))
      : (element.type in this.uneditableInputs) ? 0 : 3;
  },
  isSelected: function(element) {
    var sel = window.getSelection(), node = sel.anchorNode;
    return element.isContentEditable ? node && node.contains(element)
      : sel.type === "Range" && sel.isCollapsed && element === node.childNodes[sel.anchorOffset];
  },
  getSelectionFocusElement: function() {
    var sel = window.getSelection(), node = sel.focusNode, i = sel.focusOffset;
    node && node === sel.anchorNode && i === sel.anchorOffset && (node = node.childNodes[i]);
    return node && node.nodeType !== node.ELEMENT_NODE ? node.parentNode : node || null;
  },
  simulateMouse: function(element, type, modifiers, related) {
    var mouseEvent = document.createEvent("MouseEvents");
    modifiers || (modifiers = this.defaultMouseKeys);
    mouseEvent.initMouseEvent(type, true, true, window, 1, 0, 0, 0, 0
      , modifiers.ctrlKey, modifiers.altKey, modifiers.shiftKey, modifiers.metaKey
      , 0, related || null);
    return element.dispatchEvent(mouseEvent);
  },
  _eventSequence: ["click", "mouseup", "mousedown"],
  defaultMouseKeys: { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
  lastHovered: null,
  simulateClick: function(element, modifiers) {
    var eventSequence = this._eventSequence, _i, last = this.lastHovered;
    if (element !== last) {
      last && this.simulateMouse(last, "mouseout", modifiers, element);
      this.lastHovered = element;
      this.simulateMouse(element, "mouseover", modifiers, last);
    }
    for (_i = eventSequence.length; 0 <= --_i; ) {
      this.simulateMouse(element, eventSequence[_i], modifiers);
    }
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
  setBoundary: function(style, r, is_abs) {
    if (is_abs || ((r[0] < 0 || r[1] < 0 || r[2] > window.innerWidth ||
        r[3] > window.innerHeight) && !document.webkitIsFullScreen)) {
      var x = window.scrollX, y = window.scrollY, d = document.documentElement;
      r[0] = Math.max(0, r[0] + x), r[1] = Math.max(0, r[1] + y);
      r[2] = Math.min(d.scrollWidth - 2, r[2] + x);
      r[3] = Math.min(d.scrollHeight - 2, r[3] + y);
      is_abs || (style.position = "absolute");
    }
    style.left = r[0] + "px", style.top = r[1] + "px";
    style.width = (r[2] - r[0]) + "px", style.height = (r[3] - r[1]) + "px";
    return true;
  },
  cropRectToVisible: null,
  SubtractSequence: function (rect1) { // rect1 - rect2
    var rect2 = this[1], a = this[0], x1, x2
      , y1 = Math.max(rect1[1], rect2[1]), y2 = Math.min(rect1[3], rect2[3]);
    if (y1 >= y2 || ((x1 = Math.max(rect1[0], rect2[0])) >= (x2 = Math.min(rect1[2], rect2[2])))) {
      a.push(rect1);
      return;
    }
    // 1 2 3
    // 4   5
    // 6 7 8
    var x0 = rect1[0], x3 = rect1[2], y0 = rect1[1], y3 = rect1[3];
    x0 < x1 && a.push([x0, y0, x1, y3]); // (1)4(6)
    y0 < y1 && a.push([x1, y0, x3, y1]); // (1)23
    y2 < y3 && a.push([x1, y2, x2, y3]); // (6)7
    x2 < x3 && a.push([x2, y1, x3, y3]); // (3)58
  }
};
