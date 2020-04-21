import {
  setupEventListener, VTr, keydownEvents_, isAlive_, suppressCommonEvents, onWndFocus, VOther, timeout_, safer, fgCache, doc, safeObj,
} from "../lib/utils.js"
import {
  ui_box, ui_root,
  createStyle, getSelectionText, checkDocSelectable, adjustUI, ensureBorder, addUIElement, getSelected,
  select_, getSelectionParent_unsafe, resetSelectionToDocStart,
} from "./dom_ui.js"
import { visual_mode, prompt, highlightRange, kDir, activate as visualActivate } from "./mode_visual.js"
import { keyIsDown as scroll_keyIsDown, beginScroll, onScrolls } from "./scroller.js"
import { scrollToMark, setPreviousMarkPosition } from "./marks.js"
import { hudHide, hud_box, hudTip, hud_opacity } from "./hud.js"
import { post_, send_ } from "../lib/port.js"
import { insert_Lock_, setupSuppress } from "./mode_insert.js"
import { pushHandler_, SuppressMost_, Stop_, removeHandler_, prevent_, key_, keybody_, isEscape_, keyNames_ } from "../lib/keyboard_utils.js"
import { createShadowRoot_, lastHovered_, setLastHovered, prepareCrop_, getSelectionFocusEdge_, activeEl_unsafe_, getEditableType_, scrollIntoView_, SafeEl_not_ff_, GetParent_unsafe_, htmlTag_, fullscreenEl_unsafe_, docEl_unsafe_, getSelection_, view_, isSelected_, docSelectable_, isHTML_, createElement_, wdZoom_ } from "../lib/dom_utils.js"

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
let hasResults = false
let matchCount = 0
let postOnEsc = true
let coords: null | MarksNS.ScrollInfo = null
let initialRange: Range | null = null
let activeRegexIndex = 0
let regexMatches: RegExpMatchArray | null = null
let root_: ShadowRoot | null = null
let box_: HTMLIFrameElement = null as never
let outerBox_: HTMLDivElement = null as never
let innerDoc_: HTMLDocument = null as never
let input_: SafeHTMLElement = null as never
let countEl: SafeHTMLElement = null as never
let findCSS: FindCSS = null as never
let styleIn: HTMLStyleElement = null as never
let styleOut: HTMLStyleElement = null as never
let styleSelectable: HTMLStyleElement | null = null
let styleInHUD: HTMLStyleElement | null = null
let onUnexpectedBlur: ((event?: Event) => void) | null = null
let doesCheckAlive: BOOL = 0
let isSmall = false
let postLock: Element | null = null

export { findCSS, query_ as find_query, hasResults as find_hasResults, box_ as find_box, styleSelectable, styleInHUD }
export function setFindCSS (newCSS: FindCSS): void { findCSS = newCSS }

export const activate = (_0: number, options: CmdOptions[kFgCmd.findMode]): void => {
    findCSS = options.f || findCSS;
    if (!isHTML_()) { return; }
    let query: string = options.s ? getSelectionText() : "";
    (query.length > 99 || query.includes("\n")) && (query = "");
    isQueryRichText_ = !query
    query || (query = options.q);
    isActive || query === query_ && options.l || setPreviousMarkPosition()
    checkDocSelectable();
    ensureBorder();
    if (options.l) {
      return findAndFocus(query || query_, options)
    }
    isActive && adjustUI()
    if (!isActive) {
      getCurrentRange()
      if (options.r) {
        coords = [scrollX, scrollY]
      }
    }
    postOnEsc = options.p
    if (isActive) {
      hudHide(TimerType.noTimer);
      return setFirstQuery(query)
    }

    parsedQuery_ = query_ = ""
    parsedRegexp_ = regexMatches = null
    activeRegexIndex = 0

    const outerBox = outerBox_ = createElement_("div"),
    el = box_ = createElement_("iframe"), st = outerBox.style
    st.display = "none"; st.width = "0";
    if (Build.BTypes & ~BrowserType.Firefox && wdZoom_ !== 1) { st.zoom = "" + 1 / wdZoom_; }
    outerBox.className = "R HUD UI" + fgCache.d;
    outerBox.onmousedown = onMousedown
    el.className = "R Find UI";
    el.onload = function (this: HTMLIFrameElement): void { onLoad(1) }
    pushHandler_(SuppressMost_, activate);
    query_ || (query0_ = query)
    init && init(AdjustType.NotAdjust)
    toggleSelectableStyle(1);
    isActive = true
    outerBox.appendChild(el);
    addUIElement(outerBox, AdjustType.DEFAULT, hud_box);
}

