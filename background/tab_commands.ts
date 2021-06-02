import {
  browserTabs, getAllWindows, makeTempWindow, makeWindow, PopWindow, Tab, tabsCreate, Window, getTabUrl, selectFrom,
  runtimeError_, IncNormalWnd, selectWnd, selectTab, getCurWnd, getCurTabs, getCurTab, getGroupId
} from "./browser"
import { cRepeat, get_cOptions, cPort, cNeedConfirm, set_cPort, settings } from "./store"
import { complainLimits, requireURL, showHUD } from "./ports"
import { copy_, parseSedOptions_ } from "./clipboard"
import { confirm_, runNextCmd, overrideCmdOptions } from "./run_commands"
import { newTabIndex, preferLastWnd, openUrlWithActions } from "./open_urls"
import { focusFrame } from "./frame_commands"
import C = kBgCmd

const abs = Math.abs

export const getTabRange = (current: number, total: number, countToAutoLimitBeforeScale?: number
    , /** must be positive */ extraCount?: number | null): [number, number] => {
  let count = cRepeat
  if (extraCount) { count += count > 0 ? extraCount : -extraCount }
  const end = current + count, pos = count > 0
  return end <= total && end > -2 ? pos ? [current, end] : [end + 1, current + 1] // normal range
      : !get_cOptions<C.removeTab | C.reloadTab | C.copyWindowInfo>().limited
      && (abs(count) < (countToAutoLimitBeforeScale || total) * GlobalConsts.ThresholdToAutoLimitTabOperation
          || count < 10)
      ? abs(count) < total ? pos ? [total - count, total] : [0, -count] // go forward and backward
        : [0, total] // all
      : pos ? [current, total] : [0, current + 1] // limited
}

const notifyCKey = (): void => { cPort && focusFrame(cPort, false, FrameMaskType.NoMaskAndNoFocus) }

