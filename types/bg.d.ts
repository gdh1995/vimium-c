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
}
declare var Utils: any, Settings: any, TabRecency: any;

interface GlobalCompletersConstructor {
  filter (this: GlobalCompletersConstructor, query: string, options: CompletersNS.Options, callback: CompletersNS.Callback): void;
}
declare var Completers: GlobalCompletersConstructor;

interface QueryStatus { isOff: boolean }

declare namespace CompletersNS {
  type Callback = (this: void, sugs: Suggestion[],
    newAutoSelect: boolean, newMatchType: MatchType) => void;
}
