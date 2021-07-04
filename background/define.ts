declare var define: any, __filename: string | null | undefined // eslint-disable-line no-var

if (Build.BTypes & (Build.BTypes & BrowserType.ChromeOrFirefox | BrowserType.Edge)
    && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer < BrowserVer.Min$globalThis)
    && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer < FirefoxBrowserVer.Min$globalThis)
    && typeof globalThis === "undefined") {
  (window as any as Writable<typeof globalThis>).globalThis = window as any
}

globalThis.Backend_ = null as never
globalThis.__filename = null
if (!Build.NDEBUG) {
  globalThis.As_ = <T> (i: T): T => i
  globalThis.AsC_ = <T extends kCName> (i: T): T => i
}

(function (): void {
  type ModuleTy = Dict<any> & { __esModule?: boolean }
  type LoadingPromise = Promise<void> & { __esModule?: ModuleTy }
  type AsyncRequireTy = (target: [string], resolve: (exports: ModuleTy) => void, reject?: (msg: any) => void) => void
  type FactoryTy = (asyncRequire: AsyncRequireTy, exports: ModuleTy, ...deps: ModuleTy[]) => (() => any) | void
  interface DefineTy {
    (deps: string[], factory: FactoryTy): void
    amd?: boolean
    modules_?: Dict<any>
  }
  const modules: Dict<ModuleTy | LoadingPromise> = {}
  const getName = (name: string): string => name.slice(name.lastIndexOf("/") + 1).replace(".js", "")
  const myDefine: DefineTy = (depNames, factory): void => {
    const name = getName(__filename || (document.currentScript as HTMLScriptElement).src)
    let exports = modules[name]
    if (!(Build.NDEBUG || !exports || !exports.__esModule || exports instanceof Promise)) {
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
    const obj = factory.bind(null, doImport, exports).apply(null, depNames.slice(2).map(myRequire))
    if (!(Build.NDEBUG || !obj)) {
      throw new Error("Unexpected return-style module")
    }
    if (!Build.NDEBUG) { (myDefine as any)[name] = exports }
  }
  const myRequire = (name: string): ModuleTy => {
    name = getName(name)
    let exports = modules[name]
    exports = !exports ? modules[name] = {}
        : exports instanceof Promise ? exports.__esModule || (exports.__esModule = {}) : exports
    return exports
  }
  const doImport: AsyncRequireTy = ([path], callback): void => {
    const name = getName(path)
    const exports = modules[name] || (modules[name] = new Promise((resolve, reject): void => {
      const script = document.createElement("script")
      script.src = path
      script.onload = (): void => {
        if (!(Build.NDEBUG || modules[name] !== exports)) {
          throw new Error(`The module "${name}" didn't call define()!`)
        }
        resolve()
        script.remove()
      }
      if (!Build.NDEBUG) { script.onerror = (ev): void => {
        reject(ev.message)
        setTimeout((): void => { modules[name] = void 0 }, 1)
      } }
      document.head!.appendChild(script)
    }))
    exports instanceof Promise ? void exports.then(() => { doImport([path], callback) }) : callback(exports)
  }
  myDefine.amd = true
  globalThis.define = myDefine;
  (globalThis as any).__importStar = (obj: {}): {} => obj
})()

Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes &&
![].includes && (function (): void {
    const noArrayFind = ![].find
    Array.prototype.includes = function (value: any, ind?: number): boolean { return this.indexOf(value, ind) >= 0 }
    if (!(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Array$$find$$findIndex)) { return }
    if (noArrayFind) {
      Array.prototype.find = function (this: any[], cond: (i: any, index: number, obj: any[]) => boolean): any {
        const ind = this.findIndex(cond)
        return ind >= 0 ? this[ind] : undefined
      }
      Array.prototype.findIndex = function (this: any[], cond: (i: any, index: number, obj: any[]) => boolean): any {
        for (let i = 0; i < this.length; i++) { if (cond(this[i], i, this)) { return i } }
        return -1
      }
    }
    if (Build.MinCVer >= BrowserVer.MinSafe$String$$StartsWith || "".includes) { return }
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
    if (Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) { return }
    const ver = navigator.appVersion.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
    if (ver && +ver[1] < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
      const proto = {
        add (k: string): any { this.map_[k] = 1 },
        clear (): void { this.map_ = Object.create(null) },
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
        this.map_ = Object.create(null)
        this.isSet_ = 1
      } as any;
      globalThis.Map = function (this: SimulatedMap): any {
        setProto(this)
        this.map_ = Object.create(null)
        this.isSet_ = 0
      } as any
    }
})()
