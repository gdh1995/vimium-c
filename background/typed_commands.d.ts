declare const enum kCmdInfo { NoTab = 0, ActiveTab = 1, CurShownTabsIfRepeat = 2, CurShownTabs = 3 }

type Tab = chrome.tabs.Tab
type CmdResult = /** false */ 0 | /** true */ 1 | false | true | /** true and timeout=50 */ 50 | Tab | /** stop */ -1
// if not call it, then it means do nothing
type OnCmdResolved = (result: CmdResult) => void
type BgCmdNoTab<T extends kBgCmd> = (this: void, resolve: OnCmdResolved) => void | T
type BgCmdActiveTab<T extends kBgCmd> = (this: void, tabs: [Tab], resolve: OnCmdResolved) => void | T
type BgCmdCurWndTabs<T extends kBgCmd> = (this: void, tabs: Tab[], resolve: OnCmdResolved) => void | T

interface BgCmdOptions {
  [kBgCmd.blank]: {
    /** ms */ for: CountValueOrRef; wait: CountValueOrRef; block: boolean; isError?: boolean
  } & Req.FallbackOptions
//#region need cport
  [kBgCmd.confirm]: { question: string, ask?: string, text?: string, value?: string, minRepeat: number }
      & Req.FallbackOptions
  [kBgCmd.goNext]: {
    isNext: boolean; noRel: boolean; patterns: string | string[]; rel: string; $fmt: 1; absolute: true; view?: false
    avoidClick?: boolean
  } & UserSedOptions & CSSOptions & Req.FallbackOptions & OpenUrlOptions
  [kBgCmd.insertMode]: {
    key: string
    hideHUD: boolean | "force" | "always" | "auto"
    /** (deprecated) */ hideHud: boolean
    insert: boolean
    passExitKey: boolean
    reset: boolean
    unhover: boolean
  } & Req.FallbackOptions & Pick<CmdOptions[kFgCmd.insertMode], "bubbles">
  [kBgCmd.nextFrame]: Req.FallbackOptions
  [kBgCmd.parentFrame]: Req.FallbackOptions
  [kBgCmd.performFind]: {
    active: boolean
    highlight: boolean
    normalize: boolean
    index: "other" | "count" | number
    last: boolean
    postOnEsc: boolean
    query: string
    restart: boolean
    returnToViewport: true
    selected: boolean
    extend: boolean | "after" | "" | "before"
    direction: "after" | "" | "before"
    scroll: "" | "auto" | "instant" | "manual"
  } & Req.FallbackOptions
  [kBgCmd.toggle]: { key: string; value: any } & Req.FallbackOptions
  [kBgCmd.showHelp]: Omit<ShowHelpDialogOptions, "h">
  [kBgCmd.dispatchEventCmd]: CmdOptions[kFgCmd.dispatchEventCmd]
  [kBgCmd.showVomnibar]: VomnibarNS.GlobalOptions
  [kBgCmd.marksActivate]: {
    extUrl: boolean
    key?: string
    local?: boolean
    mode: "create" | /* all others are treated as "goto"  */ "goto" | "goTo"
    type: null | "tab" | "frame"
    swap: boolean // swap meanings of shiftKey
    prefix: true | false
    parent: boolean
    storeCount: boolean
    wait?: boolean | number
  } & OpenPageUrlOptions & Req.FallbackOptions
  [kBgCmd.visualMode]: {
    mode: "visual" | "Visual" | "caret" | "Caret" | "line" | "Line" | ""
    richText: boolean
    start: boolean
  } & OpenPageUrlOptions & Req.FallbackOptions
//#endregion
  [kBgCmd.addBookmark]: {
    folder: string; /** (deprecated) */ path: string; position: null | "before" | "after" | "begin" | "end"
    all: true | "window"; id: string
  } & LimitedRangeOptions & TabFilterOptions
  [kBgCmd.autoOpenFallback]: Extract<CmdOptions[kFgCmd.autoOpen], { o?: 1 }>
  [kBgCmd.captureTab]: {
    /** 0..100; 0 means .png */ jpeg: number
    /** if true, then ignore .jpeg */ png: boolean
    richText?: "" | "with-name"
    name: "" | "title"
    show: boolean; download: boolean; /** only on Firefox */ copy: boolean
  } & Pick<OpenPageUrlOptions, "reuse" | "replace" | "position" | "window">
  [kBgCmd.clearCS]: { type: chrome.contentSettings.ValidTypes }
  [kBgCmd.clearFindHistory]: {}
  [kBgCmd.clearMarks]: Pick<BgCmdOptions[kBgCmd.marksActivate], "type"> & { local: boolean; all: boolean }
      & Req.FallbackOptions
  [kBgCmd.copyWindowInfo]: UserSedOptions & LimitedRangeOptions & TabFilterOptions & {
    keyword: string
    type: "" | "frame" | "browser" | "window" | "tab" | "title" | "url" | "host" | "hostname" | "origin"
    /** default to "${title}: ${url}" */ format: string
    join: "json" | string | boolean
  } & Req.FallbackOptions & Pick<OpenPageUrlOptions, "decoded" | "decode">
  [kBgCmd.createTab]: OpenUrlOptions & { url: string; urls: string[]; evenIncognito: boolean | -1, $pure: boolean }
  [kBgCmd.discardTab]: TabFilterOptions
  [kBgCmd.duplicateTab]: { active: false }
  [kBgCmd.goBackFallback]: Extract<CmdOptions[kFgCmd.framesGoBack], {r?: null}>
  [kBgCmd.goToTab]: { absolute: boolean; noPinned: boolean } & TabFilterOptions & MoveTabOptions
  [kBgCmd.goUp]: { type: "tab" | "frame"; reloadOnRoot: true | false } & TrailingSlashOptions & UserSedOptions
  [kBgCmd.joinTabs]: {
    sort: "" | /** time */ true | "time" | "create" | "recency" | "id" | "url" | "host" | "title" | "reverse"
    order: /** split by "," */ ("time" | "rtime" | "recent" | "recency"
          | "host" | "url" | "rhost" | "title" | "create" | "rcreate" | "id" | "window" | "rwindow"
          | "index" | "rindex" | "reverse" | "-time")[]
    windows: "" | "current" | "all"
    position: "" | "begin" | "start" | "before" | "after" | "end" | "keep"
  } & TabFilterOptions
  [kBgCmd.mainFrame]: Req.FallbackOptions
  [kBgCmd.moveTab]: { group: "keep" | "ignore" | boolean }
  [kBgCmd.moveTabToNewWindow]: { all: boolean | BOOL; focused: boolean; active: false; rightInOld: boolean }
      & Pick<OpenUrlOptions, "incognito" | "position"> & LimitedRangeOptions & TabFilterOptions
  [kBgCmd.moveTabToNextWindow]: { minimized: false; min: false; end: boolean; right: true | false
      focused: boolean; active: false; last: boolean; tabs: boolean; nextWindow: boolean | number }
      & Pick<OpenUrlOptions, "position"> & LimitedRangeOptions & TabFilterOptions
  [kBgCmd.openUrl]: OpenUrlOptions & MasksForOpenUrl & {
    urls: string[]; $fmt: 1 | 2
    url: string; url_f: Urls.Url
    copied: boolean | "auto-urls" | "urls" | "any-urls" | `url<${string}`; /** has pasted once */ $p: 1
    goNext: boolean | "absolute"; /** for ReuseType.reuse */ prefix: boolean; parent: boolean
    /** value for .mask */ value: string
  } & Ensure<OpenPageUrlOptions, keyof OpenPageUrlOptions>
    & /** for .replace, ReuseType.reuse and JS URLs */ Req.FallbackOptions
  [kBgCmd.reloadTab]: { hard: boolean; single: boolean } & LimitedRangeOptions & TabFilterOptions
  [kBgCmd.removeRightTab]: LimitedRangeOptions & TabFilterOptions & Req.FallbackOptions
  [kBgCmd.removeTab]: LimitedRangeOptions & {
    highlighted: boolean | "no-current"
    goto: "left" | "right" | "previous" | "previous-only" | "previous,left"
        | "near" | "reverse" | "backward" | "forward"
    /** (deprecated) */ left: boolean
    mayClose: boolean
    /** (deprecated) */ allow_close: boolean
    keepWindow: "at-least-one" | "always"
    /** only work when close one tab */ filter: TabFilterOptions["filter"]
    noPinned: boolean | null
  } & Req.FallbackOptions
  [kBgCmd.removeTabsR]: {
    others: boolean; other: boolean; mayConfirm: true; noPinned: boolean | null; acrossWindows: true
  } & TabFilterOptions & Req.FallbackOptions
  [kBgCmd.reopenTab]: Pick<OpenUrlOptions, "group"> & Req.FallbackOptions
  [kBgCmd.restoreTab]: { incognito: "force" | true; one: boolean; active: false; currentWindow?: boolean }
  [kBgCmd.runKey]: {
    expect: (CommandsNS.CondItem | null)[] | Dict<CommandsNS.CondItem | CommandsNS.CondKeys>
        | `${string}:${string},${string}:${string},`
    keys: string[] | /** comma/space-seperated list */ string
    options?: CommandsNS.EnvItem["options"]
    $normalized?: 0 | 1 | 2
    [key: `o.${string}`]: any
    // [key2: string]: any // this will always be overwritten by its corresponding `o.${key2}` version
    $seq: {
      /** node tree */ keys: object, repeat: number, options: CommandsNS.EnvItem["options"] | undefined
      cursor: object | null, timeout: number
      id: string, fallback: Req.FallbackOptions | null
    }
  } & Req.FallbackOptions & MaskOptions
  [kBgCmd.searchInAnother]: { keyword: string; reuse: UserReuseType } & Req.FallbackOptions
      & OpenUrlOptions & MasksForOpenUrl & OpenPageUrlOptions
  [kBgCmd.sendToExtension]: { id: string; data: any; raw: true } & Req.FallbackOptions
  [kBgCmd.showHUD]: {
    text: string
    isError: true
    /** only return cmd result, but not show */ silent: boolean
  } & Req.FallbackOptions
  [kBgCmd.toggleCS]: { action: "" | "reopen"; incognito: boolean; type: chrome.contentSettings.ValidTypes }
  [kBgCmd.toggleMuteTab]: { all: boolean; currentWindow?: boolean; others: boolean; other: boolean; mute: boolean }
      & TabFilterOptions & Req.FallbackOptions
  [kBgCmd.togglePinTab]: LimitedRangeOptions & TabFilterOptions & Req.FallbackOptions
  [kBgCmd.toggleTabUrl]: { keyword: string; parsed: string; reader: boolean; viewSource: boolean
      } & OpenUrlOptions & MasksForOpenUrl
  [kBgCmd.toggleVomnibarStyle]: { style?: string; current: boolean; enable?: boolean | null, forced: boolean
      } & Req.FallbackOptions
  [kBgCmd.toggleZoom]: { level: number; in?: true; out?: true; reset?: true; min: number; max: number }
  [kBgCmd.visitPreviousTab]: { acrossWindows: true; onlyActive: true } & TabFilterOptions & MoveTabOptions
  [kBgCmd.closeDownloadBar]: { newWindow?: null | true | false; all: 1 }
  [kBgCmd.reset]: { suppress: boolean } & Pick<BgCmdOptions[kBgCmd.insertMode], "unhover"> & Req.FallbackOptions
  [kBgCmd.openBookmark]: { title: string; path: string; id: string; name: string; value: string
      $cache: [CompletersNS.Bookmark["id_"], number] | null } & MaskOptions
  [kBgCmd.toggleWindow]: {
    target: "current" | "last" | "all" | "others" | "other"
    states: ("normal" | "minimized" | "maximized" | "fullscreen" | "current" | "keep" | "")[] | string
  }
}

