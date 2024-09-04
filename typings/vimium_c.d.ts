
declare namespace CompletersNS {
  const enum SugType {
    Empty = 0,
    kBookmark = 1,
    kHistory = 2,
    tab = 4,
    search = 8,
    domain = 16,
    Full = 0x3f,
    /** bookmark | history | tab */ MultipleCandidates = 7,
  }
  const enum QComponent { NONE = 0, mode = 1, query = 2, offset = 4, queryOrOffset = query | offset }
  /**
   * only those >= .Default can be used in content
   */
  const enum MatchType {
    plain = 0,
    Default = plain,
    emptyResult = 1, // require query is not empty
    someMatches = 2,
    /**
     * must > someMatches
     */
    searchWanted = 3,
    reset = -1,
    /**
     * is the same as searchWanted
     */
    searching_ = -2,
    SugTypeOffset = 3,
    MatchTypeMask = (1 << SugTypeOffset) - 1,
  }
  type ValidTypes = "bookm" | "domain" | "history" | "search" | "tab"
  /**
   * "math" can not be the first suggestion, which is limited by omnibox handlers
   */
  type ValidSugTypes = ValidTypes | "math";
  const enum QueryFlags {
    None = 0,
    AddressBar = 1,
    TabInCurrentWindow = 2,
    PreferNewOpened = 4,
    TabTree = 8,
    MonospaceURL = 16,
    ShowTime = 32,
    PreferBookmarks = 64,
    TabTreeFromStart = 128,
    NoTabEngine = 256,
    EvenHiddenTabs = 512,
    NoSessions = 1024,
    IncognitoTabs = 2048,
  }
  interface Options {
    /** maxChars */ c?: number;
    /** allowedEngines */ e?: SugType;
    /** maxResults */ r?: number;
    /** flags */ f: QueryFlags;
    /** last sug types: empty means all */ t: SugType;
    /** original type */ o: ValidTypes | "omni" | "bomni"
  }

  interface WritableCoreSuggestion {
    /** enumType */ e: ValidSugTypes;
    /** url */ u: string;
    title: string; // used by vomnibar.html
    /** text */ t: string;
    visit: number
  }

  type CoreSuggestion = Readonly<WritableCoreSuggestion>;

  type SessionId = [windowId: number, sessionId: string, wndTabs: number] | /** tabId */ number
  interface BaseSuggestion extends CoreSuggestion {
    t: string;
    textSplit?: string;
    title: string;
    visit: number
    /** sessionId */ s?: SessionId
    label?: string;
    /** source page of favIcon */ v?: string;
    favIcon?: string;
  }
  interface Suggestion extends BaseSuggestion {
    /** relevancy */ r: number;
  }
  interface SearchSuggestion extends Suggestion {
    e: "search";
    /** pattern */ p: string;
    /** not-a-search */ n?: 1;
  }
  interface TabSuggestion extends Suggestion {
    level?: string;
  }
}

