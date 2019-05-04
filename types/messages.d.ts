interface BgCSSReq {
  /** style (aka. CSS) */ S: string | null;
}

interface BaseExecute<T, C extends kFgCmd = kFgCmd> extends BgCSSReq {
  /** command */ c: C;
  /** count */ n: number;
  /** args (aka. options) */ a: T | null;
}

interface ParsedSearch {
  /** keyword */ k: string;
  /** start */ s: number;
  /** url */ u: string;
}

interface FindCSS {
  /** change-selection-color */ [0]: string;
  /** hud-iframe */ [1]: string;
  /** force-content-selectable */ [2]: string;
}


declare const enum kBgReq {
  START = 0,
  init = START, reset, injectorRun, url, msg, eval,
  settingsUpdate, focusFrame, exitGrab, keyMap, execute,
  createMark, showHUD, count, showHelpDialog,
  OMNI_MIN = 42,
  omni_secret = OMNI_MIN, omni_omni, omni_parsed, omni_returnFocus,
  omni_toggleStyle, omni_globalOptions,
  END = "END", // without it, TypeScript will report errors for number indexes
}

declare const enum kFgReq {
  setSetting, findQuery, parseSearchUrl, parseUpperUrl,
  searchAs, gotoSession, openUrl, focus, checkIfEnabled,
  nextFrame, exitGrab, execInChild, initHelp, css,
  vomnibar, omni, copy, key, marks,
  focusOrLaunch, cmd, removeSug, openImage, gotoMainFrame,
  setOmniStyle, findFromVisual, framesGoBack,
  END,
  msg = 90, injectDeprecated = 91,
  inject = 99,
  command = "command",
}

declare const enum kShortcutNames {
  createTab = "createTab",
  previousTab = "previousTab",
  nextTab = "nextTab",
  reloadTab = "reloadTab",
}
declare const enum kShortcutAliases {
  _mask = 0,
  nextTab1 = "quickNext",
}

interface BgReq {
  [kBgReq.init]: {
    /** status */ s: Frames.Flags;
    /** cache (aka. payload) */ c: SettingsNS.FrontendSettingCache;
    /** passKeys */ p: string | null;
    /** mappedKeys */ m: SafeDict<string> | null;
    /** keyMap */ k: KeyMap;
  };
  [kBgReq.injectorRun]: {
    /** task */ t: InjectorTask;
  };
  [kBgReq.reset]: {
    /** passKeys */ p: string | null;
    /** forced */ f?: boolean;
  };
  [kBgReq.msg]: {
    /** mid */ m: number;
    /** response */ r: FgRes[keyof FgRes];
  };
  [kBgReq.createMark]: {
    /** markName */ n: string;
  };
  [kBgReq.keyMap]: {
    /** mappedKeys */ m: SafeDict<string> | null;
    /** keyMap */ k: KeyMap;
  };
  [kBgReq.showHUD]: {
    /** text */ t?: string;
    /** isCopy */ c?: boolean;
    /** findCSS */ f?: FindCSS;
  } & Req.baseBg<kBgReq.showHUD> & Partial<BgCSSReq>;
  [kBgReq.focusFrame]: {
    /** mask */ m: FrameMaskType;
    /** key */ k: VKeyCodes;
  } & Partial<BgCSSReq>;
  [kBgReq.execute]: BaseExecute<object> & Req.baseBg<kBgReq.execute>;
  [kBgReq.exitGrab]: Req.baseBg<kBgReq.exitGrab>;
  [kBgReq.showHelpDialog]: {
    /** html */ h: string;
    /** optionUrl */ o: string;
    /** advanced */ a: boolean;
  } & Partial<BgCSSReq>;
  [kBgReq.settingsUpdate]: {
    /** delta */ d: {
      [key in keyof SettingsNS.FrontendSettings]?: SettingsNS.FrontendSettings[key];
    } & SafeObject;
  };
  [kBgReq.url]: {
    /** url */ u?: string;
  } & Req.baseFg<keyof FgReq> & Partial<Req.baseBg<kBgReq.url>>;
  [kBgReq.eval]: {
    /** url */ u: string; // a javascript: URL
  } & Req.baseBg<kBgReq.eval>;
  [kBgReq.count]: {
    /** cmd */ c: kShortcutNames;
    /** id */ i: number;
  }
}

