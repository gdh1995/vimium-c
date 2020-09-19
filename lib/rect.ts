import { doc, VOther, chromeVer_ } from "./utils"
import {
  docEl_unsafe_, scrollingEl_, notSafe_not_ff_, ElementProto, isRawStyleVisible, getComputedStyle_, NONE,
  querySelector_unsafe_, querySelectorAll_unsafe_, GetParent_unsafe_, HDN, createElement_, fullscreenEl_unsafe_,
  IsInDOM_, scrollIntoView_,
} from "./dom_utils"

let paintBox_: [number, number] | null = null // it may need to use `paintBox[] / <body>.zoom`
let wdZoom_ = 1 // <html>.zoom * min(devicePixelRatio, 1) := related to physical pixels
let docZoom_ = 1 // zoom of <html>
let isDocZoomStrange_: BOOL = 0
let dScale_ = 1 // <html>.transform:scale (ignore the case of sx != sy)
let bScale_ = 1 // <body>.transform:scale (ignore the case of sx != sy)
  /** zoom of <body> (if not fullscreen else 1) */
let bZoom_ = 1
/** @NEED_SAFE_ELEMENTS */
let scrollingTop: SafeElement | null = null

export { paintBox_, wdZoom_, docZoom_, isDocZoomStrange_, dScale_, bScale_, bZoom_, scrollingTop }
export function set_bZoom_ (_newBZoom: number): void { bZoom_ = _newBZoom }
export function set_scrollingTop (newScrollingTop: SafeElement | null): void { scrollingTop = newScrollingTop }

export const wndSize_ = (id?: 0 | 1 | 2): number => id ? id < 2 ? innerWidth : devicePixelRatio : innerHeight as number

/** if `el` is null, then return viewSize for `kDim.scrollSize` */
export const dimSize_ = (el: SafeElement | null, index: kDim | ScrollByY): number => {
  let visual, byY = (index & kDim.byY) as BOOL;
  return el !== scrollingTop || index > kDim.elClientW - 1 && el
      ? index < kDim.scrollW ? byY ? el!.clientHeight : el!.clientWidth
        : index < kDim.positionX ? byY ? el!.scrollHeight : el!.scrollWidth
        : byY ? el!.scrollTop : el!.scrollLeft
      : index > kDim.positionX - 1 ? byY ? scrollY : scrollX
      : (visual = visualViewport,
          !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$
          || (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$
              ? visual : visual && visual.width)
          ? byY ? visual!.height : visual!.width!
          : wndSize_((1 - byY) as BOOL))
}

/** depends on .docZoom_, .bZoom_, .paintBox_ */
export let prepareCrop_ = (inVisualViewport?: 1, limitedView?: Rect | null): number => {
  let vright: number, vbottom: number, vbottoms: number, vleft: number, vtop: number, vtops: number
  prepareCrop_ = (function (this: void, inVisual?: 1, limited?: Rect | null): number {
    const dz = Build.BTypes & ~BrowserType.Firefox ? docZoom_ : 1,
    fz = Build.BTypes & ~BrowserType.Firefox ? dz * bZoom_ : 1, b = paintBox_,
    max = Math.max, min = Math.min,
    d = doc, visual = inVisual && visualViewport
    let i: number, j: number, el: Element | null, docEl: Document["documentElement"]
    vleft = vtop = 0
    if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$ ? visual
        : visual && visual.width) {
      vleft = visual!.offsetLeft | 0, vtop = visual!.offsetTop | 0
      i = vleft + visual!.width! | 0; j = vtop + visual!.height | 0
    }
    else if (docEl = docEl_unsafe_(),
        el = Build.MinCVer >= BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled
            || !(Build.BTypes & BrowserType.Chrome)
            ? scrollingEl_() : d.compatMode === "BackCompat" ? d.body : docEl,
        Build.MinCVer < BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled && Build.BTypes & BrowserType.Chrome
          ? el && !notSafe_not_ff_!(el) : el) {
      i = dimSize_(el as SafeElement, kDim.elClientW), j = dimSize_(el as SafeElement, kDim.elClientH)
    } else {
      i = wndSize_(1), j = wndSize_()
      if (!docEl) { return vbottom = j, vbottoms = j - 8, vright = i; }
      // the below is not reliable but safe enough, even when docEl is unsafe
      i = min(max(i - GlobalConsts.MaxScrollbarWidth, (dimSize_(docEl as SafeElement, kDim.elClientW) * dz) | 0), i)
      j = min(max(j - GlobalConsts.MaxScrollbarWidth, (dimSize_(docEl as SafeElement, kDim.elClientH) * dz) | 0), j)
    }
    if (b) {
      i = min(i, b[0] * dz); j = min(j, b[1] * dz)
    }
    vright = (i / fz) | 0, vbottom = (j / fz) | 0
    if (limited) {
      vleft = max(vleft, limited.l | 0)
      vtop = max(vtop, limited.t | 0)
      vright = min(vright, limited.r | 0)
      vbottom = min(vbottom, limited.b | 0)
    }
    vtops = vtop + 3
    vbottoms = (vbottom - 8 / fz) | 0
    return vright
  })
  cropRectToVisible_ = (function (left, top, right, bottom): Rect | null {
    if (top > vbottoms || bottom < vtops) {
      return null
    }
    const cr: Rect = {
      l: left   > vleft   ? (left   | 0) : vleft,
      t: top    > vtop    ? (top    | 0) : vtop,
      r: right  < vright  ? (right  | 0) : vright,
      b: bottom < vbottom ? (bottom | 0) : vbottom
    }
    return cr.r - cr.l > 2 && cr.b - cr.t > 2 ? cr : null
  })
  return prepareCrop_(inVisualViewport, limitedView)
}

