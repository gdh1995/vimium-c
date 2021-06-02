import {
  browserTabs, browserWindows, InfoToCreateMultiTab, openMultiTabs, Tab, tabsGet, getTabUrl, selectFrom, runtimeError_,
  selectTab, getCurWnd, getCurTabs, getCurTab, getCurShownTabs_ff_only, browserSessions, browser_, selectWndIfNeed
} from "./browser"
import {
  cPort, cRepeat, cKey, get_cOptions, set_cPort, set_cRepeat, cNeedConfirm, contentPayload, settings, framesForTab,
  framesForOmni, bgC_, set_bgC_, set_cmdInfo_
} from "./store"
import { indexFrame, requireURL, complainNoSession, showHUD, complainLimits, getPortUrl } from "./ports"
import { doesNeedToSed, parseSedOptions_, substitute_ } from "./clipboard"
import { goToNextUrl, newTabIndex, openUrl } from "./open_urls"
import {
  parentFrame, enterVisualMode, showVomnibar, toggleZoom, captureTab,
  initHelp, setOmniStyle, framesGoBack, mainFrame, nextFrame, performFind, framesGoNext
} from "./frame_commands"
import {
  copyWindowInfo, getTabRange, joinTabs, moveTabToNewWindow, moveTabToNextWindow, reloadTab, removeTab, toggleMuteTab,
  togglePinTab, toggleTabUrl
} from "./tab_commands"
import {
  confirm_, overrideCmdOptions, runNextCmd, runKeyWithCond, portSendFgCmd, sendFgCmd, overrideOption, runNextCmdBy
} from "./run_commands"
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
      Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
      ? Info.CurShownTabs : Info.CurWndTabs, Info.NoTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.moveTab         */
      Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
      ? Info.CurShownTabs : Info.CurWndTabs, Info.NoTab, Info.ActiveTab, Info.NoTab, Info.CurWndTabsIfRepeat,
  /* kBgCmd.removeRightTab  */ Info.CurWndTabs, Info.NoTab, Info.CurWndTabs, Info.ActiveTab, Info.NoTab,
  /* kBgCmd.restoreTab      */ Info.NoTab, Info.NoTab, Info.ActiveTab, Info.NoTab, Info.NoTab, Info.ActiveTab,
  /* kBgCmd.togglePinTab    */ Info.NoTab, Info.CurWndTabsIfRepeat, Info.ActiveTab, Info.ActiveTab, Info.NoTab,
      Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
      ? Info.CurShownTabs : Info.CurWndTabs,
  /* kBgCmd.closeDownloadBar*/ Info.NoTab
]))

