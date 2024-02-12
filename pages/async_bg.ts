/// <reference path="../background/index.d.ts" />
/// <reference path="../lib/base.d.ts" />
import { kPgReq, PgReq, Req2 } from "../background/page_messages"

export declare const enum kReadyInfo {
  show = 1, action = 1, options = 1, i18n = 2, browserInfo = 4,
  NONE = 0, FINISHED = 7, LOCK = 8,
}
export type ValidFetch = GlobalFetch

declare var VApi: VApiTy | undefined // eslint-disable-line no-var

const OnOther: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
    ? Build.BTypes as number
    : Build.BTypes & BrowserType.Chrome
      && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
          || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
    ? BrowserType.Chrome
    : Build.BTypes & BrowserType.Edge && globalThis.StyleMedia ? BrowserType.Edge
    : Build.BTypes & BrowserType.Safari && typeof safari !== "undefined" && safari ? BrowserType.Safari
    : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
    : /* an invalid state */ BrowserType.Unknown

export const OnChrome: boolean = Build.BTypes === BrowserType.Chrome as number
    || !!(Build.BTypes & BrowserType.Chrome) && OnOther === BrowserType.Chrome
export const OnFirefox: boolean = Build.BTypes === BrowserType.Firefox as number
    || !!(Build.BTypes & BrowserType.Firefox) && OnOther === BrowserType.Firefox
export const OnEdge: boolean = Build.BTypes === BrowserType.Edge as number
    || !!(Build.BTypes & BrowserType.Edge) && OnOther === BrowserType.Edge
export const OnSafari: boolean = Build.BTypes === BrowserType.Safari as number
    || !!(Build.BTypes & BrowserType.Safari) && OnOther === BrowserType.Safari

const uad = navigator.userAgentData
const brands = OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredNavigator$userAgentData ? uad!.brands
    : uad && (OnChrome && Build.MinCVer <= BrowserVer.Only$navigator$$userAgentData$$$uaList
    ? uad.brands || uad.uaList : uad.brands)
let tmpBrand: UABrandInfo | undefined
export const IsEdg_: boolean = OnChrome && (Build.MinCVer < BrowserVer.MinEnsuredNavigator$userAgentData && !brands
    ? Build.MV3 ? false : matchMedia("(-ms-high-contrast)").matches
    : !!brands!.find(i => i.brand.includes("Edge") || i.brand.includes("Microsoft")))
export const CurCVer_: BrowserVer = !OnChrome ? BrowserVer.assumedVer
    : (Build.MinCVer >= BrowserVer.MinEnsuredNavigator$userAgentData || brands)
      && (tmpBrand = brands!.find(i => i.brand.includes("Chromium")))
      && parseInt(tmpBrand.version) > BrowserVer.MinMaybe$navigator$$userAgentData - 1
    ? parseInt(tmpBrand.version)
    : (Build.MinCVer <= BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor ? ((): BrowserVer => {
      const ver = navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
      return !ver ? BrowserVer.assumedVer : +ver[1] === BrowserVer.FakeUAMajorWhenFreezeUserAgent
          && matchMedia("(prefers-color-scheme)").matches ? BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor
          : 0 | ver[1] as string | number as number
    })()
    : 0 | <number> (navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/) || [0, BrowserVer.assumedVer])[1])
export let CurFFVer_: FirefoxBrowserVer = !OnFirefox ? FirefoxBrowserVer.assumedVer
    : brands && (tmpBrand = brands.find(i => i.brand.includes("Firefox")))
      && parseInt(tmpBrand.version) > FirefoxBrowserVer.MinMaybe$navigator$$userAgentData - 1
    ? parseInt(tmpBrand.version)
    : parseInt(navigator.userAgent!.split("Firefox/")[1] || "0") || FirefoxBrowserVer.assumedVer
export let BrowserName_: string | undefined
export let PageOs_: kOS = Build.OS & (Build.OS - 1) ? kOS.UNKNOWN : (Build.OS < 8 ? (Build.OS / 2) | 0
    : Math.log2(Build.OS)) as kOS
export const setupPageOs_ = (os: kOS) => { PageOs_ = os }

export const browser_: typeof chrome = OnChrome ? chrome : browser as typeof chrome
if (!OnChrome && window.chrome) { window.chrome = null as never }

