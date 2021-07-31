import {
  cRepeat, get_cOptions, cPort, cNeedConfirm, curIncognito_, curTabId_, curWndId_, recencyForTab_,
  copy_, settingsCache_, CurCVer_, IsEdg_, OnChrome, OnEdge, OnFirefox, CONST_, reqH_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, Windows_, makeTempWindow_r, makeWindow, PopWindow, tabsCreate, Window, getTabUrl, selectFrom, tabsGet,
  runtimeError_, IncNormalWnd, selectWnd, selectTab, getCurWnd, getCurTabs, getCurTab, getGroupId, tabsUpdate,
  browserSessions_, InfoToCreateMultiTab, openMultiTabs, isTabMuted, isRefusingIncognito_
} from "./browser"
import { convertToUrl_ } from "./normalize_urls"
import { parseSearchUrl_ } from "./parse_urls"
import { complainLimits, requireURL_, showHUD } from "./ports"
import { trans_ } from "./i18n"
import { confirm_, runNextCmd, overrideCmdOptions } from "./run_commands"
import { parseSedOptions_ } from "./clipboard"
import { newTabIndex, preferLastWnd, openUrlWithActions } from "./open_urls"
import { focusFrame } from "./frame_commands"
import { getTabRange } from "./filter_tabs"
import { TabRecency_ } from "./tools"

import C = kBgCmd
declare const enum RefreshTabStep { start = 0, s1, s2, s3, s4, end }

const abs = Math.abs

const notifyCKey = (): void => { cPort && focusFrame(cPort, false, FrameMaskType.NoMaskAndNoFocus) }

export const copyWindowInfo = (): void | kBgCmd.copyWindowInfo => {
  let decoded = !!(get_cOptions<C.copyWindowInfo>().decoded || get_cOptions<C.copyWindowInfo>().decode),
  type = get_cOptions<C.copyWindowInfo>().type
  const sed = parseSedOptions_(get_cOptions<C.copyWindowInfo, true>())
  if (type === "frame" && cPort) {
    if (cPort.s.flags_ & Frames.Flags.OtherExtension) {
      cPort.postMessage({
        N: kBgReq.url, H: kFgReq.copy, d: decoded, e: sed
      } as Req.bg<kBgReq.url> & FgReq[kFgReq.copy])
    } else {
      requireURL_({ H: kFgReq.copy, u: "" as "url", d: decoded, e: sed })
    }
    return
  }
  // include those hidden on Firefox
  Tabs_.query(type === "browser" ? {windowType: "normal"}
      : { active: type !== "window" && (type !== "tab" || abs(cRepeat) < 2) || void 0,
          currentWindow: true }, (tabs): void => {
    if (!type || type === "title" || type === "frame" || type === "url") {
      reqH_[kFgReq.copy]({
        u: (type === "title" ? tabs[0].title : getTabUrl(tabs[0])) as "url",
        d: decoded, e: sed
      }, cPort)
      runNextCmd<C.copyWindowInfo>(1)
      return
    }
    const incognito = cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true,
    rawFormat = get_cOptions<C.copyWindowInfo>().format, format = "" + (rawFormat || "${title}: ${url}"),
    join = get_cOptions<C.copyWindowInfo, true>().join, isPlainJSON = join === "json" && !rawFormat,
    nameRe = <RegExpG & RegExpSearchable<1>> /\$\{([^}]+)\}/g
    if (type === "tab") {
      const ind = tabs.length < 2 ? 0 : selectFrom(tabs).index, range = getTabRange(ind, tabs.length)
      tabs = tabs.slice(range[0], range[1])
    } else {
      tabs = tabs.filter(i => i.incognito === incognito)
      tabs.sort((a, b) => (a.windowId - b.windowId || a.index - b.index))
    }
    const data: any[] = tabs.map(i => isPlainJSON ? {
      title: i.title, url: decoded ? BgUtils_.decodeUrlForCopy_(getTabUrl(i)) : getTabUrl(i)
    } : format.replace(nameRe, (_, s1): string => { // eslint-disable-line arrow-body-style
      let val: any
      return decoded && s1 === "url" ? BgUtils_.decodeUrlForCopy_(getTabUrl(i))
        : s1 !== "__proto__" && (val = (i as Dict<any>)[s1],
          val && typeof val === "object" ? JSON.stringify(val) : val || "")
    })),
    result = copy_(data, join, sed)
    showHUD(type === "tab" && tabs.length < 2 ? result : trans_("copiedWndInfo"), kTip.noTextCopied)
    runNextCmd<C.copyWindowInfo>(1)
  })
}

