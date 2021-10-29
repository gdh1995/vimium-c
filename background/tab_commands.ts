import {
  cRepeat, get_cOptions, cPort, curIncognito_, curTabId_, curWndId_, recencyForTab_,
  copy_, settingsCache_, CurCVer_, IsEdg_, OnChrome, OnEdge, OnFirefox, CONST_, reqH_, set_cRepeat, lastWndId_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, Windows_, makeTempWindow_r, makeWindow, PopWindow, tabsCreate, Window, getTabUrl, selectFrom, tabsGet, R_,
  runtimeError_, IncNormalWnd, selectWnd, selectTab, getCurWnd, getCurTabs, getCurTab, getGroupId, tabsUpdate,
  browserSessions_, InfoToCreateMultiTab, openMultiTabs, isTabMuted, isRefusingIncognito_, ShownTab, Q_, isNotHidden_
} from "./browser"
import { convertToUrl_ } from "./normalize_urls"
import { parseSearchUrl_ } from "./parse_urls"
import { complainLimits, requireURL_, showHUD } from "./ports"
import { trans_ } from "./i18n"
import {
  confirm_, overrideCmdOptions, runNextOnTabLoaded, runNextCmd, getRunNextCmdBy, kRunOn, needConfirm_
} from "./run_commands"
import { parseSedOptions_ } from "./clipboard"
import { newTabIndex, preferLastWnd, openUrlWithActions } from "./open_urls"
import { focusFrame } from "./frame_commands"
import {
  FilterInfo, filterTabsByCond_, getNecessaryCurTabInfo, getTabRange, onShownTabsIfRepeat_, Range3, sortTabsByCond_,
  tryLastActiveTab_
} from "./filter_tabs"
import { TabRecency_ } from "./tools"

import C = kBgCmd
declare const enum RefreshTabStep { start = 0, s1, s2, s3, s4, end }

const abs = Math.abs

const notifyCKey = (): void => { cPort && focusFrame(cPort, false, FrameMaskType.NoMaskAndNoFocus) }

export const copyWindowInfo = (resolve: OnCmdResolved): void | kBgCmd.copyWindowInfo => {
  let filter = get_cOptions<C.joinTabs, true>().filter
  const decoded = !!(get_cOptions<C.copyWindowInfo>().decoded || get_cOptions<C.copyWindowInfo>().decode),
  type = get_cOptions<C.copyWindowInfo>().type
  const wantNTabs = type === "tab" && (abs(cRepeat) > 1 || !!filter)
  const sed = parseSedOptions_(get_cOptions<C.copyWindowInfo, true>())
  if (type === "frame" && cPort) {
    let p: Promise<"tab" | void> | "tab" | void | 1
    if (cPort.s.flags_ & Frames.Flags.OtherExtension) {
      cPort.postMessage({
        N: kBgReq.url, H: kFgReq.copy, d: decoded, e: sed
      } as Req.bg<kBgReq.url> & FgReq[kFgReq.copy])
      p = 1
    } else {
      p = requireURL_({ H: kFgReq.copy, u: "" as "url", d: decoded, e: sed }) as Promise<"tab" | void> | "tab" | void
    }
    if (p !== 1) {
      p && p instanceof Promise ? p.then((): void => { resolve(1) }) : resolve(1)
    }
    return
  }
  // include those hidden on Firefox
  Tabs_.query(type === "browser" ? {windowType: "normal"} : { active: type !== "window" && !wantNTabs || void 0,
          currentWindow: true }, (tabs): void => {
    if (!type || type === "title" || type === "frame" || type === "url") {
      reqH_[kFgReq.copy]({
        u: (type === "title" ? tabs[0].title : getTabUrl(tabs[0])) as "url",
        d: decoded, e: sed
      }, cPort)
      resolve(1)
      return
    }
    const incognito = cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true,
    rawFormat = get_cOptions<C.copyWindowInfo>().format, format = "" + (rawFormat || "${title}: ${url}"),
    join = get_cOptions<C.copyWindowInfo, true>().join, isPlainJSON = join === "json" && !rawFormat,
    nameRe = <RegExpG & RegExpSearchable<1>> /\$\{([^}]+)\}/g
    if (wantNTabs) {
      const ind = tabs.length < 2 ? 0 : selectFrom(tabs).index, range = getTabRange(ind, tabs.length)
      tabs = tabs.slice(range[0], range[1])
    } else {
      tabs = tabs.filter(i => i.incognito === incognito)
    }
    if (filter) {
      const curId = cPort ? cPort.s.tabId_ : curTabId_
      const activeTab = tabs.find(i => i.id === curId), extra: FilterInfo = {}
      tabs = filterTabsByCond_(activeTab, tabs, filter, extra)
      filter = extra.known ? filter : null
    }
    if (!tabs.length) { resolve(0); return }
    if (type === "browser") {
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
    resolve(1)
  })
}

