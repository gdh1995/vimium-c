import {
  CONST_, CurCVer_, curIncognito_, historyCache_, omniPayload_, OnChrome, OnFirefox, searchEngines_, set_curIncognito_
} from "./store"
import { getCurShownTabs_, getCurTabs, getCurWnd, Tabs_ } from "./browser"
import * as BgUtils_ from "./utils"
import * as settings_ from "./settings"
import { decodeFileURL_ } from "./normalize_urls"
import { TabRecency_ } from "./tools"
import { HistoryManager_, normalizeUrlAndTitles_ } from "./browsing_data_manager"
import HistoryItem = CompletersNS.HistoryItem
import Bookmark = CompletersNS.Bookmark

export interface WritableTabEx extends Readonly<Tab> {
  text?: string;
}
export interface TabEx extends WritableTabEx {
  readonly text: string;
}
export declare const enum MatchCacheType {
  kHistory = 1, kBookmarks = 2, kTabs = 3,
}
export declare const enum TabCacheType {
  none = 0, currentWindow = 1, onlyNormal = 2, evenHidden = 4,
}
interface MatchCacheData {
  history_: readonly HistoryItem[] | null;
  bookmarks_: readonly [isPath: boolean, list: readonly Bookmark[]] | null;
}
interface MatchCacheRecord extends MatchCacheData {
  query_: string[];
  showThoseInBlockList_: boolean;
  time_: number;
}
type CachedRegExp = (RegExpOne | RegExpI) & RegExpSearchable<0>
type MatchRange = [number, number]
export declare const enum RankingEnums {
  recCalibrator = 0.666667, // 2 / 3,
  anywhere = 1,
  startOfWord = 1,
  wholeWord = 1,
  maximumScore = 3,
}
export declare const enum TimeEnums {
  timeCalibrator = 1814400000, // 21 days
  futureTimeTolerance = 1.000165, // 1 + 5 * 60 * 1000 / timeCalibrator, // +5min
  futureTimeScore = 0.666446, // (1 - 5 * 60 * 1000 / timeCalibrator) ** 2 * RankingEnums.recCalibrator, // -5min
  bookmarkFakeVisitTime = 1000 * 60 * 5,
  NegativeScoreForFakeBookmarkVisitTime = -futureTimeScore,
}


const emptyScores_ = [0, 0] as const
let tabsInNormal: boolean | null = null
let cachedTabs_: readonly WritableTabEx[] | null = null
let tabType_ = TabCacheType.none
let allRecords_: MatchCacheRecord[] = []
let queryTerms: string[], isForAddressBar: boolean, maxChars: number
let usePlainText: boolean
let timeAgo_ = 0, maxScoreP_ = RankingEnums.maximumScore

export { tabsInNormal, maxScoreP_ }

export const clearTabsInNormal_ = (): void => { tabsInNormal = null }
export const setupQueryTerms = (_newQueryArr: string[], _newForAddressBar: boolean, _newMaxChars: number): void => {
  queryTerms = _newQueryArr
  isForAddressBar = _newForAddressBar
  usePlainText = OnFirefox && isForAddressBar
  maxChars = _newMaxChars
}
export const sync_queryTerms_ = (_newQueryArr: string[]) => { queryTerms = _newQueryArr }
export const sync_timeAgo_ = (_newTimeAgo: number): void => { timeAgo_ = _newTimeAgo }
export const sync_maxScoreP_ = (_newMaxScoreP: number): void => { maxScoreP_ = _newMaxScoreP }

