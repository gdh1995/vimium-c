/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6WeakMapAndWeakSet) {
  var WeakSet: WeakSetConstructor | undefined;
  var WeakMap: WeakMapConstructor | undefined;
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol) {
  var Set: SetConstructor | undefined;
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$InputDeviceCapabilities) {
  var InputDeviceCapabilities: InputDeviceCapabilitiesVar | undefined;
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback) {
  // it's not needed to declare it on Edge: only be used in extend_click[Chrome] and injector
  var requestIdleCallback: RequestIdleCallback | undefined;
}
interface VisualViewport { width?: number; height: number; offsetLeft: number; offsetTop: number;
    pageLeft: number; pageTop: number; scale: number; }
if (Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinEnsured$visualViewport$) {
  var visualViewport: VisualViewport | undefined;
}

var VApi: VApiTy, VimiumInjector: VimiumInjectorTy | undefined | null;
if (Build.BTypes & BrowserType.Chrome && Build.BTypes & ~BrowserType.Chrome) { var browser: unknown; }

