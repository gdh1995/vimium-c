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
    _mask = -1,
  }
  /** although values are made by flags, these types are exclusive */
  const enum DiType {
    Normal = 0,
    Unknown = 1,
    TextBox = 2,
    isUnsafe = 4,
    Complicated = 8,

    SafeUnknown = 1,
    UnsafeUnknown = 5,
    SafeTextBox = 2,
    UnsafeTextBox = 6,
    SafeComplicated = 8,
    UnsafeComplicated = 12,
  }
  type ValidDiTypes = DiType.Normal | DiType.UnsafeTextBox | DiType.SafeTextBox | DiType.Complicated
    | DiType.UnsafeComplicated;
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
    const a = VVisual;
    a.init_ && a.init_(options.w as string);
    VUtils.remove_(a);
    VDom.docSelectable_ = VDom.UI.getDocSelectable_();
    VScroller.prepareTop_();
    a.diType_ = VisualModeNS.DiType.UnsafeUnknown;
    let theSelected = VDom.UI.getSelected_(1),
    sel: Selection = a.selection_ = theSelected[0],
    type: SelType = a.selType_(), mode: CmdOptions[kFgCmd.visualMode]["m"] = options.m;
    a.scope_ = theSelected[1];
    if (!a.mode_) { a.retainSelection_ = type === SelType.Range; }
    if (mode !== VisualModeNS.Mode.Caret) {
      if (!VEvent.lock_() && /* (type === SelType.Caret || type === SelType.Range) */ type) {
        const { left: l, top: t, right: r, bottom: b} = sel.getRangeAt(0).getBoundingClientRect();
        VDom.getZoom_(1);
        VDom.prepareCrop_();
        if (!VDom.cropRectToVisible_(l, t, (l || r) && r + 3, (t || b) && b + 3)) {
          sel.removeAllRanges();
        } else if (type === SelType.Caret) {
          a.extend_(VisualModeNS.kDir.right);
          a.selType_() === SelType.Range || a.extend_(VisualModeNS.kDir.left);
        }
        type = a.selType_();
      }
    }
    const isRange = type === SelType.Range, newMode = isRange ? mode : VisualModeNS.Mode.Caret,
    toCaret = newMode === VisualModeNS.Mode.Caret;
    a.hudTimer_ && clearTimeout(a.hudTimer_);
    VHUD.show_(a.hud_ = (toCaret ? "Caret" : newMode === VisualModeNS.Mode.Line ? "Line" : "Visual") + " mode"
      , !!options.r);
    if (newMode !== mode) {
      a.prompt_("No usable selection, entering caret mode\u2026", 1000);
    }
    VDom.UI.toggleSelectStyle_(1);
    a.di_ = isRange ? VisualModeNS.kDir.unknown : VisualModeNS.kDir.right;
    a.mode_ = newMode;
    a.alterMethod_ = toCaret ? "move" : "extend";
    if (/* type === SelType.None */ !type && a.establishInitialSelectionAnchor_(theSelected[1])) {
      a.deactivate_();
      return VHUD.tip_("Create a selection before entering visual mode.");
    }
    if (toCaret && isRange) {
      // `sel` is not changed by @establish... , since `isRange`
      mode = ("" + sel).length;
      a.collapseToRight_((a.getDirection_() & +(mode > 1)) as BOOL);
    }
    a.commandHandler_(-1, 1);
    VUtils.push_(a.onKeydown_, a);
  },
  /** @safe_di */
  deactivate_ (isEsc?: 1): void {
    const a = this;
    if (!a.mode_) { return; }
    a.di_ = VisualModeNS.kDir.unknown;
    a.diType_ = VisualModeNS.DiType.UnsafeUnknown;
    a.getDirection_("");
    const oldDiType = a.diType_ as VisualModeNS.DiType;
    VUtils.remove_(a);
    if (!a.retainSelection_) {
      a.collapseToFocus_(isEsc && a.mode_ !== VisualModeNS.Mode.Caret ? 1 : 0);
    }
    a.mode_ = VisualModeNS.Mode.NotActive; a.hud_ = "";
    VFind.clean_(FindNS.Action.ExitNoFocus);
    const el = VEvent.lock_();
    oldDiType & (VisualModeNS.DiType.TextBox | VisualModeNS.DiType.Complicated) ||
    el && el.blur && el.blur();
    VDom.UI.toggleSelectStyle_(0);
    VScroller.top_ = null;
    a.retainSelection_ = false;
    a.resetKeys_();
    a.selection_ = null as never;
    a.scope_ =  null;
    VHUD.hide_();
  },
  /** need real diType */
  selType_: null as never as () => SelType,
  /** @unknown_di_result */
  onKeydown_ (event: KeyboardEvent): HandlerResult {
    const a = this;
    let i: VKeyCodes | KeyStat = event.keyCode, count = 0;
    if (i > VKeyCodes.maxNotFn && i < VKeyCodes.minNotFn) {
      a.resetKeys_();
      if (i === VKeyCodes.f1) {
        a.flashSelection_();
      }
      return i === VKeyCodes.f1 ? HandlerResult.Prevent : HandlerResult.Nothing;
    }
    if (i === VKeyCodes.enter) {
      i = VKeyboard.getKeyStat_(event);
      if ((i & KeyStat.shiftKey) && a.mode_ !== VisualModeNS.Mode.Caret) { a.retainSelection_ = true; }
      (i & KeyStat.PrimaryModifier) ? a.deactivate_()
        : (a.resetKeys_(), a.yank_(i === KeyStat.altKey || null));
      return HandlerResult.Prevent;
    }
    if (VKeyboard.isEscape_(event)) {
      a.currentCount_ || a.currentSeconds_ ? a.resetKeys_() : a.deactivate_(1);
      return HandlerResult.Prevent;
    }
    const ch = VKeyboard.char_(event);
    if (!ch) {
      a.resetKeys_();
      return i === VKeyCodes.ime || i === VKeyCodes.menuKey ? HandlerResult.Nothing : HandlerResult.Suppress;
    }
    let key = VKeyboard.key_(event, ch)
      , obj: SafeDict<VisualModeNS.ValidActions> | null | VisualModeNS.ValidActions | undefined;
    key = VEvent.mapKey_(key);
    if (obj = a.currentSeconds_) {
      obj = obj[key];
      count = a.currentCount_;
      a.resetKeys_();
    }
    if (obj != null) { /* empty */ }
    else if (key.length === 1 && (i = +key[0]) < 10 && (i || a.currentCount_)) {
      a.currentCount_ = a.currentCount_ * 10 + i;
      a.currentSeconds_ = null;
    } else if ((obj = a.keyMap_[key]) == null) {
      a.currentCount_ = 0;
    } else if (typeof obj === "object") {
      a.currentSeconds_ = obj;
      obj = null;
    } else {
      count = a.currentCount_;
      a.currentCount_ = 0;
    }
    if (obj == null) { return ch.length === 1 && ch === key ? HandlerResult.Prevent : HandlerResult.Suppress; }
    VUtils.prevent_(event);
    a.di_ = VisualModeNS.kDir.unknown; // make @di safe even when a user modifies the selection
    a.diType_ = VisualModeNS.DiType.UnsafeUnknown;
    a.commandHandler_(obj, count || 1);
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
        VPort.post_({ H: kFgReq.cmd, c: "findFromVisual", n: 1, i: 0});
        return;
      }
      return movement.activate_(1, VUtils.safer_<CmdOptions[kFgCmd.visualMode]>({
        // command === 1 ? VisualModeNS.Mode.Visual : command === 2 : VisualModeNS.Mode.Line : VisualModeNS.Mode.Caret
        m: command - 50
      }));
    }
    if (movement.scope_ && !movement.selection_.rangeCount) {
      movement.scope_ = null;
      movement.selection_ = getSelection();
      if (!movement.selection_.rangeCount) {
        movement.deactivate_();
        return VHUD.tip_("Selection is lost.");
      }
    }
    mode === VisualModeNS.Mode.Caret && movement.collapseToFocus_(0);
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
      movement.runMovements_((command & 1) as 0 | 1, command >> 1, count);
    }
    if (mode === VisualModeNS.Mode.Caret) {
      movement.extend_(VisualModeNS.kDir.right);
      if (movement.selType_() === SelType.Caret) {
        movement.extend_(VisualModeNS.kDir.left);
      }
    } else if (mode === VisualModeNS.Mode.Line) {
      movement.ensureLine_(command);
    }
    movement.getDirection_("");
    if (movement.diType_ & VisualModeNS.DiType.Complicated) { return; }
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
    const nodes = document.createTreeWalker(sr || document.body || document.documentElement as HTMLElement
            , NodeFilter.SHOW_TEXT);
    while (node = nodes.nextNode() as Text | null) {
      if (50 <= (str = node.data).length && 50 < str.trim().length) {
        const element = node.parentElement;
        // Note(gdh1995): I'm not sure whether element might be null
        if (element && VDom.getVisibleClientRect_(element) && !VDom.getEditableType_(element)) {
          break;
        }
      }
    }
    const a = this;
    if (!node) {
      if (sr) {
        a.selection_ = getSelection();
        a.scope_ = null;
        return a.establishInitialSelectionAnchor_();
      }
      return true;
    }
    offset = ((str as string).match(<RegExpOne> /^\s*/) as RegExpMatchArray)[0].length;
    a.selection_.collapse(node, offset);
    a.di_ = VisualModeNS.kDir.right;
    return !a.selection_.rangeCount;
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
    if (_this.hud_) { VHUD.show_(_this.hud_); }
  },
  find_ (count: number): void {
    if (!VFind.query_) {
      VPort.send_({ c: kFgReq.findQuery, a: {} }, function (query): void {
        if (query) {
          VFind.updateQuery_(query);
          VVisual.find_(count);
        } else {
          VVisual.prompt_("No history queries", 1000);
        }
      });
      return;
    }
    const a = this;
    const sel = a.selection_,
    range = sel.rangeCount && (a.getDirection_(""), !a.diType_) && sel.getRangeAt(0);
    VFind.execute_(null, { noColor: true, count });
    if (VFind.hasResults_) {
      a.diType_ = VisualModeNS.DiType.UnsafeUnknown;
      if (a.mode_ === VisualModeNS.Mode.Caret && a.selType_() === SelType.Range) {
        a.activate_(1, VUtils.safer_<CmdOptions[kFgCmd.visualMode]>({
          m: VisualModeNS.Mode.Visual
        }));
      } else {
        a.di_ = VisualModeNS.kDir.unknown;
        a.commandHandler_(-1, 1);
      }
      return;
    }
    range && !sel.rangeCount && sel.addRange(range);
    a.prompt_("No matches for " + VFind.query_, 1000);
  },
  /**
   * @safe_di if action !== true
   * @not_related_to_di otherwise
   */
  yank_ (action?: true | ReuseType.current | ReuseType.newFg | null): void {
    const str = "" + this.selection_;
    if (action === true) {
      this.prompt_(VHUD.copied_(str, "", true), 2000);
      action = null;
    } else {
      this.deactivate_();
      action != null || VHUD.copied_(str);
    }
    VPort.post_(action != null ? { H: kFgReq.openUrl, u: str, r: action }
        : { H: kFgReq.copy, d: str });
  },
  flashSelection_(): void {
    const sel = this.selection_, range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null,
    br = range && range.getBoundingClientRect();
    if (br && br.height > 0 && br.right > 0) { // width may be 0 in Caret mode
      let cr = VDom.cropRectToVisible_(br.left - 4, br.top - 5, br.right + 3, br.bottom + 4);
      cr && VDom.UI.flash_(null, cr, 660).classList.add("Sel");
    }
  },

  _D: ["backward", "forward"] as ["backward", "forward"],
  _G: ["character", "line", "lineboundary", /*3*/ "paragraph",
      "sentence", /** VisualModeNS.VimG.vimword */ "", /*6*/ "word",
      "documentboundary"] as
     ["character", "line", "lineboundary", /*3*/ "paragraph",
      "sentence", /** VisualModeNS.VimG.vimword */ "", /*6*/ "word",
      "documentboundary"],
  alterMethod_: "" as "move" | "extend",
  di_: VisualModeNS.kDir.unknown as VisualModeNS.ForwardDir | VisualModeNS.kDir.unknown,
  diType_: VisualModeNS.DiType.UnsafeUnknown as
    VisualModeNS.ValidDiTypes | VisualModeNS.DiType.UnsafeUnknown | VisualModeNS.DiType.SafeUnknown,
  /** 0 means it's invalid; >=2 means real_length + 2; 1 means uninited */ oldLen_: 0,
  WordsRe_: null as RegExpOne | RegExpU | null,
  _rightWhiteSpaceRe: null as RegExpOne | null,
  /** @unknown_di_result */
  extend_ (d: VisualModeNS.ForwardDir, g?: VisualModeNS.G): void | 1 {
    this.selection_.modify("extend", this._D[d], this._G[g || VisualModeNS.G.character]);
    this.diType_ &= ~VisualModeNS.DiType.isUnsafe;
  },
  /** @unknown_di_result */
  modify_ (d: VisualModeNS.ForwardDir, g: VisualModeNS.G): void | 1 {
    return this.selection_.modify(this.alterMethod_, this._D[d], this._G[g as 0 | 1 | 2]);
  },
  /**
   * if `isMove`, then must has collapsed;
   *
   * if return `''`, then `@hasModified_` is not defined
   */
  getNextRightCharacter_ (isMove: BOOL): string {
    const a = this, diType = a.diType_;
    a.oldLen_ = 0;
    if (diType & VisualModeNS.DiType.TextBox) {
      const el = VEvent.lock_() as HTMLInputElement | HTMLTextAreaElement;
      return el.value.charAt(a.TextOffset_(el
          , a.di_ === VisualModeNS.kDir.right || el.selectionDirection !== "backward"));
    }
    const sel = a.selection_;
    if (!diType) {
      let { focusNode } = sel;
      if (focusNode instanceof Text) {
        const i = sel.focusOffset, str = focusNode.data;
        if (str.charAt(i).trim() || i && str.charAt(i - 1).trim() && str.substring(i).trimLeft()
              && (str[i] !== "\n" && !(Build.BTypes & BrowserType.Firefox && str[i] === "\r"))) {
          return str[i];
        }
      }
    }
    let oldLen = 0;
    if (!isMove) {
      const beforeText = "" + sel;
      if (beforeText && (!a.getDirection_(beforeText) || a.selType_() === SelType.Caret)) {
        return beforeText[0];
      }
      oldLen = beforeText.length;
    }
    // here, the real di must be kDir.right (range if in visual mode else caret)
    a.oldLen_ || a.extend_(VisualModeNS.kDir.right);
    const afterText = "" + sel, newLen = afterText.length;
    if (newLen !== oldLen) {
      // if isMove, then cur sel is >= 1 char & di is right
      isMove && a.collapseToRight_(newLen === 1 ? VisualModeNS.kDir.right : VisualModeNS.kDir.left);
      a.oldLen_ = isMove && newLen !== 1 ? 0 : 2 + oldLen;
      return afterText[newLen - 1];
    }
    return "";
  },
  runMovements_ (direction: VisualModeNS.ForwardDir, granularity: VisualModeNS.G | VisualModeNS.VimG.vimword
      , count: number): void {
    const shouldSkipSpaceWhenMovingRight = granularity === VisualModeNS.VimG.vimword;
    const isFirefox = !(Build.BTypes & ~BrowserType.Firefox)
      || !!(Build.BTypes & BrowserType.Firefox) && VUtils.cache_.browser_ === BrowserType.Firefox;
    let fixWord: BOOL = 0;
    if (shouldSkipSpaceWhenMovingRight || granularity === VisualModeNS.G.word) {
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/editing_behavior.h?type=cs&q=ShouldSkipSpaceWhenMovingRight&g=0&l=99
      if (direction &&
          (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && isFirefox
            ? !Build.NativeWordMoveOnFirefox || shouldSkipSpaceWhenMovingRight
            : (VUtils.cache_.onMac_ === /* win */ 0) !== shouldSkipSpaceWhenMovingRight)) {
        fixWord = 1;
        if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && isFirefox
            ? !Build.NativeWordMoveOnFirefox : !shouldSkipSpaceWhenMovingRight) {
          count--;
        }
      }
      granularity = VisualModeNS.G.word;
    }
    const a = this, oldDi = a.di_;
    while (0 < count--) {
      a.selection_.modify(a.alterMethod_, a._D[direction], a._G[granularity as VisualModeNS.G]);
    }
    // it's safe to remove `isUnsafe` here, because:
    // either `count > 0` or `fixWord && _moveRight***()`
    a.mode_ !== VisualModeNS.Mode.Caret && (a.diType_ &= ~VisualModeNS.DiType.isUnsafe);
    a.di_ = direction === oldDi ? direction : VisualModeNS.kDir.unknown;
    if (fixWord) {
      if (!shouldSkipSpaceWhenMovingRight) { // not shouldSkipSpace -> go left
        if (!(Build.BTypes & BrowserType.Firefox) || !Build.NativeWordMoveOnFirefox
            || Build.BTypes & ~BrowserType.Firefox && !isFirefox) {
          (a as EnsureNonNull<typeof VVisual>)._moveRightByWordButNotSkipSpace();
        }
        return;
      }
      !Build.NativeWordMoveOnFirefox &&
      (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && isFirefox) &&
      (a as EnsureNonNull<typeof VVisual>)._moveRightByWordButNotSkipSpace() ||
      a._moveRightForSpaces();
    }
  },
  /**
   * Chrome use ICU4c's RuleBasedBreakIterator and then DictionaryBreakEngine -> CjkBreakEngine
   * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/
   *  selection_modifier.cc?type=cs&q=ModifyExtendingForwardInternal&g=0&l=342
   *  selection_modifier.cc?type=cs&q=ModifyMovingForward&g=0&l=423
   *  visible_units_word.cc?type=cs&q=NextWordPositionInternal&g=0&l=97
   * https://cs.chromium.org/chromium/src/third_party/icu/source/common/
   *  rbbi.cpp?type=cs&q=RuleBasedBreakIterator::following&g=0&l=601
   *  rbbi_cache.cpp?type=cs&q=BreakCache::following&g=0&l=248
   *  rbbi_cache.cpp?type=cs&q=BreakCache::nextOL&g=0&l=278
   */
  _moveRightForSpaces (): void {
    const a = this, isMove = a.mode_ === VisualModeNS.Mode.Caret ? 1 : 0;
    let ch: string = "1" /** a fake value */;
    a.getDirection_("");
    a.oldLen_ = 1;
    do {
      if (!a.oldLen_) {
        a.modify_(VisualModeNS.kDir.right, VisualModeNS.G.character);
        // right / unknown are kept, left is replaced with right, so that keep @di safe
        a.di_ = a.di_ || VisualModeNS.kDir.unknown;
      }
      ch = a.getNextRightCharacter_(isMove);
      // (t/b/r/c/e/) visible_units.cc?q=SkipWhitespaceAlgorithm&g=0&l=1191
    } while (ch && (
      !(Build.BTypes & ~BrowserType.Firefox) || Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      || a._rightWhiteSpaceRe ? (a._rightWhiteSpaceRe as RegExpOne).test(ch)
          : !(a.WordsRe_ as RegExpOne | RegExpU).test(ch)
    ));
    if (ch && a.oldLen_) {
      const num1 = a.oldLen_ - 2, num2 = isMove || ("" + a.selection_).length;
      a.modify_(VisualModeNS.kDir.left, VisualModeNS.G.character);
      if (!isMove) {
        // in most cases, initial selection won't be a caret at the middle of sel-all
        // - so correct selection won't be from the middle to the end
        // if in the case, selection can not be kept during @getDi,
        // so it's okay to ignore the case
        ("" + a.selection_).length - num1 && a.extend_(VisualModeNS.kDir.right);
        a.di_ = num2 < num1 ? VisualModeNS.kDir.left : VisualModeNS.kDir.right;
      }
    }
  },
  /**
   * if Build.NativeWordMoveOnFirefox, then should never be called if browser is Firefox
   */
  _moveRightByWordButNotSkipSpace: !(Build.BTypes & ~BrowserType.Firefox) && Build.NativeWordMoveOnFirefox ? null
      : function (this: {}): boolean {
    const a = this as typeof VVisual, sel = a.selection_;
    let str = "" + sel, len = str.length, di = a.getDirection_();
    a.extend_(VisualModeNS.kDir.right, VisualModeNS.G.word);
    const str2 = "" + sel;
    if (!di) { a.di_ = str2 ? VisualModeNS.kDir.unknown : VisualModeNS.kDir.right; }
    str = di ? str2.substring(len) : a.getDirection_() ? str + str2 : str.substring(0, len - str2.length);
    // now a.di_ is correct, and can be left / right
    let match = ((!(Build.BTypes & BrowserType.Firefox)
        ? Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
          ? a._rightWhiteSpaceRe : a._rightWhiteSpaceRe || a.WordsRe_
        : !(Build.BTypes & ~BrowserType.Firefox) ? a.WordsRe_
        : (Build.NativeWordMoveOnFirefox || VUtils.cache_.browser_ !== BrowserType.Firefox)
          && a._rightWhiteSpaceRe || a.WordsRe_
        ) as Exclude<typeof a._rightWhiteSpaceRe | typeof a.WordsRe_, null>).exec(str),
    toGoLeft = match ? (!(Build.BTypes & BrowserType.Firefox)
      ? Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
        || <Exclude<typeof a._rightWhiteSpaceRe, null>> a._rightWhiteSpaceRe
      : Build.BTypes & ~BrowserType.Firefox
        && (Build.NativeWordMoveOnFirefox || VUtils.cache_.browser_ !== BrowserType.Firefox)
        && <Exclude<typeof a._rightWhiteSpaceRe, null>> a._rightWhiteSpaceRe
      )
      ? match[0].length : str.length - match.index - match[0].length : 0;
    const needBack = toGoLeft > 0 && toGoLeft < str.length;
    if (needBack) {
      // after word are some spaces (>= C59) or non-word chars (< C59 || Firefox)
      len = str2.length;
      if (!(a.diType_ & VisualModeNS.DiType.TextBox)) {
        while (toGoLeft > 0) {
          a.extend_(VisualModeNS.kDir.left);
          len || (a.di_ = VisualModeNS.kDir.left);
          const reduced = len - ("" + sel).length;
          toGoLeft -= Math.abs(reduced) || toGoLeft;
          len -= reduced;
        }
        if (toGoLeft < 0) { // may be a "user-select: all"
          a.extend_(VisualModeNS.kDir.right);
        }
      } else {
        di = a.di_ as VisualModeNS.ForwardDir;
        let el = VEvent.lock_() as HTMLInputElement | HTMLTextAreaElement,
        start = a.TextOffset_(el, 0), end = start + len;
        di ? (end -= toGoLeft) :  (start -= toGoLeft);
        di = di && start > end ? (a.di_ = VisualModeNS.kDir.left) : VisualModeNS.kDir.right;
        // di is BOOL := start < end; a.di_ will be correct
        el.setSelectionRange(di ? start : end, di ? end : start
          , <VisualModeNS.ForwardDir> a.di_ ? "forward" : "backward");
      }
    }
    a.mode_ === VisualModeNS.Mode.Caret && a.collapseToRight_(VisualModeNS.kDir.right);
    return needBack;
  },
  /** @tolerate_di_if_caret */
  reverseSelection_ (): void {
    const a = this;
    if (a.selType_() !== SelType.Range) {
      a.di_ = VisualModeNS.kDir.right;
      return;
    }
    const sel = a.selection_, direction = a.getDirection_(), newDi = (1 - direction) as VisualModeNS.ForwardDir;
    if (a.diType_ & VisualModeNS.DiType.TextBox) {
      const el = VEvent.lock_() as HTMLInputElement | HTMLTextAreaElement;
      // Note: on C72/60/35, it can trigger document.onselectionchange
      //      and on C72/60, it can trigger <input|textarea>.onselect
      el.setSelectionRange(a.TextOffset_(el, 0), a.TextOffset_(el, 1), newDi ? "forward" : "backward");
    } else if (a.diType_ & VisualModeNS.DiType.Complicated) {
      let length = ("" + sel).length, i = 0;
      a.collapseToRight_(direction);
      for (; i < length; i++) { a.extend_(newDi); }
      for (let tick = 0; tick < 16 && (i = ("" + sel).length - length); tick++) {
        a.extend_(i < 0 ? newDi : direction);
      }
    } else {
      const { anchorNode, anchorOffset } = sel;
      a.collapseToRight_(direction);
      sel.extend(anchorNode as Node, anchorOffset);
    }
    a.di_ = newDi;
  },
  /**
   * @safe_di if not `magic`
   *
   * @param {string} magic two means
   * * `""` means only checking type, and may not detect `di_` when `DiType.Complicated`;
   * * `char[1..]` means initial selection text and not to extend back when `oldLen_ >= 2`
   */
  getDirection_: function (this: {}, magic?: string
      ): VisualModeNS.kDir.left | VisualModeNS.kDir.right | VisualModeNS.kDir.unknown {
    const a = this as typeof VVisual;
    if (a.di_ !== VisualModeNS.kDir.unknown) { return a.di_; }
    const oldDiType = a.diType_, sel = a.selection_, { anchorNode } = sel;
    let num1 = -1, num2: number;
    if (!oldDiType || (oldDiType & (VisualModeNS.DiType.Unknown | VisualModeNS.DiType.Complicated))) {
      const { focusNode } = sel;
      // common HTML nodes
      if (anchorNode !== focusNode) {
        num1 = Build.BTypes & ~BrowserType.Firefox
          ? Node.prototype.compareDocumentPosition.call(anchorNode as Node, focusNode as Node)
          : (anchorNode as Node).compareDocumentPosition(focusNode as Node);
        a.diType_ = VisualModeNS.DiType.Normal;
        return a.di_ = (
            num1 & (/** Node.DOCUMENT_POSITION_CONTAINS */ 8 | /** Node.DOCUMENT_POSITION_CONTAINED_BY */ 16)
            ? sel.getRangeAt(0).endContainer === anchorNode
            : (num1 & /** Node.DOCUMENT_POSITION_PRECEDING */ 2)
          ) ? VisualModeNS.kDir.left : VisualModeNS.kDir.right; // return `right` in case of unknown cases
      }
      num1 = sel.anchorOffset;
      if ((num2 = sel.focusOffset - num1) || anchorNode instanceof Text) {
        a.diType_ = VisualModeNS.DiType.Normal;
        return a.di_ = num2 >= 0 ? VisualModeNS.kDir.right : VisualModeNS.kDir.left;
      }
    }
    // editable text elements
    const lock = VEvent.lock_();
    if (lock && lock.parentElement === anchorNode) {
      type TextModeElement = HTMLInputElement | HTMLTextAreaElement;
      if ((oldDiType & VisualModeNS.DiType.Unknown)
          && (VDom.editableTypes_[lock.tagName.toLowerCase()] as EditableType) > EditableType.Select) {
        const child = (Build.BTypes & ~BrowserType.Firefox && VDom.Getter_(Node, anchorNode as Element, "childNodes")
                        || (anchorNode as Element).childNodes
                      )[num1 >= 0 ? num1 : sel.anchorOffset] as Node | undefined;
        if (lock === child || /** tend to trust that the selected is a textbox */ !child) {
          if (VDom.isInputInTextMode_(lock as TextModeElement)) {
            a.diType_ = VisualModeNS.DiType.TextBox | (oldDiType & VisualModeNS.DiType.isUnsafe);
          }
        }
      }
      if (a.diType_ & VisualModeNS.DiType.TextBox) {
        return a.di_ = (lock as TextModeElement).selectionDirection !== "backward"
          ? VisualModeNS.kDir.right : VisualModeNS.kDir.left;
      }
    }
    // nodes under shadow DOM or in other unknown edge cases
    // (edge case: an example is, focusNode is a <div> and focusOffset points to #text, and then collapse to it)
    a.diType_ = oldDiType & VisualModeNS.DiType.Unknown
      ? VisualModeNS.DiType.Complicated | (oldDiType & VisualModeNS.DiType.isUnsafe)
      : oldDiType & (VisualModeNS.DiType.Complicated | VisualModeNS.DiType.isUnsafe);
    if (magic === "") { return VisualModeNS.kDir.unknown; }
    const initial = magic || "" + sel;
    num1 = initial.length;
    if (!num1) {
      return a.di_ = VisualModeNS.kDir.right;
    }
    a.extend_(VisualModeNS.kDir.right);
    a.diType_ = a.diType_ && sel.anchorOffset !== sel.focusOffset ? VisualModeNS.DiType.Normal
      : a.diType_ & ~VisualModeNS.DiType.isUnsafe;
    num2 = ("" + sel).length - num1;
    /**
     * Note (tested on C70):
     * the `extend` above may go back by 2 steps when cur pos is the right of an element with `select:all`,
     * so a detection and the third `extend` may be necessary
     */
    if (num2 && !magic) {
      a.extend_(VisualModeNS.kDir.left);
      "" + sel !== initial && a.extend_(VisualModeNS.kDir.right);
    } else {
      a.oldLen_ = 2 + num1;
    }
    return a.di_ = num2 >= 0 || magic && num2 === -num1 ? VisualModeNS.kDir.right : VisualModeNS.kDir.left;
  } as {
    (magic: ""): VisualModeNS.kDir.unknown | -1;
    (magic?: string): VisualModeNS.kDir.left | VisualModeNS.kDir.right;
  },
  /** @tolerate_di_if_caret di will be 1 */
  collapseToFocus_ (toFocus: BOOL) {
    this.selType_() === SelType.Range && this.collapseToRight_((this.getDirection_() ^ toFocus ^ 1) as BOOL);
    this.di_ = VisualModeNS.kDir.right;
  },
  /**
   * @must_be_range_and_know_di_if_unsafe `selType == Range && this.getDirection_()` is safe enough
   *
   * @fix_unsafe_in_diType
   *
   * @di_will_be_1
   */
  collapseToRight_ (/** to-right if text is left-to-right */ toRight: VisualModeNS.ForwardDir): void {
    const a = this, sel = a.selection_;
    if (a.diType_ & VisualModeNS.DiType.isUnsafe) {
      // Chrome 60/70 need this "extend" action; otherwise a text box would "blur" and a mess gets selected
      const sameEnd = toRight === <VisualModeNS.ForwardDir> a.di_,
      fixSelAll = sameEnd && (a.diType_ & VisualModeNS.DiType.Complicated) && ("" + sel).length;
      // r / r : l ; r / l : r ; l / r : l ; l / l : r
      a.extend_(1 - <VisualModeNS.ForwardDir> a.di_);
      sameEnd && a.extend_(toRight);
      fixSelAll && ("" + sel).length !== fixSelAll && a.extend_(1 - toRight);
    }
    toRight ? sel.collapseToEnd() : sel.collapseToStart();
    a.di_ = VisualModeNS.kDir.right;
  },
  selectLexicalEntity_ (entity: VisualModeNS.G.sentence | VisualModeNS.G.word, count: number): void {
    const a = this;
    a.collapseToFocus_(1);
    entity - VisualModeNS.G.word || a.modify_(VisualModeNS.kDir.right, VisualModeNS.G.character);
    a.modify_(VisualModeNS.kDir.left, entity);
    a.di_ = VisualModeNS.kDir.left; // safe
    a.collapseToFocus_(1);
    a.runMovements_(VisualModeNS.kDir.right, entity, count);
  },
  /** after called, VVisual must exit at once */
  selectLine_ (count: number): void {
    const a = this, oldDi = a.getDirection_();
    a.mode_ = VisualModeNS.Mode.Visual; // safer
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
    if (ch && num1 && ch !== "\n" && !(Build.BTypes & BrowserType.Firefox && ch === "\r")) {
      a.extend_(VisualModeNS.kDir.left);
      ("" + a.selection_).length + 2 - num1 && a.extend_(VisualModeNS.kDir.right);
    }
  },
  ensureLine_ (command: number): void {
    const a = this;
    let di = a.getDirection_();
    if (di && command < 20 && command >= 0 && !a.diType_ && a.selType_() === SelType.Caret) {
      di = (1 - (command & 1)) as VisualModeNS.ForwardDir; // old Di
      a.modify_(di, VisualModeNS.G.lineboundary);
      a.selType_() !== SelType.Range && a.modify_(di, VisualModeNS.G.line);
      a.di_ = di;
      a.reverseSelection_();
      let len = (a.selection_ + "").length;
      a.modify_(di = a.di_ = 1 - di, VisualModeNS.G.lineboundary);
      (a.selection_ + "").length - len || a.modify_(di, VisualModeNS.G.line);
      return;
    }
    for (let mode = 2; 0 < mode--; ) {
      a.reverseSelection_();
      di = a.di_ = (1 - di) as VisualModeNS.ForwardDir;
      a.modify_(di, VisualModeNS.G.lineboundary);
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
  const a = this;
  a.init_ = null as never;
  const typeIdx = { None: SelType.None, Caret: SelType.Caret, Range: SelType.Range };
  a.selType_ = !!(Build.BTypes & BrowserType.Chrome)
      && Build.MinCVer <= BrowserVer.$Selection$NotShowStatusInTextBox
      && VUtils.cache_.browserVer_ === BrowserVer.$Selection$NotShowStatusInTextBox
  ? function (this: typeof VVisual): SelType {
    let type = typeIdx[this.selection_.type];
    return type === SelType.Caret && VVisual.diType_ && ("" + this.selection_) ? SelType.Range : type;
  } : function (this: typeof VVisual): SelType {
    return typeIdx[this.selection_.type];
  };
  const map = a.keyMap_, func = VUtils.safer_;
/**
 * Call stack (Chromium > icu):
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/visible_units_word.cc?type=cs&q=NextWordPositionInternal&g=0&l=86
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/platform/wtf/text/unicode.h?type=cs&q=IsAlphanumeric&g=0&l=177
 * * https://cs.chromium.org/chromium/src/third_party/icu/source/common/uchar.cpp?q=u_isalnum&g=0&l=151
 * Result: \p{L | Nd} || '_' (\u005F)
 * Definitions:
 * * General Category (Unicode): https://unicode.org/reports/tr44/#GC_Values_Table
 * * valid GC in RegExp: https://tc39.github.io/proposal-regexp-unicode-property-escapes/#sec-runtime-semantics-unicodematchpropertyvalue-p-v
 * * \w in RegExp: https://unicode.org/reports/tr18/#word
 *   * \w = \p{Alpha | gc=Mark | Digit | gc=Connector_Punctuation | Join_Control}
 *   * Alphabetic: https://unicode.org/reports/tr44/#Alphabetic
 * But \p{L} = \p{Lu | Ll | Lt | Lm | Lo}, so it's much more accurate to use \p{L}
 * if no unicode RegExp, The list of words will be loaded into {@link background/settings.ts#Settings.CONST_.WordsRe_}
 */
  // icu@u_isalnum: http://icu-project.org/apiref/icu4c/uchar_8h.html#a5dff81615fcb62295bf8b1c63dd33a14
  if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
      || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && VUtils.cache_.browser_ === BrowserType.Firefox
        || VUtils.cache_.browserVer_ < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
      // Firefox && not native || Chrome && not only white spaces
      if (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces <= BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
          && !(Build.BTypes & ~BrowserType.Chrome)
          ) {
        a.WordsRe_ = new RegExp(words, "");
      } else {
        // note: the /[^]*[~~~]/ should have an acceptable performance
        a.WordsRe_ = new RegExp(words || "[^]*[\\p{L}\\p{Nd}_]", words ? "" : "u");
      }
    }
  }