export const joinTabs = (): void | kBgCmd.joinTabs => {
  // { time/recency, create/id } | "all"
  const sortOpt = get_cOptions<C.joinTabs, true>().order != null ? get_cOptions<C.joinTabs, true>().order
      : get_cOptions<C.joinTabs, true>().sort
  const windowsOpt: string | undefined | null = get_cOptions<C.joinTabs, true>().windows
  const onlyCurrent = windowsOpt === "current"
  if (OnEdge && !onlyCurrent) {
    showHUD("Can not collect tab info of all windows")
    return
  }
  const onWindows = (wnds: Array<Window & {tabs: Tab[]}>): void => {
    if (OnChrome && Build.MinCVer < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
        && CurCVer_ < BrowserVer.Min$windows$$GetAll$SupportWindowTypes) {
      wnds = wnds.filter(wnd => wnd.type === "normal" || wnd.type === "popup")
    }
    const isCurTabIncognito = curIncognito_ === IncognitoType.true
    wnds = onlyCurrent ? wnds : wnds.filter(wnd => wnd.incognito === isCurTabIncognito)
    const _cur0 = onlyCurrent ? wnds : wnds.filter(wnd => wnd.id === curWndId_)
    const _curWnd = _cur0.length ? _cur0[0] : null
    if (!onlyCurrent && !_curWnd) { return }
    const cb = (curWnd?: typeof wnds[0] | null): void => {
      let allTabs: Tab[] = [], push = (j: Tab): void => { allTabs.push(j) }
      wnds.sort((i, j) => i.id - j.id).forEach(i => i.tabs.forEach(push))
      if (!allTabs.length) { return }
      if (sortOpt) {
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
        changed && (allTabs = list.map(i => i.tab))
      }
      let start = curWnd ? curWnd.tabs.length : 0
      const curWndId = curWnd ? curWnd.id : curWndId_
      // Note: on Edge 84, the result of `tabs.move(number[], {index: number})` is (stable but) unpredictable
      for (const tab of allTabs) {
        Tabs_.move(tab.id, { windowId: curWndId, index: start++ })
      }
      for (const tab of allTabs) {
        tab.pinned && tabsUpdate(tab.id, { pinned: true })
      }
    }
    if (_curWnd && _curWnd.type === "popup" && _curWnd.tabs.length) {
      // always convert a popup window to a normal one
      let curTabId = _curWnd.tabs[0].id
      _curWnd.tabs = _curWnd.tabs.filter(i => i.id !== curTabId)
      makeWindow({ tabId: curTabId, incognito: _curWnd.incognito }, _curWnd.state, cb)
    } else {
      wnds = onlyCurrent || !_curWnd || windowsOpt === "all" ? wnds
          : wnds.filter(wnd => wnd.id !== _curWnd.id)
      cb(_curWnd)
    }
  }
  if (onlyCurrent) {
    getCurWnd(true, wnd => wnd ? onWindows([wnd]) : runtimeError_())
  } else {
    Windows_.getAll(OnChrome && Build.MinCVer < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
        && CurCVer_ < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
        ? {populate: true} : {populate: true, windowTypes: ["normal", "popup"]},
    onWindows)
  }
}

