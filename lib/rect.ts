import {
  isTY, OnSafari,
  doc, chromeVer_, Lower, max_, min_, math, OnChrome, OnFirefox, WithDialog, evenHidden_, set_evenHidden_, OnEdge, abs_
} from "./utils"
import {
  docEl_unsafe_, scrollingEl_, isSafeEl_, ElementProto_not_ff, isRawStyleVisible, getComputedStyle_, NONE,
  querySelector_unsafe_, querySelectorAll_unsafe_, GetParent_unsafe_, HDN, createElement_, fullscreenEl_unsafe_,
  IsAInB_, scrollIntoView_, rangeCount_, removeEl_s, append_not_ff, htmlTag_, getRootNode_mounted
} from "./dom_utils"

export declare const enum kInvisibility { Visible = 0, OutOfView = 1, NotInFullscreen = 2, NoSpace = 3 }
export type Point2D = readonly [ left: number, top: number ]
export type ViewBox = readonly [ left: number, top: number, width: number, height: number, maxLeft: number ]
export type ViewOffset = readonly [ left: number, top: number ] | ViewBox

let paintBox_: [number, number] | null = null // it may need to use `paintBox[] / <body>.zoom`
let wdZoom_ = 1 // <html>.zoom * min(devicePixelRatio, 1) := related to physical pixels
let docZoom_ = 1 // zoom of <html>
let bZoom_ = 1 // zoom of <body> (if not fullscreen else 1)
let isDocZoomStrange_old_cr: BOOL = 0
let dScale_ = 1 // <html>.transform:scale (ignore the case of sx != sy)
let bScale_ = 1 // <body>.transform:scale (ignore the case of sx != sy)
let vright: number, vbottom: number, vbottoms: number, vleft: number, vtop: number, vtops: number
let scrollingTop: SafeElement | null = null

export {
  paintBox_, wdZoom_, docZoom_, isDocZoomStrange_old_cr, dScale_, bScale_, bZoom_, scrollingTop, vright as viewportRight
}
export function set_bZoom_ (_newBZoom: number): void { bZoom_ = _newBZoom }
export function set_scrollingTop (newScrollingTop: SafeElement | null): void { scrollingTop = newScrollingTop }

export const wndSize_ = (id?: 0 | 1 | 2): number => id ? id < 2 ? innerWidth : devicePixelRatio : innerHeight as number

/** if `el` is null, then return viewSize for `kDim.scrollSize` */
export const dimSize_ = (el: SafeElement | null, index: kDim | ScrollByY): number => {
  const kEnsuredVV = OnChrome && Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$ || OnSafari
      || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsured$visualViewport$
  let visual: VisualViewport | undefined, byY = (index & kDim.byY) as BOOL;
  return el && (el !== scrollingTop || index > kDim.elClientW - 1 && index < kDim.positionX)
      ? index < kDim.scrollW ? byY ? el.clientHeight : el.clientWidth
        : index < kDim.scPosX ? byY ? el.scrollHeight : el.scrollWidth
        : byY ? el.scrollTop : el.scrollLeft
      : index - byY !== kDim.scPosX
        && (kEnsuredVV || (visual = OnFirefox ? (window as {} as typeof globalThis).visualViewport : visualViewport,
            OnChrome ? visual && visual.width : visual))
      ? (kEnsuredVV && (visual = visualViewport),
         index > kDim.positionX - 1 ? byY ? visual!.pageTop : visual!.pageLeft : byY ? visual!.height : visual!.width!)
      : index > kDim.scPosX - 1 ? index > kDim.positionX && el ? dimSize_(el, kDim.scPosX+byY) : byY ? scrollY : scrollX
      : wndSize_((1 - byY) as BOOL)
}

