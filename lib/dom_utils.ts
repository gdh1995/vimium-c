import { VOther, chromeVer_, doc } from "./utils"

export const MDW = "mousedown", CLK = "click", HDN = "hidden", NONE = "none"

  /** data and DOM-shortcut section (sorted by reference numbers) */

let unsafeFramesetTag_old_cr_: "frameset" | "" | null =
    Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
    ? "" : 0 as never as null
let docSelectable_ = true
export { unsafeFramesetTag_old_cr_, docSelectable_ }
export function markFramesetTagUnsafe (): "frameset" { return unsafeFramesetTag_old_cr_ = "frameset" }
export function set_docSelectable_ (_newDocSelectable: boolean): void { docSelectable_ = _newDocSelectable }

export const devRatio_ = (): number => devicePixelRatio

export const getInnerHeight = (): number => innerHeight as number
export const getInnerWidth = (): number => innerWidth as number

export const rAF_: (callback: FrameRequestCallback) => number =
    Build.NDEBUG ? requestAnimationFrame : f => requestAnimationFrame(f)

export const getComputedStyle_: (element: Element) => CSSStyleDeclaration =
    Build.NDEBUG ? getComputedStyle : el => getComputedStyle(el)

export const getSelection_: () => Selection = Build.NDEBUG ? getSelection : () => getSelection()

  /** @UNSAFE_RETURNED */
export const docEl_unsafe_ = (): Element | null => doc.documentElement

  /** @UNSAFE_RETURNED */
export const activeEl_unsafe_ = (): Element | null => doc.activeElement

  /** @UNSAFE_RETURNED */
export const querySelector_unsafe_ = (selector: string
    , scope?: SafeElement | ShadowRoot | Document | HTMLDivElement | HTMLDetailsElement
    ): Element | null => (scope || doc).querySelector(selector)

  /** @UNSAFE_RETURNED */
export const querySelectorAll_unsafe_ = ((scope: Document | SafeElement, selector: string
      ): NodeListOf<Element> | void => {
    try { return scope.querySelectorAll(selector); } catch {}
}) as {
  (scope: Document | SafeElement, selector: string): NodeListOf<Element> | void
}

  /** DOM-compatibility section */

export const isHTML_ = !(Build.BTypes & BrowserType.Firefox)
    || Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox
      ? (): boolean => "lang" in <ElementToHTML> (docEl_unsafe_() || {})
      : (): boolean => doc instanceof HTMLDocument

export const htmlTag_ = (Build.BTypes & ~BrowserType.Firefox ? function (element: Element | HTMLElement): string {
    let s: Element["localName"];
    if ("lang" in element && typeof (s = element.localName) === "string") {
      return (Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter || !(Build.BTypes & BrowserType.Chrome)
          ? s === "form" : s === "form" || s === unsafeFramesetTag_old_cr_) ? "" : s;
    }
    return "";
  } : (element: Element): string => "lang" in element ? (element as SafeHTMLElement).localName : ""
) as (element: Element) => string // duplicate the signature, for easier F12 in VS Code

export const isInTouchMode_cr_ = Build.BTypes & BrowserType.Chrome ? (): boolean => {
    const viewport_meta = querySelector_unsafe_("meta[name=viewport]")
    return !!viewport_meta &&
      (<RegExpI> /\b(device-width|initial-scale)\b/i).test(
          (viewport_meta as TypeToAssert<Element, HTMLMetaElement, "content">).content! /* safe even if undefined */)
} : 0 as never as null

/** refer to {@link #BrowserVer.MinParentNodeGetterInNodePrototype } */
export const Getter_not_ff_ = Build.BTypes & ~BrowserType.Firefox ? function <Ty extends Node, Key extends keyof Ty
            , ensured extends boolean = false>(this: void
      , Cls: { prototype: Ty; new (): Ty }, instance: Ty
      , property: Key & (Ty extends Element ? "assignedSlot" : "childNodes" | "parentNode")
      ): Exclude<NonNullable<Ty[Key]>, Window | RadioNodeList | HTMLCollection
            | (Key extends "parentNode" ? never : Element)>
          | (ensured extends true ? never : null) {
    const desc = Object.getOwnPropertyDescriptor(Cls.prototype, property);
    return desc && desc.get ? desc.get.call(instance) : null;
} : 0 as never as null

export let notSafe_not_ff_ = Build.BTypes & ~BrowserType.Firefox ? (el: Element | null): el is HTMLFormElement => {
    let s: Element["localName"];
    return !!el && (typeof (s = el.localName) !== "string" ||
      (Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter || !(Build.BTypes & BrowserType.Chrome)
        ? s === "form" : s === "form" || s === unsafeFramesetTag_old_cr_)
    );
} : 0 as never as null
export const setNotSafe_not_ff = (f: typeof notSafe_not_ff_): void => { notSafe_not_ff_ = f }

  /** @safe_even_if_any_overridden_property */
export const SafeEl_not_ff_ = Build.BTypes & ~BrowserType.Firefox ? function (
      this: void, el: Element | null, type?: PNType.DirectElement | undefined): Node | null {
  return notSafe_not_ff_!(el)
    ? SafeEl_not_ff_!(GetParent_unsafe_(el, type || PNType.RevealSlotAndGotoParent), type) : el
} as {
    (this: void, el: SafeElement | null, type?: any): unknown;
    (this: void, el: Element | null, type?: PNType.DirectElement): SafeElement | null;
} : 0 as never as null

