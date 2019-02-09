
declare namespace CompletersNS {
  /**
   * only those >= .Default can be used in content
   */
  const enum MatchType {
    plain = 0,
    Default = plain,
    emptyResult = 1, // require query is not empty
    /** only matches one single engine */
    singleMatch = 2,
    /**
     * must >= singleMatch
     */
    searchWanted = 3,
    reset = -1,
    /**
     * is the same as searchWanted
     */
    searching_ = -2,
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
    label?: string;
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
  interface ScrollInfo extends Array<any> {
    [0]: number;
    [1]: number;
  }
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
    old?: {
      scrollX: number,
      scrollY: number,
      hash: string,
    };
  }
  type FgQuery = FgGlobalQuery | FgLocalQuery;

  interface FgMark extends ScrollInfo {
    [2]?: string;
  }

  interface FocusOrLaunch {
    scroll?: ScrollInfo;
    url: string;
    prefix?: boolean;
    reuse?: ReuseType;
  }
}

declare namespace VisualModeNS {
  const enum Mode {
    NotActive = 0, Default = NotActive,
    Visual = 1,
    Line = 2,
    Caret = 3,
  }
  const enum kDir {
    left = 0, right = 1, unknown = 2,
    __mask = -1,
  }
  /** 1 means right; 0 means left */
  type ForwardDir = kDir.left | kDir.right;
}
declare const enum KeyAction {
  cmd = 0, count = 1,
  __mask = -1,
}
type ValidChildKeyAction = KeyAction.cmd;
type ValidKeyAction = ValidChildKeyAction | KeyAction.count;
interface ChildKeyMap {
  [index: string]: ValidChildKeyAction | ChildKeyMap | undefined;
  readonly __proto__: never;
}
interface ReadonlyChildKeyMap {
  readonly [index: string]: ValidChildKeyAction | ReadonlyChildKeyMap | undefined;
}
type KeyMap = ReadonlySafeDict<ValidKeyAction | ReadonlyChildKeyMap>;

