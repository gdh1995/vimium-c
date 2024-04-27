import { chromeVer_, createRegExp, Lower, math, max_, OnChrome, OnEdge, OnFirefox } from "../lib/utils"
import {
  createElement_, querySelector_unsafe_, htmlTag_, docEl_unsafe_, removeEl_s, ALA, attr_s,
  contains_s, setClassName_s, setVisibility_s, toggleClass_s, textContent_s, appendNode_s, hasTag_
} from "../lib/dom_utils"
import {
  HintItem, FilteredHintItem, MarkerElement, HintText, isHC_,
  hintMode_, useFilter_, hintKeyStatus, KeyStatus, hintChars, allHints, setMode, resetMode, hintOptions
} from "./link_hints"
import { bZoom_, boundingRect_, dimSize_,  } from "../lib/rect"
import { BSP, DEL, ENTER, SPC } from "../lib/keyboard_utils"
import { ClickType, closableClasses_, maxLeft_, maxRight_, maxTop_ } from "./local_links"
import { ui_root } from "./dom_ui"
import { omni_box } from "./omni"

type Stack = number[];
type Stacks = Stack[];

const kNumbers = "0123456789" as const
let activeHint_: FilteredHintItem | null | undefined
let nonMatchedRe_: RegExpG & RegExpOne | null | undefined
let maxPrefixLen_ = 0
let pageNumberHintArray: FilteredHintItem[] | null | undefined
let zIndexes_: Stacks | null | undefined | 0

export { activeHint_, zIndexes_ }
export function set_zIndexes_ (_newZIndexes: null): void { zIndexes_ = _newZIndexes }
export function set_maxPrefixLen_ (_newMaxPrefixLen: 0): void { maxPrefixLen_ = _newMaxPrefixLen }
export const hintFilterReset = (): void => { pageNumberHintArray = zIndexes_ = activeHint_ = null }