export const joinTabs = (resolve: OnCmdResolved): void | kBgCmd.joinTabs => {
  // { time/recency, create/id } | "all"
  const sortOpt = get_cOptions<C.joinTabs, true>().order != null ? get_cOptions<C.joinTabs, true>().order
      : get_cOptions<C.joinTabs, true>().sort
  const windowsOpt: string | undefined | null = get_cOptions<C.joinTabs, true>().windows
  const onlyCurrent = windowsOpt === "current"
  if (OnEdge && !onlyCurrent) {
    showHUD("Can not collect tab info of all windows")
    resolve(0)
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
    if (!onlyCurrent && !_curWnd) { resolve(0); return }
    const cb = (curWnd?: typeof wnds[0] | null): void => {
      let allTabs: Readonly<Tab>[] = [], push = (j: Tab): void => { allTabs.push(j) }
      wnds.sort((i, j) => i.id - j.id).forEach(i => { i.tabs.forEach(push) })
      let filter = get_cOptions<C.joinTabs, true>().filter
      if (onlyCurrent && abs(cRepeat) > 1 && allTabs.length > 1) {
        const ind = selectFrom(allTabs).index, range = getTabRange(ind, allTabs.length)
        allTabs = allTabs.slice(range[0], range[1])
      }
      if (filter) {
        const curId = cPort ? cPort.s.tabId_ : curTabId_
        const activeTab = allTabs.find(i => i.id === curId), extra: FilterInfo = {}
        allTabs = filterTabsByCond_(activeTab, allTabs, filter, extra)
        filter = extra.known ? filter : null
      }
      if (!allTabs.length) { resolve(0); return }
      if (sortOpt) {
        allTabs = sortTabsByCond_(allTabs, sortOpt)
      }
      let start = curWnd ? curWnd.tabs.length : 0
      const curWndId = curWnd ? curWnd.id : curWndId_
      if (filter) {
        start = allTabs.reduce((ind, i) => i.windowId === curWndId ? Math.min(i.index, ind) : ind, allTabs.length)
      }
      // Note: on Edge 84, the result of `tabs.move(number[], {index: number})` is (stable but) unpredictable
      for (const tab of allTabs) {
        Tabs_.move(tab.id, { windowId: curWndId, index: start++ })
      }
      for (const tab of allTabs) {
        tab.pinned && tabsUpdate(tab.id, { pinned: true })
      }
      resolve(1)
    }
    if (_curWnd && _curWnd.type === "popup" && _curWnd.tabs.length) {
      // always convert a popup window to a normal one
      let curTabId = _curWnd.tabs[0].id
      _curWnd.tabs = _curWnd.tabs.filter(i => i.id !== curTabId)
      makeWindow({ tabId: curTabId, incognito: _curWnd.incognito }, _curWnd.state, cb)
    } else {
      wnds = onlyCurrent || !_curWnd || windowsOpt === "all" ? wnds : wnds.filter(wnd => wnd.id !== _curWnd.id)
      cb(_curWnd)
    }
  }
  if (onlyCurrent) {
    getCurWnd(true, wnd => wnd ? onWindows([wnd]) : runtimeError_())
  } else {
    set_cRepeat(1)
    Windows_.getAll(OnChrome && Build.MinCVer < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
        && CurCVer_ < BrowserVer.Min$windows$$GetAll$SupportWindowTypes
        ? {populate: true} : {populate: true, windowTypes: ["normal", "popup"]},
    onWindows)
  }
}

