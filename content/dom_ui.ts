interface ShadowRootWithSelection extends ShadowRoot {
  getSelection(): Selection | null;
}

VDom.UI = {
  box_: null,
  styleIn_: null,
  styleOut_: null,
  R: null as never,
  callback_: null,
  flashLastingTime_: 400,
  addElement_<T extends HTMLElement> (this: void, element: T, adjust?: AdjustType): T {
    const a = VDom.UI, box = a.box_ = VDom.createElement_("div"),
    shadowVer = typeof box.attachShadow === "function" ? 2 : typeof box.createShadowRoot === "function" ? 1 : 0;
    box.style.display = "none";
    a.R = shadowVer === 2 ? (box as AttachShadow).attachShadow({mode: "closed"})
      : shadowVer === 1 ? (box as DomUI["box_"] & {createShadowRoot(): ShadowRoot}).createShadowRoot() : box;
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    a.R.mode === "closed" || (a.R !== box ? a.R as ShadowRoot : window).addEventListener("load",
    function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!VDom) { return removeEventListener("load", Onload, true); }
      const t = e.target as HTMLElement;
      if (t.parentNode === VDom.UI.R) {
        VUtils.Stop_(e); t.onload && t.onload(e);
      }
    }, true);
    a.addElement_ = function<T extends HTMLElement>(this: DomUI, element: T, adjust?: AdjustType, before?: Element | null | true): T {
      adjust === AdjustType.NotAdjust || this.adjust_();
      return this.R.insertBefore(element, before === true ? this.R.firstElementChild : before || null);
    };
    a.css_ = (function (innerCSS): void {
      const a = VDom.UI;
      if (a.box_ === a.R) {
        a.box_.id = "VimiumUI";
      }
      let el: HTMLStyleElement | null = a.styleIn_ = a.createStyle_(innerCSS), stBorder: { el: HTMLStyleElement } | null;
      a.R.appendChild(el);
      a.css_ = function(css) { (this.styleIn_ as HTMLStyleElement).textContent = css; };
      (stBorder = a._styleBorder) && a.R.appendChild(stBorder.el);
      if (adjust !== AdjustType.AdjustButNotShow) {
        let f = function (this: HTMLElement, e: Event | 1): void {
          e !== 1 && (this.onload = null as never);
          const a = VDom.UI, box = a.box_ as HTMLElement;
          // enforce webkit to build the style attribute node, and then we can remove it totally
          box.hasAttribute("style") && box.removeAttribute("style");
          a.callback_ && a.callback_();
        };
        VDom.isStandard_ ? Promise.resolve(1 as 1).then(f) : (el.onload = f);
      }
      if (adjust !== AdjustType.NotAdjust) {
        a.adjust_();
      }
    });
    a.R.appendChild(element);
    let b: string | null;
    if (b = a.styleIn_ as string | null) {
      a.css_(b);
    } else {
      b === "" || VPort.post({ handler: "css" });
      if ((adjust as AdjustType) >= AdjustType.MustAdjust) {
        a.adjust_();
      }
    }
    return element;
  },
  addElementList_ (els, offset: ViewOffset): HTMLDivElement {
    const parent = VDom.createElement_("div");
    parent.className = "R HM";
    for (const el of els) {
      parent.appendChild(el.marker);
    }
    const style = parent.style, zoom = VDom.bZoom_ / VDom.dScale_;
    style.left = offset[0] + "px"; style.top = offset[1] + "px";
    zoom !== 1 && (style.zoom = "" + zoom);
    document.webkitIsFullScreen && (style.position = "fixed");
    return this.addElement_(parent, AdjustType.DEFAULT, this._lastFlash);
  },
  adjust_ (event): void {
    const ui = VDom.UI, el = document.webkitFullscreenElement, box = ui.box_ as HTMLDivElement,
    el2 = el && !(ui.R as Node).contains(el) ? el : document.documentElement as HTMLElement;
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    el2 !== box.parentNode && box.appendChild.call(el2, box);
    const sin = ui.styleIn_, s = sin && (sin as HTMLStyleElement).sheet;
    s && (s.disabled = false);
    (el || event) && (el ? addEventListener : removeEventListener)("webkitfullscreenchange", ui.adjust_, true);
  },
  toggle_ (enabled): void {
    if (enabled) { return this.adjust_(); }
    (this.box_ as HTMLElement).remove();
    removeEventListener("webkitfullscreenchange", this.adjust_, true);
  },
  _styleBorder: null as { el: HTMLStyleElement, zoom: number } | null,
  ensureBorder_ (zoom?: number): void {
    let st = this._styleBorder;
    zoom || (zoom = VDom.getZoom_());
    if (st ? st.zoom === zoom : zoom >= 1) { return; }
    const p = this.box_ === this.R ? "#VimiumUI " : "", first = !st;
    st || (st = this._styleBorder = { el: this.createStyle_(""), zoom: 0 });
    st.zoom = zoom; st.el.textContent = `${p}.HUD, ${p}.IH, ${p}.LH { border-width: ${("" + 0.51 / zoom).substring(0, 5)}px; }`;
    first && this.box_ && this.addElement_(st.el, AdjustType.NotAdjust);
  },
  createStyle_ (text, doc): HTMLStyleElement {
    const css = doc ? doc.createElement("style") : VDom.createElement_("style");
    css.type = "text/css";
    css.textContent = text;
    return css;
  },
  css_ (innerCSS): void { this.styleIn_ = innerCSS; },
  getDocSelectable_ (): boolean {
    let sout: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = this.styleOut_;
    if (sout && sout.parentNode) { return false; }
    let gcs = getComputedStyle, st: CSSStyleDeclaration;
    if (sout = document.body) {
      st = gcs(sout);
      if ((st.userSelect || st.webkitUserSelect) === "none") {
        return false;
      }
    }
    st = gcs(document.documentElement as HTMLHtmlElement);
    return (st.userSelect || st.webkitUserSelect) !== "none";
  },
  toggleSelectStyle_ (enable: boolean): void {
    let sout = this.styleOut_;
    if (enable ? VDom.docSelectable_ : !sout || !sout.parentNode) { return; }
    sout || (this.styleOut_ = sout = this.createStyle_(
      "html, body, * { -webkit-user-select: auto; user-select: auto; }"
    ));
    enable ? (this.box_ as HTMLElement).appendChild(sout) : sout.remove();
  },
  getSelection_ (): Selection {
    let sel = getSelection(), el: Node | null, d = document;
    if (sel.focusNode === d.documentElement && (el = VScroller.current_)) {
      for (let pn: Node | null; pn = VDom.GetParent_(el, false); el = pn) { }
      if (el !== d && typeof (el as ShadowRoot).getSelection === "function") {
        sel = (el as ShadowRootWithSelection).getSelection() || sel;
      }
    }
    return sel;
  },
  getSelectionText_ (notTrim?: 1): string {
    let sel = getSelection(), s = sel.toString(), el: Element | null, rect: ClientRect;
    if (s && !VEventMode.lock_() && (el = VScroller.current_) && VDom.getEditableType_(el) === EditableType.Editbox
        && (rect = sel.getRangeAt(0).getBoundingClientRect(), !rect.width || !rect.height)) {
      s = "";
    }
    return notTrim ? s : s.trim();
  },
  removeSelection_ (root: VUIRoot & {getSelection?: ShadowRootWithSelection["getSelection"]}): boolean {
    const sel = (root && root.getSelection ? root as ShadowRootWithSelection : window).getSelection();
    if (!sel || sel.type !== "Range" || !sel.anchorNode) {
      return false;
    }
    sel.collapseToStart();
    return true;
  },
  click_ (element, rect, modifiers, addFocus): boolean {
    rect || (rect = VDom.getVisibleClientRect_(element));
    element === VDom.lastHovered_ || VDom.hover_(element, rect);
    VDom.mouse_(element, "mousedown", rect, modifiers);
    // Note: here we can check doc.activeEl only when @click is used on the current focused document
    addFocus && element !== VEventMode.lock_() && element !== document.activeElement && element.focus && element.focus();
    VDom.mouse_(element, "mouseup", rect, modifiers);
    return VDom.mouse_(element, "click", rect, modifiers);
  },
  simulateSelect_ (element, rect, flash, action, suppressRepeated): void {
    const y = window.scrollY;
    this.click_(element, rect, null, true);
    VDom.view(element, y);
    // re-compute rect of element, in case that an input is resized when focused
    flash && this.flash_(element);
    if (element !== VEventMode.lock_()) { return; }
    this.moveSel_(element, action);
    if (suppressRepeated === true) { return this.suppressTail_(true); }
  },
  moveSel_ (element, action): void {
    type TextElement = HTMLInputElement | HTMLTextAreaElement;
    const type = element instanceof HTMLTextAreaElement ? EditableType.Editbox
        : element instanceof HTMLInputElement ? EditableType.input_
        : (element as HTMLElement).isContentEditable ? EditableType.rich_ : EditableType.Default;
    if (type === EditableType.Default) { return; }
    if (action ? (action === "all-input" || action === "all-line") && (type === EditableType.Editbox
            || type === EditableType.rich_ && element.textContent.indexOf("\n") >= 0)
        : type === EditableType.rich_ || (element as TextElement).value.length <= 0
          || type === EditableType.Editbox && element.clientHeight + 12 < element.scrollHeight) {
      return;
    }
    // not need `this.getSelection_()`
    try {
      const sel = getSelection();
      if (type === EditableType.rich_) {
        const range = document.createRange();
        range.selectNodeContents(element);
        sel.removeAllRanges()
        sel.addRange(range);
      } else {
        const end = (element as TextElement).selectionEnd;
        if (end < (element as TextElement).value.length && end > 0 || end !== (element as TextElement).selectionStart) {
          return;
        }
        (element as TextElement).select();
      }
      if (!action || action === "end") {
        sel.collapseToEnd();
      } else if (action === "start") {
        sel.collapseToStart();
      }
    } catch (e) {}
  },
  getVRect_ (this: void, clickEl, refer): VRect | null {
    VDom.getZoom_(clickEl);
    VDom.prepareCrop_();
    if (refer) {
      return VDom.getClientRectsForAreas_(refer, [], [clickEl as HTMLAreaElement]);
    }
    const rect = VDom.getVisibleClientRect_(clickEl),
    cr = clickEl.getBoundingClientRect(), bcr = VDom.fromClientRect_(cr);
    return rect && !VDom.isContaining_(bcr, rect) ? rect : VDom.NotVisible_(null, cr) ? null : bcr;
  },
  _lastFlash: null,
  flash_: function (this: DomUI, el: Element | null, rect?: VRect | null): HTMLElement | void {
    rect || (rect = this.getVRect_(el as Element));
    if (!rect) { return; }
    const flashEl = VDom.createElement_("div"), nfs = !document.webkitIsFullScreen;
    flashEl.className = "R Flash";
    VDom.setBoundary_(flashEl.style, rect, nfs);
    VDom.bZoom_ !== 1 && nfs && (flashEl.style.zoom = "" + VDom.bZoom_);
    this.addElement_(flashEl);
    this._lastFlash = flashEl;
    setTimeout(() => {
      this._lastFlash === flashEl && (this._lastFlash = null);
      flashEl.remove();
    }, this.flashLastingTime_);
    return flashEl;
  } as DomUI["flash_"],
  suppressTail_ (this: void, onlyRepeated: boolean): void {
    let func: HandlerNS.Handler<Function>, tick: number, timer: number;
    if (onlyRepeated) {
      func = function(event) {
        if (event.repeat) { return HandlerResult.Prevent; }
        VUtils.remove_(this);
        return HandlerResult.Nothing;
      };
    } else {
      func = function() { tick = Date.now(); return HandlerResult.Prevent; };
      tick = Date.now() + VSettings.cache.keyboard[0];
      timer = setInterval(function(info?: TimerType) {
        if (Date.now() - tick > 150 || info === TimerType.fake) {
          clearInterval(timer);
          VUtils && VUtils.remove_(func);
        }
      }, 75);
    }
    VUtils.push_(func, func);
  },
  SuppressMost_ (event) {
    VKeyboard.isEscape_(event) && VUtils.remove_(this);
    const key = event.keyCode;
    return key > VKeyCodes.f10 && key < VKeyCodes.minNotFn || key === VKeyCodes.f5 ?
      HandlerResult.Suppress : HandlerResult.Prevent;
  }
};
