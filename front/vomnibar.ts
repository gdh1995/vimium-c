/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
interface SuggestionE extends Readonly<CompletersNS.BaseSuggestion> {
  favIcon?: string;
  label?: string;
  relevancy: number | string;
}
interface SuggestionEx extends SuggestionE {
  https: boolean;
  parsed?: string;
  text: string;
}
interface Render {
  (this: void, list: ReadonlyArray<Readonly<SuggestionE>>): string;
}
interface Post<R extends void | 1> {
  postMessage<K extends keyof FgReq>(request: Req.fg<K>): R;
  postMessage<K extends keyof FgRes>(request: Req.fgWithRes<K>): R;
}
interface FgPort extends chrome.runtime.Port, Post<1> {
}
type Options = VomnibarNS.FgOptions;
declare const enum AllowedActions {
  Default = 0,
  nothing = Default,
  dismiss, focus, blurInput, backspace, blur, up, down = up + 2, toggle, pageup, pagedown, enter, remove
}

interface ConfigurableItems {
  /** @deprecated */ ExtId?: string;
  VomnibarListLength?: number;
  VomnibarRefreshInterval?: number;
  VomnibarWheelInterval?: number;
  VomnibarMaxPageNum?: number;
}
interface Window extends ConfigurableItems {}
import PixelData = VomnibarNS.PixelData;

if (typeof VSettings === "object" && VSettings && typeof VSettings.destroy === "function") {
  VSettings.destroy(true);
}

