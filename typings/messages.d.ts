declare const enum kTip {
  /* 1: */ raw = 1,
  /* 4..9 */ didUnHoverLast = 4, globalInsertMode, noPassKeys, normalMode, nTimes, passNext,
  /* 10..15 */ noLinksToGo, noFocused, focusedIsHidden, noInputToFocus, noUrlCopied, noTextCopied,
  /* 17: */ kCommonEvents = 17,
  /* 20..25 */ copiedIs = 20, forcedColors, tooManyLinks, useVal, turnOn, turnOff,
  /* 26..31 */ nMatches, oneMatch, someMatches, noMatches, modalHints, haveToOpenManually,
  /* 39, 41: */ global = 39, local = 41, // neither 39 nor 41 is in HintMode
  /* 44..47 */ selectLineBoundary = 44, frameUnloaded, waitForEnter, logGrabFocus,
  /* 60..63 */ logOmniFallback = 60, logNotWorkOnSandboxed, prev, next,
  /* 68..70 */ START_FOR_OTHERS = 68, OFFSET_VISUAL_MODE = 67, visual, line, caret,
  /* 71: */ noLinks, exitForIME, linkRemoved, notImg,
  /* 75: */ hoverScrollable, ignorePassword, noNewToCopy, downloaded, nowGotoMark,
  /* 80: */ nowCreateMark, didCreateLastMark, didLocalMarkTask, didJumpTo, didCreate,
  /* 85: */ lastMark, didNormalMarkTask, findFrameFail, noOldQuery, noMatchFor,
  /* 90: */ inVisualMode, noUsableSel, loseSel, needSel, omniFrameFail,
  /* 95: */ failToDelSug, fewChars, editableSelector, removeCurScript, webkitWithRel,
  /* 100: */ notANestedFrame, cssUrl, imgExt, clickableClasses, clickableRoles,
  /* 105: */ invisibleHintText, notMatchedHintText, metaKeywordsForMobile, css0d01OrDPI, visibleElementsInScopeChildren,
  /* 110: */ voidJS = 110, nonLocalhostRe, redditHost, buttonOrA, wrapWhenFind,
  /* 115: */ atStart, atEnd, noTargets, closableClasses, highContrast_WOB,
  INJECTED_CONTENT_END,
  /* 200: */ firefoxRefuseURL = 200, cancelImport, importOK, XHTML, redditOverlay,
  /** used by {@link ../Gulpfile.js} */ extendClick = 999,
}

interface BgCSSReq {
  /** style (aka. CSS) */ H: string | null;
}

interface BaseExecute<T, C extends keyof CmdOptions = keyof CmdOptions> extends BgCSSReq {
  /** command */ c: C;
  /** count */ n: number;
  /** args (aka. options) */ a: T | null;
}

interface ParsedSearch {
  /** keyword */ k: string;
  /** start */ s: number;
  /** url */ u: string;
  /** error */ e?: string | null;
}

declare const enum kAria { hidden = 0, disabled = 1 }
declare const enum kHidden {
  None = 0, VisibilityHidden = 1, OverflowHidden = 2,
  BASE_ARIA = 16, AriaHidden = BASE_ARIA << kAria.hidden, AriaDisabled = BASE_ARIA << kAria.disabled,
}
// Note: `clickable` is not used in `focusInput`
interface CSSOptions {
  match?: "css-selector" | " " | null | undefined
  clickable?: "css-selector" | null | undefined
  exclude?: "css-selector" | null | undefined
  evenIf?: kHidden | null | undefined
  /* same as `.evenIf |= kHidden.OverflowHidden` */ scroll?: "force"
}
interface OtherFilterOptions {
  typeFilter?: /** 1 <<< kClickType */ number | null | undefined
  textFilter?: "regexp"
}

interface FindCSS {
  /** change-selection-color */ c: string;
  /** force-content-selectable */ s: string;
  /** hud-iframe */ i: string;
}

interface OptionsWithForce extends FgOptions {
  $forced?: true | 1;
}

