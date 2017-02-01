type voidFunc = (...args: any[]) => void;
type voidFuncNoEnv = (this: void) => void;
type BOOL = 0 | 1;
interface Dict<T> {
  [key: string]: T;
}
interface SafeDict<T> extends Dict<T> {
  readonly __proto__: never;
}
interface ReadonlySafeDict<T> extends SafeDict<T> {
  readonly [key: string]: T;
}
interface SafeEnum extends SafeDict<1> {}

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
  interface Base {
    name: string;
  }

  interface Scroll extends Base {
    markName?: string | undefined;
    scroll: [number, number];
  }
  interface Reset extends Base {
    passKeys: string | null;
  }
}
