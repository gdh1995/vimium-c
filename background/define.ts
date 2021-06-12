declare var define: any // eslint-disable-line no-var
declare var trans_: typeof chrome.i18n.getMessage // eslint-disable-line no-var

if (typeof globalThis === "undefined") {
  (window as any as Writable<typeof globalThis>).globalThis = window as any
}

if (!Build.BTypes || Build.BTypes & (Build.BTypes - 1)) {
  globalThis.OnOther = Build.BTypes & BrowserType.Chrome
      && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
          || location.protocol.lastIndexOf("chrome", 0) >= 0) // in case Chrome also supports `browser` in the future
      ? BrowserType.Chrome
      : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
      : /* an invalid state */ BrowserType.Unknown
}
if (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
  globalThis.chrome = browser as typeof chrome
}

globalThis.Backend_ = null as never
globalThis.CurCVer_ = Build.BTypes & BrowserType.Chrome ? 0 | (
    (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    && navigator.appVersion.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
    || [0, BrowserVer.assumedVer])[1] as number : BrowserVer.assumedVer,
globalThis.IsEdg_ = Build.BTypes & BrowserType.Chrome
    && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    ? (<RegExpOne> /\sEdg\//).test(navigator.appVersion) : false,
globalThis.CurFFVer_ = !(Build.BTypes & ~BrowserType.Firefox)
    || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
    ? 0 | (navigator.userAgent.match(<RegExpOne> /\bFirefox\/(\d+)/) || [0, FirefoxBrowserVer.assumedVer])[1] as number
    : FirefoxBrowserVer.assumedVer,
globalThis.BrowserProtocol_ = Build.BTypes & ~BrowserType.Chrome
      && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
    ? Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) ? "moz"
    : Build.BTypes & BrowserType.Edge
      && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge) ? "ms-browser" : "about"
    : "chrome"

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer <= BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor
    && CurCVer_ === BrowserVer.FakeUAMajorWhenFreezeUserAgent
    && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    && matchMedia("(prefers-color-scheme)").matches) {
  CurCVer_ = BrowserVer.FlagFreezeUserAgentGiveFakeUAMajor
}

globalThis.trans_ = chrome.i18n.getMessage; // eslint-disable-line no-var

(function (): void {
  type ModuleTy = Dict<any> & { __esModule?: boolean }
  type RequireTy = (target: string) => ModuleTy
  interface DefineTy {
    (deps: string[], factory: (require: RequireTy, exports: ModuleTy) => any): any
    amd?: boolean
    modules_?: Dict<ModuleTy>
  }
  const modules: Dict<ModuleTy> = {}
  const myDefine: DefineTy = (_, factory): void => {
    const name = (document.currentScript as HTMLScriptElement).src
    const filename = name.slice(name.lastIndexOf("/") + 1).replace(".js", "")
    const exports: ModuleTy = modules[filename] || (modules[filename] = {})
    if (!Build.NDEBUG) {
      (myDefine as any)[filename] = exports
    }
    factory(require, exports)
  }
  const require = (target: string): ModuleTy => {
    target = target.replace(<RegExpG> /\.(\/|js)/g, "")
    return modules[target] || (modules[target] = {} as ModuleTy)
  }
  myDefine.amd = true
  if (!Build.NDEBUG) {
    myDefine.modules_ = modules
  }
  globalThis.define = myDefine
})()

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Array$$find$$findIndex && ![].find) {
  (function (): void {
    Array.prototype.find = function (this: any[], cond: (i: any) => boolean): any { return this.filter(cond)[0] } as any
    if (Build.MinCVer >= BrowserVer.MinSafe$String$$StartsWith || "".includes) {
      return
    }
    const StringCls = String.prototype
    /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
    if (!"".startsWith) {
      StringCls.startsWith = function (this: string, s: string): boolean {
        return this.lastIndexOf(s, 0) === 0
      }
      StringCls.endsWith = function (this: string, s: string): boolean {
        const i = this.length - s.length
        return i >= 0 && this.indexOf(s, i) === i
      }
    } else if (Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
      Promise.resolve || (Promise.resolve = Promise.resolved!)
    }
    StringCls.includes = function (this: string, s: string, pos?: number): boolean {
      // eslint-disable-next-line @typescript-eslint/prefer-includes
      return this.indexOf(s, pos) >= 0
    }
    if (Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        && CurCVer_ < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
      const proto = {
        add (k: string): any { this.map_[k] = 1 },
        clear (): void { this.map_ = BgUtils_.safeObj_<any>() },
        delete (k: string): any { delete this.map_[k] },
        forEach (cb): any {
          const isSet = this.isSet_, map = this.map_
          for (let key in map) {
            isSet ? (cb as (value: string) => void)(key) : cb(map[key], key)
          }
        },
        get (k: string): any { return this.map_[k] },
        has (k: string): boolean { return k in this.map_ },
        set (k: string, v: any): any { this.map_[k] = v }
      } as SimulatedMap
      const setProto = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
          && !Object.setPrototypeOf ? (obj: SimulatedMap): void => { (obj as any).__proto__ = proto }
          : (opt: SimulatedMap): void => { Object.setPrototypeOf(opt, proto as any as null) };
      globalThis.Set = function (this: SimulatedMap): any {
        setProto(this)
        this.map_ = BgUtils_.safeObj_<1>()
        this.isSet_ = 1
      } as any;
      globalThis.Map = function (this: SimulatedMap): any {
        setProto(this)
        this.map_ = BgUtils_.safeObj_<any>()
        this.isSet_ = 0
      } as any
    }
  })()
}