export const moveTabToNewWindow = (): void | kBgCmd.moveTabToNewWindow => {
  const kInc = "hasIncog"
  const moveTabToNewWindow0 = (wnd?: PopWindow): void => {
    if (!wnd) { return runtimeError_() }
    const tabs = wnd.tabs, total = tabs.length, all = !!get_cOptions<C.moveTabToNewWindow>().all
    if (!all && total <= 1) { return } // not need to show a tip
    const { incognito: curIncognito, index: activeTabIndex } = selectFrom(tabs)
    let range: [number, number], count: number
    if (all) {
      if (!OnEdge) {
        for (const i of tabs) {
          if (getGroupId(i) != null) {
            /** @todo: fix it with Manifest V3 */
            showHUD("Can not keep groups info during this command")
            return
          }
        }
      }
      range = [0, count = total]
    } else {
      range = getTabRange(activeTabIndex, total), count = range[1] - range[0]
      if (count >= total) { return showHUD(trans_("moveAllTabs")) }
      if (count > 30 && cNeedConfirm) {
            void confirm_("moveTabToNewWindow", count).then(moveTabToNewWindow0.bind(null, wnd))
            return
      }
    }
    makeWindow({ tabId: tabs[activeTabIndex].id, incognito: curIncognito }, wnd.type === "normal" ? wnd.state : ""
        , count < 2 ? notifyCKey : (wnd2?: Window): void => {
      if (!wnd2) { return }
      notifyCKey()
      let leftTabs = tabs.slice(range[0], activeTabIndex), rightTabs = tabs.slice(activeTabIndex + 1, range[1])
      if (OnChrome && Build.MinCVer < BrowserVer.MinNoAbnormalIncognito
          && wnd.incognito && CurCVer_ < BrowserVer.MinNoAbnormalIncognito) {
        const filter = (tab2: Tab): boolean => tab2.incognito === curIncognito
        leftTabs = leftTabs.filter(filter)
        rightTabs = rightTabs.filter(filter)
      }
      const leftNum = leftTabs.length, rightNum = rightTabs.length
      const getId = (tab2: Tab): number => tab2.id
      if (!leftNum) { /* empty */ }
      else if (OnFirefox) {
        for (let i = 0; i < leftNum; i++) {
          Tabs_.move(leftTabs[i].id, { index: i, windowId: wnd2.id }, runtimeError_)
        }
      } else {
        Tabs_.move(leftTabs.map(getId), {index: 0, windowId: wnd2.id}, runtimeError_)
        if (leftNum > 1) {
          // on Chrome, current order is [left[0], activeTabIndex, ...left[1:]], so need to move again
          Tabs_.move(tabs[activeTabIndex].id, { index: leftNum })
        }
      }
      if (!rightNum) { /* empty */ }
      else if (OnFirefox) {
        for (let i = 0; i < rightNum; i++) {
          Tabs_.move(rightTabs[i].id, { index: leftNum + 1 + i, windowId: wnd2.id }, runtimeError_)
        }
      } else {
        Tabs_.move(rightTabs.map(getId), { index: leftNum + 1, windowId: wnd2.id }, runtimeError_)
      }
      for (const tab of tabs) {
        tab.pinned && tabsUpdate(tab.id, { pinned: true })
      }
    })
  }
  const moveTabToIncognito = (wnd?: PopWindow): void => {
    if (!wnd) { return runtimeError_() }
    const tab = selectFrom(wnd.tabs)
    if (wnd.incognito && tab.incognito) { return showHUD(trans_(kInc)) }
    const tabId = tab.id
    const options: {tabId?: number, url?: string, incognito: true, focused?: true} = {incognito: true},
    url = getTabUrl(tab)
    if (tab.incognito) { /* empty */ }
    else if (OnChrome && Build.MinCVer < BrowserVer.MinNoAbnormalIncognito
        && wnd.incognito) {
      if (isRefusingIncognito_(url)) {
        return showHUD(trans_(kInc))
      }
      return reopenTab_(tab)
    } else if (isRefusingIncognito_(url)) {
      return complainLimits(trans_("openIncog"))
    } else {
      options.url = url
    }
    wnd.tabs = null as never
    Windows_.getAll((wnds): void => {
      // eslint-disable-next-line arrow-body-style
      wnds = wnds.filter((wnd2: Window): wnd2 is IncNormalWnd => {
        return wnd2.incognito && wnd2.type === "normal"
      })
      if (wnds.length) {
        Tabs_.query({ windowId: preferLastWnd(wnds).id, active: true }, ([tab2]): void => {
          /* safe-for-group */ tabsCreate({
              url, windowId: tab2.windowId,
              index: newTabIndex(tab2, get_cOptions<C.moveTabToNewWindow>().position, false, false)
          })
          selectWnd(tab2)
          Tabs_.remove(tabId)
        })
        return
      }
      let state: chrome.windows.ValidStates | "" = wnd.type === "normal" ? wnd.state : ""
      let useUrl: boolean
      if (useUrl = options.url != null) {
        if (CONST_.DisallowIncognito_) {
          options.focused = true
          state = ""
        }
      } else {
        options.tabId = tabId
      }
      // in tests on Chrome 46/51, Chrome hangs at once after creating a new normal window from an incognito tab
      // so there's no need to worry about stranger edge cases like "normal window + incognito tab + not allowed"
      makeWindow(options, state, (newWnd): void => {
        useUrl || newWnd && notifyCKey()
      })
      if (useUrl) {
        Tabs_.remove(tabId)
      }
    })
  }
  const incognito = !!get_cOptions<C.moveTabToNewWindow>().incognito
  if (incognito && (cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true)) {
    showHUD(trans_(kInc))
  } else {
    getCurWnd(true, incognito ? moveTabToIncognito : moveTabToNewWindow0)
  }
}

