declare namespace Search {
  interface RawEngine {
    url_: string;
    blank_: string;
    name_: string;
  }
  interface Engine extends Readonly<RawEngine> {}
  interface Result {
    readonly url_: string;
    readonly indexes_: number[];
  }
  interface Executor {
    (query: string[], url: string, blank: string, indexes: number[]): Result;
    (query: string[], url: string, blank: string): string;
  }
  interface TmpRule { prefix_: string; matcher_: RegExpOne | RegExpI }
  interface Rule {
    readonly prefix_: string;
    readonly matcher_: RegExp;
    readonly name_: string;
    readonly delimiter_: RegExpOne | RegExpI | string;
  }
}

declare namespace Urls {
  const enum kEval {
    math = 0, copy = 1, search = 2, ERROR = 3, status = 4, paste = 5,
    plainUrl = 6,
  }

  interface BaseEvalResult extends Array<any> {
    readonly [0]: string | string[];
    readonly [1]: kEval;
    readonly [2]?: undefined | string;
  }
  interface BasePlainEvalResult<T extends kEval> extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: T;
    readonly [2]?: undefined;
  }
  interface MathEvalResult extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: kEval.math;
    readonly [2]: string;
  }
  interface SearchEvalResult extends BaseEvalResult {
    readonly [0]: string[];
    readonly [1]: kEval.search;
    readonly [2]?: undefined;
  }
  interface CopyEvalResult extends BasePlainEvalResult<kEval.copy> {}
  interface PasteEvalResult extends BasePlainEvalResult<kEval.paste> {}
  interface ErrorEvalResult extends BasePlainEvalResult<kEval.ERROR> {}
  interface StatusEvalResult extends BasePlainEvalResult<kEval.status> {
    readonly [0]: Frames.ForcedStatusText;
  }

  type EvalArrayResultWithSideEffects = CopyEvalResult;

  type SpecialUrl = BaseEvalResult | Promise<BaseEvalResult>;
  type Url = string | SpecialUrl;

  const enum Type {
    Full = 0,
    Default = Full,
    NoProtocolName = 1,
    NoSchema = 2,
    MaxOfInputIsPlainUrl = NoSchema,
    PlainVimium = 3,
    Search = 4, // eslint-disable-line no-shadow
    Functional = 5,
  }
  const enum TempType {
    Unspecified = -1,
    __mask = -2,
  }

  const enum TldType {
    NonENTld = 2,
    ENTld = 1,
    NotTld = 0
  }

  const enum WorkType {
    Default = 0,
    KeepAll = -2,
    ConvertKnown = -1,
    ActIfNoSideEffects = 1,
    ActAnyway = 2,
    EvenAffectStatus = 3,
    ValidNormal = Default,
    FakeType = 9,
  }
  type WorkEnsureString = WorkType.KeepAll | WorkType.ConvertKnown | WorkType.ValidNormal;
  type WorkAllowEval = WorkType.ActIfNoSideEffects | WorkType.ActAnyway;

  interface Converter {
    (string: string, keyword: string | null | undefined, vimiumUrlWork: WorkAllowEval): Url;
    (string: string, keyword?: string | null, vimiumUrlWork?: WorkEnsureString): string;
    (string: string, keyword?: string | null, vimiumUrlWork?: WorkType): Url;
  }
  interface Executor {
    (path: string, workType?: WorkType.ValidNormal): string | null;
    (path: string, workType: WorkType.KeepAll | WorkType.ConvertKnown): null;
    (path: string, workType: WorkType, onlyOnce?: boolean): Url | null;
  }
  interface Searcher {
    (query: string[], keyword: "~", vimiumUrlWork?: WorkType): string;
    (query: string[], keyword: string | null | undefined, vimiumUrlWork: WorkAllowEval): Url;
    (query: string[], keyword?: string | null, vimiumUrlWork?: WorkEnsureString): string;
    (query: string[], keyword?: string | null, vimiumUrlWork?: WorkType): Url;
  }

  const enum NewTabType {
    browser = 1, vimium = 2,
  }

  const enum SchemaId {
    HTTP = 7, HTTPS = 8,
    FTP = 6,
  }
}

