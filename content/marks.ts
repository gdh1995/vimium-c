var VMarks = {
  onKeyChar_: null as never as (event: HandlerNS.Event, keyChar: string) => void,
  prefix_: true,
  swap_: true,
  count_: 0,
  activate_ (this: void, count: number, options: CmdOptions[kFgCmd.marks]): void {
    const a = VMarks;
    const isGo = options.mode !== "create";
    a.onKeyChar_ = isGo ? a._goto : a._create;
    a.count_ = count < 0 || count > 9 ? 0 : count - 1;
    a.prefix_ = options.prefix !== false;
    a.swap_ = options.swap === true;
    VUtils.push_(a.onKeydown_, a);
    return VHud.show_((isGo ? "Go to" : "Create") + " mark\u2026");
  },
  onKeydown_ (event: HandlerNS.Event): HandlerResult {
    const keyCode = event.keyCode, cont = !VKeyboard.isEscape_(event);
    let keyChar: string | undefined;
    if (cont && (keyCode > VKeyCodes.f1 && keyCode < VKeyCodes.minNotFn || keyCode < VKeyCodes.minNotSpace
        || !(keyChar = VKeyboard.char_(event)) || keyChar.length !== 1)) {
      return 1;
    }
    VUtils.remove_(this);
    cont && keyCode > VKeyCodes.space ? this.onKeyChar_(event, keyChar as string) : VHud.hide_();
    this.prefix_ = this.swap_ = true;
    this.onKeyChar_ = null as never;
    return 2;
  },
  getLocationKey_ (keyChar: string): string {
    return `vimiumMark|${location.href.split("#", 1)[0]}|${keyChar}`;
  },
  previous_: [] as Array<MarksNS.FgMark>, // [0..8]
  setPreviousPosition_ (idx?: number): void {
    this.previous_[<number> <number | string> idx | 0] = [ scrollX, scrollY, location.hash ];
  },
  _create (event: HandlerNS.Event, keyChar: string): void {
    if (keyChar === "`" || keyChar === "'") {
      this.setPreviousPosition_(this.count_);
      return VHud.tip_("Created local mark [last].", 1000);
    } else if (event.shiftKey !== this.swap_) {
      if (top === window) {
        return this.createMark_(keyChar);
      } else {
        VPort.post_({H: kFgReq.marks, a: kMarkAction.create, n: keyChar});
        return VHud.hide_();
      }
    } else {
      return this.createMark_(keyChar, "local");
    }
  },
  _goto (event: HandlerNS.Event, keyChar: string): void {
    const a = this;
    if (keyChar === "`" || keyChar === "'") {
      const count = a.count_, pos = a.previous_[count];
      a.setPreviousPosition_(pos ? 0 : count);
      if (pos) {
        a.ScrollTo_(pos);
      }
      return VHud.tip_(`${pos ? "Jumped to" : "Created"} local mark [ ${count ? count + 1 : "last"} ]`, 1000);
    }
    const req: Extract<Req.fg<kFgReq.marks>, { a: kMarkAction.goto }> = {
      H: kFgReq.marks, a: kMarkAction.goto,
      p: a.prefix_,
      n: keyChar
    };
    if (event.shiftKey !== a.swap_) {
      VHud.hide_();
    } else {
      try {
        let pos = null, key = a.getLocationKey_(keyChar), storage = localStorage, markString = storage.getItem(key);
        if (markString && (pos = JSON.parse(markString)) && typeof pos === "object") {
          const { scrollX, scrollY, hash } = VUtils.safer_(pos);
          if (scrollX >= 0 && scrollY >= 0) {
            (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).o = {
              x: scrollX | 0, y: scrollY | 0, h: "" + (hash || "")
            };
            storage.removeItem(key);
          }
        }
      } catch {}
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).l = true;
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).u = location.href;
    }
    VPort.post_(req);
  },
  ScrollTo_ (this: void, scroll: Readonly<MarksNS.FgMark>) {
    if (scroll[1] === 0 && scroll[2] && scroll[0] === 0) {
      location.hash = scroll[2] as string;
    } else {
      scrollTo(scroll[0], scroll[1]);
    }
  },
  createMark_ (markName: string, local?: "local"): void {
    VPort.post_<kFgReq.marks>({
      H: kFgReq.marks,
      a: kMarkAction.create,
      l: !!local,
      n: markName,
      u: location.href,
      s: [scrollX | 0, scrollY | 0]
    });
    return VHud.tip_(`Created ${local || "global"} mark : ' ${markName} '.`, 1000);
  },
  GoTo_ (this: void, _0: number, options: CmdOptions[kFgCmd.goToMarks]): void {
    const { s: scroll, l: local, n: a } = options;
    a && VMarks.setPreviousPosition_();
    VMarks.ScrollTo_(scroll);
    local || VEvent.focusAndListen_();
    if (a) {
      return VHud.tip_(`Jumped to ${local ? "local" : "global"} mark : ' ${a} '.`, local ? 1000 : 2000);
    }
  }
};
