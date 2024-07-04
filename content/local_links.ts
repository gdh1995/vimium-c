import {
  clickable_, isJSUrl, doc, isImageUrl, fgCache, readyState_, chromeVer_, VTr, createRegExp, max_, OnChrome,
  math, includes_, OnFirefox, OnEdge, WithDialog, evenHidden_, set_evenHidden_, tryCreateRegExp, loc_,
  getTime, firefoxVer_, isTY
} from "../lib/utils"
import {
  isIFrameElement, uneditableInputs_, getComputedStyle_, queryHTMLChild_, htmlTag_, isAriaFalse_,  joinValidSelectors,
  kMediaTag, NONE, querySelector_unsafe_, isStyleVisible_, fullscreenEl_unsafe_, isSafeEl_, docEl_unsafe_,
  GetParent_unsafe_, unsafeFramesetTag_old_cr_, isHTML_, querySelectorAll_unsafe_, isNode_, INP, attr_s, supportInert_,
  getMediaTag, getMediaUrl, contains_s, GetShadowRoot_, parentNode_unsafe_s, testMatch, hasTag_, editableTypes_,
  getRootNode_mounted, findSelectorByHost, TryGetShadowRoot_
} from "../lib/dom_utils"
import {
  getVisibleClientRect_, getVisibleBoundingRect_, getClientRectsForAreas_, getCroppedRect_, boundingRect_,
  getBoundingClientRect_, cropRectToVisible_, bZoom_, set_bZoom_, prepareCrop_, wndSize_, isContaining_,
  isDocZoomStrange_old_cr, docZoom_, dimSize_, ViewBox, getIFrameRect
} from "../lib/rect"
import { find_box } from "./mode_find"
import { omni_box } from "./omni"
import {
  kSafeAllSelector, coreHints, addChildFrame_, mode1_, forHover_, hintOptions,
  isClickListened_, set_isClickListened_, tooHigh_, useFilter_, hintChars, hintManager
} from "./link_hints"
import { shouldScroll_s, getPixelScaleToScroll, scrolled, suppressScroll } from "./scroller"
import { ui_root, ui_box, helpBox, curModalElement, filterOutInert } from "./dom_ui"
import { generateHintText } from "./hint_filters"

export declare const enum ClickType {
  Default = 0, edit = 1,
  MaxNotWeak = 1, attrListener = 2, MinWeak = 2, codeListener = 3, classname = 4, tabindex = 5, MaxWeak = 5,
  MinNotWeak = 6, // should <= MaxNotBox
  MaxNotBox = 6, frame = 7, scrollX = 8, scrollY = 9,
}
type BaseFilter<T> = (hints: T[], element: SafeElement) => void
type HTMLFilter<T> = (hints: T[], element: SafeHTMLElement) => void
type Filter<T> = BaseFilter<T> | HTMLFilter<T>
type AllowedClickTypeForNonHTML = ClickType.attrListener | ClickType.classname | ClickType.tabindex
type HintSources = readonly SafeElement[] | NodeListOf<SafeElement>
type NestedFrame = false | 0 | null | AccessableIFrameElement
type IterableElementSet = Pick<ElementSet, "has"> & { forEach (callback: (value: Element) => void): void }

let frameNested_: NestedFrame = false
let extraClickable_: IterableElementSet | null = null
// let withClickableAttrs_: BareElementSet | null
let clickTypeFilter_: ClickType = 0
let ngEnabled_: BOOL | 2 = 2
let jsaEnabled_: BOOL = 0
let maxLeft_ = 0
let maxTop_ = 0
let maxRight_ = 0
let clickableClasses_: RegExpOne
let closableClasses_: RegExpOne
let clickableRoles_: RegExpI
let buttonOrATags_: RegExpOne

export { frameNested_, ngEnabled_, maxLeft_, maxTop_, maxRight_, closableClasses_, extraClickable_ }
export const localLinkClear = (): 0 => { return maxLeft_ = maxTop_ = maxRight_ = 0 }
export function set_frameNested_ (_newNestedFrame: NestedFrame): void { frameNested_ = _newNestedFrame }

/**
 * Must ensure only call {@link scroller.ts#VSc.shouldScroll_s_} during {@link #getVisibleElements_}
 */
