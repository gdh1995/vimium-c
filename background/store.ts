//#region platform info
export const OnOther_ = !Build.BTypes || Build.BTypes & (Build.BTypes - 1) ? Build.BTypes & BrowserType.Chrome
    && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
          || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
    ? BrowserType.Chrome
    : Build.BTypes & BrowserType.Edge && globalThis.StyleMedia ? BrowserType.Edge
    : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
    : /* an invalid state */ BrowserType.Unknown
    : Build.BTypes as number as BrowserType
export const OnChrome: boolean = Build.BTypes === BrowserType.Chrome as number
    || !!(Build.BTypes & BrowserType.Chrome) && OnOther_ === BrowserType.Chrome
export const OnFirefox: boolean = Build.BTypes === BrowserType.Firefox as number
    || !!(Build.BTypes & BrowserType.Firefox) && OnOther_ === BrowserType.Firefox
export const OnEdge: boolean = Build.BTypes === BrowserType.Edge as number
    || !!(Build.BTypes & BrowserType.Edge) && OnOther_ === BrowserType.Edge
export const OnSafari: boolean = Build.BTypes === BrowserType.Safari as number
    || !!(Build.BTypes & BrowserType.Safari) && OnOther_ === BrowserType.Safari

const uad = navigator.userAgentData
const brands = OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredNavigator$userAgentData ? uad!.brands
    : uad && (OnChrome && Build.MinCVer <= BrowserVer.Only$navigator$$userAgentData$$$uaList
  ? uad.brands || uad.uaList : uad.brands)
let tmpBrand: UABrandInfo | undefined
export const IsEdg_: boolean = OnChrome && (Build.MinCVer < BrowserVer.MinEnsuredNavigator$userAgentData && !brands
    ? Build.MV3 ? false : matchMedia("(-ms-high-contrast)").matches
    : !!brands!.find(i => i.brand.includes("Edge") || i.brand.includes("Microsoft")))
export const CurCVer_: BrowserVer = !OnChrome ? BrowserVer.assumedVer
    : (Build.MinCVer >= BrowserVer.MinEnsuredNavigator$userAgentData || brands)
      && (tmpBrand = brands!.find(i => i.brand.includes("Chromium")))
      && parseInt(tmpBrand.version) > BrowserVer.MinMaybe$navigator$$userAgentData - 1
    ? parseInt(tmpBrand.version)
    : (!Build.MV3 && Build.MinCVer <= BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor ? ((): BrowserVer => {
      const ver = navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
      return !ver ? BrowserVer.assumedVer : +ver[1] === BrowserVer.FakeUAMajorWhenFreezeUserAgent
          && matchMedia("(prefers-color-scheme)").matches ? BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor
          : 0 | ver[1] as string | number as number
    })()
    : 0 | <number> (navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/) || [0, BrowserVer.assumedVer])[1])
export let CurFFVer_: FirefoxBrowserVer = !OnFirefox ? FirefoxBrowserVer.assumedVer
    : brands && (tmpBrand = brands.find(i => i.brand.includes("Firefox")))
      && parseInt(tmpBrand.version) >= FirefoxBrowserVer.MinMaybe$navigator$$userAgentData
    ? parseInt(tmpBrand.version)
    : parseInt(navigator.userAgent!.split("Firefox/")[1] || "0") || FirefoxBrowserVer.assumedVer
export let os_: kOS = Build.OS & (Build.OS - 1) ? kOS.win : Build.OS < 8 ? (Build.OS / 2) | 0 : Math.log2(Build.OS)
export let installation_: Promise<chrome.runtime.InstalledDetails | null | undefined> | null | undefined
export const Origin2_ = location.origin + "/"
export const UseZhLang_ = (navigator.language as string).startsWith("zh")
//#endregion