export let getBoundingClientRect_: (el: Element) => ClientRect = Build.BTypes & ~BrowserType.Firefox ? (el) => {
  type ClientRectGetter = (this: Element) => ClientRect
  const func = ElementProto().getBoundingClientRect as ClientRectGetter
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
      continue
    }
    // according to https://dom.spec.whatwg.org/#dom-parentnode-children
    // .children will always be a HTMLCollection even if element is a non-HTML element
    if (I) {
      continue
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
        return cr
      }
    }
  }
  return null
}

export const getClientRectsForAreas_ = function (element: HTMLElementUsingMap, output: Hint[]
    , areas?: NodeListOf<HTMLAreaElement | Element> | HTMLAreaElement[]): Rect | null {
  let diff: number, x1: number, x2: number, y1: number, y2: number, rect: Rect | null | undefined
  const cr = padClientRect_(getBoundingClientRect_(element)), crWidth = cr.r - cr.l, crHeight = cr.b - cr.t
  if (crHeight < 3 || crWidth < 3) { return null }
  // replace is necessary: chrome allows "&quot;", and also allows no "#"
  if (!areas) {
    const selector = `map[name="${element.useMap.replace(<RegExpOne> /^#/, "").replace(<RegExpG> /"|\\/g, '\\$&')}"]`
    // on C73, if a <map> is moved outside from a #shadowRoot, then the relation of the <img> and it is kept
    // while on F65 the relation will get lost.
    const root = (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
        || !(Build.BTypes & ~BrowserType.Firefox) || element.getRootNode)
      ? element.getRootNode!() as ShadowRoot | Document : doc
    const map = querySelector_unsafe_(selector, root)
    if (!map || (map as ElementToHTML).lang == null) { return null; }
    areas = querySelectorAll_unsafe_("area", map as SafeHTMLElement)!
  }
  const toInt = (a: string): number => (a as string | number as number) | 0
  for (let _i = 0, _len = areas.length; _i < _len; _i++) {
    const area = areas[_i] as SafeElement & (HTMLAreaElement | NonHTMLButFormattedElement | SafeElementWithoutFormat)
    if ((area as ElementToHTML).lang == null) { continue; }
    let coords = (area as HTMLAreaElement).coords.split(",").map(toInt)
    switch ((area as HTMLAreaElement).shape.toLowerCase()) {
    case "circle": case "circ": // note: "circ" is non-conforming
      x2 = coords[0]; y2 = coords[1]; diff = coords[2] / Math.sqrt(2)
      x1 = x2 - diff; x2 += diff; y1 = y2 - diff; y2 += diff
      diff = 3
      break
    case "default": x1 = y1 = diff = 0, x2 = crWidth, y2 = crHeight; break
    case "poly": case "polygon": // note: "polygon" is non-conforming
      y1 = coords[0], y2 = coords[2], diff = coords[4]
      x1 = Math.min(y1, y2, diff); x2 = Math.max(y1, y2, diff)
      y1 = coords[1], y2 = coords[3], diff = coords[5]
      y1 = Math.min(y1, y2, diff); y2 = Math.max(coords[1], y2, diff)
      diff = 6
      break
    default:
      x1 = coords[0]; y1 = coords[1]; x2 = coords[2]; y2 = coords[3]
      x1 > x2 && (x1 = x2, x2 = coords[0])
      y1 > y2 && (y1 = y2, y2 = coords[1])
      diff = 4
      break
    }
    if (coords.length < diff) { continue; }
    rect = cropRectToVisible_(x1 + cr.l, y1 + cr.t, x2 + cr.l, y2 + cr.t)
    if (rect) {
      (output as Hint5[]).push([area, rect, 0, [rect, 0], element])
    }
  }
  return output.length ? output[0][1] : null
} as {
  (element: HTMLElementUsingMap, output: Hint[], areas?: HTMLCollectionOf<HTMLAreaElement> | HTMLAreaElement[]
    ): Rect | null
}

