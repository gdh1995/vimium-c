import Domain = CompletersNS.Domain;
import MatchType = CompletersNS.MatchType;
declare namespace CompletersNS {
  const enum RankingEnums {
    timeCalibrator = 1814400000, // 21 days
    recCalibrator = 2 / 3,
    anywhere = 1,
    startOfWord = 1,
    wholeWord = 1,
    maximumScore = 3,
  }
  const enum InnerConsts {
    bookmarkBasicDelay = 60000, bookmarkFurtherDelay = bookmarkBasicDelay * 2,
  }
}

setTimeout((function (): void {

type MatchRange = [number, number];

const enum BookmarkStatus {
  notInited = 0,
  initing = 1,
  inited = 2,
}

interface DecodedItem {
  readonly url: string;
  text: string;
}

interface Bookmark extends DecodedItem {
  readonly id: string;
  readonly url: string;
  readonly text: string;
  readonly path: string;
  readonly title: string;
  readonly jsUrl: string | null;
  readonly jsText: string | null;
}
interface JSBookmark extends Bookmark {
  readonly jsUrl: string;
  readonly jsText: string;
}
interface HistoryItem extends DecodedItem, Pick<chrome.history.HistoryItem, "title" | "url"> {
  readonly url: string;
  visit: number;
}
interface UrlItem {
  url: string;
  title: string;
  sessionId?: string | number;
}
interface UrlDomain
{
  domain: string;
  schema: Urls.SchemaId;
}

interface TextTab extends chrome.tabs.Tab {
  text: string;  
}

interface Completer {
  filter(query: CompletersNS.QueryStatus, index: number): void;
}
interface PreCompleter extends Completer {
  preFilter(query: CompletersNS.QueryStatus, failIfNull: true): void | true;
  preFilter(query: CompletersNS.QueryStatus): void;
}
interface QueryTerms extends Array<string> {
}

const enum FirstQuery {
  nothing = 0,
  waitFirst = 1,
  searchEngines = 2,
  history = 3,
  tabs = 4,

  QueryTypeMask = 0x3F,
  historyIncluded = QueryTypeMask + 1 + history,
}

interface SuggestionConstructor {
  new (type: CompletersNS.ValidSugTypes, url: string, text: string, title: string,
      computeRelevancy: (this: void, sug: CompletersNS.CoreSuggestion, data: number) => number,
      extraData: number): Suggestion;
  new (type: CompletersNS.ValidSugTypes, url: string, text: string, title: string,
      computeRelevancy: (this: void, sug: CompletersNS.CoreSuggestion) => number
      ): Suggestion;
}

type CachedRegExp = (RegExpOne | RegExpI) & RegExpSearchable<0>;

type HistoryCallback = (this: void, history: ReadonlyArray<Readonly<HistoryItem>>) => void;

type ItemToDecode = string | DecodedItem;

type CompletersMap = {
    [P in CompletersNS.ValidTypes]: ReadonlyArray<Completer>;
};
interface WindowEx extends Window {
  Completers: CompletersMap & CompletersNS.GlobalCompletersConstructor;
}
type SearchSuggestion = CompletersNS.SearchSuggestion;


let queryType: FirstQuery = FirstQuery.nothing, matchType: MatchType = MatchType.plain,
    inNormal: boolean | null = null, autoSelect: boolean = false, singleLine: boolean = false,
    maxChars: number = 0, maxResults: number = 0, maxTotal: number = 0, matchedTotal: number = 0, offset: number = 0,
    queryTerms: QueryTerms = [""], rawQuery: string = "", rawMore: string = "";

const Suggestion: SuggestionConstructor = function (this: CompletersNS.WritableCoreSuggestion,
    type: CompletersNS.ValidSugTypes, url: string, text: string, title: string,
    computeRelevancy: (this: void, sug: CompletersNS.CoreSuggestion, data?: number) => number, extraData?: number
    ) {
  this.type = type;
  this.url = url;
  this.text = text;
  this.title = title;
  (this as Suggestion).relevancy = computeRelevancy(this, extraData);
} as any,

SuggestionUtils = {
  prepareHtml (sug: Suggestion): void {
    if (sug.textSplit != null) {
      if (sug.text === sug.url) { sug.text = ""; }
      return;
    }
    sug.title = this.cutTitle(sug.title);
    const text = sug.text, str = this.shortenUrl(text);
    sug.text = text.length !== sug.url.length ? str : "";
    sug.textSplit = this.cutUrl(str, this.getRanges(str), text.length - str.length
      , singleLine ? maxChars - 13 - Math.min(sug.title.length, 40) : maxChars);
  },
  cutTitle (title: string): string {
    let cut = title.length > maxChars + 40;
    cut && (title = title.substring(0, maxChars + 39));
    return this.highlight(cut ? title + "…" : title, this.getRanges(title));
  },
  highlight (this: void, string: string, ranges: number[]): string {
    if (ranges.length === 0) { return Utils.escapeText(string); }
    let out = "", end = 0;
    for(let _i = 0; _i < ranges.length; _i += 2) {
      const start = ranges[_i], end2 = ranges[_i + 1];
      out += Utils.escapeText(string.substring(end, start));
      out += '<match>';
      out += Utils.escapeText(string.substring(start, end2));
      out += "</match>";
      end = end2;
    }
    return out + Utils.escapeText(string.substring(end));
  },
  shortenUrl (this: void, url: string): string {
    const i = Utils.IsURLHttp(url);
    return !i || i >= url.length ? url : url.substring(i, url.length - +(url.endsWith("/") && !url.endsWith("://")));
  },
  getRanges (string: string): number[] {
    const ranges: MatchRange[] = [];
    for (let i = 0, len = queryTerms.length; i < len; i++) {
      let index = 0, textPosition = 0, matchedEnd: number;
      const splits = string.split(RegExpCache.parts[i]), last = splits.length - 1, tl = queryTerms[i].length;
      for (; index < last; index++, textPosition = matchedEnd) {
        matchedEnd = (textPosition += splits[index].length) + tl;
        ranges.push([textPosition, matchedEnd]);
      }
    }
    if (ranges.length === 0) { return ranges as never[]; }
    const mergedRanges: number[] = ranges[0];
    if (ranges.length === 1) { return mergedRanges; }
    ranges.sort(this.sortBy0);
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
  },
  sortBy0 (this: void, a: MatchRange, b: MatchRange): number { return a[0] - b[0]; },
  // deltaLen may be: 0, 1, 7/8/9
  cutUrl (this: void, string: string, ranges: number[], deltaLen: number, maxLen: number): string {
    let out = "", end = string.length, cutStart = end;
    if (end <= maxLen) {}
    else if (deltaLen > 1) { cutStart = string.indexOf("/") + 1 || end; }
    else if ((cutStart = string.indexOf(":")) < 0) { cutStart = end; }
    else if (Utils.protocolRe.test(string.substring(0, cutStart + 3).toLowerCase())) {
      cutStart = string.indexOf("/", cutStart + 4) + 1 || end;
    } else {
      cutStart += 22; // for data:text/javascript,var xxx; ...
    }
    if (cutStart < end) {
      for (let i = ranges.length, start = end + 6; (i -= 2) >= 0 && start >= cutStart; start = ranges[i]) {
        const lastEnd = ranges[i + 1], delta = start - 20 - (lastEnd >= cutStart ? lastEnd : cutStart);
        if (delta > 0) {
          end -= delta;
          if (end <= maxLen) {
            cutStart = ranges[i + 1] + (maxLen - end);
            break;
          }
        }
      }
    }
    end = 0;
    for (let i = 0; end < maxLen && i < ranges.length; i += 2) {
      const start = ranges[i], temp = (end >= cutStart) ? end : cutStart, delta = start - 20 - temp;
      if (delta > 0) {
        maxLen += delta;
        out += Utils.escapeText(string.substring(end, temp + 11));
        out += "…"
        out += Utils.escapeText(string.substring(start - 8, start));
      } else if (end < start) {
        out += Utils.escapeText(string.substring(end, start));
      }
      end = ranges[i + 1];
      out += '<match>';
      out += Utils.escapeText(string.substring(start, end));
      out += "</match>";
    }
    if (string.length <= maxLen) {
      return out + Utils.escapeText(string.substring(end));
    } else {
      return out + Utils.escapeText(string.substring(end, maxLen - 1 > end ? maxLen - 1 : end + 10)) + "…";
    }
  },
  ComputeWordRelevancy (this: void, suggestion: CompletersNS.CoreSuggestion): number {
    return RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
  },
  ComputeRelevancy (this: void, text: string, title: string, lastVisitTime: number): number {
    const recencyScore = RankingUtils.recencyScore(lastVisitTime),
      wordRelevancy = RankingUtils.wordRelevancy(text, title);
    return recencyScore <= wordRelevancy ? wordRelevancy : (wordRelevancy + recencyScore) / 2;
  }
},


Completers = {
bookmarks: {
  bookmarks: [] as Bookmark[],
  currentSearch: null as CompletersNS.QueryStatus | null,
  path: "",
  depth: 0,
  status: BookmarkStatus.notInited,
  filter (query: CompletersNS.QueryStatus, index: number): void {
    if (queryTerms.length === 0) {
      Completers.next([]);
      if (index !== 0) { return; }
    } else if (this.status === BookmarkStatus.inited) {
      return this.performSearch();
    } else {
      this.currentSearch = query;
    }
    if (this.status === BookmarkStatus.notInited) { return this.refresh(); }
  },
  StartsWithSlash (str: string): boolean { return str.charCodeAt(0) === KnownKey.slash; },
  performSearch (): void {
    const c = SuggestionUtils.ComputeWordRelevancy, isPath = queryTerms.some(this.StartsWithSlash);
    let results: Suggestion[] = [];
    for (const i of this.bookmarks) {
      const title = isPath ? i.path : i.title;
      if (!RankingUtils.Match2(i.text, title)) { continue; }
      const sug = new Suggestion("bookm", i.url, i.text, title, c);
      results.push(sug);
      if (i.jsUrl === null) { continue; }
      (sug as CompletersNS.WritableCoreSuggestion).url = (i as JSBookmark).jsUrl;
      sug.title = SuggestionUtils.cutTitle(sug.title);
      sug.textSplit = "javascript: …";
      sug.text = (i as JSBookmark).jsText;
    }
    matchedTotal += results.length;
    if (queryType === FirstQuery.waitFirst || offset === 0) {
      results.sort(Completers.rsortByRelevancy);
      if (offset > 0) {
        results = results.slice(offset, offset + maxResults);
        offset = 0;
      } else if (results.length > maxResults) {
        results.length = maxResults;
      }
    }
    return Completers.next(results);
  },
  Listen: function (): void {
    const bookmarks = chrome.bookmarks, listener = Completers.bookmarks.Delay, expire = Completers.bookmarks.Expire;
    bookmarks.onCreated.addListener(listener);
    bookmarks.onRemoved.addListener(expire);
    bookmarks.onChanged.addListener(expire);
    bookmarks.onMoved.addListener(listener);
    bookmarks.onImportBegan.addListener(function(): void {
      chrome.bookmarks.onCreated.removeListener(Completers.bookmarks.Delay);
    });
    bookmarks.onImportEnded.addListener(function(): void {
      const f = Completers.bookmarks.Delay;
      chrome.bookmarks.onCreated.addListener(f);
      f();
    });
  } as ((this: void) => void) | null,
  refresh (): void {
    this.status = BookmarkStatus.initing;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = 0;
    }
    chrome.bookmarks.getTree(this.readTree.bind(this));
  },
  readTree (tree: chrome.bookmarks.BookmarkTreeNode[]): void {
    this.status = BookmarkStatus.inited;
    this.bookmarks = [];
    tree.forEach(this.traverseBookmark, this);
    const query = this.currentSearch;
    this.currentSearch = null;
    setTimeout(() => Decoder.decodeList(Completers.bookmarks.bookmarks), 50);
    if (this.Listen) {
      setTimeout(this.Listen, 0);
      this.Listen = null;
    }
    if (query && !query.isOff) {
      return this.performSearch();
    }
  },
  traverseBookmark (bookmark: chrome.bookmarks.BookmarkTreeNode): void {
    const title = bookmark.title, id = bookmark.id, path = this.path + '/' + (title || id);
    if (bookmark.children) {
      const oldPath = this.path;
      if (2 < ++this.depth) {
        this.path = path;
      }
      bookmark.children.forEach(this.traverseBookmark, this);
      --this.depth;
      this.path = oldPath;
      return;
    }
    const url = bookmark.url as string, jsSchema = "javascript:", isJS = url.startsWith(jsSchema);
    this.bookmarks.push({
      id, path, title,
      url: isJS ? jsSchema : url, text: isJS ? jsSchema : url,
      jsUrl: isJS ? url : null, jsText: isJS ? Utils.DecodeURLPart(url) : null
    });
  },
  _timer: 0,
  _stamp: 0,
  _expiredUrls: false,
  Later (): void {
    const _this = Completers.bookmarks, last = Date.now() - _this._stamp;
    if (this.status !== BookmarkStatus.notInited) { return; }
    if (last >= CompletersNS.InnerConsts.bookmarkBasicDelay || last < 0) {
      this._timer = 0;
      _this.refresh();
    } else {
      _this._timer = setTimeout(_this.Later, CompletersNS.InnerConsts.bookmarkBasicDelay);
    }
  },
  Delay (): void {
    const _this = Completers.bookmarks;
    _this._stamp = Date.now();
    if (_this.status < BookmarkStatus.inited) { return; }
    _this.reset();
    _this._timer = setTimeout(_this.Later, CompletersNS.InnerConsts.bookmarkFurtherDelay);
  },
  Expire (id: string, info?: chrome.bookmarks.BookmarkRemoveInfo | chrome.bookmarks.BookmarkChangeInfo): void {
    const _this = Completers.bookmarks;
    let node: {id: string, url?: string | void, title: string, text?: string, children?: any[] | void} | undefined;
    if (info && (!(node = (info as chrome.bookmarks.BookmarkRemoveInfo).node) || node.url)) {
      const arr = _this.bookmarks, len = arr.length, isRemoved = (info as chrome.bookmarks.BookmarkChangeInfo).title == null;
      let i = 0, cur: Bookmark | null = null; for (; i < len; i++) { if (arr[i].id === id) { cur = arr[i]; break; } }
      const url = cur ? cur.url : null, url2 = (info as any).url as string | undefined;
      if (url && (isRemoved ? url !== (cur as any).text : url2 != null && url !== url2)) {
        url in Decoder.dict && HistoryCache.binarySearch(url) < 0 && delete Decoder.dict[url];
        if (!isRemoved) {
          (cur as any).url = url2;
          (cur as any).text = Decoder.decodeURL(url, a);
          Decoder.continueToWork();
        }
      }
      if (isRemoved) {
        cur && this.bookmarks.splice(i, 1);
        return;
      } else if (cur) {
        const { title } = info as chrome.bookmarks.BookmarkChangeInfo;
        if (cur.title !== title) {
          (cur as any).title = title;
          (cur as any).path = cur.path.substring(0, cur.path.lastIndexOf('/') + 1) + (title || cur.id);
        }
        return;
      }
    }
    Completers.bookmarks._expiredUrls = true;
    Completers.bookmarks.Delay();
  },
  reset (): void {
    const dict = Decoder.dict, bs = HistoryCache.binarySearch;
    if (this._expiredUrls) {
      for (const { url } of this.bookmarks) {
        if ((url in dict) && bs(url) < 0) {
          delete dict[url];
        }
      }
      this._expiredUrls = false;
    }
    this.bookmarks = [];
    this.status = BookmarkStatus.notInited;
  }
},

history: {
  filter (query: CompletersNS.QueryStatus, index: number): void {
    const history = HistoryCache.history;
    if (queryType === FirstQuery.waitFirst) {
      queryType = queryTerms.length === 0 || index === 0 ? FirstQuery.history : FirstQuery.historyIncluded;
    }
    if (queryTerms.length > 0) {
      if (history) {
        return Completers.next(this.quickSearch(history));
      }
      return HistoryCache.use(function(history): void {
        if (query.isOff) { return; }
        return Completers.next(Completers.history.quickSearch(history));
      });
    }
    if (history) {
      HistoryCache.refreshInfo();
    } else {
      setTimeout(function() {
        return HistoryCache.use();
      }, 50);
    }
    if (index === 0) {
      Completers.requireNormalOrIncognito(this, this.loadTabs, query);
    } else if (chrome.sessions) {
      chrome.sessions.getRecentlyClosed(this.loadSessions.bind(this, query));
    } else {
      return this.filterFill([], query, {}, 0, 0);
    }
  },
  quickSearch (history: ReadonlyArray<Readonly<HistoryItem>>): Suggestion[] {
    const onlyUseTime = queryTerms.length == 1 && (queryTerms[0][0] === "." ? Utils.commonFileExtRe.test(queryTerms[0]) :
      (Utils.convertToUrl(queryTerms[0], null, Urls.WorkType.KeepAll), Utils.lastUrlType <= Urls.Type.MaxOfInputIsPlainUrl)
    ),
    results = [0.0, 0.0], sugs: Suggestion[] = [], Match2 = RankingUtils.Match2,
    parts0 = RegExpCache.parts[0], getRele = SuggestionUtils.ComputeRelevancy;
    let maxNum = maxResults + ((queryType & FirstQuery.QueryTypeMask) === FirstQuery.history ? offset : 0)
      , i = 0, j = 0, matched = 0;
    for (j = maxNum; --j; ) { results.push(0.0, 0.0); }
    maxNum = maxNum * 2 - 2;
    for (const len = history.length; i < len; i++) {
      const item = history[i];
      if (onlyUseTime ? !parts0.test(item.text) : !Match2(item.text, item.title)) { continue; }
      const score = onlyUseTime ? RankingUtils.recencyScore(item.visit) : getRele(item.text, item.title, item.visit);
      matched++;
      if (results[maxNum] >= score) { continue; }
      for (j = maxNum - 2; 0 <= j && results[j] < score; j -= 2) {
        results[j + 2] = results[j], results[j + 3] = results[j + 1];
      }
      results[j + 2] = score;
      results[j + 3] = i;
    }
    matchedTotal += matched;
    const getExtra = this.getExtra;
    if (queryType === FirstQuery.history) {
      i = offset * 2;
      offset = 0;
    } else {
      i = 0;
    }
    for (; i <= maxNum; i += 2) {
      const score = results[i];
      if (score <= 0) { break; }
      const item = history[results[i + 1]];
      sugs.push(new Suggestion("history", item.url, item.text, item.title, getExtra, score));
    }
    Decoder.continueToWork();
    return sugs;
  },
  loadTabs (query: CompletersNS.QueryStatus, tabs: chrome.tabs.Tab[]): void {
    if (query.isOff) { return; }
    const arr: SafeDict<number> = Object.create(null);
    let count = 0;
    for (const { url, incognito } of tabs) {
      if ((incognito && inNormal) || (url in arr)) { continue; }
      arr[url] = 1; count++;
    }
    return this.filterFill([], query, arr, offset, count);
  },
  loadSessions (query: CompletersNS.QueryStatus, sessions: chrome.sessions.Session[]): void {
    if (query.isOff) { return; }
    const historys: chrome.tabs.Tab[] = [], arr: Dict<number> = {};
    let i = queryType === FirstQuery.history ? -offset : 0;
    return sessions.some(function(item): boolean {
      const entry = item.tab;
      if (!entry || entry.url in arr) { return false; }
      arr[entry.url] = 1;
      ++i > 0 && historys.push(entry);
      return historys.length >= maxResults;
    }) ? this.filterFinish(historys) : this.filterFill(historys as UrlItem[], query, arr, -i, 0);
  },
  filterFill (historys: UrlItem[], query: CompletersNS.QueryStatus, arr: Dict<number>,
      cut: number, neededMore: number): void {
    chrome.history.search({
      text: "",
      maxResults: offset + maxResults + neededMore
    }, function(historys2: chrome.history.HistoryItem[] | UrlItem[]): void {
      if (query.isOff) { return; }
      historys2 = (historys2 as UrlItem[]).filter(Completers.history.urlNotIn, arr);
      if (cut < 0) {
        historys2.length = Math.min(historys2.length, maxResults - historys.length);
        historys2 = (historys as UrlItem[]).concat(historys2);
      } else if (cut > 0) {
        historys2 = historys2.slice(cut, cut + maxResults);
      }
      return Completers.history.filterFinish(historys2);
    });
  },
  filterFinish: function (this: any, historys: Array<UrlItem | Suggestion>): void {
    historys.forEach((this as typeof Completers.history).MakeSuggestion);
    offset = 0;
    Decoder.continueToWork();
    return Completers.next(historys as Suggestion[]);
  } as (historys: UrlItem[]) => void,
  MakeSuggestion (e: UrlItem, i: number, arr: Array<UrlItem | Suggestion>): void {
    const u = e.url, o = new Suggestion("history", u, Decoder.decodeURL(u, u), e.title,
      Completers.history.getExtra, (99 - i) / 100);
    e.sessionId && (o.sessionId = e.sessionId);
    arr[i] = o;
  },
  getExtra (_s: CompletersNS.CoreSuggestion, score: number): number { return score; },
  urlNotIn (this: Dict<number>, i: UrlItem): boolean { return !(i.url in this); }
},

domains: {
  filter (query: CompletersNS.QueryStatus, index: number): void {
    if (queryTerms.length !== 1 || queryType === FirstQuery.searchEngines || queryTerms[0].indexOf("/") !== -1) {
      return Completers.next([]);
    }
    const cache = HistoryCache;
    if (cache.domains) {}
    else if (cache.history) {
      this.refresh(cache.history);
    } else {
      return index > 0 ? Completers.next([]) : cache.use(function() {
        if (query.isOff) { return; }
        return Completers.domains.filter(query, 0);
      });
    }
    return this.performSearch();
  } ,
  performSearch (): void {
    const ref = Utils.domains as EnsuredSafeDict<Domain>, p = RankingUtils.maxScoreP, word = queryTerms[0].toLowerCase();
    let sug: Suggestion | undefined, result = "", d: Domain = null as Domain | null as Domain, result_score = -1;
    if (offset > 0) {
      for (const domain in ref) {
        if (domain.indexOf(word) !== -1) { offset--; matchedTotal++; break; }
      }
      return Completers.next([]);
    }
    RankingUtils.maxScoreP = CompletersNS.RankingEnums.maximumScore;
    for (const domain in ref) {
      if (domain.indexOf(word) === -1) { continue; }
      const score = SuggestionUtils.ComputeRelevancy(domain, "", (d = ref[domain]).time);
      if (score > result_score) { result_score = score; result = domain; }
    }
    if (result) {
      matchedTotal++;
      if (result.length > word.length && !result.startsWith("www.") && !result.startsWith(word)) {
        let r2 = result.substring(result.indexOf(".") + 1);
        if (r2.indexOf(word) !== -1) {
          let d2: Domain | undefined;
          r2 = "www." + r2;
          if (d2 = ref[r2]) { result = r2; d = d2; }
        }
      }
      result = (d.https ? "https://" : "http://") + result;
      sug = new Suggestion("domain", result, result, "", this.compute2);
      SuggestionUtils.prepareHtml(sug);
      const ind = HistoryCache.binarySearch(result + "/");
      ind < 0 || (sug.title = Utils.escapeText((HistoryCache.history as HistoryItem[])[ind].title));
      --maxResults;
    }
    RankingUtils.maxScoreP = p;
    return Completers.next(sug ? [sug] : []);
  },
  refresh (history: HistoryItem[]): void {
    this.refresh = null as never;
    const parse = this.ParseDomainAndScheme, d = HistoryCache.domains = Utils.domains;
    for (const { url, visit: time } of history) {
      const item = parse(url);
      if (!item) { continue; }
      const {domain, schema} = item, slot = d[domain];
      if (slot) {
        if (slot.time < time) { slot.time = time; }
        ++slot.count;
        if (schema >= Urls.SchemaId.HTTP) { slot.https = schema === Urls.SchemaId.HTTPS; }
      } else {
        d[domain] = {time, count: 1, https: schema === Urls.SchemaId.HTTPS};
      }
    }
    chrome.history.onVisitRemoved.addListener(this.OnVisitRemoved);
  },
  OnVisitRemoved (toRemove: chrome.history.RemovedResult): void {
    const _this = Completers.domains;
    if (toRemove.allHistory) {
      Utils.domains = Object.create<Domain>(null);
      HistoryCache.domains = Utils.domains;
      return;
    }
    const domains = Utils.domains, parse = _this.ParseDomainAndScheme;
    let entry: Domain | undefined;
    for (const j of toRemove.urls) {
      const item = parse(j);
      if (item && (entry = domains[item.domain]) && (--entry.count) <= 0) {
        delete domains[item.domain];
      }
    }
  },
  ParseDomainAndScheme (this: void, url: string): UrlDomain | null {
    let d: Urls.SchemaId;
    if (url.startsWith("http://")) { d = Urls.SchemaId.HTTP; }
    else if (url.startsWith("https://")) { d = Urls.SchemaId.HTTPS; }
    else if (url.startsWith("ftp://")) { d = Urls.SchemaId.FTP; }
    else { return null; }
    url = url.substring(d, url.indexOf('/', d));
    return { domain: url !== "__proto__" ? url : ".__proto__", schema: d };
  },
  compute2 (): number { return 2; }
},

tabs: {
  filter (query: CompletersNS.QueryStatus): void {
    Completers.requireNormalOrIncognito(this, this.performSearch, query);
  },
  performSearch (query: CompletersNS.QueryStatus, tabs0: chrome.tabs.Tab[]): void {
    if (query.isOff) { return; }
    if (queryType === FirstQuery.waitFirst) { queryType = FirstQuery.tabs; }
    const curTabId = TabRecency.last, noFilter = queryTerms.length <= 0;
    let suggestions = [] as Suggestion[], tabs = [] as TextTab[], wndIds: number[] = [];
    for (const tab of tabs0) {
      if (tab.incognito && inNormal) { continue; }
      const u = tab.url, text = Decoder.decodeURL(u, tab.incognito ? false : u);
      if (noFilter || RankingUtils.Match2(text, tab.title)) {
        (tab as TextTab).text = text;
        const wndId = tab.windowId;
        wndIds.lastIndexOf(wndId) < 0 && wndIds.push(wndId);
        tabs.push(tab as TextTab);
      }
    }
    matchedTotal += tabs.length;
    if (offset >= tabs.length) {
      if (queryType === FirstQuery.tabs) {
        offset = 0;
      } else {
        offset -= tabs.length;
      }
      return Completers.next(suggestions);
    }
    wndIds = wndIds.sort(this.SortNumbers);
    const c = noFilter ? this.computeRecency : SuggestionUtils.ComputeWordRelevancy;
    for (const tab of tabs) {
      let id = "#";
      wndIds.length > 1 && (id += `${wndIds.indexOf(tab.windowId) + 1}:`);
      id += "" + (tab.index + 1);
      if (tab.incognito) { id += "*"; }
      const tabId = tab.id, suggestion = new Suggestion("tab", tab.url, tab.text, tab.title, c, tabId);
      if (curTabId === tabId) { suggestion.relevancy = 8; }
      suggestion.sessionId = tabId;
      suggestion.index = id;
      //suggestion.textSplit = suggestion.textSplit + " " + id;
      suggestions.push(suggestion);
    }
    if (queryType !== FirstQuery.tabs && offset !== 0) {}
    else if (suggestions.sort(Completers.rsortByRelevancy).length > offset + maxResults || !noFilter) {
      if (offset > 0) {
        suggestions = suggestions.slice(offset, offset + maxResults);
        offset = 0;
      } else if (suggestions.length > maxResults) {
        suggestions.length = maxResults;
      }
    } else if (offset > 0) {
      suggestions = suggestions.slice(offset).concat(suggestions.slice(0, maxResults + offset - suggestions.length));
      for (let i = 0, len = suggestions.length, score = len; i < len; i++) {
        suggestions[i].relevancy = score--;
      }
      offset = 0;
    }
    Decoder.continueToWork();
    return Completers.next(suggestions);
  },
  SortNumbers (this: void, a: number, b: number): number { return a - b; },
  computeRecency (_0: CompletersNS.CoreSuggestion, tabId: number): number {
    return TabRecency.tabs[tabId] || (10 - 10 / (11 + tabId));
  }
},

searchEngines: {
  _nestedEvalCounter: 0,
  filter (): void {},
  preFilter (query: CompletersNS.QueryStatus, failIfNull?: true): void | true {
    let sug: SearchSuggestion, q = queryTerms, keyword = q.length > 0 ? q[0] : "",
       pattern: Search.Engine | undefined, promise: Promise<Urls.BaseEvalResult> | undefined;
    if (q.length === 0) {}
    else if (failIfNull !== true && keyword[0] === "\\" && keyword[1] !== "\\") {
      if (keyword.length > 1) {
        q[0] = keyword.substring(1);
      } else {
        q.shift();
      }
      keyword = rawQuery.substring(1).trimLeft();
      sug = this.makeUrlSuggestion(keyword, "\\" + keyword);
      autoSelect = true;
      maxResults--;
      matchedTotal++;
      return Completers.next([sug]);
    } else {
      pattern = Settings.cache.searchEngineMap[keyword];
    }
    if (failIfNull === true) {
      if (!pattern) { return true; }
    } else if (!pattern) {
      if (matchType === MatchType.plain && q.length <= 1) {
        matchType = q.length ? this.calcNextMatchType() : MatchType.reset;
      }
      return Completers.next([]);
    } else {
      autoSelect = true;
      maxResults--;
      matchedTotal++;
      if (queryType === FirstQuery.waitFirst) { q.push(rawMore); offset = 0; }
      q.length > 1 ? (queryType = FirstQuery.searchEngines) : (matchType = MatchType.reset);
    }
    if (q.length > 1) {
      q.shift();
      if (rawQuery.length > Consts.MaxCharsInQuery) {
        q = rawQuery.split(" ");
        q.shift();
      }
    } else {
      q = [];
    }

    let { url, indexes } = Utils.createSearch(q, pattern.url, []), text = url;
    if (keyword === "~") {}
    else if (url.startsWith("vimium://")) {
      const ret = Utils.evalVimiumUrl(url.substring(9), Urls.WorkType.ActIfNoSideEffects, true);
      if (ret instanceof Promise) {
        promise = ret;
      } else if (ret instanceof Array) {
        switch (ret[1]) {
        case "search":
          queryTerms = ret[0] as string[];
          const counter = this._nestedEvalCounter++;
          if (counter > 12) { break; }
          const subVal = this.preFilter(query, true);
          if (counter <= 0) { this._nestedEvalCounter = 0; }
          if (subVal !== true) {
            return;
          }
          break;
        }
      }
    } else {
      url = Utils.convertToUrl(url, null, Urls.WorkType.KeepAll);
    }
    sug = new Suggestion("search", url, text
      , pattern.name + ": " + q.join(" "), this.compute9) as SearchSuggestion;

    if (q.length > 0) {
      sug.text = this.makeText(text, indexes);
      sug.textSplit = SuggestionUtils.highlight(sug.text, indexes);
      sug.title = SuggestionUtils.highlight(sug.title
        , [pattern.name.length + 2, sug.title.length]);
    } else {
      sug.text = Utils.DecodeURLPart(SuggestionUtils.shortenUrl(text));
      sug.textSplit = Utils.escapeText(sug.text);
      sug.title = Utils.escapeText(sug.title);
    }
    sug.pattern = pattern.name;

    if (!promise) {
      return Completers.next([sug]);
    }
    promise.then(this.onPrimose.bind(this, query, sug));
  },
  onPrimose (query: CompletersNS.QueryStatus, output: Suggestion, arr: Urls.MathEvalResult): void {
    if (query.isOff) { return; }
    const result = arr[0];
    if (!result) {
      return Completers.next([output]);
    }
    const sug = new Suggestion("math", "vimium://copy " + result, result, result, this.compute9);
    --sug.relevancy;
    sug.title = "<match style=\"text-decoration: none;\">" + Utils.escapeText(sug.title) + "<match>";
    sug.textSplit = Utils.escapeText(arr[2]);
    maxResults--;
    matchedTotal++;
    return Completers.next([output, sug]);
  },
  searchKeywordMaxLength: 0,
  timer: 0,
  calcNextMatchType (): MatchType {
    const key = queryTerms[0], arr = Settings.cache.searchKeywords;
    if (!arr) {
      this.timer = this.timer || setTimeout(this.BuildSearchKeywords, 67);
      return MatchType._searching;
    }
    if (key.length >= this.searchKeywordMaxLength) { return MatchType.plain; }
    const next = this.binaryInsert(key, arr);
    return next < arr.length && arr[next].startsWith(key) ? MatchType._searching
      : MatchType.plain;
  },
  makeText (url: string, arr: number[]): string {
    let len = arr.length, i: number, str: string, ind: number;
    str = Utils.DecodeURLPart(arr.length > 0 ? url.substring(0, arr[0]) : url);
    if (i = Utils.IsURLHttp(str)) {
      str = str.substring(i);
      i = 0;
    }
    if (arr.length <= 0) { return str; }
    ind = arr[0];
    while (arr[i] = str.length, len > ++i) {
      str += Utils.DecodeURLPart(url.substring(ind, arr[i]));
      ind = arr[i];
    }
    if (ind < url.length) {
      str += Utils.DecodeURLPart(url.substring(ind));
    }
    return str;
  },
  makeUrlSuggestion (keyword: string, text?: string): SearchSuggestion {
    const url = Utils.convertToUrl(keyword, null, Urls.WorkType.KeepAll),
    isSearch = Utils.lastUrlType === Urls.Type.Search,
    sug = new Suggestion("search", url, text || Utils.DecodeURLPart(SuggestionUtils.shortenUrl(url))
      , "", this.compute9) as SearchSuggestion;
    sug.textSplit = Utils.escapeText(sug.text);
    sug.title = isSearch ? "~: " + SuggestionUtils.highlight(keyword, [0, keyword.length]) : Utils.escapeText(keyword);
    sug.pattern = isSearch ? "~" : "";
    return sug;
  },
  BuildSearchKeywords (): void {
    let arr = Object.keys(Settings.cache.searchEngineMap), max = 0;
    arr.sort();
    for (const i of arr) {
      const j = i.length;
      max < j && (max = j);
    }
    Settings.set("searchKeywords", arr);
    Completers.searchEngines.searchKeywordMaxLength = max;
    Completers.searchEngines.timer = 0;
  },
  binaryInsert (u: string, a: string[]): number {
    let e = "", h = a.length - 1, l = 0, m = 0;
    while (l <= h) {
      m = (l + h) >>> 1;
      e = a[m];
      if (e > u) { h = m - 1; }
      else { l = m + 1; }
    }
    // m + (e < u ? 1 : 0) = (e < u ? m + 1 : m) = (e < u ? l : l) = l
    return l;
  },
  compute9 (this: void): number { return 9; }
},

  counter: 0,
  sugCounter: 0,
  suggestions: null as ReadonlyArray<Suggestion> | null,
  mostRecentQuery: null as CompletersNS.QueryStatus | null,
  callback: null as CompletersNS.Callback | null,
  filter (completers: ReadonlyArray<Completer>): void {
    if (this.mostRecentQuery) { this.mostRecentQuery.isOff = true; }
    const query: CompletersNS.QueryStatus = this.mostRecentQuery = {
      isOff: false
    };
    let i = this.sugCounter = 0, l = this.counter = completers.length;
    this.suggestions = [];
    matchType = offset && MatchType.reset;
    if (completers[0] === Completers.searchEngines) {
      if (l < 2) {
        return (Completers.searchEngines as PreCompleter).preFilter(query);
      }
      Completers.searchEngines.preFilter(query);
      i = 1;
    }
    RankingUtils.timeAgo = Date.now() - CompletersNS.RankingEnums.timeCalibrator;
    RankingUtils.maxScoreP = CompletersNS.RankingEnums.maximumScore * queryTerms.length || 0.01;
    if (queryTerms.indexOf("__proto__") >= 0) {
      queryTerms = queryTerms.join(" ").replace(this.protoRe, " __proto_").trimLeft().split(" ");
    }
    RegExpCache.buildParts();
    for (l--; i < l; i++) {
      completers[i].filter(query, i);
    }
    if (i === l) {
      return completers[i].filter(query, i);
    }
  },
  requireNormalOrIncognito<T> (that: T
      , func: (this: T, query: CompletersNS.QueryStatus, tabs: chrome.tabs.Tab[]) => void
      , query: CompletersNS.QueryStatus): 1 {
    const cb = func.bind(that, query);
    if (inNormal === null) {
      inNormal = TabRecency.incognito !== IncognitoType.mayFalse ? TabRecency.incognito !== IncognitoType.true
        : Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito || Settings.CONST.DisallowIncognito
          || null;
    }
    if (inNormal !== null) {
      return chrome.tabs.query({}, cb);
    }
    return chrome.windows.getCurrent(function(wnd): void {
      if (query.isOff) { return; }
      inNormal = wnd ? !wnd.incognito : true;
      TabRecency.incognito = inNormal ? IncognitoType.ensuredFalse : IncognitoType.true;
      chrome.tabs.query({}, cb);
    });
  },
  next (newSugs: Suggestion[]): void {
    let arr = this.suggestions;
    if (newSugs.length > 0) {
      this.sugCounter++;
      this.suggestions = (arr as Suggestion[]).length === 0 ? newSugs : (arr as Suggestion[]).concat(newSugs);
    }
    if (0 === --this.counter) {
      arr = null;
      return this.finish();
    }
  },
  finish (): void {
    let suggestions = this.suggestions as Suggestion[];
    this.suggestions = null;
    suggestions.sort(this.rsortByRelevancy);
    if (offset > 0) {
      suggestions = suggestions.slice(offset, offset + maxTotal);
      offset = 0;
    } else if (suggestions.length > maxTotal) {
      suggestions.length = maxTotal;
    }
    RegExpCache.words = RegExpCache.starts = null as never;
    if (queryTerms.length > 0) {
      let s0 = queryTerms[0], s1 = SuggestionUtils.shortenUrl(s0), cut = s0.length !== s1.length;
      if (cut || s0.endsWith('/') && s0.length > 1) {
        queryTerms[0] = cut ? s1 : s0.substring(0, s0.length - 1);
        RegExpCache.fixParts();
      }
    }
    suggestions.forEach(SuggestionUtils.prepareHtml, SuggestionUtils);

    const newAutoSelect = autoSelect && suggestions.length > 0, matched = matchedTotal,
    newMatchType = matchType < MatchType.plain ? (matchType === MatchType._searching
        && suggestions.length === 0 ? MatchType.searchWanted : MatchType.Default)
      : suggestions.length === 0 ? queryTerms.length > 0 ? MatchType.emptyResult : MatchType.Default
      : this.sugCounter === 1 ? MatchType.singleMatch : MatchType.Default,
    func = this.callback as CompletersNS.Callback;
    this.cleanGlobals();
    return func(suggestions, newAutoSelect, newMatchType, matched);
  },
  cleanGlobals (): void {
    this.mostRecentQuery = this.callback = inNormal = null;
    queryTerms = [];
    rawQuery = rawMore = "";
    RegExpCache.parts = null as never;
    RankingUtils.maxScoreP = CompletersNS.RankingEnums.maximumScore;
    RankingUtils.timeAgo = this.sugCounter = matchType =
    maxResults = maxTotal = matchedTotal = maxChars = 0;
    queryType = FirstQuery.nothing;
    autoSelect = singleLine = false;
  },
  getOffset (this: void): void {
    let str = rawQuery, ind: number, i: number;
    offset = 0; queryType = FirstQuery.nothing; rawMore = "";
    if (str.length === 0 || (ind = (str = str.slice(-5)).lastIndexOf("+")) < 0
      || ind !== 0 && str.charCodeAt(ind - 1) !== KnownKey.space
    ) {
      return;
    }
    str = str.substring(ind);
    ind = rawQuery.length - str.length;
    if ((i = parseInt(str, 10)) >= 0 && '+' + i === str && i <= (ind > 0 ? 100 : 200)) {
      offset = i;
    } else if (str !== "+") {
      return;
    }
    rawQuery = rawQuery.substring(0, ind - 1);
    rawMore = str;
    queryType = FirstQuery.waitFirst;
  },
  protoRe: <RegExpG & RegExpSearchable<0>> /(?:^|\s)__proto__(?=$|\s)/g,
  rsortByRelevancy (a: Suggestion, b: Suggestion): number { return b.relevancy - a.relevancy; }
};

(window as WindowEx).Completers = {
  bookm: [Completers.bookmarks],
  domain: [Completers.domains],
  history: [Completers.history],
  omni: [Completers.searchEngines, Completers.domains, Completers.history, Completers.bookmarks],
  search: [Completers.searchEngines],
  tab: [Completers.tabs],
  filter(this: WindowEx["Completers"], query: string, options: CompletersNS.FullOptions
      , callback: CompletersNS.Callback): void {
    autoSelect = false;
    rawQuery = (query = query.trim()) && query.replace(Utils.spacesRe, " ");
    Completers.getOffset();
    query = rawQuery as string;
    queryTerms = query ? (query.length > Consts.MaxCharsInQuery ? query.substring(0, Consts.MaxCharsInQuery).trimRight() : query).split(" ") : [];
    maxChars = Math.max(Consts.LowerBoundOfMaxChars, Math.min((<number>options.maxChars | 0) || 128, Consts.UpperBoundOfMaxChars));
    singleLine = !!options.singleLine;
    maxTotal = maxResults = Math.min(Math.max(3, ((options.maxResults as number) | 0) || 10), 25);
    matchedTotal = 0;
    Completers.callback = callback;
    let arr: ReadonlyArray<Completer> | null = null, str: string;
    if (queryTerms.length >= 1 && queryTerms[0].length === 2 && queryTerms[0][0] === ":") {
      str = queryTerms[0][1];
      arr = str === "b" ? this.bookm : str === "h" ? this.history : str === "t" ? this.tab
        : str === "d" ? this.domain : str === "s" ? this.search : str === "o" ? this.omni : null;
      if (arr) {
        queryTerms.shift();
        autoSelect = arr !== this.omni;
        return Completers.filter(arr);
      }
    }
    const a = this[options.type];
    return Completers.filter(a instanceof Array ? a : this.omni);
  }
};

  const RankingUtils = {
    Match2 (s1: string, s2: string): boolean {
      const { parts } = RegExpCache;
      for (let i = 0, len = queryTerms.length; i < len; i++) {
        if (!(parts[i].test(s1) || parts[i].test(s2))) { return false; }
      }
      return true;
    },
    maxScoreP: CompletersNS.RankingEnums.maximumScore,
    _emptyScores: [0, 0] as [number, number],
    scoreTerm (term: number, string: string): [number, number] {
      let count = 0, score = 0;
      count = string.split(RegExpCache.parts[term]).length;
      if (count < 1) { return this._emptyScores; }
      score = CompletersNS.RankingEnums.anywhere;
      if (RegExpCache.starts[term].test(string)) {
        score += CompletersNS.RankingEnums.startOfWord;
        if (RegExpCache.words[term].test(string)) {
          score += CompletersNS.RankingEnums.wholeWord;
        }
      }
      return [score, (count - 1) * queryTerms[term].length];
    },
    wordRelevancy (url: string, title: string): number {
      let titleCount = 0, titleScore = 0, urlCount = 0, urlScore = 0, useTitle = !!title;
      RegExpCache.starts || RegExpCache.buildOthers();
      for (let term = 0, len = queryTerms.length; term < len; term++) {
        let a = this.scoreTerm(term, url);
        urlScore += a[0]; urlCount += a[1];
        if (useTitle) {
          a = this.scoreTerm(term, title);
          titleScore += a[0]; titleCount += a[1];
        }
      }
      urlScore = urlScore / this.maxScoreP * this.normalizeDifference(urlCount, url.length);
      if (titleCount === 0) {
        return title ? urlScore / 2 : urlScore;
      }
      titleScore = titleScore / this.maxScoreP * this.normalizeDifference(titleCount, title.length);
      return (urlScore < titleScore) ? titleScore : ((urlScore + titleScore) / 2);
    },
    timeAgo: 0,
    recencyScore (lastAccessedTime: number): number {
      const score = Math.max(0, lastAccessedTime - this.timeAgo) / CompletersNS.RankingEnums.timeCalibrator;
      return score * score * CompletersNS.RankingEnums.recCalibrator;
    },
    normalizeDifference (a: number, b: number): number {
      return a < b ? a / b : b / a;
    }
  },

  RegExpCache = {
    parts: null as never as CachedRegExp[],
    starts: null as never as CachedRegExp[],
    words: null as never as CachedRegExp[],
    buildParts (): void {
      const d: CachedRegExp[] = this.parts = [] as never;
      this.starts = this.words = null as never;
      for (const s of queryTerms) {
        d.push(new RegExp(s.replace(Utils.escapeAllRe, "\\$&"), Utils.hasUpperCase(s) ? "" : "i" as "") as CachedRegExp);
      }
    },
    buildOthers (): void {
      const ss = this.starts = [] as CachedRegExp[], ws = this.words = [] as CachedRegExp[];
      for (const s of queryTerms) {
        const start = "\\b" + s.replace(Utils.escapeAllRe, "\\$&"), flags = Utils.hasUpperCase(s) ? "" : "i" as "";
        ss.push(new RegExp(start, flags) as CachedRegExp);
        ws.push(new RegExp(start + "\\b", flags) as CachedRegExp);
      }
    },
    fixParts (): void {
      if (!this.parts) { return; }
      let s = queryTerms[0];
      this.parts[0] = new RegExp(s.replace(Utils.escapeAllRe, "\\$&"), Utils.hasUpperCase(s) ? "" : "i" as "") as CachedRegExp;
    }
  },

  HistoryCache = {
    size: 20000,
    lastRefresh: 0,
    updateCount: 0,
    toRefreshCount: 0,
    history: null as HistoryItem[] | null,
    _callbacks: null as HistoryCallback[] | null,
    domains: null as typeof Utils.domains | null,
    use (callback?: HistoryCallback): void {
      if (this._callbacks) {
        callback && this._callbacks.push(callback);
        return;
      }
      this._callbacks = callback ? [callback] : [];
      this.lastRefresh = Date.now();
      chrome.history.search({
        text: "",
        maxResults: this.size,
        startTime: 0
      }, function(history: chrome.history.HistoryItem[]): void {
        setTimeout(HistoryCache.Clean as (arr: chrome.history.HistoryItem[]) => void, 0, history);
      });
    },
    Clean: function(this: void, arr: Array<chrome.history.HistoryItem | HistoryItem>): void {
      let _this = HistoryCache, len: number, i: number, j: chrome.history.HistoryItem | null;
      _this.Clean = null;
      for (i = 0, len = arr.length; i < len; i++) {
        j = arr[i] as chrome.history.HistoryItem;
        (arr as HistoryItem[])[i] = {
          visit: j.lastVisitTime,
          text: j.url,
          title: j.title,
          url: j.url
        };
      }
      j = null;
      setTimeout(function() {
        const _this = HistoryCache;
        setTimeout(() => Decoder.decodeList(HistoryCache.history as HistoryItem[]), 100);
        (_this.history as HistoryItem[]).sort((a, b) => a.url > b.url ? 1 : -1);
        chrome.history.onVisitRemoved.addListener(_this.OnVisitRemoved);
        chrome.history.onVisited.addListener(_this.OnPageVisited);
      }, 100);
      _this.history = arr as HistoryItem[];
      _this.use = function(this: typeof HistoryCache, callback?: HistoryCallback): void {
        return callback ? callback(this.history as HistoryItem[]) : undefined;
      };
      _this._callbacks && _this._callbacks.length > 0 && setTimeout(function(ref: Array<HistoryCallback>): void {
        for (const f of ref) {
          f(HistoryCache.history as HistoryItem[]);
        }
      }, 1, _this._callbacks);
      _this._callbacks = null;
    } as ((arr: chrome.history.HistoryItem[]) => void) | null,
    OnPageVisited (this: void, newPage: chrome.history.HistoryItem): void {
      const _this = HistoryCache, url = newPage.url, time = newPage.lastVisitTime,
      d = _this.domains, i = _this.binarySearch(url);
      let j: HistoryItem;
      if (i < 0) { _this.toRefreshCount++; }
      if (_this.updateCount++ > 99) { _this.refreshInfo(); }
      if (d) {
        let domain = Completers.domains.ParseDomainAndScheme(url), slot: Domain | undefined;
        if (!domain) {}
        else if (slot = d[domain.domain]) {
          slot.time = time;
          if (i < 0) { ++slot.count; }
          if (domain.schema >= Urls.SchemaId.HTTP) { slot.https = domain.schema === Urls.SchemaId.HTTPS; }
        } else {
          d[domain.domain] = { time, count: 1, https: domain.schema === Urls.SchemaId.HTTPS };
        }
      }
      if (i >= 0) {
        j = (_this.history as HistoryItem[])[i];
        j.visit = time;
        newPage.title && (j.title = newPage.title);
        return;
      }
      j = {
        visit: time,
        text: "",
        title: newPage.title,
        url
      };
      j.text = Decoder.decodeURL(url, j);
      (_this.history as HistoryItem[]).splice(~i, 0, j);
    },
    OnVisitRemoved (this: void, toRemove: chrome.history.RemovedResult): void {
      Decoder.todos.length = 0;
      const d = Decoder.dict;
      if (toRemove.allHistory) {
        HistoryCache.history = [];
        const d2 = Object.create<string>(null);
        for (const i of Completers.bookmarks.bookmarks) {
          const t = d[i.url]; t && (d2[i.url] = t);
        }
        Decoder.dict = d2;
        return;
      }
      const {binarySearch: bs, history: h} = HistoryCache as {
        binarySearch: typeof HistoryCache["binarySearch"], history: HistoryItem[]
      };
      for (const j of toRemove.urls) {
        const i = bs(j);
        if (i >= 0) {
          h.splice(i, 1);
          delete d[j];
        }
      }
    },
    refreshInfo (): void {
      type Q = chrome.history.HistoryQuery;
      type C = (results: chrome.history.HistoryItem[]) => void;
      if (this.toRefreshCount <= 0 && this.updateCount < 10) { return; }
      const i = Date.now();
      if (this.toRefreshCount <= 0) {}
      else if (this.lastRefresh + 1000 > i) { return; }
      else setTimeout(chrome.history.search as ((q: Q, c: C) => void | 1) as (q: Q, c: C) => void, 50, {
        text: "",
        maxResults: Math.min(2000, this.updateCount + 10),
        startTime: this.lastRefresh
      }, this.OnInfo);
      this.lastRefresh = i;
      this.toRefreshCount = this.updateCount = 0;
      return Decoder.continueToWork();
    },
    OnInfo (history: chrome.history.HistoryItem[]): void {
      const arr = HistoryCache.history as HistoryItem[], bs = HistoryCache.binarySearch;
      if (arr.length <= 0) { return; }
      for (const info of history) {
        const j = bs(info.url);
        if (j < 0) {
          HistoryCache.OnPageVisited(info);
          continue;
        }
        const item = arr[j];
        item.title !== info.title && info.title && (item.title = info.title);
      }
    },
    binarySearch (this: void, u: string): number {
      let e = "", a = HistoryCache.history as HistoryItem[], h = a.length - 1, l = 0, m = 0;
      while (l <= h) {
        m = (l + h) >>> 1;
        e = a[m].url;
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

  Decoder = {
    _f: decodeURIComponent, // core function
    decodeURL (a: string, o: ItemToDecode | false): string {
      if (a.length >= 400 || a.indexOf('%') < 0) { return a; }
      try {
        return this._f(a);
      } catch (e) {}
      return this.dict[a] || (o !== false && this.todos.push(o), a);
    },
    decodeList (a: DecodedItem[]): void {
      const { _f: f, dict: m, todos: w } = this;
      let i = -1, j: DecodedItem | undefined, l = a.length, s: string | undefined;
      for (; ; ) {
        try {
          while (++i < l) {
            j = a[i]; s = j.url;
            j.text = s.length >= 400 || s.indexOf('%') < 0 ? s : f(s);
          }
          break;
        } catch (e) {
          (j as DecodedItem).text = m[s as string] || (w.push(j as DecodedItem), s as string);
        }
      }
      return this.continueToWork();
    },
    dict: Object.create<string>(null),
    todos: [] as ItemToDecode[],
    _ind: -1,
    _enabled: true,
    continueToWork (): void {
      if (this.todos.length === 0 || this._ind !== -1) { return; }
      this._ind = 0;
      setTimeout(this.Work, 17, null);
    },
    Work (xhr: XMLHttpRequest | null): void {
      const _this = Decoder;
      let text: string | undefined;
      for (; _this._ind < _this.todos.length; _this._ind++) {
        const url = _this.todos[_this._ind], isStr = typeof url === "string",
        str = isStr ? url as string : (url as DecodedItem).url;
        if (text = _this.dict[str]) {
          isStr || ((url as DecodedItem).text = text);
          continue;
        }
        if (!xhr && !(xhr = _this.init())) {
          _this.todos.length = 0;
          _this._ind = -1;
          return;
        }
        xhr.open("GET", _this._dataUrl + str.replace("#", "%25"), true);
        return xhr.send();
      }
    },
    OnXHR (this: XMLHttpRequest): void {
      const _this = Decoder, text = this.responseText, url = _this.todos[_this._ind++];
      if (typeof url !== "string") {
        _this.dict[url.url] = url.text = text;
      } else {
        _this.dict[url] = text;
      }
      if (_this._ind < _this.todos.length) {
        return _this.Work(this);
      }
      _this.todos.length = 0;
      _this._ind = -1;
    },
    _dataUrl: "",
    blank (this: void): void {},
    xhr (): XMLHttpRequest | null {
      if (!this._dataUrl) { return null; }
      const xhr = new XMLHttpRequest();
      xhr.responseType = "text";
      xhr.onload = this.OnXHR;
      xhr.onerror = this.OnXHR;
      return xhr;
    },
    init (): XMLHttpRequest | null {
      this.init = this.xhr;
      Settings.updateHooks.localeEncoding = function(this: void, charset: string): void {
        const _this = Decoder, enabled = charset ? !(charset = charset.toLowerCase()).startsWith("utf") : false;
        _this._dataUrl = enabled ? ("data:text/plain;charset=" + charset + ",") : "";
        if (_this._enabled !== enabled) {
          _this.todos = enabled ? [] as ItemToDecode[] : { length: 0, push: _this.blank } as any;
          _this._enabled = enabled;
        }
        _this.dict = Object.create<string>(null);
        enabled || (_this.todos.length = 0);
      };
      Settings.postUpdate("localeEncoding");
      return this.xhr();
    }
  };

}), 200);

setTimeout(function() {
  Settings.postUpdate("searchEngines", null);
}, 300);

var Completers = { filter: function(a: string, b: CompletersNS.FullOptions, c: CompletersNS.Callback): void {
  setTimeout(function() {
    return Completers.filter(a, b, c);
  }, 210);
} };