let rawIsVApiReady_: Promise<void>
export const isVApiReady_ = new Promise<void>((resolve): void => {
  let resolve2: () => void
  rawIsVApiReady_ = new Promise((r): void => { resolve2 = r })
  addEventListener(GlobalConsts.kLoadEvent, function onContentLoaded(): void {
    if (OnChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once
        && CurCVer_ < BrowserVer.Min$addEventListener$support$once) {
      removeEventListener(GlobalConsts.kLoadEvent, onContentLoaded, true)
    }
    queueTask_(resolve2)
    nextTick_(resolve)
  }, { once: true, capture: true })
})
let readyInfo_ = OnFirefox ? kReadyInfo.NONE : kReadyInfo.browserInfo
const __oldI18nMap = {} as Dict<string>
const i18nDict_: Pick<Map<string, string>, "get" | "set"> = !OnChrome
    || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || typeof Map === "function"
    ? new Map() : {
  get (k: string): any { return __oldI18nMap[k] },
  set (k: string, v: any): any { __oldI18nMap[k] = v }
}

type AnswerCallback = (answer: Req2.pgRes) => void
let _todoMsgs = null as Req2.pgReq<keyof PgReq>[] | null
let _sentMsgs: { [key: number]: Req2.pgReq<keyof PgReq>[] } | null | 0 = null
let _ansCallbacks = null as AnswerCallback[] | null
const _todoCallbacks = Object.create(null) as { [key: number]: AnswerCallback[] }
let _queryId = 1
let _tempPort = null as null | ContentNS.Port | 0
export let selfTabId_: number = GlobalConsts.TabIdNone

//#region async messages

const onRespond = (res: FgRes[kFgReq.pages]): void => {
  if (_tempPort) { _sentMsgs = 0 }
  if (res === false) {
    alert("Can not send info to the background: not trusted")
    return
  }
  const callbacks = _todoCallbacks[res.i]
  delete _todoCallbacks[res.i]
  for (let arr = res.a as Req2.pgRes[], i = 0; i < callbacks.length; i++) {
    callbacks[i](arr[i])
  }
  VApi && _tempPort && Object.keys(_todoCallbacks).length === 0 && _disconnect()
}

declare var structuredClone: (<T> (obj: T) => T) | undefined
const onRespond2_ff = (res: FgRes[kFgReq.pages]): void => {
  res = Build.MinFFVer >= FirefoxBrowserVer.Min$structuredClone || typeof structuredClone === "function"
      ? structuredClone!(res) : JSON.parse(JSON.stringify(res))
  onRespond(res)
}

const onDisconnect = (): void => {
  _tempPort = 0
  console.log("[WARNING] the temp port is disconnected unexpectedly; need to replay messages using VApi")
  _sentMsgs && rawIsVApiReady_.then((): void => {
    const oldMsgs = _sentMsgs, oldIds = oldMsgs ? Object.keys(_todoCallbacks) : []
    _sentMsgs = 0
    for (const id of oldIds as never[] as number[]) {
      const cb = _todoCallbacks[id], msg = (oldMsgs as Exclude<typeof oldMsgs, null | 0>)[id]
      if (msg && cb) {
        _todoMsgs = msg, _ansCallbacks = cb
        postAll(msg.length)
      }
    }
  })
}

const postAll = (knownSize?: number): void => {
  if (!_todoMsgs) { return }
  const api = VApi, len = _todoMsgs.length
  if (len > (knownSize || 1)) { queueTask_(postAll.bind(null, len)); return }
  api && _tempPort && Object.keys(_todoCallbacks).length === 0 && _disconnect()
  if (!Build.NDEBUG && len) {
    console.log("[debug] in pages/, post_: %c%s", "color: #15c;", len > 5 ? `[${len}]`
        : _todoMsgs.map(i => i.n).join(","))
  }
  if (knownSize === 0) { _todoMsgs = _ansCallbacks = null; return }
  const id = _queryId++
  _todoCallbacks[id] = _ansCallbacks!
  _ansCallbacks = null
  const getBg = Build.MV3 ? null : browser_.extension.getBackgroundPage
  const bg = getBg && getBg() as unknown as BgExports | null
  if (bg && bg.onPagesReq) {
    void bg.onPagesReq({ i: id, q: _todoMsgs }).then(OnFirefox ? onRespond2_ff : onRespond)
  } else if (api) {
    api.r[0]<kFgReq.pages>(kFgReq.pages, { i: id, q: _todoMsgs }, onRespond)
  } else {
    if (_tempPort == null) {
      _tempPort = browser_.runtime.connect({ name: "" + PortType.selfPages }) as ContentNS.Port
      _tempPort.onMessage.addListener(onRespond)
      _tempPort.onDisconnect.addListener(onDisconnect)
    }
    _tempPort && _tempPort.postMessage({ H: kFgReq.pages, i: id, q: _todoMsgs })
    _sentMsgs !== 0 && ((_sentMsgs || (_sentMsgs = Object.create(null)))[id] = _todoMsgs)
  }
  _todoMsgs = null
}

