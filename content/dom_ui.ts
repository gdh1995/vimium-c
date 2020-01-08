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
  addElementList_ <T extends boolean> (
      els: readonly HintsNS.BaseHintItem[], offset: ViewOffset, dialogContainer?: T
      ): (T extends true ? HTMLDialogElement : HTMLDivElement) & SafeElement {
    const parent = VDom.createElement_(dialogContainer ? "dialog" : "div");
    parent.className = "R HM" + (dialogContainer ? " DHM" : "") + VDom.cache_.d;
    for (const el of els) {
      parent.appendChild(el.m);
    }
    const style = parent.style, zoom = VDom.bZoom_ / (dialogContainer ? 1 : VDom.dScale_),
    left = (dialogContainer ? 0 : offset[0]) + "px", top = (dialogContainer ? 0 : offset[1]) + "px";
    if ((!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox)
        && zoom - 1) {
      style.cssText = `left:0;top:0;transform:scale(${zoom})translate(${left},${top})`;
    } else {
      style.left = left; style.top = top;
      zoom - 1 && (style.zoom = zoom as number | string as string);
    }
    VDom.fullscreenEl_unsafe_() && (style.position = "fixed");
    this.add_(parent, AdjustType.DEFAULT, this.lastFlashEl_);
    dialogContainer && (parent as HTMLDialogElement).showModal();
    return parent as (T extends true ? HTMLDialogElement : HTMLDivElement) & SafeElement;
  },
  adjust_ (this: void, event?: Event | /* enable */ 1 | /* disable */ 2): void {
    // Before Firefox 64, the mozFullscreenChangeEvent.target is document
    // so here should only use `VDom.fullscreenEl_unsafe_`
    const UI = VCui, el: Element | null = VDom.fullscreenEl_unsafe_(),
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
      } else if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox) {
        VKey.SetupEventListener_(0, "moz" + name, UI.adjust_, removeEL);
      }
      if (!(Build.BTypes & BrowserType.Chrome)
          || VDom.cache_.v >= BrowserVer.MinMaybe$Document$$fullscreenElement) {
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
      ;
    if (!patch) {
      patch = this.cssPatch_ = ["", function (this: NonNullable<typeof VCui["cssPatch_"]>, css) {
        return css.replace(<RegExpG> /\b(border(?:-\w*-?width)?: ?)(0\.5px\b|[^;}]+\/\*!DPI\*\/)/g, "$1" + this[0]
          + "px \/\*!DPI\*\/");
      }];
    }
    if (patch[0] === width) { return; }
    patch[0] = width;
    this.learnCss_(this, 1);
  },
  createStyle_ (text?: string, css?: HTMLStyleElement): HTMLStyleElement {
    css = css || VDom.createElement_("style");
    css.type = "text/css";
    text && (css.textContent = text);
    return css;
  },
  css_ (innerCSS: string): void { this.styleIn_ = innerCSS; },
  learnCss_ (src: { styleIn_: string | HTMLStyleElement | null }, force?: 1): void {
    if (!this.styleIn_ || force) {
      const srcStyleIn = (src as typeof VCui).styleIn_,
      css = srcStyleIn && (typeof srcStyleIn === "string" ? srcStyleIn : srcStyleIn.textContent);
      if (css) {
        this.css_(css);
        force || VApi.post_({H: kFgReq.learnCSS});
      }
    }
  },
  getDocSelectable_ (): boolean {
    let sout: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = this.styleOut_;
    if (sout && sout.parentNode) { return false; }
    let gcs = getComputedStyle, st: CSSStyleDeclaration;
    if (sout = document.body) {
      st = gcs(sout);
      if ((Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
            ? st.userSelect || st.webkitUserSelect : st.userSelect) === "none") {
        return false;
      }
    }
    st = gcs(document.documentElement as HTMLHtmlElement);
    return (Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
            ? st.userSelect || st.webkitUserSelect : st.userSelect) !== "none";
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
  /**
   * return HTMLElement if there's only Firefox
   * @UNSAFE_RETURNED
   */
  GetSelectionParent_unsafe_ (selected?: string): Element | null {
    let sel = VCui.getSelected_()[0], range = sel.rangeCount ? sel.getRangeAt(0) : null
      , par: Node | null = range && range.commonAncestorContainer, p0 = par;
    while (par && (par as NodeToElement as ElementToHTML).lang == null) {
      par = Build.BTypes & ~BrowserType.Firefox ? VDom.GetParent_(par, PNType.DirectNode)
            : par.parentNode as Exclude<Node["parentNode"], Window | RadioNodeList | HTMLCollection>;
    }
    // in case of Document or other ParentNode types with named getters
    par = par && (par instanceof Element || par.nodeType === kNode.ELEMENT_NODE) ? par : null;
    // now par is HTMLElement or null, and may be a <form> / <frameset>
    if (selected && p0 && p0.nodeType === kNode.TEXT_NODE && (p0 as Text).data.trim().length <= selected.length) {
      let text: HTMLElement["innerText"] | undefined;
      while (par && (text = (par as  TypeToAssert<Element, HTMLElement, "innerText">).innerText,
            !(Build.BTypes & ~BrowserType.Firefox) || typeof text === "string")
          && selected.length === (text as string).length) {
        par = VDom.GetParent_(par as HTMLElement, PNType.DirectElement);
      }
    }
    return par !== document.documentElement ? par as Element | null : null;
  },
  getSelectionText_ (notTrim?: 1): string {
    let sel = getSelection(), s = "" + sel, el: Element | null, rect: ClientRect;
    if (s && !VApi.lock_() && (el = VCui.activeEl_) && VDom.getEditableType_<0>(el) === EditableType.TextBox
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
  click_ (element: SafeElementForMouse
      , rect?: Rect | null, addFocus?: boolean | BOOL, modifiers?: MyMouseControlKeys | null
      , specialAction?: kClickAction, button?: AcceptableClickButtons
      , /** default: false */ touchMode?: null | false | /** false */ 0 | true | "auto"): void {
    if (!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && VOther === BrowserType.Edge) {
      if ((element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
        return;
      }
    }
    const a = VDom, isInDom = a.IsInDOM_, center = a.center_(rect || (rect = a.getVisibleClientRect_(element)));
    if (Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)
        && (Build.MinCVer >= BrowserVer.MinEnsuredTouchEventConstructor
            || a.cache_.v >= BrowserVer.MinEnsuredTouchEventConstructor)
        && (touchMode === !0 || touchMode && a.isInTouchMode_())) {
      let id = a.touch_(element, center);
      if (isInDom(element)) {
        a.touch_(element, center, id);
      }
      if (!isInDom(element)) { return; }
    }
    if (element !== a.lastHovered_) {
      a.hover_(element, center);
      if (!a.lastHovered_) { return; }
    }
    if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=329509 says this starts on FF65,
      // but tests also confirmed it on Firefox 63.0.3 x64, Win10
      if ((element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
        return;
      }
    }
    a.mouse_(element, "mousedown", center, modifiers, null, button);
    if (!isInDom(element)) { return; }
    // Note: here we can check doc.activeEl only when @click is used on the current focused document
    if (addFocus && element !== VApi.lock_() && element !== document.activeElement &&
        !(element as Partial<HTMLInputElement>).disabled) {
      element.focus();
      if (!isInDom(element)) { return; }
    }
    a.mouse_(element, "mouseup", center, modifiers, null, button);
    if (!isInDom(element)) { return; }
    if (button === kClickButton.second) {
        // if button is the right, then auxclick can be triggered even if element.disabled
        a.mouse_(element, "auxclick", center, modifiers, null, button);
    }
    if (button === kClickButton.second /* is the right button */
        || Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || VOther & BrowserType.Chrome)
            && (element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
      return;
    }
    const enum ActionType {
      OnlyDispatch = 0,
      DispatchAndCheckInDOM = 1,
      DispatchAndMayOpenTab = 2,
      OpenTabButNotDispatch = 3,
    }
    let result: ActionType = ActionType.OnlyDispatch, url: string | null;
    if (specialAction) {
      result = specialAction > kClickAction.MaxOpenForAnchor ? ActionType.DispatchAndCheckInDOM
          : specialAction < kClickAction.MinNotPlainOpenManually && (element as HTMLAnchorElement).target !== "_blank"
            || !(url = element.getAttribute("href"))
            || specialAction & kClickAction.forceToOpenInNewTab && url[0] === "#"
            || a.jsRe_.test(url)
          ? ActionType.OnlyDispatch
          : specialAction & kClickAction.plainMayOpenManually
            && (((element as XrayedObject<SafeHTMLElement>).wrappedJSObject || element).onclick
              || a.clickable_.has(element))
          ? ActionType.DispatchAndMayOpenTab : ActionType.OpenTabButNotDispatch;
    }
    if ((result >= ActionType.OpenTabButNotDispatch || a.mouse_(element, "click", center, modifiers) && result)
        && a.getVisibleClientRect_(element)) {
      // require element is still visible
      if (specialAction === kClickAction.forceToDblclick) {
        if (!(element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
          // use old rect
          VCui.click_(element, rect, 0, modifiers, kClickAction.none, kClickButton.primaryAndTwice);
          if (a.getVisibleClientRect_(element)) {
            a.mouse_(element, "dblclick", center, modifiers, null, kClickButton.primaryAndTwice);
          }
        }
        return;
      }
      // do fix
      const isBlank = (element as HTMLAnchorElement).target !== "blank", relAttr = element.getAttribute("rel"),
      /** {@link #FirefoxBrowserVer.Min$TargetIsBlank$Implies$Noopener}; here also apply on Chrome */
      noopener = relAttr == null ? isBlank
          : Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes || !(Build.BTypes & BrowserType.Chrome)
          ? (relAttr.split(<RegExpOne> /\s/) as ReadonlyArrayWithIncludes<string>).includes("noopener")
          : relAttr.split(<RegExpOne> /\s/).indexOf("noopener") >= 0;
      VApi.post_({
        H: kFgReq.openUrl,
        u: (element as HTMLAnchorElement).href,
        n: noopener,
        r: (modifiers as MyMouseControlKeys).shiftKey_
          || (<kClickAction> specialAction) < kClickAction.newTabFromMode
          ? ReuseType.newFg : ReuseType.newBg
      });
    }
  },
  simulateSelect_ (element: LockableElement, rect?: Rect | null, flash?: boolean
      , action?: SelectActions, suppressRepeated?: boolean): void {
    const y = scrollY;
    this.click_(element, rect, 1);
    VDom.view_(element, y);
    // re-compute rect of element, in case that an input is resized when focused
    flash && this.flash_(element);
    if (element !== VApi.lock_()) { return; }
    // then `element` is always safe
    this._moveSel_need_safe(element, action);
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
        if (Build.BTypes & BrowserType.Firefox
            && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
            && (gotoEnd || gotoStart)) {
          (element as TextElement).setSelectionRange(gotoEnd ? len : 0, gotoEnd ? len : 0);
          return;
        }
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
  lastFlashEl_: null as SafeHTMLElement | null,
  flash_: function (this: {}, el: Element | null, rect?: Rect | null, lifeTime?: number, classNames?: string
      ): (() => void) | void {
    const a = this as typeof VCui;
    rect || (rect = a.getRect_(el as Element));
    if (!rect) { return; }
    const flashEl = VDom.createElement_("div"), nfs = !VDom.fullscreenEl_unsafe_();
    flashEl.className = "R Flash" + (classNames || "");
    VDom.setBoundary_(flashEl.style, rect, nfs);
    Build.BTypes & ~BrowserType.Firefox &&
    VDom.bZoom_ !== 1 && nfs && (flashEl.style.zoom = "" + VDom.bZoom_);
    a.add_(flashEl);
    a.lastFlashEl_ = flashEl;
    if (!Build.NDEBUG) {
      type DomUIEx = typeof VCui & { flashTime: number | undefined; };
      lifeTime = lifeTime === -1 ? - 1 : Math.max(lifeTime || 0, <number> (VCui as DomUIEx).flashTime | 0);
    }
    const remove = function (): void {
      a.lastFlashEl_ === flashEl && (a.lastFlashEl_ = null);
      flashEl.remove();
    };
    lifeTime === -1 || setTimeout(remove, lifeTime || GlobalConsts.DefaultRectFlashTime);
    return remove;
  } as {
    (el: null, rect: Rect, lifeTime?: number, classNames?: string): () => void;
    (el: Element, rect?: null, lifeTime?: number, classNames?: string): (() => void) | void;
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
