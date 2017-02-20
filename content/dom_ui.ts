VDom.UI = {
  box: null,
  styleIn: null,
  styleOut: null,
  root: null,
  focusedEl: null,
  flashLastingTime: 400,
  showing: true,
  addElement<T extends HTMLElement> (this: DomUI, element: T, options?: UIElementOptions): T {
    options = Object.setPrototypeOf(options || {}, null);
    this.showing = options.showing !== false;
    VPort.send({ handler: "initInnerCSS" }, this.InitInner);
    this.InitInner = null as never;
    this.init && this.init(false);
    (this.box as HTMLElement).style.display = "none";
    this.root = (this.box as HTMLElement).attachShadow ?
        (this.box as HTMLElement & AttachShadow).attachShadow({mode: "closed"})
      : (this.box as HTMLElement).createShadowRoot();
    this.addElement = function<T extends HTMLElement>(this: DomUI, element: T, options?: UIElementOptions): T {
      options = Object.setPrototypeOf(options || {}, null);
      options.adjust === false || this.adjust();
      return options.before ? (this.root as ShadowRoot).insertBefore(element, options.before)
        : (this.root as ShadowRoot).appendChild(element);
    } as DomUI["addElement"];
    options.adjust = options.adjust === true;
    return this.addElement(element, options);
  },
  addElementList (els: ReadonlyArray<Element>, offset: [number, number]): HTMLDivElement {
    const parent = VDom.createElement("div");
    parent.className = "R HM";
    for (const el of els) {
      parent.appendChild(el);
    }
    const style = parent.style;
    style.left = offset[0] + "px"; style.top = offset[1] + "px";
    const z = VDom.bodyZoom;
    z !== 1 && (style.zoom = "" + z);
    document.webkitIsFullScreen && (style.position = "fixed");
    return this.addElement(parent);
  },
  adjust (event): void {
    const ui = VDom.UI, el = ui.root ? document.webkitFullscreenElement : null;
    (el && !(ui.root as Node).contains(el) ? el : document.documentElement as Element).appendChild(ui.box as Element);
    (el || event) && (el ? addEventListener : removeEventListener)("webkitfullscreenchange", ui.adjust, true);
  },
  init (showing): void {
    this.init = null as never;
    this.box = VDom.createElement("vimium-ui");
    if (showing !== false) { return this.adjust(); }
  },
  InitInner (innerCSS): void {
    const _this = VDom.UI;
    _this.styleIn = _this.createStyle(innerCSS);
    (_this.root as ShadowRoot).insertBefore(_this.styleIn, (_this.root as ShadowRoot).firstElementChild);
    if (!_this.showing) { _this.showing = true; return; }
    setTimeout(function() {
      (_this.box as HTMLElement).style.display = "";
      const el = _this.focusedEl; _this.focusedEl = null;
      el && setTimeout(function() { el.focus(); }, 17);
    }, 17);
    return _this.adjust();
  },
  toggle (enabled): void {
    if (!enabled) { (this.box as HTMLElement).remove(); return; }
    if (!(this.box as HTMLElement).parentNode) { return this.adjust(); }
  },
  createStyle (text, doc): HTMLStyleElement {
    const css = (doc || VDom).createElement("style");
    css.type = "text/css";
    css.textContent = text;
    return css;
  },
  InsertInnerCSS (inner): void {
    VDom.UI.styleIn && (VDom.UI.styleIn.textContent = inner.css);
  },
  insertCSS (outer): void {
    let el = this.styleOut;
    if (!outer) { el && el.remove(); return; }
    el ? (el.textContent = outer) : (el = this.styleOut = this.createStyle(outer));
    this.init && this.init(true);
    (this.box as HTMLElement).appendChild(el);
  },
  getSelection (): Selection {
    let sel = window.getSelection(), el: Node | null, el2: Node | null;
    if (sel.focusNode === document.documentElement && (el = VScroller.current)) {
      for (; el2 = el.parentNode; el = el2) {}
      if ((el as ShadowRoot).getSelection) { sel = (el as ShadowRoot).getSelection() || sel; }
    }
    return sel;
  },
  removeSelection (root): boolean {
    const sel = (root || this.root as ShadowRoot).getSelection();
    if (!sel || sel.type !== "Range" || !sel.anchorNode) {
      return false;
    }
    sel.removeAllRanges();
    return true;
  },
  click (element, modifiers, addFocus): boolean {
    element === VDom.lastHovered || VDom.unhoverLast(element, modifiers);
    VDom.mouse(element, "mousedown", modifiers);
    addFocus && element !== VEventMode.lock() && element.focus && element.focus();
    VDom.mouse(element, "mouseup", modifiers);
    return VDom.mouse(element, "click", modifiers);
  },
  simulateSelect (element, flash, suppressRepeated): void {
    this.click(element, null, true);
    flash === true && this.flash(element);
    if (element !== VEventMode.lock()) { return; }
    type Moveable = HTMLInputElement | HTMLTextAreaElement;
    let moveSel = element instanceof HTMLTextAreaElement ? element.clientHeight + 12 >= element.scrollHeight
      : element instanceof HTMLInputElement, len: number, val: string | undefined;
    if (moveSel && 0 == (element as Moveable).selectionEnd && (element as Moveable).setSelectionRange
        && (len = (val = (element as Moveable).value) ? val.length : 0) > 0) {
      try {
        (element as Moveable).setSelectionRange(len, len);
      } catch (e) {}
    }
    suppressRepeated === true && this.suppressTail(true);
  },
  focus (el): void {
    if (typeof el.focus !== "function") {}
    else if ((this.box as HTMLElement).style.display) {
      this.focusedEl = el as Element & { focus(): void; };
    } else {
      el.focus();
    }
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
    bcr = VRect.fromClientRect(clickEl.getBoundingClientRect());
    return rect && !VRect.isContaining(bcr, rect) ? rect : VDom.isVisibile(clickEl) ? bcr : null;
  },
  flash (el, rect): number | undefined {
    rect || (rect = this.getVRect(el));
    if (!rect) { return; }
    const flashEl = VDom.createElement("div"), nfs = !document.webkitIsFullScreen;
    flashEl.className = "R Flash";
    VRect.setBoundary(flashEl.style, rect, nfs);
    VDom.bodyZoom !== 1 && nfs && (flashEl.style.zoom = "" + VDom.bodyZoom);
    this.addElement(flashEl);
    return setTimeout(function() {
      flashEl.remove();
    }, this.flashLastingTime);
  },
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
