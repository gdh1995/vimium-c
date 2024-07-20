import * as BgUtils_ from "./utils"
import {
  cPort, cRepeat, cKey, get_cOptions, set_cPort, set_cRepeat, contentPayload_, runOneMapping_,
  framesForOmni_, bgC_, set_bgC_, set_cmdInfo_, curIncognito_, curTabId_, recencyForTab_, settingsCache_, CurCVer_, os_,
  OnChrome, OnFirefox, OnEdge, substitute_, CONST_, curWndId_, findBookmark_, bookmarkCache_, omniPayload_
} from "./store"
import {
  Tabs_, Windows_, InfoToCreateMultiTab, openMultiTabs, tabsGet, getTabUrl, selectFrom, runtimeError_, R_,
  selectTab, getCurWnd, getCurTab, getCurShownTabs_, browserSessions_, browser_, selectWndIfNeed, removeTabsOrFailSoon_,
  getGroupId, isRefusingIncognito_, Q_, Qs_, isNotHidden_, selectIndexFrom
} from "./browser"
import { createSearchUrl_ } from "./normalize_urls"
import { parseSearchUrl_ } from "./parse_urls"
import * as settings_ from "./settings"
import { requireURL_, complainNoSession, showHUD, complainLimits, getPortUrl_, showHUDEx, getCurFrames_ } from "./ports"
import { setMediaState_ } from "./ui_css"
import { trans_, I18nNames, extTrans_ } from "./i18n"
import { stripKey_ } from "./key_mappings"
import {
  confirm_, overrideCmdOptions, runNextCmd, portSendFgCmd, sendFgCmd, overrideOption, runNextCmdBy, fillOptionWithMask,
  runNextOnTabLoaded, getRunNextCmdBy, kRunOn, hasFallbackOptions, needConfirm_, copyCmdOptions, parseFallbackOptions
} from "./run_commands"
import { runKeyWithCond, runKeyInSeq } from "./run_keys"
import { doesNeedToSed, parseSedOptions_ } from "./clipboard"
import { focusOrLaunch_, goToNextUrl, newTabIndex, openUrl } from "./open_urls"
import {
  parentFrame, showVomnibar, findContentPort_, marksActivate_, enterVisualMode, toggleZoom, captureTab, getBlurOption_,
  initHelp, framesGoBack, mainFrame, nextFrame, performFind, framesGoNext, blurInsertOnTabChange
} from "./frame_commands"
import {
  onShownTabsIfRepeat_, getTabRange, getTabsIfRepeat_, tryLastActiveTab_, filterTabsByCond_, testBoolFilter_,
  getNearArrIndex, getNecessaryCurTabInfo
} from "./filter_tabs"
import {
  copyWindowInfo, joinTabs, moveTabToNewWindow, moveTabToNextWindow, reloadTab, removeTab, toggleMuteTab,
  togglePinTab, toggleTabUrl, reopenTab_, onSessionRestored_, toggleWindow
} from "./tab_commands"
import { ContentSettings_, FindModeHistory_, Marks_, TabRecency_ } from "./tools"
import C = kBgCmd
import Info = kCmdInfo

set_cmdInfo_([
  /* kBgCmd.blank           */ Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.performFind     */ Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.addBookmark     */ Info.NoTab, Info.NoTab, Info.NoTab, Info.ActiveTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.clearMarks      */ Info.NoTab, Info.NoTab, Info.ActiveTab, Info.CurShownTabsIfRepeat, Info.NoTab,
  /* kBgCmd.goBackFallback  */ Info.ActiveTab, Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab,
  /* kBgCmd.moveTab         */ Info.CurShownTabsIfRepeat, Info.NoTab, Info.ActiveTab, Info.NoTab,
      Info.CurShownTabsIfRepeat,
  /* kBgCmd.removeRightTab  */ Info.CurShownTabsIfRepeat, Info.NoTab, Info.NoTab, Info.ActiveTab, Info.NoTab,
  /* kBgCmd.restoreTab      */ Info.NoTab, Info.ActiveTab, Info.NoTab, Info.NoTab, Info.ActiveTab,
  /* kBgCmd.togglePinTab    */ Info.NoTab, Info.CurShownTabsIfRepeat, Info.ActiveTab, Info.ActiveTab, Info.NoTab,
      Info.NoTab,
  /* kBgCmd.closeDownloadBar*/ Info.NoTab, Info.NoTab, Info.NoTab, Info.NoTab
] satisfies {
  [K in keyof BgCmdOptions]: K extends keyof BgCmdInfoMap ? BgCmdInfoMap[K] : Info.NoTab
})

const _AsBgC = <T extends Function>(command: T): T => {
  if (!(Build.NDEBUG || command != null)) {
    throw new ReferenceError("Refer a command before it gets inited")
  }
  return Build.NDEBUG ? command : function (this: unknown) { return command.apply(this, arguments) } as unknown as T
}

/* eslint-disable @typescript-eslint/no-base-to-string, @typescript-eslint/no-floating-promises */

