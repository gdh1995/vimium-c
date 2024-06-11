import {
  blank_, bookmarkCache_, Completion_, CurCVer_, historyCache_, OnChrome, OnEdge, OnFirefox, urlDecodingDict_,
  set_findBookmark_, findBookmark_, updateHooks_, curWndId_, set_urlDecodingDict_
} from "./store"
import { browser_, runtimeError_, browserSessions_, watchPermissions_, removeTabsOrFailSoon_ } from "./browser"
import * as BgUtils_ from "./utils"
import * as settings_ from "./settings"
import { MatchCacheManager_, MatchCacheType } from "./completion_utils"

import DecodedItem = CompletersNS.DecodedItem
import HistoryItem = CompletersNS.HistoryItem
import Bookmark = CompletersNS.Bookmark
import BookmarkStatus = CompletersNS.BookmarkStatus
import kVisibility = CompletersNS.kVisibility
import Domain = CompletersNS.Domain
import BookmarkNS = chrome.bookmarks
import HistoryNS = chrome.history

declare const enum InnerConsts {
  bookmarkBasicDelay = 1000 * 60, bookmarkFurtherDelay = bookmarkBasicDelay / 2,
  historyMaxSize = 20000,
}
interface UrlDomain { domain_: string; scheme_: Urls.SchemeId }
type ItemToDecode = string | DecodedItem
export interface BrowserUrlItem {
  u: string; title_: string; visit_: number; sessionId_: CompletersNS.SessionId | null, label_: string | null
}

const WithTextDecoder = !OnEdge && (Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !OnChrome
    || CurCVer_ > BrowserVer.MinEnsuredTextEncoderAndDecoder - 1 || !!globalThis.TextDecoder)
const _decodeFunc = decodeURIComponent
let decodingEnabled: boolean | undefined, decodingJobs: ItemToDecode[], decodingIndex = -1, dataUrlToDecode_ = "1"
let charsetDecoder_: TextDecoder | null = null
let omniBlockList_: string[] | null = null, blockListRe_: RegExpOne | null = null, omniBlockPath = false
let titleIgnoreListRe_: RegExpOne | null = null

export { omniBlockList_, titleIgnoreListRe_ }

export const parseDomainAndScheme_ = (url: string): UrlDomain | null => {
  let scheme = url.slice(0, 5), d: Urls.SchemeId, i: number
  if (scheme === "https") { d = Urls.SchemeId.HTTPS }
  else if (scheme === "http:") { d = Urls.SchemeId.HTTP }
  else if (scheme.startsWith("ftp")) { d = Urls.SchemeId.FTP } // Firefox and Chrome doesn't support FTPS
  else { return null }
  i = url.indexOf("/", d)
  url = url.slice(d, i < 0 ? url.length : i)
  return { domain_: OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol && url === "__proto__"
      ? ".__proto__" : url, scheme_: d }
}

const _onBookmarksImport = OnChrome ? [
  (): void => { browser_.bookmarks.onCreated.removeListener(BookmarkManager_.Delay_) },
  (): void => { browser_.bookmarks.onCreated.addListener(BookmarkManager_.Delay_); BookmarkManager_.Delay_() }
] : null
let _onBookmarkPermissionChange = (allowList: (boolean | undefined | null)[]): void => {
  bookmarkCache_.bookmarks_ = []
  bookmarkCache_.dirs_ = []
  BookmarkManager_._didLoad(allowList[0] ? BookmarkStatus.notInited : BookmarkStatus.revoked)
}