declare const enum kBgReq {
  START = 0,
  init = START, reset, injectorRun, url, msg, eval,
  settingsUpdate, focusFrame, exitGrab, keyFSM, execute,
  createMark, showHUD, count, queryForRunKey, goToMark, suppressForAWhile,
  OMNI_MIN = 42,
  omni_init = OMNI_MIN, omni_omni, omni_parsed, omni_returnFocus,
  omni_toggleStyle, omni_updateOptions,
  END = "END", // without it, TypeScript will report errors for number indexes
}

declare const enum kFgReq {
  setSetting, findQuery, parseSearchUrl, parseUpperUrl,
  searchAs, gotoSession, openUrl, onFrameFocused, checkIfEnabled,
  nextFrame, exitGrab, execInChild, initHelp, css,
  vomnibar, omni, copy, key, nextKey, marks,
  focusOrLaunch, cmd, removeSug, openImage, evalJSFallback,
  /** can be used only with `FgCmdAcrossFrames` and when a fg command is just being called */
  gotoMainFrame,
  setOmniStyle, findFromVisual, framesGoBack, i18n, learnCSS, visualMode,
  respondForRunKey, downloadLink, wait,
  END,
  msg = 90, inject = 99,
  command = "command", id = "id", shortcut = "shortcut",
}

interface BgReq {
  [kBgReq.init]: {
    /** flags */ f: Frames.Flags;
    /** cache (aka. payload) */ c: SettingsNS.FrontendSettingCache;
    /** passKeys */ p: string | null;
    /** mappedKeys */ m: SafeDict<string> | null;
    /** keyFSM */ k: KeyFSM;
    /** mappedKeyTypes */ t: kMapKey;
  };
  [kBgReq.injectorRun]: {
    /** task */ t: InjectorTask;
  };
  [kBgReq.reset]: {
    /** passKeys */ p: string | null;
    /** flags: in .reset must exist */ f: Frames.Flags.blank | Frames.Flags.locked | Frames.Flags.lockedAndDisabled
  };
  [kBgReq.msg]: {
    /** mid */ m: number;
    /** response */ r: FgRes[keyof FgRes];
  };
  [kBgReq.createMark]: {
    /** markName */ n: string;
  };
  [kBgReq.keyFSM]: {
    /** mappedKeys */ m: SafeDict<string> | null;
    /** keyMap */ k: KeyFSM | null;
    /** mappedKeyTypes */ t: kMapKey;
  };
  [kBgReq.showHUD]: {
    /** kTip */ k?: kTip | 0
    /** text */ t?: string;
    /** duration */ d?: number;
    /** findCSS */ f?: FindCSS
  } & Partial<BgCSSReq>;
  [kBgReq.focusFrame]: {
    /** mask */ m: FrameMaskType;
    /** key */ k: kKeyCode;
    // ensure .c, .S exist, for safer code
    /** command */ c: FgCmdAcrossFrames | 0;
    /** fallback options */ f: Req.FallbackOptions
  } & BgCSSReq & Partial<Pick<BaseExecute<FgOptions, FgCmdAcrossFrames>, "n" | "a">>;
  [kBgReq.execute]: BaseExecute<object> & Req.baseBg<kBgReq.execute>;
  [kBgReq.exitGrab]: Req.baseBg<kBgReq.exitGrab>;
  [kBgReq.settingsUpdate]: {
    /** delta */ d: Partial<SelectValueType<SettingsNS.FrontendSettingsSyncingItems>>;
  };
  [kBgReq.url]: {
    /** url */ u?: string;
  } & Req.baseFg<keyof FgReq> & Partial<Req.baseBg<kBgReq.url>>;
  [kBgReq.eval]: {
    /** url */ u: string; // a javascript: URL
    /** only $then */ f?: Req.FallbackOptions | null
  }
  [kBgReq.count]: {
    /** cmd */ c: string | "";
    /** id */ i: number;
    /** message-in-confirmation-dialog */ m: string;
  };
  [kBgReq.queryForRunKey]: { n: number; c: CurrentEnvCache }
  [kBgReq.goToMark]: {
    /** local */ l: 0 | /** kTip.local - kTip.global */ 2
    /** markName */ n?: string | undefined
    /** scroll */ s: MarksNS.FgMark
    /** fallback options */ f?: Req.FallbackOptions | null
  }
  [kBgReq.suppressForAWhile]: { /** timeout */ t: number }
}

