/// <reference path="../content/base.d.ts" />
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
type Render = (this: void, list: ReadonlyArray<Readonly<SuggestionE>>) => string;
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
declare function setTimeout <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setTimeout <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setTimeout <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;

interface ConfigurableItems {
  VomnibarMaxPageNum?: number;
}
// tslint:disable-next-line: no-empty-interface
interface Window extends ConfigurableItems {}
import PixelData = VomnibarNS.PixelData;

// tslint:disable-next-line: triple-equals
if (typeof VSettings == "object" && VSettings && typeof VSettings.destroy_ == "function") {
  VSettings.destroy_(true);
}

var VCID_: string | undefined = VCID_ || "", Vomnibar_ = {
  pageType_: VomnibarNS.PageType.Default,
  activate_ (options: Options): void {
    Object.setPrototypeOf(options, null);
    const a = Vomnibar_;
    a.mode_.t = a.mode_.o = a.modeType_ = ((options.mode || "") + "") as CompletersNS.ValidTypes || "omni";
    a.mode_.f = a.mode_.t === "tab" && options.currentWindow ? 1 : 0;
    a.forceNewTab_ = options.newtab != null ? !!options.newtab : !!options.force;
    a.baseHttps_ = null;
    let { url, keyword, p: search } = options, start: number | undefined;
    let scale = Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
            && (!(Build.BTypes & ~BrowserType.Chrome)
                || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)
          ? devicePixelRatio : options.z
      , dz = a.docZoom_ = scale < 0.98 ? 1 / scale : 1;
    if (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
        && (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)) {
      a.onInnerWidth_((options.w * PixelData.WindowSizeX + PixelData.MarginH * options.z) / scale);
    } else {
      a.onInnerWidth_(options.w * PixelData.WindowSizeX + PixelData.MarginH);
    }
    const max = Math.max(3, Math.min(0 | ((options.h / dz
          / (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
              && (!(Build.BTypes & ~BrowserType.Chrome)
                  || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)
              ? scale : 1)
        - PixelData.ListSpaceDelta) / PixelData.Item), a.maxMatches_));
    a.mode_.r = max;
    a.init_ && a.preInit_(options.t);
    if (Build.BTypes & ~BrowserType.Firefox) {
      a.bodySt_.zoom = dz > 1 ? dz + "" : "";
    } else {
      a.bodySt_.fontSize = dz > 1 ? dz + "px" : "";
    }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || a.browser_ === BrowserType.Firefox)) {
      a._favPrefix = '" style="background-image: url(&quot;';
    } else if (a.mode_.i) {
      scale = scale === 1 ? 1 : scale < 3 ? 2 : scale < 3.5 ? 3 : 4;
/**
 * Note: "@1x" is necessary, because only the whole 'size/aa@bx/' can be optional
 * * definition: https://cs.chromium.org/chromium/src/chrome/browser/ui/webui/favicon_source.h?type=cs&q=FaviconSource&g=0&l=47
 * * parser: https://cs.chromium.org/chromium/src/components/favicon_base/favicon_url_parser.cc?type=cs&q=ParseFaviconPath&g=0&l=33
 * * if no '@', then Chromium's buggy code would misunderstand the wanted URL (BrowserVer.MinChar$At$InFaviconUrl)
 */
      a._favPrefix = '" style="background-image: url(&quot;chrome://favicon/size/16@' + scale + "x/";
    }
    if (url == null) {
      return a.reset_(keyword ? keyword + " " : "");
    }
    if (search) {
      start = search.s;
      url = search.u;
      keyword || (keyword = search.k);
    } else if (search === null) {
      url = VUtils_.decodeURL_(url).replace(<RegExpG> /\s$/g, "%20");
      if (!keyword && (<RegExpI> /^https?:\/\//i).test(url)) {
        a.baseHttps_ = (url.charCodeAt(4) | KnownKey.CASE_DELTA) === KnownKey.s;
        url = url.slice(a.baseHttps_ ? 8 : 7, url.indexOf("/", 8) === url.length - 1 ? -1 : void 0);
      }
    } else {
      url = VUtils_.decodeURL_(url, decodeURIComponent).trim().replace(a._spacesRe, " ");
    }
    if (keyword) {
      start = (start || 0) + keyword.length + 1;
      return a.reset_(keyword + " " + url, start, start + url.length);
    } else {
      return a.reset_(url);
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
  maxPageNum_: Math.min(Math.max(3, (<number> window.VomnibarMaxPageNum | 0) || 10), 100),
  isEditing_: false,
  isInputComposing_: false,
  baseHttps_: null as boolean | null,
  isHttps_: null as boolean | null,
  isSearchOnTop_: false,
  actionType_: ReuseType.Default,
  matchType_: CompletersNS.MatchType.Default,
  focused_: Build.BTypes & ~BrowserType.Firefox ? true : false,
  showing_: false,
  firstShowing_: true,
  focusByCode_: true,
  blurWanted_: false,
  forceNewTab_: false,
  sameOrigin_: false,
  showFavIcon_: 0 as 0 | 1 | 2,
  showRelevancy_: false,
  docZoom_: 1,
  lastScrolling_: 0,
  height_: 0,
  maxHeight_: 0,
  input_: null as never as HTMLInputElement & Ensure<HTMLInputElement
      , "selectionDirection" | "selectionEnd" | "selectionStart">,
  bodySt_: null as never as CSSStyleDeclaration,
  barCls_: null as never as DOMTokenList,
  isSelOriginal_: true,
  lastKey_: VKeyCodes.None,
  keyResult_: HandlerResult.Nothing,
  list_: null as never as EnsuredMountedHTMLElement,
  onUpdate_: null as (() => void) | null,
  doEnter_: null as ((this: void) => void) | null,
  renderItems_: null as never as Render,
  selection_: -1,
  atimer_: 0,
  timer_: 0,
  wheelStart_: 0,
  wheelTime_: 0,
  wheelDelta_: 0,
  browser_: BrowserType.Chrome,
  browserVer_: Build.BTypes & BrowserType.Chrome ? BrowserVer.assumedVer : BrowserVer.assumedVer,
  maxMatches_: 0,
  queryInterval_: 0,
  styles_: "",
  styleEl_: null as HTMLStyleElement | null,
  darkBtn_: null as HTMLElement | null,
  wheelOptions_: { passive: false, capture: true as true },
  show_ (): void {
    const a = Vomnibar_;
    a.showing_ = true;
    Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || a.browser_ === BrowserType.Chrome)
      && a.firstShowing_ ||
    setTimeout(a.focus_, 34);
    a.firstShowing_ = false;
    addEventListener("wheel", a.onWheel_, a.wheelOptions_);
  },
  hide_ (fromContent?: BOOL): void {
    const a = Vomnibar_, el = a.input_;
    a.isActive_ = a.showing_ = a.isEditing_ = a.isInputComposing_ = a.blurWanted_ = a.focusByCode_ = false;
    removeEventListener("wheel", a.onWheel_, a.wheelOptions_);
    a.timer_ > 0 && clearTimeout(a.timer_);
    window.onkeyup = null as never;
    el.blur();
    fromContent || VPort_.post_({ H: kFgReq.nextFrame, t: Frames.NextType.current, k: a.lastKey_ });
    a.bodySt_.cssText = "display: none;";
    a.list_.textContent = el.value = "";
    a.list_.style.height = "";
    a.barCls_.remove("empty");
    a.list_.classList.remove("no-favicon");
    if (a.sameOrigin_) { return a.onHidden_(); }
    a.atimer_ = requestAnimationFrame(a.AfterHide_);
    a.timer_ = setTimeout(a.AfterHide_, 35);
  },
  AfterHide_ (this: void): void {
    const a = Vomnibar_;
    cancelAnimationFrame(a.atimer_);
    clearTimeout(a.timer_);
    if (a.height_) {
      a.onHidden_();
    }
  },
  onHidden_ (): void {
    VPort_.postToOwner_({ N: VomnibarNS.kFReq.hide });
    const a = Vomnibar_;
    a.timer_ = a.height_ = a.matchType_ = a.wheelStart_ = a.wheelTime_ = a.actionType_ =
    a.total_ = a.lastKey_ = a.wheelDelta_ = 0;
    a.docZoom_ = 1;
    a.completions_ = a.onUpdate_ = a.isHttps_ = a.baseHttps_ = null as never;
    a.mode_.q = a.lastQuery_ = a.inputText_ = a.lastNormalInput_ = "";
    a.isSearchOnTop_ = false;
    a.modeType_ = a.mode_.t = a.mode_.o = "omni";
    a.doEnter_ ? setTimeout(a.doEnter_, 0) : (<RegExpOne> /a?/).test("");
    a.doEnter_ = null;
  },
  reset_ (input: string, start?: number, end?: number): void {
    const a = Vomnibar_;
    a.inputText_ = input;
    a.useInput_ = a.showing_ = false;
    a.isHttps_ = a.baseHttps_;
    a.mode_.q = a.lastQuery_ = input && input.trim().replace(a._spacesRe, " ");
    a.height_ = 0;
    a.isActive_ = true;
    // also clear @timer
    a.update_(0, (start as number) <= (end as number) ? function (): void {
      if (Vomnibar_.input_.value === Vomnibar_.inputText_) {
        Vomnibar_.input_.setSelectionRange(start as number, end as number);
      }
    } : null);
    if (a.init_) { a.init_(); }
    a.input_.value = a.inputText_;
  },
  focus_ (this: void, focus?: false | TimerType.fake | "focus" | 1 | 2 | 3 | 4 | 5): void {
    const a = Vomnibar_;
    a.focusByCode_ = true;
    if (focus !== false) {
      a.input_.focus();
      if (a.focusByCode_ || !a.focused_) {
        focus = focus ? <number> focus | 0 : 0;
        if (!Build.NDEBUG) {
          if (focus >= 0) {
            console.log(`Vomnibar: can not focus the input bar at the ${focus + 1} time`
              + (focus < 5 ? ", so retry in 33ms." : "."));
          } else {
            console.log("Vomnibar: fail in focusing the input bar.");
          }
        }
        focus < 5 && focus >= 0 && setTimeout(a.focus_, 33, focus + 1);
      }
    } else {
      VPort_.post_({ H: kFgReq.nextFrame, t: Frames.NextType.current, k: a.lastKey_ });
    }
  },
  update_ (updateDelay: number, callback?: (() => void) | null): void {
    const a = Vomnibar_;
    a.onUpdate_ = callback || null;
    if (updateDelay >= 0) {
      a.isInputComposing_ = false;
      if (a.timer_ > 0) {
        clearTimeout(a.timer_);
      }
      if (updateDelay === 0) {
        return a.fetch_();
      }
    } else if (a.timer_ > 0) {
      return;
    } else {
      updateDelay = a.queryInterval_;
    }
    a.timer_ = setTimeout(a.OnTimer_, updateDelay);
  },
  doRefresh_ (wait: number): void {
    let oldSel = Vomnibar_.selection_, origin = Vomnibar_.isSelOriginal_;
    Vomnibar_.useInput_ = false;
    Vomnibar_.onInnerWidth_();
    return Vomnibar_.update_(wait, function (): void {
      const len = Vomnibar_.completions_.length;
      if (!origin && oldSel >= 0 && len > 0) {
        oldSel = Math.min(oldSel, len - 1);
        Vomnibar_.selection_ = 0; Vomnibar_.isSelOriginal_ = false;
        Vomnibar_.updateSelection_(oldSel);
      }
      Vomnibar_.focused_ || Vomnibar_.blurWanted_ || Vomnibar_.focus_();
    });
  },
  updateInput_ (sel: number): void {
    const a = Vomnibar_, focused = a.focused_, blurred = a.blurWanted_;
    a.isSelOriginal_ = false;
    if (sel === -1) {
      a.isHttps_ = a.baseHttps_; a.isEditing_ = false;
      a.input_.value = a.inputText_;
      if (!focused) { a.focus_(); a.blurWanted_ = blurred; }
      return;
    }
    blurred && focused && a.input_.blur();
    const line: SuggestionEx = a.completions_[sel] as SuggestionEx;
    if (line.parsed) {
      return a._updateInput(line, line.parsed);
    }
    (line as Partial<SuggestionEx>).https == null && (line.https = line.url.startsWith("https://"));
    if (line.type !== "history" && line.type !== "tab") {
      if (line.parsed == null) {
        VUtils_.ensureText_(line);
        line.parsed = "";
      }
      a._updateInput(line, line.text);
      if (line.type === "math") {
        a.input_.select();
      }
      return;
    }
    const onlyUrl = !line.text, url = line.url;
    const ind = VUtils_.ensureText_(line);
    let str = onlyUrl ? url : VUtils_.decodeURL_(url, decodeURIComponent);
    if (!onlyUrl && str.length === url.length && url.indexOf("%") >= 0) {
      // has error during decoding
      str = line.text;
      if (ind) {
        if (str.lastIndexOf("://", 5) < 0) {
          str = (ind === ProtocolType.http ? "http://" : "https://") + str;
        }
        if (url.endsWith("/") || !str.endsWith("/")) {
          str += "/";
        }
      }
    }
    VPort_.post_({
      H: kFgReq.parseSearchUrl,
      i: sel,
      u: str
    });
  },
  parsed_ ({ i: id, s: search }: BgVomnibarSpecialReq[kBgReq.omni_parsed]): void {
    const line: SuggestionEx = Vomnibar_.completions_[id] as SuggestionEx;
    line.parsed = search ? (Vomnibar_.modeType_ !== "omni" ? ":o " : "") + search.k + " " + search.u + " " : line.text;
    if (id === Vomnibar_.selection_) {
      return Vomnibar_._updateInput(line, line.parsed);
    }
  },
  toggleInput_ (): void {
    const a = Vomnibar_;
    if (a.selection_ < 0) { return; }
    if (a.isSelOriginal_) {
      a.inputText_ = a.input_.value;
      return a.updateInput_(a.selection_);
    }
    let line = a.completions_[a.selection_] as SuggestionEx, str = a.input_.value.trim();
    str = str === (line.title || line.url) ? (line.parsed || line.text)
      : line.title && str === line.url ? line.title
      : str === line.text ? line.url : line.text;
    return a._updateInput(line, str);
  },
  _updateInput (line: SuggestionEx, str: string): void {
    const maxW = str.length * 10, tooLong = maxW > innerWidth - PixelData.AllHNotInput;
    Vomnibar_.input_.value = str;
    tooLong && (Vomnibar_.input_.scrollLeft = maxW);
    Vomnibar_.isHttps_ = line.https && str === line.text;
    Vomnibar_.isEditing_ = str !== line.parsed || line.parsed === line.text;
  },
  updateSelection_ (sel: number): void {
    const a = Vomnibar_;
    if (a.timer_) { return; }
    const _ref = a.list_.children, old = a.selection_;
    (a.isSelOriginal_ || old < 0) && (a.inputText_ = a.input_.value);
    a.updateInput_(sel);
    a.selection_ = sel;
    old >= 1 && _ref[old - 1].classList.remove("p");
    old >= 0 && _ref[old].classList.remove("s");
    sel >= 1 && _ref[sel - 1].classList.add("p");
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
    const a = Vomnibar_;
    let action: AllowedActions = AllowedActions.nothing, n = event.keyCode, focused = a.focused_;
    a.lastKey_ = n;
    if (event.altKey || event.metaKey) {
      if (event.ctrlKey || event.shiftKey) { /* empty */ }
      else if (n === VKeyCodes.f2) {
        return a.onAction_(focused ? AllowedActions.blurInput : AllowedActions.focus);
      }
      else if (!focused) { /* empty */ }
      else if (n > VKeyCodes.A && n < VKeyCodes.G && n !== VKeyCodes.C || n === VKeyCodes.backspace) {
        return a.onBashAction_(n - VKeyCodes.maxNotAlphabet);
      }
      if (event.altKey) { a.keyResult_ = HandlerResult.Nothing; return; }
    }
    if (n === VKeyCodes.enter) {
      window.onkeyup = a.OnEnterUp_;
      return;
    }
    else if (event.ctrlKey || event.metaKey) {
      if (event.shiftKey) {
        action = n === VKeyCodes.F ? AllowedActions.pagedown : n === VKeyCodes.B ? AllowedActions.pageup
          : AllowedActions.nothing;
      } else if (n === VKeyCodes.up || n === VKeyCodes.down || n === VKeyCodes.end || n === VKeyCodes.home) {
        event.preventDefault();
        a.lastScrolling_ = Date.now();
        window.onkeyup = Vomnibar_.HandleKeydown_;
        VPort_.postToOwner_({ N: VomnibarNS.kFReq.scroll, keyCode: n });
        return;
      } else {
        action = event.code === "BracketLeft" ? AllowedActions.dismiss
          : event.code === "BracketRight" ? AllowedActions.toggle
          : a.ctrlMap_[n] || AllowedActions.nothing;
      }
    }
    else if (event.shiftKey) {
      action = n === VKeyCodes.up ? AllowedActions.pageup : n === VKeyCodes.down ? AllowedActions.pagedown
        : n === VKeyCodes.tab ? AllowedActions.up : n === VKeyCodes.deleteKey ? AllowedActions.remove
        : AllowedActions.nothing;
    }
    else if (action = a.normalMap_[n] || AllowedActions.nothing) { /* empty */ }
    else if (n === VKeyCodes.ime || n > VKeyCodes.f1 && n < VKeyCodes.minNotFn) {
      a.keyResult_ = HandlerResult.Nothing;
      return;
    }
    else if (n === VKeyCodes.backspace) {
      if (focused) { a.keyResult_ = HandlerResult.Suppress; }
      return;
    }
    else if (n !== VKeyCodes.space) { /* empty */ }
    else if (!focused) { action = AllowedActions.focus; }
    else if ((a.selection_ >= 0
        || a.completions_.length <= 1) && a.input_.value.endsWith("  ")) {
      action = AllowedActions.enter;
    }
    if (action) {
      return a.onAction_(action);
    }

    if (!focused && n < VKeyCodes.minNotNum && n > VKeyCodes.maxNotNum) {
      n = (n - VKeyCodes.N0) || 10;
      return !event.shiftKey && n <= a.completions_.length ? a.onEnter_(event, n - 1) : undefined;
    }
    a.keyResult_ = focused && n !== VKeyCodes.menuKey ? HandlerResult.Suppress : HandlerResult.Nothing;
  },
  onAction_ (action: AllowedActions): void {
    const a = Vomnibar_;
    let sel: number;
    switch (action) {
    case AllowedActions.dismiss:
      const selection = getSelection();
      if (selection.type === "Range" && a.focused_) {
        const el = a.input_;
        sel = el.selectionDirection !== "backward" &&
          el.selectionEnd < el.value.length ? el.selectionStart : el.selectionEnd;
        el.setSelectionRange(sel, sel);
      } else {
        return a.hide_();
      }
      break;
    case AllowedActions.focus: a.focus_(); break;
    case AllowedActions.blurInput: a.blurWanted_ = true; a.input_.blur(); break;
    case AllowedActions.backspace: case AllowedActions.blur:
      !a.focused_ ? a.focus_()
      : action === AllowedActions.blur ? a.focus_(false)
      : document.execCommand("delete");
      break;
    case AllowedActions.up: case AllowedActions.down:
      sel = a.completions_.length + 1;
      sel = (sel + a.selection_ + (action - AllowedActions.up)) % sel - 1;
      return a.updateSelection_(sel);
    case AllowedActions.toggle: return a.toggleInput_();
    case AllowedActions.pageup: case AllowedActions.pagedown: return a.goPage_(action !== AllowedActions.pageup);
    case AllowedActions.enter: return a.onEnter_(true);
    case AllowedActions.remove: return a.removeCur_();
    }
  },
  onBashAction_ (code: number): void {
    const sel = getSelection(), isExtend = code === 4 || code < 0;
    sel.modify(isExtend ? "extend" : "move", code < 4 ? "backward" : "forward", "word");
    if (isExtend && Vomnibar_.input_.selectionStart < Vomnibar_.input_.selectionEnd) {
      document.execCommand("delete");
    }
  },
  _pageNumRe: <RegExpOne> /(?:^|\s)(\+\d{0,2})$/,
  goPage_ (dirOrNum: boolean | number): void {
    const a = Vomnibar_;
    if (a.isSearchOnTop_) { return; }
    const len = a.completions_.length, n = a.mode_.r;
    let str = len ? a.completions_[0].type : "", delta = +dirOrNum || -1;
    str = (a.isSelOriginal_ || a.selection_ < 0 ? a.input_.value : a.inputText_).trimRight();
    let arr = a._pageNumRe.exec(str), i = ((arr && arr[0]) as string | undefined | number as number) | 0;
    if (len >= n) { delta *= n; }
    else if (i > 0 && delta < 0) { delta *= i >= n ? n : 1; }
    else if (len < (len && a.completions_[0].type !== "tab" ? n : 3)) { return; }

    const dest = Math.min(Math.max(0, i + delta), a.maxPageNum_ * n - n);
    if (delta > 0 && (dest === i || dest >= a.total_ && a.total_ > 0)) { return; }
    if (arr) { str = str.slice(0, -arr[0].length); }
    str = str.trimRight();
    i = Math.min(a.input_.selectionEnd, str.length);
    if (dest > 0) { str += " +" + dest; }
    const oldStart = a.input_.selectionStart, oldDi = a.input_.selectionDirection;
    a.input_.value = str;
    a.input_.setSelectionRange(oldStart, i, oldDi);
    a.isInputComposing_ = false;
    return a.update_(-1);
  },
  onEnter_ (event?: EventControlKeys | true, newSel?: number): void {
    const a = Vomnibar_;
    let sel = newSel != null ? newSel : a.selection_;
    a.actionType_ = event == null ? a.actionType_
      : event === true ? a.forceNewTab_ ? ReuseType.newFg : ReuseType.current
      : event.ctrlKey || event.metaKey ? event.shiftKey ? ReuseType.newBg : ReuseType.newFg
      : event.shiftKey || !a.forceNewTab_ ? ReuseType.current : ReuseType.newFg;
    if (newSel != null) { /* empty */ }
    else if (sel === -1 && a.input_.value.length === 0) { return; }
    else if (!a.timer_) { /* empty */ }
    else if (a.isEditing_) { sel = -1; }
    else if (a.timer_ > 0) {
      return a.update_(0, a.onEnter_);
    } else {
      a.onUpdate_ = a.onEnter_;
      return;
    }
    interface UrlInfo { url: string; sessionId?: undefined; }
    const item: SuggestionE | UrlInfo = sel >= 0 ? a.completions_[sel] : { url: a.input_.value.trim() },
    action = a.actionType_, https = a.isHttps_,
    func = function (this: void): void {
      item.sessionId != null ? Vomnibar_.gotoSession_(item as SuggestionE & { sessionId: string | number })
        : Vomnibar_.navigateToUrl_((item as UrlInfo).url, action, https);
      (<RegExpOne> /a?/).test("");
    };
    if (a.actionType_ < ReuseType.newFg) { return func(); }
    a.doEnter_ = func;
    a.hide_();
  },
  OnEnterUp_ (this: void, event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? event.isTrusted
        : event.isTrusted === true
          || event.isTrusted == null && event instanceof KeyboardEvent
            && (keyCode === VKeyCodes.enter || keyCode === VKeyCodes.ctrlKey || keyCode === VKeyCodes.shiftKey
                || keyCode === VKeyCodes.metaKey)
    ) { // call onEnter once an enter / control key is up
      Vomnibar_.lastKey_ = VKeyCodes.None;
      window.onkeyup = null as never;
      var keys = {
        altKey: event.altKey || keyCode === VKeyCodes.altKey,
        ctrlKey: event.ctrlKey || keyCode === VKeyCodes.ctrlKey,
        metaKey: event.metaKey || keyCode === VKeyCodes.metaKey,
        shiftKey: event.shiftKey || keyCode === VKeyCodes.shiftKey
      };
      Vomnibar_.onEnter_(keys);
    }
  },
  removeCur_ (): void {
    if (Vomnibar_.selection_ < 0) { return; }
    const completion = Vomnibar_.completions_[Vomnibar_.selection_], type = completion.type;
    if (type !== "tab" && (type !== "history" || completion.sessionId != null)) {
      VPort_.postToOwner_({ N: VomnibarNS.kFReq.hud, t: "This item can not be deleted." });
      return;
    }
    VPort_.post_({
      H: kFgReq.removeSug,
      t: type,
      u: type === "tab" ? completion.sessionId + "" : completion.url
    });
    return Vomnibar_.refresh_();
  },
  onClick_ (event: MouseEvent): void {
    const a = Vomnibar_;
    let el: SafeHTMLElement | null = event.target as SafeHTMLElement;
    if ((Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
          : event.isTrusted === false || !(event instanceof MouseEvent))
        || event.button
        || el === a.input_ || getSelection().type === "Range") { return; }
    if (el === a.input_.parentElement) { return a.focus_(); }
    if (a.timer_) { VUtils_.Stop_(event, 1); return; }
    while (el && el.parentElement !== a.list_) { el = el.parentElement as SafeHTMLElement | null; }
    if (!el) { return; }
    a.lastKey_ = VKeyCodes.None;
    a.onEnter_(event, [].indexOf.call(a.list_.children, el));
  },
  OnMenu_ (this: void, event: Event): void {
    let el = event.target as SafeHTMLElement | null, item: Element | null, Anchor = HTMLAnchorElement;
    while (el && !(el instanceof Anchor)) { el = el.parentElement as SafeHTMLElement | null; }
    if (!el || el.href) { return; }
    for (item = el; item && item.parentElement !== Vomnibar_.list_;
          item = item.parentElement as SafeHTMLElement | null) {
      /* empty */
    }
    const _i = [].indexOf.call(Vomnibar_.list_.children, item);
    _i >= 0 && (el.href = Vomnibar_.completions_[_i].url);
  },
  OnSelect_ (this: HTMLInputElement): void {
    let el = this as typeof Vomnibar_.input_;
    if (el.selectionStart !== 0 || el.selectionDirection !== "backward") { return; }
    let left = el.value,
    end = el.selectionEnd - 1;
    if (left.charCodeAt(end) !== KnownKey.space || end === left.length - 1) { return; }
    left = left.slice(0, end).trimRight();
    if (left.indexOf(" ") === -1) {
      el.setSelectionRange(0, left.length, "backward");
    }
  },
  OnTimer_ (this: void): void { if (Vomnibar_) { return Vomnibar_.fetch_(); } },
  onWheel_ (event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    VUtils_.Stop_(event, 1);
    const a = Vomnibar_, deltaY = event.deltaY, now = Date.now(), mode = event.deltaMode;
    if (event.deltaX || !deltaY || !a.isActive_ || a.isSearchOnTop_) { return; }
    if (now - a.wheelTime_ > (!mode /* WheelEvent.DOM_DELTA_PIXEL */
                              ? GlobalConsts.TouchpadTimeout : GlobalConsts.WheelTimeout)
        || now + 33 < a.wheelTime_) {
      a.wheelDelta_ = 0;
      a.wheelStart_ = 0;
    }
    a.wheelTime_ = now;
    let total = a.wheelDelta_ + (mode ? mode === /* WheelEvent.DOM_DELTA_LINE */ 1
          ? deltaY * (GlobalConsts.VomnibarWheelStepForPage / 3)
          : /* WheelEvent.DOM_DELTA_PAGE */ deltaY * GlobalConsts.VomnibarWheelStepForPage : deltaY)
      , abs = Math.abs(total);
    if (abs < GlobalConsts.VomnibarWheelStepForPage
        || a.wheelStart_ && now - a.wheelStart_ < GlobalConsts.VomnibarWheelIntervalForPage
            && now + 33 > a.wheelStart_
    ) {
      a.wheelDelta_ = total;
      return;
    }
    a.wheelDelta_ = (abs % GlobalConsts.VomnibarWheelStepForPage) * (abs > 0 ? 1 : -1);
    a.wheelStart_ = now;
    a.goPage_(deltaY > 0);
  },
  onInput_ (event: InputEvent): void {
    const a = Vomnibar_, s0 = a.lastQuery_, s1 = a.input_.value, str = s1.trim();
    a.blurWanted_ = false;
    if (str === (a.selection_ === -1 || a.isSelOriginal_ ? s0 : a.completions_[a.selection_].text)) {
      return;
    }
    if (a.matchType_ === CompletersNS.MatchType.emptyResult && str.startsWith(s0)) { return; }
    if (!str) { a.isHttps_ = a.baseHttps_ = null; }
    let i = a.input_.selectionStart, arr: RegExpExecArray | null;
    if (a.isSearchOnTop_) { /* empty */ }
    else if (i > s1.length - 2) {
      if (s1.endsWith(" +") && !a.timer_ && str.slice(0, -2).trimRight() === s0) {
        return;
      }
    } else if ((arr = a._pageNumRe.exec(s0)) && str.endsWith(arr[0])) {
      const j = arr[0].length, s2 = s1.slice(0, s1.trimRight().length - j);
      if (s2.trim() !== s0.slice(0, -j).trimRight()) {
        a.input_.value = s2.trimRight();
        a.input_.setSelectionRange(i, i);
      }
    }
    const { isComposing } = event;
    if (Build.MinCVer >= BrowserVer.Min$InputEvent$$isComposing || !(Build.BTypes & BrowserType.Chrome)
        || isComposing != null) {
      if (isComposing && !a.isInputComposing_) {
        a.lastNormalInput_ = a.input_.value.trim();
      }
      a.isInputComposing_ = isComposing as NonNullable<typeof isComposing>;
    }
    a.update_(-1);
  },
  omni_ (response: BgVomnibarSpecialReq[kBgReq.omni_omni]): void {
    const a = Vomnibar_;
    if (!a.isActive_) { return; }
    const list = response.l, height = list.length;
    a.total_ = response.t;
    a.showFavIcon_ = response.i;
    a.matchType_ = response.m;
    a.completions_ = list;
    a.selection_ = response.a ? 0 : -1;
    a.isSelOriginal_ = true;
    a.isSearchOnTop_ = height > 0 && list[0].type === "search";
    return a.populateUI_();
  },
  populateUI_ (): void {
    const a = Vomnibar_;
    const len = a.completions_.length, notEmpty = len > 0, oldH = a.height_, list = a.list_;
    const height = a.height_
      = Math.ceil(notEmpty ? len * PixelData.Item + PixelData.OthersIfNotEmpty : PixelData.OthersIfEmpty),
    needMsg = height !== oldH, earlyPost = height > oldH || a.sameOrigin_,
    wdZoom = Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && (!(Build.BTypes & ~BrowserType.Chrome)
              || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)
        ? a.docZoom_ * devicePixelRatio : a.docZoom_,
    msg: VomnibarNS.FReq[VomnibarNS.kFReq.style] & VomnibarNS.Msg<VomnibarNS.kFReq.style> = {
      N: VomnibarNS.kFReq.style, h: height * wdZoom
    };
    oldH || (msg.m = Math.ceil(a.mode_.r * PixelData.Item + PixelData.OthersIfNotEmpty) * wdZoom);
    if (needMsg && earlyPost) { VPort_.postToOwner_(msg); }
    a.completions_.forEach(a.parse_, a);
    list.innerHTML = a.renderItems_(a.completions_);
    oldH || (a.bodySt_.display = "");
    let cl = a.barCls_, c = "empty";
    notEmpty ? cl.remove(c) : cl.add(c);
    cl = list.classList, c = "no-favicon";
    a.showFavIcon_ ? cl.remove(c) : cl.add(c);
    if (notEmpty) {
      if (a.selection_ === 0) {
        list.firstElementChild.classList.add("s");
      }
      list.lastElementChild.classList.add("b");
    }
    if (earlyPost) {
      return a.postUpdate_();
    } else {
      requestAnimationFrame(() => { needMsg && VPort_.postToOwner_(msg); return Vomnibar_.postUpdate_(); });
    }
  },
  postUpdate_ (): void {
    let func: typeof Vomnibar_.onUpdate_;
    const a = Vomnibar_;
    if (!a.showing_) { a.show_(); }
    if (a.timer_ > 0) { return; }
    a.timer_ = 0;
    a.isEditing_ = false;
    if (func = a.onUpdate_) {
      a.onUpdate_ = null;
      return func.call(a);
    }
  },
  toggleStyle_ (req: BgVomnibarSpecialReq[kBgReq.omni_toggleStyle]): void {
    let omniStyles = Vomnibar_.styles_, toggle = ` ${req.t} `;
    omniStyles = omniStyles && ` ${omniStyles} `;
    omniStyles = omniStyles.indexOf(toggle) >= 0 ? omniStyles.replace(toggle, " ") : omniStyles + req.t;
    omniStyles = omniStyles.trim();
    Vomnibar_.styles_ = omniStyles;
    Vomnibar_.onStyleUpdate_(omniStyles);
    if (toggle && !req.c) {
      VPort_.post_({
        H: kFgReq.setOmniStyle,
        s: omniStyles
      });
    }
  },
  onStyleUpdate_ (omniStyles: string): void {
    omniStyles = ` ${omniStyles} `;
    if (Vomnibar_.darkBtn_) {
      Vomnibar_.darkBtn_.textContent = omniStyles.indexOf(" dark ") >= 0 ? "\u2600" : "\u263D";
    }
    // Note: should not use style[title], because "title" on style/link has special semantics
    // https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
    for (const style of (document.querySelectorAll("style[id]") as {} as HTMLStyleElement[])) {
      const key = " " + style.id + " ", found = omniStyles.indexOf(key) >= 0;
      (style.sheet as CSSStyleSheet).disabled = !found;
      if (found) {
        omniStyles = omniStyles.replace(key, " ");
      }
    }
    omniStyles = omniStyles.trim();
    const docEl = document.documentElement as HTMLHtmlElement;
    docEl.className !== omniStyles && (docEl.className = omniStyles);
  },
  ToggleDark_ (this: void, event: MouseEvent): void {
    Vomnibar_.toggleStyle_({ t: "dark", c: event.ctrlKey });
  },
  updateOptions_ (response: Req.bg<kBgReq.omni_updateOptions>): void {
    const delta = Object.setPrototypeOf(response.d, null),
    { css_, maxMatches_, queryInterval_, styles_: styles } = delta;
    if (styles != null && Vomnibar_.styles_ !== styles) {
      Vomnibar_.styles_ = styles;
      Vomnibar_.onStyleUpdate_(styles);
    }
    css_ != null && Vomnibar_.css_(css_);
    maxMatches_ != null && (Vomnibar_.maxMatches_ = maxMatches_);
    queryInterval_ != null && (Vomnibar_.queryInterval_ = queryInterval_);
  },
  OnWndFocus_ (this: void, event: Event): void {
    const a = Vomnibar_, byCode = a.focusByCode_, blurred = event.type === "blur", target = event.target;
    if ((Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
          ? !event.isTrusted : event.isTrusted === false) || !VPort_) { return; }
    a.focusByCode_ = false;
    if (!a.isActive_ || target !== window) {
      target === a.input_ &&
      (Vomnibar_.focused_ = !blurred) && (Vomnibar_.blurWanted_ = false);
      return;
    }
    if (byCode) {
      a.blurred_(blurred);
      return;
    }
    setTimeout(a.blurred_, 50, null);
    if (!blurred) {
      VPort_.post_({ H: kFgReq.cmd, c: "", n: 1, i: -1 });
      if (a.pageType_ === VomnibarNS.PageType.ext && VPort_) {
        setTimeout(function (): void {
          VPort_ && !VPort_._port && VPort_.postToOwner_({ N: VomnibarNS.kFReq.broken });
        }, 50);
      }
    }
  },
  blurred_ (this: void, blurred?: boolean): void {
    if (!Vomnibar_) { return; }
    const a = (document.body as HTMLBodyElement).classList;
    // Document.hidden is since C33, according to MDN
    !Vomnibar_.isActive_ || (blurred != null ? !blurred : document.hidden || document.hasFocus())
      ? a.remove("transparent") : a.add("transparent");
  },
  init_ (): void {
    const a = Vomnibar_;
    window.onclick = function (e) { Vomnibar_.onClick_(e); };
    a.onWheel_ = a.onWheel_.bind(a);
    Object.setPrototypeOf(a.ctrlMap_, null);
    Object.setPrototypeOf(a.normalMap_, null);
    const list = a.list_ = document.getElementById("list") as EnsuredMountedHTMLElement;
    const ver: BrowserVer = Build.BTypes & BrowserType.Chrome ? a.browserVer_ : BrowserVer.assumedVer,
    listen = addEventListener,
    input = a.input_ = document.getElementById("input") as typeof Vomnibar_.input_;
    a.barCls_ = (input.parentElement as HTMLElement).classList;
    list.oncontextmenu = a.OnMenu_;
    (document.getElementById("close") as HTMLElement).onclick = function (): void { return Vomnibar_.hide_(); };

    listen("keydown", a.HandleKeydown_, true);
    listen("focus", a.OnWndFocus_, true);
    listen("blur", a.OnWndFocus_, true);
    input.oninput = a.onInput_.bind(a);
    input.onselect = a.OnSelect_;

    a.renderItems_ = VUtils_.makeListRenderer_((document.getElementById("template") as HTMLElement).innerHTML);
    if (Build.MinCVer < BrowserVer.MinSpecCompliantShadowBlurRadius
        && Build.BTypes & BrowserType.Chrome
        && ver < BrowserVer.MinSpecCompliantShadowBlurRadius) {
      const css = document.querySelector("style") as HTMLStyleElement;
      if (css) {
        // ignore the "1.5px" in <style #dark>
        css.textContent = css.textContent.replace("0 2px 7px", "0 2px 10px").replace("0 0 1.5px", "0 0 1px");
      }
    }
    if (Build.MinCVer < BrowserVer.MinRoundedBorderWidthIsNotEnsured
        && Build.BTypes & BrowserType.Chrome
        && ver < BrowserVer.MinRoundedBorderWidthIsNotEnsured
        || Build.BTypes & BrowserType.Edge
            && (!(Build.BTypes & ~BrowserType.Edge) || a.browser_ === BrowserType.Edge)) {
      // is old Chrome or Edge
      const css = document.createElement("style");
      css.type = "text/css";
      css.textContent = !(Build.BTypes & BrowserType.Edge)
          || Build.BTypes & BrowserType.Chrome && ver < BrowserVer.MinRoundedBorderWidthIsNotEnsured
        ? `.item, #input { border-width: ${
          Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo &&
          ver < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo ? 1 : 0.01}px; }`
        : "#input::-ms-clear { display: none; }";
      (document.head as HTMLHeadElement).appendChild(css);
    }
    if (Build.MinCVer < BrowserVer.Min$InputEvent$$isComposing
        && Build.BTypes & BrowserType.Chrome
        && ver < BrowserVer.Min$InputEvent$$isComposing) {
      let func = function (this: HTMLInputElement, event: CompositionEvent): void {
        if (Vomnibar_.isInputComposing_ = event.type === "compositionstart") {
          Vomnibar_.lastNormalInput_ = this.value.trim();
        }
      };
      input.addEventListener("compositionstart", func);
      input.addEventListener("compositionend", func);
    }
    a.styleEl_ && (document.head as HTMLElement).appendChild(a.styleEl_);
    a.darkBtn_ = document.querySelector("#toggle-dark") as HTMLElement | null;
    a.darkBtn_ && (a.darkBtn_.onclick = a.ToggleDark_);
    a.onStyleUpdate_(a.styles_);
    a.init_ = VUtils_.makeListRenderer_ = null as never;
    if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || a.browser_ === BrowserType.Chrome)
          && (Build.MinCVer >= BrowserVer.MinSVG$Path$Has$d$CSSAttribute
              || ver >= BrowserVer.MinSVG$Path$Has$d$CSSAttribute)
        || a.bodySt_.d != null) {
      return;
    }
    const styles = (document.querySelector("style") || {} as HTMLStyleElement).textContent || "",
    re = <RegExpG & RegExpSearchable<2>> /\.([a-z]+)\s?\{(?:[^}]+;)?\s*d\s?:\s*path\r?\s?\(\s?['"](.+?)['"]\s?\)/g,
    pathMap = Object.create<string>(null);
    let arr: RegExpExecArray | null;
    while (arr = re.exec(styles)) { pathMap[arr[1]] = arr[2]; }
    a.getTypeIcon_ = function (sug: Readonly<SuggestionE>): string {
      const type = sug.type, path = pathMap[type];
      return path ? `${type}" d="${path}` : type;
    };
  },
  css_ (css: string): void {
    let st = Vomnibar_.styleEl_;
    if (!css) {
      st && st.remove();
      Vomnibar_.styleEl_ = null;
      return;
    }
    if (!st) {
      st = Vomnibar_.styleEl_ = <HTMLStyleElement | null> document.querySelector("#custom")
        || document.createElement("style");
      st.type = "text/css";
      st.id = "custom";
      Vomnibar_.init_ || (document.head as HTMLElement).appendChild(st);
    }
    st.textContent = css;
  },
  getTypeIcon_ (sug: Readonly<SuggestionE>): string { return sug.type; },
  preInit_ (type: VomnibarNS.PageType): void {
    const a = Vomnibar_;
    a.bodySt_ = (document.documentElement as HTMLHtmlElement).style;
    a.pageType_ = type;
    let fav: 0 | 1 | 2 = 0, f: () => chrome.runtime.Manifest, manifest: chrome.runtime.Manifest;
    const canShowOnExtOrWeb = Build.MinCVer >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon
          || Build.BTypes & BrowserType.Chrome
              && a.browserVer_ >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon;
    if (( !(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
          : a.browser_ !== BrowserType.Chrome)
        || type === VomnibarNS.PageType.web
        || location.origin.indexOf("-") < 0) { /* empty */ }
    else if (type === VomnibarNS.PageType.inner) {
      fav = canShowOnExtOrWeb || a.sameOrigin_ ? 2 : 0;
    } else if ((canShowOnExtOrWeb || a.sameOrigin_) && (f = chrome.runtime.getManifest) && (manifest = f())) {
      const arr = manifest.permissions || [];
      fav = arr.indexOf("<all_urls>") >= 0 || arr.indexOf("chrome://favicon/") >= 0 ? a.sameOrigin_ ? 2 : 1 : 0;
    }
    a.mode_.i = fav;
  },
  HandleKeydown_ (this: void, event: KeyboardEvent): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
        : event.isTrusted !== true && !(event.isTrusted == null && event instanceof KeyboardEvent)) { return; }
    Vomnibar_.keyResult_ = HandlerResult.Prevent as HandlerResult;
    if (window.onkeyup) {
      let stop = !event.repeat, now: number = 0;
      if (!Vomnibar_.lastScrolling_) {
        stop = event.keyCode > VKeyCodes.ctrlKey || event.keyCode < VKeyCodes.shiftKey;
      } else if (stop || (now = Date.now()) - Vomnibar_.lastScrolling_ > 40 || now < Vomnibar_.lastScrolling_) {
        VPort_.postToOwner_({ N: stop ? VomnibarNS.kFReq.scrollEnd : VomnibarNS.kFReq.scrollGoing });
        Vomnibar_.lastScrolling_ = now;
      }
      if (stop) { window.onkeyup = null as never; }
    } else if (Vomnibar_.isActive_) {
      Vomnibar_.onKeydown_(event);
    }
    if (Vomnibar_.keyResult_ === HandlerResult.Nothing) { return; }
    VUtils_.Stop_(event, Vomnibar_.keyResult_ === HandlerResult.Prevent);
  },
  returnFocus_ (this: void, request: BgVomnibarSpecialReq[kBgReq.omni_returnFocus]): void {
    type VoidPost = <K extends keyof VomnibarNS.FReq> (this: void, msg: VomnibarNS.FReq[K] & VomnibarNS.Msg<K>) => void;
    setTimeout<VomnibarNS.FReq[VomnibarNS.kFReq.focus] & VomnibarNS.Msg<VomnibarNS.kFReq.focus>>(VPort_.postToOwner_ as
      VoidPost, 0, { N: VomnibarNS.kFReq.focus, l: request.l });
  },
  _realDevRatio: 0,
  onInnerWidth_ (w?: number): void {
    Vomnibar_.mode_.c = Math.round(((w || innerWidth) / Vomnibar_.docZoom_
      - PixelData.AllHNotUrl) / PixelData.MeanWidthOfChar);
  },
  secret_: null as ((request: BgVomnibarSpecialReq[kBgReq.omni_init]) => void) | null,

  mode_: {
    H: kFgReq.omni as kFgReq.omni,
    o: "omni" as CompletersNS.ValidTypes,
    t: "omni" as CompletersNS.ValidTypes,
    c: 0,
    r: 0,
    f: 0,
    i: 0 as 0 | 1 | 2,
    q: ""
  },
  _spacesRe: <RegExpG> /\s+/g,
  _singleQuoteRe: <RegExpG> /'/g,
  fetch_ (): void {
    const a = Vomnibar_;
    let mode: Req.fg<kFgReq.omni> = a.mode_
      , str: string, last: string, newMatchType = CompletersNS.MatchType.Default;
    a.timer_ = -1;
    if (a.useInput_) {
      a.lastQuery_ = str = a.input_.value.trim();
      if (!a.isInputComposing_) { /* empty */ }
      else if (str.startsWith(last = a.lastNormalInput_)) {
        str = last + str.slice(last.length).replace(a._singleQuoteRe, "");
      } else {
        str = str.replace(a._singleQuoteRe, " ");
      }
      str = str.replace(a._spacesRe, " ");
      if (str === mode.q) { return a.postUpdate_(); }
      mode.t = a.matchType_ < CompletersNS.MatchType.singleMatch || !str.startsWith(mode.q) ? a.modeType_
        : a.matchType_ === CompletersNS.MatchType.searchWanted ? "search"
        : (newMatchType = a.matchType_, a.completions_[0].type as CompletersNS.ValidTypes);
      mode.q = str;
      a.onInnerWidth_();
      a.matchType_ = newMatchType;
    } else {
      a.useInput_ = true;
    }
    return VPort_.post_(mode);
  },

  _favPrefix: "",
  parse_ (item: SuggestionE): void {
    let str: string | undefined;
    item.relevancy = Vomnibar_.showRelevancy_ ? `\n\t\t\t<span class="relevancy">${item.relevancy}</span>` : "";
    (str = item.label) && (item.label = ` <span class="label">${str}</span>`);
    if (Build.BTypes & BrowserType.Firefox) {
      if (item.favIcon) {
        item.favIcon = Vomnibar_._favPrefix + VUtils_.escapeCSSStringInAttr_(item.favIcon) + "&quot;);";
        return;
      }
    }
    item.favIcon = (str = Vomnibar_.showFavIcon_ ? item.url : "") && Vomnibar_._favPrefix +
        ((str = Vomnibar_._parseFavIcon(item, str)) ? VUtils_.escapeCSSStringInAttr_(str) : "about:blank") + "&quot;);";
  },
  _parseFavIcon (item: SuggestionE, url: string): string {
    let str = url.slice(0, 11).toLowerCase();
    return str.startsWith("vimium://") ? "chrome-extension://" + (VCID_ || chrome.runtime.id) + "/pages/options.html"
      : url.length > 512 || str === "javascript:" || str.startsWith("data:") ? ""
      : item.type === "search" && !item.visited
        ? url.startsWith("http") ? url.slice(0, (url.indexOf("/", url[4] === "s" ? 8 : 7) + 1) || void 0) : ""
      : url;
  },
  navigateToUrl_ (url: string, reuse: ReuseType, https: boolean | null): void {
    if (url.charCodeAt(10) === KnownKey.colon && url.slice(0, 11).toLowerCase() === "javascript:") {
      VPort_.postToOwner_({ N: VomnibarNS.kFReq.evalJS, u: url });
      return;
    }
    VPort_.post_({ H: kFgReq.openUrl, r: reuse, h: https, u: url, o: true });
    if (reuse === ReuseType.newBg
        && (!Vomnibar_.lastQuery_ || (<RegExpOne> /^\+\d{0,2}$/).exec(Vomnibar_.lastQuery_))) {
      return Vomnibar_.refresh_();
    }
  },
  gotoSession_ (item: SuggestionE & { sessionId: string | number }): void {
    VPort_.post_({
      H: kFgReq.gotoSession,
      a: Vomnibar_.actionType_ > ReuseType.newBg,
      s: item.sessionId
    });
    if (Vomnibar_.actionType_ === ReuseType.newBg) {
      return Vomnibar_.refresh_(item.type === "tab");
    }
  },
  refresh_ (waitFocus?: boolean): void {
    getSelection().removeAllRanges();
    if (!waitFocus) {
      return Vomnibar_.doRefresh_(150);
    }
    window.onfocus = function (e: Event): void {
      window.onfocus = null as never;
      if ((Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? e.isTrusted : e.isTrusted !== false) && VPort_._port) {
        Vomnibar_.doRefresh_(17);
      }
    };
  },
  OnUnload_ (e: Event): void {
    if (!VPort_
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !e.isTrusted : e.isTrusted === false)) { return; }
    Vomnibar_.isActive_ = false;
    Vomnibar_.timer_ > 0 && clearTimeout(Vomnibar_.timer_);
    VPort_.postToOwner_({ N: VomnibarNS.kFReq.unload });
  }
},
VUtils_ = {
  makeListRenderer_ (this: void, template: string): Render {
    const a = template.split(/\{\{(\w+)}}/g);
    return function (objectArray): string {
      let html = "", len = a.length - 1;
      for (const o of objectArray) {
        let j = 0;
        for (; j < len; j += 2) {
          html += a[j];
          const key = a[j + 1];
          html += key === "typeIcon" ? Vomnibar_.getTypeIcon_(o) : o[key as keyof SuggestionE] || "";
        }
        html += a[len];
      }
      return html;
    };
  },
  decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try {
      url = (decode || decodeURI)(url);
    } catch {}
    return url;
  },
  ensureText_ (sug: SuggestionEx): ProtocolType {
    let { url, text } = sug, str = url.slice(0, 8).toLowerCase();
    let i = str.startsWith("http://") ? ProtocolType.http : str === "https://" ? ProtocolType.https
            : ProtocolType.others;
    i >= url.length && (i = ProtocolType.others);
    let wantSchema = !i;
    if (i === ProtocolType.https) {
      let j = url.indexOf("/", i);
      if (j > 0 ? j < url.length : /* domain has port */ (<RegExpOne> /:\d+\/?$/).test(url)) {
        wantSchema = true;
      }
    }
    if (!text) {
      text = !wantSchema && i ? url.slice(i) : url;
    } else if (i) {
      if (wantSchema && !text.startsWith(str)) {
        text = str + text;
      }
      if (url.endsWith("/") && !str.endsWith("/") && str.indexOf("/") > 0) {
        text += "/";
      }
    }
    sug.text = text;
    if (str = sug.title) {
      (sug as Writeable<typeof sug>).title = str.replace(<RegExpG> /<\/?match>/g, "").replace(
          <RegExpG & RegExpSearchable<1>> /&(amp|apos|gt|lt|quot);|\u2026/g, VUtils_.onHTMLEntity);
    }
    return i;
  },
  onHTMLEntity (_s0: string, str: string): string {
    return str === "amp" ? "&" : str === "apos" ? "'" : str === "quot" ? '"'
      : str === "gt" ? ">" : str === "lt" ? "<" : "";
  },
  escapeCSSStringInAttr_ (s0: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === KnownKey.and ? "&amp;" : i === KnownKey.quote1 ? "&apos;"
        : i < KnownKey.quote1 ? "%22" : i === KnownKey.lt ? "%3C" : "%3E";
    }
    VUtils_.escapeCSSStringInAttr_ = function (s): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return VUtils_.escapeCSSStringInAttr_(s0);
  },
  Stop_ (event: Event, prevent: boolean | BOOL): void {
    prevent && event.preventDefault();
    event.stopImmediatePropagation();
  }
},
VPort_ = {
  _port: null as FgPort | null,
  postToOwner_: null as never as <K extends keyof VomnibarNS.FReq> (this: void
      , msg: VomnibarNS.FReq[K] & VomnibarNS.Msg<K>) => void | 1,
  post_<K extends keyof FgReq> (request: FgReq[K] & Req.baseFg<K>): void {
    try {
      (this._port || this.connect_(PortType.omnibarRe)).postMessage<K>(request);
    } catch {
      VPort_ = null as never;
      this.postToOwner_({ N: VomnibarNS.kFReq.broken });
    }
  },
  _Listener<T extends ValidBgVomnibarReq> (this: void, response: Req.bg<T>): void {
    const name = response.N;
    name === kBgReq.omni_omni ? Vomnibar_.omni_(response as Req.bg<kBgReq.omni_omni>) :
    name === kBgReq.omni_parsed ? Vomnibar_.parsed_(response as Req.bg<kBgReq.omni_parsed>) :
    name === kBgReq.omni_init ? Vomnibar_.secret_ && Vomnibar_.secret_(response as Req.bg<kBgReq.omni_init>) :
    name === kBgReq.omni_returnFocus ? Vomnibar_.returnFocus_(response as Req.bg<kBgReq.omni_returnFocus>) :
    name === kBgReq.omni_toggleStyle ? Vomnibar_.toggleStyle_(response as Req.bg<kBgReq.omni_toggleStyle>) :
    name === kBgReq.omni_updateOptions ? Vomnibar_.updateOptions_(response as Req.bg<kBgReq.omni_updateOptions>) :
    name === kBgReq.injectorRun ? 0 :
    // tslint:disable-next-line: no-unused-expression
    0;
  },
  _OnOwnerMessage ({ data: data }: { data: VomnibarNS.CReq[keyof VomnibarNS.CReq] }): void {
    type Res = VomnibarNS.CReq;
    let name: keyof VomnibarNS.CReq = typeof data === "number" ? data : (data as VomnibarNS.Msg<keyof Res>).N;
    name === VomnibarNS.kCReq.activate ? Vomnibar_.activate_(data as VomnibarNS.CReq[VomnibarNS.kCReq.activate]) :
    name === VomnibarNS.kCReq.backspace ? Vomnibar_.onAction_(AllowedActions.backspace) :
    name === VomnibarNS.kCReq.focus ? Vomnibar_.focus_() :
    name === VomnibarNS.kCReq.hide ? Vomnibar_.hide_(1) :
    // tslint:disable-next-line: no-unused-expression
    0;
  },
  _ClearPort (this: void): void { VPort_._port = null; },
  connect_ (type: PortType): FgPort {
    const data = { name: PortNameEnum.Prefix + type + (VCID_ ? PortNameEnum.Delimiter + BuildStr.Commit : "") },
    port = VPort_._port = (VCID_ ? chrome.runtime.connect(VCID_, data) : chrome.runtime.connect(data)) as FgPort;
    port.onDisconnect.addListener(VPort_._ClearPort);
    port.onMessage.addListener(VPort_._Listener as (message: object) => void);
    return port;
  }
};

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith) {
"".startsWith || (String.prototype.startsWith = function (this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
});
"".endsWith || (String.prototype.endsWith = function (this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
}

if (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : window.browser && (browser as typeof chrome).runtime) {
  window.chrome = browser as typeof chrome;
}
(function (): void {
  if ((document.documentElement as HTMLHtmlElement).dataset.version !== "1.73") {
    location.href = "about:blank";
    return;
  }
  let curEl: HTMLScriptElement | undefined | null;
  if (location.pathname.startsWith("/front/") || !(curEl = document.currentScript as HTMLScriptElement | null)) {
    /* is inner or web */
  }
  else if (curEl.src.endsWith("/front/vomnibar.js") && !(<RegExpOne> /^ftp|^http/).test(curEl.src)) {
    VCID_ = new URL(curEl.src).hostname;
    if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && VCID_.indexOf("-") > 0) {
      VCID_ = curEl.dataset.vimiumId || BuildStr.FirefoxID;
    }
  } else {
    curEl.remove();
    return;
  }

  const unsafeMsg = [] as Array<[number, VomnibarNS.IframePort, Options | null]>,
  isWeb = curEl === null;
  let _sec = 0 as number,
  handler = function (this: void, secret: number, port: VomnibarNS.IframePort, options: Options | null): void {
    if (_sec < 1 || secret !== _sec) {
      _sec || unsafeMsg.push([secret, port, options]);
      return;
    }
    _sec = -1;
    clearTimeout(timer);
    if (isWeb) {
      removeEventListener("message", onUnknownMsg, true);
    } else {
      window.onmessage = null as never;
    }
    Vomnibar_.sameOrigin_ = !!port.sameOrigin;
    VPort_.postToOwner_ = port.postMessage.bind(port);
    port.onmessage = VPort_._OnOwnerMessage;
    window.onunload = Vomnibar_.OnUnload_;
    VPort_.postToOwner_({ N: VomnibarNS.kFReq.iframeIsAlive, o: options ? 1 : 0 });
    if (options) {
      Vomnibar_.activate_(options);
    }
  },
  timer = setTimeout(function () { location.href = "about:blank"; }, 700);
  Vomnibar_.secret_ = function (this: void, request): void {
    Vomnibar_.secret_ = null;
    const payload = request.l;
    if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
      Vomnibar_.browser_ = payload.browser_ as BrowserType;
    }
    if (Build.BTypes & BrowserType.Chrome) {
      Vomnibar_.browserVer_ = payload.browserVer_ as NonNullable<typeof payload.browserVer_>;
    }
    Vomnibar_.maxMatches_ = payload.maxMatches_;
    Vomnibar_.queryInterval_ = payload.queryInterval_;
    Vomnibar_.styles_ = payload.styles_;
    Vomnibar_.css_(payload.css_);
    const { s: secret } = request;
    _sec = secret;
    for (const i of unsafeMsg) {
      if (i[0] === secret) {
        unsafeMsg.length = 0;
        return handler(i[0], i[1], i[2]);
      }
    }
  };
  if (isWeb) {
    addEventListener("message", onUnknownMsg, true);
  } else {
    window.onmessage = onUnknownMsg;
  }
  function onUnknownMsg(event: MessageEvent): void {
    if (event.source === parent) {
      const data: VomnibarNS.MessageData = event.data;
      if (!(data && data.length === 2 && data[0] >= 0)) { return; }
      isWeb && VUtils_.Stop_(event, 0); // smell like VomnibarNS.MessageData
      handler(data[0], event.ports[0], data[1]);
    }
  }
  VPort_.connect_(PortType.omnibar);
})();
