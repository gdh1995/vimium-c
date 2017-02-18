var VKeyCodes = {
  __proto__: null,
  altKey: 18, backspace: 8, ctrlKey: 17, deleteKey: 46, down: 40,
  enter: 13, esc: 27, f1: 112, f12: 123, left: 37, metaKey: 91,
  pageup: 33, shiftKey: 16, space: 32, tab: 9, up: 38
},
VKeyboard = {
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
    return i < 41 ? (s = i > 31 ? this.keyNames[i - 32] : i === 8 ? "backspace" : ""
        , c ? s && s.toUpperCase() : s)
      : (s = event.key) ? this.funcKeyRe.test(s) ? c ? s : s.toLowerCase() : ""
      : i > 111 && i < 124 ? "fF"[+c] + (i - 111) : "";
  },
  getKeyCharUsingKeyIdentifier (event: OldKeyboardEvent): string {
    let {keyIdentifier: s, keyCode: keyId} = event;
    if (!s.startsWith("U+")) { return ""; }
    keyId = parseInt(s.substring(2), 16);
    if (keyId < 65) {
      return keyId <= 32 ? (keyId !== 32 ? "" : event.shiftKey ? "SPACE" : "space")
      : (event.shiftKey && keyId >= 48 && keyId < 58) ? ")!@#$%^&*("[keyId - 48]
      : String.fromCharCode(keyId);
    } else if (keyId <= 90) {
      return String.fromCharCode(keyId + (event.shiftKey ? 0 : 32));
    } else if (keyId <= 125) {
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
  getKey (event: KeyboardEvent, ch: string): string {
    const left = event.metaKey ? "<m-" : "<";
    return event.ctrlKey ? left + (event.altKey ? "c-a-" : "c-") + ch + ">"
      : event.altKey ? left + "a-" + ch + ">"
      : event.metaKey || ch.length > 1 ? left + ch + ">" : ch;
  },
  getKeyStat (event: KeyboardEvent): number {
    return <any>event.altKey | (<any>event.ctrlKey << 1) | (<any>event.metaKey << 2) | (<any>event.shiftKey << 3);
  },
  isEscape (event: KeyboardEvent): boolean {
    const k = event.keyCode;
    if (k !== 27 && !event.ctrlKey) { return false; }
    const i = this.getKeyStat(event);
    return i === 0 || i === 2 && this.getKeyChar(event) === '[';
  }
};