export const GetShadowRoot_ = (el: Element): ShadowRoot | null => {
    // check type of el to avoid exceptions
    if (!(Build.BTypes & ~BrowserType.Firefox)) {
      return Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1 ? el.shadowRoot as ShadowRoot | null
        : <ShadowRoot | null | undefined> el.shadowRoot || null;
    }
    // Note: .webkitShadowRoot and .shadowRoot share a same object
    const sr = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
        && chromeVer_ < BrowserVer.MinEnsuredUnprefixedShadowDOMV0 ? el.webkitShadowRoot : el.shadowRoot;
    // according to https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow,
    // <form> and <frameset> can not have shadowRoot
    return (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      ? sr && notSafe_not_ff_!(el) ? null : sr as Exclude<typeof sr, undefined | Element | RadioNodeList | Window>
      : sr && !notSafe_not_ff_!(el) && <Exclude<typeof sr, Element | RadioNodeList | Window>> sr || null;
}

export const GetChildNodes_not_ff = Build.BTypes & ~BrowserType.Firefox ? (el: Element): NodeList => {
  if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype) {
    return Getter_not_ff_!(Node, el, "childNodes")!
  } else {
    let cn = (el as Element).childNodes
    return cn instanceof NodeList && !("value" in cn) ? cn
        : Getter_not_ff_!(Node, el, "childNodes") || <NodeList> <{[index: number]: Node}> []
  }
} : 0 as never as null

export const elementProto = (): Element => Element.prototype

  /**
   * Try its best to find a real parent
   * @safe_even_if_any_overridden_property
   * @UNSAFE_RETURNED
   */
export const GetParent_unsafe_ = function (this: void, el: Node | Element
      , type: PNType.DirectNode | PNType.DirectElement | PNType.RevealSlot | PNType.RevealSlotAndGotoParent
      ): Node | null {
    /**
     * Known info about Chrome:
     * * a selection / range can only know nodes and text in a same tree scope
     */
    const kPN = "parentNode"
    if (type >= PNType.RevealSlot && Build.BTypes & ~BrowserType.Edge) {
      if (Build.MinCVer < BrowserVer.MinNoShadowDOMv0 && Build.BTypes & BrowserType.Chrome
          && chromeVer_ < BrowserVer.MinNoShadowDOMv0) {
        const func = elementProto().getDestinationInsertionPoints,
        arr = func ? func.call(el) : [], len = arr.length;
        len > 0 && (el = arr[len - 1]);
      }
      let slot = (el as Element).assignedSlot;
      Build.BTypes & ~BrowserType.Firefox && slot && notSafe_not_ff_!(el as Element) &&
      (slot = Getter_not_ff_!(Element, el as HTMLFormElement, "assignedSlot"));
      if (slot) {
        if (type === PNType.RevealSlot) { return slot; }
        while (slot = slot.assignedSlot) { el = slot; }
      }
    }
    type ParentNodeProp = Node["parentNode"]; type ParentElement = Node["parentElement"];
    let pe = el.parentElement as Exclude<ParentElement, Window>
      , pn = el.parentNode as Exclude<ParentNodeProp, Window>;
    if (pe === pn /* normal pe or no parent */ || !pn /* indeed no par */) { return pn as Element | null; }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
        && pe && unsafeFramesetTag_old_cr_!) { // may be [a <frameset> with pn or pe overridden], or a <form>
      const action = +((pn as ParentNodeProp as WindowWithTop).top === top)
          + 2 * +((pe as ParentElement as WindowWithTop).top === top);
      if (action) { // indeed a <frameset>
        return action < 2 ? pe as Element : action < 3 ? pn as Node : el === doc.body ? docEl_unsafe_()
          : Getter_not_ff_!(Node, el, kPN);
      }
    }
    // par exists but not in normal tree
    if (Build.BTypes & ~BrowserType.Firefox && !(pn.nodeType && pn.contains(el))) { // pn is overridden
      if (pe && pe.nodeType && pe.contains(el)) { /* pe is real */ return pe; }
      pn = Getter_not_ff_!(Node, el, kPN);
    }
    // pn is real (if BrowserVer.MinParentNodeGetterInNodePrototype else) real or null
    return type === PNType.DirectNode ? pn as Node | null // may return a Node instance
      : type >= PNType.ResolveShadowHost && (
        !(Build.BTypes & ~BrowserType.Firefox) || Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype || pn)
        && (pn as Node).nodeType === kNode.DOCUMENT_FRAGMENT_NODE
      ? (pn as DocumentFragment as ShadowRoot).host || null // shadow root or other type of doc fragment
      : (!(Build.BTypes & ~BrowserType.Firefox) || Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype || pn)
        && "tagName" in (pn as Node) ? pn as Element /* in doc and .pN+.pE are overridden */
      : null /* pn is null, or some unknown type ... */;
} as {
    (this: void, el: Element, type: PNType.DirectElement
        | PNType.ResolveShadowHost | PNType.RevealSlot | PNType.RevealSlotAndGotoParent): Element | null;
    (this: void, el: Node, type: PNType.DirectNode): ShadowRoot | DocumentFragment | Document | Element | null;
}

