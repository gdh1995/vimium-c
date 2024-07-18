import {
  doc, esc, os_, isEnabled_, isTop, keydownEvents_, set_esc, safer, Stop_, Lower, OnChrome, OnFirefox, timeStamp_, vApi,
  chromeVer_, deref_, fgCache, OnEdge, set_inherited_
} from "../lib/utils"
import {
  set_getMappedKey, char_, getMappedKey, isEscape_, getKeyStat_, prevent_, handler_stack, keybody_, SPC, hasShift_ff,
  replaceOrSuppressMost_, removeHandler_, isRepeated_, consumeKey_mac, MODIFIER
} from "../lib/keyboard_utils"
import {
  deepActiveEl_unsafe_, getSelection_, ElementProto_not_ff, getElDesc_, blur_unsafe, getEventPath
} from "../lib/dom_utils"
import { wndSize_ } from "../lib/rect"
import { post_, runtimeConnect, runtime_port } from "./port"
import { doExitOnClick_, removeSelection, toExitOnClick_ } from "./dom_ui"
import {
  exitInsertMode, focusUpper, insert_global_, insert_Lock_, findNewEditable, passAsNormal, raw_insert_lock,
  setupSuppress, suppressType, readonlyFocused_,
} from "./insert"
import { keyIsDown as scroll_keyIsDown, onScrolls, scrollTick } from "./scroller"
import { catchAsyncErrorSilently, evIDC_cr, lastHovered_, set_evIDC_cr, unhover_async } from "./async_dispatcher"
import { hudHide } from "./hud"

let passKeys: Set<string> | "" | null = null
let isPassKeysReversed = false
let mapKeyTypes = kMapKey.NONE
let mappedKeys: SafeDict<string> | null = null
let keyFSM: KeyFSM
let currentKeys: string
let curKeyTimestamp: number
let nextKeys: KeyFSM | ReadonlyChildKeyFSM & SafeObject | null

let maybeEscIsHidden_ff: kKeyCode | 0 = kKeyCode.esc
let isWaitingAccessKey = false
let isCmdTriggered: kKeyCode = kKeyCode.None
let noopEventHandler: EventListenerObject["handleEvent"] & (() => void) = Object.is as any
interface MouseEventListener extends EventListenerObject { handleEvent (evt: MouseEventToPrevent): ELRet }
let anyClickHandler: MouseEventListener = { handleEvent: noopEventHandler }

let onPassKey: ((this: void, event?: KeyboardEvent | 0) => void) | null | undefined

set_esc(function<T extends Exclude<HandlerResult, HandlerResult.ExitNormalMode>> (i: T): T {
  currentKeys = ""; nextKeys = null; curKeyTimestamp = 0; return i
})

export {
  passKeys, keyFSM, mappedKeys, mapKeyTypes, currentKeys, isWaitingAccessKey, isCmdTriggered, anyClickHandler,
  onPassKey, isPassKeysReversed, noopEventHandler as noopHandler, maybeEscIsHidden_ff
}
export function set_isCmdTriggered (_newTriggerred: kKeyCode): kKeyCode { return isCmdTriggered = _newTriggerred }
export function set_passKeys (_newPassKeys: typeof passKeys): void { passKeys = _newPassKeys }
export function set_nextKeys (_newNK: KeyFSM | null): void { nextKeys = _newNK }
export function set_onPassKey (_newOnPassKey: typeof onPassKey): void { onPassKey = _newOnPassKey }
export function set_isPassKeysReversed (_newPKReversed: boolean): void { isPassKeysReversed = _newPKReversed }
export function set_keyFSM (_newKeyFSM: KeyFSM): KeyFSM { return keyFSM = _newKeyFSM }
export function set_mapKeyTypes (_newMapKeyTypes: kMapKey): void { mapKeyTypes = _newMapKeyTypes }
export function set_mappedKeys (_newMappedKeys: typeof mappedKeys): void { mappedKeys = _newMappedKeys }
export function set_currentKeys (_newCurrentKeys: string): void { currentKeys = _newCurrentKeys }
export function set_maybeEscIsHidden_ff (_isEsc: 0): void { maybeEscIsHidden_ff = _isEsc }

export const inheritKeyMappings = (newState: ReturnType<VApiTy["y"]>): void => {
  if (newState.m[3]) {
    [keyFSM, mappedKeys, mapKeyTypes, vApi.z] = newState.m
    set_inherited_(PortType.confInherited)
  }
}

