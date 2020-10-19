import {
  doc, esc, fgCache, isEnabled_, isTop, keydownEvents_, set_esc, VOther, safer, Stop_, isTY, Lower
} from "../lib/utils"
import {
  set_getMappedKey, char_, getMappedKey, isEscape_, getKeyStat_, prevent_, handler_stack, keybody_, SPC
} from "../lib/keyboard_utils"
import { activeEl_unsafe_, getSelection_, ElementProto } from "../lib/dom_utils"
import { wndSize_ } from "../lib/rect"
import { post_ } from "./port"
import { removeSelection } from "./dom_ui"
import {
  exitInsertMode, focusUpper, insert_global_, insert_Lock_, isInInsert, raw_insert_lock, setupSuppress, suppressType,
} from "./insert"
import { keyIsDown as scroll_keyIsDown, onScrolls, scrollTick } from "./scroller"

let passKeys: SafeEnum | null | "" = null
let isPassKeysReversed = false
let mapKeyTypes = kMapKey.NONE
let mappedKeys: SafeDict<string> | null = null
let keyFSM: KeyFSM
let currentKeys = ""  
let nextKeys: KeyFSM | ReadonlyChildKeyFSM & SafeObject | null = null

let isWaitingAccessKey = false
let isCmdTriggered: kKeyCode = kKeyCode.None
let noopEventHandler: EventListenerObject["handleEvent"] = Object.is as any
interface MouseEventListener extends EventListenerObject { handleEvent (evt: MouseEventToPrevent): ELRet }
let anyClickHandler: MouseEventListener = { handleEvent: noopEventHandler }

let onKeyup2: ((this: void, event: Pick<KeyboardEvent, "keyCode"> | 0) => void) | null | undefined

/*#__INLINE__*/ set_esc(function<T extends Exclude<HandlerResult, HandlerResult.ExitPassMode>> (i: T): T {
  currentKeys = ""; nextKeys = null; return i;
})

export {
  passKeys, keyFSM, mappedKeys, currentKeys,
  isWaitingAccessKey, isCmdTriggered, anyClickHandler,
  onKeyup2, isPassKeysReversed,
}
export function resetIsCmdTriggered (): void { isCmdTriggered = kKeyCode.None }
export function set_passKeys (_newPassKeys: SafeEnum | null | ""): void { passKeys = _newPassKeys }
export function installTempCurrentKeyStatus (): void { currentKeys = "", nextKeys = keyFSM }
export function set_onKeyup2 (_newOnKeyUp: typeof onKeyup2): void { onKeyup2 = _newOnKeyUp }
export function set_isPassKeysReversed (_newPKReversed: boolean): void { isPassKeysReversed = _newPKReversed }
export function set_keyFSM (_newKeyFSM: KeyFSM): KeyFSM { return keyFSM = _newKeyFSM }
export function set_mapKeyTypes (_newMapKeyTypes: kMapKey): void { mapKeyTypes = _newMapKeyTypes }
export function set_mappedKeys (_newMappedKeys: typeof mappedKeys): void { mappedKeys = _newMappedKeys }


set_getMappedKey((eventWrapper: HandlerNS.Event, mode: kModeId): string => {
  const char = eventWrapper.c !== kChar.INVALID ? eventWrapper.c : char_(eventWrapper), event = eventWrapper.e;
  let key: string = char, mapped: string | undefined;
  if (char) {
    let baseMod = `${event.altKey ? "a-" : ""}${event.ctrlKey ? "c-" : ""}${event.metaKey ? "m-" : ""}`,
    chLower = Lower(char), isLong = char.length > 1,
    mod = event.shiftKey && (isLong || baseMod && char.toUpperCase() !== chLower) ? baseMod + "s-" : baseMod;
    if (!(Build.NDEBUG || char.length === 1 || char.length > 1 && char === chLower)) {
      console.error(`Assert error: mapKey get an invalid char of "${char}" !`);
    }
    key = isLong || mod ? mod + chLower : char;
    if (mappedKeys && mode < kModeId.NO_MAP_KEY) {
      mapped = mode && mapKeyTypes & (kMapKey.insertMode | kMapKey.otherMode)
          && mappedKeys[key + GlobalConsts.DelimeterForKeyCharAndMode + GlobalConsts.ModeIds[mode]]
          || (mapKeyTypes & kMapKey.normal ? mappedKeys[key] : "")
      key = mapped ? mapped : mapKeyTypes & kMapKey.char && !isLong && (mapped = mappedKeys[chLower])
            && mapped.length < 2 && (baseMod = mapped.toUpperCase()) !== mapped
          ? mod ? mod + mapped : char === chLower ? mapped : baseMod : key
    }
  }
  return key;
})

