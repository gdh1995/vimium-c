let _a = {
  normalizeKeys: null as never as (this: void, s: string) => string,
  isKeyReInstalled: false,
  init (): void {
    const keyLeftRe = <RegExpG & RegExpSearchable<2>> /<(?!<)((?:[ACMSacms]-){0,4})(.[^>]*)>/g,
    lowerRe = <RegExpOne> /[a-z]/;
    function sortModifiers(option: string) {
      return option.length < 4 ? option : option.length > 4 ? "a-c-m-"
        : option === "c-a-" ? "a-c-" : option === "m-a-" ? "a-m-"
        : option === "m-c-" ? "c-m-" : option;
    }
    function func(_0: string, option: string, key: string): string {
      option = option.toLowerCase();
      const forceUpper = option.indexOf("s-") >= 0;
      if (forceUpper && option.length === 2 && key.length === 1) {
        return key.toUpperCase();
      }
      return (option ? "<" + sortModifiers(forceUpper ? option.replace("s-", "") : option) : "<") +
        (forceUpper ? key.toUpperCase() : key.length > 1 && lowerRe.test(key) ? key.toLowerCase() : key) + ">";
    }
    this.normalizeKeys = function(keys) { return keys.replace(keyLeftRe, func); };
    this.normalizeMap = this.normalizeMap.bind(this);
    this.normalizeOptions = this.normalizeOptions.bind(this);
    this.init = null as never;
  },
  quoteRe: <RegExpG & RegExpSearchable<0>> /"/g,
  normalizeOptions (str: string, value: string, s2: string | undefined, tail: string): string {
    if (s2) {
      s2 = s2.replace(BG.Commands.hexCharRe, BG.Commands.onHex);
      value = `"${s2}"`;
    }
    try {
      const obj = JSON.parse(value);
      if (typeof obj !== "string") {
        return obj !== true ? str : "";
      }
      value = obj;
    } catch (e) {
      s2 && (value = s2);
    }
    value = value && JSON.stringify(value).replace(this.toHexCharRe, this.onToHex);
    return '=' + value + tail;
  },
  optionValueRe: <RegExpG & RegExpSearchable<3>> /=("(\S*(?:\s[^=]*)?)"|\S+)(\s|$)/g,
  toHexCharRe: <RegExpG & RegExpSearchable<0>> /\s/g,
  onToHex (this: void, s: string): string {
    const hex = s.charCodeAt(0) + 0x100000;
    return "\\u" + hex.toString(16).substring(2);
  },
  normalizeMap (_0: string, cmd: string, keys: string, options: string) {
    const keys2 = this.normalizeKeys(keys);
    if (keys2 !== keys) {
      console.log("KeyMappings Checker:", keys, "is corrected into", keys2);
    }
    options = options ? options.replace(this.optionValueRe, this.normalizeOptions) : "";
    return cmd + keys2 + options;
  },
  mapKeyRe: <RegExpG & RegExpSearchable<3>> /(\n[ \t]*(?:un)?map\s+)(\S+)([^\n]*)/g,
  wrapLineRe: <RegExpG & RegExpSearchable<0>> /\\\n/g,
  wrapLineRe2: <RegExpG & RegExpSearchable<0>> /\\\r/g,
  check (string: string): string {
    if (!string) { return string; }
    this.init && this.init();
    if (!this.isKeyReInstalled) {
      BG.Commands.setKeyRe(KeyRe.source);
      this.isKeyReInstalled = true;
    }
    string = "\n" + string.replace(this.wrapLineRe, '\\\r');
    string = string.replace(this.mapKeyRe, this.normalizeMap);
    string = string.replace(this.wrapLineRe2, '\\\n').trim();
    return string;
  },
};
Option.all.keyMappings.checker = _a;
_a = null as never;

Option.all.newTabUrl.checker = {
  overriddenNewTab: "",
  customNewTab: "",
  init (): void {
    const manifest = chrome.runtime.getManifest();
    let url = manifest.chrome_url_overrides && manifest.chrome_url_overrides.newtab || "";
    if (url) {
      this.overriddenNewTab = chrome.runtime.getURL(url);
    }
    if (url = bgSettings.CONST.VimiumNewTab) {
      this.customNewTab = chrome.runtime.getURL(url);
    }
    this.init = null as never;
  },
  check (value: string): string {
    const url = (<RegExpI>/^\/?pages\/[a-z]+.html\b/i).test(value)
        ? chrome.runtime.getURL(value) : BG.Utils.convertToUrl(value.toLowerCase());
    if (url.lastIndexOf("http", 0) === 0) { return value; }
    this.init && this.init();
    if (!this.overriddenNewTab) {
      return url === this.customNewTab ? bgSettings.CONST.BrowserNewTab : value;
    }
    if (url === this.overriddenNewTab || url === bgSettings.CONST.BrowserNewTab ||
        url === this.customNewTab || url === bgSettings.CONST.BrowserNewTab2) {
      return bgSettings.CONST.ChromeInnerNewTab;
    }
    return value;
  }
} as Checker<"newTabUrl"> & {
  overriddenNewTab: string;
  customNewTab: string;
};

Option.all.searchUrl.checker = {
  check (str: string): string {
    const map = Object.create<Search.RawEngine>(null);
    BG.Utils.parseSearchEngines("k:" + str, map);
    const obj = map.k;
    if (obj == null) {
      return bgSettings.get("searchUrl", true);
    }
    let str2 = BG.Utils.convertToUrl(obj.url, null, Urls.WorkType.KeepAll);
    if (BG.Utils.lastUrlType > Urls.Type.MaxOfInputIsPlainUrl) {
      console.log(`searchUrl checker: "${obj.url}" is not a valid plain url.`);
      return bgSettings.get("searchUrl", true);
    }
    str2 = str2.replace(BG.Utils.spacesRe, "%20");
    if (obj.name) { str2 += " " + obj.name; }
    return str2;
  }
};

Option.all.vimSync.checker = {
  check (willSync: boolean): boolean {
    if (willSync) {
      setTimeout(alert, 100, "Warning: the current settings will be OVERRIDDEN the next time Vimium++ starts!\n"
        + 'Please back up your settings using the "Export Settings" button RIGHT NOW!');
    }
    return willSync;
  }
};

(function(): void {
  const func = loadChecker, info = (loadChecker as CheckerLoader).info;
  (loadChecker as CheckerLoader).info = "";
  let _ref = document.querySelectorAll("[data-check]"), _i: number;
  for (_i = _ref.length; 0 <= --_i; ) {
    const element = _ref[_i];
    element.removeEventListener(element.getAttribute("data-check") || "input", func);
  }

  if (info === "keyMappings") { return ReloadCommands(); }
  Option.all.keyMappings.element.addEventListener("input", ReloadCommands);
  function ReloadCommands(this: HTMLElement | void, event?: Event): void {
    BG.Utils.require("Commands");
    if (!event) { return; }
    (this as HTMLElement).removeEventListener("input", ReloadCommands);
  }
})();
