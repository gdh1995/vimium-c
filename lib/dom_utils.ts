import {
  chromeVer_, doc, createRegExp, isTY, Lower, OBJECT_TYPES, OnFirefox, OnChrome, OnEdge, evenHidden_, safeCall, deref_,
  loc_, VTr, tryCreateRegExp, isTop, queueTask_, set_findOptByHost, splitEntries_, kNextTarget
} from "./utils"
import { dimSize_, Point2D, selRange_ } from "./rect"

export declare const enum kMediaTag { img = 0, otherMedias = 1, a = 2, others = 3, MIN_NOT_MEDIA_EL = 2, LAST = 3 }
export declare const enum kDispatch { event = 0, clickFn = 1, focusFn = 2, _mask = "" }
interface kNodeToType {
  [kNode.TEXT_NODE]: Text
  [kNode.ELEMENT_NODE]: Element
  [kNode.DOCUMENT_NODE]: Document
  [kNode.DOCUMENT_FRAGMENT_NODE]: DocumentFragment | ShadowRoot
}

export const DAC = "DOMActivate", MDW = "mousedown", CLK = "click", HDN = "hidden", NONE = "none"
export const INP = "input", BU = "blur", ALA = "aria-label", PGH = "pagehide"
export const kDir = ["backward", "forward"] as const, kGCh = "character"
export const AriaArray = ["aria-hidden", "aria-disabled", "aria-haspopup", "aria-readonly"] as const

//#region data and DOM-shortcut section

let unsafeFramesetTag_old_cr_: "frameset" | 0 = 0
let docSelectable_ = true
let _cssChecker: HTMLParagraphElement | undefined

export { unsafeFramesetTag_old_cr_, docSelectable_ }
export function markFramesetTagUnsafe_old_cr (): "frameset" { return unsafeFramesetTag_old_cr_ = "frameset" }
export function set_docSelectable_ (_newDocSelectable: boolean): void { docSelectable_ = _newDocSelectable }

export const ElementProto_not_ff = !OnFirefox ? Element.prototype as SafeElement : 0 as never as null
export const HTMLElementProto = OnEdge ? null : HTMLElement.prototype as SafeHTMLElement

export const getComputedStyle_: (element: Element) => CSSStyleDeclaration =
    Build.Inline ? getComputedStyle : el => getComputedStyle(el)

export const getSelection_: () => Selection = Build.Inline ? getSelection : () => getSelection()

export const docEl_unsafe_ = (): Element | null => doc.documentElement

export const activeEl_unsafe_ = (): Element | null => doc.activeElement

export const querySelector_unsafe_ = (selector: string
    , scope?: SafeElement | ShadowRoot | Document
    ): Element | null => (scope || doc).querySelector(selector)

export const querySelectorAll_unsafe_ = ((selector: string, scope?: Element | ShadowRoot | null
    , isScopeAnElementOrNull?: 1): NodeListOf<Element> | void => {
  try {
    if (!OnFirefox) {
      return (scope && isScopeAnElementOrNull ? ElementProto_not_ff! : scope || doc
          ).querySelectorAll.call(scope || doc, selector)
    } else {
      return (scope || doc).querySelectorAll(selector)
    }
  } catch {}
}) as {
  (selector: string, scope: Element | null, isScopeAnElementOrNull: 1): NodeListOf<Element> | void
  (selector: string, scope?: Element | ShadowRoot | null, isScopeAnElementOrNull?: 0): NodeListOf<Element> | void
}

export const testMatch = (selector: string, element: SafeElement): boolean => {
  return OnChrome && Build.MinCVer < BrowserVer.Min$Element$$matches && chromeVer_ < BrowserVer.Min$Element$$matches
      ? element.webkitMatchesSelector(selector) : element.matches!(selector)
}

export const isIFrameElement = <T extends BOOL = 0>(el: Element, alsoFenced?: T
    ): el is (T extends 1 ? KnownIFrameElement : AccessableIFrameElement) => {
  const tag = el.localName
  return (tag === "iframe" || tag === "frame" || tag === "fencedframe" && alsoFenced === 1) && hasTag_(tag, el)
}

export const isNode_ = <T extends keyof kNodeToType> (node: Node, typeId: T): node is kNodeToType[T] => {
  const type = node.nodeType
  return Build.BTypes === BrowserType.Firefox as number ? type === typeId
      : type === typeId || typeId === kNode.ELEMENT_NODE && isTY(type, kTY.obj)
}

export const rangeCount_ = (sel: Selection): number => sel.rangeCount

export const contains_s = (par: SafeElement, child: Node): boolean =>
    par.contains(child)

export const attr_s = (el: SafeElement, attr: string): string | null => el.getAttribute(attr)

export const selOffset_ = (sel: Selection, focus?: BOOL): number => focus ? sel.focusOffset : sel.anchorOffset

export const textOffset_ = (el: TextElement, dir?: VisualModeNS.ForwardDir | boolean): number | null =>
    dir ? el.selectionEnd! : el.selectionStart!

export const doesSupportDialog = (): boolean => typeof HTMLDialogElement == OBJECT_TYPES[kTY.func]

export const parentNode_unsafe_s = (el: SafeElement | Text
    ): Element | Document | DocumentFragment | null => el.parentNode as any

export const docHasFocus_ = (): boolean => OnChrome && Build.MinCVer < BrowserVer.MinDocument$hasFocus
    && !doc.hasFocus ? true : doc.hasFocus()

//#endregion

//#region DOM-compatibility section

export const isHTML_ = OnFirefox ? (): boolean => doc instanceof HTMLDocument
    : (): boolean => "lang" in <ElementToHTML> (docEl_unsafe_() || {})

