import {
  safer, fgCache, isImageUrl, isJSUrl, set_keydownEvents_, doc, chromeVer_, os_, timeout_,
  createRegExp, isTY, max_, min_, OnFirefox, OnChrome, safeCall, locHref, parseOpenPageUrlOptions, VTr, loc_, OnSafari,
  clearTimeout_, promiseDefer_, OnEdge, urlSameIgnoringHash, firefoxVer_, runtime_ff, keydownEvents_
} from "../lib/utils"
import { getVisibleClientRect_, center_, view_, selRange_, bZoom_, set_bZoom_ } from "../lib/rect"
import {
  IsInDOM_, createElement_, htmlTag_, getComputedStyle_, getEditableType_, isIFrameElement, GetParent_unsafe_, focus_,
  kMediaTag, ElementProto_not_ff, querySelector_unsafe_, uneditableInputs_, GetShadowRoot_, scrollingEl_, elFromPoint_,
  queryHTMLChild_, getSelection_, removeEl_s, appendNode_s, getMediaUrl, getMediaTag, INP, ALA, attr_s, hasTag_, kGCh,
  setOrRemoveAttr_s, toggleClass_s, textContent_s, notSafe_not_ff_, modifySel, SafeEl_not_ff_, testMatch, contains_s,
  extractField, querySelectorAll_unsafe_, editableTypes_, findAnchor_, dispatchEvent_, newEvent_, rangeCount_,
  findSelectorByHost
} from "../lib/dom_utils"
import { getPreferredRectOfAnchor, initTestRegExps } from "./local_links"
import {
  hintOptions, mode1_, hintMode_, hintApi, hintManager, coreHints, setMode, detectUsableChild, hintCount_,
  ExecutableHintItem, forHover_
} from "./link_hints"
import { currentScrolling, set_cachedScrollable, setNewScrolling } from "./scroller"
import { post_, send_ } from "./port"
import {
  collpaseSelection, evalIfOK, flash_, getRect, getSelected, lastFlashEl, resetSelectionToDocStart, selectAllOfNode,
  selectNode_, ui_box, focusIframeContentWnd_
} from "./dom_ui"
import { consumeKey_mac, prevent_, suppressTail_, whenNextIsEsc_ } from "../lib/keyboard_utils"
import { raw_insert_lock, set_grabBackFocus } from "./insert"
import {
  kClickAction, kClickButton, unhover_async, hover_async, click_async, select_, catchAsyncErrorSilently,
  wrap_enable_bubbles
} from "./async_dispatcher"
import { omni_box } from "./omni"
import { execCommand, kInsertText } from "./mode_find"
/* eslint-disable @typescript-eslint/no-floating-promises */

declare var fetch: unknown, AbortController: new () => { signal: object, abort(): void }
declare var AbortSignal: { timeout? (timeout: number): object }
let removeFlash: (() => void) | null | undefined

export { removeFlash }
export function set_removeFlash (_newRmFlash: null): null { return removeFlash = _newRmFlash }

export const executeHintInOfficer = (hint: ExecutableHintItem
    , event?: HandlerNS.Event | null | 0, knownRect?: Rect | null | 0 | false): Promise<Rect | null> | null => {

const unhoverOnEsc_d = Build.NDEBUG ? null : (): void => { catchAsyncErrorSilently(unhover_async()) }

const accessElAttr = (isUrlOrText: 0 | 1 | 2): [string: string, isUserCustomized?: BOOL] => {
  const dataset = (clickEl as Partial<SafeHTMLElement>).dataset
  const format = dataset && hintOptions.access
  let el: SafeElement | null | undefined
  const cb = (_: string, i: string): string => i.split("||").reduce((v, j) => v || extractField(el!, j), "")
  for (let accessor of format ? Array.isArray(format) ? format : (format + "").split(",") : []) {
    accessor = accessor.trim()
    const __arr = accessor.split(":"), selector = __arr.length > 1 ? __arr[0] : 0
    el = !selector ? clickEl
        : OnFirefox ? safeCall(querySelector_unsafe_, selector, clickEl) as SafeElement | null
        : SafeEl_not_ff_!(safeCall(querySelector_unsafe_, selector, clickEl))
    const props: string = el ? selector !== 0 ? accessor.slice(selector.length + 1) : accessor : ""
    let json = props.includes("${") ? props.replace(<RegExpG & RegExpSearchable<1>> /\$\{([^}]+)}/g, cb) : el && props
    json = json !== props ? json : extractField(el!, props)
    if (json) { return [json, 1] }
  }
  if (dataset && isUrlOrText && (dataset.vimText === "" || dataset.vimUrl === "")) {
    dispatchEvent_(clickEl, newEvent_("vimiumData"))
  }
  return [dataset && ((isUrlOrText > 1 ? dataset.vimText : isUrlOrText && dataset.vimUrl)
      || isUrlOrText < 2 && (dataset.canonicalSrc || dataset.src || tag === "a" && dataset.href)) || ""]
}

