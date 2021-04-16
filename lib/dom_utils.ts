import { chromeVer_, doc, createRegExp, isTY, Lower, OBJECT_TYPES, OnFirefox, OnChrome, OnEdge } from "./utils"
import { dimSize_, selRange_ } from "./rect"

interface kNodeToType {
  [kNode.TEXT_NODE]: Text
  [kNode.ELEMENT_NODE]: Element
  [kNode.DOCUMENT_NODE]: Document
  [kNode.DOCUMENT_FRAGMENT_NODE]: DocumentFragment | ShadowRoot
}

export const DAC = "DOMActivate", MDW = "mousedown", CLK = "click", HDN = "hidden", NONE = "none"
export const INP = "input", BU = "blur", ALA = "aria-label", UNL = "unload"
export const kDir = ["backward", "forward"] as const

  /** data and DOM-shortcut section */

let unsafeFramesetTag_old_cr_: "frameset" | "" | null =
    OnChrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter ? "" : 0 as never as null
let docSelectable_ = true

export { unsafeFramesetTag_old_cr_, docSelectable_ }
export function markFramesetTagUnsafe_old_cr (): "frameset" { return unsafeFramesetTag_old_cr_ = "frameset" }
export function set_docSelectable_ (_newDocSelectable: boolean): void { docSelectable_ = _newDocSelectable }

export const rAF_: (callback: FrameRequestCallback) => number =
    Build.NDEBUG ? requestAnimationFrame : f => requestAnimationFrame(f)

export const getComputedStyle_: (element: Element) => CSSStyleDeclaration =
    Build.NDEBUG ? getComputedStyle : el => getComputedStyle(el)

export const getSelection_: () => Selection = Build.NDEBUG ? getSelection : () => getSelection()

export const docEl_unsafe_ = (): Element | null => doc.documentElement

export const activeEl_unsafe_ = (): Element | null => doc.activeElement

export const querySelector_unsafe_ = (selector: string
    , scope?: SafeElement | ShadowRoot | Document | HTMLDivElement | HTMLDetailsElement
    ): Element | null => (scope || doc).querySelector(selector)

export const querySelectorAll_unsafe_ = ((selector: string, scope?: Element | ShadowRoot | null
    , isScopeAnElementOrNull?: 1): NodeListOf<Element> | void => {
  try {
    if (!OnFirefox) {
      return (scope && isScopeAnElementOrNull ? ElementProto() : scope || doc
          ).querySelectorAll.call(scope || doc, selector)
    } else {
      return (scope || doc).querySelectorAll(selector)
    }
  } catch {}
}) as {
  (selector: string, scope: Element | null, isScopeAnElementOrNull: 1): NodeListOf<Element> | void
  (selector: string, scope?: Element | ShadowRoot | null, isScopeAnElementOrNull?: 0): NodeListOf<Element> | void
}

export const isIFrameElement = (el: Element): el is KnownIFrameElement => {
  const tag = el.localName
  return (tag === "iframe" || tag === "frame") && "lang" in el
}

export const isNode_ = <T extends keyof kNodeToType> (node: Node, typeId: T): node is kNodeToType[T] => {
  return node.nodeType === typeId
}

export const rangeCount_ = (sel: Selection): number => sel.rangeCount

export const contains_s = (par: SafeElement | Document | ShadowRoot | HTMLDivElement, child: Node): boolean =>
    par.contains(child)

export const attr_s = (el: SafeElement, attr: string): string | null => el.getAttribute(attr)

export const selOffset_ = (sel: Selection, focus?: 1): number => focus ? sel.focusOffset : sel.anchorOffset

export const doesSupportDialog = (): boolean => typeof HTMLDialogElement == OBJECT_TYPES[kTY.func]

export const parentNode_unsafe_s = (el: SafeElement | HTMLStyleElement | Text
    ): Element | Document | DocumentFragment | null => el.parentNode as any

  /** DOM-compatibility section */

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
  <Ty extends 2>(element: HTMLElement): element is SafeHTMLElement
  <Ty extends 1>(element: Element): element is SafeHTMLElement
  (element: Element): "" | keyof HTMLElementTagNameMap; // this line is just to avoid a warning on VS Code
}

