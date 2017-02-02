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
    plain = 0,
    emptyResult = 1, // require query is not empty
    singleMatch = 2,
    reset = -1,
    _searching = -2, searchWanted = 3 // are same
  }
  type ValidTypes = "bookm" | "domain" | "history" | "omni" | "search" | "tab";
  interface Options {
    clientWidth?: number;
    maxResults?: number;
    type: ValidTypes;
  }
}

declare const enum KnownKey {
  space = 32, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash,
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
    markName: string,
  }
}