declare namespace MarksNS {
  type ScrollInfo = readonly [ x: number, y: number, hash?: string, ...exArgs: unknown[] ]
  interface ScrollableMark {
    scroll: ScrollInfo;
  }
  interface FgQuery {
    /** markName */ n: string;
    /** local */ l: boolean
    /** url */ u: string
    /** other info */ s: string | null | 0 | ScrollInfo
  }
  interface FgCreateQuery extends FgQuery { /** scroll */ s: ScrollInfo }
  interface FgGotoQuery extends FgQuery { /** old mark */ s: string | null | 0 }
  interface FocusOrLaunch {
    /** scroll */ s?: ScrollInfo;
    /** url */ u: string;
    /** prefix */ p?: boolean | null
    /** parent */ a?: boolean | null
    /** match a tab to replace */ q?: SimpleParsedOpenUrlOptions
    /** wait a while on a new tab */ w?: number | boolean | null
    /** fallback */ f?: Req.FallbackOptions | null
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
  type ForwardDir = kDir.left | kDir.right;
  interface KeyMap extends Dict<VisualAction> {
  }
  interface SafeKeyMap extends KeyMap, SafeObject {}
  const enum kVimG {
      vimWord = 2,
      _mask = -1,
  }
}
declare const enum VisualAction {
  MinNotNoop = 0, Noop = MinNotNoop - 1, NextKey = -2,

  MinWrapSelectionModify = MinNotNoop,
  char = VisualModeNS.kG.character << 1,
  word = VisualModeNS.kG.word << 1, vimWord = VisualModeNS.kVimG.vimWord << 1,
  lineBoundary = VisualModeNS.kG.lineBoundary << 1, line = VisualModeNS.kG.line << 1,
  sentence = VisualModeNS.kG.sentence << 1, paragraph = VisualModeNS.kG.paragraph << 1,
  documentBoundary = VisualModeNS.kG.documentBoundary << 1,
  dec = VisualModeNS.kDir.left, inc = VisualModeNS.kDir.right,

  MinNotWrapSelectionModify = 20,
  Reverse = MinNotWrapSelectionModify,

  MaxNotLexical = MinNotWrapSelectionModify,
  LexicalWord = MaxNotLexical + VisualModeNS.kG.word,
  LexicalSentence = MaxNotLexical + VisualModeNS.kG.sentence,
  LexicalParagraph = MaxNotLexical + VisualModeNS.kG.paragraphboundary,

  MaxNotYank = 30, Yank, YankLine, YankWithoutExit, YankAndOpen, YankAndNewTab, YankRichText,

  MaxNotFind = 45, PerformFind, FindPrevious = PerformFind | dec, FindNext = PerformFind | inc, HighlightRange,

  MaxNotNewMode = 50,
  VisualMode = MaxNotNewMode + VisualModeNS.Mode.Visual, VisualLineMode = MaxNotNewMode + VisualModeNS.Mode.Line,
  CaretMode = MaxNotNewMode + VisualModeNS.Mode.Caret,
  EmbeddedFindMode = (CaretMode + 2) & ~1, EmbeddedFindAndExtendSelection,
  EmbeddedFindModeToPrev, EmbeddedFindToPrevAndExtendSelection,

  MaxNotScroll = 60, ScrollUp, ScrollDown,
}

declare const enum KeyAction {
  INVALID = 0, cmd = 1, count = 2,
  __mask = -1,
}
type ValidChildKeyAction = KeyAction.cmd;
type ValidKeyAction = ValidChildKeyAction | KeyAction.count;
interface ChildKeyFSM {
  [index: string]: ValidChildKeyAction | ChildKeyFSM | undefined;
}
interface ReadonlyChildKeyFSM {
  readonly [index: string]: ValidChildKeyAction | ReadonlyChildKeyFSM | undefined;
}
type KeyFSM = { readonly [key: string]: ValidKeyAction | ReadonlyChildKeyFSM }

declare const enum kMapKey {
  NONE = 0, normalMode = 1, insertMode = 2, otherMode = 4, plain = 8, char = 16,
  plain_in_insert = 32, directInsert = 64,
}
declare const enum kMappingsFlag {
  char0 = "#", char1 = "!",
  noCheck = "no-check",
}

declare const enum kMatchUrl { RegExp = 1, StringPrefix = 2, Pattern = 3 }
interface BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl
  /** value */ readonly v: unknown
}
interface RegExpUrlMatcher extends BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl.RegExp
  /** value */ readonly v: RegExpOne
}
interface PrefixUrlMatcher extends BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl.StringPrefix
  /** value */ readonly v: string
}
interface PatternUrlMatcher extends BaseUrlMatcher {
  /** type */ readonly t: kMatchUrl.Pattern
  /** value */ readonly v: { p: URLPattern, s: string }
}
type ValidUrlMatchers = RegExpUrlMatcher | PrefixUrlMatcher | PatternUrlMatcher

type TextElement = HTMLInputElement | HTMLTextAreaElement;