export const htmlTag_ = (!OnFirefox ? (element: Element | HTMLElement): string => {
    let s: Element["localName"];
    if ("lang" in element && typeof (s = element.localName) === "string") {
      return (!OnChrome || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
          ? s === "form" : s === "form" || s === unsafeFramesetTag_old_cr_) ? "" : s;
    }
    return "";
  } : (element: Element): string => "lang" in element ? (element as SafeHTMLElement).localName : ""
) as {
  (element: Element): "" | keyof HTMLElementTagNameMap
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  <Ty extends 1>(element: Element): element is SafeHTMLElement
  (element: Element): "" | keyof HTMLElementTagNameMap; // this line is just to avoid a warning on VS Code
}

export const hasTag_ = <Tag extends keyof HTMLElementTagNameMap> (htmlTag: Tag
    , el: Element | HTMLElement): el is HTMLElementTagNameMap[Tag] => el.localName === htmlTag && "lang" in el

export const supportInert_ = !OnChrome || Build.MinCVer < BrowserVer.MinEnsured$HTMLElement$$inert ? (): boolean => {
  return OnEdge ? false : isHTML_() && "inert" in HTMLElementProto!
} : 0 as never as null

export const isInTouchMode_cr_ = OnChrome ? (): boolean => {
    const viewport_meta = querySelector_unsafe_("meta[name=viewport]")
    return !!viewport_meta && createRegExp(kTip.metaKeywordsForMobile, "i").test(
          (viewport_meta as TypeToAssert<Element, HTMLMetaElement, "content">).content! /* safe even if undefined */)
} : 0 as never as null

/** refer to {@link #BrowserVer.MinParentNodeGetterInNodePrototype } */
const _getter_unsafeOnly_not_ff_ = !OnFirefox ? function <Ty extends Node, Key extends keyof Ty
    , ensured extends boolean = false>(Cls: { prototype: Ty; new (): Ty }, instance: Ty
      , property: Key & (Ty extends Element ? "assignedSlot" : "childNodes" | "parentNode")
      ): Exclude<NonNullable<Ty[Key]>, Window | RadioNodeList | HTMLCollection
            | (Key extends "parentNode" ? never : Element)>
          | (ensured extends true ? never : null) {
    const desc = Object.getOwnPropertyDescriptor(Cls.prototype, property);
    return desc && desc.get ? desc.get.call(instance) : null;
} : 0 as never as null

export const isSafeEl_ = !OnFirefox ? (el: Element): el is SafeElement => {
  let s: Element["localName"]
  return typeof (s = el.localName) === "string" &&
      (!OnChrome || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
        ? s !== "form" : s !== "form" && s !== unsafeFramesetTag_old_cr_)
} : (() => true) as never

  /** @safe_even_if_any_overridden_property */
export const SafeEl_not_ff_ = !OnFirefox ? function (
      el: Element | undefined | null, type?: PNType.DirectElement | undefined): Node | undefined | null {
  return el && !isSafeEl_(el)
    ? SafeEl_not_ff_!(GetParent_unsafe_(el, type || PNType.RevealSlotAndGotoParent), type) : el
} as {
  (el: SafeElement | null, type?: any): unknown
  (el: Element | null, type?: PNType.DirectElement): SafeElement | null
  (el: Element | null | void, type?: PNType.DirectElement): SafeElement | null | undefined
} : 0 as never as null

export const TryGetShadowRoot_ = (el: Element, noClosed_cr?: BOOL): ShadowRoot | null =>
    htmlTag_<1>(el) ? Build.BTypes & BrowserType.Chrome ? GetShadowRoot_(el, noClosed_cr) : GetShadowRoot_(el) : null

export const GetShadowRoot_ = ((el: HTMLElement, noClosed_cr?: BOOL
      ): ShadowRoot | Element | RadioNodeList | Window | null => {
    let sr: Element["shadowRoot"] | Element["webkitShadowRoot"]
    if (OnFirefox) {
      return Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
          ? (el as any).openOrClosedShadowRoot : (el as any).openOrClosedShadowRoot || null
    }
    if (OnChrome && noClosed_cr !== 1 && (Build.MinCVer >= BrowserVer.Min$dom$$openOrClosedShadowRoot
          || chromeVer_ > BrowserVer.Min$dom$$openOrClosedShadowRoot - 1)) {
      return chrome.dom.openOrClosedShadowRoot!(el)
    }
    // Note: .webkitShadowRoot and .shadowRoot share a same object
    sr = OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
        && chromeVer_ < BrowserVer.MinEnsuredUnprefixedShadowDOMV0 ? el.webkitShadowRoot : el.shadowRoot;
    // according to https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow,
    // <form> and <frameset> can not have shadowRoot
  return !(Build.BTypes & BrowserType.Edge)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredUnprefixedShadowDOMV0)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
      ? sr as Exclude<typeof sr, undefined> : sr !== undefined ? sr : null
}) as {
  (el: SafeHTMLElement, noClosed_cr?: BOOL): ShadowRoot | null
  (el: HTMLElement, noClosed_cr?: BOOL): ShadowRoot | Element | RadioNodeList | Window | null
}

