import {
  CurCVer_, CurFFVer_, curIncognito_, curWndId_, newTabUrls_, OnChrome, OnEdge, OnFirefox, settingsCache_, blank_,
  CONST_, IsEdg_, hasGroupPermission_ff_, bgIniting_, set_installation_
} from "./store"
import { DecodeURLPart_, deferPromise_ } from "./utils"

type AtomPermission = { origins: [chrome.permissions.kPermissions]; permissions?: undefined }
    | { origins?: undefined; permissions: [chrome.permissions.kPermissions] }
export type Window = chrome.windows.Window

export interface IncNormalWnd extends Window { incognito: true; type: "normal" }
export interface ActiveTab extends Tab { active: true }
export interface PopWindow extends Window { tabs: Tab[] }

export interface InfoToCreateMultiTab extends
      Partial<Pick<chrome.tabs.CreateProperties, "index" | "openerTabId" | "windowId" | "pinned">> {
    url: string; active: boolean; }

export const browser_: typeof chrome = OnChrome ? chrome : browser as typeof chrome
if (!OnChrome && globalThis.chrome) {
  globalThis.chrome = null as never
}

export const Tabs_ = browser_.tabs
export const Windows_ = browser_.windows
export const browserSessions_ = (): typeof chrome.sessions => browser_.sessions
export const browserWebNav_ = (): typeof chrome.webNavigation | undefined => browser_.webNavigation

export const runtimeError_ = (): any => browser_.runtime.lastError

export const tabsGet = Tabs_.get
export const tabsUpdate = Tabs_.update

export const getGroupId: (tab: ShownTab) => chrome.tabs.GroupId | null = OnFirefox
    ? tab => { const id = tab.cookieStoreId; return id !== "firefox-default" && id || null }
    : !OnEdge ? i => { const id = i.groupId; return id !== -1 && id != null ? id : null }
    : () => null

export const getTabUrl = OnChrome ? (tab_may_pending: Pick<Tab, "url" | "pendingUrl">): string =>
    tab_may_pending.url || tab_may_pending.pendingUrl : (tab_with_url: Pick<Tab, "url">): string => tab_with_url.url

export const isTabMuted = OnChrome && Build.MinCVer < BrowserVer.MinMutedInfo && CurCVer_ < BrowserVer.MinMutedInfo
    ? (maybe_muted: ShownTab): boolean => maybe_muted.muted!
    : OnEdge ? (_tab: ShownTab) => false : (maybe_muted: ShownTab): boolean => maybe_muted.mutedInfo.muted

export const getCurTab = Tabs_.query.bind(null, { active: true, currentWindow: true }
  ) as (callback: (result: [Tab], _ex: FakeArg) => void) => 1

export const getCurTabs = Tabs_.query.bind(null, {currentWindow: true})

export const getCurShownTabs_ = OnFirefox
    ? Tabs_.query.bind(null, { currentWindow: true, hidden: false }) : getCurTabs

export const isNotHidden_ = OnFirefox ? (tab: ShownTab): boolean => !tab.hidden : () => true

export const overrideTabsIndexes_ff_ = OnFirefox ? (tabs: readonly Tab[]): void => {
  const len = tabs.length
  if (len > 0 && tabs[len - 1].index !== len - 1) {
    for (let i = 0; i < len; i++) {
      tabs[i].index = i
    }
  }
} : null

export const getCurWnd = ((populate: boolean, callback: (window: Window, exArg: FakeArg) => void): void | 1 => {
  const args = { populate }
  return curWndId_ >= 0 ? Windows_.get(curWndId_, args, callback) : Windows_.getCurrent(args, callback)
}) as {
  (populate: true, callback: (window?: PopWindow | undefined, exArg?: FakeArg) => void): 1
  (populate: false, callback: (window?: Window, exArg?: FakeArg) => void): 1
  (populate: boolean, callback: (window?: PopWindow | Window | undefined, exArg?: FakeArg) => void): 1
}

export interface ShownTab extends Omit<Tab, "index"> {}

