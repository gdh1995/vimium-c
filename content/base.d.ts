interface Element {
  vimiumHasOnclick?: boolean;
}

interface FgOptions extends SafeDict<any> {}

interface Window {
  VimiumInjector?: VimiumInjector;
  VSettings?: VSettings;
}
interface VimiumInjector {
  id: string;
  alive: 0 | 0.5 | 1;
  destroy: ((this: void, silent?: boolean) => void) | null;
}
declare const enum HandlerResult {
  Nothing = 0,
  Default = Nothing,
  Suppress = 1,
  Prevent = 2,
  MinMayNotPassKey = 0,
  PassKey = -1,
}
declare namespace HandlerNS {
  type Event = KeyboardEvent;

  interface Handler<T extends object> {
    (this: T, event: HandlerNS.Event): HandlerResult;
  }
}
interface KeydownCacheArray extends Uint8Array {
}

interface EventControlKeys {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface VRect {
  [0]: number; // left
  [1]: number; // top
  [2]: number; // right
  [3]: number; // bottom
}

interface ViewBox {
  [0]: number; // left
  [1]: number; // top
  [2]: number; // width
  [3]: number; // height
  [4]: number; // max-left or 0
}

declare const enum EditableType {
  Default = 0,
  NotEditable = Default,
  Embed = 1,
  Select = 2,
  Editbox = 3,
  _input = 4,
}

declare namespace HintsNS {
  interface Marker extends HTMLSpanElement {
    clickableItem: Hint[0];
    hintString: string;
    linkRect?: VRect;
  }
}

declare namespace FindNS {
  interface ExecuteOptions {
    count?: number;
    dir?: BOOL;
    noColor?: boolean;
    caseSensitive?: boolean;
  }
}

declare namespace VomnibarNS {
  const enum Status {
    KeepBroken = -2,
    Default = -1,
    NotInited = Default,
    Inactive = 0,
    Initing = 1,
    ToShow = 2,
    Showing = 3,
  }
  const enum HideType {
    // 0 | 1 | -1 | -2;
    Default = 0,
    ActDirectly = Default,
    WaitAndAct = 1,
    OnlyFocus = -1,
    DoNothing = -2,
    MinAct = ActDirectly,
  }
  interface GlobalOptions {
    mode: string;
    force: boolean;
    keyword: string;
  }
  interface BaseFgOptions {
    width: number;
    search: "" | FgRes["parseSearchUrl"];
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
    onHidden: "onHidden";
    focus: "focus";
    backspace: "backspace";
  }
  interface FReq {
    hide: {
      waitFrame: BOOL;
    };
    scrollBy: {
      amount: 1 | -1;
    };
    style: {
      height: number;
    };
    focus: {
      lastKey: number;
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
  type FgMsg<K extends keyof FReq> = FReq[K] & Msg<K>;
  interface IframePort {
    postMessage<K extends keyof FReq> (this: void, msg: FReq[K] & Msg<K>): void | 1;
    onmessage<K extends keyof CReq> (this: void, msg: { data: CReq[K] }): void | 1;
  }
  type FgOptionsToFront = CReq["activate"];
}

declare type ScrollByY = 0 | 1;

interface Hint {
  [0]: HTMLElement | SVGElement; // element
  [1]: VRect; // bounding rect
  [2]: number; // priority (smaller is prior)
  [3]?: VRect; // bottom
  [4]?: [VRect, number]; // [rect of the hint below this marker, offset-x]
  length: number;
}

interface UIElementOptions {
  adjust?: boolean;
  showing?: false;
  before?: Element | null;
}

interface DomUI {
  box: HTMLElement | null;
  styleIn: HTMLStyleElement | null;
  styleOut: HTMLStyleElement | null;
  root: ShadowRoot | null;
  focusedEl: (Element & { focus(): void; }) | null;
  flashLastingTime: number;
  showing: boolean;
  addElement<T extends HTMLElement>(this: DomUI, element: T, options?: UIElementOptions): T;
  addElementList(this: DomUI, els: ReadonlyArray<Element>, offset: { [0]: number; [1]: number }): HTMLDivElement;
  adjust (this: void, event?: Event): void;
  init (this: DomUI, showing: boolean): void;
  InitInner (this: void, innerCSS: string): void;
  toggle (this: DomUI, enabled: boolean): void;
  createStyle (this: DomUI, text: string, doc?: { createElement: Document["createElement"] }): HTMLStyleElement;
  InsertInnerCSS (this: void, inner: BgReq["insertInnerCSS"]): void;
  insertCSS (this: DomUI, outer: string | false): void;
  getSelection (this: DomUI): Selection;
  removeSelection (this: DomUI, root?: DocumentOrShadowRoot,): boolean;
  click (this: DomUI, element: Element, modifiers?: EventControlKeys | null, addFocus?: boolean): boolean;
  simulateSelect (this: DomUI, element: Element, flash?: boolean, suppressRepeated?: boolean): void;
  focus (this: DomUI, el: Element): void;
  getZoom (this: void): number;
  getVRect (this: void, clickEl: Element): VRect | null;
  flash (this: DomUI, el: null, rect: VRect): number;
  flash (this: DomUI, el: Element): number | void;
  suppressTail (this: void, onlyRepeated: boolean): void;
  SuppressMost: HandlerNS.Handler<object>;
}

interface VDomMouse {
  (element: Element, type: "mouseover" | "mousedown" | "mouseup" | "click" | "mouseout"
    , modifiers?: EventControlKeys | null, related?: Element | null): boolean;
}
interface VPort {
  post<K extends keyof SettingsNS.FrontUpdateAllowedSettings>(this: void, req: SetSettingReq<K>): void | 1;
  post<K extends keyof FgReq>(this: void, req: FgReq[K] & Req.baseFg<K>): void | 1;
  post<K extends keyof FgReq, S extends 1, T extends FgReq[K]>(this: void, req: T & Req.baseFg<K>): void | 1;
  send<K extends keyof FgRes>(this: void, req: FgReq[K] & Req.baseFg<K>
    , callback: (this: void, res: FgRes[K]) => void): void;
}
interface VEventMode {
  lock(this: void): Element | null;
  suppress(keyCode?: number): void;
  OnWndFocus (this: void): (this: void) => void;
  onWndBlur (this: void, onWndBlur: ((this: void) => void) | null): void;
  setupSuppress (this: void, onExit?: (this: void) => void): void;
  mapKey (this: void, key: string): string;
  scroll (this: void, event: KeyboardEvent): void;
  exitGrab (this: void): void;
  keydownEvents (this: void, newArr: KeydownCacheArray): void | never;
  keydownEvents (this: void): KeydownCacheArray | never;
}
interface VHUD {
  box: HTMLDivElement | null;
  text: string;
  opacity: 0 | 0.25 | 0.5 | 0.75 | 1;
  show (text: string): void;
  /** duration is default to 1500 */
  showForDuration (text: string, duration?: number): void;
  showCopied (text: string, type: string, virtual: true): string;
  showCopied (text: string, type?: string): void;
  hide (this: void): void;
}
interface VSettings {
  cache: SettingsNS.FrontendSettingCache;
  checkIfEnabled (this: void): void;
  onDestroy: ((this: void) => any) | null;
  destroy (this: void, silent?: boolean, keepChrome?: boolean): void;
}
declare var VimiumInjector: VimiumInjector;

declare const enum VKeyCodes {
  backspace = 8, tab = 9, enter = 13, shiftKey = 16, ctrlKey = 17, altKey = 18, esc = 27,
  maxNotPrintable = 32 - 1,
  space, pageup, left = 37, up, right, down, minNotInKeyNames, deleteKey = 46,
  maxNotNum = 48 - 1, N0, N1, N9 = 57, minNotNum = 58,
  maxNotAlphabet = 65 - 1, A, B, C, D, E, F, G, H, I, J, K, minNotAlphabet = 65 + 26, CASE_DELTA = 32,
  metaKey = 91, menuKey = 93, maxNotFn = 112 - 1, f1, f2, f12 = 123, minNotFn, ime = 229,
}
declare const enum KeyStat {
  Default = 0, plain = Default,
  altKey = 1, ctrlKey = 2, metaKey = 4, shiftKey = 8,
  PrimaryModifier = ctrlKey | metaKey,
}
