import {
  clickable_, vApi, isAlive_, safer, timeout_, escapeAllForRe, tryCreateRegExp, VTr, isTY, Lower, chromeVer_, OnSafari,
  OnChrome, OnFirefox, OnEdge, evenHidden_, doc, firefoxVer_, urlSameIgnoringHash
} from "../lib/utils"
import {
  htmlTag_, isAriaFalse_, isStyleVisible_, querySelectorAll_unsafe_, isIFrameElement, ALA, attr_s, findAnchor_,
  contains_s, isSafeEl_, hasTag_, AriaArray, testMatch, uneditableInputs_, findSelectorByHost
} from "../lib/dom_utils"
import { getBoundingClientRect_, isNotInViewport, view_, kInvisibility } from "../lib/rect"
import { kSafeAllSelector, detectUsableChild } from "./link_hints"
import { traverse, ngEnabled_, extraClickable_ } from "./local_links"
import { find_box } from "./mode_find"
import { omni_box } from "./omni"
import { flash_ } from "./dom_ui"
import { catchAsyncErrorSilently, click_async } from "./async_dispatcher"
import { contentCommands_, runFallbackKey } from "./port"

let iframesToSearchForNext: VApiTy[] | null

export const isInteractiveInPage = (element: SafeElement): boolean => {
  let rect: ClientRect
  return (rect = getBoundingClientRect_(element)).width > 2 && rect.height > 2
      && (isStyleVisible_(element) || !!(evenHidden_ & kHidden.VisibilityHidden))
      || !!(evenHidden_ & kHidden.Size0)
}

export const filterTextToGoNext: VApiTy["g"] = (candidates, names, options, maxLen): number => {
  // Note: this traverser should not need a prepareCrop
  const fromMatchSelector = !!options.match
  const excOnHost = findSelectorByHost(kTip.excludeWhenGoNext)
  const links = isAlive_ ? traverse(kSafeAllSelector, options, (hints: Hint0[], element: SafeElement): void => {
    let s: string | null | undefined
    if (isIFrameElement(element)) {
      if (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1
          || element !== find_box && element !== omni_box) {
        const rect = getBoundingClientRect_(element),
        childApi = rect.width > 99 && rect.height > 15 && isStyleVisible_(element) && detectUsableChild(element)
        childApi && iframesToSearchForNext!.push(childApi)
      }
    } else if (fromMatchSelector || (s = htmlTag_(element))
        && (s === "a" || s === "img" || (s === "button" ? !(element as HTMLButtonElement).disabled
            : s === "input" && uneditableInputs_[(element as HTMLInputElement).type] === 2))
        || clickable_.has(element) || extraClickable_ && extraClickable_.has(element)
        || (OnFirefox ? (element as HTMLElement | SVGElement).onclick : attr_s(element, "onclick"))
        || ((s = OnChrome && Build.MinCVer >= BrowserVer.MinEnsured$Element$$role
                ? element.role : attr_s(element, "role")) ? (<RegExpI> /^(button|link)$/i).test(s)
          : ngEnabled_ === 1 && attr_s(element, "ng-click"))) {
      if ((isAriaFalse_(element, kAria.disabled) && isAriaFalse_(element, kAria.hasPopup) || fromMatchSelector)
          && isInteractiveInPage(element)) {
        hints.push([element as SafeElementForMouse])
      }
    }
  }, 1, 1, 1) : [],
  isNext = options.n, lenLimits = options.l, totalMax = options.m,
  quirk = isNext ? ">>" : "<<", quirkIdx = names.indexOf(quirk),
  rel = isNext ? "next" : "prev", relIdx = names.indexOf(rel),
  detectQuirk = quirkIdx > 0 ? names.lastIndexOf(quirk[0], quirkIdx) : -1,
  wsRe = <RegExpOne> /\s+/,
  refusedStr = isNext ? "<" : ">";
  let i = isAlive_ ? 0 : GlobalConsts.MaxNumberOfNextPatterns + 1
  let candInd = 0, index = links.length
  links.push([doc as never])
  for (; i < names.length; i++) {
    if (GlobalConsts.SelectorPrefixesInPatterns.includes(names[i][0])) {
      const arr = querySelectorAll_unsafe_(names[i]);
      if (arr && arr[0] && isSafeEl_(arr[0])) {
        candidates.push([arr[0] satisfies SafeElement as SafeElementForMouse, vApi, i << 23, ""])
        names.length = i + 1
      }
    }
  }
  let ch: string | null | undefined, s: string, len: number
  for (; 0 <= --index; ) {
    const link = links[index][0]
    s = "lang" in link ? (s = link.innerText, s.length > 2 && hasTag_("a", link) && link.childElementCount === 1
              && (ch = Build.BTypes === BrowserType.Safari as number
                    || !(Build.BTypes & ~(BrowserType.Chrome | BrowserType.Safari))
                        && Build.MinCVer >= BrowserVer.MinEnsuredAriaProperties ? link.ariaLabel : attr_s(link, ALA))
              && (link.firstElementChild as Element as TypeToPick<Element, HTMLElement, "innerText">).innerText === s
              ? ch : s)
            : link.textContent.trim()
    if (s.length > totalMax || contains_s(link, links[index + 1][0]) && s.length > 2) { continue }
    if (s = s.length > 2 ? s
          : !s && (ch = (link as TypeToPick<Element, HTMLInputElement, "value">).value) && isTY(ch) && ch
            || (OnSafari || OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredAriaProperties ? link.ariaLabel
                : attr_s(link, ALA))
            || (link as TypeToPick<Element, HTMLElement, "title">).title
            || hasTag_("img", link) && (link as HTMLImageElement).alt // https://github.com/philc/vimium/issues/4090
            || s) {
      if (s.length > totalMax) { continue; }
      s = Lower(s)
      for (i = 0; i < names.length; i++) {
        if (s.length < lenLimits[i] && s.includes(names[i])) {
          if (!s.includes(refusedStr) && (len = (s = s.trim()).split(wsRe).length) <= maxLen
              && (!excOnHost || !testMatch(excOnHost, link))
              && (s !== "back" ? s !== "more"
                    || !(OnSafari || OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredAriaProperties
                          ? link.ariaHasPopup : attr_s(link, AriaArray[kAria.hasPopup]))
                  : OnChrome && Build.MinCVer < BrowserVer.Min$Element$$closest
                    && chromeVer_ < BrowserVer.Min$Element$$closest ? hasTag_("a", link)
                  : link.closest!("a"))
              ) {
            maxLen > len && (maxLen = len + 1);
            let i2 = names.indexOf(s, i);
            if (i2 >= 0) { i = i2; len = 0; }
            else if (detectQuirk === i && s.includes(quirk)) { i = quirkIdx; len = 1; }
            // requires GlobalConsts.MaxNumberOfNextPatterns <= 255
            candidates.push([link, vApi,
                  (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge)
                  ? (i << 23) | (len << 16) : (i << 23) | (len << 16) | candInd++ & 0xffff,
                s])
          }
          break;
        }
      }
    } else if (fromMatchSelector) {
      candidates.push([link, vApi, (names.length - 1) << 23, ""])
    }
    // for non-English pages like www.google.co.jp
    if (s.length < 5 && relIdx >= 0 && (ch = link.id) && ch.includes(rel)) {
      candidates.push([link, vApi,
            (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge)
            ? (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16)
            : (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16) | candInd++ & 0xffff,
          rel])
    }
  }
  return maxLen
}

