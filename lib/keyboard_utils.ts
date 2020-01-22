var VKey = {
  _keyNames: [kChar.space, kChar.pageup, kChar.pagedown, kChar.end, kChar.home,
    kChar.left, kChar.up, kChar.right, kChar.down,
    /* 41 */ "", "", "", "", kChar.insert, kChar.delete] as readonly kChar[],
  keyIdCorrectionOffset_: (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? 185 : 0 as never) as 185 | 300,
  _codeCorrectionMap: ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"],
  _charCorrectionList: Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? kChar.CharCorrectionList as kChar.CharCorrectionList : 0 as never,
  _modifierKeys: {
    __proto__: null as never,
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
  } as SafeEnum,
  cache_: null as never as SettingsNS.FrontendSettingCache,
  /** only return lower-case long string */
  getKeyName_ (event: Pick<KeyboardEvent, "key" | "keyCode" | "location">): kChar {
    let {keyCode: i} = event, s: string | undefined;
    return i > kKeyCode.space - 1 && i < kKeyCode.minNotDelete ? this._keyNames[i - kKeyCode.space]
      : i < kKeyCode.minNotDelete || i === kKeyCode.osRightMac ? (i === kKeyCode.backspace ? kChar.backspace
          : i === kKeyCode.esc ? kChar.esc
          : i === kKeyCode.tab ? kChar.tab : i === kKeyCode.enter ? kChar.enter
          : (i === kKeyCode.osRightMac || i > kKeyCode.minAcsKeys - 1 && i < kKeyCode.maxAcsKeys + 1)
            && this.cache_.a && this.cache_.a === event.location ? kChar.Modifier
          : kChar.None
        )
      : ((s = event.key) ? (<RegExpOne> /^F\d\d?$/).test(s) : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn)
      ? ("f" + (s ? s.slice(1) : i - kKeyCode.maxNotFn)) as kChar.F_num
      : kChar.None;
  },
  /** return single characters which only depend on `shiftKey` (CapsLock is ignored) */
  _getKeyCharUsingKeyIdentifier: (!(Build.BTypes & BrowserType.Chrome)
        || Build.MinCVer >= BrowserVer.MinEnsured$KeyboardEvent$$Key ? 0 as never
      : function (this: {}, event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL): string {
    let s: string | undefined = Build.BTypes & ~BrowserType.Chrome
        ? event.keyIdentifier || "" : event.keyIdentifier,
    keyId: kCharCode = s.startsWith("U+") ? parseInt(s.slice(2), 16) : 0;
    if (keyId < kCharCode.minNotAlphabet) {
      return keyId < kCharCode.minNotSpace ? ""
          : shiftKey && keyId > kCharCode.maxNotNum && keyId < kCharCode.minNotNum
          ? kChar.EnNumTrans[keyId - kCharCode.N0]
          : String.fromCharCode(keyId < kCharCode.minAlphabet || shiftKey ? keyId : keyId + kCharCode.CASE_DELTA);
    } else {
      // here omits a `(...)` after the first `&&`, since there has been `keyId >= kCharCode.minNotAlphabet`
      return keyId > (this as typeof VKey).keyIdCorrectionOffset_
          && (keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11
          ? (this as typeof VKey)._charCorrectionList[keyId + shiftKey * 12]
          : "";
    }
  }) as (this: {}, event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL) => string,
  /** return strings of 1-N characters and CapsLock is ignored */
  _forceEnUSLayout (key: string, event: Pick<KeyboardEvent, "key" | "keyCode" | "code" | "location">
      , shiftKey: boolean): string {
    let code = event.code as NonNullable<typeof event.code>, prefix = code.slice(0, 2), mapped: number | undefined;
    if (prefix !== "Nu") { // not (Numpad* or NumLock)
      // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
      if (prefix === "Ke" || prefix === "Di" || prefix === "Ar") {
        code = code.slice(code < "K" ? 5 : 3);
      }
      // Note: <Alt+P> may generate an upper-case '\u013b' on Mac,
      // so for /^Key[A-Z]/, can assume the status of CapsLock.
      // https://github.com/philc/vimium/issues/2161#issuecomment-225813082
      key = code.length === 1
            ? !shiftKey || code < "0" || code > "9" ? code : kChar.EnNumTrans[+code]
            : this._modifierKeys[key] ? this.cache_.a && event.location === this.cache_.a ? kChar.Modifier : ""
            // e.g. https://github.com/philc/vimium/issues/3451#issuecomment-569124026
            : !code ? key
            : (mapped = this._codeCorrectionMap.indexOf(code)) < 0 ? code === "Escape" ? kChar.esc : code
            : (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
                ? this._charCorrectionList : kChar.CharCorrectionList)[mapped + 12 * +shiftKey]
          ;
    }
    return shiftKey && key.length < 2 ? key : key.toLowerCase();
  },
  /**
   * * return `"space"` for the <Space> key - in most code it needs to be treated as a long key
   * * does not skip "Unidentified", because it can not solve any issue if skipping it
   */
  char_ (event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "location" | "shiftKey">): string {
    let {key, shiftKey} = event;
    if (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome && !key) {
      // since Browser.Min$KeyboardEvent$MayHas$$Key and before .MinEnsured$KeyboardEvent$$Key
      // event.key may be an empty string if some modifier keys are held on
      // it seems that KeyIdentifier doesn't follow keyboard layouts
      key = this.getKeyName_(event) // it's safe to skip the check of `event.keyCode`
        || this._getKeyCharUsingKeyIdentifier(event as Pick<OldKeyboardEvent, "keyIdentifier">, +shiftKey as BOOL);
    } else {
      key = (!(Build.BTypes & BrowserType.Edge) || Build.BTypes & ~BrowserType.Edge && VOther !== BrowserType.Edge)
          && this.cache_.l
        ? this._forceEnUSLayout(key as string, event, shiftKey)
        : (key as string).length > 1 || key === " " ? this.getKeyName_(event)
        : this.cache_.i ? shiftKey ? (<string> key).toUpperCase() : (<string> key).toLowerCase() : <string> key;
    }
    return key;
  },
  /** @argument ch must not be `""`; if length > 1, then must be lower-case */
  key_ (event: EventControlKeys, ch: string): string {
    if (!(Build.NDEBUG || ch.length === 1 || ch.length > 1 && ch === ch.toLowerCase())) {
      console.error(`Assert error: VKey.key_ get an invalid char of "${ch}" !`);
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
  _isRawEscape (event: KeyboardEvent): boolean {
    if (event.keyCode !== kKeyCode.esc && !event.ctrlKey || event.keyCode === kKeyCode.ctrlKey) { return false; }
    const i = this.getKeyStat_(event),
    code = Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Code && Build.BTypes & BrowserType.Chrome
        || Build.BTypes & BrowserType.Edge ? event.code : "";
    return i === KeyStat.plain || i === KeyStat.ctrlKey
      && (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Code && Build.BTypes & BrowserType.Chrome
          || Build.BTypes & BrowserType.Edge
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
   * @param eventType string
   * @param func Default to `VKey.Stop_`
   * @param disable Default to `0`
   * @param activeMode Default to `{passive: true, capture: true}`; `1` means `passive: false`
   */
  SetupEventListener_<T extends EventTarget, Active extends 1 | undefined = undefined> (this: void
      , target: T | 0, eventType: string
      , func?: ((this: T, e: Active extends 1 ? EventToPrevent : Event) => void) | null | EventListenerObject
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
  /**
   * if not timeout, then only suppress repeated keys
   *
   * @argument callback can be valid only if `BTypes & Chrome` and `timeout`
   */
  suppressTail_: function (this: {}, timeout: number, callback?: HandlerNS.VoidHandler | 0): HandlerNS.Handler<{}> {
    let timer = 0,
    func: HandlerNS.Handler<{}> = event => {
      if (!timeout) {
        if (event.repeat) { return HandlerResult.Prevent; }
        VKey.removeHandler_(func);
        return HandlerResult.Nothing;
      }
      clearTimeout(timer);
      timer = setTimeout(() => { // safe-interval
        if (VKey) {
          VKey.removeHandler_(func); // safe enough even if reloaded;
          if (Build.BTypes & BrowserType.Chrome && callback) {
            callback();
            callback = 0; // in case that native `setTimeout` is broken and the current one is simulated
          }
        }
      }, timeout);
      return HandlerResult.Prevent;
    };
    timeout && (func as () => HandlerResult)();
    (this as typeof VKey).pushHandler_(func, func);
    return func;
  } as {
    (timeout: 0, callback?: undefined): HandlerNS.Handler<{}>;
    (timeout: number, callback?: HandlerNS.VoidHandler): HandlerNS.Handler<{}>;
  },

  /** handler section */
  _handlers: [] as Array<{ func_: (event: HandlerNS.Event) => HandlerResult; env_: object; }>,
  pushHandler_<T extends object> (func: HandlerNS.Handler<T>, env: T): void {
    this._handlers.push({ func_: func, env_: env });
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