export const scrollingEl_ = (fallback?: 1): SafeElement | null => {
    // Both C73 and FF66 still supports the Quirk mode (entered by `doc.open()`)
    let el = doc.scrollingElement, docEl = docEl_unsafe_();
    if (Build.MinCVer < BrowserVer.Min$Document$$ScrollingElement && Build.BTypes & BrowserType.Chrome
        && el === void 0) {
      /**
       * The code about `inQuirksMode` in `Element::scrollTop()` is wrapped by a flag #scrollTopLeftInterop
       * since [2013-11-18] https://github.com/chromium/chromium/commit/25aa0914121f94d2e2efbc4bf907f231afae8b51 ,
       * while the flag is hidden on Chrome 34~43 (32-bits) for Windows (34.0.1751.0 is on 2014-04-07).
       * But the flag is under the control of #enable-experimental-web-platform-features
       */
      let body = doc.body;
      el = doc.compatMode === "BackCompat" || body && (
              scrollY ? body.scrollTop : (docEl as HTMLElement).scrollHeight <= body.scrollHeight)
        ? body : body ? docEl : null;
      // If not fallback, then the task is to get an exact one in order to use `scEl.scrollHeight`,
      // but if body is null in the meanwhile, then docEl.scrollHeight is not reliable (scrollY neither)
      //   when it's real scroll height is not larger than innerHeight
    }
    if (!(Build.NDEBUG
          || BrowserVer.MinEnsured$ScrollingElement$CannotBeFrameset < BrowserVer.MinFramesetHasNoNamedGetter)) {
      console.log("Assert error: MinEnsured$ScrollingElement$CannotBeFrameset < MinFramesetHasNoNamedGetter");
    }
    if (Build.MinCVer < BrowserVer.MinEnsured$ScrollingElement$CannotBeFrameset && Build.BTypes & BrowserType.Chrome) {
      el = notSafe_not_ff_!(el!) ? null : el;
    }
    if (!(Build.BTypes & ~BrowserType.Firefox)) {
      return el || !fallback ? el as SafeElement | null : docEl as SafeElement | null;
    }
    // here `el` may be `:root` / `:root > body` / null, but never `:root > frameset`
    return notSafe_not_ff_!(el!) ? null // :root is unsafe
      : el || !fallback ? el as SafeElement | null // el is safe object or null
      : notSafe_not_ff_!(docEl) ? null : docEl as SafeElement | null;
}

  /** @UNSAFE_RETURNED */
export const fullscreenEl_unsafe_ = (): Element | null => {
    /** On Firefox, doc.fullscreenElement may not exist even since FF64 - see Min$Document$$FullscreenElement */
    return !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
      ? doc.mozFullScreenElement
      : !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
      ? doc.fullscreenElement : doc.webkitFullscreenElement;
}

  // Note: sometimes a cached frameElement is not the wanted
export let frameElement_ = (): Element | null | void => {
    let el: typeof frameElement | undefined;
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement
        || Build.BTypes & BrowserType.Edge) {
      try {
        if (!(Build.BTypes & BrowserType.Firefox)) { return frameElement; }
        else { el = frameElement; }
      } catch {}
    } else {
      if (!(Build.BTypes & BrowserType.Firefox)) { return frameElement; }
      el = frameElement;
    }
    if (Build.BTypes & BrowserType.Firefox) {
      if (el && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)) {
        frameElement_ = () => el;
      }
      return el;
    }
}

  /** computation section */

  /** depends on .docZoom_, .bZoom_, .paintBox_ */
export let prepareCrop_ = (inVisualViewport?: 1, limitedView?: Rect | null): number => {
    let vright: number, vbottom: number, vbottoms: number, vleft: number, vtop: number, vtops: number;
    prepareCrop_ = (function (this: void, inVisual?: 1, limited?: Rect | null): number {
      const dz = Build.BTypes & ~BrowserType.Firefox ? docZoom_ : 1,
      fz = Build.BTypes & ~BrowserType.Firefox ? dz * bZoom_ : 1, b = paintBox_,
      max = Math.max, min = Math.min,
      d = doc, visual = inVisual && visualViewport;
      let i: number, j: number, el: Element | null, docEl: Document["documentElement"];
      vleft = vtop = 0;
      if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$ ? visual
          : visual && visual.width) {
        vleft = visual!.offsetLeft | 0, vtop = visual!.offsetTop | 0;
        i = vleft + visual!.width! | 0; j = vtop + visual!.height | 0;
      }
      else if (docEl = docEl_unsafe_(),
          el = Build.MinCVer >= BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled
              || !(Build.BTypes & BrowserType.Chrome)
              ? scrollingEl_() : d.compatMode === "BackCompat" ? d.body : docEl,
          Build.MinCVer < BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled && Build.BTypes & BrowserType.Chrome
            ? el && !notSafe_not_ff_!(el) : el) {
        i = el!.clientWidth, j = el!.clientHeight;
      } else {
        i = getInnerWidth(), j = getInnerHeight()
        if (!docEl) { return vbottom = j, vbottoms = j - 8, vright = i; }
        // the below is not reliable but safe enough, even when docEl is unsafe
        i = min(max(i - GlobalConsts.MaxScrollbarWidth, (docEl.clientWidth * dz) | 0), i);
        j = min(max(j - GlobalConsts.MaxScrollbarWidth, (docEl.clientHeight * dz) | 0), j);
      }
      if (b) {
        i = min(i, b[0] * dz); j = min(j, b[1] * dz);
      }
      vright = (i / fz) | 0, vbottom = (j / fz) | 0;
      if (limited) {
        vleft = max(vleft, limited.l | 0);
        vtop = max(vtop, limited.t | 0);
        vright = min(vright, limited.r | 0);
        vbottom = min(vbottom, limited.b | 0);
      }
      vtops = vtop + 3;
      vbottoms = (vbottom - 8 / fz) | 0;
      return vright;
    });
    cropRectToVisible_ = (function (left, top, right, bottom): Rect | null {
      if (top > vbottoms || bottom < vtops) {
        return null;
      }
      const cr: Rect = {
        l: left   > vleft   ? (left   | 0) : vleft,
        t: top    > vtop    ? (top    | 0) : vtop,
        r: right  < vright  ? (right  | 0) : vright,
        b: bottom < vbottom ? (bottom | 0) : vbottom
      };
      return cr.r - cr.l > 2 && cr.b - cr.t > 2 ? cr : null;
    });
    return prepareCrop_(inVisualViewport, limitedView);
}

export let getBoundingClientRect_: (el: Element) => ClientRect = Build.BTypes & ~BrowserType.Firefox ? (el) => {
  type ClientRectGetter = (this: Element) => ClientRect
  const func = elementProto().getBoundingClientRect as ClientRectGetter
  getBoundingClientRect_ = func.call.bind<(this: ClientRectGetter, self: Element) => ClientRect>(func)
  return getBoundingClientRect_(el)
} : el => el.getBoundingClientRect()