const notDisableScript = (): 1 | void => {
    try {
      if (innerDoc_ = box_.contentDocument as HTMLDocument | null as HTMLDocument | never) {
        return 1;
      }
    } catch {}
    deactivate(FindNS.Action.ExitUnexpectedly)
    visual_mode ? prompt(kTip.findFrameFail, 2000) : hudTip(kTip.findFrameFail)
}

export const onLoad = (later?: 1): void => {
    if (!isActive || !notDisableScript()) { return; }
    const box: HTMLIFrameElement = box_,
    wnd = box.contentWindow, f = wnd.addEventListener.bind(wnd) as typeof addEventListener,
    now = Date.now(), t = true;
    let tick = 0;
    f("mousedown", onMousedown, t)
    f("keydown", onIFrameKeydown, t)
    f("keyup", onIFrameKeydown, t)
    f("input", onInput, t)
    if (Build.BTypes & ~BrowserType.Chrome) {
      f("paste", onPaste_not_cr!, t)
    }
    f("unload", (e: Event): void => {
      if (!isAlive_ || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
                ? !e.isTrusted : e.isTrusted === false)) { return; }
      isActive && deactivate(FindNS.Action.ExitUnexpectedly);
    }, t)
    if (Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)) {
      f("compositionend", onInput, t)
    }
    suppressCommonEvents(wnd, "click");
    f("blur", onUnexpectedBlur = function (this: Window, event): void {
      const delta = Date.now() - now, wnd1 = this
      if (event && isActive && delta < 500 && delta > -99 && event.target === wnd1) {
        wnd1.closed || timeout_((): void => { isActive && doFocus(); }, tick++ * 17)
      } else {
        setupEventListener(wnd1, "blur", onUnexpectedBlur, 1, 1)
        onUnexpectedBlur = null
      }
    }, t);
    f("focus", function (this: Window, event: Event): void {
      if (doesCheckAlive && event.target === this) {
        onWndFocus();
      }
      Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
        || Stop_(event);
    }, t);
    box.onload = later ? null as never : function (): void {
      onload = null as never; onLoad2()
    };
    if (later) { onLoad2() }
}