export const selectFrom = <O extends BOOL = 0>(tabs: O extends 1 ? readonly Tab[] : readonly ShownTab[]
    , overrideIndexes?: O): ActiveTab => {
  OnFirefox && overrideIndexes && overrideTabsIndexes_ff_!(tabs as readonly Tab[])
  for (let i = tabs.length; 0 < --i; ) {
    if (tabs[i].active) {
      return tabs[i]! as ActiveTab
    }
  }
  return tabs[0]! as ActiveTab
}

export const normalizeExtOrigin_ = (url: string): string =>
    (<RegExpOne> (OnChrome ? /^(edge-)?extension:/ : /^extension:/)).test(url)
    ? CONST_.BrowserProtocol_ + "-" + url.slice(url.indexOf("ext")) : url

type PromisifyApi1<F extends Function> =
    F extends ((...args: [...infer A, (res: infer R, ex?: FakeArg) => void]) => void | 1)
    ? (...args: A) => Promise<R> : F
type PromisifyApi2<F extends Function> =
    F extends { (...args: infer A1) : infer R1; (...args: infer A2): infer R2 }
    ? R1 extends Promise<any> ? (...args: A1) => R1
    : PromisifyApi1<(...args: A1) => R1> | PromisifyApi1<(...args: A2) => R2>
    : PromisifyApi1<F>
type ApiParams<F extends Function> = Parameters<PromisifyApi2<F>>
type ApiCb<F extends Function> = PromisifyApi2<F> extends (...args: any[]) => Promise<infer R>
    ? R extends FakeArg | undefined ? null : R : never
type ApiTemplate<Params extends any[]> = (...args: [...Params, (res: any, exArgs?: FakeArg) => void]) => void | 1

export const Q_: {
  <F extends ApiTemplate<[]>              > (browserApi: F): Promise<ApiCb<F> | undefined>
  <F extends ApiTemplate<[any]>           > (browserApi: F, ...args: ApiParams<F>): Promise<ApiCb<F> | undefined>
  <F extends ApiTemplate<[any, any]>      > (browserApi: F, ...args: ApiParams<F>): Promise<ApiCb<F> | undefined>
  <F extends ApiTemplate<[any, any, any]> > (browserApi: F, ...args: ApiParams<F>): Promise<ApiCb<F> | undefined>
} = (OnChrome || OnEdge ? function (func: Function): Promise<unknown> {
  const arr: unknown[] = [].slice.call(arguments, 1)
  const { promise_, resolve_ } = deferPromise_<unknown>();
  arr.push((res: unknown): void => {
    const err = runtimeError_(); resolve_(err ? void 0 : res != null ? res : null)
    return err
  })
  func.apply(void 0, arr)
  return promise_
} : function (func: Function): Promise<unknown> {
  return func.apply(void 0, [].slice.call(arguments, 1)).then(/*#__NOINLINE__*/ _orNull, blank_)
}) as (func: Function, ...args: any[]) => Promise<any>
const _orNull = (result: unknown) => result !== void 0 ? result : null

export const R_ = (resolve: OnCmdResolved): () => void => resolve !== blank_ ? () => {
  const error = runtimeError_()
  resolve(!error)
  return error
} : runtimeError_

const doesIgnoreUrlField_ = (url: string, incognito?: boolean): boolean => {
  const type = newTabUrls_.get(url)
  return type === Urls.NewTabType.browser || type === Urls.NewTabType.cNewNTP && !(OnChrome && !IsEdg_ && !incognito)
}

//#region actions

/** if `alsoWnd`, then it's safe when tab does not exist */
export const selectTab = (tabId: number, callback?: ((tab?: Tab) => void) | null): void => {
  tabsUpdate(tabId, {active: true}, callback)
}

export const selectWnd = (tab?: { windowId: number }): void => {
  tab && Windows_.update(tab.windowId, { focused: true })
  return runtimeError_()
}

export const selectWndIfNeed = (tab: { windowId: number }): void => {
  tab.windowId !== curWndId_ && selectWnd(tab)
}

