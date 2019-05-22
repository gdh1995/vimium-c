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
  input_: null as never as SafeHTMLElement,
  countEl_: null as never as SafeHTMLElement,
  styleIn_: null as never as HTMLStyleElement,
  styleOut_: null as never as HTMLStyleElement,
  A0Re_: <RegExpG> /\xa0/g,
  tailRe_: <RegExpOne> /\n$/,
  css_: null as never as FindCSS,
  styleIframe_: null as HTMLStyleElement | null,
  activate_ (this: void, _0: number, options: CmdOptions[kFgCmd.findMode]): void {
    const a = VFind;
    a.css_ = options.f || a.css_;
    if (!VDom.isHTML_()) { return; }
    const query: string | undefined | null = (options.q || "") + "",
    UI = VDom.UI;
    a.isActive_ || query === a.query_ && options.l || VMarks.setPreviousPosition_();
    VDom.docSelectable_ = UI.getDocSelectable_();
    UI.ensureBorder_();
    if (options.l) {
      return a.findAndFocus_(query || a.query_, options);
    }
    a.isActive_ && UI.adjust_();
    if (!a.isActive_) {
      a.getCurrentRange_();
      if (options.r) {
        a.coords_ = [scrollX, scrollY];
      }
    }
    VHud.hide_(TimerType.noTimer);
    if (a.isActive_) {
      return a.setFirstQuery_(query);
    }

    a.parsedQuery_ = a.query_ = "";
    a.parsedRegexp_ = a.regexMatches_ = null;
    a.activeRegexIndex_ = 0;

    const el = a.box_ = VDom.createElement_("iframe") as typeof VFind.box_, st = el.style;
    el.className = "R HUD UI";
    st.cssText = "display:none;width:0";
    if (Build.BTypes & ~BrowserType.Firefox && VDom.wdZoom_ !== 1) { st.zoom = "" + 1 / VDom.wdZoom_; }
    el.onload = function (this: HTMLIFrameElement): void { VFind.notDisableScript_() && VFind.onLoad_(1); };
    VLib.push_(UI.SuppressMost_, a);
    a.query_ || (a.query0_ = query);
    a.init_ && a.init_(AdjustType.NotAdjust);
    UI.toggleSelectStyle_(1);
    a.isActive_ = true;
    UI.add_(el, AdjustType.DEFAULT, VHud.box_);
  },
  notDisableScript_(): 1 | void {
    try {
      if (this.box_.contentWindow.document) { return 1; }
    } catch {}
    this.deactivate_(FindNS.Action.ExitUnexpectedly);
    let s = "Sorry, Vimium C can not open a HUD on this page", b = VVisual;
    b.mode_ ? b.prompt_(s, 2000) : VHud.tip_(s);
  },
  onLoad_ (later?: 1): void {
    const a = this, box: HTMLIFrameElement = a.box_,
    wnd = box.contentWindow, f = wnd.addEventListener.bind(wnd) as typeof addEventListener,
    onKey = a.onKeydown_.bind(a),
    now = Date.now(), s = VLib.Stop_, t = true;
    let tick = 0;
    f("mousedown", a.OnMousedown_, t);
    f("keydown", onKey, t);
    f("keyup", onKey, t);
    f("input", a.OnInput_, t);
    if (Build.BTypes & ~BrowserType.Chrome) {
      f("paste", a._OnPaste, t);
    }
    f("unload", a.OnUnload_, t);
    for (const i of ["keypress", "mouseup", "click", "contextmenu", "copy", "cut", "paste"]) {
      f(i, s, t);
    }
    f("blur", a._onUnexpectedBlur = function (this: Window, event): void {
      const b = VFind, delta = Date.now() - now, wnd1 = this;
      if (event && b && b.isActive_ && delta < 500 && delta > -99 && event.target === wnd1) {
        wnd1.closed || setTimeout(function (): void { VFind && b.focus_(); }, tick++ * 17);
      } else {
        wnd1.removeEventListener("blur", b._onUnexpectedBlur, true);
        b._onUnexpectedBlur = null;
      }
    }, t);
    f("focus", function (this: Window, event: Event): void {
      if (VFind._actived && event.target === this) {
        VEvent.OnWndFocus_();
      }
      Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VDom.cache_.browser_ === BrowserType.Firefox)
        || VLib.Stop_(event);
    }, t);
    box.onload = later ? null as never : function (): void {
      this.onload = null as never; VFind.onLoad2_(this.contentWindow);
    };
    if (later) { a.onLoad2_(wnd); }
  },
  onLoad2_ (wnd: Window): void {
    const doc = wnd.document, docEl = doc.documentElement as HTMLHtmlElement,
    a = VFind,
    zoom = wnd.devicePixelRatio, list = doc.createDocumentFragment(),
    add = list.appendChild.bind(list),
    el0 = doc.createElement("slash"),
    el = a.input_ = doc.createElement("div") as SafeHTMLElement & HTMLDivElement,
    el2 = a.countEl_ = doc.createElement("count") as SafeHTMLElement;
    if (!(Build.BTypes & BrowserType.Firefox) && !Build.DetectAPIOnFirefox) {
      el.contentEditable = "true";
      wnd.removeEventListener("paste", VLib.Stop_, true);
    } else if (Build.BTypes & ~BrowserType.Chrome) {
      let plain = true;
      try {
        el.contentEditable = "plaintext-only";
      } catch {
        plain = false;
        el.contentEditable = "true";
      }
      wnd.removeEventListener("paste", plain ? a._OnPaste : VLib.Stop_, true);
    } else {
      el.contentEditable = "plaintext-only";
    }
    el.spellcheck = false;
    el2.appendChild(doc.createTextNode(""));
    el0.textContent = "/";
    add(el0);
    add(el);
    add(el2);
    add(a.styleIframe_ = VDom.UI.createStyle_(a.css_[2], doc.createElement("style")));
    VDom.createShadowRoot_(doc.body as HTMLBodyElement).appendChild(list);
    Build.BTypes & ~BrowserType.Firefox &&
    zoom < 1 && (docEl.style.zoom = "" + 1 / zoom);
    a.box_.style.display = "";
    VLib.remove_(a);
    VLib.push_(a.onHostKeydown_, a);
    return a.setFirstQuery_(a.query0_);
  },
  _onUnexpectedBlur: null as ((event?: Event) => void) | null,
  focus_ (): void {
    this._actived = false;
    this.input_.focus();
    this._actived = true;
  },
  _actived: false,
  setFirstQuery_ (query: string): void {
    const a = this;
    a.focus_();
    a.query0_ = "";
    a.query_ || a.SetQuery_(query);
    a.notEmpty_ = !!a.query_;
    a.notEmpty_ && a.box_.contentDocument.execCommand("selectAll", false);
  },
  init_ (adjust: AdjustType): void {
    const ref = this.postMode_, UI = VDom.UI,
    css = this.css_[0], sin = this.styleIn_ = UI.createStyle_(css);
    ref.exit_ = ref.exit_.bind(ref);
    UI.box_ ? UI.adjust_() : UI.add_(sin, adjust, true);
    sin.remove();
    this.styleOut_ = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || UI.box_ !== UI.UI ? UI.createStyle_(css) : sin;
    this.init_ = null as never;
  },
  findAndFocus_ (query: string, options: CmdOptions[kFgCmd.findMode]): void {
    if (!query) {
      return VHud.tip_("No old queries to find.");
    }
    const a = this;
    a.init_ && a.init_(AdjustType.MustAdjust);
    if (query !== a.query_) {
      a.updateQuery_(query);
      if (a.isActive_) {
        a.input_.textContent = query.replace(<RegExpOne> /^ /, "\xa0");
        a.showCount_(1);
      }
    }
    const style = a.isActive_ || VHud.opacity_ !== 1 ? null : (VHud.box_ as HTMLDivElement).style;
    style && (style.visibility = "hidden");
    VDom.UI.toggleSelectStyle_(0);
    a.execute_(null, options);
    style && (style.visibility = "");
    if (!a.hasResults_) {
      a.ToggleStyle_(1);
      if (!a.isActive_) {
        VDom.UI.toggleSelectStyle_(0);
        VHud.tip_(`No matches for '${a.query_}'`);
      }
      return;
    }
    a.focusFoundLinkIfAny_();
    return a.postMode_.activate_();
  },
  clean_ (): void {
    let _this = VFind;
    _this.coords_ && VMarks.ScrollTo_(_this.coords_);
    _this.hasResults_ =
    _this.isActive_ = _this._small = _this._actived = _this.notEmpty_ = false;
    VLib.remove_(this);
    _this.box_ && _this.box_.remove();
    if (_this.box_ === VDom.lastHovered_) { VDom.lastHovered_ = null; }
    _this.parsedQuery_ = _this.query_ = _this.query0_ = "";
    _this.historyIndex_ = _this.matchCount_ = 0;
    _this.styleIframe_ = _this._onUnexpectedBlur =
    _this.box_ = _this.input_ = _this.countEl_ = _this.parsedRegexp_ =
    _this.initialRange_ = _this.regexMatches_ = _this.coords_ = null as never;
  },
  OnUnload_ (this: void, e: Event): void {
    const f = VFind;
    if (!f || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !e.isTrusted : e.isTrusted === false)) { return; }
    f.isActive_ && f.deactivate_(FindNS.Action.ExitUnexpectedly);
  },
  OnMousedown_ (this: void, event: MouseEvent): void {
    if (event.target !== VFind.input_
        && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? event.isTrusted : event.isTrusted !== false)) {
      VLib.prevent_(event);
      VFind.focus_();
    }
  },
  _OnPaste: Build.BTypes & ~BrowserType.Chrome ? function (this: Window, event: ClipboardEvent): void {
    const d = event.clipboardData, text = d && typeof d.getData === "function" ? d.getData("text/plain") : "";
    VLib.prevent_(event);
    if (!text) { return; }
    this.document.execCommand("insertText", false, text + "");
  } : null,
  onKeydown_ (event: KeyboardEvent): void {
    VLib.Stop_(event);
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
        ? !event.isTrusted : event.isTrusted === false) { return; }
    if (VScroller.keyIsDown_ && VEvent.OnScrolls_[0](event) || event.type === "keyup") { return; }
    const a = this;
    const n = event.keyCode;
    type Result = FindNS.Action;
    let i: Result | KeyStat = event.altKey ? FindNS.Action.DoNothing
      : n === VKeyCodes.enter
        ? event.shiftKey ? FindNS.Action.PassDirectly : (a.saveQuery_(), FindNS.Action.ExitToPostMode)
      : (n !== VKeyCodes.backspace && n !== VKeyCodes.deleteKey) ? FindNS.Action.DoNothing
      : a.query_ || (n === VKeyCodes.deleteKey && !VDom.cache_.onMac_ || event.repeat) ? FindNS.Action.PassDirectly
      : FindNS.Action.Exit;
    if (!i) {
      if (VKey.isEscape_(event)) { i = FindNS.Action.ExitAndReFocus; }
      else if (i = VKey.getKeyStat_(event)) {
        if (i & ~KeyStat.PrimaryModifier) { return; }
        else if (n === VKeyCodes.up || n === VKeyCodes.down || n === VKeyCodes.end || n === VKeyCodes.home) {
          VEvent.scroll_(event, a.box_.contentWindow);
        }
        else if (n === VKeyCodes.J || n === VKeyCodes.K) {
          a.execute_(null, { n: (VKeyCodes.K - n) || -1 });
        }
        else { return; }
        i = FindNS.Action.DoNothing;
      }
      else if (n === VKeyCodes.f1) { a.box_.contentDocument.execCommand("delete"); }
      else if (n === VKeyCodes.f2) {
        Build.BTypes & BrowserType.Firefox && a.box_.blur();
        focus(); VEvent.keydownEvents_()[n] = 1;
      }
      else if (n === VKeyCodes.up || n === VKeyCodes.down) { a.nextQuery_(n !== VKeyCodes.up); }
      else { return; }
    } else if (i === FindNS.Action.PassDirectly) {
      return;
    }
    VLib.prevent_(event);
    if (!i) { return; }
    VEvent.keydownEvents_()[n] = 1;
    a.deactivate_(i as FindNS.Action);
  },
  onHostKeydown_ (event: KeyboardEvent): HandlerResult {
    let i = VKey.getKeyStat_(event), n = event.keyCode, a = this;
    if (!i && n === VKeyCodes.f2) {
      a._onUnexpectedBlur && a._onUnexpectedBlur();
      a.focus_();
      return HandlerResult.Prevent;
    } else if (i && !(i & ~KeyStat.PrimaryModifier)) {
      if (n === VKeyCodes.J || n === VKeyCodes.K) {
        a.execute_(null, { n: (VKeyCodes.K - n) || -1 });
        return HandlerResult.Prevent;
      }
    }
    if (!VEvent.lock_() && VKey.isEscape_(event)) {
      VLib.prevent_(event); // safer
      a.deactivate_(FindNS.Action.ExitNoFocus); // should exit
      return HandlerResult.Prevent;
    }
    return HandlerResult.Nothing;
  },
  /** Note: host page may have no range (type is "None"), if:
   * * press <Enter> on HUD to exit FindMode
   * * a host script has removed all ranges
   */
  deactivate_(i: FindNS.Action): void {
    let a = this, sin = a.styleIn_, noStyle = !sin || !sin.parentNode, hasResult = a.hasResults_
      , el: SafeElement | null | undefined, el2: Element | null;
    focus();
    a.clean_();
    if (i !== FindNS.Action.ExitUnexpectedly && i !== FindNS.Action.ExitNoFocus) {
      el = VDom.getSelectionFocusEdge_(VDom.UI.getSelected_()[0], 1);
      el && (Build.BTypes & ~BrowserType.Firefox ? typeof el.focus === "function" : el.focus) &&
      (el as HTMLElement | SVGElement).focus();
    }
    if ((i === FindNS.Action.ExitAndReFocus || !hasResult || VVisual.mode_) && !noStyle) {
      a.ToggleStyle_(1);
      a.restoreSelection_(true);
    }
    if (VVisual.mode_) {
      return VVisual.activate_(1, VLib.safer_<CmdOptions[kFgCmd.visualMode]>({
        m: VisualModeNS.Mode.Visual,
        r: true
      }));
    }
    if (i > FindNS.Action.MaxExitButNoWork && hasResult && (!el || el !== VEvent.lock_())) {
      let container = a.focusFoundLinkIfAny_();
      if (container && i === FindNS.Action.ExitAndReFocus && (el2 = document.activeElement)
          && VDom.getEditableType_(el2) >= EditableType.Editbox && container.contains(el2)) {
        VDom.prepareCrop_();
        VDom.UI.simulateSelect_(el2);
      } else if (el) {
        // always call scrollIntoView if only possible, to keep a consistent behavior
        !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions
          ? VDom.scrollIntoView_(el) : a.fixTabNav_(el);
      }
    }
    VDom.UI.toggleSelectStyle_(0);
    if (i === FindNS.Action.ExitToPostMode) { return a.postMode_.activate_(); }
  },