declare namespace Frames {
  type ValidStatus = Status.enabled | Status.partial | Status.disabled;
  type ForcedStatusText = "reset" | "enable" | "disable" | "toggle" | "next" | "reset silent" | "enable silent"
      | "toggle-disabled" | "toggle-enabled" | "toggle-next"
      | "__ANY_CASE__";

  interface Sender {
    /** frameId */ readonly i: number;
    /** incognito (anonymous) */ readonly a: boolean;
    /** tabId */ readonly t: number;
    /** url */ u: string;
    /** status */ s: ValidStatus;
    /** flags */ f: Flags;
  }

  type BrowserPort = chrome.runtime.Port
  interface Port extends BrowserPort {
    readonly sender: never;
    s: Sender;
    postMessage<K extends 1, O extends keyof CmdOptions>(request: Req.FgCmd<O>): K;
    postMessage<K extends keyof FgRes>(response: Req.res<K>): 1;
    postMessage<K extends 2>(response: Req.res<keyof FgRes>): 1;
    postMessage<K extends kBgReq>(request: Req.bg<K>): 1;
    onDisconnect: chrome.events.Event<(port: Frames.Port, exArg: FakeArg) => void>;
    onMessage: chrome.events.Event<(message: any, port: Frames.Port, exArg: FakeArg) => void>;
  }

  interface Frames extends ReadonlyArray<Port> {
  }

  interface WritableFrames extends Array<Port> {
  }

  interface FramesMap {
    [tabId: number]: Frames | undefined;
    readonly __proto__: never;
  }

  interface FramesMapToDestroy extends FramesMap {
    [tabId: number]: Frames;
    /** omni */ o?: Frames;
  }
}
interface Port extends Frames.Port {
  readonly s: Readonly<Frames.Sender>;
}

declare const enum IncognitoType {
  ensuredFalse = 0,
  mayFalse = 1, true = 2,
}

declare namespace MarksNS {
  interface StoredGlobalMark {
    tabId: number;
    url: BaseMarkProps["u"];
    scroll: BaseMarkProps["s"];
  }

  interface InfoToGo extends FocusOrLaunch, Partial<BaseMark> {
    /** scroll */ s: ScrollInfo;
    /** tabId */ t?: number;
  }
  type MarkToGo = InfoToGo & BaseMark;
}

declare namespace ExclusionsNS {
  interface StoredRule {
    pattern: string;
    passKeys: string;
  }
  const enum TesterType { RegExp = 0, StringPrefix = 1, _mask = "", }
  interface BaseTester {
    /** type */ readonly t: TesterType & number;
    /** value */ readonly v: RegExpOne | string;
    /** passed keys */ readonly k: string;
  }
  interface RegExpTester extends BaseTester {
    /** type */ readonly t: TesterType.RegExp;
    /** value */ readonly v: RegExpOne;
  }
  interface PrefixTester extends BaseTester {
    /** type */ readonly t: TesterType.StringPrefix;
    /** value */ readonly v: string;
  }
  type Tester = RegExpTester | PrefixTester;
  type Rules = Tester[];
  type Details = chrome.webNavigation.WebNavigationFramedCallbackDetails;
  interface Listener {
    (this: void, details: Details): void;
  }
  interface GetExcluded {
    (this: void, url: string, sender: Frames.Sender): string | null;
  }
}

declare namespace CommandsNS {
  interface BaseItem {
    readonly alias_: (kBgCmd | kFgCmd) & number; readonly background_: BOOL
  }
  interface EnvItem {
    element?: string
    host?: string | Pick<ExclusionsNS.Tester, "t" | "v"> | null
    options?: object
  }
  interface EnvItemWithKeys extends EnvItem {
    env: string
    keys: string[] | string
  }
}

declare namespace CompletersNS {
  interface QueryStatus {
    /** isOff */ o: boolean;
  }

  interface Domain {
    time_: number;
    count_: number;
    https_: BOOL;
  }

  type Callback = (this: void, sugs: Array<Readonly<Suggestion>>,
    newAutoSelect: boolean, newMatchType: MatchType, newMatchedSugTypes: SugType, newMatchedTotal: number,
    realMode: string, queryComponents: QComponent) => void;