export const MatchCacheManager_ = {
  current_: null as Readonly<MatchCacheData> | null,
  newMatch_: null as MatchCacheRecord | null,
  timer_: 0,
  _tabTimer: 0,
  update_ (showThoseInBlocklist: boolean): void {
    let found: MatchCacheRecord | null = null, now = 0, full_query = queryTerms.join(" ");
    for (let records = allRecords_, ind = full_query ? records.length : 0; 0 <= --ind; ) {
      if (!records[ind].showThoseInBlockList_ && showThoseInBlocklist) { continue; }
      let q1 = records[ind].query_, i1 = 0, i2 = 0;
      for (; i1 < q1.length && i2 < queryTerms.length; i2++) {
        if (queryTerms[i2].includes(q1[i1])) { i1++; }
      }
      if (i1 >= q1.length) {
        found = records[ind];
        break;
      }
    }
    MatchCacheManager_.current_ = found;
    if (found && (omniPayload_.i < 200 || !found.history_ || found.history_.length > 1000)
        && (now = performance.now()) - found.time_ < Math.max(300, omniPayload_.i * 1.3)) {
      MatchCacheManager_.newMatch_ = found;
      found.query_ = queryTerms.slice(0);
    }
    else if (full_query && (!found || full_query !== found.query_.join(" "))
        && (full_query.length > 4 || (<RegExpOne> /\w\S|[^\x00-\x80]/).test(full_query))) {
      MatchCacheManager_.newMatch_ = {
        query_: queryTerms.slice(0), showThoseInBlockList_: showThoseInBlocklist, time_: now || performance.now(),
        history_: found && found.history_, bookmarks_: found && found.bookmarks_
      };
      allRecords_.push(MatchCacheManager_.newMatch_);
      if (!MatchCacheManager_.timer_) {
        MatchCacheManager_.timer_ = setInterval(MatchCacheManager_._didTimeout, GlobalConsts.MatchCacheLifeTime);
      }
    } else {
      MatchCacheManager_.newMatch_ = null;
    }
  },
  _didTimeout (): void {
    let records = allRecords_, ind = -1,
    min_time = performance.now() - (GlobalConsts.MatchCacheLifeTime - 17);
    while (++ind < records.length && records[ind].time_ < min_time) { /* empty */ }
    ind++;
    if (ind < records.length) {
      records.splice(0, ind);
    } else {
      records.length = 0;
      clearInterval(MatchCacheManager_.timer_);
      MatchCacheManager_.timer_ = 0
    }
  },
  clear_ (type: MatchCacheType): void {
    for (const record of allRecords_) {
      type < MatchCacheType.kBookmarks ? record.history_ = null
      : type < MatchCacheType.kTabs ? record.bookmarks_ = null
      : cachedTabs_ = null
    }
  },
  cacheTabs_ (tabs: readonly Tab[] | null): void {
    if (cachedTabs_ === tabs) { return; }
    if (MatchCacheManager_._tabTimer) {
      clearTimeout(MatchCacheManager_._tabTimer);
      MatchCacheManager_._tabTimer = 0
    }
    cachedTabs_ = tabs
    if (tabs) {
      normalizeUrlAndTitles_(tabs)
      MatchCacheManager_._tabTimer = setTimeout(MatchCacheManager_.cacheTabs_, GlobalConsts.TabCacheLifeTime, null);
    }
  }
}

export const SearchKeywords_ = {
  _searchKeywordMaxLength: 0,
  _timer: 0,
  isPrefix_ (): boolean {
    const key = queryTerms[0], arr = searchEngines_.keywords
    if (arr === null) {
      SearchKeywords_._timer = SearchKeywords_._timer || setTimeout(SearchKeywords_._buildSearchKeywords, 67)
      return true
    }
    return key.length >= SearchKeywords_._searchKeywordMaxLength ? false : arr.includes("\n" + key)
  },
  _buildSearchKeywords (): void {
    let arr = BgUtils_.keys_(searchEngines_.map).sort(), max = 0, last = "", dedup: string[] = []
    for (let ind = arr.length; 0 <= --ind; ) {
      const key = arr[ind]
      if (!last.startsWith(key)) {
        let j = key.length
        max = j > max ? j : max
        last = key
        dedup.push(key)
      }
    }
    searchEngines_.keywords = "\n" + dedup.join("\n")
    SearchKeywords_._searchKeywordMaxLength = max;
    SearchKeywords_._timer = 0;
  }
}

export const RegExpCache_ = {
  parts_: null as never as CachedRegExp[],
  starts_: null as never as CachedRegExp[],
  words_: null as never as CachedRegExp[],
  buildParts_ (): void {
    const d: CachedRegExp[] = RegExpCache_.parts_ = [];
    RegExpCache_.starts_ = RegExpCache_.words_ = null as never;
    for (const s of queryTerms) {
      d.push(new RegExp(BgUtils_.escapeAllForRe_(s), /** has lower */ s !== s.toUpperCase()
          && /** no upper */ s.toLowerCase() === s ? "i" as "" : "") as CachedRegExp)
    }
  },
  buildOthers_ (): void {
    const ss: CachedRegExp[] = RegExpCache_.starts_ = [], ws: CachedRegExp[] = RegExpCache_.words_ = [];
    for (const partRe of RegExpCache_.parts_) {
      const start = "\\b" + partRe.source, flags = partRe.flags as "";
      ss.push(new RegExp(start, flags) as CachedRegExp);
      ws.push(new RegExp(start + "\\b", flags) as CachedRegExp);
    }
  },
  fixParts_ (s: string, isShortUrl: boolean): void {
    if (!RegExpCache_.parts_) { return; }
    s = BgUtils_.escapeAllForRe_(isShortUrl ? s : s.slice(0, -1))
    RegExpCache_.parts_[0] = new RegExp(isShortUrl ? s : s + "(?:/|$)", RegExpCache_.parts_[0].flags as ""
      ) as CachedRegExp;
  }
}