//#region runtime configuration
export let hasEmptyLocalStorage_ = false
export let hasGroupPermission_ff_: boolean | 0 = false
export const settingsCache_ = {} as Readonly<SettingsNS.SettingsWithDefaults>
export const storageCache_: Map<SettingsNS.LocalSettingNames, string> = new Map()
export let newTabUrl_f = "", vomnibarPage_f = ""
export const contentPayload_ = {
  v: OnChrome ? CurCVer_ : OnFirefox ? CurFFVer_ : 0,
  d: "", g: false, m: false
} satisfies SettingsNS.DeclaredFrontendValues as SettingsNS.FrontendSettingCache
export const searchEngines_ = {
  map: new Map<string, Search.Engine>(), rules: [] as Search.Rule[], keywords: null as string | null
}
export const omniPayload_ = {
  v: OnChrome ? IsEdg_ ? -CurCVer_ : CurCVer_ : OnFirefox ? CurFFVer_ : 0,
  c: "", i: 0, l: 0, m: null, n: 0, s: "", t: ""
} satisfies SettingsNS.DeclaredVomnibarPayload as SettingsNS.VomnibarPayload
export const vomnibarBgOptions_: {
  actions: string[], maxBoxHeight_: number, maxWidthInPixel_?: [number, string]
} = { actions: [], maxBoxHeight_: 0 }
export let contentConfVer_ = 0
export let omniConfVer_ = 0
export let findCSS_: FindCSS
export let innerCSS_: string
export let isHighContrast_ff_: boolean
export let needIcon_ = false
export let visualWordsRe_: string
export let iconData_: IconNS.StatusMap<IconNS.IconBuffer> | null | /* no actionIcon in manifest */ undefined
export let helpDialogData_: [html: string | null, i18n: Map<string, string> | null] | null

export const newTabUrls_: ReadonlyMap<string, Urls.NewTabType> = new Map()
export const extAllowList_: Map<string, boolean | string> = !OnEdge ? new Map() : null as never
export let bgIniting_ = BackendHandlersNS.kInitStat.START
export let onInit_: (() => void) | null
export let reqH_: BackendHandlersNS.FgRequestHandlers
export const updateHooks_ = {} as SettingsNS.FullUpdateHookMap

export let lastKeptTabId_ = -1
//#endregion

//#region info about opened tabs
export const framesForTab_ = new Map() as Frames.FramesMap
export const framesForOmni_: Port[] = []
export interface RecencyMap extends Map<number, /** mono time */ number> {
  keys: never; entries: never; values: never
  forEach (callback: (lastVisitTime: number, tabId: number) => void): void
}
export const recencyForTab_ = new Map() as RecencyMap
export let lastVisitTabTime_ = 0
export let curTabId_: number = GlobalConsts.TabIdNone
export let curWndId_: number = GlobalConsts.WndIdNone
export let lastWndId_: number = GlobalConsts.WndIdNone
export let curIncognito_ = Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !OnChrome
    ? IncognitoType.ensuredFalse : IncognitoType.mayFalse
export let saveRecency_: (() => void) | null = null
//#endregion

//#region navigation and finding/marking history
export let incognitoFindHistoryList_: string[] | null = null
export let incognitoMarkCache_: Map<string, string> | null = null
export const bookmarkCache_ = {
  bookmarks_: [] as CompletersNS.Bookmark[],
  dirs_: [] as CompletersNS.BookmarkFolder[],
  status_: CompletersNS.BookmarkStatus.notInited,
  stamp_: 0,
}
export const historyCache_ = {
  history_: null as CompletersNS.HistoryItem[] | null,
  domains_: new Map<string, CompletersNS.Domain>(),
  lastRefresh_: 0,
  updateCount_: 0,
  toRefreshCount_: 0
}
export let urlDecodingDict_ = new Map<string, string>()
export let findBookmark_: (titleOrPath: string, isId: boolean) =>
    Promise<CompletersNS.Bookmark | CompletersNS.BookmarkFolder | false | null>
//#endregion

//#region command context
export let keyFSM_: KeyFSM | null = null
export let mappedKeyRegistry_: SafeDict<string> | null = null
export let keyToCommandMap_: Map<string, CommandsNS.Item>
export let mappedKeyTypes_ = kMapKey.NONE
export const innerClipboard_: ReadonlyMap<string, string> = new Map<string, string>()