export const isInTouchMode_cr_ = OnChrome ? (): boolean => {
    const viewport_meta = querySelector_unsafe_("meta[name=viewport]")
    return !!viewport_meta && createRegExp(kTip.metaKeywordsForMobile, "i").test(
          (viewport_meta as TypeToAssert<Element, HTMLMetaElement, "content">).content! /* safe even if undefined */)
} : 0 as never as null

/** refer to {@link #BrowserVer.MinParentNodeGetterInNodePrototype } */
export const Getter_not_ff_ = !OnFirefox ? function <Ty extends Node, Key extends keyof Ty
    , ensured extends boolean = false>(Cls: { prototype: Ty; new (): Ty }, instance: Ty
      , property: Key & (Ty extends Element ? "assignedSlot" : "childNodes" | "parentNode")
      ): Exclude<NonNullable<Ty[Key]>, Window | RadioNodeList | HTMLCollection
            | (Key extends "parentNode" ? never : Element)>
          | (ensured extends true ? never : null) {
    const desc = Object.getOwnPropertyDescriptor(Cls.prototype, property);
    return desc && desc.get ? desc.get.call(instance) : null;
} : 0 as never as null

export let notSafe_not_ff_ = !OnFirefox ? (el: Element): el is HTMLFormElement => {
  let s: Element["localName"]
  return typeof (s = el.localName) !== "string" ||
      (!OnChrome || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
        ? s === "form" : s === "form" || s === unsafeFramesetTag_old_cr_)
} : 0 as never as null

  /** @safe_even_if_any_overridden_property */
export const SafeEl_not_ff_ = !OnFirefox ? function (
      this: void, el: Element | null, type?: PNType.DirectElement | undefined): Node | null {
  return el && notSafe_not_ff_!(el)
    ? SafeEl_not_ff_!(GetParent_unsafe_(el, type || PNType.RevealSlotAndGotoParent), type) : el
} as {
    (this: void, el: SafeElement | null, type?: any): unknown;
    (this: void, el: Element | null, type?: PNType.DirectElement): SafeElement | null;
} : 0 as never as null

export const GetShadowRoot_ = (el: Element): ShadowRoot | null => {
    // check type of el to avoid exceptions
    if (OnFirefox) {
      return Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1 ? el.shadowRoot as ShadowRoot | null
        : <ShadowRoot | null | undefined> el.shadowRoot || null;
    }
    // Note: .webkitShadowRoot and .shadowRoot share a same object
    const sr = OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
        && chromeVer_ < BrowserVer.MinEnsuredUnprefixedShadowDOMV0 ? el.webkitShadowRoot : el.shadowRoot;
    // according to https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow,
    // <form> and <frameset> can not have shadowRoot
    return OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
      ? sr && notSafe_not_ff_!(el) ? null : sr as Exclude<typeof sr, undefined | Element | RadioNodeList | Window>
      : sr && !notSafe_not_ff_!(el) && <Exclude<typeof sr, Element | RadioNodeList | Window>> sr || null;
}

export const GetChildNodes_not_ff = !OnFirefox ? (el: Element): NodeList => {
  if (!OnChrome || Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype) {
    return Getter_not_ff_!(Node, el, "childNodes")!
  } else {
    let cn = (el as Element).childNodes
    return cn instanceof NodeList && !("value" in cn) ? cn
        : Getter_not_ff_!(Node, el, "childNodes") || <NodeList> <{[index: number]: Node}> []
  }
} : 0 as never as null

export const ElementProto = (): SafeElement => Element.prototype as SafeElement