const getClickable = (hints: Hint[], element: SafeHTMLElement): void => {
  let arr: Rect | null | undefined, isClickable = null as boolean | null, s: string | null
    , type = ClickType.Default, anotherEl: Element | null, clientSize = 0;
  const tag = element.localName;
  switch (tag) {
  case "a":
    arr = getVisibleClientRect_(element, null)
    arr = arr && getPreferredRectOfAnchor(element as HTMLAnchorElement) || arr
    isClickable = !!arr
    break;
  case "audio": case "video": isClickable = true; break;
  case "frame": case "iframe":
    if (isClickable = element !== find_box) {
      arr = getIFrameRect(element)
      if (element !== omni_box) {
        isClickable = addChildFrame_ && isIFrameElement(element) ? addChildFrame_(coreHints, element, arr) : !!arr
        /*#__NOINLINE__*/ detectCloseBtn(element as KnownIFrameElement)
      } else if (arr) {
        (arr as WritableRect).l += 12; (arr as WritableRect).t += 9;
      }
    }
    type = ClickType.frame
    break;
  case "input": case "textarea":
    // on C75, a <textarea disabled> is still focusable
    if ((element as TextElement).disabled && mode1_ < HintMode.max_mouse_events + 1) { /* empty */ }
    else if (tag > "t" || !uneditableInputs_[s = (element as HTMLInputElement).type]) {
      isClickable = (!(element as TextElement).readOnly || mode1_ > HintMode.min_job - 1)
          && (mode1_ < HintMode.min_string || mode1_ > HintMode.max_string
              || extraClickable_ && extraClickable_.has(element) || !!generateHintText([element as HTMLInputElement]).t)
    } else if (s !== "hidden") {
      const st = getComputedStyle_(element)
      isClickable = <number> <string | number> st.opacity > 0
      if (isClickable || <number> <string | number> st.zIndex > 0 || !(element as HTMLInputElement).labels.length) {
        arr = getVisibleBoundingRect_(element, +(!isClickable satisfies boolean) as BOOL, st)
        isClickable = !!arr
      }
    }
    type = ClickType.edit
    break;
  case "details":
    isClickable = isNotReplacedBy(queryHTMLChild_(element, "summary") as HTMLSummaryElement | null, hints)
    break;
  case "dialog":
    WithDialog && (element as HTMLDialogElement).open && element !== curModalElement && (coreHints.d = 3)
    isClickable = !1
    break
  case "label":
    isClickable = isNotReplacedBy((element as HTMLLabelElement).control as HTMLLabelableElement | null)
    break;
  case "button": case "select":
    isClickable = !(element as HTMLButtonElement | HTMLSelectElement).disabled
      || mode1_ > HintMode.max_mouse_events;
    break;
  case "object": case "embed":
    s = (element as HTMLObjectElement | HTMLEmbedElement).type;
    isClickable = !!s && s.endsWith("x-shockwave-flash")
    if (!isClickable && tag > "o" && (element as HTMLObjectElement).useMap) {
      getClientRectsForAreas_(element as HTMLObjectElement, hints);
    }
    break
  case "img":
    if ((element as HTMLImageElement).useMap) {
      getClientRectsForAreas_(element as HTMLImageElement, hints);
    }
    if ((forHover_ && (!(anotherEl = element.parentElement) || !hasTag_("a", anotherEl)))
        || ((s = element.style.cursor!) ? s !== "default"
            : (s = getComputedStyle_(element).cursor!) && (s.includes("zoom") || s.startsWith("url"))
        )) {
      isClickable = true;
    }
    break;
  case "code": case "pre":
    mode1_ > HintMode.max_mouse_events && (tag < "p" || getComputedStyle_(element).display === "block")
        && !((anotherEl = GetParent_unsafe_(element, PNType.DirectElement))
              && hints.length && hints[hints.length - 1][0] === anotherEl
              && (hasTag_("pre", anotherEl) || hasTag_("code", anotherEl)))
        && (isClickable = true)
    // no break
  case "aside": case "div": case "nav": case "ol": case "table": case "tbody": case "ul":
    clientSize = 1;
    break;
  }
  if (isClickable === null) {
    type = (s = element.contentEditable) !== "inherit" && s !== "false" ? ClickType.edit
      : (OnFirefox ? element.onclick || element.onmousedown : element.getAttribute("onclick"))
        || (s = Build.BTypes === BrowserType.Chrome as number && Build.MinCVer >= BrowserVer.MinEnsured$Element$$role
              ? element.role as Exclude<Element["role"], undefined> : element.getAttribute("role"))
            && clickableRoles_.test(s) && (
          !(s.startsWith("menu") && queryHTMLChild_(element, "ul"))
          || isNotReplacedBy(queryHTMLChild_(element, "div") as HTMLDivElement | null, hints)
        )
        || extraClickable_ !== null && extraClickable_.has(element)
        || ngEnabled_ === 1 && attr_s(element, "ng-click")
        || (OnFirefox ? 0 : element.getAttribute("onmousedown"))
        || forHover_ === 1 && attr_s(element, "onmouseover")
        || jsaEnabled_ === 1 && (s = attr_s(element, "jsaction")) && checkJSAction(s)
      ? ClickType.attrListener
      : clickable_.has(element) && isClickListened_ && /*#__NOINLINE__*/ inferTypeOfListener(element, tag)
      ? ClickType.codeListener
      : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0
        && !(OnFirefox ? element.shadowRoot : OnChrome ? GetShadowRoot_(element, 1) : GetShadowRoot_(element))
        && element !== helpBox ? ClickType.tabindex
      : clientSize !== 0 && (clientSize = element.clientHeight) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
              && clientSize + 5 < element.scrollHeight ? ClickType.scrollY
      : clientSize > /* scrollbar:12 + font:9 */ 20
              && (clientSize = element.clientWidth) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
              && clientSize + 5 < element.scrollWidth ? ClickType.scrollX
      : (((s = element.className) && clickableClasses_.test(s) ? type = ClickType.classname : tag === "li")
            && (!(anotherEl = element.parentElement)
                || (type ? (s = htmlTag_(anotherEl), !s.includes("button") && s !== "a")
                    : clickable_.has(anotherEl) && hasTag_("ul", anotherEl) && !s.includes("active")))
            || (Build.BTypes === BrowserType.Safari as number
                || !(Build.BTypes & ~(BrowserType.Chrome | BrowserType.Safari))
                   && Build.MinCVer >= BrowserVer.MinCorrectAriaSelected ? element.ariaSelected !== null
                : element.hasAttribute("aria-selected"))
            || element.getAttribute("data-tab") ? ClickType.classname : ClickType.Default);
    isClickable = type > ClickType.Default
  }
  if (isClickable === true
      && (arr = tag === "img" ? getVisibleBoundingRect_(element as HTMLImageElement, 1)
              : arr || getVisibleClientRect_(element, null)) !== null
      && (isAriaFalse_(element, kAria.hidden) || extraClickable_ && extraClickable_.has(element))
      && (mode1_ > HintMode.min_job - 1 || isAriaFalse_(element, kAria.disabled))
      && (type < ClickType.codeListener || type > ClickType.classname
          || !(s = element.getAttribute("unselectable")) || s.toLowerCase() !== "on")
      && (0 === clickTypeFilter_ || clickTypeFilter_ & (1 << type))
  ) { hints.push([element, arr, type]) }
}

const checkJSAction = (str: string): boolean => {
  for (let jsaStr of str.split(";")) {
    jsaStr = jsaStr.trim()
    jsaStr = jsaStr.startsWith("click:") ? jsaStr.slice(6) : jsaStr && !jsaStr.includes(":") ? jsaStr : NONE
    if (jsaStr !== NONE && !(<RegExpOne> /\._\b(?![\$\.])/).test(jsaStr)) {
      return true;
    }
  }
  return false;
}

/** Note: should be as pure as possible */
export const getPreferredRectOfAnchor = (anchor: HTMLAnchorElement): Rect | null => {
  // for Google search result pages
  let mayBeSearchResult = !!(anchor.rel || attr_s(anchor, "onmousedown")
        || (attr_s(anchor, "href") || "").startsWith("/url?")
        || (OnChrome ? anchor.ping : attr_s(anchor, "ping")) // on Google Chrome 96 [2022-01-22]
        || anchor.dataset.jsarwt), // on MS Edge 97
  el = mayBeSearchResult && querySelector_unsafe_("h3,h4", anchor)
        || (mayBeSearchResult || anchor.childElementCount === 1) && anchor.firstElementChild as Element | null
        || null,
  tag = el && htmlTag_(el)
  return el && (mayBeSearchResult
        // use `^...$` to exclude custom tags
      ? (<RegExpOne> /^h\d$/).test(tag!) && isNotReplacedBy(el as HTMLHeadingElement & SafeHTMLElement)
        ? getVisibleClientRect_(el as HTMLHeadingElement & SafeHTMLElement) : null
      : tag === "img" && !dimSize_(anchor, kDim.elClientH) ? getVisibleBoundingRect_(el, 1)
      : null);
}

const isNotReplacedBy = (element: HTMLSummaryElement | HTMLHeadingElement | HTMLLabelableElement
      | HTMLDivElement | null
    , isExpected?: Hint[]): boolean | null => {
  const arr2: Hint[] = [], clickListened = isClickListened_;
  if (element) {
    if (!isExpected && (element as TypeToAssert<HTMLElement, HTMLInputElement, "disabled">).disabled) { return !1; }
    isExpected && (clickable_.add(element), set_isClickListened_(!0));
    getClickable(arr2, element);
    set_isClickListened_(clickListened);
    if (!clickListened && isExpected && arr2.length && arr2[0][2] === ClickType.codeListener) {
      getClickable(arr2, element);
      if (arr2.length < 2 || arr2[1][2] > ClickType.MaxNotBox) { // note: excluded during normal logic
        isExpected.push(arr2[0]);
      }
    }
  }
  return element ? !arr2.length : !!isExpected || null;
}