declare const enum ReuseType {
  current = 0,
  reuse = 1,
  newWnd = 2,
  /** @deprecated */ newWindow = newWnd,
  frame = 3,
  newFg = -1,
  newTab = -1,
  newBg = -2,
  reuseInCurWnd = -3,
  OFFSET_LAST_WINDOW = -4,
  lastWndFg = -5,
  /** @deprecated */ lastWnd = lastWndFg,
  lastWndBg = -6,
  ifLastWnd = -7,
  lastWndBgInactive = -8,
  /** @deprecated */ lastWndBgBg = lastWndBgInactive,
  Default = newFg,
  MAX = 3, MIN = -8,
}
type ValidReuseNames = Exclude<keyof typeof ReuseType, "MAX" | "MIN" | "OFFSET_LAST_WINDOW" | "Default">
declare type UserReuseType = ReuseType | boolean | ValidReuseNames
    | "newwindow" | "new-window" | "newwnd" | "new-wnd" | "newfg" | "new-fg" | "newbg" | "new-bg" | "new-tab" | "newtab"
    | "lastwndfg" | "lastwnd" | "last-wnd-fg" | "last-wnd" | "lastwndbg" | "last-wnd-bg" | "if-last-wnd" | "iflastwnd"
    | "last-wnd-bgbg" | "lastwndbgbg" | "last-wnd-bg-inactive" | "lastwndbginactive"
    | "reuse-in-cur-wnd" | "reuseincurwnd"

declare const enum FrameMaskType {
  NoMaskAndNoFocus = 0, onOmniHide = 1, NoMask = 2,
  OnlySelf = 3, NormalNext = 4, ForcedSelf = 5,
  minWillMask = OnlySelf
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
  // upper-case items are for tabs
  const enum Flags {
    Default = 0, blank = Default, locked = 1, lockedAndDisabled = 3, MASK_LOCK_STATUS = 3, userActed = 4,
    hasCSS = 8, hadVisualMode = 16, hasFindCSS = 32, aboutIframe = 64,
    otherExtension = 128, isVomnibar = 256, ResReleased = 512, OldEnough = 1024, SOURCE_WARNED = 2048,
    UrlUpdated = 0x1000, SettingsUpdated = 0x2000, CssUpdated = 0x4000, KeyMappingsUpdated = 0x8000,
    KeyFSMUpdated = 0x10000, MASK_UPDATES = 0x1f000, HadIFrames = 0x20000, hadHelpDialog = 0x40000,
    Refreshing = 0x80000,
  }
  const enum NextType {
    next = 0, Default = next, parent = 1, current = 2,
  }
  interface BaseVApi {
    /** refreshPort */ q (req: 0 | object, updates?: number): void
  }
}

declare const enum PortNameEnum {
  Prefix = "vimium-c.",
  PrefixLen = 9,
  Delimiter = "@",
}

declare const enum PortType {
  initing = 0, isTop = 1, hasFocus = 2, confInherited = 4, reconnect = 8, hasCSS = 16,
  onceFreezed = 32, aboutIframe = 64, selfPages = 128, omnibar = 256, refreshInBatch = 512,
  otherExtension = 1024, Tee = 2048, Offscreen = 4096, OFFSET_SETTINGS = /** log2(8192) */ 13,
  /** for external extensions like NewTab Adapter */ CloseSelf = 999,
}