/** Try its best to find a real parent */
export const GetParent_unsafe_ = function (this: void, el: Node | Element
    , type: PNType.DirectNode | PNType.DirectElement | PNType.RevealSlot | PNType.RevealSlotAndGotoParent
    ): Node | null {
  /** Chrome: a selection / range can only know nodes and text in a same tree scope */
  if (!OnEdge && type >= PNType.RevealSlot) {
      if (OnChrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0 && chromeVer_ < BrowserVer.MinNoShadowDOMv0) {
        const func = ElementProto().getDestinationInsertionPoints,
        arr = func ? func.call(el) : [], len = arr.length;
        len > 0 && (el = arr[len - 1]);
      }
      let slot = (el as Element).assignedSlot;
      !OnFirefox && slot && notSafe_not_ff_!(el as Element) &&
      (slot = Getter_not_ff_!(Element, el as Element, "assignedSlot"));
      if (slot) {
        if (type === PNType.RevealSlot) { return slot; }
        while (slot = slot.assignedSlot) { el = slot; }
      }
  }
  type ParentNodeProp = Node["parentNode"]; type ParentElement = Node["parentElement"]
  let pe = el.parentElement as Exclude<ParentElement, Window>, pn = el.parentNode as Exclude<ParentNodeProp, Window>
  if (pe === pn /* normal pe or no parent */ || !pn /* indeed no par */) { return pn as Element | null }
  // may be `frameset,form` with pn or pe overridden; <frameset>.parentNode may be an connected shadowRoot
  if (!OnFirefox) {
    pn = (!OnChrome || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
          || !unsafeFramesetTag_old_cr_ || (pn as ParentNodeProp as WindowWithTop).top !== top)
        && pn!.nodeType && doc.contains.call(pn as Node, el) ? pn
        : !OnChrome || Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype
          || chromeVer_ > BrowserVer.MinParentNodeGetterInNodePrototype - 1 ? Getter_not_ff_!(Node, el, "parentNode")
        : (Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
          ? pe && (!unsafeFramesetTag_old_cr_ || (pe as ParentNodeProp as WindowWithTop).top !== top) : pe)
        && pe!.nodeType && doc.contains.call(pe as Element, el) ? (type = PNType.DirectNode, pe)
        : el === doc.body ? docEl_unsafe_() : null
  }
    // pn is real (if BrowserVer.MinParentNodeGetterInNodePrototype else) real or null
  return OnChrome && Build.MinCVer < BrowserVer.MinParentNodeGetterInNodePrototype && !pn
      || type === PNType.DirectNode ? pn as Node | null // may return a Node instance
      : type >= PNType.ResolveShadowHost
        && isNode_(pn as Node, kNode.DOCUMENT_FRAGMENT_NODE)
      ? (pn as DocumentFragment as ShadowRoot).host || null // shadow root or other type of doc fragment
      : (pn as Node as NodeToElement).tagName ? pn as Element /* in doc and .pN+.pE are overridden */
      : null /* pn is null, or some unknown type ... */;
} as {
    (this: void, el: Element, type: PNType.DirectElement
        | PNType.ResolveShadowHost | PNType.RevealSlot | PNType.RevealSlotAndGotoParent): Element | null;
    (this: void, el: Node, type: PNType.DirectNode): ShadowRoot | DocumentFragment | Document | Element | null;
}

export const scrollingEl_ = (fallback?: 1): SafeElement | null => {
    // Both C73 and FF66 still supports the Quirk mode (entered by `doc.open()`)
    let el = doc.scrollingElement, docEl = docEl_unsafe_();
    if (OnFirefox) {
      return el || !fallback ? el as SafeElement | null : docEl as SafeElement | null;
    }
    if (OnChrome && Build.MinCVer < BrowserVer.Min$Document$$ScrollingElement
        && el === void 0) {
      /**
       * The code about `inQuirksMode` in `Element::scrollTop()` is wrapped by a flag #scrollTopLeftInterop
       * since [2013-11-18] https://github.com/chromium/chromium/commit/25aa0914121f94d2e2efbc4bf907f231afae8b51 ,
       * while the flag is hidden on Chrome 34~43 (32-bits) for Windows (34.0.1751.0 is on 2014-04-07).
       * But the flag is under the control of #enable-experimental-web-platform-features
       */
      let body = doc.body;
      el = doc.compatMode === "BackCompat" || body && (scrollY ? dimSize_(body as SafeElement, kDim.positionY)
            : dimSize_(docEl as SafeElement, kDim.scrollW) <= dimSize_(body as SafeElement, kDim.scrollH))
        ? body : body ? docEl : null;
      // If not fallback, then the task is to get an exact one in order to use `scEl.scrollHeight`,
      // but if body is null in the meanwhile, then docEl.scrollHeight is not reliable (scrollY neither)
      //   when it's real scroll height is not larger than innerHeight
    }
    // here `el` may be `:root, :root > body, :root > frameset` or `null`
    return el && !notSafe_not_ff_!(el) ? el as SafeElement
        : fallback && docEl && !notSafe_not_ff_!(docEl) ? docEl as SafeElement
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
    let el: typeof frameElement | undefined;
    if (OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement) {
      try {
        if (!OnFirefox) { return frameElement as SafeHTMLElement }
        else { el = frameElement; }
      } catch {}
    } else {
      if (!OnFirefox) { return frameElement as SafeHTMLElement }
      el = frameElement;
    }
    if (OnFirefox) {
      if (el) {
        frameElement_ = () => el as SafeHTMLElement;
      }
      return el as SafeHTMLElement
    }
}

