
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
    singleLine?: boolean;
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
    InheritedFlags = locked | userActed,
    hasCSS = 4, onceHasDialog = 8,
  }
}

declare const enum PortType {
  initing = 1,
  hasFocus = 2,
  isTop = 4,
  omnibar = 8, omnibarRe = 9,
  /** the below should keep the consistent with Frames.Status, so that code in OnConnect works */
  BitOffsetOfKnownStatus = 4, MaskOfKnownStatus = 3,
  knownStatusBase = 1 << BitOffsetOfKnownStatus, flagsBase = knownStatusBase << 2,
  knownEnabled = knownStatusBase + (0 << BitOffsetOfKnownStatus),
  knownPartial = knownStatusBase + (1 << BitOffsetOfKnownStatus),
  knownDisabled = knownStatusBase + (2 << BitOffsetOfKnownStatus),
  hasCSS = flagsBase, isLocked = flagsBase * 2,
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
    browserVer: number;
    onMac: boolean;
  }
}

declare const enum HintMode {
  empty = 0, focused = 1, newTab = 2, queue = 64,
  mask_focus_new = focused | newTab, mask_queue_focus_new = mask_focus_new | queue,
  min_job = 128, min_link_job = 136, min_disable_queue = 256,
  DEFAULT = empty,
  OPEN_IN_CURRENT_TAB = DEFAULT, // also 1
  OPEN_IN_NEW_BG_TAB = newTab,
  OPEN_IN_NEW_FG_TAB = newTab | focused,
  OPEN_CURRENT_WITH_QUEUE = queue,
  OPEN_WITH_QUEUE = queue | newTab,
  OPEN_FG_WITH_QUEUE = queue | newTab | focused,
  HOVER = min_job,
  LEAVE,
  COPY_TEXT,
  SEARCH_TEXT,
  DOWNLOAD_IMAGE,
  OPEN_IMAGE,
  DOWNLOAD_LINK = min_link_job,
  COPY_LINK_URL,
  OPEN_INCOGNITO_LINK,
  EDIT_LINK_URL = min_disable_queue,
    max_link_job = EDIT_LINK_URL,
    min_edit = EDIT_LINK_URL,
  EDIT_TEXT,
    max_edit = EDIT_TEXT,
  FOCUS_EDITABLE,
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
  TimeoutToReleaseBackendModules = 1000 * 60,
}

declare const enum KnownKey {
  tab = 9, space = 32, minNotSpace, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash, and = 38, quote1 = 39, minNotInKeyNames = 41, slash = 47,
  maxNotNum = 48 - 1, N0, N9 = N0 + 9, minNotNum, colon = 58, lt = 60, gt = 62,
  A = 65, minAlphabet = A, minNotAlphabet = A + 26, a = 97, CASE_DELTA = a - A,
  backslash = 92, s = 115,
}

declare const enum VKeyCodes {
  None = 0,
  backspace = 8, tab = 9, enter = 13, shiftKey = 16, ctrlKey = 17, altKey = 18, esc = 27,
  maxNotPrintable = 32 - 1, space, maxNotPageUp = space, pageup, minNotSpace = pageup,
  pagedown, maxNotEnd = pagedown, end, home, maxNotLeft = home, left, up,
  right, minNotUp = right, down, minNotDown, minNotInKeyNames = minNotDown,
  maxNotInsert = 45 - 1, insert, deleteKey, minNotDelete,
  maxNotNum = 48 - 1, N0, N9 = N0 + 9, minNotNum,
  maxNotAlphabet = 65 - 1, A, B, C, D, E, F, G, H, I, J, K,
  metaKey = 91, menuKey = 93, maxNotFn = 112 - 1, f1, f2,
  f10 = f1 + 9, f12 = f1 + 11, minNotFn, ime = 229,
}
declare const enum KeyStat {
  Default = 0, plain = Default,
  altKey = 1, ctrlKey = 2, metaKey = 4, shiftKey = 8,
  PrimaryModifier = ctrlKey | metaKey,
}

