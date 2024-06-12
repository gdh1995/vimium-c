import {
  OnFirefox, cRepeat, get_cOptions, curWndId_, curTabId_, recencyForTab_, CurCVer_, OnChrome, set_cRepeat, lastWndId_,
  set_lastWndId_, framesForTab_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, getCurShownTabs_, getCurWnd, runtimeError_, isNotHidden_, getCurTab, getCurTabs, Window, Qs_,
  getTabUrl, getGroupId, isTabMuted, Q_, Windows_, selectIndexFrom
} from "./browser"
import { getPortUrl_, showHUD } from "./ports"
import * as Exclusions from "./exclusions"
import { overrideCmdOptions, overrideOption } from "./run_commands"

import C = kBgCmd

export type Range3 = readonly [start: number, ind: number, end: number]

export const getTabRange = (current: number, total: number, countToAutoLimitBeforeScale?: number
    , /** must be positive */ extraCount?: 1 | 0): [number, number] => {
  return innerGetTabRange(current, total, countToAutoLimitBeforeScale, cRepeat, extraCount
      , get_cOptions<C.removeTab | C.reloadTab | C.copyWindowInfo, true>().limited
      , get_cOptions<C.removeTab | C.reloadTab | C.copyWindowInfo, true>().filter)
}

const innerGetTabRange = (current: number, total: number, countToAutoLimitBeforeScale: number | undefined
    , count: number, extraCount: 1 | 0 | undefined
    , limited: LimitedRangeOptions["limited"] | null | undefined, filter?: string | null): [number, number] => {
  const dir = count > 0
  if (extraCount) { count += dir ? extraCount : -extraCount }
  const end = current + count
  return end <= total && end > -2 ? dir ? [current, end] : [end + 1, current + 1] // normal range
      : limited === false || (limited == null || limited === "auto")
      && (Math.abs(count) < (countToAutoLimitBeforeScale || total) * GlobalConsts.ThresholdToAutoLimitTabOperation
          || count < 10 || filter && limited == null)
      ? Math.abs(count) < total ? dir ? [total - count, total] : [0, -count] // go forward and backward
        : [0, total] // all
      : dir ? [current, total] : [0, current + 1] // limited
}

export const onShownTabsIfRepeat_ = <All extends boolean> (allInRange: All, noSelf: 0 | 1
    , callback: (tabs: Tab[], range: Range3, resolve: OnCmdResolved) => void
    , curOrTabs: [Tab] | Tab[] | undefined, resolve: OnCmdResolved
    , isUsable?: ((theOther: Tab) => boolean) | true | null): void => {
  const onTabs = (shownTabs?: Tab[]): void => {
    if (!shownTabs || !shownTabs.length) { resolve(0); return runtimeError_() }
    let ind = selectIndexFrom(shownTabs)
    const [start, end] = limitCount ? [0, shownTabs.length] : getTabRange(ind, shownTabs.length, 0, noSelf)
    if (limitCount) {
      overrideCmdOptions<C.togglePinTab>({ limited: false }, true)
      overrideOption<C.togglePinTab>("$limit", cRepeat)
      set_cRepeat(cRepeat > 0 ? GlobalConsts.CommandCountLimit : -GlobalConsts.CommandCountLimit)
    }
    if (allInRange) {
      callback(shownTabs, [start, ind, end], resolve)
    } else {
      callback(shownTabs, [ind + 1 === end || cRepeat > 0 && start !== ind ? start : end - 1, ind, end], resolve)
    }
  }
  const filter = get_cOptions<C.togglePinTab, true>().filter
  const limitCount = filter && (<RegExpOne> /(^|[&+])limit(ed)?=count\b/).test(filter + "")
  if (!curOrTabs) {
    resolve(0)
  } else if (curOrTabs.length === 0 || Math.abs(cRepeat) > 1 || limitCount) {
    if (curOrTabs.length === 0 || limitCount || /* should be avoided */ OnFirefox && isUsable === true) {
      const windowId = curOrTabs[0] ? curOrTabs[0].windowId : curWndId_
      if (OnFirefox && windowId >= 0) {
        Tabs_.query(isUsable === true ? { windowId } : { windowId, hidden: false }, onTabs)
      } else {
        void (windowId >= 0 ? Q_(Windows_.get, windowId, { populate: true }) : Q_(getCurWnd, true)).then(wnd => {
          onTabs(wnd ? OnFirefox && isUsable !== true ? wnd.tabs!.filter(isNotHidden_) : wnd.tabs! : [])
        })
      }
    } else {
      onTabs(curOrTabs)
    }
  } else if (!noSelf) {
    callback(curOrTabs, [0, 0, 1], resolve)
  } else if (curOrTabs[0].index + cRepeat < 0) {
    getCurShownTabs_(onTabs)
  } else {
    Tabs_.query({ windowId: curOrTabs[0].windowId, index: curOrTabs[0].index + cRepeat }, (theOther): void => {
      theOther && theOther.length
      && (isUsable === true || isNotHidden_(theOther[0]) && (!isUsable || isUsable(theOther[0])))
      && (!filter || filterTabsByCond_(curOrTabs[0], theOther, filter).length > 0)
      ? cRepeat < 0 ? callback([theOther[0], curOrTabs[0]], [0, 1, allInRange ? 2 : 1], resolve)
        : callback([curOrTabs[0], theOther[0]], [allInRange ? 0 : 1, 0, 2], resolve)
      : getCurShownTabs_(onTabs)
      return runtimeError_()
    })
  }
}

