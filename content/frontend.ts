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
  const enum HookAction {
    Install = 0,
    Suppress = 1,
    Destroy = 2,
  }

  var KeydownEvents: KeydownCacheArray, keyMap: KeyMap
    , currentKeys = "", isEnabledForUrl = false, isLocked = false
    , mapKeys = null as SafeDict<string> | null, nextKeys = null as KeyMap | ReadonlyChildKeyMap | null
    , esc = function(i?: HandlerResult): HandlerResult | void { currentKeys = ""; nextKeys = null; return i; } as EscF
    , onKeyup2 = null as ((this: void, event: KeyboardEvent) => void) | null, passKeys = null as SafeDict<true> | null;

  const isInjected = window.VimiumInjector ? true : null,
  vPort = {
    port: null as Port | null,
    _callbacks: Object.create(null) as { [msgId: number]: <K extends keyof FgRes>(this: void, res: FgRes[K]) => void },
    _id: 1,
    post: function<K extends keyof FgReq> (this: void, request: FgReq[K] & Req.baseFg<K>): 1 {
      return (vPort.port as Port).postMessage(request);
    } as VPort["post"],
    send: function<K extends keyof FgRes> (this: void, request: FgReq[K] & Req.baseFg<K>
        , callback: (this: void, res: FgRes[K]) => void): void {
      let id = ++vPort._id;
      (vPort.port as Port).postMessage({_msgId: id, request: request});
      vPort._callbacks[id] = callback;
    } as VPort["send"],
    safePost<K extends keyof FgReq> (request: FgReq[K] & Req.baseFg<K>): void {
      try {
        if (!this.port) {
          this.connect((isEnabledForUrl ? passKeys ? PortType.knownPartial : PortType.knownEnabled : PortType.knownDisabled)
            + (isLocked ? PortType.isLocked : 0) + (VDom.UI.styleIn ? PortType.hasCSS : 0));
          isInjected && setTimeout(this.TestAlive, 50);
        }
        (this.port as Port).postMessage(request);
      } catch (e) { // this extension is reloaded or disabled
        VSettings.destroy();
      }
    },
    Listener<K extends keyof FgRes, T extends keyof BgReq> (this: void
        , response: Req.res<K> | (Req.bg<T> & { _msgId?: undefined; })): void {
      let id: number | undefined;
      if (id = response._msgId) {
        const arr = vPort._callbacks, handler = arr[id];
        delete arr[id];
        return handler((response as Req.res<K>).response);
      } else {
        return requestHandlers[(response as Req.bg<T>).name as T](response as Req.bg<T>);
      }
    },
    TestAlive (): void { esc && !vPort.port && VSettings.destroy(); },
    ClearPort (this: void): void {
      vPort.port = null;
      requestHandlers.init && setTimeout(function(): void {
        try { esc && vPort.connect(PortType.initing); } catch(e) { VSettings.destroy(); }
      }, 2000);
    },
    connect (status: PortType): void {
      const data = { name: "vimium++." + (PortType.isTop * +(window.top === window) + PortType.hasFocus * +document.hasFocus() + status) },
      port = this.port = isInjected ? chrome.runtime.connect(VimiumInjector.id, data) as Port
        : chrome.runtime.connect(data) as Port;
      port.onDisconnect.addListener(this.ClearPort);
      port.onMessage.addListener(this.Listener);
    }
  },

  ELs = { //
    onKeydown (event: KeyboardEvent): void {
      if (!isEnabledForUrl || event.isTrusted == false || !(event instanceof KeyboardEvent)) { return; }
      if (VScroller.keyIsDown && VEventMode.OnScrolls[0](event)) { return; }
      let keyChar: string, key = event.keyCode, action: HandlerResult;
      if (action = VUtils.bubbleEvent(event)) {}
      else if (InsertMode.isActive()) {
        const g = InsertMode.global;
        if (g ? !g.code ? VKeyboard.isEscape(event)
              : key === g.code && VKeyboard.getKeyStat(event) === g.stat
            : VKeyboard.isEscape(event)
              || (key > VKeyCodes.maxNotFn && (keyChar = VKeyboard.getKeyName(event)) &&
                (action = checkValidKey(event, keyChar)), false)
        ) {
          if (InsertMode.lock === document.body && InsertMode.lock) {
            action = event.repeat ? InsertMode.focusUpper(key, true) : HandlerResult.Nothing;
          } else {
            action = g && g.passExitKey ? HandlerResult.Nothing : HandlerResult.Prevent;
            InsertMode.exit(event);
          }
        }
      }
      else if (key > VKeyCodes.maxNotPrintable || key === VKeyCodes.backspace || key === VKeyCodes.tab || key === VKeyCodes.enter) {
        if (keyChar = VKeyboard.getKeyChar(event)) {
          action = checkValidKey(event, keyChar);
          if (action === HandlerResult.Nothing && InsertMode.suppressType && keyChar.length === 1) {
            action = HandlerResult.Prevent;
          }
        }
      }
      else if (key !== VKeyCodes.esc || VKeyboard.getKeyStat(event)) {}
      else if (nextKeys !== null) {
        esc(HandlerResult.Suppress);
        action = HandlerResult.Prevent;
      } else if (VDom.UI.removeSelection()) {
        action = HandlerResult.Prevent;
      } else if (window.top !== window && document.activeElement === document.body) {
        action = InsertMode.focusUpper(key, event.repeat);
      } else if (event.repeat) {
        let c = document.activeElement; c && c.blur && c.blur();
      }
      if (action < HandlerResult.MinStopOrPreventEvents) { return; }
      if (action > HandlerResult.MaxNotPrevent) {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      KeydownEvents[key] = 1;
    },
    onKeyup (event: KeyboardEvent): void {
      if (!isEnabledForUrl || event.isTrusted == false || !(event instanceof KeyboardEvent)) { return; }
      VScroller.keyIsDown = 0;
      if (InsertMode.suppressType && VDom.selType() !== InsertMode.suppressType) {
        VEventMode.setupSuppress();
      }
      if (KeydownEvents[event.keyCode]) {
        KeydownEvents[event.keyCode] = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (onKeyup2) {
        return onKeyup2(event);
      }
    },
    onFocus (this: void, event: Event | FocusEvent): void {
      if (event.isTrusted == false) { return; }
      // on Firefox, target may also be `document`
      let target = event.target as EventTarget | Element | (Document & { shadowRoot: undefined });
      if (target === window) {
        return ELs.OnWndFocus();
      }
      if (!isEnabledForUrl) { return; }
      if (target === VDom.UI.box) { return event.stopImmediatePropagation(); }
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
      let a = InsertMode.lock;
      if (a !== null && a === document.activeElement) { return; }
      if ((target as Element).shadowRoot != null) {
        let path = event.path, top: EventTarget | undefined
          /**
           * isNormalHost is true if one of:
           * - Chrome is since BrowserVer.Min$Event$$Path$IncludeNodesInShadowRoot
           * - `event.currentTarget` (`this`) is a shadowRoot
           */ 
          , isNormalHost = !!(top = path && path[0]) && top !== window && top !== target
          , len = isNormalHost ? [].indexOf.call(path as EventPath, target) : 1;
        isNormalHost ? (target = top as Element) : (path = [(target as Element).shadowRoot as ShadowRoot]);
        const wrapper = ELs.wrap();
        while (0 <= --len) {
          const root = (path as EventPath)[len];
          if (!(root instanceof ShadowRoot) || (root as ShadowRootEx).vimiumListened === ListenType.Full) { continue; }
          root.addEventListener("focus", wrapper, true);
          root.addEventListener("blur", wrapper, true);
          (root as ShadowRootEx).vimiumListened = ListenType.Full;
        }
      }
      if (VDom.getEditableType(target)) {
        if (InsertMode.grabFocus) {
          if (document.activeElement === target) {
            event.stopImmediatePropagation();
            (target as HTMLElement).blur();
          }
          return;
        }
        InsertMode.lock = target as HTMLElement;
        if (InsertMode.mutable) {
          InsertMode.last = target as HTMLElement;
        }
      }
    },
    onBlur (this: void, event: Event | FocusEvent): void {
      if (!isEnabledForUrl || event.isTrusted == false) { return; }
      const target = event.target as Window | Element | ShadowRootEx;
      if (target === window) { return ELs.OnWndBlur(); }
      let path = event.path as EventPath | undefined, top: EventTarget | undefined
        , same = !(top = path && path[0]) || top === window || top === target
        , sr = (target as Element).shadowRoot;
      if (InsertMode.lock === (same ? target : top)) { InsertMode.lock = null; }
      if (!(sr !== null && sr instanceof ShadowRoot) || target === VDom.UI.box) { return; }
      let wrapper = ELs.wrap();
      if (same) {
        (sr as ShadowRootEx).vimiumListened = ListenType.Blur;
        sr.removeEventListener("focus", wrapper, true);
        return;
      }
      for (let len = [].indexOf.call(path as EventPath, target); 0 <= --len; ) {
        const root = (path as EventPath)[len];
        if (!(root instanceof ShadowRoot)) { continue; }
        root.removeEventListener("focus", wrapper, true);
        root.removeEventListener("blur", wrapper, true);
        (root as ShadowRootEx).vimiumListened = ListenType.None;
      }
    },
    OnShadowBlur (this: void, event: Event): void {
      if (event.isTrusted == false) { return; }
      const cur = event.currentTarget as ShadowRootEx;
      if (cur.vimiumListened === ListenType.Blur) {
        cur.vimiumListened = ListenType.None;
        cur.removeEventListener("blur", ELs.wrap(), true);
      }
      return ELs.onBlur(event);
    },
    onActivate (event: UIEvent): void {
      VScroller.current = (event.path as EventPath)[0] as Element;
    },
    OnWndFocus (this: void): void {},
    OnWndBlur (this: void): void {
      VScroller.keyIsDown = 0;
      const f = ELs.OnWndBlur2;
      f && f();
      KeydownEvents = Object.create(null);
      (<RegExpOne> /a?/).test("");
      esc(HandlerResult.Suppress);
    },
    OnWndBlur2: null as ((this: void) => void) | null,
    OnReady (): void {
      HUD.enabled = true;
      ELs.OnWndFocus = vPort.safePost.bind(vPort, { handler: "focus" });
    },
    wrapper: null as FocusListenerWrapper | null,
    wrap (this: void): FocusListenerWrapper["outer"] {
      const a = ELs;
      return (a.wrapper || (a.wrapper = VUtils.wrap(a.onFocus, a.OnShadowBlur))).outer;
    },
    hook (action: HookAction): void {
      let f = action ? removeEventListener : addEventListener;
      f("keydown", this.onKeydown, true);
      f("keyup", this.onKeyup, true);
      action !== HookAction.Suppress && f("focus", this.onFocus, true);
      f("blur", this.onBlur, true);
      f.call(document, "DOMActivate", ELs.onActivate, true);
    }
  },

  Commands = {
    Find: VFindMode,
    Hints: VHints,
    Marks: VMarks,
    scBy: VScroller.ScBy,
    scTo: VScroller.ScTo,
    Visual: VVisualMode,
    Vomnibar,
    reset (): void {
      const a = InsertMode, b = ELs.wrapper;
      VScroller.current = VDom.lastHovered = a.last = a.lock = a.global = null;
      a.mutable = true;
      b && b.set(null); // so that listeners on shadow roots will be removed on next blur events
      a.ExitGrab(); VEventMode.setupSuppress();
      VHints.isActive && VHints.clean(); VVisualMode.deactivate();
      VFindMode.init || VFindMode.toggleStyle(0);
      return ELs.OnWndBlur();
    },

    toggleSwitchTemp (_0: number, options: FgOptions): void {
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
    enterInsertMode (_0: number, opt: CmdOptions["enterInsertMode"]): void {
      let { code, stat } = opt;
      InsertMode.global = opt;
      if (opt.hud) { return HUD.show(`Insert mode${code ? `: ${code}/${stat}` : ""}`); }
    },
    passNextKey (count: number, options: FgOptions): void {
      const keys = Object.create<BOOL>(null);
      let keyCount = 0;
      if (options.normal) {
        const func = esc;
        esc = function(i?: HandlerResult): HandlerResult | void {
          if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.Suppress) {
            HUD.hide();
            return (esc = func)(HandlerResult.Prevent);
          }
          currentKeys = ""; nextKeys = keyMap;
          HUD.show("Normal mode (pass keys disabled)" + (count > 1 ? `: ${count} times` : ""));
          return i;
        } as EscF;
        return esc();
      }
      VUtils.push(function(event) {
        keyCount += +!keys[event.keyCode];
        keys[event.keyCode] = 1;
        return HandlerResult.PassKey;
      }, keys);
      onKeyup2 = function(event: Pick<KeyboardEvent, "keyCode">): void {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event.keyCode] = 0;
          return HUD.show(`Pass next ${count > 1 ? count + " keys." : "key."}`);
        }
        return (ELs.OnWndBlur2 as () => void)();
      };
      ELs.OnWndBlur2 = function(): void {
        onKeyup2 = null;
        VUtils.remove(keys);
        ELs.OnWndBlur2 = null;
        return HUD.hide();
      };
      return onKeyup2({keyCode: VKeyCodes.None} as KeyboardEvent);
    },
    goNext (_0: number, {dir, patterns}: CmdOptions["goNext"]): void {
      if (!VDom.isHTML() || Pagination.findAndFollowRel(dir)) { return; }
      const isNext = dir === "next";
      if (patterns.length <= 0 || !Pagination.findAndFollowLink(patterns, isNext ? "<" : ">")) {
        return VHUD.showForDuration("No links to go " + dir);
      }
    },
    reload (_0: number, {force, hard, url}: CmdOptions["reload"]): void {
      setTimeout(function() {
        url ? (window.location.href = url) : window.location.reload(hard || force);
      }, 17);
    },
    switchFocus (_0: number, options: FgOptions): void {
      let newEl = InsertMode.lock;
      if (newEl) {
        if (options.act === "backspace") {
          if (VDom.ensureInView(newEl)) { document.execCommand("delete"); }
        } else {
          InsertMode.last = newEl;
          InsertMode.mutable = false;
          newEl.blur();
        }
        return;
      }
      newEl = InsertMode.last;
      if (!newEl) {
        return HUD.showForDuration("Nothing was focused", 1200);
      }
      if (!VDom.ensureInView(newEl) && VDom.NotVisible(newEl)) {
        return HUD.showForDuration("The last focused is hidden", 2000);
      }
      InsertMode.last = null;
      InsertMode.mutable = true;
      return VDom.UI.simulateSelect(newEl, null, false, true);
    },
    goBack (count: number, options: FgOptions): void {
      const step = Math.min(count, history.length - 1);
      step > 0 && history.go(step * (+options.dir || -1));
    },
    showHelp (msg?: number | "exitHD"): void {
      if (msg === "exitHD") { return; }
      let wantTop = window.innerWidth < 400 || window.innerHeight < 320;
      if (!VDom.isHTML()) {
        if (window === window.top) { return; }
        wantTop = true;
      }
      vPort.post({ handler: "initHelp", wantTop });
    },
    autoCopy (_0: number, options: FgOptions): void {
      let str = window.getSelection().toString();
      if (!str) {
        str = options.url ? window.location.href : document.title;
        (options.decoded || options.decode) && (str = VUtils.decodeURL(str));
      }
      if (str.length < 4 && !str.trim() && str[0] === ' ') {
        str = "";
      } else {
        vPort.post({
          handler: "copy",
          data: str
        });
      }
      return HUD.showCopied(str);
    },
    autoOpen (_0: number, options: FgOptions): void {
      let url = VDom.getSelectionText(), keyword = (options.keyword || "") + "";
      url && VUtils.evalIfOK(url) || vPort.post({
        handler: "openUrl",
        copied: !url,
        keyword, url
      });
    },
    searchAs (): void {
      vPort.post({
        handler: "searchAs",
        url: window.location.href,
        search: VDom.getSelectionText()
      });
    },
    focusInput (count: number, options: FgOptions): void {
      const arr = VDom.getViewBox(), visibleInputs = VHints.traverse("*", VHints.GetEditable, true);
      let sel = visibleInputs.length;
      if (sel === 0) {
        return HUD.showForDuration("There are no inputs to focus.", 1000);
      } else if (sel === 1) {
        return VDom.UI.simulateSelect(visibleInputs[0][0], visibleInputs[0][1], true, true);
      }
      for (let ind = 0; ind < sel; ind++) {
        const hint = visibleInputs[ind], j = hint[0].tabIndex;
        hint[2] = j > 0 ? ind / 8192 - j : ind;
      }
      const hints = visibleInputs.sort(function(a, b) { return a[2] - b[2]; }).map(function(link) {
        const hint = VDom.createElement("span") as HintsNS.Marker,
        rect = VDom.fromClientRect(link[0].getBoundingClientRect());
        rect[0]--, rect[1]--, rect[2]--, rect[3]--;
        hint.className = "IH";
        hint.clickableItem = link[0];
        VDom.setBoundary(hint.style, rect);
        return hint;
      });
      if (count === 1 && InsertMode.last) {
        sel = Math.max(0, visibleInputs.map(link => link[0]).indexOf(InsertMode.last));
      } else {
        sel = Math.min(count, sel) - 1;
      }
      hints[sel].classList.add("S");
      VDom.UI.simulateSelect(visibleInputs[sel][0], visibleInputs[sel][1]);
      VDom.UI.ensureBorder(VDom.docZoom);
      const box = VDom.UI.addElementList(hints, arr), keep = !!options.keep, pass = !!options.passExitKey;
      VUtils.push(function(event) {
        const { keyCode } = event, oldSel = sel;
        if (keyCode === VKeyCodes.tab) {
          sel = (sel + (event.shiftKey ? -1 : 1)) % hints.length;
          VDom.UI.simulateSelect(hints[sel].clickableItem);
          hints[oldSel].classList.remove("S");
          hints[sel].classList.add("S");
          return HandlerResult.Prevent;
        }
        let keyStat: KeyStat;
        if (keyCode === VKeyCodes.shiftKey || keep && (keyCode === VKeyCodes.altKey
            || keyCode === VKeyCodes.ctrlKey || keyCode === VKeyCodes.metaKey)) {}
        else if (event.repeat) { return HandlerResult.Prevent; }
        else if (keep ? VKeyboard.isEscape(event) || (
            keyCode === VKeyCodes.enter && (keyStat = VKeyboard.getKeyStat(event),
              keyStat !== KeyStat.shiftKey && (keyStat !== KeyStat.plain || hints[sel].clickableItem instanceof HTMLInputElement) )
          ) : keyCode !== VKeyCodes.ime && keyCode !== VKeyCodes.f12
        ) {
          this.remove();
          VUtils.remove(this);
          return !VKeyboard.isEscape(event) ? HandlerResult.Nothing : keep || !InsertMode.lock ? HandlerResult.Prevent
            : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
        }
        return HandlerResult.Nothing;
      }, box);
    }
  },

  InsertMode = {
    grabFocus: document.readyState !== "complete",
    global: null as CmdOptions["enterInsertMode"] | null,
    suppressType: null as string | null,
    last: null as LockableElement | null,
    lock: null as LockableElement | null,
    mutable: true,
    init (): void {
      /** if `notBody` then `activeEl` is not null  */
      let activeEl = document.activeElement as Element, notBody = activeEl !== document.body;
      KeydownEvents = Object.create(null)
      if (VSettings.cache.grabFocus && this.grabFocus) {
        if (notBody) {
          activeEl.blur && activeEl.blur();
          notBody = (activeEl = document.activeElement as Element) !== document.body;
        }
        if (!notBody) {
          VUtils.push(this.ExitGrab, this);
          addEventListener("mousedown", this.ExitGrab, true);
          return;
        }
      }
      this.grabFocus = false;
      if (notBody && VDom.getEditableType(activeEl)) {
        this.lock = activeEl as HTMLElement;
      }
    },
    ExitGrab: function (this: void, event?: Req.fg<"exitGrab"> | MouseEvent | KeyboardEvent): HandlerResult.Nothing | void {
      const _this = InsertMode;
      if (!_this.grabFocus) { return; }
      _this.grabFocus = false;
      removeEventListener("mousedown", _this.ExitGrab, true);
      VUtils.remove(_this);
      // it's okay to not set the userActed flag if there's only the top frame,
      !(event instanceof Event) || !(window.frames && (frames as Window[]).length) && window === window.top ||
      vPort.safePost({ handler: "exitGrab" });
      if (event instanceof KeyboardEvent) { return HandlerResult.Nothing; }
    } as {
      (this: void, event: KeyboardEvent): HandlerResult.Nothing;
      (this: void, request: Req.bg<"exitGrab">): void;
      (this: void, event?: MouseEvent): void;
    },
    isActive (): boolean {
      if (this.suppressType) { return false; }
      if (this.lock !== null || this.global) {
        return true;
      }
      let el = document.activeElement;
      if (el && (el as HTMLElement).isContentEditable === true && el instanceof HTMLElement) {
        this.lock = el;
        return true;
      } else {
        return false;
      }
    },
    focusUpper (this: void, key: VKeyCodes, force: boolean): HandlerResult {
      let el = window.frameElement as HTMLElement | null;
      if (el) {
        const parent = el.ownerDocument.defaultView, a = (parent as Window & { VEventMode: typeof VEventMode }).VEventMode;
        el.blur();
        if (a) {
          (parent as Window & { VDom: typeof VDom }).VDom.UI.suppressTail(true);
          a.focus({ key, mask: FrameMaskType.ForcedSelf });
        } else {
          parent.focus();
        }
      } else if (force && window.top !== window) {
        vPort.post({ handler: "nextFrame", type: Frames.NextType.parent, key });
      } else {
        return HandlerResult.Nothing;
      }
      return HandlerResult.Prevent;
    },
    exit (event: KeyboardEvent): void {
      let target: Element | null = event.target as Element;
      if ((target as HTMLElement).shadowRoot instanceof ShadowRoot) {
        if (target = this.lock) {
          this.lock = null;
          (target as HTMLElement).blur();
        }
      } else if (target === this.lock ? (this.lock = null, 1) : VDom.getEditableType(target)) {
        (target as HTMLElement).blur();
      }
      if (this.global) {
        this.lock = null; this.global = null;
        return HUD.hide();
      }
    },
    onExitSuppress: null as ((this: void) => void) | null
  },