declare const enum kKeyLayout {
  NONE = 0, alwaysIgnore = 1, ignoreIfNotASCII = 2, inCmdIgnoreIfNotASCII = 4, ignoreIfAlt = 8,
  ignoreCaps = 16, inPrivResistFp_ff = 32, mapLeftModifiers = 64, mapRightModifiers = 128,
  FgMask = 255, fromOld = 256, ignoreCapsOnMac = 512,
  MapModifierStart = mapLeftModifiers, MapModifierOffset = 6, MapModifierMask = mapLeftModifiers | mapRightModifiers,
  DefaultFromOld = inCmdIgnoreIfNotASCII | fromOld, Default = DefaultFromOld, IfFirstlyInstalled = ignoreIfNotASCII,
}
declare namespace SettingsNS {
  interface DirectlySyncedItems {
    /** hideHud */ h: ["hideHud", boolean]
    /** ignoreReadonly */ y: ["ignoreReadonly", string]
    /** keyLayout */ l: ["keyLayout", kKeyLayout]
    /** keyboard */ k: ["keyboard", [delay: number, interval: number, /** on Firefox */ screenRefreshRate?: number]]
    /** linkHintCharacters */ c: ["linkHintCharacters", string];
    /** linkHintNumbers */ n: ["linkHintNumbers", string];
    /** filterLinkHints */ f: ["filterLinkHints", boolean];
    /** waitForEnter */ w: ["waitForEnter", boolean];
    /** mouseReachable */ e: ["mouseReachable", boolean];
    /** passEsc */ p: ["passEsc", string];
    /** regexFindMode */ r: ["regexFindMode", boolean];
    /** scrollStepSize */ t: ["scrollStepSize", number];
    /** smoothScroll */ s: ["smoothScroll", boolean];
    /** acceptable upper limit of spent time before keyup */ u: ["keyupTime", number];
  }
  interface ManuallySyncedItems {
    /** darkMode */ d: ["darkMode", " D" | ""];
    /** reduceMotion */ m: ["reduceMotion", boolean];
  }
  interface OneTimeItems {
    /** grabBackFocus */ g: ["grabBackFocus", BaseBackendSettings["grabBackFocus"]];
  }
  interface ConstItems {
    /** browser */ b: ["browser", BrowserType | undefined];
    /** browserVer */ v: ["browserVer", BrowserVer | FirefoxBrowserVer | 0]
    /** browserSecondVersionCode */ V: ["browserVer2nd", number];
    /** OS */ o: ["OS", kOS.mac | kOS.linuxLike | kOS.win]
  }
  type DeclaredConstValues = Readonly<SelectValueType<Pick<ConstItems, "v">>>;
  interface AllConstValues extends Readonly<SelectValueType<ConstItems>> {}
  interface VomnibarOptionItems {
    /** maxMatchNumber */ n: ["maxMatches", number];
    /** queryInterval */ i: ["queryInterval", number];
    /** comma-joined size numbers */ s: ["sizes", string];
    /** styles */ t: ["styles", string]
  }
  interface VomnibarBackendItems extends SelectNVType<Omit<VomnibarOptionItems, "t">> {
    actions: string;
    styles: string | string[]
  }
  interface OtherVomnibarItems {
    /** css */ c: ["omniCSS", string];
    /** mappedKeys */ m: ["mappedKeys", SafeDict<string> | null];
  }

  interface BaseBackendSettings {
    /** `2`: auto (following browser); `1`: fixed true */ autoDarkMode: 0 | 1 | 2
    /** `2`: auto (following browser); `1`: fixed true */ autoReduceMotion: 0 | 1 | 2
    grabBackFocus: boolean;
    showAdvancedCommands: boolean;
    vomnibarOptions: VomnibarBackendItems;
  }
  interface FrontUpdateAllowedSettings {
    showAdvancedCommands: 0;
  }

  interface AutoSyncedItems extends DirectlySyncedItems {}
  interface FrontendSettingsSyncingItems extends AutoSyncedItems, ManuallySyncedItems {}
  type FrontendComplexSyncingItems = Pick<FrontendSettingsSyncingItems, "c" | "n" | "l" | "d" | "p" | "y">
  interface DeclaredFrontendValues extends SelectValueType<ManuallySyncedItems & OneTimeItems>, DeclaredConstValues {
  }
  type AutoSyncedNameMap = SelectNameToKey<AutoSyncedItems>
  type FrontendSettings = SelectNVType<DirectlySyncedItems>;

  /** Note: should have NO names which may be uglified */
  interface FrontendSettingCache extends AllConstValues
      , SelectValueType<FrontendSettingsSyncingItems & OneTimeItems> {
  }

  /** Note: should have NO names which may be uglified */
  interface DirectVomnibarItems extends Pick<DirectlySyncedItems, "l"> {}
  interface AllVomnibarItems extends VomnibarOptionItems, OtherVomnibarItems, DirectVomnibarItems {}
  interface DeclaredVomnibarPayload extends SelectValueType<AllVomnibarItems>, DeclaredConstValues {}
  interface VomnibarPayload extends DeclaredVomnibarPayload, AllConstValues {}
}
declare const enum kOS {
  mac = 0, linuxLike = 1, win = 2,
  MAX_NOT_WIN = 1, UNKNOWN = 9,
}
declare const enum kBOS { MAC = 1, LINUX_LIKE = 2, WIN = 4 }

