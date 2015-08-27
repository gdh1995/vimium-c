DomUtils.UI = {
  cssBase: null,
  cssInner: null,
  cssOuter: null,
  container: null,
  root: null,
  flashLastingTime: 400,
  fullScreen: null,
  addElement: function(element) {
    this.init();
    this.addElement(element);
  },
  addElementList: function(els, overlayOptions) {
    var parent, _i, _len;
    parent = DomUtils.createElement("div");
    if (overlayOptions.className != null) {
      parent.className = overlayOptions.className;
    }
    if (overlayOptions.id != null) {
      parent.id = overlayOptions.id;
    }
    for (_i = 0, _len = els.length; _i < _len; _i++) {
      parent.appendChild(els[_i]);
    }
    this.addElement(parent);
    return parent;
  },
  adjust: function() {
    var parent = document.webkitFullscreenElement || document.documentElement;
    if (this.fullScreen === parent) { return; }
    this.fullScreen = parent;
    parent.appendChild(this.container);
    this.container.style = "";
  },
  init: function() {
    this.init = null;
    this.container = DomUtils.createElement("div");
    this.root = this.container.createShadowRoot();
    this.cssBase = this.appendCSS(this.root, "");
    MainPort.sendMessage({
      handler: "initCSSBase"
    }, function(css) {
      var _this = DomUtils.UI;
      _this.cssBase.innerHTML = css;
      _this.adjust();
    });
    this.adjust = this.adjust.bind(this);
    document.addEventListener("webkitfullscreenchange", this.adjust);
    this.addElement = function(element) { this.root.appendChild(element); };
  },
  appendCSS: function(parent, text) {
    var css = DomUtils.createElement("style");
    css.type = "text/css";
    css.innerHTML = text;
    parent.appendChild(css);
    return css;
  },
  insertCSS: function(inner, outer) {
    var css = this.cssInner;
    if (css) {
      this.css2.innerHTML = inner;
      if (outer) {
        css.innerHTML = outer;
      } else {
        css.remove();
        this.css = null;
      }
      return;
    }
    if (this.init) { this.init(); }
    // this is called only when document.ready
    if (this.cssInner) {
      if (inner) {
        this.cssInner.innerHTML = inner;
      } else {
        this.cssInner.remove();
        this.cssInner = null;
      }
    } else if (inner) {
      this.cssInner = this.appendCSS(this.root, inner);
    }
    if (this.cssOuter) {
      if (outer) {
        this.cssOuter.outerHTML = outer;
      } else {
        this.cssOuter.remove();
        this.cssOuter = null;
      }
    } else if (outer) {
      this.cssOuter = this.appendCSS(this.container, outer);
    }
  },
  flashOutline: function(clickEl) {
    var temp, rect, parEl, bcr;
    DomUtils.prepareCrop();
    if (clickEl.classList.contains("OIUrl") && Vomnibar.vomnibarUI.box
      && DomUtils.isDOMDescendant(Vomnibar.vomnibarUI.box, clickEl)) {
      rect = Vomnibar.vomnibarUI.computeHint(clickEl.parentElement.parentElement, clickEl);
    } else if (clickEl.nodeName.toLowerCase() !== "area") {
      rect = DomUtils.getVisibleClientRect(clickEl);
      bcr = VRect.fromClientRect(clickEl.getBoundingClientRect());
      if (!rect || VRect.isContaining(bcr, rect)) {
        rect = bcr;
      }
    } else {
      parEl = clickEl;
      while (parEl = parEl.parentElement) {
      if (parEl.nodeName.toLowerCase() !== "map") { continue; }
      temp = parEl.name.replace(LinkHints.quoteRegex, '\\"');
      parEl = document.querySelector('img[usemap="#' + temp + '"],img[usemap="'
        + temp + '"]');
      if (parEl) {
        DomUtils.getClientRectsForAreas(rect = [], parEl.getBoundingClientRect()
          , true, [clickEl]);
        rect = rect[0];
      }
      break;
      }
      rect || (rect = [0, 0, 0, 0]);
    }
    this.flashVRect(rect);
  },
  flashVRect: function(rect, time) {
    var flashEl = DomUtils.createElement("div");
    flashEl.className = "R Flash";
    flashEl.style.left = rect[0] + "px";
    flashEl.style.top = rect[1] + "px";
    flashEl.style.width = (rect[2] - rect[0]) + "px";
    flashEl.style.height = (rect[3] - rect[1]) + "px";
    this.addElement(flashEl);
    return setTimeout(function(el) {
      el.remove();
    }, time || this.flashLastingTime, flashEl);
  },
  destroy: function() {
    var el = this.container;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    document.removeEventListener("webkitfullscreenchange", this.adjust);
    DomUtils.UI = null;
  }
};