/** ScrollIntoView to notify it's `<tab>`'s current target since Min$ScrollIntoView$SetTabNavigationNode (C51)
 * https://bugs.chromium.org/p/chromium/issues/detail?id=594613
 * https://chromium.googlesource.com/chromium/src/+/0bb887b20c70582eeafad2a58ac1650b7159f2b6
 *
 * Tracking:
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/element.cc?q=ScrollIntoViewNoVisualUpdate&g=0&l=717
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/document.cc?q=SetSequentialFocusNavigationStartingPoint&g=0&l=4773
 */
  fixTabNav_: !(Build.BTypes & BrowserType.Chrome) // firefox seems to have "focused" it
        || Build.BTypes & BrowserType.Chrome && Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions ? 0 as never
      : function (el: Element): void {
    let oldPos: MarksNS.ScrollInfo | 0 = VDom.cache_.browserVer_ < BrowserVer.MinScrollIntoViewOptions
          ? [scrollX, scrollY] : 0;
    VDom.scrollIntoView_(el);
    oldPos && VMarks.ScrollTo_(oldPos);
  },
  /** return an element if no <a> else null */
  focusFoundLinkIfAny_ (): SafeElement | null {
    let sel = VDom.UI.getSelected_()[0], cur = sel.rangeCount ? VDom.GetSelectionParent_unsafe_(sel) : null;
    Build.BTypes & ~BrowserType.Firefox && (cur = VDom.SafeEl_(cur));
    for (let i = 0, el: Element | null = cur; el && el !== document.body && i++ < 5;
        el = VDom.GetParent_(el, PNType.RevealSlotAndGotoParent)) {
      if (el instanceof HTMLAnchorElement) {
        el.focus();
        return null;
      }
    }
    return cur as SafeElement | null;
  },
  nextQuery_ (back?: boolean): void {
    const ind = this.historyIndex_ + (back ? -1 : 1);
    if (ind < 0) { return; }
    this.historyIndex_ = ind;
    if (!back) {
      return VPort.send_(kFgReq.findQuery, { i: ind }, this.SetQuery_);
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
    doc.execCommand("insertText", false, query.replace(<RegExpOne> /^ /, "\xa0"));
    return _this.OnInput_();
  },
  saveQuery_ (): string | void | 1 {
    return this.query_ && VPort.post_({
      H: kFgReq.findQuery,
      q: this.input_.innerText.replace(this.A0Re_, " ").replace(this.tailRe_, "")
    });
  },
  postMode_: {
    lock_: null as Element | null,
    activate_  (): void {
      const pm = this, hook = addEventListener;
      const el = VEvent.lock_(), Exit = pm.exit_ as (this: void, a?: boolean | Event) => void;
      if (!el) { Exit(); return; }
      VLib.push_(pm.onKeydown_, pm);
      if (el === pm.lock_) { return; }
      if (!pm.lock_) {
        hook("click", Exit, true);
        VEvent.setupSuppress_(Exit);
      }
      Exit(true);
      pm.lock_ = el;
      hook.call(el, "blur", Exit, true);
    },
    onKeydown_ (event: KeyboardEvent): HandlerResult {
      const exit = VKey.isEscape_(event);
      exit ? this.exit_() : VLib.remove_(this);
      return exit ? HandlerResult.Prevent : HandlerResult.Nothing;
    },
    exit_ (skip?: boolean | Event): void {
      if (skip instanceof Event
          && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !skip.isTrusted : skip.isTrusted === false)) { return; }
      const a = this, unhook = removeEventListener;
      a.lock_ && unhook.call(a.lock_, "blur", a.exit_, true);
      if (!a.lock_ || skip === true) { return; }
      a.lock_ = null;
      unhook("click", a.exit_, true);
      VLib.remove_(a);
      VEvent.setupSuppress_();
    }
  },
  OnInput_ (this: void, e?: Event): void {
    if (e != null) {
      VLib.Stop_(e);
      if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
          ? !e.isTrusted : e.isTrusted === false) { return; }
    }
    const _this = VFind, query = _this.input_.innerText.replace(_this.A0Re_, " ").replace(_this.tailRe_, "");
    let s = _this.query_;
    if (!_this.hasResults_ && !_this.isRegex_ && !_this.wholeWord_ && _this.notEmpty_ && query.startsWith(s)
        && query.substring(s.length - 1).indexOf("\\") < 0) {
      return _this.showCount_(0);
    }
    s = "";
    _this.coords_ && VMarks.ScrollTo_(_this.coords_);
    _this.updateQuery_(query);
    _this.restoreSelection_();
    _this.execute_(!_this.isRegex_ ? _this.parsedQuery_ : _this.regexMatches_ ? _this.regexMatches_[0] : "");
    return _this.showCount_(1);
  },
  _small: false,
  showCount_ (changed: BOOL): void {
    const a = this;
    let count = a.matchCount_;
    if (changed) {
      (a.countEl_.firstChild as Text).data = !a.parsedQuery_ ? ""
        : "(" + (count || (a.hasResults_ ? "Some" : "No")) + " match" + (count !== 1 ? "es)" : ")");
    }
    count = (a.input_.offsetWidth + a.countEl_.offsetWidth + 31) & ~31;
    if (a._small && count < 152) { return; }
    a.box_.style.width = ((a._small = count < 152) ? 0 as number | string as string : count + "px");
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
    let isRe = a.isRegex_, ww = a.wholeWord_, B = "\\b";
    if (isRe === null && !ww) {
      isRe = VDom.cache_.regexFindMode;
      const info = 2 * +query.startsWith(B) + +query.endsWith(B);
      if (info === 3 && !isRe && query.length > 3) {
        query = query.slice(2, -2);
        ww = true;
      } else if (info && info < 3) {
        isRe = true;
      }
    }
    isRe = isRe || false;
    if (ww && (isRe || !(Build.BTypes & BrowserType.Chrome)
              || ((Build.BTypes & ~BrowserType.Chrome) && VDom.cache_.browser_ !== BrowserType.Chrome)
        )) {
      query = B + query.replace(a._bslashRe, "\\").replace(a._escapeAllRe, "\\$&") + B;
      ww = false;
      isRe = true;
    }
    query = isRe ? query !== "\\b\\b" && query !== B ? query : "" : query.replace(a._bslashRe, "\\");
    a.parsedQuery_ = query;
    a.isRegex_ = isRe;
    a.wholeWord_ = ww;
    a.notEmpty_ = !!query;
    a.ignoreCase_ !== null || (a.ignoreCase_ = query.toLowerCase() === query);
    isRe || (query = a.isActive_ ? query.replace(a._escapeAllRe, "\\$&") : "");

    let re: RegExpG | null = query && a.safeCreateRe_(ww ? B + query + B : query, a.ignoreCase_ ? "gi" : "g") || null;
    let matches: RegExpMatchArray | null = null;
    if (re) {
      type FullScreenElement = Element & { innerText?: string | Element };
      let el = (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
          ? document.fullscreenElement : document.webkitFullscreenElement) as FullScreenElement | null,
      text: string | undefined | Element;
      if (el && typeof (text = el.innerText) !== "string") { // in case of SVG elements
        el = VDom.GetParent_(el, PNType.DirectElement);
      }
      query = el && <string> text ||
          (Build.BTypes & ~BrowserType.Firefox ? (document.documentElement as HTMLElement).innerText + ""
            : (document.documentElement as HTMLElement).innerText as string);
      matches = query.match(re) || query.replace(a.A0Re_, " ").match(re);
    }
    a.regexMatches_ = isRe ? matches : null;
    a.parsedRegexp_ = isRe ? re : null;
    a.activeRegexIndex_ = 0;
    a.matchCount_ = matches ? matches.length : 0;
  },
  safeCreateRe_ (pattern: string, flags: "g" | "gi"): RegExpG | void {
    try { return new RegExp(pattern, flags as "g"); } catch {}
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
    // Note: it works even when range is inside a shadow root (tested on C72 stable)
    sel.addRange(range);
  },
  getNextQueryFromRegexMatches_ (back?: boolean): string {
    const a = this;
    if (!a.regexMatches_) { return ""; }
    let count = a.matchCount_;
    a.activeRegexIndex_ = count = (a.activeRegexIndex_ + (back ? -1 : 1) + count) % count;
    return a.regexMatches_[count];
  },
  execute_ (query?: string | null, options?: FindNS.ExecuteOptions): void {
    options = options ? VLib.safer_(options) : Object.create(null) as FindNS.ExecuteOptions;
    const a = this;
    let el: LockableElement | null
      , found: boolean, count = ((options.n as number) | 0) || 1, back = count < 0
      , par: Element | null = null, timesRegExpNotMatch = 0
      , sel: Selection | undefined
      , q: string, notSens = a.ignoreCase_ && !options.caseSensitive;
    /** Note:
     * On Firefox, it's impossible to replace the gray bg color for blurred selection:
     * In https://hg.mozilla.org/mozilla-central/file/tip/layout/base/nsDocumentViewer.cpp#l3463 ,
     * `nsDocViewerFocusListener::HandleEvent` calls `SetDisplaySelection(SELECTION_DISABLED)`,
     *   if only a trusted "blur" event gets dispatched into Document
     */
    options.noColor || a.ToggleStyle_(0);
    back && (count = -count);
    const isRe = a.isRegex_, pR = a.parsedRegexp_;
    const focusHUD = !!(Build.BTypes & BrowserType.Firefox)
      && (!(Build.BTypes & ~BrowserType.Firefox) || VDom.cache_.browser_ === BrowserType.Firefox)
      && a.isActive_ && a.box_.contentDocument.hasFocus();
    do {
      q = query != null ? query : isRe ? a.getNextQueryFromRegexMatches_(back) : a.parsedQuery_;
      found = Build.BTypes & ~BrowserType.Chrome
        ? a.find_(q, !notSens, back, true, a.wholeWord_, false, false)
        : window.find(q, !notSens, back, true, a.wholeWord_, false, false);
      if (found && pR && (par = VDom.GetSelectionParent_unsafe_(sel || (sel = VDom.UI.getSelected_()[0]), q))) {
        pR.lastIndex = 0;
        let text = (par as HTMLElement | Element & {innerText?: undefined}).innerText;
        if (text && !(Build.BTypes & ~BrowserType.Firefox && typeof text !== "string")
            && !(pR as RegExpG & RegExpSearchable<0>).test(text as string)
            && timesRegExpNotMatch++ < 9) {
          count++;
        }
      }
    } while (0 < --count && found);
    options.noColor || setTimeout(a.HookSel_, 0);
    (el = VEvent.lock_()) && !VDom.isSelected_() && el.blur();
    Build.BTypes & BrowserType.Firefox && focusHUD && a.focus_();
    a.hasResults_ = found;
  },
