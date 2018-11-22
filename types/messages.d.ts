interface BaseExecute<T> {
  CSS: string | null;
  command: kFgCmd;
  count: number;
  options: T | null;
}

interface ParsedSearch {
  keyword: string;
  start: number;
  url: string;
}


declare const enum kBgReq {
  START = 0,
  init = START, reset, url, msg, eval,
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
    name: kBgReq.showHUD;
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
    name: kBgReq.eval;
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
    name: kBgReq.omni_returnFocus;
    key: VKeyCodes;
  };
  [kBgReq.omni_secret]: {
    secret: number;
    browserVersion: BrowserVer;
  };
  [kBgReq.omni_blurred]: {
    name: kBgReq.omni_blurred;
  };
  [kBgReq.omni_parsed]: {
    id: number;
    search: FgRes[kFgReq.parseSearchUrl];
  }
}
interface FullBgReq extends BgReq, BgVomnibarReq {}


declare const enum kBgCmd {
  createTab, duplicateTab, moveTabToNewWindow, moveTabToNextWindow, toggleCS,
  clearCS, goTab, removeTab, removeTabsR, removeRightTab,
  restoreTab, restoreGivenTab, blank, openUrl, searchInAnother,
  togglePinTab, toggleMuteTab, reloadTab, reloadGivenTab, reopenTab,
  goToRoot, goUp, moveTab, nextFrame, mainFrame,
  parentFrame, visitPreviousTab, copyTabInfo, goNext, enterInsertMode,
  enterVisualMode, performFind, showVomnibar, clearFindHistory, showHelp,
  toggleViewSource, clearMarks, toggle,
  END = "END",
}

declare const enum kFgCmd {
  findMode, linkHints, focusAndHint, unhoverLast, marks,
  goToMarks, scBy, scTo, visualMode, vomnibar,
  reset, toggle, insertMode, passNextKey, goNext,
  reload, switchFocus, goBack, showHelp, autoCopy,
  autoOpen, searchAs, focusInput,
  END = "END",
}

interface FgOptions extends SafeDict<any> {}
type SelectActions = "" | "all" | "all-input" | "all-line" | "start" | "end";

interface CmdOptions {
  [kFgCmd.linkHints]: FgOptions;
  [kFgCmd.focusAndHint]: FgOptions;
  [kFgCmd.unhoverLast]: FgOptions;
  [kFgCmd.marks]: {
    mode?: "goto" | "goTo" | "create";
    prefix?: true | false;
    swap?: false | true;
  };
  [kFgCmd.scBy]: {
    axis?: "y" | "x";
    dir?: 1 | -1;
    view?: 0 | 1 | "max" | "viewSize";
  };
  [kFgCmd.scTo]: {
    dest?: "" | "max";
    axis?: "y" | "x";
  };
  [kFgCmd.reset]: FgOptions;
  [kFgCmd.toggle]: {
    key: keyof SettingsNS.FrontendSettings;
    value: SettingsNS.FrontendSettings[keyof SettingsNS.FrontendSettings] | null;
  };
  [kFgCmd.passNextKey]: {
    normal?: false | true;
  };
  [kFgCmd.switchFocus]: {
    act?: "" | "backspace";
    action?: "" | "backspace";
  };
  [kFgCmd.goBack]: {
    dir: -1 | 1;
  };
  [kFgCmd.vomnibar]: {
    vomnibar: string;
    vomnibar2: string | null;
    ptype: VomnibarNS.PageType;
    script: string;
    secret: number;
    CSS: string | null;
  };
  [kFgCmd.goNext]: {
    rel: string;
    patterns: string[];
  };
  [kFgCmd.insertMode]: {
    code: VKeyCodes;
    stat: KeyStat;
    passExitKey: boolean;
    hud: boolean;
  };
  [kFgCmd.visualMode]: {
    mode: VisualModeNS.Mode.Visual | VisualModeNS.Mode.Line | VisualModeNS.Mode.Caret;
    from_find?: true;
    words?: string;
  };
  [kFgCmd.showHelp]: {};
  [kFgCmd.reload]: { url: string, /** @deprecated */ force?: undefined, hard?: undefined
    } | { /** @deprecated */ force?: boolean, hard?: boolean, url?: undefined };
  [kFgCmd.findMode]: {
    count?: number;
    leave?: boolean,
    query?: string;
    returnToViewport?: boolean;
  };
  [kFgCmd.goToMarks]: {
    local?: boolean;
    markName?: string | undefined;
    scroll: MarksNS.FgMark;
  };
  [kFgCmd.autoCopy]: {
    url: boolean; decoded: boolean;
    decode?: boolean;
  };
  [kFgCmd.autoOpen]: {
    keyword?: string;
  };
  [kFgCmd.searchAs]: FgOptions;
  [kFgCmd.focusInput]: {
    select?: SelectActions;
    keep?: boolean;
    passExitKey?: boolean;
  }
}