export let cKey: kKeyCode = kKeyCode.None
let cOptions: CommandsNS.Options = null as never
export let cPort: Frames.Port = null as never
/** any change to `cRepeat` should ensure it won't be `0` */
export let cRepeat = 1
let cEnv: CurrentEnvCache | null = null
export let bgC_: {
  readonly [K in keyof BgCmdOptions]: K extends keyof BgCmdInfoMap
    ? BgCmdInfoMap[K] extends kCmdInfo.ActiveTab ? BgCmdActiveTab<K>
      : BgCmdInfoMap[K] extends kCmdInfo.CurShownTabsIfRepeat | kCmdInfo.CurShownTabs
      ? BgCmdCurWndTabs<K>
      : never
    : BgCmdNoTab<K>
}
export let cmdInfo_: { readonly [k in number]: kCmdInfo }
export let runOneMapping_: (key: string, port: Port | null, fStatus: NonNullable<FgReq[kFgReq.nextKey]["f"]>
    , baseCount?: number) => void
export let inlineRunKey_: (rootRegistry: Writable<CommandsNS.Item>, path?: CommandsNS.Item[]) => void
export let focusAndExecuteOn_: <T extends FgCmdAcrossFrames> (port: Port, cmd: T, options: CmdOptions[T], count: number
    , focusAndShowFrameBorder: BOOL) => void
export let teeTask_: BaseTeeTask & { /** unique id */ i: number } | null = null
export let offscreenPort_: Frames.BrowserPort | null = null
//#endregion

//#region variable setter
export const set_lastVisitTabTime_ = (_newLastVisit: number): void => { lastVisitTabTime_ = _newLastVisit }
export const set_curTabId_ = (_newCurTabId: number): void => { curTabId_ = _newCurTabId }
export const set_curWndId_ = (_newCurWndId: number): void => { curWndId_ = _newCurWndId }
export const set_lastWndId_ = (_newLastWndId: number): void => { lastWndId_ = _newLastWndId }
export const set_curIncognito_ = (_newIncog: IncognitoType): IncognitoType => curIncognito_ = _newIncog
export const set_saveRecency_ = (_newRecSaver: typeof saveRecency_): void => { saveRecency_ = _newRecSaver }

/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
export const set_incognitoFindHistoryList_ = <T extends string[] | null>(l: T): T => incognitoFindHistoryList_ = l as T
export const set_incognitoMarkCache_ = <T extends Map<string, string> | null>(_c: T): T => incognitoMarkCache_ = _c as T
export const set_urlDecodingDict_ = (newDecoding: typeof urlDecodingDict_): void => { urlDecodingDict_ = newDecoding }
export const set_findBookmark_ = (newFind: typeof findBookmark_): void => { findBookmark_ = newFind }
export const set_helpDialogData_ = <T extends typeof helpDialogData_> (_newDat: T): T => helpDialogData_ = _newDat as T
/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */

export const set_keyFSM_ = (_newKeyFSM: typeof keyFSM_): void => { keyFSM_ = _newKeyFSM }
export const set_mappedKeyRegistry_ = (_newDict: typeof mappedKeyRegistry_): void => { mappedKeyRegistry_ = _newDict }
export const set_keyToCommandMap_ = (_newMap: typeof keyToCommandMap_): void => { keyToCommandMap_ = _newMap }
export const set_mappedKeyTypes_ = (_newTypes: typeof mappedKeyTypes_): void => { mappedKeyTypes_ = _newTypes }
export const set_cKey = (_newKey: kKeyCode): void => { cKey = _newKey }
export const get_cOptions = <K extends keyof BgCmdOptions = kBgCmd.blank, Trust extends boolean = false> (
    ): (Trust extends true ? KnownOptions<K> : UnknownOptions<K>) & SafeObject => cOptions as any