interface BgVomnibarSpecialReq {
  [kBgReq.omni_omni]: {
    /** list */ l: CompletersNS.Suggestion[];
    /** autoSelect */ a: boolean;
    /** matchType */ m: CompletersNS.MatchType;
    /** favIcon  */ i: 0 | 1 | 2;
    /** total */ t: number;
  };
  [kBgReq.omni_returnFocus]: {
    /** lastKey */ l: VKeyCodes;
  } & Req.baseBg<kBgReq.omni_returnFocus>;
  [kBgReq.omni_secret]: {
    /** secret */ s: number;
    /** browser */ b: BrowserType;
    /** browserVer */ v: BrowserVer;
    /** globalOptions */ o: SettingsNS.BaseBackendSettings["vomnibarOptions"],
    /** CSS */ S: string;
  };
  [kBgReq.omni_parsed]: {
    /** id */ i: number;
    /** search */ s: FgRes[kFgReq.parseSearchUrl];
  };
  [kBgReq.omni_toggleStyle]: {
    /** toggled */ t: string;
    /** current */ c: boolean;
  };
  [kBgReq.omni_globalOptions]: {
    o: SettingsNS.BaseBackendSettings["vomnibarOptions"];
  }
}
type ValidBgVomnibarReq = keyof BgVomnibarSpecialReq | kBgReq.showHUD | kBgReq.injectorRun;
interface FullBgReq extends BgReq, BgVomnibarSpecialReq {}


declare const enum kBgCmd {
  createTab, duplicateTab, moveTabToNewWindow, moveTabToNextWindow, toggleCS,
  clearCS, goTab, removeTab, removeTabsR, removeRightTab,
  restoreTab, restoreGivenTab, discardTab, blank, openUrl, searchInAnother,
  togglePinTab, toggleMuteTab, reloadTab, reloadGivenTab, reopenTab,
  goToRoot, goUp, moveTab, nextFrame, mainFrame,
  parentFrame, visitPreviousTab, copyTabInfo, goNext, enterInsertMode,
  enterVisualMode, performFind, showVomnibar, clearFindHistory, showHelp,
  toggleViewSource, clearMarks, toggle, toggleVomnibarStyle,
  END = "END",
}

declare const enum kFgCmd {
  framesGoBack, findMode, linkHints, focusAndHint, unhoverLast, marks,
  goToMarks, scroll, visualMode, vomnibar,
  reset, toggle, insertMode, passNextKey, goNext,
  reload, switchFocus, showHelp, autoCopy,
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
    mode?: "create" | /* all others are treated as "goto"  */ "goto" | "goTo";
    prefix?: true | false;
    swap?: false | true;
  };
  [kFgCmd.scroll]: {
    axis?: "y" | "x";
    dir?: 1 | -1;
    view?: 0 | 1 | "max" | /* all others are treated as "viewSize" */ "viewSize" | "view";
    dest?: undefined;
  } | {
    dest: "min" | "max";
    axis?: "y" | "x";
    view?: undefined;
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
  [kFgCmd.framesGoBack]: {
  };
  [kFgCmd.vomnibar]: {
    /* vomnibar */ v: string;
    /* vomnibar2 */ i: string | null;
    /** ptype */ t: VomnibarNS.PageType;
    /** script */ s: string;
    /** secret */ k: number;
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
    /** mode */ m: VisualModeNS.Mode.Visual | VisualModeNS.Mode.Line | VisualModeNS.Mode.Caret;
    /** from_find */ r?: true;
    /** words */ w?: string;
  };
  [kFgCmd.showHelp]: {};
  [kFgCmd.reload]: { url: string, /** @deprecated */ force?: undefined, hard?: undefined
    } | { /** @deprecated */ force?: boolean, hard?: boolean, url?: undefined };
  [kFgCmd.findMode]: {
    /** count */ n: number;
    /** leave find mode */ l: boolean,
    /** query */ q: string;
    /* return to view port */ r: boolean;
    /** findCSS */ f: FindCSS | null;
  };
  [kFgCmd.goToMarks]: {
    /** local */ l?: boolean;
    /** markName */ n?: string | undefined;
    /** scroll */ s: MarksNS.FgMark;
  };
  [kFgCmd.autoCopy]: {
    url: boolean; decoded: boolean;
    decode?: boolean;
  };
  [kFgCmd.autoOpen]: {
    keyword?: string;
  };
  [kFgCmd.searchAs]: {
    /** default to true */ copied?: boolean;
    /** default to true */ selected?: boolean;
  };
  [kFgCmd.focusInput]: {
    select?: SelectActions;
    keep?: boolean;
    passExitKey?: boolean;
  }
}