// offset: 0: anchor, 1: focus; >= 2: directly use (offset - 2)
export const getNodeChild_ = (node: Node, sel: Selection, offset?: number): Node | void => {
  const type = node.nodeType
  let childNodes: NodeList
  if (type === kNode.ELEMENT_NODE || type === kNode.DOCUMENT_FRAGMENT_NODE || !OnFirefox && isTY(type, kTY.obj)) {
    if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype) {
      childNodes = type === kNode.DOCUMENT_FRAGMENT_NODE || isSafeEl_(node as Element)
          ? node.childNodes as NodeList : _getter_unsafeOnly_not_ff_!(Node, node, "childNodes")!
    } else {
      childNodes = node.childNodes as unknown as NodeList
      childNodes = type === kNode.DOCUMENT_FRAGMENT_NODE || isSafeEl_(node as Element)
          || childNodes instanceof NodeList && !("value" in childNodes) ? childNodes
          : _getter_unsafeOnly_not_ff_!(Node, node, "childNodes") || <NodeList> <{[index: number]: Node}> []
    }
    return childNodes[offset! > 1 ? offset! - 2 : selOffset_(sel, offset as 1 | 0 | undefined)]
  }
}

/** Try its best to find a real parent */
export const GetParent_unsafe_ = function (el: Node | Element
    , type: PNType.DirectNode | PNType.DirectElement | PNType.RevealSlot | PNType.RevealSlotAndGotoParent
    ): Node | null {
  /** Chrome: a selection / range can only know nodes and text in a same tree scope */
  if (!OnEdge && type > PNType.RevealSlot - 1) {
      if (OnChrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0 && chromeVer_ < BrowserVer.MinNoShadowDOMv0) {
        const func = ElementProto_not_ff!.getDestinationInsertionPoints,
        arr = func ? func.call(el) : [], len = arr.length;
        len > 0 && (el = arr[len - 1]);
      }
      let slot = (el as Element).assignedSlot;
      slot && !isSafeEl_(el as Element) && (slot = _getter_unsafeOnly_not_ff_!(Element, el as Element, "assignedSlot"))
      if (slot) {
        if (type < PNType.RevealSlot + 1) { return slot; }
        while (slot = slot.assignedSlot) { el = slot; }
      }
  }
  type ParentNodeProp = Node["parentNode"]; type ParentElement = Node["parentElement"]
  let pe = el.parentElement as Exclude<ParentElement, Window>, pn = el.parentNode as Exclude<ParentNodeProp, Window>
  let nodeTy: Node["nodeType"] | undefined
  if (pe === pn /* normal pe or no parent */ || !pn /* indeed no par */) { return pn as Element | null }
  // may be `frameset,form` with pn or pe overridden; <frameset>.parentNode may be a connected shadowRoot
  if (!OnFirefox) {
    pn = (!OnChrome || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
          || unsafeFramesetTag_old_cr_ === 0 || (pn as ParentNodeProp as WindowWithTop).top !== top)
        && (nodeTy = pn.nodeType) && (nodeTy === kNode.DOCUMENT_FRAGMENT_NODE || nodeTy === kNode.DOCUMENT_NODE
            || nodeTy && doc.contains.call(pn, el)) ? pn
        : !OnChrome || Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype
          || chromeVer_ > BrowserVer.MinParentNodeGetterInNodePrototype - 1
        ? _getter_unsafeOnly_not_ff_!(Node, el, "parentNode")
        : (Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
          ? pe && (unsafeFramesetTag_old_cr_ === 0 || (pe as ParentNodeProp as WindowWithTop).top !== top) : pe)
        && pe!.nodeType && doc.contains.call(pe as Element, el) ? (type = PNType.DirectNode, pe)
        : el === doc.body ? docEl_unsafe_() : null
  }
    // pn is real (if BrowserVer.MinParentNodeGetterInNodePrototype else) real or null
  return OnChrome && Build.MinCVer < BrowserVer.MinParentNodeGetterInNodePrototype && !pn
      || !type ? pn as Node | null // may return a Node instance
      : type >= PNType.ResolveShadowHost
        && isNode_(pn as Node, kNode.DOCUMENT_FRAGMENT_NODE)
      ? (pn as DocumentFragment as Partial<ShadowRoot>).host || null // shadow root or other type of doc fragment
      : (pn as Node as NodeToElement).tagName ? pn as Element /* in doc and .pN+.pE are overridden */
      : null /* pn is null, or some unknown type ... */;
} as {
  (el: Element, type: PNType.DirectElement
        | PNType.ResolveShadowHost | PNType.RevealSlot | PNType.RevealSlotAndGotoParent): Element | null;
  (el_in_dom: Element | Text, type: PNType.ResolveShadowHost): Element | null
  (el_in_dom: Node, type: PNType.DirectNode): ShadowRoot | DocumentFragment | Document | Element | null
}

export const getRootNode_mounted = ((el: Node): Node => {
  let pn: Node | null
  if (!OnEdge && (!OnChrome
      || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode || chromeVer_ > BrowserVer.Min$Node$$getRootNode - 1)) {
    return el.getRootNode!()
  } else {
    for (; pn = GetParent_unsafe_(el, PNType.DirectNode); el = pn) { /* empty */ }
    return el
  }
}) as ((element: SafeElement) => Node) as {
  (element: EnsuredMountedElement & SafeElement): Document | ShadowRoot
  (element: SafeElement): Node
}

