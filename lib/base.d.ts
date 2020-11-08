/* eslint-disable no-var */
interface WindowWithTop extends Window {
  top: Window;
}
declare const enum HandlerResult {
  PassKey = -1,
  Nothing = 0,
  Default = Nothing,
  Suppress = 1,
  MinStopOrPreventEvents = 1,
  MaxNotPrevent = 1,
  Prevent = 2,
  ExitPassMode = 3,
  // for `<c-[>`, do nothing advanced; but treat any mapped `<esc>` as a plain `<esc>` (apply `AdvancedFlag`)
  PlainEsc = 4, MaxNotEsc = 3,
  AdvancedEsc = 5,
}
declare const enum VisibilityType {
  Visible = 0,
  OutOfView = 1,
  NoSpace = 2,
}
declare const enum kHandler {
  linkHints, omni, find, visual, marks,
  postFind, unhoverOnEsc, grabBackFocus, helpDialog, focusInput,
  passNextKey, suppressTail, _MASK = "mask",
}
declare namespace HandlerNS {
  interface Event {
    /** keyCode */ i: kKeyCode;
    /** raw char */ c: kChar;
    /** event */ e: KeyboardEventToPrevent;
  }

  interface Handler {
    (this: void, event: HandlerNS.Event): HandlerResult;
  }

  interface VoidHandler<T> {
    (this: void, _arg?: undefined): T
  }
}

interface KeydownCacheArray extends SafeObject {
  [keyCode: number]: BOOL | 2 | undefined;
}

declare const enum kAria {
  hidden = 0, disabled = 1,
}

declare const enum kClickButton {
  none = 0, primary = 1, second = 2, primaryAndTwice = 4,
}
type AcceptableClickButtons = kClickButton.none | kClickButton.second | kClickButton.primaryAndTwice;
declare const enum kClickAction {
  none = 0,
  /** should only be used on Firefox */ plainMayOpenManually = 1,
  forceToOpenInNewTab = 2, forceToOpenInLastWnd = 4, newTabFromMode = 8,
  openInNewWindow = 16,
  // the 1..MaxOpenForAnchor before this line should always mean HTML <a>
  forceToDblclick = 32,
  MinNotPlainOpenManually = 2, MaxOpenForAnchor = 31,
}

/**
 * only Element has string .tagName, .id
 *
 * when used, MUST handle the cases of `Document` and `ShadowRoot`
 *
 * Note .role does not exist on C35 / C67 / C79-not-exp
 */
type NodeToElement = TypeToAssert<Node, Element, "tagName", "nodeType">;
/**
 * Tested on C74, comparing (HTML | SVG | MathML)Element | Element, there're only 5 properties which can be used:
 * * attributeStyleMap: StylePropertyMap | null (not on MathML on FF78),
 * * dataset: DOMStringMap | undefined, style: CSSStyleDeclaration | undefined,
 * * nonce: string | undefined (not on MathML on FF78), tabIndex: number | undefined
 *
 * While C++ wrappers should be avoided, so select "nonce" / "tabIndex". "focus" / "blur" may also be used.
 * But, "nonce" occurred very late (about C61 / FF75).
 */
type ElementToHTMLorOtherFormatted = TypeToAssert<Element, HTMLElement | NonHTMLButFormattedElement
    , "tabIndex" | "style", "tagName">;
/**
 * Document & HTMLElement & SVGStyleElement have string .title;
 * only HTMLElement has a string .lang ;
 * and, in cs.chromium.org, .title is faster than .tabIndex during C++ DOM parts
 */
type ElementToHTML = TypeToAssert<Element, HTMLElement, "lang", "tagName">;

interface SafeElement extends Element {
  readonly tagName: string;
  readonly nodeName: string;
  readonly localName: string;
}
interface Element { __other: 0 | 1 | 2 | 3 }
interface HTMLElement { __other: 0; lang: "" }
interface NonHTMLButFormattedElement extends SafeElement {
  __other: 1 | 2; tabIndex: number; style: CSSStyleDeclaration
  onclick (event: Event): any; onmousedown (event: Event): any;
}
interface SVGElement extends NonHTMLButFormattedElement { __other: 1 }
// like MathMLElement since Firefox 71
interface OtherFormattedElement extends NonHTMLButFormattedElement { __other: 2 }
interface SafeElementWithoutFormat extends SafeElement { __other: 3 }
type BaseSafeHTMLElement = HTMLElement & SafeElement;
interface SafeHTMLElement extends BaseSafeHTMLElement {
  innerText: string;
  readonly parentElement: Element | null;
  readonly parentNode: Node | null;
  readonly localName: keyof HTMLElementTagNameMap;
}
interface LockableElement extends SafeHTMLElement {
}

