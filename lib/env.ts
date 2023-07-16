/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
if (Build.BTypes & BrowserType.Chrome && Build.BTypes !== BrowserType.Chrome as number) {
  var browser: unknown;
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6WeakMapAndWeakSet) {
  var WeakSet: WeakSetConstructor | undefined;
  var WeakMap: WeakMapConstructor | undefined;
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
  var Set: SetConstructor | undefined;
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$InputDeviceCapabilities) {
  var InputDeviceCapabilities: InputDeviceCapabilitiesVar | undefined;
}
interface VisualViewport { width?: number; height: number; offsetLeft: number; offsetTop: number;
    pageLeft: number; pageTop: number; scale: number; }
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$visualViewport$
    || Build.BTypes & BrowserType.Edge) {
  var visualViewport: VisualViewport | undefined;
}
if (Build.BTypes & BrowserType.Edge
    || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$queueMicrotask) {
  var queueMicrotask: (callback: (this: void) => void) => void
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$WeakRef
    || Build.BTypes & BrowserType.Firefox) {
  var WeakRef: unknown;
}

var VApi: VApiTy | undefined, VimiumInjector: VimiumInjectorTy | undefined | null

declare var define: any, __filename: string | null | undefined

Build.Inline || (function (): void {
  type ModuleTy = Dict<any> & { __esModule: boolean }
  interface DefineTy {
    (deps: string[], factory: (asyncRequire: () => never, exports: ModuleTy, ...resolved: ModuleTy[]) => any): void
    amd?: boolean
    noConflict (): void
  }
  const oldDefine: DefineTy = typeof define !== "undefined" ? define : void 0
  const modules: Dict<ModuleTy> = {}
  const getName = (name: string): string => name.slice(name.lastIndexOf("/") + 1).replace(".js", "")
  const myDefine: DefineTy = function (this: any, deps, factory): void {
    let filename = __filename
    if (!filename || filename.lastIndexOf("content/", 0) === -1 && filename.lastIndexOf("lib/", 0) === -1) {
      if (!oldDefine) {
        const name = (document.currentScript as HTMLScriptElement).src.split("/")
        const fileName = name[name.length - 1].replace(<RegExpG> /\.js|\.min/g, "")
            .replace(<RegExpG & RegExpSearchable<0>> /\b[a-z]/g, i => i.toUpperCase());
        (window as any)[fileName] = ((factory || deps) as () => any)()
        return
      }
      return oldDefine.apply(this, arguments) // eslint-disable-line @typescript-eslint/no-unsafe-argument
    }
    __filename = null
    const exports = myRequire(filename)
    ; (myDefine as any)[getName(filename)] = exports
    return factory.bind(null, throwOnDynamicImport, exports).apply(null, deps.slice(2).map(myRequire))
  }
  const throwOnDynamicImport = (): never => {
    throw new Error("Must avoid dynamic import in content scripts")
  }
  const myRequire = function (target: string): ModuleTy {
    target = getName(target)
    return modules[target] || (modules[target] = {} as ModuleTy)
  }
  myDefine.amd = true;
  myDefine.noConflict = (): void => {
    if ((window as PartialOf<typeof globalThis, "define">).define !== myDefine) { return }
    (window as PartialOf<typeof globalThis, "define">).define = oldDefine
    if (!oldDefine) { return }
    if (VimiumInjector === null) {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Object$$assign) {
        for (let key in modules) { (oldDefine as any)[key] = modules[key] }
      } else {
        Object.assign(oldDefine, modules)
      }
    }
  }
  (window as PartialOf<typeof globalThis, "__filename">).__filename = undefined;
  (window as PartialOf<typeof globalThis, "define">).define = myDefine
})()
