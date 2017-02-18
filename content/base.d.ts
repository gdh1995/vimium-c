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
  VimiumInjector?: {
    id: string;
    alive: 0 | 0.5 | 1;
    destroy: ((silent?: boolean) => void) | null;
  };
}

declare namespace HandlerNS {
  type Event = KeyboardEvent;

  const enum ReturnedEnum {
    Default = 0,
    Nothing = Default,

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
