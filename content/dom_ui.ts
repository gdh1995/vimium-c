interface ShadowRootWithSelection extends ShadowRoot {
  getSelection(): Selection | null;
}

VDom.UI = {
  box: null,
  styleIn: null,
  root: null,
  callback: null,
  flashLastingTime: 400,
  addElement<T extends HTMLElement> (this: DomUI, element: T, options?: UIElementOptions): T {
    options = Object.setPrototypeOf(options || {}, null);
    let notShowAtOnce = options.showing === false, doAdd = options.adjust;
    this.box = VDom.createElement("vimium-ui");
    (this.box as HTMLElement).style.display = "none";
    this.root = (this.box as HTMLElement).attachShadow ?
        (this.box as HTMLElement & AttachShadow).attachShadow({mode: "closed"})
      : (this.box as HTMLElement).createShadowRoot();
    (this.box as HTMLElement).attachShadow || // listen "load" so that safer on Chrome < 53
    this.root.addEventListener("load", function(e: Event): void {
      const t = e.target as HTMLElement; t.onload && t.onload(e); e.stopImmediatePropagation();
    }, true);
    this.css = (innerCSS): void => {
      this.styleIn = this.createStyle(innerCSS);
      (this.root as ShadowRoot).insertBefore(this.styleIn, (this.root as ShadowRoot).firstElementChild);
      this.css = function(css) { (this.styleIn as HTMLStyleElement).textContent = css; };
      if (notShowAtOnce) { return; }
      this.styleIn.onload = function (): void {
        this.onload = null as never;
        const a = VDom.UI;
        (a.box as HTMLElement).style.display = "";
        a.callback && a.callback();
      };
      if (doAdd !== false) {
        doAdd = false;
        return this.adjust();
      }
    };
    let a = this.styleIn as string | null;
    if (a) {
      this.css(a);
    } else {
      VPort.post({ handler: "css" });
    }
    options.adjust = doAdd === true;
    this.addElement = function<T extends HTMLElement>(this: DomUI, element: T, options?: UIElementOptions | null): T {
      options = Object.setPrototypeOf(options || {}, null);
      options.adjust === false || this.adjust();
      return options.before ? (this.root as ShadowRoot).insertBefore(element, options.before)
        : (this.root as ShadowRoot).appendChild(element);
    };
    return this.addElement(element as T, options);
  },
  addElementList (els, offset): HTMLDivElement {
    const parent = VDom.createElement("div");
    parent.className = "R HM";
    for (const el of els) {
      parent.appendChild(el);
    }
    const style = parent.style;
    style.left = offset[0] + "px"; style.top = offset[1] + "px";
    VDom.bodyZoom !== 1 && (style.zoom = "" + VDom.bodyZoom);
    document.webkitIsFullScreen && (style.position = "fixed");
    return this.addElement(parent);
  },
  adjust (event): void {
    const ui = VDom.UI, el = ui.root ? document.webkitFullscreenElement : null,
    el2 = el && !(ui.root as Node).contains(el) ? el : document.documentElement as HTMLElement;
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    el2 !== (ui.box as HTMLElement).parentElement && el2.appendChild(ui.box as Element);
    (el || event) && (el ? addEventListener : removeEventListener)("webkitfullscreenchange", ui.adjust, true);
  },
  toggle (enabled): void {
    if (enabled) { return this.adjust(); }
    (this.box as HTMLElement).remove();
    removeEventListener("webkitfullscreenchange", this.adjust, true);
  },
  createStyle (text, doc): HTMLStyleElement {
    const css = (doc || VDom).createElement("style");
    css.type = "text/css";
    css.textContent = text;
    return css;
  },
  css (innerCSS): void { this.styleIn = innerCSS; },
  getSelection (): Selection {
    let sel = window.getSelection(), el: Node | null, el2: Node | null;
    if (sel.focusNode === document.documentElement && (el = VScroller.current)) {
      for (; el2 = el.parentNode; el = el2) {}
      if ((el as ShadowRoot).getSelection) { sel = (el as ShadowRootWithSelection).getSelection() || sel; }
    }
    return sel;
  },
  removeSelection (root): boolean {
    const sel = (root && root.getSelection ? root as ShadowRootWithSelection : window).getSelection();
    if (!sel || VDom.selType(sel) !== "Range" || !sel.anchorNode) {
      return false;
    }
    sel.collapseToStart();
    return true;
  },
  click (element, modifiers, addFocus): boolean {
    element === VDom.lastHovered || VDom.unhoverLast(element, modifiers);
    VDom.mouse(element, "mousedown", modifiers);
    // Note: here we can check doc.activeEl only when @click is used on the current focused document
    addFocus && element !== VEventMode.lock() && element !== document.activeElement && element.focus && element.focus();
    VDom.mouse(element, "mouseup", modifiers);
    return VDom.mouse(element, "click", modifiers);
  },
  simulateSelect (element, flash, suppressRepeated): void {
    const y = window.scrollY;
    this.click(element, null, true);
    VDom.ensureInView(element, y);
    flash === true && this.flash(element);
    if (element !== VEventMode.lock()) { return; }
    type Moveable = HTMLInputElement | HTMLTextAreaElement;
    let len: number, val: string | undefined;
    if (element instanceof HTMLTextAreaElement ? element.clientHeight + 12 >= element.scrollHeight
        : element instanceof HTMLInputElement) {
      try {
        if (0 === (element as Moveable).selectionEnd && typeof (element as Moveable).setSelectionRange === "function"
          && (len = (val = (element as Moveable).value) ? val.length : 0) > 0) {
          (element as Moveable).setSelectionRange(len, len);
        }
      } catch (e) {}
    }
    if (suppressRepeated === true) { return this.suppressTail(true); }
  },
  getZoom (this: void): number {
    let docEl = document.documentElement as Element, el: Element | null, zoom = 1;
    el = document.webkitFullscreenElement || docEl;
    do {
      zoom *= +getComputedStyle(el).zoom || 1;
    } while (el = VDom.getParent(el));
    return Math.round(zoom * 200) / 200 * Math.min(1, window.devicePixelRatio);
  },
  getVRect (this: void, clickEl: Element): VRect | null {
    const b = document.body;
    VDom.prepareCrop();
    VDom.bodyZoom = b && VDom.isInDOM(clickEl, b) && +getComputedStyle(b).zoom || 1;
    const rect = VDom.getVisibleClientRect(clickEl),
    cr = clickEl.getBoundingClientRect(), bcr = VDom.fromClientRect(cr);
    return rect && !VDom.isContaining(bcr, rect) ? rect : VDom.NotVisible(null, cr) ? null : bcr;
  },
  flash: function (this: DomUI, el: Element | null, rect?: VRect | null): number | void {
    rect || (rect = this.getVRect(el as Element));
    if (!rect) { return; }
    const flashEl = VDom.createElement("div"), nfs = !document.webkitIsFullScreen;
    flashEl.className = "R Flash";
    VDom.setBoundary(flashEl.style, rect, nfs);
    VDom.bodyZoom !== 1 && nfs && (flashEl.style.zoom = "" + VDom.bodyZoom);
    this.addElement(flashEl);
    return setTimeout(function() {
      flashEl.remove();
    }, this.flashLastingTime);
  } as DomUI["flash"],
  suppressTail (this: void, onlyRepeated: boolean): void {
    let func: HandlerNS.Handler<Function>, tick: number, timer: number;
    if (onlyRepeated) {
      func = function(event) {
        if (event.repeat) { return HandlerResult.Prevent; }
        VHandler.remove(this);
        return HandlerResult.Nothing;
      };
    } else {
      func = function() { tick = Date.now(); return HandlerResult.Prevent; };
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
  SuppressMost (event) {
    const key = event.keyCode;
    if (VKeyboard.isEscape(event)) {
      VHandler.remove(this);
    }
    return key > VKeyCodes.f1 + 9 && key <= VKeyCodes.f12 ?
      HandlerResult.Suppress : HandlerResult.Prevent;
  }
};
