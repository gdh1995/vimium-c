import {
  fgCache, clearTimeout_, timeout_, isAlive_, Stop_, Lower, OnChrome, OnEdge, getTime, OnFirefox, abs_, os_, chromeVer_,
  keydownEvents_, isAsContent
} from "./utils"

const DEL = kChar.delete, BSP = kChar.backspace, SP = kChar.space
const ENT = kChar.enter, MDF = kChar.Modifier
export { ENT as ENTER, MDF as MODIFIER }
/** readonly kChar[9] */
const keyNames_: readonly kChar[] = [SP, kChar.pageup, kChar.pagedown, kChar.end, kChar.home,
    kChar.left, kChar.up, kChar.right, kChar.down]
let keyIdCorrectionOffset_old_cr_ = OnChrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
    ? Build.OS !== kBOS.MAC as number ? 185 as const : 300 as const : 0 as never as null
const _codeCorrectionMap = ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"]
const kCrct = OnChrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key || Build.OS & kBOS.MAC
    ? kChar.CharCorrectionList : 0 as never as null
const _modifierKeys: SafeEnum = {
    __proto__: null as never,
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
}
const handler_stack: Array<HandlerNS.Handler | kHandler> = []
let getMappedKey: (this: void, event: HandlerNS.Event, mode: kModeId) => string

export { keyNames_, getMappedKey, handler_stack, DEL, BSP, SP as SPC }
export function set_getMappedKey (_newGetMappedKey: typeof getMappedKey): void { getMappedKey = _newGetMappedKey }
export function set_keyIdCorrectionOffset_old_cr_ (_newKeyIdCorrectionOffset: 185 | 300 | null): void {
  keyIdCorrectionOffset_old_cr_ = _newKeyIdCorrectionOffset
}

/** only return lower-case long string */
const _getKeyName = (event: Pick<KeyboardEvent, "key" | "keyCode" | "location">): kChar => {
  let i = event.keyCode, s: string | undefined
  return i > kKeyCode.space - 1 && i < kKeyCode.minNotDelete
      ? i < kKeyCode.minNotDown
        ? i < kKeyCode.space + 1 && (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
            && Build.BTypes & BrowserType.Chrome ? (s = event.key) && s.length > 1 : (s = event.key!).length > 1)
          ? Lower(s!) as kChar.space | kChar.groupnext : keyNames_[i - kKeyCode.space]
        : i > kKeyCode.insert ? DEL : i < kKeyCode.insert ? kChar.None : kChar.insert
      : i < kKeyCode.minNotDelete || i === kKeyCode.metaKey
        || Build.OS & kBOS.MAC && i === (OnFirefox ? kKeyCode.os_ff_mac : kKeyCode.osRight_mac)
            && (Build.OS === kBOS.MAC as number || !os_)
      ? (i === kKeyCode.backspace ? BSP : i === kKeyCode.esc ? kChar.esc
          : i === kKeyCode.tab ? kChar.tab : i === kKeyCode.enter ? ENT
          : (i < kKeyCode.maxAcsKeys + 1 ? i > kKeyCode.minAcsKeys - 1 : i > kKeyCode.maxNotMetaKey)
            && fgCache.l > kKeyLayout.MapModifierStart - 1
            && (fgCache.l >> kKeyLayout.MapModifierOffset) === event.location ? MDF
          : kChar.None
        )
      : i === kKeyCode.menuKey && Build.BTypes !== BrowserType.Safari as number
        && (Build.BTypes !== BrowserType.Chrome as number || Build.OS !== kBOS.MAC as number) ? kChar.Menu
      : ((s = event.key) ? (<RegExpOne> /^F\d/).test(s) : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn)
      ? (s ? Lower(s) : "f" + (i - kKeyCode.maxNotFn)) as kChar.F_num
      : s && s.length > 1 && !_modifierKeys[s] ? Lower(s) as kChar : kChar.None
}

  /** return single characters which only depend on `shiftKey` (CapsLock is ignored) */