export const compareDocumentPosition = (anchorNode: Node, focusNode: Node) =>
    !OnFirefox ? Node.prototype.compareDocumentPosition.call(anchorNode, focusNode)
    : anchorNode.compareDocumentPosition(focusNode)

export const getAccessibleSelectedNode = (sel: Selection, focused?: 1): Node | null => {
  let node = focused ? sel.focusNode : sel.anchorNode
  if (OnFirefox) {
    try {
      node && compareDocumentPosition(node, node)
    } catch { node = null }
  }
  return node
}
    
  /** computation section */

export const findMainSummary_ = ((details: HTMLDetailsElement | Element | null): SafeHTMLElement | null => {
    // not query `:scope>summary` for more consistent performance
    // Specification: https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element
    // `HTMLDetailsElement::FindMainSummary()` in
    // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_details_element.cc?g=0&l=101
    if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Array$$find$$findIndex) {
      return ([].find as (predicate: (el: Element) => el is SafeHTMLElement) => SafeHTMLElement | undefined
          ).call(details!.children, (el): el is SafeHTMLElement => htmlTag_(el) === "summary") || null
    }
    let found: SafeHTMLElement | null = null
    for (let summaries = details!.children, i = 0; i < summaries.length && !found; i++) {
      const summary = summaries[i];
      // there's no window.HTMLSummaryElement on C70
      found = htmlTag_(summary) === "summary" ? summary as SafeHTMLElement : found
    }
    return found
}) as (details: HTMLDetailsElement) => SafeHTMLElement | null

export const IsInDOM_ = function (this: void, element: Element, root?: Element | Document | Window | RadioNodeList
      , checkMouseEnter?: 1): boolean {
    if (!root) {
      const isConnected = element.isConnected; /** {@link #BrowserVer.Min$Node$$isConnected} */
      if (!(OnChrome || OnEdge) || isConnected === !!isConnected) {
        return isConnected!; // is boolean : exists and is not overridden
      }
    }
    let f: Node["getRootNode"], pe: Element | null;
    root = <Element | Document> root || (OnFirefox ? element.ownerDocument as Document
        : (root = element.ownerDocument, OnChrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter &&
            unsafeFramesetTag_old_cr_ && (root as WindowWithTop).top === top ||
            !isNode_(root as Document | RadioNodeList as Document, kNode.DOCUMENT_NODE)
            ? doc : root as Document))
    if (OnFirefox || !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode)
        ? isNode_(root, kNode.DOCUMENT_NODE) : isNode_(root, kNode.DOCUMENT_NODE) && (f = doc.getRootNode)) {
      return OnFirefox
        ? element.getRootNode!({composed: true}) === root
        : (!OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode)
            ? doc.getRootNode : f)!.call(element, {composed: true}) === root;
    }
    if (!OnFirefox ? doc.contains.call(root, element)
        : contains_s(root as SafeElement | Exclude<typeof root, Element>, element)) {
      return true;
    }
    while ((pe = GetParent_unsafe_(element
                  , checkMouseEnter ? PNType.RevealSlotAndGotoParent : PNType.ResolveShadowHost))
            && pe !== root) {
      element = pe;
    }
    // if not pe, then PNType.DirectNode won't return an Element
    // because .GetParent_ will only return a real parent, but not a fake <form>.parentNode
    return (pe || GetParent_unsafe_(element, PNType.DirectNode)) === root;
} as (this: void,  element: Element, root?: Element | Document, checkMouseEnter?: 1) => boolean

export const isStyleVisible_ = (element: Element): boolean => isRawStyleVisible(getComputedStyle_(element))
export const isRawStyleVisible = (style: CSSStyleDeclaration): boolean => style.visibility === "visible"

export const isAriaNotTrue_ = (element: SafeElement, ariaType: kAria): boolean => {
    let s = element.getAttribute(ariaType ? "aria-disabled" : "aria-hidden");
    return s === null || (!!s && Lower(s) !== "true");
}

