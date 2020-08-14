import MatchType = CompletersNS.MatchType;
import SugType = CompletersNS.SugType;

interface Performance extends EventTarget {
  timeOrigin?: number;
}

BgUtils_.timeout_(200, function (): void {
type Domain = CompletersNS.Domain;

const enum RankingEnums {
  recCalibrator = 0.666667, // 2 / 3,
  anywhere = 1,
  startOfWord = 1,
  wholeWord = 1,
  maximumScore = 3,
}
const enum TimeEnums {
  timeCalibrator = 1814400000, // 21 days
  futureTimeTolerance = 1.000165, // 1 + 5 * 60 * 1000 / timeCalibrator, // +5min
  futureTimeScore = 0.666446, // (1 - 5 * 60 * 1000 / timeCalibrator) ** 2 * RankingEnums.recCalibrator, // -5min
  bookmarkFakeVisitTime = 1000 * 60 * 5,
  NegativeScoreForFakeBookmarkVisitTime = -futureTimeScore,
}
const enum InnerConsts {
  bookmarkBasicDelay = 1000 * 60, bookmarkFurtherDelay = bookmarkBasicDelay / 2,
  historyMaxSize = 20000,
}

type MatchRange = [number, number];

const enum BookmarkStatus {
  notInited = 0,
  initing = 1,
  inited = 2,
}

interface DecodedItem {
  readonly u: string;
  t: string;
}

interface Bookmark extends DecodedItem {
  readonly id_: string;
  readonly t: string;
  readonly path_: string;
  readonly title_: string;
  readonly visible_: Visibility;
  readonly u: string;
  readonly jsUrl_: string | null;
  readonly jsText_: string | null;
}
interface JSBookmark extends Bookmark {
  readonly jsUrl_: string;
  readonly jsText_: string;
}
interface HistoryItem extends DecodedItem {
  readonly u: string;
  time_: number;
  title_: string;
  visible_: Visibility;
}
interface BrowserUrlItem {
  u: string;
  title_: string | null;
  sessionId_: string | number | null | undefined;
  visit_: number
}
interface UrlDomain {
  domain_: string;
  schema_: Urls.SchemaId;
}
interface WritableTabEx extends Readonly<chrome.tabs.Tab> {
  text?: string;
}
interface TabEx extends WritableTabEx {
  readonly text: string;
}

interface Completer {
  filter_ (query: CompletersNS.QueryStatus, index: number): void;
}
interface CompleterList extends ReadonlyArray<Completer> {
  /** in fact, SugType */ readonly [0]: never;
}

type SuggestionConstructor =
  // pass enough arguments, so that it runs faster
  new (type: CompletersNS.ValidSugTypes, url: string, text: string, title: string,
       computeRelevancy: (this: void, sug: CompletersNS.CoreSuggestion, data: number) => number,
       extraData: number) => Suggestion;

type CachedRegExp = (RegExpOne | RegExpI) & RegExpSearchable<0>;

type HistoryCallback = (this: void, history: ReadonlyArray<Readonly<HistoryItem>>) => void;

type ItemToDecode = string | DecodedItem;

type SearchSuggestion = CompletersNS.SearchSuggestion;

const enum kVisibility {
  // as required in HistoryCache.OnPageVisited_, .visible must be 1
  hidden = 0,
  visible = 1,
  _mask = 2,
}
type Visibility = kVisibility.hidden | kVisibility.visible;

const enum MatchCacheType {
  history = 1, bookmarks = 2, tabs = 3,
}
const enum TabCacheType {
  none = 0, currentWindow = 1, onlyNormal = 2, evenHidden = 4,
}

interface TabCacheData {
  tabs_: readonly WritableTabEx[] | null;
  type_: TabCacheType;
}

interface MatchCacheData {
  history_: readonly HistoryItem[] | null;
  bookmarks_: readonly Bookmark[] | null;
}

interface MatchCacheRecord extends MatchCacheData {
  query_: string[];
  showThoseInBlockList_: boolean;
  time_: number;
}

let matchType: MatchType = MatchType.plain,
    inNormal: boolean | null = null, autoSelect = false, isForAddressBar = false,
    otherFlags = CompletersNS.QueryFlags.None,
    maxChars = 0, maxResults = 0, maxTotal = 0, matchedTotal = 0, offset = 0,
    queryTerms: string[] = [""], rawInput = "", rawQuery = "", rawMore = "",
    wantInCurrentWindow = false,
    historyUrlToSkip = "", bookmarkUrlToSkip = "",
    allExpectedTypes = SugType.Empty,
    omniBlockList: string[] | null = null, showThoseInBlocklist = true;

const Suggestion: SuggestionConstructor = function (
    this: CompletersNS.WritableCoreSuggestion,
    type: CompletersNS.ValidSugTypes, url: string, text: string, title: string,
    computeRelevancy: (this: void, sug: CompletersNS.CoreSuggestion, data: number) => number, extraData: number
    ) {
  this.e = type;
  this.u = url;
  this.t = text;
  this.title = title;
  (this as Suggestion).r = computeRelevancy(this, extraData);
  this.visit = 0
} as any;

function prepareHtml(sug: Suggestion): void {
  if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
    if (!isForAddressBar && !sug.v) {
      sug.v = searchEngine.calcBestFaviconSource_only_cr_!(sug.u);
    }
  }
  if (sug.textSplit != null) {
    if (sug.t === sug.u) { sug.t = ""; }
    return;
  }
  sug.title = cutTitle(sug.title);
  const text = sug.t, str = shortenUrl(text);
  sug.t = text.length !== sug.u.length ? str : "";
  sug.textSplit = /*#__NOINLINE__*/ cutUrl(str, getMatchRanges(str), text.length - str.length
    , isForAddressBar ? maxChars - 13 - Math.min(sug.title.length, 40) : maxChars);
}
function cutTitle(title: string): string {
  let cut = title.length > maxChars + 40;
  cut && (title = BgUtils_.unicodeSubstring_(title, 0, maxChars + 39));
  return highlight(cut ? title + "\u2026" : title, getMatchRanges(title));
}
function highlight(this: void, str: string, ranges: number[]): string {
  if (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
      && isForAddressBar) {
    return str;
  }
  if (ranges.length === 0) { return BgUtils_.escapeText_(str); }
  let out = "", end = 0;
  for (let _i = 0; _i < ranges.length; _i += 2) {
    const start = ranges[_i], end2 = ranges[_i + 1];
    out += BgUtils_.escapeText_(str.slice(end, start));
    out += "<match>";
    out += BgUtils_.escapeText_(str.slice(start, end2));
    out += "</match>";
    end = end2;
  }
  return out + BgUtils_.escapeText_(str.slice(end));
}
function shortenUrl(this: void, url: string): string {
  const i = BgUtils_.IsURLHttp_(url);
  return !i || i >= url.length ? url : url.slice(i, url.length - +(url.endsWith("/") && !url.endsWith("://")));
}
function getMatchRanges(str: string): number[] {
  const ranges: MatchRange[] = [];
  for (let i = 0, len = queryTerms.length; i < len; i++) {
    let index = 0, textPosition = 0, matchedEnd: number;
    const splits = str.split(RegExpCache.parts_[i]), last = splits.length - 1, tl = queryTerms[i].length;
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
function sortBy0(this: void, a: MatchRange, b: MatchRange): number { return a[0] - b[0]; }
// deltaLen may be: 0, 1, 7/8/9
function cutUrl(this: void, str: string, ranges: number[], deltaLen: number, maxLen: number): string {
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
      slice = BgUtils_.unicodeSubstring_(str, end, temp + 11);
      out += Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
          ? slice : BgUtils_.escapeText_(slice);
      out += "\u2026";
      slice = BgUtils_.unicodeLSubstring_(str, start - 8, start);
      out += Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
          ? slice : BgUtils_.escapeText_(slice);
    } else if (end < start) {
      slice = str.slice(end, start);
      out += Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
          ? slice : BgUtils_.escapeText_(slice);
    }
    end = ranges[i + 1];
    slice = str.slice(start, end);
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar) {
      out += slice;
      continue;
    }
    out += "<match>";
    out += BgUtils_.escapeText_(slice);
    out += "</match>";
  }
  if (str.length <= maxLen) {
    slice = str.slice(end);
    return Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
        ? out + slice : out + BgUtils_.escapeText_(slice);
  } else {
    slice = BgUtils_.unicodeSubstring_(str, end, maxLen - 1 > end ? maxLen - 1 : end + 10);
    return out + (Build.BTypes & BrowserType.Firefox
                  && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
                  ? slice : BgUtils_.escapeText_(slice)) +
      "\u2026";
  }
}
function ComputeWordRelevancy(this: void, suggestion: CompletersNS.CoreSuggestion): number {
  return RankingUtils.wordRelevancy_(suggestion.t, suggestion.title);
}
function ComputeRecency(lastAccessedTime: number): number {
  let score = (lastAccessedTime - RankingUtils.timeAgo_) / TimeEnums.timeCalibrator;
  return score < 0 ? 0 : score < 1 ? score * score * RankingEnums.recCalibrator
    : score < TimeEnums.futureTimeTolerance ? TimeEnums.futureTimeScore : 0;
}
function ComputeRelevancy(this: void, text: string, title: string, lastVisitTime: number): number {
  const recencyScore = ComputeRecency(lastVisitTime),
    wordRelevancy = RankingUtils.wordRelevancy_(text, title);
  return recencyScore <= wordRelevancy ? wordRelevancy : (wordRelevancy + recencyScore) / 2;
}
function get2ndArg(_s: CompletersNS.CoreSuggestion, score: number): number { return score; }

