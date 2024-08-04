import {
  setupEventListener, VTr, keydownEvents_, isAlive_, suppressCommonEvents, onWndFocus, timeout_, safer, fgCache,
  doc, getTime, chromeVer_, deref_, escapeAllForRe, tryCreateRegExp, vApi, callFunc, clearTimeout_, Stop_, isTY, Lower,
  abs_, max_, min_, OnFirefox, OnChrome, OnEdge, firefoxVer_, os_, reflectApply_not_cr, OnSafari, math
} from "../lib/utils"
import {
  replaceOrSuppressMost_, removeHandler_, prevent_, getMappedKey, keybody_, isEscape_, keyNames_, DEL, BSP, ENTER,
  whenNextIsEsc_, isRepeated_, consumeKey_mac
} from "../lib/keyboard_utils"
import {
  attachShadow_, getSelectionFocusEdge_, deepActiveEl_unsafe_, setClassName_s, compareDocumentPosition, kGCh, hasTag_,
  getEditableType_, scrollIntoView_, SafeEl_not_ff_, GetParent_unsafe_, focus_, fullscreenEl_unsafe_, docEl_unsafe_,
  getSelection_, isSelected_, docSelectable_, isHTML_, createElement_, CLK, MDW, removeEl_s, appendNode_s, isNode_,
  setDisplaying_s, findAnchor_, isSafeEl_, textContent_s, modifySel, parentNode_unsafe_s, selOffset_, blur_unsafe,
  getAccessibleSelectedNode,  INP, BU, PGH, contains_s, setOrRemoveAttr_s, singleSelectionElement_unsafe, getNodeChild_,
  getDirectionOfNormalSelection, getComputedStyle_, textOffset_
} from "../lib/dom_utils"
import {
  wdZoom_, prepareCrop_, view_, dimSize_, selRange_, getZoom_, isSelARange, getViewBox_, scrollWndBy_, cropRectS_,
  setupPageLevelCrops, instantScOpt, boundingRect_, isNotInViewport
} from "../lib/rect"
import {
  ui_box, ui_root, getSelectionParent_unsafe, resetSelectionToDocStart, getBoxTagName_old_cr, collpaseSelection,
  createStyle, getSelectionText, checkDocSelectable, adjustUI, ensureBorder, addUIElement, getSelected, flash_,
  getSelectionOf, getSelectionBoundingBox_, hasGetSelection, focusIframeContentWnd_, maySelectRight_
} from "./dom_ui"
import { highlightRange, deactivate as visualDeactivate } from "./visual"
import { keyIsDown as scroll_keyIsDown, beginScroll, onScrolls } from "./scroller"
import { scrollToMark, setPreviousMarkPosition } from "./marks"
import { hudHide, hud_box, hudTip, hud_opacity, toggleOpacity as hud_toggleOpacity } from "./hud"
import { post_, send_, runFallbackKey, runtimeConnect, runtime_port } from "./port"
import { insert_Lock_, raw_insert_lock, setupSuppress } from "./insert"
import { lastHovered_, set_lastHovered_, set_lastBubbledHovered_, select_ } from "./async_dispatcher"
import {
  checkKey, checkKeyOnTop, currentKeys, noopHandler, set_isCmdTriggered, maybeEscIsHidden_ff, set_maybeEscIsHidden_ff
} from "./key_handler"
import { removeFlash, set_removeFlash } from "./link_actions"

export declare const enum FindAction {
  PassDirectly = -1,
  DoNothing = 0, Exit, ExitNoAnyFocus, ExitNoFocus, ExitUnexpectedly,
  MaxExitButNoWork = ExitUnexpectedly, MinExitAndWork,
  ExitForEsc = MinExitAndWork, ExitForEnter,
  MinNotExit, CtrlDelete = MinNotExit, ResumeFind, CopySel, ConsumedByHost,
}
interface ExecuteOptions extends Partial<Pick<CmdOptions[kFgCmd.findMode], "c" | "t">> {
  /** highlight */ h?: [number, number, Rect[]] | false;
  /** ignore$hasResult */ i?: 1;
  /** just inputted */ j?: 1;
  noColor?: BOOL | boolean
  caseSensitive?: boolean;
}

let isActive: BOOL = 0
let query_ = ""
let query0_ = ""
let parsedQuery_ = ""
let parsedRegexp_: RegExpG | null = null
let lastInputTime_ = 0
let historyIndex = 0
let notEmpty: boolean
let isQueryRichText_ = true
let isRegex: boolean | null = null
let ignoreCase: boolean | null = null
let wholeWord = false
let wrapAround = true
let hasResults = false
let matchCount = 0
let latest_options_: CmdOptions[kFgCmd.findMode]
let coords: null | MarksNS.ScrollInfo = null
let initialRange: Range | null = null
let hasInitialRange: BOOL | 2 | undefined
let activeRegexIndex = 0
let regexMatches: string[] | null = null
let root_: ShadowRoot | null = null
let box_: HTMLIFrameElement = null as never
let outerBox_: HTMLDivElement | HTMLBodyElement = null as never
let innerDoc_: HTMLDocument = null as never
let input_: SafeHTMLElement = null as never
let suppressOnInput_: BOOL | boolean | undefined
let countEl: SafeHTMLElement = null as never
let findCSS: FindCSS = null as never
let styleSelColorIn: HTMLStyleElement | null | undefined
let styleSelColorOut: HTMLStyleElement | null | undefined
let styleSelectable: HTMLStyleElement | null | undefined
let styleInHUD: HTMLStyleElement | null = null
let onUnexpectedBlur: ((this: unknown, event?: Event) => void) | null = null
let doesCheckAlive: BOOL = 0
let highlighting: (() => void) | undefined | 0
let isSmall: boolean
let postLock: Element | null = null
let cachedInnerText: { /** innerText */ i: string, /** timestamp */ t: number, n: boolean } | null | undefined
let deactivate: (i: FindAction) => void
let canvas: HTMLCanvasElement | null
let delayedScrollIntoViewTick_ = 0
const kIT = "insertText"

export { findCSS, query_ as find_query, hasResults as find_hasResults, box_ as find_box, styleSelectable,
    styleInHUD, styleSelColorIn, styleSelColorOut, input_ as find_input, deactivate, kIT as kInsertText }
export function set_findCSS (_newFindCSS: FindCSS): void { findCSS = _newFindCSS }