export const getMediaTag = (element: SafeHTMLElement) => {
  const tag = element.localName
  return tag === "img" ? kMediaTag.img : tag === "video" || tag === "audio" ? kMediaTag.otherMedias
      : tag === "a" ? kMediaTag.a : kMediaTag.others
}

export const getMediaUrl = (element: HTMLImageElement | SafeHTMLElement, isMedia: boolean): string => {
  let kSrcAttr: "src", srcValue: string | null
  return element.dataset.src
      // according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement#Browser_compatibility,
      // <img>.currentSrc is since C45
      || isMedia && (element as HTMLImageElement).currentSrc
      || (srcValue = attr_s(element, kSrcAttr = isMedia ? "src" : "href" as never) || "",
          srcValue && (element as Partial<HTMLImageElement>)[kSrcAttr] || srcValue)
}

export const uneditableInputs_: SafeEnum = { __proto__: null as never,
    bu: 1, ch: 1, co: 1, fi: 1, hi: 1, im: 1, ra: 1, re: 1, su: 1
}

export const editableTypes_: SafeObject & { readonly [localName in ""]?: undefined } & {
  [localName in "keygen"]?: EditableType | undefined
} & {
  readonly [localName in keyof HTMLElementTagNameMap]?: EditableType | undefined
} = { __proto__: null as never,
    input: EditableType.input_, textarea: EditableType.TextBox,
    select: EditableType.Select,
    embed: EditableType.Embed, object: EditableType.Embed
}

export const getInputType = (el: HTMLInputElement): string => el.type.slice(0, 2)

  /**
   * if true, then `element` is `LockableElement`,
   * so MUST always filter out HTMLFormElement, to keep LockableElement safe
   */
export const getEditableType_ = function (element: Element): EditableType {
    const tag = htmlTag_(element), ty = editableTypes_[tag];
    return !tag ? EditableType.NotEditable : ty !== EditableType.input_ ? (ty ||
        ((element as HTMLElement).isContentEditable !== true
        ? EditableType.NotEditable : EditableType.TextBox)
      )
      : uneditableInputs_[getInputType(element as HTMLInputElement)] ? EditableType.NotEditable : EditableType.TextBox
} as {
    (element: Element): element is LockableElement;
    <Ty extends 0>(element: Element): EditableType;
    <Ty extends EventTarget>(element: EventTarget): element is LockableElement
    (element: Element): element is LockableElement; // this line is just to avoid a warning on VS Code
}

export const isSelected_ = (): boolean => {
    const element = activeEl_unsafe_()!, sel = getSelection_(), node = getAccessibleSelectedNode(sel)
    return !node ? false
      : (element as TypeToAssert<Element, HTMLElement, "isContentEditable">).isContentEditable === true
      ? OnFirefox ? contains_s(element as SafeElement, node) : doc.contains.call(element, node)
      : element === node || !!(node as NodeToElement).tagName
        && element === (!OnFirefox ? GetChildNodes_not_ff!(node as Element)
            : node.childNodes as NodeList)[selOffset_(sel)]
}

/** return `right` in case of unknown cases */
export const getDirectionOfNormalSelection = (sel: Selection, anc: Node, focus: Node): VisualModeNS.ForwardDir => {
  const num1 = compareDocumentPosition(anc, focus)
  return (
      num1 & (kNode.DOCUMENT_POSITION_CONTAINS | kNode.DOCUMENT_POSITION_CONTAINED_BY)
      ? selRange_(sel, 1).endContainer === anc : (num1 & kNode.DOCUMENT_POSITION_PRECEDING)
    ) ? VisualModeNS.kDir.left : VisualModeNS.kDir.right
}