export const tryLastActiveTab_ = (): number => {
  let indMax = 0, tabId = -1
  recencyForTab_.forEach((v, i): void => { if (v > indMax && i !== curTabId_) { indMax = v, tabId = i } })
  return tabId
}

export const findNearShownTab_ = (curTab: Tab | null, rightSide: boolean
      , known?: Tab[] | null): Promise<Tab | null> => {
  let nearIndex: number
  return !curTab || !curTab.index && !rightSide ? Promise.resolve(null)
      : known && known[nearIndex = Math.max(known.indexOf(curTab), 0) + (rightSide ? 1 : -1)]
        && isNotHidden_(known[nearIndex]) ? Promise.resolve(known[nearIndex])
      : Q_(Tabs_.query, { windowId: curTab.windowId, index: curTab.index + (rightSide ? 1 : -1) })
        .then((nearTabs): Tab | null | Promise<Tab | null> => {
    if (!(nearTabs && nearTabs[0])) { return null }
    if (isNotHidden_(nearTabs[0])) { return nearTabs[0] }
    return (known && known.length > 2 ? Promise.resolve(known.filter(isNotHidden_)) : Q_(getCurShownTabs_))
        .then((tabs): Tab | null => {
      return tabs && tabs.length ? tabs[getNearArrIndex(tabs, curTab.index + (rightSide ? 1 : -1), rightSide)] : null
    })
  })
}

export const getNearArrIndex = (tabs: readonly Tab[], tabIndex: number, goRight: boolean): number => {
  for (let i = tabs.length > 1 ? 0 : 1; i < tabs.length; i++) {
    if (tabs[i].index >= tabIndex) { return tabs[i].index === tabIndex || goRight ? i : i > 0 ? i - 1 : 0 }
  }
  return tabs.length - 1
}

/** @argument count may be 0 */
export const getTabsIfRepeat_ = (count: number, callback_r: (tabsIncludingActive: Tab[] | undefined) => void): void => {
  if (Math.abs(count) === 1) {
    getCurTab((cur): void => {
      const newInd = cur[0].index + count
      newInd >= 0 ? Tabs_.query({ windowId: cur[0].windowId, index: newInd }, (other): void => {
        other && other[0] ? callback_r(count > 0 ? [cur[0], other[0]] : [other[0], cur[0]]) : getCurTabs(callback_r)
        return runtimeError_()
      }) : getCurTabs(callback_r)
    })
  } else {
    getCurTabs(callback_r)
  }
}

