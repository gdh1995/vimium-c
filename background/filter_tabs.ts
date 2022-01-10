import {
  OnFirefox, cRepeat, get_cOptions, curWndId_, curTabId_, recencyForTab_, CurCVer_, OnChrome, set_cRepeat
} from "./store"
import * as BgUtils_ from "./utils"
import {
  selectFrom, Tabs_, getCurShownTabs_, getCurWnd, runtimeError_, isNotHidden_, ShownTab, getCurTab, getCurTabs,
  getTabUrl, getGroupId, isTabMuted, Q_, Windows_
} from "./browser"
import { getPortUrl_, showHUD } from "./ports"
import * as Exclusions from "./exclusions"
import { overrideCmdOptions, overrideOption } from "./run_commands"

import C = kBgCmd

export type Range3 = readonly [start: number, ind: number, end: number]

export const getTabRange = (current: number, total: number, countToAutoLimitBeforeScale?: number
    , /** must be positive */ extraCount?: 1 | 0): [number, number] => {
  return innerGetTabRange(current, total, countToAutoLimitBeforeScale, cRepeat, extraCount
      , get_cOptions<C.removeTab | C.reloadTab | C.copyWindowInfo, true>().limited)
}

const innerGetTabRange = (current: number, total: number, countToAutoLimitBeforeScale: number | undefined
    , count: number, extraCount: 1 | 0 | undefined
    , limited: LimitedRangeOptions["limited"] | null | undefined): [number, number] => {
  const dir = count > 0
  if (extraCount) { count += dir ? extraCount : -extraCount }
  const end = current + count
  return end <= total && end > -2 ? dir ? [current, end] : [end + 1, current + 1] // normal range
      : limited === false || limited == null
      && (Math.abs(count) < (countToAutoLimitBeforeScale || total) * GlobalConsts.ThresholdToAutoLimitTabOperation
          || count < 10)
      ? Math.abs(count) < total ? dir ? [total - count, total] : [0, -count] // go forward and backward
        : [0, total] // all
      : dir ? [current, total] : [0, current + 1] // limited
}

export const onShownTabsIfRepeat_ = <All extends boolean> (allInRange: All, noSelf: 0 | 1
    , callback: (tabs: ShownTab[], range: Range3, resolve: OnCmdResolved) => void
    , curOrTabs: [Tab] | Tab[] | undefined, resolve: OnCmdResolved
    , isUsable?: ((theOther: Tab) => boolean) | true | null): void => {
  const onTabs = (shownTabs?: Tab[]): void => {
    if (!shownTabs || !shownTabs.length) { resolve(0); return runtimeError_() }
    let ind = !OnFirefox ? selectFrom(shownTabs).index : !isUsable ? selectFrom(shownTabs, 1).index
        : Math.max(shownTabs.findIndex(i => i.active), 0)
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
      ? callback(theOther, [0, 0, 1], resolve) : getCurShownTabs_(onTabs)
      return runtimeError_()
    })
  }
}

export const tryLastActiveTab_ = (): number => {
  let indMax = 0, tabId = -1
  recencyForTab_.forEach((v, i): void => { if (v.i > indMax && i !== curTabId_) { indMax = v.i, tabId = i } })
  return tabId
}

export const getNearTabInd = (tabs: Tab[], activeInd: number, goRight: boolean): number => {
  for (let i = tabs.length > 1 ? 0 : 1; i < tabs.length; i++) {
    const ind = tabs[i].index
    if (ind > activeInd || ind === activeInd) {
      return goRight || ind === activeInd ? i : i > 0 ? i - 1 : 0
    }
  }
  return tabs.length - 1
}

