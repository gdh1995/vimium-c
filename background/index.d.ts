type SimulatedMap = IterableMap<string, any> & Set<string> & { map_: SafeDict<1>, isSet_: BOOL }

declare namespace Search {
  interface RawEngine { name_: string; url_: string; blank_: string; complex_: boolean }
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
    readonly delimiter_: RegExpOne | RegExpI | string | [ string ]
  }
}

declare namespace Urls {
  const enum kEval {
    math = 0, copy = 1, search = 2, ERROR = 3, status = 4, paste = 5, run = 6, plainUrl = 7, run1 = 8,
    browserSearch = 9,
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
  interface RunEvalResult extends Urls.BaseEvalResult {
    [0]: ["run" | "run1" | "openUrls", ...string[]]
    [1]: Urls.kEval.run
  }

  type EvalArrayResultWithSideEffects = CopyEvalResult;

  type SpecialUrl = BaseEvalResult | Promise<BaseEvalResult>;
  type Url = string | SpecialUrl;

  const enum Type {
    Full = 0,
    Default = Full,
    NoProtocolName = 1,
    NoScheme = 2,
    MaxOfInputIsPlainUrl = NoScheme,
    PlainVimium = 3,
    Search = 4, // eslint-disable-line @typescript-eslint/no-shadow
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

  interface Executor {
    (path: string, workType?: WorkType.ValidNormal): string | null;
    (path: string, workType: WorkType.KeepAll | WorkType.ConvertKnown): null;
    (path: string, workType: WorkType, onlyOnce?: boolean | null, _isNested?: number): Url | null;
  }

  const enum NewTabType { browser = 1, cNewNTP = 2 }

  const enum SchemeId {
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
    /** frameId */ readonly frameId_: number;
    /** incognito (anonymous) */ readonly incognito_: boolean;
    /** tabId */ readonly tabId_: number;
    /** url */ url_: string;
    /** status */ status_: ValidStatus;
    /** flags */ flags_: Flags;
  }

  type BrowserPort = chrome.runtime.Port
  interface BasePort extends BrowserPort {
    readonly sender: never;
    s: unknown
    postMessage<K extends 1, O extends keyof CmdOptions>(request: Req.FgCmd<O>): K;
    postMessage<K extends keyof FgRes>(response: Req.res<K>): 1;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    postMessage<_K extends 2>(response: Req.res<keyof FgRes>): 1;
    postMessage<K extends kBgReq>(request: Req.bg<K>): 1;
    onDisconnect: chrome.events.Event<(port: Frames.Port, exArg: FakeArg) => void>;
    onMessage: chrome.events.Event<(message: any, port: Frames.Port, exArg: FakeArg) => void>;
  }
  interface Port extends BasePort { s: Sender }
  interface FirstPagePort extends BasePort { readonly s: false }
  type PagePort = Port | Frames.FirstPagePort

  interface Frames {
    cur_: Port
    readonly top_: Port | null
    readonly ports_: Port[]
    lock_: { status_: ValidStatus, passKeys_: string | null } | null
    flags_: Flags
    unknownExt_?: null | /** id */ string | /** too many */ 2 | /** the action dialog has shown */ -1
  }

  interface FramesMap extends Map<number, Frames> {
    keys: never
    // use a fake returned type, just to make `for-of` happy
    values(): readonly Frames[]
    entries: never
    forEach (callback: (frames: Frames, tabId: number) => void): void
  }
}

interface WSender {
  readonly s: Readonly<Frames.Sender>;
}
interface Port extends Frames.Port {
  readonly s: Readonly<Frames.Sender>;
}

declare const enum IncognitoType {
  ensuredFalse = 0,
  mayFalse = 1, true = 2,
}

declare namespace MarksNS {
  interface MarkToGo extends WithEnsured<FocusOrLaunch, "s"> {
    /** markName */ n: string;
    /** tabId */ t?: number;
  }
  interface GlobalMarkV1 { tabId: number; url: string; /** `undefined` is just in case */ scroll?: ScrollInfo }
  type StoredMarkV2 = /** global marks */ (Ensure<MarkToGo, "u" | "t"> & { s?: ScrollInfo | number })
      | /** local marks */ (ScrollInfo | number)
}

declare namespace ExclusionsNS {
  interface StoredRule {
    readonly pattern: string;
    readonly passKeys: string;
  }
  type Tester = ValidUrlMatchers & { /** passed keys */ readonly k: string }
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
  interface Options {} // eslint-disable-line @typescript-eslint/no-empty-interface
  interface EnvItemOptions extends Req.FallbackOptions {}
  interface EnvItem {
    /** e.g.: `tag#id.cls1.cls2, tag2, ...` */
    element?: string | /* inner usage */ { readonly tag: string, readonly id: string, readonly classList: string[] }[]
    host?: string | ValidUrlMatchers | null
    /** (deprecated) @see host */ url?: string
    fullscreen?: boolean
    incognito?: boolean
    iframe?: string | boolean | ValidUrlMatchers | null
    options?: (object & EnvItemOptions) | null
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
    filter_ (this: void, query: string, options: FullOptions, callback: Callback): void
    removeSug_ (url: string | number, type: FgReq[kFgReq.removeSug]["t"], callback: (succeed: boolean) => void): void
    isExpectingHidden_? (this: void, queries: string[]): boolean | void
  }
  const enum kVisibility { hidden = 0, visible = 1, _mask = 2 }
  type Visibility = kVisibility.hidden | kVisibility.visible
  interface DecodedItem { readonly u: string; t: string }
  interface HistoryItem extends DecodedItem { readonly u: string; time_: number; title_: string; visible_: Visibility }
  const enum BookmarkStatus { notInited = 0, initing = 1, inited = 2, revoked = 3 }
  interface BaseBookmark {
    readonly id_: string
    readonly path_: string
    readonly title_: string
    readonly u?: string | undefined
  }
  interface BookmarkFolder extends BaseBookmark {
    readonly u?: undefined
  }
  interface Bookmark extends BaseBookmark, DecodedItem {
    readonly u: string
    readonly visible_: Visibility
    readonly pid_: string
    readonly ind_: number
    readonly jsUrl_: string | null
    readonly jsText_: string | null
  }
  interface JSBookmark extends Bookmark { readonly jsUrl_: string; readonly jsText_: string }
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
    readonly [size in ValidSizes]: `/${string}.png`;
  };
  type BinaryPath = `/${string}.bin`;
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
    _mask = ""
  }
}

