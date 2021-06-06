declare const enum kCmdInfo { NoTab = 0, ActiveTab = 1, CurWndTabsIfRepeat = 2, CurWndTabs = 3, CurShownTabs = 4 }

type BgCmdNoTab<T extends kBgCmd> = (this: void, _fakeArg?: undefined) => void | T
type BgCmdActiveTab<T extends kBgCmd> = (this: void, tabs1: [Tab]) => void | T
type BgCmdActiveTabOrNoTab<T extends kBgCmd> = (this: void, tabs1?: [Tab]) => void | T
type BgCmdCurWndTabs<T extends kBgCmd> = (this: void, tabs1: Tab[]) => void | T

interface BgCmdOptions {
  [kBgCmd.blank]: { /** ms */ for: CountValueOrRef; wait: CountValueOrRef } & Req.FallbackOptions
  // region: need cport
  [kBgCmd.goNext]: {
    isNext: boolean; noRel: boolean; patterns: string | string[]; rel: string; $fmt: 1; absolute: true
  } & UserSedOptions & CSSOptions & Req.FallbackOptions & OpenUrlOptions
  [kBgCmd.insertMode]: {
    key: string
    hideHUD: boolean
    /** (deprecated) */ hideHud: boolean
    insert: boolean
    passExitKey: boolean
    reset: boolean
    unhover: boolean
  }
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
  } & Req.FallbackOptions
  [kBgCmd.toggle]: { key: string; value: any } & Req.FallbackOptions
  [kBgCmd.showHelp]: Omit<ShowHelpDialogOptions, "h">
  [kBgCmd.showVomnibar]: VomnibarNS.GlobalOptions // in fact, also accept others in VomnibarNS.FgOptions
      & { secret: number } & Pick<CmdOptions[kFgCmd.vomnibar], "v">
  [kBgCmd.visualMode]: {
    mode: "visual" | "Visual" | "caret" | "Caret" | "line" | "Line" | ""
    richText: boolean
    start: boolean
  } & Req.FallbackOptions
  // endregion: need cport
  [kBgCmd.addBookmark]: {
    folder: string; /** (deprecated) */ path: string
    all: true | "window"
  } & LimitedRangeOptions
  [kBgCmd.autoOpenFallback]: Extract<CmdOptions[kFgCmd.autoOpen], { o?: 1 }>
  [kBgCmd.captureTab]: {
    /** 0..100; 0 means .png */ jpeg: number
    /** if true, then ignore .jpeg */ png: boolean
    name: "" | "title"
    show: boolean
  } & Pick<OpenPageUrlOptions, "reuse" | "replace" | "position" | "window">
  [kBgCmd.clearCS]: { type: chrome.contentSettings.ValidTypes }
  [kBgCmd.clearFindHistory]: {}
  [kBgCmd.clearMarks]: { local: boolean; all: boolean }
  [kBgCmd.copyWindowInfo]: UserSedOptions & LimitedRangeOptions & {
    /** (deprecated) */ decoded: boolean
    decode: boolean
    type: "" | "frame" | "browser" | "window" | "tab" | "title" | "url"
    /** default to "${title}: ${url}" */ format: string
    join: "json" | string | boolean
  } & Req.FallbackOptions
  [kBgCmd.createTab]: OpenUrlOptions & { url: string; urls: string[]; evenIncognito: boolean | -1, $pure: boolean }
  [kBgCmd.discardTab]: {}
  [kBgCmd.duplicateTab]: {}
  [kBgCmd.goBackFallback]: Extract<CmdOptions[kFgCmd.framesGoBack], {r?: null}>
  [kBgCmd.goToTab]: { absolute: boolean; noPinned: boolean }
  [kBgCmd.goUp]: { type: "tab" | "frame" } & TrailingSlashOptions & UserSedOptions
  [kBgCmd.joinTabs]: {
    sort: "" | /** time */ true | "time" | "create" | "recency" | "id" | "url" | "host" | "title" | "reverse"
    order: /** split by "," */ ("time" | "rtime" | "recent" | "recency"
          | "host" | "url" | "rhost" | "title" | "create" | "rcreate" | "id" | "window" | "rwindow"
          | "index" | "rindex" | "reverse")[]
    windows: "" | "current" | "all"
  }
  [kBgCmd.mainFrame]: Req.FallbackOptions
  [kBgCmd.moveTab]: { group: "keep" | "ignore" | boolean }
  [kBgCmd.moveTabToNewWindow]: { all: boolean | BOOL }
      & Pick<OpenUrlOptions, "incognito" | "position"> & LimitedRangeOptions
  [kBgCmd.moveTabToNextWindow]: { minimized: false; min: false; end: boolean; right: boolean }
      & Pick<OpenUrlOptions, "position">
  [kBgCmd.openUrl]: OpenUrlOptions & MasksForOpenUrl & {
    urls: string[]; $fmt: 1 | 2
    url: string; url_f: Urls.Url
    copied: boolean | "urls" | "any-urls"; /** has pasted once */ $p: 1
    goNext: boolean | "absolute"; /** for ReuseType.reuse */ prefix: boolean
  } & Ensure<OpenPageUrlOptions, keyof OpenPageUrlOptions>
    & /** for .replace, ReuseType.reuse and JS URLs */ Req.FallbackOptions
  [kBgCmd.reloadTab]: { hard: true; /** (deprecated) */ bypassCache: true; single: boolean } & LimitedRangeOptions
  [kBgCmd.removeRightTab]: LimitedRangeOptions & Req.FallbackOptions
  [kBgCmd.removeTab]: LimitedRangeOptions & {
    highlighted: boolean | "no-current"
    goto: "left" | "right" | "previous"
    /** (deprecated) */ left: boolean
    mayClose: boolean
    /** (deprecated) */ allow_close: boolean
    keepWindow: "at-least-one" | "always"
  } & Req.FallbackOptions
  [kBgCmd.removeTabsR]: {
    filter: "url" | "hash" | "host" | "url+title" | "hash+title" | "host+title"
    other: boolean
  } & Req.FallbackOptions
  [kBgCmd.reopenTab]: Pick<OpenUrlOptions, "group">
  [kBgCmd.restoreGivenTab]: Req.FallbackOptions
  [kBgCmd.restoreTab]: { incognito: "force" | true } & Req.FallbackOptions
  [kBgCmd.runKey]: {
    expect: CommandsNS.EnvItemWithKeys[] | Dict<string | string[]> | `${string}:${string},${string}:${string},`
    keys: string[] | /** space-seperated list */ string
    options?: CommandsNS.EnvItemWithKeys["options"]
  } & Req.FallbackOptions
  [kBgCmd.searchInAnother]: { keyword: string; reuse: UserReuseType } & Req.FallbackOptions
      & OpenUrlOptions & MasksForOpenUrl & OpenPageUrlOptions
  [kBgCmd.sendToExtension]: { id: string; data: any; raw: true } & Req.FallbackOptions
  [kBgCmd.showTip]: { text: string } & Req.FallbackOptions
  [kBgCmd.toggleCS]: { action: "" | "reopen"; incognito: boolean; type: chrome.contentSettings.ValidTypes }
  [kBgCmd.toggleMuteTab]: { all: boolean; other: boolean; others: boolean; mute: boolean } & Req.FallbackOptions
  [kBgCmd.togglePinTab]: LimitedRangeOptions & Req.FallbackOptions
  [kBgCmd.toggleTabUrl]: { keyword: string; parsed: string; reader: boolean } & OpenUrlOptions
  [kBgCmd.toggleVomnibarStyle]: { style: string; current: boolean }
  [kBgCmd.toggleZoom]: { level: number }
  [kBgCmd.visitPreviousTab]: Req.FallbackOptions
  [kBgCmd.closeDownloadBar]: { newWindow?: null | true | false; all: 1 }
}