set_bgC_([
  /* kBgCmd.blank: */ (): void | kBgCmd.blank => {
    let wait = get_cOptions<C.blank, true>().for || get_cOptions<C.blank, true>().wait
    const useThen = get_cOptions<C.blank>().isError ? 0 : 1
    if (wait === "ready") {
      // run in callback, to avoid extra 67ms
      runNextOnTabLoaded({}, null, (): void => { runNextCmdBy(useThen, get_cOptions<C.blank, true>(), 1) })
      return
    }
    wait = !wait ? hasFallbackOptions(get_cOptions<C.blank, true>()) ? Math.abs(cRepeat) : 0
        : Math.abs(wait === "count" || wait === "number" ? cRepeat : wait | 0)
    if (wait) {
      wait = Math.max(34, wait)
      let block = get_cOptions<C.blank>().block
      block = block != null ? !!block : wait > 17 && wait <= 1000
      block && cPort && cPort.postMessage({ N: kBgReq.suppressForAWhile, t: wait + 50 })
    }
    runNextCmdBy(cRepeat > 0 ? useThen : (1 - useThen) as BOOL, get_cOptions<C.blank, true>(), wait)
  },

//#region need cport
  /* kBgCmd.confirm: */ (): void | kBgCmd.confirm => {
    const ifThen: Promise<string> | string = (get_cOptions<C.confirm, true>().$then || "") + "",
    ifElse = (get_cOptions<C.confirm, true>().$else || "") + "", repeat = cRepeat
    if (!ifThen && !ifElse) { showHUD('"confirm" requires "$then" or "$else"'); return }
    let question: string[] | string | UnknownValue = get_cOptions<C.confirm>().question
        || get_cOptions<C.confirm>().ask || get_cOptions<C.confirm>().text || get_cOptions<C.confirm>().value
    const comp = question ? null : [ifThen, ifElse].map(i => i.split("#", 1)[0].split("+").slice(-1)[0])
    const minRepeat = Math.abs((get_cOptions<C.confirm, true>().minRepeat || 0) | 0)
    const ctx = [get_cOptions<C.confirm, true>().$f, get_cOptions<C.confirm, true>().$retry] as const
    ; (Math.abs(repeat) < minRepeat ? Promise.resolve() : confirm_([!comp ? [question + ""]
        : comp[0] === comp[1] ? ifThen : comp[0].replace(<RegExpOne> /^([$%][a-zA-Z]\+?)+(?=\S)/, "")
    ], repeat)).then((cancelled): void => {
      (cancelled ? ifElse : ifThen) && setTimeout((): void => {
        set_cRepeat(repeat)
        runOneMapping_(cancelled ? ifElse : ifThen, cPort, { c: ctx[0], r: ctx[1], u: 0, w: 0 }, cancelled ? 1 : repeat)
      }, 0)
    })
  },
  /* kBgCmd.goNext: */ (): void | kBgCmd.goNext => {
    const rawRel = get_cOptions<C.goNext>().rel, absolute = !!get_cOptions<C.goNext>().absolute
    const rel = rawRel ? (rawRel + "").toLowerCase() : "next"
    const isNext = get_cOptions<C.goNext>().isNext != null ? !!get_cOptions<C.goNext>().isNext
        : !rel.includes("prev") && !rel.includes("before")
    const sed = parseSedOptions_(get_cOptions<C.goNext, true>())
    if (!doesNeedToSed(SedContext.goNext, sed) && !absolute) {
      framesGoNext(isNext, rel)
      return
    }
    void Promise.resolve(getPortUrl_(cPort && getCurFrames_()!.top_)).then((tabUrl): void => {
      const count = isNext ? cRepeat : -cRepeat
      const exOut: InfoOnSed = {}, template = tabUrl && substitute_(tabUrl, SedContext.goNext, sed)
      const [hasPlaceholder, next] = template ? goToNextUrl(template, count, absolute) : [false, tabUrl]
      if (hasPlaceholder && next) {
        let url = !exOut.keyword_ ? next
            : createSearchUrl_(next.trim().split(BgUtils_.spacesRe_), exOut.keyword_, Urls.WorkType.EvenAffectStatus)
        set_cRepeat(count)
        if (get_cOptions<C.goNext>().reuse == null) {
          overrideOption<C.goNext, "reuse">("reuse", ReuseType.current)
        }
        overrideCmdOptions<C.openUrl>({ url_f: url, goNext: false })
        openUrl()
      } else if (absolute) {
        runNextCmd<C.goNext>(0)
      } else {
        framesGoNext(isNext, rel)
      }
    })
  },
  /* kBgCmd.insertMode: */ (): void | kBgCmd.insertMode => {
    let _key = get_cOptions<C.insertMode>().key,
    key = _key && typeof _key === "string" ? stripKey_(_key).trim() : ""
    key = key.length > 1 || key.length === 1 && !(<RegExpI> /[0-9a-z]/i).test(key)
        && key === key.toUpperCase() && key === key.toLowerCase() ? key : "" // refuse letters in other languages
    const rawHideHUD = get_cOptions<C.insertMode>().hideHUD ?? get_cOptions<C.insertMode>().hideHud
        ?? settingsCache_.hideHud, hideHUD = rawHideHUD === "auto" ? !key : rawHideHUD
    void Promise.resolve(trans_("globalInsertMode", [key && ": " + (key.length === 1 ? `" ${key} "` : `<${key}>`)]))
        .then((msg): void => {
    sendFgCmd(kFgCmd.insertMode, !hideHUD, Object.assign<CmdOptions[kFgCmd.insertMode], Req.FallbackOptions>({
      h: hideHUD ? null : msg,
      k: key || null,
      i: !!get_cOptions<C.insertMode>().insert,
      p: !!get_cOptions<C.insertMode>().passExitKey,
      r: <BOOL> +!!get_cOptions<C.insertMode>().reset,
      bubbles: !!get_cOptions<C.insertMode>().bubbles,
      u: !!get_cOptions<C.insertMode>().unhover
    }, parseFallbackOptions(get_cOptions<C.insertMode, true>()) || {}))
      hideHUD && hideHUD !== "force" && hideHUD !== "always" && showHUD(msg, kTip.raw)
    })
  },
  /* kBgCmd.nextFrame: */ _AsBgC<BgCmdNoTab<kBgCmd.nextFrame>>(nextFrame),
  /* kBgCmd.parentFrame: */ _AsBgC<BgCmdNoTab<kBgCmd.parentFrame>>(parentFrame),
  /* kBgCmd.performFind: */ _AsBgC<BgCmdNoTab<kBgCmd.performFind>>(performFind),
  /* kBgCmd.toggle: */ (resolve): void | kBgCmd.toggle => {
    type Keys = SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][0]
    type ManualNamesMap = SelectNameToKey<SettingsNS.ManuallySyncedItems>
    const key: Keys = (get_cOptions<C.toggle>().key || "") + "" as Keys,
    key2 = key === "darkMode" ? "d" as ManualNamesMap["darkMode"]
        : key === "reduceMotion" ? "m" as ManualNamesMap["reduceMotion"]
        : settings_.valuesToLoad_[key],
    old = key2 ? contentPayload_[key2] : 0, keyRepr = trans_("quoteA", [key])
    let value = get_cOptions<C.toggle>().value, isBool = typeof value === "boolean"
    let msg: I18nNames | null = null, msgArg2 = ""
    if (!key2) {
      msg = key in settings_.defaults_ ? "notFgOpt" : "unknownA"
    } else if (typeof old === "boolean") {
      isBool || (value = null)
    } else if (isBool || value === undefined) {
      msg = isBool ? "notBool" : "needVal"
    } else if (typeof value !== typeof old) {
      msgArg2 = JSON.stringify(old)
      msg = "unlikeVal"
      msgArg2 = msgArg2.length > 10 ? msgArg2.slice(0, 9) + "\u2026" : msgArg2
    }
    Promise.resolve(keyRepr).then((keyReprStr): void => {
    if (msg) {
      showHUD(trans_(msg, [keyReprStr, msgArg2]))
    } else {
      value = settings_.updatePayload_(key2, value) // eslint-disable-line @typescript-eslint/no-unsafe-argument
      if (key2 === "c" || key2 === "n") {
        let str2 = ""
        for (const ch of (value as string).replace(<RegExpG> /\s/g, "")) { str2.includes(ch) || (str2 += ch) }
        value = str2
      }
      const frames = getCurFrames_()!, cur = frames.cur_
      for (const port of frames.ports_) {
        let isCur = port === cur
        portSendFgCmd(port, kFgCmd.toggle, isCur, { k: key2, n: isCur ? keyReprStr : "", v: value }, 1)
      }
      resolve(1)
    }
    })
  },
  /* kBgCmd.showHelp: */ (): void | kBgCmd.showHelp => {
    if (cPort.s.frameId_ === 0 && !(cPort.s.flags_ & Frames.Flags.hadHelpDialog)) {
      void initHelp({ a: get_cOptions<C.showHelp, true>() }, cPort)
    } else {
      Build.MV3 || import(CONST_.HelpDialogJS)
      sendFgCmd(kFgCmd.showHelpDialog, true, get_cOptions<C.showHelp, true>())
    }
  },
  /* kBgCmd.dispatchEventCmd: */ (): void | kBgCmd.dispatchEventCmd => {
    const opts2 = copyCmdOptions(BgUtils_.safeObj_(), get_cOptions<C.dispatchEventCmd>()
        ) as KnownOptions<C.dispatchEventCmd> & SafeObject
    if (!opts2.esc) {
      const key = opts2.key
      let type = (opts2.type || (key ? "keydown" : "")) + "", rawClass = opts2.class, delay = opts2.delay
      let { xy, direct, directOptions } = opts2
      rawClass = rawClass && rawClass[0] === "$" ? rawClass.slice(1)
          : (rawClass && (rawClass[0].toUpperCase() + rawClass.slice(1).replace(<RegExpSearchable<0>> /event$/i, ""))
              || (type.startsWith("mouse") || type.includes("click") ? "Mouse" : "Keyboard") ) + "Event"
      xy = (<RegExpOne> /^(Mouse|Pointer|Wheel)/).test(rawClass) && xy == null ? [0.5, 0.5] : xy
      xy = opts2.xy = BgUtils_.normalizeXY_(xy)
      if (xy && !xy.n) { xy.n = cRepeat; set_cRepeat(1) }
      if (opts2.click) {
        type = "click"
        opts2.c = 1
      } else if (cRepeat < 0) {
        for (const replace of "down up;enter leave;start end;over out".split(";")) {
          const [a, b] = replace.split(" ")
          type = type.replace(a, b) as string
        }
      }
      if (!type) { showHUD('Require a "type" parameter'); runNextCmd<C.dispatchEventCmd>(0); return }
      const rawInit = opts2.init
      const dict: KeyboardEventInit = rawInit && typeof rawInit === "object" ? rawInit : opts2
      const destDict: KeyboardEventInit = {}
      delay = delay && +delay >= 0 ? Math.max(+delay | 0, 1) : null
      for (const i of ["bubbles", "cancelable", "composed"] as const) {
        const v = dict !== opts2 && i in dict ? dict[i] : opts2[i]
        destDict[i] = v !== false && (v != null || type !== "mouseenter" && type !== "mouseleave")
      }
      const skipped: { [key: string]: 1 } = {
        e: 1, c: 1, t: 1, class: 1, type: 1, key: 1, return: 1, delay: 1, esc: 1, click: 1, init: 1, xy: 1, match: 1,
        direct: 1, directOptions: 1, clickable: 1, exclude: 1, evenIf: 1, scroll: 1, typeFilter: 1, textFilter: 1,
        clickableOnHost: 1, excludeOnHost: 1, closedShadow: 1, trust: 1, trusted: 1, isTrusted: 1, superKey: 1,
        target: 1, targetOptions: 1,
      } satisfies {
        [key in Exclude<keyof BgCmdOptions[C.dispatchEventCmd], keyof EventInit | `$${string}`>]: 1
      }
      for (const key of dict === opts2 ? "alt ctrl meta shift super".split(" ") as ("super" | "superKey")[] : []) {
        if (key in opts2 && !((key + "Key") in opts2)) {
          opts2[(key + "Key") as "superKey"] = opts2[key as "super" as unknown as "superKey"]
          delete opts2[key as "superKey"]
        }
      }
      if (opts2.superKey) {
        Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !os_)
        ? destDict.metaKey = true : destDict.ctrlKey = true
        delete opts2.superKey
      }
      for (const [key, val] of Object.entries!(dict)) {
        if (key && (dict !== opts2 || key[0] !== "$") && !skipped.hasOwnProperty(key)) {
          destDict[(dict === opts2 ? key.startsWith("o.") ? key.slice(2) : key
                    : key.startsWith("$") ? key.slice(1) : key) as keyof EventInit] = val as any
          dict === opts2 && delete (opts2)[key as keyof EventInit]
        }
      }
      let nonWordArr: RegExpExecArray | null = null
      if (key && (typeof key === "object" || typeof key === "string")) {
        typeof key === "string" && (nonWordArr = (<RegExpOne> /[^\w]/).exec(key.slice(1)))
        const info = typeof key === "object" ? key as string[] : nonWordArr ? key.split(nonWordArr[0]) : [key]
        if (info[0] && (info.length == 1 || !info[1] || +info[1] >= 0)) {
          nonWordArr && !info[0] && (info[0] = key[0], info[1] || info.splice(1, 1))
          const evKey = info[0], isAlpha = (<RegExpI> /^[a-z]$/i).test(evKey),
          isNum = !isAlpha && evKey >= "0" && evKey <= "9" && evKey.length === 1, lower = evKey.toLowerCase(),
          keyCode = info[1] && (+info[1] | 0) ? +info[1] | 0
              : isAlpha ? lower.charCodeAt(0) - (type !== "keypress" || evKey !== lower ? kCharCode.a - kKeyCode.A : 0)
              : isNum ? evKey.charCodeAt(0) - (kCharCode.N0 - kKeyCode.N0)
              : evKey === "Space" ? kKeyCode.space : 0
          destDict.key = evKey === "Space" ? " "
              : evKey === "Comma" ? "," : evKey === "Slash" ? "/" : evKey === "Minus" ? "-"
              : evKey[0] === "$" && evKey.length > 1 ? evKey.slice(1) : evKey
          if (keyCode && dict.keyCode == null) { destDict.keyCode = keyCode}
          if (keyCode && dict.which == null) { destDict.which = keyCode}
          if (info.length >= 3 && info[2] || dict.code == null) {
            destDict.code = info[2] || (isAlpha ? "Key" + evKey.toUpperCase() : isNum ? "Digit" + evKey : evKey)
          }
        }
      }
      opts2.type = type
      opts2.class = rawClass
      opts2.init = destDict
      opts2.delay = delay
      opts2.direct = !direct || typeof direct !== "string" ? "element,hover,scroll,focus" as "element" : direct
      if (directOptions && !directOptions.search) { directOptions.search = "doc" }
      opts2.directOptions = directOptions || { search: "doc" }
      opts2.e = `Can't create "${rawClass}#${type}"`
      opts2.t = type.startsWith("key") && !!(opts2.trust || opts2.trusted
          || (opts2.isTrusted || (dict as Event).isTrusted) === "force")
    }
    portSendFgCmd(cPort, kFgCmd.dispatchEventCmd, false, opts2 as CmdOptions[kFgCmd.dispatchEventCmd], cRepeat)
  },
  /* kBgCmd.showVomnibar: */ (): void | kBgCmd.showVomnibar => { showVomnibar() },
  /* kBgCmd.marksActivate: */ _AsBgC<BgCmdNoTab<kBgCmd.marksActivate>>(marksActivate_),
  /* kBgCmd.visualMode: */ _AsBgC<BgCmdNoTab<kBgCmd.visualMode>>(enterVisualMode),
