declare namespace Search {
  interface Engine {
    readonly url: string;
    readonly name: string;
  }
  interface Result {
    readonly url: string;
    readonly indexes: number[];
  }
  interface Executor {
    (query: string[], url: string, indexes: number[]): Result;
    (query: string[], url: string): string;
  }
  type TmpRule = [string, RegExpOne | RegExpI];
  interface Rule {
    readonly [0]: string;
    readonly [1]: RegExpOne | RegExpI;
    readonly [2]: string;
    readonly [3]: RegExpOne | RegExpI | string;
  }
  interface EngineMap extends SafeDict<Engine> {}
}
declare namespace Urls {
  type ValidEvalTag = "math" | "copy" | "search" | "ERROR";

  interface BaseEvalResult {
    readonly [0]: string | string[];
    readonly [1]: ValidEvalTag;
    readonly [2]?: undefined | string;
  }
  interface BasePlainEvalResult<T extends ValidEvalTag> extends BaseEvalResult {
    readonly [1]: T;
    readonly [2]?: undefined;
  }
  interface MathEvalResult extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: "math";
    readonly [2]: string;
  }
  interface SearchEvalResult extends BasePlainEvalResult<"search"> {}
  interface CopyEvalResult extends BasePlainEvalResult<"copy"> {}
  interface ErrorEvalResult extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: "ERROR";
    readonly [2]?: undefined;
  }

  type EvalArrayResultWithSideEffects = CopyEvalResult;

  type Url = BaseEvalResult | Promise<BaseEvalResult> | string;

  const enum Type {
    Full = 0,
    NoSchema = 1,
    NoProtocolName = 2,
    PlainVimium = 3,
    Search = 4,
    Functional = 5
  }
  const enum TempType {
    Unspecified = -1
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
    ValidNormal = Default
    // EnsureString = KeepAll | ConvertKnown | ValidNormal,
  }

  interface Converter {
    (string: string, keyword: string | null,
      vimiumUrlWork: Urls.WorkType.KeepAll | Urls.WorkType.ConvertKnown | Urls.WorkType.ValidNormal
      ): string;
    (string: string, keyword: string | null, vimiumUrlWork: undefined): string;
    (string: string, keyword: string | null, vimiumUrlWork: Urls.WorkType | undefined): Url;
    (string: string, keyword?: string): string;
  }
}

declare namespace Frames {
  const enum Status {
    enabled = 0, partial = 1, disabled = 2
  }

  interface Sender {
    readonly frameId: number;
    readonly incognito: boolean;
    tabId: number;
    url: string;
    status: Status;
  }

  interface Port extends chrome.runtime.Port {
    sender: Sender;
    postMessage(request: BgReq.base): void;
  }

  interface Frames extends Array<Port> {
    [0]: Port;
    [1]: Port;
  }

  interface FramesMap {
    [tabId: number]: Frames.Frames;
    readonly __proto__: never;
  }
}
interface Sender extends Readonly<Frames.Sender> {}
interface Port extends Readonly<Frames.Port> {}

type CurrentTabs = [chrome.tabs.Tab];

declare namespace MarksNS {
  interface BaseMark {
    markName: string;
  }

  interface Mark extends BaseMark {
    scroll: [number, number];
    url: string;
  }

  interface StoredMark extends Mark {
    tabId: number;
  }

  interface MarkQuery extends BaseMark {
    prefix?: boolean;
    scroll: [number, number];
  } 

  interface MarkToGo {
    markName?: string;
    tabId: number;
    scroll: [number, number];
    url: string;
    prefix?: boolean;
  }
}

declare namespace ExclusionsNS {
  interface StoredRule {
    pattern: string;
    passKeys: string;
  }
  interface Listener {
    (details: chrome.webNavigation.WebNavigationCallbackDetails): void;
  }
}

