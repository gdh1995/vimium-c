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
  getLocationKey (keyChar: string): string {
    return `vimiumMark|${location.href.split('#', 1)[0]}|${keyChar}`;
  },
  _previous: null as MarksNS.FgMark | null,
  setPreviousPosition (): void {
    this._previous = [ window.scrollX, window.scrollY ];
  },
  _create (event: HandlerNS.Event, keyChar: string): void {
    if (event.shiftKey) {
      if (window.top === window) {
        return this.createMark(keyChar);
      } else {
        VPort.post({handler: "marks", action: "create", markName: keyChar});
        return VHUD.hide();
      }
    } else if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition();
      return VHUD.showForDuration("Created local mark [last].", 1000);
    } else {
      return this.createMark(keyChar, "local");
    }
  },
  _goto (event: HandlerNS.Event, keyChar: string): void {
    if (keyChar === "`" || keyChar === "'") {
      const position = this._previous;
      this.setPreviousPosition();
      if (position) {
        window.scrollTo(position[0], position[1]);
      }
      return VHUD.showForDuration((position ? "Jumped to" : "Created") + " local mark [last]", 1000);
    }
    const req: Req.fg<"marks"> & { action: "goto" } = {
      handler: "marks", action: "goto",
      prefix: this.prefix,
      markName: keyChar
    };
    if (event.shiftKey) {
      VHUD.hide();
    } else {
      try {
        let position: any, key = this.getLocationKey(keyChar), markString = localStorage.getItem(key);
        markString && (position = JSON.parse(markString));
        position = !position || typeof position !== "object" ? null
          : Object.setPrototypeOf(position, null);
        if (position && position.scrollX >= 0 && position.scrollY >= 0) {
          (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).old = position;
          localStorage.removeItem(key);
        }
      } catch (e) {}
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).local = true;
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).url = location.href;
    }
    VPort.post(req);
  },
  createMark (markName: string, local?: "local"): void {
    VPort.post({
      handler: "marks",
      action: "create",
      local: !!local,
      markName,
      url: location.href,
      scroll: [window.scrollX | 0, window.scrollY | 0]
    });
    return VHUD.showForDuration(`Created ${local || "global"} mark : ' ${markName} '.`, 1000);
  },
  goTo (_0: number, options: CmdOptions["Marks.goTo"]): void {
    const { scroll, local } = options, a = options.markName || "";
    local || (document.body instanceof HTMLFrameSetElement) || VEventMode.focusAndListen();
    a && this.setPreviousPosition();
    window.scrollTo(scroll[0], scroll[1]);
    if (a) {
      return VHUD.showForDuration(`Jumped to ${local ? "local" : "global"} mark : ' ${a} '.`, local ? 1000 : 2000);
    }
  }
};
