var VMarks = {
  onKeyChar: null as never as (event: HandlerNS.Event, keyChar: string) => void,
  prefix: true,
  swap: true,
  activate (_0: number, options: FgOptions): void {
    const isGo = options.mode !== "create";
    this.onKeyChar = isGo ? this._goto : this._create;
    this.prefix = options.prefix !== false;
    this.swap = options.swap === true;
    VUtils.push(this.onKeydown, this);
    return VHUD.show(isGo ? "Go to mark…" : "Create mark…");
  },
  onKeydown (event: HandlerNS.Event): HandlerResult {
    const keyCode = event.keyCode, cont = !VKeyboard.isEscape(event);
    let keyChar: string | undefined;
    if (cont && (keyCode > VKeyCodes.f1 && keyCode < VKeyCodes.minNotFn || keyCode < VKeyCodes.minNotSpace
        || !(keyChar = VKeyboard.getKeyChar(event)) || keyChar.length !== 1)) {
      return 1;
    }
    VUtils.remove(this);
    cont && keyCode > VKeyCodes.space ? this.onKeyChar(event, keyChar as string) : VHUD.hide();
    this.prefix = this.swap = true;
    this.onKeyChar = null as never;
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
    if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition();
      return VHUD.showForDuration("Created local mark [last].", 1000);
    } else if (event.shiftKey !== this.swap) {
      if (window.top === window) {
        return this.createMark(keyChar);
      } else {
        VPort.post({handler: "marks", action: "create", markName: keyChar});
        return VHUD.hide();
      }
    } else {
      return this.createMark(keyChar, "local");
    }
  },
  _goto (event: HandlerNS.Event, keyChar: string): void {
    if (keyChar === "`" || keyChar === "'") {
      const pos = this._previous;
      this.setPreviousPosition();
      if (pos) {
        window.scrollTo(pos[0], pos[1]);
      }
      return VHUD.showForDuration((pos ? "Jumped to" : "Created") + " local mark [last]", 1000);
    }
    const req: Req.fg<"marks"> & { action: "goto" } = {
      handler: "marks", action: "goto",
      prefix: this.prefix,
      markName: keyChar
    };
    if (event.shiftKey !== this.swap) {
      VHUD.hide();
    } else {
      try {
        let pos = null, key = this.getLocationKey(keyChar), markString = localStorage.getItem(key);
        if (markString && (pos = JSON.parse(markString)) && typeof pos === "object") {
          const { scrollX, scrollY } = VUtils.safer(pos);
          if (scrollX >= 0 && scrollY >= 0) {
            (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).old = {
              scrollX: scrollX | 0, scrollY: scrollY | 0
            };
            localStorage.removeItem(key);
          }
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
    const { scroll, local, markName: a } = options;
    a && this.setPreviousPosition();
    window.scrollTo(scroll[0], scroll[1]);
    local || VEventMode.focusAndListen();
    if (a) {
      return VHUD.showForDuration(`Jumped to ${local ? "local" : "global"} mark : ' ${a} '.`, local ? 1000 : 2000);
    }
  }
};
