import {
  cPort, cRepeat, cKey, get_cOptions, set_cPort, set_cRepeat, cNeedConfirm, contentPayload_, framesForTab_,
  framesForOmni_, bgC_, set_bgC_, set_cmdInfo_, curIncognito_, curTabId_, recencyForTab_, settingsCache_, CurCVer_,
  OnChrome, OnFirefox, OnEdge, blank_, substitute_, CONST_
} from "./store"
import * as BgUtils_ from "./utils"
import {
  Tabs_, Windows_, InfoToCreateMultiTab, openMultiTabs, tabsGet, getTabUrl, selectFrom, runtimeError_,
  selectTab, getCurWnd, getCurTab, getCurShownTabs_, browserSessions_, browser_, selectWndIfNeed,
  getGroupId, isRefusingIncognito_, Q_, ShownTab
} from "./browser"
import { createSearchUrl_ } from "./normalize_urls"
import { parseSearchUrl_ } from "./parse_urls"
import * as settings_ from "./settings"
import { requireURL_, complainNoSession, showHUD, complainLimits, getPortUrl_ } from "./ports"
import { setOmniStyle_ } from "./ui_css"
import { trans_ } from "./i18n"
import { stripKey_ } from "./key_mappings"
import {
  confirm_, overrideCmdOptions, runNextCmd, runKeyWithCond, portSendFgCmd, sendFgCmd, overrideOption, runNextCmdBy,
  runNextOnTabLoaded
} from "./run_commands"
import { doesNeedToSed, parseSedOptions_ } from "./clipboard"
import { goToNextUrl, newTabIndex, openUrl } from "./open_urls"
import {
  parentFrame, enterVisualMode, showVomnibar, toggleZoom, captureTab,
  initHelp, framesGoBack, mainFrame, nextFrame, performFind, framesGoNext
} from "./frame_commands"
import { getTabRange } from "./filter_tabs"
import {
  copyWindowInfo, joinTabs, moveTabToNewWindow, moveTabToNextWindow, reloadTab, removeTab, toggleMuteTab,
  togglePinTab, toggleTabUrl, reopenTab_
} from "./tab_commands"
import { ContentSettings_, FindModeHistory_, Marks_, TabRecency_ } from "./tools"
import C = kBgCmd
import Info = kCmdInfo

set_cmdInfo_(As_<{
  [K in keyof BgCmdOptions]: K extends keyof BgCmdInfoMap ? BgCmdInfoMap[K] : Info.NoTab
}>([
  /* kBgCmd.blank           */ Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.performFind     */ Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.addBookmark     */ Info.NoTab, Info.NoTab, Info.ActiveTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.clearMarks      */ Info.NoTab, Info.NoTab, Info.ActiveTab, Info.CurWndTabs, Info.NoTab,
  /* kBgCmd.goBackFallback  */ Info.ActiveTab,
      OnFirefox ? Info.CurShownTabs : Info.CurWndTabs, Info.NoTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.moveTab         */
      OnFirefox ? Info.CurShownTabs : Info.CurWndTabs, Info.NoTab, Info.ActiveTab, Info.NoTab, Info.CurWndTabsIfRepeat,
  /* kBgCmd.removeRightTab  */ Info.CurWndTabs, Info.NoTab, Info.CurWndTabs, Info.ActiveTab, Info.NoTab,
  /* kBgCmd.restoreTab      */ Info.NoTab, Info.NoTab, Info.ActiveTab, Info.NoTab, Info.NoTab, Info.ActiveTab,
  /* kBgCmd.togglePinTab    */ Info.NoTab, Info.CurWndTabsIfRepeat, Info.ActiveTab, Info.ActiveTab, Info.NoTab,
      OnFirefox ? Info.CurShownTabs : Info.CurWndTabs,
  /* kBgCmd.closeDownloadBar*/ Info.NoTab
]))

const _AsBgC = <T extends Function>(command: T): T => {
  if (!(Build.NDEBUG || command != null)) {
    throw new ReferenceError("Refer a command before it gets inited")
  }
  return Build.NDEBUG ? command : function (this: unknown) { return command.apply(this, arguments) } as unknown as T
}