const getUrlData = (str?: string): string => {
  let link = clickEl
  if (str = str || accessElAttr(1)[0]) {
    (link = createElement_("a")).href = str.trim();
  }
  // $1.href is ensured well-formed by @GetLinks_
  return hasTag_("a", link) ? link.href : ""
}

const tryDrawOnCanvas = ((hudMsg: string | 0, req?: Req.fg<kFgReq.openImage | kFgReq.copy>): void => {
  type ImageLoadingResult = Event | 1 | undefined | TimerType.fake
  type FileReaderLoadEvent = Event & { target: FileReader }
  let s2: string, r1: ((value: ImageLoadingResult) => void) | null, timer1: ValidTimeoutID = 0
  let img = clickEl as HTMLImageElement
  const defer0 = promiseDefer_<string | FileReaderLoadEvent | 0 | void>(), resolveData = defer0.r
  const url = isHtmlImage && (req ? (req as FgReq[kFgReq.openImage]).u : (s2 = getMediaUrl(img, 1)) && getUrlData(s2))
  if (url) {
    const parsed = new URL(url), isGlobal = (<RegExpI> /^(https?|data):/i).test(url)
    const origin = parsed.origin || "", sameOrigin = origin[0] === "h" && origin === loc_.origin
    const defer1 = promiseDefer_<ImageLoadingResult>()
    const isInIncognito = (OnChrome ? chrome : browser as never).extension.inIncognitoContext
    r1 = defer1.r
    richText = (richText || "") + "" as Extract<typeof richText, string>
    if (!richText.includes("safe") && isGlobal && !isInIncognito && (!OnFirefox || !parsed.pathname.endsWith(".gif"))
          && !urlSameIgnoringHash(url, locHref()) || OnFirefox && req && hasKeyword_ff
        || !OnFirefox && parsed.pathname.endsWith(".gif") && !richText.includes("force")) {
      r1(0)
    } else if (isHtmlImage && urlSameIgnoringHash(url, getMediaUrl(img, 2)) && (sameOrigin || img.crossOrigin)
        && img.naturalWidth) {
      r1(1)
    } else if(sameOrigin || isInIncognito) {
      timer1 = timeout_(r1, 9000)
      img = createElement_("img")
      img.onload = img.onerror = r1
      isInIncognito && (img.crossOrigin = "anonymous")
      OnFirefox && (img.referrerpolicy = "strict-origin-when-cross-origin") // avoid a warning on FF 102.0.1esr
      img.src = url
      hintApi.h(kTip.reDownloading, 9)
    } else {
      r1(0)
    }
    void defer1.p.then((ok: ImageLoadingResult | boolean): void => {
      const blobToData = (blob: Blob | null | 0): void => {
        !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.Min$AbortSignal$$timeout)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$AbortSignal$$timeout)
            || clearTimeout_(timer1)
        if (!blob) { resolveData(); return }
        const reader = new FileReader()
        reader.onload = resolveData
        reader.readAsDataURL(blob)
      }
      const h = img.naturalHeight
      clearTimeout_(timer1)
      ok = (isTY(ok, kTY.obj) ? ok.type > "l" : ok === 1) && h
      if (ok) {
        const canvas = createElement_("canvas")
        const w = canvas.width = img.naturalWidth
        canvas.height = h
        const ctx = canvas.getContext("2d") // ctx may be null if OOM
        ok = 0
        if (ctx) {
          try {
            ctx.drawImage(img, 0, 0, w, h)
            OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinEnsured$canvas$$toBlob
                && chromeVer_ < BrowserVer.MinEnsured$canvas$$toBlob // in case of unknown crashes when EXP
            ? resolveData(canvas.toDataURL()) : canvas.toBlob(blobToData)
            ok = 1
          } catch { /* empty */ }
        }
      }
      if (ok) { return }
      img !== clickEl && setOrRemoveAttr_s(img, "src")
      if ((isInIncognito || !isGlobal) && (!OnChrome || Build.MinCVer >= BrowserVer.MinAbortController
          || chromeVer_ > BrowserVer.MinAbortController - 1)) {
        hintApi.h(kTip.reDownloading, 9)
        if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.Min$AbortSignal$$timeout)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$AbortSignal$$timeout)) {
          void (fetch as GlobalFetch)(url, { cache: "force-cache", signal: AbortSignal.timeout!(9000) })
              .then<Blob>(res => res.blob()).then(blobToData, resolveData.bind(0, 0))
        } else {
          const abortCtrl = new AbortController()
          void (fetch as GlobalFetch)(url, { cache: "force-cache", signal: abortCtrl.signal })
              .then<Blob>(res => res.blob()).then(blobToData, blobToData.bind(0, 0))
          timer1 = timeout_(abortCtrl.abort.bind(abortCtrl), 9000)
        }
      } else {
        req && mode1_ - HintMode.COPY_IMAGE || hintApi.h(kTip.reDownloading, 9)
        resolveData()
      }
    })
  } else {
    resolveData()
  }
  retPromise = defer0.p.then((dataUrl): void => {
    dataUrl = isTY(dataUrl, kTY.obj) ? dataUrl.target.result as string : dataUrl
    if (url || req) {
      req && mode1_ - HintMode.COPY_IMAGE
      ? dataUrl && ((req as FgReq[kFgReq.openImage]).r = req.u, (req as FgReq[kFgReq.openImage]).u = dataUrl)
      : req = { H: kFgReq.copy, i: (dataUrl || "") as "data:" | "", u: url as string, r: richText }
      hintApi.p(req!)
    } else {
      const oldRange = selRange_(getSelected({}))
      selectNode_(clickEl)
      hudMsg = getSelection_() + "" || hudMsg || `<${clickEl.localName}>`
      execCommand("copy", doc)
      resetSelectionToDocStart(getSelection_(), oldRange)
      hintApi.h(kTip.copiedIs, 0, hudMsg)
    }
  })
}) as {
  (hudMsg: 0, req: Req.fg<kFgReq.openImage>): void
  (hudMsg: string): void
}

