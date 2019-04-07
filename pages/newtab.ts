/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
/// <reference path="../types/build/index.d.ts" />
interface LocalStorageEx extends Storage {
  [key: string]: any;
}
(!(Build.BTypes & ~BrowserType.Chrome) ? chrome
  : !(Build.BTypes & ~BrowserType.Firefox) ? browser as typeof chrome
  : window.chrome || browser
).tabs.create({
  url: (localStorage as LocalStorageEx).newTabUrl_f || "about:blank"
});
if (Build.BTypes & ~BrowserType.Firefox) {
  (close as () => {})();
}
if (!(Build.BTypes & ~BrowserType.Firefox)) {
  (browser as typeof chrome).runtime.connect({ name: "vimium-c.999" });
} else if (Build.BTypes & BrowserType.Firefox) {
  setTimeout(function (): void {
    (!(Build.BTypes & ~BrowserType.Chrome) ? chrome
      : !(Build.BTypes & ~BrowserType.Firefox) ? browser as typeof chrome
      : window.chrome || browser
    ).runtime.connect({ name: "vimium-c.999" });
  }, 33);
}
