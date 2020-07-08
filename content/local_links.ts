import Filter = HintsNS.Filter
import ClickType = HintsNS.ClickType
type HintSources = readonly SafeElement[] | NodeListOf<SafeElement>;
type NestedFrame = false | 0 | null | KnownIFrameElement

import { VOther, clickable_, jsRe_, doc, isImageUrl, fgCache, readyState_, chromeVer_ } from "../lib/utils"
import {
  isIFrameElement, getInputType, uneditableInputs_, getComputedStyle_, findMainSummary_, htmlTag_, isAriaNotTrue_,
  NONE, querySelector_unsafe_, isStyleVisible_, fullscreenEl_unsafe_, ElementProto, notSafe_not_ff_, docEl_unsafe_,
  GetParent_unsafe_, unsafeFramesetTag_old_cr_, isHTML_, querySelectorAll_unsafe_,
} from "../lib/dom_utils"
import {
  getVisibleClientRect_, getZoomedAndCroppedRect_, getClientRectsForAreas_, getCroppedRect_, padClientRect_,
  getBoundingClientRect_, cropRectToVisible_, bZoom_, set_bZoom_, prepareCrop_, wndSize_, isContaining_,
  isDocZoomStrange_, docZoom_, SubtractSequence_, dimSize_,
} from "../lib/rect"
import { find_box } from "./mode_find"
import { omni_box } from "./omni"
import {
  unwrap_ff, kSafeAllSelector, kEditableSelector, coreHints, addChildFrame_, mode1_, forHover_,
  isClickListened_, forceToScroll_, hintMode_, set_isClickListened_, tooHigh_, useFilter_, hintChars, hintManager,
} from "./link_hints"
import { shouldScroll_need_safe, getPixelScaleToScroll, scrolled, resetScrolled, suppressScroll } from "./scroller"
import { ui_root, ui_box } from "./dom_ui"

let frameNested_: NestedFrame = false
let ngEnabled: boolean | undefined
let jsaEnabled_: boolean | undefined
let maxLeft_ = 0
let maxTop_ = 0
let maxRight_ = 0

export { frameNested_, ngEnabled, maxLeft_, maxTop_, maxRight_ }
export const localLinkClear = (): void => { maxLeft_ = maxTop_ = maxRight_ = 0 }
export function set_frameNested_ (_newNestedFrame: NestedFrame): void { frameNested_ = _newNestedFrame }

/**
 * Must ensure only call {@link scroller.ts#VSc.shouldScroll_need_safe_} during {@link #getVisibleElements_}
 */
