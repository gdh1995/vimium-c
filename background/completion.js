"use strict";
var Completers;
setTimeout(function() {
  var TabRecency, HistoryCache, RankingUtils, RegexpCache, Decoder,
      Completers,
      maxCharNum = 160, showFavIcon, queryTerms = null, SuggestionUtils;

  function Suggestion(type, url, text, title, computeRelevancy, extraData) {
    this.type = type;
    this.url = url;
    this.text = text || url;
    this.title = title || "";
    this.relevancy = 0;
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
      url.length - +(url.charCodeAt(url.length - 1) === 47));
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
  Array: null,
  clean: null,
  tabId: null,
  stamp: function() {
    var cache = Utils.makeNullProto(), last = 0, stamp = 1, time = 0;
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
    this.Array = cache;
    this.tabId = function() { return last; };
    this.stamp = function() { return stamp; };
  }
};

Completers = {
bookmarks: {
  bookmarks: null,
  currentSearch: null,
  path: "",
  filter: function(query) {
    if (this.bookmarks) {
      this.performSearch(query);
      return;
    }
    if (queryTerms.length === 0) {
      query.onComplete([]);
    } else {
      this.currentSearch = query;
    }
    if (this.refresh) {
      this.refresh();
    }
  },
  StartsWithSlash: function(str) { return str.charCodeAt(0) === 47; },
  performSearch: function(query) {
    var c, results, name;
    if (queryTerms.length === 0) {
      results = [];
    } else {
      name = queryTerms.some(this.StartsWithSlash) ? "path" : "title";
      c = this.computeRelevancy;
      results = this.bookmarks.filter(function(i) {
        return RankingUtils.match2(i.text, i[name]);
      }).map(function(i) {
        return new Suggestion("bookm", i.url, i.text, i[name], c);
      });
    }
    query.onComplete(results);
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
        _this.performSearch(query);
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
    var _this = this;
    if (queryTerms.length > 0) {
      HistoryCache.use(function(history) {
        if (query.isOff) { return; }
        var cr = _this.computeRelevancy;
        query.onComplete(history.filter(function(entry) {
          return RankingUtils.match2(entry.text, entry.title);
        }).map(function(i) {
          return new Suggestion("history", i.url, i.text, i.title, cr, i.lastVisitTime);
        }));
      });
      return;
    }
    chrome.sessions.getRecentlyClosed(null, function(sessions) {
      if (query.isOff) { return; }
      var historys = [], arr = {};
      sessions.forEach(function(entry) {
        if (!entry.tab || entry.tab.url in arr) { return; }
        entry.tab.lastVisitTime = entry.lastModified * 1000 + 60999;
        entry = entry.tab;
        arr[entry.url] = 1;
        historys.push(entry);
      });
      _this.filterFill(historys, query, arr);
    });
    if (! HistoryCache.history) {
      setTimeout(function() {
        HistoryCache.use(function() {});
      }, 50);
    }
  },
  filterFill: function(historys, query, arr) {
    if (historys.length >= Completers.maxResults) {
      this.filterFinish(historys, query);
      return;
    }
    var _this = this;
    chrome.history.search({
      text: "",
      maxResults: Completers.maxResults
    }, function(historys2) {
      if (query.isOff) { return; }
      var a = arr;
      historys2 = historys2.filter(function(i) {
        return !(i.url in a);
      });
      historys = historys.concat(historys2);
      _this.filterFinish(historys, query);
    });
  },
  filterFinish: function(historys, query) {
    var s = Suggestion, c = this.computeRelevancyByTime, d = Decoder.decodeURL;
    historys.sort(this.rsortByLvt);
    historys.length = Completers.maxResults;
    historys.forEach(function(e, i, arr) {
      var o = new s("history", e.url, d(e.url), e.title, c, e.lastVisitTime);
      e.sessionId && (o.sessionId = e.sessionId);
      arr[i] = o;
    });
    query.onComplete(historys);
    Decoder.continueToWork();
  },
  rsortByLvt: function(a, b) {
    return b.lastVisitTime - a.lastVisitTime;
  },
  computeRelevancy: function(suggestion, lastVisitTime) {
    var recencyScore = RankingUtils.recencyScore(lastVisitTime),
      wordRelevancy = RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
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
      query.onComplete([]);
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
    query.onComplete(sug ? [sug] : []);
  },
  populateDomains: function(history) {
    var callback = this.onPageVisited.bind(this);
    this.domains = Utils.makeNullProto();
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
    var domains = _this.domains, parse = _this.parseDomainAndScheme;
    toRemove.urls.forEach(function(url) {
      var item = parse(url), entry;
      if (item && (entry = domains[item[0]]) && (-- entry[1]) <= 0) {
        delete domains[item[0]];
      }
    });
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
    var curTabId = TabRecency.tabId(), c, suggestions;
    if (queryTerms.length > 0) {
      tabs = tabs.filter(function(tab) {
        var text = Decoder.decodeURL(tab.url);
        if (RankingUtils.match2(text, tab.title)) {
          tab.text = text;
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
    query.onComplete(suggestions);
    Decoder.continueToWork();
  },
  computeRecency: function(_0, sessionId) {
    return TabRecency.Array[sessionId] || 1;
  },
  computeRelevancy: function(suggestion) {
    return RankingUtils.wordRelevancy(suggestion.text, suggestion.title);
  }
},

searchEngines: {
  filter: function(query) {
    var obj, sug, q = queryTerms, keyword, pattern;
    if (q.length === 0) {}
    else if ((keyword = q[0])[0] === "\\") {
      q[0] = keyword.substring(1);
    } else {
      pattern = Settings.get("searchEngineMap")[keyword];
    }
    if (!pattern) {
      query.onComplete([]);
      return;
    }
    if (q.length > 1) {
      q.shift();
    } else {
      q = [];
    }
    obj = Utils.createSearch(q, pattern, []);
    sug = new Suggestion("search", obj.url, ""
      , pattern.name + ": " + q.join(" "), this.computeRelevancy);
    if (keyword !== "~") {
      sug.url = Utils.convertToUrl(obj.url, null, true);
    }
    if (q.length > 0) {
      this.makeText(obj);
      sug.textSplit = SuggestionUtils.highlight(sug.text = obj.url, obj.indexes);
      sug.titleSplit = SuggestionUtils.highlight(sug.title
        , [pattern.name.length + 2, sug.title.length]);
    } else {
      sug.text = Utils.DecodeURLPart(SuggestionUtils.shortenUrl(obj.url));
      sug.textSplit = Utils.escapeText(sug.text);
      sug.titleSplit = Utils.escapeText(sug.title);
    }
    query.onComplete([sug]);
  },
  makeText: function(obj) {
    var url = obj.url, arr = obj.indexes, len = arr.length, i, str, ind;
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
      if (url.charCodeAt(url.length - 1) === 47) {
        url = url.substring(0, url.length - 1);
      }
      str += url;
    }
    obj.url = str;
  },
  computeRelevancy: function() {
    return 9;
  }
},

  counter: 0,
  maxResults: 10,
  mostRecentQuery: null,
  filter: function(completers, onComplete) {
    RegexpCache.clear();
    RankingUtils.timeAgo = Date.now() - RankingUtils.timeCalibrator;
    this.onComplete = onComplete;
    if (this.mostRecentQuery) { this.mostRecentQuery.isOff = true; }
    var query = this.mostRecentQuery = {
      isOff: false,
      onComplete: null
    }, i, l;
    query.onComplete = this.next.bind(this, query, onComplete);
    this.suggestions = [];
    for (i = 0, l = this.counter = completers.length; i < l; i++) {
      completers[i].filter(query);
    }
  },
  next: function(query, onComplete, newSuggestions) {
    if (query.isOff) { return; }
    var suggestions = this.suggestions.concat(newSuggestions);
    if (0 < --this.counter) {
      this.suggestions = suggestions;
      return;
    }
    
    this.mostRecentQuery = this.suggestions = newSuggestions = null;
    suggestions.sort(this.rsortByRelevancy);
    if (suggestions.length > this.maxResults) {
      suggestions.length = this.maxResults;
    }
    if (queryTerms.length > 0) {
      queryTerms[0] = SuggestionUtils.shortenUrl(queryTerms[0]);
    }
    suggestions.forEach(SuggestionUtils.PrepareHtml);
    queryTerms = null;
    onComplete(suggestions);
  },
  MultiCompleter: function(completers) { this.completers = completers; },
  rsortByRelevancy: function(a, b) { return b.relevancy - a.relevancy; }
};

  Completers.MultiCompleter.prototype.filter = function(query, options, onComplete) {
    queryTerms = query;
    maxCharNum = options.clientWidth <= 0 ? 100
      : Math.min(Math.floor((options.clientWidth * 0.8 - 70) / 7.72), 200);
    showFavIcon = options.showFavIcon;
    Completers.filter(this.completers, onComplete);
  };

  RankingUtils = {
    match2: function(s1, s2) {
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

  RegexpCache = {
    _cache: {},
    clear: function() {
      this._cache = {};
    },
    escapeRe: Utils.escapeAllRe,
    get: function(s, p, n) {
      var r = p + s.replace(this.escapeRe, "\\$&") + n, v;
      return (v = this._cache)[r] || (v[r] = new RegExp(r, (this.upperRe.test(s) ? "" : "i")));
    },
    upperRe: Utils.upperRe
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
    onVisitRemoved: function(toRemove) {
      var _this = HistoryCache;
      if (toRemove.allHistory) {
        _this.history = null;
        return;
      }
      var bs = _this.binarySearch, h = _this.history;
      toRemove.urls.forEach(function(url) {
        var i = bs(url, h);
        if (i >= 0) {
          h.splice(i, 1);
        }
      });
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
    window.Completers.__proto__ = null;

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
      if (queryTerms) { return; }
      HistoryCache.use(function(history) {
        if (queryTerms) { return; }
        setTimeout(function() {
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

  Utils.Decoder = Decoder;

  chrome.omnibox && setTimeout(function() {
  var last, firstUrl, lastSuggest, spanRe = /<(\/?)span(?: [^>]+)?>/g,
  defaultSug = { description: "<dim>Open: </dim><url>%s</url>" },
  format = function(sug) {
    var str = sug.textSplit.replace(spanRe, "<$1match>");
    str = "<url>" + str + "</url><dim> - " + Utils.escapeText(sug.title) + "</dim>";
    return {
      content: sug.url,
      description: str
    }
  },
  clean = function() {
    firstUrl = last = null;
    if (lastSuggest) {
      lastSuggest.isOff = true;
      lastSuggest = null;
    }
  },
  onComplete = function(suggest, response) {
    if (!lastSuggest || suggest.isOff) { return; }
    if (response.length === 0 || response[0].type !== "search") {
      firstUrl = "";
      chrome.omnibox.setDefaultSuggestion(defaultSug);
    } else {
      firstUrl = response[0].url;
      var text = response[0].textSplit;
      text = "<url>" + text.replace(spanRe, "<$1match>") + "</url>";
      chrome.omnibox.setDefaultSuggestion({ description: text });
      response.shift();
    }
    response = response.map(format);
    suggest(response);
  };

  chrome.omnibox.onInputChanged.addListener(function(key, suggest) {
    key && (key = key.trim());
    if (key === last) { return; }
    lastSuggest && (lastSuggest.isOff = true);
    last = key;
    lastSuggest = suggest;
    window.Completers.omni.filter(key ? key.split(Utils.spacesRe) : [], {
      clientWidth: 0,
      showFavIcon: false
    }, onComplete.bind(null, suggest));
  });
  chrome.omnibox.onInputEntered.addListener(function(text, disposition) {
    if (text === last && firstUrl) {
      text = firstUrl;
    }
    clean();
    switch (disposition) {
    case "currentTab":
      g_requestHandlers.openUrlInCurrentTab({ url: text });
      break;
    case "newForegroundTab": case "newBackgroundTab":
      chrome.tabs.query({currentWindow: true, active: true},
      g_requestHandlers.openUrlInNewTab.bind(null, {
        active: disposition === "newForegroundTab",
        url: text
      }));
      break;
    }
  });
  chrome.omnibox.onInputCancelled.addListener(clean);
  }, 1000);
}, 200);