export const activate = (options: CmdOptions[kFgCmd.findMode]): void => {

  const initSelColors = (adjust_type: AdjustType): void => {
      const css = findCSS.c, sin = styleSelColorIn = createStyle(css)
      ui_box ? adjustUI() : addUIElement(sin, adjust_type, true)
      removeEl_s(sin)
      styleSelColorOut = OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
          || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
          || !OnEdge && ui_box !== ui_root ? createStyle(css) : sin
  }
  const initStartPoint = (keep?: BOOL | 2): void => {
    const sel = getSelected()
    if (initialRange = selRange_(sel)) {
      hasInitialRange = options.t && (1 + +maySelectRight_(sel)) as 1 | 2
      keep ? initialRange = initialRange.cloneRange() :
      collpaseSelection(getSelection_()) // `range.collapse` doesn't work when inside a ShadowRoot (C72)
    } else {
      (initialRange = doc.createRange()).setStart(doc.body || docEl_unsafe_()!, hasInitialRange = 0)
    }
    hasInitialRange || initialRange.collapse(!0)
    if (options.r) { coords = [scrollX, scrollY] }
  }
  const focusFocusEdge = (evenIfEditable: boolean | BOOL): void => {
    const el = getSelectionFocusEdge_(getSelected())
    if (el && (evenIfEditable || !getEditableType_(el))) {
      flash_(el)
      hasTag_("label", el) && el.control && el.tabIndex < 0 || focus_(el)
    }
  }
  /** return an element if no <a> else null */
  const focusFoundLinkIfAny = (): SafeElement | null | void => {
    let cur = OnFirefox ? getSelectionParent_unsafe(getSelected()) as SafeElement | null
        : SafeEl_not_ff_!(getSelectionParent_unsafe(getSelected()))
    const link = cur && findAnchor_(cur)
    return link ? focus_(link) : cur
  }
  const setFirstQuery = (query: string): void => {
    hudHide(TimerType.noTimer) // delay hudHide, so that avoid flicker on Firefox
    doFocus()
    query0_ = ""
    query_ || setQuery(query)
    isQueryRichText_ = true
    notEmpty = !!query_
    notEmpty && execCommand("selectAll")
  }
  const setQuery = (query: string | 1): void => {
    if (query === query0_ || !innerDoc_) { /* empty */ }
    else if (!query && historyIndex > 0) { --historyIndex }
    else {
      suppressOnInput_ = 1
      if (query !== 1) {
        execCommand("selectAll")
        execCommand(kIT, 0, query) // "\xa0" is not needed, because of `white-space: pre;`
      } else {
        execCommand("undo")
      }
      suppressOnInput_ = 0
      onInput()
      scrollTo_(query === 1 ? 3 : 0)
    }
  }
  const postActivate = (): void => {
    const postExit = (skip?: Event | void): void => {
      // safe if destroyed, because `el.onblur = Exit`
      if (skip && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
              ? !skip.isTrusted : skip.isTrusted === false)) { return }
      postLock && setupEventListener(postLock, BU, postExit, 1)
      if (!postLock) { return }
      postLock = null
      setupEventListener(0, CLK, postExit, 1)
      removeHandler_(kHandler.postFind)
      setupSuppress()
    }
    const el = insert_Lock_()
    if (!el) { postExit(); return }
    whenNextIsEsc_(kHandler.postFind, kModeId.Find, postExit)
    if (el === postLock) { return }
    if (postLock) {
      setupEventListener(postLock, BU, postExit, 1)
    } else {
      setupEventListener(0, CLK, postExit)
      setupSuppress(postExit)
    }
    postLock = el
    setupEventListener(el, BU, postExit)
  }
  const onInput = (e?: Event): void => {
    if (e) {
      Stop_(e)
      if (!(OnChrome
          && (Build.MinCVer >= BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse
              || chromeVer_ > BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse - 1)
          && e.type < "i")) {
        if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
            ? !e.isTrusted : e.isTrusted === false) { return }
      }
      if (suppressOnInput_ || (e as TypeToPick<Event, InputEvent, "isComposing">).isComposing) {
        clearTimeout_(highlightTimeout_)
        return
      }
    }
    const query = input_.innerText.replace(<RegExpG> /\xa0/g, " ").replace(<RegExpOne> /\n$/, "")
    let s = query_
    if (!hasResults && !isRegex && !wholeWord && notEmpty && query.startsWith(s)
          && !query.includes("\\", s.length - 1)) {
      query0_ = query
      showCount(0)
    } else {
      coords && scrollToMark(coords)
      updateQuery(query)
      if (suppressOnInput_) { showCount(1); return }
      restoreSelection()
      executeFind(!isRegex ? parsedQuery_ : regexMatches ? regexMatches[0] : "", { j: 1, c: options.d, t: options.t })
      showCount(1)
      lastInputTime_ = getTime()
      highlightTimeout_ = options.m ? highlightTimeout_ || timeout_(highlightMany, 200) : 0
    }
  }
  const showCount = (changed?: BOOL): void => {
    let count = matchCount
    if (changed) {
        countEl.dataset.vimium = suppressOnInput_ ? VTr(kTip.paused)
            : !parsedQuery_ ? "" : VTr(count > 1 ? kTip.nMatches : count ? kTip.oneMatch
            : hasResults ? kTip.someMatches : kTip.noMatches, [count])
    }
    count = (dimSize_(input_, kDim.scrollW) + countEl.offsetWidth + 35) & ~31
    if (!isSmall || count > 151) {
      outerBox_.style.width = ((isSmall = count < 152) ? 0 as number | string as string : count + "px")
    }
  }
  const scrollTo_ = (action: 0 | 1 | 2 | 3 | 9): void => { // up, left, right, down
    const sel = getSelectionOf(OnChrome ? Build.MinCVer >= BrowserVer.MinShadowDOMV0 ? root_! : root_ || innerDoc_
        : root_ && hasGetSelection(root_) ? root_ : innerDoc_)!
    if (action > 2) {
      if (sel + "" === input_.innerText) { collpaseSelection(sel, VisualModeNS.kDir.right, 1) }
      else { historyIndex++ }
    } else if (action) {
      const node = getAccessibleSelectedNode(sel, 1)
      if (node && isNode_(node, kNode.TEXT_NODE)) { sel.collapse(node, action > 1 ? node.length : 0) }
      else { action = 9 }
    }
    const bbox = action < 9 && getSelectionBoundingBox_(sel)
    if (bbox) {
      const newLeft = max_(0, dimSize_(input_, kDim.positionX) + bbox.l - dimSize_(input_, kDim.elClientW))
      input_.scrollTop += bbox.t; input_.scrollLeft = newLeft
    }
  }
  const restoreSelection = (isCur?: 1): void => {
      const sel = getSelection_(),
      range = !isCur ? initialRange : sel.isCollapsed ? null : selRange_(sel)
      if (!range) { return }
      // Note: it works even when range is inside a shadow root (tested on C72 stable)
      resetSelectionToDocStart(sel, range)
  }
  const highlightMany = (): void => {
    const oldActiveRegexIndex = activeRegexIndex
    const arr: Rect[] = [], opt: ExecuteOptions = { h: [scrollX, scrollY, arr], i: 1, c: options.m || 20 }
    const sel = getSelected()
    if (hasResults && (OnFirefox || !singleSelectionElement_unsafe(sel))) {
      prepareCrop_()
      const range = selRange_(sel), viewBox = getViewBox_(1)
      highlightTimeout_ && toggleStyle(0)
      range && collpaseSelection(sel)
      executeFind("", opt)
      if (range) {
        resetSelectionToDocStart(sel, range)
        activeRegexIndex = oldActiveRegexIndex
        opt.c = -opt.c!
        executeFind("", opt)
      }
      insert_Lock_() && blur_unsafe(raw_insert_lock!)
      highlighting && highlighting()
      /*#__INLINE__*/ setupPageLevelCrops(viewBox)
      const cbs = arr.map(cropRectS_).map(cr => cr ? flash_(null, cr, -1, " Sel SelH", viewBox) : noopHandler)
      activeRegexIndex = oldActiveRegexIndex
      range ? resetSelectionToDocStart(sel, range) : restoreSelection()
      highlighting = (): void => { highlighting = 0; clearTimeout_(clearTimeout); cbs.map(callFunc) }
      const clearTimeout = highlightTimeout_ || arr.length && timeout_(highlighting, 2400)
      highlightTimeout_ && timeout_(hookSel, 0)
    } else {
      highlighting && highlighting()
    }
    highlightTimeout_ = 0
  }

    findCSS = options.f || findCSS;
    if (!isHTML_()) { return; }
    latest_options_ = options
    let highlightTimeout_: ValidTimeoutID = 0, initial_query: string = options.s ? getSelectionText() : "";
    (initial_query.length > 99 || initial_query.includes("\n")) && (initial_query = "")
    isQueryRichText_ = !initial_query
    initial_query || (initial_query = options.q)
    isActive || initial_query === query_ && options.l || setPreviousMarkPosition(1)
    checkDocSelectable();
    ensureBorder()

  /** Note: host page may have no range (type is "None"), if:
   * * press <Enter> on HUD to exit FindMode
   * * a host script has removed all ranges
   */
  deactivate = deactivate || ((i: FindAction): void => {
    const styleSheet = styleSelColorIn && styleSelColorIn.sheet, knownHasResults = hasResults
    const knownOptions = latest_options_
    const maxNotRunPost = knownOptions.p ? FindAction.ExitForEsc - 1 : FindAction.ExitForEnter - 1
    let el: SafeElement | null | undefined, el2: Element | null
    lastInputTime_ = isActive = 0
    i === FindAction.ExitNoAnyFocus ? hookSel(1) : focus()
    coords && scrollToMark(coords)
    hasResults = isSmall = notEmpty = wholeWord = false
    wrapAround = true
    removeHandler_(kHandler.find)
    outerBox_ && removeEl_s(outerBox_)
    highlighting && highlighting()
    clearTimeout_(highlightTimeout_)
    if (box_ === deref_(lastHovered_)) { set_lastHovered_(set_lastBubbledHovered_(null)) }
    if (knownOptions.t) {
       extendToCurRange(initialRange!, hasInitialRange!, i !== FindAction.ExitForEnter, styleSheet)
    } else {
      if (i > FindAction.MaxExitButNoWork) {
        focusFocusEdge(i > FindAction.ExitForEnter - 1 && knownHasResults)
      }
      if ((i === FindAction.ExitForEsc || !knownHasResults || visualDeactivate) && styleSheet) {
        toggleStyle(1)
        restoreSelection(1)
      }
    }
    parsedQuery_ = query_ = query0_ = ""
    historyIndex = matchCount = doesCheckAlive = hasInitialRange = 0
    styleInHUD = onUnexpectedBlur = outerBox_ = isRegex = ignoreCase =
    box_ = innerDoc_ = root_ = input_ = countEl = parsedRegexp_ = canvas =
    deactivate = vApi.n = latest_options_ = initialRange = regexMatches = coords = cachedInnerText = null as never
    if (visualDeactivate) {
      visualDeactivate!(2)
      return;
    }
    if (i > FindAction.MaxExitButNoWork && knownHasResults && (!el || el !== insert_Lock_())) {
      let container = focusFoundLinkIfAny()
      if (container && i === FindAction.ExitForEsc && (el2 = deepActiveEl_unsafe_())
          && getEditableType_<0>(el2) > EditableType.MaxNotEditableElement && contains_s(container, el2)) {
        prepareCrop_();
        void select_(el2 as LockableElement).then((): void => {
          toggleSelectableStyle()
          i > maxNotRunPost && postActivate()
        })
        return
      } else if (el) {
        // always call scrollIntoView if only possible, to keep a consistent behavior
        const pos: MarksNS.ScrollInfo | false = OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
            && chromeVer_ < BrowserVer.MinScrollIntoViewOptions && [scrollX, scrollY]
        // ScrollIntoView to notify it's `<tab>`'s current target since Min$ScrollIntoView$SetTabNavigationNode (C51)
        OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions ? scrollIntoView_(el, pos) : scrollIntoView_(el)
        pos && scrollToMark(pos)
      }
    }
    toggleSelectableStyle()
    if (i > maxNotRunPost) {
      postActivate()
      i > FindAction.ExitForEnter - 1 && runFallbackKey(knownOptions, knownHasResults ? 0 : 2)
    }
  })

  isActive && adjustUI()
  if (options.l) {
      if (initial_query = initial_query || query_) {
        styleSelColorOut || initSelColors(AdjustType.MustAdjust)
        const isNewQuery = initial_query !== query_
        initialRange || query_ || initStartPoint(1)
        if (options.e) { activeRegexIndex = 0; restoreSelection() }
        if (isNewQuery) {
          updateQuery(initial_query)
          if (isActive) {
            textContent_s(input_, initial_query)
            showCount(1)
          }
        }
        if (options.e || isNewQuery) { activeRegexIndex -= options.c > 0 ? 1 : -1 }
        isQueryRichText_ = true
        const hud_showing = !isActive && hud_opacity === 1
        hud_showing && hud_toggleOpacity(0)
        toggleSelectableStyle()
        executeFind("", options)
        if (hasResults && options.m) {
          getZoom_()
          highlightMany()
        }
        hud_showing && hud_toggleOpacity(1)
        if (!hasResults) {
          toggleStyle(1)
          isActive || toggleSelectableStyle()
        } else {
          focusFoundLinkIfAny()
          if (!isActive) {
            whenNextIsEsc_(kHandler.find, kModeId.Find, (): HandlerResult => {
                const old = initialRange
                deactivate(FindAction.ExitNoAnyFocus)
                toggleStyle(1)
                resetSelectionToDocStart(getSelection_(), old)
                return HandlerResult.Prevent
            })
          }
          postActivate()
        }
      }
      runFallbackKey(options, !initial_query ? kTip.noOldQuery : hasResults ? 0 : kTip.noMatchFor, initial_query)
  } else if (isActive) {
    setFirstQuery(initial_query)
    // not reinstall keydown handler - make code smaller
  } else {
    initStartPoint(options.t)
    parsedQuery_ = query_ = ""
    parsedRegexp_ = regexMatches = null
    activeRegexIndex = 0
    query0_ = initial_query

    const outerBox = outerBox_ = createElement_(OnChrome
        && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div"),
    st = outerBox.style
    st.width = "0";
    setDisplaying_s(outerBox)
    if (!OnFirefox && wdZoom_ !== 1) { st.zoom = "" + 1 / wdZoom_; }
    setClassName_s(outerBox, "R UI HUD" + fgCache.d)
    box_ = createElement_("iframe")
    setClassName_s(box_, "R UI Find")
    box_.onload = vApi.n = (later): void => {
//#region on load
const onLoad2 = (): void => {
    const docEl = innerDoc_.documentElement as HTMLHtmlElement,
    body = innerDoc_.body as HTMLBodyElement,
    zoom = OnFirefox ? 1 : wnd.devicePixelRatio,
    list = innerDoc_.createDocumentFragment(),
    addElement = function (tag: 0 | "div" | "style", id?: string): SafeHTMLElement {
      const newEl = innerDoc_.createElement(tag || "span") as SafeHTMLElement;
      id && (newEl.id = id, appendNode_s(list, newEl))
      return newEl;
    };
    addElement(0, "s")
    const el = input_ = addElement(0, "i")
    addElement(0, "h");
    if (OnFirefox && !Build.DetectAPIOnFirefox) {
      el.contentEditable = "true";
      setupEventListener(wnd, "paste", Stop_, 1, 1);
    } else if (!OnChrome) {
      let plain = true;
      try {
        el.contentEditable = "plaintext-only";
      } catch {
        plain = false;
        el.contentEditable = "true";
      }
      setupEventListener(wnd, "paste", plain ? onPaste_not_cr! : Stop_, 1, 1)
    } else {
      el.contentEditable = "plaintext-only";
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredInputEventIsNotOnlyInShadowDOMV1
        && chromeVer_ < BrowserVer.MinEnsuredInputEventIsNotOnlyInShadowDOMV1) {
      // not check MinEnsuredShadowDOMV1 for smaller code
      setupEventListener(el, INP, onInput)
    }
    countEl = addElement(0, "c")
    createStyle(findCSS.i, styleInHUD = addElement("style") as HTMLStyleElement);
    // add `<div>` to fix that a body with backgroundColor doesn't follow border-radius on FF63; and on Linux
    // an extra <div> may be necessary for Ctrl+A: https://github.com/gdh1995/vimium-c/issues/79#issuecomment-540921532
    const box = OnFirefox
        && (Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowOfBodyRefuseShortcuts
            || firefoxVer_ > FirefoxBrowserVer.MinContentEditableInShadowOfBodyRefuseShortcuts - 1
            || Build.MinFFVer < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
               && firefoxVer_ < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
            || Build.OS & kBOS.LINUX_LIKE && (Build.OS === kBOS.LINUX_LIKE as number || os_ === kOS.linuxLike))
        ? addElement("div") as HTMLDivElement & SafeHTMLElement : body as HTMLBodyElement & SafeHTMLElement,
    root = OnEdge || OnFirefox
        && (Build.MinFFVer < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
          && firefoxVer_ < FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        ? box : attachShadow_(box),
    AlwaysInShadow = OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
            && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
    const root2 = AlwaysInShadow || !OnEdge && root !== box ? addElement("div") as HTMLDivElement : box
    setClassName_s(root2, "r" + fgCache.d)
    root2.spellcheck = false;
    appendNode_s(root2, list)
    if (AlwaysInShadow || !OnEdge && root !== box) {
      root_ = root as ShadowRoot
      // here can not use `box.contentEditable = "true"`, otherwise Backspace will break on Firefox, Win
      setupEventListener(root2, MDW, onMousedown, 0, 1)
      if (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend) {
        root.append!(root2, styleInHUD)
      } else {
        appendNode_s(root, root2)
        appendNode_s(root, styleInHUD)
      }
    } else {
      appendNode_s(docEl, styleInHUD)
    }
    OnChrome && Build.MinCVer >= BrowserVer.MinEnsured$Element$$role ? body.role = "textbox" :
    setOrRemoveAttr_s(body, "role", "textbox")
    OnSafari || OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredAriaProperties ? body.ariaMultiLine = true :
    setOrRemoveAttr_s(body, "aria-multiline", "true")
    if (AlwaysInShadow
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
            && FirefoxBrowserVer.MinEnsuredShadowDOMV1 <= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
        || !OnEdge && root2 !== body) {
      setClassName_s(body, fgCache.d.trim())
    }
    if (OnFirefox) {
      if (Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowOfBodyRefuseShortcuts || box !== body) {
        const css = findCSS.i, i1 = css.indexOf("body{"), i2 = css.indexOf("}", i1) + 1
        appendNode_s(innerDoc_.head! as HTMLHeadElement & SafeHTMLElement
            , createStyle(css.slice(i1, i2), addElement("style") as HTMLStyleElement))
        appendNode_s(body, box)
      }
    } else if (zoom < 1) {
      docEl.style.zoom = "" + 1 / zoom;
    }
    setDisplaying_s(outerBox_, 1)
    replaceOrSuppressMost_(kHandler.find, onHostKeydown)
    setFirstQuery(query0_)
    // fix that: Ctrl+F, "a", focus content, press `/` to enter find mode, then activeElement is indeed the <span ce>
    // but it's not in "input mode" and no characters can be typed
    OnChrome && timeout_(doFocus, 100)
}

const onIframeFocus = function (this: Window, event: Event): void {
  // here not stop prop, so that other extensions can trace where's keybaord focus
  if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted ? !event.isTrusted : event.isTrusted === false) {
    return
  }
  if (event.type === "blur") {
    const delta = getTime() - lastInputTime_
    if (delta <= (OnFirefox ? 100 : 35) && delta >= 0) {
      lastInputTime_ = 0
      timeout_(doFocus, 0)
    }
    return
  }
  doesCheckAlive && event.target === this && onWndFocus()
  OnFirefox || Stop_(event)
}

const onIframeUnload = (e: Event): void => {
  isActive && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted ? !e.isTrusted : e.isTrusted === false)
  && deactivate(FindAction.ExitUnexpectedly)
}

const onMousedown = function (this: Window | HTMLDivElement | HTMLBodyElement, event: MouseEventToPrevent): void {
  const target = event.target as Element
  if (isAlive_ && target !== input_
        && (!root_ || parentNode_unsafe_s(target as unknown as SafeElement) === this || target === this)
        && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
            ? event.isTrusted : event.isTrusted !== false)) {
    prevent_(event)
    doFocus()
    scrollTo_(compareDocumentPosition(target, input_) & kNode.DOCUMENT_POSITION_PRECEDING ? 2 : 1)
  }
}

const onPaste_not_cr = !OnChrome ? (event: ClipboardEvent & ToPrevent): void => {
    const d = event.clipboardData, text = d && isTY(d.getData, kTY.func) ? d.getData("text/plain") : "";
    prevent_(event);
    text && execCommand(kIT, 0, text)
} : 0 as never as null

const onIFrameKeydown = (event: KeyboardEventToPrevent): void => {
    Stop_(event)
    if ((!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
        ? !event.isTrusted : event.isTrusted === false) && (event as UserTrustedKeyboardEvent).z !== fgCache) { return }
    const n = event.keyCode
    const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event, i: n, v: ""}
    let isUp: boolean | 0 = event.type[3] > kChar.e && !set_isCmdTriggered(0)
    const isEscDownUp = OnFirefox && n === maybeEscIsHidden_ff && isUp && n && !keydownEvents_[n]
        && event.key === "Escape"
    if (!n || n === kKeyCode.ime || scroll_keyIsDown && onScrolls(eventWrapper) || isUp && !isEscDownUp) {
      if (isUp && keydownEvents_[n]) { keydownEvents_[n] = 0; prevent_(event) }
      return
    }
    OnFirefox && n === kKeyCode.esc && !isUp && set_maybeEscIsHidden_ff(0)
    const consumedByHost = currentKeys && checkKeyOnTop(eventWrapper),
    key = getMappedKey(eventWrapper, kModeId.Find), keybody = keybody_(key);
    const i: FindAction | KeyStat = consumedByHost ? FindAction.ConsumedByHost
      : key.includes("a-") && event.altKey ? FindAction.DoNothing
      : keybody === ENTER
        ? key > "s" ? FindAction.PassDirectly
          : suppressOnInput_ && key === ENTER ? FindAction.ResumeFind
          : (query0_ && post_({ H: kFgReq.findQuery, q: query0_ }), FindAction.ExitForEnter)
      : keybody !== DEL && keybody !== BSP
        ? isEscape_(key) ? FindAction.ExitForEsc
        : (<RegExpOne> /^[cm]-s-c$/).test(key) ? FindAction.CopySel : FindAction.DoNothing
      : OnFirefox && key[0] === "c" ? FindAction.CtrlDelete
      : query_ || (n === kKeyCode.deleteKey && Build.OS !== kBOS.MAC as number && (!(Build.OS & kBOS.MAC) || os_)
                    || isRepeated_(eventWrapper)) ? FindAction.PassDirectly
      : FindAction.Exit;
    let h = HandlerResult.Prevent, scroll: number;
    if (Build.NDEBUG && Build.Mangle || Build.MV3) { runtime_port || runtimeConnect() }
    if (i < FindAction.PassDirectly + 1) { h = HandlerResult.Suppress }
      else if (i || eventWrapper.v && (checkKey(eventWrapper, eventWrapper.v), 1)) { /* empty */ }
      else if (keybody !== key) {
        if (key === `a-${kChar.f1}`) {
          prepareCrop_();
          highlightRange(getSelected())
        }
        else if (key < "c" || key > "n") { h = HandlerResult.Suppress; }
        else if (scroll = keyNames_.indexOf(keybody), scroll > 2 && scroll - 5) {
          beginScroll(eventWrapper, key, keybody);
        }
        else if (keybody === kChar.j || keybody === kChar.k) { // not use `> kChar.i` in case of keys like `<c-j123>`
          onHostKeydown(eventWrapper)
        }
        else { h = HandlerResult.Suppress; }
      }
      else if (key === kChar.f1) { execCommand(DEL) }
      else if (key === kChar.f2) {
        OnFirefox && blur_unsafe(box_)
        focus()
        hasResults && focusFocusEdge(1)
      }
      else if (key === kChar.up || key === kChar.down) {
        scroll = historyIndex + (key < "u" ? -1 : 1)
        if (scroll >= 0) {
          historyIndex = scroll
          key > "u" ? send_(kFgReq.findQuery, scroll, setQuery) : setQuery(1)
        }
      }
      else { h = HandlerResult.Suppress; }
    h > HandlerResult.Prevent - 1 && (prevent_(event), consumeKey_mac(n, event))
    if (i < FindAction.DoNothing + 1) { /* empty */ }
    if (i < FindAction.DoNothing + 1) { /* empty */ }
    else if (i === FindAction.ResumeFind) {
      setQuery(input_.innerText.replace("\\0", ""))
    } else if (i === FindAction.CopySel) {
      post_({ H: kFgReq.copy, s: "" + getSelection_() })
    } else if (OnFirefox && i === FindAction.CtrlDelete) {
      const sel = getSelectionOf(innerDoc_)!
      // on Chrome 79 + Win 10 / Firefox 69 + Ubuntu 18, delete a range itself
      // while on Firefox 70 + Win 10 / FF 100 + W11 it collapses first, which is not expected
      isSelARange(sel) || modifySel(sel, 1, keybody > kChar.d, "word")
      execCommand(DEL)
    } else {
      i < FindAction.MinNotExit && deactivate(i)
    }
    if (OnFirefox && isEscDownUp && keydownEvents_[n]) { keydownEvents_[n] = 0; prevent_(event) }
}