declare const enum HintMode {
    empty = 0, focused = 1, list = 1, newTab = 2,
    newtab_n_active = /* focused | newTab */ 3, mask_focus_new = /* newtab_n_active */ 3,
    queue = 16, min_job = 32, min_disable_queue = 64,
  OPEN_IN_CURRENT_TAB = /* empty */ 0, DEFAULT = /* OPEN_IN_CURRENT_TAB */ 0, // also 1
  OPEN_IN_NEW_BG_TAB = /* newTab */ 2,
  OPEN_IN_NEW_FG_TAB = /* newtab_n_active */ 3,
  OPEN_CURRENT_WITH_QUEUE = /* queue */ 16,
  OPEN_WITH_QUEUE = /* queue | newTab */ 18,
  OPEN_FG_WITH_QUEUE = /* queue | newTab | focused */ 19,
  HOVER = /* min_job */ 32, min_hovering = /* HOVER */ 32,
  UNHOVER = 33, max_hovering = /* UNHOVER */ 33, max_mouse_events = /* UNHOVER */ 33,
  FOCUS = 34,
  DOWNLOAD_MEDIA = 35, min_media = /* DOWNLOAD_MEDIA */ 35,
  COPY_IMAGE = 36,
  OPEN_IMAGE = 37, max_media = /* OPEN_IMAGE */ 37,
  SEARCH_TEXT = 38, min_string = 38,
  COPY_TEXT = /* (SEARCH_TEXT & ~1) + 2 */ 40,
    min_copying = /* COPY_TEXT */ 40, mode1_text_list = /* COPY_TEXT | list */ 41,
  COPY_URL = 42,
    mode1_url_list = /* COPY_URL | list */ 43, min_link_job = /* COPY_URL */ 42, max_copying = /* mode1_url_list */ 43,
    max_string = max_copying,
  DOWNLOAD_LINK= 44,
  OPEN_INCOGNITO_LINK = 45,
  OPEN_LINK = 46,
  EDIT_LINK_URL = /* min_disable_queue */ 64,
    max_link_job = /* EDIT_LINK_URL */ 64, min_edit = /* EDIT_LINK_URL */ 64, min_then_as_arg = /* EDIT_LINK_URL */ 64, 
  EDIT_TEXT = 65, max_edit = /* EDIT_TEXT */ 65,
  ENTER_VISUAL_MODE = 66, max_then_as_arg = /* ENTER_VISUAL_MODE */ 66,
  FOCUS_EDITABLE = 67,
    min_not_hint = 68,
}

declare namespace VomnibarNS {
  const enum PageType {
    inner = 0, ext = 1, web = 2,
    Default = inner,
  }
  const enum PixelData {
    FrameTop = 64,
    InputBar = 54, InputBarWithLine = InputBar + 1,
    Item = 44, LastItemDelta = 46 - Item,
    MarginV1 = 9, MarginV2 = 10, ShadowOffset = 2, MarginV = MarginV1 + MarginV2 + ShadowOffset * 2,
    OthersIfEmpty = InputBar + MarginV,
    OthersIfNotEmpty = InputBarWithLine + MarginV + LastItemDelta,
    ListSpaceDeltaWithoutScrollbar = FrameTop + MarginV1 + InputBarWithLine + LastItemDelta + ((MarginV2 / 2) | 0),
    MarginH = 24, AllHNotUrl = 20 * 2 + 20 + MarginH,
    MeanWidthOfMonoFont = 7.7, MeanWidthOfNonMonoFont = 4,
    WindowSizeRatioX = 0.8, MaxWidthInPixel = 1944, AllHNotInput = AllHNotUrl,
  }
  interface GlobalOptions extends TrailingSlashOptions, UserSedOptions {
    mode?: string;
    currentWindow?: boolean;
    newtab?: boolean | BOOL;
    keyword?: string;
    url?: true | string | null;
    /** known url */ u?: string | null | undefined
    urlSedKeys?: "sedKeys" | null
    exitOnClick?: boolean;
    autoSelect?: boolean | null | BOOL;
    preferTabs?: "new" | "new-opened" | "newOpened";
    engines?: CompletersNS.SugType.Empty | CompletersNS.SugType.Full | keyof typeof CompletersNS.SugType
        | ReadonlyArray<keyof typeof CompletersNS.SugType>
    noTabs?: boolean;
    hiddenTabs?: boolean;
    incognitoTabs?: boolean;
    icase?: boolean;
    searchInput?: boolean;
    tree?: boolean | "from-start"; // show tabs in tree mode
    incognito?: OpenUrlOptions["incognito"]
    noSessions?: boolean | "always" | "start"
    clickLike?: null | "chrome" | /** as "chrome" */ true | "vivaldi" | /** as "vivaldi" */ "chrome2"
    activeOnCtrl?: boolean
    position?: OpenPageUrlOptions["position"]
    inputSedKeys?: "sedKeys" | null
    itemSedKeys?: "sedKeys" | null
    itemKeyword?: string | null
    itemField?: string | null
    testUrl?: null | boolean | "whole" | "whole-string"
  }
}