export const getClickable = (hints: Hint[], element: SafeHTMLElement): void => {
  let arr: Rect | null | undefined, isClickable = null as boolean | null, s: string | null
    , type = ClickType.Default, anotherEl: Element | null, clientSize = 0;
  const tag = element.localName;
  switch (tag) {
  case "a":
    isClickable = true;
    arr = checkAnchor(element as HTMLAnchorElement);
    break;
  case "audio": case "video": isClickable = true; break;
  case "frame": case "iframe":
    if (isClickable = element !== find_box) {
      arr = getVisibleClientRect_(element);
      if (element !== omni_box) {
        isClickable = addChildFrame_ ? addChildFrame_(coreHints, element as KnownIFrameElement, arr) : !!arr
      } else if (arr) {
        (arr as WritableRect).l += 12; (arr as WritableRect).t += 9;
      }
    }
    type = isClickable ? ClickType.frame : ClickType.Default;
    break;
  case "input":
    if (getInputType(element as HTMLInputElement) === "hi") { return; } // no break;
  case "textarea":
    // on C75, a <textarea disabled> is still focusable
    if ((element as TextElement).disabled && mode1_ < HintMode.max_mouse_events + 1) { return; }
    if (tag < "t" && uneditableInputs_[getInputType(element as HTMLInputElement)]) {
      const st = getComputedStyle_(element), visible = <number> <string | number> st.opacity > 0;
      isClickable = visible || !(element as HTMLInputElement).labels.length;
      if (isClickable) {
        arr = getZoomedAndCroppedRect_(element as HTMLInputElement, st, !visible);
        type = arr ? ClickType.edit : ClickType.Default;
      }
    } else if (!(element as TextElement).readOnly || mode1_ > HintMode.min_job - 1) {
      type = ClickType.edit;
      isClickable = true;
    }
    break;
  case "details":
    isClickable = isNotReplacedBy(findMainSummary_(element as HTMLDetailsElement), hints);
    break;
  case "label":
    isClickable = isNotReplacedBy((element as HTMLLabelElement).control as SafeHTMLElement | null);
    break;
  case "button": case "select":
    isClickable = !(element as HTMLButtonElement | HTMLSelectElement).disabled
      || mode1_ > HintMode.max_mouse_events;
    break;
  case "object": case "embed":
    s = (element as HTMLObjectElement | HTMLEmbedElement).type;
    if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
    if (tag !== "embed"
        && (element as HTMLObjectElement).useMap) {
      getClientRectsForAreas_(element as HTMLObjectElement, hints);
    }
    return;
  case "img":
    if ((element as HTMLImageElement).useMap) {
      getClientRectsForAreas_(element as HTMLImageElement, hints);
    }
    if ((forHover_ && (!(anotherEl = element.parentElement) || htmlTag_(anotherEl) !== "a"))
        || ((s = element.style.cursor!) ? s !== "default"
            : (s = getComputedStyle_(element).cursor!) && (s.includes("zoom") || s.startsWith("url"))
        )) {
      isClickable = true;
    }
    break;
  case "div": case "ul": case "pre": case "ol": case "code": case "table": case "tbody":
    clientSize = 1;
    break;
  }
  if (isClickable === null) {
    type = (s = element.contentEditable) !== "inherit" && s && s !== "false" ? ClickType.edit
      : (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
          ? (anotherEl = (element as XrayedObject<SafeHTMLElement>).wrappedJSObject || element).onclick
            || (anotherEl as TypeToAssert<Element, SafeHTMLElement, "onmousedown">).onmousedown
          : element.getAttribute("onclick"))
        || (s = element.getAttribute("role")) && (<RegExpI> /^(?:button|checkbox|link|radio|tab)$|^menuitem/i).test(s)
        || ngEnabled && element.getAttribute("ng-click")
        || forHover_ && element.getAttribute("onmouseover")
        || jsaEnabled_ && (s = element.getAttribute("jsaction")) && checkJSAction(s)
      ? ClickType.attrListener
      : clickable_.has(element) && isClickListened_
        && inferTypeOfListener(element, tag)
      ? ClickType.codeListener
      : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 && !element.shadowRoot ? ClickType.tabindex
      : clientSize
        && ((clientSize = element.clientHeight) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
              && clientSize + 5 < element.scrollHeight ? ClickType.scrollY
            : clientSize > /* scrollbar:12 + font:9 */ 20
              && (clientSize = element.clientWidth) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
              && clientSize + 5 < element.scrollWidth ? ClickType.scrollX
            : ClickType.Default)
        || ((s = element.className)
              && (<RegExpOne> /\b(?:[Bb](?:utto|t)n|[Cc]lose|hate|like)(?:$|[-\sA-Z_])/).test(s)
              && (!(anotherEl = element.parentElement)
                  || (s = htmlTag_(anotherEl), !s.includes("button") && s !== "a"))
            || element.hasAttribute("aria-selected")
            || element.getAttribute("data-tab") ? ClickType.classname : ClickType.Default);
  }
  if ((isClickable || type !== ClickType.Default)
      && (arr = tag === "img" ? getZoomedAndCroppedRect_(element as HTMLImageElement, null, true)
              : arr || getVisibleClientRect_(element, null))
      && (type < ClickType.scrollX
        || shouldScroll_need_safe(element
            , (((type - ClickType.scrollX) as ScrollByY) + forceToScroll_) as BOOL | 2 | 3, 0) > 0)
      && isAriaNotTrue_(element, kAria.hidden)
      && (hintMode_ > HintMode.min_job - 1 || isAriaNotTrue_(element, kAria.disabled))
  ) { hints.push([element, arr, type]); }
}