const onHostKeydown = (event: HandlerNS.Event): HandlerResult => {
  let key = getMappedKey(event, kModeId.Find), keybody: kChar
  if (key === kChar.f2) {
    onUnexpectedBlur && onUnexpectedBlur()
    doFocus()
    return HandlerResult.Prevent
  } else if (key.length > 1 && "c-m-".includes(key[0] + key[1])
      && ((keybody = keybody_(key)) === kChar.j || keybody === kChar.k)) {
    if (!hasResults && wrapAround) { /* empty */ }
    else if (key.length > 4) {
      highlightMany()
    } else {
      executeFind("", { c: -(keybody > kChar.j), i: 1, t: options.t })
      if (options.m && !highlighting) { highlightTimeout_ ||= timeout_(highlightMany, 200) }
    }
    return HandlerResult.Prevent
  }
  if (!insert_Lock_() && isEscape_(key)) {
    prevent_(event.e) // safer
    deactivate(FindAction.ExitNoFocus) // should exit
    return HandlerResult.Prevent
  }
  return event.v ? HandlerResult.Prevent : HandlerResult.Nothing
}

  if (OnEdge
      || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredShadowDOMV1
      || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredShadowDOMV1) {
    if (later && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
          ? !later.isTrusted : later.isTrusted === false)) {
      return
    }
  }
  try {
    innerDoc_ = (isActive ? box_.contentDocument as HTMLDocument | null : null) as HTMLDocument | never
  } catch {}
  if (!innerDoc_) {
    if (isActive) {
      deactivate(FindAction.ExitUnexpectedly)
      hudTip(kTip.findFrameFail, 2)
    }
    return
  }
  const wnd = box_.contentWindow, f = wnd.addEventListener.bind(wnd) as typeof addEventListener,
  now = getTime(), t = true;
  let tick = 0;
  vApi.n = 0 as never as null
  if (OnFirefox) {
    setupEventListener(outerBox_, MDW, onMousedown, 0, 1)
  } else {
    outerBox_.onmousedown = onMousedown
  }
  f(MDW, onMousedown, t)
  f("keydown", onIFrameKeydown, t)
  f("keyup", onIFrameKeydown, t)
  f(INP, onInput, t)
  OnChrome || f("paste", onPaste_not_cr!, t)
  f(PGH, onIframeUnload, t)
  options.m && f("compositionstart", (): void => { clearTimeout_(highlightTimeout_) }, t)
  if (OnChrome) {
    f("compositionend", onInput, t)
  }
  suppressCommonEvents(wnd, CLK) // no `<a>`, so no `auxclick` events
  f(BU, onUnexpectedBlur = (event): void => {
    const delta = getTime() - now
    if (event && isActive && delta < 500 && delta > -99 && event.target === wnd) {
      wnd.closed || timeout_(doFocus, tick++ * 17)
    } else {
      setupEventListener(wnd, BU, onUnexpectedBlur, 1, 1)
      onUnexpectedBlur = null
    }
  }, t);
  f("focus", onIframeFocus, t)
  f("blur", onIframeFocus, t)

  box_.onload = later ? null as never : (e): void => {
    (e.target as typeof box_).onload = null as never; isActive && onLoad2()
  }
  if (later) { onLoad2() }