const downloadOrOpenMedia = (): void => {
  const filename = attr_s(clickEl, kD) || attr_s(clickEl, "alt") || (clickEl as Partial<SafeHTMLElement>).title || ""
  let mediaTag = getMediaTag(tag)
  let srcObj = accessElAttr(0), src = srcObj[0]
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
  if (!text) { hintApi.h(kTip.notImg), then = optElse }
  else if (hintOptions.url) {
    copyText(text)
  } else if (OnFirefox && hasKeyword_ff || mode1_ - HintMode.DOWNLOAD_MEDIA || /** <svg> */ !tag) {
    tryDrawOnCanvas(0, {
      H: kFgReq.openImage, m: hintMode_, o: parseOpenPageUrlOptions(hintOptions), a: hintOptions.auto,
      f: filename, u: tag ? text && getUrlData(text) : text
    })
  } else {
    downloadLink(text, filename)
  }
}

const openTextOrUrl = (url: string, isText?: BOOL | boolean): void => {
  url ? evalIfOK(url) || hintApi.p({
    H: kFgReq.openUrl,
    u: url, m: hintMode_, t: rawNewtab, o: parseOpenPageUrlOptions(hintOptions)
  }) : (hintApi.h(isText ? kTip.noTextCopied : kTip.noUrlCopied), then = optElse)
}

const showUrlIfNeeded = (): void => {
  if (OnFirefox) { return }
  const anchor = findAnchor_(clickEl)
  const href = anchor && hintOptions.showUrl && anchor.href
  href && hintApi.t({ k: kTip.raw, t: href.slice(0, 256), l: 1 })
}