export const match2_ = (s1: string, s2: string): boolean => {
  for (let word of RegExpCache_.parts_) {
    if (!(word.test(s1) || word.test(s2))) { return false; }
  }
  return true;
}

export const getWordRelevancy_ = (url: string, title: string): number => {
    let titleCount = 0, titleScore = 0, urlCount = 0, urlScore = 0, useTitle = !!title;
    RegExpCache_.starts_ || RegExpCache_.buildOthers_();
    for (let term = 0, len = queryTerms.length; term < len; term++) {
      let a = scoreTerm_(term, url);
      urlScore += a[0]; urlCount += a[1];
      if (useTitle) {
        a = scoreTerm_(term, title);
        titleScore += a[0]; titleCount += a[1];
      }
    }
    urlScore = urlScore / maxScoreP_ * normalizeDifference_(urlCount, url.length);
    if (titleCount === 0) {
      return title ? urlScore / 2 : urlScore;
    }
    titleScore = titleScore / maxScoreP_ * normalizeDifference_(titleCount, title.length);
    return (urlScore < titleScore) ? titleScore : ((urlScore + titleScore) / 2);
}

const normalizeDifference_ = (a: number, b: number): number => a < b ? a / b : b / a

const scoreTerm_ = (term: number, str: string): readonly [number, number] => {
  let count = 0, score = 0;
  count = str.split(RegExpCache_.parts_[term]).length;
  if (count < 1) { return emptyScores_ }
  score = RankingEnums.anywhere;
  if (RegExpCache_.starts_[term].test(str)) {
    score += RankingEnums.startOfWord;
    if (RegExpCache_.words_[term].test(str)) {
      score += RankingEnums.wholeWord;
    }
  }
  return [score, (count - 1) * queryTerms[term].length];
}

export const ComputeWordRelevancy = (sug: CompletersNS.CoreSuggestion): number => getWordRelevancy_(sug.t, sug.title)

export const ComputeRecency = (lastAccessedTime: number): number => {
  const score = (lastAccessedTime - timeAgo_) / TimeEnums.timeCalibrator
  return score < 0 ? 0 : score < 1 ? score * score * RankingEnums.recCalibrator
      : score < TimeEnums.futureTimeTolerance ? TimeEnums.futureTimeScore : 0
}

export const ComputeRelevancy = (text: string, title: string, lastVisitTime: number): number => {
  const recencyScore = ComputeRecency(lastVisitTime), wordRelevancy = getWordRelevancy_(text, title)
  return recencyScore <= wordRelevancy ? wordRelevancy : (wordRelevancy + recencyScore) / 2
}

export const get2ndArg = (_s: CompletersNS.CoreSuggestion, score: number): number => score

export const prepareHTML_ = (sug: Suggestion): void => {
  if (OnChrome) {
    if (!isForAddressBar && sug.v === undefined) {
      sug.v = calcBestFaviconSource_only_cr_!(sug.u);
    }
  }
  if (sug.textSplit != null) {
    if (sug.t === sug.u) { sug.t = ""; }
    return;
  }
  sug.title = cutTitle(sug.title);
  const text = sug.t
  let str = decodeFileURL_(text, sug.u), range: number[]
  if (str.length !== text.length) {
    range = /*#__NOINLINE__*/ getMatchRangesWithOffset(text, str[0] === "\\" ? 5
        : text.charAt(7) === "/" && text.substr(9, 3).toLowerCase() === "%3a" ? 10 : 8)
  } else {
    str = shortenUrl(text)
    range = getMatchRanges(str)
  }
  sug.t = text.length !== sug.u.length ? str : "";
  sug.textSplit = /*#__NOINLINE__*/ cutUrl(str, range, text.length - str.length
      , isForAddressBar ? maxChars - 13 - Math.min(sug.title.length, 40) : maxChars)
}

export const cutTitle = (title: string, knownRange?: [number, number] | []): string => {
  let cut = title.length > maxChars + 40;
  cut && (title = BgUtils_.unicodeRSubstring_(title, 0, maxChars + 39));
  return highlight(cut ? title + "\u2026" : title, knownRange || getMatchRanges(title))
}

