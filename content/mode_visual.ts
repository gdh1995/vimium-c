declare namespace VisualModeNS {
  const enum ValidActions {

  }
  /** 1 means right; 0 means left */
  type ForwardDir = 0 | 1;
  const enum G {
    character = 0, line = 1, lineboundary = 2, paragraph = 3, sentence = 4, word = 6, documentboundary = 7,
  }
  const enum VimG {
    vimword = 5,
  }
  const enum DiType {
    Normal = 0,
    TextBox = 1,
    ShadowDOM = 2,
  }
}
var VVisual = {
  mode_: VisualModeNS.Mode.NotActive,
  hud_: "",
  hudTimer_: 0,
  currentCount_: 0,
  currentSeconds_: null as SafeDict<VisualModeNS.ValidActions> | null,
  retainSelection_: false,
  selection_: null as never as Selection,
  activate_ (this: void, _0: number, options: CmdOptions[kFgCmd.visualMode]): void {
    const a = VVisual, F = VFind, m = a.movement_;
    let sel: Selection, type: SelType, mode: CmdOptions[kFgCmd.visualMode]["mode"] = options.mode;
    a.init_ && a.init_(options.words as string);
    VDom.docSelectable_ = VDom.UI.getDocSelectable_();
    m.selection_ = a.selection_ = sel = VDom.UI.getSelection_();
    F.css_ = options.findCSS || F.css_;
    VScroller.prepareTop_();
    VUtils.remove_(a);
    VUtils.push_(a.onKeydown_, a);
    type = a.realType_(sel);
    if (!a.mode_) { a.retainSelection_ = type === SelType.Range; }
    a.mode_ = mode;
    if (mode !== VisualModeNS.Mode.Caret) {
      m.alterMethod_ = "extend";
      if (!VEvent.lock() && /* (type === SelType.Caret || type === SelType.Range) */ type) {
        const { left: l, top: t, right: r, bottom: b} = sel.getRangeAt(0).getBoundingClientRect();
        VDom.getZoom_(1);
        VDom.prepareCrop_();
        if (!VDom.cropRectToVisible_(l, t, (l || r) && r + 3, (t || b) && b + 3)) {
          sel.removeAllRanges();
        } else if (type === SelType.Caret) {
          m.extend_(1);
          a.realType_(sel) === SelType.Range || m.extend_(0);
        }
        type = a.realType_(sel);
      }
      if (type !== SelType.Range) {
        mode = VisualModeNS.Mode.Caret;
      }
    }
    a.hudTimer_ && clearTimeout(a.hudTimer_);
    VHUD.show_(a.hud_ = (mode === VisualModeNS.Mode.Caret ? "Caret" : mode === VisualModeNS.Mode.Line ? "Line" : "Visual") + " mode", !!options.from_find);
    if (a.mode_ !== mode) {
      a.mode_ = mode;
      a.prompt_("No usable selection, entering caret mode\u2026", 1000);
    }
    VDom.UI.toggleSelectStyle_(1);
    if (mode !== VisualModeNS.Mode.Caret) { return mode === VisualModeNS.Mode.Line ? m.extendToLine_() : undefined; }
    m.alterMethod_ = "move";
    if (type === SelType.Range) {
      m.collapse_(m.getDirection_());
    } else if (/* type === SelType.None */ !type && a.establishInitialSelectionAnchor_()) {
      a.deactivate_();
      return VHUD.tip("Create a selection before entering visual mode.");
    }
    m.extend_(1);
    m.scrollIntoView_();
  },
  deactivate_ (isEsc?: 1): void {
    if (!this.mode_) { return; }
    VUtils.remove_(this);
    if (!this.retainSelection_) {
      this.movement_.collapseSelectionTo_(isEsc && this.mode_ !== VisualModeNS.Mode.Caret ? 1 : 0);
    }
    const el = VEvent.lock();
    el && el.blur && el.blur();
    VDom.UI.toggleSelectStyle_(0);
    VScroller.top_ = null;
    this.mode_ = VisualModeNS.Mode.NotActive; this.hud_ = "";
    this.retainSelection_ = false;
    this.resetKeys_();
    this.selection_ = this.movement_.selection_ = null as never;
    return VHUD.hide_();
  },
  realType_: null as never as (sel: Selection) => SelType,
  onKeydown_ (event: KeyboardEvent): HandlerResult {
    let i: VKeyCodes | KeyStat = event.keyCode, count = 0;
    if (i > VKeyCodes.maxNotFn && i < VKeyCodes.minNotFn) { return i === VKeyCodes.f1 ? HandlerResult.Prevent : HandlerResult.Nothing; }
    if (i === VKeyCodes.enter) {
      i = VKeyboard.getKeyStat_(event);
      if ((i & KeyStat.shiftKey) && this.mode_ !== VisualModeNS.Mode.Caret) { this.retainSelection_ = true; }
      (i & KeyStat.PrimaryModifier) ? this.deactivate_() : this.yank_(i === KeyStat.altKey || null);
      return HandlerResult.Prevent;
    }
    if (VKeyboard.isEscape_(event)) {
      this.currentCount_ || this.currentSeconds_ ? this.resetKeys_() : this.deactivate_(1);
      return HandlerResult.Prevent;
    }
    const ch = VKeyboard.char(event);
    if (!ch) { this.resetKeys_(); return i === VKeyCodes.ime || i === VKeyCodes.menuKey ? HandlerResult.Nothing : HandlerResult.Suppress; }
    let key = VKeyboard.key(event, ch), obj: SafeDict<VisualModeNS.ValidActions> | null | VisualModeNS.ValidActions | undefined;
    key = VEvent.mapKey_(key);
    if (obj = this.currentSeconds_) {
      obj = obj[key];
      count = this.currentCount_;
      this.resetKeys_();
    }
    if (obj != null) {}
    else if (key.length === 1 && (i = +key[0]) < 10 && (i || this.currentCount_)) {
      this.currentCount_ = this.currentCount_ * 10 + i;
      this.currentSeconds_ = null;
    } else if ((obj = this.keyMap_[key]) == null) {
      this.currentCount_ = 0;
    } else if (typeof obj === "object") {
      this.currentSeconds_ = obj;
      obj = null;
    } else {
      count = this.currentCount_;
      this.currentCount_ = 0;
    }
    if (obj == null) { return ch.length === 1 && ch === key ? HandlerResult.Prevent : HandlerResult.Suppress; }
    VUtils.prevent_(event);
    this.commandHandler_(obj, count || 1);
    return HandlerResult.Prevent;
  },
  resetKeys_ (): void {
    this.currentCount_ = 0; this.currentSeconds_ = null;
  },
  commandHandler_ (command: VisualModeNS.ValidActions, count: number): void {
    const movement = this.movement_, mode = this.mode_;
    if (command > 50) {
      if (command > 60) {
        return VScroller.scrollBy_(1, (command === 61 ? 1 : -1) * count, 0);
      }
      if (command === 55) {
        clearTimeout(this.hudTimer_);
        return VFind.activate_(1, VUtils.safer_({ returnToViewport: true }));
      }
      if (command === 53 && mode !== VisualModeNS.Mode.Caret) {
        const len = movement.selection_.toString().length;
        len && movement.collapse_(+(movement.getDirection_() <= +(len <= 1)) as BOOL);
      }
      return this.activate_(1, VUtils.safer_({
        // command === 1 ? VisualModeNS.Mode.Visual : command === 2 : VisualModeNS.Mode.Line : VisualModeNS.Mode.Caret
        mode: command - 50
      }));
    }
    mode === VisualModeNS.Mode.Caret && movement.collapseSelectionTo_(0);
    if (command > 35) {
      this.find_(command - 36 ? -count : count);
    } else if (command > 30) {
      // 31 : y, Y, C, p, P : 35
      this.yank_([null, (movement.selectLine_(count), null), true as true,
          ReuseType.current as ReuseType.current, ReuseType.newFg as ReuseType.newFg][command - 31]);
    } else if (command > 20) {
      movement.selectLexicalEntity_((command - 20) as VisualModeNS.G.sentence | VisualModeNS.G.word, count);
    } else if (command === 20) {
      movement.setDi_();
      movement.reverseSelection_();
    } else {
      movement.runMovements_((command & 1) as 0 | 1, command >>> 1, count);
    }
    mode === VisualModeNS.Mode.Caret ? movement.extend_(1)
    : mode === VisualModeNS.Mode.Line ? movement.extendToLine_() : 0;
    movement.scrollIntoView_();
  },
  establishInitialSelectionAnchor_ (): boolean {
    let node: Text | null, str: string | undefined, offset: number;
    if (!VDom.isHTML_()) { return true; }
    VDom.getZoom_(1);
    VDom.prepareCrop_();
    const nodes = document.createTreeWalker(document.body || document.documentElement as HTMLElement, NodeFilter.SHOW_TEXT);
    while (node = nodes.nextNode() as Text | null) {
      if (50 <= (str = node.data).length && 50 < str.trim().length) {
        const element = node.parentElement;
        // Note(gdh1995): I'm not sure whether element might be null
        if (element && VDom.getVisibleClientRect_(element) && !VDom.getEditableType_(element)) {
          break;
        }
      }
    }
    if (!node) { return true; }
    offset = ((str as string).match(<RegExpOne>/^\s*/) as RegExpMatchArray)[0].length;
    this.selection_.collapse(node, offset);
    return !this.selection_.rangeCount;
  },
  prompt_ (text: string, duration: number): void {
    this.hudTimer_ && clearTimeout(this.hudTimer_);
    this.hudTimer_ = setTimeout(this.ResetHUD_, duration);
    return VHUD.show_(text);
  },
  ResetHUD_ (i?: TimerType.fake | undefined): void {
    const _this = VVisual;
    if (!_this || i) { return; }
    _this.hudTimer_ = 0;
    if (_this.hud_) { return VHUD.show_(_this.hud_); }
  },
  find_ (count: number): void {
    if (!VFind.query_) {
      VPort.send_({ msg: kFgReq.findQuery }, function(query): void {
        if (query) {
          VFind.updateQuery_(query);
          return VVisual.find_(count);
        } else {
          return VVisual.prompt_("No history queries", 1000);
        }
      });
      return;
    }
    const sel = this.selection_, range = sel.getRangeAt(0);
    VFind.execute_(null, { noColor: true, count });
    if (VFind.hasResults_) {
      if (this.mode_ === VisualModeNS.Mode.Caret && this.realType_(sel) === SelType.Range) {
        this.activate_(1, Object.create(null) as SafeObject & CmdOptions[kFgCmd.visualMode]);
      }
      return;
    }
    sel.removeAllRanges();
    sel.addRange(range);
    return this.prompt_("No matches for " + VFind.query_, 1000);
  },
  yank_ (action?: true | ReuseType.current | ReuseType.newFg | null): void {
    const str = this.selection_.toString();
    if (action === true) {
      this.prompt_(VHUD.copied(str, "", true), 2000);
      action = null;
    } else {
      this.deactivate_();
      action != null || VHUD.copied(str);
    }
    VPort.post(action != null ? { H: kFgReq.openUrl, url: str, reuse: action }
        : { H: kFgReq.copy, data: str });
  },

movement_: {
  D: ["backward", "forward"] as ["backward", "forward"],
  G: ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"] as
     ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"],
  alterMethod_: "" as "move" | "extend",
  diOld_: 0 as VisualModeNS.ForwardDir,
  diNew_: 0 as VisualModeNS.ForwardDir,
  diType: VisualModeNS.DiType.Normal,
  noExtend_: false,
  selection_: null as never as Selection,
  wordRe_: null as never as RegExpOne,
  extend_ (d: VisualModeNS.ForwardDir): void | 1 {
    return this.selection_.modify("extend", this.D[d], "character");
  },
  modify_ (d: VisualModeNS.ForwardDir, g: VisualModeNS.G): void | 1 {
    return this.selection_.modify(this.alterMethod_, this.D[d], this.G[g as 0 | 1 | 2]);
  },
  setDi_ (): VisualModeNS.ForwardDir { return this.diNew_ = this.getDirection_(); },
  getNextForwardCharacter_ (isMove: boolean): string | null {
    const beforeText = this.selection_.toString();
    if (beforeText.length > 0 && !this.getDirection_(true)) {
      this.noExtend_ = true;
      return beforeText[0];
    }
    this.extend_(1);
    const afterText = this.selection_.toString();
    if (afterText.length !== beforeText.length || beforeText !== afterText) {
      this.noExtend_ = isMove;
      isMove && this.extend_(0);
      return afterText[afterText.length - 1];
    }
    this.noExtend_ = false;
    return null;
  },
  runMovements_ (direction: VisualModeNS.ForwardDir, granularity: VisualModeNS.G | VisualModeNS.VimG, count: number): void {
    if (granularity === VisualModeNS.VimG.vimword || granularity === VisualModeNS.G.word) {
      if (direction) { return this.moveForwardByWord_(granularity === VisualModeNS.VimG.vimword, count); }
      granularity = VisualModeNS.G.word;
    }
    let sel = this.selection_, m = this.alterMethod_, d = this.D[direction], g = this.G[granularity as 0 | 1 | 2];
    while (0 < count--) { sel.modify(m, d, g); }
  },
  moveForwardByWord_ (vimLike: boolean, count: number): void {
    let ch: string | null = null, isMove = this.alterMethod_ !== "extend";
    this.getDirection_(); this.diNew_ = 1; this.noExtend_ = false;
    while (0 < count--) {
      do {
        if (this.noExtend_ && this.moveByChar_(isMove)) { return; }
      } while ((ch = this.getNextForwardCharacter_(isMove)) && vimLike === this.wordRe_.test(ch));
      do {
        if (this.noExtend_ && this.moveByChar_(isMove)) { return; }
      } while ((ch = this.getNextForwardCharacter_(isMove)) && vimLike !== this.wordRe_.test(ch));
    }
    // `ch &&` is needed according to tests for command `w`
    ch && !this.noExtend_ && this.extend_(0);
  },
  hashSelection_ (): string {
    const sel = this.selection_;
    return sel.toString().length + "/" + sel.anchorOffset + "/" + sel.focusOffset;
  },
  moveByChar_ (isMove: boolean): boolean {
    const before = isMove || this.hashSelection_();
    this.modify_(1, VisualModeNS.G.character);
    return isMove ? false : this.hashSelection_() === before;
  },
  reverseSelection_ (): void {
    const a = this, direction = a.getDirection_(true), newDi = (1 - direction) as VisualModeNS.ForwardDir,
    sel = a.selection_;
    if (VVisual.realType_(sel) !== SelType.Range) {
      return;
    }
    if (a.diType === VisualModeNS.DiType.TextBox || a.diType === VisualModeNS.DiType.ShadowDOM) {
      let length = sel.toString().length;
      a.collapse_(newDi);
      for (let i = 0; i < length; i++) { a.extend_(newDi); }
      if (a.diType === VisualModeNS.DiType.ShadowDOM) {
        for (let delta, tick = 0; tick < 16 && (delta = sel.toString().length - length); tick++) {
          a.extend_(delta < 0 ? newDi : direction);
        }
      }
    } else {
      const { anchorNode, anchorOffset } = sel;
      a.collapse_(newDi);
      sel.extend(anchorNode as Node, anchorOffset);
    }
    a.diNew_ = a.diOld_ = newDi;
  },
  _compare: null as never as Node["compareDocumentPosition"],
  getDirection_ (cache?: boolean): VisualModeNS.ForwardDir {
    const a = this;
    if (cache && a.diOld_ === a.diNew_) { return a.diOld_; }
    a.diType = VisualModeNS.DiType.Normal;
    // common HTML nodes
    const sel = a.selection_, {anchorNode, focusNode} = sel;
    if (anchorNode != focusNode) {
      return a.diOld_ = (a._compare.call(anchorNode as Node, focusNode as Node) & /** DOCUMENT_POSITION_FOLLOWING */ 4) ? 1 : 0;
    }
    const { anchorOffset, focusOffset } = sel;
    if (anchorOffset !== focusOffset) {
      return a.diOld_ = anchorOffset < focusOffset ? 1 : 0;
    }
    // editable text elements
    const lock = VEvent.lock();
    if (lock && (VDom.editableTypes_[lock.tagName.toLowerCase()] as EditableType) > EditableType.Select
        && lock.parentElement === anchorNode) {
      const childNodes = VDom.Getter_(Node, anchorNode as Element, "childNodes") || (anchorNode as Element).childNodes,
      child = childNodes[anchorOffset];
      if (!child || lock === child) {
        return a._touchTextBox(lock as HTMLInputElement | HTMLTextAreaElement);
      }
    }
    if (anchorNode instanceof Text) {
      return a.diOld_ = 1;
    }
    // nodes under shadow DOM
    const initial = sel.toString().length;
    a.extend_(1);
    let change = sel.toString().length - initial, di: VisualModeNS.ForwardDir = change ? 1 : 0;
    a.extend_(0);
    /**
     * Note (tested on C70):
     * the `extend` above may go back by 2 steps when cur pos is the right of an element with `select:all`,
     * so a detection and the third `extend` may be necessary
     */
    let change2 = change >= 0 ? sel.toString().length - initial : 0;
    change2 < 0 && a.extend_(1);
    change = change || change2;
    this.diType = VisualModeNS.DiType.ShadowDOM;
    return a.diOld_ = change > 0 ? di : change < 0 ? (1 - di) as VisualModeNS.ForwardDir : 1;
  },
  _touchTextBox (el: HTMLInputElement | HTMLTextAreaElement): VisualModeNS.ForwardDir {
    let di: BOOL = el.selectionDirection === "backward" ? 0 : 1,
    start = el.selectionStart,
    focusOffset = di ? el.selectionEnd : start;
    // Chrome 60/70 need this "extend" action; otherwise a text box would "blur" and a mess gets selected
    if (!di || focusOffset && (start !== focusOffset)) {
      let testDi: BOOL = di || focusOffset ? 0 : 1
      this.extend_(testDi);
      focusOffset !== (di ? el.selectionEnd : el.selectionStart) && this.extend_((1 - testDi) as BOOL);
    }
    this.diType = VisualModeNS.DiType.TextBox;
    return this.diOld_ = di;
  },
  collapseSelectionTo_ (toFocus: VisualModeNS.ForwardDir) {
    VVisual.realType_(this.selection_) === SelType.Range && this.collapse_((this.getDirection_() ^ toFocus) as BOOL);
  },
  collapse_ (/** to-left if text is left-to-right */ toStart: BOOL): void | 1 {
    return toStart ? this.selection_.collapseToStart() : this.selection_.collapseToEnd();
  },
  selectLexicalEntity_ (entity: VisualModeNS.G, count: number): void {
    this.collapseSelectionTo_(1);
    entity === VisualModeNS.G.word && this.modify_(1, VisualModeNS.G.character);
    this.modify_(0, entity);
    this.collapseSelectionTo_(1);
    return this.runMovements_(1, entity, count);
  },
  selectLine_ (count: number): void | 1 {
    this.alterMethod_ = "extend";
    this.setDi_() && this.reverseSelection_();
    this.modify_(0, VisualModeNS.G.lineboundary);
    this.reverseSelection_();
    while (0 < --count) { this.modify_(1, VisualModeNS.G.line); }
    this.modify_(1, VisualModeNS.G.lineboundary);
    const ch = this.getNextForwardCharacter_(false);
    if (ch && !this.noExtend_ && ch !== "\n") {
      return this.extend_(0);
    }
  },
  extendToLine_ (): void {
    this.setDi_();
    for (let i = 2; 0 < i--; ) {
      this.modify_(this.diOld_, VisualModeNS.G.lineboundary);
      this.reverseSelection_();
    }
  },
  scrollIntoView_ (): void {
    const focused = VDom.getSelectionEdgeElement_(this.selection_, this.getDirection_());
    if (focused) { return VScroller.scrollIntoView_unsafe_(focused); }
  },
},

keyMap_: {
  l: 1, h: 0, j: 3, k: 2, e: 13, b: 12, w: 11, ")": 9, "(": 8, "}": 7, "{": 6,
  0: 4, $: 5, G: 15, g: { g: 14 }, B: 12, W: 11,
  o: 20,
  a: {
    w: 26, s: 24
  },
  y: 31, Y: 32, C: 33, p: 34, P: 35,
  n: 36, N: 37,
  v: 51, V: 52, c: 53,
  "/": 55,
  "<c-e>": 61, "<c-y>": 62, "<c-down>": 61, "<c-up>": 62,
} as {
  [key: string]: VisualModeNS.ValidActions | {
    [key: string]: VisualModeNS.ValidActions;
  };
} as SafeDict<VisualModeNS.ValidActions | SafeDict<VisualModeNS.ValidActions>>,
init_ (words: string) {
  this.init_ = null as never;
  const typeIdx = { None: SelType.None, Caret: SelType.Caret, Range: SelType.Range };
  this.movement_._compare = Node.prototype.compareDocumentPosition;
  this.realType_ = VSettings.cache.browserVer === BrowserVer.$Selection$NotShowStatusInTextBox
  ? function(sel: Selection): SelType {
    let type = typeIdx[sel.type];
    return type === SelType.Caret && sel.toString().length ? SelType.Range : type;
  } : function(sel: Selection): SelType {
    return typeIdx[sel.type];
  };
  var map = this.keyMap_, func = VUtils.safer_;
  this.movement_.wordRe_ = new RegExp(words);
  func(map); func(map.a as Dict<VisualModeNS.ValidActions>); func(map.g as Dict<VisualModeNS.ValidActions>);
}
};