export const BookmarkManager_ = {
  currentSearch_: null as CompletersNS.QueryStatus | null,
  _timer: 0,
  _listened: false,
  expiredUrls_: 0 as BOOL,
  onLoad_: null as (() => void) | null,
  _didLoad (newStatus: BookmarkStatus): void {
    const callback = BookmarkManager_.onLoad_
    BookmarkManager_.onLoad_ = null
    bookmarkCache_.status_ = newStatus
    callback && callback()
  },
  Listen_ (): void {
    const bBm = browser_.bookmarks
    if (OnEdge && !bBm.onCreated) { return }
    bBm.onCreated.addListener(BookmarkManager_.Delay_)
    bBm.onRemoved.addListener(BookmarkManager_.Expire_)
    bBm.onChanged.addListener(BookmarkManager_.Expire_)
    bBm.onMoved.addListener(BookmarkManager_.Delay_)
    if (OnChrome) {
      bBm.onImportBegan.addListener(_onBookmarksImport![0])
      bBm.onImportEnded.addListener(_onBookmarksImport![1])
    }
  },
  refresh_ (): void {
    const bBm = browser_.bookmarks
    if (_onBookmarkPermissionChange) {
      watchPermissions_([{ permissions: ["bookmarks"] }], _onBookmarkPermissionChange)
      _onBookmarkPermissionChange = null as never
    }
    if (!bBm) {
      BookmarkManager_._didLoad(BookmarkStatus.revoked)
      return
    }
    bookmarkCache_.status_ = BookmarkStatus.initing
    if (BookmarkManager_._timer) {
      clearTimeout(BookmarkManager_._timer)
      BookmarkManager_._timer = 0
    }
    try {
      bBm.getTree(BookmarkManager_.readTree_)
    } catch { // permission revoked
      BookmarkManager_._didLoad(BookmarkStatus.revoked)
    }
  },
  readTree_ (tree?: BookmarkNS.BookmarkTreeNode[]): void {
    let iterPath_ = "", iterPid_ = "", iterDepth_ = 0
    bookmarkCache_.bookmarks_ = []
    bookmarkCache_.dirs_ = []
    MatchCacheManager_.clear_(MatchCacheType.kBookmarks)
    const traverseBookmark_ = (bookmark: BookmarkNS.BookmarkTreeNode, index: number): void => {
      const rawTitle = bookmark.title, id = bookmark.id
      const title = rawTitle || id, path = iterPath_ + "/" + title
      if (bookmark.children) {
        bookmarkCache_.dirs_.push({ id_: id, path_: path, title_: title })
        const oldPath = iterPath_, oldPid = iterPid_
        if (2 < ++iterDepth_) { iterPath_ = path }
        iterPid_ = id
        bookmark.children.forEach(traverseBookmark_)
        --iterDepth_
        iterPath_ = oldPath
        iterPid_ = oldPid
        return
      }
      const url = bookmark.url!, jsScheme = "javascript:", isJS = url.startsWith(jsScheme)
      bookmarkCache_.bookmarks_.push({
        id_: id, path_: path, title_: title,
        t: isJS ? jsScheme : url,
        visible_: blockListRe_ !== null ? TestNotBlocked_(url, omniBlockPath ? path : rawTitle) : kVisibility.visible,
        u: isJS ? jsScheme : url, pid_: iterPid_, ind_: index,
        jsUrl_: isJS ? url : null, jsText_: isJS ? BgUtils_.DecodeURLPart_(url) : null
      })
    }
    if (!tree) {
      BookmarkManager_._didLoad(BookmarkStatus.revoked)
      return runtimeError_()
    }
    tree.forEach(traverseBookmark_)
    BookmarkManager_._didLoad(BookmarkStatus.inited)
    setTimeout(() => UrlDecoder_.decodeList_(bookmarkCache_.bookmarks_), 50)
    if (!BookmarkManager_._listened) {
      setTimeout(BookmarkManager_.Listen_, 0)
      BookmarkManager_._listened = true
    }
  },
  Delay_ (): void {
  const Later_ = (): void => {
    const last = performance.now() - bookmarkCache_.stamp_
    if (bookmarkCache_.status_ !== BookmarkStatus.notInited) { return }
    if (last >= InnerConsts.bookmarkBasicDelay - 100 || last < -GlobalConsts.ToleranceOfNegativeTimeDelta) {
      BookmarkManager_._timer = BookmarkManager_.expiredUrls_ = 0
      // not remove bookmark URLs from urlDecodingDict_ but load new ones, so that there need less decoding actions
      BookmarkManager_.refresh_()
    } else {
      BookmarkManager_._timer = setTimeout(Later_, InnerConsts.bookmarkFurtherDelay)
    }
  }
    bookmarkCache_.stamp_ = performance.now()
    if (bookmarkCache_.status_ !== BookmarkStatus.inited) { return }
    BookmarkManager_._timer = setTimeout(Later_, InnerConsts.bookmarkBasicDelay)
    bookmarkCache_.status_ = BookmarkStatus.notInited
  },
  Expire_ (
      id: string, info?: BookmarkNS.BookmarkRemoveInfo | BookmarkNS.BookmarkChangeInfo): void {
    const arr = bookmarkCache_.bookmarks_,
    title = info && (info as BookmarkNS.BookmarkChangeInfo).title
    let i = arr.findIndex(j => j.id_ === id)
    if (i >= 0) {
      type WBookmark = Writable<Bookmark>
      const cur = arr[i] as WBookmark, url = cur.u,
      url2 = info && (info as BookmarkNS.BookmarkChangeInfo).url
      if (decodingEnabled && (title == null ? url !== cur.t || !info : url2 != null && url !== url2)) {
        urlDecodingDict_.has(url) && HistoryManager_.sorted_ && HistoryManager_.binarySearch_(url) < 0 &&
        urlDecodingDict_.delete(url)
      }
      if (title != null) {
        cur.path_ = cur.path_.slice(0, -cur.title_.length) + (title || cur.id_)
        cur.title_ = title || cur.id_
        if (url2) {
          cur.u = url2
          cur.t = UrlDecoder_.decodeURL_(url2, cur)
          UrlDecoder_.continueToWork_()
        }
        if (blockListRe_ !== null) {
          cur.visible_ = TestNotBlocked_(cur.jsUrl_ || cur.u, omniBlockPath ? cur.path_ : cur.title_)
        }
        bookmarkCache_.stamp_ = performance.now()
      } else {
        arr.splice(i, 1)
        for (let j = info ? i : arr.length; j < arr.length; j++) {
          if (arr[j].pid_ === cur.pid_)
            (arr[j] as Writable<typeof arr[42]>).ind_--
        }
        info || BookmarkManager_.Delay_(); // may need to re-add it in case of lacking info
      }
      return
    }
    if (!bookmarkCache_.dirs_.find(dir => dir.id_ === id)) { return } // "new" items which haven't been read are changed
    if (/* a folder is removed */ title == null && !BookmarkManager_.expiredUrls_ && decodingEnabled) {
      const dict = urlDecodingDict_, bs = HistoryManager_.binarySearch_
      for (const { u: url } of (HistoryManager_.sorted_ ? arr : [])) {
        if (dict.has(url) && bs(url) < 0) {
          dict.delete(url)
        }
      }
      BookmarkManager_.expiredUrls_ = 1
    }
    BookmarkManager_.Delay_()
  }
}