const hoverEl = (): void => {
    const toggleMap = hintOptions.toggle
    // here not check lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    setNewScrolling(clickEl)
  retPromise = catchAsyncErrorSilently(wrap_enable_bubbles(hintOptions, hover_async<1>
      , [clickEl, center_(rect, hintOptions.xy as HintsNS.StdXY | undefined)
          , checkBoolOrSelector(rawFocus, !elType && (clickEl as ElementToHTMLOrForeign).tabIndex! >= 0
              && !isIFrameElement(clickEl))])).then((): void => {
    let rval: any, lval: any;
    set_cachedScrollable(currentScrolling)
    if (mode1_ < HintMode.min_job) { // called from Modes[-1]
      hintApi.h(kTip.hoverScrollable)
      return
    }
    hintMode_ & HintMode.queue || elType > EditableType.MaxNotEditableElement
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        || whenNextIsEsc_(kHandler.unhoverOnEsc, kModeId.Link, Build.NDEBUG ? unhover_async : unhoverOnEsc_d!)
    showUrlIfNeeded()
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
          const toggleVal = toggleMap[key as "css-selector"]
          if (OnFirefox || !notSafe_not_ff_!(selected)) {
            for (const toggle of toggleVal ? isTY(toggleVal) ? toggleVal.split(/[ ,]/) : toggleVal : []) {
              const s0 = toggle[0], remove = s0 === "-", add = s0 === "+" || (!remove && null)
              const idx = +(add satisfies boolean | null as boolean) || +remove
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
              } else if (!idx && toggle[0] === "." && toggle.includes("=")) {
                const opArr = (<RegExpOne> /[:+*/-]?=/).exec(toggle)!, op = opArr[0][0],
                prop = toggle.slice(1, opArr.index), valStr = toggle.slice(opArr.index + opArr[0].length),
                tagType = (prop === "value" || prop === "selectedIndex")
                    && editableTypes_[htmlTag_(selected)] || EditableType.NotEditable,
                isTextElement = tagType && getEditableType_<0>(selected) > EditableType.MaxNotTextBox,
                newVal = op === "=" ? valStr
                    : (rval = safeCall<string, any>(JSON.parse, valStr) || valStr, op === ":") ? rval
                    : (lval = (selected satisfies object as {} as Dict<any>)[prop], op === "+")
                    ? lval + rval : op === "-" ? lval - rval : op === "*" ? lval * rval : lval / rval
                if (isTextElement && selected === raw_insert_lock && isTY(newVal)) {
                  (selected as TextElement).select()
                  execCommand(kInsertText, doc, newVal)
                } else {
                  (selected satisfies object as {} as Dict<any>)[prop] = newVal
                  if (tagType > EditableType.Select - 1) {
                    dispatchEvent_(selected as SafeHTMLElement, newEvent_(INP, 1, 0, 0, {
                      inputType: "insertReplacementText", data: newVal + ""
                    }, !isTextElement || OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinEnsured$window$$InputEvent
                          && chromeVer_ < BrowserVer.MinEnsured$window$$InputEvent ? Event : InputEvent))
                    dispatchEvent_(selected as SafeHTMLElement, newEvent_("change", 1, 1))
                  }
                }
              } else if (toggle === ":active") {
                setNewScrolling(selected)
                set_cachedScrollable(currentScrolling)
              } else if (toggle.startsWith(":sel") || toggle === ":extend") {
                if (toggle[1] > "f" && !hintOptions.$s || !rangeCount_(getSelection_())) {
                  selectNode_(selected as SafeElement)
                  hintOptions.$s = 1
                } else {
                  getSelection_().extend(selected, ((selected as SafeElement).childNodes as NodeList).length)
                }
              } else if (toggle[0] === "@") {
                const arr2 = (<RegExpOne> /^@(.*?)(:(\w+))?(=(.*))?$/).exec(toggle)
                arr2 && arr2[1] && dispatchEvent_(selected as SafeElement
                    , new (arr2[3] && (window as any)[arr2[3]] as never || CustomEvent)(arr2[1]
                        , arr2[5] && safeCall<string, any>(JSON.parse, arr2[5]) || {}))
              } else {
                let cls = toggle.slice(idx + ((toggle[idx] === ".") as boolean | BOOL as BOOL))
                cls.trim() && toggleClass_s(selected as SafeElement, cls, add)
              }
            }
          }
        }
      } catch { then = optElse }
      if (selected && !toggleMap.many) { break }
    }
  })
}

const extractTextContent = (): string => {
  let str = textContent_s(clickEl).trim()
  if (str) {
    const clone = clickEl.cloneNode(true) as SafeElement
    const children = querySelectorAll_unsafe_(VTr(kTip.invisibleElements), clone)!
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes) {
      [].forEach.call(children, removeEl_s)
    } else {
      (children as ArrayLike<Element> as SafeElement[]).forEach(removeEl_s)
    }
    str = textContent_s(clone).trim() || str
  }
  return str
}

