// eslint-disable-next-line no-var
var VKey = {
  keyNames_: [kChar.space, kChar.pageup, kChar.pagedown, kChar.end, kChar.home,
    kChar.left, kChar.up, kChar.right, kChar.down,
    /* 41 */ "", "", "", "", kChar.insert, kChar.delete] as readonly kChar[],
  keyIdCorrectionOffset_old_cr_: Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? 185 as 185 | 300 : 0 as never as null,
  _codeCorrectionMap: ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"],
  _charCorrectionList_old_cr: Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? kChar.CharCorrectionList as kChar.CharCorrectionList : 0 as never as null,
  _modifierKeys: {
    __proto__: null as never,
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
  } as SafeEnum,
  cacheK_: null as never as SettingsNS.FrontendSettingCache,
  /** only return lower-case long string */
  _getKeyName (event: Pick<KeyboardEvent, "key" | "keyCode" | "location">): kChar {
    let {keyCode: i} = event, s: string | undefined;
    return i > kKeyCode.space - 1 && i < kKeyCode.minNotDelete ? this.keyNames_[i - kKeyCode.space]
      : i < kKeyCode.minNotDelete || i === kKeyCode.osRightMac ? (i === kKeyCode.backspace ? kChar.backspace
          : i === kKeyCode.esc ? kChar.esc
          : i === kKeyCode.tab ? kChar.tab : i === kKeyCode.enter ? kChar.enter
          : (i === kKeyCode.osRightMac || i > kKeyCode.minAcsKeys - 1 && i < kKeyCode.maxAcsKeys + 1)
            && this.cacheK_.a && this.cacheK_.a === event.location ? kChar.Modifier
          : kChar.None
        )
      : ((s = event.key) ? (<RegExpOne> /^F\d\d?$/).test(s) : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn)
      ? ("f" + (s ? s.slice(1) : i - kKeyCode.maxNotFn)) as kChar.F_num
      : kChar.None;
  },
  /** return single characters which only depend on `shiftKey` (CapsLock is ignored) */
  _getKeyCharUsingKeyIdentifier_old_cr: (!(Build.BTypes & BrowserType.Chrome)
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
      return keyId > (this as typeof VKey).keyIdCorrectionOffset_old_cr_!
          && (keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11
          ? (this as typeof VKey)._charCorrectionList_old_cr![keyId + shiftKey * 12]
          : "";
    }
  }) as (this: {}, event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL) => string,
  /** return strings of 1-N characters and CapsLock is ignored */
  _forceEnUSLayout (key: string, event: Pick<KeyboardEvent, "key" | "keyCode" | "code" | "location">
      , shiftKey: boolean): string {
    let code = event.code!, prefix = code.slice(0, 2), mapped: number | undefined;
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
            : this._modifierKeys[key] ? this.cacheK_.a && event.location === this.cacheK_.a ? kChar.Modifier : ""
            : key === "Escape" ? kChar.esc // e.g. https://github.com/gdh1995/vimium-c/issues/129
            : !code ? key // e.g. https://github.com/philc/vimium/issues/3451#issuecomment-569124026
            : (mapped = this._codeCorrectionMap.indexOf(code)) < 0 ? code
            : (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
                ? this._charCorrectionList_old_cr! : kChar.CharCorrectionList)[mapped + 12 * +shiftKey]
          ;
    }
    return shiftKey && key.length < 2 ? key : key.toLowerCase();
  },
  /**
   * * return `"space"` for the <Space> key - in most code it needs to be treated as a long key
   * * does not skip "Unidentified", because it can not solve any issue if skipping it
   */
  char_ (eventWrapper: HandlerNS.Event): kChar {
    let event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "location" | "shiftKey">
        = eventWrapper.e
      , {key, shiftKey} = eventWrapper.e;
    if (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome && !key) {
      // since Browser.Min$KeyboardEvent$MayHas$$Key and before .MinEnsured$KeyboardEvent$$Key
      // event.key may be an empty string if some modifier keys are held on
      // it seems that KeyIdentifier doesn't follow keyboard layouts
      key = this._getKeyName(event) // it's safe to skip the check of `event.keyCode`
        || this._getKeyCharUsingKeyIdentifier_old_cr(event as Pick<OldKeyboardEvent, "keyIdentifier">
            , +shiftKey as BOOL);
    } else {
      key = (!(Build.BTypes & BrowserType.Edge) || Build.BTypes & ~BrowserType.Edge && VOther !== BrowserType.Edge)
          && this.cacheK_.l
        ? this._forceEnUSLayout(key!, event, shiftKey)
        : key!.length > 1 || key === " " ? this._getKeyName(event)
        : this.cacheK_.i ? shiftKey ? key!.toUpperCase() : key!.toLowerCase() : key!;
    }
    return eventWrapper.c = key as kChar;
  },
  keybody_: (key: string): kChar => (key.slice(key.lastIndexOf("-") + 1) || key && kChar.minus) as kChar,
  key_: null as never as (this: void, event: HandlerNS.Event, mode: kModeId) => string,
  getKeyStat_ ({e: event}: {e: EventControlKeys}): KeyStat {
    return <number> <boolean|number> event.altKey |
            (<number> <boolean|number> event.ctrlKey * 2) |
            (<number> <boolean|number> event.metaKey * 4) |
            (<number> <boolean|number> event.shiftKey * 8);
  },
  isEscape_ (key: string): HandlerResult.AdvancedEsc | HandlerResult.PlainEsc | HandlerResult.Nothing {
    return key === kChar.esc ? HandlerResult.AdvancedEsc
        : key === "c-" + kChar.bracketLeft ? HandlerResult.PlainEsc : HandlerResult.Nothing;
  },

  /** event section */
  Stop_ (this: void, event: Pick<Event, "stopImmediatePropagation">): void { event.stopImmediatePropagation(); },
  prevent_ (this: object, event: ToPrevent): void {
    event.preventDefault(); (this as typeof VKey).Stop_(event);
  },
  SuppressMost_ (this: object, event: HandlerNS.Event): HandlerResult {
    VKey.isEscape_(VKey.key_(event, kModeId.Normal)) && VKey.removeHandler_(this);
    return event.i === kKeyCode.f12 || event.i === kKeyCode.f5 ? HandlerResult.Suppress : HandlerResult.Prevent;
  },
  /**
   * if not timeout, then only suppress repeated keys
   *
   * @argument callback can be valid only if `BTypes & Chrome` and `timeout`
   */
  suppressTail_: function (timeout: number, callback?: HandlerNS.VoidHandler | 0): HandlerNS.RefHandler {
    let a = VKey, timer = 0,
    func: HandlerNS.RefHandler = event => {
      if (!timeout) {
        if (event.e.repeat) { return HandlerResult.Prevent; }
        a.removeHandler_(func);
        return HandlerResult.Nothing;
      }
      VKey.clearTimeout_(timer);
      timer = a.timeout_(() => { // safe-interval
        if (VKey) {
          a.removeHandler_(func); // safe enough even if reloaded;
          if (Build.BTypes & BrowserType.Chrome && callback) {
            callback();
            callback = 0; // in case that native `setTimeout` is broken and the current one is simulated
          }
        }
      }, timeout);
      return HandlerResult.Prevent;
    };
    timeout && (func as () => any)();
    a.pushHandler_(func, func);
    return func;
  } as {
    (timeout: 0, callback?: undefined): HandlerNS.RefHandler;
    (timeout: number, callback?: HandlerNS.VoidHandler): HandlerNS.RefHandler;
  },

  /** handler section */
  _handlers: [] as Array<{ func_: (event: HandlerNS.Event) => HandlerResult; env_: object }>,
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
  timeout_: (func: (this: void, fake?: TimerType.fake) => void, timeout: number
      ): TimerID.Valid | TimerID.Others => setTimeout(func, timeout),
  clearTimeout_ (timer: TimerID) { clearTimeout(timer); },
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