const getClickableInMaybeSVG = (hints: Hint[], element: SVGElement | OtherSafeElement): void => {
  let anotherEl: SVGElement;
  let arr: Rect | null | undefined, s: string | null
  let type: ClickType.Default | HintsNS.AllowedClickTypeForNonHTML = ClickType.Default;
  const tabIndex = (element as ElementToHTMLorSVG).tabIndex;
  {
    {
      type = clickable_.has(element)
          || tabIndex != null && (!(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
              ? ((anotherEl = unwrap_ff(element as SVGElement))
                  ).onclick || anotherEl.onmousedown
              : element.getAttribute("onclick") || element.getAttribute("onmousedown"))
          || (s = element.getAttribute("role")) && (<RegExpI> /^button$/i).test(s)
          || ngEnabled && element.getAttribute("ng-click")
          || jsaEnabled_ && (s = element.getAttribute("jsaction")) && checkJSAction(s)
        ? ClickType.attrListener
        : tabIndex != null && tabIndex >= 0 ? element.localName === "a" ? ClickType.attrListener : ClickType.tabindex
        : ClickType.Default;
      if (type && (arr = getVisibleClientRect_(element, null))
          && isAriaNotTrue_(element, kAria.hidden)
          && (hintMode_ > HintMode.min_job - 1 || isAriaNotTrue_(element, kAria.disabled))
          ) {
        hints.push([element, arr, type]);
      }
    }
  }
}

const checkJSAction = (str: string): boolean => {
  for (let s of str.split(";")) {
    s = s.trim();
    const t = s.startsWith("click:") ? (s = s.slice(6)) : s && !s.includes(":") ? s : null;
    if (t && t !== NONE && !(<RegExpOne> /\._\b(?![\$\.])/).test(t)) {
      return true;
    }
  }
  return false;
}

const checkAnchor = (anchor: HTMLAnchorElement): Rect | null => {
  // for Google search result pages
  let mayBeSearchResult = !!(anchor.rel || anchor.getAttribute("onmousedown")
        || (Build.BTypes & ~BrowserType.Chrome ? anchor.getAttribute("ping") : anchor.ping)),
  el = mayBeSearchResult && querySelector_unsafe_("h3,h4", anchor)
        || (mayBeSearchResult || anchor.childElementCount === 1) && anchor.firstElementChild as Element | null
        || null,
  tag = el ? htmlTag_(el) : "";
  return el && (mayBeSearchResult
        // use `^...$` to exclude custom tags
      ? (<RegExpOne> /^h\d$/).test(tag) && isNotReplacedBy(el as HTMLHeadingElement & SafeHTMLElement)
        ? getVisibleClientRect_(el as HTMLHeadingElement & SafeHTMLElement) : null
      : tag === "img" && !dimSize_(anchor, kDim.elClientH)
        ? getCroppedRect_(el as HTMLImageElement, getVisibleClientRect_(el as HTMLImageElement))
      : null);
}

const isNotReplacedBy = (element: SafeHTMLElement | null, isExpected?: Hint[]): boolean | null => {
  const arr2: Hint[] = [], clickListened = isClickListened_;
  if (element) {
    if (!isExpected && (element as TypeToAssert<HTMLElement, HTMLInputElement, "disabled">).disabled) { return !1; }
    isExpected && (clickable_.add(element), set_isClickListened_(!0));
    getClickable(arr2, element);
    set_isClickListened_(clickListened);
    if (!clickListened && isExpected && arr2.length && arr2[0][2] === ClickType.codeListener) {
      getClickable(arr2, element);
      if (arr2.length < 2) { // note: excluded during normal logic
        isExpected.push(arr2[0]);
      }
    }
  }
  return element ? !arr2.length : !!isExpected || null;
}

const inferTypeOfListener = (el: SafeHTMLElement, tag: string): boolean => {
  // Note: should avoid nested calling to isNotReplacedBy_
  let el2: Element | null | undefined, D = "div";
  return tag !== D && tag !== "li"
      ? tag === "tr"
        ? (el2 = querySelector_unsafe_("input[type=checkbox]", el) as SafeElement | null,
          !!(el2 && htmlTag_(el2) && isNotReplacedBy(el2 as SafeHTMLElement)))
        : tag !== "table"
      : !(el2 = el.firstElementChild as Element | null) ||
        !(!el.className && !el.id && tag === D
          || ((tag = htmlTag_(el2)) === D || tag === "span") && clickable_.has(el2)
              && el2.getClientRects().length
          || ((tag !== D
                || !!(el2 = (el2 as HTMLDivElement).firstElementChild as Element | null,
                      tag = el2 ? htmlTag_(el2) : ""))
              && (<RegExpOne> /^h\d$/).test(tag)
              && (el2 = (el2 as HTMLHeadingElement).firstElementChild as Element | null)
              && htmlTag_(el2) === "a")
        );
}

/** Note: required by {@link #kFgCmd.focusInput}, should only add LockableElement instances */
export const getEditable = (hints: Hint[], element: SafeHTMLElement): void => {
  let arr: Rect | null, s: string = element.localName;
  if ((s === "input" || s === "textarea")
      ? s < "t" && uneditableInputs_[getInputType(element as HTMLInputElement)]
        || (element as TextElement).disabled || (element as TextElement).readOnly
      : (s = element.contentEditable) === "inherit" || s === "false" || !s) {
    return
  }
  if (arr = getVisibleClientRect_(element)) {
    hints.push([element as LockableElement, arr, ClickType.edit]);
  }
}

const getLinks = (hints: Hint[], element: SafeHTMLElement): void => {
  let a: string | null | false, arr: Rect | null;
  if ((a = element.dataset.vimUrl || element.localName === "a" && element.getAttribute("href")) && a !== "#"
      && !jsRe_.test(a)) {
    if (arr = getVisibleClientRect_(element)) {
      hints.push([element, arr, ClickType.Default]);
    }
  }
}

const getImages = (hints: Hint[], element: SafeHTMLElement): void => {
  const tag = element.localName;
  let str: string | null | undefined, cr: Rect | null | undefined;
  if (tag === "img") {
    // according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement#Browser_compatibility,
    // <img>.currentSrc is since C45
    str = element.getAttribute("src") || (element as HTMLImageElement).currentSrc || element.dataset.src;
    if (str) {
      let r = padClientRect_(getBoundingClientRect_(element)), l = r.l, t = r.t, w = r.r - l, h = r.b - t
      if (w < 8 && h < 8) {
        w = h = w === h && (w ? w === 3 : l || t) ? 8 : 0;
      } else {
        w > 3 ? 0 : w = 3;
        h > 3 ? 0 : h = 3;
      }
      cr = cropRectToVisible_(l, t, l + w, t + h);
      cr = cr && isStyleVisible_(element) ? getCroppedRect_(element, cr) : null;
    }
  } else {
    if (mode1_ === HintMode.DOWNLOAD_MEDIA && (tag === "video" || tag === "audio")) {
      str = (element as unknown as HTMLImageElement).currentSrc || (element as unknown as HTMLImageElement).src;
    } else {
      str = element.dataset.src || element.getAttribute("href");
      if (!isImageUrl(str)) {
        str = element.style.backgroundImage!;
        str = str && (<RegExpI> /^url\(/i).test(str) ? str : "";
      }
    }
    cr = str ? getVisibleClientRect_(element) : cr;
  }
  cr && hints.push([element, cr, ClickType.Default]);
}

/** @safe_even_if_any_overridden_property */
export const traverse = function (selector: string
    , filter: Filter<Hint | SafeHTMLElement>, notWantVUI?: boolean
    , wholeDoc?: true): Hint[] | SafeHTMLElement[] {
  if (!Build.NDEBUG && Build.BTypes & ~BrowserType.Firefox && selector === "*") {
    selector = kSafeAllSelector; // for easier debugging
  }
  const matchAll = selector === kSafeAllSelector,
  output: Hint[] | SafeHTMLElement[] = [],
  wantClickable = filter === getClickable,
  isInAnElement = !Build.NDEBUG && !!wholeDoc && (wholeDoc as unknown as Node).nodeType === kNode.ELEMENT_NODE,
  box = !wholeDoc && fullscreenEl_unsafe_()
      || !Build.NDEBUG && isInAnElement && wholeDoc as unknown as Element
      || doc,
  isD = box === doc,
  localQuerySelectorAll = Build.BTypes & ~BrowserType.Firefox
    ? /* just smaller code */ (isD ? doc : ElementProto()).querySelectorAll : box.querySelectorAll
  let list: HintSources | null = localQuerySelectorAll.call(box, selector) as NodeListOf<SafeElement>
  wantClickable && getPixelScaleToScroll();
  if (matchAll) {
    if (ngEnabled == null) {
      ngEnabled = !!querySelector_unsafe_(".ng-scope");
    }
    if (jsaEnabled_ == null) {
      jsaEnabled_ = !!querySelector_unsafe_("[jsaction]");
    }
  }
  list = matchAll ? list
      : addChildTrees(list, localQuerySelectorAll.call(box, kSafeAllSelector) as NodeListOf<SafeElement>)
  if (!wholeDoc && tooHigh_ && isD && list.length >= GlobalConsts.LinkHintPageHeightLimitToCheckViewportFirst) {
    list = getElementsInViewport(list);
  }
  if (!Build.NDEBUG && isInAnElement) {
    // just for easier debugging
    list = [].slice.call(list);
    (list as SafeElement[]).unshift(wholeDoc as unknown as SafeElement);
  }
  let cur_scope: [HintSources, number] | undefined
  for (const tree_scopes: Array<typeof cur_scope> = [[list, 0]]; cur_scope = tree_scopes.pop(); ) {
    for (let cur_tree = cur_scope[0], i = cur_scope[1]; i < cur_tree.length; ) {
      const el = cur_tree[i++] as SafeElement & {lang?: undefined} | SafeHTMLElement;
      if (el.lang != null) {
        filter(output, el);
        const shadowRoot = (Build.BTypes & BrowserType.Chrome
              && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
              && chromeVer_ < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            ? el.webkitShadowRoot : el.shadowRoot) as ShadowRoot | null | undefined;
        if (shadowRoot) {
          tree_scopes.push([cur_tree, i])
          cur_tree = shadowRoot.querySelectorAll(selector) as NodeListOf<SafeElement>
          cur_tree = matchAll ? cur_tree
              : addChildTrees(cur_tree, shadowRoot.querySelectorAll(kSafeAllSelector) as NodeListOf<SafeElement>)
          i = 0
        }
      } else if (wantClickable) {
        /*#__NOINLINE__*/ getClickableInMaybeSVG(output as Exclude<typeof output, SafeHTMLElement[]>
            , el as SVGElement | OtherSafeElement);
      }
    }
  }
  if (wholeDoc && (Build.NDEBUG || !isInAnElement)) {
    // this requires not detecting scrollable elements if wholeDoc
    if (!(Build.NDEBUG || !wantClickable && !isInAnElement)) {
      console.log("Assert error: `!wantClickable if wholeDoc` in VHints.traverse_");
    }
    return output;
  }
  list = cur_scope = null as never
  if (Build.BTypes & ~BrowserType.Edge && ui_root
      && ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || ui_root !== ui_box)
      // now must have shadow DOM, because `UI.root_` !== `UI.box_`
      && !notWantVUI
      && (Build.NDEBUG && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
        || ui_root.mode === "closed")
      ) {
    const bz = bZoom_, notHookScroll = scrolled === 0;
    if (bz !== 1 && isD) {
      /*#__INLINE__*/ set_bZoom_(1)
      prepareCrop_(1);
    }
    for (const el of (<ShadowRoot> ui_root).querySelectorAll(selector)) {
      filter(output, el as SafeHTMLElement);
    }
    /*#__INLINE__*/ set_bZoom_(bz)
    if (notHookScroll) {
      /*#__INLINE__*/ resetScrolled()
    }
  }
  scrolled === 1 && suppressScroll();
  if (wantClickable) { deduplicate(output as Hint[]); }
  if (frameNested_ === null) { /* empty */ }
  else if (wantClickable) {
    checkNestedFrame(output as Hint[]);
  } else if (output.length > 0) {
    frameNested_ = null
  }
  return output;
} as {
  (key: string, filter: Filter<SafeHTMLElement>, notWantVUI?: true, wholeDoc?: true): SafeHTMLElement[];
  (key: string, filter: Filter<Hint>, notWantVUI?: boolean): Hint[];
}

const addChildTrees = (list: HintSources, allNodes: NodeListOf<SafeElement>): HintSources => {
  let matchWebkit = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                    && chromeVer_ < BrowserVer.MinEnsuredUnprefixedShadowDOMV0;
  let hosts: SafeElement[] = [], matched: SafeElement | undefined;
  for (let i = 0, len = allNodes.length; i < len; i++) {
    let el = allNodes[i]
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          && matchWebkit ? el.webkitShadowRoot : el.shadowRoot) {
      hosts.push(matched = el);
    } else if (addChildFrame_ && isIFrameElement(el)) {
      if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          || el !== omni_box && el !== find_box) {
        addChildFrame_(coreHints, el, getVisibleClientRect_(el))
      }
    }
  }
  return matched ? [].slice.call<ArrayLike<SafeElement>, [], SafeElement[]>(list).concat(hosts) : list;
}