type ExtractKeyObj<T> = T extends { key: infer Keys } ? Keys : never
type ExtractNullArg<T> = T extends keyof PgReq ? PgReq[T][0] extends null | void ? T : never : never
type ExtractNonNullArg<T> = T extends keyof PgReq ? PgReq[T][0] extends null | void ? never : T : never
type SyncingItems = SettingsNS.FrontendSettingsSyncingItems

export const post_ = (<T extends keyof PgReq> (action: T, messageBody: PgReq[T][0]): Promise<PgReq[T][1]> => {
  return new Promise((resolve): void => {
    _todoMsgs || prepareToPostAll()
    _todoMsgs!.push({ n: action, q: messageBody !== undefined ? messageBody : null })
    _ansCallbacks!.push(resolve)
  })
}) as {
  <T extends keyof PgReq, K extends ExtractKeyObj<PgReq[T][0]> & keyof SyncingItems> (
    action: T, messageBody: { key: K, val: SyncingItems[K][1] | SettingsNS.BackendSettings["autoDarkMode"] }
  ): Promise<SyncingItems[K][1]>
  <T extends keyof PgReq, K extends ExtractKeyObj<PgReq[T][0]> & keyof SettingsNS.SettingsWithDefaults> (
    action: T, messageBody: PgReq[T][0] extends { val: any }
      ? { key: K, val: SettingsNS.SettingsWithDefaults[K] | null } : { key: K }
  ): Promise<SettingsNS.SettingsWithDefaults[K] | (void extends PgReq[T][1] ? void : never)>
  <T extends ExtractNullArg<keyof PgReq>> (action: T): Promise<PgReq[T][1]>
  <T extends ExtractNonNullArg<keyof PgReq>> (action: T, messageBody: PgReq[T][0]): Promise<PgReq[T][1]>
}

const prepareToPostAll = (): void => { _todoMsgs || (_todoMsgs = [], _ansCallbacks = [], queueTask_(postAll)) }
export { prepareToPostAll as disconnect_ }

const _disconnect = (): void => {
  const port = _tempPort
  _tempPort = null
  if (port) {
    port.onDisconnect.removeListener(onDisconnect)
    port.onMessage.removeListener(onRespond)
    port.disconnect()
  }
}

//#endregion

//#region utils

const queueTask_ = !OnEdge && ((OnChrome ? Build.MinCVer >= BrowserVer.Min$queueMicrotask
  : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask : true) || globalThis.queueMicrotask)
  ? queueMicrotask : (task: () => void) => { void Promise.resolve().then(task) }

export const $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T

export const $$ = ((selector: string, root?: HTMLElement | ShadowRoot | null): Element[] => {
  const list = (root || document).querySelectorAll(selector)
  return ([] as Element[]).slice.call(list)
}) as <T extends HTMLElement>(selector: string, root?: HTMLElement | ShadowRoot | null) => T[]

export const toggleDark_ = (dark: SettingsNS.PersistentSettings["autoDarkMode"]): void => {
  const el = document.head!.querySelector("meta[name=color-scheme]") as HTMLMetaElement
  const content = dark === 2 ? "light dark" : dark === 1 ? "dark" : "light"
  if (el.content !== content) {
    el.content = content
    const cls = document.documentElement!.classList
    cls.toggle("no-dark", !dark)
    cls.toggle("dark", dark === 1)
  }
}
export const toggleReduceMotion_ = (reduced: boolean): void => {
  document.documentElement!.classList.toggle("less-motion", reduced)
}

export let enableNextTick_: (type: kReadyInfo, toRemove?: kReadyInfo) => void
const dbg_task_ = !Build.NDEBUG ? (console as any).createTask as ((
    name: string) => { run (cb: () => void): void; (): unknown }) | undefined : null

