import { fgCache, clearTimeout_, timeout_, isAlive_, VOther, Stop_ as stopEvent } from "./utils"

const DEL = kChar.delete, BSP = kChar.backspace
const ENT = kChar.enter
export { ENT as ENTER }
const keyNames_: readonly kChar[] = [kChar.space, kChar.pageup, kChar.pagedown, kChar.end, kChar.home,
    kChar.left, kChar.up, kChar.right, kChar.down]
let keyIdCorrectionOffset_old_cr_: 185 | 300 | null = Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? 185 : 0 as never as null
const _codeCorrectionMap = ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"]
const kCrct = Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? kChar.CharCorrectionList : 0 as never as null
const _modifierKeys: SafeEnum = {
    __proto__: null as never,
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
}
const handlers_: Array<HandlerNS.Handler | kHandler> = []
let getMappedKey: (this: void, event: HandlerNS.Event, mode: kModeId) => string

export { keyNames_, getMappedKey, handlers_ as handler_stack, DEL, BSP }
export function set_getMappedKey (_newGetMappedKey: typeof getMappedKey): void { getMappedKey = _newGetMappedKey }
export function set_keyIdCorrectionOffset_old_cr_ (_newKeyIdCorrectionOffset: 185 | 300 | null): void {
  keyIdCorrectionOffset_old_cr_ = _newKeyIdCorrectionOffset
}

/** only return lower-case long string */
const _getKeyName = (event: Pick<KeyboardEvent, "key" | "keyCode" | "location">): kChar => {
  let i = event.keyCode, s: string | undefined
  return i > kKeyCode.space - 1 && i < kKeyCode.minNotDelete
      ? i < kKeyCode.insert ? keyNames_[i - kKeyCode.space] : i > kKeyCode.insert ? DEL : kChar.insert
      : i < kKeyCode.minNotDelete || i === kKeyCode.osRightMac ? (i === kKeyCode.backspace ? BSP
          : i === kKeyCode.esc ? kChar.esc
          : i === kKeyCode.tab ? kChar.tab : i === kKeyCode.enter ? ENT
          : (i === kKeyCode.osRightMac || i > kKeyCode.minAcsKeys - 1 && i < kKeyCode.maxAcsKeys + 1)
            && fgCache.a && fgCache.a === event.location ? kChar.Modifier
          : kChar.None
        )
      : ((s = event.key) ? (<RegExpOne> /^F\d\d?$/).test(s) : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn)
      ? ("f" + (s ? s.slice(1) : i - kKeyCode.maxNotFn)) as kChar.F_num
      : kChar.None
}

  /** return single characters which only depend on `shiftKey` (CapsLock is ignored) */
const _getKeyCharUsingKeyIdentifier_old_cr = !(Build.BTypes & BrowserType.Chrome)
        || Build.MinCVer >= BrowserVer.MinEnsured$KeyboardEvent$$Key ? 0 as never
      : function (event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL): string {
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
      return keyId > keyIdCorrectionOffset_old_cr_!
          && (keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11
          ? kCrct![keyId + shiftKey * 12]
          : "";
    }
} as (event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL) => string

/**
 * * return `"space"` for the <Space> key - in most code it needs to be treated as a long key
 * * does not skip "Unidentified", because it can not solve any issue if skipping it
 */
export const char_ = (eventWrapper: HandlerNS.Event): kChar => {
  let event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "location" | "shiftKey">
        = eventWrapper.e
  let mapped: number | undefined, key = event.key, shiftKey = event.shiftKey
  if (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome && !key) {
    // since Browser.Min$KeyboardEvent$MayHave$$Key and before .MinEnsured$KeyboardEvent$$Key
    // event.key may be an empty string if some modifier keys are held on
    // it seems that KeyIdentifier doesn't follow keyboard layouts
    key = _getKeyName(event) // it's safe to skip the check of `event.keyCode`
        || /*#__NOINLINE__*/ _getKeyCharUsingKeyIdentifier_old_cr(event as Pick<OldKeyboardEvent, "keyIdentifier">
            , +shiftKey as BOOL)
  } else if ((!(Build.BTypes & BrowserType.Edge) || Build.BTypes & ~BrowserType.Edge && VOther !== BrowserType.Edge)
      && fgCache.l) {
      /** return strings of 1-N characters and CapsLock is ignored */
    let code = event.code!, prefix = code.slice(0, 2);
    if (prefix !== "Nu") { // not (Numpad* or NumLock)
      // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
      if (prefix === "Ke" || prefix === "Di" || prefix === "Ar") {
        code = code.slice(code < "K" ? 5 : 3);
      }
      // Note: <Alt+P> may generate an upper-case '\u013b' on Mac,
      // so for /^Key[A-Z]/, can assume the status of CapsLock.
      // https://github.com/philc/vimium/issues/2161#issuecomment-225813082
      key = code.length === 1 && key!.length < 2
            ? !shiftKey || code < "0" || code > "9" ? code : kChar.EnNumTrans[+code]
            : _modifierKeys[key!] ? fgCache.a && event.location === fgCache.a ? kChar.Modifier : ""
            : key === "Escape" ? kChar.esc // e.g. https://github.com/gdh1995/vimium-c/issues/129
            : code.length < 2 ? key // e.g. https://github.com/philc/vimium/issues/3451#issuecomment-569124026
            : (mapped = _codeCorrectionMap.indexOf(code)) < 0 ? code
            : (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
                ? kCrct! : kChar.CharCorrectionList)[mapped + 12 * +shiftKey]
    }
    key = shiftKey && key!.length < 2 ? key : key!.toLowerCase()
  } else {
    key = key!.length > 1 || key === " " ? /*#__NOINLINE__*/ _getKeyName(event)
        : fgCache.i ? shiftKey ? key!.toUpperCase() : key!.toLowerCase() : key!;
  }
  return eventWrapper.c = key as kChar
}