export const getVisibleClientRect_ = (element: SafeElement, el_style?: CSSStyleDeclaration | null): Rect | null => {
    let cr: Rect | null, I: "inline" | undefined, useChild: boolean, isInline: boolean | undefined, str: string
    for (const rect of <ClientRect[]> <{[i: number]: ClientRect}> element.getClientRects()) {
      if (rect.height > 0 && rect.width > 0) {
        if (cr = cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)) {
          return isRawStyleVisible(el_style || getComputedStyle_(element)) ? cr : null
        }
        continue;
      }
      // according to https://dom.spec.whatwg.org/#dom-parentnode-children
      // .children will always be a HTMLCollection even if element is SVGElement
      if (I) {
        continue;
      }
      I = "inline"
      for (const el2 of <Element[]> <{[index: number]: Element}> element.children) {
        const st = getComputedStyle_(el2)
        if (useChild = st.float !== NONE || ((str = st.position) !== "static" && str !== "relative")) { /* empty */ }
        else if (rect.height === 0) {
          if (isInline == null) {
            el_style || (el_style = getComputedStyle_(element))
            isInline = (el_style.fontSize === "0px" || el_style.lineHeight === "0px")
              && el_style.display.startsWith(I)
          }
          useChild = isInline && st.display.startsWith(I)
        }
        if (useChild && !(Build.BTypes & ~BrowserType.Firefox && notSafe_not_ff_!(el2))
            && (cr = getVisibleClientRect_(el2 as SafeElement, st))) {
          return cr;
        }
      }
    }
    return null;
}

export const getClientRectsForAreas_ = function (element: HTMLElementUsingMap, output: Hint[]
      , areas?: NodeListOf<HTMLAreaElement | Element> | HTMLAreaElement[]): Rect | null {
    let diff: number, x1: number, x2: number, y1: number, y2: number, rect: Rect | null | undefined;
    const cr = padClientRect_(getBoundingClientRect_(element)), crWidth = cr.r - cr.l, crHeight = cr.b - cr.t
    if (crHeight < 3 || crWidth < 3) { return null }
    // replace is necessary: chrome allows "&quot;", and also allows no "#"
    if (!areas) {
      const selector = `map[name="${element.useMap.replace(<RegExpOne> /^#/, "").replace(<RegExpG> /"/g, '\\"')}"]`;
      // on C73, if a <map> is moved outside from a #shadowRoot, then the relation of the <img> and it is kept;
      // while on F65 the relation will get lost.
      const root = (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || !(Build.BTypes & ~BrowserType.Firefox) || element.getRootNode)
        ? element.getRootNode!() as ShadowRoot | Document : doc;
      const map = querySelector_unsafe_(selector, root)
      if (!map || (map as ElementToHTML).lang == null) { return null; }
      areas = querySelectorAll_unsafe_(map as SafeHTMLElement, "area")!
    }
    const toInt = (a: string): number => (a as string | number as number) | 0;
    for (let _i = 0, _len = areas.length; _i < _len; _i++) {
      const area = areas[_i] as HTMLAreaElement | Element;
      if (!("lang" in area)) { continue; }
      let coords = area.coords.split(",").map(toInt);
      switch (area.shape.toLowerCase()) {
      case "circle": case "circ": // note: "circ" is non-conforming
        x2 = coords[0]; y2 = coords[1]; diff = coords[2] / Math.sqrt(2);
        x1 = x2 - diff; x2 += diff; y1 = y2 - diff; y2 += diff;
        diff = 3;
        break;
      case "default": x1 = y1 = diff = 0, x2 = crWidth, y2 = crHeight; break
      case "poly": case "polygon": // note: "polygon" is non-conforming
        y1 = coords[0], y2 = coords[2], diff = coords[4];
        x1 = Math.min(y1, y2, diff); x2 = Math.max(y1, y2, diff);
        y1 = coords[1], y2 = coords[3], diff = coords[5];
        y1 = Math.min(y1, y2, diff); y2 = Math.max(coords[1], y2, diff);
        diff = 6;
      default:
        x1 = coords[0]; y1 = coords[1]; x2 = coords[2]; y2 = coords[3];
        x1 > x2 && (x1 = x2, x2 = coords[0]);
        y1 > y2 && (y1 = y2, y2 = coords[1]);
        diff = 4;
        break;
      }
      if (coords.length < diff) { continue; }
      rect = cropRectToVisible_(x1 + cr.l, y1 + cr.t, x2 + cr.l, y2 + cr.t)
      if (rect) {
        (output as Hint5[]).push([area, rect, 0, [rect, 0], element]);
      }
    }
    return output.length ? output[0][1] : null;
} as {
    (element: HTMLElementUsingMap, output: Hint[], areas?: HTMLCollectionOf<HTMLAreaElement> | HTMLAreaElement[]
      ): Rect | null;
}

export const getCroppedRect_ = function (el: Element, crect: Rect | null): Rect | null {
    let parent: Element | null = el, prect: Rect | null | undefined, i: number = crect ? 4 : 0, bcr: Rect
    while (1 < i-- && (parent = GetParent_unsafe_(parent, PNType.RevealSlotAndGotoParent))
        && getComputedStyle_(parent).overflow !== HDN
        ) { /* empty */ }
    if (i > 0 && parent) {
      bcr = padClientRect_(getBoundingClientRect_(parent))
      prect = cropRectToVisible_(bcr.l, bcr.t, bcr.r, bcr.b)
    }
    return prect && isContaining_(crect!, prect)
        ? prect : crect;
} as {
    (el: Element, crect: Rect): Rect;
    (el: Element, crect: Rect | null): Rect | null;
}

