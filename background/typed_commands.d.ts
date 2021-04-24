interface BgCmdOptions {
  [kBgCmd.blank]: {}
  // region: need cport
  [kBgCmd.goNext]: {
    isNext: boolean; noRel: boolean; patterns: string | string[]; rel: string; $n: 1; absolute: true
  } & UserSedOptions & CSSOptions
  [kBgCmd.insertMode]: {
    key: string
    hideHUD: boolean
    /** (deprecated) */ hideHud: boolean
    insert: boolean
    passExitKey: boolean
    reset: boolean
    unhover: boolean
  }
  [kBgCmd.nextFrame]: {}
  [kBgCmd.parentFrame]: {}
  [kBgCmd.performFind]: {
    active: boolean
    highlight: boolean
    normalize: boolean
    index: "other" | "count" | number
    last: boolean
    postOnEsc: boolean
    returnToViewport: true
    selected: boolean
  }
  [kBgCmd.toggle]: { key: string; value: any }
  [kBgCmd.showHelp]: Omit<ShowHelpDialogOptions, "h">
  [kBgCmd.showVomnibar]: VomnibarNS.GlobalOptions // in fact, also accept others in VomnibarNS.FgOptions
      & { secret: number } & Pick<CmdOptions[kFgCmd.vomnibar], "v">
  [kBgCmd.visualMode]: {
    mode: "visual" | "Visual" | "caret" | "Caret" | "line" | "Line" | ""
    richText: boolean
    start: boolean
  }
  // endregion: need cport
  [kBgCmd.addBookmark]: {
    folder: string; /** (deprecated) */ path: string
    all: true | "window"
  } & LimitedRangeOptions
  [kBgCmd.autoOpenFallback]: { keyword: string }
  [kBgCmd.captureTab]: {
    /** 0..100; 0 means .png */ jpeg: number
    name: "" | "title"
    show: boolean
  }
  [kBgCmd.clearCS]: { type: chrome.contentSettings.ValidTypes }
  [kBgCmd.clearFindHistory]: {}
  [kBgCmd.clearMarks]: { local: boolean; all: boolean }
  [kBgCmd.copyWindowInfo]: UserSedOptions & LimitedRangeOptions & {
    /** (deprecated) */ decoded: boolean
    decode: boolean
    type: "" | "frame" | "browser" | "window" | "tab" | "title" | "url"
    /** default to "${title}: ${url}" */ format: string
    join: "json" | string | boolean
  }
  [kBgCmd.createTab]: OpenUrlOptions & { url: string; urls: string[]; evenIncognito: boolean | -1 }
  [kBgCmd.discardTab]: {}
  [kBgCmd.duplicateTab]: {}
  [kBgCmd.goBackFallback]: { reuse: UserReuseType }
  [kBgCmd.goToTab]: { absolute: boolean; noPinned: boolean }
  [kBgCmd.goUp]: { type: "tab" | "frame" } & TrailingSlashOptions & UserSedOptions
  [kBgCmd.joinTabs]: {
    sort: "" | "time" | "create" | "recency" | "recent" | "id"
    windows: "" | "current" | "all"
  }
  [kBgCmd.mainFrame]: {}
  [kBgCmd.moveTab]: { group: "keep" | "ignore" }
  [kBgCmd.moveTabToNewWindow]: { all: boolean | BOOL; incognito: boolean } & LimitedRangeOptions
  [kBgCmd.moveTabToNextWindow]: { minimized: false; min: false; end: boolean; right: boolean }
  [kBgCmd.openUrl]: OpenUrlOptions & MasksForOpenUrl & {
    urls: string[]; formatted_: 1
    url: string; url_f: Urls.Url
    copied: boolean; goNext: boolean | "absolute"; keyword: string; testUrl: boolean
  }
  [kBgCmd.reloadTab]: { hard: true; /** (deprecated) */ bypassCache: true; single: boolean } & LimitedRangeOptions
  [kBgCmd.removeRightTab]: LimitedRangeOptions
  [kBgCmd.removeTab]: LimitedRangeOptions & {
    highlighted: boolean | "no-current"
    goto: "left" | "right" | "previous"
    /** (deprecated) */ left: boolean
    mayClose: boolean
    /** (deprecated) */ allow_close: boolean
    keepWindow: "at-least-one" | "always"
  }
  [kBgCmd.removeTabsR]: {
    filter: "url" | "hash" | "host" | "url+title" | "hash+title" | "host+title"
    other: boolean
  }
  [kBgCmd.reopenTab]: {}
  [kBgCmd.restoreGivenTab]: {}
  [kBgCmd.restoreTab]: { incognito: "force" | true }
  [kBgCmd.runKey]: {
    expect: CommandsNS.EnvItemWithKeys[] | Dict<string | string[]> | `${string}:${string},${string}:${string},`
    keys: string[] | /** space-seperated list */ string
    options?: object
  }
  [kBgCmd.searchInAnother]: { keyword: string; reuse: UserReuseType }
  [kBgCmd.sendToExtension]: { id: string; data: any; raw: true }
  [kBgCmd.showTip]: { text: string }
  [kBgCmd.toggleCS]: { action: "" | "reopen"; incognito: boolean; type: chrome.contentSettings.ValidTypes }
  [kBgCmd.toggleMuteTab]: { all: boolean; other: boolean; others: boolean; mute: boolean }
  [kBgCmd.togglePinTab]: LimitedRangeOptions
  [kBgCmd.toggleTabUrl]: { keyword: string; parsed: string; reader: boolean } & OpenUrlOptions
  [kBgCmd.toggleVomnibarStyle]: { style: string; current: boolean }
  [kBgCmd.toggleZoom]: { level: number }
  [kBgCmd.visitPreviousTab]: {}
  [kBgCmd.closeDownloadBar]: { newWindow?: null | true | false; all: 1 }
}

type UnknownValue = "42" | -0 | false | { fake: 42 } | undefined | null
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
  tabid_mask: string; tabId_mask: string; tabid_mark: string
  title_mask: string; title_mark: string
  id_mask: string; id_mark: string; id_marker: string
}

interface LimitedRangeOptions {
  limited: boolean
}

declare namespace CommandsNS {
  interface RawOptions extends SafeDict<any> {
    count?: number | string // float factor to scale count
    $count?: number // absolute count: will ignore .count in default options
    $desc?: string
    $key?: string
    $if?: {
      sys?: string
      browser?: BrowserType
    } | null
  }
  interface Options extends ReadonlySafeDict<any> {
    count?: number
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
}

interface CommandsDataTy {
  keyToCommandRegistry_: Map<string, CommandsNS.Item>
}
