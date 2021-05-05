import {
  setupEventListener, VTr, keydownEvents_, isAlive_, suppressCommonEvents, onWndFocus, timeout_, safer, fgCache,
  doc, getTime, chromeVer_, deref_, escapeAllForRe, tryCreateRegExp, vApi, callFunc, clearTimeout_, Stop_, isTY, Lower,
  math, max_, min_, OnFirefox, OnChrome, OnEdge, firefoxVer_
} from "../lib/utils"
import {
  pushHandler_, replaceOrSuppressMost_, removeHandler_, prevent_, getMappedKey, keybody_, isEscape_, keyNames_,
  DEL, BSP, ENTER,
} from "../lib/keyboard_utils"
import {
  attachShadow_, getSelectionFocusEdge_, activeEl_unsafe_, rangeCount_, setClassName_s, compareDocumentPosition,
  getEditableType_, scrollIntoView_, SafeEl_not_ff_, GetParent_unsafe_, focus_, fullscreenEl_unsafe_, docEl_unsafe_,
  getSelection_, isSelected_, docSelectable_, isHTML_, createElement_, CLK, MDW, removeEl_s, appendNode_s,
  setDisplaying_s,
  getAccessibleSelectedNode,  INP, BU, UNL, contains_s, setOrRemoveAttr_s, textContent_s, modifySel, parentNode_unsafe_s
} from "../lib/dom_utils"
import {
  wdZoom_, prepareCrop_, view_, dimSize_, selRange_, getZoom_, padClientRect_, getSelectionBoundingBox_,
  cropRectToVisible_,
} from "../lib/rect"
import {
  ui_box, ui_root, getSelectionParent_unsafe, resetSelectionToDocStart, getBoxTagName_old_cr, collpaseSelection,
  createStyle, getSelectionText, checkDocSelectable, adjustUI, ensureBorder, addUIElement, getSelected, flash_,
  getSelectionOf
} from "./dom_ui"
import { highlightRange, activate as visualActivate, visual_mode_name } from "./visual"
import { keyIsDown as scroll_keyIsDown, beginScroll, onScrolls } from "./scroller"
import { scrollToMark, setPreviousMarkPosition } from "./marks"
import { hudHide, hud_box, hudTip, hud_opacity, toggleOpacity as hud_toggleOpacity } from "./hud"
import { post_, send_, runFallbackKey } from "./port"
import { insert_Lock_, setupSuppress } from "./insert"
import { lastHovered_, set_lastHovered_, select_ } from "./async_dispatcher"

export declare const enum FindAction {
  PassDirectly = -1,
  DoNothing = 0, Exit, ExitNoAnyFocus, ExitNoFocus, ExitUnexpectedly,
  MaxExitButNoWork = ExitUnexpectedly, MinExitAndWork,
  ExitAndReFocus = MinExitAndWork, ExitToPostMode,
  MinNotExit, CtrlDelete = MinNotExit,
}
interface ExecuteOptions extends Partial<Pick<CmdOptions[kFgCmd.findMode], "c">> {
  /** highlight */ h?: [number, number] | false;
  /** ignore$hasResult */ i?: 1;
  /** just inputted */ j?: 1;
  noColor?: BOOL | boolean
  caseSensitive?: boolean;
}

let isActive = false
let query_ = ""
let query0_ = ""
let parsedQuery_ = ""
let parsedRegexp_: RegExpG | null = null
let historyIndex = 0
let notEmpty = false
let isQueryRichText_ = true
let isRegex: boolean | null = null
let ignoreCase: boolean | null = null
let wholeWord = false
let wrapAround = true
let hasResults = false
let matchCount = 0
let postOnEsc: boolean
let doesNormalizeLetters: boolean
let coords: null | MarksNS.ScrollInfo = null
let initialRange: Range | null = null
let activeRegexIndex = 0
let regexMatches: string[] | null = null
let root_: ShadowRoot | null = null
let box_: HTMLIFrameElement = null as never
let outerBox_: HTMLDivElement = null as never
let innerDoc_: HTMLDocument = null as never
let input_: SafeHTMLElement = null as never
let countEl: SafeHTMLElement = null as never
let findCSS: FindCSS = null as never
let styleSelColorIn: HTMLStyleElement | null | undefined
let styleSelColorOut: HTMLStyleElement | null | undefined
let styleSelectable: HTMLStyleElement | null | undefined
let styleInHUD: HTMLStyleElement | null = null
let onUnexpectedBlur: ((this: unknown, event?: Event) => void) | null = null
let doesCheckAlive: BOOL = 0
let highlighting: (() => void) | undefined | null
let isSmall = false
let postLock: Element | null = null
let cachedInnerText: { /** innerText */ i: string, /** timestamp */ t: number, n: boolean } | null | undefined
let deactivate: (i: FindAction) => void