set_getMappedKey(((eventWrapper: HandlerNS.Event, mode: kModeId): string => {
  const char: kChar | "" = eventWrapper.v ? ""
      : !OnEdge && mode > kModeId.MIN_EXPECT_ASCII - 1 && mode < kModeId.MIN_NOT_EXPECT_ASCII
        && fgCache.l & kKeyLayout.inCmdIgnoreIfNotASCII ? char_(eventWrapper, kKeyLayout.inCmdIgnoreIfNotASCII)
      : eventWrapper.c !== kChar.INVALID ? eventWrapper.c : char_(eventWrapper, fgCache.l & kKeyLayout.ignoreIfNotASCII)
  let key: string = char, mapped: string | undefined;
  if (char) {
    const event = eventWrapper.e
    let baseMod = `${event.altKey ? "a-" : ""}${event.ctrlKey ? "c-" : ""}${event.metaKey ? "m-" : ""}`,
    chLower = Lower(char), isLong = char.length > 1,
    mod = (OnFirefox ? hasShift_ff!(event as KeyboardEvent) : event.shiftKey)
        && (isLong || baseMod && char.toUpperCase() !== chLower) ? baseMod + "s-" : baseMod
    if (!(Build.NDEBUG || char.length === 1 || char.length > 1 && char === chLower)) {
      console.error(`Assert error: mapKey get an invalid char of "${char}" !`);
    }
    key = isLong || mod ? mod + chLower : char;
    if (mappedKeys && mode < kModeId.NO_MAP_KEY_BUT_MAY_IGNORE_LAYOUT) {
      mapped = mapKeyTypes & (mode > kModeId.Insert ? kMapKey.otherMode : mode)
          && mappedKeys[key + ":" + GlobalConsts.ModeIds[mode]]
          || (mapKeyTypes & kMapKey.plain ? mappedKeys[key] : "")
      key = mapped ? mode > kModeId.max_not_command
              && mapped.startsWith("v-") ? (eventWrapper.v = mapped as `v-${string}`, "") : mapped
          : mapKeyTypes & kMapKey.char && !isLong && (mapped = mappedKeys[chLower])
            && mapped.length < 2 && (baseMod = mapped.toUpperCase()) !== mapped
          ? mod ? mod + mapped : char === chLower ? mapped : baseMod
          : key
    }
  }
  return key;
}) satisfies typeof getMappedKey)

export const checkKey = ((event: HandlerNS.Event, key: string
    , /** 0 means normal; 1 means (plain) insert; 2 means on-top normal */ modeType?: BOOL
    ): HandlerResult.Nothing | HandlerResult.Prevent | HandlerResult.PlainEsc | HandlerResult.AdvancedEsc => {
  // when checkKey, Vimium C must be enabled, so passKeys won't be `""`
  if (passKeys && !currentKeys
      && passKeys.has(mappedKeys ? getMappedKey(event, kModeId.NO_MAP_KEY) : key) !== isPassKeysReversed
      && !passAsNormal) {
    // a normal exclusion passKeys should not include `<v-***>`, so here just ignore the case to make code shorter
    return esc!(HandlerResult.Nothing)
  }
  let j: ReadonlyChildKeyFSM | ValidKeyAction | KeyAction.INVALID | ReturnType<typeof isEscape_> | undefined
      = isEscape_(key)
  if (j) {
    return nextKeys ? (esc!(HandlerResult.ExitNormalMode), HandlerResult.Prevent) : j;
  }
  let key2 = key, isVirtual = key.startsWith("v-") // key may come from `a mode < kModeId.max_not_command`
  if (!nextKeys || !(j = nextKeys[key])) {
    j = isVirtual ? keyFSM[key] || KeyAction.cmd
        : !modeType
          ? keyFSM[currentKeys && mapKeyTypes & kMapKey.normalMode ? key2 = getMappedKey(event, kModeId.Normal) : key]
        : modeType < 2 &&
        // insert mode: not accept a sequence of multiple keys,
        // because the simplified keyFSM can not be used when nextKeys && !nextKeys[key]
          (keyFSM[key2 = key + ":" + GlobalConsts.InsertModeId]
            || (key2 = keybody_(key)) < kChar.minNotF_num && key2 > kChar.maxNotF_num && keyFSM[key2 = key]
          ) === KeyAction.cmd
        ? KeyAction.cmd : KeyAction.INVALID
    if (!j || currentKeys && passKeys
          && passKeys.has(mappedKeys ? getMappedKey(event, kModeId.NO_MAP_KEY) : key) !== isPassKeysReversed
          && !passAsNormal) {
      return esc!(nextKeys && modeType ? HandlerResult.Prevent : HandlerResult.Nothing)
    }
    if (j !== KeyAction.cmd) { currentKeys = ""; }
  }
  currentKeys += key2.length > 1 ? key2 = `<${key2}>` : key2
  let result = HandlerResult.Prevent
  if (j === KeyAction.cmd) {
    if (Build.NDEBUG && Build.Mangle || Build.MV3) {
      prevent_(event.e)
      runtime_port || runtimeConnect()
    }
    post_({ H: kFgReq.key, k: currentKeys, l: event.i, e: getElDesc_(raw_insert_lock) });
    esc!(HandlerResult.Prevent);
    isCmdTriggered = event.i || kKeyCode.True
  } else {
    curKeyTimestamp = timeStamp_(event.e)
    if (j !== KeyAction.count) {
      nextKeys = safer(j)
      if (isVirtual) {
        replaceOrSuppressMost_(kHandler.onTopNormal, /*#__NOINLINE__*/ checkKeyOnTop)
        hudHide()
      } else if (event.c === MODIFIER && currentKeys === key2) {
        curKeyTimestamp -= GlobalConsts.KeySequenceTimeout - GlobalConsts.ModifierKeyTimeout
        result = HandlerResult.Nothing
      }
    } else {
      nextKeys = keyFSM
    }
  }
  return result
}) as {
  (event: HandlerNS.Event, key: `v-${string}`): HandlerResult.Nothing | HandlerResult.Prevent
  (event: HandlerNS.Event, key: string, modeType: BOOL | 2
    ): HandlerResult.Nothing | HandlerResult.Prevent | HandlerResult.PlainEsc | HandlerResult.AdvancedEsc
}