export const getNecessaryCurTabInfo = (filter: TabFilterOptions["filter"] | null | undefined
    ): Promise<Tab | null> | null => {
  if (!filter) { return null }
  const wanted = mayRequireActiveTab(filter)
  return wanted > 2 ? Q_(getCurTab).then(tabs => tabs && tabs[0] || null)
      : wanted ? Promise.resolve(getPortUrl_(null, wanted > 1)).then(url => url ? { url } as Tab : null)
      : null
}

export const mayRequireActiveTab = (filter: NonNullable<BgCmdOptions[kBgCmd.removeTabsR]["filter"]>): 0 | 1 | 2 | 3 => {
  let ret: 0 | 1 | 2 = 0
  for (const item of (filter + "").split(/[&+]/)) {
    const rawKey = item.split("=", 1)[0], key = rawKey.includes(".") ? "" : rawKey || item
    const val = item.slice(key ? key.length + 1 : 0);
    if (key && val === "same" && key !== "hidden" && !key.startsWith("discard")) { return 3 }
    if (!val && key) {
      if (key.startsWith("title") || key === "group") { return 3 }
      ret = key === "hash" ? 2 : ret || (key === "host" || key === "url" ? 1 : 0)
    }
  }
  return ret
}

const parseBool = (val: string, only?: 1): boolean | null => {
  val = val && val.toLowerCase()
  return val === "" || val === "1" || val === "true" ? only ? null : true : val === "only" ? true
      : val === "0" || val === "false" ? false : null
}

export const testBoolFilter_ = (filter: TabFilterOptions["filter"] | null | undefined, key: string
    , only?: 1): boolean | null => {
  const item = filter ? (filter + "").split(/[&+]/).find(i => i.startsWith(key)) : null
  const val = item ? item.slice(1 + key.length) : null
  return val !== null ? parseBool(val, only) : null
}

const makeStringMatcher = (val: string, str: string | null | undefined): ((x?: string | null) => boolean) | null => {
  const lastSlash = val && val[0] === "/" ? val.lastIndexOf("/") : 0
  const strRe = lastSlash > 1 && (<RegExpOne> /^[a-z]+$/).test(val.slice(lastSlash + 1))
      ? BgUtils_.makeRegexp_(val.slice(1, lastSlash)
        , val.slice(lastSlash + 1).replace(<RegExpG> /g/g, ""), 0) as RegExpOne : null
  const lower = !strRe && !!str && str.toLowerCase()
  return strRe ? (str = null, x => strRe.test(x || ""))
      : str ? str === lower ? x => !!x && x.toLowerCase().includes(lower) : x => !!x && x.includes(str!) : null
}

export interface FilterInfo { known?: boolean }

