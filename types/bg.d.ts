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
  type Rule = [string, RegExpOne | RegExpI, string, RegExpOne | RegExpI | string];
  interface EngineMap extends SafeDict<Engine> {}
}
declare namespace Urls {
  type ValidEvalTag = "math" | "copy" | "search" | "ERROR";

  interface BaseEvalResult extends Array<string | string[]> {
    readonly [0]: string | string[];
    readonly [1]: ValidEvalTag;
    readonly length: 2 | 3;
  }
  interface BasePlainEvalResult<T extends ValidEvalTag> extends BaseEvalResult {
    readonly [1]: T;
    readonly length: 2;
  }
  interface MathEvalResult extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: "math";
    readonly [2]: string;
    readonly length: 3;
  }
  interface SearchEvalResult extends BasePlainEvalResult<"search"> {}
  interface CopyEvalResult extends BasePlainEvalResult<"copy"> {}
  interface ErrorEvalResult extends BaseEvalResult {
    readonly [0]: string;
    readonly [1]: "ERROR";
    readonly length: 2;
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
    KeepAll = -2,
    ConvertKnown = -1,
    ValidNormal = 0,
    ActIfNoSideEffects = 1,
    ActAnyway = 2,
    // EnsureString = KeepAll | ConvertKnown | ValidNormal,
    Default = ValidNormal
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

declare namespace CommandsNS {
  interface Options extends ReadonlySafeDict<any> {}
  interface Description extends Array<any> {
    readonly [0]: string; // description
    readonly [1]: number; // count limit
    readonly [2]: boolean; // is background
    readonly [3]?: Options | null; // default options
    readonly [4]?: string; // alias
    readonly length: 3 | 4 | 5;
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

declare var Clipboard: any, TabRecency: any,
  g_requestHandlers: any,
  CommandsData: any,
  Settings: any;

interface Window {
  readonly MathParser?: any;
}