export { findCSS, query_ as find_query, hasResults as find_hasResults, box_ as find_box, styleSelectable,
    styleInHUD, styleSelColorOut, input_ as find_input, deactivate }
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
  /** return an element if no <a> else null */
  const focusFoundLinkIfAny = (): SafeElement | null | void => {
    let cur = OnFirefox ? getSelectionParent_unsafe(getSelected()) as SafeElement | null
        : SafeEl_not_ff_!(getSelectionParent_unsafe(getSelected()))
    for (let i = 0, el: Element | null = cur; el && el !== doc.body && i++ < 5;
        el = GetParent_unsafe_(el, PNType.RevealSlotAndGotoParent)) {
      if (el.localName === "a") {
        return focus_(el as SafeElement)
      }
    }
    return cur;
  }

    findCSS = options.f || findCSS;
    if (!isHTML_()) { return; }
    let query: string = options.s ? getSelectionText() : "";
    (query.length > 99 || query.includes("\n")) && (query = "");
    isQueryRichText_ = !query
    query || (query = options.q);
    isActive || query === query_ && options.l || setPreviousMarkPosition()
    checkDocSelectable();
    ensureBorder()


  /** Note: host page may have no range (type is "None"), if:
   * * press <Enter> on HUD to exit FindMode
   * * a host script has removed all ranges
   */
  deactivate = deactivate || ((i: FindAction): void => {
    let sin = styleSelColorIn, noStyle = !sin || !parentNode_unsafe_s(sin), hasResult = hasResults
      , maxNotRunPost = postOnEsc ? FindAction.ExitAndReFocus - 1 : FindAction.ExitToPostMode - 1
      , el: SafeElement | null | undefined, el2: Element | null
    i === FindAction.ExitNoAnyFocus ? hookSel(1) : focus()
    coords && scrollToMark(coords)
    hasResults = isActive = isSmall = notEmpty = postOnEsc = doesNormalizeLetters = wholeWord = false
    wrapAround = true
    removeHandler_(kHandler.find)
    outerBox_ && removeEl_s(outerBox_)
    highlighting && highlighting()
    if (box_ === deref_(lastHovered_)) { set_lastHovered_(null) }
    parsedQuery_ = query_ = query0_ = ""
    historyIndex = matchCount = doesCheckAlive = 0;
    styleInHUD = onUnexpectedBlur = outerBox_ = isRegex = ignoreCase =
    box_ = innerDoc_ = root_ = input_ = countEl = parsedRegexp_ =
    initialRange = regexMatches = coords = cachedInnerText = null as never
    if (i > FindAction.MaxExitButNoWork) {
      el = getSelectionFocusEdge_(getSelected())
      el && focus_(el)
    }
    if ((i === FindAction.ExitAndReFocus || !hasResult || visual_mode_name) && !noStyle) {
      toggleStyle(1)
      restoreSelection(true)
    }
    if (visual_mode_name) {
      visualActivate(safer<CmdOptions[kFgCmd.visualMode]>({ r: true }))
      return;
    }
    if (i > FindAction.MaxExitButNoWork && hasResult && (!el || el !== insert_Lock_())) {
      let container = focusFoundLinkIfAny()
      if (container && i === FindAction.ExitAndReFocus && (el2 = activeEl_unsafe_())
          && getEditableType_<0>(el2) > EditableType.TextBox - 1 && contains_s(container, el2)) {
        prepareCrop_();
        select_(el2 as LockableElement).then((): void => {
          toggleSelectableStyle()
          i > maxNotRunPost && postActivate()
        })
        return
      } else if (el) {
        // always call scrollIntoView if only possible, to keep a consistent behavior
        OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions ? fixTabNav_cr_old(el) : scrollIntoView_(el)
      }
    }
    toggleSelectableStyle()
    if (i > maxNotRunPost) {
      postActivate()
    }
  })

  if (options.l) {
      if (query = query || query_) {
        styleSelColorOut || initSelColors(AdjustType.MustAdjust)
        if (query !== query_) {
          updateQuery(query)
          if (isActive) {
            textContent_s(input_, query.replace(<RegExpOne> /^ /, "\xa0"))
            showCount(1)
          }
        }
        isQueryRichText_ = true
        const hud_showing = !isActive && hud_opacity === 1
        hud_showing && hud_toggleOpacity("0")
        toggleSelectableStyle()
        executeFind("", options)
        if (hasResults && options.m) {
          getZoom_()
          highlightInViewport()
        }
        hud_showing && hud_toggleOpacity("")
        if (!hasResults) {
          toggleStyle(1)
          if (!isActive) {
            toggleSelectableStyle()
            runFallbackKey(options, kTip.noMatchFor, query)
          }
        } else {
          focusFoundLinkIfAny()
          postActivate()
        }
      } else {
        hudTip(kTip.noOldQuery)
      }
      return
  }
    postOnEsc = options.p
    doesNormalizeLetters = options.n
    if (OnChrome && (Build.MinCVer >= BrowserVer.MinBorderWidth$Ensure1$Or$Floor
          || chromeVer_ > BrowserVer.MinBorderWidth$Ensure1$Or$Floor - 1)) {
      getZoom_()
    }
  if (isActive) {
      adjustUI()
      hudHide(TimerType.noTimer);
      setFirstQuery(query)
  } else {
    if (initialRange = selRange_(getSelected())) {
      collpaseSelection(getSelection_()) // `range.collapse` doesn't work when inside a ShadowRoot (C72)
    } else {
      (initialRange = doc.createRange()).setStart(doc.body || docEl_unsafe_()!, 0)
    }
    initialRange.collapse(!0)
    if (options.r) { coords = [scrollX, scrollY] }

    parsedQuery_ = query_ = ""
    parsedRegexp_ = regexMatches = null
    activeRegexIndex = 0
    query_ || (query0_ = query)

    const outerBox = outerBox_ = createElement_(OnChrome
        && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div"),
    st = outerBox.style
    st.width = "0";
    setDisplaying_s(outerBox)
    if (!OnFirefox && wdZoom_ !== 1) { st.zoom = "" + 1 / wdZoom_; }
    setClassName_s(outerBox, "R UI HUD" + fgCache.d)
    box_ = createElement_("iframe")
    setClassName_s(box_, "R UI Find")
    box_.onload = vApi.n
    replaceOrSuppressMost_(kHandler.find)
    styleSelColorOut || initSelColors(AdjustType.NotAdjust)
    toggleSelectableStyle(1);
    isActive = true
    appendNode_s(outerBox, box_)
    addUIElement(outerBox, AdjustType.DEFAULT, hud_box);
  }
}