const perf = performance,
bookmarkEngine = {
  bookmarks_: [] as Bookmark[],
  dirs_: [] as string[],
  currentSearch_: null as CompletersNS.QueryStatus | null,
  path_: "",
  depth_: 0,
  status_: BookmarkStatus.notInited,
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if (Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox && !chrome.bookmarks) {
      Completers.next_([], SugType.bookmark)
      return
    }
    if (queryTerms.length === 0 || !(allExpectedTypes & SugType.bookmark)) {
      Completers.next_([], SugType.bookmark);
      if (index) { return; }
    } else if (bookmarkEngine.status_ === BookmarkStatus.inited) {
      bookmarkEngine.performSearch_();
    } else {
      bookmarkEngine.currentSearch_ = query;
    }
    if (bookmarkEngine.status_ === BookmarkStatus.notInited) { bookmarkEngine.refresh_(); }
  },
  StartsWithSlash_ (str: string): boolean { return str.charCodeAt(0) === kCharCode.slash; },
  performSearch_ (): void {
    const isPath = queryTerms.some(bookmarkEngine.StartsWithSlash_),
    buildCache = !!MatchCacheManager.newMatch_, newCache = [],
    arr = MatchCacheManager.current_ && MatchCacheManager.current_.bookmarks_ || bookmarkEngine.bookmarks_,
    len = arr.length;
    let results: Array<[number, number]> = [], resultLength: number;
    for (let ind = 0; ind < len; ind++) {
      const i = arr[ind];
      const title = isPath ? i.path_ : i.title_;
      if (!RankingUtils.Match2_(i.t, title)) { continue; }
      if (showThoseInBlocklist || i.visible_) {
        buildCache && newCache.push(i);
        if (bookmarkUrlToSkip && i.u.length < bookmarkUrlToSkip.length + 2
            && bookmarkUrlToSkip === (i.u.endsWith("/") ? i.u.slice(0, -1) : i.u)) {
          continue;
        }
        results.push([-RankingUtils.wordRelevancy_(i.t, i.title_), ind]);
      }
    }
    if (buildCache) {
      MatchCacheManager.newMatch_!.bookmarks_ = newCache;
    }
    resultLength = results.length;
    matchedTotal += resultLength;
    if (!resultLength) {
      allExpectedTypes ^= SugType.bookmark;
    } else {
      results.sort(sortBy0);
      if (offset > 0 && !(allExpectedTypes & (SugType.MultipleCandidates ^ SugType.bookmark))) {
        results = results.slice(offset, offset + maxResults);
        offset = 0;
      } else if (resultLength > offset + maxResults) {
        results.length = offset + maxResults;
      }
    }
    const results2: Suggestion[] = [],
    /** inline of {@link #recencyScore_} */
    fakeTimeScore = !(otherFlags & CompletersNS.QueryFlags.PreferBookmarks) ? 0
        : TimeEnums.NegativeScoreForFakeBookmarkVisitTime;
    for (let [score, ind] of results) {
      const i = arr[ind];
      if (fakeTimeScore) {
        /** inline of {@link #ComputeRelevancy} */
        score = score < fakeTimeScore ? score : (score + fakeTimeScore) / 2;
      }
      const sug = new Suggestion("bookm", i.u, i.t, isPath ? i.path_ : i.title_, get2ndArg, -score);
      const historyIdx = otherFlags & CompletersNS.QueryFlags.ShowTime ? HistoryCache.binarySearch_(i.u) : -1
      sug.visit = historyIdx < 0 ? 0 : HistoryCache.history_![historyIdx].time_
      results2.push(sug);
      if (i.jsUrl_ === null) { continue; }
      (sug as CompletersNS.WritableCoreSuggestion).u = (i as JSBookmark).jsUrl_;
      sug.title = cutTitle(sug.title);
      sug.textSplit = "javascript: \u2026";
      sug.t = (i as JSBookmark).jsText_;
    }
    Completers.next_(results2, SugType.bookmark);
  },
  Listen_: function (): void {
    const bBm = chrome.bookmarks;
    if (Build.BTypes & BrowserType.Edge && !bBm.onCreated) { return; }
    bBm.onCreated.addListener(bookmarkEngine.Delay_);
    bBm.onRemoved.addListener(bookmarkEngine.Expire_);
    bBm.onChanged.addListener(bookmarkEngine.Expire_);
    bBm.onMoved.addListener(bookmarkEngine.Delay_);
    if (!(Build.BTypes & ~BrowserType.Chrome)
        || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome) {
      bBm.onImportBegan.addListener(function (): void {
        chrome.bookmarks.onCreated.removeListener(bookmarkEngine.Delay_);
      });
      bBm.onImportEnded.addListener(function (): void {
        const f = bookmarkEngine.Delay_;
        chrome.bookmarks.onCreated.addListener(f);
        f();
      });
    }
  } as ((this: void) => void) | null,
  refresh_ (): void {
    bookmarkEngine.status_ = BookmarkStatus.initing;
    if (bookmarkEngine._timer) {
      clearTimeout(bookmarkEngine._timer);
      bookmarkEngine._timer = 0;
    }
    chrome.bookmarks.getTree(bookmarkEngine.readTree_);
  },
  readTree_ (this: void, tree: chrome.bookmarks.BookmarkTreeNode[]): void {
    bookmarkEngine.status_ = BookmarkStatus.inited;
    bookmarkEngine.bookmarks_ = [];
    bookmarkEngine.dirs_ = [];
    MatchCacheManager.clear_(MatchCacheType.bookmarks);
    tree.forEach(bookmarkEngine.traverseBookmark_, bookmarkEngine);
    const query = bookmarkEngine.currentSearch_;
    bookmarkEngine.currentSearch_ = null;
    setTimeout(() => Decoder.decodeList_(bookmarkEngine.bookmarks_), 50);
    if (bookmarkEngine.Listen_) {
      setTimeout(bookmarkEngine.Listen_, 0);
      bookmarkEngine.Listen_ = null;
    }
    if (query && !query.o) {
      return bookmarkEngine.performSearch_();
    }
  },
  traverseBookmark_ (bookmark: chrome.bookmarks.BookmarkTreeNode): void {
    const title = bookmark.title, id = bookmark.id, path = bookmarkEngine.path_ + "/" + (title || id);
    if (bookmark.children) {
      bookmarkEngine.dirs_.push(id);
      const oldPath = bookmarkEngine.path_;
      if (2 < ++bookmarkEngine.depth_) {
        bookmarkEngine.path_ = path;
      }
      bookmark.children.forEach(bookmarkEngine.traverseBookmark_, bookmarkEngine);
      --bookmarkEngine.depth_;
      bookmarkEngine.path_ = oldPath;
      return;
    }
    const url = bookmark.url!, jsSchema = "javascript:", isJS = url.startsWith(jsSchema);
    bookmarkEngine.bookmarks_.push({
      id_: id, path_: path, title_: title || id,
      t: isJS ? jsSchema : url,
      visible_: omniBlockList ? BlockListFilter.TestNotMatched_(url, title) : kVisibility.visible,
      u: isJS ? jsSchema : url,
      jsUrl_: isJS ? url : null, jsText_: isJS ? BgUtils_.DecodeURLPart_(url) : null
    });
  },
  _timer: 0,
  _stamp: 0,
  _expiredUrls: false,
  Later_ (this: void): void {
    const last = perf.now() - bookmarkEngine._stamp;
    if (bookmarkEngine.status_ !== BookmarkStatus.notInited) { return; }
    if (last >= InnerConsts.bookmarkBasicDelay || last < -GlobalConsts.ToleranceOfNegativeTimeDelta) {
      bookmarkEngine._timer = bookmarkEngine._stamp = 0;
      bookmarkEngine._expiredUrls = false;
      bookmarkEngine.refresh_();
    } else {
      bookmarkEngine.bookmarks_ = [];
      bookmarkEngine.dirs_ = [];
      bookmarkEngine._timer = setTimeout(bookmarkEngine.Later_, InnerConsts.bookmarkFurtherDelay);
      MatchCacheManager.clear_(MatchCacheType.bookmarks);
    }
  },
  Delay_ (this: void): void {
    bookmarkEngine._stamp = perf.now();
    if (bookmarkEngine.status_ < BookmarkStatus.inited) { return; }
    bookmarkEngine._timer = setTimeout(bookmarkEngine.Later_, InnerConsts.bookmarkBasicDelay);
    bookmarkEngine.status_ = BookmarkStatus.notInited;
  },
  Expire_ (
      this: void, id: string, info?: chrome.bookmarks.BookmarkRemoveInfo | chrome.bookmarks.BookmarkChangeInfo): void {
    const arr = bookmarkEngine.bookmarks_, len = arr.length,
    title = info && (info as chrome.bookmarks.BookmarkChangeInfo).title;
    let i = 0; for (; i < len && arr[i].id_ !== id; i++) { /* empty */ }
    if (i < len) {
      const cur: Bookmark = arr[i], url = cur.u,
      url2 = info && (info as chrome.bookmarks.BookmarkChangeInfo).url;
      type WBookmark = Writable<Bookmark>;
      if (Decoder.enabled_ && (title == null ? url !== cur.t || !info : url2 != null && url !== url2)) {
        url in Decoder.dict_ && HistoryCache.binarySearch_(url) < 0 && delete Decoder.dict_[url];
      }
      if (title != null) {
        (cur as WBookmark).path_ = cur.path_.slice(0, -cur.title_.length) + (title || cur.id_);
        (cur as WBookmark).title_ = title || cur.id_;
        if (url2) {
          (cur as WBookmark).u = url2;
          (cur as WBookmark).t = Decoder.decodeURL_(url2, cur as WBookmark);
          Decoder.continueToWork_();
        }
        if (omniBlockList) {
          (cur as WBookmark).visible_ = BlockListFilter.TestNotMatched_(cur.u, cur.title_);
        }
      } else {
        arr.splice(i, 1);
        info || bookmarkEngine.Delay_(); // may need to re-add it in case of lacking info
      }
      return;
    }
    if (bookmarkEngine.dirs_.indexOf(id) < 0) { return; } // some "new" items which haven't been read are changed
    if (title != null) { /* a folder is renamed */ return bookmarkEngine.Delay_(); }
    // a folder is removed
    if (!bookmarkEngine._expiredUrls && Decoder.enabled_) {
      const dict = Decoder.dict_, bs = HistoryCache.binarySearch_;
      for (const { u: url } of arr) {
        if ((url in dict) && bs(url) < 0) {
          delete dict[url];
        }
      }
      bookmarkEngine._expiredUrls = false;
    }
    return bookmarkEngine.Delay_();
  }
},

