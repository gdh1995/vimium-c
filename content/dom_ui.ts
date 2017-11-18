interface ShadowRootWithSelection extends ShadowRoot {
  getSelection(): Selection | null;
}

VDom.UI = {
  box: null,
  styleIn: null,
  styleOut: null,
  root: null,
  callback: null,
  flashLastingTime: 400,
  addElement<T extends HTMLElement> (this: DomUI, element: T, options?: UIElementOptions): T {
    options = VUtils.safer(options);
    let notShowAtOnce = options.showing === false, doAdd = options.adjust;
    const box = this.box = VDom.createElement("div");
    box.style.display = "none";
    this.root = typeof box.attachShadow === "function" ? box.attachShadow({mode: "closed"}) : box.createShadowRoot();
    // listen "load" so that safer if shadowRoot is open
    this.root.mode === "closed" || this.root.addEventListener("load", function(e: Event): void {
      const t = e.target as HTMLElement; t.onload && t.onload(e); VUtils.Stop(e);
    }, true);
    this.css = (innerCSS): void => {
      this.styleIn = this.createStyle(innerCSS);
      (this.root as ShadowRoot).insertBefore(this.styleIn, (this.root as ShadowRoot).firstElementChild);
      this.css = function(css) { (this.styleIn as HTMLStyleElement).textContent = css; };
      if (notShowAtOnce) { return; }
      this.styleIn.onload = function (): void {
        this.onload = null as never;
        const a = VDom.UI;
        (a.box as HTMLElement).removeAttribute("style");
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
    } else if (a !== "") {
      VPort.post({ handler: "css" });
    }
    this.addElement = function<T extends HTMLElement>(this: DomUI, element: T, options?: UIElementOptions | null): T {
      options = VUtils.safer(options);
      options.adjust === false || this.adjust();
      return options.before ? (this.root as ShadowRoot).insertBefore(element, options.before)
      : (this.root as ShadowRoot).appendChild(element);
    };
    this.root.appendChild(element);
    doAdd === true && this.adjust();
    return element;
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
    const ui = VDom.UI, el = document.webkitFullscreenElement,
    el2 = el && !(ui.root as Node).contains(el) ? el : document.documentElement as HTMLElement;
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    el2 !== (ui.box as HTMLElement).parentElement && Node.prototype.appendChild.call(el2, ui.box as Node);
    (el || event) && (el ? addEventListener : removeEventListener)("webkitfullscreenchange", ui.adjust, true);
  },
  toggle (enabled): void {
    if (enabled) { return this.adjust(); }
    (this.box as HTMLElement).remove();
    removeEventListener("webkitfullscreenchange", this.adjust, true);
  },
  _styleBorder: null as (HTMLStyleElement & {zoom?: number}) | null,
  ensureBorder (): void {
    if (!VDom.specialZoom) { return; }
    const zoom = +getComputedStyle(document.documentElement as HTMLElement).zoom || 1;
    let ratio = window.devicePixelRatio, st = this._styleBorder, st2: typeof st;
    Math.abs(zoom - ratio) > 0.001 || (ratio *= zoom);
    if (st === null ? ratio >= 1 : st.zoom === ratio) { return; }
    st2 = st || (this._styleBorder = this.createStyle(""));
    st2.zoom = ratio; st2.textContent = "*{border-width:" + ("" + 0.51 / ratio).substring(0, 5) + "px !important;}";
    st || this.addElement(st2);
  },
  createStyle (text, doc): HTMLStyleElement {
    const css = (doc || VDom).createElement("style");
    css.type = "text/css";
    css.textContent = text;
    return css;
  },
  css (innerCSS): void { this.styleIn = innerCSS; },
  getDocSelectable (): boolean {
    let el: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = this.styleOut, st: CSSStyleDeclaration;
    if (el && !el.disabled) { return false; }
    if (el = document.body) {
      st = getComputedStyle(el);
      if ((st.userSelect || st.webkitUserSelect) === "none") {
        return false;
      }
    }
    st = getComputedStyle(document.documentElement as HTMLHtmlElement);
    return (st.userSelect || st.webkitUserSelect) !== "none";
  },
  toggleSelectStyle (enable: boolean): void {
    let el = this.styleOut;
    if (enable ? VDom.docSelectable : !el || el.disabled) { return; }
    el = el || (this.styleOut = (this.box as HTMLElement).appendChild(this.createStyle(
      "html,body{-webkit-user-select:auto !important;user-select:auto !important;}"
    )));
    el.disabled = !enable;
  },
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
  getZoom (this: void, min?: number): number {
    let docEl = document.documentElement as Element, el: Element | null, zoom = 1;
    el = document.webkitFullscreenElement || docEl;
    if (VDom.specialZoom) { zoom /= window.devicePixelRatio; }
    do {
      zoom *= +getComputedStyle(el).zoom || 1;
    } while (el = VDom.getParent(el));
    return Math.round(zoom * 200) / 200 * Math.min(min || 1, window.devicePixelRatio);
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
        VUtils.remove(this);
        return HandlerResult.Nothing;
      };
    } else {
      func = function() { tick = Date.now(); return HandlerResult.Prevent; };
      tick = Date.now() + VSettings.cache.keyboard[0];
      timer = setInterval(function() {
        if (Date.now() - tick > 150) {
          clearInterval(timer);
          VUtils && VUtils.remove(func);
        }
      }, 75);
    }
    VUtils.push(func, func);
  },
  SuppressMost (event) {
    const key = event.keyCode;
    if (VKeyboard.isEscape(event)) {
      VUtils.remove(this);
    }
    return key > VKeyCodes.f1 + 9 && key <= VKeyCodes.f12 ?
      HandlerResult.Suppress : HandlerResult.Prevent;
  }
};
