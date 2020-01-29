
declare namespace CompletersNS {
  const enum SugType {
    Empty = 0,
    bookmark = 1,
    history = 2,
    domain = 4,
    search = 8,
    tab = 16,
    Full = 0x3f,
  }
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
  type ValidTypes = "bookm" | "domain" | "history" | "omni" | "bomni" | "search" | "tab";
  /**
   * "math" can not be the first suggestion, which is limited by omnibox handlers
   */
  type ValidSugTypes = ValidTypes | "math";
  const enum QueryFlags {
    None = 0,
    AddressBar = 1,
    TabInCurrentWindow = 2,
    MonospaceURL = 4,
    TabTree = 8,
  }
  interface Options {
    /** maxChars */ c?: number;
    /** maxResults */ r?: number;
    /** flags */ f: QueryFlags;
    /** last sug types: empty means all */ t: SugType;
    /** original type */ o: ValidTypes;
  }

  interface WritableCoreSuggestion {
    /** enumType */ e: ValidSugTypes;
    /** url */ u: string;
    title: string; // used by vomnibar.html
    /** text */ t: string;
  }

  type CoreSuggestion = Readonly<WritableCoreSuggestion>;

  interface BaseSuggestion extends CoreSuggestion {
    t: string;
    textSplit?: string;
    title: string;
    /** sessionId */ s?: string | number;
    label?: string;
    /** source page of favIcon */ v?: string;
    favIcon?: string;
  }
  interface Suggestion extends BaseSuggestion {
    /** relevancy */ r: number;
  }
  interface SearchSuggestion extends Suggestion {
    e: "search";
    // not empty
    /** pattern */ p: string;
  }
  interface TabSuggestion extends Suggestion {
    level?: string;
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
    /** markName */ n: string;
  }

  interface BaseMarkProps {
    /** scroll */ s: ScrollInfo;
    /** url */ u: string;
  }

  interface Mark extends BaseMark, BaseMarkProps {
  }

  interface NewTopMark extends BaseMark {
    /** scroll */ s?: undefined;
  }
  interface NewMark extends Mark {
    /** local */ l?: boolean; /** default to false */
  }

  interface FgGlobalQuery extends BaseMark {
    /** prefix */ p?: boolean; /** default to false */
    /** local */ l?: false; /** default to false */
    /** url */ u?: undefined;
  }
  interface FgLocalQuery extends BaseMark {
    /** prefix */ p?: undefined;
    /** local */ l: true;
    /** url */ u: string;
    /** old */ o?: {
      /** scrollX */ x: number,
      /** scrollY */ y: number,
      /** hash */ h: string,
    };
  }
  type FgQuery = FgGlobalQuery | FgLocalQuery;

  interface FgMark extends ScrollInfo {
    [2]?: string;
  }

