var VKey = {
  _keyNames: ["space", "pageup", "pagedown", "end", "home", "left", "up", "right", "down",
    /* 41 */ "", "", "", "", "insert", "delete"] as ReadonlyArray<string>,
  keyIdCorrectionOffset_: (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? 185 : 0) as 0 | 185 | 300,
  _codeCorrectionMap: ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"],
  _charCorrectionList: Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? ";=,-./`[\\]'\\:+<_>?~{|}\"|" as const : 0 as never,
  _modifierKeys: {
    __proto__: null as never,
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
  } as SafeEnum,
  cache_: null as never as SettingsNS.FrontendSettingCache,
  getKeyName_ (event: Pick<KeyboardEvent, "key" | "keyCode">): string {
    let {keyCode: i} = event, s: string | undefined;
    return i < kKeyCode.minNotDelete ? (i > kKeyCode.space - 1
          ? this._keyNames[i - kKeyCode.space] : i === kKeyCode.backspace ? "backspace"
          : i === kKeyCode.esc ? "esc"
          : i === kKeyCode.tab ? "tab" : i === kKeyCode.enter ? "enter" : ""
        )
      : (s = event.key) ? (<RegExpOne> /^F\d\d?$/).test(s) ? s : ""
      : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn ? "F" + (i - kKeyCode.maxNotFn) : "";
  },
  _getKeyCharUsingKeyIdentifier: (!(Build.BTypes & BrowserType.Chrome)
        || Build.MinCVer >= BrowserVer.MinEnsured$KeyboardEvent$$Key ? 0 as never
      : function (this: {}, event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL): string {
    let s: string | undefined = Build.BTypes & ~BrowserType.Chrome
        ? event.keyIdentifier || "" : event.keyIdentifier,
    keyId: kCharCode = s.startsWith("U+") ? parseInt(s.slice(2), 16) : 0;
    if (keyId < kCharCode.minNotAlphabet) {
      return keyId < kCharCode.minNotSpace ? ""
      : (shiftKey && keyId > kCharCode.maxNotNum
          && keyId < kCharCode.minNotNum) ? ")!@#$%^&*("[keyId - kCharCode.N0]
      : String.fromCharCode(keyId < kCharCode.minAlphabet || shiftKey ? keyId : keyId + kCharCode.CASE_DELTA);
    } else {
      // here omits a `(...)` after the first `&&`, since there has been `keyId >= kCharCode.minNotAlphabet`
      return keyId > (this as typeof VKey).keyIdCorrectionOffset_
          && (keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11
          ? (this as typeof VKey)._charCorrectionList[keyId + shiftKey * 12]
          : "";
    }
  }) as (this: {}, event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL) => string,
  _forceEnUSLayout (key: string, code: string, shiftKey: boolean): string {
    let prefix = code.slice(0, 2), mapped: number | undefined;
    if (prefix !== "Nu") { // not (Numpad* or NumLock)
      // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
      if (prefix === "Ke" || prefix === "Di" || prefix === "Ar") {
        code = code.slice(code < "K" ? 5 : 3);
      }
      // Note: <Alt+P> may generate an upper-case '\u013b' on Mac,
      // so for /^Key[A-Z]/, can assume the status of CapsLock.
      // https://github.com/philc/vimium/issues/2161#issuecomment-225813082
      key = code.length === 1
            ? !shiftKey || code < "0" || code > "9" ? code : ")!@#$%^&*("[+code]
            : this._modifierKeys[key] ? ""
            : !code ? key
            : (mapped = this._codeCorrectionMap.indexOf(code)) < 0 ? code === "Escape" ? "esc" : code
            : (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
                ? this._charCorrectionList : ";=,-./`[\\]'\\:+<_>?~{|}\"|")[mapped + 12 * +shiftKey]
          ;
    }
    return shiftKey && key.length < 2 ? key : key === "Unidentified" ? "" : key.toLowerCase();
  },
  /**
   * * not constrain letter cases if returned name is long
   * * return `"space"` for the <Space> key - in most code it needs to be treated as a long key
   */
  char_ (event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "shiftKey">): string {
    let {key, shiftKey} = event;
    if (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome && !key) {
      // since Browser.Min$KeyboardEvent$MayHas$$Key and before .MinEnsured$KeyboardEvent$$Key
      // event.key may be an empty string if some modifier keys are held on
      // it seems that KeyIdentifier doesn't follow keyboard layouts
      key = this.getKeyName_(event) // it's safe to skip the check of `event.keyCode`
        || this._getKeyCharUsingKeyIdentifier(event as Pick<OldKeyboardEvent, "keyIdentifier">, +shiftKey as BOOL);
    } else {
      key = this.cache_.L
        ? this._forceEnUSLayout(key as string, event.code as NonNullable<typeof event.code>, shiftKey)
        : (key as string).length > 1 || event.keyCode === kKeyCode.space ? this.getKeyName_(event)
        : key as string;
    }
    return this.cache_.i ? shiftKey ? key.toUpperCase() : key.toLowerCase() : key as string;
  },
  /** @argument ch must not be `""` */
  key_ (event: EventControlKeys, ch: string): string {
    if (!(Build.NDEBUG || ch)) {
      console.log("Assert error: VKey.key_ must receive a non-empty char");
    }
    let modifiers = `${event.altKey ? "a-" : ""}${event.ctrlKey ? "c-" : ""}${event.metaKey ? "m-" : ""}`
      , isLong = ch.length > 1, chLower = ch.toLowerCase();
    event.shiftKey && (isLong || modifiers && ch.toUpperCase() !== chLower) && (modifiers += "s-");
    return isLong || modifiers ? `<${modifiers}${chLower}>` : ch;
  },
  getKeyStat_ (event: EventControlKeys): KeyStat {
    return <number> <boolean|number> event.altKey |
            (<number> <boolean|number> event.ctrlKey * 2) |
            (<number> <boolean|number> event.metaKey * 4) |
            (<number> <boolean|number> event.shiftKey * 8);
  },
  isEscape_: null as never as (event: KeyboardEvent) => boolean,
  isRawEscape_ (event: KeyboardEvent): boolean {
    if (event.keyCode !== kKeyCode.esc && !event.ctrlKey || event.keyCode === kKeyCode.ctrlKey) { return false; }
    const i = this.getKeyStat_(event),
    code = Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Code && Build.BTypes & BrowserType.Chrome
            ? event.code : "";
    return i === KeyStat.plain || i === KeyStat.ctrlKey
      && (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Code && Build.BTypes & BrowserType.Chrome
          ? code ? code === "BracketLeft" : this._getKeyCharUsingKeyIdentifier(event as OldKeyboardEvent, 0) === "["
          : event.code === "BracketLeft");
  },

  /** event section */
  Stop_ (this: void, event: Pick<Event, "stopImmediatePropagation">): void { event.stopImmediatePropagation(); },
  prevent_ (this: object, event: ToPrevent): void {
    event.preventDefault(); (this as typeof VKey).Stop_(event);
  },
  /**
   * @param target Default to `window`
   * @param func Default to `VKey.Stop_`
   * @param disable Default to `0`
   * @param activeMode Default to `{passive: true, capture: true}`; `1` means `passive: false`
   */
  SetupEventListener_<T extends EventTarget, Active extends 1 | undefined = undefined> (this: void
      , target: T | 0, eventType: string
      , func?: ((this: T, e: Active extends 1 ? EventToPrevent : Event) => void) | null
      , disable?: boolean | BOOL, activeMode?: Active): void {
    (disable ? removeEventListener : addEventListener).call(target || window, eventType, func || VKey.Stop_,
        {passive: !activeMode, capture: true} as EventListenerOptions | boolean as boolean);
  },
  SuppressMost_ (this: object, event: KeyboardEvent): HandlerResult {
    VKey.isEscape_(event) && VKey.removeHandler_(this);
    const key = event.keyCode;
    return key > kKeyCode.f10 && key < kKeyCode.f13 || key === kKeyCode.f5 ?
      HandlerResult.Suppress : HandlerResult.Prevent;
  },
  /** if not timeout, then only suppress repeated keys */
  suppressTail_ (timeout: number): void {
    let func: HandlerNS.Handler<object>, tick: number, timer: number;
    if (!timeout) {
      func = function (event) {
        if (event.repeat) { return HandlerResult.Prevent; }
        VKey.removeHandler_(this);
        return HandlerResult.Nothing;
      };
    } else {
      func = function () { tick = Date.now(); return HandlerResult.Prevent; };
      tick = Date.now() + timeout;
      timer = setInterval(function (info?: TimerType.fake) { // safe-interval
        const delta = Date.now() - tick; // Note: performance.now() may has a worse resolution
        if (delta > GlobalConsts.TimeOfSuppressingTailKeydownEvents || delta < -3e3
           || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
              && info) {
          clearInterval(timer);
          VKey && VKey.removeHandler_(func); // safe enough even if reloaded
        }
      }, (GlobalConsts.TimeOfSuppressingTailKeydownEvents * 0.36) | 0);
    }
    this.pushHandler_(func, func);
  },

  /** handler section */
  _handlers: [] as Array<{ func_: (event: HandlerNS.Event) => HandlerResult; env_: object; }>,
  pushHandler_<T extends object> (func: HandlerNS.Handler<T>, env: T): number {
    return this._handlers.push({ func_: func, env_: env });
  },
  bubbleEvent_ (event: HandlerNS.Event): HandlerResult {
    for (let ref = this._handlers, i = ref.length; 0 <= --i; ) {
      const item = ref[i],
      result = item.func_.call(item.env_, event);
      if (result !== HandlerResult.Nothing) {
        return result;
      }
    }
    return HandlerResult.Default;
  },
  removeHandler_ (env: object): void {
    for (let ref = this._handlers, i = ref.length; 0 <= --i; ) {
      if (ref[i].env_ === env) {
        i === ref.length - 1 ? ref.length-- : ref.splice(i, 1);
        break;
      }
    }
  },
  /** misc section */
  safer_: (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
      && !Object.setPrototypeOf ? function <T extends object> (obj: T): T & SafeObject {
        (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null)
    ) as (<T extends object> (opt: T) => T & SafeObject)
};

if (!(Build.NDEBUG || BrowserVer.MinEnsured$KeyboardEvent$$Code < BrowserVer.MinNo$KeyboardEvent$$keyIdentifier)
    || !(Build.NDEBUG || BrowserVer.MinEnsured$KeyboardEvent$$Key < BrowserVer.MinNo$KeyboardEvent$$keyIdentifier)) {
  console.log("Assert error: KeyboardEvent.key/code should exist before Chrome version"
      , BrowserVer.MinNo$KeyboardEvent$$keyIdentifier);
}
if (!(Build.NDEBUG || BrowserVer.MinEnsured$KeyboardEvent$$Code < BrowserVer.MinEnsured$KeyboardEvent$$Key)) {
  console.log("Assert error: need KeyboardEvent.code to exist if only .key exists");
}
