import { browser_, OnFirefox, post_ } from "./async_bg"
import { bgSettings_, Option_, AllowedOptions, oTrans_ } from "./options_base"
import { kPgReq } from "../background/page_messages"

const keyMappingChecker_ = {
  status_: 0 as const,
  normalizeKeys_: null as never as (this: void, s: string) => string,
  init_ (): void {
    function sortModifiers(option: string): string {
      return option.length < 4 ? option : option.slice(0, -1).split("-").sort().join("-") + "-";
    }
    function func(_0: string, modifiers: string, body: string): string {
      let suffix = ""
      if (body.length > 2 && body[body.length - 2] === ":") {
        suffix = body.slice(-2)
        body = body.slice(0, -2)
      }
      modifiers = modifiers.toLowerCase()
      const isLong = body.length > 1, hasShift = modifiers.includes("s-"), bodyUpper = body.toUpperCase()
      if (!isLong) {
        if (!modifiers) { return _0; }
        if (hasShift && modifiers.length < 3) { return suffix ? `<${bodyUpper}${suffix}>` : bodyUpper }
      }
      // not force a virtual key body lower, since it's only used to search in key mappings;
      // abort any suffix, so that other checks don't need to worry about its mode
      if (modifiers.includes("v-")) { return `<v-${body}>` }
      const bodyLower = body.toLowerCase()
      modifiers = sortModifiers(modifiers)
      body !== bodyLower && !hasShift && (modifiers += "s-")
      // not convert "-" in body to "_", in case of new modifiers in the future
      return modifiers || isLong || suffix ? `<${modifiers}${bodyLower}${suffix}>` : body
    }
    this.normalizeKeys_ = k => k.replace(<RegExpG&RegExpSearchable<2>> /<(?!<)((?:[ACMSVacmsv]-){0,4})(.[^>]*)>/g, func)
    this.init_ = null as never;
  },
  onHex_ (this: void, _s: string, hex: string): string {
    return hex ? "\\u00" + hex : "\\\\";
  },
  normalizeOptions_ (this: void, str: string, value: string, s2: string | undefined, tail: string): string {
    if (s2) {
      s2 = s2.replace(<RegExpGI & RegExpSearchable<1>> /\\(?:x([\da-z]{2})|\\)/gi, keyMappingChecker_.onHex_)
      value = `"${s2}"`;
    } else if (!tail && value === "\\\\") {
      value = "\\";
    }
    let s3 = "";
    if (value.startsWith("{")) {
      value = value.replace(<RegExpG> /([{,] ?)(\w+):/g, '$1"$2":');
      s3 = value;
    }
    value = value.replace(<RegExpG> /\ufffe/g, "")
    const multiLines = value.includes("\x7f")
    try {
      const obj = JSON.parse(multiLines ? value.replace(<RegExpG> /\x7f/g, "") : value)
      if (typeof obj !== "string") {
        return obj !== true ? s3 ? "=" + s3 + tail : str : tail
      }
      value = multiLines ? JSON.parse(value) : obj
    } catch {
      value = multiLines ? (s2 || value) : s2 || value
    }
    value = value && value.replace(<RegExpG & RegExpSearchable<1>> /\\(\\|s)/g, (a, i) => i === "s" ? " " : a)
    value = value && JSON.stringify(value).replace(<RegExpG & RegExpSearchable<0>> /\s/g, keyMappingChecker_.onToHex_)
    value = multiLines ? value : value
    return "=" + value + tail;
  },
  onToHex_ (this: void, s: string): string {
    const hex = s.charCodeAt(0) + 0x100000;
    return "\\u" + hex.toString(16).slice(2);
  },
  normalizeMap_ (this: void, _0: string, prefix: string, cmd: string, keys: string, options: string): string {
    const keys2 = keyMappingChecker_.normalizeKeys_(keys)
    if (keys2 !== keys) {
      console.log("KeyMappings Checker:", keys, "is corrected into", keys2);
      keys = keys2;
    }
    if (cmd.toLowerCase() === "mapkey") {
      const destKeyArr = (<RegExpOne> /^\S+/).exec(options.trimLeft())
      const destKey = destKeyArr && destKeyArr[0]
      const destKey2 = destKey && keyMappingChecker_.normalizeKeys_(destKey)
      if (destKey2 !== destKey) {
        console.log("KeyMappings Checker:", destKey, "is corrected into", destKey2)
        options = options.replace(destKey!, destKey2!) as string
      }
    } else if (!cmd.startsWith("unmap")) {
      const mapped = options.trimLeft().split(<RegExpOne> /\s/, 1)[0]
      if (mapped) {
        const offset = options.indexOf(mapped) + mapped.length
        keys += options.slice(0, offset)
        options = options.slice(offset)
      }
    }
    return keyMappingChecker_.normalizeCmd_("", prefix, keys, options)
  },
  correctMapKey_ (this: void, _0: string, mapA: string, B: string): string {
    return mapA.replace("map", "mapKey") + (B.length === 3 ? B[1] : B)
  },
  normalizeCmd_ (this: void, _0: string, prefix: string, name: string, options: string) {
    if ((<RegExpOne> /\s(createTab|openUrl)/).test(name) && !(<RegExpI> /\surls?=/i).test(options)) {
      options = keyMappingChecker_.convertFromLegacyUrlList_(options)
    }
    options = options ? options.replace(<RegExpG & RegExpSearchable<3>> /=("(\S*(?:\s[^=]*)?)"|\S+)(\s|$)/g,
        keyMappingChecker_.normalizeOptions_) : "";
    return prefix + name + options;
  },
  convertFromLegacyUrlList_ (this: void, options: string): string {
    const urls: string[] = [];
    options = (options + " ").replace(<RegExpG & RegExpSearchable<1>> /\s+(\w+:[^=\s]+|[^\s=]+:\/\/\S+)(?=\s|$)/g,
        (_, url) => (urls.push(url), "")).trimRight();
    const len = urls.length;
    return options + (len > 1 ? " urls=" : len ? " url=" : "") + (len ? JSON.stringify(len > 1 ? urls : urls[0]) : "");
  },
  check_ (str: string): string {
    if (!str) { return str; }
    this.init_ && this.init_();
    str = str.replace(<RegExpG & RegExpSearchable<0>> /\\(?:\n|\\\n\s*)/g, s => s[1] === "\n" ? "\x7f" : "\xff")
    str = str.replace(<RegExpG & RegExpSearchable<3>
        >/^([ \t]*(?:#\s?)?map\s+(?:<(?!<)(?:.-){0,4}.[\w:]*?>|\S)\s+)(<(?!<)(?:[ACMSVacmsv]-){0,4}.\w*?>|\S)(?=\s|$)/gm
        , this.correctMapKey_);
    str = str.replace(<RegExpSearchable<4>> /^([ \t]*(?:#\s?)?(map(?:[kK]ey|!)?|run!?|unmap!?)\s+)(\S+)([^\n]*)/gm
        , this.normalizeMap_);
    str = str.replace(<RegExpG & RegExpSearchable<3>> /^([ \t]*(?:#\s?)?(?:command|shortcut)\s+)(\S+)([^\n]*)/gm,
        this.normalizeCmd_);
    str = str.replace(<RegExpG & RegExpSearchable<0>> /[\x7f\xff]/g, s => s === "\x7f" ? "\\\n" : "\\\\\n  ").trim()
    return str;
  }
};
Option_.all_.keyMappings.checker_ = keyMappingChecker_;

Option_.all_.searchUrl.checker_ = {
  status_: 0,
  check_: (str): Promise<string> => post_(kPgReq.checkSearchUrl, str).then((obj): string | Promise<string> => {
    const opt = Option_.all_.searchUrl
    if (obj == null) {
      return opt.innerFetch_()
    }
    let str2 = obj[1]
    if (!obj[0]) {
      const err = oTrans_("nonPlainURL", [str2]);
      console.log("searchUrl checker:", err);
      opt.showError_(err)
      return opt.innerFetch_()
    }
    opt.showError_("")
    return str2;
  })
};

Option_.all_.newTabUrl.checker_ = {
  status_: 0,
  check_: (value): Promise<string> => post_(kPgReq.checkNewTabUrl, (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(value)
      ? browser_.runtime.getURL(value) : value.toLowerCase()).then(([url, type]): string => {
    url = url.split("?", 1)[0].split("#", 1)[0]
    if (OnFirefox) {
      let err = ""
      if ((<RegExpI> /^chrome|^(javascript|data|file):|^about:(?!(newtab|blank)\/?$)/i).test(url)) {
        err = oTrans_("refusedURLs", [url])
        console.log("newTabUrl checker:", err)
      }
      Option_.all_.newTabUrl.showError_(err)
    }
    return !value.startsWith("http") && (type === Urls.NewTabType.browser
      || (<RegExpI> /^(?!http|s?ftp)[a-z\-]+:\/?\/?newtab\b\/?/i).test(value)
      ) ? bgSettings_.defaults_.newTabUrl : value
  })
}

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
  check_ (data): SettingsNS.FrontendSettings["keyboard"] {
    if (data == null || data.length < 2
        || !(data[0] > 0 && data[0] < 4000) || !(data[1] > 0 && data[1] < 1000)) {
      return bgSettings_.defaults_.keyboard;
    }
    return ([+data[0], +data[1]] as SettingsNS.FrontendSettings["keyboard"]).concat(data.slice(2)
        ) as SettingsNS.FrontendSettings["keyboard"]
  }
};