declare const enum kMarkAction {
  goto = 0,
  create = 1,
  clear = 2,
  _mask = "mask",
}

interface FgRes {
  [kFgReq.findQuery]: string;
  [kFgReq.parseSearchUrl]: ParsedSearch | null;
  [kFgReq.parseUpperUrl]: {
    /** url */ u: string;
    /** path */ p: string | null;
  };
  [kFgReq.execInChild]: boolean;
}
interface FgReqWithRes {
  [kFgReq.findQuery]: {
    /** query */ q?: undefined;
    /** index */ i: number;
  } | {
    /** query */ q?: undefined;
    /** index */ i?: undefined;
  };
  [kFgReq.parseUpperUrl]: {
    /** url */ u: string;
    /** upper */ p: number;
    /** id */ i?: undefined;
    /** trailing_slash */ t: boolean | null;
  };
  [kFgReq.parseSearchUrl]: {
    /** url */ u: string;
    /** upper */ p?: undefined;
    /** id */ i?: number;
  } | FgReqWithRes[kFgReq.parseUpperUrl];
  [kFgReq.execInChild]: {
    /** url */ u: string;
  } & Pick<BaseExecute<object>, Exclude<keyof BaseExecute<object>, "S">>;
}

interface FgReq {
  [kFgReq.setSetting]: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>;
  [kFgReq.parseSearchUrl]: {
    /** id */ i: number;
    /** url */ u: string;
  };
  [kFgReq.parseUpperUrl]: FgReqWithRes[kFgReq.parseUpperUrl] & {
    /** execute */ e: true;
  };
  [kFgReq.findQuery]: {
    /** query */ q: string;
    /** index */ i?: undefined;
  };
  [kFgReq.searchAs]: {
    /** url */ u: string;
    /** search */ s: string;
    /** copied */ c: boolean | undefined;
  };
  [kFgReq.gotoSession]: {
    /** sessionId */ s: string | number;
    /** active: default to true  */ a?: boolean;
  };
  [kFgReq.openUrl]: {
    // note: need to sync members to ReqH::openUrl in main.ts
    /** url */ u?: string;
    /** copied */ c?: boolean;
    /** keyword */ k?: string | null;
    /** incognito */ i?: boolean;
    /** https */ h?: boolean | null;
    /** reuse */ r?: ReuseType;
    /** omni */ o?: boolean;
    /** noopener */ n?: boolean;
  };
  [kFgReq.focus]: {};
  [kFgReq.checkIfEnabled]: {
    /** url */ u: string;
  };
  [kFgReq.nextFrame]: {
    /** type */ t?: Frames.NextType;
    /** key */ k: VKeyCodes;
  };
  [kFgReq.exitGrab]: {};
  [kFgReq.initHelp]: {
    /** unbound */ b?: boolean;
    /** wantTop */ w?: boolean;
    /** names */ n?: boolean;
    /** "Command Listing" title */ t?: boolean;
  };
  [kFgReq.css]: {};
  [kFgReq.vomnibar]: ({
    /** count */ c: number;
    /** redo */ r?: undefined;
  } | {
    /** count */ c?: never;
    /** redo */ r: boolean;
  }) & {
    /** inner */ i?: boolean;
  };
  [kFgReq.omni]: {
    /** query */ q: string;
    /** favIcon */ i?: 0 | 1 | 2;
  } & CompletersNS.Options;
  [kFgReq.copy]: {
    /** data */ d: string;
  };
  [kFgReq.key]: {
    /* keySequence */ k: string;
    /** lastKey */ l: VKeyCodes;
  };
  [kFgReq.marks]: ({ /** action */ a: kMarkAction.create } & (MarksNS.NewTopMark | MarksNS.NewMark)) | {
    /** action */ a: kMarkAction.clear;
    /** url */ u: string;
  } | ({ /** action */ a: kMarkAction.goto } & MarksNS.FgQuery);
  /** 
   * .url is guaranteed to be well formatted by frontend
   */
  [kFgReq.focusOrLaunch]: MarksNS.FocusOrLaunch;
  [kFgReq.cmd]: {
    /** cmd */ c: kShortcutNames | "";
    /** count */ n: number;
    /** id */ i: number;
  };
  [kFgReq.removeSug]: {
    /** type */ t: "tab" | "history";
    /** url */ u: string;
  };
  [kFgReq.openImage]: {
    /** file */ f: string | null;
    /** url */ u: string;
    /** reuse */ r: ReuseType;
    /** auto: default to true */ a?: boolean;
  };
  [kFgReq.gotoMainFrame]: {
    /** command */ c: kFgCmd,
    /** count */ n: number;
    /** options */ a: null | (object & {
      $forced?: true;
    });
  };
  [kFgReq.setOmniStyle]: {
    /** style */ s: string;
  };
  [kFgReq.findFromVisual]: {};
  [kFgReq.framesGoBack]: { /** step */ s: number; };
}

