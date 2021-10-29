//#region platform info
export const OnOther_ = !Build.BTypes || Build.BTypes & (Build.BTypes - 1) ? Build.BTypes & BrowserType.Chrome
    && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
        || location.protocol.lastIndexOf("chrome", 0) >= 0) // in case Chrome also supports `browser` in the future
    ? BrowserType.Chrome
    : Build.BTypes & BrowserType.Edge && globalThis.StyleMedia ? BrowserType.Edge
    : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
    : /* an invalid state */ BrowserType.Unknown
    : Build.BTypes as number as BrowserType

export const OnChrome: boolean = !(Build.BTypes & ~BrowserType.Chrome)
    || !!(Build.BTypes & BrowserType.Chrome && OnOther_ & BrowserType.Chrome)
export const OnFirefox: boolean = !(Build.BTypes & ~BrowserType.Firefox)
    || !!(Build.BTypes & BrowserType.Firefox && OnOther_ & BrowserType.Firefox)
export const OnEdge: boolean = !(Build.BTypes & ~BrowserType.Edge)
    || !!(Build.BTypes & BrowserType.Edge && OnOther_ & BrowserType.Edge)
export const OnSafari: boolean = !(Build.BTypes & ~BrowserType.Safari)
    || !!(Build.BTypes & BrowserType.Safari && OnOther_ & BrowserType.Safari)

const userAgentData = navigator.userAgentData
let tmpBrand: NonNullable<Navigator["userAgentData"]>["brands"][0] | undefined
export const IsEdg_: boolean = OnChrome && (!userAgentData ? matchMedia("(-ms-high-contrast)").matches
    : !!userAgentData.brands.find(i => i.brand.includes("Edge") || i.brand.includes("Microsoft"))) 
export const CurCVer_: BrowserVer = !OnChrome ? BrowserVer.assumedVer
    : userAgentData ? (tmpBrand = userAgentData.brands.find(i => i.brand.includes("Chromium")))
      ? tmpBrand.version : BrowserVer.MinMaybe$navigator$$userAgentData > Build.MinCVer
      ? BrowserVer.MinMaybe$navigator$$userAgentData : Build.MinCVer
    : (Build.MinCVer <= BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor ? ((): BrowserVer => {
      const ver = navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
      return !ver ? BrowserVer.assumedVer : +ver[1] === BrowserVer.FakeUAMajorWhenFreezeUserAgent
          && matchMedia("(prefers-color-scheme)").matches ? BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor
          : 0 | ver[1] as string | number as number
    })()
    : 0 | <number> (navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/) || [0, BrowserVer.assumedVer])[1])
export const CurFFVer_ = !OnFirefox ? FirefoxBrowserVer.assumedVer
    : userAgentData ? (tmpBrand = userAgentData.brands.find(i => i.brand.includes("Firefox")))
      ? tmpBrand.version : FirefoxBrowserVer.MinMaybe$navigator$$userAgentData > Build.MinFFVer
      ? FirefoxBrowserVer.MinMaybe$navigator$$userAgentData : Build.MinFFVer
    : 0 | <number>(navigator.userAgent!.match(<RegExpOne> /\bFirefox\/(\d+)/) || [0, FirefoxBrowserVer.assumedVer])[1]
export let installation_: Promise<chrome.runtime.InstalledDetails> | null | undefined
//#endregion

//#region runtime configuration
export const hasEmptyLocalStorage_ = localStorage.length <= 0
export let hasGroupPermission_ff_: boolean | 0 = false
export const settingsCache_ = Object.create(null) as Readonly<SettingsNS.FullCache>
export const contentPayload_ = <SettingsNS.FrontendSettingCache> As_<SettingsNS.DeclaredFrontendValues>({
  v: OnChrome ? CurCVer_ : OnFirefox ? CurFFVer_ : 0,
  d: "", g: false, m: false, o: kOS.win
})
export const omniPayload_ = <SettingsNS.VomnibarPayload> As_<SettingsNS.DeclaredVomnibarPayload>({
  v: OnChrome ? CurCVer_ : OnFirefox ? CurFFVer_ : 0,
  a: 0, c: "", l: "", k: null, o: kOS.win, n: 0, s: "", t: 0
})
export let omniStyleOverridden_ = false
export let findCSS_: FindCSS
export let innerCSS_: string
export let isHighContrast_ff_: boolean
export let needIcon_ = false
export let visualWordsRe_: string
export let iconData_: IconNS.StatusMap<IconNS.IconBuffer> | null | /* no actionIcon in manifest */ undefined
export let helpDialogData_: [
    html: string | null, i18n: Map<string, string> | null, params: Map<string, string> | null] | null