interface BgVomnibarSpecialReq {
  [kBgReq.omni_omni]: {
    /** autoSelect */ a: boolean
    /** queryComponents */ c: CompletersNS.QComponent
    /** favIcon  */ i: 0 | 1 | 2
    /** list */ l: CompletersNS.Suggestion[];
    /** matchType */ m: CompletersNS.MatchType;
    /** real mode */ r: string
    /** sugTypes */ s: CompletersNS.SugType;
    /** total */ t: number;
  };
  [kBgReq.omni_returnFocus]: {
    /** lastKey */ l: kKeyCode;
  } & Req.baseBg<kBgReq.omni_returnFocus>;
  [kBgReq.omni_init]: {
    /** secret */ s: string
    /** payload */ l: SettingsNS.VomnibarPayload;
  };
  [kBgReq.omni_parsed]: {
    /** id */ i: number;
    /** search */ s: FgRes[kFgReq.parseSearchUrl];
  };
  [kBgReq.omni_toggleStyle]: {
    /** toggled */ t: string;
    /** current */ c: boolean;
  };
  [kBgReq.omni_updateOptions]: {
    /** delta */ d: Partial<SelectValueType<SettingsNS.AllVomnibarItems>>;
  };
}
type ValidBgVomnibarReq = keyof BgVomnibarSpecialReq | kBgReq.injectorRun;
interface FullBgReq extends BgReq, BgVomnibarSpecialReq {}


declare const enum kBgCmd {
  blank,
  // region: need cport
  goNext, insertMode, nextFrame, parentFrame,
  performFind, toggle, showHelp, showVomnibar, visualMode,
  MIN_NEED_CPORT = goNext, MAX_NEED_CPORT = visualMode,
  // endregion: need cport
  addBookmark, autoOpenFallback,
  captureTab, clearCS, clearFindHistory, clearMarks, copyWindowInfo, createTab,
  discardTab, duplicateTab, goBackFallback, goToTab, goUp, joinTabs,
  mainFrame, moveTab, moveTabToNewWindow, moveTabToNextWindow, openUrl,
  reloadTab, removeRightTab, removeTab, removeTabsR, reopenTab, restoreTab, runKey,
  searchInAnother, sendToExtension, showHUD,
  toggleCS, toggleMuteTab, togglePinTab, toggleTabUrl, toggleVomnibarStyle, toggleZoom,
  visitPreviousTab, closeDownloadBar, reset,
  END, ENDS = "END",
}

declare const enum kFgCmd {
  framesGoBack, findMode, linkHints, marks, scroll, visualMode, vomnibar, insertMode, toggle,
  passNextKey, goNext, autoOpen, focusInput, editText, scrollSelect, toggleStyle, showHelpDialog,
  END, ENDS = "END",
}

type FgCmdAcrossFrames = kFgCmd.linkHints | kFgCmd.scroll | kFgCmd.vomnibar | kFgCmd.goNext | kFgCmd.framesGoBack

interface FgOptions extends SafeDict<any> {}
type SelectActions = "" | "all" | "all-input" | "all-line" | "start" | "end";

interface ParsedSedOpts {
  /** sed rules, split by spaces */ r: string | boolean | null | undefined
  /** keys */ k: string | null | undefined | object
}
type MixedSedOpts = string | boolean | ParsedSedOpts
interface UserSedOptions {
  sed?: MixedSedOpts | null
  sedKeys?: string | null
  sedKey?: string | null
  /** cached parsing result */ $sed?: ParsedSedOpts | null
}

