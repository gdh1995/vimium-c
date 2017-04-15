var VMarks = {
  onKeypress: null as never as (event: HandlerNS.Event, keyChar: string) => void,
  prefix: true,
  activate (_0: number, options: FgOptions): void {
    Object.setPrototypeOf(options = options || {} as FgOptions, null);
    const isGo = options.mode !== "create";
    this.onKeypress = isGo ? this._goto : this._create;
    this.prefix = options.prefix !== false;
    VHandler.push(this.onKeydown, this);
    return VHUD.show(isGo ? "Go to mark..." : "Create mark...");
  },
  clearLocal (): void {
    let keyStart, storage: Storage, i: number, key: string;
    this._previous = null;
    keyStart = this.getLocationKey("");
    try {
    storage = localStorage;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i) as string;
      if (key.startsWith(keyStart)) {
        storage.removeItem(key);
      }
    }
    } catch (e) {}
    return VHUD.showForDuration("Local marks have been cleared.", 1000);
  },
  onKeydown (event: HandlerNS.Event): HandlerResult {
    const keyCode = event.keyCode, cont = !VKeyboard.isEscape(event);
    let keyChar: string | undefined;
    if (cont && (keyCode > VKeyCodes.f1 && keyCode <= VKeyCodes.f12 || keyCode <= VKeyCodes.space
        || !(keyChar = VKeyboard.getKeyChar(event)))) {
      return 1;
    }
    VHandler.remove(this);
    cont && keyCode > VKeyCodes.space ? this.onKeypress(event, keyChar as string) : VHUD.hide();
    this.prefix = true;
    this.onKeypress = null as never;
    return 2;
  },
  getBaseUrl (this: void): string {
    return window.location.href.split('#', 1)[0];
  },
  getLocationKey (keyChar: string): string {
    return `vimiumMark|${this.getBaseUrl()}|${keyChar}`;
  },
  _previous: null as MarksNS.FgMark | null,
  setPreviousPosition (): void {
    this._previous = { scrollX: window.scrollX, scrollY: window.scrollY };
  },
  _create (event: HandlerNS.Event, keyChar: string): void {
    if (event.shiftKey) {
      if (window.top === window) {
        return this.CreateGlobalMark({markName: keyChar});
      } else {
        VPort.post({handler: "createMark", markName: keyChar});
        return VHUD.hide();
      }
    } else if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition();
      return VHUD.showForDuration("Created local mark [last].", 1000);
    } else {
      try {
        localStorage.setItem(this.getLocationKey(keyChar),
          JSON.stringify({ scrollX: window.scrollX, scrollY: window.scrollY } as MarksNS.FgMark));
      } catch (e) {
        return VHUD.showForDuration("Failed to creat local mark (localStorage error)", 2000);
      }
      return VHUD.showForDuration(`Created local mark : ' ${keyChar} '.`, 1000);
    }
  },
  _goto (event: HandlerNS.Event, keyChar: string): void {
    let markString: string | undefined | null, position = null as MarksNS.FgMark | null;
    if (event.shiftKey) {
      VPort.send({
        handler: "gotoMark",
        prefix: this.prefix,
        markName: keyChar
      }, function(req): void {
        if (req === false) {
          return VHUD.showForDuration("Global mark not set : ' " + keyChar + " '.");
        }
      });
      return VHUD.hide();
    } else if (keyChar === "`" || keyChar === "'") {
      position = this._previous;
      this.setPreviousPosition();
      if (position) {
        window.scrollTo(position.scrollX, position.scrollY);
      }
      return VHUD.showForDuration((position ? "Jumped to" : "Created") + " local mark [last]", 1000);
    } else {
      try {
        markString = localStorage.getItem(this.getLocationKey(keyChar));
        markString && (position = JSON.parse(markString));
        position = !position || typeof position !== "object" ? null
          : Object.setPrototypeOf(position, null);
      } catch (e) {}
      if (position && position.scrollX >= 0 && position.scrollY >= 0) {
        this.setPreviousPosition();
        window.scrollTo(position.scrollX, position.scrollY);
        return VHUD.showForDuration(`Jumped to local mark : ' ${keyChar} '.`, 1000);
      } else {
        return VHUD.showForDuration(markString ? "unrecognized mark data in localStorage"
          : `Local mark not set : ' ${keyChar} '.`, 2000);
      }
    }
  },
  CreateGlobalMark (this: void, request: { markName: string }): void {
    VPort.post({
      handler: "createMark",
      markName: request.markName,
      url: VMarks.getBaseUrl(),
      scroll: [window.scrollX, window.scrollY]
    });
    return VHUD.showForDuration(`Created global mark : ' ${request.markName} '.`, 1000);
  },
  Goto (this: void, request: BgReq["scroll"]): void {
    const scroll = request.scroll, a = request.markName || "";
    (document.body instanceof HTMLFrameSetElement) || window.focus();
    a && VMarks.setPreviousPosition();
    window.scrollTo(scroll[0], scroll[1]);
    if (a) { return VHUD.showForDuration(`Jumped to global mark : ' ${a} '.`, 2000); }
  }
};