const copyText = (str?: string | null): void => {
    let isUrl = mode1_ > HintMode.min_link_job - 1 && mode1_ < HintMode.max_link_job + 1,
        childEl: Element | null, files: HTMLInputElement["files"]
    if (str) { /* empty */ }
    else if (isUrl) {
      str = getUrlData()
    }
    else if (str = accessElAttr(2)[0].trim()) { /* empty */ }
    else {
      if (tag === INP) {
        const type = (clickEl as HTMLInputElement).type
        if (type === "password") {
          then = optElse
          return hintApi.h(kTip.ignorePassword)
        }
        if (!uneditableInputs_[type]) {
          str = (clickEl as HTMLInputElement).value || (clickEl as HTMLInputElement).placeholder;
        } else if (type === "file") {
          str = (files = (clickEl as HTMLInputElement).files) && files.length > 0 ? files[0].name : ""
        } else if (" button image submit reset ".includes(" " + type + " ")) {
          str = (clickEl as HTMLInputElement).value;
        }
      } else {
        str = tag === "textarea" ? (clickEl as HTMLTextAreaElement).value
          : tag === "select" ? ((clickEl as HTMLSelectElement).selectedIndex < 0
              ? "" : (clickEl as HTMLSelectElement).options[(clickEl as HTMLSelectElement).selectedIndex].text)
          : isHtmlImage ? (clickEl as HTMLImageElement).alt
          : tag && ((clickEl as SafeHTMLElement).innerText.trim()
                || GetShadowRoot_(clickEl as SafeHTMLElement)
                    && (childEl = querySelector_unsafe_("div,span", GetShadowRoot_(clickEl as SafeHTMLElement)!))
                    && htmlTag_<1>(childEl) && childEl.innerText.trim())
            || (str = extractTextContent()) && str.replace(<RegExpG> /\s+/g, " ")
      }
      str = str && str.trim() || tag && (clickEl as SafeHTMLElement).title.trim()
          || ((OnSafari || OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredAriaProperties
                ? clickEl.ariaLabel : attr_s(clickEl, ALA)) || "").trim()
    }
  mode1_ - HintMode.SEARCH_TEXT && str && (<RegExpI> /^mailto:./).test(str) && (str = str.slice(7).trim())
  if (mode1_ > HintMode.min_edit - 1 && mode1_ < HintMode.max_edit + 1) {
      hintApi.p({
        H: kFgReq.vomnibar,
        u: str,
        f: then,
        m: mode1_, t: rawNewtab,
        o: parseOpenPageUrlOptions(hintOptions)
      });
  } else if (richText) {
    tryDrawOnCanvas(str)
  } else if (!str || mode1_ === HintMode.SEARCH_TEXT) {
    openTextOrUrl(str, !isUrl)
  } else {
    // then mode1 can only be HintMode.COPY_*
    let lastYanked = mode1_ & HintMode.list ? (hintManager || coreHints).y : 0 as const;
    if (lastYanked && lastYanked.indexOf(str) >= 0) {
      hintApi.h(kTip.noNewToCopy)
    } else {
      lastYanked && lastYanked.push(str)
      hintApi.p({ H: kFgReq.copy, j: hintOptions.join, o: parseOpenPageUrlOptions(hintOptions), m: mode1_,
          d: isUrl, s: lastYanked || str })
    }
  }
}

const downloadLink = (url?: string, filename?: string): void => {
  const newLink = mode1_ < HintMode.DOWNLOAD_LINK || tag !== "a",
  link = newLink ? createElement_("a") : clickEl as HTMLAnchorElement,
  oldUrl: string | true | null = newLink || attr_s(link, "href"),
  changed = (url = url || getUrlData()) !== link.href
  filename = filename || attr_s(clickEl, kD) || ""
  if (OnFirefox || OnChrome && hintOptions.download === "force" && !urlSameIgnoringHash(url, locHref())) {
    hintApi.p({ H: kFgReq.downloadLink, u: url, f: filename, r: OnFirefox ? locHref() : 0
        , m: mode1_, o: parseOpenPageUrlOptions(hintOptions) })
    return
  }
  if (changed) {
    link.href = url
    newLink && appendNode_s(scrollingEl_(1) || ui_box!, link)
  }
  const hadDownload = link.hasAttribute(kD)
  if (!hadDownload) {
    link[kD] = filename
  }
  hintApi.p({ H: kFgReq.showUrl, u: url })
  retPromise = catchAsyncErrorSilently(click_async(link, rect, 0, [!0, !1, !1, !1])).then((): void => {
    if (!hadDownload) {
      setOrRemoveAttr_s(link, kD)
    }
    if (newLink) {
      removeEl_s(link)
    } else if (changed) {
      setOrRemoveAttr_s(link, "href", oldUrl as Exclude<typeof oldUrl, true>)
    }
  })
}

