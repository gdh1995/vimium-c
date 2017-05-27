
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
    maxChars?: number;
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

  interface BaseSuggestion extends CoreSuggestion {
    text: string;
    textSplit?: string;
    title: string;
    sessionId?: string | number;
  }
  interface Suggestion extends BaseSuggestion {
    relevancy: number;
  }
  interface SearchSuggestion extends Suggestion {
    type: "search";
    pattern: string;
  }
}

declare namespace MarksNS {
  type ScrollInfo = [number, number];
  interface ScrollableMark {
    scroll: ScrollInfo;
  }
  interface BaseMark {
    markName: string;
  }

  interface Mark extends BaseMark {
    scroll: ScrollInfo;
    url: string;
  }

  interface FgQuery extends BaseMark {
    prefix?: boolean;
  }

  interface FgMark {
    scrollX: number;
    scrollY: number;
  }

  interface FocusOrLaunch {
    scroll?: ScrollInfo;
    url: string;
    prefix?: boolean;
    reuse?: ReuseType;
  }
}

declare const enum KnownKey {
  space = 32, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash,
  s = 115,
}

interface ChildKeyMap {
  [index: string]: 0 | ChildKeyMap;
  readonly __proto__: never;
}
interface ReadonlyChildKeyMap {
  readonly [index: string]: 0 | ReadonlyChildKeyMap | undefined;
}
interface KeyMap {
  readonly [index: string]: 0 | 1 | ReadonlyChildKeyMap | undefined;
}

declare const enum ReuseType {
  Default = 0,
  current = Default,
  reuse = 1,
  newFg = -1,
  newBg = -2
}

declare const enum PortType {
  nothing = 0,
  initing = 1,
  hasFocus = 2,
  isTop = 4,
  omnibar = 8, omnibarRe = 9
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

declare namespace VomnibarNS {
  const enum PageType {
    inner = 0, ext = 1, web = 2,
    Default = inner,
  }
}

interface Document extends DocumentAttrsToBeDetected {}

declare const enum GlobalConsts {
  TabIdNone = -1,
  VomnibarSecretTimeout = 3000,
}

declare const enum VKeyCodes {
  backspace = 8, tab = 9, enter = 13, shiftKey = 16, ctrlKey = 17, altKey = 18, esc = 27,
  maxNotPrintable = 32 - 1,
  space, pageup, left = 37, up, right, down, minNotInKeyNames, deleteKey = 46,
  maxNotNum = 48 - 1, N0, N1, N9 = 57, minNotNum = 58,
  maxNotAlphabet = 65 - 1, A, B, C, D, E, F, G, H, I, J, K, minNotAlphabet = 65 + 26, CASE_DELTA = 32,
  metaKey = 91, menuKey = 93, maxNotFn = 112 - 1, f1, f2, f12 = 123, minNotFn, ime = 229,
}
declare const enum KeyStat {
  Default = 0, plain = Default,
  altKey = 1, ctrlKey = 2, metaKey = 4, shiftKey = 8,
  PrimaryModifier = ctrlKey | metaKey,
}

declare const enum BrowserVer {
  MinSupported = 36,
  MinSession = 37,
  MinDisableMoveTabAcrossIncognito = 40,
  MinWithFrameId = 41,
  // just enabled by default
  Min$String$$StartsWith = 41,
  // even if chrome://flags/#disable-javascript-harmony-shipping
  MinEnsured$String$$StartsWith = 43,
  MinCreateWndWithState = 44,
  MinMutedInfo = 45,
  MinAutoDecodeJSUrl = 46,
  MinEnsuredBorderWidth = 48, // inc 0.0001px to the min "visible" width
  MinSafeWndPostMessageAcrossProcesses = 49,
  MinNoUnmatchedIncognito = 52,
  MinShadowDOMV1 = 53,
  MinUserSelectAll = 53,
  AssumesVer = 53,
  MinHighDPIOnRemoteDesktop = 54,
  MinExtIframesInSharedProcess = 56,
}
