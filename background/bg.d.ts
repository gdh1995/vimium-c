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
  interface EngineMap extends SafeDict<Engine> {}
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
      | "__ANY_CASE__";

  interface Sender {
    /** frameId */ readonly i: number;
    /** incognito (anonymous) */ readonly a: boolean;
    /** tabId */ readonly t: number;
    /** url */ u: string;
    /** status */ s: ValidStatus;
    /** flags */ f: Flags;
  }

  interface Port extends chrome.runtime.Port {
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

type CurrentTabs = [chrome.tabs.Tab];

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
  interface RawOptions extends SafeDict<any> {}
  interface Options extends ReadonlySafeDict<any> {}
  // encoded info
  interface CustomHelpInfo {
    key_: string;
    desc_: string;
    $key_?: unknown;
  }
  interface NormalizedCustomHelpInfo extends CustomHelpInfo {
    $key_: string;
    $desc_: string;
  }
  type BgDescription = [ kBgCmd & number, 1, number, {}? ];
  type FgDescription = [ kFgCmd & number, 0, number, {}? ];
  /** [ enum, is background, count limit, default options ] */
  type Description = BgDescription | FgDescription;
  interface BaseItem {
    readonly command_: kCName;
    readonly options_: Options | null;
    readonly repeat_: number;
    readonly help_: CustomHelpInfo | null;
  }
  type Item = (BaseItem & {
    readonly alias_: kBgCmd & number;
    readonly background_: 1;
  }) | (BaseItem & {
    readonly alias_: kFgCmd & number;
    readonly background_: 0;
  });
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
    newAutoSelect: boolean, newMatchType: MatchType, newMatchedSugTypes: SugType, newMatchedTotal: number) => void;

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
  interface CachedFiles {
    baseCSS: string;
    helpDialog: string;
  }
  interface OtherSettingsWithDefaults {
    searchEngineMap: SafeDict<Search.Engine>;
  }
  interface BaseNonPersistentSettings {
    searchEngineRules: Search.Rule[];
    searchKeywords: string | null;
  }
  interface NonPersistentSettings extends BaseNonPersistentSettings, OtherSettingsWithDefaults, CachedFiles {}
  interface PersistentSettings extends FrontendSettings, BackendSettings {}

  interface SettingsWithDefaults extends PersistentSettings, OtherSettingsWithDefaults {}
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

  type DeclaredUpdateHooks = "newTabUrl" | "searchEngines" | "searchEngineMap" | "searchUrl"
        | "baseCSS" | "userDefinedCss" | "innerCSS" | "vomnibarPage"
        | "extAllowList" | "grabBackFocus" | "mapModifier" | "vomnibarOptions";
  type EnsuredUpdateHooks = DeclaredUpdateHooks | WoThisUpdateHooks | SpecialUpdateHooks;
  type UpdateHook<key extends keyof FullSettings> =
        key extends NullableUpdateHooks ? NullableUpdateHook<key>
      : key extends WoThisUpdateHooks ? UpdateHookWoThis<key>
      : key extends EnsuredUpdateHooks | keyof SettingsWithDefaults ? SimpleUpdateHook<key>
      : never;
  type BaseFullUpdateHookMap = { [key in EnsuredUpdateHooks | keyof SettingsWithDefaults]: UpdateHook<key>; };
  type FullUpdateHookMap = PartialOrEnsured<BaseFullUpdateHookMap, EnsuredUpdateHooks>;

  interface FullCache extends SafeObject, PartialOrEnsured<FullSettings
      , "innerCSS" | "newTabUrl_f" | "searchEngineMap" | "searchEngineRules" | "vomnibarPage_f"
        | "vomnibarOptions" | "focusNewTabContent"
        | "hideHud" | "previousPatterns" | "nextPatterns"
      > {
    findCSS: FindCSS; // should not in Settings_.defaults
  }

  type DynamicFiles = "HelpDialog" | "Commands" | "Exclusions" |
    "MathParser";

  interface Sync {
    set<K extends keyof PersistentSettings> (key: K, value: PersistentSettings[K] | null): void;
  }

  interface ParsedCustomCSS {
    ui?: string;
    find?: string;
    "find:host"?: string;
    omni?: string;
  }

  interface LegacyNames {
    phraseBlacklist: "omniBlockList";
    extWhiteList: "extAllowList";
  }

  // type NameList = Array<SettingNames>;
}
import FullSettings = SettingsNS.FullSettings;

