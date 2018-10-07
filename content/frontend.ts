var VSettings: VSettings, VHUD: VHUD, VPort: VPort, VEventMode: VEventMode;

(function() {
  interface EscF {
    <T extends HandlerResult>(this: void, i: T): T;
    (this: void): void;
  }
  interface Port extends chrome.runtime.Port {
    postMessage<K extends keyof FgReq>(request: Req.fg<K>): 1;
    postMessage<K extends keyof FgRes>(request: Req.fgWithRes<K>): 1;
  }
  const enum ListenType {
    None = 0,
    Blur = 1,
    Full = 2,
  }
  interface ShadowRootEx extends ShadowRoot {
    vimiumListened?: ListenType;
  }
  type LockableElement = HTMLElement;

  let KeydownEvents: KeydownCacheArray, keyMap: KeyMap
    , currentKeys = "", isEnabled = false, isLocked = false
    , mapKeys = null as SafeDict<string> | null, nextKeys = null as KeyMap | ReadonlyChildKeyMap | null
    , esc = function(i?: HandlerResult): HandlerResult | void { currentKeys = ""; nextKeys = null; return i; } as EscF
    , onKeyup2 = null as ((this: void, event: KeyboardEvent) => void) | null, passKeys = null as SafeDict<true> | null
    , onWndFocus = function(this: void): void {}, onWndBlur2: ((this: void) => void) | null = null
    ;

  const isInjected = !!window.VimiumInjector,
  notChrome = typeof browser !== "undefined" && !!(browser && (browser as any).runtime),
  vPort = {
    _port: null as Port | null,
    _callbacks: Object.create(null) as { [msgId: number]: <K extends keyof FgRes>(this: void, res: FgRes[K]) => void },
    _id: 1,
    SafePost_<K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>): void {
      try {
        if (!vPort._port) {
          vPort.Connect_((isEnabled ? passKeys ? PortType.knownPartial : PortType.knownEnabled : PortType.knownDisabled)
            + (isLocked ? PortType.isLocked : 0) + (VDom.UI.styleIn_ ? PortType.hasCSS : 0));
          isInjected && setTimeout(vPort.TestAlive_, 50);
        }
        (vPort._port as Port).postMessage(request);
      } catch (e) { // this extension is reloaded or disabled
        VSettings.destroy_();
      }
    },
    Listener_<K extends keyof FgRes, T extends keyof BgReq> (this: void
        , response: Req.res<K> | (Req.bg<T> & { _msgId?: undefined; })): void {
      let id: number | undefined;
      if (id = response._msgId) {
        const arr = vPort._callbacks, handler = arr[id];
        delete arr[id];
        handler((response as Req.res<K>).response);
      } else {
        (requestHandlers as any)[(response as Req.bg<T>).name as T](response as Req.bg<T>);
      }
    },
    TestAlive_ (): void { esc && !vPort._port && VSettings.destroy_(); },
    ClearPort_ (this: void): void {
      vPort._port = null;
      requestHandlers.init && VDom.Scripts && setTimeout(function(i): void {
        if (i) { VSettings.destroy_(); } else
        try { esc && vPort.Connect_(PortType.initing); } catch(e) { VSettings.destroy_(); }
      }, 2000);
    },
    Connect_: (function (this: void, status: PortType): void {
      const runtime: typeof chrome.runtime = (notChrome ? browser : chrome).runtime,
      data = { name: "vimium-c." + (PortType.isTop * +(window.top === window) + PortType.hasFocus * +document.hasFocus() + status) },
      port = vPort._port = isInjected ? runtime.connect(VimiumInjector.id, data) as Port : runtime.connect(data) as Port;
      port.onDisconnect.addListener(vPort.ClearPort_);
      port.onMessage.addListener(vPort.Listener_);
    })
  }
  function post<K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>): 1 {
    return (vPort._port as Port).postMessage(request);
  } 
  function send<K extends keyof FgRes> (this: void, request: FgReq[K] & Req.baseFg<K>
      , callback: (this: void, res: FgRes[K]) => void): void {
    let id = ++vPort._id;
    (vPort._port as Port as any).postMessage({_msgId: id, request: request});
    vPort._callbacks[id] = callback;
  }

    function onKeydown(event: KeyboardEvent): void {
      if (!isEnabled || event.isTrusted !== true && !(event.isTrusted == null && event instanceof KeyboardEvent)
        || !event.keyCode) { return; }
      if (VScroller.keyIsDown_ && VEventMode.OnScrolls_[0](event)) { return; }
      let keyChar: string, key = event.keyCode, action: HandlerResult;
      if (action = VUtils.bubbleEvent_(event)) {}
      else if (InsertMode.isActive_()) {
        const g = InsertMode.global_;
        if (g ? !g.code ? VKeyboard.isEscape_(event)
              : key === g.code && VKeyboard.getKeyStat_(event) === g.stat
            : VKeyboard.isEscape_(event)
              || (key > VKeyCodes.maxNotFn && (keyChar = VKeyboard.getKeyName_(event)) &&
                (action = checkValidKey(event, keyChar)), false)
        ) {
          if (InsertMode.lock_ === document.body && InsertMode.lock_) {
            event.repeat && InsertMode.focusUpper_(key, true, event);
          } else {
            action = g && g.passExitKey ? HandlerResult.Nothing : HandlerResult.Prevent;
            InsertMode.exit_(event);
          }
        }
      }
      else if (key > VKeyCodes.maxNotPrintable || key === VKeyCodes.backspace || key === VKeyCodes.tab || key === VKeyCodes.enter) {
        if (keyChar = VKeyboard.char(event)) {
          action = checkValidKey(event, keyChar);
          if (action === HandlerResult.Nothing && InsertMode.suppressType_ && keyChar.length === 1) {
            action = HandlerResult.Prevent;
          }
        }
      }
      else if (key !== VKeyCodes.esc || VKeyboard.getKeyStat_(event)) {}
      else if (nextKeys !== null) {
        esc(HandlerResult.Suppress);
        action = HandlerResult.Prevent;
      } else if (!event.repeat && VDom.UI.removeSelection_()) {
        action = HandlerResult.Prevent;
      } else if (VFindMode.isActive_) {
        VUtils.prevent_(event); // safer
        VFindMode.deactivate_(FindNS.Action.ExitNoFocus); // should exit
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
      if (!isEnabled || event.isTrusted !== true && !(event.isTrusted == null && event instanceof KeyboardEvent)
        || !event.keyCode) { return; }
      VScroller.keyIsDown_ = 0;
      if (InsertMode.suppressType_ && VDom.selType_() !== InsertMode.suppressType_) {
        VEventMode.setupSuppress_();
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
      let target = event.target as EventTarget | Element | (Document & { shadowRoot: undefined });
      if (target === window) {
        return onWndFocus();
      }
      if (!isEnabled) { return; }
      /**
       * Notes:
       * according to test, Chrome Password Saver won't fill fields inside a shadow DOM
       * it's safe to compare .lock and doc.activeEl here without checking target.shadowRoot,
       *   and .shadowRoot should not block this check
       * DO NOT stop propagation
       * check `InsertMode.lock !== null` first, so that it needs less cost for common (plain) cases
       * use `a === doc.active`, because:
       *   `a !== target` ignores the case a blur event is missing or not captured;
       *   `target !== doc.active` lets pass the case `target === lock === doc.active`
       */
      let a = InsertMode.lock_;
      if (a !== null && a === document.activeElement) { return; }
      if (target === VDom.UI.box_) { return event.stopImmediatePropagation(); }
      if ((target as Element).shadowRoot != null) {
        let path = event.path, top: EventTarget | undefined
          /**
           * isNormalHost is true if one of:
           * - Chrome is since BrowserVer.MinOnFocus$Event$$Path$IncludeOuterElementsIfTargetInShadowDOM
           * - `event.currentTarget` (`this`) is a shadowRoot
           */ 
          , isNormalHost = !!(top = path && path[0]) && top !== window && top !== target
          , len = isNormalHost ? [].indexOf.call(path as EventPath, target) : 1;
        isNormalHost ? (target = top as Element) : (path = [(target as Element).shadowRoot as ShadowRoot]);
        const wrapper = onShadow;
        while (0 <= --len) {
          const root = (path as EventPath)[len];
          if (!(root instanceof ShadowRoot) || (root as ShadowRootEx).vimiumListened === ListenType.Full) { continue; }
          root.addEventListener("focus", wrapper, true);
          root.addEventListener("blur", wrapper, true);
          (root as ShadowRootEx).vimiumListened = ListenType.Full;
        }
      }
      if (VDom.getEditableType_(target)) {
        if (InsertMode.grabFocus_) {
          if (document.activeElement === target) {
            event.stopImmediatePropagation();
            (target as HTMLElement).blur();
          }
          return;
        }
        InsertMode.lock_ = target as HTMLElement;
        if (InsertMode.mutable_) {
          if (document.activeElement !== document.body) {
            InsertMode.last_ = target as HTMLElement;
          }
        }
      }
    }
    function onBlur(this: void, event: Event | FocusEvent): void {
      if (!isEnabled || event.isTrusted === false) { return; }
      const target = event.target as Window | Element | ShadowRootEx;
      if (target === window) { return onWndBlur(); }
      let path = event.path as EventPath | undefined, top: EventTarget | undefined
        , same = !(top = path && path[0]) || top === window || top === target
        , sr = (target as Element).shadowRoot;
      if (InsertMode.lock_ === (same ? target : top)) {
        InsertMode.lock_ = null;
        InsertMode.inputHint_ && !InsertMode.hinting_ && document.hasFocus() && InsertMode.exitInputHint_();
      }
      if (!(sr != null && sr instanceof ShadowRoot) || target === VDom.UI.box_) { return; }
      let wrapper = onShadow;
      if (same) {
        (sr as ShadowRootEx).vimiumListened = ListenType.Blur;
        return;
      }
      for (let len = [].indexOf.call(path as EventPath, target); 0 <= --len; ) {
        const root = (path as EventPath)[len];
        if (!(root instanceof ShadowRoot)) { continue; }
        root.removeEventListener("focus", wrapper, true);
        root.removeEventListener("blur", wrapper, true);
        (root as ShadowRootEx).vimiumListened = ListenType.None;
      }
    }
    function onActivate(event: UIEvent): void {
      if (event.isTrusted !== false) {
        VScroller.current_ = event.path ? event.path[0] as Element : event.target as Element;
      }
    }
    function onWndBlur(this: void): void {
      VScroller.keyIsDown_ = 0;
      const f = onWndBlur2;
      f && f();
      KeydownEvents = Object.create(null);
      (<RegExpOne> /a?/).test("");
      esc(HandlerResult.Suppress);
    }
    function onShadow(this: ShadowRootEx, event: FocusEvent): void {
      if (event.isTrusted === false) { return; }
      if (isEnabled && event.type === "focus") {
        return onFocus(event);
      }
      if (!isEnabled || this.vimiumListened === ListenType.Blur) {
        const r = this.removeEventListener.bind(this) as Element["removeEventListener"], f = onShadow;
        r("focus", f, true); r("blur", f, true);
        this.vimiumListened = ListenType.None;
      }
      if (isEnabled) {
        onBlur(event);
      }
    }

    const hook = (function(action: HookAction): void {
      let f = action ? removeEventListener : addEventListener;
      f("keydown", onKeydown, true);
      f("keyup", onKeyup, true);
      action !== HookAction.Suppress && f("focus", onFocus, true);
      f("blur", onBlur, true);
      notChrome ? f("click", onActivate, true) :
      f.call(document, "DOMActivate", onActivate, true);
    }),
  Commands: {
    [key in keyof CmdOptions]: (this: void, count: number, options: CmdOptions[key]) => void;
  } = {
    findMode: VFindMode.activate_,
    linkHints: VHints.activate,
    focusAndHint: VHints.ActivateAndFocus_,
    unhoverLast: VHints.UnhoverLast_,
    marks: VMarks.activate_,
    goToMarks: VMarks.GoTo_,
    scBy: VScroller.ScBy,
    scTo: VScroller.ScTo,
    visualMode: VVisualMode.activate_,
    vomnibar: Vomnibar.activate,
    reset (): void {
      const a = InsertMode;
      VScroller.current_ = VDom.lastHovered_ = a.last_ = a.lock_ = a.global_ = null;
      a.mutable_ = true;
      a.ExitGrab_(); VEventMode.setupSuppress_();
      VHints.isActive_ && VHints.clean_(); VVisualMode.deactivate_();
      VFindMode.init_ || VFindMode.toggleStyle_(0);
      onWndBlur();
    },

    toggleSwitchTemp (_0: number, options): void {
      const key = (options.key || "") + "" as keyof SettingsNS.FrontendSettingCache,
      cache = VSettings.cache, old = cache[key], Key = '"' + key + '"', last = "old" + key;
      let val = options.value, isBool = typeof val === "boolean", msg: string | undefined, u: undefined;
      if (!(key in cache)) {
        msg = 'unknown setting' + key;
      } else if (typeof old === "boolean") {
        isBool || (val = !old);
      } else if (isBool) {
        msg = Key + 'is not a boolean switch';
      } else if ((cache as Dict<any>)[last] === u) {
        (cache as Dict<any>)[last] = old;
      } else if (old === val) {
        val = (cache as Dict<any>)[last];
        (cache as Dict<any>)[last] = u;
      }
      if (!msg) {
        cache[key] = val;
        msg = val === false ? Key + " has been turned off"
          : "Now " + Key + (val === true ? " is on" : " use " + JSON.stringify(val));
      }
      return VHUD.showForDuration(msg, 1000);
    },
    insertMode (_0: number, opt: CmdOptions["insertMode"]): void {
      let { code, stat } = opt;
      InsertMode.global_ = opt;
      if (opt.hud) { return HUD.show_(`Insert mode${code ? `: ${code}/${stat}` : ""}`); }
    },
    passNextKey (count: number, options): void {
      const keys = Object.create<BOOL>(null);
      count = Math.abs(count);
      let keyCount = 0;
      if (options.normal) {
        const func = esc;
        esc = function(i?: HandlerResult): HandlerResult | void {
          if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.Suppress) {
            HUD.hide_();
            return (esc = func)(HandlerResult.Prevent);
          }
          currentKeys = ""; nextKeys = keyMap;
          HUD.show_("Normal mode (pass keys disabled)" + (count > 1 ? `: ${count} times` : ""));
          return i;
        } as EscF;
        return esc();
      }
      VUtils.push_(function(event) {
        keyCount += +!keys[event.keyCode];
        keys[event.keyCode] = 1;
        return HandlerResult.PassKey;
      }, keys);
      onKeyup2 = function(event: Pick<KeyboardEvent, "keyCode">): void {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event.keyCode] = 0;
          return HUD.show_(`Pass next ${count > 1 ? count + " keys." : "key."}`);
        }
        return (onWndBlur2 as () => void)();
      };
      onWndBlur2 = function(): void {
        onKeyup2 = null;
        VUtils.remove_(keys);
        onWndBlur2 = null;
        return HUD.hide_();
      };
      return onKeyup2({keyCode: VKeyCodes.None} as KeyboardEvent);
    },
    goNext (_0: number, {rel, patterns}: CmdOptions["goNext"]): void {
      if (!VDom.isHTML_() || Pagination.findAndFollowRel_(rel)) { return; }
      const isNext = rel === "next";
      if (patterns.length <= 0 || !Pagination.findAndFollowLink_(patterns, isNext ? "<" : ">")) {
        return VHUD.showForDuration("No links to go " + rel);
      }
    },
    reload (_0: number, {force, hard, url}: CmdOptions["reload"]): void {
      setTimeout(function() {
        url ? (window.location.href = url) : window.location.reload(hard || force);
      }, 17);
    },
    switchFocus (_0: number, options): void {
      let newEl = InsertMode.lock_;
      if (newEl) {
        if ((options.act || options.action) === "backspace") {
          if (VDom.view(newEl)) { document.execCommand("delete"); }
        } else {
          InsertMode.last_ = newEl;
          InsertMode.mutable_ = false;
          newEl.blur();
        }
        return;
      }
      newEl = InsertMode.last_;
      if (!newEl) {
        return HUD.showForDuration("Nothing was focused", 1200);
      }
      if (!VDom.view(newEl) && VDom.NotVisible_(newEl)) {
        return HUD.showForDuration("The last focused is hidden", 2000);
      }
      InsertMode.last_ = null;
      InsertMode.mutable_ = true;
      VDom.getZoom_(newEl);
      VDom.prepareCrop_();
      return VDom.UI.simulateSelect_(newEl, null, false, "", true);
    },
    goBack (count: number, options): void {
      const step = Math.min(Math.abs(count), history.length - 1);
      step > 0 && history.go((count < 0 ? -step : step) * (+options.dir || -1));
    },
    showHelp (msg?: number | "exitHD"): void {
      if (msg === "exitHD") { return; }
      let wantTop = window.innerWidth < 400 || window.innerHeight < 320;
      if (!VDom.isHTML_()) {
        if (window === window.top) { return; }
        wantTop = true;
      }
      post({ handler: "initHelp", wantTop });
    },
    autoCopy (_0: number, options): void {
      let str = VDom.UI.getSelectionText_(1);
      if (!str) {
        str = options.url ? window.location.href : document.title;
        (options.decoded || options.decode) && (str = VUtils.decodeURL_(str));
        if (str.endsWith(" ") && options.url) {
          str = str.slice(0, -1) + "%20";
        }
      }
      if (str.length < 4 && !str.trim() && str[0] === ' ') {
        str = "";
      } else {
        post({
          handler: "copy",
          data: str
        });
      }
      return HUD.showCopied(str);
    },
    autoOpen (_0: number, options): void {
      let url = VDom.UI.getSelectionText_(), keyword = (options.keyword || "") + "";
      url && VPort.evalIfOK_(url) || post({
        handler: "openUrl",
        copied: !url,
        keyword, url
      });
    },
    searchAs (): void {
      post({
        handler: "searchAs",
        url: window.location.href,
        search: VDom.UI.getSelectionText_()
      });
    },
    focusInput (count: number, options): void {
      InsertMode.inputHint_ && (InsertMode.inputHint_.hints = null as never);
      const arr: ViewOffset = VDom.getViewBox_();
      VDom.prepareCrop_();
      const visibleInputs = VHints.traverse_("*", VHints.GetEditable_, true),
      action = options.select;
      let sel = visibleInputs.length;
      if (sel === 0) {
        InsertMode.exitInputHint_();
        return HUD.showForDuration("There are no inputs to focus.", 1000);
      } else if (sel === 1) {
        InsertMode.exitInputHint_();
        return VDom.UI.simulateSelect_(visibleInputs[0][0], visibleInputs[0][1], true, action, true);
      }
      for (let ind = 0; ind < sel; ind++) {
        const hint = visibleInputs[ind], j = hint[0].tabIndex;
        hint[2] = j > 0 ? ind / 8192 - j : ind;
      }
      const hints = visibleInputs.sort(function(a, b) { return a[2] - b[2]; }).map(function(link): HintsNS.HintItem {
        const marker = VDom.createElement_("span") as HintsNS.HintItem["marker"],
        rect = VDom.fromClientRect_(link[0].getBoundingClientRect());
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
      const box = VDom.UI.addElementList_(hints, arr), keep = !!options.keep, pass = !!options.passExitKey;
      // delay exiting the old to avoid some layout actions
      // although old elements can not be GC-ed before this line, it has little influence
      InsertMode.exitInputHint_();
      InsertMode.inputHint_ = { box, hints };
      VUtils.push_(function(event) {
        const { keyCode } = event;
        if (keyCode === VKeyCodes.tab) {
          const hints = this.hints, oldSel = sel;
          sel = (oldSel + (event.shiftKey ? -1 : 1)) % hints.length;
          InsertMode.hinting_ = true;
          VDom.UI.simulateSelect_(hints[sel].target, null, false, action);
          hints[oldSel].marker.classList.remove("S", "IHS");
          hints[sel].marker.classList.add("S", "IHS");
          InsertMode.hinting_ = false;
          return HandlerResult.Prevent;
        }
        let keyStat: KeyStat;
        if (keyCode === VKeyCodes.shiftKey || keep && (keyCode === VKeyCodes.altKey
            || keyCode === VKeyCodes.ctrlKey || keyCode === VKeyCodes.metaKey)) {}
        else if (event.repeat) { return HandlerResult.Nothing; }
        else if (keep ? VKeyboard.isEscape_(event) || (
            keyCode === VKeyCodes.enter && (keyStat = VKeyboard.getKeyStat_(event),
              keyStat !== KeyStat.shiftKey && (keyStat !== KeyStat.plain || this.hints[sel].target instanceof HTMLInputElement) )
          ) : keyCode !== VKeyCodes.ime && keyCode !== VKeyCodes.f12
        ) {
          InsertMode.exitInputHint_();
          return !VKeyboard.isEscape_(event) ? HandlerResult.Nothing : keep || !InsertMode.lock_ ? HandlerResult.Prevent
            : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
        }
        return HandlerResult.Nothing;
      }, InsertMode.inputHint_);
    }
  },

  InsertMode = {
    grabFocus_: document.readyState !== "complete",
    global_: null as CmdOptions["insertMode"] | null,
    hinting_: false,
    inputHint_: null as { box: HTMLDivElement, hints: HintsNS.HintItem[] } | null,
    suppressType_: null as string | null,
    last_: null as LockableElement | null,
    lock_: null as LockableElement | null,
    mutable_: true,
    init_ (): void {
      /** if `notBody` then `activeEl` is not null  */
      let activeEl = document.activeElement as Element, notBody = activeEl !== document.body;
      KeydownEvents = Object.create(null);
      if (VSettings.cache.grabFocus && this.grabFocus_) {
        if (notBody) {
          this.last_ = null;
          activeEl.blur && activeEl.blur();
          notBody = (activeEl = document.activeElement as Element) !== document.body;
        }
        if (!notBody) {
          VUtils.push_(this.ExitGrab_, this);
          addEventListener("mousedown", this.ExitGrab_, true);
          return;
        }
      }
      this.grabFocus_ = false;
      if (notBody && VDom.getEditableType_(activeEl)) {
        this.lock_ = activeEl as HTMLElement;
      }
    },
    ExitGrab_: function (this: void, event?: Req.fg<"exitGrab"> | MouseEvent | KeyboardEvent): HandlerResult.Nothing | void {
      const _this = InsertMode;
      if (!_this.grabFocus_) { return; }
      _this.grabFocus_ = false;
      removeEventListener("mousedown", _this.ExitGrab_, true);
      VUtils.remove_(_this);
      // it's okay to not set the userActed flag if there's only the top frame,
      !(event instanceof Event) || !(window.frames && (frames as Window[]).length) && window === window.top ||
      vPort.SafePost_({ handler: "exitGrab" });
      if (event instanceof KeyboardEvent) { return HandlerResult.Nothing; }
    } as {
      (this: void, event: KeyboardEvent): HandlerResult.Nothing;
      (this: void, request: Req.bg<"exitGrab">): void;
      (this: void, event?: MouseEvent): void;
    },
    isActive_ (): boolean {
      if (this.suppressType_) { return false; }
      if (this.lock_ !== null || this.global_) {
        return true;
      }
      let el = document.activeElement;
      if (el && (el as HTMLElement).isContentEditable === true && el instanceof HTMLElement) {
        this.lock_ = el;
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
        const parent = el.ownerDocument.defaultView, a = (parent as Window & { VEventMode: typeof VEventMode }).VEventMode;
        el.blur && el.blur();
        if (a) {
          (parent as Window & { VDom: typeof VDom }).VDom.UI.suppressTail_(true);
          a.focus_({ key, mask: FrameMaskType.ForcedSelf });
        } else {
          parent.focus();
        }
      } else if (KeydownEvents[key] !== 2) { // avoid sending too many messages
        post({ handler: "nextFrame", type: Frames.NextType.parent, key });
        KeydownEvents[key] = 2;
      }
    },
    exit_ (event: KeyboardEvent): void {
      let target: Element | null = event.target as Element;
      if ((target as HTMLElement).shadowRoot != null && (target as HTMLElement).shadowRoot instanceof ShadowRoot) {
        if (target = this.lock_) {
          this.lock_ = null;
          (target as HTMLElement).blur();
        }
      } else if (target === this.lock_ ? (this.lock_ = null, 1) : VDom.getEditableType_(target)) {
        (target as HTMLElement).blur();
      }
      if (this.global_) {
        this.lock_ = null; this.global_ = null;
        HUD.hide_();
      }
    },
    onExitSuppress_: null as ((this: void) => void) | null,
    exitInputHint_ (): void {
      let hint = this.inputHint_;
      if (!hint) { return; }
      this.inputHint_ = null;
      hint.box.remove();
      VUtils.remove_(hint);
    }
  },

Pagination = {
  followLink_ (linkElement: Element): boolean {
    let url = linkElement instanceof HTMLLinkElement && linkElement.href;
    if (url) {
      Commands.reload(1, { url });
    } else {
      VDom.view(linkElement);
      VDom.UI.flash_(linkElement);
      setTimeout(function() { VDom.UI.click_(linkElement); }, 100);
    }
    return true;
  },
  GetLinks_ (this: HTMLElement[], element: Element): void {
    if (!(element instanceof HTMLElement) || element instanceof HTMLFormElement) { return; }
    let s: string | null;
    const isClickable = element instanceof HTMLAnchorElement || (
      element instanceof HTMLButtonElement ? !element.disabled
      : element.vimiumHasOnclick || element.getAttribute("onclick") || (
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
    const count = names.length, links = VHints.traverse_("*", this.GetLinks_, true, document);
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
            len < maxLen && (maxLen = len + 1);
            candidates.push([(i << 23) + (len << 16) + candidates.length, s, link]);
          }
          break;
        }
      }
    }
    if (candidates.length <= 0) { return false; }
    maxLen = (maxLen + 1) << 16;
    candidates = candidates.filter(a => (a[0] & 0x7fffff) < maxLen).sort((a, b) => a[0] - b[0]);
    for (let re2 = <RegExpOne> /\b/, i = candidates[0][0] >>> 23; i < count; ) {
      s = names[i++];
      const re = new RegExp(re2.test(s[0]) || re2.test(s.slice(-1)) ? `\\b${s}\\b` : s, ""), j = i << 23;
      for (const cand of candidates) {
        if (cand[0] > j) { break; }
        if (re.test(cand[1])) { return this.followLink_(cand[2]); }
      }
    }
    return false;
  },
  findAndFollowRel_ (relName: string): boolean {
    const elements = document.querySelectorAll("[rel]"),
    relTags = VUtils.safer_({a: 1, area: 1, link: 1});
    let s: string | null;
    for (let _i = 0, _len = elements.length, re1 = <RegExpOne> /\s+/; _i < _len; _i++) {
      const element = elements[_i];
      if (!(element instanceof HTMLFormElement) && (element.tagName.toLowerCase() in relTags)
          && element instanceof HTMLElement
          && (s = (element as HTMLAnchorElement | HTMLAreaElement | HTMLLinkElement).rel)
          && s.trim().toLowerCase().split(re1).indexOf(relName) >= 0) {
        return this.followLink_(element);
      }
    }
    return false;
  }
},
  FrameMask = {
    more_: false,
    node_: null as HTMLDivElement | null,
    timer_: 0,
    Focus_ (this: void, { mask, CSS, key }: BgReq["focusFrame"]): void {
      CSS && VDom.UI.css_(CSS);
      if (mask !== FrameMaskType.NormalNext) {}
      else if (window.innerWidth < 3 || window.innerHeight < 3
        || document.body instanceof HTMLFrameSetElement
        || FrameMask.hidden_()) {
        post({
          handler: "nextFrame",
          key
        });
        return;
      }
      VEventMode.focusAndListen_();
      esc();
      VEventMode.suppress_(key);
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
      VDom.UI.addElement_(dom1);
    },
    hidden_ (): boolean {
      let el = VDom.parentFrame_();
      if (!el) { return false; }
      let box = el.getBoundingClientRect();
      return box.height < 1 || box.width < 1 || getComputedStyle(el).visibility === "hidden";
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
    showCopied: function (this: VHUD, text: string, e?: string, virtual?: true): string | void {
      if (!text) {
        if (virtual) { return text; }
        return this.showForDuration(`No ${e || "text"} found!`, 1000);
      }
      if (text.startsWith("chrome-") && text.indexOf("://") > 0) {
        text = text.substring(text.indexOf('/', text.indexOf('/') + 2)) || text;
      }
      text = "Copied: " + (text.length > 41 ? text.substring(0, 41) + "\u2026" : text + ".");
      if (virtual) { return text; }
      return this.showForDuration(text, 2000);
    } as VHUD["showCopied"],
    showForDuration (text: string, duration?: number): void {
      this.show_(text);
      this.text_ && ((this as typeof HUD)._timer = setTimeout(this.hide_, duration || 1500));
    },
    show_ (text: string, embed?: boolean): void {
      if (!this.enabled_ || !VDom.isHTML_()) { return; }
      this.opacity_ = 1; this.text_ = text;
      if (this._timer) { clearTimeout(this._timer); this._timer = 0; }
      let el = this.box_;
      if (el && (embed || el.style.opacity === "")) {
        el.style.cssText = "";
        (el.firstChild as Text).data = text;
        return;
      }
      embed || this._tweenId || (this._tweenId = setInterval(this._tween, 40));
      if (el) { return; }
      el = VDom.createElement_("div");
      el.className = "R HUD";
      el.textContent = text;
      if (!embed) {
        const st = el.style;
        st.opacity = "0";
        st.visibility = "hidden";
        VDom.UI.box_ || VDom.UI.ensureBorder_();
      }
      VDom.UI.addElement_(this.box_ = el, AdjustType.NotAdjust, VHints.box_);
    },
    _tween (this: void, info?: TimerType): void {
      if (!VPort) { return; }
      const hud = HUD, el = hud.box_ as HTMLDivElement, st = el.style, fake = info === TimerType.fake;
      let opacity = fake ? 0 : +(st.opacity || 1);
      if (opacity === hud.opacity_) {}
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
      st.opacity = opacity < 1 ? opacity as number | string as string : "";
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
      if (!hud.box_) {}
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
  requestHandlers: { [K in keyof BgReq]: (this: void, request: BgReq[K]) => void } = {
    init (request): void {
      const r = requestHandlers, {load, flags} = request;
      load.browser = notChrome ? (window as any).StyleMedia ? BrowserType.Edge : BrowserType.Firefox : BrowserType.Chrome;
      (VSettings.cache = load).onMac && (VKeyboard.correctionMap_ = Object.create<string>(null));
      VDom.specialZoom_ = !notChrome && load.browserVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl;
      r.keyMap(request);
      if (flags) {
        InsertMode.grabFocus_ = !(flags & Frames.Flags.userActed);
        isLocked = !!(flags & Frames.Flags.locked);
      }
      (r as { reset (request: BgReq["reset"], initing?: 1): void }).reset(request, 1);
      if (isEnabled) {
        InsertMode.init_();
      } else {
        InsertMode.grabFocus_ = false;
        hook(HookAction.Suppress);
        VSettings.uninit_ && VSettings.uninit_(HookAction.Suppress);
      }
      r.init = null as never;
      return VDom.DocReady(function (): void {
        HUD.enabled_ = true;
        onWndFocus = vPort.SafePost_.bind(vPort, { handler: "focus" });
      });
    },
    reset (request: BgReq["reset"], initing?: 1): void {
      const newPassKeys = request.passKeys, enabled = newPassKeys !== "", old = VSettings.enabled_;
      passKeys = (newPassKeys && parsePassKeys(newPassKeys)) as SafeDict<true> | null;
      VSettings.enabled_ = isEnabled = enabled;
      if (initing) {
        return;
      }
      isLocked = !!request.forced;
      // if true, recover listeners on shadow roots;
      // otherwise listeners on shadow roots will be removed on next blur events
      if (enabled) {
        old || InsertMode.init_();
        (old && !isLocked) || hook(HookAction.Install);
        // here should not return even if old - a url change may mean the fullscreen mode is changed
      } else {
        (Commands.reset as () => void)();
      }
      if (VDom.UI.box_) { return VDom.UI.toggle_(enabled); }
    },
    url (this: void, request: BgReq["url"]): void {
      delete (request as Req.bg<"url">).name;
      request.url = window.location.href;
      post(request);
    },
    eval (options: BgReq["eval"]): void { VPort.evalIfOK_(options.url); },
    settingsUpdate ({ delta }): void {
      type Keys = keyof SettingsNS.FrontendSettings;
      VUtils.safer_(delta);
      for (const i in delta) {
        VSettings.cache[i as Keys] = delta[i as Keys] as SettingsNS.FrontendSettings[Keys];
      }
    },
    focusFrame: FrameMask.Focus_,
    exitGrab: InsertMode.ExitGrab_ as (this: void, request: Req.bg<"exitGrab">) => void,
    keyMap (request): void {
      const map = keyMap = request.keyMap, func = Object.setPrototypeOf;
      func(map, null);
      function iter(obj: ReadonlyChildKeyMap): void {
        func(obj, null);
        for (const key in obj) { if (obj[key] !== 0) {
          iter(obj[key] as ReadonlyChildKeyMap);
        } }
      }
      for (const key in map) {
        const sec = map[key];
        if (sec === 0 || sec === 1) { continue; }
        iter(sec as ReadonlyChildKeyMap);
      }
      (mapKeys = request.mapKeys) && func(mapKeys, null);
    },
    execute<O extends keyof CmdOptions> (request: Req.FgCmd<O>): void {
      if (request.CSS) { VDom.UI.css_(request.CSS); }
      const options: CmdOptions[O] | null = request.options;
      (Commands[request.command] as (c: number, o: CmdOptions[O]) => void
        )(request.count, (options ? VUtils.safer_(options) : Object.create(null)) as CmdOptions[O]);
    },
    createMark (request): void { return VMarks.createMark_(request.markName); },
    showHUD ({ text, CSS, isCopy }: Req.bg<"showHUD">): void {
      if (CSS) { VDom.UI.css_(CSS); }
      return text ? isCopy ? HUD.showCopied(text) : HUD.showForDuration(text) : void 0;
    },
    count (request): void {
      const count = parseInt(currentKeys, 10) || 1;
      post({ handler: "cmd", cmd: request.cmd, count, id: request.id});
    },
  showHelpDialog ({ html, advanced: shouldShowAdvanced, optionUrl, CSS }: Req.bg<"showHelpDialog">): void {
    let box: HTMLElement, oldShowHelp = Commands.showHelp, hide: (this: void, e?: Event | number | "exitHD") => void
      , node1: HTMLElement;
    if (CSS) { VDom.UI.css_(CSS); }
    if (!VDom.isHTML_()) { return; }
    (Commands.showHelp as (msg?: number | "exitHD") => void)("exitHD");
    if (oldShowHelp !== Commands.showHelp) { return; } // an old dialog exits
    box = VDom.createElement_("div");
    box.className = "R Scroll UI";
    box.id = "HelpDialog";
    box.innerHTML = html;
    box.onclick = VUtils.Stop_;
    for (let i of ["mousedown", "mouseup", "wheel", "contextmenu"]) {
      // note: if wheel is listened, then mousewheel won't be dispatched even on Chrome 35
      VUtils.suppressAll_(box, i);
    }
    VSettings.cache.browserVer < BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToDocument ||
    box.addEventListener(notChrome ? "click" : "DOMActivate", onActivate, true);

    const closeBtn = box.querySelector("#HClose") as HTMLElement;
    hide = function(event): void {
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
      Commands.showHelp = oldShowHelp;
    };
    closeBtn.onclick = Commands.showHelp = hide;
    node1 = box.querySelector("#OptionsPage") as HTMLAnchorElement;
    if (! window.location.href.startsWith(optionUrl)) {
      (node1 as HTMLAnchorElement).href = optionUrl;
      node1.onclick = function(event) {
        post({ handler: "focusOrLaunch", url: optionUrl });
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
    node1.onclick = function(event) {
      event.preventDefault();
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      (post as <K extends keyof SettingsNS.FrontUpdateAllowedSettings>(this: void, req: SetSettingReq<K>) => 1)({
        handler: "setSetting",
        key: "showAdvancedCommands",
        value: shouldShowAdvanced
      });
    };
    shouldShowAdvanced && toggleAdvanced();
    if (VSettings.cache.browserVer < BrowserVer.MinFixedCSS$All$MayMistakenlyResetFixedPosition) {
      box.style.position = "fixed";
    }
    VDom.UI.ensureBorder_();
    VDom.UI.addElement_(box, AdjustType.Normal, true);
    document.hasFocus() || VEventMode.focusAndListen_();
    VScroller.current_ = box;
    VUtils.push_(function(event) {
      if (!InsertMode.lock_ && VKeyboard.isEscape_(event)) {
        VDom.UI.removeSelection_(VDom.UI.R) || hide();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    }, box);
    if (Vomnibar.status_ >= VomnibarNS.Status.Showing) {
      VUtils.remove_(Vomnibar);
      VUtils.push_(Vomnibar.onKeydown_, Vomnibar);
    }
  }
  };

  function parsePassKeys(newPassKeys: string): SafeDict<true> {
    const pass = Object.create<true>(null);
    for (const ch of newPassKeys.split(' ')) {
      pass[ch] = true;
    }
    return pass;
  }

  function checkValidKey(event: KeyboardEvent, key: string): HandlerResult.Nothing | HandlerResult.Prevent {
    key = VKeyboard.key(event, key);
    mapKeys !== null && (key = mapKeys[key] || key);
    let j = (nextKeys || keyMap)[key];
    if (nextKeys === null) {
      if (j == null || passKeys !== null && key in passKeys) { return HandlerResult.Nothing; }
    } else if (j == null) {
      j = keyMap[key];
      if (j == null) { return esc(HandlerResult.Nothing); }
      if (j !== 0) { currentKeys = ""; }
    }
    currentKeys += key;
    if (j === 0) {
      post({ handler: "key", key: currentKeys, lastKey: event.keyCode });
      return esc(HandlerResult.Prevent);
    } else {
      nextKeys = j !== 1 ? j : keyMap;
      return HandlerResult.Prevent;
    }
  }

  VPort = {
    post, send_: send,
    evalIfOK_ (url: string): boolean {
      if (!VUtils.jsRe_.test(url)) {
        return false;
      }
      if (";".indexOf(url.substring(11).trim()) >= 0) {
      } else if (VDom.Scripts) setTimeout(function(): void {
        const script = VDom.createElement_("script");
        script.type = "text/javascript";
        script.textContent = VUtils.decodeURL_(url).substring(11).trim();
        (document.documentElement as HTMLElement).appendChild(script);
        script.remove();
      }, 0); else {
        HUD.showForDuration("Here's not allowed to eval scripts");
      }
      return true;
    }
  };
  VHUD = HUD;

  VEventMode = {
    lock_ (this: void): Element | null { return InsertMode.lock_; },
    onWndBlur_ (this: void, f): void { onWndBlur2 = f; },
    OnWndFocus_ (this: void): void { return onWndFocus(); },
    focusAndListen_ (callback?: (() => void) | null, timedout?: 0 | 1): void {
      if (timedout !== 1) {
        setTimeout(function(): void { VEventMode.focusAndListen_(callback, 1 as number as 0); }, 1);
        return;
      }
      InsertMode.ExitGrab_();
      let old = onWndFocus, failed = true;
      onWndFocus = function(): void { failed = false; };
      window.focus();
      failed && isEnabled && hook(HookAction.Install);
      // the line below is always necessary: see https://github.com/philc/vimium/issues/2551#issuecomment-316113725
      (onWndFocus = old)();
      if (callback && esc) {
        return callback();
      }
    },
    focus_: FrameMask.Focus_,
    mapKey_ (this: void, key): string { return mapKeys !== null && mapKeys[key] || key; },
    scroll_ (this: void, event, wnd): void {
      if (!event || event.shiftKey || event.altKey) { return; }
      const { keyCode } = event as { keyCode: number }, c = (keyCode & 1) as BOOL;
      if (!(keyCode > VKeyCodes.maxNotPageUp && keyCode < VKeyCodes.minNotDown)) { return; }
      wnd && VSettings.cache.smoothScroll && VEventMode.OnScrolls_[1](wnd, 1);
      if (keyCode > VKeyCodes.maxNotLeft) {
        return VScroller.scrollBy_((1 - c) as BOOL, keyCode < VKeyCodes.minNotUp ? -1 : 1, 0);
      } else if (keyCode > VKeyCodes.maxNotEnd) {
        return VScroller.scrollTo_(1, 0, c);
      } else if (!(event.ctrlKey || event.metaKey)) {
        return VScroller.scrollBy_(1, 0.5 - c, "viewSize");
      }
    },
    OnScrolls_: [function (event): BOOL | 28 {
      if (event.repeat) {
        VUtils.prevent_(event);
        return (VScroller.keyIsDown_ = VScroller.maxInterval_) as 1 | 28;
      } else if (this !== VEventMode.OnScrolls_) {
        VEventMode.OnScrolls_[1](this);
      } else {
        VScroller.keyIsDown_ = 0;
      }
      return 0;
    }, function (this: VEventMode["OnScrolls_"], wnd, interval): void {
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
        VEventMode.OnScrolls_[1](this);
      }
    }],
    setupSuppress_ (this: void, onExit): void {
      const mode = InsertMode, f = mode.onExitSuppress_;
      mode.onExitSuppress_ = mode.suppressType_ = null;
      if (onExit) {
        mode.suppressType_ = VDom.selType_();
        mode.onExitSuppress_ = onExit;
      }
      if (f) { return f(); }
    },
    suppress_ (this: void, key?: VKeyCodes): void { key && (KeydownEvents[key] = 1); },
    keydownEvents: function (this: void, arr?: KeydownCacheArray): KeydownCacheArray | boolean {
      if (!arr) { return KeydownEvents; }
      return !isEnabled || !(KeydownEvents = arr);
    } as VEventMode["keydownEvents"]
  };

  VSettings = {
    enabled_: false,
    cache: null as never as VSettings["cache"],
    uninit_: null,
  destroy_: function(silent): void {
    VSettings.enabled_ = isEnabled = false;
    hook(HookAction.Destroy);
    
    (Commands.reset as () => void)();
    let f = VSettings.uninit_, ui = VDom.UI;
    f && f(HookAction.Destroy);

    VUtils = VKeyboard = VDom = VDom = VUtils = //
    VHints = Vomnibar = VScroller = VMarks = VFindMode = //
    VSettings = VHUD = VPort = VEventMode = VVisualMode = //
    esc = null as never;
    ui.box_ && ui.toggle_(false);

    silent || console.log("%cVimium C%c in %o has been destroyed at %o."
      , "color:red", "color:auto"
      , window.location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
      , Date.now());

    if (vPort._port) { try { vPort._port.disconnect(); } catch (e) {} }
    (<RegExpOne> /a?/).test("");
  }
  };
  if (isInjected) {
    VimiumInjector.checkIfEnabled = vPort.SafePost_ as any;
    VimiumInjector.getCommandCount = function (this: void): number { return currentKeys !== "-" ? parseInt(currentKeys, 10) || 1 : -1; };
  }

  // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
  hook(HookAction.Install);
  if (location.href !== "about:blank" || isInjected) {
    vPort.Connect_(PortType.initing);
  } else (function() {
    try {
      let f = VDom.parentFrame_(),
      a = f && ((f as HTMLElement).ownerDocument.defaultView as Window & { VFindMode?: typeof VFindMode}).VFindMode;
      if (a && a.box_ && a.box_ === f) {
        VSettings.destroy_(true);
        a.onLoad_(a.box_);
        return; // not return a function's result so that logic is clearer for compiler
      }
    } catch (e) {}
    vPort.Connect_(PortType.initing);
  })();
})();
