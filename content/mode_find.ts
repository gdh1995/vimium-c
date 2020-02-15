var VFind = {
  isActive_: false,
  query_: "",
  query0_: "",
  parsedQuery_: "",
  parsedRegexp_: null as RegExpG | null,
  historyIndex_: 0,
  notEmpty_: false,
  isQueryRichText_: true,
  isRegex_: null as boolean | null,
  ignoreCase_: null as boolean | null,
  wholeWord_: false,
  hasResults_: false,
  matchCount_: 0,
  postOnEsc_: true,
  coords_: null as null | MarksNS.ScrollInfo,
  initialRange_: null as Range | null,
  activeRegexIndex_: 0,
  regexMatches_: null as RegExpMatchArray | null,
  root_: null as ShadowRoot | null,
  box_: null as never as HTMLIFrameElement,
  innerDoc_: null as never as HTMLDocument,
  input_: null as never as SafeHTMLElement,
  countEl_: null as never as SafeHTMLElement,
  styleIn_: null as never as HTMLStyleElement,
  styleOut_: null as never as HTMLStyleElement,
  activate_ (this: void, _0: number, options: CmdOptions[kFgCmd.findMode]): void {
    const a = VFind, dom = VDom, UI = VCui;
    UI.findCss_ = options.f || UI.findCss_;
    if (!dom.isHTML_()) { return; }
    let query: string = options.s ? UI.getSelectionText_() : "";
    (query.length > 99 || query.includes("\n")) && (query = "");
    a.isQueryRichText_ = !query;
    query || (query = options.q);
    a.isActive_ || query === a.query_ && options.l || VMarks.setPreviousPosition_();
    UI.checkDocSelectable_();
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
    a.postOnEsc_ = options.p;
    if (a.isActive_) {
      VHud.hide_(TimerType.noTimer);
      return a.setFirstQuery_(query);
    }

    a.parsedQuery_ = a.query_ = "";
    a.parsedRegexp_ = a.regexMatches_ = null;
    a.activeRegexIndex_ = 0;

    const el = a.box_ = dom.createElement_("iframe") as typeof VFind.box_, st = el.style;
    el.className = "R HUD UI" + dom.cache_.d;
    st.display = "none"; st.width = "0";
    if (Build.BTypes & ~BrowserType.Firefox && dom.wdZoom_ !== 1) { st.zoom = "" + 1 / dom.wdZoom_; }
    if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox) {
      const ratio = devicePixelRatio, n = (4 - 1 / ratio) + "px ";
      if (ratio > 1) {
        st.padding = n + n + "0";
      }
    }
    el.onmousedown = a.OnMousedown_;
    el.onload = function (this: HTMLIFrameElement): void { VFind.onLoad_(1); };
    VKey.pushHandler_(VKey.SuppressMost_, a);
    a.query_ || (a.query0_ = query);
    a.init_ && a.init_(AdjustType.NotAdjust);
    UI.toggleSelectStyle_(1);
    a.isActive_ = true;
    UI.add_(el, AdjustType.DEFAULT, VHud.box_);
  },
  notDisableScript_(): 1 | void {
    try {
      if (this.innerDoc_ = this.box_.contentDocument as HTMLDocument | null as HTMLDocument | never) {
        return 1;
      }
    } catch {}
    this.deactivate_(FindNS.Action.ExitUnexpectedly);
    let b = VVisual;
    b.mode_ ? b.prompt_(kTip.findFrameFail, 2000) : VHud.tip_(kTip.findFrameFail);
  },
  onLoad_ (later?: 1): void {
    if (!this.isActive_ || !VFind.notDisableScript_()) { return; }
    const a = this, box: HTMLIFrameElement = a.box_,
    wnd = box.contentWindow, f = wnd.addEventListener.bind(wnd) as typeof addEventListener,
    onKey = a.onKeydown_.bind(a),
    now = Date.now(), s = VKey.Stop_, t = true;
    let tick = 0;
    f("mousedown", a.OnMousedown_, t);
    f("keydown", onKey, t);
    f("keyup", onKey, t);
    f("input", a.OnInput_, t);
    if (Build.BTypes & ~BrowserType.Chrome) {
      f("paste", a._OnPaste, t);
    }
    f("unload", a.OnUnload_, t);
    f("compositionend", Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)
        ? a.OnInput_ : s, t);
    for (const i of "compositionstart keypress mouseup click auxclick contextmenu \
copy cut beforecopy beforecut paste".split(" ")) {
      f(i, s, t);
    }
    VKey.SetupEventListener_(wnd, "wheel");
    f("blur", a._onUnexpectedBlur = function (this: Window, event): void {
      const b = VFind, delta = Date.now() - now, wnd1 = this;
      if (event && b && b.isActive_ && delta < 500 && delta > -99 && event.target === wnd1) {
        wnd1.closed || setTimeout(function (): void { VFind === b && b.isActive_ && b.focus_(); }, tick++ * 17);
      } else {
        VKey.SetupEventListener_(wnd1, "blur", b._onUnexpectedBlur, 1, 1);
        b._onUnexpectedBlur = null;
      }
    }, t);
    f("focus", function (this: Window, event: Event): void {
      if (VFind._active && event.target === this) {
        VApi.OnWndFocus_();
      }
      Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
        || VKey.Stop_(event);
    }, t);
    box.onload = later ? null as never : function (): void {
      this.onload = null as never; VFind.onLoad2_();
    };
    if (later) { a.onLoad2_(); }
  },
  onLoad2_ (): void {
    if (!this.isActive_) { return; }
    const a = VFind, wnd: Window = a.box_.contentWindow, doc = a.innerDoc_,
    docEl = doc.documentElement as HTMLHtmlElement,
    body = doc.body as HTMLBodyElement,
    zoom = Build.BTypes & ~BrowserType.Firefox ? wnd.devicePixelRatio : 1,
    list = doc.createDocumentFragment(),
    addElement = function (tag: 0 | "div" | "style", id?: string | 0): SafeHTMLElement {
      const newEl = doc.createElement(tag || "span") as SafeHTMLElement;
      id && (newEl.id = id);
      id !== 0 && list.appendChild(newEl);
      return newEl;
    };
    addElement(0, "s").textContent = "/";
    const el = a.input_ = addElement(0, "i");
    addElement(0, "h");
    if (!(Build.BTypes & ~BrowserType.Firefox) && !Build.DetectAPIOnFirefox) {
      el.contentEditable = "true";
      VKey.SetupEventListener_(wnd, "paste", null, 1, 1);
    } else if (Build.BTypes & ~BrowserType.Chrome) {
      let plain = true;
      try {
        el.contentEditable = "plaintext-only";
      } catch {
        plain = false;
        el.contentEditable = "true";
      }
      VKey.SetupEventListener_(wnd, "paste", plain ? a._OnPaste : null, 1, 1);
    } else {
      el.contentEditable = "plaintext-only";
    }
    if (Build.BTypes & BrowserType.Chrome
        && Build.MinCVer < BrowserVer.MinEnsuredInputEventIsNotOnlyInShadowDOMV1
        && VDom.cache_.v < BrowserVer.MinEnsuredInputEventIsNotOnlyInShadowDOMV1) {
      // not check MinEnsuredShadowDOMV1 for smaller code
      VKey.SetupEventListener_(el, "input", a.OnInput_);
    }
    (a.countEl_ = addElement(0, "c")).textContent = " ";
    VCui.createStyle_(VCui.findCss_.i, VCui.styleFind_ = addElement("style") as HTMLStyleElement);
    // an extra <div> may be necessary for Ctrl+A: https://github.com/gdh1995/vimium-c/issues/79#issuecomment-540921532
    const box = Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
        && (Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
            || !(Build.BTypes & BrowserType.Chrome)
                && (!(Build.BTypes & ~BrowserType.Firefox) || VDom.cache_.v < FirefoxBrowserVer.assumedVer)
                && VDom.cache_.v >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        && VDom.cache_.o === kOS.linux
        ? addElement("div", 0) as HTMLDivElement : body,
    root = !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
        ? Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
          || !(Build.BTypes & BrowserType.Chrome)
              && (!(Build.BTypes & ~BrowserType.Firefox) || VDom.cache_.v < FirefoxBrowserVer.assumedVer)
              && VDom.cache_.v >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME
          ? VDom.createShadowRoot_(box) as ShadowRoot : box
        : VDom.createShadowRoot_(box),
    inShadow = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox)
            || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
                && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        ? true : root !== box,
    root2 = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox)
            || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
                && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || inShadow ? addElement("div", 0) : box;
    root2.className = "r" + VDom.cache_.d;
    root2.spellcheck = false;
    root2.appendChild(list);
    if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
        && (!(Build.BTypes & BrowserType.Firefox)
            || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
                && Build.MinFFVer >= FirefoxBrowserVer.MinContentEditableInShadowSupportIME)
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || inShadow) {
      a.root_ = root as ShadowRoot;
      // here can not use `box.contentEditable = "true"`, otherwise Backspace will break on Firefox, Win
      box.setAttribute("role", "textbox");
      VKey.SetupEventListener_(root2, "mousedown", a.OnMousedown_, 0, 1);
      root.appendChild(root2);
    }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)) {
      if (box !== body) {
        const st = addElement("style", 0) as HTMLStyleElement;
        st.textContent = "body{margin:0!important}";
        (doc.head as HTMLHeadElement).appendChild(st);
        body.appendChild(box);
      }
    } else if (Build.BTypes & ~BrowserType.Firefox && zoom < 1) {
      docEl.style.zoom = "" + 1 / zoom;
    }
    a.box_.style.display = "";
    VKey.removeHandler_(a);
    VKey.pushHandler_(a.onHostKeydown_, a);
    // delay VHud.hide_, so that avoid flicker on Firefox
    VHud.hide_(TimerType.noTimer);
    a.setFirstQuery_(a.query0_);
  },
  _onUnexpectedBlur: null as ((event?: Event) => void) | null,
  focus_ (): void {
    const a = this;
    a._active = false;
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox) {
      a.box_.contentWindow.focus();
    }
    // fix that: search "a" in VFind, Ctrl+F, "a", Esc, select normal text using mouse, `/` can not refocus
    (a.root_ || a.innerDoc_).activeElement === a.input_ && a.input_.blur();
    a.input_.focus();
    a._active = true;
  },
  _active: false,
  setFirstQuery_ (query: string): void {
    const a = this;
    a.focus_();
    a.query0_ = "";
    a.query_ || a.SetQuery_(query);
    a.isQueryRichText_ = true;
    a.notEmpty_ = !!a.query_;
    a.notEmpty_ && a.exec_("selectAll");
  },
  init_ (adjust: AdjustType): void {
    const ref = this.postMode_, UI = VCui,
    css = UI.findCss_.c, sin = this.styleIn_ = UI.createStyle_(css);
    ref.exit_ = ref.exit_.bind(ref);
    UI.box_ ? UI.adjust_() : UI.add_(sin, adjust, true);
    sin.remove();
    this.styleOut_ = (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        || Build.BTypes & ~BrowserType.Edge && UI.box_ !== UI.root_ ? UI.createStyle_(css) : sin;
    this.init_ = null as never;
  },
  findAndFocus_ (query: string, options: CmdOptions[kFgCmd.findMode]): void {
    if (!query) {
      return VHud.tip_(kTip.noOldQuery);
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
    a.isQueryRichText_ = true;
    const style = a.isActive_ || VHud.opacity_ !== 1 ? null : (VHud.box_ as HTMLDivElement).style;
    style && (style.visibility = "hidden");
    VCui.toggleSelectStyle_(0);
    a.execute_(null, options);
    style && (style.visibility = "");
    if (!a.hasResults_) {
      a.ToggleStyle_(1);
      if (!a.isActive_) {
        VCui.toggleSelectStyle_(0);
        VHud.tip_(kTip.noMatchFor, 0, [a.query_]);
      }
      return;
    }
    a.focusFoundLinkIfAny_();
    return a.postMode_.activate_();
  },
  clean_ (): void {
    const _this = VFind;
    _this.coords_ && VMarks.ScrollTo_(_this.coords_);
    _this.hasResults_ =
    _this.isActive_ = _this._small = _this._active = _this.notEmpty_ = _this.postOnEsc_ = false;
    VKey.removeHandler_(_this);
    _this.box_ && _this.box_.remove();
    if (_this.box_ === VDom.lastHovered_) { VDom.lastHovered_ = null; }
    _this.parsedQuery_ = _this.query_ = _this.query0_ = "";
    _this.historyIndex_ = _this.matchCount_ = 0;
    VCui.styleFind_ = _this._onUnexpectedBlur =
    _this.box_ = _this.innerDoc_ = _this.root_ = _this.input_ = _this.countEl_ = _this.parsedRegexp_ =
    _this.initialRange_ = _this.regexMatches_ = _this.coords_ = null as never;
  },
  OnUnload_ (this: void, e: Event): void {
    const f = VFind;
    if (!f || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !e.isTrusted : e.isTrusted === false)) { return; }
    f.isActive_ && f.deactivate_(FindNS.Action.ExitUnexpectedly);
  },
  OnMousedown_ (this: Window | HTMLElement, event: MouseEventToPrevent): void {
    const target = event.target as Element, a = VFind;
    if (a && target !== a.input_ && (!a.root_ || target.parentNode === this || target === this)
        && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? event.isTrusted : event.isTrusted !== false)) {
      VKey.prevent_(event);
      a.focus_();
      const text = a.input_.firstChild as Text;
      text && a.innerDoc_.getSelection().collapse(text, target !== a.input_.previousSibling ? text.data.length : 0);
    }
  },
  _OnPaste: Build.BTypes & ~BrowserType.Chrome ? function (this: Window, event: ClipboardEvent & ToPrevent): void {
    const d = event.clipboardData, text = d && typeof d.getData === "function" ? d.getData("text/plain") : "";
    VKey.prevent_(event);
    if (!text) { return; }
    VFind.exec_("insertText", 0, text);
  } : 0 as never,
  onKeydown_ (event: KeyboardEventToPrevent): void {
    VKey.Stop_(event);
    const a = this, n = event.keyCode;
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
        ? !event.isTrusted : event.isTrusted === false) { return; }
    if (n === kKeyCode.ime || VSc.keyIsDown_ && VSc.OnScrolls_(event) || event.type === "keyup") { return; }
    type Result = FindNS.Action;
    const eventWrapper: HandlerNS.Event = {c: kChar.INVALID, e: event, i: n},
    key = VKey.key_(eventWrapper, kModeId.Find), keybody = VKey.keybody_(key);
    const i: Result | KeyStat = key.includes("a-") && event.altKey ? FindNS.Action.DoNothing
      : keybody === kChar.enter
        ? key[0] === "s" ? FindNS.Action.PassDirectly : (a.saveQuery_(), FindNS.Action.ExitToPostMode)
      : keybody !== kChar.delete && keybody !== kChar.backspace
        ? VKey.isEscape_(key) ? FindNS.Action.ExitAndReFocus : FindNS.Action.DoNothing
      : Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther & BrowserType.Firefox)
        && VDom.cache_.o === kOS.linux && "cs".includes(key[0])
        ? FindNS.Action.CtrlDelete
      : a.notEmpty_ || (n === kKeyCode.deleteKey && VDom.cache_.o || event.repeat) ? FindNS.Action.PassDirectly
      : FindNS.Action.Exit;
    let h = HandlerResult.Prevent, scroll: number;
    if (!i) {
      if (keybody !== key) {
        if (key === `a-${kChar.f1}`) {
          VDom.prepareCrop_();
          VVisual.HighlightRange_(VCui.getSelected_()[0]);
        }
        else if (key < "c-" || key > "m-") { h = HandlerResult.Suppress; }
        else if (scroll = VKey.keyNames_.indexOf(keybody), scroll > 2 && scroll < 9 && (scroll & 5) - 5) {
          VSc.BeginScroll_(eventWrapper, key, keybody);
        }
        else if (keybody === kChar.j || keybody === kChar.k) {
          a.execute_(null, { n: keybody > kChar.j ? -1 : 1 });
        }
        else { h = HandlerResult.Suppress; }
      }
      else if (keybody === kChar.f1) { a.exec_("delete"); }
      else if (keybody === kChar.f2) {
        Build.BTypes & BrowserType.Firefox && a.box_.blur();
        focus(); VApi.keydownEvents_()[n] = 1;
      }
      else if (keybody === kChar.up || keybody === kChar.down) { a.nextQuery_(keybody < kChar.up); }
      else { h = HandlerResult.Suppress; }
    } else if (i === FindNS.Action.PassDirectly) {
      h = HandlerResult.Suppress;
    }
    h < HandlerResult.Prevent || VKey.prevent_(event);
    if (i < FindNS.Action.DoNothing + 1) { return; }
    VApi.keydownEvents_()[n] = 1;
    if (Build.BTypes & BrowserType.Firefox && i === FindNS.Action.CtrlDelete) {
      const sel = a.innerDoc_.getSelection();
      // on Chrome 79 + Win 10 / Firefox 69 + Ubuntu 18, delete a range itself
      // while on Firefox 70 + Win 10 it collapses first
      sel.type === "Caret" && sel.modify("extend", keybody[0] !== "d" ? "backward" : "forward", "word");
      a.exec_("delete");
      return;
    }
    a.deactivate_(i as FindNS.Action);
  },
  onHostKeydown_ (event: HandlerNS.Event): HandlerResult {
    const key = VKey.key_(event, kModeId.Find), key2 = key.replace("m-", "c-"),  a = this;
    if (key === kChar.f2) {
      a._onUnexpectedBlur && a._onUnexpectedBlur();
      a.focus_();
      return HandlerResult.Prevent;
    } else if (key2 === "c-j" || key2 === "c-k") {
        a.execute_(null, { n: key > "c-j" ? -1 : 1 });
        return HandlerResult.Prevent;
    }
    if (!VApi.lock_() && VKey.isEscape_(key)) {
      VKey.prevent_(event.e); // safer
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
      , visualMode = VVisual.mode_
      , maxNotRunPost = a.postOnEsc_ ? FindNS.Action.ExitAndReFocus - 1 : FindNS.Action.ExitToPostMode - 1
      , el: SafeElement | null | undefined, el2: Element | null;
    i === FindNS.Action.ExitNoAnyFocus || focus();
    a.clean_();
    if (i > FindNS.Action.MaxExitButNoWork) {
      el = VDom.getSelectionFocusEdge_(VCui.getSelected_()[0], 1);
      el && (Build.BTypes & ~BrowserType.Firefox ? (el as ElementToHTMLorSVG).tabIndex != null : el.focus) &&
      (el as Ensure<SafeElement, "focus">).focus();
    }
    if ((i === FindNS.Action.ExitAndReFocus || !hasResult || visualMode) && !noStyle) {
      a.ToggleStyle_(1);
      a.restoreSelection_(true);
    }
    if (visualMode) {
      VVisual.activate_(1, VKey.safer_<CmdOptions[kFgCmd.visualMode]>({
        m: VisualModeNS.Mode.Visual,
        r: true
      }));
      return;
    }
    if (i > FindNS.Action.MaxExitButNoWork && hasResult && (!el || el !== VApi.lock_())) {
      let container = a.focusFoundLinkIfAny_();
      if (container && i === FindNS.Action.ExitAndReFocus && (el2 = document.activeElement)
          && VDom.getEditableType_<0>(el2) >= EditableType.TextBox && container.contains(el2)) {
        VDom.prepareCrop_();
        VCui.simulateSelect_(el2 as LockableElement);
      } else if (el) {
        // always call scrollIntoView if only possible, to keep a consistent behavior
        !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions
          ? VDom.scrollIntoView_(el) : a.fixTabNav_(el);
      }
    }
    VCui.toggleSelectStyle_(0);
    if (i > maxNotRunPost) {
      a.postMode_.activate_();
    }
  },
  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=594613
/** ScrollIntoView to notify it's `<tab>`'s current target since Min$ScrollIntoView$SetTabNavigationNode (C51)
 * https://chromium.googlesource.com/chromium/src/+/0bb887b20c70582eeafad2a58ac1650b7159f2b6
 *
 * Tracking:
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/element.cc?q=ScrollIntoViewNoVisualUpdate&g=0&l=717
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/document.cc?q=SetSequentialFocusNavigationStartingPoint&g=0&l=4773
 */
  fixTabNav_: !(Build.BTypes & BrowserType.Chrome) // firefox seems to have "focused" it
        || Build.MinCVer >= BrowserVer.MinScrollIntoViewOptions ? 0 as never
      : function (el: Element): void {
    let oldPos: MarksNS.ScrollInfo | 0 = VDom.cache_.v < BrowserVer.MinScrollIntoViewOptions
          ? [scrollX, scrollY] : 0;
    VDom.scrollIntoView_(el);
    oldPos && VMarks.ScrollTo_(oldPos);
  },
  /** return an element if no <a> else null */
  focusFoundLinkIfAny_ (): SafeElement | null | void {
    let cur = VCui.GetSelectionParent_unsafe_();
    Build.BTypes & ~BrowserType.Firefox && (cur = VDom.SafeEl_(cur));
    for (let i = 0, el: Element | null = cur; el && el !== document.body && i++ < 5;
        el = VDom.GetParent_(el, PNType.RevealSlotAndGotoParent)) {
      if (VDom.htmlTag_(el) === "a") {
        (el as HTMLAnchorElement).focus();
        return;
      }
    }
    return cur as SafeElement | null;
  },
  nextQuery_ (back?: boolean): void {
    const ind = this.historyIndex_ + (back ? -1 : 1);
    if (ind < 0) { return; }
    this.historyIndex_ = ind;
    if (!back) {
      VApi.send_(kFgReq.findQuery, { i: ind }, this.SetQuery_);
      return;
    }
    this.exec_("undo");
    this.innerDoc_.getSelection().collapseToEnd();
  },
  SetQuery_ (this: void, query: string): void {
    let _this = VFind;
    if (query === _this.query_ || !_this.innerDoc_) { return; }
    if (!query && _this.historyIndex_ > 0) { --_this.historyIndex_; return; }
    _this.exec_("selectAll");
    _this.exec_("insertText", 0, query.replace(<RegExpOne> /^ /, "\xa0"));
    _this.OnInput_();
  },
  saveQuery_ (): void {
    this.query_ && VApi.post_({
      H: kFgReq.findQuery,
      q: this.query0_
    });
  },
  exec_ (cmd: string, doc?: Document | 0, value?: string) {
    (doc || this.innerDoc_).execCommand(cmd, false, value);
  },
  postMode_: {
    lock_: null as Element | null,
    activate_ (): void {
      const pm = this;
      const el = VApi.lock_(), Exit = pm.exit_ as (this: void, a?: boolean | Event) => void;
      if (!el) { Exit(); return; }
      VKey.pushHandler_(pm.onKeydown_, pm);
      if (el === pm.lock_) { return; }
      if (!pm.lock_) {
        VKey.SetupEventListener_(0, "click", Exit);
        VApi.setupSuppress_(Exit);
      }
      Exit(true);
      pm.lock_ = el;
      VKey.SetupEventListener_(el, "blur", Exit);
    },
    onKeydown_ (event: HandlerNS.Event): HandlerResult {
      const exit = VKey.isEscape_(VKey.key_(event, kModeId.Insert));
      exit ? this.exit_() : VKey.removeHandler_(this);
      return exit ? HandlerResult.Prevent : HandlerResult.Nothing;
    },
    exit_ (skip?: boolean | Event): void {
      // safe if destroyed, because `el.onblur = Exit`
      if (skip && skip !== !!skip
          && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !skip.isTrusted : skip.isTrusted === false)) { return; }
      const a = this;
      a.lock_ && VKey.SetupEventListener_(a.lock_, "blur", a.exit_, 1);
      if (!a.lock_ || skip === true) { return; }
      a.lock_ = null;
      VKey.SetupEventListener_(0, "click", a.exit_, 1);
      VKey.removeHandler_(a);
      VApi.setupSuppress_();
    }
  },
  OnInput_ (this: void, e?: Event): void {
    if (e) {
      VKey.Stop_(e);
      if (!(Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || VOther & BrowserType.Chrome)
          && (Build.MinCVer >= BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse
              || VDom.cache_.v > BrowserVer.Min$compositionend$$isComposing$IsMistakenlyFalse - 1)
          && e.type < "i")) {
        if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !e.isTrusted : e.isTrusted === false) { return; }
      }
      if ((e as InputEvent | Event & {isComposing?: boolean}).isComposing) { return; }
    }
    const _this = VFind, query = _this.input_.innerText.replace(<RegExpG> /\xa0/g, " ").replace(<RegExpOne> /\n$/, "");
    let s = _this.query_;
    if (!_this.hasResults_ && !_this.isRegex_ && !_this.wholeWord_ && _this.notEmpty_ && query.startsWith(s)
        && !query.includes("\\", s.length - 1)) {
      _this.query0_ = query;
      return _this.showCount_(0);
    }
    _this.coords_ && VMarks.ScrollTo_(_this.coords_);
    _this.updateQuery_(query);
    _this.restoreSelection_();
    _this.execute_(!_this.isRegex_ ? _this.parsedQuery_ : _this.regexMatches_ ? _this.regexMatches_[0] : "");
    _this.showCount_(1);
  },
  _small: false,
  showCount_ (changed: BOOL): void {
    const a = this;
    let count = a.matchCount_;
    if (changed) {
      (a.countEl_.firstChild as Text).data = !a.parsedQuery_ ? "" : VTr(
          count > 1 ? kTip.nMatches : count ? kTip.oneMatch : a.hasResults_ ? kTip.someMatches : kTip.noMatches,
          [count]
      );
    }
    count = (a.input_.scrollWidth + a.countEl_.offsetWidth + 35) & ~31;
    if (a._small && count < 152) { return; }
    a.box_.style.width = ((a._small = count < 152) ? 0 as number | string as string : count + "px");
  },
  updateQuery_ (query: string): void {
    const a = this;
    a.query_ = a.query0_ = query;
    a.wholeWord_ = false;
    a.isRegex_ = a.ignoreCase_ = null as boolean | null;
    query = a.isQueryRichText_ ? query.replace(<RegExpG & RegExpSearchable<0>> /\\[cirw\\]/gi, a.FormatQuery_)
        : query;
    let isRe = a.isRegex_, ww = a.wholeWord_, B = "\\b", escapeAllRe = <RegExpG> /[$()*+.?\[\\\]\^{|}]/g;
    if (a.isQueryRichText_) {
    if (isRe === null && !ww) {
      isRe = VDom.cache_.r;
      const info = 2 * +query.startsWith(B) + +query.endsWith(B);
      if (info === 3 && !isRe && query.length > 3) {
        query = query.slice(2, -2);
        ww = true;
      } else if (info && info < 3) {
        isRe = true;
      }
    }
    if (ww && (!(Build.BTypes & BrowserType.Chrome) || isRe
              || ((Build.BTypes & ~BrowserType.Chrome) && VOther !== BrowserType.Chrome)
        )) {
      query = B + query.replace(<RegExpG & RegExpSearchable<0>> /\\\\/g, "\\").replace(escapeAllRe, "\\$&") + B;
      ww = false;
      isRe = true;
    }
    query = isRe ? query !== "\\b\\b" && query !== B ? query : ""
        : query.replace(<RegExpG & RegExpSearchable<0>> /\\\\/g, "\\");
    }
    a.parsedQuery_ = query;
    a.isRegex_ = !!isRe;
    a.wholeWord_ = ww;
    a.notEmpty_ = !!query;
    a.ignoreCase_ !== null || (a.ignoreCase_ = query.toLowerCase() === query);
    isRe || (query = a.isActive_ ? query.replace(escapeAllRe, "\\$&") : "");

    let re: RegExpG | null = query && a.safeCreateRe_(ww ? B + query + B : query, a.ignoreCase_ ? "gi" : "g") || null;
    let matches: RegExpMatchArray | null = null;
    if (re) {
      let el = VDom.fullscreenEl_unsafe_(), text: HTMLElement["innerText"] | undefined;
      while (el && (el as ElementToHTML).lang == null) { // in case of SVG elements
        el = VDom.GetParent_(el, PNType.DirectElement);
      }
      query = el && typeof (text = (el as HTMLElement).innerText) === "string" && text ||
          (Build.BTypes & ~BrowserType.Firefox ? (document.documentElement as HTMLElement).innerText + ""
            : (document.documentElement as HTMLElement).innerText as string);
      matches = query.match(re) || query.replace(<RegExpG> /\xa0/g, " ").match(re);
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
    let flag = str.charCodeAt(1), enabled = flag >= kCharCode.a, a = VFind;
    if (flag === kCharCode.backslash) { return str; }
    flag &= ~kCharCode.CASE_DELTA;
    if (flag === kCharCode.I || flag === kCharCode.C) { a.ignoreCase_ = enabled === (flag === kCharCode.I); }
    else if (flag === kCharCode.W) {
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
    VCui.resetSelectionToDocStart_(sel);
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
    options = options ? VKey.safer_(options) : Object.create(null) as FindNS.ExecuteOptions;
    const a = this;
    let el: LockableElement | null
      , found: boolean, count = ((options.n as number) | 0) || 1, back = count < 0
      , par: Element | null | undefined, timesRegExpNotMatch = 0
      , q: string, notSens = a.ignoreCase_ && !options.caseSensitive;
    /** Note: FirefoxBrowserVer.MinFollowSelectionColorOnInactiveFrame
     * Before Firefox 68, it's impossible to replace the gray bg color for blurred selection:
     * In https://hg.mozilla.org/mozilla-central/file/tip/layout/base/nsDocumentViewer.cpp#l3463 ,
     * `nsDocViewerFocusListener::HandleEvent` calls `SetDisplaySelection(SELECTION_DISABLED)`,
     *   if only a trusted "blur" event gets dispatched into Document
     * See https://bugzilla.mozilla.org/show_bug.cgi?id=1479760 .
     */
    options.noColor || a.ToggleStyle_(0);
    back && (count = -count);
    const isRe = a.isRegex_, pR = a.parsedRegexp_;
    const focusHUD = !!(Build.BTypes & BrowserType.Firefox)
      && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
      && a.isActive_ && a.innerDoc_.hasFocus();
    do {
      q = query != null ? query : isRe ? a.getNextQueryFromRegexMatches_(back) : a.parsedQuery_;
      found = Build.BTypes & ~BrowserType.Chrome
        ? a.find_(q, !notSens, back, true, a.wholeWord_, false, false)
        : window.find(q, !notSens, back, true, a.wholeWord_, false, false);
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
          && !found) {
        VCui.resetSelectionToDocStart_();
        found = a.find_(q, !notSens, back, true, a.wholeWord_, false, false);
      }
      /**
       * Warning: on Firefox and before {@link #FirefoxBrowserVer.Min$find$NotReturnFakeTrueOnPlaceholderAndSoOn},
       * `found` may be unreliable,
       * because Firefox may "match" a placeholder and cause `getSelection().type` to be `"None"`
       */
      if (found && pR && (par = VCui.GetSelectionParent_unsafe_())) {
        pR.lastIndex = 0;
        let text = (par as HTMLElement | Element & {innerText?: undefined}).innerText;
        if (text && !(Build.BTypes & ~BrowserType.Firefox && typeof text !== "string")
            && !(pR as RegExpG & RegExpSearchable<0>).test(text as string)
            && timesRegExpNotMatch++ < 9) {
          count++;
          par = null;
        }
      }
    } while (0 < --count && found);
    if (found) {
      par = par || VCui.GetSelectionParent_unsafe_();
      par && VDom.view_(par);
    }
    options.noColor || setTimeout(a.HookSel_, 0);
    (el = VApi.lock_()) && !VDom.isSelected_() && el.blur();
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
    // (string, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog);
    try {
      return window.find.apply(window, arguments);
    } catch { return false; }
  } as Window["find"] : 0 as never,
  HookSel_ (t?: TimerType.fake | 1): void {
    VFind && VKey.SetupEventListener_(0, "selectionchange", VFind.ToggleStyle_, <number> t > 0);
  },
  /** must be called after initing */
  ToggleStyle_ (this: void, disable: BOOL | boolean | Event): void {
    const a = VFind, sout = a.styleOut_, sin = a.styleIn_, UI = VCui, active = a.isActive_;
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
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
      && (!(Build.BTypes & ~BrowserType.Edge) || sin === sout)
      || UI.add_(sin, AdjustType.NotAdjust, true);
    }
    sout.sheet && (sout.sheet.disabled = disable);
    sin.sheet && (sin.sheet.disabled = disable);
  },
  getCurrentRange_ (): void {
    let sel = VCui.getSelected_()[0], range: Range, doc = document;
    if (!sel.rangeCount) {
      range = doc.createRange();
      range.setStart(doc.body || doc.documentElement as Element, 0);
    } else {
      range = sel.getRangeAt(0);
      // Note: `range.collapse` doesn't work if selection is inside a ShadowRoot (tested on C72 stable)
      sel.collapseToStart();
    }
    range.collapse(true);
    this.initialRange_ = range;
  }
};
