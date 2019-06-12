declare const enum ShadowRootListenType {
  None = 0,
  Blur = 1,
  Full = 2,
}
interface ShadowRoot {
  vimiumListened?: ShadowRootListenType;
}

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
  Esc = 3,
  ExitPassMode = 4,
}
declare const enum VisibilityType {
  Visible = 0,
  OutOfView = 1,
  NoSpace = 2,
}
declare namespace HandlerNS {
  type Event = KeyboardEvent;

  interface Handler<T extends object> {
    (this: T, event: HandlerNS.Event): HandlerResult;
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
 * Note .role does not exist on C35
 */
type NodeToElement = TypeToAssert<Node, Element, "tagName", "nodeType">;
/**
 * Tested on C74, comparing HTMLElement/SVGElement | Element, there're only 5 properties which can be used:
 * * attributeStyleMap: StylePropertyMap | null,
 * * dataset: DOMStringMap | undefined, style: CSSStyleDeclaration | undefined,
 * * nonce: string | undefined, tabIndex: number | undefined
 *
 * While C++ wrappers should be avoided, so select "nonce" / "tabIndex". "focus" / "blur" may also be used.
 * But, "nonce" occurred very late (about C61) and does not exist on Firefox.
 */
type ElementToHTMLorSVG = TypeToAssert<Element, HTMLElement | SVGElement, "tabIndex", "tagName">;
/**
 * Document & HTMLElement & SVGStyleElement have string .title;
 * only HTMLElement has a string  .lang;
 * and, in cs.chromium.org, .title is faster than .tabIndex during C++ DOM parts
 */
type ElementToHTML = TypeToAssert<Element, HTMLElement, "lang", "tagName">;

interface SafeElement extends Element {
  tagName: string;
}
type BaseSafeHTMLElement = HTMLElement & SafeElement;
interface SafeHTMLElement extends BaseSafeHTMLElement {
  readonly innerText: string;
  readonly parentElement: Element | null;
  readonly parentNode: Node | null;
}
type SaferType<Ty> = Ty extends HTMLElement ? SafeHTMLElement : Ty extends Element ? SafeElement : Ty;
interface LockableElement extends SafeHTMLElement {
}

interface EventControlKeys {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface WritableRect {
  [0]: number; // left
  [1]: number; // top
  [2]: number; // right
  [3]: number; // bottom
}
interface Rect extends WritableRect {
  readonly [0]: number; // left
  readonly [1]: number; // top
  readonly [2]: number; // right
  readonly [3]: number; // bottom
}
interface Point2D extends Array<number> {
  readonly [0]: number;
  readonly [1]: number;
}

interface ViewOffset {
  readonly [0]: number; // left
  readonly [1]: number; // top
}

interface ViewBox extends ViewOffset {
  readonly [2]: number; // width
  readonly [3]: number; // height
  readonly [4]: number; // max-left or 0
}

declare const enum HookAction {
  Install = 0,
  SuppressActivateOnDocument = 1,
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
  Editbox = 3,
  input_ = 4,
  rich_ = 5,
}

declare const enum SelType {
  None = 0,
  Caret = 1,
  Range = 2,
}

declare namespace HintsNS {
  interface MarkerElement extends HTMLSpanElement {
    readonly childNodes: NodeListOf<HTMLSpanElement | Text>
  }
  interface BaseHintItem {
    marker_: MarkerElement;
    target_: Hint[0];
  }

  interface HintItem extends BaseHintItem {
    key_: string;
    refer_: HTMLElementUsingMap | Hint[0] | null;
    zIndex_?: number;
  }

  interface InputHintItem extends BaseHintItem {
    target_: SafeHTMLElement;
  }
}

declare namespace FindNS {
  const enum Action {
    PassDirectly = -1,
    DoNothing = 0, Exit, ExitNoAnyFocus, ExitNoFocus, ExitUnexpectedly,
    ExitToPostMode, ExitAndReFocus,
    MaxExitButNoWork = ExitUnexpectedly, MinExitAndwork = ExitToPostMode,
  }
  interface ExecuteOptions extends Partial<Pick<CmdOptions[kFgCmd.findMode], "n">> {
    noColor?: boolean;
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
  interface BaseFgOptions extends Pick<CmdOptions[kFgCmd.vomnibar], "s" | "t"> {
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
  type Msg<T extends (kCReq | kFReq) & number> = { N: T };

