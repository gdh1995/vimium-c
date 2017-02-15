
declare namespace CompletersNS {
  /**
   * only those >= .Default can be used in content
   */
  const enum MatchType {
    Default = 0,
    plain = Default,
    emptyResult = 1, // require query is not empty
    singleMatch = 2,
    /**
     * must >= singleMatch
     */
    searchWanted = 3,
    reset = -1,
    /**
     * is the same as searchWanted
     */
    _searching = -2,
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

interface Document extends DocumentAttrsToBeDetected {}