export const checkKeyOnTop = (event: HandlerNS.Event): HandlerResult => {
  const consumed = currentKeys && event.i !== kKeyCode.ime,
  key = consumed && getMappedKey(event, kModeId.Next) // never set event.v - see kModeId.max_not_command
  key && checkKey(event, key, 2)
  consumed && currentKeys || hudHide(removeHandler_(kHandler.onTopNormal))
  return consumed ? HandlerResult.Prevent : HandlerResult.Nothing
}

const checkAccessKey_cr = OnChrome ? (event: HandlerNS.Event): void => {
  /** On Firefox, access keys are only handled during keypress events, so it has been "hooked" well:
   * https://dxr.mozilla.org/mozilla/source/content/events/src/nsEventStateManager.cpp#960 .
   * And the modifier stat for access keys is user-configurable: `ui.key.generalAccessKey`
   * * there was another one (`ui.key.contentAccess`) but it has been removed from the latest code
   */
  if (event.e.altKey) {
    /** On Chrome, there're 2 paths to trigger accesskey:
     * * `blink::WebInputEvent::kRawKeyDown` := `event#keydown` => `blink::WebInputEvent::kChar` := `handleAccessKey`
     * * `blink::WebInputEvent::kKeyDown` := `handleAccessKey` + `event#keydown`
     * In source code on 2019-10-19, the second `WebInputEvent::kKeyDown` is almost not in use (except in Pepper API),
     * and https://cs.chromium.org/chromium/src/third_party/blink/public/platform/web_input_event.h?l=110&q=kKeyDown
     *     says that Android uses `WebInputEvent::kKeyDown` and Windows prefers `RawKeyDown+Char`,
     * so, here ignores the 2nd path.
     */
    // during tests, an access key of ' ' (space) can be triggered on macOS (2019-10-20)
    getMappedKey(event, kModeId.Plain)
    if (isWaitingAccessKey !== (event.c.length === 1 || event.c === SPC)
        && getKeyStat_(event.e, 1) /* Chrome ignore .shiftKey */ ===
            (!(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && os_
              ? KeyStat.altKey : KeyStat.altKey | KeyStat.ctrlKey)
        ) {
      resetAnyClickHandler_cr(!isWaitingAccessKey)
    }
  }
} : 0 as never

export const resetAnyClickHandler_cr = (enable?: boolean): void => {
  isWaitingAccessKey = !!enable
  anyClickHandler.handleEvent = enable ? onAnyClick_cr : toExitOnClick_ ? doExitOnClick_ : noopEventHandler
}

const onAnyClick_cr = OnChrome ? (event: MouseEventToPrevent): void => {
  // Note: here `event` may be a simulated one from a browser itself or page scripts
  // here has been on Chrome
  if (isWaitingAccessKey
      && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted ? event.isTrusted : event.isTrusted !== false)
      && !event.detail && !event.clientY /* a simulated click from a keyboard event is "positionless" */
      ) {
    const path = getEventPath(event),
    t = (Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
         ? Build.MinCVer >= BrowserVer.MinEnsured$Event$$Path || path
         : (Build.MinCVer >= BrowserVer.MinEnsured$Event$$Path || path) && path!.length > 1)
        ? path![0] as Element : event.target as Element;
    if (ElementProto_not_ff!.getAttribute.call(t, "accesskey")) {
      // if a script has modified [accesskey], then do nothing on - just in case.
      /*#__NOINLINE__*/ resetAnyClickHandler_cr();
      prevent_(event);
      if (Build.MinCVer >= BrowserVer.MinAccessKeyCausesFocus || chromeVer_ > BrowserVer.MinAccessKeyCausesFocus - 1) {
        blur_unsafe(t)
      }
    }
  }
} : 0 as never