declare namespace SettingsNS {
  interface BackendSettings extends BaseBackendSettings {
    allBrowserUrls: boolean
    clipSub: string;
    exclusionListenHash: boolean;
    exclusionOnlyFirstMatch: boolean;
    exclusionRules: ExclusionsNS.StoredRule[];
    extAllowList: string;
    keyMappings: string;
    localeEncoding: string;
    newTabUrl: string;
    nextPatterns: string;
    notifyUpdate: boolean;
    previousPatterns: string;
    preferBrowserSearch: boolean
    searchUrl: string;
    searchEngines: string;
    showActionIcon: boolean;
    showInIncognito: boolean;
    titleIgnoreList: string
    userDefinedCss: string;
    vimSync: boolean | null;
    vomnibarPage: string;
    omniBlockList: string;
    keyLayout: kKeyLayout
  }
  interface PersistentSettings extends FrontendSettings, BackendSettings {}

  interface SettingsWithDefaults extends PersistentSettings {}

  interface SimpleUpdateHook<K extends keyof SettingsWithDefaults> {
    (this: void, value: SettingsWithDefaults[K], key: K): void
  }
  interface NullableUpdateHook<K extends keyof SettingsWithDefaults> {
    (this: void, value: SettingsWithDefaults[K] | null, key: K): void
  }

  type NullableUpdateHooks = "searchEngines" | "searchUrl" | "keyMappings" | "vomnibarPage"