set_findBookmark_((titleOrPath: string, isId: boolean): ReturnType<typeof findBookmark_> => {
  if (bookmarkCache_.status_ < CompletersNS.BookmarkStatus.inited) {
    const defer = BgUtils_.deferPromise_<void>()
    BookmarkManager_.onLoad_ = defer.resolve_
    BookmarkManager_.refresh_()
    return defer.promise_.then(findBookmark_.bind(0, titleOrPath, isId))
  }
  const maybePath = !isId && titleOrPath.includes("/")
  const nodes = maybePath ? (titleOrPath + "").replace(<RegExpG & RegExpSearchable<0>> /\\\/?|\//g
      , s => s.length > 1 ? "/" : "\n").split("\n").filter(i => i) : []
  if (!titleOrPath || maybePath && !nodes.length) { return Promise.resolve(false) }
  if (isId) {
    return Promise.resolve(bookmarkCache_.bookmarks_.find(i => i.id_ === titleOrPath)
        || bookmarkCache_.dirs_.find(i => i.id_ === titleOrPath) || null)
  }
  const path2 = maybePath ? "/" + nodes.slice(1).join("/") : "", path1 = maybePath ? "/" + nodes[0] + path2 : ""
  for (const item of bookmarkCache_.bookmarks_) {
    if (maybePath && (item.path_ === path1 || item.path_ === path2) || item.title_ === titleOrPath) {
      return Promise.resolve(item)
    }
  }
  for (const item of bookmarkCache_.dirs_) {
    if (maybePath && (item.path_ === path1 || item.path_ === path2) || item.title_ === titleOrPath) {
      return Promise.resolve(item)
    }
  }
  let lastFound: CompletersNS.Bookmark | null = null
  for (const item of bookmarkCache_.bookmarks_) {
    if (item.title_.includes(titleOrPath)) {
      if (lastFound) { lastFound = null; break }
      lastFound = item
    }
  }
  return Promise.resolve(lastFound)
})

const finalUseHistory = (callback?: (() => void) | null): void => {
  if (callback) { callback() }
}

