interface ShadowRootWithSelection extends ShadowRoot {
  getSelection(): Selection | null;
}

VDom.UI = {
  box_: null,
  styleIn_: null,
  styleOut_: null,
  UI: null as never,
  add_<T extends HTMLElement> (this: void, element: T, adjust?: AdjustType): void {
    const a = VDom.UI, box = a.box_ = VDom.createElement_("div"),
    root: VUIRoot = a.UI = VDom.createShadowRoot_(box);
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
      && !(Build.BTypes & ~BrowserType.ChromeOrFirefox) ||
    root.mode === "closed" ||
    (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0 || root !== box
      ? root as ShadowRoot : window).addEventListener("load",
    function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!VDom) { removeEventListener("load", Onload, true); return; } // safe enough even if reloaded
      const t = e.target as HTMLElement;
      if (t.parentNode === VDom.UI.UI) {
        VLib.Stop_(e); t.onload && t.onload(e);
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
      if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) &&
          box2 === a1.UI) {
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
    root.appendChild(element);
    if (a.styleIn_) {
      a.css_(a.styleIn_ as Exclude<typeof a.styleIn_, Element | null | undefined | "">);
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
      parent.appendChild(el.marker_);
    }
    const style = parent.style, zoom = VDom.bZoom_ / VDom.dScale_,
    left = offset[0] + "px", top = offset[1] + "px";
    if ((!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VDom.cache_.b === BrowserType.Firefox)
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
    return parent;
  } as DomUI["addElementList_"],
  adjust_ (event): void {
    const UI = VDom.UI, el: Element | null = !(Build.BTypes & ~BrowserType.Chrome)
          || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
        ? document.fullscreenElement : document.webkitFullscreenElement,
    box = UI.box_ as NonNullable<typeof UI.box_>,
    el2 = el && !(UI.UI as Node).contains(el) ? el : document.documentElement as Element;
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    event === 2 ? box.remove() : el2 !== box.parentNode &&
    (Build.BTypes & ~BrowserType.Firefox ? box.appendChild.call(el2, box) : el2.appendChild(box));
    const sin = UI.styleIn_, s = sin && (sin as HTMLStyleElement).sheet;
    s && (s.disabled = false);
    if (el || event) {
      const func = (el && event !== 2 ? addEventListener : removeEventListener), name = "fullscreenchange";
      if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || VDom.cache_.b === BrowserType.Chrome)) {
        func("webkit" + name, UI.adjust_, true);
      }
      if (!(Build.BTypes & BrowserType.Chrome)
          || VDom.cache_.v >= BrowserVer.MinEnsured$Document$$fullscreenElement) {
        func(name, UI.adjust_, true);
      }
    }
  },
  cssPatch_: null,
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
    let sout = this.styleOut_;
    if (enable ? VDom.docSelectable_ : !sout || !sout.parentNode) { return; }
    sout || (this.styleOut_ = sout = this.createStyle_(VFind.css_.s));
    enable ? (this.box_ as HTMLElement).appendChild(sout) : sout.remove();
  },
  getSelected_ (notExpectCount?: 1): [Selection, ShadowRoot | null] {
    let d = document, el: Node | null, sel: Selection | null;
    if (el = VScroller.current_) {
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
  click_ (element, rect, modifiers, addFocus, button, touchMode): void {
    const a = VDom;
    rect || (rect = a.getVisibleClientRect_(element));
    const center = a.center_(rect);
    if (Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || a.cache_.b === BrowserType.Chrome)
        && (touchMode || touchMode == null)
        && (Build.MinCVer >= BrowserVer.MinEnsuredTouchEventConstructor
            || a.cache_.v >= BrowserVer.MinEnsuredTouchEventConstructor)
        && (touchMode || a.isInTouchMode_())) {
      a.touch_(element, center, a.touch_(element, center));
    }
    element === a.lastHovered_ || a.hover_(element, center);
    a.mouse_(element, "mousedown", center, modifiers, null, button);
    // Note: here we can check doc.activeEl only when @click is used on the current focused document
    addFocus && element !== VEvent.lock_() && element !== document.activeElement &&
      !(element as Partial<HTMLInputElement>).disabled &&
      (Build.BTypes & ~BrowserType.Firefox ? typeof element.focus === "function" : element.focus) &&
      (element as HTMLElement | SVGElement).focus();
    a.mouse_(element, "mouseup", center, modifiers, null, button);
    if ((element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
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
    if ((!(Build.BTypes & ~BrowserType.Firefox) || a.cache_.b === BrowserType.Firefox)
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
      VPort.post_({
        H: kFgReq.openUrl,
        u: (element as HTMLAnchorElement).href,
        n: ((element as HTMLAnchorElement).rel.split(<RegExpOne> /\s/) as ES6Array<string>).includes("noopener"),
        r: (modifiers as MyMouseControlKeys).shiftKey_
          || !(modifiers as MyMouseControlKeys).ctrlKey_ && !(modifiers as MyMouseControlKeys).metaKey_
          ? ReuseType.newFg : ReuseType.newBg
      });
    }
  },
  simulateSelect_ (element, rect, flash, action, suppressRepeated): void {
    const y = scrollY;
    this.click_(element, rect, null, true);
    VDom.view_(element, y);
    // re-compute rect of element, in case that an input is resized when focused
    flash && this.flash_(element);
    if (element !== VEvent.lock_()) { return; }
    // then `element` is always safe
    this._moveSel_need_safe(element as LockableElement, action);
    if (suppressRepeated === true) { return this.suppressTail_(1); }
  },
  /** @NEED_SAFE_ELEMENTS element is LockableElement */
  _moveSel_need_safe (element, action): void {
    const type = VDom.hasTag_need_safe_(element, "textarea") ? EditableType.Editbox
        : VDom.hasTag_need_safe_(element, "input") ? EditableType.input_
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
    const a = VDom;
    a.getZoom_(clickEl);
    a.prepareCrop_();
    if (refer) {
      return a.getClientRectsForAreas_(refer, [], [clickEl as HTMLAreaElement]);
    }
    const rect = a.getVisibleClientRect_(clickEl),
    cr = a.getBoundingClientRect_(clickEl),
    bcr = a.padClientRect_(cr, 8);
    return rect && !a.isContaining_(bcr, rect) ? rect
      : a.cropRectToVisible_.apply(a, bcr as [number, number, number, number]) ? bcr : null;
  },
  _lastFlash: null,
  flash_: function (this: DomUI, el: Element | null, rect?: Rect | null, lifeTime?: number, classNames?: string): void {
    const a = this;
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
      lifeTime = Math.max(lifeTime || 0, <number> VDom.UI.flashTime | 0);
    }
    setTimeout(function (): void {
      a._lastFlash === flashEl && (a._lastFlash = null);
      flashEl.remove();
    }, lifeTime || GlobalConsts.DefaultRectFlashTime);
  } as DomUI["flash_"],
  suppressTail_ (this: void, onlyRepeated: BOOL): void {
    let func: HandlerNS.Handler<{}>, tick: number, timer: number;
    if (onlyRepeated) {
      func = function (event) {
        if (event.repeat) { return HandlerResult.Prevent; }
        VLib.remove_(this);
        return HandlerResult.Nothing;
      };
    } else {
      func = function () { tick = Date.now(); return HandlerResult.Prevent; };
      tick = Date.now() + VDom.cache_.keyboard[0];
      timer = setInterval(function (info?: TimerType.fake) { // safe-interval
        const delta = Date.now() - tick; // Note: performance.now() may has a worse resolution
        if (delta > GlobalConsts.TimeOfSuppressingTailKeydowns || delta < -99
           || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
              && info) {
          clearInterval(timer);
          VLib && VLib.remove_(func); // safe enough even if reloaded
        }
      }, (GlobalConsts.TimeOfSuppressingTailKeydowns * 0.36) | 0);
    }
    VLib.push_(func, func);
  },
  SuppressMost_ (event) {
    VKey.isEscape_(event) && VLib.remove_(this);
    const key = event.keyCode;
    return key > VKeyCodes.f10 && key < VKeyCodes.minNotFn || key === VKeyCodes.f5 ?
      HandlerResult.Suppress : HandlerResult.Prevent;
  }
};
if (!Build.NDEBUG) {
  VDom.UI.flashTime = GlobalConsts.DefaultRectFlashTime;
}