  type FullOptions = Options & {
  };

  interface GlobalCompletersConstructor {
    filter_ (this: GlobalCompletersConstructor, query: string, options: FullOptions, callback: Callback): void;
    removeSug_ (url: string, type: FgReq[kFgReq.removeSug]["t"], callback: (succeed: boolean) => void): void;
    onWndChange_ (): void;
    isExpectingHidden_? (queries: string[]): boolean | void
  }
}
type Suggestion = CompletersNS.Suggestion;

declare namespace IconNS {
  type ValidSizes = 19 | 38;
  const enum PixelConsts {
    ChromeMaxSize = 38, // what's currently used
// https://docs.microsoft.com/en-us/microsoft-edge/extensions/api-support/supported-manifest-keys#browser_action-or-page_action-keys
    KnownRecommendedLargeSizeForEdge = 40,
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setIcon
    KnownRecommendedLargeSizeForFirefox = 32, // in fact, 32 * devicePixelRatio
  }

  type StatusMap<T> = { [key in Frames.ValidStatus]?: T | null };
  type IconBuffer = {
    [size in ValidSizes]?: ImageData;
  };
  type ImagePath = {
    readonly [size in ValidSizes]: string;
  };
  type BinaryPath = string;
  interface AccessIconBuffer {
    (this: void, enabled: boolean): void;
    (this: void, enabled?: undefined): boolean;
  }
}

declare namespace MediaNS {
  const enum kName {
    PrefersReduceMotion = 0, /** {@link #BrowserVer.MinMediaQuery$PrefersReducedMotion} */
    PrefersColorScheme = 1,
  }
  const enum Watcher {
    InvalidMedia = 0,
    WaitToTest,
    NotWatching,
  }
}

declare namespace SettingsNS {
  interface BackendSettings extends BaseBackendSettings {
    autoDarkMode: boolean;
    clipSub: string;
    dialogMode: boolean;
    exclusionListenHash: boolean;
    exclusionOnlyFirstMatch: boolean;
    exclusionRules: ExclusionsNS.StoredRule[];
    extAllowList: string;
    findModeRawQueryList: string;
    hideHud: boolean;
    innerCSS: string;
    keyMappings: string;
    localeEncoding: string;
    newTabUrl: string;
    nextPatterns: string;
    previousPatterns: string;
    searchUrl: string;
    searchEngines: string;
    showActionIcon: boolean;
    showAdvancedOptions: boolean;
    showInIncognito: boolean;
    notifyUpdate: boolean;
    userDefinedCss: string;
    vimSync: boolean | null;
    vomnibarPage: string;
    vomnibarPage_f: string;
    omniBlockList: string;
  }
  interface CachedFiles { helpDialog: string }
  interface ReadableFiles extends CachedFiles { baseCSS: string; words: string }
  interface BaseNonPersistentSettings {
    searchEngineMap: Map<string, Search.Engine>
    searchEngineRules: Search.Rule[];
    searchKeywords: string | null;
  }
  interface NonPersistentSettings extends BaseNonPersistentSettings, CachedFiles {}
  interface PersistentSettings extends FrontendSettings, BackendSettings {}

  interface SettingsWithDefaults extends PersistentSettings {}
  interface FullSettings extends PersistentSettings, NonPersistentSettings {}

  interface SimpleUpdateHook<K extends keyof FullSettings> {
    (this: {}, value: FullSettings[K], key: K): void;
  }
  interface NullableUpdateHook<K extends keyof FullSettings> {
    (this: {}, value: FullSettings[K] | null, key: K): void;
  }
  interface UpdateHookWoThis<K extends keyof FullSettings> {
    (this: void, value: FullSettings[K]): void;
  }

  type NullableUpdateHooks = "searchEngines" | "searchUrl" | "keyMappings" | "vomnibarPage";
  type WoThisUpdateHooks = "showActionIcon";
  type SpecialUpdateHooks = "newTabUrl_f";

