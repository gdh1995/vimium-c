declare var define: any, __filename: string | null | undefined // eslint-disable-line no-var
declare var __moduleMap: Dict<unknown> | undefined

if (Build.BTypes & (Build.BTypes & BrowserType.ChromeOrFirefox | BrowserType.Edge)
    && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer < BrowserVer.Min$globalThis)
    && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer < FirefoxBrowserVer.Min$globalThis)
    && typeof globalThis === "undefined") {
  // @ts-ignore
  (window as any as Writable<typeof globalThis>).globalThis = window as any
}

globalThis.__filename = null
; (function (): void {
  type ModuleTy = Dict<any> & { __esModule?: boolean }
  type LoadingPromise = Promise<void> & { __esModule?: ModuleTy }
  type AsyncRequireTy = (target: [string], resolve: (exports: ModuleTy) => void, reject?: (msg: any) => void) => void
  type FactoryTy = (asyncRequire: AsyncRequireTy, exports: ModuleTy, ...deps: ModuleTy[]) => (() => any) | void
  interface DefineTy {
    (deps: string[], factory: FactoryTy): void
  }
  const modules: Dict<ModuleTy | LoadingPromise> = {}
  const getName = (name: string): string => name.slice(name.lastIndexOf("/") + 1).replace(".js", "")
  const kInSW = !!Build.MV3 && Build.BTypes !== BrowserType.Firefox as number
  const myDefine: DefineTy = (depNames, factory): void => {
    // @ts-ignore
    const name = getName(__filename || ((document as HTMLDocument).currentScript as HTMLScriptElement).src)
    let exports = modules[name]
    if (!(Build.NDEBUG || !exports || !exports.__esModule || !kInSW && exports instanceof Promise)) {
      throw new Error(`module filenames must be unique: duplicated "${name}"`)
    }
    if (!kInSW && exports && exports instanceof Promise) {
      const promise: LoadingPromise = exports.then((): void => {
        modules[name] = exports
        _innerDefine(name, depNames, factory, exports as {})
      })
      exports = promise.__esModule = exports.__esModule || {}
      modules[name] = promise
    } else {
      _innerDefine(name, depNames, factory, exports as Exclude<typeof exports, Promise<any>> || (modules[name] = {}))
    }
  }
  const _innerDefine = (name: string, depNames: string[], factory: FactoryTy, exports: ModuleTy): void => {
    const obj = factory.bind(null, kInSW ? null as never : doImport, exports
        ).apply(null, depNames.slice(2).map(myRequire))
    if (!(Build.NDEBUG || !obj)) {
      throw new Error("Unexpected return-style module")
    }
    if (!(Build.NDEBUG && Build.Inline && Build.Mangle)) { (myDefine as any)[name] = exports }
  }
  const myRequire = (name: string): ModuleTy => {
    name = getName(name)
    let exports = modules[name]
    exports = !exports ? modules[name] = {}
        : !kInSW && exports instanceof Promise ? exports.__esModule || (exports.__esModule = {})
        : exports as Exclude<typeof exports, Promise<any>>
    return exports
  }
  const doImport: AsyncRequireTy = ([path], callback): void => {
    const name = getName(path)
    const exports = modules[name] || (modules[name] = new Promise((resolve, reject): void => {
      // @ts-ignore
      const doc = document as HTMLDocument
      const script = doc.createElement("script")
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
      (doc.body || doc.documentElement)!.appendChild(script)
    }))
    exports instanceof Promise ? void exports.then(() => { doImport([path], callback) }) : callback(exports)
  }
  if (kInSW) { globalThis.__moduleMap = modules }
  if (!Build.NDEBUG) { (globalThis as any).__importStar = (obj: {}): {} => obj }
  globalThis.define = myDefine;
})()

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES$Object$$values$and$$entries
    && !Object.entries) {
  Object.entries = <T extends string> (object: object): [T, unknown][] => {
    const entries: ReturnType<ObjectConstructor["entries"]> = []
    for (const name of Object.keys(object)) { entries.push([name, (object as Dict<unknown>)[name]]) }
    return entries as [T, unknown][]
  }
  Object.values || (Object.values = <T extends object> (object: T): Array<T[keyof T]> => {
    const entries: unknown[] = []
    for (const name of Object.keys(object)) { entries.push((object as Dict<unknown>)[name]) }
    return entries as Array<T[keyof T]>
  })
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Object$$assign) {
    Object.assign || (Object.assign = function (dest: object): object {
      for (let i = 1, len = arguments.length; i < len; i++) {
        const src = arguments[i]
        if (!src) { continue }
        for (let key in src) { (dest as Dict<unknown>)[key] = src[key] }
      }
      return dest
    })
  }
}

Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES$Array$$Includes &&
![].includes && (function (): void {
    const noArrayFind = ![].find
  Object.defineProperty(Array.prototype, "includes", { enumerable: false,
    value: function includes(this: any[], value: any, ind?: number): boolean { return this.indexOf(value, ind) >= 0 }
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
      } },
    })
    } else if (Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
      Promise.resolve || (Promise.resolve = Promise.resolved!)
    }
  Object.defineProperty(StringCls, "includes", { enumerable: false,
    value: function myIncludes(this: string, s: string, pos?: number): boolean {
      // eslint-disable-next-line @typescript-eslint/prefer-includes
      return this.indexOf(s, pos) >= 0
    }
  })
    if (Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) { return }
    const ver = navigator.userAgent!.match(<RegExpOne> /\bChrom(?:e|ium)\/(\d+)/)
    if (ver && +ver[1] < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
      const proto = {
        add (k: string): any { const old = k in this.map_; old || (this.map_[k] = 1, this.size++); return this },
        clear (): void { this.map_ = Object.create(null); this.size = 0 },
        delete (k: string): boolean { const o = k in this.map_; o && (delete this.map_[k], this.size--); return o },
        forEach (cb): any {
          const isSet = this.isSet_, map = this.map_
          for (let key in map) {
            isSet ? (cb as (value: string) => void)(key) : cb(map[key], key)
          }
        },
        get (k: string): any { return this.map_[k] },
        has (k: string): boolean { return k in this.map_ },
        set (k: string, v: any): any { const old = k in this.map_; this.map_[k] = v; old || this.size++; return this }
      } as Writable<SimulatedMap>
      const setProto = (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
          ? Object.setPrototypeOf || ((obj: SimulatedMap): void => { (obj as any).__proto__ = proto })
          : Object.setPrototypeOf) as (obj: SimulatedMap, newProto: any) => void
      type SimulatedMapCtor = (this: SimulatedMap, arr?: any[]) => any;
      globalThis.Set = function (arr?: string[]) {
        ; (Map as any as SimulatedMapCtor).call(this)
        this.isSet_ = 1
        for (let i = 0, end = arr ? arr.length : 0; i < end; i++) {
          this.add(arr![i])
        }
      } satisfies SimulatedMapCtor as any;
      globalThis.Map = function (arr?: [string, any][]): any {
        setProto(this, proto)
        this.map_ = Object.create(null)
        ; (this.size satisfies number) = 0
        this.isSet_ = 0
        for (let i = 0, end = arr ? arr.length : 0; i < end; i++) {
          this.set(arr![i][0], arr![i][1])
        }
      } satisfies SimulatedMapCtor as any
    }
})()

Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES2017AsyncFunctions &&
((): void => {
  interface YieldedValue { 42: true }
  /** no .trys, so unexpected try/catch whould make it throw as soon as possible */
  interface YieldedPos { label_: number; sent_ (): YieldedValue | undefined }
  type YieldableFunc = (pos: YieldedPos) => [/** step */ number, /** returned */ YieldedValue?]

  const __myAwaiter = Build.MinCVer < BrowserVer.MinEnsuredGeneratorFunction
  ? (branchedFunc: () => YieldableFunc): Promise<any> => new Promise<any> ((resolve): void => {
    const resolveVoid = resolve.bind(0, void 0)
    const generator = branchedFunc()
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
      ): Promise<TReturn | void> => new Promise<TReturn | void> ((resolve): void => {
    const resolveVoid = Build.MinCVer < BrowserVer.MinTestedES6Environment ? resolve.bind(0, void 0) : () => resolve()
    const generator = generatorFunction()
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
      , func_to_await: Function): Promise<YieldedValue> => __myAwaiter(func_to_await as any)

})()