var VCID: string | undefined = VCID || window.ExtId, O = {
  pageType_: VomnibarNS.PageType.Default,
  activate (options: Options): void {
    Object.setPrototypeOf(options, null);
    this.mode_.type = this.modeType_ = ((options.mode || "") + "") as CompletersNS.ValidTypes || "omni";
    this.forceNewTab_ = options.newtab != null ? !!options.newtab : !!options.force;
    this.baseHttps_ = null;
    let { url, keyword, search } = options, start: number | undefined;
    let scale = window.devicePixelRatio;
    this.zoomLevel_ = scale < 0.98 ? 1 / scale : 1;
    this.setWidth_(options.width * PixelData.WindowSizeX + PixelData.MarginH);
    const max = Math.max(3, Math.min(0 | ((options.height - PixelData.ListSpaceDelta) / PixelData.Item), this.maxResults_));
    this.maxHeight_ = Math.ceil((this.mode_.maxResults = max) * PixelData.Item + PixelData.OthersIfNotEmpty);
    this.init_ && this.setPType_(options.ptype);
    if (this.mode_.favIcon) {
      scale = scale < 1.5 ? 1 : scale < 3 ? 2 : scale < 4 ? 3 : 4;
      this._favPrefix = '" style="background-image: url(&quot;chrome://favicon/size/16' + (scale > 1 ? "@" + scale + "x" : "") + "/";
    }
    if (url == null) {
      return this.reset_(keyword ? keyword + " " : "");
    }
    if (search) {
      start = search.start;
      url = search.url;
      keyword || (keyword = search.keyword);
    } else if (search === null) {
      url = U.decodeURL_(url).replace(<RegExpG> /\s$/g, "%20");
      if (!keyword && (<RegExpI>/^https?:\/\//i).test(url)) {
        this.baseHttps_ = (url.charCodeAt(4) | KnownKey.CASE_DELTA) === KnownKey.s;
        url = url.substring(this.baseHttps_ ? 8 : 7, url.indexOf("/", 8) === url.length - 1 ? url.length - 1 : undefined);
      }
    } else {
      url = U.decodeURL_(url, decodeURIComponent).trim().replace(this._spacesRe, " ");
    }
    if (keyword) {
      start = (start || 0) + keyword.length + 1;
      return this.reset_(keyword + " " + url, start, start + url.length);
    } else {
      return this.reset_(url);
    }
  },

  isActive_: false,
  inputText_: "",
  lastQuery_: "",
  lastNormalInput_: "",
  modeType_: "omni" as CompletersNS.ValidTypes,
  useInput_: true,
  completions_: null as never as SuggestionE[],
  total_: 0,
  maxPageNum_: Math.min(Math.max(3, (<number>window.VomnibarMaxPageNum | 0) || 10), 100),
  isEditing_: false,
  isInputComposing_: false,
  baseHttps_: null as boolean | null,
  isHttps_: null as boolean | null,
  isSearchOnTop_: false,
  actionType_: ReuseType.Default,
  matchType_: CompletersNS.MatchType.Default,
  focused_: true,
  showing_: false,
  firstShowing_: true,
  focusByCode_: true,
  blurWanted_: false,
  forceNewTab_: false,
  sameOrigin_: false,
  showFavIcon_: 0 as 0 | 1 | 2,
  showRelevancy_: false,
  zoomLevel_: 1,
  lastScrolling_: 0,
  height_: 0,
  maxHeight_: 0,
  input_: null as never as HTMLInputElement,
  bodySt_: null as never as CSSStyleDeclaration,
  barCls_: null as never as DOMTokenList,
  isSelOriginal_: true,
  lastKey_: VKeyCodes.None,
  keyResult_: HandlerResult.Nothing,
  list_: null as never as HTMLDivElement,
  onUpdate_: null as (() => void) | null,
  doEnter_: null as ((this: void) => void) | null,
  refreshInterval_: Math.max(256, (<number>window.VomnibarRefreshInterval | 0) || 500),
  wheelInterval_: Math.max(33, (<number>window.VomnibarWheelInterval | 0) || 100),
  renderItems_: null as never as Render,
  selection_: -1,
  atimer_: 0,
  timer_: 0,
  wheelTime_: 0,
  browser_: BrowserType.Chrome,
  browserVersion_: BrowserVer.assumedVer,
  wheelOptions_: { passive: false, capture: true as true },
  show_ (): void {
    this.showing_ = true;
    this.bodySt_.zoom = this.zoomLevel_ !== 1 ? this.zoomLevel_ + "" : "";
    this.firstShowing_ ? setTimeout(O.focus, 34) : (this.firstShowing_ = false);
    addEventListener("wheel", this.onWheel_, this.wheelOptions_);
    this.OnShown_ && setTimeout(this.OnShown_, 100);
  },
  hide (data?: "hide"): void {
    this.isActive_ = this.showing_ = this.isEditing_ = this.isInputComposing_ = this.blurWanted_ = this.focusByCode_ = false;
    removeEventListener("wheel", this.onWheel_, this.wheelOptions_);
    this.timer_ > 0 && clearTimeout(this.timer_);
    window.onkeyup = null as never;
    const el = this.input_;
    el.blur();
    data || P.postMessage_({ H: kFgReq.nextFrame, type: Frames.NextType.current, key: this.lastKey_ });
    this.bodySt_.cssText = "display: none;";
    this.list_.textContent = el.value = "";
    this.list_.style.height = "";
    this.barCls_.remove("empty");
    this.list_.classList.remove("no-favicon");
    if (this.sameOrigin_) { return this.onHidden_(); }
    this.atimer_ = requestAnimationFrame(this.AfterHide_);
    this.timer_ = setTimeout(this.AfterHide_, 35);
  },
  AfterHide_ (this: void): void {
    const a = O;
    cancelAnimationFrame(a.atimer_);
    clearTimeout(a.timer_);
    if (a.height_) {
      a.onHidden_();
    }
  },
  onHidden_ (): void {
    P.postToOwner_({ N: "hide" });
    this.timer_ = this.height_ = this.matchType_ = this.wheelTime_ = this.actionType_ =
    this.total_ = this.lastKey_ = 0;
    this.zoomLevel_ = 1;
    this.completions_ = this.onUpdate_ = this.isHttps_ = this.baseHttps_ = null as never;
    this.mode_.query = this.lastQuery_ = this.inputText_ = this.lastNormalInput_ = "";
    this.isSearchOnTop_ = false;
    this.modeType_ = this.mode_.type = "omni";
    this.doEnter_ ? setTimeout(this.doEnter_, 0) : (<RegExpOne> /a?/).test("");
    this.doEnter_ = null;
  },
  reset_ (input: string, start?: number, end?: number): void {
    this.inputText_ = input;
    this.useInput_ = this.showing_ = false;
    this.isHttps_ = this.baseHttps_;
    this.mode_.query = this.lastQuery_ = input && input.trim().replace(this._spacesRe, " ");
    this.height_ = 0;
    this.isActive_ = true;
    // also clear @timer
    this.update_(0, (start as number) <= (end as number) ? function(this: typeof O): void {
      if (this.input_.value === this.inputText_) {
        this.input_.setSelectionRange(start as number, end as number);
      }
    } : null);
    if (this.init_) { this.init_(); }
    this.input_.value = this.inputText_;
  },
  focus (this: void, focus?: false | TimerType.fake | "focus"): void {
    const a = O;
    a.focusByCode_ = true;
    if (focus !== false) {
      a.input_.focus();
    } else {
      P.postMessage_({ H: kFgReq.nextFrame, type: Frames.NextType.current, key: a.lastKey_ });
    }
  },
  update_ (updateDelay: number, callback?: (() => void) | null): void {
    this.onUpdate_ = callback || null;
    if (updateDelay >= 0) {
      this.isInputComposing_ = false;
      if (this.timer_ > 0) {
        clearTimeout(this.timer_);
      }
      if (updateDelay === 0) {
        return this.fetch_();
      }
    } else if (this.timer_ > 0) {
      return;
    } else {
      updateDelay = this.refreshInterval_;
    }
    this.timer_ = setTimeout(this.OnTimer_, updateDelay);
  },
  doRefresh_ (wait: number): void {
    let oldSel = this.selection_, origin = this.isSelOriginal_;
    this.useInput_ = false;
    this.setWidth_();
    return this.update_(wait, function(this: typeof O): void {
      const len = this.completions_.length;
      if (!origin && oldSel >= 0 && len > 0) {
        oldSel = Math.min(oldSel, len - 1);
        this.selection_ = 0; this.isSelOriginal_ = false;
        this.updateSelection_(oldSel);
      }
      this.focused_ || this.focus();
    });
  },
  updateInput_ (sel: number): void {
    const focused = this.focused_, blurred = this.blurWanted_;
    this.isSelOriginal_ = false;
    if (sel === -1) {
      this.isHttps_ = this.baseHttps_; this.isEditing_ = false;
      this.input_.value = this.inputText_;
      if (!focused) { this.focus(); this.blurWanted_ = blurred; }
      return;
    }
    blurred && focused && this.input_.blur();
    const line: SuggestionEx = this.completions_[sel] as SuggestionEx;
    if (line.parsed) {
      return this._updateInput(line, line.parsed);
    }
    (line as Partial<SuggestionEx>).https == null && (line.https = line.url.startsWith("https://"));
    if (line.type !== "history" && line.type !== "tab") {
      if (line.parsed == null) {
        U.ensureText_(line);
        line.parsed = "";
      }
      this._updateInput(line, line.text);
      if (line.type === "math") {
        this.input_.select();
      }
      return;
    }
    const onlyUrl = !line.text, url = line.url;
    const ind = U.ensureText_(line);
    let str = onlyUrl ? url : U.decodeURL_(url, decodeURIComponent);
    if (!onlyUrl && str.length === url.length && url.indexOf('%') >= 0) {
      // has error during decoding
      str = line.text;
      if (ind) {
        if (str.lastIndexOf("://", 5) < 0) {
          str = (ind === ProtocolType.http ? "http://" : "https://") + str;
        }
        if (url.endsWith('/') || !str.endsWith('/')) {
          str += '/';
        }
      }
    }
    P.postMessage_({
      H: kFgReq.parseSearchUrl,
      id: sel,
      url: str
    });
  },
  parsed_ ({ id, search }: BgVomnibarReq[kBgReq.omni_parsed]): void {
    const line: SuggestionEx = this.completions_[id] as SuggestionEx;
    line.parsed = search ? (this.modeType_ !== "omni" ? ":o " : "") + search.keyword + " " + search.url + " " : line.text;
    if (id === this.selection_) {
      return this._updateInput(line, line.parsed);
    }
  },
  toggleInput_ (): void {
    if (this.selection_ < 0) { return; }
    if (this.isSelOriginal_) {
      this.inputText_ = this.input_.value;
      return this.updateInput_(this.selection_);
    }
    let line = this.completions_[this.selection_] as SuggestionEx, str = this.input_.value.trim();
    str = str === line.url ? (line.parsed || line.text)
      : str === line.text ? line.url : line.text;
    return this._updateInput(line, str);
  },
  _updateInput (line: SuggestionEx, str: string): void {
    var maxW = str.length * 10, tooLong = maxW > innerWidth - PixelData.AllHNotInput;
    this.input_.value = str;
    tooLong && (this.input_.scrollLeft = maxW);
    this.isHttps_ = line.https && str === line.text;
    this.isEditing_ = str !== line.parsed || line.parsed === line.text;
  },
  updateSelection_ (sel: number): void {
    if (this.timer_) { return; }
    const _ref = this.list_.children, old = this.selection_;
    (this.isSelOriginal_ || old < 0) && (this.inputText_ = this.input_.value);
    this.updateInput_(sel);
    this.selection_ = sel;
    old >= 0 && _ref[old].classList.remove("s");
    sel >= 0 && _ref[sel].classList.add("s");
  },
  ctrlMap_: {
    32: AllowedActions.toggle, 66: AllowedActions.pageup
    , 74: AllowedActions.down, 75: AllowedActions.up, 78: AllowedActions.down, 80: AllowedActions.up
    , 219: AllowedActions.dismiss, 221: AllowedActions.toggle
  } as Readonly<Dict<AllowedActions>>,
  normalMap_: {
    9: AllowedActions.down, 27: AllowedActions.dismiss
    , 33: AllowedActions.pageup, 34: AllowedActions.pagedown, 38: AllowedActions.up, 40: AllowedActions.down
    , 112: AllowedActions.backspace, 113: AllowedActions.blur
  } as Readonly<Dict<AllowedActions>>,
  onKeydown_ (event: KeyboardEvent): void {
    if (!this.isActive_) { return; }
    let action: AllowedActions = AllowedActions.nothing, n = event.keyCode, focused = this.focused_;
    this.lastKey_ = n;
    if (event.altKey || event.metaKey) {
      if (event.ctrlKey || event.shiftKey) {}
      else if (n === VKeyCodes.f2) {
        return this.onAction_(focused ? AllowedActions.blurInput : AllowedActions.focus);
      }
      else if (!focused) {}
      else if (n > VKeyCodes.A && n < VKeyCodes.G && n !== VKeyCodes.C || n === VKeyCodes.backspace) {
        return this.onBashAction_(n - VKeyCodes.maxNotAlphabet);
      }
      if (event.altKey) { this.keyResult_ = HandlerResult.Nothing; return; }
    }
    if (n === VKeyCodes.enter) {
      window.onkeyup = this.OnEnterUp_;
      return;
    }
    else if (event.ctrlKey || event.metaKey) {
      if (event.shiftKey) { action = n === VKeyCodes.F ? AllowedActions.pagedown : n === VKeyCodes.B ? AllowedActions.pageup : AllowedActions.nothing; }
      else if (n === VKeyCodes.up || n === VKeyCodes.down || n === VKeyCodes.end || n === VKeyCodes.home) {
        event.preventDefault();
        this.lastScrolling_ = Date.now();
        window.onkeyup = O.HandleKeydown_;
        P.postToOwner_({ N: "scroll", keyCode: n });
        return;
      }
      else { action = event.code === "BracketLeft" ? AllowedActions.dismiss : event.code === "BracketRight" ? AllowedActions.toggle
                      : this.ctrlMap_[n] || AllowedActions.nothing; }
    }
    else if (event.shiftKey) {
      action = n === VKeyCodes.up ? AllowedActions.pageup : n === VKeyCodes.down ? AllowedActions.pagedown
        : n === VKeyCodes.tab ? AllowedActions.up : n === VKeyCodes.deleteKey ? AllowedActions.remove
        : AllowedActions.nothing;
    }
    else if (action = this.normalMap_[n] || AllowedActions.nothing) {}
    else if (n === VKeyCodes.ime || n > VKeyCodes.f1 && n < VKeyCodes.minNotFn) {
      this.keyResult_ = HandlerResult.Nothing;
      return;
    }
    else if (n === VKeyCodes.backspace) {
      if (focused) { this.keyResult_ = HandlerResult.Suppress; }
      return;
    }
    else if (n !== VKeyCodes.space) {}
    else if (!focused) { action = AllowedActions.focus; }
    else if ((this.selection_ >= 0
        || this.completions_.length <= 1) && this.input_.value.endsWith("  ")) {
      action = AllowedActions.enter;
    }
    if (action) {
      return this.onAction_(action);
    }

    if (!focused && n < VKeyCodes.minNotNum && n > VKeyCodes.maxNotNum) {
      n = (n - VKeyCodes.N0) || 10;
      return !event.shiftKey && n <= this.completions_.length ? this.onEnter_(event, n - 1) : undefined;
    }
    this.keyResult_ = focused && n !== VKeyCodes.menuKey ? HandlerResult.Suppress : HandlerResult.Nothing;
  },
  onAction_ (action: AllowedActions): void {
    let sel: number;
    switch(action) {
    case AllowedActions.dismiss:
      const selection = getSelection();
      if (selection.type === "Range" && this.focused_) {
        const el = this.input_;
        sel = el.selectionDirection !== "backward" &&
          el.selectionEnd < el.value.length ? el.selectionStart : el.selectionEnd;
        el.setSelectionRange(sel, sel);
      } else {
        return this.hide();
      }
      break;
    case AllowedActions.focus: this.focus(); break;
    case AllowedActions.blurInput: this.blurWanted_ = true; this.input_.blur(); break;
    case AllowedActions.backspace: case AllowedActions.blur:
      !this.focused_ ? this.focus()
      : action === AllowedActions.blur ? this.focus(false)
      : document.execCommand("delete");
      break;
    case AllowedActions.up: case AllowedActions.down:
      sel = this.completions_.length + 1;
      sel = (sel + this.selection_ + (action - AllowedActions.up)) % sel - 1;
      return this.updateSelection_(sel);
    case AllowedActions.toggle: return this.toggleInput_();
    case AllowedActions.pageup: case AllowedActions.pagedown: return this.goPage_(action !== AllowedActions.pageup);
    case AllowedActions.enter: return this.onEnter_(true);
    case AllowedActions.remove: return this.removeCur_();
    }
  },
  onBashAction_ (code: number): void {
    const sel = getSelection(), isExtend = code === 4 || code < 0;
    sel.modify(isExtend ? "extend" : "move", code < 4 ? "backward" : "forward", "word");
    if (isExtend && this.input_.selectionStart < this.input_.selectionEnd) {
      document.execCommand("delete");
    }
  },
  _pageNumRe: <RegExpOne> /(?:^|\s)(\+\d{0,2})$/,
  goPage_ (dirOrNum: boolean | number): void {
    if (this.isSearchOnTop_) { return; }
    const len = this.completions_.length, n = this.mode_.maxResults;
    let str = len ? this.completions_[0].type : "", delta = +dirOrNum || -1;
    str = (this.isSelOriginal_ || this.selection_ < 0 ? this.input_.value : this.inputText_).trimRight();
    let arr = this._pageNumRe.exec(str), i = ((arr && arr[0]) as string | undefined | number as number) | 0;
    if (len >= n) { delta *= n; }
    else if (i > 0 && delta < 0) { delta *= i >= n ? n : 1; }
    else if (len < (len && this.completions_[0].type !== "tab" ? n : 3)) { return; }

    const dest = Math.min(Math.max(0, i + delta), this.maxPageNum_ * n - n);
    if (delta > 0 && (dest === i || dest >= this.total_ && this.total_ > 0)) { return; }
    if (arr) { str = str.substring(0, str.length - arr[0].length); }
    str = str.trimRight();
    i = Math.min(this.input_.selectionEnd, str.length);
    if (dest > 0) { str += " +" + dest; }
    const oldStart = this.input_.selectionStart, oldDi = this.input_.selectionDirection;
    this.input_.value = str;
    this.input_.setSelectionRange(oldStart, i, oldDi);
    this.isInputComposing_ = false;
    return this.update_(-1);
  },
  onEnter_ (event?: MouseEvent | KeyboardEvent | true, newSel?: number): void {
    let sel = newSel != null ? newSel : this.selection_;
    this.actionType_ = event == null ? this.actionType_
      : event === true ? this.forceNewTab_ ? ReuseType.newFg : ReuseType.current
      : event.ctrlKey || event.metaKey ? event.shiftKey ? ReuseType.newBg : ReuseType.newFg
      : event.shiftKey || !this.forceNewTab_ ? ReuseType.current : ReuseType.newFg;
    if (newSel != null) {}
    else if (sel === -1 && this.input_.value.length === 0) { return; }
    else if (!this.timer_) {}
    else if (this.isEditing_) { sel = -1; }
    else if (this.timer_ > 0) {
      return this.update_(0, this.onEnter_);
    } else {
      this.onUpdate_ = this.onEnter_;
      return;
    }
    interface UrlInfo { url: string; sessionId?: undefined }
    const item: SuggestionE | UrlInfo = sel >= 0 ? this.completions_[sel] : { url: this.input_.value.trim() },
    action = this.actionType_, https = this.isHttps_,
    func = function(this: void): void {
      item.sessionId != null ? O.gotoSession_(item as SuggestionE & { sessionId: string | number })
        : O.navigateToUrl_((item as UrlInfo).url, action, https);
      (<RegExpOne> /a?/).test("");
    };
    if (this.actionType_ < ReuseType.newFg) { return func(); }
    this.doEnter_ = func;
    this.hide();
  },
  OnEnterUp_ (this: void, event: KeyboardEvent): void {
    if (event.isTrusted === true || (event.isTrusted == null && event instanceof KeyboardEvent) && event.keyCode === VKeyCodes.enter) {
      O.lastKey_ = VKeyCodes.None;
      window.onkeyup = null as never;
      O.onEnter_(event);
    }
  },
  removeCur_ (): void {
    if (this.selection_ < 0) { return; }
    const completion = this.completions_[this.selection_], type = completion.type;
    if (type !== "tab" && (type !== "history" || completion.sessionId != null)) {
      P.postToOwner_({ N: "hud", text: "This item can not be deleted." });
      return;
    }
    P.postMessage_({
      H: kFgReq.removeSug,
      type,
      url: type === "tab" ? completion.sessionId + "" : completion.url
    });
    return this.refresh_();
  },
  onClick_ (event: MouseEvent): void {
    let el: Node | null = event.target as Node;
    if (event.isTrusted === false || !(event instanceof MouseEvent) || event.button
      || el === this.input_ || getSelection().type === "Range") { return; }
    if (el === this.input_.parentElement) { return this.focus(); }
    if (this.timer_) { event.preventDefault(); return; }
    while (el && el.parentNode !== this.list_) { el = el.parentNode; }
    if (!el) { return; }
    this.lastKey_ = VKeyCodes.None;
    this.onEnter_(event, [].indexOf.call(this.list_.children, el));
  },
  OnMenu_ (this: void, event: Event): void {
    let el = event.target as Element | null, item: Element | null;
    for (; el && !el.classList.contains("url"); el = el.parentElement) {}
    if (!el || (el as HTMLAnchorElement).href) { return; }
    for (item = el; item && item.parentElement !== O.list_; item = item.parentElement) {}
    const _i = [].indexOf.call(O.list_.children, item);
    _i >= 0 && ((el as HTMLAnchorElement).href = O.completions_[_i].url);
  },
  OnSelect_ (this: HTMLInputElement): void {
    let el = this;
    if (el.selectionStart !== 0 || el.selectionDirection !== "backward") { return; }
    let left = el.value,
    end = el.selectionEnd - 1;
    if (left.charCodeAt(end) !== KnownKey.space || end === left.length - 1) { return; }
    left = left.substring(0, end).trimRight();
    if (left.indexOf(" ") === -1) {
      el.setSelectionRange(0, left.length, 'backward');
    }
  },
  OnFocus_ (this: void, event: Event): void {
    event.isTrusted !== false && (O.focused_ = event.type !== "blur") && (O.blurWanted_ = false);
  },
  OnTimer_ (this: void): void { if (O) { return O.fetch_(); } },
  onWheel_ (event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey || event.isTrusted === false) { return; }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.deltaX || !event.deltaY || Date.now() - this.wheelTime_ < this.wheelInterval_ || !O.isActive_) { return; }
    this.wheelTime_ = Date.now();
    this.goPage_(event.deltaY > 0);
  },
  onInput_ (event: KeyboardEvent): void {
    const s0 = this.lastQuery_, s1 = this.input_.value, str = s1.trim();
    this.blurWanted_ = false;
    if (str === (this.selection_ === -1 || this.isSelOriginal_ ? s0 : this.completions_[this.selection_].text)) {
      return;
    }
    if (this.matchType_ === CompletersNS.MatchType.emptyResult && str.startsWith(s0)) { return; }
    if (!str) { this.isHttps_ = this.baseHttps_ = null; }
    let i = this.input_.selectionStart, arr: RegExpExecArray | null;
    if (this.isSearchOnTop_) {}
    else if (i > s1.length - 2) {
      if (s1.endsWith(" +") && !this.timer_ && str.substring(0, str.length - 2).trimRight() === s0) {
        return;
      }
    } else if ((arr = this._pageNumRe.exec(s0)) && str.endsWith(arr[0])) {
      const j = arr[0].length, s2 = s1.substring(0, s1.trimRight().length - j);
      if (s2.trim() !== s0.substring(0, s0.length - j).trimRight()) {
        this.input_.value = s2.trimRight();
        this.input_.setSelectionRange(i, i);
      }
    }
    const { isComposing } = event;
    if (isComposing != null) {
      if (isComposing && !this.isInputComposing_) {
        this.lastNormalInput_ = this.input_.value.trim();
      }
      this.isInputComposing_ = isComposing;
    }
    this.update_(-1);
  },
  omni_ (response: BgVomnibarReq[kBgReq.omni_omni]): void {
    if (!this.isActive_) { return; }
    const list = response.list, height = list.length, notEmpty = height > 0;
    this.total_ = response.total;
    this.showFavIcon_ = response.favIcon;
    this.matchType_ = response.matchType;
    this.completions_ = list;
    this.selection_ = (response.autoSelect || this.modeType_ !== "omni") && notEmpty ?  0 : -1;
    this.isSelOriginal_ = true;
    this.isSearchOnTop_ = notEmpty && list[0].type === "search";
    return this.populateUI_();
  },
  populateUI_ (): void {
    const len = this.completions_.length, notEmpty = len > 0, oldH = this.height_, list = this.list_;
    const height = this.height_ = Math.ceil(notEmpty ? len * PixelData.Item + PixelData.OthersIfNotEmpty : PixelData.OthersIfEmpty),
    needMsg = height !== oldH, earlyPost = height > oldH || this.sameOrigin_,
    msg: VomnibarNS.FReq["style"] & VomnibarNS.Msg<"style"> = { N: "style", height };
    oldH || (msg.max = this.maxHeight_);
    if (needMsg && earlyPost) { P.postToOwner_(msg); }
    this.completions_.forEach(this.parse_, this);
    list.innerHTML = this.renderItems_(this.completions_);
    oldH || (this.bodySt_.display = "");
    let cl = this.barCls_, c = "empty";
    notEmpty ? cl.remove(c) : cl.add(c);
    cl = list.classList, c = "no-favicon";
    this.showFavIcon_ ? cl.remove(c) : cl.add(c);
    if (notEmpty) {
      if (this.selection_ === 0) {
        (list.firstElementChild as HTMLElement).classList.add("s");
      }
      (list.lastElementChild as HTMLElement).classList.add("b");
    }
    if (earlyPost) {
      return this.postUpdate_();
    } else {
      requestAnimationFrame(() => { needMsg && P.postToOwner_(msg); return O.postUpdate_(); });
    }
  },
  postUpdate_ (): void {
    let func: typeof O.onUpdate_;
    if (!this.showing_) { this.show_(); }
    if (this.timer_ > 0) { return; }
    this.timer_ = 0;
    this.isEditing_ = false;
    if (func = this.onUpdate_) {
      this.onUpdate_ = null;
      return func.call(this);
    }
  },
  OnShown_: function (this: void): void {
    const a = O, i = a.input_, listen = addEventListener, wndFocus = O.OnWndFocus_;
    i.onselect = a.OnSelect_;
    i.onfocus = i.onblur = a.OnFocus_;
    a.OnShown_ = null;
    listen("focus", wndFocus);
    listen("blur", wndFocus);
    a.blurred_();
  } as ((this: void) => void) | null,
  _focusTimer: 0,
  OnWndFocus_ (this: void, event: Event): void {
    const a = O, byCode = a.focusByCode_;
    a.focusByCode_ = false;
    if (!a.isActive_ || event.target !== window || event.isTrusted === false) { return; }
    const blurred = event.type === "blur";
    if (blurred) {
      const t = a._focusTimer;
      t && clearTimeout(t);
      a._focusTimer = 0;
    }
    if (byCode) {
      a.blurred_(blurred);
    } else if (blurred) {
      P.postMessage_({ H: kFgReq.blurTest });
    } else {
      a._focusTimer = setTimeout(a.blurred_, 50, false);
      P && P.postMessage_({ H: kFgReq.blank });
      if (a.pageType_ === VomnibarNS.PageType.ext && P) {
        P.postToOwner_({N: "test"});
      }
    }
  },
  blurred_ (this: void, blurred?: boolean | object): void {
    const a = (document.body as HTMLBodyElement).classList;
    (typeof blurred === "boolean" ? !blurred : document.hasFocus()) ? a.remove("transparent") : a.add("transparent");
  },
  init_ (): void {
    window.onclick = function(e) { O.onClick_(e); };
    this.onWheel_ = this.onWheel_.bind(this);
    Object.setPrototypeOf(this.ctrlMap_, null);
    Object.setPrototypeOf(this.normalMap_, null);
    this.input_ = document.getElementById("input") as HTMLInputElement;
    const list = this.list_ = document.getElementById("list") as HTMLDivElement;
    const { browserVersion_: ver } = this;
    this.input_.oninput = this.onInput_.bind(this);
    this.bodySt_ = (document.documentElement as HTMLHtmlElement).style;
    this.barCls_ = (this.input_.parentElement as HTMLElement).classList;
    list.oncontextmenu = this.OnMenu_;
    (document.getElementById("close") as HTMLElement).onclick = function(): void { return O.hide(); };
    addEventListener("keydown", this.HandleKeydown_, true);
    this.renderItems_ = U.makeListRenderer_((document.getElementById("template") as HTMLElement).innerHTML);
    if (ver >= BrowserVer.MinSpecCompliantShadowBlurRadius) {
      const css = document.querySelector("style") as HTMLStyleElement;
      if (css) {
        css.textContent = css.textContent.replace("0 2px 10px", "0 2px 7px");
      }
    }
    if (ver < BrowserVer.MinRoundedBorderWidthIsNotEnsured) {
      const css = document.createElement("style");
      css.textContent = `.item, #input { border-width: ${ver < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo ? 1 : 0.01}px; }`;
      (document.head as HTMLHeadElement).appendChild(css);
    }
    if (ver < BrowserVer.Min$KeyboardEvent$$isComposing) {
      let func = function (this: void, event: CompositionEvent): void {
        if (O.isInputComposing_ = event.type === "compositionstart") {
          O.lastNormalInput_ = O.input_.value.trim();
        }
      };
      this.input_.addEventListener("compositionstart", func);
      this.input_.addEventListener("compositionend", func);
    }
    this.init_ = U.makeListRenderer_ = null as never;
    if (ver >= BrowserVer.MinSVG$Path$Has$d$CSSAttribute && this.browser_ === BrowserType.Chrome || this.bodySt_.d != null) { return; }
    const styles = (document.querySelector("style") as HTMLStyleElement).textContent,
    re = <RegExpG & RegExpSearchable<2>> /\.([a-z]+)\s?\{(?:[^}]+;)?\s*d\s?:\s*path\s?\(\s?['"](.+?)['"]\s?\)/g,
    pathMap = Object.create<string>(null);
    let arr: RegExpExecArray | null;
    while (arr = re.exec(styles)) { pathMap[arr[1]] = arr[2]; }
    this.getTypeIcon_ = function(sug: Readonly<SuggestionE>): string {
      const type = sug.type, path = pathMap[type];
      return path ? `${type}" d="${path}` : type;
    }
  },
  getTypeIcon_ (sug: Readonly<SuggestionE>): string { return sug.type; },
  setPType_ (type: VomnibarNS.PageType): void {
    this.pageType_ = type;
    let fav: 0 | 1 | 2 = 0, f: () => chrome.runtime.Manifest, manifest: chrome.runtime.Manifest
      , canShowOnOthers = this.browserVersion_ >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon;
    if (type === VomnibarNS.PageType.web || location.origin.indexOf("-") < 0) {}
    else if (type === VomnibarNS.PageType.inner) {
      fav = canShowOnOthers || this.sameOrigin_ ? 2 : 0;
    } else if ((canShowOnOthers || this.sameOrigin_) && (f = chrome.runtime.getManifest) && (manifest = f())) {
      const arr = manifest.permissions || [];
      fav = arr.indexOf("<all_urls>") >= 0 || arr.indexOf("chrome://favicon/") >= 0 ? this.sameOrigin_ ? 2 : 1 : 0;
    }
    this.mode_.favIcon = fav;
  },
  HandleKeydown_ (this: void, event: KeyboardEvent): void {
    if (event.isTrusted !== true && !(event.isTrusted == null && event instanceof KeyboardEvent)) { return; }
    O.keyResult_ = HandlerResult.Prevent as HandlerResult;
    if (window.onkeyup) {
      let stop = !event.repeat, now: number = 0;
      if (!O.lastScrolling_) {
        stop = event.keyCode > VKeyCodes.ctrlKey || event.keyCode < VKeyCodes.shiftKey;
      } else if (stop || (now = Date.now()) - O.lastScrolling_ > 40) {
        P.postToOwner_({ N: stop ? "scrollEnd" : "scrollGoing" });
        O.lastScrolling_ = now;
      }
      if (stop) { window.onkeyup = null as never; }
    } else {
      O.onKeydown_(event);
    }
    if (O.keyResult_ === HandlerResult.Nothing) { return; }
    if (O.keyResult_ === HandlerResult.Prevent) { event.preventDefault(); }
    event.stopImmediatePropagation();
  },
  returnFocus_ (this: void, request: BgVomnibarReq[kBgReq.omni_returnFocus]): void {
    type VoidPost = <K extends keyof VomnibarNS.FReq> (this: void, msg: VomnibarNS.FReq[K] & VomnibarNS.Msg<K>) => void;
    setTimeout<VomnibarNS.FReq["focus"] & VomnibarNS.Msg<"focus">>(P.postToOwner_ as
      VoidPost, 0, { N: "focus", key: request.key });
  },
  _realDevRatio: 0,
  setWidth_ (w?: number): void {
    let mayHasWrongWidth = this.browserVersion_ === BrowserVer.ExtIframeIn3rdProcessHasWrong$innerWidth$If$devicePixelRatio$isNot1
      , msg = "", r: number, zoom = this.zoomLevel_;
    if (!mayHasWrongWidth) {}
    else if (r = this._realDevRatio) {
      // now we has real screen device pixel ratio (of not Chrome but Windows)
      w = innerWidth / r;
      msg = r > 1.02 || r < 0.98 ? Math.round(10000 / r) / 100 + "%" : "";
    } else {
      // the line below is just in case of wront usages of @setWidth
      w = w || parseFloat(this.bodySt_.width) || innerWidth;
      msg = w / zoom + "px";
      this.fixRatio_(w as number);
    }
    this.mode_.maxChars = Math.round(((w || innerWidth) / zoom - PixelData.AllHNotUrl) / PixelData.MeanWidthOfChar);
    if (mayHasWrongWidth) {
      (document.documentElement as HTMLHtmlElement).style.width = msg;
    }
  },
  fixRatio_ (w: number): void {
    // this function is only for BrowserVer.ExtIframeIn3rdProcessHasWrong$innerWidth$If$devicePixelRatio$isNot1
    let tick = 0, timer = setInterval(function(): void {
      const iw = innerWidth, a = O;
      if (iw > 0 || tick++ > 15) {
        clearInterval(timer);
        if (a) {
          a._realDevRatio = iw / w;
          iw > 0 && a.setWidth_();
        }
      }
    }, 100);
  },
  secret_: null as never as (request: BgVomnibarReq[kBgReq.omni_secret]) => void,

  maxResults_: (<number>window.VomnibarListLength | 0) || 10,
  mode_: {
    H: kFgReq.omni as kFgReq.omni,
    type: "omni" as CompletersNS.ValidTypes,
    maxChars: 0,
    maxResults: 0,
    favIcon: 0 as 0 | 1 | 2,
    query: ""
  },
  _spacesRe: <RegExpG> /\s+/g,
  _singleQuoteRe: <RegExpG> /'/g,
  fetch_ (): void {
    let mode = this.mode_, str: string, last: string, newMatchType = CompletersNS.MatchType.Default;
    this.timer_ = -1;
    if (this.useInput_) {
      this.lastQuery_ = str = this.input_.value.trim();
      if (!this.isInputComposing_) {}
      else if (str.startsWith(last = this.lastNormalInput_)) {
        str = last + str.substring(last.length).replace(this._singleQuoteRe, "");
      } else {
        str = str.replace(this._singleQuoteRe, " ");
      }
      str = str.replace(this._spacesRe, " ");
      if (str === mode.query) { return this.postUpdate_(); }
      mode.type = this.matchType_ < CompletersNS.MatchType.singleMatch || !str.startsWith(mode.query) ? this.modeType_
        : this.matchType_ === CompletersNS.MatchType.searchWanted ? "search"
        : (newMatchType = this.matchType_, this.completions_[0].type as CompletersNS.ValidTypes);
      mode.query = str;
      this.setWidth_();
      this.matchType_ = newMatchType;
    } else {
      this.useInput_ = true;
    }
    return P.postMessage_(mode);
  },

  _favPrefix: "",
  parse_ (item: SuggestionE): void {
    let str: string | undefined;
    item.relevancy = this.showRelevancy_ ? `\n\t\t\t<span class="relevancy">${item.relevancy}</span>` : "";
    (str = item.label) && (item.label = ` <span class="label">${str}</span>`);
    item.favIcon = (str = this.showFavIcon_ ? item.url : "") && this._favPrefix +
        ((str = this._parseFavIcon(item, str)) ? U.escapeCSSStringInAttr_(str) : "about:blank") + "&quot;);";
  },
  _parseFavIcon (item: SuggestionE, url: string): string {
    let str = url.substring(0, 11).toLowerCase();
    return str.startsWith("vimium://") ? "chrome-extension://" + (VCID || chrome.runtime.id) + "/pages/options.html"
      : url.length > 512 || str === "javascript:" || str.startsWith("data:") ? ""
      : item.type === "search"
        ? url.startsWith("http") ? url.substring(0, (url.indexOf("/", url[4] === "s" ? 8 : 7) + 1) || url.length) : ""
      : url;
  },
  navigateToUrl_ (url: string, reuse: ReuseType, https: boolean | null): void {
    if (url.charCodeAt(10) === KnownKey.colon && url.substring(0, 11).toLowerCase() === "javascript:") {
      P.postToOwner_({ N: "evalJS", url });
      return;
    }
    P.postMessage_({ H: kFgReq.openUrl, reuse, https, url, omni: true });
    if (reuse === ReuseType.newBg && (!this.lastQuery_ || (<RegExpOne>/^\+\d{0,2}$/).exec(this.lastQuery_))) {
      return this.refresh_();
    }
  },
  gotoSession_ (item: SuggestionE & { sessionId: string | number }): void {
    P.postMessage_({
      H: kFgReq.gotoSession,
      active: this.actionType_ > ReuseType.newBg,
      sessionId: item.sessionId
    });
    if (this.actionType_ === ReuseType.newBg) {
      return this.refresh_(item.type === "tab");
    }
  },
  refresh_ (waitFocus?: boolean): void {
    getSelection().removeAllRanges();
    if (!waitFocus) {
      return this.doRefresh_(150);
    }
    window.onfocus = function(e: Event): void {
      window.onfocus = null as never;
      if (e.isTrusted !== false && P._port) { O.doRefresh_(17); }
    };
  },
  OnUnload_ (e: Event): void {
    if (!P || e.isTrusted === false) { return; }
    O.isActive_ = false;
    O.timer_ > 0 && clearTimeout(O.timer_);
    P.postToOwner_({ N: "unload" });
  }
},
U = {
  makeListRenderer_ (this: void, template: string): Render {
    const a = template.split(/\{\{(\w+)}}/g);
    return function(objectArray): string {
      let html = "", len = a.length - 1;
      for (const o of objectArray) {
        let j = 0;
        for (; j < len; j += 2) {
          html += a[j];
          const key = a[j + 1];
          html += key === "typeIcon" ? O.getTypeIcon_(o) : o[key as keyof SuggestionE] || ""
        }
        html += a[len];
      }
      return html;
    };
  },
  decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try {
      url = (decode || decodeURI)(url);
    } catch (e) {}
    return url;
  },
  ensureText_ (sug: SuggestionEx): ProtocolType {
    let { url, text } = sug, str = url.substring(0, 8).toLowerCase();
    let i = str.startsWith("http://") ? ProtocolType.http : str === "https://" ? ProtocolType.https : ProtocolType.others;
    i >= url.length && (i = ProtocolType.others);
    let wantSchema = !i;
    if (i === ProtocolType.https) {
      let j = url.indexOf('/', i);
      if (j > 0 ? j < url.length : /* domain has port */ (<RegExpOne>/:\d+\/?$/).test(url)) {
        wantSchema = true;
      }
    }
    if (!text) {
      text = !wantSchema && i ? url.substring(i) : url;
    } else if (i) {
      if (wantSchema && !text.startsWith(str)) {
        text = str + text;
      }
      if (url.endsWith('/') && !str.endsWith('/') && str.indexOf('/') > 0) {
        text += '/';
      }
    }
    sug.text = text;
    return i;
  },
  escapeCSSStringInAttr_ (s: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === KnownKey.and ? "&amp;" : i === KnownKey.quote1 ? "&apos;"
        : i < KnownKey.quote1 ? "%22" : i === KnownKey.lt ? "%3C" : "%3E";
    }
    this.escapeCSSStringInAttr_ = function(s): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return this.escapeCSSStringInAttr_(s);
  }
},
P = {
  _port: null as FgPort | null,
  postToOwner_: null as never as <K extends keyof VomnibarNS.FReq> (this: void, msg: VomnibarNS.FReq[K] & VomnibarNS.Msg<K>) => void | 1,
  postMessage_<K extends keyof FgReq> (request: FgReq[K] & Req.baseFg<K>): void {
    try {
      (this._port || this.connect_(PortType.omnibarRe)).postMessage<K>(request);
    } catch (e) {
      P = null as never;
      this.postToOwner_({ N: "broken", active: O.isActive_ });
    }
  },
  _Listener<T extends keyof BgVomnibarReq> (this: void, response: Req.bg<T>): void {
    const name = response.N;
    name === kBgReq.omni_omni ? O.omni_(response as Req.bg<kBgReq.omni_omni>) :
    name === kBgReq.omni_parsed ? O.parsed_(response as Req.bg<kBgReq.omni_parsed>) :
    name === kBgReq.omni_secret ? O.secret_(response as Req.bg<kBgReq.omni_secret>) :
    name === kBgReq.omni_returnFocus ? O.returnFocus_(response as Req.bg<kBgReq.omni_returnFocus>) :
    name === kBgReq.omni_blurred ? O.blurred_(response as Req.bg<kBgReq.omni_blurred>) :
    0;
  },
  _OnOwnerMessage<K extends keyof VomnibarNS.CReq> ({ data: data }: { data: VomnibarNS.CReq[K] }): void {
    type Res = VomnibarNS.CReq;
    let name = ((data as VomnibarNS.Msg<string>).N || data) as keyof Res;
    if (name === "backspace") { return O.onAction_(AllowedActions.backspace); }
    type Keys = typeof name;
    (O as { [K in Keys]: (data: Res[K]) => void
      } as { [K in Keys]: <T2 extends Keys>(data: Res[T2]) => void
      })[name](data as Res[typeof name]);
  },
  _ClearPort (this: void): void { P._port = null; },
  connect_ (type: PortType): FgPort {
    const data = { name: "vimium-c." + type + (VCID ? "@omni" : "") }, port = this._port = (VCID ?
      chrome.runtime.connect(VCID, data) : chrome.runtime.connect(data)) as FgPort;
    port.onDisconnect.addListener(this._ClearPort);
    port.onMessage.addListener(this._Listener as (message: object) => void);
    return port;
  }
};
"".startsWith || (String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
});
"".endsWith || (String.prototype.endsWith = function(this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
window.browser && (browser as typeof chrome).runtime && (window.chrome = browser as typeof chrome);
(function(): void {
  if ((document.documentElement as HTMLElement).getAttribute("data-version") != "1.68.1") {
    location.href = "about:blank";
    return;
  }
  let curEl: HTMLScriptElement;
  if (location.pathname.startsWith("/front/") || !(curEl = document.currentScript as typeof curEl)) {}
  else if (curEl.src.endsWith("/front/vomnibar.js") && !curEl.src.startsWith("http") && !curEl.src.startsWith("ftp")) {
    VCID = new URL(curEl.src).hostname;
  } else {
    curEl.remove();
    window.onmessage = function(event): void {
      if (event.source !== window.parent) { return; }
      const data: VomnibarNS.MessageData = event.data, script = document.createElement("script"),
      src = script.src = (data[1] as VomnibarNS.FgOptions).script;
      VCID = new URL(src).hostname;
      script.onload = function(): void {
        script.onload = null as never;
        window.onmessage(event);
      };
      (document.head || document.documentElement as HTMLElement).appendChild(script);
    };
    return;
  }

  let _sec = 0 as number,
  unsafeMsg = [] as [number, VomnibarNS.IframePort, Options | null][],
  handler = function(this: void, secret: number, port: VomnibarNS.IframePort, options: Options | null): void {
    if (_sec < 1 || secret != _sec) {
      _sec || unsafeMsg.push([secret, port, options]);
      return;
    }
    _sec = -1;
    clearTimeout(timer);
    window.onmessage = null as never;
    O.sameOrigin_ = !!port.sameOrigin;
    P.postToOwner_ = port.postMessage.bind(port);
    port.onmessage = P._OnOwnerMessage;
    window.onunload = O.OnUnload_;
    if (options) {
      O.activate(options);
    } else {
      port.postMessage({ N: "uiComponentIsReady" });
    }
  },
  timer = setTimeout(function() { window.location.href = "about:blank"; }, 700);
  O.secret_ = function(this: typeof O, request): void {
    this.secret_ = function() {};
    O.browser_ = request.browser;
    O.browserVersion_ = request.browserVer;
    const { secret } = request, msgs = unsafeMsg;
    _sec = secret;
    unsafeMsg = null as never;
    for (const i of msgs) {
      if (i[0] == secret) {
        return handler(i[0], i[1], i[2]);
      }
    }
  };
  window.onmessage = function(event): void {
    if (event.source === window.parent) {
      const data: VomnibarNS.MessageData = event.data;
      handler(data[0], event.ports[0], data[1]);
    }
  };
P.connect_(PortType.omnibar);
})();