declare const enum kCName {
  LinkHints_activate = "LinkHints.activate",
  LinkHints_activateMode = "LinkHints.activateMode",
  LinkHints_activateModeToCopyLinkText = "LinkHints.activateModeToCopyLinkText",
  LinkHints_activateModeToCopyLinkUrl = "LinkHints.activateModeToCopyLinkUrl",
  LinkHints_activateModeToDownloadImage = "LinkHints.activateModeToDownloadImage",
  LinkHints_activateModeToDownloadLink = "LinkHints.activateModeToDownloadLink",
  LinkHints_activateModeToEdit = "LinkHints.activateModeToEdit",
  LinkHints_activateModeToHover = "LinkHints.activateModeToHover",
  LinkHints_activateModeToLeave = "LinkHints.activateModeToLeave",
  LinkHints_activateModeToUnhover = "LinkHints.activateModeToUnhover",
  LinkHints_activateModeToOpenImage = "LinkHints.activateModeToOpenImage",
  LinkHints_activateModeToOpenIncognito = "LinkHints.activateModeToOpenIncognito",
  LinkHints_activateModeToOpenInNewForegroundTab = "LinkHints.activateModeToOpenInNewForegroundTab",
  LinkHints_activateModeToOpenInNewTab = "LinkHints.activateModeToOpenInNewTab",
  LinkHints_activateModeToOpenVomnibar = "LinkHints.activateModeToOpenVomnibar",
  LinkHints_activateModeToSearchLinkText = "LinkHints.activateModeToSearchLinkText",
  LinkHints_activateModeWithQueue = "LinkHints.activateModeWithQueue",
  LinkHints_unhoverLast = "LinkHints.unhoverLast",
  Marks_activate = "Marks.activate",
  Marks_activateCreateMode = "Marks.activateCreateMode",
  Marks_clearGlobal = "Marks.clearGlobal",
  Marks_clearLocal = "Marks.clearLocal",
  Vomnibar_activate = "Vomnibar.activate",
  Vomnibar_activateBookmarks = "Vomnibar.activateBookmarks",
  Vomnibar_activateBookmarksInNewTab = "Vomnibar.activateBookmarksInNewTab",
  Vomnibar_activateEditUrl = "Vomnibar.activateEditUrl",
  Vomnibar_activateEditUrlInNewTab = "Vomnibar.activateEditUrlInNewTab",
  Vomnibar_activateHistory = "Vomnibar.activateHistory",
  Vomnibar_activateHistoryInNewTab = "Vomnibar.activateHistoryInNewTab",
  Vomnibar_activateInNewTab = "Vomnibar.activateInNewTab",
  Vomnibar_activateTabSelection = "Vomnibar.activateTabSelection",
  Vomnibar_activateUrl = "Vomnibar.activateUrl",
  Vomnibar_activateUrlInNewTab = "Vomnibar.activateUrlInNewTab",
  autoCopy = "autoCopy",
  autoOpen = "autoOpen",
  blank = "blank",
  clearCS = "clearCS",
  clearFindHistory = "clearFindHistory",
  closeDownloadBar = "closeDownloadBar",
  closeOtherTabs = "closeOtherTabs",
  closeTabsOnLeft = "closeTabsOnLeft",
  closeTabsOnRight = "closeTabsOnRight",
  copyCurrentTitle = "copyCurrentTitle",
  copyCurrentUrl = "copyCurrentUrl",
  copyWindowInfo = "copyWindowInfo",
  createTab = "createTab",
  debugBackground = "debugBackground",
  discardTab = "discardTab",
  duplicateTab = "duplicateTab",
  editText = "editText",
  enableCSTemp = "enableCSTemp",
  enterFindMode = "enterFindMode",
  enterInsertMode = "enterInsertMode",
  enterVisualLineMode = "enterVisualLineMode",
  enterVisualMode = "enterVisualMode",
  firstTab = "firstTab",
  focusInput = "focusInput",
  focusOrLaunch = "focusOrLaunch",
  goBack = "goBack",
  goForward = "goForward",
  goNext = "goNext",
  goPrevious = "goPrevious",
  goToRoot = "goToRoot",
  goUp = "goUp",
  joinTabs = "joinTabs",
  lastTab = "lastTab",
  mainFrame = "mainFrame",
  moveTabLeft = "moveTabLeft",
  moveTabRight = "moveTabRight",
  moveTabToIncognito = "moveTabToIncognito",
  moveTabToNewWindow = "moveTabToNewWindow",
  moveTabToNextWindow = "moveTabToNextWindow",
  newTab = "newTab", // for https://github.com/philc/vimium/issues/3588
  nextFrame = "nextFrame",
  nextTab = "nextTab",
  openCopiedUrlInCurrentTab = "openCopiedUrlInCurrentTab",
  openCopiedUrlInNewTab = "openCopiedUrlInNewTab",
  openUrl = "openUrl",
  parentFrame = "parentFrame",
  passNextKey = "passNextKey",
  performAnotherFind = "performAnotherFind",
  performBackwardsFind = "performBackwardsFind",
  performFind = "performFind",
  previousTab = "previousTab",
  quickNext = "quickNext",
  reload = "reload",
  reloadGivenTab = "reloadGivenTab",
  reloadTab = "reloadTab",
  removeRightTab = "removeRightTab",
  removeTab = "removeTab",
  reopenTab = "reopenTab",
  reset = "reset",
  restoreGivenTab = "restoreGivenTab",
  restoreTab = "restoreTab",
  scrollDown = "scrollDown",
  scrollFullPageDown = "scrollFullPageDown",
  scrollFullPageUp = "scrollFullPageUp",
  scrollLeft = "scrollLeft",
  scrollPageDown = "scrollPageDown",
  scrollPageUp = "scrollPageUp",
  scrollPxDown = "scrollPxDown",
  scrollPxLeft = "scrollPxLeft",
  scrollPxRight = "scrollPxRight",
  scrollPxUp = "scrollPxUp",
  scrollRight = "scrollRight",
  scrollSelect = "scrollSelect", // just like https://github.com/philc/vimium/issues/1242#issuecomment-646837069
  scrollTo = "scrollTo",
  scrollToBottom = "scrollToBottom",
  scrollToLeft = "scrollToLeft",
  scrollToRight = "scrollToRight",
  scrollToTop = "scrollToTop",
  scrollUp = "scrollUp",
  searchAs = "searchAs",
  searchInAnother = "searchInAnother",
  showHelp = "showHelp",
  simBackspace = "simBackspace",
  switchFocus = "switchFocus",
  toggleCS = "toggleCS",
  toggleLinkHintCharacters = "toggleLinkHintCharacters",
  toggleMuteTab = "toggleMuteTab",
  togglePinTab = "togglePinTab",
  toggleReaderMode = "toggleReaderMode",
  toggleStyle = "toggleStyle",
  toggleSwitchTemp = "toggleSwitchTemp",
  toggleViewSource = "toggleViewSource",
  toggleVomnibarStyle = "toggleVomnibarStyle",
  showTip = "showTip",
  visitPreviousTab = "visitPreviousTab",
  zoomIn = "zoomIn",
  zoomOut = "zoomOut",
}