  const enum kCReq {
    activate, hide, focus, backspace,
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
    [kCReq.backspace]: kCReq.backspace;
  }
  interface FReq {
    [kFReq.hide]: {
    };
    [kFReq.scroll]: {
      /** keyCode */ keyCode: kKeyCode;
    };
    [kFReq.style]: {
      // unit: physical pixel (if C<52)
      h: number;
      m?: number;
    };
    [kFReq.hud]: { t: string; };
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
    sameOrigin?: true;
    postMessage<K extends keyof FReq> (this: IframePort, msg: FReq[K] & Msg<K>): void | 1;
    onmessage (this: void, msg: { data: CReq[keyof CReq] }): void | 1;
  }
  type FgOptionsToFront = CReq[kCReq.activate];
  const enum PixelData {
    MarginTop = 64,
    InputBar = 54, InputBarWithLine = InputBar + 1,
    Item = 44, LastItemDelta = 46 - Item,
    MarginV1 = 9, MarginV2 = 10, MarginV = MarginV1 + MarginV2,
    OthersIfEmpty = InputBar + MarginV,
    OthersIfNotEmpty = InputBarWithLine + MarginV + LastItemDelta,
    ListSpaceDelta = MarginTop + MarginV1
      + InputBarWithLine + LastItemDelta + ((MarginV2 / 2) | 0) + GlobalConsts.MaxScrollbarWidth,
    MarginH = 24, AllHNotUrl = 20 * 2 + 20 + 2 + MarginH,
    MeanWidthOfMonoFont = 7.7, MeanWidthOfNonMonoFont = 4,
    WindowSizeX = 0.8, AllHNotInput = AllHNotUrl,
  }
}

declare type ScrollByY = 0 | 1;

interface HintOffset {
  [0]: Rect; // rect of the hint below this marker
  [1]: number; // offset-x
}

type HTMLElementUsingMap = HTMLImageElement | HTMLObjectElement;
interface Hint {
  [0]: SafeHTMLElement | SVGElement; // element
  [1]: Rect; // bounding rect
  [2]: number; // priority (smaller is prior)
  [3]?: HintOffset;
  [4]?: HTMLElementUsingMap;
  length: number;
}
interface Hint4 extends Hint {
  [3]: HintOffset;
}
interface Hint5 extends Hint4 {
  [4]: HTMLElementUsingMap; // fixed rect
}

declare const enum AdjustType {
  /** Note(gdh1995): NotAdjust must be used carefully: @see {@link dom_ui.ts#VDom.UI.add_ : VDom.UI.css_} */
  Normal = 0,
  MustAdjust = 1,
  NotAdjust = 2,
  DEFAULT = Normal,
}

type VimiumContainerElementType = "div" | "span" | "style" | "iframe" | "a" | "script" | "dialog";
/** ShadowRoot | HTMLDivElement */
type VUIRoot = ShadowRoot | (HTMLDivElement & { mode?: undefined });

interface MyMouseControlKeys { altKey_: boolean; ctrlKey_: boolean; metaKey_: boolean; shiftKey_: boolean; }

interface DomUI {
  box_: HTMLDivElement & SafeHTMLElement | null;
  styleIn_: HTMLStyleElement | string | null;
  styleOut_: HTMLStyleElement | null;
  /** `!!@UI` must keep the same as `!!@box_`*/
  UI: VUIRoot;
  _lastFlash: HTMLElement | null;
  /** only exists under DEBUG mode */ flashTime?: number;
  add_<T extends HTMLElement>(this: DomUI, element: T, adjust?: AdjustType, before?: Element | null | true): void;
  addElementList_<T extends boolean | BOOL>(this: DomUI, els: ReadonlyArray<HintsNS.BaseHintItem>,
    offset: ViewOffset, dialogContainer?: T | null
    ): (T extends true | 1 ? HTMLDialogElement : HTMLDivElement) & SafeElement;
  adjust_ (this: void, event?: Event | /* enable */ 1 | /* disable */ 2): void;
  cssPatch_: [string, (css: string) => string] | null;
  ensureBorder_ (this: DomUI, zoom?: number): void;
  createStyle_ (this: DomUI, text?: string, css?: HTMLStyleElement): HTMLStyleElement;
  css_ (this: DomUI, innerCSS: string): void;
  getDocSelectable_ (this: DomUI): boolean;
  toggleSelectStyle_ (this: DomUI, enable: BOOL): void;
  getSelected_ (this: DomUI, notExpectCount?: 1): [Selection, ShadowRoot | null];
  getSelectionText_ (notTrim?: 1): string;
  removeSelection_ (this: DomUI, root?: VUIRoot): boolean;
  click_ (this: DomUI, element: Element
    , rect?: Rect | null, modifiers?: MyMouseControlKeys | null, addFocus?: boolean
    , button?: 0 | 2, touchMode?: /** default: auto */ null | boolean | /** false */ 0): void;
  simulateSelect_ (this: DomUI, element: Element, rect?: Rect | null, flash?: boolean
    , action?: SelectActions, suppressRepeated?: boolean): void;
  /** @NEED_SAFE_ELEMENTS */
  _moveSel_need_safe (this: DomUI, element: LockableElement, action: SelectActions | undefined): void;
  getRect_ (this: void, clickEl: Element, refer?: HTMLElementUsingMap | null): Rect | null;
  flash_ (this: DomUI, el: null, rect: Rect, lifeTime?: number, classNames?: string): void;
  flash_ (this: DomUI, el: Element): void;
}

interface VDomMouse {
  (element: Element, type: "mousedown" | "mouseup" | "click"
    , rect: Point2D // rect must be not optional, so that human can understand program logic easily
    , modifiers?: MyMouseControlKeys | null, related?: Element | null, button?: 0 | 2): boolean;
  (element: Element, type: "mouseover" | "mouseenter", rect: Point2D
    , modifiers?: null, related?: Element | null): boolean;
  (element: Element, type: "mouseout" | "mouseleave", rect: Point2D
    , modifiers?: null, related?: Element | null): boolean;
}
interface VPortTy {
  post_<K extends keyof SettingsNS.FrontUpdateAllowedSettings>(this: void, req: SetSettingReq<K>): void | 1;
  post_<K extends keyof FgReq>(this: void, req: FgReq[K] & Req.baseFg<K>): void | 1;
  send_<K extends keyof FgRes>(this: void, cmd: K, args: Req.fgWithRes<K>["a"]
    , callback: (this: void, res: FgRes[K]) => void): void;
  evalIfOK_ (url: string): boolean;
}
interface ComplicatedVPort extends VPortTy {
  post_<K extends keyof FgReq, T extends FgReq[K]>(this: void, req: T & Req.baseFg<K>): void | 1;
}
interface VEventModeTy {
  lock_(this: void): LockableElement | null;
  isCmdTriggered_ (this: void): BOOL;
  OnWndFocus_ (this: void): void;
  checkHidden_ (this: void): BOOL;
  /** may focus the parent frame before returning */
  checkHidden_ (this: void, cmd: FgCmdAcrossFrames
      , count: number, opts: NonNullable<FgReq[kFgReq.gotoMainFrame]['a']>): BOOL;
  focusAndRun_ (this: void): void;
  focusAndRun_ (this: void, cmd: FgCmdAcrossFrames
      , count: number, options: FgOptions
      , showBorder?: 1): void;
  focusAndRun_ (this: void, cmd: 0, count: never, options: never, showBorder: 1): void;
  onWndBlur_ (this: void, onWndBlur2: ((this: void) => void) | null): void;
  setupSuppress_ (this: void, onExit?: (this: void) => void): void;
  mapKey_ (this: void, key: string): string;
  scroll_ (this: void, event?: Partial<EventControlKeys> & { keyCode: kKeyCode }, wnd?: Window): void;
  /** return has_error */
  readonly keydownEvents_: {
    (this: void, srcFrame: Pick<VEventModeTy, "keydownEvents_"> | KeydownCacheArray): boolean;
    (this: void): KeydownCacheArray;
  };
  readonly OnScrolls_: {
    0: (this: void, event: KeyboardEvent) => boolean;
    1: (wnd: Window, isAdd: BOOL) => void;
    2: (this: Window, event: KeyboardEvent & {type: "keyup"} | Event & {type: "blur"}) => void;
  };
  execute_: ((this: void, cmd: ValidContentCmds) => void) | null;
  destroy_: (this: void, silent?: boolean | BOOL | 9) => void;
}
interface VHUDTy {
  readonly box_: HTMLDivElement | null;
  readonly text_: string;
  readonly opacity_: 0 | 0.25 | 0.5 | 0.75 | 1;
  show_ (text: string, embed?: boolean): void;
  /** duration is default to 1500 */
  tip_ (text: string, duration?: number): void;
  copied_ (this: VHUDTy, text: string, type: string, virtual: true): string;
  copied_ (this: VHUDTy, text: string, type?: string): void;
  hide_ (this: void, info?: TimerType): void;
}
declare var VimiumInjector: VimiumInjectorTy | undefined | null, VEvent: VEventModeTy;

interface VDataTy {
  full: string;
}

declare const enum kContentCmd {
  _fake = 0,
  FindAllOnClick = 1,
  _minNotDispatchDirectly = 4,
  SuppressClickable = 5,
  Destroy = 6,
  DestroyForCSP = 7,
  MaskedBitNumber = 3,
}
type ValidContentCmds = Exclude<kContentCmd, kContentCmd._fake | kContentCmd._minNotDispatchDirectly
    | kContentCmd.MaskedBitNumber>;

interface ContentWindowCore {
  readonly VDom?: object;
  readonly VKey?: object;
  readonly VHints?: object;
  readonly VScroller?: object;
  readonly VOmni?: object;
  readonly VFind?: { css_: FindCSS | null; };
  readonly VEvent?: VEventModeTy;
  readonly VRand?: number | string;
  readonly VSec?: number | string | null;
  readonly self: Window;
}

interface SandboxGetterFunc {
  (secret: number | string): ContentWindowCore | 0 | null | undefined;
}
declare var wrappedJSObject: { [key: string]: SandboxGetterFunc; };
declare var XPCNativeWrapper: <T extends object> (wrapped: T) => XrayedObject<T>;
type XrayedObject<T extends object> = T & {
  wrappedJSObject?: T;
}

interface Window extends ContentWindowCore {
  wrappedJSObject: typeof wrappedJSObject;
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
