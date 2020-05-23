import {
  setupEventListener, clickable_, isTop, keydownEvents_, VOther, timeout_, fgCache, doc, isAlive_, allowScripts_,
  set_allowScripts_, jsRe_, chromeVer_, VTr, deref_,
} from "../lib/utils"
import {
  createElement_, createShadowRoot_, bZoom_, dScale_, fullscreenEl_unsafe_, docEl_unsafe_, getZoom_, wdZoom_,
  getComputedStyle_, GetParent_unsafe_, getSelection_, GetShadowRoot_, getEditableType_,
  getSelectionBoundingBox_, center_, getVisibleClientRect_, isInTouchMode_cr_, touch_cr_, IsInDOM_, lastHovered_,
  hover_, mouse_, activeEl_unsafe_, view_, prepareCrop_, getClientRectsForAreas_, notSafe_not_ff_,
  getBoundingClientRect_, padClientRect_, isContaining_, cropRectToVisible_, getCroppedRect_, setBoundary_,
  frameElement_, runJS_, isStyleVisible_, set_docSelectable_, getInnerHeight, CLK, MDW, NONE,
} from "../lib/dom_utils"
import { Stop_, suppressTail_ } from "../lib/keyboard_utils"
import { currentScrolling } from "./scroller"
import { styleSelectable } from "./mode_find"
import { unwrap_ff, isHintsActive, reinitHintsIgnoringArgs } from "./link_hints"
import { post_ } from "./port"
import { insert_Lock_ } from "./mode_insert"
import { hudTip } from "./hud"

let box_: HTMLDivElement & SafeHTMLElement | null = null
let styleIn_: HTMLStyleElement | string | null = null
let root_: VUIRoot = null as never
let cssPatch_: [string, (css: string) => string] | null = null
let lastFlashEl: SafeHTMLElement | null = null
let _toExit = [0, 0] as Array<((this: void) => void) | 0>
let flashTime = 0;

export { box_ as ui_box, root_ as ui_root, styleIn_ as style_ui, lastFlashEl }

export let addUIElement = function (element: HTMLElement, adjust_type?: AdjustType): void {
    box_ = createElement_("div");
    let root: VUIRoot = root_ = createShadowRoot_(box_),
    setupListen = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
        && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        ? 0 as never : setupEventListener;
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
      && !(Build.BTypes & ~BrowserType.ChromeOrFirefox) ||
    Build.BTypes & ~BrowserType.Edge && root.mode === "closed" ||
    setupListen(
      !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
      || Build.BTypes & ~BrowserType.Edge && root !== box_
      ? root as ShadowRoot : 0, "load",
    function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!isAlive_) { setupListen(0, "load", Onload, 1); return; } // safe enough even if reloaded
      const t = e.target as HTMLElement | Document;
      if (t.parentNode === root_) {
        Stop_(e); t.onload && t.onload(e);
      }
    }, 0, 1); // should use a listener in active mode: https://www.chromestatus.com/features/5745543795965952
    addUIElement = (element2: HTMLElement, adjust2?: AdjustType, before?: Element | null | true): void => {
      const noPar = box_!.parentNode
      adjust2 !== AdjustType.NotAdjust && !noPar && adjustUI()
      root_.insertBefore(element2, before === true ? root_.firstChild : before || null)
      adjust2 !== AdjustType.NotAdjust && noPar && adjustUI()
    };
    setUICSS = ((innerCSS): void => {
      if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) &&
          (!(Build.BTypes & ~BrowserType.Edge) || box_ === root_)) {
        box_!.id = "VimiumUI"
      }
      let el: HTMLStyleElement | null = styleIn_ = createStyle()
      setUICSS = (css) => {
        (styleIn_ as HTMLStyleElement).textContent = cssPatch_ ? cssPatch_[1](css) : css
      };
      setUICSS(innerCSS)
      root_.appendChild(el)
      /**
       * Note: Tests on C35, 38, 41, 44, 47, 50, 53, 57, 60, 63, 67, 71, 72 confirmed
       *        that el.sheet has been valid when promise.then, even on XML pages.
       * `AdjustType.NotAdjust` must be used before a certain, clear normal adjusting
       */
      // enforce webkit to build the style attribute node, and then we can remove it totally
      box_!.hasAttribute("style") && box_!.removeAttribute("style")
      if (adjust_type !== AdjustType.NotAdjust) {
        adjustUI()
      }
    });
    root.appendChild(element);
    if (styleIn_) {
      setUICSS(styleIn_ as Exclude<typeof styleIn_, Element | null | undefined | "">)
    } else {
      box_.style.display = NONE
      if (adjust_type === AdjustType.MustAdjust) {
        adjustUI()
      }
      post_({ H: kFgReq.css });
    }
} as (element: HTMLElement, adjust?: AdjustType, before?: Element | null | true) => void