export const newTabUrls_: ReadonlyMap<string, Urls.NewTabType> = new Map()
export const extAllowList_: Map<string, boolean | string> = !OnEdge ? new Map() : null as never
export let bgIniting_ = BackendHandlersNS.kInitStat.START
//#endregion

//#region info about opened tabs
export const framesForTab_ = new Map() as Frames.FramesMap
export const framesForOmni_: Port[] = []
interface RecencyItem { /* index */ i: number; /* mono clock */ t: number }
export interface RecencyMap extends Map<number, RecencyItem> {
  keys: never; entries: never; values: never
  forEach (callback: (frames: RecencyItem, tabId: number) => void): void
}
export let recencyForTab_ = new Map() as RecencyMap
export let curTabId_: number = GlobalConsts.TabIdNone
export let curWndId_: number = GlobalConsts.WndIdNone
export let lastWndId_: number = GlobalConsts.WndIdNone
export let curIncognito_ = Build.MinCVer >= BrowserVer.MinNoAbnormalIncognito || !OnChrome
    ? IncognitoType.ensuredFalse : IncognitoType.mayFalse
//#endregion

//#region navigation and finding/marking history
export let incognitoFindHistoryList_: string[] | null = null
export let incognitoMarkCache_: Map<string, string> | null = null
export const bookmarkCache_ = {
  bookmarks_: [] as CompletersNS.Bookmark[],
  dirs_: [] as CompletersNS.BaseBookmark[],
  status_: CompletersNS.BookmarkStatus.notInited,
  stamp_: 0,
  expiredUrls_: false
}
export const historyCache_ = {
  history_: null as CompletersNS.HistoryItem[] | null,
  domains_: new Map<string, CompletersNS.Domain>(),
  lastRefresh_: 0,
  updateCount_: 0,
  toRefreshCount_: 0
}
export const urlDecodingDict_ = new Map<string, string>()
export let findBookmark: (folder: BOOL, titleOrPath: string) => Promise<CompletersNS.BaseBookmark | false | null>
//#endregion

//#region command context
export let keyFSM_: KeyFSM | null = null
export let mappedKeyRegistry_: SafeDict<string> | null = null
export let keyToCommandMap_: Map<string, CommandsNS.Item>
export let mappedKeyTypes_ = kMapKey.NONE

export let cKey: kKeyCode = kKeyCode.None
let cOptions: CommandsNS.Options = null as never
export let cPort: Frames.Port = null as never
/** any change to `cRepeat` should ensure it won't be `0` */
export let cRepeat = 1
let cEnv: CurrentEnvCache | null = null
export let reqH_: BackendHandlersNS.FgRequestHandlers
export let bgC_: {
  readonly [K in keyof BgCmdOptions]: K extends keyof BgCmdInfoMap
    ? BgCmdInfoMap[K] extends kCmdInfo.ActiveTab ? BgCmdActiveTab<K>
      : BgCmdInfoMap[K] extends kCmdInfo.CurShownTabsIfRepeat | kCmdInfo.CurShownTabs
      ? BgCmdCurWndTabs<K>
      : never
    : BgCmdNoTab<K>
}
export let cmdInfo_: { readonly [k in number]: kCmdInfo }
export let runOneMapping_: (key: string, port: Port | null, fStatus: NonNullable<FgReq[kFgReq.nextKey]["f"]>) => void
//#endregion

//#region variable setter
export const set_curTabId_ = (_newCurTabId: number): void => { curTabId_ = _newCurTabId }
export const set_curWndId_ = (_newCurWndId: number): void => { curWndId_ = _newCurWndId }
export const set_lastWndId_ = (_newLastWndId: number): void => { lastWndId_ = _newLastWndId }
export const set_curIncognito_ = (_newIncog: IncognitoType): IncognitoType => curIncognito_ = _newIncog
export const set_recencyForTab_ = (_newRecencyMap: typeof recencyForTab_): void => { recencyForTab_ = _newRecencyMap }

/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
export const set_incognitoFindHistoryList_ = <T extends string[] | null>(l: T): T => incognitoFindHistoryList_ = l as T
export const set_incognitoMarkCache_ = <T extends Map<string, string> | null>(_c: T): T => incognitoMarkCache_ = _c as T
export const set_findBookmark = (newFind: typeof findBookmark): void => { findBookmark = newFind }
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