export const scrollingEl_ = (fallback?: 1): SafeElement | null => {
    // Both C73 and FF66 still supports the Quirk mode (entered by `doc.open()`)
    if (OnFirefox) {
      return doc.scrollingElement as SafeElement | null
          || (fallback && !doc.body ? docEl_unsafe_() as SafeElement | null : null)
    }
    const docEl = docEl_unsafe_(), body = doc.body
    let el = doc.scrollingElement
    if (OnChrome && Build.MinCVer < BrowserVer.Min$Document$$ScrollingElement
        && el === void 0) {
      /**
       * The code about `inQuirksMode` in `Element::scrollTop()` is wrapped by a flag #scrollTopLeftInterop
       * since [2013-11-18] https://github.com/chromium/chromium/commit/25aa0914121f94d2e2efbc4bf907f231afae8b51 ,
       * while the flag is hidden on Chrome 34~43 (32-bits) for Windows (34.0.1751.0 is on 2014-04-07).
       * But the flag is under the control of #enable-experimental-web-platform-features
       */
      el = doc.compatMode === "BackCompat" || body && isSafeEl_(body)
        && (scrollY ? dimSize_(body as SafeElement, kDim.positionY)
            : dimSize_(docEl as SafeElement, kDim.scrollW) <= dimSize_(body as SafeElement, kDim.scrollH))
        ? body : body ? docEl : null;
      // If not fallback, then the task is to get an exact one in order to use `scEl.scrollHeight`,
      // but if body is null in the meanwhile, then docEl.scrollHeight is not reliable (scrollY neither)
      //   when it's real scroll height is not larger than innerHeight
    }
    // here `el` may be `:root, :root > body, :root > frameset` or `null`
    return el && isSafeEl_(el) ? el as SafeElement
        : fallback && docEl && (el || !body) && isSafeEl_(docEl) ? docEl as SafeElement
        : null
}

export const fullscreenEl_unsafe_ = (): Element | null => {
    /** On Firefox, doc.fullscreenElement may not exist even since FF64 - see Min$Document$$FullscreenElement */
    return OnFirefox ? doc.mozFullScreenElement
      : !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement)
      ? doc.fullscreenElement : doc.webkitFullscreenElement;
}

// Note: sometimes a cached frameElement is not the wanted
export let frameElement_ = (): SafeHTMLElement | null | void => {
    if (OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement) {
      try {
        return frameElement as SafeHTMLElement
      } catch {}
    } else if (!OnFirefox) {
      return frameElement as SafeHTMLElement
    } else {
      const el = frameElement as SafeHTMLElement | null
      if (el) { frameElement_ = () => el }
      return el
    }
}

export const compareDocumentPosition = (anchorNode: Node, focusNode: Node): kNode =>
    !OnFirefox ? Node.prototype.compareDocumentPosition.call(anchorNode, focusNode)
    : anchorNode.compareDocumentPosition(focusNode)

export const getAccessibleSelectedNode = (sel: Selection, focused?: BOOL): Node | null => {
  let node = focused ? sel.focusNode : sel.anchorNode
  if (OnFirefox) {
    try {
      node && compareDocumentPosition(node, node)
    } catch { node = null }
  }
  return node
}

export const getEventPath = (event: Event): EventPath | undefined => {
  return !OnEdge && (!OnChrome
        || Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        || chromeVer_ > BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow - 1
      ) ? event.composedPath!() : event.path
}

//#endregion

//#region computation section

export const derefInDoc_ = ((val: WeakRef<SafeElement> | SafeElement | null | undefined): SafeElement | null => {
  val = deref_(val as WeakRef<SafeElement> | null | undefined)
  return val && IsAInB_(val, doc) ? val : null
}) as <T extends SafeElement> (val: WeakRef<T> | T | null | undefined) => T | null

export const queryHTMLChild_ = (
      parent: SafeElement, childTag: "summary" | "div" | "ul" | "input"): SafeHTMLElement | null => {
    // not query `:scope>summary` for more consistent performance
    // Specification: https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element
    // `HTMLDetailsElement::FindMainSummary()` in
    // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_details_element.cc?g=0&l=101
    if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Array$$find$$findIndex) {
      return ([].find as (predicate: (el: Element) => el is SafeHTMLElement) => SafeHTMLElement | undefined
          ).call(parent.children, hasTag_.bind(0, childTag) as (el: Element) => el is SafeHTMLElement) || null
    }
    let found: SafeHTMLElement | null = null
    for (let summaries = parent.children, i = 0; i < summaries.length && !found; i++) {
      // there's no window.HTMLSummaryElement on C70
      found = hasTag_(childTag, summaries[i]) ? summaries[i] as SafeHTMLElement : found
    }
    return found
}

export const findAnchor_ = ((element: Element | null): SafeHTMLElement | null => {
  if (OnEdge) {
    element = element!.closest!("a")
    return element && htmlTag_<1>(element) ? element : null
  }
  while (element && !hasTag_("a", element)) {
    element = GetParent_unsafe_(element, PNType.RevealSlotAndGotoParent)
  }
  return element as SafeHTMLElement
}) as (element: SafeElement) => SafeHTMLElement & HTMLAnchorElement | null