const _getKeyCharUsingKeyIdentifier_old_cr = !OnChrome
        || Build.MinCVer >= BrowserVer.MinEnsured$KeyboardEvent$$Key ? 0 as never
      : function (event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL): string {
    let s: string | undefined = event.keyIdentifier,
    keyId: kCharCode = s.startsWith("U+") ? parseInt(s.slice(2), 16) : 0;
    if (keyId < kCharCode.minNotAlphabet) {
      return keyId < kCharCode.minNotSpace ? ""
          : shiftKey && keyId > kCharCode.maxNotNum && keyId < kCharCode.minNotNum
          ? kChar.EnNumTrans[keyId - kCharCode.N0]
          : String.fromCharCode(keyId < kCharCode.minAlphabet || shiftKey ? keyId : keyId + kCharCode.CASE_DELTA);
    } else {
      // here omits a `(...)` after the first `&&`, since there has been `keyId >= kCharCode.minNotAlphabet`
      return Build.OS !== kBOS.MAC as number && keyId > keyIdCorrectionOffset_old_cr_!
          && (keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11
          ? kCrct![keyId + shiftKey * 12]
          : "";
    }
} as (event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL) => string

/**
 * * return `"space"` for the <Space> key - in most code it needs to be treated as a long key
 */
export const char_ = (eventWrapper: HandlerNS.Event, forceASCII: number): kChar => {
  let event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "location" | "shiftKey" | "altKey">
        = eventWrapper.e
  const shiftKey = OnFirefox ? hasShift_ff!(event as KeyboardEvent) : event.shiftKey
  // on macOS, Alt+T can cause `.key === "Unidentified"` - https://github.com/gdh1995/vimium-c/issues/615
  let mapped: number, key = event.key!, isDeadKey = !OnEdge && (key === "Dead" || key === "Unidentified")
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && !key) {
    // since Browser.Min$KeyboardEvent$MayHave$$Key and before .MinEnsured$KeyboardEvent$$Key
    // event.key may be an empty string if some modifier keys are held on
    // it seems that KeyIdentifier doesn't follow keyboard layouts
    key = _getKeyName(event) // it's safe to skip the check of `event.keyCode`
        || /*#__NOINLINE__*/ _getKeyCharUsingKeyIdentifier_old_cr(event as Pick<OldKeyboardEvent, "keyIdentifier">
            , +shiftKey as BOOL)
  } else if (!OnEdge && (fgCache.l & kKeyLayout.alwaysIgnore
      || fgCache.l & kKeyLayout.ignoreIfAlt && event.altKey || isDeadKey
      || forceASCII && (forceASCII |= (key > kChar.maxASCII && key.length === 1) as boolean | BOOL as BOOL,
          forceASCII & 1))) {
      /** return strings of 1-N characters and CapsLock is ignored */
    let code = event.code!, prefix = code.slice(0, 3), isKeyShort = key.length < 2 || isDeadKey
    if (prefix !== "Num") { // not (Numpad* or NumLock)
      // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
      if (prefix === "Key" || prefix === "Dig" || prefix === "Arr") {
        code = code.slice(code < "K" ? 5 : 3);
      }
      // Note: <Alt+P> may generate an upper-case '\u013b' on Mac,
      // so for /^Key[A-Z]/, can assume the status of CapsLock.
      // https://github.com/philc/vimium/issues/2161#issuecomment-225813082
      key = code.length === 1 && isKeyShort
            ? !shiftKey || code < "0" || code > "9" ? code : kChar.EnNumTrans[+code]
            : _modifierKeys[key]
            ? fgCache.l > kKeyLayout.MapModifierStart - 1
              && (fgCache.l >> kKeyLayout.MapModifierOffset) === event.location ? MDF : ""
            : key === "Escape" ? kChar.esc // e.g. https://github.com/gdh1995/vimium-c/issues/129
            // 1. an example of code is empty is https://github.com/philc/vimium/issues/3451#issuecomment-569124026
            // 2. if both `key` is long, then prefer `key` to support outside mappings (like composed-key-as-an-action).
            //    see https://github.com/gdh1995/vimium-c/issues/435
            : code.length < 2 || !isKeyShort ? key.startsWith("Arrow") && key.slice(5) || key
            : (mapped = _codeCorrectionMap.indexOf(code)) < 0 ? code
            : (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key || Build.OS & kBOS.MAC
                ? kCrct! : kChar.CharCorrectionList)[mapped + 12 * +shiftKey]
    }
    key = shiftKey && key.length < 2 ? key : Lower(key)
  } else if (key.length > 1 || key === " ") {
    key = /*#__NOINLINE__*/ _getKeyName(event)
  } else {
    key = fgCache.l & kKeyLayout.ignoreCaps ? shiftKey ? key.toUpperCase() : Lower(key) : key
    if (Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !os_)
        && (OnChrome || OnFirefox) && shiftKey && key < kChar.maxASCII) { // "~" is upper-case
      mapped = getKeyStat_(event as typeof eventWrapper.e, 1)
      const kSpecialModifier = OnChrome ? 6 : 4
      key = !(mapped & kSpecialModifier) ? mapped & 1 || fgCache.l & kKeyLayout.ignoreCaps
              || !(event as typeof eventWrapper.e).getModifierState("CapsLock") ? key : Lower(key)
          : (mapped = kCrct!.indexOf(key)) >= 0 ? kCrct![(mapped % 12) + 12]
          : key > kChar.maxNotNum && key < kChar.minNotNum ? kChar.EnNumTrans[+key]
          : key
    }
  }
  return forceASCII === (kKeyLayout.inCmdIgnoreIfNotASCII | 1) ? key as kChar : eventWrapper.c = key as kChar
}

