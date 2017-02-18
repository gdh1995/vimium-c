interface Element {
  vimiumHasOnclick?: boolean;
}

interface Window {
  readonly VDom: any;
  readonly VPort: {
    post<K extends keyof FgReq>(msg: FgReq[K]): 1;
    send<K extends keyof FgRes>(msg: FgReq[K], callback: (msg: FgRes[K]) => void): void;
  };
  readonly VHUD: {
    showCopied(text: string): void;
  };
  VimiumInjector?: VimiumInjector;
}
interface VimiumInjector {
  id: string;
  alive: 0 | 0.5 | 1;
  destroy: ((this: void, silent?: boolean) => void) | null;
}

declare namespace HandlerNS {
  type Event = KeyboardEvent;

  const enum ReturnedEnum {
    Default = 0,
    Nothing = Default,
    Suppress = 1,
    Prevent = 2,
  }

  interface Handler<T extends object> {
    (this: T, event: HandlerNS.Event): HandlerNS.ReturnedEnum;
  }
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

interface Hint {
  [0]: Element; // element
  [1]: VRect; // bounding rect
  [2]: number; // priority (smaller is prior)
  [3]?: VRect; // bottom
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
  addElementList(this: DomUI, els: Element[], offset: [number, number]): HTMLDivElement;
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
  flash (this: DomUI, el: Element, rect?: VRect | null): number | undefined;
  suppressTail (this: void, onlyRepeated: boolean): void;
  SuppressMost: HandlerNS.Handler<object>;
}

declare var VScroller: any;

declare var VPort: {
  post<K extends keyof FgReq>(req: FgReq[K] & FgBase<K>): void;
  send<K extends keyof FgRes>(req: FgReq[K] & FgBase<K>, callback: (this: void, res: FgRes[K]) => any): void;
},
VEventMode: {
  lock(): Element | null;
},
VHints: any, Vomnibar: any, VFindMode: any, VVisualMode: any,
VHUD: {
},
VSettings: {
  cache: SettingsNS.FrontendSettingCache;
  checkIfEnabled (): void;
  onDestroy: ((this: void) => any) | null;
  destroy (this: void): void;
},
VimiumInjector: VimiumInjector
;