export const moveTabToNextWindow = ([tab]: [Tab]): void | kBgCmd.moveTabToNextWindow => {
  Windows_.getAll((wnds0: Window[]): void => {
    let wnds: Window[], ids: number[]
    const noMin = get_cOptions<C.moveTabToNextWindow>().minimized === false
        || get_cOptions<C.moveTabToNextWindow>().min === false
    wnds = wnds0.filter(wnd => wnd.incognito === tab.incognito && wnd.type === "normal"
        && (!noMin || wnd.state !== "minimized"))
    if (wnds.length > 0) {
      ids = wnds.map(wnd => wnd.id)
      const index = ids.indexOf(tab.windowId)
      if (ids.length >= 2 || index < 0) {
        let dest = (index + cRepeat) % ids.length
        index < 0 && cRepeat < 0 && dest++
        dest < 0 && (dest += ids.length)
        Tabs_.query({windowId: ids[dest], active: true}, ([tab2]): void => {
          const newIndex = get_cOptions<C.moveTabToNextWindow>().end ? null
              : get_cOptions<C.moveTabToNextWindow>().position != null
              ? newTabIndex(tab, get_cOptions<C.moveTabToNextWindow>().position, false, false)
              : tab2.index + (get_cOptions<C.moveTabToNextWindow>().right !== false ? 1 : 0)
          const toRight = newIndex == null || newIndex > tab2.index
          const callback = (): void => {
            if (toActivateInOld === -1) {
              Tabs_.query({ windowId: tab.windowId, index: tab.index + (toRight ? -1 : 1) }, (toActivate): void => {
                toActivateInOld = toActivate && toActivate[0] && toActivate[0].id || -9
                callback()
                return runtimeError_()
              })
              return
            }
            Tabs_.move(tab.id, { index: newIndex ?? -1, windowId: tab2.windowId }, notifyCKey)
            selectWnd(tab2)
            selectTab(tab.id)
            toActivateInOld > 0 && selectTab(toActivateInOld)
          }
          let toActivateInOld = toRight && !tab.index ? -9 : -1
          !OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito ? /*#__INLINE__*/ callback()
          : index >= 0 || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito ? callback()
          : (toActivateInOld = -9, makeTempWindow_r(tab.id, tab.incognito, callback))
        })
        return
      }
    } else {
      wnds = wnds0.filter(wnd => wnd.id === tab.windowId)
    }
    makeWindow({
      tabId: tab.id, incognito: tab.incognito
    }, wnds.length === 1 && wnds[0].type === "normal" ? wnds[0].state : "", (newWnd): void => {
      newWnd && notifyCKey()
    })
  })
}

