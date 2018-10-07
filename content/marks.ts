var VMarks = {
  onKeyChar_: null as never as (event: HandlerNS.Event, keyChar: string) => void,
  prefix_: true,
  swap_: true,
  activate_ (this: void, _0: number, options: CmdOptions["marks"]): void {
    const a = VMarks;
    const isGo = options.mode !== "create";
    a.onKeyChar_ = isGo ? a._goto : a._create;
    a.prefix_ = options.prefix !== false;
    a.swap_ = options.swap === true;
    VUtils.push_(a.onKeydown_, a);
    return VHUD.show_(isGo ? "Go to mark\u2026" : "Create mark\u2026");
  },
  onKeydown_ (event: HandlerNS.Event): HandlerResult {
    const keyCode = event.keyCode, cont = !VKeyboard.isEscape_(event);
    let keyChar: string | undefined;
    if (cont && (keyCode > VKeyCodes.f1 && keyCode < VKeyCodes.minNotFn || keyCode < VKeyCodes.minNotSpace
        || !(keyChar = VKeyboard.char(event)) || keyChar.length !== 1)) {
      return 1;
    }
    VUtils.remove_(this);
    cont && keyCode > VKeyCodes.space ? this.onKeyChar_(event, keyChar as string) : VHUD.hide_();
    this.prefix_ = this.swap_ = true;
    this.onKeyChar_ = null as never;
    return 2;
  },
  getLocationKey_ (keyChar: string): string {
    return `vimiumMark|${location.href.split('#', 1)[0]}|${keyChar}`;
  },
  _previous: null as MarksNS.FgMark | null,
  setPreviousPosition_ (): void {
    this._previous = [ window.scrollX, window.scrollY, location.hash ];
  },
  _create (event: HandlerNS.Event, keyChar: string): void {
    if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition_();
      return VHUD.showForDuration("Created local mark [last].", 1000);
    } else if (event.shiftKey !== this.swap_) {
      if (window.top === window) {
        return this.createMark_(keyChar);
      } else {
        VPort.post({handler: "marks", action: "create", markName: keyChar});
        return VHUD.hide_();
      }
    } else {
      return this.createMark_(keyChar, "local");
    }
  },
  _goto (event: HandlerNS.Event, keyChar: string): void {
    if (keyChar === "`" || keyChar === "'") {
      const pos = this._previous;
      this.setPreviousPosition_();
      if (pos) {
        this._scroll(pos);
      }
      return VHUD.showForDuration((pos ? "Jumped to" : "Created") + " local mark [last]", 1000);
    }
    const req: Req.fg<"marks"> & { action: "goto" } = {
      handler: "marks", action: "goto",
      prefix: this.prefix_,
      markName: keyChar
    };
    if (event.shiftKey !== this.swap_) {
      VHUD.hide_();
    } else {
      try {
        let pos = null, key = this.getLocationKey_(keyChar), markString = localStorage.getItem(key);
        if (markString && (pos = JSON.parse(markString)) && typeof pos === "object") {
          const { scrollX, scrollY, hash } = VUtils.safer_(pos);
          if (scrollX >= 0 && scrollY >= 0) {
            (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).old = {
              scrollX: scrollX | 0, scrollY: scrollY | 0, hash: "" + (hash || "")
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
  _scroll(scroll: MarksNS.FgMark) {
    if (scroll[1] === 0 && scroll[2] && scroll[0] === 0) {
      location.hash = scroll[2] as string;
    } else {
      window.scrollTo(scroll[0], scroll[1]);
    }
  },
  createMark_ (markName: string, local?: "local"): void {
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
  GoTo_ (this: void, _0: number, options: CmdOptions["goToMarks"]): void {
    const { scroll, local, markName: a } = options;
    a && VMarks.setPreviousPosition_();
    VMarks._scroll(scroll);
    local || VEventMode.focusAndListen_();
    if (a) {
      return VHUD.showForDuration(`Jumped to ${local ? "local" : "global"} mark : ' ${a} '.`, local ? 1000 : 2000);
    }
  }
};