interface BgCmdInfoMap {
  [kBgCmd.captureTab]: kCmdInfo.ActiveTab
  [kBgCmd.createTab]: kCmdInfo.ActiveTab
  [kBgCmd.discardTab]: kCmdInfo.CurShownTabsIfRepeat
  [kBgCmd.goBackFallback]: kCmdInfo.ActiveTab
  [kBgCmd.moveTab]: kCmdInfo.CurShownTabsIfRepeat
  [kBgCmd.moveTabToNextWindow]: kCmdInfo.ActiveTab
  [kBgCmd.reloadTab]: kCmdInfo.CurShownTabsIfRepeat
  [kBgCmd.removeRightTab]: kCmdInfo.CurShownTabsIfRepeat
  [kBgCmd.reopenTab]: kCmdInfo.ActiveTab
  [kBgCmd.searchInAnother]: kCmdInfo.ActiveTab
  [kBgCmd.toggleCS]: kCmdInfo.ActiveTab
  [kBgCmd.togglePinTab]: kCmdInfo.CurShownTabsIfRepeat
  [kBgCmd.toggleTabUrl]: kCmdInfo.ActiveTab
  [kBgCmd.toggleVomnibarStyle]: kCmdInfo.ActiveTab
}

type UnknownValue = "42" | -0 | false | { fake: 42 } | undefined | null
type CountValueOrRef = number | "count" | "number" | "ready"
type KnownOptions<K extends keyof BgCmdOptions> = {
  [P in keyof BgCmdOptions[K]]?: BgCmdOptions[K][P] | null
}
type UnknownOptions<K extends keyof BgCmdOptions> = {
  readonly [P in keyof BgCmdOptions[K]]?: BgCmdOptions[K][P] | UnknownValue
}