const checkKey = (event: HandlerNS.Event, key: string, keyWithoutModeID: string
    ): HandlerResult.Nothing | HandlerResult.Prevent | HandlerResult.PlainEsc | HandlerResult.AdvancedEsc => {
  // when checkKey, Vimium C must be enabled, so passKeys won't be `""`
  const key0 = passKeys && key ? mappedKeys ? getMappedKey(event, kModeId.NO_MAP_KEY) : keyWithoutModeID : "";
  if (!key || key0 && !currentKeys && (key0 in <SafeEnum> passKeys) !== isPassKeysReversed) {
    return key ? esc!(HandlerResult.Nothing) : HandlerResult.Nothing;
  }
  let j: ReadonlyChildKeyFSM | ValidKeyAction | ReturnType<typeof isEscape_> | undefined = isEscape_(keyWithoutModeID)
  if (j) {
    Build.BTypes & BrowserType.Chrome && mapKeyTypes & (kMapKey.normal | kMapKey.insertMode | kMapKey.otherMode) &&
    checkPotentialAccessKey(event)
    return nextKeys ? (esc!(HandlerResult.ExitPassMode), HandlerResult.Prevent) : j;
  }
  if (!nextKeys || (j = nextKeys[key]) == null) {
    j = keyFSM[key];
    if (j == null || nextKeys && key0 && (key0 in <SafeEnum> passKeys) !== isPassKeysReversed) {
      return esc!(HandlerResult.Nothing);
    }
    if (j !== KeyAction.cmd) { currentKeys = ""; }
  }
  currentKeys += key.length > 1 ? `<${key}>` : key;
  if (j === KeyAction.cmd) {
    post_({ H: kFgReq.key, k: currentKeys, l: event.i });
    esc!(HandlerResult.Prevent);
    isCmdTriggered = event.i || kKeyCode.True
  } else {
    nextKeys = j !== KeyAction.count ? safer(j) : keyFSM;
  }
  return HandlerResult.Prevent;
}

const checkPotentialAccessKey = (event: HandlerNS.Event): void => {
  /** On Firefox, access keys are only handled during keypress events, so it has been "hooked" well:
   * https://dxr.mozilla.org/mozilla/source/content/events/src/nsEventStateManager.cpp#960 .
   * And the modifier stat for access keys is user-configurable: `ui.key.generalAccessKey`
   * * there was another one (`ui.key.contentAccess`) but it has been removed from the latest code
   */
  if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)
      && event.e.altKey) {
    /** On Chrome, there're 2 paths to trigger accesskey:
     * * `blink::WebInputEvent::kRawKeyDown` := `event#keydown` => `blink::WebInputEvent::kChar` := `handleAccessKey`
     * * `blink::WebInputEvent::kKeyDown` := `handleAccessKey` + `event#keydown`
     * In source code on 2019-10-19, the second `WebInputEvent::kKeyDown` is almost not in use (except in Pepper API),
     * and https://cs.chromium.org/chromium/src/third_party/blink/public/platform/web_input_event.h?l=110&q=kKeyDown
     *     says that Android uses `WebInputEvent::kKeyDown` and Windows prefers `RawKeyDown+Char`,
     * so, here ignores the 2nd path.
     */
    // during tests, an access key of ' ' (space) can be triggered on macOS (2019-10-20)
    event.c === kChar.INVALID && char_(event);
    if (isWaitingAccessKey !== (event.c.length === 1 || event.c === SPC)
        && (getKeyStat_(event.e) & KeyStat.ExceptShift /* Chrome ignore .shiftKey */) ===
            (fgCache.o ? KeyStat.altKey : KeyStat.altKey | KeyStat.ctrlKey)
        ) {
      isWaitingAccessKey = !isWaitingAccessKey;
      anyClickHandler.handleEvent = isWaitingAccessKey ? onAnyClick : noopEventHandler;
    }
  }
}