export const moveTabToNewWindow = (resolve: OnCmdResolved): void | kBgCmd.moveTabToNewWindow => {
  const kInc = "hasIncog"
  const moveTabToNewWindow0 = (wnd: PopWindow): void => {
    const allTabs = wnd.tabs, total = allTabs.length, all = !!get_cOptions<C.moveTabToNewWindow>().all
    const focused = get_cOptions<C.moveTabToNewWindow>().focused !== false
    const activeTab = selectFrom(allTabs), curIncognito = activeTab.incognito;
    if (!all && total <= 1 && (!total || activeTab.index === 0 && abs(cRepeat) > 1)) { resolve(0); return }
    let range: [number, number]
    if (all) {
        for (const i of !OnEdge ? allTabs : []) {
          if (getGroupId(i) != null) {
            /** @todo: fix it with Manifest V3 */
            showHUD("Can not keep groups info during this command")
            resolve(0)
            return
          }
        }
      range = [0, total]
    } else {
      range = total === 1 ? [0, 1] : getTabRange(activeTab.index, total)
    }
    const filter = get_cOptions<C.moveTabToNewWindow, true>().filter
    let tabs = allTabs.slice(range[0], range[1])
    tabs = filter ? filterTabsByCond_(activeTab, tabs, filter) : tabs
    if (!tabs.length) { resolve(0); return }
    if (!all) {
      const count = tabs.length
      if (count >= total && total > 1) { resolve(0); showHUD(trans_("moveAllTabs")); return }
      if (count > 30 && needConfirm_()) {
          void confirm_("moveTabToNewWindow", count).then(moveTabToNewWindow0.bind(null, wnd))
          return
      }
      if (total === 1 && activeTab.index === 0 && abs(cRepeat) === 1) {
        void Q_(Tabs_.query, { windowId: wnd.id, index: 1 }).then((tabs2): void => {
          if (!tabs2 || !tabs2.length) { resolve(0); showHUD(trans_("moveAllTabs")); return }
          wnd.tabs = [wnd.tabs[0], tabs2[0]]
          moveTabToNewWindow0(wnd)
        })
        return
      }
    }
    const firstTab = !filter || tabs.includes!(activeTab) ? activeTab : tabs[0]
    makeWindow({ tabId: firstTab.id, incognito: curIncognito, focused }, wnd.type === "normal" ? wnd.state : ""
        , tabs.length < 2 ? notifyCKey : (wnd2?: Window): void => {
      if (!wnd2) { resolve(0); return }
      notifyCKey()
      const indexNewActive = tabs.indexOf(firstTab)
      let leftTabs = tabs.slice(0, indexNewActive), rightTabs = tabs.slice(indexNewActive + 1)
      if (OnChrome && Build.MinCVer < BrowserVer.MinNoAbnormalIncognito
          && wnd.incognito && CurCVer_ < BrowserVer.MinNoAbnormalIncognito) {
        const sameIncognito = (tab2: Tab): boolean => tab2.incognito === curIncognito
        leftTabs = leftTabs.filter(sameIncognito)
        rightTabs = rightTabs.filter(sameIncognito)
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
          Tabs_.move(tabs[indexNewActive].id, { index: leftNum })
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
      resolve(1)
    })
  }
  const moveTabToIncognito = (wnd: PopWindow): void => {
    const tab = selectFrom(wnd.tabs)
    if (wnd.incognito && tab.incognito) { resolve(0); return showHUD(trans_(kInc)) }
    const tabId = tab.id
    const options: Pick<chrome.windows.CreateData, "tabId" | "url" | "incognito" | "focused"> = {incognito: true},
    url = getTabUrl(tab)
    if (tab.incognito) { /* empty */ }
    else if (OnChrome && Build.MinCVer < BrowserVer.MinNoAbnormalIncognito
        && wnd.incognito) {
      if (isRefusingIncognito_(url)) {
        resolve(0)
        return showHUD(trans_(kInc))
      }
      return reopenTab_(tab)
    } else if (isRefusingIncognito_(url)) {
      resolve(0)
      return complainLimits(trans_("openIncog"))
    } else {
      options.url = url
    }
    wnd.tabs = null as never
    Windows_.getAll((wnds): void => {
      let focused = get_cOptions<C.moveTabToNewWindow>().focused !== false
      // eslint-disable-next-line arrow-body-style
      wnds = wnds.filter((wnd2: Window): wnd2 is IncNormalWnd => {
        return wnd2.incognito && wnd2.type === "normal"
      })
      if (wnds.length) {
        Tabs_.query({ windowId: preferLastWnd(wnds).id, active: true }, ([tab2]): void => {
          /* safe-for-group */ tabsCreate({
              url, windowId: tab2.windowId, active: get_cOptions<C.moveTabToNewWindow>().active !== false,
              index: newTabIndex(tab2, get_cOptions<C.moveTabToNewWindow>().position, false, false)
          }, getRunNextCmdBy(kRunOn.tabPromise))
          focused && selectWnd(tab2)
          Tabs_.remove(tabId)
        })
        return
      }
      let state: chrome.windows.ValidStates | "" = wnd.type === "normal" ? wnd.state : ""
      const useUrl = options.url != null
      if (useUrl) {
        if (CONST_.DisallowIncognito_) {
          focused = true
          state = ""
        }
      } else {
        options.tabId = tabId
      }
      options.focused = focused
      // in tests on Chrome 46/51, Chrome hangs at once after creating a new normal window from an incognito tab
      // so there's no need to worry about stranger edge cases like "normal window + incognito tab + not allowed"
      makeWindow(options, state, (newWnd): void => {
        useUrl || newWnd && notifyCKey()
        if (useUrl && newWnd) {
          getRunNextCmdBy(kRunOn.otherCb)(newWnd.tabs && newWnd.tabs[0] || null)
        } else {
          resolve(!!newWnd)
        }
      })
      if (useUrl) {
        Tabs_.remove(tabId)
      }
    })
  }
  const incognito = !!get_cOptions<C.moveTabToNewWindow>().incognito
  if (incognito && (cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true)) {
    showHUD(trans_(kInc))
    resolve(0)
  } else {
    (abs(cRepeat) === 1 || incognito ? Q_(getCurWnd, false).then<PopWindow | null | undefined>(wnd => {
      return wnd && Q_(Tabs_.query, { windowId: wnd.id, active: true }).then((tabs) => {
        wnd.tabs = tabs
        return tabs && tabs.length ? wnd as PopWindow : undefined
      })
    }) : Q_(getCurWnd, true) as Promise<PopWindow | undefined>)
    .then((w): void => { w ? (incognito ? moveTabToIncognito : moveTabToNewWindow0)(w) : resolve(0) })
  }
}

export const moveTabToNextWindow = ([tab]: [Tab], resolve: OnCmdResolved): void | kBgCmd.moveTabToNextWindow => {
  Windows_.getAll((wnds0: Window[]): void => {
    let wnds: Window[], ids: number[]
    const noMin = get_cOptions<C.moveTabToNextWindow>().minimized === false
        || get_cOptions<C.moveTabToNextWindow>().min === false
    const focused = get_cOptions<C.moveTabToNextWindow>().focused !== false
    wnds = wnds0.filter(wnd => wnd.incognito === tab.incognito && wnd.type === "normal"
        && (!noMin || wnd.state !== "minimized"))
    if (wnds.length > 0) {
      ids = wnds.map(wnd => wnd.id)
      const index = ids.indexOf(tab.windowId)
      if (ids.length >= 2 || index < 0) {
        const filter = get_cOptions<C.moveTabToNextWindow, true>().filter
        const useTabs = !!(get_cOptions<C.moveTabToNextWindow>().tabs || filter)
        const lastWndIdx = ids.indexOf(lastWndId_)
        const firstWndIdx = get_cOptions<C.moveTabToNextWindow>().last && lastWndIdx >= 0 ? lastWndIdx
            : index >= 0 ? index + 1 : 0
        let dest = useTabs ? firstWndIdx : cRepeat > 0 ? firstWndIdx + cRepeat - 1 : firstWndIdx + cRepeat
        dest = ((dest % ids.length) + ids.length) % ids.length
        dest = dest !== index ? dest : dest + (cRepeat > 0 ? 1 : -1)
        dest = ((dest % ids.length) + ids.length) % ids.length
        Tabs_.query({windowId: ids[dest], active: true}, ([tab2]): void => {
          const newIndex = get_cOptions<C.moveTabToNextWindow>().end ? null
              : get_cOptions<C.moveTabToNextWindow>().position != null
              ? newTabIndex(tab2, get_cOptions<C.moveTabToNextWindow>().position, false, false)
              : tab2.index + (get_cOptions<C.moveTabToNextWindow>().right !== false ? 1 : 0)
          const toRight = newIndex == null || newIndex > tab2.index
          let allToMove: ShownTab[] | null = null
          const callback = (): void => {
            if (toActivateInOld === -1) {
              Tabs_.query({ windowId: tab.windowId, index: tab.index + (toRight ? -1 : 1) }, (toActivate): void => {
                toActivateInOld = toActivate && toActivate[0] && toActivate[0].id || -9
                callback()
                return runtimeError_()
              })
              return
            }
            Tabs_.move(tab.id, { index: newIndex ?? -1, windowId: tab2.windowId }, (resultCur): void => {
              if (runtimeError_()) { resolve(0); return runtimeError_() }
              if (allToMove) {
                const curInd = allToMove.findIndex(i => i.id === resultCur.id)
                for (let i = 0; i < allToMove.length; i++) {
                  i !== curInd && Tabs_.move(allToMove[i].id, {
                    index: resultCur.index + i, windowId: resultCur.windowId
                  }, runtimeError_)
                }
              }
              cPort && cPort.s.tabId_ === resultCur.id && notifyCKey()
            })
            focused && selectWnd(tab2)
            get_cOptions<C.moveTabToNextWindow>().active !== false && selectTab(tab.id, R_(resolve))
            toActivateInOld > 0 && selectTab(toActivateInOld)
          }
          let toActivateInOld = toRight && !tab.index ? -9 : -1
          if (useTabs && (!OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
                || index >= 0 || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito) && abs(cRepeat) !== 1) {
            onShownTabsIfRepeat_(true, 0, (tabs, range): void => {
              tab = tabs[range[1]] as Tab
              tabs = tabs.slice(range[0], range[2])
              if (OnChrome && Build.MinCVer && BrowserVer.MinNoAbnormalIncognito
                  && CurCVer_ < BrowserVer.MinNoAbnormalIncognito) {
                tabs = tabs.filter(i => i.incognito === tab.incognito)
              }
              if (filter) {
                tabs = filterTabsByCond_(tab, tabs, filter)
                if (!tabs.length) { resolve(0); return }
                tab = tabs.includes!(tab) ? tab : tabs[0] as Tab
              }
              allToMove = tabs
              toActivateInOld = -9
              callback()
            }, [], resolve)
            return
          }
          !OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito ? /*#__INLINE__*/ callback()
          : index >= 0 || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito ? callback()
          : (toActivateInOld = -9, makeTempWindow_r(tab.id, tab.incognito, callback))
        })
        return
      }
    } else {
      wnds = wnds0.filter(wnd => wnd.id === tab.windowId)
    }
    if (abs(cRepeat) > 1) {
      moveTabToNewWindow(resolve)
      return
    }
    makeWindow({
      tabId: tab.id, incognito: tab.incognito, focused
    }, wnds.length === 1 && wnds[0].type === "normal" ? wnds[0].state : "", (newWnd): void => {
      newWnd && notifyCKey()
      resolve(!!newWnd)
    })
  })
}

export const reloadTab = (tabs: ShownTab[], [start, ind, end]: Range3, r: OnCmdResolved, force1?: boolean): void => {
  const reloadProperties = {
    bypassCache: (get_cOptions<C.reloadTab>().hard || get_cOptions<C.reloadTab>().bypassCache) === true
  },
  reload = Tabs_.reload, allTabs = tabs
  if (abs(cRepeat) < 2 || get_cOptions<C.reloadTab>().single) {
    reload(tabs[force1 ? ind : start].id, reloadProperties, getRunNextCmdBy(kRunOn.otherCb))
    return
  }
  let activeTab = tabs[ind], filter = get_cOptions<C.reloadTab, true>().filter
  tabs = tabs.slice(start, end)
  if (filter) {
    tabs = filterTabsByCond_(activeTab, tabs, filter)
    if (!tabs.length) { r(0); return }
    activeTab = tabs.includes!(activeTab) ? activeTab : tabs[0]
  }
  if (tabs.length > 20 && needConfirm_()) {
    void confirm_("reloadTab", tabs.length).then(reloadTab.bind(null, allTabs, [start, ind, end], r))
    return
  }
  reload(activeTab.id, reloadProperties, getRunNextCmdBy(kRunOn.otherCb))
  for (const i of tabs) {
    i !== activeTab && reload(i.id, reloadProperties)
  }
}

export const removeTab = (resolve: OnCmdResolved, phase?: 1 | 2 | 3, tabs?: readonly Tab[]): void => {
  const optHighlighted = get_cOptions<C.removeTab, true>().highlighted
  const rawGoto = get_cOptions<C.removeTab, true>().goto || (get_cOptions<C.removeTab>().left ? "left" : ""),
  gotos = (rawGoto + "").split(/[\/,;\s]/),
  gotoVal = (gotos.length > 1 ? gotos[abs(cRepeat) > 1 ? 1 : 0] : rawGoto + "") as string & typeof rawGoto,
  isGotoReverse = gotoVal === "near" || gotoVal === "reverse" || gotoVal.startsWith("back"),
  isGotoForward = gotoVal.startsWith("forw"),
  gotoLeft = isGotoReverse ? cRepeat > 0 : isGotoForward ? cRepeat < 0 : gotoVal === "left",
  gotoRight = isGotoReverse ? cRepeat < 0 : isGotoForward ? cRepeat > 0 : gotoVal === "right",
  gotoPrevious = gotoVal.includes("previous"), previousOnly = gotoPrevious && gotoVal.includes("only")
  if (!phase) {
    const needTabs = abs(cRepeat) > 1 || optHighlighted || gotoPrevious && !previousOnly;
    (needTabs ? getCurTabs : getCurTab)(removeTab.bind(null, resolve, needTabs ? 2 : 1))
    return
  }
  if (!tabs || !tabs.length) { resolve(0); return runtimeError_() }
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
    if (count > 20 && needConfirm_() && phase < 3) {
      void confirm_("removeTab", count).then(removeTab.bind(null, resolve, 2, tabs))
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
    if (noCurrent) { resolve(count > 1); return }
  } else if (get_cOptions<C.removeTab, true>().filter) {
    if (filterTabsByCond_(tab, [tab], get_cOptions<C.removeTab, true>().filter!).length == 0) {
      resolve(0)
      return
    }
  }
  if (!start && count >= total
      && (get_cOptions<C.removeTab>().mayClose != null ? get_cOptions<C.removeTab>().mayClose
            : get_cOptions<C.removeTab>().allow_close) !== true) {
    if (phase < 2) { // from `getCurTab`
      getCurTabs(removeTab.bind(null, resolve, 3))
    } else {
      Windows_.getAll(/*#__NOINLINE__*/ removeAllTabsInWnd.bind(null, resolve, tab, tabs))
    }
    return
  }
  let q: Promise<Tab | undefined> | undefined
  if (phase < 2) {
    if (previousOnly) {
      const lastActiveId = tryLastActiveTab_()
      if (lastActiveId >= 0) {
        q = Q_(tabsGet, lastActiveId)
      }
    } else if (gotoRight || gotoLeft && start > 0) {
      q = Q_(Tabs_.query, { windowId: tab.windowId, index: gotoLeft ? start - 1 : start + 1 }).then(i => i && i[0])
    }
    if (q) {
      q.then((destTab): void => {
        if (destTab && destTab.windowId === tab.windowId && isNotHidden_(destTab)) {
          selectTab(destTab.id)
          Tabs_.remove(tab.id, R_(resolve))
        } else {
          getCurTabs(removeTab.bind(null, resolve, 3))
        }
      })
      return
    }
  }
  let goToIndex = total
  if (count >= total) { /* empty */ }
  else if (gotoPrevious) {
    let nextTab: Tab | null | undefined = !previousOnly && end < total && !recencyForTab_.has(tabs[end].id) ? tabs[end]
        : tabs.filter((j, ind) => (ind < start || ind >= end) && recencyForTab_.has(j.id))
            .sort(TabRecency_.rCompare_)[0]
    goToIndex = nextTab ? nextTab.index : total
  } else if (gotoLeft || gotoRight) {
    let i2 = goToIndex = gotoLeft ? start > 0 ? start - 1 : end : end < total ? end : start - 1
    while (i2 >= 0 && i2 < total && (i2 < start || i2 >= end) && !isNotHidden_(tabs[i2])) { i2 += i2 < start ? -1 : 1 }
    goToIndex = i2 >= 0 && i2 < total ? i2 : goToIndex
  }
  if (goToIndex >= 0 && goToIndex < total) {
    // note: here not wait real removing, otherwise the browser window may flicker
    selectTab(tabs[goToIndex].id)
  }
  removeTabsInOrder(tab, tabs, start, end, resolve)
}

const removeAllTabsInWnd = (resolve: OnCmdResolved, tab: Tab, curTabs: readonly Tab[], wnds: Window[]): void => {
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
    /* safe-for-group */ tabsCreate({ index: curTabs.length, url: "", windowId }, getRunNextCmdBy(kRunOn.tabPromise))
  }
  removeTabsInOrder(tab, curTabs, 0, curTabs.length, protect ? null : resolve)
}