export const keybody_ = (key: string): kChar => (key.slice(key.lastIndexOf("-") + 1) || key && kChar.minus) as kChar

export const hasShift_ff = OnFirefox ? (
    event: Pick<KeyboardEvent, "shiftKey" | "key" | "getModifierState" | "altKey" | "metaKey">): boolean => {
  const key = event.key!
  const lower = key.length === 1 && (Build.OS & ~kBOS.MAC || fgCache.l & kKeyLayout.inPrivResistFp_ff) ? Lower(key) : ""
  if (lower && event.getModifierState("CapsLock") && key.toUpperCase() !== lower) {
    // if `privacy.resistFingerprinting` && CapsLock && A-Z, then Shift is reversed
    if (!(Build.OS & kBOS.MAC) || Build.OS & ~kBOS.MAC && os_) {
      return key === lower
    }
    // try to minimize the affect that `inPrivResistFp` is not enabled correctly
    if ((!(Build.OS & ~kBOS.MAC) || fgCache.l & kKeyLayout.inPrivResistFp_ff)
        && !event.altKey && !event.metaKey && isAsContent) {
      return false
    }
  }
  return event.shiftKey
} : 0 as never as null

export const getKeyStat_ = (event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">
      , ignoreShift?: 1): KeyStat =>
    <number> <boolean|number> event.altKey |
            (<number> <boolean|number> event.ctrlKey * 2) |
            (<number> <boolean|number> event.metaKey * 4) |
            (ignoreShift ? 0
              : <number> <boolean|number> (OnFirefox ? hasShift_ff!(event as KeyboardEvent) : event.shiftKey) * 8)

export const isRepeated_ = (event: HandlerNS.Event): boolean => {
  const repeat = event.e.repeat
  if (OnChrome ? Build.MinCVer >= BrowserVer.MinCorrect$KeyboardEvent$$Repeat
      : OnFirefox ? !(Build.OS & kBOS.LINUX_LIKE) : true) {
    return repeat
  }
  return repeat || (OnChrome ? chromeVer_ < BrowserVer.MinCorrect$KeyboardEvent$$Repeat
    : OnFirefox && (Build.OS === kBOS.LINUX_LIKE as number || os_ === kOS.linuxLike))
      && !!(keydownEvents_[event.i] && event.i)
}

