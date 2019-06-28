declare namespace Search {
  interface RawEngine {
    url: string;
    blank: string;
    name: string;
  }
  interface Engine extends Readonly<RawEngine> {}
  interface Result {
    readonly url: string;
    readonly indexes: number[];
  }
  interface Executor {
    (query: string[], url: string, blank: string, indexes: number[]): Result;
    (query: string[], url: string, blank: string): string;
  }
  type TmpRule = { prefix: string, matcher: RegExpOne | RegExpI };
  interface Rule {
    readonly prefix: string;
    readonly matcher: RegExp;
    readonly name: string;
    readonly delimiter: RegExpOne | RegExpI | string;
  }
  interface EngineMap extends SafeDict<Engine> {}
}
declare namespace Urls {
  type ValidEvalTag = "math" | "copy" | "search" | "ERROR" | "status";

  interface BaseEvalResult extends Array<any> {
    readonly [0]: string | string[];
    readonly [1]: ValidEvalTag;
    readonly [2]?: undefined | string;
  }
  interface BasePlainEvalResult<T extends ValidEvalTag> extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: T;
    readonly [2]?: undefined;
  }
  interface MathEvalResult extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: "math";
    readonly [2]: string;
  }
  interface SearchEvalResult extends BaseEvalResult {
    readonly [1]: "search";
    readonly [2]?: undefined;
  }
  interface CopyEvalResult extends BasePlainEvalResult<"copy"> {}
  interface ErrorEvalResult extends BasePlainEvalResult<"ERROR"> {}
  interface StatusEvalResult extends BasePlainEvalResult<"status"> {
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
    Search = 4,
    Functional = 5
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
    (path: string, workType: WorkAllowEval, onlyOnce?: boolean): Url | null;
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
  type ForcedStatusText = "reset" | "enable" | "disable" | "toggle";

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
    omni?: Frames;
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
  const enum TesterType { RegExp = 1, StringPrefix = 1, _mask = "", }
  interface BaseTester {
    readonly type_: TesterType & number,
    readonly value_: RegExpOne | string;
  }
  interface RegExpTester extends BaseTester {
    readonly type_: TesterType.RegExp,
    readonly value_: RegExpOne;
  }
  interface PrefixTester extends BaseTester {
    readonly type_: TesterType.StringPrefix,
    readonly value_: string;
  }
  type Tester = RegExpTester | PrefixTester;
  type Rules = Array<Tester | string>;
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
    $key?: unknown;
  }
  interface NormalizedCustomHelpInfo extends CustomHelpInfo {
    $key: string;
    $desc: string;
  }
  type BgDescription = [ kBgCmd & number, 1, number, {}? ];
  type FgDescription = [ kFgCmd & number, 0, number, {}? ];
  /** [ enum, is background, count limit, default options ] */
  type Description = BgDescription | FgDescription;
  interface BaseItem {
    readonly command_: string;
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
    time: number;
    count: number;
    https: BOOL;
  }

  type Callback = (this: void, sugs: Readonly<Suggestion>[],
    newAutoSelect: boolean, newMatchType: MatchType, newMatchedSugTypes: SugType, newMatchedTotal: number) => void;

  type FullOptions = Options & {
  };

  interface GlobalCompletersConstructor {
    filter_ (this: GlobalCompletersConstructor, query: string, options: FullOptions, callback: Callback): void;
    removeSug_ (url: string, type: FgReq[kFgReq.removeSug]["t"], callback: (succeed: boolean) => void): void;
  }
}
type Suggestion = CompletersNS.Suggestion;

declare namespace IconNS {
  type ValidSizes = "19" | "38";
  const enum PixelConsts {
    MaxSize = 38, // what's currently used
// https://docs.microsoft.com/en-us/microsoft-edge/extensions/api-support/supported-manifest-keys#browser_action-or-page_action-keys
    KnownRecommendedLargeSizeForEdge = 40,
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setIcon
    KnownRecommendedLargeSizeForFirefox = 32, // in fact, 32 * devicePixelRatio
  }

  interface StatusMap<T> {
    [0]: T | undefined;
    [1]: T | undefined;
    [2]: T | undefined;
  }
  type IconBuffer = {
    [size in ValidSizes]?: ImageData;
  };
  type PathBuffer = {
    readonly [size in ValidSizes]: string;
  };
  interface AccessIconBuffer {
    (this: void, enabled: boolean): void;
    (this: void): object | null;
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
    autoReduceMotion: boolean;
    dialogMode: boolean;
    exclusionListenHash: boolean;
    exclusionOnlyFirstMatch: boolean;
    exclusionRules: ExclusionsNS.StoredRule[];
    extWhiteList: string;
    findModeRawQueryList: string;
    grabBackFocus: boolean;
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
    userDefinedCss: string;
    vimSync: boolean | null;
    vomnibarPage: string;
    vomnibarPage_f: string;
    phraseBlacklist: string;
  }
  interface CachedFiles {
    baseCSS: string;
    exclusionTemplate: string;
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