export const highlight = (str: string, ranges: number[]): string => {
  if (usePlainText) {
    return str;
  }
  if (ranges.length === 0) { return BgUtils_.escapeText_(str); }
  let out = "", end = 0;
  for (let _i = 0; _i < ranges.length; _i += 2) {
    const start = ranges[_i], end2 = ranges[_i + 1];
    if (start >= str.length) { continue }
    out += BgUtils_.escapeText_(str.slice(end, start));
    out += "<match>";
    out += BgUtils_.escapeText_(str.slice(start, end2));
    out += "</match>";
    end = end2;
  }
  return out + BgUtils_.escapeText_(str.slice(end));
}

export const shortenUrl = (url: string): string => {
  const i = BgUtils_.IsURLHttp_(url);
  return !i || i >= url.length ? url : url.slice(i, url.length - +(url.endsWith("/") && !url.endsWith("://")));
}

const getMatchRangesWithOffset = (str: string, offset1: number): number[] => {
  const range = getMatchRanges(str)
  for (let i = 0; i < range.length; ) {
    if (range[i + 1] <= offset1) {
      range.splice(i, 2)
    } else {
      range[i] = Math.max(range[i] - offset1, 0)
      range[i + 1] -= offset1
      i += 2
    }
  }
  return range
}

const getMatchRanges = (str: string): number[] => {
  const ranges: MatchRange[] = [];
  for (let i = 0, len = queryTerms.length; i < len; i++) {
    let index = 0, textPosition = 0, matchedEnd: number;
    const splits = str.split(RegExpCache_.parts_[i]), last = splits.length - 1, tl = queryTerms[i].length;
    for (; index < last; index++, textPosition = matchedEnd) {
      matchedEnd = (textPosition += splits[index].length) + tl;
      ranges.push([textPosition, matchedEnd]);
    }
  }
  if (ranges.length === 0) { return ranges as never[]; }
  if (ranges.length === 1) { return ranges[0]; }
  ranges.sort(sortBy0);
  const mergedRanges: number[] = ranges[0];
  for (let i = 1, j = 1, len = ranges.length; j < len; j++) {
    const range = ranges[j];
    if (mergedRanges[i] >= range[0]) {
      if (mergedRanges[i] < range[1]) {
        mergedRanges[i] = range[1];
      }
    } else {
      mergedRanges.push(range[0], range[1]);
      i += 2;
    }
  }
  return mergedRanges;
}

export const sortBy0 = (a: MatchRange, b: MatchRange): number => a[0] - b[0]

// deltaLen may be: 0, 1, 7/8/9
const cutUrl = (str: string, ranges: number[], deltaLen: number, maxLen: number): string => {
  let out = "", end = str.length, cutStart = end, slice = "";
  if (end <= maxLen) { /* empty */ }
  else if (deltaLen > 1) { cutStart = str.indexOf("/") + 1 || end; }
  else if ((cutStart = str.indexOf(":")) < 0) { cutStart = end; }
  else if (BgUtils_.protocolRe_.test(str.slice(0, cutStart + 3).toLowerCase())) {
    cutStart = str.indexOf("/", cutStart + 4) + 1 || end;
  } else {
    cutStart += 22; // for data:text/javascript,var xxx; ...
  }
  if (cutStart < end && ranges.length) {
    for (let i = ranges.length, start = end + 8; (i -= 2) > -4 && start >= cutStart; start = i < 0 ? 0 : ranges[i]) {
      const subEndInLeft = i < 0 ? cutStart : ranges[i + 1], delta = start - 20 - Math.max(subEndInLeft, cutStart);
      if (delta > 0) {
        end -= delta;
        if (end <= maxLen) {
          cutStart = subEndInLeft + (maxLen - end);
          break;
        }
      }
    }
  }
  end = 0;
  for (let i = 0; end < maxLen && i < ranges.length; i += 2) {
    const start = ranges[i], temp = Math.max(end, cutStart), delta = start - 20 - temp;
    if (delta > 0) {
      maxLen += delta;
      slice = BgUtils_.unicodeRSubstring_(str, end, temp + 11);
      out += usePlainText ? slice : BgUtils_.escapeText_(slice)
      out += "\u2026";
      slice = BgUtils_.unicodeLSubstring_(str, start - 8, start);
      out += usePlainText ? slice : BgUtils_.escapeText_(slice)
    } else if (end < start) {
      slice = str.slice(end, start);
      out += usePlainText ? slice : BgUtils_.escapeText_(slice)
    }
    end = ranges[i + 1];
    slice = str.slice(start, end);
    if (usePlainText) {
      out += slice;
      continue;
    }
    out += "<match>";
    out += BgUtils_.escapeText_(slice);
    out += "</match>";
  }
  if (str.length <= maxLen) {
    slice = str.slice(end);
  } else {
    slice = BgUtils_.unicodeRSubstring_(str, end, maxLen - 1 > end ? maxLen - 1 : end + 10);
  }
  return out + (usePlainText ? slice : BgUtils_.escapeText_(slice))
      + (str.length <= maxLen ? "" : "\u2026")
}

