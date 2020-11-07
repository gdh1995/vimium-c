import {
  setupEventListener, isTop, keydownEvents_, VOther, timeout_, fgCache, doc, isAlive_, isJSUrl, chromeVer_, VTr, deref_,
  vApi, Stop_, createRegExp, isTY, OBJECT_TYPES
} from "../lib/utils"
import { prevent_ } from "../lib/keyboard_utils"
import {
  createElement_, attachShadow_, NONE, fullscreenEl_unsafe_, docEl_unsafe_, getComputedStyle_, set_docSelectable_,
  GetParent_unsafe_, getSelection_, ElementProto, GetChildNodes_not_ff, GetShadowRoot_, getEditableType_, htmlTag_,
  notSafe_not_ff_, CLK, frameElement_, runJS_, isStyleVisible_, rangeCount_, getAccessibleSelectedNode, removeEl_s,
  appendNode_s, append_not_ff, setClassName_s, isNode_, INP, contains_s, setOrRemoveAttr_s, selOffset_, textContent_s
} from "../lib/dom_utils"
import {
  bZoom_, dScale_, getZoom_, wdZoom_, getSelectionBoundingBox_, prepareCrop_, getClientRectsForAreas_,
  getVisibleClientRect_, getBoundingClientRect_, padClientRect_, isContaining_, cropRectToVisible_, getCroppedRect_,
  setBoundary_, wndSize_, dimSize_, selRange_,
} from "../lib/rect"
import { currentScrolling } from "./scroller"
import { styleSelectable } from "./mode_find"
import { isHintsActive, hintManager, coreHints } from "./link_hints"
import { post_ } from "./port"
import { insert_Lock_ } from "./insert"
import { hide as omniHide } from "./omni"

export declare const enum kExitOnClick {
  NONE = 0, REMOVE = 8, helpDialog = 1, vomnibar = 2,
}

let box_: HTMLDivElement & SafeHTMLElement | null = null
let styleIn_: HTMLStyleElement | string | null = null
let root_: VUIRoot = null as never
let cssPatch_: [string, (css: string) => string] | null = null
let lastFlashEl: SafeHTMLElement | null = null
let _toExitOnClick = kExitOnClick.NONE
let flashTime = 0;
let curModalElement: HTMLDialogElement | null | undefined
let hideHelp: ((event?: EventToPrevent) => void) | undefined | null

export { box_ as ui_box, root_ as ui_root, styleIn_ as style_ui, lastFlashEl, curModalElement, hideHelp }
export const removeModal = Build.BTypes & BrowserType.ChromeOrFirefox ? (): void => {
  curModalElement && removeEl_s(curModalElement), curModalElement = null
} : (): void => {}
export function set_hideHelp (_newHide: typeof hideHelp) { hideHelp = _newHide }