interface ElementSet {
  add (value: Element): unknown;
  has (value: Element): boolean
}

declare const enum InjectorTask {
  reload = 1,
  recheckLiving = 2,
  reportLiving = 3,
  extInited = 4,
}
interface VApiTy {
  $r?: VimiumInjectorTy["$r"]
  /** destroy */ d: (this: void, silent?: boolean | BOOL | 9) => void
  /** evalJS */ v: { (code: string): unknown; vimiumEval? (code: string): unknown; doubleEval? (code: string): unknown
      tryEval? (code: string): { ok: boolean | number, result: unknown } }
}
interface VimiumInjectorTy {
  id: string;
  alive: 0 | 0.5 | 1 | -1;
  host: string;
  version: string;
  $: VApiTy;
  $h: (stat_num: number) => string
  clickable: ElementSet | null | undefined;
  cache: Dict<any> | null;
  getCommandCount: (this: void) => number;
  checkIfEnabled: (this: void) => void;
  /** on message to run */ $m (taskType: BgReq[kBgReq.injectorRun] | BgReq[kBgReq.injectorRun]["t"]): void;
  $r (taskType: InjectorTask): void;
  reload (req?: boolean | InjectorTask.reload): void;
  destroy: ((this: void, silent?: boolean) => void) | null;
  callback: ((this: void, code: number, error: string) => unknown) | null;
  eval: ((this: void, code: string) => unknown) | null | undefined
  /** block focus */ $g: null | boolean // null means false
}

interface Document extends DocumentAttrsToBeDetected {}

