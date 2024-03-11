import {
  CurCVer_, CurFFVer_, curIncognito_, curWndId_, newTabUrls_, OnChrome, OnEdge, OnFirefox, newTabUrl_f, blank_,
  CONST_, IsEdg_, hasGroupPermission_ff_, bgIniting_, set_installation_, Origin2_, runOnTee_
} from "./store"
import { DecodeURLPart_, deferPromise_ } from "./utils"

type AtomPermission = { origins: [chrome.permissions.kPermission]; permissions?: undefined }
    | { origins?: undefined; permissions: [chrome.permissions.kPermission] }
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

export const getGroupId: (tab: Tab) => chrome.tabs.GroupId | null = OnFirefox
    ? tab => { const id = tab.cookieStoreId; return id !== "firefox-default" && id || null }
    : !OnEdge ? i => { const id = i.groupId; return id !== -1 && id != null ? id : null }
    : () => null

export const getTabUrl = OnChrome ? (tab_may_pending: Pick<Tab, "url" | "pendingUrl">): string =>
    tab_may_pending.url || tab_may_pending.pendingUrl || ""
    : OnFirefox && Build.MayAndroidOnFirefox ? (tab_with_url: Pick<Tab, "url">): string => tab_with_url.url || ""
    : (tab_with_url: Pick<Tab, "url">): string => tab_with_url.url

export const isTabMuted = OnChrome && Build.MinCVer < BrowserVer.MinMutedInfo && CurCVer_ < BrowserVer.MinMutedInfo
    ? (maybe_muted: Tab): boolean => maybe_muted.muted!
    : OnEdge ? (_tab: Tab) => false : (maybe_muted: Tab): boolean => maybe_muted.mutedInfo.muted

export const getCurTab = Tabs_.query.bind(null, { active: true, lastFocusedWindow: true }
  ) as (callback: (result: [Tab], _ex: FakeArg) => void) => 1

export const getCurTabs = Tabs_.query.bind(null, {lastFocusedWindow: true})

export const getCurShownTabs_ = OnFirefox
    ? Tabs_.query.bind(null, { lastFocusedWindow: true, hidden: false }) : getCurTabs

export const isNotHidden_ = OnFirefox ? (tab: Tab): boolean => !tab.hidden : () => true

export const getCurWnd = ((populate: boolean, callback: (window: Window, exArg: FakeArg) => void): void | 1 => {
  const args = { populate }
  return curWndId_ >= 0 ? Windows_.get(curWndId_, args, callback) : Windows_.getCurrent(args, callback)
}) as {
  (populate: true, callback: (window?: PopWindow | undefined, exArg?: FakeArg) => void): 1
  (populate: false, callback: (window?: Window, exArg?: FakeArg) => void): 1
  (populate: boolean, callback: (window?: PopWindow | Window | undefined, exArg?: FakeArg) => void): 1
}

export const selectFrom = (tabs: readonly Tab[]): ActiveTab => tabs[selectIndexFrom(tabs)] as ActiveTab

export const selectIndexFrom = (tabs: readonly Tab[]): number => {
  for (let i = tabs.length; 0 < --i; ) { if (tabs[i].active) { return i } }
  return 0
}

export const normalizeExtOrigin_ = (url: string): string =>
    (<RegExpOne> (OnChrome ? /^(edge-)?extension:/ : /^extension:/)).test(url)
    ? CONST_.BrowserProtocol_ + "-" + url.slice(url.indexOf("ext")) : url

type PromisifyApi1<F extends Function> =
    F extends ((...args: [...infer A, (res: infer R, ex?: FakeArg) => void]) => void | 1)
    ? (...args: A) => Promise<R> : F
type PromisifyApi2<F extends Function> =
    F extends { (...args: infer A1): infer R1; (...args: infer A2): infer R2 }
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return func.apply(void 0, [].slice.call(arguments, 1)).then(/*#__NOINLINE__*/ _orNull, blank_)
}) as (func: Function, ...args: any[]) => Promise<any>
const _orNull = (result: unknown): unknown => result !== void 0 ? result : null

export const R_ = (resolve: (result: boolean) => void): () => void => resolve !== blank_ ? () => {
  const error = runtimeError_()
  resolve(!error)
  return error
} : runtimeError_

