/// <reference path="../background/index.d.ts" />
/// <reference path="../lib/base.d.ts" />
import { kPgReq, PgReq, Req2 } from "../background/page_messages"

export declare const enum kReadyInfo {
  show = 1, popup = 1, options = 1, i18n = 2, browserInfo = 4,
  NONE = 0, FINISHED = 7, LOCK = 8,
}

declare var define: any, VApi: VApiTy | undefined // eslint-disable-line no-var

const OnOther: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
    ? Build.BTypes as number
    : Build.BTypes & BrowserType.Chrome
      && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
          || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
    ? BrowserType.Chrome
    : Build.BTypes & BrowserType.Edge && globalThis.StyleMedia ? BrowserType.Edge
    : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
    : /* an invalid state */ BrowserType.Unknown

export const OnChrome: boolean = !(Build.BTypes & ~BrowserType.Chrome)
    || !!(Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome)
export const OnFirefox: boolean = !(Build.BTypes & ~BrowserType.Firefox)
    || !!(Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox)
export const OnEdge: boolean = !(Build.BTypes & ~BrowserType.Edge)
    || !!(Build.BTypes & BrowserType.Edge && OnOther & BrowserType.Edge)
export const OnSafari: boolean = false // eslint-disable-line @typescript-eslint/no-inferrable-types

const userAgentData = navigator.userAgentData
let tmpBrand: NonNullable<Navigator["userAgentData"]>["brands"][0] | undefined
export const IsEdg_: boolean = OnChrome && (!userAgentData ? matchMedia("(-ms-high-contrast)").matches
    : !!userAgentData.brands.find(i => i.brand.includes("Edge") || i.brand.includes("Microsoft")))
export const CurCVer_: BrowserVer = !OnChrome ? BrowserVer.assumedVer
    : userAgentData ? (tmpBrand = userAgentData.brands.find(i => i.brand.includes("Chromium")))
      ? tmpBrand.version : BrowserVer.MinMaybe$navigator$$userAgentData > Build.MinCVer
      ? BrowserVer.MinMaybe$navigator$$userAgentData : Build.MinCVer
    : (Build.MinCVer <= BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor ? ((): BrowserVer => {
      const ver = navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
      return !ver ? BrowserVer.assumedVer : +ver[1] === BrowserVer.FakeUAMajorWhenFreezeUserAgent
          && matchMedia("(prefers-color-scheme)").matches ? BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor
          : 0 | ver[1] as string | number as number
    })()
    : 0 | <number> (navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/) || [0, BrowserVer.assumedVer])[1])
export let CurFFVer_: FirefoxBrowserVer = !OnFirefox ? FirefoxBrowserVer.assumedVer
    : userAgentData ? (tmpBrand = userAgentData.brands.find(i => i.brand.includes("Firefox")))
      ? tmpBrand.version : FirefoxBrowserVer.MinMaybe$navigator$$userAgentData > Build.MinFFVer
      ? FirefoxBrowserVer.MinMaybe$navigator$$userAgentData : Build.MinFFVer
    : 0 | <number>(navigator.userAgent!.match(<RegExpOne> /\bFirefox\/(\d+)/) || [0, FirefoxBrowserVer.assumedVer])[1]

export const browser_: typeof chrome = OnChrome ? chrome : browser as typeof chrome
if (!OnChrome && window.chrome) { window.chrome = null as never }

