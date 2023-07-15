/// <reference path="../typings/lib/window.d.ts" />
declare var define: any, __filename: string | null | undefined, AbortController: unknown // eslint-disable-line no-var

if (Build.BTypes & (Build.BTypes & BrowserType.ChromeOrFirefox | BrowserType.Edge)
    && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer < BrowserVer.Min$globalThis)
    && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer < FirefoxBrowserVer.Min$globalThis)
    && typeof globalThis === "undefined") {
  (window as any as Writable<typeof globalThis>).globalThis = window as any
}

!(Build.BTypes & BrowserType.Edge)
&& (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions)
&& (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinES$DynamicImport)
&& (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredES$DynamicImport)
|| (function (): void {
  type ModuleTy = Dict<any> & { __esModule?: boolean, __default?: Function }
  type LoadingPromise = Promise<void> & { __esModule?: ModuleTy }
  type AsyncRequireTy = (target: [string], resolve: (exports: ModuleTy) => void, reject?: (msg: any) => void) => void
  type FactoryTy = (require?: AsyncRequireTy, exports?: ModuleTy, ...deps: ModuleTy[]) => (() => any) | void
  interface DefineTy {
    (deps: string[], factory: FactoryTy): void
    (factory: FactoryTy): void
    amd?: boolean
    noConflict (): void
  }

  const _browser: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
      ? Build.BTypes as number
      : Build.BTypes & BrowserType.Chrome
        && (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
            || location.protocol.startsWith("chrome")) // in case Chrome also supports `browser` in the future
      ? BrowserType.Chrome
      : Build.BTypes & BrowserType.Edge && globalThis.StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
      : /* an invalid state */ BrowserType.Unknown
  const OnChrome: boolean = Build.BTypes === BrowserType.Chrome as number
      || !!(Build.BTypes & BrowserType.Chrome && _browser === BrowserType.Chrome)
  const OnEdge: boolean = Build.BTypes === BrowserType.Edge as number
      || !!(Build.BTypes & BrowserType.Edge && _browser === BrowserType.Edge)
  const navInfo = OnChrome ? Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions
        || (Build.MinCVer >= BrowserVer.MinAbortController || typeof AbortController === "function")
      ? [0, BrowserVer.assumedVer]
      : navigator.appVersion!.match(<RegExpOne & RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/) : 0 as const
  const navVer = OnChrome && Build.MinCVer < BrowserVer.MinUsableScript$type$$module$InExtensions
      ? navInfo && <BrowserVer> +navInfo[1] || 0 : 0

  const modules: Dict<ModuleTy | LoadingPromise> = {}
  const getName = (name: string): string => name.slice(name.lastIndexOf("/") + 1).replace(".js", "")
  const myDefine: DefineTy = (rawDepNames: string[] | FactoryTy, rawFactory?: FactoryTy
      ): void | Promise<ModuleTy> => {
    const depNames = typeof rawDepNames !== "function" && rawDepNames || []
    const factory = typeof rawDepNames === "function" ? rawDepNames : rawFactory
    if (!factory) { // `define([url])`
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      return new Promise(doImport.bind(null, depNames[0], null))
    }
    const selfScript = document.currentScript as HTMLScriptElement
    const url = selfScript != null ? selfScript.src
        : __filename!.lastIndexOf("pages/", 0) === 0 ? "/" + __filename : __filename!
    const name = getName(url)
    let exports = modules[name]
    if (!(Build.NDEBUG || !exports || exports instanceof Promise)) {
      throw new Error(`module filenames must be unique: duplicated "${name}"`)
    }
    if (exports && exports instanceof Promise) {
      const promise: LoadingPromise = exports.then((): void => {
        modules[name] = exports
        _innerDefine(name, depNames, factory, exports as {})
      })
      exports = promise.__esModule = exports.__esModule || {}
      modules[name] = promise
    } else {
      _innerDefine(name, depNames, factory, exports || (modules[name] = {}))
    }
  }
  const _innerDefine = (name: string, depNames: string[], factory: FactoryTy, exports: ModuleTy): void => {
    const obj = factory.bind(null, throwOnDynamicImport, exports).apply(null, depNames.slice(2).map(myRequire))
    obj && (exports.__default = obj)
    if (!(Build.NDEBUG && Build.Inline && Build.Mangle)) { (myDefine as any)[name] = obj || exports }
  }
  const throwOnDynamicImport = (): never => {
    throw new Error("Must avoid dynamic import in content scripts")
  }
  const myRequire = (name: string): ModuleTy => {
    name = getName(name)
    let exports = modules[name]
    exports = !exports ? modules[name] = {}
        : exports instanceof Promise ? exports.__esModule || (exports.__esModule = {}) : exports
    return exports.__default as never || exports
  }
  const doImport = (path: string, deps?: Promise<void> | null
        , callback?: (exports: ModuleTy) => void): ModuleTy | Promise<void> => {
    const name = getName(path)
    const exports = modules[name] || (modules[name] = new Promise((resolve, reject): void => {
      const script = document.createElement("script")
      if (!(Build.BTypes & BrowserType.Edge) && (!(Build.BTypes & BrowserType.Chrome)
            || Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions)) {
        __filename = path
        script.type = "module"
        if (OnChrome) {
          script.async = true /** @todo: trace https://bugs.chromium.org/p/chromium/issues/detail?id=717643 */
        }
      }
      script.src = path
      script.onload = (): void => {
        if (!(Build.BTypes & BrowserType.Edge) && (!(Build.BTypes & BrowserType.Chrome)
            || Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions)) {
          modules[name] === exports && (modules[name] = { __esModule: true })
        }
        deps ? void deps.then(resolve) : resolve()
        script.remove()
      }
      if (!Build.NDEBUG) { script.onerror = (ev): void => {
        reject(ev.message)
        setTimeout((): void => { modules[name] = void 0 }, 1)
      } }
      document.head!.appendChild(script)
    }))
    !callback ? 0 :
    exports instanceof Promise ? void exports.then(() => { /* empty */ })
        .then((): void => { void doImport(path, null, callback) })
    : callback(myRequire(name))
    return exports
  }
  myDefine.amd = true
  myDefine.noConflict = (): void => { /* empty */ }
  globalThis.define = myDefine
  // limitation: file names must be unique
  globalThis.__filename = undefined

  if (OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinUsableScript$type$$module$InExtensions
      && navVer < BrowserVer.MinUsableScript$type$$module$InExtensions) {
    addEventListener("DOMContentLoaded", function onNoModule() {
      removeEventListener("DOMContentLoaded", onNoModule, true)
      if (OnChrome && __filename !== undefined) { return }
      const scripts = document.querySelectorAll("script[type=module]") as NodeListOf<HTMLScriptElement>
      if (scripts.length === 0) { return }
      const pathOffset = location.origin.length
      let prev: Promise<void> | null = null
      for (let i = 0; i < scripts.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
        scripts[i].remove()
        prev = doImport(scripts[i].src.slice(pathOffset), prev) as Promise<void>
      }
    }, { once: true })
  }
})()

Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES$Object$$values$and$$entries &&
!Object.values && (function (): void {
  Object.values = (item): any[] => Object.keys(item).map(i => (item as Dict<any>)[i])
  Object.entries = <T extends string> (object: object): [T, unknown][] => {
    const entries: ReturnType<ObjectConstructor["entries"]> = []
    for (const name of Object.keys(object)) { entries.push([name, (object as Dict<unknown>)[name]]) }
    return entries as [T, unknown][]
  }
  if (Build.MinCVer >= BrowserVer.MinEnsuredES$Array$$Includes || [].includes as unknown) { return }
  const noArrayFind = ![].find
  Object.defineProperty(Array.prototype, "includes", { enumerable: false,
    value: function includes(this: any[], value: any, ind?: number): boolean { return this.indexOf(value, ind) >= 0 }
  })
  Build.MinCVer >= BrowserVer.MinEnsured$Object$$assign ||
  Object.assign || (Object.assign = function (dest: object): object {
    for (let i = 1, len = arguments.length; i < len; i++) {
      const src = arguments[i]
      if (!src) { continue }
      for (let key in src) { (dest as Dict<unknown>)[key] = src[key] }
    }
    return dest
  })
  if (!(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Array$$find$$findIndex)) { return }
  if (noArrayFind) {
    Object.defineProperties(Array.prototype, {
      find: { enumerable: false, value: function find(
          this: any[], cond: (i: any, index: number, obj: any[]) => boolean): any {
        const ind = this.findIndex(cond)
        return ind >= 0 ? this[ind] : undefined
      } },
      findIndex: { enumerable: false, value: function findIndex(
          this: any[], cond: (i: any, index: number, obj: any[]) => boolean): any {
        for (let i = 0; i < this.length; i++) { if (cond(this[i], i, this)) { return i } }
        return -1
      } }
    })
  }
  if (Build.MinCVer >= BrowserVer.MinSafe$String$$StartsWith || "".includes as unknown) { return }
  const StringCls = String.prototype
  /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
  if (!"".startsWith) {
    Object.defineProperties(StringCls, {
      startsWith: { enumerable: false,
        value: function startsWith(this: string, s: string): boolean { return this.lastIndexOf(s, 0) === 0 } },
      endsWith: { enumerable: false, value: function endsWith(this: string, s: string): boolean {
        const i = this.length - s.length
        return i >= 0 && this.indexOf(s, i) === i
      } },
      repeat: { enumerable: false, value: function repeat(this: string, num: number): string {
        let res = "", slice = this
        for (let i = 0; i < num; i++) { res += slice }
        return res
      } }
    })
    if (!Object.setPrototypeOf) {
      Object.setPrototypeOf = (opt: {}, proto: any):any => ("__proto__" in opt && ((opt as any).__proto__ = proto), opt)
    }
  } else if (Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
    Promise.resolve || (Promise.resolve = Promise.resolved!)
  }
  Object.defineProperty(StringCls, "includes", { enumerable: false,
    value: function includes(this: string, s: string, pos?: number): boolean {
      // eslint-disable-next-line @typescript-eslint/prefer-includes
      return this.indexOf(s, pos) >= 0
    }
  })
})()
if (!(Build.NDEBUG || BrowserVer.MinMaybeES$Object$$values$and$$entries >= BrowserVer.MinEnsuredES$Array$$Includes)) {
  alert("expect BrowserVer.MinMaybeES$Object$$values$and$$entries >= BrowserVer.MinEnsuredES$Array$$Includes")
}
if (!(Build.NDEBUG || BrowserVer.MinMaybeES$Array$$Includes >= BrowserVer.Min$Array$$find$$findIndex)) {
  alert("expect BrowserVer.MinMaybeES$Array$$Includes >= BrowserVer.Min$Array$$find$$findIndex")
}
if (!(Build.NDEBUG || BrowserVer.BuildMinForOf >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol)) {
  alert("expect BrowserVer.BuildMinForOf >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol")
}
if (!(Build.NDEBUG || BrowserVer.MinAbortController >= BrowserVer.MinUsableScript$type$$module$InExtensions)) {
  alert("expect BrowserVer.MinAbortController >= BrowserVer.MinUsableScript$type$$module$InExtensions")
}