/** @argument count may be 0 */
export const getTabsIfRepeat_ = (count: number, callback_r: (tabsIncludingActive: Tab[] | undefined) => void): void => {
  if (Math.abs(count) === 1) {
    getCurTab((cur): void => {
      const newInd = cur[0].index + count
      newInd >= 0 ? Tabs_.query({ windowId: cur[0].windowId, index: newInd }, (other): void => {
        other ? callback_r(count > 0 ? [cur[0], other[0]] : [other[0], cur[0]]) : getCurTabs(callback_r)
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

export interface FilterInfo { known?: boolean }

export const filterTabsByCond_ = <T extends ShownTab = Tab>(activeTab: ShownTab | null | undefined
    , tabs: readonly T[], filter: NonNullable<BgCmdOptions[kBgCmd.removeTabsR]["filter"]>
    , extraOutputs?: FilterInfo): T[] => {
  let title: string | undefined, matcher: ValidUrlMatchers | null | undefined, host: string | undefined
  let group: string | null | undefined, useHash = false, hidden: boolean | null = null, muted: boolean | null = null
  let audio: boolean | null = null, pinned: boolean | null = null, known = 0, limit = 0;
  let incognito: boolean | null = null, highlighted: boolean | null = null, discarded: boolean | null = null
  for (let item of (filter + "").split(/[&+]/)) {
    const rawKey = item.split("=", 1)[0], key = rawKey.includes(".") ? "" : rawKey || item
    const rawVal = item.slice(key ? key.length + (item.charAt(key.length + 1) === "=" ? 2 : 1) : 0);
    const val = rawVal && BgUtils_.DecodeURLPart_(rawVal);
    known++;
    switch (key) {
    case "title": case "title*":
      title = val ? val : activeTab && activeTab.title || undefined
      break
    case "url": case "hash":
      if (key === "url" && val) {
        matcher = Exclusions.createSimpleUrlMatcher_(val)
      } else {
        const url = activeTab ? getTabUrl(activeTab) : null
        useHash = useHash || key === "hash"
        matcher = url ? Exclusions.createSimpleUrlMatcher_(":" + (useHash ? url : url.split("#", 1)[0])) : null
      }
      break
    case "host": case "":
      host = val ? val : key && activeTab ? BgUtils_.safeParseURL_(getTabUrl(activeTab))?.host : ""
      break
    case "discarded": case "discard": discarded = val === "same" ? false : parseBool(val, 1); break
    case "group":
      group = val ? val : activeTab ? getGroupId(activeTab) != null ? getGroupId(activeTab) + "" : null : undefined
      break
    case "hidden":
      hidden = !OnFirefox ? null : val === "same" ? false : parseBool(val, 1)
      break
    case "highlight": case "highlighted":
      highlighted = val === "same" ? activeTab ? activeTab.highlighted : null : parseBool(val); break
    case "incognito": case "incognito":
      incognito = val === "same" ? activeTab ? activeTab.incognito : null : parseBool(val); break
    case "pinned": pinned = val === "same" ? activeTab ? activeTab.pinned : null : parseBool(val, 1); break
    case "mute": case "muted":
      if (!OnChrome || Build.MinCVer >= BrowserVer.MinMuted || CurCVer_ > BrowserVer.MinMuted - 1) {
        muted = val === "same" ? activeTab ? isTabMuted(activeTab) : null : parseBool(val);
      }
      break;
    case "audible": case "audio":
      if (!OnChrome || Build.MinCVer >= BrowserVer.MinTabAudible || tabs[0] && tabs[0].audible != null) {
        audio = val === "same" ? activeTab ? activeTab.audible : null : parseBool(val)
      }
      break;
    case "limit": case "limited":
      limit = val === "count" ? get_cOptions<C.togglePinTab, true>().$limit || cRepeat : parseInt(val) || 1
      break
    default: known--; break
    }
  }
  extraOutputs && (extraOutputs.known = known > 0)
  if (known === 0) {
      return tabs.slice(0);
  }
  const oriTabs = tabs as readonly ShownTab[]
  let newTabs = tabs.filter(tab =>
      (!title || (tab.title || "").includes(title))
      && (!matcher || Exclusions.matchSimply_(matcher, getTabUrl(tab)))
      && (!host || host === BgUtils_.safeParseURL_(getTabUrl(tab))?.host)
      && (hidden === null || hidden !== isNotHidden_(tab))
      && (discarded === null || discarded === tab.discarded)
      && (pinned === null || pinned === tab.pinned)
      && (muted === null || muted === isTabMuted(tab))
      && (audio === null || audio === tab.audible)
      && (highlighted === null || highlighted === tab.highlighted)
      && (incognito === null || highlighted === tab.incognito)
      && (group === undefined || group === (getGroupId(tab) ?? "") + "")
  )
  if (!newTabs.length) { showHUD("No tabs matched the filter parameter") }
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
      const range = innerGetTabRange(near >= 0 ? near : newTabs.length - 1, newTabs.length, 0
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
    index: number; group: chrome.tabs.GroupId | null; time: number | null; rhost: string | null; tab: Tab
  }
  type ValidKeys = Extract<BgCmdOptions[kBgCmd.joinTabs]["order"], any[]>[0]
  const refreshInd = (i: TabInfo, ind: number): void => { i.index = ind }
  const compareStr = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0
  const list: TabInfo[] = allTabs.map((i, ind): TabInfo => ({
    tab: i, index: ind, time: null, rhost: null, group: getGroupId(i),
  }))
  let scale: number, work = -1, changed = false
  for (const key of (sortOpt instanceof Array ? sortOpt.slice(0)
          : (sortOpt === true ? "time" : sortOpt + "").split(<RegExpG> /[, ]+/g)).reverse() as ValidKeys[]) {
    scale = key[0] === "r" ? -1 : 1
    if (key.includes("time") && !key.includes("creat") || key.includes("recen")) {
      list[0].time == null && list.forEach(i => {
        const id = i.tab.id, recency = recencyForTab_.get(id)
        i.time = id === curTabId_ ? 1 : recency != null ? GlobalConsts.MaxTabRecency - recency.i
          : OnFirefox && (i.tab as Tab & {lastAccessed?: number}).lastAccessed || id + 2
      })
      scale = key[0] === "r" && key[1] !== "e" ? -1 : 1
      work = 1
    } else if (key.endsWith("host") || key.endsWith("url")) {
      list[0].rhost || list.forEach(i => {
        const url = i.tab.url, start = url.indexOf("://") + 3, end = start > 3 ? url.indexOf("/", start) : 0
        if (end < start) { i.rhost = url; return }
        const host = url.slice(start, end), colon = host.lastIndexOf(":")
        const isIPv6 = colon > 0 && host.lastIndexOf(":", colon - 1) > 0
        i.rhost = isIPv6 ? host : host.slice(0, colon > 0 ? colon : host.length)
            .split(".").reverse().join(".") + (colon > 0 ? " " + host.slice( + 1) : "")
      })
      work = key.includes("url") ? 3 : 2
    } else {
      work = key === "title" ? 4 : key.includes("creat") || key === "id" ? 5 : key.includes("window") ? 6
          : key.includes("index") || key === "reverse" ? 7 : -1
    }
    if (work < 0) { continue }
    list.sort((a, b): number => (work === 1 ? a.time! - b.time!
        : work < 4 ? compareStr(a.rhost!, b.rhost!) || (work === 3 ? compareStr(a.tab.url, b.tab.url) : 0)
        : work === 4 ? compareStr(a.tab.title, b.tab.title)
        : work === 5 ? a.tab.id - b.tab.id
        : work === 6 ? a.tab.windowId - b.tab.windowId
        : a.index - b.index) * scale || a.index - b.index)
    list.forEach(refreshInd)
    changed = true
  }
  if (changed && list.some(i => i.group != null)) {
    list.sort((a, b) => a.group == null ? b.group == null ? a.index - b.index : 1 : b.group == null ? -1
        : a.group < b.group ? -1 : a.group > b.group ? 1 : a.index - b.index)
  }
  return changed ? list.map(i => i.tab) : allTabs
}