export const getSelectionFocusEdge_ = (sel: Selection, knownDi?: VisualModeNS.ForwardDir): SafeElement | null => {
    let el = rangeCount_(sel) && getAccessibleSelectedNode(sel, 1), nt: Node["nodeType"], o: Node | null | 0 = el
    if (!el) { return null; }
    const anc = getAccessibleSelectedNode(sel)
    knownDi = knownDi != null ? knownDi
        : anc === el ? (selOffset_(sel, 1) < selOffset_(sel) ? VisualModeNS.kDir.left : VisualModeNS.kDir.right)
        : anc ? getDirectionOfNormalSelection(sel, anc, el) : 1
    if ((el as NodeToElement).tagName) {
      o = (OnFirefox ? el.childNodes as NodeList : GetChildNodes_not_ff!(el as Element))[selOffset_(sel, 1)]
    } else {
      el = GetParent_unsafe_(el as Node, PNType.DirectNode)
    }
    for (; o && (!OnChrome || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
          ? <number> <Element | RadioNodeList | kNode> o.nodeType - kNode.ELEMENT_NODE
          : isTY(nt = o.nodeType, kTY.num) && nt - kNode.ELEMENT_NODE)
        ; o = knownDi ? o!.previousSibling : o!.nextSibling) { /* empty */ }
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

  /** action section */

  /** Note: won't call functions if Vimium C is destroyed */
let OnDocLoaded_: (callback: (this: void) => any, onloaded?: 1) => void

export { OnDocLoaded_ }
export function set_OnDocLoaded_ (_newOnDocLoaded: typeof OnDocLoaded_): void { OnDocLoaded_ = _newOnDocLoaded }

export let createElement_ = doc.createElement.bind(doc) as {
    <K extends VimiumContainerElementType> (this: void, htmlTagName: K): HTMLElementTagNameMap[K] & SafeHTMLElement;
}
export function set_createElement_ (_newCreateEl: typeof createElement_): void { createElement_ = _newCreateEl }

export const appendNode_s = (parent: SafeElement | Document | HTMLDivElement | HTMLDialogElement | DocumentFragment
    , child: Element | DocumentFragment | Text): void => {
  OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
      ? parent.appendChild(child) : parent.append!(child)
}

export const append_not_ff = !OnFirefox ? (parent: Element, child: HTMLElement): void => {
  (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
      ? ElementProto().appendChild : ElementProto().append!).call(parent, child)
} : 0 as never

export const removeEl_s = (el: SafeHTMLElement | HTMLDialogElement | HTMLScriptElement | HTMLSpanElement): void => {
  el.remove()
}

export const setClassName_s = (el: SafeHTMLElement | HTMLDivElement | HTMLSpanElement, className: string): void => {
  el.className = className
}

export const setVisibility_s = (el: SafeHTMLElement | HTMLDivElement | HTMLSpanElement, visible: boolean): void => {
  el.style.visibility = visible ? "" : HDN
}

export const setDisplaying_s = (el: SafeHTMLElement | HTMLDivElement | HTMLSpanElement, display?: BOOL): void => {
  el.style.display = display ? "" : NONE
}

export const setOrRemoveAttr_s = (el: SafeElement, attr: string, newVal?: string | null): void => {
  newVal != null ? el.setAttribute(attr, newVal) : el.removeAttribute(attr)
}

export const toggleClass_s = (el: SafeElement | HTMLDivElement | HTMLDialogElement
    , className: string, force?: boolean | BOOL): void => {
  const list = el.classList
  force != null ? list.toggle(className, !!force) : list.toggle(className)
}

export const textContent_s = ((el: SafeElement, text?: string): string => text ? el.textContent = text : el.textContent
) as {
  (el: SafeHTMLElement | HTMLStyleElement | HTMLScriptElement, text: string): string
  (el: SafeElement | HTMLStyleElement): string
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

export const scrollIntoView_ = (el: Element, dir?: boolean): void => {
    OnFirefox ? el.scrollIntoView({ block: "nearest" })
      : ElementProto().scrollIntoView.call(el,
          OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && dir != null ? dir : { block: "nearest" })
}

export const modifySel = (sel: Selection, extend: BOOL | boolean, di: BOOL | boolean
    , g: GranularityNames[VisualModeNS.kG]): void => {
  sel.modify(extend ? "extend" : "move", kDir[+di], g)
}

export const runJS_ = (code: string, returnEl?: HTMLScriptElement | null | 0
      ): void | HTMLScriptElement & SafeHTMLElement => {
    const docEl = !OnFirefox ? docEl_unsafe_() : null
    const script = returnEl || createElement_("script");
    script.type = "text/javascript";
    // keep it fast, rather than small
    !OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
        ? script.append!(code) : textContent_s(script, code)
    if (!OnFirefox) {
      docEl ? append_not_ff(docEl, script) : appendNode_s(doc, script)
    } else {
      appendNode_s(docEl_unsafe_() as SafeElement | null || doc, script)
    }
    return returnEl != null ? script as SafeHTMLElement & HTMLScriptElement : removeEl_s(script)
}

export const focus_ = (el: SafeElement): void => { el.focus && el.focus() }
