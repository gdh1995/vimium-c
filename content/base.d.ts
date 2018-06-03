interface Element {
  vimiumHasOnclick?: boolean;
}

interface FgOptions extends SafeDict<any> {}

interface Window {
  VimiumInjector?: VimiumInjector;
  VSettings: VSettings | null;
}
interface VimiumInjector {
  id: string;
  alive: 0 | 0.5 | 1;
  destroy: ((this: void, silent?: boolean) => void) | null;
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

declare const enum EditableType {
  Default = 0,
  NotEditable = Default,
  Embed = 1,
  Select = 2,
  Editbox = 3,
  _input = 4,
  _rich = 5,
}

declare const enum PixelConsts {
  MaxScrollbarWidth = 24,
  MaxHeightOfLinkHintMarker = 18,
}

declare namespace HintsNS {
  interface HintItem {
    marker: HTMLSpanElement;
    target: Hint[0];
    key?: string;
    refer?: HTMLElementUsingMap;
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
    Default = -1,
    NotInited = Default,
    Inactive = 0,
    Initing = 1,
    ToShow = 2,
    Showing = 3,
  }
  interface GlobalOptions {
    mode: string;
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
    };
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
    uiComponentIsReady: {};
  }
  interface IframePort {
    sameOrigin?: true;
    postMessage<K extends keyof FReq> (this: void, msg: FReq[K] & Msg<K>): void | 1;
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
    NormalTopHalf = InputBar + Item * 6.5, // the line height makes an odd offset, so ignore it
    ScreenHeightThreshold = (MarginTop + NormalTopHalf) * 2,
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
type SelectActions = "" | "all" | "all-input" | "start" | "end";

declare function setInterval(this: void, handler: (this: void, info?: TimerType) => void, timeout: number): number;

interface DomUI {
  box: HTMLElement | null;
  styleIn: HTMLStyleElement | string | null;
  styleOut: HTMLStyleElement | null;
  root: ShadowRoot | null;
  callback: null | ((this: void) => void);
  flashLastingTime: number;
  _lastFlash: HTMLElement | null;
  addElement<T extends HTMLElement>(this: DomUI, element: T, adjust?: AdjustType, before?: Element | null | true): T;
  addElementList(this: DomUI, els: ReadonlyArray<HintsNS.HintItem>, offset: ViewOffset): HTMLDivElement;
  adjust (this: void, event?: Event): void;
  toggle (this: DomUI, enabled: boolean): void;
  _styleBorder: (HTMLStyleElement & {vZoom?: number}) | null;
  ensureBorder (this: DomUI, zoom?: number): void;
  createStyle (this: DomUI, text: string, doc?: { createElement: Document["createElement"] }): HTMLStyleElement;
  css (this: DomUI, innerCSS: string): void;
  getDocSelectable (this: DomUI): boolean;
  toggleSelectStyle (this: DomUI, enable: boolean): void;
  getSelection (this: DomUI): Selection;
  getSelectionText (notTrim?: 1): string;
  removeSelection (this: DomUI, root?: DocumentOrShadowRoot): boolean;
  click (this: DomUI, element: Element, rect?: VRect | null, modifiers?: EventControlKeys | null, addFocus?: boolean): boolean;
  simulateSelect (this: DomUI, element: Element, rect?: VRect | null, flash?: boolean
    , action?: SelectActions, suppressRepeated?: boolean): void;
  moveSel (this: DomUI, element: Element, action: SelectActions | undefined): void;
  getVRect (this: void, clickEl: Element, refer?: HTMLElementUsingMap): VRect | null;
  flash (this: DomUI, el: null, rect: VRect): number;
  flash (this: DomUI, el: Element): number | void;
  suppressTail (this: void, onlyRepeated: boolean): void;
  SuppressMost: HandlerNS.Handler<object>;
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
  send<K extends keyof FgRes>(this: void, req: FgReq[K] & Req.baseFg<K>
    , callback: (this: void, res: FgRes[K]) => void): void;
}
interface ComplicatedVPort extends VPort {
  post<K extends keyof FgReq, T extends FgReq[K]>(this: void, req: T & Req.baseFg<K>): void | 1;
}
interface FocusListenerWrapper {
  inner: {focus: (this: void, event: FocusEvent) => void, blur: (this: void, event: FocusEvent) => void} | null;
  outer: (this: EventTarget, event: FocusEvent) => void;
  set (this: void, obj: FocusListenerWrapper["inner"]): void;
}
interface VEventMode {
  lock(this: void): Element | null;
  commandCount (this: void): number;
  suppress(keyCode?: VKeyCodes): void;
  OnWndFocus (this: void): void;
  focusAndListen (this: void, callback?: (() => void) | null, timedout?: 0): void;
  focus (this: void, request: BgReq["focusFrame"]): void;
  onWndBlur (this: void, onWndBlur: ((this: void) => void) | null): void;
  setupSuppress (this: void, onExit?: (this: void) => void): void;
  mapKey (this: void, key: string): string;
  scroll (this: void, event?: Partial<EventControlKeys & { keyCode: VKeyCodes }>, wnd?: Window): void;
  /** return has_error */
  keydownEvents (this: void, newArr: KeydownCacheArray): boolean;
  keydownEvents (this: void): KeydownCacheArray;
  OnScrolls: {
    0: (this: any, event: KeyboardEvent) => void | 1;
    1: (this: Window, event: KeyboardEvent) => void;
    2: (this: Window, event: Event) => void;
    3: (wnd: Window, interval?: number) => void;
  } 
}
interface VHUD {
  box: HTMLDivElement | null;
  text: string;
  opacity: 0 | 0.25 | 0.5 | 0.75 | 1;
  show (text: string, nowait?: boolean): void;
  /** duration is default to 1500 */
  showForDuration (text: string, duration?: number): void;
  showCopied (text: string, type: string, virtual: true): string;
  showCopied (text: string, type?: string): void;
  hide (this: void, info?: TimerType): void;
}
interface VSettings {
  enabled: boolean;
  cache: SettingsNS.FrontendSettingCache;
  checkIfEnabled (this: void): void;
  // type: 1: disabled; 2: destroyed
  uninit: ((this: void, type: 1 | 2) => any) | null;
  destroy (this: void, silent?: boolean, keepChrome?: boolean): void;
}
declare var VimiumInjector: VimiumInjector, VSettings: VSettings;