export const set_cOptions = <T> (_newOpts: CommandsNS.Options & T | null): void => { cOptions = _newOpts! }
export const set_cPort = (_newPort: Frames.Port): void => { cPort = _newPort! }
export const set_cRepeat = (_newRepeat: number): void => { cRepeat = _newRepeat }
export const get_cEnv = (): typeof cEnv => cEnv
export const set_cEnv = (_newEnv: typeof cEnv): void => { cEnv = _newEnv }

export const set_hasEmptyLocalStorage_ = (_newEmpty: boolean): void => { hasEmptyLocalStorage_ = _newEmpty }
export const set_newTabUrl_f = (_newNTP: string): void => { newTabUrl_f = _newNTP }
export const set_vomnibarPage_f = (_newOmniP: string): void => { vomnibarPage_f = _newOmniP }
export const set_findCSS_ = (_newFindCSS: FindCSS): void => { findCSS_ = _newFindCSS }
export const set_innerCSS_ = (_newInnerCSS: string): void => { innerCSS_ = _newInnerCSS }
export const set_isHighContrast_ff_ = (_newHC: boolean): void => { isHighContrast_ff_ = _newHC }
export const set_needIcon_ = (_newNeedIcon: boolean): void => { needIcon_ = _newNeedIcon }
export const set_visualWordsRe_ = (_newVisualWord: string): void => { visualWordsRe_ = _newVisualWord }
export const set_bgIniting_ = (_newIniting_: typeof bgIniting_): void => { bgIniting_ = _newIniting_ }
export const set_onInit_ = (_newInit: typeof onInit_): void => { onInit_ = _newInit }
export const set_iconData_ = (_newIconData: typeof iconData_): void => { iconData_ = _newIconData }
export const set_hasGroupPermission_ff_ = (_newAllowed: boolean | 0): void => { hasGroupPermission_ff_ = _newAllowed }
export const set_lastKeptTabId_ = (_newKeptTabId: number): void => { lastKeptTabId_ = _newKeptTabId }
export const set_contentConfVer_ = (_newContConfVer: number): number => { return contentConfVer_ = _newContConfVer }
export const set_omniConfVer_ = (_newOmniConfVer: number): number => { return omniConfVer_ = _newOmniConfVer }

export const set_reqH_ = (_newRH: BackendHandlersNS.FgRequestHandlers): void => { reqH_ = _newRH }
export const set_bgC_ = (_newBgC: typeof bgC_): void => { bgC_ = _newBgC }
export const set_cmdInfo_ = (_newCmdInfo: typeof cmdInfo_): void => { cmdInfo_ = _newCmdInfo }
export const set_installation_ = (_newInstallation: typeof installation_): void => { installation_ = _newInstallation }
export const set_runOneMapping_ = (_newF: typeof runOneMapping_): void => { runOneMapping_ = _newF }
export const set_inlineRunKey_ = (_newInlineRunKey: typeof inlineRunKey_): void => { inlineRunKey_ = _newInlineRunKey }
export const set_focusAndExecuteOn_ = (_newFAE: typeof focusAndExecuteOn_): void => { focusAndExecuteOn_ = _newFAE }
export const replaceTeeTask_ = (expected: number | null, newTask: typeof teeTask_): typeof teeTask_ => {
  const old = teeTask_, matches = !expected || old && old.i === expected
  teeTask_ = matches ? newTask : old
  return matches ? old : null
}
export const set_offscreenPort_ = (_newOffscrPort: typeof offscreenPort_): void => { offscreenPort_ = _newOffscrPort}
//#endregion

//#region some shared util functions
export const blank_ = (): void => { /* empty */ }
export const Completion_ = {} as CompletersNS.GlobalCompletersConstructor
let fakeTabId: number = GlobalConsts.MaxImpossibleTabId
export const getNextFakeTabId = (): number => fakeTabId--
export let setIcon_: (tabId: number, type: Frames.ValidStatus, isLater?: true) => void = blank_
export let sync_: SettingsNS.Sync["set"] = blank_
export let restoreSettings_: Promise<void> | null = null
export let copy_: (text: string | any[], join?: FgReq[kFgReq.copy]["j"]
    , sed?: MixedSedOpts | null, keyword?: string | null, noAutoTrim?: boolean) => string | Promise<string> = (() => "")
