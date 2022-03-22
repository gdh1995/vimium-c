/// <reference path="../lib/base.omni.d.ts" />

const enum SimpleKeyResult { Nothing, Suppress, Prevent }
type SugToExec = Writable<Pick<CompletersNS.Suggestion, "u">>
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
  postMessage<K extends keyof FgRes> (request: Req.fgWithRes<K>): R;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  postMessage<K extends keyof FgReq> (request: Req.fg<K>): R;
}
interface FgPort extends chrome.runtime.Port, Post<1> {
}
type Options = VomnibarNS.FgOptions;
declare const enum AllowedActions {
  Default = 0,
  nothing = Default,
  dismiss, focus, blurInput, backspace, blur, up, down = up + 2, toggle, pageup, pagedown, remove
}
interface SetTimeout {
  <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
    timeout: number, a1: T1, a2: T2, a3: T3): number;
  <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
  <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
}
declare namespace Intl {
  interface DateTimeFormat {
    formatToParts? (date?: Date | number): Array<{ type: string, value: string }>;
  }
  interface RelativeTimeFormat {
    format (num: number, unit: "year" | "quarter" | "month" | "week" | "day" | "hour" | "minute" | "second"): string
  }
  const RelativeTimeFormat: { new (lang: string, options: {
    localeMatcher?: "best fit" | "lookup"; numeric?: "always" | "auto"; style?: "long" | "short" | "narrow"
  }): RelativeTimeFormat } | undefined
}
interface ConfigurableItems {
  VomnibarMaxPageNum?: number;
}
interface KnownDataset {
  vimiumId: string
  favicons: "" | "true" | "false" // if "" or "true" then always show favicons
  version: `${number}.${number}` // html version
  media: "" | "(...)"
}
interface Window extends ConfigurableItems {}
import PixelData = VomnibarNS.PixelData;
import SugType2 = CompletersNS.SugType

if (typeof VApi == "object" && VApi && typeof VApi.d == "function") {
  VApi.d(1);
}