  type DeclaredUpdateHooks = "newTabUrl" | "searchEngines" | "searchUrl"
        | "vomnibarPage" | "extAllowList" | "grabBackFocus" | "keyLayout"
  type EnsuredUpdateHooks = DeclaredUpdateHooks
  type UpdateHook<key extends keyof SettingsWithDefaults> =
        key extends NullableUpdateHooks ? NullableUpdateHook<key>
      : key extends EnsuredUpdateHooks | keyof SettingsWithDefaults ? SimpleUpdateHook<key>
      : never;
  type BaseFullUpdateHookMap =  { [key in EnsuredUpdateHooks]: UpdateHook<key> } & {
    [key in keyof SettingsWithDefaults]: UpdateHook<key>
  }
  type FullUpdateHookMap = PartialOrEnsured<BaseFullUpdateHookMap, EnsuredUpdateHooks>;

  interface Sync {
    set<K extends keyof PersistentSettings> (key: K, value: PersistentSettings[K] | null): void;
    set<K extends LocalSettingNames> (key: K, value: null): void
  }

  interface MergedCustomCSS { ui: string; find: FindCSS; omni: string }
  type LocalSettingNames = "innerCSS" | "findCSS" | "omniCSS" | "i18n_f" | "vomnibarPage_f" | "newTabUrl_f"
      | "ignoreKeyboardLayout" | "mapModifier" | "ignoreCapsLock"
      | "findModeRawQueryList" | GlobalConsts.kIsHighContrast | `${string}|${string}`

  // type NameList = Array<SettingNames>;
}
import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;

declare namespace BackendHandlersNS {
  interface SpecialHandlers {
    [kFgReq.gotoSession]: {
      (this: void, request: { s: CompletersNS.SessionId; a: 0 | 1 | 2 }, port: Port): void;
      (this: void, request: { s: CompletersNS.SessionId; a?: 1 }): void;
    };
    [kFgReq.checkIfEnabled]: ExclusionsNS.Listener & (
        (this: void, request: FgReq[kFgReq.checkIfEnabled], port: Frames.Port) => void);
    [kFgReq.focusOrLaunch]: (this: void, request: FgReq[kFgReq.focusOrLaunch], port?: Port | null) => void
    [kFgReq.removeSug]: (this: void, request: FgReq[kFgReq.removeSug], _port?: Port | null) => void
    [kFgReq.key]: (this: void, request: FgReq[kFgReq.key], port: Port | null) => void
    [kFgReq.recheckTee]: () => FgRes[kFgReq.recheckTee]
  }
  type FgRequestHandlers = {
    readonly [K in keyof FgReqWithRes | keyof FgReq]:
      K extends keyof SpecialHandlers ? SpecialHandlers[K] :
      K extends keyof FgReqWithRes ? (((this: void, req: FgReqWithRes[K], port: Port, msgId: number) => FgRes[K] | Port)
        | (K extends keyof FgReq ? (this: void, request: FgReq[K], port: Port) => void : never)) :
      K extends keyof FgReq ? ((this: void, request: FgReq[K], port: Port) => void) :
      never;
  }
  const enum kInitStat {
    none = 0, settings = 2, main = 4, START = none, FINISHED = settings | main
  }
}

declare const enum Consts {
  MaxCharsInQuery = 200, LowerBoundOfMaxChars = 50, UpperBoundOfMaxChars = 320,
  MaxLengthOfSearchKey = 50, MinInvalidLengthOfSearchKey = MaxLengthOfSearchKey + 1,
}

interface SetTimeout {
  <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
    timeout: number, a1: T1, a2: T2, a3: T3): number;
  <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void, timeout: number, a1: T1, a2: T2): number;
  <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
}

interface SetInterval {
  <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number
}

interface IterableMap<K extends string | number, V> extends Map<K, V> {
  keys (): IterableIterator<K> & K[]
}

type ExtApiResult<T> = [T, undefined] | [undefined, { message?: any }]
declare function fetch(input: `/${string}` | `data:${string}`, init?: Partial<Request>): Promise<Response>;

interface MaybeWithWindow { window?: Window; document?: HTMLDocument }

interface InfoOnSed {
  keyword_?: string | null
  actAnyway_?: boolean | null
  noSysClip_?: boolean | null
}