export const filterTabsByCond_ = (activeTab: Tab | null | undefined
    , tabs: readonly Tab[], filter: NonNullable<BgCmdOptions[kBgCmd.removeTabsR]["filter"]>
    , extraOutputs?: FilterInfo): Tab[] => {
  let limit = 0, min = 0, max = 0
  const conditions: [cond: (tab: Tab) => boolean, negative: boolean][] = []
  for (let item of (filter + "").split(/[&+]/)) {
    const rawKey = item.split("=", 1)[0], directHost = rawKey.includes("."), neg = !directHost && rawKey.endsWith("!")
    const key = directHost ? "" : (neg ? rawKey.slice(0, -1) : rawKey) || item
    const rawVal = item.slice(directHost ? 0 : rawKey.length + (item.charAt(rawKey.length + 1) === "=" ? 2 : 1))
    const val = rawVal && BgUtils_.DecodeURLPart_(rawVal);
    const wantSame = val === "same" || val === "cur" || val === "current"
    let cond: ((tab: Tab) => boolean) | null = null
    switch (key) {
    case "title": case "title*":
      const titleMatcher = makeStringMatcher(val, val ? val : activeTab && activeTab.title)
      cond = titleMatcher ? (tab) => titleMatcher(tab.title) : null
      break
    case "url": case "urlhash": case "url+hash": case "url-hash": case "hash":
      let matcher: ValidUrlMatchers | null = null
      if (key === "url" && val) {
        matcher = Exclusions.createSimpleUrlMatcher_(val)
      } else {
        const url = activeTab ? getTabUrl(activeTab) : null
        const useHash = key.includes("hash")
        matcher = url ? Exclusions.createSimpleUrlMatcher_(":" + (useHash ? url : url.split("#", 1)[0])) : null
      }
      const smartCase = !!matcher && matcher.t === kMatchUrl.StringPrefix && val === val.toLowerCase()
      cond = matcher ? tab => Exclusions.matchSimply_(matcher!
            , smartCase ? getTabUrl(tab).toLowerCase() : getTabUrl(tab)) : cond
      break
    case "title+url":
      const strMatcher = val && makeStringMatcher(val, val)!
      cond = strMatcher ? tab => strMatcher(tab.title) || strMatcher(getTabUrl(tab)) : cond
      break
    case "host": case "":
      const host = val ? val : key && activeTab ? BgUtils_.safeParseURL_(getTabUrl(activeTab))?.host : ""
      cond = host ? tab => host === BgUtils_.safeParseURL_(getTabUrl(tab))?.host : cond
      break
    case "active":
      const active = parseBool(val, 1)
      cond = active != null ? tab => tab.active === active : cond
      break
    case "new": case "old": case "visited":
      const visited = parseBool(val) === (key !== "new")
      cond = tab => recencyForTab_.has(tab.id) === visited
    case "discarded": case "discard":
      const discarded = wantSame ? false : parseBool(val, 1)
      cond = discarded != null ? tab => tab.discarded === discarded : cond
      break
    case "group":
      const group = val ? val : activeTab ? getGroupId(activeTab) != null ? getGroupId(activeTab) + "" : "" : null
      cond = group != null ? tab => (getGroupId(tab) ?? "") + "" === group : cond
      break
    case "hidden":
      const hidden = !OnFirefox ? null : wantSame ? false : parseBool(val, 1)
      cond = hidden != null ? tab => isNotHidden_(tab) !== hidden : cond
      break
    case "highlight": case "highlighted":
      const highlighted = wantSame ? activeTab ? activeTab.highlighted : null : parseBool(val)
      cond = highlighted != null ? tab => tab.highlighted === highlighted : cond
      break
    case "incognito":
      const incognito = wantSame ? activeTab ? activeTab.incognito : null : parseBool(val)
      cond = incognito != null ? tab => tab.incognito === incognito : cond
      break
    case "pinned":
      const pinned = wantSame ? activeTab ? activeTab.pinned : null : parseBool(val, 1)
      cond = pinned != null ? tab => tab.pinned === pinned : cond
      break
    case "mute": case "muted":
      if (!OnChrome || Build.MinCVer >= BrowserVer.MinMuted || CurCVer_ > BrowserVer.MinMuted - 1) {
        const muted = wantSame ? activeTab ? isTabMuted(activeTab) : null : parseBool(val)
        cond = muted != null ? tab => isTabMuted(tab) === muted : cond
      }
      break;
    case "audible": case "audio":
      if (!OnChrome || Build.MinCVer >= BrowserVer.MinTabAudible || tabs[0] && tabs[0].audible != null) {
        const audible = wantSame ? activeTab ? activeTab.audible : null : parseBool(val)
        cond = audible != null ? tab => tab.audible === audible : cond
      }
      break;
    case "min": case "max": case "limit": case "limited":
      const intVal = val === "count" ? get_cOptions<C.togglePinTab, true>().$limit || cRepeat : parseInt(val) || 0
      key === "min" ? min = intVal : key === "max" ? max = intVal : limit = intVal || 1
      cond = () => true
      break
    default: break
    }
    if (cond) {
      conditions.push([cond, neg])
    }
  }
  extraOutputs && (extraOutputs.known = conditions.length > 0)
  if (conditions.length === 0) {
      return tabs.slice(0);
  }
  const oriTabs: readonly Tab [] = tabs
  let newTabs = tabs.filter((tab): boolean => {
    for (const item of conditions) {
      if (item[0](tab) === item[1]) {
        return false
      }
    }
    return true
  })
  const newLen = newTabs.length
  if (!newLen || min > 0 && newLen < min || max > 0 && newLen > max) {
    (get_cOptions<C.joinTabs, true>() && get_cOptions<C.runKey, true>().$else) ||
    showHUD(!newLen ? "No tabs matched the filter parameter"
        : `${newLen} tabs found but expect ${newLen < min ? min : max}`)
    return []
  }
  if (limit) {
    let oriCurInd = activeTab ? oriTabs.indexOf(activeTab) : -1
    if (oriCurInd < 0) {
      const cur = activeTab ? activeTab.id : curTabId_
      oriCurInd = oriTabs.findIndex(i => i.id === cur)
    }
    if (oriCurInd >= 0) {
      const near = newTabs.findIndex(i => oriTabs.indexOf(i) >= oriCurInd)
      const doesInsert = near >= 0 && oriTabs.indexOf(newTabs[near]) > oriCurInd
      if (doesInsert) { newTabs.splice(near, 0, null as never) }
      const range = innerGetTabRange(near >= 0 ? near : newLen - 1, newLen, 0
          , cRepeat > 0 ? limit : -limit, doesInsert ? 1 : 0, false)
      newTabs = newTabs.slice(range[0], range[1])
      doesInsert && (newTabs = newTabs.filter(i => !!i))
    } else {
      newTabs = limit > 0 ? newTabs.slice(0, limit) : newTabs.slice(-limit)
    }
  }
  return newTabs
}