const defaultClick = (): void => {
    const mask = hintMode_ & HintMode.mask_focus_new,
    isMac = Build.OS === kBOS.MAC as number || !!(Build.OS & kBOS.MAC) && !os_,
    rawBtn = hintOptions.button, isRight = rawBtn === 2,
    dblClick = !!hintOptions.dblclick && !isRight,
    newTabStr = (rawNewtab + "") as ToString<Exclude<HintsNS.Options["newtab"], boolean>>,
    otherActions = isRight || dblClick,
    newWindow = newTabStr === "window" && !otherActions,
    newTab = mask > HintMode.newTab - 1 && !newWindow && !otherActions,
    autoUnhover = hintOptions.autoUnhover, doesUnhoverOnEsc = (autoUnhover + "")[0] === "<",
    isQueue = hintMode_ & HintMode.queue,
    cnsForWin = hintOptions.ctrlShiftForWindow,
    noCtrlPlusShiftForActive: boolean | undefined = cnsForWin != null ? cnsForWin : hintOptions.noCtrlPlusShift,
    maybeLabel = OnFirefox && !editableTypes_[tag] && clickEl.closest!("label,input,textarea,a,button"
        ) as SafeElement | null,
    notLabelInFormOnFF = !OnFirefox || !maybeLabel || !hasTag_("label", maybeLabel)
        || !(maybeLabel as HTMLLabelElement).control,
    ctrl = notLabelInFormOnFF && (newTab && !(mask > HintMode.newtab_n_active - 1 && noCtrlPlusShiftForActive)
        || newWindow && !!noCtrlPlusShiftForActive),
    shift = notLabelInFormOnFF && (newWindow
        || newTab && (mask > HintMode.newtab_n_active - 1) === !hintOptions.activeOnCtrl),
    isSel = tag === "select",
    rawInteractive = hintOptions.interact,
    interactive = isSel || getMediaTag(tag) === kMediaTag.otherMedias && !isRight
        && (rawInteractive !== "native" || (clickEl as HTMLMediaElement).controls),
    doInteract = interactive && !isSel && rawInteractive !== !1,
    specialActions = dblClick || doInteract
        ? kClickAction.BaseMayInteract + +dblClick + kClickAction.FlagInteract * <number> <number | boolean> doInteract
        : isRight || newTabStr.startsWith("no-") ? kClickAction.none
        : newWindow ? kClickAction.plainInNewWindow
        : newTabStr === "force-current" ? kClickAction.forceToOpenInCurrent
        : newTabStr === "force-mode" ? newTab ? kClickAction.forceInNewTab : kClickAction.forceToOpenInCurrent
        : newTabStr === "force" ? kClickAction.forceInNewTab
        : newTabStr === kLW ? kClickAction.forceToOpenInLastWnd
        : OnFirefox ? newTab ? kClickAction.plainInNewTab : kClickAction.plainMayOpenManually
        : kClickAction.none,
    doesUnhoverAtOnce = !doesUnhoverOnEsc && /*#__PURE__*/ checkBoolOrSelector(autoUnhover, !1)
    retPromise = catchAsyncErrorSilently(click_async(clickEl, rect
        , !!(clickEl as ElementToHTMLOrForeign).focus && /*#__PURE__*/ checkBoolOrSelector(rawFocus
            , mask > 0 || interactive || (clickEl as ElementToHTMLOrForeign).tabIndex! >= 0)
        , [!1, !isMac && ctrl, isMac && ctrl, shift]
        , specialActions, (rawBtn as typeof rawBtn & number) || kClickButton.none
        , !OnChrome || otherActions || newTab || newWindow ? 0 : hintOptions.touch))
    .then((ret): void | Promise<unknown> | number | boolean => {
      showUrlIfNeeded()
      newTabStr === "inactive" && post_({ H: kFgReq.focusCurTab }) // not use ports of a parent frame
      return doesUnhoverAtOnce && (!interactive || isTY(autoUnhover)) ? catchAsyncErrorSilently(unhover_async())
      : isQueue || elType || (ret || doesUnhoverOnEsc) &&
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        whenNextIsEsc_(kHandler.unhoverOnEsc, kModeId.Link, Build.NDEBUG ? unhover_async : unhoverOnEsc_d!)
    })
}

