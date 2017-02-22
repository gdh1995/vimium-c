interface Element {
  vimiumHasOnclick?: boolean;
}

interface FgOptions extends SafeDict<any> {}

interface Window {
  VimiumInjector?: VimiumInjector;
}
interface VimiumInjector {
  id: string;
  alive: 0 | 0.5 | 1;
  destroy: ((this: void, silent?: boolean) => void) | null;
}
declare const enum HandlerResult {
  Default = 0,
  Nothing = Default,
  Suppress = 1,
  Prevent = 2,
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

declare namespace VomnibarNS {
  const enum Status {
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
  interface BaseFgOptions {
    width: number;
    search: "" | FgRes["parseSearchUrl"];
  }
  interface FgOptions extends BaseFgOptions {
    url?: string;
  }
  type Msg = string | { name: string };
  interface IframePort {
    postMessage (this: IframePort, msg: Msg): void | 1;
    onmessage (this: void, msg: { data: Msg }): void | 1;
  }
}

declare type ScrollByY = 0 | 1;

interface Hint {
  [0]: HTMLElement; // element
  [1]: VRect; // bounding rect
  [2]: number; // priority (smaller is prior)
  [3]?: VRect; // bottom
  [4]?: [VRect, number]; // [rect of the hint below this marker, offset-x]
  length: number;
}

interface UIElementOptions {
  adjust?: boolean;
  showing?: boolean;
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
  insertCSS (this: DomUI, outer: string): void;
  getSelection (this: DomUI): Selection;
  removeSelection (this: DomUI, root?: Window | ShadowRoot): boolean;
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

declare var VPort: {
  post<K extends keyof FgReq>(req: FgReq[K] & FgBase<K>): void | 1;
  send<K extends keyof FgRes>(req: FgReq[K] & FgBase<K>, callback: (this: void, res: FgRes[K]) => any): void;
},
VEventMode: {
  lock(): Element | null;
  suppress(keyCode?: number): void;
  OnWndFocus (): (this: void) => void;
  onWndBlur (onWndBlur: ((this: void) => void) | null): void;
  setupSuppress (onExit?: (this: void) => void): void;
  mapKey (key: string): string;
  scroll (event: KeyboardEvent): void;
  exitGrab (): void;
  keydownEvents (newArr: KeydownCacheArray): void | never;
  keydownEvents (): KeydownCacheArray | never;
},
VHUD: {
  box: HTMLDivElement | null;
  text: string;
  opacity: 0 | 0.25 | 0.5 | 0.75 | 1;
  show (text: string): void | HTMLDivElement;
  showForDuration (text: string, duration: number): void;
  showCopied (text: string, type: string, virtual: true): string;
  showCopied (text: string, type?: string): void;
  hide (): void;
},
VSettings: {
  cache: SettingsNS.FrontendSettingCache;
  checkIfEnabled (): void;
  onDestroy: ((this: void) => any) | null;
  destroy (this: void): void;
},
VimiumInjector: VimiumInjector
;
