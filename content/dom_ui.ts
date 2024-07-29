import {
  setupEventListener, isTop, keydownEvents_, timeout_, fgCache, doc, isAlive_, isJSUrl, chromeVer_, VTr, OnEdge, Stop_,
  vApi, createRegExp, isTY, OBJECT_TYPES, OnChrome, OnFirefox, WithDialog, isAsContent, safeCall, max_,isIFrameInAbout_,
  firefoxVer_
} from "../lib/utils"
import { prevent_ } from "../lib/keyboard_utils"
import {
  createElement_, attachShadow_, NONE, fullscreenEl_unsafe_, docEl_unsafe_, getComputedStyle_, set_docSelectable_, kDir,
  GetParent_unsafe_, getSelection_, TryGetShadowRoot_, getEditableType_, textOffset_, derefInDoc_, supportInert_,
  CLK, frameElement_, runJS_, isStyleVisible_, rangeCount_, getAccessibleSelectedNode, removeEl_s, htmlTag_, hasTag_,
  appendNode_s, append_not_ff, setClassName_s, isNode_, contains_s, setOrRemoveAttr_s, textContent_s, inputSelRange,
  parentNode_unsafe_s, setDisplaying_s, getRootNode_mounted, singleSelectionElement_unsafe, isHTML_, HTMLElementProto,
  getDirectionOfNormalSelection,
  uneditableInputs_
} from "../lib/dom_utils"
import {
  bZoom_, dScale_, getZoom_, wdZoom_, boundingRect_, prepareCrop_, getClientRectsForAreas_, getVisibleBoundingRect_,
  getVisibleClientRect_, getBoundingClientRect_, padClientRect_, isContaining_, cropRectS_, getCroppedRect_,
  setBoundary_, wndSize_, dimSize_, selRange_, isSelARange, ViewOffset
} from "../lib/rect"
import { currentScrolling } from "./scroller"
import { find_box, styleSelectable } from "./mode_find"
import { DrawableHintItem, isHintsActive, hintManager, reinitLinkHintsIn, isHC_ } from "./link_hints"
import { post_, runFallbackKey } from "./port"
import { insert_Lock_, raw_insert_lock } from "./insert"
import { isWaitingAccessKey, resetAnyClickHandler_cr } from "./key_handler"
import { hide as omniHide, omni_box, omni_dialog_non_ff, omni_status, postToOmni, Status as OmniStatus } from "./omni"
import { getPreferredRectOfAnchor } from "./local_links"
import { showPicker_ } from "./async_dispatcher"

export declare const enum kExitOnClick { // eslint-disable-next-line @typescript-eslint/no-shadow
  NONE = 0, REMOVE = 8, helpDialog = 1, vomnibar = 2,
}

let box_: HTMLDivElement & SafeHTMLElement | null = null
let styleIn_: HTMLStyleElement | string | null = null
let root_: VUIRoot = null as never
let uiParent_: VUIRoot | HTMLSpanElement
let cssPatch_: [string | number, (css: string) => string] | null = null
let lastFlashEl: SafeHTMLElement | null = null
let toExitOnClick_ = kExitOnClick.NONE
let curModalElement: HTMLDialogElement | HTMLDivElement | null | undefined
let helpBox: HTMLElement | null | undefined
let hideHelp: ((event?: EventToPrevent) => void) | undefined | null
let hasPopover_ = 0

export {
  box_ as ui_box, root_ as ui_root, styleIn_ as style_ui, lastFlashEl, curModalElement, hasPopover_, helpBox, hideHelp,
  toExitOnClick_,
}
export function set_hideHelp (_newHide: typeof hideHelp): void { hideHelp = _newHide }
export function set_helpBox (_newHelpBox: typeof helpBox): void { helpBox = _newHelpBox }

export const removeModal = WithDialog ? (): void => {
  curModalElement && (removeEl_s(curModalElement), curModalElement = null, hasPopover_ &= ~1)
} : (): void => { /* empty */ }