// another Q_ for "safe" APIs which always succeeds
export const Qs_: {
  <F extends ApiTemplate<[]>              > (browserApi: F): Promise<ApiCb<F>>
  <F extends ApiTemplate<[any]>           > (browserApi: F, ...args: ApiParams<F>): Promise<ApiCb<F>>
  <F extends ApiTemplate<[any, any]>      > (browserApi: F, ...args: ApiParams<F>): Promise<ApiCb<F>>
  <F extends ApiTemplate<[any, any, any]> > (browserApi: F, ...args: ApiParams<F>): Promise<ApiCb<F>>
} = (OnChrome || OnEdge ? function (func: Function): Promise<unknown> {
  const arr: unknown[] = [].slice.call(arguments, 1)
  return new Promise(resolve => { arr.push(resolve); func.apply(0, arr) })
} : function (func: Function): Promise<unknown> {
  const arr: unknown[] = [].slice.call(arguments, 1)
  return func.apply(0, arr)
}) as <F extends ApiTemplate<[]>> (browserApi: F) => Promise<ApiCb<F>>

const doesIgnoreUrlField_ = (url: string, incognito?: boolean): boolean => {
  const type = newTabUrls_.get(url)
  return type === Urls.NewTabType.browser || type === Urls.NewTabType.cNewNTP && !(OnChrome && !IsEdg_ && !incognito)
}

export let getFindCSS_cr_: ((sender: Frames.Sender) => FindCSS) | undefined
export const set_getFindCSS_cr_ = (newGet: typeof getFindCSS_cr_): void => { getFindCSS_cr_ = newGet }

export const removeTabsOrFailSoon_ = (ids: number|number[], callback: (ok: boolean) => void): void => {
  const returnOnce = (ok: boolean): void => {
    const curCb = callback
    if (curCb) {
      callback = null as never
      ok && clearTimeout(timer)
      curCb && curCb(ok as boolean)
    }
  }
  if (callback === runtimeError_) { Tabs_.remove(ids, callback as typeof runtimeError_); return }
  const kTabsRemoveTimeout = 1500, timer = setTimeout(returnOnce, kTabsRemoveTimeout, false)
  Tabs_.remove(ids, (): void => { // avoid `R_`, to reduce memory cost
    const error = runtimeError_()
    returnOnce(!error)
    return error
  })
}

//#region actions

export const selectTab = (tabId: number, callback?: ((tab?: Tab) => void) | null): void => {
  tabsUpdate(tabId, { active: true }, callback)
}

export const selectWnd = (tab?: { windowId: number }): void => {
  tab && Windows_.update(tab.windowId, { focused: true })
  return runtimeError_()
}

export const selectWndIfNeed = (tab?: { windowId: number }): void => {
  tab && tab.windowId !== curWndId_ && selectWnd(tab)
  return runtimeError_()
}

let doesSkipOpener_ff = (): boolean => {
  const name = CONST_.BrowserName_, kToSearch = "Thunderbird"
  const uad = name ? 0 : navigator.userAgentData
  const noOpener = name || !uad ? (name || navigator.userAgent! + "").includes(kToSearch)
      : uad.brands.some(i => i.brand.includes(kToSearch))
  doesSkipOpener_ff = () => noOpener
  return noOpener
}

