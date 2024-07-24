/// <reference path="../typings/lib/window.d.ts" />
declare const enum HandlerResult {
  PassKey = -1,
  Nothing = 0,
  Default = Nothing,
  Suppress = 1,
  MinStopOrPreventEvents = 1,
  MaxNotPrevent = 1,
  Prevent = 2,
  ExitNormalMode = 3,
  RefreshPassAsNormal = 4,
  // for `<c-[>`, do nothing advanced; but treat any mapped `<esc>` as a plain `<esc>` (apply `AdvancedFlag`)
  PlainEsc = 6, MaxNotEsc = 5,
  AdvancedEsc = 7,
}
declare namespace HandlerNS {
  interface Event {
    /** keyCode */ i: kKeyCode;
    /** raw char */ c: kChar;
    /** event */ e: KeyboardEventToPrevent;
    /** is <v-***> */ v: `v-${string}` | ""
  }

  interface Handler {
    (this: void, event: HandlerNS.Event): HandlerResult;
  }

  interface VoidHandler<T> {
    (this: void, _arg?: undefined): T
  }
}
interface UserTrustedKeyboardEvent extends KeyboardEvent { z?: VApiTy["z"] }

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
 * * nonce: string | undefined (not on MathML on FF78, but on C98 if EXP), tabIndex: number | undefined
 * * see https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/html/html_or_foreign_element.idl
 *
 * While C++ wrappers should be avoided, so select "nonce" / "tabIndex". "focus" / "blur" may also be used.
 * But, "nonce" occurred very late (about C61 / FF75).
 */
type ElementToHTMLOrForeign = TypeToAssert<Element, HTMLElement | NonHTMLButFormattedElement
    , "tabIndex" | "style" | "focus", "tagName">;
type ElementToSVG = TypeToAssert<Element, SVGElement, "ownerSVGElement", "tagName">
/**
 * Document & HTMLElement & SVGStyleElement have string .title;
 * only HTMLElement has a string .lang ;
 * and, in cs.chromium.org, .title is faster than .tabIndex during C++ DOM parts
 */
type ElementToHTML = TypeToAssert<Element, HTMLElement, "lang", "tagName">;

interface Element { __other: 0 | 1 | 2 | 3 }
interface HTMLElement { __other: 0 }
interface NonHTMLButFormattedElement extends SafeElement {
  __other: 1 | 2; tabIndex: number; style: CSSStyleDeclaration
  onclick (event: Event): any; onmousedown (event: Event): any;
}
interface SVGElement extends NonHTMLButFormattedElement { __other: 1 }
// like MathMLElement since Firefox 71
interface ForeignElement extends NonHTMLButFormattedElement { __other: 2 }
interface SafeElementWithoutFormat extends SafeElement { __other: 3 }
interface OtherLockableElement extends HTMLElement {
  /** fake; just for type systems */ localName: `${string}-${string}` | `${string}_${string}`
  isContentEditable: true
}
type LockableElement = SafeHTMLElement & (TextElement | HTMLSelectElement | OtherLockableElement)

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
  MaxNotEditableElement = 2,
  ContentEditable = 3,
  MaxNotTextBox = 3,
  TextArea = 4,
  Input = 5,
}

