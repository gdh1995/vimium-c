var VKeyboard = {
  keyNames: ["space", "pageup", "pagedown", "end", "home", "left", "up", "right", "down"],
  correctionMap: {
    __proto__: null as never,
    "0": ";:", "1": "=+", "2": ",<", "3": "-_", "4": ".>", "5": "/?", "6": "`~",
    "33": "[{", "34": "\\|", "35": "]}", "36": "'\""
  } as SafeDict<string>,
  funcKeyRe: <RegExpOne> /^F\d\d?$/,
  getKeyName (event: KeyboardEvent): string {
    const {keyCode: i, shiftKey: c} = event;
    let s: string | undefined;
    return i < VKeyCodes.minNotInKeyNames ? (s = i > VKeyCodes.maxNotPrintable
          ? this.keyNames[i - VKeyCodes.space] : i === VKeyCodes.backspace ? "backspace" : ""
        , c ? s && s.toUpperCase() : s)
      : (s = event.key) ? this.funcKeyRe.test(s) ? c ? s : s.toLowerCase() : ""
      : i > VKeyCodes.maxNotFn && i < VKeyCodes.minNotFn ? "fF"[+c] + (i - VKeyCodes.maxNotFn) : "";
  },
  getKeyCharUsingKeyIdentifier (event: OldKeyboardEvent): string {
    let {keyIdentifier: s} = event;
    if (!s.startsWith("U+")) { return ""; }
    const keyId = parseInt(s.substring(2), 16);
    if (keyId < VKeyCodes.A) {
      return keyId < VKeyCodes.minNotInKeyNames ? keyId !== VKeyCodes.space ? "" : event.shiftKey ? "SPACE" : "space"
      : (event.shiftKey && keyId > VKeyCodes.maxNotNum
          && keyId < VKeyCodes.minNotNum) ? ")!@#$%^&*("[keyId - VKeyCodes.N0]
      : String.fromCharCode(keyId);
    } else if (keyId < VKeyCodes.minNotAlphabet) {
      return String.fromCharCode(keyId + (event.shiftKey ? 0 : VKeyCodes.CASE_DELTA));
    } else if (keyId < 186) {
      return "";
    } else {
      return (s = this.correctionMap[keyId - 186] || "") && s[+event.shiftKey];
    }
  },
  getKeyChar (event: KeyboardEvent): string {
    const key = event.key as string | undefined;
    if (key == null) {
      return event.keyCode && this.getKeyName(event) || this.getKeyCharUsingKeyIdentifier(event as OldKeyboardEvent);
    }
    return key.length !== 1 ? this.getKeyName(event) : key === " " ? "space" : key;
  },
  getKey (event: EventControlKeys, ch: string): string {
    const left = event.metaKey ? "<m-" : "<";
    return event.ctrlKey ? left + (event.altKey ? "c-a-" : "c-") + ch + ">"
      : event.altKey ? left + "a-" + ch + ">"
      : event.metaKey || ch.length > 1 ? left + ch + ">" : ch;
  },
  getKeyStat (event: EventControlKeys): number {
    return <any>event.altKey | (<any>event.ctrlKey << 1) | (<any>event.metaKey << 2) | (<any>event.shiftKey << 3);
  },
  isEscape (event: KeyboardEvent): boolean {
    const k = event.keyCode;
    if (k !== VKeyCodes.esc && !event.ctrlKey) { return false; }
    const i = this.getKeyStat(event);
    return i === KeyStat.plain || i === KeyStat.ctrlKey && this.getKeyChar(event) === '[';
  }
};
