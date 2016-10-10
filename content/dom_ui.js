"use strict";
VDom.UI = {
  box: null,
  styleIn: null,
  styleOut: null,
  root: null,
  focusedEl: null,
  flashLastingTime: 400,
  showing: true,
  addElement: function(element, showOnInit) {
    this.showing = showOnInit !== false;
    VPort.sendMessage({ handler: "initInnerCSS" }, this.InitInner);
    this.init && this.init(false);
    this.box.style.display = "none";
    this.root = this.box.createShadowRoot();
    this.root.appendChild(element);
    this.addElement = function(element) {
      this.root.appendChild(element);
      this.adjust();
    };
  },
  addElementList: function(els, id) {
    var parent, _i, _len;
    parent = VDom.createElement("div");
    parent.className = "R LS";
    parent.id = id;
    for (_i = 0, _len = els.length; _i < _len; _i++) {
      parent.appendChild(els[_i]);
    }
    this.addElement(parent);
    return parent;
  },
  adjust: function() {
    (!this.InitInner && document.webkitFullscreenElement || document.documentElement).appendChild(this.box);
  },
  init: function(showing) {
    this.box = VDom.createElement("vimium");
    showing !== false && this.adjust();
    this.init = null;
  },
  InitInner: function(innerCss) {
    var _this = VDom.UI;
    _this.InitInner = null;
    _this.styleIn = _this.createStyle(innerCss);
    _this.root.insertBefore(_this.styleIn, _this.root.firstElementChild);
    _this.showing && setTimeout(function() {
      _this.box.style.display = "";
      var el = _this.focusedEl; _this.focusedEl = null;
      el && setTimeout(function() { el.focus(); }, 17);
    }, 17);
    _this.adjust();
  },
  toggle: function(enabled) {
    if (!enabled) { this.box.remove(); return; }
    this.box.parentNode || this.adjust();
  },
  createStyle: function(text, doc) {
    var css = (doc || VDom).createElement("style");
    css.type = "text/css";
    css.textContent = text;
    return css;
  },
  insertInnerCSS: function(inner) {
    this.styleIn && (this.styleIn.textContent = inner.css);
  },
  insertCSS: function(outer) {
    var el = this.styleOut;
    if (!outer) { el && el.remove(); return; }
    el ? (el = this.styleOut = this.createStyle(outer)) : (el.textContent = outer);
    this.init && this.init();
    this.box.appendChild(el);
  },
  getSelection: function() {
    var sel = window.getSelection(), el, el2;
    if (sel.focusNode === document.documentElement && (el = VScroller.current)) {
      for (; el2 = el.parentNode; el = el2) {}
      if (el.getSelection) { sel = el.getSelection() || sel; }
    }
    return sel;
  },
  removeSelection: function(root) {
    var sel = (root || this.root).getSelection();
    if (sel.type !== "Range" || !sel.anchorNode) {
      return false;
    }
    sel.removeAllRanges();
    return true;
  },
  simulateSelect: function(element, flash, suppressRepeated) {
    element.focus();
    VDom.simulateClick(element);
    flash === true && this.flashVRect(this.getVRect(element));
    if (element !== VEventMode.lock()) { return; }
    var len;
    if ((len = element.value ? element.value.length : -1) && element.setSelectionRange) {
      if (element instanceof HTMLInputElement || element.clientHeight + 12 >= element.scrollHeight)
      try {
        if (0 == element.selectionEnd) {
          element.setSelectionRange(len, len);
        }
      } catch (e) {}
    }
    suppressRepeated === true && this.suppressTail(true);
  },
  focus: function(el) {
    if (this.box.style.display) {
      this.focusedEl = el;
    } else {
      el.focus();
    }
  },
  getVRect: function(clickEl) {
    var rect, bcr;
    VDom.prepareCrop();
    rect = VDom.getVisibleClientRect(clickEl);
    bcr = VRect.fromClientRect(clickEl.getBoundingClientRect());
    return rect && !VRect.isContaining(bcr, rect) ? rect : bcr;
  },
  flashVRect: function(rect, time) {
    var flashEl = VDom.createElement("div");
    flashEl.className = "R Flash";
    VRect.setBoundary(flashEl.style, rect);
    this.addElement(flashEl);
    return setTimeout(function() {
      flashEl.remove();
    }, time || this.flashLastingTime);
  },
  suppressTail: function(onlyRepeated) {
    var func, tick, timer;
    if (onlyRepeated) {
      func = function(event) {
        if (event.repeat) { return 2; }
        VHandler.remove(this);
        return 0;
      };
    } else {
      func = function() { tick = Date.now(); return 2; };
      tick = Date.now() + VSettings.cache.keyboard[0];
      timer = setInterval(function() {
        if (Date.now() - tick > 150) {
          clearInterval(timer);
          VHandler && VHandler.remove(func);
        }
      }, 75);
    }
    VHandler.push(func, func);
  },
  SuppressMost: function(event) {
    var key = event.keyCode;
    if (VKeyboard.isEscape(event)) {
      VHandler.remove(this);
    }
    return key > VKeyCodes.f1 + 9 && key <= VKeyCodes.f12 ? 1 : 2;
  }
};
