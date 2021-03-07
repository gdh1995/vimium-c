declare var define: any

if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
  (window as Writable<Window>).OnOther = Build.BTypes & BrowserType.Chrome
      && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
          || location.protocol.lastIndexOf("chrome", 0) >= 0) // in case Chrome also supports `browser` in the future
      ? BrowserType.Chrome
      : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
      : /* an invalid state */ BrowserType.Unknown
}

// eslint-disable-next-line no-var
var Backend_: BackendHandlersNS.BackendHandlers,
trans_ = chrome.i18n.getMessage,
CurCVer_: BrowserVer = Build.BTypes & BrowserType.Chrome ? 0 | (
    (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    && navigator.appVersion.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
    || [0, BrowserVer.assumedVer])[1] as number : BrowserVer.assumedVer,
IsEdg_: boolean = Build.BTypes & BrowserType.Chrome
    && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    ? (<RegExpOne> /\sEdg\//).test(navigator.appVersion) : false,
CurFFVer_: FirefoxBrowserVer = !(Build.BTypes & ~BrowserType.Firefox)
    || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
    ? 0 | (navigator.userAgent.match(<RegExpOne> /\bFirefox\/(\d+)/) || [0, FirefoxBrowserVer.assumedVer])[1] as number
    : FirefoxBrowserVer.None,
BrowserProtocol_ = Build.BTypes & ~BrowserType.Chrome
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

if (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
  window.chrome = browser as typeof chrome
}

Build.NDEBUG || (function (): void {
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
  if (!Build.NDEBUG) {
    myDefine.amd = true
    myDefine.modules_ = modules
  }
  (window as PartialOf<typeof globalThis, "define">).define = myDefine
})()

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
  (function (): void {
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
      type SimulatedMap = IterableMap<string, any> & Set<string> & { map_: SafeDict<1>, isSet_: BOOL }
      const proto = {
        add (k: string): any { this.map_[k] = 1 },
        clear (): void { this.map_ = BgUtils_.safeObj_<1>() },
        delete (k: string): any { delete this.map_[k] },
        forEach (cb: any): any {
          const isSet = this.isSet_, map = this.map_
          for (let key in map) {
            isSet ? cb(key) : cb(map[key], key)
          }
        },
        get (k: string): any { return this.map_[k] },
        has (k: string): boolean { return this.map_[k] === 1 },
        keys (): any { return this.map_ as any },
        set (k: string, v: any): any { this.map_[k] = v }
      } as SimulatedMap
      const setProto = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
          && !Object.setPrototypeOf ? (obj: SimulatedMap): void => { (obj as any).__proto__ = proto }
          : (opt: SimulatedMap): void => { (Object.setPrototypeOf as any)(opt, proto) };
      (window as any as typeof globalThis).Set = function (this: SimulatedMap): any {
        setProto(this)
        this.map_ = BgUtils_.safeObj_<1>()
        this.isSet_ = 1
      } as any;
      (window as any as typeof globalThis).Map = function (this: SimulatedMap): any {
        setProto(this)
        this.map_ = BgUtils_.safeObj_<1>()
        this.isSet_ = 0
      } as any
    }
  })()
}