/* if not args.url, then "openerTabId" must not in args */
export const tabsCreate = (args: chrome.tabs.CreateProperties, callback?: ((tab: Tab, exArg: FakeArg) => void) | null
    , evenIncognito?: boolean | -1 | null): void | 1 => {
  let { url } = args
  if (!url) {
    url = newTabUrl_f
    if (curIncognito_ === IncognitoType.true
        && (evenIncognito === -1 ? url.includes("pages/blank.html") && url.startsWith(Origin2_)
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
  if (OnEdge || OnFirefox && Build.MayAndroidOnFirefox && doesSkipOpener_ff()) {
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
    groupId = doesGroup && groupId != null && Tabs_.group as unknown ? groupId : undefined
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
    url = options.url = newTabUrl_f
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

export const makeTempWindow_r = (tabId: number, incognito: boolean
    , callback: (wnd: Window, exArg: FakeArg) => void): void => {
  const options: chrome.windows.CreateDataEx = {
    type: "normal", focused: false, incognito, state: "minimized", tabId
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

export const downloadFile = (url: string, filename?: string | null, refer?: string | null): Promise<boolean> => {
  if (Build.MV3 && url.startsWith("data:")) {
    return runOnTee_(kTeeTask.Download, { u: url, t: filename || "" }, null).then(i => !!i)
  }
  if (!(OnChrome || OnFirefox)) { return Promise.resolve(false) }
  return Q_(browser_.permissions.contains, { permissions: ["downloads"] }).then((permitted): PromiseOr<boolean> => {
      if (!permitted) { return false }
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
      return q.then((): true => true)
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
  if (OnEdge) { void Promise.resolve(queries.map(() => void 0)).then(list => onChange(list, false)); return }
  const promise = Promise.all(queries.map(i => i && Q_(browser_.permissions.contains, i)))
  if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.Min$permissions$$onAdded && !browserPermissions_.onAdded) {
    void promise.then((list): void => { onChange(list, false) })
    return
  }
  const ids = queries.map(i => i && (i.permissions || i.origins)[0])
  void promise.then((allowList): void => {
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
      if (listenAdd !== allowList.includes(false)) {
        browserPermissions_.onAdded[(listenAdd = !listenAdd) ? "addListener" : "removeListener"](onAdded)
      }
      if (listenRemove !== allowList.includes(true)) {
        browserPermissions_.onRemoved[(listenRemove = !listenRemove) ? "addListener" : "removeListener"](onRemoved)
      }
    }
    const onAdded = didChange.bind(null, true), onRemoved = didChange.bind(null, false)
    if (allowList.includes(false) || allowList.includes(true)) {
      didChange(true)
    } else {
      onChange(allowList, false)
    }
  })
}

export const executeScript_ = <Args extends (number | boolean | null)[]>(tabId: number, frameId: number
    , files?: string[] | null, func?: (...args: Args) => void, args?: Args, callback?: (() => void) | null) => {
  if (Build.MV3) {
    const toRun: chrome.scripting.ScriptInjection<Args, void> = { files: func ? void 0 : files!, func, args,
        target: frameId >= 0 ? { tabId, frameIds: [frameId] } : { tabId, allFrames: true }, injectImmediately: true }
    OnChrome && Build.MinCVer < BrowserVer.MinInjectImmediatelyInMV3 && CurCVer_ < BrowserVer.MinInjectImmediatelyInMV3
        && delete toRun.injectImmediately
    browser_.scripting.executeScript(toRun, callback || runtimeError_)
  } else {
    const toRun: chrome.tabs.InjectDetails = frameId >= 0 ? { frameId } : { allFrames: true, matchAboutBlank: true }
    toRun.runAt = "document_start"
    if (func) {
      toRun.code = `${(func + "").split("{")[1].split("(")[0].trim()}(${args ? args.join(",") : ""})`
    } else { toRun.file = files![0] }
    if (OnChrome && Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
        && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
      delete toRun.frameId
      delete toRun.matchAboutBlank
    }
    Tabs_.executeScript(tabId, toRun, callback || runtimeError_)
  }
}

export const runContentScriptsOn_ = (tabId: number): void => {
  const offset = Origin2_.length - 1
  if (Build.MV3) {
    executeScript_(tabId, -1, CONST_.ContentScripts_.slice(0, -1).map(i => i.slice(offset)))
    return
  }
  for (let js of CONST_.ContentScripts_.slice(0, -1)) {
    executeScript_(tabId, -1, [js.slice(offset)])
  }
}

export const import2 = <T> (path: string): Promise<T> =>
    Build.MV3 && Build.BTypes !== BrowserType.Firefox as number
    ? Promise.resolve(__moduleMap![path.split("/").slice(-1)[0].replace(".js", "")] as T) : import(path)

//#endregion actions

bgIniting_ < BackendHandlersNS.kInitStat.FINISHED && set_installation_(new Promise((resolve): void => {
  const ev = browser_.runtime.onInstalled
  let onInstalled: ((details: chrome.runtime.InstalledDetails | null) => void) | null = (details): void => {
      const cb = onInstalled
      cb && (onInstalled = null, resolve(details), ev.removeListener(cb))
  }
  ev.addListener(onInstalled)
  setTimeout(onInstalled, 6000, null)
}));