export const findNextInText = (names: string[], options: CmdOptions[kFgCmd.goNext]
    ): GoNextBaseCandidate | void => {
  const wordRe = <RegExpOne> /\b/
  let array: GoNextCandidate[] = [], officer: VApiTy | undefined, maxLen = options.m, candidate: GoNextCandidate
  let curLenLimit: number
  iframesToSearchForNext = [vApi]
  while (officer = iframesToSearchForNext.pop()) {
    try {
      maxLen = officer.g(array, names, options, maxLen)
    } catch {}
    curLenLimit = (maxLen + 1) << 16
    array = array.filter(a => (a[2] & 0x7fffff) < curLenLimit)
  }
  iframesToSearchForNext = null
  array = array.sort((a, b) => a[2] - b[2])
  let arr2: GoNextCandidate[] = []
  for (let i = array.length ? array[0][2] >> 23 : GlobalConsts.MaxNumberOfNextPatterns; i < names.length; ) {
    const s = names[i++]
    const re = tryCreateRegExp(wordRe.test(s[0]) || wordRe.test(s.slice(-1))
        ? `\\b${escapeAllForRe(s)}\\b` : escapeAllForRe(s))!, j = i << 23
    for (candidate of array) {
      if (candidate[2] > j) { i = GlobalConsts.MaxNumberOfNextPatterns; break }
      if (!candidate[3] || re.test(candidate[3])) {
        candidate[1] === vApi && !isNotInViewport(candidate[0]) && (arr2 = [])
        arr2.push(candidate)
      }
    }
  }
  return arr2[0]
}

