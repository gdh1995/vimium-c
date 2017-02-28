/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
interface SuggestionE extends Readonly<CompletersNS.BaseSuggestion> {
  favIconUrl?: string;
  relevancy: number | string;
}
interface SuggestionEx extends SuggestionE {
  https: boolean;
  parsed?: string;
}
interface Render {
  (this: void, list: SuggestionE[]): string;
}
interface Port extends chrome.runtime.Port {
  postMessage<K extends keyof FgReq>(request: FgReq[K]): 1;
  postMessage<K extends keyof FgRes>(request: Req.fgWithRes<K>): 1;
}
type Options = VomnibarNS.FgOptions;
type AllowedActions = "dismiss"|"focus"|"blurInput"|"backspace"|"blur"|"up"|"down"|"toggle"|"pageup"|"pagedown"|"enter" | "";

var Vomnibar = {
  activate (options: Options): void {
    if (!this.init && VPort.EnsurePort()) { return; }
    Object.setPrototypeOf(options, null);
    this.mode.type = this.modeType = ((options.mode || "") + "") as CompletersNS.ValidTypes || "omni";
    this.forceNewTab = !!options.force;
    let { url, keyword, search } = options, start: number | undefined;
    this.mode.clientWidth = options.width | 0;
    if (url == null) {
      return this.reset(keyword ? keyword + " " : "");
    }
    if (search = options.search) {
      start = search.start;
      url = search.url;
      keyword || (keyword = search.keyword);
    } else if (search === null) {
      url = VUtils.decodeURL(url).replace(<RegExpG> /\s$/g, "%20");
    } else {
      url = VUtils.decodeURL(url, decodeURIComponent).trim().replace(<RegExpG> /\s+/g, " ");
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
  modeType: "omni" as CompletersNS.ValidTypes,
  useInput: true,
  completions: null as never as SuggestionE[],
  isEditing: false,
  isHttps: false,
  isSearchOnTop: false,
  actionType: ReuseType.Default,
  matchType: CompletersNS.MatchType.Default,
  focused: true,
  forceNewTab: false,
  showFavIcon: false,
  showRelevancy: false,
  lastScrolling: 0,
  height: 0,
  input: null as never as HTMLInputElement,
  isSelectionOrigin: true,
  lastKey: 0,
  keyResult: HandlerResult.Nothing,
  list: null as never as HTMLDivElement,
  onUpdate: null as (() => void) | null,
  doEnter: null as (() => void) | null,
  refreshInterval: 500,
  wheelInterval: 100,
  renderItems: null as never as Render,
  selection: -1,
  timer: 0,
  wheelTimer: 0,
  show (): void {
    const zoom = 1 / window.devicePixelRatio;
    (document.body as HTMLBodyElement).style.zoom = zoom > 1 ? zoom + "" : "";
    this.focused || setTimeout(function() { Vomnibar.input.focus(); }, 50);
    addEventListener("mousewheel", this.onWheel, {passive: false});
    this.input.value = this.inputText;
    setTimeout(function() { Vomnibar.input.onselect = Vomnibar.OnSelect; }, 120);
  },
  hide (data?: "hide"): void {
    this.isActive = this.isEditing = false;
    this.height = this.matchType = 0;
    removeEventListener("mousewheel", this.onWheel, {passive: false});
    window.onkeyup = null as never;
    this.input.onselect = null as never;
    this.completions = this.onUpdate = null as never;
    this.mode.query = this.lastQuery = this.inputText = "";
    this.modeType = this.mode.type = "omni";
    if (data === "hide") { return this.onHidden(); }
    this.timer > 0 && clearTimeout(this.timer);
    this.timer = setTimeout(this.onHidden.bind(this), 100);
    VPort.postToOwner({name: "hide", waitFrame: this.doEnter ? 1 : 0});
  },
  onHidden (): void {
    clearTimeout(this.timer);
    VPort.postMessage({ handler: "refocusCurrent", lastKey: this.lastKey });
    this.doEnter && setTimeout(this.doEnter, 0);
    this.input.blur();
    this.input.value = "";
    this.list.textContent = "";
    this.list.classList.remove("withList");
    this.timer = this.lastKey = 0;
    (<RegExpOne> /a?/).test("");
  },
  reset (input: string, start?: number, end?: number): void {
    this.inputText = input || (input = "");
    this.useInput = false;
    this.mode.query = this.lastQuery = input.trim().replace(this._spacesRe, " ");
    // also clear @timer
    this.update(0, input && (start as number) <= (end as number) ? function(this: typeof Vomnibar): void {
      this.show();
      this.input.setSelectionRange(start as number, end as number);
    } : this.show);
    this.isActive && (this.height = -1);
    this.isActive = true;
    if (this.init) { return this.init(); }
  },
  update (updateDelay?: number, callback?: () => void): void {
    this.onUpdate = callback || null;
    if (typeof updateDelay === "number") {
      if (this.timer > 0) {
        clearTimeout(this.timer);
      }
      if (updateDelay <= 0) {
        return this.filter();
      }
    } else if (this.timer > 0) {
      return;
    } else {
      updateDelay = this.refreshInterval;
    }
    this.timer = setTimeout(this.OnTimer, updateDelay);
  },
  refresh (): void {
    let oldSel = this.selection, origin = this.isSelectionOrigin;
    this.useInput = false;
    this.mode.clientWidth = window.innerWidth;
    return this.update(17, function(this: typeof Vomnibar): void {
      const len = this.completions.length;
      if (!origin && oldSel >= 0 && len > 0) {
        oldSel = Math.min(oldSel, len - 1);
        this.selection = 0; this.isSelectionOrigin = false;
        this.updateSelection(oldSel);
      }
      this.focused || this.input.focus();
    });
  },
  updateInput (sel: number): void {
    const focused = this.focused;
    this.isSelectionOrigin = false;
    if (sel === -1) {
      this.isHttps = this.isEditing = false;
      this.input.value = this.inputText;
      if (!focused) { this.input.focus(); this.focused = false; }
      return;
    }
    focused || this.input.blur();
    const line: SuggestionEx = this.completions[sel] as SuggestionEx;
    let str = line.text;
    (line as Partial<SuggestionEx>).https == null && (line.https = line.url.startsWith("https://"));
    if (line.type !== "history" && line.type !== "tab") {
      this._updateInput(line, str);
      if (line.type === "math") {
        this.input.select();
      }
      return;
    }
    if (line.parsed) {
      return this._updateInput(line, line.parsed);
    }
    if (line.url.toLowerCase().startsWith("http") && str.lastIndexOf("://", 5) < 0) {
      str = (line.url[5] === ':' ? "http://" : "https://") + str;
    }
    return VPort.sendMessage({
      handler: "parseSearchUrl",
      url: str
    }, function(search): void {
      line.parsed = search ? search.keyword + " " + search.url : line.text;
      if (sel === Vomnibar.selection) {
        return Vomnibar._updateInput(line, line.parsed);
      }
    });
  },
  toggleInput (): void {
    if (this.selection < 0) { return; }
    if (this.isSelectionOrigin) {
      this.inputText = this.input.value;
      return this.updateInput(this.selection);
    }
    let line = this.completions[this.selection] as SuggestionEx, str = this.input.value.trim();
    str = str === line.url ? (line.parsed || line.text)
      : str === line.text ? line.url : line.text;
    return this._updateInput(line, str);
  },
  _updateInput (line: SuggestionEx, str: string): void {
    this.input.value = str;
    this.isHttps = line.https && str === line.text;
    this.isEditing = str !== line.parsed || line.parsed === line.text;
  },
  updateSelection (sel: number): void {
    if (this.timer) { return; }
    const _ref = this.list.children, old = this.selection;
    (this.isSelectionOrigin || old < 0) && (this.inputText = this.input.value);
    this.updateInput(sel);
    this.selection = sel;
    old >= 0 && _ref[old].classList.remove("s");
    sel >= 0 && _ref[sel].classList.add("s");
  },
  ctrlMap: {
    "66": "pageup", "74": "down", "75": "up", "219": "dismiss", "221": "toggle"
    , "78": "down", "80": "up"
  } as Dict<AllowedActions>,
  normalMap: {
    "9": "down", "27": "dismiss", "33": "pageup", "34": "pagedown", "38": "up", "40": "down"
    , "112": "backspace", "113": "blur"
  } as Dict<AllowedActions>,
  onKeydown (event: KeyboardEvent): any {
    if (!this.isActive) { return; }
    let action: AllowedActions = "", n = event.keyCode, focused = this.focused;
    this.lastKey = n;
    if (event.altKey || event.metaKey) {
      if (event.ctrlKey || event.shiftKey) {}
      else if (n === VKeyCodes.f2) {
        return this.onAction(focused ? "blurInput" : "focus");
      }
      else if (!focused) {}
      else if (n >= VKeyCodes.B && n <= VKeyCodes.F && n !== VKeyCodes.C || n === VKeyCodes.backspace) {
        return this.onBashAction(n - VKeyCodes.maxNotAlphabet);
      }
      if (event.altKey) { this.keyResult = HandlerResult.Nothing; return; }
    }
    if (n === VKeyCodes.enter) {
      window.onkeyup = this.OnEnterUp;
      return;
    }
    else if (event.ctrlKey || event.metaKey) {
      if (event.shiftKey) { action = n === VKeyCodes.F ? "pagedown" : n === VKeyCodes.B ? "pageup" : ""; }
      else if (n === VKeyCodes.up || n === VKeyCodes.down) {
        this.lastScrolling = Date.now();
        window.onkeyup = Vomnibar.HandleKeydown;
        return VPort.postToOwner<"scrollBy">({ name: "scrollBy", amount: n - VKeyCodes.right as -1 | 1 });
      }
      else { action = this.ctrlMap[n] || ""; }
    }
    else if (event.shiftKey) {
      action = n === VKeyCodes.up ? "pageup" : n === VKeyCodes.down ? "pagedown" : n === VKeyCodes.tab ? "up" : "";
    }
    else if (action = this.normalMap[n] || "") {}
    else if (n === VKeyCodes.ime) { this.keyResult = HandlerResult.Nothing; return; }
    else if (n === VKeyCodes.backspace) {
      if (focused) { this.keyResult = HandlerResult.Suppress; }
      return;
    }
    else if (n !== VKeyCodes.space) {}
    else if (!focused) { action = "focus"; }
    else if ((this.selection >= 0
        || this.completions.length <= 1) && this.input.value.endsWith("  ")) {
      action = "enter";
    }
    if (action) {
      return this.onAction(action);
    }

    if (n <= VKeyCodes.space) {}
    else if (n > VKeyCodes.f1 && n <= VKeyCodes.f12) { focused = false; }
    else if (!focused && n >= VKeyCodes.N0 && n < VKeyCodes.minNotNumber) {
      n = (n - VKeyCodes.N0) || 10;
      return !event.shiftKey && n <= this.completions.length ? this.onEnter(event, n - 1) : undefined;
    }
    this.keyResult = focused && n !== VKeyCodes.menuKey ? HandlerResult.Suppress : HandlerResult.Nothing;
  },
  onAction (action: AllowedActions): void {
    let sel: number;
    switch(action) {
    case "dismiss":
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
    case "focus": this.input.focus(); break;
    case "blurInput": this.input.blur(); break;
    case "backspace": case "blur":
      !this.focused ? this.input.focus()
      : action === "blur" ? VPort.postMessage({ handler: "refocusCurrent", lastKey: this.lastKey })
      : document.execCommand("delete");
      break;
    case "up": case "down":
      sel = this.completions.length + 1;
      sel = (sel + this.selection + (action === "up" ? 0 : 2)) % sel - 1;
      return this.updateSelection(sel);
    case "toggle": return this.toggleInput();
    case "pageup": case "pagedown": return this.goPage(action !== "pageup");
    case "enter": return this.onEnter(true);
    }
  },
  onBashAction (code: number): void | boolean {
    const sel = window.getSelection(), isExtend = code === 4 || code < 0;
    sel.collapseToStart();
    sel.modify(isExtend ? "extend" : "move", code < 4 ? "backward" : "forward", "word");
    if (isExtend && sel.type === "Range") { return document.execCommand("delete"); }
  },
  _pageNumRe: <RegExpOne> /(?:^|\s)(\+\d{0,2})$/,
  goPage (dir: boolean | number): void {
    const len = this.completions.length, n = this.mode.maxResults;
    let str = len ? this.completions[0].type : "", sel = +dir || -1;
    if (this.isSearchOnTop) { return; }
    str = (this.isSelectionOrigin || this.selection < 0 ? this.input.value : this.inputText).trimRight();
    let arr = this._pageNumRe.exec(str), i = (arr && arr[0] as string | undefined | number as number) | 0;
    if (len >= n) { sel *= n; }
    else if (i > 0 && sel < 0) { sel *= i >= n ? n : 1; }
    else if (len < (len && this.completions[0].type === "tab" ? 3 : n)) { return; }

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
    return this.update();
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
    else if (sel === -1 || this.isSelectionOrigin) {
      return this.update(0, this.onEnter);
    }
    interface UrlInfo { url: string; sessionId?: undefined };
    const item: SuggestionE | UrlInfo = sel >= 0 ? this.completions[sel] : { url: this.input.value.trim() },
    func = function(this: void): void {
      Vomnibar.doEnter = null;
      return item.sessionId != null ? Vomnibar.gotoSession(item as SuggestionE & { sessionId: string | number })
        : Vomnibar.navigateToUrl(item as UrlInfo);
    };
    if (this.actionType < ReuseType.newFg) { return func(); }
    this.doEnter = func;
    return this.hide();
  },
  OnEnterUp (this: void, event: KeyboardEvent): void {
    if (event.keyCode === VKeyCodes.enter) {
      Vomnibar.lastKey = 0;
      window.onkeyup = null as never;
      return Vomnibar.onEnter(event);
    }
  },
  onClick (event: MouseEvent): void {
    let el: Node | null = event.target as Node;
    if (el === this.input || window.getSelection().type === "Range") { return; }
    else if (el === this.input.parentElement) { return this.onAction("focus"); }
    while (el && el.parentNode !== this.list) { el = el.parentNode; }
    if (!el) { return; }
    if (this.timer) { event.preventDefault(); return; }
    this.lastKey = 0;
    this.onEnter(event, [].indexOf.call(this.list.children, el));
  },
  OnMenu (this: void, event: Event): void {
    let el = event.target as Element | null;
    for (; el && !el.classList.contains("url"); el = el.parentElement) {}
    if (!el) { return; }
    const _i = [].indexOf.call(Vomnibar.list.children, (el.parentNode as HTMLElement).parentNode);
    (el as HTMLAnchorElement).href = Vomnibar.completions[_i].url;
  },
  OnSelect (this: HTMLInputElement): void {
    let el = this;
    if (el.selectionStart !== 0 || el.selectionDirection !== "backward") { return; }
    let left = el.value,
    end = el.selectionEnd - 1;
    if (left.charCodeAt(end) !== 32 || end === left.length - 1) { return; }
    left = left.substring(0, end).trimRight();
    if (left.indexOf(" ") === -1) {
      el.setSelectionRange(0, left.length, 'backward');
    }
  },
  OnFocus (this: void, event: FocusEvent): void { Vomnibar.focused = event.type !== "blur"; },
  OnTimer (this: void): void { if (Vomnibar) { return Vomnibar.filter(); } },
  onWheel (event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) { return; }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.deltaX || Date.now() - this.wheelTimer < this.wheelInterval) { return; }
    this.wheelTimer = Date.now();
    return this.goPage(event.deltaY > 0);
  },
  onInput (): void {
    let s0 = this.lastQuery, s1 = this.input.value, str: string, arr: RegExpExecArray | null;
    if ((str = s1.trim()) === (this.selection === -1 || this.isSelectionOrigin
        ? s0 : this.completions[this.selection].text)) {
      return;
    }
    if (this.matchType === CompletersNS.MatchType.emptyResult && s1.startsWith(s0)) { return; }
    const i = this.input.selectionStart;
    if (this.isSearchOnTop) {}
    else if (i > s1.length - 2) {
      if (s1.endsWith(" +") && !this.timer && str.substring(0, str.length - 2).trimRight() === s0) {
        return;
      }
    } else if ((arr = this._pageNumRe.exec(s0)) && str.endsWith(arr[0])) {
      const j = arr[0].length;
      s1 = s1.trimRight();
      s1 = s1.substring(0, s1.length - j).trimRight();
      if (s1.trimLeft() !== s0.substring(0, s0.length - j).trimRight()) {
        this.input.value = s1;
        this.input.setSelectionRange(i, i);
      }
    }
    return this.update();
  },
  omni (response: BgVomnibarReq["omni"]): void {
    if (!this.isActive) { return; }
    const list = response.list, oldHeight = this.height;
    let height = list.length;
    this.matchType = response.matchType;
    this.completions = list;
    this.selection = response.autoSelect || this.modeType !== "omni" ? 0 : -1;
    this.isSelectionOrigin = true;
    this.isSearchOnTop = height > 0 && list[0].type === "search";
    if (height > 0) {
      height = (44 + (1 / (Math.max(1, window.devicePixelRatio)))) * height + 3;
    }
    this.height = height = (height | 0) + 54;
    if (oldHeight !== height) {
      VPort.postToOwner({ name: "style", height: height });
    }
    list.forEach(this.parse, this);
    return this.populateUI();
  },
  populateUI (): void {
    const list = this.list, noEmpty = this.completions.length > 0;
    (this.input.parentElement as HTMLElement).classList[noEmpty ? "add" : "remove"]("withList");
    list.style.display = noEmpty ? "" : "none";
    list.innerHTML = this.renderItems(this.completions);
    if (noEmpty) {
      this.selection === 0 && list.firstElementChild.classList.add("s");
      list.lastElementChild.classList.add("b");
    }
    if (this.timer <= 0) { return this.postUpdate(); }
  },
  postUpdate (): void {
    let func: typeof Vomnibar.onUpdate;
    this.timer = 0;
    this.isEditing = false;
    if (func = this.onUpdate) {
      this.onUpdate = null;
      return func.call(this);
    }
  },
  init (): void {
    addEventListener("focus", VPort.EnsurePort, true);
    window.onclick = function(e) { Vomnibar.onClick(e); };
    this.onWheel = this.onWheel.bind(this);
    Object.setPrototypeOf(this.ctrlMap, null);
    Object.setPrototypeOf(this.normalMap, null);
    this.input = document.getElementById("input") as HTMLInputElement;
    this.list = document.getElementById("list") as HTMLDivElement;
    this.input.onfocus = this.input.onblur = this.OnFocus;
    this.input.oninput = this.onInput.bind(this);
    this.list.oncontextmenu = this.OnMenu;
    (document.getElementById("close") as HTMLElement).onclick = function() { Vomnibar.hide(); };
    addEventListener("keydown", this.HandleKeydown, true);
    this.renderItems = VUtils.makeListRenderer((document.getElementById("template") as HTMLElement).innerHTML);
    this.init = VUtils.makeListRenderer = null as never;
  },
  HandleKeydown (this: void, event: KeyboardEvent): void {
    Vomnibar.keyResult = HandlerResult.Prevent as HandlerResult;
    if (window.onkeyup) {
      let stop: boolean, now: number = 0;
      if (!Vomnibar.lastScrolling) {
        stop = event.keyCode > 17 || event.keyCode < 16;
      } else if ((stop = !event.repeat) ||
          (now = Date.now()) - Vomnibar.lastScrolling > 40) {
        VPort.postToOwner<"scrollEnd" | "scrollGoing">(stop ? "scrollEnd" : "scrollGoing");
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
    setTimeout(VPort.postToOwner, 0, { name: "focus", lastKey: request.lastKey });
  },
  secret: null as never as (this: void, request: BgVomnibarReq["secret"]) => void,

  mode: {
    handler: "omni" as "omni",
    type: "omni" as CompletersNS.ValidTypes,
    clientWidth: 0,
    maxResults: 10,
    query: ""
  },
  _spacesRe: <RegExpG> /\s{2,}/g,
  filter (): void {
    let mode = this.mode, str: string, newMatchType = CompletersNS.MatchType.Default;
    if (this.useInput) {
      this.lastQuery = str = this.input.value.trim();
      str = str.replace(this._spacesRe, " ");
      if (str === mode.query) { return this.postUpdate(); }
      mode.type = this.matchType < CompletersNS.MatchType.singleMatch || !str.startsWith(mode.query) ? this.modeType
        : this.matchType === CompletersNS.MatchType.searchWanted ? "search"
        : (newMatchType = this.matchType, this.completions[0].type as CompletersNS.ValidTypes);
      mode.query = str;
      mode.clientWidth = window.innerWidth;
      this.matchType = newMatchType;
    } else {
      this.useInput = true;
    }
    this.timer = -1;
    VPort.postMessage(mode);
  },

  parse: function(item: SuggestionE) {
    let str: string;
    if ((this as typeof Vomnibar).showFavIcon && (str = item.url) && str.length <= 512 && str.indexOf("://") > 0) {
      item.favIconUrl = ' icon" style="background-image: url(&quot;chrome://favicon/size/16/' +
        VUtils.escapeCSSStringInAttr(str) + "&quot;)";
    } else {
      item.favIconUrl = "";
    }
    item.relevancy = (this as typeof Vomnibar).showRelevancy ? `\n\t\t\t<span class="relevancy">${item.relevancy}</span>` : "";
  },
  navigateToUrl (item: { url: string }): void {
    if (item.url.substring(0, 11).toLowerCase() === "javascript:") {
      VPort.postToOwner({ name: "evalJS", url: item.url });
      return;
    }
    VPort.postMessage({
      handler: "openUrl",
      reuse: this.actionType,
      https: this.isHttps,
      url: item.url
    });
  },
  gotoSession (item: SuggestionE & { sessionId: string | number }): void {
    VPort.postMessage({
      handler: "gotoSession",
      active: this.actionType > -2,
      sessionId: item.sessionId
    });
    if (this.actionType > -2) { return; }
    window.getSelection().removeAllRanges();
    if (item.type !== "tab") {
      return this.refresh();
    }
    window.onfocus = function(): void {
      window.onfocus = null as never;
      if (VPort.port) { return Vomnibar.refresh(); }
    };
  }
},
VUtils = {
  makeListRenderer (this: void, template: string): Render {
    const a = template.split(/\{\{(\w+)}}/g);
    let o: Dict<any> | null = null;
    function f(w: string, i: number): any { return (i & 1) && (w = (o as Dict<any>)[w]) == null ? "" : w; }
    function m(i: Dict<any>) { o = i; return a.map(f).join(""); };
    (<RegExpOne> /a?/).test("");
    return function(objectArray) {
      const html = objectArray.map(m).join("");
      o = null;
      return html;
    };
  },
  decodeURL (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try {
      url = (decode || decodeURI)(url);
    } catch (e) {}
    return url;
  },
  escapeCSSStringInAttr (s: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === 38 ? "&amp;" : i < 38 ? "\\&quot;" : i === 60 ? "&lt;" : "&gt;";
    };
    this.escapeCSSStringInAttr = function(s): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return this.escapeCSSStringInAttr(s);
  }
},
VPort = {
  port: null as Port | null,
  postToOwner: null as never as <K extends keyof VomnibarNS.FReq>(this: void, request: VomnibarNS.FReq[K]) => void | 1,
  postMessage<K extends keyof FgReq> (request: Req.fg<K>): 1 {
    return ((this as typeof VPort).port || (this as typeof VPort).connect()).postMessage(request);
  },
  _callbacks: Object.create(null) as { [msgId: number]: <K extends keyof FgRes>(this: void, res: FgRes[K]) => void },
  _id: 1,
  sendMessage<K extends keyof FgRes> (request: Req.fg<K> , callback: (this: void, res: FgRes[K]) => void): void {
    const id = ++this._id;
    ((this as typeof VPort).port || (this as typeof VPort).connect()).postMessage({_msgId: id, request: request});
    this._callbacks[id] = callback;
  },
  Listener<K extends keyof FgRes, T extends keyof BgVomnibarReq> (this: void
        , response: Req.res<K> | (BgVomnibarReq[T] & { name: T, _msgId?: undefined; })): void {
    let id: number | undefined;
    if (id = response._msgId) {
      const handler = VPort._callbacks[id];
      delete VPort._callbacks[id];
      return handler((response as Req.res<K>).response);
    }
    return Vomnibar[(response as Req.bg<T>).name](response as BgVomnibarReq[T]);
  },
  OnOwnerMessage<K extends keyof VomnibarNS.CReq> ({ data: data }: { data: VomnibarNS.CReq[K] }): void {
    let name = ((data as VomnibarNS.Msg<string>).name || data) as keyof VomnibarNS.CReq | "onAction";
    if (name === "focus" || name === "backspace") { name = "onAction"; }
    return (Vomnibar as any)[name](data);
  },
  ClearPort (this: void): void { VPort.port = null; },
  connect (): Port {
    const port = this.port = chrome.runtime.connect({ name: "vimium++.8" }) as Port;
    port.onDisconnect.addListener(this.ClearPort);
    port.onMessage.addListener(this.Listener);
    return port;
  },
  EnsurePort (this: void): void | true {
    if (!VPort || VPort.port) { return; }
    try { VPort.connect(); return; } catch (e) {}
    VPort.postToOwner({ name: "broken", active: Vomnibar.isActive });
    VPort = null as never;
    return true;
  },
  OnUnload (): void {
    const obj = Vomnibar;
    if (!(VPort && obj)) { return; }
    obj.isActive = false;
    obj.timer > 0 && clearTimeout(obj.timer);
    VPort.postToOwner("unload");
  }
};
(function() {
  let _secr = null as number | null, step = 0, _port: VomnibarNS.IframePort | undefined, _options: Options | null | undefined,
  handler = function(this: void, secret: number, port?: VomnibarNS.IframePort, options?: Options | null): void {
    if (0 === step++) {
      _secr = secret, _port = port, _options = options;
      return;
    }
    if (_secr !== secret) { return; }
    clearTimeout(timer);
    window.onmessage = null as never;
    port || (port = _port as VomnibarNS.IframePort);
    options || (options = _options);
    VPort.postToOwner = port.postMessage.bind(port);
    port.onmessage = VPort.OnOwnerMessage;
    window.onunload = VPort.OnUnload;
    if (options) {
      return Vomnibar.activate(options);
    } else {
      port.postMessage("uiComponentIsReady");
    }
  },
  timer = setTimeout(function() { window.location.href = "about:blank"; }, 700);
  Vomnibar.secret = function(request): void {
    Vomnibar.secret = null as never;
    return handler(request.secret);
  };
  window.onmessage = function(event: MessageEvent): void {
    if (event.source === window.parent) {
      let data: VomnibarNS.MessageData = event.data;
      return handler(data[0], event.ports[0], data[1]);
    }
  };
})();
VPort.connect();

if (!String.prototype.startsWith) {
String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
String.prototype.endsWith || (String.prototype.endsWith = function(this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
}
