/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
/// <reference path="../types/build/index.d.ts" />
interface LocalStorageEx extends Storage {
  [key: string]: any;
}
(!(Build.BTypes & ~BrowserType.Chrome) ? chrome
  : !(Build.BTypes & ~BrowserType.Firefox) ? browser as typeof chrome
  : window.chrome || browser as typeof chrome
).tabs.create({
  url: (localStorage as LocalStorageEx).newTabUrl_f || "about:blank"
});
if (Build.BTypes & ~BrowserType.Firefox) {
  (close as () => {})();
}
if (!(Build.BTypes & ~BrowserType.Firefox)) {
  (browser as typeof chrome).runtime.connect({ name: PortNameEnum.Prefix + PortType.CloseSelf });
} else if (Build.BTypes & BrowserType.Firefox) {
  setTimeout(function (): void {
    (!(Build.BTypes & ~BrowserType.Chrome) ? chrome
      : !(Build.BTypes & ~BrowserType.Firefox) ? browser as typeof chrome
      : window.chrome || browser as typeof chrome
    ).runtime.connect({ name: PortNameEnum.Prefix + PortType.CloseSelf });
  }, 33);
}
