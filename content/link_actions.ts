import HintItem = HintsNS.HintItem
import {
  safer, fgCache, VOther, isImageUrl, jsRe_, set_keydownEvents_, keydownEvents_, timeout_, doc,
  chromeVer_,
  weakRef_,
} from "../lib/utils"
import {
  getEditableType_, center_, htmlTag_, GetParent_unsafe_, uneditableInputs_, createElement_,
  scrollingEl_, view_, findMainSummary_, getVisibleClientRect_, getComputedStyle_, IsInDOM_, getInputType,
  CLK, elementProto, querySelector_unsafe_,
} from "../lib/dom_utils"
import {
  hintOptions, mode1_, mode_, hintApi, hintManager, coreHints,
  highlightChild, setMode,
} from "./link_hints"
import { set_currentScrolling, syncCachedScrollable } from "./scroller"
import { post_ } from "./port"
import { evalIfOK, flash_, getRect, lastFlashEl } from "./dom_ui"
import { pushHandler_, removeHandler_, isEscape_, getMappedKey, prevent_, suppressTail_ } from "../lib/keyboard_utils"
import { insert_Lock_ } from "./insert"
import { unhover_, hover_, click_, select_, mouse_, catchAsyncErrorSilently } from "./async_dispatcher"
type LinkEl = Hint[0];
interface Executor {
  (this: void, linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintItem, "r">): void | boolean;
}
interface LinkAction extends ReadonlyArray<Executor | HintMode> {
  [0]: Executor;
  [1]: HintMode;
}

let hintModeAction: LinkAction | null | undefined
let keyCode_ = kKeyCode.None
let removeFlash = null as (() => void) | null

export { removeFlash, keyCode_ as hintKeyCode }
export function set_hintModeAction (_newHintModeAction: LinkAction | null): void { hintModeAction = _newHintModeAction }
export const resetRemoveFlash = (): void => { removeFlash = null }
export const resetHintKeyCode = (): void => { keyCode_ = kKeyCode.None }