// eslint-disable-next-line no-var
declare var AsOmni_: <T> (i: T) => T
if (!Build.NDEBUG) { (window as unknown as typeof globalThis).AsOmni_ = i => i }
// eslint-disable-next-line no-var
var VCID_: string | undefined = VCID_ || "", VHost_: string | undefined = VHost_ || "", Vomnibar_ = {
  pageType_: VomnibarNS.PageType.Default,
  activate_ (options: Options): void {
    VUtils_.safer_(options);
    const a = Vomnibar_;
    a.mode_.o = ((options.mode || "") + "") as CompletersNS.ValidTypes || "omni";
    a.mode_.t = CompletersNS.SugType.Empty;
    a.updateQueryFlag_(CompletersNS.QueryFlags.TabInCurrentWindow, !!options.currentWindow);
    a.updateQueryFlag_(CompletersNS.QueryFlags.PreferNewOpened, (options.preferTabs || "").includes("new"));
    a.updateQueryFlag_(CompletersNS.QueryFlags.TabTreeFromStart, options.tree === "from-start");
    a.updateQueryFlag_(CompletersNS.QueryFlags.TabTree, !!options.tree);
    a.updateQueryFlag_(CompletersNS.QueryFlags.MonospaceURL, null);
    a.updateQueryFlag_(CompletersNS.QueryFlags.ShowTime, null);
    a.updateQueryFlag_(CompletersNS.QueryFlags.NoTabEngine, !!options.noTabs);
    a.updateQueryFlag_(CompletersNS.QueryFlags.EvenHiddenTabs, !!options.hiddenTabs);
    a.updateQueryFlag_(CompletersNS.QueryFlags.IncognitoTabs, !!options.incognitoTabs)
    a.doesOpenInIncognito_ = options.incognito;
    a.updateQueryFlag_(CompletersNS.QueryFlags.NoSessions, !!options.noSessions)
    let engines = options.engines
    engines instanceof Array && (engines = engines.join() as keyof typeof CompletersNS.SugType)
    if (typeof engines === "string" && engines) {
      engines = (engines.includes("bookmark") ? SugType2.bookmark : 0)
          + (engines.includes("history") ? SugType2.history : 0)
          + (engines.includes("tab") ? SugType2.tab : 0)
          + (engines.includes("search") ? SugType2.search : 0)
          + (engines.includes("domain") ? SugType2.domain : 0)
    }
    a.mode_.e = ((engines as CompletersNS.SugType | "") || SugType2.Empty) | 0
    if (a.mode_.e) {
      a.mode_.o = "omni"
    }
    a.caseInsensitive_ = !!options.icase;
    a.forceNewTab_ = !!options.newtab;
    a.selectFirst_ = options.autoSelect;
    a.position_ = options.position
    a.notSearchInput_ = options.searchInput === false;
    a.baseHttps_ = null;
    a.noSessionsOnStart_ = options.noSessions === "start"
    {
      const sed = options.sed
      a.sed_ = typeof sed === "object" && sed || { r: sed, k: options.sedKeys || options.sedKey }
    }
    a.clickLike_ = options.clickLike
    a.activeOnCtrl_ = !!options.activeOnCtrl
    let { url, keyword, p: search } = options, start: number | undefined;
    let scale = Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
            && (!(Build.BTypes & ~BrowserType.Chrome)
                || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)
          ? devicePixelRatio : options.z
      , dz = a.docZoom_ = scale < 0.98 ? 1 / scale : 1;
    if (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
        && (!(Build.BTypes & ~BrowserType.Chrome)
            || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)) {
      a.onInnerWidth_((options.w * a.panelWidth_ + PixelData.MarginH * options.z) / scale);
    } else {
      a.onInnerWidth_(options.w * a.panelWidth_ + PixelData.MarginH);
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
    a.preInit_ && a.preInit_(options.t)
    if (Build.BTypes & ~BrowserType.Firefox) {
      a.docSt_.zoom = dz > 1 ? dz + "" : "";
    } else {
      a.docSt_.fontSize = dz > 1 ? dz + "px" : "";
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
        url = url.slice(a.baseHttps_ ? 0 : 7, url.indexOf("/", 8) === url.length - 1 ? -1 : void 0)
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
  doesOpenInIncognito_: null as VomnibarNS.GlobalOptions["incognito"],
  inputText_: "",
  lastQuery_: "",
  useInput_: true,
  completions_: null as never as SuggestionE[],
  total_: 0,
  maxPageNum_: Math.min(Math.max(3, (window.VomnibarMaxPageNum! | 0) || 10), 100),
  isEditing_: false,
  isInputComposing_: null as [left: number, right: number] | null,
  position_: null as OpenPageUrlOptions["position"],
  baseHttps_: null as boolean | null,
  isHttps_: null as boolean | null,
  isSearchOnTop_: false,
  actionType_: ReuseType.Default,
  matchType_: CompletersNS.MatchType.Default,
  sugTypes_: CompletersNS.SugType.Empty,
  resMode_: "",
  focused_: false,
  showing_: false,
  codeFocusTime_: 0,
  codeFocusReceived_: false,
  blurWanted_: false,
  forceNewTab_: false,
  selectFirst_: false as VomnibarNS.GlobalOptions["autoSelect"],
  notSearchInput_: false,
  noSessionsOnStart_: false,
  clickLike_: null as VomnibarNS.GlobalOptions["clickLike"],
  activeOnCtrl_: false,
  showFavIcon_: 0 as 0 | 1 | 2,
  showRelevancy_: false,
  docZoom_: 1,
  lastScrolling_: 0,
  height_: 0,
  input_: null as never as HTMLInputElement & Ensure<HTMLInputElement
      , "selectionDirection" | "selectionEnd" | "selectionStart">,
  docSt_: null as never as CSSStyleDeclaration,
  bodySt_: null as never as CSSStyleDeclaration,
  inputBar_: null as never as HTMLElement,
  barCls_: null as never as DOMTokenList,
  isSelOriginal_: true,
  lastKey_: kKeyCode.None,
  keyResult_: SimpleKeyResult.Nothing,
  list_: null as never as EnsuredMountedHTMLElement,
  onUpdate_: null as (() => void) | null,
  onWndBlur2_: null as (() => void) | null,
  doEnter_: null as [callback: (this: void) => void, reuse: ReuseType] | null,
  renderItems_: null as never as Render,
  selection_: -1,
  afterHideTimer_: 0,
  timer_: 0,
  inAlt_: 0,
  wheelStart_: 0,
  wheelTime_: 0,
  wheelDelta_: 0,
  browser_: Build.BTypes && !(Build.BTypes & (Build.BTypes - 1)) ? Build.BTypes : BrowserType.Chrome,
  browserVer_: BrowserVer.assumedVer,
  os_: (Build.OS & (Build.OS - 1) ? kOS.win : Build.OS < 8 ? (Build.OS / 2) | 0 : Math.log2(Build.OS)
      ) as SettingsNS.ConstItems["o"][1],
  caseInsensitive_: false,
  mapModifier_: 0 as SettingsNS.AllVomnibarItems["a"][1],
  mappedKeyRegistry_: null as SettingsNS.AllVomnibarItems["k"][1],
  maxMatches_: 0,
  queryInterval_: 0,
  heightIfEmpty_: VomnibarNS.PixelData.OthersIfEmpty,
  baseHeightIfNotEmpty_: VomnibarNS.PixelData.OthersIfNotEmpty,
  itemHeight_: VomnibarNS.PixelData.Item,
  panelWidth_: VomnibarNS.PixelData.WindowSizeX,
  styles_: "",
  styleEl_: null as HTMLStyleElement | null,
  darkBtn_: null as HTMLElement | null,
  wheelOptions_: { passive: false, capture: true } as const,
  sed_: null as ParsedSedOpts | null,
  showTime_: 0 as 0 | /** abs-num */ 1 | /** abs */ 2 | /** relative */ 3,
  show_ (): void {
    const a = Vomnibar_;
    a.showing_ = true;
    setTimeout(a.focus_, 34);
    ((document.body as Element).addEventListener as typeof addEventListener)("wheel", a.onWheel_, a.wheelOptions_)
  },
  hide_ (fromContent?: BOOL): void {
    const a = Vomnibar_, el = a.input_;
    a.isActive_ = a.showing_ = a.isEditing_ = a.blurWanted_ = a.codeFocusReceived_ = false;
    a.noSessionsOnStart_ = false
    a.isInputComposing_ = null
    a.codeFocusTime_ = 0;
    ((document.body as Element).removeEventListener as typeof removeEventListener)("wheel", a.onWheel_, a.wheelOptions_)
    a.timer_ > 0 && clearTimeout(a.timer_);
    window.onkeyup = null as never;
    el.blur();
    fromContent || VPort_ && VPort_.post_({ H: kFgReq.nextFrame, t: Frames.NextType.current, k: a.lastKey_ })
    if (Build.MinCVer <= BrowserVer.StyleSrc$UnsafeInline$MayNotImply$UnsafeEval && Build.BTypes & BrowserType.Chrome) {
      a.docSt_.zoom = ""
    } else {
      a.docSt_.cssText = ""
    }
    a.bodySt_.display = "none"
    a.list_.textContent = el.value = "";
    a.list_.style.height = "";
    a.barCls_.remove("empty");
    a.list_.classList.remove("no-favicon");
    a.toggleAlt_(0);
    a.afterHideTimer_ = Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || a.browser_ === BrowserType.Firefox)
        ? requestAnimationFrame(a.AfterHide_) : requestAnimationFrame((): void => {
      a.afterHideTimer_ = requestAnimationFrame(a.AfterHide_)
    })
    a.timer_ = setTimeout(a.AfterHide_, 35);
  },
  AfterHide_ (this: void): void {
    const a = Vomnibar_;
    cancelAnimationFrame(a.afterHideTimer_);
    a.afterHideTimer_ = 0
    clearTimeout(a.timer_);
    if (a.height_) {
      a.onHidden_();
    }
  },
  onHidden_ (): void {
    VPort_ && VPort_.postToOwner_({ N: VomnibarNS.kFReq.hide })
    const a = Vomnibar_;
    a.timer_ = a.height_ = a.matchType_ = a.sugTypes_ = a.wheelStart_ = a.wheelTime_ = a.actionType_ =
    a.total_ = a.lastKey_ = a.wheelDelta_ = VUtils_.timeCache_ = 0;
    a.docZoom_ = 1;
    a.clickLike_ =
    a.sed_ = a.doesOpenInIncognito_ = a.completions_ = a.onUpdate_ = a.isHttps_ = a.baseHttps_ = null as never
    a.mode_.q = a.lastQuery_ = a.inputText_ = a.resMode_ = "";
    a.mode_.o = "omni";
    a.mode_.t = CompletersNS.SugType.Empty;
    a.isSearchOnTop_ = a.activeOnCtrl_ = false
    if (!a.doEnter_ || !VPort_) {
      (<RegExpOne> /a?/).test("")
    } else if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || a.browser_ === BrowserType.Firefox)
        && document.hasFocus() && a.doEnter_[1] !== ReuseType.current) {
      const cb = (): void => {
        const curDoEnter = Vomnibar_.doEnter_
        clearTimeout(timer)
        Vomnibar_.doEnter_  =null
        VPort_ && curDoEnter && (curDoEnter[0](), (<RegExpOne> /a?/).test(""))
      }
      let timer = setTimeout(cb, 67)
      a.onWndBlur2_ = (): void => { Vomnibar_.onWndBlur2_ = null; setTimeout(cb, 1) }
      return
    } else {
      setTimeout(a.doEnter_[0], Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || a.browser_ === BrowserType.Firefox) ? 1 : 0)
    }
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
    a.update_(0, start! <= end! ? function (): void {
      if (Vomnibar_.input_.value === Vomnibar_.inputText_) {
        Vomnibar_.input_.setSelectionRange(start!, end!);
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
      if (Build.BTypes & ~BrowserType.Chrome
          || Build.MinCVer < BrowserVer.MinFocusIframeDirectlyBy$activeElement$$focus) {
        window.focus() // if call contentWindow.focus(), then there's a huge delay and then the below logs failures
      }
      a.input_.focus();
      if (!a.codeFocusReceived_ || !a.focused_) {
        focus = focus ? <number> focus | 0 : 0;
        if (!Build.NDEBUG) {
          if (TimerType.fake < 0 ? focus >= 0 : focus < TimerType.fake) {
            console.log(`Vomnibar: can not focus the input bar at the ${focus + 1} time`
              + (focus < 5 ? ", so retry in 33ms." : "."));
          } else {
            console.log("Vomnibar: fail in focusing the input bar.");
          }
        }
        focus < 5 && (TimerType.fake >= 0 || focus >= 0) && setTimeout(a.focus_, 33, focus + 1)
      }
    } else {
      VPort_.post_({ H: kFgReq.nextFrame, t: Frames.NextType.current, k: a.lastKey_ });
    }
  },
  update_ (updateDelay: number, callback?: (() => void) | null): void {
    const a = Vomnibar_;
    a.onUpdate_ = callback || null;
    if (updateDelay >= 0) {
      a.isInputComposing_ = null
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
      let arr = a._pageNumRe.exec(a.inputText_)
      if (arr && (!a.completions_.length || a.completions_[0].e !== "search")) {
        let i = a.inputText_.length - arr[0].length
        a.input_.setSelectionRange(i, i)
      }
      if (!focused) { a.focus_(); a.blurWanted_ = blurred; }
      return;
    }
    blurred && focused && a.input_.blur();
    const line = a.completions_[sel] as SuggestionEx;
    if (line.parsed_) {
      return a._updateInput(line, line.parsed_);
    }
    (line as Partial<SuggestionEx>).https_ == null && (line.https_ = line.u.startsWith("https://"));
    if (line.e !== "history" && line.e !== "tab" && !(line.e === "search" && a.mode_.q.startsWith(":"))) {
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
    const useUrl = onlyUrl || !(<RegExpOne> /[^\x00-\x7f]/).test(line.t)
    let str = useUrl ? url : VUtils_.decodeURL_(url, decodeURIComponent)
    if (!useUrl && str.length === url.length && url.includes("%")) {
      // has error during decoding
      str = line.t;
      if (ind) {
        if (str.lastIndexOf("://", 5) < 0) {
          str = (ind === ProtocolType.http ? "http://" : "https://") + str;
        }
        if (url.endsWith("/") && !str.endsWith("/")) {
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
    const line = Vomnibar_.completions_[id] as SuggestionEx;
    line.parsed_ = search ? (Vomnibar_.mode_.o.endsWith("omni") && !Vomnibar_.resMode_ ? "" : ":o ")
        + search.k + " " + search.u + " " : Vomnibar_.resMode_ + line.t
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
    a.resMode_ && (str = str.slice(a.resMode_.length))
    str = str === (line.title || line.u) ? line.parsed_ || a.resMode_ + (line.title === line.t ? line.u : line.t)
        : a.resMode_ + (line.title && str === line.u ? line.title : str === line.t ? line.u : line.t)
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
  _keyNames_old_cr_ee: Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome
      || Build.BTypes & BrowserType.Edge
      ? AsOmni_<readonly kChar[]>([kChar.space, kChar.pageup, kChar.pagedown, kChar.end, kChar.home,
        kChar.left, kChar.up, kChar.right, kChar.down,
        /* 41 */ kChar.None, kChar.None, kChar.None, kChar.None, kChar.insert, kChar.delete])
      : 0 as never as null,
  _codeCorrectionMap: ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"],
  _modifierKeys: AsOmni_<Dict<1>>({
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
  }) as SafeEnum,
  keyIdCorrectionOffset_old_cr_: Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? Build.OS & ~(1 << kOS.mac) ? 185 as const : 300 as const : 0 as never as null,
  char_ (event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "location" | "shiftKey">): string {
    const shiftKey = Build.BTypes & BrowserType.Firefox ? Vomnibar_.hasShift_(event as KeyboardEvent) : event.shiftKey
    const charCorrectionList = kChar.CharCorrectionList, enNumTrans = kChar.EnNumTrans;
    let key = event.key!
    if (!(Build.BTypes & BrowserType.Edge)
        || Build.BTypes & ~BrowserType.Edge && Vomnibar_.browser_ !== BrowserType.Edge
        ? Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && Build.BTypes & BrowserType.Chrome && !key
        : true) {
      let {keyCode: i} = event, keyId: kCharCode;
      key = i > kKeyCode.space - 1 && i < kKeyCode.minNotDelete ? this._keyNames_old_cr_ee![i - kKeyCode.space]
        : i < kKeyCode.minNotDelete || i === kKeyCode.osRightMac
        ? i === kKeyCode.backspace ? kChar.backspace
            : i === kKeyCode.esc ? kChar.esc
            : i === kKeyCode.tab ? kChar.tab : i === kKeyCode.enter ? kChar.enter
            : (i === kKeyCode.osRightMac || i > kKeyCode.minAcsKeys - 1 && i < kKeyCode.maxAcsKeys + 1)
              && Vomnibar_.mapModifier_ && Vomnibar_.mapModifier_ === event.location ? kChar.Modifier
            : i === kKeyCode.altKey ? kChar.Alt
            : kChar.None
        : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn ? "f" + (i - kKeyCode.maxNotFn)
        : i && (key = Build.BTypes & ~BrowserType.Chrome ? <string | undefined> event.keyIdentifier || ""
              : event.keyIdentifier as string).startsWith("U+") && (keyId = parseInt(key.slice(2), 16))
        ? keyId < kCharCode.minNotAlphabet && keyId > kCharCode.minNotSpace - 1
          ? shiftKey && keyId > kCharCode.maxNotNum && keyId < kCharCode.minNotNum ? enNumTrans[keyId - kCharCode.N0]
            : String.fromCharCode(keyId < kCharCode.minAlphabet || shiftKey ? keyId : keyId + kCharCode.CASE_DELTA)
          : Build.OS & ~(1 << kOS.mac) && keyId > this.keyIdCorrectionOffset_old_cr_!
            && ((keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11)
          ? charCorrectionList[keyId + 12 * +shiftKey]
          : ""
        : "";
    } else {
      let code = event.code!, prefix = code.slice(0, 3), mapped: number | undefined
      if (prefix !== "Num") { // not (Numpad* or NumLock)
        if (prefix === "Key" || prefix === "Dig" || prefix === "Arr") {
          code = code.slice(code < "K" ? 5 : 3);
        }
        key = code.length === 1 && key.length < 2
              ? !shiftKey || code < "0" || code > "9" ? code : enNumTrans[+code]
              : this._modifierKeys[key]
                ? Vomnibar_.mapModifier_ && event.location === Vomnibar_.mapModifier_ ? kChar.Modifier
                : key === "Alt" ? key : ""
              : key === "Escape" ? kChar.esc
              /** {@link ../lib/keyboard_utils#char_} */
              : code.length < 2 || key.length > 1 && key !== "Dead" ? key.startsWith("Arrow") ? key.slice(5) : key
              : (mapped = this._codeCorrectionMap.indexOf(code)) < 0 ? code
              : charCorrectionList[mapped + 12 * +shiftKey]
            ;
      }
      key = shiftKey && key.length < 2 ? key : key === "Unidentified" ? "" : key.toLowerCase()
    }
    return key;
  },
  hasShift_: Build.BTypes & BrowserType.Firefox ? (event: KeyboardEvent): boolean => {
    const key = !(Build.BTypes & ~BrowserType.Firefox) || Vomnibar_.browser_ === BrowserType.Firefox ? event.key! : ""
    return key.length === 1 && event.getModifierState("CapsLock") ? key !== key.toUpperCase() : event.shiftKey
  } : 0 as never,
  getMappedKey_ (event: KeyboardEvent): { mapped: boolean, key: string } {
    const char = Vomnibar_.char_(event);
    let key: string = char, mapped: string | undefined;
    if (char) {
      let baseMod = `${event.altKey ? "a-" : ""}${event.ctrlKey ? "c-" : ""}${event.metaKey ? "m-" : ""}`,
      chLower = char.toLowerCase(), isLong = char.length > 1,
      mod = (Build.BTypes & BrowserType.Firefox ? Vomnibar_.hasShift_(event as KeyboardEvent) : event.shiftKey)
          && (isLong || baseMod && char.toUpperCase() !== chLower) ? baseMod + "s-" : baseMod;
      if (!(Build.NDEBUG || char.length === 1 || char.length > 1 && char === chLower)) {
        console.error(`Assert error: Vomnibar_.key_ get an invalid char of "${char}" !`);
      }
      key = isLong || mod ? mod + chLower : char;
      if (Vomnibar_.mappedKeyRegistry_) {
        mapped = Vomnibar_.mappedKeyRegistry_[key + GlobalConsts.DelimiterBetweenKeyCharAndMode
            + GlobalConsts.OmniModeId] || Vomnibar_.mappedKeyRegistry_[key];
        mapped = mapped ? mapped : !isLong && (mapped = Vomnibar_.mappedKeyRegistry_[chLower]) && mapped.length < 2
            && (baseMod = mapped.toUpperCase()) !== mapped
            ? mod ? mod + mapped : char === chLower ? mapped : baseMod : ""
      }
    }
    return mapped ? { mapped: true, key: mapped } : { mapped: false, key }
  },
  ctrlCharOrShiftKeyMap_: AsOmni_<{ readonly [char in kChar]?: AllowedActions }>({
    // for Ctrl / Meta
    space: AllowedActions.toggle, b: AllowedActions.pageup
    , j: AllowedActions.down, k: AllowedActions.up, n: AllowedActions.down, p: AllowedActions.up
    , "[": AllowedActions.dismiss, "]": AllowedActions.toggle
    // for Shift
    , up: AllowedActions.pageup, down: AllowedActions.pagedown
    , tab: AllowedActions.up, delete: AllowedActions.remove
  }),
  normalMap_: AsOmni_<{ readonly [char in kChar]?: AllowedActions }>({
    tab: AllowedActions.down, esc: AllowedActions.dismiss
    , pageup: AllowedActions.pageup, pagedown: AllowedActions.pagedown
    , up: AllowedActions.up, down: AllowedActions.down
    , f1: AllowedActions.backspace, f2: AllowedActions.blur
  }),
  onKeydown_ (event: KeyboardEventToPrevent): void {
    const a = Vomnibar_, n = event.keyCode, focused = a.focused_,
    { mapped, key } = n !== kKeyCode.ime ? a.getMappedKey_(event) : { mapped: false, key: "" }
    a.lastKey_ = n;
    if (!key) {
      a.inAlt_ && !a._modifierKeys[Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
            && Build.BTypes & BrowserType.Chrome ? event.key || "" : event.key!] && a.toggleAlt_(0);
      a.keyResult_ = focused && !(Build.OS & ~(1 << kOS.mac) && n === kKeyCode.menuKey && a.os_) && n !== kKeyCode.ime
          ? SimpleKeyResult.Suppress : SimpleKeyResult.Nothing;
      return;
    }
    if (key.startsWith("v-")) {
      VPort_.post_({ H: kFgReq.keyFromOmni, k: `<${key}>`, l: n,
          e: focused ? [ a.input_.localName, a.input_.id, a.input_.className ] : ["body", "", ""] })
      a.inAlt_ && a.toggleAlt_(0)
      return
    }
    let action: AllowedActions = AllowedActions.nothing, ind: number;
    const char = (key.slice(key.lastIndexOf("-") + 1) || key && kChar.minus) as kChar,
    mainModifier = key.length > 1 ? key.slice(0, key.indexOf("-") + 1) as "a-" | "c-" | "m-" | "s-" | "" : "";
    if (mainModifier === "a-" || mainModifier === "m-") {
      if (char === kChar.f2) {
        return a.onAction_(focused ? AllowedActions.blurInput : AllowedActions.focus);
      }
      if (mainModifier === "a-") {
        if (key === "a-" + kChar.Alt || key === "a-" + kChar.Modifier) {
          // not set keyup listener on purpose:
          // so that a short Alt will only toggle inAlt, and a long Alt can show on keydown and hide on keyup
          Vomnibar_.inAlt_ = Vomnibar_.inAlt_ || setTimeout(Vomnibar_.toggleAlt_, 260, -1);
          return;
        }
        if (char === kChar.down || char === kChar.up || (<RegExpOne> /^[jknp]$/).test(char)) {
          return a.onAction_(char < "o" && char !== "k" ? AllowedActions.down : AllowedActions.up);
        }
        a.inAlt_ && a.toggleAlt_(0);
      }
      if (char >= "0" && char <= "9" && (Build.OS & ~(1 << kOS.mac) && a.os_ || (<RegExpOne> /[cm]-/).test(key))) {
          ind = +char || 10;
          if (ind <= a.completions_.length) {
            a.onEnter_(true, ind - 1);
          }
          return;
      }
      if (!focused) { /* empty */ }
      else if (char.length === 1 && char > kChar.a && char < kChar.g && char !== kChar.c
          || Build.OS & ~(1 << kOS.mac) && char === kChar.backspace && a.os_) {
        return a.onBashAction_(char.length === 1
            ? char.charCodeAt(0) - (kCharCode.maxNotAlphabet | kCharCode.CASE_DELTA) : -1);
      }
      if (mainModifier === "a-" && char !== kChar.enter) { a.keyResult_ = SimpleKeyResult.Nothing; return; }
    }
    if (char === kChar.enter) {
      if (event.key === "Enter" || n === kKeyCode.enter) {
        window.onkeyup = a.OnNativeEnterUp_.bind(null, key, mapped)
      } else {
        a.onEnter_(key);
      }
      return;
    }
    if (mainModifier === "c-" || mainModifier === "m-") {
      if (key.includes("s-")) {
        action = char === kChar.f ? AllowedActions.pagedown : char === kChar.b ? AllowedActions.pageup
          : AllowedActions.nothing;
      } else if (char === kChar.up || char === kChar.down || char === kChar.end || char === kChar.home) {
        event.preventDefault();
        a.lastScrolling_ = event.timeStamp
        window.onkeyup = Vomnibar_.HandleKeydown_;
        VPort_.postToOwner_({ N: VomnibarNS.kFReq.scroll, k: key, b: char });
        return;
      } else if (Build.BTypes & ~BrowserType.Firefox
          && (!(Build.BTypes & BrowserType.Firefox) || a.browser_ !== BrowserType.Firefox)
          && Build.OS & (1 << kOS.mac) && char === kChar.backspace && !a.os_) {
        return a.onBashAction_(-1);
      } else if (char === kChar.delete) {
        a.keyResult_ = SimpleKeyResult.Suppress;
      } else {
        action = char === kChar.bracketLeft ? AllowedActions.dismiss
          : char === kChar.bracketRight ? AllowedActions.toggle
          : a.ctrlCharOrShiftKeyMap_[char] || AllowedActions.nothing;
      }
    }
    else if (mainModifier === "s-") {
      action = a.ctrlCharOrShiftKeyMap_[char] || AllowedActions.nothing;
    }
    else if (action = a.normalMap_[char] || AllowedActions.nothing) { /* empty */ }
    else if (char > kChar.maxNotF_num && char < kChar.minNotF_num) { // "f" + N
      a.keyResult_ = SimpleKeyResult.Nothing;
      return;
    }
    else if (n === kKeyCode.backspace) {
      if (focused) { a.keyResult_ = SimpleKeyResult.Suppress; }
      return;
    }
    else if (char !== kChar.space) { /* empty */ }
    else if (!focused) { action = AllowedActions.focus; }
    else if (!mapped && (a.selection_ >= 0 || a.completions_.length <= 1) && a.input_.value.endsWith("  ")) {
      return a.onEnter_(true);
    }
    if (action) {
      return a.onAction_(action);
    }

    if (focused || char.length !== 1 || isNaN(ind = parseInt(char, 10))) {
      a.keyResult_ = (focused ? !(Build.OS & ~(1 << kOS.mac) && n === kKeyCode.menuKey && a.os_) : key.length > 1)
          ? SimpleKeyResult.Suppress : SimpleKeyResult.Nothing;
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
    let delta = +dirOrNum || -1,
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
    a.isInputComposing_ = null
    a.update_(0);
  },
  onEnter_ (event?: KeyStat | true | string, newSel?: number | null): void {
    const a = Vomnibar_;
    let sel = newSel != null ? newSel : a.selection_;
    if (typeof event === "string") {
      event = (event.includes("a-") ? KeyStat.altKey : 0) + (event.includes("c-") ? KeyStat.ctrlKey : 0)
          + (event.includes("m-") ? KeyStat.metaKey : 0) + (event.includes("s-") ? KeyStat.shiftKey : 0);
    }
    a.actionType_ = event == null ? a.actionType_
      : event === true ? a.forceNewTab_ ? ReuseType.newFg : ReuseType.current
      : event & (KeyStat.PrimaryModifier | KeyStat.shiftKey) && a.clickLike_ ? a.parseClickEventAs_(event)
      : event & KeyStat.PrimaryModifier ? event & KeyStat.shiftKey ? ReuseType.newBg : ReuseType.newFg
      : event & KeyStat.shiftKey || !a.forceNewTab_ ? ReuseType.current : ReuseType.newFg;
    if (sel === -1) {
      const input = a.input_.value.trim();
      if (!input) {
        return;
      }
      if (a.notSearchInput_ && !event && !input.includes("://")) {
        try { new URL(input); } catch { return; }
      }
    }
    if (newSel != null || !a.timer_) { /* empty */ }
    else if (a.isEditing_) { sel = -1; }
    else if (a.timer_ > 0) {
      return a.update_(0, a.onEnter_);
    } else {
      a.onUpdate_ = a.onEnter_;
      return;
    }
    type UrlInfo = SugToExec & Partial<Pick<CompletersNS.Suggestion, "s">>
    const item: SuggestionE | UrlInfo = sel >= 0 ? a.completions_[sel] : { u: a.input_.value.trim() },
    action = a.actionType_, https = a.isHttps_, incognito = a.doesOpenInIncognito_,
    noTest = sel >= 0,
    navReq: Req.fg<kFgReq.openUrl> | null = item.s != null ? null : { H: kFgReq.openUrl,
      f: false, r: action, h: sel >= 0 ? null : https, u: item.u,
      o: { i: incognito, s: sel >= 0 ? { r: false, k: "" } : a.sed_, p: a.position_, t: noTest ? false : "whole" }
    }, sessionReq: Req.fg<kFgReq.gotoSession> | null = item.s == null ? null : { H: kFgReq.gotoSession,
      a: action > ReuseType.newBg, s: item.s
    },
    func = function (this: void): void {
      !VPort_ ? 0 : navReq ? Vomnibar_.navigateToUrl_(navReq, action)
        : Vomnibar_.gotoSession_(sessionReq!, (item as SuggestionE).e === "tab");
      (<RegExpOne> /a?/).test("");
    };
    if (sel === -1 && event && event !== !0 && event & KeyStat.altKey && action > ReuseType.newBg
        && (<RegExpOne> /^\w+(-\w+)?$/).test(item.u)) {
      const domains = a.completions_.filter(i => i.e === "domain");
      navReq!.u = domains.length ? domains[0].u : `www.${item.u}.com`
    }
    if (action > ReuseType.newBg || event && event !== !0 && event & KeyStat.altKey) {
      a.doEnter_ = [func, action]
      a.hide_()
    } else {
      func()
    }
  },
  OnNativeEnterUp_ (this: void, key: string, mapped: boolean, event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? event.isTrusted
        : event.isTrusted !== false
    ) { // call onEnter once an enter / modifier key is up
      window.onkeyup = null as never;
      const a = Vomnibar_, key2 = key !== kChar.enter || mapped ? key
          : (event.altKey || keyCode === kKeyCode.altKey ? KeyStat.altKey : 0)
          + (event.ctrlKey || keyCode === kKeyCode.ctrlKey ? KeyStat.ctrlKey : 0)
          + (event.metaKey || keyCode > kKeyCode.maxNotMetaKey && keyCode < kKeyCode.minNotMetaKeyOrMenu
              ? KeyStat.metaKey : 0)
          + (event.shiftKey || keyCode === kKeyCode.shiftKey ? KeyStat.shiftKey : 0)
      if (!a.isActive_) { return }
      a.lastKey_ = kKeyCode.None
      a.onEnter_(key, (typeof key2 === "string" ? key2 === "a-" + kChar.enter : key2 === KeyStat.altKey)
          ? !a.selection_ && a.isSelOriginal_ ? -1 : a.selection_ : null)
    }
  },
  parseClickEventAs_ (event: KeyStat): ReuseType {
    const a = Vomnibar_, type = a.clickLike_ === true ? "chrome" : a.clickLike_ + "",
    hasCtrl = event & KeyStat.PrimaryModifier, hasShift = event & KeyStat.shiftKey,
    likeVivaldi = type.endsWith("2") ? type.includes("chro") : type.includes("viva")
    return likeVivaldi ? hasCtrl ? hasShift ? ReuseType.newWnd : ReuseType.newBg : ReuseType.newFg
        // likeChrome / likeFirefox
        : hasCtrl ? !!hasShift !== a.activeOnCtrl_ ? ReuseType.newFg : ReuseType.newBg : ReuseType.newWnd
  },
  removeCur_ (): void {
    if (Vomnibar_.selection_ < 0) { return; }
    const completion = Vomnibar_.completions_[Vomnibar_.selection_], type = completion.e;
    if (type !== "tab" && (type !== "history" || (Build.BTypes & ~BrowserType.Firefox
          && (!(Build.BTypes & BrowserType.Firefox) || Vomnibar_.browser_ !== BrowserType.Firefox)
          && completion.s != null))) {
      VPort_.postToOwner_({ N: VomnibarNS.kFReq.hud, k: kTip.failToDelSug });
      return;
    }
    VPort_.post_({ H: kFgReq.removeSug, t: type, s: completion.s, u: completion.u })
    return Vomnibar_.refresh_();
  },
  onClick_ (this: void, event: MouseEventToPrevent): void {
    const a = Vomnibar_;
    let el: HTMLElement | null = event.target as HTMLElement;
    if ((Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
          : event.isTrusted === false || !(event instanceof MouseEvent))
        || event.button
        || el === a.input_ || getSelection().type === "Range") { return; }
    if (el === a.input_.parentElement) { return a.focus_(); }
    if (a.timer_) { VUtils_.Stop_(event, 1); return; }
    while (el && el.parentElement !== a.list_) { el = el.parentElement as HTMLElement | null; }
    if (!el) { return; }
    a.lastKey_ = kKeyCode.None;
    VUtils_.Stop_(event, 1)
    a.onEnter_(<number> <boolean|number> event.altKey |
      (<number> <boolean|number> event.ctrlKey * 2) |
      (<number> <boolean|number> event.metaKey * 4) |
      (<number> <boolean|number> event.shiftKey * 8), ([] as Node[]).indexOf.call(a.list_.children, el));
  },
  OnMenu_ (this: void, event: Event): void {
    let el = event.target as HTMLElement, item: Element | null, Anchor = HTMLAnchorElement;
    if (!(el instanceof Anchor)) { el = el.parentElement as HTMLElement; }
    if (!(el instanceof Anchor) || el.href) { return; }
    for (item = el; item && item.parentElement !== Vomnibar_.list_;
          item = item.parentElement as HTMLElement | null) {
      /* empty */
    }
    const _i = ([] as Array<Node | null>).indexOf.call(Vomnibar_.list_.children, item);
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
  OnTimer_ (this: void): void { if (VPort_ && Vomnibar_.isActive_) { Vomnibar_.fetch_() } },
  onWheel_ (this: void, event: WheelEvent & ToPrevent): void {
    if (event.ctrlKey || event.metaKey
        || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    const a = Vomnibar_, deltaY = event.deltaY, now = Date.now(), mode = event.deltaMode;
    if (a.isActive_ && a.inputBar_.contains(event.target as Element)) { return }
    VUtils_.Stop_(event, 1);
    if (event.deltaX || !deltaY || !a.isActive_ || a.isSearchOnTop_) { return }
    if (now - a.wheelTime_ > (!mode /* WheelEvent.DOM_DELTA_PIXEL */
                              ? GlobalConsts.TouchpadTimeout : GlobalConsts.WheelTimeout)
        || now - a.wheelTime_ < -33) {
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
            && now - a.wheelStart_ > -33
    ) {
      a.wheelDelta_ = total;
      return;
    }
    a.wheelDelta_ = (abs % GlobalConsts.VomnibarWheelStepForPage) * (abs > 0 ? 1 : -1);
    a.wheelStart_ = now;
    a.goPage_(deltaY > 0);
  },
  onInput_ (this: void, event?: InputEvent): void {
    const a = Vomnibar_, s0 = a.lastQuery_, s1 = a.input_.value, str = s1.trim();
    a.blurWanted_ = false;
    if (str === (a.selection_ === -1 || a.isSelOriginal_ ? s0 : a.completions_[a.selection_].t)) {
      return;
    }
    if (a.matchType_ === CompletersNS.MatchType.emptyResult && str.startsWith(s0)) {
      if (!str.includes(" /", s0.length) || (<RegExpOne> /^\/|\s\//).test(str.slice(0, s0.length - 1))
          || !(a.mode_.e ? a.mode_.e & CompletersNS.SugType.bookmark : "bomni bookmarks".includes(a.mode_.o))) {
        return
      }
    }
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
    a.isInputComposing_ && (!event || event.isComposing === false) && (a.isInputComposing_ = null)
    a.update_(-1, a.inAlt_ ? a.toggleAlt_ : null)
  },
  omni_ (response: BgVomnibarSpecialReq[kBgReq.omni_omni]): void {
    const a = Vomnibar_;
    const completions = response.l, len = completions.length, notEmpty = len > 0, oldH = a.height_, list = a.list_;
    if (!a.isActive_) { return; }
    a.total_ = response.t;
    a.showFavIcon_ = response.i;
    a.matchType_ = response.m;
    a.sugTypes_ = response.s;
    a.resMode_ = response.r && response.r + " "
    a.completions_ = completions;
    a.isSearchOnTop_ = len > 0 && completions[0].e === "search" && !(completions[0] as CompletersNS.SearchSuggestion).n
    a.selection_ = a.isSearchOnTop_ || (a.selectFirst_ == null ? response.a : a.selectFirst_ && notEmpty) ? 0 : -1;
    a.isSelOriginal_ = true;
    const height = a.height_
      = Math.ceil(notEmpty ? len * a.itemHeight_ + a.baseHeightIfNotEmpty_ : a.heightIfEmpty_),
    needMsg = height !== oldH, earlyPost = height > oldH,
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
    a.toggleInputMode_()
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && a.browser_ & BrowserType.Firefox) {
      a.toggleAttr_("mozactionhint", a.isSearchOnTop_ ? "Search" : "Go", 1)
    } else {
      a.toggleAttr_("enterkeyhint", a.isSearchOnTop_ ? "Search" : "Go")
    }
    if (!oldH) {
      a.bodySt_.display = ""
    }
    let cl = a.barCls_, cl2 = list.classList, c = "empty";
    notEmpty ? cl.remove(c) : cl.add(c);
    c = "no-query"
    response.c & CompletersNS.QComponent.queryOrOffset ? (cl.remove(c), cl2.remove(c)) : (cl.add(c), cl2.add(c))
    c = "no-favicon";
    a.showFavIcon_ ? cl2.remove(c) : cl2.add(c);
    if (notEmpty) {
      if (a.selection_ === 0) {
        list.firstElementChild.classList.add("s");
      }
      list.lastElementChild.classList.add("b");
    }
    if (a.onUpdate_ === a.toggleAlt_) {
      a.toggleAlt_(0)
      a.onUpdate_ = null
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
  toggleInputMode_ (): void {
    Vomnibar_.isInputComposing_ ||
    Vomnibar_.toggleAttr_("inputmode", Vomnibar_.isSearchOnTop_
        || !(<RegExpOne> /[\/:]/).test(Vomnibar_.lastQuery_) ? "search" : "url")
  },
  toggleAttr_: <V extends "Search" | "Go" | "search" | "url"> (attr: string
      , value: V, trans?: V extends "Search" | "Go" ? 1 : 0) => {
    if (trans && Vomnibar_.pageType_ === VomnibarNS.PageType.inner) {
      value = chrome.i18n.getMessage(value) as never || value
    }
    if (Vomnibar_.input_.getAttribute(attr) !== value) {
      Vomnibar_.input_.setAttribute(attr, value);
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
        e: add
      });
    }
  },
  onStyleUpdate_ (omniStyles: string): void {
    omniStyles = ` ${omniStyles} `;
    const docEl = document.documentElement as HTMLHtmlElement
    const body = document.body as HTMLBodyElement
    const dark = omniStyles.includes(" dark ");
    if (Vomnibar_.darkBtn_) {
      if (!Vomnibar_.darkBtn_.childElementCount) {
        Vomnibar_.darkBtn_.textContent = dark ? "\u2600" : "\u263D";
      }
      Vomnibar_.darkBtn_.classList.toggle("toggled", dark);
    }
    const monospaceURL = omniStyles.includes(" mono-url ");
    Vomnibar_.showTime_ = !omniStyles.includes(" time ") ? 0 : omniStyles.includes(" absolute-num-time ") ? 1
        : omniStyles.includes(" absolute-time ") ? 2 : 3
    Vomnibar_.updateQueryFlag_(CompletersNS.QueryFlags.ShowTime, Vomnibar_.showTime_ > 0);
    // Note: should not use style[title], because "title" on style/link has special semantics
    // https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
    const styles = document.querySelectorAll("style[id]")
    for (let i = 0; i < styles.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
      const style = styles[i] as HTMLStyleElement
      const key = " " + style.id + " ", isCustom = key === " custom ", found = isCustom || omniStyles.includes(key)
      if (style.dataset.media) {
        style.media = found ? "" : style.dataset.media
      } else {
        style.sheet!.disabled = !found;
      }
      isCustom || body.classList.toggle("has-" + style.id, found)
      if (found) {
        omniStyles = omniStyles.replace(key, " ");
      }
    }
    omniStyles = omniStyles.trim().replace(Vomnibar_.spacesRe_, " ");
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
      n = sizes.length > 3 ? +sizes[3] : 0
      Vomnibar_.panelWidth_ = M(0.3, m(n || VomnibarNS.PixelData.WindowSizeX, 0.95));
    }
  },
  OnWndFocus_ (this: void, event: Event): void {
    const a = Vomnibar_, byCode = a.codeFocusTime_ && performance.now() - a.codeFocusTime_ < 120,
    blurred = event.type === "blur", target = event.target, isWnd = target === window
    if ((Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
          ? !event.isTrusted : event.isTrusted === false) || !VPort_) { return; }
    a.codeFocusReceived_ = true;
    blurred && a.onWndBlur2_ && isWnd && a.onWndBlur2_()
    if (!a.isActive_ || !isWnd) {
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
      if (a.pageType_ !== VomnibarNS.PageType.inner && VPort_) {
        setTimeout(function (): void {
          VPort_ && !VPort_._port && VPort_.postToOwner_({ N: VomnibarNS.kFReq.broken });
        }, 50);
      }
    } else {
      Vomnibar_.toggleAlt_(0);
    }
  },
  blurred_ (this: void, blurred?: boolean | null): void {
    if (!Vomnibar_) { return; }
    const doc = document, a = (doc.body as HTMLBodyElement).classList, kTransparent = "transparent";
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
    window.onclick = Vomnibar_.onClick_
    VUtils_.safer_(a.ctrlCharOrShiftKeyMap_);
    VUtils_.safer_(a.normalMap_);
    VUtils_.safer_(a._modifierKeys)
    const list = a.list_ = document.getElementById("list") as EnsuredMountedHTMLElement;
    const ver: BrowserVer = Build.BTypes & BrowserType.Chrome ? a.browserVer_ : BrowserVer.assumedVer,
    listen = addEventListener,
    input = a.input_ = document.getElementById("input") as typeof Vomnibar_.input_;
    a.inputBar_ = document.getElementById("bar") as HTMLElement
    a.barCls_ = (input.parentElement as HTMLElement).classList;
    list.onmouseover = list.oncontextmenu = a.OnMenu_;
    (document.getElementById("close") as HTMLElement).onclick = function (): void { return Vomnibar_.hide_(); };

    listen("keydown", a.HandleKeydown_, true);
    listen("focus", a.OnWndFocus_, true);
    listen("blur", a.OnWndFocus_, true);
    input.oninput = a.onInput_ as (e: InputEvent) => void as (e: Event) => void
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
    if (Build.BTypes & BrowserType.Chrome && (Build.MinCVer >= BrowserVer.MinBorderWidth$Ensure1$Or$Floor
          || Build.MinCVer < BrowserVer.MinRoundedBorderWidthIsNotEnsured
              && ver < BrowserVer.MinRoundedBorderWidthIsNotEnsured
          || ver > BrowserVer.MinBorderWidth$Ensure1$Or$Floor - 1)
        || Build.BTypes & BrowserType.Edge
            && (!(Build.BTypes & ~BrowserType.Edge) || a.browser_ === BrowserType.Edge)) {
      // is old Chrome or Edge
      const css = document.createElement("style");
      css.type = "text/css";
      css.textContent = !(Build.BTypes & ~BrowserType.Chrome)
        || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome
        ? `body::after, #input, .item { border-width: ${
          Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo &&
          ver < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo ? 1 : 0.01}px; }`
        : "#input::-ms-clear { display: none; }";
      document.head!.appendChild(css);
    }
    if (Build.BTypes & ~BrowserType.Firefox
        && (!(Build.BTypes & BrowserType.Firefox) || a.browser_ !== BrowserType.Firefox)) {
      let func = function (this: HTMLInputElement, event: CompositionEvent): void {
        const doesStart = event.type === "compositionstart", box = Vomnibar_.input_
        Vomnibar_.isInputComposing_ = doesStart ? [box.selectionStart, box.value.length - box.selectionEnd] : null
      };
      input.addEventListener("compositionstart", func);
      input.addEventListener("compositionend", func);
    }
    a.styleEl_ && document.head!.appendChild(a.styleEl_);
    a.darkBtn_ = document.querySelector("#toggle-dark") as HTMLElement | null;
    a.darkBtn_ && (a.darkBtn_.onclick = (event: MouseEvent): void => {
      Vomnibar_.toggleStyle_({ t: "dark", c: event.ctrlKey });
      Vomnibar_.input_.focus();
    });
    a.onStyleUpdate_(a.styles_);
    if (a.pageType_ === VomnibarNS.PageType.inner) {
      const els = document.querySelectorAll("[title]")
      for (let i = 0; i < els.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
        const el = els[i] as HTMLElement
        let t = chrome.i18n.getMessage(el.title.replace(" ", "_") as "Close" | "Toggle_Dark")
        t && (el.title = t);
      }
    }
    a.init_ = a.preInit_ = VUtils_.makeListRenderer_ = null as never;
    if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || a.browser_ === BrowserType.Chrome)
          && (Build.MinCVer >= BrowserVer.MinEnsuredSVG$Path$Has$d$CSSAttribute
              || ver >= BrowserVer.MinEnsuredSVG$Path$Has$d$CSSAttribute)
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
      Vomnibar_.init_ || document.head!.appendChild(st);
    }
    st.textContent = css;
  },
  getTypeIcon_ (sug: Readonly<SuggestionE>): string { return sug.e; },
  preInit_ (type: VomnibarNS.PageType): void {
    const a = Vomnibar_, docEl = document.documentElement as HTMLHtmlElement;
    a.docSt_ = docEl.style;
    a.bodySt_ = (document.body as HTMLBodyElement).style
    a.pageType_ = type;
    let fav: 0 | 1 | 2 = 0, f: () => chrome.runtime.Manifest, manifest: chrome.runtime.Manifest
      , str: string | undefined;
    const canShowOnExtOrWeb = Build.MinCVer >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon
          || !!(Build.BTypes & BrowserType.Chrome)
              && a.browserVer_ >= BrowserVer.MinExtensionContentPageAlwaysCanShowFavIcon;
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && a.browser_ & BrowserType.Firefox) {
      // we know that Firefox uses `data:...` as icons
      fav = 2;
    } else if (type === VomnibarNS.PageType.web) { /* empty */ }
    else if (type === VomnibarNS.PageType.inner) {
      fav = canShowOnExtOrWeb ? 2 : 0;
    } else if (canShowOnExtOrWeb && (str = docEl.dataset.favicons) != null) {
      fav = !str || str.toLowerCase() === "true" ? 2 : 0;
    } else if (canShowOnExtOrWeb && (f = chrome.runtime.getManifest) && (manifest = f())
        && manifest.manifest_version === 2) {
      const arr = manifest.permissions || [];
      fav = arr.indexOf("<all_urls>") >= 0 || arr.join(" ").includes("://favicon/") ? 1 : 0
    }
    a.mode_.i = fav;
  },
  HandleKeydown_ (this: void, event: KeyboardEventToPrevent): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
        : event.isTrusted !== true && !(event.isTrusted == null && event instanceof KeyboardEvent)) { return; }
    Vomnibar_.keyResult_ = SimpleKeyResult.Prevent as SimpleKeyResult;
    if (window.onkeyup) {
      let keyCode = event.keyCode, stop = !event.repeat, now = 0;
      if (!Vomnibar_.lastScrolling_) {
        // clear state, to avoid OnEnterUp receives unrelated keys
        stop = keyCode > kKeyCode.maxAcsKeys || keyCode < kKeyCode.minAcsKeys;
      } else if (stop || (now = event.timeStamp) - Vomnibar_.lastScrolling_ > 40 || now < Vomnibar_.lastScrolling_) {
        VPort_.postToOwner_({ N: stop ? VomnibarNS.kFReq.scrollEnd : VomnibarNS.kFReq.scrollGoing });
        Vomnibar_.lastScrolling_ = now;
      }
      if (stop) { window.onkeyup = null as never; }
    } else if (Vomnibar_.isActive_) {
      /*#__NOINLINE__*/ Vomnibar_.onKeydown_(event)
    }
    if (Vomnibar_.keyResult_ === SimpleKeyResult.Nothing) { return; }
    VUtils_.Stop_(event, Vomnibar_.keyResult_ === SimpleKeyResult.Prevent);
  },
  toggleAlt_ (enable?: /** disable */ 0 | /** enable */ -1 | KeyboardEvent): void {
    const inAlt = Vomnibar_.inAlt_;
    if (enable !== -1 && enable !== 0 && enable !== undefined) {
      if (enable.keyCode !== kKeyCode.altKey) { return; }
      enable = 0;
    }
    enable = enable || 0
    if (inAlt !== enable) {
      if (inAlt > 0 && !enable) { clearTimeout(inAlt); }
      if ((inAlt === -1) !== !!enable) {
        (document.body as HTMLBodyElement).classList.toggle("alt", !!enable);
        (enable ? addEventListener : removeEventListener)("keyup", Vomnibar_.toggleAlt_, true);
        for (let i = 0, end = enable ? Math.min(Vomnibar_.list_.childElementCount, 10) : 0; i < end; i++) {
          ((Vomnibar_.list_.children as NodeList)[i] as Element).classList.add("alt-index")
        }
      }
      Vomnibar_.inAlt_ = enable;
    }
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
  updateQueryFlag_ (flag: CompletersNS.QueryFlags, enable: boolean | null): void {
    const isFirst = enable == null;
    if (isFirst) {
      enable = ` ${Vomnibar_.styles_} `.includes(flag - CompletersNS.QueryFlags.ShowTime ? " mono-url " : " time ")
    }
    const newFlag = (Vomnibar_.mode_.f & ~flag) | (enable ? flag : 0);
    if (Vomnibar_.mode_.f === newFlag) { return; }
    Vomnibar_.mode_.f = newFlag;
    if (flag === CompletersNS.QueryFlags.MonospaceURL && !isFirst) {
      Vomnibar_.onInnerWidth_();
    }
  },
  secret_: null as ((request: BgVomnibarSpecialReq[kBgReq.omni_init]) => void) | null,

  mode_: AsOmni_<EnsureItemsNonNull<Req.fg<kFgReq.omni>>>({
    H: kFgReq.omni as kFgReq.omni,
    o: "omni" as CompletersNS.ValidTypes,
    t: CompletersNS.SugType.Empty,
    c: 0,
    e: CompletersNS.SugType.Empty,
    r: 0,
    f: CompletersNS.QueryFlags.None,
    i: 0 as 0 | 1 | 2,
    q: ""
  }),
  spacesRe_: <RegExpG> /\s+/g,
  fetch_ (): void {
    const a = Vomnibar_;
    let mode: Req.fg<kFgReq.omni> = a.mode_
      , str: string, newMatchType = CompletersNS.MatchType.Default;
    a.timer_ = -1;
    if (a.useInput_) {
      a.lastQuery_ = str = a.input_.value.trim();
      if (a.isInputComposing_) {
        const left = a.isInputComposing_[0], end = str.length - a.isInputComposing_[1]
        str = str.slice(0, left) + str.slice(left, end).replace(<RegExpG> /'/g, "") + str.slice(end)
      }
      str = str.replace(a.spacesRe_, " ");
      if (a.caseInsensitive_) {
        const prefix = (<RegExpOne> /^:[WBH] /).test(str) ? 3 : 0
        str = prefix ? str.slice(0, prefix) + str.slice(prefix).toLowerCase() : str.toLowerCase()
      }
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
      if (a.caseInsensitive_) {
        mode.q = mode.q.toLowerCase();
      }
    }
    VPort_.post_(mode);
    if (mode.f & CompletersNS.QueryFlags.NoSessions && a.noSessionsOnStart_) {
      mode.f &= ~CompletersNS.QueryFlags.NoSessions
    }
  },

  _favPrefix: "",
  Parse_ (this: void, item: SuggestionE): void {
    let str: string | undefined;
    item.r = Vomnibar_.showRelevancy_ ? `\n\t\t\t<span class="relevancy">${item.r}</span>` : "";
    (str = item.label) && (item.label = ` <span class="label">${str}</span>`);
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || Vomnibar_.browser_ === BrowserType.Firefox)) {
      return;
    }
    item.favIcon = (str = Vomnibar_.showFavIcon_ ? item.u : "") && Vomnibar_._favPrefix +
        VUtils_.escapeCSSUrlInAttr_not_ff_(Vomnibar_._parseFavIcon(item, str) || "about:blank") +
        "&quot;);";
  },
  _parseFavIcon (item: SuggestionE, url: string): string {
    let str = url.slice(0, 11).toLowerCase(), optionsPage = "/" + GlobalConsts.OptionsPage
    let i: number;
    return str.startsWith("vimium://")
      ? Vomnibar_.pageType_ !== VomnibarNS.PageType.ext
        ? chrome.runtime.getURL(optionsPage) : location.protocol + "//" + VHost_ + optionsPage
      : url.length > 512 || str === "javascript:" || str.startsWith("data:") ? ""
      : item.v
        || (item.e === "history" || item.e === "tab") && url
        || (str.startsWith("http")
              || str.lastIndexOf("-", str.indexOf(":") + 1 || 8) > 0 && url.lastIndexOf("://", 21) > 0
            ? (i = url.indexOf("/", url.indexOf("://") + 3), i > 0 ? url.slice(0, i + 1) : url + "/") : url);
  },
  navigateToUrl_ (req: Req.fg<kFgReq.openUrl>, reuse: ReuseType): void {
    if ((<RegExpI> /^javascript:/i).test(req.u!)) {
      VPort_.postToOwner_({ N: VomnibarNS.kFReq.evalJS, u: req.u! });
      return;
    }
    // not set .formatted, so that convertToUrl is always called with Urls.WorkType.EvenAffectStatus
    VPort_.post_(req)
    if (reuse === ReuseType.newBg && Vomnibar_.isActive_
        && (!Vomnibar_.lastQuery_ || (<RegExpOne> /^\+\d{0,2}$/).exec(Vomnibar_.lastQuery_))) {
      return Vomnibar_.refresh_();
    }
  },
  gotoSession_ (req: Req.fg<kFgReq.gotoSession>, isTab: boolean): void {
    VPort_.post_(req)
    Vomnibar_ && Vomnibar_.isActive_ && Vomnibar_.refresh_(isTab)
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
      VUtils_.timeCache_ = 0
      for (let index = 0; index < objectArray.length; index++) {
        let j = 0;
        for (; j < len; j += 2) {
          html += a[j];
          const key = a[j + 1];
          html += key === "typeIcon" ? Vomnibar_.getTypeIcon_(objectArray[index])
              : key === "index" ? index + 1 : key === "altIndex" ? index > 9 ? "" : index < 9 ? index + 1 : 0
              : key === "time" ? Vomnibar_.showTime_ ? VUtils_.timeStr_(objectArray[index].visit) : ""
              : Build.BTypes & BrowserType.Firefox
                && (!(Build.BTypes & ~BrowserType.Firefox) || Vomnibar_.browser_ === BrowserType.Firefox)
                && key === "favIcon" ? ""
              : objectArray[index][key as keyof SuggestionE] || "";
        }
        html += a[len];
      }
      if (Build.BTypes & ~BrowserType.Firefox) {
        element.innerHTML = html;
      } else {
        element.innerHTML = "";
        element.append!(
          ... <Element[]> <ArrayLike<Element>> parser.parseFromString(html, "text/html").body.children);
      }
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || Vomnibar_.browser_ === BrowserType.Firefox)) {
        /*#__NOINLINE__*/ VUtils_.assignFavIcons_ff_(objectArray, element)
      }
    };
  },
  assignFavIcons_ff_: Build.BTypes & BrowserType.Firefox ? ((objectArray, element): void => {
    const els = element.querySelectorAll(".icon") as NodeListOf<HTMLElement>
    if (objectArray.length === 0 || els.length !== objectArray.length) { return }
    const escapeRe = <RegExpG & RegExpSearchable<0>> /"/g
    const escapeCallback = (): string => "%22"
    const todos: [number, string][] = []
    for (let index = 0; index < objectArray.length; index++) {
      const favIcon = objectArray[index].favIcon
      if (!favIcon) { /* empty */ }
      else if (favIcon.length < 500) {
        els[index].style.backgroundImage = `url("${favIcon.replace(escapeRe, escapeCallback)}")`
      } else {
        todos.push([index, favIcon])
      }
    }
    todos.length > 0 && setTimeout((): void => {
      if (Vomnibar_.completions_ !== objectArray) { return }
      for (const [index, favIcon] of todos) {
        els[index].style.backgroundImage = `url("${favIcon.replace(escapeRe, escapeCallback)}")`
      }
    }, 17)
  }) as Render : 0 as never,
  decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try {
      url = (decode || decodeURI)(url);
    } catch {}
    return url;
  },
  decodeFileURL_ (url: string, decoded: boolean): string {
    if (Build.OS & (1 << kOS.win) && Vomnibar_.os_ === kOS.win && url.startsWith("file://")) {
      const slash = url.indexOf("/", 7)
      if (slash < 0 || slash === url.length - 1) { return slash < 0 ? url + "/" : url }
      const type = slash === 7 ? url.charAt(9) === ":" ? 3 : url.substr(9, 3).toLowerCase() === "%3a" ? 5 : 0 : 0
      url = type ? url[8].toUpperCase() + ":\\" + url.slice(type + 8) : slash === 7 ? url : "\\\\" + url.slice(7)
      let sep = (<RegExpOne> /[?#]/).exec(url), index = sep ? sep.index : 0
      let tail = index ? url.slice(index) : ""
      url = (index ? url.slice(0, index) : url).replace(<RegExpG> /\/\/+/g, "/")
      url = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredLookBehindInRegexp)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinLookBehindInRegexp)
          ? url.replace(<RegExpG> /(?<!<)\//g, "\\")
          : url.replace(<RegExpG & RegExpSearchable<1>> /([^<])\//g, "$1\\")
      url = index ? url + tail : url
    }
    return decoded ? url : VUtils_.decodeURL_(url, decodeURIComponent)
  },
  ensureText_ (sug: SuggestionEx): ProtocolType {
    let { u: url, t: text } = sug, str = url.slice(0, 8).toLowerCase();
    let i = str.startsWith("http://") ? ProtocolType.http : str === "https://" ? ProtocolType.https
            : ProtocolType.others;
    i >= url.length && (i = ProtocolType.others);
    let wantScheme = !i;
    if (i === ProtocolType.https) {
      let j = url.indexOf("/", i);
      if (j > 0 ? j < url.length : /* domain has port */ (<RegExpOne> /:\d+\/?$/).test(url)) {
        wantScheme = true;
      }
    }
    if (!text) {
      text = !wantScheme && i ? url.slice(i) : url;
    } else if (i) {
      if (wantScheme && !text.startsWith(str)) {
        text = str + text;
      }
      if (url.endsWith("/") && !str.endsWith("/") && str.includes("/")) {
        text += "/";
      }
    }
    sug.t = VUtils_.decodeFileURL_(text, !!sug.t)
    if (str = sug.title) {
      (sug as Writable<typeof sug>).title = str.replace(<RegExpG> /<\/?match[^>]*?>/g, "").replace(
          <RegExpG & RegExpSearchable<1>> /&(amp|apos|gt|lt|quot);|\u2026/g, VUtils_.onHTMLEntity);
    }
    return i;
  },
  onHTMLEntity (_s0: string, str: string): string {
    return str === "amp" ? "&" : str === "apos" ? "'" : str === "quot" ? '"'
      : str === "gt" ? ">" : str === "lt" ? "<" : "";
  },
  escapeCSSUrlInAttr_not_ff_: Build.BTypes & ~BrowserType.Firefox ? (s0: string): string => {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === kCharCode.and ? "&amp;" : i === kCharCode.quote1 ? "&apos;"
        : i < kCharCode.quote1 ? "%22" : i === kCharCode.lt ? "%3C" : "%3E";
    }
    VUtils_.escapeCSSUrlInAttr_not_ff_ = function (s): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return VUtils_.escapeCSSUrlInAttr_not_ff_(s0);
  } : 0 as never,
  timeCache_: 0,
  timeStr_ (timestamp: number | undefined): string {
    const cls = Intl.RelativeTimeFormat
    const lang = (document.documentElement as HTMLHtmlElement).lang || navigator.language as string
    const isZh = lang.startsWith("zh"), destLang = isZh ? "zh-CN" : lang
    const kJustNow = isZh ? "\u521a\u521a" : lang.startsWith("fr") ? "tout \u00e0 l'heure" : "just now"
    let dateTimeFormatter: Intl.DateTimeFormat | undefined | 1
    let relativeFormatter: Intl.RelativeTimeFormat | undefined
    let tzOffset = 0
    const kUnits = ["second", "minute", "hour", "day", /** week */ "", "month", "year"] as const
    VUtils_.timeStr_ = (t: number | undefined): string => {
      if (!t) { return "" }
      if (!this.timeCache_) {
        const now = new Date()
        this.timeCache_ = +now
        tzOffset = now.getTimezoneOffset() * 1000 * 60
      }
      // Chrome (including Edge C) 37 and 83 has a bug that the unit of Session.lastVisitTime is second
      const negPos = parseInt(((this.timeCache_ - t) / 1000) as any as string)
      let d = negPos < 0 ? -negPos : negPos
// the range below is copied from `threshold` in momentjs:
// https://github.com/moment/moment/blob/9d560507e54612cf2fdd84cbaa117337568a384c/src/lib/duration/humanize.js#L4-L12
      const unit = d < 10 ? -1 : d < 45 ? 0 : (d /= 60) < 49.5 ? 1 : (d /= 60) < 22 ? 2
          : (d /= 24) < 5 ? 3 : d < 26 ? 4 : d < 304 ? 5 : 6
      let stdDateTime = new Date(t - tzOffset).toJSON().slice(0, -5).replace("T", " ")
      let str: string
      if (stdDateTime[0] === "+" || stdDateTime[0] === "-") {
        stdDateTime = stdDateTime.replace(<RegExpOne> /^\+?(-?)0+/, "$1")
      }
      if (unit === -1) {
        str = kJustNow
      } else if (Vomnibar_.showTime_ < 3
          || (Build.BTypes & ~BrowserType.ChromeOrFirefox
              || Build.BTypes & BrowserType.Chrome  && Build.MinCVer  < BrowserVer.MinEnsured$Intl$$RelativeTimeFormat
              || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.Min$Intl$$RelativeTimeFormat
              ) && !cls) {
        if (!dateTimeFormatter && Vomnibar_.showTime_ > 1) {
          dateTimeFormatter = new Intl.DateTimeFormat(destLang, {
            localeMatcher: "best fit", second: "2-digit",
            year: "numeric", month: "short", weekday: "long", day: "numeric", hour: "numeric", minute: "2-digit"
          })
          if (Build.BTypes & ~BrowserType.Firefox
              && Build.MinCVer < BrowserVer.MinEnsured$Intl$$DateTimeFormat$$$formatToParts) {
            dateTimeFormatter = dateTimeFormatter.formatToParts ? dateTimeFormatter : 1
          }
        }
        if (Build.BTypes & ~BrowserType.Firefox
            && Build.MinCVer < BrowserVer.MinEnsured$Intl$$DateTimeFormat$$$formatToParts && dateTimeFormatter === 1
            || Vomnibar_.showTime_ < 2) {
          str = stdDateTime
          if (negPos > 0 && stdDateTime[0] !== "-") {
            // unit == 6 ? [0, 7] : unit >= 4 ? [5, 10] : unit == 3 ? [8, 16] : unit >= 1 ? [11, 16] : [11, 19]
            str = unit > 3 ? (unit > 5 ? str.slice(0, -12) : str.slice(str[str.length - 14] === "0" ? -13 : -14, -9)
                  ).replace("-", " / ")
                : str.slice(unit > 2 ? str[str.length - 11] === "0" ? -10 : -11 : -8, unit ? -3 : 99)
          } else {
            stdDateTime = ""
          }
        } else {
          str = ""
          const arr = (dateTimeFormatter as Intl.DateTimeFormat).formatToParts!(t)
          for (let i = 0, isLastOutLiteral = true; i < arr.length; i++) {
            const type = arr[i].type
            const skip = type === "year" ? unit < 6 : type === "month" ? unit < 4
                : type === "day" ? unit < 3 || unit > 5 : type === "weekday" ? unit < 3 || unit > 4
                : type === "dayPeriod" || Build.BTypes & BrowserType.Chrome
                  && Build.MinCVer < BrowserVer.Min$Intl$$DateTimeFormat$$$formatToParts$Use$dayPeriod
                  && type === "dayperiod" ? unit > 3
                : type === "hour" || type === "minute" ? unit > 3 : type === "second" ? unit > 0 : type !== "literal"
            if (skip) {
              i += isLastOutLiteral && i + 1 < arr.length && arr[i + 1].type === "literal" ? 1 : 0
            } else {
              const old = isLastOutLiteral, newVal = arr[i].value
              isLastOutLiteral = type === "literal"
              !isLastOutLiteral && (type === "weekday" || type[0] === "d" && type.slice(4, 5) === "e") && str &&
              (<RegExpOne> /[.:-]/).test(str[str.length - 1]) && (str = str.slice(0, -1) + " ");
              (!old || isZh && (newVal[0] === "\u661f" || newVal[0] === "\u5468")) && !isLastOutLiteral && str &&
              (<RegExpOne> /[^\x00-\x7f]/).test(str[str.length - 1]) && (str += " ")
              str += isZh && type[0] === "d" && type.slice(4, 5) === "e"
                  ? (d = parseInt(stdDateTime.slice(-8, -6), 10),
                      d >= 12 ? d >= 18 ? d >= 21 ? "\u591c\u665a" : "\u665a\u4e0a"
                        : d >= 13 ? "\u4e0b\u5348" : "\u4e2d\u5348"
                      : d >= 6 ? d >= 9 ? "\u4e0a\u5348" : "\u65e9\u4e0a" : d > 0 ? "\u51cc\u6668" : "\u5348\u591c")
                  : newVal
            }
          }
          str = str.trim().replace(<RegExpOne> /[,.: -]+$/, "")
        }
      } else {
        if (!relativeFormatter) {
          relativeFormatter = new cls!(destLang, {localeMatcher: "best fit", numeric: "auto", style: "long"})
        }
        str = relativeFormatter.format((Math.round((unit < 5 ? d : d / 365.25 + 0.25)) || 1
            ) * (negPos > 0 ? -1 : 1), kUnits[unit === 4 ? 3 : unit])
        str = isZh ? str.replace("\u79d2\u949f", "\u79d2") : str
      }
      return `<span class="time" title="${stdDateTime}">${str}</span>`
    }
    return VUtils_.timeStr_(timestamp)
  },
  Stop_: function (event: Event & Partial<ToPrevent>, prevent: boolean | BOOL): void {
    prevent && event.preventDefault!();
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
      (this._port || this.connect_(PortType.omnibar | PortType.reconnect)).postMessage<K>(request);
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
    0;
  },
  _OnOwnerMessage ({ data: data }: { data: VomnibarNS.CReq[keyof VomnibarNS.CReq] }): void {
    type Res = VomnibarNS.CReq;
    let name: keyof VomnibarNS.CReq = typeof data === "number" ? data : (data as VomnibarNS.Msg<keyof Res>).N;
    name === VomnibarNS.kCReq.activate ? Vomnibar_.activate_(data as VomnibarNS.CReq[VomnibarNS.kCReq.activate]) :
    name === VomnibarNS.kCReq.focus ? Vomnibar_.focus_() :
    name === VomnibarNS.kCReq.hide ? Vomnibar_.hide_(1) :
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
    // eslint-disable-next-line @typescript-eslint/prefer-includes
  return this.indexOf(s, pos) >= 0;
});
}

