DomUtils.UI = {
  container: null,
  styleIn: null,
  styleOut: null,
  root: null,
  flashLastingTime: 400,
  fullScreen: null,
  toFocus: null,
  addElement: function(element) {
    MainPort.sendMessage({ handler: "initCSSBase" }, this.initInner.bind(this));
    this.container || this.init();
    this.root = this.container.createShadowRoot();
    this.container.style.display = "none";
    this.addElement = this.root.appendChild.bind(this.root);
    this.root.appendChild(element);
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
  Adjust: function() {
    var _this = DomUtils.UI;
    (_this.fullScreen = document.webkitFullscreenElement
        || document.documentElement).appendChild(_this.container);
  },
  focus: function(element) {
    this.initInner ? (this.toFocus = element) : element.focus();
  },
  init: function() {
    this.init = null;
    this.container = DomUtils.createElement("div");
    document.documentElement.appendChild(this.container);
  },
  initInner: function(cssBase) {
    this.initInner = null;
    this.appendCSS(this.root, cssBase);
    this.styleIn && this.addElement(this.styleIn);
    this.container.removeAttribute("style");
    document.webkitFullscreenElement && this.Adjust();
    if (this.toFocus) {
      this.toFocus.focus();
      this.toFocus = null;
    }
    document.addEventListener("webkitfullscreenchange", this.Adjust);
  },
  appendCSS: function(parent, text) {
    var css = DomUtils.createElement("style");
    css.type = "text/css";
    css.innerHTML = text;
    parent && parent.appendChild(css);
    return css;
  },
  insertCSS: function(inner, outer) {
    var style;
    if (style = this.styleIn) {
      style.innerHTML = inner;
    } else if (inner) {
      this.styleIn = this.appendCSS(this.root, inner);
    }
    if (style = this.styleOut) {
      if (outer) {
        style.innerHTML = outer;
      } else {
        style.remove();
        this.styleOut = null;
      }
    } else if (outer) {
      this.container || this.init();
      this.appendCSS(this.container, outer);
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
  }
};
