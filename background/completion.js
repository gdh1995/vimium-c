"use strict";
var Completers;
setTimeout(function() {
  var TabRecency, HistoryCache, RankingUtils, RegexpCache, Decoder,
      Completers, cmdType,
      maxCharNum, maxResults, showFavIcon, queryTerms, SuggestionUtils;

  function Suggestion(type, url, text, title, computeRelevancy, extraData) {
    this.type = type;
    this.url = url;
    this.text = text || url;
    this.title = title || "";
    this.relevancy = computeRelevancy(this, extraData);
  }

SuggestionUtils = {
  PrepareHtml: function(sug) {
    if (sug.textSplit) { return; }
    var _this = SuggestionUtils;
    sug.titleSplit = _this.highlight(sug.title, _this.getRanges(sug.title));
    var str = sug.text = _this.shortenUrl(sug.text);
    sug.textSplit = _this.cutUrl(str, _this.getRanges(str), sug.url);
    if (showFavIcon && !sug.favIconUrl && sug.url.indexOf("://") > 0) {
      str = Utils.escapeAttr(sug.url);
      sug.favIconUrl = str && ("/" + str);
    }
  },
  highlight: function(string, ranges) {
    var _i, out, start, end;
    if (ranges.length === 0) { return Utils.escapeText(string); }
    out = [];
    for(_i = 0, end = 0; _i < ranges.length; _i += 2) {
      start = ranges[_i];
      out.push(Utils.escapeText(string.substring(end, start)));
      end = ranges[_i + 1];
      out.push("<span class=\"OSTitle\">");
      out.push(Utils.escapeText(string.substring(start, end)));
      out.push("</span>");
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
    for(i = 0, lenCut = 0, end = 0; i < ranges.length; i += 2) {
      start = ranges[i];
      temp = (end >= cutStart) ? end : cutStart;
      if (temp + 20 > start) {
        out.push(Utils.escapeText(string.substring(end, start)));
      } else {
        out.push(Utils.escapeText(string.substring(end, temp + 10)));
        out.push("...");
        out.push(Utils.escapeText(string.substring(start - 6, start)));
        lenCut += start - temp - 19;
      }
      end = ranges[i + 1];
      out.push("<span class=\"OSUrl\">");
      out.push(Utils.escapeText(string.substring(start, end)));
      out.push("</span>");
    }
    temp = maxCharNum + lenCut;
    if (string.length <= temp) {
      out.push(Utils.escapeText(string.substring(end)));
    } else {
      out.push(Utils.escapeText(string.substring(end,
        (temp - 3 > end) ? (temp - 3) : (end + 10))));
      out.push("...");
    }
    return out.join("");
  }
};

TabRecency = {
  array: null,
  clean: null,
  tabId: null,
  stamp: function() {
    var cache = Object.create(null), last = 0, stamp = 1, time = 0;
    chrome.tabs.onActivated.addListener(function(activeInfo) {
      var now = Date.now(), tabId = activeInfo.tabId;
      if (now - time > 500) {
        cache[last] = ++stamp;
        if (stamp === 255) { TabRecency.clean(); }
      }
      last = tabId; time = now;
    });
    this.clean = function() {
      var ref = cache, i;
      for (i in ref) {
        if (ref[i] <= 192) { delete ref[i]; }
        else {ref[i] -= 191; }
      }
      stamp = 64;
    };
    chrome.tabs.query({currentWindow: true, active: true}, function(tab) {
      time = Date.now();
      if (chrome.runtime.lastError) { return chrome.runtime.lastError; }
      last = tab.id;
    });
    this.array = cache;
    this.tabId = function() { return last; };
    this.stamp = function() { return stamp; };
  }
};

Completers = {
bookmarks: {
  bookmarks: null,
  currentSearch: null,
  currentOffset: 0,
  path: "",
  filter: function(query) {
    var offset = Completers.getOffset(99, 4);
    if (offset < 0 || cmdType === 4 && queryTerms.length === 0) { return false; }
    if (this.bookmarks) {
      this.performSearch(query, offset);
      return;
    }
    if (queryTerms.length === 0) {
      Completers.next([]);
    } else {
      this.currentSearch = query;
      this.currentOffset = offset;
    }
    if (this.refresh) {
      this.refresh();
    }
  },
  StartsWithSlash: function(str) { return str.charCodeAt(0) === 47; },
  performSearch: function(query, offset) {
    var c, results, name;
    if (queryTerms.length === 0) {
      results = [];
    } else {
      name = queryTerms.some(this.StartsWithSlash) ? "path" : "title";
      c = this.computeRelevancy;
      results = this.bookmarks.filter(function(i) {
        return RankingUtils.Match2(i.text, i[name]);
      }).map(function(i) {
        return new Suggestion("bookm", i.url, i.text, i[name], c);
      });
      if (offset > 0) {
        results.sort(Completers.rsortByRelevancy);
        results = results.slice(offset, maxResults);
      }
    }
    Completers.next(results);
  },
  refresh: function() {
    var bookmarks = chrome.bookmarks, listener, _this = this;
    listener = function() {
      chrome.bookmarks.getTree(function(tree) { _this.readTree(tree); });
    };
    bookmarks.onCreated.addListener(listener);
    bookmarks.onRemoved.addListener(listener);
    bookmarks.onChanged.addListener(listener);
    bookmarks.onMoved.addListener(listener);
    bookmarks.onImportBegan.addListener(function() {
      chrome.bookmarks.onCreated.removeListener(listener);
    });
    bookmarks.onImportEnded.addListener(function() {
      chrome.bookmarks.onCreated.addListener(listener);
    });
    this.refresh = null;
    this.traverseBookmark = this.traverseBookmark.bind(this);
    bookmarks.getTree(function(bookmarks) {
      _this.readTree(bookmarks);
      var query = _this.currentSearch;
      _this.currentSearch = null;
      if (query && !query.isOff) {
        _this.performSearch(query, _this.currentOffset);
      }
    });
  },
  readTree: function(bookmarks) {
    this.bookmarks = [];
    bookmarks.forEach(this.traverseBookmark);
    Decoder.decodeList(this.bookmarks);
  },
  ignoreTopLevel: {
    "Bookmarks Bar": 1,
    "Mobile Bookmarks": 1,
    "Other Bookmarks": 1,
    "\u4E66\u7B7E\u680F": 1,
    "\u5176\u4ED6\u4E66\u7B7E": 1
  },
  traverseBookmark: function(bookmark) {
    var path = this.path;
    bookmark.path = !bookmark.title ? "" : path ? (path + '/' + bookmark.title)
      : (bookmark.title in this.ignoreTopLevel) ? "" : ('/' + bookmark.title);
    if (bookmark.children) {
      this.path = bookmark.path;
      bookmark.children.forEach(this.traverseBookmark);
      this.path = path;
    } else {
      this.bookmarks.push(bookmark);
    }
  },
  computeRelevancy: function(suggestion) {
    return RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
  }
},

history: {
  filter: function(query) {
    var _this = this, history = HistoryCache.history, offset;
    offset = Completers.getOffset(queryTerms.length > 1 ? 99 : 50, 2);
    if (offset < 0) { return false; }
    if (queryTerms.length > 0) {
      if (history) {
        Completers.next(this.quickSearch(history, offset));
      } else {
        HistoryCache.use(function(history) {
          if (query.isOff) { return; }
          Completers.next(Completers.history.quickSearch(history, offset));
        });
      }
      return;
    }
    chrome.sessions.getRecentlyClosed(null, function(sessions) {
      if (query.isOff) { return; }
      var historys = [], arr = {}, i = 0, now = Date.now();
      sessions.some(function(item) {
        var entry = item.tab;
        if (!entry || entry.url in arr) { return; }
        entry.lastVisitTime = now + 60000 - i * 1000;
        arr[entry.url] = 1;
        ++i > offset && historys.push(entry);
        return historys.length >= maxResults;
      }) ? _this.filterFinish(historys, query) :
      _this.filterFill(historys, query, arr, offset - i);
    });
    if (! history) {
      setTimeout(function() {
        HistoryCache.use(function() {});
      }, 50);
    }
  },
  quickSearch: function(history, offset) {
    var maxNum = (maxResults + offset) * 2, results = new Array(maxNum), sug,
    query = queryTerms, regexps = [], len = history.length, i, len2, j, s1,
    score, item, getRele = this.computeRelevancy;
    for (j = maxNum; 0 <= --j; ) {
      results[j] = 0.0;
    }
    maxNum -= 2;
    // inline version of RankingUtils.Match2
    for (j = len2 = queryTerms.length; 0 <= --j; ) {
      regexps.push(RegexpCache.get(query[j], "", ""));
    }
    for (i = 0; i < len; ++i) {
      item = history[i];
      for (j = 0; j < len2; ++j) {
        if (!(regexps[j].test(item.text) || regexps[j].test(item.title))) { break; }
      }
      if (j !== len2) { continue; }
      score = getRele(item.text, item.title, item.lastVisitTime);
      if (results[maxNum] >= score) { continue; }
      j = maxNum - 2;
      if (results[j] >= score) {
        results[maxNum] = score;
        results[maxNum + 1] = item;
        continue;
      }
      results.length = maxNum;
      for (; 0 <= (j -= 2); ) {
        if (results[j] >= score) { break; }
      }
      if (j >= 0) {
        results.splice(j, 0, score, item);
      } else {
        results.unshift(score, item);
      }
    }
    getRele = this.getRelevancy0;
    for (i = offset * 2, j = 0; i <= maxNum; i += 2) {
      score = results[i];
      if (score <= 0) { break; }
      item = results[i + 1];
      sug = results[j++] = new Suggestion("history", item.url, item.text, item.title, getRele);
      sug.relevancy = score;
    }
    results.length = j;
    return results;
  },
  filterFill: function(historys, query, arr, offset) {
    var _this = this;
    chrome.history.search({
      text: "",
      maxResults: (Math.max(0, offset) + maxResults) * 3
    }, function(historys2) {
      if (query.isOff) { return; }
      var a = arr;
      historys2 = historys2.filter(function(i) {
        return !(i.url in a);
      });
      historys = offset < 0 ? historys.concat(historys2)
        : offset == 0 ? historys2 : historys2.slice(offset);
      _this.filterFinish(historys, query);
    });
  },
  filterFinish: function(historys, query) {
    var s = Suggestion, c = this.computeRelevancyByTime, d = Decoder.decodeURL;
    historys.sort(this.rsortByLvt);
    if (historys.length > maxResults) {
      historys.length = maxResults;
    }
    historys.forEach(function(e, i, arr) {
      var o = new s("history", e.url, d(e.url), e.title, c, e.lastVisitTime);
      e.sessionId && (o.sessionId = e.sessionId);
      arr[i] = o;
    });
    Completers.next(historys);
    Decoder.continueToWork();
  },
  rsortByLvt: function(a, b) {
    return b.lastVisitTime - a.lastVisitTime;
  },
  getRelevancy0: function() { return 0; },
  computeRelevancy: function(text, title, lastVisitTime) {
    var recencyScore = RankingUtils.recencyScore(lastVisitTime),
      wordRelevancy = RankingUtils.wordRelevancy(text, title);
    return recencyScore <= wordRelevancy ? wordRelevancy : (wordRelevancy + recencyScore) / 2;
  },
  computeRelevancyByTime: function(suggestion, lastVisitTime) {
    return RankingUtils.recencyScore(lastVisitTime);
  }
},

domains: {
  domains: null,
  filter: function(query) {
    if (queryTerms.length !== 1 || queryTerms[0].indexOf("/") !== -1) {
      Completers.next([]);
    } else if (this.domains) {
      this.performSearch(query);
    } else {
      var _this = this;
      HistoryCache.use(function(history) {
        _this.populateDomains(history);
        if (query.isOff) { return; }
        _this.performSearch(query);
      });
    }
  },
  performSearch: function(query) {
    var ref = this.domains, domain, q = queryTerms, word = q[0]
      , sug, wordRelevancy, score, result = "", result_score = -1000;
    queryTerms = [word];
    for (domain in ref) {
      if (domain.indexOf(word) === -1) { continue; }
      score = RankingUtils.recencyScore(ref[domain][0]);
      wordRelevancy = RankingUtils.wordRelevancy(domain, null);
      score = score <= wordRelevancy ? wordRelevancy : (wordRelevancy + score) / 2;
      if (score > result_score) { result_score = score; result = domain; }
    }
    if (result) {
      sug = new Suggestion("domain", (ref[result][2]
          ? "https://" + result : result), result, null, this.computeRelevancy);
      sug.titleSplit = "";
      sug.textSplit = SuggestionUtils.cutUrl(result, SuggestionUtils.getRanges(result), sug.url);
    }
    queryTerms = q;
    Completers.next(sug ? [sug] : []);
  },
  populateDomains: function(history) {
    var callback = this.onPageVisited.bind(this);
    this.domains = Object.create(null);
    history.forEach(callback);
    chrome.history.onVisited.addListener(callback);
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
      _this.domains = {};
      return;
    }
    var domains = _this.domains, parse = _this.parseDomainAndScheme,
    arr = toRemove.urls, j = arr.length, item, entry;
    while (0 <= --j) {
      item = parse(arr[j]);
      if (item && (entry = domains[item[0]]) && (-- entry[1]) <= 0) {
        delete domains[item[0]];
      }
    };
  },
  parseDomainAndScheme: function(url) {
    var d, i;
    if (url.startsWith("http://")) { d = 7; }
    else if (url.startsWith("https://")) { d = 8; }
    else { return null; }
    i = url.indexOf('/', d);
    return [url.substring(d, i > 0 ? i : undefined), d - 7];
  },
  computeRelevancy: function() {
    return 2;
  }
},

tabs: {
  filter: function(query) {
    chrome.tabs.query({}, this.filter1.bind(this, query));
  },
  filter1: function(query, tabs) {
    if (query.isOff) { return; }
    var curTabId = TabRecency.tabId(), c, suggestions, offset;
    offset = Completers.getOffset(99, 3);
    if (offset < 0) { return; }
    if (queryTerms.length > 0) {
      tabs = tabs.filter(function(tab) {
        var text = Decoder.decodeURL(tab.url);
        if (RankingUtils.Match2(text, tab.title)) {
          tab.text = text;
          ++offset;
          return true;
        }
        return false;
      });
      c = this.computeRelevancy;
    } else {
      c = this.computeRecency;
    }
    suggestions = tabs.map(function(tab) {
      var tabId = tab.id, suggestion = new Suggestion("tab",
            tab.url, tab.text, tab.title, c, tabId);
      suggestion.sessionId = tabId;
      if (showFavIcon) {
        suggestion.favIconUrl = Utils.escapeAttr(tab.favIconUrl);
      }
      if (curTabId === tabId) { suggestion.relevancy = 0; }
      return suggestion;
    });
    if (suggestions.length > maxResults) {
      suggestions.sort(Completers.rsortByRelevancy);
      suggestions = suggestions.slice(offset, offset + maxResults);
    } else if (offset < suggestions.length) {
      suggestions = suggestions.slice(offset).concat(suggestions.slice(0, offset));
    }
    Completers.next(suggestions);
    Decoder.continueToWork();
  },
  computeRecency: function(_0, sessionId) {
    return TabRecency.array[sessionId] || 1;
  },
  computeRelevancy: function(suggestion) {
    return RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
  }
},

searchEngines: {
  filter: function(query, failIfNull) {
    var obj, sug, q = queryTerms, keyword, pattern, promise;
    if (q.length === 0 || cmdType !== 0) {}
    else if ((keyword = q[0])[0] === "\\") {
      cmdType = -1;
      q[0] = keyword.substring(1);
      keyword = q.join(" ");
      sug = this.makeUrlSuggestion(keyword, "\\" + keyword);
      Completers.next([sug]);
      return;
    } else {
      pattern = Settings.cache.searchEngineMap[keyword];
    }
    if (!pattern) {
      if (failIfNull !== true) {
        Completers.next([]);
      }
      return true;
    }
    cmdType = 1;
    if (q.length > 1) {
      q.shift();
    } else {
      q = [];
    }

    obj = Utils.createSearch(q, pattern, []);
    sug = new Suggestion("search", obj.url, ""
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
          if (this.filter(query, true) !== true) {
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
  computeRelevancy: function() {
    return 9;
  }
},

  counter: 0,
  mostRecentQuery: null,
  callback: null,
  filter: function(completers) {
    RegexpCache.clear();
    RankingUtils.timeAgo = Date.now() - RankingUtils.timeCalibrator;
    if (this.mostRecentQuery) { this.mostRecentQuery.isOff = true; }
    var query = this.mostRecentQuery = {
      isOff: false
    }, i, l;
    cmdType = 0;
    this.suggestions = [];
    for (i = 0, l = this.counter = completers.length; i < l; i++) {
      if (completers[i].filter(query) === false) {
        break;
      }
    }
  },
  next: function(newSuggestions) {
    var suggestions, func;
    suggestions = this.suggestions.length === 0 ? newSugs
      : newSugs.length > 0 ? this.suggestions.concat(newSugs) : this.suggestions;
    if (0 < --this.counter) {
      this.suggestions = suggestions;
      return;
    }
    
    this.suggestions = null;
    suggestions.sort(this.rsortByRelevancy);
    if (suggestions.length > maxResults) {
      suggestions.length = maxResults;
    }
    if (queryTerms.length > 0) {
      queryTerms[0] = SuggestionUtils.shortenUrl(queryTerms[0]);
    }
    suggestions.forEach(SuggestionUtils.PrepareHtml);
    queryTerms = null;
    func = this.callback || g_requestHandlers.PostCompletions;
    this.mostRecentQuery = this.callback = null;
    func(suggestions);
  },
  getOffset: function(max, newType) {
    var str, offset;
    if (cmdType !== 0) { return 0; }
    if ((offset = queryTerms.length) === 0 || (str = queryTerms[offset - 1])[0] !== "+") {}
    else if ((offset = parseInt(str, 10)) >= 0 && offset <= max && '+' + offset === str) {
      cmdType = newType;
      queryTerms.pop();
      return offset;
    } else if (str === "+") {
      this.suggestions = this.mostRecentQuery = this.callback = queryTerms = null;
      return -1;
    }
    cmdType = -1;
    return 0;
  },
  MultiCompleter: function(completers) { this.completers = completers; },
  rsortByRelevancy: function(a, b) { return b.relevancy - a.relevancy; }
};

  Completers.MultiCompleter.prototype.filter = function(query, options, callback) {
    queryTerms = query;
    maxCharNum = options.clientWidth > 0 ? Math.min((
        (options.clientWidth * 0.8 - 70) / 7.72) | 0, 200) : 100
    maxResults = Math.min(Math.max(options.maxResults | 0, 5), 25);
    showFavIcon = options.showFavIcon;
    Completers.callback = callback;
    Completers.filter(this.completers);
  };

  RankingUtils = {
    Match2: function(s1, s2) {
      var i = queryTerms.length, cache = RegexpCache, regexp;
      while (0 <= --i) {
        regexp = cache.get(queryTerms[i], "", "");
        if (!(regexp.test(s1) || regexp.test(s2))) { return false; }
      }
      return true;
    },
    anywhere: 1,
    startOfWord: 1,
    wholeWord: 1,
    maximumScore: 3,
    recCalibrator: 2.0 / 3.0,
    _reduceLength: function(p, c) {
      return p - c.length;
    },
    scoreTerm: function(term, string) {
      var count, nonMatching, score;
      score = 0;
      count = 0;
      nonMatching = string.split(RegexpCache.get(term, "", ""));
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
      var c, maximumPossibleScore, s, term, titleCount, titleScore
        , urlCount, urlScore, _i = queryTerms.length, _ref;
      urlScore = titleScore = 0.0;
      urlCount = titleCount = 0;
      while (0 <= --_i) {
        term = queryTerms[_i];
        _ref = this.scoreTerm(term, url); s = _ref[0]; c = _ref[1];
        urlScore += s; urlCount += c;
        if (title) {
          _ref = this.scoreTerm(term, title); s = _ref[0]; c = _ref[1];
          titleScore += s; titleCount += c;
        }
      }
      maximumPossibleScore = this.maximumScore * queryTerms.length + 0.01;
      urlScore = urlScore / maximumPossibleScore
          * this.normalizeDifference(urlCount, url.length);
      if (!title) {
        return urlScore;
      }
      titleScore = titleScore / maximumPossibleScore
          * this.normalizeDifference(titleCount, title.length);
      return (urlScore < titleScore) ? titleScore : ((urlScore + titleScore) / 2);
    },
    timeCalibrator: 604800000, // 7 days
    timeAgo: 0,
    recencyScore: function(lastAccessedTime) {
      var score = Math.max(0, lastAccessedTime - this.timeAgo) / this.timeCalibrator;
      return score * score * score * this.recCalibrator;
    },
    normalizeDifference: function(a, b) {
      var max = Math.max(a, b);
      return (max - Math.abs(a - b)) / max;
    }
  };

  window.RegexpCache = RegexpCache = {
    _cache: null,
    clear: function() {
      this._cache = Object.create(null);
    },
    escapeRe: Utils.escapeAllRe,
    get: function(s, p, n) {
      var r = p + s.replace(this.escapeRe, "\\$&") + n, v;
      return (v = this._cache)[r] || (v[r] = new RegExp(r, Utils.upperRe.test(s) ? "" : "i"));
    }
  };

  HistoryCache = {
    size: 20000,
    history: null,
    callbacks: [],
    use: function(callback) {
      if (this.history) {
        callback(this.history);
      } else {
        this.fetchHistory(callback);
      }
    },
    fetchHistory: function(callback) {
      this.callbacks.push(callback);
      if (this.callbacks.length > 1) {
        return;
      }
      var _this = this;
      chrome.history.search({
        text: "",
        maxResults: this.size,
        startTime: 0
      }, function(history) {
        history.sort(function(a, b) { return a.url.localeCompare(b.url); });
        Decoder.decodeList(history);
        _this.history = history;
        chrome.history.onVisited.addListener(_this.onPageVisited.bind(_this));
        chrome.history.onVisitRemoved.addListener(_this.OnVisitRemoved);
        for (var i = 0, len = _this.callbacks.length, callback; i < len; ++i) {
          callback = _this.callbacks[i];
          callback(_this.history);
        }
        _this.callbacks = [];
      });
    },
    onPageVisited: function(newPage) {
      var i = this.binarySearch(newPage.url, this.history);
      if (i >= 0) {
        var old = this.history[i];
        this.history[i] = newPage;
        if (old.text !== old.url) {
          newPage.text = old.text;
          return;
        }
      } else {
        this.history.splice(-1 - i, 0, newPage);
      }
      Decoder.decodeList([newPage]);
    },
    OnVisitRemoved: function(toRemove) {
      var _this = HistoryCache;
      if (toRemove.allHistory) {
        _this.history = null;
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
    binarySearch: function(u, a) {
      var e, h = a.length - 1, l = 0, m = 0;
      while (l <= h) {
        m = Math.floor((l + h) / 2);
        e = a[m].url.localeCompare(u);
        if (e > 0) { h = m - 1; }
        else if (e < 0) { l = m + 1; }
        else { return m; }
      }
      e = a[m].url;
      if (e < u) { return -2 - m; }
      return -1 - m;
    }
  };

  Decoder = {
    _f: decodeURIComponent, // core function
    decodeURL: null,
    decodeList: function(a) {
      var i = -1, j, l = a.length, d = Decoder, f = d._f;
      for (; ; ) {
        try {
          while (++i < l) {
            j = a[i];
            j.text = f(j.url);
          }
          break;
        } catch (e) {
          j.text = d.dict[j.url] || (d.todos.push(j), j.url);
        }
      }
      d.continueToWork();
    },
    dict: {},
    todos: [], // each item is either {url: ...} or "url"
    _timer: 0,
    charset: "GBK",
    working: -1,
    interval: 25,
    continueToWork: function() {
      if (this._timer === 0 && this.todos.length > 0) {
        this._timer = setInterval(this.Work, this.interval);
      }
    },
    Work: function() {
      var _this = Decoder, url, text;
      if (_this.working === -1) {
        _this.init();
        _this.working = 0;
      }
      if (! _this.todos.length) {
        clearInterval(_this._timer);
        _this._timer = 0;
        _this._link.href = "";
      } else if (_this.working === 0) {
        url = _this.todos[0];
        if (url.url) {
          url = url.url;
        }
        if (_this.dict[url]) {
          _this.todos.shift();
        } else {
          _this.working = 1;
          _this._link.href = "data:text/css;charset=" + _this.charset + ",%23" + _this._id //
            + "%7Bfont-family%3A%22" + url + "%22%7D";
        }
      } else if (_this.working === 1) {
        text = window.getComputedStyle(_this._div).fontFamily;
        url = _this.todos.shift();
        if (url.url) {
          _this.dict[url.url] = url.text = text = text.substring(1, text.length - 1);
        } else {
          _this.dict[url] = text = text.substring(1, text.length - 1);
        }
        _this.working = 0;
        _this.Work();
      }
    },
    _id: "_decode",
    _link: null,
    _div: null,
    init: function() {
      var link = this._link = document.createElement('link'),
          div = this._div = document.createElement('div');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      div.id = this._id;
      div.style.display = 'none';
      document.body.appendChild(link);
      document.body.appendChild(div);
    }
  };
  
  setTimeout(function() {
    (function() {
      var d = Decoder.dict, f = Decoder._f, t = Decoder.todos;
      Decoder.decodeURL = function(a) {
        try {
          return f(a);
        } catch (e) {
          return d[a] || (t.push(a), a);
        }
      };
    })();

    TabRecency.stamp();

    var lang;
    if (lang = Settings.get("UILanguage")) {
      var ref = lang.urlCode;
      if (ref && typeof ref === "string") {
        Decoder.charset = ref;
      }
      ref = lang.bookmarkTypes;
      if (ref && ref.length > 0) {
        var i = ref.length, ref2 = Completers.bookmarks.ignoreTopLevel;
        ref.sort().reverse();
        for (; 0 <= --i; ) {
          ref2[ref[i]] = 1;
        }
      }
    }

    setTimeout(function() {
      queryTerms || HistoryCache.history || HistoryCache.use(function(history) {
        queryTerms || setTimeout(function() {
          var domainsCompleter = Completers.domains;
          if (queryTerms || domainsCompleter.domains) { return; }
          domainsCompleter.populateDomains(history);
        }, 50);
      });
    }, 30000);
  }, 100);

  window.Completers = {
    bookmarks: new Completers.MultiCompleter([Completers.bookmarks]),
    history: new Completers.MultiCompleter([Completers.history]),
    omni: new Completers.MultiCompleter([Completers.searchEngines, Completers.domains
      , Completers.bookmarks, Completers.history]),
    tabs: new Completers.MultiCompleter([Completers.tabs])
  };
  Object.setPrototypeOf(window.Completers, null);

  Utils.Decoder = Decoder;

}, 200);

