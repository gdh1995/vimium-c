"use strict";
setTimeout(function() {
  var HistoryCache, RankingUtils, RegexpCache, Decoder,
      Completers, queryType, offset, autoSelect,
      maxCharNum, maxResults, maxTotal, matchType,
      showRelevancy, queryTerms, SuggestionUtils;

  // matchType: 0: use default completers; 1: empty result for non-empty query;
  //   2: only one completer matches some items;
  //   -1: final matchType should be 0; -2/3: search engine wants the next query

  function Suggestion(type, url, text, title, computeRelevancy, extraData) {
    this.type = type;
    this.url = url;
    this.text = text;
    this.title = title;
    this.relevancy = computeRelevancy(this, extraData);
  }

SuggestionUtils = {
  PrepareHtml: function(sug) {
    showRelevancy || (delete sug.relevancy);
    if (sug.textSplit) { return; }
    var _this = SuggestionUtils;
    sug.titleSplit = _this.highlight(sug.title, _this.getRanges(sug.title));
    var str = sug.text = _this.shortenUrl(sug.text);
    sug.textSplit = _this.cutUrl(str, _this.getRanges(str), sug.url);
  },
  highlight: function(string, ranges) {
    var _i, out, start, end, end2;
    if (ranges.length === 0) { return Utils.escapeText(string); }
    out = [];
    for(_i = 0, end = 0; _i < ranges.length; _i += 2) {
      start = ranges[_i];
      end2 = ranges[_i + 1];
      out.push(Utils.escapeText(string.substring(end, start)), '<span class="sTitle">',
        Utils.escapeText(string.substring(start, end2)), "</span>");
      end = end2;
    }
    out.push(Utils.escapeText(string.substring(end)));
    return out.join("");
  },
  shortenUrl: function(url) {
    return url.substring((url.startsWith("http://")) ? 7 : (url.startsWith("https://")) ? 8 : 0,
      url.length - +(url.charCodeAt(url.length - 1) === 47 && !url.endsWith("://")));
  },
  pushMatchingRanges: function(string, term, ranges) {
    var index = 0, textPosition = 0, matchedEnd,
      splits = string.split(RegexpCache.get(term, "(", ")")),
      _ref = splits.length - 2;
    for (; index <= _ref; index += 2) {
      matchedEnd = (textPosition += splits[index].length) + splits[index + 1].length;
      ranges.push([textPosition, matchedEnd]);
      textPosition = matchedEnd;
    }
  },
  getRanges: function(string) {
    var ranges = [], _i, _len, _ref = queryTerms;
    for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
      this.pushMatchingRanges(string, _ref[_i], ranges);
    }
    if (ranges.length === 0) { return ranges; }
    ranges.sort(this.rsortBy0);
    return this.mergeRanges(ranges);
  },
  rsortBy0: function(a, b) { return b[0] - a[0]; },
  mergeRanges: function(ranges) {
    var mergedRanges = ranges.pop(), i = 1, range, ind = ranges.length;
    while (0 <= --ind) {
      range = ranges[ind];
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
  cutUrl: function(string, ranges, strCoded) {
    var out = [], cutStart = -1, temp, lenCut, i, end, start;
    if (string.length <= maxCharNum || (cutStart = strCoded.indexOf(":")) < 0) {}
    else if (string.substring(cutStart, cutStart + 3) !== "://") { ++cutStart; }
    else if ((cutStart = strCoded.indexOf("/", cutStart + 4)) >= 0) {
      temp = string.indexOf("://");
      cutStart = string.indexOf("/", (temp < 0 || temp > cutStart) ? 0 : (temp + 4));
    }
    cutStart = (cutStart < 0) ? string.length : (cutStart + 1);
    for(i = 0, lenCut = 0, end = 0; end < (temp = maxCharNum + lenCut) && i < ranges.length; i += 2) {
      start = ranges[i];
      temp = (end >= cutStart) ? end : cutStart;
      if (temp + 20 > start) {
        out.push(Utils.escapeText(string.substring(end, start)));
      } else {
        out.push(Utils.escapeText(string.substring(end, temp + 10)), "...",
          Utils.escapeText(string.substring(start - 6, start)));
        lenCut += start - temp - 19;
      }
      end = ranges[i + 1];
      out.push('<span class="sUrl">', Utils.escapeText(string.substring(start, end)), "</span>");
    }
    if (string.length <= temp) {
      out.push(Utils.escapeText(string.substring(end)));
    } else {
      out.push(Utils.escapeText(string.substring(end,
        (temp - 3 > end) ? (temp - 3) : (end + 10))), "...");
    }
    return out.join("");
  }
};

Completers = {
bookmarks: {
  bookmarks: null,
  currentSearch: null,
  path: "",
  deep: 0,
  filter: function(query, index) {
    if (queryTerms.length === 0) {
      Completers.next([]);
      if (index !== 0) { return; }
    } else {
      this.currentSearch = query;
    }
    this.refresh && this.refresh();
  },
  StartsWithSlash: function(str) { return str.charCodeAt(0) === 47; },
  performSearch: function() {
    if (queryTerms.length === 0) {
      return Completers.next([]);
    }
    var c, results = [], isPath, _ref, _i, _len, i, title, sug;
    isPath = queryTerms.some(this.StartsWithSlash);
    c = this.computeRelevancy;
    for (_ref = this.bookmarks, _i = _ref.length; 0 <= --_i; ) {
      i = _ref[_i];
      title = isPath ? i.path : i.title;
      if (!RankingUtils.Match2(i.text, title)) { continue; }
      if (!i.jsUrl) {
        results.push(new Suggestion("bookm", i.url, i.text, title, c));
        continue;
      }
      sug = new Suggestion("bookm", i.jsUrl, "", title, c);
      sug.titleSplit = SuggestionUtils.highlight(title, SuggestionUtils.getRanges(title));
      sug.textSplit = "javascript: ...";
      sug.text = i.jsText;
      results.push(sug);
    }
    if (queryType === 1 || offset === 0) {
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
  Listen: function() {
    var bookmarks = chrome.bookmarks, listener = function() {
      chrome.bookmarks.getTree(function(tree) { Completers.bookmarks.readTree(tree); });
    };
    Completers.bookmarks.Listen = null;
    bookmarks.onCreated.addListener(listener);
    bookmarks.onRemoved.addListener(listener);
    bookmarks.onChanged.addListener(listener);
    bookmarks.onMoved.addListener(listener);
    bookmarks.onImportBegan.addListener(function() {
      chrome.bookmarks.onCreated.removeListener(listener);
    });
    bookmarks.onImportEnded.addListener(function() {
      chrome.bookmarks.getTree(function(tree) {
        chrome.bookmarks.onCreated.addListener(listener);
        Completers.bookmarks.readTree(tree);
      });
    });
  },
  refresh: function() {
    chrome.bookmarks.getTree(this._refresh.bind(this));
    this.refresh = this._refresh = null;
  },
  _refresh: function(tree) {
    this.readTree(tree);
    this.filter = this.performSearch;
    var query = this.currentSearch;
    this.currentSearch = null;
    if (query && !query.isOff) {
      this.filter(query);
    }
    setTimeout(this.Listen, 0);
  },
  readTree: function(bookmarks) {
    this.bookmarks = [];
    bookmarks.forEach(this.traverseBookmark, this);
    setTimeout(Decoder.decodeList, 50, this.bookmarks);
  },
  traverseBookmark: function(bookmark) {
    var path, oldPath, title = bookmark.title, url;
    path = this.path + '/' + (title || bookmark.id);
    if (bookmark.children) {
      oldPath = this.path;
      if (2 < ++this.deep) {
        this.path = path;
      }
      bookmark.children.forEach(this.traverseBookmark, this);
      --this.deep;
      this.path = oldPath;
      return;
    }
    url = bookmark.url;
    bookmark = {
      url: url,
      text: url,
      path: path,
      title: title
    };
    this.bookmarks.push(bookmark);
    if (url.startsWith("javascript:")) {
      bookmark.text = bookmark.url = "";
      bookmark.jsUrl = url;
      bookmark.jsText = Utils.DecodeURLPart(url);
    }
  },
  computeRelevancy: function(suggestion) {
    return RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
  }
},

history: {
  filter: function(query, index) {
    var history = HistoryCache.history;
    if (queryType === 1) {
      queryType = queryTerms.length === 0 || index === 0 ? 3 : 67;
    }
    if (queryTerms.length > 0) {
      if (history) {
        Completers.next(this.quickSearch(history));
      } else {
        HistoryCache.use(function(history) {
          if (query.isOff) { return; }
          Completers.next(Completers.history.quickSearch(history));
        });
      }
      return;
    }
    chrome.sessions ? chrome.sessions.getRecentlyClosed(null, function(sessions) {
      if (query.isOff) { return; }
      var historys = [], arr = {}, i;
      i = queryType === 3 ? -offset : 0;
      sessions.some(function(item) {
        var entry = item.tab;
        if (!entry || entry.url in arr) { return; }
        arr[entry.url] = 1;
        ++i > 0 && historys.push(entry);
        return historys.length >= maxResults;
      }) ? Completers.history.filterFinish(historys) :
      Completers.history.filterFill(historys, query, arr, -i);
    }) : this.filterFill(null, query, {}, 0);
    if (history) {
      HistoryCache.refreshInfo();
    } else {
      setTimeout(function() {
        HistoryCache.use(function() {});
      }, 50);
    }
  },
  quickSearch: function(history) {
    var maxNum = maxResults + ((queryType & 63) === 3 ? offset : 0),
    results = [], sug,
    sugs, query = queryTerms, regexps, len, i, len2, j,
    score, item, getRele = this.computeRelevancy;
    for (j = maxNum; j--; ) { results.push(0.0, 0); }
    maxNum = maxNum * 2 - 2;
    regexps = query.map(RegexpCache.item, RegexpCache);
    for (i = 0, len = history.length, len2 = regexps.length; i < len; i++) {
      item = history[i];
      for (j = 0; j < len2; j++) {
        if (!(regexps[j].test(item.text) || regexps[j].test(item.title))) { break; }
      }
      if (j !== len2) { continue; }
      score = getRele(item.text, item.title, item.lastVisitTime);
      if (results[maxNum] >= score) { continue; }
      for (j = maxNum - 2; 0 <= j && results[j] < score; j -= 2) {
        results[j + 2] = results[j], results[j + 3] = results[j + 1];
      }
      results[j + 2] = score;
      results[j + 3] = i;
    }
    regexps = null;
    sugs = [];
    getRele = this.getRelevancy0;
    if (queryType === 3) {
      i = offset * 2;
      offset = 0;
    } else {
      i = 0;
    }
    for (; i <= maxNum; i += 2) {
      score = results[i];
      if (score <= 0) { break; }
      item = history[results[i + 1]];
      sug = new Suggestion("history", item.url, item.text, item.title, getRele);
      sug.relevancy = score;
      sugs.push(sug);
    }
    return sugs;
  },
  filterFill: function(historys, query, arr, cut) {
    chrome.history.search({
      text: "",
      maxResults: (queryType === 3 ? offset : 0) + maxResults
    }, function(historys2) {
      if (query.isOff) { return; }
      var a = arr;
      historys2 = historys2.filter(function(i) {
        return !(i.url in a);
      });
      if (cut < 0) {
        historys2.length = Math.min(historys2.length, maxResults - historys.length);
        historys2 = historys.concat(historys2);
      } else if (cut > 0) {
        historys2 = historys2.slice(cut, cut + maxResults);
      }
      Completers.history.filterFinish(historys2);
    });
  },
  filterFinish: function(historys) {
    var s = Suggestion, c = this.getRelevancy0, d = Decoder.decodeURL;
    if (historys.length > maxResults) {
      historys.length = maxResults;
    }
    historys.forEach(function(e, i, arr) {
      var o = new s("history", e.url, d(e.url), e.title, c, e.lastVisitTime);
      o.relevancy = 0.99 - i / 256;
      e.sessionId && (o.sessionId = e.sessionId);
      arr[i] = o;
    });
    offset = 0;
    Completers.next(historys);
    Decoder.continueToWork();
  },
  getRelevancy0: function() { return 0; },
  computeRelevancy: function(text, title, lastVisitTime) {
    var recencyScore = RankingUtils.recencyScore(lastVisitTime),
      wordRelevancy = RankingUtils.wordRelevancy(text, title);
    return recencyScore <= wordRelevancy ? wordRelevancy : (wordRelevancy + recencyScore) / 2;
  }
},

domains: {
  domains: null,
  filter: function(query, index) {
    if (queryTerms.length !== 1 || queryTerms[0].indexOf("/") !== -1) {
      return Completers.next([]);
    }
    if (HistoryCache.history) {
      this.refresh(HistoryCache.history);
      return this.performSearch(query);
    }
    if (index > 0) { return Completers.next([]); }
    HistoryCache.use(function() {
      if (query.isOff) { return; }
      Completers.domains.filter(query, 0);
    });
  },
  performSearch: function() {
    if (queryTerms.length !== 1 || queryTerms[0].indexOf("/") !== -1) {
      Completers.next([]);
      return;
    }
    var ref = this.domains, domain, p = RankingUtils.maxScoreP, q = queryTerms, word = q[0]
      , sug, wordRelevancy, score, result = "", result_score = -1000;
    if (offset > 0) {
      for (domain in ref) {
        if (domain.indexOf(word) !== -1) { offset--; break; }
      }
      Completers.next([]);
      return;
    }
    queryTerms = [word];
    RankingUtils.maxScoreP = RankingUtils.maximumScore;
    for (domain in ref) {
      if (domain.indexOf(word) === -1) { continue; }
      score = RankingUtils.recencyScore(ref[domain][0]);
      wordRelevancy = RankingUtils.wordRelevancy(domain, null);
      score = score <= wordRelevancy ? wordRelevancy : (wordRelevancy + score) / 2;
      if (score > result_score) { result_score = score; result = domain; }
    }
    if (result) {
      sug = new Suggestion("domain", (ref[result][2] ? "https://" + result : "http://" + result)
        , result, "", this.computeRelevancy);
      sug.titleSplit = "";
      sug.textSplit = SuggestionUtils.cutUrl(result, SuggestionUtils.getRanges(result), sug.url);
      --maxResults;
    }
    queryTerms = q;
    RankingUtils.maxScoreP = p;
    Completers.next(sug ? [sug] : []);
  },
  refresh: function(history) {
    this.refresh = null;
    Utils.domains = this.domains = Object.create(null);
    history.forEach(this.onPageVisited, this);
    this.filter = this.performSearch;
    chrome.history.onVisited.addListener(this.onPageVisited.bind(this));
    chrome.history.onVisitRemoved.addListener(this.OnVisitRemoved);
  },
  onPageVisited: function(newPage) {
    var item, slot, time;
    if (item = this.parseDomainAndScheme(newPage.url)) {
      time = newPage.lastVisitTime;
      if (slot = this.domains[item[0]]) {
        if (slot[0] < time) { slot[0] = time; }
        ++slot[1]; slot[2] = item[1];
      } else {
        this.domains[item[0]] = [time, 1, item[1]];
      }
    }
  },
  OnVisitRemoved: function(toRemove) {
    var _this = Completers.domains;
    if (toRemove.allHistory) {
      Utils.domains = _this.domains = Object.create(null);
      return;
    }
    var domains = _this.domains, parse = _this.parseDomainAndScheme,
    arr = toRemove.urls, j = arr.length, item, entry;
    while (0 <= --j) {
      item = parse(arr[j]);
      if (item && (entry = domains[item[0]]) && (-- entry[1]) <= 0) {
        delete domains[item[0]];
      }
    }
  },
  parseDomainAndScheme: function(url) {
    var d;
    if (url.startsWith("http://")) { d = 7; }
    else if (url.startsWith("https://")) { d = 8; }
    else { return null; }
    url = url.substring(d, url.indexOf('/', d));
    return [url !== "__proto__" ? url : ".__proto__", d - 7];
  },
  computeRelevancy: function() {
    return 2;
  }
},

tabs: {
  filter: function(query) {
    chrome.tabs.query({}, this.performSearch.bind(this, query));
  },
  performSearch: function(query, tabs0) {
    if (query.isOff) { return; }
    if (queryType === 1) { queryType = 4; }
    var curTabId = TabRecency.last(), c, suggestions = [], i, len, tab, text, tabId
      , tabs = [], noFilter = queryTerms.length <= 0, suggestion;
    for (i = 0, len = tabs0.length; i < len; i++) {
      tab = tabs0[i];
      text = Decoder.decodeURL(tab.url);
      if (noFilter || RankingUtils.Match2(text, tab.title)) {
        tabs.push(tab);
        tab.text = text;
      }
    }
    if (offset >= tabs.length && queryType === 4) {
      offset = 0;
      Completers.next([]);
      return;
    }
    c = noFilter ? this.computeRecency : this.computeRelevancy;
    for (i = 0, len = tabs.length; i < len; i++) {
      tab = tabs[i];
      tabId = tab.id;
      suggestion = new Suggestion("tab", tab.url, tab.text, tab.title, c, tabId);
      suggestion.sessionId = tabId;
      if (curTabId === tabId) { suggestion.relevancy = 0; }
      suggestions.push(suggestion);
    }
    if (queryType === 4 || offset === 0) {
      suggestions.sort(Completers.rsortByRelevancy);
      if (suggestions.length > offset + maxResults) {
        if (offset > 0) {
          suggestions = suggestions.slice(offset, offset + maxResults);
        } else {
          suggestions.length = maxResults;
        }
      } else if (offset > 0) {
        suggestions = suggestions.slice(offset).concat(suggestions.slice(0, offset));
      }
      offset = 0;
    }
    Completers.next(suggestions);
    Decoder.continueToWork();
  },
  computeRecency: function(_0, tabId) {
    return TabRecency.tabs[tabId] || (1 - 1 / tabId);
  },
  computeRelevancy: function(suggestion) {
    return RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
  }
},

searchEngines: {
  preFilter: function(query, failIfNull) {
    var obj, sug, q = queryTerms, keyword, pattern, promise;
    if (matchType === 0) { matchType = 2; }
    if (q.length === 0) {}
    else if (failIfNull !== true && (keyword = q[0])[0] === "\\") {
      q[0] = keyword.substring(1);
      keyword = q.join(" ");
      sug = this.makeUrlSuggestion(keyword, "\\" + keyword);
      autoSelect = true;
      maxResults--;
      Completers.next([sug]);
      return;
    } else {
      pattern = Settings.cache.searchEngineMap[keyword];
    }
    if (!pattern) {
      if (failIfNull !== true) {
        if (matchType === 2) { matchType = q.length > 1 ? 0 : q.length < 1 ? -1 : this.calcNextMatchType(); }
        Completers.next([]);
      }
      return true;
    }
    maxResults--;
    autoSelect = true;
    if (failIfNull !== true) {
      if (queryType === 1) {
        q.push(q.more);
        offset = 0;
      }
      if (q.length > 1) { queryType = 2; }
      else if (matchType === 2) { matchType = -1; }
    }
    if (q.length > 1) {
      q.shift();
    } else {
      q = [];
    }

    obj = Utils.createSearch(q, pattern, []);
    sug = new Suggestion("search", obj.url, obj.url
      , pattern.name + ": " + q.join(" "), this.computeRelevancy);
    if (keyword === "~") {}
    else if (obj.url.startsWith("vimium://")) {
      keyword = Utils.evalVimiumUrl(obj.url.substring(9), 1);
      if (keyword instanceof Promise) {
        promise = keyword;
      } else if (keyword instanceof Array) {
        switch (keyword[1]) {
        case "search":
          queryTerms = keyword[0];
          if (this.preFilter(query, true) !== true) {
            return;
          }
          break;
        }
      }
    } else {
      sug.url = Utils.convertToUrl(obj.url, null, -1);
    }

    if (q.length > 0) {
      sug.text = this.makeText(obj.url, obj.indexes);
      sug.textSplit = SuggestionUtils.highlight(sug.text, obj.indexes);
      sug.titleSplit = SuggestionUtils.highlight(sug.title
        , [pattern.name.length + 2, sug.title.length]);
    } else {
      sug.text = Utils.DecodeURLPart(SuggestionUtils.shortenUrl(obj.url));
      sug.textSplit = Utils.escapeText(sug.text);
      sug.titleSplit = Utils.escapeText(sug.title);
    }

    promise ? promise.then(function(arr) {
      if (query.isOff) { return; }
      if (!arr[0]) {
        Completers.next([sug]);
        return;
      }
      var output = [sug];
      sug = new Suggestion("math", "", "", "", Completers.searchEngines.computeRelevancy);
      output.push(sug);
      --sug.relevancy;
      sug.text = sug.title = arr[0];
      if (!arr[0].startsWith("vimium://copy")) {
        sug.url = "vimium://copy " + arr[0];
      }
      sug.titleSplit = "<span class=\"OSTitle\" style=\"text-decoration: none;\">" +
        Utils.escapeText(sug.title) + "<span>";
      sug.textSplit = Utils.escapeText(arr[2]);
      Completers.next(output);
    }) : Completers.next([sug]);
  },
  searchKeywordMaxLength: 0,
  calcNextMatchType: function() {
    var key = queryTerms[0], arr, next;
    arr = Settings.cache.searchKeywords || this.buildSearchKeywords();
    if (key.length >= this.searchKeywordMaxLength) { return 0; }
    next = this.binaryInsert(key, arr);
    return next < arr.length && arr[next].startsWith(key) ? -2 : 0;
  },
  makeText: function(url, arr) {
    var len = arr.length, i, str, ind;
    ind = arr[0];
    str = Utils.DecodeURLPart(url.substring(0, ind));
    if (i = (str.startsWith("http://")) ? 7 : (str.startsWith("https://")) ? 8 : 0) {
      str = str.substring(i);
      i = 0;
    }
    arr[0] = str.length;
    while (len > ++i) {
      str += Utils.DecodeURLPart(url.substring(ind, arr[i]));
      ind = arr[i];
      arr[i] = str.length;
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
  makeUrlSuggestion: function(keyword, text) {
    var sug = new Suggestion("search", Utils.convertToUrl(keyword, null, -1),
      "", keyword, this.computeRelevancy);
    sug.text = Utils.DecodeURLPart(SuggestionUtils.shortenUrl(sug.url));
    sug.textSplit = Utils.escapeText(sug.text);
    text && (sug.text = text);
    if (Utils.lastUrlType === 2) {
      sug.title = "~: " + keyword;
      sug.titleSplit = SuggestionUtils.highlight(sug.title, [3, 3 + keyword.length]);
    } else {
      sug.titleSplit = Utils.escapeText(keyword);
    }
    return sug;
  },
  buildSearchKeywords: function() {
    var arr = Object.keys(Settings.cache.searchEngineMap), i, len, max, j;
    arr.sort();
    for (i = max = 0, len = arr.length; i < len; i++) {
      j = arr[i].length;
      max < j && (max = j);
    }
    Settings.set("searchKeywords", arr);
    this.searchKeywordMaxLength = max;
    return arr;
  },
  binaryInsert: function(u, a) {
    var e = "", h = a.length - 1, l = 0, m = 0;
    while (l <= h) {
      m = Math.floor((l + h) / 2);
      e = a[m];
      if (e > u) { h = m - 1; }
      else { l = m + 1; }
    }
    return m + (e < u);
  },
  computeRelevancy: function() {
    return 9;
  }
},

  counter: 0,
  sugCounter: 0,
  mostRecentQuery: null,
  callback: null,
  filter: function(completers) {
    RegexpCache.reset();
    if (this.mostRecentQuery) { this.mostRecentQuery.isOff = true; }
    var query = this.mostRecentQuery = {
      isOff: false
    }, i, l;
    this.suggestions = [];
    this.counter = l = completers.length;
    this.sugCounter = 0;
    this.getOffset();
    matchType = offset && -1;
    if (completers[0].preFilter) {
      completers[0].preFilter(query);
      if (!queryTerms) { return; }
      i = 1;
    } else {
      i = 0;
    }
    RankingUtils.timeAgo = Date.now() - RankingUtils.timeCalibrator;
    RankingUtils.maxScoreP = RankingUtils.maximumScore * queryTerms.length || 0.01;
    if (queryTerms.indexOf("__proto__") >= 0) {
      queryTerms = queryTerms.join(" ").replace(this.protoRe, " __proto_").trimLeft().split(" ");
    }
    for (; i < l; i++) {
      completers[i].filter(query, i);
    }
  },
  next: function(newSugs) {
    var arr = this.suggestions;
    if (newSugs.length > 0) {
      this.sugCounter++;
      this.suggestions = arr.length === 0 ? newSugs : arr.concat(newSugs);
    }
    arr = null;
    if (0 === --this.counter) {
      return this.finish();
    }
  },
  finish: function() {
    var suggestions = this.suggestions, func;
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
    suggestions.forEach(SuggestionUtils.PrepareHtml);
    var newMatchType = matchType < 0 ? (matchType === -2
        && suggestions.length <= 0 ? 3 : 0)
      : suggestions.length <= 0 ? queryTerms.length && 1
      : this.sugCounter === 1 ? 2 : 0;
    this.sugCounter = matchType = 0;
    queryTerms = null;
    RegexpCache.reset(null);
    RankingUtils.timeAgo = 0;
    func = this.callback || g_requestHandlers.PostCompletions;
    this.mostRecentQuery = this.callback = null;
    func(suggestions, autoSelect && suggestions.length > 0, newMatchType);
  },
  getOffset: function() {
    var str, i;
    offset = queryType = 0;
    if ((i = queryTerms.length) === 0 || (str = queryTerms[i - 1])[0] !== "+") {
      return;
    }
    if ((i = parseInt(str, 10)) >= 0 && '+' + i === str
        && i <= (queryTerms.length > 1 ? 100 : 200)) {
      offset = i;
    } else if (str !== "+") {
      return;
    }
    queryTerms.more = queryTerms.pop();
    queryType = 1;
  },
  protoRe: /(?:^|\s)__proto__(?=$|\s)/g,
  MultiCompleter: function(completers) { this.completers = completers; },
  rsortByRelevancy: function(a, b) { return b.relevancy - a.relevancy; }
};

  Completers.MultiCompleter.prototype.filter = function(query, options, callback) {
    autoSelect = false;
    queryTerms = query ? query.split(Utils.spacesRe) : [];
    maxCharNum = options.clientWidth > 0 ? Math.min((
        (options.clientWidth * 0.8 - 74) / 7.72) | 0, 200) : 128;
    maxTotal = maxResults = Math.min(Math.max(options.maxResults | 0, 3), 25);
    showRelevancy = options.showRelevancy === true;
    Completers.callback = callback;
    var _this = null, ref, str;
    if (queryTerms.length >= 1 && queryTerms[0].length === 2 && queryTerms[0][0] === ":") {
      str = queryTerms[0][1];
      ref = window.Completers;
      _this = str === "b" ? ref.bookm : str === "h" ? ref.history : str === "t" ? ref.tab
        : str === "d" ? ref.domain : str === "s" ? ref.search : str === "o" ? ref.omni : null;
      if (_this) {
        queryTerms.shift();
        autoSelect = _this !== ref.omni;
      }
    }
    return Completers.filter((_this || this).completers);
  };

  RankingUtils = {
    Match2: function(s1, s2) {
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
    _reduceLength: function(p, c) {
      return p - c.length;
    },
    scoreTerm: function(term, string) {
      var count = 0, nonMatching, score = 0;
      nonMatching = string.split(RegexpCache.item(term));
      if (nonMatching.length > 1) {
        score = this.anywhere;
        count = nonMatching.reduce(this._reduceLength, string.length);
        if (RegexpCache.get(term, "\\b", "").test(string)) {
          score += this.startOfWord;
          if (RegexpCache.get(term, "\\b", "\\b").test(string)) {
            score += this.wholeWord;
          }
        }
      }
      return [score, count < string.length ? count : string.length];
    },
    wordRelevancy: function(url, title) {
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
      if (!title) {
        return urlScore;
      }
      titleScore = titleScore / this.maxScoreP * this.normalizeDifference(titleCount, title.length);
      return (urlScore < titleScore) ? titleScore : ((urlScore + titleScore) / 2);
    },
    timeCalibrator: 1814400000, // 21 days
    timeAgo: 0,
    recencyScore: function(lastAccessedTime) {
      var score = Math.max(0, lastAccessedTime - this.timeAgo) / this.timeCalibrator;
      return score * score * this.recCalibrator;
    },
    normalizeDifference: function(a, b) {
      var max = Math.max(a, b);
      return (max - Math.abs(a - b)) / max;
    }
  };

  RegexpCache = {
    _cache: null,
    reset: function(obj) {
      this._cache = obj !== undefined ? obj : Object.create(null);
    },
    escapeRe: Utils.escapeAllRe,
    get: function(s, p, n) {
      var r = p + s.replace(this.escapeRe, "\\$&") + n, v;
      return (v = this._cache)[r] || (v[r] = new RegExp(r, Utils.upperRe.test(s) ? "" : "i"));
    },
    item: function(s) {
      return this._cache[s] || (this._cache[s] = new RegExp(
        s.replace(this.escapeRe, "\\$&"), Utils.upperRe.test(s) ? "" : "i"));
    }
  };

  HistoryCache = {
    size: 20000,
    lastRefresh: 0,
    updateCount: 0,
    toRefreshCount: 0,
    history: null,
    _callbacks: null,
    use: function(callback) {
      if (this._callbacks) {
        this._callbacks.push(callback);
        return;
      }
      this._callbacks = [callback];
      chrome.history.search({
        text: "",
        maxResults: this.size,
        startTime: 0
      }, function(history) {
        setTimeout(HistoryCache.Clean, 100, history);
      });
    },
    Clean: function(arr) {
      var _this = HistoryCache, i = arr.length, j;
      _this.Clean = null;
      while (0 <= --i) {
        j = arr[i];
        arr[i] = {
          lastVisitTime: j.lastVisitTime,
          text: j.url,
          title: j.title,
          url: j.url
        };
      }
      setTimeout(function() {
        var _this = HistoryCache;
        _this.history.sort(function(a, b) { return a.url < b.url ? -1 : 1; });
        _this.lastRefresh = Date.now();
        chrome.history.onVisitRemoved.addListener(_this.OnVisitRemoved);
        chrome.history.onVisited.addListener(_this.OnPageVisited);
      }, 100);
      setTimeout(Decoder.decodeList, 500, arr);
      _this.history = arr;
      _this.use = function(callback) { callback(this.history); };
      setTimeout(function(ref) {
        var i, arr = HistoryCache.history;
        for (i = 0; i < ref.length; i++) {
          (0, ref[i])(arr);
        }
      }, 17, _this._callbacks);
      _this._callbacks = null;
    },
    OnPageVisited: function(newPage) {
      var _this = HistoryCache, i = _this.binarySearch(newPage.url, _this.history), j;
      if (i < 0) { _this.toRefreshCount++; }
      if (_this.updateCount++ > 99) { _this.refreshInfo(); }
      if (i >= 0) {
        j = _this.history[i];
        j.lastVisitTime = newPage.lastVisitTime;
        newPage.title && (j.title = newPage.title);
        return;
      }
      j = {
        lastVisitTime: newPage.lastVisitTime,
        text: null,
        title: newPage.title,
        url: newPage.url
      };
      j.text = Decoder.decodeURL(newPage.url, j);
      _this.history.splice(-1 - i, 0, j);
    },
    OnVisitRemoved: function(toRemove) {
      var _this = HistoryCache;
      if (toRemove.allHistory) {
        _this.history = [];
        return;
      }
      var bs = _this.binarySearch, h = _this.history, arr = toRemove.urls, j, i;
      for (j = arr.length; 0 <= --j; ) {
        i = bs(arr[j], h);
        if (i >= 0) {
          h.splice(i, 1);
        }
      }
    },
    refreshInfo: function() {
      var i = Date.now();
      if (this.toRefreshCount <= 0) {}
      else if (this.lastRefresh + 1000 > i) { return; }
      else setTimeout(chrome.history.search, 50, {
        text: "",
        maxResults: Math.min(2000, this.updateCount + 10),
        startTime: this.lastRefresh
      }, this.OnInfo);
      this.lastRefresh = i;
      this.toRefreshCount = this.updateCount = 0;
      Decoder.continueToWork();
    },
    OnInfo: function(history) {
      var arr = HistoryCache.history, bs = HistoryCache.binarySearch, i, len, info, j, item;
      if (arr.length <= 0) { return; }
      for (i = 0, len = history.length; i < len; i++) {
        info = history[i];
        j = bs(info.url, arr);
        if (j < 0) { continue; }
        item = arr[i];
        item.title !== info.title && item.title && (item.title = info.title);
      }
    },
    binarySearch: function(u, a) {
      var e = "", h = a.length - 1, l = 0, m = 0;
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

  Decoder = {
    _f: decodeURIComponent, // core function
    decodeURL: null,
    decodeList: function(a) {
      var i = -1, j, l = a.length, d = Decoder, f = d._f, s, t, m = d.dict, w = d.todos;
      for (; ; ) {
        try {
          while (++i < l) {
            j = a[i], s = j.url;
            if (s.length >= 400) { j.text = s; continue; }
            t = f(s);
            j.text = t !== s ? t : s;
          }
          break;
        } catch (e) {
          j.text = m[s] || (w.push(j), s);
        }
      }
      d.continueToWork();
    },
    dict: Object.create(null),
    todos: [], // each item is either {url: ...} or "url"
    _ind: -1,
    continueToWork: function() {
      if (this.todos.length === 0 || this._ind !== -1) { return; }
      var xhr = new XMLHttpRequest();
      xhr.onload = this.OnXHR;
      this._ind = 0;
      this.init && this.init();
      setTimeout(this.Work, 17, xhr);
    },
    Work: function(xhr) {
      var _this = Decoder, url, str, text;
      if (_this.todos.length <= _this._ind) {
        _this.todos = [];
        _this._ind = -1;
        return;
      }
      while (url = _this.todos[_this._ind]) {
        str = url.url || url;
        if (text = _this.dict[str]) {
          url.url && (url.text = text);
          _this._ind++;
          continue;
        }
        xhr.open("GET", _this._dataUrl + str, true);
        xhr.send();
        break;
      }
    },
    OnXHR: function() {
      var _this = Decoder, url, str, text = this.responseText;
      url = _this.todos[_this._ind++];
      if (str = url.url) {
        _this.dict[str] = url.text = text;
      } else {
        _this.dict[url] = text;
      }
      _this.Work(this);
    },
    _dataUrl: "",
    init: function() {
      Settings.updateHooks.localeEncoding = function(charset) {
        Decoder._dataUrl = "data:text/plain;charset=" + charset + ",";
      };
      Settings.postUpdate("localeEncoding");
      this.init = null;
    }
  };

  (function() {
    var d = Decoder.dict, f = Decoder._f, t = Decoder.todos;
    Decoder.decodeURL = function(a, o) {
      if (a.length >= 400) { return a; }
      try {
        return f(a);
      } catch (e) {
        return d[a] || (t.push(o || a), a);
      }
    };
  })();

  Settings.get("tinyMemory") || setTimeout(function() {
    HistoryCache.history || queryTerms || HistoryCache.use(function() {
      queryTerms || setTimeout(function() {
        setTimeout(function() {
          Completers.bookmarks.refresh && Completers.bookmarks.refresh();
        }, 250);
        var domainsCompleter = Completers.domains;
        if (!domainsCompleter.refresh || queryTerms) { return; }
        domainsCompleter.refresh(HistoryCache.history);
      }, 750);
    });
  }, 30000);

  window.Completers = {
    bookm: new Completers.MultiCompleter([Completers.bookmarks]),
    domain: new Completers.MultiCompleter([Completers.domains]),
    history: new Completers.MultiCompleter([Completers.history]),
    omni: new Completers.MultiCompleter([Completers.searchEngines, Completers.domains
      , Completers.history, Completers.bookmarks]),
    search: new Completers.MultiCompleter([Completers.searchEngines]),
    tab: new Completers.MultiCompleter([Completers.tabs])
  };

}, 200);

setTimeout(function() {
  Settings.postUpdate("searchEngines", null);
}, 300);
