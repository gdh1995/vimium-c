interface BaseExecute<T> {
  CSS: string | null;
  command: string;
  count: number;
  options: T | null;
}

interface ParsedSearch {
  keyword: string;
  start: number;
  url: string;
}


declare const enum kBgReq {
  init, reset, url, msg, eval,
  settingsUpdate, focusFrame, exitGrab, keyMap, execute,
  createMark, showHUD, count, showHelpDialog,
  OMNI_MIN = 42,
  omni_secret = OMNI_MIN, omni_omni, omni_parsed, omni_returnFocus, omni_blurred,
  END = "END", // without it, TypeScript will report errors for number indexes
}

interface BgReq {
  [kBgReq.init]: {
    flags: Frames.Flags;
    load: SettingsNS.FrontendSettingCache,
    passKeys: string | null;
    mapKeys: SafeDict<string> | null,
    keyMap: KeyMap
  };
  [kBgReq.reset]: {
    passKeys: string | null;
    forced?: boolean;
  };
  [kBgReq.msg]: {
    mid: number;
    response: FgRes[keyof FgRes];
  };
  [kBgReq.createMark]: {
    markName: string;
  };
  [kBgReq.keyMap]: {
    mapKeys: SafeDict<string> | null;
    keyMap: KeyMap;
  };
  [kBgReq.showHUD]: {
    CSS?: string | null;
    text?: string;
    isCopy?: boolean;
  };
  [kBgReq.focusFrame]: {
    CSS?: string | null;
    mask: FrameMaskType;
    key: VKeyCodes;
  };
  [kBgReq.execute]: BaseExecute<object> & {
    name: kBgReq.execute;
  };
  [kBgReq.exitGrab]: {
    name: kBgReq.exitGrab;
  };
  [kBgReq.showHelpDialog]: {
    CSS?: string | null;
    html: string;
    optionUrl: string;
    advanced: boolean;
  };
  [kBgReq.settingsUpdate]: {
    delta: {
      [key in keyof SettingsNS.FrontendSettings]?: SettingsNS.FrontendSettings[key];
    }
  };
  [kBgReq.url]: {
    name?: kBgReq.url;
    handler: keyof FgReq;
    url?: string;
  };
  [kBgReq.eval]: {
    url: string; // a javascript: URL
  };
  [kBgReq.count]: {
    cmd: string;
    id: number;
  }
}

interface BgVomnibarReq {
  [kBgReq.omni_omni]: {
    list: CompletersNS.Suggestion[];
    autoSelect: boolean;
    matchType: CompletersNS.MatchType;
    favIcon: 0 | 1 | 2;
    total: number;
  };
  [kBgReq.omni_returnFocus]: {
    key: VKeyCodes;
  };
  [kBgReq.omni_secret]: {
    secret: number;
    browserVersion: BrowserVer;
  };
  [kBgReq.omni_blurred]: {};
  [kBgReq.omni_parsed]: {
    id: number;
    search: FgRes["parseSearchUrl"];
  }
}
interface FullBgReq extends BgReq, BgVomnibarReq {}

interface FgOptions extends SafeDict<any> {}
type SelectActions = "" | "all" | "all-input" | "all-line" | "start" | "end";

interface CmdOptions {
  linkHints: FgOptions;
  focusAndHint: FgOptions;
  unhoverLast: FgOptions;
  marks: {
    mode?: "goto" | "goTo" | "create";
    prefix?: true | false;
    swap?: false | true;
  };
  scBy: {
    axis?: "y" | "x";
    dir?: 1 | -1;
    view?: 0 | 1 | "max" | "viewSize";
  };
  scTo: {
    dest?: "" | "max";
    axis?: "y" | "x";
  };
  reset: FgOptions;
  toggle: {
    key: keyof SettingsNS.FrontendSettings;
    value: SettingsNS.FrontendSettings[keyof SettingsNS.FrontendSettings] | null;
  };
  passNextKey: {
    normal?: false | true;
  };
  switchFocus: {
    act?: "" | "backspace";
    action?: "" | "backspace";
  };
  goBack: {
    dir: -1 | 1;
  };
  vomnibar: {
    vomnibar: string;
    vomnibar2: string | null;
    ptype: VomnibarNS.PageType;
    script: string;
    secret: number;
    CSS: string | null;
  };
  goNext: {
    rel: string;
    patterns: string[];
  };
  insertMode: {
    code: VKeyCodes;
    stat: KeyStat;
    passExitKey: boolean;
    hud: boolean;
  };
  visualMode: {
    mode: VisualModeNS.Mode.Visual | VisualModeNS.Mode.Line | VisualModeNS.Mode.Caret;
    from_find?: true;
    words?: string;
  };
  showHelp: {};
  reload: { url: string, /** @deprecated */ force?: undefined, hard?: undefined
    } | { /** @deprecated */ force?: boolean, hard?: boolean, url?: undefined };
  findMode: {
    count?: number;
    leave?: boolean,
    query?: string;
    returnToViewport?: boolean;
  };
  goToMarks: {
    local?: boolean;
    markName?: string | undefined;
    scroll: MarksNS.FgMark;
  };
  autoCopy: {
    url: boolean; decoded: boolean;
    decode?: boolean;
  };
  autoOpen: {
    keyword?: string;
  };
  searchAs: FgOptions;
  focusInput: {
    select?: SelectActions;
    keep?: boolean;
    passExitKey?: boolean;
  }
}