const onLoad2 = (): void => {
    if (!isActive) { return; }
    const wnd: Window = box_.contentWindow, doc = innerDoc_,
    docEl = doc.documentElement as HTMLHtmlElement,
    body = doc.body as HTMLBodyElement,
    zoom = Build.BTypes & ~BrowserType.Firefox ? wnd.devicePixelRatio : 1,
    list = doc.createDocumentFragment(),
    addElement = function (tag: 0 | "div" | "style", id?: string): SafeHTMLElement {
      const newEl = doc.createElement(tag || "span") as SafeHTMLElement;
      id && (newEl.id = id, list.appendChild(newEl));
      return newEl;
    };
    addElement(0, "s").textContent = "/";
    const el = input_ = addElement(0, "i")
    addElement(0, "h");
    if (!(Build.BTypes & ~BrowserType.Firefox) && !Build.DetectAPIOnFirefox) {
      el.contentEditable = "true";
      setupEventListener(wnd, "paste", null, 1, 1);
    } else if (Build.BTypes & ~BrowserType.Chrome) {
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
    if (Build.BTypes & BrowserType.Chrome
        && Build.MinCVer < BrowserVer.MinEnsuredInputEventIsNotOnlyInShadowDOMV1
        && fgCache.v < BrowserVer.MinEnsuredInputEventIsNotOnlyInShadowDOMV1) {
      // not check MinEnsuredShadowDOMV1 for smaller code
      setupEventListener(el, "input", onInput)
    }
    (countEl = addElement(0, "c")).textContent = " "
    createStyle(findCSS.i, styleInHUD = addElement("style", "c") as HTMLStyleElement);
    // add `<div>` to fix that a body with backgroundColor doesn't follow border-radius on FF63; and on Linux
    // an extra <div> may be necessary for Ctrl+A: https://github.com/gdh1995/vimium-c/issues/79#issuecomment-540921532
    const box = Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
        && (Build.MinFFVer < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
            && (Build.BTypes & BrowserType.Chrome || fgCache.v < FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
            || fgCache.o === kOS.linux)
        ? addElement("div") as HTMLDivElement : body,
    root = Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
        && (Build.MinFFVer < FirefoxBrowserVer.MinContentEditableInShadowSupportIME
            && (Build.BTypes & BrowserType.Chrome || fgCache.v < FirefoxBrowserVer.MinContentEditableInShadowSupportIME))
        ? box : createShadowRoot_(box),
    inShadow = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox)
            || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
                && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        ? true : root !== box,
    root2 = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox)
            || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
                && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || inShadow ? addElement("div") : box;
    root2.className = "r" + fgCache.d;
    root2.spellcheck = false;
    root2.appendChild(list);
    if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox)
            || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
                && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || inShadow) {
      root_ = root as ShadowRoot
      // here can not use `box.contentEditable = "true"`, otherwise Backspace will break on Firefox, Win
      box.setAttribute("role", "textbox");
      setupEventListener(root2, "mousedown", onMousedown, 0, 1)
      root.appendChild(root2);
    }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)) {
      if (box !== body) {
        const st = addElement("style") as HTMLStyleElement;
        st.textContent = "body{margin:0!important}";
        doc.head!.appendChild(st);
        body.appendChild(box);
      }
    } else if (Build.BTypes & ~BrowserType.Firefox && zoom < 1) {
      docEl.style.zoom = "" + 1 / zoom;
    }
    outerBox_.style.display = ""
    removeHandler_(activate);
    pushHandler_(onHostKeydown, activate)
    // delay hudHide, so that avoid flicker on Firefox
    hudHide(TimerType.noTimer);
    setFirstQuery(query0_)
}

const doFocus = (): void => {
  doesCheckAlive = 0
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox) {
    box_.contentWindow.focus()
    }
    // fix that: search "a" in VFind, Ctrl+F, "a", Esc, select normal text using mouse, `/` can not refocus
  (root_ || innerDoc_).activeElement === input_ && input_.blur()
  input_.focus()
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

export let init = (adjust_type: AdjustType): void => {
    const css = findCSS.c, sin = styleIn = createStyle(css)
    ui_box ? adjustUI() : addUIElement(sin, adjust_type, true);
    sin.remove();
    styleOut = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || Build.BTypes & ~BrowserType.Edge && ui_box !== ui_root ? createStyle(css) : sin;
  init = null as never
}

const findAndFocus = (query: string, options: CmdOptions[kFgCmd.findMode]): void => {
    if (!query) {
      return hudTip(kTip.noOldQuery);
    }
    init && init(AdjustType.MustAdjust)
    if (query !== query_) {
      updateQuery(query)
      if (isActive) {
        input_.textContent = query.replace(<RegExpOne> /^ /, "\xa0")
        showCount(1)
      }
    }
    isQueryRichText_ = true
    const style = isActive || hud_opacity !== 1 ? null : hud_box!.style
    style && (style.visibility = "hidden");
    toggleSelectableStyle(0);
    executeFind(null, options)
    style && (style.visibility = "");
    if (!hasResults) {
      toggleStyle(1)
      if (!isActive) {
        toggleSelectableStyle(0);
        hudTip(kTip.noMatchFor, 0, [query_])
      }
      return;
    }
    focusFoundLinkIfAny()
    postActivate()
}

export const clear = (): void => {
  coords && scrollToMark(coords)
  hasResults = isActive = isSmall = notEmpty = postOnEsc = false
  removeHandler_(activate)
  outerBox_ && outerBox_.remove()
  if (box_ === lastHovered_) { /*#__INLINE__*/ setLastHovered(null) }
  parsedQuery_ = query_ = query0_ = ""
  historyIndex = matchCount = doesCheckAlive = 0;
  styleInHUD = onUnexpectedBlur = outerBox_ =
  box_ = innerDoc_ = root_ = input_ = countEl = parsedRegexp_ =
  initialRange = regexMatches = coords = null as never
}