set_bgC_([
  /* kBgCmd.blank: */ (): void | kBgCmd.blank => {
    let wait = get_cOptions<C.blank, true>().for || get_cOptions<C.blank, true>().wait
    wait = !wait ? 0 : Math.abs(wait === "count" || wait === "number" ? cRepeat : wait | 0)
    wait && runNextCmdBy(1, get_cOptions<C.blank, true>(), Math.max(34, wait))
  },

  // region: need cport
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
    Promise.resolve(getPortUrl(framesForTab.get(cPort.s.tabId_)!.top_)).then((tabUrl): void => {
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
        : !settings.cache_.hideHud,
    key = _key && typeof _key === "string"
        && (_key.length > 2 || _key.length < 2 && !(<RegExpI> /[0-9a-z]/i).test(_key)) ? BgUtils_.stripKey_(_key) : ""
    sendFgCmd(kFgCmd.insertMode, hud, {
      h: hud ? trans_("" + kTip.globalInsertMode, [key && ": " + (key.length === 1 ? `" ${key} "` : _key)])
          : null,
      k: key || null,
      i: !!get_cOptions<C.insertMode>().insert,
      p: !!get_cOptions<C.insertMode>().passExitKey,
      r: <BOOL> +!!get_cOptions<C.insertMode>().reset,
      u: !!get_cOptions<C.insertMode>().unhover
    })
  },
  /* kBgCmd.nextFrame: */ nextFrame,
  /* kBgCmd.parentFrame: */ parentFrame,
  /* kBgCmd.performFind: */ performFind,
  /* kBgCmd.toggle: */ (): void | kBgCmd.toggle => {
    type Keys = SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][0]
    type ManualNamesMap = SelectNameToKey<SettingsNS.ManuallySyncedItems>
    const key: Keys = (get_cOptions<C.toggle>().key || "") + "" as Keys,
    key2 = key === "darkMode" ? "d" as ManualNamesMap["darkMode"]
        : key === "reduceMotion" ? "m" as ManualNamesMap["reduceMotion"]
        : settings.valuesToLoad_[key],
    old = key2 ? contentPayload[key2] : 0, keyRepr = trans_("quoteA", [key])
    let value = get_cOptions<C.toggle>().value, isBool = typeof value === "boolean", msg = ""
    if (!key2) {
      msg = trans_(key in settings.defaults_ ? "notFgOpt" : "unknownA", [keyRepr])
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
      value = settings.updatePayload_(key2, value)
      const frames = framesForTab.get(cPort.s.tabId_)!, cur = frames.cur_
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
      window.HelpDialog || BgUtils_.require_("HelpDialog")
      sendFgCmd(kFgCmd.showHelpDialog, true, get_cOptions<C.showHelp, true>())
    }
  },
  /* kBgCmd.showVomnibar: */ showVomnibar,
  /* kBgCmd.visualMode: */ enterVisualMode,
  // endregion: need cport

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
      (!allTabs && cRepeat * cRepeat < 2 ? getCurTab : Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          ? getCurShownTabs_ff_only! : getCurTabs)(function doAddBookmarks(tabs?: Tab[]): void {
        if (!tabs || !tabs.length) { runtimeError_(); return }
        const ind = (Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index
        let [start, end] = allTabs ? [0, tabs.length] : getTabRange(ind, tabs.length)
        let count = end - start
        if (count > 20) {
          if (!(Build.BTypes & BrowserType.Chrome)
              || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
            if (cNeedConfirm) {
              confirm_("addBookmark", count, doAddBookmarks.bind(0, tabs))
              return
            }
          } else {
            if (!(count = confirm_("addBookmark", count)!)) { return }
            if (count === 1) { start = ind, end = ind + 1 }
          }
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
  /* kBgCmd.captureTab: */ captureTab,
  /* kBgCmd.clearCS: */ (): void | kBgCmd.clearCS => {
    Build.BTypes & BrowserType.Chrome ? ContentSettings_.clearCS_(get_cOptions<C.clearCS, true>(), cPort)
    : (ContentSettings_.complain_ as () => any)()
  },
  /* kBgCmd.clearFindHistory: */ (): void | kBgCmd.clearFindHistory => {
    const incognito = cPort ? cPort.s.incognito_ : TabRecency_.incognito_ === IncognitoType.true
    FindModeHistory_.removeAll_(incognito)
    return showHUD(trans_("fhCleared", [incognito ? trans_("incog") : ""]))
  },
  /* kBgCmd.clearMarks: */ (): void | kBgCmd.clearMarks => {
    get_cOptions<C.clearMarks>().local ? get_cOptions<C.clearMarks>().all ? Marks_.clear_("#")
    : requireURL({ H: kFgReq.marks, u: "" as "url", a: kMarkAction.clear }, true) : Marks_.clear_()
  },
  /* kBgCmd.copyWindowInfo: */ copyWindowInfo,
  /* kBgCmd.createTab: */ function createTab(tabs: [Tab] | undefined, dedup?: "createTab-dedup"): void {
    let pure = get_cOptions<C.createTab, true>().$pure, tab: Tab | null
    if (pure == null) {
      overrideOption<C.createTab, "$pure">("$pure", pure = !(Object.keys(get_cOptions<C.createTab>()
          ) as (keyof BgCmdOptions[C.createTab])[])
          .some(i => i !== "opener" && i !== "position" && i !== "evenIncognito"))
    }
    if (!pure) {
      openUrl(tabs)
    } else if (!(tab = tabs && tabs.length > 0 ? tabs[0] : null) && TabRecency_.curTab_ >= 0 && !runtimeError_()
        && dedup !== "createTab-dedup") {
      tabsGet(TabRecency_.curTab_, newTab => createTab(newTab && [newTab], "createTab-dedup"))
    } else {
      const opener = get_cOptions<C.createTab>().opener === true
      openMultiTabs(<InfoToCreateMultiTab> As_<Omit<InfoToCreateMultiTab, "url">>(tab ? {
        active: true, windowId: tab.windowId,
        openerTabId: opener ? tab.id : void 0,
        index: newTabIndex(tab, get_cOptions<C.createTab>().position, opener)
      } : {active: true}), cRepeat, get_cOptions<C.createTab, true>().evenIncognito, [null], selectWndIfNeed)
    }
    return runtimeError_()
  },
  /* kBgCmd.discardTab: */ (tabs: Tab[]): void | kBgCmd.discardTab => {
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$tabs$$discard
        && CurCVer_ < BrowserVer.Min$tabs$$discard) {
      showHUD(trans_("noDiscardIfOld", [BrowserVer.Min$tabs$$discard]))
    }
    let current = (Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index
      , end = Math.max(0, Math.min(current + cRepeat, tabs.length - 1)),
    count = Math.abs(end - current), step = end > current ? 1 : -1
    if (count > 20) {
      if (!(Build.BTypes & BrowserType.Chrome)
          || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome) {
        if (cNeedConfirm) {
          confirm_("discardTab", count, bgC_[kBgCmd.discardTab].bind(null, tabs))
          return
        }
      } else {
        count = confirm_("discardTab", count)!
      }
    }
    if (!count) { return }
    const near = tabs[current + step]
    if (!near.discarded && (count < 2 || near.autoDiscardable)) {
      browserTabs.discard(near.id, count > 1 ? runtimeError_ : (): void => {
        const err = runtimeError_()
        err && showHUD(trans_("discardFail"))
        return err
      })
    }
    for (let i = 2; i <= count; i++) {
      const tab = tabs[current + step * i]
      if (!tab.discarded && tab.autoDiscardable) {
        browserTabs.discard(tab.id, runtimeError_)
      }
    }
  },
  /* kBgCmd.duplicateTab: */ (): void | kBgCmd.duplicateTab => {
    const tabId = cPort ? cPort.s.tabId_ : TabRecency_.curTab_
    if (tabId < 0) {
      return complainLimits(trans_("dupTab"))
    }
    browserTabs.duplicate(tabId)
    if (cRepeat < 2) { return }
    const fallback = (tab: Tab): void => {
      openMultiTabs({
        url: getTabUrl(tab), active: false, windowId: tab.windowId,
        pinned: tab.pinned, index: tab.index + 2, openerTabId: tab.id
      }, cRepeat - 1, true, [null])
    }
    if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
        || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
        || TabRecency_.incognito_ === IncognitoType.ensuredFalse
        || settings.CONST_.DisallowIncognito_
        ) {
      tabsGet(tabId, fallback)
    } else {
      getCurWnd(true, (wnd): void => {
        const tab = wnd && wnd.tabs.find(tab2 => tab2.id === tabId)
        if (!tab || !wnd!.incognito || tab.incognito) {
          return tab ? fallback(tab) : runtimeError_()
        }
        for (let count = cRepeat; 0 < --count; ) {
          browserTabs.duplicate(tabId)
        }
      })
    }
  },
  !(Build.BTypes & ~BrowserType.Edge) ? BgUtils_.blank_ :
  /* kBgCmd.goBackFallback: */ (tabs: [Tab]): void | kBgCmd.goBackFallback => {
    tabs.length &&
    framesGoBack({ s: cRepeat, r: get_cOptions<C.goBackFallback, true>().reuse,
      o: { p: get_cOptions<C.goBackFallback, true>().position },
    }, null, tabs[0])
  },
  /* kBgCmd.goToTab: */ (tabs: Tab[]): void | kBgCmd.goToTab => {
    if (tabs.length < 2) { return }
    const count = cRepeat, len = tabs.length
    let cur: Tab | undefined, index = get_cOptions<C.goToTab>().absolute
      ? count > 0 ? Math.min(len, count) - 1 : Math.max(0, len + count)
      : Math.abs(count) > tabs.length * 2 ? (count > 0 ? -1 : 0)
      : (cur = Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index + count
    index = index >= 0 ? index % len : len + (index % len || -len)
    let toSelect: Tab = tabs[index]
    if (toSelect.pinned && count < 0 && get_cOptions<C.goToTab>().noPinned) {
      let curIndex = (cur || (Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs))).index
      if (curIndex > index && !tabs[curIndex - 1].pinned) {
        while (tabs[index].pinned) { index++ }
        if (count > 1 && get_cOptions<C.goToTab>().absolute) {
          index = Math.min(len, index + count) - 1
        }
        toSelect = tabs[index]
      }
    }
    if (!toSelect.active) { selectTab(toSelect.id) }
  },
  /* kBgCmd.goUp: */ (): void | kBgCmd.goUp => {
    if (get_cOptions<C.goUp>().type !== "frame" && cPort && cPort.s.frameId_) {
      set_cPort(indexFrame(cPort.s.tabId_, 0) || cPort)
    }
    requireURL({ H: kFgReq.parseUpperUrl, u: "" as "url",
      p: cRepeat,
      t: get_cOptions<C.goUp, true>().trailingSlash, r: get_cOptions<C.goUp, true>().trailing_slash,
      s: parseSedOptions_(get_cOptions<C.goUp, true>()),
      e: true
    })
  },
  /* kBgCmd.joinTabs: */ joinTabs,
  /* kBgCmd.mainFrame: */ mainFrame,
  /* kBgCmd.moveTab: */ (tabs: Tab[]): void | kBgCmd.moveTab => {
    const tab = selectFrom(tabs), pinned = tab.pinned
    const curIndex = tabs.indexOf(tab)
    let index = Math.max(0, Math.min(tabs.length - 1, curIndex + cRepeat))
    while (pinned !== tabs[index].pinned) { index -= cRepeat > 0 ? 1 : -1 }
    if (Build.BTypes & ~BrowserType.Edge && get_cOptions<kBgCmd.moveTab>().group !== "ignore") {
      let curGroup = tab.groupId, newGroup = tabs[index].groupId
      if (newGroup !== curGroup) {
        if (curGroup && curGroup >= 0) {
          index = curIndex
          newGroup = curGroup
        }
        while (index += cRepeat > 0 ? 1 : -1, 0 <= index && index < tabs.length && tabs[index].groupId === newGroup) {
        }
        index -= cRepeat > 0 ? 1 : -1
      }
    }
    if (index !== curIndex) {
      browserTabs.move(tab.id, { index })
    }
  },
  /* kBgCmd.moveTabToNewWindow: */ moveTabToNewWindow,
  /* kBgCmd.moveTabToNextWindow: */ moveTabToNextWindow,
  /* kBgCmd.openUrl: */ openUrl,
  /* kBgCmd.reloadTab: */ reloadTab,
  /* kBgCmd.removeRightTab: */ (tabs: Tab[]): void | kBgCmd.removeRightTab => {
    if (!tabs) { return }
    const ind = selectFrom(tabs).index, [start, end] = getTabRange(ind, tabs.length, 0, 1)
    browserTabs.remove(tabs[ind + 1 === end || cRepeat > 0 && start !== ind ? start : end - 1].id)
    runNextCmd<C.removeRightTab>(1)
  },
  /* kBgCmd.removeTab: */ removeTab,
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
      browserTabs.remove(tabs.map(tab => tab.id), runtimeError_)
      runNextCmd<C.removeTabsR>(1)
    }
  },
  /* kBgCmd.reopenTab: */ (tabs: [Tab] | never[]): void | kBgCmd.reopenTab => {
    if (tabs.length <= 0) { return }
    const tab = tabs[0]
    ++tab.index
    if (Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !(Build.BTypes & BrowserType.Chrome)
        || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
        || TabRecency_.incognito_ === IncognitoType.ensuredFalse || settings.CONST_.DisallowIncognito_
        || !BgUtils_.isRefusingIncognito_(getTabUrl(tab))) {
      Backend_.reopenTab_(tab)
    } else {
      browserWindows.get(tab.windowId, (wnd): void => {
        if (wnd.incognito && !tab.incognito) {
          tab.openerTabId = tab.windowId = undefined as never
        }
        Backend_.reopenTab_(tab)
      })
    }
  },
  /* kBgCmd.restoreGivenTab: */ (): void | kBgCmd.restoreGivenTab => {
    const sessions = browserSessions()
    if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
          || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions) && !sessions) {
      return complainNoSession()
    }
    const doRestore = (list: chrome.sessions.Session[]): void => {
      if (cRepeat > list.length) {
        return showHUD(trans_("indexOOR"))
      }
      const session = list[cRepeat - 1], item = session.tab || session.window
      if (item) {
        sessions.restore(item.sessionId)
        runNextCmd<C.restoreGivenTab>(1)
      }
    }
    if (cRepeat > sessions.MAX_SESSION_RESULTS) {
      return doRestore([])
    }
    if (cRepeat <= 1) {
      sessions.restore(null, runtimeError_)
      runNextCmd<C.restoreGivenTab>(1)
      return
    }
    sessions.getRecentlyClosed(doRestore)
  },
  /* kBgCmd.restoreTab: */ (): void | kBgCmd.restoreTab => {
    const sessions = browserSessions()
    if ((Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
          || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions) && !sessions) {
      return complainNoSession()
    }
    let count = cRepeat
    if (Math.abs(count) < 2 && (cPort ? cPort.s.incognito_ : TabRecency_.incognito_ === IncognitoType.true)
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
  /* kBgCmd.runKey: */ runKeyWithCond,
  /* kBgCmd.searchInAnother: */ (tabs: [Tab]): void | kBgCmd.searchInAnother => {
    let keyword = (get_cOptions<C.searchInAnother>().keyword || "") + ""
    const query = Backend_.parse_({ u: getTabUrl(tabs[0]) })
    if (!query || !keyword) {
      if (query || !runNextCmd<C.searchInAnother>(0)) {
        showHUD(trans_(keyword ? "noQueryFound" : "noKw"))
      }
      return
    }
    let sed = parseSedOptions_(get_cOptions<C.searchInAnother, true>())
    query.u = substitute_(query.u, SedContext.NONE, sed)
    let url_f = BgUtils_.createSearchUrl_(query.u.split(" "), keyword, Urls.WorkType.ActAnyway)
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
      chrome.runtime.sendMessage(targetID, get_cOptions<C.sendToExtension>().raw ? data : {
        handler: "message", from: "Vimium C", count: cRepeat, keyCode: cKey, data
      }, (cb): void => {
        let err: any = runtimeError_()
        if (err) {
          console.log(`Can not send message to the extension %o:`, targetID, err)
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
  /* kBgCmd.showTip: */ (): void | kBgCmd.showTip => {
    let text = get_cOptions<C.showTip>().text
    showHUD(text ? text + "" : trans_("needText"))
    text && runNextCmd<C.showTip>(1)
  },
  /* kBgCmd.toggleCS: */ (tabs: [Tab]): void | kBgCmd.toggleCS => {
    Build.BTypes & BrowserType.Chrome ? ContentSettings_.toggleCS_(get_cOptions<C.toggleCS, true>(), cRepeat, tabs)
        : (ContentSettings_.complain_ as () => any)()
  },
  /* kBgCmd.toggleMuteTab: */ toggleMuteTab,
  /* kBgCmd.togglePinTab: */ togglePinTab,
  /* kBgCmd.toggleTabUrl: */ toggleTabUrl,
  /* kBgCmd.toggleVomnibarStyle: */ (tabs: [Tab]): void | kBgCmd.toggleVomnibarStyle => {
    const tabId = tabs[0].id, toggled = ((get_cOptions<C.toggleVomnibarStyle>().style || "") + "").trim(),
    current = !!get_cOptions<C.toggleVomnibarStyle>().current
    if (!toggled) {
      showHUD(trans_("noStyleName"))
      return
    }
    for (const frame of framesForOmni) {
      if (frame.s.tabId_ === tabId) {
        frame.postMessage({ N: kBgReq.omni_toggleStyle, t: toggled, c: current })
        return
      }
    }
    current || setOmniStyle({ t: toggled, o: 1 })
  },
  /* kBgCmd.toggleZoom: */ toggleZoom,
  /* kBgCmd.visitPreviousTab: */ (tabs: Tab[]): void | kBgCmd.visitPreviousTab => {
    if (tabs.length < 2) { runNextCmd<C.visitPreviousTab>(1); return }
    tabs.splice((Build.BTypes & BrowserType.Firefox ? selectFrom(tabs, 1) : selectFrom(tabs)).index, 1)
    tabs = tabs.filter(i => TabRecency_.tabs_.has(i.id)).sort(TabRecency_.rCompare_)
    const tab = tabs[cRepeat > 0 ? Math.min(cRepeat, tabs.length) - 1
      : Math.max(0, tabs.length + cRepeat)]
    if (tab) {
      selectTab(tab.id)
      runNextCmd<C.visitPreviousTab>(1)
    }
  },
  /* kBgCmd.closeDownloadBar: */ (): void | kBgCmd.closeDownloadBar => {
    const newWindow = get_cOptions<C.closeDownloadBar>().newWindow
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
        || newWindow === true || Build.BTypes & ~BrowserType.ChromeOrFirefox && !chrome.permissions) {
      bgC_[kBgCmd.moveTabToNewWindow]()
      return
    }
    chrome.permissions.contains({ permissions: ['downloads.shelf', 'downloads'] }, (permitted: boolean): void => {
      if (permitted) {
        const toggleShelf = chrome.downloads.setShelfEnabled
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
      return runtimeError_()
    })
  }
])
