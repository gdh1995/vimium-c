interface ShadowRootWithSelection extends ShadowRoot {
  getSelection(): Selection | null;
}

VDom.UI = {
  box_: null,
  styleIn_: null,
  styleOut_: null,
  UI: null as never,
  flashLastingTime_: 400,
  add_<T extends HTMLElement> (this: void, element: T, adjust?: AdjustType): void {
    const a = VDom.UI, box = a.box_ = VDom.createElement_("div"),
    r: VUIRoot = a.UI = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1
        || box.attachShadow
      ? (box as Ensure<typeof box, "attachShadow">).attachShadow({mode: "closed"})
      : (Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
        && Build.MinCVer >= BrowserVer.MinShadowDOMV0 && box.createShadowRoot
      ? box.createShadowRoot() : box;
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1 ||
    r.mode === "closed" ||
    (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0 || r !== box
      ? r as ShadowRoot : window).addEventListener("load",
    function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!VDom) { return removeEventListener("load", Onload, true); }
      const t = e.target as HTMLElement;
      if (t.parentNode === VDom.UI.UI) {
        VUtils.Stop_(e); t.onload && t.onload(e);
      }
    }, true);
    a.add_ = (function<T2 extends HTMLElement> (this: DomUI, element2: T2, adjust2?: AdjustType
        , before?: Element | null | true): void {
      const noPar = !(this.box_ as NonNullable<typeof this.box_>).parentNode;
      adjust2 !== AdjustType.NotAdjust && !noPar && this.adjust_();
      this.UI.insertBefore(element2, before === true ? this.UI.firstChild : before || null);
      adjust2 !== AdjustType.NotAdjust && noPar && this.adjust_();
    });
    a.css_ = (function (innerCSS): void {
      const a1 = VDom.UI, box2 = a1.box_ as HTMLElement;
      if (((Build.BTypes & ~BrowserType.Chrome) || Build.MinCVer < BrowserVer.MinShadowDOMV0) && box2 === a1.UI) {
        box2.id = "VimiumUI";
      }
      let el: HTMLStyleElement | null = a1.styleIn_ = a1.createStyle_();
      a1.css_ = function (css) {
        (this.styleIn_ as HTMLStyleElement).textContent = this.cssPatch_ ? this.cssPatch_[1](css) : css;
      };
      a1.css_(innerCSS);
      a1.UI.appendChild(el);
      /**
       * Note: Tests on C35, 38, 41, 44, 47, 50, 53, 57, 60, 63, 67, 71, 72 confirmed
       *        that el.sheet has been valid when promise.then, even on XML pages.
       * `AdjustType.NotAdjust` must be used before a certain, clear normal adjusting
       */
      // enforce webkit to build the style attribute node, and then we can remove it totally
      box2.hasAttribute("style") && box2.removeAttribute("style");
      if (adjust !== AdjustType.NotAdjust) {
        a1.adjust_();
      }
    });
    r.appendChild(element);
    let b: string | null;
    if (b = a.styleIn_ as string | null) {
      a.css_(b);
    } else {
      box.style.display = "none";
      if ((adjust as AdjustType) === AdjustType.MustAdjust) {
        a.adjust_();
      }
      VPort.post_({ H: kFgReq.css });
    }
  },
  addElementList_: function (this: DomUI
      , els: ReadonlyArray<HintsNS.BaseHintItem>, offset: ViewOffset, dialogContainer) {
    const parent = VDom.createElement_(dialogContainer ? "dialog" : "div");
    parent.className = dialogContainer ? "R HM DHM" : "R HM";
    for (const el of els) {
      parent.appendChild(el.marker);
    }
    const style = parent.style, zoom = VDom.bZoom_ / VDom.dScale_;
    style.left = offset[0] + "px"; style.top = offset[1] + "px";
    zoom !== 1 && (style.zoom = "" + zoom);
    document.webkitIsFullScreen && (style.position = "fixed");
    this.add_(parent, AdjustType.DEFAULT, this._lastFlash);
    return parent;
  } as DomUI["addElementList_"],
  adjust_ (event): void {
    const UI = VDom.UI, el = document.webkitFullscreenElement, box = UI.box_ as HTMLDivElement,
    el2 = el && !(UI.UI as Node).contains(el) ? el : document.documentElement as HTMLElement;
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    event === 2 ? box.remove() : el2 !== box.parentNode && box.appendChild.call(el2, box);
    const sin = UI.styleIn_, s = sin && (sin as HTMLStyleElement).sheet;
    s && (s.disabled = false);
    if (el || event) {
      const isFF = !(Build.BTypes & ~BrowserType.Firefox) || !!(Build.BTypes & BrowserType.Firefox)
        && VUtils.cache_.browser_ === BrowserType.Firefox;
      (el && event !== 2 ? addEventListener : removeEventListener).call(isFF ? document : window
        , (isFF ? "webkit" : "") + "fullscreenchange", UI.adjust_, true);
    }
  },
  cssPatch_: null,
  ensureBorder_ (zoom?: number): void {
    zoom || (zoom = VDom.getZoom_());
    let patch = this.cssPatch_;
    if (!patch && zoom >= 1) { return; }
    let width = ("" + (
        Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo &&
          VUtils.cache_.browserVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        ? 1.01 : 0.51) / zoom).substring(0, 5)
      , st = this.styleIn_;
    if (!patch) {
      patch = this.cssPatch_ = ["", function (this: NonNullable<DomUI["cssPatch_"]>, css) {
        return css.replace(<RegExpG> /\b(border(?:-\w*-?width)?: ?)(0\.5px\b|[^;}]+\/\*!DPI\*\/)/g, "$1" + this[0]
          + "px \/\*!DPI\*\/");
      }];
    }
    if (patch[0] === width) { return; }
    patch[0] = width;
    st && this.css_(typeof st === "string" ? st : st.textContent);
  },
  createStyle_ (text, css): HTMLStyleElement {
    css = css || VDom.createElement_("style");
    css.type = "text/css";
    text && (css.textContent = text);
    return css;
  },
  css_ (innerCSS): void { this.styleIn_ = innerCSS; },
  getDocSelectable_ (): boolean {
    let sout: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = this.styleOut_;
    if (sout && sout.parentNode) { return false; }
    let gcs = getComputedStyle, st: CSSStyleDeclaration;
    if (sout = document.body) {
      st = gcs(sout);
      if ((st.userSelect || Build.MinCVer >= BrowserVer.MinUnprefixedUserSelect || st.webkitUserSelect) === "none") {
        return false;
      }
    }
    st = gcs(document.documentElement as HTMLHtmlElement);
    return (st.userSelect || Build.MinCVer >= BrowserVer.MinUnprefixedUserSelect || st.webkitUserSelect) !== "none";
  },
  toggleSelectStyle_ (enable: BOOL): void {
    let sout = this.styleOut_;
    if (enable ? VDom.docSelectable_ : !sout || !sout.parentNode) { return; }
    sout || (this.styleOut_ = sout = this.createStyle_(VFind.css_[1]));
    enable ? (this.box_ as HTMLElement).appendChild(sout) : sout.remove();
  },
  getSelected_ (notExpectCount?: 1): [Selection, ShadowRoot | null] {
    let d = document, el: Node | null, sel: Selection | null;
    if (el = VScroller.current_) {
      if (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || el.getRootNode) {
        el = (el as Ensure<Node, "getRootNode">).getRootNode();
      } else {
        for (let pn: Node | null; pn = VDom.GetParent_(el, PNType.DirectNode); el = pn) { /* empty */ }
      }
      if (el !== d && typeof (el as ShadowRoot).getSelection === "function") {
        sel = (el as ShadowRootWithSelection).getSelection();
        if (sel && (notExpectCount || sel.rangeCount)) {
          return [sel, el as ShadowRoot];
        }
      }
    }
    sel = getSelection();
    if ((Build.BTypes & ~BrowserType.Chrome) || Build.MinCVer < BrowserVer.MinShadowDOMV0) {
      if (typeof ShadowRoot !== "function" || ShadowRoot instanceof Element) { return [sel, null]; }
    }
    let E = Element, offset: number, sr: ShadowRoot | null = null, sel2: Selection | null = sel;
    while (sel2) {
      sel2 = null;
      el = sel.anchorNode;
      if (el && el === sel.focusNode && (offset = sel.anchorOffset) === sel.focusOffset) {
        if (el instanceof E && !(el.childNodes instanceof E)) {
          el = el.childNodes[offset];
          if (el && (sr = VDom.GetShadowRoot_(el))) {
            if (sr.getSelection && (sel2 = sr.getSelection())) {
              sel = sel2;
            } else {
              sr = null;
            }
          }
        }
      }
    }
    return [sel, sr];
  },
  getSelectionText_ (notTrim?: 1): string {
    let sel = getSelection(), s = "" + sel, el: Element | null, rect: ClientRect;
    if (s && !VEvent.lock_() && (el = VScroller.current_) && VDom.getEditableType_(el) === EditableType.Editbox
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
    addFocus && element !== VEvent.lock_() && element !== document.activeElement &&
      typeof element.focus === "function" && element.focus();
    VDom.mouse_(element, "mouseup", rect, modifiers);
    return VDom.mouse_(element, "click", rect, modifiers);
  },
  simulateSelect_ (element, rect, flash, action, suppressRepeated): void {
    const y = window.scrollY;
    this.click_(element, rect, null, true);
    VDom.view_(element, y);
    // re-compute rect of element, in case that an input is resized when focused
    flash && this.flash_(element);
    if (element !== VEvent.lock_()) { return; }
    // then `element` is always safe
    this._moveSel_unsafe_(element as LockableElement, action);
    if (suppressRepeated === true) { return this.suppressTail_(1); }
  },
  /** @NEED_SAFE_ELEMENTS */
  _moveSel_unsafe_ (element, action): void {
    type TextElement = HTMLInputElement | HTMLTextAreaElement;
    const tag = (element.tagName as string).toLowerCase();
    const type = tag === "textarea" ? EditableType.Editbox : tag === "input" ? EditableType.input_
        : element.isContentEditable ? EditableType.rich_
        : EditableType.Default;
    if (type === EditableType.Default) { return; }
    const isBox = type === EditableType.Editbox || type === EditableType.rich_
        && element.textContent.indexOf("\n") >= 0,
    lineAllAndBoxEnd = action === "all-input" || action === "all-line",
    gotoStart = action === "start",
    gotoEnd = !action || action === "end" || isBox && lineAllAndBoxEnd;
    if (isBox && gotoEnd && element.clientHeight + 12 < element.scrollHeight) {
      return;
    }
    // not need `this.getSelection_()`
    try {
      const sel = getSelection();
      if (type === EditableType.rich_) {
        const range = document.createRange();
        range.selectNodeContents(element);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        let len = (element as TextElement).value.length
          , { selectionStart: start, selectionEnd: end } = element as TextElement;
        if (!len || (gotoEnd ? start === len : gotoStart && !end) || end && end < len || end !== start) {
          return;
        }
        (element as TextElement).select();
      }
      if (gotoEnd) {
        sel.collapseToEnd();
      } else if (gotoStart) {
        sel.collapseToStart();
      }
    } catch {}
  },
  getRect_ (this: void, clickEl, refer): Rect | null {
    VDom.getZoom_(clickEl);
    VDom.prepareCrop_();
    if (refer) {
      return VDom.getClientRectsForAreas_(refer, [], [clickEl as HTMLAreaElement]);
    }
    const rect = VDom.getVisibleClientRect_(clickEl),
    cr = Element.prototype.getBoundingClientRect.call(clickEl), bcr = VDom.padClientRect_(cr, 8);
    return rect && !VDom.isContaining_(bcr, rect) ? rect
      : VDom.cropRectToVisible_.apply(VDom, bcr as [number, number, number, number]) ? bcr : null;
  },
  _lastFlash: null,
  flash_: function (this: DomUI, el: Element | null, rect?: Rect | null): HTMLDivElement | void {
    const a = this;
    rect || (rect = a.getRect_(el as Element));
    if (!rect) { return; }
    const flashEl = VDom.createElement_("div"), nfs = !document.webkitIsFullScreen;
    flashEl.className = "R Flash";
    VDom.setBoundary_(flashEl.style, rect, nfs);
    VDom.bZoom_ !== 1 && nfs && (flashEl.style.zoom = "" + VDom.bZoom_);
    a.add_(flashEl);
    a._lastFlash = flashEl;
    setTimeout(function (): void {
      a._lastFlash === flashEl && (a._lastFlash = null);
      flashEl.remove();
    }, a.flashLastingTime_);
    return flashEl;
  } as DomUI["flash_"],
  suppressTail_ (this: void, onlyRepeated: BOOL): void {
    let func: HandlerNS.Handler<{}>, tick: number, timer: number;
    if (onlyRepeated) {
      func = function (event) {
        if (event.repeat) { return HandlerResult.Prevent; }
        VUtils.remove_(this);
        return HandlerResult.Nothing;
      };
    } else {
      func = function () { tick = Date.now(); return HandlerResult.Prevent; };
      tick = Date.now() + VUtils.cache_.keyboard[0];
      timer = setInterval(function (info?: TimerType) {
        const delta = Date.now() - tick; // Note: performance.now() may has a worse resolution
        if (delta > 150 || delta < -99 || info === TimerType.fake) {
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