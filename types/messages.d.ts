interface BaseExecute<T> {
  name: "execute";
  command: string;
  count: number;
  options: T | null;
}

interface BgReq {
  scroll: {
    name: "scroll";
    markName?: string | undefined;
    scroll: [number, number];
  };
  reset: {
    passKeys: string | null;
  };
  insertInnerCSS: {
    name: "insertInnerCSS";
    css: string;
  };
  createMark: {
    name: "createMark";
    markName: string;
  };
  keyMap: {
    mapKeys: SafeDict<string> | null;
    keyMap: KeyMap;
  };
  showHUD: {
    name: "showHUD";
    text: string;
    isCopy?: boolean;
  };
  omni: {
    name: "omni";
    list: CompletersNS.Suggestion[];
    autoSelect: boolean;
    matchType: CompletersNS.MatchType;
  };
  focusFrame: {
    name: "focusFrame";
    frameId: number;
    lastKey?: string;
  };
  execute: BaseExecute<object>;
  checkIfEnabled: {
    name: "checkIfEnabled";
  };
  exitGrab: {
    name: "exitGrab";
  };
  returnFocus: {
    lastKey: string;
  };
  showHelpDialog: {
    html: string;
    optionUrl: string;
    advanced: boolean;
  };
  init: {
    name: "init",
    load: SettingsNS.FrontendSettingCache,
    mapKeys: SafeDict<string> | null,
    keyMap: KeyMap
  } & BgReq["reset"];
}

interface CmdOptions {

}

type FgBase<K extends string> = {
  readonly handler: K;
}

interface FgReq {
  findQuery: {
    query: string;
    index?: number;
  } | {
    query?: undefined | "";
    index: number;
  };
  parseSearchUrl: {
    url: string;
    upper?: number;
    trailing_slash?: boolean;
  };
  parseUpperUrl: {
    url: string;
    upper: number;
    trailing_slash?: boolean;
  };
  searchAs: {
    url: string;
    search?: string;
  };
  gotoSession: {
    sessionId: string | number;
    /** default to true  */
    active?: boolean;
  };
  openUrl: {
    url: string;
    keyword?: string | null;
    https?: boolean;
    reuse?: ReuseType;
  };
  frameFocused: FgBase<"frameFocused">;
  checkIfEnabled: {
    url: string;
  };
  nextFrame: FgBase<"nextFrame">;
  exitGrab: FgBase<"exitGrab">;
  refocusCurrent: {
    lastKey: string;
  };
  initHelp: {
    handler: "initHelp";
    unbound?: boolean;
    names?: boolean;
    title?: string;
  };
  initInnerCSS: FgBase<"initInnerCSS">;
  activateVomnibar: {
    count?: number;
    redo?: boolean;
  };
  omni: {
    query: string;
  } & CompletersNS.Options;
  getCopiedUrl_f: {
    keyword?: string;
  };
  copyToClipboard: {
    data: string;
  };
  key: {
    handler: "key";
    key: string;
  };
  createMark: MarksNS.BaseMark | MarksNS.Mark;
  gotoMark: MarksNS.MarkQuery;
  /** 
   * .url is guaranteed to be well formatted by frontend
   */
  focusOrLaunch: MarksNS.FocusOrLaunch;
  secret: FgBase<"secret">;
}

interface FgRes {
  findQuery: string;
  parseSearchUrl: {
    keyword: string;
    start: number;
    url: string;
  } | null;
  parseUpperUrl: {
    url: string;
    path: string | null;
  };
  searchAs: string;
  initInnerCSS: string;
  getCopiedUrl_f: string;
  gotoMark: boolean;
  secret: number | null;
  copyToClipboard: void;
}

declare namespace Req {
  type bg<K extends keyof BgReq> = Readonly<BgReq[K]> & {
    readonly name: K;
  };
  type fg<K extends keyof FgReq> = Readonly<FgReq[K]> & {
    readonly handler: K;
  };

  type fgWithRes<K extends string> = {
    readonly _msgId: number;
    readonly request: FgBase<K>;
  };

  interface FgCmd<O extends keyof CmdOptions> extends BaseExecute<CmdOptions[O]> {}
}

interface SetSettingReq<T extends keyof SettingsNS.FrontUpdateAllowedSettings> {
  handler: "setSetting";
  key: T;
  value: SettingsNS.FrontUpdateAllowedSettings[T];
}

interface ExternalMsgs {
  content_scripts: {
    req: {
      handler: "content_scripts";
    };
    res: string[];
  };
  command: {
    req: {
      handler: "command";
      command: string;
      options?: object | null;
      count?: number;
    };
    res: void;
  };
}