export const nextTick_ = ((): { <T>(task: (self: T) => void, self: T): void; (task: (this: void) => void): void } => {
  const ticked = function (): void {
    const oldSize = tasks.length
    for (let i = 0; i < oldSize; i++) {
      (void 0, tasks[i])()
    }
    if (tasks.length > oldSize) {
      tasks.splice(0, oldSize)
      queueTask_(ticked)
    } else {
      tasks.length = 0
      taskId = 0
    }
  }, tasks: (() => void)[] = []
  let taskId = 0
  enableNextTick_ = (type, toRemove): void => {
    readyInfo_ = (readyInfo_ | type) & ~(toRemove || 0)
    if (readyInfo_ === kReadyInfo.FINISHED) {
      queueTask_(ticked)
    }
  }
  return <T> (task: ((firstArg: T) => void) | ((this: void) => void), context?: T): void => {
    if (tasks.length <= 0 && readyInfo_ === kReadyInfo.FINISHED) {
      queueTask_(ticked)
    }
    const asyncTask = !Build.NDEBUG && dbg_task_ ? dbg_task_(`task-${++taskId}`) : null
    if (context as unknown as number === 9) {
      task = asyncTask ? asyncTask.run.bind(asyncTask, task as (this: void) => void) : task
      tasks.unshift(task as (this: void) => void) // here ignores the case of re-entry
    } else {
      let task2 = context ? (task as (firstArg: T) => void).bind(null, context) : task as (this: void) => void
      task2 = asyncTask ? asyncTask.run.bind(asyncTask, task2) : task2
      tasks.push(task2)
    }
  }
})()

export const import2_ = (url: string): Promise<unknown> =>
    !(Build.BTypes & BrowserType.Edge)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinES$DynamicImport)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredES$DynamicImport)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ? import(url) : define([url]) // eslint-disable-line @typescript-eslint/no-unsafe-call

if (!Build.NDEBUG) { (window as any).updateUI = (): void => { void post_(kPgReq.reloadCSS, null) } }
//#endregion

//#region i18n

export type TransTy<Keys extends string> = (key: Keys, arg1?: (string | number)[]) => string

export const pageTrans_ = (key: string, arg1?: (string | number)[]): string | undefined => {
  if (!(Build.NDEBUG || (readyInfo_ & kReadyInfo.FINISHED) === kReadyInfo.FINISHED)) {
    console.trace("Error: want to translate %s before finished (ready = %d)", key, readyInfo_)
  }
  let val = i18nDict_.get(key)
  if (arg1 != null && val) {
    val = val.replace(<RegExpG & RegExpSearchable<0>> /\$\d/g, (i): string => arg1[+i[1] - 1] as string)
  }
  return val
}

/** @see {@link ../background/i18n#transPart_ } */
const transPart_ = (msg: string, child: string): string => {
  return msg && msg.split(" ").reduce((old, i) => old ? old : !i.includes("=") ? i
      : i.startsWith(child) ? i.slice(child.length + 1) : old, "")
}
export const bTrans_ = browser_.i18n.getMessage
const curPath = location.pathname.replace("/pages/", "").split(".")[0], browserLang = bTrans_("lang1")
export const pageLangs_ = transPart_(bTrans_("i18n"), curPath) || browserLang || "en"

const useTopLevelAwait: boolean = !!Build.NDEBUG && !(Build.BTypes & BrowserType.Edge)
    && !(Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredES$TopLevelAwait)
    && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES$TopLevelAwait)
const onDicts = (dicts: ({ default: Dict<string> } | string | null)[]): void => {
  const dest = i18nDict_
  for (const src of dicts.reverse()) {
    if (!src) { continue }
    const part = useTopLevelAwait ? (src as Extract<typeof src, Dict<any>>).default
      : JSON.parse(Build.NDEBUG ? (src as Extract<typeof src, string>).slice("export default".length) : src as string)
    for (const key in part) { dest.set(key, part[key]!) }
  }
  enableNextTick_(kReadyInfo.i18n)
}
export const onDicts_ = useTopLevelAwait ? onDicts : 0 as never
export const curPagePath_ = useTopLevelAwait ? curPath : 0 as never

; !!Build.NDEBUG && !(Build.BTypes & BrowserType.Edge)
    && !(Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredES$TopLevelAwait)
    && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES$TopLevelAwait)