export const isVApiReady_ = new Promise<void>((resolve): void => {
  addEventListener(GlobalConsts.kLoadEvent, function onContentLoaded(): void {
    if (OnChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once
        && CurCVer_ < BrowserVer.Min$addEventListener$support$once) {
      removeEventListener(GlobalConsts.kLoadEvent, onContentLoaded, { capture: true })
    }
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
let _ansCallbacks = null as AnswerCallback[] | null
const _todoCallbacks = Object.create(null) as { [key: number]: AnswerCallback[] }
let _queryId = 1
let _tempPort = null as null | ContentNS.Port
export let selfTabId_: number = GlobalConsts.TabIdNone

//#region async messages

const onRespond = (res: FgRes[kFgReq.pages]): void => {
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
  _tempPort = null
  if (!Build.NDEBUG && _todoMsgs) {
    console.log(`Error: unexpected disconnection when ${_todoMsgs.length} message(s) are waiting`)
  }
  _todoMsgs = [], _ansCallbacks = []
  for (let id in _todoCallbacks) {
    const callbacks = _todoCallbacks[id]
    delete _todoCallbacks[id]
    for (const callback of callbacks) {
      try {
        callback(null)
      } catch { /* empty */ }
    }
  }
  _todoMsgs = _ansCallbacks = null
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
  const getBg = browser_.extension.getBackgroundPage
  const bg = getBg && getBg() as unknown as BgExports | null
  if (bg && bg.onPagesReq) {
    void bg.onPagesReq({ i: id, q: _todoMsgs }).then(OnFirefox ? onRespond2_ff : onRespond)
  } else if (api) {
    api.r[0]<kFgReq.pages>(kFgReq.pages, { i: id, q: _todoMsgs }, onRespond)
  } else {
    if (!_tempPort) {
      _tempPort = browser_.runtime.connect({ name: "" + PortType.selfPages }) as ContentNS.Port
      _tempPort.onMessage.addListener(onRespond)
      _tempPort.onDisconnect.addListener(onDisconnect)
    }
    _tempPort.postMessage({ H: kFgReq.pages, i: id, q: _todoMsgs })
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

const queueTask_ = (OnChrome ? Build.MinCVer >= BrowserVer.Min$queueMicrotask
  : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask : !OnEdge) ? queueMicrotask
  : (task: () => void) => { void Promise.resolve().then(task) }

export const $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T

export const $$ = ((selector: string, root?: HTMLElement | ShadowRoot | null): ArrayLike<Element> => {
  const list = (root || document).querySelectorAll(selector)
  return OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
      && Build.MinCVer >= BrowserVer.BuildMinForOf && CurCVer_ < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
      ? [].slice.call(list) : list
}) as <T extends HTMLElement>(selector: string, root?: HTMLElement | ShadowRoot | null
    ) => T[] & { forEach: never }

export const toggleDark = (dark: SettingsNS.PersistentSettings["autoDarkMode"]): void => {
  const el = document.head!.querySelector("meta[name=color-scheme]") as HTMLMetaElement
  const content = dark === 2 ? "light dark" : dark === 1 ? "dark" : "light"
  if (el.content !== content) {
    el.content = content
    const cls = document.documentElement!.classList
    cls.toggle("no-dark", !dark)
    cls.toggle("dark", dark === 1)
  }
}
export const toggleReduceMotion = (reduced: boolean): void => {
  document.documentElement!.classList.toggle("less-motion", reduced)
}

export let enableNextTick_: (type: kReadyInfo, toRemove?: kReadyInfo) => void

export const nextTick_ = ((): { <T>(task: (self: T) => void, self: T): void; (task: (this: void) => void): void } => {
  const ticked = function (): void {
    const oldSize = tasks.length
    for (let i = 0; i < oldSize; i++) { tasks[i]() }
    if (tasks.length > oldSize) {
      tasks.splice(0, oldSize)
      queueTask_(ticked)
    } else {
      tasks.length = 0
    }
  }, tasks: (() => void)[] = []
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
    if (context as unknown as number === 9) {
      tasks.unshift(task as (this: void) => void) // here ignores the case of re-entry
    } else {
      tasks.push(context ? (task as (firstArg: T) => void).bind(null, context) : task as (this: void) => void)
    }
  }
})()

export const import2 = (url: string): Promise<unknown> => {
  if (!(Build.BTypes & BrowserType.Edge)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinES$DynamicImport)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredES$DynamicImport)
      ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return import(url)
  }
  return define([url]) // eslint-disable-line @typescript-eslint/no-unsafe-call
}

export const fetch = (input: string, init?: Partial<Request>): Promise<Response> => {
  const a = globalThis.fetch
  return a(input as `/${string}`, init)
}

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

void Promise.all(pageLangs_.split(",").map((lang): Promise<Dict<string> | null> => {
  const langFile = `/i18n/${lang}/${curPath === "show" ? "popup" : curPath}.json`
  const p = (!OnChrome || Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
      || CurCVer_ >= BrowserVer.MinFetchExtensionFiles ? fetch(langFile).then(r => r.json() as {})
      : new Promise<{}>((resolve): void => {
    const req = new XMLHttpRequest() as JSONXHR
    req.responseType = "json"
    req.onload = function (): void { resolve(this.response as {}) }
    req.open("GET", langFile, true), req.send()
  }))
  return !Build.NDEBUG ? p : p.catch((err): null => {
    console.log("Can not load the language file:", langFile, ":", err)
    return null
  })
})).then((dicts): void => {
  const dest = i18nDict_
  for (const src of dicts.reverse()) {
    if (!src) { continue }
    for (const key in src) {
      dest.set(key, src[key]!)
    }
  }
  enableNextTick_(kReadyInfo.i18n)
})

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
    (value === false || value === 1) && toggleDark(value ? 1 : 0); return browser_.runtime.lastError
  })
}
OnFirefox && browser_.runtime.getBrowserInfo().then((info): void => {
  CurFFVer_ = parseInt(info && info.version) || CurFFVer_
  enableNextTick_(kReadyInfo.browserInfo)
})

if (browserLang && curPath !== "popup") {
  const s = bTrans_("v" + curPath)
  s && (document.title = "Vimium C " + s)
}

curPath === "options" && void isVApiReady_.then((): void => {
  VApi!.r[0]<kFgReq.pages>(kFgReq.pages, { i: 1, q: [ { n: kPgReq.selfTabId, q: null } ] }, (res) => {
    res !== false && (selfTabId_ = res.a[0] as number)
  })
})

export const simulateClick = (target: HTMLElement
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

if (typeof VApi === "undefined") { globalThis.VApi = undefined }

type ToTest = StringWithOneEnd<DeepKeys<PgReq>, "_">;
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
((_value: never): void => { /* empty */ })("" as string as ToTest)
