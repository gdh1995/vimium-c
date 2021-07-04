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
type ElementToSVG = TypeToAssert<Element, SVGElement, "ownerSVGElement", "tagName">
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

declare namespace HintsNS {
  interface BaseHintStatus {
    /** isActive */ a: BOOL
    /** box */ b: HTMLDivElement | HTMLDialogElement | null
    /** mode */ m: HintMode
  }
  interface BaseHintWorker {
    /** get stat */ $ (): Readonly<BaseHintStatus>
  }
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
type Hint0 = { [0]: SafeElementForMouse } // eslint-disable-line @typescript-eslint/consistent-type-definitions
interface Hint4 extends Hint {
  [3]: HintOffset;
}
interface Hint5 extends Hint4 {
  [4]: HTMLElementUsingMap; // fixed rect
}

type GoNextBaseCandidate = [element: Hint0[0], api: VApiTy, score?: number, text?: string ]
interface GoNextCandidate extends GoNextBaseCandidate { [2]: number; [3]: string }

declare const enum AdjustType {
  /** Note(gdh1995): NotAdjust must be used carefully: @see {@link dom_ui.ts#addUIElement : setUICSS} */
  NotAdjust = 0, Normal = 1, MustAdjust = 2, DEFAULT = Normal,
}

declare const enum kDim {
  viewW = 0, viewH = 1, elClientW = 2, elClientH = 3, scrollW = 4, scrollH = 5, positionX = 6, positionY = 7,
  /** used in {@see ../content/scroller.ts#shouldScroll_s} */ _posX2 = 8, _posY2 = 9,
  byX = 0, byY = 1
}

type ScrollByY = kDim.byX | kDim.byY;

type KnownIFrameElement = HTMLIFrameElement | HTMLFrameElement

/** ShadowRoot | HTMLDivElement */
type VUIRoot = ShadowRoot | (HTMLDivElement & { mode?: undefined });

type VTransType = (tid: kTip | HintMode, args?: Array<string | number> | string) => string

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
  /** execute content commands */ e: ((this: void, cmd: ValidContentCommands) => void) | null
  /** focusAndRun */ f: {
    (this: void): void
    (this: void, cmd: FgCmdAcrossFrames, options: FgOptions, count: number, showBorder?: 1 | 2): void
    (this: void, cmd: 0, options: never, count: never, showBorder: 1): void
  }
  /** filterTextToGoNext */ g: (candidates: GoNextCandidate[], names: string[]
      , options: CmdOptions[kFgCmd.goNext], maxLen: number) => number
  /** innerHeight_ff */ i?: (type?: undefined) => number
  /** jumpToNext */ j: (nextLink: Hint0[0]) => void
  /** scrollTick */ k: (willContinue: BOOL | 2) => void
  /** learnCSS */ l: (srcStyleUI: HTMLStyleElement | string | null, force?: undefined) => void
  /** getMappedKey */ m: (eventWrapper: HandlerNS.Event, mode: kModeId) => string
  /** findOnLoad */ n: (event?: Event) => void
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
    (el: SafeElement, rect?: null, lifeTime?: number, classNames?: string): (() => void) | void
  }
  /** misc */ y (): {
    /** onWndFocus */ w?: (this: void) => void
    /** find box */ b: HTMLIFrameElement | null
    /** clickable */ c: ElementSet
    /** Scroller::keyIsDown */ k: number
    /** UI root */ r: VUIRoot | null
    /** find input */ f: SafeHTMLElement | null
  }
  /** cache */ z: SettingsNS.FrontendSettingCache | null
  /** VScroller.$sc */ $: (element: SafeElement | null, di: ScrollByY, amount: number
      , options?: CmdOptions[kFgCmd.scroll]) => void
}

declare var VimiumInjector: VimiumInjectorTy | undefined | null, VApi: VApiTy;

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

interface KnownDataset {
  vimium: string // secret of extend click; or prefix and suffix in the Find HUD
  vimiumHints: "ordinal" | string // order of link hints in filter-hint mode
  s: string // used by help dialog
  h: string // used by help dialog
  vimUrl: string // used in HintMode.{COPY_URL,DOWNLOAD_LINK}
  vimText: string
  src: string // used in getMediaUrl
  canonicalSrc: string // used in HintMode.{OPEN_IMAGE,DOWNLOAD_MEDIA}
}