export const resetAnyClickHandler = (): void => {
  isWaitingAccessKey = false; anyClickHandler.handleEvent = noopEventHandler;
}

const onAnyClick = (event: MouseEventToPrevent): void => {
  // Note: here `event` may be a simulated one from a browser itself or page scripts
  // here has been on Chrome
  if (isWaitingAccessKey
      && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted ? event.isTrusted : event.isTrusted !== false)
      && !event.detail && !event.clientY /* exclude those simulated (e.g. generated by element.click()) */
      ) {
    const path = event.path,
    t = (Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
         ? Build.MinCVer >= BrowserVer.MinEnsured$Event$$Path || path
         : (Build.MinCVer >= BrowserVer.MinEnsured$Event$$Path || path) && path!.length > 1)
        ? path![0] as Element : event.target as Element;
    if (ElementProto().getAttribute.call(t, "accesskey")) {
      // if a script has modified [accesskey], then do nothing on - just in case.
      /*#__NOINLINE__*/ resetAnyClickHandler();
      prevent_(event);
    }
  }
}

export const onKeydown = (event: KeyboardEventToPrevent): void => {
  const key = event.keyCode;
  if (!isEnabled_
      || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
          : event.isTrusted === false) // skip checks of `instanceof KeyboardEvent` if checking `!.keyCode`
      || !key) { return; }
  const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event, i: key};
  if (scroll_keyIsDown && onScrolls(event)) {
    Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(eventWrapper);
    return;
  }
  if (Build.BTypes & BrowserType.Chrome) { isWaitingAccessKey && /*#__NOINLINE__*/ resetAnyClickHandler(); }
  if (Build.BTypes & BrowserType.Firefox) { raw_insert_lock && insert_Lock_(); }
  let action = HandlerResult.Nothing, tempStr: string;
  for (let ind = handler_stack.length; 0 < ind && action === HandlerResult.Nothing; ) {
    action = (handler_stack[ind -= 2] as HandlerNS.Handler)(eventWrapper);
  }
  if (action) { /* empty */ }
  else if (/*#__NOINLINE__*/ isInInsert()) {
    let keyStr = mapKeyTypes & (insert_global_ && insert_global_.k
                ? kMapKey.normal_long | kMapKey.char | kMapKey.insertMode : kMapKey.insertMode | kMapKey.normal_long)
          || (key < kKeyCode.N0 || key > kKeyCode.MinNotAlphabet || getKeyStat_(event) & KeyStat.ExceptShift)
              && (insert_global_ ? insert_global_.k
                  : mapKeyTypes & kMapKey.directInsert || key > kKeyCode.maxNotFn && key < kKeyCode.minNotFn)
          || (Build.BTypes & BrowserType.Firefox && key === kKeyCode.bracketleftOnFF || key > kKeyCode.minNotFn
              ? event.ctrlKey : key === kKeyCode.esc)
          ? getMappedKey(eventWrapper, mapKeyTypes & kMapKey.insertMode ? kModeId.Insert : kModeId.Normal)
          : (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$KeyboardEvent$$Key
              || event.key) && event.key!.length === 1 ? kChar.INVALID : ""
    if (insert_global_ ? insert_global_.k ? keyStr === insert_global_.k : isEscape_(keyStr)
        : keyStr.length < 2 ? keyStr ? esc!(HandlerResult.Nothing) : HandlerResult.Nothing
        : (action = checkKey(eventWrapper
            , (tempStr = keybody_(keyStr)) > kChar.maxNotF_num && tempStr < kChar.minNotF_num ? keyStr
              : getMappedKey(eventWrapper, kModeId.NO_MAP_KEY)
                + GlobalConsts.DelimeterForKeyCharAndMode + GlobalConsts.InsertModeId
            , keyStr)) > HandlerResult.MaxNotEsc
    ) {
      if (!insert_global_ && (raw_insert_lock && raw_insert_lock === doc.body || !isTop && wndSize_() < 5)) {
        event.repeat && focusUpper(key, true, event);
        action = /* the real is HandlerResult.PassKey; here's for smaller code */ HandlerResult.Nothing;
      } else {
        action = insert_global_ && insert_global_.p ? (
          Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(eventWrapper),
          HandlerResult.Nothing) : HandlerResult.Prevent;
        /*#__NOINLINE__*/ exitInsertMode(event.target as Element);
      }
    }
  }
  else if (key > kKeyCode.maxNotPrintable ? key !== kKeyCode.ime
      : ((1 << kKeyCode.backspace | 1 << kKeyCode.tab | 1 << kKeyCode.esc | 1 << kKeyCode.enter
          | 1 << kKeyCode.altKey | 1 << kKeyCode.ctrlKey | 1 << kKeyCode.shiftKey
          ) >> key) & 1) {
      tempStr = getMappedKey(eventWrapper, currentKeys ? kModeId.Next : kModeId.Normal)
      action = checkKey(eventWrapper, tempStr, tempStr);
      if (action > HandlerResult.MaxNotEsc) {
        action = action > HandlerResult.PlainEsc ? /*#__NOINLINE__*/ onEscDown(event, key)
            : HandlerResult.Nothing;
      }
      if (action === HandlerResult.Nothing
          && suppressType && eventWrapper.c.length === 1 && !getKeyStat_(event)) {
        // not suppress ' ', so that it's easier to exit this mode
        action = HandlerResult.Prevent;
      }
  }
  if (action < HandlerResult.MinStopOrPreventEvents) { return; }
  if (action > HandlerResult.MaxNotPrevent) {
    Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(eventWrapper);
    prevent_(event);
  } else {
    Stop_(event);
  }
  keydownEvents_[key] = 1;
}