export const executeHintInOfficer = (hint: HintItem, event?: HandlerNS.Event): Rect | null | undefined | 0 => {
  const masterOrA = hintManager || coreHints, keyStatus = masterOrA.$().k;
  let rect: Rect | null | undefined, clickEl: LinkEl | null = hint.d;
  if (hintManager) {
    /*#__INLINE__*/ set_keydownEvents_(hintApi.a());
    setMode(masterOrA.$().m, 1);
  }
  if (event) {
    prevent_(event.e);
    keydownEvents_[keyCode_ = event.i] = 1;
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
    hintApi.t(kTip.linkRemoved, 2000)
  }
  (<RegExpOne> /0?/).test("");
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
const getImageUrl = (img: SafeHTMLElement): string | void => {
  let text: string | null, src = img.dataset.src || "", elTag = htmlTag_(img), n: number,
  notImg: 0 | 1 | 2 = elTag !== "img" ? 1 : 0;
  if (!notImg) {
    text = (img as HTMLImageElement).currentSrc || img.getAttribute("src") && (img as HTMLImageElement).src;
    if ((n = (img as HTMLImageElement).naturalWidth) && n < 3
        && (n = (img as HTMLImageElement).naturalHeight) && n < 3) {
      notImg = 2;
      text = "";
    }
  } else {
    text = elTag === "a" ? img.getAttribute("href") && (img as HTMLAnchorElement).href : "";
  }
  if (notImg) {
    if (!isImageUrl(text)) {
      let arr = (<RegExpI> /^url\(\s?['"]?((?:\\['"]|[^'"])+?)['"]?\s?\)/i).exec(
        (notImg > 1 ? getComputedStyle_(img) : img.style).backgroundImage!);
      if (arr && arr[1]) {
        const a1 = createElement_("a");
        a1.href = arr[1].replace(<RegExpG> /\\(['"])/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || jsRe_.test(text)
      || src.length > text.length + 7 && (text === (img as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  return text || hintApi.t(kTip.notImg, 1000)
}

const getImageName_ = (img: SafeHTMLElement): string =>
  img.getAttribute("download") || img.getAttribute("alt") || img.title

const openUrl = (url: string, incognito?: boolean): void => {
  hintApi.p({
    H: kFgReq.openUrl,
    r: mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
    u: url,
    f: incognito,
    e: hintOptions.sed,
    i: incognito,
    k: hintOptions.keyword, t: hintOptions.testUrl
  });
}

const unhoverOnEsc = (): void => {
  const exit: HandlerNS.RefHandler = event => {
    removeHandler_(exit);
    if (isEscape_(getMappedKey(event, kModeId.Link)) && !insert_Lock_()) {
      unhover_();
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  };
  pushHandler_(exit, exit);
}

export const linkActions: readonly LinkAction[] = [
[
  (element, rect): void => {
    const type = getEditableType_<0>(element), toggleMap = hintOptions.toggle;
    // here not check lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    /*#__INLINE__*/ set_currentScrolling(weakRef_(element));
    catchAsyncErrorSilently(hover_(element, center_(rect))).then((): void => {
    type || element.focus && !(<RegExpI> /^i?frame$/).test(htmlTag_(element)) && element.focus();
    /*#__INLINE__*/ syncCachedScrollable();
    if (mode1_ < HintMode.min_job) { // called from Modes[-1]
      hintApi.t(kTip.hoverScrollable, 1000)
      return
    }
    mode_ & HintMode.queue || unhoverOnEsc();
    if (!toggleMap || typeof toggleMap !== "object") { return; }
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
                ? elementProto().querySelector.call(ancestors[Math.max(0, Math.min(up + 1, ancestors.length - 1))]
                    , selector)
                : querySelector_unsafe_(selector, ancestors[Math.max(0, Math.min(up + 1, ancestors.length - 1))
                    ] as SafeElement)
              : element.closest!(selector))) {
          for (const clsName of toggleMap[key].split(" ")) {
            clsName.trim() && selected.classList.toggle(clsName);
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
        str: string | null | undefined;
    if (isUrl) {
      str = getUrlData(link as SafeHTMLElement);
      str && (<RegExpI> /^mailto:./).test(str) && (str = str.slice(7).trim());
    }
    else if ((str = link.getAttribute("data-vim-text"))
        && (str = str.trim())) { /* empty */ }
    else {
      const tag = htmlTag_(link), isChild = highlightChild(link, tag);
      if (isChild) { return isChild > 1; }
      if (tag === "input") {
        let type = getInputType(link as HTMLInputElement), f: HTMLInputElement["files"];
        if (type === "pa") {
          return hintApi.t(kTip.ignorePassword, 2000)
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
              (<RegExpI> /^mailto:./).test(str) ? str.slice(7).trim() : str)
            || (str = link.textContent.trim()) && str.replace(<RegExpG> /\s+/g, " ")
          ;
      }
      str = str && str.trim();
      if (!str && tag) {
        str = (link as SafeHTMLElement).title.trim() || (link.getAttribute("aria-label") || "").trim();
      }
    }
    if (!str) {
      return hintApi.s("", isUrl)
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
    } else if (mode1 === HintMode.SEARCH_TEXT) {
      return openUrl(str);
    }
    // then mode1 can only be HintMode.COPY_*
    let lastYanked = mode1 & HintMode.list ? (hintManager || coreHints).y : 0 as const;
    if (lastYanked) {
      if (lastYanked.indexOf(str) >= 0) {
        return hintApi.t(kTip.noNewToCopy)
      }
      lastYanked.push(str);
      hintApi.s(`[${lastYanked.length}] ` + str)
    }
    hintApi.p({
      H: kFgReq.copy,
      j: hintOptions.join,
      e: hintOptions.sed,
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
  (link: SafeHTMLElement): void => {
    const url = getUrlData(link);
    if (!evalIfOK(url)) {
      openUrl(url, !0);
    }
  }
  , HintMode.OPEN_INCOGNITO_LINK
] as LinkAction,
[
  (element: SafeHTMLElement): void => {
    let tag = htmlTag_(element), text: string | void;
    if (tag === "video" || tag === "audio") {
      text = (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src;
    } else {
      text = getImageUrl(element);
    }
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
    hintApi.t(kTip.downloaded, 2000, [text])
  }
  , HintMode.DOWNLOAD_MEDIA
] as LinkAction,
[
  (img: SafeHTMLElement): void => {
    const text = getImageUrl(img);
    if (!text) { return; }
    post_({
      H: kFgReq.openImage,
      r: mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      f: getImageName_(img),
      e: hintOptions.sed,
      u: text,
      a: hintOptions.auto
    });
  }
  , HintMode.OPEN_IMAGE
] as LinkAction,
[
  (element: SafeHTMLElement, rect): void => {
    let notAnchor = htmlTag_(element) !== "a", H = "href",
    link = notAnchor ? createElement_("a") : element as HTMLAnchorElement,
    oldUrl: string | null = notAnchor ? null : link.getAttribute(H),
    url = getUrlData(element), changed = notAnchor || url !== link.href;
    if (changed) {
      link.href = url;
      if (notAnchor) {
        let top = scrollingEl_(1);
        top && top.appendChild(link);
      }
    }
    const kD = "download", hadNoDownload = !link.hasAttribute(kD);
    if (hadNoDownload) {
      link[kD] = "";
    }
    catchAsyncErrorSilently(click_(link, rect, 0, [!0, !1, !1, !1])).then((): void => {
    if (hadNoDownload) {
      link.removeAttribute(kD);
    }
    if (!changed) { /* empty */ }
    else if (notAnchor) {
      link.remove();
    }
    else if (oldUrl != null) {
      link.setAttribute(H, oldUrl);
    } else {
      link.removeAttribute(H);
    }
    })
  }
  , HintMode.DOWNLOAD_LINK
] as LinkAction,
[
  (link, rect): void | false => {
    if (mode_ < HintMode.min_disable_queue) {
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
  (link, rect, hint): void | boolean => {
    const tag = htmlTag_(link), isChild = highlightChild(link, tag);
    if (isChild) {
      return isChild > 1;
    }
    if (tag === "details") {
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
      linkActions[0][0](link, rect, hint);
      return;
    } else if (getEditableType_<0>(link) > EditableType.TextBox - 1) {
      select_(link as LockableElement, rect, !removeFlash);
      return false;
    }
    const mask = mode_ & HintMode.mask_focus_new, isMac = !fgCache.o,
    isRight = hintOptions.button === "right",
    dblClick = !!hintOptions.dblclick && !isRight,
    newTabOption = hintOptions.newtab,
    otherActions = isRight || dblClick,
    newTab = mask > HintMode.newTab - 1 && !otherActions,
    newtab_n_active = newTab && mask > HintMode.newtab_n_active - 1,
    newWindow = newTabOption === "window" && !otherActions,
    cnsForWin = hintOptions.ctrlShiftForWindow,
    autoUnhover = hintOptions.autoUnhover,
    isQueue = mode_ & HintMode.queue,
    noCtrlPlusShiftForActive: boolean | undefined = cnsForWin != null ? cnsForWin : hintOptions.noCtrlPlusShift,
    ctrl = newTab && !(newtab_n_active && noCtrlPlusShiftForActive) || newWindow && !!noCtrlPlusShiftForActive,
    shift = newWindow || newtab_n_active,
    specialActions = dblClick ? kClickAction.forceToDblclick : otherActions
        || (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$Element$$Closest
            || link.closest ? !link.closest!("a") : tag !== "a") ? kClickAction.none
        : newTabOption === "force" ? newTab
            ? kClickAction.forceToOpenInNewTab | kClickAction.newTabFromMode : kClickAction.forceToOpenInNewTab
        : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
        ? newWindow ? kClickAction.openInNewWindow
          : newTab // need to work around Firefox's popup blocker
            ? kClickAction.plainMayOpenManually | kClickAction.newTabFromMode : kClickAction.plainMayOpenManually
        : kClickAction.none;
    catchAsyncErrorSilently(click_(link
        , rect, mask > 0 || (link as ElementToHTMLorSVG).tabIndex! >= 0
        , [!1, ctrl && !isMac, ctrl && isMac, shift]
        , specialActions, isRight ? kClickButton.second : kClickButton.none
        , !(Build.BTypes & BrowserType.Chrome) || otherActions || newTab ? 0 : hintOptions.touch))
    .then((ret): void => {
      autoUnhover ? unhover_() : isQueue || ret && unhoverOnEsc()
    })
  }
  , HintMode.OPEN_IN_CURRENT_TAB
  , HintMode.OPEN_IN_NEW_BG_TAB
  , HintMode.OPEN_IN_NEW_FG_TAB
]
]

if (!(Build.NDEBUG || linkActions.length === 9)) {
  console.log("Assert error: linkActions should have 9 items");
}