const onMousedown = function (this: Window | HTMLElement, event: MouseEventToPrevent): void {
  const target = event.target as Element
  if (isAlive_ && target !== input_ && (!root_ || target.parentNode === this || target === this)
        && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? event.isTrusted : event.isTrusted !== false)) {
      prevent_(event);
    doFocus()
    const text = input_.firstChild as Text
    text && innerDoc_.getSelection().collapse(text, target !== input_.previousSibling ? text.data.length : 0)
  }
}

let onPaste_not_cr = Build.BTypes & ~BrowserType.Chrome
      ? function (this: Window, event: ClipboardEvent & ToPrevent): void {
    const d = event.clipboardData, text = d && typeof d.getData === "function" ? d.getData("text/plain") : "";
    prevent_(event);
    if (!text) { return; }
    execCommand("insertText", 0, text)
} : 0 as never as null

const onIFrameKeydown = (event: KeyboardEventToPrevent): void => {
    Stop_(event);
    const n = event.keyCode
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
        ? !event.isTrusted : event.isTrusted === false) { return; }
    if (n === kKeyCode.ime || scroll_keyIsDown && onScrolls(event) || event.type === "keyup") { return; }
    type Result = FindNS.Action;
    const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event, i: n},
    key = key_(eventWrapper, kModeId.Find), keybody = keybody_(key);
    const i: Result | KeyStat = key.includes("a-") && event.altKey ? FindNS.Action.DoNothing
      : keybody === kChar.enter
        ? key[0] === "s" ? FindNS.Action.PassDirectly
          : (query_ && post_({ H: kFgReq.findQuery, q: query0_ }), FindNS.Action.ExitToPostMode)
      : keybody !== kChar.delete && keybody !== kChar.backspace
        ? isEscape_(key) ? FindNS.Action.ExitAndReFocus : FindNS.Action.DoNothing
      : Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther & BrowserType.Firefox)
        && fgCache.o === kOS.linux && "cs".includes(key[0])
        ? FindNS.Action.CtrlDelete
      : notEmpty || (n === kKeyCode.deleteKey && fgCache.o || event.repeat) ? FindNS.Action.PassDirectly
      : FindNS.Action.Exit;
    let h = HandlerResult.Prevent, scroll: number;
    if (!i) {
      if (keybody !== key) {
        if (key === `a-${kChar.f1}`) {
          prepareCrop_();
          highlightRange(getSelected()[0]);
        }
        else if (key < "c-" || key > "m-") { h = HandlerResult.Suppress; }
        else if (scroll = keyNames_.indexOf(keybody), scroll > 2 && scroll < 9 && (scroll & 5) - 5) {
          beginScroll(eventWrapper, key, keybody);
        }
        else if (keybody === kChar.j || keybody === kChar.k) {
          executeFind(null, { n: keybody > kChar.j ? -1 : 1 })
        }
        else { h = HandlerResult.Suppress; }
      }
      else if (keybody === kChar.f1) { execCommand("delete") }
      else if (keybody === kChar.f2) {
        Build.BTypes & BrowserType.Firefox && box_.blur()
        focus(); keydownEvents_[n] = 1;
      }
      else if (keybody === kChar.up || keybody === kChar.down) { nextQuery(keybody < kChar.up) }
      else { h = HandlerResult.Suppress; }
    } else if (i === FindNS.Action.PassDirectly) {
      h = HandlerResult.Suppress;
    }
    h < HandlerResult.Prevent || prevent_(event);
    if (i < FindNS.Action.DoNothing + 1) { return; }
    keydownEvents_[n] = 1;
    if (Build.BTypes & BrowserType.Firefox && i === FindNS.Action.CtrlDelete) {
      const sel = innerDoc_.getSelection()
      // on Chrome 79 + Win 10 / Firefox 69 + Ubuntu 18, delete a range itself
      // while on Firefox 70 + Win 10 it collapses first
      sel.type === "Caret" && sel.modify("extend", kDir[+(keybody > "d")], "word");
      execCommand("delete")
      return;
    }
    deactivate(i)
}