export const createHint = (link: Hint): HintItem => {
  let i: number = link.length < 4 ? link[1].l : (link as Hint4)[3][0].l + (link as Hint4)[3][1];
  const marker = createElement_("span") as MarkerElement, st = marker.style,
  isBox = link[2] > ClickType.MaxNotBox, P = "px";
  marker.className = isBox ? "LH BH" : "LH";
  st.left = i + P;
  if ((!OnChrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
      && i > maxLeft_ && maxRight_) {
    st.maxWidth = maxRight_ - i + P;
  }
  i = link[1].t;
  st.top = i + P;
  if ((!OnChrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
      && i > maxTop_) {
    st.maxHeight = maxTop_ - i + GlobalConsts.MaxHeightOfLinkHintMarker + P;
  }
  return { // the order of keys is for easier debugging
    a: "",
    d: link[0],
    h: null,
    i: 0,
    m: marker,
    r: link.length > 4 ? (link as Hint5)[4] : isBox ? link[0] : null
  };
}

export const adjustMarkers = (arr: readonly HintItem[], elements: readonly Hint[]): void => {
  const zi = bZoom_;
  let i = arr.length - 1;
  if (!ui_root || i < 0 || arr[i].d !== omni_box && !querySelector_unsafe_("#HDlg", ui_root)) { return }
  const z = !OnFirefox ? ("" + 1 / zi).slice(0, 5) : "",
  mr = !OnChrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
      ? maxRight_ * zi : 0,
  mt = !OnChrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
      ? maxTop_ * zi : 0;
  while (0 <= i && ui_root.contains(arr[i].d)) {
    let st = arr[i--].m.style;
    OnFirefox || (st.zoom = z)
    if (OnChrome && Build.MinCVer >= BrowserVer.MinAbsolutePositionNotCauseScrollbar) {
      continue;
    }
    st.maxWidth && (st.maxWidth = mr - elements[i][1].l + "px");
    st.maxHeight && (st.maxHeight = mt - elements[i][1].t + 18 + "px");
  }
}

export const rotate1 = (totalHints: readonly HintItem[], reverse?: boolean, saveIfNoOverlap?: boolean): void => {
  if (!zIndexes_) {
    const rects: Array<Rect | null> = []
    let stacks: Stacks = []
    totalHints.forEach((hint: HintItem, i: number): void => {
      if (hint.m.style.visibility) { rects.push(null); return; }
      hint.z = hint.z || i + 1;
      const m = boundingRect_(hint.m)
      let stackForThisMarker: Stack | undefined;
      rects.push(m);
      for (let j = 0, len2 = stacks.length; j < len2; ) {
        let stack = stacks[j], k = 0, len3 = stack.length;
        for (; k < len3; k++) {
          const t = rects[stack[k]]!;
          if (m.b > t.t && m.t < t.b && m.r > t.l && m.l < t.r) {
            break;
          }
        }
        if (k >= len3) { /* empty */ }
        else if (stackForThisMarker) {
          stackForThisMarker.push(...stack);
          stacks.splice(j, 1); len2--;
          continue;
        } else {
          stack.push(i);
          stackForThisMarker = stack;
        }
        j++;
      }
      stackForThisMarker || stacks.push([i]);
    });
    stacks = stacks.filter(stack => stack.length > 1);
    if (stacks.length <= 0) {
      zIndexes_ = saveIfNoOverlap ? 0 : zIndexes_
      return;
    }
    zIndexes_ = stacks;
  }
  for (const zIndexSubArray of zIndexes_) {
    const length = zIndexSubArray.length, end = reverse ? -1 : length
    const max = !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment
        ? max_(...zIndexSubArray) : (Build.NDEBUG ? max_ : math.max).apply(math, zIndexSubArray)
    let oldI: number = totalHints[zIndexSubArray[reverse ? 0 : length - 1]].z!
    for (let j = reverse ? length - 1 : 0; j !== end; reverse ? j-- : j++) {
      const hint = totalHints[zIndexSubArray[j]]
      const m = hint.m, newI = hint.z
      m.style.zIndex = (hint.z = oldI) as number | string as string;
      toggleClass_s(m, "OH", oldI < max)
      toggleClass_s(m, "SH", oldI >= max)
      oldI = newI!
    }
  }
}

export const initFilterEngine = (hints: readonly FilteredHintItem[]): void => {
  const len = hintChars !== kNumbers ? 0 : hints.length;
  let i = 0, idxOfSecond = 0, lastPage = 0, curPage = 0, curRangeSecond = 0, curRangeCountS1 = 0;
  for (; i < len; i++) {
    const text = hints[i].h.t;
    if (text < kChar.minNotNum && text > "0" && (curPage = +text) && curPage < len && curPage === (curPage | 0)) {
      if (curPage - lastPage < 3 && curPage > lastPage && lastPage) {
        lastPage = curPage;
        idxOfSecond ? 0 : idxOfSecond = i;
        continue;
      }
      lastPage = curPage;
    } else {
      lastPage = 0;
    }
    if (idxOfSecond) {
      if (curRangeCountS1 < i - idxOfSecond) {
        curRangeSecond = idxOfSecond;
        curRangeCountS1 = i - idxOfSecond;
      }
      idxOfSecond = 0;
    }
  }
  if (idxOfSecond && curRangeCountS1 < len - idxOfSecond) {
    curRangeSecond = idxOfSecond;
    curRangeCountS1 = len - idxOfSecond;
  }
  pageNumberHintArray = hints.slice(curRangeSecond - 1, curRangeSecond + curRangeCountS1)
  getMatchingHints(hintKeyStatus, "", "", 0);
}
export const generateHintText = ((hint: Hint, hintInd: number, allItems: readonly HintItem[]): HintText => {
  const el = hint[0], localName = el.localName
  let text = "", show: 0 | 1 | 2 = 0, ind: number;
  if (!("lang" in el)) { // SVG elements or plain `Element` nodes
    // SVG: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text
    // demo: https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfrac on Firefox
    text = textContent_s(el).replace(<RegExpG> /\s{2,}/g, " ")
  } else switch (localName) { // eslint-disable-line curly
  case "input": case "select": case "textarea":
    let labels = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).labels;
    let labelText = labels && labels.length ? (labels[0] as SafeHTMLElement).innerText.trim() : ""
    if (labelText) {
      show = <BOOL> +!contains_s(labels[0] as SafeHTMLElement, el)
    }
    if (localName[0] === "s") {
      const selected = (el as HTMLSelectElement).selectedOptions[0];
      text = selected ? selected.label : "";
    } else {
      if (localName < "s") {
        if ((el as HTMLInputElement).type === "file") {
          text = "Choose File";
        } else if ((el as HTMLInputElement).type === "password") {
          break;
        }
      }
      text = text || (el as HTMLInputElement | HTMLTextAreaElement).value
          || (el as HTMLInputElement | HTMLTextAreaElement).placeholder;
      if (localName > "t" && !dimSize_(el, kDim.positionY)) {
        ind = text.indexOf("\n") + 1;
        ind && (ind = text.indexOf("\n", ind)) > 0 ? text = text.slice(0, ind) : 0;
      }
    }
    text = labelText ? labelText + " " + text : text
    break;
  case "details": text = "Open"; show = 1; break
  case "img":
    text = (el as HTMLImageElement).complete && (el as HTMLImageElement).alt || el.title
    show = 2
    break;
  default:
    if (show = <BOOL> +(hint[2] > ClickType.MaxNotBox)) {
      text = hint[2] > ClickType.frame ? "Scroll" : "Frame";
    } else if (text = el.innerText.trim()) {
      ind = text.indexOf("\n") + 1;
      ind && (ind = text.indexOf("\n", ind)) > 0 ? text = text.slice(0, ind) : 0;
    } else if (localName === "a") {
      let el2 = el.firstElementChild as Element | null;
      text = el2 && hasTag_("img", el2) && !(hintInd + 1 < allItems.length && el2 === allItems[hintInd + 1].d)
          ? generateHintText([el2] as {[0]: Hint[0]} as Hint, hintInd, allItems).t : ""
      show = text ? 2 : 0
    }
    text = text || el.title || (Build.BTypes === BrowserType.Safari as number
            || !(Build.BTypes & ~(BrowserType.Chrome | BrowserType.Safari))
                && Build.MinCVer >= BrowserVer.MinEnsuredAriaProperties ? el.ariaLabel : attr_s(el, ALA))
        || ((text = el.className) && closableClasses_.test(text) ? "Close" : "")
    break;
  }
  if (text) {
    text = text.trim().slice(0, GlobalConsts.MaxLengthOfHintText).trim();
    if (text && text[0] === ":") {
      text = text.replace(<RegExpOne> /^[:\s]+/, "");
    }
  }
  text = show && text && !(
      show > 1 && ++hintInd < allItems.length && allItems[hintInd].h!.t.replace(":", "") === text
    ) ? ":" + text : text
  return { t: text, w: null };
}) as {
  (hint: Hint, hintInd: number, allItems: readonly HintItem[]): HintText
  (hint: [HTMLInputElement]): HintText
}

export const getMatchingHints = (keyStatus: KeyStatus, text: string, seq: string
    , inited: 0 | 1 | 2 | 3): HintItem | 2 | 0 => {
  const oldTextSeq = inited > 1 ? keyStatus.t : "a"
  let hints = keyStatus.c as FilteredHintItem[];
  if (oldTextSeq !== text) {
    const t2 = text.trim(), t1 = oldTextSeq.trim();
    keyStatus.t = text;
    if (t1 !== t2) {
      zIndexes_ = zIndexes_ && null;
      const search = t2.split(" "), hasSearch = !!t2,
      oldKeySeq = keyStatus.k,
      oldHintArray = t2.startsWith(t1) ? hints : allHints as readonly FilteredHintItem[],
      indStep = (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge)
          ? 0 : 1 / (1 + oldHintArray.length)
      let ind = (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge)
          ? 0 : hasSearch ? 1 : GlobalConsts.MaxLengthOfHintText + 1;
      keyStatus.k = "";
      if (hasSearch && !(allHints as readonly FilteredHintItem[])[0].h.w) {
        for (const {h: textHint} of allHints as readonly FilteredHintItem[]) {
          // cache lower-case versions for smaller memory usage
          const words = textHint.w = (textHint.t = Lower(textHint.t)).split(nonMatchedRe_!);
          words[0] || words.shift();
          words.length && (words[words.length - 1] || words.pop());
        }
      }
      hasSearch && (hints = []);
      for (const hint of oldHintArray) {
        if (hasSearch) {
          const s = scoreHint(hint.h, search);
          (hint.i = (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge)
              ? s : s && s + (ind -= indStep)) &&
          hints.push(hint);
        } else {
          hint.i = (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge)
              ? hint.h.t.length + 1
              : (ind -= indStep) - hint.h.t.length;
        }
      }
      const newLen = hints.length;
      if (newLen) {
        if (hasSearch && newLen < 2) { // in case of only 1 hint in fullHints
          if (inited > 2) { keyStatus.t = "" } else { keyStatus.c = hints }
          return hints[0];
        }
        keyStatus.c = hasSearch ? hints : hints = oldHintArray.slice()
        if (!hasSearch
            && (hintOptions.ordinal != null ? hintOptions.ordinal :
                ((OnFirefox || htmlTag_<1>(docEl_unsafe_()!)) && (docEl_unsafe_()! as HTMLElement).dataset.vimiumHints
                || "").includes("ordinal"))) {
          /* empty */
        }
        else if (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge) {
          hints.sort((x1, x2) => x1.i - x2.i);
        } else {
          hints.sort((x1, x2) => x2.i - x1.i);
        }
        if (!hasSearch) {
          for (const item of pageNumberHintArray!) {
            const n = +item.h.t - 1;
            hints[hints.indexOf(item)] = hints[n];
            hints[n] = item;
          }
        }
        for (let base = hintChars.length, is10Digits = hintChars === kNumbers, i = 0; i < hints.length; i++) {
          let hintString = "", num = is10Digits ? 0 : i + 1;
          for (; num; num = (num / base) | 0) {
            hintString = hintChars[num % base] + hintString;
          }
          hints[i].a = is10Digits ? i + 1 + "" : hintString;
        }
      }
      // hints[].zIndex is reset in .MakeStacks_
      if (inited && (newLen || oldKeySeq)) {
      for (const hint of newLen ? hints : oldHintArray) {
        const firstChild = hint.m.firstElementChild
        firstChild && removeEl_s(firstChild);
        (hint.m.firstChild as Text).data = hint.a;
      }
      for (const hint of oldHintArray) {
        setVisibility_s(hint.m, hint.i !== 0)
      }
      }
      if (!newLen) {
        keyStatus.t = oldTextSeq;
        return 2;
      }
    }
  }
  const hintsMatchingSeq = seq ? hints.filter(hint => hint.a.startsWith(seq)) : hints
  const newMatchingSeq = hintsMatchingSeq.length
  let span: HTMLSpanElement
  if (keyStatus.k !== seq) {
    keyStatus.k = seq;
    zIndexes_ = zIndexes_ && null;
    if (newMatchingSeq < 2) { return newMatchingSeq ? hintsMatchingSeq[0] : 0 }
    for (const { m: marker, a: key } of hints) {
      const match = key.startsWith(seq);
      setVisibility_s(marker, match)
      if (match) {
        let child = marker.firstChild!
        if (child.nodeType === kNode.TEXT_NODE) {
          span = createElement_("span")
          if (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend) {
            marker.prepend!(span)
          } else {
            marker.insertBefore(span, child)
          }
          setClassName_s(span, "MC")
        } else {
          span = child;
          child = child.nextSibling as Text;
        }
        span.textContent = seq;
        child.data = key.slice(seq.length);
      }
    }
  }
  inited && (oldTextSeq !== text || isHC_) && setMode(hintMode_)
  hints = hintsMatchingSeq
  const oldActive = activeHint_;
  const newActive = hints[(keyStatus.b < 0 ? (keyStatus.b += newMatchingSeq) : keyStatus.b) % newMatchingSeq]
  if (oldActive !== newActive) {
    if (oldActive) {
      toggleClass_s(oldActive.m, "MH", 0)
      oldActive.m.style.zIndex = "";
    }
    toggleClass_s(newActive.m, "MH", 1)
    newActive.m.style.zIndex = allHints!.length as number | string as string;
    activeHint_ = newActive;
  }
  return 2;
}

/**
 * total / Math.log(~)
 * * `>=` 1 / `Math.log`(1 + (MaxLengthOfHintText = 256)) `>` 0.18
 * * margin `>=` `0.0001267`
 *
 * so, use `~ * 1e4` to ensure delta > 1
 */
const scoreHint = (textHint: HintText, queryWordArray: readonly string[]): number => {
  let hintWordArray = textHint.w!, total = 0;
  if (!hintWordArray.length) { return 0; }
  for (const search of queryWordArray) {
    let max = 0;
    for (const word of hintWordArray) {
      const pos = word.indexOf(search);
      max = pos < 0 ? max : max_(max, pos ? 1 : hintWordArray.length - search.length ? max ? 2 : 6 : max ? 4 : 8)
    }
    if (!max) { return 0; }
    total += max;
  }
  if (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge) {
    return total && math.log(1 + textHint.t.length) / total;
  }
  return total * GlobalConsts.MatchingScoreFactorForHintText / math.log(1 + textHint.t.length);
}

export const renderMarkers = (hintItemArray: readonly HintItem[]): void => {
  const noAppend = OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
      && chromeVer_ < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
  const invisibleHintTextRe = <true | undefined> useFilter_ && createRegExp(kTip.invisibleHintText, "g")
  let right: string
  for (const hint of hintItemArray) {
    const marker = hint.m;
    if (useFilter_) {
      marker.textContent = hint.a;
      right = hint.h!.t;
      if (!right || right[0] !== ":") { continue; }
      right = hint.h!.t = right.slice(1);
      right = right.replace(invisibleHintTextRe!, " ").replace(<RegExpOne> /:[:\s]*$/, "").trim()
      right = right.length > GlobalConsts.MaxLengthOfShownText
          ? right.slice(0, GlobalConsts.MaxLengthOfShownText - 2).trimRight() + "\u2026" // the "\u2026" is wide
          : right;
      if (!right) { continue; }
      toggleClass_s(marker, "TH", 1)
      right = ": " + right;
    } else {
      right = hint.a.slice(-1);
      for (const markerChar of hint.a.slice(0, -1)) {
        const node = createElement_("span")
        node.textContent = markerChar
        if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend) {
          marker.appendChild(node)
      } else {
          marker.append!(node)
        }
      }
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend && noAppend) {
      appendNode_s(marker, new Text(right)) // lgtm [js/superfluous-trailing-arguments]
    } else {
      marker.append!(right);
    }
  }
}