export const onKeydown = (event: KeyboardEventToPrevent): void => {
  const key = event.keyCode;
  if (!isEnabled_
      || (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted ? !event.isTrusted
          : event.isTrusted === false) // skip checks of `instanceof KeyboardEvent` if checking `!.keyCode`
          && (event as UserTrustedKeyboardEvent).z !== fgCache
      || !key) { return; } // not only Chrome Password Saver but also AutoFill (WebFormControlElement::SetAutofillValue)
  const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event, i: key, v: ""}
  if (scroll_keyIsDown && onScrolls(eventWrapper)) {
    OnChrome && checkAccessKey_cr(eventWrapper)
    return;
  }
  OnChrome && isWaitingAccessKey && /*#__NOINLINE__*/ resetAnyClickHandler_cr()
  OnFirefox && key === kKeyCode.esc && event.type[3] < kChar.e && (maybeEscIsHidden_ff = 0)
  OnFirefox && raw_insert_lock && insert_Lock_()
  let action = HandlerResult.Nothing, keyStr: string;
  let handler_ind = handler_stack.length
  if ((Build.NDEBUG && Build.Mangle || Build.MV3) && handler_ind) { runtime_port || runtimeConnect() }
  for (; 0 < handler_ind && action === HandlerResult.Nothing; ) {
    action = (handler_stack[handler_ind -= 2] as HandlerNS.Handler)(eventWrapper);
  }
  if (eventWrapper.v) { action = checkKey(eventWrapper, eventWrapper.v) }
  if (action) { /* empty */ }
  else if (insert_global_
      || (raw_insert_lock || /*#__NOINLINE__*/ findNewEditable()) && !suppressType && !passAsNormal
          && readonlyFocused_ >= 0) {
    keyStr = key === kKeyCode.ime ? "" : mapKeyTypes & (insert_global_ && insert_global_.k
                ? kMapKey.insertMode | kMapKey.plain : kMapKey.insertMode | kMapKey.plain_in_insert)
          || (insert_global_ ? insert_global_.k
                : mapKeyTypes & kMapKey.directInsert || key > kKeyCode.maxNotFn && key < kKeyCode.minNotFn)
              && (key < kKeyCode.N0 || key > kKeyCode.menuKey || key > kKeyCode.N9 && key < kKeyCode.A
                  || getKeyStat_(event, 1))
          || (OnFirefox && key === kKeyCode.bracketLeftOnFF || key > kKeyCode.minNotFn
              ? event.ctrlKey : key === kKeyCode.esc)
          ? getMappedKey(eventWrapper, mapKeyTypes & kMapKey.insertMode ? kModeId.Insert : kModeId.Plain)
          : (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$KeyboardEvent$$Key
              || event.key) && event.key!.length === 1 ? kChar.INVALID : ""
    if (insert_global_ ? insert_global_.k ? keyStr === insert_global_.k : isEscape_(keyStr)
        : !keyStr ? HandlerResult.Nothing : keyStr.length < 2 ? esc!(HandlerResult.Nothing)
        : (action = checkKey(eventWrapper, keyStr, 1)) > HandlerResult.MaxNotEsc
    ) {
      OnChrome && checkAccessKey_cr(eventWrapper) // even if nothing will be done or `passEsc` matches
      if (!insert_global_ && (raw_insert_lock && raw_insert_lock === doc.body || !isTop && wndSize_() < 5)) {
        isRepeated_(eventWrapper) && focusUpper(key, true, event);
        action = /* the real is HandlerResult.PassKey; here's for smaller code */ HandlerResult.Nothing;
      } else {
        action = /*#__NOINLINE__*/ exitInsertMode(event.target as Element, eventWrapper)
      }
    }
  }
  else if (key > kKeyCode.maxNotPrintable ? key !== kKeyCode.ime
      : ((1 << kKeyCode.backspace | 1 << kKeyCode.tab | 1 << kKeyCode.esc | 1 << kKeyCode.enter
          | 1 << kKeyCode.altKey | 1 << kKeyCode.ctrlKey | 1 << kKeyCode.shiftKey
          ) >> key) & 1) {
      if (curKeyTimestamp && timeStamp_(event) - curKeyTimestamp > GlobalConsts.KeySequenceTimeout) {
        esc!(HandlerResult.Nothing)
      }
      keyStr = getMappedKey(eventWrapper, currentKeys ? kModeId.Next : kModeId.Normal)
      action = keyStr ? checkKey(eventWrapper, keyStr, 0) : HandlerResult.Nothing
      if (action > HandlerResult.MaxNotEsc) {
        action = action > HandlerResult.PlainEsc ? /*#__NOINLINE__*/ onEscDown(event, key, isRepeated_(eventWrapper))
            : HandlerResult.Nothing;
      }
      if (action === HandlerResult.Nothing && suppressType && eventWrapper.c.length === 1 && !getKeyStat_(event)) {
        // not suppress ' ', so that it's easier to exit this mode
        action = HandlerResult.Prevent;
      }
  }
  if (action < HandlerResult.MinStopOrPreventEvents) {
    // https://github.com/gdh1995/vimium-c/issues/390#issuecomment-894687506
    if (Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !os_) &&
        keydownEvents_[key] === 1 && !(Build.BTypes & BrowserType.Chrome ? event.repeat : isRepeated_(eventWrapper))) {
      keydownEvents_[key] = 0
    }
    return
  }
  if (action > HandlerResult.MaxNotPrevent) {
    OnChrome && checkAccessKey_cr(eventWrapper)
    if (OnChrome && !evIDC_cr && (Build.MinCVer >= BrowserVer.MinEnsured$InputDeviceCapabilities
        || chromeVer_ >= BrowserVer.MinEnsured$InputDeviceCapabilities)) {
      set_evIDC_cr((event as UIEvent & {sourceCapabilities?: InputDeviceCapabilities}).sourceCapabilities)
    }
    prevent_(event);
  } else {
    Stop_(event);
  }
  Build.OS & kBOS.MAC ? consumeKey_mac(key, event) : (keydownEvents_[key] = 1)
}