interface EventControlKeys {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface WritableRect {
  l: number; // left
  t: number; // top
  r: number; // right
  b: number; // bottom
}
interface Rect extends WritableRect {
  readonly l: number; // left
  readonly t: number; // top
  readonly r: number; // right
  readonly b: number; // bottom
}
type Point2D = readonly [ left: number, top: number ]

type ViewBox = readonly [ left: number, top: number, width: number, height: number, maxLeft: number ]
type ViewOffset = readonly [ left: number, top: number ] | ViewBox

declare const enum HookAction {
  Install = 0,
  SuppressListenersOnDocument = 1,
  Suppress = 2,
  Destroy = 3,
}

declare const enum PNType {
  /** accept shadow roots, doc fragments and so on; but no slots;
   *
   * useful for operations on selection (tested on C72 stable) */
  DirectNode = 0,
  /** no reveal; no shadow roots; ensured real parent element in DOM tree
   *
   * useful: for operations on selection, and when getting innerText (tested on C72 stable) */
  DirectElement = 1,
  /** no reveal; resolve shadow roots; ensured real composed parent in DOM tree
   *
   * useful when checking if A contains B */
  ResolveShadowHost = 2,
  /** reveal <slot> / <content>, if any;
   *
   * useful to compute layout and styles */
  RevealSlot = 3,
  /** reveal slots recursively; to find a real composed parent element in the layout tree (also in view) */
  RevealSlotAndGotoParent = 4,
  _invalid = -1,
}

declare const enum EditableType {
  NotEditable = 0,
  Default = NotEditable,
  Embed = 1,
  Select = 2,
  MaxNotTextModeElement = 2,
  TextBox = 3,
  input_ = 4,
  rich_ = 5,
}

declare const enum SelType {
  None = 0,
  Caret = 1,
  Range = 2,
}

declare namespace HintsNS {
  interface ContentOptions extends Options, SafeObject {}
  type LinkEl = Hint[0];

  interface MarkerElement extends SafeHTMLElement {
    readonly localName: "span"
    readonly firstChild: HTMLSpanElement | Text | null;
    readonly firstElementChild: HTMLSpanElement | null
    readonly childNodes: NodeListOf<HTMLSpanElement | Text>;
  }
  interface BaseHintItem {
    /** marker */ m: MarkerElement;
    /** dest */ d: LinkEl;
  }

  interface HintText {
    /** rawText */ t: string;
    /** words */ w: string[] | null;
  }
  interface HintItem extends BaseHintItem {
    /** key */ a: string;
    /** text */ h: HintText | null;
    /** refer */ r: HTMLElementUsingMap | Hint[0] | null;
    /** score (if not filterHints, it's count of matched characters) */ i: number;
    /** zIndex */ z?: number;
  }

  interface InputHintItem extends BaseHintItem {
    d: LockableElement;
  }
  interface FilteredHintItem extends HintItem {
    h: HintText;
  }

  interface Filter<T> {
    (this: void, hints: T[], element: SafeHTMLElement): void
  }

  interface BaseHintWorker {
  }

  const enum ClickType {
    Default = 0, edit = 1,
    MaxNotWeak = 1, attrListener = 2, MinWeak = 2, codeListener = 3, classname = 4, tabindex = 5, MaxWeak = 5,
    MinNotWeak = 6, // should <= MaxNotBox
    MaxNotBox = 6, frame = 7, scrollX = 8, scrollY = 9,
  }
  type AllowedClickTypeForNonHTML = ClickType.attrListener | ClickType.tabindex
}

declare namespace FindNS {
  const enum Action {
    PassDirectly = -1,
    DoNothing = 0, Exit, ExitNoAnyFocus, ExitNoFocus, ExitUnexpectedly,
    MaxExitButNoWork = ExitUnexpectedly, MinExitAndWork,
    ExitAndReFocus = MinExitAndWork, ExitToPostMode,
    MinNotExit, CtrlDelete = MinNotExit,
  }
  interface ExecuteOptions extends Partial<Pick<CmdOptions[kFgCmd.findMode], "n">> {
    /** highlight */ h?: [number, number] | false;
    /** ignore$hasResult */ i?: 1;
    /** just inputted */ j?: 1;
    noColor?: BOOL | boolean
    caseSensitive?: boolean;
  }
}

declare namespace VomnibarNS {
  const enum Status {
    NeedRedo = -3,
    KeepBroken = -2,
    NotInited = -1,
    Inactive = 0,
    Initing = 1,
    ToShow = 2,
    Showing = 3,
  }
  interface BaseFgOptions extends Pick<CmdOptions[kFgCmd.vomnibar], "s" | "t" | "d"> {
    // physical pixel size (if C<52) and devicePixelRatio
    w: number;
    h: number;
    z: number;
    p: "" | FgRes[kFgReq.parseSearchUrl];
  }
  interface FgOptions extends BaseFgOptions, Partial<GlobalOptions> {
    url?: string | null;
  }
  type MessageData = [number, FgOptions | null];
  interface Msg<T extends (kCReq | kFReq) & number> { N: T }