const getElementsInViewport = (list: HintSources): HintSources => {
  const result: SafeElement[] = [], height = wndSize_();
  for (let i = 1, len = list.length; i < len; i++) { // skip docEl
    const el = list[i];
    const cr = getBoundingClientRect_(el);
    if (cr.bottom > 0 && cr.top < height) {
      result.push(el);
      continue;
    }
    const last = el.lastElementChild;
    if (!last) { continue; }
    const j2 = ([] as readonly Element[]).indexOf.call(list as readonly Element[], last as unknown as Element, i)
    i = j2 > 0 ? j2 - 1 : i // keep the last element, to iter deeply into boxes
  }
  return result.length > 12 ? result : list;
}

const deduplicate = (list: Hint[]): void => {
  const D = "div"
  let i = list.length, j: number, k: ClickType, s: string, notRemoveParents: boolean;
  let element: Element | null, prect: Rect, crect: Rect | null, splice: BOOL = 0
  while (0 <= --i) {
    k = list[i][2];
    notRemoveParents = k === ClickType.classname;
    /** {@see #HintsNS.AllowedClickTypeForNonHTML} */
    if (!notRemoveParents) {
      if (k === ClickType.codeListener) {
        if (s = ((element = list[i][0]) as SafeHTMLElement).localName, s === "i" || s === D) {
          if (notRemoveParents
              = i > 0 && (<RegExpOne> /\b(button|a$)/).test(list[i - 1][0].localName)
              ? (s < "i" || !element.innerHTML.trim()) && isDescendant(element, list[i - 1][0], s < "i")
              : !!(element = (element as SafeHTMLElement).parentElement)
                && htmlTag_(element) === "button" && (element as HTMLButtonElement).disabled
              ) {
            // icons: button > i; button > div@mousedown; (button[disabled] >) div@mousedown
            ++splice
          }
        } else if (s === D
            && (j = i + 1) < list.length
            && (s = list[j][0].localName, s === D || s === "a")) {
          prect = list[i][1]; crect = list[j][1];
          if (notRemoveParents
              = crect.l < prect.l + /* icon_16 */ 19 && crect.t < prect.t + 9
              && crect.l > prect.l - 4 && crect.t > prect.t - 4 && crect.b > prect.b - 9
              && (s !== "a" || element.contains(list[j][0]))) {
            // the `<a>` is a single-line box's most left element and the first clickable element,
            // so think the box is just a layout container
            // for [i] is `<div>`, not limit the height of parent `<div>`,
            // if there's more content, it should have hints for itself
            ++splice
          }
        }
      } else if (k === ClickType.tabindex
          && (element = list[i][0]).childElementCount === 1 && i + 1 < list.length) {
        element = element.lastElementChild as Element;
        prect = list[i][1];
        crect = Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(element) ? null
            : getVisibleClientRect_(element as SafeElement);
        if (crect && isContaining_(crect, prect) && htmlTag_(element)) {
          if (list[i + 1][0].parentNode !== element) {
            list[i] = [element as SafeHTMLElement, crect, ClickType.tabindex];
          } else if (list[i + 1][2] === ClickType.codeListener) {
            // [tabindex] > :listened, then [i] is only a layout container
            ++splice
          }
        }
      } else if (notRemoveParents
          = k === ClickType.edit && i > 0 && (element = list[i - 1][0]) === list[i][0].parentNode
          && element.childElementCount < 2 && element.localName === "a"
          && !(element as TypeToPick<Element, HTMLElement, "innerText">).innerText) {
        // a rare case that <a> has only a clickable <input>
        --i
        ++splice
      }
      j = i;
    }
    else if (i + 1 < list.length && list[j = i + 1][2] < ClickType.edit + 1
        && isDescendant(element = list[j][0], list[i][0], 0)
        && (list[j][2] > ClickType.edit - 1 || (<RegExpOne> /\b(button|a$)/).test((element as Hint[0]).localName))) {
      ++splice
    }
    else if (j = i - 1, i < 1 || (k = list[j][2]) > ClickType.MaxWeak
        || !isDescendant(list[i][0], list[j][0], 1)) {
      /* empty */
    } else if (isContaining_(list[j][1], list[i][1])) {
      ++splice
    } else {
      notRemoveParents = k < ClickType.MinWeak;
    }
    splice && (list.splice(i, 1), splice = 0)
    if (notRemoveParents) { continue; }
    for (; j > i - 3 && 0 < j
          && (k = list[j - 1][2]) > ClickType.MaxNotWeak && k < ClickType.MinNotWeak
          && isDescendant(list[j][0], list[j - 1][0], 1)
        ; j--) { /* empty */ }
    if (j < i) {
      list.splice(j, i - j);
      i = j;
    }
  }
  while (list.length && ((element = list[0][0]) === docEl_unsafe_() || !hintManager && element === doc.body)) {
    list.shift();
  }
}