  type DeclaredUpdateHooks = "newTabUrl" | "searchEngines" | "searchUrl"
        | "vomnibarPage" | "extAllowList" | "grabBackFocus" | "mapModifier" | "vomnibarOptions";
  type EnsuredUpdateHooks = DeclaredUpdateHooks | WoThisUpdateHooks | SpecialUpdateHooks;
  type UpdateHook<key extends keyof FullSettings> =
        key extends NullableUpdateHooks ? NullableUpdateHook<key>
      : key extends WoThisUpdateHooks ? UpdateHookWoThis<key>
      : key extends EnsuredUpdateHooks | keyof SettingsWithDefaults ? SimpleUpdateHook<key>
      : never;
  type BaseFullUpdateHookMap = { [key in EnsuredUpdateHooks | keyof SettingsWithDefaults]: UpdateHook<key>; };
  type FullUpdateHookMap = PartialOrEnsured<BaseFullUpdateHookMap, EnsuredUpdateHooks>;

  interface FullCache extends SafeObject, PartialOrEnsured<FullSettings
      , "newTabUrl_f" | "searchEngineMap" | "searchEngineRules" | "vomnibarPage_f"
        | "vomnibarOptions" | "focusNewTabContent"
        | "hideHud" | "previousPatterns" | "nextPatterns"
      > {
  }

  type DynamicFiles = "HelpDialog" | "KeyMappings" | "MathParser";

  interface Sync {
    set<K extends keyof PersistentSettings> (key: K, value: PersistentSettings[K] | null): void;
  }

  interface MergedCustomCSS { ui: string; find: FindCSS; omni: string }

  interface LegacyNames {
    phraseBlacklist: "omniBlockList";
    extWhiteList: "extAllowList";
  }

  // type NameList = Array<SettingNames>;
}
import FullSettings = SettingsNS.FullSettings;

interface OtherCNamesForDebug {
  focusOptions: kBgCmd.openUrl
}
declare const enum CNameLiterals {
  focusOptions = "focusOptions",
  quickNext = "quickNext",
  userCustomized = "userCustomized"
}

