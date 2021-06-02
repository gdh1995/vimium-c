/** limitation: file names must be unique */
// eslint-disable-next-line no-var
var define: any, __filename: string | null | undefined

(function (): void {
  type ModuleTy = Dict<any> & { __esModule?: boolean, __default?: Function }
  type RequireTy = (target: string) => ModuleTy
  type FactoryTy = (require?: RequireTy, exports?: ModuleTy, ...deps: ModuleTy[]) => any
  interface DefineTy {
    (deps: string[], factory: FactoryTy): any
    (factory: FactoryTy): any
    amd: boolean
    modules_?: Dict<ModuleTy>
    noConflict (): void
  }

  const _browser: BrowserType = Build.BTypes && !(Build.BTypes & (Build.BTypes - 1))
      ? Build.BTypes as number
      : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
      : Build.BTypes & BrowserType.Firefox && window.browser ? BrowserType.Firefox
      : BrowserType.Chrome
  const OnChrome: boolean = !(Build.BTypes & ~BrowserType.Chrome)
      || !!(Build.BTypes & BrowserType.Chrome && _browser & BrowserType.Chrome)
  const OnEdge: boolean = !(Build.BTypes & ~BrowserType.Edge)
      || !!(Build.BTypes & BrowserType.Edge && _browser & BrowserType.Edge)
  const navInfo = OnChrome && Build.MinCVer < BrowserVer.MinUsableScript$type$$module$InExtensions
      ? navigator.appVersion.match(<RegExpOne & RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/) : 0 as const
  const navVer = OnChrome && Build.MinCVer < BrowserVer.MinUsableScript$type$$module$InExtensions
      ? navInfo && <BrowserVer> +navInfo[1] || 0 : 0
  const WithModule = OnEdge ? false
      : !OnChrome || Build.MinCVer >= BrowserVer.MinUsableScript$type$$module$InExtensions ? true
      : navVer > BrowserVer.MinUsableScript$type$$module$InExtensions - 1

  const modules: Dict<ModuleTy | ((url: string, exports: ModuleTy) => void)> = {}
  const readyMap: Dict<Promise<1 | void> | 1> = {}
  const fullFeaturedDefine: DefineTy = (rawDepNames: string[] | FactoryTy, rawFactory?: FactoryTy
      ): void | Promise<ModuleTy> => {
    const selfScript = document.currentScript as HTMLScriptElement
    const url = selfScript != null ? selfScript.src
        : __filename!.lastIndexOf("pages/", 0) === 0 ? "/" + __filename : __filename!
    const filename = url.slice(url.lastIndexOf("/") + 1).replace(".js", "")
    if (!Build.NDEBUG && modules[filename]) {
      throw new Error(`module filenames must be unique: duplicated "${filename}"`)
    }
    const isRoot = !readyMap[filename]
    const depNames = typeof rawDepNames !== "function" && rawDepNames || []
    const factory = typeof rawDepNames === "function" ? rawDepNames : rawFactory!
    const depsReady = Promise.all(depNames.map(waitJS.bind(0, url)))
    if (depNames.length === 1 && WithModule) {
      __filename = depNames[0]
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith
        ? filename.indexOf("__loader_", 0) === 0 : filename.startsWith("__loader_")) {
      return depsReady.then(() => depNames.map(myRequire)[0])
    }
    readyMap[filename] = isRoot ? 1 : depsReady.then((): void => {
      readyMap[filename] = 1
    })
    isRoot && depsReady.then((): void => {
      myRequire(url)
    })
    modules[filename] = (_url, exports): void => {
      const args = depNames.map(dep => dep === "require" ? myRequire : dep === "exports" ? exports : myRequire(dep))
      if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
          ? args.indexOf(exports) >= 0 : args.includes!(exports)) {
        factory(... <[RequireTy, ...ModuleTy[]]> args)
      } else {
        const obj = factory(... <[RequireTy, ...ModuleTy[]]> args)
        modules[filename] = !obj ? exports : typeof obj === "function" ? { __default: obj } : obj
      }
    }
  }
  const waitJS = (baseUrl: string, targetFile: string): Promise<1 | void> | 1 => {
    if (targetFile === "require" || targetFile === "exports") { return 1 }
    const filename = targetFile.slice(targetFile.lastIndexOf("/") + 1).replace(".js", "")
    let ready = readyMap[filename]
    if (!ready) {
      const ind = baseUrl.lastIndexOf("/")
      let base = ind > 0 ? baseUrl.slice(0, ind) : ind === 0 ? "" : "."
      let ensuredAbsolute = ind === 0
      let targetPath = targetFile.slice(-3) !== ".js" ? targetFile + ".js" : targetFile, i: number
      while ((i = targetPath.indexOf("/")) >= 0) {
        const folder = targetPath.slice(0, i)
        if (folder === "..") {
          let j = base.lastIndexOf("/")
          base = j > 0 ? base.slice(0, j) : ""
          ensuredAbsolute = !base
        } else if (!folder) {
          base = ""
          targetPath = targetPath.slice(1)
          ensuredAbsolute = true
          break
        } else if (folder !== ".") {
          base = base ? base + "/" + folder : folder
        }
        targetPath = targetPath.slice(i + 1)
      }
      const script = document.createElement("script")
      if (WithModule) {
        __filename = null
        script.type = "module"
        if (OnChrome) {
          script.async = true /** @todo: trace https://bugs.chromium.org/p/chromium/issues/detail?id=717643 */
        }
      }
      script.src = (ensuredAbsolute && base ? "/" : "" ) + base + "/" + targetPath
      ready = new Promise((resolve, reject): void => {
        script.onload = (): void => {
          const newReady = readyMap[filename]
          if (modules[filename] == null) {
            modules[filename] = {}
          }
          resolve(newReady !== ready ? newReady : 1)
        }
        script.onerror = reject
      })
      document.head!.appendChild(script)
      readyMap[filename] = ready
    }
    return ready
  }
  const myRequire = (url: string): ModuleTy => {
    const filename = url.slice(url.lastIndexOf("/") + 1).replace(".js", "")
    let exportsOrFactory = modules[filename]!
    if (typeof exportsOrFactory === "function") {
      const factory = exportsOrFactory
      modules[filename] = exportsOrFactory = {}
      Build.NDEBUG || ((fullFeaturedDefine as any)[filename] = exportsOrFactory)
      factory(url, exportsOrFactory)
      exportsOrFactory = modules[filename]!
    }
    return (exportsOrFactory as ModuleTy).__default as never || exportsOrFactory
  }
  fullFeaturedDefine.amd = true
  if (!Build.NDEBUG) { fullFeaturedDefine.modules_ = modules }
  fullFeaturedDefine.noConflict = (): void => { /* empty */ }
  define = fullFeaturedDefine

  if (OnEdge || OnChrome && !WithModule) {
    addEventListener("DOMContentLoaded", function onNoModule() {
      removeEventListener("DOMContentLoaded", onNoModule, true)
      if (OnChrome && __filename !== undefined) { return }
      const scripts = document.querySelectorAll("script[type=module]") as NodeListOf<HTMLScriptElement>
      if (scripts.length === 0) { return }
      const deps: string[] = [], pathOffset = location.origin.length
      for (let i = 0; i < scripts.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
        deps.push(scripts[i].src.slice(pathOffset))
        scripts[i].remove()
      }
      __filename = "__module_polyfill"
      fullFeaturedDefine(deps, (): void => { /* empty */ })
    }, { once: true })
  }
})()
