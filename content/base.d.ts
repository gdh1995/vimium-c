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
  // for `<c-[>`, do nothing advanced; but treat any mapped `<esc>` as a plain `<esc>` (apply `AdvancedFlag`)
  AdvancedEscFlag = 8,
  AdvancedEscEnum = 11, // `Esc | 8`
}
declare const enum VisibilityType {
  Visible = 0,
  OutOfView = 1,
  NoSpace = 2,
}
declare namespace HandlerNS {
  type Event = KeyboardEventToPrevent;

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
  nodeName: string;
  localName: string;
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
  interface MarkerElement extends HTMLSpanElement {
    readonly childNodes: NodeListOf<HTMLSpanElement | Text>
  }
  interface BaseHintItem {
    marker_: MarkerElement;
    dest_: Hint[0];
  }

  interface HintItem extends BaseHintItem {
    key_: string;
    refer_: HTMLElementUsingMap | Hint[0] | null;
    zIndex_?: number;
  }

  interface InputHintItem extends BaseHintItem {
    dest_: SafeHTMLElement;
  }
}

declare namespace FindNS {
  const enum Action {
    PassDirectly = -1,
    DoNothing = 0, Exit, ExitNoAnyFocus, ExitNoFocus, ExitUnexpectedly,
    ExitToPostMode, ExitAndReFocus,
    MaxExitButNoWork = ExitUnexpectedly, MinExitAndWork = ExitToPostMode,
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
      /** keyCode */ keyCode: kKeyCode;
    };
    [kFReq.style]: {
      // unit: physical pixel (if C<52)
      h: number;
      m?: number;
    };
    [kFReq.hud]: { k: kTip, t: string; };
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
  /** Note(gdh1995): NotAdjust must be used carefully: @see {@link dom_ui.ts#VCui.add_ : VCui.css_} */
  Normal = 0,
  MustAdjust = 1,
  NotAdjust = 2,
  DEFAULT = Normal,
}

type VimiumContainerElementType = "div" | "span" | "style" | "iframe" | "a" | "script" | "dialog";
/** ShadowRoot | HTMLDivElement */
type VUIRoot = ShadowRoot | (HTMLDivElement & { mode?: undefined });

interface MyMouseControlKeys { altKey_: boolean; ctrlKey_: boolean; metaKey_: boolean; shiftKey_: boolean; }

interface ComplicatedVPort extends VApiTy {
  post_<K extends keyof FgReq, T extends FgReq[K]>(this: void, req: T & Req.baseFg<K>): void | 1;
}
interface VApiTy {
  post_<K extends keyof SettingsNS.FrontUpdateAllowedSettings>(this: void, req: SetSettingReq<K>): void | 1;
  post_<K extends keyof FgReq>(this: void, req: FgReq[K] & Req.baseFg<K>): void | 1;
  send_<K extends keyof FgRes>(this: void, cmd: K, args: Req.fgWithRes<K>["a"]
    , callback: (this: void, res: FgRes[K]) => void): void;
  evalIfOK_ (url: string): boolean;

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
  mapKey_ (this: void, char: string, event: EventControlKeys, onlyChar?: string): string;
  /** return has_error */
  readonly keydownEvents_: {
    (this: void, srcFrame: Pick<VApiTy, "keydownEvents_"> | KeydownCacheArray): boolean;
    (this: void): KeydownCacheArray;
  };
  execute_: ((this: void, cmd: ValidContentCommands) => void) | null;
  destroy_: (this: void, silent?: boolean | BOOL | 9) => void;
}
interface VHUDTy {
  readonly box_: HTMLDivElement | null;
  readonly t: string;
  readonly opacity_: 0 | 0.25 | 0.5 | 0.75 | 1;
  show_ (tid: kTip | HintMode, text: string, args?: Array<string | number>, embed?: boolean): void;
  /** duration is default to 1500 */
  tip_ (tid: kTip | HintMode, text: string, duration?: number, args?: Array<string | number>): void;
  copied_ (text: string, type: string, virtual: 1): string;
  copied_ (text: string, type?: "url" | ""): void;
  hide_ (this: void, info?: TimerType): void;
}
declare var VimiumInjector: VimiumInjectorTy | undefined | null, VApi: VApiTy;

interface VDataTy {
  full: string;
}

declare const enum kTip {
  /* 4..15 is not used by HintMode */
  /* 4..9 */ didUnHoverLast = 4, globalInsertMode, noPassKeys, normalMode, nTimes, passNext,
  /* 10..15 */ noLinksToGo, noFocused, focusedIsHidden, noInputToFocus, noUrlCopied, noTextCopied,
  /* 20..25 */ copiedIs = 20, failToEvalJS, blockAutoFocus, useVal, turnOn, turnOff,
  /* 26..31 */ nMatches, oneMatch, someMatches, noMatches, modalHints, haveToOpenManually,
  raw = 69, START_FOR_OTHERS = raw,
  /* 70: */ fewChars = 70, noLinks, exitForIME, linkRemoved, notImg,
  /* 75: */ hoverScrollable, ignorePassword, noNewToCopy, downloaded, nowGotoMark,
  /* 80: */ nowCreateMark, didCreateLastMark, didLocalMarkTask, didJumpTo, didCreate,
  /* 85: */ lastMark, didNormalMarkTask, findFrameFail, noOldQuery, noMatchFor,
  /* 90: */ visualMode, noUsableSel, loseSel, needSel, omniFrameFail,
  /* 95: */ failToDelSug, firefoxRefuseURL, cancelImport, importOK,
}
type VTransType = (tid: kTip | HintMode | string, fallback?: string, args?: Array<string | number>) => string;

declare const enum kContentCmd {
  _fake = 0,
  FindAllOnClick = 2,
  _minNotDispatchDirectly = 4,
  SuppressClickable = 5,
  Destroy = 6,
  DestroyForCSP = 7,
  MaskedBitNumber = 3,
  SecretRange = 9e7,
}
type ValidContentCommands = Exclude<kContentCmd, kContentCmd._fake | kContentCmd._minNotDispatchDirectly
    | kContentCmd.MaskedBitNumber>;

interface ContentWindowCore {
  readonly VDom?: object;
  readonly VKey?: object;
  readonly VHints?: object;
  readonly VSc?: object;
  readonly VOmni?: object;
  readonly VFind?: object;
  readonly VApi?: VApiTy;
  readonly VIh?: (this: void) => number;
}

interface SandboxGetterFunc {
  (comparer: (this: void, rand2: number, testEncrypted: string) => boolean,
    rand1: number): ContentWindowCore | 0 | null | undefined | void;
}
interface SandboxGetterWrapper { _get: SandboxGetterFunc; }
declare var wrappedJSObject: { [key: string]: SandboxGetterWrapper; };
declare var XPCNativeWrapper: <T extends object> (wrapped: T) => XrayedObject<T>;
type XrayedObject<T extends object> = T & {
  wrappedJSObject?: T;
}

interface Window extends ContentWindowCore {
  readonly VOther?: BrowserType;
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