declare const enum ReuseType {
  current = 0,
  Default = current,
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
    hasCSS = 4,
    hasCSSAndActed = hasCSS | userActed,
    hadHelpDialog = 8,
    hadVisualMode = 16,
    hasFindCSS = 32,
  }
  const enum NextType {
    next = 0, Default = next,
    parent = 1,
    current = 2,
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
  CloseSelf = 999,
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
  }
  interface FrontendSettingCache extends FrontendSettings {
    browserVer: BrowserVer;
    browser: BrowserType;
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
  FOCUS,
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

interface VimiumInjector {
  id: string;
  alive: 0 | 0.5 | 1;
  version: string;
  getCommandCount: (this: void) => number;
  checkIfEnabled: (this: void) => void;
  reload (req?: Req.bg<kBgReq.reInject> | false): void;
  destroy: ((this: void, silent?: boolean) => void) | null;
}

declare var NO_DIALOG_UI: boolean | undefined, NDEBUG: boolean | undefined;

interface Document extends DocumentAttrsToBeDetected {}

declare const enum GlobalConsts {
  TabIdNone = -1,
  VomnibarFakeTabId = -3,
  MaxImpossibleTabId = -4,
  WndIdNone = -1,
  VomnibarSecretTimeout = 3000,
  // limited by Pagination.findAndFollowLink_
  MaxNumberOfNextPatterns = 200,
  MaxBufferLengthForPasting = 8192,
  TimeoutToReleaseBackendModules = /** (to make TS silent) 1000 * 60 */ 60000,
  ThresholdToAutoLimitTabOperation = 2, // 2 * Tab[].length
}

declare const enum KnownKey {
  tab = 9, space = 32, minNotSpace, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash, and = 38, quote1 = 39, minNotInKeyNames = 41, dot = 46, slash = 47,
  maxNotNum = 48 - 1, N0, N9 = N0 + 9, minNotNum, colon = 58, lt = 60, gt = 62, question = 63,
  A = 65, minAlphabet = A, B, C, I = A + 8, W = A + 22, minLastAlphabet = A + 25, minNotAlphabet,
  a = 97, CASE_DELTA = a - A, AlphaMask = 0xff & ~CASE_DELTA,
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
  metaKey = 91, menuKey = 93, maxNotFn = 112 - 1, f1, f2, f5 = f1 + 4,
  f10 = f1 + 9, f12 = f1 + 11, f20 = f1 + 19, minNotFn, ime = 229,
  questionWin = 191, questionMac = KnownKey.question,
}
declare const enum KeyStat {
  Default = 0, plain = Default,
  altKey = 1, ctrlKey = 2, metaKey = 4, shiftKey = 8,
  PrimaryModifier = ctrlKey | metaKey,
}

/** `OnOther` and `fg::reqH.init` requires .Chrome must be 0 */
declare const enum BrowserType {
  Chrome = 0,
  Firefox = 2,
  Edge = 4,
  Unknown = 8,
  _mask = 127,
}

/**
 * #define EXPERIMENTAL (#enable-experimental-web-platform-features \
 *    && #enable-javascript-harmony \
 *    && #enable-experimental-canvas-features \
 * )
 * #define LEAGCY (#disable-javascript-harmony-shipping)
 * #define EMPTY ((a clean User Data)
 * #define LATEST_TESTED 68.0.3440.75
 */
declare const enum BrowserVer {
  MinShadowDOMV0 = 35, // ensured
  MinSupported = MinShadowDOMV0,
  // there're WeakMap, WeakSet, Map, Set and Symbols on C35 if #enable-javascript-harmony
  MinES6WeakMap = 36,
  // but shadowRoot.getElementById still exists on C35
  Min$DocumentFragment$$getElementById = 36, // even if EXPERIMENTAL or LEAGCY
  MinSession = 37,
  // even if EXPERIMENTAL
  MinCSS$All$Attr = 37,
  /*
   * an `all:initial` prevents position/z-index attrs in other matched rules from working
   * this Chrome bug causes the help dialog may have `position: static;`
   * * the initial "position" attr and rendered view are correct
   * * but after a mousemove / wheel, the "position" attr becomes "static" and the view breaks
   * * it recovers if modifying its position/z-index attr
   * * if the Dev Tools is on, and visits styles of the box, then a mousemove won't break the UI
   * 
   * a work-around is set <div>.style.position
   */
  MinCSS$All$MayMistakenlyResetFixedPosition = 37,
  // includes for-of, Map, Set, Symbols
  MinES6ForAndSymbols = 38,
  MinWithFrameIdInArg = 39,
  MinOptionsUI = 40,
  MinDisableMoveTabAcrossIncognito = 40,
  // even if EXPERIMENTAL or LEAGCY
  MinWarningSyncXHR = 40,
  MinWithFrameId = 41,
  // just means it's enabled by default
  Min$String$$StartsWithAndIncludes = 41,
  MinGlobal$HTMLDetailsElement = 41,
  MinFixedCSS$All$MayMistakenlyResetFixedPosition = 41,
  // (if EXPERIMENTAL, then it exists but) has no effects before C41;
  // if EXPERIMENTAL, there's Element::scrollTo and Element::scrollBy only since C41
  MinCSS$ScrollBehavior$$Smooth$Work = 41,
  // MethodFunction is accepted since C42 if EMPTY
  MinMayBeMethodFunction = 41, // if EXPERIMENTAL
  // before 42, event.path is a simple NodeList instance
  Min$Event$$path$IsStdArrayAndIncludesWindow = 42,
  Min$Tabs$$getZoom = 42,
  Min$EnableSitePerProcess$Flag = 42,
  MinParentNodeInNodePrototype = 42, // even if even if EXPERIMENTAL or LEAGCY
  MinEnsured$String$$StartsWithAndRepeatAndIncludes = 43, // even if LEAGCY
  MinCreateWndWithState = 44,
  // the 2 below are correct even if EXPERIMENTAL or LEAGCY
  // #scroll-top-left-interop is also since C44
  // `scrollingElement` is added in (commit 8df26a52e71e5b239c3749ec6f4180441ee4fc7e)
  Min$Document$$ScrollingElement = 44,
  MinTreat$LetterColon$AsFilePath = 44,
  // even if EXPERIMENTAL or EMPTY
  MinMayBeArrowFunction = 45,
  // even if LEAGCY
  MinEnsureMethodFunction = 45, // e.g.: `a = { b() {} }`
  MinMuted = 45,
  MinMutedInfo = 46,
  // even if EXPERIMENTAL or LEAGCY
  MinAutoDecodeJSURL = 46,
  // even if EXPERIMENTAL or LEAGCY
  Min$Event$$IsTrusted = 46,
  // occur on Chrome 46 if EXPERIMENTAL; always enabled since C47 even if LEAGCY
  Min$requestIdleCallback = 46,
  Min$windows$APIsFilterOutDevToolsByDefault = 46,
  Min$Tabs$$Query$RejectHash = 47,
  // if .key exists, it's "v" for `v`, but "" (empty) for `<c-v>` - doesn't support all cases
  Min$KeyboardEvent$MayHas$$Key = 47, // if EXPERIMENTAL
  Min$IFrame$MayHas$$Referrerpolicy = 47, // if EXPERIMENTAL
  // even if EXPERIMENTAL or LEAGCY
  // before: real-width := Math.floor(width * zoom)
  // after: real-width := Math.floor(width * zoom) || (width ? 1 : 0)
  MinEnsuredBorderWidthWithoutDeviceInfo = 48, // inc 0.0001px to the min "visible" width
  // if LEAGCY, arrow functions will be accepted only since C48,
  // but this flag will break the Developer Tools (can not open the window) on Chrome 46/47/48,
  // so Chrome can only debug arrow functions since 49
  MinEnsuredArrowFunction = 48,
  // even if EXPERIMENTAL or LEAGCY
  MinSafeGlobal$frameElement = 48,
  // just means it's enabled even if LEAGCY;
  // if EXPERIMENTAL, .code is "" on Chrome 42/43, and works well since C44 
  MinEnsured$KeyboardEvent$$Code = 48,
  MinMayBeShadowDOMV1 = 48, // if EXPERIMENTAL
  // a path of an older DOMActivate event has all nodes (windows -> nodes in shadow DOM)
  // this feature is enabled by default on C53, 54, 55; and replaced by MinDOMActivateInClosedShadowRootHasNoShadowNodesInPathWhenOnDocument since C56
  MinMayNoDOMActivateInClosedShadowRootPassedToDocument = 48, // if EXPERIMENTAL
  // the 2 below are correct even if EXPERIMENTAL or LEAGCY
  MinSafeWndPostMessageAcrossProcesses = 49,
  MinNo$Promise$$defer = 49,
  /* content scripts are always injected (tested on Chrome from 35 to 66), and can always be listed by the Dev Tools */
  // even if EXPERIMENTAL or LEAGCY; length of an older addEventListener is 0
  Min$addEventListener$$length$Is2 = 49,
  // by default, `noreferrer` can also make `opener` null, and it still works on C35
  // a single `noopener` only works since C49 even if EXPERIMENTAL or LEAGCY
  MinLinkRelAcceptNoopener = 49,
  MinSVG$Path$MayHave$d$CSSAttribute = 49, // if #enable-experimental-web-platform-features is on
  // Object.observe is from C36 to C49 even if EXPERIMENTAL or LEAGCY
  MinNo$Object$$Observe = 50,
  // The real support for arg frameId of chrome.tabs.executeScript is since C50,
  //   and is neither 41 (an older version) nor 39 (cur ver on 2018-02-18)
  //   in https://developer.chrome.com/extensions/tabs#method-executeScript.
  // And, all "since C39" lines are totally wrong in the 2018-02-18 version of `tabs.executeScript`
  Min$tabs$$executeScript$hasFrameIdArg = 50,
  MinSVG$Path$Has$Use$Attribute = 50, // <path use="..." />
  // MinShowBlockForBrokenImage = 51, // not reproduced
  // the 2 below just mean they're enabled even if LEAGCY
  MinIFrameReferrerpolicy = 51,
  MinEnsured$KeyboardEvent$$Key = 51,
  // the 3 below are correct even if EXPERIMENTAL or LEAGCY
  MinPassiveEventListener = 51,
  // before C51, if an iframe has no scrollable boxes, its parent frame scrolls and gets events
  // since C51, its parent still scrolls but gets no wheel events
  MinNotPassMouseWheelToParentFrameEvenIfSelfNotScrolled = 51,
  MinNoCustomMessageOnBeforeUnload = 51,
  MinShadowDOMV1HasMode = 51,
  // Chrome also began to put contain attr in use on 51 if EXPERIMENTAL
  // but obviously there's some bugs about this feature
  CSS$Contain$BreaksHelpDialogSize = 51,
  // the 2 below are correct even if EXPERIMENTAL or LEAGCY
  MinNoUnmatchedIncognito = 52,
  // since https://github.com/chromium/chromium/commit/866d1237c72059624def2242e218a7dfe78b125e
  MinEventListenersFromExtensionOnSandboxedPage = 52,
  // the 3 below are correct even if LEAGCY
  MinCSSEnableContain = 52,
  MinSVG$Path$Has$d$CSSAttribute = 52, // svg path { d: path('...'); }
  MinForcedDirectWriteOnWindows = 52,
  MinPositionMayBeSticky = 52, // if EXPERIMENTAL; enabled by default since C56 even if LEAGCY
  MinAutoScrollerAllocNewSpace = 53, // even if EXPERIMENTAL or LEAGCY; if box-sizing is content-box
  MinEnsuredShadowDOMV1 = 53,
  // wekitUserSelect still works on C35
  MinUserSelectAll = 53,
  // even if EXPERIMENTAL or LEAGCY
  MinUntrustedEventsDoNothing = 53, // fake click events won't show a <select>'s popup
  // before Chrome 53, there may be window.VisualViewPort under flags, but not the instance
  Min$visualViewPort$UnderFlags = 53, // window.visualViewPort occurs if EXPERIMENTAL
  // only if #enable-site-per-process or #enable-top-document-isolation
  // the wrong innerWidth := realWidth * devicePixelRatio
  // the devicePixelRatio means that of Windows, but not Chrome's zoom level
  // even when [Windows]=1.5, [zoom]=0.667, the width is still wrong
  ExtIframeIn3rdProcessHasWrong$innerWidth$If$devicePixelRatio$isNot1 = 53,
  // only Chrome accepts it: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/extension/getViews
  Min$Extension$$GetView$AcceptsTabId = 54,
  // the 5 below are correct even if EXPERIMENTAL or LEAGCY
  MinUnprefixedUserSelect = 54,
  MinHighDPIOnRemoteDesktop = 54,
  MinNo$KeyboardEvent$$keyIdentifier = 54,
  // https://chromium.googlesource.com/chromium/src/+/9520623861da283533e71d6b7a8babd02675cb0b
  Min$Node$$getRootNode = 54,
  MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM = 55,
  // MinStricterArgsIn$Windows$$Create = 55, // I forget what's stricter
  MinSomeDocumentListenersArePassiveByDefault = 56,
  // not need if LEAGCY or EMPTY (even on Chrome 66)
  MinMayNeedCSPForScriptsFromOtherExtensions = 56, // if EXPERIMENTAL
  // the 3 below are correct even if EXPERIMENTAL or LEAGCY
  MinDOMActivateInClosedShadowRootHasNoShadowNodesInPathWhenOnDocument = 56,
  MinFailToToggleImageOnFileURL = 56,
  Min$KeyboardEvent$$isComposing = 56,
  MinSelector$GtGtGt$IfFlag$ExperimentalWebPlatformFeatures$Enabled = 56,
  // the static selector `>>>` is not supported on Chrome LATEST_TESTED if not EXPERIMENTAL
  MinMayBeStaticSelectorGtGtGt = 56, // if EXPERIMENTAL
  // the 2 below are correct even if EXPERIMENTAL or LEAGCY
  MinNoKeygenElement = 57,
  MinCSSPlaceholderPseudo = 57,
  MinEnsuredCSSGrid = 57, // even if LEAGCY; still partly works on C35 if EXPERIMENTAL
  /*
   * Chrome before 58 does this if #enable-site-per-process or #enable-top-document-isolation;
   * Chrome 56 / 57 always merge extension iframes if EXPERIMENTAL
   * Chrome since 58 always merge extension iframes even if the two flags are disabled and LEAGCY
   * 
   * Special cases:
   * Chrome 55 does this by default (unless turn one of the flags on and then off);
   * if #enable-top-document-isolation, Chrome since 56 merge them,
   *   while Chrome before 56 move extension iframes into different processes (not shared one)
   *     if not #enable-site-per-process;
   * since C56, if one flag is turned on and then off,
   *   it will still take effects on extension iframes, so extension iframes are always merged,
   *   while Chrome before 56 can turn off them totally
   */
  MinExtIframesAlwaysInSharedProcess = 58,
  MinExtensionContentPageAlwaysCanShowFavIcon = MinExtIframesAlwaysInSharedProcess,
  // the 4 below are correct even if EXPERIMENTAL or LEAGCY
  MinCaseSensitiveUsemap = 58,
  // tmp_width := (since 58 ? Math.round : Math.floor)(width * devicePixelRatio * zoom)
  // real_width := width && Math.max(tmp_width, 1)
  MinBorderWidthIsRounded = 58,
  // according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange,
  // `<input type=number>.selectionStart` throws on Chrome 33,
  // but ChromeStatus says it has changed the behavior to match the new spec on C58
  Min$selectionStart$MayBeNull = 58,
  // .type is always 'Caret'
  $Selection$NotShowStatusInTextBox = 58, // Now only version 81-110 of Chrome 58 stable have such a problem
  // PasswordSaverDispatchesVirtualFocusEvents (document.activeElement is not updated) is confirmed on Chrome LATEST_TESTED
  // See `WebFormControlElement::SetAutofillValue` on
  // https://chromium.googlesource.com/chromium/src.git/+/master/third_party/blink/renderer/core/exported/web_form_control_element.cc#130
  MinPasswordSaverDispatchesVirtualFocusEvents = 59,
  MinWarningWebkitGradient = 60, // only happened on a Canary version
  MinOmniboxUIMaxAutocompleteMatchesMayBe12 = 60, // #omnibox-ui-max-autocomplete-matches
  // the 6 below are correct even if EXPERIMENTAL or LEAGCY
  MinNoBorderForBrokenImage = 60,
  MinTabsCreateRefuseOpenerTabIdIfNotOnCurrentWindow = 61,
  MinRoundedBorderWidthIsNotEnsured = 61, // a border is only showing if `width * ratio * zoom >= 0.5`
  // DevicePixelRatioImplyZoomOfDocEl is confirmed on Chrome LATEST_TESTED
  MinDevicePixelRatioImplyZoomOfDocEl = 61,
  MinCorrectBoxWidthForOptionUI = 61,
  Min$visualViewPort$ = 61,
  MinEnsuredCSS$ScrollBehavior = 61, // still exists on C35 (although has no effects before C41) if EXPERIMENTAL
  // e.g. https://www.google.com.hk/_/chrome/newtab?espv=2&ie=UTF-8
  MinNotRunOnChromeNewTab = 61,
    // according to https://github.com/w3ctag/design-reviews/issues/51#issuecomment-96759374 ,
    // `scrollingElement` can be <frameset> on C44
    // which has been fixed commit 0cf160e2ff055fb12c562cabc2da9e62db14cc8d (if #scroll-top-left-interop is enabled),
    // and it's always fixed since C61
  MinEnsured$ScrollingElement$CannotBeFrameset = 61,
  Min$NotSecure$LabelsForSomeHttpPages = 62, // https://developers.google.com/web/updates/2017/10/nic62#https
  // the 6 below are correct even if EXPERIMENTAL or LEAGCY
  // since C63, Vimium's inner styles have been really safe; `/deep/` works on C35 even if LEAGCY
  // static `/deep/` selector in query is still supported on Chrome LATEST_TESTED
  MinSelector$deep$InCSSMeansNothing = 63,
  MinCSS$OverscrollBehavior = 63,
  MinOmniboxSupportDeletable = 63,
  Min$addEventListener$IsInStrictMode = 64, // otherwise addEventListener has null .caller and null .arguments
  MinCSS$textDecorationSkipInk = 64,
  MinNoMultipleShadowRootsOfV0 = 64,
  MinEnsuredUnicodePropertyEscapesInRegExp = 64, // https://www.chromestatus.com/features/6706900393525248
  // a 3rd-party Vomnibar will trigger "navigation" and clear all logs in console on Chrome 64
  // this still occurs on Chrome 65.0.3325.181 (Stable, x64, Windows 10)
  VomnibarMayClearLog1 = 64,
  VomnibarMayClearLog2 = 65,
  // if #enable-md-extensions, it's there since C60
  MinEnsuredChromeURL$ExtensionShortcuts = 65,
  MinSmartSpellCheck = 65,
  // the 2 below are correct even if EXPERIMENTAL or LEAGCY
  MinCanNotRevokeObjectURLAtOnce = 65,
  MinExtraScrollbarWidthIfScrollStyleIsOverlay = 65,
  MinEnsuredDisplayContents = 65,
  MinInputMode = 66, // even if LEAGCY; still works on C35 if EXPERIMENTAL
  // @see MinEscapeHashInBodyOfDataURL
  // https://github.com/chromium/chromium/commit/511efa694bdf9fbed3dc83e3fa4cda12909ce2b6
  MinWarningOfEscapingHashInBodyOfDataURL = 66,
  // even if EXPERIMENTAL or LEAGCY
  // but not on pages whose JS is disabled in chrome://settings/content/siteDetails?site=<origin>
  // issue: https://bugs.chromium.org/p/chromium/issues/detail?id=811528
  // the commit is firstly applied to C68:
  // https://github.com/chromium/chromium/commit/5a5267ab58dd0310fc2b427db30de60c0eea4457
  MinNewScriptsFromExtensionOnSandboxedPage = 68, // extension can insert and run <script> correctly
  // even if EXPERIMENTAL or LEAGCY
  // also on pages with JS disabled in chrome://settings/content/siteDetails?site=<origin>
  NoRAForRICOnSandboxedPage = 69,
  MinTabIdMayBeMuchLarger = 69,
  // `>>>` only works if EXPERIMENTAL before C69 and since C56
  // (MinSelector$GtGtGt$IfFlag$ExperimentalWebPlatformFeatures$Enabled)
  // https://github.com/chromium/chromium/commit/c81707c532183d4e6b878041964e85b0441b9f50
  MinNoSelector$GtGtGt = 69,
  // https://github.com/chromium/chromium/commit/6a866d29f4314b990981119285da46540a50742c
  MinNamedGetterOnFramesetNotOverrideBulitin = 70,
  // Note (tested on C70 stable / C73 dev): :host{display:contents} solves it
  MinDisplayFlexOnHtmlBreakUIBoxWhoseContainStyleHasLayout = 70, // even if EXPERIMENTAL
  Min$Tabs$$Update$DoesNotAcceptJavascriptURLs = 71,
  MinTabIdBeSmallAgain = 71,
  // https://www.chromestatus.com/features/5656049583390720
  // deprecation is since C66
  MinEscapeHashInBodyOfDataURL = 72,
  // https://www.chromestatus.com/features/6569666117894144
  // https://bugs.chromium.org/p/chromium/issues/detail?id=179006#c45
  MinSpecCompliantShadowBlurRadius = 73,
  assumedVer = 999,
}