export const reloadTab = (tabs?: Tab[] | never[] | [Tab]): void => {
  const reloadProperties = {
    bypassCache: (get_cOptions<C.reloadTab>().hard || get_cOptions<C.reloadTab>().bypassCache) === true
  },
  reload = Tabs_.reload
  if (!tabs || tabs.length < 1) {
    if (tabs) {
      getCurWnd(true, wnd => {
        wnd && wnd.tabs.length && reloadTab(wnd.tabs)
        return runtimeError_()
      })
    }
    return
  }
  if (abs(cRepeat) < 2) {
    reload(selectFrom(tabs).id, reloadProperties)
    return
  }
  let ind = selectFrom(tabs).index
    , [start, end] = getTabRange(ind, tabs.length)
  if (get_cOptions<C.reloadTab>().single) {
    ind = ind + 1 === end || cRepeat > 0 && start !== ind ? start : end - 1
    start = ind; end = ind + 1
  }
  let count = end - start
  if (count > 20 && cNeedConfirm) {
        void confirm_("reloadTab", count).then(reloadTab.bind(null, tabs))
        return
  }
  reload(tabs[ind].id, reloadProperties)
  for (; start !== end; start++) {
    start !== ind && reload(tabs[start].id, reloadProperties)
  }
}

export const removeTab = (phase?: 1 | 2, tabs?: readonly Tab[]): void => {
  const optHighlighted = get_cOptions<C.removeTab, true>().highlighted
  if (!phase) {
    const needTabs = abs(cRepeat) > 1 || optHighlighted
        || get_cOptions<C.removeTab>().goto || get_cOptions<C.removeTab>().left;
    (needTabs ? getCurTabs : getCurTab)(removeTab.bind(null, needTabs ? 2 : 1))
    return
  }
  if (!tabs || !tabs.length) { return runtimeError_() }
  const total = tabs.length, tab = selectFrom(tabs), i = tab.index
  let count = 1, start = i, end = i + 1
  if (abs(cRepeat) > 1 && total > 1) {
    const noPinned = tabs[0].pinned !== tab.pinned && !(cRepeat < 0 && tabs[i - 1].pinned)
    let skipped = 0
    if (noPinned) {
      while (tabs[skipped].pinned) { skipped++ }
    }
    const range = getTabRange(i, total - skipped, total)
    count = range[1] - range[0]
    if (count > 20 && cNeedConfirm) {
          void confirm_("removeTab", count).then(removeTab.bind(null, 2, tabs))
          return
    }
    if (count > 1) {
      start = skipped + range[0], end = skipped + range[1]
    }
  } else if (optHighlighted) {
    const highlighted = tabs.filter(j => j.highlighted && j !== tab), noCurrent = optHighlighted === "no-current"
    count = highlighted.length + 1
    if (count > 1 && (noCurrent || count < total)) {
      Tabs_.remove(highlighted.map(j => j.id), runtimeError_)
    }
    if (noCurrent) { count > 1 && runNextCmd<kBgCmd.removeTab>(1); return }
  }
  if (!start && count >= total
      && (get_cOptions<C.removeTab>().mayClose != null ? get_cOptions<C.removeTab>().mayClose
            : get_cOptions<C.removeTab>().allow_close) !== true) {
    if (phase < 2) { // from `getCurTab`
      getCurTabs(removeTab.bind(null, 2))
    } else {
      Windows_.getAll(/*#__NOINLINE__*/ removeAllTabsInWnd.bind(null, tab, tabs))
    }
    return
  } else if (phase < 2) {
    start = tab.index = 0, end = 1
  }
  const rawGoto = get_cOptions<C.removeTab, true>().goto || (get_cOptions<C.removeTab>().left ? "left" : ""),
  gotos = (rawGoto + "").split(/[\/,;\s]/)
  const gotoVal = (gotos.length > 1 ? gotos[count > 1 ? 1 : 0] : rawGoto + "") as string & typeof rawGoto
  let isGotoReverse = gotoVal === "near" || gotoVal === "reverse" || gotoVal.startsWith("back"),
  isGotoForward = gotoVal.startsWith("forw"),
  gotoLeft = isGotoReverse ? cRepeat > 0 : isGotoForward ? cRepeat < 0 : gotoVal === "left",
  gotoRight = isGotoReverse ? cRepeat < 0 : isGotoForward ? cRepeat > 0 : gotoVal === "right",
  goToIndex = count >= total ? total : gotoLeft ? start > 0 ? start - 1 : end
      : gotoRight ? end < total ? end : start - 1 : gotoVal === "previous" ? -2 : total
  if (goToIndex === -2) {
    let nextTab: Tab | null | undefined = end < total && !recencyForTab_.has(tabs[end].id) ? tabs[end]
        : tabs.filter((j, ind) => (ind < start || ind >= end) && recencyForTab_.has(j.id))
            .sort(TabRecency_.rCompare_)[0]
    goToIndex = nextTab ? nextTab.index : total
  }
  if (goToIndex >= 0 && goToIndex < total) {
    // note: here not wait real removing, otherwise the browser window may flicker
    selectTab(tabs[goToIndex].id)
  }
  removeTabsInOrder(tab, tabs, start, end)
  runNextCmd<C.removeTab>(1)
}

