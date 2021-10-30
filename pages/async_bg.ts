/// <reference path="../background/index.d.ts" />
/// <reference path="../background/typed_commands.d.ts" />

export interface BgWindow extends Window {
  Backend_: typeof Backend_ & {
    Settings_: typeof import("../background/settings")
  }
}
export declare const enum kReadyInfo { platformInfo = 1, popup = 1, i18n = 2, NONE = 0, FINISHED = 3 }

// eslint-disable-next-line no-var
declare var define: any

const OnOther: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
    ? Build.BTypes as number
    : Build.BTypes & BrowserType.Chrome
      && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
          || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
    ? BrowserType.Chrome
    : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
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
export const CurFFVer_: FirefoxBrowserVer = !OnFirefox ? FirefoxBrowserVer.assumedVer
    : userAgentData ? (tmpBrand = userAgentData.brands.find(i => i.brand.includes("Firefox")))
      ? tmpBrand.version : FirefoxBrowserVer.MinMaybe$navigator$$userAgentData > Build.MinFFVer
      ? FirefoxBrowserVer.MinMaybe$navigator$$userAgentData : Build.MinFFVer
    : 0 | <number>(navigator.userAgent!.match(<RegExpOne> /\bFirefox\/(\d+)/) || [0, FirefoxBrowserVer.assumedVer])[1]

export const browser_: typeof chrome = OnChrome ? chrome : browser as typeof chrome
if (!OnChrome && window.chrome) {
  window.chrome = null as never
}

export let BG_ = browser_.extension && browser_.extension.getBackgroundPage() as Window as BgWindow
if (!(BG_ && BG_.Backend_)) {
  BG_ = null as never;
}

export let asyncBackend_ = BG_ && BG_.Backend_
export let bgSettings_ = asyncBackend_ && asyncBackend_.Settings_
let readyInfo_ = kReadyInfo.NONE
const __oldI18nMap = {} as Dict<string>
const i18nDict_: Pick<Map<string, string>, "get" | "set"> = !OnChrome
    || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || typeof Map === "function"
    ? new Map() : {
  get (k: string): any { return __oldI18nMap[k] },
  set (k: string, v: any): any { __oldI18nMap[k] = v }
}


//#region utils

export const reloadBG_ = (): void => {
  BG_ = browser_.extension.getBackgroundPage() as Window as BgWindow
  if (BG_) { // a user may call `close()` in the console panel, then `BG_` is null
    asyncBackend_ = BG_.Backend_
    bgSettings_ = asyncBackend_ && asyncBackend_.Settings_
    if (!bgSettings_) { BG_ = null as never }
  }
}

export const $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T

export const $$ = ((selector: string, root?: HTMLElement | ShadowRoot | null): ArrayLike<Element> => {
  const list = (root || document).querySelectorAll(selector)
  return OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
      && Build.MinCVer >= BrowserVer.BuildMinForOf && CurCVer_ < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
      ? [].slice.call(list) : list
}) as <T extends HTMLElement>(selector: string, root?: HTMLElement | ShadowRoot | null
    ) => T[] & { forEach: never }

export const toggleDark = (dark: boolean): void => {
  (document.head!.querySelector("meta[name=color-scheme]") as HTMLMetaElement).content = dark ? "light dark" : "light"
  document.documentElement!.classList.toggle("no-dark", !dark)
}
export const toggleReduceMotion = (reduced: boolean): void => {
  document.documentElement!.classList.toggle("less-motion", reduced)
}

asyncBackend_.contentPayload_.d || toggleDark(false)
asyncBackend_.contentPayload_.m && toggleReduceMotion(true)

export let enableNextTick_: (type: kReadyInfo) => void

export const nextTick_ = ((): { <T>(task: (self: T) => void, self: T): void; (task: (this: void) => void): void } => {
  const ticked = function (): void {
    const oldSize = tasks.length
    for (let i = 0; i < oldSize; i++) { tasks[i]() }
    if (tasks.length > oldSize) {
      tasks.splice(0, oldSize)
      if (OnChrome ? Build.MinCVer >= BrowserVer.Min$queueMicrotask
          : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask : !OnEdge) {
        queueMicrotask(ticked)
      } else {
        void Promise.resolve().then(ticked)
      }
    } else {
      tasks.length = 0
    }
  }, tasks: (() => void)[] = []
  enableNextTick_ = (type): void => {
    readyInfo_ |= type
    if (readyInfo_ === kReadyInfo.FINISHED) {
      enableNextTick_ = null as never
      nextTick_((): void => { document.documentElement!.classList.remove("loading") })
      ticked()
    }
  }
  return <T> (task: ((firstArg: T) => void) | ((this: void) => void), context?: T): void => {
    if (tasks.length <= 0 && readyInfo_ === kReadyInfo.FINISHED) {
      if (OnChrome ? Build.MinCVer >= BrowserVer.Min$queueMicrotask
          : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask : !OnEdge) {
        queueMicrotask(ticked)
      } else {
        void Promise.resolve().then(ticked)
      }
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

//#endregion

//#region i18n

export type TransTy<Keys extends string> = (key: Keys, arg1?: (string | number)[]) => string

export const pageTrans_ = (key: string, arg1?: (string | number)[]): string | undefined => {
  if (!(Build.NDEBUG || readyInfo_ === kReadyInfo.FINISHED)) {
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
const curPath = location.pathname.replace("/pages/", "").split(".")[0]
export const pageLangs_ = transPart_(bTrans_("i18n"), curPath) || bTrans_("lang1") || "en"

Promise.all(pageLangs_.split(",").map((lang): Promise<Dict<string> | null> => {
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
  if (pageLangs_ !== "en") {
    const s = dest.get("v" + curPath)
    s && (document.title = "Vimium C " + s)
  }
  enableNextTick_(kReadyInfo.i18n)
})

//#endregion
