import { clickable_, VOther, vApi, isAlive_, safer, timeout_ } from "../lib/utils"
import {
  docEl_unsafe_, htmlTag_, isAriaNotTrue_, isStyleVisible_, querySelectorAll_unsafe_, isIFrameElement,
} from "../lib/dom_utils"
import { getBoundingClientRect_, view_ } from "../lib/rect"
import { kSafeAllSelector, unwrap_ff, detectUsableChild } from "./link_hints"
import { traverse, ngEnabled } from "./local_links"
import { find_box } from "./mode_find"
import { omni_box } from "./omni"
import { flash_ } from "./dom_ui"
import { click_ } from "./async_dispatcher"
import { contentCommands_ } from "./commands"

let iframesToSearchForNext: VApiTy[] | null

const GetButtons = function (this: void, hints, element): void {
  let s: string | null;
  const tag = element.localName, isClickable = tag === "a" || tag && (
    tag === "button" ? !(element as HTMLButtonElement).disabled
    : clickable_.has(element)
    || (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
        ? (unwrap_ff(element)).onclick : element.getAttribute("onclick"))
    || (
      (s = element.getAttribute("role")) ? (<RegExpI> /^(button|link)$/i).test(s)
      : ngEnabled && element.getAttribute("ng-click")));
  if (isClickable && isVisibleInPage(element)) {
    hints.push(element)
  }
  if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
      && !(Build.BTypes & ~BrowserType.ChromeOrFirefox) ? isIFrameElement(element)
      : isIFrameElement(element) && element !== find_box && element !== omni_box) {
    const rect = getBoundingClientRect_(element),
    childApi = rect.width > 99 && rect.height > 15 && detectUsableChild(element as KnownIFrameElement)
    childApi && iframesToSearchForNext!.push(childApi)
  }
} as HintsNS.Filter<SafeHTMLElement>

const isVisibleInPage = (element: SafeHTMLElement): boolean => {
  let rect: ClientRect
  return isAriaNotTrue_(element, kAria.disabled)
      && (rect = getBoundingClientRect_(element)).width > 2 && rect.height > 2 && isStyleVisible_(element)
}

export const filterTextToGoNext: VApiTy["g"] = (candidates, names, isNext, lenLimits, totalMax, maxLen): number => {
  if (!isAlive_) { return maxLen }
  // Note: this traverser should not need a prepareCrop
  const links = traverse(kSafeAllSelector, GetButtons, true, true),
  quirk = isNext ? ">>" : "<<", quirkIdx = names.indexOf(quirk),
  rel = isNext ? "next" : "prev", relIdx = names.indexOf(rel),
  detectQuirk = quirkIdx > 0 ? names.lastIndexOf(quirk[0], quirkIdx) : -1,
  refusedStr = isNext ? "<" : ">";
  links.push(docEl_unsafe_() as never);
  let ch: string, s: string, len: number, i = 0, candInd = 0
  for (; i < names.length; i++) {
    if (GlobalConsts.SelectorPrefixesInPatterns.includes(names[i][0])) {
      const arr = querySelectorAll_unsafe_(names[i]);
      if (arr && arr.length === 1 && htmlTag_(arr[0])) {
        candidates.push([arr[0] as SafeHTMLElement, vApi, i << 23, ""])
        names.length = i + 1
      }
    }
  }
  for (let wsRe = <RegExpOne> /\s+/, _len = links.length - 1; 0 <= --_len; ) {
    const link = links[_len];
    if (link.contains(links[_len + 1]) || (s = link.innerText).length > totalMax) { continue; }
    if (s = s || (ch = (link as HTMLInputElement).value) && ch.toLowerCase && ch
            || link.getAttribute("aria-label") || link.title) {
      if (s.length > totalMax) { continue; }
      s = s.toLowerCase();
      for (i = 0; i < names.length; i++) {
        if (s.length < lenLimits[i] && s.includes(names[i])) {
          if (!s.includes(refusedStr) && (len = (s = s.trim()).split(wsRe).length) <= maxLen) {
            maxLen > len && (maxLen = len + 1);
            let i2 = names.indexOf(s, i);
            if (i2 >= 0) { i = i2; len = 0; }
            else if (detectQuirk === i && s.includes(quirk)) { i = quirkIdx; len = 1; }
            // requires GlobalConsts.MaxNumberOfNextPatterns <= 255
            candidates.push([link, vApi,
                  !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
                  && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
                  ? (i << 23) | (len << 16) : (i << 23) | (len << 16) | candInd++ & 0xffff,
                s])
          }
          break;
        }
      }
    }
    // for non-English pages like www.google.co.jp
    if (s.length < 5 && relIdx >= 0 && (ch = link.id) && ch.includes(rel)) {
      candidates.push([link, vApi,
            !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
            ? (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16)
            : (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16) | candInd++ & 0xffff,
          rel])
    }
  }
  return maxLen
}