export let addUIElement = function (element: HTMLElement, adjust_type?: AdjustType): void {
    box_ = createElement_("div");
    root_ = attachShadow_(box_);
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
      && !(Build.BTypes & ~BrowserType.ChromeOrFirefox) ||
    Build.BTypes & ~BrowserType.Edge && root_.mode === "closed" ||
    setupEventListener(
      !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
      || Build.BTypes & ~BrowserType.Edge && root_ !== box_
      ? root_ as ShadowRoot : 0, "load",
    function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!isAlive_) { setupEventListener(0, "load", Onload, 1); return; } // safe enough even if reloaded
      const t = e.target as HTMLElement | Document;
      if (GetParent_unsafe_(t, PNType.DirectNode) === root_) {
        Stop_(e); t.onload && (t as HTMLElement).onload(e);
      }
    }, 0, 1); // should use a listener in active mode: https://www.chromestatus.com/features/5745543795965952
    addUIElement = (element2: HTMLElement, adjust2?: AdjustType, before?: Element | null | true): void => {
      const doesAdjustFirst = (!(Build.BTypes & ~BrowserType.Edge)
          || Build.BTypes & BrowserType.Edge && VOther === BrowserType.Edge || Build.BTypes & BrowserType.Chrome
          && Build.MinCVer < BrowserVer.Min$Node$$isConnected && chromeVer_ < BrowserVer.Min$Node$$isConnected
          ? GetParent_unsafe_(box_!, PNType.DirectNode) : box_!.isConnected!) && element2 !== curModalElement
      adjust2 && doesAdjustFirst && adjustUI()
      root_.insertBefore(element2, before === true ? root_.firstChild : before || null)
      adjust2 && !doesAdjustFirst && adjustUI()
    };
    setUICSS = ((innerCSS): void => {
      if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) &&
          (!(Build.BTypes & ~BrowserType.Edge) || box_ === root_)) {
        box_!.id = "VimiumUI"
      }
      const S = "style" as const
      styleIn_ = createElement_(S)
      setUICSS = (css): void => {
        createStyle(cssPatch_ ? cssPatch_[1](css) : css, styleIn_ as HTMLStyleElement)
      };
      setUICSS(innerCSS)
      appendNode_s(root_, styleIn_)
      /**
       * Note: Tests on C35, 38, 41, 44, 47, 50, 53, 57, 60, 63, 67, 71, 72 confirmed
       *        that el.sheet has been valid when promise.then, even on XML pages.
       * `AdjustType.NotAdjust` must be used before a certain, clear normal adjusting
       */
      // enforce webkit to build the style attribute node, and then we can remove it totally
      box_!.hasAttribute(S) && setOrRemoveAttr_s(box_!, S)
      if (adjust_type) {
        adjustUI()
      }
    });
    appendNode_s(root_, element)
    if (styleIn_) {
      setUICSS(styleIn_ as Exclude<typeof styleIn_, Element | null | undefined | "">)
    } else {
      box_.style.display = NONE
      if (adjust_type! > AdjustType.MustAdjust - 1) {
        adjustUI()
      }
      post_({ H: kFgReq.css });
    }
} as (element: HTMLElement, adjust: AdjustType, before?: Element | null | true) => void

export const getBoxTagName_cr_ = Build.BTypes & BrowserType.Chrome ? function (): "div" {
  return (!(Build.BTypes & ~BrowserType.Chrome) || VOther & BrowserType.Chrome)
        && (Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1 || chromeVer_ > BrowserVer.MinEnsuredShadowDOMV1 - 1)
        && matchMedia(VTr(kTip.highContrast_WOB)).matches ? "body" as never as "div" : "div"
} : 0 as never

export const addElementList = function <T extends boolean | BOOL> (
      array: readonly HintsNS.BaseHintItem[], offset: ViewOffset, dialogContainer?: T
      ): (T extends true | 1 ? HTMLDialogElement : HTMLDivElement) & SafeElement {
    const parent = createElement_(Build.BTypes & BrowserType.ChromeOrFirefox && dialogContainer ? "dialog"
        : Build.BTypes & BrowserType.Chrome ? getBoxTagName_cr_() :  "div");
    let cls = `R HM${Build.BTypes & BrowserType.ChromeOrFirefox && dialogContainer ? " DHM" : ""}${fgCache.d}`
    let innerBox: HTMLDivElement | HTMLDialogElement | undefined = parent
    setClassName_s(parent, cls)
    if (Build.BTypes & BrowserType.Chrome && dialogContainer && array.length && getBoxTagName_cr_() < "d") { // <body>
      innerBox = createElement_(getBoxTagName_cr_())
      appendNode_s(parent, innerBox)
      setClassName_s(innerBox, cls)
    }
    if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment
          && Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend) {
      (Build.BTypes &BrowserType.Chrome ? innerBox : parent).append!(...array.map(el => el.m))
    } else {
      for (const el of array) {
        appendNode_s(Build.BTypes &BrowserType.Chrome ? innerBox : parent, el.m)
      }
    }
    const style = parent.style,
    zoom = bZoom_ / (Build.BTypes & BrowserType.ChromeOrFirefox && dialogContainer ? 1 : dScale_),
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
    if (Build.BTypes & BrowserType.ChromeOrFirefox && dialogContainer) {
      curModalElement = parent as HTMLDialogElement
    }
    addUIElement(parent, AdjustType.DEFAULT, lastFlashEl)
    return parent as (T extends true | 1 ? HTMLDialogElement : HTMLDivElement) & SafeElement
}