export const copyData = (request: FgReq[kFgReq.copy], port: Port): void => {
  let str: string | string[] | object[] | undefined
  str = request.u || request.s
  if (request.d) {
    if (typeof str !== "string") {
      for (let i = str.length; 0 <= --i; ) {
        str[i] = BgUtils_.decodeUrlForCopy_(str[i] + "")
      }
    } else {
      str = BgUtils_.decodeUrlForCopy_(str)
    }
  } else {
    if (str.length < 4 && !(str as string).trim() && str[0] === " ") {
      str = ""
    }
  }
  str = str && copy_(str, request.j, request.e)
  set_cPort(port)
  str = request.s && typeof request.s === "object" ? `[${request.s.length}] ` + request.s.slice(-1)[0] : str
  showHUD(request.d ? str.replace(<RegExpG & RegExpSearchable<0>> /%[0-7][\dA-Fa-f]/g, decodeURIComponent)
      : str, request.u ? kTip.noUrlCopied : kTip.noTextCopied)
}

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
      requireURL({ H: kFgReq.copy, u: "" as "url", d: decoded, e: sed })
    }
    return
  }
  // include those hidden on Firefox
  browserTabs.query(type === "browser" ? {windowType: "normal"}
      : { active: type !== "window" && (type !== "tab" || abs(cRepeat) < 2) || void 0,
          currentWindow: true }, (tabs): void => {
    if (!type || type === "title" || type === "frame" || type === "url") {
      copyData({
        u: (type === "title" ? tabs[0].title : getTabUrl(tabs[0])) as "url",
        d: decoded, e: sed
      }, cPort)
      runNextCmd<C.copyWindowInfo>(1)
      return
    }
    const incognito = cPort ? cPort.s.incognito_ : TabRecency_.incognito_ === IncognitoType.true,
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
  const sortOpt = get_cOptions<C.joinTabs, true>().sort
  const windowsOpt: string | undefined | null = get_cOptions<C.joinTabs, true>().windows
  const onlyCurrent = windowsOpt === "current"
  if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther & BrowserType.Edge)
      && !onlyCurrent) {
    showHUD("Can not collect tab info of all windows")
    return
  }
  const onWindows = (wnds: Array<Window & {tabs: Tab[]}>): void => {
    if (Build.MinCVer < BrowserVer.Min$windows$$GetAll$SupportWindowTypes && Build.BTypes & BrowserType.Chrome
        && CurCVer_ < BrowserVer.Min$windows$$GetAll$SupportWindowTypes) {
      wnds = wnds.filter(wnd => wnd.type === "normal" || wnd.type === "popup")
    }
    const isCurTabIncognito = TabRecency_.incognito_ === IncognitoType.true
    wnds = onlyCurrent ? wnds : wnds.filter(wnd => wnd.incognito === isCurTabIncognito)
    const _cur0 = onlyCurrent ? wnds : wnds.filter(wnd => wnd.id === TabRecency_.curWnd_)
    const _curWnd = _cur0.length ? _cur0[0] : null
    if (!onlyCurrent && !_curWnd) { return }
    const cb = (curWnd: typeof wnds[0] | null): void => {
      const allTabs: Tab[] = [], push = (j: Tab): void => { allTabs.push(j) }
      wnds.sort((i, j) => i.id - j.id).forEach(i => i.tabs.forEach(push))
      if (!allTabs.length) { return }
      if (sortOpt) {
        const curTabId = TabRecency_.curTab_
        const map: {[key: number]: number} = BgUtils_.safeObj_()
        if (sortOpt.includes("time") && !sortOpt.includes("creat") || sortOpt.includes("recen")) {
          for (let tab of allTabs) {
            const id = tab.id, recency = TabRecency_.tabs_.get(id)
            map[id] = id === curTabId ? GlobalConsts.MaxTabRecency + 1 : recency != null ? recency.i
                : Build.BTypes & BrowserType.Firefox
                  && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
                  && (tab as Tab & {lastAccessed?: number}).lastAccessed || id + (GlobalConsts.MaxTabRecency + 2)
          }
          allTabs.sort((a, b) => map[a.id] - map[b.id])
        } else {
          allTabs.sort((a, b) => a.id - b.id)
        }
      }
      let start = curWnd ? curWnd.tabs.length : 0
      const curWndId = curWnd ? curWnd.id : TabRecency_.curWnd_
      // Note: on Edge 84, the result of `tabs.move(number[], {index: number})` is (stable but) unpredictable
      for (const tab of allTabs) {
        browserTabs.move(tab.id, { windowId: curWndId, index: start++ })
      }
      for (const tab of allTabs) {
        tab.pinned && browserTabs.update(tab.id, {pinned: true})
      }
    }
    if (_curWnd && _curWnd.type === "popup" && _curWnd.tabs.length) {
      // always convert a popup window to a normal one
      let curTabId = _curWnd.tabs[0].id
      _curWnd.tabs = _curWnd.tabs.filter(i => i.id !== curTabId)
      makeWindow({ tabId: curTabId, incognito: _curWnd.incognito }, _curWnd.state, cb)
    } else {
      wnds = onlyCurrent || !_curWnd || sortOpt && sortOpt.includes("all") || windowsOpt === "all" ? wnds
          : wnds.filter(wnd => wnd.id !== _curWnd.id)
      cb(_curWnd)
    }
  }
  if (onlyCurrent) {
    getCurWnd(true, wnd => wnd ? onWindows([wnd]) : runtimeError_())
  } else {
    getAllWindows(Build.MinCVer < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
        && Build.BTypes & BrowserType.Chrome && CurCVer_ < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
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
      if (Build.BTypes & ~BrowserType.Edge) {
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
      if (count > 30) {
        if (!(Build.BTypes & BrowserType.Chrome)
            || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
          if (cNeedConfirm) {
            confirm_("moveTabToNewWindow", count, moveTabToNewWindow0.bind(null, wnd))
            return
          }
        } else {
          if (!(count = confirm_("moveTabToNewWindow", count)!)) { return }
          if (count < 2) { range = [activeTabIndex, activeTabIndex + 1] }
        }
      }
    }
    makeWindow({ tabId: tabs[activeTabIndex].id, incognito: curIncognito }, wnd.type === "normal" ? wnd.state : ""
        , count < 2 ? notifyCKey : (wnd2: Window): void => {
      notifyCKey()
      let leftTabs = tabs.slice(range[0], activeTabIndex), rightTabs = tabs.slice(activeTabIndex + 1, range[1])
      if (Build.MinCVer < BrowserVer.MinNoAbnormalIncognito
          && Build.BTypes & BrowserType.Chrome
          && wnd.incognito && CurCVer_ < BrowserVer.MinNoAbnormalIncognito) {
        const filter = (tab2: Tab): boolean => tab2.incognito === curIncognito
        leftTabs = leftTabs.filter(filter)
        rightTabs = rightTabs.filter(filter)
      }
      const leftNum = leftTabs.length, rightNum = rightTabs.length
      const getId = (tab2: Tab): number => tab2.id
      if (!leftNum) { /* empty */ }
      else if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        for (let i = 0; i < leftNum; i++) {
          browserTabs.move(leftTabs[i].id, { index: i, windowId: wnd2.id }, runtimeError_)
        }
      } else {
        browserTabs.move(leftTabs.map(getId), {index: 0, windowId: wnd2.id}, runtimeError_)
        if (leftNum > 1) {
          // on Chrome, current order is [left[0], activeTabIndex, ...left[1:]], so need to move again
          browserTabs.move(tabs[activeTabIndex].id, { index: leftNum })
        }
      }
      if (!rightNum) { /* empty */ }
      else if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        for (let i = 0; i < rightNum; i++) {
          browserTabs.move(rightTabs[i].id, { index: leftNum + 1 + i, windowId: wnd2.id }, runtimeError_)
        }
      } else {
        browserTabs.move(rightTabs.map(getId), { index: leftNum + 1, windowId: wnd2.id }, runtimeError_)
      }
      for (const tab of tabs) {
        tab.pinned && browserTabs.update(tab.id, {pinned: true})
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
    else if (Build.MinCVer < BrowserVer.MinNoAbnormalIncognito && Build.BTypes & BrowserType.Chrome
        && wnd.incognito) {
      if (BgUtils_.isRefusingIncognito_(url)) {
        return showHUD(trans_(kInc))
      }
      return Backend_.reopenTab_(tab)
    } else if (BgUtils_.isRefusingIncognito_(url)) {
      return complainLimits(trans_("openIncog"))
    } else {
      options.url = url
    }
    wnd.tabs = null as never
    getAllWindows((wnds): void => {
      // eslint-disable-next-line arrow-body-style
      wnds = wnds.filter((wnd2: Window): wnd2 is IncNormalWnd => {
        return wnd2.incognito && wnd2.type === "normal"
      })
      if (wnds.length) {
        browserTabs.query({ windowId: preferLastWnd(wnds).id, active: true }, ([tab2]): void => {
          /* safe-for-group */ tabsCreate({
              url, windowId: tab2.windowId,
              index: newTabIndex(tab2, get_cOptions<C.moveTabToNewWindow>().position, false, false)
          })
          selectWnd(tab2)
          browserTabs.remove(tabId)
        })
        return
      }
      let state: chrome.windows.ValidStates | "" = wnd.type === "normal" ? wnd.state : ""
      let useUrl: boolean
      if (useUrl = options.url != null) {
        if (settings.CONST_.DisallowIncognito_) {
          options.focused = true
          state = ""
        }
      } else {
        options.tabId = tabId
      }
      // in tests on Chrome 46/51, Chrome hangs at once after creating a new normal window from an incognito tab
      // so there's no need to worry about stranger edge cases like "normal window + incognito tab + not allowed"
      makeWindow(options, state, tabId ? null : notifyCKey)
      if (useUrl) {
        browserTabs.remove(tabId)
      }
    })
  }
  const incognito = !!get_cOptions<C.moveTabToNewWindow>().incognito
  if (incognito && (cPort ? cPort.s.incognito_ : TabRecency_.incognito_ === IncognitoType.true)) {
    showHUD(trans_(kInc))
  } else {
    getCurWnd(true, incognito ? moveTabToIncognito : moveTabToNewWindow0)
  }
}

export const moveTabToNextWindow = ([tab]: [Tab]): void | kBgCmd.moveTabToNextWindow => {
  getAllWindows((wnds0: Window[]): void => {
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
        browserTabs.query({windowId: ids[dest], active: true}, ([tab2]): void => {
          const newIndex = get_cOptions<C.moveTabToNextWindow>().end ? null
              : get_cOptions<C.moveTabToNextWindow>().position != null
              ? newTabIndex(tab, get_cOptions<C.moveTabToNextWindow>().position, false, false)
              : tab2.index + (get_cOptions<C.moveTabToNextWindow>().right ? 1 : 0)
          const callback = (): void => {
            browserTabs.move(tab.id, { index: newIndex ?? 3e4, windowId: tab2.windowId }, (): void => {
              notifyCKey()
              selectTab(tab.id, selectWnd)
            })
          }
          Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
          ? /*#__INLINE__*/ callback()
          : index >= 0 || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito ? callback()
          : makeTempWindow(tab.id, tab.incognito, callback)
        })
        return
      }
    } else {
      wnds = wnds0.filter(wnd => wnd.id === tab.windowId)
    }
    makeWindow({
      tabId: tab.id, incognito: tab.incognito
    }, wnds.length === 1 && wnds[0].type === "normal" ? wnds[0].state : "", notifyCKey)
  })
}