export const set_omniStyleOverridden_ = (_newOverridden: boolean): void => { omniStyleOverridden_ = _newOverridden }
export const set_findCSS_ = (_newFindCSS: FindCSS): void => { findCSS_ = _newFindCSS }
export const set_innerCSS_ = (_newInnerCSS: string): void => { innerCSS_ = _newInnerCSS }
export const set_isHighContrast_ff_ = (_newHC: boolean): void => { isHighContrast_ff_ = _newHC }
export const set_needIcon_ = (_newNeedIcon: boolean): void => { needIcon_ = _newNeedIcon }
export const set_visualWordsRe_ = (_newVisualWord: string): void => { visualWordsRe_ = _newVisualWord }
export const set_bgIniting_ = (_newIniting_: typeof bgIniting_): void => { bgIniting_ = _newIniting_ }
export const set_iconData_ = (_newIconData: typeof iconData_): void => { iconData_ = _newIconData }
export const set_hasGroupPermission_ff_ = (_newAllowed: boolean | 0): void => { hasGroupPermission_ff_ = _newAllowed }

export const set_reqH_ = (_newRH: BackendHandlersNS.FgRequestHandlers): void => { reqH_ = _newRH }
export const set_bgC_ = (_newBgC: typeof bgC_): void => { bgC_ = _newBgC }
export const set_cmdInfo_ = (_newCmdInfo: typeof cmdInfo_): void => { cmdInfo_ = _newCmdInfo }
export const set_installation_ = (_newInstallation: typeof installation_): void => { installation_ = _newInstallation }
export const set_runOneMapping_ = (_newF: typeof runOneMapping_): void => { runOneMapping_ = _newF }
//#endregion

//#region some shared util functions
export const blank_ = (): void => { /* empty */ }
export const Completion_ = {} as CompletersNS.GlobalCompletersConstructor
let fakeTabId: number = GlobalConsts.MaxImpossibleTabId
export const getNextFakeTabId = (): number => fakeTabId--
export let setIcon_: (tabId: number, type: Frames.ValidStatus, isLater?: true) => void = blank_
export let sync_: SettingsNS.Sync["set"] = blank_
export let restoreSettings_: (() => Promise<void> | null) | null = null
export let copy_: (text: string | any[], join?: FgReq[kFgReq.copy]["j"], sed?: MixedSedOpts | null) => string =
    (() => "")
export let paste_: (sed?: MixedSedOpts | null, len?: number) => string | Promise<string | null> | null = () => ""
export let substitute_: (text: string, context: SedContext, sed?: MixedSedOpts | null) => string = s => s
export let evalVimiumUrl_: Urls.Executor = () => null
export let backupToLocal_: ((wait: number) => void) | true | null = null
export let shownHash_: ((this: void) => string) | null = null

export const set_setIcon_ = (_newSetIcon: typeof setIcon_): void => { setIcon_ = _newSetIcon }
export const set_sync_ = (_newSync: typeof sync_): void => { sync_ = _newSync }
export const set_restoreSettings_ = (_newRestore: typeof restoreSettings_): void => { restoreSettings_ = _newRestore }
export const set_copy_ = (_newCopy: typeof copy_): void => { copy_ = _newCopy }
export const set_paste_ = (_newPaste: typeof paste_): void => { paste_ = _newPaste }
export const set_substitute_ = (_newSed: typeof substitute_): void => { substitute_ = _newSed }
export const set_evalVimiumUrl_ = (_newEval: typeof evalVimiumUrl_): void => { evalVimiumUrl_ = _newEval }
export const set_shownHash_ = (_newHash: typeof shownHash_): void => { shownHash_ = _newHash }
export const set_backupToLocal_ = (_newBackup: typeof backupToLocal_): void => { backupToLocal_ = _newBackup }
//#endregion

export const CONST_ = {
  BrowserProtocol_: OnChrome ? "chrome" : OnFirefox ? "moz" : OnEdge ? "ms-browser" : "about",
  AllowClipboardRead_: true,
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
  HelpDialogJS: "/background/help_dialog.js" as const,
  OptionsPage_: GlobalConsts.OptionsPage as string, Platform_: "browser",
  HomePage_: "https://github.com/gdh1995/vimium-c",
  GlobalCommands_: null as never as StandardShortcutNames[],
  ShowPage_: "pages/show.html",
  VomnibarPageInner_: "", VomnibarScript_: "/front/vomnibar.js", VomnibarScript_f_: ""
}
