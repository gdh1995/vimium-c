// eslint-disable-next-line no-var
var VHud: VHUDTy, VApi: VApiTy, VTr: VTransType
  , VimiumInjector: VimiumInjectorTy | undefined | null;
// eslint-disable-next-line no-var
if (Build.BTypes & BrowserType.Chrome && Build.BTypes & ~BrowserType.Chrome) { var browser: unknown; }

(function (): void {
  const enum kNodeInfo {
    NONE = 0,
    ShadowBlur = 1, ShadowFull = 2,
  }
  interface NodeWithInfo extends Node {
    vimiumInfo?: kNodeInfo;
  }

  interface EscF {
    <T extends Exclude<HandlerResult, HandlerResult.ExitPassMode>> (this: void, i: T): T;
    (this: void, i: HandlerResult.ExitPassMode): unknown;
  }
  interface Port extends chrome.runtime.Port {
    postMessage<k extends keyof FgRes>(request: Req.fgWithRes<k>): 1;
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    postMessage<k extends keyof FgReq>(request: Req.fg<k>): 1;
    onMessage: chrome.events.Event<(message: any, port: Port, exArg: FakeArg) => void>;
  }
  interface SpecialCommands {
    [kFgCmd.reset] (this: void, isAlive: BOOL | CmdOptions[kFgCmd.reset] & SafeObject): void;
    [kFgCmd.showHelp] (msg?: number | "e"): void;
  }

  let KeydownEvents: KeydownCacheArray, keyFSM: KeyFSM
    , fgCache: SettingsNS.FrontendSettingCache = null as never
    , insertLock = null as LockableElement | null
    , lastWndFocusTime = 0
    , thisCore: Writable<ContentWindowCore> | undefined
    , currentKeys = "", isEnabled = false, isLocked = false
    , mappedKeys = null as SafeDict<string> | null, nextKeys = null as KeyFSM | ReadonlyChildKeyFSM | null
    , esc = function<T extends Exclude<HandlerResult, HandlerResult.ExitPassMode>> (i: T): T {
      currentKeys = ""; nextKeys = null; return i;
    } as EscF
    , onKeyup2: ((this: void, event?: Pick<KeyboardEvent, "keyCode">) => void) | null | undefined
    , passKeys = null as SafeEnum | null | "", isPassKeysReverted = false
    , onWndFocus = function (this: void): void { /* empty */ }, onWndBlur2: ((this: void) => void) | undefined | null
    , exitPassMode: ((this: void) => void) | undefined | null
    , OnOther: BrowserType = !(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
          || !(Build.BTypes & ~BrowserType.Edge)
        ? Build.BTypes as number
        : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
        : Build.BTypes & BrowserType.Firefox && browser ? BrowserType.Firefox
        : BrowserType.Chrome
    /** its initial value should be 0, need by {@link #hook} */
    , browserVer: BrowserVer = 0 // should be used only if BTypes includes Chrome
    , isCmdTriggered: BOOL = 0
    , isWaitingAccessKey = false
    , needToRetryParentClickable: BOOL = 0
    , safer = Object.create as { (o: null): any; <T>(o: null): SafeDict<T> }
    , coreTester: { name_: string; rand_: number; recvTick_: number; sendTick_: number;
        encrypt_ (trustedRand: number, unsafeRand: number): string;
        compare_: Parameters<SandboxGetterFunc>[0]; }
    ;

  function post<k extends keyof FgReq>(this: void, request: FgReq[k] & Req.baseFg<k>): 1 | void {
    vPort._port!.postMessage(request);
  }

  function getMappedKey(this: void, eventWrapper: HandlerNS.Event, mode: kModeId): string {
    const char = eventWrapper.c !== kChar.INVALID ? eventWrapper.c : vKey.char_(eventWrapper), event = eventWrapper.e;
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
  function checkKey(event: HandlerNS.Event, key: string
      ): HandlerResult.Nothing | HandlerResult.Prevent | HandlerResult.PlainEsc | HandlerResult.AdvancedEsc {
    // when checkKey, Vimium C must be enabled, so passKeys won't be `""`
    const key0 = passKeys && key ? mappedKeys ? getMappedKey(event, kModeId.NO_MAP_KEY) : key : "";
    if (!key || key0 && !currentKeys && (key0 in <SafeEnum> passKeys) !== isPassKeysReverted) {
      return key ? esc(HandlerResult.Nothing) : HandlerResult.Nothing;
    }
    let j: ReadonlyChildKeyFSM | ValidKeyAction | undefined;
    if (vKey.isEscape_(key)) {
      Build.BTypes & BrowserType.Chrome && mappedKeys && checkPotentialAccessKey(event);
      return nextKeys ? (esc(HandlerResult.ExitPassMode), HandlerResult.Prevent)
          : vKey.isEscape_(key);
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
      post({ H: kFgReq.key, k: currentKeys, l: event.i });
      esc(HandlerResult.Prevent);
      isCmdTriggered = 1;
    } else {
      nextKeys = j !== KeyAction.count ? j : keyFSM;
    }
    return HandlerResult.Prevent;
  }
  /** @param key should be valid */
  function onEscDown(event: KeyboardEventToPrevent, key: kKeyCode
      ): HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent {
    let action: HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent = HandlerResult.Prevent
      , { repeat } = event
      , activeEl = vDom.activeEl_unsafe_(), body = doc.body;
    /** if `notBody` then `activeEl` is not null */
    if (!repeat && vCui.removeSelection_()) {
      /* empty */
    } else if (repeat && !KeydownEvents[key] && activeEl !== body) {
      (Build.BTypes & ~BrowserType.Firefox ? typeof activeEl!.blur === "function"
          : activeEl!.blur) && // in case activeEl is unsafe
      activeEl!.blur!();
    } else if (!isTop && activeEl === body) {
      InsertMode.focusUpper_(key, repeat, event);
      action = HandlerResult.PassKey;
    } else {
      action = HandlerResult.Default;
    }
    return action;
  }
  function onKeydown(event: KeyboardEventToPrevent): void {
    const key = event.keyCode;
    if (!isEnabled
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
            : event.isTrusted === false) // skip checks of `instanceof KeyboardEvent` if checking `!.keyCode`
        || !key) { return; }
    const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event, i: key};
    if (VSc.keyIsDown_ && VSc.OnScrolls_(event)) {
      Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(eventWrapper);
      return;
    }
    if (Build.BTypes & BrowserType.Chrome) { isWaitingAccessKey && resetAnyClickHandler(); }
    if (Build.BTypes & BrowserType.Firefox) { insertLock && events.lock_(); }
    let action: HandlerResult, tempStr: string;
    if (action = vKey.bubbleEvent_(eventWrapper)) { /* empty */ }
    else if (InsertMode.isInInsert_()) {
      const g = InsertMode.global_, isF_num = key > kKeyCode.maxNotFn && key < kKeyCode.minNotFn,
      keyStr = mappedKeys || g || isF_num || event.ctrlKey
          || key === kKeyCode.esc ? getMappedKey(eventWrapper, kModeId.Insert) : "";
      if (g ? !g.k ? vKey.isEscape_(keyStr) : keyStr === g.k
          : (!mappedKeys ? isF_num
            : (tempStr = VKey.keybody_(keyStr)) > kChar.maxNotF_num && tempStr < kChar.minNotF_num)
          ? (action = checkKey(eventWrapper, keyStr)) > HandlerResult.MaxNotEsc
          : vKey.isEscape_(keyStr)
      ) {
        if ((insertLock && insertLock === doc.body || !isTop && innerHeight < 5) && !g) {
          event.repeat && InsertMode.focusUpper_(key, true, event);
          action = /* the real is HandlerResult.PassKey; here's for smaller code */ HandlerResult.Nothing;
        } else {
          action = g && g.p ? (
            Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(eventWrapper),
            HandlerResult.Nothing) : HandlerResult.Prevent;
          InsertMode.exitI_(event.target as Element);
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
            && InsertMode.suppressType_ && eventWrapper.c.length === 1 && !vKey.getKeyStat_(eventWrapper)) {
          // not suppress ' ', so that it's easier to exit this mode
          action = HandlerResult.Prevent;
        }
    }
    if (action < HandlerResult.MinStopOrPreventEvents) { return; }
    if (action > HandlerResult.MaxNotPrevent) {
      Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(eventWrapper);
      vKey.prevent_(event);
    } else {
      vKey.Stop_(event);
    }
    KeydownEvents[key] = 1;
  }
  function onKeyup(event: KeyboardEventToPrevent): void {
    let key = event.keyCode;
    if (!isEnabled
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
            : event.isTrusted === false) // skip checks of `instanceof KeyboardEvent` if checking `!.keyCode`
        || !key) { return; }
    VSc.scrollTick_(0);
    isCmdTriggered = 0;
    if (Build.BTypes & BrowserType.Chrome) {
      isWaitingAccessKey && resetAnyClickHandler();
    }
    if (InsertMode.suppressType_ && vDom.getSelection_().type !== InsertMode.suppressType_) {
      events.setupSuppress_();
    }
    if (KeydownEvents[key]) {
      KeydownEvents[key] = 0;
      vKey.prevent_(event);
    } else if (onKeyup2) {
      onKeyup2(event);
    }
  }

  function onFocus(this: void, event: Event | FocusEvent): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
        ? !event.isTrusted : event.isTrusted === false) { return; }
    // on Firefox, target may also be `document`
    let target: EventTarget | Element | Window | Document = event.target;
    if (target === window) {
      lastWndFocusTime = Date.now();
      return onWndFocus();
    }
    if (!isEnabled || Build.BTypes & BrowserType.Firefox && target === doc) { return; }
    /**
     * Notes:
     * according to test, Chrome Password Saver won't fill fields inside a shadow DOM
     * it's safe to compare .lock and doc.activeEl here without checking target.shadowRoot,
     *   and .shadowRoot should not block this check
     * DO NOT stop propagation
     * check `InsertMode.lock !== null` first, so that it needs less cost for common (plain) cases
     * use `lock === doc.active`, because:
     *   `lock !== target` ignores the case a blur event is missing or not captured;
     *   `target !== doc.active` lets it mistakenly passes the case of `target === lock === doc.active`
     */
    const lock = insertLock;
    if (lock && lock === vDom.activeEl_unsafe_()) { return; }
    if (target === vCui.box_) { return vKey.Stop_(event); }
    const sr = vDom.GetShadowRoot_(target as Element);
    if (sr) {
      let path = !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
              && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
          ? event.composedPath!() : event.path
        , top: EventTarget | undefined,
      /**
       * isNormalHost is true if one of:
       * - Chrome is since BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
       * - `event.currentTarget` (`this`) is a shadowRoot
       */
      isNormalHost = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
          && !(Build.BTypes & ~BrowserType.Chrome)
        || !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        ? (top = path![0]) !== target
        : !!(top = path && path[0]) && top !== window && top !== target;
      hookOnShadowRoot(isNormalHost ? path! : [sr, target], target as Element);
      target = isNormalHost ? top as Element : target;
    }
    if (!lastWndFocusTime || Date.now() - lastWndFocusTime > 30) {
      vCui.activeEl_ = Build.BTypes & ~BrowserType.Firefox
          ? vDom.SafeEl_not_ff_!(target as Element) || vCui.activeEl_ : target as SafeElement;
      vCui.cachedScrollable_ = 0;
    }
    lastWndFocusTime = 0;
    if (vDom.getEditableType_<2>(target)) {
      if (InsertMode.grabBackFocus_) {
        (InsertMode.grabBackFocus_ as Exclude<typeof InsertMode.grabBackFocus_, boolean>)(event, target);
        return;
      }
      esc(HandlerResult.Nothing);
      insertLock = target;
      if (InsertMode.mutable_) {
        // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
        if (vDom.activeEl_unsafe_() !== doc.body) {
          InsertMode.last_ = target;
        }
      }
    }
  }
  function onBlur(this: void, event: Event | FocusEvent): void {
    if (!isEnabled
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    const target: EventTarget | Element | Window | Document = event.target;
    if (target === window) { return onWndBlur(); }
    if (Build.BTypes & BrowserType.Firefox && target === doc) { return; }
    let path = !(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
            && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
        ? event.composedPath!() : event.path
      , top: EventTarget | undefined
      , same = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
            && !(Build.BTypes & ~BrowserType.Chrome)
          || !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
              && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
          ? (top = path![0]) === target
          : !(top = path && path[0]) || top === window || top === target
      , sr = vDom.GetShadowRoot_(target as Element);
    if (insertLock === (same ? target : top)) {
      insertLock = null;
      InsertMode.inputHint_ && !InsertMode.hinting_ && doc.hasFocus() && InsertMode.exitInputHint_();
    }
    if (!sr || target === vCui.box_) { return; }
    if (same) {
      domNodeMap.set(sr, kNodeInfo.ShadowBlur);
    } else {
      hookOnShadowRoot(path!, target as Element, 1);
    }
  }
  function onActivate(event: Event): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
        ? event.isTrusted : event.isTrusted !== false) {
      const path = !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
              && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
          ? event.composedPath!() : event.path,
      el = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInClosedShadowDOM
            && !(Build.BTypes & ~BrowserType.Chrome)
          || !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && !(Build.BTypes & BrowserType.Edge)
              && Build.MinCVer >= BrowserVer.Min$Event$$composedPath$ExistAndIncludeWindowAndElementsIfListenedOnWindow
          || (Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
                || !(Build.BTypes & BrowserType.Chrome)
              ? path : path && path.length > 1)
          ? path![0] as Element : event.target as Element;
      vCui.activeEl_ = Build.BTypes & ~BrowserType.Firefox ? vDom.SafeEl_not_ff_!(el) : el as SafeElement | null;
      vCui.cachedScrollable_ = 0;
    }
  }
  function onWndBlur(this: void): void {
    VSc.scrollTick_(0);
    onWndBlur2 && onWndBlur2();
    exitPassMode && exitPassMode();
    KeydownEvents = safer(null);
    isCmdTriggered = 0;
    if (Build.BTypes & BrowserType.Chrome) {
      resetAnyClickHandler();
    }
    injector || (<RegExpOne> /a?/).test("");
    esc(HandlerResult.ExitPassMode);
  }
  function onShadow(this: ShadowRoot, event: FocusEvent): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
        ? !event.isTrusted : event.isTrusted === false) { return; }
    if (isEnabled && event.type === "focus") {
      onFocus(event);
      return;
    }
    if (!isEnabled || domNodeMap.get(this) === kNodeInfo.ShadowBlur) {
      hookOnShadowRoot([this, 0 as never], 0, 1);
    }
    if (isEnabled) {
      onBlur(event);
    }
  }
  function onAnyClick(this: void, event: MouseEventToPrevent): void {
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
        vKey.prevent_(event);
      }
    }
  }

  interface MouseEventListener extends EventListenerObject { handleEvent (evt: MouseEventToPrevent): ELRet }
  const injector = VimiumInjector,
  doc = document, vDom = VDom, vKey = VKey, vCui = VCui, vHints = VHints,
  isTop = top === window,
  setupEventListener = vKey.SetupEventListener_,
  _initialDocState = doc.readyState,
  noopEventHandler = Object.is as any as EventListenerObject["handleEvent"],
  anyClickHandler: MouseEventListener = { handleEvent: noopEventHandler },
  resetAnyClickHandler = function (): void {
    isWaitingAccessKey = false; anyClickHandler.handleEvent = noopEventHandler;
  },
  hook = (function (action: HookAction): void {
    let f = action ? removeEventListener : addEventListener;
    if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
        && Build.BTypes & BrowserType.Chrome) {
      if (!(Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome)
          && (action || browserVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)) {
        f.call(doc, "DOMActivate", onActivate, true);
        f.call(doc, "click", anyClickHandler, true);
      }
      if (action === HookAction.SuppressListenersOnDocument) { return; }
    }
    f("keydown", onKeydown, true);
    f("keyup", onKeyup, true);
    action !== HookAction.Suppress && f("focus", onFocus, true);
    f("blur", onBlur, true);
    if (!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome) {
      f("click", anyClickHandler, true);
    }
    f(Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
        ? "click" : "DOMActivate", onActivate, true);
  }),
  hookOnShadowRoot = function (path: ArrayLike<EventTarget | 0>, target: Node | 0, disable?: 1): void {
    for (let len = Build.MinCVer >= BrowserVer.Min$Event$$path$IsStdArrayAndIncludesWindow
          || !(Build.BTypes & BrowserType.Chrome)
          ? (path as Array<EventTarget | 0>).indexOf(target) : ([] as Array<EventTarget | 0>).indexOf.call(path, target)
        ; 0 <= --len; ) {
      const root = (path as EventPath)[len] as Node;
      // root is target or inside target, so always a Node
      if (root.nodeType === kNode.DOCUMENT_FRAGMENT_NODE) {
        setupEventListener(root as ShadowRoot, "focus", onShadow, disable);
        setupEventListener(root as ShadowRoot, "blur", onShadow, disable);
        disable ? domNodeMap.delete(root) : domNodeMap.set(root, kNodeInfo.ShadowFull);
      }
    }
  },
  checkPotentialAccessKey = function (event: HandlerNS.Event): void {
    /** On Firefox, access keys are only handled during keypress events, so it has been "hooked" well:
     * https://dxr.mozilla.org/mozilla/source/content/events/src/nsEventStateManager.cpp#960 .
     * And the modifier stat for access keys is user-configurable: `ui.key.generalAccessKey`
     * * there was another one (`ui.key.contentAccess`) but it has been removed from the latest code
     */
    if (Build.BTypes & BrowserType.Chrome && event.e.altKey
        && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
      /** On Chrome, there're 2 paths to trigger accesskey:
       * * `blink::WebInputEvent::kRawKeyDown` := `event#keydown` => `blink::WebInputEvent::kChar` := `handleAccessKey`
       * * `blink::WebInputEvent::kKeyDown` := `handleAccessKey` + `event#keydown`
       * In source code on 2019-10-19, the second `WebInputEvent::kKeyDown` is almost not in use (except in Pepper API),
       * and https://cs.chromium.org/chromium/src/third_party/blink/public/platform/web_input_event.h?l=110&q=kKeyDown
       *     says that Android uses `WebInputEvent::kKeyDown` and Windows prefers `RawKeyDown+Char`,
       * so, here ignores the 2nd path.
       */
      // during tests, an access key of ' ' (space) can be triggered on macOS (2019-10-20)
      event.c === kChar.INVALID && vKey.char_(event);
      if (isWaitingAccessKey !== (event.c.length === 1 || event.c === kChar.space)
          && (vKey.getKeyStat_(event) & KeyStat.ExceptShift /* Chrome ignore .shiftKey */) ===
              (fgCache.o ? KeyStat.altKey : KeyStat.altKey | KeyStat.ctrlKey)
          ) {
        isWaitingAccessKey = !isWaitingAccessKey;
        anyClickHandler.handleEvent = isWaitingAccessKey ? onAnyClick : noopEventHandler;
      }
    }
  },
  Commands: {
    [k in kFgCmd & number]:
      k extends keyof SpecialCommands ? SpecialCommands[k] :
      (this: void, count: number, options: CmdOptions[k] & SafeObject, key?: -42) => void;
  } = [
    /* kFgCmd.framesGoBack: */ function (rawStep: number, options: CmdOptions[kFgCmd.framesGoBack]): void {
      const maxStep = Math.min(Math.abs(rawStep), history.length - 1),
      reuse = options.reuse,
      realStep = rawStep < 0 ? -maxStep : maxStep;
      if ((!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome)
          && maxStep > 1
          && (Build.MinCVer >= BrowserVer.Min$Tabs$$goBack || browserVer >= BrowserVer.Min$Tabs$$goBack)
          && !options.local
          || maxStep && reuse
      ) {
        post({ H: kFgReq.framesGoBack, s: realStep, r: reuse });
      } else {
        maxStep && history.go(realStep);
      }
    },
    /* kFgCmd.findMode: */ VFind.activateF_,
    /* kFgCmd.linkHints: */ vHints.activateL_,
    /* kFgCmd.unhoverLast: */ function (this: void): void {
      vDom.unhover_();
      HUD.tip_(kTip.didUnHoverLast);
    },
    /* kFgCmd.marks: */ VMarks.activateM_,
    /* kFgCmd.goToMarks: */ VMarks.GoTo_,
    /* kFgCmd.scroll: */ VSc.activateS_,
    /* kFgCmd.visualMode: */ VVisual.activateV_,
    /* kFgCmd.vomnibar: */ VOmni.activateO_ ,
    /* kFgCmd.reset: */ (isAlive): void => {
      const a = InsertMode;
      vCui.activeEl_ = vCui.cachedScrollable_ = vDom.lastHovered_ = a.last_ = insertLock = a.global_ = null;
      a.mutable_ = true;
      a.ExitGrab_(); events.setupSuppress_();
      vHints.clear_(isAlive ? 2 : 0); VVisual.deactivateV_();
      VFind.init_ || VFind.deactivate_(FindNS.Action.ExitNoAnyFocus);
      onWndBlur();
    },

    /* kFgCmd.toggle: */ function (_0: number, options: CmdOptions[kFgCmd.toggle]): void {
      const key = options.k, backupKey = "_" + key as typeof key,
      cache = vKey.safer_(fgCache), cur = cache[key];
      let val = options.v, u: undefined;
      if (val === null && (cur === !!cur)) {
        val = !cur;
      }
      if (cache[backupKey] === u) {
        (cache as Generalized<typeof cache>)[backupKey] = cur;
      } else if (cur === val) {
        val = cache[backupKey];
        cache[backupKey] = u as never;
      }
      (cache as Generalized<typeof cache>)[key] = val as typeof cur;
      let notBool = val !== !!val;
      options.n && HUD.tip_(notBool ? kTip.useVal : val ? kTip.turnOn : kTip.turnOff,
          1000, [options.n, notBool ? JSON.stringify(val) : ""]);
    },
    /* kFgCmd.insertMode: */ function (_0: number, opt: CmdOptions[kFgCmd.insertMode]): void {
      InsertMode.global_ = opt;
      if (opt.h) { HUD.show_(kTip.raw, opt.h); }
    },
    /* kFgCmd.passNextKey: */ function (count0: number, options: CmdOptions[kFgCmd.passNextKey]): void {
      let keyCount = 0, count = Math.abs(count0);
      if (!!options.normal === (count0 > 0)) {
        esc(HandlerResult.ExitPassMode); // singleton
        if (!passKeys) {
          return HUD.tip_(kTip.noPassKeys);
        }
        const oldEsc = esc, oldPassKeys = passKeys;
        passKeys = null;
        esc = function (i: HandlerResult): HandlerResult {
          if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.ExitPassMode) {
            HUD.hide_();
            passKeys = oldPassKeys;
            esc = oldEsc;
            return oldEsc(HandlerResult.Prevent);
          }
          currentKeys = ""; nextKeys = keyFSM;
          if (keyCount - count || !HUD.text_) {
            keyCount = count;
            HUD.show_(kTip.normalMode, [count > 1 ? VTr(kTip.nTimes, [count]) : ""]);
          }
          return i;
        } as EscF;
        esc(HandlerResult.Nothing);
        return;
      }
      exitPassMode && exitPassMode();
      const keys = safer<BOOL>(null);
      vKey.pushHandler_(function (event) {
        keyCount += +!keys[event.i];
        keys[event.i] = 1;
        return HandlerResult.PassKey;
      }, keys);
      onKeyup2 = function (event): void {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event ? event.keyCode : kKeyCode.None] = 0;
          HUD.show_(kTip.passNext, [count > 1 ? VTr(kTip.nTimes, [count]) : ""]);
        } else {
          exitPassMode!();
        }
      };
      exitPassMode = function (): void {
        exitPassMode = onKeyup2 = null;
        vKey.removeHandler_(keys);
        HUD.hide_();
      };
      onKeyup2();
    },
    /* kFgCmd.goNext: */ function (_0: number, {r: rel, p: patterns, l, m }: CmdOptions[kFgCmd.goNext]): void {
      if (!vDom.isHTML_() || Pagination.findAndFollowRel_(rel)) { return; }
      const isNext = rel === "next";
      if (patterns.length <= 0 || !Pagination.findAndFollowLink_(patterns, isNext, l, m)) {
        return HUD.tip_(kTip.noLinksToGo, 0, [VTr(rel)]);
      }
    },
    /* kFgCmd.reload: */ function (_0: number, options: CmdOptions[kFgCmd.reload]): void {
      VKey.timeout_(function () {
        options.url ? (location.href = options.url) : location.reload(!!options.hard);
      }, 17);
    },
    /* kFgCmd.showHelp: */ function (msg?: number | "e", options?: CmdOptions[kFgCmd.showHelp]): void {
      if (msg === "e") { return; }
      let wantTop = innerWidth < 400 || innerHeight < 320;
      if (!vDom.isHTML_()) {
        if (isTop) { return; }
        wantTop = true;
      }
      post({ H: kFgReq.initHelp, w: wantTop, a: options });
    },
    /* kFgCmd.autoCopy: */ function (_0: number, options: CmdOptions[kFgCmd.autoCopy]): void {
      let str = vCui.getSelectionText_(1);
      post({
        H: kFgReq.copy,
        s: str as never as undefined,
        e: options.sed,
        u: (str ? "" : options.url ? location.href : doc.title) as "url",
        d: options.decoded || options.decode
      });
    },
    /* kFgCmd.autoOpen: */ function (_0: number, options: CmdOptions[kFgCmd.autoOpen]): void {
      let url = vCui.getSelectionText_();
      url && events.evalIfOK_(url) || post({
        H: kFgReq.openUrl,
        c: !url,
        k: options.keyword, u: url
      });
    },
    /* kFgCmd.searchAs: */ function (_0: number, options: CmdOptions[kFgCmd.searchAs]): void {
      post({
        H: kFgReq.searchAs,
        u: location.href,
        c: options.copied,
        s: options.sed,
        t: options.selected ? vCui.getSelectionText_() : ""
      });
    },
    /* kFgCmd.focusInput: */ function (count: number, options: CmdOptions[kFgCmd.focusInput]): void {
      const act = options.act || options.action;
      if (act && (act[0] !== "l" || InsertMode.last_ && !insertLock)) {
        let newEl = insertLock, ret: BOOL = 1;
        if (newEl) {
          if (act === "backspace") {
            if (vDom.view_(newEl)) { VFind.exec_("delete", doc); }
          } else {
            InsertMode.last_ = newEl;
            InsertMode.mutable_ = false;
            newEl.blur();
          }
        } else if (!(newEl = InsertMode.last_)) {
          HUD.tip_(kTip.noFocused, 1200);
        } else if (act !== "last-visible" && vDom.view_(newEl) || !vDom.NotVisible_(newEl)) {
          InsertMode.last_ = null;
          InsertMode.mutable_ = true;
          vDom.getZoom_(newEl);
          vDom.prepareCrop_();
          vCui.simulateSelect_(newEl, null, !!options.flash, options.select, true);
        } else if (act[0] === "l") {
          ret = 0;
        } else {
          HUD.tip_(kTip.focusedIsHidden, 2000);
        }
        if (ret) {
          return;
        }
      }
      InsertMode.inputHint_ && (InsertMode.inputHint_.h = null as never);
      const arr: ViewOffset = vDom.getViewBox_();
      vDom.prepareCrop_(1);
      interface InputHint extends Hint { [0]: HintsNS.InputHintItem["d"] }
      // here those editable and inside UI root are always detected, in case that a user modifies the shadow DOM
      const visibleInputs = vHints.traverse_(Build.BTypes & ~BrowserType.Firefox
            ? vHints.kEditableSelector_ + vHints.kSafeAllSelector_ : vHints.kEditableSelector_, vHints.GetEditable_
          ) as InputHint[],
      action = options.select;
      let sel = visibleInputs.length;
      if (sel === 0) {
        InsertMode.exitInputHint_();
        return HUD.tip_(kTip.noInputToFocus, 1000);
      } else if (sel === 1) {
        InsertMode.exitInputHint_();
        return vCui.simulateSelect_(visibleInputs[0][0], visibleInputs[0][1], true, action, true);
      }
      for (let ind = 0; ind < sel; ind++) {
        const hint = visibleInputs[ind], j = hint[0].tabIndex;
        hint[2] = j < 1 ? -ind
            : !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
              && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
            ? j : j + ind / 8192;
      }
      const hints: HintsNS.InputHintItem[] = visibleInputs.sort(
          (a, b) => a[2] < 1 || b[2] < 1 ? b[2] - a[2] : a[2] - b[2]).map(
          function (link): HintsNS.InputHintItem {
        const marker = vDom.createElement_("span") as HintsNS.BaseHintItem["m"],
        rect = vDom.padClientRect_(vDom.getBoundingClientRect_(link[0]), 3);
        rect.l--, rect.t--, rect.r--, rect.b--;
        marker.className = "IH";
        vDom.setBoundary_(marker.style, rect);
        return {m: marker, d: link[0]};
      });
      if (count === 1 && InsertMode.last_) {
        sel = Math.max(0, visibleInputs.map(link => link[0]).indexOf(InsertMode.last_));
      } else {
        sel = count > 0 ? Math.min(count, sel) - 1 : Math.max(0, sel + count);
      }
      hints[sel].m.className = "IH IHS";
      vCui.simulateSelect_(visibleInputs[sel][0], visibleInputs[sel][1], false, action, false);
      vCui.ensureBorder_(vDom.wdZoom_ / vDom.dScale_);
      const box = vCui.addElementList_<false>(hints, arr), keep = !!options.keep, pass = !!options.passExitKey;
      // delay exiting the old to avoid some layout actions
      // although old elements can not be GC-ed before this line, it has little influence
      InsertMode.exitInputHint_();
      InsertMode.inputHint_ = { b: box, h: hints };
      vKey.pushHandler_(function (event) {
        const keyCode = event.i, isIME = keyCode === kKeyCode.ime, repeat = event.e.repeat,
        key = isIME || repeat ? "" : vKey.key_(event, kModeId.Insert)
        ;
        if (key === kChar.tab || key === `s-${kChar.tab}`) {
          const hints2 = this.h, oldSel = sel, len = hints2.length;
          sel = (oldSel + (key < "t" ? len - 1 : 1)) % len;
          InsertMode.hinting_ = true;
          vKey.prevent_(event.e); // in case that selecting is too slow
          vCui.simulateSelect_(hints2[sel].d, null, false, action);
          hints2[oldSel].m.className = "IH";
          hints2[sel].m.className = "IH IHS";
          InsertMode.hinting_ = false;
          return HandlerResult.Prevent;
        }
        // check `!key` for mapModifier
        if (!key && (keyCode === kKeyCode.shiftKey || keep && (keyCode === kKeyCode.altKey
            || keyCode === kKeyCode.ctrlKey
            || keyCode > kKeyCode.maxNotMetaKey && keyCode < kKeyCode.minNotMetaKeyOrMenu))) { /* empty */ }
        else if (repeat) { return HandlerResult.Nothing; }
        else if (keep ? vKey.isEscape_(key) || (
            vKey.keybody_(key) === kChar.enter
            && (/* a?c?m?-enter */ key < "s" && (key[0] !== "e" || this.h[sel].d.localName === "input"))
          ) : !isIME && keyCode !== kKeyCode.f12
        ) {
          InsertMode.exitInputHint_();
          return !vKey.isEscape_(key) ? HandlerResult.Nothing : keep || !insertLock ? HandlerResult.Prevent
            : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
        }
        return HandlerResult.Nothing;
      }, InsertMode.inputHint_);
    },
    /* kFgCmd.editText: */ function (count: number, options: CmdOptions[kFgCmd.editText]) {
      (insertLock || options.dom) && VKey.timeout_((): void => {
        let commands = options.run.split(","), sel: Selection | undefined;
        while (0 < count--) {
          for (let i = 0; i < commands.length; i += 3) {
            if (commands[i] !== "exec") {
              sel = sel || vCui.getSelected_()[0];
              sel.modify(commands[i] as any, commands[i + 1] as any, commands[i + 2] as any);
            } else {
              VFind.exec_(commands[i + 1], doc, commands[i + 2]);
            }
          }
        }
      }, 0);
    }
  ],

  InsertMode = {
    grabBackFocus_: (_initialDocState > "l") as boolean | (
        (event: Event, target: LockableElement) => void),
    global_: null as CmdOptions[kFgCmd.insertMode] | null,
    hinting_: false,
    inputHint_: null as { /** box */ b: HTMLDivElement; /** hints */ h: HintsNS.InputHintItem[] } | null,
    suppressType_: null as string | null,
    last_: null as LockableElement | null,
    mutable_: true,
    initI_ (): void {
      /** if `notBody` then `activeEl` is not null */
      let activeEl = vDom.activeEl_unsafe_(),
      notBody = activeEl !== doc.body && (!(Build.BTypes & BrowserType.Firefox)
            || Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox
            || vDom.isHTML_() || activeEl !== vDom.docEl_unsafe_()) && !!activeEl;
      KeydownEvents = safer(null);
      if (fgCache.g && InsertMode.grabBackFocus_) {
        let counter = 0, prompt = function (): void {
          counter++ || console.log("Vimium C blocks auto-focusing.");
        };
        if (notBody = notBody && vDom.getEditableType_(activeEl!)) {
          InsertMode.last_ = null;
          prompt();
          (activeEl as LockableElement).blur();
          // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
          notBody = (activeEl = vDom.activeEl_unsafe_()) !== doc.body;
        }
        if (!notBody) {
          InsertMode.grabBackFocus_ = function (event: Event, target: LockableElement): void {
            const activeEl1 = vDom.activeEl_unsafe_();
            if (activeEl1 === target || activeEl1 && vDom.GetShadowRoot_(activeEl1)) {
              vKey.Stop_(event);
              prompt();
              target.blur();
            }
          };
          vKey.pushHandler_(InsertMode.ExitGrab_, InsertMode);
          setupEventListener(0, "mousedown", InsertMode.ExitGrab_);
          return;
        }
      }
      InsertMode.grabBackFocus_ = false;
      if (notBody && vDom.getEditableType_(activeEl!)) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        insertLock = activeEl as LockableElement;
      }
    },
    ExitGrab_: function (this: void, event?: Req.fg<kFgReq.exitGrab> | Event | HandlerNS.Event
        ): HandlerResult.Nothing | void {
      if (!InsertMode.grabBackFocus_) { return /* safer */ HandlerResult.Nothing; }
      InsertMode.grabBackFocus_ = false;
      vKey.removeHandler_(InsertMode);
      setupEventListener(0, "mousedown", InsertMode.ExitGrab_, 1);
      // it's acceptable to not set the userActed flag if there's only the top frame;
      // when an iframe gets clicked, the events are mousedown and then focus, so SafePost_ is needed
      !((event && (event as HandlerNS.Event).e || event) instanceof Event) || !frames.length && isTop ||
      vPort.SafePost_({ H: kFgReq.exitGrab });
      return HandlerResult.Nothing;
    } as {
      (this: void, event: HandlerNS.Event): HandlerResult.Nothing;
      (this: void, request: Req.bg<kBgReq.exitGrab>): void;
      (this: void, event?: Event): void;
    },
    isInInsert_ (): boolean {
      if (InsertMode.suppressType_) { return false; }
      if (insertLock || InsertMode.global_) {
        return true;
      }
      const el: Element | null = vDom.activeEl_unsafe_();
/** Ignore standalone usages of `{-webkit-user-modify:}` without `[contenteditable]`
 * On Chromestatus, this is tagged `WebKitUserModify{PlainText,ReadWrite,ReadOnly}Effective`
 * * https://www.chromestatus.com/metrics/css/timeline/popularity/338
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/element.cc?dr=C&q=IsRootEditableElementWithCounting&g=0&l=218
 * `only used {-wum:RW}` in [0.2914%, 0.2926%]
 * * Total percentage of `WebKitUserModifyReadWriteEffective` is 0.2926%, `WebKitUserModifyReadOnlyEffective` is ~ 0.000006%
 * * `all used [ce=PT]` := `PlainTextEditingEffective - WebKitUserModifyPlainTextEffective` = 0.5754% - 0.5742% = 0.0012%
 * * `contributed WebKitUserModifyReadWriteEffective` <= 0.0012%
 * `only used {-wum:PT}` in [0, 0.5742%]
 * And in top sites only "tre-rj.*.br" (Brazil) and "slatejs.org" causes `WebKitUserModify{RW/PT}Effective`
 * * in slatejs.org, there's `[contenteditable=true]` and `{-webkit-user-modify:*plaintext*}` for browser compatibility
 */
      if (el && (el as TypeToAssert<Element, HTMLElement, "isContentEditable">).isContentEditable === true) {
        esc(HandlerResult.Nothing);
        insertLock = el as LockableElement;
        return true;
      } else {
        return false;
      }
    },
    /** should only be called during keydown events */
    focusUpper_ (this: void, key: kKeyCode, force: boolean, event: ToPrevent
        ): void | 1 {
      const parEl = vDom.frameElement_();
      if (!parEl && (!force || isTop)) { return; }
      vKey.prevent_(event); // safer
      if (parEl) {
        KeydownEvents[key] = 1;
        const parentCore = Build.BTypes & BrowserType.Firefox ? vDom.parentCore_ff_!() : parent as Window,
        a1 = parentCore && parentCore.VApi;
        if (a1 && !a1.keydownEvents_(Build.BTypes & BrowserType.Firefox ? events.keydownEvents_() : events)) {
          ((parentCore as Exclude<typeof parentCore, 0 | void | null>).VKey as typeof VKey).suppressTail_(0);
          a1.focusAndRun_(0, 0 as never, 0 as never, 1);
        } else {
          (Build.BTypes & BrowserType.Firefox ? parent as Window : parentCore as Window).focus();
        }
      } else if (KeydownEvents[key] !== 2) { // avoid sending too many messages
        post({ H: kFgReq.nextFrame, t: Frames.NextType.parent, k: key });
        KeydownEvents[key] = 2;
      }
    },
    exitI_ (target: Element): void {
      if (vDom.GetShadowRoot_(target)) {
        if (target = insertLock as unknown as Element) {
          insertLock = null;
          (target as LockableElement).blur();
        }
      } else if (target === insertLock ? (insertLock = null, 1) : vDom.getEditableType_(target)) {
        (target as LockableElement).blur();
      }
      if (InsertMode.global_) {
        insertLock = null; InsertMode.global_ = null;
        HUD.hide_();
      }
    },
    onExitSuppress_: null as ((this: void) => void) | null,
    exitInputHint_ (): void {
      let hint = InsertMode.inputHint_;
      if (!hint) { return; }
      InsertMode.inputHint_ = null;
      hint.b.remove();
      vKey.removeHandler_(hint);
    }
  },

  Pagination = {
  followLink_ (linkElement: SafeHTMLElement): boolean {
    let url = linkElement.localName === "link" && (linkElement as HTMLLinkElement).href;
    if (url) {
      Commands[kFgCmd.reload](1, vKey.safer_({ url }));
    } else {
      vDom.view_(linkElement);
      // note: prepareCrop is called during UI.flash_
      vCui.flash_(linkElement);
      VKey.timeout_(function () { vCui.click_(linkElement); }, 100);
    }
    return true;
  },
  GetButtons_: function (this: void, hints, element): void {
    let s: string | null;
    const tag = element.localName, isClickable = tag === "a" || tag && (
      tag === "button" ? !(element as HTMLButtonElement).disabled
      : vDom.clickable_.has(element)
      || (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
          ? (vHints.unwrap_(element)).onclick : element.getAttribute("onclick"))
      || (
        (s = element.getAttribute("role")) ? (<RegExpI> /^(button|link)$/i).test(s)
        : vHints.ngEnabled_ && element.getAttribute("ng-click")));
    if (!isClickable) { return; }
    if (!vDom.isAriaNotTrue_(element, kAria.disabled)) { return; }
    const rect = vDom.getBoundingClientRect_(element);
    if (rect.width > 2 && rect.height > 2 && vDom.isStyleVisible_(element)) {
      hints.push(element);
    }
  } as HintsNS.Filter<SafeHTMLElement>,
  findAndFollowLink_ (names: string[], isNext: boolean, lenLimit: number[], totalMax: number): boolean {
    interface Candidate { [0]: number; [1]: string; [2]: Parameters<typeof Pagination.GetButtons_>[0][number] }
    // Note: this traverser should not need a prepareCrop
    let links = vHints.traverse_(vHints.kSafeAllSelector_, Pagination.GetButtons_, true, true);
    const wordRe = <RegExpOne> /\b/,
    quirk = isNext ? ">>" : "<<", quirkIdx = names.indexOf(quirk),
    rel = isNext ? "next" : "prev", relIdx = names.indexOf(rel),
    detectQuirk = quirkIdx > 0 ? names.lastIndexOf(quirk[0], quirkIdx) : -1,
    refusedStr = isNext ? "<" : ">";
    links.push(vDom.docEl_unsafe_() as never);
    let candidates: Candidate[] = [], ch: string, s: string, maxLen = totalMax, len: number;
    let i: number, candInd = 0, count = names.length;
    for (i = 0; i < count; i++) {
      if (GlobalConsts.SelectorPrefixesInPatterns.includes(names[i][0])) {
        const arr = vDom.querySelectorAll_unsafe_<1>(names[i]);
        if (arr && arr.length === 1 && vDom.htmlTag_(arr[0])) {
          candidates.push([i << 23, "", arr[0] as SafeHTMLElement]);
          count = i + 1;
          break;
        }
      }
    }
    for (let wsRe = <RegExpOne> /\s+/, _len = links.length - 1; 0 <= --_len; ) {
      const link = links[_len];
      if (link.contains(links[_len + 1]) || (s = link.innerText).length > totalMax) { continue; }
      if (s = s || (ch = (link as HTMLInputElement).value) && ch.toLowerCase && ch
              || link.getAttribute("aria-label") || link.title) {
        if (s.length > totalMax) { continue; }
        s = s.toLowerCase();
        for (i = 0; i < count; i++) {
          if (s.length < lenLimit[i] && s.includes(names[i])) {
            if (!s.includes(refusedStr) && (len = (s = s.trim()).split(wsRe).length) <= maxLen) {
              maxLen > len && (maxLen = len + 1);
              let i2 = names.indexOf(s, i);
              if (i2 >= 0) { i = i2; len = 0; }
              else if (detectQuirk === i && s.includes(quirk)) { i = quirkIdx; len = 1; }
              // requires GlobalConsts.MaxNumberOfNextPatterns <= 255
              candidates.push([
                    !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
                    && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
                    ? (i << 23) | (len << 16) : (i << 23) | (len << 16) | candInd++ & 0xffff,
                  s, link]);
            }
            break;
          }
        }
      }
      // for non-English pages like www.google.co.jp
      if (s.length < 5 && relIdx >= 0 && (ch = link.id) && ch.includes(rel)) {
        candidates.push([
              !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
              && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
              ? (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16)
              : (relIdx << 23) | (((4 + ch.length) & 0x3f) << 16) | candInd++ & 0xffff,
            rel, link]);
      }
    }
    if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
        ? candidates.length <= 0 : candInd <= 0) {
      return false;
    }
    links = [];
    maxLen = (maxLen + 1) << 16;
    candidates = candidates.filter(a => (a[0] & 0x7fffff) < maxLen).sort((a, b) => a[0] - b[0]);
    for (i = candidates[0][0] >> 23; i < count; ) {
      s = names[i++];
      const re = new RegExp(wordRe.test(s[0]) || wordRe.test(s.slice(-1)) ? `\\b${s}\\b` : s, ""), j = i << 23;
      for (const candidate of candidates) {
        if (candidate[0] > j) { break; }
        if (!candidate[1] || re.test(candidate[1])) { return Pagination.followLink_(candidate[2]); }
      }
    }
    return false;
  },
  findAndFollowRel_ (relName: string): boolean {
    const elements = VDom.querySelectorAll_unsafe_("[rel]");
    let s: string | null | undefined;
    type HTMLElementWithRel = HTMLAnchorElement | HTMLAreaElement | HTMLLinkElement;
    for (let _i = 0, _len = elements.length, re1 = <RegExpOne> /\s+/; _i < _len; _i++) {
      const element = elements[_i];
      if ((<RegExpI> /^(a|area|link)$/).test(vDom.htmlTag_(element))
          && (s = (element as TypeToPick<HTMLElement, HTMLElementWithRel, "rel">).rel)
          && s.trim().toLowerCase().split(re1).indexOf(relName) >= 0) {
        return Pagination.followLink_(element as HTMLElementWithRel as SafeHTMLElement);
      }
    }
    return false;
  }
  },
  FrameMask = {
    more_: false,
    node_: null as HTMLDivElement | null,
    _fmTimer: 0,
    Focus_ (this: void, req: BgReq[kBgReq.focusFrame]): void {
      // Note: .c, .S are ensured to exist
      let mask = req.m, div: Element | null, body: Element | null;
      req.H && vCui.css_(req.H);
      if (mask !== FrameMaskType.NormalNext) { /* empty */ }
      else if (events.checkHidden_()
        // check <div> to detect whether no other visible elements except <frame>s in this frame
        || (Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter && Build.BTypes & BrowserType.Chrome
              // treat a doc.body of <form> as <frameset> to simplify logic
              ? vDom.notSafe_not_ff_!(body = doc.body) || body && vDom.htmlTag_(body) === "frameset"
              : doc.body && vDom.htmlTag_(doc.body) === "frameset")
            && (div = vDom.querySelector_unsafe_("div"), !div || div === vCui.box_ && !vKey._handlers.length)
      ) {
        post({
          H: kFgReq.nextFrame,
          k: req.k
        });
        return;
      }
      mask && VKey.timeout_(() => events.focusAndRun_(), 1); // require FrameMaskType.NoMaskAndNoFocus is 0
      if (req.c) {
        type TypeChecked = { [key1 in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
            count: number, options: CmdOptions[T2] & FgOptions) => void; };
        (Commands as TypeChecked)[req.c](req.n!, req.a!);
      }
      KeydownEvents[req.k] = 1;
      FrameMask.showFM_(mask);
    },
    showFM_ (mask: FrameMaskType): void {
      if (!isTop && mask === FrameMaskType.NormalNext) {
        let docEl = vDom.docEl_unsafe_();
        if (docEl) {
        Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
          && (!(Build.BTypes & ~BrowserType.Chrome) || browserVer < BrowserVer.MinScrollIntoViewOptions)
        ? Element.prototype.scrollIntoViewIfNeeded!.call(docEl)
        : vDom.scrollIntoView_(docEl);
        }
      }
      if (mask < FrameMaskType.minWillMask || !vDom.isHTML_()) { return; }
      let _this = FrameMask, dom1: HTMLDivElement | null;
      if (dom1 = _this.node_) {
        _this.more_ = true;
      } else {
        dom1 = vDom.createElement_("div");
        dom1.className = "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : "");
        _this.node_ = dom1;
        _this._fmTimer = setInterval(_this.Remove_, isTop ? 200 : 350);
      }
      vCui.add_(dom1);
    },
    Remove_ (this: void, fake?: TimerType.fake): void { // safe-interval
      const _this = FrameMask, { more_ } = _this;
      _this.more_ = false;
      if (more_ && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                      && fake)) { return; }
      if (_this.node_) { _this.node_.remove(); _this.node_ = null; }
      clearInterval(_this._fmTimer);
    }
  },
  HUD = {
    _tweenId: 0,
    boxH_: null as HTMLDivElement | null,
    _$text: null as never as Text,
    text_: "",
    opacity_: 0 as 0 | 0.25 | 0.5 | 0.75 | 1,
    enabled_: false,
    _timerH: TimerID.None,
    copied_: function (text: string, e?: "url" | "", virtual?: 1): string | void {
      if (!text) {
        if (virtual) { return text; }
        return HUD.tip_(e ? kTip.noUrlCopied : kTip.noTextCopied, 1000);
      }
      if (text.startsWith(!(Build.BTypes & ~BrowserType.Firefox) ? "moz-" : "chrome-") && text.includes("://")) {
        text = text.slice(text.indexOf("/", text.indexOf("/") + 2) + 1) || text;
      }
      text = (text.length > 41 ? text.slice(0, 41) + "\u2026" : text + ".");
      return virtual ? text : HUD.tip_(kTip.copiedIs, 2000, [text]);
    } as VHUDTy["copied_"],
    tip_ (tid: kTip | HintMode, duration?: number, args?: Array<string | number>): void {
      HUD.show_(tid, args);
      HUD.text_ && (HUD._timerH = VKey.timeout_(HUD.hide_, duration || 1500));
    },
    show_ (tid: kTip | HintMode, args?: Array<string | number>, embed?: boolean): void {
      if (!HUD.enabled_ || !vDom.isHTML_()) { return; }
      const text = HUD.text_ = VTr(tid, args);
      HUD.opacity_ = 1;
      if (HUD._timerH) { VKey.clearTimeout_(HUD._timerH); HUD._timerH = TimerID.None; }
      embed || HUD._tweenId || (HUD._tweenId = setInterval(HUD._tween, 40));
      let el = HUD.boxH_;
      if (el) {
        HUD._$text.data = text;
        if (Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval
            && Build.BTypes & BrowserType.Chrome) {
          embed && (el.style.opacity = el.style.visibility = "");
          return;
        }
        embed && (el.style.cssText = "");
        return;
      }
      el = vDom.createElement_("div");
      el.className = "R HUD" + fgCache.d;
      el.textContent = text;
      HUD._$text = el.firstChild as Text;
      if (!embed) {
        const st = el.style;
        st.opacity = "0";
        st.visibility = "hidden";
        vCui.box_ || vCui.ensureBorder_();
      }
      vCui.add_(HUD.boxH_ = el, vHints.hints_ ? AdjustType.NotAdjust : AdjustType.DEFAULT, vHints.boxL_);
    },
    _tween (this: void, fake?: TimerType.fake): void { // safe-interval
      const el = HUD.boxH_!, st = el.style;
      let opacity = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                    && fake ? 0 : +(st.opacity || 1);
      if (opacity === HUD.opacity_) { /* empty */ }
      else if (opacity === 0) {
        HUD._$text.data = HUD.text_;
        st.opacity = fgCache.m
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && fake
            ? "" : "0.25";
        st.visibility = "";
        return vCui.adjust_();
      } else if (!fgCache.m && doc.hasFocus()) {
        opacity += opacity < HUD.opacity_ ? 0.25 : -0.25;
      } else {
        opacity = HUD.opacity_;
      }
      st.opacity = opacity < 1 ? "" + opacity : "";
      if (opacity !== HUD.opacity_) { return; }
      if (opacity === 0) {
        st.visibility = "hidden";
        HUD._$text.data = "";
      }
      clearInterval(HUD._tweenId);
      HUD._tweenId = 0;
    },
    hide_ (this: void, info?: TimerType): void {
      let i: number;
      if (i = HUD._timerH) { vKey.clearTimeout_(i); HUD._timerH = TimerID.None; }
      HUD.opacity_ = 0; HUD.text_ = "";
      if (!HUD.boxH_) { /* empty */ }
      else if (info === TimerType.noTimer || !isEnabled) {
        const box = HUD.boxH_, st = box.style;
        st.opacity = "0";
        st.visibility = "hidden";
        HUD._$text.data = "";
      }
      else if (!HUD._tweenId && VHud) {
        HUD._tweenId = setInterval(HUD._tween, 40);
      }
    }
  },
  requestHandlers: { [k in keyof BgReq]: (this: void, request: BgReq[k]) => void } = [
    /* kBgReq.init: */ function (request: BgReq[kBgReq.init]): void {
      const r = requestHandlers, {c: load, s: flags} = request;
      if (Build.BTypes & BrowserType.Chrome) {
        browserVer = load.v as BrowserVer;
      }
      if (<number> Build.BTypes !== BrowserType.Chrome && <number> Build.BTypes !== BrowserType.Firefox
          && <number> Build.BTypes !== BrowserType.Edge) {
        (window as Writable<Window>).VOther = OnOther = load.b!;
      }
      vDom.cache_ = (vKey.cacheK_ = fgCache = load) as EnsureItemsNonNull<typeof load>;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
        load.o || (vKey.keyIdCorrectionOffset_old_cr_ = 300);
      }
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoKeygenElement
          || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinNoKeygenElement) {
        /** here should keep the same as {@link ../background/settings.ts#Settings_.payload_} */
        if (Build.BTypes & BrowserType.Chrome
            ? Build.MinCVer < BrowserVer.MinNoKeygenElement && browserVer < BrowserVer.MinNoKeygenElement
            : Build.BTypes & BrowserType.Firefox
            ? Build.MinFFVer < FirefoxBrowserVer.MinNoKeygenElement
              && <FirefoxBrowserVer | 0> load.v < FirefoxBrowserVer.MinNoKeygenElement
            : false) {
          (vDom.editableTypes_ as Writable<typeof VDom.editableTypes_>).keygen = EditableType.Select;
        }
      }
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
          && browserVer < BrowserVer.MinFramesetHasNoNamedGetter) {
        vHints.kSafeAllSelector_ += ":not(" + (vDom.unsafeFramesetTag_old_cr_ = "frameset") + ")";
      }
      if (Build.BTypes & ~BrowserType.Firefox && Build.BTypes & BrowserType.Firefox
          && OnOther === BrowserType.Firefox) {
        vDom.notSafe_not_ff_ = (_el): _el is HTMLFormElement => false;
        vDom.isHTML_ = (): boolean => doc instanceof HTMLDocument;
      }
      r[kBgReq.keyFSM](request);
      if (flags) {
        InsertMode.grabBackFocus_ = InsertMode.grabBackFocus_ && !(flags & Frames.Flags.userActed);
        isLocked = !!(flags & Frames.Flags.locked);
      }
      (r[kBgReq.reset] as (request: BgReq[kBgReq.reset], initing?: 1) => void)(request, 1);
      if (isEnabled) {
        InsertMode.initI_();
        if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
            && Build.BTypes & BrowserType.Chrome
            && browserVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow) {
          hook(HookAction.SuppressListenersOnDocument);
        }
      } else {
        InsertMode.grabBackFocus_ = false;
        hook(HookAction.Suppress);
        events.execute_ && events.execute_(kContentCmd.SuppressClickable);
      }
      r[kBgReq.init] = null as never;
      vDom.OnDocLoaded_(function (): void {
        HUD.enabled_ = true;
        onWndFocus = vPort.SafePost_.bind(vPort as never, <Req.fg<kFgReq.focus>> { H: kFgReq.focus });
        VKey.timeout_(function (): void {
          const parentCore = !(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
              ? vDom.parentCore_ff_!() : vDom.allowScripts_ && vDom.frameElement_() && parent as Window,
          parDom = parentCore && parentCore.VDom as typeof VDom,
          parHints = parentCore && parentCore.VHints as typeof VHints;
          if (needToRetryParentClickable) {
          const oldSet = vDom.clickable_ as any as Element[] & Set<Element>,
          set = vDom.clickable_ = parDom ? parDom.clickable_ : new WeakSet!<Element>();
          if (!Build.NDEBUG && parDom) {
            // here assumes that `set` is not a temp array but a valid WeakSet / Set
            let count: number;
            if (Build.MinCVer >= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
                || oldSet.size != null) {
              count = oldSet.size;
              oldSet.forEach(el => set.add(el));
            } else {
              count = oldSet.filter(el => set.add(el)).length;
            }
            console.log(`Vimium C: extend click: ${count ? "add " + count : "no"} local items to the parent's set.`);
          } else {
            oldSet.forEach(el => set.add(el));
          }
          }
          if (parHints && (parHints._master as typeof VHints || parHints).hasExecuted_) {
            (parHints._master || parHints)._reinit();
          }
        }, 330);
      });
      injector && injector.$r(InjectorTask.extInited);
    },
    /* kBgReq.reset: */ function (request: BgReq[kBgReq.reset], initing?: 1): void {
      const newPassKeys = request.p, newEnabled = newPassKeys !== "", old = isEnabled;
      passKeys = newPassKeys && safer<1>(null);
      if (newPassKeys) {
        isPassKeysReverted = newPassKeys[0] === "^" && newPassKeys.length > 2;
        for (const ch of (isPassKeysReverted ? newPassKeys.slice(2) : newPassKeys).split(" ")) {
          (passKeys as SafeDict<1>)[ch] = 1;
        }
      }
      isEnabled = newEnabled;
      if (initing) {
        return;
      }
      isLocked = !!request.f;
      // if true, recover listeners on shadow roots;
      // otherwise listeners on shadow roots will be removed on next blur events
      if (newEnabled) {
        esc(HandlerResult.Nothing); // for passNextKey#normal
        old || InsertMode.initI_();
        (old && !isLocked) || hook(HookAction.Install);
        // here should not return even if old - a url change may mean the fullscreen mode is changed
      } else {
        Commands[kFgCmd.reset](1);
      }
      if (vCui.box_) { vCui.adjust_(+newEnabled ? 1 : 2); }
    },
    /* kBgReq.injectorRun: */ injector ? injector.$m : null as never,
    /* kBgReq.url: */ function<T extends keyof FgReq> (this: void, request: BgReq[kBgReq.url] & Req.fg<T>): void {
      delete (request as Req.bg<kBgReq.url>).N;
      request.u = location.href;
      post<T>(request);
    },
    /* kBgReq.msg: */ function<k extends keyof FgRes> (response: Omit<Req.res<k>, "N">): void {
      const arr = vPort._callbacks, id = response.m, handler = arr[id];
      delete arr[id];
      handler(response.r);
    },
    /* kBgReq.eval: */ function (options: BgReq[kBgReq.eval]): void { events.evalIfOK_(options.u); },
    /* kBgReq.settingsUpdate: */function ({ d: delta }: BgReq[kBgReq.settingsUpdate]): void {
      type Keys = keyof typeof delta;
      vKey.safer_(delta);
      const cache = fgCache;
      for (const i in delta) {
        (cache as Generalized<typeof cache>)[i as Keys] = (delta as EnsureItemsNonNull<typeof delta>)[i as Keys];
        const i2 = "_" + i as Keys;
        (i2 in cache) && (vKey.safer_(cache)[i2] = undefined as never);
      }
      delta.d != null && HUD.boxH_ && HUD.boxH_.classList.toggle("D", !!delta.d);
    },
    /* kBgReq.focusFrame: */ FrameMask.Focus_,
    /* kBgReq.exitGrab: */ InsertMode.ExitGrab_ as (this: void, request: Req.bg<kBgReq.exitGrab>) => void,
    /* kBgReq.keyFSM: */ function (request: BgReq[kBgReq.keyFSM]): void {
      const map = keyFSM = request.k, func = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf
        && Build.BTypes & BrowserType.Chrome && browserVer < BrowserVer.Min$Object$$setPrototypeOf
        ? vKey.safer_ : Object.setPrototypeOf;
      func(map, null);
      function iter(obj: ReadonlyChildKeyFSM): void {
        func(obj, null);
        for (const key in obj) {
          type ObjItem = Exclude<NonNullable<(typeof obj)[string]>, KeyAction.cmd>;
          obj[key] !== KeyAction.cmd && iter(obj[key] as ObjItem);
        }
      }
      for (const key in map) {
        const sec = map[key]!;
        sec && sec !== KeyAction.count && iter(sec);
      }
      (mappedKeys = request.m) && func(mappedKeys, null);
    },
    /* kBgReq.execute: */ function<O extends keyof CmdOptions> (request: BaseExecute<CmdOptions[O], O>): void {
      if (request.H) { vCui.css_(request.H); }
      esc(HandlerResult.Nothing);
      const options: CmdOptions[O] | null = request.a;
      type Keys = keyof CmdOptions;
      type TypeToCheck = {
        [key in Keys]: (this: void, count: number, options: CmdOptions[key] & SafeObject) => void;
      };
      type TypeChecked = {
        [key in Keys]: <T2 extends Keys>(this: void, count: number, options: CmdOptions[T2] & SafeObject) => void;
      };
      (Commands as TypeToCheck as TypeChecked)[request.c](request.n, options ? vKey.safer_(options) : safer(null));
    } as (req: BaseExecute<object, keyof CmdOptions>) => void,
    /* kBgReq.createMark: */ function (request: BgReq[kBgReq.createMark]): void { VMarks.createMark_(request.n); },
    /* kBgReq.showHUD: */ function (req: Req.bg<kBgReq.showHUD>): void {
      if (req.H) {
        vCui.css_(req.H);
        if (req.f) {
          vCui.findCss_ = req.f;
          vCui.styleFind_ && (vCui.styleFind_.textContent = req.f.i);
        }
      }
      req.c
        ? VVisual.modeV_ ? VVisual.prompt_(kTip.copiedIs, 2000, [HUD.copied_(req.t, "", 1)])
          : HUD.copied_(req.t)
        : req.t ? HUD.tip_(kTip.raw, 0, [req.t])
      : 0;
    },
    /* kBgReq.count: */ function (request: BgReq[kBgReq.count]): void {
      let n = parseInt(currentKeys, 10) || 1, count2: 0 | 1 | 2 | 3 = 0;
      esc(HandlerResult.Nothing);
      InsertMode.ExitGrab_();
      if (Build.BTypes & ~BrowserType.Chrome && request.m) {
        const now = Date.now(), result = confirm(request.m);
        count2 = Math.abs(Date.now() - now) > 9 ? result ? 3 : 1 : 2;
      }
      post({ H: kFgReq.cmd, c: request.c, n, i: request.i, r: count2 });
    },
    /* kBgReq.showHelpDialog: */
  function ({ h: html, c: shouldShowAdvanced, o: optionUrl, H: CSS
      , e: exitOnClick }: BgReq[kBgReq.showHelpDialog]): void {
    // Note: not suppress key on the top, because help dialog may need a while to render,
    // and then a keyup may occur before or after it
    if (CSS) { vCui.css_(CSS); }
    const oldShowHelp = Commands[kFgCmd.showHelp];
    oldShowHelp("e");
    if (!vDom.isHTML_()) { return; }
    if (oldShowHelp !== Commands[kFgCmd.showHelp]) { return; } // an old dialog exits
    let box: SafeHTMLElement;
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
      // on FF66, if a page is limited by "script-src 'self'; style-src 'self'"
      //   then `<style>`s created by `.innerHTML = ...` has no effects;
      //   so need `doc.createElement('style').textContent = ...`
      box = new DOMParser().parseFromString((html as Exclude<typeof html, string>).b, "text/html"
          ).body.firstChild as SafeHTMLElement;
      box.prepend!(vCui.createStyle_((html as Exclude<typeof html, string>).h));
    } else {
      box = vDom.createElement_("div");
      box.innerHTML = html as string;
      box = box.firstChild as SafeHTMLElement;
    }
    box.onclick = vKey.Stop_;
    VKey.suppressCommonEvents_(box, "mousedown");
    if (Build.MinCVer >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument
        || !(Build.BTypes & BrowserType.Chrome)
        || browserVer >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument) {
      setupEventListener(box,
        (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
          : OnOther !== BrowserType.Chrome)
        ? "click" : "DOMActivate", onActivate);
    }

    const query = box.querySelector.bind(box), closeBtn = query("#HClose") as HTMLElement,
    optLink = query("#OptionsPage") as HTMLAnchorElement, advCmd = query("#AdvancedCommands") as HTMLElement,
    hide: (this: void, e?: (EventToPrevent) | number | "e") => void = function (event): void {
      if (event instanceof Event) {
        vKey.prevent_(event);
      }
      advCmd.onclick = optLink.onclick = closeBtn.onclick = null as never;
      let i: Element | null = vDom.lastHovered_;
      i && box.contains(i) && (vDom.lastHovered_ = null);
      (i = vCui.activeEl_) && box.contains(i) && (vCui.activeEl_ = null);
      vKey.removeHandler_(box);
      box.remove();
      Commands[kFgCmd.showHelp] = oldShowHelp;
      vCui.setupExitOnClick_(1, 0);
    };
    closeBtn.onclick = Commands[kFgCmd.showHelp] = hide;
    if (! location.href.startsWith(optionUrl)) {
      optLink.href = optionUrl;
      optLink.onclick = function (event) {
        post({ H: kFgReq.focusOrLaunch, u: optionUrl });
        hide(event);
      };
    } else {
      optLink.remove();
    }
    function toggleAdvanced(this: void): void {
      const el2 = advCmd.firstChild as HTMLElement;
      el2.innerText = el2.dataset[shouldShowAdvanced ? "h" : "s"]!;
      box.classList.toggle("HelpDA");
    }
    advCmd.onclick = function (event) {
      vKey.prevent_(event);
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      post({
        H: kFgReq.setSetting,
        k: 0,
        v: shouldShowAdvanced
      });
    };
    shouldShowAdvanced && toggleAdvanced();
    vCui.ensureBorder_();
    vCui.add_(box, AdjustType.Normal, true);
    exitOnClick && vCui.setupExitOnClick_(1, hide);
    doc.hasFocus() || events.focusAndRun_();
    // on FF66, `scrollIntoView` does not set tab-navigation node
    !(Build.BTypes & BrowserType.Chrome) ? 0
      : Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions
      ? vDom.scrollIntoView_(box) : VFind.fixTabNav_(box);
    vCui.activeEl_ = box;
    vKey.pushHandler_(function (event) {
      if (!insertLock && vKey.isEscape_(getMappedKey(event, kModeId.Normal))) {
        vCui.removeSelection_(vCui.root_) || hide();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    }, box);
    if (VOmni.status_ >= VomnibarNS.Status.Showing) {
      vKey.removeHandler_(VOmni);
      vKey.pushHandler_(VOmni.onKeydownO_, VOmni);
    }
    // if no [tabindex=0], `.focus()` works if :exp and since MinElement$Focus$MayMakeArrowKeySelectIt or on Firefox
    VKey.timeout_((): void => box.focus(), 17);
  }
  ],

  safeDestroy: VApiTy["destroy_"] = function (this: void, silent): void {
    if (!esc) { return; }
    if (Build.BTypes & BrowserType.Firefox && silent === 9) {
      vPort._port = null;
      return;
    }
    isEnabled = !1;
    hook(HookAction.Destroy);

    let ui = VCui;
    Commands[kFgCmd.reset](0);
    events.execute_ && events.execute_(kContentCmd.Destroy);
    ui.box_ && ui.adjust_(2);
    ui.DoExitOnClick_();

    VDom = VKey = VCui = VHints = VSc = VOmni = VFind = VVisual = VMarks =
    VHud = VApi = VTr = esc = null as never;

    silent || console.log("%cVimium C%c in %o has been destroyed at %o."
      , "color:red", "color:auto"
      , location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
      , Date.now());

    if (vPort._port) { try { vPort._port.disconnect(); } catch {} }
    injector || (<RegExpOne> /a?/).test("");
  },

  events: VApiTy = VApi = {
    post_: post,
    send_ <k extends keyof FgRes> (this: void, cmd: k, args: Req.fgWithRes<k>["a"]
        , callback: (this: void, res: FgRes[k]) => void): void {
      let id = ++vPort._id;
      (post as Port["postMessage"])({ H: kFgReq.msg, i: id, c: cmd, a: args });
      vPort._callbacks[id] = callback as <K2 extends keyof FgRes>(this: void, res: FgRes[K2]) => void;
    },
    evalIfOK_ (url: string): boolean {
      if (!vDom.jsRe_.test(url)) {
        return false;
      }
      url = url.slice(11).trim();
      if ((<RegExpOne> /^void\s*\( ?0 ?\)\s*;?$|^;?$/).test(url)) { /* empty */ }
      else if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? vDom.allowScripts_ === 2 || vDom.allowScripts_ &&
            (vDom.allowScripts_ = vDom.runJS_("document.currentScript.dataset.vimium=1", 1)!.dataset.vimium ? 2 : 0)
          : vDom.allowScripts_) {
        VKey.timeout_(vDom.runJS_.bind(vDom, vHints.decodeURL_(url, decodeURIComponent)), 0);
      } else {
        HUD.tip_(kTip.failToEvalJS);
      }
      return true;
    },

    lock_ (): LockableElement | null {
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          && insertLock) {
        const root = insertLock.getRootNode!();
        insertLock = root && (root as TypeToPick<Node, DocumentOrShadowRoot, "activeElement">
            ).activeElement === insertLock ? insertLock : null;
      }
      return insertLock;
    },
    isCmdTriggered_: () => isCmdTriggered,
    onWndBlur_ (this: void, f): void { onWndBlur2 = f; },
    OnWndFocus_ (this: void): void { onWndFocus(); },
    checkHidden_ (this: void, cmd?: FgCmdAcrossFrames
        , count?: number, options?: OptionsWithForce): BOOL {
      if (innerHeight < 3 || innerWidth < 3) { return 1; }
      // here should not use the cache frameElement, because `getComputedStyle(frameElement).***` might break
      const curFrameElement_ = !isTop && (Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
              || !(Build.BTypes & ~BrowserType.Firefox) ? frameElement : vDom.frameElement_()),
      el = !isTop && (curFrameElement_ || vDom.docEl_unsafe_());
      if (!el) { return 0; }
      let box = vDom.getBoundingClientRect_(el),
      par: ReturnType<typeof VDom.parentCore_ff_> | undefined,
      parEvents: VApiTy | undefined,
      result: boolean | BOOL = !box.height && !box.width || !vDom.isStyleVisible_(el);
      if (cmd) {
        // if in a forced cross-origin env (by setting doc.domain),
        // then par.self.innerHeight works, but this behavior is undocumented,
        // so here only use `par.VIh()` in case
        if ((Build.BTypes & BrowserType.Firefox ? (par = vDom.parentCore_ff_!()) : curFrameElement_)
            && (result || box.bottom <= 0
                || (Build.BTypes & BrowserType.Firefox && par !== parent
                      ? box.top > (par as ContentWindowCore).VIh!()
                      : box.top > (parent as Window).innerHeight))) {
          parEvents = ((Build.BTypes & BrowserType.Firefox ? par : parent) as ContentWindowCore).VApi;
          if (parEvents
              && !parEvents.keydownEvents_(Build.BTypes & BrowserType.Firefox ? events.keydownEvents_() : events)) {
            parEvents.focusAndRun_(cmd, count!, options!, 1);
            result = 1;
          }
        }
        if (result === true) { // if there's a same-origin parent, use it instead of top
          // here not suppress current cmd, in case of malformed pages;
          // the worst result is doing something in a hidden frame,
          //   which is tolerable, since only few commands do check hidden)
          options!.$forced ? (result = 0) : post({
            H: kFgReq.gotoMainFrame, f: 1,
            c: cmd,
            n: count!, a: options!
          });
        }
      }
      return +result as BOOL;
    },
    focusAndRun_ (this: void, cmd?: FgCmdAcrossFrames, count?: number, options?: FgOptions
        , showBorder?: 1): void {
      InsertMode.ExitGrab_();
      let old = onWndFocus, failed = true;
      onWndFocus = function (): void { failed = false; };
      if (!(Build.BTypes & BrowserType.Firefox)
          || (Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox)) {
        /* empty */
      } else if (VOmni.status_ === VomnibarNS.Status.Showing) {
        VOmni.boxO_.blur();
      } else {
        // cur is safe because on Firefox
        const cur = vDom.activeEl_unsafe_() as SafeElement | null;
        cur && (<RegExpOne> /^i?frame$/).test(cur.localName) && cur.blur && cur.blur();
      }
      focus();
      /** Maybe a `doc.open()` has been called
       * Step 8 of https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#document-open-steps
       * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/doc.cc?q=Document::open&l=3107
       */
      failed && isEnabled && hook(HookAction.Install);
      // the line below is always necessary: see https://github.com/philc/vimium/issues/2551#issuecomment-316113725
      (onWndFocus = old)();
      if (esc) {
        esc(HandlerResult.Nothing);
        if (cmd) {
          type TypeChecked = { [key in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
              count: number, options: CmdOptions[T2] & FgOptions) => void; };
          (Commands as TypeChecked)[cmd](count!, options!);
        }
        showBorder && FrameMask.showFM_(FrameMaskType.ForcedSelf);
      }
    },
    setupSuppress_ (this: void, onExit?: (this: void) => void): void {
      const f = InsertMode.onExitSuppress_;
      InsertMode.onExitSuppress_ = InsertMode.suppressType_ = null;
      if (onExit) {
        InsertMode.suppressType_ = vDom.getSelection_().type;
        InsertMode.onExitSuppress_ = onExit;
      }
      if (f) { return f(); }
    },
    execute_: null as VApiTy["execute_"],
    destroy_: safeDestroy,
    keydownEvents_: function (this: void, arr?: Pick<VApiTy, "keydownEvents_"> | KeydownCacheArray
        ): KeydownCacheArray | boolean {
      if (!arr) { return KeydownEvents; }
      return !isEnabled || !(KeydownEvents = Build.BTypes & BrowserType.Firefox ? arr as KeydownCacheArray
          : (arr as VApiTy).keydownEvents_());
    } as VApiTy["keydownEvents_"]
  },

  vPort = {
    _port: null as Port | null,
    _callbacks: safer(null) as { [msgId: number]: <k extends keyof FgRes>(this: void, res: FgRes[k]) => void },
    _id: 1,
    SafePost_<k extends keyof FgReq> (this: void, request: FgReq[k] & Req.baseFg<k>): void {
      try {
        if (!vPort._port) {
          vPort.Connect_();
          injector && VKey.timeout_(vPort.TestAlive_, 50);
        } else if (Build.BTypes & BrowserType.Firefox && injector) {
          injector.$r(InjectorTask.recheckLiving);
        }
        post(request);
      } catch { // this extension is reloaded or disabled
        safeDestroy();
      }
    },
    Listener_<T extends keyof BgReq> (this: void, response: Req.bg<T>): void {
      type TypeToCheck = { [k in keyof BgReq]: (this: void, request: BgReq[k]) => void };
      type TypeChecked = { [k in keyof BgReq]: <T2 extends keyof BgReq>(this: void, request: BgReq[T2]) => void };
      (requestHandlers as TypeToCheck as TypeChecked)[response.N](response);
    },
    TestAlive_ (): void { vPort._port || safeDestroy(); },
    ClearPort_ (this: void): void {
      vPort._port = null;
      VKey.timeout_(function (i): void {
        if (!(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i)) {
          try { vPort._port || !esc || vPort.Connect_(); return; } catch {}
        }
        safeDestroy();
      }, requestHandlers[kBgReq.init] ? 2000 : 5000);
    },
    Connect_: ((): void => {
      const api = Build.BTypes & ~BrowserType.Chrome
          && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
          ? browser as typeof chrome : chrome,
      status = requestHandlers[0] ? PortType.initing
        : (isEnabled ? passKeys ? PortType.knownPartial : PortType.knownEnabled : PortType.knownDisabled)
        + (isLocked ? PortType.isLocked : 0) + (vCui.styleIn_ ? PortType.hasCSS : 0),
      name = PortType.isTop * +isTop + PortType.hasFocus * +doc.hasFocus() + status,
      data = { name: injector ? PortNameEnum.Prefix + name + injector.$h
          : !(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && OnOther & BrowserType.Edge
          ? name + PortNameEnum.Delimiter + location.href
          : "" + name
      },
      connect = api.runtime.connect, trans = api.i18n.getMessage,
      port = vPort._port = injector ? connect(injector.id, data) as Port : connect(data) as Port;
      port.onDisconnect.addListener(vPort.ClearPort_);
      port.onMessage.addListener(vPort.Listener_);
      VTr = VTr || ((tid, args) => trans("" + tid, args));
    })
  },

  domNodeMap = Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
      || WeakMap ? new WeakMap!<Node, kNodeInfo>() as never : {
    set (node: Node, info: Exclude<kNodeInfo, kNodeInfo.NONE>): any { (node as NodeWithInfo).vimiumInfo = info; },
    get (node: Node): kNodeInfo | undefined { return (node as NodeWithInfo).vimiumInfo; },
    delete (node: Node): any { delete (node as NodeWithInfo).vimiumInfo; }
  };

  if (injector) {
    injector.$p = [vPort.SafePost_, function () {
      let keys = currentKeys; esc(HandlerResult.Nothing); return keys;
    }];
  }

  VHud = HUD;
  vKey.key_ = getMappedKey;
  if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
    (window as Writable<Window>).VOther = OnOther;
  }
  if (!(Build.BTypes & BrowserType.Firefox)) { /* empty */ }
  else if (Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox || injector !== void 0) {
    vDom.getWndCore_ff_ = wnd => wnd;
  } else {
    coreTester = {
      name_: BuildStr.CoreGetterFuncName as const,
      rand_: 0,
      recvTick_: 0,
      sendTick_: 0,
      encrypt_ (trustedRand: number, unsafeRand: number): string {
        trustedRand += (unsafeRand >= 0 && unsafeRand < 1 ? unsafeRand : trustedRand);
        let a = (0x8000 * trustedRand) | 0,
        host = new URL((browser as typeof chrome).runtime.getURL("")).host.replace(<RegExpG> /-/g, "");
        return ((host + (
              typeof BuildStr.RandomReq === "number" ? (BuildStr.RandomReq as number | string as number).toString(16)
              : BuildStr.RandomReq)
            ).match(<RegExpG> /[\da-f]{1,4}/gi)!
            ).map((i, ind) => parseInt(i, 16) & (ind & 1 ? ~a : a)).join("");
      },
      compare_ (rand2: number, testEncrypted: string): boolean {
        const diff = coreTester.encrypt_(coreTester.rand_, +rand2) !== testEncrypted, d2 = coreTester.recvTick_ > 64;
        coreTester.recvTick_ += d2 ? 0 : diff ? 2 : 1;
        return diff || d2; // hide the real result if too many errors
      }
    };
    /** Note: this function needs to be safe enough */
    vDom.getWndCore_ff_ = function (anotherWnd: Window): ContentWindowCore | 0 | void {
      coreTester.recvTick_ = -1;
      try {
        let core: ReturnType<SandboxGetterFunc>,
        wrapper = anotherWnd.wrappedJSObject[coreTester.name_], getter = wrapper && wrapper._get;
        return getter && (core = getter(coreTester.compare_, coreTester.rand_ = Math.random())) &&
          !coreTester.recvTick_ ? core : 0;
      } catch {}
    };
    // on Firefox, such a exported function can only be called from privileged environments
    wrappedJSObject[coreTester.name_] = Object.defineProperty<SandboxGetterFunc>(
        (new window.Object() as any).wrappedJSObject as object,
        "_get", { configurable: false, enumerable: false, writable: false,
                  value (comparer, rand1) {
      let rand2 = Math.random();
      // an ES6 method function is always using the strict mode, so the arguments are inaccessible outside it
      if (coreTester.sendTick_ > GlobalConsts.MaxRetryTimesForSecret
          // if `comparer` is a Proxy, then `toString` returns "[native code]", so the line below is safe
          || esc.toString.call(comparer) !== coreTester.compare_ + ""
          || comparer(rand2, coreTester.encrypt_(rand2, +rand1))) {
        if (coreTester.sendTick_ <= GlobalConsts.MaxRetryTimesForSecret) {
          coreTester.sendTick_++;
        }
        return;
      }
      if (!thisCore) {
        /** @see {@link base.d.ts#ContentWindowCore} */
        thisCore = { VDom, VKey, VHints, VSc, VOmni, VFind, VApi, VIh: () => innerHeight, VCui };
      }
      return thisCore;
    }});
  }

  isTop || injector ||
  function (): void { // if injected, `parentFrame_` still needs a value
    const parEl = vDom.frameElement_();
    if (!parEl) {
      if ((Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
          || WeakSet) && <boolean> InsertMode.grabBackFocus_) {
        needToRetryParentClickable = 1;
        if (Build.MinCVer >= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
            || Set) {
          vDom.clickable_ = new Set!<Element>();
        } else {
          let arr: Element[] & typeof VDom.clickable_ = [] as any;
          vDom.clickable_ = arr;
          arr.add = arr.push;
          // a temp collection, so it's okay just to ignore its elements
          arr.has = Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes || !(Build.BTypes & BrowserType.Chrome)
              ? arr.includes! : () => !1;
        }
      }
      return;
    }
    type FindTy = typeof VFind;
    if (Build.BTypes & BrowserType.Firefox) {
      let core = Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox
          ? parent as Window // know it's in another extension's page, or not on Firefox
          : vDom.parentCore_ff_!();
      try { // `core` is still unsafe
        const vfind = core && core.VFind as FindTy | undefined;
        if (vfind) {
          if (vfind && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox
                        ? XPCNativeWrapper(vfind) : vfind).boxF_ === parEl) {
            safeDestroy(1);
            vfind.onLoad_();
          } else {
            vDom.clickable_ = ((core as Exclude<typeof core, 0 | null | void>).VDom as typeof VDom).clickable_;
          }
          return;
        }
      } catch (e) {
        if (!Build.NDEBUG) {
          console.log("Assert error: Parent frame check breaks:", e);
        }
      }
      if ((!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          && <boolean> InsertMode.grabBackFocus_) {
        // here the parent `core` is invalid - maybe from a fake provider
        vDom.parentCore_ff_ = () => 0;
      }
    } else {
      // if not `vfind`, then a parent may have destroyed for unknown reasons
      const vfind = (parent as Window).VFind as FindTy | undefined;
      if (vfind && vfind.boxF_ === parEl) {
        safeDestroy(1);
        vfind.onLoad_();
      } else {
        vDom.clickable_ = vfind as object | null as never && ((parent as Window).VDom as typeof VDom).clickable_;
      }
    }
  }();
  if (esc as EscF | null) {
    interface ElementWithClickable { vimiumClick?: boolean }
    vDom.clickable_ = !(Build.BTypes & BrowserType.Firefox)
        || Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox
        ? vDom.clickable_ ||
        ( Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
            || WeakSet ? new WeakSet!<Element>() as never : {
      add (element: Element): any { (element as ElementWithClickable).vimiumClick = true; },
      has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumClick; }
    }) : /* now know it's on Firefox */
        vDom.clickable_ || new WeakSet!<Element>();
    vDom.readyState_ = _initialDocState;
    {
      let execute = (callback: (this: void) => void): void => { callback(); },
      listeners1: Array<(this: void) => void> = [], listeners2: Array<(this: void) => void> = [],
      Name = "readystatechange",
      onReadyStateChange = function (): void {
        const stat = vDom.readyState_ = doc.readyState, loaded = stat < "i", arr = loaded ? listeners2 : listeners1;
        if (loaded) {
          setupEventListener(0, Name, onReadyStateChange, 1);
          onReadyStateChange = (vDom.OnDocLoaded_ = execute) as any;
        }
        arr.forEach(execute);
        arr.length = 0;
      };
      vDom.OnDocLoaded_ = _initialDocState < "i" ? execute : (setupEventListener(0, Name, onReadyStateChange),
          (callback, onloaded) => {
        vDom.readyState_ < "l" && !onloaded ? callback() : (onloaded ? listeners2 : listeners1).push(callback);
      });
    }
    // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
    hook(HookAction.Install);
    vPort.Connect_();
  }

  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
    const StringCls = String.prototype;
    /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
    if (!"".startsWith) {
      StringCls.startsWith = function (this: string, s: string): boolean {
        return this.lastIndexOf(s, 0) === 0;
      };
      StringCls.endsWith = function (this: string, s: string): boolean {
        const i = this.length - s.length;
        return i >= 0 && this.indexOf(s, i) === i;
      };
    }
    StringCls.includes = function (this: string, s: string, pos?: number): boolean {
    // eslint-disable-next-line @typescript-eslint/prefer-includes
      return this.indexOf(s, pos) >= 0;
    };
  }
})();
if (!(Build.NDEBUG || GlobalConsts.MaxNumberOfNextPatterns <= 255)) {
  console.log("Assert error: GlobalConsts.MaxNumberOfNextPatterns <= 255");
}