export const getCroppedRect_ = function (el: Element, crect: Rect | null): Rect | null {
  let parent: Element | null = el, prect: Rect | null | undefined, i: number = crect ? 3 : 0, bcr: Rect
  while (0 < i-- && (parent = GetParent_unsafe_(parent, PNType.RevealSlotAndGotoParent))) {
    if (getComputedStyle_(parent).overflow === HDN) {
      bcr = padClientRect_(getBoundingClientRect_(parent))
      prect = cropRectToVisible_(bcr.l, bcr.t, bcr.r, bcr.b)
      crect = prect && isContaining_(crect!, prect) ? prect : crect
    }
  }
  return crect
} as {
  (el: Element, crect: Rect): Rect
  (el: Element, crect: Rect | null): Rect | null
}

const _fixDocZoom_cr = Build.BTypes & BrowserType.Chrome ? (zoom: number, docEl: Element, devRatio: number): number => {
  let ver = Build.MinCVer < BrowserVer.MinASameZoomOfDocElAsdevPixRatioWorksAgain
      && (!(Build.BTypes & ~BrowserType.Chrome) || VOther & BrowserType.Chrome) ? chromeVer_ as BrowserVer : 0,
  rectWidth: number, viewportWidth: number,
  style: CSSStyleDeclaration | false | undefined
  if (BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl !== BrowserVer.MinEnsured$visualViewport$) {
    console.log("Assert error: MinDevicePixelRatioImplyZoomOfDocEl should be equal with MinEnsured$visualViewport$")
  }
  isDocZoomStrange_ = 0
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
                && !notSafe_not_ff_!(docEl) && (style = (docEl as ElementToHTMLorOtherFormatted).style)
                && style.zoom && style.zoom
            || (isDocZoomStrange_ = 1, zoom !== _getPageZoom_cr!(zoom, devRatio, docEl))))
      ? zoom : 1
} : 0 as never as null

let _getPageZoom_cr = Build.BTypes & BrowserType.Chrome ? function (devRatio: number
    , docElZoom: number, _testEl: Element | null): number {
  // only detect once, so that its cost is not too big
  let iframe: HTMLIFrameElement = createElement_("iframe"),
  pageZoom: number | null | undefined, doc: Document | null
  try {
    /** `_testEl` must not start with /[\w.]*doc/: {@link ../Gulpfile.js#beforeUglify} */
    iframe.appendChild.call(_testEl, iframe)
    _testEl = (doc = iframe.contentDocument) && doc.documentElement
    pageZoom = _testEl && +getComputedStyle_(_testEl).zoom
  } catch {}
  iframe.remove()
  _getPageZoom_cr = (zoom2, ratio2) => pageZoom ? ratio2 / devRatio * pageZoom : zoom2
  return pageZoom || docElZoom
} as (devRatio: number, docElZoom: number, docEl: Element) => number : 0 as never as null

/**
 * also update docZoom_
 * update bZoom_ if target
 */
export const getZoom_ = Build.BTypes & ~BrowserType.Firefox ? function (target?: 1 | Element): void {
  let docEl = docEl_unsafe_()!, ratio = wndSize_(2)
    , gcs = getComputedStyle_, st = gcs(docEl), zoom = +st.zoom || 1
    , el: Element | null = fullscreenEl_unsafe_()
  Build.BTypes & BrowserType.Chrome && (zoom = _fixDocZoom_cr!(zoom, docEl, ratio))
  if (target) {
    const body = el ? null : doc.body
    // if fullscreen and there's nested "contain" styles,
    // then it's a whole mess and nothing can be ensured to be right
    bZoom_ = body && (target === 1 || IsInDOM_(target, body)) && +gcs(body).zoom || 1
  }
  for (; el && el !== docEl;
      el = GetParent_unsafe_(el, Build.MinCVer < BrowserVer.MinSlotIsNotDisplayContents
            && Build.BTypes & BrowserType.Chrome && chromeVer_ < BrowserVer.MinSlotIsNotDisplayContents
          ? PNType.RevealSlotAndGotoParent : PNType.RevealSlot)) {
    zoom *= +gcs(el).zoom || 1
  }
  paintBox_ = null; // it's not so necessary to get a new paintBox here
  docZoom_ = zoom
  wdZoom_ = Math.round(zoom * (ratio < 1 ? ratio : 1) * 1000) / 1000
} : function (): void {
  paintBox_ = null
  docZoom_ = bZoom_ = 1
  /** the min() is required in {@link ../front/vomnibar.ts#Vomnibar_.activateO_ } */
  wdZoom_ = Math.min(wndSize_(2), 1)
} as never