declare namespace HintsNS {
  interface BaseKeyStatus {
    /** curHints */ c: readonly unknown[];
  }
  interface BaseHintStatus {
    /** isActive */ a: BOOL
    /** box */ b: HTMLDivElement | HTMLDialogElement | null
    /** mode */ m: HintMode
    /** keyStatus */ k: BaseKeyStatus
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
  viewW = 0, viewH = 1, elClientW = 2, elClientH = 3, scrollW = 4, scrollH = 5,
  scPosX = 6, scPosY = 7, positionX = 8, positionY = 9,
  byX = 0, byY = 1
}

type ScrollByY = kDim.byX | kDim.byY;

type AccessableIFrameElement = HTMLIFrameElement | HTMLFrameElement
type KnownIFrameElement = AccessableIFrameElement | HTMLFencedFrameElement

/** ShadowRoot | HTMLDivElement */
type VUIRoot = ShadowRoot | (HTMLDivElement & { mode?: undefined });

type VTransType = (tid: kTip | HintMode, args?: Array<string | number> | string) => string

declare namespace ContentNS {
  interface Port extends chrome.runtime.Port {
    postMessage<k extends keyof FgRes>(request: Req.fgWithRes<k>): 1;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    postMessage<k extends keyof FgReq>(request: Req.fg<k>): 1;
    onMessage: chrome.events.Event<(message: any, port: Port, exArg: FakeArg) => void>;
  }
}

interface VApiTy extends Frames.BaseVApi {
  /** KeydownCacheArray */ a: {
    (this: void, srcCacheArray: KeydownCacheArray): boolean
    (this: void): KeydownCacheArray
  }
  /** baseHintWorker */ b: HintsNS.BaseHintWorker
  /** @see {../content/scroller.ts#executeScroll} */ c: {
    (di: ScrollByY, amount: number, flags: kScFlag.scBy
      , factor?: NonNullable<CmdOptions[kFgCmd.scroll]["view"]> | undefined
      , options?: CmdOptions[kFgCmd.scroll], oriCount?: number, force?: 1): void
    (di: ScrollByY, amount: number, flags: kScFlag.scBy | kScFlag.toMin | kScFlag.toMax
      , factor?: undefined | 0, options?: CmdOptions[kFgCmd.scroll], oriCount?: number, force?: 1): void
  }
  /** execute content commands */ e: ((this: void, cmd: ValidContentCommands, el?: SafeHTMLElement) => void) | null
  /** focusAndRun */ f: {
    (this: void): void
    (this: void, cmd: FgCmdAcrossFrames, options: FgOptions, count: number
        , showBorder?: 0 | 1 | 2, childFrame?: SafeHTMLElement | null | void): void
    (this: void, cmd: 0, options: never, count: never, showBorder: 1, ): void
  }
  /** filterTextToGoNext */ g: (candidates: GoNextCandidate[], names: string[]
      , options: CmdOptions[kFgCmd.goNext], maxLen: number) => number
  /** hudTip */ h (k: kTip, d?: number, t?: string): void
  /** innerHeight_ff */ i?: (type?: undefined) => number
  /** jumpToNext */ j: (nextLink: Hint0[0], options: CmdOptions[kFgCmd.goNext]) => void
  /** scrollTick */ k: (willContinue: 0 | 1 | 2 | 5) => void
  /** learnCSS */ l: (srcStyleUI: HTMLStyleElement | string | null, force?: undefined) => void
  /** findOnLoad */ n: ((event?: Event) => void) | null
  /** post */ p: <K extends keyof FgReq>(this: void, req: FgReq[K] & Req.baseFg<K>) => void | 1;
  // /** refreshPort */ q: Frames.BaseVApi["q"]
  /** for injector */ r: [ send:
    <k extends keyof FgRes> (cmd: k, args: Req.fgWithRes<k>["a"], callback: (this: void, res: FgRes[k]) => void) => void
    , _safePost: (<K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>) => void) | undefined
    , _otherSetters: {
      (task: 0, args?: string): string
      (task: 1, newClickable: ElementSet): unknown
      (task: 2, newTr: VTransType): unknown
    } | undefined
    , getMappedKey: (eventWrapper: HandlerNS.Event, mode: kModeId) => string
  ];
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
    /** @see {../content/scroller.ts#keyIsDown} */ k: number
    /** UI root */ r: VUIRoot | null
    /** find input */ f: SafeHTMLElement | null
    m: [ keyFSM: KeyFSM, mappedKeys: SafeDict<string> | null, mapKeyTypes: kMapKey,
         vApi_z: SettingsNS.FrontendSettingCache | null ]
  }
  /** cache */ z: SettingsNS.FrontendSettingCache | null
  /** @see {../content/scroller.ts#$sc} */ $: (element: SafeElement | null, di: ScrollByY, amount: number
      , options?: CmdOptions[kFgCmd.scroll]) => void | boolean | number | Promise<boolean | number> | null
}

declare var VimiumInjector: VimiumInjectorTy | undefined | null // eslint-disable-line no-var

declare const enum kContentCmd {
  _fake = 0,
  AutoReportKnownAtOnce_not_ff = 1,
  ManuallyReportKnownAtOnce = 2,
  ShowPicker_cr_mv3 = 3,
  _minSuppressClickable = 4,
  // see injected_end.ts for difference between Destroy and SuppressClickable
  SuppressClickable = 5,
  Destroy = 6,
  MaskedBitNumber = 3,
}
type ContentCommandsNotSuppress = kContentCmd.AutoReportKnownAtOnce_not_ff | kContentCmd.ManuallyReportKnownAtOnce
    | kContentCmd.ShowPicker_cr_mv3
type ValidContentCommands = Exclude<kContentCmd, kContentCmd._fake | kContentCmd._minSuppressClickable
    | kContentCmd.MaskedBitNumber> | ContentCommandsNotSuppress
type SecondLevelContentCmds = ContentCommandsNotSuppress | kContentCmd.Destroy

declare const enum TimerID { None = 0, Valid = 42, Timeout = "43", Interval = "44", __mask = "" }
type ValidTimeoutID = 0 | 42 | "43"
type ValidIntervalID = 0 | 42 | "44"

declare const enum kTY { str = 0, obj = 1, func = 2, num = 3 }

interface KnownDataset {
  vimium: string // secret of extend click; or prefix and suffix in the Find HUD
  vimiumHints: "ordinal" | string // order of link hints in filter-hint mode
  local: string // on the signal element of Marks
  jsarwt?: "1" // google search results (2021-12-24)
  s: string // used by help dialog
  h: string // used by help dialog
  vimUrl: string // used in HintMode.{COPY_URL,DOWNLOAD_LINK}
  vimText: string
  src: string // used in getMediaUrl
  href: string // used in HintMode.{COPY_URL,DOWNLOAD_LINK}
  canonicalSrc: string // used in HintMode.{OPEN_IMAGE,COPY_IMAGE,DOWNLOAD_MEDIA}
}

declare const enum kElRef {
  lastHovered = 1, lastEditable, lastEditable2, lastClicked, currentScrolling
}
