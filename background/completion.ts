/// <reference path="../types/bg.completion.d.ts" />

setTimeout((function (): void {

let queryType: FirstQuery, offset: number, autoSelect: boolean,
    maxCharNum: number, maxResults: number, maxTotal: number, matchType: MatchType,
    queryTerms: QueryTerms;

const Suggestion: SuggestionConstructor = function (this: WritableCoreSuggestion,
    type: string, url: string, text: string, title: string,
    computeRelevancy: (this: void, sug: CoreSuggestion, data?: number) => number, extraData?: number
    ) {
  this.type = type;
  this.url = url;
  this.text = text;
  this.title = title;
  (this as Suggestion).relevancy = computeRelevancy(this, extraData);
} as any;

const SuggestionUtils = {
  prepareHtml (sug: Suggestion): void {
    if (sug.textSplit) { return; }
    sug.titleSplit = this.highlight(sug.title, this.getRanges(sug.title));
    const str = sug.text = this.shortenUrl(sug.text);
    sug.textSplit = this.cutUrl(str, this.getRanges(str), sug.url);
  },
  highlight (this: void, string: string, ranges: number[]): string {
    let out: string[], end: number;
    if (ranges.length === 0) { return Utils.escapeText(string); }
    out = []; end = 0;
    for(let _i = 0; _i < ranges.length; _i += 2) {
      const start = ranges[_i], end2 = ranges[_i + 1];
      out.push(Utils.escapeText(string.substring(end, start)), '<match>',
        Utils.escapeText(string.substring(start, end2)), "</match>");
      end = end2;
    }
    out.push(Utils.escapeText(string.substring(end)));
    return out.join("");
  },
  shortenUrl (this: void, url: string): string {
    return url.substring((url.startsWith("http://")) ? 7 : (url.startsWith("https://")) ? 8 : 0,
      url.length - +(url.charCodeAt(url.length - 1) === 47 && !url.endsWith("://")));
  },
  pushMatchingRanges (this: void, string: string, term: string, ranges: MatchRange[]): void {
    let index = 0, textPosition = 0, matchedEnd: number;
    const splits = string.split(RegexpCache.item(term)), last = splits.length - 1, tl = term.length;
    for (; index < last; index++, textPosition = matchedEnd) {
      matchedEnd = (textPosition += splits[index].length) + tl;
      ranges.push([textPosition, matchedEnd]);
    }
  },
  getRanges (string: string): number[] {
    const ranges: MatchRange[] = [];
    for (let ref = queryTerms, i = 0, len = ref.length; i < len; ++i) {
      this.pushMatchingRanges(string, ref[i], ranges);
    }
    if (ranges.length === 0) { return ranges as any; }
    ranges.sort(this.rsortBy0);
    return this.mergeRanges(ranges);
  },
  rsortBy0 (this: void, a: MatchRange, b: MatchRange): number { return b[0] - a[0]; },
  mergeRanges (this: void, ranges: MatchRange[]): number[] {
    const mergedRanges: number[] = ranges.pop() as number[];
    for (let i = 1, ind = ranges.length; 0 <= --ind; ) {
      const range = ranges[ind];
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
  cutUrl (this: void, string: string, ranges: number[], strCoded: string): string {
    const out: string[] = [];
    let cutStart = -1, temp: number, end: number = 0;
    if (string.length <= maxCharNum || (cutStart = strCoded.indexOf(":")) < 0) {}
    else if (!Utils.protocolRe.test(string.substring(0, cutStart).toLowerCase())) { ++cutStart; }
    else if ((cutStart = strCoded.indexOf("/", cutStart + 4)) >= 0) {
      temp = string.indexOf("://");
      cutStart = string.indexOf("/", (temp < 0 || temp > cutStart) ? 0 : (temp + 4));
    }
    cutStart = (cutStart < 0) ? string.length : (cutStart + 1);
    for(let i = 0, lenCut = 0; end < (temp = maxCharNum + lenCut) && i < ranges.length; i += 2) {
      let start = ranges[i];
      temp = (end >= cutStart) ? end : cutStart;
      if (temp + 20 > start) {
        out.push(Utils.escapeText(string.substring(end, start)));
      } else {
        out.push(Utils.escapeText(string.substring(end, temp + 10)), "...",
          Utils.escapeText(string.substring(start - 6, start)));
        lenCut += start - temp - 19;
      }
      end = ranges[i + 1];
      out.push('<match>', Utils.escapeText(string.substring(start, end)), "</match>");
    }
    if (string.length <= temp) {
      out.push(Utils.escapeText(string.substring(end)));
    } else {
      out.push(Utils.escapeText(string.substring(end,
        (temp - 3 > end) ? (temp - 3) : (end + 10))), "...");
    }
    return out.join("");
  },
  ComputeWordRelevancy (this: void, suggestion: CoreSuggestion): number {
    return RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
  },
  ComputeTimeRelevancy (this: void, _0: string, _1: string, lastVisitTime: number): number {
    return RankingUtils.recencyScore(lastVisitTime);
  },
  ComputeRelevancy (this: void, text: string, title: string, lastVisitTime: number): number {
    const recencyScore = RankingUtils.recencyScore(lastVisitTime),
      wordRelevancy = RankingUtils.wordRelevancy(text, title);
    return recencyScore <= wordRelevancy ? wordRelevancy : (wordRelevancy + recencyScore) / 2;
  }
};


let Completers = {
bookmarks: {
  bookmarks: [] as Bookmark[],
  currentSearch: null as QueryStatus | null,
  path: "",
  deep: 0,
  status: 0,
  filter (query: QueryStatus, index: number): void {
    if (queryTerms.length === 0) {
      Completers.next([]);
      if (index !== 0) { return; }
    } else if (this.status === 2) {
      return this.performSearch();
    } else {
      this.currentSearch = query;
    }
    if (this.status === 0) { return this.refresh(); }
  },
  StartsWithSlash (str: string): boolean { return str.charCodeAt(0) === 47; },
  performSearch (): void {
    const c = SuggestionUtils.ComputeWordRelevancy, isPath = queryTerms.some(this.StartsWithSlash);
    let results: Suggestion[] = [];
    for (let ref = this.bookmarks, _i = ref.length; 0 <= --_i; ) {
      const i: Bookmark = ref[_i];
      const title = isPath ? i.path : i.title;
      if (!RankingUtils.Match2(i.text, title)) { continue; }
      if (!(i as JSBookmark).jsUrl) {
        results.push(new Suggestion("bookm", i.url, i.text, title, c));
        continue;
      }
      const sug = new Suggestion("bookm", (i as JSBookmark).jsUrl, "", title, c);
      sug.titleSplit = SuggestionUtils.highlight(title, SuggestionUtils.getRanges(title));
      sug.textSplit = "javascript: ...";
      sug.text = (i as JSBookmark).jsText;
      results.push(sug);
    }
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
    const bookmarks = chrome.bookmarks, listener = Completers.bookmarks.Delay;
    bookmarks.onCreated.addListener(listener);
    bookmarks.onRemoved.addListener(listener);
    bookmarks.onChanged.addListener(listener);
    bookmarks.onMoved.addListener(listener);
    bookmarks.onImportBegan.addListener(function(): void {
      chrome.bookmarks.onCreated.removeListener(Completers.bookmarks.Delay);
    });
    bookmarks.onImportEnded.addListener(function(): void {
      const f = Completers.bookmarks.Delay;
      chrome.bookmarks.onCreated.addListener(f);
      f();
    });
  } as voidFuncNoEnv | null,
  refresh (): void {
    this.status = 1;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = 0;
    }
    return chrome.bookmarks.getTree(this.readTree.bind(this));
  },
  readTree (tree: chrome.bookmarks.BookmarkTreeNode[]): void {
    this.status = 2;
    this.bookmarks = [];
    tree.forEach(this.traverseBookmark, this);
    const query = this.currentSearch;
    this.currentSearch = null;
    if (query && !query.isOff) {
      this.performSearch();
    }
    setTimeout(Decoder.DecodeList, 50, this.bookmarks);
    if (this.Listen) {
      setTimeout(this.Listen, 0);
      this.Listen = null;
    }
  },
  traverseBookmark (bookmark: chrome.bookmarks.BookmarkTreeNode): void {
    const title = bookmark.title,  path = this.path + '/' + (title || bookmark.id);
    if (bookmark.children) {
      const oldPath = this.path;
      if (2 < ++this.deep) {
        this.path = path;
      }
      bookmark.children.forEach(this.traverseBookmark, this);
      --this.deep;
      this.path = oldPath;
      return;
    }
    const url = bookmark.url as string;
    const bookm: Bookmark = url.startsWith("javascript:") ? {
      url: "", text: "", path: path, title: title,
      jsUrl: url, jsText: Utils.DecodeURLPart(url)
    } as JSBookmark : {
      url: url, text: url, path: path, title: title
    };
    this.bookmarks.push(bookm);
  },
  _timer: 0,
  _stamp: 0,
  _wait: 60000,
  Later (): void {
    const _this = Completers.bookmarks, last = Date.now() - _this._stamp;
    if (last >= _this._wait || last < 0) {
      this._timer = 0;
      _this.refresh();
    } else {
      _this._timer = setTimeout(_this.Later, _this._wait);
    }
  },
  Delay (): void {
    const _this = Completers.bookmarks;
    _this._stamp = Date.now();
    if (_this.status < 2) { return; }
    _this.clean();
    _this.bookmarks = [];
    _this._timer = setTimeout(_this.Later, _this._wait * 2);
    _this.status = 0;
  },
  clean (): void {
    const dict = Decoder.dict, ref = HistoryCache.history || [], bs = HistoryCache.binarySearch;
    for (let arr = this.bookmarks, i = 0, len = arr.length; i < len; i++) {
      const url = arr[i].url;
      if ((url in dict) && bs(url, ref) < 0) {
        delete dict[url];
      }
    }
  }
},

history: {
  filter (query: QueryStatus, index: number): void {
    const history: HistoryItem[] | null = HistoryCache.history;
    if (queryType === FirstQuery.waitFirst) {
      queryType = queryTerms.length === 0 || index === 0 ? FirstQuery.history : FirstQuery.historyIncluded;
    }
    if (queryTerms.length > 0) {
      if (history) {
        return Completers.next(this.quickSearch(history));
      }
      return HistoryCache.use(function(history: HistoryItem[]) {
        if (query.isOff) { return; }
        return Completers.next(Completers.history.quickSearch(history));
      });
    }
    if (history) {
      HistoryCache.refreshInfo();
    } else {
      setTimeout(function() {
        HistoryCache.use(null);
      }, 50);
    }
    return index === 0 ? chrome.tabs.query({}, this.loadTabs.bind(this, query))
      : chrome.sessions ? chrome.sessions.getRecentlyClosed(
         this.loadSessions.bind(this, query) as (sessions: chrome.sessions.Session[]) => void)
      : this.filterFill([], query, {}, 0);
  },
  quickSearch (history: HistoryItem[]): Suggestion[] {
    let maxNum = maxResults + ((queryType & FirstQuery.QueryTypeMask) === FirstQuery.history ? offset : 0);
    const results = [0.0, 0], sugs: Suggestion[] = [];
    let getRele: ((text: string, title: string, lastVisitTime: number) => number)
      | ((sug: Suggestion, score: number) => number), i = 0, j: number;
    getRele = SuggestionUtils.ComputeRelevancy;
    if (queryTerms.length === 1) {
      Utils.convertToUrl(queryTerms[0], null, -2);
      if (Utils.lastUrlType <= 2) {
        getRele = SuggestionUtils.ComputeTimeRelevancy;
      }
    }
    for (j = maxNum; --j; ) { results.push(0.0, 0); }
    maxNum = maxNum * 2 - 2;
    let regexps: RegExp[] | null = queryTerms.map(RegexpCache.item, RegexpCache);
    for (const len = history.length, len2 = regexps.length; i < len; i++) {
      const item = history[i];
      for (j = 0; j < len2; j++) {
        if (!(regexps[j].test(item.text) || regexps[j].test(item.title))) { break; }
      }
      if (j !== len2) { continue; }
      const score = getRele(item.text, item.title, item.lastVisitTime);
      if (results[maxNum] >= score) { continue; }
      for (j = maxNum - 2; 0 <= j && results[j] < score; j -= 2) {
        results[j + 2] = results[j], results[j + 3] = results[j + 1];
      }
      results[j + 2] = score;
      results[j + 3] = i;
    }
    regexps = null;
    getRele = this.getExtra;
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
      sugs.push(new Suggestion("history", item.url, item.text, item.title, getRele, score));
    }
    return sugs;
  },
  loadTabs (query: QueryStatus, tabs: chrome.tabs.Tab[]): void {
    if (query.isOff) { return; }
    const arr: Dict<number> = {};
    let count = 0;
    for (let i = tabs.length; 0 <= --i; ) {
      const url = tabs[i].url;
      if (url in arr) { continue; }
      arr[url] = 1; count++;
    }
    return this.filterFill([], query, arr, offset, count);
  },
  loadSessions (query: QueryStatus, sessions: chrome.sessions.Session[]): void {
    if (query.isOff) { return; }
    const historys: chrome.tabs.Tab[] = [], arr: Dict<number> = {};
    let i = queryType === FirstQuery.history ? -offset : 0;
    return sessions.some(function(item): boolean {
      var entry = item.tab;
      if (!entry || entry.url in arr) { return false; }
      arr[entry.url] = 1;
      ++i > 0 && historys.push(entry);
      return historys.length >= maxResults;
    }) ? this.filterFinish(historys) : this.filterFill(historys as UrlItem[], query, arr, -i);
  },
  filterFill (historys: UrlItem[], query: QueryStatus, arr: Dict<number>,
      cut: number, neededMore?: number): void {
    return chrome.history.search({
      text: "",
      maxResults: offset + maxResults + ((neededMore as number) | 0)
    }, function(historys2: chrome.history.HistoryItem[] | UrlItem[]): void {
      if (query.isOff) { return; }
      historys2 = (historys2 as UrlItem[]).filter(Completers.history.urlNotIn, arr);
      if (cut < 0) {
        historys2.length = Math.min(historys2.length, maxResults - historys.length);
        historys2 = (historys as UrlItem[]).concat(historys2);
      } else if (cut > 0) {
        historys2 = historys2.slice(cut, cut + maxResults);
      }
      Completers.history.filterFinish(historys2);
    });
  },
  filterFinish (historys: UrlItem[]): void {
    historys.forEach(this.MakeSuggestion);
    offset = 0;
    Decoder.continueToWork();
    return Completers.next(historys as Suggestion[]);
  },
  MakeSuggestion (e: UrlItem, i: number, arr: UrlItem[]): void {
    const o = new Suggestion("history", e.url, Decoder.decodeURL(e.url), e.title,
      Completers.history.getExtra, (99 - i) / 100);
    e.sessionId && (o.sessionId = e.sessionId);
    arr[i] = o as any;
  },
  getExtra (_s: Suggestion, score: number): number { return score; },
  urlNotIn (this: Dict<number>, i: UrlItem): boolean { return !(i.url in this); }
},

domains: {
  domains: Utils.domains,
  filter (query: QueryStatus, index: number): void {
    if (queryTerms.length !== 1 || queryTerms[0].indexOf("/") !== -1) {
      return Completers.next([]);
    }
    if (HistoryCache.history) {
      this.refresh(HistoryCache.history);
      return this.performSearch();
    }
    return index > 0 ? Completers.next([]) : HistoryCache.use(function() {
      if (query.isOff) { return; }
      return Completers.domains.filter(query, 0);
    });
  } ,
  performSearch (): void {
    if (queryTerms.length !== 1 || queryTerms[0].indexOf("/") !== -1) {
      return Completers.next([]);
    }
    const ref = this.domains, p = RankingUtils.maxScoreP, q = queryTerms, word = q[0];
    let sug: Suggestion | undefined, result = "", result_score = -1000;
    if (offset > 0) {
      for (let domain in ref) {
        if (domain.indexOf(word) !== -1) { offset--; break; }
      }
      return Completers.next([]);
    }
    queryTerms = [word];
    RankingUtils.maxScoreP = RankingUtils.maximumScore;
    for (let domain in ref) {
      if (domain.indexOf(word) === -1) { continue; }
      const score = SuggestionUtils.ComputeRelevancy(domain, "", ref[domain][0]);
      if (score > result_score) { result_score = score; result = domain; }
    }
    if (result) {
      sug = new Suggestion("domain", (ref[result][2] ? "https://" + result : "http://" + result)
        , result, "", this.compute2);
      sug.titleSplit = "";
      sug.textSplit = SuggestionUtils.cutUrl(result, SuggestionUtils.getRanges(result), sug.url);
      --maxResults;
    }
    queryTerms = q;
    RankingUtils.maxScoreP = p;
    return Completers.next(sug ? [sug] : []);
  },
  refresh (history: PureHistoryItem[]): void {
    (this as any).refresh = null;
    history.forEach(this.onPageVisited, this);
    this.filter = this.performSearch;
    chrome.history.onVisited.addListener(this.onPageVisited.bind(this));
    chrome.history.onVisitRemoved.addListener(this.OnVisitRemoved);
  },
  onPageVisited (newPage: PureHistoryItem): void {
    const item: [string, BOOL] | null = this.parseDomainAndScheme(newPage.url);
    if (item) {
      const time = newPage.lastVisitTime, slot = this.domains[item[0]];
      if (slot) {
        if (slot[0] < time) { slot[0] = time; }
        ++slot[1]; slot[2] = item[1];
      } else {
        this.domains[item[0]] = [time, 1, item[1]];
      }
    }
  },
  OnVisitRemoved (toRemove: chrome.history.RemovedResult): void {
    const _this = Completers.domains;
    if (toRemove.allHistory) {
      Utils.domains = _this.domains = Object.create<Domain>(null);
      return;
    }
    const domains = _this.domains as SafeDict<Domain>, parse = _this.parseDomainAndScheme, arr = toRemove.urls;
    let j = arr.length, entry: Domain;
    while (0 <= --j) {
      const item = parse(arr[j]);
      if (item && (entry = domains[item[0]]) && (-- entry[1]) <= 0) {
        delete domains[item[0]];
      }
    }
  },
  parseDomainAndScheme (url: string): [string, BOOL] | null {
    let d: number;
    if (url.startsWith("http://")) { d = 7; }
    else if (url.startsWith("https://")) { d = 8; }
    else { return null; }
    url = url.substring(d, url.indexOf('/', d));
    return [url !== "__proto__" ? url : ".__proto__", d - 7 as BOOL];
  },
  compute2 (): number { return 2; }
},

tabs: {
  filter (query: QueryStatus): void {
    return chrome.tabs.query({}, this.performSearch.bind(this, query));
  },
  performSearch (query: QueryStatus, tabs0: chrome.tabs.Tab[]): void {
    if (query.isOff) { return; }
    if (queryType === FirstQuery.waitFirst) { queryType = FirstQuery.tabs; }
    const curTabId = TabRecency.last(), noFilter = queryTerms.length <= 0;
    let suggestions = [] as Suggestion[], tabs = [] as TextTab[];
    let i: number, len: number, tabId: number;
    for (i = 0, len = tabs0.length; i < len; i++) {
      const tab = tabs0[i], text = Decoder.decodeURL(tab.url);
      if (noFilter || RankingUtils.Match2(text, tab.title)) {
        (tab as TextTab).text = text;
        tabs.push(tab as TextTab);
      }
    }
    if (offset >= tabs.length) {
      if (queryType === FirstQuery.tabs) {
        offset = 0;
      } else {
        offset -= tabs.length;
      }
      return Completers.next(suggestions);
    }
    const c = noFilter ? this.computeRecency : SuggestionUtils.ComputeWordRelevancy;
    for (i = 0, len = tabs.length; i < len; i++) {
      const tab = tabs[i];
      tabId = tab.id;
      const suggestion = new Suggestion("tab", tab.url, tab.text, tab.title, c, tabId);
      suggestion.sessionId = tabId;
      if (curTabId === tabId) { suggestion.relevancy = 0; }
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
      i = maxResults + offset - suggestions.length;
      suggestions = suggestions.slice(offset).concat(suggestions.slice(0, i));
      for (i = 0, len = tabId = suggestions.length; i < len; i++) {
        suggestions[i].relevancy = tabId--;
      }
      offset = 0;
    }
    Decoder.continueToWork();
    return Completers.next(suggestions);
  },
  computeRecency (_0: Suggestion, tabId: number): number {
    return TabRecency.tabs[tabId] || (1 - 1 / tabId);
  }
},

searchEngines: {
  _nestedEvalCounter: 0,
  filter (): void {},
  preFilter (query: QueryStatus, failIfNull?: true): void | true {
    let obj: Search.Result, sug: Suggestion, q = queryTerms, keyword = q.length > 0 ? q[0] : "",
       pattern: Search.Engine | undefined, promise: Promise<Urls.EvalArrayResult> | undefined,
       url: string, text: string;
    if (q.length === 0) {}
    else if (failIfNull !== true && keyword[0] === "\\") {
      q[0] = keyword.substring(1);
      keyword = q.join(" ");
      sug = this.makeUrlSuggestion(keyword, "\\" + keyword);
      autoSelect = true;
      maxResults--;
      return Completers.next([sug]);
    } else {
      pattern = Settings.cache.searchEngineMap[keyword];
    }
    if (failIfNull === true) {
      if (!pattern) { return true; }
    } else if (!pattern) {
      if (matchType === MatchType.plain && q.length <= 1) {
        matchType = q.length < 1 ? MatchType.reset : this.calcNextMatchType();
      }
      return Completers.next([]);
    } else {
      maxResults--;
      autoSelect = true;
      if (queryType === FirstQuery.waitFirst) { q.push(q.more as string); offset = 0; }
      q.length > 1 ? (queryType = FirstQuery.searchEngines) : (matchType = MatchType.reset);
    }
    q.length > 1 ? q.shift() : (q = []);

    obj = Utils.createSearch(q, pattern.url, []);
    url = text = obj.url;
    if (keyword === "~") {}
    else if (url.startsWith("vimium://")) {
      const ret: Urls.EvalResult = Utils.evalVimiumUrl(url.substring(9), 1);
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
      url = Utils.convertToUrl(url, null, -2);
    }
    sug = new Suggestion("search", url, text
      , pattern.name + ": " + q.join(" "), this.compute9);

    if (q.length > 0) {
      sug.text = this.makeText(text, obj.indexes);
      sug.textSplit = SuggestionUtils.highlight(sug.text, obj.indexes);
      sug.titleSplit = SuggestionUtils.highlight(sug.title
        , [pattern.name.length + 2, sug.title.length]);
    } else {
      sug.text = Utils.DecodeURLPart(SuggestionUtils.shortenUrl(text));
      sug.textSplit = Utils.escapeText(sug.text);
      sug.titleSplit = Utils.escapeText(sug.title);
    }

    if (!promise) {
      return Completers.next([sug]);
    }
    promise.then(this.onPrimose.bind(this, query, [sug]))
  },
  onPrimose (query: QueryStatus, output: Suggestion[], arr: Urls.MathEvalResult): void {
    if (query.isOff) { return; }
    if (!arr[0]) {
      return Completers.next(output);
    }
    var sug = new Suggestion("math", "", "", "", this.compute9);
    output.push(sug);
    --sug.relevancy;
    sug.text = (sug as WritableCoreSuggestion).title = arr[0];
    if (!arr[0].startsWith("vimium://copy")) {
      (sug as WritableCoreSuggestion).url = "vimium://copy " + arr[0];
    }
    sug.titleSplit = "<match style=\"text-decoration: none;\">" +
      Utils.escapeText(sug.title) + "<match>";
    sug.textSplit = Utils.escapeText(arr[2]);
    return Completers.next(output);
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
    if (i = (str.startsWith("http://")) ? 7 : (str.startsWith("https://")) ? 8 : 0) {
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
      url = Utils.DecodeURLPart(url.substring(ind));
      if (url.charCodeAt(url.length - 1) === 47 && !url.endsWith("://")) {
        url = url.substring(0, url.length - 1);
      }
      str += url;
    }
    return str;
  },
  makeUrlSuggestion (keyword: string, text: string): Suggestion {
    const sug = new Suggestion("search", Utils.convertToUrl(keyword, null, -2),
      "", keyword, this.compute9);
    sug.text = Utils.DecodeURLPart(SuggestionUtils.shortenUrl(sug.url));
    sug.textSplit = Utils.escapeText(sug.text);
    text && (sug.text = text);
    if (Utils.lastUrlType === 4) {
      (sug as WritableCoreSuggestion).title = "~: " + keyword;
      sug.titleSplit = SuggestionUtils.highlight(sug.title, [3, 3 + keyword.length]);
    } else {
      sug.titleSplit = Utils.escapeText(keyword);
    }
    return sug;
  },
  BuildSearchKeywords (): void {
    let arr = Object.keys(Settings.cache.searchEngineMap), i, len, max, j;
    arr.sort();
    for (i = max = 0, len = arr.length; i < len; i++) {
      j = arr[i].length;
      max < j && (max = j);
    }
    Settings.set("searchKeywords", arr);
    Completers.searchEngines.searchKeywordMaxLength = max;
    Completers.searchEngines.timer = 0;
  },
  binaryInsert (u: string, a: string[]): number {
    let e = "", h = a.length - 1, l = 0, m = 0;
    while (l <= h) {
      m = Math.floor((l + h) / 2);
      e = a[m];
      if (e > u) { h = m - 1; }
      else { l = m + 1; }
    }
    return m + (e < u ? 1 : 0);
  },
  compute9 (this: void): number { return 9; }
},

  counter: 0,
  sugCounter: 0,
  suggestions: null as ReadonlyArray<Suggestion> | null,
  mostRecentQuery: null as QueryStatus | null,
  callback: null as Callback | null,
  filter (completers: ReadonlyArray<Completer>): void {
    RegexpCache.reset();
    if (this.mostRecentQuery) { this.mostRecentQuery.isOff = true; }
    const query = this.mostRecentQuery = {
      isOff: false
    };
    let i = this.sugCounter = 0, l = this.counter = completers.length;
    this.suggestions = [];
    this.getOffset();
    matchType = offset && MatchType.reset;
    if ((completers[0] as PreCompleter).preFilter) {
      if (l < 2) {
        return (completers[0] as PreCompleter).preFilter(query);
      }
      (completers[0] as PreCompleter).preFilter(query);
      i = 1;
    }
    RankingUtils.timeAgo = Date.now() - RankingUtils.timeCalibrator;
    RankingUtils.maxScoreP = RankingUtils.maximumScore * queryTerms.length || 0.01;
    if (queryTerms.indexOf("__proto__") >= 0) {
      queryTerms = queryTerms.join(" ").replace(this.protoRe, " __proto_").trimLeft().split(" ");
    }
    for (l--; i < l; i++) {
      completers[i].filter(query, i);
    }
    if (i === l) {
      return completers[i].filter(query, i);
    }
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
    let suggestions = this.suggestions as Suggestion[], func, newAutoSelect, newMatchType;
    this.suggestions = null;
    suggestions.sort(this.rsortByRelevancy);
    if (offset > 0) {
      suggestions = suggestions.slice(offset, offset + maxTotal);
      offset = 0;
    } else if (suggestions.length > maxTotal) {
      suggestions.length = maxTotal;
    }
    if (queryTerms.length > 0) {
      queryTerms[0] = SuggestionUtils.shortenUrl(queryTerms[0]);
    }
    suggestions.forEach(SuggestionUtils.prepareHtml, SuggestionUtils);

    newAutoSelect = autoSelect && suggestions.length > 0;
    newMatchType = matchType < 0 ? (matchType === -2
        && suggestions.length <= 0 ? 3 : 0)
      : suggestions.length <= 0 ? queryTerms.length && 1
      : this.sugCounter === 1 ? 2 : 0;
    func = this.callback as Callback;
    this.cleanGlobals();
    return func(suggestions, newAutoSelect, newMatchType);
  },
  cleanGlobals (): void {
    this.mostRecentQuery = this.callback = null;
    queryTerms = [];
    RegexpCache.reset(null);
    RankingUtils.timeAgo = this.sugCounter = matchType =
    maxResults = maxTotal = maxCharNum = 0;
    queryType = FirstQuery.nothing;
    autoSelect = false;
  },
  getOffset (): void {
    let str: string, i: number;
    offset = 0; queryType = FirstQuery.nothing;
    if ((i = queryTerms.length) === 0 || (str = queryTerms[i - 1])[0] !== "+") {
      return;
    }
    if ((i = parseInt(str, 10)) >= 0 && '+' + i === str
        && i <= (queryTerms.length > 1 ? 100 : 200)) {
      offset = i;
    } else if (str !== "+") {
      return;
    }
    queryTerms.more = queryTerms.pop() as string;
    queryType = FirstQuery.waitFirst;
  },
  protoRe: /(?:^|\s)__proto__(?=$|\s)/g,
  rsortByRelevancy (a: Suggestion, b: Suggestion): number { return b.relevancy - a.relevancy; }
};

window.Completers = {
  bookm: [Completers.bookmarks],
  domain: [Completers.domains],
  history: [Completers.history],
  omni: [Completers.searchEngines, Completers.domains, Completers.history, Completers.bookmarks],
  search: [Completers.searchEngines],
  tab: [Completers.tabs],
  filter(this: typeof window.Completers, query: string, options: CompletersNS.Options, callback: Callback): void {
    autoSelect = false;
    queryTerms = query ? query.split(Utils.spacesRe) : [];
    maxCharNum = (options.clientWidth as number) > 0 ? Math.max(50, Math.min((
        ((options.clientWidth as number) - 74) / 7.72) | 0, 200)) : 128;
    maxTotal = maxResults = Math.min(Math.max((options.maxResults as number) | 0, 3), 25);
    Completers.callback = callback;
    let arr: ReadonlyArray<Completer> | null = null, str: string;
    if (queryTerms.length >= 1 && queryTerms[0].length === 2 && queryTerms[0][0] === ":") {
      str = queryTerms[0][1];
      arr = str === "b" ? this.bookm : str === "h" ? this.history : str === "t" ? this.tab
        : str === "d" ? this.domain : str === "s" ? this.search : str === "o" ? this.omni : null;
      if (arr) {
        queryTerms.shift();
        autoSelect = arr !== this.omni;
      }
    }
    return Completers.filter(arr || this[options.type]);
  }
};

  const RankingUtils = {
    Match2 (s1: string, s2: string): boolean {
      var i = queryTerms.length, cache = RegexpCache, regexp;
      while (0 <= --i) {
        regexp = cache.item(queryTerms[i]);
        if (!(regexp.test(s1) || regexp.test(s2))) { return false; }
      }
      return true;
    },
    anywhere: 1,
    startOfWord: 1,
    wholeWord: 1,
    maximumScore: 3,
    maxScoreP: 3,
    recCalibrator: 2.0 / 3.0,
    _emptyScores: [0, 0] as [number, number],
    scoreTerm (term: string, string: string): [number, number] {
      var count = 0, score = 0;
      count = string.split(RegexpCache.item(term)).length;
      if (count < 1) { return this._emptyScores; }
      score = this.anywhere;
      if (RegexpCache.get(term, 1).test(string)) {
        score += this.startOfWord;
        if (RegexpCache.get(term, 0).test(string)) {
          score += this.wholeWord;
        }
      }
      return [score, (count - 1) * term.length];
    },
    wordRelevancy (url: string, title: string): number {
      var a, term, titleCount, titleScore, urlCount, urlScore, _i = queryTerms.length;
      urlScore = titleScore = urlCount = titleCount = 0;
      while (0 <= --_i) {
        term = queryTerms[_i];
        a = this.scoreTerm(term, url);
        urlScore += a[0]; urlCount += a[1];
        if (title) {
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
    timeCalibrator: 1814400000, // 21 days
    timeAgo: 0,
    recencyScore (lastAccessedTime: number): number {
      var score = Math.max(0, lastAccessedTime - this.timeAgo) / this.timeCalibrator;
      return score * score * this.recCalibrator;
    },
    normalizeDifference (a: number, b: number): number {
      return a < b ? a / b : b / a;
    }
  };

  const RegexpCache = {
    cache: null as SafeDict<RegExp> | null,
    _d: null as RegexpCacheDict | null,
    reset (obj?: null): void {
      if (obj === null) {
        this.cache = this._d = null;
        Utils.resetRe();
        return;
      }
      this.cache = Object.create<RegExp>(null);
      this._d = [Object.create<RegExp>(null), Object.create<RegExp>(null), this.cache];
    },
    escapeRe: Utils.escapeAllRe as RegExp,
    get (s: string, i: RegexpCacheIndex): RegExp {
      var d = (this._d as RegexpCacheDict)[i];
      return d[s] || (d[s] = new RegExp((i < 2 ? "\\b" : "")
        + s.replace(this.escapeRe, "\\$&")
        + (i ? "" : "\\b"), Utils.hasUpperCase(s) ? "" : "i"));
    },
    item (s: string): RegExp {
      return (this.cache as SafeDict<RegExp>)[s] || this.get(s, 2);
    }
  };

  const HistoryCache = {
    size: 20000,
    lastRefresh: 0,
    updateCount: 0,
    toRefreshCount: 0,
    history: null as HistoryItem[] | null,
    _callbacks: null as HistoryCallback[] | null,
    use (callback: HistoryCallback | null): void {
      if (this._callbacks) {
        callback && this._callbacks.push(callback);
        return;
      }
      this._callbacks = callback ? [callback] : [];
      return chrome.history.search({
        text: "",
        maxResults: this.size,
        startTime: 0
      }, function(history: chrome.history.HistoryItem[]): void {
        setTimeout(HistoryCache.Clean as (arr: chrome.history.HistoryItem[]) => void, 17, history);
      });
    },
    Clean: function(this: void, arr: chrome.history.HistoryItem[]): void {
      let _this = HistoryCache, len: number, i: number, j: chrome.history.HistoryItem | null;
      _this.Clean = null;
      for (i = 0, len = arr.length; i < len; i++) {
        j = arr[i];
        (arr as any[] as HistoryItem[])[i] = {
          lastVisitTime: j.lastVisitTime,
          text: j.url,
          title: j.title,
          url: j.url
        };
      }
      j = null;
      setTimeout(function() {
        const _this = HistoryCache;
        setTimeout(function() { Decoder.DecodeList(HistoryCache.history as HistoryItem[]); }, 400);
        (_this.history as HistoryItem[]).sort(function(a, b) { return a.url < b.url ? -1 : 1; });
        _this.lastRefresh = Date.now();
        chrome.history.onVisitRemoved.addListener(_this.OnVisitRemoved);
        chrome.history.onVisited.addListener(_this.OnPageVisited);
      }, 100);
      _this.history = arr as any[] as HistoryItem[];
      _this.use = function(this: typeof HistoryCache, callback: HistoryCallback) {
        callback && callback(this.history as HistoryItem[]);
      };
      _this._callbacks && _this._callbacks.length > 0 && setTimeout(function(ref: Array<HistoryCallback|null>): void {
        let f: HistoryCallback, i = 0;
        for (; i < ref.length; i++) {
          f = ref[i] as HistoryCallback;
          ref[i] = null;
          f(HistoryCache.history as HistoryItem[]);
        }
      }, 34, _this._callbacks);
      _this._callbacks = null;
    } as ((arr: chrome.history.HistoryItem[]) => void) | null,
    OnPageVisited (this: void, newPage: chrome.history.HistoryItem): void {
      const _this = HistoryCache, i = _this.binarySearch(newPage.url, _this.history as HistoryItem[]);
      let j: HistoryItem;
      if (i < 0) { _this.toRefreshCount++; }
      if (_this.updateCount++ > 99) { _this.refreshInfo(); }
      if (i >= 0) {
        j = (_this.history as HistoryItem[])[i];
        j.lastVisitTime = newPage.lastVisitTime;
        newPage.title && (j.title = newPage.title);
        return;
      }
      j = {
        lastVisitTime: newPage.lastVisitTime,
        text: "",
        title: newPage.title,
        url: newPage.url
      };
      j.text = Decoder.decodeURL(newPage.url, j);
      (_this.history as HistoryItem[]).splice(-1 - i, 0, j);
    },
    OnVisitRemoved (this: void, toRemove: chrome.history.RemovedResult): void {
      const _this = HistoryCache;
      Decoder.continueToWork();
      if (toRemove.allHistory) {
        _this.history = [];
        Decoder.dict = Object.create<string>(null);
        setTimeout(Decoder.DecodeList, 17, Completers.bookmarks.bookmarks);
        return;
      }
      let bs = _this.binarySearch, h = _this.history as HistoryItem[], arr = toRemove.urls, j: number, i: number;
      for (j = arr.length; 0 <= --j; ) {
        i = bs(arr[j], h);
        if (i >= 0) {
          h.splice(i, 1);
          delete Decoder.dict[arr[j]];
        }
      }
    },
    refreshInfo (): void {
      if (this.toRefreshCount <= 0 && this.updateCount < 10) { return; }
      const i = Date.now();
      if (this.toRefreshCount <= 0) {}
      else if (this.lastRefresh + 1000 > i) { return; }
      else setTimeout(chrome.history.search, 50, {
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
      let i: number, len: number, info: chrome.history.HistoryItem, j: number, item: HistoryItem;
      if (arr.length <= 0) { return; }
      for (i = 0, len = history.length; i < len; i++) {
        info = history[i];
        j = bs(info.url, arr);
        if (j < 0) {
          HistoryCache.OnPageVisited(info);
          continue;
        }
        item = arr[j];
        item.title !== info.title && info.title && (item.title = info.title);
      }
    },
    binarySearch (this: void, u: string, a: HistoryItem[]): number {
      let e = "", h = a.length - 1, l = 0, m = 0;
      while (l <= h) {
        m = Math.floor((l + h) / 2);
        e = a[m].url;
        if (e > u) { h = m - 1; }
        else if (e !== u) { l = m + 1; }
        else { return m; }
      }
      return (e < u ? -2 : -1) - m;
    }
  };

  const Decoder = {
    _f: decodeURIComponent, // core function
    decodeURL (a: string, o?: DecodedItem): string {
      if (a.length >= 400 || a.indexOf('%') < 0) { return a; }
      try {
        return this._f(a);
      } catch (e) {}
      return this.dict[a] || (this.todos.push(o || a), a);
    },
    DecodeList (this: void, a: DecodedItem[]): void {
      let i = -1, j: DecodedItem | undefined, l = a.length, d = Decoder, f = d._f,
        s: string | undefined, m = d.dict, w = d.todos;
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
      return d.continueToWork();
    },
    dict: Object.create<string>(null),
    todos: [] as ItemToDecode[], // each item is {url: ..., text?: ...}
    _ind: -1,
    continueToWork (): void {
      if (this.todos.length === 0 || this._ind !== -1) { return; }
      this._ind = 0;
      setTimeout(this.Work, 17, null);
    },
    Work (xhr: XMLHttpRequest | null): void {
      let _this = Decoder, url: ItemToDecode, str: string, text: string;
      xhr || (xhr = _this.init());
      if (_this.todos.length <= _this._ind) {
        _this.todos.length = 0;
        _this._ind = -1;
        return;
      }
      for (; url = _this.todos[_this._ind]; _this._ind++) {
        str = url.url || (url as string);
        if (text = _this.dict[str]) {
          url.url && ((url as DecodedItem).text = text);
          continue;
        }
        xhr.open("GET", _this._dataUrl + str, true);
        return xhr.send();
      }
    },
    OnXHR (this: XMLHttpRequest): void {
      let _this = Decoder, url: ItemToDecode, str: string, text = this.responseText;
      url = _this.todos[_this._ind++];
      if (str = url.url as string) {
        _this.dict[str] = (url as DecodedItem).text = text;
      } else {
        _this.dict[url as string] = text;
      }
      return _this.Work(this);
    },
    _dataUrl: "",
    blank (this: void): void {},
    xhr (): XMLHttpRequest {
      const xhr = new XMLHttpRequest();
      xhr.responseType = "text";
      xhr.onload = this.OnXHR;
      xhr.onerror = this.OnXHR;
      return xhr;
    },
    init (): XMLHttpRequest {
      this.init = this.xhr;
      Settings.updateHooks.localeEncoding = function(charset: string): void {
        let _this = Decoder, f: () => any;
        _this._dataUrl = charset && ("data:text/plain;charset=" + charset.toLowerCase() + ",");
        f = charset ? Array.prototype.push : _this.blank;
        _this.todos.push !== f && (_this.todos.push = f);
      };
      Settings.postUpdate("localeEncoding");
      return this.xhr();
    }
  };

}), 200);

setTimeout(function() {
  Settings.postUpdate("searchEngines", null);
}, 300);

var Completers = { filter: function(a: string, b: CompletersNS.Options, c: Callback): void {
  setTimeout(function() {
    Completers.filter(a, b, c);
  }, 210);
} };