interface MasksForOpenUrl extends MaskOptions {
  url_mask: string | boolean
  /** (deprecated) */ url_mark: string | boolean
  host_mask: string; host_mark: string
  tabid_mask: string; tabId_mask: string; tabid_mark: string; tabId_mark: string
  title_mask: string; title_mark: string
  id_mask: string; id_mark: string; id_marker: string
}

interface LimitedRangeOptions {
  limited: boolean | "auto"
  $limit: number // for "limit=count" in .filter
}
interface MaskOptions { mask: boolean | string | ""; $masked: boolean }

interface TabFilterOptions {
  filter: "url" | "hash" | "url=..." | "host" | "host=..." | "title" | "title*" | "group" | "url+hash" | "host&title"
}
interface MoveTabOptions extends Req.FallbackOptions {
  blur: boolean | /** host matcher */ string | ValidUrlMatchers
  grabFocus: boolean | string // alias of .blur
}

declare namespace CommandsNS {
  interface RawOptions extends SafeDict<any> {
    count?: number | string // float factor to scale the `$count` in its default options
    $count?: number // absolute count: will ignore .count if manually specified
    $if?: {
      sys?: string
      browser?: BrowserType
      before?: string
    } | "win" | "!win" | "linux" | "mac" | "chrome" | "chromium" | "edg" | "firefox" | "edge" | "safari" | null
  }
  interface Options extends ReadonlySafeDict<any>, SharedPublicOptions, SharedInnerOptions {}
  interface SharedPublicOptions {
    $count?: number
    confirmed?: true
  }
  interface SharedInnerOptions {
    $o?: Options
    $noWarn?: boolean
  }
  interface RawCustomizedOptions extends RawOptions {
    command?: string
  }
  interface RawLinkHintsOptions extends RawOptions {
    mode?: number | string | null
    characters?: string | null
  }
  type BgDescription = [ alias: keyof BgCmdOptions, background: 1, repeat: number, defaultOptions?: {} ]
  type FgDescription = [ alias: keyof CmdOptions, background: 0, repeat: number, defaultOptions?: {} ]
  /** [ enum, is background, count limit, default options ] */
  type Description = BgDescription | FgDescription
  interface BaseItem {
    readonly options_: Options | RawOptions | "__not_parsed__" | null
    readonly repeat_: number
    readonly command_: kCName
    hasNext_: boolean | null
  }
  interface NormalizedItem extends BaseItem {
    readonly options_: Options | null
  }
  interface UnnormalizedItem extends BaseItem {
    readonly options_: "__not_parsed__"
  }
  type ValidItem = NormalizedItem | UnnormalizedItem
  type Item = ValidItem & ({ readonly alias_: keyof BgCmdOptions; readonly background_: 1
      } | { readonly alias_: keyof CmdOptions; readonly background_: 0 })
  interface EnvItemOptions extends CommandsNS.SharedPublicOptions {}
  interface EnvItemOptions extends Pick<CommandsNS.RawOptions, "count"> {}