? curPath !== "options" && curPath !== "action" && onDicts_( // eslint-disable-next-line spaced-comment
  /*! @OUTPUT {await } */ // @ts-ignore
  Promise.all(
    pageLangs_.split(",").map(lang => // @ts-ignore
    import(
      `/i18n/${lang}/${curPath === "show" ? "action" : curPath}.js`)))
) :
void Promise.all(pageLangs_.split(",").map((lang): Promise<string | null> => {
  const langFile = `/i18n/${lang}/${curPath === "show" ? "action" : curPath}.${Build.NDEBUG ? "js" : "json"}`
  const p = (!OnChrome || Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
      || CurCVer_ >= BrowserVer.MinFetchExtensionFiles ? (fetch as ValidFetch)(langFile).then(r => r.text())
      : new Promise<string>((resolve): void => {
    const req = new XMLHttpRequest() as TextXHR
    req.responseType = "text"
    req.onload = function (): void { resolve(this.response) }
    req.open("GET", langFile, true), req.send()
  }))
  return !Build.NDEBUG ? p : p.catch((err): null => {
    console.log("Can not load the language file:", langFile, ":", err)
    return null
  })
})).then(onDicts)

//#endregion

//#region async/await helper

Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES2017AsyncFunctions &&
((): void => {
  interface YieldedValue { 42: true }
  /** no .trys, so unexpected try/catch whould make it throw as soon as possible */
  interface YieldedPos { label_: number; sent_ (): YieldedValue | undefined }
  type YieldableFunc = (pos: YieldedPos) => [/** step */ number, /** returned */ YieldedValue?]

  const __myAwaiter = Build.MinCVer < BrowserVer.MinEnsuredGeneratorFunction
  ? (branchedFunc: () => YieldableFunc, self: unknown): Promise<any> => new Promise<any> ((resolve): void => {
    const resolveVoid = resolve.bind(0, void 0)
    const generator = branchedFunc.call(self)
    let value_: YieldedValue | undefined, async_pos_: YieldedPos = { label_: 0, sent_: () => value_ }
    resume_()
    function resume_(newValue?: YieldedValue): void {
      value_ = newValue
      let nextInst = Instruction.next
      while (~nextInst & Instruction.return) {
        let tmp = generator(async_pos_)
        nextInst = tmp[0], value_ = tmp.length > 1 ? tmp[1] : void 0
        if (Build.NDEBUG ? nextInst > Instruction.yield - 1 : nextInst === Instruction.yield) {
          async_pos_.label_++; nextInst = Instruction.yield | Instruction.return
        } else if (Build.NDEBUG ? nextInst > Instruction.break - 1 : nextInst === Instruction.break) {
          async_pos_.label_ = value_ as unknown as number
        } else if (!(Build.NDEBUG || nextInst === Instruction.next || nextInst === Instruction.return)) {
          throw Error("Assert error: unsupported async status: " + nextInst)
        }
      }
      Promise.resolve(value_).then(nextInst < Instruction.return + 1 ? resolve : resume_
          , Build.NDEBUG ? resolveVoid : logDebugAndResolve)
    }
    function logDebugAndResolve(err: any): void {
      console.log("Vimium C: an async function fails:", err)
      resolveVoid()
    }
  })
  : <TNext, TReturn> (generatorFunction: () => Generator<TNext | TReturn | Promise<TNext | TReturn>, TReturn, TNext>
      , self: unknown): Promise<TReturn | void> => new Promise<TReturn | void> ((resolve): void => {
    const resolveVoid = Build.MinCVer < BrowserVer.MinTestedES6Environment ? resolve.bind(0, void 0) : () => resolve()
    const generator = generatorFunction.call(self)
    const resume_ = (lastVal?: TNext): void => {
      const yielded = generator.next(lastVal), value = yielded.value
      if (Build.MinCVer < BrowserVer.Min$resolve$Promise$MeansThen) {
        Promise.resolve(value).then((yielded.done ? resolve : resume_) as (value: TReturn | TNext) => void
            , Build.NDEBUG ? resolveVoid : logDebugAndResolve)
      } else if (yielded.done) {
        resolve(value as TReturn | Promise<TReturn> as /** just to satisfy type checks */ TReturn)
      } else {
        Promise.resolve(value as TNext | Promise<TNext>).then(resume_, Build.NDEBUG ? resolveVoid : logDebugAndResolve)
      }
    }
    resume_()
    function logDebugAndResolve(err: any): void {
      if (!Build.NDEBUG) { console.log("Vimium C: an async function fails:", err) }
      resolveVoid()
    }
  })

  if (Build.MinCVer < BrowserVer.MinEnsuredGeneratorFunction) {
    (globalThis as any).__generator = (self: void | undefined, branchedFunc: YieldableFunc): YieldableFunc =>
        branchedFunc.bind(self)
  }
  (globalThis as any).__awaiter = (_self: void | 0 | undefined, _args: unknown, _p: PromiseConstructor | 0 | undefined
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      , func_to_await: Function): Promise<YieldedValue> => __myAwaiter(func_to_await as any, _self)

})()