const isDescendant = function (c: Element | null, p: Element, shouldBeSingleChild: BOOL | boolean): boolean {
  // Note: currently, not compute normal shadowDOMs / even <slot>s (too complicated)
  let i = 3, f: Node | null;
  while (0 < i-- && c
      && (c = Build.BTypes & ~BrowserType.Firefox ? GetParent_unsafe_(c, PNType.DirectElement)
              : c.parentElement as Element | null)
      && c !== p
      && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
            && unsafeFramesetTag_old_cr_ && notSafe_not_ff_!(c))
      ) { /* empty */ }
  if (c !== p
      || !shouldBeSingleChild || (<RegExpOne> /\b(button|a$)/).test(p.localName as string)) {
    return c === p;
  }
  for (; c.childElementCount === 1
        && ((f = c.firstChild!).nodeType !== kNode.TEXT_NODE || !(f as Text).data.trim())
        && ++i < 3
      ; c = c.lastElementChild as Element | null as Element) { /* empty */ }
  return i > 2;
} as (c: Element, p: Element, shouldBeSingleChild: BOOL | boolean) => boolean

export const filterOutNonReachable = (list: Hint[], notForAllClickable?: boolean | BOOL): void => {
  if (!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && VOther & BrowserType.Edge) { return; }
  if (Build.BTypes & BrowserType.Chrome && (Build.MinCVer < BrowserVer.Min$Node$$getRootNode
        || Build.MinCVer < BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint)
      && chromeVer_ < (BrowserVer.Min$Node$$getRootNode > BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint
          ? BrowserVer.Min$Node$$getRootNode : BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint)) {
    return;
  }
  if (Build.BTypes & BrowserType.Chrome && isDocZoomStrange_ && docZoom_ - 1) {
    return;
  }
  let i = list.length, el: SafeElement, root: Document | ShadowRoot, tag: string,
  fromPoint: Element | null | undefined, temp: Element | null, index2 = 0;
  const zoom = Build.BTypes & BrowserType.Chrome ? docZoom_ * bZoom_ : 1,
  zoomD2 = Build.BTypes & BrowserType.Chrome ? zoom / 2 : 0.5,
  body = doc.body, docEl = docEl_unsafe_(),
  // note: exclude the case of `fromPoint.contains(el)`, to exclude invisible items in lists
  does_hit: (x: number, y: number) => boolean = !(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
      ? (x: number, y: number): boolean => {
    fromPoint = root.elementFromPoint(x, y);
    return fromPoint ? el === fromPoint || el.contains(fromPoint) : root === doc;
  } : (x, y): boolean => {
    fromPoint = root.elementFromPoint(x, y);
    return !fromPoint || el === fromPoint || el.contains(fromPoint);
  };
  while (0 <= --i) {
    el = list[i][0];
    root = el.getRootNode!() as Document | ShadowRoot;
    const nodeType = root.nodeType, area = list[i][1],
    cx = (area.l + area.r) * zoomD2, cy = (area.t + area.b) * zoomD2;
    if (nodeType !== kNode.DOCUMENT_NODE && nodeType !== kNode.DOCUMENT_FRAGMENT_NODE
        || does_hit(cx, cy)) {
      continue;
    }
    if (Build.BTypes & BrowserType.Firefox && !fromPoint) {
      list.splice(i, 1);
      continue;
    }
    if (nodeType === kNode.DOCUMENT_FRAGMENT_NODE
        && (temp = el.lastElementChild as Element | null)
        && htmlTag_(temp) === "slot"
        && (root as ShadowRoot).host.contains(fromPoint!)) {
      continue;
    }
    if ((tag = el.localName) === "img"
        ? isDescendant(el, fromPoint!, 0)
        : tag === "area" ? fromPoint === list[i][4]
        : tag === "input" && (fromPoint! as HTMLLabelElement).control === el
          && (notForAllClickable || (i < 1 || list[i - 1][0] !== el) && (i >= list.length || list[i + 1][0] !== el))) {
      continue;
    }
    const stack = root.elementsFromPoint(cx, cy),
    elPos = stack.indexOf(el);
    if (elPos > 0 ? (index2 = stack.lastIndexOf(fromPoint!, elPos - 1)) >= 0
        : elPos < 0) {
      if (!(Build.BTypes & BrowserType.Firefox) ? elPos < 0
          : Build.BTypes & ~BrowserType.Firefox && VOther & ~BrowserType.Firefox && elPos < 0) {
        for (temp = el
            ; (temp = GetParent_unsafe_(temp, PNType.RevealSlot)) && temp !== body && temp !== docEl
            ; ) {
          if (getComputedStyle_(temp).zoom !== "1") { temp = el; break; }
        }
      } else {
        while (temp = stack[index2], index2++ < elPos
            && !(Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(temp))
            && !isAriaNotTrue_(temp as SafeElement, kAria.hidden)) { /* empty */ }
        temp = temp !== fromPoint && el.contains(temp) ? el : temp;
      }
      temp === el
      || does_hit(cx, Build.BTypes & BrowserType.Chrome ? (area.t + 2) * zoom : area.t + 2) // x=center, y=top
      || does_hit(cx, Build.BTypes & BrowserType.Chrome ? (area.b - 4) * zoom : area.b - 4) // x=center, y=bottom
      || does_hit(Build.BTypes & BrowserType.Chrome ? (area.l + 2) * zoom : area.l + 2, cy) // x=left, y=center
      || does_hit(Build.BTypes & BrowserType.Chrome ? (area.r - 4) * zoom : area.r - 4, cy) // x=right, y=center
      || list.splice(i, 1);
    }
  }
}

export const getVisibleElements = (view: ViewBox): readonly Hint[] => {
  let _i: number = mode1_, B = "[style*=background]",
  visibleElements = _i > HintMode.min_media - 1 && _i < HintMode.max_media + 1
    // not check `img[src]` in case of `<img srcset=... >`
    ? traverse(`a[href],img,div${B},span${B},[data-src]`
        + (Build.BTypes & ~BrowserType.Firefox ? kSafeAllSelector : "")
        + (_i - HintMode.DOWNLOAD_MEDIA ? "" : ",video,audio"), getImages, true)
    : _i > HintMode.min_link_job - 1 && _i < HintMode.max_link_job + 1
    ? traverse("a,[role=link]" + (Build.BTypes & ~BrowserType.Firefox ? kSafeAllSelector : ""), getLinks)
    : _i - HintMode.FOCUS_EDITABLE ? traverse(kSafeAllSelector, getClickable)
    : traverse(Build.BTypes & ~BrowserType.Firefox
          ? kEditableSelector + kSafeAllSelector : kEditableSelector, getEditable);
  if ((_i < HintMode.max_mouse_events + 1 || _i === HintMode.FOCUS_EDITABLE)
      && visibleElements.length < GlobalConsts.MinElementCountToStopPointerDetection) {
    fgCache.e && filterOutNonReachable(visibleElements, _i > HintMode.FOCUS_EDITABLE - 1);
  }
  maxLeft_ = view[2], maxTop_ = view[3], maxRight_ = view[4];
  if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
      && maxRight_ > 0) {
    _i = Math.ceil(Math.log(visibleElements.length) / Math.log(hintChars.length));
    maxLeft_ -= 16 * _i + 12;
  }
  visibleElements.reverse();

  const obj = {l: null as never, t: null as never} as {l: Rect[]; t: Rect}, func = SubtractSequence_.bind(obj);
  let r2 = null as Rect[] | null, t: Rect, reason: ClickType, visibleElement: Hint;
  for (let _len = visibleElements.length, _j = Math.max(0, _len - 16); 0 < --_len; ) {
    _j > 0 && --_j;
    visibleElement = visibleElements[_len];
    if (visibleElement[2] > ClickType.MaxNotBox) { continue; }
    let r = visibleElement[1];
    for (_i = _len; _j <= --_i; ) {
      t = visibleElements[_i][1];
      if (r.b > t.t && r.r > t.l && r.l < t.r && r.t < t.b && visibleElements[_i][2] < ClickType.MaxNotBox + 1) {
        obj.l = []; obj.t = t;
        r2 !== null ? r2.forEach(func) : func(r);
        if ((r2 = obj.l).length === 0) { break; }
      }
    }
    if (r2 === null) { continue; }
    if (r2.length > 0) {
      t = r2[0];
      t.t > maxTop_ && t.t > r.t || t.l > maxLeft_ && t.l > r.l ||
        r2.length === 1 && (t.b - t.t < 3 || t.r - t.l < 3) || (visibleElement[1] = t);
    } else if ((reason = visibleElement[2]) > ClickType.MaxNotWeak && reason < ClickType.MinNotWeak
        && visibleElement[0].contains(visibleElements[_i][0])) {
      visibleElements.splice(_len, 1);
    } else {
      visibleElement.length > 3 && (r = (visibleElement as Hint4)[3][0]);
      for (let _k = _len; _i <= --_k; ) {
        t = visibleElements[_k][1];
        if (r.l >= t.l && r.t >= t.t && r.l < t.l + 10 && r.t < t.t + 8) {
          const offset: HintOffset = [r, visibleElement.length > 3 ? (visibleElement as Hint4)[3][1] + 13 : 13];
          (visibleElements[_k] as Hint4)[3] = offset;
          _k = 0
        }
      }
    }
    r2 = null;
  }
  if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
      && GlobalConsts.MaxLengthOfShownText > 0 && useFilter_) {
    maxLeft_ -= 16 * (GlobalConsts.MaxLengthOfShownText >>> 2);
  }
  return visibleElements.reverse();
}