const removeAllTabsInWnd = (tab: Tab, curTabs: readonly Tab[], wnds: Window[]): void => {
  let protect = false, windowId: number | undefined, wnd: Window
  wnds = wnds.filter(wnd2 => wnd2.type === "normal")
  if (get_cOptions<C.removeTab>().keepWindow === "always") {
    protect = !wnds.length || wnds.some(i => i.id === tab.windowId)
  } else if (wnds.length <= 1) {
    // protect the last window
    protect = true
    if (!(wnd = wnds[0])) { /* empty */ }
    else if (wnd.id !== tab.windowId) { protect = false } // the tab may be in a popup window
    else if (wnd.incognito && !isRefusingIncognito_(settingsCache_.newTabUrl_f)) {
      windowId = wnd.id
    }
    // other urls will be disabled if incognito else auto in current window
  }
  else if (!tab.incognito) {
    // protect the only "normal & not incognito" window if it has currentTab
    wnds = wnds.filter(wnd2 => !wnd2.incognito)
    if (wnds.length === 1 && wnds[0].id === tab.windowId) {
      windowId = wnds[0].id
      protect = true
    }
  }
  if (protect) {
    /* safe-for-group */ tabsCreate({ index: curTabs.length, url: "", windowId })
  }
  removeTabsInOrder(tab, curTabs, 0, curTabs.length)
  runNextCmd<C.removeTab>(1)
}

const removeTabsInOrder = (tab: Tab, tabs: readonly Tab[], start: number, end: number): void => {
  Tabs_.remove(tab.id, runtimeError_)
  let parts1 = tabs.slice(tab.index + 1, end), parts2 = tabs.slice(start, tab.index)
  if (cRepeat < 0) {
    [parts1, parts2] = [parts2, parts1]
  }
  parts1.length > 0 && Tabs_.remove(parts1.map(j => j.id), runtimeError_)
  parts2.length > 0 && Tabs_.remove(parts2.map(j => j.id), runtimeError_)
}

