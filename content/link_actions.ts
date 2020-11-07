import HintItem = HintsNS.HintItem
import {
  safer, fgCache, VOther, isImageUrl, isJSUrl, set_keydownEvents_, keydownEvents_, timeout_, doc, chromeVer_, weakRef_,
  parseSedOptions, createRegExp, isTY, max_, min_
} from "../lib/utils"
import { getVisibleClientRect_, center_, view_, selRange_ } from "../lib/rect"
import {
  IsInDOM_, createElement_, htmlTag_, getComputedStyle_, getEditableType_, isIFrameElement, GetParent_unsafe_,
  ElementProto, querySelector_unsafe_, getInputType, uneditableInputs_, GetShadowRoot_, CLK, scrollingEl_,
  findMainSummary_, getSelection_, removeEl_s, appendNode_s, getMediaUrl, getMediaTag, INP, ALA, attr_s,
  setOrRemoveAttr_s, toggleClass_s, textContent_s
} from "../lib/dom_utils"
import {
  hintOptions, mode1_, hintMode_, hintApi, hintManager, coreHints, setMode, detectUsableChild, hintCount_,
} from "./link_hints"
import { currentScrolling, set_cachedScrollable, set_currentScrolling } from "./scroller"
import { post_, send_ } from "./port"
import {
  collpaseSelection, evalIfOK, flash_, getRect, lastFlashEl, resetSelectionToDocStart, selectAllOfNode,
} from "./dom_ui"
import { pushHandler_, removeHandler_, isEscape_, getMappedKey, prevent_, suppressTail_ } from "../lib/keyboard_utils"
import { insert_Lock_ } from "./insert"
import { unhover_, hover_, click_, select_, mouse_, catchAsyncErrorSilently } from "./async_dispatcher"
import { omni_box, focusOmni } from "./omni"
import { execCommand } from "./mode_find"
import { kDir, kExtend } from "./visual"
type LinkEl = Hint[0];
interface Executor {
  (this: void, linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintItem, "r">): void | boolean;
}
interface HTMLExecutor {
  (this: void, linkEl: SafeHTMLElement, rect: Rect | null, hintEl: Pick<HintItem, "r">): void | boolean;
}
export type LinkAction = readonly [ executor: Executor, ...modes: HintMode[] ]

let hintModeAction: LinkAction | null | undefined
let hintKeyCode_ = kKeyCode.None
let removeFlash = null as (() => void) | null

export { removeFlash, hintKeyCode_ as hintKeyCode }
export function set_hintModeAction (_newHintModeAction: LinkAction | null): void { hintModeAction = _newHintModeAction }
export function set_removeFlash (_newRmFlash: null): void { removeFlash = _newRmFlash }
export function set_hintKeyCode_ (_newHintKeyCode: kKeyCode): void { hintKeyCode_ = _newHintKeyCode }

export const executeHintInOfficer = (hint: HintItem, event?: HandlerNS.Event): Rect | null | undefined | 0 => {
  const masterOrA = hintManager || coreHints, keyStatus = masterOrA.$().k;
  let rect: Rect | null | undefined, clickEl: LinkEl | null = hint.d;
  if (hintManager) {
    set_keydownEvents_(hintApi.a())
    setMode(masterOrA.$().m, 1);
  }
  if (event) {
    prevent_(event.e);
    keydownEvents_[hintKeyCode_ = event.i] = 1
  }
  masterOrA.v(); // here .keyStatus_ is reset
  if (IsInDOM_(clickEl)) {
    // must get outline first, because clickEl may hide itself when activated
    // must use UI.getRect, so that zooms are updated, and prepareCrop is called
    rect = getRect(clickEl, hint.r !== clickEl ? hint.r as HTMLElementUsingMap | null : null);
    if (keyStatus.t && !keyStatus.k && !keyStatus.n) {
      if ((!(Build.BTypes & BrowserType.Chrome)
            || Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome
            || Build.MinCVer < BrowserVer.MinUserActivationV2 && chromeVer_ < BrowserVer.MinUserActivationV2)
          && !fgCache.w) {
        // e.g.: https://github.com/philc/vimium/issues/3103#issuecomment-552653871
        suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents);
      } else {
        removeFlash = rect && flash_(null, rect, -1);
        masterOrA.j(coreHints, hint, rect && lastFlashEl)
        return 0
      }
    }
    hintManager && focus();
    // tolerate new rects in some cases
    const showRect = hintModeAction![0](clickEl, rect, hint);
    if (!removeFlash && showRect !== false && (rect || (rect = getVisibleClientRect_(clickEl)))) {
      timeout_(function (): void {
        (showRect || doc.hasFocus()) && flash_(null, rect!);
      }, 17);
    }
  } else {
    clickEl = null;
    hintApi.t({ k: kTip.linkRemoved, d: 2000 })
  }
  (<RegExpOne> /a?/).test("")
  return rect
}

