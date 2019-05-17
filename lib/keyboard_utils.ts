var VKey = {
  keyNames_: ["space", "pageup", "pagedown", "end", "home", "left", "up", "right", "down"] as ReadonlyArray<string>,
  correctionMap_: {
    __proto__: null as never,
    0: ";:", 1: "=+", 2: ",<", 3: "-_", 4: ".>", 5: "/?", 6: "`~",
    33: "[{", 34: "\\|", 35: "]}", 36: "'\""
  } as ReadonlySafeDict<string>,
  _funcKeyRe: <RegExpOne> /^F\d\d?$/,
  getKeyName_ (event: KeyboardEvent): string {
    const {keyCode: i, shiftKey: c} = event;
    let s: string | undefined;
    return i < VKeyCodes.minNotInKeyNames ? (s = i > VKeyCodes.maxNotPrintable
          ? this.keyNames_[i - VKeyCodes.space] : i === VKeyCodes.backspace ? "backspace"
          : i === VKeyCodes.esc ? "esc"
          : i === VKeyCodes.tab ? "tab" : i === VKeyCodes.enter ? "enter" : ""
        , c ? s && s.toUpperCase() : s)
      : i < VKeyCodes.minNotDelete && i > VKeyCodes.maxNotInsert ? (i > VKeyCodes.insert ? "delete" : "insert")
      : (s = event.key) ? this._funcKeyRe.test(s) ? c ? s : s.toLowerCase() : ""
      : i > VKeyCodes.maxNotFn && i < VKeyCodes.minNotFn ? "fF"[+c] + (i - VKeyCodes.maxNotFn) : "";
  },
  // we know that BrowserVer.MinEnsured$KeyboardEvent$$Key < BrowserVer.MinNo$KeyboardEvent$$keyIdentifier
  _getKeyCharUsingKeyIdentifier: !(Build.BTypes & BrowserType.Chrome)
        || Build.MinCVer >= BrowserVer.MinEnsured$KeyboardEvent$$Key ? 0 as never
      : function (this: {}, event: OldKeyboardEvent): string {
    let s: string | undefined = event.keyIdentifier || "";
    if (!s.startsWith("U+")) { return ""; }
    const keyId: KnownKey = parseInt(s.substring(2), 16);
    if (keyId < KnownKey.minAlphabet) {
      return keyId < KnownKey.minNotSpace ? ""
      : (event.shiftKey && keyId > KnownKey.maxNotNum
          && keyId < KnownKey.minNotNum) ? ")!@#$%^&*("[keyId - KnownKey.N0]
      : String.fromCharCode(keyId);
    } else if (keyId < KnownKey.minNotAlphabet) {
      return String.fromCharCode(keyId + (event.shiftKey ? 0 : KnownKey.CASE_DELTA));
    } else {
      return keyId > 185 && (s = (this as typeof VKey).correctionMap_[keyId - 186]) && s[+event.shiftKey] || "";
    }
  },
  char_ (event: KeyboardEvent): string {
    const key = event.key;
    if (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome && !key) {
      // since Browser.Min$KeyboardEvent$MayHas$$Key and before .MinEnsured$KeyboardEvent$$Key
      // event.key may be an empty string if some modifier keys are held on
      return this.getKeyName_(event) // it's safe to skip the check of `event.keyCode`
        || (this as EnsureNonNull<typeof VKey>)._getKeyCharUsingKeyIdentifier(event as OldKeyboardEvent);
    }
    return (key as string).length !== 1 || event.keyCode === VKeyCodes.space ? this.getKeyName_(event) : key as string;
  },
  key_ (event: EventControlKeys, ch: string): string {
    let modifiers = `${event.altKey ? "a-" : ""}${event.ctrlKey ? "c-" : ""}${event.metaKey ? "m-" : ""}`
      , isLong = ch.length > 1, chLower = ch.toLowerCase();
    event.shiftKey && (isLong || modifiers && ch !== chLower) && (modifiers += "s-");
    return isLong || modifiers ? `<${modifiers}${chLower}>` : ch;
  },
  getKeyStat_ (event: EventControlKeys): KeyStat {
    return <number> <boolean|number> event.altKey |
            (<number> <boolean|number> event.ctrlKey * 2) |
            (<number> <boolean|number> event.metaKey * 4) |
            (<number> <boolean|number> event.shiftKey * 8);
  },
  isEscape_ (event: KeyboardEvent): boolean {
    if (event.keyCode !== VKeyCodes.esc && !event.ctrlKey) { return false; }
    const i = this.getKeyStat_(event),
    code = Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Code && Build.BTypes & BrowserType.Chrome
            ? event.code : "";
    // we know that BrowserVer.MinEnsured$KeyboardEvent$$Code < BrowserVer.MinNo$KeyboardEvent$$keyIdentifier
    return i === KeyStat.plain || i === KeyStat.ctrlKey
      && (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Code && Build.BTypes & BrowserType.Chrome
          ? code ? code === "BracketLeft" : this.char_(event) === "["
          : event.code === "BracketLeft");
  }
};