export const toggleMuteTab = (): void | kBgCmd.toggleMuteTab => {
  if (OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinMuted && CurCVer_ < BrowserVer.MinMuted) {
    OnEdge ? complainLimits("mute tabs") : showHUD(trans_("noMute", [BrowserVer.MinMuted]))
    return
  }
  if (!(get_cOptions<C.toggleMuteTab>().all
        || get_cOptions<C.toggleMuteTab>().other || get_cOptions<C.toggleMuteTab>().others)) {
    getCurTab(([tab]: [Tab]): void => {
      const neg = !isTabMuted(tab)
      const mute = get_cOptions<kBgCmd.toggleMuteTab>().mute != null ? !!get_cOptions<kBgCmd.toggleMuteTab>().mute : neg
      mute === neg && tabsUpdate(tab.id, { muted: mute })
      showHUD(trans_(mute ? "muted" : "unmuted"))
      runNextCmd<C.toggleMuteTab>(1)
    })
    return
  }
  Tabs_.query({audible: true}, (tabs: Tab[]): void => {
    let curId = get_cOptions<C.toggleMuteTab>().other || get_cOptions<C.toggleMuteTab>().others
          ? cPort ? cPort.s.tabId_ : curTabId_ : GlobalConsts.TabIdNone
      , mute = tabs.length === 0 || curId !== GlobalConsts.TabIdNone && tabs.length === 1 && tabs[0].id === curId
    if (get_cOptions<kBgCmd.toggleMuteTab>().mute != null) {
      mute = !!get_cOptions<kBgCmd.toggleMuteTab>().mute
    } else for (const tab of tabs) { // eslint-disable-line curly
      if (tab.id !== curId && !isTabMuted(tab)) {
        mute = true
        break
      }
    }
    const action = { muted: mute }
    for (const tab of tabs) {
      if (tab.id !== curId && mute !== isTabMuted(tab)) {
        tabsUpdate(tab.id, action)
      }
    }
    const prefix = curId === GlobalConsts.TabIdNone ? "All" : "Other"
    showHUD(trans_(mute ? "mute" : "unmute", [trans_(prefix) || prefix]))
    runNextCmd<C.toggleMuteTab>(1)
  })
}

export const togglePinTab = (tabs: Tab[]): void => {
  const tab = selectFrom(tabs), pin = !tab.pinned, action = {pinned: pin}, offset = pin ? 0 : 1
  let skipped = 0
  if (abs(cRepeat) > 1 && pin) {
    while (tabs[skipped].pinned) { skipped++ }
  }
  const range = getTabRange(tabs.length < 2 ? 0 : tab.index, tabs.length - skipped, tabs.length)
  let start = skipped + range[offset] - offset, end = skipped + range[1 - offset] - offset
  let wantedTabIds: number[] = []
  for (; start !== end; start += pin ? 1 : -1) {
    if (pin || tabs[start].pinned) {
      wantedTabIds.push(tabs[start].id)
    }
  }
  end = wantedTabIds.length
  if (end > 30 && cNeedConfirm) {
        void confirm_("togglePinTab", end).then(togglePinTab.bind(null, tabs))
        return
  }
  for (start = 0; start < end; start++) {
    tabsUpdate(wantedTabIds[start], action)
  }
  runNextCmd<C.togglePinTab>(1)
}