const getUrlData = (link: SafeHTMLElement): string => {
  const str = link.dataset.vimUrl;
  if (str) {
    (link = createElement_("a")).href = str.trim();
  }
  // $1.href is ensured well-formed by @GetLinks_
  return htmlTag_(link) === "a" ? (link as HTMLAnchorElement).href : "";
}

/** return: img is HTMLImageElement | HTMLAnchorElement | HTMLElement[style={backgroundImage}] */
const getMediaOrBgImageUrl = (img: SafeHTMLElement): string | void => {
  let mediaTag = getMediaTag(img)
  let src = img.dataset.canonicalSrc || img.dataset.src || ""
  let text: string | null, n: number
  if (!mediaTag) {
    if ((n = (img as HTMLImageElement).naturalWidth) && n < 3
        && (n = (img as HTMLImageElement).naturalHeight) && n < 3) {
      mediaTag = kMediaTag.LAST + 1
    }
  }
  text = mediaTag < kMediaTag.others ? src || getMediaUrl(img, mediaTag < kMediaTag.MIN_NOT_MEDIA_EL) : ""
  if (mediaTag > kMediaTag.MIN_NOT_MEDIA_EL - 1) {
    if (!isImageUrl(text)) {
      let arr = createRegExp(kTip.cssUrl, "i").exec(
            (mediaTag > kMediaTag.LAST ? getComputedStyle_(img) : img.style).backgroundImage!)
      if (arr && arr[1]) {
        const a1 = createElement_("a");
        a1.href = arr[1].replace(<RegExpG> /\\('|")/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || isJSUrl(text)
      || src.length > text.length + 7 && (text === (img as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  return text || hintApi.t({ k: kTip.notImg })
}

const getImageName_ = (img: SafeHTMLElement): string => attr_s(img, "download") || attr_s(img, "alt") || img.title

const openUrl = (url: string, incognito?: boolean): void => {
  hintApi.p({
    H: kFgReq.openUrl,
    r: (hintMode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg)
       + ReuseType.FLAG_LAST_WINDOW * <number> <number | boolean> (hintOptions.newtab === "last-window"),
    u: url,
    f: incognito,
    e: parseSedOptions(hintOptions),
    i: incognito,
    k: hintOptions.keyword, t: hintOptions.testUrl
  });
}

const unhoverOnEsc: HandlerNS.Handler = event => {
    removeHandler_(kHandler.unhoverOnEsc)
    if (isEscape_(getMappedKey(event, kModeId.Link)) && !insert_Lock_()) {
      unhover_();
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
}

const focusIFrame = (el: KnownIFrameElement): BOOL => {
  hintOptions.m = hintMode_;
  (hintManager || coreHints).$(1)
  if (el === omni_box) {
    focusOmni()
    return 1
  }
  el.focus()
  // focus first, so that childApi is up-to-date (in case <iframe> was removed on focus)
  const childApi = detectUsableChild(el)
  if (!childApi) {
    send_(kFgReq.execInChild, {
      u: el.src, c: kFgCmd.linkHints, n: hintCount_, k: hintKeyCode_, a: hintOptions
    }, (res): void => {
      if (!res) {
        el.contentWindow.focus()
      }
    })
  } else {
    childApi.f(kFgCmd.linkHints, hintOptions, hintCount_, 1)
  }
  return 0
}

export const linkActionArray: readonly LinkAction[] = [
[
  (element, rect): void => {
    const type = getEditableType_<0>(element), toggleMap = hintOptions.toggle;
    // here not check lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    set_currentScrolling(weakRef_(element))
    catchAsyncErrorSilently(hover_(element, center_(rect))).then((): void => {
    type || element.focus && !isIFrameElement(element) && element.focus()
    set_cachedScrollable(currentScrolling)
    if (mode1_ < HintMode.min_job) { // called from Modes[-1]
      hintApi.t({ k: kTip.hoverScrollable })
      return
    }
    hintMode_ & HintMode.queue || pushHandler_(unhoverOnEsc, kHandler.unhoverOnEsc)
    if (!toggleMap || !isTY(toggleMap, kTY.obj)) { return }
    safer(toggleMap);
    let ancestors: Element[] = [], top: Element | null = element, re = <RegExpOne> /^-?\d+/;
    for (let key in toggleMap) {
      // if no Element::closest, go up by 6 levels and then query the selector
      let selector = key, prefix = re.exec(key), upper = prefix && prefix[0];
      if (upper) {
        selector = selector.slice(upper.length);
      }
      let up = (upper as string | number as number) | 0, selected: Element | null = null;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest && !up) {
        up = element.closest ? 0 : 6;
      }
      selector = selector.trim();
      while (up && up + 1 >= ancestors.length && top) {
        ancestors.push(top);
        top = GetParent_unsafe_(top, PNType.RevealSlotAndGotoParent);
      }
      try {
        if (selector && (selected = up
              ? Build.BTypes & ~BrowserType.Firefox
                ? ElementProto().querySelector.call(ancestors[max_(0, min_(up + 1, ancestors.length - 1))]
                    , selector)
                : querySelector_unsafe_(selector, ancestors[max_(0, min_(up + 1, ancestors.length - 1))
                    ] as SafeElement)
              : element.closest!(selector))) {
          for (const classNameStr of toggleMap[key].split(" ")) {
            classNameStr.trim() && toggleClass_s(selected, classNameStr)
          }
        }
      } catch {}
      if (selected) {
        break;
      }
    }
    })
  }
  , HintMode.HOVER
],
[
  (el): void => { unhover_(el) }
  , HintMode.UNHOVER
],
[
  (link): boolean | void => {
    const mode1 = mode1_;
    let isUrl = mode1 > HintMode.min_link_job - 1 && mode1 < HintMode.max_link_job + 1,
        childEl: Element | null,
        str: string | null | undefined;
    if (isUrl) {
      str = getUrlData(link as SafeHTMLElement);
      str && (<RegExpI> /^mailto:./).test(str) && (str = str.slice(7).trim());
    }
    else if ((str = attr_s(link, "data-vim-text"))
        && (str = str.trim())) { /* empty */ }
    else if (isIFrameElement(link)) { return !focusIFrame(link) }
    else {
      const tag = htmlTag_(link)
      if (tag === INP) {
        let type = getInputType(link as HTMLInputElement), f: HTMLInputElement["files"];
        if (type === "pa") {
          return hintApi.t({ k: kTip.ignorePassword })
        }
        if (!uneditableInputs_[type]) {
          str = (link as HTMLInputElement).value || (link as HTMLInputElement).placeholder;
        } else if (type === "fi") {
          str = (f = (link as HTMLInputElement).files) && f.length > 0 ? f[0].name : "";
        } else if ("buimsure".includes(type)) {
          str = (link as HTMLInputElement).value;
        }
      } else {
        str = tag === "textarea" ? (link as HTMLTextAreaElement).value
          : tag === "select" ? ((link as HTMLSelectElement).selectedIndex < 0
              ? "" : (link as HTMLSelectElement).options[(link as HTMLSelectElement).selectedIndex].text)
          : tag && (str = (link as SafeHTMLElement).innerText.trim(),
              (<RegExpI> /^mailto:./i).test(str) ? str.slice(7)
              : str
                || GetShadowRoot_(link) && (childEl = GetShadowRoot_(link)!.querySelector("div,span"))
                    && htmlTag_(childEl) && (childEl as SafeHTMLElement).innerText
                || str).trim()
            || (str = textContent_s(link).trim()) && str.replace(<RegExpG> /\s+/g, " ")
      }
      str = str && str.trim();
      if (!str && tag) {
        str = (link as SafeHTMLElement).title.trim() || (attr_s(link, ALA) || "").trim();
      }
    }
    if (mode1 > HintMode.min_edit - 1 && mode1 < HintMode.max_edit + 1) {
      let newtab = hintOptions.newtab
      // this frame is normal, so during Vomnibar.activate, checkHidden will only pass (in most cases)
      type Options = FgReq[kFgReq.vomnibar] & { c: number } & Partial<VomnibarNS.ContentOptions>;
      (post_ as ComplicatedVPort)<kFgReq.vomnibar, Options>({
        H: kFgReq.vomnibar,
        c: 1,
        newtab: newtab != null ? !!newtab : !isUrl,
        url: str,
        keyword: hintOptions.keyword
      });
      return;
    } else if (hintOptions.richText) {
      const sel = getSelection_(), range = selRange_(sel)
      selectAllOfNode(link)
      execCommand("copy", doc)
      resetSelectionToDocStart(sel, range)
      return
    } else if (!str) {
      return hintApi.t({ k: isUrl ? kTip.noUrlCopied : kTip.noTextCopied })
    } else if (mode1 === HintMode.SEARCH_TEXT) {
      return openUrl(str);
    }
    // then mode1 can only be HintMode.COPY_*
    let lastYanked = mode1 & HintMode.list ? (hintManager || coreHints).y : 0 as const;
    if (lastYanked) {
      if (lastYanked.indexOf(str) >= 0) {
        return hintApi.t({ k: kTip.noNewToCopy })
      }
      lastYanked.push(str);
    }
    hintApi.p({
      H: kFgReq.copy,
      j: hintOptions.join,
      e: parseSedOptions(hintOptions),
      d: isUrl && hintOptions.decoded !== !1,
      s: lastYanked || str
    });
  }
  , HintMode.SEARCH_TEXT
  , HintMode.COPY_TEXT
  , HintMode.COPY_TEXT | HintMode.list
  , HintMode.COPY_URL
  , HintMode.COPY_URL | HintMode.list
  , HintMode.EDIT_LINK_URL
  , HintMode.EDIT_TEXT
],
[
  ((link: SafeHTMLElement): void => {
    const url = getUrlData(link);
    if (!evalIfOK(url)) {
      openUrl(url, !0);
    }
  }) as HTMLExecutor as Executor
  , HintMode.OPEN_INCOGNITO_LINK
],
[
  ((element: SafeHTMLElement): void => {
    let text = getMediaOrBgImageUrl(element)
    if (!text) { return; }
    const url = text, i = text.indexOf("://"), a = createElement_("a");
    if (i > 0) {
      text = text.slice(text.indexOf("/", i + 4) + 1);
    }
    if (text.length > 40) {
      text = text.slice(0, 39) + "\u2026";
    }
    a.href = url;
    a.download = getImageName_(element);
    /** @todo: how to trigger download */
    mouse_(a, CLK, [0, 0], [!0, !1, !1, !1]);
    hintApi.t({ k: kTip.downloaded, t: text })
  }) as HTMLExecutor as Executor
  , HintMode.DOWNLOAD_MEDIA
],
[
  ((img: SafeHTMLElement): void => {
    const text = getMediaOrBgImageUrl(img);
    if (!text) { return; }
    post_({
      H: kFgReq.openImage,
      r: hintMode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      f: getImageName_(img),
      e: parseSedOptions(hintOptions),
      u: text,
      a: hintOptions.auto
    });
  }) as HTMLExecutor as Executor
  , HintMode.OPEN_IMAGE
],
[
  ((element: SafeHTMLElement, rect): void => {
    let notAnchor = htmlTag_(element) !== "a", H = "href",
    link = notAnchor ? createElement_("a") : element as HTMLAnchorElement,
    oldUrl: string | null = notAnchor ? null : attr_s(link, H),
    url = getUrlData(element), changed = notAnchor || url !== link.href;
    if (changed) {
      link.href = url;
      if (notAnchor) {
        let top = scrollingEl_(1);
        top && appendNode_s(top, link)
      }
    }
    const kD = "download", hadNoDownload = !link.hasAttribute(kD);
    if (hadNoDownload) {
      link[kD] = "";
    }
    catchAsyncErrorSilently(click_(link, rect, 0, [!0, !1, !1, !1])).then((): void => {
    if (hadNoDownload) {
      setOrRemoveAttr_s(link, kD)
    }
    if (!changed) { /* empty */ }
    else if (notAnchor) {
      removeEl_s(link)
    } else {
      setOrRemoveAttr_s(link, H, oldUrl)
    }
    })
  }) as HTMLExecutor as Executor
  , HintMode.DOWNLOAD_LINK
],
[
  (link, rect): void | false => {
    if (hintMode_ < HintMode.min_disable_queue) {
      view_(link);
      link.focus && link.focus();
      removeFlash || flash_(link)
    } else {
      select_(link as HintsNS.InputHintItem["d"], rect, !removeFlash)
    }
    return false;
  }
  , HintMode.FOCUS
  , HintMode.FOCUS_EDITABLE
],
[
  (el): void => {
    selectAllOfNode(el)
    const sel = getSelection_()
    collpaseSelection(sel)
    sel.modify(kExtend, kDir[1], "word")
    hintOptions.visual === !1 || post_({ H: kFgReq.visualMode, c: hintOptions.caret })
  },
  HintMode.ENTER_VISUAL_MODE
],
[
  (link, rect, hint): void | boolean => {
    const tag = htmlTag_(link)
    if (isIFrameElement(link)) { return !focusIFrame(link) }
    else if (tag === "details") {
      const summary = findMainSummary_(link as HTMLDetailsElement);
      if (summary) {
          // `HTMLSummaryElement::DefaultEventHandler(event)` in
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_summary_element.cc?l=109
          rect = (link as HTMLDetailsElement).open || !rect ? getVisibleClientRect_(summary) : rect;
          catchAsyncErrorSilently(click_(summary, rect, 1))
          .then((): void => { removeFlash || rect && flash_(null, rect) })
          return false;
      }
      (link as HTMLDetailsElement).open = !(link as HTMLDetailsElement).open;
      return;
    } else if (hint.r && hint.r === link) {
      linkActionArray[0][0](link, rect, hint);
      return;
    } else if (getEditableType_<0>(link) > EditableType.TextBox - 1) {
      select_(link as LockableElement, rect, !removeFlash);
      return false;
    }
    const mask = hintMode_ & HintMode.mask_focus_new, isMac = !fgCache.o,
    isRight = hintOptions.button === "right",
    dblClick = !!hintOptions.dblclick && !isRight,
    newTabStr = hintOptions.newtab + "",
    otherActions = isRight || dblClick,
    newTab = mask > HintMode.newTab - 1 && !otherActions,
    newtab_n_active = newTab && mask > HintMode.newtab_n_active - 1,
    newWindow = newTabStr === "window" && !otherActions,
    cnsForWin = hintOptions.ctrlShiftForWindow,
    autoUnhover = hintOptions.autoUnhover,
    isQueue = hintMode_ & HintMode.queue,
    noCtrlPlusShiftForActive: boolean | undefined = cnsForWin != null ? cnsForWin : hintOptions.noCtrlPlusShift,
    ctrl = newTab && !(newtab_n_active && noCtrlPlusShiftForActive) || newWindow && !!noCtrlPlusShiftForActive,
    shift = newWindow || newtab_n_active,
    specialActions = dblClick ? kClickAction.forceToDblclick : otherActions
        || (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$Element$$Closest
            || link.closest ? !link.closest!("a") : tag !== "a") ? kClickAction.none
        : newTabStr === "force" ? newTab
            ? kClickAction.forceToOpenInNewTab | kClickAction.newTabFromMode : kClickAction.forceToOpenInNewTab
        : newTabStr === "last-window" ? newTab
            ? kClickAction.forceToOpenInLastWnd | kClickAction.newTabFromMode : kClickAction.forceToOpenInLastWnd
        : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
        ? newWindow ? kClickAction.openInNewWindow
          : newTabStr.startsWith("no-") ? kClickAction.none // to skip "click" events, one should use "force"
          : newTab // need to work around Firefox's popup blocker
            ? kClickAction.plainMayOpenManually | kClickAction.newTabFromMode : kClickAction.plainMayOpenManually
        : kClickAction.none;
    catchAsyncErrorSilently(click_(link
        , rect, mask > 0 || (link as ElementToHTMLorOtherFormatted).tabIndex! >= 0
        , [!1, ctrl && !isMac, ctrl && isMac, shift]
        , specialActions, isRight ? kClickButton.second : kClickButton.none
        , !(Build.BTypes & BrowserType.Chrome) || otherActions || newTab ? 0 : hintOptions.touch
        , hintOptions))
    .then((ret): void => {
      autoUnhover ? unhover_() : isQueue || ret && pushHandler_(unhoverOnEsc, kHandler.unhoverOnEsc)
    })
  }
  , HintMode.OPEN_IN_CURRENT_TAB
  , HintMode.OPEN_IN_NEW_BG_TAB
  , HintMode.OPEN_IN_NEW_FG_TAB
]
]

if (!(Build.NDEBUG || linkActionArray.length === 10)) {
  console.log("Assert error: linkActions should have 10 items");
}