  const enum kCReq {
    activate, hide, focus,
    _mask = "",
  }
  const enum kFReq {
    hide, focus, style, iframeIsAlive,
    hud, evalJS, scroll, scrollGoing, scrollEnd, broken, unload,
    _mask = "",
  }
  interface CReq {
    [kCReq.activate]: FgOptions & Msg<kCReq.activate>;
    [kCReq.hide]: kCReq.hide;
    [kCReq.focus]: kCReq.focus;
  }
  interface FReq {
    [kFReq.hide]: {
    };
    [kFReq.scroll]: {
      /** key */ k: string;
      /** keybody */ b: kChar;
    };
    [kFReq.style]: {
      // unit: physical pixel (if C<52)
      h: number;
      m?: number;
    };
    [kFReq.hud]: { k: kTip };
    [kFReq.focus]: {
      /** lastKey */ l: kKeyCode;
    };
    [kFReq.evalJS]: {
      u: string;
    };
    [kFReq.broken]: {};
    [kFReq.scrollEnd]: {};
    [kFReq.scrollGoing]: {};
    [kFReq.unload]: {};
    [kFReq.iframeIsAlive]: { /** hasOptionsPassed */ o: BOOL };
  }
  interface IframePort {
    postMessage<K extends keyof FReq> (this: IframePort, msg: FReq[K] & Msg<K>): void | 1;
    onmessage (this: void, msg: { data: CReq[keyof CReq] }): void | 1;
  }
  type FgOptionsToFront = CReq[kCReq.activate];