//#endregion
    }
    replaceOrSuppressMost_(kHandler.find)
    styleSelColorOut || initSelColors(AdjustType.NotAdjust)
    toggleSelectableStyle(1)
    isActive = 1
    appendNode_s(outerBox, box_)
    addUIElement(outerBox, AdjustType.DEFAULT, hud_box)
  }
}

const doFocus = (): void => {
  if (!isActive) { return }
  doesCheckAlive = 0
  // fix that: search for "a" in VFind, Ctrl+F, "a", Esc, select any normal text using mouse - then `/` can not refocus
  if (OnChrome && (Build.MinCVer >= BrowserVer.MinShadowDOMV0 ? root_! : root_ || innerDoc_).activeElement === input_) {
    input_.blur()
  }
  !OnFirefox && (!OnChrome || Build.MinCVer >= BrowserVer.MinFocusIframeDirectlyWithout$wnd$$focus
      || chromeVer_ > BrowserVer.MinFocusIframeDirectlyWithout$wnd$$focus - 1) || focusIframeContentWnd_(box_)
  focus_(input_)
  doesCheckAlive = 1
}

export const execCommand = (cmd: string, doc1?: Document | 0, value?: string): void => {
  (doc1 || innerDoc_).execCommand(cmd, false, value)
}

export const updateQuery = (query: string): void => {
  const normLetters = (str: string): string => {
    return str.normalize("NFD").replace(<RegExpG & RegExpSearchable<0>> /[\u0300-\u0331\u24b6-\u24e9\uff21-\uff56]/g
        , (ch: string): string => {
      const i = ch.charCodeAt(0)
      return i < 818 ? ""
          : String.fromCharCode(i - (i < 0x2500 ? i < 0x24d0 ? 0x24b6 - 65 : 0x24d0 - 97 : 0xff21 - 65))
    })
  }
  const WB = "\\b"
  let ww = suppressOnInput_ = !1, isRe: boolean | null = null, matches: string[] | null = null, delta: number
  let text: HTMLElement["innerText"] | undefined
  query_ = query0_ = query
  wrapAround = !0
  ignoreCase = null as boolean | null
  query = !isQueryRichText_ ? query : query.replace(<RegExpG & RegExpSearchable<0>> /\\[acirw0\\]/gi, (str): string => {
    let flag = str.charCodeAt(1), enabled = flag > kCharCode.a - 1
    if (flag === kCharCode.backslash) { return str }
    flag &= ~kCharCode.CASE_DELTA
    if (flag === kCharCode.I || flag === kCharCode.C) { ignoreCase = enabled === (flag === kCharCode.I) }
    else if (flag === kCharCode.R) { isRe = enabled }
    else if (flag === (kCharCode.N0 & ~kCharCode.CASE_DELTA)) { suppressOnInput_ = 1 }
    else if (isRe) { return str }
    else { flag > kCharCode.A ? ww = enabled : wrapAround = enabled }
    return ""
  })
  if (isQueryRichText_) {
    if (isRe === null && !ww) {
      isRe = fgCache.r;
      delta = 2 * +query.startsWith(WB) + +query.endsWith(WB)
      if (delta === 3 && !isRe && query.length > 3) {
        query = query.slice(2, -2);
        ww = true;
      } else if (delta && delta < 3) {
        isRe = true;
      }
    }
    text = query.replace(<RegExpG & RegExpSearchable<0>> /\\\\/g, "\\")
    if (OnChrome ? ww && isRe : ww) {
      query = WB + escapeAllForRe(text) + WB
      ww = false;
      isRe = true;
    }
    query = isRe ? query !== "\\b\\b" && query !== WB ? query : "" : text
  }
  parsedQuery_ = query
  isRegex = !!isRe
  wholeWord = ww
  notEmpty = !!query
  ignoreCase = ignoreCase != null ? ignoreCase : Lower(query) === query
  const didNorm = !isRe && !!latest_options_.n
  isRe || (query = isActive ? escapeAllForRe(didNorm ? normLetters(query) : query) : "")

  let re: RegExpG | null = query && tryCreateRegExp(ww ? WB + query + WB : query, (ignoreCase ? "gim" : "gm") as "g")
      || null
  if (re && !suppressOnInput_) {
    let now = getTime()
    if (cachedInnerText && cachedInnerText.n === didNorm && (delta = abs_(now - cachedInnerText.t))
          < (didNorm || cachedInnerText.i.length > 1e5 ? 6e3 : 3e3)) {
      query = cachedInnerText.i
      delta < 500 && (cachedInnerText.t = now)
    } else {
      let el = fullscreenEl_unsafe_()
      while (el && (el as ElementToHTML).lang == null) { // in case of SVG elements
        el = GetParent_unsafe_(el, PNType.DirectElement);
      }
      query = el && isTY(text = (el as HTMLElement).innerText) && text ||
          (OnFirefox ? (docEl_unsafe_() as SafeHTMLElement).innerText
            : (docEl_unsafe_() as HTMLElement).innerText as string + "")
      query = didNorm ? normLetters(query) : query
      cachedInnerText = { i: query, t: now, n: didNorm }
    }
    matches = query.match(re)
  }
  regexMatches = isRe ? matches : null
  parsedRegexp_ = isRe ? re : null
  activeRegexIndex = 0
  matchCount = matches ? matches.length : 0
}