/* if not args.url, then "openerTabId" must not in args */
export const tabsCreate = (args: chrome.tabs.CreateProperties, callback?: ((tab: Tab, exArg: FakeArg) => void) | null
    , evenIncognito?: boolean | -1 | null): void | 1 => {
  let { url } = args
  if (!url) {
    url = settingsCache_.newTabUrl_f
    if (curIncognito_ === IncognitoType.true
        && (evenIncognito === -1 ? url.endsWith(CONST_.BlankNewTab_) && url.startsWith(location.origin)
            : !evenIncognito && url.startsWith(location.protocol))) { /* empty */ }
    else if (!doesIgnoreUrlField_(url, curIncognito_ === IncognitoType.true)) {
      args.url = url
    }
    if (!args.url) {
      delete args.url
    }
  } else if (doesIgnoreUrlField_(url, curIncognito_ === IncognitoType.true)) {
    // if another extension manages the NTP, this line still works
    delete args.url
  }
  if (OnEdge) {
    delete args.openerTabId
  }
  return Tabs_.create(args, callback)
}

/** the order is [A,B,C; A,B,C; ...]; require urls.length === 0 || args.url === urls[0] */
export const openMultiTabs = (options: InfoToCreateMultiTab, count: number
    , evenIncognito: boolean | -1 | null | undefined, urls: string[] | [null]
    , doesGroup: boolean | null | undefined, curTab: Tab | null | undefined
    , callback: ((tab?: Tab) => void) | null | undefined): void => {
  const cb1 = (newTab: Tab): void => {
    if (runtimeError_()) { callback && callback(); return runtimeError_() }
      options.index = newTab.index
      options.windowId = newTab.windowId
    OnFirefox ? (options as chrome.tabs.CreateProperties).cookieStoreId = getGroupId(newTab) ?? undefined
    : !OnEdge && groupId != null && Tabs_.group({ tabIds: newTab.id, groupId: groupId as number })
    callback && callback(newTab)
    options.active = false
    const hasIndex = options.index != null, loopSize = urls ? urls.length : 1
    const onOtherTabs = !(OnEdge || OnFirefox) && groupId != null
        ? (t2?: Tab): void => (t2 && Tabs_.group({ tabIds: t2.id, groupId: groupId as number }), runtimeError_())
        : runtimeError_
    urls.length > 1 && (urls[0] = options.url)
    for (let i = 0; i < count; i++) {
      for (let j = i > 0 ? 0 : 1; j < loopSize; j++) {
        urls.length > 1 && (options.url = urls[j]!)
        hasIndex && ++options.index
        Tabs_.create(options, onOtherTabs)
      }
    }
  }
  let groupId: chrome.tabs.GroupId | null | undefined
  doesGroup = doesGroup !== false
  if (OnFirefox) {
    if (doesGroup && hasGroupPermission_ff_) {
      if (curTab && (groupId = getGroupId(curTab)) != null) {
        (options as chrome.tabs.CreateProperties).cookieStoreId = groupId
        tabsCreate(options, (newTab): void => {
          if (runtimeError_() && (runtimeError_() + "").includes("No permission for cookieStoreId")) {
            delete (options as chrome.tabs.CreateProperties).cookieStoreId
            Tabs_.create(options, cb1)
          } else {
            cb1(newTab)
          }
          return runtimeError_()
        }, evenIncognito)
        return
      }
    } else if (!doesGroup && options.openerTabId != null && (!curTab || getGroupId(curTab))) {
      delete options.openerTabId
    }
  } else if (!OnEdge) {
    groupId = curTab != null ? getGroupId(curTab) as number | null : null
    if (!doesGroup && groupId != null) { delete options.index }
    groupId = doesGroup && groupId != null && Tabs_.group ? groupId : undefined
  }
  tabsCreate(options, cb1, evenIncognito)
}