export const findMainSummary_ = ((details: HTMLDetailsElement | Element | null): SafeHTMLElement | null => {
    if (!(Build.BTypes & BrowserType.Edge)) { // https://developer.mozilla.org/en-US/docs/Web/CSS/:scope
      details = querySelector_unsafe_(':scope>summary', details as HTMLDetailsElement)
      return details && htmlTag_(details) ? details as SafeHTMLElement : null
    }
    // Specification: https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element
    // `HTMLDetailsElement::FindMainSummary()` in
    // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_details_element.cc?g=0&l=101
    for (let summaries = details!.children, i = 0, len = summaries.length; i < len; i++) {
      const summary = summaries[i];
      // there's no window.HTMLSummaryElement on C70
      if (htmlTag_(summary) === "summary") {
        return summary as SafeHTMLElement;
      }
    }
    return null;
}) as (details: HTMLDetailsElement) => SafeHTMLElement | null

let paintBox_: [number, number] | null = null // it may need to use `paintBox[] / <body>.zoom`
let wdZoom_ = 1 // <html>.zoom * min(devicePixelRatio, 1) := related to physical pixels
let docZoom_ = 1 // zoom of <html>
let isDocZoomStrange_: BOOL = 0
let dScale_ = 1 // <html>.transform:scale (ignore the case of sx != sy)
let bScale_ = 1 // <body>.transform:scale (ignore the case of sx != sy)
  /** zoom of <body> (if not fullscreen else 1) */
let bZoom_ = 1

export { paintBox_, wdZoom_, docZoom_, isDocZoomStrange_, dScale_, bScale_, bZoom_ }
export function set_bZoom_ (_newBZoom: number): void { bZoom_ = _newBZoom }

const _fixDocZoom_cr = Build.BTypes & BrowserType.Chrome ? (zoom: number, docEl: Element, devRatio: number): number => {
    let ver = Build.MinCVer < BrowserVer.MinASameZoomOfDocElAsdevPixRatioWorksAgain
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther & BrowserType.Chrome) ? chromeVer_ as BrowserVer : 0,
    rectWidth: number, viewportWidth: number,
    style: CSSStyleDeclaration | false | undefined;
    if (BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl !== BrowserVer.MinEnsured$visualViewport$) {
      console.log("Assert error: MinDevicePixelRatioImplyZoomOfDocEl should be equal with MinEnsured$visualViewport$");
    }
    isDocZoomStrange_ = 0;
    return Build.BTypes & ~BrowserType.Chrome && VOther & ~BrowserType.Chrome
        || zoom === 1
        || Build.MinCVer < BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl
            && ver < BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl
        || (rectWidth = getBoundingClientRect_(docEl).width,
            viewportWidth = visualViewport!.width!,
            Math.abs(rectWidth - viewportWidth) > 1e-3
            && (Math.abs(rectWidth * zoom - viewportWidth) < 0.01
              || (Build.MinCVer >= BrowserVer.MinASameZoomOfDocElAsdevPixRatioWorksAgain
                    || ver > BrowserVer.MinASameZoomOfDocElAsdevPixRatioWorksAgain - 1)
                  && (style = !notSafe_not_ff_!(docEl) && (
                    docEl as TypeToAssert<Element, HTMLElement | SVGElement, "style">).style)
                  && style.zoom && style.zoom
              || (isDocZoomStrange_ = 1, zoom !== _getPageZoom_cr!(zoom, devRatio, docEl))))
        ? zoom : 1;
} : 0 as never as null

let _getPageZoom_cr = Build.BTypes & BrowserType.Chrome ? function (devRatio: number
      , docElZoom: number, _testEl: Element | null): number {
    // only detect once, so that its cost is not too big
    let iframe: HTMLIFrameElement = createElement_("iframe"),
    pageZoom: number | null | undefined, doc: Document | null;
    try {
      /** `_testEl` must not start with /[\w.]*doc/: {@link ../Gulpfile.js#beforeUglify} */
      iframe.appendChild.call(_testEl, iframe)
      _testEl = (doc = iframe.contentDocument) && doc.documentElement
      pageZoom = _testEl && +getComputedStyle_(_testEl).zoom
    } catch {}
    iframe.remove();
    _getPageZoom_cr = (zoom2, ratio2) => pageZoom ? ratio2 / devRatio * pageZoom : zoom2;
    return pageZoom || docElZoom;
} as (devRatio: number, docElZoom: number, docEl: Element) => number : 0 as never as null

  /**
   * also update docZoom_
   * update bZoom_ if target
   */
export const getZoom_ = Build.BTypes & ~BrowserType.Firefox ? function (target?: 1 | Element): void {
    let docEl = docEl_unsafe_()!, ratio = devRatio_()
      , gcs = getComputedStyle_, st = gcs(docEl), zoom = +st.zoom || 1
      , el: Element | null = fullscreenEl_unsafe_();
    Build.BTypes & BrowserType.Chrome && (zoom = _fixDocZoom_cr!(zoom, docEl, ratio));
    if (target) {
      const body = el ? null : doc.body;
      // if fullscreen and there's nested "contain" styles,
      // then it's a whole mess and nothing can be ensured to be right
      bZoom_ = body && (target === 1 || IsInDOM_(target, body)) && +gcs(body).zoom || 1;
    }
    for (; el && el !== docEl;
        el = GetParent_unsafe_(el, Build.MinCVer < BrowserVer.MinSlotIsNotDisplayContents
              && Build.BTypes & BrowserType.Chrome && chromeVer_ < BrowserVer.MinSlotIsNotDisplayContents
            ? PNType.RevealSlotAndGotoParent : PNType.RevealSlot)) {
      zoom *= +gcs(el).zoom || 1;
    }
    paintBox_ = null; // it's not so necessary to get a new paintBox here
    docZoom_ = zoom;
    wdZoom_ = Math.round(zoom * (ratio < 1 ? ratio : 1) * 1000) / 1000
} : function (): void {
    paintBox_ = null;
    docZoom_ = bZoom_ = 1;
    /** the min() is required in {@link ../front/vomnibar.ts#Vomnibar_.activateO_ } */
    wdZoom_ = Math.min(devRatio_(), 1);
} as never