export const onLoad = (later?: Event): void => {

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
    addElement(0, "s").dataset.vimium = "/"
    const el = input_ = addElement(0, "i")
    addElement(0, "h");
    if (OnFirefox && !Build.DetectAPIOnFirefox) {
      el.contentEditable = "true";
      setupEventListener(wnd, "paste", null, 1, 1);
    } else if (!OnChrome) {
      let plain = true;
      try {
        el.contentEditable = "plaintext-only";
      } catch {
        plain = false;
        el.contentEditable = "true";
      }
      setupEventListener(wnd, "paste", plain ? onPaste_not_cr! : null, 1, 1)
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
        && (Build.MinFFVer < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
            && firefoxVer_ < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
            || fgCache.o === kOS.unixLike)
        ? addElement("div") as HTMLDivElement & SafeHTMLElement : body as HTMLBodyElement & SafeHTMLElement,
    root = OnEdge || OnFirefox
        && (Build.MinFFVer < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
          && firefoxVer_ < FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        ? box : attachShadow_(box),
    inShadow = OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
            && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
        || !OnEdge && root !== box,
    root2 = OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
            && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
        || !OnEdge && inShadow ? addElement("div") as HTMLDivElement : box
    setClassName_s(root2, "r" + fgCache.d)
    root2.spellcheck = false;
    appendNode_s(root2, list)
    setOrRemoveAttr_s(box, "role", "textbox")
    setOrRemoveAttr_s(box, "aria-multiline", "true")
    if (OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
            && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
        || !OnEdge && inShadow) {
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
    if (OnFirefox) {
      if (box !== body) {
        appendNode_s(innerDoc_.head! as HTMLHeadElement & SafeHTMLElement
            , createStyle("body{margin:0!important}", addElement("style") as HTMLStyleElement))
        appendNode_s(body, box)
      }
    } else if (zoom < 1) {
      docEl.style.zoom = "" + 1 / zoom;
    }
    if (OnChrome && Build.MinCVer >= BrowserVer.MinShadowDOMV0
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
        || !OnEdge && root2 !== body) {
      setClassName_s(body, fgCache.d.trim())
    }
    setDisplaying_s(outerBox_, 1)
    replaceOrSuppressMost_(kHandler.find, onHostKeydown)
    // delay hudHide, so that avoid flicker on Firefox
    hudHide(TimerType.noTimer);
    setFirstQuery(query0_)
  }

const onIframeFocus = function (this: Window, event: Event): void {
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
    const text = input_.firstChild as Text
    text && getSelectionOf(innerDoc_)!.collapse(text, target !== input_.previousSibling ? text.data.length : 0)
  }
}

const onPaste_not_cr = !OnChrome ? (event: ClipboardEvent & ToPrevent): void => {
    const d = event.clipboardData, text = d && isTY(d.getData, kTY.func) ? d.getData("text/plain") : "";
    prevent_(event);
    text && execCommand("insertText", 0, text)
} : 0 as never as null

const onIFrameKeydown = (event: KeyboardEventToPrevent): void => {
    Stop_(event);
    const n = event.keyCode
    if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
        ? !event.isTrusted : event.isTrusted === false) { return; }
    if (n === kKeyCode.ime || scroll_keyIsDown && onScrolls(event) || event.type === "keyup") { return; }
    const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event, i: n},
    key = getMappedKey(eventWrapper, kModeId.Find), keybody = keybody_(key);
    const i: FindAction | KeyStat = key.includes("a-") && event.altKey ? FindAction.DoNothing
      : keybody === ENTER
        ? key > "s" ? FindAction.PassDirectly
          : (query_ && post_({ H: kFgReq.findQuery, q: query0_ }), FindAction.ExitToPostMode)
      : keybody !== DEL && keybody !== BSP
        ? isEscape_(key) ? FindAction.ExitAndReFocus : FindAction.DoNothing
      : OnFirefox && fgCache.o === kOS.unixLike && "cs".includes(key[0])
        ? FindAction.CtrlDelete
      : query_ || (n === kKeyCode.deleteKey && fgCache.o || event.repeat) ? FindAction.PassDirectly
      : FindAction.Exit;
    let h = HandlerResult.Prevent, scroll: number;
    if (!i) {
      if (keybody !== key) {
        if (key === `a-${kChar.f1}`) {
          prepareCrop_();
          highlightRange(getSelected())
        }
        else if (key < "c-" || key > "m-") { h = HandlerResult.Suppress; }
        else if (scroll = keyNames_.indexOf(keybody), scroll > 2 && scroll & 5 ^ 5) {
          beginScroll(eventWrapper, key, keybody);
        }
        else if (keybody === kChar.j || keybody === kChar.k) { // not use `> kChar.i` in case of keys like `<c-j123>`
          onHostKeydown(eventWrapper)
        }
        else { h = HandlerResult.Suppress; }
      }
      else if (keybody === kChar.f1) { execCommand(DEL) }
      else if (keybody === kChar.f2) {
        OnFirefox && box_.blur()
        focus(); keydownEvents_[n] = 1;
      }
      else if (keybody === kChar.up || keybody === kChar.down) {
        scroll = historyIndex + (keybody < "u" ? -1 : 1)
        if (scroll >= 0) {
          historyIndex = scroll
          if (keybody > "u") {
            send_(kFgReq.findQuery, { i: scroll }, setQuery)
          } else {
            execCommand("undo")
            collpaseSelection(getSelectionOf(innerDoc_)!, VisualModeNS.kDir.right)
          }
        }
      }
      else { h = HandlerResult.Suppress; }
    } else if (i === FindAction.PassDirectly) {
      h = HandlerResult.Suppress;
    }
    h < HandlerResult.Prevent || prevent_(event);
    if (i < FindAction.DoNothing + 1) { return; }
    keydownEvents_[n] = 1;
    if (OnFirefox && i === FindAction.CtrlDelete) {
      const sel = getSelectionOf(innerDoc_)!
      // on Chrome 79 + Win 10 / Firefox 69 + Ubuntu 18, delete a range itself
      // while on Firefox 70 + Win 10 it collapses first
      sel.type === "Caret" && modifySel(sel, 1, keybody > kChar.d, "word")
      execCommand(DEL)
      return;
    }
    deactivate(i)
}

