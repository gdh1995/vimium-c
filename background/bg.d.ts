declare namespace Search {
  interface RawEngine {
    url: string;
    name: string;
  }
  interface Engine extends Readonly<RawEngine> {}
  interface Result {
    readonly url: string;
    readonly indexes: number[];
  }
  interface Executor {
    (query: string[], url: string, indexes: number[]): Result;
    (query: string[], url: string): string;
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
    Default = 0,
    Full = Default,
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

  interface RawSender {
    readonly frameId: number;
    readonly incognito: boolean;
    tabId: number;
    url: string;
    status: ValidStatus;
    flags: Flags;
  }
  interface Sender extends RawSender {
    readonly tabId: number;
  }

  interface RawPort extends chrome.runtime.Port {
    sender: Partial<Sender> & chrome.runtime.MessageSender;
  }
  interface Port extends chrome.runtime.Port {
    sender: Sender;
    postMessage<K extends 1, O extends keyof CmdOptions>(request: Req.FgCmd<O>): K;
    postMessage<K extends keyof FullBgReq>(request: Req.bg<K>): 1;
    postMessage<K extends keyof FgRes>(request: {
      _msgId: number;
      response: FgRes[K];
    }): 1;
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
  readonly sender: Readonly<Frames.Sender>;
}

declare const enum IncognitoType {
  mayFalse = 0, true = 1,
  ensuredFalse = -1,
}

type CurrentTabs = [chrome.tabs.Tab];

declare namespace MarksNS {
  interface StoredMark extends BaseMarkProps {
    tabId: number;
  }

  interface InfoToGo extends FocusOrLaunch, Partial<BaseMark> {
    scroll: ScrollInfo;
    tabId?: number;
  }
  type MarkToGo = InfoToGo & BaseMark;
}

interface FindModeQuery {
  (incognito: boolean, query?: undefined | "", index?: number): string;
  (incognito: boolean, query: string, index?: number): void;
}

declare namespace ExclusionsNS {
  interface StoredRule {
    pattern: string;
    passKeys: string;
  }
  type Details = chrome.webNavigation.WebNavigationFramedCallbackDetails;
  interface Listener {
    (this: void, details: Details): void;
  }
}

declare namespace CommandsNS {
  interface RawOptions extends SafeDict<any> {}
  interface Options extends ReadonlySafeDict<any> {}
  interface Description {
    readonly [0]: string; // description
    readonly [1]: number; // count limit
    readonly [2]: boolean; // is background
    readonly length: number;
  }
  interface BaseDescriptionEx extends Description {
    readonly [3]: Options | null; // default options
  }
  interface Description4 extends BaseDescriptionEx {
    readonly [3]: Options; // default options
  }
  interface Description5 extends BaseDescriptionEx {
    readonly [4]: string; // alias
  }
  interface Item {
    readonly alias: string;
    readonly background: boolean;
    readonly command: string;
    readonly options: Options | null;
    readonly repeat: number;
  }

}

declare namespace CompletersNS {
  interface QueryStatus { isOff: boolean }

  interface Domain {
    time: number;
    count: number;
    https: BOOL;
  }

  type Callback = (this: void, sugs: Readonly<Suggestion>[],
    newAutoSelect: boolean, newMatchType: MatchType, newMatchedTotal: number) => void;

  type FullOptions = Options & {
  };

  interface GlobalCompletersConstructor {
    filter (this: GlobalCompletersConstructor, query: string, options: FullOptions, callback: Callback): void;
    removeSug (url: string, type: FgReq["removeSug"]["type"], callback: (succeed: boolean) => void): void;
  }
}
declare var Completers: CompletersNS.GlobalCompletersConstructor;
type Suggestion = CompletersNS.Suggestion;

declare namespace IconNS {
  type ValidSizes = "19" | "38";

  interface StatusMap<T> {
    [0]: T | undefined;
    [1]: T | undefined;
    [2]: T | undefined;
  }
  type IconBuffer = {
    [size in ValidSizes]?: ImageData;
  }
  type PathBuffer = {
    readonly [size in ValidSizes]: string;
  }
  interface AccessIconBuffer {
    (this: void, enabled: boolean): void;
    (this: void): IconNS.StatusMap<IconNS.IconBuffer> | null;
  }
}

declare namespace SettingsNS {
  interface BackendSettings {
    dialogMode: boolean;
    exclusionListenHash: boolean;
    exclusionOnlyFirstMatch: boolean;
    exclusionRules: ExclusionsNS.StoredRule[];
    extWhiteList: string;
    findModeRawQueryList: string;
    grabBackFocus: boolean;
    hideHud: boolean;
    keyMappings: string;
    localeEncoding: string;
    newTabUrl: string;
    newTabUrl_f: string;
    nextPatterns: string;
    previousPatterns: string;
    searchUrl: string;
    searchEngines: string;
    showActionIcon: boolean;
    showAdvancedCommands: boolean;
    showAdvancedOptions: boolean;
    userDefinedCss: string;
    vimSync: boolean;
    vomnibarPage: string;
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
    innerCSS: string;
    searchEngineRules: Search.Rule[];
    searchKeywords: string[] | null;
    vomnibarPage_f: string;
  }
  interface NonPersistentSettings extends BaseNonPersistentSettings, OtherSettingsWithDefaults, CachedFiles {}
  interface PersistentSettings extends FrontendSettings, BackendSettings {}

  interface SettingsWithDefaults extends PersistentSettings, OtherSettingsWithDefaults {}
  interface FullSettings extends PersistentSettings, NonPersistentSettings, FrontUpdateAllowedSettings {}

  interface UpdateHook<K extends keyof FullSettings> {
    (this: Window["Settings"], value: FullSettings[K], key: K): void;
  }
  interface NullableUpdateHook<K extends keyof FullSettings> {
    (this: Window["Settings"], value: FullSettings[K] | null, key: K): void;
  }
  interface UpdateHookWoThis<K extends keyof FullSettings> {
    (this: void, value: FullSettings[K]): void;
  }
  type BaseUpdateHookMap = {
    [key in keyof FullSettings]: UpdateHook<key>;
  }
  interface NullableUpdateHookMap {
    searchEngines: NullableUpdateHook<"searchEngines">;
    searchEngineMap: NullableUpdateHook<"searchEngineMap">;
    searchUrl: NullableUpdateHook<"searchUrl">;
  }
  interface SpecialUpdateHookMap {
    bufferToLoad (this: Window["Settings"], value: null): void;
  }
  type DeclaredUpdateHookMap = NullableUpdateHookMap
      & Pick<BaseUpdateHookMap, "extWhiteList" | "grabBackFocus" | "newTabUrl" | "baseCSS" | "vimSync"
        | "userDefinedCss" | "vomnibarPage">;
  type EnsuredUpdateHookMaps = DeclaredUpdateHookMap
      & Pick<BaseUpdateHookMap, "showActionIcon" | "newTabUrl_f">;
  type BaseUpdateHookMap2 = {
    [key in keyof SettingsWithDefaults]: UpdateHook<key>;
  } & EnsuredUpdateHookMaps & SpecialUpdateHookMap;
  interface UpdateHookMap extends BaseUpdateHookMap2 {
    showActionIcon: UpdateHookWoThis<"showActionIcon">;
  }

  interface FullCache extends Partial<FullSettings>, SafeObject {
    innerCSS: FullSettings["innerCSS"];
    newTabUrl_f: FullSettings["newTabUrl_f"];
    searchEngineMap: FullSettings["searchEngineMap"];
    searchEngineRules: FullSettings["searchEngineRules"];
    vomnibarPage_f: FullSettings["vomnibarPage_f"];
  }

  type DynamicFiles = "HelpDialog" | "Commands" | "Exclusions" |
    "TabRecency" | "Completers" |
    "MathParser";

  interface OnSyncUpdate {
    (this: void, changes: { [key: string]: chrome.storage.StorageChange }, area: string): void;
  }
  interface Sync {
    set<K extends keyof PersistentSettings> (key: K, value: PersistentSettings[K] | null): void;
    HandleStorageUpdate?: OnSyncUpdate;
  }

  // type NameList = Array<SettingNames>;
}
import FullSettings = SettingsNS.FullSettings;

declare namespace BackendHandlersNS {
  interface checkIfEnabled extends ExclusionsNS.Listener {
    (this: void, request: FgReq["checkIfEnabled"], port: Frames.Port): void;
  }

  interface BackendHandlers {
    parse (this: void, request: FgReq["parseSearchUrl"]): FgRes["parseSearchUrl"];
    gotoSession: {
      (this: void, request: { sessionId: string | number, active: true }, port: Port): void;
      (this: void, request: { sessionId: string | number, active?: false }): void;
    };
    openUrl (this: void, request: FgReq["openUrl"], port?: Port | undefined): void;
    checkIfEnabled: checkIfEnabled;
    focus (this: void, request: MarksNS.FocusOrLaunch): void;
    reopenTab (tab: chrome.tabs.Tab, refresh?: boolean): void;
    setIcon (tabId: number, type: Frames.ValidStatus): void;
    IconBuffer: IconNS.AccessIconBuffer | null,
    removeSug (this: void, req: FgReq["removeSug"], port?: Port): void;
    complain (this: BackendHandlers, message: string): void;
    showHUD (message: string, isCopy?: boolean | undefined): void;
    getExcluded (this: void, url: string): string | null,
    forceStatus (this: BackendHandlers, act: Frames.ForcedStatusText, tabId?: number): void;
    indexPorts: {
      (this: void, tabId: number, frameId: number): Port | null;
      (this: void, tabId: number): Frames.Frames | null;
      (this: void): Frames.FramesMap;
    };
    ExecuteGlobal (this: void, command: string): void;
    Init: ((this: void) => void) | null;
  }
}

interface CommandsData {
  keyToCommandRegistry: SafeDict<CommandsNS.Item>;
  keyMap: KeyMap;
  cmdMap: SafeDict<CommandsNS.Options | null>;
  mapKeyRegistry: SafeDict<string> | null;
  availableCommands: ReadonlySafeDict<CommandsNS.Description>;
  errors: number;
}

interface BaseHelpDialog {
}

interface Window {
  readonly MathParser?: any;
  readonly Commands?: any;
  readonly CommandsData: CommandsData;
  readonly Exclusions?: any;
  readonly HelpDialog?: BaseHelpDialog;
  readonly TabRecency?: any;
  readonly Completers?: any;

  readonly Backend: BackendHandlersNS.BackendHandlers;
  readonly Utils: {
    readonly spacesRe: RegExpG;
    readonly convertToUrl: Urls.Converter;
    lastUrlType: Urls.Type;
    readonly createSearch: Search.Executor;
    readonly createSearchUrl: Urls.Searcher;
    readonly evalVimiumUrl: Urls.Executor;
    parseSearchEngines (this: any, str: string, map: Search.EngineMap): Search.Rule[];
    require<T extends object> (name: SettingsNS.DynamicFiles): Promise<T>;
    GC (): void;
  };
  readonly Settings: {
    readonly cache: Readonly<SettingsNS.FullCache>;
    readonly temp: {
      readonly shownHash: ((this: void) => string) | null;
    };
    readonly newTabs: SafeDict<Urls.NewTabType>,
    broadcast<K extends keyof BgReq> (request: Req.bg<K>): void;
    readonly bufferToLoad: SettingsNS.FrontendSettingCache & SafeObject;
    get<K extends keyof SettingsNS.SettingsWithDefaults> (key: K, forCache?: boolean
      ): SettingsNS.SettingsWithDefaults[K];
    set<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void;
    fetchFile (file: keyof SettingsNS.CachedFiles, callback?: (this: void) => any): TextXHR | null;
    readonly defaults: SettingsNS.SettingsWithDefaults & SafeObject;
    readonly CONST: {
      readonly OptionsPage: string;
      readonly CurrentVersion: string;
      readonly ChromeVersion: BrowserVer;
      readonly BrowserNewTab: string;
      readonly ChromeInnerNewTab: string;
      readonly VimiumNewTab: string;
      readonly Platform: string;
    };
  }
}

declare const enum Consts {
  MaxCharsInQuery = 200, LowerBoundOfMaxChars = 50, UpperBoundOfMaxChars = 320,
  MaxLengthOfSearchKey = 50, MinInvalidLengthOfSearchKey = MaxLengthOfSearchKey + 1,
}

declare function setTimeout <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setTimeout <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setTimeout <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