set_bgC_([
  /* kBgCmd.blank: */ (): void | kBgCmd.blank => {
    let wait = get_cOptions<C.blank, true>().for || get_cOptions<C.blank, true>().wait
    if (wait === "ready") {
      // run in callback, to avoid extra 67ms
      runNextOnTabLoaded({}, null, (): void => { runNextCmdBy(1, get_cOptions<C.blank, true>(), 1) })
      return
    }
    wait = !wait ? 0 : Math.abs(wait === "count" || wait === "number" ? cRepeat : wait | 0)
    wait && runNextCmdBy(1, get_cOptions<C.blank, true>(), Math.max(34, wait))
  },

//#region need cport
  /* kBgCmd.goNext: */ (): void | kBgCmd.goNext => {
    const rawRel = get_cOptions<C.goNext>().rel
    const rel = rawRel ? rawRel + "" : "next"
    const isNext = get_cOptions<C.goNext>().isNext != null ? !!get_cOptions<C.goNext>().isNext
        : !rel.includes("prev") && !rel.includes("before")
    const sed = parseSedOptions_(get_cOptions<C.goNext, true>())
    if (!doesNeedToSed(SedContext.goNext, sed)) {
      framesGoNext(isNext, rel)
      return
    }
    void Promise.resolve(getPortUrl_(framesForTab_.get(cPort.s.tabId_)!.top_)).then((tabUrl): void => {
      const count = isNext ? cRepeat : -cRepeat
      const template = tabUrl && substitute_(tabUrl, SedContext.goNext, sed)
      const [hasPlaceholder, next] = template ? goToNextUrl(template, count
          , get_cOptions<C.goNext>().absolute ? "absolute" : true) : [false, tabUrl]
      if (hasPlaceholder && next) {
        set_cRepeat(count)
        if (get_cOptions<C.goNext>().reuse == null) {
          overrideOption<C.goNext, "reuse">("reuse", ReuseType.current)
        }
        overrideCmdOptions<C.openUrl>({ url_f: next, goNext: false })
        openUrl()
      } else {
        framesGoNext(isNext, rel)
      }
    })
  },
  /* kBgCmd.insertMode: */ (): void | kBgCmd.insertMode => {
    let _key = get_cOptions<C.insertMode>().key, _hud: boolean | UnknownValue,
    hud = (_hud = get_cOptions<C.insertMode>().hideHUD) != null ? !_hud
        : (_hud = get_cOptions<C.insertMode>().hideHud) != null ? !_hud
        : !settingsCache_.hideHud,
    key = _key && typeof _key === "string"
        && (_key.length > 2 || _key.length < 2 && !(<RegExpI> /[0-9a-z]/i).test(_key)) ? stripKey_(_key) : ""
    sendFgCmd(kFgCmd.insertMode, hud, {
      h: hud ? trans_(`${kTip.globalInsertMode}` as "5", [key && ": " + (key.length === 1 ? `" ${key} "` : _key)])
          : null,
      k: key || null,
      i: !!get_cOptions<C.insertMode>().insert,
      p: !!get_cOptions<C.insertMode>().passExitKey,
      r: <BOOL> +!!get_cOptions<C.insertMode>().reset,
      u: !!get_cOptions<C.insertMode>().unhover
    })
  },
  /* kBgCmd.nextFrame: */ _AsBgC<BgCmdNoTab<kBgCmd.nextFrame>>(nextFrame),
  /* kBgCmd.parentFrame: */ _AsBgC<BgCmdNoTab<kBgCmd.parentFrame>>(parentFrame),
  /* kBgCmd.performFind: */ _AsBgC<BgCmdNoTab<kBgCmd.performFind>>(performFind),
  /* kBgCmd.toggle: */ (): void | kBgCmd.toggle => {
    type Keys = SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][0]
    type ManualNamesMap = SelectNameToKey<SettingsNS.ManuallySyncedItems>
    const key: Keys = (get_cOptions<C.toggle>().key || "") + "" as Keys,
    key2 = key === "darkMode" ? "d" as ManualNamesMap["darkMode"]
        : key === "reduceMotion" ? "m" as ManualNamesMap["reduceMotion"]
        : settings_.valuesToLoad_[key],
    old = key2 ? contentPayload_[key2] : 0, keyRepr = trans_("quoteA", [key])
    let value = get_cOptions<C.toggle>().value, isBool = typeof value === "boolean", msg = ""
    if (!key2) {
      msg = trans_(key in settings_.defaults_ ? "notFgOpt" : "unknownA", [keyRepr])
    } else if (typeof old === "boolean") {
      isBool || (value = null)
    } else if (isBool || value === undefined) {
      msg = trans_(isBool ? "notBool" : "needVal", [keyRepr])
    } else if (typeof value !== typeof old) {
      msg = JSON.stringify(old)
      msg = trans_("unlikeVal", [keyRepr, msg.length > 10 ? msg.slice(0, 9) + "\u2026" : msg])
    }
    if (msg) {
      showHUD(msg)
    } else {
      value = settings_.updatePayload_(key2, value)
      const frames = framesForTab_.get(cPort.s.tabId_)!, cur = frames.cur_
      for (const port of frames.ports_) {
        let isCur = port === cur
        portSendFgCmd(port, kFgCmd.toggle, isCur, { k: key2, n: isCur ? keyRepr : "", v: value }, 1)
      }
      runNextCmd<C.toggle>(1)
    }
  },
  /* kBgCmd.showHelp: */ (): void | kBgCmd.showHelp => {
    if (cPort.s.frameId_ === 0 && !(cPort.s.flags_ & Frames.Flags.hadHelpDialog)) {
      initHelp({ a: get_cOptions<C.showHelp, true>() }, cPort)
    } else {
      import(CONST_.HelpDialogJS)
      sendFgCmd(kFgCmd.showHelpDialog, true, get_cOptions<C.showHelp, true>())
    }
  },
  /* kBgCmd.showVomnibar: */ _AsBgC<BgCmdNoTab<kBgCmd.showVomnibar>>(showVomnibar),
  /* kBgCmd.visualMode: */ _AsBgC<BgCmdNoTab<kBgCmd.visualMode>>(enterVisualMode),
//#endregion

  /* kBgCmd.addBookmark: */ (): void | kBgCmd.addBookmark => {
    const path: string | UnknownValue = get_cOptions<C.addBookmark>().folder || get_cOptions<C.addBookmark>().path
    const nodes = path ? (path + "").replace(<RegExpG> /\\/g, "/").split("/").filter(i => i) : []
    const allTabs = !!get_cOptions<C.addBookmark>().all
    if (!nodes.length) { showHUD('Need "path" to a bookmark folder.'); return }
    browser_.bookmarks.getTree((tree): void => {
      if (!tree) { return runtimeError_() }
      let roots = tree[0].children!
      let doesMatchRoot = roots.filter(i => i.title === nodes[0])
      if (doesMatchRoot.length) {
        roots = doesMatchRoot
      } else {
        roots = roots.reduce((i, j) => i.concat(j.children!), [] as chrome.bookmarks.BookmarkTreeNode[])
      }
      let folder: chrome.bookmarks.BookmarkTreeNode | null = null
      for (let node of nodes) {
        roots = roots.filter(i => i.title === node)
        if (!roots.length) {
          return showHUD("The bookmark folder is not found.")
        }
        folder = roots[0]
        roots = folder.children!
        if (!roots) { break }
      }
      (!allTabs && cRepeat * cRepeat < 2 ? getCurTab : getCurShownTabs_)(function doAddBookmarks(tabs?: Tab[]): void {
        if (!tabs || !tabs.length) { runtimeError_(); return }
        const ind = (OnFirefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index
        let [start, end] = allTabs ? [0, tabs.length] : getTabRange(ind, tabs.length)
        let count = end - start
        if (count > 20 && cNeedConfirm) {
              void confirm_("addBookmark", count).then(doAddBookmarks.bind(0, tabs))
              return
        }
        for (const tab of tabs.slice(start, end)) {
          browser_.bookmarks.create({ parentId: folder!.id, title: tab.title, url: getTabUrl(tab) }, runtimeError_)
        }
        showHUD(`Added ${end - start} bookmark${end > start + 1 ? "s" : ""}.`)
      })
    })
  },
  /* kBgCmd.autoOpenFallback: */ (): void | kBgCmd.autoOpenFallback => {
    if (get_cOptions<kBgCmd.autoOpenFallback>().copied === false) { return }
    overrideCmdOptions<C.openUrl>({ copied: true })
    openUrl()
  },
  /* kBgCmd.captureTab: */ _AsBgC<BgCmdActiveTab<kBgCmd.captureTab>>(captureTab),
  /* kBgCmd.clearCS: */ (): void | kBgCmd.clearCS => {
    OnChrome ? ContentSettings_.clearCS_(get_cOptions<C.clearCS, true>(), cPort)
    : (ContentSettings_.complain_ as () => any)()
  },
  /* kBgCmd.clearFindHistory: */ (): void | kBgCmd.clearFindHistory => {
    const incognito = cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true
    FindModeHistory_.removeAll_(incognito)
    return showHUD(trans_("fhCleared", [incognito ? trans_("incog") : ""]))
  },
  /* kBgCmd.clearMarks: */ (): void | kBgCmd.clearMarks => {
    get_cOptions<C.clearMarks>().local ? get_cOptions<C.clearMarks>().all ? Marks_.clear_("#")
    : requireURL_({ H: kFgReq.marks, u: "" as "url", a: kMarkAction.clear }, true) : Marks_.clear_()
  },
  /* kBgCmd.copyWindowInfo: */ _AsBgC<BgCmdNoTab<kBgCmd.copyWindowInfo>>(copyWindowInfo),
  /* kBgCmd.createTab: */ function createTab(tabs: [Tab] | undefined, dedup?: "createTab-dedup"): void {
    let pure = get_cOptions<C.createTab, true>().$pure, tab: Tab | null
    if (pure == null) {
      overrideOption<C.createTab, "$pure">("$pure", pure = !(Object.keys(get_cOptions<C.createTab>()
          ) as (keyof BgCmdOptions[C.createTab])[])
          .some(i => i !== "opener" && i !== "position" && i !== "evenIncognito"))
    }
    if (!pure) {
      openUrl(tabs)
    } else if (!(tab = tabs && tabs.length > 0 ? tabs[0] : null) && curTabId_ >= 0 && !runtimeError_()
        && dedup !== "createTab-dedup") {
      tabsGet(curTabId_, newTab => createTab(newTab && [newTab], "createTab-dedup"))
    } else {
      const opener = get_cOptions<C.createTab>().opener === true
      openMultiTabs(<InfoToCreateMultiTab> As_<Omit<InfoToCreateMultiTab, "url">>(tab ? {
        active: true, windowId: tab.windowId,
        openerTabId: opener ? tab.id : void 0,
        index: newTabIndex(tab, get_cOptions<C.createTab>().position, opener, true)
      } : {active: true}), cRepeat, get_cOptions<C.createTab, true>().evenIncognito, [null], true, tab, selectWndIfNeed)
    }
    return runtimeError_()
  },
  /* kBgCmd.discardTab: */ (tabs: Tab[]): void | kBgCmd.discardTab => {
    if (OnChrome && Build.MinCVer < BrowserVer.Min$tabs$$discard && CurCVer_ < BrowserVer.Min$tabs$$discard) {
      showHUD(trans_("noDiscardIfOld", [BrowserVer.Min$tabs$$discard]))
      return
    }
    let current = (OnFirefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index
      , end = Math.max(0, Math.min(current + cRepeat, tabs.length - 1)),
    count = Math.abs(end - current), step = end > current ? 1 : -1
    if (count > 20) {
        if (cNeedConfirm) {
          void confirm_("discardTab", count).then(bgC_[kBgCmd.discardTab].bind(null, tabs))
          return
        }
    }
    if (!count) { return }
    const near = tabs[current + step]
    if (!near.discarded && (count < 2 || near.autoDiscardable)) {
      Tabs_.discard(near.id, count > 1 ? runtimeError_ : (): void => {
        const err = runtimeError_()
        err && showHUD(trans_("discardFail"))
        return err
      })
    }
    for (let i = 2; i <= count; i++) {
      const tab = tabs[current + step * i]
      if (!tab.discarded && tab.autoDiscardable) {
        Tabs_.discard(tab.id, runtimeError_)
      }
    }
  },
  /* kBgCmd.duplicateTab: */ (): void | kBgCmd.duplicateTab => {
    const tabId = cPort ? cPort.s.tabId_ : curTabId_
    if (tabId < 0) {
      return complainLimits(trans_("dupTab"))
    }
    Tabs_.duplicate(tabId)
    if (cRepeat < 2) { return }
    const fallback = (tab: Tab): void => {
      openMultiTabs({
        url: getTabUrl(tab), active: false, windowId: tab.windowId,
        pinned: tab.pinned, index: tab.index + 2, openerTabId: tab.id
      }, cRepeat - 1, true, [null], true, tab, runtimeError_)
    }
    if (!OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
        || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
        || curIncognito_ === IncognitoType.ensuredFalse
        || CONST_.DisallowIncognito_
        ) {
      tabsGet(tabId, fallback)
    } else {
      getCurWnd(true, (wnd): void => {
        const tab = wnd && wnd.tabs.find(tab2 => tab2.id === tabId)
        if (!tab || !wnd!.incognito || tab.incognito) {
          return tab ? fallback(tab) : runtimeError_()
        }
        for (let count = cRepeat; 0 < --count; ) {
          Tabs_.duplicate(tabId)
        }
      })
    }
  },
  OnEdge ? blank_ :
  /* kBgCmd.goBackFallback: */ (tabs: [Tab]): void | kBgCmd.goBackFallback => {
    tabs.length &&
    framesGoBack({ s: cRepeat, o: get_cOptions<C.goBackFallback, true>() }, null, tabs[0])
  },
  /* kBgCmd.goToTab: */ (tabs: Tab[]): void | kBgCmd.goToTab => {
    let len = tabs.length
    if (len < 2) { return }
    const count = cRepeat, absolute = !!get_cOptions<C.goToTab>().absolute
    const cur = OnFirefox ? selectFrom(tabs, 1) : selectFrom(tabs)
    let index = absolute ? count > 0 ? Math.min(len, count) - 1 : Math.max(0, len + count)
        : Math.abs(count) > len * 2 ? (count > 0 ? len - 1 : 0)
        : cur.index + count
    index = index >= 0 ? index % len : len + (index % len || -len)
    if (tabs[0].pinned && get_cOptions<C.goToTab>().noPinned && !cur.pinned && (count < 0 || absolute)) {
      let start = 1
      while (tabs[start].pinned) { start++ }
      len -= start
      if (absolute || Math.abs(count) > len * 2) {
        index = absolute ? Math.max(start, index) : index || start
      } else {
        index = (cur.index - start) + count
        index = index >= 0 ? index % len : len + (index % len || -len)
        index += start
      }
    }
    const toSelect: ShownTab = tabs[index]
    if (!toSelect.active) { selectTab(toSelect.id) }
  },
  /* kBgCmd.goUp: */ (): void | kBgCmd.goUp => {
    if (get_cOptions<C.goUp>().type !== "frame" && cPort && cPort.s.frameId_) {
      set_cPort(framesForTab_.get(cPort.s.tabId_)?.top_ || cPort)
    }
    const arg: Req.fg<kFgReq.parseUpperUrl> & {u: "url"} = { H: kFgReq.parseUpperUrl, u: "" as "url",
      p: cRepeat,
      t: get_cOptions<C.goUp, true>().trailingSlash, r: get_cOptions<C.goUp, true>().trailing_slash,
      s: parseSedOptions_(get_cOptions<C.goUp, true>()),
    }
    requireURL_(arg)
  },
  /* kBgCmd.joinTabs: */ _AsBgC<BgCmdNoTab<kBgCmd.joinTabs>>(joinTabs),
  /* kBgCmd.mainFrame: */ _AsBgC<BgCmdNoTab<kBgCmd.mainFrame>>(mainFrame),
  /* kBgCmd.moveTab: */ (tabs: Tab[]): void | kBgCmd.moveTab => {
    const tab = selectFrom(tabs), pinned = tab.pinned, useGroup = get_cOptions<kBgCmd.moveTab>().group
    const curIndex = tabs.indexOf(tab)
    let index = Math.max(0, Math.min(tabs.length - 1, curIndex + cRepeat))
    while (pinned !== tabs[index].pinned) { index -= cRepeat > 0 ? 1 : -1 }
    if (!OnEdge && index !== curIndex && useGroup !== "ignore" && useGroup !== false) {
      let curGroup = getGroupId(tab), newGroup = getGroupId(tabs[index])
      if (newGroup !== curGroup && (Math.abs(cRepeat) === 1 || curGroup !== getGroupId(tabs[
            cRepeat > 0 ? index < tabs.length - 1 ? index + 1 : index : index && index - 1]))) {
        if (curGroup !== null) {
          index = curIndex
          newGroup = curGroup
        }
        while (index += cRepeat > 0 ? 1 : -1,
                0 <= index && index < tabs.length && getGroupId(tabs[index]) === newGroup) { /* empty */ }
        index -= cRepeat > 0 ? 1 : -1
      }
    }
    if (index !== curIndex) {
      Tabs_.move(tab.id, { index: index < 0 ? 0
          : index < tabs.length ? tabs[index].index : tabs[tabs.length - 1].index + 1 })
    }
  },
  /* kBgCmd.moveTabToNewWindow: */ _AsBgC<BgCmdNoTab<kBgCmd.moveTabToNewWindow>>(moveTabToNewWindow),
  /* kBgCmd.moveTabToNextWindow: */ _AsBgC<BgCmdActiveTab<kBgCmd.moveTabToNextWindow>>(moveTabToNextWindow),
  /* kBgCmd.openUrl: */ _AsBgC<BgCmdNoTab<kBgCmd.openUrl>>(openUrl),
  /* kBgCmd.reloadTab: */ _AsBgC<BgCmdCurWndTabs<kBgCmd.reloadTab>>(reloadTab),
  /* kBgCmd.removeRightTab: */ (tabs: Tab[]): void | kBgCmd.removeRightTab => {
    if (!tabs) { return }
    const ind = selectFrom(tabs).index, [start, end] = getTabRange(ind, tabs.length, 0, 1)
    Tabs_.remove(tabs[ind + 1 === end || cRepeat > 0 && start !== ind ? start : end - 1].id)
    runNextCmd<C.removeRightTab>(1)
  },
  /* kBgCmd.removeTab: */ _AsBgC<BgCmdNoTab<kBgCmd.removeTab>>(removeTab),
  /* kBgCmd.removeTabsR: */ (tabs: Tab[]): void | kBgCmd.removeTabsR => {
    /** `direction` is treated as limited; limited by pinned */
    let activeTab = selectFrom(tabs), direction = get_cOptions<C.removeTabsR>().other ? 0 : cRepeat
    let i = activeTab ? activeTab.index : 0, noPinned = false
    const filter = get_cOptions<C.removeTabsR, true>().filter
    if (!activeTab) { return }
    if (direction > 0) {
      ++i
      tabs = tabs.slice(i, i + direction)
    } else {
      noPinned = i > 0 && tabs[0].pinned && !tabs[i - 1].pinned
      if (direction < 0) {
        tabs = tabs.slice(Math.max(i + direction, 0), i)
      } else {
        tabs.splice(i, 1)
      }
    }
    if (noPinned) {
      tabs = tabs.filter(tab => !tab.pinned)
    }
    if (filter) {
      const title = filter.includes("title") ? activeTab.title : "",
      full = filter.includes("hash"), activeTabUrl = getTabUrl(activeTab),
      onlyHost = filter.includes("host") ? BgUtils_.safeParseURL_(activeTabUrl) : null,
      urlToFilter = full ? activeTabUrl : onlyHost ? onlyHost.host : activeTabUrl.split("#", 1)[0]
      tabs = tabs.filter(tab => {
        const tabUrl = getTabUrl(tab), parsed = onlyHost ? BgUtils_.safeParseURL_(activeTabUrl) : null
        const url = parsed ? parsed.host : full ? tabUrl : tabUrl.split("#", 1)[0]
        return url === urlToFilter && (!title || tab.title === title)
      })
    }
    if (tabs.length > 0) {
      Tabs_.remove(tabs.map(tab => tab.id), runtimeError_)
      runNextCmd<C.removeTabsR>(1)
    }
  },
  /* kBgCmd.reopenTab: */ (tabs: [Tab] | never[]): void | kBgCmd.reopenTab => {
    if (tabs.length <= 0) { return }
    const tab = tabs[0], group = get_cOptions<C.reopenTab>().group !== false
    if (!OnChrome || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito
        || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
        || curIncognito_ === IncognitoType.ensuredFalse || CONST_.DisallowIncognito_
        || !isRefusingIncognito_(getTabUrl(tab))) {
      reopenTab_(tab, undefined, undefined, group)
    } else {
      Windows_.get(tab.windowId, (wnd): void => {
        if (wnd.incognito && !tab.incognito) {
          tab.openerTabId = tab.windowId = undefined as never
        }
        reopenTab_(tab, undefined, undefined, group)
      })
    }
  },
  /* kBgCmd.restoreGivenTab: */ (): void | kBgCmd.restoreGivenTab => {
    const sessions = !OnEdge ? browserSessions_() : null
    if (!sessions) {
      return complainNoSession()
    }
    const count = Math.abs(cRepeat)
    const doRestore = (list: chrome.sessions.Session[]): void => {
      if (count > list.length) {
        return showHUD(trans_("indexOOR"))
      }
      const session = list[count - 1], item = session.tab || session.window
      if (item) {
        sessions.restore(item.sessionId)
        runNextCmd<C.restoreGivenTab>(1)
      }
    }
    if (count > sessions.MAX_SESSION_RESULTS) {
      return doRestore([])
    }
    if (count <= 1) {
      sessions.restore(null, runtimeError_)
      runNextCmd<C.restoreGivenTab>(1)
      return
    }
    sessions.getRecentlyClosed({ maxResults: count }, doRestore)
  },
  /* kBgCmd.restoreTab: */ (): void | kBgCmd.restoreTab => {
    const sessions = !OnEdge ? browserSessions_() : null
    if (!sessions) {
      return complainNoSession()
    }
    let count = cRepeat
    if (Math.abs(count) < 2 && (cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true)
        && !get_cOptions<C.restoreTab>().incognito) {
      return showHUD(trans_("notRestoreIfIncog"))
    }
    const limit = sessions.MAX_SESSION_RESULTS
    count > limit && (count = limit)
    do {
      sessions.restore(null, runtimeError_)
    } while (0 < --count)
    runNextCmd<C.restoreTab>(1)
  },
  /* kBgCmd.runKey: */ _AsBgC<BgCmdNoTab<kBgCmd.runKey>>(runKeyWithCond),
  /* kBgCmd.searchInAnother: */ (tabs: [Tab]): void | kBgCmd.searchInAnother => {
    let keyword = (get_cOptions<C.searchInAnother>().keyword || "") + ""
    const query = parseSearchUrl_({ u: getTabUrl(tabs[0]) })
    if (!query || !keyword) {
      if (query || !runNextCmd<C.searchInAnother>(0)) {
        showHUD(trans_(keyword ? "noQueryFound" : "noKw"))
      }
      return
    }
    let sed = parseSedOptions_(get_cOptions<C.searchInAnother, true>())
    query.u = substitute_(query.u, SedContext.NONE, sed)
    let url_f = createSearchUrl_(query.u.split(" "), keyword, Urls.WorkType.ActAnyway)
    let reuse = get_cOptions<C.searchInAnother, true>().reuse
    overrideCmdOptions<C.openUrl>({
      url_f, reuse: reuse != null ? reuse : ReuseType.current, opener: true, keyword: ""
    })
    openUrl(tabs)
  },
  /* kBgCmd.sendToExtension: */ (): void | kBgCmd.sendToExtension => {
    let targetID = get_cOptions<C.sendToExtension>().id, data = get_cOptions<C.sendToExtension>().data
    if (targetID && typeof targetID === "string" && data !== void 0) {
      const now = Date.now()
      browser_.runtime.sendMessage(targetID, get_cOptions<C.sendToExtension>().raw ? data : {
        handler: "message", from: "Vimium C", count: cRepeat, keyCode: cKey, data
      }, (cb): void => {
        let err: any = runtimeError_()
        if (err) {
          console.log("Can not send message to the extension %o:", targetID, err)
          showHUD("Error: " + (err.message || err))
        } else if (typeof cb === "string" && Math.abs(Date.now() - now) < 1e3) {
          showHUD(cb)
        }
        err || runNextCmd<C.sendToExtension>(1)
        return err
      })
    } else {
      showHUD('Require a string "id" and message "data"')
    }
  },
  /* kBgCmd.showHUD: */ (): void | kBgCmd.showHUD => {
    let text = get_cOptions<C.showHUD>().text
    showHUD(text ? text + "" : trans_("needText"))
    text && runNextCmd<C.showHUD>(1)
  },
  /* kBgCmd.toggleCS: */ (tabs: [Tab]): void | kBgCmd.toggleCS => {
    OnChrome ? ContentSettings_.toggleCS_(get_cOptions<C.toggleCS, true>(), cRepeat, tabs)
        : (ContentSettings_.complain_ as () => any)()
  },
  /* kBgCmd.toggleMuteTab: */ _AsBgC<BgCmdNoTab<kBgCmd.toggleMuteTab>>(toggleMuteTab),
  /* kBgCmd.togglePinTab: */ _AsBgC<BgCmdCurWndTabs<kBgCmd.togglePinTab>>(togglePinTab),
  /* kBgCmd.toggleTabUrl: */ _AsBgC<BgCmdActiveTab<kBgCmd.toggleTabUrl>>(toggleTabUrl),
  /* kBgCmd.toggleVomnibarStyle: */ (tabs: [Tab]): void | kBgCmd.toggleVomnibarStyle => {
    const tabId = tabs[0].id, toggled = ((get_cOptions<C.toggleVomnibarStyle>().style || "") + "").trim(),
    current = !!get_cOptions<C.toggleVomnibarStyle>().current
    if (!toggled) {
      showHUD(trans_("noStyleName"))
      return
    }
    for (const frame of framesForOmni_) {
      if (frame.s.tabId_ === tabId) {
        frame.postMessage({ N: kBgReq.omni_toggleStyle, t: toggled, c: current })
        return
      }
    }
    current || setOmniStyle_({ t: toggled, o: 1 })
  },
  /* kBgCmd.toggleZoom: */ _AsBgC<BgCmdNoTab<kBgCmd.toggleZoom>>(toggleZoom),
  /* kBgCmd.visitPreviousTab: */ (tabs: Tab[]): void | kBgCmd.visitPreviousTab => {
    if (tabs.length < 2) { runNextCmd<C.visitPreviousTab>(1); return }
    tabs.splice((OnFirefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index, 1)
    tabs = tabs.filter(i => recencyForTab_.has(i.id)).sort(TabRecency_.rCompare_)
    const tab = tabs[cRepeat > 0 ? Math.min(cRepeat, tabs.length) - 1
      : Math.max(0, tabs.length + cRepeat)]
    if (tab) {
      selectTab(tab.id)
      runNextCmd<C.visitPreviousTab>(1)
    }
  },
  /* kBgCmd.closeDownloadBar: */ (): void | kBgCmd.closeDownloadBar => {
    const newWindow = get_cOptions<C.closeDownloadBar>().newWindow
    if (OnFirefox || newWindow === true || !OnChrome && !browser_.permissions) {
      bgC_[kBgCmd.moveTabToNewWindow]()
      return
    }
    Q_(browser_.permissions.contains, { permissions: ["downloads.shelf", "downloads"] }).then((permitted): void => {
      if (permitted) {
        const toggleShelf = browser_.downloads.setShelfEnabled
        let err: string | undefined
        try {
          toggleShelf(false)
          setTimeout((): void => { toggleShelf(true) }, 256)
        } catch (e: any) { err = (e && e.message || e) + "" }
        showHUD(err ? "Can not close the shelf: " + err : "The download bar has been closed")
      } else if (newWindow === false && cPort) {
        showHUD("No permissions to close download bar")
      } else {
        bgC_[kBgCmd.moveTabToNewWindow]()
      }
    })
  }
])