declare const enum kFgReq {
  START = 0,
  blank = START, setSetting, findQuery, parseSearchUrl, parseUpperUrl,
  searchAs, gotoSession, openUrl, focus, checkIfEnabled,
  nextFrame, exitGrab, execInChild, initHelp, css,
  vomnibar, omni, copy, key, marks,
  focusOrLaunch, cmd, blurTest, removeSug, msg,
  inject,
  command = "command",
}

interface FgRes {
  [kFgReq.findQuery]: string;
  [kFgReq.parseSearchUrl]: ParsedSearch | null;
  [kFgReq.parseUpperUrl]: {
    url: string;
    path: string | null;
  };
  [kFgReq.execInChild]: boolean;
}
interface FgReqWithRes {
  [kFgReq.findQuery]: {
    query?: undefined;
    index: number;
  } | {
    query?: undefined;
    index?: undefined;
  };
  [kFgReq.parseUpperUrl]: {
    url: string;
    upper: number;
    id?: undefined;
    trailing_slash: boolean | null;
  };
  [kFgReq.parseSearchUrl]: {
    url: string;
    id?: number;
    upper?: undefined;
  } | FgReqWithRes[kFgReq.parseUpperUrl];
  [kFgReq.execInChild]: {
    url: string;
  } & BaseExecute<object>;
}

interface FgReq {
  [kFgReq.parseSearchUrl]: {
    id: number;
    url: string;
  };
  [kFgReq.parseUpperUrl]: FgReqWithRes[kFgReq.parseUpperUrl] & {
    execute: true;
  };
  [kFgReq.findQuery]: {
    query: string;
    index?: undefined;
  };
  [kFgReq.searchAs]: {
    url: string;
    search: string;
  };
  [kFgReq.gotoSession]: {
    sessionId: string | number;
    /** default to true  */
    active?: boolean;
  };
  [kFgReq.openUrl]: {
    url?: string;
    copied?: boolean;
    keyword?: string | null;
    incognito?: boolean;
    https?: boolean | null;
    reuse?: ReuseType;
    omni?: boolean;
  };
  [kFgReq.focus]: {};
  [kFgReq.checkIfEnabled]: {
    url: string;
  };
  [kFgReq.nextFrame]: {
    type?: Frames.NextType;
    key: VKeyCodes;
  };
  [kFgReq.exitGrab]: {};
  [kFgReq.initHelp]: {
    unbound?: boolean;
    wantTop?: boolean;
    names?: boolean;
    title?: string;
  };
  [kFgReq.css]: {};
  [kFgReq.vomnibar]: ({
    count: number;
    redo?: undefined;
  } | {
    count?: never;
    redo: boolean;
  }) & {
    inner?: boolean;
  };
  [kFgReq.omni]: {
    query: string;
    favIcon?: 0 | 1 | 2;
  } & CompletersNS.Options;
  [kFgReq.copy]: {
    data: string;
  };
  [kFgReq.key]: {
    key: string;
    lastKey: VKeyCodes;
  };
  [kFgReq.blank]: {},
  [kFgReq.marks]: ({ action: "create" } & (MarksNS.NewTopMark | MarksNS.NewMark)) | {
    action: "clear";
    url: string;
  } | ({ action: "goto" } & MarksNS.FgQuery);
  /** 
   * .url is guaranteed to be well formatted by frontend
   */
  [kFgReq.focusOrLaunch]: MarksNS.FocusOrLaunch;
  [kFgReq.blurTest]: {};
  [kFgReq.cmd]: {
    cmd: string;
    count: number;
    id: number;
  };
  [kFgReq.removeSug]: {
    type: "tab" | "history";
    url: string;
  };
}

declare namespace Req {
  type bg<K extends kBgReq> =
    K extends keyof BgReq ? BgReq[K] & { name: K; } :
    K extends keyof BgVomnibarReq ? BgVomnibarReq[K] & { name: K; } :
    never;
  type baseFg<K extends kFgReq> = {
    handler: K;
  }
  type fg<K extends keyof FgReq> = FgReq[K] & baseFg<K>;

  type fgWithRes<K extends keyof FgRes> = FgReqWithRes[K] & baseFg<kFgReq.msg> & {
    mid: number;
    readonly msg: K;
  }
  type res<K extends keyof FgRes> = bg<kBgReq.msg> & {
    readonly response: FgRes[K];
  }

  type FgCmd<O extends keyof CmdOptions> = BaseExecute<CmdOptions[O]> & { command: O; } & Req.bg<kBgReq.execute>;
}

interface SetSettingReq<T extends keyof SettingsNS.FrontUpdateAllowedSettings> {
  handler: kFgReq.setSetting;
  key: T;
  value: SettingsNS.FrontUpdateAllowedSettings[T];
}

interface ExternalMsgs {
  [kFgReq.inject]: {
    req: {
      handler: kFgReq.inject;
    };
    res: {
      version: string;
      scripts: string[];
    }
  };
  [kFgReq.command]: {
    req: {
      handler: kFgReq.command;
      command: string;
      options?: object | null;
      count?: number;
    };
    res: void;
  };
}