//#endregion

  /* kBgCmd.addBookmark: */ (resolve): void | kBgCmd.addBookmark => {
    const id = get_cOptions<C.openBookmark>().id
    const path: string | UnknownValue = id != null && id + ""
        || get_cOptions<C.addBookmark>().folder || get_cOptions<C.addBookmark>().path
    const position = ((get_cOptions<C.addBookmark>().position || "") + "").toLowerCase(
        ) as Extract<BgCmdOptions[C.addBookmark]["position"], string> | ""
    const wantAll = !!get_cOptions<C.addBookmark>().all
    if (!path || typeof path !== "string") { showHUD('Need "folder" to refer a bookmark folder.'); resolve(0); return }
    void findBookmark_(path, id != null && !!(id + "")).then((folder): void => {
      if (!folder) {
        resolve(0)
        complainNoBookmark(folder === false && 'Need valid "folder"')
        return
      }
      const isLeaf = folder.u != null, pid = isLeaf ? folder.pid_ : folder.id_
      let pos = position === "begin" ? 0 : position === "end" ? -1 : position === "before" ? isLeaf ? folder.ind_ : 0
          : isLeaf && position === "after" ? folder.ind_ + 1 : -1;
      (!wantAll && cRepeat * cRepeat < 2 ? getCurTab : getCurShownTabs_)(function doAddBookmarks(tabs?: Tab[]): void {
        if (!tabs || !tabs.length) { resolve(0); return runtimeError_() }
        const curInd = selectIndexFrom(tabs), activeTab = tabs[curInd]
        let [start, end] = wantAll ? [0, tabs.length] : getTabRange(curInd, tabs.length)
        const filter = get_cOptions<C.addBookmark, true>().filter, allTabs = tabs
        tabs = tabs.slice(start, end);
        if (filter) {
          tabs = filterTabsByCond_(activeTab, tabs, filter)
          if (!tabs.length) { resolve(0); return }
        }
        const count = tabs.length
        if (count > 20 && needConfirm_()) {
          void confirm_("addBookmark", count).then(doAddBookmarks.bind(0, allTabs))
          return
        }
        pos = pos >= 0 ? pos : bookmarkCache_.bookmarks_.length
        for (const tab of tabs) {
          browser_.bookmarks.create({ parentId: pid, title: tab.title, url: getTabUrl(tab), index: pos++ }
              , runtimeError_)
        }
        showHUD(`Added ${count} bookmark${count > 1 ? "s" : ""}.`)
        resolve(1)
      })
    })
  },
  /* kBgCmd.autoOpenFallback: */ (resolve): void | kBgCmd.autoOpenFallback => {
    if (get_cOptions<kBgCmd.autoOpenFallback>().copied === false) { resolve(0); return }
    overrideCmdOptions<C.openUrl>({ copied: get_cOptions<kBgCmd.autoOpenFallback, true>().copied || true })
    openUrl()
  },
  /* kBgCmd.captureTab: */ _AsBgC<BgCmdActiveTab<kBgCmd.captureTab>>(captureTab),
  /* kBgCmd.clearCS: */ (resolve): void | kBgCmd.clearCS => {
    OnChrome ? resolve(ContentSettings_.clearCS_(get_cOptions<C.clearCS, true>(), cPort))
    : (ContentSettings_.complain_ as (_: any) => any)(resolve(0))
  },
  /* kBgCmd.clearFindHistory: */ (resolve): void | kBgCmd.clearFindHistory => {
    const incognito = cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true
    FindModeHistory_.removeAll_(incognito)
    showHUDEx(cPort, "fhCleared", 0, [incognito ? ["incog"] : ""])
    resolve(1)
  },
  /* kBgCmd.clearMarks: */ (resolve): void | kBgCmd.clearMarks => {
    const p = cPort
        && findContentPort_(cPort, get_cOptions<C.clearMarks, true>().type, !!get_cOptions<C.clearMarks>().local)
    void Promise.resolve(p).then((port2): void => {
    const removed = get_cOptions<C.clearMarks>().local ? get_cOptions<C.clearMarks>().all ? Marks_.clear_("#")
          : void requireURL_<kFgReq.marks>({ H: kFgReq.marks, U: 0, c: kMarkAction.clear
              , f: parseFallbackOptions(get_cOptions<C.clearMarks, true>()) }, true, 1, port2)
        : Marks_.clear_()
    typeof removed === "number" && resolve(removed > 0 ? 1 : 0)
    })
  },
  /* kBgCmd.copyWindowInfo: */ _AsBgC<BgCmdNoTab<kBgCmd.copyWindowInfo>>(copyWindowInfo),
  /* kBgCmd.createTab: */ function createTab(tabs: [Tab] | undefined, _: OnCmdResolved | 0, dedup?: "dedup"): void {
    let pure = get_cOptions<C.createTab, true>().$pure, tab: Tab | null
    if (pure == null) {
      overrideOption<C.createTab, "$pure">("$pure", pure = !(Object.keys(get_cOptions<C.createTab>()
          ) as (keyof BgCmdOptions[C.createTab])[])
          .some(i => i !== "opener" && i !== "position" && i !== "evenIncognito" && i[0] !== "$"))
    }
    if (!pure) {
      openUrl(tabs)
    } else if (!(tab = tabs && tabs.length > 0 ? tabs[0] : null) && curTabId_ >= 0 && !runtimeError_()
        && dedup !== "dedup") {
      Q_(tabsGet, curTabId_).then((newTab): void => { createTab(newTab && [newTab], 0, "dedup") })
    } else {
      const opener = get_cOptions<C.createTab>().opener === true
      openMultiTabs((!tab ? { active: true } : {
        active: true, windowId: tab.windowId,
        openerTabId: opener ? tab.id : void 0,
        index: newTabIndex(tab, get_cOptions<C.createTab>().position, opener, true)
      } satisfies Omit<InfoToCreateMultiTab, "url">) as InfoToCreateMultiTab
          , cRepeat, get_cOptions<C.createTab, true>().evenIncognito, [null], true, tab, tab2 => {
        tab2 && selectWndIfNeed(tab2)
        getRunNextCmdBy(kRunOn.tabPromise)(tab2)
      })
    }
  },
  /* kBgCmd.discardTab: */ (curOrTabs: [Tab] | Tab[], oriResolve: OnCmdResolved): void | kBgCmd.discardTab => {
    if (OnChrome && Build.MinCVer < BrowserVer.Min$tabs$$discard && CurCVer_ < BrowserVer.Min$tabs$$discard) {
      showHUD(trans_("noDiscardIfOld", [BrowserVer.Min$tabs$$discard]))
      oriResolve(0)
      return
    }
    onShownTabsIfRepeat_(true, 1, function onTabs(tabs, [start, current, end], resolve, force1?: boolean): void {
      if (force1) { [start, end] = getTabRange(current, tabs.length, 0, 1) }
      const filter = get_cOptions<C.discardTab, true>().filter, allTabs = tabs
      tabs = tabs.slice(start, end)
      const activeTab = selectFrom(tabs)
      tabs = filter ? filterTabsByCond_(activeTab, tabs, filter) : tabs
      const count = tabs.includes(activeTab) ? tabs.length - 1 : tabs.length
      if (!count) { resolve(0); return }
      if (count > 20 && needConfirm_()) {
        void confirm_("discardTab", count).then(onTabs.bind(null, allTabs, [start, current, end], resolve))
        return
      }
      const near = tabs[getNearArrIndex(tabs as Tab[], activeTab.index + (cRepeat > 0 ? 1 : -1), cRepeat > 0)]
      let changed: Promise<null | undefined>[] = [], aliveExist = !near.discarded
      if (aliveExist && (count < 2 || near.autoDiscardable !== false)) {
        changed.push(Q_(Tabs_.discard, near.id))
      }
      for (const tab of tabs) {
        if (tab !== activeTab && tab !== near && !tab.discarded) {
          aliveExist = true
          tab.autoDiscardable !== false && changed.push(Q_(Tabs_.discard, tab.id))
        }
      }
      if (!changed.length) {
        showHUD(aliveExist ? trans_("discardFail") : "Discarded.")
        resolve(0)
      } else {
        void Promise.all(changed).then((arr): void => {
          const done = arr.filter(i => i !== void 0), succeed = done.length > 0
          showHUD(succeed ? `Discarded ${done.length} tab(s).` : trans_("discardFail"))
          resolve(succeed)
        })
      }
    }, curOrTabs, oriResolve)
  },
  /* kBgCmd.duplicateTab: */ (resolve: OnCmdResolved): void | kBgCmd.duplicateTab => {
    const tabId = cPort ? cPort.s.tabId_ : curTabId_
    if (tabId < 0) {
      complainLimits(trans_("dupTab"))
      resolve(0)
      return
    }
    const notActive = get_cOptions<C.duplicateTab>().active === false
    Q_(Tabs_.duplicate, tabId).then((result): void => {
      if (!result) { resolve(0); return }
      notActive && selectTab(tabId, runtimeError_)
      notActive ? resolve(1) : runNextOnTabLoaded(get_cOptions<C.duplicateTab, true>(), result)
      if (cRepeat < 2) { return }
    const fallback = (tab: Tab): void => {
      openMultiTabs({
        url: getTabUrl(tab), active: false, windowId: tab.windowId,
        pinned: tab.pinned, index: tab.index + 2, openerTabId: tab.id
      }, cRepeat - 1, true, [null], true, tab, null)
    }
      if (!OnChrome
          || Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || CurCVer_ >= BrowserVer.MinNoAbnormalIncognito
          || curIncognito_ === IncognitoType.ensuredFalse || CONST_.DisallowIncognito_) {
        tabsGet(tabId, fallback)
        return
      }
      getCurWnd(true, (wnd): void => {
        const tab = wnd && wnd.tabs.find(tab2 => tab2.id === tabId)
        if (!tab || !wnd.incognito || tab.incognito) {
          return tab ? fallback(tab) : runtimeError_()
        }
        for (let count = cRepeat; 0 < --count; ) {
          Tabs_.duplicate(tabId)
        }
        resolve(1)
      })
    })
    notActive && selectTab(tabId, runtimeError_)
  },
  OnEdge ? (_tabs, resolve) => { resolve(0) } :
  /* kBgCmd.goBackFallback: */ (tabs: [Tab]): void | kBgCmd.goBackFallback => {
    tabs.length &&
    framesGoBack({ s: cRepeat, o: get_cOptions<C.goBackFallback, true>() }, null, tabs[0])
  },
  /* kBgCmd.goToTab: */ (resolve): void | kBgCmd.goToTab => {
    const absolute = !!get_cOptions<C.goToTab>().absolute
    const filter = get_cOptions<C.goToTab, true>().filter
    const blur = getBlurOption_()
    const goToTab = (tabs: Tab[]): void => {
      const count = cRepeat
      const cur = selectFrom(tabs)
      const allLen = tabs.length
      if (filter) {
        tabs = filterTabsByCond_(cur, tabs, filter)
        if (!tabs.length) { resolve(0); return }
      }
      let len = tabs.length
      const baseInd = getNearArrIndex(tabs as Tab[], cur.index, count < 0)
    let index = absolute ? count > 0 ? Math.min(len, count) - 1 : Math.max(0, len + count)
        : Math.abs(count) > allLen * 2 ? (count > 0 ? len - 1 : 0) : baseInd + count
    index = index >= 0 ? index % len : len + (index % len || -len)
    if (tabs[0].pinned && get_cOptions<C.goToTab>().noPinned && !cur.pinned && (count < 0 || absolute)) {
      let start = 1
      while (start < len && tabs[start].pinned) { start++ }
      len -= start
      if (len < 1) { resolve(0); return }
      if (absolute || Math.abs(count) > allLen * 2) {
        index = absolute ? Math.max(start, index) : index || start
      } else {
        index = (baseInd - start) + count
        index = index >= 0 ? index % len : len + (index % len || -len)
        index += start
      }
    }
      const toSelect = tabs[index], doesGo = !toSelect.active
      if (doesGo) {
        selectTab(toSelect.id, blur? blurInsertOnTabChange : getRunNextCmdBy(kRunOn.tabCb))
      } else {
        resolve(doesGo)
      }
    }
    const reqireAllTabs = (curs?: Tab[]): void => {
      const evenHidden = OnFirefox && testBoolFilter_(filter, "hidden") === true
      onShownTabsIfRepeat_(true, 1, goToTab, curs || [], resolve, evenHidden || null)
    }
    if (absolute) {
      if (cRepeat === 1 && !filter) {
        Q_(Tabs_.query, { windowId: curWndId_, index: 0 }).then((tabs): void => {
          tabs && tabs[0] && isNotHidden_(tabs[0]) ? goToTab(tabs)
          : reqireAllTabs()
        })
      } else {
        reqireAllTabs()
      }
    } else if (Math.abs(cRepeat) === 1) {
      Q_(getCurTab).then(reqireAllTabs)
    } else {
      reqireAllTabs()
    }
  },
  /* kBgCmd.goUp: */ (): void | kBgCmd.goUp => {
    if (get_cOptions<C.goUp>().type !== "frame" && cPort && cPort.s.frameId_) {
      set_cPort(getCurFrames_()?.top_ || cPort)
    }
    const arg: Req.queryUrl<kFgReq.parseUpperUrl> = { H: kFgReq.parseUpperUrl, U: 0,
      p: cRepeat,
      t: get_cOptions<C.goUp, true>().trailingSlash, r: get_cOptions<C.goUp, true>().trailing_slash,
      s: parseSedOptions_(get_cOptions<C.goUp, true>()),
      e: get_cOptions<C.goUp>().reloadOnRoot !== false
    }
    const p = requireURL_<kFgReq.parseUpperUrl>(arg)
    Promise.resolve(p || "").then((): void => {
      if (typeof arg.e === "object") {
        getRunNextCmdBy(kRunOn.otherPromise)(arg.e.p != null || void 0)
      }
    })
  },
  /* kBgCmd.joinTabs: */ _AsBgC<BgCmdNoTab<kBgCmd.joinTabs>>(joinTabs),
  /* kBgCmd.mainFrame: */ _AsBgC<BgCmdNoTab<kBgCmd.mainFrame>>(mainFrame),
  /* kBgCmd.moveTab: */ (curOrTabs: Tab[] | [Tab], resolve): void | kBgCmd.moveTab => {
    const known = selectIndexFrom(curOrTabs)
    if (curOrTabs.length > 0 && (cRepeat < 0 ? (cRepeat < -1 ? known : curOrTabs[known].index) === 0
        : cRepeat > 1 && known === curOrTabs.length - 1)) { resolve(0); return }
    const _rawGroup = !OnEdge && get_cOptions<kBgCmd.moveTab>().group
    const useGroup = _rawGroup !== "ignore" && _rawGroup !== false
    onShownTabsIfRepeat_(true, 1, (tabs): void => {
    const curIndex = selectIndexFrom(tabs), tab = tabs[curIndex], pinned = tab.pinned
    let index = Math.max(0, Math.min(tabs.length - 1, curIndex + cRepeat))
    while (pinned !== tabs[index].pinned) { index -= cRepeat > 0 ? 1 : -1 }
    if (!OnEdge && index !== curIndex && useGroup) {
      let curGroup = getGroupId(tab), newGroup = getGroupId(tabs[index])
      if (newGroup !== curGroup && (Math.abs(cRepeat) === 1 || curGroup !== getGroupId(tabs[
            cRepeat > 0 ? index < tabs.length - 1 ? index + 1 : index : index && index - 1]))) {
        if (curGroup !== null && (curIndex > 0 && getGroupId(tabs[curIndex - 1]) === curGroup
              || curIndex + 1 < tabs.length && getGroupId(tabs[curIndex + 1]) === curGroup)) {
          index = curIndex
          newGroup = curGroup
        }
        while (index += cRepeat > 0 ? 1 : -1,
                0 <= index && index < tabs.length && getGroupId(tabs[index]) === newGroup) { /* empty */ }
        index -= cRepeat > 0 ? 1 : -1
      }
    }
      if (index !== curIndex || !tab.active) {
        Tabs_.move((tab.active ? tab : curOrTabs[0]).id, { index: (tabs as Tab[])[index].index }, R_(resolve))
      } else {
        resolve(0)
      }
    }, curOrTabs, resolve
    , !OnEdge && useGroup ? theOther => getGroupId(curOrTabs[0]) === getGroupId(theOther) : null)
  },
  /* kBgCmd.moveTabToNewWindow: */ _AsBgC<BgCmdNoTab<kBgCmd.moveTabToNewWindow>>(moveTabToNewWindow),
  /* kBgCmd.moveTabToNextWindow: */ _AsBgC<BgCmdActiveTab<kBgCmd.moveTabToNextWindow>>(moveTabToNextWindow),
  /* kBgCmd.openUrl: */ (): void | kBgCmd.openUrl => { openUrl() },
  /* kBgCmd.reloadTab: */ (tabs: Tab[] | [Tab], resolve: OnCmdResolved): void | kBgCmd.reloadTab => {
    onShownTabsIfRepeat_(!get_cOptions<C.reloadTab>().single, 0, reloadTab, tabs, resolve)
  },
  /* kBgCmd.removeRightTab: */ (curTabs: Tab[] | [Tab] | undefined, resolve): void | kBgCmd.removeRightTab => {
    onShownTabsIfRepeat_(false, 1, (tabs, [dest], r):void=>{ removeTabsOrFailSoon_(tabs[dest].id,r) }, curTabs, resolve)
  },
  /* kBgCmd.removeTab: */ _AsBgC<BgCmdNoTab<kBgCmd.removeTab>>(removeTab),
  /* kBgCmd.removeTabsR: */ (resolve): void | kBgCmd.removeTabsR => {
    /** `direction` is treated as limited; limited by pinned */
    const rawOthers = get_cOptions<C.removeTabsR>().others
    const direction = (rawOthers != null ? rawOthers : get_cOptions<C.removeTabsR>().other) ? 0 : cRepeat
    const across = direction === 0 && get_cOptions<C.removeTabsR>().acrossWindows
    across ? Tabs_.query({}, onRemoveTabsR) : getTabsIfRepeat_(direction, onRemoveTabsR)
    function onRemoveTabsR(oriTabs: Tab[] | undefined): void {
      let tabs: Readonly<Tab>[] | undefined = oriTabs
      if (!tabs || tabs.length === 0) { return runtimeError_() }
    let acrossI = across ? tabs.findIndex(i => i.id===curTabId_) : -1, i = acrossI>=0 ? acrossI : selectIndexFrom(tabs),
    noPinned = get_cOptions<C.removeTabsR, true>().noPinned
    const filter = get_cOptions<C.removeTabsR, true>().filter
    const activeTab = tabs[i]
    if (direction > 0) {
      ++i
      tabs = tabs.slice(i, i + direction)
    } else {
      noPinned = noPinned ?? (i > 0 && tabs[0].pinned && !tabs[i - 1].pinned)
      if (direction < 0) {
        tabs = tabs.slice(Math.max(i + direction, 0), i)
      } else {
        (tabs = tabs.slice(0)).splice(i, 1)
      }
    }
    if (noPinned) {
      tabs = tabs.filter(tab => !tab.pinned)
    }
    if (filter) {
      tabs = filterTabsByCond_(activeTab, tabs, filter)
    }
    const mayConfirm = get_cOptions<C.removeTabsR>().mayConfirm
    if (mayConfirm && tabs.length > (typeof mayConfirm === "number" ? Math.max(mayConfirm, 5) : 20)
        && needConfirm_()) {
      void confirm_("closeSomeOtherTabs", tabs.length).then(onRemoveTabsR.bind(null, oriTabs))
      return
    }
    if (tabs.length > 0) {
      direction < 0 && (tabs = tabs.reverse())
      removeTabsOrFailSoon_(tabs.map(tab => tab.id), resolve)
    } else {
      resolve(0)
    }
    }
  },
  /* kBgCmd.reopenTab: */ (tabs: [Tab] | never[], resolve): void | kBgCmd.reopenTab => {
    if (tabs.length <= 0) { resolve(0); return }
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
  /* kBgCmd.restoreTab: */ (resolve): void | kBgCmd.restoreTab => {
    const sessions = !OnEdge ? browserSessions_() : null
    if (!sessions) {
      resolve(0)
      return complainNoSession()
    }
    const onlyOne = !!get_cOptions<C.restoreTab>().one, limit = +sessions.MAX_SESSION_RESULTS || 25
    let count = Math.abs(cRepeat)
    if (count > limit) {
      if (onlyOne) {
        resolve(0); showHUD(trans_("indexOOR"))
        return
      }
      count = limit
    }
    if (!onlyOne && count < 2 && (cPort ? cPort.s.incognito_ : curIncognito_ === IncognitoType.true)
        && !get_cOptions<C.restoreTab>().incognito) {
      resolve(0)
      return showHUD(trans_("notRestoreIfIncog"))
    }
    const activateNew = get_cOptions<C.restoreTab>().active !== false
    let onlyCurrentWnd = get_cOptions<C.restoreTab>().currentWindow === true
    const curTabId = cPort ? cPort.s.tabId_ : curTabId_, curWndId = curWndId_
    const cb = (restored: chrome.sessions.Session | null | undefined): void => {
      if (restored === undefined) { resolve(0); return }
      onSessionRestored_(curWndId, restored, activateNew ? null : curTabId).then((newTab): void => {
        activateNew && newTab ? runNextOnTabLoaded(get_cOptions<C.restoreTab, true>(), newTab) : resolve(1)
      })
    }
    ; (async (): Promise<void> => {
      const expected = Math.max((count * 1.2) | 0, 2)
      let list: chrome.sessions.Session[] | undefined, hasExtra = false
      const filter = !onlyCurrentWnd ? null : (i: chrome.sessions.Session): boolean =>
          !!i.tab && i.tab.windowId > 0 && i.tab.windowId === curWndId
      if (onlyCurrentWnd && count <= Math.min(limit, 25)) {
        list = await Qs_(sessions.getRecentlyClosed, { maxResults: count }) // lgtm [js/superfluous-trailing-arguments]
        if (!Build.NDEBUG || !OnFirefox || Build.DetectAPIOnFirefox) {
          if (list.some(item => !!item.tab && !(item.tab.windowId > 0))) {
            overrideOption<C.restoreTab>("currentWindow", false)
            onlyCurrentWnd = false
          }
        }
        hasExtra = list.length > count // e.g. on Chrome
        list = filter ? list.filter(filter) : list
        if (!hasExtra && list.length < count && expected <= Math.min(limit, 25)) {
          list = await Qs_(sessions.getRecentlyClosed
              , { maxResults: expected }) // lgtm [js/superfluous-trailing-arguments]
          list = filter ? list.filter(filter) : list
        }
      }
      if (!list || !hasExtra && list.length < count) {
        list = await Qs_(sessions.getRecentlyClosed, count <= 25 // lgtm [js/superfluous-trailing-arguments]
              && !onlyCurrentWnd ? { maxResults: count } : {}) // lgtm [js/superfluous-trailing-arguments]
        list = filter ? list.filter(filter) : list
      }
      if (list.length < (onlyOne ? count : 1)) { resolve(0); return showHUD(trans_("indexOOR")) }
      if (count === 1) {
        Q_(sessions.restore, onlyCurrentWnd ? list[0].tab!.sessionId : null).then(cb)
      } else {
        Promise.all(list.slice(onlyOne ? count - 1 : 0, count)
            .map(item => Q_(sessions.restore, (item.tab || item.window)!.sessionId)))
        .then((res): void => { cb(onlyOne ? res[0] : null) })
      }
      activateNew || selectTab(curTabId, runtimeError_)
    })()
  },
  /* kBgCmd.runKey: */ (): void | kBgCmd.runKey => {
    get_cOptions<C.runKey>().$seq == null ? runKeyWithCond()
    : runKeyInSeq(get_cOptions<C.runKey, true>().$seq!, cRepeat, null)
  },
  /* kBgCmd.searchInAnother: */ (tabs: [Tab]): void | kBgCmd.searchInAnother => {
    let keyword = (get_cOptions<C.searchInAnother>().keyword || "") + ""
    const query = parseSearchUrl_({ u: getTabUrl(tabs[0]) })
    if (!query || !keyword) {
      if (!runNextCmd<C.searchInAnother>(0)) {
        showHUD(trans_(keyword ? "noQueryFound" : "noKw"))
      }
      return
    }
    let exOut: InfoOnSed = {}, sed = parseSedOptions_(get_cOptions<C.searchInAnother, true>())
    query.u = substitute_(query.u, SedContext.NONE, sed, exOut)
    exOut.keyword_ != null && (keyword = exOut.keyword_)
    let url_f = createSearchUrl_(query.u.split(" "), keyword, Urls.WorkType.ActAnyway)
    let reuse = get_cOptions<C.searchInAnother, true>().reuse
    overrideCmdOptions<C.openUrl>({
      url_f, reuse: reuse != null ? reuse : ReuseType.current, opener: true, keyword: ""
    })
    openUrl(tabs)
  },
  /* kBgCmd.sendToExtension: */ (resolve): void | kBgCmd.sendToExtension => {
    let targetID = get_cOptions<C.sendToExtension>().id, data = get_cOptions<C.sendToExtension>().data
    if (!(targetID && typeof targetID === "string" && data !== void 0)) {
      showHUD('Require a string "id" and message "data"')
      resolve(0)
      return
    }
    const now = Date.now()
    const onErr = (err: any): void => {
      err = err && err.message || err + ""
      console.log("Can not send message to the extension %o:", targetID, err)
      showHUD("Error: " + err)
      resolve(0)
    }
    try {
      browser_.runtime.sendMessage(targetID, get_cOptions<C.sendToExtension>().raw ? data : {
        handler: "message", from: "Vimium C", count: cRepeat, keyCode: cKey, data
      }, (cb): void => {
        let err: any = runtimeError_()
        if (err) {
          onErr(err)
        } else if (typeof cb === "string" && Math.abs(Date.now() - now) < 1e3) {
          showHUD(cb)
        }
        err || resolve(cb !== false)
        return err
      })
    } catch (ex) { // targetID's format is invalid
      onErr(ex)
    }
  },
  /* kBgCmd.showHUD: */ (resolve): void | kBgCmd.showHUD => {
    let text: string | UnknownValue | Promise<string> = get_cOptions<C.showHUD>().text
    const isNum = typeof text === "number", silent = !!get_cOptions<C.showHUD>().silent
    const isError = get_cOptions<C.showHUD>().isError
    if (!text && !isNum && !silent && isError == null && get_cOptions<C.showHUD>().$f) {
      const fallbackContext = get_cOptions<C.showHUD, true>().$f
      text = fallbackContext && fallbackContext.t ? extTrans_(`${fallbackContext.t as 99}`) : ""
      if (!text) { resolve(false); return }
    }
    silent || showHUD(text || isNum ? text instanceof Promise ? text : text + "" : trans_("needText"))
    resolve(isError != null ? !!isError : !!text || isNum)
  },
  /* kBgCmd.toggleCS: */ (tabs: [Tab], resolve): void | kBgCmd.toggleCS => {
    OnChrome ? ContentSettings_.toggleCS_(get_cOptions<C.toggleCS, true>(), cRepeat, tabs, resolve)
        : (ContentSettings_.complain_ as (_: any) => any)(resolve(0))
  },
  /* kBgCmd.toggleMuteTab: */ _AsBgC<BgCmdNoTab<kBgCmd.toggleMuteTab>>(toggleMuteTab),
  /* kBgCmd.togglePinTab: */ (curs: Tab[] | [Tab], resolve: OnCmdResolved): void | kBgCmd.togglePinTab => {
    onShownTabsIfRepeat_(true, 0, togglePinTab, curs, resolve)
  },
  /* kBgCmd.toggleTabUrl: */ _AsBgC<BgCmdActiveTab<kBgCmd.toggleTabUrl>>(toggleTabUrl),
  /* kBgCmd.toggleVomnibarStyle: */ (tabs: [Tab]): void | kBgCmd.toggleVomnibarStyle => {
    const tabId = tabs ? tabs[0].id : cPort ? cPort.s.tabId_ : curTabId_
    const toggled = ((get_cOptions<C.toggleVomnibarStyle>().style || "") + "").trim() || "dark",
    current = !!get_cOptions<C.toggleVomnibarStyle>().current
    let enable = get_cOptions<C.toggleVomnibarStyle, true>().enable
    if (enable == null) {
      const port = framesForOmni_.find(i => i.s.tabId_ === tabId)
      if (port) {
        port.postMessage({ N: kBgReq.omni_toggleStyle, t: toggled, b: !current })
        return
      }
    }
    let styles: string = omniPayload_.t
    const extSt = styles && ` ${styles} `, oldEnabled = extSt.includes(` ${toggled} `)
    enable = enable != null ? !!enable : !oldEnabled
    if (enable !== oldEnabled || get_cOptions<C.toggleVomnibarStyle>().forced) {
      if (toggled === "dark") {
        setMediaState_(MediaNS.kName.PrefersColorScheme, enable, 2)
      } else {
        styles = enable === oldEnabled ? styles : enable ? styles + toggled : extSt.replace(toggled, " ")
        styles = styles.trim().replace(BgUtils_.spacesRe_, " ")
        omniPayload_.t = styles
        settings_.broadcastOmniConf_({ t: styles })
      }
    }
    runNextCmdBy(enable ? 1 : 0, get_cOptions<C.toggleVomnibarStyle, true>(), 100)
  },
  /* kBgCmd.toggleZoom: */ _AsBgC<BgCmdNoTab<kBgCmd.toggleZoom>>(toggleZoom),
  /* kBgCmd.visitPreviousTab: */ (resolve: OnCmdResolved): void | kBgCmd.visitPreviousTab => {
    const acrossWindows = !!get_cOptions<C.visitPreviousTab>().acrossWindows
    const onlyActive = !!get_cOptions<C.visitPreviousTab>().onlyActive
    const filter = get_cOptions<C.visitPreviousTab, true>().filter
    const evenHidden = OnFirefox ? testBoolFilter_(filter, "hidden") : null
    const blur = getBlurOption_()
    const defaultCondition: chrome.tabs.QueryInfo = OnFirefox && evenHidden !== true ? { hidden: false } : {}
    const cb = (tabs: Tab[]): void => {
      if (tabs.length < 2) {
        if (onlyActive) { showHUD("Only found one browser window") }
        resolve(0); return runtimeError_()
      }
      const curTabId = cPort ? cPort.s.tabId_ : curTabId_, curInd = tabs.findIndex(i => i.id === curTabId)
      const activeTab = curInd >= 0 ? tabs[curInd] : null
      if (curInd >= 0) { tabs.splice(curInd, 1) }
      if (filter) {
        tabs = filterTabsByCond_(activeTab, tabs, filter)
        if (!tabs.length) { resolve(0); return }
      }
      const tabs2 = tabs.filter(i => recencyForTab_.has(i.id)).sort(TabRecency_.rCompare_)
      tabs = onlyActive && tabs2.length === 0 ? tabs.sort((a, b) => b.id - a.id) : tabs2
      const tab = tabs[cRepeat > 0 ? Math.min(cRepeat, tabs.length) - 1 : Math.max(0, tabs.length + cRepeat)]
      if (tab) {
        !onlyActive ? doActivate(tab.id)
        : Windows_.update(tab.windowId, { focused: true }, blur ? () => blurInsertOnTabChange(tab) : R_(resolve))
      } else {
        resolve(0)
      }
    }
    const doActivate = (tabId: number): void => {
      selectTab(tabId, (tab): void =>
          (tab && selectWndIfNeed(tab), blur ? blurInsertOnTabChange(tab) : R_(resolve)()))
    }
    if (cRepeat === 1 && !onlyActive && curTabId_ !== GlobalConsts.TabIdNone) {
      let tabId = tryLastActiveTab_()
      if (tabId >= 0) {
        void Promise.all([Q_(tabsGet, tabId), getNecessaryCurTabInfo(filter)]).then(([tab, activeTab]): void => {
          tab && (acrossWindows || tab.windowId === curWndId_)
          && (!OnFirefox || evenHidden !== true ? isNotHidden_(tab)
              : /* .hidden != "only" */ testBoolFilter_(filter, "hidden", 1) == null || !isNotHidden_(tab)
              ) && (!filter || filterTabsByCond_(activeTab, [tab], filter).length > 0) ? doActivate(tab.id)
          : acrossWindows ? Tabs_.query(defaultCondition, cb) : getCurShownTabs_(cb)
        })
        return
      }
    }
    acrossWindows || onlyActive ? Tabs_.query(onlyActive ? { active: true } : defaultCondition, cb)
    : getCurShownTabs_(cb)
  },
  /* kBgCmd.closeDownloadBar: */ (resolve: OnCmdResolved): void | kBgCmd.closeDownloadBar => {
    const newWindow = get_cOptions<C.closeDownloadBar>().newWindow
    if (OnFirefox || newWindow === true || !OnChrome && !browser_.permissions) {
      bgC_[kBgCmd.moveTabToNewWindow](resolve)
      return
    }
    Q_(browser_.permissions.contains, { permissions: ["downloads.shelf", "downloads"] }).then((permitted): void => {
      if (permitted) {
        const toggleShelf = browser_.downloads.setShelfEnabled
        let err: string | undefined
        try {
          toggleShelf(false)
          setTimeout((): void => { toggleShelf(true); resolve(1) }, 256)
        } catch (e: any) { err = (e && e.message || e) + "" }
        showHUD(err ? "Can not close the shelf: " + err : trans_("downloadBarClosed"))
        err && resolve(0)
      } else if (newWindow === false && cPort) {
        showHUD("No permissions to close download bar")
        resolve(0)
      } else {
        bgC_[kBgCmd.moveTabToNewWindow](resolve)
      }
    })
  },
  /* kBgCmd.reset: */ (): void | kBgCmd.reset => {
    const ref = getCurFrames_()
    const unhover = !!get_cOptions<C.reset>().unhover, suppressKey = get_cOptions<C.reset>().suppress
    for (const frame of ref ? ref.ports_ : []) {
      let obj: CmdOptions[kFgCmd.insertMode] = { r: 1, u: unhover }
      if (frame === ref!.cur_) {
        const fallback = parseFallbackOptions(get_cOptions<C.reset, true>())
        fallback && Object.assign(obj, fallback)
      }
      portSendFgCmd(frame, kFgCmd.insertMode, false, obj, 1)
    }
    (hasFallbackOptions(get_cOptions<C.reset, true>()) ? suppressKey === true : suppressKey !== false) &&
    ref && ref.cur_.postMessage({ N: kBgReq.suppressForAWhile, t: 150 })
  },
  /* kBgCmd.openBookmark: */ (resolve): void | kBgCmd.openBookmark => {
    const rawCache = get_cOptions<C.openBookmark, true>().$cache
    let p: ReturnType<typeof findBookmark_> | undefined
    if (rawCache != null) {
      const id = bookmarkCache_.stamp_ === rawCache[1] ? rawCache[0] : "",
      cached = id && (bookmarkCache_.bookmarks_.find(i => i.id_ === id) || bookmarkCache_.dirs_.find(i => i.id_ === id))
      if (cached) {
        p = Promise.resolve(cached)
      } else {
        overrideOption<C.openBookmark, "$cache">("$cache", null)
      }
    }
    const hasValidCache = !!p, count = cRepeat
    let dynamicResult = false
    if (!p) {
      let id = get_cOptions<C.openBookmark>().id
      let path = get_cOptions<C.openBookmark>().path
      let title = id != null && id + "" || path || get_cOptions<C.openBookmark>().title
    if (!title || typeof title !== "string") {
        showHUD("Invalid bookmark " + (id != null ? "id" : path ? "path" : "title")); resolve(0); return
    }
    const result = fillOptionWithMask<C.openBookmark>(title, get_cOptions<C.openBookmark>().mask, "name"
        , ["path", "title", "mask", "name", "value"], count)
    if (!result.ok) {
      showHUD((result.result ? "Too many potential names" : "No name") + " to find bookmarks")
      return
    }
      dynamicResult = result.useCount
      p = findBookmark_(result.result, id != null && !!(id + ""))
    }
    void p.then((node): void => {
      if (!node) {
        resolve(0)
        complainNoBookmark(node === false && 'Need valid "title" or "title"')
      } else {
        hasValidCache || dynamicResult || overrideOption<C.openBookmark, "$cache">("$cache"
            , [node.id_, bookmarkCache_.stamp_])
        const isLeaf = node.u != null
        overrideCmdOptions(isLeaf ? { url: node.jsUrl_ || node.u }
            : { urls: bookmarkCache_.bookmarks_.filter(i => i.pid_ === node.id_).map(i => i.jsUrl_ || i.u) }, true)
        set_cRepeat(dynamicResult || !isLeaf ? 1 : count)
        openUrl()
      }
    })
  },
  _AsBgC<BgCmdNoTab<kBgCmd.toggleWindow>>(toggleWindow)
])

const complainNoBookmark = (text: string | false) => {
  if (bookmarkCache_.status_ == CompletersNS.BookmarkStatus.revoked) {
    showHUDEx(cPort, "bookmarksRevoked", 1, [])
    setTimeout(() => { focusOrLaunch_({ u: CONST_.OptionsPage_ + "#optionalPermissions" }) }, 800)
  } else {
    showHUD(text || "The bookmark node is not found")
  }
}