if (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser === "object" && browser && (browser as typeof chrome).runtime) {
  window.chrome = browser as typeof chrome;
}
(function (): void {
  if ((document.documentElement as HTMLHtmlElement).dataset.version !== "1.73") {
    if (!Build.NDEBUG) {
      console.log("Error: Vomnibar page version dismatches:", (document.documentElement as HTMLElement).dataset.version)
    }
    location.href = "about:blank";
    return;
  }
  let curEl: HTMLScriptElement | undefined | null;
  if (location.pathname.startsWith("/front/") || !(curEl = document.currentScript as HTMLScriptElement | null)) {
    /* is inner or web */
  }
  else if (curEl.src.endsWith("/front/vomnibar.js") && !(<RegExpOne> /^(ht|s?f)tp/).test(curEl.src)
      && !(<RegExpOne> /^(ht|s?f)tp/).test(location.origin)) {
    VCID_ = new URL(curEl.src).host;
    Build.MinCVer < BrowserVer.Min$URL$NewableAndInstancesHaveProperties && Build.BTypes & BrowserType.Chrome &&
    (VCID_ = VCID_ || "");
    VHost_ = VCID_;
    if (!(Build.BTypes & BrowserType.Chrome)
        || Build.BTypes & ~BrowserType.Chrome && (VCID_).includes("-")) {
      VCID_ = curEl.dataset.vimiumId || BuildStr.FirefoxID;
    }
  } else {
    curEl.remove();
    return;
  }

  const unsafeMsg: Array<[unsafeSecretCode: string, port: VomnibarNS.IframePort, options: Options | null]> = [],
  isWeb = curEl === null;
  let _sec = ""
  const handler = (unsafeSecretCode: string, port: VomnibarNS.IframePort, options: Options | null): void => {
    if (!_sec || unsafeSecretCode !== _sec) {
      _sec || unsafeMsg.push([unsafeSecretCode, port, options])
      return;
    }
    _sec = "1"
    clearTimeout(autoUnloadTimer);
      removeEventListener("message", onUnknownMsg, true);
    VPort_.postToOwner_ = port.postMessage.bind(port);
    port.onmessage = VPort_._OnOwnerMessage;
    window.onunload = Vomnibar_.OnUnload_;
    VPort_.postToOwner_({ N: VomnibarNS.kFReq.iframeIsAlive, o: options ? 1 : 0 });
    if (options) {
      Vomnibar_.activate_(options);
    }
  },
  autoUnloadTimer = setTimeout(function (): void {
    if (!Build.NDEBUG) {
      console.log("Error: Vomnibar page hadn't received a valid secret")
      debugger // eslint-disable-line no-debugger
    }
    location.href = "about:blank"
  }, 700)
  Vomnibar_.secret_ = function (this: void, {l: payload, s: secret}): void {
    Vomnibar_.secret_ = null;
    if (!secret) { // see https://github.com/philc/vimium/issues/3832
      _sec = "2"; unsafeMsg.length = 0
      removeEventListener("message", onUnknownMsg, true)
      console.log("%cVimium C: warning: Vomnibar was unexpectedly opened without triggering Vomnibar.activate!!!"
          , "color: red; background: lightyellow;")
      if (!Build.NDEBUG) { clearTimeout(autoUnloadTimer); setTimeout(() => { location.href = "about:blank" }, 500) }
      return
    }
    if (!Build.BTypes || Build.BTypes & (Build.BTypes - 1)) {
      Vomnibar_.browser_ = payload.b!;
    }
    if ((!(Build.BTypes & (Build.BTypes - 1)) ? Build.BTypes : payload.b!) & BrowserType.Chrome) {
      Vomnibar_.browserVer_ = payload.v as BrowserVer || BrowserVer.assumedVer
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      Build.OS & (1 << kOS.mac) && Build.OS & ~(1 << kOS.mac) &&
      (payload.o || (Vomnibar_.keyIdCorrectionOffset_old_cr_ = 300))
    }
    if (Build.OS & (Build.OS - 1)) { Vomnibar_.os_ = payload.o }
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
    addEventListener("message", onUnknownMsg, true);
  function onUnknownMsg(event: MessageEvent): void {
    if (event.source === parent) {
      const data: VomnibarNS.MessageData = event.data;
      if (!(data && data.length === 3 && data[0] === "VimiumC"
            && typeof data[1] === "string" && typeof data[2] === "object")) { return }
      isWeb && VUtils_.Stop_(event, 0); // smell like VomnibarNS.MessageData
      if (data[1].length === GlobalConsts.VomnibarSecretLength) {
        handler(data[1], event.ports[0] as VomnibarNS.IframePort, data[2])
      }
    }
  }
  VPort_.connect_(PortType.omnibar);
})();