  type NullableUpdateHooks = "searchEngines" | "searchEngineMap" | "searchUrl" | "keyMappings" | "vomnibarPage";
  type WoThisUpdateHooks = "showActionIcon";
  type SpecialUpdateHooks = "newTabUrl_f";

  type DeclaredUpdateHooks = "newTabUrl" | "searchEngines" | "searchEngineMap" | "searchUrl"
        | "baseCSS" | "userDefinedCss" | "innerCSS" | "vomnibarPage"
        | "extWhiteList";
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
      > {
    findCSS_: FindCSS; // should not in Settings_.defaults
  }

  type DynamicFiles = "HelpDialog" | "Commands" | "Exclusions" |
    "MathParser";

  interface Sync {
    set<K extends keyof PersistentSettings> (key: K, value: PersistentSettings[K] | null): void;
  }

  interface ParsedCustomCSS {
    ui?: string;
    find?: string;
    omni?: string;
  }

  // type NameList = Array<SettingNames>;
}
import FullSettings = SettingsNS.FullSettings;

declare namespace BackendHandlersNS {
  interface BackendHandlers {
    parse_ (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl]): FgRes[kFgReq.parseSearchUrl];
    gotoSession_: {
      (this: void, request: { s: string | number, a: false }, port: Port): void;
      (this: void, request: { s: string | number, a?: true }): void;
    };
    openUrl_ (this: void, request: FgReq[kFgReq.openUrl], port?: Port | undefined): void;
    checkIfEnabled_: ExclusionsNS.Listener;
    focus_ (this: void, request: MarksNS.FocusOrLaunch): void;
    setOmniStyle_ (this: void, request: FgReq[kFgReq.setOmniStyle], port?: Port): void;
    reopenTab_ (tab: chrome.tabs.Tab, refresh?: boolean): void;
    setIcon_ (tabId: number, type: Frames.ValidStatus, isLater?: true): void;
    IconBuffer_: IconNS.AccessIconBuffer | null,
    removeSug_ (this: void, req: FgReq[kFgReq.removeSug], port?: Port): void;
    complain_ (this: BackendHandlers, message: string): void;
    showHUD_ (message: string, isCopy?: boolean | undefined): void;
    getExcluded_: ExclusionsNS.GetExcluded,
    forceStatus_ (this: BackendHandlers, act: Frames.ForcedStatusText, tabId?: number): void;
    indexPorts_: {
      (this: void, tabId: number, frameId: number): Port | null;
      (this: void, tabId: GlobalConsts.VomnibarFakeTabId): Frames.Frames;
      (this: void, tabId: number): Frames.Frames | null;
      (this: void): Frames.FramesMap;
    };
    ExecuteShortcut_ (this: void, command: kShortcutNames | kShortcutAliases & string): void;
    onInit_: ((this: void) => void) | null;
  }
}

type ShortcutInfoMap = {
  [shortcut in kShortcutNames]: CommandsNS.Item;
};

interface CommandsDataTy {
  cmdDescriptions_: ReadonlySafeDict<string>;
  keyToCommandRegistry_: SafeDict<CommandsNS.Item>;
  keyMap_: KeyMap;
  shortcutMap_: ShortcutInfoMap;
  mapKeyRegistry_: SafeDict<string> | null;
}

interface VClipboardTy {
  copy_ (data: string): Promise<void> | void;
}

interface BaseHelpDialog {
  render_ (this: {}, request: FgReq[kFgReq.initHelp]): BgReq[kBgReq.showHelpDialog]["h"];
}

interface Window {
  readonly MathParser?: object;
  readonly Commands?: object;
  readonly CommandsData_: CommandsDataTy;
  readonly Exclusions?: object;
  readonly HelpDialog?: BaseHelpDialog;
  readonly OnOther?: BrowserType;
  readonly CurCVer_: BrowserVer;

  readonly Backend_: BackendHandlersNS.BackendHandlers;
}

declare const enum Consts {
  MaxCharsInQuery = 200, LowerBoundOfMaxChars = 50, UpperBoundOfMaxChars = 320,
  MaxLengthOfSearchKey = 50, MinInvalidLengthOfSearchKey = MaxLengthOfSearchKey + 1,
}

declare var Backend_: BackendHandlersNS.BackendHandlers, CommandsData_: CommandsDataTy;

declare var setTimeout: SetTimeout;
interface SetTimeout {
  <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
    timeout: number, a1: T1, a2: T2, a3: T3): number;
  <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void, timeout: number, a1: T1, a2: T2): number;
  <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
}
