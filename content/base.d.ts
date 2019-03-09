interface Element {
  vimiumHasOnclick?: boolean;
}
declare const enum ShadowRootListenType {
  None = 0,
  Blur = 1,
  Full = 2,
}
interface ShadowRoot {
  vimiumListened?: ShadowRootListenType;
}

interface Window {
  VimiumInjector?: VimiumInjector | null;
  VSettings: VSettingsTy | null;
  readonly VKeyboard?: {
    char_ (event: KeyboardEvent): string;
    key_ (event: EventControlKeys, ch: string): string;
  };
  readonly VDom?: {
    readonly UI: DomUI;
    view_ (el: Element, oldY?: number | undefined): boolean;
  };
  readonly VFind?: { css_: FindCSS | null; };
}
declare const enum HandlerResult {
  PassKey = -1,
  Nothing = 0,
  Default = Nothing,
  MinStopOrPreventEvents = 1,
  Suppress = 1,
  MaxNotPrevent = 1,
  Prevent = 2,
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

interface SafeElement extends Element {
  tagName: string;
}
type BaseLockableElement = HTMLElement & SafeElement;
/** must extend `SafeElement` */
interface LockableElement extends BaseLockableElement {
}
type SafeHTMLElement = HTMLElement & SafeElement;

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
  Suppress = 1,
  Destroy = 2,
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
  Default = 0,
  NotEditable = Default,
  Embed = 1,
  Select = 2,
  Editbox = 3,
  input_ = 4,
  rich_ = 5,
}

declare const enum SelType {
  None = 0,
  Caret = 1,
  Range = 2,
}

declare const enum PixelConsts {
  MaxScrollbarWidth = 24,
  MaxHeightOfLinkHintMarker = 18,
}

declare namespace HintsNS {
  interface BaseHintItem {
    marker: HTMLSpanElement;
    target: Hint[0];
  }

  interface HintItem extends BaseHintItem {
    key: string;
    refer: HTMLElementUsingMap | Hint[0] | null;
    zIndex?: number;
  }
}

declare namespace FindNS {
  const enum Action {
    PassDirectly = -1,
    DoNothing = 0, Exit, ExitNoFocus, ExitUnexpectedly, MinComplicatedExit,
    ExitToPostMode = MinComplicatedExit, ExitAndReFocus,
  }
  interface ExecuteOptions extends Partial<Pick<CmdOptions[kFgCmd.findMode], "count">> {
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
    w: number;
    h: number;
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
    hide, focus, style, uiComponentIsReady,
    hud, evalJS, scroll, scrollGoing, scrollEnd, broken, unload, test,
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
      /** keyCode */ keyCode: VKeyCodes;
    };
    [kFReq.style]: {
      h: number;
      m?: number;
    };
    [kFReq.hud]: { t: string; };
    [kFReq.focus]: {
      k: VKeyCodes;
    };
    [kFReq.evalJS]: {
      u: string;
    };
    [kFReq.broken]: {
      a: boolean;
    };
    [kFReq.scrollEnd]: {},
    [kFReq.scrollGoing]: {},
    [kFReq.unload]: {},
    [kFReq.test]: {},
    [kFReq.uiComponentIsReady]: {};
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
    MaxScrollbarWidth = PixelConsts.MaxScrollbarWidth,
    ListSpaceDelta = MarginTop + MarginV1 + InputBarWithLine + LastItemDelta + ((MarginV2 / 2) | 0) + MaxScrollbarWidth,
    MarginH = 24, AllHNotUrl = 20 * 2 + 20 + 2 + MarginH, MeanWidthOfChar = 7.7,
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

declare function setInterval(this: void, handler: (this: void, info?: TimerType) => void, timeout: number): number;

type VimiumContainerElementType = "div" | "span" | "style" | "iframe" | "a" | "script" | "dialog";
/** ShadowRoot | HTMLDivElement */
type VUIRoot = ShadowRoot | (HTMLDivElement & { mode?: undefined });
interface DomUI {
  box_: HTMLDivElement | null;
  styleIn_: HTMLStyleElement | string | null;
  styleOut_: HTMLStyleElement | null;
  /** `!!@UI` must keep the same as `!!@box_`*/
  UI: VUIRoot;
  flashLastingTime_: number;
  _lastFlash: HTMLElement | null;
  add_<T extends HTMLElement>(this: DomUI, element: T, adjust?: AdjustType, before?: Element | null | true): void;
  addElementList_<T extends boolean>(this: DomUI, els: ReadonlyArray<HintsNS.BaseHintItem>,
    offset: ViewOffset, dialogContainer?: T | null
    ): (T extends true ? HTMLDialogElement : HTMLDivElement) & SafeElement;
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
    , rect?: Rect | null, modifiers?: EventControlKeys | null, addFocus?: boolean): boolean;
  simulateSelect_ (this: DomUI, element: Element, rect?: Rect | null, flash?: boolean
    , action?: SelectActions, suppressRepeated?: boolean): void;
  /** @NEED_SAFE_ELEMENTS */
  _moveSel_unsafe_ (this: DomUI, element: LockableElement, action: SelectActions | undefined): void;
  getRect_ (this: void, clickEl: Element, refer?: HTMLElementUsingMap | null): Rect | null;
  flash_ (this: DomUI, el: null, rect: Rect): HTMLElement;
  flash_ (this: DomUI, el: Element): HTMLElement | void;
  suppressTail_ (this: void, onlyRepeated: boolean): void;
  SuppressMost_: HandlerNS.Handler<{}>;
}