  interface ContentOptions extends GlobalOptions {}
}

type HintOffset = [ rectBehindCur: Rect, offsetX: number ]

type HTMLElementUsingMap = HTMLImageElement | HTMLObjectElement;
type SafeElementForMouse = SafeHTMLElement | NonHTMLButFormattedElement | SafeElementWithoutFormat;
type Hint = [
  element: SafeElementForMouse,
  rect: Rect,
  priority: number,
  offset?: HintOffset,
  relatedMap?: HTMLElementUsingMap
]
interface Hint4 extends Hint {
  [3]: HintOffset;
}
interface Hint5 extends Hint4 {
  [4]: HTMLElementUsingMap; // fixed rect
}

type GoNextBaseCandidate = [element: SafeHTMLElement, api: VApiTy, score?: number, text?: string ]
interface GoNextCandidate extends GoNextBaseCandidate { [2]: number; [3]: string }

declare const enum AdjustType {
  /** Note(gdh1995): NotAdjust must be used carefully: @see {@link dom_ui.ts#addUIElement : setUICSS} */
  NotAdjust = 0, Normal = 1, MustAdjust = 2, DEFAULT = Normal,
}

declare const enum kDim {
  viewW = 0, viewH = 1, elClientW = 2, elClientH = 3, scrollW = 4, scrollH = 5, positionX = 6, positionY = 7,
  byX = 0, byY = 1
}

type ScrollByY = kDim.byX | kDim.byY;

type KnownIFrameElement = HTMLIFrameElement | HTMLFrameElement

type VimiumContainerElementType = "div" | "span" | "style" | "iframe" | "a" | "script" | "dialog";
/** ShadowRoot | HTMLDivElement */
type VUIRoot = ShadowRoot | (HTMLDivElement & { mode?: undefined });

type MyMouseControlKeys = [ altKey: boolean, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean ]

interface ComplicatedVPort {
  <K extends keyof FgReq, T extends FgReq[K]>(this: void, req: T & Req.baseFg<K>): void | 1
}
interface VApiTy {
  /** KeydownCacheArray */ a: {
    (this: void, srcCacheArray: KeydownCacheArray): boolean
    (this: void): KeydownCacheArray
  }
  /** baseHintWorker */ b: HintsNS.BaseHintWorker
  /* scroll */ c: {
    (di: ScrollByY, amount: number, isTo: 0
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined, fromMax?: false
      , options?: CmdOptions[kFgCmd.scroll]): void
    (di: ScrollByY, amount: number, isTo: 1
      , factor?: undefined | 0, fromMax?: boolean, options?: CmdOptions[kFgCmd.scroll]): void
  }
  /** destroy */ d: (this: void, silent?: boolean | BOOL | 9) => void
  /** execute content commands */ e: ((this: void, cmd: ValidContentCommands) => void) | null
  /** focusAndRun */ f: {
    (this: void): void
    (this: void, cmd: FgCmdAcrossFrames, options: FgOptions, count: number, showBorder?: 1 | 2): void
    (this: void, cmd: 0, options: never, count: never, showBorder: 1): void
  }
  /** filterTextToGoNext */ g: (candidates: GoNextCandidate[], names: string[]
      , options: CmdOptions[kFgCmd.goNext], maxLen: number) => number
  /** innerHeight_ff */ i?: (type?: undefined) => number
  /** jumpToNext */ j: (nextLink: SafeHTMLElement) => void
  /** scrollTick */ k: (willContinue: BOOL | 2) => void
  /** learnCSS */ l: (srcStyleUI: HTMLStyleElement | string | null, force?: undefined) => void
  /** getMappedKey */ m: (eventWrapper: HandlerNS.Event, mode: kModeId) => string
  /** findOnLoad */ n: (later?: 1) => void
  /** post */ p: <K extends keyof FgReq>(this: void, req: FgReq[K] & Req.baseFg<K>) => void | 1;
  /** for injector */ r: [
    <k extends keyof FgRes> (cmd: k, args: Req.fgWithRes<k>["a"], callback: (this: void, res: FgRes[k]) => void) => void
    , (<K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void)?
    , {
      (task: 0, args?: string): string
      (task: 1, newClickable: ElementSet): unknown
      (task: 2, newTr: VTransType): unknown
    }?
  ] | null | undefined;
  /** suppressTailKeys */ s (timeout?: 0): unknown
  /** tip */ t (request: BgReq[kBgReq.showHUD]): void
  /** urlToCopy */ u (): string
  /** flash */ x: {
    (el: null, rect: Rect, lifeTime?: number, classNames?: string): () => void
    (el: Element, rect?: null, lifeTime?: number, classNames?: string): (() => void) | void
  }
  /** misc */ y (): {
    /** onWndFocus */ w?: (this: void) => void
    /** find box */ b: HTMLIFrameElement | null
    /** clickable */ c: ElementSet
    /** Scroller::keyIsDown */ k: number
    /** UI root */ r: VUIRoot | null
  }
  /** cache */ z: SettingsNS.FrontendSettingCache | null
  /** VScroller.$sc */ $: (element: SafeElement | null, di: ScrollByY, amount: number) => void
}

declare var VimiumInjector: VimiumInjectorTy | undefined | null, VApi: VApiTy;

interface VDataTy {
  full: string;
  o (oldUrl: string): string;
}

type VTransType = (tid: kTip | HintMode, args?: Array<string | number> | string) => string;

declare const enum kContentCmd {
  _fake = 0,
  AutoFindAllOnClick = 1,
  ManuallyFindAllOnClick = 2,
  _minSuppressClickable = 4,
  // see injected_end.ts for difference between Destroy and SuppressClickable
  SuppressClickable = 5,
  Destroy = 6,
  DestroyForCSP = 7,
  MaskedBitNumber = 3,
}
type ValidContentCommands = Exclude<kContentCmd, kContentCmd._fake | kContentCmd._minSuppressClickable
    | kContentCmd.MaskedBitNumber | kContentCmd.AutoFindAllOnClick>;
type ContentCommandsNotSuppress = kContentCmd.AutoFindAllOnClick | kContentCmd.ManuallyFindAllOnClick;
type SecondLevelContentCmds = kContentCmd.AutoFindAllOnClick | kContentCmd.ManuallyFindAllOnClick
    | kContentCmd.Destroy;

declare const enum TimerID { None = 0, Valid = 42, Timeout = "43", Interval = "44", __mask = "" }
type ValidTimeoutID = 0 | 42 | "43"
type ValidIntervalID = 0 | 42 | "44"
    
interface Window {
  readonly VApi?: VApiTy;
}

/** Warning on Firefox:
 * Even when `frameElement` is valid, `parent.innerWidth` may still throw.
 *
 * Common cases:
 * * on QQMail desktop version, the inbox is an `<iframe src="//mail.qq.com/...">`
 * * if the top frame is using HTTPS, then there's an auto-upgrading from HTTP to HTTPS
 * * its first element is an inline `<script>`, and the first line is `document.domain="mail.qq.com";`
 * * before this line, access to `parent.innerWidth` is blocked
 * * after this line, the access is re-enabled on Chrome and most time of Firefox
 *
 * Bug cases:
 * * But on Firefox, if debugging code and access `webextension.parent.***` before the line,
 * * then the `parent` is generated as an instance of `Restricted` lazily,
 * * when the page is loaded, the `parent` is still restricted and only `.focus` and `.location.href` can be accessed
 */
declare var parent: unknown;

declare const enum kTY { str = 0, obj = 1, func = 2, num = 3 }
declare const enum kMediaTag { img = 0, otherMedias = 1, a = 2, others = 3, MIN_NOT_MEDIA_EL = 2, LAST = 3 }
