let _a = {
  normalizeKeys_: null as never as (this: void, s: string) => string,
  isKeyReInstalled_: false,
  init_ (): void {
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
    this.normalizeKeys_ = keys => keys.replace(keyLeftRe, func);
    this.normalizeMap_ = this.normalizeMap_.bind(this);
    this.normalizeCmd_ = this.normalizeCmd_.bind(this);
    this.normalizeOptions_ = this.normalizeOptions_.bind(this);
    this.init_ = null as never;
  },
  quoteRe_: <RegExpG & RegExpSearchable<0>> /"/g,
  normalizeOptions_ (str: string, value: string, s2: string | undefined, tail: string): string {
    if (s2) {
      s2 = s2.replace((BG_.Commands as NonNullable<Window["Commands"]>).hexCharRe_
        , (BG_.Commands as NonNullable<Window["Commands"]>).onHex_);
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
    value = value && JSON.stringify(value).replace(this.toHexCharRe_, this.onToHex_);
    return '=' + value + tail;
  },
  optionValueRe_: <RegExpG & RegExpSearchable<3>> /=("(\S*(?:\s[^=]*)?)"|\S+)(\s|$)/g,
  toHexCharRe_: <RegExpG & RegExpSearchable<0>> /\s/g,
  onToHex_ (this: void, s: string): string {
    const hex = s.charCodeAt(0) + 0x100000;
    return "\\u" + hex.toString(16).substring(2);
  },
  normalizeMap_ (_0: string, cmd: string, keys: string, options: string) {
    const keys2 = this.normalizeKeys_(keys);
    if (keys2 !== keys) {
      console.log("KeyMappings Checker:", keys, "is corrected into", keys2);
      keys = keys2;
    }
    options = options ? options.replace(this.optionValueRe_, this.normalizeOptions_) : "";
    return cmd + keys + options;
  },
  normalizeCmd_ (_0: string, cmd: string, name: string, options: string) {
    options = options ? options.replace(this.optionValueRe_, this.normalizeOptions_) : "";
    return cmd + name + options;
  },
  mapKeyRe_: <RegExpG & RegExpSearchable<3>> /(\n[ \t]*#?(?:un)?map\s+)(\S+)([^\n]*)/g,
  cmdKeyRe_: <RegExpG & RegExpSearchable<3>> /(\n[ \t]*#?(?:command|shortcut)\s+)(\S+)([^\n]*)/g,
  wrapLineRe_: <RegExpG & RegExpSearchable<0>> /\\\n/g,
  wrapLineRe2_: <RegExpG & RegExpSearchable<0>> /\\\r/g,
  check_ (string: string): string {
    if (!string) { return string; }
    this.init_ && this.init_();
    if (!this.isKeyReInstalled_) {
      (BG_.Commands as NonNullable<Window["Commands"]>).SetKeyRe_(KeyRe_.source);
      this.isKeyReInstalled_ = true;
    }
    string = "\n" + string.replace(this.wrapLineRe_, '\\\r');
    string = string.replace(this.mapKeyRe_, this.normalizeMap_);
    string = string.replace(this.cmdKeyRe_, this.normalizeCmd_);
    string = string.replace(this.wrapLineRe2_, '\\\n').trim();
    return string;
  },
};
Option_.all_.keyMappings.checker_ = _a;
_a = null as never;

bgSettings_.CONST_.VimiumNewTab_ && (Option_.all_.newTabUrl.checker_ = {
  check_ (value: string): string {
    const url = (<RegExpI>/^\/?pages\/[a-z]+.html\b/i).test(value)
        ? chrome.runtime.getURL(value) : BG_.Utils.convertToUrl_(value.toLowerCase());
    return url.lastIndexOf("http", 0) < 0 && (url in bgSettings_.newTabs_) ? bgSettings_.defaults_.newTabUrl : value;
  }
});

Option_.all_.searchUrl.checker_ = {
  check_ (str: string): string {
    const map = Object.create<Search.RawEngine>(null);
    BG_.Utils.parseSearchEngines_("k:" + str, map);
    const obj = map.k;
    if (obj == null) {
      return bgSettings_.get_("searchUrl", true);
    }
    let str2 = BG_.Utils.convertToUrl_(obj.url, null, Urls.WorkType.KeepAll);
    if (BG_.Utils.lastUrlType_ > Urls.Type.MaxOfInputIsPlainUrl) {
      const err = `The value "${obj.url}" is not a valid plain URL.`;
      console.log("searchUrl checker:", err);
      Option_.all_.searchUrl.showError_(err);
      return bgSettings_.get_("searchUrl", true);
    }
    str2 = str2.replace(BG_.Utils.spacesRe_, "%20");
    if (obj.name && obj.name !== "k") { str2 += " " + obj.name; }
    Option_.all_.searchUrl.showError_("");
    return str2;
  }
};

Option_.all_.vimSync.allowToSave_ = function(): boolean {
  const newlyEnableSyncing = !this.saved_ && this.readValueFromElement_() === true;
  if (newlyEnableSyncing) {
    const arr = Option_.all_;
    let delta = 0;
    for (const i in arr) {
      arr[i as keyof AllowedOptions].saved_ || ++delta;
    }
    let tooMany = delta > 1;
    setTimeout(alert, 100, tooMany ?
`        Error:
Sorry, but you're enabling the "Sync settings" option
    while some other options are also modified.
Please only perform one action at a time!`
      :
`        Warning:
the current settings will be OVERRIDDEN the next time Vimium C starts!
Please back up your settings using the "Export Settings" button
!!!        RIGHT NOW        !!!`
    );
    if (tooMany) {
      return false;
    }
  }
  return true;
};

Option_.all_.keyboard.checker_ = {
  check_ (data: AllowedOptions["keyboard"]): AllowedOptions["keyboard"] {
    if (data == null || data.length !== 2 || !(data[0] > 0 && data[0] < 4000) || !(data[1] > 0 && data[1] < 1000)) {
      return bgSettings_.defaults_.keyboard;
    }
    return [+data[0], data[1]];
  }
};

(function(): void {
  const func = loadChecker, info = (loadChecker as CheckerLoader).info;
  (loadChecker as CheckerLoader).info = "";
  let _ref = $$("[data-check]"), _i: number;
  for (_i = _ref.length; 0 <= --_i; ) {
    const element = _ref[_i];
    element.removeEventListener(element.getAttribute("data-check") || "input", func);
  }

  if (info === "keyMappings") { return ReloadCommands(); }
  Option_.all_.keyMappings.element_.addEventListener("input", ReloadCommands);
  function ReloadCommands(this: HTMLElement | void, event?: Event): void {
    BG_.Commands || BG_.Utils.require_("Commands");
    if (!event) { return; }
    (this as HTMLElement).removeEventListener("input", ReloadCommands);
  }
})();
