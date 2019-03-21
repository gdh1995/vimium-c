var VSettings: VSettingsTy, VHUD: VHUDTy, VPort: VPortTy, VEvent: VEventModeTy
  , VimiumInjector: VimiumInjector | undefined | null;

(function () {
  interface EscF {
    <T extends Exclude<HandlerResult, HandlerResult.Suppress>> (this: void, i: T): T;
    (this: void, i: HandlerResult.Suppress): HandlerResult.Prevent;
  }
  interface Port extends chrome.runtime.Port {
    postMessage<K extends keyof FgRes>(request: Req.fgWithRes<K>): 1;
    postMessage<K extends keyof FgReq>(request: Req.fg<K>): 1;
  }
  interface SpecialCommands {
    [kFgCmd.reset] (this: void): void;
    [kFgCmd.showHelp] (msg?: number | "e"): void;
  }

  let KeydownEvents: KeydownCacheArray, keyMap: KeyMap
    , currentKeys = "", isEnabled = false, isLocked = false
    , mappedKeys = null as SafeDict<string> | null, nextKeys = null as KeyMap | ReadonlyChildKeyMap | null
    , esc = function<T extends Exclude<HandlerResult, HandlerResult.Suppress>> (i: T): T {
      currentKeys = ""; nextKeys = null; return i;
    } as EscF
    , onKeyup2 = null as ((this: void, event: Pick<KeyboardEvent, "keyCode">) => void) | null
    , passKeys = null as SafeEnum | null | "", isPassKeysReverted = false
    , onWndFocus = function (this: void): void { /* empty */ }, onWndBlur2: ((this: void) => void) | null = null
    , OnOther: BrowserType = BrowserType.Chrome
    ;

  const injector = VimiumInjector,
  notChrome = !(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser !== "undefined" && !!(
    browser && (browser as typeof chrome).runtime) && !((browser as typeof chrome | Element) instanceof Element),
  vPort = {
    _port: null as Port | null,
    _callbacks: Object.create(null) as { [msgId: number]: <K extends keyof FgRes>(this: void, res: FgRes[K]) => void },
    _id: 1,
    SafePost_<K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>): void {
      try {
        if (!vPort._port) {
          vPort.Connect_();
          injector && setTimeout(vPort.TestAlive_, 50);
        }
        (vPort._port as Port).postMessage(request);
      } catch { // this extension is reloaded or disabled
        VSettings.destroy_();
      }
    },
    Listener_<T extends keyof BgReq> (this: void, response: Req.bg<T>): void {
      type TypeToCheck = { [K in keyof BgReq]: (this: void, request: BgReq[K]) => void };
      type TypeChecked = { [K in keyof BgReq]: <T2 extends keyof BgReq>(this: void, request: BgReq[T2]) => void };
      (requestHandlers as TypeToCheck as TypeChecked)[response.N](response);
    },
    TestAlive_ (): void { esc && !vPort._port && VSettings.destroy_(); },
    ClearPort_ (this: void): void {
      vPort._port = null;
      setTimeout(function (i): void {
        if (!i) {
          try { !esc || vPort._port || vPort.Connect_(); return; } catch {}
        }
        esc && VSettings.destroy_();
      }, requestHandlers[kBgReq.init] ? 2000 : 5000);
    },
    Connect_: (function (this: void): void {
      const runtime: typeof chrome.runtime = (
        (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true : notChrome)
        ? browser as typeof chrome : chrome).runtime,
      status = requestHandlers[0] ? PortType.initing
        : (isEnabled ? passKeys ? PortType.knownPartial : PortType.knownEnabled : PortType.knownDisabled)
        + (isLocked ? PortType.isLocked : 0) + (VDom.UI.styleIn_ ? PortType.hasCSS : 0),
      name = "vimium-c." + (
        PortType.isTop * +(window.top === window) + PortType.hasFocus * +document.hasFocus() + status),
      data = { name: injector ? name + "@" + injector.versionHash : name },
      port = vPort._port = injector ? runtime.connect(injector.id, data) as Port
        : runtime.connect(data) as Port;
      port.onDisconnect.addListener(vPort.ClearPort_);
      port.onMessage.addListener(vPort.Listener_);
    })
  };
  function post<K extends keyof FgReq>(this: void, request: FgReq[K] & Req.baseFg<K>): 1 {
    return (vPort._port as Port).postMessage(request);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!isEnabled || event.isTrusted !== true && !(
          Build.MinCVer < BrowserVer.Min$Event$$IsTrusted && event.isTrusted == null && event instanceof KeyboardEvent)
        || !event.keyCode) { return; }
    if (VScroller.keyIsDown_ && VEvent.OnScrolls_[0](event)) { return; }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        && InsertMode.lock_
        && !VDom.isInDOM_(InsertMode.lock_ as LockableElement, document)) {
      InsertMode.lock_ = null;
    }
    let keyChar: string, key = event.keyCode, action: HandlerResult;
    if (action = VUtils.bubbleEvent_(event)) { /* empty */ }
    else if (InsertMode.isActive_()) {
      const g = InsertMode.global_;
      if (g ? !g.code ? VKeyboard.isEscape_(event) : key === g.code && VKeyboard.getKeyStat_(event) === g.stat
          : VKeyboard.isEscape_(event)
          ? !(passKeys && ((key === VKeyCodes.esc ? "<esc>" : "<c-[>") in passKeys) !== isPassKeysReverted)
          : (key > VKeyCodes.maxNotFn && (keyChar = VKeyboard.getKeyName_(event)) &&
              (action = checkValidKey(event, keyChar)), 0)
      ) {
        if (InsertMode.lock_ === document.body && InsertMode.lock_) {
          event.repeat && InsertMode.focusUpper_(key, true, event);
        } else {
          action = g && g.passExitKey ? HandlerResult.Nothing : HandlerResult.Prevent;
          InsertMode.exit_(event);
        }
      }
    }
    else if (key > VKeyCodes.maxNotPrintable || key === VKeyCodes.backspace || key === VKeyCodes.tab
        || key === VKeyCodes.enter) {
      if (keyChar = VKeyboard.char_(event)) {
        action = checkValidKey(event, keyChar);
        if (action === HandlerResult.Nothing && InsertMode.suppressType_ && keyChar.length === 1) {
          action = HandlerResult.Prevent;
        }
      }
    }
    else if (key !== VKeyCodes.esc || VKeyboard.getKeyStat_(event)
      || passKeys && ("<esc>" in passKeys) !== isPassKeysReverted) { /* empty */ }
    else if (nextKeys) {
      esc(HandlerResult.Suppress);
      action = HandlerResult.Prevent;
    } else if (!event.repeat && VDom.UI.removeSelection_()) {
      action = HandlerResult.Prevent;
    } else if (event.repeat && !KeydownEvents[VKeyCodes.esc] && document.activeElement !== document.body) {
      let c = document.activeElement; c && c.blur && c.blur();
    } else if (window.top !== window && document.activeElement === document.body) {
      InsertMode.focusUpper_(key, event.repeat, event);
    }
    if (action < HandlerResult.MinStopOrPreventEvents) { return; }
    if (action > HandlerResult.MaxNotPrevent) {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
    KeydownEvents[key] = 1;
  }
  function onKeyup(event: KeyboardEvent): void {
    if (!isEnabled || event.isTrusted !== true && !(
          Build.MinCVer < BrowserVer.Min$Event$$IsTrusted && event.isTrusted == null && event instanceof KeyboardEvent)
      || !event.keyCode) { return; }
    VScroller.keyIsDown_ = 0;
    if (InsertMode.suppressType_ && getSelection().type !== InsertMode.suppressType_) {
      VEvent.setupSuppress_();
    }
    if (KeydownEvents[event.keyCode]) {
      KeydownEvents[event.keyCode] = 0;
      event.preventDefault();
      event.stopImmediatePropagation();
    } else if (onKeyup2) {
      onKeyup2(event);
    }
  }
  function onFocus(this: void, event: Event | FocusEvent): void {
    if (event.isTrusted === false) { return; }
    // on Firefox, target may also be `document`
    let target: EventTarget | Element | Window | Document = event.target;
    if (target === window) {
      return onWndFocus();
    }
    if (!isEnabled || Build.BTypes & BrowserType.Firefox && target === document) { return; }
    /**
     * Notes:
     * according to test, Chrome Password Saver won't fill fields inside a shadow DOM
     * it's safe to compare .lock and doc.activeEl here without checking target.shadowRoot,
     *   and .shadowRoot should not block this check
     * DO NOT stop propagation
     * check `InsertMode.lock !== null` first, so that it needs less cost for common (plain) cases
     * use `lock === doc.active`, because:
     *   `lock !== target` ignores the case a blur event is missing or not captured;
     *   `target !== doc.active` lets it pass the case `target === lock === doc.active`
     */
    const lock = InsertMode.lock_;
    if (lock !== null && lock === document.activeElement) { return; }
    if (target === VDom.UI.box_) { return event.stopImmediatePropagation(); }
    const sr = VDom.GetShadowRoot_(target as Element);
    if (sr) {
      let path = event.path, top: EventTarget | undefined, SR = ShadowRoot,
      /**
       * isNormalHost is true if one of:
       * - Chrome is since BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
       * - `event.currentTarget` (`this`) is a shadowRoot
       */
      isNormalHost = !!(top = path && path[0]) && top !== window && top !== target,
      len = isNormalHost ? [].indexOf.call(path as EventPath, target) : 1;
      isNormalHost ? (target = top as Element) : (path = [sr]);
      while (0 <= --len) {
        const root = (path as EventPath)[len];
        if (!(root instanceof SR) || root.vimiumListened === ShadowRootListenType.Full) { continue; }
        root.addEventListener("focus", onShadow, true);
        root.addEventListener("blur", onShadow, true);
        root.vimiumListened = ShadowRootListenType.Full;
      }
    }
    if (VDom.getEditableType_<LockableElement>(target)) {
      if (InsertMode.grabBackFocus_) {
        (InsertMode.grabBackFocus_ as Exclude<typeof InsertMode.grabBackFocus_, boolean>)(event, target);
        return;
      }
      InsertMode.lock_ = target;
      if (InsertMode.mutable_) {
        if (document.activeElement !== document.body) {
          InsertMode.last_ = target;
        }
      }
    }
  }
  function onBlur(this: void, event: Event | FocusEvent): void {
    if (!isEnabled || event.isTrusted === false) { return; }
    const target: EventTarget | Element | Window | Document = event.target;
    if (target === window || Build.BTypes & BrowserType.Firefox && target === document) { return onWndBlur(); }
    let path = event.path as EventPath | undefined, top: EventTarget | undefined
      , same = !(top = path && path[0]) || top === window || top === target
      , sr = VDom.GetShadowRoot_(target as Element);
    if (InsertMode.lock_ === (same ? target : top)) {
      InsertMode.lock_ = null;
      InsertMode.inputHint_ && !InsertMode.hinting_ && document.hasFocus() && InsertMode.exitInputHint_();
    }
    if (!sr || target === VDom.UI.box_) { return; }
    let wrapper = onShadow;
    if (same) {
      sr.vimiumListened = ShadowRootListenType.Blur;
      return;
    }
    for (let len = [].indexOf.call(path as EventPath, target), SR = ShadowRoot; 0 <= --len; ) {
      const root = (path as EventPath)[len];
      if (!(root instanceof SR)) { continue; }
      root.removeEventListener("focus", wrapper, true);
      root.removeEventListener("blur", wrapper, true);
      root.vimiumListened = ShadowRootListenType.None;
    }
  }
  function onActivate(event: UIEvent): void {
    if (event.isTrusted !== false) {
      VScroller.current_ = VDom.SafeEl_(event.path ? event.path[0] as Element : event.target as Element);
    }
  }
  function onWndBlur(this: void): void {
    VScroller.keyIsDown_ = 0;
    const f = onWndBlur2;
    f && f();
    KeydownEvents = Object.create(null);
    injector || (<RegExpOne> /a?/).test("");
    esc(HandlerResult.Suppress);
  }
  function onShadow(this: ShadowRoot, event: FocusEvent): void {
    if (event.isTrusted === false) { return; }
    if (isEnabled && event.type === "focus") {
      return onFocus(event);
    }
    if (!isEnabled || this.vimiumListened === ShadowRootListenType.Blur) {
      const r = this.removeEventListener.bind(this) as Element["removeEventListener"], f = onShadow;
      r("focus", f, true); r("blur", f, true);
      this.vimiumListened = ShadowRootListenType.None;
    }
    if (isEnabled) {
      onBlur(event);
    }
  }

  const hook = (function (action: HookAction): void {
    let f = action ? removeEventListener : addEventListener;
    f("keydown", onKeydown, true);
    f("keyup", onKeyup, true);
    action !== HookAction.Suppress && f("focus", onFocus, true);
    f("blur", onBlur, true);
    (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true : notChrome)
    ? f("click", onActivate, true) :
    f.call(document, "DOMActivate", onActivate, true);
  }),
  Commands: {
    [K in kFgCmd & number]:
      K extends keyof SpecialCommands ? SpecialCommands[K] :
      (this: void, count: number, options: CmdOptions[K]) => void;
  } = [
    VFind.activate_,
    VHints.run,
    VHints.ActivateAndFocus_,
    /* unhoverLast: */ function (this: void): void {
      VDom.hover_(null);
      HUD.tip_("The last element is unhovered");
    },
    VMarks.activate_,
    VMarks.GoTo_,
    VScroller.Sc,
    VVisual.activate_,
    VOmni.run,
    /* reset: */ function (): void {
      const a = InsertMode;
      VScroller.current_ = VDom.lastHovered_ = a.last_ = a.lock_ = a.global_ = null;
      a.mutable_ = true;
      a.ExitGrab_(); VEvent.setupSuppress_();
      VHints.clean_(); VVisual.deactivate_();
      VFind.ToggleStyle_(1);
      onWndBlur();
    },

    /* toggle: */ function (_0: number, options: CmdOptions[kFgCmd.toggle]): void {
      const key = options.key, backupKey = "_" + key as string as typeof key,
      cache = VUtils.safer_(VUtils.cache_), cur = cache[key];
      let val = options.value, u: undefined;
      if (typeof cur === "boolean") {
        val === null && (val = !cur);
      }
      if (cache[backupKey] === u) {
        cache[backupKey] = cur;
      } else if (cur === val) {
        val = cache[backupKey];
        cache[backupKey] = u as never;
      }
      cache[key] = val as typeof cur;
      let msg = val === false ? '"' + key + '" has been turned off'
        : 'Now "' + key + (val === true ? '" is on' : '" use ' + JSON.stringify(val));
      return HUD.tip_(msg, 1000);
    },
    /* insertMode: */ function (_0: number, opt: CmdOptions[kFgCmd.insertMode]): void {
      let { code, stat } = opt;
      InsertMode.global_ = opt;
      if (opt.hud) { return HUD.show_(`Insert mode${code ? `: ${code}/${stat}` : ""}`); }
    },
    /* passNextKey: */ function (count: number, options: CmdOptions[kFgCmd.passNextKey]): void {
      const keys = Object.create<BOOL>(null);
      count = Math.abs(count);
      let keyCount = 0;
      if (options.normal) {
        const oldEsc = esc;
        esc = function (i: HandlerResult): HandlerResult {
          if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.Suppress) {
            HUD.hide_();
            return (esc = oldEsc)(HandlerResult.Prevent);
          }
          currentKeys = ""; nextKeys = keyMap;
          HUD.show_("Normal mode (pass keys disabled)" + (count > 1 ? `: ${count} times` : ""));
          return i;
        } as EscF;
        esc(HandlerResult.Nothing);
        return;
      }
      VUtils.push_(function (event) {
        keyCount += +!keys[event.keyCode];
        keys[event.keyCode] = 1;
        return HandlerResult.PassKey;
      }, keys);
      onKeyup2 = function (event): void {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event.keyCode] = 0;
          return HUD.show_(`Pass next ${count > 1 ? count + " keys." : "key."}`);
        }
        return (onWndBlur2 as () => void)();
      };
      onWndBlur2 = function (): void {
        onKeyup2 = null;
        VUtils.remove_(keys);
        onWndBlur2 = null;
        return HUD.hide_();
      };
      return onKeyup2({keyCode: VKeyCodes.None});
    },
    /* goNext: */ function (_0: number, {rel, patterns}: CmdOptions[kFgCmd.goNext]): void {
      if (!VDom.isHTML_() || Pagination.findAndFollowRel_(rel)) { return; }
      const isNext = rel === "next";
      if (patterns.length <= 0 || !Pagination.findAndFollowLink_(patterns, isNext ? "<" : ">")) {
        return HUD.tip_("No links to go " + rel);
      }
    },
    /* reload: */ function (_0: number, options: CmdOptions[kFgCmd.reload]): void {
      setTimeout(function () {
        options.url ? (location.href = options.url) : location.reload(!!(options.hard || options.force));
      }, 17);
    },
    /* switchFocus: */ function (_0: number, options: CmdOptions[kFgCmd.switchFocus]): void {
      let newEl = InsertMode.lock_;
      if (newEl) {
        if ((options.act || options.action) === "backspace") {
          if (VDom.view_(newEl)) { document.execCommand("delete"); }
        } else {
          InsertMode.last_ = newEl;
          InsertMode.mutable_ = false;
          newEl.blur();
        }
        return;
      }
      newEl = InsertMode.last_;
      if (!newEl) {
        return HUD.tip_("Nothing was focused", 1200);
      }
      if (!VDom.view_(newEl) && VDom.NotVisible_(newEl)) {
        return HUD.tip_("The last focused is hidden", 2000);
      }
      InsertMode.last_ = null;
      InsertMode.mutable_ = true;
      VDom.getZoom_(newEl);
      VDom.prepareCrop_();
      return VDom.UI.simulateSelect_(newEl, null, false, "", true);
    },
    /* goBack: */ function (count: number, options: CmdOptions[kFgCmd.goBack]): void {
      const step = Math.min(Math.abs(count), history.length - 1);
      step > 0 && history.go((count < 0 ? -step : step) * (+options.dir || -1));
    },
    /* showHelp: */ function (msg?: number | "e"): void {
      if (msg === "e") { return; }
      let wantTop = innerWidth < 400 || innerHeight < 320;
      if (!VDom.isHTML_()) {
        if (window === window.top) { return; }
        wantTop = true;
      }
      post({ H: kFgReq.initHelp, w: wantTop });
    },
    /* autoCopy: */ function (_0: number, options: CmdOptions[kFgCmd.autoCopy]): void {
      let str = VDom.UI.getSelectionText_(1);
      if (!str) {
        str = options.url ? location.href : document.title;
        (options.decoded || options.decode) && (str = VUtils.decodeURL_(str));
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
    /* autoOpen: */ function (_0: number, options: CmdOptions[kFgCmd.autoOpen]): void {
      let url = VDom.UI.getSelectionText_(), keyword = (options.keyword || "") + "";
      url && VPort.evalIfOK_(url) || post({
        H: kFgReq.openUrl,
        c: !url,
        k: keyword, u: url
      });
    },
    /* searchAs: */ function (_0: number, options: CmdOptions[kFgCmd.searchAs]): void {
      post({
        H: kFgReq.searchAs,
        u: location.href,
        c: options.copied,
        s: options.selected ? VDom.UI.getSelectionText_() : ""
      });
    },
    /* focusInput: */ function (count: number, options: CmdOptions[kFgCmd.focusInput]): void {
      InsertMode.inputHint_ && (InsertMode.inputHint_.hints = null as never);
      const arr: ViewOffset = VDom.getViewBox_();
      VDom.prepareCrop_();
      // here those editable and inside UI root are always detected, in case that a user modifies the shadow DOM
      const visibleInputs = VHints.traverse_("*", VHints.GetEditable_),
      action = options.select;
      let sel = visibleInputs.length;
      if (sel === 0) {
        InsertMode.exitInputHint_();
        return HUD.tip_("There are no inputs to focus.", 1000);
      } else if (sel === 1) {
        InsertMode.exitInputHint_();
        return VDom.UI.simulateSelect_(visibleInputs[0][0], visibleInputs[0][1], true, action, true);
      }
      for (let ind = 0; ind < sel; ind++) {
        const hint = visibleInputs[ind], j = hint[0].tabIndex;
        hint[2] = j > 0 ? ind / 8192 - j : ind;
      }
      const hints = visibleInputs.sort((a, b) => a[2] - b[2]).map(function (link): HintsNS.BaseHintItem {
        const marker = VDom.createElement_("span") as HintsNS.BaseHintItem["marker"],
        rect = VDom.padClientRect_(link[0].getBoundingClientRect(), 3);
        rect[0]--, rect[1]--, rect[2]--, rect[3]--;
        marker.className = "IH";
        VDom.setBoundary_(marker.style, rect);
        return {marker, target: link[0]};
      });
      if (count === 1 && InsertMode.last_) {
        sel = Math.max(0, visibleInputs.map(link => link[0]).indexOf(InsertMode.last_));
      } else {
        sel = count > 0 ? Math.min(count, sel) - 1 : Math.max(0, sel + count);
      }
      hints[sel].marker.classList.add("S", "IHS"); // Note: remove `"S"` in 2019
      VDom.UI.simulateSelect_(visibleInputs[sel][0], visibleInputs[sel][1], false, action, false);
      VDom.UI.ensureBorder_(VDom.wdZoom_);
      const box = VDom.UI.addElementList_<false>(hints, arr), keep = !!options.keep, pass = !!options.passExitKey;
      // delay exiting the old to avoid some layout actions
      // although old elements can not be GC-ed before this line, it has little influence
      InsertMode.exitInputHint_();
      InsertMode.inputHint_ = { box, hints };
      VUtils.push_(function (event) {
        const { keyCode } = event;
        if (keyCode === VKeyCodes.tab) {
          const hints2 = this.hints, oldSel = sel, len = hints2.length;
          sel = (oldSel + (event.shiftKey ? len - 1 : 1)) % len;
          InsertMode.hinting_ = true;
          VUtils.prevent_(event); // in case that selecting is too slow
          VDom.UI.simulateSelect_(hints2[sel].target, null, false, action);
          hints2[oldSel].marker.classList.remove("S", "IHS");
          hints2[sel].marker.classList.add("S", "IHS");
          InsertMode.hinting_ = false;
          return HandlerResult.Prevent;
        }
        let keyStat: KeyStat;
        if (keyCode === VKeyCodes.shiftKey || keep && (keyCode === VKeyCodes.altKey
            || keyCode === VKeyCodes.ctrlKey || keyCode === VKeyCodes.metaKey)) { /* empty */ }
        else if (event.repeat) { return HandlerResult.Nothing; }
        else if (keep ? VKeyboard.isEscape_(event) || (
            keyCode === VKeyCodes.enter && (keyStat = VKeyboard.getKeyStat_(event),
              keyStat !== KeyStat.shiftKey
              && (keyStat !== KeyStat.plain || this.hints[sel].target instanceof HTMLInputElement) )
          ) : keyCode !== VKeyCodes.ime && keyCode !== VKeyCodes.f12
        ) {
          InsertMode.exitInputHint_();
          return !VKeyboard.isEscape_(event) ? HandlerResult.Nothing : keep || !InsertMode.lock_ ? HandlerResult.Prevent
            : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
        }
        return HandlerResult.Nothing;
      }, InsertMode.inputHint_);
    }
  ],

  InsertMode = {
    grabBackFocus_: (document.readyState !== "complete") as boolean | ((event: Event, target: LockableElement) => void),
    global_: null as CmdOptions[kFgCmd.insertMode] | null,
    hinting_: false,
    inputHint_: null as { box: HTMLDivElement, hints: HintsNS.BaseHintItem[] } | null,
    suppressType_: null as string | null,
    last_: null as LockableElement | null,
    lock_: null as LockableElement | null,
    mutable_: true,
    init_ (): void {
      /** if `notBody` then `activeEl` is not null  */
      let activeEl = document.activeElement as Element, notBody = activeEl !== document.body;
      KeydownEvents = Object.create(null);
      if (VUtils.cache_.grabBackFocus_ && InsertMode.grabBackFocus_) {
        let prompted = 0, prompt = function (): void {
          prompted++ || console.log("An auto-focusing action is blocked by Vimium C");
        };
        if (notBody) {
          InsertMode.last_ = null;
          prompt();
          activeEl.blur && activeEl.blur();
          notBody = (activeEl = document.activeElement as Element) !== document.body;
        }
        if (!notBody) {
          InsertMode.grabBackFocus_ = function (event, target): void {
            if (document.activeElement === target) {
              event.stopImmediatePropagation();
              prompt();
              target.blur();
            }
          };
          VUtils.push_(InsertMode.ExitGrab_, InsertMode);
          addEventListener("mousedown", InsertMode.ExitGrab_, true);
          return;
        }
      }
      InsertMode.grabBackFocus_ = false;
      if (notBody && VDom.getEditableType_<1>(activeEl)) {
        InsertMode.lock_ = activeEl;
      }
    },
    ExitGrab_: function (this: void, event?: Req.fg<kFgReq.exitGrab> | MouseEvent | KeyboardEvent
        ): HandlerResult.Nothing | void {
      if (!InsertMode.grabBackFocus_) { return /* safer */ HandlerResult.Nothing; }
      InsertMode.grabBackFocus_ = false;
      removeEventListener("mousedown", InsertMode.ExitGrab_, true);
      VUtils.remove_(InsertMode);
      // it's acceptable to not set the userActed flag if there's only the top frame;
      // when an iframe gets clicked, the events are mousedown and then focus, so SafePost_ is needed
      !(event instanceof Event) || !frames.length && window === window.top ||
      vPort.SafePost_({ H: kFgReq.exitGrab });
      return HandlerResult.Nothing;
    } as {
      (this: void, event: KeyboardEvent): HandlerResult.Nothing;
      (this: void, request: Req.bg<kBgReq.exitGrab>): void;
      (this: void, event?: MouseEvent): void;
    },
    isActive_ (): boolean {
      if (InsertMode.suppressType_) { return false; }
      let el: Element | null = InsertMode.lock_;
      if (el !== null || InsertMode.global_) {
        return true;
      }
      el = document.activeElement;
      if (el && (el as HTMLElement).isContentEditable === true && !VDom.notSafe_(el) && el instanceof HTMLElement) {
        InsertMode.lock_ = el as LockableElement;
        return true;
      } else {
        return false;
      }
    },
    focusUpper_ (this: void, key: VKeyCodes, force: boolean, event: Event): void {
      let el = VDom.parentFrame_();
      if (!el && (!force || window.top === window)) { return; }
      VUtils.prevent_(event); // safer
      if (el) {
        KeydownEvents[key] = 1;
        const parent = el.ownerDocument.defaultView, a1 = (parent as Window & { VEvent: typeof VEvent }).VEvent;
        el.blur && el.blur();
        if (a1) {
          (parent as Window & { VDom: typeof VDom }).VDom.UI.suppressTail_(1);
          a1.focus_({ k: key, m: FrameMaskType.ForcedSelf });
        } else {
          parent.focus();
        }
      } else if (KeydownEvents[key] !== 2) { // avoid sending too many messages
        post({ H: kFgReq.nextFrame, t: Frames.NextType.parent, k: key });
        KeydownEvents[key] = 2;
      }
    },
    exit_ (event: KeyboardEvent): void {
      let target: Element | null = event.target as Element, sr = VDom.GetShadowRoot_(target);
      if (sr != null && sr instanceof ShadowRoot) {
        if (target = InsertMode.lock_) {
          InsertMode.lock_ = null;
          (target as LockableElement).blur();
        }
      } else if (target === InsertMode.lock_ ? (InsertMode.lock_ = null, 1) : VDom.getEditableType_<1>(target)) {
        (target as LockableElement).blur();
      }
      if (InsertMode.global_) {
        InsertMode.lock_ = null; InsertMode.global_ = null;
        HUD.hide_();
      }
    },
    onExitSuppress_: null as ((this: void) => void) | null,
    exitInputHint_ (): void {
      let hint = InsertMode.inputHint_;
      if (!hint) { return; }
      InsertMode.inputHint_ = null;
      hint.box.remove();
      VUtils.remove_(hint);
    }
  },

  Pagination = {
  followLink_ (linkElement: HTMLElement): boolean {
    let url = linkElement instanceof HTMLLinkElement && linkElement.href;
    if (url) {
      Commands[kFgCmd.reload](1, { url });
    } else {
      VDom.view_(linkElement);
      VDom.UI.flash_(linkElement);
      setTimeout(function () { VDom.UI.click_(linkElement); }, 100);
    }
    return true;
  },
  GetLinks_ (this: HTMLElement[], element: Element): void {
    if (!(element instanceof HTMLElement) || VDom.notSafe_(element)) { return; }
    let s: string | null = (element.tagName as string).toLowerCase(), sr = element.shadowRoot;
    if (sr) {
      ([].forEach as HintsNS.ElementIterator<Element>).call(
        sr.querySelectorAll("*"), Pagination.GetLinks_, this);
    }
    const isClickable = s === "a" || (
      s === "button" ? !(element as HTMLButtonElement).disabled
      : VUtils.clickable_.has(element) || element.getAttribute("onclick") || (
        (s = element.getAttribute("role")) ? (s = s.toLowerCase(), s === "link" || s === "button")
        : VHints.ngEnabled_ && element.getAttribute("ng-click")));
    if (!isClickable) { return; }
    if ((s = element.getAttribute("aria-disabled")) != null && (!s || s.toLowerCase() === "true")) { return; }
    const rect = element.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2 && getComputedStyle(element).visibility === "visible") {
      this.push(element);
    }
  },
  findAndFollowLink_ (names: string[], refusedStr: string): boolean {
    interface Candidate { [0]: number; [1]: string; [2]: HTMLElement; }
    // Note: this traverser should not need a prepareCrop
    const count = names.length, links = VHints.traverse_("*", Pagination.GetLinks_, true, true);
    links.push(document.documentElement as HTMLElement);
    let candidates: Candidate[] = [], ch: string, s: string, maxLen = 99, len: number;
    for (let re1 = <RegExpOne> /\s+/, _len = links.length - 1; 0 <= --_len; ) {
      const link = links[_len];
      if (link.contains(links[_len + 1]) || (s = link.innerText).length > 99) { continue; }
      if (!s && !(s = (ch = (link as HTMLInputElement).value) && ch.toLowerCase && ch || link.title)) { continue; }
      s = s.toLowerCase();
      for (let i = 0; i < count; i++) {
        if (s.indexOf(names[i]) !== -1) {
          if (s.indexOf(refusedStr) === -1 && (len = s.split(re1).length) <= maxLen) {
            let i2 = names.indexOf(s, i + 1);
            if (i2 >= 0) { i = i2; len = 2; }
            maxLen > len && (maxLen = len + 1);
            // requires GlobalConsts.MaxNumberOfNextPatterns <= 255
            candidates.push([(i << 23) | (len << 16) | (candidates.length & 0xffff), s, link]);
          }
          break;
        }
      }
    }
    if (candidates.length <= 0) { return false; }
    maxLen = (maxLen + 1) << 16;
    candidates = candidates.filter(a => (a[0] & 0x7fffff) < maxLen).sort((a, b) => a[0] - b[0]);
    for (let re2 = <RegExpOne> /\b/, i = candidates[0][0] >> 23; i < count; ) {
      s = names[i++];
      const re = new RegExp(re2.test(s[0]) || re2.test(s.slice(-1)) ? `\\b${s}\\b` : s, ""), j = i << 23;
      for (const cand of candidates) {
        if (cand[0] > j) { break; }
        if (re.test(cand[1])) { return Pagination.followLink_(cand[2]); }
      }
    }
    return false;
  },
  findAndFollowRel_ (relName: string): boolean {
    const elements = document.querySelectorAll("[rel]"),
    relTags: SafeEnum = VUtils.safer_({a: 1, area: 1, link: 1});
    let s: string | null;
    for (let _i = 0, _len = elements.length, re1 = <RegExpOne> /\s+/; _i < _len; _i++) {
      const element = elements[_i], name = element.tagName as string | Element | Window;
      if (relTags[(name + "").toLowerCase()]
          && element instanceof HTMLElement
          && (s = (element as HTMLAnchorElement | HTMLAreaElement | HTMLLinkElement).rel)
          && s.trim().toLowerCase().split(re1).indexOf(relName) >= 0) {
        return Pagination.followLink_(element);
      }
    }
    return false;
  }
  },
  FrameMask = {
    more_: false,
    node_: null as HTMLDivElement | null,
    timer_: 0,
    Focus_ (this: void, { m: mask, S: CSS, k: key }: BgReq[kBgReq.focusFrame]): void {
      CSS && VDom.UI.css_(CSS);
      if (mask !== FrameMaskType.NormalNext) { /* empty */ }
      else if (innerWidth < 3 || innerHeight < 3
        || document.body instanceof HTMLFrameSetElement
        || VEvent.checkHidden_()) {
        post({
          H: kFgReq.nextFrame,
          k: key
        });
        return;
      }
      VEvent.focusAndListen_();
      esc(HandlerResult.Nothing);
      KeydownEvents[key] = 1;
      const notTop = window.top !== window;
      if (notTop && mask === FrameMaskType.NormalNext) {
        let docEl = document.documentElement;
        docEl && (docEl.scrollIntoViewIfNeeded || docEl.scrollIntoView).call(docEl);
      }
      if (mask < FrameMaskType.minWillMask || !VDom.isHTML_()) { return; }
      let _this = FrameMask, dom1: HTMLDivElement | null;
      if (dom1 = _this.node_) {
        _this.more_ = true;
      } else {
        dom1 = VDom.createElement_("div");
        dom1.className = "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : "");
        _this.node_ = dom1;
        _this.timer_ = setInterval(_this.Remove_, notTop ? 350 : 200);
      }
      VDom.UI.add_(dom1);
    },
    Remove_ (this: void, info?: TimerType): void {
      const _this = FrameMask, { more_ } = _this;
      _this.more_ = false;
      if (more_ && info !== TimerType.fake) { return; }
      if (_this.node_) { _this.node_.remove(); _this.node_ = null; }
      clearInterval(_this.timer_);
    }
  },
  HUD = {
    _tweenId: 0,
    box_: null as HTMLDivElement | null,
    text_: "",
    opacity_: 0 as 0 | 0.25 | 0.5 | 0.75 | 1,
    enabled_: false,
    _timer: 0,
    copied_: function (this: VHUDTy, text: string, e?: string, virtual?: true): string | void {
      if (!text) {
        if (virtual) { return text; }
        return HUD.tip_(`No ${e || "text"} found!`, 1000);
      }
      if (text.startsWith("chrome-") && text.indexOf("://") > 0) {
        text = text.substring(text.indexOf("/", text.indexOf("/") + 2)) || text;
      }
      text = "Copied: " + (text.length > 41 ? text.substring(0, 41) + "\u2026" : text + ".");
      if (virtual) { return text; }
      return HUD.tip_(text, 2000);
    } as VHUDTy["copied_"],
    tip_ (text: string, duration?: number): void {
      HUD.show_(text);
      HUD.text_ && ((HUD as typeof HUD)._timer = setTimeout(HUD.hide_, duration || 1500));
    },
    show_ (text: string, embed?: boolean): void {
      const hud = HUD;
      if (!hud.enabled_ || !VDom.isHTML_()) { return; }
      hud.opacity_ = 1; hud.text_ = text;
      if (hud._timer) { clearTimeout(hud._timer); hud._timer = 0; }
      embed || hud._tweenId || (hud._tweenId = setInterval(hud._tween, 40));
      let el = hud.box_;
      if (el) {
        embed && (el.style.cssText = "");
        (el.firstChild as Text).data = text;
        return;
      }
      el = VDom.createElement_("div");
      el.className = "R HUD";
      el.textContent = text;
      if (!embed) {
        const st = el.style;
        st.opacity = "0";
        st.visibility = "hidden";
        VDom.UI.box_ || VDom.UI.ensureBorder_();
      }
      VDom.UI.add_(hud.box_ = el, VHints.hints_ ? AdjustType.NotAdjust : AdjustType.DEFAULT, VHints.box_);
    },
    _tween (this: void, info?: TimerType): void {
      if (!VPort) { return; }
      const hud = HUD, el = hud.box_ as HTMLDivElement, st = el.style, fake = info === TimerType.fake;
      let opacity = fake ? 0 : +(st.opacity || 1);
      if (opacity === hud.opacity_) { /* empty */ }
      else if (opacity === 0) {
        (el.firstChild as Text).data = hud.text_;
        st.opacity = fake ? "" : "0.25";
        st.visibility = "";
        return VDom.UI.adjust_();
      } else if (document.hasFocus()) {
        opacity += opacity < hud.opacity_ ? 0.25 : -0.25;
      } else {
        opacity = hud.opacity_;
      }
      st.opacity = opacity < 1 ? "" + opacity : "";
      if (opacity !== hud.opacity_) { return; }
      if (opacity === 0) {
        st.visibility = "hidden";
        (el.firstChild as Text).data = "";
      }
      clearInterval(hud._tweenId);
      hud._tweenId = 0;
    },
    hide_ (this: void, info?: TimerType): void {
      let hud = HUD, i: number;
      if (i = hud._timer) { clearTimeout(i); hud._timer = 0; }
      hud.opacity_ = 0; hud.text_ = "";
      if (!hud.box_) { /* empty */ }
      else if (info === TimerType.noTimer) {
        const box = hud.box_, st = box.style;
        st.opacity = "0";
        st.visibility = "hidden";
        (box.firstChild as Text).data = "";
      }
      else if (!hud._tweenId && VHUD) {
        hud._tweenId = setInterval(hud._tween, 40);
      }
    }
  },
  requestHandlers: { [K in keyof BgReq]: (this: void, request: BgReq[K]) => void } = [
    function (request: BgReq[kBgReq.init]): void {
      const r = requestHandlers, {c: load, s: flags} = request, D = VDom;
      const browserVer = load.browserVer_;
      OnOther = load.browser_;
      ((VSettings as Writeable<VSettingsTy>).cache = VUtils.cache_ = load).onMac_ &&
        (VKeyboard.correctionMap_ = Object.create<string>(null));
      if ((Build.BTypes & ~BrowserType.Chrome)
          || Build.MinCVer < BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl) {
        D.specialZoom_ = !!(Build.BTypes & BrowserType.Chrome)
          && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
          && (Build.MinCVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl
              || browserVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl);
      }
      if ((Build.BTypes & ~BrowserType.Chrome
              && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
          || (Build.MinCVer < BrowserVer.MinNamedGetterOnFramesetNotOverrideBulitin
              && browserVer < BrowserVer.MinNamedGetterOnFramesetNotOverrideBulitin)) {
        D.notSafe_ = (el): el is HTMLFormElement => el instanceof HTMLFormElement || el instanceof HTMLFrameSetElement;
      }
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0 &&
      load.deepHints && (VHints.queryInDeep_ = DeepQueryType.InDeep);
      r[kBgReq.keyMap](request);
      if (flags) {
        InsertMode.grabBackFocus_ = !(flags & Frames.Flags.userActed);
        isLocked = !!(flags & Frames.Flags.locked);
      }
      (r[kBgReq.reset] as (request: BgReq[kBgReq.reset], initing?: 1) => void)(request, 1);
      if (isEnabled) {
        InsertMode.init_();
      } else {
        InsertMode.grabBackFocus_ = false;
        hook(HookAction.Suppress);
        VSettings.execute_ && VSettings.execute_(kContentCmd.SuppressClickable);
      }
      r[kBgReq.init] = null as never;
      D.DocReady_(function (): void {
        HUD.enabled_ = true;
        onWndFocus = vPort.SafePost_.bind(vPort as never, <Req.fg<kFgReq.focus>> { H: kFgReq.focus });
      });
    },
    function (request: BgReq[kBgReq.reset], initing?: 1): void {
      const newPassKeys = request.p, enabled = newPassKeys !== "", old = isEnabled;
      passKeys = newPassKeys && Object.create<1>(null);
      if (newPassKeys) {
        isPassKeysReverted = newPassKeys[0] === "^" && newPassKeys.length > 2;
        for (const ch of (isPassKeysReverted ? newPassKeys.substring(2) : newPassKeys).split(" ")) {
          (passKeys as SafeDict<1>)[ch] = 1;
        }
      }
      (VSettings as Writeable<VSettingsTy>).enabled_ = isEnabled = enabled;
      if (initing) {
        return;
      }
      isLocked = !!request.f;
      // if true, recover listeners on shadow roots;
      // otherwise listeners on shadow roots will be removed on next blur events
      if (enabled) {
        old || InsertMode.init_();
        (old && !isLocked) || hook(HookAction.Install);
        // here should not return even if old - a url change may mean the fullscreen mode is changed
      } else {
        Commands[kFgCmd.reset]();
      }
      if (VDom.UI.box_) { return VDom.UI.adjust_(+enabled ? 1 : 2); }
    },
    injector ? injector.reload : null as never,
    function<T extends keyof FgReq> (this: void, request: BgReq[kBgReq.url] & Req.fg<T>): void {
      delete (request as Req.bg<kBgReq.url>).N;
      request.u = location.href;
      post<T>(request);
    },
    function<K extends keyof FgRes> (response: Req.res<K>): void {
      const arr = vPort._callbacks, id = response.m, handler = arr[id];
      delete arr[id];
      handler(response.r);
    },
    function (options: BgReq[kBgReq.eval]): void { VPort.evalIfOK_(options.u); },
    function ({ d: delta }: BgReq[kBgReq.settingsUpdate]): void {
      type Keys = keyof SettingsNS.FrontendSettings;
      VUtils.safer_(delta);
      const cache = VUtils.cache_, deepHints = delta.deepHints;
      for (const i in delta) {
        cache[i as Keys] = delta[i as Keys] as SettingsNS.FrontendSettings[Keys];
        const i2 = "_" + i as Keys;
        (i2 in cache) && (VUtils.safer_(cache)[i2] = undefined as never);
      }
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0 &&
      deepHints != null && VHints.queryInDeep_ !== DeepQueryType.NotAvailable &&
      (VHints.queryInDeep_ = deepHints ? DeepQueryType.InDeep : DeepQueryType.NotDeep);
    },
    FrameMask.Focus_,
    InsertMode.ExitGrab_ as (this: void, request: Req.bg<kBgReq.exitGrab>) => void,
    function (request: BgReq[kBgReq.keyMap]): void {
      const map = keyMap = request.k, func = Object.setPrototypeOf;
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
    function<O extends keyof CmdOptions> (request: Req.FgCmd<O>): void {
      if (request.S) { VDom.UI.css_(request.S); }
      const options: CmdOptions[O] | null = request.a;
      type Keys = keyof CmdOptions;
      type TypeToCheck = {
        [key in Keys]: (this: void, count: number, options: CmdOptions[key]) => void;
      };
      type TypeChecked = {
        [key in Keys]: <T2 extends Keys>(this: void, count: number, options: CmdOptions[T2]) => void;
      };
      (Commands as TypeToCheck as TypeChecked)[request.c](request.n
        , (options ? VUtils.safer_(options) : Object.create(null)) as CmdOptions[O]);
    },
    function (request: BgReq[kBgReq.createMark]): void { return VMarks.createMark_(request.n); },
    function (req: Req.bg<kBgReq.showHUD>): void {
      if (req.S) {
        VDom.UI.css_(req.S);
        if (req.f) {
          VFind.css_ = req.f;
          VFind.styleIframe_ && (VFind.styleIframe_.textContent = req.f[1]);
        }
      }
      // tslint:disable-next-line: no-unused-expression
      req.t ? req.c ? HUD.copied_(req.t) : HUD.tip_(req.t) : 0;
    },
    function (request: BgReq[kBgReq.count]): void {
      const count = parseInt(currentKeys, 10) || 1;
      post({ H: kFgReq.cmd, c: request.c, n: count, i: request.i});
    },
  function ({ h: html, a: shouldShowAdvanced, o: optionUrl, S: CSS }: Req.bg<kBgReq.showHelpDialog>): void {
    let box: HTMLDivElement & SafeHTMLElement
      , oldShowHelp = Commands[kFgCmd.showHelp], hide: (this: void, e?: Event | number | "e") => void
      , node1: HTMLElement;
    if (CSS) { VDom.UI.css_(CSS); }
    if (!VDom.isHTML_()) { return; }
    Commands[kFgCmd.showHelp]("e");
    if (oldShowHelp !== Commands[kFgCmd.showHelp]) { return; } // an old dialog exits
    box = VDom.createElement_("div");
    box.className = "R Scroll UI";
    box.id = "HelpDialog";
    box.innerHTML = html;
    box.onclick = VUtils.Stop_;
    for (let i of ["mousedown", "mouseup", "wheel", "contextmenu"]) {
      // note: if wheel is listened, then mousewheel won't be dispatched even on Chrome 35
      VUtils.suppressAll_(box, i);
    }
    if (Build.MinCVer >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument
        || VUtils.cache_.browserVer_ >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument) {
      box.addEventListener(
        (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true : notChrome)
        ? "click" : "DOMActivate", onActivate, true);
    }

    const closeBtn = box.querySelector("#HClose") as HTMLElement;
    hide = function (event): void {
      if (event instanceof Event) {
        VUtils.prevent_(event);
      } else {
        closeBtn.onclick = null as never;
        closeBtn.removeAttribute("href");
        closeBtn.click();
      }
      let i = VDom.lastHovered_;
      i && box.contains(i) && (VDom.lastHovered_ = null);
      (i = VScroller.current_) && box.contains(i) && (VScroller.current_ = null);
      VUtils.remove_(box);
      box.remove();
      Commands[kFgCmd.showHelp] = oldShowHelp;
    };
    closeBtn.onclick = Commands[kFgCmd.showHelp] = hide;
    node1 = box.querySelector("#OptionsPage") as HTMLAnchorElement;
    if (! location.href.startsWith(optionUrl)) {
      (node1 as HTMLAnchorElement).href = optionUrl;
      node1.onclick = function (event) {
        post({ H: kFgReq.focusOrLaunch, u: optionUrl });
        hide(event);
      };
    } else {
      node1.remove();
    }
    node1 = box.querySelector("#AdvancedCommands") as HTMLElement;
    function toggleAdvanced(this: void): void {
      (node1.firstChild as Text).data = (shouldShowAdvanced ? "Hide" : "Show") + " advanced commands";
      box.classList.toggle("HelpAdvanced");
    }
    node1.onclick = function (event) {
      VUtils.prevent_(event);
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      (post as <K extends keyof SettingsNS.FrontUpdateAllowedSettings>(this: void, req: SetSettingReq<K>) => 1)({
        H: kFgReq.setSetting,
        key: "showAdvancedCommands",
        value: shouldShowAdvanced
      });
    };
    shouldShowAdvanced && toggleAdvanced();
    VDom.UI.ensureBorder_();
    VDom.UI.add_(box, AdjustType.Normal, true);
    document.hasFocus() || VEvent.focusAndListen_();
    VScroller.current_ = box;
    VUtils.push_(function (event) {
      if (!InsertMode.lock_ && VKeyboard.isEscape_(event)) {
        VDom.UI.removeSelection_(VDom.UI.UI) || hide();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    }, box);
    if (VOmni.status_ >= VomnibarNS.Status.Showing) {
      VUtils.remove_(VOmni);
      VUtils.push_(VOmni.onKeydown_, VOmni);
    }
  }
  ];

  function checkValidKey(event: KeyboardEvent, key: string): HandlerResult.Nothing | HandlerResult.Prevent {
    key = VKeyboard.key_(event, key);
    mappedKeys !== null && (key = mappedKeys[key] || key);
    let j: ReadonlyChildKeyMap | ValidKeyAction | undefined;
    if (!nextKeys || (j = nextKeys[key]) == null) {
      j = keyMap[key];
      // when checkValidKey, Vimium C must be enabled, so passKeys won't be `""`
      if (j == null || passKeys !== null && (key in <SafeEnum> passKeys) !== isPassKeysReverted) {
        currentKeys = "";
        nextKeys = null;
        return HandlerResult.Nothing;
      }
      if (j !== KeyAction.cmd && nextKeys) { currentKeys = ""; }
    }
    currentKeys += key;
    if (j === KeyAction.cmd) {
      post({ H: kFgReq.key, k: currentKeys, l: event.keyCode });
      return esc(HandlerResult.Prevent);
    } else {
      nextKeys = j !== KeyAction.count ? j : keyMap;
      return HandlerResult.Prevent;
    }
  }

  VPort = {
    post_: post,
    send_ <K extends keyof FgRes> (this: void, request: Pick<Req.fgWithRes<K>, "a" | "c"> & Partial<Req.fgWithRes<K>>
        , callback: (this: void, res: FgRes[K]) => void): void {
      let id = ++vPort._id;
      request.H = kFgReq.msg; request.i = id;
      (vPort._port as Port).postMessage<K>(request as EnsureNonNull<typeof request>);
      vPort._callbacks[id] = callback;
    },
    evalIfOK_ (url: string): boolean {
      if (!VUtils.jsRe_.test(url)) {
        return false;
      }
      url = url.substring(11).trim();
      if ((<RegExpOne> /^void\s*\( ?0 ?\)\s*;?$|^;?$/).test(url)) { /* empty */ }
      else if (VDom.allowScripts_) {
        setTimeout(function (): void {
          const script = VDom.createElement_("script");
          script.type = "text/javascript";
          script.textContent = VUtils.decodeURL_(url, decodeURIComponent);
          (document.documentElement as HTMLElement).appendChild(script);
          script.remove();
        }, 0);
      } else {
        HUD.tip_("Here's not allowed to eval scripts");
      }
      return true;
    }
  };
  VHUD = HUD;

  VEvent = {
    lock_ (this: void): LockableElement | null { return InsertMode.lock_; },
    onWndBlur_ (this: void, f): void { onWndBlur2 = f; },
    OnWndFocus_ (this: void): void { return onWndFocus(); },
    checkHidden_ (this: void
        , cmd?: kFgCmd, count?: number, options?: NonNullable<FgReq[kFgReq.gotoMainFrame]["a"]>): boolean {
      let wnd = window, docEl = document.documentElement, el = wnd === wnd.top ? null : VDom.parentFrame_() || docEl;
      if (!el) { return false; }
      let box = el.getBoundingClientRect(),
      result = box.height === 0 && box.width === 0 || getComputedStyle(el).visibility === "hidden";
      if (!count) { /* empty */ }
      else if (result) {
        type ForwardedOptions = Exclude<typeof options, undefined>;
        (options as ForwardedOptions).$forced || VPort.post_({
          H: kFgReq.gotoMainFrame,
          c: cmd as NonNullable<typeof cmd>,
          n: count, a: options as ForwardedOptions
        });
      } else if (el !== docEl && (box.bottom <= 0 || box.top > (window.parent as Window).innerHeight)) {
        FrameMask.Focus_({ S: null, k: VKeyCodes.None, m: FrameMaskType.ForcedSelf });
        el.scrollIntoView();
      }
      return result;
    },
    focusAndListen_ (callback?: (() => void) | null, timedout?: 0 | 1): void {
      if (timedout !== 1) {
        setTimeout(function (): void { VEvent.focusAndListen_(callback, 1 as number as 0); }, 1);
        return;
      }
      InsertMode.ExitGrab_();
      let old = onWndFocus, failed = true;
      onWndFocus = function (): void { failed = false; };
      VOmni.status_ === VomnibarNS.Status.Showing && VOmni.box_.blur();
      window.focus();
      failed && isEnabled && hook(HookAction.Install);
      // the line below is always necessary: see https://github.com/philc/vimium/issues/2551#issuecomment-316113725
      (onWndFocus = old)();
      if (callback && esc) {
        return callback();
      }
    },
    focus_: FrameMask.Focus_,
    mapKey_ (this: void, key): string { return mappedKeys !== null && mappedKeys[key] || key; },
    scroll_ (this: void, event, wnd): void {
      if (!event || event.shiftKey || event.altKey) { return; }
      const { keyCode } = event as { keyCode: number }, c = (keyCode & 1) as BOOL;
      if (!(keyCode > VKeyCodes.maxNotPageUp && keyCode < VKeyCodes.minNotDown)) { return; }
      wnd && VUtils.cache_.smoothScroll && VEvent.OnScrolls_[1](wnd, 1);
      const work = keyCode > VKeyCodes.maxNotLeft ? 1 : keyCode > VKeyCodes.maxNotEnd ? 2
        : !(event.ctrlKey || event.metaKey) ? 3 : 0;
      work && event instanceof Event && VUtils.prevent_(event as Event);
      if (work === 1) {
        VScroller.scrollBy_((1 - c) as BOOL, keyCode < VKeyCodes.minNotUp ? -1 : 1, 0);
      } else if (work === 2) {
        VScroller.scrollTo_(1, 0, c);
      } else if (work) {
        VScroller.scrollBy_(1, 0.5 - c, "view");
      }
    },
    OnScrolls_: [function (event): BOOL | 28 {
      return VScroller.keyIsDown_ = event.repeat ? (VUtils.prevent_(event), VScroller.maxInterval_ as 1 | 28) : 0;
    }, function (this: VEventModeTy["OnScrolls_"], wnd, interval): void {
      const f = interval ? addEventListener : removeEventListener,
      listener = this[2];
      VScroller.keyIsDown_ = interval || 0;
      f.call(wnd, "keyup", listener, true); f.call(wnd, "blur", listener, true);
    }, function (event): void {
      if (event.isTrusted === false) {
        if (event.type !== "blur") {
          VUtils.prevent_(event);
        } else if (event.target !== this) {
          return;
        }
        VEvent.OnScrolls_[1](this);
      }
    }],
    setupSuppress_ (this: void, onExit): void {
      const mode = InsertMode, f = mode.onExitSuppress_;
      mode.onExitSuppress_ = mode.suppressType_ = null;
      if (onExit) {
        mode.suppressType_ = getSelection().type;
        mode.onExitSuppress_ = onExit;
      }
      if (f) { return f(); }
    },
    keydownEvents_: function (this: void, arr?: KeydownCacheArray): KeydownCacheArray | boolean {
      if (!arr) { return KeydownEvents; }
      return !isEnabled || !(KeydownEvents = arr);
    } as VEventModeTy["keydownEvents_"]
  };

  VSettings = {
    enabled_: false,
    cache: null as never as SettingsNS.FrontendSettingCache,
    execute_: null,
  destroy_ (silent): void {
    (VSettings as Writeable<VSettingsTy>).enabled_ = isEnabled = false;
    hook(HookAction.Destroy);

    Commands[kFgCmd.reset]();
    let f = VSettings.execute_, ui = VDom.UI;
    f && f(kContentCmd.Destroy);
    ui.box_ && ui.adjust_(2);

    VUtils = VKeyboard = VDom = VDom = VUtils =
    VHints = VOmni = VScroller = VMarks = VFind =
    VSettings = VHUD = VPort = VEvent = VVisual =
    esc = null as never;

    silent || console.log("%cVimium C%c in %o has been destroyed at %o."
      , "color:red", "color:auto"
      , location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
      , Date.now());

    if (vPort._port) { try { vPort._port.disconnect(); } catch {} }
    injector || (<RegExpOne> /a?/).test("");
  }
  };
  if (injector) {
    injector.checkIfEnabled = vPort.SafePost_ as {} as () => void;
    injector.getCommandCount = function (this: void): string {
      return currentKeys;
    } as (this: void) => (string | number) as (this: void) => number;
  }

  // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
  if (location.href !== "about:blank" || injector || !function (): 1 | void {
    try {
      let f = VDom.parentFrame_(),
      a1 = f && ((f as HTMLElement).ownerDocument.defaultView as Window & { VFind?: typeof VFind}).VFind;
      if (a1 && a1.box_ && a1.box_ === f) {
        VSettings.destroy_(true);
        a1.onLoad_();
        return 1; // not return a function's result so that logic is clearer for compiler
      }
    } catch {}
  }()) {
    hook(HookAction.Install);
    vPort.Connect_();
  }
})();

if (Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".startsWith) {
  String.prototype.startsWith = function (this: string, s: string): boolean {
    return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
  };
  "".endsWith || (String.prototype.endsWith = function (this: string, s: string): boolean {
    const i = this.length - s.length;
    return i >= 0 && this.indexOf(s, i) === i;
  });
}