  type CondKeys = string | string[]
  interface CondValueItem extends Pick<EnvItem, "options"> { keys: CondKeys }
  interface NormalizedEnvCond extends CondValueItem {
    env: string | EnvItem
    keys: string[]
  }
  type CondItem = EnvItem & { env?: undefined } & CondValueItem | NormalizedEnvCond
}

interface StatefulBgCmdOptions {
  [kBgCmd.createTab]: null
  [kBgCmd.openBookmark]: null
  [kBgCmd.goNext]: "patterns" | "reuse"
  [kBgCmd.goToTab]: "blur" | "grabFocus"
  [kBgCmd.openUrl]: "urls" | "group" | "replace"
  [kBgCmd.runKey]: "expect" | "keys"
  [kBgCmd.togglePinTab]: null
  [kBgCmd.restoreTab]: "currentWindow"
}
interface SafeStatefulBgCmdOptions {
  [kBgCmd.showVomnibar]: "mode"
}

type KeysWithFallback<O extends object, K extends keyof O = keyof O> =
    K extends keyof O ? O[K] extends Req.FallbackOptions ? K : never : never
type SafeOptionKeys<O, K extends keyof O = keyof O> =
    K extends keyof O ? K extends `$${string}` ? never : K : never
type OptionalPickOptions<T, K extends keyof T> = { [P in K]?: T[P] | null; }
type CmdOptionSafeToClone<K extends keyof BgCmdOptions | keyof CmdOptions> =
  K extends keyof BgCmdOptions ? OptionalPickOptions<BgCmdOptions[K], SafeOptionKeys<BgCmdOptions[K]>>
  : K extends keyof CmdOptions ? Pick<CmdOptions[K], SafeOptionKeys<CmdOptions[K]>>
  : never