export const getViewBox_ = function (needBox?: 1 | 2): ViewBox | ViewOffset {
    const ratio = devRatio_(), M = Math, round = M.round
    let iw = getInnerWidth(), ih = getInnerHeight(), ratio2 = ratio < 1 ? ratio : 1
    if (fullscreenEl_unsafe_()) {
      getZoom_(1);
      dScale_ = bScale_ = 1;
      ratio2 = wdZoom_ / ratio2;
      return [0, 0, (iw / ratio2) | 0, (ih / ratio2) | 0, 0];
    }
    const float = parseFloat,
    box = docEl_unsafe_()!, st = getComputedStyle_(box),
    box2 = doc.body, st2 = box2 ? getComputedStyle_(box2) : st,
    zoom2 = bZoom_ = Build.BTypes & ~BrowserType.Firefox && box2 && +st2.zoom || 1,
    containHasPaint = (<RegExpOne> /content|paint|strict/).test(st.contain!),
    kM = "matrix(1,",
    stacking = !(Build.BTypes & BrowserType.Chrome && needBox === 2)
        && (st.position !== "static" || containHasPaint || st.transform !== NONE),
    // NOTE: if box.zoom > 1, although doc.documentElement.scrollHeight is integer,
    //   its real rect may has a float width, such as 471.333 / 472
    rect = padClientRect_(getBoundingClientRect_(box))
    let zoom = Build.BTypes & ~BrowserType.Firefox && +st.zoom || 1,
    // ignore the case that x != y in "transform: scale(x, y)""
    _trans = st.transform, scale = dScale_ = _trans && !_trans.startsWith(kM) && float(_trans.slice(7)) || 1
    bScale_ = box2 && (_trans = st2.transform) && !_trans.startsWith(kM) && float(_trans.slice(7)) || 1
    Build.BTypes & BrowserType.Chrome && (zoom = _fixDocZoom_cr!(zoom, box, ratio));
    wdZoom_ = round(zoom * ratio2 * 1000) / 1000
    docZoom_ = Build.BTypes & ~BrowserType.Firefox ? zoom : 1;
    let x = !stacking ? float(st.marginLeft)
          : !(Build.BTypes & ~BrowserType.Firefox)
            || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
          ? -float(st.borderLeftWidth) : 0 | -box.clientLeft
      , y = !stacking ? float(st.marginTop)
          : !(Build.BTypes & ~BrowserType.Firefox)
            || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
          ? -float(st.borderTopWidth ) : 0 | -box.clientTop
      , ltScale = Build.BTypes & BrowserType.Chrome ? needBox === 2 ? 1 : scale : 1;
    x = x * (Build.BTypes & BrowserType.Chrome ? ltScale : scale) - rect.l
    y = y * (Build.BTypes & BrowserType.Chrome ? ltScale : scale) - rect.t
    // note: `Math.abs(y) < 0.01` supports almost all `0.01 * N` (except .01, .26, .51, .76)
    x = x * x < 1e-4 ? 0 : M.ceil(round(x / zoom2 * 100) / 100)
    y = y * y < 1e-4 ? 0 : M.ceil(round(y / zoom2 * 100) / 100)
    if (Build.BTypes & ~BrowserType.Firefox) {
      iw /= zoom, ih /= zoom;
    }
    let mw = iw, mh = ih;
    if (containHasPaint) { // ignore the area on the block's left
      iw = rect.r, ih = rect.b
    }
    paintBox_ = containHasPaint ? [iw - float(st.borderRightWidth ) * scale,
                                       ih - float(st.borderBottomWidth) * scale] : null;
    if (!needBox) { return [x, y]; }
    // here rect.right is not accurate because <html> may be smaller than <body>
    const sEl = scrollingEl_(),
    xScrollable = st.overflowX !== HDN && st2.overflowX !== HDN,
    yScrollable = st.overflowY !== HDN && st2.overflowY !== HDN;
    if (xScrollable) {
      mw += 64 * zoom2;
      iw = containHasPaint ? iw : sEl ? (sEl.scrollWidth - scrollX) / zoom
          : M.max((iw - GlobalConsts.MaxScrollbarWidth) / zoom, rect.r)
    }
    if (yScrollable) {
      mh += 20 * zoom2;
      ih = containHasPaint ? ih : sEl ? (sEl.scrollHeight - scrollY) / zoom
          : M.max((ih - GlobalConsts.MaxScrollbarWidth) / zoom, rect.b)
    }
    iw = iw < mw ? iw : mw, ih = ih < mh ? ih : mh
    iw = (iw / zoom2) | 0, ih = (ih / zoom2) | 0;
    return [x, y, iw, yScrollable ? ih - GlobalConsts.MaxHeightOfLinkHintMarker : ih, xScrollable ? iw : 0];
} as {
    (needBox: 1 | 2): ViewBox;
    (): ViewOffset;
}

export const isNotInViewport = function (this: void, element: Element | null, rect?: Rect): VisibilityType {
    if (!rect) {
      rect = padClientRect_(getBoundingClientRect_(element!))
    }
    return rect.b - rect.t < 1 || rect.r - rect.l < 1 ? VisibilityType.NoSpace
      : rect.b <= 0 || rect.t >= getInnerHeight() || rect.r <= 0 || rect.l >= getInnerWidth()
        ? VisibilityType.OutOfView : VisibilityType.Visible;
} as {
    (element: Element): VisibilityType;
    (element: null, rect: Rect): VisibilityType
}

