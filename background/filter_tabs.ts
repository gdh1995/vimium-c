import { OnFirefox, cRepeat, get_cOptions, curWndId_, curTabId_, recencyForTab_ } from "./store"
import * as BgUtils_ from "./utils"
import {
  selectFrom, Tabs_, getCurShownTabs_, getCurWnd, runtimeError_, isNotHidden_, ShownTab, getCurTab, getCurTabs,
  getTabUrl, getGroupId
} from "./browser"
import * as Exclusions from "./exclusions"

import C = kBgCmd

export type Range3 = readonly [start: number, ind: number, end: number]

export const getTabRange = (current: number, total: number, countToAutoLimitBeforeScale?: number
    , /** must be positive */ extraCount?: 1 | 0): [number, number] => {
  let count = cRepeat
  if (extraCount) { count += count > 0 ? extraCount : -extraCount }
  const end = current + count, pos = count > 0
  return end <= total && end > -2 ? pos ? [current, end] : [end + 1, current + 1] // normal range
      : !get_cOptions<C.removeTab | C.reloadTab | C.copyWindowInfo>().limited
      && (Math.abs(count) < (countToAutoLimitBeforeScale || total) * GlobalConsts.ThresholdToAutoLimitTabOperation
          || count < 10)
      ? Math.abs(count) < total ? pos ? [total - count, total] : [0, -count] // go forward and backward
        : [0, total] // all
      : pos ? [current, total] : [0, current + 1] // limited
}

export const onShownTabsIfRepeat_ = <All extends boolean> (allInRange: All, noSelf: 0 | 1
    , callback: (tabs: ShownTab[], range: Range3, resolve: OnCmdResolved) => void
    , curOrTabs: [Tab] | Tab[] | undefined, resolve: OnCmdResolved
    , isUsable?: ((theOther: Tab) => boolean) | null): void => {
  const onTabs = (shownTabs?: Tab[]): void => {
    if (!shownTabs || !shownTabs.length) { resolve(0); return runtimeError_() }
    let ind = !OnFirefox ? selectFrom(shownTabs).index : !isUsable ? selectFrom(shownTabs, 1).index
        : Math.max(shownTabs.findIndex(i => i.active), 0)
    const [start, end] = getTabRange(ind, shownTabs.length, 0, noSelf)
    if (allInRange) {
      callback(shownTabs, [start, ind, end], resolve)
    } else {
      callback(shownTabs, [ind + 1 === end || cRepeat > 0 && start !== ind ? start : end - 1, ind, end], resolve)
    }
  }
  if (!curOrTabs) {
    resolve(0)
  } else if (curOrTabs.length === 0) {
    if (OnFirefox && curWndId_ >= 0) {
      Tabs_.query({ windowId: curWndId_, hidden: false }, onTabs)
    } else {
      getCurWnd(true, (wnd): void => onTabs(wnd ? OnFirefox ? wnd.tabs.filter(isNotHidden_) : wnd.tabs : []))
    }
  } else if (Math.abs(cRepeat) > 1) {
    onTabs(curOrTabs)
  } else if (!noSelf) {
    callback(curOrTabs!, [0, 0, 1], resolve)
  } else if (curOrTabs[0].index + cRepeat < 0) {
    getCurShownTabs_(onTabs)
  } else {
    Tabs_.query({ windowId: curOrTabs[0].windowId, index: curOrTabs[0].index + cRepeat }, (theOther): void => {
      theOther && theOther.length && isNotHidden_(theOther[0]) && (!isUsable || isUsable(theOther[0]))
      ? callback(theOther, [0, 0, 1], resolve) : getCurShownTabs_(onTabs)
      return runtimeError_()
    })
  }
}

export const tryLastActiveTab_ = () => {
  let indMax = 0, tabId = -1
  recencyForTab_.forEach((v, i): void => { if (v.i > indMax && i !== curTabId_) { indMax = v.i, tabId = i } })
  return tabId
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

export const filterTabsByCond_ = (activeTab: ShownTab | null | undefined, tabs: readonly Readonly<Tab>[]
    , filter: NonNullable<BgCmdOptions[kBgCmd.removeTabsR]["filter"]>): Readonly<Tab>[] => {
  let title: string | undefined, matcher: ValidUrlMatchers | null | undefined, host: string | undefined
  let group: string | null | undefined, useHash = false
  for (let item of (filter + "").split(/[&+]/)) {
    const key = item.split("=", 1)[0] as typeof filter
    const rawVal = item.slice(key || item[0] === "=" ? key.length + 1 : 0)
    const val = rawVal && BgUtils_.DecodeURLPart_(rawVal)
    if (key === "title" || key === "title*") {
      title = val ? val : activeTab && activeTab.title || undefined
    } else if (key === "url" || key === "hash") {
      if (key === "url" && val) {
        matcher = Exclusions.createSimpleUrlMatcher_(val)
      } else {
        const url = activeTab ? getTabUrl(activeTab) : null
        useHash = useHash || key === "hash"
        matcher = url ? Exclusions.createSimpleUrlMatcher_(":" + (useHash ? url : url.split("#", 1)[0])) : null
      }
    } else if (key === "host" || !key) {
      host = val ? val : key && activeTab ? BgUtils_.safeParseURL_(getTabUrl(activeTab))?.host : ""
    } else if (key === "group") {
      group = val ? val : activeTab ? getGroupId(activeTab) != null ? getGroupId(activeTab) + "" : null : undefined
    } else if (!(title || matcher || host || group)) { // all parts are unknown, so abort
      return []
    }
  }
  return tabs.filter(tab =>
      (!title || (tab.title || "").includes(title))
      && (!matcher || Exclusions.matchSimply_(matcher, getTabUrl(tab)))
      && (!host || host === BgUtils_.safeParseURL_(getTabUrl(tab))?.host)
      && (group === undefined || group === (getGroupId(tab) ?? "") + "")
  )
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