const onHostKeydown = (event: HandlerNS.Event): HandlerResult => {
    let key = getMappedKey(event, kModeId.Find), keybody: kChar
    if (key === kChar.f2) {
      onUnexpectedBlur && onUnexpectedBlur()
      doFocus()
      return HandlerResult.Prevent;
    } else if (key.length > 1 && "c-m-".includes(key[0] + key[1])
        && ((keybody = keybody_(key)) === kChar.j || keybody === kChar.k)) {
      if (!hasResults) { /* empty */ }
      else if (key.length > 4) {
        highlightInViewport()
      } else {
        executeFind("", { c: -(keybody > kChar.j), i: 1 })
      }
      return HandlerResult.Prevent
    }
    if (!insert_Lock_() && isEscape_(key)) {
      prevent_(event.e); // safer
      deactivate(FindAction.ExitNoFocus) // should exit
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
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
      hudTip(kTip.findFrameFail, 2000)
    }
    return
  }
  const wnd = box_.contentWindow, f = wnd.addEventListener.bind(wnd) as typeof addEventListener,
  now = getTime(), t = true;
  let tick = 0;
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
  f(UNL, /*#__NOINLINE__*/ onIframeUnload, t)
  if (OnChrome) {
    f("compositionend", onInput, t)
  }
  suppressCommonEvents(wnd, CLK);
  f(BU, onUnexpectedBlur = (event): void => {
    const delta = getTime() - now
    if (event && isActive && delta < 500 && delta > -99 && event.target === wnd) {
      wnd.closed || timeout_((): void => { isActive && doFocus(); }, tick++ * 17)
    } else {
      setupEventListener(wnd, BU, onUnexpectedBlur, 1, 1)
      onUnexpectedBlur = null
    }
  }, t);
  f("focus", /*#__NOINLINE__*/ onIframeFocus, t)

  box_.onload = later ? null as never : (e): void => {
    (e.target as typeof box_).onload = null as never; isActive && onLoad2()
  }
  if (later) { onLoad2() }
}