declare namespace HintsNS {
  interface Options extends CSSOptions, OtherFilterOptions
      , UserSedOptions, OpenPageUrlOptions, Pick<OpenUrlOptions, "opener">
      , Req.FallbackOptions {
    /** mode */ m: HintMode
    /** hint characters */ c?: string
    /** click directly */ direct?: boolean | "element" | "sel" | "focus" | "hover" | "click" | "element,sel,focus,hover"
    directOptions?: {
      search?: "view" | "doc" | "document"
      offset?: 0 | "cur" | "current" | "end" | "last"
      index?: "count" | number
    }
    /** (deprecated) */ index?: "count" | number
    action?: string;
    caret?: boolean;
    download?: "" | "force"
    focus?: boolean | "css-selector"
    ordinal?: boolean
    useFilter?: boolean;
    url?: boolean;
    // access el.dataset[<json keys>] || el.attrs[key][json keys]
    // format: [<css selector>":"]<dataset-key or attr-name>[...("."<json key>)], like img:viewer.url
    access?: string
    dblclick?: boolean;
    interact?: true | false
    newtab?: null | /** only in editing mode */ boolean
        | "force" | "force-current" | "force-mode"
        | "last-window" | "window" | /** Firefox-only */ "no-prevent"
    reuse?: UserReuseType
    button?: "right";
    touch?: null | boolean | "auto";
    join?: FgReq[kFgReq.copy]["j"];
    decoded?: boolean;
    anyText?: boolean
    toggle?: {
      [selector: string]: string;
    };
    auto?: boolean;
    /** clickElement / pageLoad is enabled by default */
    autoReload?: "clickElement" | "click" | "cl" | "pageLoad" | "lo" | "delayedListen" | "delayed" | "de" | "all"
    ctrlShiftForWindow?: boolean | null;
    noCtrlPlusShift?: boolean;
    swapCtrlAndShift?: boolean;
    hideHud?: boolean;
    hideHUD?: boolean;
    autoUnhover?: boolean;
    reachable?: null | boolean // null means "in modes for mouse events and settings.mouseReachable"
    richText?: boolean;
    visual?: false;
  }
}

interface InsertModeOptions {
  /** stripped key */ k: string | null;
  /** passExitKey */ p: boolean;
  /** hud message */ h: [string] | string | null;
}
interface ShowHelpDialogOptions {
  h?: null
  exitOnClick?: boolean | null
}
interface TrailingSlashOptions {
  trailingSlash?: boolean | null
  /** (deprecated) */ trailing_slash?: boolean | null
}

declare const enum kScFlag { scBy = 0, INC = 1, TO = 2, toMin = 2, toMax = 3, _mask = "mask" }