export const HistoryManager_ = {
  sorted_: false,
  loadingTimer_: 0,
  _callbacks: null as (() => void)[] | null,
  use_ (callback?: (() => void) | null): void {
    if (HistoryManager_._callbacks) { callback && HistoryManager_._callbacks.push(callback); return }
    historyCache_.lastRefresh_ = Date.now(); // safe for time changes
    if ((OnEdge || OnFirefox && Build.MayAndroidOnFirefox) && !browser_.history) {
      historyCache_.history_ = [], HistoryManager_.use_ = finalUseHistory
      finalUseHistory(callback)
      return
    }
    HistoryManager_._callbacks = callback ? [callback] : []
    if (HistoryManager_.loadingTimer_) { return }
    browser_.history.search({
      text: "",
      maxResults: InnerConsts.historyMaxSize,
      startTime: 0
    }, (history: HistoryNS.HistoryItem[]): void => {
      setTimeout(HistoryManager_._Init!, 0, history)
    })
  },
  _Init: function (arr: Array<HistoryNS.HistoryItem | HistoryItem>): void {
    HistoryManager_._Init = null
    let localOnChrome = OnChrome, trim = HistoryManager_.trimURLAndTitleWhenTooLong_, j_ind = 0
    for (const j of arr as readonly HistoryNS.HistoryItem[]) {
      let url = j.url
      if (url.length > GlobalConsts.MaxHistoryURLLength) { url = trim(url, j) }
      (arr as HistoryItem[])[j_ind++] = {
        t: url,
        title_: localOnChrome ? j.title! : j.title || "",
        time_: j.lastVisitTime,
        visible_: kVisibility.visible,
        u: url
      }
    }
    if (blockListRe_) {
      for (const k of arr as HistoryItem[]) {
        if (TestNotBlocked_(k.t, k.title_) === CompletersNS.kVisibility.hidden) {
          k.visible_ = kVisibility.hidden
        }
      }
    }
    setTimeout(function (): void {
      setTimeout(function (): void {
        const arr1 = historyCache_.history_!
        for (let i = arr1.length - 1; 0 < i; ) {
          const j = arr1[i], url = j.u, text = j.t = UrlDecoder_.decodeURL_(url, j),
          isSame = text.length >= url.length
          while (0 <= --i) {
            const k = arr1[i], url2 = k.u
            if (url2.length >= url.length || !url.startsWith(url2)) {
              break
            }
            (k as Writable<HistoryItem>).u = url.slice(0, url2.length)
            const decoded = isSame ? url2 : UrlDecoder_.decodeURL_(url2, k)
            // handle the case that j has been decoded in another charset but k hasn't
            k.t = isSame || decoded.length < url2.length ? text.slice(0, decoded.length) : decoded
          }
        }
        HistoryManager_.parseDomains_ && setTimeout((): void => {
          HistoryManager_.parseDomains_ && HistoryManager_.parseDomains_(historyCache_.history_!)
        }, 200)
      }, 100)
      historyCache_.history_!.sort((a, b) => a.u > b.u ? 1 : -1)
      HistoryManager_.sorted_ = true
      browser_.history.onVisitRemoved.addListener(HistoryManager_.OnVisitRemoved_)
      browser_.history.onVisited.addListener(HistoryManager_.OnPageVisited_)
    }, 100)
    historyCache_.history_ = arr as HistoryItem[], HistoryManager_.use_ = finalUseHistory
    HistoryManager_._callbacks && HistoryManager_._callbacks.length > 0 &&
    setTimeout(function (ref: (() => void)[]): void {
      for (const f of ref) {
        f()
      }
    }, 1, HistoryManager_._callbacks)
    HistoryManager_._callbacks = null
  } as ((arr: HistoryNS.HistoryItem[]) => void) | null,
  OnPageVisited_ (newPage: HistoryNS.HistoryItem): void {
    let url = newPage.url
    if (url.length > GlobalConsts.MaxHistoryURLLength) {
      url = HistoryManager_.trimURLAndTitleWhenTooLong_(url, newPage)
    }
    const updateCount = ++historyCache_.updateCount_, i = HistoryManager_.binarySearch_(url)
    if (i < 0) { historyCache_.toRefreshCount_++ }
    if (updateCount > 59
        || (updateCount > 10 && Date.now() - historyCache_.lastRefresh_ > 300000)) { // safe for time change
      HistoryManager_.refreshInfo_()
    }
    HistoryManager_._DidOnVisit(newPage, url, i)
  },
  _DidOnVisit (newPage: HistoryNS.HistoryItem, url: string, index: number): void {
    const time = newPage.lastVisitTime,
    title = OnChrome ? newPage.title! : newPage.title || "",
    j: HistoryItem = index >= 0 ? historyCache_.history_![index] : {
      t: "",
      title_: title,
      time_: time,
      visible_: blockListRe_ !== null ? TestNotBlocked_(url, title) : kVisibility.visible,
      u: url
    }
    let slot: Domain | undefined, domain = parseDomainAndScheme_(url)
      if (domain === null) { /* empty */ }
      else if ((slot = historyCache_.domains_.get(domain.domain_)) !== undefined) {
        slot.time_ = time
        if (index < 0) { slot.count_ += j.visible_ }
        if (domain.scheme_ > Urls.SchemeId.HTTP - 1) { slot.https_ = domain.scheme_ === Urls.SchemeId.HTTPS ? 1 : 0 }
      } else {
        historyCache_.domains_.set(domain.domain_, {
          time_: time, count_: j.visible_, https_: domain.scheme_ === Urls.SchemeId.HTTPS ? 1 : 0
        })
      }
    if (index >= 0) {
      j.time_ = time
      if (title && title !== j.title_ && (titleIgnoreListRe_ === null
            || !titleIgnoreListRe_.test(title.slice(0, GlobalConsts.MaxLengthToCheckIgnoredTitles)))) {
        j.title_ = title
        MatchCacheManager_.timer_ !== 0 && MatchCacheManager_.clear_(MatchCacheType.kHistory)
        if (blockListRe_ !== null) {
          const newVisible = TestNotBlocked_(url, title)
          if (j.visible_ !== newVisible) {
            j.visible_ = newVisible
            if (slot !== undefined) {
              slot.count_ += newVisible || -1
            }
          }
        }
      }
      return
    }
    j.t = UrlDecoder_.decodeURL_(url, j)
    historyCache_.history_!.splice(~index, 0, j)
    MatchCacheManager_.timer_ !== 0 && MatchCacheManager_.clear_(MatchCacheType.kHistory)
  },
  OnVisitRemoved_ (toRemove: HistoryNS.RemovedResult): void {
    decodingJobs.length = 0
    const d = urlDecodingDict_
    MatchCacheManager_.clear_(MatchCacheType.kHistory)
    if (toRemove.allHistory) {
      historyCache_.history_ = []
      historyCache_.domains_ = new Map()
      const toKeep: [string, string][] = []
      for (const i of bookmarkCache_.bookmarks_) {
        const decoded = d.get(i.u)
        decoded !== undefined && toKeep.push([i.u, decoded])
      }
      if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || !toKeep.length) {
        d.clear()
        for (const [k, v] of toKeep) { d.set(k, v) }
      } else {
        set_urlDecodingDict_(new Map(toKeep))
      }
      return
    }
    const bs = HistoryManager_.binarySearch_
    const {history_: h, domains_: domains} = historyCache_
    let entry: Domain | undefined
    for (const j of toRemove.urls) {
      const i = bs(j)
      if (i >= 0) {
        if (h![i].visible_) {
          const item = parseDomainAndScheme_(j)
          if (item && (entry = domains.get(item.domain_)) && (--entry.count_) <= 0) {
            domains.delete(item.domain_)
          }
        }
        h!.splice(i, 1)
        d.delete(j)
      }
    }
  },
  trimURLAndTitleWhenTooLong_ (url: string, history: HistoryNS.HistoryItem | Tab): string {
    // should be idempotent
    const colon = url.lastIndexOf(":", 9), hasHost = colon > 0 && url.substr(colon, 3) === "://",
    title = history.title
    url = url.slice(0, (hasHost ? url.indexOf("/", colon + 4) : colon)
              + GlobalConsts.TrimmedURLPathLengthWhenURLIsTooLong) + "\u2026"
    if (title && title.length > GlobalConsts.TrimmedTitleLengthWhenURLIsTooLong) {
      history.title = BgUtils_.unicodeRSubstring_(title, 0, GlobalConsts.TrimmedTitleLengthWhenURLIsTooLong)
    }
    return url
  },
  refreshInfo_ (): void {
    type Q = HistoryNS.HistoryQuery
    type C = (results: HistoryNS.HistoryItem[]) => void
    const i = Date.now(); // safe for time change
    if (historyCache_.toRefreshCount_ <= 0) { /* empty */ }
    else if (i < historyCache_.lastRefresh_ + 1000 && i >= historyCache_.lastRefresh_) { return }
    else {
      setTimeout(browser_.history.search as ((q: Q, c: C) => void | 1) as (q: Q, c: C) => void, 50, {
        text: "",
        maxResults: Math.min(999, historyCache_.updateCount_ + 10),
        startTime: i < historyCache_.lastRefresh_ ? i - 5 * 60 * 1000 : historyCache_.lastRefresh_
      }, HistoryManager_.OnRefreshedInfo_)
    }
    historyCache_.lastRefresh_ = i
    historyCache_.toRefreshCount_ = historyCache_.updateCount_ = 0
    return UrlDecoder_.continueToWork_()
  },
  parseDomains_: <((history: HistoryItem[]) => void) | null> ((history: HistoryItem[]): void => {
    HistoryManager_.parseDomains_ = null as never
    const d = historyCache_.domains_
    for (const { u: url, time_: time, visible_: visible } of history) {
      const item = parseDomainAndScheme_(url)
      if (item === null) { continue }
      const {domain_: domain, scheme_: scheme} = item, slot = d.get(domain)
      if (slot !== undefined) {
        if (slot.time_ < time) { slot.time_ = time }
        slot.count_ += visible
        if (scheme > Urls.SchemeId.HTTP - 1) { slot.https_ = scheme === Urls.SchemeId.HTTPS ? 1 : 0 }
      } else {
        d.set(domain, {time_: time, count_: visible, https_: scheme === Urls.SchemeId.HTTPS ? 1 : 0})
      }
    }
  }),
  OnRefreshedInfo_ (history: HistoryNS.HistoryItem[]): void {
    const arr = historyCache_.history_!, bs = HistoryManager_.binarySearch_
    if (arr.length <= 0 || !HistoryManager_.sorted_) { return }
    for (const info of history) {
      let url = info.url
      if (url.length > GlobalConsts.MaxHistoryURLLength) {
        url = HistoryManager_.trimURLAndTitleWhenTooLong_(url, info)
      }
      const j = bs(url)
      if (j >= 0) {
        const item = arr[j], title = info.title
        if (title && title !== item.title_) {
          HistoryManager_._DidOnVisit(info, url, j)
          info.title = item.title_
        }
      } else {
        HistoryManager_._DidOnVisit(info, url, j)
      }
    }
  },
  binarySearch_ (u: string): number {
    let e = "", a = historyCache_.history_!, h = a.length - 1, l = 0, m = 0
    while (l <= h) {
      m = (l + h) >>> 1
      e = a[m].u
      if (e > u) { h = m - 1 }
      else if (e !== u) { l = m + 1 }
      else { return m }
    }
    // if e > u, then l == h + 1 && l == m
    // else if e < u, then l == h + 1 && l == m + 1
    // (e < u ? -2 : -1) - m = (e < u ? -1 - 1 - m : -1 - m) = (e < u ? -1 - l : -1 - l)
    // = -1 - l = ~l
    return ~l
  }
}