export const makeWindow = (options: chrome.windows.CreateData, state?: chrome.windows.ValidStates | ""
    , callback?: ((wnd?: Window & {tabs: [Tab]}, exArg?: FakeArg) => void) | null): void => {
  const focused = options.focused !== false, kM = "minimized"
  state = !state ? "" : ((state === kM) === focused) || options.type === "popup"
      || state === "normal" || state === "docked" ? "" : state
  if (!OnChrome || Build.MinCVer >= BrowserVer.MinCreateWndWithState || CurCVer_ >= BrowserVer.MinCreateWndWithState) {
    if (state && !state.includes("fullscreen")) {
      (options as chrome.windows.CreateDataEx).state = state
      state = ""
    }
  }
  if (OnFirefox) {
    delete options.focused
  } else {
    options.focused = true
  }
  let url = options.url
  if (!url && options.tabId == null) {
    url = options.url = settingsCache_.newTabUrl_f
  }
  if (typeof url === "string" && doesIgnoreUrlField_(url, options.incognito)) {
    delete options.url
  }
  Windows_.create(options, state || !focused || callback ? (wnd): void => {
    callback && callback(wnd)
    if (!(state || !focused) || !wnd) { return runtimeError_() }
    const opt: chrome.windows.UpdateInfo = focused ? {} : { focused: false }
    state && (opt.state = state)
    Windows_.update(wnd.id, opt)
  } : runtimeError_)
}

export const makeTempWindow_r = (tabIdUrl: number | "about:blank", incognito: boolean
    , callback: (wnd: Window, exArg: FakeArg) => void): void => {
  const isId = typeof tabIdUrl === "number", options: chrome.windows.CreateDataEx = {
    type: "normal", focused: false, incognito, state: "minimized",
    tabId: isId ? tabIdUrl as number : undefined, url: isId ? undefined : tabIdUrl as string
  }
  if (OnFirefox) {
    delete options.focused
  }
  if (OnFirefox
      || OnChrome && Build.MinCVer < BrowserVer.MinCreateWndWithState && CurCVer_ < BrowserVer.MinCreateWndWithState) {
    delete options.state
    options.left = options.top = 0, options.width = options.height = 50
  }
  Windows_.create(options, callback)
}