interface CmdNameIds {
  "LinkHints.activate": kFgCmd.linkHints
  "LinkHints.activateMode": kFgCmd.linkHints
  "LinkHints.activateModeToCopyLinkText": kFgCmd.linkHints
  "LinkHints.activateModeToCopyLinkUrl": kFgCmd.linkHints
  "LinkHints.activateModeToDownloadImage": kFgCmd.linkHints
  "LinkHints.activateModeToDownloadLink": kFgCmd.linkHints
  "LinkHints.activateModeToEdit": kFgCmd.linkHints
  "LinkHints.activateModeToHover": kFgCmd.linkHints
  "LinkHints.activateModeToLeave": kFgCmd.linkHints
  "LinkHints.activateModeToUnhover": kFgCmd.linkHints
  "LinkHints.activateModeToOpenImage": kFgCmd.linkHints
  "LinkHints.activateModeToOpenIncognito": kFgCmd.linkHints
  "LinkHints.activateModeToOpenInNewForegroundTab": kFgCmd.linkHints
  "LinkHints.activateModeToOpenInNewTab": kFgCmd.linkHints
  "LinkHints.activateModeToOpenVomnibar": kFgCmd.linkHints
  "LinkHints.activateModeToSearchLinkText": kFgCmd.linkHints
  "LinkHints.activateModeToSelect": kFgCmd.linkHints
  "LinkHints.activateModeWithQueue": kFgCmd.linkHints
  "LinkHints.click": kFgCmd.linkHints
  "LinkHints.unhoverLast": kFgCmd.insertMode
  "Marks.activate": kFgCmd.marks
  "Marks.activateCreateMode": kFgCmd.marks
  "Marks.activateGotoMode": kFgCmd.marks
  "Marks.clearGlobal": kBgCmd.clearMarks
  "Marks.clearLocal": kBgCmd.clearMarks
  "Vomnibar.activate": kBgCmd.showVomnibar
  "Vomnibar.activateBookmarks": kBgCmd.showVomnibar
  "Vomnibar.activateBookmarksInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateEditUrl": kBgCmd.showVomnibar
  "Vomnibar.activateEditUrlInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateHistory": kBgCmd.showVomnibar
  "Vomnibar.activateHistoryInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateTabSelection": kBgCmd.showVomnibar
  "Vomnibar.activateUrl": kBgCmd.showVomnibar
  "Vomnibar.activateUrlInNewTab": kBgCmd.showVomnibar
  addBookmark: kBgCmd.addBookmark
  autoCopy: kFgCmd.autoOpen
  autoOpen: kFgCmd.autoOpen
  blank: kBgCmd.blank
  captureTab: kBgCmd.captureTab
  clearCS: kBgCmd.clearCS
  clearFindHistory: kBgCmd.clearFindHistory
  closeDownloadBar: kBgCmd.moveTabToNewWindow
  closeOtherTabs: kBgCmd.removeTabsR
  closeTabsOnLeft: kBgCmd.removeTabsR
  closeTabsOnRight: kBgCmd.removeTabsR
  copyCurrentTitle: kBgCmd.copyWindowInfo
  copyCurrentUrl: kBgCmd.copyWindowInfo
  copyWindowInfo: kBgCmd.copyWindowInfo
  createTab: kBgCmd.createTab
  debugBackground: kBgCmd.openUrl
  discardTab: kBgCmd.discardTab
  duplicateTab: kBgCmd.duplicateTab
  editText: kFgCmd.editText
  enableCSTemp: kBgCmd.toggleCS
  enterFindMode: kBgCmd.performFind
  enterInsertMode: kBgCmd.insertMode
  enterVisualLineMode: kBgCmd.visualMode
  enterVisualMode: kBgCmd.visualMode
  firstTab: kBgCmd.goToTab
  focusInput: kFgCmd.focusInput
  focusOrLaunch: kBgCmd.openUrl
  goBack: kFgCmd.framesGoBack
  goForward: kFgCmd.framesGoBack
  goNext: kBgCmd.goNext
  goPrevious: kBgCmd.goNext
  goToRoot: kBgCmd.goUp
  goUp: kBgCmd.goUp
  joinTabs: kBgCmd.joinTabs
  lastTab: kBgCmd.goToTab
  mainFrame: kBgCmd.mainFrame
  moveTabLeft: kBgCmd.moveTab
  moveTabRight: kBgCmd.moveTab
  moveTabToIncognito: kBgCmd.moveTabToNewWindow
  moveTabToNewWindow: kBgCmd.moveTabToNewWindow
  moveTabToNextWindow: kBgCmd.moveTabToNextWindow
  newTab: kBgCmd.createTab
  nextFrame: kBgCmd.nextFrame
  nextTab: kBgCmd.goToTab
  openCopiedUrlInCurrentTab: kBgCmd.openUrl
  openCopiedUrlInNewTab: kBgCmd.openUrl
  openUrl: kBgCmd.openUrl
  parentFrame: kBgCmd.parentFrame
  passNextKey: kFgCmd.passNextKey
  performAnotherFind: kBgCmd.performFind
  performBackwardsFind: kBgCmd.performFind
  performFind: kBgCmd.performFind
  previousTab: kBgCmd.goToTab
  quickNext: kBgCmd.goToTab
  reload: kFgCmd.framesGoBack
  reloadGivenTab: kBgCmd.reloadTab
  reloadTab: kBgCmd.reloadTab
  removeRightTab: kBgCmd.removeRightTab
  removeTab: kBgCmd.removeTab
  reopenTab: kBgCmd.reopenTab
  reset: kFgCmd.insertMode
  restoreGivenTab: kBgCmd.restoreGivenTab
  restoreTab: kBgCmd.restoreTab
  runKey: kBgCmd.runKey
  scrollDown: kFgCmd.scroll
  scrollFullPageDown: kFgCmd.scroll
  scrollFullPageUp: kFgCmd.scroll
  scrollLeft: kFgCmd.scroll
  scrollPageDown: kFgCmd.scroll
  scrollPageUp: kFgCmd.scroll
  scrollPxDown: kFgCmd.scroll
  scrollPxLeft: kFgCmd.scroll
  scrollPxRight: kFgCmd.scroll
  scrollPxUp: kFgCmd.scroll
  scrollRight: kFgCmd.scroll
  scrollSelect: kFgCmd.scrollSelect
  scrollTo: kFgCmd.scroll
  scrollToBottom: kFgCmd.scroll
  scrollToLeft: kFgCmd.scroll
  scrollToRight: kFgCmd.scroll
  scrollToTop: kFgCmd.scroll
  scrollUp: kFgCmd.scroll
  searchAs: kFgCmd.autoOpen
  searchInAnother: kBgCmd.searchInAnother
  sendToExtension: kBgCmd.sendToExtension
  showHelp: kBgCmd.showHelp
  simBackspace: kFgCmd.focusInput
  sortTabs: kBgCmd.joinTabs
  switchFocus: kFgCmd.focusInput
  toggleCS: kBgCmd.toggleCS
  toggleLinkHintCharacters: kBgCmd.toggle
  toggleMuteTab: kBgCmd.toggleMuteTab
  togglePinTab: kBgCmd.togglePinTab
  toggleReaderMode: kBgCmd.toggleTabUrl
  toggleStyle: kFgCmd.toggleStyle
  toggleSwitchTemp: kBgCmd.toggle
  toggleViewSource: kBgCmd.toggleTabUrl
  toggleVomnibarStyle: kBgCmd.toggleVomnibarStyle
  showTip: kBgCmd.showTip
  visitPreviousTab: kBgCmd.visitPreviousTab
  zoomIn: kBgCmd.toggleZoom
  zoomOut: kBgCmd.toggleZoom
}
type kCName = keyof CmdNameIds

