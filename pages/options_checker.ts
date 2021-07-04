import { BG_, bgSettings_, $$, asyncBackend_ } from "./async_bg"
import { Option_, AllowedOptions, KnownOptionsDataset, oTrans_ } from "./options_base"
import { loadChecker } from "./options_wnd"

let keyMappingChecker_ = {
  status_: 0 as const,
  normalizeKeys_: null as never as (this: void, s: string) => string,
  init_ (): void {
    function sortModifiers(option: string): string {
      return option.length < 4 ? option : option.slice(0, -1).split("-").sort().join("-") + "-";
    }
    function func(_0: string, oldModifiers: string, body: string): string {
      let suffix = ""
      if (body.length > 2 && body[body.length - 2] === ":") {
        suffix = body.slice(-2)
        body = body.slice(0, -2)
      }
      let modifiers = oldModifiers.toLowerCase();
      const isLong = body.length > 1, hasShift = modifiers.includes("s-"), bodyUpper = body.toUpperCase()
      if (!isLong) {
        if (!modifiers) { return _0; }
        if (hasShift && modifiers.length < 3) { return suffix ? `<${bodyUpper}${suffix}>` : bodyUpper }
      }
      const bodyLower = body.toLowerCase()
      modifiers = modifiers.includes("v-") ? "v-" : sortModifiers(modifiers)
      body !== bodyLower && !hasShift && (modifiers += "s-")
      // not convert "-" in body to "_", in case of new modifiers in the future
      return modifiers || isLong || suffix ? `<${modifiers}${bodyLower}${suffix}>` : body
    }
    this.normalizeKeys_ = k => k.replace(<RegExpG&RegExpSearchable<2>> /<(?!<)((?:[ACMSVacmsv]-){0,4})(.[^>]*)>/g, func)
    this.normalizeMap_ = this.normalizeMap_.bind(this);
    this.normalizeCmd_ = this.normalizeCmd_.bind(this);
    this.normalizeOptions_ = this.normalizeOptions_.bind(this);
    this.init_ = null as never;
  },
  onHex_ (this: void, _s: string, hex: string): string {
    return hex ? "\\u00" + hex : "\\\\";
  },
  normalizeOptions_ (str: string, value: string, s2: string | undefined, tail: string): string {
    if (s2) {
      s2 = s2.replace(<RegExpGI & RegExpSearchable<1>> /\\(?:x([\da-z]{2})|\\)/gi, this.onHex_);
      value = `"${s2}"`;
    } else if (!tail && value === "\\\\") {
      value = "\\";
    }
    let s3 = "";
    if (value.startsWith("{")) {
      value = value.replace(<RegExpG> /([{,] ?)(\w+):/g, '$1"$2":');
      s3 = value;
    }
    try {
      const obj = JSON.parse(value);
      if (typeof obj !== "string") {
        return obj !== true ? s3 ? "=" + s3 + tail : str : "";
      }
      value = obj;
    } catch {
      s2 && (value = s2);
    }
    value = value && value.replace(<RegExpG & RegExpSearchable<1>> /\\(\\|s)/g, (_, i) => i === "s" ? " " : _);
    value = value && JSON.stringify(value).replace(<RegExpG & RegExpSearchable<0>> /\s/g, this.onToHex_);
    return "=" + value + tail;
  },
  onToHex_ (this: void, s: string): string {
    const hex = s.charCodeAt(0) + 0x100000;
    return "\\u" + hex.toString(16).slice(2);
  },
  normalizeMap_ (_0: string, cmd: string, keys: string, options: string): string {
    const keys2 = this.normalizeKeys_(keys);
    if (keys2 !== keys) {
      console.log("KeyMappings Checker:", keys, "is corrected into", keys2);
      keys = keys2;
    }
    if (cmd.replace("#", "").trim().toLowerCase() === "mapkey") {
      const destKeyArr = options.match(<RegExpOne> /^\s*\S+/)
      let destKey = destKeyArr && destKeyArr[0].trim()
      const destKey2 = destKey && this.normalizeKeys_(destKey)
      if (destKey2 !== destKey) {
        console.log("KeyMappings Checker:", destKey, "is corrected into", destKey2)
        options = options.replace(destKey!, destKey2!) as string
      }
    }
    return this.normalizeCmd_("", cmd, keys, options);
  },
  correctMapKey_ (_0: string, mapA: string, B: string): string {
    return mapA.replace("map", "mapKey") + (B.length === 3 ? B[1] : B)
  },
  normalizeCmd_ (_0: string, cmd: string, name: string, options: string) {
    if ((options.includes("createTab") || options.includes("openUrl"))
        && (<RegExpOne> /^\s+(createTab|openUrl)\s/).test(options)
        && !(<RegExpI> /\surls?=/i).test(options)) {
      options = this.convertFromLegacyUrlList_(options);
    }
    options = options ? options.replace(<RegExpG & RegExpSearchable<3>> /=("(\S*(?:\s[^=]*)?)"|\S+)(\s|$)/g,
        this.normalizeOptions_) : "";
    return cmd + name + options;
  },
  convertFromLegacyUrlList_ (this: void, options: string): string {
    const urls: string[] = [];
    options = (options + " ").replace(<RegExpG & RegExpSearchable<1>> /\s(\w+:[^=\s]+|[^\s=]+:\/\/\S+)(?=\s|$)/g,
        (_, url) => (urls.push(url), "")).trimRight();
    const len = urls.length;
    return options + (len > 1 ? " urls=" : len ? " url=" : "") + (len ? JSON.stringify(len > 1 ? urls : urls[0]) : "");
  },
  check_ (str: string): string {
    if (!str) { return str; }
    this.init_ && this.init_();
    str = str.replace(<RegExpG & RegExpSearchable<0>> /\\\\?\n/g, i => i.length === 3 ? i : "\\\r")
    str = str.replace(<RegExpG & RegExpSearchable<3>
        > /^([ \t]*(?:#\s?)?map\s+(?:<(?!<)(?:.-){0,4}.[\w:]*?>|\S)\s+)(<(?!<)(?:[ACMSVacmsv]-){0,4}.\w*?>)(?=\s|$)/gm
        , this.correctMapKey_);
    str = str.replace(<RegExpG & RegExpSearchable<3>> /^([ \t]*(?:#\s?)?(?:un)?map(?:[kK]ey)?\s+)(\S+)([^\n]*)/gm
        , this.normalizeMap_);
    str = str.replace(<RegExpG & RegExpSearchable<3>> /^([ \t]*(?:#\s?)?(?:command|shortcut)\s+)(\S+)([^\n]*)/gm,
        this.normalizeCmd_);
    str = str.replace(<RegExpG & RegExpSearchable<0>> /\\\r/g, "\\\n").trim();
    return str;
  }
};
Option_.all_.keyMappings.checker_ = keyMappingChecker_;
keyMappingChecker_ = null as never;

Option_.all_.searchUrl.checker_ = {
  status_: 0,
  check_ (str): string {
    const map = new (BG_ as unknown as typeof globalThis).Map<string, Search.RawEngine>()
    const opt = Option_.all_.searchUrl
    asyncBackend_.parseSearchEngines_("k:" + str, map)
    const obj = map.get("k")
    if (obj == null) {
      return opt.innerFetch_()
    }
    let str2 = asyncBackend_.convertToUrl_(obj.url_, null, Urls.WorkType.KeepAll)
    if (asyncBackend_.lastUrlType_() > Urls.Type.MaxOfInputIsPlainUrl) {
      const err = oTrans_("nonPlainURL", [obj.url_]);
      console.log("searchUrl checker:", err);
      opt.showError_(err)
      return opt.innerFetch_()
    }
    str2 = str2.replace(<RegExpG> /\s+/g, "%20")
    if (obj.name_ && obj.name_ !== "k") { str2 += " " + obj.name_; }
    opt.showError_("")
    return str2;
  }
};

Option_.all_.vimSync.allowToSave_ = function (): boolean {
  const newlyEnableSyncing = !this.saved_ && this.readValueFromElement_() === true;
  if (newlyEnableSyncing) {
    const arr = Option_.all_;
    let delta = 0;
    for (const i in arr) {
      arr[i as keyof AllowedOptions].saved_ || ++delta;
    }
    let tooMany = delta > 1;
    setTimeout(alert, 100, oTrans_(tooMany ? "changedBeforeSync" : "warningForSync"));
    if (tooMany) {
      return false;
    }
  }
  return true;
};

Option_.all_.keyboard.checker_ = {
  status_: 0,
  check_ (data) {
    if (data == null || data.length !== 2 || !(data[0] > 0 && data[0] < 4000) || !(data[1] > 0 && data[1] < 1000)) {
      return bgSettings_.defaults_.keyboard;
    }
    return [+data[0], data[1]];
  }
};

for (const element of $$("[data-check]")) {
    element.removeEventListener((element.dataset as KnownOptionsDataset).check || "input", loadChecker)
}