export const checkNestedFrame = (output?: Hint[]): void => {
  let len = output ? output.length : 0
  let res: NestedFrame, rect: Rect | undefined, rect2: Rect, element: Hint[0]
  if (len > 1) {
    res = null
  } else if (!frames.length || !isHTML_()) {
    res = false
  } else if (fullscreenEl_unsafe_()) {
    res = 0
  } else {
    if (output == null) {
      output = [];
      for (let arr = querySelectorAll_unsafe_("a,button,input,frame,iframe")! as ArrayLike<ElementToHTML>
              , i = arr.length; (len = output.length) < 2 && i-- > 0; ) {
        if (arr[i].lang != null) {
          getClickable(output, arr[i] as SafeHTMLElement)
        }
      }
    }
    res = len - 1 ? len > 0 && null
        : isIFrameElement(element = output[0][0])
          && (rect = padClientRect_(getBoundingClientRect_(element)),
              rect2 = padClientRect_(getBoundingClientRect_(docEl_unsafe_()!)),
              rect.t - rect2.t < 20 && rect.l - rect2.l < 20
              && rect2.r - rect.r < 20 && rect2.b - rect.b < 20)
          && isStyleVisible_(element) ? element as KnownIFrameElement
        : null
  }
  frameNested_ = res === false && readyState_ < "i" ? null : res;
}
