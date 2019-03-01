var VKeyboard = {
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
          : i === VKeyCodes.tab ? "tab" : i === VKeyCodes.enter ? "enter" : ""
        , c ? s && s.toUpperCase() : s)
      : i < VKeyCodes.minNotDelete && i > VKeyCodes.maxNotInsert ? (i > VKeyCodes.insert ? "delete" : "insert")
      : (s = event.key) ? this._funcKeyRe.test(s) ? c ? s : s.toLowerCase() : ""
      : i > VKeyCodes.maxNotFn && i < VKeyCodes.minNotFn ? "fF"[+c] + (i - VKeyCodes.maxNotFn) : "";
  },
  getKeyCharUsingKeyIdentifier_ (event: OldKeyboardEvent): string {
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
      return keyId > 185 && (s = this.correctionMap_[keyId - 186]) && s[+event.shiftKey] || "";
    }
  },
  char_ (event: KeyboardEvent): string {
    const key = event.key as string | undefined;
    if (!key) {
      // since Browser.Min$KeyboardEvent$MayHas$$Key and before .MinEnsured$KeyboardEvent$$Key
      // event.key may be an empty string if some modifier keys are held on
      return event.keyCode && this.getKeyName_(event) || this.getKeyCharUsingKeyIdentifier_(event as OldKeyboardEvent);
    }
    return key.length !== 1 || event.keyCode === VKeyCodes.space ? this.getKeyName_(event) : key;
  },
  key_ (event: EventControlKeys, ch: string): string {
    const left = event.metaKey ? "<m-" : "<";
    return event.ctrlKey ? left + (event.altKey ? "c-a-" : "c-") + ch + ">"
      : event.altKey ? left + "a-" + ch + ">"
      : event.metaKey || ch.length > 1 ? left + ch + ">" : ch;
  },
  getKeyStat_ (event: EventControlKeys): KeyStat {
    return <number> <boolean|number> event.altKey |
            (<number> <boolean|number> event.ctrlKey << 1) |
            (<number> <boolean|number> event.metaKey << 2) |
            (<number> <boolean|number> event.shiftKey << 3);
  },
  isEscape_ (event: KeyboardEvent): boolean {
    if (event.keyCode !== VKeyCodes.esc && !event.ctrlKey) { return false; }
    const i = this.getKeyStat_(event);
    // we know that BrowserVer.MinEnsured$KeyboardEvent$$Code < BrowserVer.MinNo$KeyboardEvent$$keyIdentifier
    return i === KeyStat.plain || i === KeyStat.ctrlKey && (event.code === "BracketLeft" || this.char_(event) === "[");
  }
};