const doFocus = (): void => {
  doesCheckAlive = 0
  // fix that: search for "a" in VFind, Ctrl+F, "a", Esc, select any normal text using mouse - then `/` can not refocus
  if (OnChrome && (Build.MinCVer >= BrowserVer.MinShadowDOMV0 ? root_! : root_ || innerDoc_).activeElement === input_) {
    input_.blur()
  }
  OnChrome && Build.MinCVer >= BrowserVer.MinFocusIframeDirectlyBy$activeElement$$focus || box_.contentWindow.focus()
  focus_(input_)
  doesCheckAlive = 1
}

const setFirstQuery = (query: string): void => {
  doFocus()
  query0_ = ""
  query_ || setQuery(query)
  isQueryRichText_ = true
  notEmpty = !!query_
  notEmpty && execCommand("selectAll")
}

  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=594613
/** ScrollIntoView to notify it's `<tab>`'s current target since Min$ScrollIntoView$SetTabNavigationNode (C51)
 * https://chromium.googlesource.com/chromium/src/+/0bb887b20c70582eeafad2a58ac1650b7159f2b6
 *
 * Tracking:
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/element.cc?q=ScrollIntoViewNoVisualUpdate&g=0&l=717
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/document.cc?q=SetSequentialFocusNavigationStartingPoint&g=0&l=4773
 * 
 * Firefox seems to have "focused" it
 */