export const adjustUI = (event?: Event | /* enable */ 1 | /* disable */ 2): void => {
    // Before Firefox 64, the mozFullscreenChangeEvent.target is document
    // so here should only use `fullscreenEl_unsafe_`
    const el: Element | null = fullscreenEl_unsafe_(),
    disableUI = event === 2,
    el2 = el && !contains_s(root_, el) && !contains_s(box_!, el) ? el : docEl_unsafe_()!
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    disableUI ? removeEl_s(box_!) : el2 !== box_!.parentNode &&
    (Build.BTypes & ~BrowserType.Firefox ? append_not_ff : appendNode_s as typeof append_not_ff)(el2, box_!)
    const sin = styleIn_, s = sin && (sin as HTMLStyleElement).sheet
    s && (s.disabled = false);
    !(Build.BTypes & BrowserType.ChromeOrFirefox) || disableUI ||
    curModalElement && !curModalElement.open && curModalElement.showModal()
    if (el || event) {
      const removeEL = !el || disableUI, FS = "fullscreenchange";
      if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)) {
        setupEventListener(0, "webkit" + /*#__NOINLINE__*/ FS, adjustUI, removeEL)
      } else if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox) {
        setupEventListener(0, "moz" + /*#__NOINLINE__*/ FS, adjustUI, removeEL)
      }
      if (!(Build.BTypes & BrowserType.Chrome)
          || chromeVer_ > BrowserVer.MinMaybe$Document$$fullscreenElement - 1) {
        setupEventListener(0, /*#__NOINLINE__*/ FS, adjustUI, removeEL)
      }
      if (isHintsActive && removeEL) { // not need to check isAlive_
        hintManager || timeout_(coreHints.x, 17)
      }
    }
}

export const ensureBorder = Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor
      || Build.BTypes & ~BrowserType.Chrome ? (zoom?: number): void => {
    if (Build.BTypes & BrowserType.Chrome && chromeVer_ > BrowserVer.MinBorderWidth$Ensure1$Or$Floor -1
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)) {
      return
    }
    zoom || (getZoom_(), zoom = wdZoom_);
    if (!cssPatch_ && zoom >= 1) { return; }
    let width = ("" + (
        Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        && chromeVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        ? 1.01 : 0.51) / zoom).slice(0, 5);
    if (!cssPatch_) {
      cssPatch_ = ["", (css) => css.replace(createRegExp(kTip.css0d5px, "g"), VTr(kTip.css0d5Patch, cssPatch_![0]))]
    }
    if (cssPatch_[0] === width) { return; }
    cssPatch_[0] = width;
    (vApi.l as typeof learnCSS)(styleIn_, 1)
} : ((): void => {}) as never

export const createStyle = (text: string, css?: HTMLStyleElement): HTMLStyleElement => {
    css = css || createElement_("style");
    css.type = "text/css";
    textContent_s(css, text)
    return css;
}

export let setUICSS = (innerCSS: string): void => { styleIn_ = innerCSS }

export const learnCSS = (srcStyleIn: typeof styleIn_, force?: 1): void => {
    if (Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor || Build.BTypes & ~BrowserType.Chrome
        ? !styleIn_ || force : !styleIn_) {
      const
      css = srcStyleIn && (isTY(srcStyleIn) ? srcStyleIn : textContent_s(srcStyleIn))
      if (css) {
        setUICSS(css)
        if (Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor || Build.BTypes & ~BrowserType.Chrome) {
          force || post_({H: kFgReq.learnCSS})
        }
      }
    }
}

