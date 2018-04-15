/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
interface SuggestionE extends Readonly<CompletersNS.BaseSuggestion> {
  favIcon?: string;
  index?: string;
  relevancy: number | string;
  Ty?: string;
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
  dismiss, focus, blurInput, backspace, blur, up, down = up + 2, toggle, pageup, pagedown, enter
}

interface ConfigurableItems {
  ExtId?: string;
  VomnibarListLength?: number;
  VomnibarRefreshInterval?: number;
  VomnibarWheelInterval?: number;
}
interface Window extends ConfigurableItems {}

declare const enum PixelData {
  InputBar = 54, InputBarWithLine = InputBar + 1,
  Item = 44, LastItemDelta = 46 - Item,
  MarginV1 = 9, MarginV2 = 10, MarginV = MarginV1 + MarginV2,
  OthersIfEmpty = InputBar + MarginV,
  OthersIfNotEmpty = InputBarWithLine + MarginV + LastItemDelta,
  ListSpaceDelta = VomnibarNS.Consts.MarginTop + MarginV1 + InputBarWithLine + LastItemDelta + ((MarginV2 / 2) | 0),
  MarginH = 24, AllHNotUrl = 20 * 2 + 20 + 2, MeanWidthOfChar = 7.7,
  AllHNotInput = AllHNotUrl + MarginH, // is just an approximation
}

if (typeof VSettings === "object" && VSettings && typeof VSettings.destroy === "function") {
  VSettings.destroy(true, true);
  window.dispatchEvent(new Event("unload"));
}