const onHostKeydown = (event: HandlerNS.Event): HandlerResult => {
    const key = key_(event, kModeId.Find), key2 = key.replace("m-", "c-")
    if (key === kChar.f2) {
      onUnexpectedBlur && onUnexpectedBlur()
      doFocus()
      return HandlerResult.Prevent;
    } else if (key2 === "c-j" || key2 === "c-k") {
        executeFind(null, { n: key > "c-j" ? -1 : 1 })
        return HandlerResult.Prevent;
    }
    if (!insert_Lock_() && isEscape_(key)) {
      prevent_(event.e); // safer
      deactivate(FindNS.Action.ExitNoFocus) // should exit
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  }

  /** Note: host page may have no range (type is "None"), if:
   * * press <Enter> on HUD to exit FindMode
   * * a host script has removed all ranges
   */
export const deactivate = (i: FindNS.Action): void => {
    let sin = styleIn, noStyle = !sin || !sin.parentNode, hasResult = hasResults
      , maxNotRunPost = postOnEsc ? FindNS.Action.ExitAndReFocus - 1 : FindNS.Action.ExitToPostMode - 1
      , el: SafeElement | null | undefined, el2: Element | null;
    i === FindNS.Action.ExitNoAnyFocus || focus();
    clear()
    if (i > FindNS.Action.MaxExitButNoWork) {
      el = getSelectionFocusEdge_(getSelected()[0], 1);
      el && (Build.BTypes & ~BrowserType.Firefox ? (el as ElementToHTMLorSVG).tabIndex != null : el.focus) &&
      el.focus!();
    }
    if ((i === FindNS.Action.ExitAndReFocus || !hasResult || visual_mode) && !noStyle) {
      toggleStyle(1)
      restoreSelection(true)
    }
    if (visual_mode) {
      visualActivate(1, safer<CmdOptions[kFgCmd.visualMode]>({
        m: VisualModeNS.Mode.Visual,
        r: true
      }));
      return;
    }
    if (i > FindNS.Action.MaxExitButNoWork && hasResult && (!el || el !== insert_Lock_())) {
      let container = focusFoundLinkIfAny()
      if (container && i === FindNS.Action.ExitAndReFocus && (el2 = activeEl_unsafe_())
          && getEditableType_<0>(el2) > EditableType.TextBox - 1 && container.contains(el2)) {
        prepareCrop_();
        select_(el2 as LockableElement);
      } else if (el) {
        // always call scrollIntoView if only possible, to keep a consistent behavior
        !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions
          ? scrollIntoView_(el) : fixTabNav(el)
      }
    }
    toggleSelectableStyle(0);
    if (i > maxNotRunPost) {
      postActivate()
    }
}

  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=594613
/** ScrollIntoView to notify it's `<tab>`'s current target since Min$ScrollIntoView$SetTabNavigationNode (C51)
 * https://chromium.googlesource.com/chromium/src/+/0bb887b20c70582eeafad2a58ac1650b7159f2b6
 *
 * Tracking:
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/element.cc?q=ScrollIntoViewNoVisualUpdate&g=0&l=717
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/document.cc?q=SetSequentialFocusNavigationStartingPoint&g=0&l=4773
 */
const fixTabNav = !(Build.BTypes & BrowserType.Chrome) // firefox seems to have "focused" it
        || Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions ? 0 as never
      : (el: Element): void => {
    let oldPos: MarksNS.ScrollInfo | 0 = fgCache.v < BrowserVer.MinScrollIntoViewOptions
          ? [scrollX, scrollY] : 0;
    scrollIntoView_(el);
    oldPos && scrollToMark(oldPos)
}

  /** return an element if no <a> else null */
const focusFoundLinkIfAny = (): SafeElement | null | void => {
    let cur = Build.BTypes & ~BrowserType.Firefox ? SafeEl_not_ff_!(getSelectionParent_unsafe())
        : getSelectionParent_unsafe() as SafeElement | null;
    for (let i = 0, el: Element | null = cur; el && el !== doc.body && i++ < 5;
        el = GetParent_unsafe_(el, PNType.RevealSlotAndGotoParent)) {
      if (htmlTag_(el) === "a") {
        (el as HTMLAnchorElement).focus();
        return;
      }
    }
    return cur;
}

const nextQuery = (back?: boolean): void => {
  const ind = historyIndex + (back ? -1 : 1)
    if (ind < 0) { return; }
  historyIndex = ind
  if (!back) {
    send_(kFgReq.findQuery, { i: ind }, setQuery)
  } else {
    execCommand("undo")
    innerDoc_.getSelection().collapseToEnd()
  }
}

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
  const el = insert_Lock_()
  if (!el) { postExit(); return }
  pushHandler_((event: HandlerNS.Event): HandlerResult => {
    const exit = isEscape_(key_(event, kModeId.Insert));
    exit ? postExit() : removeHandler_(postActivate)
    return exit ? HandlerResult.Prevent : HandlerResult.Nothing;
  }, postActivate)
  if (el === postLock) { return }
  if (!postLock) {
    setupEventListener(0, "click", postExit)
    setupSuppress(postExit)
  }
  postExit(true)
  postLock = el
  setupEventListener(el, "blur", postExit)
}