export const IsAInB_ = function (element: Element, root?: Element | Document | null
      , checkMouseEnter?: 1): boolean {
    if (!root || isNode_(root as Element | Document, kNode.DOCUMENT_NODE)) {
      const isConnected = element.isConnected; /** {@link #BrowserVer.Min$Node$$isConnected} */
      if (!(OnChrome && Build.MinCVer < BrowserVer.Min$Node$$isConnected || OnEdge) || isConnected !== void 0
          || !(root = root || element.ownerDocument as Document | null)) {
        return (OnChrome && Build.MinCVer < BrowserVer.Min$Node$$isConnected || OnEdge ? !!isConnected
            : isConnected as boolean) && (!root || element.ownerDocument === root)
      }
    }
    let pe: Node | null | undefined = element
    while (pe && !(OnFirefox ? root.contains(pe)
        : element.contains.call((root as Element | Document), pe))) {
      pe = !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode
        || chromeVer_ > BrowserVer.Min$Node$$getRootNode - 1) ? getRootNode_mounted(pe as SafeElement) : null
      pe = pe && isNode_(pe, kNode.DOCUMENT_FRAGMENT_NODE) ? (pe as Partial<ShadowRoot>).host : null
    }
    if (pe || !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode
          || chromeVer_ > BrowserVer.Min$Node$$getRootNode - 1) && !checkMouseEnter) { return !!pe }
    while ((pe = GetParent_unsafe_(element
                  , checkMouseEnter ? PNType.RevealSlotAndGotoParent : PNType.ResolveShadowHost))
            && pe !== root) {
      element = pe as Element
    }
    // if not pe, then PNType.DirectNode won't return an Element
    // because .GetParent_ will only return a real parent, but not a fake <form>.parentNode
    return (pe || GetParent_unsafe_(element, PNType.DirectNode)) === root;
} as {
  (element: SafeElement, maybeRoot: Element, checkMouseEnter: 1): boolean
  (element: SafeElement): element is SafeElement & EnsuredMountedElement
  (element: SafeElement, maybeRoot?: Element | Document): boolean
}

if (!(Build.NDEBUG || BrowserVer.Min$Node$$getRootNode >= BrowserVer.Min$Node$$isConnected)) {
  console.log("Assert error: expect BrowserVer.Min$Node$$getRootNode >= BrowserVer.Min$Node$$isConnected")
}

export const isStyleVisible_ = (element: Element): boolean => isRawStyleVisible(getComputedStyle_(element))
export const isRawStyleVisible = (style: CSSStyleDeclaration): boolean => style.visibility === "visible"

export const isAriaFalse_ = (element: SafeElement, ariaType: kAria): boolean => {
    let s = Build.BTypes === BrowserType.Safari as number|| !(Build.BTypes & ~(BrowserType.Chrome | BrowserType.Safari))
        && Build.MinCVer >= BrowserVer.MinCorrectAriaSelected
        ? ariaType > kAria.disabled ? ariaType > kAria.hasPopup ? element.ariaReadOnly : element.ariaHasPopup
          : ariaType < kAria.disabled ? element.ariaHidden : element.ariaDisabled as string | null
        : element.getAttribute(AriaArray[ariaType])
    return s === null || (!!s && Lower(s) === "false") || !!(evenHidden_ & (kHidden.BASE_ARIA << ariaType))
}

export const hasInCSSFilter_ = (): boolean => {
  const el = fullscreenEl_unsafe_() || docEl_unsafe_(), st = el && getComputedStyle_(el)
  return !!st && (OnChrome && Build.MinCVer < BrowserVer.MinCSS$filter
      && chromeVer_ < BrowserVer.MinCSS$filter ? st.webkitFilter : st.filter) !== "none"
}

export const getMediaTag = (tag: keyof HTMLElementTagNameMap | ""): kMediaTag => {
  return tag === "img" ? kMediaTag.img : tag === "video" || tag === "audio" ? kMediaTag.otherMedias
      : tag === "a" ? kMediaTag.a : kMediaTag.others
}

export const getMediaUrl = (element: HTMLImageElement | SafeHTMLElement, isMedia: boolean | BOOL | 2): string => {
  let kSrcAttr: "src", srcValue: string | null
  return isMedia !== 2 && element.dataset.src
      // according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement#Browser_compatibility,
      // <img>.currentSrc is since C45
      || isMedia && (element as HTMLImageElement).currentSrc
      || (srcValue = attr_s(element, kSrcAttr = isMedia ? "src" : "href" as never) || "",
          srcValue && (element as Partial<HTMLImageElement>)[kSrcAttr] || srcValue)
}

/** not return `<body>` or `<html>` */
export const deepActiveEl_unsafe_ = (alsoBody?: 1): Element | null => {
  let el: Element | null | undefined = activeEl_unsafe_()
  let active: Element | null | undefined = alsoBody && (el || docEl_unsafe_()), shadowRoot: ShadowRoot | null
  if (el !== doc.body && el !== docEl_unsafe_()) {
    while (el && (shadowRoot = TryGetShadowRoot_(active = el))) {
      el = shadowRoot.activeElement
    }
  }
  return active || null
}

export const uneditableInputs_: ReadonlySafeDict<1 | 2 | 3 | 4> = { __proto__: null as never,
    button: 2, checkbox: 3, color: 4, file: 1, hidden: 1, //
    image: 2, radio: 3, range: 1, reset: 1, submit: 1
}

export const editableTypes_: SafeObject & { readonly [localName in ""]?: undefined } & {
  [localName in "keygen"]?: EditableType | undefined
} & {
  readonly [localName in keyof HTMLElementTagNameMap]?: EditableType | undefined
} = { __proto__: null as never,
    input: EditableType.Input, textarea: EditableType.TextArea,
    select: EditableType.Select,
    embed: EditableType.Embed, object: EditableType.Embed
}

  /**
   * if true, then `element` is `LockableElement`,
   * so MUST always filter out HTMLFormElement, to keep LockableElement safe
   */
export const getEditableType_ = function (element: Element): EditableType {
    const tag = htmlTag_(element), ty = editableTypes_[tag];
    return !tag ? EditableType.NotEditable : ty !== EditableType.Input ? (ty ||
        ((element as HTMLElement).isContentEditable !== true
          ? EditableType.NotEditable : EditableType.ContentEditable))
      : uneditableInputs_[(element as HTMLInputElement).type] ? EditableType.NotEditable : EditableType.Input
} as {
    (element: Element): element is LockableElement;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    <Ty extends 0>(element: Element): EditableType;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    <Ty extends EventTarget>(element: EventTarget): element is LockableElement
    (element: Element): element is LockableElement; // this line is just to avoid a warning on VS Code
}