historyEngine = {
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox)
        && !chrome.history
        || !(allExpectedTypes & SugType.history)) { return Completers.next_([], SugType.history); }
    const history = HistoryCache.history_, someQuery = queryTerms.length > 0;
    if (history) {
      if (someQuery) {
        return Completers.next_(historyEngine.quickSearch_(history), SugType.history);
      }
      if (HistoryCache.updateCount_ > 10 || HistoryCache.toRefreshCount_ > 0) {
        HistoryCache.refreshInfo_();
      }
    } else {
      const loadAllHistory: Parameters<typeof HistoryCache.use_>[0] = !someQuery ? null : historyList => {
        if (query.o) { return; }
        return Completers.next_(historyEngine.quickSearch_(historyList), SugType.history);
      };
      if (someQuery && (isForAddressBar || HistoryCache.loadingTimer_)) {
        HistoryCache.loadingTimer_ > 0 && clearTimeout(HistoryCache.loadingTimer_);
        HistoryCache.loadingTimer_ = 0;
        HistoryCache.use_(loadAllHistory);
      } else {
        if (!HistoryCache.loadingTimer_) {
          HistoryCache.loadingTimer_ = setTimeout(() => {
            HistoryCache.loadingTimer_ = 0;
            HistoryCache.use_(loadAllHistory);
          }, someQuery ? 200 : 150);
        }
        if (someQuery) {
          const curAll = Completers.suggestions_!, len = curAll.length, someMatches = len > 0;
          Completers.callback_!(someMatches && curAll[0].t === "search" ? [curAll[0]] : []
              , autoSelect && someMatches, MatchType.Default, SugType.Empty, len);
        }
      }
      if (someQuery) { return; }
    }
    autoSelect = false;
    if (index === 0) {
      Completers.requireNormalOrIncognito_(historyEngine.loadTabs_, query);
    } else if (chrome.sessions) {
      chrome.sessions.getRecentlyClosed(historyEngine.loadSessions_.bind(historyEngine, query));
    } else {
      historyEngine.filterFill_([], query, {}, 0, 0);
    }
  },
  quickSearch_ (history: ReadonlyArray<Readonly<HistoryItem>>): Suggestion[] {
    const onlyUseTime = queryTerms.length === 1 && (queryTerms[0][0] === "."
      ? (<RegExpOne> /^\.\w+$/).test(queryTerms[0])
      : (BgUtils_.convertToUrl_(queryTerms[0], null, Urls.WorkType.KeepAll),
        BgUtils_.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl)
    ),
    noOldCache = !(MatchCacheManager.current_ && MatchCacheManager.current_.history_),
    buildCache = !!MatchCacheManager.newMatch_, newCache = [],
    results = [-1.1, -1.1], sugs: Suggestion[] = [], Match2 = RankingUtils.Match2_,
    parts0 = RegExpCache.parts_[0];
    let maxNum = maxResults + offset
      , curMinScore = -1.1, i = 0, j = 0, matched = 0;
    historyUrlToSkip && maxNum++;
    for (j = maxNum; --j; ) { results.push(-1.1, -1.1); }
    maxNum = maxNum * 2 - 2;
    if (!noOldCache) {
      history = MatchCacheManager.current_!.history_!;
    }
    for (const len = history.length; i < len; i++) {
      const item = history[i];
      if (onlyUseTime ? !parts0.test(item.t) : !Match2(item.t, item.title_)) { continue; }
      if (!(showThoseInBlocklist || item.visible_)) { continue; }
      buildCache && newCache.push(item);
      matched++;
      const score = onlyUseTime ? ComputeRecency(item.time_) || /* < 0.0002 */ 1e-16 * item.time_
          : ComputeRelevancy(item.t, item.title_, item.time_);
      if (curMinScore >= score) { continue; }
      for (j = maxNum - 2; 0 <= j && results[j] < score; j -= 2) {
        results[j + 2] = results[j], results[j + 3] = results[j + 1];
      }
      results[j + 2] = score;
      results[j + 3] = i;
      curMinScore = results[maxNum];
    }
    if (buildCache) {
      MatchCacheManager.newMatch_!.history_ = newCache;
    }
    matchedTotal += matched;
    if (!matched) {
      allExpectedTypes ^= SugType.history;
    }
    if (!(allExpectedTypes & (SugType.MultipleCandidates ^ SugType.history))) {
      i = offset * 2;
      offset = 0;
    } else {
      i = 0;
    }
    for (; i <= maxNum; i += 2) {
      const score = results[i];
      if (score <= 0) { break; }
      const item = history[results[i + 1]];
      if (item.u !== historyUrlToSkip) {
        const sug = new Suggestion("history", item.u, item.t, item.title_, get2ndArg, score)
        sug.visit = item.time_
        sugs.push(sug)
      } else {
        maxNum--;
      }
    }
    Decoder.continueToWork_();
    return sugs;
  },
  loadTabs_ (this: void, query: CompletersNS.QueryStatus, tabs: readonly WritableTabEx[]): void {
    MatchCacheManager.cacheTabs_(tabs);
    if (query.o) { return; }
    const arr: SafeDict<number> = BgUtils_.safeObj_();
    let count = 0;
    for (const tab of tabs) {
      if (tab.incognito && inNormal) { continue; }
      let url = Build.BTypes & BrowserType.Chrome ? tab.url || tab.pendingUrl : tab.url;
      if (url in arr) { continue; }
      arr[url] = 1; count++;
    }
    return historyEngine.filterFill_([], query, arr, offset, count);
  },
  loadSessions_ (query: CompletersNS.QueryStatus, sessions: chrome.sessions.Session[]): void {
    if (query.o) { return; }
    const historyArr: BrowserUrlItem[] = [], arr: Dict<number> = {};
    let i = -offset;
    return sessions.some(function (item): boolean {
      const entry = item.tab as chrome.sessions.Session["tab"] & BrowserUrlItem
      if (!entry) { return false; }
      let url = entry.url, key: string, t: number;
      if (url.length > GlobalConsts.MaxHistoryURLLength) {
        entry.url = url = HistoryCache.trimURLAndTitleWhenTooLong_(url, entry);
      }
      if (!showThoseInBlocklist && !BlockListFilter.TestNotMatched_(url, entry.title)) { return false; }
      key = url + "\n" + entry.title;
      if (key in arr) { return false; }
      arr[key] = 1; arr[url] = 1;
      ++i > 0 && historyArr.push({
        u: entry.url, title_: entry.title,
        visit_: !(Build.BTypes & ~BrowserType.Firefox) ? item.lastModified
            : (t = item.lastModified, t < /* as ms: 1979-07 */ 3e11 && t > /* as ms: 1968-09 */ -4e10 ? t * 1000 : t),
        sessionId_: entry.sessionId
      });
      return historyArr.length >= maxResults;
    }) ? historyEngine.filterFinish_(historyArr) : historyEngine.filterFill_(historyArr, query, arr, -i, 0);
  },
  filterFill_ (historyArr: BrowserUrlItem[], query: CompletersNS.QueryStatus, arr: Dict<number>,
      cut: number, neededMore: number): void {
    chrome.history.search({
      text: "",
      maxResults: offset + maxResults * (showThoseInBlocklist ? 1 : 2) + neededMore
    }, function (rawArr2: chrome.history.HistoryItem[]): void {
      if (query.o) { return; }
      rawArr2 = rawArr2.filter(function (this: Dict<number>, i): boolean {
        let url = i.url;
        if (url.length > GlobalConsts.MaxHistoryURLLength) {
          i.url = url = HistoryCache.trimURLAndTitleWhenTooLong_(url, i);
        }
        return !(url in this)
            && (showThoseInBlocklist || BlockListFilter.TestNotMatched_(i.url, i.title || "") !== kVisibility.hidden)
      }, arr);
      if (cut < 0) {
        rawArr2.length = Math.min(rawArr2.length, maxResults - historyArr.length)
      } else if (cut > 0) {
        rawArr2 = rawArr2.slice(cut, cut + maxResults)
      }
      let historyArr2 = rawArr2.map((i): BrowserUrlItem => ({
          u: i.url, title_: i.title, visit_: i.lastVisitTime, sessionId_: null
      }))
      if (cut < 0) {
        historyArr2 = historyArr.concat(historyArr2);
      }
      historyEngine.filterFinish_(historyArr2);
    });
  },
  filterFinish_: function (historyArr: Array<BrowserUrlItem | Suggestion>): void {
    (historyArr as BrowserUrlItem[]).forEach(historyEngine.MakeSuggestion_);
    offset = 0;
    Decoder.continueToWork_();
    Completers.next_(historyArr as Suggestion[], SugType.history);
  } as (historyArr: BrowserUrlItem[]) => void,
  MakeSuggestion_ (e: BrowserUrlItem, i: number, arr: Array<BrowserUrlItem | Suggestion>): void {
    const u = e.u, o = new Suggestion("history", u, Decoder.decodeURL_(u, u), e.title_ || "",
      get2ndArg, (99 - i) / 100),
    sessionId = e.sessionId_
    o.visit = e.visit_
    sessionId && (o.s = sessionId, o.label = "&#8617;");
    arr[i] = o;
  }
},

domainEngine = {
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if (queryTerms.length !== 1
        || !(allExpectedTypes & SugType.domain)
        || queryTerms[0].lastIndexOf("/", queryTerms[0].length - 2) >= 0) {
      return Completers.next_([], SugType.domain);
    }
    if (HistoryCache.domains_) { /* empty */ }
    else if (HistoryCache.history_) {
      domainEngine.refresh_(HistoryCache.history_);
    } else {
      return index > 0 ? Completers.next_([], SugType.domain) : HistoryCache.use_(function (): void {
        if (query.o) { return; }
        return domainEngine.filter_(query, 0);
      });
    }
    return domainEngine.performSearch_();
  } ,
  performSearch_ (): void {
    const ref = BgUtils_.domains_, p = RankingUtils.maxScoreP_,
    word = queryTerms[0].replace("/", "").toLowerCase();
    let sug: Suggestion | undefined, result = "", matchedDomain: Domain | undefined, result_score = -1.1;
    RankingUtils.maxScoreP_ = RankingEnums.maximumScore;
    for (const domain in ref) {
      if (!domain.includes(word)) { continue; }
      matchedDomain = ref[domain]!;
      if (showThoseInBlocklist || matchedDomain.count_ > 0) {
        const score = ComputeRelevancy(domain, "", matchedDomain.time_);
        if (score > result_score) { result_score = score; result = domain; }
      }
    }
    let isMainPart = result.length === word.length;
    if (result && !isMainPart) {
      if (!result.startsWith("www.") && !result.startsWith(word)) {
        let r2 = result.slice(result.indexOf(".") + 1);
        if (r2.includes(word)) {
          let d2: Domain | undefined;
          r2 = "www." + r2;
          if ((d2 = ref[r2]) && (showThoseInBlocklist || d2.count_ > 0)) { result = r2; matchedDomain = d2; }
        }
      }
      let mainLen = result.startsWith(word) ? 0 : result.startsWith("www." + word) ? 4 : -1;
      if (mainLen >= 0) {
        const [arr, partsNum] = BgUtils_.splitByPublicSuffix_(result), i = arr.length - 1;
        if (partsNum > 1) {
          mainLen = result.length - mainLen - word.length - arr[i].length - 1;
          if (!mainLen || partsNum === 3 && mainLen === arr[i - 1].length + 1) {
            isMainPart = true;
          }
        }
      }
    }
    if (result) {
      matchedTotal++;
      let useHttps = matchedDomain!.https_ > 0, title = ""
      if (bookmarkEngine.status_ === BookmarkStatus.inited) {
        const re: RegExpOne = new RegExp(`^https?://${result.replace(escapeAllRe, "\\$&")}/?$`)
        let matchedBookmarks = bookmarkEngine.bookmarks_.filter(
            item => re.test(item.u) && (showThoseInBlocklist || item.visible_))
        if (matchedBookmarks.length > 0) {
          const matched2 = matchedBookmarks.filter(i => i.u[4] === "s")
          useHttps = matched2.length > 0
          matchedBookmarks = useHttps ? matched2 : matchedBookmarks
          const matchedUrl = matchedBookmarks[0].u
          bookmarkUrlToSkip = matchedUrl.endsWith("/") ? matchedUrl.slice(0, -1) : matchedUrl
          title = matchedBookmarks[0].title_
        }
      }
      const url = historyUrlToSkip = (useHttps ? "https://" : "http://") + result + "/"
      if (offset > 0) {
        offset--;
      } else {
        autoSelect = isMainPart || autoSelect;
        sug = new Suggestion("domain", url, word === queryTerms[0] ? result : result + "/", "",
            get2ndArg, 2);
        const ind = HistoryCache.sorted_ ? HistoryCache.binarySearch_(url) : -1,
        item = ind > 0 ? HistoryCache.history_![ind] : null;
        prepareHtml(sug);
        if (item && (showThoseInBlocklist || item.visible_)) {
          sug.visit = item.time_
          title = title || item.title_
        }
        sug.title = Build.BTypes & BrowserType.Firefox
            && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
            ? title : BgUtils_.escapeText_(title)
        --maxResults;
      }
    }
    RankingUtils.maxScoreP_ = p;
    Completers.next_(sug ? [sug] : [], SugType.domain);
  },
  refresh_ (history: HistoryItem[]): void {
    domainEngine.refresh_ = null as never;
    const parse = domainEngine.ParseDomainAndScheme_, d = HistoryCache.domains_ = BgUtils_.domains_;
    for (const { u: url, time_: time, visible_: visible } of history) {
      const item = parse(url);
      if (!item) { continue; }
      const {domain_: domain, schema_: schema} = item, slot = d[domain];
      if (slot) {
        if (slot.time_ < time) { slot.time_ = time; }
        slot.count_ += visible;
        if (schema >= Urls.SchemaId.HTTP) { slot.https_ = schema === Urls.SchemaId.HTTPS ? 1 : 0; }
      } else {
        d[domain] = {time_: time, count_: visible, https_: schema === Urls.SchemaId.HTTPS ? 1 : 0};
      }
    }
  },
  ParseDomainAndScheme_ (this: void, url: string): UrlDomain | null {
    let n = url.lastIndexOf(":", 5), schema = n > 0 ? url.slice(0, n) : "", d: Urls.SchemaId, i: number;
    if (schema === "http") { d = Urls.SchemaId.HTTP; }
    else if (schema === "https") { d = Urls.SchemaId.HTTPS; }
    else if (schema === "ftp") { d = Urls.SchemaId.FTP; }
    else { return null; }
    i = url.indexOf("/", d);
    url = url.slice(d, i < 0 ? url.length : i);
    return { domain_: url !== "__proto__" ? url : ".__proto__", schema_: d };
  }
},