interface CmdOptions {
  [kFgCmd.linkHints]: HintsNS.Options;
  [kFgCmd.marks]: {
    mode?: "create" | /* all others are treated as "goto"  */ "goto" | "goTo";
    prefix?: true | false;
    swap?: false | true;
  } & OpenPageUrlOptions & Req.FallbackOptions
  [kFgCmd.scroll]: {
    /** continuous */ $c?: kKeyCode;
    axis?: "y" | "x";
    smooth?: boolean
    keepHover?: true | false | "auto" | "never" | /* or >= 20 */ 20
    acrossFrames?: true | false
    /** inner flags */ f?: kScFlag & number
  } & Pick<CSSOptions, "evenIf" | "scroll"> & ({
    dir?: 1 | -1 | 0.5 | -0.5;
    view?: 0 | /** means 0 */ undefined | 1 | "max" | /* all others are treated as "view" */ 2 | "view";
    dest?: undefined;
  } | {
    dest: "min" | "max";
    view?: undefined;
    sel?: "clear";
    dir?: undefined;
  }) & Req.FallbackOptions
  [kFgCmd.toggle]: {
    k: keyof SettingsNS.FrontendSettingsSyncingItems;
    n: string; // `"${SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][0]}"`
    v: SettingsNS.FrontendSettings[keyof SettingsNS.FrontendSettings] | null;
  };
  [kFgCmd.passNextKey]: {
    normal?: false | true;
  };
  [kFgCmd.framesGoBack]: (Pick<OpenUrlOptions, "reuse" | "position"> & { r?: null }
      | { r: 1 } & ({ url: string; hard?: undefined } | { url?: undefined; hard?: boolean })) & Req.FallbackOptions
  [kFgCmd.vomnibar]: {
    /* vomnibar */ v: string;
    /* vomnibar2 */ i: string | null;
    /** pageType */ t: VomnibarNS.PageType;
    /** trailingSlash */ s: boolean | null | undefined;
    /** <script> */ j: string;
    /** secret */ k: string
    /** exitOnClick */ e: boolean;
  };
  [kFgCmd.goNext]: {
    /** rel */ r: string;
    /** isNext */ n: boolean;
    /** patterns */ p: string[];
    /** length limit list */ l: number[];
    /** max of length limit list */ m: number;
  } & CSSOptions & Req.FallbackOptions;
  [kFgCmd.insertMode]: {
    /** unhover last */ u: true;
    /** reset all: 2=destroying */ r?: 0;
    /** insert mode */ i?: false;
  } | {
    /** unhover last */ u?: false;
    /** reset all: 2=destroying */ r: 0 | 1 | 2;
    /** insert mode */ i?: false;
  } | {
    /** unhover last */ u?: boolean;
    /** reset all: 2=destroying */ r: 0 | 1 | 2;
    /** insert mode */ i: boolean;
  } & InsertModeOptions;
  [kFgCmd.visualMode]: {
    /** mode */ m?: VisualModeNS.Mode.Visual | VisualModeNS.Mode.Line | VisualModeNS.Mode.Caret;
    /** find CSS */ f?: FindCSS | null
    /** from_find */ r?: true;
    /** kGranularity[] */ g?: GranularityNames | null;
    /** keyMaps */ k?: VisualModeNS.KeyMap | null;
    /** words */ w?: string;
    /** collapse to start */ s?: boolean
    /** richText */ t?: boolean
  } & OpenPageUrlOptions & UserSedOptions & Req.FallbackOptions
  [kFgCmd.showHelpDialog]: {
    /** html */ h: "html" | /** for Firefox */ { /** head->style */ h: string; /** body */ b: string };
    /** optionUrl */ o: string;
    /** exitOnClick */ e: boolean;
    /** advanced */ c: boolean;
  } & Partial<BgCSSReq> | ShowHelpDialogOptions
  [kFgCmd.findMode]: {
    /** count */ c: number;
    /** highlight multiple in viewport */ m?: boolean | BOOL;
    /** leave find mode */ l: boolean;
    /** query */ q: string;
    /* return to view port */ r: boolean;
    /* auto use selected text */ s: boolean;
    /** findCSS */ f: FindCSS | null;
    /** use post mode on esc */ p: boolean;
    /** restart finding */ e: boolean;
    /** normalize text */ n: boolean
  } & Req.FallbackOptions
  [kFgCmd.autoOpen]: {
    /** for autoOpen */
    o?: 1;
    reuse?: UserReuseType;
    copy?: boolean;
    /** for autoCopy */
    text?: string
    url?: boolean;
    decoded?: boolean; decode?: boolean;
    /** for searchAs */
    s?: 1;
    /** default to true */ selected?: boolean;
  } & {
    /** default to true */ copied?: boolean | "urls" | "any-urls";
  } & UserSedOptions & OpenPageUrlOptions & Req.FallbackOptions
  [kFgCmd.focusInput]: {
    act?: "" | "backspace" | "switch" | "last" | "last-visible";
    action?: "" | "backspace" | "switch" | "last" | "last-visible";
    select?: SelectActions;
    keep?: boolean;
    passExitKey?: boolean;
    flash?: boolean;
    reachable?: boolean; // default to true
    prefer?: string;
  } & CSSOptions & Req.FallbackOptions
  [kFgCmd.editText]: {
    dom?: boolean;
    run: string;
  } & Req.FallbackOptions;
  [kFgCmd.scrollSelect]: {
    position?: "begin" | "home" | "start" | "end" | "last"
    dir?: "down" | "next" | "prev" | "up" | 1 | -1
  } & Req.FallbackOptions;
  [kFgCmd.toggleStyle]: ({
    selector?: undefined
    id: string
    css?: string
  } | {
    selector: string
    id?: undefined
    css?: undefined
  }) & { disabled?: boolean } & Req.FallbackOptions
}

declare const enum kMarkAction {
  goto = 0,
  create = 1,
  clear = 2,
  _mask = "mask",
}

declare const enum SedContext {
  NONE = 0,
  /** `c` */ copy = 1 << 2,
  /** `g` */ gotoUpperUrl = 1 << 6,
  /** `i` */ image = 1 << 8,
  /** `n` */ goNext = 1 << 13,
  /** `o` */ omni = 1 << 14,
  /** `p` */ paste = 1 << 15,
  /** `r` */ goToRoot = 1 << 17,
  /** `t` */ pageText = 1 << 19,
  NO_STATIC = 1 << 30,
}