export const addElementList = function <T extends boolean> (
      els: readonly HintsNS.BaseHintItem[], offset: ViewOffset, dialogContainer?: T
      ): (T extends true ? HTMLDialogElement : HTMLDivElement) & SafeElement {
    const parent = createElement_(Build.BTypes & BrowserType.Chrome && dialogContainer ? "dialog" : "div");
    parent.className = "R HM" + (Build.BTypes & BrowserType.Chrome && dialogContainer ? " DHM" : "") + fgCache.d;
    if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredES6ArrowFunction
          && Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend) {
      parent.append!(...els.map(el => el.m))
    } else {
      for (const el of els) {
        parent.appendChild(el.m);
      }
    }
    const style = parent.style,
    zoom = bZoom_ / (Build.BTypes & BrowserType.Chrome && dialogContainer ? 1 : dScale_),
    left = offset[0] + "px", top = offset[1] + "px";
    if ((!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox)
        && zoom - 1) {
      style.cssText = `left:0;top:0;transform:scale(${zoom})translate(${left},${top})`;
    } else {
      style.left = left; style.top = top;
      zoom - 1 && (style.zoom = zoom as number | string as string);
    }
    fullscreenEl_unsafe_() && (style.position = "fixed");
    addUIElement(parent, AdjustType.DEFAULT, lastFlashEl)
    if (Build.BTypes & BrowserType.Chrome) {
      dialogContainer && (parent as HTMLDialogElement).showModal();
    }
    return parent as (T extends true ? HTMLDialogElement : HTMLDivElement) & SafeElement;
}

export const adjustUI = (event?: Event | /* enable */ 1 | /* disable */ 2): void => {
    // Before Firefox 64, the mozFullscreenChangeEvent.target is document
    // so here should only use `fullscreenEl_unsafe_`
    const el: Element | null = fullscreenEl_unsafe_(),
    el2 = el && !root_.contains(el) ? el : docEl_unsafe_()!
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    event === 2 ? box_!.remove() : el2 !== box_!.parentNode &&
    /** `appendChild` should not be followed by /[\w.]*doc/: {@link ../Gulpfile.js#postUglify} */
    (Build.BTypes & ~BrowserType.Firefox ? box_!.appendChild.call(el2, box_!) : el2.appendChild(box_!));
    const sin = styleIn_, s = sin && (sin as HTMLStyleElement).sheet
    s && (s.disabled = false);
    if (el || event) {
      const removeEL = !el || event === 2, FS = "fullscreenchange";
      if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)) {
        setupEventListener(0, "webkit" + FS, adjustUI, removeEL)
      } else if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox) {
        setupEventListener(0, "moz" + FS, adjustUI, removeEL)
      }
      if (!(Build.BTypes & BrowserType.Chrome)
          || chromeVer_ >= BrowserVer.MinMaybe$Document$$fullscreenElement) {
        setupEventListener(0, FS, adjustUI, removeEL)
      }
      if (isHintsActive && removeEL) { // not need to check isAlive_
        timeout_(/*#__NOINLINE__*/ reinitHintsIgnoringArgs, 17)
      }
    }
}