tabEngine = {
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if (!(allExpectedTypes & SugType.tab)
        || index && (!queryTerms.length || otherFlags & CompletersNS.QueryFlags.NoTabEngine)) {
      Completers.next_([], SugType.tab);
    } else {
      Completers.requireNormalOrIncognito_(tabEngine.performSearch_, query);
    }
  },
  performSearch_ (this: void, query: CompletersNS.QueryStatus, tabs0: readonly WritableTabEx[]): void {
    MatchCacheManager.cacheTabs_(tabs0);
    if (query.o) { return; }
    const curTabId = TabRecency_.curTab_, noFilter = queryTerms.length <= 0,
    hasOtherSuggestions = allExpectedTypes & (SugType.MultipleCandidates ^ SugType.tab),
    treeMode = !!(otherFlags & CompletersNS.QueryFlags.TabTree) && wantInCurrentWindow && noFilter && !isForAddressBar;
    let suggestions: CompletersNS.TabSuggestion[] = [];
    if (treeMode && !(otherFlags & CompletersNS.QueryFlags.TabTreeFromStart)
        && tabs0.length > offset && tabs0.length > maxTotal) {
      const treeMap: SafeDict<Tab> = BgUtils_.safeObj_<Tab>();
      for (const tab of tabs0) { treeMap[tab.id] = tab; }
      {
        Build.BTypes & BrowserType.Firefox && BgUtils_.overrideTabsIndexes_ff_!(tabs0)
        let curTab = treeMap[curTabId], pId = curTab ? curTab.openerTabId : 0, pTab = pId ? treeMap[pId] : null,
        start = pTab ? pTab.index : curTab ? curTab.index - 1 : 0, i = pTab ? 0 : (maxTotal / 2) | 0;
        for (; 1 < --i && start > 0 && tabs0[start - 1].openerTabId === pId; start--) { /* empty */ }
        tabs0 = start > 0 ? tabs0.slice(start).concat(tabs0.slice(0, start)) : tabs0;
      }
    }
    const tabs: TabEx[] = [], wndIds: number[] = [];
    for (const tab of tabs0) {
      if (!wantInCurrentWindow && inNormal && tab.incognito) { continue; }
      const url = Build.BTypes & BrowserType.Chrome ? tab.url || tab.pendingUrl : tab.url
      const text = tab.text || (tab.text = Decoder.decodeURL_(url, tab.incognito ? "" : url))
      if (noFilter || RankingUtils.Match2_(text, tab.title)) {
        const wndId = tab.windowId;
        !wantInCurrentWindow && wndIds.lastIndexOf(wndId) < 0 && wndIds.push(wndId);
        tabs.push(tab as TabEx);
      }
    }
    if (hasOtherSuggestions && tabs.length === 1 && tabs[0].id === TabRecency_.curTab_) {
      tabs.length = 0 // here `hasOtherSuggestions` is enough
    }
    const matched = tabs.length;
    matchedTotal += matched;
    if (!matched) {
      allExpectedTypes ^= SugType.tab;
    }
    if (offset >= matched && !hasOtherSuggestions) {
      offset = 0;
      return Completers.next_(suggestions, SugType.tab);
    }

    wndIds.sort(tabEngine.SortNumbers_);
    const c = noFilter ? treeMode ? tabEngine.computeIndex_ : tabEngine.computeRecency_ : ComputeWordRelevancy,
    treeLevels: SafeDict<number> = treeMode ? BgUtils_.safeObj_() : null as never,
    curWndId = wndIds.length > 1 ? TabRecency_.curWnd_ : 0;
    if (treeMode) {
      for (const tab of tabs) { // only from start to end, and should not execute nested queries
        const pid = tab.openerTabId, pLevel = pid && treeLevels[pid];
        treeLevels[tab.id] = pLevel
            ? pLevel < GlobalConsts.MaxTabTreeIndent ? pLevel + 1 : GlobalConsts.MaxTabTreeIndent : 1;
      }
    }
    const timeOffset = !(otherFlags & CompletersNS.QueryFlags.ShowTime) ? 0 : Settings_.payload_.o === kOS.unixLike ? 0
        : Build.MinCVer < BrowserVer.Min$performance$$timeOrigin && Build.BTypes & BrowserType.Chrome
          && CurCVer_ < BrowserVer.Min$performance$$timeOrigin
        ? Date.now() - performance.now() : performance.timeOrigin!
    for (let ind = 0; ind < tabs.length; ) {
      const tab = tabs[ind++]
      const tabId = tab.id, level = treeMode ? treeLevels[tabId]! : 1,
      url = Build.BTypes & BrowserType.Chrome ? tab.url || tab.pendingUrl : tab.url,
      visit = TabRecency_.tabs_[tabId],
      suggestion = new Suggestion("tab", url, tab.text, tab.title,
          c, treeMode ? ind : tabId) as CompletersNS.TabSuggestion;
      let id = curWndId && tab.windowId !== curWndId ? `${wndIds.indexOf(tab.windowId) + 1}:` : "", label = ""
      id += <string> <string | number> ind
      if (curTabId === tabId) {
        treeMode || (suggestion.r = noFilter ? 1<<31 : 0);
        id = `(${id})`
      } else if (!visit) {
        id = `**${id}**`
      }
      if (!inNormal && tab.incognito) { label += "*" }
      if (tab.discarded || Build.BTypes & BrowserType.Firefox && tab.hidden) { label += "~" }
      suggestion.visit = visit ? visit.t + timeOffset : 0
      suggestion.s = tabId;
      suggestion.label = `#${id}${label && " " + label}`
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        suggestion.favIcon = tab.favIconUrl;
      }
      if (level > 1) {
        suggestion.level = " level-" + level;
      }
      suggestions.push(suggestion);
    }
    suggestions.sort(Completers.rSortByRelevancy_);
    let resultLength = suggestions.length, exceed = offset + maxResults - resultLength;
    if (hasOtherSuggestions || exceed < 0 || !noFilter) {
      if (offset > 0 && !hasOtherSuggestions) {
        suggestions = suggestions.slice(offset, offset + maxResults);
        resultLength = maxResults;
        offset = 0;
      } else if (resultLength > offset + maxResults) {
        suggestions.length = resultLength = offset + maxResults;
      }
      for (let i = hasOtherSuggestions ? 0 : resultLength; i < resultLength; i++) {
        suggestions[i].r *= 8 / (i / 4 + 1);
      }
    } else if (offset > 0) {
      const exceededArr = suggestions.slice(0, exceed);
      for (let sug of exceededArr) {
        sug.label += "[r]"
      }
      suggestions = suggestions.slice(offset).concat(exceededArr);
      resultLength = suggestions.length;
      for (let i = 0; i < resultLength; i++) {
        suggestions[i].r = resultLength - i;
      }
      offset = 0;
    }
    Decoder.continueToWork_();
    Completers.next_(suggestions, SugType.tab);
  },
  SortNumbers_ (this: void, a: number, b: number): number { return a - b; },
  computeRecency_ (_0: CompletersNS.CoreSuggestion, tabId: number): number {
    const n = TabRecency_.tabs_[tabId]
    return n ? n.i :
        (otherFlags & CompletersNS.QueryFlags.PreferNewOpened ? GlobalConsts.MaxTabRecency + tabId : -tabId);
  },
  computeIndex_ (_0: CompletersNS.CoreSuggestion, index: number): number {
    return 1 / index;
  }
},