interface FgRes {
  findQuery: string;
  parseSearchUrl: ParsedSearch | null;
  parseUpperUrl: {
    url: string;
    path: string | null;
  };
  execInChild: boolean;
}
interface FgReqWithRes {
  findQuery: {
    query?: undefined;
    index: number;
  } | {
    query?: undefined;
    index?: undefined;
  };
  parseUpperUrl: {
    url: string;
    upper: number;
    id?: undefined;
    trailing_slash: boolean | null;
  };
  parseSearchUrl: {
    url: string;
    id?: number;
    upper?: undefined;
  } | FgReqWithRes["parseUpperUrl"];
  execInChild: {
    url: string;
  } & BaseExecute<object>;
}

interface FgReq {
  parseSearchUrl: {
    id: number;
    url: string;
  };
  parseUpperUrl: FgReqWithRes["parseUpperUrl"] & {
    execute: true;
  };
  findQuery: {
    query: string;
    index?: undefined;
  };
  searchAs: {
    url: string;
    search: string;
  };
  gotoSession: {
    sessionId: string | number;
    /** default to true  */
    active?: boolean;
  };
  openUrl: {
    url?: string;
    copied?: boolean;
    keyword?: string | null;
    incognito?: boolean;
    https?: boolean | null;
    reuse?: ReuseType;
    omni?: boolean;
  };
  focus: {};
  checkIfEnabled: {
    url: string;
  };
  nextFrame: {
    type?: Frames.NextType;
    key: VKeyCodes;
  };
  exitGrab: {};
  initHelp: {
    unbound?: boolean;
    wantTop?: boolean;
    names?: boolean;
    title?: string;
  };
  css: {};
  vomnibar: ({
    count: number;
    redo?: undefined;
  } | {
    count?: never;
    redo: boolean;
  }) & {
    inner?: boolean;
  };
  omni: {
    query: string;
    favIcon?: 0 | 1 | 2;
  } & CompletersNS.Options;
  copy: {
    data: string;
  };
  key: {
    key: string;
    lastKey: VKeyCodes;
  };
  blank: {},
  marks: ({ action: "create" } & (MarksNS.NewTopMark | MarksNS.NewMark)) | {
    action: "clear";
    url: string;
  } | ({ action: "goto" } & MarksNS.FgQuery);
  /** 
   * .url is guaranteed to be well formatted by frontend
   */
  focusOrLaunch: MarksNS.FocusOrLaunch;
  blurTest: {};
  cmd: {
    cmd: string;
    count: number;
    id: number;
  };
  removeSug: {
    type: "tab" | "history";
    url: string;
  };
}

declare namespace Req {
  type bg<K extends kBgReq> =
    K extends keyof BgReq ? BgReq[K] & { name: K; } :
    K extends keyof BgVomnibarReq ? BgVomnibarReq[K] & { name: K; } :
    never;
  type baseFg<K extends string> = {
    handler: K;
  }
  type fg<K extends keyof FgReq> = FgReq[K] & baseFg<K>;

  type fgWithRes<K extends keyof FgRes> = FgReqWithRes[K] & baseFg<"msg"> & {
    mid: number;
    readonly msg: K;
  }
  type res<K extends keyof FgRes> = bg<kBgReq.msg> & {
    readonly response: FgRes[K];
  }

  type FgCmd<O extends keyof CmdOptions> = BaseExecute<CmdOptions[O]> & { command: O; } & Req.bg<kBgReq.execute>;
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
