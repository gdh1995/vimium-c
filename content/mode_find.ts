var VFind = {
  isActive_: false,
  query_: "",
  query0_: "",
  parsedQuery_: "",
  parsedRegexp_: null as RegExpG | null,
  historyIndex_: 0,
  notEmpty_: false,
  isRegex_: null as boolean | null,
  ignoreCase_: null as boolean | null,
  wholeWord_: false,
  hasResults_: false,
  matchCount_: 0,
  coords_: null as null | MarksNS.ScrollInfo,
  initialRange_: null as Range | null,
  activeRegexIndex_: 0,
  regexMatches_: null as RegExpMatchArray | null,
  box_: null as never as HTMLIFrameElement & { contentDocument: Document },
  input_: null as never as HTMLBodyElement,
  countEl_: null as never as HTMLSpanElement,
  styleIn_: null as never as HTMLStyleElement,
  styleOut_: null as never as HTMLStyleElement,
  A0Re_: <RegExpG> /\xa0/g,
  tailRe_: <RegExpOne> /\n$/,
  css_: null as never as [string, string],
  activate_ (this: void, _0: number, options: CmdOptions[kFgCmd.findMode]): void {
    if (!VDom.isHTML_()) { return; }
    const query: string | undefined | null = (options.query || "") + "",
    ui = VDom.UI, first = !ui.box_;
    const a = VFind;
    a.isActive_ || query === a.query_ && options.leave || VMarks.setPreviousPosition_();
    VDom.docSelectable_ = ui.getDocSelectable_();
    ui.ensureBorder_();
    if (options.leave) {
      return a.findAndFocus_(query || a.query_, options);
    }
    a.getCurrentRange_();
    if (options.returnToViewport) {
      a.coords_ = [window.scrollX, window.scrollY];
    }
    a.box_ && ui.adjust_();
    VHUD.hide_(TimerType.noTimer);
    if (a.isActive_) {
      return a.setFirstQuery_(query);
    }

    a.parsedQuery_ = a.query_ = "";
    a.parsedRegexp_ = a.regexMatches_ = null;
    a.activeRegexIndex_ = 0;

    const el = a.box_ = VDom.createElement_("iframe") as typeof VFind.box_;
    a.css_ = options.findCSS || a.css_;
    el.className = "R HUD UI";
    el.style.width = "0px";
    if (VDom.wdZoom_ !== 1) { el.style.zoom = "" + 1 / VDom.wdZoom_; }
    el.onload = function(this: HTMLIFrameElement): void { return VFind.onLoad_(1); };
    VUtils.push_(ui.SuppressMost_, a);
    a.query_ || (a.query0_ = query);
    a.init_ && a.init_(AdjustType.NotAdjust);
    ui.toggleSelectStyle_(1);
    ui.addElement_(el, first ? AdjustType.NotAdjust : AdjustType.MustAdjust, VHUD.box_);
    first && ui.adjust_();
    a.isActive_ = true;
  },
  onLoad_ (later?: 1): void {
    const a = this, box: HTMLIFrameElement = a.box_,
    wnd = box.contentWindow, f = wnd.addEventListener.bind(wnd) as typeof addEventListener,
    now = Date.now(), s = VUtils.Stop_, t = true;
    let tick = 0;
    f("mousedown", a.OnMousedown_, t);
    f("keydown", a.onKeydown_.bind(a), t);
    f("input", a.OnInput_, t);
    f("paste", a.OnPaste_, t);
    f("unload", a.OnUnload_, t);
    for (const i of ["keypress", "keyup", "mouseup", "click", "contextmenu", "copy", "cut", "paste"]) {
      f(i, s, t);
    }
    f("blur", function onBlur(this: Window): void {
      if (VFind.isActive_ && Date.now() - now < 500) {
        let a = this.document.body as HTMLBodyElement | null;
        a && setTimeout(function(): void { (a as HTMLBodyElement).focus(); }, tick++ * 17);
      } else {
        this.removeEventListener("blur", onBlur, true);
      }
    }, t);
    f("focus", a.OnFocus_, t);
    box.onload = later ? null as never : function(): void { this.onload = null as never; VFind.onLoad2_(this.contentWindow); };
    if (later) { a.onLoad2_(wnd); }
  },
  onLoad2_ (wnd: Window): void {
    const doc = wnd.document, docEl = doc.documentElement as HTMLHtmlElement,
    a = VFind,
    el: HTMLElement = a.input_ = doc.body as HTMLBodyElement,
    zoom = wnd.devicePixelRatio;
    let plain = true;
    try {
      el.contentEditable = "plaintext-only";
    } catch (e) {
      plain = false;
      el.contentEditable = "true";
    }
    wnd.removeEventListener("paste", plain ? a.OnPaste_ : VUtils.Stop_, true);
    const el2 = a.countEl_ = doc.createElement("count");
    el2.appendChild(doc.createTextNode(""));
    zoom < 1 && (docEl.style.zoom = "" + 1 / zoom);
    (doc.head as HTMLHeadElement).appendChild(VDom.UI.createStyle_(a.css_[1], doc.createElement("style")));
    docEl.insertBefore(doc.createTextNode("/"), el);
    docEl.appendChild(el2);
    function cb(): void {
      const a = VFind;
      VUtils.remove_(a);
      el.focus();
      return a.setFirstQuery_(a.query0_);
    }
    if ((VDom.UI.box_ as HTMLElement).style.display) {
      VDom.UI.callback_ = cb;
    } else {
      return cb();
    }
  },
  _actived: false,
  OnFocus_ (this: Window, event: Event): void {
    if (VFind._actived && event.target === this) {
      VEvent.OnWndFocus_();
    }
    return VUtils.Stop_(event);
  },
  setFirstQuery_ (query: string): void {
    const wnd = this.box_.contentWindow;
    this._actived = false;
    wnd.focus();
    this.query0_ = "";
    this.query_ || this.SetQuery_(query);
    this.input_.focus();
    this.query_ && wnd.document.execCommand("selectAll", false);
    this._actived = true;
  },
  init_ (adjust: AdjustType): void {
    const ref = this.postMode_, UI = VDom.UI,
    css = this.css_[0], sin = this.styleIn_ = UI.createStyle_(css);
    ref.exit_ = ref.exit_.bind(ref);
    UI.addElement_(sin, adjust, true);
    sin.remove();
    this.styleOut_ = UI.box_ !== UI.R ? UI.createStyle_(css) : sin;
    this.init_ = null as never;
  },
  findAndFocus_ (query: string, options: CmdOptions[kFgCmd.findMode]): void {
    if (!query) {
      return VHUD.tip("No old queries to find.");
    }
    if (query !== this.query_) {
      this.updateQuery_(query);
      if (this.isActive_) {
        this.input_.textContent = query.replace(<RegExpOne> /^ /, '\xa0');
        this.showCount_();
      }
    }
    this.init_ && this.init_(AdjustType.MustAdjust);
    const style = this.isActive_ || VHUD.opacity_ !== 1 ? null : (VHUD.box_ as HTMLDivElement).style;
    style && (style.visibility = "hidden");
    VDom.UI.toggleSelectStyle_(0);
    this.execute_(null, options);
    style && (style.visibility = "");
    if (!this.hasResults_) {
      if (!this.isActive_) {
        VDom.UI.toggleSelectStyle_(0);
        VHUD.tip(`No matches for '${this.query_}'`);
      }
      return;
    }
    this.focusFoundLink_(getSelection().anchorNode as Element | null);
    return this.postMode_.activate_();
  },
  clean_ (i: FindNS.Action): Element | null { // need keep @hasResults
    let el: Element | null = null, _this = VFind;
    _this.coords_ && window.scrollTo(_this.coords_[0], _this.coords_[1]);
    _this.isActive_ = _this._small = _this._actived = _this.notEmpty_ = false;
    if (i !== FindNS.Action.ExitUnexpectedly && i !== FindNS.Action.ExitNoFocus) {
      // todo: check `VFind.box.contentWindow.blur();` on FF/Edge
      window.focus();
      el = VDom.getSelectionEdgeElement_(getSelection(), 1);
      el && el.focus && el.focus();
    }
    _this.box_.remove();
    if (_this.box_ === VDom.lastHovered_) { VDom.lastHovered_ = null; }
    _this.parsedQuery_ = _this.query_ = _this.query0_ = "";
    _this.historyIndex_ = _this.matchCount_ = 0;
    _this.box_ = _this.input_ = _this.countEl_ = _this.parsedRegexp_ =
    _this.initialRange_ = _this.regexMatches_ = _this.coords_ = null as never;
    return el;
  },
  OnUnload_ (this: void, e: Event): void {
    const f = VFind;
    if (!f || e.isTrusted === false) { return; }
    f.isActive_ && f.deactivate_(FindNS.Action.ExitUnexpectedly);
  },
  OnMousedown_ (this: void, event: MouseEvent): void {
    if (event.target !== VFind.input_ && event.isTrusted !== false) {
      VUtils.prevent_(event);
      VFind.input_.focus();
    }
  },
  OnPaste_ (this: HTMLElement, event: ClipboardEvent): void {
    const d = event.clipboardData, text = d && typeof d.getData === "function" ? d.getData("text/plain") : "";
    VUtils.prevent_(event);
    if (!text) { return; }
    (event.target as HTMLElement).ownerDocument.execCommand("insertText", false, text + "");
  },
  onKeydown_ (event: KeyboardEvent): void {
    VUtils.Stop_(event);
    if (event.isTrusted === false) { return; }
    if (VScroller.keyIsDown_ && VEvent.OnScrolls_[0](event)) { return; }
    const n = event.keyCode;
    type Result = FindNS.Action;
    let i: Result | KeyStat = event.altKey ? FindNS.Action.DoNothing
      : n === VKeyCodes.enter ? event.shiftKey ? FindNS.Action.PassDirectly : (this.saveQuery_(), FindNS.Action.ExitToPostMode)
      : (n !== VKeyCodes.backspace && n !== VKeyCodes.deleteKey) ? FindNS.Action.DoNothing
      : this.query_ || (n === VKeyCodes.deleteKey && !VSettings.cache.onMac || event.repeat) ? FindNS.Action.PassDirectly
      : FindNS.Action.Exit;
    if (!i) {
      if (VKeyboard.isEscape_(event)) { i = FindNS.Action.ExitAndReFocus; }
      else if (i = VKeyboard.getKeyStat_(event)) {
        if (i & ~KeyStat.PrimaryModifier) { return; }
        else if (n === VKeyCodes.up || n === VKeyCodes.down || n === VKeyCodes.end || n === VKeyCodes.home) {
          VEvent.scroll_(event, this.box_.contentWindow);
        }
        else if (n === VKeyCodes.J || n === VKeyCodes.K) {
          this.execute_(null, { count: (VKeyCodes.K - n) || -1 });
        }
        else { return; }
        i = FindNS.Action.DoNothing;
      }
      else if (n === VKeyCodes.f1) { this.box_.contentDocument.execCommand("delete"); }
      else if (n === VKeyCodes.f2) { window.focus(); VEvent.suppress_(n); }
      else if (n === VKeyCodes.up || n === VKeyCodes.down) { this.nextQuery_(n !== VKeyCodes.up); }
      else { return; }
    } else if (i === FindNS.Action.PassDirectly) {
      return;
    }
    VUtils.prevent_(event);
    if (!i) { return; }
    VEvent.suppress_(n);
    this.deactivate_(i as FindNS.Action);
  },
  deactivate_(i: FindNS.Action): void {
    let sin = this.styleIn_, noStyle = !sin || !sin.parentNode, el = this.clean_(i), el2: Element | null;
    if ((i === FindNS.Action.ExitAndReFocus || !this.hasResults_ || VVisual.mode_) && !noStyle) {
      this.DisableStyle_(1);
      this.restoreSelection_(true);
    }
    if (VVisual.mode_) {
      return VVisual.activate_(1, VUtils.safer_({
        mode: VisualModeNS.Mode.Visual as VisualModeNS.Mode.Visual,
        from_find: true as true
      }));
    }
    VDom.UI.toggleSelectStyle_(0);
    if (i < FindNS.Action.MinComplicatedExit || !this.hasResults_) { return; }
    if (!el || el !== VEvent.lock()) {
      el = getSelection().anchorNode as Element | null;
      if (el && !this.focusFoundLink_(el) && i === FindNS.Action.ExitAndReFocus && (el2 = document.activeElement)) {
        if (VDom.getEditableType_(el2) >= EditableType.Editbox && el.contains(el2)) {
          VDom.prepareCrop_();
          VDom.UI.simulateSelect_(el2);
        }
      }
    }
    if (i === FindNS.Action.ExitToPostMode) { return this.postMode_.activate_(); }
  },
  focusFoundLink_ (el: Element | null): el is HTMLAnchorElement {
    for (; el && el !== document.body; el = VDom.GetParent_(el)) {
      if (el instanceof HTMLAnchorElement) {
        el.focus();
        return true;
      }
    }
    return false;
  },
  nextQuery_ (back?: boolean): void {
    const ind = this.historyIndex_ + (back ? -1 : 1);
    if (ind < 0) { return; }
    this.historyIndex_ = ind;
    if (!back) {
      return VPort.send_({ msg: kFgReq.findQuery, index: ind }, this.SetQuery_);
    }
    const wnd = this.box_.contentWindow;
    wnd.document.execCommand("undo", false);
    wnd.getSelection().collapseToEnd();
  },
  SetQuery_ (this: void, query: string): void {
    let _this = VFind, doc: Document;
    if (query === _this.query_ || !(doc = _this.box_.contentDocument)) { return; }
    if (!query && _this.historyIndex_ > 0) { --_this.historyIndex_; return; }
    doc.execCommand("selectAll", false);
    doc.execCommand("insertText", false, query.replace(<RegExpOne> /^ /, '\xa0'));
    return _this.OnInput_();
  },
  saveQuery_ (): string | void | 1 {
    return this.query_ && VPort.post({ H: kFgReq.findQuery, query: this.query_ });
  },
  postMode_: {
    lock_: null as Element | null,
    activate_: function() {
      const el = VEvent.lock(), Exit = this.exit_ as (this: void, a?: boolean | Event) => void;
      if (!el) { Exit(); return; }
      VUtils.push_(this.onKeydown_, this);
      if (el === this.lock_) { return; }
      if (!this.lock_) {
        addEventListener("click", Exit, true);
        VEvent.setupSuppress_(Exit);
      }
      Exit(true);
      this.lock_ = el;
      el.addEventListener("blur", Exit, true);
    },
    onKeydown_ (event: KeyboardEvent): HandlerResult {
      const exit = VKeyboard.isEscape_(event);
      exit ? this.exit_() : VUtils.remove_(this);
      return exit ? HandlerResult.Prevent : HandlerResult.Nothing;
    },
    exit_ (skip?: boolean | Event): void {
      if (skip instanceof MouseEvent && skip.isTrusted === false) { return; }
      this.lock_ && this.lock_.removeEventListener("blur", this.exit_, true);
      if (!this.lock_ || skip === true) { return; }
      this.lock_ = null;
      removeEventListener("click", this.exit_, true);
      VUtils.remove_(this);
      VEvent.setupSuppress_();
    }
  },
  OnInput_ (this: void, e?: Event): void {
    if (e != null) {
      VUtils.Stop_(e);
      if (e.isTrusted === false) { return; }
    }
    const _this = VFind, query = _this.input_.innerText.replace(_this.A0Re_, " ").replace(_this.tailRe_, "");
    let s = _this.query_;
    if (!_this.hasResults_ && !_this.isRegex_ && _this.notEmpty_ && query.startsWith(s) && query.substring(s.length - 1).indexOf("\\") < 0) { return; }
    s = "";
    _this.coords_ && window.scrollTo(_this.coords_[0], _this.coords_[1]);
    _this.updateQuery_(query);
    _this.restoreSelection_();
    _this.execute_(!_this.isRegex_ ? _this.parsedQuery_ : _this.regexMatches_ ? _this.regexMatches_[0] : "");
    return _this.showCount_();
  },
  _small: false,
  showCount_ (): void {
    let count = this.matchCount_;
    (this.countEl_.firstChild as Text).data = !this.parsedQuery_ ? ""
      : "(" + (count || (this.hasResults_ ? "Some" : "No")) + " match" + (count !== 1 ? "es)" : ")");
    count = this.input_.offsetWidth + this.countEl_.offsetWidth + 4;
    if (this._small && count < 150) { return; }
    this.box_.style.width = ((this._small = count < 150) ? 0 : count) + "px";
  },
  _ctrlRe: <RegExpG & RegExpSearchable<0>> /\\[CIRW\\cirw]/g,
  _bslashRe: <RegExpG & RegExpSearchable<0>> /\\\\/g,
  _escapeAllRe: <RegExpG> /[$()*+.?\[\\\]\^{|}]/g,
  updateQuery_ (query: string): void {
    const a = this;
    a.query_ = query;
    a.wholeWord_ = false;
    a.isRegex_ = a.ignoreCase_ = null as boolean | null;
    query = query.replace(a._ctrlRe, a.FormatQuery_);
    const supportWholeWord = VSettings.cache.browser === BrowserType.Chrome;
    let isRe = a.isRegex_, ww = a.wholeWord_, B = "\\b";
    if (isRe === null && !ww) {
      isRe = VSettings.cache.regexFindMode;
      const info = 2 * +query.startsWith(B) + +query.endsWith(B);
      if (info === 3 && !isRe && query.length > 3) {
        query = query.slice(2, -2);
        ww = true;
      } else if (info && info < 3) {
        isRe = true;
      }
    }
    isRe = isRe || false;
    if (ww && (isRe || !supportWholeWord)) {
      query = B + query.replace(a._bslashRe, "\\").replace(a._escapeAllRe, "\\$&") + B;
      ww = false;
      isRe = true;
    }
    query = isRe ? query !== "\\b\\b" && query !== B ? query : "" : query.replace(a._bslashRe, "\\");
    a.parsedQuery_ = query;
    a.isRegex_ = isRe;
    a.wholeWord_ = ww;
    a.notEmpty_ = !!query;
    a.ignoreCase_ !== null || (a.ignoreCase_ = !VUtils.hasUpperCase_(query));
    isRe || (query = a.isActive_ ? query.replace(a._escapeAllRe, "\\$&") : "");

    let re: RegExpG | null = null;
    if (query) {
      try { re = new RegExp(ww ? B + query + B : query, a.ignoreCase_ ? "gi" as "g" : "g"); } catch (e) {}
    }
    let matches: RegExpMatchArray | null = null;
    if (re) {
      type FullScreenElement = Element & { innerText?: string | Element };
      let el = document.webkitFullscreenElement as FullScreenElement | null, text = el && el.innerText;
      el && typeof text !== "string" && (el = VDom.GetParent_(el), text = el && el.innerText as string | undefined);
      query = <string | undefined | null>text || (document.documentElement as HTMLElement).innerText;
      matches = query.match(re) || query.replace(a.A0Re_, " ").match(re);
    }
    a.regexMatches_ = isRe ? matches : null;
    a.parsedRegexp_ = isRe ? re : null;
    a.activeRegexIndex_ = 0;
    a.matchCount_ = matches ? matches.length : 0;
  },
  FormatQuery_ (this: void, str: string): string {
    let flag = str.charCodeAt(1), enabled = flag >= KnownKey.a, a = VFind;
    if (flag === KnownKey.backslash) { return str; }
    flag &= KnownKey.AlphaMask;
    if (flag === KnownKey.I || flag === KnownKey.C) { a.ignoreCase_ = enabled === (flag === KnownKey.I); }
    else if (flag === KnownKey.W) {
      if (a.isRegex_) { return str; }
      a.wholeWord_ = enabled;
    }
    else { a.isRegex_ = enabled; }
    return "";
  },
  restoreSelection_ (isCur?: boolean): void {
    const sel = getSelection(),
    range = !isCur ? this.initialRange_ : sel.isCollapsed ? null : sel.getRangeAt(0);
    if (!range) { return; }
    sel.removeAllRanges();
    sel.addRange(range);
  },
  getNextQueryFromRegexMatches_ (back?: boolean): string {
    if (!this.regexMatches_) { return ""; }
    let count = this.matchCount_;
    this.activeRegexIndex_ = count = (this.activeRegexIndex_ + (back ? -1 : 1) + count) % count;
    return this.regexMatches_[count];
  },
  execute_ (query?: string | null, options?: FindNS.ExecuteOptions): void {
    options = options ? VUtils.safer_(options) : Object.create(null) as FindNS.ExecuteOptions;
    let el: Element | null, found: boolean, count = ((options.count as number) | 0) || 1, back = count < 0
      , par: HTMLElement | null = null, timesRegExpNotMatch = 0
      , q: string, notSens = this.ignoreCase_ && !options.caseSensitive;
    options.noColor || this.DisableStyle_(0);
    back && (count = -count);
    const isRe = this.isRegex_, pR = this.parsedRegexp_;
    do {
      q = query != null ? query : isRe ? this.getNextQueryFromRegexMatches_(back) : this.parsedQuery_;
      found = this.find_(q, !notSens, back, true, this.wholeWord_, false, false);
      if (found && pR && (par = VDom.GetSelectionParent_unsafe_())) {
        pR.lastIndex = 0;
        let text = par.innerText as string | HTMLElement;
        if (typeof text !== "string") {
          par = VDom.GetParent_(par);
          text = par ? par.innerText as string : "";
        }
        if (text && !(pR as RegExpG & RegExpSearchable<0>).exec(text)
            && timesRegExpNotMatch++ < 9) {
          count++;
        }
      }
    } while (0 < --count && found);
    options.noColor || setTimeout(this.HookSel_, 0);
    (el = VEvent.lock()) && !VDom.isSelected_() && el.blur && el.blur();
    this.hasResults_ = found;
  },
  find_: function (this: void): boolean {
    try {
      return window.find.apply(window, arguments);
    } catch (e) { return false; }
  } as Window["find"],
  HookSel_ (): void {
    document.addEventListener("selectionchange", VFind && VFind.DisableStyle_, true);
  },
  /** must be called after initing */
  DisableStyle_ (this: void, disable: BOOL | boolean | Event): void {
    const a = VFind, sout = a.styleOut_, sin = a.styleIn_, UI = VDom.UI, active = a.isActive_;
    document.removeEventListener("selectionchange", a.DisableStyle_, true);
    disable = !!disable;
    if (!active && disable) {
      UI.toggleSelectStyle_(0);
      sout.remove(); sin.remove();
      return;
    }
    sout.parentNode || (UI.box_ as HTMLDivElement).appendChild(sout);
    sin === sout || sout.parentNode || (UI.R as ShadowRoot).insertBefore(sin, a.box_);
    sout.sheet && (sout.sheet.disabled = disable);
    sin.sheet && (sin.sheet.disabled = disable);
  },
  getCurrentRange_ (): void {
    let sel = getSelection(), range: Range;
    if (!sel.rangeCount) {
      range = document.createRange();
      range.setStart(document.body || document.documentElement as Element, 0);
    } else {
      range = sel.getRangeAt(0);
    }
    range.collapse(true);
    this.initialRange_ = range;
  }
};