declare const enum GlobalConsts {
  TabIdNone = -1,
  TeeReqId = -3,
  VomnibarFakeTabId = -3,
  MaxImpossibleTabId = -4,
  WndIdNone = -1,
  MinHintCharSetSize = 4,
  MaxCountToHint = 1e6,
  MaxLengthOfShownText = 35, // include the length of ": "
  MaxLengthOfHintText = 252, // [512 bytes - (sizeof(uchar*) = 8)] / sizeof(uchar) = 252
  MatchingScoreFactorForHintText = 1e4,
  VomnibarSecretLength = 16, // *4 = 64 bits; should >= 8 (*4 = 32 bits); other values: "" | "1" | "2" | "omni"
  VomnibarSecretTimeout = 8000, // should be much larger than {@see ../content/omni.ts#init::slowLoadTimer}'s
  VomnibarWheelStepForPage = 300,
  VomnibarWheelIntervalForPage = 150,
  WheelTimeout = 330,
  TouchpadTimeout = 120,
  DefaultRectFlashTime = 400,
  MaxCountToGrabBackFocus = 16,
  // limited by Pagination.findAndFollowLink_
  MaxNumberOfNextPatterns = 200,
  MaxBufferLengthForPastingNormalText = /** 100K */ 102400,
  MaxBufferLengthForPastingLongURL    = /** 20M */ 20971520,
  TimeoutToReleaseBackendModules = /** (to make TS silent) 1000 * 60 * 5 */ 300000,
  ToleranceForTimeoutToGC = 100000,
  ToleranceOfNegativeTimeDelta = 5000,
  ThresholdToAutoLimitTabOperation = 2, // 2 * Tab[].length
  LinkHintTooHighThreshold = 20, // scrollHeight / innerHeight
  LinkHintPageHeightLimitToCheckViewportFirst = 15000,
  ElementsFromPointTakesTooSlow = 1000,
  DefaultMaxElementCountToDetectPointer = 400,
  MaxScrollbarWidth = 24,
  MinScrollableAreaSizeForDetection = 50,
  MaxHeightOfLinkHintMarker = 24,
  FirefoxFocusResponseTimeout = 340,
  MaxLimitOfVomnibarMatches = 25,
  MaxFindHistory = 50,
  TimeOfSuppressingTailKeydownEvents = 200,
  TimeOfSuppressingUnexpectedKeydownEvents = 220,
  CommandCountLimit = 9999,
  MediaWatchInterval = 60_000, // 60 seconds - chrome.alarms only accepts an interval >= 1min, so do us
  MaxHistoryURLLength = 2_000, // to avoid data: URLs and malformed webpages
  MaxLengthToCheckIgnoredTitles = 100,
  TrimmedURLPathLengthWhenURLIsTooLong = 320,
  TrimmedTitleLengthWhenURLIsTooLong = 160,
  MatchCacheLifeTime = 6000,
  TabCacheLifeTime = 3000,
  // so that `P` = 89 / 9e7 < 1e-6
  SecretRange = 9e7,
  SecretBase = 1e7,
  SecretStringLength = 8,
  MaxRetryTimesForSecret = 89,
  MarkAcrossJSWorlds = "__VimiumC_", // .length should be {@link #GlobalConsts.LengthOfMarkAcrossJSWorlds}
  LengthOfMarkAcrossJSWorlds = 10,
  ExtendClick_EndTimeOfAutoReloadLinkHints = 600,
  ExtendClick_DelayToStartIteration = 666,
  SYNC_QUOTA_BYTES = 102_400, // QUOTA_BYTES of storage.sync in https://developer.chrome.com/extensions/storage
  SYNC_QUOTA_BYTES_PER_ITEM = 8192,
  /** ceil(102_400 / (8192 - (12 + 16) * 4)) ; 12 and 16 is inner consts in {@link ../background/others.ts} */
  MaxSyncedSlices = 13,
  LOCAL_QUOTA_BYTES = 5_242_880, // 5MB ; no QUOTA_BYTES_PER_ITEM for local
  LOCAL_STORAGE_BYTES = 10_485_760, // 10MB
  MaxTabTreeIndent = 5,
  MinStayTimeToRecordTabRecency = 666,
  FirefoxAddonPrefix = "https://addons.mozilla.org/firefox/addon/",
  FirefoxHelp = "https://support.mozilla.org/kb/keyboard-shortcuts-perform-firefox-tasks-quickly",
  ChromeWebStorePage = "https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/$id/reviews",
  ChromeHelp = "https://support.google.com/chrome/answer/157179",
  EdgStorePage = "https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo",
  EdgHelp = "https://support.microsoft.com/help/4531783/microsoft-edge-keyboard-shortcuts",
  kCssDefault = ":default",

  kIsHighContrast = "isHC_f",
  MinCancelableInBackupTimer = 50,

  SelectorPrefixesInPatterns = ".#[:",
  ModeIds = "nnielmfvos",
  InsertModeId = "i",
  NormalModeId = "n",
  OmniModeId = "o",
  ForcedMapNum = "c-v-",
  KeySequenceTimeout = 30_000,
  ModifierKeyTimeout = 2_900,
  OptionsPage = "pages/options.html",
  kLoadEvent = "VimiumC",
  kEvalNameInMV3 = "__VimiumC_eval__",
  KeepAliveTime = 900_000,
}

declare const enum kModeId {
  Plain = 0, Normal, Insert, Next, max_not_command = Next, Link, Marks, Find, Visual, Omni,
  Show, NO_MAP_KEY_BUT_MAY_IGNORE_LAYOUT, NO_MAP_KEY,
  MIN_EXPECT_ASCII = Find, MIN_NOT_EXPECT_ASCII = NO_MAP_KEY,
}
declare const enum kHandler {
  __none, __normal, __insert, __next, linkHints, marks, find, visual, omni, 
  NOT_MEAN_kModeId,
  postFind = NOT_MEAN_kModeId, unhoverOnEsc, grabBackFocus, helpDialog, focusInput,
  passNextKey = __normal, suppressTail = __insert,  onTopNormal = __next, _mask = ""
}