/**
 * According to https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/editor.cc?q=FindRangeOfString&g=0&l=815 ,
 * the range to find is either `[selection..docEnd]` or `[docStart..selection]`,
 * so those in shadowDOM / ancestor tree scopes will still be found.
 * Therefore `@styleIn_` is always needed, and VFind may not need a sub-scope selection.
 */
  find_: Build.BTypes & ~BrowserType.Chrome ? function (this: void): boolean {
    try {
      return window.find.apply(window, arguments);
    } catch { return false; }
  } as Window["find"] : 0 as never,
  HookSel_ (t?: TimerType.fake | 1): void {
    (<number> t > 0 ? removeEventListener : addEventListener)("selectionchange", VFind && VFind.ToggleStyle_, true);
  },
  /** must be called after initing */
  ToggleStyle_ (this: void, disable: BOOL | boolean | Event): void {
    const a = VFind, sout = a.styleOut_, sin = a.styleIn_, UI = VDom.UI, active = a.isActive_;
    if (!sout) { return; }
    a.HookSel_(1);
    disable = !!disable;
    // Note: `<doc/root>.adoptedStyleSheets` should not be modified in an extension world
    if (!active && disable) {
      UI.toggleSelectStyle_(0);
      sout.remove(); sin.remove();
      return;
    }
    if (sout.parentNode !== UI.box_) {
      (UI.box_ as HTMLDivElement).appendChild(sout);
      !((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) &&
      sin === sout || UI.add_(sin, AdjustType.NotAdjust, true);
    }
    sout.sheet && (sout.sheet.disabled = disable);
    sin.sheet && (sin.sheet.disabled = disable);
  },
  getCurrentRange_ (): void {
    let sel = VDom.UI.getSelected_()[0], range: Range;
    if (!sel.rangeCount) {
      range = document.createRange();
      range.setStart(document.body || document.documentElement as Element, 0);
    } else {
      range = sel.getRangeAt(0);
      // Note: `range.collapse` doesn't work if selection is inside a ShadowRoot (tested on C72 stable)
      sel.collapseToStart();
    }
    range.collapse(true);
    this.initialRange_ = range;
  }
};
