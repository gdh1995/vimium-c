DomUtils.UI = {
  cssInner: null,
  cssOuter: null,
  container: null,
  root: null,
  addElement: function(element) {
    if (this.init) { this.init(); }
    this.root.appendChild(element);
  },
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
    this.addElement(parent);
    return parent;
  },
  init: function() {
    this.init = null;
    this.container = document.createElement("div");
    this.root = this.container.createShadowRoot();
    this.appendCSS(this.root
      , "@import url(chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/content/vimium.css);");
    document.documentElement.appendChild(this.container);
  },
  appendCSS: function(parent, text) {
    var css = document.createElement("style");
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
        DomUtils.removeNode(css);
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
        DomUtils.removeNode(this.cssInner);
        this.cssInner = null;
      }
    } else if (inner) {
      this.cssInner = this.appendCSS(this.root, inner);
    }
    if (this.cssOuter) {
      if (outer) {
        this.cssOuter.outerHTML = outer;
      } else {
        DomUtils.removeNode(this.cssOuter);
        this.cssOuter = null;
      }
    } else if (outer) {
      this.cssOuter = this.appendCSS(this.container, outer);
    }
  },
  destroy: function() {
    var el = this.container;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    DomUtils.UI = null;
  }
};
