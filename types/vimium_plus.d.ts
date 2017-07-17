
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

  interface BaseMarkProps {
    scroll: ScrollInfo;
    url: string;
  }

  interface Mark extends BaseMark, BaseMarkProps {
  }

  interface NewTopMark extends BaseMark {
    scroll?: undefined;
  }
  interface NewMark extends Mark {
    local?: boolean; /** default to false */
  }

  interface FgGlobalQuery extends BaseMark {
    prefix?: boolean; /** default to false */
    local?: false; /** default to false */
    url?: undefined;
  }
  interface FgLocalQuery extends BaseMark {
    prefix?: undefined;
    url: string;
    local: true;
    old?: any;
  }
  type FgQuery = FgGlobalQuery | FgLocalQuery;

  interface FgMark extends ScrollInfo {
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
  A = 65, s = 115, colon = 58,
}

interface ChildKeyMap {
  [index: string]: 0 | ChildKeyMap | undefined;
  readonly __proto__: never;
}
interface ReadonlyChildKeyMap {
  readonly [index: string]: 0 | ReadonlyChildKeyMap | undefined;
}
type KeyMap = ReadonlySafeDict<0 | 1 | ReadonlyChildKeyMap>;

declare const enum ReuseType {
  Default = 0,
  current = Default,
  reuse = 1,
  newFg = -1,
  newBg = -2
}

declare const enum FrameMaskType {
  NoMask = 0,
  minWillMask = NoMask + 1,
  OnlySelf = minWillMask,
  NormalNext = 2,
  ForcedSelf = 3,
}

declare const enum ProtocolType {
  others = 0,
  http = 7, https = 8,
}

declare namespace Frames {
  const enum Status {
    enabled = 0, partial = 1, disabled = 2,
    __fake = -1
  }
  const enum Flags {
    Default = 0, blank = Default,
    locked = 1,
    userActed = 2,
    lockedAndUserActed = locked | userActed,
  }
}

declare const enum PortType {
  initing = 1,
  hasFocus = 2,
  isTop = 4,
  omnibar = 8, omnibarRe = 9,
  /** the below should keep the consistent with Frames.Status, so that code in OnConnect works */
  knownStatusBase = 16, BitOffsetOfKnownStatus = 4,
  knownEnabled = knownStatusBase << 0, knownPartial = knownStatusBase << 1, knownDisabled = knownStatusBase << 2,
  isLocked = knownStatusBase << 3,
}

declare namespace SettingsNS {
  interface FrontUpdateAllowedSettings {
    showAdvancedCommands: boolean;
  }
  interface FrontendSettings {
    deepHints: boolean;
    keyboard: [number, number];
    linkHintCharacters: string;
    regexFindMode: boolean;
    scrollStepSize: number;
    smoothScroll: boolean;
  }
  interface FrontendSettingCache extends FrontendSettings {
    grabFocus: boolean;
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
  MaxImpossibleTabId = -2,
  WndIdNone = -1,
  VomnibarSecretTimeout = 3000,
  MaxNumberOfNextPatterns = 200,
}

declare const enum VKeyCodes {
  backspace = 8, tab = 9, enter = 13, shiftKey = 16, ctrlKey = 17, altKey = 18, esc = 27,
  maxNotPrintable = 32 - 1, space, pageup, pagedown, end, home, left, up, right, down, minNotInKeyNames,
  insert = 45, deleteKey,
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
  MinCSS$All$Attr = 37,
  MinDisableMoveTabAcrossIncognito = 40,
  MinWarningSyncXHR = 40,
  MinWithFrameId = 41,
  // just enabled by default
  Min$String$$StartsWith = 41,
  // even if chrome://flags/#disable-javascript-harmony-shipping
  MinEnsured$String$$StartsWith = 43,
  MinCreateWndWithState = 44,
  Min$Document$$ScrollingElement = 44,
  MinTreat$LetterColon$AsFilePath = 44,
  MinMutedInfo = 45,
  MinArrowFunction = 45,
  MinAutoDecodeJSURL = 46,
  Min$Event$$IsTrusted = 46,
  Min$Tabs$$Query$RejectHash = 47,
  MinEnsuredBorderWidth = 48, // inc 0.0001px to the min "visible" width
  // if #disable-javascript-harmony-shipping is on, then arror functions are accepted only since 48,
  // but this flag will break the Developer Tools (can not open the window) on Chrome 46/47/48,
  // so Chrome can only debug arror functions since 49
  MinEnsuredArrowFunction = 48,
  MinSafeWndPostMessageAcrossProcesses = 49,
  MinNo$Promise$$defer = 49,
  MinNoExtScriptsIfSandboxed = 49,
  MinNo$Object$$Observe = 50,
  MinShowBlockForBrokenImage = 51,
  MinIFrameReferrerpolicy = 51,
  MinPassiveEventListener = 51,
  MinNotPassMouseWheelToParentIframe = 51,
  Min$KeyboardEvent$$Key = 51,
  MinNoCustomMessageOnBeforeUnload = 51,
  MinNoUnmatchedIncognito = 52,
  MinCSSEnableContain = 52,
  MinScrollingHTMLHtmlElement = 53,
  MinShadowDOMV1 = 53,
  MinUserSelectAll = 53,
  assumedVer = 53,
  MinWarningWebkitUserSelect = 54,
  MinHighDPIOnRemoteDesktop = 54,
  MinNo$KeyboardEvent$$keyIdentifier = 54,
  MinStricterArgsIn$Windows$$Create = 55,
  Min$Event$$Path$IncludeNodesInShadowRoot = 55,
  MinSomeDocumentListenersArePassiveByDefault = 56,
  // With empty settings, Chrome only does this since not 56  but 57
  MinExtIframesInSharedProcess = 56, // means enabled by default
  MinNeedCSPForScriptsFromOtherExtensions = 56,
  MinStickyPosition = 56,
  MinFailToToggleImageOnFileURL = 56,
  MinNoKeygenElement = 57,
  MinCaseSensitiveUsemap = 58,
  Min1pxIsNotEps = 58,
  $Selection$NotShowStatusInTextBox = 58, // Now only version 81-110 of Chrome 58 stable have such a problem
  MinPasswordSaverDispatchesVirtualFocusEvents = 59,
  MinWarningWebkitGradient = 60,
  MinSelector$deep$DoesNothing = 60,
}
