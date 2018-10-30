/// <reference path="../content/base.d.ts" />
type FrontendRootElementType = "div" | "span" | "style" | "iframe" | "a" | "script";
var VDom = {
  UI: null as never as DomUI,
  // note: scripts always means allowing timers - vPort.ClearPort requires this assumption
  Scripts: true,
  allowRAF_: true,
  isHTML_ (this: void): boolean { return document.documentElement instanceof HTMLElement; },
  isStandard_: true,
  createElement_<K extends FrontendRootElementType> (tagName: K): HTMLElementTagNameMap[K] {
    const d = document, a = this,
    node = document.createElement(tagName), valid = node instanceof HTMLElement;
    a.isStandard_ = valid;
    a.createElement_ = valid ? d.createElement.bind(d)
      : d.createElementNS.bind<Document, "http://www.w3.org/1999/xhtml", FrontendRootElementType
        , HTMLElement>(d, "http://www.w3.org/1999/xhtml");
    return valid ? node : a.createElement_(tagName);
  },
  /** Note: won't call functions if Vimium is destroyed */
  DocReady (callback: (this: void) => void): void {
    const f = function(callback: (this: void) => void): void { return callback(); };
    if (document.readyState !== "loading") {
      this.DocReady = f;
      return callback();
    }
    const listeners = [callback];
    function eventHandler(): void {
      // not need to check event.isTrusted
      removeEventListener("DOMContentLoaded", eventHandler, true);
      if (VDom) {
        VDom.DocReady = f;
        for (const i of listeners) { i(); }
      }
      listeners.length = 0; // in case VDom.DocReady is kept by other extensions
    }
    this.DocReady = function(callback): void {
      listeners.push(callback);
    };
    addEventListener("DOMContentLoaded", eventHandler, true);
  },
  parentFrame_(): Element | null {
    try {
      return window.frameElement;
    } catch (e) {
      return null;
    }
  },
  /**
   * Try its best to find a real parent
   * @safe_even_if_any_overridden_property
   * @UNSAFE_RETURNED
   */
  GetParent_: function (this: void, el: Node, getInsertion?: false | Element["getDestinationInsertionPoints"]): Node | null {
    if (getInsertion) {
      const arr = getInsertion.call(el as Element);
      arr.length > 0 && (el = arr[arr.length - 1]);
    }
    let pe = el.parentElement, pn = el.parentNode;
    if (pe === pn /* normal pe or no parent */ || !pn /* indeed no par */) { return pn && pe; }
    // par exists but not in normal tree
    if (!pn.contains(el)) { // pn is overridden
      let desp: PropertyDescriptor | undefined;
      pn = pe && pe.contains(el) ? pe
        : (desp = Object.getOwnPropertyDescriptor(Node.prototype, 'parentNode')) && desp.get ? desp.get.call(el)
        : null;
    }
    const SR = window.ShadowRoot, E = Element;
    // pn is real or null
    return getInsertion /* composedElement */ === false ? pn
        // not take composed tree into consideration; but allow Node to be returned
      : SR && !(SR instanceof E) && pn instanceof SR ? pn.host // shadow root
      : pn instanceof E ? pn /* in doc but overridden */ : null /* pn is null, DocFrag, or ... */;
  } as {
    (this: void, el: Element, getInsertion: Element["getDestinationInsertionPoints"]): Element | null;
    (this: void, el: Node, composedElement: false): Node | null;
    (this: void, el: Node): Element | null;
  },
  scrollingEl_ (): Element | null {
    const d = document;
    return d.scrollingElement || (d.compatMode === "BackCompat" ? this.SafeEl_(d.body) : d.documentElement);
  },
  /**
   * other parts of code require that prepareCrop only depends on @dbZoom
   */
  prepareCrop_ (): number {
    let iw: number, ih: number, ihs: number;
    this.prepareCrop_ = (function(this: typeof VDom): number {
      let fz = this.dbZoom_, el = this.scrollingEl_(), i: number, j: number, b = this.paintBox_;
      if (el) {
        i = el.clientWidth, j = el.clientHeight;
      } else {
        i = innerWidth, j = innerHeight;
        const doc = document.documentElement as Element | null, dz = fz / this.bZoom_;
        if (!doc) { return ih = j, ihs = j - 8, iw = i; }
        // not reliable
        i = Math.min(Math.max(i - PixelConsts.MaxScrollbarWidth, (doc.clientWidth * dz) | 0), i);
        j = Math.min(Math.max(j - PixelConsts.MaxScrollbarWidth, (doc.clientHeight * dz) | 0), j);
      }
      if (b) {
        const dz = fz / this.bZoom_;
        i = Math.min(i, b[0] * dz); j = Math.min(j, b[1] * dz);
      }
      iw = (i / fz) | 0, ih = (j / fz) | 0;
      ihs = ((j - 8) / fz) | 0;
      return iw;
    });
    this.cropRectToVisible_ = (function(left, top, right, bottom): VRect | null {
      if (top > ihs || bottom < 3) {
        return null;
      }
      const cr: VRect = [ //
        left   >  0 ? (left   | 0) :  0, //
        top    >  0 ? (top    | 0) :  0, //
        right  < iw ? (right  | 0) : iw, //
        bottom < ih ? (bottom | 0) : ih  //
      ];
      return cr[2] - cr[0] >= 3 && cr[3] - cr[1] >= 3 ? cr : null;
    });
    return this.prepareCrop_();
  },
  getVisibleClientRect_ (element: Element, el_style?: CSSStyleDeclaration): VRect | null {
    const arr = Element.prototype.getClientRects.call(element);
    let cr: VRect | null, style: CSSStyleDeclaration | null, _ref: HTMLCollection | undefined
      , isVisible: boolean | undefined, notInline: boolean | undefined, str: string;
    for (let _i = 0, _len = arr.length; _i < _len; _i++) {
      const rect = arr[_i];
      if (rect.height > 0 && rect.width > 0) {
        if (cr = this.cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)) {
          if (isVisible == null) {
            el_style || (el_style = getComputedStyle(element));
            isVisible = el_style.visibility === 'visible';
          }
          if (isVisible) { return cr; }
        }
        continue;
      }
      if (_ref || (_ref = element.children) instanceof Element) { continue; }
      for (let _j = 0, _len1 = _ref.length, gCS = getComputedStyle; _j < _len1; _j++) {
        style = gCS(_ref[_j]);
        if (style.float !== 'none' ||
            ((str = style.position) !== 'static' && str !== 'relative')) {}
        else if (rect.height === 0) {
          if (notInline == null) {
            el_style || (el_style = gCS(element));
            notInline = (el_style.fontSize !== "0px" && el_style.lineHeight !== "0px") || !el_style.display.startsWith("inline");
          }
          if (notInline || !style.display.startsWith("inline")) { continue; }
        } else { continue; }
        if (cr = this.getVisibleClientRect_(_ref[_j], style)) { return cr; }
      }
      style = null;
    }
    return null;
  },
  getClientRectsForAreas_: function (this: {}, element: HTMLElementUsingMap, output: Hint5[]
      , areas?: HTMLCollectionOf<HTMLAreaElement> | HTMLAreaElement[]): VRect | null | void {
    let diff: number, x1: number, x2: number, y1: number, y2: number, rect: VRect | null | undefined;
    const cr = element.getClientRects()[0] as ClientRect | undefined;
    if (!cr || cr.height < 3 || cr.width < 3) { return; }
    // replace is necessary: chrome allows "&quot;", and also allows no "#"
    let ret = false;
    if (areas) {
      ret = true;
    } else {
      const map = document.querySelector('map[name="' +
        element.useMap.replace(<RegExpOne>/^#/, "").replace(<RegExpG>/"/g, '\\"') + '"]');
      if (!map || !(map instanceof HTMLMapElement)) { return; }
      areas = map.getElementsByTagName("area");
    }
    const toInt = (a: string) => (a as string | number as number) | 0;
    for (let _i = 0, _len = areas.length; _i < _len; _i++) {
      const area = areas[_i], coords = area.coords.split(",").map(toInt);
      switch (area.shape.toLowerCase()) {
      case "circle": case "circ": // note: "circ" is non-conforming
        x2 = coords[0]; y2 = coords[1]; diff = coords[2] / Math.sqrt(2);
        x1 = x2 - diff; x2 += diff; y1 = y2 - diff; y2 += diff;
        diff = 3;
        break;
      case "default":
        x1 = 0; y1 = 0; x2 = cr.width; y2 = cr.height;
        diff = 0;
        break;
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
      rect = (this as typeof VDom).cropRectToVisible_(x1 + cr.left, y1 + cr.top, x2 + cr.left, y2 + cr.top);
      if (rect) {
        output.push([area, rect, 0, [rect, 0], element]);
      }
    }
    if (ret) {
      return output.length > 0 ? output[0][1] : null;
    }
  } as {
    (element: HTMLElementUsingMap, output: Hint5[], areas: HTMLCollectionOf<HTMLAreaElement> | HTMLAreaElement[]): VRect | null;
    (element: HTMLElementUsingMap, output: Hint5[]): void;
  },
  paintBox_: null as [number, number] | null, // it may need to use `paintBox[] / <body>.zoom`
  specialZoom_: false,
  wdZoom_: 1, // <html>.zoom * min(devicePixelRatio, 1) := related to physical pixels
  dbZoom_: 1, // absolute zoom value of <html> * <body>
  dScale_: 1, // <html>.transform:scale (ignore the case of sx != sy)
  /** zoom of <body> (if not fullscreen else 1) */
  bZoom_: 1,
  /**
   * return: VDom.wdZoom_ := min(devRatio, 1) * docEl.zoom
   * 
   * also update VDom.dbZoom_
   * update VDom.bZoom_ if target
   */
  getZoom_ (target?: 1 | Element): number {
    let docEl = document.documentElement as Element, ratio = window.devicePixelRatio
      , gcs = getComputedStyle, st = gcs(docEl), zoom = +st.zoom || 1
      , el: Element | null = document.webkitFullscreenElement;
    Math.abs(zoom - ratio) < 1e-5 && this.specialZoom_ && (zoom = 1);
    if (target) {
      const body = el ? null : document.body;
      // if fullscreen and there's nested "contain" styles,
      // then it's a whole mess and nothing can be ensured to be right
      this.bZoom_ = body && (target === 1 || this.isInDOM_(target, body)) && +gcs(body).zoom || 1;
    }
    // todo: check whether zoom follows insertion
    for (; el && el !== docEl; el = this.GetParent_(el)) {
      zoom *= +gcs(el).zoom || 1;
    };
    this.paintBox_ = null; // it's not so necessary to get a new paintBox here
    this.dbZoom_ = this.bZoom_ * zoom;
    return this.wdZoom_ = Math.round(zoom * Math.min(ratio, 1) * 1000) / 1000;
  },
  getViewBox_ (needBox?: 1): ViewBox | ViewOffset {
    let iw = innerWidth, ih = innerHeight;
    const ratio = window.devicePixelRatio, ratio2 = Math.min(ratio, 1), doc = document;
    if (doc.webkitIsFullScreen) {
      this.getZoom_(1);
      this.dScale_ = 1;
      const zoom = this.wdZoom_ / ratio2;
      return [0, 0, (iw / zoom) | 0, (ih / zoom) | 0, 0];
    }
    const gcs = getComputedStyle, float = parseFloat,
    box = doc.documentElement as HTMLElement, st = gcs(box),
    box2 = doc.body, st2 = box2 ? gcs(box2) : st,
    zoom2 = this.bZoom_ = box2 && +st2.zoom || 1,
    containHasPaint = (<RegExpOne>/content|paint|strict/).test(st.contain as string),
    stacking = st.position !== "static" || containHasPaint || st.transform !== "none",
    // ignore the case that x != y in "transform: scale(x, y)""
    _tf = st.transform, scale = this.dScale_ = _tf && !_tf.startsWith("matrix(1,") && float(_tf.slice(7)) || 1,
    // NOTE: if box.zoom > 1, although document.documentElement.scrollHeight is integer,
    //   its real rect may has a float width, such as 471.333 / 472
    rect = box.getBoundingClientRect();
    let zoom = +st.zoom || 1;
    Math.abs(zoom - ratio) < 1e-5 && this.specialZoom_ && (zoom = 1);
    this.wdZoom_ = Math.round(zoom * ratio2 * 1000) / 1000;
    this.dbZoom_ = zoom * zoom2;
    let x = stacking ? -box.clientLeft : float(st.marginLeft)
      , y = stacking ? -box.clientTop  : float(st.marginTop );
    x = x * scale - rect.left, y = y * scale - rect.top;
    // note: `Math.abs(y) < 0.01` supports almost all `0.01 * N` (except .01, .26, .51, .76)
    x = Math.abs(x) < 0.01 ? 0 : Math.ceil(Math.round(x / zoom2 * 100) / 100);
    y = Math.abs(y) < 0.01 ? 0 : Math.ceil(Math.round(y / zoom2 * 100) / 100);
    iw /= zoom, ih /= zoom;
    let mw = iw, mh = ih;
    if (containHasPaint) { // ignore the area on the block's left
      iw = rect.right, ih = rect.bottom;
    }
    this.paintBox_ = containHasPaint ? [iw - float(st.borderRightWidth ) * scale,
                                       ih - float(st.borderBottomWidth) * scale] : null;
    if (!needBox) { return [x, y]; }
    // here rect.right is not exact because <html> may be smaller than <body>
    const sEl = this.scrollingEl_(),
    xScrollable = st.overflowX !== "hidden" && st2.overflowX !== "hidden",
    yScrollable = st.overflowY !== "hidden" && st2.overflowY !== "hidden";
    if (xScrollable) {
      mw += 64 * zoom2;
      if (!containHasPaint) {
        iw = sEl ? (sEl.scrollWidth - window.scrollX) / zoom : Math.max((iw - PixelConsts.MaxScrollbarWidth) / zoom, rect.right);
      }
    }
    if (yScrollable) {
      mh += 20 * zoom2;
      if (!containHasPaint) {
        ih = sEl ? (sEl.scrollHeight - window.scrollY) / zoom : Math.max((ih - PixelConsts.MaxScrollbarWidth) / zoom, rect.bottom);
      }
    }
    iw = Math.min(iw, mw), ih = Math.min(ih, mh);
    iw = (iw / zoom2) | 0, ih = (ih / zoom2) | 0;
    return [x, y, iw, yScrollable ? ih - PixelConsts.MaxHeightOfLinkHintMarker : ih, xScrollable ? iw : 0];
  },
  view (el: Element, oldY?: number): boolean {
    const P = Element.prototype, rect = P.getBoundingClientRect.call(el), ty = this.NotVisible_(null, rect);
    if (ty === VisibilityType.OutOfView) {
      const t = rect.top, ih = innerHeight, delta = t < 0 ? -1 : t > ih ? 1 : 0, f = oldY != null;
      P.scrollIntoView.call(el, delta < 0);
      (delta || f) && this.scrollWndBy_(0, f ? (oldY as number) - window.scrollY : delta * ih / 5);
    }
    return ty === VisibilityType.Visible;
  },
  scrollWndBy_ (left: number, top: number): void {
    HTMLElement.prototype.scrollBy ? scrollBy({behavior: "instant", left, top}) : scrollBy(left, top);
  },
  NotVisible_: function (this: void, element: Element | null, rect?: ClientRect): VisibilityType {
    if (!rect) { rect = Element.prototype.getBoundingClientRect.call(element as Element); }
    return rect.height < 0.5 || rect.width < 0.5 ? VisibilityType.NoSpace
      : rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth
        ? VisibilityType.OutOfView : VisibilityType.Visible;
  } as {
    (element: Element): VisibilityType;
    (element: null, rect: ClientRect): VisibilityType;
  },
  isInDOM_ (element: Element, root?: HTMLBodyElement | HTMLFrameSetElement | SVGElement): boolean {
    // if an element is in another frame, it's ignored that element may have named property getters
    let doc: Element | Document = root || element.ownerDocument, f: Node["getRootNode"]
      , NP = Node.prototype, pe: Element | null;
    root || doc.nodeType !== Node.DOCUMENT_NODE && (doc = document);
    if (!root && (f = NP.getRootNode)) {
      return f.call(element, {composed: true}) === doc;
    }
    if (NP.contains.call(doc, element)) { return true; }
    while ((pe = VDom.GetParent_(element)) && pe !== doc) { element = pe; }
    const pn = VDom.GetParent_(element, false);
    // Note: `pn instanceof Element` means `element.parentNode` is overridden,
    // so return a "potentially correct" result `true`.
    // This requires that further jobs are safe enough even when isInDOM returns true
    return pn === doc || pn instanceof Element;
  },
  notSafe_ (el: Node | null): el is HTMLFormElement | HTMLFrameSetElement {
    return el instanceof HTMLFormElement || el instanceof HTMLFrameSetElement;
  },
  /** @safe_even_if_any_overridden_property */
  SafeEl_: function (this: void, el: Node | null): Node | null {
    return VDom.notSafe_(el) ? VDom.GetParent_(el) : el
  } as {
    (this: void, el: Element | null): Element | null;
    (this: void, el: Node | null): Node | null;
  },
  uneditableInputs_: <SafeEnum> { __proto__: null as never,
    button: 1, checkbox: 1, color: 1, file: 1, hidden: 1, //
    image: 1, radio: 1, range: 1, reset: 1, submit: 1
  },
  editableTypes_: <SafeDict<EditableType>> { __proto__: null as never,
    input: EditableType.input_, textarea: EditableType.Editbox,
    keygen: EditableType.Select, select: EditableType.Select,
    embed: EditableType.Embed, object: EditableType.Embed
  },
  /**
   * if true, then `element` is `HTMLElement` and safe
   */
  getEditableType_ (element: Element): EditableType {
    const name = element.tagName;
    if (!(element instanceof HTMLElement) || typeof name !== "string") { return EditableType.NotEditable; }
    const ty = this.editableTypes_[name.toLowerCase()];
    return ty !== EditableType.input_ ? (ty
        || (element.isContentEditable === true ? EditableType.Editbox : EditableType.NotEditable))
      : this.uneditableInputs_[(element as HTMLInputElement).type] ? EditableType.NotEditable : EditableType.Editbox;
  },
  docSelectable_: true,
  isSelected_ (): boolean {
    const element = document.activeElement as Element;
    const sel = getSelection(), node = sel.anchorNode;
    // only <form>, <select>, Window has index getter, so `=== node.childNodes[i]` is safe
    return (element as HTMLElement).isContentEditable === true ? !!node && document.contains.call(element, node)
      : sel.type === "Range" && sel.isCollapsed && element === (node as Node).childNodes[sel.anchorOffset];
  },
  getSelectionFocusElement_ (): Element | null {
    let sel = getSelection(), node = sel.focusNode, i = sel.focusOffset, cn: Node["childNodes"];
    node && node === sel.anchorNode && i === sel.anchorOffset &&
      !((cn = node.childNodes) instanceof Element) && (node = cn[i]);
    return node && VDom.SafeEl_(node instanceof Element ? node : node.parentElement);
  },
  getSelectionParent_ (): HTMLElement | null {
    let range = getSelection().getRangeAt(0), par: Node | null = range.commonAncestorContainer;
    // no named getters on SVG* elements
    while (par && !(par instanceof HTMLElement)) { par = par.parentNode as Element; }
    if (par && !range.startOffset && (range + "").length === par.innerText.length) {
      par = par.parentElement as HTMLElement;
    }
    return par !== document.documentElement ? par as HTMLElement : null;
  },
  getElementWithFocus_ (sel: Selection, di: BOOL): Element | null {
    const r = sel.getRangeAt(0), type = di ? "end" as "end" : "start" as "start", E = Element;
    let el: Node | null = r[(type + "Container") as "startContainer" | "endContainer"]
      , o: Node | null, cn: Node["childNodes"];
    if (el instanceof E) {
      el = !((cn = el.childNodes) instanceof E) && cn[r[(type + "Offset") as "startOffset" | "endOffset"]] || null;
    }
    for (o = el; o && !(o instanceof E); o = o.previousSibling) {}
    return this.SafeEl_(/* Element | null */ o || (/* el is not Element */ el && el.parentElement));
  },
  mouse_: function (this: {}, element: Element, type: "mousedown" | "mouseup" | "click" | "mouseover" | "mouseout"
      , rect?: VRect | null, modifiers?: EventControlKeys | null, related?: Element | null): boolean {
    modifiers || (modifiers = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false });
    let doc = element.ownerDocument;
    doc.nodeType !== Node.DOCUMENT_NODE && (doc = document);
    const mouseEvent = doc.createEvent("MouseEvents");
    // (typeArg: string, canBubbleArg: boolean, cancelableArg: boolean,
    //  viewArg: Window, detailArg: number,
    //  screenXArg: number, screenYArg: number, clientXArg: number, clientYArg: number,
    //  ctrlKeyArg: boolean, altKeyArg: boolean, shiftKeyArg: boolean, metaKeyArg: boolean,
    //  buttonArg: number, relatedTargetArg: EventTarget | null)
    let x = rect ? ((rect[0] + rect[2]) * VDom.dbZoom_ / 2) | 0 : 0
      , y = rect ? ((rect[1] + rect[3]) * VDom.dbZoom_ / 2) | 0 : 0;
    mouseEvent.initMouseEvent(type, true, true
      , doc.defaultView || window, type.startsWith("mouseo") ? 0 : 1
      , x, y, x, y
      , modifiers.ctrlKey, modifiers.altKey, modifiers.shiftKey, modifiers.metaKey
      , 0, related || null);
    return doc.dispatchEvent.call(element, mouseEvent);
  } as VDomMouse,
  lastHovered_: null as Element | null,
  /** note: will NOT skip even if newEl == @lastHovered */
  hover_: function (this: {}, newEl: Element | null, rect?: VRect | null): void {
    let a = VDom as typeof VDom, last = a.lastHovered_;
    if (last && a.isInDOM_(last)) {
      a.mouse_(last, "mouseout", null, null, newEl !== last ? newEl : null);
    } else {
      last = null;
    }
    a.lastHovered_ = newEl;
    newEl && a.mouse_(newEl, "mouseover", rect as VRect | null, null, last);
  } as {
    (newEl: Element, rect: VRect | null): void;
    (newEl: null): void;
  },
  isContaining_ (a: VRect, b: VRect): boolean {
    return a[3] >= b[3] && a[2] >= b[2] && a[1] <= b[1] && a[0] <= b[0];
  },
  fromClientRect_ (rect: ClientRect): WritableVRect {
    return [rect.left | 0, rect.top | 0, rect.right | 0, rect.bottom | 0];
  },
  setBoundary_ (style: CSSStyleDeclaration, r: WritableVRect, allow_abs?: boolean): void {
    if (allow_abs && (r[1] < 0 || r[0] < 0 || r[3] > innerHeight || r[2] > innerWidth)) {
      const arr: ViewOffset = this.getViewBox_();
      r[0] += arr[0], r[2] += arr[0], r[1] += arr[1], r[3] += arr[1];
      style.position = "absolute";
    }
    style.left = r[0] + "px", style.top = r[1] + "px";
    style.width = (r[2] - r[0]) + "px", style.height = (r[3] - r[1]) + "px";
  },
  cropRectToVisible_: null as never as (left: number, top: number, right: number, bottom: number) => VRect | null,
  SubtractSequence_ (this: [VRect[], VRect], rect1: VRect): void { // rect1 - rect2
    let rect2 = this[1], a = this[0], x1: number, x2: number
      , y1 = Math.max(rect1[1], rect2[1]), y2 = Math.min(rect1[3], rect2[3]);
    if (y1 >= y2 || ((x1 = Math.max(rect1[0], rect2[0])) >= (x2 = Math.min(rect1[2], rect2[2])))) {
      a.push(rect1);
      return;
    }
    // 1 2 3
    // 4   5
    // 6 7 8
    const x0 = rect1[0], x3 = rect1[2], y0 = rect1[1], y3 = rect1[3];
    x0 < x1 && a.push([x0, y0, x1, y3]); // (1)4(6)
    y0 < y1 && a.push([x1, y0, x3, y1]); // 2(3)
    y2 < y3 && a.push([x1, y2, x3, y3]); // 7(8)
    x2 < x3 && a.push([x2, y1, x3, y2]); // 5
  }
};
