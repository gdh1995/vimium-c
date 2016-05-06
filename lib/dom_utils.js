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
      DomUtils.documentReady = function(callback) { callback(); };
      removeEventListener("DOMContentLoaded", eventHandler, true);
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
  getClientRectsForAreas: function(output, cr, map, areas) {
    if (!map) { return; }
    areas = areas || map.getElementsByTagName("area");
    var area, coords, diff, sqrt2 = Math.sqrt(2)
      , rect, x1, x2, y1, y2, _i, _len
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
    return node && node.nodeType === node.ELEMENT_NODE ? node.parentNode : node || null;
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
  SubtractSequence: function (h){
var s=this[1],u=this[0],p=Math.max(h[0],s[0]),a=Math.min(h[2],s[2]),t=Math.max(h[1],s[1]),i=Math.min(h[3],s[3]);
if(t>=i||p>=a){u.push(h);return}var n=h[0],m=h[2],r=h[1],M=h[3];t>r?M>i?p>n?(u.push([n,r,p,t],[p,r,a,t],[n,t,p,i]),
m>a?u.push([a,r,m,t],[a,t,m,i],[n,i,p,M],[p,i,a,M],[a,i,m,M]):u.push([n,i,p,M],[p,i,a,M]))
:m>a?u.push([p,r,a,t],[a,r,m,t],[a,t,m,i],[p,i,a,M],[a,i,m,M]):u.push([p,r,a,t],[p,i,a,M])
:(p>n?u.push([n,r,p,t],[p,r,a,t],[n,t,p,i]):u.push([p,r,a,t]),m>a&&u.push([a,r,m,t],[a,t,m,i]))
:M>i?p>n?m>a?u.push([n,t,p,i],[a,t,m,i],[n,i,p,M],[p,i,a,M],[a,i,m,M]):u.push([n,t,p,i],[n,i,p,M],[p,i,a,M])
:m>a?u.push([a,t,m,i],[p,i,a,M],[a,i,m,M]):u.push([p,i,a,M]):(p>n&&u.push([n,t,p,i]),m>a&&u.push([a,t,m,i]))
  }
};