declare const enum kCharCode {
  tab = 9, lineFeed = 10, formFeed = 11, space = 32, minNotSpace, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash, and = 38, quote1 = 39, plus = 43,
  /** '-' */ dash = 45,
  dot = 46, slash = 47,
  maxNotNum = 48 - 1, N0, N1, N9 = N0 + 9, minNotNum, colon = 58, lt = 60, gt = 62, question = 63,
  A = 65, maxNotAlphabet = A - 1, minAlphabet = A, B, C, D, E, F, G,
  H, I = A + 8, K = I + 2, R = A + 17, S = A + 18, W = A + 22, Z = A + 25, maxAlphabet = A + 25, minNotAlphabet,
  backslash = 92, /** '`' */ backtick = 96, a = 97, o = 111, s = 115, x = 120, CASE_DELTA = a - A,
  curlyBraceStart = 123, curlyBraceEnd = 125, nbsp = 0xa0,
}

declare const enum kKeyCode {
  None = 0, True = 1,
  backspace = 8, tab = 9, enter = 13, shiftKey = 16, ctrlKey = 17, altKey = 18, esc = 27,
  minAcsKeys = 16, maxAcsKeys = 18,
  maxNotPrintable = 32 - 1, space, maxNotPageUp = space, pageup, minNotSpace = pageup,
  pagedown, maxNotEnd = pagedown, end, home, maxNotLeft = home, left, up,
  right, minNotUp = right, down, minNotDown,
  maxNotInsert = 45 - 1, insert, deleteKey, minNotDelete,
  maxNotNum = 48 - 1, N0, N9 = N0 + 9, minNotNum,
  maxNotAlphabet = 65 - 1, A, B, C, D, E, F, G, H, I, J, K, L, M, N,
  O, P, Q, R, S, T, U, V, W, X, Y, Z, MinNotAlphabet,
  metaKey = 91, osLeft = metaKey, osRight_not_mac = 92, osRight_mac = 93, menuKey = 93,
  maxNotMetaKey = metaKey - 1, minNotMetaKeyOrMenu = menuKey + 1,
  maxNotFn = 112 - 1, f1, f2, f5 = f1 + 4,
  f10 = f1 + 9, f12 = f1 + 11, f13, f20 = f1 + 19, minNotFn, os_ff_mac = 224, ime = 229,
  questionWin = 191, questionMac = kCharCode.question, bracketLeftOnFF = 64,
}
declare const enum KeyStat {
  Default = 0, plain = Default,
  altKey = 1, ctrlKey = 2, metaKey = 4, shiftKey = 8,
  PrimaryModifier = ctrlKey | metaKey,
  ExceptShift = altKey | ctrlKey | metaKey, ExceptPrimaryModifier = altKey | shiftKey,
}
declare const enum kChar {
  INVALID = " ", EMPTY = "",
  hash = "#", minNotCommentHead = "$", groupnext = "groupnext",
  space = "space", pageup = "pageup", pagedown = "pagedown",
  end = "end", home = "home", left = "left", up = "up", right = "right", down = "down",
  insert = "insert", delete = "delete",
  backspace = "backspace", esc = "esc", tab = "tab", enter = "enter",
  minus = "-", bracketLeft = "[", bracketRight = "]",
  a = "a", b = "b", c = "c", d = "d", e = "e", f = "f", g = "g",
  h = "h", i = "i", j = "j", k = "k", l = "l", m = "m", n = "n",
  o = "o", p = "p", q = "q", r = "r", s = "s", t = "t", u = "u", v = "v", w = "w", x = "x", y = "y", z = "z",
  None = "", F_num = "f", f1 = "f1", f2 = "f2", f12 = "f12",
  maxNotNum = "/", minNotNum = ":", maxASCII = "~",
  maxNotF_num = "f0", minNotF_num = "f:", maxF_num = "f9",
  CharCorrectionList = ";=,-./`[\\]'\\:+<_>?~{|}\"|", EnNumTrans = ")!@#$%^&*(",
  Modifier = "modifier", Alt = "alt", Meta = "meta", Menu = "contextmenu", Alt2 = "alt2"
}

declare const enum BrowserType {
  Chrome = 1,
  Firefox = 2,
  Edge = 4,
  Safari = 8,
  Unknown = 16,
  ChromeOrFirefox = Chrome | Firefox,
}