export const fixTabNav_cr_old = OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
      ? (el: Element): void => {
    let oldPos: MarksNS.ScrollInfo | 0 = chromeVer_ < BrowserVer.MinScrollIntoViewOptions
          ? [scrollX, scrollY] : 0;
    scrollIntoView_(el);
    oldPos && scrollToMark(oldPos)
} : 0 as never

const setQuery = (query: string): void => {
  if (query === query_ || !innerDoc_) { /* empty */ }
  else if (!query && historyIndex > 0) { --historyIndex }
  else {
    execCommand("selectAll");
    execCommand("insertText", 0, query.replace(<RegExpOne> /^ /, "\xa0"));
    onInput();
  }
}

export const execCommand = (cmd: string, doc?: Document | 0, value?: string) => {
  (doc || innerDoc_).execCommand(cmd, false, value)
}

const postActivate = (): void => {
  const postExit = (skip?: boolean | Event): void => {
    // safe if destroyed, because `el.onblur = Exit`
    if (skip && skip !== !!skip
        && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
            ? !skip.isTrusted : skip.isTrusted === false)) { return }
    postLock && setupEventListener(postLock, BU, postExit, 1)
    if (!postLock || skip === true) { return }
    postLock = null
    setupEventListener(0, CLK, postExit, 1)
    removeHandler_(kHandler.postFind)
    setupSuppress()
  }
  const el = insert_Lock_()
  if (!el) { postExit(); return }
  pushHandler_((event: HandlerNS.Event): HandlerResult => {
    const exit = isEscape_(getMappedKey(event, kModeId.Insert));
    exit ? postExit() : removeHandler_(kHandler.postFind)
    return exit ? HandlerResult.Prevent : HandlerResult.Nothing;
  }, kHandler.postFind)
  if (el === postLock) { return }
  if (!postLock) {
    setupEventListener(0, CLK, postExit)
    setupSuppress(postExit)
  }
  postExit(true)
  postLock = el
  setupEventListener(el, BU, postExit)
}

const onInput = (e?: Event): void => {
  if (e) {
      Stop_(e);
      if (!(OnChrome
          && (Build.MinCVer >= BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse
              || chromeVer_ > BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse - 1)
          && e.type < "i")) {
        if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
            ? !e.isTrusted : e.isTrusted === false) { return; }
      }
      if ((e as TypeToPick<Event, InputEvent, "isComposing">).isComposing) { return; }
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
    restoreSelection()
    executeFind(!isRegex ? parsedQuery_ : regexMatches ? regexMatches[0] : "", { j: 1 })
    showCount(1)
  }
}