export const normalizeUrlAndTitles_ = (tabs: readonly Tab[]): void => {
  const arr = historyCache_.history_
  const checkIgnoredTitles = !!arr && arr.length > 0 && HistoryManager_.sorted_ && titleIgnoreListRe_ !== null
  let title: string | undefined, urlToTitleMap: Map<string, string> | undefined
  for (const tab of tabs) {
    let url = tab.url
    if (url.length > GlobalConsts.MaxHistoryURLLength) {
      url = tab.url = HistoryManager_.trimURLAndTitleWhenTooLong_(url, tab)
    }
    if (checkIgnoredTitles && (title = tab.title)
        && titleIgnoreListRe_!.test(title.slice(0, GlobalConsts.MaxLengthToCheckIgnoredTitles))) {
      let cached = urlToTitleMap?.get(url)
      if (cached === void 0) {
        const j = HistoryManager_.binarySearch_(url)
        cached = j >= 0 ? arr[j].title_ : ""
        ; (urlToTitleMap || (urlToTitleMap = new Map())).set(url, cached)
      }
      cached && (tab.title = cached)
    }
  }
}

export const getRecentSessions_ = (expected: number, showBlocked: boolean
    , callback: (list: BrowserUrlItem[]) => void): void => {
  const browserSession = !OnEdge ? browserSessions_() : null
  if (!browserSession) { callback([]); return }
  // the timer is for https://github.com/gdh1995/vimium-c/issues/365#issuecomment-1003652820
  let timer = OnFirefox ? setTimeout((): void => { timer = 0; callback([]) }, 150) : 0
  // Some browsers may return more session items when no `maxResults` but still require `maxResults <= 25` if it exists,
  // as reported in https://github.com/gdh1995/vimium-c/issues/553#issuecomment-1035063582
  browserSession.getRecentlyClosed({
    maxResults: Math.min(Math.round(expected * 1.2), +browserSession.MAX_SESSION_RESULTS || 25, 25)
  }, (sessions?: chrome.sessions.Session[]): void => {
    // Note: sessions may be undefined, see log in https://github.com/gdh1995/vimium-c/issues/437#issuecomment-921878143
    if (OnFirefox) {
      if (!timer) { return }
      clearTimeout(timer)
    }
    let arr2: BrowserUrlItem[] = [], t: number, anyWindow: BOOL = 0
    const procStart = Date.now() - performance.now()
    for (const item of sessions || []) {
      let entry = item.tab, wnd: chrome.sessions.Session["window"] | null = null
      if (!entry) {
        if (!(wnd = item.window) || !wnd.tabs || !wnd.tabs.length) {
          continue
        }
        anyWindow = 1
        entry = wnd.tabs.find(i => i.active) || wnd.tabs[0]
        wnd.sessionId || (wnd = null)
      }
      normalizeUrlAndTitles_([entry])
      const { url, title } = entry
      if (!showBlocked && !TestNotBlocked_(url, title)) { continue }
      t = OnFirefox ? item.lastModified
          : (t = item.lastModified, t < /* as ms: 1979-07 */ 3e11 && t > /* as ms: 1968-09 */ -4e10 ? t * 1000 : t)
      const wndId = entry.windowId // can be 0 on Chrome 112 for Ubuntu 22
      arr2.push({
        u: url, title_: title,
        visit_: t,
        sessionId_: [wndId, (wnd || entry).sessionId!, wnd ? wnd.tabs!.length : 0],
        label_: wnd ? ` +${wnd.tabs!.length > 1 ? wnd.tabs!.length - 1 : ""}`
            : wndId && wndId !== curWndId_ && t > procStart ? " +" : ""
      })
    }
    if (anyWindow) { // for GC
      setTimeout(callback, 0, arr2)
    } else {
      callback(arr2)
    }
    return runtimeError_()
  })
}

