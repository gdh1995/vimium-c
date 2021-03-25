import { settings } from "./store"

export type Tab = chrome.tabs.Tab
export type Window = chrome.windows.Window

export interface IncNormalWnd extends Window { incognito: true; type: "normal" }
export interface ActiveTab extends Tab { active: true }
export interface PopWindow extends Window { tabs: Tab[] }

export interface InfoToCreateMultiTab extends
    Partial<Pick<chrome.tabs.CreateProperties, "index" | "openerTabId" | "windowId">> {
  url: string; active: boolean; pinned?: boolean }

export const browser_: typeof chrome = Build.BTypes & ~BrowserType.Chrome
    && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
    ? (browser as typeof chrome) : chrome
export const browserTabs = browser_.tabs
export const browserWindows = browser_.windows
export const browserSessions = (): typeof chrome.sessions => browser_.sessions
export const browserWebNav = (): typeof chrome.webNavigation | undefined => browser_.webNavigation

export const runtimeError_ = BgUtils_.runtimeError_

export const tabsGet = browserTabs.get

export const getTabUrl = (tab_may_pending: Pick<Tab, "url" | "pendingUrl">): string =>
    Build.BTypes & BrowserType.Chrome ? tab_may_pending.url || tab_may_pending.pendingUrl : tab_may_pending.url

export const getCurTab = browserTabs.query.bind<null, { active: true; currentWindow: true }
    , [(result: [Tab], _ex: FakeArg) => void], 1>(null, { active: true, currentWindow: true })

export const getCurTabs = browserTabs.query.bind(null, {currentWindow: true})

export const getCurShownTabs_ff_only = Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
    ? browserTabs.query.bind(null, { currentWindow: true, hidden: false }) : 0 as never as null

export const getCurWnd = ((populate: boolean, callback: (window: Window, exArg: FakeArg) => void): void | 1 => {
  const wndId = TabRecency_.curWnd_, args = { populate }
  wndId >= 0 ? browserWindows.get(wndId, args, callback) : browserWindows.getCurrent(args, callback)
}) as {
  (populate: true, callback: (window: PopWindow | undefined, exArg: FakeArg) => void): 1
  (populate: false, callback: (window: Window, exArg: FakeArg) => void): 1
}

export const getAllWindows = browserWindows.getAll

export const selectFrom = (tabs: readonly Tab[], overrideIndexes?: BOOL): ActiveTab => {
  Build.BTypes & BrowserType.Firefox && overrideIndexes && BgUtils_.overrideTabsIndexes_ff_!(tabs)
  for (let i = tabs.length; 0 < --i; ) {
    if (tabs[i].active) {
      return tabs[i]! as ActiveTab
    }
  }
  return tabs[0]! as ActiveTab
}

/** action section */

/** if `alsoWnd`, then it's safe when tab does not exist */
export const selectTab = (tabId: number, alsoWnd?: boolean): void => {
  browserTabs.update(tabId, {active: true}, alsoWnd ? selectWnd : null)
}

export const selectWnd = (tab?: { windowId: number }): void => {
  tab && browserWindows.update(tab.windowId, { focused: true })
  return runtimeError_()
}

/* if not args.url, then "openerTabId" must not in args */
export const tabsCreate = (args: chrome.tabs.CreateProperties, callback?: ((tab: Tab, exArg: FakeArg) => void) | null
    , evenIncognito?: boolean | -1 | null): 1 => {
  let { url } = args, type: Urls.NewTabType | undefined
  if (!url) {
    url = settings.cache_.newTabUrl_f
    if (TabRecency_.incognito_ === IncognitoType.true
        && (evenIncognito == -1 ? url.endsWith(settings.CONST_.BlankNewTab_) && url.startsWith(location.origin)
            : !evenIncognito && url.startsWith(location.protocol))) { /* empty */ }
    else if (Build.MayOverrideNewTab && settings.CONST_.OverrideNewTab_
        ? settings.cache_.focusNewTabContent
        : !(Build.BTypes & BrowserType.Firefox)
          || (Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox)
          || !settings.newTabs_.has(url)) {
      args.url = url
    }
    if (!args.url) {
      delete args.url
    }
  } else if (!(type = settings.newTabs_.get(url))) { /* empty */ }
  else if (type === Urls.NewTabType.browser) {
    // ignore Build.MayOverrideNewTab and other things,
    // so that if another extension manages the NTP, this line still works
    delete args.url
  } else if (Build.MayOverrideNewTab && type === Urls.NewTabType.vimium) {
    /** if not MayOverride, no .vimium cases in {@link settings.ts#__init__} */
    args.url = settings.cache_.newTabUrl_f
  }
  if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)) {
    delete args.openerTabId
  }
  return browserTabs.create(args, callback)
}