/** @param key should be valid */
const onEscDown = (event: KeyboardEventToPrevent, key: kKeyCode
  ): HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent => {
  let action: HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent = HandlerResult.Prevent
  let repeat = event.repeat
  let activeEl = activeEl_unsafe_(), body = doc.body;
  /** if `notBody` then `activeEl` is not null */
  if (!repeat && removeSelection()) {
    /* empty */
  } else if (repeat && !keydownEvents_[key] && activeEl !== body) {
    (Build.BTypes & ~BrowserType.Firefox ? isTY(activeEl!.blur, kTY.func)
        : activeEl!.blur) && // in case activeEl is unsafe
    activeEl!.blur!();
  } else if (!isTop && activeEl === body) {
    focusUpper(key, repeat, event);
    action = HandlerResult.PassKey;
  } else {
    action = HandlerResult.Default;
  }
  return action;
}

export const onKeyup = (event: KeyboardEventToPrevent): void => {
  let key = event.keyCode;
  if (!isEnabled_
      || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
          : event.isTrusted === false) // skip checks of `instanceof KeyboardEvent` if checking `!.keyCode`
      || !key) { return; }
  if (scroll_keyIsDown && (key === isCmdTriggered || isCmdTriggered < kKeyCode.True + 1)) {
    scrollTick(0);
  }
  /*#__INLINE__*/ resetIsCmdTriggered();
  if (Build.BTypes & BrowserType.Chrome) {
    isWaitingAccessKey && /*#__NOINLINE__*/ resetAnyClickHandler();
  }
  if (suppressType && getSelection_().type !== suppressType) {
    setupSuppress();
  }
  if (keydownEvents_[key]) {
    keydownEvents_[key] = 0;
    prevent_(event);
  } else if (onKeyup2) {
    onKeyup2(event);
  }
}