const inferTypeOfListener = ((el: SafeHTMLElement, tag: "" | keyof HTMLElementTagNameMap): boolean => {
  // Note: should avoid nested calling to isNotReplacedBy_
  let el2: Element | null | undefined, D = "div" as const
  return tag !== D && tag !== "li"
      ? tag === "tr"
        ? ((el2 = el.firstElementChild as Element | null) && hasTag_("td",el2) && (el2 = queryHTMLChild_(el2, "input")),
          !!(el2 && uneditableInputs_[(<HTMLInputElement> el2).type] === 3 && isNotReplacedBy(el2 as HTMLInputElement)))
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
              && hasTag_("a", el2))
        );
}) as (el: SafeHTMLElement, tag: keyof HTMLElementTagNameMap) => boolean

const detectCloseBtn = (element: KnownIFrameElement): void => {
  const next = element.nextElementSibling as Element | null
  if (next && isSafeEl_(next) && next.textContent === "x") {
    clickable_.add(next)
  }
}

export const getEditable = (hints: Hint[], element: SafeHTMLElement): void => {
  let s: string = element.localName, asClickable = extraClickable_ && extraClickable_.has(element)
  if ((s === INP || s === "textarea")
      ? !(s < "t" && uneditableInputs_[(element as HTMLInputElement).type]
          || (element as TextElement).disabled || (element as TextElement).readOnly) || asClickable
      : isSafeEl_(element) && ((s = element.contentEditable) !== "inherit" && s !== "false" || asClickable)) {
    getIfOnlyVisible(hints, element)
  }
}

const getIfOnlyVisible = (hints: (Hint | Hint0)[], element: SafeElement): void => {
  const arr = getVisibleClientRect_(element, null)
  arr && hints.push([element as SafeElementForMouse
      , hasTag_("a", element) && getPreferredRectOfAnchor(element) || arr, ClickType.Default])
}