searchEngine = {
  _nestedEvalCounter: 0,
  filter_: BgUtils_.blank_,
  preFilter_: function (query: CompletersNS.QueryStatus, failIfNull?: true): void | true | Promise<void> {
    if (!(allExpectedTypes & SugType.search)) {
      return Completers.next_([], SugType.search);
    }
    let sug: SearchSuggestion, q = queryTerms, keyword = q.length > 0 ? q[0] : "",
       pattern: Search.Engine | null | undefined;
    if (q.length === 0) { /* empty */ }
    else if (failIfNull !== true && keyword[0] === "\\" && keyword[1] !== "\\") {
      if (keyword.length > 1) {
        q[0] = keyword.slice(1);
      } else {
        q.shift();
      }
      keyword = rawQuery.slice(1).trimLeft();
      sug = searchEngine.makeUrlSuggestion_(keyword);
      showThoseInBlocklist = !omniBlockList || showThoseInBlocklist && BlockListFilter.IsExpectingHidden_([keyword]);
      return Completers.next_([sug], SugType.search);
    } else {
      pattern = Settings_.cache_.searchEngineMap[keyword];
    }
    if (failIfNull === true) {
      if (!pattern) { return true; }
    } else if (!pattern && !keyword.startsWith("vimium://")) {
      if (matchType === MatchType.plain && q.length <= 1) {
        matchType = q.length ? searchEngine.calcNextMatchType_() : MatchType.reset;
      }
      return Completers.next_([], SugType.search);
    } else {
      if (pattern && rawMore) { q.push(rawMore); offset = 0; }
      q.length > 1 ? 0 : (matchType = MatchType.reset);
    }
    if (q.length > 1 && pattern) {
      q.shift();
      if (rawQuery.length > Consts.MaxCharsInQuery) {
        q = rawQuery.split(" ");
        q.shift();
      }
    } else if (pattern) {
      q = [];
    }
    showThoseInBlocklist = !omniBlockList || showThoseInBlocklist && BlockListFilter.IsExpectingHidden_([keyword]);

    let url: string, indexes: number[], text: string;
    if (pattern) {
      let res = BgUtils_.createSearch_(q, pattern.url_, pattern.blank_, []);
      text = url = res.url_; indexes = res.indexes_;
    } else {
      text = url = q.join(" "); indexes = [];
    }
    if (keyword === "~") { /* empty */ }
    else if (url.startsWith("vimium://")) {
      const ret = BgUtils_.evalVimiumUrl_(url.slice(9), Urls.WorkType.ActIfNoSideEffects, true);
      const getSug = searchEngine.plainResult_.bind(searchEngine, q, url, text, pattern, indexes);
      if (ret instanceof Promise) {
        return ret.then<void>(searchEngine.onEvalUrl_.bind(searchEngine, query, getSug));
      } else if (ret instanceof Array) {
        return searchEngine.onEvalUrl_(query, getSug, ret);
      } else if (ret) {
        url = text = ret; indexes = [];
      }
    } else {
      url = BgUtils_.convertToUrl_(url, null, Urls.WorkType.KeepAll);
    }
    sug = searchEngine.plainResult_(q, url, text, pattern, indexes);
    return Completers.next_([sug], SugType.search);
  } as {
    (query: CompletersNS.QueryStatus, failIfNull: true): void | true | Promise<void>;
    (query: CompletersNS.QueryStatus): void | Promise<void>;
  },
  onEvalUrl_ (query: CompletersNS.QueryStatus
      , getSug: (this: void) => SearchSuggestion, ret: Urls.BaseEvalResult): void | Promise<void> {
    let sugs: Suggestion[] | undefined;
    if (query.o) { return; }
    switch (ret[1]) {
    case Urls.kEval.paste:
    case Urls.kEval.plainUrl:
          let pasted = (ret as Urls.BasePlainEvalResult<Urls.kEval.plainUrl> | Urls.PasteEvalResult)[0];
          matchType = ret[1] === Urls.kEval.plainUrl && queryTerms.length > 1 ? matchType : MatchType.reset;
          if (!pasted) {
            break;
          }
          rawQuery = "\\ " + pasted;
          rawMore = "";
          queryTerms = (rawQuery.length < Consts.MaxCharsInQuery + 1 ? rawQuery
              : BgUtils_.unicodeSubstring_(rawQuery, 0, Consts.MaxCharsInQuery).trim()).split(" ");
          if (queryTerms.length > 1) {
            queryTerms[1] = BgUtils_.fixCharsInUrl_(queryTerms[1]);
          }
          return searchEngine.preFilter_(query);
    case Urls.kEval.search:
          const newQuery = (ret as Urls.SearchEvalResult)[0];
          queryTerms = newQuery.length > 1 || newQuery.length === 1 && newQuery[0] ? newQuery : queryTerms;
          const counter = searchEngine._nestedEvalCounter++;
          if (counter > 12) { break; }
          const subVal = searchEngine.preFilter_(query, true);
          if (counter <= 0) { searchEngine._nestedEvalCounter = 0; }
          if (subVal !== true) { return subVal; }
          break;
    case Urls.kEval.math:
          if (ret[0]) {
            sugs = searchEngine.mathResult_(getSug(), ret as Urls.MathEvalResult);
          }
          // no break;
    // no default:
    }
    Completers.next_(sugs || [getSug()], SugType.search);
  },
  plainResult_ (q: string[], url: string, text: string
      , pattern: Search.Engine | null | undefined, indexes: number[]): SearchSuggestion {
    const sug = new Suggestion("search", url, text
      , (pattern ? pattern.name_ + ": " : "") + q.join(" "), get2ndArg, 9) as SearchSuggestion;

    if (q.length > 0 && pattern) {
      sug.t = searchEngine.makeText_(text, indexes);
      sug.title = highlight(sug.title, [pattern.name_.length + 2, sug.title.length]);
      sug.textSplit = highlight(sug.t, indexes);
    } else {
      sug.t = BgUtils_.DecodeURLPart_(shortenUrl(text));
      if (!(Build.BTypes & BrowserType.Firefox
            && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar)) {
        sug.title = BgUtils_.escapeText_(sug.title);
      }
      sug.textSplit = Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
          ? sug.t : BgUtils_.escapeText_(sug.t);
    }
    if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
        && !isForAddressBar) {
      sug.v = pattern && pattern.blank_ || searchEngine.calcBestFaviconSource_only_cr_!(url);
    }
    if (Build.BTypes & BrowserType.Chrome || isForAddressBar) {
      sug.p = pattern ? pattern.name_ : "";
    }
    return sug;
  },
  mathResult_ (stdSug: SearchSuggestion, arr: Urls.MathEvalResult): [SearchSuggestion, Suggestion] {
    const result = arr[0];
    const sug = new Suggestion("math", "vimium://copy " + result, result, result, get2ndArg, 9);
    --sug.r;
    if (!(Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar)) {
      sug.title = `<match style="text-decoration: none;">${BgUtils_.escapeText_(sug.title)}<match>`;
    }
    sug.textSplit = Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
        ? arr[2] : BgUtils_.escapeText_(arr[2]);
    return [stdSug, sug];
  },
  calcBestFaviconSource_only_cr_: Build.BTypes & BrowserType.Chrome
      && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome) ? (url: string): string => {
    const pos0 = HistoryCache.sorted_ && url.startsWith("http") ? HistoryCache.binarySearch_(url) : -1,
    mostHigh = pos0 < 0 ? ~pos0 - 1 : pos0,
    arr = mostHigh < 0 ? [] as never : HistoryCache.history_!;
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
  } : 0 as never as null,
  searchKeywordMaxLength_: 0,
  timer_: 0,
  calcNextMatchType_ (): MatchType {
    const key = queryTerms[0], arr = Settings_.cache_.searchKeywords;
    if (arr == null) {
      searchEngine.timer_ = searchEngine.timer_ || setTimeout(searchEngine.BuildSearchKeywords_, 67);
      return MatchType.searching_;
    }
    if (key.length >= searchEngine.searchKeywordMaxLength_) { return MatchType.plain; }
    return arr.includes("\n" + key) ? MatchType.searching_ : MatchType.plain;
  },
  makeText_ (url: string, arr: number[]): string {
    let len = arr.length, i: number, str: string, ind: number;
    str = BgUtils_.DecodeURLPart_(arr.length > 0 ? url.slice(0, arr[0]) : url);
    if (i = BgUtils_.IsURLHttp_(str)) {
      str = str.slice(i);
      i = 0;
    }
    if (arr.length <= 0) { return str; }
    ind = arr[0];
    while (arr[i] = str.length, len > ++i) {
      str += BgUtils_.DecodeURLPart_(url.slice(ind, arr[i]));
      ind = arr[i];
    }
    if (ind < url.length) {
      str += BgUtils_.DecodeURLPart_(url.slice(ind));
    }
    return str;
  },
  makeUrlSuggestion_ (keyword: string): SearchSuggestion {
    const url = BgUtils_.convertToUrl_(keyword, null, Urls.WorkType.KeepAll),
    isSearch = BgUtils_.lastUrlType_ === Urls.Type.Search,
    sug = new Suggestion("search", url, BgUtils_.DecodeURLPart_(shortenUrl(url))
      , "", get2ndArg, 9) as SearchSuggestion;
    sug.title = isSearch ? "~: " + highlight(keyword, [0, keyword.length])
        : Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
        ? keyword : BgUtils_.escapeText_(keyword);
    sug.textSplit = Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) && isForAddressBar
        ? sug.t : BgUtils_.escapeText_(sug.t);
    if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
        && !isForAddressBar) {
      sug.v = searchEngine.calcBestFaviconSource_only_cr_!(url);
    }
    if (Build.BTypes & BrowserType.Chrome || isForAddressBar) {
      sug.p = isSearch ? "~" : "";
    }
    return sug;
  },
  BuildSearchKeywords_ (): void {
    let arr = Object.keys(Settings_.cache_.searchEngineMap), max = 0, j: number;
    for (const i of arr) {
      j = i.length;
      max < j && (max = j);
    }
    Settings_.set_("searchKeywords", "\n" + arr.join("\n"));
    searchEngine.searchKeywordMaxLength_ = max;
    searchEngine.timer_ = 0;
  }
},

