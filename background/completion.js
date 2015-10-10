"use strict";
var Completers;
setTimeout(function() {
  var HistoryCache, RankingUtils, RegexpCache, Decoder, MultiCompleter;

  Completers = {};

  function Suggestion(queryTerms, type, url, text, title, computeRelevancy, extraData) {
    this.queryTerms = queryTerms;
    this.type = type;
    this.url = url;
    this.text = text || url;
    this.title = title || "";
    this.relevancy = 0;
    this.relevancy = computeRelevancy(this, extraData);
  }

  Suggestion.prepareHtml = function(suggestion) {
    if (! suggestion.queryTerms) { return; }
    suggestion.titleSplit = suggestion.highlight1(suggestion.title);
    suggestion.text = Suggestion.shortenUrl(suggestion.text);
    suggestion.textSplit = suggestion.highlight1(suggestion.text);
    delete suggestion.queryTerms;
  };

  Suggestion.shortenUrl = function(url) {
    return url.substring((url.startsWith("http://")) ? 7 : (url.startsWith("https://")) ? 8 : 0,
      url.length - +(url.charCodeAt(url.length - 1) === 47));
  };

  Suggestion.prototype.pushMatchingRanges = function(string, term, ranges) {
    var index = 0, textPosition = 0, matchedEnd,
      splits = string.split(RegexpCache.get(term, "(", ")")),
      _ref = splits.length - 2;
    for (; index <= _ref; index += 2) {
      matchedEnd = (textPosition += splits[index].length) + splits[index + 1].length;
      ranges.push([textPosition, matchedEnd]);
      textPosition = matchedEnd;
    }
  };

  Suggestion.prototype.highlight1 = function(string) {
    var ranges = [], _i, _len, _ref = this.queryTerms;
    for (_i = 0, _len = _ref.length; _i < _len; ++_i) {
      this.pushMatchingRanges(string, _ref[_i], ranges);
    }
    if (ranges.length === 0) {
      return ranges;
    }
    ranges.sort(Suggestion.rsortBy0);
    return this.mergeRanges(ranges);
  };

  Suggestion.rsortBy0 = function(a, b) {
    return b[0] - a[0];
  };

  Suggestion.prototype.mergeRanges = function(ranges) {
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
  };

Completers.bookmarks = {
  bookmarks: null,
  currentSearch: null,
  path: "",
  filter: function(query) {
    if (this.bookmarks) {
      this.performSearch(query);
      return;
    }
    this.currentSearch = query;
    if (this.refresh) {
      this.refresh();
    }
  },
  StartsWithSlash: function(str) { return str.charCodeAt(0) === 47; },
  performSearch: function(query) {
    var q = query.queryTerms, c, results, usePathAndTitle;
    if (q.length === 0) {
      results = [];
    } else {
      c = this.computeRelevancy;
      usePathAndTitle = q.some(this.StartsWithSlash);
      results = this.bookmarks.filter(usePathAndTitle ? function(i) {
        return RankingUtils.match2(q, i.text, i.path);
      } : function(i) {
        return RankingUtils.match2(q, i.text, i.title);
      }).map(usePathAndTitle ? function(i) {
        return new Suggestion(q, "bookm", i.url, i.text, i.path, c);
      } : function(i) {
        return new Suggestion(q, "bookm", i.url, i.text, i.title, c);
      });
    }
    query.onComplete(results);
  },
  refresh: function() {
    var bookmarks = chrome.bookmarks, listener, _this = this;
    listener = function() {
      chrome.bookmarks.getTree(_this.readTree.bind(_this));
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
    return RankingUtils.wordRelevancy(suggestion.queryTerms, suggestion.text, suggestion.title);
  }
};

Completers.history = {
  filter: function(query) {
    var _this = this;
    if (query.queryTerms.length > 0) {
      HistoryCache.use(function(history) {
        if (query.isOff) { return; }
        var queryTerms = query.queryTerms, cr = _this.computeRelevancy;
        query.onComplete(history.filter(function(entry) {
          return RankingUtils.match2(queryTerms, entry.text, entry.title);
        }).map(function(i) {
          return new Suggestion(queryTerms, "history", i.url, i.text, i.title, cr, i.lastVisitTime);
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
    if (historys.length >= MultiCompleter.maxResults) {
      this.filterFinish(historys, query);
      return;
    }
    var _this = this;
    chrome.history.search({
      text: "",
      maxResults: MultiCompleter.maxResults
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
    query.onComplete(historys.sort(this.rsortByLvt).slice(0, MultiCompleter.maxResults).map(function(e) {
      var o = new s([], "history", e.url, d(e.url), e.title, c, e.lastVisitTime);
      e.sessionId && (o.sessionId = e.sessionId);
      return o;
    }));
    Decoder.continueToWork();
  },
  rsortByLvt: function(a, b) {
    return b.lastVisitTime - a.lastVisitTime;
  },
  computeRelevancy: function(suggestion, lastVisitTime) {
    var recencyScore = RankingUtils.recencyScore(lastVisitTime),
      wordRelevancy = RankingUtils.wordRelevancy(suggestion.queryTerms, suggestion.text, suggestion.title);
    return recencyScore <= wordRelevancy ? wordRelevancy : (wordRelevancy + recencyScore) / 2;
  },
  computeRelevancyByTime: function(suggestion, lastVisitTime) {
    return RankingUtils.recencyScore(lastVisitTime);
  }
};

Completers.domains = {
  domains: null,
  filter: function(query) {
    if (query.queryTerms.length !== 1 || query.queryTerms[0].indexOf("/") !== -1) {
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
    var ref = this.domains, domain, word = query.queryTerms[0], terms = [word]
      , wordRelevancy, score, result = "", result_score = -1000;
    for (domain in ref) {
      if (domain.indexOf(word) === -1) { continue; }
      score = RankingUtils.recencyScore(ref[domain][0]);
      wordRelevancy = RankingUtils.wordRelevancy(terms, domain, null);
      score = score <= wordRelevancy ? wordRelevancy : (wordRelevancy + score) / 2;
      if (score > result_score) { result_score = score; result = domain; }
    }
    if (!result) {
      query.onComplete([]);
      return;
    }
    query.onComplete([new Suggestion(terms, "domain", (ref[result][2]
        ? "https://" + result : result), result, null, this.computeRelevancy)]);
  },
  populateDomains: function(history) {
    var callback = this.onPageVisited.bind(this);
    this.domains = {};
    history.forEach(callback);
    chrome.history.onVisited.addListener(callback);
    chrome.history.onVisitRemoved.addListener(this.onVisitRemoved.bind(this));
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
  onVisitRemoved: function(toRemove) {
    if (toRemove.allHistory) {
      this.domains = {};
      return;
    }
    var domains = this.domains, parse = this.parseDomainAndScheme;
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
};

Completers.tabs = {
  filter: function(query) {
    chrome.tabs.query({}, this.filter1.bind(this, query));
  },
  filter1: function(query, tabs) {
    if (query.isOff) { return; }
    var queryTerms = query.queryTerms;
    var c = this.computeRelevancy, suggestions = tabs.filter(function(tab) {
      var text = Decoder.decodeURL(tab.url);
      if (RankingUtils.match2(queryTerms, text, tab.title)) {
        tab.text = text;
        return true;
      }
      return false;
    }).map(function(tab) {
      var suggestion = new Suggestion(queryTerms, "tab", tab.url, tab.text, tab.title, c);
      suggestion.sessionId = tab.id;
      suggestion.favIconUrl = tab.favIconUrl;
      return suggestion;
    });
    query.onComplete(suggestions);
    Decoder.continueToWork();
  },
  computeRelevancy: function(suggestion) {
    return RankingUtils.wordRelevancy(suggestion.queryTerms, suggestion.text, suggestion.title);
  }
};

Completers.searchEngines = {
  engines: Settings.get("searchEnginesMap"),
  filter: function(query) {
    var queryTerms = query.queryTerms, obj, sug, text
      , pattern = queryTerms.length > 0 ? this.engines[queryTerms[0]] : null;
    if (!pattern) {
      query.onComplete([]);
      return;
    }
    if (queryTerms.length > 1) {
      queryTerms.shift();
    } else {
      queryTerms = [];
    }
    obj = Utils.createSearchUrl(pattern, queryTerms, true);
    text = Utils.decodeURLPart(Suggestion.shortenUrl(obj.url));
    sug = new Suggestion(null, "search", obj.url, text
      , pattern.name + ": " + obj.$S, this.computeRelevancy);
    if (queryTerms.length > 0) {
      sug.titleSplit = [pattern.name.length + 2, sug.title.length];
      text = Utils.decodeURLPart(Suggestion.shortenUrl(pattern.url
        ).replace(Utils.searchWordRe, this.encodeSearchKey));
      sug.textSplit = this.splitText(obj, sug.text, text);
    } else {
      sug.textSplit = sug.titleSplit = [];
    }
    query.onComplete([sug]);
  },
  encodeSearchKey: function(str) { return "%25" + str.substring(1); },
  splitText: function(obj, text, template) {
    var arr = template.split(Utils.searchWordRe), start = 0, ret = [];
    arr.pop();
    arr.forEach(function(str) {
      start += str.length;
      var end = start + obj["$" + template.substring(start + 1, start + 2)].length;
      ret.push(start, end);
      start = end;
    });
    return ret;
  },
  computeRelevancy: function() {
    return 9;
  }
};
Settings.updateHooks.searchEnginesMap = (function(prev, value) {
  prev.call(Settings, value);
  this.engines = value;
}).bind(Completers.searchEngines, Settings.updateHooks.searchEnginesMap);

MultiCompleter = {
  counter: 0,
  generator: null,
  maxResults: 10,
  mostRecentQuery: null,
  filter: function(completers, queryTerms, onComplete) {
    RegexpCache.clear();
    this.onComplete = onComplete;
    if (this.mostRecentQuery) { this.mostRecentQuery.isOff = true; }
    var query = this.mostRecentQuery = {
      isOff: false,
      onComplete: null,
      queryTerms: queryTerms
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
      suggestions = suggestions.slice(0, this.maxResults);
    }
    var queryTerms = query.queryTerms;
    if (queryTerms.length > 0) {
      queryTerms[0] = Suggestion.shortenUrl(queryTerms[0]);
    }
    suggestions.forEach(Suggestion.prepareHtml);
    onComplete(suggestions);
  },
  rsortByRelevancy: function(a, b) { return b.relevancy - a.relevancy; }
};

  MultiCompleter.generator = function(completers) {
    this.completers = completers;
  };
  MultiCompleter.generator.prototype.filter = function(queryTerms, onComplete) {
    MultiCompleter.filter(this.completers, queryTerms, onComplete);
  };
  MultiCompleter.generator.prototype.refresh = function() {
    for (var completer, _i = this.completers.length; 0 <= --_i; ) {
      if ((completer = this.completers[_i]).refresh) {
        completer.refresh();
      }
    }
  };

  RankingUtils = {
    match2: function(queryTerms, s1, s2) {
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
    wordRelevancy: function(queryTerms, url, title) {
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
    timeCalibrator: 1000 * 60 * 60 * 24,
    timeAgo: Date.now() - 1000 * 60 * 60 * 24,
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
    reset: function() {
      this.history = null;
      this.callbacks = [];
    },
    use: function(callback) {
      if (! this.history) {
        this.fetchHistory(callback);
        return;
      }
      callback(this.history);
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
        chrome.history.onVisitRemoved.addListener(_this.onVisitRemoved.bind(_this));
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
      if (toRemove.allHistory) {
        this.reset();
        return;
      }
      var bs = this.binarySearch, h = this.history;
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

    var lang = Settings.get("UILanguage");
    if (!lang || !(lang = lang[chrome.i18n.getUILanguage()])) {
      return;
    }
    var ref = lang.urlCharset;
    if (ref && typeof ref === "string") {
      Decoder.charset = ref;
    }
    ref = lang.bookmarkTitles;
    if (ref && ref.length > 0) {
      var i = ref.length, ref2 = Completers.bookmarks.completers[0].ignoreTopLevel;
      ref.sort().reverse();
      for (; 0 <= --i; ) {
        ref2[ref[i]] = 1;
      }
    }
  }, 100);

  Completers = {
    bookmarks: new MultiCompleter.generator([Completers.bookmarks]),
    history: new MultiCompleter.generator([Completers.history]),
    omni: new MultiCompleter.generator([Completers.searchEngines, Completers.bookmarks, Completers.history, Completers.domains]),
    tabs: new MultiCompleter.generator([Completers.tabs])
  };

  Utils.Decoder = Decoder;

}, 200);