export const IsInDOM_ = function (this: void, element: Element, root?: Element | Document | Window | RadioNodeList
      , checkMouseEnter?: 1): boolean {
    if (!root) {
      const isConnected = element.isConnected; /** {@link #BrowserVer.Min$Node$$isConnected} */
      if (!(Build.BTypes & ~BrowserType.Firefox) || isConnected === !!isConnected) {
        return isConnected!; // is boolean : exists and is not overridden
      }
    }
    let f: Node["getRootNode"]
      , NProto = Node.prototype, pe: Element | null;
    root = <Element | Document> root || (!(Build.BTypes & ~BrowserType.Firefox) ? element.ownerDocument as Document
        : (root = element.ownerDocument, Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter &&
            Build.BTypes & BrowserType.Chrome &&
            unsafeFramesetTag_old_cr_ && (root as WindowWithTop).top === top ||
            (root as Document | RadioNodeList).nodeType !== kNode.DOCUMENT_NODE
        ? doc : root as Document));
    if (root.nodeType === kNode.DOCUMENT_NODE
        && (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || !(Build.BTypes & ~BrowserType.Firefox) || (f = NProto.getRootNode))) {
      return !(Build.BTypes & ~BrowserType.Firefox)
        ? element.getRootNode!({composed: true}) === root
        : (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
            ? NProto.getRootNode : f)!.call(element, {composed: true}) === root;
    }
    if (Build.BTypes & ~BrowserType.Firefox ? NProto.contains.call(root, element) : root.contains(element)) {
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
    return s === null || (!!s && s.toLowerCase() !== "true");
}

export const uneditableInputs_: SafeEnum = { __proto__: null as never,
    bu: 1, ch: 1, co: 1, fi: 1, hi: 1, im: 1, ra: 1, re: 1, su: 1
}

export const editableTypes_: ReadonlySafeDict<EditableType> = { __proto__: null as never,
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
    <Ty extends 2>(element: EventTarget): element is LockableElement;
    (element: Element): element is LockableElement; // this line is just to avoid a warning on VS Code
}

export const isInputInTextMode_cr_old = Build.MinCVer >= BrowserVer.Min$selectionStart$MayBeNull
      || !(Build.BTypes & BrowserType.Chrome) ? 0 as never : (el: TextElement): boolean | void => {
    try {
      return el.selectionEnd != null;
    } catch {}
}

export const isSelected_ = (): boolean => {
    const element = activeEl_unsafe_()!, sel = getSelection_(), node = sel.anchorNode;
    return !node ? false
      : (element as TypeToAssert<Element, HTMLElement, "isContentEditable">).isContentEditable === true
      ? (Build.BTypes & ~BrowserType.Firefox ? doc.contains.call(element, node) : element.contains(node))
      : element === node || !!(node as NodeToElement).tagName
        && element === (Build.BTypes & ~BrowserType.Firefox ? GetChildNodes_not_ff!(node as Element)
            : node.childNodes as NodeList)[sel.anchorOffset]
}

export const getSelectionFocusEdge_ = (sel: Selection, knownDi: VisualModeNS.ForwardDir): SafeElement | null => {
    if (!sel.rangeCount) { return null; }
    let el = sel.focusNode!, nt: Node["nodeType"], o: Node | null
    if ((el as NodeToElement).tagName) {
      el = (Build.BTypes & ~BrowserType.Firefox ? GetChildNodes_not_ff!(el as Element)[sel.focusOffset]
            : (el.childNodes as NodeList)[sel.focusOffset]) || el
    }
    for (o = el; !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
          ? o && <number> o.nodeType - kNode.ELEMENT_NODE
          : o && (nt = o.nodeType, typeof nt !== "number" || nt - kNode.ELEMENT_NODE);
        o = knownDi ? o!.previousSibling : o!.nextSibling) { /* empty */ }
    if (!(Build.BTypes & ~BrowserType.Firefox)) {
      return (/* Element | null */ o || (/* el is not Element */ el && el.parentElement)) as SafeElement | null;
    }
    return SafeEl_not_ff_!(<Element | null> o
        || (/* el is not Element */ el && el.parentElement as Element | null)
      , PNType.DirectElement);
}

export const getSelectionBoundingBox_ = (sel: Selection): ClientRect => sel.getRangeAt(0).getBoundingClientRect()

  /** action section */

  /** Note: won't call functions if Vimium C is destroyed */
let OnDocLoaded_: (callback: (this: void) => any, onloaded?: 1) => void

export { OnDocLoaded_ }
export function set_OnDocLoaded_ (_newOnDocLoaded: typeof OnDocLoaded_): void { OnDocLoaded_ = _newOnDocLoaded }

export let createElement_ = doc.createElement.bind(doc) as {
    <K extends VimiumContainerElementType> (this: void, tagName: K): HTMLElementTagNameMap[K] & SafeHTMLElement;
}
export function set_createElement_ (_newCreateEl: typeof createElement_): void { createElement_ = _newCreateEl }

export const createShadowRoot_ = <T extends HTMLDivElement | HTMLBodyElement> (box: T): ShadowRoot | T => {
    return !(Build.BTypes & ~BrowserType.Edge) ? box
      : (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
        && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || box.attachShadow
      ? box.attachShadow!({mode: "closed"})
      : Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            || box.createShadowRoot)
      ? box.createShadowRoot!()
      : Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
            || box.webkitCreateShadowRoot)
      ? box.webkitCreateShadowRoot!() : box;
}

export const scrollIntoView_ = (el: Element, dir?: boolean): void => {
    !(Build.BTypes & ~BrowserType.Firefox) ? el.scrollIntoView({ block: "nearest" })
      : elementProto().scrollIntoView.call(el,
          Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && Build.BTypes & BrowserType.Chrome &&
          dir != null ? dir : { block: "nearest" });
}

