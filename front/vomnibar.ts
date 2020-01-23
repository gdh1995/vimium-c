/// <reference path="../content/base.d.ts" />
interface SuggestionE extends Readonly<CompletersNS.BaseSuggestion> {
  favIcon?: string;
  label?: string;
  r: number | string;
}
interface SuggestionEx extends SuggestionE {
  https_: boolean;
  parsed_?: string;
  t: string;
}
type Render = (this: void, list: ReadonlyArray<Readonly<SuggestionE>>, element: HTMLElement) => void;
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
  dismiss, focus, blurInput, backspace, blur, up, down = up + 2, toggle, pageup, pagedown, remove
}
declare var setTimeout: SetTimeout;
interface SetTimeout {
  <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
    timeout: number, a1: T1, a2: T2, a3: T3): number;
  <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
  <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
}

interface ConfigurableItems {
  VomnibarMaxPageNum?: number;
}
// tslint:disable-next-line: no-empty-interface
interface Window extends ConfigurableItems {}
declare var parent: unknown;
import PixelData = VomnibarNS.PixelData;

// tslint:disable-next-line: triple-equals
if (typeof VApi == "object" && VApi && typeof VApi.destroy_ == "function") {
  VApi.destroy_(1);
}

var VCID_: string | undefined = VCID_ || "", VHost_: string | undefined = VHost_ || "", Vomnibar_ = {
  pageType_: VomnibarNS.PageType.Default,
  activate_ (options: Options): void {
    VUtils_.safer_(options);
    const a = Vomnibar_;
    a.mode_.o = ((options.mode || "") + "") as CompletersNS.ValidTypes || "omni";
    a.mode_.t = CompletersNS.SugType.Empty;
    a.updateQueryFlag_(CompletersNS.QueryFlags.TabInCurrentWindow, options.currentWindow ? 1 : 0);
    a.updateQueryFlag_(CompletersNS.QueryFlags.TabTree, options.tree ? 1 : 0);
    a.updateQueryFlag_(CompletersNS.QueryFlags.MonospaceURL, null);
    a.forceNewTab_ = !!options.newtab;
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
          - a.baseHeightIfNotEmpty_
          - (PixelData.MarginTop - ((PixelData.MarginV2 / 2 + 1) | 0) - PixelData.ShadowOffset * 2
             + GlobalConsts.MaxScrollbarWidth)
        ) / a.itemHeight_), a.maxMatches_));
    a.mode_.r = max;
    a.init_ && a.preInit_(options.t);
    if (Build.BTypes & ~BrowserType.Firefox) {
      a.bodySt_.zoom = dz > 1 ? dz + "" : "";
    } else {
      a.bodySt_.fontSize = dz > 1 ? dz + "px" : "";
    }
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || a.browser_ === BrowserType.Firefox)) {
      /* empty */
    } else if (a.mode_.i) {
      scale = scale === 1 ? 1 : scale < 3 ? 2 : scale < 3.5 ? 3 : 4;
/**
 * Note: "@1x" is necessary, because only the whole 'size/aa@bx/' can be optional
 * * definition: https://cs.chromium.org/chromium/src/chrome/browser/ui/webui/favicon_source.h?type=cs&q=FaviconSource&g=0&l=47
 * * parser: https://cs.chromium.org/chromium/src/components/favicon_base/favicon_url_parser.cc?type=cs&q=ParseFaviconPath&g=0&l=33
 */
      const prefix = '" style="background-image: url(&quot;';
      // if (Build.BTypes >= BrowserVer.MinChromeFavicon2 || a.browserVer_ >= BrowserVer.MinChromeFavicon2) {
      //   a._favPrefix = prefix + "chrome://favicon2/?size=16&scale_factor=" + scale + "x&url_type=page_url&url=";
      // } else
      {
        a._favPrefix = prefix + "chrome://favicon/size/16@" + scale + "x/";
      }
    }
    keyword = (keyword || "") + "";
    if (url == null) {
      return a.reset_(keyword && keyword + " ");
    }
    if (search) {
      start = search.s;
      url = search.u;
      keyword || (keyword = search.k);
    } else if (search === null) {
      url = VUtils_.decodeURL_(url).replace(<RegExpG> /\s$/g, "%20");
      if (!keyword && (<RegExpI> /^https?:\/\//i).test(url)) {
        a.baseHttps_ = (url.charCodeAt(4) | kCharCode.CASE_DELTA) === kCharCode.s;
        url = url.slice(a.baseHttps_ ? 8 : 7, url.indexOf("/", 8) === url.length - 1 ? -1 : void 0);
      }
    } else {
      url = VUtils_.decodeURL_(url, decodeURIComponent).trim().replace(a.spacesRe_, " ");
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
  sugTypes_: CompletersNS.SugType.Empty,
  focused_: false,
  showing_: false,
  codeFocusTime_: 0,
  codeFocusReceived_: false,
  blurWanted_: false,
  forceNewTab_: false,
  sameOrigin_: false,
  showFavIcon_: 0 as 0 | 1 | 2,
  showRelevancy_: false,
  docZoom_: 1,
  lastScrolling_: 0,
  height_: 0,
  input_: null as never as HTMLInputElement & Ensure<HTMLInputElement
      , "selectionDirection" | "selectionEnd" | "selectionStart">,
  bodySt_: null as never as CSSStyleDeclaration,
  barCls_: null as never as DOMTokenList,
  isSelOriginal_: true,
  lastKey_: kKeyCode.None,
  keyResult_: HandlerResult.Nothing,
  list_: null as never as EnsuredMountedHTMLElement,
  onUpdate_: null as (() => void) | null,
  doEnter_: null as ((this: void) => void) | null,
  renderItems_: null as never as Render,
  selection_: -1,
  afterHideTimer_: 0,
  timer_: 0,
  wheelStart_: 0,
  wheelTime_: 0,
  wheelDelta_: 0,
  browser_: !(Build.BTypes & ~BrowserType.Chrome)
      || !(Build.BTypes & ~BrowserType.Firefox) || !(Build.BTypes & ~BrowserType.Edge)
      ? Build.BTypes : BrowserType.Chrome,
  browserVer_: Build.BTypes & BrowserType.Chrome ? BrowserVer.assumedVer : BrowserVer.assumedVer,
  os_: kOS.win as SettingsNS.ConstItems["o"][1],
  mapModifier_: 0 as SettingsNS.AllVomnibarItems["a"][1],
  mappedKeyRegistry_: null as SettingsNS.AllVomnibarItems["k"][1],
  maxMatches_: 0,
  queryInterval_: 0,
  heightIfEmpty_: VomnibarNS.PixelData.OthersIfEmpty,
  baseHeightIfNotEmpty_: VomnibarNS.PixelData.OthersIfNotEmpty,
  itemHeight_: VomnibarNS.PixelData.Item,
  styles_: "",
  styleEl_: null as HTMLStyleElement | null,
  darkBtn_: null as HTMLElement | null,
  wheelOptions_: { passive: false, capture: true } as const,
  show_ (): void {
    const a = Vomnibar_;
    a.showing_ = true;
    setTimeout(a.focus_, 34);
    addEventListener("wheel", a.onWheel_, a.wheelOptions_);
  },
  hide_ (fromContent?: BOOL): void {
    const a = Vomnibar_, el = a.input_;
    a.isActive_ = a.showing_ = a.isEditing_ = a.isInputComposing_ = a.blurWanted_ = a.codeFocusReceived_ = false;
    a.codeFocusTime_ = 0;
    removeEventListener("wheel", a.onWheel_, a.wheelOptions_);
    a.timer_ > 0 && clearTimeout(a.timer_);
    window.onkeyup = null as never;
    el.blur();
    fromContent || VPort_.post_({ H: kFgReq.nextFrame, t: Frames.NextType.current, k: a.lastKey_ });
    if (Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval && Build.BTypes & BrowserType.Chrome) {
      a.bodySt_.zoom = "";
      (Build.BTypes & BrowserType.Firefox && a.browser_ === BrowserType.Firefox
          ? (document.body as HTMLBodyElement).style : a.bodySt_).display = "none";
    } else if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || a.browser_ === BrowserType.Firefox)) {
      a.bodySt_.cssText = "";
      (document.body as HTMLBodyElement).style.display = "none";
    } else {
      a.bodySt_.cssText = "display: none;";
    }
    a.list_.textContent = el.value = "";
    a.list_.style.height = "";
    a.barCls_.remove("empty");
    a.list_.classList.remove("no-favicon");
    if (a.sameOrigin_) { return a.onHidden_(); }
    a.afterHideTimer_ = requestAnimationFrame(a.AfterHide_);
    a.timer_ = setTimeout(a.AfterHide_, 35);
  },
  AfterHide_ (this: void): void {
    const a = Vomnibar_;
    cancelAnimationFrame(a.afterHideTimer_);
    clearTimeout(a.timer_);
    if (a.height_) {
      a.onHidden_();
    }
  },
  onHidden_ (): void {
    VPort_.postToOwner_({ N: VomnibarNS.kFReq.hide });
    const a = Vomnibar_;
    a.timer_ = a.height_ = a.matchType_ = a.sugTypes_ = a.wheelStart_ = a.wheelTime_ = a.actionType_ =
    a.total_ = a.lastKey_ = a.wheelDelta_ = 0;
    a.docZoom_ = 1;
    a.completions_ = a.onUpdate_ = a.isHttps_ = a.baseHttps_ = null as never;
    a.mode_.q = a.lastQuery_ = a.inputText_ = a.lastNormalInput_ = "";
    a.mode_.o = "omni";
    a.mode_.t = CompletersNS.SugType.Empty;
    a.isSearchOnTop_ = false;
    a.doEnter_ ? setTimeout(a.doEnter_, 0) : (<RegExpOne> /a?/).test("");
    a.doEnter_ = null;
  },
  reset_ (input: string, start?: number, end?: number): void {
    const a = Vomnibar_;
    a.inputText_ = input;
    a.useInput_ = a.showing_ = false;
    a.isHttps_ = a.baseHttps_;
    a.mode_.q = a.lastQuery_ = input && input.trim().replace(a.spacesRe_, " ");
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
    if (!a.showing_) {
      a.codeFocusTime_ = 0; a.codeFocusReceived_ = false; // clean again, in case of unknown race conditions
      return;
    }
    a.codeFocusTime_ = performance.now();
    a.codeFocusReceived_ = false;
    if (focus !== false) {
      if (Build.BTypes & BrowserType.Firefox) {
        window.focus();
      }
      a.input_.focus();
      if (!a.codeFocusReceived_ || !a.focused_) {
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
    Vomnibar_.update_(wait, function (): void {
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
    if (line.parsed_) {
      return a._updateInput(line, line.parsed_);
    }
    (line as Partial<SuggestionEx>).https_ == null && (line.https_ = line.u.startsWith("https://"));
    if (line.e !== "history" && line.e !== "tab") {
      if (line.parsed_ == null) {
        VUtils_.ensureText_(line);
        line.parsed_ = "";
      }
      a._updateInput(line, line.t);
      if (line.e === "math") {
        a.input_.select();
      }
      return;
    }
    const onlyUrl = !line.t, url = line.u;
    const ind = VUtils_.ensureText_(line);
    let str = onlyUrl ? url : VUtils_.decodeURL_(url, decodeURIComponent);
    if (!onlyUrl && str.length === url.length && url.includes("%")) {
      // has error during decoding
      str = line.t;
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
    line.parsed_ = search ? (Vomnibar_.mode_.o.endsWith("omni") ? "" : ":o ")
        + search.k + " " + search.u + " " : line.t;
    if (id === Vomnibar_.selection_) {
      return Vomnibar_._updateInput(line, line.parsed_);
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
    str = str === (line.title || line.u) ? (line.parsed_ || line.t)
      : line.title && str === line.u ? line.title
      : str === line.t ? line.u : line.t;
    return a._updateInput(line, str);
  },
  _updateInput (line: SuggestionEx, str: string): void {
    const maxW = str.length * 10, tooLong = maxW > innerWidth - PixelData.AllHNotInput;
    Vomnibar_.input_.value = str;
    tooLong && (Vomnibar_.input_.scrollLeft = maxW);
    Vomnibar_.isHttps_ = line.https_ && str === line.t;
    Vomnibar_.isEditing_ = str !== line.parsed_ || line.parsed_ === line.t;
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
  _keyNames: Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome
      ? [kChar.space, kChar.pageup, kChar.pagedown, kChar.end, kChar.home,
        kChar.left, kChar.up, kChar.right, kChar.down,
        /* 41 */ "", "", "", "", kChar.insert, kChar.delete] as readonly kChar[]
      : 0 as never,
  _codeCorrectionMap: ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"],
  _modifierKeys: {
    __proto__: null as never,
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
  } as SafeEnum,
  keyIdCorrectionOffset_: (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? 185 : 0 as never) as 185 | 300,
  char_ (event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "location" | "shiftKey">): string {
    const charCorrectionList = kChar.CharCorrectionList, enNumTrans = kChar.EnNumTrans;
    let {key, shiftKey} = event;
    if (!(Build.BTypes & BrowserType.Edge)
        || Build.BTypes & ~BrowserType.Edge && Vomnibar_.browser_ !== BrowserType.Edge
        ? Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome && !key
        : true) {
      let {keyCode: i} = event, keyId: kCharCode;
      key = i > kKeyCode.space - 1 && i < kKeyCode.minNotDelete ? this._keyNames[i - kKeyCode.space]
        : i < kKeyCode.minNotDelete || i === kKeyCode.osRightMac
        ? i === kKeyCode.backspace ? kChar.backspace
            : i === kKeyCode.esc ? kChar.esc
            : i === kKeyCode.tab ? kChar.tab : i === kKeyCode.enter ? kChar.enter
            : (i === kKeyCode.osRightMac || i > kKeyCode.minAcsKeys - 1 && i < kKeyCode.maxAcsKeys + 1)
              && Vomnibar_.mapModifier_ && Vomnibar_.mapModifier_ === event.location ? kChar.Modifier
            : kChar.None
        : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn ? "f" + (i - kKeyCode.maxNotFn)
        : (key = Build.BTypes & ~BrowserType.Chrome ? <string | undefined> event.keyIdentifier || ""
              : event.keyIdentifier as string).startsWith("U+") && (keyId = parseInt(key.slice(2), 16))
        ? keyId < kCharCode.minNotAlphabet && keyId > kCharCode.minNotSpace - 1
          ? shiftKey && keyId > kCharCode.maxNotNum && keyId < kCharCode.minNotNum ? enNumTrans[keyId - kCharCode.N0]
            : String.fromCharCode(keyId < kCharCode.minAlphabet || shiftKey ? keyId : keyId + kCharCode.CASE_DELTA)
          : keyId > this.keyIdCorrectionOffset_ && ((keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11)
          ? charCorrectionList[keyId + 12 * +shiftKey]
          : ""
        : "";
    } else {
      let code = event.code as string, prefix = code.slice(0, 2), mapped: number | undefined;
      if (prefix !== "Nu") { // not (Numpad* or NumLock)
        if (prefix === "Ke" || prefix === "Di" || prefix === "Ar") {
          code = code.slice(code < "K" ? 5 : 3);
        }
        key = code.length === 1
              ? !shiftKey || code < "0" || code > "9" ? code : enNumTrans[+code]
              : this._modifierKeys[key as string]
                ? Vomnibar_.mapModifier_ && event.location === Vomnibar_.mapModifier_ ? kChar.Modifier : ""
              : !code ? key
              : (mapped = this._codeCorrectionMap.indexOf(code)) < 0 ? code === "Escape" ? kChar.esc : code
              : charCorrectionList[mapped + 12 * +shiftKey]
            ;
      }
      key = shiftKey && (key as string).length < 2 ? key as string
          : key === "Unidentified" ? "" : (key as string).toLowerCase();
    }
    return key;
  },
  key_ (event: EventControlKeys, ch: string): string {
    if (!(Build.NDEBUG || ch.length === 1 || ch.length > 1 && ch === ch.toLowerCase())) {
      console.error(`Assert error: Vomnibar_.key_ get an invalid char of "${ch}" !`);
    }
    let modifiers = `${event.altKey ? "a-" : ""}${event.ctrlKey ? "c-" : ""}${event.metaKey ? "m-" : ""}`
      , isLong = ch.length > 1, chLower = ch.toLowerCase();
    event.shiftKey && (isLong || modifiers && ch.toUpperCase() !== chLower) && (modifiers += "s-");
    return isLong || modifiers ? `<${modifiers}${chLower}>` : ch;
  },
  mappedKey_ (event: KeyboardEvent): string {
    const char = Vomnibar_.char_(event);
    let key = char && Vomnibar_.key_(event, char), mapped: string | undefined, chLower: string;
    if (!key || key.length < 2 && Vomnibar_.focused_) { return ""; }
    if (Vomnibar_.mappedKeyRegistry_) {
      key = Vomnibar_.mappedKeyRegistry_[key] || (
        (mapped = Vomnibar_.mappedKeyRegistry_[chLower = char.toLowerCase()]) && mapped.length < 2 ? (
          mapped = char === chLower ? mapped : mapped.toUpperCase(),
          Vomnibar_.key_(event, mapped)
        ) : key
      );
    }
    return key;
  },
  ctrlCharOrShiftKeyMap_: {
    // for Ctrl / Meta
    space: AllowedActions.toggle, b: AllowedActions.pageup
    , j: AllowedActions.down, k: AllowedActions.up, n: AllowedActions.down, p: AllowedActions.up
    , "[": AllowedActions.dismiss, "]": AllowedActions.toggle
    // for Shift
    , up: AllowedActions.pageup, down: AllowedActions.pagedown
    , tab: AllowedActions.up, delete: AllowedActions.remove
  } as Readonly<Dict<AllowedActions>>,
  normalMap_: {
    tab: AllowedActions.down, esc: AllowedActions.dismiss
    , pageup: AllowedActions.pageup, pagedown: AllowedActions.pagedown
    , up: AllowedActions.up, down: AllowedActions.down
    , f1: AllowedActions.backspace, f2: AllowedActions.blur
  } as Readonly<Dict<AllowedActions>>,
  onKeydown_ (event: KeyboardEventToPrevent): void {
    const a = Vomnibar_, n = event.keyCode, focused = a.focused_,
    key = n !== kKeyCode.ime ? a.mappedKey_(event) : "";
    a.lastKey_ = n;
    if (!key) {
      a.keyResult_ = focused && !(n === kKeyCode.menuKey && a.os_) && n !== kKeyCode.ime
          ? HandlerResult.Suppress : HandlerResult.Nothing;
      return;
    }
    let action: AllowedActions = AllowedActions.nothing;
    const char = key.length > 1 ? key.slice(key[2] === "-" ? 3 : 1, -1) : key,
    mainModifier = key.slice(1, 3) as "a-" | "c-" | "m-" | "s-" | "unknown" | "";
    if (mainModifier === "a-" || mainModifier === "m-") {
      if (char === "f2") {
        return a.onAction_(focused ? AllowedActions.blurInput : AllowedActions.focus);
      }
      else if (!focused) { /* empty */ }
      else if (char.length === 1 && char > "a" && char < "g" && char !== "c"
          || char === kChar.backspace && a.os_) {
        return a.onBashAction_(char.length === 1
            ? char.charCodeAt(0) - (kCharCode.maxNotAlphabet | kCharCode.CASE_DELTA) : -1);
      }
      if (mainModifier === "a-") { a.keyResult_ = HandlerResult.Nothing; return; }
    }
    if ((char === kChar.enter || char.endsWith(`-${kChar.enter}`))) {
      if (event.key === "Enter" || n === kKeyCode.enter) {
        window.onkeyup = a.OnEnterUp_;
      } else {
        a.onEnter_(key);
      }
      return;
    }
    if (mainModifier === "c-" || mainModifier === "m-") {
      if (char.startsWith("s-")) {
        action = char === "s-f" ? AllowedActions.pagedown : char === "s-b" ? AllowedActions.pageup
          : AllowedActions.nothing;
      } else if (char === kChar.up || char === kChar.down || char === kChar.end || char === kChar.home) {
        event.preventDefault();
        a.lastScrolling_ = Date.now();
        window.onkeyup = Vomnibar_.HandleKeydown_;
        VPort_.postToOwner_({ N: VomnibarNS.kFReq.scroll,
          keyCode: char === kChar.up ? kKeyCode.up : char === kChar.down ? kKeyCode.down
              : char === kChar.end ? kKeyCode.end : kKeyCode.home
        });
        return;
      } else if (Build.BTypes & ~BrowserType.Firefox
          && (!(Build.BTypes & BrowserType.Firefox) || a.browser_ !== BrowserType.Firefox)
          && key === `<c-${kChar.backspace}>` && !a.os_) {
        return a.onBashAction_(-1);
      } else if (char === kChar.delete) {
        a.keyResult_ = HandlerResult.Suppress;
      } else {
        action = char === "[" ? AllowedActions.dismiss : char === "]" ? AllowedActions.toggle
          : a.ctrlCharOrShiftKeyMap_[char] || AllowedActions.nothing;
      }
    }
    else if (mainModifier === "s-") {
      action = a.ctrlCharOrShiftKeyMap_[char] || AllowedActions.nothing;
    }
    else if (action = a.normalMap_[char] || AllowedActions.nothing) { /* empty */ }
    else if (char > "f0" && char < "f:") { // "f" + N
      a.keyResult_ = HandlerResult.Nothing;
      return;
    }
    else if (n === kKeyCode.backspace) {
      if (focused) { a.keyResult_ = HandlerResult.Suppress; }
      return;
    }
    else if (n !== kKeyCode.space || char !== kChar.space) { /* empty */ }
    else if (!focused) { action = AllowedActions.focus; }
    else if ((a.selection_ >= 0
        || a.completions_.length <= 1) && a.input_.value.endsWith("  ")) {
      return a.onEnter_(true);
    }
    if (action) {
      return a.onAction_(action);
    }

    let ind: number;
    if (focused || char.length !== 1 || isNaN(ind = parseInt(char, 16))) {
      a.keyResult_ = focused && !(n === kKeyCode.menuKey && a.os_) ? HandlerResult.Suppress : HandlerResult.Nothing;
    } else {
      ind = ind || 10;
      if (ind <= a.completions_.length) {
        a.onEnter_(key, ind - 1);
      }
    }
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
    case AllowedActions.remove: return a.removeCur_();
    }
  },
  onBashAction_ (code: number): void {
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || Vomnibar_.browser_ === BrowserType.Firefox)
        && code < 0) { // alt/ctrl/meta + backspace
      Vomnibar_.input_.value = "";
      Vomnibar_.onInput_();
      return;
    }
    const sel = getSelection(), isExtend = code === 4 || code < 0;
    sel.type === "Caret" && sel.modify(isExtend ? "extend" : "move", code < 4 ? "backward" : "forward", "word");
    if (isExtend && Vomnibar_.input_.selectionStart < Vomnibar_.input_.selectionEnd) {
      document.execCommand("delete");
    }
  },
  _pageNumRe: <RegExpOne> /(?:^|\s)(\+\d{0,2})$/,
  goPage_ (dirOrNum: boolean | number): void {
    const a = Vomnibar_;
    if (a.isSearchOnTop_) { return; }
    const len = a.completions_.length, n = a.mode_.r;
    let str = len ? a.completions_[0].e : "", delta = +dirOrNum || -1;
    str = (a.isSelOriginal_ || a.selection_ < 0 ? a.input_.value : a.inputText_).trimRight();
    let arr = a._pageNumRe.exec(str), i = ((arr && arr[0]) as string | undefined | number as number) | 0;
    if (len >= n) { delta *= n; }
    else if (i > 0 && delta < 0) { delta *= i >= n ? n : 1; }
    else if (len < (len && a.completions_[0].e !== "tab" ? n : 3)) { return; }

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
    a.update_(0);
  },
  onEnter_ (event?: KeyStat | true | string, newSel?: number): void {
    const a = Vomnibar_;
    let sel = newSel != null ? newSel : a.selection_;
    if (typeof event === "string") {
      event = (event.includes("a-") ? KeyStat.altKey : 0) + (event.includes("c-") ? KeyStat.ctrlKey : 0)
          + (event.includes("m-") ? KeyStat.metaKey : 0) + (event.includes("s-") ? KeyStat.shiftKey : 0);
    }
    a.actionType_ = event == null ? a.actionType_
      : event === true ? a.forceNewTab_ ? ReuseType.newFg : ReuseType.current
      : event & KeyStat.PrimaryModifier ? event & KeyStat.shiftKey ? ReuseType.newBg : ReuseType.newFg
      : event & KeyStat.shiftKey || !a.forceNewTab_ ? ReuseType.current : ReuseType.newFg;
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
    type UrlInfo = Pick<CompletersNS.Suggestion, "u"> & Partial<Pick<CompletersNS.Suggestion, "s">>;
    const item: SuggestionE | UrlInfo = sel >= 0 ? a.completions_[sel] : { u: a.input_.value.trim() },
    action = a.actionType_, https = a.isHttps_,
    func = function (this: void): void {
      item.s != null ? Vomnibar_.gotoSession_(item as SuggestionE & Ensure<SuggestionE, "s">)
        : Vomnibar_.navigateToUrl_(item.u, action, https);
      (<RegExpOne> /a?/).test("");
    };
    if (a.actionType_ < ReuseType.newFg) { return func(); }
    a.doEnter_ = func;
    a.hide_();
  },
  OnEnterUp_ (this: void, event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? event.isTrusted
        : event.isTrusted !== false
    ) { // call onEnter once an enter / control key is up
      window.onkeyup = null as never;
      Vomnibar_.lastKey_ = kKeyCode.None;
      Vomnibar_.onEnter_((event.altKey || keyCode === kKeyCode.altKey ? KeyStat.altKey : 0)
          + (event.ctrlKey || keyCode === kKeyCode.ctrlKey ? KeyStat.ctrlKey : 0)
          + (event.metaKey || keyCode > kKeyCode.maxNotMetaKey && keyCode < kKeyCode.minNotMetaKeyOrMenu
              ? KeyStat.metaKey : 0)
          + (event.shiftKey || keyCode === kKeyCode.shiftKey ? KeyStat.shiftKey : 0));
    }
  },
  removeCur_ (): void {
    if (Vomnibar_.selection_ < 0) { return; }
    const completion = Vomnibar_.completions_[Vomnibar_.selection_], type = completion.e;
    if (type !== "tab" && (type !== "history" || completion.s != null)) {
      VPort_.postToOwner_({ N: VomnibarNS.kFReq.hud, k: kTip.failToDelSug });
      return;
    }
    VPort_.post_({
      H: kFgReq.removeSug,
      t: type,
      u: type === "tab" ? completion.s + "" : completion.u
    });
    return Vomnibar_.refresh_();
  },
  onClick_ (event: MouseEventToPrevent): void {
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
    a.lastKey_ = kKeyCode.None;
    a.onEnter_(<number> <boolean|number> event.altKey |
      (<number> <boolean|number> event.ctrlKey * 2) |
      (<number> <boolean|number> event.metaKey * 4) |
      (<number> <boolean|number> event.shiftKey * 8), [].indexOf.call(a.list_.children, el));
  },
  OnMenu_ (this: void, event: Event): void {
    let el = event.target as SafeHTMLElement, item: Element | null, Anchor = HTMLAnchorElement;
    if (!(el instanceof Anchor)) { el = el.parentElement as SafeHTMLElement; }
    if (!(el instanceof Anchor) || el.href) { return; }
    for (item = el; item && item.parentElement !== Vomnibar_.list_;
          item = item.parentElement as SafeHTMLElement | null) {
      /* empty */
    }
    const _i = [].indexOf.call(Vomnibar_.list_.children, item);
    _i >= 0 && (el.href = Vomnibar_.completions_[_i].u);
  },
  OnSelect_ (this: HTMLInputElement): void {
    let el = this as typeof Vomnibar_.input_;
    if (el.selectionStart !== 0 || el.selectionDirection !== "backward") { return; }
    let left = el.value,
    end = el.selectionEnd - 1;
    if (left.charCodeAt(end) !== kCharCode.space || end === left.length - 1) { return; }
    left = left.slice(0, end).trimRight();
    if (!left.includes(" ")) {
      el.setSelectionRange(0, left.length, "backward");
    }
  },
  OnTimer_ (this: void): void { if (Vomnibar_) { return Vomnibar_.fetch_(); } },
  onWheel_ (event: WheelEvent & ToPrevent): void {
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
  onInput_ (event?: InputEvent): void {
    const a = Vomnibar_, s0 = a.lastQuery_, s1 = a.input_.value, str = s1.trim();
    a.blurWanted_ = false;
    if (str === (a.selection_ === -1 || a.isSelOriginal_ ? s0 : a.completions_[a.selection_].t)) {
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
    const isComposing = !!event && event.isComposing;
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
    a.sugTypes_ = response.s;
    a.completions_ = list;
    a.selection_ = response.a ? 0 : -1;
    a.isSelOriginal_ = true;
    a.isSearchOnTop_ = height > 0 && list[0].e === "search";
    return a.populateUI_();
  },
  populateUI_ (): void {
    const a = Vomnibar_;
    const len = a.completions_.length, notEmpty = len > 0, oldH = a.height_, list = a.list_;
    const height = a.height_
      = Math.ceil(notEmpty ? len * a.itemHeight_ + a.baseHeightIfNotEmpty_ : a.heightIfEmpty_),
    needMsg = height !== oldH, earlyPost = height > oldH || a.sameOrigin_,
    wdZoom = Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && (!(Build.BTypes & ~BrowserType.Chrome)
              || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)
        ? a.docZoom_ * devicePixelRatio : a.docZoom_,
    msg: VomnibarNS.FReq[VomnibarNS.kFReq.style] & VomnibarNS.Msg<VomnibarNS.kFReq.style> = {
      N: VomnibarNS.kFReq.style, h: height * wdZoom
    };
    oldH || (msg.m = Math.ceil(a.mode_.r * a.itemHeight_ + a.baseHeightIfNotEmpty_) * wdZoom);
    if (needMsg && earlyPost) { VPort_.postToOwner_(msg); }
    a.completions_.forEach(a.Parse_);
    a.renderItems_(a.completions_, list);
    if (!oldH) {
      (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || a.browser_ === BrowserType.Firefox)
        ? (document.body as HTMLBodyElement).style : a.bodySt_).display = "";
    }
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
    const oldStyles = Vomnibar_.styles_ && ` ${Vomnibar_.styles_} `, toggle = ` ${req.t} `,
    add = !oldStyles.includes(toggle),
    omniStyles = (add ? oldStyles + req.t : oldStyles.replace(toggle, " ")).trim().replace(Vomnibar_.spacesRe_, " ");
    Vomnibar_.styles_ = omniStyles;
    Vomnibar_.onStyleUpdate_(omniStyles);
    if (!req.c) {
      VPort_.post_({
        H: kFgReq.setOmniStyle,
        t: req.t,
        o: 1,
        e: add,
      });
    }
  },
  onStyleUpdate_ (omniStyles: string): void {
    omniStyles = ` ${omniStyles} `;
    if (Vomnibar_.darkBtn_) {
      Vomnibar_.darkBtn_.textContent = omniStyles.includes(" dark ") ? "\u2600" : "\u263D";
    }
    const monospaceURL = omniStyles.includes(" mono-url ");
    // Note: should not use style[title], because "title" on style/link has special semantics
    // https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
    for (const style of (document.querySelectorAll("style[id]") as {} as HTMLStyleElement[])) {
      const key = " " + style.id + " ", found = key === " custom " || omniStyles.includes(key);
      (style.sheet as CSSStyleSheet).disabled = !found;
      if (found) {
        omniStyles = omniStyles.replace(key, " ");
      }
    }
    omniStyles = omniStyles.trim().replace(Vomnibar_.spacesRe_, " ");
    const docEl = document.documentElement as HTMLHtmlElement;
    docEl.className !== omniStyles && (docEl.className = omniStyles);
    if (!!(Vomnibar_.mode_.f & CompletersNS.QueryFlags.MonospaceURL) !== monospaceURL) {
      Vomnibar_.updateQueryFlag_(CompletersNS.QueryFlags.MonospaceURL, monospaceURL);
      if (Vomnibar_.isActive_ && !Vomnibar_.init_) {
        Vomnibar_.refresh_(Build.MinCVer < BrowserVer.Min$document$$hidden && Build.BTypes & BrowserType.Chrome
            && Vomnibar_.browserVer_ < BrowserVer.Min$document$$hidden ? document.webkitHidden : document.hidden);
      }
    }
  },
  updateOptions_ (response: Req.bg<kBgReq.omni_updateOptions>): void {
    const delta = VUtils_.safer_(response.d), styles = delta.s;
    if (styles != null && Vomnibar_.styles_ !== styles) {
      Vomnibar_.styles_ = styles;
      Vomnibar_.onStyleUpdate_(styles);
    }
    delta.c != null && Vomnibar_.css_(delta.c);
    delta.a != null && (Vomnibar_.mapModifier_ = delta.a);
    delta.n != null && (Vomnibar_.maxMatches_ = delta.n);
    delta.t != null && (Vomnibar_.queryInterval_ = delta.t);
    delta.k !== undefined && (Vomnibar_.mappedKeyRegistry_ = delta.k);
    if (delta.l != null) {
      let sizes = delta.l.split(","), n = +sizes[0], m = Math.min, M = Math.max;
      Vomnibar_.heightIfEmpty_ = M(24, m(n || VomnibarNS.PixelData.OthersIfEmpty, 320));
      n = +sizes[1];
      Vomnibar_.baseHeightIfNotEmpty_ = M(24, m(Vomnibar_.heightIfEmpty_
          + (n || (VomnibarNS.PixelData.OthersIfNotEmpty - VomnibarNS.PixelData.OthersIfEmpty)), 320));
      n = +sizes[2];
      Vomnibar_.itemHeight_ = M(14, m(n || VomnibarNS.PixelData.Item, 120));
    }
  },
  OnWndFocus_ (this: void, event: Event): void {
    const a = Vomnibar_, byCode = a.codeFocusTime_ && performance.now() - a.codeFocusTime_ < 120,
    blurred = event.type === "blur", target = event.target;
    if ((Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
          ? !event.isTrusted : event.isTrusted === false) || !VPort_) { return; }
    a.codeFocusReceived_ = true;
    if (!a.isActive_ || target !== window) {
      target === a.input_ &&
      (Vomnibar_.focused_ = !blurred) && (Vomnibar_.blurWanted_ = false);
      return;
    }
    a.codeFocusTime_ = 0;
    if (byCode) {
      a.blurred_(blurred);
      return;
    }
    setTimeout(a.blurred_, 50, null);
    if (!blurred) {
      VPort_.post_({ H: kFgReq.cmd, c: "", n: 1, i: -1, r: 0 });
      if (a.pageType_ === VomnibarNS.PageType.ext && VPort_) {
        setTimeout(function (): void {
          VPort_ && !VPort_._port && VPort_.postToOwner_({ N: VomnibarNS.kFReq.broken });
        }, 50);
      }
    }
  },
  blurred_ (this: void, blurred?: boolean): void {
    if (!Vomnibar_) { return; }
    const doc = document, a = (doc.body as HTMLBodyElement).classList, kTransparent = "transparent" as const;
    // Document.hidden is since C33, according to MDN
    !Vomnibar_.isActive_ ||
      (blurred != null ? !blurred
        : (Build.MinCVer < BrowserVer.Min$document$$hidden
            && Build.BTypes & BrowserType.Chrome && Vomnibar_.browserVer_ < BrowserVer.Min$document$$hidden
            ? doc.webkitHidden : doc.hidden
          ) || doc.hasFocus())
      ? a.remove(kTransparent) : a.add(kTransparent);
  },
  init_ (): void {
    const a = Vomnibar_;
    window.onclick = function (e) { Vomnibar_.onClick_(e); };
    a.onWheel_ = a.onWheel_.bind(a);
    VUtils_.safer_(a.ctrlCharOrShiftKeyMap_);
    VUtils_.safer_(a.normalMap_);
    const list = a.list_ = document.getElementById("list") as EnsuredMountedHTMLElement;
    const ver: BrowserVer = Build.BTypes & BrowserType.Chrome ? a.browserVer_ : BrowserVer.assumedVer,
    listen = addEventListener,
    input = a.input_ = document.getElementById("input") as typeof Vomnibar_.input_;
    a.barCls_ = (input.parentElement as HTMLElement).classList;
    list.onmouseover = list.oncontextmenu = a.OnMenu_;
    (document.getElementById("close") as HTMLElement).onclick = function (): void { return Vomnibar_.hide_(); };

    listen("keydown", a.HandleKeydown_, true);
    listen("focus", a.OnWndFocus_, true);
    listen("blur", a.OnWndFocus_, true);
    input.oninput = (a.onInput_ as (e: InputEvent) => void as (e: Event) => void).bind(a);
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
    if (Build.BTypes & ~BrowserType.Firefox
        && (!(Build.BTypes & BrowserType.Firefox) || a.browser_ !== BrowserType.Firefox)) {
      let func = function (this: HTMLInputElement, event: CompositionEvent): void {
        if (Vomnibar_.isInputComposing_ = event.type === "compositionstart") {
          if (Build.MinCVer >= BrowserVer.Min$InputEvent$$isComposing) { return; }
          Vomnibar_.lastNormalInput_ = this.value.trim();
        }
      };
      (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || a.browser_ === BrowserType.Edge)
        || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$InputEvent$$isComposing
            && ver < BrowserVer.Min$InputEvent$$isComposing) &&
      input.addEventListener("compositionstart", func);
      input.addEventListener("compositionend", func);
    }
    a.styleEl_ && (document.head as HTMLElement).appendChild(a.styleEl_);
    a.darkBtn_ = document.querySelector("#toggle-dark") as HTMLElement | null;
    a.darkBtn_ && (a.darkBtn_.onclick = (event: MouseEvent): void => {
      Vomnibar_.toggleStyle_({ t: "dark", c: event.ctrlKey });
      Vomnibar_.input_.focus();
    });
    a.onStyleUpdate_(a.styles_);
    if (a.pageType_ === VomnibarNS.PageType.inner) {
      for (const el of document.querySelectorAll("[title]") as ArrayLike<Element> as HTMLElement[]) {
        let t = chrome.i18n.getMessage(el.title.replace(" ", "_"));
        t && (el.title = t);
      }
    }
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
      const type = sug.e, path = pathMap[type];
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
  getTypeIcon_ (sug: Readonly<SuggestionE>): string { return sug.e; },
  preInit_ (type: VomnibarNS.PageType): void {
    const a = Vomnibar_, docEl = document.documentElement as HTMLHtmlElement;
    a.bodySt_ = docEl.style;
    a.pageType_ = type;
    let fav: 0 | 1 | 2 = 0, f: () => chrome.runtime.Manifest, manifest: chrome.runtime.Manifest
      , str: string | undefined;
    const canShowOnExtOrWeb = Build.MinCVer >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon
          || Build.BTypes & BrowserType.Chrome
              && a.browserVer_ >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon;
    if (type === VomnibarNS.PageType.web
        || !location.origin.includes("-")) { /* empty */ }
    else if (type === VomnibarNS.PageType.inner) {
      fav = canShowOnExtOrWeb || a.sameOrigin_ ? 2 : 0;
    } else if ((canShowOnExtOrWeb || a.sameOrigin_) && (str = docEl.dataset.favicons) != null) {
      fav = !str || str.toLowerCase() === "true" ? 2 : 0;
    } else if ((canShowOnExtOrWeb || a.sameOrigin_) && (f = chrome.runtime.getManifest) && (manifest = f())) {
      const arr = manifest.permissions || [];
      fav = arr.indexOf("<all_urls>") >= 0 || arr.indexOf("chrome://favicon/") >= 0 ? a.sameOrigin_ ? 2 : 1 : 0;
    }
    a.mode_.i = fav;
  },
  HandleKeydown_ (this: void, event: KeyboardEventToPrevent): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
        : event.isTrusted !== true && !(event.isTrusted == null && event instanceof KeyboardEvent)) { return; }
    Vomnibar_.keyResult_ = HandlerResult.Prevent as HandlerResult;
    if (window.onkeyup) {
      let stop = !event.repeat, now: number = 0;
      if (!Vomnibar_.lastScrolling_) {
        // clear state, to avoid OnEnterUp receives unrelated keys
        stop = event.keyCode > kKeyCode.maxAcsKeys || event.keyCode < kKeyCode.minAcsKeys;
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
    Vomnibar_.mode_.c = Math.floor(((w || innerWidth) / Vomnibar_.docZoom_ - PixelData.AllHNotUrl)
      / (Vomnibar_.mode_.f & CompletersNS.QueryFlags.MonospaceURL ? PixelData.MeanWidthOfMonoFont
        : PixelData.MeanWidthOfNonMonoFont));
  },
  updateQueryFlag_ (flag: CompletersNS.QueryFlags, enable: boolean | BOOL | null): void {
    let isFirst = enable == null;
    if (isFirst && flag === CompletersNS.QueryFlags.MonospaceURL) {
      enable = ` ${Vomnibar_.styles_} `.includes(" mono-url ");
    }
    var newFlag = (Vomnibar_.mode_.f & ~flag) | (enable ? flag : 0);
    if (Vomnibar_.mode_.f === newFlag) { return; }
    Vomnibar_.mode_.f = newFlag;
    if (flag === CompletersNS.QueryFlags.MonospaceURL && !isFirst) {
      Vomnibar_.onInnerWidth_();
    }
  },
  secret_: null as ((request: BgVomnibarSpecialReq[kBgReq.omni_init]) => void) | null,

  mode_: {
    H: kFgReq.omni as kFgReq.omni,
    o: "omni" as CompletersNS.ValidTypes,
    t: CompletersNS.SugType.Empty,
    c: 0,
    r: 0,
    f: CompletersNS.QueryFlags.None,
    i: 0 as 0 | 1 | 2,
    q: ""
  },
  spacesRe_: <RegExpG> /\s+/g,
  fetch_ (): void {
    const a = Vomnibar_;
    let mode: Req.fg<kFgReq.omni> = a.mode_
      , str: string, newMatchType = CompletersNS.MatchType.Default;
    a.timer_ = -1;
    if (a.useInput_) {
      a.lastQuery_ = str = a.input_.value.trim();
      if (a.isInputComposing_) {
        let last = a.lastNormalInput_, isStart = str.startsWith(last);
        str = (isStart ? last : "") + (isStart ? str.slice(last.length) : str).replace(<RegExpG> /'/g, "");
      }
      str = str.replace(a.spacesRe_, " ");
      if (str === mode.q) { return a.postUpdate_(); }
      mode.t = a.matchType_ < CompletersNS.MatchType.someMatches || !str.startsWith(mode.q) ? CompletersNS.SugType.Empty
        : a.matchType_ === CompletersNS.MatchType.searchWanted
        ? !str.includes(" ") ? CompletersNS.SugType.search : CompletersNS.SugType.Empty
        : (newMatchType = a.matchType_, a.sugTypes_);
      mode.q = str;
      a.matchType_ = newMatchType;
      a.onInnerWidth_();
    } else {
      a.useInput_ = true;
    }
    return VPort_.post_(mode);
  },

  _favPrefix: "",
  Parse_ (this: void, item: SuggestionE): void {
    let str: string | undefined;
    item.r = Vomnibar_.showRelevancy_ ? `\n\t\t\t<span class="relevancy">${item.r}</span>` : "";
    (str = item.label) && (item.label = ` <span class="label">${str}</span>`);
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || Vomnibar_.browser_ === BrowserType.Firefox)) {
      if (item.favIcon) {
        item.favIcon = `" style="background-image: url(&quot;${VUtils_.escapeCSSUrlInAttr_(item.favIcon)}&quot;);`;
      }
      return;
    }
    item.favIcon = (str = Vomnibar_.showFavIcon_ ? item.u : "") && Vomnibar_._favPrefix +
        VUtils_.escapeCSSUrlInAttr_(Vomnibar_._parseFavIcon(item, str) || "about:blank") +
        "&quot;);";
  },
  _parseFavIcon (item: SuggestionE, url: string): string {
    let str = url.slice(0, 11).toLowerCase(), optionsPage = "/pages/options.html";
    let i: number;
    return str.startsWith("vimium://")
      ? Vomnibar_.pageType_ !== VomnibarNS.PageType.ext
        ? chrome.runtime.getURL(optionsPage) : location.protocol + "//" + VHost_ + optionsPage
      : url.length > 512 || str === "javascript:" || str.startsWith("data:") ? ""
      : item.v
        || item.e === "history" && url
        || (str.startsWith("http")
              || str.lastIndexOf("-", str.indexOf(":") + 1 || 8) > 0 && url.lastIndexOf("://", 21) > 0
            ? (i = url.indexOf("/", url.indexOf("://") + 3), i > 0 ? url.slice(0, i + 1) : url + "/") : url);
  },
  navigateToUrl_ (url: string, reuse: ReuseType, https: boolean | null): void {
    if ((<RegExpI> /javascript:/i).test(url)) {
      VPort_.postToOwner_({ N: VomnibarNS.kFReq.evalJS, u: url });
      return;
    }
    VPort_.post_({ H: kFgReq.openUrl, r: reuse, h: https, u: url, o: true });
    if (reuse === ReuseType.newBg
        && (!Vomnibar_.lastQuery_ || (<RegExpOne> /^\+\d{0,2}$/).exec(Vomnibar_.lastQuery_))) {
      return Vomnibar_.refresh_();
    }
  },
  gotoSession_ (item: SuggestionE & Ensure<SuggestionE, "s">): void {
    VPort_.post_({
      H: kFgReq.gotoSession,
      a: Vomnibar_.actionType_ > ReuseType.newBg,
      s: item.s
    });
    if (Vomnibar_.actionType_ === ReuseType.newBg) {
      return Vomnibar_.refresh_(item.e === "tab");
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
  safer_: (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
      && !Object.setPrototypeOf ? function <T extends object> (obj: T): T & SafeObject {
        (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null)
    ) as (<T extends object> (opt: T) => T & SafeObject),
  makeListRenderer_ (this: void, template: string): Render {
    const a = template.split(/\{\{(\w+)}}/g);
    const parser = Build.BTypes & ~BrowserType.Firefox ? 0 as never : new DOMParser();
    return function (objectArray, element): void {
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
      if (Build.BTypes & ~BrowserType.Firefox) {
        element.innerHTML = html;
      } else {
        element.innerHTML = "";
        (element as NodeWithAppend).append(
          ... <Element[]> <ArrayLike<Element>> parser.parseFromString(html, "text/html").body.children);
      }
    };
  },
  decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try {
      url = (decode || decodeURI)(url);
    } catch {}
    return url;
  },
  ensureText_ (sug: SuggestionEx): ProtocolType {
    let { u: url, t: text } = sug, str = url.slice(0, 8).toLowerCase();
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
      if (url.endsWith("/") && !str.endsWith("/") && str.includes("/")) {
        text += "/";
      }
    }
    sug.t = text;
    if (str = sug.title) {
      (sug as Writable<typeof sug>).title = str.replace(<RegExpG> /<\/?match>/g, "").replace(
          <RegExpG & RegExpSearchable<1>> /&(amp|apos|gt|lt|quot);|\u2026/g, VUtils_.onHTMLEntity);
    }
    return i;
  },
  onHTMLEntity (_s0: string, str: string): string {
    return str === "amp" ? "&" : str === "apos" ? "'" : str === "quot" ? '"'
      : str === "gt" ? ">" : str === "lt" ? "<" : "";
  },
  escapeCSSUrlInAttr_ (s0: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === kCharCode.and ? "&amp;" : i === kCharCode.quote1 ? "&apos;"
        : i < kCharCode.quote1 ? "%22" : i === kCharCode.lt ? "%3C" : "%3E";
    }
    VUtils_.escapeCSSUrlInAttr_ = function (s): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return VUtils_.escapeCSSUrlInAttr_(s0);
  },
  Stop_: function (event: Event & Partial<ToPrevent>, prevent: boolean | BOOL): void {
    prevent && (event as EventToPrevent).preventDefault();
    event.stopImmediatePropagation();
  } as {
    (event: EventToPrevent, prevent: boolean | BOOL): void;
    (event: Event, prevent: false | 0): void;
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
    name === VomnibarNS.kCReq.focus ? Vomnibar_.focus_() :
    name === VomnibarNS.kCReq.hide ? Vomnibar_.hide_(1) :
    // tslint:disable-next-line: no-unused-expression
    0;
  },
  _ClearPort (this: void): void { VPort_._port = null; },
  connect_ (type: PortType): FgPort {
    const data = { name: VCID_ ? PortNameEnum.Prefix + type + (PortNameEnum.Delimiter + BuildStr.Commit)
        : !(Build.BTypes & ~BrowserType.Edge)
          || Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia
        ? type + PortNameEnum.Delimiter + location.href
        : "" + type },
    port = VPort_._port = (VCID_ ? chrome.runtime.connect(VCID_, data) : chrome.runtime.connect(data)) as FgPort;
    port.onDisconnect.addListener(VPort_._ClearPort);
    port.onMessage.addListener(VPort_._Listener as (message: object) => void);
    return port;
  }
};

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
"".startsWith || (String.prototype.startsWith = function (this: string, s: string): boolean {
  return this.lastIndexOf(s, 0) === 0;
});
"".endsWith || (String.prototype.endsWith = function (this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
"".includes || (String.prototype.includes = function (this: string, s: string, pos?: number): boolean {
  return this.indexOf(s, pos) >= 0;
});
}

if (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser === "object" && browser && (browser as typeof chrome).runtime) {
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
  else if (curEl.src.endsWith("/front/vomnibar.js") && !(<RegExpOne> /^(ht|s?f)tp/).test(curEl.src)) {
    VCID_ = new URL(curEl.src).host;
    Build.MinCVer < BrowserVer.Min$URL$NewableAndInstancesHaveProperties && Build.BTypes & BrowserType.Chrome &&
    (VCID_ = VCID_ || "");
    VHost_ = VCID_;
    if (!(Build.BTypes & BrowserType.Chrome)
        || Build.BTypes & ~BrowserType.Chrome && (VCID_ as string).includes("-")) {
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
  Vomnibar_.secret_ = function (this: void, {l: payload, s: secret}): void {
    Vomnibar_.secret_ = null;
    if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
      Vomnibar_.browser_ = payload.b as BrowserType;
    }
    if (Build.BTypes & BrowserType.Chrome) {
      Vomnibar_.browserVer_ = payload.v as BrowserVer;
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      payload.o || (Vomnibar_.keyIdCorrectionOffset_ = 300);
    }
    Vomnibar_.os_ = payload.o;
    Vomnibar_.mappedKeyRegistry_ = payload.k;
    Vomnibar_.styles_ = payload.s;
    Vomnibar_.updateOptions_({ N: kBgReq.omni_updateOptions, d: {
      c: payload.c, n: payload.n, t: payload.t, l: payload.l
    } });
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