interface ParsedUpperUrl { /** url */ u: string; /** path */ p: string | null }

interface FgRes {
  [kFgReq.findQuery]: string;
  [kFgReq.parseSearchUrl]: ParsedSearch | null;
  [kFgReq.execInChild]: boolean;
  [kFgReq.i18n]: /** rawMessages */ string[]
  [kFgReq.wait]: 0
}
interface FgReqWithRes {
  [kFgReq.findQuery]: /** index */ number
  [kFgReq.parseSearchUrl]: {
    /** url */ u: string;
    /** upper */ p?: undefined;
    /** suggestionId */ i?: undefined
  } | Omit<FgReq[kFgReq.parseUpperUrl], "e">
  [kFgReq.execInChild]: {
    /** url */ u: string;
    /** lastKey */ k: kKeyCode;
    /** ensured args */ a: FgOptions;
  } & Omit<BaseExecute<FgOptions, FgCmdAcrossFrames>, "H">;
  [kFgReq.i18n]: 0
  [kFgReq.wait]: number
}

interface FgReq {
  [kFgReq.setSetting]: SetSettingReq<keyof SettingsNS.FrontUpdateAllowedSettings>;
  [kFgReq.parseSearchUrl]: {
    /** suggestionId */ i: number
    /** url */ u: string;
  };
  [kFgReq.parseUpperUrl]: {
    /** url */ u: string;
    /** upper */ p: number;
    /** appended */ a?: string;
    /** force */ f?: BOOL;
    /** suggestionId */ i?: undefined
    /** trailingSlash */ t: boolean | null | undefined;
    /** (deprecated) trailingSlash (old) */ r?: boolean | null | undefined;
    /** sed : not for kFgReq.parseSearchUrl */ s?: MixedSedOpts | null;
    /** reloadOnRoot / result */ e?: boolean | ParsedUpperUrl
  };
  [kFgReq.findQuery]: {
    /** query */ q: string;
    /** index */ i?: undefined;
  };
  [kFgReq.gotoSession]: {
    /** sessionId */ s: CompletersNS.SessionId
    /** active: default to true  */ a?: boolean;
  };
  [kFgReq.openUrl]: {
    // note: need to sync members to ReqH::openUrl in main.ts
    /** url */ u?: string;
    /** options */ o?: ParsedOpenPageUrlOptions
    /** command options with "$" */ n?: CmdOptions[kFgCmd.autoOpen]
    /** formatted-by-<a>.href */ f?: boolean;
    /** copied */ c?: boolean | "urls" | "any-urls";
    /** incognito */ i?: boolean
    /** https */ h?: boolean | null;
    /** a fallback of reuse, in case of `! .o.reuse` */ r?: UserReuseType
  };
  [kFgReq.searchAs]: {
    /** url */ u: string;
    /** selected text */ t: string;
    /** options for openUrl */ o?: ParsedOpenPageUrlOptions | null
    /** command options with "$" */ n: CmdOptions[kFgCmd.autoOpen]
    /** copied */ c: boolean | "urls" | "any-urls" | undefined;
  };
  [kFgReq.onFrameFocused]: {};
  [kFgReq.checkIfEnabled]: {
    /** url */ u: string;
  };
  [kFgReq.nextFrame]: {
    /** type */ t?: Frames.NextType;
    /** key */ k: kKeyCode;
    /** fallback options */ f?: Req.FallbackOptions;
  };
  [kFgReq.exitGrab]: {};
  [kFgReq.initHelp]: {
    /** wantTop */ w?: boolean;
    /** args */ a?: ShowHelpDialogOptions
  };
  [kFgReq.css]: {};
  [kFgReq.vomnibar]: ({
    /** count */ c: 1;
    /** url */ u: string | null
    /** newtab */ n: boolean
    /** only use .keyword */ o: Pick<ParsedOpenPageUrlOptions, "k">
    /** redo */ r?: undefined;
  } | {
    /** count */ c?: undefined
    /** redo */ r: boolean;
  }) & {
    /** inner */ i?: boolean;
  };
  [kFgReq.omni]: {
    /** query */ q: string;
    /** favIcon */ i?: 0 | 1 | 2;
  } & CompletersNS.Options;
  [kFgReq.copy]: {
    /** data */ s: string | any[];
    /** [].join($j) */ j?: string | boolean | null
    /** sed */ e?: ParsedSedOpts | null;
    u?: undefined | "";
    /** decode */ d?: boolean;
  } | {
    /** url */ u: "url";
    /** data */ s?: undefined | "";
    j?: undefined | null
    /** sed */ e?: ParsedSedOpts | null;
    /** decode */ d?: boolean;
  };
  [kFgReq.key]: {
    /* keySequence */ k: string;
    /** lastKey */ l: kKeyCode;
  };
  [kFgReq.nextKey]: {
    /* keySequence */ k: string
    /** $then/$else info */ f: {
      /** context: counter and last tip */ c: Req.FallbackOptions["$f"];
      /** maxRetried */ r: number | null | undefined
      /** kTip | 0 | 2: tip; false: tab will be updated */ u: kTip | false;
      /** wait for a while; 0 means no waiting */ w?: number | null
    }
  };
  [kFgReq.marks]: ({ /** action */ a: kMarkAction.create } & (MarksNS.NewTopMark | MarksNS.NewMark)) | {
    /** action */ a: kMarkAction.clear;
    /** url */ u: string;
  } | ({ /** action */ a: kMarkAction.goto; c: CmdOptions[kFgCmd.marks] } & MarksNS.FgQuery)
  /**
   * .url is guaranteed to be well formatted by frontend
   */
  [kFgReq.focusOrLaunch]: MarksNS.FocusOrLaunch;
  [kFgReq.cmd]: Pick<BgReq[kBgReq.count], "c" | "i"> & {
    /** count */ n: number;
    /** confirmation-response: 0=fail, 1=cancel, 2=force1, 3=confirm */ r: 0 | 1 | 2 | 3
  };
  [kFgReq.removeSug]: {
    /** type */ t: "tab" | "history";
    /** sessionId / tabId */ s?: CompletersNS.SessionId | null
    /** url */ u: string
  };
  [kFgReq.openImage]: {
    /** file */ f: string | null;
    /** url */ u: string;
    /** hint mode */ m?: HintMode
    /** a fallback of reuse, in case of `! .o.reuse` */ r: ReuseType;
    /** other options */ o?: string;
    /** options for openUrl */ q?: ParsedOpenPageUrlOptions
    /** auto: default to true */ a?: boolean;
  };
  [kFgReq.evalJSFallback]: {
    u: string
  }
  [kFgReq.gotoMainFrame]: {
    /** command */ c: FgCmdAcrossFrames;
    /** focusMainFrame and showFrameBorder */ f: BOOL;
    /** count */ n: number;
    /** options */ a: OptionsWithForce;
  };
  [kFgReq.setOmniStyle]: {
    /** toggled */ t: string;
    /** enable */ e?: boolean; /* if null, then toggle .t */
    /** override-system-settings */ o?: 1; // `o === 1` and `b === false` should never be true in the meanwhile
    /** broadcast, default to true */ b?: boolean;
  };
  [kFgReq.findFromVisual]: {};
  [kFgReq.framesGoBack]: {
    /** step */ s: number
    /** only use o.position */ o: PickIn<Extract<CmdOptions[kFgCmd.framesGoBack], {r?: null}>
        , keyof OpenUrlOptions | keyof Req.FallbackOptions>
  }
  [kFgReq.learnCSS]: {};
  [kFgReq.visualMode]: {
    /** caret mode */ c?: boolean
  };
  [kFgReq.respondForRunKey]: {
    r: BgReq[kBgReq.queryForRunKey]
    /** active element */ e: NonNullable<CurrentEnvCache["element"]>
  }
  [kFgReq.downloadLink]: {
    /** url */ u: string
    /** filename */ f: string | null
    /** referer */ r: string
    /** is media */ m: boolean | BOOL
  }
}