export const TestNotBlocked_ = (url: string, title: string): CompletersNS.Visibility => {
  return blockListRe_!.test(title) || blockListRe_!.test(url)
      ? kVisibility.hidden : kVisibility.visible
}

export const BlockListFilter_ = {
  IsExpectingHidden_ (query: string[]): boolean {
    if (omniBlockList_) {
      for (const word of query) {
        for (let phrase of omniBlockList_) {
          phrase = phrase.trim()
          if (word.includes(phrase) || phrase.length > 9 && word.length + 2 >= phrase.length
              && phrase.includes(word)) {
            return true
          }
        }
      }
    }
    return false
  },
  UpdateAll_ (): void {
    const d = historyCache_.domains_, mayBlock = blockListRe_ !== null
    if (bookmarkCache_.bookmarks_) {
      for (const k of bookmarkCache_.bookmarks_) {
        (k as Writable<Bookmark>).visible_ =
            mayBlock ? TestNotBlocked_(k.jsUrl_ || k.u, omniBlockPath ? k.path_ : k.title_) : kVisibility.visible
      }
    }
    if (!historyCache_.history_) {
      return
    }
    for (const k of historyCache_.history_) {
      const newVisible = mayBlock ? TestNotBlocked_(k.u, k.title_) : kVisibility.visible
      if (k.visible_ !== newVisible) {
        k.visible_ = newVisible
        const domain = parseDomainAndScheme_(k.u)
        const slot = domain && d.get(domain.domain_)
        if (slot) {
          slot.count_ += newVisible || -1
        }
      }
    }
  }
}