declare namespace CommandsNS {
  const enum OtherCNames {
    focusOptions = "focusOptions",
    userCustomized = "userCustomized",
  }

  interface CmdNameIds {
    [kCName.LinkHints_activate]: kFgCmd.linkHints;
    [kCName.LinkHints_activateMode]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToCopyLinkText]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToCopyLinkUrl]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToDownloadImage]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToDownloadLink]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToEdit]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToHover]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToLeave]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToUnhover]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToOpenImage]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToOpenIncognito]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToOpenInNewForegroundTab]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToOpenInNewTab]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToOpenVomnibar]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeToSearchLinkText]: kFgCmd.linkHints;
    [kCName.LinkHints_activateModeWithQueue]: kFgCmd.linkHints;
    [kCName.LinkHints_unhoverLast]: kFgCmd.insertMode;
    [kCName.Marks_activate]: kFgCmd.marks;
    [kCName.Marks_activateCreateMode]: kFgCmd.marks;
    [kCName.Marks_clearGlobal]: kBgCmd.clearMarks;
    [kCName.Marks_clearLocal]: kBgCmd.clearMarks;
    [kCName.Vomnibar_activate]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateBookmarks]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateBookmarksInNewTab]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateEditUrl]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateEditUrlInNewTab]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateHistory]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateHistoryInNewTab]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateInNewTab]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateTabSelection]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateUrl]: kBgCmd.showVomnibar;
    [kCName.Vomnibar_activateUrlInNewTab]: kBgCmd.showVomnibar;
    [kCName.autoCopy]: kFgCmd.autoOpen;
    [kCName.autoOpen]: kFgCmd.autoOpen;
    [kCName.blank]: kBgCmd.blank;
    [kCName.clearCS]: kBgCmd.clearCS;
    [kCName.clearFindHistory]: kBgCmd.clearFindHistory;
    [kCName.closeDownloadBar]: kBgCmd.moveTabToNewWindow;
    [kCName.closeOtherTabs]: kBgCmd.removeTabsR;
    [kCName.closeTabsOnLeft]: kBgCmd.removeTabsR;
    [kCName.closeTabsOnRight]: kBgCmd.removeTabsR;
    [kCName.copyCurrentTitle]: kBgCmd.copyWindowInfo;
    [kCName.copyCurrentUrl]: kBgCmd.copyWindowInfo;
    [kCName.copyWindowInfo]: kBgCmd.copyWindowInfo;
    [kCName.createTab]: kBgCmd.createTab;
    [kCName.debugBackground]: kBgCmd.openUrl;
    [kCName.discardTab]: kBgCmd.discardTab;
    [kCName.duplicateTab]: kBgCmd.duplicateTab;
    [kCName.editText]: kFgCmd.editText;
    [kCName.enableCSTemp]: kBgCmd.toggleCS;
    [kCName.enterFindMode]: kBgCmd.performFind;
    [kCName.enterInsertMode]: kBgCmd.insertMode;
    [kCName.enterVisualLineMode]: kBgCmd.enterVisualMode;
    [kCName.enterVisualMode]: kBgCmd.enterVisualMode;
    [kCName.firstTab]: kBgCmd.goToTab;
    [kCName.focusInput]: kFgCmd.focusInput;
    [kCName.focusOrLaunch]: kBgCmd.openUrl;
    [kCName.goBack]: kFgCmd.framesGoBack;
    [kCName.goForward]: kFgCmd.framesGoBack;
    [kCName.goNext]: kBgCmd.goNext;
    [kCName.goPrevious]: kBgCmd.goNext;
    [kCName.goToRoot]: kBgCmd.goUp;
    [kCName.goUp]: kBgCmd.goUp;
    [kCName.joinTabs]: kBgCmd.joinTabs;
    [kCName.lastTab]: kBgCmd.goToTab;
    [kCName.mainFrame]: kBgCmd.mainFrame;
    [kCName.moveTabLeft]: kBgCmd.moveTab;
    [kCName.moveTabRight]: kBgCmd.moveTab;
    [kCName.moveTabToIncognito]: kBgCmd.moveTabToNewWindow;
    [kCName.moveTabToNewWindow]: kBgCmd.moveTabToNewWindow;
    [kCName.moveTabToNextWindow]: kBgCmd.moveTabToNextWindow;
    [kCName.newTab]: kBgCmd.createTab;
    [kCName.nextFrame]: kBgCmd.nextFrame;
    [kCName.nextTab]: kBgCmd.goToTab;
    [kCName.openCopiedUrlInCurrentTab]: kBgCmd.openUrl;
    [kCName.openCopiedUrlInNewTab]: kBgCmd.openUrl;
    [kCName.openUrl]: kBgCmd.openUrl;
    [kCName.parentFrame]: kBgCmd.parentFrame;
    [kCName.passNextKey]: kFgCmd.passNextKey;
    [kCName.performAnotherFind]: kBgCmd.performFind;
    [kCName.performBackwardsFind]: kBgCmd.performFind;
    [kCName.performFind]: kBgCmd.performFind;
    [kCName.previousTab]: kBgCmd.goToTab;
    [kCName.quickNext]: kBgCmd.goToTab;
    [kCName.reload]: kFgCmd.framesGoBack;
    [kCName.reloadGivenTab]: kBgCmd.reloadTab;
    [kCName.reloadTab]: kBgCmd.reloadTab;
    [kCName.removeRightTab]: kBgCmd.removeRightTab;
    [kCName.removeTab]: kBgCmd.removeTab;
    [kCName.reopenTab]: kBgCmd.reopenTab;
    [kCName.reset]: kFgCmd.insertMode;
    [kCName.restoreGivenTab]: kBgCmd.restoreGivenTab;
    [kCName.restoreTab]: kBgCmd.restoreTab;
    [kCName.scrollDown]: kFgCmd.scroll;
    [kCName.scrollFullPageDown]: kFgCmd.scroll;
    [kCName.scrollFullPageUp]: kFgCmd.scroll;
    [kCName.scrollLeft]: kFgCmd.scroll;
    [kCName.scrollPageDown]: kFgCmd.scroll;
    [kCName.scrollPageUp]: kFgCmd.scroll;
    [kCName.scrollPxDown]: kFgCmd.scroll;
    [kCName.scrollPxLeft]: kFgCmd.scroll;
    [kCName.scrollPxRight]: kFgCmd.scroll;
    [kCName.scrollPxUp]: kFgCmd.scroll;
    [kCName.scrollRight]: kFgCmd.scroll;
    [kCName.scrollSelect]: kFgCmd.scrollSelect;
    [kCName.scrollTo]: kFgCmd.scroll;
    [kCName.scrollToBottom]: kFgCmd.scroll;
    [kCName.scrollToLeft]: kFgCmd.scroll;
    [kCName.scrollToRight]: kFgCmd.scroll;
    [kCName.scrollToTop]: kFgCmd.scroll;
    [kCName.scrollUp]: kFgCmd.scroll;
    [kCName.searchAs]: kFgCmd.autoOpen;
    [kCName.searchInAnother]: kBgCmd.searchInAnother;
    [kCName.showHelp]: kBgCmd.showHelp;
    [kCName.simBackspace]: kFgCmd.focusInput;
    [kCName.switchFocus]: kFgCmd.focusInput;
    [kCName.toggleCS]: kBgCmd.toggleCS;
    [kCName.toggleLinkHintCharacters]: kBgCmd.toggle;
    [kCName.toggleMuteTab]: kBgCmd.toggleMuteTab;
    [kCName.togglePinTab]: kBgCmd.togglePinTab;
    [kCName.toggleReaderMode]: kBgCmd.toggleViewSource;
    [kCName.toggleStyle]: kFgCmd.toggleStyle;
    [kCName.toggleSwitchTemp]: kBgCmd.toggle;
    [kCName.toggleViewSource]: kBgCmd.toggleViewSource;
    [kCName.toggleVomnibarStyle]: kBgCmd.toggleVomnibarStyle;
    [kCName.showTip]: kBgCmd.showTip;
    [kCName.visitPreviousTab]: kBgCmd.visitPreviousTab;
    [kCName.zoomIn]: kBgCmd.toggleZoom;
    [kCName.zoomOut]: kBgCmd.toggleZoom;
  }

  /** [ enum, is background, count limit, default options ] */
  type NameMetaMap = {
    readonly [k in kCName]:
        CmdNameIds[k] extends kBgCmd ? [CmdNameIds[k], 1, 0 | 1, object?]
        : CmdNameIds[k] extends keyof CmdOptions
          ? [CmdNameIds[k], 0, 0 | 1, CmdOptions[CmdNameIds[k]]?]
        : CmdNameIds[k] extends kFgCmd ? [CmdNameIds[k], 0, 0 | 1]
        : never;
  };
}