export const executeFind = (query: string | null, options: Readonly<ExecuteOptions>): void => {
/**
 * According to https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/editor.cc?q=FindRangeOfString&g=0&l=815 ,
 * the range to find is either `[selection..docEnd]` or `[docStart..selection]`,
 * so those in shadowDOM / ancestor tree scopes will still be found.
 * Therefore `@styleIn_` is always needed, and VFind may not need a sub-scope selection.
 */
    const _do_find_not_cr = !OnChrome ? function (): boolean {
      // (string, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog);
      try {
        return reflectApply_not_cr!(window.find, window, arguments)
      } catch { return false; }
    } as Window["find"] : 0 as never as null
    const focusHUD = OnFirefox && isActive && innerDoc_.hasFocus()
    let el: LockableElement | null, highlight = safer(options).h, noColor = highlight || options.noColor
      , newRange: Range | null
      , newAnchor: false | Node | null | void | Element | 0, posChange: false | kNode | null
      , found: boolean, count = (options.c! | 0) || 1, back = count < 0
      , par: Element | 0 | null | undefined, timesRegExpNotMatch = 0
      , q: string, notSens = ignoreCase && !options.caseSensitive
    /** Note: FirefoxBrowserVer.MinFollowSelectionColorOnInactiveFrame
     * Before Firefox 68, it's impossible to replace the gray bg color for blurred selection:
     * In https://hg.mozilla.org/mozilla-central/file/tip/layout/base/nsDocumentViewer.cpp#l3463 ,
     * `nsDocViewerFocusListener::HandleEvent` calls `SetDisplaySelection(SELECTION_DISABLED)`,
     *   if only a trusted "blur" event gets dispatched into Document
     * See https://bugzilla.mozilla.org/show_bug.cgi?id=1479760 .
     */
    noColor || toggleStyle(0)
    back && (count = -count);
    const isRe = isRegex, pR = parsedRegexp_
    const wndSel = getSelection_()
    let regexpNoMatchLimit = 9 * count, dedupID = count + 1, oldReInd: number, selNone: boolean
    let oldAnchor = !options.j && wrapAround && getAccessibleSelectedNode(getSelected()), curSel: Selection
    while (0 < count) {
      oldReInd = activeRegexIndex
      q = query || (!isRe ? parsedQuery_ : !regexMatches ? "" : regexMatches[
            activeRegexIndex = highlight
                ? back ? max_(0, oldReInd - 1) : min_(oldReInd + 1, matchCount - 1)
                : (oldReInd + (back ? -1 : 1) + matchCount) % matchCount])
      found = !!q && (!OnChrome
        ? _do_find_not_cr!(q, !notSens, back, !highlight && wrapAround, wholeWord, false, false)
        : window.find(q, !notSens, back, !highlight && wrapAround, wholeWord, false, false)
      )
      if (OnFirefox && !found && !highlight && wrapAround && q) {
        resetSelectionToDocStart();
        found = _do_find_not_cr!(q, !notSens, back, true, wholeWord, false, false)
      }
      if (!found) { break }
      // if true, then the matched text may have `user-select: none`
      selNone = dedupID > count && !(wndSel as SelWithToStr + "")
      /**
       * Warning: on Firefox and before {@link #FirefoxBrowserVer.Min$find$NotReturnFakeTrueOnPlaceholderAndSoOn},
       * `found` may be unreliable,
       * because Firefox may "match" a placeholder and cause `getSelection().type` to be `"None"`
       */
      if (pR && !selNone && (par = getSelectionParent_unsafe(curSel = getSelected(), pR)) === 0
          && timesRegExpNotMatch++ < regexpNoMatchLimit) {
        activeRegexIndex = oldReInd
      } else if (highlight) {
        const sx = highlight[0] - scrollX, sy = highlight[1] - scrollY
        ; (sx || sy) && scrollWndBy_(sx, sy)
        curSel = getSelected()
        let rect = getSelectionBoundingBox_(curSel)
        rect = sx || sy ? rect : rect && cropRectS_(rect)
        if (rect) { back ? highlight[2].unshift(rect) : highlight[2].push(rect) }
        else if (!OnFirefox && (newAnchor = getAccessibleSelectedNode(curSel, 1))
            && (newAnchor = getNodeChild_(newAnchor, curSel, 1))) {
          newRange = selRange_(curSel, 1).cloneRange()
          back ? newRange.setEndBefore(newAnchor) : newRange.setStartAfter(newAnchor)
          newRange.collapse(!back)
          resetSelectionToDocStart(curSel, newRange)
        }
        count--
        timesRegExpNotMatch = 0
      } else {
        count--;
      }
      if (selNone) {
        dedupID = highlight ? 2 : ++count
        modifySel(wndSel, 0, !back, kGCh)
      }
    }
    if (found! && !highlight && (par = par || getSelectionParent_unsafe(curSel = getSelected()))) {
      newAnchor = getAccessibleSelectedNode(curSel!)
      posChange = oldAnchor && newAnchor && compareDocumentPosition(oldAnchor, newAnchor)
      newAnchor = newAnchor && (isNode_(newAnchor, kNode.TEXT_NODE) ? parentNode_unsafe_s(newAnchor)!
          : getNodeChild_(newAnchor, curSel!))
      scrollSelectionAfterFind(par, newAnchor && isNode_(newAnchor, kNode.ELEMENT_NODE) ? newAnchor : 0, curSel!)
      if (posChange && /** go back */ !!(posChange & kNode.DOCUMENT_POSITION_PRECEDING) !== back) {
        hudTip(kTip.wrapWhenFind, 1, VTr(back ? kTip.atStart : kTip.atEnd))
      }
    }
    found! && options.t && extendToCurRange(initialRange!, hasInitialRange!)
    noColor || timeout_(hookSel, 0);
    (el = insert_Lock_()) && !isSelected_() && el.blur();
    OnFirefox && focusHUD && doFocus()
    if (!options.i) {
      hasResults = found!
    }
}

