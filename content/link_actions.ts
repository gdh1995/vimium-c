import {
  safer, fgCache, isImageUrl, isJSUrl, set_keydownEvents_, keydownEvents_, timeout_, doc, chromeVer_, weakRef_,
  parseSedOptions, createRegExp, isTY, max_, min_, OnFirefox, OnChrome, safeCall, loc_, parseOpenPageUrlOptions
} from "../lib/utils"
import { getVisibleClientRect_, center_, view_, selRange_ } from "../lib/rect"
import {
  IsInDOM_, createElement_, htmlTag_, getComputedStyle_, getEditableType_, isIFrameElement, GetParent_unsafe_, focus_,
  kMediaTag, ElementProto, querySelector_unsafe_, getInputType, uneditableInputs_, GetShadowRoot_, scrollingEl_,
  findMainSummary_, getSelection_, removeEl_s, appendNode_s, getMediaUrl, getMediaTag, INP, ALA, attr_s,
  setOrRemoveAttr_s, toggleClass_s, textContent_s, notSafe_not_ff_, modifySel, SafeEl_not_ff_
} from "../lib/dom_utils"
import { getPreferredRectOfAnchor } from "./local_links"
import {
  hintOptions, mode1_, hintMode_, hintApi, hintManager, coreHints, setMode, detectUsableChild, hintCount_,
  ExecutableHintItem
} from "./link_hints"
import { currentScrolling, set_cachedScrollable, set_currentScrolling } from "./scroller"
import { post_, send_ } from "./port"
import {
  collpaseSelection, evalIfOK, flash_, getRect, getSelected, lastFlashEl, resetSelectionToDocStart, selectAllOfNode,
} from "./dom_ui"
import { pushHandler_, removeHandler_, isEscape_, getMappedKey, prevent_, suppressTail_ } from "../lib/keyboard_utils"
import { insert_Lock_ } from "./insert"
import {
  kClickAction, kClickButton, unhover_async, hover_async, click_async, select_, catchAsyncErrorSilently
} from "./async_dispatcher"
import { omni_box, focusOmni } from "./omni"
import { execCommand } from "./mode_find"
type LinkEl = Hint[0];

let removeFlash: (() => void) | null | undefined

export { removeFlash }
export function set_removeFlash (_newRmFlash: null): void { removeFlash = _newRmFlash }

