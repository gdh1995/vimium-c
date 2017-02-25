var VSettings: VSettings, VHUD: VHUD, VPort: VPort, VEventMode: VEventMode;

(function() {
  interface EscFunc {
    <T extends HandlerResult>(this: void, i: T): T;
    (this: void): void;
  }
  interface Port extends chrome.runtime.Port {
    postMessage<K extends keyof FgReq>(request: FgReq[K]): 1;
    postMessage<K extends keyof FgRes>(request: Req.fgWithRes<K>): 1;
  }
  interface ShadowRootEx extends ShadowRoot {
    vimiumBlurred?: boolean;
  }
  interface LockableFocusEvent extends FocusEvent {
    target: HTMLElement;
  }

  const isInjected = window.VimiumInjector ? true : null;
  var KeydownEvents: KeydownCacheArray, esc: EscFunc, keyMap: KeyMap
    , currentKeys = "", isEnabledForUrl = false
    , mapKeys = null as SafeDict<string> | null, nextKeys = null as KeyMap | ReadonlyChildKeyMap | null
    , onKeyup2 = null as ((this: void, event: KeyboardEvent) => void) | null, passKeys = null as SafeDict<true> | null;

  const vPort = {
    port: null as Port | null,
    _callbacks: Object.create(null) as { [msgId: number]: <K extends keyof FgRes>(this: void, res: FgRes[K]) => void },
    _id: 1,
    post: function<K extends keyof FgReq> (this: void, request: Req.fg<K>): 1 {
      return (vPort.port as Port).postMessage(request);
    } as VPort["post"],
    send: function<K extends keyof FgRes> (this: void, request: Req.fg<K>
        , callback: (this: void, res: FgRes[K]) => void): void {
      let id = ++vPort._id;
      (vPort.port as Port).postMessage({_msgId: id, request: request});
      vPort._callbacks[id] = callback;
    } as VPort["send"],
    safePost<K extends keyof FgReq> (request: Req.fg<K>): void {
      try {
        if (!this.port) {
          this.connect(0);
          isInjected && setTimeout(function() { VPort && !vPort.port && VSettings.destroy(); }, 50);
        }
        (this.port as Port).postMessage(request);
      } catch (e) { // this extension is reloaded or disabled
        return VSettings.destroy();
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
    ClearPort (this: void): void {
      vPort.port = null;
    },
    connect (isFirst: BOOL): void {
      const data = { name: "vimium++." + (4 * +(window.top === window) + 2 * +document.hasFocus() + isFirst) };
      const port = this.port = isInjected ? chrome.runtime.connect(VimiumInjector.id, data) as Port
        : chrome.runtime.connect(data) as Port;
      port.onDisconnect.addListener(this.ClearPort);
      port.onMessage.addListener(this.Listener);
    }
  };
  location.href !== "about:blank" || isInjected ? vPort.connect(1) :
  (window.onload = function() { window.onload = null as never; setTimeout(function() {
    const a = document.body,
    exit = !!a && (a.isContentEditable || a.childElementCount === 1 && (a.firstElementChild as HTMLElement).isContentEditable);
    exit ? VSettings.destroy(true) : vPort.port || vPort.connect(1);
  }, 18); });
  VPort = { post: vPort.post, send: vPort.send };

  VSettings = {
    cache: null as never as VSettings["cache"],
    destroy: null as never as VSettings["destroy"],
    timer: setInterval(function() { vPort.connect(1); }, 2000),
    checkIfEnabled (this: void): void {
      return vPort.safePost({ handler: "checkIfEnabled", url: window.location.href });
    },
    onDestroy: null
  };

  const ELs = { //
    onKeydown (event: KeyboardEvent): void {
      if (!isEnabledForUrl || event.isTrusted === false) { return; }
      if (VScroller.keyIsDown) {
        if (event.repeat) {
          VScroller.keyIsDown = VScroller.Core.maxInterval;
          return VUtils.Prevent(event);
        }
        VScroller.keyIsDown = 0;
      }
      let keyChar: string, key = event.keyCode, action: HandlerResult;
      if (action = VHandler.bubbleEvent(event)) {
        if (action < HandlerResult.MinMayNotPassKey) { return; }
        if (action === HandlerResult.Prevent) { event.preventDefault(); }
        event.stopImmediatePropagation();
        KeydownEvents[key] = 1;
        return;
      }
      if (InsertMode.isActive()) {
        if (InsertMode.lock === document.body && InsertMode.lock) { return; }
        if (InsertMode.global ? !InsertMode.global.code ? VKeyboard.isEscape(event)
              : key === InsertMode.global.code && VKeyboard.getKeyStat(event) === InsertMode.global.stat
            : VKeyboard.isEscape(event)
              || (key > 90 && (keyChar = VKeyboard.getKeyName(event)) && // TODO: why 90
                (action = checkValidKey(event, keyChar)), false)
          ) {
          InsertMode.exit(event);
          action = HandlerResult.Prevent;
        }
      }
      else if (key >= VKeyCodes.space || key === VKeyCodes.backspace) {
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
      } else if (VDom.UI.removeSelection(window)) {
        action = HandlerResult.Prevent;
      } else if (event.repeat) {
        let c = document.activeElement; c && c.blur && c.blur();
      }
      if (action === HandlerResult.Nothing) { return; }
      if (action === HandlerResult.Prevent) {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      KeydownEvents[key] = 1;
    },
    onKeyup (event: KeyboardEvent): void {
      if (!isEnabledForUrl || event.isTrusted === false) { return; }
      VScroller.keyIsDown = 0;
      if (InsertMode.suppressType && window.getSelection().type !== InsertMode.suppressType) {
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
    onFocus (event: FocusEvent): void {
      if (event.isTrusted === false) { return; }
      let target = event.target as Window | Element | ShadowRootEx;
      if (target === window) { ELs.OnWndFocus(); }
      else if (!isEnabledForUrl) {}
      else if (VDom.getEditableType(target as Element)) { InsertMode.focus(event as LockableFocusEvent); }
      else if (target === VDom.UI.box) { event.stopImmediatePropagation(); }
      else if ((target as Element).shadowRoot) {
        target = (target as Element).shadowRoot as ShadowRoot;
        target.addEventListener("focus", ELs.onFocus, true);
        target.addEventListener("blur", ELs.onShadowBlur, true);
      }
    },
    onBlur (event: FocusEvent): void {
      if (event.isTrusted === false) { return; }
      let target = event.target as Window | Element | ShadowRootEx;
      if (target === window) {
        VScroller.keyIsDown = 0;
        ELs.OnWndBlur && ELs.OnWndBlur.call(null);
        KeydownEvents = new Uint8Array(256);
        (<RegExpOne> /a?/).test("");
        return esc();
      } else if (!isEnabledForUrl) {}
      else if (InsertMode.lock === target) { InsertMode.lock = null; }
      else if ((target as Element).shadowRoot && target !== VDom.UI.box) {
        target = (target as Element).shadowRoot as ShadowRoot;
        // NOTE: if destroyed, this page must have lost its focus before, so
        // a blur event must have been bubbled from shadowRoot to a real lock.
        // Then, we don't need to worry about ELs or InsertMode being null.
        target.removeEventListener("focus", ELs.onFocus, true);
        target.vimiumBlurred = true;
      }
    },
    onActivate (event: UIEvent): void {
      VScroller.current = (event as any).path[0];
    },
    OnWndFocus (this: void): void {},
    OnWndBlur: null as ((this: void) => void) | null,
    onShadowBlur (this: ShadowRootEx, event: FocusEvent): void {
      if (event.isTrusted === false) { return; }
      if (this.vimiumBlurred) {
        this.vimiumBlurred = false;
        this.removeEventListener("blur", ELs.onShadowBlur, true);
      }
      ELs.onBlur(event);
    },
    OnReady (inited?: boolean): void {
      const visible = isEnabledForUrl && location.href !== "about:blank" && innerHeight > 9 && innerWidth > 9;
      VDom.UI.insertCSS(visible && VSettings.cache.userDefinedOuterCss);
      if (inited) { return; }
      HUD.enabled = true;
      ELs.OnWndFocus = vPort.safePost.bind(vPort, { handler: "frameFocused" });
    },
    hook (f: typeof addEventListener | typeof removeEventListener, c?: 1): void {
      f("keydown", this.onKeydown, true);
      f("keyup", this.onKeyup, true);
      c || f("focus", this.onFocus, true);
      f("blur", this.onBlur, true);
      f.call(document, "DOMActivate", ELs.onActivate, true);
    }
  };

  esc = function(i?: HandlerResult): HandlerResult | void { currentKeys = ""; nextKeys = null; return i; };

  function parsePassKeys(newPassKeys: string): SafeDict<true> {
    const pass = Object.create<true>(null);
    for (const ch of newPassKeys.split(' ')) {
      pass[ch] = true;
    }
    return pass;
  };

  const Commands = {
    Vomnibar: Vomnibar,
    VHints: VHints,
    VMarks: VMarks,

    toggleSwitchTemp (_0: number, options: FgOptions): void {
      const key = options.key as keyof SettingsNS.FrontendSettingCache, values = VSettings.cache;
      if (typeof values[key] !== "boolean") {
        return HUD.showForDuration(`'${key}' is not a boolean switch`, 2000);
      } else if (values[key] = typeof options.value === "boolean"
          ? options.value : !values[key]) {
        return HUD.showForDuration(`Now '${key}' is on`, 1000);
      } else {
        return HUD.showForDuration(`'${key}' has been turned off`, 1000);
      }
    },
    toggleLinkHintCharacters (_0: number, options: FgOptions): void {
      let values = VSettings.cache, K = "oldLinkHintCharacters" as "oldLinkHintCharacters",
      val = options.value ? (options.value + "").toLowerCase() : "sadjklewcmpgh";
      if (values.linkHintCharacters === val) {
        if (values[K]) {
          val = values.linkHintCharacters = values[K] as string;
          values[K] = "";
        }
      } else {
        values[K] = values[K] || values.linkHintCharacters;
        values.linkHintCharacters = val;
      }
      return HUD.showForDuration(`Now link hints use "${val}"`);
    },
    scrollTo: VScroller.ScTo,
    scrollBy: VScroller.ScBy,
    enterVisualMode (_0: number, options: FgOptions): void { return VVisualMode.activate(options); },
    enterInsertMode (_0: number, options: FgOptions): void {
      let code = +options.code || VKeyCodes.esc, stat = +options.stat, hud = !options.hideHud;
      stat === KeyStat.plain && code === VKeyCodes.esc && (code = 0);
      InsertMode.global = { code: code, stat: stat, hud: hud };
      if (hud) { return HUD.show(`Insert mode${code ? `: ${code}/${stat}` : ""}`); }
    },
    performFind (_0: number, options: FgOptions): void | false { return VFindMode.activate(options); },
    passNextKey (count: number, options: FgOptions): void {
      const keys = Object.create<BOOL>(null);
      let keyCount = 0;
      if (options.normal) {
        const func = esc;
        // TODO: if always return i or not
        esc = function(i?: HandlerResult): HandlerResult | void {
          if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.Suppress) {
            HUD.hide();
            return (esc = func)(HandlerResult.Prevent);
          }
          currentKeys = ""; nextKeys = keyMap;
          return i;
        };
        return HUD.show("Normal mode (pass keys disabled)" + (count > 1 ? `: ${count} times` : ""));
      }
      VHandler.push(function(event) {
        keyCount += +!keys[event.keyCode];
        keys[event.keyCode] = 1;
        return HandlerResult.PassKey;
      }, keys);
      onKeyup2 = function(event): void {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event.keyCode] = 0;
          return HUD.show(`Pass next ${count > 1 ? count + " keys." : "key."}`);
        }
        return (ELs.OnWndBlur as () => void)();
      };
      ELs.OnWndBlur = function(): void {
        onKeyup2 = null;
        VHandler.remove(keys);
        ELs.OnWndBlur = null;
        return HUD.hide();
      };
      return onKeyup2({keyCode: 0} as KeyboardEvent);
    },
    goNext (_0: number, options: FgCmdOptions<"goNext">): void {
      return Pagination.goBy(options.dir, options.patterns);
    },
    reload (url: number | string): void {
      setTimeout(function() {
        typeof url !== "string" ? window.location.reload() : (window.location.href = url);
      }, 17);
    },
    switchFocus (): void {
      let newEl = InsertMode.lock;
      if (newEl) {
        InsertMode.last = newEl;
        InsertMode.mutable = false;
        newEl.blur();
        return;
      }
      newEl = InsertMode.last;
      if (!newEl) {
        return HUD.showForDuration("Nothing was focused", 1200);
      }
      else if (!VDom.isVisibile(newEl)) {
        newEl.scrollIntoView();
        if (!VDom.isVisibile(newEl)) {
          return HUD.showForDuration("The last focused is hidden", 2000);
        }
      }
      InsertMode.last = null;
      InsertMode.mutable = true;
      return VDom.UI.simulateSelect(newEl, false, true);
    },
    simBackspace (): void {
      const el = InsertMode.lock;
      if (!el) { return Commands.switchFocus(); }
      else if (VDom.isVisibile(el)) { document.execCommand("delete"); }
      else { el.scrollIntoView(); }
    },
    goBack (count: number, options: FgOptions): void {
      const step = Math.min(count, history.length - 1);
      step > 0 && history.go(step * (+options.dir || -1));
    },
    goUp (count: number, options: FgOptions): void {
      return vPort.send({
        handler: "parseUpperUrl",
        url: window.location.href,
        trailing_slash: options.trailing_slash,
        upper: -count
      }, function(result): void {
        if (result.path != null) {
          return Commands.reload(result.url);
        }
        return HUD.showForDuration(result.url);
      });
    },
    showHelp (): void {
      if (!VDom.isHTML()) { return; }
      vPort.post({handler: "initHelp"});
    },
    autoCopy (_0: number, options: FgOptions): void {
      const str = window.getSelection().toString() ||
        (options.url ? window.location.href : document.title);
      (str.length >= 4 || str.trim()) && vPort.post({
        handler: "copyToClipboard",
        data: str
      });
      return HUD.showCopied(str);
    },
    autoOpen (_0: number, options: FgOptions): void {
      let str: string, keyword = (options.keyword || "") + "";
      if (str = VDom.getSelectionText()) {
        VUtils.evalIfOK(str) || vPort.post({
          handler: "openUrl",
          keyword,
          url: str
        });
        return;
      }
      return vPort.send({
        handler: "getCopiedUrl_f",
        keyword
      }, function(str): void {
        if (str) {
          VUtils.evalIfOK(str);
        } else {
          return HUD.showCopied("");
        }
      });
    },
    searchAs (): void {
      return vPort.send({
        handler: "searchAs",
        url: window.location.href,
        search: VDom.getSelectionText()
      }, function(str): void {
        if (str) { return HUD.showForDuration(str, 1000); }
      });
    },
    focusInput (count: number): void {
      const visibleInputs = VHints.traverse({"*": VHints.GetEditable});
      let sel = visibleInputs.length;
      if (sel === 0) {
        return HUD.showForDuration("There are no inputs to focus.", 1000);
      } else if (sel === 1) {
        return VDom.UI.simulateSelect(visibleInputs[0][0], true, true);
      }
      const arr = VDom.getViewBox(),
      hints = visibleInputs.map(function(link) {
        const hint = VDom.createElement("span") as HintsNS.Marker,
        rect = VRect.fromClientRect(link[0].getBoundingClientRect());
        rect[0]--, rect[1]--, rect[2]--, rect[3]--;
        hint.className = "IH";
        hint.clickableItem = link[0];
        VRect.setBoundary(hint.style, rect);
        return hint;
      });
      if (count === 1 && InsertMode.last) {
        sel = Math.max(0, visibleInputs
          .map(function(link) { return link[0]; }).indexOf(InsertMode.last));
      } else {
        sel = Math.min(count, sel) - 1;
      }
      VDom.UI.simulateSelect(visibleInputs[sel][0]);
      hints[sel].classList.add("S");
      const box = VDom.UI.addElementList(hints, arr);
      VHandler.push(function(event) {
        if (event.keyCode === VKeyCodes.tab) {
          hints[sel].classList.remove("S");
          if (event.shiftKey) {
            if (--sel === -1) { sel = hints.length - 1; }
          }
          else if (++sel === hints.length) { sel = 0; }
          hints[sel].classList.add("S");
          VDom.UI.simulateSelect(hints[sel].clickableItem);
        } else if (event.keyCode === VKeyCodes.f12) {
          return VKeyboard.getKeyStat(event) ? HandlerResult.Prevent : HandlerResult.Nothing;
        } else if (!event.repeat && event.keyCode !== VKeyCodes.shiftKey
            && event.keyCode !== VKeyCodes.altKey && event.keyCode !== VKeyCodes.metaKey) {
          this.remove();
          VHandler.remove(this);
          return HandlerResult.Nothing;
        }
        return HandlerResult.Prevent;
      }, box);
    }
  };

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
      vPort.post({ handler: "key", key: currentKeys + key });
      return esc(HandlerResult.Prevent);
    } else {
      currentKeys += key; nextKeys = j !== 1 ? j : keyMap;
      return HandlerResult.Prevent;
    }
  };

  const InsertMode = {
    focus: null as never as (event: LockableFocusEvent) => void,
    global: null as { code: number, stat: number, hud: boolean } | null,
    suppressType: null as string | null,
    last: null as HTMLElement | null,
    loading: (document.readyState !== "complete"),
    lock: null as HTMLElement | null,
    mutable: true,
    init (): void {
      /** if `notBody` then `activeEl` is not null  */
      let activeEl = document.activeElement as Element, notBody = activeEl !== document.body;
      this.focus = this.lockFocus;
      this.init = null as never;
      KeydownEvents = new Uint8Array(256);
      if (VSettings.cache.grabBackFocus && this.loading) {
        if (notBody) {
          activeEl.blur && activeEl.blur();
          notBody = (activeEl = document.activeElement as Element) !== document.body;
        }
        if (!notBody) {
          return this.setupGrab();
        }
      }
      if (notBody && VDom.getEditableType(activeEl)) {
        this.lock = activeEl as HTMLElement;
      }
    },
    setupGrab (): void {
      this.focus = this.grabBackFocus;
      VHandler.push(this.ExitGrab, this);
      addEventListener("mousedown", this.ExitGrab, true);
    },
    ExitGrab: function (this: void, event: MouseEvent | KeyboardEvent | "other"): HandlerResult.Nothing | void {
      const _this = InsertMode;
      _this.focus = _this.lockFocus;
      removeEventListener("mousedown", _this.ExitGrab, true);
      VHandler.remove(_this);
      event === "other" || !window.frames.length && window === window.top ||
      vPort.post({ handler: "exitGrab" });
      if (event instanceof KeyboardEvent) { return HandlerResult.Nothing; }
    } as {
      (this: void, event: MouseEvent | "other"): void;
      (this: void, event: KeyboardEvent): HandlerResult.Nothing;
    },
    grabBackFocus (event: LockableFocusEvent): void {
      event.stopImmediatePropagation();
      event.target.blur();
    },
    lockFocus (event: LockableFocusEvent): void {
      const target = event.target;
      this.lock = target;
      if (this.mutable) {
        this.last = target;
      }
    },
    isActive (): boolean {
      if (this.suppressType) { return false; }
      if (this.lock !== null || this.global) {
        return true;
      }
      let el = document.activeElement;
      if (el && (el as HTMLElement).isContentEditable && el instanceof HTMLElement) {
        this.lock = el;
        return true;
      } else {
        return false;
      }
    },
    exit (event: KeyboardEvent): void {
      let target: Element | null = event.target as Element;
      if ((target as HTMLElement).shadowRoot && target instanceof HTMLElement) {
        if (target = this.lock) {
          this.lock = null;
          (target as HTMLElement).blur();
        }
      } else if (target === this.lock ? (this.lock = null, 1) : VDom.getEditableType(target)) {
        (target as HTMLElement).blur();
      }
      if (this.global) {
        this.global.hud && HUD.hide();
        this.lock = null; this.global = null;
      }
    },
    onExitSuppress: null as ((this: void) => void) | null,
  };

  VEventMode = {
    lock (this: void): Element | null { return InsertMode.lock; },
    onWndBlur (this: void, f): void { ELs.OnWndBlur = f; },
    OnWndFocus (this: void): (this: void) => void { return ELs.OnWndFocus; },
    mapKey (this: void, key): string { return mapKeys !== null && mapKeys[key] || key; },
    exitGrab (this: void): void { return InsertMode.ExitGrab("other"); },
    scroll (this: void, event): void {
      if (!event || event.shiftKey || event.altKey) { return; }
      const keyCode = event.keyCode;
      if (!(keyCode >= VKeyCodes.pageup && keyCode <= VKeyCodes.down)) { return; }
      const ctrl = event.ctrlKey || event.metaKey;
      if (keyCode >= VKeyCodes.left) {
        VScroller.scrollBy((1 - (keyCode & 1)) as 0 | 1, keyCode < VKeyCodes.left + 2 ? -1 : 1, <0 | 1> +ctrl);
      } else if (ctrl) { return; }
      else if (keyCode > VKeyCodes.pageup + 1) {
        VScroller.scrollTo(1, 0, (keyCode & 1) as 0 | 1);
      } else {
        VScroller.scrollBy(1, keyCode === VKeyCodes.pageup ? -0.5 : 0.5, "viewSize");
      }
    },
    setupSuppress (this: void, onExit): void {
      const mode = InsertMode, f = mode.onExitSuppress;
      mode.onExitSuppress = mode.suppressType = null;
      if (onExit) {
        mode.suppressType = window.getSelection().type;
        mode.onExitSuppress = onExit;
      }
      if (f) { return f(); }
    },
    suppress (this: void, key?: number): void { key && (KeydownEvents[key] = 1); },
    keydownEvents: function (this: void, arr?: KeydownCacheArray): KeydownCacheArray | void {
      if (!isEnabledForUrl) { throw Error("vimium-disabled"); }
      if (!arr) { return KeydownEvents; }
      KeydownEvents = arr;
    } as VEventMode["keydownEvents"]
  };

const Pagination = {
  followLink (linkElement: Element): boolean {
    if (linkElement instanceof HTMLLinkElement) {
      Commands.reload(linkElement.href);
    } else {
      VDom.isVisibile(linkElement) || linkElement.scrollIntoView();
      VDom.UI.flash(linkElement);
      setTimeout(function() { VDom.UI.click(linkElement); }, 0);
    }
    return true;
  },
  goBy (relName: string, pattern: CmdOptions["goNext"]["patterns"]): void {
    if (!VDom.isHTML() || this.findAndFollowRel(relName)) {
      return;
    }
    const arr = typeof pattern === "string" && pattern
      ? pattern.split(/\s*,\s*/).filter(function(s): boolean { return s.length > 0; })
      : (pattern instanceof Array) ? pattern : [],
    isNext = relName === "next";
    if (arr.length > 0 && this.findAndFollowLink(arr, isNext ? "<" : ">")) {
      return;
    }
    return VHUD.showForDuration(`No links to go ${isNext ? "next" : "previous"}`);
  },
  GetLinks (this: Hint[], element: Element): void {
    if (!(element instanceof HTMLElement) || element instanceof HTMLFormElement) { return; }
    let s: string | null;
    const isClickable = element instanceof HTMLAnchorElement
      || element.vimiumHasOnclick || element.getAttribute("onclick")
      || (s = element.getAttribute("role")) && s.toLowerCase() === "link"
      || VHints.ngEnabled && element.getAttribute("ng-click");
    if (!isClickable) { return; }
    if ((s = element.getAttribute("aria-disabled")) != null && (!s || s.toLowerCase() === "true")) { return; }
    const rect = element.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2 && VDom.isStyleVisible(window.getComputedStyle(element))) {
      this.push(element as HTMLElement | Hint as Hint);
    }
  },
  findAndFollowLink (linkStrings: string[], refusedStr: string): boolean {
    interface Candidate {
      [0]: HTMLElement;
      [1]: number;
      [2]: number;
      [3]: string;
    }
    const links = VHints.traverse({"*": this.GetLinks}, document) as Hint[] | HTMLElement[] as HTMLElement[];
    const names: string[] = [];
    let candidates: Candidate[] = [], ch: string, _len: number, s: string;
    for (s of linkStrings) { if (s = s ? s + "" : "") { names.push(s); } }
    links.push(document.documentElement as HTMLElement);
    const re1 = <RegExpOne> /\s+/, re2 = <RegExpOne> /\b/;
    for (_len = links.length - 1; 0 <= --_len; ) {
      const link = links[_len];
      if (link.contains(links[_len + 1])) { continue; }
      s = link.innerText;
      if (s.length > 99) { continue; }
      if (!s && !(s = (ch = (link as HTMLInputElement).value) && ch.toLowerCase && ch || link.title)) { continue; }
      s = s.toLowerCase();
      for (ch of names) {
        if (s.indexOf(ch) !== -1) {
          if (s.indexOf(refusedStr) === -1) {
            candidates.push([link, s.trim().split(re1).length, candidates.length, s]);
          }
          break;
        }
      }
    }
    if (candidates.length <= 0) { return false; }
    candidates = candidates.sort(function(a, b): number { return (a[1] - b[1]) || (a[2] - b[2]); });
    _len = candidates[0][1] + 1;
    candidates = candidates.filter(function(a) { return a[1] <= _len; });
    for (s of names) {
      const re3 = re2.test(s[0]) || re2.test(s.slice(-1))
        ? new RegExp("\\b" + s + "\\b", "i") : new RegExp(s, "i");
      for (let cand of candidates) {
        if (re3.test(cand[3])) {
          return this.followLink(cand[0]);
        }
      }
    }
    return false;
  },
  findAndFollowRel (relName: string): boolean {
    const elements = document.querySelectorAll("[rel]"),
    relTags = Object.setPrototypeOf({a: 1, area: 1, link: 1}, null);
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
    Focus (this: void, request: BgReq["focusFrame"]): void {
      if (request.frameId < 0) {}
      else if (window.innerWidth < 3 || window.innerHeight < 3
        || document.body instanceof HTMLFrameSetElement) {
        vPort.post({
          handler: "nextFrame"
        });
        return;
      }
      setTimeout(function() { window.focus(); }, 0);
      esc();
      VEventMode.suppress(request.lastKey);
      if (request.frameId < -1 || !VDom.isHTML()) { return; }
      let _this = FrameMask, dom1: HTMLDivElement | null;
      if (dom1 = _this.node) {
        _this.more = true;
      } else {
        dom1 = VDom.createElement("div");
        dom1.setAttribute("style", "background:none;border:5px solid yellow;box-shadow:none;\
box-sizing:border-box;display:block;float:none;height:100%;left:0;margin:0;\
opacity:1;pointer-events:none;position:fixed;top:0;width:100%;z-index:2147483647;");
        _this.node = dom1;
        _this.timer = setInterval(_this.Remove, 200);
      }
      dom1.style.borderColor = request.frameId === -1 ? "lightsalmon" : "yellow";
      VDom.UI.root && isEnabledForUrl ? VDom.UI.addElement(dom1) :
      (document.webkitFullscreenElement || document.documentElement as HTMLElement).appendChild(dom1);
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
      this.timer = this.enabled ? setTimeout(this.hide, duration || 1500) : 0;
    },
    show (text: string): void {
      if (!this.enabled || !VDom.isHTML()) { return; }
      this.opacity = 1; this.text = text;
      if (this.timer) { clearTimeout(this.timer); this.timer = 0; }
      let el = this.box, i = el ? +(el.style.opacity || 1) : 0;
      if (i > 0) {
        ((el as HTMLDivElement).firstChild as Text).data = text;
        if (i === 1) { return; }
      }
      this.tweenId || (this.tweenId = setInterval(this.tween, 40));
      if (el) { return; }
      el = VDom.createElement("div");
      el.className = "R HUD";
      el.style.opacity = "0";
      el.style.visibility = "hidden";
      el.appendChild(document.createTextNode(text));
      VDom.UI.addElement(this.box = el, {adjust: false});
    },
    tween (this: void): void {
      if (!VHUD) { return; }
      const hud = HUD, el = hud.box as HTMLDivElement, st = el.style;
      let opacity = +(st.opacity || 1);
      if (opacity === hud.opacity) {}
      else if (opacity === 0) {
        st.opacity = "0.25";
        st.visibility = "";
        (el.firstChild as Text).data = hud.text;
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
      const r = requestHandlers;
      VSettings.cache = request.load;
      request.load.onMac && (VKeyboard.correctionMap = Object.create<string>(null));
      clearInterval(VSettings.timer);
      r.keyMap(request);
      r.reset(request);
      InsertMode.loading = false;
      r.init = null as never;
      return VDom.documentReady(ELs.OnReady);
    },
    reset (request): void {
      const newPassKeys = request.passKeys,
      enabled = isEnabledForUrl = (newPassKeys !== "");
      enabled && InsertMode.init && InsertMode.init();
      enabled === !requestHandlers.init && ELs.hook(enabled ? addEventListener : removeEventListener, 1);
      if (!enabled) {
        VScroller.current = VDom.lastHovered = InsertMode.last = InsertMode.lock = null;
        VHints.deactivate(); Vomnibar.hide(VomnibarNS.HideType.DoNothing);
      }
      passKeys = (newPassKeys && parsePassKeys(newPassKeys)) as SafeDict<true> | null;
      if (VDom.UI.box) { return VDom.UI.toggle(enabled); }
    },
    checkIfEnabled: VSettings.checkIfEnabled,
    settingsUpdate (request): void {
      let ref = VSettings.cache, i: string;
      type Keys = keyof SettingsNS.FrontendSettings;
      Object.setPrototypeOf(request, null);
      delete request.name;
      for (i in request) {
        ref[i as Keys] = request[i as Keys] as SettingsNS.FrontendSettings[Keys];
      }
      if ("userDefinedOuterCss" in request) { return ELs.OnReady(true); }
    },
    insertInnerCSS: VDom.UI.InsertInnerCSS,
    focusFrame: FrameMask.Focus,
    exitGrab: VEventMode.exitGrab,
    keyMap (request): void {
      const map = keyMap = request.keyMap, func = Object.setPrototypeOf;
      func(map, null);
      function iter(obj: ReadonlyChildKeyMap): void {
        func(obj, null);
        for (let key in obj) { if (obj[key] !== 0) {
          iter(obj[key] as ReadonlyChildKeyMap);
        } }
      };
      for (let key in map) {
        let sec = map[key];
        if (sec === 0 || sec === 1) { continue; }
        iter(sec);
      }
      (mapKeys = request.mapKeys) && func(mapKeys, null);
    },
    execute (request): void {
      VUtils.execCommand(Commands, request.command, request.count, request.options);
    },
    createMark: VMarks.CreateGlobalMark,
    scroll: VMarks.Goto,
    showHUD (request): void {
      return HUD[(request.isCopy ? "showCopied" : "showForDuration") as "showForDuration"](request.text);
    },
  showHelpDialog (request): void {
    let box: HTMLElement, oldShowHelp: typeof Commands.showHelp, hide: (this: void, e?: Event) => void
      , node1: HTMLElement, shouldShowAdvanced = request.advanced === true;
    box = VDom.createElement("div");
    box.innerHTML = request.html;
    box = box.firstElementChild as HTMLElement;
    hide = function(event: Event): void { event.stopImmediatePropagation(); };
    box.onclick = hide;
    box.addEventListener("mousewheel", hide, {passive: true});

    hide = function(event): void {
      event && event.preventDefault && event.preventDefault();
      VDom.lastHovered && box.contains(VDom.lastHovered) && (VDom.lastHovered = null);
      VScroller.current && box.contains(VScroller.current) && (VScroller.current = null);
      VHandler.remove(box);
      box.remove();
      Commands.showHelp = oldShowHelp;
    };
    node1 = box.querySelector("#OptionsPage") as HTMLAnchorElement;
    if (! window.location.href.startsWith(request.optionUrl)) {
      const optionUrl = (node1 as HTMLAnchorElement).href = request.optionUrl;
      node1.onclick = function(event) {
        event.preventDefault();
        vPort.post({ handler: "focusOrLaunch", url: optionUrl });
        return hide();
      };
    } else {
      node1.remove();
    }
    node1 = box.querySelector("#AdvancedCommands") as HTMLElement;
    function toggleAdvanced(this: void): void {
      (node1.firstChild as Text).data = (shouldShowAdvanced ? "Hide" : "Show") + " advanced commands";
      box.classList.toggle("HelpAdvanced");
    };
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
    VDom.UI.addElement(box, Vomnibar.status ? undefined : {before: Vomnibar.box});
    window.focus();
    VScroller.current = box;
    VHandler.push(function(event) {
      if (!InsertMode.lock && VKeyboard.isEscape(event)) {
        VDom.UI.removeSelection() || hide();
        return 2;
      }
      return 0;
    }, box);
  }
  };

  ELs.hook(addEventListener);
  VHUD = HUD;

  VSettings.destroy = function(silent) {
    let f: typeof removeEventListener | typeof VSettings.onDestroy = removeEventListener, el: HTMLElement | null;
    isEnabledForUrl = false;
    clearInterval(VSettings.timer);

    ELs.hook(f);
    f("mousedown", InsertMode.ExitGrab, true);
    f("webkitfullscreenchange", VDom.UI.adjust, true);
    VEventMode.setupSuppress();
    VFindMode.init || VFindMode.toggleStyle(0);
    el = VDom.UI.box;
    (f = VSettings.onDestroy) && (f as (this: void) => any)();

    VUtils = VKeyboard = VDom = VRect = VHandler = //
    VHints = Vomnibar = VScroller = VMarks = VFindMode = //
    VSettings = VHUD = VPort = VEventMode = VVisualMode = null as never;
    el && el.remove();

    silent || console.log("%cVimium++%c in %c%s%c has destroyed at %o."
      , "color:red", "color:auto", "color:darkred"
      , window.location.pathname.replace(<RegExpOne> /^.*\/([^\/]+)\/?$/, "$1")
      , "color:auto", Date.now());

    if (vPort.port) { try { vPort.port.disconnect(); } catch (e) {} }
    isInjected || location.protocol.startsWith("chrome") || (window.chrome = null as never);
  };
})();
