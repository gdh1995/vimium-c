declare var define: any

Build.NDEBUG || (function (): void {
  type ModuleTy = Dict<any> & { __esModule: boolean }
  type RequireTy = (target: string) => ModuleTy
  interface DefineTy {
    (deps: string[], factory: (require: RequireTy, exports: ModuleTy) => any): any
    amd?: boolean
    modules_?: Dict<ModuleTy>
  }
  let modules: Dict<ModuleTy> = {}
  const myDefine: DefineTy = (deps, factory): void => {
    const name = (document.currentScript as HTMLScriptElement).src.split("/")
    const filename = name[name.length - 1].replace(".js", "")
    const exports = modules[filename] || (modules[filename] = {} as ModuleTy)
    return (factory || deps as never as typeof factory)(require, exports)
  }
  const require = (target: string): ModuleTy => {
    target = target.replace(<RegExpG> /\.(\/|js)/g, "")
    return modules[target] || (modules[target] = {} as ModuleTy)
  }
  myDefine.amd = true
  myDefine.modules_ = modules;
  (window as any).define = myDefine
})()