const checkBoolOrSelector = (userVal: string | boolean | null | void | undefined, defaultVal: boolean): boolean => {
  return userVal == null ? defaultVal : !!userVal && (!isTY(userVal)
      || (userVal = safeCall(testMatch, userVal, [clickEl])), userVal != null ? userVal : defaultVal)
}
const doPostAction = (): Rect | null => {
  if (then && (mode1_ < HintMode.min_then_as_arg || mode1_ > HintMode.max_then_as_arg)) {
    for (const thenSelector of Object.keys(isTY(then, kTY.obj) ? then : isTY(then) ? then = { "*": then } : {})) {
      if (safeCall(testMatch, thenSelector, [clickEl])) {
        post_({ H: kFgReq.nextKey, k: (then as Dict<string>)[thenSelector] + "" })
      }
    }
  }
  removeFlash || showRect && rect && flash_(null, rect)
  return rect
}

  const masterOrA = hintManager || coreHints, keyStatus = masterOrA.$().k
  let clickEl: SafeElementForMouse = hint.d
  let tag: "" | keyof HTMLElementTagNameMap, elType: EditableType, isHtmlImage: boolean
  const kD = "download", kLW = "last-window"
  let richText = hintOptions.richText, rawNewtab = hintOptions.newtab, rawFocus = hintOptions.focus
  const hasKeyword_ff = OnFirefox && hintOptions.keyword != null
  let rect: Rect | null = null
  let then = hintOptions.then, optElse = hintOptions.else
  let retPromise: Promise<unknown> | undefined
  let autoChild: HintsNS.Options["autoChild"] | 0 | void = hintOptions.autoChild
  let showRect: BOOL | 2 = hintOptions.flash !== false ? 1 : 0
  let click2nd: Element | void | null
  if (hintManager) {
    set_keydownEvents_(hintApi.a())
    setMode(masterOrA.$().m, 1)
  }
  if (event) {
    prevent_(event.e)
    Build.OS & kBOS.MAC ? consumeKey_mac(event.i, event.e) : (keydownEvents_[event.i] = 1)
  }
  masterOrA.v() // here .keyStatus_ is reset
  set_grabBackFocus(false)
  if (IsInDOM_(clickEl)) {
    if (!OnFirefox && bZoom_ !== 1 && doc.body && !IsInDOM_(clickEl, doc.body)) { set_bZoom_(1) }
    autoChild = isIFrameElement(clickEl) ? 0
        : isTY(autoChild) ? findSelectorByHost(autoChild) as typeof autoChild : autoChild
    if (autoChild) {
      const anyAtPos = autoChild === "html", onlyShadow = autoChild === ":host"
      if (isTY(autoChild) && autoChild !== ":root" && !anyAtPos && !onlyShadow) {
        click2nd = querySelector_unsafe_(autoChild, clickEl)
      } else {
        rect = htmlTag_(clickEl) === "a" // for www.google.com/search?q=***
            && getPreferredRectOfAnchor(clickEl as SafeElement as HTMLAnchorElement) || getVisibleClientRect_(clickEl)
        const center = center_(rect, hintOptions.xy as HintsNS.StdXY | undefined)
        click2nd = rect && (onlyShadow ? clickEl : elFromPoint_(center, clickEl))
        click2nd = anyAtPos || click2nd && contains_s(clickEl, click2nd) ? click2nd : null
        let el3: Element | null = click2nd
        while (el3 && htmlTag_<1>(el3) && GetShadowRoot_(el3)) {
          el3 = elFromPoint_(center, GetShadowRoot_(el3))
          if (el3 && el3 !== click2nd) { click2nd = el3 }
        }
      }
      clickEl = (OnFirefox ? click2nd : click2nd && SafeEl_not_ff_!(click2nd)
          ) satisfies Element | void | null as SafeElementForMouse | void | null || clickEl
    }
    tag = htmlTag_(clickEl), elType = getEditableType_<0>(clickEl), isHtmlImage = tag === "img"
    initTestRegExps() // needed by getPreferredRectOfAnchor
    // must get outline first, because clickEl may hide itself when activated
    // must use UI.getRect, so that zooms are updated, and prepareCrop is called
    rect = knownRect || tag === "a" && getPreferredRectOfAnchor(clickEl as HTMLAnchorElement)
        || getRect(clickEl, hint.r !== hint.d ? hint.r as HTMLElementUsingMap | null : null)
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
    if (hint.m && isIFrameElement(clickEl)) {
      hintOptions.m = hintMode_;
      (hintManager || coreHints).$(1)
      showRect = 0
      if (clickEl !== omni_box) {
        focus_(clickEl)
        // focus first, so that childApi is up-to-date (in case <iframe> was removed on focus)
        const childApi = detectUsableChild(clickEl)
        if (childApi) {
          childApi.f(kFgCmd.linkHints, hintOptions, hintCount_, 1)
        } else if (OnChrome) {
          post_({ H: kFgReq.execInChild, c: showRect = kFgCmd.linkHints,
            u: clickEl.src, n: hintCount_, k: event ? event.i : kKeyCode.None, a: hintOptions
          })
        } else {
          send_(kFgReq.execInChild, { c: showRect = kFgCmd.linkHints,
            f: OnFirefox ? (Build.MinFFVer >= FirefoxBrowserVer.Min$runtime$$getFrameId
                  || firefoxVer_ > FirefoxBrowserVer.Min$runtime$$getFrameId - 1)
                ? runtime_ff!.getFrameId!(clickEl) : -1 : 0,
            u: clickEl.src, n: hintCount_, k: event ? event.i : kKeyCode.None, a: hintOptions
          }, focusIframeContentWnd_.bind(0, clickEl))
        }
      } else {
        focusIframeContentWnd_(clickEl)
      }
    } else if (mode1_ < HintMode.min_job || mode1_ === HintMode.FOCUS_EDITABLE) {
      if (tag === "details") {
        const summary = queryHTMLChild_(clickEl, "summary")
        if (summary) {
          // `HTMLSummaryElement::DefaultEventHandler(event)` in
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_summary_element.cc?l=109
          rect = (clickEl as HTMLDetailsElement).open || !rect ? getVisibleClientRect_(summary) : rect
          retPromise = catchAsyncErrorSilently(click_async(summary, rect, 1))
        } else {
          (clickEl as HTMLDetailsElement).open = !(clickEl as HTMLDetailsElement).open
        }
      } else if (hint.r && hint.r === hint.d) {
        hoverEl()
      } else if (elType > EditableType.MaxNotEditableElement) {
        retPromise = select_(clickEl as LockableElement, rect, !removeFlash)
        showRect = 0
      } else {
        /*#__NOINLINE__*/ defaultClick()
      }
    } else if (forHover_) {
      (HintMode.HOVER + 1 === HintMode.UNHOVER ? HintMode.HOVER & 1 ? mode1_ & 1 : !(mode1_ & 1)
        : HintMode.HOVER < HintMode.UNHOVER ? mode1_ < HintMode.HOVER + 1 : mode1_ > HintMode.HOVER - 1)
      ? hoverEl() : retPromise = catchAsyncErrorSilently(wrap_enable_bubbles(hintOptions, unhover_async<1>, [clickEl]))
    } else if (mode1_ < HintMode.FOCUS + 1) {
      view_(clickEl)
      setNewScrolling(clickEl)
      focus_(clickEl)
      set_cachedScrollable(currentScrolling)
      showUrlIfNeeded()
      removeFlash || showRect && flash_(clickEl)
      showRect = 0
    } else if (mode1_ < HintMode.max_media + 1) {
      downloadOrOpenMedia()
    } else if (mode1_ < HintMode.max_copying + 1) {
      copyText()
    } else if (mode1_ < HintMode.DOWNLOAD_LINK + 1) {
      downloadLink()
    } else if (mode1_ < HintMode.EDIT_LINK_URL) {
      openTextOrUrl(getUrlData())
    } else if (mode1_ < HintMode.max_edit + 1) {
      copyText()
    } else { // HintMode.ENTER_VISUAL_MODE
      selectAllOfNode(clickEl)
      const sel = getSelection_(), caret = hintOptions.caret
      collpaseSelection(sel, VisualModeNS.kDir.left, 1)
      modifySel(sel, 1, 1, caret ? kGCh : "word")
      hintOptions.visual === !1 || post_({ H: kFgReq.visualMode, c: caret, f: then })
    }
    showRect && (rect || (rect = getVisibleClientRect_(clickEl)))
  } else {
    hintApi.h(kTip.linkRemoved, 2)
    then = optElse
  }
  return retPromise ? retPromise.then(doPostAction) : Promise.resolve(doPostAction())
}