export const isSelected_ = (): boolean => {
    const element = activeEl_unsafe_(), sel = getSelection_(), node = getAccessibleSelectedNode(sel)
    return !node || !element ? false
      : (element as TypeToAssert<Element, HTMLElement, "isContentEditable">).isContentEditable === true
      ? OnFirefox ? contains_s(element as SafeElement, node) : doc.contains.call(element, node)
      : element === node || element === getNodeChild_(node, sel)
}

/** return `right` in case of unknown cases */
export const getDirectionOfNormalSelection = (sel: Selection, anc: Node | null, focus: Node | null
    ): VisualModeNS.ForwardDir => {
  const num1 = !anc || !focus ? 0 : anc !== focus ? compareDocumentPosition(anc, focus)
      : selOffset_(sel, 1) < selOffset_(sel) ? kNode.DOCUMENT_POSITION_PRECEDING : 0
  return (
      num1 & (kNode.DOCUMENT_POSITION_CONTAINS | kNode.DOCUMENT_POSITION_CONTAINED_BY)
      ? selRange_(sel, 1).endContainer === anc : (num1 & kNode.DOCUMENT_POSITION_PRECEDING)
    ) ? VisualModeNS.kDir.left : VisualModeNS.kDir.right
}

export const getSelectionFocusEdge_ = (sel: Selection
      , knownDi?: VisualModeNS.ForwardDir | VisualModeNS.kDir.unknown): SafeElement | null => {
    let el = rangeCount_(sel) && getAccessibleSelectedNode(sel, 1), o: Node | 0 | null | void
    if (!el) { return null; }
    const anc = getAccessibleSelectedNode(sel)
    knownDi = knownDi != null ? knownDi : getDirectionOfNormalSelection(sel, anc, el)
    o = getNodeChild_(el, sel, 1)
    if (!o) {
      o = el
      el = GetParent_unsafe_(el as Element | Text, PNType.ResolveShadowHost)
    }
    for (; o && !isNode_(o, kNode.ELEMENT_NODE); o = knownDi ? o.previousSibling : o.nextSibling) { /* empty */ }
    if (o && anc) {
      const num = compareDocumentPosition(anc, o)
      if (!(num & (kNode.DOCUMENT_POSITION_CONTAINS | kNode.DOCUMENT_POSITION_CONTAINED_BY))
          && num & (knownDi ? kNode.DOCUMENT_POSITION_PRECEDING : kNode.DOCUMENT_POSITION_FOLLOWING)) {
        o = 0
      }
    }
    if (OnFirefox) {
      return (/* Element | null */ o || /* container element */ el) as SafeElement | null;
    }
    return SafeEl_not_ff_!(<Element | null> (o || el), PNType.DirectElement)
}

/** may skip a `<form> having <input name="nodeType">` */
export const singleSelectionElement_unsafe = (sel: Selection): Element | null => {
  const anchor: Node | null | false | "" | undefined = getAccessibleSelectedNode(sel)
  const child = anchor && getNodeChild_(anchor, sel)
  return child && anchor === getAccessibleSelectedNode(sel, 1)
      && selOffset_(sel) === selOffset_(sel, 1) && isNode_(child, kNode.ELEMENT_NODE) ? child : null
}

export const getElDesc_ = (el: Element | null): FgReq[kFgReq.respondForRunKey]["e"] =>
    // if el is SVGElement, then el.className is SVGAnimatedString
    el && isSafeEl_(el) && [(el as SafeElement).localName, el.id, attr_s(el as SafeElement, "class")] || null

export const extractField = (el: SafeElement, props: string): string => {
  type primitiveObject = boolean | number | string | { arguments?: undefined } & Dict<any>
  let json: Dict<primitiveObject | null> | primitiveObject | null | undefined | Element = el
  props = props.trim()
  for (const prop of props ? props.split(".") : []) {
    if (json && isTY(json)) {
      json = safeCall<string, any>(JSON.parse, json as unknown as string) || json
    }
    json = json && isTY((json as string)[prop as "trim"], kTY.func) ? (json as string)[prop as "trim"]()
        : json !== el ? json != null ? (json as Dict<primitiveObject | null>)[prop] : json
        : !el ? 0 : (el as TypeToAssert<Element, HTMLElement | SVGElement, "dataset", "tagName">).dataset
        && ((el as HTMLElement).dataset as Dict<string>)[prop] || (el as Dict<any>)[prop] || attr_s(el, prop)
  }
  return isTY(json) || isTY(json, kTY.num) ? json + "" : ""
}

export const newEvent_ = <T extends new (type: any, init: EventInit) => Event>(
    type: T extends new (type: infer Type, init: any) => Event ? Type : never
    , notCancelable?: boolean | BOOL, notComposed?: BOOL | boolean, notBubbles?: boolean | BOOL
    , init?: T extends new (type: any, init: infer Init) => Event ? Init : never
    , cls?: T): InstanceType<T> => {
  init = init || {} as NonNullable<typeof init>
  init.bubbles = !notBubbles, init.cancelable = !notCancelable, OnEdge || (init.composed = !notComposed)
  return new (cls || Event)(type, init) as InstanceType<T>
}

type MayBeSelector = "" | false | null | void | undefined
export const joinValidSelectors = (selector: string | false | void
      , validAnother: "css-selector" | false | void): "css-selector" | null => // this should be O(1)
    // here can not use `docEl.matches`, because of `:has(...)`
    selector ? (validAnother ? selector + "," + validAnother : selector) as "css-selector" : validAnother || null

