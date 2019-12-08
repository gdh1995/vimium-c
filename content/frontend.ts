var VHud: VHUDTy, VApi: VApiTy, VTr: VTransType
  , VimiumInjector: VimiumInjectorTy | undefined | null;
if (Build.BTypes & BrowserType.Chrome && Build.BTypes & ~BrowserType.Chrome) { var browser: unknown; }

(function () {
  const enum kNodeInfo {
    NONE = 0,
    ShadowBlur = 1, ShadowFull = 2,
  }
  interface NodeWithInfo extends Node {
    vimiumInfo?: kNodeInfo;
  }

  interface EscF {
    <T extends Exclude<HandlerResult, HandlerResult.ExitPassMode>> (this: void, i: T): T;
    (this: void, i: HandlerResult.ExitPassMode): HandlerResult.Prevent;
  }
  interface Port extends chrome.runtime.Port {
    postMessage<k extends keyof FgRes>(request: Req.fgWithRes<k>): 1;
    postMessage<k extends keyof FgReq>(request: Req.fg<k>): 1;
  }
  interface SpecialCommands {
    [kFgCmd.reset] (this: void, isAlive: BOOL | CmdOptions[kFgCmd.reset]): void;
    [kFgCmd.showHelp] (msg?: number | "e"): void;
  }

  const doc = document, D = VDom, K = VKey, U = VCui, Hints = VHints;

  let KeydownEvents: KeydownCacheArray, keyMap: KeyMap
    , fgCache: SettingsNS.FrontendSettingCache = null as never
    , insertLock = null as LockableElement | null
    , thisCore: Writable<ContentWindowCore> | undefined
    , currentKeys = "", isEnabled = false, isLocked = false
    , mappedKeys = null as SafeDict<string> | null, nextKeys = null as KeyMap | ReadonlyChildKeyMap | null
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
    , isWaitingAccessKey: boolean = false
    , needToRetryParentClickable: BOOL = 0
    , safer = Object.create as { (o: null): any; <T>(o: null): SafeDict<T>; }
    , coreTester: { name_: string, rand_: number, recvTick_: number, sendTick_: number,
        encrypt_ (trustedRand: number, unsafeRand: number): string,
        compare_: Parameters<SandboxGetterFunc>[0] }
    ;

  function post<k extends keyof FgReq>(this: void, request: FgReq[k] & Req.baseFg<k>): 1 | void {
    (vPort._port as Port).postMessage(request);
  }

  function mapKey(this: void, /* not "" */ char: string, event: EventControlKeys, onlyChar?: string): string {
    let key = onlyChar || K.key_(event, char), mapped: string | undefined, chLower: string;
    if (mappedKeys) {
      key = mappedKeys[key] || (
        (mapped = mappedKeys[chLower = char.toLowerCase()]) && mapped.length < 2 ? (
          mapped = char === chLower ? mapped : mapped.toUpperCase(),
          onlyChar ? mapped : K.key_(event, mapped)
        ) : key
      );
    }
    return key;
  }
  function isEscape(event: KeyboardEvent): boolean {
    let ch0: string | undefined, ch: string | undefined;
    if (mappedKeys && event.keyCode !== kKeyCode.ime) {
      ch0 = K.char_(event);
      ch = ch0 && mapKey(ch0, event);
    }
    return ch ? ch === "<esc>" || ch === "<c-[>"
      ? (Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(event, ch0), true)
      : false
      : K._isRawEscape(event);
  }
  function checkKey(char: string, code: kKeyCode, event: KeyboardEvent
      ): HandlerResult.Nothing | HandlerResult.Prevent | HandlerResult.Esc | HandlerResult.AdvancedEscEnum {
    // when checkValidKey, Vimium C must be enabled, so passKeys won't be `""`
    const key0 = K.key_(event, char);
    if (passKeys && !currentKeys && (key0 in <SafeEnum> passKeys) !== isPassKeysReverted) {
      return esc(HandlerResult.Nothing);
    }
    let key: string = mappedKeys ? mapKey(char, event) : key0, j: ReadonlyChildKeyMap | ValidKeyAction | undefined;
    if (key === "<esc>" || key === "<c-[>") {
      Build.BTypes & BrowserType.Chrome && mappedKeys && checkPotentialAccessKey(event, char);
      return nextKeys ? (esc(HandlerResult.ExitPassMode), HandlerResult.Prevent)
        : key[1] === "c" ? HandlerResult.Esc : HandlerResult.AdvancedEscEnum;
    }
    if (!nextKeys || (j = nextKeys[key]) == null) {
      j = keyMap[key];
      if (j == null || nextKeys && passKeys && (key0 in <SafeEnum> passKeys) !== isPassKeysReverted) {
        return esc(HandlerResult.Nothing);
      }
      if (j !== KeyAction.cmd) { currentKeys = ""; }
    }
    currentKeys += key;
    if (j === KeyAction.cmd) {
      post({ H: kFgReq.key, k: currentKeys, l: code });
      esc(HandlerResult.Prevent);
      isCmdTriggered = 1;
    } else {
      nextKeys = j !== KeyAction.count ? j : keyMap;
    }
    return HandlerResult.Prevent;
  }
  /** @param key should be valid */
  function onEscDown(event: KeyboardEventToPrevent, key: kKeyCode
      ): HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent {
    let action: HandlerResult.Default | HandlerResult.PassKey | HandlerResult.Prevent = HandlerResult.Prevent
      , { repeat } = event
      , { activeElement: activeEl, body } = doc;
    /** if `notBody` then `activeEl` is not null */
    if (!repeat && U.removeSelection_()) {
      /* empty */
    } else if (repeat && !KeydownEvents[key] && activeEl !== body) {
      (Build.BTypes & ~BrowserType.Firefox ? typeof (activeEl as Element).blur === "function"
          : (activeEl as Element).blur) &&
      (activeEl as HTMLElement | SVGElement).blur();
    } else if (!isTop && activeEl === body) {
      InsertMode.focusUpper_(key, repeat, event);
      action = HandlerResult.PassKey;
    } else {
      action = HandlerResult.Default;
    }
    return action;
  }
  function onKeydown(event: KeyboardEventToPrevent): void {
    let keyChar: string | undefined, action: HandlerResult;
    const key = event.keyCode;
    if (!isEnabled
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
            : event.isTrusted === false) // skip checks of `instanceof KeyboardEvent` if checking `!.keyCode`
        || !key) { return; }
    if (VSc.keyIsDown_ && VSc.OnScrolls_(event)) {
      Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(event);
      return;
    }
    if (Build.BTypes & BrowserType.Chrome) { isWaitingAccessKey && resetAnyClickHandler(); }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) ? insertLock
          : insertLock && OnOther === BrowserType.Firefox)
        && !D.IsInDOM_(insertLock as LockableElement, doc)) {
      insertLock = null;
    }
    if (action = K.bubbleEvent_(event)) { /* empty */ }
    else if (InsertMode.isActive_()) {
      const g = InsertMode.global_;
      if (g ? !g.code ? isEscape(event) : key === g.code && K.getKeyStat_(event) === g.stat
          : key > kKeyCode.maxNotFn && key < kKeyCode.minNotFn
          ? (keyChar = K.getKeyName_(event))
            && ((action = checkKey(keyChar, key, event)) & ~HandlerResult.AdvancedEscFlag) === HandlerResult.Esc
          : isEscape(event)
      ) {
        if ((insertLock === doc.body && insertLock || !isTop && innerHeight < 3) && !g) {
          event.repeat && InsertMode.focusUpper_(key, true, event);
          action = /* the real is HandlerResult.PassKey; here's for smaller code */ HandlerResult.Nothing;
        } else {
          action = g && g.passExitKey ? (
            Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(event),
            HandlerResult.Nothing) : HandlerResult.Prevent;
          InsertMode.exit_(event.target as Element);
        }
      }
    }
    else if (key > kKeyCode.maxNotPrintable ? key !== kKeyCode.ime
        : ((1 << kKeyCode.backspace | 1 << kKeyCode.tab | 1 << kKeyCode.esc | 1 << kKeyCode.enter
            ) >> key) & 1) {
      if (keyChar = K.char_(event)) {
        action = checkKey(keyChar, key, event);
        if ((action & ~HandlerResult.AdvancedEscFlag) === HandlerResult.Esc) {
          action = action & HandlerResult.AdvancedEscFlag ? /*#__NOINLINE__*/ onEscDown(event, key)
              : HandlerResult.Nothing;
        }
        if (action === HandlerResult.Nothing
            && InsertMode.suppressType_ && keyChar.length < 2 && !K.getKeyStat_(event)) {
          // not suppress ' ', so that it's easier to exit this mode
          action = HandlerResult.Prevent;
        }
      }
    }
    if (action < HandlerResult.MinStopOrPreventEvents) { return; }
    if (action > HandlerResult.MaxNotPrevent) {
      Build.BTypes & BrowserType.Chrome && checkPotentialAccessKey(event, keyChar);
      K.prevent_(event);
    } else {
      K.Stop_(event);
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
    if (InsertMode.suppressType_ && getSelection().type !== InsertMode.suppressType_) {
      events.setupSuppress_();
    }
    if (KeydownEvents[key]) {
      KeydownEvents[key] = 0;
      K.prevent_(event);
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
    if (lock !== null && lock === doc.activeElement) { return; }
    if (target === U.box_) { return K.Stop_(event); }
    const sr = D.GetShadowRoot_(target as Element);
    if (sr) {
      let path = event.path, top: EventTarget | undefined,
      /**
       * isNormalHost is true if one of:
       * - Chrome is since BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
       * - `event.currentTarget` (`this`) is a shadowRoot
       */
      isNormalHost = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
          && !(Build.BTypes & ~BrowserType.Chrome)
        ? (top = (path as EventPath)[0]) !== target
        : !!(top = path && path[0]) && top !== window && top !== target;
      isNormalHost ? hookOnShadowRoot(path as EventPath, target as Element) : hookOnShadowRoot([sr, 0 as never], 0);
      target = isNormalHost ? top as Element : target;
    }
    if (D.getEditableType_<2>(target)) {
      U.activeEl_ = target;
      if (InsertMode.grabBackFocus_) {
        (InsertMode.grabBackFocus_ as Exclude<typeof InsertMode.grabBackFocus_, boolean>)(event, target);
        return;
      }
      esc(HandlerResult.Nothing);
      insertLock = target;
      if (InsertMode.mutable_) {
        // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
        if (doc.activeElement !== doc.body) {
          InsertMode.last_ = target;
        }
      }
    } else {
      U.activeEl_ = Build.BTypes & ~BrowserType.Firefox
          ? D.SafeEl_(target as Element) || U.activeEl_ : target as SafeElement;
    }
  }
  function onBlur(this: void, event: Event | FocusEvent): void {
    if (!isEnabled
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    const target: EventTarget | Element | Window | Document = event.target;
    if (target === window) { return onWndBlur(); }
    if (Build.BTypes & BrowserType.Firefox && target === doc) { return; }
    let path = event.path as EventPath | undefined, top: EventTarget | undefined
      , same = Build.MinCVer >= BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
            && !(Build.BTypes & ~BrowserType.Chrome)
          ? (top = (path as EventPath)[0]) === target
          : !(top = path && path[0]) || top === window || top === target
      , sr = D.GetShadowRoot_(target as Element);
    if (insertLock === (same ? target : top)) {
      insertLock = null;
      InsertMode.inputHint_ && !InsertMode.hinting_ && doc.hasFocus() && InsertMode.exitInputHint_();
    }
    if (!sr || target === U.box_) { return; }
    if (same) {
      domNodeMap.set(sr, kNodeInfo.ShadowBlur);
    } else {
      hookOnShadowRoot(path as EventPath, target as Element, 1);
    }
  }
  function onActivate(event: Event): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
        ? event.isTrusted : event.isTrusted !== false) {
      const path = event.path,
      el = (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsured$Event$$Path || path)
          && (Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
            || !(Build.BTypes & BrowserType.Chrome)
            || (path as EventTarget[]).length > 1)
          ? (path as EventTarget[])[0] as Element : event.target as Element;
      U.activeEl_ = Build.BTypes & ~BrowserType.Firefox ? D.SafeEl_(el) : el as SafeElement | null;
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
      return onFocus(event);
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
      t = (Build.MinCVer >= BrowserVer.MinEnsured$Event$$Path || path)
          && (Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
              || (path as EventTarget[]).length > 1)
          ? (path as EventTarget[])[0] as Element : event.target as Element;
      if (Element.prototype.getAttribute.call(t, "accesskey")) {
        // if a script has modified [accesskey], then do nothing on - just in case.
        resetAnyClickHandler();
        K.prevent_(event);
      }
    }
  }

  const injector = VimiumInjector,
  isTop = top === window,
  setupEventListener = K.SetupEventListener_,
  noopEventHandler = Object.is as any as EventListenerObject["handleEvent"],
  anyClickHandler: EventListenerObject = { handleEvent: noopEventHandler },
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
    f(Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
        ? "click" : "DOMActivate", onActivate, true);
    if (!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome) {
      f("click", anyClickHandler, true);
    }
  }),
  hookOnShadowRoot = function (path: ArrayLike<EventTarget | 0>, target: Node | 0, disable?: 1): void {
    for (let len = Build.MinCVer >= BrowserVer.Min$Event$$path$IsStdArrayAndIncludesWindow
          || !(Build.BTypes & BrowserType.Chrome)
          ? (path as Array<EventTarget | 0>).indexOf(target) : [].indexOf.call(path as Array<EventTarget | 0>, target)
        ; 0 <= --len; ) {
      const root = (path as EventPath)[len] as Node;
      // root is target or inside target, so always a Node
      if (root.nodeType === kNode.DOCUMENT_FRAGMENT_NODE) {
        setupEventListener(root, "focus", onShadow, disable);
        setupEventListener(root, "blur", onShadow, disable);
        disable ? domNodeMap.delete(root) : domNodeMap.set(root, kNodeInfo.ShadowFull);
      }
    }
  },
  checkPotentialAccessKey = function (event: KeyboardEvent, char?: string | undefined): void {
    /** On Firefox, access keys are only handled during keypress events, so it has been "hooked" well:
     * https://dxr.mozilla.org/mozilla/source/content/events/src/nsEventStateManager.cpp#960 .
     * And the modifier stat for access keys is user-configurable: `ui.key.generalAccessKey`
     * * there was another one (`ui.key.contentAccess`) but it has been removed from the latest code
     */
    if (Build.BTypes & BrowserType.Chrome && event.altKey && fgCache.a
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
      if (isWaitingAccessKey !== ((char = char || K.char_(event)).length === 1 || char === "space")
          && (K.getKeyStat_(event) & KeyStat.ExceptShift /* Chrome ignore .shiftKey */) ===
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
      (this: void, count: number, options: CmdOptions[k], key?: -42) => void;
  } = [
    /* kFgCmd.framesGoBack: */ function (rawStep: number, options: CmdOptions[kFgCmd.framesGoBack]): void {
      const maxStep = Math.min(Math.abs(rawStep), history.length - 1),
      reuse = options.reuse,
      realStep = rawStep < 0 ? -maxStep : maxStep;
      if ((!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome)
          && maxStep > 1
          && (Build.MinCVer >= BrowserVer.Min$Tabs$$goBack || browserVer >= BrowserVer.Min$Tabs$$goBack)
          || maxStep && reuse
      ) {
        post({ H: kFgReq.framesGoBack, s: realStep, r: reuse });
      } else {
        maxStep && history.go(realStep);
      }
    },
    /* kFgCmd.findMode: */ VFind.activate_,
    /* kFgCmd.linkHints: */ Hints.activate_,
    /* kFgCmd.unhoverLast: */ function (this: void): void {
      D.hover_(null);
      HUD.tip_(kTip.didUnHoverLast);
    },
    /* kFgCmd.marks: */ VMarks.activate_,
    /* kFgCmd.goToMarks: */ VMarks.GoTo_,
    /* kFgCmd.scroll: */ VSc.activate_,
    /* kFgCmd.visualMode: */ VVisual.activate_,
    /* kFgCmd.vomnibar: */ VOmni.activate_,
    /* kFgCmd.reset: */ (isAlive): void => {
      const a = InsertMode;
      U.activeEl_ = D.lastHovered_ = a.last_ = insertLock = a.global_ = null;
      a.mutable_ = true;
      a.ExitGrab_(); events.setupSuppress_();
      Hints.clean_(isAlive ? 2 : 0); VVisual.deactivate_();
      VFind.init_ || VFind.deactivate_(FindNS.Action.ExitNoAnyFocus);
      onWndBlur();
    },

    /* kFgCmd.toggle: */ function (_0: number, options: CmdOptions[kFgCmd.toggle]): void {
      const key = options.k, backupKey = "_" + key as string as typeof key,
      cache = K.safer_(fgCache), cur = cache[key];
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
      let { code, stat } = opt;
      InsertMode.global_ = opt;
      if (opt.hud) { HUD.show_(kTip.globalInsertMode, [code ? `: ${code}/${stat}` : ""]); }
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
            return (esc = oldEsc)(HandlerResult.Prevent);
          }
          currentKeys = ""; nextKeys = keyMap;
          if (keyCount - count || !HUD.t) {
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
      K.pushHandler_(function (event) {
        keyCount += +!keys[event.keyCode];
        keys[event.keyCode] = 1;
        return HandlerResult.PassKey;
      }, keys);
      onKeyup2 = function (event): void {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event ? event.keyCode : kKeyCode.None] = 0;
          HUD.show_(kTip.passNext, [count > 1 ? VTr(kTip.nTimes, [count]) : ""]);
        } else {
          (exitPassMode as NonNullable<typeof exitPassMode>)();
        }
      };
      exitPassMode = function (): void {
        exitPassMode = onKeyup2 = null;
        K.removeHandler_(keys);
        HUD.hide_();
      };
      onKeyup2();
    },
    /* kFgCmd.goNext: */ function (_0: number, {r: rel, p: patterns, l, m }: CmdOptions[kFgCmd.goNext]): void {
      if (!D.isHTML_() || Pagination.findAndFollowRel_(rel)) { return; }
      const isNext = rel === "next";
      if (patterns.length <= 0 || !Pagination.findAndFollowLink_(patterns, isNext, l, m)) {
        return HUD.tip_(kTip.noLinksToGo, 0, [VTr(rel)]);
      }
    },
    /* kFgCmd.reload: */ function (_0: number, options: CmdOptions[kFgCmd.reload]): void {
      setTimeout(function () {
        options.url ? (location.href = options.url) : location.reload(!!options.hard);
      }, 17);
    },
    /* kFgCmd.switchFocus: */ function (_0: number, options: CmdOptions[kFgCmd.switchFocus]): void {
      let newEl = insertLock;
      if (newEl) {
        if ((options.act || options.action) === "backspace") {
          if (D.view_(newEl)) { doc.execCommand("delete"); }
        } else {
          InsertMode.last_ = newEl;
          InsertMode.mutable_ = false;
          newEl.blur();
        }
        return;
      }
      newEl = InsertMode.last_;
      if (!newEl) {
        return HUD.tip_(kTip.noFocused, 1200);
      }
      if (!D.view_(newEl) && D.NotVisible_(newEl)) {
        return HUD.tip_(kTip.focusedIsHidden, 2000);
      }
      InsertMode.last_ = null;
      InsertMode.mutable_ = true;
      D.getZoom_(newEl);
      D.prepareCrop_();
      return U.simulateSelect_(newEl, null, false, "", true);
    },
    /* kFgCmd.showHelp: */ function (msg?: number | "e", options?: CmdOptions[kFgCmd.showHelp]): void {
      if (msg === "e") { return; }
      let wantTop = innerWidth < 400 || innerHeight < 320;
      if (!D.isHTML_()) {
        if (isTop) { return; }
        wantTop = true;
      }
      post({ H: kFgReq.initHelp, w: wantTop, a: options });
    },
    /* kFgCmd.autoCopy: */ function (_0: number, options: CmdOptions[kFgCmd.autoCopy]): void {
      let str = U.getSelectionText_(1);
      if (!str) {
        str = options.url ? location.href : doc.title;
        (options.decoded || options.decode) && (str = Hints.decodeURL_(str));
        if (str.endsWith(" ") && options.url) {
          str = str.slice(0, -1) + "%20";
        }
      }
      if (str.length < 4 && !str.trim() && str[0] === " ") {
        str = "";
      } else {
        post({
          H: kFgReq.copy,
          d: str
        });
      }
      return HUD.copied_(str);
    },
    /* kFgCmd.autoOpen: */ function (_0: number, options: CmdOptions[kFgCmd.autoOpen]): void {
      let url = U.getSelectionText_(), keyword = (options.keyword || "") + "";
      url && events.evalIfOK_(url) || post({
        H: kFgReq.openUrl,
        c: !url,
        k: keyword, u: url
      });
    },
    /* kFgCmd.searchAs: */ function (_0: number, options: CmdOptions[kFgCmd.searchAs]): void {
      post({
        H: kFgReq.searchAs,
        u: location.href,
        c: options.copied,
        s: options.selected ? U.getSelectionText_() : ""
      });
    },
    /* kFgCmd.focusInput: */ function (count: number, options: CmdOptions[kFgCmd.focusInput]): void {
      InsertMode.inputHint_ && (InsertMode.inputHint_.h = null as never);
      const arr: ViewOffset = D.getViewBox_();
      D.prepareCrop_(1);
      // here those editable and inside UI root are always detected, in case that a user modifies the shadow DOM
      const visibleInputs = Hints.traverse_(Build.BTypes & ~BrowserType.Firefox
            ? Hints.kEditableSelector_ + Hints.kSafeAllSelector_ : Hints.kEditableSelector_, Hints.GetEditable_
          ) as Array<Hint & { [0]: HintsNS.InputHintItem["d"]; }>,
      action = options.select;
      let sel = visibleInputs.length;
      if (sel === 0) {
        InsertMode.exitInputHint_();
        return HUD.tip_(kTip.noInputToFocus, 1000);
      } else if (sel === 1) {
        InsertMode.exitInputHint_();
        return U.simulateSelect_(visibleInputs[0][0], visibleInputs[0][1], true, action, true);
      }
      for (let ind = 0; ind < sel; ind++) {
        const hint = visibleInputs[ind], j = hint[0].tabIndex;
        hint[2] = j > 0 ? ind / 8192 - j : ind;
      }
      const hints: HintsNS.InputHintItem[] = visibleInputs.sort((a, b) => a[2] - b[2]).map(
          function (link): HintsNS.InputHintItem {
        const marker = D.createElement_("span") as HintsNS.BaseHintItem["m"],
        rect = D.padClientRect_(D.getBoundingClientRect_(link[0]), 3);
        rect.l--, rect.t--, rect.r--, rect.b--;
        marker.className = "IH";
        D.setBoundary_(marker.style, rect);
        return {m: marker, d: link[0]};
      });
      if (count === 1 && InsertMode.last_) {
        sel = Math.max(0, visibleInputs.map(link => link[0]).indexOf(InsertMode.last_));
      } else {
        sel = count > 0 ? Math.min(count, sel) - 1 : Math.max(0, sel + count);
      }
      hints[sel].m.className = "IH IHS";
      U.simulateSelect_(visibleInputs[sel][0], visibleInputs[sel][1], false, action, false);
      U.ensureBorder_(D.wdZoom_);
      const box = U.addElementList_<false>(hints, arr), keep = !!options.keep, pass = !!options.passExitKey;
      // delay exiting the old to avoid some layout actions
      // although old elements can not be GC-ed before this line, it has little influence
      InsertMode.exitInputHint_();
      InsertMode.inputHint_ = { b: box, h: hints };
      K.pushHandler_(function (event) {
        const { keyCode } = event;
        if (keyCode === kKeyCode.tab) {
          const hints2 = this.h, oldSel = sel, len = hints2.length;
          sel = (oldSel + (event.shiftKey ? len - 1 : 1)) % len;
          InsertMode.hinting_ = true;
          K.prevent_(event); // in case that selecting is too slow
          U.simulateSelect_(hints2[sel].d, null, false, action);
          hints2[oldSel].m.className = "IH";
          hints2[sel].m.className = "IH IHS";
          InsertMode.hinting_ = false;
          return HandlerResult.Prevent;
        }
        let keyStat: KeyStat;
        if (keyCode === kKeyCode.shiftKey || keep && (keyCode === kKeyCode.altKey
            || keyCode === kKeyCode.ctrlKey || keyCode === kKeyCode.metaKey)) { /* empty */ }
        else if (event.repeat) { return HandlerResult.Nothing; }
        else if (keep ? isEscape(event) || (
            keyCode === kKeyCode.enter && (keyStat = K.getKeyStat_(event),
              keyStat !== KeyStat.shiftKey
              && (keyStat !== KeyStat.plain || this.h[sel].d.localName === "input" ))
          ) : keyCode !== kKeyCode.ime && keyCode !== kKeyCode.f12
        ) {
          InsertMode.exitInputHint_();
          return !isEscape(event) ? HandlerResult.Nothing : keep || !insertLock ? HandlerResult.Prevent
            : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
        }
        return HandlerResult.Nothing;
      }, InsertMode.inputHint_);
    }
  ],

  InsertMode = {
    grabBackFocus_: D.docInitingWhenVimiumIniting_ as boolean | (
        (event: Event, target: LockableElement) => void),
    global_: null as CmdOptions[kFgCmd.insertMode] | null,
    hinting_: false,
    inputHint_: null as { /** box */ b: HTMLDivElement, /** hints */ h: HintsNS.InputHintItem[] } | null,
    suppressType_: null as string | null,
    last_: null as LockableElement | null,
    mutable_: true,
    init_ (): void {
      /** if `notBody` then `activeEl` is not null */
      let activeEl = doc.activeElement as Element,
      notBody = activeEl !== doc.body && (!(Build.BTypes & BrowserType.Firefox)
            || Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox
            || D.isHTML_() || activeEl !== doc.documentElement);
      KeydownEvents = safer(null);
      if (fgCache.g && InsertMode.grabBackFocus_) {
        let counter = 0, prompt = function (): void {
          counter++ || console.log("Vimium C blocks auto-focusing.");
        };
        if (notBody = notBody && VDom.getEditableType_(activeEl)) {
          InsertMode.last_ = null;
          prompt();
          (Build.BTypes & ~BrowserType.Firefox ? typeof activeEl.blur === "function" : activeEl.blur) &&
          (activeEl as HTMLElement | SVGElement).blur();
          // here ignore the rare case of an XMLDocument with a editable node on Firefox, for smaller code
          notBody = (activeEl = doc.activeElement as Element) !== doc.body;
        }
        if (!notBody) {
          InsertMode.grabBackFocus_ = function (event: Event, target: LockableElement): void {
            const activeEl1 = doc.activeElement;
            if (activeEl1 === target || activeEl1 && D.GetShadowRoot_(activeEl1)) {
              K.Stop_(event);
              prompt();
              target.blur();
            }
          };
          K.pushHandler_(InsertMode.ExitGrab_, InsertMode);
          setupEventListener(0, "mousedown", InsertMode.ExitGrab_);
          return;
        }
      }
      InsertMode.grabBackFocus_ = false;
      if (notBody && D.getEditableType_(activeEl)) {
        insertLock = activeEl;
      }
    },
    ExitGrab_: function (this: void, event?: Req.fg<kFgReq.exitGrab> | MouseEvent | KeyboardEvent
        ): HandlerResult.Nothing | void {
      if (!InsertMode.grabBackFocus_) { return /* safer */ HandlerResult.Nothing; }
      InsertMode.grabBackFocus_ = false;
      K.removeHandler_(InsertMode);
      setupEventListener(0, "mousedown", InsertMode.ExitGrab_, 1);
      // it's acceptable to not set the userActed flag if there's only the top frame;
      // when an iframe gets clicked, the events are mousedown and then focus, so SafePost_ is needed
      !(event instanceof Event) || !frames.length && isTop ||
      vPort.SafePost_({ H: kFgReq.exitGrab });
      return HandlerResult.Nothing;
    } as {
      (this: void, event: KeyboardEvent): HandlerResult.Nothing;
      (this: void, request: Req.bg<kBgReq.exitGrab>): void;
      (this: void, event?: MouseEvent): void;
    },
    isActive_ (): boolean {
      if (InsertMode.suppressType_) { return false; }
      if (insertLock || InsertMode.global_) {
        return true;
      }
      const el: Element | null = doc.activeElement;
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
      if (el && (el as HTMLElement).isContentEditable === true) {
        esc(HandlerResult.Nothing);
        insertLock = el as LockableElement;
        return true;
      } else {
        return false;
      }
    },
    /** should only be called during keydown events */
    focusUpper_ (this: void, key: kKeyCode, force: boolean, event: KeyboardEventToPrevent
        ): void | 1 {
      const parEl = D.frameElement_();
      if (!parEl && (!force || isTop)) { return; }
      K.prevent_(event); // safer
      if (parEl) {
        KeydownEvents[key] = 1;
        const parentCore = Build.BTypes & BrowserType.Firefox ? D.parentCore_() : parent as Window,
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
    exit_ (target: Element): void {
      if (D.GetShadowRoot_(target)) {
        if (target = insertLock as LockableElement | null as unknown as Element) {
          insertLock = null;
          (target as LockableElement).blur();
        }
      } else if (target === insertLock ? (insertLock = null, 1) : D.getEditableType_(target)) {
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
      K.removeHandler_(hint);
    }
  },

  Pagination = {
  followLink_ (linkElement: SafeHTMLElement): boolean {
    let url = linkElement.localName === "link" && (linkElement as HTMLLinkElement).href;
    if (url) {
      Commands[kFgCmd.reload](1, { url });
    } else {
      D.view_(linkElement);
      // note: prepareCrop is called during UI.flash_
      U.flash_(linkElement);
      setTimeout(function () { U.click_(linkElement); }, 100);
    }
    return true;
  },
  GetButtons_ (this: void, hints: SafeHTMLElement[], element: Element): void {
    let s: string | null;
    const tag = element.localName, isClickable = tag === "a" || tag && (
      tag === "button" ? !(element as HTMLButtonElement).disabled
      : D.clickable_.has(element) || element.getAttribute("onclick") || (
        (s = element.getAttribute("role")) ? (<RegExpI> /^(button|link)$/i).test(s)
        : Hints.ngEnabled_ && element.getAttribute("ng-click")));
    if (!isClickable) { return; }
    if ((s = element.getAttribute("aria-disabled")) != null && (!s || s.toLowerCase() === "true")) { return; }
    const rect = D.getBoundingClientRect_(element);
    if (rect.width > 2 && rect.height > 2 && getComputedStyle(element).visibility === "visible") {
      hints.push(element as SafeHTMLElement);
    }
  },
  findAndFollowLink_ (names: string[], isNext: boolean, lenLimit: number[], totalMax: number): boolean {
    interface Candidate { [0]: number; [1]: string; [2]: Parameters<typeof Pagination.GetButtons_>[0][number]; }
    // Note: this traverser should not need a prepareCrop
    let links = Hints.traverse_(Hints.kSafeAllSelector_, Pagination.GetButtons_, true, true);
    const count = names.length,
    quirk = isNext ? ">>" : "<<", quirkIdx = names.indexOf(quirk),
    rel = isNext ? "next" : "prev", relIdx = names.indexOf(rel),
    detectQuirk = quirkIdx > 0 ? names.lastIndexOf(isNext ? ">" : "<", quirkIdx) : -1,
    refusedStr = isNext ? "<" : ">";
    links.push(doc.documentElement as never as SafeHTMLElement);
    let candidates: Candidate[] = [], ch: string, s: string, maxLen = totalMax, len: number;
    for (let re1 = <RegExpOne> /\s+/, _len = links.length - 1; 0 <= --_len; ) {
      const link = links[_len];
      if (link.contains(links[_len + 1]) || (s = link.innerText).length > totalMax) { continue; }
      if (s = s || (ch = (link as HTMLInputElement).value) && ch.toLowerCase && ch || link.title) {
        if (s.length > totalMax) { continue; }
        s = s.toLowerCase();
        for (let i = 0; i < count; i++) {
          if (s.length < lenLimit[i] && s.indexOf(names[i]) !== -1) {
            if (s.indexOf(refusedStr) === -1 && (len = (s = s.trim()).split(re1).length) <= maxLen) {
              let i2 = detectQuirk - i ? names.indexOf(s, i + 1) : s.indexOf(quirk) >= 0 ? quirkIdx : -1;
              if (i2 >= 0) { i = i2; len = 2; }
              maxLen > len && (maxLen = len + 1);
              // requires GlobalConsts.MaxNumberOfNextPatterns <= 255
              candidates.push([(i << 23) | (len << 16) | (candidates.length & 0xffff), s, link]);
            }
            break;
          }
        }
      }
      // for non-English pages like www.google.co.jp
      if (s.length < 5 && relIdx >= 0 && (ch = link.id) && ch.indexOf(rel) >= 0) {
        candidates.push([(relIdx << 23) | (((4 + ch.length) & 0x3f) << 16) | (candidates.length & 0xffff),
            rel, link]);
      }
    }
    if (candidates.length <= 0) { return false; }
    links = [];
    maxLen = (maxLen + 1) << 16;
    candidates = candidates.filter(a => (a[0] & 0x7fffff) < maxLen).sort((a, b) => a[0] - b[0]);
    for (let re2 = <RegExpOne> /\b/, i = candidates[0][0] >> 23; i < count; ) {
      s = names[i++];
      const re = new RegExp(re2.test(s[0]) || re2.test(s.slice(-1)) ? `\\b${s}\\b` : s, ""), j = i << 23;
      for (const candidate of candidates) {
        if (candidate[0] > j) { break; }
        if (re.test(candidate[1])) { return Pagination.followLink_(candidate[2]); }
      }
    }
    return false;
  },
  findAndFollowRel_ (relName: string): boolean {
    const elements = doc.querySelectorAll("[rel]");
    let s: string | null | undefined;
    type HTMLElementWithRel = HTMLAnchorElement | HTMLAreaElement | HTMLLinkElement;
    for (let _i = 0, _len = elements.length, re1 = <RegExpOne> /\s+/; _i < _len; _i++) {
      const element = elements[_i];
      if ((<RegExpI> /^(a|area|link)$/).test(D.htmlTag_(element))
          && (s = (element as TypeToAssert<HTMLElement, HTMLElementWithRel, "rel">).rel)
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
    timer_: 0,
    Focus_ (this: void, req: BgReq[kBgReq.focusFrame]): void {
      // Note: .c, .S are ensured to exist
      let mask = req.m, div;
      req.S && U.css_(req.S);
      if (mask !== FrameMaskType.NormalNext) { /* empty */ }
      else if (events.checkHidden_()
        // check <div> to detect whether no other visible elements except <frame>s in this frame
        || (Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter && Build.BTypes & BrowserType.Chrome
                && D.unsafeFramesetTag_  // treat a doc.body of <form> as <frameset> to simplify logic
              ? D.notSafe_(doc.body)
              : doc.body && D.htmlTag_(doc.body) === "frameset")
            && (div = doc.querySelector("div"), !div || div === U.box_ && !K._handlers.length)
      ) {
        post({
          H: kFgReq.nextFrame,
          k: req.k
        });
        return;
      }
      mask && setTimeout(() => events.focusAndRun_(), 1); // require FrameMaskType.NoMaskAndNoFocus is 0
      if (req.c) {
        type TypeChecked = { [key1 in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
            count: number, options: CmdOptions[T2]) => void; };
        (Commands as TypeChecked)[req.c](req.n as number, req.a as FgOptions);
      }
      KeydownEvents[req.k] = 1;
      FrameMask.show_(mask);
    },
    show_ (mask: FrameMaskType): void {
      if (!isTop && mask === FrameMaskType.NormalNext) {
        let docEl = doc.documentElement;
        if (docEl) {
        Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
          && (!(Build.BTypes & ~BrowserType.Chrome) || browserVer < BrowserVer.MinScrollIntoViewOptions)
        ?
          (Element.prototype.scrollIntoViewIfNeeded as NonNullable<Element["scrollIntoViewIfNeeded"]>).call(docEl)
        : D.scrollIntoView_(docEl);
        }
      }
      if (mask < FrameMaskType.minWillMask || !D.isHTML_()) { return; }
      let _this = FrameMask, dom1: HTMLDivElement | null;
      if (dom1 = _this.node_) {
        _this.more_ = true;
      } else {
        dom1 = D.createElement_("div");
        dom1.className = "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : "");
        _this.node_ = dom1;
        _this.timer_ = setInterval(_this.Remove_, isTop ? 200 : 350);
      }
      U.add_(dom1);
    },
    Remove_ (this: void, fake?: TimerType.fake): void { // safe-interval
      const _this = FrameMask, { more_ } = _this;
      _this.more_ = false;
      if (more_ && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                      && fake)) { return; }
      if (_this.node_) { _this.node_.remove(); _this.node_ = null; }
      clearInterval(_this.timer_);
    }
  },
  HUD = {
    _tweenId: 0,
    box_: null as HTMLDivElement | null,
    _$text: null as never as Text,
    t: "",
    opacity_: 0 as 0 | 0.25 | 0.5 | 0.75 | 1,
    enabled_: false,
    _timer: 0,
    copied_: function (text: string, e?: "url" | "", virtual?: 1): string | void {
      if (!text) {
        if (virtual) { return text; }
        return HUD.tip_(e ? kTip.noUrlCopied : kTip.noTextCopied, 1000);
      }
      if (text.startsWith("chrome-") && text.indexOf("://") > 0) {
        // tslint:disable-next-line: ban-types
        text = (text as EnsureNonNull<String>).substring(text.indexOf("/", text.indexOf("/") + 2)) || text;
      }
      text = (text.length > 41 ? text.slice(0, 41) + "\u2026" : text + ".");
      return virtual ? text : HUD.tip_(kTip.copiedIs, 2000, [text]);
    } as VHUDTy["copied_"],
    tip_ (tid: kTip | HintMode, duration?: number, args?: Array<string | number>): void {
      HUD.show_(tid, args);
      HUD.t && ((HUD as typeof HUD)._timer = setTimeout(HUD.hide_, duration || 1500));
    },
    show_ (tid: kTip | HintMode, args?: Array<string | number>, embed?: boolean): void {
      if (!HUD.enabled_ || !D.isHTML_()) { return; }
      const text = HUD.t = VTr(tid, args);
      HUD.opacity_ = 1;
      if (HUD._timer) { clearTimeout(HUD._timer); HUD._timer = 0; }
      embed || HUD._tweenId || (HUD._tweenId = setInterval(HUD._tween, 40));
      let el = HUD.box_;
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
      el = D.createElement_("div");
      el.className = "R HUD" + fgCache.d;
      el.textContent = text;
      HUD._$text = el.firstChild as Text;
      if (!embed) {
        const st = el.style;
        st.opacity = "0";
        st.visibility = "hidden";
        U.box_ || U.ensureBorder_();
      }
      U.add_(HUD.box_ = el, Hints.hints_ ? AdjustType.NotAdjust : AdjustType.DEFAULT, Hints.box_);
    },
    _tween (this: void, fake?: TimerType.fake): void { // safe-interval
      const el = HUD.box_ as HTMLDivElement, st = el.style, reduce = isEnabled && fgCache.r;
      let opacity = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                    && fake ? 0 : +(st.opacity || 1);
      if (opacity === HUD.opacity_) { /* empty */ }
      else if (opacity === 0) {
        HUD._$text.data = HUD.t;
        st.opacity = reduce ||  Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                      && fake ? "" : "0.25";
        st.visibility = "";
        return U.adjust_();
      } else if (!reduce && doc.hasFocus()) {
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
      if (i = HUD._timer) { clearTimeout(i); HUD._timer = 0; }
      HUD.opacity_ = 0; HUD.t = "";
      if (!HUD.box_) { /* empty */ }
      else if (info === TimerType.noTimer || !isEnabled) {
        const box = HUD.box_, st = box.style;
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
        OnOther = load.b as NonNullable<typeof load.b>;
      }
      D.cache_ = K.cache_ = fgCache = load as EnsureItemsNonNull<typeof load>;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
        load.o || (K.keyIdCorrectionOffset_ = 300);
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
          (D.editableTypes_ as Writable<typeof VDom.editableTypes_>).keygen = EditableType.Select;
        }
      }
      if (Build.BTypes & BrowserType.Chrome
          && (Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl)) {
        D.specialZoom_ = (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
          && (Build.MinCVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl
              || browserVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl);
      }
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
          && browserVer < BrowserVer.MinFramesetHasNoNamedGetter) {
        Hints.kSafeAllSelector_ += ":not(" + (D.unsafeFramesetTag_ = "frameset") + ")";
      }
      if (Build.BTypes & ~BrowserType.Firefox && Build.BTypes & BrowserType.Firefox
          && OnOther === BrowserType.Firefox) {
        D.notSafe_ = (_el): _el is HTMLFormElement => false;
        D.isHTML_ = (): boolean => document instanceof HTMLDocument;
      }
      r[kBgReq.keyMap](request);
      if (flags) {
        InsertMode.grabBackFocus_ = InsertMode.grabBackFocus_ && !(flags & Frames.Flags.userActed);
        isLocked = !!(flags & Frames.Flags.locked);
      }
      (r[kBgReq.reset] as (request: BgReq[kBgReq.reset], initing?: 1) => void)(request, 1);
      if (isEnabled) {
        InsertMode.init_();
        if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
            && Build.BTypes & BrowserType.Chrome
            && browserVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow) {
          hook(HookAction.SuppressListenersOnDocument);
        }
        if (Build.BTypes & BrowserType.Chrome
            && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
            && !load.a) {
          setupEventListener(0, "click", anyClickHandler, 1, 1);
          if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow) {
            setupEventListener(doc, "click", anyClickHandler, 1, 1);
          }
        }
      } else {
        InsertMode.grabBackFocus_ = false;
        hook(HookAction.Suppress);
        events.execute_ && events.execute_(kContentCmd.SuppressClickable);
      }
      r[kBgReq.init] = null as never;
      D.OnDocLoaded_(function (): void {
        HUD.enabled_ = true;
        onWndFocus = vPort.SafePost_.bind(vPort as never, <Req.fg<kFgReq.focus>> { H: kFgReq.focus });
        setTimeout(function (): void {
          const parentCore = !(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
              ? D.parentCore_() : D.allowScripts_ && D.frameElement_() && parent as Window,
          parDom = parentCore && parentCore.VDom as typeof VDom,
          parHints = parentCore && parentCore.VHints as typeof VHints;
          if (needToRetryParentClickable) {
          const oldSet = D.clickable_ as any as Element[] & Set<Element>,
          set = D.clickable_ = parDom ? parDom.clickable_ : new (WeakSet as NonNullable<typeof WeakSet>)<Element>();
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
          if (parHints && parHints.isActive_) {
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
        old || InsertMode.init_();
        (old && !isLocked) || hook(HookAction.Install);
        // here should not return even if old - a url change may mean the fullscreen mode is changed
      } else {
        Commands[kFgCmd.reset](1);
      }
      if (U.box_) { U.adjust_(+newEnabled ? 1 : 2); }
    },
    /* kBgReq.injectorRun: */ injector ? injector.$m : null as never,
    /* kBgReq.url: */ function<T extends keyof FgReq> (this: void, request: BgReq[kBgReq.url] & Req.fg<T>): void {
      delete (request as Req.bg<kBgReq.url>).N;
      request.u = location.href;
      post<T>(request);
    },
    /* kBgReq.msg: */ function<k extends keyof FgRes> (response: Req.res<k>): void {
      const arr = vPort._callbacks, id = response.m, handler = arr[id];
      delete arr[id];
      handler(response.r);
    },
    /* kBgReq.eval: */ function (options: BgReq[kBgReq.eval]): void { events.evalIfOK_(options.u); },
    /* kBgReq.settingsUpdate: */function ({ d: delta }: BgReq[kBgReq.settingsUpdate]): void {
      type Keys = keyof typeof delta;
      K.safer_(delta);
      const cache = fgCache;
      for (const i in delta) {
        (cache as Generalized<typeof cache>)[i as Keys] = (delta as EnsureItemsNonNull<typeof delta>)[i as Keys];
        const i2 = "_" + i as Keys;
        (i2 in cache) && (K.safer_(cache)[i2] = undefined as never);
      }
      delta.d != null && HUD.box_ && HUD.box_.classList.toggle("D", !!delta.d);
      if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
          && delta.a != null) {
        setupEventListener(0, "click", anyClickHandler, delta.a, 1);
        if (Build.BTypes & BrowserType.Chrome
            && Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
            && browserVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow) {
          setupEventListener(doc, "click", anyClickHandler, delta.a, 1);
        }
      }
    },
    /* kBgReq.focusFrame: */ FrameMask.Focus_,
    /* kBgReq.exitGrab: */ InsertMode.ExitGrab_ as (this: void, request: Req.bg<kBgReq.exitGrab>) => void,
    /* kBgReq.keyMap: */ function (request: BgReq[kBgReq.keyMap]): void {
      const map = keyMap = request.k, func = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf
        && Build.BTypes & BrowserType.Chrome && browserVer < BrowserVer.Min$Object$$setPrototypeOf
        ? K.safer_ : Object.setPrototypeOf;
      func(map, null);
      function iter(obj: ReadonlyChildKeyMap): void {
        func(obj, null);
        for (const key in obj) {
          type ObjItem = Exclude<NonNullable<(typeof obj)[string]>, KeyAction.cmd>;
          obj[key] !== KeyAction.cmd && iter(obj[key] as ObjItem);
        }
      }
      for (const key in map) {
        const sec = map[key] as NonNullable<(typeof map)[string]>;
        sec && sec !== KeyAction.count && iter(sec);
      }
      (mappedKeys = request.m) && func(mappedKeys, null);
    },
    /* kBgReq.execute: */ function<O extends keyof CmdOptions> (request: Req.FgCmd<O>): void {
      if (request.S) { U.css_(request.S); }
      esc(HandlerResult.Nothing);
      const options: CmdOptions[O] | null = request.a;
      type Keys = keyof CmdOptions;
      type TypeToCheck = {
        [key in Keys]: (this: void, count: number, options: CmdOptions[key]) => void;
      };
      type TypeChecked = {
        [key in Keys]: <T2 extends Keys>(this: void, count: number, options: CmdOptions[T2]) => void;
      };
      (Commands as TypeToCheck as TypeChecked)[request.c](request.n
        , (options ? K.safer_(options) : safer(null)) as CmdOptions[O]);
    },
    /* kBgReq.createMark: */ function (request: BgReq[kBgReq.createMark]): void { VMarks.createMark_(request.n); },
    /* kBgReq.showHUD: */ function (req: Req.bg<kBgReq.showHUD>): void {
      if (req.S) {
        U.css_(req.S);
        if (req.f) {
          U.findCss_ = req.f;
          U.styleFind_ && (U.styleFind_.textContent = req.f.i);
        }
      }
      // tslint:disable-next-line: no-unused-expression
      req.t ? req.c ? HUD.copied_(req.t) : HUD.tip_(kTip.raw, 0, [req.t]) : 0;
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
  function ({ h: html, c: shouldShowAdvanced, o: optionUrl, S: CSS, a: options }: Req.bg<kBgReq.showHelpDialog>): void {
    // Note: not suppress key on the top, because help dialog may need a while to render,
    // and then a keyup may occur before or after it
    if (CSS) { U.css_(CSS); }
    const oldShowHelp = Commands[kFgCmd.showHelp];
    oldShowHelp("e");
    if (!D.isHTML_()) { return; }
    if (oldShowHelp !== Commands[kFgCmd.showHelp]) { return; } // an old dialog exits
    let box: SafeHTMLElement;
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
      // on FF66, if a page is limited by "script-src 'self'; style-src 'self'"
      //   then `<style>`s created by `.innerHTML = ...` has no effects;
      //   so need `doc.createElement('style').textContent = ...`
      box = new DOMParser().parseFromString((html as Exclude<typeof html, string>).b, "text/html"
          ).body.firstChild as SafeHTMLElement;
      box.insertBefore(U.createStyle_((html as Exclude<typeof html, string>).h), box.firstChild);
    } else {
      box = D.createElement_("div");
      box.innerHTML = html as string;
      box = box.firstChild as SafeHTMLElement;
    }
    box.onclick = K.Stop_;
    setupEventListener(box, "mousedown");
    setupEventListener(box, "mouseup");
    // note: if wheel is listened, then mousewheel won't be dispatched even on Chrome 35
    setupEventListener(box, "wheel");
    setupEventListener(box, "auxclick");
    setupEventListener(box, "contextmenu");
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
        K.prevent_(event);
      }
      optLink.onclick = closeBtn.onclick = null as never;
      let i: Element | null = D.lastHovered_;
      i && box.contains(i) && (D.lastHovered_ = null);
      (i = U.activeEl_) && box.contains(i) && (U.activeEl_ = null);
      K.removeHandler_(box);
      box.remove();
      Commands[kFgCmd.showHelp] = oldShowHelp;
      U.setupExitOnClick_(1, 0);
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
      el2.innerText = el2.dataset[shouldShowAdvanced ? "h" : "s"] as string;
      box.classList.toggle("HelpAdvanced");
    }
    advCmd.onclick = function (event) {
      K.prevent_(event);
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      post({
        H: kFgReq.setSetting,
        k: 0,
        v: shouldShowAdvanced
      });
    };
    shouldShowAdvanced && toggleAdvanced();
    U.ensureBorder_();
    U.add_(box, AdjustType.Normal, true);
    options.exitOnClick && U.setupExitOnClick_(1, hide);
    doc.hasFocus() || events.focusAndRun_();
    // on FF66, `scrollIntoView` does not set tab-navigation node
    // tslint:disable-next-line: no-unused-expression
    !(Build.BTypes & BrowserType.Chrome) ? 0
      : Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions
      ? D.scrollIntoView_(box) : VFind.fixTabNav_(box);
    U.activeEl_ = box;
    K.pushHandler_(function (event) {
      if (!insertLock && isEscape(event)) {
        U.removeSelection_(U.root_) || hide();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    }, box);
    if (VOmni.status_ >= VomnibarNS.Status.Showing) {
      K.removeHandler_(VOmni);
      K.pushHandler_(VOmni.onKeydown_, VOmni);
    }
    setTimeout((): void => box.focus(), 17); // since MinElement$Focus$MayMakeArrowKeySelectIt; also work on Firefox
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
      if (!D.jsRe_.test(url)) {
        return false;
      }
      url = url.slice(11).trim();
      if ((<RegExpOne> /^void\s*\( ?0 ?\)\s*;?$|^;?$/).test(url)) { /* empty */ }
      else if (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? D.allowScripts_ === 2 || D.allowScripts_ &&
            (D.allowScripts_ = (D.runJS_('document.currentScript.dataset.vimium="1"', 1) as HTMLScriptElement
                ).dataset.vimium ? 2 : 0)
          : D.allowScripts_) {
        setTimeout(function (): void {
          D.runJS_(Hints.decodeURL_(url, decodeURIComponent));
        }, 0);
      } else {
        HUD.tip_(kTip.failToEvalJS);
      }
      return true;
    },

    lock_: () => insertLock,
    isCmdTriggered_: () => isCmdTriggered,
    onWndBlur_ (this: void, f): void { onWndBlur2 = f; },
    OnWndFocus_ (this: void): void { onWndFocus(); },
    checkHidden_ (this: void, cmd?: FgCmdAcrossFrames
        , count?: number, options?: OptionsWithForce): BOOL {
      if (innerHeight < 3 || innerWidth < 3) { return 1; }
      // here should not use the cache frameElement, because `getComputedStyle(frameElement).***` might break
      const curFrameElement_ = !isTop && (Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
              || !(Build.BTypes & ~BrowserType.Firefox) ? frameElement : D.frameElement_()),
      el = !isTop && (curFrameElement_ || doc.documentElement);
      if (!el) { return 0; }
      let box = D.getBoundingClientRect_(el),
      par: ReturnType<typeof VDom.parentCore_> | undefined,
      parEvents: VApiTy | undefined,
      result: boolean | BOOL = !box.height && !box.width || getComputedStyle(el).visibility === "hidden";
      if (cmd) {
        type EnsuredOptionsTy = Exclude<typeof options, undefined>;
        // if in a forced cross-origin env (by setting doc.domain),
        // then par.self.innerHeight works, but this behavior is undocumented,
        // so here only use `par.VIh()` in case
        if ((Build.BTypes & BrowserType.Firefox ? (par = D.parentCore_()) : curFrameElement_)
            && (result || box.bottom <= 0
                || (Build.BTypes & BrowserType.Firefox && par !== parent
                      ? (box.top > (par as EnsureItemsNonNull<ContentWindowCore>).VIh() )
                      : box.top > (parent as Window).innerHeight))) {
          parEvents = ((Build.BTypes & BrowserType.Firefox ? par : parent) as ContentWindowCore).VApi;
          if (parEvents
              && !parEvents.keydownEvents_(Build.BTypes & BrowserType.Firefox ? events.keydownEvents_() : events)) {
            parEvents.focusAndRun_(cmd, count as number, options as EnsuredOptionsTy, 1);
            result = 1;
          }
        }
        if (result === true) { // if there's a same-origin parent, use it instead of top
          // here not suppress current cmd, in case of malformed pages;
          // the worst result is doing something in a hidden frame,
          //   which is tolerable, since only few commands do check hidden)
          (options as EnsuredOptionsTy).$forced ? (result = 0) : post({
            H: kFgReq.gotoMainFrame, f: 1,
            c: cmd,
            n: count as number, a: options as EnsuredOptionsTy
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
        VOmni.box_.blur();
      } else {
        // cur is safe because on Firefox
        let cur: SafeElement | null = doc.activeElement as SaferType<Document["activeElement"]>;
        cur && (<RegExpOne> /^i?frame$/).test(cur.localName) && cur.blur &&
        (cur as HTMLFrameElement | HTMLIFrameElement).blur();
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
              count: number, options: CmdOptions[T2]) => void; };
          (Commands as TypeChecked)[cmd](count as number, options as FgOptions);
        }
        showBorder && FrameMask.show_(FrameMaskType.ForcedSelf);
      }
    },
    mapKey_: mapKey,
    setupSuppress_ (this: void, onExit?: (this: void) => void): void {
      const f = InsertMode.onExitSuppress_;
      InsertMode.onExitSuppress_ = InsertMode.suppressType_ = null;
      if (onExit) {
        InsertMode.suppressType_ = getSelection().type;
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
          injector && setTimeout(vPort.TestAlive_, 50);
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
      setTimeout(function (i): void {
        if (!(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i)) {
          try { vPort._port || !esc || vPort.Connect_(); return; } catch {}
        }
        safeDestroy();
      }, requestHandlers[kBgReq.init] ? 2000 : 5000);
    },
    Connect_: (function (this: void): void {
      const api = Build.BTypes & ~BrowserType.Chrome
          && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
          ? browser as typeof chrome : chrome,
      connect = api.runtime.connect, trans = api.i18n.getMessage,
      status = requestHandlers[0] ? PortType.initing
        : (isEnabled ? passKeys ? PortType.knownPartial : PortType.knownEnabled : PortType.knownDisabled)
        + (isLocked ? PortType.isLocked : 0) + (U.styleIn_ ? PortType.hasCSS : 0),
      name = PortType.isTop * +isTop + PortType.hasFocus * +doc.hasFocus() + status,
      data = { name: injector ? PortNameEnum.Prefix + name + injector.$h : "" + name },
      port = vPort._port = injector ? connect(injector.id, data) as Port : connect(data) as Port;
      port.onDisconnect.addListener(vPort.ClearPort_);
      port.onMessage.addListener(vPort.Listener_);
      VTr = VTr || ((tid, args) => trans("" + tid, args));
    })
  },

  domNodeMap = Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
      || WeakMap ? new (WeakMap as WeakMapConstructor)<Node, kNodeInfo>() as never : {
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
  K.isEscape_ = isEscape;
  if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
    (window as Writable<Window>).VOther = OnOther;
  }
  if (!(Build.BTypes & BrowserType.Firefox)) { /* empty */ }
  else if (Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox || injector !== void 0) {
    D.getWndCore_ = wnd => wnd;
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
        return ((host + (BuildStr.RandomReq as number | string as number).toString(16)
            ).match(<RegExpG> /[\da-f]{1,4}/gi) as string[]
            ).map((i, ind) => parseInt(i, 16) & (ind & 1 ? ~a : a)).join("");
      },
      compare_ (rand2: number, testEncrypted: string): boolean {
        const diff = coreTester.encrypt_(coreTester.rand_, +rand2) !== testEncrypted, d2 = coreTester.recvTick_ > 64;
        coreTester.recvTick_ += d2 ? 0 : diff ? 2 : 1;
        return diff || d2; // hide the real result if too many errors
      }
    };
    /** Note: this function needs to be safe enough */
    D.getWndCore_ = function (anotherWnd: Window): ContentWindowCore | 0 | void {
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
    const parEl = D.frameElement_();
    if (!parEl) {
      if ((Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
          || WeakSet) && D.docInitingWhenVimiumIniting_) {
        needToRetryParentClickable = 1;
        if (Build.MinCVer >= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
            || Set) {
          D.clickable_ = new (Set as NonNullable<typeof Set>)<Element>();
        } else {
          let arr: Element[] & NonNullable<typeof VDom.clickable_> = [] as any;
          D.clickable_ = arr;
          arr.add = arr.push;
          // a temp collection, so it's okay just to ignore its elements
          arr.has = Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes || !(Build.BTypes & BrowserType.Chrome)
              ? (arr as ReadonlyArrayWithIncludes<Element>).includes : () => !1;
        }
      }
      return;
    }
    type FindTy = typeof VFind;
    if (Build.BTypes & BrowserType.Firefox) {
      let core = Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox
          ? parent as Window // know it's in another extension's page, or not on Firefox
          : D.parentCore_();
      try { // `core` is still unsafe
        const vfind = (core && core.VFind) as FindTy | undefined;
        if (vfind) {
          if (vfind && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox
                        ? XPCNativeWrapper(vfind) : vfind).box_ === parEl) {
            safeDestroy(1);
            vfind.onLoad_();
          } else {
            D.clickable_ = ((core as Exclude<NonNullable<typeof core>, 0>).VDom as typeof VDom).clickable_;
          }
          return;
        }
      } catch (e) {
        if (!Build.NDEBUG) {
          console.log("Assert error: Parent frame check breaks:", e);
        }
      }
      if ((!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
          && D.docInitingWhenVimiumIniting_) {
        // here the parent `core` is invalid - maybe from a fake provider
        D.parentCore_ = () => 0;
      }
    } else {
      // if not `vfind`, then a parent may have destroyed for unknown reasons
      const vfind = (parent as Window).VFind as FindTy | undefined;
      if (vfind && vfind.box_ === parEl) {
        safeDestroy(1);
        vfind.onLoad_();
      } else {
        D.clickable_ = vfind as object | null as never && ((parent as Window).VDom as typeof VDom).clickable_;
      }
    }
  }();
  if (esc as EscF | null) {
    D.clickable_ = !(Build.BTypes & BrowserType.Firefox)
        || Build.BTypes & ~BrowserType.Firefox && OnOther !== BrowserType.Firefox
        ? D.clickable_ ||
        ( Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
            || WeakSet ? new (WeakSet as WeakSetConstructor)<Element>() as never : {
      add (element: Element): any { (element as ElementWithClickable).vimiumClick = true; },
      has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumClick; }
    }) : /* now know it's on Firefox */
        D.clickable_ || new (WeakSet as WeakSetConstructor)<Element>();
    if (!D.docInitingWhenVimiumIniting_) {
      D.OnDocLoaded_ = D.execute_;
    } else {
      let listeners: Array<(this: void) => void> = [], Name = "DOMContentLoaded",
      onLoad = function (): void {
        // not need to check event.isTrusted
        setupEventListener(0, Name, onLoad, 1);
        if (VDom === D) { // check `a` for safety even if reloaded
          D.OnDocLoaded_ = D.execute_;
          listeners.forEach(D.execute_);
        }
        if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinTestedES6Environment) {
          onLoad = listeners = null as never;
        }
      };
      D.OnDocLoaded_ = listeners.push.bind(listeners);
      setupEventListener(0, Name, onLoad, 0);
    }
    // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
    hook(HookAction.Install);
    vPort.Connect_();
  }

  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".startsWith) {
    const StringCls = String.prototype;
    StringCls.startsWith = function (this: string, s: string): boolean {
      return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
    };
    StringCls.endsWith = function (this: string, s: string): boolean {
      const i = this.length - s.length;
      return i >= 0 && this.indexOf(s, i) === i;
    };
  }
})();
if (!(Build.NDEBUG || GlobalConsts.MaxNumberOfNextPatterns <= 255)) {
  console.log("Assert error: GlobalConsts.MaxNumberOfNextPatterns <= 255");
}
