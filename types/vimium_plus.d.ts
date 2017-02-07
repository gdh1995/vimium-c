type BOOL = 0 | 1;
interface Dict<T> {
  [key: string]: T | undefined;
}
type SafeObject = {
  readonly __proto__: never;
};
interface SafeDict<T> extends Dict<T>, SafeObject {}
interface ReadonlySafeDict<T> extends SafeDict<T> {
  readonly [key: string]: T | undefined;
}
interface SafeEnum extends ReadonlySafeDict<1> {}
interface EnsuredSafeDict<T> extends SafeDict<T> {
  [key: string]: T;
}

type TypedSafeEnum<Type> = {
  readonly [key in keyof Type]: 1;
} & SafeObject;
type MappedType<Type, NewValue> = {
  [key in keyof Type]: NewValue;
};

// type EmptyArray = never[];

declare function setInterval<T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setInterval<T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setInterval<T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
declare function setInterval(this: void, handler: (this: void, ) => void, timeout: number): number;
declare function setTimeout <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setTimeout <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setTimeout <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
declare function setTimeout (this: void, handler: (this: void) => void, timeout: number): number;

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

declare namespace MarksNS {
  interface BaseMark {
    markName: string;
  }

  interface Mark extends BaseMark {
    scroll: [number, number];
    url: string;
  }

  interface MarkQuery extends BaseMark {
    prefix?: boolean;
    scroll: [number, number];
  }

  interface FocusOrLaunch {
    scroll?: [number, number];
    url: string;
    prefix?: boolean;
    reuse?: ReuseType;
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

declare const enum ReuseType {
  Default = 0,
  current = Default,
  reuse = 1,
  newFg = -1,
  newBg = -2
}

declare const enum PortType {
  initing = 1,
  hasFocus = 2,
  isTop = 4,
  omnibar = 8
}

declare namespace SettingsNS {
  interface FrontUpdateAllowedSettings {
    showAdvancedCommands: boolean;
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
}
