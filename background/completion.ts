import {
  bookmarkCache_, Completion_, os_, CurCVer_, curTabId_, curWndId_, historyCache_, OnChrome, OnFirefox,
  blank_, recencyForTab_, searchEngines_, evalVimiumUrl_, OnEdge, CONST_
} from "./store"
import { browser_, getGroupId, getTabUrl, isTabMuted } from "./browser"
import * as BgUtils_ from "./utils"
import { convertToUrl_, lastUrlType_, createSearch_ } from "./normalize_urls"
import { fixCharsInUrl_ } from "./parse_urls"
import { transEx_ } from "./i18n"
import {
  MatchCacheManager_, RankingEnums, RegExpCache_, requireNormalOrIncognitoTabs_, TabEx, sync_queryTerms_,
  tabsInNormal, setupQueryTerms, clearTabsInNormal_, TimeEnums, WritableTabEx, ComputeRecency, ComputeRelevancy,
  ComputeWordRelevancy, get2ndArg, match2_, prepareHTML_, getWordRelevancy_, cutTitle, highlight, shortenUrl, sortBy0,
  calcBestFaviconSource_only_cr_, SearchKeywords_, sync_maxScoreP_, sync_timeAgo_, maxScoreP_
} from "./completion_utils"
import {
  BlockListFilter_, BookmarkManager_, UrlDecoder_, HistoryManager_, TestNotBlocked_, getRecentSessions_, BrowserUrlItem,
  omniBlockList_
} from "./browsing_data_manager"

import MatchType = CompletersNS.MatchType;
import SugType = CompletersNS.SugType;
import HistoryItem = CompletersNS.HistoryItem
import BookmarkStatus = CompletersNS.BookmarkStatus
import kVisibility = CompletersNS.kVisibility

type Domain = CompletersNS.Domain;

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

type SearchSuggestion = CompletersNS.SearchSuggestion;


let matchType: MatchType = MatchType.plain,
    autoSelect = false, isForAddressBar = false,
    otherFlags = CompletersNS.QueryFlags.None,
    maxResults = 0, maxTotal = 0, matchedTotal = 0, offset = 0,
    queryTerms: string[] = [""], rawInput = "", rawMode = "", rawQuery = "", rawMore = "",
    rawComponents = CompletersNS.QComponent.NONE,
    mayRawQueryChangeNextTime_ = false,
    wantInCurrentWindow = false,
    historyUrlToSkip = "", bookmarkUrlToSkip = "",
    allExpectedTypes = SugType.Empty,
    showThoseInBlocklist = true;

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

const bookmarkEngine = {
  checkRevoked_ (isFirst?: boolean): true | void {
    if (bookmarkCache_.status_ === BookmarkStatus.revoked
        && !(allExpectedTypes & (SugType.MultipleCandidates ^ SugType.kBookmark))) {
      Promise.resolve(transEx_("bookmarksRevoked", [])).then((msg: string): void => {
        const sug = new Suggestion("bookm", CONST_.OptionsPage_ + "#optionalPermissions", "", msg, get2ndArg
            , isFirst ? 8 : 1.9)
        sug.textSplit = "\u2026"
        Completers.next_([sug], SugType.kBookmark)
      })
      return true
    }
  },
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if (queryTerms.length === 0) {
      if (!index && bookmarkCache_.status_ === BookmarkStatus.notInited) {
        BookmarkManager_.onLoad_ = (): void => {
          if (!query.o) { bookmarkEngine.checkRevoked_() || Completers.next_([], SugType.kBookmark) }
        }
      } else {
        bookmarkEngine.checkRevoked_(index == 0) || Completers.next_([], SugType.kBookmark)
        return
      }
    } else if (!(allExpectedTypes & SugType.kBookmark)) {
      Completers.next_([], SugType.kBookmark)
      if (index) { return; }
    } else if (bookmarkCache_.status_ >= BookmarkStatus.inited) {
      bookmarkEngine.performSearch_();
    } else {
      BookmarkManager_.onLoad_ = (): void => { if (!query.o) { bookmarkEngine.performSearch_() } }
    }
    bookmarkCache_.status_ === BookmarkStatus.notInited && BookmarkManager_.refresh_()
  },
  performSearch_ (): void {
    const isPath = queryTerms.some(str => str.charCodeAt(0) === kCharCode.slash),
    oldCache = MatchCacheManager_.current_?.bookmarks_,
    newCache = MatchCacheManager_.newMatch_ ? [] as CompletersNS.Bookmark[] : null,
    arr = oldCache && oldCache[0] === isPath ? oldCache[1] : bookmarkCache_.bookmarks_,
    len = arr.length;
    let results: Array<[number, number]> = [], resultLength: number;
    if (bookmarkEngine.checkRevoked_()) { return }
    for (let ind = 0; ind < len; ind++) {
      const i = arr[ind];
      const title = isPath ? i.path_ : i.title_;
      if (!match2_(i.t, title)) { continue }
      if (showThoseInBlocklist || i.visible_) {
        newCache !== null && newCache.push(i)
        if (bookmarkUrlToSkip && i.u.length < bookmarkUrlToSkip.length + 2
            && bookmarkUrlToSkip === (i.u.endsWith("/") ? i.u.slice(0, -1) : i.u)) {
          continue;
        }
        results.push([-getWordRelevancy_(i.t, i.title_), ind])
      }
    }
    if (newCache) {
      MatchCacheManager_.newMatch_!.bookmarks_ = [isPath, newCache]
    }
    resultLength = results.length;
    matchedTotal += resultLength;
    if (!resultLength) {
      allExpectedTypes ^= SugType.kBookmark
    } else {
      results.sort(sortBy0);
      if (offset > 0 && !(allExpectedTypes & (SugType.MultipleCandidates ^ SugType.kBookmark))) {
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
      const historyIdx = otherFlags & CompletersNS.QueryFlags.ShowTime
          && HistoryManager_.sorted_ ? HistoryManager_.binarySearch_(i.u) : -1
      sug.visit = historyIdx < 0 ? 0 : historyCache_.history_![historyIdx].time_
      results2.push(sug);
      if (i.jsUrl_ === null) { continue; }
      (sug as CompletersNS.WritableCoreSuggestion).u = (i as CompletersNS.JSBookmark).jsUrl_
      sug.title = cutTitle(isPath ? i.path_ : i.title_)
      sug.textSplit = "javascript: \u2026";
      sug.t = (i as CompletersNS.JSBookmark).jsText_
    }
    Completers.next_(results2, SugType.kBookmark)
  }
},