export const ensureBorder = (zoom?: number): void => {
    zoom || (getZoom_(), zoom = wdZoom_);
    if (!cssPatch_ && zoom >= 1) { return; }
    let width = ("" + (
        Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        && chromeVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        ? 1.01 : 0.51) / zoom).slice(0, 5);
    if (!cssPatch_) {
      cssPatch_ = ["", (css) => {
        return css.replace(<RegExpG> /\b0\.5px|\/\*!DPI\*\/[\w.]+/g, "/*!DPI*/" + cssPatch_![0] + "px");
      }];
    }
    if (cssPatch_[0] === width) { return; }
    cssPatch_[0] = width;
    learnCSS(styleIn_, 1)
}

export const createStyle = (text?: string, css?: HTMLStyleElement): HTMLStyleElement => {
    css = css || createElement_("style");
    css.type = "text/css";
    text && (css.textContent = text);
    return css;
}

export let setUICSS = (innerCSS: string): void => { styleIn_ = innerCSS }

export const learnCSS = (srcStyleIn: typeof styleIn_, force?: 1): void => {
    if (!styleIn_ || force) {
      const
      css = srcStyleIn && (typeof srcStyleIn === "string" ? srcStyleIn : srcStyleIn.textContent);
      if (css) {
        setUICSS(css)
        force || post_({H: kFgReq.learnCSS});
      }
    }
}

export const checkDocSelectable = (): void => {
    let sout: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = styleSelectable
      , gcs = getComputedStyle_, st: CSSStyleDeclaration
      , mayTrue = !sout || !sout.parentNode;
    if (mayTrue && (sout = doc.body)) {
      st = gcs(sout);
      mayTrue = (Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
            ? st.userSelect || st.webkitUserSelect : st.userSelect) !== NONE;
    }
    set_docSelectable_(mayTrue && (st = gcs(docEl_unsafe_()!),
            Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
            ? st.userSelect || st.webkitUserSelect : st.userSelect) !== NONE)
}