export const initAlphabetEngine = (hintItems: readonly HintItem[]): void => {
  const step = hintChars.length, chars2 = " " + hintChars,
  count = hintItems.length, start = (math.ceil((count - 1) / (step - 1)) | 0) || 1,
  bitStep = math.ceil(OnChrome && Build.MinCVer < BrowserVer.MinEnsured$Math$$log2
        ? math.log(step + 1) / math.LN2 : math.log2(step + 1)) | 0;
  let hints: number[] = [0], next = 1, bitOffset = 0;
  for (let offset = 0, hint = 0; offset < start; ) {
    if (next === offset) { next = next * step + 1, bitOffset += bitStep; }
    hint = hints[offset++];
    for (let ch = 1; ch <= step; ch++) { hints.push((ch << bitOffset) | hint); }
  }
  maxPrefixLen_ = (bitOffset / bitStep - +(next > start)) | 0;
  while (next-- > start) { hints[next] <<= bitStep; }
  hints = hints.slice(start, start + count).sort((i, j) => i - j);
  for (let i = 0, mask = (1 << bitStep) - 1; i < count; i++) {
    let hintString = "", num = hints[i];
    if (!(num & mask)) { num >>= bitStep; }
    for (; num; num >>>= bitStep) { // use ">>>" to prevent potential typos from causing a dead loop
      hintString += chars2[num & mask];
    }
    hintItems[i].a = hintString;
    if (!Build.NDEBUG) {
      if (hintString >= kChar.minNotNum || hintString < "0") {
        (hintItems as any)[hintString.toLowerCase()] = hintItems[i]
      }
    }
}
}

