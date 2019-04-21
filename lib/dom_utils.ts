/// <reference path="../content/base.d.ts" />
var VDom = {
  UI: null as never as DomUI,
  // note: scripts always means allowing timers - vPort.ClearPort requires this assumption
  allowScripts_: 1 as BOOL,
  allowRAF_: 1 as BOOL,
  /** is true only when Firefox  */
  fixedClientTop_: !(Build.BTypes & ~BrowserType.Firefox) ? 1 as BOOL : 0 as BOOL,
  specialZoom_: !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl
    ? true : !!(Build.BTypes & BrowserType.Chrome),
  docSelectable_: true,
  docNotCompleteWhenVimiumIniting_: document.readyState !== "complete",
  isHTML_ (this: void): boolean { return document.documentElement instanceof HTMLElement; },
  isInTouchMode_: Build.BTypes & BrowserType.Chrome ? function (): boolean {
    const viewport = document.querySelector("meta[name=viewport]");
    return !!viewport &&
      (<RegExpI> /\b(device-width|initial-scale)\b/i).test(viewport.getAttribute("content") || "");
  } : 0 as never,
  createElement_<K extends VimiumContainerElementType> (tagName: K): HTMLElementTagNameMap[K] & SafeHTMLElement {
    const d = document, a = this,
    node = document.createElement(tagName), valid = node instanceof HTMLElement;
    a.createElement_ = valid ? d.createElement.bind(d) as typeof VDom.createElement_
      : d.createElementNS.bind<Document, "http://www.w3.org/1999/xhtml", [VimiumContainerElementType]
        , HTMLElement>(d, "http://www.w3.org/1999/xhtml") as typeof VDom.createElement_;
    return valid ? node as HTMLElementTagNameMap[K] & SafeHTMLElement : a.createElement_(tagName);
  },
  execute_ (callback: (this: void) => void): void { callback(); },
  /** Note: won't call functions if Vimium is destroyed */
  OnDocLoaded_ (callback: (this: void) => void): void {
    const a = this, call = a.execute_;
    if (document.readyState !== "loading") {
      a.OnDocLoaded_ = call;
      return callback();
    }
    let listeners = [callback], eventName = "DOMContentLoaded";
    function eventHandler(): void {
      // not need to check event.isTrusted
      removeEventListener(eventName, eventHandler, true);
      if (VDom === a) { // check `a` for safety even if reloaded
        VDom.OnDocLoaded_ = call;
        listeners.forEach(call);
      }
      listeners = null as never;
    }
    a.OnDocLoaded_ = function (callback1): void {
      listeners.push(callback1);
    };
    addEventListener(eventName, eventHandler, true);
  },
  parentFrame_(): (HTMLFrameElement | HTMLIFrameElement) & SafeElement | null {
    if (Build.MinCVer >= BrowserVer.MinSafeGlobal$frameElement || !(Build.BTypes & BrowserType.Chrome)) {
      return frameElement as (HTMLFrameElement | HTMLIFrameElement) & SafeElement | null;
    }
    try {
      return frameElement as (HTMLFrameElement | HTMLIFrameElement) & SafeElement | null;
    } catch {
      return null;
    }
  },
  /** refer to {@link BrowserVer.MinParentNodeInNodePrototype } */
  Getter_: Build.BTypes & ~BrowserType.Firefox ? function <Ty extends Node, Key extends keyof Ty> (this: void
      , Cls: { prototype: Ty, new(): Ty; }, instance: Ty, property: Key & string
      ): NonNullable<Ty[Key]> | null {
    const desc = Object.getOwnPropertyDescriptor(Cls.prototype, property);
    return desc && desc.get ? desc.get.call(instance) : null;
  } : 0 as never,
  GetShadowRoot_ (el: Element | Node): ShadowRoot | null {
    // check el's type to avoid exceptions
    if (Build.BTypes & ~BrowserType.Firefox) {
      const sr = (el as Element).shadowRoot || null, E = Element;
      return sr && sr instanceof E ? el instanceof E ? VDom.Getter_(E, el, "shadowRoot") : null : sr;
    } else {
      return (el as Element).shadowRoot || null;
    }
  },
  /**
   * Try its best to find a real parent
   * @safe_even_if_any_overridden_property
   * @UNSAFE_RETURNED
   */
  GetParent_: function (this: void, el: Node
      , type: PNType.DirectNode | PNType.DirectElement | PNType.RevealSlot | PNType.RevealSlotAndGotoParent
      ): Node | null {
    /**
     * Known info about Chrome:
     * * a selection / range can only know nodes and text in a same tree scope
     *
     */
    const E = Element;
    if (type >= PNType.RevealSlot) {
      if (Build.MinCVer < BrowserVer.MinNoShadowDOMv0 && Build.BTypes & BrowserType.Chrome) {
        const func = E.prototype.getDestinationInsertionPoints;
        const arr = func ? func.call(el as Element) : [];
        arr.length > 0 && (el = arr[arr.length - 1]);
      }
      let slot = (el as Element).assignedSlot;
      Build.BTypes & ~BrowserType.Firefox && slot && VDom.notSafe_(el) &&
      (slot = VDom.Getter_(E, el, "assignedSlot"));
      if (slot) {
        if (type === PNType.RevealSlot) { return slot; }
        while (slot = slot.assignedSlot) { el = slot as HTMLSlotElement; }
      }
    }
    let pe = el.parentElement, pn = el.parentNode;
    if (pe === pn /* normal pe or no parent */ || !pn /* indeed no par */) { return pn; }
    // par exists but not in normal tree
    if (Build.BTypes & ~BrowserType.Firefox && !pn.contains(el)) { // pn is overridden
      if (pe && pe.contains(el)) { /* pe is real */ return pe; }
      pn = VDom.Getter_(Node, el, "parentNode");
    }
    const SR = window.ShadowRoot as Exclude<Window["ShadowRoot"], Element | undefined>;
    // pn is real or null
    return type === PNType.DirectNode ? pn // may return a Node instance
      : type >= PNType.ResolveShadowHost && (
        !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0 ||
          SR && !(SR instanceof E)
        ) && pn instanceof SR ? pn.host // shadow root
      : pn instanceof E ? pn /* in doc and .pN+.pE are overridden */ : null /* pn is null, DocFrag, or ... */;
  } as {
    (this: void, el: Element, type: PNType.DirectElement
        | PNType.ResolveShadowHost | PNType.RevealSlot | PNType.RevealSlotAndGotoParent): Element | null;
    (this: void, el: Node, type: PNType.DirectNode): ShadowRoot | DocumentFragment | Document | Element | null;
  },
  scrollingEl_ (fallback?: 1): SafeElement | null {
    // Both C73 and FF66 still supports the Quirk mode (entered by `document.open()`)
    let d = document, el = d.scrollingElement, docEl = d.documentElement;
    if (Build.MinCVer < BrowserVer.Min$Document$$ScrollingElement && Build.BTypes & BrowserType.Chrome
        && el === undefined) {
      /**
       * The code about `inQuirksMode` in `Element::scrollTop()` is wrapped by a flag #scrollTopLeftInterop
       * since [2013-11-18] https://github.com/chromium/chromium/commit/25aa0914121f94d2e2efbc4bf907f231afae8b51 ,
       * while the flag is hidden on Chrome 34~43 (32-bits) for Windows (34.0.1751.0 is on 2014-04-07).
       * But the flag is under the control of #enable-experimental-web-platform-features
       */
      let body = d.body;
      el = d.compatMode === "BackCompat" || body && (
              scrollY ? body.scrollTop : (docEl as HTMLHtmlElement).scrollHeight <= body.scrollHeight)
        ? body : body ? docEl : null;
      // If not fallback, then the task is to get an exact one in order to use `scEl.scrollHeight`,
      // but if body is null in the meanwhile, then docEl.scrollHeight is not reliable (scrollY neither)
      //   when it's real scroll height is not larger than innerHeight
    }
    if (Build.MinCVer < BrowserVer.MinEnsured$ScrollingElement$CannotBeFrameset && Build.BTypes & BrowserType.Chrome) {
      el = (Build.MinCVer < BrowserVer.MinNamedGetterOnFramesetNotOverrideBulitin ? el && this.notSafe_(el)
            : el instanceof HTMLFrameSetElement) ? null : el;
    }
    if (!(Build.BTypes & ~BrowserType.Firefox)) {
      return el || !fallback ? el as SafeElement | null : docEl as SafeElement | null;
    }
    // here `el` may be `:root` / `:root > body` / null, but never `:root > frameset`
    return this.notSafe_(el as Exclude<typeof el, undefined>) ? null // :root is unsafe
      : el || !fallback ? el as SafeElement | null // el is safe object or null
      : this.notSafe_(docEl) ? null : docEl as SafeElement | null;
  },
  /**
   * other parts of code require that prepareCrop only depends on @dbZoom
   */
  prepareCrop_ (): number {
    let iw: number, ih: number, ihs: number;
    this.prepareCrop_ = (function (this: void): number {
      const a = VDom, fz = a.dbZoom_, dz = fz / a.bZoom_, b = a.paintBox_,
      d = document, doc = document.documentElement,
      el = Build.MinCVer >= BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled || !(Build.BTypes & BrowserType.Chrome)
            ? a.scrollingEl_() : d.compatMode === "BackCompat" ? d.body : doc;
      let i: number, j: number;
      if (Build.MinCVer < BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled && Build.BTypes & BrowserType.Chrome
          ? el && !a.notSafe_(el) : el) {
        i = (el as SafeElement).clientWidth, j = (el as SafeElement).clientHeight;
      } else {
        i = innerWidth, j = innerHeight;
        if (!doc) { return ih = j, ihs = j - 8, iw = i; }
        // the below is not reliable but safe enough, even when docEl is unsafe
        i = Math.min(Math.max(i - GlobalConsts.MaxScrollbarWidth, (doc.clientWidth * dz) | 0), i);
        j = Math.min(Math.max(j - GlobalConsts.MaxScrollbarWidth, (doc.clientHeight * dz) | 0), j);
      }
      if (b) {
        i = Math.min(i, b[0] * dz); j = Math.min(j, b[1] * dz);
      }
      iw = (i / fz) | 0, ih = (j / fz) | 0;
      ihs = ((j - 8) / fz) | 0;
      return iw;
    });
    this.cropRectToVisible_ = (function (left, top, right, bottom): Rect | null {
      if (top > ihs || bottom < 3) {
        return null;
      }
      const cr: Rect = [ //
        left   >  0 ? (left   | 0) :  0, //
        top    >  0 ? (top    | 0) :  0, //
        right  < iw ? (right  | 0) : iw, //
        bottom < ih ? (bottom | 0) : ih  //
      ];
      return cr[2] - cr[0] >= 3 && cr[3] - cr[1] >= 3 ? cr : null;
    });
    return this.prepareCrop_();
  },
  getBoundingClientRect_ (el: Element): ClientRect {
    return Build.BTypes & ~BrowserType.Firefox ? Element.prototype.getBoundingClientRect.call(el)
      : el.getBoundingClientRect();
  },
  getVisibleClientRect_ (element: Element, el_style?: CSSStyleDeclaration): Rect | null {
    const arr = Build.BTypes & ~BrowserType.Firefox ? Element.prototype.getClientRects.call(element)
                : element.getClientRects();
    let cr: Rect | null, style: CSSStyleDeclaration | null, _ref: HTMLCollection | undefined
      , isVisible: boolean | undefined, notInline: boolean | undefined, str: string;
    for (let _i = 0, _len = arr.length; _i < _len; _i++) {
      const rect = arr[_i];
      if (rect.height > 0 && rect.width > 0) {
        if (cr = this.cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)) {
          if (isVisible == null) {
            el_style || (el_style = getComputedStyle(element));
            isVisible = el_style.visibility === "visible";
          }
          if (isVisible) { return cr; }
        }
        continue;
      }
      if (_ref || (_ref = element.children, Build.BTypes & ~BrowserType.Firefox && _ref instanceof Element)) {
        continue;
      }
      for (let _j = 0, _len1 = _ref.length, gCS = getComputedStyle; _j < _len1; _j++) {
        style = gCS(_ref[_j]);
        if (style.float !== "none" || ((str = style.position) !== "static" && str !== "relative")) { /* empty */ }
        else if (rect.height === 0) {
          if (notInline == null) {
            el_style || (el_style = gCS(element));
            notInline = (el_style.fontSize !== "0px" && el_style.lineHeight !== "0px")
              || !el_style.display.startsWith("inline");
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
      , areas?: HTMLCollectionOf<HTMLAreaElement> | HTMLAreaElement[]): Rect | null {
    let diff: number, x1: number, x2: number, y1: number, y2: number, rect: Rect | null | undefined;
    const cr = element.getClientRects()[0] as ClientRect | undefined;
    if (!cr || cr.height < 3 || cr.width < 3) { return null; }
    // replace is necessary: chrome allows "&quot;", and also allows no "#"
    let wantRet = areas;
    if (!areas) {
      const selector = `map[name="${element.useMap.replace(<RegExpOne> /^#/, "").replace(<RegExpG> /"/g, '\\"')}"]`;
      // on C73, if a <map> is moved outside from a #shadowRoot, then the relation of the <img> and it is kept;
      // while on F65 the relation will get lost.
      const root = (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || !(Build.BTypes & ~BrowserType.Firefox) || element.getRootNode)
        ? (element as EnsureNonNull<typeof element>).getRootNode() as ShadowRoot | Document : document;
      const map = root.querySelector(selector);
      if (!map || !(map instanceof HTMLMapElement)) { return null; }
      areas = map.getElementsByTagName("area");
    }
    const toInt = (a: string) => (a as string | number as number) | 0;
    for (let _i = 0, _len = (areas as NonNullable<typeof areas>).length; _i < _len; _i++) {
      const area = (areas as NonNullable<typeof areas>)[_i], coords = area.coords.split(",").map(toInt);
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
    return wantRet && output.length > 0 ? output[0][1] : null;
  } as {
    (element: HTMLElementUsingMap, output: Hint5[], areas: HTMLCollectionOf<HTMLAreaElement> | HTMLAreaElement[]
      ): Rect | null;
    (element: HTMLElementUsingMap, output: Hint5[]): null;
  },
  paintBox_: null as [number, number] | null, // it may need to use `paintBox[] / <body>.zoom`
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
  getZoom_: Build.BTypes & ~BrowserType.Firefox ? function (this: {}, target?: 1 | Element): number {
    const a = this as typeof VDom;
    let docEl = document.documentElement as Element, ratio = devicePixelRatio
      , gcs = getComputedStyle, st = gcs(docEl), zoom = +st.zoom || 1
      , el: Element | null = !(Build.BTypes & ~BrowserType.Chrome)
            || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
          ? document.fullscreenElement : document.webkitFullscreenElement;
    Build.BTypes & BrowserType.Chrome &&
    Math.abs(zoom - ratio) < 1e-5 && (!(Build.BTypes & ~BrowserType.Chrome)
      && Build.MinCVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl || a.specialZoom_) && (zoom = 1);
    if (target) {
      const body = el ? null : document.body;
      // if fullscreen and there's nested "contain" styles,
      // then it's a whole mess and nothing can be ensured to be right
      a.bZoom_ = body && (target === 1 || a.isInDOM_(target, body)) && +gcs(body).zoom || 1;
    }
    for (; el && el !== docEl; el = a.GetParent_(el, PNType.RevealSlot)) {
      zoom *= +gcs(el).zoom || 1;
    }
    a.paintBox_ = null; // it's not so necessary to get a new paintBox here
    a.dbZoom_ = a.bZoom_ * zoom;
    return a.wdZoom_ = Math.round(zoom * Math.min(ratio, 1) * 1000) / 1000;
  } : function (this: {}): number {
    const a = this as typeof VDom;
    a.paintBox_ = null;
    a.dbZoom_ = a.bZoom_ = 1;
    return a.wdZoom_ = Math.min(devicePixelRatio, 1);
  } as never,
  getViewBox_ (needBox?: 1): ViewBox | ViewOffset {
    let iw = innerWidth, ih = innerHeight;
    const a = this;
    const ratio = devicePixelRatio, ratio2 = Math.min(ratio, 1), doc = document;
    if (!(Build.BTypes & ~BrowserType.Firefox) ? fullScreen
        : !(Build.BTypes & ~BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
        ? document.fullscreenElement : document.webkitIsFullScreen) {
      a.getZoom_(1);
      a.dScale_ = 1;
      const zoom3 = a.wdZoom_ / ratio2;
      return [0, 0, (iw / zoom3) | 0, (ih / zoom3) | 0, 0];
    }
    const gcs = getComputedStyle, float = parseFloat,
    box = doc.documentElement as Element, st = gcs(box),
    box2 = doc.body, st2 = box2 ? gcs(box2) : st,
    zoom2 = a.bZoom_ = Build.BTypes & ~BrowserType.Firefox && box2 && +st2.zoom || 1,
    containHasPaint = (<RegExpOne> /content|paint|strict/).test(st.contain as string),
    stacking = st.position !== "static" || containHasPaint || st.transform !== "none",
    // ignore the case that x != y in "transform: scale(x, y)""
    _tf = st.transform, scale = a.dScale_ = _tf && !_tf.startsWith("matrix(1,") && float(_tf.slice(7)) || 1,
    // NOTE: if box.zoom > 1, although document.documentElement.scrollHeight is integer,
    //   its real rect may has a float width, such as 471.333 / 472
    rect = VDom.getBoundingClientRect_(box);
    let zoom = Build.BTypes & ~BrowserType.Firefox && +st.zoom || 1;
    Build.BTypes & BrowserType.Chrome &&
    Math.abs(zoom - ratio) < 1e-5 && (!(Build.BTypes & ~BrowserType.Chrome)
      && Build.MinCVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl || a.specialZoom_) && (zoom = 1);
    a.wdZoom_ = Math.round(zoom * ratio2 * 1000) / 1000;
    a.dbZoom_ = Build.BTypes & ~BrowserType.Firefox ? zoom * zoom2 : 1;
    let x = !stacking ? float(st.marginLeft)
          : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && a.fixedClientTop_
          ? -float(st.borderLeftWidth) : 0 | -box.clientLeft
      , y = !stacking ? float(st.marginTop)
          : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && a.fixedClientTop_
          ? -float(st.borderTopWidth ) : 0 | -box.clientTop;
    x = x * scale - rect.left, y = y * scale - rect.top;
    // note: `Math.abs(y) < 0.01` supports almost all `0.01 * N` (except .01, .26, .51, .76)
    x = Math.abs(x) < 0.01 ? 0 : Math.ceil(Math.round(x / zoom2 * 100) / 100);
    y = Math.abs(y) < 0.01 ? 0 : Math.ceil(Math.round(y / zoom2 * 100) / 100);
    if (Build.BTypes & ~BrowserType.Firefox) {
      iw /= zoom, ih /= zoom;
    }
    let mw = iw, mh = ih;
    if (containHasPaint) { // ignore the area on the block's left
      iw = rect.right, ih = rect.bottom;
    }
    a.paintBox_ = containHasPaint ? [iw - float(st.borderRightWidth ) * scale,
                                       ih - float(st.borderBottomWidth) * scale] : null;
    if (!needBox) { return [x, y]; }
    // here rect.right is not accurate because <html> may be smaller than <body>
    const sEl = a.scrollingEl_(), H = "hidden",
    xScrollable = st.overflowX !== H && st2.overflowX !== H,
    yScrollable = st.overflowY !== H && st2.overflowY !== H;
    if (xScrollable) {
      mw += 64 * zoom2;
      if (!containHasPaint) {
        iw = sEl ? (sEl.scrollWidth - scrollX) / zoom : Math.max((iw - GlobalConsts.MaxScrollbarWidth) / zoom
          , rect.right);
      }
    }
    if (yScrollable) {
      mh += 20 * zoom2;
      if (!containHasPaint) {
        ih = sEl ? (sEl.scrollHeight - scrollY) / zoom : Math.max((ih - GlobalConsts.MaxScrollbarWidth) / zoom
          , rect.bottom);
      }
    }
    iw = Math.min(iw, mw), ih = Math.min(ih, mh);
    iw = (iw / zoom2) | 0, ih = (ih / zoom2) | 0;
    return [x, y, iw, yScrollable ? ih - GlobalConsts.MaxHeightOfLinkHintMarker : ih, xScrollable ? iw : 0];
  },
  scrollIntoView_ (el: Element, dir?: boolean): void {
    return !(Build.BTypes & ~BrowserType.Firefox) ? el.scrollIntoView({ block: "nearest" })
      : Element.prototype.scrollIntoView.call(el,
          Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && Build.BTypes & BrowserType.Chrome &&
          dir != null ? dir : { block: "nearest" });
  },
  view_ (el: Element, oldY?: number): boolean {
    const rect = this.getBoundingClientRect_(el),
    ty = this.NotVisible_(null, rect);
    if (ty === VisibilityType.OutOfView) {
      const t = rect.top, ih = innerHeight, delta = t < 0 ? -1 : t > ih ? 1 : 0, f = oldY != null;
      Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && Build.BTypes & BrowserType.Chrome
      ? this.scrollIntoView_(el, delta < 0) : this.scrollIntoView_(el);
      (delta || f) && this.scrollWndBy_(0, f ? (oldY as number) - scrollY : delta * ih / 5);
    }
    return ty === VisibilityType.Visible;
  },
  scrollWndBy_ (left: number, top: number): void {
    !(Build.BTypes & ~BrowserType.Firefox) ||
    !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
    HTMLElement.prototype.scrollBy ? scrollBy({behavior: "instant", left, top}) : scrollBy(left, top);
  },
  NotVisible_: function (this: void, element: Element | null, rect?: ClientRect): VisibilityType {
    if (!rect) {
      rect = VDom.getBoundingClientRect_(element as Element);
    }
    return rect.height < 0.5 || rect.width < 0.5 ? VisibilityType.NoSpace
      : rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth
        ? VisibilityType.OutOfView : VisibilityType.Visible;
  } as {
    (element: Element): VisibilityType;
    (element: null, rect: ClientRect): VisibilityType;
  },
  isInDOM_ (element: Element, root?: Element | Document, checkMouseEnter?: 1): boolean {
    if (!root) {
      const isConnected = element.isConnected; /** {@link BrowserVer.Min$Node$$isConnected} */
      if (!(Build.BTypes & ~BrowserType.Firefox) || isConnected === !!isConnected) {
        return isConnected as boolean; // is boolean : exists and is not overridden
      }
    }
    let doc: Element | Document = root || element.ownerDocument, f: Node["getRootNode"]
      , NP = Node.prototype, pe: Element | null;
    !(Build.BTypes & ~BrowserType.Firefox) ||
    root || doc.nodeType !== /* Node.DOCUMENT_NODE */ 9 && (doc = document);
    if (doc.nodeType === 9 && (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || !(Build.BTypes & ~BrowserType.Firefox) || (f = NP.getRootNode))) {
      return !(Build.BTypes & ~BrowserType.Firefox)
        ? (element as EnsureNonNull<Element>).getRootNode({composed: true}) === doc
        : (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
        ? NP.getRootNode as NonNullable<typeof f> : f as NonNullable<typeof f>
        ).call(element, {composed: true}) === doc;
    }
    if (Build.BTypes & ~BrowserType.Firefox ? NP.contains.call(doc, element) : doc.contains(element)) { return true; }
    while ((pe = VDom.GetParent_(element, checkMouseEnter ? PNType.RevealSlotAndGotoParent : PNType.ResolveShadowHost))
            && pe !== doc) {
      element = pe;
    }
    const pn = VDom.GetParent_(element, PNType.DirectNode);
    // Note: `pn instanceof Element` means `element.parentNode` is overridden,
    // so return a "potentially correct" result `true`.
    // This requires that further jobs are safe enough even when isInDOM returns a fake "true"
    return pn === doc || !checkMouseEnter && pn instanceof Element;
  },
  notSafe_: Build.BTypes & ~BrowserType.Firefox ? function (el: Node | null): el is HTMLFormElement {
    return el instanceof HTMLFormElement;
  } : 0 as never,
  /** @safe_even_if_any_overridden_property */
  SafeEl_: Build.BTypes & ~BrowserType.Firefox ? function (
      this: void, el: Node | null, type?: PNType.DirectElement): Node | null {
    return VDom.notSafe_(el)
      ? VDom.GetParent_(el, type || PNType.RevealSlotAndGotoParent) : el;
  } as {
    (this: void, el: HTMLElement | null): SafeHTMLElement | null;
    (this: void, el: Element | null, type?: PNType.DirectElement): SafeElement | null;
    (this: void, el: Node | null): Node | null;
  } : 0 as never,
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
   * if true, then `element` is `LockableElement`
   */
  getEditableType_: function (element: Element): EditableType {
    const name = element.tagName;
    if (!(element instanceof HTMLElement) || Build.BTypes & ~BrowserType.Firefox && typeof name !== "string") {
      return EditableType.NotEditable;
    }
    const ty = VDom.editableTypes_[(name as string).toLowerCase()];
    return ty !== EditableType.input_ ? (ty ||
        (element.isContentEditable !== true || Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(element)
        ? EditableType.NotEditable : EditableType.Editbox)
      )
      : VDom.uneditableInputs_[(element as HTMLInputElement).type] ? EditableType.NotEditable : EditableType.Editbox;
  } as {
    <Ty extends 0>(element: Element): EditableType;
    <Ty extends 1>(element: Element): element is LockableElement;
    <Ty extends LockableElement>(element: EventTarget): element is Ty;
  },
  isInputInTextMode_ (el: HTMLInputElement | HTMLTextAreaElement): boolean | void {
    if (Build.MinCVer >= BrowserVer.Min$selectionStart$MayBeNull || !(Build.BTypes & BrowserType.Chrome)) {
      return el.selectionEnd != null;
    }
    try {
      return el.selectionEnd != null;
    } catch {}
  },
  isSelected_ (): boolean {
    const element = document.activeElement as Element, sel = getSelection(), node = sel.anchorNode;
    // only <form>, <select>, Window has index getter, so `=== node.childNodes[i]` is safe
    return (element as HTMLElement).isContentEditable === true
      ? !!node && (Build.BTypes & ~BrowserType.Firefox ? document.contains.call(element, node) : element.contains(node))
      : element === node || node instanceof Element && element === node.childNodes[sel.anchorOffset];
  },
  /**
   * need selection.rangeCount > 0
   * @UNSAFE_RETURNED
   */
  GetSelectionParent_unsafe_ (sel: Selection, selected?: string): HTMLElement | null {
    let range = sel.getRangeAt(0), par: Node | null = range.commonAncestorContainer, p0 = par;
    // no named getters on SVG* elements
    while (par && !(par instanceof HTMLElement)) { par = par.parentNode as Element; }
    if (selected && p0 instanceof Text && p0.data.trim().length <= selected.length) {
      let text: string;
      while (par && (text = (<HTMLElement> par).innerText,
            !(Build.BTypes & ~BrowserType.Firefox && typeof text !== "string"))
          && selected.length === text.length) {
        par = VDom.GetParent_(par as Element, PNType.DirectElement);
      }
    }
    return par !== document.documentElement ? par as HTMLElement | null : null;
  },
  getSelectionFocusEdge_ (sel: Selection, knownDi: VisualModeNS.ForwardDir): SafeElement | null {
    if (!sel.rangeCount) { return null; }
    let el = sel.focusNode, E = Element
      , o: Node | null, cn: Node["childNodes"];
    if (el instanceof E) {
      el = Build.BTypes & ~BrowserType.Firefox
        ? !((cn = this.Getter_(Node, el, "childNodes") || el.childNodes) instanceof E) && cn[sel.focusOffset] || el
        : el.childNodes[sel.focusOffset] || el;
    }
    for (o = el; o && !(o instanceof E); o = knownDi ? o.previousSibling : o.nextSibling) { /* empty */ }
    if (!(Build.BTypes & ~BrowserType.Firefox)) {
      return (/* Element | null */ o || (/* el is not Element */ el && el.parentElement)) as SafeElement | null;
    }
    return this.SafeEl_(/* Element | null */ o || (/* el is not Element */ el && el.parentElement)
      , PNType.DirectElement);
  },
  center_ (rect?: Rect | null): Point2D {
    let zoom = Build.BTypes & ~BrowserType.Firefox ? this.dbZoom_ / 2 : 0.5;
    rect = rect && this.cropRectToVisible_.apply(this, rect as [number, number, number, number]) || rect;
    return rect ? [((rect[0] + rect[2]) * zoom) | 0, ((rect[1] + rect[3]) * zoom) | 0] : [0, 0];
  },
  mouse_: function (this: {}, element: Element
      , type: "mousedown" | "mouseup" | "click" | "mouseover" | "mouseenter" | "mouseout" | "mouseleave"
      , center: Point2D, modifiers?: MyMouseControlKeys | null, related?: Element | null
      , button?: number): boolean {
    let doc = element.ownerDocument;
    Build.BTypes & ~BrowserType.Firefox &&
    doc.nodeType !== /* Node.DOCUMENT_NODE */ 9 && (doc = document);
    const mouseEvent = doc.createEvent("MouseEvents");
    // (typeArg: string, canBubbleArg: boolean, cancelableArg: boolean,
    //  viewArg: Window, detailArg: number,
    //  screenXArg: number, screenYArg: number, clientXArg: number, clientYArg: number,
    //  ctrlKeyArg: boolean, altKeyArg: boolean, shiftKeyArg: boolean, metaKeyArg: boolean,
    //  buttonArg: number, relatedTargetArg: EventTarget | null)
    // note: there seems no way to get correct screenX/Y of an element
    mouseEvent.initMouseEvent(type, !0, !0
      , doc.defaultView || window, type.startsWith("mouseo") ? 0 : 1
      , center[0], center[1], center[0], center[1]
      , modifiers ? modifiers.ctrlKey_ : !1, modifiers ? modifiers.altKey_ : !1, modifiers ? modifiers.shiftKey_ : !1
      , modifiers ? modifiers.metaKey_ : !1
      , <number> button | 0, related && related.ownerDocument === doc ? related : null);
    return Build.BTypes & ~BrowserType.Firefox ? dispatchEvent.call(element, mouseEvent)
      : element.dispatchEvent(mouseEvent);
  } as VDomMouse,
  lastHovered_: null as Element | null,
  /** note: will NOT skip even if newEl == @lastHovered */
  hover_: function (this: {}, newEl: Element | null, center?: Point2D): void {
    let a = VDom as typeof VDom, last = a.lastHovered_;
    if (last && a.isInDOM_(last)) {
      const notSame = newEl !== last;
      a.mouse_(last, "mouseout", [0, 0], null, notSame ? newEl : null);
      if (!newEl || notSame && !a.isInDOM_(newEl, last, 1)) {
        a.mouse_(last, "mouseleave", [0, 0], null, newEl);
      }
    } else {
      last = null;
    }
    a.lastHovered_ = newEl;
    if (newEl) {
      a.mouse_(newEl, "mouseover", center as Point2D, null, last);
      a.mouse_(newEl, "mouseenter", center as Point2D, null, last);
    }
  } as {
    (newEl: Element, center: Point2D): void;
    (newEl: null): void;
  },
  touch_: Build.BTypes & BrowserType.Chrome ? function (this: {}, element: Element
      , [x, y]: Point2D, id?: number): number {
    const newId = id || Date.now(),
    touchObj = new Touch({
      identifier: newId, target: element,
      clientX: x, clientY: y,
      screenX: x, screenY: y,
      pageX: x + scrollX, pageY: y + scrollY,
      radiusX: 8, radiusY: 8, force: 1,
    }),
    touchEvent = new TouchEvent(id ? "touchend" : "touchstart", {
      cancelable: true, bubbles: true,
      touches: id ? [] : [touchObj],
      targetTouches: id ? [] : [touchObj],
      changedTouches: [touchObj],
    });
    document.dispatchEvent.call(element, touchEvent);
    return newId;
  } : 0 as never,
  isContaining_ (a: Rect, b: Rect): boolean {
    return a[3] >= b[3] && a[2] >= b[2] && a[1] <= b[1] && a[0] <= b[0];
  },
  padClientRect_ (rect: ClientRect, padding: number): WritableRect {
    const x = rect.left, y = rect.top, max = Math.max;
    padding = x || y ? padding : 0;
    return [x | 0, y | 0, (x + max(rect.width, padding)) | 0, (y + max(rect.height, padding)) | 0];
  },
  setBoundary_ (style: CSSStyleDeclaration, r: WritableRect, allow_abs?: boolean): void {
    if (allow_abs && (r[1] < 0 || r[0] < 0 || r[3] > innerHeight || r[2] > innerWidth)) {
      const arr: ViewOffset = this.getViewBox_();
      r[0] += arr[0], r[2] += arr[0], r[1] += arr[1], r[3] += arr[1];
      style.position = "absolute";
    }
    style.left = r[0] + "px", style.top = r[1] + "px";
    style.width = (r[2] - r[0]) + "px", style.height = (r[3] - r[1]) + "px";
  },
  cropRectToVisible_: null as never as (left: number, top: number, right: number, bottom: number) => Rect | null,
  SubtractSequence_ (this: [Rect[], Rect], rect1: Rect): void { // rect1 - rect2
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
