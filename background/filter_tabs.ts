import { OnFirefox, cRepeat, get_cOptions, curWndId_, curTabId_, recencyForTab_ } from "./store"
import {
  selectFrom, Tabs_, getCurShownTabs_, getCurWnd, runtimeError_, isNotHidden_, ShownTab, getCurTab, getCurTabs
} from "./browser"

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