/** depends on .docZoom_, .bZoom_, .paintBox_ */
export let prepareCrop_ = (inVisualViewport?: 1, limited?: Rect | null): number | void => {
    const fz = !OnFirefox ? docZoom_ * bZoom_ : 1,
    visual = inVisualViewport && (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsured$visualViewport$
                                  ? (window as {} as typeof globalThis).visualViewport : visualViewport)
    let i: number, j: number, el: Element | null, docEl: Document["documentElement"]
    vleft = vtop = 0
    if (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$visualViewport$ ? visual : visual && visual.width) {
      vleft = visual!.offsetLeft | 0, vtop = visual!.offsetTop | 0
      i = vleft + visual!.width! | 0; j = vtop + visual!.height | 0
    }
    else if (docEl = docEl_unsafe_(),
        el = !OnChrome || Build.MinCVer >= BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled
            ? scrollingEl_() : doc.compatMode === "BackCompat" ? doc.body : docEl,
        OnChrome && Build.MinCVer < BrowserVer.MinScrollTopLeftInteropIsAlwaysEnabled
          ? el && isSafeEl_(el) : el) {
      i = dimSize_(el as SafeElement, kDim.elClientW), j = dimSize_(el as SafeElement, kDim.elClientH)
    } else {
      i = wndSize_(1), j = wndSize_()
      if (!docEl) { return vbottom = j, vbottoms = j - 8, vright = i; }
      // the below is not reliable but safe enough, even when docEl is unsafe
      type SafeE = SafeElement
      i = min_(max_(i - GlobalConsts.MaxScrollbarWidth, (dimSize_(docEl as SafeE, kDim.elClientW) * docZoom_) | 0), i)
      j = min_(max_(j - GlobalConsts.MaxScrollbarWidth, (dimSize_(docEl as SafeE, kDim.elClientH) * docZoom_) | 0), j)
    }
    if (paintBox_) {
      i = min_(i, paintBox_[0] * docZoom_), j = min_(j, paintBox_[1] * docZoom_)
    }
    vright = (i / fz) | 0, vbottom = (j / fz) | 0
    if (limited) {
      vleft = max_(vleft, limited.l | 0)
      vtop = max_(vtop, limited.t | 0)
      vright = min_(vright, limited.r | 0)
      vbottom = min_(vbottom, limited.b | 0)
    }
    vtops = vtop + 3
    vbottoms = (vbottom - 8 / fz) | 0
}

export const cropRectToVisible_ = (left: number, top: number, right: number, bottom: number): Rect | null => {
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
}

export const setupPageLevelCrops = (newPageBox: ViewBox): void => {
  vleft = -scrollX, vtop = vtops = -scrollY, vright = newPageBox[2], vbottom = vbottoms = max_(newPageBox[3], vbottom)
}

export const cropRectS_ = (rect: Rect): Rect | null => cropRectToVisible_(rect.l, rect.t, rect.r, rect.b)

export let getBoundingClientRect_: (el: Element) => ClientRect = !OnFirefox ? el => {
  type ClientRectGetter = (this: Element) => ClientRect
  const func = ElementProto_not_ff!.getBoundingClientRect as ClientRectGetter
  getBoundingClientRect_ = func.call.bind<(this: ClientRectGetter, self: Element) => ClientRect>(func)
  return getBoundingClientRect_(el)
} : el => el.getBoundingClientRect()

export const getVisibleClientRect_ = OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
? (element: SafeElement, el_style?: CSSStyleDeclaration | null): Rect | null => {
  let cr: Rect | null, I: "inline" | undefined, useChild: boolean, isInline: boolean | undefined, str: string
  const arr = element.getClientRects()
  for (let i = 0; i < arr.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
    const rect = arr[i]
    if (rect.height > 0 && rect.width > 0) {
      if (cr = cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)) {
        return isRawStyleVisible(el_style || getComputedStyle_(element))
            || (evenHidden_ & kHidden.VisibilityHidden) ? cr : null
      }
      continue
    }
    // according to https://dom.spec.whatwg.org/#dom-parentnode-children
    // .children will always be a HTMLCollection even if element is a non-HTML element
    if (I) { continue }
    I = "inline"
    const children = element.children
    for (let j = 0; j < children.length; j++) { // eslint-disable-line @typescript-eslint/prefer-for-of
      const el2 = children[j], st = getComputedStyle_(el2)
      if (useChild = st.float !== NONE || ((str = st.position) !== "static" && str !== "relative")) { /* empty */ }
      else if (rect.height === 0) {
        if (isInline == null) {
          el_style || (el_style = getComputedStyle_(element))
          isInline = (el_style.fontSize === "0px" || el_style.lineHeight === "0px")
            && el_style.display.startsWith(I)
        }
        useChild = isInline && st.display.startsWith(I)
      }
      if (useChild && isSafeEl_(el2) && (cr = getVisibleClientRect_(el2, st))) {
        return cr
      }
    }
  }
  return null
}
: (element: SafeElement, el_style?: CSSStyleDeclaration | null): Rect | null => {
  let cr: Rect | null, I: "inline" | undefined, useChild: boolean, isInline: boolean | undefined, str: string
  for (const rect of <ClientRect[]> <{[i: number]: ClientRect}> element.getClientRects()) {
    if (rect.height > 0 && rect.width > 0) {
      if (cr = cropRectToVisible_(rect.left, rect.top, rect.right, rect.bottom)) {
        return isRawStyleVisible(el_style || getComputedStyle_(element))
            || (evenHidden_ & kHidden.VisibilityHidden) ? cr : null
      }
      continue
    }
    if (I) { continue }
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
      if (useChild && isSafeEl_(el2) && (cr = getVisibleClientRect_(el2, st))) {
        return cr
      }
    }
  }
  return null
}