historyEngine = {
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if ((!queryTerms.length && otherFlags & CompletersNS.QueryFlags.NoSessions)
        || !(allExpectedTypes & SugType.kHistory)) { return Completers.next_([], SugType.kHistory) }
    const history = historyCache_.history_, someQuery = queryTerms.length > 0
    if (history) {
      if (someQuery) {
        historyEngine.performSearch_()
        return
      }
      if (historyCache_.updateCount_ > 10 || historyCache_.toRefreshCount_ > 0) {
        HistoryManager_.refreshInfo_()
      }
    } else {
      const loadAllHistory: Parameters<typeof HistoryManager_.use_>[0] = !someQuery ? null : (): void => {
        query.o || historyEngine.performSearch_()
      };
      if (someQuery && (isForAddressBar || HistoryManager_.loadingTimer_)) {
        HistoryManager_.loadingTimer_ > 0 && clearTimeout(HistoryManager_.loadingTimer_)
        HistoryManager_.loadingTimer_ = 0
        HistoryManager_.use_(loadAllHistory)
      } else {
        if (!HistoryManager_.loadingTimer_) {
          HistoryManager_.loadingTimer_ = setTimeout((): void => {
            HistoryManager_.loadingTimer_ = 0
            HistoryManager_.use_(loadAllHistory)
          }, someQuery ? 200 : 150);
        }
        if (someQuery) {
          const curAll = Completers.suggestions_!, len = curAll.length, someMatches = len > 0;
          Completers.callback_!(someMatches && curAll[0].t === "search" ? [curAll[0]] : []
              , autoSelect && someMatches, MatchType.Default, SugType.Empty, len, rawMode, rawComponents)
        }
      }
      if (someQuery) { return; }
    }
    if (index === 0) {
      requireNormalOrIncognitoTabs_(wantInCurrentWindow, otherFlags, historyEngine.loadTabs_, query)
    } else {
      getRecentSessions_(offset + maxResults, showThoseInBlocklist, historyEngine.loadSessions_.bind(null, query))
    }
  },
  performSearch_ (): void {
    const firstTerm = queryTerms.length === 1 ? queryTerms[0] : "",
    onlyUseTime = firstTerm ? (firstTerm[0] === "." ? (<RegExpOne> /^\.[\da-zA-Z]+$/).test(firstTerm) ? 2 : 0
      : (convertToUrl_(firstTerm, null, Urls.WorkType.KeepAll),
         lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl ? lastUrlType_ > Urls.Type.Full ? 2 : 1 : 0)
    ) : 0,
    firstTermRe = onlyUseTime > 1 ? RegExpCache_.parts_[0] : null,
    newCache = MatchCacheManager_.newMatch_ ? [] as HistoryItem[] : null,
    results = [-1.1, -1.1], sugs: Suggestion[] = [], Match2 = match2_,
    isEncodedURL = onlyUseTime > 0 && firstTerm.includes("%")&&!(<RegExpOne>/[^\x21-\x7e]|%[^A-F\da-f]/).test(firstTerm)
    let maxNum = maxResults + offset, curMinScore = -1.1, i = 0, j = 0, matched = 0
    historyUrlToSkip && maxNum++;
    for (j = maxNum; --j; ) { results.push(-1.1, -1.1); }
    maxNum = maxNum * 2 - 2;
    const history: readonly Readonly<HistoryItem>[] = MatchCacheManager_.current_?.history_ || historyCache_.history_!
    for (const len = history.length; i < len; i++) {
      const item = history[i];
      if (onlyUseTime === 0 ? Match2(item.t, item.title_)
          : onlyUseTime === 1 ? (isEncodedURL ? item.u : item.t).startsWith(firstTerm)
          : firstTermRe!.test(isEncodedURL ? item.u : item.t)) {
        if (showThoseInBlocklist || item.visible_) {
          newCache !== null && newCache.push(item)
          matched++;
          const score = onlyUseTime ? ComputeRecency(item.time_) || /* < 0.0002 */ 1e-16 * Math.max(0, item.time_)
              : ComputeRelevancy(item.t, item.title_, item.time_);
          if (score > curMinScore) {
            for (j = maxNum - 2; 0 <= j && results[j] < score; j -= 2) {
              results[j + 2] = results[j], results[j + 3] = results[j + 1];
            }
            results[j + 2] = score;
            results[j + 3] = i;
            curMinScore = results[maxNum];
          }
        }
      }
    }
    if (newCache) {
      MatchCacheManager_.newMatch_!.history_ = newCache
    }
    matchedTotal += matched;
    if (!matched) {
      allExpectedTypes ^= SugType.kHistory
    }
    if (!(allExpectedTypes & (SugType.MultipleCandidates ^ SugType.kHistory))) {
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
        const sug = new Suggestion("history", item.u, isEncodedURL ? item.u : item.t, item.title_, get2ndArg, score)
        sug.visit = item.time_
        sugs.push(sug)
      }
    }
    UrlDecoder_.continueToWork_()
    Completers.next_(sugs, SugType.kHistory)
  },
  loadTabs_ (this: void, query: CompletersNS.QueryStatus, tabs: readonly WritableTabEx[]): void {
    if (query.o) { return; }
    const urlSet = new Set!<string>()
    for (const tab of tabs) {
      tab.incognito && tabsInNormal || urlSet.add(getTabUrl(tab))
    }
    historyEngine.filterFill_([], query, urlSet, offset, urlSet.size)
  },
  loadSessions_ (this: void, query: CompletersNS.QueryStatus, sessions: BrowserUrlItem[]): void {
    if (query.o) { return; }
    const historyArr: BrowserUrlItem[] = [], idSet = new Set!<string>(), urlSet = new Set!<string>()
    let i = -offset;
    sessions.some(function (item): boolean {
      let url = item.u, key: string
      key = url + "\n" + item.title_
      if (idSet.has(key)) { return false }
      idSet.add(key), urlSet.add(url)
      ++i > 0 && historyArr.push(item)
      return historyArr.length >= maxResults;
    }) ? historyEngine.filterFinish_(historyArr) : historyEngine.filterFill_(historyArr, query, urlSet, -i, 0)
  },
  filterFill_ (historyArr: BrowserUrlItem[], query: CompletersNS.QueryStatus, urlSet: Set<string>,
      cut: number, neededMore: number): void {
    ((OnEdge || OnFirefox && Build.MayAndroidOnFirefox) && !browser_.history
        ? ((_, cb) => (cb([], -1), 1)) satisfies typeof browser_.history.search
        : browser_.history.search)({
      text: "",
      maxResults: (offset + maxResults) * (showThoseInBlocklist ? 1 : 2) + neededMore
    }, (rawArr2): void => {
      for (const i of rawArr2) {
        i.url.length>GlobalConsts.MaxHistoryURLLength && (i.url = HistoryManager_.trimURLAndTitleWhenTooLong_(i.url, i))
      }
      historyCache_.history_ && HistoryManager_.OnRefreshedInfo_(rawArr2)
      if (query.o) { return; }
      rawArr2 = rawArr2.filter((i): boolean => {
        let url = i.url;
        return !urlSet.has(url)
            && (showThoseInBlocklist || TestNotBlocked_(i.url, i.title || "") !== kVisibility.hidden)
      })
      if (cut < 0) {
        rawArr2.length = Math.min(rawArr2.length, maxResults - historyArr.length)
      } else if (cut > 0) {
        rawArr2 = rawArr2.slice(cut, cut + maxResults)
      }
      let historyArr2 = rawArr2.map((i): BrowserUrlItem => ({
          u: i.url, title_: i.title || "", visit_: i.lastVisitTime, sessionId_: null, label_: null
      }))
      if (cut < 0) {
        historyArr2 = historyArr.concat(historyArr2);
      }
      historyEngine.filterFinish_(historyArr2);
    });
  },
  filterFinish_: function (historyArr: Array<BrowserUrlItem | Suggestion>): void {
    const MakeSuggestion_ = (e: BrowserUrlItem, i: number, arr: Array<BrowserUrlItem | Suggestion>): void => {
      const u = e.u, o = new Suggestion("history", u, UrlDecoder_.decodeURL_(u, u), e.title_ || "",
          get2ndArg, (99 - i) / 100), sessionId: any = e.sessionId_
      o.visit = e.visit_
      sessionId && (o.s = sessionId, o.label = '<span class="undo">&#8630;</span>' + e.label_!)
      arr[i] = o;
    }
    ; (historyArr as BrowserUrlItem[]).forEach(MakeSuggestion_)
    offset = 0;
    UrlDecoder_.continueToWork_()
    Completers.next_(historyArr as Suggestion[], SugType.kHistory)
  } as (historyArr: BrowserUrlItem[]) => void
},