export let addUIElement = function (element: HTMLElement, adjust_type?: AdjustType): void {
    box_ = createElement_("div");
    root_ = attachShadow_(box_)
    // listen "load" so that safer if shadowRoot is open
    // it doesn't matter to check `.mode == "closed"`, but not `.attachShadow`
    OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
        || (!Build.NDEBUG ? !OnEdge && root_.mode === "closed"
            : OnChrome ? chromeVer_ > BrowserVer.MinEnsuredShadowDOMV1 - 1
            : OnFirefox ? firefoxVer_ > BrowserVer.MinEnsuredShadowDOMV1 - 1 : !OnEdge)
    ? appendNode_s(root_, uiParent_ = createElement_("span"))
    : (uiParent_ = root_,
        setupEventListener(OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0 || !OnEdge && root_ !== box_
            ? root_ as ShadowRoot : 0, "load", function Onload(this: ShadowRoot | Window, e: Event): void {
      if (!isAlive_) { setupEventListener(0, "load", Onload, 1); return; } // safe enough even if reloaded
      const t = e.target as HTMLElement | Document;
      if (t === omni_box || t === find_box) {
        Stop_(e); t.onload && t.onload(e)
      }
    }, 0, 1)) // should use a listener in active mode: https://www.chromestatus.com/features/5745543795965952
    addUIElement = (element2: HTMLElement, adjust2?: AdjustType, before?: Element | null | true): void => {
      const doesAdjustFirst = (OnEdge
          || OnChrome && Build.MinCVer < BrowserVer.Min$Node$$isConnected
              && chromeVer_ < BrowserVer.Min$Node$$isConnected
          ? parentNode_unsafe_s(box_!) : box_!.isConnected!) && element2 !== curModalElement
      adjust2 && doesAdjustFirst && adjustUI()
      uiParent_.insertBefore(element2, before === true ? uiParent_.firstChild : before || null)
      adjust2 && !doesAdjustFirst && adjustUI()
    };
    setUICSS = (innerCSS): void => {
      if (OnEdge || (OnChrome && Build.MinCVer < BrowserVer.MinShadowDOMV0
            || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredShadowDOMV1) && (root_ === box_)) {
        box_!.id = "VimiumUI"
      }
      const S = "style" as const
      styleIn_ = createElement_(S)
      setUICSS = (css): void => {
        createStyle(cssPatch_ ? cssPatch_[1](css) : css, styleIn_ as HTMLStyleElement)
      }
      setUICSS(innerCSS)
      appendNode_s(uiParent_, styleIn_)
      /**
       * Note: Tests on C35, 38, 41, 44, 47, 50, 53, 57, 60, 63, 67, 71, 72 confirmed
       *        that el.sheet has been valid when promise.then, even on XML pages.
       * `AdjustType.NotAdjust` must be used before a certain, clear normal adjusting
       */
      // enforce webkit to build the style attribute node, and then we can remove it totally
      box_!.hasAttribute(S) && setOrRemoveAttr_s(box_!, S)
      if (adjust_type) {
        adjustUI()
        adjust_type = AdjustType.DEFAULT // erase info about what's a first command
      }
    }
    appendNode_s(uiParent_, element)
    if (styleIn_) {
      setUICSS(styleIn_ as Exclude<typeof styleIn_, Element | null | undefined | "">)
    } else {
      setDisplaying_s(box_)
      adjust_type! > AdjustType.MustAdjust - 1 && adjustUI()
      post_({ H: kFgReq.css });
    }
} as (element: HTMLElement, adjust: AdjustType, before?: Element | null | true) => void

export const getBoxTagName_old_cr = OnChrome && Build.MinCVer < BrowserVer.MinForcedColorsMode ? (): "div" | "body" =>
    chromeVer_ < BrowserVer.MinForcedColorsMode
        && (Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1 || chromeVer_ > BrowserVer.MinEnsuredShadowDOMV1 - 1)
        && (isHC_ != null ? isHC_ : matchMedia(VTr(kTip.highContrast_WOB)).matches)
        ? "body" : "div"
  : 0 as never