export const toggleTabUrl = (tabs: [Tab]): void | kBgCmd.toggleTabUrl => {
  let tab = tabs[0], url = getTabUrl(tab)
  const reader = get_cOptions<C.toggleTabUrl>().reader, keyword = get_cOptions<C.toggleTabUrl, true>().keyword
  if (url.startsWith(CONST_.BrowserProtocol_)) {
    complainLimits(trans_(reader ? "noReader" : "openExtSrc"))
    return
  }
  if (reader && keyword) {
    const query = parseSearchUrl_({ u: url })
    if (query && query.k === keyword) {
      overrideCmdOptions<kBgCmd.openUrl>({ keyword: ""})
      openUrlWithActions(query.u, Urls.WorkType.Default, tabs)
    } else {
      url = convertToUrl_(query && get_cOptions<C.toggleTabUrl>().parsed ? query.u : url, keyword)
      openUrlWithActions(url, Urls.WorkType.FakeType, tabs)
    }
    return
  }
  if (OnFirefox && reader) {
    (Tabs_ as { toggleReaderMode? (tabId: number): Promise<void> }).toggleReaderMode!(tab.id).catch((): void => {
      reopenTab_(tab, 0, { openInReaderMode: true })
    })
    return
  }
  if (reader) {
    if (OnChrome && IsEdg_ && BgUtils_.protocolRe_.test(url)) {
      url = url.startsWith("read:") ? BgUtils_.DecodeURLPart_(url.slice(url.indexOf("?url=") + 5))
          : `read://${new URL(url).origin.replace(<RegExpG> /:\/\/|:/g, "_")}/?url=${
              BgUtils_.encodeAsciiComponent_(url)}`
      openUrlWithActions(url, Urls.WorkType.FakeType, tabs)
    } else {
      complainLimits(trans_("noReader"))
    }
    return
  }
  url = url.startsWith("view-source:") ? url.slice(12) : ("view-source:" + url)
  openUrlWithActions(url, Urls.WorkType.FakeType, tabs)
}

export const reopenTab_ = (tab: Tab, refresh?: /* false */ 0 | /* a temp blank tab */ 1 | /* directly */ 2
    , exProps?: chrome.tabs.CreateProperties, useGroup?: true | false): void => {
  const tabId = tab.id, needTempBlankTab = refresh === 1
  if (!OnEdge && refresh && browserSessions_() && (useGroup !== false || getGroupId(tab) == null)) {
    let step = RefreshTabStep.start, tempTabId = -1,
    onRefresh = (): void => {
      const err = runtimeError_()
      if (err) {
        browserSessions_().restore()
        tempTabId >= 0 && Tabs_.remove(tempTabId)
        tempTabId = 0
        return err
      }
      step = step + 1
      if (step >= RefreshTabStep.end) { return }
      setTimeout((): void => { tabsGet(tabId, onRefresh) }, 50 * step * step)
    }
    if (needTempBlankTab) {
      /* safe-for-group */ tabsCreate({url: "about:blank", active: false, windowId: tab.windowId}, (t2): void => {
        tempTabId /* === -1 */ ? (tempTabId = t2.id) : Tabs_.remove(t2.id)
      })
    }
    Tabs_.remove(tabId, () => (tabsGet(tabId, onRefresh), runtimeError_()))
    return
  }
  let recoverMuted: ((this: void, newTab: Tab) => void) | null | undefined
  if (!(OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinMuted && CurCVer_ < BrowserVer.MinMuted)) {
    const muted = isTabMuted(tab)
    recoverMuted = (tab2: Tab): void => {
      if (muted !== isTabMuted(tab2)) {
        tabsUpdate(tab2.id, { muted })
      }
    }
  }
  const args: InfoToCreateMultiTab = {
    windowId: tab.windowId, index: tab.index, url: getTabUrl(tab), active: tab.active,
    pinned: tab.pinned, openerTabId: tab.openerTabId
  }
  if (OnFirefox) {
    exProps && BgUtils_.extendIf_(args, exProps)
    // on Firefox 88, if `.cookieStorageId && (create; remove)`, then tab will unexpectedly move right
    args.index != null && getGroupId(tab) == null && args.index++
  } else if (args.index != null) {
    args.index++
  }
  openMultiTabs(args, 1, true, [null], useGroup, tab, (newTab?: Tab): void => {
    newTab && recoverMuted && recoverMuted(newTab)
  })
  Tabs_.remove(tabId)
  // should never remove its session item - in case that goBack/goForward might be wanted
  // not seems to need to restore muted status
}
