type voidFunc = (...args: any[]) => void;
type voidFuncNoEnv = (this: void) => void;
type BOOL = 0 | 1;
interface Dict<T> {
  [key: string]: T;
}
type SafeObject = {
  readonly __proto__: never;
};
interface SafeDict<T> extends Dict<T>, SafeObject {}
interface ReadonlySafeDict<T> extends SafeDict<T> {
  readonly [key: string]: T;
}
interface SafeEnum extends ReadonlySafeDict<1> {}

type TypedSafeEnum<Type> = {
  readonly [key in keyof Type]: 1;
} & SafeObject;
type MappedType<Type, NewValue> = {
  [key in keyof Type]: NewValue;
};

interface EmptyArray<T> extends Array<T> {
  [index: number]: never;
  length: 0;
}

declare function setInterval<T1, T2, T3>(handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setInterval<T1, T2>(handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setInterval<T1>(handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
declare function setInterval(handler: (this: void, ) => void, timeout: number): number;
declare function setTimeout <T1, T2, T3>(handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setTimeout <T1, T2>(handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setTimeout <T1>(handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
declare function setTimeout (handler: (this: void) => void, timeout: number): number;

interface String {
  endsWith(searchString: string): boolean;
  startsWith(searchString: string): boolean;
  trimLeft(): string;
  trimRight(): string;
}

declare namespace CompletersNS {
  const enum MatchType {
    Default = 0,
    plain = Default,
    emptyResult = 1, // require query is not empty
    singleMatch = 2,
    reset = -1,
    _searching = -2, searchWanted = 3 // are same
  }
  type ValidTypes = "bookm" | "domain" | "history" | "omni" | "search" | "tab";
  /**
   * "math" can not be the first suggestion, which is limited by omnibox handlers
   */
  type ValidSugTypes = ValidTypes | "math";
  interface Options {
    clientWidth?: number;
    maxResults?: number;
    type: ValidTypes;
  }

  interface WritableCoreSuggestion {
    type: ValidSugTypes;
    url: string;
    title: string;
    text: string;
  }

  type CoreSuggestion = Readonly<WritableCoreSuggestion>;

  interface Suggestion extends CoreSuggestion {
    text: string;
    relevancy: number;

    textSplit?: string;
    titleSplit?: string;
    sessionId?: string | number;
  }
}

declare const enum KnownKey {
  space = 32, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash,
}

interface ChildKeyMap {
  [index: string]: 0 | ChildKeyMap;
  readonly __proto__: never;
}
interface ReadonlyChildKeyMap {
  readonly [index: string]: 0 | ReadonlyChildKeyMap;
}
interface KeyMap {
  readonly [index: string]: 0 | 1 | ReadonlyChildKeyMap;
}

declare namespace BgReq {
  interface base {
    name: string;
  }
  interface scroll extends base {
    markName?: string | undefined;
    scroll: [number, number];
  }
  interface reset extends base {
    passKeys: string | null;
  }
  interface insertInnerCSS extends base {
    css: string;
  }
  interface createMark extends base {
    markName: string;
  }
  interface keyMap extends base {
    mapKeys: SafeDict<string>;
    keyMap: KeyMap;
  }
}

declare namespace FgReq {
  interface base {
    handler: string;
  }
  interface initHelp {
    handler: "initHelp";
    unbound?: boolean;
    names?: boolean;
    title?: string;
  }
}

interface FrontendSettings {
  deepHints: boolean;
  grabBackFocus: boolean;
  keyboard: [number, number];
  linkHintCharacters: string;
  regexFindMode: boolean;
  scrollStepSize: number;
  smoothScroll: boolean;
  userDefinedOuterCss: string;
}
interface FrontendSettingCache extends FrontendSettings {
  onMac: boolean;
}