export const checkDocSelectable = (): void => {
    let sout: HTMLStyleElement | null | HTMLBodyElement | HTMLFrameSetElement = styleSelectable
      , gcs = getComputedStyle_, st: CSSStyleDeclaration
      , mayTrue = !sout || !GetParent_unsafe_(sout, PNType.DirectNode)
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

export const getSelectionOf = (node: DocumentOrShadowRootMixin): Selection | null => node.getSelection!()

export const getSelected = (notExpectCount?: {r?: ShadowRoot | null}): Selection => {
  let el: Node | null | undefined, sel: Selection | null
  let sr: ShadowRoot | null = null
  if (el = deref_(currentScrolling)) {
      if (Build.MinCVer >= BrowserVer.Min$Node$$getRootNode && !(Build.BTypes & BrowserType.Edge)
          || !(Build.BTypes & ~BrowserType.Firefox)
          || el.getRootNode) {
        el = el.getRootNode!();
      } else {
        for (let pn: Node | null; pn = GetParent_unsafe_(el, PNType.DirectNode); el = pn) { /* empty */ }
      }
      if (el !== doc && isNode_(el, kNode.DOCUMENT_FRAGMENT_NODE)
          && isTY((el as ShadowRoot).getSelection, kTY.func)) {
        sel = getSelectionOf(el as ShadowRoot);
        if (sel && (notExpectCount || rangeCount_(sel))) {
          sr = el as ShadowRoot
        }
      }
  }
  if (!sr) {
    sel = getSelection_();
    let offset: number, sel2: Selection | null = sel
    if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          && chromeVer_ < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          ? Build.MinCVer >= BrowserVer.MinShadowDOMV0 || ElementProto().webkitCreateShadowRoot
          : typeof ShadowRoot == OBJECT_TYPES[kTY.func])) {
    while (sel2) {
      sel2 = null;
      el = getAccessibleSelectedNode(sel)
      if (el && el === getAccessibleSelectedNode(sel, 1) && (offset = selOffset_(sel)) === selOffset_(sel, 1)) {
        if ((el as NodeToElement).tagName) {
          el = (Build.BTypes & ~BrowserType.Firefox ? GetChildNodes_not_ff!(el as Element)
              : el.childNodes as NodeList)[offset]
          if (el && (el as NodeToElement).tagName && (sr = GetShadowRoot_(el as Element))) {
            if (!(Build.BTypes & ~BrowserType.Chrome) ? (sel2 = getSelectionOf(sr))
                : sr.getSelection && (sel2 = getSelectionOf(sr))) {
              sel = sel2!;
            } else {
              sr = null;
            }
          }
        }
      }
    }
    }
  }
  notExpectCount && (notExpectCount.r = sr)
  return sel!
}