export const getViewBox_ = function (needBox?: 1 | 2): ViewBox | ViewOffset {
  const ratio = wndSize_(2), M = Math, round = M.round
  let iw = wndSize_(1), ih = wndSize_(), ratio2 = ratio < 1 ? ratio : 1
  if (fullscreenEl_unsafe_()) {
    getZoom_(1)
    dScale_ = bScale_ = 1
    ratio2 = wdZoom_ / ratio2
    return [0, 0, (iw / ratio2) | 0, (ih / ratio2) | 0, 0]
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
  Build.BTypes & BrowserType.Chrome && (zoom = _fixDocZoom_cr!(zoom, box, ratio))
  wdZoom_ = round(zoom * ratio2 * 1000) / 1000
  docZoom_ = Build.BTypes & ~BrowserType.Firefox ? zoom : 1
  let x = !stacking ? float(st.marginLeft)
        : !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
        ? -float(st.borderLeftWidth) : 0 | -box.clientLeft
    , y = !stacking ? float(st.marginTop)
        : !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
        ? -float(st.borderTopWidth ) : 0 | -box.clientTop
    , ltScale = Build.BTypes & BrowserType.Chrome ? needBox === 2 ? 1 : scale : 1
  x = x * (Build.BTypes & BrowserType.Chrome ? ltScale : scale) - rect.l
  y = y * (Build.BTypes & BrowserType.Chrome ? ltScale : scale) - rect.t
  // note: `Math.abs(y) < 0.01` supports almost all `0.01 * N` (except .01, .26, .51, .76)
  x = x * x < 1e-4 ? 0 : M.ceil(round(x / zoom2 * 100) / 100)
  y = y * y < 1e-4 ? 0 : M.ceil(round(y / zoom2 * 100) / 100)
  if (Build.BTypes & ~BrowserType.Firefox) {
    iw /= zoom, ih /= zoom
  }
  let mw = iw, mh = ih
  if (containHasPaint) { // ignore the area on the block's left
    iw = rect.r, ih = rect.b
  }
  paintBox_ = containHasPaint ? [iw - float(st.borderRightWidth ) * scale,
                                     ih - float(st.borderBottomWidth) * scale] : null
  if (!needBox) { return [x, y]; }
  // here rect.right is not accurate because <html> may be smaller than <body>
  const sEl = scrollingEl_(),
  xScrollable = st.overflowX !== HDN && st2.overflowX !== HDN,
  yScrollable = st.overflowY !== HDN && st2.overflowY !== HDN
  if (xScrollable) {
    mw += 64 * zoom2
    iw = containHasPaint ? iw : sEl && (dimSize_(sEl, kDim.scrollW) - scrollX) / zoom
          || M.max((iw - GlobalConsts.MaxScrollbarWidth) / zoom, rect.r)
  }
  if (yScrollable) {
    mh += 20 * zoom2
    ih = containHasPaint ? ih : sEl && (dimSize_(sEl, kDim.scrollH) - scrollY) / zoom
          || M.max((ih - GlobalConsts.MaxScrollbarWidth) / zoom, rect.b)
  }
  iw = iw < mw ? iw : mw, ih = ih < mh ? ih : mh
  iw = (iw / zoom2) | 0, ih = (ih / zoom2) | 0
  return [x, y, iw, yScrollable ? ih - GlobalConsts.MaxHeightOfLinkHintMarker : ih, xScrollable ? iw : 0]
} as {
  (needBox: 1 | 2): ViewBox
  (): ViewOffset
}

export const isNotInViewport = function (this: void, element: Element | null, rect?: Rect): VisibilityType {
  if (!rect) {
    rect = padClientRect_(getBoundingClientRect_(element!))
  }
  return rect.b - rect.t < 1 || rect.r - rect.l < 1 ? VisibilityType.NoSpace
      : rect.b <= 0 || rect.t >= wndSize_() || rect.r <= 0 || rect.l >= wndSize_(1)
      ? VisibilityType.OutOfView : VisibilityType.Visible
} as {
  (element: Element): VisibilityType
  (element: null, rect: Rect): VisibilityType
}

export const selRange_ = ((sel: Selection, ensured?: 1): Range | null =>
  ensured || sel.rangeCount ? sel.getRangeAt(0) : null
) as {
  (sel: Selection, ensured: 1): Range
  (sel: Selection): Range | null
}

export const getSelectionBoundingBox_ = (sel: Selection): ClientRect => selRange_(sel, 1).getBoundingClientRect()

export const view_ = (el: Element, oldY?: number): boolean => {
  let rect = padClientRect_(getBoundingClientRect_(el)), secondScroll: number,
  ty = isNotInViewport(null, rect)
  if (ty === VisibilityType.OutOfView) {
    let ih = wndSize_(), delta = rect.t < 0 ? -1 : rect.t > ih ? 1 : 0, f = oldY != null,
    elHeight = rect.b - rect.t
    Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && Build.BTypes & BrowserType.Chrome
    ? scrollIntoView_(el, delta < 0) : scrollIntoView_(el);
    if (f) {
      secondScroll = elHeight < ih ? oldY! - scrollY : 0
      // required range of wanted: delta > 0 ? [-limit, 0] : [0, limit]
      f = delta * secondScroll <= 0 && delta * secondScroll >= elHeight - ih
    }
    (delta || f) && scrollWndBy_(0, f ? secondScroll! * secondScroll! < 4 ? 0 : secondScroll! : delta * ih / 5)
  }
  return ty === VisibilityType.Visible
}

export const scrollWndBy_ = (left: number, top: number): void => {
  !(Build.BTypes & ~BrowserType.Firefox) ||
  !(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior ||
  ElementProto().scrollBy ? scrollBy({behavior: "instant", left, top}) : scrollBy(left, top)
}

export const center_ = (rect: Rect | null): Point2D => {
  let zoom = Build.BTypes & ~BrowserType.Firefox ? docZoom_ * bZoom_ / 2 : 0.5
  rect = rect && cropRectToVisible_(rect.l, rect.t, rect.r, rect.b) || rect
  return rect ? [((rect.l + rect.r) * zoom) | 0, ((rect.t + rect.b) * zoom) | 0] : [0, 0]
}

/** still return `true` if `paddings <= 4px` */
export const isContaining_ = (a: Rect, b: Rect): boolean => {
  return b.b - 5 < a.b && b.r - 5 < a.r && b.t > a.t - 5 && b.l > a.l - 5
}

export const padClientRect_ = function (rect: ClientRect, padding?: number): WritableRect {
  const x = rect.left, y = rect.top, max = Math.max
  padding = x || y ? padding || 0 : 0
  return {l: x | 0, t: y | 0, r: (x + max(rect.width, padding)) | 0, b: (y + max(rect.height, padding)) | 0}
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
      : getVisibleClientRect_(element)
  if (crop) {
    arr = getCroppedRect_(element, arr)
  }
  return arr
}

export const setBoundary_ = (style: CSSStyleDeclaration, r: WritableRect, allow_abs?: boolean): boolean | undefined => {
  const need_abs = allow_abs && (r.t < 0 || r.l < 0 || r.b > wndSize_() || r.r > wndSize_(1)),
  P = "px", arr: ViewOffset | false | undefined = need_abs && getViewBox_()
  if (arr) {
    r.l += arr[0], r.r += arr[0], r.t += arr[1], r.b += arr[1]
  }
  style.left = r.l + P, style.top = r.t + P
  style.width = (r.r - r.l) + P, style.height = (r.b - r.t) + P
  return need_abs
}

export let cropRectToVisible_: (left: number, top: number, right: number, bottom: number) => Rect | null = null as never

export const SubtractSequence_ = function (this: {l: Rect[]; t: Rect}, rect1: Rect): void { // rect1 - rect2
  let rect2 = this.t, a = this.l, x1: number, x2: number
    , y1 = rect1.t > rect2.t ? rect1.t : rect2.t, y2 = rect1.b < rect2.b ? rect1.b : rect2.b
  if (y1 >= y2 || ((x1 = rect1.l > rect2.l ? rect1.l : rect2.l) >= (x2 = rect1.r < rect2.r ? rect1.r : rect2.r))) {
    a.push(rect1)
    return
  }
  // 1 2 3
  // 4   5
  // 6 7 8
  const x0 = rect1.l, x3 = rect1.r, y0 = rect1.t, y3 = rect1.b
  x0 < x1 && a.push({l: x0, t: y0, r: x1, b: y3}); // (1)4(6)
  y0 < y1 && a.push({l: x1, t: y0, r: x3, b: y1}); // 2(3)
  y2 < y3 && a.push({l: x1, t: y2, r: x3, b: y3}); // 7(8)
  x2 < x3 && a.push({l: x2, t: y1, r: x3, b: y2}); // 5
}