export const keybody_ = (key: string): kChar => (key.slice(key.lastIndexOf("-") + 1) || key && kChar.minus) as kChar

export const getKeyStat_ = (event: EventControlKeys): KeyStat => {
    return <number> <boolean|number> event.altKey |
            (<number> <boolean|number> event.ctrlKey * 2) |
            (<number> <boolean|number> event.metaKey * 4) |
            (<number> <boolean|number> event.shiftKey * 8);
}

export const isEscape_ = (key: string): HandlerResult.AdvancedEsc | HandlerResult.PlainEsc | HandlerResult.Nothing => {
    return key === kChar.esc ? HandlerResult.AdvancedEsc
        : key === "c-" + kChar.bracketLeft ? HandlerResult.PlainEsc : HandlerResult.Nothing;
}

/** handler section */

export const prevent_ = (event: ToPrevent): void => {
    event.preventDefault(); stopEvent(event);
}

export const replaceOrSuppressMost_ = (id: kHandler, newHandler?: HandlerNS.Handler): void => {
  removeHandler_(id)
  pushHandler_(newHandler || ((event: HandlerNS.Event): HandlerResult => {
    isEscape_(getMappedKey(event, kModeId.Normal)) && removeHandler_(id)
    return event.i === kKeyCode.f12 || event.i === kKeyCode.f5 ? HandlerResult.Suppress : HandlerResult.Prevent;
  }), id)
}

  /**
   * if not timeout, then only suppress repeated keys
   *
   * @argument callback can be valid only if `timeout`
   */
export const suppressTail_ = ((timeout?: number
    , callback?: HandlerNS.VoidHandler<unknown>): HandlerNS.Handler | HandlerNS.VoidHandler<HandlerResult> => {
  let timer = TimerID.None, func = (event?: HandlerNS.Event): HandlerResult => {
      if (!timeout) {
        if (event!.e.repeat) { return HandlerResult.Prevent }
        removeHandler_(func as never as kHandler.suppressTail)
        return HandlerResult.Nothing;
      }
      clearTimeout_(timer);
      timer = timeout_((): void => { // safe-interval
        removeHandler_(func as never as kHandler.suppressTail)
        callback && isAlive_ && callback()
      }, timeout);
      return HandlerResult.Prevent;
  };
  timeout && func()
  if (!callback) {
    pushHandler_(func, func as never as kHandler.suppressTail)
  }
  return func
}) as {
  (timeout?: number, callback?: undefined): unknown
  (timeout: number, callback: HandlerNS.VoidHandler<any>): HandlerNS.VoidHandler<HandlerResult>
}

export const pushHandler_ = handlers_.push.bind(handlers_) as (func: HandlerNS.Handler, id: kHandler) => void

export const removeHandler_ = (id: kHandler): void => {
  let i = handlers_.lastIndexOf(id)
  if (i > 0) {
    i === handlers_.length - 1 ? handlers_.length -= 2 : handlers_.splice(i - 1, 2)
  }
}

  /** misc section */

if (!(Build.NDEBUG || BrowserVer.MinEnsured$KeyboardEvent$$Code < BrowserVer.MinNo$KeyboardEvent$$keyIdentifier)
    || !(Build.NDEBUG || BrowserVer.MinEnsured$KeyboardEvent$$Key < BrowserVer.MinNo$KeyboardEvent$$keyIdentifier)) {
  console.log("Assert error: KeyboardEvent.key/code should exist before Chrome version"
      , BrowserVer.MinNo$KeyboardEvent$$keyIdentifier);
}
if (!(Build.NDEBUG || BrowserVer.MinEnsured$KeyboardEvent$$Code < BrowserVer.MinEnsured$KeyboardEvent$$Key)) {
  console.log("Assert error: need KeyboardEvent.code to exist if only .key exists");
}