var Vomnibar = {
  activate (options: Options): void {
    Object.setPrototypeOf(options, null);
    this.mode.type = this.modeType = ((options.mode || "") + "") as CompletersNS.ValidTypes || "omni";
    this.forceNewTab = !!options.force;
    this.isHttps = null;
    let { url, keyword, search } = options, start: number | undefined;
    this.setWidth(options.width * 0.8);
    this.mode.maxResults = Math.min(Math.max(3, 0 | ((options.height - PixelData.ListSpaceDelta) / PixelData.Item)), this.maxResults);
    this.init && this.setFav(options.ptype);
    if (this.mode.favIcon) {
      let scale = devicePixelRatio;
      scale = scale < 1.5 ? 1 : scale < 3 ? 2 : scale < 4 ? 3 : 4;
      this.favPrefix = '" style="background-image: url(&quot;chrome://favicon/size/16' + (scale > 1 ? "@" + scale + "x" : "") + "/";
    }
    if (url == null) {
      return this.reset(keyword ? keyword + " " : "");
    }
    if (search) {
      start = search.start;
      url = search.url;
      keyword || (keyword = search.keyword);
    } else if (search === null) {
      url = VUtils.decodeURL(url).replace(<RegExpG> /\s$/g, "%20");
      if (!keyword && (<RegExpI>/^https?:\/\//i).test(url)) {
        this.isHttps = (url.charCodeAt(4) | KnownKey.CASE_DELTA) === KnownKey.s;
        url = url.substring(this.isHttps ? 8 : 7, url.indexOf("/", 8) === url.length - 1 ? url.length - 1 : undefined);
      }
    } else {
      url = VUtils.decodeURL(url, decodeURIComponent).trim().replace(this._spacesRe, " ");
    }
    if (keyword) {
      start = (start || 0) + keyword.length + 1;
      return this.reset(keyword + " " + url, start, start + url.length);
    } else {
      return this.reset(url);
    }
  },

  isActive: false,
  inputText: "",
  lastQuery: "",
  lastNormalInput: "",
  modeType: "omni" as CompletersNS.ValidTypes,
  useInput: true,
  completions: null as never as SuggestionE[],
  isEditing: false,
  isInputComposing: false,
  isHttps: null as boolean | null,
  isSearchOnTop: false,
  actionType: ReuseType.Default,
  matchType: CompletersNS.MatchType.Default,
  focused: true,
  focusByCode: true,
  blurWanted: false,
  forceNewTab: false,
  sameOrigin: false,
  showFavIcon: 0 as 0 | 1 | 2,
  showRelevancy: false,
  lastScrolling: 0,
  height: 0,
  input: null as never as HTMLInputElement,
  bodySt: null as never as CSSStyleDeclaration,
  barCls: null as never as DOMTokenList,
  isSelOriginal: true,
  lastKey: VKeyCodes.None,
  keyResult: HandlerResult.Nothing,
  list: null as never as HTMLDivElement,
  onUpdate: null as (() => void) | null,
  doEnter: null as ((this: void) => void) | null,
  refreshInterval: Math.max(256, (<number>window.VomnibarRefreshInterval | 0) || 500),
  wheelInterval: Math.max(33, (<number>window.VomnibarRefreshInterval | 0) || 100),
  renderItems: null as never as Render,
  selection: -1,
  timer: 0,
  timer2: 0,
  wheelTime: 0,
  browserVersion: BrowserVer.assumedVer,
  wheelOptions: { passive: false, capture: true as true },
  show (): void {
    const zoom = 1 / window.devicePixelRatio;
    this.bodySt.zoom = zoom > 1 ? zoom + "" : "";
    this.focused || setTimeout(Vomnibar.focus, 34);
    addEventListener("wheel", this.onWheel, this.wheelOptions);
    this.input.value = this.inputText;
    this.OnShown && setTimeout(this.OnShown, 100);
  },
  hide (data?: "hide"): void {
    this.isActive = this.isEditing = this.isInputComposing = this.blurWanted = this.focusByCode = false;
    removeEventListener("wheel", this.onWheel, this.wheelOptions);
    this.timer > 0 && clearTimeout(this.timer);
    window.onkeyup = null as never;
    const el = this.input;
    el.blur();
    data || VPort.postMessage({ handler: "nextFrame", type: Frames.NextType.current, key: this.lastKey });
    this.bodySt.cssText = "display: none;";
    this.list.textContent = el.value = "";
    this.list.style.height = "";
    this.barCls.remove("empty");
    this.list.classList.remove("no-favicon");
    if (this.sameOrigin) { return this.onHidden(); }
    this.timer2 = requestAnimationFrame(this.AfterHide);
    this.timer = setTimeout(this.AfterHide, 25);
  },
  AfterHide (this: void): void {
    const a = Vomnibar;
    cancelAnimationFrame(a.timer2);
    clearTimeout(a.timer);
    a.timer = a.timer2 = 0;
    return a.onHidden();
  },
  onHidden (): void {
    VPort.postToOwner({ name: "hide" });
    this.timer = this.height = this.matchType = 0;
    this.lastKey = VKeyCodes.None;
    this.completions = this.onUpdate = this.isHttps = null as never;
    this.mode.query = this.lastQuery = this.inputText = this.lastNormalInput = "";
    this.modeType = this.mode.type = "omni";
    this.doEnter && setTimeout(this.doEnter, 0);
    this.doEnter = null;
    (<RegExpOne> /a?/).test("");
  },
  reset (input: string, start?: number, end?: number): void {
    this.inputText = input;
    this.useInput = false;
    this.mode.query = this.lastQuery = input && input.trim().replace(this._spacesRe, " ");
    // also clear @timer
    this.update(0, (start as number) <= (end as number) ? function(this: typeof Vomnibar): void {
      this.show();
      this.input.setSelectionRange(start as number, end as number);
    } : this.show);
    this.isActive ? (this.height = -1) : (this.isActive = true);
    if (this.init) { return this.init(); }
  },
  focus (this: void, focus?: false | TimerType.fake): void {
    const a = Vomnibar;
    a.focusByCode = true;
    if (focus !== false) {
      a.input.focus();
    } else {
      VPort.postMessage({ handler: "nextFrame", type: Frames.NextType.current, key: a.lastKey });
    }
  },
  update (updateDelay: number, callback?: () => void): void {
    this.onUpdate = callback || null;
    if (updateDelay >= 0) {
      this.isInputComposing = false;
      if (this.timer > 0) {
        clearTimeout(this.timer);
      }
      if (updateDelay === 0) {
        return this.fetch();
      }
    } else if (this.timer > 0) {
      return;
    } else {
      updateDelay = this.refreshInterval;
    }
    this.timer = setTimeout(this.OnTimer, updateDelay);
  },
  refresh (): void {
    let oldSel = this.selection, origin = this.isSelOriginal;
    this.useInput = false;
    this.setWidth();
    return this.update(17, function(this: typeof Vomnibar): void {
      const len = this.completions.length;
      if (!origin && oldSel >= 0 && len > 0) {
        oldSel = Math.min(oldSel, len - 1);
        this.selection = 0; this.isSelOriginal = false;
        this.updateSelection(oldSel);
      }
      this.focused || this.focus();
    });
  },
  updateInput (sel: number): void {
    const focused = this.focused, blurred = this.blurWanted;
    this.isSelOriginal = false;
    if (sel === -1) {
      this.isHttps = null; this.isEditing = false;
      this.input.value = this.inputText;
      if (!focused) { this.focus(); this.blurWanted = blurred; }
      return;
    }
    blurred && focused && this.input.blur();
    const line: SuggestionEx = this.completions[sel] as SuggestionEx;
    if (line.parsed) {
      return this._updateInput(line, line.parsed);
    }
    (line as Partial<SuggestionEx>).https == null && (line.https = line.url.startsWith("https://"));
    if (line.type !== "history" && line.type !== "tab") {
      if (line.parsed == null) {
        VUtils.ensureText(line);
        line.parsed = "";
      }
      this._updateInput(line, line.text);
      if (line.type === "math") {
        this.input.select();
      }
      return;
    }
    const onlyUrl = !line.text;
    const ind = VUtils.ensureText(line);
    let str = line.text;
    if (!onlyUrl && ind && str.lastIndexOf("://", 5) < 0) {
      str = (ind === 7 ? "http://" : "https://") + str;
    }
    if (onlyUrl || str === VUtils.decodeURL(line.url, decodeURIComponent)) {
      str = line.url;
    }
    return VPort.postMessage({
      handler: "parseSearchUrl",
      id: sel,
      url: str
    });
  },
  parsed ({ id, search }: BgVomnibarReq["parsed"]): void {
    const line: SuggestionEx = this.completions[id] as SuggestionEx;
    line.parsed = search ? (this.modeType !== "omni" ? ":o " : "") + search.keyword + " " + search.url : line.text;
    if (id === this.selection) {
      return this._updateInput(line, line.parsed);
    }
  },
  toggleInput (): void {
    if (this.selection < 0) { return; }
    if (this.isSelOriginal) {
      this.inputText = this.input.value;
      return this.updateInput(this.selection);
    }
    let line = this.completions[this.selection] as SuggestionEx, str = this.input.value.trim();
    str = str === line.url ? (line.parsed || line.text)
      : str === line.text ? line.url : line.text;
    return this._updateInput(line, str);
  },
  _updateInput (line: SuggestionEx, str: string): void {
    var maxW = str.length * 10, tooLong = maxW > innerWidth - PixelData.AllHNotInput;
    this.input.value = str;
    tooLong && (this.input.scrollLeft = maxW);
    this.isHttps = line.https && str === line.text;
    this.isEditing = str !== line.parsed || line.parsed === line.text;
  },
  updateSelection (sel: number): void {
    if (this.timer) { return; }
    const _ref = this.list.children, old = this.selection;
    (this.isSelOriginal || old < 0) && (this.inputText = this.input.value);
    this.updateInput(sel);
    this.selection = sel;
    old >= 0 && _ref[old].classList.remove("s");
    sel >= 0 && _ref[sel].classList.add("s");
  },
  ctrlMap: {
    32: AllowedActions.toggle, 66: AllowedActions.pageup
    , 74: AllowedActions.down, 75: AllowedActions.up, 78: AllowedActions.down, 80: AllowedActions.up
    , 219: AllowedActions.dismiss, 221: AllowedActions.toggle
  } as Readonly<Dict<AllowedActions>>,
  normalMap: {
    9: AllowedActions.down, 27: AllowedActions.dismiss
    , 33: AllowedActions.pageup, 34: AllowedActions.pagedown, 38: AllowedActions.up, 40: AllowedActions.down
    , 112: AllowedActions.backspace, 113: AllowedActions.blur
  } as Readonly<Dict<AllowedActions>>,
  onKeydown (event: KeyboardEvent): any {
    if (!this.isActive) { return; }
    let action: AllowedActions = AllowedActions.nothing, n = event.keyCode, focused = this.focused;
    this.lastKey = n;
    if (event.altKey || event.metaKey) {
      if (event.ctrlKey || event.shiftKey) {}
      else if (n === VKeyCodes.f2) {
        return this.onAction(focused ? AllowedActions.blurInput : AllowedActions.focus);
      }
      else if (!focused) {}
      else if (n > VKeyCodes.A && n < VKeyCodes.G && n !== VKeyCodes.C || n === VKeyCodes.backspace) {
        return this.onBashAction(n - VKeyCodes.maxNotAlphabet);
      }
      if (event.altKey) { this.keyResult = HandlerResult.Nothing; return; }
    }
    if (n === VKeyCodes.enter) {
      window.onkeyup = this.OnEnterUp;
      return;
    }
    else if (event.ctrlKey || event.metaKey) {
      if (event.shiftKey) { action = n === VKeyCodes.F ? AllowedActions.pagedown : n === VKeyCodes.B ? AllowedActions.pageup : AllowedActions.nothing; }
      else if (n === VKeyCodes.up || n === VKeyCodes.down || n === VKeyCodes.end || n === VKeyCodes.home) {
        event.preventDefault();
        this.lastScrolling = Date.now();
        window.onkeyup = Vomnibar.HandleKeydown;
        return VPort.postToOwner({ name: "scroll", keyCode: n });
      }
      else { action = event.code === "BracketLeft" ? AllowedActions.dismiss : event.code === "BracketRight" ? AllowedActions.toggle
                      : this.ctrlMap[n] || AllowedActions.nothing; }
    }
    else if (event.shiftKey) {
      action = n === VKeyCodes.up ? AllowedActions.pageup : n === VKeyCodes.down ? AllowedActions.pagedown : n === VKeyCodes.tab ? AllowedActions.up : AllowedActions.nothing;
    }
    else if (action = this.normalMap[n] || AllowedActions.nothing) {}
    else if (n === VKeyCodes.ime || n > VKeyCodes.f1 && n < VKeyCodes.minNotFn) {
      this.keyResult = HandlerResult.Nothing;
      return;
    }
    else if (n === VKeyCodes.backspace) {
      if (focused) { this.keyResult = HandlerResult.Suppress; }
      return;
    }
    else if (n !== VKeyCodes.space) {}
    else if (!focused) { action = AllowedActions.focus; }
    else if ((this.selection >= 0
        || this.completions.length <= 1) && this.input.value.endsWith("  ")) {
      action = AllowedActions.enter;
    }
    if (action) {
      return this.onAction(action);
    }

    if (!focused && n < VKeyCodes.minNotNum && n > VKeyCodes.maxNotNum) {
      n = (n - VKeyCodes.N0) || 10;
      return !event.shiftKey && n <= this.completions.length ? this.onEnter(event, n - 1) : undefined;
    }
    this.keyResult = focused && n !== VKeyCodes.menuKey ? HandlerResult.Suppress : HandlerResult.Nothing;
  },
  onAction (action: AllowedActions): void {
    let sel: number;
    switch(action) {
    case AllowedActions.dismiss:
      const selection = window.getSelection();
      if (selection.type === "Range" && this.focused) {
        const el = this.input;
        sel = el.selectionDirection !== "backward" &&
          el.selectionEnd < el.value.length ? el.selectionStart : el.selectionEnd;
        el.setSelectionRange(sel, sel);
      } else {
        return this.hide();
      }
      break;
    case AllowedActions.focus: this.focus(); break;
    case AllowedActions.blurInput: this.blurWanted = true; this.input.blur(); break;
    case AllowedActions.backspace: case AllowedActions.blur:
      !this.focused ? this.focus()
      : action === AllowedActions.blur ? this.focus(false)
      : document.execCommand("delete");
      break;
    case AllowedActions.up: case AllowedActions.down:
      sel = this.completions.length + 1;
      sel = (sel + this.selection + (action - AllowedActions.up)) % sel - 1;
      return this.updateSelection(sel);
    case AllowedActions.toggle: return this.toggleInput();
    case AllowedActions.pageup: case AllowedActions.pagedown: return this.goPage(action !== AllowedActions.pageup);
    case AllowedActions.enter: return this.onEnter(true);
    }
  },
  onBashAction (code: number): void | boolean {
    const sel = window.getSelection(), isExtend = code === 4 || code < 0;
    sel.modify(isExtend ? "extend" : "move", code < 4 ? "backward" : "forward", "word");
    if (isExtend && this.input.selectionStart < this.input.selectionEnd) {
      return document.execCommand("delete");
    }
  },
  _pageNumRe: <RegExpOne> /(?:^|\s)(\+\d{0,2})$/,
  goPage (dirOrNum: boolean | number): void {
    const len = this.completions.length, n = this.mode.maxResults;
    let str = len ? this.completions[0].type : "", sel = +dirOrNum || -1;
    if (this.isSearchOnTop) { return; }
    str = (this.isSelOriginal || this.selection < 0 ? this.input.value : this.inputText).trimRight();
    let arr = this._pageNumRe.exec(str), i = ((arr && arr[0]) as string | undefined | number as number) | 0;
    if (len >= n) { sel *= n; }
    else if (i > 0 && sel < 0) { sel *= i >= n ? n : 1; }
    else if (len < (len && this.completions[0].type !== "tab" ? n : 3)) { return; }

    sel += i;
    sel = sel < 0 ? 0 : sel > 90 ? 90 : sel;
    if (sel == i) { return; }
    if (arr) { str = str.substring(0, str.length - arr[0].length); }
    str = str.trimRight();
    i = Math.min(this.input.selectionEnd, str.length);
    if (sel > 0) { str += " +" + sel; }
    sel = this.input.selectionStart;
    const oldDi = this.input.selectionDirection;
    this.input.value = str;
    this.input.setSelectionRange(sel, i, oldDi);
    this.isInputComposing = false;
    return this.update(-1);
  },
  onEnter (event?: MouseEvent | KeyboardEvent | true, newSel?: number): void {
    let sel = newSel != null ? newSel : this.selection;
    this.actionType = event == null ? this.actionType
      : event === true ? this.forceNewTab ? ReuseType.newFg : ReuseType.current
      : event.ctrlKey || event.metaKey ? event.shiftKey ? ReuseType.newBg : ReuseType.newFg
      : event.shiftKey || !this.forceNewTab ? ReuseType.current : ReuseType.newFg;
    if (newSel != null) {}
    else if (sel === -1 && this.input.value.length === 0) { return; }
    else if (!this.timer) {}
    else if (this.isEditing) { sel = -1; }
    else if (this.timer > 0) {
      return this.update(0, this.onEnter);
    } else {
      this.onUpdate = this.onEnter;
      return;
    }
    interface UrlInfo { url: string; sessionId?: undefined }
    const item: SuggestionE | UrlInfo = sel >= 0 ? this.completions[sel] : { url: this.input.value.trim() },
    func = function(this: void): void {
      return item.sessionId != null ? Vomnibar.gotoSession(item as SuggestionE & { sessionId: string | number })
        : Vomnibar.navigateToUrl(item as UrlInfo);
    };
    if (this.actionType < ReuseType.newFg) { return func(); }
    this.doEnter = func;
    return this.hide();
  },
  OnEnterUp (this: void, event: KeyboardEvent): void {
    if (event.isTrusted != false && event instanceof KeyboardEvent && event.keyCode === VKeyCodes.enter) {
      Vomnibar.lastKey = VKeyCodes.None;
      window.onkeyup = null as never;
      return Vomnibar.onEnter(event);
    }
  },
  onClick (event: MouseEvent): void {
    let el: Node | null = event.target as Node;
    if (event.isTrusted == false || !(event instanceof MouseEvent) || el === this.input || window.getSelection().type === "Range") { return; }
    if (el === this.input.parentElement) { return this.focus(); }
    if (this.timer) { event.preventDefault(); return; }
    while (el && el.parentNode !== this.list) { el = el.parentNode; }
    if (!el) { return; }
    this.lastKey = VKeyCodes.None;
    return this.onEnter(event, [].indexOf.call(this.list.children, el));
  },
  OnMenu (this: void, event: Event): void {
    let el = event.target as Element | null, item: Element | null;
    for (; el && !el.classList.contains("url"); el = el.parentElement) {}
    if (!el || (el as HTMLAnchorElement).href) { return; }
    for (item = el; item && item.parentElement !== Vomnibar.list; item = item.parentElement) {}
    const _i = [].indexOf.call(Vomnibar.list.children, item);
    _i >= 0 && ((el as HTMLAnchorElement).href = Vomnibar.completions[_i].url);
  },
  OnSelect (this: HTMLInputElement): void {
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
  OnFocus (this: void, event: Event): void {
    event.isTrusted != false && (Vomnibar.focused = event.type !== "blur") && (Vomnibar.blurWanted = false);
  },
  OnTimer (this: void): void { if (Vomnibar) { return Vomnibar.fetch(); } },
  onWheel (event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey || event.isTrusted == false) { return; }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.deltaX || Date.now() - this.wheelTime < this.wheelInterval || !Vomnibar.isActive) { return; }
    this.wheelTime = Date.now();
    return this.goPage(event.deltaY > 0);
  },
  onInput (event: KeyboardEvent): void {
    const s0 = this.lastQuery, s1 = this.input.value, str = s1.trim();
    this.blurWanted = false;
    if (str === (this.selection === -1 || this.isSelOriginal ? s0 : this.completions[this.selection].text)) {
      return;
    }
    if (this.matchType === CompletersNS.MatchType.emptyResult && str.startsWith(s0)) { return; }
    if (!str) { this.isHttps = null; }
    let i = this.input.selectionStart, arr: RegExpExecArray | null;
    if (this.isSearchOnTop) {}
    else if (i > s1.length - 2) {
      if (s1.endsWith(" +") && !this.timer && str.substring(0, str.length - 2).trimRight() === s0) {
        return;
      }
    } else if ((arr = this._pageNumRe.exec(s0)) && str.endsWith(arr[0])) {
      const j = arr[0].length, s2 = s1.substring(0, s1.trimRight().length - j);
      if (s2.trim() !== s0.substring(0, s0.length - j).trimRight()) {
        this.input.value = s2.trimRight();
        this.input.setSelectionRange(i, i);
      }
    }
    const { isComposing } = event;
    if (isComposing != null) {
      if (isComposing && !this.isInputComposing) {
        this.lastNormalInput = this.input.value.trim();
      }
      this.isInputComposing = isComposing;
    }
    return this.update(-1);
  },
  omni (response: BgVomnibarReq["omni"]): void {
    if (!this.isActive) { return; }
    const list = response.list, oldHeight = this.height, height = list.length, notEmpty = height > 0;
    this.showFavIcon = response.favIcon;
    this.matchType = response.matchType;
    this.completions = list;
    this.selection = (response.autoSelect || this.modeType !== "omni") && notEmpty ?  0 : -1;
    this.isSelOriginal = true;
    this.isSearchOnTop = notEmpty && list[0].type === "search";
    this.height = Math.ceil(notEmpty ? height * PixelData.Item + PixelData.OthersIfNotEmpty : PixelData.OthersIfEmpty);
    return this.populateUI(oldHeight);
  },
  populateUI (oldH: number): void {
    const { list, height } = this, notEmpty = this.completions.length > 0, msg = { name: "style" as "style", height };
    if (height > oldH || this.sameOrigin) { VPort.postToOwner(msg); }
    this.completions.forEach(this.parse, this);
    list.innerHTML = this.renderItems(this.completions);
    oldH || (this.bodySt.display = "");
    let cl = this.barCls, c = "empty";
    notEmpty ? cl.remove(c) : cl.add(c);
    cl = list.classList, c = "no-favicon";
    this.showFavIcon ? cl.remove(c) :cl.add(c);
    if (notEmpty) {
      if (this.selection === 0) {
        (list.firstElementChild as HTMLElement).classList.add("s");
      }
      (list.lastElementChild as HTMLElement).classList.add("b");
    }
    if (height >= oldH || this.sameOrigin) {
      return this.postUpdate();
    } else {
      requestAnimationFrame(() => { VPort.postToOwner(msg); return Vomnibar.postUpdate(); });
    }
  },
  postUpdate (): void {
    let func: typeof Vomnibar.onUpdate;
    if (this.timer > 0) { return; }
    this.timer = 0;
    this.isEditing = false;
    if (func = this.onUpdate) {
      this.onUpdate = null;
      return func.call(this);
    }
  },
  OnShown: function (this: void): void {
    const a = Vomnibar, i = a.input;
    i.onselect = a.OnSelect;
    i.onfocus = i.onblur = a.OnFocus;
    a.OnShown = null;
    const listen = addEventListener, wndFocus = Vomnibar.OnWndFocus;
    listen("focus", wndFocus);
    listen("blur", wndFocus);
    return a.blurred();
  } as ((this: void) => void) | null,
  _focusTimer: 0,
  OnWndFocus (this: void, event: Event): void {
    const a = Vomnibar, byCode = a.focusByCode;
    a.focusByCode = false;
    if (!a.isActive || event.target !== window || event.isTrusted == false) { return; }
    const blurred = event.type === "blur";
    if (blurred) {
      const t = a._focusTimer;
      t && clearTimeout(t);
      a._focusTimer = 0;
    }
    if (byCode) {
      a.blurred(blurred);
    } else if (blurred) {
      VPort.postMessage({ handler: "blurTest" });
    } else {
      a._focusTimer = setTimeout(a.blurred, 50, false);
      VPort && VPort.postMessage({ handler: "blank" });
    }
  },
  blurred (this: void, blurred?: boolean | object): void {
    const a = (document.body as HTMLBodyElement).classList;
    (typeof blurred === "boolean" ? !blurred : document.hasFocus()) ? a.remove("transparent") : a.add("transparent");
  },
  init (): void {
    window.onclick = function(e) { return Vomnibar.onClick(e); };
    this.onWheel = this.onWheel.bind(this);
    Object.setPrototypeOf(this.ctrlMap, null);
    Object.setPrototypeOf(this.normalMap, null);
    this.input = document.getElementById("input") as HTMLInputElement;
    const list = this.list = document.getElementById("list") as HTMLDivElement;
    this.input.oninput = this.onInput.bind(this);
    this.bodySt = (document.documentElement as HTMLHtmlElement).style;
    this.barCls = (this.input.parentElement as HTMLElement).classList;
    list.oncontextmenu = this.OnMenu;
    (document.getElementById("close") as HTMLElement).onclick = function(): void { return Vomnibar.hide(); };
    addEventListener("keydown", this.HandleKeydown, true);
    this.renderItems = VUtils.makeListRenderer((document.getElementById("template") as HTMLElement).innerHTML);
    if (this.browserVersion < BrowserVer.MinRoundedBorderWidth) {
      const css = document.createElement("style");
      css.textContent = `.item, #input { border-width: ${this.browserVersion < BrowserVer.MinEnsuredBorderWidth ? 1 : 0.01}px; }`;
      (document.head as HTMLHeadElement).appendChild(css);
    }
    if (this.browserVersion < BrowserVer.Min$KeyboardEvent$$isComposing) {
      let func = function (this: void, event: CompositionEvent): void {
        if (Vomnibar.isInputComposing = event.type === "compositionstart") {
          Vomnibar.lastNormalInput = Vomnibar.input.value.trim();
        }
      };
      this.input.addEventListener("compositionstart", func);
      this.input.addEventListener("compositionend", func);
    }
    this.init = VUtils.makeListRenderer = null as never;
  },
  setFav (type: VomnibarNS.PageType): void {
    let fav: 0 | 1 | 2 = 0, f: () => chrome.runtime.Manifest, manifest: chrome.runtime.Manifest
      , canShowOnOthers = this.browserVersion >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon;
    if (type === VomnibarNS.PageType.inner) {
      fav = canShowOnOthers || this.sameOrigin ? 2 : 0;
    } else if (type === VomnibarNS.PageType.ext && (canShowOnOthers || this.sameOrigin) && (f = chrome.runtime.getManifest) && (manifest = f())) {
      const arr = manifest.permissions || [];
      fav = arr.indexOf("<all_urls>") >= 0 || arr.indexOf("chrome://favicon/") >= 0 ? this.sameOrigin ? 2 : 1 : 0;
    }
    this.mode.favIcon = fav;
  },
  HandleKeydown (this: void, event: KeyboardEvent): void {
    if (event.isTrusted == false || !(event instanceof KeyboardEvent)) { return; }
    Vomnibar.keyResult = HandlerResult.Prevent as HandlerResult;
    if (window.onkeyup) {
      let stop = !event.repeat, now: number = 0;
      if (!Vomnibar.lastScrolling) {
        stop = event.keyCode > VKeyCodes.ctrlKey || event.keyCode < VKeyCodes.shiftKey;
      } else if (stop || (now = Date.now()) - Vomnibar.lastScrolling > 40) {
        VPort.postToOwner({ name: stop ? "scrollEnd" : "scrollGoing" });
        Vomnibar.lastScrolling = now;
      }
      if (stop) { window.onkeyup = null as never; }
    } else {
      Vomnibar.onKeydown(event);
    }
    if (Vomnibar.keyResult === HandlerResult.Nothing) { return; }
    if (Vomnibar.keyResult === HandlerResult.Prevent) { event.preventDefault(); }
    event.stopImmediatePropagation();
  },
  returnFocus (this: void, request: BgVomnibarReq["returnFocus"]): void {
    setTimeout<VomnibarNS.FReq["focus"] & VomnibarNS.Msg<"focus">>(VPort.postToOwner as
        any, 0, { name: "focus", key: request.key });
  },
  setWidth (w?: number): void {
    w || (w = window.innerWidth - PixelData.MarginH);
    this.mode.maxChars = Math.round((w - PixelData.AllHNotUrl) / PixelData.MeanWidthOfChar);
    if (this.browserVersion < BrowserVer.MinSeparateExtIframeHasCorrectWidthIfDeviceRationNot1 && devicePixelRatio !== 1) {
      (document.documentElement as HTMLHtmlElement).style.width = w + PixelData.MarginH + "px";
    }
  },
  secret: null as never as (request: BgVomnibarReq["secret"]) => void,

  maxResults: (<number>window.VomnibarListLength | 0) || 10,
  mode: {
    handler: "omni" as "omni",
    type: "omni" as CompletersNS.ValidTypes,
    maxChars: 0,
    maxResults: 0,
    favIcon: 1 as 0 | 1 | 2,
    query: ""
  },
  _spacesRe: <RegExpG> /\s+/g,
  _singleQuoteRe: <RegExpG> /'/g,
  fetch (): void {
    let mode = this.mode, str: string, last: string, newMatchType = CompletersNS.MatchType.Default;
    this.timer = -1;
    if (this.useInput) {
      this.lastQuery = str = this.input.value.trim();
      if (!this.isInputComposing) {}
      else if (str.startsWith(last = this.lastNormalInput)) {
        str = last + str.substring(last.length).replace(this._singleQuoteRe, "");
      } else {
        str = str.replace(this._singleQuoteRe, " ");
      }
      str = str.replace(this._spacesRe, " ");
      if (str === mode.query) { return this.postUpdate(); }
      mode.type = this.matchType < CompletersNS.MatchType.singleMatch || !str.startsWith(mode.query) ? this.modeType
        : this.matchType === CompletersNS.MatchType.searchWanted ? "search"
        : (newMatchType = this.matchType, this.completions[0].type as CompletersNS.ValidTypes);
      mode.query = str;
      this.setWidth();
      this.matchType = newMatchType;
    } else {
      this.useInput = true;
    }
    return VPort.postMessage(mode);
  },

  favPrefix: "",
  parse (item: SuggestionE): void {
    let str: string | undefined;
    item.relevancy = this.showRelevancy ? `\n\t\t\t<span class="relevancy">${item.relevancy}</span>` : "";
    (str = item.index) && (item.index = ` <span class="index">${str}</span>`);
    item.favIcon = (str = this.showFavIcon ? item.url : "") && this.favPrefix +
        ((str = this.parseFavIcon(item, str)) ? VUtils.escapeCSSStringInAttr(str) : "about:blank") + "&quot;)";
    if (this.browserVersion < BrowserVer.MinSVG$Path$Has$d$CSSAttribute) {
      item.Ty = item.type[0].toUpperCase();
    }
  },
  parseFavIcon (item: SuggestionE, url: string): string {
    let str = url.substring(0, 11).toLowerCase();
    return str.startsWith("vimium://") ? "chrome-extension://" + (window.ExtId || chrome.runtime.id) + "/pages/options.html"
      : url.length > 512 || str === "javascript:" || str.startsWith("data:") ? ""
      : item.type === "search"
        ? url.startsWith("http") ? url.substring(0, (url.indexOf("/", url[4] === "s" ? 8 : 7) + 1) || url.length) : ""
      : url;
  },
  navigateToUrl (item: { url: string }): void {
    if (item.url.substring(0, 11).toLowerCase() === "javascript:") {
      VPort.postToOwner({ name: "evalJS", url: item.url });
      return;
    }
    return VPort.postMessage({
      handler: "openUrl",
      reuse: this.actionType,
      https: this.isHttps,
      url: item.url
    });
  },
  gotoSession (item: SuggestionE & { sessionId: string | number }): void {
    VPort.postMessage({
      handler: "gotoSession",
      active: this.actionType > ReuseType.newBg,
      sessionId: item.sessionId
    });
    if (this.actionType > ReuseType.newBg) { return; }
    window.getSelection().removeAllRanges();
    if (item.type !== "tab") {
      return this.refresh();
    }
    window.onfocus = function(e: Event): void {
      window.onfocus = null as never;
      if (e.isTrusted != false && VPort.port) { return Vomnibar.refresh(); }
    };
  }
},
VUtils = {
  makeListRenderer (this: void, template: string): Render {
    const a = template.split(/\{\{(\w+)}}/g);
    (<RegExpOne> /a?/).test("");
    return function(objectArray): string {
      let html = "", len = a.length;
      for (const o of objectArray) {
        for (let j = 0; j < len; j++) {
          html += (j & 1) ? o[a[j] as keyof SuggestionE] || "" : a[j];
        }
      }
      return html;
    };
  },
  decodeURL (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try {
      url = (decode || decodeURI)(url);
    } catch (e) {}
    return url;
  },
  ensureText (sug: SuggestionEx): ProtocolType {
    let url = sug.url, str = url.substring(0, 8).toLowerCase();
    let i = str.startsWith("http://") ? ProtocolType.http : str === "https://" ? ProtocolType.https : ProtocolType.others;
    i >= url.length && (i = ProtocolType.others);
    if (!sug.text) {
      sug.text = i ? url.substring(i) : url;
    } else if (i && url.endsWith("/") && !str.endsWith("/")) {
      sug.text += "/";
    }
    return i;
  },
  escapeCSSStringInAttr (s: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === KnownKey.and ? "&amp;" : i === KnownKey.quote1 ? "&apos;"
        : i < KnownKey.quote1 ? "\\&quot;" : i === KnownKey.lt ? "&lt;" : "&gt;";
    }
    this.escapeCSSStringInAttr = function(s): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return this.escapeCSSStringInAttr(s);
  }
},
VPort = {
  port: null as FgPort | null,
  postToOwner: null as never as VomnibarNS.IframePort["postMessage"],
  postMessage<K extends keyof FgReq> (request: FgReq[K] & Req.baseFg<K>): void {
    try {
      (this.port || this.connect(PortType.omnibarRe)).postMessage<K>(request);
    } catch (e) {
      VPort = null as never;
      this.postToOwner({ name: "broken", active: Vomnibar.isActive });
    }
  },
  Listener<T extends keyof BgVomnibarReq> (this: void, response: Req.bg<T>): void {
    return Vomnibar[response.name](response);
  },
  OnOwnerMessage<K extends keyof VomnibarNS.CReq> ({ data: data }: { data: VomnibarNS.CReq[K] }): void {
    let name = ((data as VomnibarNS.Msg<string>).name || data) as keyof VomnibarNS.CReq | "onAction";
    if (name === "backspace") { return Vomnibar.onAction(AllowedActions.backspace); }
    return (Vomnibar as any)[name](data);
  },
  ClearPort (this: void): void { VPort.port = null; },
  connect (type: PortType): FgPort {
    const data = { name: "vimium++." + type }, port = this.port = (window.ExtId ?
      chrome.runtime.connect(window.ExtId, data) : chrome.runtime.connect(data)) as FgPort;
    port.onDisconnect.addListener(this.ClearPort);
    port.onMessage.addListener(this.Listener as (message: object) => void);
    return port;
  },
  OnUnload (e: Event): void {
    if (!VPort || e.isTrusted == false) { return; }
    Vomnibar.isActive = false;
    Vomnibar.timer > 0 && clearTimeout(Vomnibar.timer);
    VPort.postToOwner({ name: "unload" });
  }
};
"".startsWith || (String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
});
"".endsWith || (String.prototype.endsWith = function(this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
(function(): void {
  const pageVersion = +<string>(document.documentElement as HTMLElement).getAttribute("data-version") || 0;
  if (Math.round(pageVersion * 100) != 164) {
    location.href = "about:blank";
    return;
  }
  let curEl: HTMLScriptElement;
  if (location.pathname.startsWith("/front/") || location.protocol !== "chrome-extension:"
   || !(curEl = document.currentScript as typeof curEl)) {}
  else if (curEl.src.endsWith("/front/vomnibar.js") && curEl.src.startsWith("chrome-extension:")) {
    window.ExtId = new URL(curEl.src).hostname;
  } else {
    curEl.remove();
    window.onmessage = function(event): void {
      if (event.source !== window.parent) { return; }
      const data: VomnibarNS.MessageData = event.data, script = document.createElement("script"),
      src = script.src = (data[1] as VomnibarNS.FgOptions).script;
      window.ExtId = new URL(src).hostname;
      script.onload = function(): void {
        return window.onmessage(event);
      };
      (document.head || document.documentElement as HTMLElement).appendChild(script);
      script.remove();
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
    Vomnibar.sameOrigin = !!port.sameOrigin;
    VPort.postToOwner = port.postMessage.bind(port);
    port.onmessage = VPort.OnOwnerMessage;
    window.onunload = VPort.OnUnload;
    if (options) {
      return Vomnibar.activate(options);
    } else {
      port.postMessage({ name: "uiComponentIsReady" });
    }
  },
  timer = setTimeout(function() { window.location.href = "about:blank"; }, 700);
  Vomnibar.secret = function(this: typeof Vomnibar, request): void {
    this.secret = function() {};
    Vomnibar.browserVersion = request.browserVersion;
    const { secret } = request, msgs = unsafeMsg;
    _sec = secret;
    unsafeMsg = null as never;
    for (let i of msgs) {
      if (i[0] == secret) {
        return handler(i[0], i[1], i[2]);
      }
    }
  };
  window.onmessage = function(event): void {
    if (event.source === window.parent) {
      const data: VomnibarNS.MessageData = event.data;
      return handler(data[0], event.ports[0], data[1]);
    }
  };
VPort.connect(PortType.omnibar);
})();