export const matchHintsByKey = (keyStatus: KeyStatus
    , event: HandlerNS.Event, key: string, keybody: kChar): HintItem | 0 | 2 => {
  let doesDetectMatchSingle: 0 | 1 | 2 = 0, isSpace = keybody === SPC, isTab = keybody === kChar.tab
  let {k: sequence, t: textSeq, t: textSeq0, b: oldTab, c: hintArray} = keyStatus
  textSeq = textSeq && textSeq.replace("  ", " ");
  keyStatus.b = isSpace ? oldTab
      : isTab ? useFilter_ ? oldTab - 2 * +(key === "s-" + keybody) + 1 : 1 - oldTab
      : (useFilter_ || oldTab && (sequence = sequence.slice(0, -1)), 0);
  keyStatus.n = 1;
  if (isTab) {
    resetMode()
  }
  else if (keybody === BSP || keybody === DEL || keybody === kChar.f1) {
    if (!sequence && !textSeq) {
      return 0;
    }
    sequence ? sequence = sequence.slice(0, -1) : textSeq = textSeq.slice(0, -1);
  } else if (useFilter_ && keybody === ENTER || isSpace && textSeq0 !== textSeq) {
    // keep .known_ to be 1 - needed by .executeL_
    return activeHint_!;
  } else if (isSpace) { // then useFilter is true
    textSeq = textSeq0 + " ";
  } else if (useFilter_ && (key.includes("c-") || key.includes("m-")) || (event.c + keybody).length - 2) {
    return 2;
  } else {
    let lower = Lower(keybody)
    keybody = useFilter_ ? keybody : lower.toUpperCase() as kChar;
    useFilter_ && resetMode();
    if (hintChars.includes(keybody)
        && !(useFilter_ && key === "a-" + keybody && keybody < kChar.minNotNum && keybody > kChar.maxNotNum)) {
      sequence += keybody;
      doesDetectMatchSingle = useFilter_ || sequence.length < maxPrefixLen_ ? 1 : 2;
    } else if (useFilter_) {
      if (keybody !== lower && hintChars !== Lower(hintChars) // ignore {Lo} in chars_
          /** this line requires lower.length must be 1 or 0 */
          || (nonMatchedRe_ || (nonMatchedRe_ = createRegExp(kTip.notMatchedHintText, "g") as RegExpG & RegExpOne)
              ).test(lower)) {
        return 2;
      } else {
        sequence = "";
        textSeq = textSeq !== " " ? textSeq + lower : lower;
      }
    } else {
      return 0;
    }
  }
  keyStatus.n = 0;
  if (doesDetectMatchSingle > 1) {
    for (const hint of hintArray) { if (hint.a === sequence) { return hint; } }
  }
  if (useFilter_) {
    return getMatchingHints(keyStatus, textSeq, sequence, 2);
  } else {
    zIndexes_ = zIndexes_ && null;
    keyStatus.k = sequence;
    const notDoSubCheck = !keyStatus.b, limit = sequence.length - keyStatus.b,
    fewer = doesDetectMatchSingle > 0,
    wantedPrefix = sequence.slice(0, limit), lastChar = notDoSubCheck ? "" : sequence[limit]
    hintArray = keyStatus.c = (fewer ? hintArray : allHints!).filter(hint => {
      const pass = hint.a.startsWith(wantedPrefix) && (notDoSubCheck || hint.a[limit] !== lastChar);
      pass && fewer || setVisibility_s(hint.m, pass)
      return pass;
    });
    type MarkerElementChild = Exclude<MarkerElement["firstChild"], Text | null>;
    for (const hint of hintArray) {
      const ref = hint.m.childNodes, hintN = hint.i
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/dom_token_list.cc?q=DOMTokenList::setValue&g=0&l=258
// shows that `.classList.add()` costs more
      for (let j = limit > hintN ? hintN : limit, end = limit > hintN ? limit : hintN; j < end; j++) {
        setClassName_s(ref[j] as MarkerElementChild, j < limit ? "MC" : "")
      }
      hint.i = limit
    }
    return hintArray.length ? (isHC_ && setMode(hintMode_), 2) : 0
  }
}
