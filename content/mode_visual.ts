/**
 * Note(gdh1995):
 * - @unknown_di_result: means it does not guarantee anything about @di
 * - @safe_di: means it accepts any @di and will force @di to be correct on return
 * - @tolerate_di_if_caret: means it only allows a mistaken di in caret mode, and always returns with a correct di
 * - @not_related_to_di: means it has no knowledge or influence on @di
 * - all others: need a correct @di, and will force @di to be correct on return
 */
declare namespace VisualModeNS {
  const enum ValidActions {

  }
  const enum G {
    character = 0, line = 1, lineboundary = 2, paragraph = 3, sentence = 4, word = 6, documentboundary = 7,
  }
  const enum VimG {
    vimword = 5,
  }
  const enum DiType {
    Normal = 0,
    TextBox = 1,
    Unknown = 2,
    __mask = -1,
  }
}
var VVisual = {
  mode_: VisualModeNS.Mode.NotActive,
  hud_: "",
  hudTimer_: 0,
  currentCount_: 0,
  currentSeconds_: null as SafeDict<VisualModeNS.ValidActions> | null,
  retainSelection_: false,
  scope_: null as ShadowRoot | null,
  selection_: null as never as Selection,
  /** @safe_di */
  activate_ (this: void, _0: number, options: CmdOptions[kFgCmd.visualMode]): void {
    const a = VVisual, F = VFind;
    a.init_ && a.init_(options.words as string);
    VUtils.remove_(a);
    VDom.docSelectable_ = VDom.UI.getDocSelectable_();
    VScroller.prepareTop_();
    a.diType_ = VisualModeNS.DiType.Unknown;
    let theSelected = VDom.UI.getSelected_(),
    sel: Selection = a.selection_ = theSelected[0],
    type: SelType = a.realType_(sel), mode: CmdOptions[kFgCmd.visualMode]["mode"] = options.mode;
    a.scope_ = theSelected[1];
    F.css = options.findCSS || F.css;
    if (!a.mode_) { a.retainSelection_ = type === SelType.Range; }
    if (mode !== VisualModeNS.Mode.Caret) {
      if (!VEvent.lock() && /* (type === SelType.Caret || type === SelType.Range) */ type) {
        const { left: l, top: t, right: r, bottom: b} = sel.getRangeAt(0).getBoundingClientRect();
        VDom.getZoom_(1);
        VDom.prepareCrop_();
        if (!VDom.cropRectToVisible_(l, t, (l || r) && r + 3, (t || b) && b + 3)) {
          sel.removeAllRanges();
        } else if (type === SelType.Caret) {
          a.extend_(1);
          a.realType_(sel) === SelType.Range || a.extend_(0);
        }
        type = a.realType_(sel);
      }
    }
    const isRange = type === SelType.Range, newMode = isRange ? mode : VisualModeNS.Mode.Caret,
    toCaret = newMode === VisualModeNS.Mode.Caret;
    a.hudTimer_ && clearTimeout(a.hudTimer_);
    VHUD.show_(a.hud_ = (toCaret ? "Caret" : newMode === VisualModeNS.Mode.Line ? "Line" : "Visual") + " mode", !!options.from_find);
    if (newMode !== mode) {
      a.prompt_("No usable selection, entering caret mode\u2026", 1000);
    }
    VDom.UI.toggleSelectStyle_(1);
    a.di_ = isRange ? VisualModeNS.kDir.unknown : VisualModeNS.kDir.right;
    a.mode_ = newMode;
    a.alterMethod_ = toCaret ? "move" : "extend";
    if (/* type === SelType.None */ !type && a.establishInitialSelectionAnchor_(theSelected[1])) {
      a.deactivate_();
      return VHUD.tip("Create a selection before entering visual mode.");
    }
    if (toCaret && isRange) {
      // `sel` is not changed by @establish... , since `isRange`
      mode = ("" + sel).length;
      a.collapse_((a.getDirection_() & +(mode > 1)) as BOOL);
    }
    a.commandHandler_(-1, 1);
    VUtils.push_(a.onKeydown_, a);
  },
  /** @safe_di */
  deactivate_ (isEsc?: 1): void {
    if (!this.mode_) { return; }
    this.di_ = VisualModeNS.kDir.unknown;
    this.diType_ = VisualModeNS.DiType.Unknown;
    this.getDirection_("");
    const oldDiType = this.diType_ as VisualModeNS.DiType;
    VUtils.remove_(this);
    if (!this.retainSelection_) {
      this.collapseSelectionTo_(isEsc && this.mode_ !== VisualModeNS.Mode.Caret ? 1 : 0);
    }
    this.mode_ = VisualModeNS.Mode.NotActive; this.hud_ = "";
    VFind.clean_(FindNS.Action.ExitNoFocus);
    const el = VEvent.lock();
    oldDiType !== VisualModeNS.DiType.TextBox &&
    el && el.blur && el.blur();
    VDom.UI.toggleSelectStyle_(0);
    VScroller.top_ = null;
    this.retainSelection_ = false;
    this.resetKeys_();
    this.selection_ = null as never;
    this.scope_ =  null;
    VHUD.hide_();
  },
  realType_: null as never as (sel: Selection) => SelType,
  /** @unknown_di_result */
  onKeydown_ (event: KeyboardEvent): HandlerResult {
    let i: VKeyCodes | KeyStat = event.keyCode, count = 0;
    if (i > VKeyCodes.maxNotFn && i < VKeyCodes.minNotFn) {
      this.resetKeys_();
      if (i === VKeyCodes.f1) {
        this.flashSelection_();
      }
      return i === VKeyCodes.f1 ? HandlerResult.Prevent : HandlerResult.Nothing;
    }
    if (i === VKeyCodes.enter) {
      i = VKeyboard.getKeyStat_(event);
      if ((i & KeyStat.shiftKey) && this.mode_ !== VisualModeNS.Mode.Caret) { this.retainSelection_ = true; }
      (i & KeyStat.PrimaryModifier) ? this.deactivate_() : (this.resetKeys_(), this.yank_(i === KeyStat.altKey || null));
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
    this.di_ = VisualModeNS.kDir.unknown; // make @di safe even when a user modifies the selection
    this.diType_ = VisualModeNS.DiType.Unknown;
    this.commandHandler_(obj, count || 1);
    return HandlerResult.Prevent;
  },
  /** @not_related_to_di */
  resetKeys_ (): void {
    this.currentCount_ = 0; this.currentSeconds_ = null;
  },
  /** @unknown_di_result */
  commandHandler_ (command: VisualModeNS.ValidActions, count: number): void {
    let movement = this, mode = movement.mode_;
    if (command > 50) {
      if (command > 60) {
        return VScroller.scrollBy_(1, (command === 61 ? 1 : -1) * count, 0);
      }
      if (command === 55) {
        clearTimeout(movement.hudTimer_);
        return VFind.activate_(1, VUtils.safer_({ returnToViewport: true }));
      }
      return movement.activate_(1, VUtils.safer_({
        // command === 1 ? VisualModeNS.Mode.Visual : command === 2 : VisualModeNS.Mode.Line : VisualModeNS.Mode.Caret
        mode: command - 50
      }));
    }
    if (movement.scope_ && !movement.selection_.rangeCount) {
      movement.scope_ = null;
      movement.selection_ = getSelection();
      if (!movement.selection_.rangeCount) {
        movement.deactivate_();
        return VHUD.tip("Selection is lost.");
      }
    }
    mode === VisualModeNS.Mode.Caret && movement.collapseSelectionTo_(0);
    if (command > 35) {
      movement.find_(command - 36 ? -count : count);
      return;
    } else if (command > 30) {
      // 31 : y, Y, C, p, P : 35
      command === 32 && movement.selectLine_(count);
      movement.yank_([null, null, true as true,
          ReuseType.current as ReuseType.current, ReuseType.newFg as ReuseType.newFg][command - 31]);
      if (command !== 33) { return; }
    } else if (command > 20) {
      movement.selectLexicalEntity_((command - 20) as VisualModeNS.G.sentence | VisualModeNS.G.word, count);
    } else if (command > 19) {
      movement.reverseSelection_();
    } else if (command >= 0) {
      movement.runMovements_((command & 1) as 0 | 1, command >>> 1, count);
    }
    if (mode === VisualModeNS.Mode.Caret) {
      movement.extend_(1);
      if (movement.realType_(movement.selection_) === SelType.Caret) {
        movement.extend_(0);
      }
    } else if (mode === VisualModeNS.Mode.Line) {
      for (mode = 2; 0 < mode--; ) {
        movement.modify_(movement.getDirection_(), VisualModeNS.G.lineboundary);
        movement.reverseSelection_();
      }
    }
    movement.getDirection_("");
    if (movement.diType_ === VisualModeNS.DiType.Unknown) { return; }
    const focused = VDom.getSelectionFocusEdge_(movement.selection_, movement.di_ as VisualModeNS.ForwardDir);
    if (focused) {
      VScroller.scrollIntoView_unsafe_(focused);
    }
  },
  /**
   * @safe_di requires selection is None on called
   *
   * Note: may change `selection_`
   */
  establishInitialSelectionAnchor_ (sr?: ShadowRoot | null): boolean {
    let node: Text | null, str: string | undefined, offset: number;
    if (!VDom.isHTML_()) { return true; }
    VDom.getZoom_(1);
    VDom.prepareCrop_();
    const nodes = document.createTreeWalker(sr || document.body || document.documentElement as HTMLElement, NodeFilter.SHOW_TEXT);
    while (node = nodes.nextNode() as Text | null) {
      if (50 <= (str = node.data).length && 50 < str.trim().length) {
        const element = node.parentElement;
        // Note(gdh1995): I'm not sure whether element might be null
        if (element && VDom.getVisibleClientRect_(element) && !VDom.getEditableType_(element)) {
          break;
        }
      }
    }
    if (!node) {
      if (sr) {
        this.selection_ = getSelection();
        this.scope_ = null;
        return this.establishInitialSelectionAnchor_();
      }
      return true;
    }
    offset = ((str as string).match(<RegExpOne>/^\s*/) as RegExpMatchArray)[0].length;
    this.selection_.collapse(node, offset);
    this.di_ = VisualModeNS.kDir.right;
    return !this.selection_.rangeCount;
  },
  /** @not_related_to_di */
  prompt_ (text: string, duration: number): void {
    this.hudTimer_ && clearTimeout(this.hudTimer_);
    this.hudTimer_ = setTimeout(this.ResetHUD_, duration);
    return VHUD.show_(text);
  },
  /** @not_related_to_di */
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
    const sel = this.selection_,
    range = sel.rangeCount && (this.getDirection_(""), this.diType_ === VisualModeNS.DiType.Normal) && sel.getRangeAt(0);
    VFind.execute_(null, { noColor: true, count });
    if (VFind.hasResults_) {
      this.diType_ = VisualModeNS.DiType.Unknown;
      if (this.mode_ === VisualModeNS.Mode.Caret && this.realType_(sel) === SelType.Range) {
        this.activate_(1, VUtils.safer_({
          mode: VisualModeNS.Mode.Visual as VisualModeNS.Mode.Visual
        }));
      } else {
        this.di_ = VisualModeNS.kDir.unknown;
        this.commandHandler_(-1, 1);
      }
      return;
    }
    range && !sel.rangeCount && sel.addRange(range);
    this.prompt_("No matches for " + VFind.query_, 1000);
  },
  /**
   * @safe_di if action !== true
   * @not_related_to_di otherwise
   */
  yank_ (action?: true | ReuseType.current | ReuseType.newFg | null): void {
    const str = "" + this.selection_;
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
  flashSelection_(): void {
    const sel = this.selection_, range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null,
    br = range && range.getBoundingClientRect();
    if (br && br.height > 0 && br.right > 0) { // width may be 0 in Caret mode
      let cr = VDom.cropRectToVisible_(br.left - 4, br.top - 5, br.right + 3, br.bottom + 4);
      cr && VDom.UI.flash_(null, cr).classList.add("Sel");
    }
  },

  D: ["backward", "forward"] as ["backward", "forward"],
  G: ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"] as
     ["character", "line", "lineboundary", /*3*/ "paragraph", "sentence", "vimword", /*6*/ "word",
      "documentboundary"],
  alterMethod_: "" as "move" | "extend",
  di_: VisualModeNS.kDir.unknown as VisualModeNS.ForwardDir | VisualModeNS.kDir.unknown,
  diType_: VisualModeNS.DiType.Unknown as VisualModeNS.DiType.Normal | VisualModeNS.DiType.TextBox | VisualModeNS.DiType.Unknown,
  /** 0 means it's invalid; >=2 means real_length + 2; 1 means uninited */ oldLen_: 0,
  wordRe_: null as never as RegExpOne | RegExpU,
  /** @unknown_di_result */
  extend_ (d: VisualModeNS.ForwardDir): void | 1 {
    return this.selection_.modify("extend", this.D[d], "character");
  },
  /** @unknown_di_result */
  modify_ (d: VisualModeNS.ForwardDir, g: VisualModeNS.G): void | 1 {
    return this.selection_.modify(this.alterMethod_, this.D[d], this.G[g as 0 | 1 | 2]);
  },
  /**
   * if `isMove`, then must has collapsed;
   *
   * if return `''`, then `@hasModified_` is not defined
   */
  getNextRightCharacter_ (isMove: BOOL): string {
    const a = this, diType = a.diType_;
    a.oldLen_ = 0;
    if (diType === VisualModeNS.DiType.TextBox) {
      const el = VEvent.lock() as HTMLInputElement | HTMLTextAreaElement;
      return el.value.charAt(a.TextOffset_(el, a.di_ === VisualModeNS.kDir.right || el.selectionDirection !== "backward"));
    }
    const sel = a.selection_;
    if (diType === VisualModeNS.DiType.Normal) {
      let { focusNode } = sel;
      if (focusNode instanceof Text) {
        const i = sel.focusOffset, str = focusNode.data;
        if (str.charAt(i).trim() || i && str.charAt(i - 1).trim() && str.substring(i).trimLeft()) {
          return str[i];
        }
      }
    }
    let oldLen = 0;
    if (!isMove) {
      const beforeText = "" + sel;
      if (beforeText && !a.getDirection_(beforeText)) {
        return beforeText[0];
      }
      oldLen = beforeText.length;
    }
    // here, the real di must be 1 (caret also means 1)
    a.oldLen_ || a.extend_(1);
    const afterText = "" + sel, newLen = afterText.length;
    if (newLen !== oldLen) {
      isMove && a.collapse_(newLen === 1 ? VisualModeNS.kDir.right : VisualModeNS.kDir.left);
      a.oldLen_ = isMove && newLen !== 1 ? 0 : 2 + oldLen;
      return afterText[newLen - 1];
    }
    return '';
  },
  runMovements_ (direction: VisualModeNS.ForwardDir, granularity: VisualModeNS.G | VisualModeNS.VimG, count: number): void {
    if (granularity === VisualModeNS.VimG.vimword || granularity === VisualModeNS.G.word) {
      if (direction) { return this.moveRightByWord_(granularity === VisualModeNS.VimG.vimword, count); }
      granularity = VisualModeNS.G.word;
    }
    let oldDi = this.di_;
    let sel = this.selection_, m = this.alterMethod_, d = this.D[direction], g = this.G[granularity as 0 | 1 | 2];
    while (0 < count--) { sel.modify(m, d, g); }
    this.di_ = direction === oldDi ? direction : VisualModeNS.kDir.unknown;
  },
  moveRightByWord_ (vimLike: boolean, count: number): void {
    const a = this, isMove = a.mode_ === VisualModeNS.Mode.Caret ? 1 : 0;
    let ch: string = '1' /** a fake value */;
    a.getDirection_("");
    a.oldLen_ = 1;
    count *= 2;
    while (0 < count-- && ch) {
      do {
        if (!a.oldLen_) {
          a.modify_(VisualModeNS.kDir.right, VisualModeNS.G.character);
          a.di_ = a.di_ || VisualModeNS.kDir.unknown; // right / unknown are kept, left is replaced with right, so that keep @di safe
        }
        ch = a.getNextRightCharacter_(isMove);
      } while (ch && ((count & 1) - +(vimLike !== a.wordRe_.test(ch))));
    }
    if (ch && a.oldLen_) {
      const num1 = a.oldLen_ - 2, num2 = isMove || ("" + a.selection_).length;
      a.modify_(VisualModeNS.kDir.left, VisualModeNS.G.character);
      if (!isMove) {
        // in most cases, initial selection won't be a caret at the middle of sel-all
        // - so correct selection won't be from the middle to the end
        // if in the case, selection can not be kept during @getDi,
        // so it's okay to ignore the case
        ("" + a.selection_).length - num1 && a.extend_(1);
        a.di_ = num2 < num1 ? VisualModeNS.kDir.left : VisualModeNS.kDir.right;
      }
    }
  },
  /** @tolerate_di_if_caret */
  reverseSelection_ (): void {
    const a = this, sel = a.selection_;
    if (a.realType_(sel) !== SelType.Range) {
      a.di_ = VisualModeNS.kDir.right;
      return;
    }
    const direction = a.getDirection_(), newDi = (1 - direction) as VisualModeNS.ForwardDir;
    if (a.diType_ === VisualModeNS.DiType.TextBox) {
      const el = VEvent.lock() as HTMLInputElement | HTMLTextAreaElement;
      el.setSelectionRange(a.TextOffset_(el, 0), a.TextOffset_(el, 1), newDi ? "forward" : "backward");
      // Note(gdh1995): may trigger onselect?
    } else if (a.diType_ === VisualModeNS.DiType.Unknown) {
      let length = ("" + sel).length, i = 0;
      a.collapse_(direction);
      for (; i < length; i++) { a.extend_(newDi); }
      for (let tick = 0; tick < 16 && (i = ("" + sel).length - length); tick++) {
        a.extend_(i < 0 ? newDi : direction);
      }
    } else {
      const { anchorNode, anchorOffset } = sel;
      a.collapse_(direction);
      sel.extend(anchorNode as Node, anchorOffset);
    }
    a.di_ = newDi;
  },
  /** @not_related_to_di */
  _compare: null as never as Node["compareDocumentPosition"],
  /**
   * @safe_di if not `magic`
   * 
   * @param {string} magic two means
   * * `""` means only checking type, and may not detect `di_` when `DiType.Unknown`;
   * * `char[1..]` means initial selection text and not to extend back when `DiType.Unknown`
   */
  getDirection_ (magic?: string): VisualModeNS.ForwardDir {
    const a = this;
    if (a.di_ !== VisualModeNS.kDir.unknown) { return a.di_; }
    const oldDiType = a.diType_, sel = a.selection_, {anchorNode, focusNode} = sel;
    // common HTML nodes
    a.diType_ = VisualModeNS.DiType.Normal;
    let num1, num2;
    if (anchorNode != focusNode) {
      num1 = a._compare.call(anchorNode as Node, focusNode as Node);
      return a.di_ = (
          num1 & (/** Node.DOCUMENT_POSITION_CONTAINS */ 8 | /** Node.DOCUMENT_POSITION_CONTAINED_BY */ 16)
          ? sel.getRangeAt(0).endContainer === anchorNode
          : (num1 & /** Node.DOCUMENT_POSITION_PRECEDING */ 2)
        ) ? VisualModeNS.kDir.left : VisualModeNS.kDir.right; // return `right` in case unknown cases
    }
    num1 = sel.anchorOffset;
    if (num2 = sel.focusOffset - num1) {
      return a.di_ = num2 > 0 ? VisualModeNS.kDir.right : VisualModeNS.kDir.left;
    }
    // editable text elements
    const lock = VEvent.lock();
    if (lock && lock.parentElement === anchorNode) {
      num2 = oldDiType === VisualModeNS.DiType.TextBox ? 1 : 0;
      type TextModeElement = HTMLInputElement | HTMLTextAreaElement;
      if (!num2 && (VDom.editableTypes_[lock.tagName.toLowerCase()] as EditableType) > EditableType.Select) {
        const child = (VDom.Getter_(Node, anchorNode as Element, "childNodes") || (anchorNode as Element).childNodes)[num1] as Node | undefined;
        if (lock === child || /** tend to trust that the selected is a textbox */ !child) {
          if (VDom.isInputInTextMode_(lock as TextModeElement)) {
            num2 = 2;
            a.diType_ = VisualModeNS.DiType.TextBox;
          } else if (magic == null && (lock as TextModeElement).value && (num1 = ("" + sel).length)) {
            // Chrome 60/70 need this "extend" action; otherwise a text box would "blur" and a mess gets selected
            a.extend_(1);
            a.extend_(0);
            ("" + sel).length !== num1 && a.extend_(1);
          }
        }
      }
      if (num2) {
        let di: BOOL = (lock as TextModeElement).selectionDirection === "backward" ? 0 : 1;
        if (magic == null && num2 === 2) {
          num1 = a.TextOffset_(lock as TextModeElement, VisualModeNS.kDir.left);
          num2 = di ? a.TextOffset_(lock as TextModeElement, VisualModeNS.kDir.right) : num1;
          // Chrome 60/70 need this "extend" action; otherwise a text box would "blur" and a mess gets selected
          if (!di || num2 && (num1 !== num2)) {
            num1 = (di || num2 ? 0 : 1) as BOOL;
            a.extend_(num1);
            num2 !== a.TextOffset_(lock as TextModeElement, di) && a.extend_((1 - num1) as BOOL);
          }
        }
        return a.di_ = di;
      }
    }
    // nodes under shadow DOM or in other unknown edge cases
    const initial = magic || "" + sel;
    num1 = initial.length;
    if (!num1) {
      a.diType_ = anchorNode instanceof Text ? VisualModeNS.DiType.Normal : VisualModeNS.DiType.Unknown;
      return a.di_ = VisualModeNS.kDir.right;
    }
    a.diType_ = VisualModeNS.DiType.Unknown;
    if (magic === "") { return VisualModeNS.kDir.right; }
    a.extend_(1);
    num2 = ("" + sel).length - num1;
    /**
     * Note (tested on C70):
     * the `extend` above may go back by 2 steps when cur pos is the right of an element with `select:all`,
     * so a detection and the third `extend` may be necessary
     */
    if (num2 && !magic) {
      a.extend_(0);
      "" + sel !== initial && a.extend_(1);
    } else {
      a.oldLen_ = 2 + num1;
    }
    return a.di_ = num2 >= 0 || magic && num2 === -num1 ? VisualModeNS.kDir.right : VisualModeNS.kDir.left;
  },
  /** @tolerate_di_if_caret di will be 1 */
  collapseSelectionTo_ (toFocus: BOOL) {
    this.realType_(this.selection_) === SelType.Range && this.collapse_((this.getDirection_() ^ toFocus ^ 1) as BOOL);
    this.di_ = VisualModeNS.kDir.right;
  },
  /** @safe_di di will be 1 */
  collapse_ (/** to-left if text is left-to-right */ toRight: VisualModeNS.ForwardDir): void {
    toRight ? this.selection_.collapseToEnd() : this.selection_.collapseToStart();
    this.di_ = VisualModeNS.kDir.right;
  },
  selectLexicalEntity_ (entity: VisualModeNS.G.sentence | VisualModeNS.G.word, count: number): void {
    this.collapseSelectionTo_(1);
    entity - VisualModeNS.G.word || this.modify_(VisualModeNS.kDir.right, VisualModeNS.G.character);
    this.modify_(VisualModeNS.kDir.left, entity);
    this.di_ = VisualModeNS.kDir.left; // safe
    this.collapseSelectionTo_(1);
    this.runMovements_(VisualModeNS.kDir.right, entity, count);
  },
  /** after called, VVisual must exit at once */
  selectLine_ (count: number): void {
    const a = this, oldDi = a.getDirection_();
    a.alterMethod_ = "extend";
    {
      oldDi && a.reverseSelection_();
      a.modify_(VisualModeNS.kDir.left, VisualModeNS.G.lineboundary);
      a.di_ = VisualModeNS.kDir.left; // safe
      a.reverseSelection_();
    }
    while (0 < --count) { a.modify_(VisualModeNS.kDir.right, VisualModeNS.G.line); }
    a.modify_(VisualModeNS.kDir.right, VisualModeNS.G.lineboundary);
    const ch = a.getNextRightCharacter_(0);
    const num1 = a.oldLen_;
    if (ch && num1 && ch !== "\n") {
      a.extend_(0);
      ("" + a.selection_).length + 2 - num1 && a.extend_(1);
    }
  },
  /** @argument el must be in text mode  */
  TextOffset_ (this: void, el: HTMLInputElement | HTMLTextAreaElement, di: VisualModeNS.ForwardDir | boolean): number {
    return (di ? el.selectionEnd : el.selectionStart) as number;
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
  "<c-e>": 61, "<c-y>": 62, "<c-down>": 61, "<c-up>": 62
} as {
  [key: string]: VisualModeNS.ValidActions | {
    [key: string]: VisualModeNS.ValidActions;
  };
} as SafeDict<VisualModeNS.ValidActions | SafeDict<VisualModeNS.ValidActions>>,
/** @not_related_to_di */
init_ (words: string) {
  this.init_ = null as never;
  const typeIdx = { None: SelType.None, Caret: SelType.Caret, Range: SelType.Range };
  this._compare = Node.prototype.compareDocumentPosition;
  this.realType_ = VSettings.cache.browserVer === BrowserVer.$Selection$NotShowStatusInTextBox
  ? function(sel: Selection): SelType {
    let type = typeIdx[sel.type];
    return type === SelType.Caret && VVisual.diType_ !== VisualModeNS.DiType.Normal && ("" + sel) ? SelType.Range : type;
  } : function(sel: Selection): SelType {
    return typeIdx[sel.type];
  };
  var map = this.keyMap_, func = VUtils.safer_;
  /** @see background/commands.ts@CommandsData_.wordsRe_ */
  this.wordRe_ = new RegExp(words, (<RegExpOne>/^\[\\p/).test(words) ? "u" : "");
  func(map); func(map.a as Dict<VisualModeNS.ValidActions>); func(map.g as Dict<VisualModeNS.ValidActions>);
}
};
