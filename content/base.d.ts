interface Element {
  vimiumHasOnclick?: boolean;
}

interface Window {
  VimiumInjector?: VimiumInjector | null;
  VSettings: VSettings | null;
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

interface EventControlKeys {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface WritableVRect {
  [0]: number; // left
  [1]: number; // top
  [2]: number; // right
  [3]: number; // bottom
}
interface VRect extends WritableVRect {
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

declare const enum EditableType {
  Default = 0,
  NotEditable = Default,
  Embed = 1,
  Select = 2,
  Editbox = 3,
  input_ = 4,
  rich_ = 5,
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
  interface ExecuteOptions {
    count?: number;
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
  interface GlobalOptions {
    mode: string;
    newtab: boolean;
    /** @deprecated */
    force: boolean;
    keyword: string;
  }
  interface BaseFgOptions {
    width: number;
    height: number;
    search: "" | FgRes["parseSearchUrl"];
    ptype: PageType;
  }
  interface FgOptions extends BaseFgOptions, Partial<GlobalOptions> {
    url?: string | null;
    script: string;
  }
  type MessageData = [number, FgOptions | null];
  type Msg<T extends string> = { name: T };

  interface CReq {
    activate: FgOptions & Msg<"activate">;
    hide: "hide";
    focus: "focus";
    backspace: "backspace";
  }
  interface FReq {
    hide: {
    };
    scroll: {
      keyCode: VKeyCodes;
    };
    style: {
      height: number;
      max?: number;
    };
    hud: { text: string; };
    focus: {
      key: VKeyCodes;
    };
    evalJS: {
      url: string;
    };
    broken: {
      active: boolean;
    };
    scrollEnd: {},
    scrollGoing: {},
    unload: {},
    test: {},
    uiComponentIsReady: {};
  }
  interface IframePort {
    sameOrigin?: true;
    postMessage<K extends keyof FReq> (this: IframePort, msg: FReq[K] & Msg<K>): void | 1;
    onmessage<K extends keyof CReq> (this: void, msg: { data: CReq[K] }): void | 1;
  }
  type FgOptionsToFront = CReq["activate"];
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
  [0]: VRect; // rect of the hint below this marker
  [1]: number; // offset-x
}

type HTMLElementUsingMap = HTMLImageElement | HTMLObjectElement;
interface Hint {
  [0]: HTMLElement | SVGElement; // element
  [1]: VRect; // bounding rect
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
  NotAdjust = 0,
  Normal = 1,
  MustAdjust = 2,
  AdjustButNotShow = 3,
  DEFAULT = Normal,
}

declare function setInterval(this: void, handler: (this: void, info?: TimerType) => void, timeout: number): number;

/** ShadowRoot | HTMLDivElement */
type VUIRoot = ShadowRoot | (HTMLDivElement & { mode?: undefined });
interface DomUI {
  box_: HTMLDivElement | null;
  styleIn_: HTMLStyleElement | string | null;
  styleOut_: HTMLStyleElement | null;
  /** `!!@R` must keep the same as `!!@box_`*/ R: VUIRoot;
  callback_: null | ((this: void) => void);
  flashLastingTime_: number;
  _lastFlash: HTMLElement | null;
  addElement_<T extends HTMLElement>(this: DomUI, element: T, adjust?: AdjustType, before?: Element | null | true): T;
  addElementList_(this: DomUI, els: ReadonlyArray<HintsNS.BaseHintItem>, offset: ViewOffset): HTMLDivElement;
  adjust_ (this: void, event?: Event): void;
  toggle_ (this: DomUI, enabled: boolean): void;
  _styleBorder: { el_: HTMLStyleElement, zoom_: number } | null;
  ensureBorder_ (this: DomUI, zoom?: number): void;
  createStyle_ (this: DomUI, text: string, doc?: { createElement: Document["createElement"] }): HTMLStyleElement;
  css_ (this: DomUI, innerCSS: string): void;
  getDocSelectable_ (this: DomUI): boolean;
  toggleSelectStyle_ (this: DomUI, enable: boolean): void;
  getSelection_ (this: DomUI): Selection;
  getSelectionText_ (notTrim?: 1): string;
  removeSelection_ (this: DomUI, root?: VUIRoot): boolean;
  click_ (this: DomUI, element: Element, rect?: VRect | null, modifiers?: EventControlKeys | null, addFocus?: boolean): boolean;
  simulateSelect_ (this: DomUI, element: Element, rect?: VRect | null, flash?: boolean
    , action?: SelectActions, suppressRepeated?: boolean): void;
  moveSel_ (this: DomUI, element: Element, action: SelectActions | undefined): void;
  getVRect_ (this: void, clickEl: Element, refer?: HTMLElementUsingMap | null): VRect | null;
  flash_ (this: DomUI, el: null, rect: VRect): number;
  flash_ (this: DomUI, el: Element): HTMLElement | void;
  suppressTail_ (this: void, onlyRepeated: boolean): void;
  SuppressMost_: HandlerNS.Handler<{}>;
}

interface VDomMouse {
  (element: Element, type: "mousedown" | "mouseup" | "click"
    , rect: VRect | null // rect must be not optional, so that human can understand program logic easily
    , modifiers?: EventControlKeys | null, related?: Element | null): boolean;
  (element: Element, type: "mouseover", rect: VRect | null
    , modifiers?: null, related?: Element | null): boolean;
  (element: Element, type: "mouseout", rect?: null
    , modifiers?: null, related?: Element | null): boolean;
}
interface VPort {
  post<K extends keyof SettingsNS.FrontUpdateAllowedSettings>(this: void, req: SetSettingReq<K>): void | 1;
  post<K extends keyof FgReq>(this: void, req: FgReq[K] & Req.baseFg<K>): void | 1;
  send_<K extends keyof FgRes>(this: void, req: FgReqWithRes[K] & { msg: K; }
    , callback: (this: void, res: FgRes[K]) => void): void;
  evalIfOK_ (url: string): boolean;
}
interface ComplicatedVPort extends VPort {
  post<K extends keyof FgReq, T extends FgReq[K]>(this: void, req: T & Req.baseFg<K>): void | 1;
}
interface VEventMode {
  lock(this: void): Element | null;
  suppress_(keyCode?: VKeyCodes): void;
  OnWndFocus_ (this: void): void;
  focusAndListen_ (this: void, callback?: (() => void) | null, timedout?: 0): void;
  focus_ (this: void, request: BgReq[kBgReq.focusFrame]): void;
  onWndBlur_ (this: void, onWndBlur: ((this: void) => void) | null): void;
  setupSuppress_ (this: void, onExit?: (this: void) => void): void;
  mapKey_ (this: void, key: string): string;
  scroll_ (this: void, event?: Partial<EventControlKeys & { keyCode: VKeyCodes }>, wnd?: Window): void;
  /** return has_error */
  keydownEvents: {
    (this: void, newArr: KeydownCacheArray): boolean;
    (this: void): KeydownCacheArray;
  };
  OnScrolls_: {
    0: (this: void, event: KeyboardEvent) => BOOL | 28;
    1: (wnd: Window, interval?: number) => void;
    2: (this: Window, event: KeyboardEvent & {type: "keyup"} | Event & {type: "blur"}) => void;
  } 
}
interface VHUD {
  box_: HTMLDivElement | null;
  text_: string;
  opacity_: 0 | 0.25 | 0.5 | 0.75 | 1;
  show_ (text: string, embed?: boolean): void;
  /** duration is default to 1500 */
  tip (text: string, duration?: number): void;
  copied (text: string, type: string, virtual: true): string;
  copied (text: string, type?: string): void;
  hide_ (this: void, info?: TimerType): void;
}
interface VSettings {
  enabled_: boolean;
  cache: SettingsNS.FrontendSettingCache;
  uninit_: ((this: void, type: HookAction.Suppress | HookAction.Destroy) => void) | null;
  destroy (this: void, silent?: boolean): void;
}
declare var VimiumInjector: VimiumInjector, VSettings: VSettings;
declare var browser: unknown;