const postExit = (skip?: boolean | Event): void => {
      // safe if destroyed, because `el.onblur = Exit`
      if (skip && skip !== !!skip
          && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !skip.isTrusted : skip.isTrusted === false)) { return; }
      postLock && setupEventListener(postLock, "blur", postExit, 1)
      if (!postLock || skip === true) { return }
      postLock = null
      setupEventListener(0, "click", postExit, 1)
      removeHandler_(postActivate)
      setupSuppress();
}

const onInput = (e?: Event): void => {
    if (e) {
      Stop_(e);
      if (!(Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || VOther & BrowserType.Chrome)
          && (Build.MinCVer >= BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse
              || fgCache.v > BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse - 1)
          && e.type < "i")) {
        if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !e.isTrusted : e.isTrusted === false) { return; }
      }
      if ((e as TypeToPick<Event, InputEvent, "isComposing">).isComposing) { return; }
    }
  const query = input_.innerText.replace(<RegExpG> /\xa0/g, " ").replace(<RegExpOne> /\n$/, "")
  let s = query_
  if (!hasResults && !isRegex && !wholeWord && notEmpty && query.startsWith(s)
        && !query.includes("\\", s.length - 1)) {
    query0_ = query
    return showCount(0)
  }
  coords && scrollToMark(coords)
  updateQuery(query)
  restoreSelection()
  executeFind(!isRegex ? parsedQuery_ : regexMatches ? regexMatches[0] : "")
  showCount(1)
}

const showCount = (changed: BOOL): void => {
    let count = matchCount
    if (changed) {
      (countEl.firstChild as Text).data = !parsedQuery_ ? "" : VTr(
          count > 1 ? kTip.nMatches : count ? kTip.oneMatch : hasResults ? kTip.someMatches : kTip.noMatches,
          [count]
      );
    }
  count = (input_.scrollWidth + countEl.offsetWidth + 35) & ~31
  if (!isSmall || count > 151) {
    outerBox_.style.width = ((isSmall = count < 152) ? 0 as number | string as string : count + "px")
  }
}