export const downloadFile = (url: string, filename?: string | null, refer?: string | null
    , onFinish?: ((succeed: boolean) => void) | null): void => {
  if (!(OnChrome || OnFirefox)) {
    onFinish && onFinish(false)
    return
  }
  Q_(browser_.permissions.contains, { permissions: ["downloads"] }).then((permitted): void => {
    if (permitted) {
      const opts: chrome.downloads.DownloadOptions = { url }
      if (filename) {
        const extRe = <RegExpI> /\.[a-z\d]{1,4}(?=$|[?&])/i
        filename = DecodeURLPart_(filename)
        filename = filename[0] === "#" ? filename.slice(1) : filename
        filename = filename.replace(<RegExpG> /[\r\n]+/g, " ").replace(<RegExpG> /[/\\?%*:|"<>_]+/g, "_")
        if (!extRe.test(filename)) {
          const arr = extRe.exec(url)
          filename += arr ? arr[0] : !url.includes(".") ? ".bin" : ""
        }
        opts.filename = filename
      }
      if (OnFirefox
          && (Build.MinFFVer >= FirefoxBrowserVer.Min$downloads$$download$acceptReferer
              || CurFFVer_ > FirefoxBrowserVer.Min$downloads$$download$acceptReferer - 1) && refer) {
        opts.headers = [ { name: "Referer", value: refer } ]
      }
      const q = Q_(browser_.downloads.download!, opts)
      onFinish && q.then(res => onFinish(res !== void 0))
    } else if (onFinish) {
      onFinish(false)
    }
  })
}

let _lockToRemoveTempTab: Promise<void> | null = null
export const removeTempTab = (tabId: number, wndId: number, url: string): void => {
  if (OnChrome || OnEdge || !(browserSessions_()?.forgetClosedTab)) { Tabs_.remove(tabId, runtimeError_); return }
  const old = _lockToRemoveTempTab
  let lock: Promise<void> | undefined
  lock = (async (): Promise<void> => {
    await (Tabs_.remove(tabId) as never as Promise<void>).catch(blank_)
    await old
    const sessions = await browserSessions_().getRecentlyClosed({ maxResults: 1 })
    const tab = sessions && sessions[0] && sessions[0].tab
    if (tab && tab.url === url) {
      await browserSessions_().forgetClosedTab(wndId, tab.sessionId!).catch(blank_)
    }
    if (_lockToRemoveTempTab === lock) { _lockToRemoveTempTab = null }
  })()
  _lockToRemoveTempTab = lock
}

export const isRefusingIncognito_ = (url: string): boolean => {
  url = url.slice(0, 99).toLowerCase()
  // https://cs.chromium.org/chromium/src/url/url_constants.cc?type=cs&q=kAboutBlankWithHashPath&g=0&l=12
  return newTabUrls_.get(url) === Urls.NewTabType.browser ? false
    : url.startsWith("about:") ? url !== "about:blank"
    : !OnChrome ? url.startsWith(CONST_.BrowserProtocol_)
    : url.startsWith("chrome:") ? !url.startsWith("chrome://downloads")
    : url.startsWith(CONST_.BrowserProtocol_) && !(typeof CONST_.NtpNewTab_ !== "string"
          ? CONST_.NtpNewTab_.test(url) : url.startsWith(CONST_.NtpNewTab_))
      || IsEdg_ && (<RegExpOne> /^(edge|extension):/).test(url) && !url.startsWith("edge://downloads")
}

export const watchPermissions_ = (queries: (AtomPermission | null)[]
    , onChange: (allowList: (boolean | undefined | null)[], mutable: boolean) => void | false): void => {
  const browserPermissions_ = browser_.permissions
  if (OnEdge) { Promise.resolve(queries.map(() => void 0)).then(list => onChange(list, false)); return }
  const promise = Promise.all(queries.map(i => i && Q_(browser_.permissions.contains, i)))
  if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.Min$permissions$$onAdded && !browserPermissions_.onAdded) {
    promise.then(list => onChange(list, false))
    return
  }
  const ids = queries.map(i => i && (i.permissions || i.origins)[0])
  promise.then((allowList): void => {
    let listenAdd = false, listenRemove = false
    const didChange = (added: boolean, changes?: chrome.permissions.Request | null): void => {
      let related = !changes
      if (changes) {
        const newPermissions = changes.permissions
        for (const permission of newPermissions || []) {
          const ind = ids.indexOf(permission)
          ind >= 0 && (allowList[ind] = added, related = true)
        }
        for (const origin of (!newPermissions || newPermissions.length <= 0) && changes.origins || []) {
          if (!OnChrome || origin !== "chrome://*/*") {
            const ind = ids.indexOf(origin)
            ind >= 0 && (allowList[ind] = added, related = true)
          } else {
            for (let ind = 0; ind < ids.length; ind++) {
              if ((ids[ind] || "").startsWith("chrome://")) {
                allowList[ind] = added, related = true
              }
            }
          }
        }
      }
      if (!related) { return }
      if (onChange(allowList, true) === false) {
        listenAdd = listenRemove = false
      }
      if (listenAdd !== allowList.includes!(false)) {
        browserPermissions_.onAdded[(listenAdd = !listenAdd) ? "addListener" : "removeListener"](onAdded)
      }
      if (listenRemove !== allowList.includes!(true)) {
        browserPermissions_.onRemoved[(listenRemove = !listenRemove) ? "addListener" : "removeListener"](onRemoved)
      }
    }
    const onAdded = didChange.bind(null, true), onRemoved = didChange.bind(null, false)
    if (allowList.includes!(false) || allowList.includes!(true)) {
      didChange(true)
    } else {
      onChange(allowList, false)
    }
  })
}

export const runContentScriptsOn_ = (tabId: number): void => {
  const offset = location.origin.length
  for (let js of CONST_.ContentScripts_.slice(0, -1)) {
    Tabs_.executeScript(tabId, {file: js.slice(offset), allFrames: true}, runtimeError_)
  }
}

//#endregion

bgIniting_ < BackendHandlersNS.kInitStat.FINISHED && set_installation_(new Promise((resolve) => {
  const ev = browser_.runtime.onInstalled
  let onInstalled: ((details: chrome.runtime.InstalledDetails | null) => void) | null = (details): void => {
      const cb = onInstalled
      cb && (onInstalled = null, details && resolve(details), ev.removeListener(cb))
  }
  ev.addListener(onInstalled)
  setTimeout(onInstalled, 10000, null)
}));
