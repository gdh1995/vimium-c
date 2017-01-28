type voidFunc = (...args: any[]) => void;
type voidFuncNoEnv = (this: void) => void;
type BOOL = 0 | 1;
interface Dict<T> {
  [key: string]: T;
}
interface SafeDict<T> extends Dict<T> {
  __proto__: never;
}

interface EmptyArray<T> extends Array<T> {
  [index: number]: never;
  length: 0;
}

declare function setInterval<T1, T2, T3>(handler: (a1: T1, a2: T2, a3: T3) => void, timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setInterval<T1, T2>(handler: (a1: T1, a2: T2) => void, timeout: number, a1: T1, a2: T2): number;
declare function setInterval<T1>(handler: (a1: T1) => void, timeout: number, a1: T1): number;
declare function setInterval(handler: () => void, timeout: number): number;
declare function setTimeout <T1, T2, T3>(handler: (a1: T1, a2: T2, a3: T3) => void, timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setTimeout <T1, T2>(handler: (a1: T1, a2: T2) => void, timeout: number, a1: T1, a2: T2): number;
declare function setTimeout <T1>(handler: (a1: T1) => void, timeout: number, a1: T1): number;
declare function setTimeout (handler: () => void, timeout: number): number;

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
  interface ValidTypes { bookm: never, domain: never, history: never, omni: never, search: never, tab: never }
  interface Options {
    clientWidth?: number;
    maxResults?: number;
    type: keyof ValidTypes;
  }
}

