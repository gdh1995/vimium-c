import {
  clickable_, vApi, isAlive_, safer, timeout_, escapeAllForRe, tryCreateRegExp, VTr, isTY, Lower, chromeVer_,
  OnChrome, OnFirefox, OnEdge, evenHidden_, doc
} from "../lib/utils"
import {
  htmlTag_, isAriaFalse_, isStyleVisible_, querySelectorAll_unsafe_, isIFrameElement, ALA, attr_s,
  contains_s, notSafe_not_ff_, hasTag_
} from "../lib/dom_utils"
import { getBoundingClientRect_, view_ } from "../lib/rect"
import { kSafeAllSelector, detectUsableChild } from "./link_hints"
import { traverse, ngEnabled } from "./local_links"
import { find_box } from "./mode_find"
import { omni_box } from "./omni"
import { flash_ } from "./dom_ui"
import { catchAsyncErrorSilently, click_async } from "./async_dispatcher"
import { contentCommands_, runFallbackKey } from "./port"
import { hudTip } from "./hud"

let iframesToSearchForNext: VApiTy[] | null

export const isInteractiveInPage = (element: SafeElement): boolean => {
  let rect: ClientRect
  return (rect = getBoundingClientRect_(element)).width > 2 && rect.height > 2
      && (isStyleVisible_(element) || !!(evenHidden_ & kHidden.VisibilityHidden))
}

export const filterTextToGoNext: VApiTy["g"] = (candidates, names, options, maxLen): number => {
  // Note: this traverser should not need a prepareCrop
  const fromMatchSelector = !!options.match
  const links = isAlive_ ? traverse(kSafeAllSelector, options, (hints: Hint0[], element: SafeElement): void => {
    let s: string | null
    if (isIFrameElement(element)) {
      if (OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
          || OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1
          || element !== find_box && element !== omni_box) {
        const rect = getBoundingClientRect_(element),
        childApi = rect.width > 99 && rect.height > 15 && isStyleVisible_(element) && detectUsableChild(element)
        childApi && iframesToSearchForNext!.push(childApi)
      }
    } else if (fromMatchSelector || (s = htmlTag_(element)) === "a"
        || (s === "button" ? !(element as HTMLButtonElement).disabled : s && clickable_.has(element))
        || (OnFirefox ? (element as HTMLElement | SVGElement).onclick : attr_s(element, "onclick"))
        || ((s = attr_s(element, "role")) ? (<RegExpI> /^(button|link)$/i).test(s)
          : ngEnabled && attr_s(element, "ng-click"))) {
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
      if (arr && arr.length === 1 && (OnFirefox || !notSafe_not_ff_!(arr[0]))) {
        candidates.push([arr[0] as SafeElement as SafeElementForMouse, vApi, i << 23, ""])
        names.length = i + 1
      }
    }
  }
  let ch: string, s: string, len: number
  for (; 0 <= --index; ) {
    const link = links[index][0]
    if ((s = "lang" in link ? link.innerText : link.textContent.trim()).length > totalMax
        || contains_s(link, links[index + 1][0]) && s.length > 2) { continue }
    if (s = s.length > 2 ? s : !s && (ch = (link as HTMLInputElement).value) && isTY(ch) && ch
            || attr_s(link, ALA) || (link as TypeToPick<Element, HTMLElement, "title">).title || s) {
      if (s.length > totalMax) { continue; }
      s = Lower(s)
      for (i = 0; i < names.length; i++) {
        if (s.length < lenLimits[i] && s.includes(names[i])) {
          if (!s.includes(refusedStr) && (len = (s = s.trim()).split(wsRe).length) <= maxLen) {
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
  let array: GoNextCandidate[] = [], officer: VApiTy | undefined, maxLen = options.m, s: string
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
  for (let i = array.length ? array[0][2] >> 23 : GlobalConsts.MaxNumberOfNextPatterns; i < names.length; ) {
    s = names[i++];
    const re = tryCreateRegExp(wordRe.test(s[0]) || wordRe.test(s.slice(-1))
        ? `\\b${escapeAllForRe(s)}\\b` : escapeAllForRe(s))!, j = i << 23
    for (const candidate of array) {
      if (candidate[2] > j) { break }
      if (!candidate[3] || re.test(candidate[3])) { return candidate }
    }
  }
}

export const findNextInRel = (relName: string): GoNextBaseCandidate | null | undefined => {
  let elements: ArrayLike<Element> = querySelectorAll_unsafe_(OnEdge ? "a[rel],area[rel],link[rel]"
      : OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredCSS$is$selector
      ? VTr(kTip.webkitWithRel).replace("-webkit-any", "is")
      : OnFirefox ? VTr(kTip.webkitWithRel).replace("webkit", "moz") : VTr(kTip.webkitWithRel))!
  let s: string | null | undefined;
  type HTMLElementWithRel = HTMLAnchorElement | HTMLAreaElement | HTMLLinkElement;
  let matched: HTMLElementWithRel | undefined, tag: "a" | "area" | "link" | ""
  const re1 = <RegExpOne> /\s/
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
      && Build.MinCVer >= BrowserVer.BuildMinForOf
      && chromeVer_ < BrowserVer.MinEnsured$ForOf$ForDOMListTypes) {
    elements = [].slice.call(elements)
  }
  for (const element of elements as SafeHTMLElement[]) {
    if ((tag = htmlTag_(element) as typeof tag)
        && (s = OnChrome && Build.MinCVer < BrowserVer.Min$HTMLAreaElement$rel
                ? attr_s(element, "rel")
                : (element as TypeToPick<HTMLElement, HTMLElementWithRel, "rel">).rel)
        && Lower(s).split(re1).indexOf(relName) >= 0
        && ((s = (element as HTMLElementWithRel).href) || tag < "aa")
        && (tag > "b" || isInteractiveInPage(element))) {
      if (matched) {
        if (s && matched.href && s.split("#")[0] !== matched.href.split("#")[0]) {
          return null;
        }
      }
      matched = element as HTMLElementWithRel;
    }
  }
  return matched && [matched as SafeHTMLElement, vApi]
}

export const jumpToNextLink: VApiTy["j"] = (linkElement: GoNextBaseCandidate[0], options): void => {
  let url = hasTag_("link", linkElement) && (linkElement as HTMLLinkElement).href
  if (url) {
    hudTip(kTip.raw, 2, url, 1)
    contentCommands_[kFgCmd.framesGoBack](safer<CmdOptions[kFgCmd.framesGoBack]>({ r: 1, u: url }))
  } else {
    options.v && view_(linkElement)
    flash_(linkElement) // here calls getRect -> preparCrop_
    timeout_((): void => { void catchAsyncErrorSilently(click_async(linkElement)) }, 100)
  }
  runFallbackKey(options, 0)
}