interface BgCmdInfoMap {
  [kBgCmd.captureTab]: kCmdInfo.ActiveTab
  [kBgCmd.createTab]: kCmdInfo.ActiveTab
  [kBgCmd.discardTab]: kCmdInfo.CurWndTabs
  [kBgCmd.goBackFallback]: kCmdInfo.ActiveTab
  [kBgCmd.goToTab]: kCmdInfo.CurShownTabs | kCmdInfo.CurWndTabs
  [kBgCmd.moveTab]: kCmdInfo.CurShownTabs | kCmdInfo.CurWndTabs
  [kBgCmd.moveTabToNextWindow]: kCmdInfo.ActiveTab
  [kBgCmd.openUrl]: kCmdInfo.ActiveTab | kCmdInfo.NoTab
  [kBgCmd.reloadTab]: kCmdInfo.CurWndTabsIfRepeat
  [kBgCmd.removeRightTab]: kCmdInfo.CurWndTabs
  [kBgCmd.removeTabsR]: kCmdInfo.CurWndTabs
  [kBgCmd.reopenTab]: kCmdInfo.ActiveTab
  [kBgCmd.searchInAnother]: kCmdInfo.ActiveTab
  [kBgCmd.toggleCS]: kCmdInfo.ActiveTab
  [kBgCmd.togglePinTab]: kCmdInfo.CurWndTabsIfRepeat
  [kBgCmd.toggleTabUrl]: kCmdInfo.ActiveTab
  [kBgCmd.toggleVomnibarStyle]: kCmdInfo.ActiveTab
  [kBgCmd.visitPreviousTab]: kCmdInfo.CurShownTabs | kCmdInfo.CurWndTabs
}