declare const enum kShortcutAliases { _mask = 0, nextTab1 = CNameLiterals.quickNext }
type StandardShortcutNames = "createTab" | "goBack" | "goForward" | "previousTab"
    | "nextTab" | "reloadTab" | CNameLiterals.userCustomized

declare namespace BackendHandlersNS {
  interface SpecialHandlers {
    [kFgReq.setSetting]: (this: void
      , request: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>, port: Port) => void;
    [kFgReq.gotoSession]: {
      (this: void, request: { s: string | number; a: false }, port: Port): void;
      (this: void, request: { s: string | number; a?: true }): void;
    };
    [kFgReq.checkIfEnabled]: ExclusionsNS.Listener & (
        (this: void, request: FgReq[kFgReq.checkIfEnabled], port: Frames.Port) => void);
    [kFgReq.parseUpperUrl]: {
      (this: void,
        request: FgReqWithRes[kFgReq.parseUpperUrl] & Pick<FgReq[kFgReq.parseUpperUrl], "e">, port: Port | null): void;
      (this: void, request: FgReqWithRes[kFgReq.parseUpperUrl], port?: Port): FgRes[kFgReq.parseUpperUrl];
    };
    [kFgReq.focusOrLaunch]: (this: void, request: MarksNS.FocusOrLaunch, _port?: Port | null, notFolder?: true) => void;
    [kFgReq.setOmniStyle]: (this: void, request: FgReq[kFgReq.setOmniStyle], _port?: Port) => void;
    [kFgReq.framesGoBack]: {
      (this: void, req: FgReq[kFgReq.framesGoBack], port: Port): void;
      (this: void, req: FgReq[kFgReq.framesGoBack], port: null
          , tabId: Pick<chrome.tabs.Tab, "id" | "url" | "pendingUrl" | "index">): void
    };
  }
  type FgRequestHandlers = {
    [K in keyof FgReqWithRes | keyof FgReq]:
      K extends keyof SpecialHandlers ? SpecialHandlers[K] :
      K extends keyof FgReqWithRes ? (((this: void, request: FgReqWithRes[K], port: Port) => FgRes[K])
        | (K extends keyof FgReq ? (this: void, request: FgReq[K], port: Port) => void : never)) :
      K extends keyof FgReq ? ((this: void, request: FgReq[K], port: Port) => void) :
      never;
  }