declare const enum kShortcutAliases {
  _mask = 0,
  nextTab1 = kCName.quickNext,
}
interface ShortcutInfoMap {
  [kCName.createTab]: CommandsNS.Item;
  [kCName.goBack]: CommandsNS.Item;
  [kCName.goForward]: CommandsNS.Item;
  [kCName.previousTab]: CommandsNS.Item;
  [kCName.nextTab]: CommandsNS.Item;
  [kCName.reloadTab]: CommandsNS.Item;
  [CommandsNS.OtherCNames.userCustomized]: CommandsNS.Item;
}

declare namespace BackendHandlersNS {
  interface BackendHandlers {
    parse_ (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl]): FgRes[kFgReq.parseSearchUrl];
    gotoSession_: {
      (this: void, request: { s: string | number; a: false }, port: Port): void;
      (this: void, request: { s: string | number; a?: true }): void;
    };
    /**
     * @returns "" - in a child frame, so need to send request to content
     * @returns string - valid URL
     * @returns Promise<string> - valid URL or empty string for a top frame in "port's or the current" tab
     */
    getPortUrl_ (port?: Frames.Port | null, ignoreHash?: boolean): string | Promise<string>;
    openUrl_ (this: void, request: FgReq[kFgReq.openUrl], port?: Port | undefined): void;
    checkIfEnabled_: ExclusionsNS.Listener;
    focus_ (this: void, request: MarksNS.FocusOrLaunch): void;
    setOmniStyle_ (this: void, request: FgReq[kFgReq.setOmniStyle], port?: Port): void;
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
    ExecuteShortcut_ (this: void, command: string): void;
    onInit_: ((this: void) => void) | null;
  }
  const enum kInitStat {
    none = 0, platformInfo = 1, others = 2,
    START = none, FINISHED = platformInfo | others,
  }
}

interface CommandsDataTy {
  errors_: null | string[][];
  keyToCommandRegistry_: SafeDict<CommandsNS.Item>;
  builtinKeys_: SafeDict<1> | null;
  keyFSM_: KeyFSM;
  shortcutRegistry_: ShortcutInfoMap;
  mappedKeyRegistry_: SafeDict<string> | null;
  visualGranularities_: GranularityNames;
  visualKeys_: VisualModeNS.KeyMap;
}

interface BaseHelpDialog {
  render_ (this: {}, isOptionsPage: boolean): NonNullable<CmdOptions[kFgCmd.showHelpDialog]["h"]>;
}

interface Window {
  readonly MathParser?: object;
  readonly Commands?: object;
  readonly CommandsData_: CommandsDataTy;
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

// eslint-disable-next-line no-var
declare var Backend_: BackendHandlersNS.BackendHandlers, CommandsData_: CommandsDataTy;

// eslint-disable-next-line no-var
declare var setTimeout: SetTimeout;
interface SetTimeout {
  <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
    timeout: number, a1: T1, a2: T2, a3: T3): number;
  <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void, timeout: number, a1: T1, a2: T2): number;
  <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
}