domainEngine = {
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if (queryTerms.length !== 1
        || !(allExpectedTypes & SugType.domain)
        || queryTerms[0].lastIndexOf("/", queryTerms[0].length - 2) >= 0) {
      return Completers.next_([], SugType.domain);
    }
    if (!HistoryManager_.parseDomains_) { /* empty */ }
    else if (historyCache_.history_) {
      HistoryManager_.parseDomains_(historyCache_.history_)
    } else {
      return index > 0 ? Completers.next_([], SugType.domain) : HistoryManager_.use_((): void => {
        query.o || domainEngine.filter_(query, 0)
      });
    }
    return domainEngine.performSearch_();
  } ,
  performSearch_ (): void {
    const ref = historyCache_.domains_, oldMaxScoreP = maxScoreP_,
    ret_many: Array<{r: number, d: string, m: Domain}> | null =
        allExpectedTypes === SugType.domain && autoSelect ? [] : null, // autoSelect means there's only 1 engine in mode
    word = queryTerms[0].replace("/", "").toLowerCase();
    const addExtraSlash = word.length === queryTerms[0].length
    let sugs: Suggestion[] = [], result = "", matchedDomain: Domain | undefined, result_score = -1.1
    sync_maxScoreP_(RankingEnums.maximumScore)
    if (Build.MinCVer >= BrowserVer.BuildMinForOf && Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        || !(Build.BTypes & BrowserType.Chrome)) {
      for (const domain of (ref as IterableMap<string, Domain>).keys()) {
        if (addExtraSlash ? !domain.includes(word) : !domain.endsWith(word)) { continue }
        matchedDomain = ref.get(domain)!
        if (showThoseInBlocklist || matchedDomain.count_ > 0) {
          const score = ComputeRelevancy(domain, "", matchedDomain.time_)
          ret_many ? ret_many.push({ r: score, d: domain, m: matchedDomain })
          : score > result_score ? (result_score = score, result = domain) : 0
        }
      }
    } else if (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        || CurCVer_ > BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol - 1) {
      const iterator: IterableIterator<string> = (ref as IterableMap<string, Domain>).keys()
      let iter_i: IteratorResult<string> | undefined
      while (iter_i = iterator.next(), !iter_i.done) {
        const domain = iter_i.value
        if (addExtraSlash ? !domain.includes(word) : !domain.endsWith(word)) { continue }
        matchedDomain = ref.get(domain)!
        if (showThoseInBlocklist || matchedDomain.count_ > 0) {
          const score = ComputeRelevancy(domain, "", matchedDomain.time_)
          ret_many ? ret_many.push({ r: score, d: domain, m: matchedDomain })
          : score > result_score ? (result_score = score, result = domain) : 0
        }
      }
    } else {
      for (const domain in (ref as any as SimulatedMap).map_ as any as SafeDict<Domain>) {
        if (addExtraSlash ? !domain.includes(word) : !domain.endsWith(word)) { continue }
        matchedDomain = ref.get(domain)!
        if (showThoseInBlocklist || matchedDomain.count_ > 0) {
          const score = ComputeRelevancy(domain, "", matchedDomain.time_)
          ret_many ? ret_many.push({ r: score, d: domain, m: matchedDomain })
          : score > result_score ? (result_score = score, result = domain) : 0
        }
      }
    }
    let isMainPart = result.length === word.length;
    if (result && !isMainPart) {
      if (!result.startsWith("www.") && !result.startsWith(word)) {
        let r2 = result.slice(result.indexOf(".") + 1);
        if (r2.includes(word)) {
          let d2: Domain | undefined;
          r2 = "www." + r2;
          if (d2 = ref.get(r2)) {
            if (showThoseInBlocklist || d2.count_ > 0) { result = r2; matchedDomain = d2 }
          } else if ((d2 = ref.get(r2 = "m." + r2)) && (showThoseInBlocklist || d2.count_ > 0)) {
            if (showThoseInBlocklist || d2.count_ > 0) { result = r2; matchedDomain = d2 }
          }
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
      autoSelect = !offset && isMainPart || autoSelect
      sugs = domainEngine.createDomainSug_(result, matchedDomain!, 0, addExtraSlash)
    } else if (ret_many) {
      ret_many.sort(domainEngine.rsortByR_)
      matchedTotal = ret_many.length
      if (matchedTotal > offset + maxResults) {
        ret_many.length = offset + maxResults
      }
      for (const i of ret_many) {
        sugs.push(domainEngine.createDomainSug_(i.d, i.m, i.r, addExtraSlash)[0])
      }
    }
    sync_maxScoreP_(oldMaxScoreP)
    Completers.next_(sugs, SugType.domain);
  },
  createDomainSug_ (key: string, matchedDomain: Domain, scoreInMany: number, extraSlash: boolean): Suggestion[] {
      let useHttps = matchedDomain.https_ > 0, title = ""
      if (bookmarkCache_.status_ === BookmarkStatus.inited) {
        const re: RegExpOne = new RegExp(`^https?://${BgUtils_.escapeAllForRe_(key)}/?$`)
        let matchedBookmarks = bookmarkCache_.bookmarks_.filter(
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
      const url = (useHttps ? "https://" : "http://") + key + "/"
      if (!scoreInMany) {
        historyUrlToSkip = url
        if (offset > 0) { offset--; return [] }
      }
        const sug = new Suggestion("domain", url, extraSlash ? key : key + "/", "", get2ndArg, scoreInMany || 2)
        const ind = HistoryManager_.sorted_ ? HistoryManager_.binarySearch_(url) : -1
        const item = ind > 0 ? historyCache_.history_![ind] : null
        prepareHTML_(sug)
        if (item && (showThoseInBlocklist || item.visible_)) {
          sug.visit = item.time_
          title = title || item.title_
        }
        sug.title = cutTitle(title, [])
        --maxResults;
        return [sug]
  },
  rsortByR_: (a: { r: number }, b: { r: number }): number => b.r - a.r
},
kTabMarks: string[] =
    "audible audio muted unmuted active discarded incognito normal pinned visited new grouped ungrouped".split(" "),
tabEngine = {
  filter_ (query: CompletersNS.QueryStatus, index: number): void {
    if (!(allExpectedTypes & SugType.tab)
        || index && (!queryTerms.length || otherFlags & CompletersNS.QueryFlags.NoTabEngine)) {
      Completers.next_([], SugType.tab);
    } else {
      requireNormalOrIncognitoTabs_(wantInCurrentWindow, otherFlags, tabEngine.performSearch_, query)
    }
  },
  performSearch_ (this: void, query: CompletersNS.QueryStatus, tabs0: readonly WritableTabEx[]): void {
    if (query.o) { return; }
    const curTabId = curTabId_, noFilter = queryTerms.length <= 0,
    hasOtherSuggestions = allExpectedTypes & (SugType.MultipleCandidates ^ SugType.tab),
    treeMode = !!(otherFlags & CompletersNS.QueryFlags.TabTree) && wantInCurrentWindow && noFilter;
    let suggestions: CompletersNS.TabSuggestion[] = [];
    let curTab: Tab | undefined, monoNow = 0
    if (treeMode && !(otherFlags & CompletersNS.QueryFlags.TabTreeFromStart)
        && tabs0.length > offset && tabs0.length > maxTotal) {
      const treeMap = new Map<number, Tab>()
      for (const tab of tabs0) { treeMap.set(tab.id, tab) }
      {
        curTab = treeMap.get(curTabId)
        let pId = curTab ? curTab.openerTabId : 0, pTab = pId ? treeMap.get(pId) : null,
        start = pTab ? tabs0.indexOf(pTab) : curTab ? tabs0.indexOf(curTab) - 1 : 0, i = pTab ? 0 : (maxTotal / 2) | 0;
        for (; 1 < --i && start > 0 && tabs0[start - 1].openerTabId === pId; start--) { /* empty */ }
        tabs0 = start > 0 ? tabs0.slice(start).concat(tabs0.slice(0, start)) : tabs0;
      }
    }
    const tabs: TabEx[] = [], wndIds: number[] = [];
    const marks = (queryTerms.join("\n").match(<RegExpG & RegExpSearchable<0>> /^:[a-z]+$/gm) || [])
        .reduce((i, j): number => {
      j = j.slice(1)
      for (let ind = 0; ind < kTabMarks.length; ind++) { if (kTabMarks[ind].startsWith(j)) { i |= 1 << ind } }
      return i
    }, 0)
    curTab = !curTab && marks ? tabs0.filter(i => i.id === curTabId)[0] : curTab
    const groupId = marks && curTab ? getGroupId(curTab) : null
    for (const tab of tabs0) {
      if (!wantInCurrentWindow && tabsInNormal && tab.incognito) { continue }
      const url = getTabUrl(tab)
      let text = tab.text || (tab.text = UrlDecoder_.decodeURL_(url, tab.incognito ? "" : url))
      let title = tab.title
      if (marks) {
        if (queryTerms.length === 1) { text = title = "" }
        if (tab.audible) {
          marks & 1 && (title += " :audible"), marks & 2 && (title += " :audio")
          !(marks & (4 | 8)) ? 0 :
          isTabMuted(tab) ? marks & 4 && (title += " :muted") : marks & 8 && (title += " :unmuted")
        }
        marks & 16 && tab.active && !wantInCurrentWindow && (title += ":active")
        marks & 32 && tab.discarded && (title += " :discarded")
        !(marks & (64 | 128)) ? 0 :
        tab.incognito ? marks & 64 && (title += " :incognito") : marks & 128 && (title += " :normal")
        marks & 0x100 && tab.pinned && (title += " :pinned")
        !(marks & (0x200 | 0x400)) ? 0 :
        recencyForTab_.has(tab.id) ? marks & 0x200 && (title += " :visited") : marks & 0x400 && (title += " :new")
        !(marks & (0x800 | 0x1000)) ? 0
            : groupId && getGroupId(tab) === groupId ? marks & 0x800 && (title += " :grouped")
            : marks & 0x1000 && (title += " :ungrouped")
      }
      if (noFilter || match2_(text, title)) {
        const wndId = tab.windowId;
        !wantInCurrentWindow && wndIds.lastIndexOf(wndId) < 0 && wndIds.push(wndId);
        tabs.push(tab as TabEx);
      }
    }
    if (hasOtherSuggestions && tabs.length === 1 && tabs[0].id === curTabId) {
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

    wndIds.sort((a, b) => a - b)
    const treeLevels = treeMode ? new Map<number, number>() : null as never, curWndId = curWndId_
    if (treeMode) {
      for (const tab of tabs) { // only from start to end, and should not execute nested queries
        const pid = tab.openerTabId, pLevel = pid && treeLevels.get(pid)
        treeLevels.set(tab.id, pLevel
            ? pLevel < GlobalConsts.MaxTabTreeIndent ? pLevel + 1 : GlobalConsts.MaxTabTreeIndent : 1)
      }
    }
    const timeOffset = !(otherFlags & CompletersNS.QueryFlags.ShowTime) ? 0 : BgUtils_.recencyBase_()
    const c = !noFilter ? ComputeWordRelevancy : treeMode ? (_0: unknown, index: number): number => 1 / index
        : (monoNow = performance.now(), (_0: unknown, tabId: number): number => recencyForTab_.get(tabId)
            || (otherFlags & CompletersNS.QueryFlags.PreferNewOpened ? monoNow + tabId : -tabId))
    for (let ind = 0; ind < tabs.length; ) {
      const tab = tabs[ind++]
      const tabId = tab.id, level = treeMode ? treeLevels.get(tabId)! : 1,
      url = getTabUrl(tab),
      visit = recencyForTab_.get(tabId),
      suggestion = new Suggestion("tab", url, tab.text, tab.title,
          c, treeMode ? ind : tabId) as CompletersNS.TabSuggestion;
      let wndId = tab.windowId !== curWndId ? (wndIds.indexOf(tab.windowId) + 1) + ":" : ""
      let id = (tab.index + 1) + "", label = ""
      if (tab.active) {
        treeMode || !(curTabId === tabId || tab.windowId === curWndId) || (suggestion.r = noFilter
            || !(<RegExpG & RegExpSearchable<0>> /^(?!:[a-z]+)/m).test(queryTerms.join("\n")) ? 1<<31 : 0);
        id = `(${id})`
      } else if (!visit) {
        id = `**${id}**`
      }
      if (!tabsInNormal && tab.incognito) { label += "*" }
      if (tab.discarded || OnFirefox && tab.hidden) { label += "~" }
      if (tab.audible) { label += isTabMuted(tab) ? "\u266a" : "\u266c" }
      suggestion.visit = visit ? visit + timeOffset
          : OnFirefox && (tab as Tab & {lastAccessed?: number}).lastAccessed || 0
      suggestion.s = tabId;
      suggestion.label = `#${wndId}${id}${label && " " + label}`
      if (OnFirefox) {
        suggestion.favIcon = tab.favIconUrl;
      }
      if (level > 1) {
        suggestion.level = " level-" + level;
      }
      suggestions.push(suggestion);
    }
    suggestions.sort(Completers.rSortByRelevancy_)
    let resultLength = suggestions.length, exceed = offset + maxResults - resultLength;
    if (hasOtherSuggestions || exceed < 0 || !noFilter) {
      if (offset > 0 && !hasOtherSuggestions) {
        suggestions = suggestions.slice(offset, offset + maxResults);
        resultLength = maxResults;
        offset = 0;
      } else if (resultLength > offset + maxResults) {
        suggestions.length = resultLength = offset + maxResults;
      }
      for (let i = hasOtherSuggestions ? 0 : resultLength, end = Math.min(resultLength, 28); i < end; i++) {
        suggestions[i].r *= 8 / (i / 4 + 1);
      }
      !offset && Completers.suggestions_ && Completers.dedupPreviousAndMergeTo_(suggestions)
    } else if (offset > 0) {
      const exceededArr = suggestions.slice(0, exceed).map(i => Object.assign({} as unknown as typeof i, i))
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
    UrlDecoder_.continueToWork_()
    Completers.next_(suggestions, SugType.tab);
  }
},

searchEngine = {
  _nestedEvalCounter: 0,
  filter_: blank_,
  preFilter_: function (query: CompletersNS.QueryStatus, failIfNull?: true | null
      , oriPattern?: Search.Engine | null | undefined): void | true | Promise<void> {
    if (!(allExpectedTypes & SugType.search)) {
      return Completers.next_([], SugType.search);
    }
    let sug: SearchSuggestion, q = queryTerms, keyword = q.length > 0 ? q[0] : "",
       pattern: Search.Engine | null | undefined;
    if (q.length === 0) { /* empty */ }
    else if (!failIfNull && keyword[0] === "\\" && keyword[1] !== "\\") {
      if (keyword.length > 1) {
        q[0] = keyword.slice(1);
      } else {
        q.shift();
      }
      keyword = rawQuery.slice(1).trimLeft();
      showThoseInBlocklist = !omniBlockList_ || showThoseInBlocklist || BlockListFilter_.IsExpectingHidden_([keyword])
      if (offset) {
        offset--
        return Completers.next_([], SugType.search)
      }
      sug = searchEngine.makeUrlSuggestion_(keyword, oriPattern)
      return Completers.next_([sug], SugType.search);
    } else {
      pattern = searchEngines_.map.get(keyword)
    }
    if (failIfNull) {
      if (!pattern) { return true; }
    } else if (!pattern && !keyword.startsWith("vimium://")) {
      if (matchType === MatchType.plain && q.length <= 1) {
        matchType = q.length ? SearchKeywords_.isPrefix_() ? MatchType.searching_ : MatchType.plain : MatchType.reset
      }
      return Completers.next_([], SugType.search);
    } else {
      if (pattern && rawMore) {
        q.push(rawMore); offset = 0;
        rawQuery += " " + rawMore
        rawMore = ""
        rawComponents &= ~CompletersNS.QComponent.offset
      }
      q.length > 1 || (matchType = MatchType.reset);
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
    showThoseInBlocklist = !omniBlockList_ || showThoseInBlocklist && BlockListFilter_.IsExpectingHidden_([keyword])

    let url: string, indexes: number[], text: string;
    if (pattern) {
      let res = createSearch_(q, pattern.url_, pattern.blank_, [])
      text = url = res.url_; indexes = res.indexes_;
    } else {
      text = url = q.join(" "); indexes = [];
    }
    if (keyword === "~") { /* empty */ }
    else if (url.startsWith("vimium://")) {
      const ret = evalVimiumUrl_(url.slice(9), Urls.WorkType.ActIfNoSideEffects, true)
      const getSug = searchEngine.plainResult_.bind(searchEngine, q, url, text, oriPattern || pattern, indexes);
      if (ret instanceof Promise) {
        return ret.then<void>(searchEngine.onEvalUrl_.bind(searchEngine, query, oriPattern || pattern, getSug));
      } else if (ret instanceof Array) {
        return searchEngine.onEvalUrl_(query, oriPattern || pattern, getSug, ret);
      } else if (ret) {
        url = text = ret; indexes = [];
      }
    } else {
      url = convertToUrl_(url, null, Urls.WorkType.KeepAll)
    }
    sug = searchEngine.plainResult_(q, url, text, oriPattern || pattern, indexes);
    return Completers.next_([sug], SugType.search);
  } as {
    (query: CompletersNS.QueryStatus, failIfNull: true, oriPattern?: Search.Engine | null): void | true | Promise<void>
    (query: CompletersNS.QueryStatus, _?: null, oriPattern?: Search.Engine | null): void | Promise<void>
  },
  onEvalUrl_ (query: CompletersNS.QueryStatus, oriPattern: Search.Engine | null | undefined
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
              : BgUtils_.unicodeRSubstring_(rawQuery, 0, Consts.MaxCharsInQuery).trim()).split(" ")
          if (queryTerms.length > 1) {
            queryTerms[1] = fixCharsInUrl_(queryTerms[1], queryTerms.length > 2)
          }
          sync_queryTerms_(queryTerms)
          return searchEngine.preFilter_(query, null, oriPattern);
    case Urls.kEval.search:
          const newQuery = (ret as Urls.SearchEvalResult)[0];
          queryTerms = newQuery.length > 1 || newQuery.length === 1 && newQuery[0] ? newQuery : queryTerms;
          sync_queryTerms_(queryTerms)
          const counter = searchEngine._nestedEvalCounter++;
          if (counter > 12) { break; }
          const subVal = searchEngine.preFilter_(query, true, oriPattern);
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
      sug.title = cutTitle(sug.title, [pattern.name_.length + 2, sug.title.length]);
      sug.textSplit = highlight(sug.t, indexes);
    } else {
      sug.t = BgUtils_.DecodeURLPart_(shortenUrl(text));
      sug.title = OnFirefox && isForAddressBar ? "" : cutTitle(sug.title, [])
      sug.textSplit = OnFirefox && isForAddressBar ? sug.t : BgUtils_.escapeText_(sug.t)
    }
    sug.v = OnChrome && !isForAddressBar ? pattern && pattern.blank_ || calcBestFaviconSource_only_cr_!(url) : ""
    sug.p = isForAddressBar && pattern ? pattern.name_ : ""
    return sug;
  },
  mathResult_ (stdSug: SearchSuggestion, arr: Urls.MathEvalResult): [SearchSuggestion, Suggestion] {
    const result = arr[0], urlToCopy = "vimium://copy " + result
    const sug = new Suggestion("math", stdSug.u, result, result, get2ndArg, 8)
    ; (stdSug.u satisfies string) = urlToCopy
    if (!(OnFirefox && isForAddressBar)) {
      sug.title = `<match style="text-decoration: none;">${cutTitle(sug.title, [])}<match>`
    }
    sug.textSplit = OnFirefox && isForAddressBar ? arr[2] : BgUtils_.escapeText_(arr[2])
    return [stdSug, sug];
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
  makeUrlSuggestion_ (keyword: string, oriPattern: Search.Engine | null | undefined): SearchSuggestion {
    const url = convertToUrl_(keyword, null, Urls.WorkType.KeepAll),
    isSearch = lastUrlType_ === Urls.Type.Search,
    sug = new Suggestion("search", url, BgUtils_.DecodeURLPart_(shortenUrl(url))
      , "", get2ndArg, 9) as SearchSuggestion;
    sug.title = isSearch ? (oriPattern && oriPattern.name_ || "~") + ": " + cutTitle(keyword, [0, keyword.length])
        : cutTitle(keyword, [])
    sug.textSplit = OnFirefox && isForAddressBar ? sug.t : BgUtils_.escapeText_(sug.t)
    sug.v = !(OnChrome && !isForAddressBar) ? "" : isSearch && oriPattern
        && ((oriPattern.blank_ || oriPattern.url_).startsWith("vimium:") ? CONST_.OptionsPage_ : oriPattern.blank_)
        || calcBestFaviconSource_only_cr_!(url)
    sug.p = isForAddressBar && isSearch ? "~" : ""
    sug.n = 1
    return sug;
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
        void ret.then(Completers._filter2.bind(null, completers, query, i))
        return;
      }
      i = 2;
    }
    Completers._filter2(completers, query, i);
  },
  _filter2 (this: void, completers: readonly Completer[], query: CompletersNS.QueryStatus, i: number): void {
    sync_timeAgo_(Date.now() - TimeEnums.timeCalibrator) // safe for time change
    sync_maxScoreP_(RankingEnums.maximumScore * queryTerms.length || 0.01)
    if (queryTerms.indexOf("__proto__") >= 0) {
      queryTerms = queryTerms.join(" ").replace(<RegExpG> /(^| )__proto__(?=$| )/g, " __proto_").trimLeft().split(" ");
      sync_queryTerms_(queryTerms)
    }
    MatchCacheManager_.update_(showThoseInBlocklist)
    queryTerms.sort(Completers.rSortQueryTerms_);
    RegExpCache_.buildParts_()
    for (; i < completers.length; i++) {
      completers[i].filter_(query, i - 1);
    }
  },
  rSortQueryTerms_ (a: string, b: string): number {
    return b.length - a.length || (a < b ? -1 : a === b ? 0 : 1);
  },
  dedupPreviousAndMergeTo_ (suggestions: Suggestion[]): void {
    const tabSugMap = new Map!<string, Suggestion>(suggestions.map(i => [i.u, i]))
    Completers.suggestions_ = Completers.suggestions_!.filter(i => {
      const mapped = i.e === "search" ? void 0 : tabSugMap.get(i.u)
      mapped && mapped.r < i.r && (mapped.r = i.r)
      return !mapped
    })
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
    RegExpCache_.words_ = RegExpCache_.starts_ = null as never
    if (queryTerms.length > 0) {
      let s0 = queryTerms[0], s1 = shortenUrl(s0), cut = s0.length !== s1.length;
      if (cut || s0.endsWith("/") && s0.length > 1 && !s0.endsWith("//")) {
        cut && (queryTerms[0] = s1)
        RegExpCache_.fixParts_(queryTerms[0], cut)
      }
    }
    suggestions.forEach(prepareHTML_)

    const someMatches = suggestions.length > 0,
    newAutoSelect = autoSelect && someMatches, matched = matchedTotal,
    mayGoToAnotherMode = rawInput === ":",
    newMatchType = matchType < MatchType.plain
        ? matchType === MatchType.searching_ && !someMatches && !mayGoToAnotherMode
          ? MatchType.searchWanted : MatchType.Default
        : !showThoseInBlocklist ? MatchType.Default
        : queryTerms.length <= 0 || mayRawQueryChangeNextTime_ ? MatchType.Default
        : someMatches ? MatchType.someMatches
        : mayGoToAnotherMode ? MatchType.Default
        : MatchType.emptyResult,
    realMode = rawMode, components = rawComponents,
    newSugTypes = newMatchType === MatchType.someMatches && !mayGoToAnotherMode ? Completers.sugTypes_ : SugType.Empty,
    func = Completers.callback_!;
    Completers.clearGlobals_()
    return func(suggestions, newAutoSelect, newMatchType, newSugTypes, matched, realMode, components)
  },
  clearGlobals_ (): void {
    Completers.mostRecentQuery_ = Completers.callback_ = null
    clearTabsInNormal_()
    setupQueryTerms(queryTerms = [], isForAddressBar = false, 0)
    rawInput = rawMode = rawQuery = rawMore = historyUrlToSkip = bookmarkUrlToSkip = "";
    RegExpCache_.parts_ = null as never
    sync_maxScoreP_(RankingEnums.maximumScore), sync_timeAgo_(0)
    matchType = Completers.sugTypes_ = otherFlags = maxResults = maxTotal = matchedTotal = 0
    allExpectedTypes = SugType.Empty;
    rawComponents = CompletersNS.QComponent.NONE
    autoSelect = false
    mayRawQueryChangeNextTime_ = wantInCurrentWindow = false
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
    rawComponents |= CompletersNS.QComponent.offset
  },
  rSortByRelevancy_ (a: Suggestion, b: Suggestion): number { return b.r - a.r; }
},
knownCs = {
  __proto__: null as never,
  bookm: [SugType.kBookmark as never, bookmarkEngine] as CompleterList,
  domain: [SugType.domain as never, domainEngine] as CompleterList,
  history: [SugType.kHistory as never, historyEngine] as CompleterList,
  omni: [SugType.Full as never, searchEngine, domainEngine, historyEngine, bookmarkEngine, tabEngine] as CompleterList,
  search: [SugType.search as never, searchEngine] as CompleterList,
  tab: [SugType.tab as never, tabEngine] as CompleterList
}

Completion_.filter_ = (query: string, options: CompletersNS.FullOptions, callback: CompletersNS.Callback): void => {
    query = query.trim()
    mayRawQueryChangeNextTime_ = false
    if (query && Build.OS & kBOS.WIN && (Build.OS === kBOS.WIN as number || os_ > kOS.MAX_NOT_WIN)
        && ((<RegExpOne> /^[A-Za-z]:[\\/]|^\\\\([\w$%.-]+([\\/]|$))?/).test(query)
            || query.slice(0, 5).toLowerCase() === "file:")) {
      if (":/\\".includes(query[1])) {
        query = (query[1] === ":" ? "" : "//") + query.slice(query[1] === ":" ? 0 : 2).replace(<RegExpG> /\\+/g, "/")
      }
      query = query.replace(<RegExpG> /\\/g, "/").toLowerCase()
      const start = query.indexOf("//") + 2
      if (start >= 2 && start < query.length && query[start] !== "/") {
        const decodedHost = query.slice(start).split("/", 1)[0]
        if (decodedHost.includes("%")) {
          const host2 = BgUtils_.DecodeURLPart_(decodedHost)
          mayRawQueryChangeNextTime_ = host2 === decodedHost
          query = query.slice(0, start) + host2 + query.slice(start + decodedHost.length)
        }
      }
    }
    rawInput = rawQuery = query && query.replace(BgUtils_.spacesRe_, " ");
    rawMode = ""
    rawComponents = CompletersNS.QComponent.NONE
    Completers.getOffset_();
    query = rawQuery;
    queryTerms = query
      ? (query = query.length < Consts.MaxCharsInQuery + 1 ? query
          : BgUtils_.unicodeRSubstring_(query, 0, Consts.MaxCharsInQuery).trimRight()).split(" ")
      : [];
    let maxChars = (options.c! | 0) || 128
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
    let expectedTypes = options.t || SugType.Full, allowedEngines = options.e! || SugType.Full
    if (arr === knownCs.tab) {
       wantInCurrentWindow = !!(otherFlags & CompletersNS.QueryFlags.TabInCurrentWindow);
    }
    if (str.length === 2 && str[0] === ":") {
      str = str[1];
      const newArr = str === "b" ? knownCs.bookm : str === "h" ? knownCs.history
        : str === "t" || str === "T" || str === "w" || str === "W" ? (wantInCurrentWindow = str !== "t" && str !== "T",
            otherFlags |= OnFirefox && str > "Z" ? CompletersNS.QueryFlags.EvenHiddenTabs : 0,
            otherFlags |= str === "T" ? CompletersNS.QueryFlags.IncognitoTabs : 0,
            knownCs.tab)
        : str === "B" ? (otherFlags |= CompletersNS.QueryFlags.PreferBookmarks, knownCs.omni)
        : str === "H" ? (otherFlags |= CompletersNS.QueryFlags.NoTabEngine, knownCs.omni)
        : str === "d" ? knownCs.domain : str === "s" ? knownCs.search : str === "o" ? knownCs.omni : null;
      if (newArr) {
        arr = newArr
        rawMode = queryTerms.shift()!
        rawComponents |= CompletersNS.QComponent.mode
        rawQuery = rawQuery.slice(3);
        allowedEngines = arr[0]
      }
    }
    if (queryTerms.length > 0 && ((str = queryTerms[0]).includes("\u3002") || str.includes("\uff1a"))
        && !mayRawQueryChangeNextTime_) {
      mayRawQueryChangeNextTime_ = queryTerms.length < 2
      let newStr = fixCharsInUrl_(str, mayRawQueryChangeNextTime_)
      if (newStr !== str) {
        queryTerms[0] = newStr
        rawQuery = newStr + rawQuery.slice(str.length)
        // if str looks like an filename extension, then generate a stricter `matchType`
        // - not so correct but the impact is quite little
        mayRawQueryChangeNextTime_ = mayRawQueryChangeNextTime_
            && !(<RegExpOne> /^[.\u3002]\w+([.\u3002]\w*)?$/).test(str)
      } else {
        mayRawQueryChangeNextTime_ = mayRawQueryChangeNextTime_ && str.includes("\uff1a")
            && !(<RegExpOne> /\uff1a([^\/\d]|\d[^\0-\xff])/).test(str)
      }
    }
    showThoseInBlocklist = !omniBlockList_ || BlockListFilter_.IsExpectingHidden_(queryTerms)
    allExpectedTypes = expectedTypes & allowedEngines
    autoSelect = arr.length === 2
    if (rawQuery) {
      rawComponents |= CompletersNS.QComponent.query
    }
    setupQueryTerms(queryTerms, isForAddressBar, maxChars)
    Completers.filter_(arr)
}

if (!Build.NDEBUG) {
  (globalThis as any).Completers = Completers;
  (Completers as any).knownCs = knownCs
}
