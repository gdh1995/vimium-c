Option.all.keyMappings.checker = {
  normalizeKeys: null as never as (this: void, s: string) => string,
  isKeyReInstalled: false,
  init (): void {
    const keyLeftRe = <RegExpG & RegExpSearchable<2>> /<(?!<)((?:[acmACM]-){0,3})(.[^>]*)>/g,
    lowerRe = <RegExpOne> /[a-z]/;
    function sortModifiers(option: string) {
      return option.length < 4 ? option : option.length > 4 ? "a-c-m-"
        : option === "c-a-" ? "a-c-" : option === "m-a-" ? "a-m-"
        : option === "m-c-" ? "c-m-" : option;
    }
    function func(_0: string, option: string, key: string): string {
      return `${option ? `<${sortModifiers(option.toLowerCase())}` : "<"}
        ${key.length > 1 && lowerRe.test(key) ? key.toLowerCase() : key}>`;
    }
    this.normalizeKeys = function(keys) { return keys.replace(keyLeftRe, func); };
    this.normalizeMap = this.normalizeMap.bind(this);
    this.normalizeOptions = this.normalizeOptions.bind(this);
    this.init = null as never;
    BG.Utils.require("Commands");
  },
  quoteRe: <RegExpG & RegExpSearchable<0>> /"/g,
  normalizeOptions (str: string, value: string, s2: string | undefined, tail: string): string {
    if (s2) {
      s2 = s2.replace(BG.Commands.hexCharRe, BG.Commands.onHex);
      value = `"${s2}"`;
    }
    try {
      let obj = JSON.parse(value);
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
    if (!this.isKeyReInstalled) {
      BG.Commands.setKeyRe(KeyRe.source);
      this.isKeyReInstalled = true;
    }
    string = "\n" + string.replace(this.wrapLineRe, '\\\r');
    string = string.replace(this.mapKeyRe, this.normalizeMap);
    string = string.replace(this.wrapLineRe2, '\\\n').trim();
    return string;
  },
} as Checker<"keyMappings">;
(Option.all.keyMappings.checker as Checker<"keyMappings">).init();

(function() {
  var func = loadChecker, _ref, _i, element;
  _ref = document.querySelectorAll("[data-check]");
  for (_i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.removeEventListener(element.getAttribute("data-check") || "input", func);
  }
})();