export const UrlDecoder_ = {
  decodeURL_ (a: string, o: ItemToDecode): string {
    if (a.length >= 400 || a.lastIndexOf("%") < 0) { return a }
    try {
      return _decodeFunc(a)
    } catch {}
    return urlDecodingDict_.get(a) || (o && decodingJobs.push(o), a)
  },
  decodeList_ (a: DecodedItem[]): void {
    const dict = urlDecodingDict_, jobs = decodingJobs
    let i = -1, j: DecodedItem | undefined, l = a.length, s: string | undefined
    for (; ; ) {
      try {
        while (++i < l) {
          j = a[i]; s = j.u
          j.t = s.length >= 400 || s.lastIndexOf("%") < 0 ? s : _decodeFunc(s)
        }
        break
      } catch {
        j!.t = dict.get(s!) || (jobs.push(j!), s!)
      }
    }
    UrlDecoder_.continueToWork_()
  },
  continueToWork_ (): void {
    if (decodingJobs.length === 0 || decodingIndex !== -1) { return }
    decodingIndex = 0;
    (setTimeout as (handler: () => void, timeout: number) => number)(/*#__NOINLINE__*/ doDecoding_, 17)
  }
}

const doDecoding_ = (xhr?: TextXHR | null): void => {
  let text: string | undefined, end = decodingJobs.length
  if (!dataUrlToDecode_ || decodingIndex >= end) {
    decodingJobs.length = 0, decodingIndex = -1
    if (WithTextDecoder) {
      charsetDecoder_ = null
    }
    return
  }
  if (WithTextDecoder) {
    end = Math.min(decodingIndex + 32, end)
    charsetDecoder_ = charsetDecoder_ || new TextDecoder(dataUrlToDecode_)
  }
  for (; decodingIndex < end; decodingIndex++) {
    const url = decodingJobs[decodingIndex], isStr = typeof url === "string",
    str = isStr ? url : url.u
    if (text = urlDecodingDict_.get(str)) {
      isStr || (url.t = text)
      continue
    }
    if (!WithTextDecoder) {
      xhr || (xhr = /*#__NOINLINE__*/ createXhr_())
      xhr.open("GET", dataUrlToDecode_ + str, true)
      xhr.send()
      return
    }
    text = str.replace(<RegExpG & RegExpSearchable<0>> /%[a-f\d]{2}(?:%[a-f\d]{2})+/gi, doDecodePart_)
    text = text.length !== str.length ? text : str
    if (typeof url !== "string") {
      urlDecodingDict_.set(url.u, url.t = text)
    } else {
      urlDecodingDict_.set(url, text)
    }
  }
  if (WithTextDecoder) {
    if (decodingIndex < decodingJobs.length) {
      (setTimeout as (handler: (arg?: undefined) => void, timeout: number) => number)(doDecoding_, 4)
    } else {
      decodingJobs.length = 0
      decodingIndex = -1
      charsetDecoder_ = null
    }
  }
}

const doDecodePart_ = (text: string): string => {
  const arr = new Uint8Array(text.length / 3)
  for (let i = 1, j = 0; i < text.length; i += 3) {
    arr[j++] = parseInt(text.substr(i, 2), 16)
  }
  return charsetDecoder_!.decode(arr)
}