export const traverse = ((selector: string, options: CSSOptions & OtherFilterOptions, filter: Filter<Hint | Hint0>
    , notWantVUI?: 1, wholeDoc?: BOOL | Element, acceptNonHTML?: 1): Hint[] | Hint0[] => {

const matchSafeElements = ((selector1: string, rootNode: Element | ShadowRoot | null
    , udSelector: string | null, mayBeUnsafe?: 1): HintSources | void => {
  let list = udSelector !== " "
      ? querySelectorAll_unsafe_(udSelector || selector1, rootNode, mayBeUnsafe as never as 0) : []
  if (OnFirefox) {
    return list as NodeListOf<SafeElement> | void
  }
  return !udSelector ? list as NodeListOf<SafeElement>
    : list && ([].filter as (this: ArrayLike<Element>, filter: (el: Element) => boolean) => SafeElement[]
        ).call(list, isSafeEl_)
}) as {
  (selector: string, rootNode: ShadowRoot | HTMLDivElement, udSelector: string | null): HintSources
  (selector: string, rootNode: Element | null, udSelector: string | null, mayBeUnsafe: 1): HintSources | void
}

const createElementSet = (list: NodeListOf<Element> | Element[]): IterableElementSet | null => {
  let set: IterableElementSet | null
  if (!list.length) { set = null }
  else if (!OnChrome
      || Build.MinCVer >= BrowserVer.MinEnsured$ForOf$ForDOMListTypes
      || chromeVer_ > BrowserVer.MinEnsured$ForOf$ForDOMListTypes - 1) {
    set = new Set!(list as ArrayLike<Element> as readonly Element[])
  } else if (Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
      || (Build.MinCVer >= BrowserVer.Min$Set$Has$$forEach || chromeVer_ > BrowserVer.Min$Set$Has$$forEach - 1)
          && Set) {
    set = new Set!;
    [].forEach.call<readonly Element[], [callback: (this: ElementSet, el: Element) => any, cbSelf: ElementSet], any>(
        list as ArrayLike<Element> as readonly Element[], (set as Set<Element>).add, set as Set<Element>)
  } else {
    set = [].slice.call(list) as {} as IterableElementSet
    set.has = includes_
  }
  return set
}

const addExtraVisibleToHints = (hints: (Hint | Hint0)[], element: Element): void => {
  for (const hint of hints) { if (hint[0] === element) { return } }
  isSafeEl_(element) && getIfOnlyVisible(hints, element)
}

const addChildTrees = (parts: HintSources, allNodes: NodeListOf<SafeElement>): HintSources => {
  const local_addChildFrame_ = addChildFrame_, hosts: SafeElement[] = []
  const localNotOnEdge = !OnEdge, localOnFirefox = OnFirefox
  for (let i = 0, len = allNodes.length; i < len; i++) {
    let el = allNodes[i]
    if (localOnFirefox ? (el as any).openOrClosedShadowRoot as ShadowRoot | null
        : (!(Build.BTypes & BrowserType.Edge) || localNotOnEdge) && "lang" in el
        && (Build.BTypes & BrowserType.Chrome ? GetShadowRoot_(<HTMLElement> el, noClosedShadow)
            : GetShadowRoot_(<HTMLElement> el)) !== null
        && isSafeEl_(el)) {
      hosts.push(el)
    } else if (isIFrameElement(el) && local_addChildFrame_) {
      if (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1 || el !== omni_box && el !== find_box) {
        local_addChildFrame_(coreHints, el, getIFrameRect(el))
      }
    }
  }
  if (!hosts.length) { return parts }
  parts = ([] as SafeElement[]).slice.call(parts)
  const set = OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
      && chromeVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol ? parts : new Set!(parts)
  return parts.concat((hosts as readonly SafeElement[]).filter(
      OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
      && chromeVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol ? el => (set as SafeElement[]).indexOf(el) < 0
      :el => !(set as Set<SafeElement>).has(el)))
}

const isOtherClickable = (hints: Hint[], element: NonHTMLButFormattedElement | SafeElementWithoutFormat): void => {
  const tabIndex = (element as ElementToHTMLOrForeign).tabIndex, tag = element.localName
  let arr: Rect | null | undefined, s: string | null | undefined, par: Element | null, hasTabIdx: boolean
  let type: ClickType.Default | AllowedClickTypeForNonHTML = clickable_.has(element)
        || extraClickable_ !== null && extraClickable_.has(element)
        || (hasTabIdx = tabIndex !== void 0) && (OnFirefox
            ? (element as NonHTMLButFormattedElement).onclick ||(element as NonHTMLButFormattedElement).onmousedown
            : attr_s(element, "onclick") || attr_s(element, "onmousedown"))
        || (mode1_ > HintMode.min_string - 1 && mode1_ < HintMode.max_string + 1 && tag.endsWith("text"))
        || (s = OnChrome && Build.MinCVer >= BrowserVer.MinEnsured$Element$$role
              ? element.role : attr_s(element, "role")) && clickableRoles_.test(s)
        || ngEnabled_ === 1 && attr_s(element, "ng-click")
        || jsaEnabled_ === 1 && (s = attr_s(element, "jsaction")) && checkJSAction(s)
      ? ClickType.attrListener
      : hasTabIdx && tabIndex! >= 0 ? tag === "a" ? ClickType.attrListener : ClickType.tabindex
      : ((s = attr_s(element, "class")) && clickableClasses_.test(s)
          || tag === "svg" && getComputedStyle_(element).cursor === "pointer")
          && (par = GetParent_unsafe_(element, PNType.DirectElement)) && htmlTag_<1>(par)
          && (tag !== "svg" || getComputedStyle_(par).cursor !== "pointer")
          && !(hints.length && contains_s(hints[hints.length - 1][0], element)) ? ClickType.classname
      : ClickType.Default
  if (type !== ClickType.Default && (mode1_ < HintMode.min_media || tag !== "path")
      && (arr = getVisibleClientRect_(element, null)) !== null
      && (isAriaFalse_(element, kAria.hidden) || extraClickable_ && extraClickable_.has(element))
      && (mode1_ > HintMode.min_job - 1 || isAriaFalse_(element, kAria.disabled))
      && (0 === clickTypeFilter_ || clickTypeFilter_ & (1 << type))
      ) {
    hints.push([element, arr, type])
  }
}

  const wantClickable = filter === getClickable,
  isInAnElement = !Build.NDEBUG && !!wholeDoc && wholeDoc !== 1 && wholeDoc.tagName != null,
  traverseRoot = !wholeDoc ? fullscreenEl_unsafe_() : !Build.NDEBUG && isInAnElement && wholeDoc || null
  let matchSelector = options.match || null,
  textFilter: OtherFilterOptions["textFilter"] | void | RegExpI | RegExpOne | false = options.textFilter,
  matchAll = selector === kSafeAllSelector && !matchSelector,
  rawClosedShadow_cr = options.closedShadow,
  noClosedShadow: BOOL = OnFirefox || OnChrome && (Build.MinCVer >= BrowserVer.Min$dom$$openOrClosedShadowRoot
      || chromeVer_ > BrowserVer.Min$dom$$openOrClosedShadowRoot - 1) && rawClosedShadow_cr ? 0 : 1,
  clickableSelector = joinValidSelectors(matchAll && findSelectorByHost(options.clickable)
      , matchAll && findSelectorByHost(options.clickableOnHost) || findSelectorByHost(kTip.DefaultClickableOnHost)),
  output: Hint[] | Hint0[] = [],
  cur_arr: HintSources | null = matchSafeElements(filter !== getEditable ? selector : (matchAll = !1,
        selector = VTr(kTip.editableSelector) + (clickableSelector ? "," + clickableSelector : ""))
      , traverseRoot, matchSelector, 1) || (matchSelector = " ", [])
  const docBody_cr = OnChrome ? doc.body : null as never,
  may_nextToBody_cr = OnChrome && matchAll && noClosedShadow && !wholeDoc && !traverseRoot && bZoom_ === 1
      && rawClosedShadow_cr == null && docBody_cr && isSafeEl_(docBody_cr)
      && (Build.MinCVer >= BrowserVer.Min$dom$$openOrClosedShadowRoot
          || chromeVer_>BrowserVer.Min$dom$$openOrClosedShadowRoot-1) && docBody_cr.nextElementSibling as Element|null,
  nextToBody_cr = OnChrome && may_nextToBody_cr
      && (may_nextToBody_cr !== ui_box || may_nextToBody_cr.nextElementSibling) ? may_nextToBody_cr : null
  set_evenHidden_(options.evenIf! | (options.scroll === "force" ? kHidden.OverflowHidden : 0))
  initTestRegExps()
  if (wantClickable) {
    getPixelScaleToScroll(1)
    clickTypeFilter_ = options.typeFilter! | 0
  }
  if (matchSelector) {
    wholeDoc || (filter = getIfOnlyVisible)
  } else if (matchAll) {
    if (ngEnabled_ > 1) {
      ngEnabled_ = querySelector_unsafe_(".ng-scope") ? 1 : 0
      jsaEnabled_ = querySelector_unsafe_("[jsaction]") ? 1 : 0
    }
  }
  cur_arr = !wholeDoc && tooHigh_ && !traverseRoot
      && cur_arr.length >= GlobalConsts.LinkHintPageHeightLimitToCheckViewportFirst
      && matchAll ? ((ori_list: SafeElement[]): HintSources => {
        const centerPath = OnEdge || OnChrome && Build.MinCVer < BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint
            && chromeVer_ < BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint ? []
            : doc.elementsFromPoint(wndSize_(1) / 2, wndSize_() / 2)
        const result: SafeElement[] = [], height = wndSize_(), len = ori_list.length
        const noIncludes = OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES$Array$$Includes
            && chromeVer_ < BrowserVer.MinEnsuredES$Array$$Includes
        let i = 1, lastChild: Element | null, j2: number
        while (i < len) { // skip docEl
          const el = ori_list[i++]
          const cr = getBoundingClientRect_(el)
          if (cr.bottom > 0 && cr.top < height) {
            result.push(el)
          } else if (lastChild = el.lastElementChild as Element | null) {
            j2 = (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES$Array$$Includes
                && noIncludes ? centerPath.indexOf(el) > 0 : centerPath.includes(el)
                ) ? 0 : ori_list.indexOf(lastChild as SafeElement, i)
            i = j2 > 0 ? j2 : i // keep the last element, to iter deeply into boxes
          }
        }
        return result.length > 12 ? result : ori_list
      })(([] as SafeElement[]).slice.call(cur_arr)) : cur_arr
  const kIframes_EdgeOnly = OnEdge ? "iframe,frame" : 0
  cur_arr = matchAll ? cur_arr : addChildTrees(cur_arr
      , querySelectorAll_unsafe_(kIframes_EdgeOnly || kSafeAllSelector, traverseRoot, 1) as NodeListOf<SafeElement>)
  if (!Build.NDEBUG && isInAnElement && !matchSelector) {
    // just for easier debugging
    if (isSafeEl_(traverseRoot!)) {
      (cur_arr = ([] as SafeElement[]).slice.call(cur_arr)).unshift(traverseRoot)
    }
  }
  const checkNonHTML: BaseFilter<Hint0 | Hint> | null = wantClickable
      ? matchSelector ? <typeof getIfOnlyVisible> filter : isOtherClickable as BaseFilter<Hint> as BaseFilter<Hint0>
      : acceptNonHTML ? filter as BaseFilter<Hint0 | Hint> : null
  // const cssClickableAttrs: string = !wantClickable ? "" : `[onclick],[tabindex],[contenteditable],[role]${
  //     forHover_ ? ",[onmouseover]" : ""}${ngEnabled_ ? ",[ng-click]" : ""}${jsaEnabled_ ? ",[jsaction]" : ""
  //     },[aria-selected],[data-tab]`
  const tree_scopes: Array<typeof cur_scope> = [[cur_arr, 0
      , clickableSelector && createElementSet(querySelectorAll_unsafe_(clickableSelector, traverseRoot, 1)!) ]]
  const localBZoom = bZoom_
  let cur_scope: [HintSources, number, IterableElementSet | null] | undefined, cur_tree: HintSources, cur_ind: number
  for (; cur_scope = tree_scopes.pop(); ) {
    for ([cur_tree, cur_ind, extraClickable_] = cur_scope; cur_ind < cur_tree.length; ) {
      const el: SafeElement = cur_tree[cur_ind++]
      if (Build.BTypes & BrowserType.Chrome && el === nextToBody_cr) {
        noClosedShadow = 0
        if (localBZoom !== 1 && !traverseRoot) { set_bZoom_(1); prepareCrop_(1) }
      }
      if ("lang" in (el as ElementToHTML)) {
        filter(output, el as SafeHTMLElement)
        const shadow = !(Build.BTypes & BrowserType.Edge)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredUnprefixedShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            ? noClosedShadow === 1 ? (el as SafeHTMLElement).shadowRoot as ShadowRoot | null
              : !(Build.BTypes & ~BrowserType.Firefox) ? (el as any).openOrClosedShadowRoot as ShadowRoot | null
              : GetShadowRoot_(el as SafeHTMLElement, 0)
            : Build.BTypes & BrowserType.Chrome ? GetShadowRoot_(el as SafeHTMLElement, noClosedShadow)
            : GetShadowRoot_(el as SafeHTMLElement)
        if (shadow !== null) {
          if (filter === getIfOnlyVisible) {
            const last = output.pop()
            last === void 0 || last[0] === el && !testMatch(matchSelector!, last[0]) || (output as Hint0[]).push(last)
          }
          tree_scopes.push([cur_tree, cur_ind, extraClickable_])
          cur_tree = matchSafeElements(selector, shadow, matchSelector)
          cur_tree = matchAll ? cur_tree : addChildTrees(cur_tree
              , querySelectorAll_unsafe_(kIframes_EdgeOnly || kSafeAllSelector, shadow) as NodeListOf<SafeElement>)
          cur_ind = 0
          extraClickable_ = clickableSelector && createElementSet(querySelectorAll_unsafe_(clickableSelector, shadow)!)
        }
      } else if (checkNonHTML !== null) {
        checkNonHTML(output, el)
      }
    }
    if (extraClickable_ && !wantClickable) {
      extraClickable_.forEach(addExtraVisibleToHints.bind(0, output))
    }
  }
  cur_scope = extraClickable_ = cur_tree = cur_arr = null as never
  set_evenHidden_(kHidden.None)
  while (output.length
      && (output[0][0] === docEl_unsafe_() || !hintManager && output[0][0] === (OnChrome ? docBody_cr : doc.body))) {
    output.shift()
  }
  if (Build.NDEBUG ? wholeDoc : wholeDoc && !isInAnElement) {
    // this requires not detecting scrollable elements if wholeDoc
    if (!(Build.NDEBUG || !wantClickable && !isInAnElement)) {
      console.log("Assert error: `!wantClickable if wholeDoc` in VHints.traverse_");
    }
  } else {
  if (wantClickable && !matchSelector) { // deduplicate
    ((list: Hint[]): void => {
  const D = "div"
  let i = list.length, j: number = 0, k: ClickType, s: string, notRemoveParents: boolean;
  let element: Element | null, prect: Rect, crect: Rect | null, splice = 0
  let shadowRoot: ShadowRoot | null
  for (; j < i; ) {
    k = list[j][2];
    if (k > ClickType.scrollX - 1 && shouldScroll_s(list[j][0], (<ScrollByY> (k - ClickType.scrollX)
          + <0 | 2> (evenHidden_ & kHidden.OverflowHidden)) as BOOL | 2 | 3, 0) < 1) {
      list.splice(j, 1), i--
    } else {
      j++
    }
  }
  scrolled === 1 && suppressScroll()
  while (0 <= --i) {
    k = list[i][2];
    notRemoveParents = k === ClickType.classname;
    if ((notRemoveParents || k === ClickType.codeListener)
        && (shadowRoot = OnChrome ? TryGetShadowRoot_(list[i][0], 1) : TryGetShadowRoot_(list[i][0]))
        && i + 1 < list.length && list[j = i + 1][0].parentNode === shadowRoot
        && isContaining_(list[i][1], list[j][1])
        && (querySelectorAll_unsafe_(VTr(kTip.visibleElementsInScopeChildren), shadowRoot)!).length === 1) {
      notRemoveParents = 0 < ++splice
    }
    /** @link AllowedClickTypeForNonHTML */
    else if (!notRemoveParents) {
      if (k === ClickType.codeListener) {
        if (s = ((element = list[i][0]) as SafeHTMLElement).localName, s === "i" || s === D) {
          if (notRemoveParents
              = i > 0 && buttonOrATags_.test(list[i - 1][0].localName)
              ? (s < "i" || !element.firstChild) && isDescendant(element, list[i - 1][0], +(s < "i") as BOOL)
              : !!(element = (element as SafeHTMLElement).parentElement)
                && hasTag_("button", element) && element.disabled
              ) {
            // icons: button > i; button > div@mousedown; (button[disabled] >) div@mousedown
            ++splice
          }
        }
        if (s[0] === "h" && (<RegExpOne> /^h\d$/).test(s)) {
          if (i > 0 && ((k = list[i - 1][2]) < ClickType.MinNotWeak + 1 && k !== ClickType.edit)
              && (element = list[i - 1][0]).childElementCount === 1
              && getComputedStyle_(element).display === "inline"
              && isDescendant(list[i][0], element, 0)) {
            splice = i--
          }
        } else if (s === D && !splice
            && (j = i + 1) < list.length
            && (s = list[j][0].localName, s === D || s === "a")) {
          prect = list[i][1]; crect = list[j][1];
          if (notRemoveParents
              = crect.l < prect.l + /* icon_16 */ 19 && crect.t < prect.t + 9
              && crect.l > prect.l - 4 && crect.t > prect.t - 4 && crect.b > prect.b - 9
              && (s !== "a" || contains_s(element as SafeHTMLElement, list[j][0]))) {
            // the `<a>` is a single-line box's most left element and the first clickable element,
            // so think the box is just a layout container
            // for [i] is `<div>`, not limit the height of parent `<div>`,
            // if there's more content, it should have hints for itself
            ++splice
          }
        }
      } else if (k === ClickType.tabindex
          && (element = list[i][0]).childElementCount === 1 && i + 1 < list.length) {
        element = element.firstElementChild as Element
        prect = list[i][1];
        crect = isSafeEl_(element) ? getVisibleClientRect_(element) : null
        if (crect && isContaining_(crect, prect) && htmlTag_<1>(element)) {
          if (parentNode_unsafe_s(list[i + 1][0]) !== element) {
            list[i] = [element, crect, ClickType.tabindex];
          } else if (list[i + 1][2] === ClickType.codeListener) {
            // [tabindex] > :listened, then [i] is only a layout container
            ++splice
          }
        }
      } else if (notRemoveParents
          = k === ClickType.edit && i > 0 && (element = list[i - 1][0]) === parentNode_unsafe_s(list[i][0])
          && element.childElementCount < 2 && hasTag_("a", element) && !(element as SafeHTMLElement).innerText) {
        // a rare case that <a> has only a clickable <input>
        splice = i--
      }
      j = i;
    }
    else if (i + 1 < list.length && list[j = i + 1][2] < ClickType.MinWeak
        && isDescendant(element = list[j][0], list[i][0], 0)
        && (list[j][2] > ClickType.edit - 1 || buttonOrATags_.test((element as Hint[0]).localName))) {
      ++splice
    }
    else if (j = i - 1, i < 1 || (k = list[j][2]) > ClickType.MaxWeak
        || !isDescendant(element = list[i][0], list[j][0], 1)) {
      if (k < ClickType.MinNotWeak && k > ClickType.MaxNotWeak && i && list[j][0].localName === "ul"
          && isDescendant(element!, list[j][0], 0) && element!.localName === "li") {
        splice = i--
      }
      /* empty */
    } else if (notRemoveParents = k < ClickType.MinWeak) {
      splice = +isContaining_(list[j][1], list[i][1])
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
    })(output as Hint[])
  }
  if (frameNested_ === null) { /* empty */ }
  else if (wantClickable) {
    checkNestedFrame(output as Hint[])
  } else if (output.length > 0) {
    frameNested_ = null
  }
  }
  output = excludeHints(output as Hint0[], options, wantClickable)
  if (textFilter) {
    cur_ind = (textFilter = textFilter + "" as Extract<typeof textFilter, string>).lastIndexOf("/")
    textFilter = cur_ind > 1 && textFilter[0] === "/" && tryCreateRegExp(
        textFilter.slice(1, cur_ind), textFilter.slice(cur_ind + 1).replace("g", "") as "" | "i")
    if (textFilter) {
      output = (output as (Hint | [Hint0[0]])[]).filter((hint): boolean => {
        let text: string | undefined
        return hint.length > 2 && (hint[2] === ClickType.edit || hint[2]! > ClickType.MaxNotBox)
            || (textFilter as RegExpOne).test((text = (hint[0] as TypeToPick<SafeElement, SafeHTMLElement, "innerText">
                  ).innerText) !== void 0 ? text : hint[0].textContent)
      })
    }
  }
  if (!OnFirefox && !OnEdge && ui_root && !wholeDoc && (!OnChrome || noClosedShadow === 1)
      && (OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0 || ui_root !== ui_box)
      && (Build.NDEBUG && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
          ? !notWantVUI : !notWantVUI && ui_root.mode === "closed")) {
    if (localBZoom !== 1 && !traverseRoot) { set_bZoom_(1); prepareCrop_(1) }
    cur_arr = querySelectorAll_unsafe_(selector, ui_root) as NodeListOf<SafeElement>
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes) {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < cur_arr.length; i++) { htmlTag_(cur_arr[i]) && filter(output, cur_arr[i] as SafeHTMLElement) }
    } else {
      for (const i of cur_arr as ArrayLike<Element> as Element[]) { htmlTag_<1>(i) && filter(output, i) }
    }
    set_bZoom_(localBZoom)
  }
  clickTypeFilter_ = 0
  return output
}) as {
  (selector: string, options: CSSOptions & OtherFilterOptions, filter: Filter<Hint0>, notWantVUI: 1
      , wholeDoc: 1 | boolean, acceptNonHTML?: 1): Hint0[]
  (selector: string, options: CSSOptions& OtherFilterOptions, filter: Filter<Hint>, notWantVUI?: 1
      , wholeDoc?: 0, acceptNonHTML?: 1): Hint[]
}