export const getClientRectsForAreas_ = function (element: HTMLElementUsingMap, output: Hint[]
    , areas?: NodeListOf<HTMLAreaElement | NonHTMLButFormattedElement> | HTMLAreaElement[]): Rect | null {
  let diff: number, x1: number, x2: number, y1: number, y2: number, rect: Rect | null | undefined
  const cr = boundingRect_(element), crWidth = cr.r - cr.l, crHeight = cr.b - cr.t
  if (crHeight < 3 || crWidth < 3) { return null }
  // replace is necessary: chrome allows "&quot;", and also allows no "#"
  if (!areas) {
    const selector = `map[name="${OnEdge || OnChrome && Build.MinCVer < BrowserVer.Min$CSS$$escape
      ? element.useMap.replace(<RegExpOne> /^#/, "").replace(<RegExpG> /"|\\/g, "\\$&")
      : CSS.escape!(element.useMap.replace(<RegExpOne> /^#/, ""))}"]`
    // on C73, if a <map> is moved outside from a #shadowRoot, then the relation of the <img> and it is kept
    // while on F65 the relation will get lost.
    const root = getRootNode_mounted(element as SafeHTMLElement as SafeElement as EnsuredMountedElement & SafeElement)
    const map = querySelector_unsafe_(selector, root)
    if (!map || !htmlTag_<1>(map)) { return null }
    areas = querySelectorAll_unsafe_("area", map) as NodeListOf<HTMLAreaElement | NonHTMLButFormattedElement>
  }
  const toInt = (a: string): number => (a as string | number as number) | 0
  for (let _i = 0, _len = areas.length; _i < _len; _i++) {
    const area = areas[_i]
    if (!htmlTag_<1>(area)) { continue }
    let coords = area.coords.split(",").map(toInt)
    switch (Lower(area.shape)) {
    case "circle": case "circ": // note: "circ" is non-conforming
      x2 = coords[0]; y2 = coords[1]; diff = coords[2] / math.sqrt(2)
      x1 = x2 - diff; x2 += diff; y1 = y2 - diff; y2 += diff
      diff = 3
      break
    case "default": x1 = y1 = diff = 0, x2 = crWidth, y2 = crHeight; break
    case "poly": case "polygon": // note: "polygon" is non-conforming
      y1 = coords[0], y2 = coords[2], diff = coords[4]
      x1 = min_(y1, y2, diff); x2 = max_(y1, y2, diff)
      y1 = coords[1], y2 = coords[3], diff = coords[5]
      y1 = min_(y1, y2, diff); y2 = max_(coords[1], y2, diff)
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
} as (element: HTMLElementUsingMap, output: Hint[], areas?: HTMLAreaElement[]) => Rect | null

export const getIFrameRect = (element: SafeElement): Rect | null => {
  const oldEvenHidden = evenHidden_, rect = (set_evenHidden_(kHidden.None), getVisibleClientRect_(element))
  set_evenHidden_(oldEvenHidden)
  return rect
}

export const getCroppedRect_ = function (el: Element, crect: Rect | null): Rect | null {
  let parent: Element | null = el, prect: Rect | null | undefined, i: number = crect ? 3 : 0
  while (0 < i-- && (parent = GetParent_unsafe_(parent, PNType.RevealSlotAndGotoParent))) {
    const st = getComputedStyle_(parent), overflow = st.overflow
    if (overflow === HDN || overflow === "clip") {
      prect = getVisibleBoundingRect_(parent)
      crect = prect && isContaining_(crect!, prect) ? prect : crect
    }
  }
  return crect
} as {
  (el: Element, crect: Rect): Rect
  (el: Element, crect: Rect | null): Rect | null
}

const _fixDocZoom_old_cr = OnChrome && Build.MinCVer < BrowserVer.MinDevicePixelRatioNotImplyZoomOfDocEl
    ? (zoom: number, docEl: Element, devRatio: number): number => {
  let rectWidth: number, viewportWidth: number, style: CSSStyleDeclaration | false | undefined;
  if (!(BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl >= BrowserVer.MinEnsured$visualViewport$)) {
    console.log("Assert error: MinDevicePixelRatioImplyZoomOfDocEl should be >= MinEnsured$visualViewport$")
  }
  isDocZoomStrange_old_cr = 0
  return zoom === 1 || chromeVer_ >= BrowserVer.MinDevicePixelRatioNotImplyZoomOfDocEl
      || Build.MinCVer < BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl
          && chromeVer_ < BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl
      || (rectWidth = getBoundingClientRect_(docEl).width,
          viewportWidth = visualViewport!.width!,
          abs_(rectWidth - viewportWidth) > 1e-3
          && (abs_(rectWidth * zoom - viewportWidth) < 0.01
            || (Build.MinCVer >= BrowserVer.MinASameZoomOfDocElAsdevPixRatioWorksAgain
                  || chromeVer_ > BrowserVer.MinASameZoomOfDocElAsdevPixRatioWorksAgain - 1)
                && isSafeEl_(docEl) && (style = (docEl as ElementToHTMLOrForeign).style)
                && style.zoom
            || (isDocZoomStrange_old_cr = 1, abs_(zoom - _getPageZoom_old_cr!(zoom, devRatio, docEl)))) > 1e-3)
      ? zoom : 1
} : 0 as never as null

let _getPageZoom_old_cr = OnChrome && Build.MinCVer < BrowserVer.MinDevicePixelRatioNotImplyZoomOfDocEl
    ? function (docElZoom: number, devRatio: number, _testEl: Element | null): number {
  // only detect once, so that its cost is not too big
  let iframe: HTMLIFrameElement = createElement_("iframe"),
  pageZoom: number | null | undefined, doc1: Document | null
  try {
    append_not_ff(_testEl!, iframe)
    _testEl = (doc1 = iframe.contentDocument) && doc1.documentElement
    pageZoom = _testEl && +getComputedStyle_(_testEl).zoom
  } catch {}
  removeEl_s(iframe)
  _getPageZoom_old_cr = (zoom2, ratio2) => pageZoom ? ratio2 / devRatio * pageZoom : zoom2
  return pageZoom || docElZoom
} as (docElZoom: number, devRatio: number, docEl: Element) => number : 0 as never as null

const elZoom_ = (st: CSSStyleDeclaration): number => st && st.display !== NONE && +st.zoom || 1

/**
 * also update docZoom_
 * update bZoom_ if target
 */
export const getZoom_ = !OnFirefox ? function (target?: 1 | SafeElement): void {
  let docEl = docEl_unsafe_()!, ratio = wndSize_(2)
    , st = getComputedStyle_(docEl), zoom = +st.zoom || 1
    , el: Element | null = fullscreenEl_unsafe_()
  OnChrome && Build.MinCVer < BrowserVer.MinDevicePixelRatioNotImplyZoomOfDocEl
      && (zoom = _fixDocZoom_old_cr!(zoom, docEl, ratio))
  if (target) {
    const body = el ? null : doc.body
    // if fullscreen and there's nested "contain" styles,
    // then it's a whole mess and nothing can be ensured to be right
    bZoom_ = body && (target === 1 || IsAInB_(target, body)) ? elZoom_(getComputedStyle_(body)) : 1
  }
  for (; el && el !== docEl;
      el = GetParent_unsafe_(el, OnChrome && Build.MinCVer < BrowserVer.MinSlotIsNotDisplayContents
            && chromeVer_ < BrowserVer.MinSlotIsNotDisplayContents
          ? PNType.RevealSlotAndGotoParent : PNType.RevealSlot)) {
    zoom *= elZoom_(getComputedStyle_(el))
  }
  paintBox_ = null; // it's not so necessary to get a new paintBox here
  docZoom_ = zoom
  wdZoom_ = math.round(zoom * min_(ratio, 1) * 1000) / 1000
} : function (): void {
  paintBox_ = null
  wdZoom_ = min_(wndSize_(2), 1)
} as never

export const getViewBox_ = function (needBox?: 1 | /** dialog-or-popover-found */ 3): ViewBox | ViewOffset {
  const ratio = wndSize_(2), round = math.round, float = parseFloat,
  box = docEl_unsafe_()!, st = getComputedStyle_(box),
  box2 = doc.body, st2 = box2 ? getComputedStyle_(box2) : st,
  zoom2 = !OnFirefox ? bZoom_ = elZoom_(st2) : 1,
  docContain = OnChrome && Build.MinCVer < BrowserVer.MinEnsuredCSSEnableContain
      || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredCSSEnableContain ? st.contain || "" : st.contain!,
  // bodyNotPropagateOut = OnChrome && docContain !== "none",
  kM = "matrix(1,",
  paintingLimited = (<RegExpOne> /c|p/).test(docContain),
  notPropagate = OnChrome && (Build.MinCVer >= BrowserVer.MinNotPropagateBodyStyleIfContained
      || chromeVer_ > BrowserVer.MinNotPropagateBodyStyleIfContained - 1) && (<RegExpOne> /s|t/).test(docContain),
  // NOTE: if box.zoom > 1, although doc.documentElement.scrollHeight is integer,
  //   its real rect may has a float width, such as 471.333 / 472
  rect = boundingRect_(box),
  zoom = OnChrome && Build.MinCVer < BrowserVer.MinDevicePixelRatioNotImplyZoomOfDocEl
      ? _fixDocZoom_old_cr!(+st.zoom || 1, box, ratio) : !OnFirefox && +st.zoom || 1
  let iw = wndSize_(1), ih = wndSize_(), _trans = st.transform
  // ignore the case that x != y in "transform: scale(x, y)""
  const scale = dScale_ = _trans && !_trans.startsWith(kM) && float(_trans.slice(7)) || 1
  const stacking = !(WithDialog && needBox === 3) && (st.position !== "static" || (OnChrome
      && Build.MinCVer < BrowserVer.MinContainLayoutOnDocAffectPositions
      && chromeVer_ < BrowserVer.MinContainLayoutOnDocAffectPositions ? paintingLimited
      : (<RegExpOne> /a|c/).test(docContain)) || _trans !== NONE)
  if (fullscreenEl_unsafe_()) {
    getZoom_(1)
    dScale_ = bScale_ = 1
    return [0, 0, OnFirefox ? iw : (iw * docZoom_ / wdZoom_) | 0, OnFirefox ? ih : (ih * docZoom_ / wdZoom_) | 0, 0]
  }
  bScale_ = box2 && (_trans = st2.transform) && !_trans.startsWith(kM) && float(_trans.slice(7)) || 1
  wdZoom_ = OnFirefox ? min_(ratio, 1) : round(zoom * min_(ratio, 1) * 1000) / 1000
  if (!OnFirefox) { docZoom_ = zoom }
  let x = !stacking ? float(st.marginLeft) : OnFirefox ? -float(st.borderLeftWidth) : 0 | -box.clientLeft
    , y = !stacking ? float(st.marginTop ) : OnFirefox ? -float(st.borderTopWidth ) : 0 | -box.clientTop
  const ltScale = WithDialog && needBox === 3 ? 1 : scale
  x = x * ltScale - rect.l
  y = y * ltScale - rect.t
  // note: `Math.abs(y) < 0.01` supports almost all `0.01 * N` (except .01, .26, .51, .76)
  x = x * x < 1e-4 ? 0 : math.ceil(round(x / zoom2 * 100) / 100)
  y = y * y < 1e-4 ? 0 : math.ceil(round(y / zoom2 * 100) / 100)
  if (!OnFirefox) {
    iw /= zoom, ih /= zoom
  }
  let mw = iw, mh = ih
  // ignore the area on the block's left
  paintBox_ = paintingLimited ? [(iw = rect.r) - float(st.borderRightWidth ) * scale,
                                 (ih = rect.b) - float(st.borderBottomWidth) * scale] : null
  if (!needBox) { return [x, y]; }
  // here rect.right is not accurate because <html> may be smaller than <body>
  const sEl = scrollingEl_(), nonScrollableRe = <RegExpOne> /hidden|clip/,
  xScrollable = !nonScrollableRe.test("" + st.overflowX + (notPropagate ? "" : st2.overflowX)),
  yScrollable = !nonScrollableRe.test("" + st.overflowY + (notPropagate ? "" : st2.overflowY))
  if (xScrollable) {
    mw += 64 * zoom2
    iw = paintingLimited ? iw : sEl && (dimSize_(sEl, kDim.scrollW) - scrollX) / zoom
        || max_(iw - GlobalConsts.MaxScrollbarWidth / zoom, rect.r)
  }
  if (yScrollable) {
    mh += 20 * zoom2
    ih = paintingLimited ? ih : sEl && (dimSize_(sEl, kDim.scrollH) - scrollY) / zoom
        || max_(ih - GlobalConsts.MaxScrollbarWidth / zoom, rect.b)
  }
  iw = iw < mw ? iw : mw, ih = ih < mh ? ih : mh
  iw = (iw / zoom2) | 0, ih = (ih / zoom2) | 0
  if (Build.BTypes === BrowserType.Chrome as number&&Build.MinCVer >= BrowserVer.MinAbsolutePositionNotCauseScrollbar) {
    return [x, y, iw, yScrollable ? ih - GlobalConsts.MaxHeightOfLinkHintMarker : ih] as unknown as ViewBox
  }
  return [x, y, iw, yScrollable ? ih - GlobalConsts.MaxHeightOfLinkHintMarker : ih, xScrollable ? iw : 0]
} as {
  (needBox: 1 | 3): ViewBox
  (): ViewOffset
}

export const isNotInViewport = (element: SafeElement, rect?: Rect): kInvisibility => {
  let fs: Element | null
  rect = rect || boundingRect_(element!)
  return rect.b - rect.t < 1 || rect.r - rect.l < 1 ? kInvisibility.NoSpace
      : (fs = fullscreenEl_unsafe_()) && !IsAInB_(element, fs) ? kInvisibility.NotInFullscreen
      : rect.b <= 0 || rect.t >= wndSize_() || rect.r <= 0 || rect.l >= wndSize_(1)
      ? kInvisibility.OutOfView : kInvisibility.Visible
}

export const isSelARange = (sel: Selection): boolean => sel.type === "Range"

export const selRange_ = ((sel: Selection, ensured?: 1): Range | null =>
  ensured || rangeCount_(sel) ? sel.getRangeAt(0) : null
) as {
  (sel: Selection, ensured: 1): Range
  (sel: Selection, ensured?: BOOL | undefined): Range | null
}

export const isSelMultiline = (sel: Selection): boolean => {
  const rects = !(sel+"").slice(0,-1).includes("\n") && rangeCount_(sel) && selRange_(sel)!.getClientRects()
  if (rects && rects.length > 1) {
    const first = padClientRect_(rects[0])
    for (let i = 1; i < rects.length; i++) {
      const next = padClientRect_(rects[i]), cy = (next.t + next.b) / 2
      if (cy > first.b || cy < first.t) { // ignore rotation - no wayt to detect it
        return true
      }
    }
  }
  return rects === !1
}

export const view_ = (el: SafeElement, allowSmooth?: BOOL | boolean, oldY?: number): kInvisibility => {
  let rect = boundingRect_(el), secondScroll: number,
  ty = isNotInViewport(el, rect)
  if (ty === kInvisibility.OutOfView) {
    let ih = wndSize_(), sign = rect.t < 0 ? -1 : rect.t > ih ? 1 : 0, f = oldY != null,
    elHeight = rect.b - rect.t
    const kBh = "scroll-behavior"
    const top = OnChrome && Build.MinCVer < BrowserVer.Min$ScrollBehavior$$Instant$InScrollIntoView
        && chromeVer_ < BrowserVer.Min$ScrollBehavior$$Instant$InScrollIntoView
        && !allowSmooth && (Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions
        || chromeVer_ > BrowserVer.MinScrollIntoViewOptions - 1) && scrollingEl_(1)
    const style = top && getComputedStyle_(top)[kBh as "scrollBehavior"] === "smooth"
        && (top as TypeToPick<Element, HTMLElement, "style">).style
    const oldCss = style && style.cssText
    if (style) { style.setProperty(kBh, "auto", "important") }
    OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
        ? scrollIntoView_(el, !allowSmooth, sign < 0) : scrollIntoView_(el, !allowSmooth)
    const stillNotInView = !OnEdge && isNotInViewport(el)
    if (!stillNotInView && f) {
      secondScroll = elHeight < ih ? oldY! - scrollY : 0
      // required range of wanted: delta > 0 ? [-limit, 0] : [0, limit]
      f = sign * secondScroll <= 0 && sign * secondScroll >= elHeight - ih
    }
    stillNotInView ||
    (sign || f) && scrollWndBy_(0, f ? secondScroll! * secondScroll! < 4 ? 0 : secondScroll! : sign * ih / 5)
    if (style) { style.cssText = oldCss as string }
  }
  return ty
}

export const instantScOpt = (x: number, y: number): ScrollToOptions =>
    ({behavior: "instant", left: x, top: y})

export const scrollWndBy_ = (x: number, y: number): void => {
  !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior
      || ElementProto_not_ff!.scrollBy as unknown
  ) ? scrollBy(instantScOpt(x, y)) : scrollBy(x, y)
}

export const center_ = (rect: Rect | null, xy: HintsNS.StdXY | null | undefined): Point2D => {
  let zoom = !OnFirefox ? docZoom_ * bZoom_ / (xy ? 1 : 2) : xy ? 1 : 0.5
  let n = xy ? xy.n - 1 ? xy.n * xy.s : 0.5 : 0
  let x = xy ? isTY(xy.x) ? n : xy.x : 0, y = xy ? isTY(xy.y) ? n : xy.y : 0
  rect = rect && cropRectS_(rect) || rect
  x = !rect ? 0 : !xy ? rect.l + rect.r
      : max_(rect.l, min_((x < 0 ? rect.r : rect.l) + (x * x > 1 ? x : (rect.r - rect.l) * x), rect.r - 1))
  y = !rect ? 0 : !xy ? rect.t + rect.b
      : max_(rect.t, min_((y < 0 ? rect.b : rect.t) + (y * y > 1 ? y : (rect.b - rect.t) * y), rect.b - 1))
  return [(x * zoom) | 0, (y * zoom) | 0]
}

/** still return `true` if `paddings <= 4px` */
export const isContaining_ = (a: Rect, b: Rect): boolean => {
  return b.b - 5 < a.b && b.r - 5 < a.r && b.t > a.t - 5 && b.l > a.l - 5
}

export const padClientRect_ = (rect: ClientRect, padding?: number): Rect => {
  const x = rect.left, y = rect.top, w = rect.width, h = rect.height
  padding = w || h ? padding! | 0 : 0
  return {l: x | 0, t: y | 0, r: (x + max_(w, padding)) | 0, b: (y + max_(h, padding)) | 0}
}

export const boundingRect_ = (element: Element): Rect => padClientRect_(getBoundingClientRect_(element), 0)

export const getVisibleBoundingRect_ = (element: Element, crop?: BOOL, st?: CSSStyleDeclaration): Rect | null => {
  let zoom = !OnFirefox && (st || crop) && +(st || getComputedStyle_(element)).zoom || 1,
  rect = boundingRect_(element),
  arr: Rect | null = !OnFirefox
      ? cropRectToVisible_(rect.l * zoom, rect.t * zoom, rect.r * zoom, rect.b * zoom)
      : cropRectS_(rect)
  if (crop) {
    arr = getCroppedRect_(element, arr)
  }
  return arr
}

export const setBoundary_ = (style: CSSStyleDeclaration, r: Rect
    , allowAbs?: BOOL | 2 | 3, arr?: ViewOffset, minSize?: 8): boolean => {
  let top: SafeElement | null
  const need_abs = allowAbs === 1
      ? (r.t < 0 || r.l < 0 || r.b > wndSize_() || r.r > wndSize_(1))
        && (arr = arr || getViewBox_(), top = scrollingEl_(1),
            arr[1] + r.b < dimSize_(top, kDim.scrollH) && arr[0] + r.r < dimSize_(top, kDim.scrollW))
      : !!allowAbs,
  P = "px"
  style.left = r.l + (need_abs ? arr![0] : 0) + P
  style.top = r.t + (need_abs ? arr![1] : 0) + P
  style.width = max_(minSize! | 0, r.r - r.l) + P, style.height = max_(minSize! | 0, r.b - r.t) + P
  return need_abs
}