  interface BackendHandlers {
    reqH_: FgRequestHandlers,
    parse_ (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl]): FgRes[kFgReq.parseSearchUrl];
    /**
     * @returns "" - in a child frame, so need to send request to content
     * @returns string - valid URL
     * @returns Promise<string> - valid URL or empty string for a top frame in "port's or the current" tab
     */
    getPortUrl_ (port?: Frames.Port | null, ignoreHash?: boolean, req?: Req.baseFg<kFgReq>): string | Promise<string>;
    reopenTab_ (tab: chrome.tabs.Tab, refresh?: /* false */ 0 | /* a temp blank tab */ 1 | /* directly */ 2,
        exProps?: chrome.tabs.CreateProperties & {openInReaderMode?: boolean}): void;
    setIcon_ (tabId: number, type: Frames.ValidStatus, isLater?: true): void;
    removeSug_ (this: void, req: FgReq[kFgReq.removeSug], port?: Port): void;
    complain_ (this: BackendHandlers, message: string): void;
    showHUD_ (message: string, isCopy?: kTip): void
    getExcluded_: ExclusionsNS.GetExcluded;
    forceStatus_ (this: BackendHandlers, act: Frames.ForcedStatusText, tabId?: number): void;
    indexPorts_: {
      (this: void, tabId: number, frameId: number): Port | null;
      (this: void, tabId: GlobalConsts.VomnibarFakeTabId): Frames.Frames;
      (this: void, tabId: number): Frames.Frames | null;
      (this: void): Frames.FramesMap;
    };
    curTab_ (): number,
    ExecuteShortcut_ (this: void, command: string): void;
    onInit_: ((this: void) => void) | null;
  }
  const enum kInitStat {
    none = 0, platformInfo = 1, others = 2,
    START = none, FINISHED = platformInfo | others,
  }
}

interface TextSet extends Set<string> {}
interface CommandsDataTy {
  errors_: null | string[][];
  builtinKeys_: TextSet | null
  keyFSM_: KeyFSM;
  mappedKeyRegistry_: SafeDict<string> | null;
  mappedKeyTypes_: kMapKey;
  envRegistry_: Map<string, CommandsNS.EnvItem> | null
  visualGranularities_: GranularityNames;
  visualKeys_: VisualModeNS.KeyMap;
}

interface BaseHelpDialog {
  render_ (this: {}, isOptionsPage: boolean): NonNullable<CmdOptions[kFgCmd.showHelpDialog]["h"]>;
}

interface Window {
  readonly MathParser?: object;
  readonly KeyMappings?: object;
  readonly CommandsData_: CommandsDataTy & { keyToCommandRegistry_: Map<string, CommandsNS.BaseItem> }
  readonly Completion_: CompletersNS.GlobalCompletersConstructor;
  readonly Exclusions?: object;
  readonly HelpDialog?: BaseHelpDialog;
  readonly OnOther?: BrowserType;
  readonly CurCVer_: BrowserVer;
  readonly IsEdg_: boolean | 0;
  readonly CurFFVer_: FirefoxBrowserVer;

  readonly Backend_: BackendHandlersNS.BackendHandlers;
  readonly trans_: typeof chrome.i18n.getMessage;
}

declare const enum Consts {
  MaxCharsInQuery = 200, LowerBoundOfMaxChars = 50, UpperBoundOfMaxChars = 320,
  MaxLengthOfSearchKey = 50, MinInvalidLengthOfSearchKey = MaxLengthOfSearchKey + 1,
}

/* eslint-disable no-var */
declare var OnOther: BrowserType, Backend_: BackendHandlersNS.BackendHandlers, CommandsData_: CommandsDataTy
declare var CurCVer_: BrowserVer, CurFFVer_: FirefoxBrowserVer, IsEdg_: boolean, BrowserProtocol_: string
declare var setTimeout: SetTimeout;
/* eslint-enable no-var */

interface SetTimeout {
  <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
    timeout: number, a1: T1, a2: T2, a3: T3): number;
  <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void, timeout: number, a1: T1, a2: T2): number;
  <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
}

interface IterableMap<K extends string | number, V> extends Map<K, V> {
  keys (): IterableIterator<K>
}
interface SimulatedMapWithKeys<K extends string | number, V> extends Map<K, V> {
  keys (): SafeDict<V>
}
