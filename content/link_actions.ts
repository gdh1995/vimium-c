import {
  safer, fgCache, isImageUrl, isJSUrl, set_keydownEvents_, keydownEvents_, timeout_, doc, chromeVer_, weakRef_, os_,
  parseSedOptions, createRegExp, isTY, max_, min_, OnFirefox, OnChrome, safeCall, loc_, parseOpenPageUrlOptions
} from "../lib/utils"
import { getVisibleClientRect_, center_, view_, selRange_ } from "../lib/rect"
import {
  IsInDOM_, createElement_, htmlTag_, getComputedStyle_, getEditableType_, isIFrameElement, GetParent_unsafe_, focus_,
  kMediaTag, ElementProto_not_ff, querySelector_unsafe_, getInputType, uneditableInputs_, GetShadowRoot_, scrollingEl_,
  findMainSummary_, getSelection_, removeEl_s, appendNode_s, getMediaUrl, getMediaTag, INP, ALA, attr_s, hasTag_,
  setOrRemoveAttr_s, toggleClass_s, textContent_s, notSafe_not_ff_, modifySel, SafeEl_not_ff_, testMatch, docHasFocus_
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
import { prevent_, suppressTail_, whenNextIsEsc_ } from "../lib/keyboard_utils"
import { set_grabBackFocus } from "./insert"
import {
  kClickAction, kClickButton, unhover_async, hover_async, click_async, select_, catchAsyncErrorSilently
} from "./async_dispatcher"
import { omni_box, focusOmni } from "./omni"
import { execCommand } from "./mode_find"
type LinkEl = Hint[0];
/* eslint-disable @typescript-eslint/no-floating-promises */

let removeFlash: (() => void) | null | undefined

export { removeFlash }
export function set_removeFlash (_newRmFlash: null): void { removeFlash = _newRmFlash }

export const executeHintInOfficer = (hint: ExecutableHintItem
    , event?: HandlerNS.Event | null | 0, knownRect?: Rect | null | 0 | false): Promise<Rect | null> | null => {

const unhoverOnEsc_d = Build.NDEBUG ? null : (): void => { catchAsyncErrorSilently(unhover_async()) }

const accessElAttr = (isUrlOrText?: 1 | 2): [string: string, isUserCustomized?: BOOL] => {
  type primitiveObject = boolean | number | string | { arguments?: undefined } & Dict<any>
  const dataset = (clickEl as SafeHTMLElement).dataset
  for (let accessor of ((hintOptions.access || "") + "").split(",")) {
    const arr = accessor.trim().split(":"), selector = arr.length === 2 ? arr[0] : 0
    const el: SafeElement | null = !selector ? clickEl
        : OnFirefox ? querySelector_unsafe_(selector, clickEl) as SafeElement | null
        : SafeEl_not_ff_!(querySelector_unsafe_(selector, clickEl))
    let json: Dict<primitiveObject | null> | primitiveObject | null | undefined | Element = el
    for (const prop of arr[+!!selector].split(".")) {
      if (json && isTY(json)) {
        json = safeCall<string, any>(JSON.parse, json as unknown as string)
      }
      json = json !== el ? json && isTY(json, kTY.obj) && (json as Dict<primitiveObject | null>)[prop]
          : !el ? 0 : (el as TypeToAssert<Element, HTMLElement | SVGElement, "dataset", "tagName">).dataset
          && ((el as HTMLElement).dataset as Dict<string>)[prop] || attr_s(el, prop)
    }
    if (json && isTY(json)) { return [json, 1] }
  }
  return [(isUrlOrText ? isUrlOrText < 2 ? dataset.vimUrl : dataset.vimText
      : dataset.canonicalSrc || dataset.src) || ""]
}

const getUrlData = (str?: string): string => {
  let link = clickEl as SafeHTMLElement
  if (str = str || accessElAttr(1)[0]) {
    (link = createElement_("a")).href = str.trim();
  }
  // $1.href is ensured well-formed by @GetLinks_
  return hasTag_("a", link) ? link.href : ""
}

/** return: img is HTMLImageElement | HTMLAnchorElement | HTMLElement[style={backgroundImage}] */
const downloadOrOpenMedia = (): void => {
  const filename = attr_s(clickEl, kD) || attr_s(clickEl, "alt") || (clickEl as SafeHTMLElement).title
  let mediaTag = tag ? getMediaTag(clickEl as SafeHTMLElement) : kMediaTag.others
  let srcObj = accessElAttr(), src = srcObj[0]
  let text: string | null, n: number
  if (!mediaTag) {
    if ((n = (clickEl as HTMLImageElement).naturalWidth) && n < 3
        && (n = (clickEl as HTMLImageElement).naturalHeight) && n < 3) {
      mediaTag = kMediaTag.LAST + 1
    }
  }
  text = srcObj[1] ? src : mediaTag < kMediaTag.others
      ? src || getMediaUrl(clickEl as SafeHTMLElement, mediaTag < kMediaTag.MIN_NOT_MEDIA_EL)
      : tag ? "" : (clickEl as SVGSVGElement).outerHTML
  if (mediaTag > kMediaTag.MIN_NOT_MEDIA_EL - 1) {
    if (tag && !isImageUrl(text)) {
      let arr = createRegExp(kTip.cssUrl, "i").exec(getComputedStyle_(clickEl).backgroundImage!)
      text = arr && arr[1] ? arr[1].replace(<RegExpG> /\\('|")/g, "$1") : text
    }
  }
  if (!text || isJSUrl(text)
      || src.length > text.length + 7 && (text === (clickEl as SafeElement & {href?: string}).href)) {
    text = src;
  }
  if (!text) { hintApi.t({ k: kTip.notImg }) }
  else if (OnFirefox && hintOptions.keyword != null || mode1_ === HintMode.OPEN_IMAGE || /** <svg> */ !tag) {
    hintApi.p({
      H: kFgReq.openImage, r: hintMode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      m: mode1_, q: parseOpenPageUrlOptions(hintOptions), a: hintOptions.auto,
      f: filename, u: tag ? text && getUrlData(text) : text
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
    r: (hintMode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg)
       + ReuseType.OFFSET_LAST_WINDOW * <number> <number | boolean> (newtab === kLW),
    u: url, f: incognito, i: incognito, o: parseOpenPageUrlOptions(hintOptions)
  });
}

const hoverEl = (): void => {
    const toggleMap = hintOptions.toggle
    const doesFocus = !elType && !isIFrameElement(clickEl)
        && checkBoolOrSelector(hintOptions.focus, (clickEl as ElementToHTMLorOtherFormatted).tabIndex! >= 0)
    // here not check lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    set_currentScrolling(weakRef_(clickEl))
  retPromise = catchAsyncErrorSilently(hover_async(clickEl, center_(rect), doesFocus)).then((): void => {
    set_cachedScrollable(currentScrolling)
    if (mode1_ < HintMode.min_job) { // called from Modes[-1]
      hintApi.t({ k: kTip.hoverScrollable })
      return
    }
    hintMode_ & HintMode.queue || elType > EditableType.MaxNotTextModeElement
        || whenNextIsEsc_(kHandler.unhoverOnEsc, kModeId.Link, Build.NDEBUG ? unhover_async : unhoverOnEsc_d!)
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
                ? ElementProto_not_ff!.querySelector.call(ancestors[max_(0, min_(up + 1, ancestors.length - 1))]
                    , selector)
                : querySelector_unsafe_(selector, ancestors[max_(0, min_(up + 1, ancestors.length - 1))
                    ] as SafeElement)
              : clickEl.closest!(selector))) {
          if (OnFirefox || !notSafe_not_ff_!(selected)) {
            for (const toggle of toggleMap[key].split(/[ ,]/)) {
              const s0 = toggle[0], remove = s0 === "-", add = s0 === "+" || (!remove && null)
              const idx = +(add || remove)
              if (toggle[idx] === "[") {
                const arr = toggle.slice(idx + 1, -1).split("="), rawAttr = arr[0], val = arr[1] || "",
                op = rawAttr.slice(-1), isOnlyIncluded = op === "*", isWord = op === "~" || isOnlyIncluded,
                attr = isWord ? rawAttr.slice(0, -1) : rawAttr,
                rawOld = attr_s(selected as SafeElement, attr), old = rawOld || "",
                valWord = isOnlyIncluded ? val :  " " + val + " ", oldWords = isOnlyIncluded ? old : " " + old + " "
                attr && setOrRemoveAttr_s(selected as SafeElement, attr,
                    isWord && old ? (oldWords.includes(valWord) ? add ? old : oldWords.replace(valWord, " ")
                        : remove ? old : old + valWord).trim()
                    : add || !remove && rawOld !== val ? val : null)
              } else {
                let cls = toggle.slice(idx + ((toggle[idx] === ".") as boolean | BOOL as BOOL))
                cls.trim() && toggleClass_s(selected as SafeElement, cls, add)
              }
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

const extractTextInOtherElements = (): string => {
  let str = textContent_s(clickEl).trim()
  if (str && (clickEl as ElementToSVG).ownerSVGElement) {
    const clone = clickEl.cloneNode(true) as SVGElement
    const titles = clone.querySelectorAll("title")
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes) {
      for (let i = 0; i < titles.length; i++) { titles[i].remove() }
    } else {
      for (let i of titles as ArrayLike<Element> as Element[]) { i.remove() }
    }
    str = textContent_s(clone).trim() || str
  }
  return str.trim()
}

const copyText = (): void => {
    let isUrl = mode1_ > HintMode.min_link_job - 1 && mode1_ < HintMode.max_link_job + 1,
        childEl: Element | null, files: HTMLInputElement["files"],
        str: string | null | undefined;
    if (isUrl) {
      str = getUrlData()
      str && (<RegExpI> /^mailto:./).test(str) && (str = str.slice(7).trim());
    }
    else if (str = accessElAttr(2)[0].trim()) { /* empty */ }
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
        } else if ("bu im su re".includes(type)) {
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
            || (str = extractTextInOtherElements()) && str.replace(<RegExpG> /\s+/g, " ")
      }
      str = str && str.trim();
      if (!str && tag) {
        str = (clickEl as SafeHTMLElement).title.trim() || (attr_s(clickEl, ALA) || "").trim();
      }
    }
  if (mode1_ > HintMode.min_edit - 1 && mode1_ < HintMode.max_edit + 1) {
      hintApi.p({
        H: kFgReq.vomnibar,
        c: 1,
        u: str,
        f: hintOptions.then,
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
    hintApi.p({
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
    const mask = hintMode_ & HintMode.mask_focus_new, isMac = !os_,
    isRight = hintOptions.button === "right",
    dblClick = !!hintOptions.dblclick && !isRight,
    newTabStr = (newtab + "") as ToString<Exclude<HintsNS.Options["newtab"], boolean>>,
    otherActions = isRight || dblClick,
    newWindow = newTabStr === "window" && !otherActions,
    newTab = mask > HintMode.newTab - 1 && !newWindow && !otherActions,
    newTabAndActive = newTab && mask > HintMode.newtab_n_active - 1,
    cnsForWin = hintOptions.ctrlShiftForWindow,
    autoUnhover = hintOptions.autoUnhover, doesUnhoverOnEsc = (autoUnhover + "")[0] === "<",
    isQueue = hintMode_ & HintMode.queue,
    noCtrlPlusShiftForActive: boolean | undefined = cnsForWin != null ? cnsForWin : hintOptions.noCtrlPlusShift,
    ctrl = newTab && !(newTabAndActive && noCtrlPlusShiftForActive) || newWindow && !!noCtrlPlusShiftForActive,
    shift = newWindow || newTabAndActive,
    isSel = tag === "select",
    interactive = isSel || (tag === "video" || tag === "audio") && !isRight && (clickEl as HTMLMediaElement).controls,
    doInteract = interactive && !isSel && hintOptions.interact !== !1,
    reuseFlag = newTab ? kClickAction.FlagMayInactive : kClickAction.none,
    specialActions = otherActions || doInteract
        ? kClickAction.BaseMayInteract + +dblClick + kClickAction.FlagInteract * <number> <number | boolean> doInteract
        : newTabStr.startsWith("no-") ? kClickAction.none
        : newWindow ? kClickAction.plainInNewWindow
        : newTabStr === "force-current" ? kClickAction.forceToOpenInCurrent
        : newTabStr === "force-mode" ? newTab ? kClickAction.forceInNewTab | kClickAction.FlagMayInactive
            : kClickAction.forceToOpenInCurrent
        : newTabStr === "force" ? kClickAction.forceInNewTab | reuseFlag
        : newTabStr === kLW ? kClickAction.forceToOpenInLastWnd | reuseFlag
        : OnFirefox ? kClickAction.plainMayOpenManually | reuseFlag
        : hintOptions.sedIf ? kClickAction.forceToSedIf | reuseFlag
        : kClickAction.none,
    doesUnhoverAtOnce = !doesUnhoverOnEsc && /*#__PURE__*/ checkBoolOrSelector(autoUnhover, !1)
    retPromise = catchAsyncErrorSilently(click_async(clickEl, rect
        , /*#__PURE__*/ checkBoolOrSelector(hintOptions.focus
            , mask > 0 || interactive || (clickEl as ElementToHTMLorOtherFormatted).tabIndex! >= 0)
        , [!1, ctrl && !isMac, ctrl && isMac, shift]
        , specialActions, isRight ? kClickButton.second : kClickButton.none
        , !OnChrome || otherActions || newTab ? 0 : hintOptions.touch
        , hintOptions))
    .then((ret): void | false | number | Promise<unknown> =>
        doesUnhoverAtOnce && (!interactive || isTY(autoUnhover)) ? catchAsyncErrorSilently(unhover_async())
        : isQueue || elType || (ret || doesUnhoverOnEsc) &&
          whenNextIsEsc_(kHandler.unhoverOnEsc, kModeId.Link, Build.NDEBUG ? unhover_async : unhoverOnEsc_d!)
    )
}

const checkBoolOrSelector = (userVal: string | boolean | null | void | undefined, defaultVal: boolean): boolean => {
  return userVal == null ? defaultVal : !!userVal && (!isTY(userVal)
      || (userVal = safeCall(testMatch, userVal, [clickEl])), userVal != null ? userVal : defaultVal)
}

  const masterOrA = hintManager || coreHints, keyStatus = masterOrA.$().k
  const clickEl: LinkEl = hint.d
  const tag = htmlTag_(clickEl), elType = getEditableType_<0>(clickEl)
  const kD = "download", kLW = "last-window"
  const newtab = hintOptions.newtab
  let rect: Rect | null = null
  let retPromise: Promise<unknown> | undefined
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
  set_grabBackFocus(false)
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
        return null
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
          }, (res): void => { res || clickEl.contentWindow.focus() })
        }
      } else {
        focusOmni()
      }
    } else if (m < HintMode.min_job || m === HintMode.FOCUS_EDITABLE) {
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
      } else if (elType > EditableType.MaxNotTextModeElement) {
        retPromise = select_(clickEl as LockableElement, rect, !removeFlash)
        showRect = 0
      } else {
        /*#__NOINLINE__*/ defaultClick()
      }
    } else if (m < HintMode.max_hovering + 1) {
      m < HintMode.HOVER + 1 ? hoverEl() : retPromise = catchAsyncErrorSilently(unhover_async(clickEl))
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
    } else { // HintMode.ENTER_VISUAL_MODE
      selectAllOfNode(clickEl)
      const sel = getSelection_()
      collpaseSelection(sel)
      modifySel(sel, 1, 1, "word")
      hintOptions.visual === !1 || post_({ H: kFgReq.visualMode, c: hintOptions.caret, f: hintOptions.then })
    }
    if (!removeFlash && showRect !== 0 && (rect || (rect = getVisibleClientRect_(clickEl)))) {
      timeout_(function (): void {
        (showRect || docHasFocus_()) && flash_(null, rect!)
      }, 17)
    }
  } else {
    hintApi.t({ k: kTip.linkRemoved, d: 2000 })
  }
  return retPromise ? retPromise.then(() => rect) : Promise.resolve(rect)
}