/** @param key should be valid */
export const onEscDown = (event: KeyboardEventToPrevent | 0, key: kKeyCode, repeat: boolean
  ): HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent => {
  let action: HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent = HandlerResult.Prevent
  let activeEl = repeat || !isTop ? deepActiveEl_unsafe_() : null
  /** if `notBody` then `activeEl` is not null */
  if (!repeat && removeSelection()) {
    /* empty */
  } else if (repeat && !keydownEvents_[key] && activeEl) {
    activeEl === deref_(lastHovered_) ? void catchAsyncErrorSilently(unhover_async()) : blur_unsafe(activeEl)
  } else if (!isTop && !activeEl) {
    focusUpper(key, repeat, event);
  } else {
    action = HandlerResult.Nothing
  }
  return action;
}

export const onKeyup = (event: KeyboardEventToPrevent): void => {
  let key = event.keyCode;
  if (!isEnabled_
      || (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted ? !event.isTrusted
          : event.isTrusted === false) // skip checks of `instanceof KeyboardEvent` if checking `!.keyCode`
          && (event as UserTrustedKeyboardEvent).z !== fgCache
  ) { return; }
  if (OnFirefox && key === maybeEscIsHidden_ff && key && !keydownEvents_[key] && event.key === "Escape") {
    onKeydown(event)
  }
  if (scroll_keyIsDown && (key === isCmdTriggered || isCmdTriggered < kKeyCode.True + 1)) {
    scrollTick(0);
  }
  isCmdTriggered = kKeyCode.None
  OnChrome && isWaitingAccessKey && /*#__NOINLINE__*/ resetAnyClickHandler_cr()
  if (suppressType && getSelection_().type !== suppressType) {
    setupSuppress();
  }
  if (keydownEvents_[key] && key) {
    keydownEvents_[key] = 0;
    prevent_(event);
  } else if (onPassKey) {
    onPassKey(event)
  }
}

if (!(Build.NDEBUG || kMapKey.normalMode == 1 && kModeId.Normal == 1)) {
  throw "kMapKey_normalMode must: == kModeId_Normal == 1"
}