const scrollSelectionAfterFind = (par: Element, newAnchor: Element | 0, sel: Selection): void => {
  type TextStyleArr = readonly [font: string, lineHeight: number, clientWidth: number, clientHeight: number
      , fontSize: number, borderInlineStart: number, paddingInlineStart: number, textOffsetTop: number
      , whiteSpace: string]
  const kMayInTextBox = !OnFirefox
  const kHasInlineStart = !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinCSSBlockInlineStartEnd)
      const newStyle = newAnchor && getComputedStyle_(newAnchor)
      const specialFixForTransparent = newStyle && newStyle.color!.includes("(0, 0, 0")
      const px2int = (s: string) => +s.slice(0, -2)
      const ltr = newStyle && newStyle.direction !== "rtl"
      const textStyle: TextStyleArr | BOOL = !kMayInTextBox || !newStyle
          || getEditableType_<0>(newAnchor) < EditableType.MaxNotTextBox + 1 ? 0
          : (newStyle.writingMode as "hor*" | "vert*" | "side*" | /** < C48 */ "lr*" | "rl*" | "tb*")[0] > "s"
          ? 1
          : [newStyle.font!, px2int(newStyle.lineHeight!),
              dimSize_(newAnchor as TextElement, kDim.elClientW),
              dimSize_(newAnchor as TextElement, kDim.elClientH),
              px2int(newStyle.fontSize!),
              px2int(kHasInlineStart ? (newStyle as any).borderInlineStartWidth
                  : ltr ? newStyle.borderLeftWidth! : newStyle.borderRightWidth!),
              px2int(kHasInlineStart ? (newStyle as any).paddingInlineStart
                  : ltr ? newStyle.paddingLeft! : newStyle.paddingRight!),
              px2int(newStyle.paddingTop!) + px2int(newStyle.borderTopWidth!),
              newStyle.whiteSpace!
              ] satisfies TextStyleArr as TextStyleArr
  const scrollManually = OnChrome && latest_options_ && latest_options_.u
  let context: CanvasRenderingContext2D, widthOrEnd: number
  // `window.find()` may auto make a target scroll into view smoothly, but a manual `scrollBy` breaks the animation
  const oldInvisibility = isSafeEl_(par) && (!OnChrome || kMayInTextBox && isTY(textStyle, kTY.obj) || scrollManually
      ? view_(par) : isNotInViewport(par))
  let selRect: Rect | undefined | null
  const flashOutline = (): void => {
    if (selRect = textStyle ? selRect : getSelectionBoundingBox_(sel, 1)) {
      removeFlash && removeFlash()
      set_removeFlash(flash_(null, selRect, +oldInvisibility && (800 + GlobalConsts.DefaultRectFlashTime), " Sel"))
    }
  }
  const tick = ++delayedScrollIntoViewTick_
  if (kMayInTextBox && isTY(textStyle, kTY.obj)) {
        context = (canvas = canvas || createElement_("canvas")).getContext("2d")!
        const full = (newAnchor as TextElement).value.slice(0
            , textOffset_(newAnchor as TextElement, VisualModeNS.kDir.right)!)
        let offset = textOffset_(newAnchor as TextElement)!
        const strArrBefore = full.slice(0, offset).split("\n"), lineStrBefore = strArrBefore.pop()!
        const getWidth = (s: string): number =>
            s.length < 400 ? context.measureText(s).width : s.length * textStyle[4] / 2
        context.font = textStyle[0]
    const has_neg_sc_pos = !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredNegativeScrollPosIfRTL
        || chromeVer_ > BrowserVer.MinEnsuredNegativeScrollPosIfRTL - 1)
    const max_width = textStyle[2]
    const baseScPosX = has_neg_sc_pos || ltr ? 0 : dimSize_(newAnchor as TextElement, kDim.scrollW) - max_width
    let start = getWidth(lineStrBefore), top = strArrBefore.length
    if (getEditableType_<0>(newAnchor as Element) < EditableType.TextArea + 1
        && textStyle[8] !== "pre" && textStyle[8] !== "nowrap") {
      widthOrEnd = max_width / textStyle[4] * 2
      top = strArrBefore.reduce((old, x): number => old + math.ceil(x.length / widthOrEnd), 0)
          + ((start / max_width) | 0)
      start %= max_width
    }
    top *= textStyle[1]
    const scX = (ltr ? 1 : -1) * max_(0, start - max_width / 2) + baseScPosX
    const scY = max_(0, top - (textStyle[3] - textStyle[1]) / 2)
    if (OnChrome && Build.MinCVer < BrowserVer.Min$ScrollBehavior$$Instant$InScrollIntoView
        && oldInvisibility && isNotInViewport(newAnchor as TextElement)) { /* empty */ }
    else if ((OnChrome ? Build.MinCVer >= BrowserVer.MinEnsuredCSS$ScrollBehavior : !OnEdge)
        || (newAnchor as Element).scrollTo) {
      (newAnchor as TextElement).scrollTo(instantScOpt(scX, scY))
    } else {
      ; (newAnchor as TextElement).scrollLeft = scX
      ; (newAnchor as TextElement).scrollTop = scY
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinNoSelectionColorOnTextBoxWhenFindModeHUDIsFocused
        && chromeVer_ < BrowserVer.MinNoSelectionColorOnTextBoxWhenFindModeHUDIsFocused) {
      /** empty */
    } else {
      selRect = boundingRect_(newAnchor as TextElement)
      widthOrEnd = max_(4, getWidth(full.slice(offset).split("\n", 1)[0]))
      offset = dimSize_(newAnchor as TextElement, kDim.scPosX)
      offset = ltr ? offset : max_(0, has_neg_sc_pos ? -offset : baseScPosX - offset)
      start = max_(0, textStyle[6] + min_(start - offset, max_width))
      widthOrEnd = min_(start + widthOrEnd, max_width)
      offset = ltr ? selRect.l + textStyle[5] : selRect.r - textStyle[5]
      top += selRect.t + textStyle[7] - dimSize_(newAnchor as TextElement, kDim.scPosY)
      selRect = {
        l: ltr ? offset + start : offset - widthOrEnd, t: top,
        r: ltr ? offset + widthOrEnd : offset - start, b: top + textStyle[1]
      }
      flashOutline()
    }
    isActive || (canvas = null)
  } else if (OnChrome && oldInvisibility && !scrollManually) {
    selRect = boundingRect_(newAnchor as SafeElement)
    timeout_(() => {
      const hasScrolled = (rect2: Rect, threshold: number): boolean =>
          abs_(rect2.t - selRect!.t) > threshold || abs_(rect2.l - selRect!.l) > threshold
      if (tick !== delayedScrollIntoViewTick_) { /** empty */ }
      else if (hasScrolled(boundingRect_(newAnchor as SafeElement), 2)) {
        timeout_((): void => {
          if (tick === delayedScrollIntoViewTick_) {
            hasScrolled(boundingRect_(newAnchor as SafeElement), 15) || view_(newAnchor as SafeElement)
            flashOutline()
          }
        }, 200)
      } else {
        view_(newAnchor as SafeElement)
        flashOutline()
      }
    }, 50)
  } else {
    flashOutline()
  }
  specialFixForTransparent && (styleSelColorOut!.disabled = !0)
}

