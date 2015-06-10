"use strict";
var DomUtils = {
  isSandboxed: function() {
    return window.onunload == null;
  },
  DocumentReady: (document.readyState !== "loading" ? function(callback) {
    callback();
  } : (function() {
    var listeners, eventHandler = function() {
      var ref, i, len, func;
      DomUtils.DocumentReady = function(callback) {
        callback();
      };
      ref = listeners;
      window.removeEventListener("DOMContentLoaded", eventHandler);
      listeners = eventHandler = null;
      for (i = 0, len = ref.length; i < len; i++) {
        (func = ref[i])();
      }
    };
    return function(callback, unshift) {
      if (listeners) {
        if (unshift) {
          listeners.unshift(callback);
        } else {
          listeners.push(callback);
        }
      } else {
        window.addEventListener("DOMContentLoaded", eventHandler);
        listeners = [callback];
      }
    };
  })()),
  addElementList: function(els, overlayOptions) {
    var parent, _i, _len;
    parent = document.createElement("div");
    if (overlayOptions.className != null) {
      parent.className = overlayOptions.className;
    }
    if (overlayOptions.id != null) {
      parent.id = overlayOptions.id;
    }
    for (_i = 0, _len = els.length; _i < _len; _i++) {
      parent.appendChild(els[_i]);
    }
    document.documentElement.appendChild(parent);
    return parent;
  },
  removeNode: function(el) {
    el.parentNode.removeChild(el);
  },
  makeXPath: function(elementArray) {
    for (var _i = 0, _len = elementArray.length * 2, element, xpath = new Array(_len); _i < _len; _i += 2) {
      element = elementArray[_i / 2];
      xpath[_i] = ".//" + element, xpath[_i + 1] = ".//xhtml:" + element;
    }
    return xpath.join(" | ");
  },
  namespaceResolver: function(namespace) {
    return (namespace === "xhtml") ? "http://www.w3.org/1999/xhtml" : null;
  },
  evaluateXPath: function(xpath, resultType) {
    return document.evaluate(xpath, document.webkitIsFullScreen ? document.webkitFullscreenElement
      : document.documentElement, this.namespaceResolver, resultType, null);
  },
  isNotInlineZeroHeight: function(element) {
    var style, isInlineZeroFontSize;
    style = window.getComputedStyle(element);
    return style.getPropertyValue("font-size") !== "0px"
      || !style.getPropertyValue("display").startsWith("inline");
  },
  isStyleVisible: function(element) {
    var style = window.getComputedStyle(element);
    return style.getPropertyValue('visibility') === 'visible';
  },
  getVisibleClientRect: function(element) {
    var cr, rect0, arr, style, _i, _j, _len, _len1, _ref, isVisible, notInline;
    arr = element.getClientRects();
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      rect0 = arr[_i];
      if (rect0.width > 0 && rect0.height > 0) {
        isVisible != null || (isVisible = this.isStyleVisible(element));
        if (isVisible) {
          cr = VRect.cropRectToVisible(rect0.left, rect0.top, rect0.right, rect0.bottom);
          if (cr) {
            return cr;
          }
        }
        continue;
      }
      _ref = element.children;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        style = window.getComputedStyle(_ref[_j]);
        if (style.getPropertyValue('float') !== 'none' || style.getPropertyValue('position') === 'absolute') {
        } else if (rect0.height !== 0) {
          continue;
        } else {
          notInline != null || (notInline = this.isNotInlineZeroHeight(element));
          if (notInline || !style.getPropertyValue("display").startsWith("inline")) {
            continue;
          }
        }
        if (cr = this.getVisibleClientRect(_ref[_j])) {
          return cr;
        }
      }
      style = null;
      break;
    }
    isVisible != null || (isVisible = this.isStyleVisible(element));
    if (isVisible) {
      for (; _i < _len; _i++) {
        rect0 = arr[_i];
        cr = VRect.cropRectToVisible(rect0.left, rect0.top, rect0.right, rect0.bottom);
        if (cr) {
          return cr;
        }
      }
    }
    return null;
  },
  getClientRectsForAreas: function(output, cr, map, areas) {
    if (!map) {
      return;
    }
    areas = areas || map.getElementsByTagName("area");
    var area, coords, diff, sqrt2 = Math.sqrt(2), rect, x1, x2, y1, y2, _i, _len;
    for (_i = 0, _len = areas.length; _i < _len; _i++) {
      area = areas[_i];
      coords = area.coords.split(",").map(parseInt);
      if (isNaN(coords[1])) {
        continue;
      }
      switch (area.shape.toLowerCase()) {
      case "circle": case "circ":
        y1 = coords[0], y2 = coords[1], diff = coords[2] / sqrt2;
        x1 = y1 - diff, x2 = y1 + diff, y1 = y2 - diff;
        y2 = y2 + diff;
        break;
      case "default":
        x1 = 0, y1 = 0, x2 = cr.width, y2 = cr.height;
        break;
      case "rect": case "rectangle": default:
        x1 = coords[0], y1 = coords[1], x2 = coords[2], y2 = coords[3];
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
  unselectableInputs: {
    button: true, checkbox: true, color: true, file: true, hidden: true, //
    image: true, radio: true, reset: true, submit: true
  },
  isSelectable: function(element, _name) {
    return element.isContentEditable || (_name = element.nodeName.toLowerCase()) === "textarea" || //
      (_name === "input" && !(element.type in this.unselectableInputs));
  },
  _inputsNoFocus: {
    button: true, checkbox: true, file: true, hidden: true, //
    image: true, radio: true, reset: true, submit: true
  },
  _elTypes: {input: 3, textarea: 2, select: 2, embed: 1, object: 1},
  getEditableType: function(element) {
    var ty = this._elTypes[element.nodeName.toLowerCase()];
    return ty !== 3 ? (ty || (element.isContentEditable ? 3 : 0))
      : (element.type in this._inputsNoFocus) ? 0 : 3;
  },
  isDOMDescendant: function(parent, child) {
    for (; child != null; child = child.parentNode) {
      if (child === parent) {
        return true;
      }
    }
    return false;
  },
  canTakeInput: function(ancestor) {
    var el = document.activeElement;
    return el && this.isSelectable(el) && this.isDOMDescendant(ancestor, el);
  },
  isSelected: function(element) {
    var selection = document.getSelection(), node;
    if (element.isContentEditable) {
      if (node = selection.anchorNode) {
        return this.isDOMDescendant(element, node);
      }
    } else if (selection.type === "Range" && selection.isCollapsed) {
      node = selection.anchorNode.childNodes[selection.anchorOffset];
      return element === node;
    }
    return false;
  },
  simulateSelect: function(element) {
    if (element === document.activeElement && this.getEditableType(element) >= 2) {
      return;
    }
    element.scrollIntoViewIfNeeded();
    element.focus();
    var len = element.value ? +element.value.length : -1;
    if (len >= 0) {
      try {
        if (element.setSelectionRange && !element.selectionEnd) {
          element.setSelectionRange(len, len);
        }
      } catch (element) {
      }
    }
  },
  _eventSequence: ["click", "mouseup", "mousedown", "mouseover"],
  simulateClick: function(element, modifiers) {
    var eventSequence = this._eventSequence, mouseEvent, _i, _len;
    for (_i = eventSequence.length; 0 <= --_i; ) {
      mouseEvent = document.createEvent("MouseEvents");
      mouseEvent.initMouseEvent(eventSequence[_i], true, true, window, 1, 0, 0, 0, 0 //
        , modifiers.ctrlKey, modifiers.altKey, modifiers.shiftKey, modifiers.metaKey, 0, null);
      element.dispatchEvent(mouseEvent);
    }
  },
  SimulateHover: function(element) {
    var mouseEvent = document.createEvent("MouseEvents");
    mouseEvent.initMouseEvent("mouseover", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    element.dispatchEvent(mouseEvent);
  },
  simulateBackspace: function(element) {
    var start = element.selectionStart, end = element.selectionEnd, event;
    if (!element.setRangeText) {
      return;
    }
    if (start >= end && element.setSelectionRange) {
      element.setSelectionRange(start - 1, start);
    }
    element.setRangeText("");
    event = document.createEvent("HTMLEvents");
    event.initEvent("input", true, false);
    element.dispatchEvent(event);
  },
  flashLastingTime: 400,
  flashVRect: function(rect, time) {
    var flashEl = document.createElement("div");
    flashEl.className = "vimB vimR vimFlash";
    flashEl.style.left = rect[0] + window.scrollX + "px";
    flashEl.style.top = rect[1] + window.scrollY + "px";
    flashEl.style.width = (rect[2] - rect[0]) + "px";
    flashEl.style.height = (rect[3] - rect[1]) + "px";
    document.documentElement.appendChild(flashEl);
    return setTimeout(this.removeNode, time || this.flashLastingTime, flashEl);
  },
  suppressEvent: function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
},
/* VRect: int[4], [left, top, right, bottom] */
VRect = {
  create: function(x1, y1, x2, y2) {
    return [x1, y1, x2, y2];
  },
  fromClientRect: function(rect) {
    return [rect.left | 0, rect.top | 0, rect.right | 0, rect.bottom | 0];
  },
  cropRectToVisible: function(left, top, right, bottom) {
    var iw = window.innerWidth, ih, cr;
    if (left > iw - 4 || top > (ih = window.innerHeight) - 4) {
      return null;
    }
    cr = [ //
      left   >=  0 ? (left   | 0) :  0, //
      top    >=  0 ? (top    | 0) :  0, //
      right  <= iw ? (right  | 0) : iw, //
      bottom <= ih ? (bottom | 0) : ih  //
    ];
    return (cr[2] - cr[0] >= 3 && cr[3] - cr[1] >= 3) ? cr : null;
  },
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
DomUtils.__proto__ = null;
VRect.__proto__ = null;
