declare namespace VisualModeNS {
  const enum Action {

  }
  type ValidActions = VisualModeNS.Action | ((this: any, count: number) => any);
  type ForwardDir = 0 | 1;
  const enum G {
    character = 0, line = 1, lineboundary = 2, paragraph = 3, sentence = 4, word = 6, documentboundary = 7,
  }
  const enum VimG {
    vimword = 5,
  }

  const enum Mode {
    NotActive = 0, Default = NotActive,
    Visual = 1,
    Caret = 2,
    Line = 3,
  }
}
var VVisualMode = {
  mode: VisualModeNS.Mode.NotActive,
  hud: "",
  hudTimer: 0,
  currentCount: 0,
  currentSeconds: null as SafeDict<VisualModeNS.ValidActions> | null,
  retainSelection: false,
  selection: null as never as Selection,
  activate (this: void, _0: number, options: CmdOptions["visualMode"]): void {
    const a = VVisualMode;
    let sel: Selection, type: string, mode: VisualModeNS.Mode, str: string;
    a.init && a.init(options.words as string);
    VDom.docSelectable = VDom.UI.getDocSelectable();
    a.movement.selection = a.selection = sel = VDom.UI.getSelection();
    VUtils.remove(a);
    VUtils.push(a.onKeydown, a);
    type = VDom.selType(sel);
    if (!a.mode) { a.retainSelection = type === "Range"; }
    str = typeof options.mode === "string" ? options.mode.toLowerCase() : "";
    a.mode = mode = str ? str === "caret" ? VisualModeNS.Mode.Caret : str === "line" ? VisualModeNS.Mode.Line
      : (str = "", VisualModeNS.Mode.Visual) : VisualModeNS.Mode.Visual;
    if (mode !== VisualModeNS.Mode.Caret) {
      a.movement.alterMethod = "extend";
      const lock = VEventMode.lock_();
      if (!lock && (type === "Caret" || type === "Range")) {
        const { left: l, top: t, right: r, bottom: b} = sel.getRangeAt(0).getBoundingClientRect();
        VDom.getZoom(1);
        VDom.prepareCrop();
        if (!VDom.cropRectToVisible(l, t, (l || r) && r + 3, (t || b) && b + 3)) {
          sel.removeAllRanges();
        } else if (type === "Caret") {
          a.movement.extendByOneCharacter(1) || a.movement.extend(0);
        }
        type = VDom.selType(sel);
      }
      if (type !== "Range" && (!lock || sel.toString().length <= 0)) {
        mode = VisualModeNS.Mode.Caret; str = "caret";
      }
    }
    a.hudTimer && clearTimeout(a.hudTimer);
    VHUD.show_(a.hud = (str ? str[0].toUpperCase() + str.substring(1) : "Visual") + " mode", !!options.from_find);
    if (a.mode !== mode) {
      a.mode = mode;
      a.prompt("No usable selection, entering caret mode\u2026", 1000);
    }
    VDom.UI.toggleSelectStyle(true);
    if (mode !== VisualModeNS.Mode.Caret) { return mode === VisualModeNS.Mode.Line ? a.movement.extendToLine() : undefined; }
    a.movement.alterMethod = "move";
    if (type === "Range") {
      a.movement.collapseSelectionTo(0);
    } else if (type === "None" && a.establishInitialSelectionAnchor()) {
      a.deactivate();
      return VHUD.showForDuration("Create a selection before entering visual mode.");
    }
    a.movement.extend(1);
    a.movement.scrollIntoView();
  },
  deactivate (isEsc?: 1): void {
    if (!this.mode) { return; }
    VUtils.remove(this);
    if (!this.retainSelection) {
      this.movement.collapseSelectionTo(isEsc && this.mode !== VisualModeNS.Mode.Caret ? 1 : 0);
    }
    const el = VEventMode.lock_();
    el && VDom.getEditableType(el) && el.blur && el.blur();
    VDom.UI.toggleSelectStyle(false);
    this.mode = VisualModeNS.Mode.NotActive; this.hud = "";
    this.retainSelection = false;
    this.selection = this.movement.selection = null as never;
    return VHUD.hide_();
  },
  onKeydown (event: KeyboardEvent): HandlerResult {
    let i: VKeyCodes | KeyStat = event.keyCode, count = 0;
    if (i > VKeyCodes.maxNotFn && i < VKeyCodes.minNotFn) { return i === VKeyCodes.f1 ? HandlerResult.Prevent : HandlerResult.Nothing; }
    if (i === VKeyCodes.enter) {
      i = VKeyboard.getKeyStat(event);
      if ((i & KeyStat.shiftKey) && this.mode !== VisualModeNS.Mode.Caret) { this.retainSelection = true; }
      (i & KeyStat.PrimaryModifier) ? this.deactivate() : this.yank(i === KeyStat.altKey || null);
      return HandlerResult.Prevent;
    }
    if (VKeyboard.isEscape(event)) {
      this.currentCount || this.currentSeconds ? this.resetKeys() : this.deactivate(1);
      return HandlerResult.Prevent;
    }
    const ch = VKeyboard.getKeyChar(event);
    if (!ch) { this.resetKeys(); return i === VKeyCodes.ime || i === VKeyCodes.menuKey ? HandlerResult.Nothing : HandlerResult.Suppress; }
    let key = VKeyboard.getKey(event, ch), obj: SafeDict<VisualModeNS.ValidActions> | null | VisualModeNS.ValidActions | undefined;
    key = VEventMode.mapKey_(key);
    if (obj = this.currentSeconds) {
      obj = obj[key];
      count = this.currentCount;
      this.resetKeys();
    }
    if (obj != null) {}
    else if (key.length === 1 && (i = +key[0]) < 10 && (i || this.currentCount)) {
      this.currentCount = this.currentCount * 10 + i;
      this.currentSeconds = null;
    } else if ((obj = this.keyMap[key]) == null) {
      this.currentCount = 0;
    } else if (typeof obj === "object") {
      this.currentSeconds = obj;
      obj = null;
    } else {
      count = this.currentCount;
      this.currentCount = 0;
    }
    if (obj == null) { return ch.length === 1 && ch === key ? HandlerResult.Prevent : HandlerResult.Suppress; }
    this.commandHandler(obj, count || 1);
    return HandlerResult.Prevent;
  },
  resetKeys (): void {
    this.currentCount = 0; this.currentSeconds = null;
  },
  commandHandler (command: VisualModeNS.ValidActions, count: number): any {
    if (command > 50) {
      if (command > 60) {
        return VScroller.scrollBy(1, (command === 61 ? 1 : -1) * count, 0);
      }
      if (command === 53 && this.mode !== VisualModeNS.Mode.Caret) {
        const flag = this.selection.toString().length > 1;
        this.movement.collapseSelectionTo(+flag as 0 | 1);
      }
      return this.activate(1, VUtils.safer({ mode: ["visual", "line", "caret"][(command as number - 51) as 0 | 1 | 2] }));
    }
    this.mode === VisualModeNS.Mode.Caret && this.movement.collapseSelectionTo(0);
    if (command >= 0) {
      this.movement.runMovements(((command as number) & 1) as 0 | 1, (command as number) >>> 1, count);
    } else {
      (command as (count: number) => any).call(this, count);
    }
    return this.mode === VisualModeNS.Mode.Caret ? this.movement.extend(1)
    : this.mode === VisualModeNS.Mode.Line ? this.movement.extendToLine() : 0;
  },
  establishInitialSelectionAnchor (): boolean {
    let node: Text | null, element: Element, str: string | undefined, offset: number;
    if (!VDom.isHTML()) { return true; }
    VDom.getZoom(1);
    VDom.prepareCrop();
    const nodes = document.createTreeWalker(document.body || document.documentElement as HTMLElement, NodeFilter.SHOW_TEXT);
    while (node = nodes.nextNode() as Text | null) {
      if (50 <= (str = node.data).length && 50 < str.trim().length) {
        element = node.parentElement as Element;
        if (element instanceof HTMLFormElement) { continue; }
        if (VDom.getVisibleClientRect(element) && !VDom.getEditableType(element)) {
          break;
        }
      }
    }
    if (!node) { return true; }
    offset = ((str as string).match(<RegExpOne>/^\s*/) as RegExpMatchArray)[0].length;
    this.selection.collapse(node, offset);
    return !this.selection.rangeCount;
  },
  prompt (text: string, duration: number): void {
    this.hudTimer && clearTimeout(this.hudTimer);
    this.hudTimer = setTimeout(this.ResetHUD, duration);
    return VHUD.show_(text);
  },
  ResetHUD (i?: TimerType.fake | undefined): void {
    const _this = VVisualMode;
    if (!_this || i) { return; }
    _this.hudTimer = 0;
    if (_this.hud) { return VHUD.show_(_this.hud); }
  },
  find (count: number): void {
    if (!VFindMode.query) {
      VPort.send_({ handler: "findQuery" }, function(query): void {
        if (query) {
          VFindMode.updateQuery(query);
          return VVisualMode.find(count);
        } else {
          return VVisualMode.prompt("No history queries", 1000);
        }
      });
      return;
    }
    const range = this.selection.getRangeAt(0);
    VFindMode.execute(null, { noColor: true, count });
    if (VFindMode.hasResults) {
      if (this.mode === VisualModeNS.Mode.Caret && this.selection.toString().length > 0) {
        this.activate(1, Object.create(null) as SafeObject & CmdOptions["visualMode"]);
      }
      return;
    }
    this.selection.removeAllRanges();
    this.selection.addRange(range);
    return this.prompt("No matches for " + VFindMode.query, 1000);
  },
  yank (action?: true | ReuseType.current | ReuseType.newFg | null): void {
    const str = this.selection.toString();
    if (action === true) {
      this.prompt(VHUD.showCopied(str, "", true), 2000);
      action = null;
    } else {
      this.deactivate();
      action != null || VHUD.showCopied(str);
    }
    VPort.post(action != null ? { handler: "openUrl", url: str, reuse: action }
        : { handler: "copy", data: str });
  },

movement: {
  D: ["backward", "forward"] as ["backward", "forward"],
  G: ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"] as
     ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"],
  alterMethod: "" as "move" | "extend",
  diOld: 0 as VisualModeNS.ForwardDir,
  diNew: 0 as VisualModeNS.ForwardDir,
  noExtend: false,
  selection: null as never as Selection,
  wordRe: null as never as RegExpOne,
  extend (d: VisualModeNS.ForwardDir): void | 1 {
    return this.selection.modify("extend", this.D[d], "character");
  },
  modify (d: VisualModeNS.ForwardDir, g: VisualModeNS.G): void | 1 {
    return this.selection.modify(this.alterMethod, this.D[d], this.G[g as 0 | 1 | 2]);
  },
  setDi (): VisualModeNS.ForwardDir { return this.diNew = this.getDirection(); },
  getNextForwardCharacter (isMove: boolean): string | null {
    const beforeText = this.selection.toString();
    if (beforeText.length > 0 && !this.getDirection(true)) {
      this.noExtend = true;
      return beforeText[0];
    }
    this.extend(1);
    const afterText = this.selection.toString();
    if (afterText.length !== beforeText.length || beforeText !== afterText) {
      this.noExtend = isMove;
      isMove && this.extend(0);
      return afterText[afterText.length - 1];
    }
    this.noExtend = false;
    return null;
  },
  runMovements (direction: VisualModeNS.ForwardDir, granularity: VisualModeNS.G | VisualModeNS.VimG, count: number): void {
    if (granularity === VisualModeNS.VimG.vimword || granularity === VisualModeNS.G.word) {
      if (direction) { return this.moveForwardByWord(granularity === VisualModeNS.VimG.vimword, count); }
      granularity = VisualModeNS.G.word;
    }
    let sel = this.selection, m = this.alterMethod, d = this.D[direction], g = this.G[granularity as 0 | 1 | 2];
    while (0 < count--) { sel.modify(m, d, g); }
  },
  moveForwardByWord (vimLike: boolean, count: number): void {
    let ch: string | null = null, isMove = this.alterMethod !== "extend";
    this.getDirection(); this.diNew = 1; this.noExtend = false;
    while (0 < count--) {
      do {
        if (this.noExtend && this.moveByChar(isMove)) { return; }
      } while ((ch = this.getNextForwardCharacter(isMove)) && vimLike === this.wordRe.test(ch));
      do {
        if (this.noExtend && this.moveByChar(isMove)) { return; }
      } while ((ch = this.getNextForwardCharacter(isMove)) && vimLike !== this.wordRe.test(ch));
    }
    // `ch &&` is needed according to tests for command `w`
    ch && !this.noExtend && this.extend(0);
  },
  hashSelection (): string {
    const range = this.selection.getRangeAt(0);
    return this.selection.toString().length + "/" +
      range.anchorOffset + "/" + range.focusOffset + "/" +
      this.selection.extentOffset + "/" +this.selection.baseOffset;
  },
  moveByChar (isMove: boolean): boolean {
    const before = isMove || this.hashSelection();
    this.modify(1, VisualModeNS.G.character);
    return isMove ? false : this.hashSelection() === before;
  },
  reverseSelection (): void {
    const el = VEventMode.lock_(), direction = this.getDirection(true);
    if (el && !(el instanceof HTMLFormElement)
        && (VDom.editableTypes[el.nodeName.toLowerCase()] as EditableType) > EditableType.Embed) {
      let length = this.selection.toString().length;
      this.collapseSelectionTo(1);
      this.diNew = this.diOld = (1 - direction) as VisualModeNS.ForwardDir;
      while (0 < length--) { this.modify(this.diOld, 0); }
      return;
    }
    const original = this.selection.getRangeAt(0),
    str = direction ? "start" : "end";
    this.diNew = this.diOld = (1 - direction) as VisualModeNS.ForwardDir;
    this.collapse(this.diNew);
    this.selection.extend(original[(str + "Container") as "endContainer"], original[(str + "Offset") as "endOffset"]);
  },
  extendByOneCharacter (direction: VisualModeNS.ForwardDir): number {
    const length = this.selection.toString().length;
    this.extend(direction);
    return this.selection.toString().length - length;
  },
  getDirection (cache?: boolean): VisualModeNS.ForwardDir {
    let di: VisualModeNS.ForwardDir = 1, change: number;
    if (cache && this.diOld === this.diNew) { return this.diOld; }
    if (change = this.extendByOneCharacter(di) || this.extendByOneCharacter(di = 0)) {
      this.extend((1 - di) as VisualModeNS.ForwardDir);
    }
    return this.diOld = change > 0 ? di : change < 0 ? (1 - di) as VisualModeNS.ForwardDir : 1;
  },
  collapseSelectionTo (direction: VisualModeNS.ForwardDir) {
    this.selection.toString().length > 0 && this.collapse(this.getDirection() - direction);
  },
  collapse (toStart: number): void | 1 {
    return toStart ? this.selection.collapseToStart() : this.selection.collapseToEnd();
  },
  selectLexicalEntity (entity: VisualModeNS.G, count: number): void {
    this.collapseSelectionTo(1);
    entity === VisualModeNS.G.word && this.modify(1, VisualModeNS.G.character);
    this.modify(0, entity);
    this.collapseSelectionTo(1);
    return this.runMovements(1, entity, count);
  },
  selectLine (count: number): void | 1 {
    this.alterMethod = "extend";
    this.setDi() && this.reverseSelection();
    this.modify(0, VisualModeNS.G.lineboundary);
    this.reverseSelection();
    while (0 < --count) { this.modify(1, VisualModeNS.G.line); }
    this.modify(1, VisualModeNS.G.lineboundary);
    const ch = this.getNextForwardCharacter(false);
    if (ch && !this.noExtend && ch !== "\n") {
      return this.extend(0);
    }
  },
  extendToLine (): void {
    this.setDi();
    for (let i = 2; 0 < i--; ) {
      this.modify(this.diOld, VisualModeNS.G.lineboundary);
      this.reverseSelection();
    }
  },
  scrollIntoView (): void {
    if (!this.selection.rangeCount) { return; }
    const focused = VDom.getElementWithFocus(this.selection, this.getDirection());
    if (focused) { return VScroller.scrollIntoView(focused); }
  },
},

keyMap: {
  l: 1, h: 0, j: 3, k: 2, e: 13, b: 12, w: 11, ")": 9, "(": 8, "}": 7, "{": 6,
  0: 4, $: 5, G: 15, g: { g: 14 }, B: 12, W: 11,
  v: 51, V: 52, c: 53,
  a: {
    w (count): void {
      return (this as typeof VVisualMode).movement.selectLexicalEntity(VisualModeNS.G.word, count);
    },
    s (count): void {
      return (this as typeof VVisualMode).movement.selectLexicalEntity(VisualModeNS.G.sentence, count);
    }
  },
  n (count): void { return (this as typeof VVisualMode).find(count); },
  N (count): void { return (this as typeof VVisualMode).find(-count); },
  "/": function(): void | boolean {
    clearTimeout((this as typeof VVisualMode).hudTimer);
    return VFindMode.activate(1, VUtils.safer({ returnToViewport: true }));
  },
  y (): void { return (this as typeof VVisualMode).yank(); },
  Y (count): void { (this as typeof VVisualMode).movement.selectLine(count); return (this as typeof VVisualMode).yank(); },
  C (): void { return (this as typeof VVisualMode).yank(true); },
  p (): void { return (this as typeof VVisualMode).yank(0); },
  P (): void { return (this as typeof VVisualMode).yank(-1); },
  o (): void {
    (this as typeof VVisualMode).movement.setDi();
    return (this as typeof VVisualMode).movement.reverseSelection();
  },
  "<c-e>": 61, "<c-y>": 62, "<c-down>": 61, "<c-up>": 62
} as {
  [key: string]: VisualModeNS.ValidActions | {
    [key: string]: VisualModeNS.ValidActions;
  };
} as SafeDict<VisualModeNS.ValidActions | SafeDict<VisualModeNS.ValidActions>>,

init: function(words: string) {
  this.init = null as never;
  var map = this.keyMap, func = VUtils.safer;
  this.movement.wordRe = new RegExp(words);
  func(map); func(map.a as Dict<VisualModeNS.ValidActions>); func(map.g as Dict<VisualModeNS.ValidActions>);
}
};