const showCount = (changed: BOOL): void => {
  let count = matchCount
  if (changed) {
      countEl.dataset.vimium = !parsedQuery_ ? "" : VTr(
          count > 1 ? kTip.nMatches : count ? kTip.oneMatch : hasResults ? kTip.someMatches : kTip.noMatches,
          [count]
      );
  }
  count = (dimSize_(input_, kDim.scrollW) + countEl.offsetWidth + 35) & ~31
  if (!isSmall || count > 151) {
    outerBox_.style.width = ((isSmall = count < 152) ? 0 as number | string as string : count + "px")
  }
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
  let ww = !1, isRe: boolean | null = null, matches: string[] | null = null, delta: number
  query_ = query0_ = query
  wrapAround = !0
  ignoreCase = null as boolean | null
  query = !isQueryRichText_ ? query : query.replace(<RegExpG & RegExpSearchable<0>> /\\[acirw\\]/gi, (str): string => {
    let flag = str.charCodeAt(1), enabled = flag > kCharCode.a - 1
    if (flag === kCharCode.backslash) { return str }
    flag &= ~kCharCode.CASE_DELTA
    if (flag === kCharCode.I || flag === kCharCode.C) { ignoreCase = enabled === (flag === kCharCode.I) }
    else if (flag === kCharCode.R) { isRe = enabled } 
    else if (isRe) { return str }
    else { flag > kCharCode.A ? ww = enabled : wrapAround = enabled }
    return ""
  })
  if (isQueryRichText_) {
    if (isRe === null && !ww) {
      isRe = fgCache.r;
      const info = 2 * +query.startsWith(WB) + +query.endsWith(WB);
      if (info === 3 && !isRe && query.length > 3) {
        query = query.slice(2, -2);
        ww = true;
      } else if (info && info < 3) {
        isRe = true;
      }
    }
    if (OnChrome ? ww && isRe : ww) {
      query = WB + escapeAllForRe(query.replace(<RegExpG & RegExpSearchable<0>> /\\\\/g, "\\")) + WB
      ww = false;
      isRe = true;
    }
    query = isRe ? query !== "\\b\\b" && query !== WB ? query : ""
        : query.replace(<RegExpG & RegExpSearchable<0>> /\\\\/g, "\\");
  }
  parsedQuery_ = query
  isRegex = !!isRe
  wholeWord = ww
  notEmpty = !!query
  ignoreCase = ignoreCase != null ? ignoreCase : Lower(query) === query
  const didNorm = !isRe && doesNormalizeLetters
  isRe || (query = isActive ? escapeAllForRe(didNorm ? normLetters(query) : query) : "")

  let text: HTMLElement["innerText"] | undefined
  let re: RegExpG | null = query && tryCreateRegExp(ww ? WB + query + WB : query, (ignoreCase ? "gim" : "gm") as "g")
      || null
  if (re) {
    let now = getTime()
    if (cachedInnerText && cachedInnerText.n === didNorm && (delta = math.abs(now - cachedInnerText.t))
          < (didNorm || cachedInnerText.i.length > 1e5 ? 6e3 : 3e3)) {
      query = cachedInnerText!.i
      delta < 500 && (cachedInnerText!.t = now)
    } else {
      let el = fullscreenEl_unsafe_()
      while (el && (el as ElementToHTML).lang == null) { // in case of SVG elements
        el = GetParent_unsafe_(el, PNType.DirectElement);
      }
      query = el && isTY(text = (el as HTMLElement).innerText) && text ||
          (OnFirefox ? (docEl_unsafe_() as SafeHTMLElement).innerText : (docEl_unsafe_() as HTMLElement).innerText + "")
      query = didNorm ? normLetters(query) : query
      cachedInnerText = { i: query, t: now, n: didNorm }
    }
    matches = query.match(re) || query.replace(<RegExpG> /\xa0/g, " ").match(re);
  }
  regexMatches = isRe ? matches : null
  parsedRegexp_ = isRe ? re : null
  activeRegexIndex = 0
  matchCount = matches ? matches.length : 0
}

const restoreSelection = (isCur?: boolean): void => {
    const sel = getSelection_(),
    range = !isCur ? initialRange : sel.isCollapsed ? null : selRange_(sel)
    if (!range) { return; }
    // Note: it works even when range is inside a shadow root (tested on C72 stable)
    resetSelectionToDocStart(sel, range)
}

const highlightInViewport = (): void => {
  prepareCrop_(1)
  const oldActiveRegexIndex = activeRegexIndex
  const opt: ExecuteOptions = { h: [scrollX, scrollY], i: 1 }
  const sel = getSelected(), range = selRange_(sel)
  range && collpaseSelection(sel)
  let arr = executeFind("", opt), el: LockableElement | null
  if (range) {
    resetSelectionToDocStart(sel, range)
    activeRegexIndex = oldActiveRegexIndex
    opt.c = -1
    arr = arr.concat(executeFind("", opt))
  }
  (el = insert_Lock_()) && el.blur()
  highlighting && highlighting()
  const cbs = arr.map(cr => flash_(null, cr, -1, " Sel SelH"))
  activeRegexIndex = oldActiveRegexIndex
  range ? resetSelectionToDocStart(sel, range) : restoreSelection()
  const timer = timeout_(highlighting = () => { highlighting = null; clearTimeout_(timer); cbs.map(callFunc) }, 2400)
}