  interface FocusOrLaunch {
    /** scroll */ s?: ScrollInfo;
    /** url */ u: string;
    /** prefix */ p?: boolean;
    /** reuse */ r?: ReuseType;
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

type TextElement = HTMLInputElement | HTMLTextAreaElement;

declare const enum ReuseType {
  current = 0,
  Default = current,
  reuse = 1,
  newWindow = 2,
  newFg = -1,
  newBg = -2,
}

declare const enum FrameMaskType {
  NoMaskAndNoFocus = 0,
  NoMask = 1,
  OnlySelf = 2,
  NormalNext = 3,
  ForcedSelf = 4,
  minWillMask = OnlySelf,
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
    OtherExtension = 64,
    vomnibarChecked = 128,
    isVomnibar = 256,
    sourceWarned = 512,
  }
  const enum NextType {
    next = 0, Default = next,
    parent = 1,
    current = 2,
  }
}

declare const enum PortNameEnum {
  Prefix = "vimium-c.",
  PrefixLen = 9,
  Delimiter = "@",
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
  const enum kNames {
    autoReduceMotion = "autoReduceMotion",
    ignoreCapsLock = "ignoreCapsLock",
    grabBackFocus = "grabBackFocus",
    darkMode = "darkMode",
    reduceMotion = "reduceMotion",
  }
  type AutoItems = {
    /** ignoreKeyboardLayout */ l: ["ignoreKeyboardLayout", boolean];
    /** keyboard */ k: ["keyboard", [number, number]];
    /** linkHintCharacters */ c: ["linkHintCharacters", string];
    /** linkHintNumbers */ n: ["linkHintNumbers", string];
    /** filterLinkHints */ f: ["filterLinkHints", boolean];
    /** waitForEnter */ w: ["waitForEnter", boolean];
    /** regexFindMode */ r: ["regexFindMode", boolean];
    /** scrollStepSize */ t: ["scrollStepSize", number];
    /** smoothScroll */ s: ["smoothScroll", boolean];
    /** mapModifier */ a: ["mapModifier", 0 | 1 | 2];
  }
  interface ManualItems {
    /** darkMode */ d: [kNames.darkMode, " D" | ""];
    /** ignoreCapsLock */ i: [kNames.ignoreCapsLock, boolean];
    /** reduceMotion */ m: [kNames.reduceMotion, BaseBackendSettings["autoReduceMotion"]];
  }
  interface OneTimeItems {
    /** grabBackFocus */ g: [kNames.grabBackFocus, BaseBackendSettings[kNames.grabBackFocus]];
  }
  interface ConstItems {
    /** browser */ b: ["browser", BrowserType | undefined];
    /** browserVer */ v: ["browserVer", BrowserVer | FirefoxBrowserVer | 0 | undefined];
    /** OS */ o: ["OS", kOS.mac | kOS.linux | kOS.win];
  }
  type DeclaredConstValues = Readonly<SelectValueType<Pick<ConstItems, "v" | "o">>>;
  interface AllConstValues extends Readonly<SelectValueType<ConstItems>> {}
  type VomnibarOptionItems = {
    /** maxMatchNumber */ n: ["maxMatches", number];
    /** queryInterval */ t: ["queryInterval", number];
    /** comma-joined size numbers */ l: ["sizes", string];
    /** styles */ s: ["styles", string];
  }
  interface OtherVomnibarItems {
    /** css */ c: ["omniCSS", string];
    /** mappedKeys */ k: ["mappedKeys", SafeDict<string> | null];
  }

  interface BaseBackendSettings {
    [kNames.autoReduceMotion]: boolean;
    focusNewTabContent: boolean;
    [kNames.grabBackFocus]: boolean;
    /** if want to rework it, must search it in all files and take care */
    [kNames.ignoreCapsLock]: 0 | 1 | 2;
    newTabUrl_f: string;
    showAdvancedCommands: boolean;
    vomnibarOptions: SelectNVType<VomnibarOptionItems>;
  }
  interface FrontUpdateAllowedSettings {
    showAdvancedCommands: 0;
  }

  interface FrontendSettingsSyncingItems extends AutoItems, ManualItems {}
  interface DeclaredFrontendValues extends SelectValueType<ManualItems & OneTimeItems>, DeclaredConstValues {
  }
  type FrontendSettings = SelectNVType<AutoItems>;

  /** Note: should have NO names which may be uglified */
  interface FrontendSettingCache extends AllConstValues
      , SelectValueType<FrontendSettingsSyncingItems & OneTimeItems> {
  }

  /** Note: should have NO names which may be uglified */
  interface AllVomnibarItems extends VomnibarOptionItems, OtherVomnibarItems
      , Pick<AutoItems, "a"> {
  }
  interface VomnibarPayload extends AllConstValues, SelectValueType<AllVomnibarItems> {
  }
  interface DeclaredVomnibarPayload extends SelectValueType<AllVomnibarItems>, DeclaredConstValues {
  }
}
declare const enum kOS {
  mac = 0, linux = 1, win = 2,
  MAX_NOT_WIN = 1, UNKNOWN = 9,
}

declare const enum HintMode {
  empty = 0, focused = 1, list = 1, newTab = 2, newtab_n_active = focused | newTab, mask_focus_new = newtab_n_active,
  queue = 16, min_job = 32, min_disable_queue = 64,
  OPEN_IN_CURRENT_TAB = empty, DEFAULT = OPEN_IN_CURRENT_TAB, // also 1
  OPEN_IN_NEW_BG_TAB = newTab,
  OPEN_IN_NEW_FG_TAB = newTab | focused,
  OPEN_CURRENT_WITH_QUEUE = queue,
  OPEN_WITH_QUEUE = queue | newTab,
  OPEN_FG_WITH_QUEUE = queue | newTab | focused,
  HOVER = min_job, min_hovering = HOVER,
  UNHOVER, max_hovering = UNHOVER, max_mouse_events = UNHOVER,
  FOCUS,
  DOWNLOAD_MEDIA, min_media = DOWNLOAD_MEDIA,
  OPEN_IMAGE, max_media = OPEN_IMAGE,
  SEARCH_TEXT,
  COPY_TEXT = ((SEARCH_TEXT + 1) & ~1), min_copying = COPY_TEXT, mode1_text_list = COPY_TEXT | list,
  COPY_URL, mode1_url_list = COPY_URL | list, min_link_job = COPY_URL, max_copying = mode1_url_list,
  DOWNLOAD_LINK,
  OPEN_INCOGNITO_LINK,
  EDIT_LINK_URL = min_disable_queue,
    max_link_job = EDIT_LINK_URL,
    min_edit = EDIT_LINK_URL,
  EDIT_TEXT,
    max_edit = EDIT_TEXT,
  FOCUS_EDITABLE,
    min_not_hint,
}

declare namespace VomnibarNS {
  const enum PageType {
    inner = 0, ext = 1, web = 2,
    Default = inner,
  }
  const enum PixelData {
    MarginTop = 64,
    InputBar = 54, InputBarWithLine = InputBar + 1,
    Item = 44, LastItemDelta = 46 - Item,
    MarginV1 = 9, MarginV2 = 10, ShadowOffset = 2, MarginV = MarginV1 + MarginV2 + ShadowOffset * 2,
    OthersIfEmpty = InputBar + MarginV,
    OthersIfNotEmpty = InputBarWithLine + MarginV + LastItemDelta,
    ListSpaceDeltaWithoutScrollbar = MarginTop + MarginV1 + InputBarWithLine + LastItemDelta + ((MarginV2 / 2) | 0),
    MarginH = 24, AllHNotUrl = 20 * 2 + 20 + MarginH,
    MeanWidthOfMonoFont = 7.7, MeanWidthOfNonMonoFont = 4,
    WindowSizeX = 0.8, AllHNotInput = AllHNotUrl,
  }
  interface GlobalOptions {
    mode: string;
    currentWindow?: boolean;
    newtab: boolean;
    keyword: string;
    url?: true | string | null;
    exitOnClick?: boolean;
    tree?: boolean; // show tabs in tree mode
  }
}

declare const enum InjectorTask {
  reload = 1,
  recheckLiving = 2,
  reportLiving = 3,
  extInited = 4,
}
interface VimiumInjectorTy {
  id: string;
  alive: 0 | 0.5 | 1 | -1;
  host: string;
  version: string;
  $h: ExternalMsgs[kFgReq.inject]["res"]["h"];
  clickable: WeakSet<Element> | null | undefined;
  cache: Dict<any> | null;
  getCommandCount: (this: void) => number;
  checkIfEnabled: (this: void) => void;
  /** on message to run */ $m (taskType: BgReq[kBgReq.injectorRun]): void;
  $r (taskType: InjectorTask): void;
  $p?: [
    <K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void
    , () => string
  ] | null;
  reload (req?: boolean | InjectorTask.reload): void;
  destroy: ((this: void, silent?: boolean) => void) | null;
}

interface Document extends DocumentAttrsToBeDetected {}

declare const enum GlobalConsts {
  TabIdNone = -1,
  VomnibarFakeTabId = -3,
  MaxImpossibleTabId = -4,
  WndIdNone = -1,
  MinHintCharSetSize = 4, // {@link ../_locales/*/messages.json#hintCharsTooFew */}
  MaxCountToHint = 1e6,
  MaxLengthOfShownText = 35, // include the length of ": "
  MaxLengthOfHintText = 252, // [512 bytes - (sizeof(uchar*) = 8)] / sizeof(uchar) = 252
  MatchingScoreFactorForHintText = 1e4,
  VomnibarSecretTimeout = 3000,
  VomnibarWheelStepForPage = 300,
  VomnibarWheelIntervalForPage = 150,
  WheelTimeout = 330,
  TouchpadTimeout = 120,
  DefaultRectFlashTime = 400,
  // limited by Pagination.findAndFollowLink_
  MaxNumberOfNextPatterns = 200,
  MaxBufferLengthForPasting = 8192,
  TimeoutToReleaseBackendModules = /** (to make TS silent) 1000 * 60 * 5 */ 300000,
  ToleranceForTimeoutToGC = 100000,
  ToleranceOfNegativeTimeDelta = 5000,
  ThresholdToAutoLimitTabOperation = 2, // 2 * Tab[].length
  LinkHintTooHighThreshold = 20, // scrollHeight / innerHeight
  LinkHintPageHeightLimitToCheckViewportFirst = 15000,
  MinElementCountToStopScanOnClick = 5000,
  MaxScrollbarWidth = 24,
  MinScrollableAreaSizeForDetection = 50,
  MaxHeightOfLinkHintMarker = 18,
  FirefoxFocusResponseTimeout = 340,
  MaxLimitOfVomnibarMatches = 25,
  MaxFindHistory = 50,
  TimeOfSuppressingTailKeydownEvents = 200,
  CommandCountLimit = 9999,
  MediaWatchInterval = 60_000, // 60 seconds - chrome.alarms only accepts an interval >= 1min, so do us
  MaxHistoryURLLength = 2_000, // to avoid data: URLs and malformed webpages
  TrimmedURLPathLengthWhenURLIsTooLong = 320,
  TrimmedTitleLengthWhenURLIsTooLong = 160,
  // so that `P` = 89 / 9e6 < 1e-5
  SecretRange = 9e6,
  SecretBase = 1e6,
  MaxRetryTimesForSecret = 89,
  SecretStringLength = 7,
  MarkForName3Length = 10,
  ExtendClick_DelayToFindAll = 600,
  ExtendClick_DelayToStartIteration = 666,
  SYNC_QUOTA_BYTES = 102_400, // QUOTA_BYTES of storage.sync in https://developer.chrome.com/extensions/storage
  SYNC_QUOTA_BYTES_PER_ITEM = 8192,
  /** ceil(102_400 / (8192 - (12 + 16) * 4)) ; 12 and 16 is inner consts in {@link ../background/others.ts} */
  MaxSyncedSlices = 13,
  LOCAL_QUOTA_BYTES = 5_242_880, // 5MB ; no QUOTA_BYTES_PER_ITEM for local
  LOCAL_STORAGE_BYTES = 10_485_760, // 10MB
  MaxTabTreeIndent = 5,
  FirefoxAddonPrefix = "https://addons.mozilla.org/firefox/addon/",
  FirefoxHelp = "https://support.mozilla.org/kb/keyboard-shortcuts-perform-firefox-tasks-quickly",
  ChromeWebStorePage = "https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/$id/reviews",
  ChromeHelp = "https://support.google.com/chrome/answer/157179",
  EdgStorePage = "https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo",
  EdgHelp = "https://microsoftedgesupport.microsoft.com/hc",

  KeyboardLettersLl = "a-z_\xdf-\xfc\u0430-\u045f",
  LettersLlLuAndOtherASCII = "!-~\xc0-\xfc\u0402-\u045f",
  KeyboardLettersLo = "\xba\u0621-\u064a",

  SelectorPrefixesInPatterns = ".#",
}

declare const enum kCharCode {
  tab = 9, space = 32, minNotSpace, bang = 33, quote2 = 34, hash = 35,
  maxCommentHead = hash, and = 38, quote1 = 39,
  /** '-' */ dash = 45,
  dot = 46, slash = 47,
  maxNotNum = 48 - 1, N0, N9 = N0 + 9, minNotNum, colon = 58, lt = 60, gt = 62, question = 63,
  A = 65, maxNotAlphabet = A - 1, minAlphabet = A,
  B, C, I = A + 8, K = I + 2, W = A + 22, minLastAlphabet = A + 25, minNotAlphabet,
  a = 97, CASE_DELTA = a - A,
  backslash = 92, s = 115,
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
  metaKey = 91, osRightNonMac = 92, osRightMac = 93, menuKey = 93, maxNotFn = 112 - 1, f1, f2, f5 = f1 + 4,
  maxNotMetaKey = metaKey - 1, minNotMetaKeyOrMenu = menuKey + 1,
  f10 = f1 + 9, f12 = f1 + 11, f13, f20 = f1 + 19, minNotFn, ime = 229,
  questionWin = 191, questionMac = kCharCode.question,
}
declare const enum KeyStat {
  Default = 0, plain = Default,
  altKey = 1, ctrlKey = 2, metaKey = 4, shiftKey = 8,
  PrimaryModifier = ctrlKey | metaKey,
  ExceptShift = altKey | ctrlKey | metaKey, ExceptPrimaryModifier = altKey | shiftKey,
}
declare const enum kChar {
  space = "space", pageup = "pageup", pagedown = "pagedown",
  end = "end", home = "home", left = "left", up = "up", right = "right", down = "down",
  insert = "insert", delete = "delete",
  backspace = "backspace", esc = "esc", tab = "tab", enter = "enter",
  None = "", F_num = "f",
  CharCorrectionList = ";=,-./`[\\]'\\:+<_>?~{|}\"|", EnNumTrans = ")!@#$%^&*(",
  Modifier = "modifier",
}

declare const enum BrowserType {
  Chrome = 1,
  Firefox = 2,
  Edge = 4,
  Unknown = 8,
  ChromeOrFirefox = Chrome | Firefox,
  _mask = 127,
}