export const consumeKey_mac = (keyToConsume: kKeyCode, eventToConsume: KeyboardEvent): void => {
  if (!(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && os_ || !eventToConsume.metaKey) {
    keydownEvents_[keyToConsume] = 1
  }
}

export const isEscape_ = (key: string): HandlerResult.AdvancedEsc | HandlerResult.PlainEsc | HandlerResult.Nothing => {
    return key === kChar.esc ? HandlerResult.AdvancedEsc
        : key === "c-" + kChar.bracketLeft ? HandlerResult.PlainEsc : HandlerResult.Nothing;
}

/** handler section */

export const prevent_ = (event: ToPrevent): void => {
    event.preventDefault(); Stop_(event)
}

export const replaceOrSuppressMost_ = ((id: kHandler, newHandler?: HandlerNS.Handler): void => {
  removeHandler_(id)
  handler_stack.push(newHandler || ((event: HandlerNS.Event): HandlerResult => {
    isEscape_(getMappedKey(event, <kModeId> <number> id)) && removeHandler_(id)
    return event.i === kKeyCode.f12 || event.i === kKeyCode.f5 ? HandlerResult.Suppress : HandlerResult.Prevent;
  }), id)
}) as {
  (id: kHandler, newHandler: HandlerNS.Handler): void
  (id: kHandler.linkHints | kHandler.omni | kHandler.find | kHandler.visual | kHandler.marks): void
}

export const whenNextIsEsc_ = (id: kHandler, modeId: kModeId, onEsc: HandlerNS.VoidHandler<void>): void => {
  replaceOrSuppressMost_(id, (event): HandlerResult => {
    const key = getMappedKey(event, modeId)
    key && removeHandler_(id)
    return isEscape_(key) ? (onEsc(), HandlerResult.Prevent) : HandlerResult.Nothing
  })
}

  /**
   * if not timeout, then only suppress repeated keys; otherwise wait until no new keys for a while
   *
   * @argument callback can only be true if `timeout`; 0 means not to reset timer on a new key
   */
export const suppressTail_ = ((timeout?: number
    , callback?: HandlerNS.VoidHandler<unknown> | 0): HandlerNS.Handler | HandlerNS.VoidHandler<HandlerResult> => {
  let timer: ValidTimeoutID = TimerID.None, now: number, func = (event?: HandlerNS.Event): HandlerResult => {
      if (!timeout) {
        if (isRepeated_(event!)) { return HandlerResult.Prevent }
        exit()
        return HandlerResult.Nothing;
      }
      if (event && (abs_(getTime() - now) > timeout || isEscape_(getMappedKey(event, kModeId.Plain))
            || (event.e as UserTrustedKeyboardEvent).z === fgCache)) {
        exit()
        return HandlerResult.Nothing
      }
      if (!timer || callback !== 0) {
        clearTimeout_(timer)
        now = getTime()
        timer = timeout_(exit, timeout) // safe-time
      }
      return HandlerResult.Prevent;
  }, exit = (): void => {
    removeHandler_(func as never as kHandler.suppressTail)
    callback && isAlive_ && callback()
  }
  timeout && func()
  if (!callback) {
    handler_stack.push(func, func as never as kHandler.suppressTail)
  }
  return func
}) as {
  (timeout?: number, callback?: undefined): unknown
  (timeout: number, callback: HandlerNS.VoidHandler<any> | 0): HandlerNS.VoidHandler<HandlerResult>
}

export const removeHandler_ = (id: kHandler): void => {
  const i = handler_stack.lastIndexOf(id)
  i > 0 &&  handler_stack.splice(i - 1, 2)
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
