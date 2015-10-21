DomUtils.UI = {
  container: null,
  styleIn: null,
  styleOut: null,
  root: null,
  flashLastingTime: 400,
  addElement: function(element) {
    MainPort.sendMessage({ handler: "initInnerCSS" }, this.initInner.bind(this));
    this.container || this.init();
    this.container.style.display = "none";
    this.root = this.container.createShadowRoot();
    this.root.appendChild(element);
    this.addElement = this.root.appendChild.bind(this.root);
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
    (document.webkitFullscreenElement || document.documentElement).appendChild(DomUtils.UI.container);
  },
  init: function() {
    var el = this.container = DomUtils.createElement("div");
    if (this.styleOut) {
      el.appendChild(this.styleOut);
      document.documentElement.appendChild(el);
    }
    this.init = null;
  },
  initInner: function(innerCss) {
    this.initInner = null;
    this.styleIn = this.createStyle(innerCss);
    this.root.insertBefore(this.styleIn, this.root.firstElementChild);
    this.container.style.display = "";
    this.Adjust();
    document.addEventListener("webkitfullscreenchange", this.Adjust);
  },
  destroy: function() {
    document.removeEventListener("webkitfullscreenchange", this.Adjust);
    this.container && this.container.remove();
  },
  createStyle: function(text) {
    var css = DomUtils.createElement("style");
    css.type = "text/css";
    css.textContent = text;
    return css;
  },
  insertInnerCSS: function(inner) {
    this.styleIn && (this.styleIn.textContent = inner);
  },
  insertCSS: function(outer) {
    if (this.styleOut) {
      if (outer) {
        this.styleOut.textContent = outer;
      } else {
        this.styleOut.remove();
        this.styleOut = null;
      }
    } else {
      this.styleOut = this.createStyle(outer);
      if (this.container) {
        this.container.appendChild(this.styleOut);
      } else {
        this.init();
      }
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
      temp = parEl.name.replace(LinkHints.quoteRe, '\\"');
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