const hookSel = (t?: TimerType.fake | 1): void => {
  setupEventListener(0, "selectionchange", /*#__NOINLINE__*/ toggleStyle, t as BOOL | undefined)
}

  /** must be called after initing */
const toggleStyle = (disable: BOOL | boolean | Event): void => {
    const sout = styleSelColorOut, sin = styleSelColorIn
    if (!sout) { return; }
    hookSel(1)
    disable = !!disable;
    // Note: `<doc/root>.adoptedStyleSheets` should not be modified in an extension world
    if (!isActive && disable) {
      toggleSelectableStyle()
      removeEl_s(sout); removeEl_s(sin!)
      styleSelColorOut = styleSelColorIn = null as never
      return;
    }
    if (parentNode_unsafe_s(sout) !== ui_box) {
      ui_box!.insertBefore(sout, styleSelectable && parentNode_unsafe_s(styleSelectable) === ui_box
          ? styleSelectable : null)
      if (OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
          || OnFirefox || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
          || !OnEdge && sin !== sout) {
        addUIElement(sin!, AdjustType.NotAdjust, true)
      }
    }
    sout.sheet && (sout.sheet.disabled = disable);
    sin!.sheet && (sin!.sheet.disabled = disable)
}

export const toggleSelectableStyle = (enable?: 1): void => {
  !enable || docSelectable_ && !findCSS.s.includes("\n")
  ? styleSelectable && (removeEl_s(styleSelectable), styleSelectable = null)
  : appendNode_s(ui_box!, styleSelectable = createStyle(findCSS.s, styleSelectable))
}