/** C72
 * The real is ` (!IsSpaceOrNewline(c) && c != kNoBreakSpaceCharacter) || c == '\n' `
 * in https://cs.chromium.org/chromium/src/third_party/blink/renderer/platform/wtf/text/string_impl.h?type=cs&q=IsSpaceOrNewline&sq=package:chromium&g=0&l=800
 * `IsSpaceOrNewline` says "Bidi=WS" doesn't include '\n'", it's because:
 * * the upstream is (2002/11/07) https://chromium.googlesource.com/chromium/src/+/68f88bec7f005b2abc9018b086396a88f1ffc18e%5E%21/#F3 ,
 * * and then the specification it used in `< 128 ? isspace : DirWS` was https://unicode.org/Public/2.1-Update4/PropList-2.1.9.txt
 * * it thinks the "White space" and "Bidi: Whitespace" properties are different, and Bidi:WS only includes 0020,2000..200B,2028,3000
 * While the current https://unicode.org/reports/tr44/#BC_Values_Table does not:
 * * in https://unicode.org/Public/UCD/latest/ucd/PropList.txt , WS covers `WebTemplateFramework::IsASCIISpace` totally (0009..000D,0020)
 * /\s/
 * * Run ` for(var a="",i=0,ch=''; i<=0xffff; i++) /\s/.test(String.fromCharCode(i)) && (a+='\\u' + (0x10000 + i).toString(16).slice(1)); a; ` gets
 * * \u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff (C72)
 * * when <= C58 (Min$Space$NotMatch$U180e$InRegExp), there's \u180e (it's added by Unicode standard v4.0.0 and then removed since v6.3.0)
 * * compared to "\p{WS}", it ("\s") lacks \u0085 (it's added in v3.0.0), but adds an extra \ufeff
 * * "\s" in regexp is not affected by the "unicode" flag https://mathiasbynens.be/notes/es6-unicode-regex
 * During tests: not skip \u0085\u180e\u2029\u202f\ufeff since C59; otherwise all including \u0085\ufeff are skipped
 */
  /** Changes
   * MinSelExtendForwardOnlySkipWhitespaces=59
   *  : https://chromium.googlesource.com/chromium/src/+/117a5ba5073a1c78d08d3be3210afc09af96158c%5E%21/#F2
   * Min$Space$NotMatch$U180e$InRegExp=59
   */
  (!(Build.BTypes & ~BrowserType.Firefox)
    || Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
    || (Build.BTypes & BrowserType.Firefox && VUtils.cache_.browser_ === BrowserType.Firefox)
    || VUtils.cache_.browserVer_ >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) &&
  // on Firefox 65 stable, Win 10 x64, there're '\r\n' parts in Selection.toString()
  (a._rightWhiteSpaceRe = Build.BTypes & BrowserType.Firefox
      ? /[^\S\n\r\u2029\u202f\ufeff]+$/ as RegExpOne : /[^\S\n\u2029\u202f\ufeff]+$/ as RegExpOne);
  func(map); func(map.a as Dict<VisualModeNS.ValidActions>); func(map.g as Dict<VisualModeNS.ValidActions>);
}
};