export const getSelected = (notExpectCount?: 1): [Selection, ShadowRoot | null] => {
    let el: Node | null | undefined, sel: Selection | null;
    if (el = deref_(currentScrolling)) {
      if (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || !(Build.BTypes & ~BrowserType.Firefox)
          || el.getRootNode) {
        el = el.getRootNode!();
      } else {
        for (let pn: Node | null; pn = GetParent_unsafe_(el, PNType.DirectNode); el = pn) { /* empty */ }
      }
      if (el !== doc && el.nodeType === kNode.DOCUMENT_FRAGMENT_NODE
          && typeof (el as ShadowRoot).getSelection === "function") {
        sel = (el as ShadowRoot).getSelection!();
        if (sel && (notExpectCount || sel.rangeCount)) {
          return [sel, el as ShadowRoot];
        }
      }
    }
    sel = getSelection_();
    let offset: number, sr: ShadowRoot | null = null, sel2: Selection | null = sel
      , kTagName = "tagName" as const;
    if (!(  (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox) )) {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          && chromeVer_ < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          ? Image.prototype.webkitCreateShadowRoot : typeof ShadowRoot != "function") {
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
          if (el && kTagName in <NodeToElement> el && (sr = GetShadowRoot_(el as Element))) {
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
}

  /**
   * return HTMLElement if there's only Firefox
   * @UNSAFE_RETURNED
   */
export const getSelectionParent_unsafe = (selected?: string): Element | null => {
    let sel = getSelected()[0], range = sel.rangeCount ? sel.getRangeAt(0) : null
      , par: Node | null = range && range.commonAncestorContainer, p0 = par;
    while (par && (par as NodeToElement).tagName == null) {
      par = Build.BTypes & ~BrowserType.Firefox ? GetParent_unsafe_(par, PNType.DirectNode)
            : par.parentNode as Exclude<Node["parentNode"], Window | RadioNodeList | HTMLCollection>;
    }
    // now par is Element or null, and may be a <form> / <frameset>
    if (selected && p0 && p0.nodeType === kNode.TEXT_NODE && (p0 as Text).data.trim().length <= selected.length) {
      let text: HTMLElement["innerText"] | undefined;
      while (par && (text = (par as TypeToAssert<Element, HTMLElement, "innerText">).innerText,
            !(Build.BTypes & ~BrowserType.Firefox) || typeof text === "string")
          && selected.length === (text as string).length) {
        par = GetParent_unsafe_(par as HTMLElement, PNType.DirectElement);
      }
    }
    return par !== docEl_unsafe_() ? par as Element | null : null;
}

export const getSelectionText = (notTrim?: 1): string => {
    let sel = getSelection_(), s = "" + sel, el: Element | null | undefined, rect: ClientRect;
    if (s && !insert_Lock_()
        && (el = deref_(currentScrolling)) && getEditableType_<0>(el) === EditableType.TextBox
        && (rect = getSelectionBoundingBox_(sel), !rect.width || !rect.height)) {
      s = "";
    }
    return notTrim ? s : s.trim();
}

export const removeSelection = function (root?: VUIRoot & Pick<DocumentOrShadowRoot, "getSelection">, justTest?: 1
    ): boolean {
    const sel = root && root.getSelection ? root.getSelection() : getSelection_();
    if (!sel || sel.type !== "Range" || !sel.anchorNode) {
      return false;
    }
    justTest || sel.collapseToStart();
    return true;
} as (root?: VUIRoot, justTest?: 1) => boolean

export const resetSelectionToDocStart = (sel?: Selection): void => {
    (sel || getSelection_()).removeAllRanges();
}

export const click_ = (element: SafeElementForMouse
      , rect?: Rect | null, addFocus?: boolean | BOOL, modifiers?: MyMouseControlKeys | null
      , specialAction?: kClickAction, button?: AcceptableClickButtons
      , /** default: false */ touchMode?: null | false | /** false */ 0 | true | "auto"): void | 1 => {
    if (!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && VOther === BrowserType.Edge) {
      if ((element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
        return;
      }
    }
    const center = center_(rect || (rect = getVisibleClientRect_(element)));
    if (Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)
        && (Build.MinCVer >= BrowserVer.MinEnsuredTouchEventConstructor
            || chromeVer_ >= BrowserVer.MinEnsuredTouchEventConstructor)
        && (touchMode === !0 || touchMode && isInTouchMode_cr_!())) {
      let id = touch_cr_!(element, center);
      if (IsInDOM_(element)) {
        touch_cr_!(element, center, id);
      }
      if (!IsInDOM_(element)) { return; }
    }
    if (element !== deref_(lastHovered_)) {
      hover_(element, center);
      if (!lastHovered_) { return; }
    }
    if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=329509 says this starts on FF65,
      // but tests also confirmed it on Firefox 63.0.3 x64, Win10
      if ((element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
        return;
      }
    }
    mouse_(element, MDW, center, modifiers, null, button);
    if (!IsInDOM_(element)) { return; }
    // Note: here we can check doc.activeEl only when @click is used on the current focused document
    if (addFocus && element !== insert_Lock_() && element !== activeEl_unsafe_() &&
        !(element as Partial<HTMLInputElement>).disabled) {
      element.focus && element.focus();
      if (!IsInDOM_(element)) { return; }
    }
    mouse_(element, "mouseup", center, modifiers, null, button);
    if (!IsInDOM_(element)) { return; }
    if (button === kClickButton.second) {
        // if button is the right, then auxclick can be triggered even if element.disabled
        mouse_(element, "auxclick", center, modifiers, null, button);
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
      // for forceToDblclick, element can be OtherSafeElement; for 1..MaxOpenForAnchor, element must be HTML <a>
      result = specialAction > kClickAction.MaxOpenForAnchor ? ActionType.DispatchAndCheckInDOM
          : Build.BTypes & BrowserType.Firefox && specialAction < kClickAction.MinNotPlainOpenManually
                && (element as HTMLAnchorElement).target !== "_blank"
            || !(url = element.getAttribute("href"))
            || (!(Build.BTypes & BrowserType.Firefox) || specialAction & kClickAction.forceToOpenInNewTab)
                && url[0] === "#"
            || jsRe_.test(url)
          ? ActionType.OnlyDispatch
          : Build.BTypes & BrowserType.Firefox
            && specialAction & (kClickAction.plainMayOpenManually | kClickAction.openInNewWindow)
            && (unwrap_ff(element as HTMLAnchorElement).onclick
              || clickable_.has(element))
          ? ActionType.DispatchAndMayOpenTab : ActionType.OpenTabButNotDispatch;
    }
    if ((result > ActionType.OpenTabButNotDispatch - 1 || mouse_(element, CLK, center, modifiers) && result)
        && getVisibleClientRect_(element)) {
      // require element is still visible
      if (specialAction === kClickAction.forceToDblclick) {
        if (!(element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
          // use old rect
          click_(element, rect, 0, modifiers, kClickAction.none, kClickButton.primaryAndTwice)
          if (getVisibleClientRect_(element)) {
            mouse_(element, "dblclick", center, modifiers, null, kClickButton.primaryAndTwice);
          }
        }
        return;
      }
      const isBlank = (element as HTMLAnchorElement).target !== "blank", relAttr = element.getAttribute("rel"),
      /** {@link #FirefoxBrowserVer.Min$TargetIsBlank$Implies$Noopener}; here also apply on Chrome */
      noopener = relAttr == null ? isBlank
          : Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes || !(Build.BTypes & BrowserType.Chrome)
          ? relAttr.split(<RegExpOne> /\s/).includes!("noopener")
          : relAttr.split(<RegExpOne> /\s/).indexOf("noopener") >= 0,
      reuse = Build.BTypes & BrowserType.Firefox && specialAction! & kClickAction.openInNewWindow
          ? ReuseType.newWindow
          : modifiers && modifiers[3] || specialAction! < kClickAction.newTabFromMode
            ? ReuseType.newFg : ReuseType.newBg;
      post_({
        H: kFgReq.openUrl,
        u: (element as HTMLAnchorElement).href,
        f: !0,
        n: noopener,
        r: reuse
      });
      return 1;
    }
}

export const select_ = (element: LockableElement, rect?: Rect | null, show_flash?: boolean
      , action?: SelectActions, suppressRepeated?: boolean): void => {
    const y = scrollY;
    click_(element, rect, 1)
    view_(element, y);
    // re-compute rect of element, in case that an input is resized when focused
    show_flash && flash_(element)
    if (element !== insert_Lock_()) { return; }
    // then `element` is always safe
    moveSel_need_safe(element, action)
    if (suppressRepeated === true) { suppressTail_(0); }
}

  /** @NEED_SAFE_ELEMENTS element is LockableElement */
const moveSel_need_safe = (element: LockableElement, action: SelectActions | undefined): void => {
    const elTag = element.localName, type = elTag === "textarea" ? EditableType.TextBox
        : elTag === "input" ? EditableType.input_
        : element.isContentEditable ? EditableType.rich_
        : EditableType.Default;
    if (type === EditableType.Default) { return; }
    const isBox = type === EditableType.TextBox || type === EditableType.rich_
        && element.textContent.includes("\n"),
    lineAllAndBoxEnd = action === "all-input" || action === "all-line",
    gotoStart = action === "start",
    gotoEnd = !action || action === "end" || isBox && lineAllAndBoxEnd;
    if (isBox && gotoEnd && element.clientHeight + 12 < element.scrollHeight) {
      return;
    }
    // not need `this.getSelection_()`
    const sel = getSelection_();
    try {
      if (type === EditableType.rich_) {
        const range = doc.createRange();
        range.selectNodeContents(element);
        resetSelectionToDocStart(sel)
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
}

export const getRect = (clickEl: Element, refer?: HTMLElementUsingMap | null): Rect | null => {
    getZoom_(clickEl);
    prepareCrop_();
    if (refer) {
      return getClientRectsForAreas_(refer, [], [clickEl as HTMLAreaElement]);
    }
    const rect = Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(clickEl) ? null
        : getVisibleClientRect_(clickEl as SafeElement),
    cr = getBoundingClientRect_(clickEl),
    bcr = padClientRect_(cr, 8),
    rect2 = rect && !isContaining_(bcr, rect) ? rect
      : cropRectToVisible_(bcr.l, bcr.t, bcr.r, bcr.b) ? bcr : null;
    return rect2 && getCroppedRect_(clickEl, rect2);
}

export const flash_ = function (el: Element | null, rect?: Rect | null, lifeTime?: number, classNames?: string
      ): (() => void) | void {
    rect || (rect = getRect(el!))
    if (!rect) { return; }
    const flashEl = createElement_("div"), nfs = !fullscreenEl_unsafe_();
    flashEl.className = "R Flash" + (classNames || "") + (setBoundary_(flashEl.style, rect, nfs) ? " AbsF" : "");
    Build.BTypes & ~BrowserType.Firefox &&
    bZoom_ !== 1 && nfs && (flashEl.style.zoom = "" + bZoom_);
    addUIElement(flashEl)
    lastFlashEl = flashEl
    if (!Build.NDEBUG) {
      lifeTime = lifeTime === -1 ? - 1 : Math.max(lifeTime || 0, flashTime! | 0);
    }
    const remove = (): void => {
      lastFlashEl === flashEl && (lastFlashEl = null)
      flashEl.remove();
    };
    lifeTime === -1 || timeout_(remove, lifeTime || GlobalConsts.DefaultRectFlashTime);
    return remove;
} as {
    (el: null, rect: Rect, lifeTime?: number, classNames?: string): () => void;
    (el: Element, rect?: null, lifeTime?: number, classNames?: string): (() => void) | void;
}

  /** key: 0 := vomnibar; 1 := help dialog */
export const setupExitOnClick = (key: number, callback: ((this: void) => void) | 0): void => {
    const arr = _toExit, diff = arr[key] !== callback;
    arr[key] = callback;
    diff && setupEventListener(0, CLK, doExitOnClick, !(arr[0] || arr[1]));
}

export const doExitOnClick = (event?: Event): void => {
    if (event) {
      if (// simulated events generated by page code
          (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !event.isTrusted : event.isTrusted === false)
          // simulated events generated by browser code
          || !(event as MouseEvent).detail && !(event as MouseEvent).clientY
          // Vimium C has been disabled
          || !box_!.parentNode
          // the click target is in Vimium C's UI
          || ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
              && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
              && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
              ? event.target === box_
              : !(event.target instanceof Element) || root_.contains(event.target))
          // Vimium C's UI has a selection with type=Range
          || removeSelection(root_, 1)
          ) {
        return;
      }
    }
  for (const i of _toExit) { i && i() }
  _toExit[1] = 0
  setupExitOnClick(0, 0)
}

/** must be called only if having known anotherWindow is "in a same origin" */
export let getWndVApi_ff: ((anotherWindow: Window) => VApiTy | null | void) | undefined
export function set_getWndVApi_ff (_newGetWndVApi: typeof getWndVApi_ff): void { getWndVApi_ff = _newGetWndVApi }

/**
 * Return a valid `ContentWindowCore`
 * only if is a child which in fact has a same origin with its parent frame (ignore `document.domain`).
 *
 * So even if it returns a valid object, `parent.***` may still be blocked
 */
export let getParentVApi = Build.BTypes & BrowserType.Firefox ? (): VApiTy | null | void => {
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement
      ? !frameElement_() : !frameElement) {
    // (in Firefox) not use the cached version of frameElement - for less exceptions in the below code
    return;
  }
  // Note: the functionality below should keep the same even if the cached version is used - for easier debugging
  const core = getWndVApi_ff!(parent as Window);
  if ((!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox) && core) {
    /** the case of injector is handled in {@link ../content/injected_end.ts} */
    getParentVApi = () => core;
  }
  return core;
} : () => (parent as Window).VApi

export function set_getParentVApi (_newGetParVApi: () => VApiTy | null | void): void { getParentVApi = _newGetParVApi }

export const evalIfOK = (url: Pick<BgReq[kBgReq.eval], "u"> | string): boolean => {
  typeof url === "string" ? 0 : url = url.u
  if (!jsRe_.test(url)) {
    return false;
  }
  url = url.slice(11).trim();
  let el: HTMLScriptElement | undefined
  if ((<RegExpOne> /^void\s*\( ?0 ?\)\s*;?$|^;?$/).test(url)) { /* empty */ }
  else if (!(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
      ? allowScripts_ === 2 || allowScripts_ &&
        /*#__INLINE__*/ set_allowScripts_(
            (el = runJS_(VTr(kTip.removeCurScript), 0)!).parentNode ? (el.remove(), 0) : 2)
      : allowScripts_) {
    try { url = decodeURIComponent(url); } catch {}
    timeout_(Build.BTypes & BrowserType.Firefox ? runJS_.bind(0, url, 0) : runJS_.bind(0, url) as () => void, 0);
  } else {
    hudTip(kTip.failToEvalJS);
  }
  return true;
}

export const checkHidden = (cmd?: FgCmdAcrossFrames, count?: number, options?: OptionsWithForce): BOOL => {
  if (getInnerHeight() < 3 || innerWidth < 3) { return 1; }
  // here should not use the cache frameElement, because `getComputedStyle(frameElement).***` might break
  const curFrameElement_ = !isTop && (Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
          || !(Build.BTypes & ~BrowserType.Firefox) ? frameElement : frameElement_()),
  el = !isTop && (curFrameElement_ || docEl_unsafe_());
  if (!el) { return 0; }
  let box = getBoundingClientRect_(el),
  parEvents: ReturnType<typeof getParentVApi> | undefined,
  result: boolean | BOOL = !box.height && !box.width || !isStyleVisible_(el);
  if (cmd) {
    // if in a forced cross-origin env (by setting doc.domain),
    // then par.self.innerHeight works, but this behavior is undocumented,
    // so here only use `parApi.innerHeight_()` in case
    if ((Build.BTypes & BrowserType.Firefox ? (parEvents = getParentVApi()) : curFrameElement_)
        && (result || box.bottom <= 0
            || (Build.BTypes & BrowserType.Firefox && parEvents !== parent
                  ? box.top > parEvents!.i!()
                  : box.top > (parent as Window).innerHeight))) {
      Build.BTypes & BrowserType.Firefox || (parEvents = getParentVApi());
      if (parEvents
          && !parEvents.a(keydownEvents_)) {
        parEvents.f(cmd, count!, options!, 1);
        result = 1;
      }
    }
    if (result === true) { // if there's a same-origin parent, use it instead of top
      // here not suppress current cmd, in case of malformed pages;
      // the worst result is doing something in a hidden frame,
      //   which is tolerable, since only few commands do check hidden)
      options!.$forced ? (result = 0) : post_({
        H: kFgReq.gotoMainFrame, f: 1,
        c: cmd,
        n: count!, a: options!
      });
    }
  }
  return +result as BOOL;
}
