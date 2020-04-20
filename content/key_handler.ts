import {
  doc, esc, fgCache, isEnabled_, isTop, keydownEvents_, safer, setEsc, VOther,
} from "../lib/utils.js"
import { post_ } from "../lib/port.js"
import { removeSelection } from "./dom_ui.js"
import {
  exitInsertMode, focusUpper, insert_global, insert_Lock_, isInInsert, raw_insert_lock, setupSuppress, suppressType,
} from "./mode_insert.js"
import { keyIsDown as scroll_keyIsDown, onScrolls, scrollTick } from "./scroller.js"

let passKeys: SafeEnum | null | "" = null
let isPassKeysReverted = false
let mappedKeys: SafeDict<string> | null = null
let keyFSM: KeyFSM
let currentKeys = ""  
let nextKeys: KeyFSM | ReadonlyChildKeyFSM | null = null

let isWaitingAccessKey = false
let isCmdTriggered: BOOL = 0
let noopEventHandler: EventListenerObject["handleEvent"] = Object.is as any
interface MouseEventListener extends EventListenerObject { handleEvent (evt: MouseEventToPrevent): ELRet }
let anyClickHandler: MouseEventListener = { handleEvent: noopEventHandler }

let onKeyup2: ((this: void, event?: Pick<KeyboardEvent, "keyCode">) => void) | null | undefined

/*#__INLINE__*/ setEsc(function<T extends Exclude<HandlerResult, HandlerResult.ExitPassMode>> (i: T): T {
  currentKeys = ""; nextKeys = null; return i;
})

export {
  passKeys, mappedKeys, currentKeys,
  isWaitingAccessKey, isCmdTriggered, anyClickHandler,
  onKeyup2
}
export const resetIsCmdTriggered = (): void => { isCmdTriggered = 0 }
export const setTempPassKeys = (newPassKeys: SafeEnum | null | ""): void => { passKeys = newPassKeys }
export const setTempCurrentKeyStatus = (): void => { currentKeys = "", nextKeys = keyFSM }
export const setOnKeyUp2 = (newOnKeyUp: typeof onKeyup2): void => { onKeyup2 = newOnKeyUp }

export const getMappedKey = (eventWrapper: HandlerNS.Event, mode: kModeId): string => {
  const char = eventWrapper.c !== kChar.INVALID ? eventWrapper.c : VKey.char_(eventWrapper), event = eventWrapper.e;
  let key: string = char, mapped: string | undefined;
  if (char) {
    const baseMod = `${event.altKey ? "a-" : ""}${event.ctrlKey ? "c-" : ""}${event.metaKey ? "m-" : ""}`,
    chLower = char.toLowerCase(), isLong = char.length > 1,
    mod = event.shiftKey && (isLong || baseMod && char.toUpperCase() !== chLower) ? baseMod + "s-" : baseMod;
    if (!(Build.NDEBUG || char.length === 1 || char.length > 1 && char === char.toLowerCase())) {
      console.error(`Assert error: mapKey get an invalid char of "${char}" !`);
    }
    key = isLong || mod ? mod + chLower : char;
    if (mappedKeys && mode < kModeId.NO_MAP_KEY) {
      mapped = mode && mappedKeys[key + GlobalConsts.DelimeterForKeyCharAndMode + GlobalConsts.ModeIds[mode]
          ] || mappedKeys[key];
      key = mapped ? mapped : !isLong && (mapped = mappedKeys[chLower]) && mapped.length < 2
          ? char === chLower ? mod + mapped : mod + mapped.toUpperCase() : key;
    }
  }
  return key;
}

export const checkKey = (event: HandlerNS.Event, key: string
    ): HandlerResult.Nothing | HandlerResult.Prevent | HandlerResult.PlainEsc | HandlerResult.AdvancedEsc => {
  // when checkKey, Vimium C must be enabled, so passKeys won't be `""`
  const key0 = passKeys && key ? mappedKeys ? getMappedKey(event, kModeId.NO_MAP_KEY) : key : "";
  if (!key || key0 && !currentKeys && (key0 in <SafeEnum> passKeys) !== isPassKeysReverted) {
    return key ? esc(HandlerResult.Nothing) : HandlerResult.Nothing;
  }
  let j: ReadonlyChildKeyFSM | ValidKeyAction | undefined;
  if (VKey.isEscape_(key)) {
    Build.BTypes & BrowserType.Chrome && mappedKeys && checkPotentialAccessKey(event);
    return nextKeys ? (esc(HandlerResult.ExitPassMode), HandlerResult.Prevent)
        : VKey.isEscape_(key);
  }
  if (!nextKeys || (j = nextKeys[key]) == null) {
    j = keyFSM[key];
    if (j == null || nextKeys && key0 && (key0 in <SafeEnum> passKeys) !== isPassKeysReverted) {
      return esc(HandlerResult.Nothing);
    }
    if (j !== KeyAction.cmd) { currentKeys = ""; }
  }
  currentKeys += key.length > 1 ? `<${key}>` : key;
  if (j === KeyAction.cmd) {
    post_({ H: kFgReq.key, k: currentKeys, l: event.i });
    esc(HandlerResult.Prevent);
    isCmdTriggered = 1;
  } else {
    nextKeys = j !== KeyAction.count ? j : keyFSM;
  }
  return HandlerResult.Prevent;
}

export const setPassKeys = (newPassKeys: BgReq[kBgReq.reset]["p"]): void => {
  passKeys = newPassKeys && safer<1>(null);
  if (newPassKeys) {
    isPassKeysReverted = newPassKeys[0] === "^" && newPassKeys.length > 2;
    for (const ch of (isPassKeysReverted ? newPassKeys.slice(2) : newPassKeys).split(" ")) {
      (passKeys as SafeDict<1>)[ch] = 1;
    }
  }
}