export const findNextInText = (names: string[], isNext: boolean, lenLimits: number[], totalMax: number
    ): GoNextBaseCandidate | null => {
  const wordRe = <RegExpOne> /\b/
  let candidates: GoNextCandidate[] = [], officer: VApiTy | undefined, maxLen = totalMax, s: string
  iframesToSearchForNext = [vApi]
  while (officer = iframesToSearchForNext!.pop()) {
    try {
      maxLen = officer.g(candidates, names, isNext, lenLimits, totalMax, maxLen)
    } catch {}
    let curLenLimit = (maxLen + 1) << 16
    candidates = candidates.filter(a => (a[2] & 0x7fffff) < curLenLimit)
  }
  iframesToSearchForNext = null
  candidates = candidates.sort((a, b) => a[2] - b[2])
  for (let i = candidates.length ? candidates[0][2] >> 23 : GlobalConsts.MaxNumberOfNextPatterns; i < names.length; ) {
    s = names[i++];
    const re = new RegExp(wordRe.test(s[0]) || wordRe.test(s.slice(-1)) ? `\\b${s}\\b` : s, ""), j = i << 23;
    for (const candidate of candidates) {
      if (candidate[2] > j) { break }
      if (!candidate[3] || re.test(candidate[3])) { return candidate }
    }
  }
  return null;
}

export const findNextInRel = (relName: string): GoNextBaseCandidate | null | undefined => {
  const elements = querySelectorAll_unsafe_(Build.BTypes & BrowserType.Edge ? "[rel]" : `[rel]:-${
      !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && VOther & BrowserType.Chrome
      ? "webkit" : "moz"}-any(a,area,link)`)!
  let s: string | null | undefined;
  type HTMLElementWithRel = HTMLAnchorElement | HTMLAreaElement | HTMLLinkElement;
  let matched: HTMLElementWithRel | undefined;
  const re1 = <RegExpOne> /\s+/
  for (const element of elements as { [i: number]: Element } as Element[]) {
    if ((!(Build.BTypes & BrowserType.Edge) ? htmlTag_(element) : (<RegExpI> /^(a|area|link)$/).test(htmlTag_(element)))
        && (s = (element as TypeToPick<HTMLElement, HTMLElementWithRel, "rel">).rel)
        && s.trim().toLowerCase().split(re1).indexOf(relName) >= 0
        && (element as HTMLElementWithRel).href) {
      if (matched) {
        if ((element as HTMLElementWithRel).href.split("#")[0] !== matched.href.split("#")[0]) {
          return null;
        }
        if (!isVisibleInPage(element as SafeHTMLElement)) { continue }
      }
      matched = element as HTMLElementWithRel;
    }
  }
  return matched && [matched as SafeHTMLElement, vApi]
}

export const jumpToNextLink = (linkElement: GoNextBaseCandidate[0]): void => {
  let url = htmlTag_(linkElement) === "link" && (linkElement as HTMLLinkElement).href
  view_(linkElement)
  flash_(linkElement) // here calls getRect -> preparCrop_
  if (url) {
    contentCommands_[kFgCmd.framesGoBack](safer({ r: 1, url }))
  } else {
    timeout_((): void => { click_(linkElement) }, 100)
  }
}