export const updateQuery = (query: string): void => {
  query_ = query0_ = query
  wholeWord = false
  isRegex = ignoreCase = null as boolean | null
  query = isQueryRichText_ ? query.replace(<RegExpG & RegExpSearchable<0>> /\\[cirw\\]/gi, FormatQuery)
        : query;
  let isRe = isRegex, ww = wholeWord, wordBoundary = "\\b", escapeAllRe = <RegExpG> /[$()*+.?\[\\\]\^{|}]/g
  if (isQueryRichText_) {
    if (isRe === null && !ww) {
      isRe = fgCache.r;
      const info = 2 * +query.startsWith(wordBoundary) + +query.endsWith(wordBoundary);
      if (info === 3 && !isRe && query.length > 3) {
        query = query.slice(2, -2);
        ww = true;
      } else if (info && info < 3) {
        isRe = true;
      }
    }
    if (ww && (!(Build.BTypes & BrowserType.Chrome) || isRe
              || ((Build.BTypes & ~BrowserType.Chrome) && VOther !== BrowserType.Chrome)
        )) {
      query = wordBoundary + query.replace(<RegExpG & RegExpSearchable<0>> /\\\\/g, "\\").replace(escapeAllRe, "\\$&")
          + wordBoundary;
      ww = false;
      isRe = true;
    }
    query = isRe ? query !== "\\b\\b" && query !== wordBoundary ? query : ""
        : query.replace(<RegExpG & RegExpSearchable<0>> /\\\\/g, "\\");
  }
  parsedQuery_ = query
  isRegex = !!isRe
  wholeWord = ww
  notEmpty = !!query
  ignoreCase !== null || (ignoreCase = query.toLowerCase() === query)
  isRe || (query = isActive ? query.replace(escapeAllRe, "\\$&") : "")

    let re: RegExpG | null = query && tryCreateRegExp(ww
        ? wordBoundary + query + wordBoundary : query, ignoreCase ? "gi" : "g") || null;
    let matches: RegExpMatchArray | null = null;
    if (re) {
      let el = fullscreenEl_unsafe_(), text: HTMLElement["innerText"] | undefined;
      while (el && (el as ElementToHTML).lang == null) { // in case of SVG elements
        el = GetParent_unsafe_(el, PNType.DirectElement);
      }
      query = el && typeof (text = (el as HTMLElement).innerText) === "string" && text ||
          (Build.BTypes & ~BrowserType.Firefox ? (docEl_unsafe_() as HTMLElement).innerText + ""
            : (docEl_unsafe_() as SafeHTMLElement).innerText);
      matches = query.match(re) || query.replace(<RegExpG> /\xa0/g, " ").match(re);
    }
  regexMatches = isRe ? matches : null
  parsedRegexp_ = isRe ? re : null
  activeRegexIndex = 0
  matchCount = matches ? matches.length : 0
}

const tryCreateRegExp = (pattern: string, flags: "g" | "gi"): RegExpG | void => {
    try { return new RegExp(pattern, flags as "g"); } catch {}
}

const FormatQuery = (str: string): string => {
    let flag = str.charCodeAt(1), enabled = flag >= kCharCode.a
    if (flag === kCharCode.backslash) { return str; }
    flag &= ~kCharCode.CASE_DELTA;
    if (flag === kCharCode.I || flag === kCharCode.C) { ignoreCase = enabled === (flag === kCharCode.I) }
    else if (flag === kCharCode.W) {
      if (isRegex) { return str }
      wholeWord = enabled
    }
    else { isRegex = enabled }
    return "";
}

const restoreSelection = (isCur?: boolean): void => {
    const sel = getSelection_(),
    range = !isCur ? initialRange : sel.isCollapsed ? null : sel.getRangeAt(0)
    if (!range) { return; }
    resetSelectionToDocStart(sel);
    // Note: it works even when range is inside a shadow root (tested on C72 stable)
    sel.addRange(range);
}

const getNextQueryFromRegexMatches = (back?: boolean): string => {
  if (!regexMatches) { return "" }
  let count = matchCount
  activeRegexIndex = count = (activeRegexIndex + (back ? -1 : 1) + count) % count
  return regexMatches[count]
}