interface CurrentEnvCache {
  /** active element */ element?: [tag: string, id: string, className: string] | 0
}

interface OpenUrlOptions extends UserSedOptions {
  group?: true | null | false
  incognito?: boolean | /** even when url is like chrome-extension:// */ "force" | "reverse" | "keep" | "same" | null
  opener?: boolean | null
  pinned?: boolean | null
  position?: null | "next" | "prev" | "previous" | "left" | "right" | "start" | "begin" | "end" | "before" | "after"
      | "default"
  reuse?: UserReuseType | null
  window?: boolean | "popup" | "normal" | null
}

interface OpenPageUrlOptions extends OpenUrlOptions {
  keyword?: string | null; replace?: string | ValidUrlMatchers | null
  testUrl?: /** use `! .keyword` */ null | boolean | "whole" | "whole-string"
}
interface _ParsedOpenPageUrlOptionNames {
  g: "group"; i: "incognito"; k: "keyword"; m: "replace"
  o: "opener"; p: "position"; r: "reuse"; t: "testUrl"; w: "window"
}
type BaseParsedOpenPageUrlOptions = {
  [k in keyof _ParsedOpenPageUrlOptionNames]?: _ParsedOpenPageUrlOptionNames[k] extends keyof OpenPageUrlOptions
    ? OpenPageUrlOptions[_ParsedOpenPageUrlOptionNames[k]] : never
}
type SimpleParsedOpenUrlOptions = Pick<BaseParsedOpenPageUrlOptions, "g" | "i" | "m" | "o" | "p" | "r" | "w">
interface ParsedOpenPageUrlOptions extends BaseParsedOpenPageUrlOptions {
  /** sed */ s?: ParsedSedOpts | null
}