declare const enum BrowserVer {
  MinShadowDOMV0 = 35,
  MinSupported = MinShadowDOMV0,
  MinES6WeakMap = 36,
  MinSession = 37,
  MinCSS$All$Attr = 37,
  // includes for-of, Map, Set, Symbols
  MinES6ForAndSymbols = 38,
  MinWithFrameIdInArg = 39,
  MinDisableMoveTabAcrossIncognito = 40,
  MinWarningSyncXHR = 40,
  MinWithFrameId = 41,
  // just enabled by default
  Min$String$$StartsWith = 41,
  // before 42, event.path is a simple NodeList instance
  Min$Event$$path$IsStdArrayAndIncludesWindow = 42,
  Min$Tabs$$getZoom = 42,
  // even if chrome://flags/#disable-javascript-harmony-shipping
  MinEnsured$String$$StartsWith = 43,
  MinCreateWndWithState = 44,
  Min$Document$$ScrollingElement = 44,
  MinTreat$LetterColon$AsFilePath = 44,
  MinArrowFunction = 45,
  MinMuted = 45,
  MinMutedInfo = 46,
  MinAutoDecodeJSURL = 46,
  Min$Event$$IsTrusted = 46,
  Min$Tabs$$Query$RejectHash = 47,
  MinEnsuredBorderWidth = 48, // inc 0.0001px to the min "visible" width
  // if #disable-javascript-harmony-shipping is on, then arrow functions are accepted only since 48,
  // but this flag will break the Developer Tools (can not open the window) on Chrome 46/47/48,
  // so Chrome can only debug arrow functions since 49
  MinEnsuredArrowFunction = 48,
  MinSafeWndPostMessageAcrossProcesses = 49,
  MinNo$Promise$$defer = 49,
  MinNoExtScriptsIfSandboxed = 49,
  MinNo$Object$$Observe = 50,
  Min$tabs$$executeScript$hasFrameIdArg = 50,
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
  // this feature is from 53, and replaced by DOMActivateInClosedShadowRootHasNoShadowNodesInPathWhenOnDocument since 56
  MinNoDOMActivateInClosedShadowRootPassedToDocument = 53,
  assumedVer = 53,
  MinWarningWebkitUserSelect = 54,
  MinHighDPIOnRemoteDesktop = 54,
  MinNo$KeyboardEvent$$keyIdentifier = 54,
  MinStricterArgsIn$Windows$$Create = 55,
  Min$Event$$Path$IncludeNodesInShadowRoot = 55,
  MinSomeDocumentListenersArePassiveByDefault = 56,
  MinDOMActivateInClosedShadowRootHasNoShadowNodesInPathWhenOnDocument = 56,
  // With empty settings, Chrome only does this since not 56 but 57
  MinExtIframesInSharedProcess = 56, // means enabled by default
  MinNeedCSPForScriptsFromOtherExtensions = 56,
  MinStickyPosition = 56,
  MinFailToToggleImageOnFileURL = 56,
  MinExtensionContentPageMayShowFavIcon = 56,
  Min$KeyboardEvent$$isComposing = 56,
  Min$GtGtGt$IfExperimentalWebPlatformFeatures = 56,
  MinNoKeygenElement = 57,
  MinCaseSensitiveUsemap = 58,
  Min1pxIsNotEps = 58,
  $Selection$NotShowStatusInTextBox = 58, // Now only version 81-110 of Chrome 58 stable have such a problem
  MinPasswordSaverDispatchesVirtualFocusEvents = 59,
  MinWarningWebkitGradient = 60, // only happened on a Canary version
  MinNoBorderForBrokenImage = 60,
  MinRoundedBorderWidth = 61, // a border is only showing if `width * zoomed-ratio >= 0.5`
  MinDevicePixelRatioImplyZoomOfDocEl = 61,
  // e.g. https://www.google.com.hk/_/chrome/newtab?espv=2&ie=UTF-8
  MinNotRunOnChromeNewTab = 61,
  // since MinSelector$deepInCSS$DoesNothing, Vimium's inner styles have been really safe
  MinSelector$deepInCSS$DoesNothing = 63,
}