export const safeUpdate = (url: string, secondTimes?: true, tabs1?: [Tab]): void => {
  if (Backend_.checkHarmfulUrl_(url)) {
    return
  }
  if (!tabs1) {
    if (BgUtils_.isRefusingIncognito_(url) && secondTimes !== true) {
      getCurTab(safeUpdate.bind(null, url, true))
      return
    }
  } else if (tabs1.length > 0 && tabs1[0].incognito && BgUtils_.isRefusingIncognito_(url)) {
    tabsCreate({ url })
    BgUtils_.resetRe_()
    return
  }
  const arg = { url }
  tabs1 ? browserTabs.update(tabs1[0].id, arg, runtimeError_) : browserTabs.update(arg, runtimeError_)
  BgUtils_.resetRe_()
}

/** options.url should not be required for kBgCmd.createTab. If count <= 1, only open once */
export const openMultiTab = (options: InfoToCreateMultiTab, count: number, evenIncognito?: boolean | -1 | null
    ): void => {
  const hasIndex = options.index != null
  if (options.url && Backend_.checkHarmfulUrl_(options.url)) {
    return
  }
  tabsCreate(options, options.active ? (tab): void => {
    tab && tab.windowId !== TabRecency_.curWnd_ && selectWnd(tab)
  } : null, evenIncognito)
  if (count < 2) { return }
  options.active = false
  while (count-- > 1) {
    hasIndex && ++options.index!
    browserTabs.create(options)
  }
}

export const makeWindow = (options: chrome.windows.CreateData, state?: chrome.windows.ValidStates | ""
    , callback?: ((wnd: Window & {tabs: [Tab]}, exArg?: FakeArg) => void) | null): void => {
  const focused = options.focused !== false, kM = "minimized"
  if (!focused) {
    state !== kM && (state = "normal")
  } else if (state === kM) {
    state = "normal"
  }
  if (state && (Build.MinCVer >= BrowserVer.MinCreateWndWithState || !(Build.BTypes & BrowserType.Chrome)
                || CurCVer_ >= BrowserVer.MinCreateWndWithState)) {
    if (!state.includes("fullscreen")) {
      (options as chrome.windows.CreateDataEx).state = state
      state = ""
    }
  }
  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
    delete options.focused
  } else {
    options.focused = true
  }
  const url = options.url
  if (typeof url === "string" && (!url || settings.newTabs_.get(url) === Urls.NewTabType.browser)) {
    delete options.url
  }
  browserWindows.create(options, state || !focused ? (wnd): void => {
    callback && callback(wnd)
    if (!wnd) { return } // do not return lastError: just throw errors for easier debugging
    const opt: chrome.windows.UpdateInfo = focused ? {} : { focused: false }
    state && (opt.state = state)
    browserWindows.update(wnd.id, opt)
  } : callback || null)
}

export const makeTempWindow = (tabIdUrl: number | "about:blank", incognito: boolean
    , callback: (wnd: Window, exArg: FakeArg) => void): void => {
  const isId = typeof tabIdUrl === "number", options: chrome.windows.CreateDataEx = {
    type: "normal", focused: false, incognito, state: "minimized",
    tabId: isId ? tabIdUrl as number : undefined, url: isId ? undefined : tabIdUrl as string
  }
  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
    delete options.focused
  }
  if (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
      || Build.MinCVer < BrowserVer.MinCreateWndWithState && Build.BTypes & BrowserType.Chrome
      && CurCVer_ < BrowserVer.MinCreateWndWithState) {
    delete options.state
    options.left = options.top = 0, options.width = options.height = 50
  }
  browserWindows.create(options, callback)
}

/** special actions for Firefox */

interface LatestPromise extends Promise<void> {
  finally (onFinally: (() => void) | Promise<void>): LatestPromise
}

let _lockToRemoveTempTab: {p: LatestPromise} | null | 0 = Build.BTypes & BrowserType.Firefox ? null : 0

const _removeTempTab = async (tabId: number, windowId: number, url: string, selfLock: object): Promise<void> => {
  await (browserTabs.remove(tabId) as never as Promise<void>).catch(BgUtils_.blank_)
  const sessions = await (browser as typeof chrome).sessions.getRecentlyClosed({ maxResults: 1 })
  const tab = sessions && sessions[0] && sessions[0].tab
  if (tab && tab.url === url) {
    await (browser as typeof chrome).sessions.forgetClosedTab(windowId, tab.sessionId!).catch(BgUtils_.blank_)
  }
  if (_lockToRemoveTempTab === selfLock) { _lockToRemoveTempTab = null }
}

export const removeTempTab = (tabId: number, wndId: number, url: string): void => {
  const lock = {} as {p: LatestPromise}, p = _removeTempTab(tabId, wndId, url, lock)
  lock.p = _lockToRemoveTempTab ? _lockToRemoveTempTab.p.finally(p) : p as LatestPromise
  _lockToRemoveTempTab = lock as EnsureItemsNonNull<typeof lock>
}