export const excludeHints = (output: Hint0[], options: CSSOptions, wantClickable: boolean | 1): Hint0[] => {
  const excl2: "css-selector" | void | false = findSelectorByHost(options.excludeOnHost)
      || (wantClickable && mode1_ < HintMode.min_job && !options.match
          && (<RegExpOne> /^\/s($|earch)/).test(loc_.pathname) && findSelectorByHost(kTip.searchResults))
  const excludedSelector = joinValidSelectors(findSelectorByHost(options.exclude), excl2)
  return excludedSelector && output.filter(hint => !testMatch(excludedSelector as "css-selector", hint[0])) || output
}

const isDescendant: (c: Element, p: Element, shouldBeSingleChild: BOOL) => boolean = (c: Element | null, p, sc) => {
  // Note: currently, not compute normal shadowDOMs / even <slot>s (too complicated)
  let i = 3, f: Node | null;
  while (0 < i-- && c !== null
      && (c = OnFirefox ? c.parentElement as Element | null : GetParent_unsafe_(c, PNType.DirectElement)) !== null
      && !(OnChrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
            ? c === p || unsafeFramesetTag_old_cr_ !== 0 && !isSafeEl_(c) : c === p)
      ) { /* empty */ }
  if (c !== p || sc === 0 || buttonOrATags_.test(p.localName as string)) {
    return c === p;
  }
  for (; c.childElementCount === 1 && !(isNode_(f = c.firstChild!, kNode.TEXT_NODE) && f.data.trim()) && ++i < 3
      ; c = c.firstElementChild as Element | null as Element) { /* empty */ }
  return i > 2;
}