export const executeFind = (query: string | null, options: ExecuteOptions): Rect[] => {
/**
 * According to https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/editor.cc?q=FindRangeOfString&g=0&l=815 ,
 * the range to find is either `[selection..docEnd]` or `[docStart..selection]`,
 * so those in shadowDOM / ancestor tree scopes will still be found.
 * Therefore `@styleIn_` is always needed, and VFind may not need a sub-scope selection.
 */
    const _do_find_not_cr = !OnChrome ? function (): boolean {
      // (string, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog);
      try {
        return window.find.apply(window, arguments);
      } catch { return false; }
    } as Window["find"] : 0 as never as null
    let el: LockableElement | null
      , highLight = safer(options).h, areas: Rect[] = [], noColor = highLight || options.noColor
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
    const focusHUD = OnFirefox && isActive && innerDoc_.hasFocus()
    const wndSel = getSelection_()
    let regexpNoMatchLimit = 9 * count, dedupID = count + 1, oldReInd: number, selNone: boolean
    let oldAnchor = !options.j && wrapAround && getAccessibleSelectedNode(getSelected()), curSel: Selection
    while (0 < count) {
      oldReInd = activeRegexIndex
      q = query || (!isRe ? parsedQuery_ : !regexMatches ? "" : regexMatches[
            activeRegexIndex = highLight
                ? back ? max_(0, oldReInd - 1) : min_(oldReInd + 1, matchCount - 1)
                : (oldReInd + (back ? -1 : 1) + matchCount) % matchCount])
      found = !!q && (!OnChrome
        ? _do_find_not_cr!(q, !notSens, back, !highLight && wrapAround, wholeWord, false, false)
        : window.find(q, !notSens, back, !highLight && wrapAround, wholeWord, false, false)
      )
      if (OnFirefox && !found && !highLight && wrapAround && q) {
        resetSelectionToDocStart();
        found = _do_find_not_cr!(q, !notSens, back, true, wholeWord, false, false)
      }
      if (!found) { break }
      selNone = dedupID > count && !(wndSel + "") // if true, then the matched text may have `user-select: none`
      /**
       * Warning: on Firefox and before {@link #FirefoxBrowserVer.Min$find$NotReturnFakeTrueOnPlaceholderAndSoOn},
       * `found` may be unreliable,
       * because Firefox may "match" a placeholder and cause `getSelection().type` to be `"None"`
       */
      if (pR && !selNone && (par = getSelectionParent_unsafe(curSel = getSelected(), pR)) === 0
          && timesRegExpNotMatch++ < regexpNoMatchLimit) {
        activeRegexIndex = oldReInd
      } else if (highLight) {
        scrollTo(highLight[0], highLight[1])
        curSel = getSelected()
        const br = rangeCount_(curSel) && padClientRect_(getSelectionBoundingBox_(curSel)),
        cr = br && cropRectToVisible_(br.l, br.t, br.r && br.r + 3, br.b && br.b + 3)
        cr ? areas.push(cr) : count = 0 // even for a caret caused by `user-select: none`
        timesRegExpNotMatch = 0
      } else {
        count--;
      }
      if (selNone) {
        dedupID = highLight ? 2 : ++count
        modifySel(wndSel, 0, !back, "character")
      }
    }
    if (found! && !highLight && (par = par || getSelectionParent_unsafe(curSel = getSelected()))) {
      let newAnchor = oldAnchor && getAccessibleSelectedNode(curSel!)
      let posChange = newAnchor && compareDocumentPosition(oldAnchor as Node, newAnchor)
      view_(par)
      if (posChange && /** go back */ !!(posChange & kNode.DOCUMENT_POSITION_PRECEDING) !== back) {
        hudTip(kTip.wrapWhenFind, 1000, VTr(back ? kTip.atStart : kTip.atEnd))
      }
    }
    noColor || timeout_(hookSel, 0);
    (el = insert_Lock_()) && !isSelected_() && el.blur();
    OnFirefox && focusHUD && doFocus()
    if (!options.i) {
      hasResults = found!
    }
    return areas
}

const hookSel = (t?: TimerType.fake | 1): void => {
  setupEventListener(0, "selectionchange", toggleStyle, t! > 0)
}

  /** must be called after initing */
const toggleStyle = (disable: BOOL | boolean | Event): void => {
    const sout = styleSelColorOut, sin = styleSelColorIn, active = isActive
    if (!sout) { return; }
    hookSel(1)
    disable = !!disable;
    // Note: `<doc/root>.adoptedStyleSheets` should not be modified in an extension world
    if (!active && disable) {
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
  !enable ? styleSelectable && (removeEl_s(styleSelectable), styleSelectable = null)
  : docSelectable_ && !findCSS.s.includes("\n")
    || appendNode_s(ui_box!, styleSelectable = createStyle(findCSS.s))
}