export const view_ = (el: Element, oldY?: number): boolean => {
    const rect = padClientRect_(getBoundingClientRect_(el)),
    ty = isNotInViewport(null, rect);
    if (ty === VisibilityType.OutOfView) {
      const ih = getInnerHeight(), delta = rect.t < 0 ? -1 : rect.t > ih ? 1 : 0, f = oldY != null
      Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && Build.BTypes & BrowserType.Chrome
      ? scrollIntoView_(el, delta < 0) : scrollIntoView_(el);
      (delta || f) && scrollWndBy_(0, f ? oldY! - scrollY : delta * ih / 5);
    }
    return ty === VisibilityType.Visible;
}

export const scrollWndBy_ = (left: number, top: number): void => {
    !(Build.BTypes & ~BrowserType.Firefox) ||
    !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
    elementProto().scrollBy ? scrollBy({behavior: "instant", left, top}) : scrollBy(left, top);
}

export const runJS_ = (code: string, returnEl?: HTMLScriptElement | 0): void | HTMLScriptElement => {
    const script = returnEl || createElement_("script");
    script.type = "text/javascript";
    !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
      ? script.append!(code) : script.textContent = code
    if (Build.BTypes & ~BrowserType.Firefox) {
      if (returnEl) { return; }
      /** `appendChild` must be followed by /[\w.]*doc/: {@link ../Gulpfile.js#beforeUglify} */
      script.appendChild.call(docEl_unsafe_() || doc, script);
    } else {
      (docEl_unsafe_() || doc).appendChild(script);
    }
    if (Build.BTypes & BrowserType.Firefox) {
      return returnEl === 0 ? script : script.remove();
    }
    script.remove();
}

  /** rect section */

export const center_ = (rect: Rect | null): Point2D => {
    let zoom = Build.BTypes & ~BrowserType.Firefox ? docZoom_ * bZoom_ / 2 : 0.5;
    rect = rect && cropRectToVisible_(rect.l, rect.t, rect.r, rect.b) || rect;
    return rect ? [((rect.l + rect.r) * zoom) | 0, ((rect.t + rect.b) * zoom) | 0] : [0, 0];
}

/** still return `true` if `paddings <= 4px` */
export const isContaining_ = (a: Rect, b: Rect): boolean => {
    return b.b - 5 < a.b && b.r - 5 < a.r && b.t > a.t - 5 && b.l > a.l - 5;
}

export const padClientRect_ = function (rect: ClientRect, padding?: number): WritableRect {
    const x = rect.left, y = rect.top, max = Math.max;
    padding = x || y ? padding || 0 : 0
    return {l: x | 0, t: y | 0, r: (x + max(rect.width, padding)) | 0, b: (y + max(rect.height, padding)) | 0};
} as {
  (rect: ClientRect, padding: number): WritableRect
  (rect: ClientRect): Rect
}

export const getZoomedAndCroppedRect_ = (element: HTMLImageElement | HTMLInputElement
      , st: CSSStyleDeclaration | null, crop: boolean): Rect | null => {
    let zoom = Build.BTypes & ~BrowserType.Firefox && +(st || getComputedStyle_(element)).zoom || 1,
    cr_not_ff = Build.BTypes & ~BrowserType.Firefox ? padClientRect_(getBoundingClientRect_(element))
        : 0 as never as null,
    arr: Rect | null = Build.BTypes & ~BrowserType.Firefox
        ? cropRectToVisible_(cr_not_ff!.l * zoom, cr_not_ff!.t * zoom, cr_not_ff!.r * zoom, cr_not_ff!.b * zoom)
        : getVisibleClientRect_(element);
    if (crop) {
      arr = getCroppedRect_(element, arr);
    }
    return arr;
}

export const setBoundary_ = (style: CSSStyleDeclaration, r: WritableRect, allow_abs?: boolean): boolean | undefined => {
    const need_abs = allow_abs && (r.t < 0 || r.l < 0 || r.b > getInnerHeight() || r.r > getInnerWidth()),
    P = "px", arr: ViewOffset | false | undefined = need_abs && getViewBox_();
    if (arr) {
      r.l += arr[0], r.r += arr[0], r.t += arr[1], r.b += arr[1];
    }
    style.left = r.l + P, style.top = r.t + P;
    style.width = (r.r - r.l) + P, style.height = (r.b - r.t) + P;
    return need_abs;
}

export let cropRectToVisible_: (left: number, top: number, right: number, bottom: number) => Rect | null = null as never

export const SubtractSequence_ = function (this: {l: Rect[]; t: Rect}, rect1: Rect): void { // rect1 - rect2
    let rect2 = this.t, a = this.l, x1: number, x2: number
      , y1 = rect1.t > rect2.t ? rect1.t : rect2.t, y2 = rect1.b < rect2.b ? rect1.b : rect2.b
    if (y1 >= y2 || ((x1 = rect1.l > rect2.l ? rect1.l : rect2.l) >= (x2 = rect1.r < rect2.r ? rect1.r : rect2.r))) {
      a.push(rect1);
      return;
    }
    // 1 2 3
    // 4   5
    // 6 7 8
    const x0 = rect1.l, x3 = rect1.r, y0 = rect1.t, y3 = rect1.b;
    x0 < x1 && a.push({l: x0, t: y0, r: x1, b: y3}); // (1)4(6)
    y0 < y1 && a.push({l: x1, t: y0, r: x3, b: y1}); // 2(3)
    y2 < y3 && a.push({l: x1, t: y2, r: x3, b: y3}); // 7(8)
    x2 < x3 && a.push({l: x2, t: y1, r: x3, b: y2}); // 5
}