export const addElementList = function <TopType extends BOOL | 3> (
      array: readonly DrawableHintItem[], offset: { readonly [index in 0 | 1]: number }, onTop?: TopType
      ): (TopType extends 1 | 3 ? HTMLDialogElement | HTMLDivElement : HTMLDivElement) & SafeElement {
    const kMaxSlice = 2048, needToSlice = array.length > kMaxSlice
    const useDialog = onTop && !(array.length && (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredPopover
        || !OnEdge && (HTMLElementProto! satisfies HTMLElement as Partial<PopoverElement>).showPopover))
    const parent = createElement_(WithDialog && useDialog ? "dialog"
        : OnChrome && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div");
    const style = parent.style
    const cls = "R HM" + fgCache.d, zoom = bZoom_ / (WithDialog && onTop ? 1 : dScale_)
    let innerBox: HTMLDivElement | HTMLBodyElement | HTMLDialogElement | undefined = parent
    let i = 0
    setClassName_s(parent, WithDialog && useDialog ? cls + " DLG" : cls)
    if (OnChrome && Build.MinCVer < BrowserVer.MinForcedColorsMode
        && WithDialog && useDialog && array.length && getBoxTagName_old_cr() < "d") { // <body>
      innerBox = createElement_(getBoxTagName_old_cr())
      appendNode_s(parent, innerBox)
      setClassName_s(innerBox, cls)
    }
    if ((!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
        || chromeVer_ > BrowserVer.MinEnsured$ParentNode$$appendAndPrepend - 1)) {
      for (; i < array.length; i += kMaxSlice) {
        var slice = (needToSlice ? array.slice(i, i + kMaxSlice) : array).map(el => el.m) // eslint-disable-line no-var
        !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment
        ? innerBox.append!(...slice) : innerBox.append!.apply(innerBox, slice)
      }
    } else {
      for (const el of array) {
        appendNode_s(innerBox, el.m)
      }
    }
    const left = offset[0] + "px", top = offset[1] + "px"
    if (OnFirefox && zoom - 1) {
      style.cssText = `left:0;top:0;transform:scale(${zoom})translate(${left},${top})`;
    } else {
      style.left = left; style.top = top;
      zoom - 1 && (style.zoom = zoom as number | string as string);
    }
    fullscreenEl_unsafe_() && (style.position = "fixed");
    if (WithDialog && onTop) {
      curModalElement = parent as HTMLDialogElement
      hasPopover_ |= !(useDialog satisfies boolean | 0 | undefined) as boolean | BOOL as BOOL
    }
    addUIElement(parent, AdjustType.DEFAULT, lastFlashEl)
    return parent as (TopType extends 1 | 3 ? HTMLDialogElement : HTMLDivElement) & SafeElement
}

export const adjustUI = (event?: Event | /* enable */ 1 | /* disable */ 2): void => {
    // Before Firefox 64, the mozFullscreenChangeEvent.target is document
    // so here should only use `fullscreenEl_unsafe_`
    const el: Element | null = fullscreenEl_unsafe_(),
    disableUI = event === 2,
    // https://developer.mozilla.org/en-US/docs/Web/CSS/Replaced_element
    isReplacedEl = el && createRegExp(kTip.ReplacedHtmlTags, "").test(htmlTag_(el)),
    el2 = el && !isReplacedEl && !root_.contains(el) && !contains_s(box_!, el) ? el : docEl_unsafe_()!
    // Chrome also always remove node from its parent since 58 (just like Firefox), which meets the specification
    // doc: https://dom.spec.whatwg.org/#dom-node-appendchild
    //  -> #concept-node-append -> #concept-node-pre-insert -> #concept-node-adopt -> step 2
    disableUI ? removeEl_s(box_!) : el2 === parentNode_unsafe_s(box_!)
        && (!box_!.nextElementSibling || omni_box && omni_status > OmniStatus.Inactive || curModalElement) ||
    (OnFirefox ? (appendNode_s as typeof append_not_ff) : append_not_ff)(el2, box_!)
    const sin = styleIn_, s = sin && (sin as HTMLStyleElement).sheet
    s && (s.disabled = false);
    if (WithDialog) {
      if (disableUI) { /* empty */ }
      else if (hasPopover_ || isReplacedEl && (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredPopover
          || (uiParent_ as PopoverElement).showPopover)) {
        (uiParent_ as PopoverElement).popover = "manual"
        setClassName_s(uiParent_ as SafeHTMLElement, "PO")
        ; (uiParent_ as PopoverElement).togglePopover(false)
        ; (uiParent_ as PopoverElement).showPopover()
      } else if ((uiParent_ as PopoverElement).popover) {
        (uiParent_ as PopoverElement).popover = null
        setClassName_s(uiParent_ as SafeHTMLElement, "")
      } else if (curModalElement) {
        // if box_ has been re-added, then `.open` is true and `.showModal()` throws without a `.close()`
        (curModalElement as HTMLDialogElement).open && (curModalElement as HTMLDialogElement).close();
        (curModalElement as HTMLDialogElement).showModal()
      }
    }
    if (el || event) {
      const removeEL = !el || disableUI, FS = "fullscreenchange";
      if (OnChrome) {
        setupEventListener(0, "webkit" + /*#__NOINLINE__*/ FS, adjustUI, removeEL)
      } else if (OnFirefox) {
        setupEventListener(0, "moz" + /*#__NOINLINE__*/ FS, adjustUI, removeEL)
      }
      if (!OnChrome || chromeVer_ > BrowserVer.MinMaybe$Document$$fullscreenElement - 1) {
        setupEventListener(0, /*#__NOINLINE__*/ FS, adjustUI, removeEL)
      }
      if (isHintsActive && removeEL) { // not need to check isAlive_
        hintManager || reinitLinkHintsIn(GlobalConsts.MinCancelableInBackupTimer)
      }
    }
}

export const ensureBorder = (zoom?: number): void => {
    const dPR = max_(wndSize_(2), 1)
    zoom = (zoom || (getZoom_(), wdZoom_)) * dPR
    if (!cssPatch_) {
      if (zoom >= 1 ? zoom < 2
          : OnChrome && (Build.MinCVer >= BrowserVer.MinBorderWidth$Ensure1$Or$Floor
              || chromeVer_ > BrowserVer.MinBorderWidth$Ensure1$Or$Floor - 1)) {
        return
      }
    }
    let width = zoom >= 2 && zoom <= 4 ? 1
      : zoom < 2 && OnChrome && (Build.MinCVer >= BrowserVer.MinBorderWidth$Ensure1$Or$Floor
          || chromeVer_ > BrowserVer.MinBorderWidth$Ensure1$Or$Floor - 1) ? 0.01
      : ("" + (zoom > 4 ? 4 : OnChrome && Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        && chromeVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
        ? 1.01 * dPR : 0.51) / zoom).slice(0, 5);
    if (!cssPatch_) {
      cssPatch_ = [0, css => css.replace(createRegExp(kTip.css0d01OrDPI, "g"), "/*!DPI*/" + cssPatch_![0])]
    }
    if (cssPatch_[0] === width) { return; }
    cssPatch_[0] = width;
    (vApi.l as typeof learnCSS)(styleIn_, 1)
}

export const createStyle = (text: string, css?: HTMLStyleElement | null): HTMLStyleElement => {
    css = css || createElement_("style");
    textContent_s(css, text)
    return css;
}

export let setUICSS = (innerCSS: string): void => { styleIn_ = innerCSS }

export const learnCSS = (srcStyleIn: typeof styleIn_, force?: 1): void => {
  if (!styleIn_ || force) {
    const css = srcStyleIn && (isTY(srcStyleIn) ? srcStyleIn : textContent_s(srcStyleIn))
      if (css) {
        setUICSS(css)
        if (!OnChrome || Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor) {
          force || post_({H: kFgReq.cssLearnt})
        }
      }
  }
}

export const checkDocSelectable = (): void => {
    let sout: HTMLStyleElement | null | undefined | HTMLBodyElement | HTMLFrameSetElement = styleSelectable
      , gcs = getComputedStyle_, st: CSSStyleDeclaration
      , mayTrue = !sout || !parentNode_unsafe_s(sout)
    if (mayTrue && (sout = doc.body)) {
      st = gcs(sout);
      mayTrue = (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
            || OnChrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
            ? st.userSelect || st.webkitUserSelect : st.userSelect) !== NONE;
    }
    set_docSelectable_(mayTrue && (st = gcs(docEl_unsafe_()!),
            OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
            || OnChrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
            ? st.userSelect || st.webkitUserSelect : st.userSelect) !== NONE)
}

export const hasGetSelection = (node: Node): node is ShadowRoot => isTY((node as ShadowRoot).getSelection, kTY.func)

export const getSelectionOf = (node: DocumentOrShadowRootMixin): Selection | null => node.getSelection!()

export const getSelected = (notExpectCount?: {r?: ShadowRoot | null}): Selection => {
  type Item<Ref> = Ref extends WeakRef<infer U> ? U : never
  let el: Document | DocumentFragment | Element | null | undefined, sel: Selection | null
  let sr: ShadowRoot | null = null, sr2: ShadowRoot | null
  if (el = derefInDoc_(currentScrolling)) {
      type ReferredInDoc = EnsuredMountedElement & Item<typeof currentScrolling>;
      el = getRootNode_mounted(el as ReferredInDoc)
      if (el !== doc && isNode_(el, kNode.DOCUMENT_FRAGMENT_NODE) && hasGetSelection(el)) {
        sel = getSelectionOf(el)
        if (sel && (notExpectCount || rangeCount_(sel))) {
          sr = el
        }
      }
  }
  sel = sr ? sel! : getSelection_()
  let sel2: Selection | null | false = OnChrome && (Build.MinCVer >= BrowserVer.MinShadowDOMV0
          || chromeVer_ > BrowserVer.MinShadowDOMV0 - 1)
        || !OnFirefox && typeof ShadowRoot == OBJECT_TYPES[kTY.func] ? sel : null
  while (sel2) {
          el = singleSelectionElement_unsafe(sel)
    sel2 = el && (sr2 = TryGetShadowRoot_(el as Element)) && (OnChrome || hasGetSelection(sr2)) && getSelectionOf(sr2)
    if (sel2) {
      sr = sr2!, sel = sel2
    }
  }
  notExpectCount && (notExpectCount.r = sr)
  return sel
}

/** return HTMLElement if there's only Firefox */
export const getSelectionParent_unsafe = ((sel: Selection, re?: RegExpG & RegExpSearchable<0>): Element | null | 0 => {
    let range = selRange_(sel), text: HTMLElement["innerText"] | undefined
      , selected: string | undefined, match: RegExpExecArray | null, result = 0
      , par: Node | null = range && range.commonAncestorContainer, lastPar = par!
    while (par && !isNode_(par, kNode.ELEMENT_NODE)) {
      par = parentNode_unsafe_s(par as Text)
    }
    // now par is Element or null, and may be a <form> / <frameset>
    if (re && par && range && !range.collapsed && (selected = range + "")) {
      if (isNode_(lastPar, kNode.TEXT_NODE) && lastPar.data.trim().length <= selected.length) {
        while (par
            && (text = (par as TypeToAssert<Element, HTMLElement, "innerText">).innerText, OnFirefox ? 1 : isTY(text))
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

export const getSelectionBoundingBox_ = (sel?: Selection | void, ensured?: BOOL, range0?: Range): Rect | null => {
  const range = range0 || selRange_(sel || getSelected(), ensured), bcr = range && range.getBoundingClientRect(),
  rect = bcr && padClientRect_(bcr, range0 ? 1 : 3)
  return rect && rect.b > rect.t ? rect : null
}

/** `type`: 0 means to trim; always check focused `<input>` on Firefox and blurred inputs on Chrome */
export const getSelectionText = (type?: 0 | 1, sel?: Selection): string => {
    sel = sel || getSelection_()
    let s = "" + <SelWithToStr> sel, node: Element | null, start: number | null
    if (OnFirefox && !s) {
      s = !insert_Lock_() || getEditableType_<0>(node = raw_insert_lock!) < EditableType.MaxNotTextBox + 1
          || (start = textOffset_(node as TextElement)) == null ? s
          : (node as TextElement).value.slice(start, textOffset_(node as TextElement, 1)!)
    } else if (s && !insert_Lock_()
        && (node = singleSelectionElement_unsafe(sel)) && getEditableType_<0>(node) > EditableType.MaxNotTextBox
        && !getSelectionBoundingBox_(sel, 1)) {
      s = "";
    }
    return type ? s : s.trim()
}

export const doesSelectRightInEditableLock = (): boolean =>
    (raw_insert_lock as TextElement).selectionDirection !== kDir[0]

export const maySelectRight_ = (sel: Selection): boolean =>
    insert_Lock_() && getEditableType_<0>(raw_insert_lock!) > EditableType.MaxNotTextBox
    ? doesSelectRightInEditableLock()
    : !!getDirectionOfNormalSelection(sel, getAccessibleSelectedNode(sel), getAccessibleSelectedNode(sel, 1))

export const removeSelection = function (root?: VUIRoot & Pick<DocumentOrShadowRoot, "getSelection">): boolean {
    const sel = (OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        ? root : root && hasGetSelection(root)) ? getSelectionOf(root as ShadowRoot) : getSelection_()
    const ret = sel && isSelARange(sel) && getAccessibleSelectedNode(sel)
    ret && collpaseSelection(sel)
    return !!ret
} as (root?: VUIRoot) => boolean

export const resetSelectionToDocStart = (sel?: Selection, range?: Range | null): void => {
    (sel || getSelection_()).removeAllRanges();
    range && sel!.addRange(range)
}

export const selectAllOfNode = (node: Node): void => { getSelection_().selectAllChildren(node) }

export const selectNode_ = (element: SafeElement): void => {
  if (getEditableType_<0>(element) > EditableType.MaxNotEditableElement) {
    (element as TextElement).select()
  } else {
    const range = doc.createRange()
    range.selectNode(element)
    resetSelectionToDocStart(getSelection_(), range)
  }
}

export const moveSel_s_throwable = (element: LockableElement, action: SelectActions | undefined): void => {
    let type = getEditableType_<0>(element)
    const isBox = type === EditableType.TextArea
        || type === EditableType.ContentEditable && textContent_s(element).includes("\n"),
    gotoStart = action === "start",
    gotoEnd = !action || action === "end" || isBox && (action + "")[3] === "-"
    let doesCollpase: boolean | BOOL = gotoEnd || gotoStart
    let str: string, len: number | undefined
    if (!type) { return }
    if (isBox && gotoEnd && dimSize_(element, kDim.elClientH) + 12 < dimSize_(element, kDim.scrollH)) {
      return;
    }
    // not need `this.getSelection_()`
    if (type === EditableType.ContentEditable) {
      action && doesCollpase || !contains_s(element, getAccessibleSelectedNode(getSelected()) || doc)
          ? selectAllOfNode(element) : doesCollpase = 0
    } else {
      len = (element as TextElement).value.length
      const start = textOffset_(element as TextElement), end = textOffset_(element as TextElement, 1)
      if (!len || start == null || start && start < len || end && end < len
            || (gotoEnd ? start : gotoStart ? !end : !start && end) || !action && end) {
        doesCollpase = 0
      } else {
        (element as TextElement).select();
        if (OnFirefox && doesCollpase) {
          inputSelRange((element as TextElement), gotoEnd ? len : 0, gotoEnd ? len : 0)
          doesCollpase = 0
        }
      }
    }
    doesCollpase && collpaseSelection(getSelection_(), gotoEnd)
    if (OnEdge) { /** empty */ }
    else if (getEditableType_<0>(element as SafeElement) === EditableType.Input
        ? (!len && (str = (element as HTMLInputElement).autocomplete) && str !== "off"
            || (element as HTMLInputElement).list)
        : Build.MV3 && OnChrome && // in case it change .type
          hasTag_("input", element) && uneditableInputs_[element.type] === 4) {
      showPicker_(element as HTMLInputElement, EditableType.Input)
    }
}

export const collpaseSelection = (sel: Selection, toEnd?: VisualModeNS.ForwardDir | boolean,
    fix_input?: number): void => {
  if (!OnFirefox && fix_input && raw_insert_lock && getEditableType_<0>(raw_insert_lock) > EditableType.MaxNotTextBox) {
    fix_input = textOffset_(raw_insert_lock as TextElement, toEnd)!
    inputSelRange(raw_insert_lock as TextElement, fix_input, fix_input, VisualModeNS.kDir.right)
  } else {
    toEnd ? sel.collapseToEnd() : sel.collapseToStart()
  }
}

export const getRect = (clickEl: SafeElement, refer?: HTMLElementUsingMap | null): Rect | null => {
    const tag = htmlTag_(clickEl)
    if (refer) {
      return getClientRectsForAreas_(refer, [], [clickEl as HTMLAreaElement]);
    } else if (tag === "a") {
      return getPreferredRectOfAnchor(clickEl as HTMLAnchorElement)
    } else if (tag === "input") {
      return getVisibleBoundingRect_(clickEl, 1)
    }
    const rect = getVisibleClientRect_(clickEl),
    bcr = padClientRect_(getBoundingClientRect_(clickEl), 3),
    rect2 = rect && !isContaining_(bcr, rect) ? rect : cropRectS_(bcr) ? bcr : null
    return rect2 && getCroppedRect_(clickEl, rect2);
}

export const flash_ = function (el: SafeElement | null, rect?: Rect | null, lifeTime?: number
      , classNames?: string, knownViewOffset?: ViewOffset): SafeHTMLElement | (() => void) | void {
    rect || (getZoom_(el!), prepareCrop_(), rect = getRect(el!))
    if (!rect) { return; }
    const flashEl = createElement_(OnChrome
        && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div"),
    nfs = knownViewOffset ? 2 : <BOOL> <BOOL | boolean> +!fullscreenEl_unsafe_()
    setClassName_s(flashEl, "R Flash" + (classNames || "")
        + (setBoundary_(flashEl.style, rect, nfs, knownViewOffset, 8) ? " AbsF" : ""))
    OnChrome &&
    bZoom_ !== 1 && nfs && (flashEl.style.zoom = "" + bZoom_);
    addUIElement(flashEl, AdjustType.DEFAULT)
    lastFlashEl = flashEl
    const remove = (): void => {
      lastFlashEl === flashEl && (lastFlashEl = null)
      removeEl_s(flashEl)
    };
    knownViewOffset || timeout_(remove, (lifeTime || GlobalConsts.DefaultRectFlashTime) * (1 + +fgCache.m))
    return remove;
} as {
    (el: null, rect: Rect, lifeTime: -1, classNames: string, knownViewOffset: ViewOffset): () => void
    (el: null, rect: Rect, lifeTime?: number, classNames?: string, _offset?: void): () => void
    (el: SafeElement, rect?: Rect | null, lifeTime?: number, classNames?: string, _offset?: void): (() => void) | void
}

  /** key: 1 := help dialog; 2 := vomnibar; -1: remove for help dialog; -2: remove for vomnibar */
export const setupExitOnClick = (key: kExitOnClick): void => {
  key = key & kExitOnClick.REMOVE ? toExitOnClick_ & ~key : toExitOnClick_ | key
  if (key !== toExitOnClick_) {
    toExitOnClick_ = key
    OnChrome ? resetAnyClickHandler_cr(isWaitingAccessKey) : setupEventListener(0, CLK, doExitOnClick_, !key, 1)
  }
}

export const doExitOnClick_ = (event?: MouseEventToPrevent): void => {
  if (event) {
      if (// simulated events generated by page code
          (OnChrome && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted ? event.isTrusted === false : !event.isTrusted)
          // simulated events generated by browser code
          || !(event as MouseEvent).detail && !(event as MouseEvent).clientY
          // Vimium C has been disabled
          || !parentNode_unsafe_s(box_!)
          // the click target is in Vimium C's UI
          || (OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
                || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1 || !OnEdge && root_ !== box_
              ? event.target === box_ && !(!OnFirefox && WithDialog && omni_dialog_non_ff
                  && omni_status == OmniStatus.Showing && !(root_ as ShadowRoot).activeElement)
              : !(event.target instanceof Element) || root_.contains(event.target))
          ) {
        return;
      }
  }
  event && prevent_(event)
  toExitOnClick_ & kExitOnClick.helpDialog && hideHelp!()
  toExitOnClick_ & kExitOnClick.vomnibar && omniHide()
}

export const focusIframeContentWnd_ = (iframe: AccessableIFrameElement, res?: boolean | 0): void => {
  if (res) { return }
  iframe === omni_box && res !== 0 ? omni_status < OmniStatus.Showing || postToOmni(VomnibarNS.kCReq.focus)
  : iframe.contentWindow.focus()
}

/** must be called only if having known anotherWindow is "in a same origin" */
export let getWndVApi_ff = OnFirefox ? (anotherWindow: Window): VApiTy | null | void => anotherWindow.VApi
    : 0 as never as null
export function set_getWndVApi_ff (_newGetWndVApi: typeof getWndVApi_ff): void { getWndVApi_ff = _newGetWndVApi }

/**
 * Return a valid `ContentWindowCore`
 * only if is a child which in fact has a same origin with its parent frame (ignore `document.domain`).
 *
 * So even if it returns a valid object, `parent.***` may still be blocked
 */
export let getParentVApi = OnFirefox && isAsContent ? (): VApiTy | null | void => {
    // in Firefox, not use the cached version of frameElement - for less exceptions in the below code
  // Note: the functionality below should keep the same even if the cached version is used - for easier debugging
  const core = frameElement && getWndVApi_ff!(parent as Window);
  if (core) {
    /** the case of injector is handled in {@link ./injected_end.ts} */
    getParentVApi = () => core;
  }
  return core;
} : (): VApiTy | null | void => frameElement_() && (parent as Window).VApi

export function set_getParentVApi (_newGetParVApi: () => VApiTy | null | void): void { getParentVApi = _newGetParVApi }

export const evalIfOK = (req: BgReq[kBgReq.eval] | string): boolean => {
  const url = isTY(req) ? req : req.u
  if (!isJSUrl(url)) {
    return false;
  }
  let str = url.slice(11).trim();
  let el: HTMLScriptElement & SafeHTMLElement | undefined
  if (createRegExp(kTip.voidJS, "").test(str)) { /* empty */ }
  else if (!isAsContent
      || !parentNode_unsafe_s(el = runJS_(VTr(Build.MV3 ? kTip.removeEventScript : kTip.removeCurScript), 0)!)) {
    str = safeCall(decodeURIComponent, str) || str
    timeout_((): void => {
      vApi.v(str)
      isTY(req) || req.f && runFallbackKey(req.f, 0)
    }, 0)
  } else {
    removeEl_s(el)
    post_({ H: kFgReq.evalJSFallback, u: url })
  }
  return true;
}

export const checkHidden = ((cmd?: FgCmdAcrossFrames, options?: OptionsWithForce, count?: number): BOOL => {
  if (isTop) { return 0 }
  // here should not use the cache frameElement, because `getComputedStyle(frameElement).***` might break
  const curFrameElement = OnFirefox ? frameElement as SafeElement | null
      : OnChrome && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement ? frameElement_() || null
      : frameElement_() as SafeElement | null,
  el = curFrameElement || docEl_unsafe_();
  let box: Rect | null,
  parEvents: ReturnType<typeof getParentVApi> | undefined,
  defaultToPar = isIFrameInAbout_ && cmd === kFgCmd.framesGoBack,
  // use client{Width,Height} in case an <iframe> has border (e.g.: is blocked so its CSS is never added)
  result: boolean | BOOL = defaultToPar
      || dimSize_(curFrameElement, kDim.elClientH) < 4
      || dimSize_(curFrameElement, kDim.elClientW) < 4 || !!el && !isStyleVisible_(el)
  if (cmd) {
    // if in a forced cross-origin env (by setting doc.domain),
    // then par.self.innerHeight works, but this behavior is undocumented,
    // so here only use `parApi.innerHeight_()` in case
    if ((OnFirefox ? (parEvents = getParentVApi()) : curFrameElement)
        && (result || (box = boundingRect_(curFrameElement!)).b <= 0
            || box.t > (OnFirefox ? parEvents!.i!() : (parent as Window).innerHeight))) {
      OnFirefox || (parEvents = getParentVApi())
      if (parEvents && !parEvents.a(keydownEvents_)) {
        parEvents.f(cmd, options!, count!, +!defaultToPar as boolean | BOOL as BOOL)
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
}) as {
  (cmd: FgCmdAcrossFrames, options: OptionsWithForce, count: number): BOOL
  (cmd?: undefined): BOOL
}

export const filterOutInert = (hints: Hint[]): void => {
  let i = (OnChrome && Build.MinCVer >= BrowserVer.MinEnsured$HTMLElement$$inert ? isHTML_() : supportInert_!())
      ? hints.length : 0
  while (0 <= --i) {
    hints[i][0].closest!("[inert]") && hints.splice(i, 1)
  }
}

export const onToggle = (event: Event & { [property in "newState" | "oldState"]?: "open" | "closed" }): void => {
  const newState = event.newState, target = event.target as Node
  if (event.isTrusted && isNode_(target, kNode.ELEMENT_NODE) && !hasTag_("details", target)) {
    hasPopover_ = max_(hasPopover_ & 1, hasPopover_ + (newState! > "o" ? 2 : -2))
    if (root_ && hasPopover_ > 0) {
      adjustUI()
    }
  }
}

if (!(Build.NDEBUG || kTip.INJECTED_CONTENT_END < kTip.extendClick)) {
  alert("Assert error: kTip.INJECTED_CONTENT_END < kTip.extendClick")
}