const createXhr_ = (): TextXHR => {
  const xhr = new XMLHttpRequest() as TextXHR
  xhr.responseType = "text"
  xhr.onload = function (): void {
    if (decodingIndex < 0) { return } // disabled by the outsides
    const url = decodingJobs[decodingIndex++]
    const text = this.responseText
    if (typeof url !== "string") {
      urlDecodingDict_.set(url.u, url.t = text)
    } else {
      urlDecodingDict_.set(url, text)
    }
    if (decodingIndex < decodingJobs.length) {
      doDecoding_(xhr)
    } else {
      decodingJobs.length = 0
      decodingIndex = -1
    }
  }
  return xhr
}

const filterInOptList = (newList: string): string[] => {
  const arr: string[] = []
  for (let line of newList.split("\n")) {
    line && line.trim() && line[0] !== "#" && arr.push(line)
  }
  return arr
}

/** @see {@link ../pages/options_ext.ts#isExpectingHidden_} */
updateHooks_.omniBlockList = function (newList: string): void {
  const arr: string[] = newList ? filterInOptList(newList) : []
  blockListRe_ = arr.length > 0 ? new RegExp(arr.map(BgUtils_.escapeAllForRe_).join("|"), "") : null
  omniBlockPath = arr.join("").includes("/")
  omniBlockList_ = arr.length > 0 ? arr : null;
  (historyCache_.history_ || bookmarkCache_.bookmarks_.length) && setTimeout(BlockListFilter_.UpdateAll_, 100)
}

updateHooks_.titleIgnoreList = (newList: string): void => {
  titleIgnoreListRe_ = null
  newList = newList && filterInOptList(newList).join("\n").replace(<RegExpG> /\\\n/g, "").replace(<RegExpG> /\n/g, "|")
  if (newList) {
    let str = newList.replace(<RegExpOne> /^\/\|?/, ""), hasPrefix = str.length < newList.length
    const tail = hasPrefix ? (<RegExpOne> /\|?\/([a-z]{0,16})$/).exec(str) : null
    if (!tail || tail.index) {
      titleIgnoreListRe_ = BgUtils_.makeRegexp_(tail ? str.slice(0, tail.index) : str
          , tail ? tail[1].replace("g", "") : "") satisfies RegExp | null as RegExpOne | null
    }
  }
}
void settings_.ready_.then((): void => {
  settings_.postUpdate_("omniBlockList")
  settings_.postUpdate_("titleIgnoreList")
})

if (!OnChrome || Build.MinCVer >= BrowserVer.MinRequestDataURLOnBackgroundPage
    || WithTextDecoder || CurCVer_ > BrowserVer.MinRequestDataURLOnBackgroundPage - 1) {
  updateHooks_.localeEncoding = (charset: string): void => {
    let enabled = charset ? !(charset = charset.toLowerCase()).startsWith("utf") : false
    const oldUrl = dataUrlToDecode_
    if (WithTextDecoder) {
      dataUrlToDecode_ = enabled ? charset : ""
      if (dataUrlToDecode_ === oldUrl) { return }
      try { new TextDecoder(dataUrlToDecode_) }
      catch { enabled = false }
    } else {
      const newDataUrl = enabled ? "data:text/plain;charset=" + charset + "," : ""
      if (newDataUrl === oldUrl) { return }
      dataUrlToDecode_ = newDataUrl
    }
    if (enabled) {
      oldUrl !== "1" && /* inited */ setTimeout(function (): void {
        if (historyCache_.history_) {
          UrlDecoder_.decodeList_(historyCache_.history_)
        }
        return UrlDecoder_.decodeList_(bookmarkCache_.bookmarks_)
      }, 100)
    } else {
      urlDecodingDict_.clear()
      decodingJobs && (decodingJobs.length = 0)
    }
    if (decodingEnabled === enabled) { return }
    decodingJobs = enabled ? [] as ItemToDecode[] : { length: 0, push: blank_ } as any
    decodingEnabled = enabled
    decodingIndex = -1
  }
  settings_.postUpdate_("localeEncoding")
} else {
  decodingJobs = { length: 0, push: blank_ } as any[]
}

Completion_.removeSug_ = (url, type: FgReq[kFgReq.removeSug]["t"], callback: (succeed: boolean) => void): void => {
  switch (type) {
  case "tab":
    MatchCacheManager_.cacheTabs_(null)
    removeTabsOrFailSoon_(+url, (succeed: boolean): void => {
      succeed && MatchCacheManager_.cacheTabs_(null)
      callback(succeed)
    })
    break
  case "history":
    const found = !HistoryManager_.sorted_ || HistoryManager_.binarySearch_(url as string) >= 0
    browser_.history.deleteUrl({ url: url as string })
    found && MatchCacheManager_.clear_(MatchCacheType.kHistory)
    callback(found)
    break
  }
}

Completion_.isExpectingHidden_ = BlockListFilter_.IsExpectingHidden_

if (!Build.NDEBUG) {
  Object.assign(globalThis as any, { BookmarkManager_, HistoryManager_, BlockListFilter_, UrlDecoder_ })
}