declare namespace CommandsNS {
  interface Options extends ReadonlySafeDict<any> {}
  interface Description {
    readonly [0]: string; // description
    readonly [1]: number; // count limit
    readonly [2]: boolean; // is background
    readonly [3]?: Options | null; // default options
    readonly [4]?: string; // alias
  }
  interface Item {
    readonly alias: string | null;
    readonly background: boolean;
    readonly command: string;
    readonly options: Options | null;
    readonly repeat: number;
  }

  interface CallGlobalCommand {
    (this: void): void;
  }
}

interface GlobalCompletersConstructor {
  filter (this: GlobalCompletersConstructor, query: string, options: CompletersNS.Options, callback: CompletersNS.Callback): void;
}
declare var Completers: GlobalCompletersConstructor;

interface QueryStatus { isOff: boolean }

declare namespace CompletersNS {
  interface Domain {
    [0]: number;
    [1]: number;
    [2]: BOOL;
  }

  type Callback = (this: void, sugs: Suggestion[],
    newAutoSelect: boolean, newMatchType: MatchType) => void;
}

declare namespace IconNS {
  interface IconBuffer {
    [size: string]: ImageData;
  }
  interface IconBufferGetter {
    (this: void, enabled?: boolean): IconBuffer | null;
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
  }
  interface FrontUpdateAllowedSettings {
    showAdvancedCommands: 1;
  }
  interface NonPersistentSettings extends BaseNonPersistentSettings, OtherSettingsWithDefaults, CachedFiles {}
  interface PersistentSettings extends FrontendSettings, BackendSettings {}

  interface SettingsWithDefaults extends PersistentSettings, OtherSettingsWithDefaults {}
  interface FullSettings extends PersistentSettings, NonPersistentSettings {}

  type SettingNamesWithHook = keyof FullSettings | "bufferToLoad";
  interface UpdateHook<K extends keyof FullSettings> {
    (this: any, value: FullSettings[K] | null, key: K): void;
  }
  type BaseUpdateHookMap = {
    [key in keyof FullSettings]?: UpdateHook<key>;
  }
  interface DeclaredUpdateHookMap extends BaseUpdateHookMap, SafeObject {
    bufferToLoad (this: any): void;
    extWhiteList (this: any, value: FullSettings["extWhiteList"]): void;
    newTabUrl (this: any, value: FullSettings["newTabUrl"]): void;
    searchEngines (this: any): void;
    searchEngineMap (this: any, value: FullSettings["searchEngineMap"]): void;
    baseCSS (this: any, value: FullSettings["baseCSS"]): void;
    vimSync (this: any, value: FullSettings["vimSync"]): void;
    userDefinedCss (this: any, css: string): void;
  }
  interface UpdateHookMap extends DeclaredUpdateHookMap {
    newTabUrl_f: (this: void, url_f: string) => void;
    exclusionRules?: (this: void, rules: ExclusionsNS.StoredRule[]) => void;
    exclusionOnlyFirstMatch?: (this: void, value: boolean) => void;
    exclusionListenHash?: (this: void, value: boolean) => void;
    localeEncoding?: (this: void, value: string) => void;
  }

  interface FullCache extends Partial<FullSettings> {
    innerCSS: FullSettings["innerCSS"];
    newTabUrl_f: FullSettings["newTabUrl_f"];
    searchKeywords: FullSettings["searchKeywords"];
    searchEngineMap: FullSettings["searchEngineMap"];
    searchEngineRules: FullSettings["searchEngineRules"];
  }

  type DynamicFiles = "HelpDialog" | "Commands" | "Exclusions" |
    "MathParser";

  interface IndexPorts {
    (this: any, tabId: number): Frames.Frames;
    (this: any): Frames.FramesMap;
  }

  interface Sync {
    set<K extends keyof PersistentSettings> (key: K, value: PersistentSettings[K] | null): void;
    HandleStorageUpdate?: (this: void, changes: any, area: any) => void;
  }

  // type NameList = Array<SettingNames>;
}
import FullSettings = SettingsNS.FullSettings;

declare var 
  g_requestHandlers: any,
  CommandsData: any;

interface Window {
  readonly MathParser?: any;
}