interface VDomMouse {
  (element: Element, type: "mousedown" | "mouseup" | "click"
    , rect: Rect | null // rect must be not optional, so that human can understand program logic easily
    , modifiers?: EventControlKeys | null, related?: Element | null): boolean;
  (element: Element, type: "mouseover", rect: Rect | null
    , modifiers?: null, related?: Element | null): boolean;
  (element: Element, type: "mouseout", rect?: null
    , modifiers?: null, related?: Element | null): boolean;
}
interface VPortTy {
  post_<K extends keyof SettingsNS.FrontUpdateAllowedSettings>(this: void, req: SetSettingReq<K>): void | 1;
  post_<K extends keyof FgReq>(this: void, req: FgReq[K] & Req.baseFg<K>): void | 1;
  send_<K extends keyof FgRes>(this: void, req: Pick<Req.fgWithRes<K>, "a" | "c">
    , callback: (this: void, res: FgRes[K]) => void): void;
  evalIfOK_ (url: string): boolean;
}
interface ComplicatedVPort extends VPortTy {
  post_<K extends keyof FgReq, T extends FgReq[K]>(this: void, req: T & Req.baseFg<K>): void | 1;
}
interface VEventModeTy {
  lock_(this: void): LockableElement | null;
  suppress_(keyCode?: VKeyCodes): void;
  OnWndFocus_ (this: void): void;
  checkHidden_ (this: void): boolean;
  checkHidden_ (this: void, cmd: kFgCmd, count: number, opts: NonNullable<FgReq[kFgReq.gotoMainFrame]['a']>): boolean;
  focusAndListen_ (this: void, callback?: (() => void) | null, timedout?: 0): void;
  focus_ (this: void, request: BgReq[kBgReq.focusFrame]): void;
  onWndBlur_ (this: void, onWndBlur: ((this: void) => void) | null): void;
  setupSuppress_ (this: void, onExit?: (this: void) => void): void;
  mapKey_ (this: void, key: string): string;
  scroll_ (this: void, event?: Partial<EventControlKeys> & { keyCode: VKeyCodes }, wnd?: Window): void;
  /** return has_error */
  readonly keydownEvents_: {
    (this: void, newArr: KeydownCacheArray): boolean;
    (this: void): KeydownCacheArray;
  };
  readonly OnScrolls_: {
    0: (this: void, event: KeyboardEvent) => BOOL | 28;
    1: (wnd: Window, interval?: number) => void;
    2: (this: Window, event: KeyboardEvent & {type: "keyup"} | Event & {type: "blur"}) => void;
  } 
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
interface VSettingsTy {
  readonly enabled_: boolean;
  readonly cache: SettingsNS.FrontendSettingCache;
  stop_: ((this: void, type: HookAction.Suppress | HookAction.Destroy) => void) | null;
  readonly destroy_: (this: void, silent?: boolean) => void;
}
declare var VimiumInjector: VimiumInjector | undefined | null, VSettings: VSettingsTy;
declare var browser: unknown;

interface VDataTy {
  full: string;
}
