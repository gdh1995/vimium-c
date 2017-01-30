declare namespace Search {
  interface Engine {
    readonly url: string;
    readonly name: string;
  }
  interface Result {
    readonly url: string;
    readonly indexes: number[];
  }
}
declare namespace Urls {
  type MathEvalResult = [string, "math", string];
  type EvalArrayResult = [string, "copy" | "ERROR"] | [string[], "search"] | MathEvalResult;
  type EvalResult = EvalArrayResult | Promise<EvalArrayResult> | string | null;

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
    NonENTld = 2,
    ENTld = 1,
    NotTld = 0
  }

}
declare var Utils: any, Settings: any, TabRecency: any;

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