Completers = {
  counter_: 0,
  sugTypes_: SugType.Empty,
  suggestions_: null as readonly Suggestion[] | null,
  mostRecentQuery_: null as CompletersNS.QueryStatus | null,
  callback_: null as CompletersNS.Callback | null,
  filter_ (completers: CompleterList): void {
    if (Completers.mostRecentQuery_) { Completers.mostRecentQuery_.o = true; }
    const query: CompletersNS.QueryStatus = Completers.mostRecentQuery_ = {
      o: false
    };
    Completers.sugTypes_ = SugType.Empty;
    allExpectedTypes &= completers[0] as SugType;
    let i = 1, l = allExpectedTypes & ~SugType.search ? completers.length : 2;
    Completers.suggestions_ = [];
    Completers.counter_ = l - 1;
    matchType = offset && MatchType.reset;
    if (completers[1] === searchEngine) {
      const ret = searchEngine.preFilter_(query);
      if (l < 3) {
        return;
      }
      if (ret) {
        ret.then(Completers._filter2.bind(null, completers, query, i));
        return;
      }
      i = 2;
    }
    Completers._filter2(completers, query, i);
  },
  _filter2 (this: void, completers: readonly Completer[], query: CompletersNS.QueryStatus, i: number): void {
    RankingUtils.timeAgo_ = Date.now() - TimeEnums.timeCalibrator; // safe for time change
    RankingUtils.maxScoreP_ = RankingEnums.maximumScore * queryTerms.length || 0.01;
    if (queryTerms.indexOf("__proto__") >= 0) {
      queryTerms = queryTerms.join(" ").replace(<RegExpG> /(^| )__proto__(?=$| )/g, " __proto_").trimLeft().split(" ");
    }
    MatchCacheManager.update_();
    queryTerms.sort(Completers.rSortQueryTerms_);
    RegExpCache.buildParts_();
    for (; i < completers.length; i++) {
      completers[i].filter_(query, i - 1);
    }
  },
  rSortQueryTerms_ (a: string, b: string): number {
    return b.length - a.length || (a < b ? -1 : a === b ? 0 : 1);
  },
  requireNormalOrIncognito_ (
      func: (this: void, query: CompletersNS.QueryStatus, tabs: readonly WritableTabEx[]) => void
      , query: CompletersNS.QueryStatus, __tabs?: readonly Tab[] | null): 1 | void {
    let wndIncognito = TabRecency_.incognito_;
    if (Build.MinCVer < BrowserVer.MinNoAbnormalIncognito && Build.BTypes & BrowserType.Chrome && inNormal === null) {
      wndIncognito = wndIncognito !== IncognitoType.mayFalse ? wndIncognito
        : CurCVer_ >= BrowserVer.MinNoAbnormalIncognito || Settings_.CONST_.DisallowIncognito_
          || !!MatchCacheManager.tabs_.tabs_
        ? (TabRecency_.incognito_ = IncognitoType.ensuredFalse) : IncognitoType.mayFalse;
    }
    if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
        || wndIncognito !== IncognitoType.mayFalse) {
      inNormal = wndIncognito !== IncognitoType.true;
      let newType = (inNormal ? TabCacheType.onlyNormal : 0) | (wantInCurrentWindow ? TabCacheType.currentWindow : 0)
      if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox) {
        newType = newType | (wantInCurrentWindow && otherFlags & CompletersNS.QueryFlags.EvenHiddenTabs
              ? TabCacheType.evenHidden : 0)
      }
      if (MatchCacheManager.tabs_.type_ !== newType) {
        MatchCacheManager.tabs_ = { tabs_: null, type_: newType };
      }
      __tabs = __tabs || MatchCacheManager.tabs_.tabs_;
      if (__tabs) {
        func(query, __tabs);
      } else {
        chrome.tabs.query(!wantInCurrentWindow ? {} : !(Build.BTypes & BrowserType.Firefox)
              || Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox
              || otherFlags & CompletersNS.QueryFlags.EvenHiddenTabs ? { currentWindow: true }
            : { currentWindow: true, hidden: false },
        func.bind(null, query));
      }
    } else {
      chrome.windows.getCurrent({populate: wantInCurrentWindow}, function (wnd): void {
        TabRecency_.incognito_ = inNormal ? IncognitoType.ensuredFalse : IncognitoType.true;
        if (!query.o) {
          Completers.requireNormalOrIncognito_(func, query, wantInCurrentWindow ? wnd.tabs : null);
        }
      });
    }
  },
  next_ (newSugs: Suggestion[], type: Exclude<SugType, SugType.Empty>): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    let arr: typeof Completers.suggestions_ = Completers.suggestions_!, num = newSugs.length;
    if (num > 0) {
      Completers.sugTypes_ |= type;
      Completers.suggestions_ = arr.length === 0 ? newSugs : arr.concat(newSugs);
      if (type === SugType.search) {
        autoSelect = !0;
        maxResults -= num;
        matchedTotal += num;
      }
    }
    if (0 === --Completers.counter_) {
      arr = null;
      return Completers.finish_();
    }
  },
  finish_ (): void {
    let suggestions = Completers.suggestions_ as Suggestion[];
    Completers.suggestions_ = null;
    suggestions.sort(Completers.rSortByRelevancy_);
    if (offset > 0) {
      suggestions = suggestions.slice(offset, offset + maxTotal);
      offset = 0;
    } else if (suggestions.length > maxTotal) {
      suggestions.length = maxTotal;
    }
    RegExpCache.words_ = RegExpCache.starts_ = null as never;
    if (queryTerms.length > 0) {
      let s0 = queryTerms[0], s1 = shortenUrl(s0), cut = s0.length !== s1.length;
      if (cut || s0.endsWith("/") && s0.length > 1) {
        queryTerms[0] = cut ? s1 : s0.slice(0, -1);
        RegExpCache.fixParts_();
      }
    }
    suggestions.forEach(prepareHtml);

    const someMatches = suggestions.length > 0,
    newAutoSelect = autoSelect && someMatches, matched = matchedTotal,
    mayGoToAnotherMode = rawInput === ":",
    newMatchType = matchType < MatchType.plain ? (matchType === MatchType.searching_
          && !someMatches ? MatchType.searchWanted : MatchType.Default)
        : !showThoseInBlocklist ? MatchType.Default
        : queryTerms.length <= 0 ? MatchType.Default
        : someMatches ? MatchType.someMatches
        : mayGoToAnotherMode ? MatchType.searchWanted
        : MatchType.emptyResult,
    newSugTypes = newMatchType === MatchType.someMatches && !mayGoToAnotherMode ? Completers.sugTypes_ : SugType.Empty,
    func = Completers.callback_!;
    Completers.cleanGlobals_();
    return func(suggestions, newAutoSelect, newMatchType, newSugTypes, matched);
  },
  cleanGlobals_ (): void {
    Completers.mostRecentQuery_ = Completers.callback_ = inNormal = null;
    queryTerms = [];
    rawInput = rawQuery = rawMore = historyUrlToSkip = bookmarkUrlToSkip = "";
    RegExpCache.parts_ = null as never;
    RankingUtils.maxScoreP_ = RankingEnums.maximumScore;
    RankingUtils.timeAgo_ = matchType =
    Completers.sugTypes_ = otherFlags =
    maxResults = maxTotal = matchedTotal = maxChars = 0;
    allExpectedTypes = SugType.Empty;
    autoSelect = isForAddressBar = false;
    wantInCurrentWindow = false;
    showThoseInBlocklist = true;
  },
  getOffset_ (this: void): void {
    let str = rawQuery, ind: number, i: number;
    offset = 0; rawMore = "";
    if (str.length === 0 || (ind = (str = str.slice(-5)).lastIndexOf("+")) < 0
      || ind !== 0 && str.charCodeAt(ind - 1) !== kCharCode.space
    ) {
      return;
    }
    str = str.slice(ind);
    ind = rawQuery.length - str.length;
    if ((i = parseInt(str, 10)) >= 0 && "+" + i === str && i <= (ind > 0 ? 100 : 200)) {
      offset = i;
    } else if (str !== "+") {
      return;
    }
    rawQuery = rawQuery.slice(0, ind && ind - 1);
    rawMore = str;
  },
  rSortByRelevancy_ (a: Suggestion, b: Suggestion): number { return b.r - a.r; }
},
knownCs = {
  __proto__: null as never,
  bookm: [SugType.bookmark as never, bookmarkEngine] as CompleterList,
  domain: [SugType.domain as never, domainEngine] as CompleterList,
  history: [SugType.history as never, historyEngine] as CompleterList,
  omni: [SugType.Full as never, searchEngine, domainEngine, historyEngine, bookmarkEngine, tabEngine] as CompleterList,
  search: [SugType.search as never, searchEngine] as CompleterList,
  tab: [SugType.tab as never, tabEngine] as CompleterList
},

  RankingUtils = {
    Match2_ (s1: string, s2: string): boolean {
      const { parts_: parts } = RegExpCache;
      for (let i = 0, len = queryTerms.length; i < len; i++) {
        if (!(parts[i].test(s1) || parts[i].test(s2))) { return false; }
      }
      return true;
    },
    maxScoreP_: RankingEnums.maximumScore,
    _emptyScores: [0, 0] as [number, number],
    scoreTerm_ (term: number, str: string): [number, number] {
      let count = 0, score = 0;
      count = str.split(RegExpCache.parts_[term]).length;
      if (count < 1) { return RankingUtils._emptyScores; }
      score = RankingEnums.anywhere;
      if (RegExpCache.starts_[term].test(str)) {
        score += RankingEnums.startOfWord;
        if (RegExpCache.words_[term].test(str)) {
          score += RankingEnums.wholeWord;
        }
      }
      return [score, (count - 1) * queryTerms[term].length];
    },
    wordRelevancy_ (url: string, title: string): number {
      let titleCount = 0, titleScore = 0, urlCount = 0, urlScore = 0, useTitle = !!title;
      RegExpCache.starts_ || RegExpCache.buildOthers_();
      for (let term = 0, len = queryTerms.length; term < len; term++) {
        let a = RankingUtils.scoreTerm_(term, url);
        urlScore += a[0]; urlCount += a[1];
        if (useTitle) {
          a = RankingUtils.scoreTerm_(term, title);
          titleScore += a[0]; titleCount += a[1];
        }
      }
      urlScore = urlScore / RankingUtils.maxScoreP_ * RankingUtils.normalizeDifference_(urlCount, url.length);
      if (titleCount === 0) {
        return title ? urlScore / 2 : urlScore;
      }
      titleScore = titleScore / RankingUtils.maxScoreP_ * RankingUtils.normalizeDifference_(titleCount, title.length);
      return (urlScore < titleScore) ? titleScore : ((urlScore + titleScore) / 2);
    },
    timeAgo_: 0,
    normalizeDifference_ (a: number, b: number): number {
      return a < b ? a / b : b / a;
    }
  },

  escapeAllRe = <RegExpG & RegExpSearchable<0>> /[$()*+.?\[\\\]\^{|}]/g,
  RegExpCache = {
    parts_: null as never as CachedRegExp[],
    starts_: null as never as CachedRegExp[],
    words_: null as never as CachedRegExp[],
    buildParts_ (): void {
      const d: CachedRegExp[] = RegExpCache.parts_ = [];
      RegExpCache.starts_ = RegExpCache.words_ = null as never;
      for (const s of queryTerms) {
        d.push(new RegExp(s.replace(escapeAllRe, "\\$&"), /** has lower */ s !== s.toUpperCase()
            && /** no upper */ s.toLowerCase() === s ? "i" as "" : "") as CachedRegExp)
      }
    },
    buildOthers_ (): void {
      const ss: CachedRegExp[] = RegExpCache.starts_ = [], ws: CachedRegExp[] = RegExpCache.words_ = [];
      for (const partRe of RegExpCache.parts_) {
        const start = "\\b" + partRe.source, flags = partRe.flags as "";
        ss.push(new RegExp(start, flags) as CachedRegExp);
        ws.push(new RegExp(start + "\\b", flags) as CachedRegExp);
      }
    },
    fixParts_ (): void {
      if (!RegExpCache.parts_) { return; }
      let s = queryTerms[0];
      RegExpCache.parts_[0] = new RegExp(s.replace(escapeAllRe, "\\$&"), RegExpCache.parts_[0].flags as ""
        ) as CachedRegExp;
    }
  },

  HistoryCache = {
    lastRefresh_: 0,
    updateCount_: 0,
    toRefreshCount_: 0,
    sorted_: false,
    loadingTimer_: 0,
    history_: null as HistoryItem[] | null,
    _callbacks: null as HistoryCallback[] | null,
    domains_: null as typeof BgUtils_.domains_ | null,
    use_ (this: void, callback?: HistoryCallback | null): void {
      if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox)
          && !chrome.history) { callback && callback([]); return; }
      if (HistoryCache._callbacks) {
        callback && HistoryCache._callbacks.push(callback);
        return;
      }
      HistoryCache._callbacks = callback ? [callback] : [];
      HistoryCache.lastRefresh_ = Date.now(); // safe for time changes
      if (HistoryCache.loadingTimer_) { return; }
      chrome.history.search({
        text: "",
        maxResults: InnerConsts.historyMaxSize,
        startTime: 0
      }, function (history: chrome.history.HistoryItem[]): void {
        setTimeout(HistoryCache.Clean_!, 0, history);
      });
    },
    Clean_: function (this: void, arr: Array<chrome.history.HistoryItem | HistoryItem>): void {
      HistoryCache.Clean_ = null;
      for (let i = 0, len = arr.length; i < len; i++) {
        let j = arr[i] as chrome.history.HistoryItem, url = j.url;
        if (url.length > GlobalConsts.MaxHistoryURLLength) {
          url = HistoryCache.trimURLAndTitleWhenTooLong_(url, j);
        }
        (arr as HistoryItem[])[i] = {
          t: url,
          title_: Build.BTypes & ~BrowserType.Chrome ? j.title || "" : j.title!,
          time_: j.lastVisitTime,
          visible_: kVisibility.visible,
          u: url
        };
      }
      if (omniBlockList) {
        for (const k of arr as HistoryItem[]) {
          if (BlockListFilter.TestNotMatched_(k.t, k.title_) === 0) {
            k.visible_ = kVisibility.hidden;
          }
        }
      }
      setTimeout(function (): void {
        setTimeout(function (): void {
          const arr1 = HistoryCache.history_!;
          for (let i = arr1.length - 1; 0 < i; ) {
            const j = arr1[i], url = j.u, text = j.t = Decoder.decodeURL_(url, j),
            isSame = text.length >= url.length;
            while (0 <= --i) {
              const k = arr1[i], url2 = k.u;
              if (url2.length >= url.length || !url.startsWith(url2)) {
                break;
              }
              (k as Writable<HistoryItem>).u = url.slice(0, url2.length);
              const decoded = isSame ? url2 : Decoder.decodeURL_(url2, k);
              // handle the case that j has been decoded in another charset but k hasn't
              k.t = isSame || decoded.length < url2.length ? text.slice(0, decoded.length) : decoded;
            }
          }
          HistoryCache.domains_ || setTimeout(function (): void {
            domainEngine.refresh_ && domainEngine.refresh_(HistoryCache.history_!);
          }, 200);
        }, 100);
        HistoryCache.history_!.sort((a, b) => a.u > b.u ? 1 : -1);
        HistoryCache.sorted_ = true;
        chrome.history.onVisitRemoved.addListener(HistoryCache.OnVisitRemoved_);
        chrome.history.onVisited.addListener(HistoryCache.OnPageVisited_);
      }, 100);
      HistoryCache.history_ = arr as HistoryItem[];
      HistoryCache.use_ = (callback): void => {
        if (callback) { callback(HistoryCache.history_!); }
      };
      HistoryCache._callbacks && HistoryCache._callbacks.length > 0 &&
      setTimeout(function (ref: HistoryCallback[]): void {
        for (const f of ref) {
          f(HistoryCache.history_!);
        }
      }, 1, HistoryCache._callbacks);
      HistoryCache._callbacks = null;
    } as ((arr: chrome.history.HistoryItem[]) => void) | null,
    OnPageVisited_ (this: void, newPage: chrome.history.HistoryItem): void {
      let url = newPage.url;
      if (url.length > GlobalConsts.MaxHistoryURLLength) {
        url = HistoryCache.trimURLAndTitleWhenTooLong_(url, newPage);
      }
      const time = newPage.lastVisitTime,
      title = Build.BTypes & ~BrowserType.Chrome ? newPage.title || "" : newPage.title!,
      updateCount = ++HistoryCache.updateCount_,
      d = HistoryCache.domains_, i = HistoryCache.binarySearch_(url);
      if (i < 0) { HistoryCache.toRefreshCount_++; }
      if (updateCount > 59
          || (updateCount > 10 && Date.now() - HistoryCache.lastRefresh_ > 300000)) { // safe for time change
        HistoryCache.refreshInfo_();
      }
      const j: HistoryItem = i >= 0 ? HistoryCache.history_![i] : {
        t: "",
        title_: title,
        time_: time,
        visible_: omniBlockList ? BlockListFilter.TestNotMatched_(url, title) : kVisibility.visible,
        u: url
      };
      let slot: Domain | undefined;
      if (d) {
        let domain = domainEngine.ParseDomainAndScheme_(url);
        if (!domain) { /* empty */ }
        else if (slot = d[domain.domain_]) {
          slot.time_ = time;
          if (i < 0) { slot.count_ += j.visible_; }
          if (domain.schema_ >= Urls.SchemaId.HTTP) { slot.https_ = domain.schema_ === Urls.SchemaId.HTTPS ? 1 : 0; }
        } else {
          d[domain.domain_] = {
            time_: time, count_: j.visible_, https_: domain.schema_ === Urls.SchemaId.HTTPS ? 1 : 0
          };
        }
      }
      if (i >= 0) {
        j.time_ = time;
        if (title && title !== j.title_) {
          j.title_ = title;
          MatchCacheManager.timer_ && MatchCacheManager.clear_(MatchCacheType.history);
          if (omniBlockList) {
            const newVisible = BlockListFilter.TestNotMatched_(url, title);
            if (j.visible_ !== newVisible) {
              j.visible_ = newVisible;
              if (slot) {
                slot.count_ += newVisible || -1;
              }
            }
          }
        }
        return;
      }
      j.t = Decoder.decodeURL_(url, j);
      HistoryCache.history_!.splice(~i, 0, j);
      MatchCacheManager.timer_ && MatchCacheManager.clear_(MatchCacheType.history);
    },
    OnVisitRemoved_ (this: void, toRemove: chrome.history.RemovedResult): void {
      Decoder._jobs.length = 0;
      const d = Decoder.dict_;
      MatchCacheManager.clear_(MatchCacheType.history);
      if (toRemove.allHistory) {
        HistoryCache.history_ = [];
        if (HistoryCache.domains_) {
          HistoryCache.domains_ = BgUtils_.domains_ = BgUtils_.safeObj_<Domain>();
        }
        const d2 = BgUtils_.safeObj_<string>();
        for (const i of bookmarkEngine.bookmarks_) {
          const t = d[i.u]; t && (d2[i.u] = t);
        }
        Decoder.dict_ = d2;
        return;
      }
      const {binarySearch_: bs, history_: h, domains_: domains} = HistoryCache;
      let entry: Domain | undefined;
      for (const j of toRemove.urls) {
        const i = bs(j);
        if (i >= 0) {
          if (domains && h![i].visible_) {
            const item = domainEngine.ParseDomainAndScheme_(j);
            if (item && (entry = domains[item.domain_]) && (--entry.count_) <= 0) {
              delete domains[item.domain_];
            }
          }
          h!.splice(i, 1);
          delete d[j];
        }
      }
    },
    trimURLAndTitleWhenTooLong_ (url: string, history: chrome.history.HistoryItem | Tab): string {
      // should be idempotent
      const colon = url.lastIndexOf(":", 9), hasHost = colon > 0 && url.substr(colon, 3) === "://",
      title = history.title;
      url = url.slice(0, (hasHost ? url.indexOf("/", colon + 4) : colon)
                + GlobalConsts.TrimmedURLPathLengthWhenURLIsTooLong) + "\u2026";
      if (title && title.length > GlobalConsts.TrimmedTitleLengthWhenURLIsTooLong) {
        history.title = BgUtils_.unicodeSubstring_(title, 0, GlobalConsts.TrimmedTitleLengthWhenURLIsTooLong);
      }
      return url;
    },
    refreshInfo_ (): void {
      type Q = chrome.history.HistoryQuery;
      type C = (results: chrome.history.HistoryItem[]) => void;
      const i = Date.now(); // safe for time change
      if (HistoryCache.toRefreshCount_ <= 0) { /* empty */ }
      else if (i < HistoryCache.lastRefresh_ + 1000 && i >= HistoryCache.lastRefresh_) { return; }
      else {
        setTimeout(chrome.history.search as ((q: Q, c: C) => void | 1) as (q: Q, c: C) => void, 50, {
          text: "",
          maxResults: Math.min(999, HistoryCache.updateCount_ + 10),
          startTime: i < HistoryCache.lastRefresh_ ? i - 5 * 60 * 1000 : HistoryCache.lastRefresh_
        }, HistoryCache.OnInfo_);
      }
      HistoryCache.lastRefresh_ = i;
      HistoryCache.toRefreshCount_ = HistoryCache.updateCount_ = 0;
      return Decoder.continueToWork_();
    },
    OnInfo_ (history: chrome.history.HistoryItem[]): void {
      const arr = HistoryCache.history_!, bs = HistoryCache.binarySearch_;
      if (arr.length <= 0) { return; }
      for (const info of history) {
        let url = info.url;
        if (url.length > GlobalConsts.MaxHistoryURLLength) {
          info.url = url = HistoryCache.trimURLAndTitleWhenTooLong_(url, info);
        }
        const j = bs(url);
        if (j < 0) {
          HistoryCache.toRefreshCount_--;
        } else {
          const item = arr[j], title = info.title;
          if (!title || title === item.title_) {
            continue;
          }
        }
        HistoryCache.updateCount_--;
        HistoryCache.OnPageVisited_(info);
      }
    },
    binarySearch_ (this: void, u: string): number {
      let e = "", a = HistoryCache.history_!, h = a.length - 1, l = 0, m = 0;
      while (l <= h) {
        m = (l + h) >>> 1;
        e = a[m].u;
        if (e > u) { h = m - 1; }
        else if (e !== u) { l = m + 1; }
        else { return m; }
      }
      // if e > u, then l == h + 1 && l == m
      // else if e < u, then l == h + 1 && l == m + 1
      // (e < u ? -2 : -1) - m = (e < u ? -1 - 1 - m : -1 - m) = (e < u ? -1 - l : -1 - l)
      // = -1 - l = ~l
      return ~l;
    }
  },

  BlockListFilter = {
    TestNotMatched_ (url: string, title: string): Visibility {
      for (const phrase of <string[]> omniBlockList) {
        if (title.includes(phrase) || url.includes(phrase)) {
          return kVisibility.hidden;
        }
      }
      return kVisibility.visible;
    },
    IsExpectingHidden_ (query: string[]): boolean {
      if (omniBlockList) {
      for (const word of query) {
        for (let phrase of omniBlockList) {
          phrase = phrase.trim();
          if (word.includes(phrase) || phrase.length > 9 && word.length + 2 >= phrase.length
              && phrase.includes(word)) {
            return true;
          }
        }
      }
      }
      return false;
    },
    UpdateAll_ (this: void): void {
      if (bookmarkEngine.bookmarks_) {
        for (const k of bookmarkEngine.bookmarks_) {
          (k as Writable<Bookmark>).visible_ = omniBlockList ? BlockListFilter.TestNotMatched_(k.t, k.path_)
            : kVisibility.visible;
        }
      }
      if (!HistoryCache.history_) {
        return;
      }
      const d = HistoryCache.domains_;
      for (const k of HistoryCache.history_) {
        const newVisible = omniBlockList ? BlockListFilter.TestNotMatched_(k.t, k.title_) : kVisibility.visible;
        if (k.visible_ !== newVisible) {
          k.visible_ = newVisible;
          if (d) {
            const domain = domainEngine.ParseDomainAndScheme_(k.u);
            if (domain) {
              const slot = d[domain.domain_];
              if (slot) {
                slot.count_ += newVisible || -1;
              }
            }
          }
        }
      }
    },
    OnUpdate_ (this: void, newList: string): void {
      const arr: string[] = [];
      for (let line of newList.split("\n")) {
        if (line.trim() && line[0] !== "#") {
          arr.push(line);
        }
      }
      omniBlockList = arr.length > 0 ? arr : null;
      (HistoryCache.history_ || bookmarkEngine.bookmarks_) && setTimeout(BlockListFilter.UpdateAll_, 100);
    }
  },

  MatchCacheManager = {
    current_: null as MatchCacheData | null,
    newMatch_: null as MatchCacheRecord | null,
    tabs_: As_<TabCacheData>({ tabs_: null, type_: TabCacheType.none }),
    all_: [] as MatchCacheRecord[],
    timer_: TimerID.None,
    tabTimer_: TimerID.None,
    update_ (): void {
      let q2 = queryTerms, found: MatchCacheRecord | null = null, now = 0, full_query = q2.join(" ");
      for (let records = MatchCacheManager.all_, ind = full_query ? records.length : 0; 0 <= --ind; ) {
        if (!records[ind].showThoseInBlockList_ && showThoseInBlocklist) { continue; }
        let q1 = records[ind].query_, i1 = 0, i2 = 0;
        for (; i1 < q1.length && i2 < q2.length; i2++) {
          if (q2[i2].includes(q1[i1])) { i1++; }
        }
        if (i1 >= q1.length) {
          found = records[ind];
          break;
        }
      }
      MatchCacheManager.current_ = found;
      if (found && (Settings_.omniPayload_.t < 200 || !found.history_ || found.history_.length > 1000)
          && (now = perf.now()) - found.time_ < Math.max(300, Settings_.omniPayload_.t * 1.3)) {
        MatchCacheManager.newMatch_ = found;
        found.query_ = q2.slice(0);
      }
      else if (full_query && (!found || full_query !== found.query_.join(" "))
          && (full_query.length > 4 || (<RegExpOne> /\w\S|[^\x00-\x80]/).test(full_query))) {
        MatchCacheManager.newMatch_ = {
          query_: q2.slice(0), showThoseInBlockList_: showThoseInBlocklist, time_: now || perf.now(),
          history_: found && found.history_, bookmarks_: found && found.bookmarks_
        };
        MatchCacheManager.all_.push(MatchCacheManager.newMatch_);
        if (!MatchCacheManager.timer_) {
          MatchCacheManager.timer_ = setInterval(MatchCacheManager._didTimeout, GlobalConsts.MatchCacheLifeTime);
        }
      } else {
        MatchCacheManager.newMatch_ = null;
      }
    },
    _didTimeout (): void {
      let records = MatchCacheManager.all_, ind = -1,
      min_time = perf.now() - (GlobalConsts.MatchCacheLifeTime - 17);
      while (++ind < records.length && records[ind].time_ < min_time) { /* empty */ }
      ind++;
      if (ind < records.length) {
        records.splice(0, ind);
      } else {
        records.length = 0;
        clearInterval(MatchCacheManager.timer_);
        MatchCacheManager.timer_ = TimerID.None;
      }
    },
    clear_ (type: MatchCacheType): void {
      for (const record of MatchCacheManager.all_) {
        type < MatchCacheType.bookmarks ? record.history_ = null
        : type < MatchCacheType.tabs ? record.bookmarks_ = null
        : MatchCacheManager.tabs_.tabs_ = null;
      }
    },
    cacheTabs_ (tabs: readonly Tab[] | null): void {
      if (MatchCacheManager.tabs_.tabs_ === tabs) { return; }
      if (MatchCacheManager.tabTimer_) {
        clearTimeout(MatchCacheManager.tabTimer_);
        MatchCacheManager.tabTimer_ = TimerID.None;
      }
      MatchCacheManager.tabs_.tabs_ = tabs;
      if (tabs) {
        MatchCacheManager.tabTimer_ = setTimeout(MatchCacheManager.cacheTabs_, GlobalConsts.TabCacheLifeTime, null);
      }
    }
  },

  _decodeFunc = decodeURIComponent, // core function
  Decoder = {
    decodeURL_ (a: string, o: ItemToDecode): string {
      if (a.length >= 400 || a.lastIndexOf("%") < 0) { return a; }
      try {
        return _decodeFunc(a);
      } catch {}
      return Decoder.dict_[a] || (o && Decoder._jobs.push(o), a);
    },
    decodeList_ (a: DecodedItem[]): void {
      const { dict_: m, _jobs: w } = Decoder;
      let i = -1, j: DecodedItem | undefined, l = a.length, s: string | undefined;
      for (; ; ) {
        try {
          while (++i < l) {
            j = a[i]; s = j.u;
            j.t = s.length >= 400 || s.lastIndexOf("%") < 0 ? s : _decodeFunc(s);
          }
          break;
        } catch {
          j!.t = m[s!] || (w.push(j!), s!);
        }
      }
      Decoder.continueToWork_();
    },
    dict_: BgUtils_.safeObj_<string>(),
    _jobs: [] as ItemToDecode[],
    _ind: -1,
    continueToWork_ (): void {
      if (Decoder._jobs.length === 0 || Decoder._ind !== -1) { return; }
      Decoder._ind = 0;
      setTimeout(Decoder.Work_, 17, null);
    },
    Work_ (xhr: XMLHttpRequest | null): void {
      let text: string | undefined;
      for (; Decoder._ind < Decoder._jobs.length; Decoder._ind++) {
        const url = Decoder._jobs[Decoder._ind], isStr = typeof url === "string",
        str = isStr ? url as string : (url as DecodedItem).u;
        if (text = Decoder.dict_[str]) {
          isStr || ((url as DecodedItem).t = text);
          continue;
        }
        if (!xhr && !(xhr = Decoder.xhr_())) {
          Decoder._jobs.length = 0;
          Decoder._ind = -1;
          return;
        }
        const arr = Build.MinCVer >= BrowserVer.MinWarningOfEscapingHashInBodyOfDataURL
            || !(Build.BTypes & BrowserType.Chrome) || CurCVer_ >= BrowserVer.MinWarningOfEscapingHashInBodyOfDataURL
            ? str.split("#", 3) : []
        const num = arr.length
        const escaped = num < 2 ? str : num < 3 ? arr[0] + "%23" + arr[1] : str.replace(<RegExpG> /#/g, "%23")
        xhr.open("GET", Decoder._dataUrl + escaped, true);
        return xhr.send();
      }
    },
    OnXHR_ (this: XMLHttpRequest): void {
      if (Decoder._ind < 0) { return; } // disabled by the outsides
      const text = this.responseText, url = Decoder._jobs[Decoder._ind++];
      if (typeof url !== "string") {
        Decoder.dict_[url.u] = url.t = text;
      } else {
        Decoder.dict_[url] = text;
      }
      if (Decoder._ind < Decoder._jobs.length) {
        Decoder.Work_(this);
      } else {
        Decoder._jobs.length = 0;
        Decoder._ind = -1;
      }
    },
    enabled_: true,
    _dataUrl: "1",
    xhr_ (this: void): XMLHttpRequest | null {
      if (!Decoder._dataUrl) { return null; }
      const xhr = new XMLHttpRequest();
      xhr.responseType = "text";
      xhr.onload = Decoder.OnXHR_;
      return xhr;
    },
    onUpdate_ (this: void, charset: string): void {
      const enabled = charset ? !(charset = charset.toLowerCase()).startsWith("utf") : false,
      newDataUrl = enabled ? ("data:text/plain;charset=" + charset + ",") : "",
      oldUrl = Decoder._dataUrl;
      if (newDataUrl === oldUrl) { return; }
      Decoder._dataUrl = newDataUrl;
      if (enabled) {
        oldUrl !== "1" && /* inited */
        setTimeout(function (): void {
          if (HistoryCache.history_) {
            Decoder.decodeList_(HistoryCache.history_);
          }
          return Decoder.decodeList_(bookmarkEngine.bookmarks_);
        }, 100);
      } else {
        Decoder.dict_ = BgUtils_.safeObj_<string>();
        Decoder._jobs.length = 0;
      }
      if (Decoder.enabled_ === enabled) { return; }
      Decoder._jobs = enabled ? [] as ItemToDecode[] : { length: 0, push: BgUtils_.blank_ } as any;
      Decoder.enabled_ = enabled;
      Decoder._ind = -1;
    }
  };

Completion_ = {
  filter_ (this: void, query: string, options: CompletersNS.FullOptions
      , callback: CompletersNS.Callback): void {
    autoSelect = false;
    rawInput = rawQuery = (query = query.trim()) && query.replace(BgUtils_.spacesRe_, " ");
    Completers.getOffset_();
    query = rawQuery;
    queryTerms = query
      ? (query = query.length < Consts.MaxCharsInQuery + 1 ? query
          : BgUtils_.unicodeSubstring_(query, 0, Consts.MaxCharsInQuery).trimRight()).split(" ")
      : [];
    maxChars = (options.c! | 0) || 128;
    if (maxChars) {
      // take CJK characters into consideration
      maxChars -= query.replace(<RegExpG>
          /[\u2e80-\u2eff\u2f00-\u2fdf\u3000-\u303f\u31c0-\u31ef\u3200-\u9fbf\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/g,
          "aa").length - query.length;
    }
    maxChars = Math.max(Consts.LowerBoundOfMaxChars, Math.min(maxChars, Consts.UpperBoundOfMaxChars));

    otherFlags = options.f;
    isForAddressBar = !!(otherFlags & CompletersNS.QueryFlags.AddressBar);
    maxTotal = maxResults = Math.min(Math.max(3, (options.r! | 0) || 10), 25);
    matchedTotal = 0;
    Completers.callback_ = callback;
    let arr: CompleterList | null | undefined =
        options.o === "bomni" ? (otherFlags |= CompletersNS.QueryFlags.PreferBookmarks, knownCs.omni)
        : knownCs[options.o]
      , str = queryTerms.length >= 1 ? queryTerms[0] : ""
      , expectedTypes = options.t;
    if (arr === knownCs.tab) {
       wantInCurrentWindow = !!(otherFlags & CompletersNS.QueryFlags.TabInCurrentWindow);
    }
    autoSelect = arr != null && arr.length === 1;
    if (str.length === 2 && str[0] === ":") {
      str = str[1];
      arr = str === "b" ? knownCs.bookm : str === "h" ? knownCs.history
        : str === "t" || str === "w" || str === "W" ? (wantInCurrentWindow = str !== "t",
            otherFlags |= Build.BTypes & BrowserType.Firefox && str > "Z" ? CompletersNS.QueryFlags.EvenHiddenTabs : 0,
            knownCs.tab)
        : str === "B" ? (otherFlags |= CompletersNS.QueryFlags.PreferBookmarks, knownCs.omni)
        : str === "H" ? (otherFlags |= CompletersNS.QueryFlags.NoTabEngine, knownCs.omni)
        : str === "d" ? knownCs.domain : str === "s" ? knownCs.search : str === "o" ? knownCs.omni : null;
      if (arr) {
        autoSelect = arr.length === 1;
        queryTerms.shift();
        rawQuery = rawQuery.slice(3);
        if (expectedTypes !== SugType.Empty) { arr = null; }
      }
    }
    if (queryTerms.length > 0) {
      queryTerms[0] = BgUtils_.fixCharsInUrl_(queryTerms[0]);
    }
    showThoseInBlocklist = !omniBlockList || BlockListFilter.IsExpectingHidden_(queryTerms);
    allExpectedTypes = expectedTypes !== SugType.Empty ? expectedTypes : SugType.Full;
    Completers.filter_(arr || knownCs.omni);
  },
  removeSug_ (url, type, callback): void {
    switch (type) {
    case "tab":
      chrome.tabs.remove(+url, function (): void {
        const err = BgUtils_.runtimeError_();
        err || MatchCacheManager.cacheTabs_(null);
        callback(!<boolean> <boolean | void> err);
        return err;
      });
      break;
    case "history":
      {
        const found = !HistoryCache.sorted_ || HistoryCache.binarySearch_(url) >= 0;
        chrome.history.deleteUrl({ url });
        found && MatchCacheManager.clear_(MatchCacheType.history);
        callback(found);
      }
      break;
    }
  },
  onWndChange_ (): void {
    if (MatchCacheManager.tabs_.tabs_) {
      if (MatchCacheManager.tabs_.type_ & TabCacheType.currentWindow
          || !(MatchCacheManager.tabs_.type_ & TabCacheType.onlyNormal) /* old-in-incognito */
              !== (TabRecency_.incognito_ === IncognitoType.true)) {
        // ignore IncognitoType.mayFalse on old Chrome - the line below does not harm
        MatchCacheManager.cacheTabs_(null);
      }
    }
  },
  isExpectingHidden_: BlockListFilter.IsExpectingHidden_
};

Settings_.updateHooks_.omniBlockList = BlockListFilter.OnUpdate_;
Settings_.postUpdate_("omniBlockList");
if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinRequestDataURLOnBackgroundPage
    || CurCVer_ >= BrowserVer.MinRequestDataURLOnBackgroundPage) {
  Settings_.updateHooks_.localeEncoding = Decoder.onUpdate_;
  Settings_.postUpdate_("localeEncoding");
} else {
  Decoder.onUpdate_("");
}

BgUtils_.timeout_(80, function () {
  Settings_.postUpdate_("searchEngines", null);
});
if (!Build.NDEBUG) {
  (window as any).Completers = Completers;
  (window as any).knownCs = knownCs;
  (window as any).HistoryCache = HistoryCache;
  (window as any).Decoder = Decoder;
  (window as any).BlockListFilter = BlockListFilter;
  (window as any).MatchCacheManager = MatchCacheManager;
}
});

// eslint-disable-next-line no-var
var Completion_: CompletersNS.GlobalCompletersConstructor = { filter_ (a, b, c): void {
  BgUtils_.timeout_(210, function () {
    return Completion_.filter_(a, b, c);
  });
}, removeSug_: BgUtils_.blank_, onWndChange_: BgUtils_.blank_ };
