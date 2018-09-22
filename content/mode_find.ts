type FindOptions = CmdOptions["Find.activate"] & {
  returnToViewport: boolean;
};

var VFindMode = {
  isActive: false,
  query: "",
  query0: "",
  parsedQuery: "",
  parsedRegexp: null as RegExpG | null,
  historyIndex: 0,
  notEmpty: false,
  isRegex: null as boolean | null,
  ignoreCase: null as boolean | null,
  wholeWord: false,
  hasResults: false,
  matchCount: 0,
  coords: null as null | MarksNS.ScrollInfo,
  initialRange: null as Range | null,
  activeRegexIndex: 0,
  regexMatches: null as RegExpMatchArray | null,
  box: null as never as HTMLIFrameElement & { contentDocument: Document },
  input: null as never as HTMLBodyElement,
  countEl: null as never as HTMLSpanElement,
  styleIn: null as never as HTMLStyleElement,
  styleOut: null as never as HTMLStyleElement,
  A0Re: <RegExpG> /\xa0/g,
  tailRe: <RegExpOne> /\n$/,
  cssSel: "::selection { background: #ff9632 !important; }",
  cssIFrame: `*{font:12px/14px "Helvetica Neue",Helvetica,Arial,sans-serif!important;
height:14px;margin:0;overflow:hidden;vertical-align:top;white-space:nowrap;cursor:default;}
body{cursor:text;display:inline-block;padding:0 3px 0 1px;max-width:215px;min-width:7px;}
body *{all:inherit!important;display:inline!important;}html>count{float:right;}`,
  activate (_0: number, options: Partial<FindOptions> & SafeObject): void {
    if (!VDom.isHTML()) { return; }
    const query: string | undefined | null = (options.query || "") + "",
    ui = VDom.UI, first = !ui.box;
    this.isActive || query === this.query && options.leave || VMarks.setPreviousPosition();
    VDom.docSelectable = ui.getDocSelectable();
    ui.ensureBorder();
    if (options.leave) {
      return this.findAndFocus(query || this.query, options);
    }
    this.getCurrentRange();
    if (options.returnToViewport) {
      this.coords = [window.scrollX, window.scrollY];
    }
    this.box && ui.adjust();
    VHUD.hide(TimerType.notTimer);
    if (this.isActive) {
      return this.setFirstQuery(query);
    }

    this.parsedQuery = this.query = "";
    this.parsedRegexp = this.regexMatches = null;
    this.activeRegexIndex = 0;

    const el = this.box = VDom.createElement("iframe") as typeof VFindMode.box;
    el.className = "R HUD UI";
    el.style.width = "0px";
    if (VDom.wdZoom !== 1) { el.style.zoom = "" + 1 / VDom.wdZoom; }
    el.onload = function(this: HTMLIFrameElement): void { return VFindMode.onLoad(this, 1); };
    VUtils.push(ui.SuppressMost, this);
    this.query || (this.query0 = query);
    this.init && this.init(AdjustType.NotAdjust);
    ui.toggleSelectStyle(true);
    ui.addElement(el, first ? AdjustType.NotAdjust : AdjustType.MustAdjust, VHUD.box);
    first && ui.adjust();
    this.isActive = true;
  },
  onLoad (box: HTMLIFrameElement, later?: 1): void {
    const wnd = box.contentWindow, f = wnd.addEventListener.bind(wnd) as typeof addEventListener,
    now = Date.now(), s = VUtils.Stop, t = true;
    let tick = 0;
    f("mousedown", this.OnMousedown, t);
    f("keydown", this.onKeydown.bind(this), t);
    f("input", this.onInput.bind(this), t);
    f("paste", this.OnPaste, t);
    f("keypress", s, t); f("keyup", s, t);
    f("mouseup", s, t); f("click", s, t); f("contextmenu", s, t);
    f("copy", s, t); f("cut", s, t); f("paste", s, t);
    function onBlur(this: Window): void {
      if (VFindMode.isActive && Date.now() - now < 500) {
        let a = this.document.body;
        a && setTimeout(function(): void { (a as HTMLElement).focus(); }, tick++ * 17);
      } else {
        this.removeEventListener("blur", onBlur, true);
      }
    }
    f("focus", this.OnFocus, t);
    f("blur", onBlur, t);
    box.onload = later ? null as never : function(): void { this.onload = null as never; VFindMode.onLoad2(this.contentWindow); };
    if (later) { return this.onLoad2(wnd); }
  },
  onLoad2 (wnd: Window): void {
    const doc = wnd.document, docEl = doc.documentElement as HTMLHtmlElement,
    el: HTMLElement = this.input = doc.body as HTMLBodyElement,
    zoom = wnd.devicePixelRatio;
    wnd.dispatchEvent(new Event("unload"));
    wnd.onunload = VFindMode.OnUnload;
    let plain = true;
    try {
      el.contentEditable = "plaintext-only";
    } catch (e) {
      plain = false;
      el.contentEditable = "true";
    }
    wnd.removeEventListener("paste", plain ? this.OnPaste : VUtils.Stop, true);
    const el2 = this.countEl = doc.createElement("count");
    el2.appendChild(doc.createTextNode(""));
    zoom < 1 && (docEl.style.zoom = "" + 1 / zoom);
    (doc.head as HTMLHeadElement).appendChild(VDom.UI.createStyle(VFindMode.cssIFrame, doc));
    docEl.insertBefore(doc.createTextNode("/"), el);
    docEl.appendChild(el2);
    function cb(): void {
      const a = VFindMode;
      VUtils.remove(a);
      el.focus();
      return a.setFirstQuery(a.query0);
    }
    if ((VDom.UI.box as HTMLElement).style.display) {
      VDom.UI.callback = cb;
    } else {
      return cb();
    }
  },
  _actived: false,
  OnFocus (this: Window, event: Event): void {
    if (VFindMode._actived && event.target === this) {
      VEventMode.OnWndFocus();
    }
    return VUtils.Stop(event);
  },
  setFirstQuery (query: string): void {
    const wnd = this.box.contentWindow;
    this._actived = false;
    this.styleIn.disabled = this.styleOut.disabled = true;
    wnd.focus();
    this.query0 = "";
    this.query || this.SetQuery(query);
    this.input.focus();
    this.query && wnd.document.execCommand("selectAll", false);
    this._actived = true;
  },
  init (adjust: AdjustType): void {
    const ref = this.postMode, UI = VDom.UI,
    css = this.cssSel, sin = this.styleIn = UI.createStyle(css);
    ref.exit = ref.exit.bind(ref);
    UI.addElement(sin, adjust, true);
    this.styleOut = UI.box !== UI.root ? (UI.box as HTMLElement).appendChild(UI.createStyle(css)) : sin;
    this.init = null as never;
  },
  findAndFocus (query: string, options: Partial<FindOptions> & SafeObject): void {
    if (!query) {
      return VHUD.showForDuration("No old queries");
    }
    if (query !== this.query) {
      this.updateQuery(query);
      if (this.isActive) {
        this.input.textContent = query.replace(<RegExpOne> /^ /, '\xa0');
        this.showCount();
      }
    }
    this.init && this.init(AdjustType.MustAdjust);
    const style = this.isActive || VHUD.opacity !== 1 ? null : (VHUD.box as HTMLDivElement).style;
    style && (style.visibility = "hidden");
    VDom.UI.toggleSelectStyle(true);
    this.execute(null, options);
    style && (style.visibility = "");
    if (!this.hasResults) {
      if (!this.isActive) {
        VDom.UI.toggleSelectStyle(false);
        VHUD.showForDuration(`No matches for '${this.query}'`);
      }
      return;
    }
    this.focusFoundLink(window.getSelection().anchorNode as Element | null);
    return this.postMode.activate();
  },
  clean (i: FindNS.Action): Element | null { // need keep @hasResults
    let el: Element | null = null;
    this.coords && window.scrollTo(this.coords[0], this.coords[1]);
    this.isActive = this._small = this._actived = this.notEmpty = false;
    if (i !== FindNS.Action.ExitUnexpectedly && i !== FindNS.Action.ExitNoFocus) {
      // todo: check `this.box.contentWindow.blur();` on FF/Edge
      window.focus();
      el = VDom.getSelectionFocusElement();
      el && el.focus && el.focus();
    }
    this.box.remove();
    if (this.box === VDom.lastHovered) { VDom.lastHovered = null; }
    this.parsedQuery = this.query = this.query0 = "";
    this.historyIndex = this.matchCount = 0;
    this.box = this.input = this.countEl = this.parsedRegexp =
    this.initialRange = this.regexMatches = this.coords = null as never;
    return el;
  },
  OnUnload (this: void, e: Event): void {
    const f = VFindMode;
    if (e.isTrusted === false || !f || !f.box) { return; }
    f.isActive && f.deactivate(FindNS.Action.ExitUnexpectedly);
  },
  OnMousedown (this: void, event: MouseEvent): void {
    if (event.target !== VFindMode.input && event.isTrusted !== false) {
      VUtils.prevent(event);
      VFindMode.input.focus();
    }
  },
  OnPaste (this: HTMLElement, event: ClipboardEvent): void {
    const d = event.clipboardData, text = d && typeof d.getData === "function" ? d.getData("text/plain") : "";
    VUtils.prevent(event);
    if (!text) { return; }
    (event.target as HTMLElement).ownerDocument.execCommand("insertText", false, text + "");
  },
  onKeydown (event: KeyboardEvent): void {
    VUtils.Stop(event);
    if (event.isTrusted === false) { return; }
    if (VScroller.keyIsDown && VEventMode.OnScrolls[0](event)) { return; }
    const n = event.keyCode;
    type Result = FindNS.Action;
    let i: Result | KeyStat = event.altKey ? FindNS.Action.DoNothing
      : n === VKeyCodes.enter ? event.shiftKey ? FindNS.Action.PassDirectly : (this.saveQuery(), FindNS.Action.ExitToPostMode)
      : (n !== VKeyCodes.backspace && n !== VKeyCodes.deleteKey) ? FindNS.Action.DoNothing
      : this.query || (n === VKeyCodes.deleteKey && !VSettings.cache.onMac || event.repeat) ? FindNS.Action.PassDirectly
      : FindNS.Action.Exit;
    if (!i) {
      if (VKeyboard.isEscape(event)) { i = FindNS.Action.ExitAndReFocus; }
      else if (i = VKeyboard.getKeyStat(event)) {
        if (i & ~KeyStat.PrimaryModifier) { return; }
        else if (n === VKeyCodes.up || n === VKeyCodes.down || n === VKeyCodes.end || n === VKeyCodes.home) {
          VEventMode.scroll(event, this.box.contentWindow);
        }
        else if (n === VKeyCodes.J || n === VKeyCodes.K) {
          this.execute(null, { count: (VKeyCodes.K - n) || -1 });
        }
        else { return; }
        i = FindNS.Action.DoNothing;
      }
      else if (n === VKeyCodes.f1) { this.box.contentDocument.execCommand("delete"); }
      else if (n === VKeyCodes.f2) { window.focus(); VEventMode.suppress(n); }
      else if (n === VKeyCodes.up || n === VKeyCodes.down) { this.nextQuery(n !== VKeyCodes.up); }
      else { return; }
    } else if (i === FindNS.Action.PassDirectly) {
      return;
    }
    VUtils.prevent(event);
    if (!i) { return; }
    VEventMode.suppress(n);
    return this.deactivate(i as FindNS.Action);
  },
  deactivate(i: FindNS.Action): void {
    let hasStyle = !this.styleIn.disabled, el = this.clean(i), el2: Element | null;
    if ((i === FindNS.Action.ExitAndReFocus || !this.hasResults || VVisualMode.mode) && hasStyle) {
      this.toggleStyle(0);
      this.restoreSelection(true);
    }
    if (VVisualMode.mode) { return VVisualMode.activate(1, VUtils.safer({from_find: true})); }
    VDom.UI.toggleSelectStyle(false);
    if (i < FindNS.Action.MinComplicatedExit || !this.hasResults) { return; }
    if (!el || el !== VEventMode.lock()) {
      el = window.getSelection().anchorNode as Element | null;
      if (el && !this.focusFoundLink(el) && i === FindNS.Action.ExitAndReFocus && (el2 = document.activeElement)) {
        if (VDom.getEditableType(el2) >= EditableType.Editbox && el.contains(el2)) {
          VDom.prepareCrop();
          VDom.UI.simulateSelect(el2);
        }
      }
    }
    if (i === FindNS.Action.ExitToPostMode) { return this.postMode.activate(); }
  },
  focusFoundLink (el: Element | null): el is HTMLAnchorElement {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el instanceof HTMLAnchorElement) {
        el.focus();
        return true;
      }
    }
    return false;
  },
  nextQuery (back?: boolean): void {
    const ind = this.historyIndex + (back ? -1 : 1);
    if (ind < 0) { return; }
    this.historyIndex = ind;
    if (!back) {
      return VPort.send({ handler: "findQuery", index: ind }, this.SetQuery);
    }
    const wnd = this.box.contentWindow;
    wnd.document.execCommand("undo", false);
    wnd.getSelection().collapseToEnd();
  },
  SetQuery (this: void, query: string): void {
    let _this = VFindMode, doc: Document;
    if (query === _this.query || !(doc = _this.box.contentDocument)) { return; }
    if (!query && _this.historyIndex > 0) { --_this.historyIndex; return; }
    doc.execCommand("selectAll", false);
    doc.execCommand("insertText", false, query.replace(<RegExpOne> /^ /, '\xa0'));
    return _this.onInput();
  },
  saveQuery (): string | void | 1 {
    return this.query && VPort.post({ handler: "findQuery", query: this.query });
  },
  postMode: {
    lock: null as Element | null,
    activate: function() {
      const el = VEventMode.lock(), Exit = this.exit as (this: void, a?: boolean | Event) => void;
      if (!el) { Exit(); return; }
      VUtils.push(this.onKeydown, this);
      if (el === this.lock) { return; }
      if (!this.lock) {
        addEventListener("click", Exit, true);
        VEventMode.setupSuppress(Exit);
      }
      Exit(true);
      this.lock = el;
      el.addEventListener("blur", Exit, true);
    },
    onKeydown (event: KeyboardEvent): HandlerResult {
      const exit = VKeyboard.isEscape(event);
      exit ? this.exit() : VUtils.remove(this);
      return exit ? HandlerResult.Prevent : HandlerResult.Nothing;
    },
    exit (skip?: boolean | Event): void {
      if (skip instanceof MouseEvent && skip.isTrusted === false) { return; }
      this.lock && this.lock.removeEventListener("blur", this.exit, true);
      if (!this.lock || skip === true) { return; }
      this.lock = null;
      removeEventListener("click", this.exit, true);
      VUtils.remove(this);
      return VEventMode.setupSuppress();
    }
  },
  onInput (e?: Event): void {
    if (e != null) {
      VUtils.Stop(e);
      if (e.isTrusted === false) { return; }
    }
    const query = this.input.innerText.replace(this.A0Re, " ").replace(this.tailRe, "");
    let s = this.query;
    if (!this.hasResults && !this.isRegex && this.notEmpty && query.startsWith(s) && query.substring(s.length - 1).indexOf("\\") < 0) { return; }
    s = "";
    this.coords && window.scrollTo(this.coords[0], this.coords[1]);
    this.updateQuery(query);
    this.restoreSelection();
    this.execute(!this.isRegex ? this.parsedQuery : this.regexMatches ? this.regexMatches[0] : "");
    return this.showCount();
  },
  _small: false,
  showCount (): void {
    let count = this.matchCount;
    (this.countEl.firstChild as Text).data = !this.parsedQuery ? ""
      : "(" + (count || (this.hasResults ? "Some" : "No")) + " match" + (count !== 1 ? "es)" : ")");
    count = this.input.offsetWidth + this.countEl.offsetWidth + 4;
    if (this._small && count < 150) { return; }
    this.box.style.width = ((this._small = count < 150) ? 0 : count) + "px";
  },
  _ctrlRe: <RegExpG & RegExpSearchable<0>> /\\[CIRW\\cirw]/g,
  _bslashRe: <RegExpG & RegExpSearchable<0>> /\\\\/g,
  escapeAllRe: <RegExpG> /[$()*+.?\[\\\]\^{|}]/g,
  updateQuery (query: string): void {
    const a = this;
    a.query = query;
    a.wholeWord = false;
    a.isRegex = a.ignoreCase = null as boolean | null;
    query = query.replace(a._ctrlRe, a.FormatQuery);
    const supportWholeWord = VSettings.cache.browser === BrowserType.Chrome;
    let isRe = a.isRegex, ww = a.wholeWord, B = "\\b";
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
      query = B + query.replace(a._bslashRe, "\\").replace(a.escapeAllRe, "\\$&") + B;
      ww = false;
      isRe = true;
    }
    query = isRe ? query !== "\\b\\b" && query !== B ? query : "" : query.replace(a._bslashRe, "\\");
    a.parsedQuery = query;
    a.isRegex = isRe;
    a.wholeWord = ww;
    a.notEmpty = !!query;
    a.ignoreCase !== null || (a.ignoreCase = !VUtils.hasUpperCase(query));
    isRe || (query = a.isActive ? query.replace(a.escapeAllRe, "\\$&") : "");

    let re: RegExpG | null = null;
    if (query) {
      try { re = new RegExp(ww ? B + query + B : query, a.ignoreCase ? "gi" as "g" : "g"); } catch (e) {}
    }
    let matches: RegExpMatchArray | null = null;
    if (re) {
      query = ((document.webkitFullscreenElement || document.documentElement) as HTMLElement).innerText;
      matches = query.match(re) || query.replace(a.A0Re, " ").match(re);
    }
    a.regexMatches = isRe ? matches : null;
    a.parsedRegexp = isRe ? re : null;
    a.activeRegexIndex = 0;
    a.matchCount = matches ? matches.length : 0;
  },
  FormatQuery (this: void, str: string): string {
    let flag = str.charCodeAt(1), enabled = flag >= KnownKey.a, a = VFindMode;
    if (flag === KnownKey.backslash) { return str; }
    flag &= KnownKey.AlphaMask;
    if (flag === KnownKey.I || flag === KnownKey.C) { a.ignoreCase = enabled === (flag === KnownKey.I); }
    else if (flag === KnownKey.W) {
      if (a.isRegex) { return str; }
      a.wholeWord = enabled;
    }
    else { a.isRegex = enabled; }
    return "";
  },
  restoreSelection (isCur?: boolean): void {
    const sel = window.getSelection(),
    range = !isCur ? this.initialRange : sel.isCollapsed ? null : sel.getRangeAt(0);
    if (!range) { return; }
    sel.removeAllRanges();
    sel.addRange(range);
  },
  getNextQueryFromRegexMatches (back?: boolean): string {
    if (!this.regexMatches) { return ""; }
    let count = this.matchCount;
    this.activeRegexIndex = count = (this.activeRegexIndex + (back ? -1 : 1) + count) % count;
    return this.regexMatches[count];
  },
  execute (query?: string | null, options?: FindNS.ExecuteOptions): void {
    options = options ? VUtils.safer(options) : Object.create(null) as FindNS.ExecuteOptions;
    let el: Element | null, found: boolean, count = ((options.count as number) | 0) || 1, back = count < 0
      , par: Element | null = null, timesRegExpNotMatch = 0
      , q: string, notSens = this.ignoreCase && !options.caseSensitive;
    options.noColor || this.toggleStyle(1);
    back && (count = -count);
    const isRe = this.isRegex, pR = this.parsedRegexp;
    do {
      q = query != null ? query : isRe ? this.getNextQueryFromRegexMatches(back) : this.parsedQuery;
      found = this.find(q, !notSens, back, true, this.wholeWord, false, false);
      if (found && pR && (par = VDom.findSelectionParent(3))) {
        pR.lastIndex = 0;
        const text = (par as HTMLElement).innerText;
        if (typeof text === "string" && !(pR as RegExpG & RegExpSearchable<0>).exec(text)
            && timesRegExpNotMatch++ < 9) {
          count++;
        }
      }
    } while (0 < --count && found);
    options.noColor || setTimeout(this.HookSel, 0);
    (el = VEventMode.lock()) && !VDom.isSelected(document.activeElement as Element) && el.blur && el.blur();
    this.hasResults = found;
  },
  find: function (): boolean {
    try {
      return (window.find as any).apply(window, arguments);
    } catch (e) { return false; }
  } as (...args: any[]) => boolean,
  RestoreHighlight (this: void): void { return VFindMode.toggleStyle(0); },
  HookSel (): void {
    document.addEventListener("selectionchange", VFindMode && VFindMode.RestoreHighlight, true);
  },
  toggleStyle (enabled: BOOL): void {
    document.removeEventListener("selectionchange", this.RestoreHighlight, true);
    enabled || this.isActive || VDom.UI.toggleSelectStyle(false);
    this.styleOut.disabled = this.styleIn.disabled = !enabled;
  },
  getCurrentRange (): void {
    let sel = window.getSelection(), range: Range;
    if (!sel.rangeCount) {
      range = document.createRange();
      range.setStart(document.body || document.documentElement as Element, 0);
    } else {
      range = sel.getRangeAt(0);
    }
    range.setEnd(range.startContainer, range.startOffset);
    this.initialRange = range;
  }
};