export const extendToCurRange = (range: Range, hasRange: 0 | 1 | 2, abortCur?: boolean
    , hasStyle?: StyleSheet | null): void => {
  const sel = getSelected(), focused = getAccessibleSelectedNode(sel, 1), focusedOffset = selOffset_(sel, 1),
  anchor = (!OnFirefox || focused) && getAccessibleSelectedNode(sel), anchorOffset = selOffset_(sel),
  isCurLeft = abortCur || !!focused && !getDirectionOfNormalSelection(sel, anchor, focused)
  hasStyle && toggleStyle(1)
  if (hasRange && (abortCur || focused && getEditableType_<0>(singleSelectionElement_unsafe(sel) || docEl_unsafe_()!
        ) < EditableType.MaxNotTextBox + 1)) {
    const { startContainer: start, startOffset, endContainer: end, endOffset } = range
    const isLeft = abortCur ? hasRange < 2 : anchor && (start === focused ? focusedOffset < startOffset
        : compareDocumentPosition(start, focused!) & kNode.DOCUMENT_POSITION_PRECEDING)
    getSelection_().setBaseAndExtent(isLeft ? end : start, isLeft ? endOffset : startOffset
        , abortCur ? isLeft ? start : end : isLeft !== isCurLeft ? anchor! : focused!
        , abortCur ? isLeft ? startOffset : endOffset : isLeft !== isCurLeft ? anchorOffset : focusedOffset)
  }
}