export const sortTabsByCond_ = (allTabs: Readonly<Tab>[]
    , sortOpt: BgCmdOptions[kBgCmd.joinTabs]["order" | "sort"]): Readonly<Tab>[] => {
  interface TabInfo {
    ind: number; group: chrome.tabs.GroupId | null; time: number | null; rhost: string | null; tab: Tab;
    pinned: boolean
  }
  type ValidKeys = Extract<BgCmdOptions[kBgCmd.joinTabs]["order"], any[]>[0]
  const refreshInd = (i: TabInfo, ind: number): void => { i.ind = ind }
  const compareStr = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0
  const list: TabInfo[] = allTabs.map((i, ind): TabInfo => ({
    tab: i, ind, time: null, rhost: null, group: getGroupId(i), pinned: i.pinned
  }))
  let scale: -1 | 1, work = -1, changed = false, monoBase = 0
  for (let key of (sortOpt instanceof Array ? sortOpt.slice(0)
          : (sortOpt === true ? "time" : sortOpt + "").split(<RegExpG> /[, ]+/g)).reverse() as ValidKeys[]) {
    scale = key[0] === "r" && key[1] !== "e" || key[0] === "-" ? (key = key.slice(1) as typeof key, -1) : 1
    if (key.includes("time") && !key.includes("creat") || key.includes("recen")) {
      list[0].time == null && list.forEach(i => {
        const id = i.tab.id, recency = recencyForTab_.get(id)
        i.time = id === curTabId_ ? 1 : recency != null ? recency
          : OnFirefox && (monoBase || (monoBase = performance.timeOrigin!),
            ((i.tab as Tab & {lastAccessed?: number}).lastAccessed || monoBase) - monoBase) || id + 2
      })
      work = 1
    } else if (key.startsWith("host") || key === "url") {
      list[0].rhost || list.forEach(i => {
        const url = i.tab.url, start = url.indexOf("://") + 3, end = start > 3 ? url.indexOf("/", start) : 0
        if (end < start) { i.rhost = url; return }
        const host = url.slice(start, end), colon = host.lastIndexOf(":")
        const isIPv6 = colon > 0 && host.lastIndexOf(":", colon - 1) > 0
        i.rhost = isIPv6 ? host : host.slice(0, colon > 0 ? colon : host.length)
            .split(".").reverse().join(".") + (colon > 0 ? " " + host.slice( + 1) : "")
      })
      work = key === "url" ? 3 : 2
    } else {
      work = key === "title" ? 4 : key.includes("creat") || key === "id" ? 5 : key === "window" ? 6
          : key === "index" ? 7 : key === "reverse" ? (scale = -1, 7) : -1
    }
    if (work < 0) { continue }
    list.sort((a, b): number => (work === 1 ? a.time! - b.time!
        : work < 4 ? compareStr(a.rhost!, b.rhost!) || (work === 3 ? compareStr(a.tab.url, b.tab.url) : 0)
        : work === 4 ? compareStr(a.tab.title, b.tab.title)
        : work === 5 ? a.tab.id - b.tab.id
        : work === 6 ? a.tab.windowId - b.tab.windowId
        : a.ind - b.ind) * scale
        || (a.group != null ? b.group != null ? 0 : -1 : b.group != null ? 1 : 0)
        || a.ind - b.ind)
    list.forEach(refreshInd)
    changed = true
  }
  if (changed && list.some(i => i.group != null)) {
    const group_min_index = new Map<chrome.tabs.GroupId, number>()
    for (const { group, ind } of list) {
      if (group != null && !group_min_index.has(group)) {
        group_min_index.set(group, ind)
      }
    }
    list.sort((a, b) => {
      const ind_a = a.group != null ? group_min_index.get(a.group)! : a.ind
      const ind_b = b.group != null ? group_min_index.get(b.group)! : b.ind
      return ind_a - ind_b || a.ind - b.ind
    })
  }
  if (changed) {
    list.forEach(refreshInd)
    list.sort((a, b) => a.pinned !== b.pinned ? a.pinned ? -1 : 1 : a.ind - b.ind)
  }
  return changed ? list.map(i => i.tab) : allTabs
}