/** must keep plain, because it may be sent to content scripts */
interface CurrentEnvCache {
  element?: [tag: string, id: string, classList: string[]] | 0
  fullscreen?: boolean
  url?: string
}

declare const enum CNameLiterals {
  focusOptions = "focusOptions",
  userCustomized = "userCustomized"
}

interface CmdNameIds {
  "LinkHints.activate": kFgCmd.linkHints
  "LinkHints.activateCopyImage": kFgCmd.linkHints
  "LinkHints.activateCopyLinkText": kFgCmd.linkHints
  "LinkHints.activateCopyLinkUrl": kFgCmd.linkHints
  "LinkHints.activateDownloadImage": kFgCmd.linkHints
  "LinkHints.activateDownloadLink": kFgCmd.linkHints
  "LinkHints.activateEdit": kFgCmd.linkHints
  "LinkHints.activateFocus": kFgCmd.linkHints
  "LinkHints.activateHover": kFgCmd.linkHints
  "LinkHints.activateLeave": kFgCmd.linkHints
  "LinkHints.activateMode": kFgCmd.linkHints
  "LinkHints.activateModeToCopyImage": kFgCmd.linkHints
  "LinkHints.activateModeToCopyLinkText": kFgCmd.linkHints
  "LinkHints.activateModeToCopyLinkUrl": kFgCmd.linkHints
  "LinkHints.activateModeToDownloadImage": kFgCmd.linkHints
  "LinkHints.activateModeToDownloadLink": kFgCmd.linkHints
  "LinkHints.activateModeToEdit": kFgCmd.linkHints
  "LinkHints.activateModeToFocus": kFgCmd.linkHints
  "LinkHints.activateModeToHover": kFgCmd.linkHints
  "LinkHints.activateModeToLeave": kFgCmd.linkHints
  "LinkHints.activateModeToOpenImage": kFgCmd.linkHints
  "LinkHints.activateModeToOpenIncognito": kFgCmd.linkHints
  "LinkHints.activateModeToOpenInNewForegroundTab": kFgCmd.linkHints
  "LinkHints.activateModeToOpenInNewTab": kFgCmd.linkHints
  "LinkHints.activateModeToOpenUrl": kFgCmd.linkHints
  "LinkHints.activateModeToOpenVomnibar": kFgCmd.linkHints
  "LinkHints.activateModeToSearchLinkText": kFgCmd.linkHints
  "LinkHints.activateModeToSelect": kFgCmd.linkHints
  "LinkHints.activateModeToUnhover": kFgCmd.linkHints
  "LinkHints.activateModeWithQueue": kFgCmd.linkHints
  "LinkHints.activateOpenImage": kFgCmd.linkHints
  "LinkHints.activateOpenIncognito": kFgCmd.linkHints
  "LinkHints.activateOpenInNewForegroundTab": kFgCmd.linkHints
  "LinkHints.activateOpenInNewTab": kFgCmd.linkHints
  "LinkHints.activateOpenUrl": kFgCmd.linkHints
  "LinkHints.activateOpenVomnibar": kFgCmd.linkHints
  "LinkHints.activateSearchLinkText": kFgCmd.linkHints
  "LinkHints.activateSelect": kFgCmd.linkHints
  "LinkHints.activateUnhover": kFgCmd.linkHints
  "LinkHints.activateWithQueue": kFgCmd.linkHints
  "LinkHints.click": kFgCmd.linkHints
  "LinkHints.unhoverLast": kFgCmd.insertMode
  "Marks.activate": kBgCmd.marksActivate
  "Marks.activateCreate": kBgCmd.marksActivate
  "Marks.activateCreateMode": kBgCmd.marksActivate
  "Marks.activateGoto": kBgCmd.marksActivate
  "Marks.activateGotoMode": kBgCmd.marksActivate
  "Marks.clearGlobal": kBgCmd.clearMarks
  "Marks.clearLocal": kBgCmd.clearMarks
  "Vomnibar.activate": kBgCmd.showVomnibar
  "Vomnibar.activateBookmarks": kBgCmd.showVomnibar
  "Vomnibar.activateBookmarksInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateEditUrl": kBgCmd.showVomnibar
  "Vomnibar.activateEditUrlInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateHistory": kBgCmd.showVomnibar
  "Vomnibar.activateHistoryInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateInNewTab": kBgCmd.showVomnibar
  "Vomnibar.activateTabs": kBgCmd.showVomnibar
  "Vomnibar.activateTabSelection": kBgCmd.showVomnibar
  "Vomnibar.activateUrl": kBgCmd.showVomnibar
  "Vomnibar.activateUrlInNewTab": kBgCmd.showVomnibar
  addBookmark: kBgCmd.addBookmark
  autoCopy: kFgCmd.autoOpen
  autoOpen: kFgCmd.autoOpen
  blank: kBgCmd.blank
  captureTab: kBgCmd.captureTab
  clearContentSetting: kBgCmd.clearCS
  clearContentSettings: kBgCmd.clearCS
  clearCS: kBgCmd.clearCS
  clearFindHistory: kBgCmd.clearFindHistory
  closeDownloadBar: kBgCmd.closeDownloadBar
  closeOtherTabs: kBgCmd.removeTabsR
  closeSomeOtherTabs: kBgCmd.removeTabsR
  closeTabsOnLeft: kBgCmd.removeTabsR
  closeTabsOnRight: kBgCmd.removeTabsR
  confirm: kBgCmd.confirm
  copyCurrentTitle: kBgCmd.copyWindowInfo
  copyCurrentUrl: kBgCmd.copyWindowInfo
  copyWindowInfo: kBgCmd.copyWindowInfo
  createTab: kBgCmd.createTab
  debugBackground: kBgCmd.openUrl
  discardTab: kBgCmd.discardTab
  dispatchEvent: kBgCmd.dispatchEventCmd
  duplicateTab: kBgCmd.duplicateTab
  editText: kFgCmd.editText
  enableContentSettingTemp: kBgCmd.toggleCS
  enableCSTemp: kBgCmd.toggleCS
  enterFindMode: kBgCmd.performFind
  enterInsertMode: kBgCmd.insertMode
  enterVisualLineMode: kBgCmd.visualMode
  enterVisualMode: kBgCmd.visualMode
  firstTab: kBgCmd.goToTab
  focusInput: kFgCmd.focusInput
  focusOrLaunch: kBgCmd.openUrl
  goBack: kFgCmd.framesGoBack
  goForward: kFgCmd.framesGoBack
  goNext: kBgCmd.goNext
  goPrevious: kBgCmd.goNext
  goToRoot: kBgCmd.goUp
  goUp: kBgCmd.goUp
  joinTabs: kBgCmd.joinTabs
  lastTab: kBgCmd.goToTab
  mainFrame: kBgCmd.mainFrame
  moveTabLeft: kBgCmd.moveTab
  moveTabRight: kBgCmd.moveTab
  moveTabToIncognito: kBgCmd.moveTabToNewWindow
  moveTabToNewWindow: kBgCmd.moveTabToNewWindow
  moveTabToNextWindow: kBgCmd.moveTabToNextWindow
  newTab: kBgCmd.createTab
  nextFrame: kBgCmd.nextFrame
  nextTab: kBgCmd.goToTab
  openBookmark: kBgCmd.openBookmark
  openCopiedUrlInCurrentTab: kBgCmd.openUrl
  openCopiedUrlInNewTab: kBgCmd.openUrl
  openUrl: kBgCmd.openUrl
  parentFrame: kBgCmd.parentFrame
  passNextKey: kFgCmd.passNextKey
  performAnotherFind: kBgCmd.performFind
  performBackwardsFind: kBgCmd.performFind
  performFind: kBgCmd.performFind
  previousTab: kBgCmd.goToTab
  quickNext: kBgCmd.goToTab
  reload: kFgCmd.framesGoBack
  reloadGivenTab: kBgCmd.reloadTab
  reloadTab: kBgCmd.reloadTab
  removeRightTab: kBgCmd.removeRightTab
  removeTab: kBgCmd.removeTab
  reopenTab: kBgCmd.reopenTab
  reset: kBgCmd.reset
  restoreGivenTab: kBgCmd.restoreTab
  restoreTab: kBgCmd.restoreTab
  runKey: kBgCmd.runKey
  scrollDown: kFgCmd.scroll
  scrollFullPageDown: kFgCmd.scroll
  scrollFullPageUp: kFgCmd.scroll
  scrollLeft: kFgCmd.scroll
  scrollPageDown: kFgCmd.scroll
  scrollPageUp: kFgCmd.scroll
  scrollPxDown: kFgCmd.scroll
  scrollPxLeft: kFgCmd.scroll
  scrollPxRight: kFgCmd.scroll
  scrollPxUp: kFgCmd.scroll
  scrollRight: kFgCmd.scroll
  scrollSelect: kFgCmd.scrollSelect
  scrollTo: kFgCmd.scroll
  scrollToBottom: kFgCmd.scroll
  scrollToLeft: kFgCmd.scroll
  scrollToRight: kFgCmd.scroll
  scrollToTop: kFgCmd.scroll
  scrollUp: kFgCmd.scroll
  searchAs: kFgCmd.autoOpen
  searchInAnother: kBgCmd.searchInAnother
  sendToExtension: kBgCmd.sendToExtension
  showHelp: kBgCmd.showHelp
  showHud: kBgCmd.showHUD
  showHUD: kBgCmd.showHUD
  showTip: kBgCmd.showHUD
  simBackspace: kFgCmd.focusInput
  simulateBackspace: kFgCmd.focusInput
  sortTabs: kBgCmd.joinTabs
  switchFocus: kFgCmd.focusInput
  toggleContentSetting: kBgCmd.toggleCS
  toggleCS: kBgCmd.toggleCS
  toggleLinkHintCharacters: kBgCmd.toggle
  toggleMuteTab: kBgCmd.toggleMuteTab
  togglePinTab: kBgCmd.togglePinTab
  toggleReaderMode: kBgCmd.toggleTabUrl
  toggleStyle: kFgCmd.toggleStyle
  toggleSwitchTemp: kBgCmd.toggle
  toggleUrl: kBgCmd.toggleTabUrl
  toggleViewSource: kBgCmd.toggleTabUrl
  toggleVomnibarStyle: kBgCmd.toggleVomnibarStyle
  toggleWindow: kBgCmd.toggleWindow
  visitPreviousTab: kBgCmd.visitPreviousTab
  wait: kBgCmd.blank
  zoom: kBgCmd.toggleZoom
  zoomIn: kBgCmd.toggleZoom
  zoomOut: kBgCmd.toggleZoom
  zoomReset: kBgCmd.toggleZoom
}
type kCName = keyof CmdNameIds

declare const enum kShortcutAliases { nextTab1 = "quickNext" }
type StandardShortcutNames = "createTab" | "goBack" | "goForward" | "previousTab"
    | "nextTab" | "reloadTab" | CNameLiterals.userCustomized

interface ObjectConstructor {
  assign<T extends object, Ensured extends keyof T>(target: PartialOrEnsured<T, Ensured>
      , source: Readonly<PartialOrEnsured<T, Exclude<keyof T, Ensured>>>): T
}
