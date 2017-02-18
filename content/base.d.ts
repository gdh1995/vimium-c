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