export const reloadTab = (tabs?: Tab[] | never[] | [Tab]): void => {
  const reloadProperties = {
    bypassCache: (get_cOptions<C.reloadTab>().hard || get_cOptions<C.reloadTab>().bypassCache) === true
  },
  reload = browserTabs.reload
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
  if (count > 20) {
    if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
      if (cNeedConfirm) {
        confirm_("reloadTab", count, reloadTab.bind(null, tabs))
        return
      }
    } else {
      if (!(count = confirm_("reloadTab", count)!)) {
        return
      }
      if (count === 1) {
        start = ind, end = ind + 1
      }
    }
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
    if (count > 20) {
      if (!(Build.BTypes & BrowserType.Chrome)
          || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
        if (cNeedConfirm) {
          confirm_("removeTab", count, removeTab.bind(null, 2, tabs))
          return
        }
      } else if (!(count = confirm_("removeTab", count)!)) {
        return
      }
    }
    if (count > 1) {
      start = skipped + range[0], end = skipped + range[1]
    }
  } else if (optHighlighted) {
    const highlighted = tabs.filter(j => j.highlighted && j !== tab), noCurrent = optHighlighted === "no-current"
    count = highlighted.length
    if (count > 0 && (noCurrent || count < total - 1)) {
      browserTabs.remove(highlighted.map(j => j.id), runtimeError_)
      count = 1
    }
    if (noCurrent) { count > 0 && runNextCmd<kBgCmd.removeTab>(1); return }
  }
  if (!start && count >= total
      && (get_cOptions<C.removeTab>().mayClose != null ? get_cOptions<C.removeTab>().mayClose
            : get_cOptions<C.removeTab>().allow_close) !== true) {
    if (phase < 2) { // from `getCurTab`
      getCurTabs(removeTab.bind(null, 2))
    } else {
      getAllWindows(/*#__NOINLINE__*/ removeAllTabsInWnd.bind(null, tab, tabs))
    }
    return
  } else if (phase < 2) {
    start = tab.index = 0, end = 1
  }
  let goto = get_cOptions<C.removeTab>().goto || (get_cOptions<C.removeTab>().left ? "left" : ""),
  goToIndex = count >= total ? total : goto === "left" ? start > 0 ? start - 1 : end
      : goto === "right" ? end < total ? end : start - 1 : goto === "previous" ? -2 : total
  if (goToIndex === -2) {
    let nextTab: Tab | null | undefined = end < total && !TabRecency_.tabs_.has(tabs[end].id) ? tabs[end]
        : tabs.filter((j, ind) => (ind < start || ind >= end) && TabRecency_.tabs_.has(j.id))
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
    else if (wnd.incognito && !BgUtils_.isRefusingIncognito_(settings.cache_.newTabUrl_f)) {
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
  browserTabs.remove(tab.id, runtimeError_)
  let parts1 = tabs.slice(tab.index + 1, end), parts2 = tabs.slice(start, tab.index)
  if (cRepeat < 0) {
    [parts1, parts2] = [parts2, parts1]
  }
  parts1.length > 0 && browserTabs.remove(parts1.map(j => j.id), runtimeError_)
  parts2.length > 0 && browserTabs.remove(parts2.map(j => j.id), runtimeError_)
}

export const toggleMuteTab = (): void | kBgCmd.toggleMuteTab => {
  if (!(Build.BTypes & ~BrowserType.Edge)
      || (Build.BTypes & BrowserType.Edge && OnOther === BrowserType.Edge)
      || Build.MinCVer < BrowserVer.MinMuted && Build.BTypes & BrowserType.Chrome
          && CurCVer_ < BrowserVer.MinMuted) {
    return showHUD(trans_("noMute", [BrowserVer.MinMuted]))
  }
  if (!(get_cOptions<C.toggleMuteTab>().all
        || get_cOptions<C.toggleMuteTab>().other || get_cOptions<C.toggleMuteTab>().others)) {
    getCurTab(([tab]: [Tab]): void => {
      const neg = Build.MinCVer < BrowserVer.MinMutedInfo && Build.BTypes & BrowserType.Chrome
          && CurCVer_ < BrowserVer.MinMutedInfo ? !tab.muted : !tab.mutedInfo.muted
      const mute = get_cOptions<kBgCmd.toggleMuteTab>().mute != null ? !!get_cOptions<kBgCmd.toggleMuteTab>().mute : neg
      mute === neg && browserTabs.update(tab.id, { muted: mute })
      showHUD(trans_(mute ? "muted" : "unmuted"))
      runNextCmd<C.toggleMuteTab>(1)
    })
    return
  }
  browserTabs.query({audible: true}, (tabs: Tab[]): void => {
    let curId = get_cOptions<C.toggleMuteTab>().other || get_cOptions<C.toggleMuteTab>().others
          ? cPort ? cPort.s.tabId_ : TabRecency_.curTab_ : GlobalConsts.TabIdNone
      , prefix = curId === GlobalConsts.TabIdNone ? "All" : "Other"
      , mute = tabs.length === 0 || curId !== GlobalConsts.TabIdNone && tabs.length === 1 && tabs[0].id === curId
    if (get_cOptions<kBgCmd.toggleMuteTab>().mute != null) {
      mute = !!get_cOptions<kBgCmd.toggleMuteTab>().mute
    } else for (const tab of tabs) { // eslint-disable-line curly
      if (tab.id !== curId && (Build.MinCVer < BrowserVer.MinMutedInfo && Build.BTypes & BrowserType.Chrome
              && CurCVer_ < BrowserVer.MinMutedInfo ? !tab.muted : !tab.mutedInfo.muted)) {
        mute = true
        break
      }
    }
    const action = { muted: mute }
    for (const tab of tabs) {
      if (tab.id !== curId
          && mute === (Build.MinCVer < BrowserVer.MinMutedInfo && Build.BTypes & BrowserType.Chrome
              && CurCVer_ < BrowserVer.MinMutedInfo ? !tab.muted : !tab.mutedInfo.muted)) {
        browserTabs.update(tab.id, action)
      }
    }
    showHUD(trans_(mute ? "mute" : "unmute", [trans_(prefix)]))
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
  if (end > 30) {
    if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
      if (cNeedConfirm) {
        confirm_("togglePinTab", end, togglePinTab.bind(null, tabs))
        return
      }
    } else if (!(end = confirm_("togglePinTab", end)!)) {
      return
    } else if (end === 1) {
      wantedTabIds = [tab.id]
    }
  }
  for (start = 0; start < end; start++) {
    browserTabs.update(wantedTabIds[start], action)
  }
  runNextCmd<C.togglePinTab>(1)
}

export const toggleTabUrl = (tabs: [Tab]): void | kBgCmd.toggleTabUrl => {
  let tab = tabs[0], url = getTabUrl(tab)
  const reader = get_cOptions<C.toggleTabUrl>().reader, keyword = get_cOptions<C.toggleTabUrl, true>().keyword
  if (url.startsWith(BrowserProtocol_)) {
    complainLimits(trans_(reader ? "noReader" : "openExtSrc"))
    return
  }
  if (reader && keyword) {
    const query = Backend_.parse_({ u: url })
    if (query && query.k === keyword) {
      overrideCmdOptions<kBgCmd.openUrl>({ keyword: ""})
      openUrlWithActions(query.u, Urls.WorkType.Default, tabs)
    } else {
      url = BgUtils_.convertToUrl_(query && get_cOptions<C.toggleTabUrl>().parsed ? query.u : url, keyword)
      openUrlWithActions(url, Urls.WorkType.FakeType, tabs)
    }
    return
  }
  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
      && reader) {
    (browserTabs as { toggleReaderMode? (tabId: number): Promise<void> }).toggleReaderMode!(tab.id).catch((): void => {
      Backend_.reopenTab_(tab, 0, { openInReaderMode: true })
    })
    return
  }
  if (reader) {
    if (Build.BTypes & BrowserType.Chrome && IsEdg_ && BgUtils_.protocolRe_.test(url)) {
      url = url.startsWith("read:") ? BgUtils_.DecodeURLPart_(url.slice(url.indexOf("?url=") + 5))
          : `read://${new URL(url).origin.replace(<RegExpG> /:\/\/|:/g, "_")}/?url=${
              BgUtils_.encodeAsciiComponent(url)}`
      openUrlWithActions(url, Urls.WorkType.FakeType, tabs)
    } else {
      complainLimits(trans_("noReader"))
    }
    return
  }
  url = url.startsWith("view-source:") ? url.slice(12) : ("view-source:" + url)
  openUrlWithActions(url, Urls.WorkType.FakeType, tabs)
}