export const filterOutNonReachable = (list: Hint[], notForAllClickable?: boolean | BOOL
    , useMatch?: HintsNS.Options["match"]): void | boolean => {
  const zoom = OnChrome ? docZoom_ * bZoom_ : 1, zoomD2 = OnChrome ? zoom / 2 : 0.5, start = getTime(),
  body = doc.body, docEl = docEl_unsafe_(),
  // note: exclude the case of `fromPoint.contains(el)`, to exclude invisible items in lists
  does_hit: (x: number, y: number) => boolean = OnFirefox ? (x, y): boolean => {
    fromPoint = root.elementFromPoint(x, y);
    return fromPoint ? el === fromPoint || contains_s(el, fromPoint) : root === doc
  } : (x, y): boolean => {
    fromPoint = root.elementFromPoint(x, y);
    return !fromPoint || el === fromPoint || contains_s(el, fromPoint)
  };
  let i = list.length, el: SafeElement, root: Document | ShadowRoot,
  fromPoint: Element | null | undefined, temp: Element | null, now = start
  if (OnEdge
      || OnChrome && (Build.MinCVer < BrowserVer.Min$Node$$getRootNode
              || Build.MinCVer < BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint)
          && chromeVer_ < (BrowserVer.Min$Node$$getRootNode >= // lgtm [js/syntax-error]
                BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint // lgtm [js/syntax-error]
              ? BrowserVer.Min$Node$$getRootNode // lgtm [js/syntax-error]
              : BrowserVer.Min$DocumentOrShadowRoot$$elementsFromPoint) // lgtm [js/syntax-error]
      || OnChrome && Build.MinCVer < BrowserVer.MinDevicePixelRatioNotImplyZoomOfDocEl
          && isDocZoomStrange_old_cr && docZoom_ - 1) { // lgtm [js/syntax-error]
    return
  }
  initTestRegExps() // in case of `isDescendant(..., ..., 1)`
  const hasInert = OnChrome && Build.MinCVer >= BrowserVer.MinEnsured$HTMLElement$$inert ? isHTML_() : supportInert_!()
  let hasTable: 1 | 2 | undefined
  while (0 <= --i && now - start < GlobalConsts.ElementsFromPointTakesTooSlow) {
    i & 63 || (now = getTime())
    el = list[i][0];
    root = getRootNode_mounted(el as EnsuredMountedElement & typeof el)
    const nodeType = root.nodeType, area = list[i][1],
    cx = (area.l + area.r) * zoomD2, cy = (area.t + area.b) * zoomD2;
    if (does_hit(cx, cy) || nodeType !== kNode.DOCUMENT_NODE && nodeType !== kNode.DOCUMENT_FRAGMENT_NODE) {
      continue;
    }
    if (OnFirefox && !fromPoint) {
      list.splice(i, 1);
      continue;
    }
    if (nodeType === kNode.DOCUMENT_FRAGMENT_NODE
        && (temp = el.lastElementChild as Element | null) && hasTag_("slot", temp)
        && contains_s(root.host as SafeElement, fromPoint!)) {
      continue;
    }
    type MayBeLabel = TypeToAssert<Element, HTMLLabelElement, "control">;
    const tag = htmlTag_(el), mediaTag = getMediaTag(tag)
    if (mediaTag === kMediaTag.img ? isDescendant(el, fromPoint!, 0)
        : tag === "area" ? fromPoint === list[i][4]
        : tag === INP ? ((OnFirefox ? !hasTag_("label", fromPoint!)
                : !hasTag_("label", fromPoint!) && isSafeEl_(fromPoint!)
              && fromPoint!.parentElement || fromPoint!) as MayBeLabel).control === el
          && (notForAllClickable
              || (i < 1 || list[i - 1][0] !== el) && (i + 2 > list.length || list[i + 1][0] !== el))
        : mediaTag === kMediaTag.otherMedias || !tag && (el as ElementToSVG).ownerSVGElement) {
      continue;
    }
    if (hasInert && !editableTypes_[tag] && el.closest!("[inert]")) { continue }
    if (tag === "label" && hasTag_(INP, fromPoint!) && (el as HTMLLabelElement).control === fromPoint!) {
      useMatch || (list[i][0] = fromPoint! as HTMLInputElement)
      continue
    }
    const small = area.r - area.l < 17 || area.b - area.t < 17
    if (!hasTable) {
      hasTable = OnChrome && Build.MinCVer < BrowserVer.Min$Element$$closest
          && chromeVer_ < BrowserVer.Min$Element$$closest ? 1
          : querySelector_unsafe_("table") ? 2 : 1
    }
    if ((small || hasTable === 2 && el!.closest!("table")) && isSafeEl_(fromPoint!) && !contains_s(fromPoint, el)) {
      list.splice(i, 1)
      continue
    }
    now = i & 3 ? now : getTime()
    let index2 = 0
    const stack = root.elementsFromPoint(cx, cy), elPos = stack.indexOf(el)
    if (elPos < 0 && small) { list.splice(i, 1) }
    else if (elPos < 1 ? elPos < 0 : (index2 = stack.lastIndexOf(fromPoint!, elPos - 1)) >= 0
        || isSafeEl_(stack[0]) && contains_s(stack[0], fromPoint!) && (index2 = 0, 1)) {
      if (!OnFirefox && elPos < 0) {
        for (temp = el; (temp = GetParent_unsafe_(temp, PNType.RevealSlot)) && temp !== body && temp !== docEl; ) {
          if (getComputedStyle_(temp).zoom !== "1") { temp = el; break; }
        }
      } else {
        while (temp = stack[index2], index2++ < elPos && isSafeEl_(temp)
            && (!isAriaFalse_(temp as SafeElement, kAria.hidden)
                || contains_s(temp as SafeElement, el))) { /* empty */ }
        temp = temp !== fromPoint && contains_s(el, temp) ? el : temp
      }
      temp === el
      || !small && (does_hit(cx, Build.BTypes & BrowserType.Chrome ? (area.t+2) * zoom : area.t + 2) // x=center, y=top
            || does_hit(cx, Build.BTypes & BrowserType.Chrome ? (area.b - 4) * zoom : area.b - 4) // x=center, y=bottom
            || does_hit(Build.BTypes & BrowserType.Chrome ? (area.l + 2) * zoom : area.l + 2, cy) // x=left, y=center
            || does_hit(Build.BTypes & BrowserType.Chrome ? (area.r - 4) * zoom : area.r - 4, cy)) // x=right, y=center
      || list.splice(i, 1);
    }
  }
  return i < 0
}