/** return HTMLElement if there's only Firefox */
export const getSelectionParent_unsafe = ((sel: Selection, re?: RegExpG & RegExpSearchable<0>): Element | null | 0 => {
    let range = selRange_(sel)
      , selected: string | undefined, match: RegExpExecArray | null, result = 0
      , par: Node | null = range && range.commonAncestorContainer, lastPar = par!
    while (par && !(par as NodeToElement).tagName) {
      par = Build.BTypes & ~BrowserType.Firefox ? GetParent_unsafe_(par, PNType.DirectNode)
            : par.parentNode as Exclude<Node["parentNode"], Window | RadioNodeList | HTMLCollection>;
    }
    // now par is Element or null, and may be a <form> / <frameset>
    if (re && par && range && !range.collapsed && (selected = range + "")) {
      if (isNode_(lastPar, kNode.TEXT_NODE) && lastPar.data.trim().length <= selected.length) {
        let text: HTMLElement["innerText"] | undefined
        while (par && (text = (par as TypeToAssert<Element, HTMLElement, "innerText">).innerText,
                        !(Build.BTypes & ~BrowserType.Firefox) || isTY(text))
            && selected.length >= (text as string).length) {
          par = GetParent_unsafe_(lastPar = par as HTMLElement, PNType.DirectElement)
        }
      }
      const left = range.cloneRange(), right = range.cloneRange()
      left.collapse(!0), right.collapse(!1)
      left.setStart(par || lastPar, 0), right.setEndAfter(par || lastPar)
      const prefix = left + "", wanted = prefix.length, total = prefix + selected + right
      result = 1
      for (re.lastIndex = 0; (match = re.exec(total)) && (result = match.index - wanted) < 0; ) { /* empty */ }
    }
    return result ? 0 : par !== docEl_unsafe_() ? par as Element | null : null
}) as {
  (sel: Selection, re: RegExpG): Element | null | 0
  (sel: Selection, re?: undefined): Element | null
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

export const removeSelection = function (root?: VUIRoot & Pick<DocumentOrShadowRoot, "getSelection">): boolean {
    const sel = (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        ? root : root && root.getSelection) ? getSelectionOf(root as ShadowRoot) : getSelection_()
    const ret = sel && sel.type === "Range" && getAccessibleSelectedNode(sel)
    ret && collpaseSelection(sel!)
    return !!ret
} as (root?: VUIRoot) => boolean

export const resetSelectionToDocStart = function (sel?: Selection, range?: Range | null): void {
    (sel || getSelection_()).removeAllRanges();
    range && sel!.addRange(range)
} as {
  (sel: Selection, range?: Range | null): void;
  (): void;
}

export const selectAllOfNode = (node: Node) => { getSelection_().selectAllChildren(node) }

export const moveSel_s = (element: LockableElement, action: SelectActions | undefined): void => {
    const elTag = htmlTag_(element), type = elTag === "textarea" ? EditableType.TextBox
        : elTag === INP ? EditableType.input_
        : element.isContentEditable ? EditableType.rich_
        : EditableType.Default;
    if (type === EditableType.Default) { return; }
    const isBox = type === EditableType.TextBox || type === EditableType.rich_
        && textContent_s(element).includes("\n"),
    lineAllAndBoxEnd = action === "all-input" || action === "all-line",
    gotoStart = action === "start",
    gotoEnd = !action || action === "end" || isBox && lineAllAndBoxEnd;
    if (isBox && gotoEnd && dimSize_(element, kDim.elClientH) + 12 < dimSize_(element, kDim.scrollH)) {
      return;
    }
    // not need `this.getSelection_()`
    try {
      if (type === EditableType.rich_) {
        selectAllOfNode(element)
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
      (gotoEnd || gotoStart) && collpaseSelection(getSelection_(), <BOOL> +gotoEnd)
    } catch {}
}

export const collpaseSelection = (sel: Selection, toEnd?: VisualModeNS.ForwardDir | boolean): void => {
  toEnd ? sel.collapseToEnd() : sel.collapseToStart()
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
    const flashEl = createElement_(Build.BTypes & BrowserType.Chrome ? getBoxTagName_cr_() : "div"),
    nfs = !fullscreenEl_unsafe_()
    setClassName_s(flashEl, "R Flash" + (classNames || "") + (setBoundary_(flashEl.style, rect, nfs) ? " AbsF" : ""))
    Build.BTypes & ~BrowserType.Firefox &&
    bZoom_ !== 1 && nfs && (flashEl.style.zoom = "" + bZoom_);
    addUIElement(flashEl, AdjustType.DEFAULT)
    lastFlashEl = flashEl
    if (!Build.NDEBUG) {
      lifeTime = lifeTime === -1 ? - 1 : Math.max(lifeTime || 0, flashTime! | 0)
    }
    const remove = (): void => {
      lastFlashEl === flashEl && (lastFlashEl = null)
      removeEl_s(flashEl)
    };
    lifeTime === -1 || timeout_(remove, (lifeTime || GlobalConsts.DefaultRectFlashTime) * (1 + +fgCache.m))
    return remove;
} as {
    (el: null, rect: Rect, lifeTime?: number, classNames?: string): () => void;
    (el: Element, rect?: null, lifeTime?: number, classNames?: string): (() => void) | void;
}

  /** key: 1 := help dialog; 2 := vomnibar; -1: remove for help dialog; -2: remove for vomnibar */
export const setupExitOnClick = (key: kExitOnClick): void => {
  key = key & kExitOnClick.REMOVE ? _toExitOnClick & ~key : _toExitOnClick | key
  key !== _toExitOnClick && setupEventListener(0, CLK, doExitOnClick, !(_toExitOnClick = key), 1)
}

const doExitOnClick = (event?: MouseEventToPrevent): void => {
  if (event) {
      if (// simulated events generated by page code
          (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !event.isTrusted : event.isTrusted === false)
          // simulated events generated by browser code
          || !(event as MouseEvent).detail && !(event as MouseEvent).clientY
          // Vimium C has been disabled
          || !GetParent_unsafe_(box_!, PNType.DirectNode)
          // the click target is in Vimium C's UI
          || ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
              && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
              && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
              ? event.target === box_
              : !(event.target instanceof Element) || contains_s(root_, event.target))
          ) {
        return;
      }
  }
  event && prevent_(event)
  _toExitOnClick & kExitOnClick.helpDialog && hideHelp!()
  _toExitOnClick & kExitOnClick.vomnibar && omniHide()
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
  if (Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox ? !frameElement_() : !frameElement) {
    // in Firefox, not use the cached version of frameElement - for less exceptions in the below code
    return;
  }
  // Note: the functionality below should keep the same even if the cached version is used - for easier debugging
  const core = getWndVApi_ff!(parent as Window);
  if ((!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox) && core) {
    /** the case of injector is handled in {@link ./injected_end.ts} */
    getParentVApi = () => core;
  }
  return core;
} : () => (parent as Window).VApi

export function set_getParentVApi (_newGetParVApi: () => VApiTy | null | void): void { getParentVApi = _newGetParVApi }

export const evalIfOK = (url: Pick<BgReq[kBgReq.eval], "u"> | string): boolean => {
  isTY(url) ? 0 : url = url.u
  if (!isJSUrl(url)) {
    return false;
  }
  let str = url.slice(11).trim();
  let el: HTMLScriptElement | undefined
  if (createRegExp(kTip.voidJS, "").test(str)) { /* empty */ }
  else if (!GetParent_unsafe_((el = runJS_(VTr(kTip.removeCurScript), 0)!), PNType.DirectNode)) {
    try { str = decodeURIComponent(str); } catch {}
    timeout_(runJS_.bind(0, str, null), 0)
  } else {
    removeEl_s(el)
    post_({ H: kFgReq.evalJSFallback, u: url })
  }
  return true;
}

export const checkHidden = (cmd?: FgCmdAcrossFrames, count?: number, options?: OptionsWithForce): BOOL => {
  if (isTop) { return 0 }
  // here should not use the cache frameElement, because `getComputedStyle(frameElement).***` might break
  const curFrameElement = !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox
      && VOther === BrowserType.Firefox ? frameElement : frameElement_(),
  el = curFrameElement || docEl_unsafe_();
  if (!el && wndSize_() > 3 && wndSize_(1) > 3) { return 0; }
  let box = el && padClientRect_(getBoundingClientRect_(el)),
  parEvents: ReturnType<typeof getParentVApi> | undefined,
  result: boolean | BOOL = !box || box.b <= box.t && box.r <= box.l || !isStyleVisible_(el!)
  if (cmd) {
    // if in a forced cross-origin env (by setting doc.domain),
    // then par.self.innerHeight works, but this behavior is undocumented,
    // so here only use `parApi.innerHeight_()` in case
    if ((Build.BTypes & BrowserType.Firefox ? curFrameElement && (parEvents = getParentVApi()) : curFrameElement)
        && (result || box!.b <= 0
            || (Build.BTypes & BrowserType.Firefox && parEvents !== parent
                  ? box!.t > parEvents!.i!() : box!.t > (parent as Window).innerHeight))) {
      Build.BTypes & BrowserType.Firefox || (parEvents = getParentVApi());
      if (parEvents
          && !parEvents.a(keydownEvents_)) {
        parEvents.f(cmd, options!, count!, 1);
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

if (!(Build.NDEBUG || kTip.INJECTED_CONTENT_END < kTip.extendClick)) {
  alert("Assert error: kTip.INJECTED_CONTENT_END < kTip.extendClick")
}