type UnknownValue = "42" | -0 | false | { fake: 42 } | undefined | null
type CountValueOrRef = number | "count" | "number"
type KnownOptions<K extends keyof BgCmdOptions> = {
  [P in keyof BgCmdOptions[K]]?: BgCmdOptions[K][P] | null
}
type UnknownOptions<K extends keyof BgCmdOptions> = {
  readonly [P in keyof BgCmdOptions[K]]?: BgCmdOptions[K][P] | UnknownValue
}

interface MasksForOpenUrl {
  url_mask: string
  /** (deprecated) */ url_mark: string
  host_mask: string; host_mark: string
  tabid_mask: string; tabId_mask: string; tabid_mark: string; tabId_mark: string
  title_mask: string; title_mark: string
  id_mask: string; id_mark: string; id_marker: string
}

interface LimitedRangeOptions {
  limited: boolean
}

declare namespace CommandsNS {
  interface RawOptions extends SafeDict<any> {
    count?: number | string // float factor to scale the `$count` in its default options
    $count?: number // absolute count: will ignore .count if manually specified
    $desc?: string
    $key?: string
    $if?: {
      sys?: string
      browser?: BrowserType
    } | null
  }
  interface Options extends ReadonlySafeDict<any>, SharedPublicOptions, SharedInnerOptions {}
  interface SharedPublicOptions {
    $count?: number
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
  // encoded info
  interface CustomHelpInfo {
    key_: string; desc_: string; $key_?: undefined
  }
  interface NormalizedCustomHelpInfo {
    $key_: string; $desc_: string
  }
  type BgDescription = [ alias: keyof BgCmdOptions, background: 1, repeat: number, defaultOptions?: {} ]
  type FgDescription = [ alias: keyof CmdOptions, background: 0, repeat: number, defaultOptions?: {} ]
  /** [ enum, is background, count limit, default options ] */
  type Description = BgDescription | FgDescription
  interface BaseHelpItem {
    help_: CustomHelpInfo | NormalizedCustomHelpInfo | null
  }
  interface BaseItem extends BaseHelpItem {
    readonly options_: Options | RawOptions | "__not_parsed__" | null
    readonly repeat_: number
    readonly command_: kCName
  }
  interface NormalizedItem extends BaseItem {
    readonly options_: Options | null
  }
  interface UnnormalizedItem extends BaseItem {
    readonly options_: "__not_parsed__"
    help_: null
  }
  interface ItemWithHelpInfo extends BaseHelpItem {
    help_: NormalizedCustomHelpInfo | null
  }
  type ValidItem = NormalizedItem | UnnormalizedItem
  type Item = ValidItem & ({ readonly alias_: keyof BgCmdOptions; readonly background_: 1
      } | { readonly alias_: keyof CmdOptions; readonly background_: 0 })
  interface EnvItemOptions extends CommandsNS.SharedPublicOptions {}
  interface EnvItemOptions extends Pick<CommandsNS.RawOptions, "count"> {}
}

interface CommandsDataTy {
  keyToCommandRegistry_: Map<string, CommandsNS.Item>
}

interface StatefulBgCmdOptions {
  [kBgCmd.createTab]: null
  [kBgCmd.goNext]: "patterns" | "reuse"
  [kBgCmd.openUrl]: "urls"
}
interface SafeStatefulBgCmdOptions {
  [kBgCmd.runKey]: "expect"
  [kBgCmd.showVomnibar]: "mode"
}

type KeysWithFallback<O extends object, K extends keyof O = keyof O> =
    K extends keyof O ? O[K] extends Req.FallbackOptions ? K : never : never
type SafeOptionKeys<O, K extends keyof O = keyof O> =
    K extends keyof O ? K extends `$${string}` ? K extends "$f" | "$retry"? K : never
    : K extends "fallback" ? never : K : never
type OptionalPick<T, K extends keyof T> = { [P in K]?: T[P] | null; };
type CmdOptionSafeToClone<K extends keyof BgCmdOptions | keyof CmdOptions> =
  K extends keyof BgCmdOptions ? OptionalPick<BgCmdOptions[K], SafeOptionKeys<BgCmdOptions[K]>>
  : K extends keyof CmdOptions ? Pick<CmdOptions[K], SafeOptionKeys<CmdOptions[K]>>
  : never