//#endregion

if (OnChrome ? (Build.MinCVer >= BrowserVer.MinMediaQuery$PrefersColorScheme
        || CurCVer_ > BrowserVer.MinMediaQuery$PrefersColorScheme - 1)
    : OnFirefox ? (Build.MinFFVer >= FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme
        || CurFFVer_ > FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme - 1)
    : !OnEdge) {
  type Keys = keyof SettingsNS.PersistentSettings
  const storage = browser_.storage.local as { get <K extends Keys> (k: K, cb: (r: { [k in K]: any }) => void): void }
  storage.get("autoDarkMode", (res): void => {
    const value = res && res.autoDarkMode as SettingsNS.PersistentSettings["autoDarkMode"] | boolean;
    (value === false || value === 1 || value === 0) && toggleDark_(value ? 1 : 0); return browser_.runtime.lastError
  })
}
OnFirefox && browser_.runtime.getBrowserInfo().then((info): void => {
  CurFFVer_ = parseInt(info && info.version) || CurFFVer_
  BrowserName_ = info && info.name || ""
  enableNextTick_(kReadyInfo.browserInfo)
})

if (browserLang && curPath !== "action") {
  const s = bTrans_("v" + curPath)
  s && (document.title = "Vimium C " + s)
}

curPath === "options" && void isVApiReady_.then((): void => {
  VApi!.r[0]<kFgReq.pages>(kFgReq.pages, { i: 1, q: [ { n: kPgReq.selfTabId, q: null } ] }, (res) => {
    res !== false && (selfTabId_ = res.a[0] as number)
  })
})

export const simulateClick_ = (target: HTMLElement
    , event?: { altKey: boolean, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean }): boolean => {
  let mouseEvent: MouseEvent
  event = event || { ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }
  if (!OnChrome || Build.MinCVer >= BrowserVer.MinUsable$MouseEvent$$constructor || document.hidden != null) {
    mouseEvent = new MouseEvent("click", {
      bubbles: true, cancelable: true, composed: !0, view: window, detail: 1,
      screenX: 0, screenY: 0, clientX: 0, clientY: 0,
      ctrlKey: event.ctrlKey, altKey: event.altKey, shiftKey: event.shiftKey, metaKey: event.metaKey,
      button: 0, buttons: 1, relatedTarget: null
    })
  } else {
    mouseEvent = document.createEvent("MouseEvents")
    mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
      , event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, 0, null)
  }
  return target.dispatchEvent(mouseEvent)
}

export const hasShift_ = (event: Pick<KeyboardEvent, "shiftKey" | "key" | "getModifierState">): boolean => {
  if (!OnFirefox) { return event.shiftKey }
  const key = event.key!, upper = key.length === 1 ? key.toUpperCase() : ""
  return upper && key.toLowerCase() !== upper && event.getModifierState("CapsLock") ? key !== upper : event.shiftKey
}

export const isRepeated_ = (event: KeyboardEvent): boolean => {
  const repeated = event.repeat
  if (OnChrome ? Build.MinCVer >= BrowserVer.MinCorrect$KeyboardEvent$$Repeat
      : OnFirefox ? !(Build.OS & kBOS.LINUX_LIKE) : true) {
    return repeated
  }
  return repeated || (OnChrome ? CurCVer_ < BrowserVer.MinCorrect$KeyboardEvent$$Repeat
    : OnFirefox && (Build.OS === kBOS.LINUX_LIKE as number || PageOs_ === kOS.linuxLike))
      && !!(VApi && VApi.a()[event.keyCode] && event.keyCode)
}

export const prevent_ = (event: EventToPrevent & PartialOf<KeyboardEvent, "keyCode" | "metaKey">): void => {
  event.preventDefault()
  const keyCode = event.type === "keydown" ? event.keyCode : kKeyCode.None
  if (keyCode && (!(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && PageOs_ || !event.metaKey)) {
    VApi && (VApi.a()[keyCode] = 1)
  }
}

export const escapeAllForRe_ = (str: string): string => str.replace(<RegExpG> /[$()*+.?\[\\\]\^{|}]/g, "\\$&")

if (typeof VApi === "undefined") { globalThis.VApi = undefined }

type ToTest = StringWithOneEnd<DeepKeys<PgReq>, "_">;
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
((_value: never): void => { /* empty */ })("" as string as ToTest)