export const setKeyFSM = (newFSM: BgReq[kBgReq.keyFSM]["k"], maps: BgReq[kBgReq.keyFSM]["m"]): void => {
  keyFSM = newFSM
  mappedKeys = maps
}

export const checkPotentialAccessKey = (event: HandlerNS.Event): void => {
  /** On Firefox, access keys are only handled during keypress events, so it has been "hooked" well:
   * https://dxr.mozilla.org/mozilla/source/content/events/src/nsEventStateManager.cpp#960 .
   * And the modifier stat for access keys is user-configurable: `ui.key.generalAccessKey`
   * * there was another one (`ui.key.contentAccess`) but it has been removed from the latest code
   */
  if (Build.BTypes & BrowserType.Chrome && event.e.altKey
      && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)) {
    /** On Chrome, there're 2 paths to trigger accesskey:
     * * `blink::WebInputEvent::kRawKeyDown` := `event#keydown` => `blink::WebInputEvent::kChar` := `handleAccessKey`
     * * `blink::WebInputEvent::kKeyDown` := `handleAccessKey` + `event#keydown`
     * In source code on 2019-10-19, the second `WebInputEvent::kKeyDown` is almost not in use (except in Pepper API),
     * and https://cs.chromium.org/chromium/src/third_party/blink/public/platform/web_input_event.h?l=110&q=kKeyDown
     *     says that Android uses `WebInputEvent::kKeyDown` and Windows prefers `RawKeyDown+Char`,
     * so, here ignores the 2nd path.
     */
    // during tests, an access key of ' ' (space) can be triggered on macOS (2019-10-20)
    event.c === kChar.INVALID && VKey.char_(event);
    if (isWaitingAccessKey !== (event.c.length === 1 || event.c === kChar.space)
        && (VKey.getKeyStat_(event) & KeyStat.ExceptShift /* Chrome ignore .shiftKey */) ===
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
    if (Element.prototype.getAttribute.call(t, "accesskey")) {
      // if a script has modified [accesskey], then do nothing on - just in case.
      resetAnyClickHandler();
      VKey.prevent_(event);
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
  if (Build.BTypes & BrowserType.Chrome) { isWaitingAccessKey && resetAnyClickHandler(); }
  if (Build.BTypes & BrowserType.Firefox) { raw_insert_lock && insert_Lock_(); }
  let action: HandlerResult, tempStr: string;
  if (action = VKey.bubbleEvent_(eventWrapper)) { /* empty */ }
  else if (isInInsert()) {
    const g = insert_global, isF_num = key > kKeyCode.maxNotFn && key < kKeyCode.minNotFn,
    keyStr = mappedKeys || g || isF_num || event.ctrlKey
        || key === kKeyCode.esc ? getMappedKey(eventWrapper, kModeId.Insert) : "";
    if (g ? !g.k ? VKey.isEscape_(keyStr) : keyStr === g.k
        : (!mappedKeys ? isF_num
          : (tempStr = VKey.keybody_(keyStr)) > kChar.maxNotF_num && tempStr < kChar.minNotF_num)
        ? (action = checkKey(eventWrapper, keyStr)) > HandlerResult.MaxNotEsc
        : VKey.isEscape_(keyStr)
    ) {
      if ((raw_insert_lock && raw_insert_lock === doc.body || !isTop && innerHeight < 5) && !g) {
        event.repeat && focusUpper(key, true, event);
        action = /* the real is HandlerResult.PassKey; here's for smaller code */ HandlerResult.Nothing;
      } else {
        action = g && g.p ? (
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
      action = checkKey(eventWrapper,
            getMappedKey(eventWrapper, currentKeys ? kModeId.Next : kModeId.Normal));
      if (action > HandlerResult.MaxNotEsc) {
        action = action > HandlerResult.PlainEsc ? /*#__NOINLINE__*/ onEscDown(event, key)
            : HandlerResult.Nothing;
      }
      if (action === HandlerResult.Nothing
          && suppressType && eventWrapper.c.length === 1 && !VKey.getKeyStat_(eventWrapper)) {
        // not suppress ' ', so that it's easier to exit this mode
        action = HandlerResult.Prevent;
      }
  }
  if (action < HandlerResult.MinStopOrPreventEvents) { return; }
  if (action > HandlerResult.MaxNotPrevent) {
    Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(eventWrapper);
    VKey.prevent_(event);
  } else {
    VKey.Stop_(event);
  }
  keydownEvents_[key] = 1;
}

/** @param key should be valid */
function onEscDown(event: KeyboardEventToPrevent, key: kKeyCode
  ): HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent {
  let action: HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent = HandlerResult.Prevent
  let { repeat } = event
  let activeEl = VDom.activeEl_unsafe_(), body = doc.body;
  /** if `notBody` then `activeEl` is not null */
  if (!repeat && removeSelection()) {
    /* empty */
  } else if (repeat && !keydownEvents_[key] && activeEl !== body) {
    (Build.BTypes & ~BrowserType.Firefox ? typeof activeEl!.blur === "function"
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
  scrollTick(0);
  /*#__INLINE__*/ resetIsCmdTriggered();
  if (Build.BTypes & BrowserType.Chrome) {
    isWaitingAccessKey && resetAnyClickHandler();
  }
  if (suppressType && VDom.getSelection_().type !== suppressType) {
    setupSuppress();
  }
  if (keydownEvents_[key]) {
    keydownEvents_[key] = 0;
    VKey.prevent_(event);
  } else if (onKeyup2) {
    onKeyup2(event);
  }
}
