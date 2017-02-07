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
  type TmpRule = [string, RegExpOne | RegExpI];
  interface Rule {
    readonly [0]: string;
    readonly [1]: RegExp;
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

  type EvalArrayResultWithSideEffects = CopyEvalResult;

  type SpecialUrl = BaseEvalResult | Promise<BaseEvalResult>;
  type Url = string | SpecialUrl;

  const enum Type {
    Default = 0,
    Full = Default,
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
    ValidNormal = Default,
  }
  type WorkEnsureString = WorkType.KeepAll | WorkType.ConvertKnown | WorkType.ValidNormal;
  type WorkAllowEval = WorkType.ActIfNoSideEffects | WorkType.ActAnyway;

  interface Converter {
    (string: string, keyword: string | null,
      vimiumUrlWork: Urls.WorkType.KeepAll | Urls.WorkType.ConvertKnown | Urls.WorkType.ValidNormal
      ): string;
    (string: string, keyword: string | null, vimiumUrlWork: undefined): string;
    (string: string, keyword: string | null, vimiumUrlWork: Urls.WorkType | undefined): Url;
    (string: string, keyword: string): string;
    (string: string): string;
  }
}

declare namespace Frames {
  const enum BaseStatus {
    enabled = 0, partial = 1, disabled = 2,
    __fake = -1
  }
  type ValidStatus = BaseStatus.enabled | BaseStatus.partial | BaseStatus.disabled;

  interface Sender {
    readonly frameId: number;
    readonly incognito: boolean;
    tabId: number;
    url: string;
    status: ValidStatus;
  }
  interface ExSender extends Sender {
    warned?: boolean;
  }

  interface RawPort extends chrome.runtime.Port {
    sender: Partial<Sender> & chrome.runtime.MessageSender;
  }
  interface Port extends chrome.runtime.Port {
    sender: Sender;
    postMessage<K extends 1, O extends keyof CmdOptions>(request: Req.FgCmd<O>): K;
    postMessage<K extends keyof BgReq>(request: Req.bg<K>): 1;
    postMessage<K extends keyof FgRes>(request: {
      _msgId: number;
      response: FgRes[K];
    }): 1;
  }

  interface Frames extends Array<Port> {
    [0]: Port;
    [1]: Port;
  }

  interface FramesMap {
    [tabId: number]: Frames | undefined;
    omni?: Port[];
    readonly __proto__: never;
  }
}
interface Port extends Frames.Port {
  readonly sender: Readonly<Frames.Sender>;
}

type CurrentTabs = [chrome.tabs.Tab];

declare namespace MarksNS {
  interface StoredMark extends Mark {
    tabId: number;
  }

  interface MarkToGo extends FocusOrLaunch {
    url: string;
    scroll: [number, number];
    markName?: string;
    tabId?: number;
    prefix?: boolean;
  }

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
    readonly [3]?: object | null; // default options
    readonly [4]?: string; // alias
  }
  interface Item {
    readonly alias: string | null;
    readonly background: boolean;
    readonly command: string;
    readonly options: Options | null;
    readonly repeat: number;
  }

}

interface GlobalCompletersConstructor {
  filter (this: GlobalCompletersConstructor, query: string, options: CompletersNS.Options, callback: CompletersNS.Callback): void;
}
declare var Completers: GlobalCompletersConstructor;

declare namespace CompletersNS {
  interface QueryStatus { isOff: boolean }

  interface Domain {
    [0]: number;
    [1]: number;
    [2]: BOOL;
  }

  type Callback = (this: void, sugs: Readonly<Suggestion>[],
    newAutoSelect: boolean, newMatchType: MatchType) => void;
}
import Suggestion = CompletersNS.Suggestion;

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
    [size in ValidSizes]: string;
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
  interface NonPersistentSettings extends BaseNonPersistentSettings, OtherSettingsWithDefaults, CachedFiles {}
  interface PersistentSettings extends FrontendSettings, BackendSettings {}

  interface SettingsWithDefaults extends PersistentSettings, OtherSettingsWithDefaults {}
  interface FullSettings extends PersistentSettings, NonPersistentSettings, FrontUpdateAllowedSettings {}

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
    showActionIcon (this: void, value: boolean): void;
    newTabUrl_f: (this: void, url_f: string) => void;
    exclusionRules?: (this: void, rules: ExclusionsNS.StoredRule[]) => void;
    exclusionOnlyFirstMatch?: (this: void, value: boolean) => void;
    exclusionListenHash?: (this: void, value: boolean) => void;
    localeEncoding?: (this: void, value: string) => void;
    keyMappings?: (this: any, value: string) => void;
  }

  interface FullCache extends Partial<FullSettings>, SafeObject {
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

declare namespace BgReqHandlerNS {
  interface checkIfEnabled extends ExclusionsNS.Listener {
    (this: void, request: FgReq["checkIfEnabled"], port: Frames.Port): void;
  }

  interface BgReqHandlers {
    parseSearchUrl(this: void, request: {
        url: string;
        upper?: number | undefined;
        trailing_slash?: boolean | undefined;
    }): {
        keyword: string;
        start: number;
        url: string;
    } | null;
    gotoSession: {
      (this: void, request: { sessionId: string | number, active: true }, port: Port): void;
      (this: void, request: { sessionId: string | number, active?: false }): void;
      (this: void, request: { sessionId: string | number }): void;
    };
    openUrl(this: void, request: FgReq["openUrl"], port?: Port | undefined): void;
    checkIfEnabled: checkIfEnabled;
    focusOrLaunch(this: void, request: MarksNS.FocusOrLaunch): 1;
    SetIcon(tabId: number, type: Frames.ValidStatus): void;
    ShowHUD(message: string, isCopy?: boolean | undefined): void;
  }
}

declare var CommandsData: {
  keyToCommandRegistry: SafeDict<CommandsNS.Item>;
  keyMap: KeyMap;
  mapKeyRegistry: SafeDict<string> | null;
  availableCommands: SafeDict<CommandsNS.Description>;
};

interface Window {
  readonly MathParser?: any;
  readonly Commands?: any;
  readonly Exclusions?: any;
  readonly HelpDialog?: any;

  readonly g_requestHandlers: BgReqHandlerNS.BgReqHandlers;
}