Pagination = {
  followLink (linkElement: Element): boolean {
    let url = linkElement instanceof HTMLLinkElement && linkElement.href;
    if (url) {
      Commands.reload(1, { url });
    } else {
      VDom.ensureInView(linkElement);
      VDom.UI.flash(linkElement);
      setTimeout(function() { VDom.UI.click(linkElement); }, 0);
    }
    return true;
  },
  GetLinks (this: HTMLElement[], element: Element): void {
    if (!(element instanceof HTMLElement) || element instanceof HTMLFormElement) { return; }
    let s: string | null;
    const isClickable = element instanceof HTMLAnchorElement || (
      element instanceof HTMLButtonElement ? !element.disabled
      : element.vimiumHasOnclick || element.getAttribute("onclick") || (
        (s = element.getAttribute("role")) ? (s = s.toLowerCase(), s === "link" || s === "button")
        : VHints.ngEnabled && element.getAttribute("ng-click")));
    if (!isClickable) { return; }
    if ((s = element.getAttribute("aria-disabled")) != null && (!s || s.toLowerCase() === "true")) { return; }
    const rect = element.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2 && getComputedStyle(element).visibility === "visible") {
      this.push(element);
    }
  },
  findAndFollowLink (names: string[], refusedStr: string): boolean {
    interface Candidate { [0]: number; [1]: string; [2]: HTMLElement; }
    const count = names.length, links = VHints.traverse("*", this.GetLinks, true, document);
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
      for (let cand of candidates) {
        if (cand[0] > j) { break; }
        if (re.test(cand[1])) { return this.followLink(cand[2]); }
      }
    }
    return false;
  },
  findAndFollowRel (relName: string): boolean {
    const elements = document.querySelectorAll("[rel]"),
    relTags = VUtils.safer({a: 1, area: 1, link: 1});
    let s: string | null;
    for (let _i = 0, _len = elements.length; _i < _len; _i++) {
      const element = elements[_i];
      if (!(element instanceof HTMLFormElement) && (element.tagName.toLowerCase() in relTags)
          && element instanceof HTMLElement
          && (s = (element as HTMLAnchorElement).rel) && s.toLowerCase() === relName) {
        return this.followLink(element);
      }
    }
    return false;
  }
},
  FrameMask = {
    more: false,
    node: null as HTMLDivElement | null,
    timer: 0,
    Focus (this: void, { mask, CSS, key }: BgReq["focusFrame"]): void {
      CSS && VDom.UI.css(CSS);
      if (mask !== FrameMaskType.NormalNext) {}
      else if (window.innerWidth < 3 || window.innerHeight < 3
        || document.body instanceof HTMLFrameSetElement
        || FrameMask.hidden()) {
        vPort.post({
          handler: "nextFrame",
          key
        });
        return;
      }
      VEventMode.focusAndListen();
      esc();
      VEventMode.suppress(key);
      const notTop = window.top !== window;
      if (notTop && mask === FrameMaskType.NormalNext) {
        let docEl = document.documentElement;
        docEl && (docEl.scrollIntoViewIfNeeded || docEl.scrollIntoView).call(docEl);
      }
      if (mask < FrameMaskType.minWillMask || !VDom.isHTML()) { return; }
      let _this = FrameMask, dom1: HTMLDivElement | null;
      if (dom1 = _this.node) {
        _this.more = true;
      } else {
        dom1 = VDom.createElement("div");
        dom1.className = "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : "");
        _this.node = dom1;
        _this.timer = setInterval(_this.Remove, notTop ? 350 : 200);
      }
      VDom.UI.addElement(dom1);
    },
    hidden (): boolean {
      let el = window.frameElement;
      if (!el) { return false; }
      let box = el.getBoundingClientRect();
      return box.height < 1 || box.width < 1 || getComputedStyle(el).visibility === "hidden";
    },
    Remove (this: void): void {
      const _this = FrameMask;
      if (_this.more) {
        _this.more = false;
        return;
      }
      if (_this.node) { _this.node.remove(); _this.node = null; }
      clearInterval(_this.timer);
    }
  },
  HUD = {
    tweenId: 0,
    box: null as HTMLDivElement | null,
    text: "",
    opacity: 0 as 0 | 0.25 | 0.5 | 0.75 | 1,
    enabled: false,
    timer: 0,
    showCopied: function (this: VHUD, text: string, e?: string, virtual?: true): string | void {
      if (!text) {
        if (virtual) { return text; }
        return this.showForDuration(`No ${e || "text"} found!`, 1000);
      }
      if (text.startsWith("chrome-")) {
        text = text.substring(text.indexOf('/', text.indexOf('/') + 2));
      }
      text = `Copied: ${text.length > 41 ? text.substring(0, 39) + "..." : text + "."}`;
      if (virtual) { return text; }
      return this.showForDuration(text, 2000);
    } as VHUD["showCopied"],
    showForDuration (text: string, duration?: number): void {
      this.show(text);
      this.text && ((this as typeof HUD).timer = setTimeout(this.hide, duration || 1500));
    },
    show (text: string, nowait?: boolean): void {
      if (!this.enabled || !VDom.isHTML()) { return; }
      this.opacity = 1; this.text = text;
      if (this.timer) { clearTimeout(this.timer); this.timer = 0; }
      let el = this.box, st = el ? el.style : null, i = st ? +(st.opacity || 1) : 0;
      if (i > 0) {
        ((el as HTMLDivElement).firstChild as Text).data = text;
        return;
      }
      nowait || this.tweenId || (this.tweenId = setInterval(this.tween, 40));
      if (!el) {
        el = VDom.createElement("div");
        el.className = "R HUD";
        st = el.style;
        st.opacity = "0";
        st.visibility = "hidden";
        el.textContent = text;
        VDom.UI.root || VDom.UI.ensureBorder();
        VDom.UI.addElement(this.box = el, AdjustType.NotAdjust, VHints.box);
      }
      if (nowait) {
        (st as CSSStyleDeclaration).cssText = "";
        el.textContent = text;
      }
    },
    tween (this: void): void {
      if (!VHUD) { return; }
      const hud = HUD, el = hud.box as HTMLDivElement, st = el.style;
      let opacity = +(st.opacity || 1);
      if (opacity === hud.opacity) {}
      else if (opacity === 0) {
        (el.firstChild as Text).data = hud.text;
        st.opacity = "0.25";
        st.visibility = "";
        return VDom.UI.adjust();
      } else if (document.hasFocus()) {
        opacity += opacity < hud.opacity ? 0.25 : -0.25;
      } else {
        opacity = hud.opacity;
      }
      st.opacity = opacity < 1 ? opacity as number | string as string : "";
      if (opacity !== hud.opacity) { return; }
      if (opacity === 0) {
        st.visibility = "hidden";
        (el.firstChild as Text).data = "";
      }
      clearInterval(hud.tweenId);
      hud.tweenId = 0;
    },
    hide (this: void): void {
      let hud = HUD, i: number;
      if (i = hud.timer) { clearTimeout(i); hud.timer = 0; }
      hud.opacity = 0; hud.text = "";
      if (hud.box && !hud.tweenId && VHUD) {
        hud.tweenId = setInterval(hud.tween, 40);
      }
    }
  },
  requestHandlers: { [K in keyof BgReq]: (this: void, request: BgReq[K]) => void } = {
    init (request): void {
      const r = requestHandlers, flags = request.flags;
      (VSettings.cache = request.load).onMac && (VKeyboard.correctionMap = Object.create<string>(null));
      VDom.specialZoom = VSettings.cache.browserVer >= BrowserVer.MinDevicePixelRatioImplyZoomOfDocEl;
      r.keyMap(request);
      if (flags) {
        InsertMode.grabFocus = !(flags & Frames.Flags.userActed);
        isLocked = !!(flags & Frames.Flags.locked);
      }
      (r as { reset (request: BgReq["reset"], initing?: 1): void }).reset(request, 1);
      r.init = null as never;
      return VDom.documentReady(ELs.OnReady);
    },
    reset (request: BgReq["reset"], initing?: 1): void {
      const newPassKeys = request.passKeys, enabled = newPassKeys !== "", old = VSettings.enabled;
      passKeys = (newPassKeys && parsePassKeys(newPassKeys)) as SafeDict<true> | null;
      VSettings.enabled = isEnabledForUrl = enabled;
      if (initing) {
        return enabled ? InsertMode.init() : (InsertMode.grabFocus = false, ELs.hook(HookAction.Suppress));
      }
      isLocked = !!request.forced;
      if (enabled) {
        let b = ELs.wrapper;
        b && b.set(b.inner); // recover listeners on shadow roots
        old || InsertMode.init();
        (old && !isLocked) || ELs.hook(HookAction.Install);
        // here should not return even if old - a url change may mean the fullscreen mode is changed
      } else {
        Commands.reset();
        VSettings.uninit && VSettings.uninit(1);
      }
      if (VDom.UI.box) { return VDom.UI.toggle(enabled); }
    },
    url (this: void, request: BgReq["url"]): void {
      delete (request as Req.bg<"url">).name;
      request.url = window.location.href;
      vPort.post(request);
    },
    eval (options: BgReq["eval"]): void { VUtils.evalIfOK(options.url); },
    settingsUpdate (request): void {
      type Keys = keyof SettingsNS.FrontendSettings;
      VUtils.safer(request);
      delete request.name;
      for (let i in request) {
        VSettings.cache[i as Keys] = request[i as Keys] as SettingsNS.FrontendSettings[Keys];
      }
    },
    focusFrame: FrameMask.Focus,
    exitGrab: InsertMode.ExitGrab as (this: void, request: Req.bg<"exitGrab">) => void,
    keyMap (request): void {
      const map = keyMap = request.keyMap, func = Object.setPrototypeOf;
      func(map, null);
      function iter(obj: ReadonlyChildKeyMap): void {
        func(obj, null);
        for (let key in obj) { if (obj[key] !== 0) {
          iter(obj[key] as ReadonlyChildKeyMap);
        } }
      }
      for (let key in map) {
        let sec = map[key];
        if (sec === 0 || sec === 1) { continue; }
        iter(sec as ReadonlyChildKeyMap);
      }
      (mapKeys = request.mapKeys) && func(mapKeys, null);
    },
    execute (request: Req.bg<"execute">): void {
      if (request.CSS) { VDom.UI.css(request.CSS); }
      return VUtils.execCommand(Commands, request.command, request.count, request.options);
    },
    createMark (request): void { return VMarks.createMark(request.markName); },
    showHUD ({ text, CSS, isCopy }: Req.bg<"showHUD">): void {
      if (CSS) { VDom.UI.css(CSS); }
      return text ? isCopy ? HUD.showCopied(text) : HUD.showForDuration(text) : void 0;
    },
    count (request): void {
      const count = parseInt(currentKeys, 10) || 1;
      vPort.post({ handler: "cmd", cmd: request.cmd, count});
    },
  showHelpDialog ({ html, advanced: shouldShowAdvanced, optionUrl, CSS }: Req.bg<"showHelpDialog">): void {
    let box: HTMLElement, oldShowHelp: typeof Commands.showHelp, hide: (this: void, e?: Event | number | "exitHD") => void
      , node1: HTMLElement;
    if (CSS) { VDom.UI.css(CSS); }
    if (!VDom.isHTML()) { return; }
    Commands.showHelp("exitHD");
    box = VDom.createElement("div");
    box.className = "R Scroll UI";
    box.id = "HelpDialog";
    box.innerHTML = html;
    hide = VUtils.Stop;
    box.onclick = hide;
    box.addEventListener("wheel", hide, {passive: true, capture: true});
    VSettings.cache.browserVer < BrowserVer.MinNoDOMActivateInClosedShadowRootPassedToDocument ||
    box.addEventListener("DOMActivate", ELs.onActivate, true);

    hide = function(event): void {
      event instanceof Event && event.preventDefault();
      let i = VDom.lastHovered;
      i && box.contains(i) && (VDom.lastHovered = null);
      (i = VScroller.current) && box.contains(i) && (VScroller.current = null);
      VUtils.remove(box);
      box.remove();
      Commands.showHelp = oldShowHelp;
    };
    node1 = box.querySelector("#OptionsPage") as HTMLAnchorElement;
    if (! window.location.href.startsWith(optionUrl)) {
      (node1 as HTMLAnchorElement).href = optionUrl;
      node1.onclick = function(event) {
        vPort.post({ handler: "focusOrLaunch", url: optionUrl });
        return hide(event);
      };
    } else {
      node1.remove();
    }
    node1 = box.querySelector("#AdvancedCommands") as HTMLElement;
    function toggleAdvanced(this: void): void {
      (node1.firstChild as Text).data = (shouldShowAdvanced ? "Hide" : "Show") + " advanced commands";
      box.classList.toggle("HelpAdvanced");
    }
    oldShowHelp = Commands.showHelp;
    node1.onclick = function(event) {
      event.preventDefault();
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      vPort.post({
        handler: "setSetting",
        key: "showAdvancedCommands",
        value: shouldShowAdvanced
      } as SetSettingReq<"showAdvancedCommands">);
    };
    (box.querySelector("#HClose") as HTMLElement).onclick = Commands.showHelp = hide;
    shouldShowAdvanced && toggleAdvanced();
    VDom.UI.ensureBorder();
    VDom.UI.addElement(box, AdjustType.Normal, true);
    document.hasFocus() || VEventMode.focusAndListen();
    VScroller.current = box;
    VUtils.push(function(event) {
      if (!InsertMode.lock && VKeyboard.isEscape(event)) {
        VDom.UI.removeSelection(VDom.UI.root as ShadowRoot) || hide();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    }, box);
    if (Vomnibar.status >= VomnibarNS.Status.Showing) {
      VUtils.remove(Vomnibar);
      VUtils.push(Vomnibar.onKeydown, Vomnibar);
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
    key = VKeyboard.getKey(event, key);
    mapKeys !== null && (key = mapKeys[key] || key);
    let j = (nextKeys || keyMap)[key];
    if (nextKeys === null) {
      if (j == null || passKeys !== null && key in passKeys) { return HandlerResult.Nothing; }
    } else if (j == null) {
      j = keyMap[key];
      if (j == null) { return esc(HandlerResult.Nothing); }
      if (j !== 0) { currentKeys = ""; }
    }
    if (j === 0) {
      vPort.post({ handler: "key", key: currentKeys + key, lastKey: event.keyCode });
      return esc(HandlerResult.Prevent);
    } else {
      currentKeys += key; nextKeys = j !== 1 ? j : keyMap;
      return HandlerResult.Prevent;
    }
  }

  VPort = { post: vPort.post, send: vPort.send };
  VHUD = HUD;

  VEventMode = {
    lock (this: void): Element | null { return InsertMode.lock; },
    onWndBlur (this: void, f): void { ELs.OnWndBlur2 = f; },
    OnWndFocus (this: void): void { return ELs.OnWndFocus(); },
    focusAndListen (callback?: (() => void) | null, timedout?: 0 | 1): void {
      if (timedout !== 1) {
        setTimeout(function(): void { VEventMode.focusAndListen(callback, 1 as number as 0); }, 0);
        return;
      }
      InsertMode.ExitGrab();
      let old = ELs.OnWndFocus, failed = true;
      ELs.OnWndFocus = function(): void { failed = false; };
      window.focus();
      failed && isEnabledForUrl && ELs.hook(HookAction.Install);
      // the line below is always necessary: see https://github.com/philc/vimium/issues/2551#issuecomment-316113725
      (ELs.OnWndFocus = old)();
      if (callback && esc) {
        return callback();
      }
    },
    focus: FrameMask.Focus,
    mapKey (this: void, key): string { return mapKeys !== null && mapKeys[key] || key; },
    scroll (this: void, event, wnd): void {
      if (!event || event.shiftKey || event.altKey) { return; }
      const { keyCode } = event as { keyCode: number }, c = (keyCode & 1) as BOOL;
      if (!(keyCode > VKeyCodes.maxNotPageUp && keyCode < VKeyCodes.minNotDown)) { return; }
      wnd && VSettings.cache.smoothScroll && VEventMode.OnScrolls[3](wnd, 1);
      if (keyCode > VKeyCodes.maxNotLeft) {
        return VScroller.scrollBy((1 - c) as BOOL, keyCode < VKeyCodes.minNotUp ? -1 : 1, 0);
      } else if (keyCode > VKeyCodes.maxNotEnd) {
        return VScroller.scrollTo(1, 0, c);
      } else if (!(event.ctrlKey || event.metaKey)) {
        return VScroller.scrollBy(1, 0.5 - c, "viewSize");
      }
    },
    OnScrolls: [function (event): void | 1 {
      if (event.repeat) {
        VUtils.prevent(event);
        return (VScroller.keyIsDown = VScroller.maxInterval) as 1;
      } else if (this !== VEventMode.OnScrolls) {
        return VEventMode.OnScrolls[3](this);
      } else {
        VScroller.keyIsDown = 0;
      }
    }, function (event): void {
      if (event.isTrusted != false) {
        VUtils.prevent(event);
        return VEventMode.OnScrolls[3](this);
      }
    }, function (event): void {
      if (event.target === this && event.isTrusted != false) { return VEventMode.OnScrolls[3](this); }
    }, function (this: VEventMode["OnScrolls"], wnd, interval): void {
      const f = interval ? addEventListener : removeEventListener;
      VScroller.keyIsDown = interval || 0;
      f.call(wnd, "keyup", this[1], true); f.call(wnd, "blur", this[2], true);
    }],
    setupSuppress (this: void, onExit): void {
      const mode = InsertMode, f = mode.onExitSuppress;
      mode.onExitSuppress = mode.suppressType = null;
      if (onExit) {
        mode.suppressType = VDom.selType();
        mode.onExitSuppress = onExit;
      }
      if (f) { return f(); }
    },
    suppress (this: void, key?: VKeyCodes): void { key && (KeydownEvents[key] = 1); },
    keydownEvents: function (this: void, arr?: KeydownCacheArray): KeydownCacheArray | boolean {
      if (!arr) { return KeydownEvents; }
      return !isEnabledForUrl || !(KeydownEvents = arr);
    } as VEventMode["keydownEvents"]
  };

  VSettings = {
    enabled: false,
    cache: null as never as VSettings["cache"],
    checkIfEnabled (this: void): void {
      return vPort.safePost({ handler: "checkIfEnabled", url: window.location.href });
    },
    uninit: null,
  destroy: function(silent, keepChrome): void {
    VSettings.enabled = isEnabledForUrl = false;
    ELs.hook(HookAction.Destroy);

    Commands.reset();
    let f: typeof VSettings["uninit"], ui = VDom.UI;
    (f = VSettings.uninit) && f(2);

    VUtils = VKeyboard = VDom = VDom = VUtils = //
    VHints = Vomnibar = VScroller = VMarks = VFindMode = //
    VSettings = VHUD = VPort = VEventMode = VVisualMode = //
    esc = null as never;
    ui.box && ui.toggle(false);

    silent || console.log("%cVimium++%c in %c%s%c has been destroyed at %o."
      , "color:red", "color:auto", "color:darkred"
      , window.location.pathname.replace(<RegExpOne> /^.*\/([^\/]+)\/?$/, "$1")
      , "color:auto", Date.now());

    if (vPort.port) { try { vPort.port.disconnect(); } catch (e) {} }
    isInjected || location.protocol.startsWith("chrome") || keepChrome || (window.chrome = null as never);
  }
  };

  // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
  ELs.hook(HookAction.Install);
  if (location.href !== "about:blank" || isInjected) {
    vPort.connect(PortType.initing);
  } else (function() {
    try {
      let f = frameElement, a = f && ((f as HTMLElement).ownerDocument.defaultView as Window & { VFindMode?: typeof VFindMode}).VFindMode;
      if (a && a.box && a.box === f) {
        VSettings.destroy(true);
        a.onLoad(a.box);
        return; // not return a function's result so that logic is clearer for compiler
      }
    } catch (e) {}
    vPort.connect(PortType.initing);
  })();
})();