export let paste_: (sed?: MixedSedOpts | null, len?: number, exOut?: InfoOnSed
    ) => string | Promise<string | null> | null = () => ""
export let readInnerClipboard_: (name: string) => string = () => ""
export let substitute_: (text: string, context: SedContext, sed?: MixedSedOpts | null, exOut?: InfoOnSed) => string
    = s => s
export let evalVimiumUrl_: Urls.Executor = () => null
export let updateToLocal_: ((wait: number) => void) | true | null = null
export let shownHash_: ((this: void) => string) | null = null
export let runOnTee_: <K extends keyof TeeTasks>(task: K, serializable: TeeTasks[K]["s"]
    , data: TeeTasks[K]["d"]) => Promise<boolean | string>

export const set_setIcon_ = (_newSetIcon: typeof setIcon_): void => { setIcon_ = _newSetIcon }
export const set_sync_ = (_newSync: typeof sync_): void => { sync_ = _newSync }
export const set_restoreSettings_ = (_newRestore: typeof restoreSettings_): void => { restoreSettings_ = _newRestore }
export const set_copy_ = (_newCopy: typeof copy_): void => { copy_ = _newCopy }
export const set_paste_ = (_newPaste: typeof paste_): void => { paste_ = _newPaste }
export const set_readInnerClipboard_ = (_newRIC: typeof readInnerClipboard_): void => { readInnerClipboard_ = _newRIC }
export const set_substitute_ = (_newSed: typeof substitute_): void => { substitute_ = _newSed }
export const set_evalVimiumUrl_ = (_newEval: typeof evalVimiumUrl_): void => { evalVimiumUrl_ = _newEval }
export const set_shownHash_ = (_newHash: typeof shownHash_): void => { shownHash_ = _newHash }
export const set_updateToLocal_ = (_newBackup: typeof updateToLocal_): void => { updateToLocal_ = _newBackup }
export const set_runOnTee_ = (_newRunOnTee_: typeof runOnTee_): void => { runOnTee_ = _newRunOnTee_ }

export const set_CurFFVer_ = OnFirefox ? (ver: FirefoxBrowserVer) => { CurFFVer_ = ver } : blank_
export const set_os_ = Build.OS & (Build.OS - 1) ? (newOS: kOS) => { os_ = newOS } : 0 as never as null
//#endregion

export const CONST_ = {
  BrowserProtocol_: OnChrome ? "chrome" : OnFirefox ? "moz" : OnEdge ? "ms-browser" : "about",
  BaseCSSLength_: 0,
  // should keep lower case
  NtpNewTab_: OnEdge ? <RegExpOne> /^https:\/\/www\.msn\.\w+\/spartan\/ntp\b/
      : OnChrome && IsEdg_ ? <RegExpOne> /^https:\/\/(ntp|www)\.msn\.\w+\/(edge|spartan)\/ntp\b/
      : OnChrome ? "chrome-search://local-ntp/local-ntp.html"
      : ":",
  DisallowIncognito_: false,
  ContentScripts_: null as never as string[],
  VerCode_: "", VerName_: "",
  GitVer: BuildStr.Commit as string,
  Injector_: "/lib/injector.js",
  TeeFrame_: "/front/vomnibar-tee.html",
  OffscreenFrame_: "/front/offscreen.html",
  HelpDialogJS: "/background/help_dialog.js" as const,
  OptionsPage_: GlobalConsts.OptionsPage as string, Platform_: "browser", BrowserName_: "",
  HomePage_: "https://github.com/gdh1995/vimium-c",
  GlobalCommands_: null as never as StandardShortcutNames[],
  ShowPage_: "/pages/show.html",
  VomnibarPageInner_: "", VomnibarScript_: "/front/vomnibar.js", VomnibarScript_f_: ""
}