export const executeFind = (query?: string | null, options?: FindNS.ExecuteOptions): void => {
    options = options ? safer(options) : safeObj(null) as FindNS.ExecuteOptions;
    let el: LockableElement | null
      , found: boolean, count = (options.n! | 0) || 1, back = count < 0
      , par: Element | null | undefined, timesRegExpNotMatch = 0
      , q: string, notSens = ignoreCase && !options.caseSensitive
    /** Note: FirefoxBrowserVer.MinFollowSelectionColorOnInactiveFrame
     * Before Firefox 68, it's impossible to replace the gray bg color for blurred selection:
     * In https://hg.mozilla.org/mozilla-central/file/tip/layout/base/nsDocumentViewer.cpp#l3463 ,
     * `nsDocViewerFocusListener::HandleEvent` calls `SetDisplaySelection(SELECTION_DISABLED)`,
     *   if only a trusted "blur" event gets dispatched into Document
     * See https://bugzilla.mozilla.org/show_bug.cgi?id=1479760 .
     */
    options.noColor || toggleStyle(0)
    back && (count = -count);
    const isRe = isRegex, pR = parsedRegexp_
    const focusHUD = !!(Build.BTypes & BrowserType.Firefox)
      && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
      && isActive && innerDoc_.hasFocus()
    do {
      q = query != null ? query : isRe ? getNextQueryFromRegexMatches(back) : parsedQuery_
      found = Build.BTypes & ~BrowserType.Chrome
        ? _do_find_not_cr!(q, !notSens, back, true, wholeWord, false, false)
        : window.find(q, !notSens, back, true, wholeWord, false, false)
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
          && !found) {
        resetSelectionToDocStart();
        found = _do_find_not_cr!(q, !notSens, back, true, wholeWord, false, false)
      }
      /**
       * Warning: on Firefox and before {@link #FirefoxBrowserVer.Min$find$NotReturnFakeTrueOnPlaceholderAndSoOn},
       * `found` may be unreliable,
       * because Firefox may "match" a placeholder and cause `getSelection().type` to be `"None"`
       */
      if (found && pR && (par = getSelectionParent_unsafe())) {
        pR.lastIndex = 0;
        let text = (par as TypeToPick<Element, HTMLElement, "innerText">).innerText;
        if (text && !(Build.BTypes & ~BrowserType.Firefox && typeof text !== "string")
            && !(pR as RegExpG & RegExpSearchable<0>).test(text as string)
            && timesRegExpNotMatch++ < 9) {
          count++;
          par = null;
        }
      }
    } while (0 < --count && found);
    if (found) {
      par = par || getSelectionParent_unsafe();
      par && view_(par);
    }
    options.noColor || timeout_(hookSel, 0);
    (el = insert_Lock_()) && !isSelected_() && el.blur();
    Build.BTypes & BrowserType.Firefox && focusHUD && doFocus()
    hasResults = found
}

/**
 * According to https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/editor.cc?q=FindRangeOfString&g=0&l=815 ,
 * the range to find is either `[selection..docEnd]` or `[docStart..selection]`,
 * so those in shadowDOM / ancestor tree scopes will still be found.
 * Therefore `@styleIn_` is always needed, and VFind may not need a sub-scope selection.
 */
const _do_find_not_cr = Build.BTypes & ~BrowserType.Chrome ? function (this: void): boolean {
    // (string, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog);
    try {
      return window.find.apply(window, arguments);
    } catch { return false; }
} as Window["find"] : 0 as never as null

const hookSel = (t?: TimerType.fake | 1): void => {
  isAlive_ && setupEventListener(0, "selectionchange", toggleStyle, t! > 0)
}

  /** must be called after initing */
const toggleStyle = (disable: BOOL | boolean | Event): void => {
    const sout = styleOut, sin = styleIn, active = isActive
    if (!sout) { return; }
    hookSel(1)
    disable = !!disable;
    // Note: `<doc/root>.adoptedStyleSheets` should not be modified in an extension world
    if (!active && disable) {
      toggleSelectableStyle(0);
      sout.remove(); sin.remove();
      return;
    }
    if (sout.parentNode !== ui_box) {
      ui_box!.appendChild(sout);
      !((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
      && (!(Build.BTypes & ~BrowserType.Edge) || sin === sout)
      || addUIElement(sin, AdjustType.NotAdjust, true);
    }
    sout.sheet && (sout.sheet.disabled = disable);
    sin.sheet && (sin.sheet.disabled = disable);
}

export const toggleSelectableStyle = (enable: BOOL): void => {
  if (enable ? docSelectable_ : !styleSelectable || !styleSelectable.parentNode) { return }
  styleSelectable || (styleSelectable = createStyle(findCSS.s))
  enable ? ui_box!.appendChild(styleSelectable) : styleSelectable.remove()
}

const getCurrentRange = (): void => {
    let sel = getSelected()[0], range: Range;
    if (!sel.rangeCount) {
      range = doc.createRange();
      range.setStart(doc.body || docEl_unsafe_()!, 0);
    } else {
      range = sel.getRangeAt(0);
      // Note: `range.collapse` doesn't work if selection is inside a ShadowRoot (tested on C72 stable)
      sel.collapseToStart();
    }
    range.collapse(true);
    initialRange = range;
}