const removeTabsInOrder = (tab: Tab, tabs: readonly Tab[], start: number, end: number
    , resolve: OnCmdResolved | null): void => {
  Tabs_.remove(tab.id, resolve ? R_(resolve) : runtimeError_)
  let parts1 = tabs.slice(tab.index + 1, end), parts2 = tabs.slice(start, tab.index)
  if (cRepeat < 0) {
    [parts1, parts2] = [parts2, parts1]
  }
  parts1.length > 0 && Tabs_.remove(parts1.map(j => j.id), runtimeError_)
  parts2.length > 0 && Tabs_.remove(parts2.map(j => j.id), runtimeError_)
}

export const toggleMuteTab = (resolve: OnCmdResolved): void | kBgCmd.toggleMuteTab => {
  if (OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinMuted && CurCVer_ < BrowserVer.MinMuted) {
    OnEdge ? complainLimits("mute tabs") : showHUD(trans_("noMute", [BrowserVer.MinMuted]))
    resolve(0)
    return
  }
  const filter = get_cOptions<C.toggleMuteTab, true>().filter
  if (!(get_cOptions<C.toggleMuteTab>().all || filter
        || get_cOptions<C.toggleMuteTab>().other || get_cOptions<C.toggleMuteTab>().others)) {
    getCurTab(([tab]: [Tab]): void => {
      const neg = !isTabMuted(tab)
      const mute = get_cOptions<kBgCmd.toggleMuteTab>().mute != null ? !!get_cOptions<kBgCmd.toggleMuteTab>().mute : neg
      mute === neg && tabsUpdate(tab.id, { muted: mute })
      showHUD(trans_(mute ? "muted" : "unmuted"))
      resolve(1)
    })
    return
  }
  let activeTab: Tab | null | undefined
  const cb = (tabs: Tab[]): void => {
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
    if (filter) {
      tabs = filterTabsByCond_(activeTab, tabs, filter)
      if (!tabs.length) { resolve(0); return }
    }
    const action = { muted: mute }
    for (const tab of tabs) {
      if (tab.id !== curId && mute !== isTabMuted(tab)) {
        tabsUpdate(tab.id, action)
      }
    }
    const prefix = curId === GlobalConsts.TabIdNone ? "All" : "Other"
    Promise.resolve(trans_(prefix)).then((prefixStr): void => {
      showHUD(trans_(mute ? "mute" : "unmute", [prefixStr || prefix]))
      resolve(1)
    })
  }
  const wantedCurTabInfo = getNecessaryCurTabInfo(filter)
  if (wantedCurTabInfo) {
    wantedCurTabInfo.then((tab): void => {
      activeTab = tab
      Tabs_.query({ audible: true }, cb)
    })
  }
  else {
    Tabs_.query({audible: true}, cb)
  }
}

