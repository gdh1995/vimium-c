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

  type EvalArrayResultWithSideEffects = CopyEvalResult;

  type SpecialUrl = BaseEvalResult | Promise<BaseEvalResult>;
  type Url = string | SpecialUrl;

  const enum Type {
    Default = 0,
    Full = Default,
    NoSchema = 1,
    NoProtocolName = 2,
    MaxOfInputIsPlainUrl = NoProtocolName,
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
}

declare namespace Frames {
  const enum BaseStatus {
    enabled = 0, partial = 1, disabled = 2,
    __fake = -1
  }
  type ValidStatus = BaseStatus.enabled | BaseStatus.partial | BaseStatus.disabled;

  interface RawSender {
    readonly frameId: number;
    readonly incognito: boolean;
    tabId: number;
    url: string;
    status: ValidStatus;
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

  interface Frames extends Array<Port> {
    [0]: Port;
    [1]: Port;
  }

  interface FramesMap {
    [tabId: number]: Frames | undefined;
    readonly __proto__: never;
  }

  interface FramesMapToDestroy extends FramesMap {
    [tabId: number]: Frames;
    omni?: Port[];
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
    scroll: ScrollInfo;
    markName?: string;
    tabId?: number;
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
      & Pick<BaseUpdateHookMap, "extWhiteList" | "newTabUrl" | "baseCSS" | "vimSync"
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
    searchKeywords: FullSettings["searchKeywords"];
    searchEngineMap: FullSettings["searchEngineMap"];
    searchEngineRules: FullSettings["searchEngineRules"];
    vomnibarPage_f: FullSettings["vomnibarPage_f"];
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
    parseSearchUrl(this: void, request: FgReq["parseSearchUrl"]): FgRes["parseSearchUrl"];
    gotoSession: {
      (this: void, request: { sessionId: string | number, active: true }, port: Port): void;
      (this: void, request: { sessionId: string | number, active?: false }): void;
      (this: void, request: { sessionId: string | number }): void;
    };
    openUrl(this: void, request: FgReq["openUrl"], port?: Port | undefined): void;
    checkIfEnabled: checkIfEnabled;
    focusOrLaunch(this: void, request: MarksNS.FocusOrLaunch): void;
    SetIcon(tabId: number, type: Frames.ValidStatus): void;
    ShowHUD(message: string, isCopy?: boolean | undefined): void;
  }
}

interface CommandsData {
  keyToCommandRegistry: SafeDict<CommandsNS.Item>;
  keyMap: KeyMap;
  mapKeyRegistry: SafeDict<string> | null;
  availableCommands: SafeDict<CommandsNS.Description>;
}

interface BaseHelpDialog {
  render (this: void, request: FgReq["initHelp"]): string;
}

interface Window {
  readonly MathParser?: any;
  readonly Commands?: any;
  readonly Exclusions?: any;
  readonly HelpDialog?: BaseHelpDialog;

  readonly g_requestHandlers: BgReqHandlerNS.BgReqHandlers;
  readonly Utils: {
    readonly spacesRe: RegExpG;
    readonly convertToUrl: Urls.Converter;
    lastUrlType: Urls.Type;
    readonly createSearch: Search.Executor;
    readonly createSearchUrl: Urls.Searcher;
    readonly evalVimiumUrl: Urls.Executor;
    parseSearchEngines (this: any, str: string, map: Search.EngineMap): Search.Rule[];
    require<T extends object> (name: SettingsNS.DynamicFiles): Promise<T>;
  };
  readonly Settings: {
    readonly cache: SettingsNS.FullCache;
    readonly temp: {
      readonly shownHash: ((this: void) => string) | null;
    };
    broadcast<K extends keyof BgReq> (request: Req.bg<K>): void;
    readonly bufferToLoad: SettingsNS.FrontendSettingCache & SafeObject;
    get<K extends keyof SettingsNS.SettingsWithDefaults> (key: K, forCache?: boolean
      ): SettingsNS.SettingsWithDefaults[K];
    set<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void;
    indexPorts: {
      (this: void, tabId: number): Frames.Frames | undefined;
      (this: void): Frames.FramesMap;
    };
    fetchFile (file: keyof SettingsNS.CachedFiles, callback?: (this: void) => any): TextXHR | null;
    readonly defaults: SettingsNS.SettingsWithDefaults & SafeObject;
    readonly CONST: {
      readonly OptionsPage: string;
      readonly CurrentVersion: string;
      readonly ChromeVersion: number;
      readonly BrowserNewTab: string;
      readonly ChromeInnerNewTab: string;
      readonly VimiumNewTab: string;
      readonly Platform: string;
      BaseCSSLength: number;
    };
  }
}
declare const enum BrowserVer {
  MinSupported = 37,
  MinWithFrameId = 41,
  // just enabled by default
  Min$String$$EndsWith = 41,
  // even if chrome://flags/#disable-javascript-harmony-shipping
  MinEnsured$String$$EndsWith = 43,
  MinCreateWndWithState = 44,
  MinMutedInfo = 45,
  MinAutoDecodeJSUrl = 46,
  MinNoUnmatchedIncognito = 52,
  MinClosedShadowRoot = 53,
  AssumesVer = 53,
  MinExtIframesInSharedProcess = 56,
}