// { "host-cond": boolean | "query//value, q2//v2" | ("q//v" | boolean | ["q", "v"])[]  }
// { "host-cond##q": boolean | "v" }
set_findOptByHost((rules: string | object | kTip | true | MayBeSelector
    , cssCheckEl?: SafeElement | 0, mapMode?: kNextTarget.child | kNextTarget.realClick | kNextTarget.nonCss
    ): "css-selector" | void => {
  type Val = string | boolean
  const isKTip = isTY(rules, kTY.num)
  let host: string | undefined, path: string | undefined
  for (const hostLine of rules == null ? []
        : splitEntries_<[string, Val | (Val | [string, Val])[]], true>(isKTip ? VTr(rules) : rules as any, ";")) {
    const items = splitEntries_(hostLine, "##")
    let isOnHost = items.length > 1, sel = items[+isOnHost as BOOL], cond = isOnHost ? items[0] : ""
    let _j = cond.split("##"); _j.length > 1 && (cond = _j[0], sel = [[ _j[1], sel as Val ]])
    let matchPath = cond.includes("/")
    const re = cond && (<RegExpOne> /[*+?^$\\(]/).test(cond) && tryCreateRegExp(cond)
    path || cond && (host = Lower(loc_.host), path = host + "/" + Lower(loc_.pathname))
    if (re ? re.test(matchPath ? path! : host!) : matchPath ? path!.startsWith(cond)
            : cond ? host === cond || host!.endsWith("." + cond) : sel) {
      if (!mapMode) {
        return isKTip || cssCheckEl === 0 || sel && safeCall(testMatch, sel as string, _cssChecker || cssCheckEl
            || (_cssChecker = createElement_("p"))) != null ? sel as "css-selector" : void 0
      }
      for (const rawEntry of splitEntries_<Val | [string, Val], true>(sel, ",")) {
        let ret: string | boolean | 0 = 0
        if (!rawEntry || rawEntry === "true" || rawEntry === "false") { ret = rawEntry || 0 }
        else {
          const entry = splitEntries_(rawEntry, "//"), len = entry.length, val = len < 2 || entry[1]
          const matched = len < 2 && mapMode > kNextTarget.nonCss - 1
              || safeCall(testMatch, entry[0] || "*", cssCheckEl as SafeElement)
          ret = len < 2 ? matched != null ? mapMode < kNextTarget.realClick || matched || 0 : 0
              : !matched ? 0 : !isTY(val) ? !!(val satisfies boolean) : !val ? mapMode > kNextTarget.realClick - 1
              : (mapMode > kNextTarget.nonCss - 1 || safeCall(testMatch, val, cssCheckEl as SafeElement) != null)
                && val + (len > 2 ? ",true" : "")
        }
        if (ret !== 0) {
          ret += ""
          return (ret === "true" || ret !== "false" && (ret + "").trim()) as string as "css-selector"
        }
      }
    }
  }
})
export { findOptByHost as findSelectorByHost } from "./utils"

export const elFromPoint_ = (center?: Point2D | null, baseEl?: SafeElement | ShadowRoot | null): Element | null => {
  const root = center && (baseEl ? isNode_(baseEl, kNode.DOCUMENT_FRAGMENT_NODE) ? baseEl
      : IsAInB_(baseEl) && getRootNode_mounted(baseEl) : doc)
  const el = root && root.elementFromPoint(center![0], center![1])
  return el && el !== doc.body ? el : null
}

//#endregion

//#region action section

/** Note: still call functions even if Vimium C has been destroyed */
let OnDocLoaded_: (callback: (this: void) => any, onloaded?: 1) => void
let onReadyState_: (event?: Event | TimerType.fake) => void

export { OnDocLoaded_, onReadyState_ }
export function set_OnDocLoaded_ (_newOnDocLoaded: typeof OnDocLoaded_): void { OnDocLoaded_ = _newOnDocLoaded }
export function set_onReadyState_ (_newOnReady: typeof onReadyState_): void { onReadyState_ = _newOnReady }

export let createElement_ = doc.createElement.bind(doc) as {
  <K extends "div" | "span" | "style" | "iframe" | "a" | "p" | "script" | "dialog" | "body" | "img" | "canvas"> (
      htmlTagName: K): HTMLElementTagNameMap[K]
}
export function set_createElement_ (_newCreateEl: typeof createElement_): void { createElement_ = _newCreateEl }

export const appendNode_s = (parent: SafeElement | Document | DocumentFragment
    , child: Element | DocumentFragment | Text): void => {
  Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
      ? parent.appendChild(child) : parent.append!(child) // lgtm [js/xss] lgtm [js/xss-through-dom]
}

export const append_not_ff = !OnFirefox ? (parent: Element, child: HTMLElement): void => {
  (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
      ? ElementProto_not_ff!.appendChild : ElementProto_not_ff!.append!).call(parent, child)
} : 0 as never

export const removeEl_s = (el: SafeElement): void => {
  el.remove()
}

export const setClassName_s = (el: SafeHTMLElement, className: string): void => {
  el.className = className
}

export const setVisibility_s = (el: SafeHTMLElement, visible?: boolean | BOOL): void => {
  el.style.visibility = visible ? "" : HDN
}

export const setDisplaying_s = (el: SafeHTMLElement, display?: BOOL): void => {
  el.style.display = display ? "" : NONE
}

export const setOrRemoveAttr_s = (el: SafeElement, attr: string, newVal?: string | null): void => {
  newVal != null ? el.setAttribute(attr, newVal) : el.removeAttribute(attr)
}

export const toggleClass_s = (el: SafeElement, className: string, force?: boolean | BOOL | null): void => {
  const list = el.classList
  force != null ? list.toggle(className, !!force) : list.toggle(className)
}

export const textContent_s = ((el: SafeElement, text?: string): string => text ? el.textContent = text : el.textContent
) as {
  (el: SafeHTMLElement, text: string): string
  (el: SafeElement): string
}

export const attachShadow_ = <T extends HTMLDivElement | HTMLBodyElement> (box: T): ShadowRoot | T => {
  return OnEdge ? box
      : OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
        || box.attachShadow
      ? box.attachShadow!({mode: "closed"})
      : OnChrome && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
        && (Build.MinCVer >= BrowserVer.MinEnsuredUnprefixedShadowDOMV0 || box.createShadowRoot)
      ? box.createShadowRoot!()
      : OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
        && (Build.MinCVer >= BrowserVer.MinShadowDOMV0 || box.webkitCreateShadowRoot)
      ? box.webkitCreateShadowRoot!() : box
}

export const scrollIntoView_ = (el: Element, instant?: object | boolean, dir?: boolean, _unused?: undefined): void => {
  // although Chrome 114 still ignores `behavior: "instant"`, here still set it for the future
  OnFirefox ? el.scrollIntoView({ block: "nearest", behavior: instant ? "instant" : _unused })
      : ElementProto_not_ff!.scrollIntoView.call(el,
            OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && dir != null
            ? dir : { block: "nearest", behavior: instant ? "instant" : _unused })
}

export const modifySel = (sel: Selection, extend: BOOL | boolean | 2, di: BOOL | boolean
    , g: GranularityNames[VisualModeNS.kG]): void => {
  sel.modify(extend ? "extend" : "move", kDir[+di], g)
}

export const inputSelRange = (input: TextElement, start: number, end: number, di?: VisualModeNS.ForwardDir): void => {
  input.setSelectionRange(start, end, kDir[di! | 0])
}

export const rAF_: (callback: FrameRequestCallback) => number =
    Build.Inline ? requestAnimationFrame : f => requestAnimationFrame(f)

export const runJS_ = (code: string, returnEl?: HTMLScriptElement | null | 0
      ): void | HTMLScriptElement & SafeHTMLElement => {
    const docEl = !OnFirefox ? docEl_unsafe_() : null
    const script = returnEl || createElement_("script"), kJS = "allow-scripts"
    const sandbox = !isTop && ((frameElement_() || {}) as Partial<AccessableIFrameElement>).sandbox
    if (!Build.MV3) {
      script.type = "text/javascript";
      // keep it fast, rather than small
      !OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
          ? script.append!(code) : textContent_s(script, code)
    }
    if (sandbox && ! ((OnChrome && Build.MinCVer < BrowserVer.Min$HTMLIFrameElement$$sandbox$isTokenList || OnEdge)
        && isTY(sandbox) ? sandbox.includes(kJS) : (sandbox as DOMTokenList).contains(kJS))) {
      appendNode_s(createElement_("a"), script)
    } else {
      if (!OnFirefox) {
        docEl ? append_not_ff(docEl, script) : appendNode_s(doc, script)
      } else {
        appendNode_s(docEl_unsafe_() as SafeElement | null || doc, script)
      }
      if (Build.MV3) { // https://bugs.chromium.org/p/chromium/issues/detail?id=1207006#c4
        setOrRemoveAttr_s(script, "on" + INP, code)
        dispatchEvent_(script, newEvent_(INP, 1, 1, 1))
      }
    }
    return returnEl != null ? script as SafeHTMLElement & HTMLScriptElement : removeEl_s(script)
}

// preventScroll seems not to work on MS Edge (Chromium), but here keeps it, to match the spec better
export const focus_ = (el: SafeElement | KnownIFrameElement): void => { el.focus && el.focus({preventScroll: false}) }

export const blur_unsafe = (el: Element | null | undefined): void => {
  // in `Element::blur`, Chromium will check `AdjustedFocusedElementInTreeScope() == this` firstly
  el && (OnFirefox ? el.blur : isTY(el.blur, kTY.func)) && el.blur!()
}

export const dispatchEvent_ = (target: Window | Document | SafeElement
    , event: Event): boolean => target.dispatchEvent(event)

export const dispatchAsync_ = <T extends Event | kDispatch.clickFn | kDispatch.focusFn> (
    target: T extends kDispatch.clickFn ? SafeHTMLElement : Document | SafeElement
    , event: T, focusOpt?: T extends kDispatch.focusFn ? FocusOptions : undefined
    ): Promise<T extends Event ? boolean : undefined> => {
  if ((Build.BTypes & BrowserType.Edge
        || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.Min$queueMicrotask
        || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$queueMicrotask) && !queueTask_) {
    return Promise.resolve(isTY(event satisfies Event | number, kTY.num) ? focusOpt as never : event as Event)
        .then<boolean>((event === kDispatch.clickFn ? (target as SafeHTMLElement).click as never
          : event === kDispatch.focusFn ? target.focus as never : target.dispatchEvent
        ).bind<EventTarget, [Event], boolean>(target as Document | SafeElement)
    ) as Promise<T extends Event ? boolean : undefined>
  }
  return new Promise<T extends Event ? boolean : undefined>((resolve): void => {
    queueTask_!((): void => {
      const ret = event === kDispatch.clickFn ? (target as SafeHTMLElement).click()
          : event === kDispatch.focusFn ? (target as Document | ElementToHTMLOrForeign).focus!(focusOpt)
          : target.dispatchEvent(event as Event)
      resolve(ret as T extends Event ? boolean : undefined)
    })
  })
}

//#endregion