export const executeHintInOfficer = (hint: ExecutableHintItem
    , event?: HandlerNS.Event | null | 0, knownRect?: Rect | null | 0 | false): Rect | null | undefined | 0 => {

const unhoverOnEsc: HandlerNS.Handler = event => {
  removeHandler_(kHandler.unhoverOnEsc)
  if (isEscape_(getMappedKey(event, kModeId.Link)) && !insert_Lock_()) {
    catchAsyncErrorSilently(unhover_async())
    return HandlerResult.Prevent;
  }
  return HandlerResult.Nothing;
}

const accessElAttr = (isUrl?: 1): [string: string, isUserCustomized?: BOOL] => {
  type primitiveObject = boolean | number | string | object
  const dataset = (clickEl as SafeHTMLElement).dataset
  for (let accessor of ((hintOptions.access || "") + "").split(",")) {
    const arr = accessor.trim().split(":"), selector = arr.length === 2 ? arr[0] : 0
    const el: SafeElement | null = !selector ? clickEl
        : OnFirefox ? querySelector_unsafe_(selector) as SafeElement | null
        : SafeEl_not_ff_!(querySelector_unsafe_(selector))
    let json: Dict<primitiveObject | null> | primitiveObject | null | undefined | Element = el
    for (const prop of arr[+!!selector].split(".")) {
      if (json && isTY(json)) {
        json = safeCall<string, any>(JSON.parse, json)
      }
      json = json != el ? json && isTY(json, kTY.obj) && (json as Dict<primitiveObject | null>)[prop]
          : el ? htmlTag_<1>(el) && (el.dataset as Dict<string>)[prop] || attr_s(el, prop)
          : 0
    }
    if (json && isTY(json)) { return [json, 1] }
  }
  return [(isUrl ? dataset.vimUrl : dataset.canonicalSrc || dataset.src) || ""]
}

const getUrlData = (): string => {
  let link = clickEl as SafeHTMLElement, str = accessElAttr(1)[0]
  if (str) {
    (link = createElement_("a")).href = str.trim();
  }
  // $1.href is ensured well-formed by @GetLinks_
  return htmlTag_(link) === "a" ? (link as HTMLAnchorElement).href : "";
}

/** return: img is HTMLImageElement | HTMLAnchorElement | HTMLElement[style={backgroundImage}] */
const downloadOrOpenMedia = (): void => {
  const filename = attr_s(clickEl, kD) || attr_s(clickEl, "alt") || (clickEl as SafeHTMLElement).title
  let mediaTag = getMediaTag(clickEl as SafeHTMLElement)
  let srcObj = accessElAttr(), src = srcObj[0]
  let text: string | null, n: number
  if (!mediaTag) {
    if ((n = (clickEl as HTMLImageElement).naturalWidth) && n < 3
        && (n = (clickEl as HTMLImageElement).naturalHeight) && n < 3) {
      mediaTag = kMediaTag.LAST + 1
    }
  }
  text = srcObj[1] ? src : mediaTag < kMediaTag.others
      ? src || getMediaUrl(clickEl as SafeHTMLElement, mediaTag < kMediaTag.MIN_NOT_MEDIA_EL) : ""
  if (mediaTag > kMediaTag.MIN_NOT_MEDIA_EL - 1) {
    if (!isImageUrl(text)) {
      let arr = createRegExp(kTip.cssUrl, "i").exec(
            (mediaTag > kMediaTag.LAST ? getComputedStyle_(clickEl)
              : (clickEl as SafeHTMLElement).style).backgroundImage!)
      if (arr && arr[1]) {
        const a1 = createElement_("a");
        a1.href = arr[1].replace(<RegExpG> /\\('|")/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || isJSUrl(text)
      || src.length > text.length + 7 && (text === (clickEl as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  if (!text) { hintApi.t({ k: kTip.notImg }) }
  else if (OnFirefox && hintOptions.keyword != null || mode1_ === HintMode.OPEN_IMAGE) {
    post_({
      H: kFgReq.openImage, r: hintMode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      m: mode1_, q: parseOpenPageUrlOptions(hintOptions), a: hintOptions.auto,
      f: filename, u: text
    })
  } else {
    downloadLink(text, filename)
    n = text.indexOf("://")
    text = n > 0 ? text.slice(text.indexOf("/", n + 4) + 1) : text
    text = text.length > 40 ? text.slice(0, 39) + "\u2026" : text
    timeout_((): void => { hintApi.t({ k: kTip.downloaded, t: text! }) }, 0)
  }
}

const openTextOrUrl = (url: string, incognito?: boolean): void => {
  hintApi.p({
    H: kFgReq.openUrl,
    r: hintOptions.reuse != null ? hintOptions.reuse : (hintMode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg)
       + ReuseType.OFFSET_LAST_WINDOW * <number> <number | boolean> (hintOptions.newtab === kLW),
    u: url, f: incognito, i: incognito, o: parseOpenPageUrlOptions(hintOptions)
  });
}

const hoverEl = (): void => {
    const type = getEditableType_<0>(clickEl), toggleMap = hintOptions.toggle;
    const doesFocus = !type && !isIFrameElement(clickEl)
        && checkFocus((clickEl as ElementToHTMLorOtherFormatted).tabIndex! >= 0)
    // here not check lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    set_currentScrolling(weakRef_(clickEl))
    catchAsyncErrorSilently(hover_async(clickEl, center_(rect!), doesFocus)).then((): void => {
    set_cachedScrollable(currentScrolling)
    if (mode1_ < HintMode.min_job) { // called from Modes[-1]
      hintApi.t({ k: kTip.hoverScrollable })
      return
    }
    hintMode_ & HintMode.queue || pushHandler_(unhoverOnEsc, kHandler.unhoverOnEsc)
    if (!toggleMap || !isTY(toggleMap, kTY.obj)) { return }
    safer(toggleMap);
    let ancestors: Element[] = [], top: Element | null = clickEl, re = <RegExpOne> /^-?\d+/;
    for (let key in toggleMap) {
      // if no Element::closest, go up by 6 levels and then query the selector
      let selector = key, prefix = re.exec(key), upper = prefix && prefix[0];
      if (upper) {
        selector = selector.slice(upper.length);
      }
      let up = (upper as string | number as number) | 0, selected: Element | null = null;
      if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest && !up) {
        up = clickEl.closest ? 0 : 6;
      }
      selector = selector.trim();
      while (up && up + 1 >= ancestors.length && top) {
        ancestors.push(top);
        top = GetParent_unsafe_(top, PNType.RevealSlotAndGotoParent);
      }
      try {
        if (selector && (selected = up
              ? !OnFirefox
                ? ElementProto().querySelector.call(ancestors[max_(0, min_(up + 1, ancestors.length - 1))]
                    , selector)
                : querySelector_unsafe_(selector, ancestors[max_(0, min_(up + 1, ancestors.length - 1))
                    ] as SafeElement)
              : clickEl.closest!(selector))) {
          if (OnFirefox || !notSafe_not_ff_!(selected)) {
            for (const classNameStr of toggleMap[key].split(" ")) {
              classNameStr.trim() && toggleClass_s(selected as SafeElement, classNameStr)
            }
          }
        }
      } catch {}
      if (selected) {
        break;
      }
    }
    })
}

const copyText = (): void => {
    let isUrl = mode1_ > HintMode.min_link_job - 1 && mode1_ < HintMode.max_link_job + 1,
        childEl: Element | null, files: HTMLInputElement["files"],
        str: string | null | undefined;
    if (isUrl) {
      str = getUrlData()
      str && (<RegExpI> /^mailto:./).test(str) && (str = str.slice(7).trim());
    }
    else if ((str = attr_s(clickEl, "data-vim-text"))
        && (str = str.trim())) { /* empty */ }
    else {
      if (tag === INP) {
        let type = getInputType(clickEl as HTMLInputElement)
        if (type === "pa") {
          return hintApi.t({ k: kTip.ignorePassword })
        }
        if (!uneditableInputs_[type]) {
          str = (clickEl as HTMLInputElement).value || (clickEl as HTMLInputElement).placeholder;
        } else if (type === "fi") {
          str = (files = (clickEl as HTMLInputElement).files) && files.length > 0 ? files[0].name : ""
        } else if ("buimsure".includes(type)) {
          str = (clickEl as HTMLInputElement).value;
        }
      } else {
        str = tag === "textarea" ? (clickEl as HTMLTextAreaElement).value
          : tag === "select" ? ((clickEl as HTMLSelectElement).selectedIndex < 0
              ? "" : (clickEl as HTMLSelectElement).options[(clickEl as HTMLSelectElement).selectedIndex].text)
          : tag && (str = (clickEl as SafeHTMLElement).innerText.trim(),
              (<RegExpI> /^mailto:./i).test(str) ? str.slice(7)
              : str
                || GetShadowRoot_(clickEl) && (childEl = querySelector_unsafe_("div,span", GetShadowRoot_(clickEl)!))
                    && htmlTag_<1>(childEl) && childEl.innerText
                || str).trim()
            || (str = textContent_s(clickEl).trim()) && str.replace(<RegExpG> /\s+/g, " ")
      }
      str = str && str.trim();
      if (!str && tag) {
        str = (clickEl as SafeHTMLElement).title.trim() || (attr_s(clickEl, ALA) || "").trim();
      }
    }
  if (mode1_ > HintMode.min_edit - 1 && mode1_ < HintMode.max_edit + 1) {
      let newtab = hintOptions.newtab;
      // this frame is normal, so during Vomnibar.activate, checkHidden will only pass (in most cases)
      (post_ as (req: Partial<VomnibarNS.GlobalOptions> & Req.fg<kFgReq.vomnibar>) => void | 1)({
        H: kFgReq.vomnibar,
        c: 1,
        u: str,
        n: newtab != null ? !!newtab : !isUrl,
        o: parseOpenPageUrlOptions(hintOptions)
      });
  } else if (hintOptions.richText) {
      const sel = getSelected({}), range = selRange_(getSelection_())
      selectAllOfNode(clickEl)
      execCommand("copy", doc)
      resetSelectionToDocStart(sel, range)
  } else if (!str) {
      hintApi.t({ k: isUrl ? kTip.noUrlCopied : kTip.noTextCopied })
  } else if (mode1_ === HintMode.SEARCH_TEXT) {
    openTextOrUrl(str)
  } else {
    // then mode1 can only be HintMode.COPY_*
    let lastYanked = mode1_ & HintMode.list ? (hintManager || coreHints).y : 0 as const;
    if (lastYanked && lastYanked.indexOf(str) >= 0) {
      hintApi.t({ k: kTip.noNewToCopy })
    } else {
      lastYanked && lastYanked.push(str)
      hintApi.p({ H: kFgReq.copy, j: hintOptions.join, e: parseSedOptions(hintOptions),
          d: isUrl && hintOptions.decoded !== !1, s: lastYanked || str })
    }
  }
}

const downloadLink = (url?: string, filename?: string): void => {
  let notAnchor = mode1_ < HintMode.DOWNLOAD_LINK || tag !== "a", H = "href",
    link = notAnchor ? createElement_("a") : clickEl as HTMLAnchorElement,
    oldUrl: string | null = notAnchor ? null : attr_s(link, H),
    changed = notAnchor || url !== link.href
  url = url || getUrlData()
  filename = filename || attr_s(clickEl, kD) || ""
  if (OnFirefox || OnChrome && hintOptions.download === "force") {
      post_({
        H: kFgReq.downloadLink, u: url, f: filename, r: loc_.href, m: mode1_ < HintMode.DOWNLOAD_LINK
      })
      return
  }
    if (changed) {
      link.href = url;
      if (notAnchor) {
        let top = scrollingEl_(1);
        top && appendNode_s(top, link)
      }
    }
    const hadNoDownload = !link.hasAttribute(kD);
    if (hadNoDownload) {
      link[kD] = filename
    }
  catchAsyncErrorSilently(click_async(link, rect, 0, [!0, !1, !1, !1])).then((): void => {
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
}

const defaultClick = (): void => {
    const mask = hintMode_ & HintMode.mask_focus_new, isMac = !fgCache.o,
    isRight = hintOptions.button === "right",
    dblClick = !!hintOptions.dblclick && !isRight,
    newTabStr = (hintOptions.newtab + "") as ToString<Exclude<HintsNS.Options["newtab"], boolean>>,
    otherActions = isRight || dblClick,
    newWindow = newTabStr === "window" && !otherActions,
    newTab = mask > HintMode.newTab - 1 && !newWindow && !otherActions,
    newtab_n_active = newTab && mask > HintMode.newtab_n_active - 1,
    cnsForWin = hintOptions.ctrlShiftForWindow,
    autoUnhover = hintOptions.autoUnhover,
    isQueue = hintMode_ & HintMode.queue,
    noCtrlPlusShiftForActive: boolean | undefined = cnsForWin != null ? cnsForWin : hintOptions.noCtrlPlusShift,
    ctrl = newTab && !(newtab_n_active && noCtrlPlusShiftForActive) || newWindow && !!noCtrlPlusShiftForActive,
    shift = newWindow || newtab_n_active,
    interactive = (tag === "video" || tag === "audio") && !isRight && (clickEl as HTMLMediaElement).controls,
    doInteract = interactive && hintOptions.interact !== !1,
    specialActions = dblClick || doInteract
        ? kClickAction.BaseMayInteract + +dblClick + kClickAction.FlagInteract * <number> <number | boolean> doInteract
        : otherActions || (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$Element$$Closest
            || clickEl.closest ? !clickEl.closest!("a") : tag !== "a") ? kClickAction.none
        : newTabStr === "force-mode" ? newTab
            ? kClickAction.forceToOpenInNewTab | kClickAction.newTabFromMode : kClickAction.forceToOpenInCurrnt
        : newTabStr === "force-current" ? kClickAction.forceToOpenInCurrnt
        : newTabStr === "force" ? newTab
            ? kClickAction.forceToOpenInNewTab | kClickAction.newTabFromMode : kClickAction.forceToOpenInNewTab
        : newTabStr === kLW ? newTab
            ? kClickAction.forceToOpenInLastWnd | kClickAction.newTabFromMode : kClickAction.forceToOpenInLastWnd
        : OnFirefox
        ? newWindow ? kClickAction.openInNewWindow
          : newTabStr.startsWith("no-") ? kClickAction.none // to skip "click" events, one should use "force*"
          : newTab // need to work around Firefox's popup blocker
            ? kClickAction.plainMayOpenManually | kClickAction.newTabFromMode : kClickAction.plainMayOpenManually
        : kClickAction.none;
    catchAsyncErrorSilently(click_async(clickEl, rect
        , checkFocus(mask > 0 || interactive || (clickEl as ElementToHTMLorOtherFormatted).tabIndex! >= 0)
        , [!1, ctrl && !isMac, ctrl && isMac, shift]
        , specialActions, isRight ? kClickButton.second : kClickButton.none
        , !OnChrome || otherActions || newTab ? 0 : hintOptions.touch
        , hintOptions))
    .then((ret): void => {
      autoUnhover && !interactive ? catchAsyncErrorSilently(unhover_async())
      : isQueue || ret && pushHandler_(unhoverOnEsc, kHandler.unhoverOnEsc)
    })
}

const checkFocus = (defaultVal: boolean): boolean => {
  let userFocus: HintsNS.Options["focus"] | void = hintOptions.focus
  return userFocus == null ? defaultVal : !!userFocus && (!isTY(userFocus)
      || OnChrome && Build.MinCVer < BrowserVer.Min$Element$$matches && !clickEl.matches
      || (userFocus = safeCall(clickEl.matches!.bind(clickEl, userFocus)), userFocus != null ? userFocus : defaultVal))
}

  const masterOrA = hintManager || coreHints, keyStatus = masterOrA.$().k
  const clickEl: LinkEl = hint.d
  const tag = htmlTag_(clickEl)
  const kD = "download", kLW = "last-window"
  let rect: Rect | null | undefined
  let showRect: BOOL | undefined
  if (hintManager) {
    set_keydownEvents_(hintApi.a())
    setMode(masterOrA.$().m, 1)
  }
  if (event) {
    prevent_(event.e)
    keydownEvents_[event.i] = 1
  }
  masterOrA.v() // here .keyStatus_ is reset
  if (IsInDOM_(clickEl)) {
    // must get outline first, because clickEl may hide itself when activated
    // must use UI.getRect, so that zooms are updated, and prepareCrop is called
    rect = knownRect || tag === "a" && getPreferredRectOfAnchor(clickEl as HTMLAnchorElement)
        || getRect(clickEl, hint.r !== clickEl ? hint.r as HTMLElementUsingMap | null : null)
    if (hint.m && keyStatus.t && !keyStatus.k && !keyStatus.n) {
      if ((!OnChrome || Build.MinCVer < BrowserVer.MinUserActivationV2 && chromeVer_ < BrowserVer.MinUserActivationV2)
          && !fgCache.w) {
        // e.g.: https://github.com/philc/vimium/issues/3103#issuecomment-552653871
        suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents)
      } else {
        removeFlash = rect && flash_(null, rect, -1)
        masterOrA.j(coreHints, hint, rect && lastFlashEl)
        return 0
      }
    }
    hintManager && focus()
    // tolerate new rects in some cases
    const m = mode1_
    if (hint.m && isIFrameElement(clickEl)) {
      hintOptions.m = hintMode_;
      (hintManager || coreHints).$(1)
      showRect = <BOOL> +(clickEl !== omni_box)
      if (showRect) {
        focus_(clickEl)
        // focus first, so that childApi is up-to-date (in case <iframe> was removed on focus)
        const childApi = detectUsableChild(clickEl)
        if (childApi) {
          childApi.f(kFgCmd.linkHints, hintOptions, hintCount_, 1)
        } else {
          send_(kFgReq.execInChild, {
            u: clickEl.src, c: kFgCmd.linkHints, n: hintCount_, k: event ? event.i : kKeyCode.None, a: hintOptions
          }, (res): void => { !res || clickEl.contentWindow.focus() })
        }
      } else {
        focusOmni()
      }
    } else if (m < HintMode.min_job) {
      if (tag === "details") {
        const summary = findMainSummary_(clickEl as HTMLDetailsElement)
        if (summary) {
          // `HTMLSummaryElement::DefaultEventHandler(event)` in
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_summary_element.cc?l=109
          const rect2 = (clickEl as HTMLDetailsElement).open || !rect ? getVisibleClientRect_(summary) : rect
          catchAsyncErrorSilently(click_async(summary, rect2, 1)).then((): void => {
            removeFlash || rect2 && flash_(null, rect2)
          })
          showRect = 0
        } else {
          (clickEl as HTMLDetailsElement).open = !(clickEl as HTMLDetailsElement).open
        }
      } else if (hint.r && hint.r === clickEl) {
        hoverEl()
      } else if (getEditableType_<0>(clickEl) > EditableType.TextBox - 1) {
        select_(clickEl as LockableElement, rect, !removeFlash)
        showRect = 0
      } else {
        /*#__NOINLINE__*/ defaultClick()
      }
    } else if (m < HintMode.max_hovering + 1) {
      m < HintMode.HOVER + 1 ? hoverEl() : catchAsyncErrorSilently(unhover_async(clickEl))
    } else if (m < HintMode.FOCUS + 1) {
      view_(clickEl)
      focus_(clickEl)
      set_currentScrolling(weakRef_(clickEl))
      set_cachedScrollable(currentScrolling)
      removeFlash || flash_(clickEl)
      showRect = 0
    } else if (m < HintMode.max_media + 1) {
      /*#__NOINLINE__*/ downloadOrOpenMedia()
    } else if (m < HintMode.max_copying + 1) {
      copyText()
    } else if (m < HintMode.DOWNLOAD_LINK + 1) {
      /*#__NOINLINE__*/ downloadLink()
    } else if (m < HintMode.OPEN_INCOGNITO_LINK + 1) {
      const url = getUrlData()
      evalIfOK(url) || openTextOrUrl(url, !0)
    } else if (m < HintMode.max_edit + 1) {
      copyText()
    } else if (m < HintMode.FOCUS_EDITABLE + 1) {
      select_(clickEl as LockableElement, rect, !removeFlash)
      showRect = 0
    } else { // HintMode.ENTER_VISUAL_MODE
      selectAllOfNode(clickEl)
      const sel = getSelection_()
      collpaseSelection(sel)
      modifySel(sel, 1, 1, "word")
      hintOptions.visual === !1 || post_({ H: kFgReq.visualMode, c: hintOptions.caret })
    }
    if (!removeFlash && showRect !== 0 && (rect || (rect = getVisibleClientRect_(clickEl)))) {
      timeout_(function (): void {
        (showRect || doc.hasFocus()) && flash_(null, rect!)
      }, 17)
    }
  } else {
    hintApi.t({ k: kTip.linkRemoved, d: 2000 })
  }
  (<RegExpOne> /a?/).test("")
  return rect
}
