import { clickable_, VOther, doc } from "../lib/utils"
import {
  docEl_unsafe_, htmlTag_, isAriaNotTrue_, isStyleVisible_, querySelectorAll_unsafe_,
} from "../lib/dom_utils"
import { getBoundingClientRect_ } from "../lib/rect"
import { kSafeAllSelector, unwrap_ff } from "./link_hints"
import { traverse, ngEnabled } from "./local_links"

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
} as HintsNS.Filter<SafeHTMLElement>

const isVisibleInPage = (element: SafeHTMLElement): boolean => {
  let rect: ClientRect
  return isAriaNotTrue_(element, kAria.disabled)
      && (rect = getBoundingClientRect_(element)).width > 2 && rect.height > 2 && isStyleVisible_(element)
}

export const findAndFollowLink = (names: string[], isNext: boolean, lenLimit: number[], totalMax: number
    ): SafeHTMLElement | null => {
  interface Candidate { [0]: number; [1]: string; [2]: Parameters<typeof GetButtons>[0][number] }
  // Note: this traverser should not need a prepareCrop
  let links = traverse(kSafeAllSelector, GetButtons, true, true);
  const wordRe = <RegExpOne> /\b/,
  quirk = isNext ? ">>" : "<<", quirkIdx = names.indexOf(quirk),
  rel = isNext ? "next" : "prev", relIdx = names.indexOf(rel),
  detectQuirk = quirkIdx > 0 ? names.lastIndexOf(quirk[0], quirkIdx) : -1,
  refusedStr = isNext ? "<" : ">";
  links.push(docEl_unsafe_() as never);
  let candidates: Candidate[] = [], ch: string, s: string, maxLen = totalMax, len: number;
  let i: number, candInd = 0, count = names.length;
  for (i = 0; i < count; i++) {
    if (GlobalConsts.SelectorPrefixesInPatterns.includes(names[i][0])) {
      const arr = querySelectorAll_unsafe_(doc, names[i]);
      if (arr && arr.length === 1 && htmlTag_(arr[0])) {
        candidates.push([i << 23, "", arr[0] as SafeHTMLElement]);
        count = i + 1;
        break;
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
      for (i = 0; i < count; i++) {
        if (s.length < lenLimit[i] && s.includes(names[i])) {
          if (!s.includes(refusedStr) && (len = (s = s.trim()).split(wsRe).length) <= maxLen) {
            maxLen > len && (maxLen = len + 1);
            let i2 = names.indexOf(s, i);
            if (i2 >= 0) { i = i2; len = 0; }
            else if (detectQuirk === i && s.includes(quirk)) { i = quirkIdx; len = 1; }
            // requires GlobalConsts.MaxNumberOfNextPatterns <= 255
            candidates.push([
                  !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
                  && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
                  ? (i << 23) | (len << 16) : (i << 23) | (len << 16) | candInd++ & 0xffff,
                s, link]);
          }
          break;
        }
      }
    }
    // for non-English pages like www.google.co.jp
    if (s.length < 5 && relIdx >= 0 && (ch = link.id) && ch.includes(rel)) {
      candidates.push([
            !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
            ? (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16)
            : (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16) | candInd++ & 0xffff,
          rel, link]);
    }
  }
  if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
      ? !candidates.length : !candInd) {
    return null;
  }
  links = [];
  maxLen = (maxLen + 1) << 16;
  candidates = candidates.filter(a => (a[0] & 0x7fffff) < maxLen).sort((a, b) => a[0] - b[0]);
  for (i = candidates[0][0] >> 23; i < count; ) {
    s = names[i++];
    const re = new RegExp(wordRe.test(s[0]) || wordRe.test(s.slice(-1)) ? `\\b${s}\\b` : s, ""), j = i << 23;
    for (const candidate of candidates) {
      if (candidate[0] > j) { break; }
      if (!candidate[1] || re.test(candidate[1])) { return candidate[2]; }
    }
  }
  return null;
}

export const findAndFollowRel = (relName: string): SafeHTMLElement | null | undefined => {
  const elements = querySelectorAll_unsafe_(doc, Build.BTypes & BrowserType.Edge ? "[rel]" : `[rel]:-${
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
  return matched as SafeHTMLElement | undefined;
}