declare namespace Req {
  interface baseBg<K extends kBgReq> {
    /** name */ N: K;
  }
  type bg<K extends kBgReq> =
    K extends keyof BgReq ? BgReq[K] & baseBg<K> :
    K extends keyof BgVomnibarSpecialReq ? BgVomnibarSpecialReq[K] & baseBg<K> :
    never;
  interface baseFg<K extends kFgReq> {
    /** handler */ H: K;
  }
  type fg<K extends keyof FgReq> = FgReq[K] & baseFg<K>;

  interface fgWithRes<K extends keyof FgRes> extends baseFg<kFgReq.msg> {
    /** msgId */ i: number;
    /** message */ readonly c: K;
    /** argument */ readonly a: FgReqWithRes[K];
  }
  interface res<K extends keyof FgRes> extends bg<kBgReq.msg> {
    readonly r: FgRes[K];
  }

  interface FgCmd<O extends keyof CmdOptions> extends BaseExecute<CmdOptions[O], O>, baseBg<kBgReq.execute> {}
  interface FallbackOptions {
    /** key sequence if succeed */ $then?: string | null
    /** key sequence if fail */ $else?: string | null
    /** [1..20] */ $retry?: number | null
    /** fallback context */ $f?: {
      /** curRetried */ i: number
      /** lastTip */ t: kTip | 0
    } | null
  }
}

interface SetSettingReq<T extends keyof SettingsNS.FrontUpdateAllowedSettings> extends Req.baseFg<kFgReq.setSetting> {
  /** key */ k: SettingsNS.FrontUpdateAllowedSettings[T];
  /** value */ v: T extends keyof SettingsNS.BaseBackendSettings ? SettingsNS.BaseBackendSettings[T] : never;
}

interface ExternalMsgs {
  [kFgReq.id]: {
    req: {
      handler: kFgReq.id;
    };
    res: {
      name: string;
      host: string;
      injector: string;
      shortcuts: boolean;
      version: string;
    };
  };
  [kFgReq.inject]: {
    req: {
      handler: kFgReq.inject;
      scripts?: boolean;
    };
    res: {
      version: string;
      host: string;
      /** the blow are only for inner usages  */
      /** scripts */ s: string[] | null;
      /** versionHash */ h: string;
    };
  };
  [kFgReq.command]: {
    req: {
      handler: kFgReq.command;
      command?: string;
      options?: object | null;
      count?: number;
      key?: kKeyCode;
    };
    res: void;
  };
  [kFgReq.shortcut]: {
    req: {
      handler: kFgReq.shortcut;
      shortcut?: string;
    };
    res: void;
  };
}