export const getVisibleElements = (view: ViewBox): readonly Hint[] => {
  let r2 = null as Rect[] | null, subtractor: Rect, subtracted: Rect[]
  const subtractSequence = (rect1: Rect): void => { // rect1 - rect2
    let x1: number, x2: number, rect2 = subtractor
      , y1 = rect1.t > rect2.t ? rect1.t : rect2.t, y2 = rect1.b < rect2.b ? rect1.b : rect2.b
    if (y1 >= y2 || ((x1 = rect1.l > rect2.l ? rect1.l : rect2.l) >= (x2 = rect1.r < rect2.r ? rect1.r : rect2.r))) {
      subtracted.push(rect1)
    } else {
      const x0 = rect1.l, x3 = rect1.r, y0 = rect1.t, y3 = rect1.b // [1 2 3; 4 ~ 5; 6 7 8]
      x0 < x1 && subtracted.push({l: x0, t: y0, r: x1, b: y3}); // (1)4(6)
      y0 < y1 && subtracted.push({l: x1, t: y0, r: x3, b: y1}); // 2(3)
      y2 < y3 && subtracted.push({l: x1, t: y2, r: x3, b: y3}); // 7(8)
      x2 < x3 && subtracted.push({l: x2, t: y1, r: x3, b: y2}); // 5
    }
  }
  let _i: number = mode1_, B = "[style*=background]", reachable = hintOptions.reachable,
  visibleElements = _i > HintMode.min_media - 1 && _i < HintMode.max_media + 1
    // not check `img[src]` in case of `<img srcset=... >`
    ? traverse(`a[href],img,svg,div${B},span${B},[data-src]` + (OnFirefox ? "" : kSafeAllSelector)
            + (_i - HintMode.DOWNLOAD_MEDIA ? "" : ",video,audio")
          , hintOptions, (hints: Hint[], element: Element): void => {
        const tag = htmlTag_<1>(element)
        if (!tag) {
          if (element.localName === "svg" && "ownerSVGElement" in element && mode1_ - HintMode.COPY_IMAGE) {
            getIfOnlyVisible(hints, element as SVGSVGElement)
          }
          return
        }
        const mediaTag = getMediaTag(tag as typeof tag | ReturnType<typeof htmlTag_> as ReturnType<typeof htmlTag_>)
        let str: string | null | undefined = getMediaUrl(element, mediaTag < kMediaTag.MIN_NOT_MEDIA_EL)
          , cr: Rect | null | undefined
        if (!mediaTag) { /* aka. mediaTag == kMediaTag.img */
          if (str) {
            let r = boundingRect_(element), l = r.l, t = r.t, w = r.r - l, h = r.b - t
            if (w < 8 && h < 8) {
              w = h = w === h && (w ? w === 3 : l || t) ? 8 : 0;
            } else {
              w > 3 ? 0 : w = 3;
              h > 3 ? 0 : h = 3;
            }
            cr = cropRectToVisible_(l, t, l + w, t + h);
            if (cr && (isStyleVisible_(element) || (evenHidden_ & kHidden.VisibilityHidden))) {
              cr = hasTag_("a", element) && getPreferredRectOfAnchor(element as HTMLAnchorElement)
                  || getCroppedRect_(element, cr)
              cr && hints.push([element, cr, ClickType.Default])
            }
          }
        } else {
          if (mediaTag > kMediaTag.MIN_NOT_MEDIA_EL - 1) {
            if (!isImageUrl(str)) {
              str = element.style.backgroundImage!;
              str = str && (<RegExpI> /^url\(/i).test(str) ? str : "";
            }
          }
          str && getIfOnlyVisible(hints, element)
        }
      }, 1, 0, 1)
    : _i > HintMode.min_link_job - 1 && _i < HintMode.max_link_job + 1
    ? traverse("a,[role=link]" + (OnFirefox ? "" : kSafeAllSelector)
          , hintOptions, (hints: Hint[], element: SafeHTMLElement): void => {
        const h = element.localName === "a" && attr_s(element, "href"), a = h !== "#" && h || element.dataset.vimUrl
        if (a !== void 0 && a !== "#" && !isJSUrl(a)) {
          getIfOnlyVisible(hints, element)
        }
      })
    : !(_i - HintMode.FOCUS_EDITABLE) ? traverse(kSafeAllSelector, hintOptions, getEditable)
    : !(_i - HintMode.ENTER_VISUAL_MODE) || hintOptions.anyText
    // not use `":not(:empty)"`, because it will require another selectAll to collect shadow hosts
    ? traverse(OnFirefox ? ":not(:-moz-only-whitespace)" : kSafeAllSelector
          , hintOptions, (hints: Hint[], element: SafeHTMLElement): void => {
        if (!OnFirefox && isIFrameElement(element)) {
            if (addChildFrame_ && element !== omni_box && element !== find_box) {
                addChildFrame_(coreHints, element, getIFrameRect(element))
            }
            return
        }
        const arr = element.childNodes as NodeList
        if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$ForOf$ForDOMListTypes) {
          for (const node of arr as ArrayLike<Node> as Node[]) {
            if (isNode_(node, kNode.TEXT_NODE) && node.data.trim().length > 2) {
              getIfOnlyVisible(hints, element)
              break
            }
          }
        } else {
          for (let i = 0; i < arr.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
            const node = arr[i]
            if (isNode_(node, kNode.TEXT_NODE) && node.data.trim().length > 2) {
              getIfOnlyVisible(hints, element)
              break
            }
          }
        }
      })
    : traverse(kSafeAllSelector, hintOptions, getClickable)
  if ((reachable != null ? reachable
        : (_i < HintMode.max_mouse_events + 1 || _i === HintMode.FOCUS_EDITABLE) && fgCache.e)
      && visibleElements.length <=
          (isTY(reachable, kTY.num) ? reachable : GlobalConsts.DefaultMaxElementCountToDetectPointer)
      && filterOutNonReachable(visibleElements, _i > HintMode.max_mouse_events, hintOptions.match)) { /* empty */ }
  else {
    OnEdge || _i === HintMode.FOCUS_EDITABLE && filterOutInert(visibleElements)
  }
  maxLeft_ = view[2], maxTop_ = view[3]
  if ((!OnChrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar) && (maxRight_ = view[4]) > 0) {
    maxLeft_ -= 16 * math.ceil(math.log(visibleElements.length) / math.log(hintChars.length)) + 12
  }
  visibleElements.reverse();

  let t: Rect, reason: ClickType, visibleElement: Hint
  for (let _len = visibleElements.length, _j = max_(0, _len - 16); 0 < --_len; ) {
    _j > 0 && --_j;
    visibleElement = visibleElements[_len];
    if (visibleElement[2] > ClickType.MaxNotBox) { continue; }
    let r = visibleElement[1];
    for (_i = _len; _j <= --_i; ) {
      t = visibleElements[_i][1];
      if (r.b > t.t && r.r > t.l && r.l < t.r && r.t < t.b && visibleElements[_i][2] < ClickType.MaxNotBox + 1) {
        subtracted = []; subtractor = t
        r2 !== null ? r2.forEach(subtractSequence) : subtractSequence(r)
        if ((r2 = subtracted).length === 0) { break; }
      }
    }
    if (r2 === null) { continue; }
    if (r2.length > 0) {
      t = r2[0];
      t.t > maxTop_ && t.t > r.t || t.l > maxLeft_ && t.l > r.l ||
        r2.length === 1 && (t.b - t.t < 3 || t.r - t.l < 3) || (visibleElement[1] = t);
    } else if ((reason = visibleElement[2]) > ClickType.MaxNotWeak && reason < ClickType.MinNotWeak
        && contains_s(visibleElement[0], visibleElements[_i][0])) {
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
  if ((!OnChrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
      && GlobalConsts.MaxLengthOfShownText > 0 && useFilter_) {
    maxLeft_ -= 16 * (GlobalConsts.MaxLengthOfShownText >>> 2);
  }
  return visibleElements.reverse();
}

export const initTestRegExps = (): void => {
  if (!clickableClasses_) {
    clickableClasses_ = createRegExp((OnChrome && Build.MinCVer < BrowserVer.MinEnsuredLookBehindInRegexp
      ? chromeVer_ < BrowserVer.MinEnsuredLookBehindInRegexp : Build.MinFFVer < FirefoxBrowserVer.MinLookBehindInRegexp
      && OnFirefox && firefoxVer_ < FirefoxBrowserVer.MinLookBehindInRegexp)
      ? kTip.oldClickableClasses : kTip.newClickableClasses, "")
    clickableRoles_ = createRegExp(kTip.clickableRoles, "i")
    buttonOrATags_ = createRegExp(kTip.buttonOrA, "")
    closableClasses_ = createRegExp(kTip.closableClasses, "")
  }
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
    if (output == null || clickTypeFilter_) {
      output = [];
      initTestRegExps()
      for (let arr = querySelectorAll_unsafe_(VTr(kTip.mayNotANestedFrame))! as ArrayLike<ElementToHTML>
              , i = arr.length; (len = output.length) < 2 && i-- > 0; ) {
        if ("lang" in arr[i]) {
          getClickable(output, arr[i] as SafeHTMLElement)
        }
      }
    }
    res = len - 1 ? len > 0 && null
        : isIFrameElement(element = output[0][0])
          && (rect = boundingRect_(element), rect2 = boundingRect_(docEl_unsafe_()!),
              rect.t - rect2.t < 20 && rect.l - rect2.l < 20
              && rect2.r - rect.r < 20 && rect2.b - rect.b < 20)
          && isStyleVisible_(element) ? element satisfies AccessableIFrameElement
        : null
  }
  frameNested_ = res === false && readyState_ < "i" ? null : res;
}