declare namespace Req {
  type baseBg<K extends kBgReq> = {
    /** name */ N: K;
  };
  type bg<K extends kBgReq> =
    K extends keyof BgReq ? BgReq[K] & baseBg<K> :
    K extends keyof BgVomnibarSpecialReq ? BgVomnibarSpecialReq[K] & baseBg<K> :
    never;
  type baseFg<K extends kFgReq> = {
    /** handler */ H: K;
  }
  type fg<K extends keyof FgReq> = FgReq[K] & baseFg<K>;

  type fgWithRes<K extends keyof FgRes> = baseFg<kFgReq.msg> & {
    /** msgId */ i: number;
    /** message */ readonly c: K;
    /** argument */ readonly a: FgReqWithRes[K];
  }
  type res<K extends keyof FgRes> = bg<kBgReq.msg> & {
    readonly r: FgRes[K];
  }

  type FgCmd<O extends keyof CmdOptions> = BaseExecute<CmdOptions[O], O> & baseBg<kBgReq.execute>;
}

interface SetSettingReq<T extends keyof SettingsNS.FrontUpdateAllowedSettings> extends Req.baseFg<kFgReq.setSetting> {
  key: T;
  value: SettingsNS.FrontUpdateAllowedSettings[T];
}

interface ExternalMsgs {
  [kFgReq.inject]: {
    req: {
      handler: kFgReq.inject | kFgReq.injectDeprecated;
      scripts?: boolean;
    };
    res: {
      version: string;
      scripts: string[] | null;
      host: string;
      versionHash: string;
    }
  };
  [kFgReq.command]: {
    req: {
      handler: kFgReq.command;
      command: string;
      options?: object | null;
      count?: number;
      key?: VKeyCodes;
    };
    res: void;
  };
}
