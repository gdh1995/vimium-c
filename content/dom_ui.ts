interface ShadowRootWithSelection extends ShadowRoot {
  getSelection(): Selection | null;
}

var VCui = {
  box_: null as HTMLDivElement & SafeHTMLElement | null,
  styleIn_: null as HTMLStyleElement | string | null,
  styleOut_: null as HTMLStyleElement | null,
  styleFind_: null as HTMLStyleElement | null,
  root_: null as never as VUIRoot,
  findCss_: null as never as FindCSS,
  /** @NEED_SAFE_ELEMENTS */
  activeEl_: null as SafeElement | null,
  add_: (function <T extends HTMLElement> (this: void, element: T, adjust?: AdjustType): void {
    let a = VCui, box = a.box_ = VDom.createElement_("div"),
    root: VUIRoot = a.root_ = VDom.createShadowRoot_(box);
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
      && !(Build.BTypes & ~BrowserType.ChromeOrFirefox) ||
    root.mode === "closed" ||
    VKey.SetupEventListener_(
      !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0 || root !== box
      ? root as ShadowRoot : 0, "load",
    function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!VDom) { removeEventListener("load", Onload, true); return; } // safe enough even if reloaded
      const t = e.target as HTMLElement;
      if (t.parentNode === VCui.root_) {
        VKey.Stop_(e); t.onload && t.onload(e);
      }
    }, 0, 1); // should use a listener in active mode: https://www.chromestatus.com/features/5745543795965952
    a.add_ = (function<T2 extends HTMLElement> (this: typeof VCui, element2: T2, adjust2?: AdjustType
        , before?: Element | null | true): void {
      const noPar = !(this.box_ as NonNullable<typeof this.box_>).parentNode;
      adjust2 !== AdjustType.NotAdjust && !noPar && this.adjust_();
      this.root_.insertBefore(element2, before === true ? this.root_.firstChild : before || null);
      adjust2 !== AdjustType.NotAdjust && noPar && this.adjust_();
    });
    a.css_ = (function (innerCSS): void {
      const a1 = VCui, box2 = a1.box_ as HTMLElement;
      if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) &&
          box2 === a1.root_) {
        box2.id = "VimiumUI";
      }
      let el: HTMLStyleElement | null = a1.styleIn_ = a1.createStyle_();
      a1.css_ = function (css) {
        (this.styleIn_ as HTMLStyleElement).textContent = this.cssPatch_ ? this.cssPatch_[1](css) : css;
      };
      a1.css_(innerCSS);
      a1.root_.appendChild(el);
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
    root.appendChild(element);
    if (a.styleIn_) {
      a.css_(a.styleIn_ as Exclude<typeof a.styleIn_, Element | null | undefined | "">);
    } else {
      box.style.display = "none";
      if ((adjust as AdjustType) === AdjustType.MustAdjust) {
        a.adjust_();
      }
      VApi.post_({ H: kFgReq.css });
    }
  }) as <T extends HTMLElement> (element: T, adjust?: AdjustType, before?: Element | null | true) => void,
  addElementList_ <T extends boolean | BOOL> (
      els: ReadonlyArray<HintsNS.BaseHintItem>, offset: ViewOffset, dialogContainer?: T | null
      ): (T extends true | 1 ? HTMLDialogElement : HTMLDivElement) & SafeElement {
    const parent = VDom.createElement_(dialogContainer ? "dialog" : "div");
    parent.className = "R HM" + (dialogContainer ? " DHM" : "") + VDom.cache_.d;
    for (const el of els) {
      parent.appendChild(el.marker_);
    }
    const style = parent.style, zoom = VDom.bZoom_ / VDom.dScale_,
    left = offset[0] + "px", top = offset[1] + "px";
    if ((!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox)
        && zoom - 1) {
      style.cssText = `left:0;top:0;transform:scale(${zoom})translate(${left},${top})`;
    } else {
      style.left = left; style.top = top;
      zoom - 1 && (style.zoom = zoom as number | string as string);
    }
    (!(Build.BTypes & ~BrowserType.Firefox) ? fullScreen
      : !(Build.BTypes & ~BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
      ? document.fullscreenElement : document.webkitIsFullScreen) && (style.position = "fixed");
    this.add_(parent, AdjustType.DEFAULT, this._lastFlash);
    return parent as (T extends true | 1 ? HTMLDialogElement : HTMLDivElement) & SafeElement;
  },
  adjust_ (this: void, event?: Event | /* enable */ 1 | /* disable */ 2): void {
    const UI = VCui, el: Element | null = !(Build.BTypes & ~BrowserType.Chrome)
          || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
        ? document.fullscreenElement : document.webkitFullscreenElement,
    box = UI.box_ as NonNullable<typeof UI.box_>,
    el2 = el && !(UI.root_ as Node).contains(el) ? el : document.documentElement as Element;
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    event === 2 ? box.remove() : el2 !== box.parentNode &&
    (Build.BTypes & ~BrowserType.Firefox ? box.appendChild.call(el2, box) : el2.appendChild(box));
    const sin = UI.styleIn_, s = sin && (sin as HTMLStyleElement).sheet;
    s && (s.disabled = false);
    if (el || event) {
      const removeEL = !el || event === 2, name = "fullscreenchange";
      if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)) {
        VKey.SetupEventListener_(0, "webkit" + name, UI.adjust_, removeEL);
      }
      if (!(Build.BTypes & BrowserType.Chrome)
          || VDom.cache_.v >= BrowserVer.MinEnsured$Document$$fullscreenElement) {
        VKey.SetupEventListener_(0, name, UI.adjust_, removeEL);
      }
    }
  },
  cssPatch_: null as [string, (css: string) => string] | null,
  ensureBorder_ (zoom?: number): void {
    zoom || (VDom.getZoom_(), zoom = VDom.wdZoom_);
    let patch = this.cssPatch_;
    if (!patch && zoom >= 1) { return; }
    let width = ("" + (Build.BTypes & BrowserType.Chrome &&
        Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo &&
          VDom.cache_.v < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        ? 1.01 : 0.51) / zoom).slice(0, 5)
      , st = this.styleIn_;
    if (!patch) {
      patch = this.cssPatch_ = ["", function (this: NonNullable<typeof VCui["cssPatch_"]>, css) {
        return css.replace(<RegExpG> /\b(border(?:-\w*-?width)?: ?)(0\.5px\b|[^;}]+\/\*!DPI\*\/)/g, "$1" + this[0]
          + "px \/\*!DPI\*\/");
      }];
    }
    if (patch[0] === width) { return; }
    patch[0] = width;
    st && this.css_(typeof st === "string" ? st : st.textContent);
  },
  createStyle_ (text?: string, css?: HTMLStyleElement): HTMLStyleElement {
    css = css || VDom.createElement_("style");
    css.type = "text/css";
    text && (css.textContent = text);
    return css;
  },
  css_ (innerCSS: string): void { this.styleIn_ = innerCSS; },
  getDocSelectable_ (): boolean {
    let sout: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = this.styleOut_;
    if (sout && sout.parentNode) { return false; }
    let gcs = getComputedStyle, st: CSSStyleDeclaration;
    if (sout = document.body) {
      st = gcs(sout);
      if ((st.userSelect || !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinUnprefixedUserSelect
            || st.webkitUserSelect) === "none") {
        return false;
      }
    }
    st = gcs(document.documentElement as HTMLHtmlElement);
    return (st.userSelect || !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinUnprefixedUserSelect
            || st.webkitUserSelect) !== "none";
  },
  toggleSelectStyle_ (enable: BOOL): void {
    let a = VCui, sout = a.styleOut_;
    if (enable ? VDom.docSelectable_ : !sout || !sout.parentNode) { return; }
    sout || (a.styleOut_ = sout = a.createStyle_(a.findCss_.s));
    enable ? (a.box_ as HTMLElement).appendChild(sout) : sout.remove();
  },
  getSelected_ (notExpectCount?: 1): [Selection, ShadowRoot | null] {
    let d = document, el: Node | null, sel: Selection | null;
    if (el = VCui.activeEl_) {
      if (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || !(Build.BTypes & ~BrowserType.Firefox)
          || el.getRootNode) {
        el = (el as Ensure<Node, "getRootNode">).getRootNode();
      } else {
        for (let pn: Node | null; pn = VDom.GetParent_(el, PNType.DirectNode); el = pn) { /* empty */ }
      }
      if (el !== d && el.nodeType === kNode.DOCUMENT_FRAGMENT_NODE
          && typeof (el as ShadowRoot).getSelection === "function") {
        sel = (el as ShadowRootWithSelection).getSelection();
        if (sel && (notExpectCount || sel.rangeCount)) {
          return [sel, el as ShadowRoot];
        }
      }
    }
    sel = getSelection();
    let offset: number, sr: ShadowRoot | null = null, sel2: Selection | null = sel
      , kTagName = "tagName" as const;
    if (!(  (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox) )) {
      const SR = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          ? window.ShadowRoot || HTMLElement.prototype.webkitCreateShadowRoot : 0;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          // tslint:disable-next-line: triple-equals
          ? typeof SR != "function" || kTagName in SR : typeof ShadowRoot != "function") {
        return [sel, null];
      }
    }
    while (sel2) {
      sel2 = null;
      el = sel.anchorNode;
      if (el && el === sel.focusNode && (offset = sel.anchorOffset) === sel.focusOffset) {
        if (kTagName in <NodeToElement> el
            && (!(Build.BTypes & ~BrowserType.Firefox)
                || (el as Element).childNodes instanceof NodeList && !("value" in (el as Element).childNodes)
            )) {
          el = (el.childNodes as NodeList | RadioNodeList)[offset];
          if (el && kTagName in <NodeToElement> el && (sr = VDom.GetShadowRoot_(el as Element))) {
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
    if (s && !VApi.lock_() && (el = VCui.activeEl_) && VDom.getEditableType_(el) === EditableType.TextBox
        && (rect = sel.getRangeAt(0).getBoundingClientRect(), !rect.width || !rect.height)) {
      s = "";
    }
    return notTrim ? s : s.trim();
  },
  removeSelection_: function (root?: VUIRoot & {getSelection?: ShadowRootWithSelection["getSelection"]}
      , justTest?: 1): boolean {
    const sel = (root && root.getSelection ? root as ShadowRootWithSelection : window).getSelection();
    if (!sel || sel.type !== "Range" || !sel.anchorNode) {
      return false;
    }
    justTest || sel.collapseToStart();
    return true;
  } as (root?: VUIRoot, justTest?: 1) => boolean,
  click_ (element: Element
      , rect?: Rect | null, modifiers?: MyMouseControlKeys | null, addFocus?: boolean | BOOL
      , button?: 0 | 2, touchMode?: /** default: false */ null | false | /** false */ 0 | true | "auto"): void {
    const a = VDom;
    rect || (rect = a.getVisibleClientRect_(element));
    const center = a.center_(rect);
    if (Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)
        && (Build.MinCVer >= BrowserVer.MinEnsuredTouchEventConstructor
            || a.cache_.v >= BrowserVer.MinEnsuredTouchEventConstructor)
        && (touchMode === !0 || touchMode && a.isInTouchMode_())) {
      a.touch_(element, center, a.touch_(element, center));
    }
    element === a.lastHovered_ || a.hover_(element, center);
    a.mouse_(element, "mousedown", center, modifiers, null, button);
    // Note: here we can check doc.activeEl only when @click is used on the current focused document
    addFocus && element !== VApi.lock_() && element !== document.activeElement &&
      !(element as Partial<HTMLInputElement>).disabled &&
      (Build.BTypes & ~BrowserType.Firefox ? typeof element.focus === "function" : element.focus) &&
      (element as HTMLElement | SVGElement).focus();
    a.mouse_(element, "mouseup", center, modifiers, null, button);
    if (button /* is the right button */
        || (element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
      if (button) { // if button is the right, then auxclick can be triggered even if element.disabled
        a.mouse_(element, "auxclick", center, modifiers, null, button);
      }
      return;
    }
    if (!(Build.BTypes & BrowserType.Firefox)) {
      a.mouse_(element, "click", center, modifiers, null, button);
      return;
    }
    const enum ActionType {
      OnlyDispatch = 0,
      DispatchAndMayFix = 1,
      FixButNotDispatch = 2,
    }
    let result: ActionType = ActionType.OnlyDispatch;
    if ((!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
        && modifiers && !modifiers.altKey_
        && a.htmlTag_(element) === "a" && (element as HTMLAnchorElement).href
        && ((element as HTMLAnchorElement).target === "_blank" || modifiers.ctrlKey_ || modifiers.metaKey_)) {
      // need to work around Firefox's popup blocker
      result = element.getAttribute("onclick") || a.clickable_.has(element)
          ? ActionType.DispatchAndMayFix : ActionType.FixButNotDispatch;
    }
    if (result >= ActionType.FixButNotDispatch
        || a.mouse_(element, "click", center, modifiers, null, button) && result) {
      // do fix
      VApi.post_({
        H: kFgReq.openUrl,
        u: (element as HTMLAnchorElement).href,
        n: ((element as HTMLAnchorElement).rel.split(<RegExpOne> /\s/) as ES6Array<string>).includes("noopener"),
        r: (modifiers as MyMouseControlKeys).shiftKey_
          || !(modifiers as MyMouseControlKeys).ctrlKey_ && !(modifiers as MyMouseControlKeys).metaKey_
          ? ReuseType.newFg : ReuseType.newBg
      });
    }
  },
  simulateSelect_ (element: Element, rect?: Rect | null, flash?: boolean
      , action?: SelectActions, suppressRepeated?: boolean): void {
    const y = scrollY;
    this.click_(element, rect, null, true);
    VDom.view_(element, y);
    // re-compute rect of element, in case that an input is resized when focused
    flash && this.flash_(element);
    if (element !== VApi.lock_()) { return; }
    // then `element` is always safe
    this._moveSel_need_safe(element as LockableElement, action);
    if (suppressRepeated === true) { VKey.suppressTail_(0); }
  },
  /** @NEED_SAFE_ELEMENTS element is LockableElement */
  _moveSel_need_safe (element: LockableElement, action: SelectActions | undefined): void {
    const elTag = element.localName, type = elTag === "textarea" ? EditableType.TextBox
        : elTag === "input" ? EditableType.input_
        : element.isContentEditable ? EditableType.rich_
        : EditableType.Default;
    if (type === EditableType.Default) { return; }
    const isBox = type === EditableType.TextBox || type === EditableType.rich_
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
  getRect_ (this: void, clickEl: Element, refer?: HTMLElementUsingMap | null): Rect | null {
    const a = VDom;
    a.getZoom_(clickEl);
    a.prepareCrop_();
    if (refer) {
      return a.getClientRectsForAreas_(refer, [], [clickEl as HTMLAreaElement]);
    }
    const rect = a.getVisibleClientRect_(clickEl),
    cr = a.getBoundingClientRect_(clickEl),
    bcr = a.padClientRect_(cr, 8);
    if (rect && a.htmlTag_(clickEl) === "img") {
      return a.getCroppedRect_(clickEl as SafeHTMLElement, rect);
    }
    return rect && !a.isContaining_(bcr, rect) ? rect
      : a.cropRectToVisible_(bcr.l, bcr.t, bcr.r, bcr.b) ? bcr : null;
  },
  _lastFlash: null as HTMLElement | null,
  flash_: function (this: {}, el: Element | null, rect?: Rect | null, lifeTime?: number, classNames?: string): void {
    const a = this as typeof VCui;
    rect || (rect = a.getRect_(el as Element));
    if (!rect) { return; }
    const flashEl = VDom.createElement_("div"), nfs = !(!(Build.BTypes & ~BrowserType.Firefox) ? fullScreen
        : !(Build.BTypes & ~BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
        ? document.fullscreenElement : document.webkitIsFullScreen);
    flashEl.className = "R Flash" + (classNames || "");
    VDom.setBoundary_(flashEl.style, rect, nfs);
    Build.BTypes & ~BrowserType.Firefox &&
    VDom.bZoom_ !== 1 && nfs && (flashEl.style.zoom = "" + VDom.bZoom_);
    a.add_(flashEl);
    a._lastFlash = flashEl;
    if (!Build.NDEBUG) {
      lifeTime = Math.max(lifeTime || 0, <number> (VCui as DomUIEx).flashTime | 0);
    }
    setTimeout(function (): void {
      a._lastFlash === flashEl && (a._lastFlash = null);
      flashEl.remove();
    }, lifeTime || GlobalConsts.DefaultRectFlashTime);
  } as {
    (el: null, rect: Rect, lifeTime?: number, classNames?: string): void;
    (el: Element): void;
  },
  _toExit: [0, 0] as Array<((this: void) => void) | 0>,
  /** key: 0 := vomnibar; 1 := help dialog */
  setupExitOnClick_ (key: number, callback: ((this: void) => void) | 0): void {
    const arr = this._toExit, diff = arr[key] !== callback;
    arr[key] = callback;
    diff && VKey.SetupEventListener_(0, "click", this.DoExitOnClick_, !(arr[0] || arr[1]));
  },
  DoExitOnClick_ (event?: Event): void {
    if (event) {
      if (// simulated events generated by page code
          (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !event.isTrusted : event.isTrusted === false)
          // simulated events generated by browser code
          || !(event as MouseEvent).detail && !(event as MouseEvent).clientY
          // Vimium C has been disabled
          || !(VCui.box_ as NonNullable<typeof VCui.box_>).parentNode
          // the click target is in Vimium C's UI
          || ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
              && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
              && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
              ? event.target === VCui.box_
              : !(event.target instanceof Element) || VCui.root_.contains(event.target))
          // Vimium C's UI has a selection with type=Range
          || VCui.removeSelection_(VCui.root_, 1)
          ) {
        return;
      }
    }
    for (const i of VCui._toExit) { i && i(); }
    VCui._toExit[1] = 0;
    VCui.setupExitOnClick_(0, 0);
  }
};
type DomUIEx = typeof VCui & { flashTime: number | undefined; };
if (!Build.NDEBUG) {
  (VCui as DomUIEx).flashTime = GlobalConsts.DefaultRectFlashTime;
}