export const togglePinTab = (tabs: ShownTab[], oriRange: Range3, resolve: OnCmdResolved, force1?: boolean): void => {
  const current = oriRange[1]
  const tab = tabs[current], pin = !tab.pinned, action = {pinned: pin}, offset = pin ? 0 : 1
  let skipped = 0
  if (force1) { oriRange = [current, current, current + 1] }
  if (abs(cRepeat) > 1 && pin) {
    while (tabs[skipped].pinned) { skipped++ }
  }
  const range = getTabRange(current - skipped, tabs.length - skipped, tabs.length)
  let start = skipped + range[offset] - offset, end = skipped + range[1 - offset] - offset
  let wantedTabs: ShownTab[] = []
  for (; start !== end; start += pin ? 1 : -1) {
    if (pin || tabs[start].pinned) {
      wantedTabs.push(tabs[start])
    }
  }
  const filter = get_cOptions<C.togglePinTab, true>().filter
  wantedTabs = filter ? filterTabsByCond_(tab, wantedTabs, filter) : wantedTabs
  end = wantedTabs.length
  if (end > 30 && needConfirm_()) {
    void confirm_("togglePinTab", end).then(togglePinTab.bind(null, tabs, oriRange, resolve))
    return
  }
  if (!end) { resolve(0); return }
  const firstTabId = wantedTabs.includes!(tab) ? tab.id : wantedTabs[0].id
  for (const i of wantedTabs) {
    tabsUpdate(i.id, action, i.id === firstTabId ? R_(resolve) : runtimeError_)
  }
}