export const findNextInRel = (options: CmdOptions[kFgCmd.goNext]
    ): GoNextBaseCandidate | null | undefined => {
  const notFiltered = OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredCaseInSensitiveAttrSelector
      && chromeVer_ < BrowserVer.MinEnsuredCaseInSensitiveAttrSelector
  let query = OnEdge ? "a[rel],area[rel],link[rel]" : VTr(kTip.isWithRel, notFiltered ? "" : options.r)
  let elements: ArrayLike<Element> = querySelectorAll_unsafe_(OnEdge ? query
      : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredCSS$is$selector
        || firefoxVer_ > FirefoxBrowserVer.MinEnsuredCSS$is$selector - 1 ? query : query.replace("is", "-moz-any")
      : !OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredCSS$is$selector
        || chromeVer_ > BrowserVer.MinEnsuredCSS$is$selector - 1 ? query
      : OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredCaseInSensitiveAttrSelector ? ":-webkit-any" + query.slice(3)
      : ":-webkit-any" + query.slice(3).replace("~= i", ""))!
  let s: string | null | undefined;
  type HTMLElementWithRel = HTMLAnchorElement | HTMLAreaElement | HTMLLinkElement;
  let matched: HTMLElementWithRel | undefined, invisible: kInvisibility | 9 = 9, tag: "a" | "area" | "link" | ""
  const re1 = <RegExpOne> /\s/
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
      && Build.MinCVer >= BrowserVer.BuildMinForOf
      && chromeVer_ < BrowserVer.MinEnsured$ForOf$ForDOMListTypes) {
    elements = [].slice.call(elements)
  }
  for (const element of elements as SafeHTMLElement[]) {
    if ((tag = htmlTag_(element) as typeof tag)
        && (!notFiltered || (s = OnChrome && Build.MinCVer < BrowserVer.Min$HTMLAreaElement$rel
                ? attr_s(element, "rel")
                : (element as TypeToPick<HTMLElement, HTMLElementWithRel, "rel">).rel)
            && Lower(s).split(re1).indexOf(options.r) >= 0)
        && ((s = (element as HTMLElementWithRel).href) || tag < "aa")
        && (tag > "b" || isInteractiveInPage(element))) {
      if (matched) {
        if (s && !urlSameIgnoringHash(s, matched.href || s)) {
          return null;
        }
      }
      if (!matched || (invisible < 9 ? invisible : (invisible = isNotInViewport(matched as typeof element)))
          || !options.n && !isNotInViewport(element)) {
        invisible = !matched || invisible ? 9 : kInvisibility.Visible
        matched = element as HTMLElementWithRel
      }
    }
  }
  if (matched && (invisible < 9 ? invisible : isNotInViewport(matched as SafeHTMLElement)) > kInvisibility.OutOfView) {
    s = matched.href
    options.match = `a[href*="${OnEdge || OnChrome && Build.MinCVer < BrowserVer.Min$CSS$$escape
          ? s.slice(new URL(s).origin.length).replace(<RegExpG> /"|\\/g, "\\$&")
          : CSS.escape!(s.slice(new URL(s).origin.length)) }"]` as "css-selector"
    const res = traverse("a", options, (hints: Hint0[], element: SafeElement): void => {
      if ((element as HTMLAnchorElement).href === s && isInteractiveInPage(element)) {
        isNotInViewport(element) && (hints.length = 0)
        hints.push([element as SafeHTMLElement])
      }
    }, 1, 1)[0]
    matched = res ? res[0] as HTMLAnchorElement : matched
  }
  return matched && [matched as SafeHTMLElement, vApi]
}

export const jumpToNextLink: VApiTy["j"] = (linkElement: GoNextBaseCandidate[0], options): void => {
  const invisible = options.a ? kInvisibility.NoSpace : isNotInViewport(linkElement)
  const avoidClick = invisible > kInvisibility.OutOfView
  const url = (avoidClick || invisible && !options.v)
      && ((linkElement as TypeToPick<Element, HTMLLinkElement, "href">).href ||
          (findAnchor_(linkElement) || linkElement as TypeToPick<Element, HTMLLinkElement, "href">).href)
  url && vApi.t({ k: kTip.raw, t: url.slice(0, 256), d: 2, l: 1 })
  if (avoidClick && url) {
    contentCommands_[kFgCmd.framesGoBack](safer<CmdOptions[kFgCmd.framesGoBack]>({ r: 1, u: url }))
  } else {
    options.v && invisible === kInvisibility.OutOfView && view_(linkElement, 1)
    flash_(linkElement) // here calls getRect -> preparCrop_
    timeout_((): void => { void catchAsyncErrorSilently(click_async(linkElement)) }, 100)
  }
  runFallbackKey(options, 0)
}