export const calcBestFaviconSource_only_cr_ = OnChrome ? (url: string): string => {
  const pos0 = HistoryManager_.sorted_ && url.startsWith("http") ? HistoryManager_.binarySearch_(url) : -1,
  mostHigh = pos0 < 0 ? ~pos0 - 1 : pos0,
  arr = mostHigh < 0 ? [] as never : historyCache_.history_!;
  let slashInd = url.indexOf(":") + 3, low = 0, left = 0, u = "", e = "", m = 0, h = 0;
  for (
      ; low <= mostHigh
        && (slashInd = url[slashInd] === "/" ? slashInd + 1 : url.indexOf("/", slashInd + 1) + (left ? 0 : 1)) > 0
      ; left = slashInd) {
    for (u = url.slice(left, slashInd), h = mostHigh; low <= h; ) {
      m = (low + h) >>> 1;
      e = arr[m].u.slice(left);
      if (e > u) { h = m - 1; }
      else if (e !== u) { low = m + 1; }
      else { return left ? arr[m].u : ""; }
    }
    if (low <= mostHigh && left) {
      u = arr[low].u;
      if (u[slashInd] === "/" && u.length <= ++slashInd) {
        return u;
      }
    }
  }
  return "";
} : 0 as never as null

export const requireNormalOrIncognitoTabs_ = (wantInCurrentWindow: boolean, flags: CompletersNS.QueryFlags
    , func: (this: void, query: CompletersNS.QueryStatus, tabs: readonly WritableTabEx[]) => void
    , query: CompletersNS.QueryStatus, __tabs?: readonly Tab[] | null): 1 | void => {
  let wndIncognito = curIncognito_;
  if (OnChrome && Build.MinCVer < BrowserVer.MinNoAbnormalIncognito && tabsInNormal === null) {
    wndIncognito = wndIncognito !== IncognitoType.mayFalse ? wndIncognito
      : CurCVer_ > BrowserVer.MinNoAbnormalIncognito - 1 || CONST_.DisallowIncognito_
        || cachedTabs_ // ignore this edge case and treat curIncog as .false
      ? (set_curIncognito_(IncognitoType.ensuredFalse)) : IncognitoType.mayFalse
  }
  if (!OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
      || wndIncognito !== IncognitoType.mayFalse || flags & CompletersNS.QueryFlags.IncognitoTabs) {
    tabsInNormal = wndIncognito !== IncognitoType.true && !(flags & CompletersNS.QueryFlags.IncognitoTabs)
    let newType = (tabsInNormal ? TabCacheType.onlyNormal : 0) | (wantInCurrentWindow ? TabCacheType.currentWindow : 0)
    if (OnFirefox) {
      newType = newType | (wantInCurrentWindow && flags & CompletersNS.QueryFlags.EvenHiddenTabs
            ? TabCacheType.evenHidden : 0)
    }
    if (tabType_ !== newType) {
      cachedTabs_ = null, tabType_ = newType
    }
    const tabs = __tabs || cachedTabs_
    MatchCacheManager_.cacheTabs_(tabs)
    if (tabs) {
      func(query, tabs)
    } else {
      const cb = func.bind(null, query)
      !wantInCurrentWindow ? Tabs_.query({}, cb)
      : (flags & CompletersNS.QueryFlags.EvenHiddenTabs ? getCurTabs : getCurShownTabs_)(cb)
    }
  } else {
    getCurWnd(wantInCurrentWindow, (wnd): void => {
      set_curIncognito_(wnd!.incognito ? IncognitoType.true : IncognitoType.ensuredFalse)
      query.o ||
      requireNormalOrIncognitoTabs_(wantInCurrentWindow, flags, func, query, wantInCurrentWindow ? wnd!.tabs : null)
    });
  }
}

TabRecency_.onWndChange_ = (): void => {
  if (cachedTabs_) {
    if (tabType_ & TabCacheType.currentWindow
        || !(tabType_ & TabCacheType.onlyNormal) !== (curIncognito_ === IncognitoType.true)) {
      // ignore IncognitoType.mayFalse on old Chrome - the line below does not harm
      MatchCacheManager_.cacheTabs_(null);
    }
  }
}

void settings_.ready_.then((): void => { settings_.postUpdate_("searchEngines", null) })

if (!Build.NDEBUG) { (globalThis as any).MatchCacheManager = MatchCacheManager_ }