export const findLastVisibleWindow_ = async <AcceptCur extends boolean> (wndType: "popup" | "normal" | undefined
    , alsoCur: AcceptCur, incognito: boolean | null, curWndId: number, noMin?: boolean
    ): Promise<Window | (AcceptCur extends false ? [Window[], Window | undefined] : null)> => {
  const filter = (wnd: Window): boolean =>
      (!wndType || wnd.type === wndType) && (incognito == null || wnd.incognito === incognito)
      && (noMin || wnd.state !== "minimized")
  if (lastWndId_ >= 0) {
    const wnd = await Q_(Windows_.get, lastWndId_)
    if (wnd && filter(wnd)) { return wnd }
    set_lastWndId_(GlobalConsts.WndIdNone)
  }
  const otherTabs: (readonly [tabId: number, time: number])[] = []
  {
    const curIds = (await Q_(getCurTabs) || []).map(tab => tab.id)
    curIds.push(curTabId_)
    recencyForTab_.forEach((time, tabId) => { curIds.includes(tabId) || otherTabs.push([tabId, time]) })
    otherTabs.sort((i, j) => j[1] - i[1])
  }
  if (otherTabs.length > 0) {
    let tab: Tab | undefined = await Qs_(Tabs_.get, otherTabs[0][0])
    if (!tab) {
      const lastActive = otherTabs.find(i => framesForTab_.has(i[0]))
      tab = lastActive && await Qs_(Tabs_.get, lastActive[0])
    }
    const wnd = tab && await Qs_(Windows_.get, tab.windowId)
    if (wnd && filter(wnd)) { return wnd }
  }
  const allWnds = await Qs_(Windows_.getAll), matches = allWnds.filter(filter)
  const otherWnds = matches.filter(i => i.id !== curWndId)
  otherWnds.sort((i, j) => j.id - i.id)
  const wnd2 = otherWnds.length > 0 ? otherWnds[0] : null
  if (wnd2) { return wnd2 }
  if (alsoCur) { return allWnds.find(w => w.id === curWndId) || allWnds.find(w => w.focused) || null as never }
  return [matches, allWnds.find(i => i.id === curWndId)] as never
}