export const toggleTabUrl = (tabs: [Tab], resolve: OnCmdResolved): void | kBgCmd.toggleTabUrl => {
  let tab = tabs[0], url = getTabUrl(tab)
  const reader = get_cOptions<C.toggleTabUrl>().reader, keyword = get_cOptions<C.toggleTabUrl, true>().keyword
  if (url.startsWith(CONST_.BrowserProtocol_)) {
    complainLimits(trans_(reader ? "noReader" : "openExtSrc"))
    resolve(0)
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
    (Tabs_ as { toggleReaderMode? (tabId: number): Promise<void> }).toggleReaderMode!(tab.id).then(
        (): void => { runNextOnTabLoaded(get_cOptions<C.reopenTab, true>(), null) },
        (): void => { reopenTab_(tab, 0, { openInReaderMode: true }) })
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
      resolve(0)
    }
    return
  }
  url = url.startsWith("view-source:") ? url.slice(12) : ("view-source:" + url)
  openUrlWithActions(url, Urls.WorkType.FakeType, tabs)
}

export const reopenTab_ = (tab: Tab, refresh?: /* false */ 0 | /* a temp blank tab */ 1 | /* directly */ 2
    , exProps_mutable?: chrome.tabs.CreateProperties, useGroup?: true | false): void => {
  const tabId = tab.id, needTempBlankTab = refresh === 1
  if (!OnEdge && refresh && browserSessions_() && (useGroup !== false || getGroupId(tab) == null)) {
    let step = RefreshTabStep.start, tempTabId = -1,
    onRefresh = (): void => {
      const err = runtimeError_()
      if (err) {
        browserSessions_().restore(null, getRunNextCmdBy(kRunOn.otherCb))
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
  let args: InfoToCreateMultiTab = {
    windowId: tab.windowId, index: tab.index, url: getTabUrl(tab), active: tab.active,
    pinned: tab.pinned, openerTabId: tab.openerTabId
  }
  exProps_mutable && (args = Object.assign(exProps_mutable, args))
  if (args.index != null) {
    args.index++
  }
  openMultiTabs(args, 1, true, [null], useGroup, tab, (newTab?: Tab): void => {
    OnFirefox && newTab && Tabs_.remove(tabId)
    newTab && recoverMuted && recoverMuted(newTab)
    newTab ? runNextOnTabLoaded(get_cOptions<C.reopenTab, true>(), newTab) : runNextCmd<C.reopenTab>(0)
  })
  if (!OnFirefox) {
    Tabs_.remove(tabId)
  }
  // should never remove its session item - in case that goBack/goForward might be wanted
  // not seems to need to restore muted status
}
