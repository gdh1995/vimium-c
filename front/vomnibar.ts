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
  dismiss, focus, blurInput, backspace, blur, up, down = up + 2, toggle, pageup, pagedown, remove, copy,
  home, end, copyWithTitle, copyPlain, pastePlain, altAtOnce
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
  mode: CompletersNS.ValidTypes | "omni" | "bomni"
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
    a.updateQueryFlag_(CompletersNS.QueryFlags.NoSessions, !!options.noSessions)
    a.options_ = options
    let engines = options.engines
    engines instanceof Array && (engines = engines.join() as keyof typeof CompletersNS.SugType)
    if (typeof engines === "string" && engines) {
      engines = (engines.includes("bookmark") ? SugType2.kBookmark : 0)
          + (engines.includes("history") ? SugType2.kHistory : 0)
          + (engines.includes("tab") ? SugType2.tab : 0)
          + (engines.includes("search") ? SugType2.search : 0)
          + (engines.includes("domain") ? SugType2.domain : 0)
    }
    a.mode_.e = ((engines as CompletersNS.SugType | "") || SugType2.Empty) | 0
    if (a.mode_.e) { a.mode_.o = "omni" }
    a.baseHttps_ = null;
    let { url, keyword, p: search } = options, start: number | undefined;
    let [parWidth, parHeight, parScale] = options.w
    let scale = Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
            && (Build.BTypes === BrowserType.Chrome as number
                || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)
            && a.browserVer_ < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          ? devicePixelRatio : parScale
      , dz = a.docZoom_ = scale < 0.98 ? 1 / scale : 1;
    const frameElWidth = Math.min(parWidth * a.wndRatioX_ + PixelData.MarginH, a.maxWidthInPixel_)
    if (Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
        && (Build.BTypes === BrowserType.Chrome as number
            || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)) {
      if (a.browserVer_ < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && Math.abs(parScale - scale) > 1e-3) {
        const maxH = (options satisfies Pick<CmdOptions[kFgCmd.vomnibar], "s"|"t"> as Pick<CmdOptions[kFgCmd.vomnibar]
            , "s" | "t"> as CmdOptions[kFgCmd.vomnibar]).h, topVH = 50 - maxH * scale / parScale / parHeight * 60
        VPort_.postToOwner_({ N: VomnibarNS.kFReq.scaled_old_cr
            , t: topVH > 6400 / parHeight ? topVH.toFixed(1) : "" })
      }
      a.onInnerWidth_(parScale / scale * frameElWidth)
      parHeight *= parScale / scale
    } else {
      a.onInnerWidth_(frameElWidth)
    }
    const max = Math.max(3, Math.min(0 | ((parHeight / dz
          - a.baseHeightIfNotEmpty_
          - (PixelData.FrameTop - ((PixelData.MarginV2 / 2 + 1) | 0) - PixelData.ShadowOffset * 2
             + GlobalConsts.MaxScrollbarWidth)
        ) / a.itemHeight_), a.maxMatches_));
    a.mode_.r = max;
    a.height_ = +a.isActive_
    a.preInit_ && a.preInit_(options.t)
    if (Build.BTypes !== BrowserType.Firefox as number) {
      a.docSt_.zoom = dz > 1 ? dz + "" : "";
    } else {
      a.docSt_.fontSize = dz > 1 ? dz + "px" : "";
    }
    if (Build.BTypes & BrowserType.Firefox
        && (Build.BTypes === BrowserType.Firefox as number || a.browser_ === BrowserType.Firefox)) {
      /* empty */
    } else if (a.mode_.i) {
      const favScale = scale === 1 ? 1 : scale < 3 ? 2 : scale < 3.5 ? 3 : 4
/**
 * Note: "@1x" is necessary, because only the whole 'size/aa@bx/' can be optional
 * * definition: https://cs.chromium.org/chromium/src/chrome/browser/ui/webui/favicon_source.h?type=cs&q=FaviconSource&g=0&l=47
 * * parser: https://cs.chromium.org/chromium/src/components/favicon_base/favicon_url_parser.cc?type=cs&q=ParseFaviconPath&g=0&l=33
 */
      const prefix = '" style="background-image: url(&quot;';
      if (Build.MV3) {
        a._favPrefix = prefix + location.origin + "/_favicon/?size=" + (16 * favScale) + "&pageUrl="
      } else {
        a._favPrefix = prefix + "chrome://favicon/size/16@" + favScale + "x/"
      }
    }
    keyword = (keyword || "") + "";
    if (url == null) {
      a.reset_(keyword && keyword + " ")
      return
    }
    if (search) {
      start = search.s;
      url = search.u;
      keyword || (keyword = search.k);
    } else if (search === null) {
      url = VUtils_.decodeURL_(url).replace(<RegExpG> /\s$/g, "%20");
      if (!keyword && (<RegExpI> /^https?:\/\//i).test(url)) {
        const isHttps = (url.charCodeAt(4) | kCharCode.CASE_DELTA) === kCharCode.s
        url = url.slice(isHttps ? 0 : 7, url.indexOf("/", 8) === url.length - 1 ? -1 : void 0)
        a.baseHttps_ = [isHttps, url.slice(isHttps ? 8 : 0).split("/", 1)[0]]
      }
      const sep = (<RegExpOne> /[?#]/).exec(url), sep_index = sep ? sep.index + 1 : 0
      if (sep_index && (<RegExpI> /%2f|%3a/i).test(url.slice(sep_index))) {
        const arg = VUtils_.decodeURL_(url.slice(sep_index), decodeURIComponent)
        url = sep![0] === "#" || !arg.includes("#") ? url.slice(0, sep_index) + arg : url
      }
    } else {
      const endsWithSpace = url.trimRight().length !== url.length
      url = VUtils_.decodeURL_(url, decodeURIComponent)
      url = (endsWithSpace ? url : url.trim()).replace(a.spacesRe_, " ");
    }
    if (keyword && (!search || !search.c)) {
      start = (start || 0) + keyword.length + 1;
      a.reset_(keyword + " " + url, start, start + url.length)
    } else {
      a.reset_(url)
    }
  },

  isActive_: false,
  options_: null as never as VomnibarNS.ContentOptions,
  inputText_: "",
  lastQuery_: null as string | null,
  useInput_: true,
  inputType_: 0 as BOOL,
  lastParsed_: "",
  completions_: null as never as SuggestionE[],
  total_: 0,
  maxPageNum_: Math.min(Math.max(3, (window.VomnibarMaxPageNum! | 0) || 10), 100),
  isEditing_: false,
  isInputComposing_: null as [left: number, right: number] | null,
  baseHttps_: null as [boolean, string] | null,
  isHttps_: null as [boolean, string] | null,
  isSearchOnTop_: false,
  actionType_: ReuseType.current as ReuseType | null,
  matchType_: CompletersNS.MatchType.Default,
  sugTypes_: CompletersNS.SugType.Empty,
  resMode_: "",
  focused_: false,
  showing_: false,
  codeFocusTime_: 0,
  codeFocusReceived_: false,
  blurWanted_: 0 as BOOL,
  showFavIcon_: 0 as 0 | 1 | 2,
  showRelevancy_: false,
  docZoom_: 1,
  lastScrolling_: 0,
  height_: 0,
  _canvas: null as HTMLCanvasElement | null,
  input_: null as never as HTMLInputElement & Ensure<HTMLInputElement
      , "selectionDirection" | "selectionEnd" | "selectionStart">,
  docSt_: null as never as CSSStyleDeclaration,
  bodySt_: null as never as CSSStyleDeclaration,
  inputBar_: null as never as HTMLElement,
  barCls_: null as never as DOMTokenList,
  isSelOriginal_: true,
  lastKey_: kKeyCode.None,
  inOldShift_: 0 as BOOL | boolean,
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
  _listenedAltDown: 0 as kChar | kKeyCode,
  noInputMode_: false,
  altChars_: null as string[] | null,
  wheelStart_: 0,
  wheelTime_: 0,
  wheelDelta_: 0,
  wheelSpeed_: 1,
  wheelMinStep_: 0,
  _nearWheelHasDeltaXY: 0,
  _nearWheelDeltaLimited: 0,
  browser_: Build.BTypes && !(Build.BTypes & (Build.BTypes - 1)) ? Build.BTypes as never : BrowserType.Chrome,
  browserVer_: BrowserVer.assumedVer,
  isEdg_: false,
  os_: (Build.OS & (Build.OS - 1) ? kOS.win : Build.OS < 8 ? (Build.OS / 2) | 0 : Math.log2(Build.OS)
      ) as SettingsNS.ConstItems["o"][1],
  mappedKeyRegistry_: null as SettingsNS.AllVomnibarItems["m"][1],
  keyLayout_: 0,
  maxMatches_: 0,
  queryInterval_: 0,
  heightIfEmpty_: VomnibarNS.PixelData.OthersIfEmpty,
  baseHeightIfNotEmpty_: VomnibarNS.PixelData.OthersIfNotEmpty,
  itemHeight_: VomnibarNS.PixelData.Item,
  wndRatioX_: VomnibarNS.PixelData.WindowSizeRatioX,
  maxWidthInPixel_: VomnibarNS.PixelData.MaxWidthInPixel,
  styles_: "",
  customCss_: "",
  styleEl_: null as HTMLStyleElement | null,
  darkBtn_: null as HTMLElement | null,
  last_scrolling_key_: kKeyCode.None,
  showTime_: 0 as 0 | /** abs-num */ 1 | /** abs */ 2 | /** relative */ 3,
  show_ (): void {
    const a = Vomnibar_
    a.showing_ = true;
    setTimeout(a.focus_, 0);
    ((document.body as Element).addEventListener as typeof addEventListener)("wheel", a.onWheel_
        , { passive: false, capture: true })
  },
  hide_ (fromContent?: BOOL): void {
    const a = Vomnibar_, el = a.input_;
    a.isActive_ = a.showing_ = a.isEditing_ = a.codeFocusReceived_ = false
    a.isInputComposing_ = a._canvas = null
    a.codeFocusTime_ = a.blurWanted_ = a.inputType_ = a._listenedAltDown = 0;
    ((document.body as Element).removeEventListener as typeof removeEventListener)("wheel", a.onWheel_
        , { passive: false, capture: true })
    a.timer_ > 0 && clearTimeout(a.timer_);
    window.onkeyup = null as never;
    fromContent ||
    VPort_ && VPort_.post_({ H: kFgReq.nextFrame, t: Frames.NextType.current, o: !a.doEnter_, k: a.lastKey_ })
    el.blur() // in case of a wrong IME state on Chrome 107 on v1.99.6
    a.bodySt_.display = "none"
    a.blurred_()
    Build.MinCVer < BrowserVer.MinStyleSrcInCSPNotBreakUI && Build.BTypes & BrowserType.Chrome
        ? a.docSt_.zoom = "" : a.docSt_.cssText = ""
    a.list_.style.height = a.lastParsed_ = a.list_.textContent = el.value = "";
    a.barCls_.remove("empty");
    a.list_.classList.remove("no-favicon");
    a.toggleAlt_()
    a.afterHideTimer_ = requestAnimationFrame(Build.BTypes & BrowserType.Firefox
        && (Build.BTypes === BrowserType.Firefox as number || a.browser_ === BrowserType.Firefox) || !a.doEnter_
        ? a.AfterHide_ : (): void => { a.afterHideTimer_ = requestAnimationFrame(a.AfterHide_) })
    a.timer_ = setTimeout(a.AfterHide_, a.doEnter_ ? 35 : 17)
  },
  AfterHide_ (this: void): void {
    const a = Vomnibar_;
    a.afterHideTimer_ && cancelAnimationFrame(a.afterHideTimer_);
    a.timer_ && clearTimeout(a.timer_);
    a.afterHideTimer_ = a.timer_ = 0
    if (a.height_ && !a.isActive_) {
      a.onHidden_();
    }
  },
  onHidden_ (): void {
    VPort_ && VPort_.postToOwner_({ N: VomnibarNS.kFReq.hide })
    const a = Vomnibar_;
    a.timer_ = a.height_ = a.matchType_ = a.sugTypes_ = a.wheelStart_ = a.wheelTime_ = a.actionType_ = a.inputType_ =
    a.total_ = a.lastKey_ = a.inOldShift_ = a.wheelDelta_ = VUtils_.timeCache_ = 0
    a.docZoom_ = 1;
    a.options_ = a.completions_ = a.onUpdate_ = a.isHttps_ = a.baseHttps_ = a.lastQuery_ = null as never
    a.mode_.q = a.inputText_ = a.resMode_ = ""
    a.mode_.o = "omni";
    a.mode_.t = CompletersNS.SugType.Empty;
    a.isSearchOnTop_ = false
    VUtils_._cachedFavicons = {}
    if (!a.doEnter_ || !VPort_) {
      (<RegExpOne> /a?/).test("")
    } else if (Build.BTypes & BrowserType.Firefox
        && (Build.BTypes === BrowserType.Firefox as number || a.browser_ === BrowserType.Firefox)
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
          && (Build.BTypes === BrowserType.Firefox as number || a.browser_ === BrowserType.Firefox) ? 1 : 0)
    }
    a.doEnter_ = null;
  },
  reset_ (input: string, start?: number, end?: number): void {
    const a = Vomnibar_;
    (<RegExpOne> /^\+\d\d?$/).test(input.trim()) && (start = end = 0, input = " " + input.trim())
    a.inputText_ = input;
    a.useInput_ = a.showing_ = false;
    a.isHttps_ = a.baseHttps_;
    a.mode_.q = a.lastQuery_ = input && input.trim().replace(a.spacesRe_, " ");
    a.isActive_ = true;
    a.AfterHide_() // clear afterHideTimer_
    // also clear @timer
    a.update_(0)
    if (a.init_) { a.init_(); }
    a.input_.value = a.inputText_;
    start! <= end! && a.input_.setSelectionRange(start!, end!)
    document.body!.dataset.mode = a.mode_.o
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
      if (Build.BTypes & ~BrowserType.ChromeOrFirefox || Build.BTypes & BrowserType.Chrome
          && Build.MinCVer < BrowserVer.MinFocusIframeDirectlyBy$activeElement$$focus) {
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
  updateInput_ (): void {
    const a = Vomnibar_, focused = a.focused_, blurred = a.blurWanted_
    a.isSelOriginal_ = false;
    if (a.selection_ === -1) {
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
    const line = a.completions_[a.selection_] as SuggestionEx
    if (line.parsed_) {
      a._didUpdateInput(line, line.parsed_)
      return
    }
    (line as Partial<SuggestionEx>).https_ == null && (line.https_ = line.u.startsWith("https://"));
    if (line.e !== "history" && line.e !== "tab" && !(line.e === "search" && a.mode_.q.startsWith(":"))) {
      if (line.parsed_ == null) {
        VUtils_.ensureText_(line);
        line.parsed_ = "";
      }
      a._didUpdateInput(line, line.t)
      line.e === "math" && !blurred && a.input_.select();
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
        str = str.lastIndexOf("://", 5) < 0 ? (ind === ProtocolType.http ? "http://" : "https://") + str : str
        str = url.endsWith("/") && !str.endsWith("/") ? str + "/" : str
      }
    }
    VPort_.post_({ H: kFgReq.parseSearchUrl, i: a.selection_, u: str })
  },
  parsed_ ({ i: id, s: search }: BgVomnibarSpecialReq[kBgReq.omni_parsed]): void {
    const line = Vomnibar_.completions_[id] as SuggestionEx;
    line.parsed_ = search ? ((Vomnibar_.mode_.e ? Vomnibar_.mode_.e & CompletersNS.SugType.search
          : Vomnibar_.mode_.o.endsWith("omni")) && !Vomnibar_.resMode_ ? "" : ":o ")
        + search.k + " " + search.u + " " : Vomnibar_.resMode_ + line.t
    Vomnibar_.lastParsed_ = line.parsed_
    if (id === Vomnibar_.selection_) {
      Vomnibar_._didUpdateInput(line, line.parsed_)
    }
  },
  toggleInput_ (): void {
    const a = Vomnibar_;
    if (a.selection_ < 0) { return; }
    if (a.isSelOriginal_) {
      a.inputText_ = a.input_.value;
      return a.updateInput_()
    }
    let line = a.completions_[a.selection_] as SuggestionEx, str = a.input_.value.trim();
    a.resMode_ && (str = str.slice(a.resMode_.length))
    str = str === (line.title || line.u) ? line.parsed_ || a.resMode_ + (line.title === line.t ? line.u : line.t)
        : a.resMode_ + (line.title && str === line.u ? line.title : str === line.t ? line.u : line.t)
    a._didUpdateInput(line, str)
  },
  _didUpdateInput (line: SuggestionEx, str: string): void {
    const maxW = str.length * 10, tooLong = maxW > innerWidth - PixelData.AllHNotInput;
    if (Vomnibar_.input_.value !== str) {
      Vomnibar_.input_.value = str
      if (line.e === "domain") { Vomnibar_.input_.select() }
    }
    tooLong && (Vomnibar_.input_.scrollLeft = maxW);
    Vomnibar_.isHttps_ = str !== line.t || !line.u.includes("://") ? null
        : [line.https_, line.u.split("://")[1].split("/", 1)[0]]
    Vomnibar_.isEditing_ = str !== line.parsed_ || line.parsed_ === line.t;
  },
  updateSelection_ (sel: number): void {
    const a = Vomnibar_;
    const ref = a.list_.children, old = a.selection_;
    (a.isSelOriginal_ || old === -1) && (a.inputText_ = a.input_.value)
    a.selection_ = sel
    a.updateInput_()
    old >= 1 && ref[old - 1].classList.remove("p");
    old >= 0 && ref[old].classList.remove("s");
    sel >= 1 && ref[sel - 1].classList.add("p");
    sel >= 0 && ref[sel].classList.add("s");
  },
  _keyNames: [kChar.space, kChar.pageup, kChar.pagedown, kChar.end, kChar.home,
        kChar.left, kChar.up, kChar.right, kChar.down,
        /* 41 */ kChar.None, kChar.None, kChar.None, kChar.None, kChar.insert, kChar.delete
        ] satisfies kChar[] as readonly kChar[],
  _codeCorrectionMap: ["Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote",
    "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash"],
  _modifierKeys: {
    Alt: 1, AltGraph: 1, Control: 1, Meta: 1, OS: 1, Shift: 1
  } satisfies Dict<1> as Dict<1> as SafeEnum,
  keyIdCorrectionOffset_old_cr_: Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? Build.OS !== kBOS.MAC as number ? 185 as const : 300 as const : 0 as never as null,
  _getKeyName (event: Pick<KeyboardEvent, "key" | "keyCode" | "location">): kChar {
    let i = event.keyCode, s: string | undefined
    return i > kKeyCode.space - 1 && i < kKeyCode.minNotDelete
        ? i < kKeyCode.space + 1 && (Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
            && Build.BTypes & BrowserType.Chrome ? (s = event.key) && s.length > 1 : (s = event.key!).length > 1)
          ? s!.toLowerCase() as kChar.space | kChar.groupnext : Vomnibar_._keyNames[i - kKeyCode.space]
        : i < kKeyCode.minNotDelete || i === kKeyCode.metaKey
          || Build.OS & kBOS.MAC && i === (Build.BTypes === BrowserType.Firefox as number
                || Build.BTypes & BrowserType.Firefox && Vomnibar_.browser_ === BrowserType.Firefox
                ? kKeyCode.os_ff_mac : kKeyCode.osRight_mac)
              && (Build.OS === kBOS.MAC as number || !Vomnibar_.os_)
        ? i === kKeyCode.backspace ? kChar.backspace : i === kKeyCode.esc ? kChar.esc
            : i === kKeyCode.tab ? kChar.tab : i === kKeyCode.enter ? kChar.enter
            : (i < kKeyCode.maxAcsKeys + 1 ? i > kKeyCode.minAcsKeys - 1 : i > kKeyCode.maxNotMetaKey)
            ? Vomnibar_.keyLayout_ > kKeyLayout.MapModifierStart - 1
              && (Vomnibar_.keyLayout_ >> kKeyLayout.MapModifierOffset) === event.location ? kChar.Modifier
              : (i === kKeyCode.osLeft || i === kKeyCode.osRight_mac) && Build.OS & kBOS.MAC
                && (Build.OS === kBOS.MAC as number || !Vomnibar_.os_) ? kChar.Meta
              : i === kKeyCode.altKey ? kChar.Alt : kChar.INVALID
            : kChar.None
        : i === kKeyCode.menuKey && Build.BTypes !== BrowserType.Safari as number
          && (Build.BTypes !== BrowserType.Chrome as number || Build.OS !== kBOS.MAC as number) ? kChar.Menu
        : ((s = event.key) ? (<RegExpOne> /^F\d/).test(s) : i > kKeyCode.maxNotFn && i < kKeyCode.minNotFn)
        ? ("f" + (s ? s.slice(1) : i - kKeyCode.maxNotFn)) as kChar.F_num
        : s && s.length > 1 && !Vomnibar_._modifierKeys[s] ? s.toLowerCase() as kChar : kChar.None
  },
  _getKeyCharUsingKeyIdentifier_old_cr: Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
      ? (event: Pick<OldKeyboardEvent, "keyIdentifier">, shiftKey: BOOL): string => {
    let s: string | undefined = event.keyIdentifier,
    keyId: kCharCode = s.startsWith("U+") ? parseInt(s.slice(2), 16) : 0;
    if (keyId < kCharCode.minNotAlphabet) {
      return keyId < kCharCode.minNotSpace ? ""
          : shiftKey && keyId > kCharCode.maxNotNum && keyId < kCharCode.minNotNum
          ? kChar.EnNumTrans[keyId - kCharCode.N0]
            : String.fromCharCode(keyId < kCharCode.minAlphabet || shiftKey ? keyId : keyId + kCharCode.CASE_DELTA)
    } else {
      // here omits a `(...)` after the first `&&`, since there has been `keyId >= kCharCode.minNotAlphabet`
      return Build.OS !== kBOS.MAC as number && keyId > Vomnibar_.keyIdCorrectionOffset_old_cr_!
          && (keyId -= 186) < 7 || (keyId -= 26) > 6 && keyId < 11
        ? kChar.CharCorrectionList[keyId + 12 * +shiftKey] : ""
    }
  } : 0 as never,
  char_ (event: Pick<KeyboardEvent, "code" | "key" | "keyCode" | "keyIdentifier" | "location" | "shiftKey" | "altKey">
      ): string {
    const shiftKey = Build.BTypes & BrowserType.Firefox ? Vomnibar_.hasShift_(event as KeyboardEvent) : event.shiftKey
    let key = event.key!
    let isDeadKey = Build.BTypes !== BrowserType.Edge as number && (key === "Dead" || key === "Unidentified")
    let code = event.code!
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key && !key) {
      return Vomnibar_._getKeyName(event) || Vomnibar_._getKeyCharUsingKeyIdentifier_old_cr(
            event as Pick<OldKeyboardEvent, "keyIdentifier">, +shiftKey as BOOL)
    } else if (Build.BTypes !== BrowserType.Edge as number
        && (!(Build.BTypes & BrowserType.Edge) || Vomnibar_.browser_ !== BrowserType.Edge)
        && (Vomnibar_.keyLayout_ & kKeyLayout.alwaysIgnore
            || Vomnibar_.keyLayout_ & kKeyLayout.ignoreIfAlt && event.altKey || isDeadKey
            || key > kChar.maxASCII && key.length === 1)) {
      let prefix = code.slice(0, 3)
      let isKeyShort = key.length < 2 || isDeadKey
      let mapped: number | undefined
      if (prefix !== "Num") { // not (Numpad* or NumLock)
        if (prefix === "Key" || prefix === "Dig" || prefix === "Arr") {
          code = code.slice(code < "K" ? 5 : 3);
        }
        key = code.length === 1 && isKeyShort
              ? !shiftKey || code < "0" || code > "9" ? code : kChar.EnNumTrans[+code]
              : Vomnibar_._modifierKeys[key]
                ? Vomnibar_.keyLayout_ > kKeyLayout.MapModifierStart - 1
                  && (Vomnibar_.keyLayout_ >> kKeyLayout.MapModifierOffset) === event.location ? kChar.Modifier
                : key === "Meta" && Build.OS & kBOS.MAC
                  && (Build.OS === kBOS.MAC as number || !Vomnibar_.os_) ? kChar.Meta
                : key === "Alt" ? kChar.Alt : ""
              : key === "Escape" ? kChar.esc
              : code.length < 2 || !isKeyShort ? key.startsWith("Arrow") && key.slice(5) || key
              : (mapped = Vomnibar_._codeCorrectionMap.indexOf(code)) < 0 ? code
              : kChar.CharCorrectionList[mapped + 12 * +shiftKey]
            ;
      }
      key = shiftKey && key.length < 2 ? key : key.toLowerCase()
    } else {
      key = key.length > 1 || key === " " ? (Vomnibar_._getKeyName(event) || key.toLowerCase()).trim()
          : shiftKey ? key.toUpperCase() : key.toLowerCase()
    }
    return key;
  },
  hasShift_: Build.BTypes & BrowserType.Firefox ? (event: KeyboardEvent): boolean => {
    const key = Build.BTypes === BrowserType.Firefox as number || Vomnibar_.browser_ === BrowserType.Firefox
        ? event.key! : ""
    const upper = key.length === 1 ? key.toUpperCase() : ""
    return upper && key.toLowerCase() !== upper && event.getModifierState("CapsLock") ? key !== upper : event.shiftKey
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
        mapped = Vomnibar_.mappedKeyRegistry_[key + ":" + GlobalConsts.OmniModeId] || Vomnibar_.mappedKeyRegistry_[key]
        mapped = mapped ? mapped : !isLong && (mapped = Vomnibar_.mappedKeyRegistry_[chLower]) && mapped.length < 2
            && (baseMod = mapped.toUpperCase()) !== mapped
            ? mod ? mod + mapped : char === chLower ? mapped : baseMod : ""
      }
    }
    return mapped ? { mapped: true, key: mapped } : { mapped: false, key }
  },
  ctrlCharOrShiftKeyMap_: {
    // for Ctrl / Meta
    space: AllowedActions.toggle
    , j: AllowedActions.down, k: AllowedActions.up, n: AllowedActions.down, p: AllowedActions.up
    , "[": AllowedActions.dismiss, "]": AllowedActions.toggle
    // for Shift
    , up: AllowedActions.pageup, down: AllowedActions.pagedown, tab: AllowedActions.up, delete: AllowedActions.remove
  } satisfies { [char in kChar]?: AllowedActions } as { readonly [char in kChar]?: AllowedActions },
  normalMap_: {
    tab: AllowedActions.down, esc: AllowedActions.dismiss
    , pageup: AllowedActions.pageup, pagedown: AllowedActions.pagedown
    , up: AllowedActions.up, down: AllowedActions.down
    , f1: AllowedActions.backspace, f2: AllowedActions.blur, alt2: AllowedActions.altAtOnce,
  } satisfies { [char in kChar]?: AllowedActions } as { readonly [char in kChar]?: AllowedActions },
  onKeydown_ (event: KeyboardEventToPrevent): void {
    const a = Vomnibar_, n = event.keyCode, focused = a.focused_,
    { mapped, key } = n !== kKeyCode.ime ? a.getMappedKey_(event) : { mapped: false, key: "" }
    a.lastKey_ = (!(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && a.os_ || !event.metaKey) ? n : 0
    a.inOldShift_ = event.shiftKey && (n === kKeyCode.shiftKey && !event.repeat ? false
        : n !== kKeyCode.shiftKey && key.length === 1 || a.inOldShift_)
    if (!key) {
      a.inAlt_ && !a._modifierKeys[Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key
            && Build.BTypes & BrowserType.Chrome ? event.key || "" : event.key!] && a.toggleAlt_()
      a.keyResult_ = focused && !(Build.OS !== kBOS.MAC as number && n === kKeyCode.menuKey && a.os_)
          && n !== kKeyCode.ime ? SimpleKeyResult.Suppress : SimpleKeyResult.Nothing
      return;
    }
    if (key.startsWith("v-")) {
      VPort_.post_({ H: kFgReq.keyFromOmni, k: `<${key}>`, l: n,
          e: focused ? [ a.input_.localName, a.input_.id, a.input_.className ] : ["body", "", ""] })
      a.inAlt_ && a.toggleAlt_()
      return
    }
    let action: AllowedActions = AllowedActions.nothing, ind: number;
    const char = (key.slice(key.lastIndexOf("-") + 1) || key && kChar.minus) as kChar,
    mainModifier = key.includes("-", 1) ? key[0] as "a" | "c" | "m" | "s" : ""
    if (char === kChar.enter) {
      if (!event.metaKey && (event.key === "Enter" || n === kKeyCode.enter)) {
        window.onkeyup = a.OnNativeEnterUp_.bind(null, key, mapped)
      } else {
        a.onEnter_(key)
      }
      return
    }
    if (mainModifier === "a"
        || mainModifier === "m" && Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !a.os_)) {
      ind = char >= "0" && char <= "9" ? +char || 10
          : mapped || !(Build.BTypes & BrowserType.Firefox ? a.hasShift_(event as KeyboardEvent) : event.shiftKey) ? -1
          : event.code ? event.code.startsWith("Digit") ? +event.code.slice(5) || 10 : -1
          : n > kKeyCode.maxNotNum && n < kKeyCode.minNotNum ? (n - kKeyCode.N0) || 10 : -1
      if (ind >= 0 && (!(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && a.os_
          || mainModifier === "m" || (<RegExpOne> /[cm]-/).test(key))) {
        if (ind <= a.completions_.length) { a.onEnter_(char >= "0" && char <= "9" ? true : -2, ind - 1) }
        return
      }
        if ((<RegExpOne> /^([am]-modifier|a-alt|m-meta)$/).test(key)) {
          if (a.inAlt_ === 1 ? !event.repeat : a.inAlt_ === 0) {
            a._listenedAltDown = char !== kChar.Modifier && !mapped ? char : n
            addEventListener("keyup", a._onAltUp, true)
            a.inAlt_ = a.inAlt_ || -setTimeout(a.toggleAlt_, 260, 1)
          }
          return;
        }
        a.inAlt_ > 0 ? a._onAltUp() : a.toggleAlt_()
        if (char === kChar.down || char === kChar.up || (<RegExpOne> /^[jknp]$/).test(char)) {
          return a.onAction_(char < "o" && char !== "k" ? AllowedActions.down : AllowedActions.up);
        }
    }
    if (mainModifier && mainModifier < "s" && focused) {
      if ((char === kChar.left || char === kChar.right) && !key.includes("m-")) {
        action = (key.includes("s-") ? char > kChar.r ? kCharCode.G : kCharCode.H
            : char > kChar.r ? kCharCode.F : kKeyCode.B) - kCharCode.maxNotAlphabet
        if (Build.BTypes & BrowserType.Chrome && (Build.BTypes === BrowserType.Chrome as number
              || a.browser_ & BrowserType.Chrome) && !mapped
            && mainModifier === (!(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && a.os_ ? "c" : "a")) {
          VUtils_.nextTask_(a.onWordAction_.bind(0, action, true)) // `setTimeout` may be too late on Chrome in WSLg
          a.keyResult_ = SimpleKeyResult.Suppress;
        } else {
          a.onWordAction_(action)
        }
        return
      } else if (char === kChar.backspace) {
        if (mainModifier > "a" || Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !a.os_)
              && !key.includes("a-c-")) { // treat <a-c-***> on macOS as <a-***> on Windows
          // -2 is for https://www.reddit.com/r/firefox/comments/767bha/how_to_make_cmdbackspace_better_on_macos/
          a.onWordAction_(mainModifier < "m" ? -1 : key.includes("s-") ? -3 : -2)
        } else if (!(Build.OS & kBOS.WIN) || Build.OS !== kBOS.WIN as number && a.os_ < kOS.win || key.includes("a-c-")
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinAltBackspaceWithShiftToUndoOrRedo
                && a.browser_ === BrowserType.Chrome && a.browserVer_ < BrowserVer.MinAltBackspaceWithShiftToUndoOrRedo
            || Build.BTypes & ~BrowserType.ChromeOrFirefox && !(a.browser_ & BrowserType.ChromeOrFirefox)) {
          document.execCommand(key.includes("s-") ? "redo" : "undo")
        } else {
          a.keyResult_ = SimpleKeyResult.Suppress
        }
        return
      }
    }
    if (mainModifier === "a" || mainModifier === "m") {
      if (char === kChar.f2) { return a.onAction_(focused ? AllowedActions.blurInput : AllowedActions.focus) }
      if (focused && char.length === 1 && "bdfw".includes(char)
          && !(Build.OS !== kBOS.MAC as number && (!(Build.OS & kBOS.MAC) || a.os_) && key === "a-d")) {
        return a.onWordAction_(char.charCodeAt(0) - (kCharCode.maxNotAlphabet | kCharCode.CASE_DELTA)
            , 0, key.includes("s-") ? 3 : 0)
      }
      if (key === "a-c-c" || key === "a-m-c") { return a.onAction_(AllowedActions.copyPlain) }
      if (mainModifier === "a") { a.keyResult_ = SimpleKeyResult.Nothing; return; }
    }
    if (mainModifier === "c" || mainModifier === "m") {
      if (char === kChar.c) {
        action = a.selection_ >= 0 && getSelection().type !== "Range"
            && (!(Build.BTypes & BrowserType.Firefox) && !(Build.BTypes & BrowserType.Chrome)
                  || Build.MinCVer > BrowserVer.$Selection$NotShowStatusInTextBox
              || a.input_.selectionStart === a.input_.selectionEnd)
            ? key.includes("s") ? AllowedActions.copyWithTitle : AllowedActions.copy
            : key.includes("s") ? AllowedActions.copyPlain
            : Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !a.os_) && key === "c-c" ? AllowedActions.copy
            : AllowedActions.nothing
      } else if (key === "c-v" && Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !a.os_)) {
        action = AllowedActions.pastePlain
      } else if (key === "c-d" && (!(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && a.os_)) {
        return a.onWordAction_(kCharCode.D - kCharCode.maxNotAlphabet)
      } else if (key.includes("s-")) {
        action = char === kChar.f ? AllowedActions.pagedown : char === kChar.b ? AllowedActions.pageup
          : char === kChar.v ? AllowedActions.pastePlain : AllowedActions.nothing;
      } else if (char === kChar.up || char === kChar.down || char === kChar.end || char === kChar.home) {
        event.preventDefault();
        a.lastScrolling_ = event.timeStamp
        a.last_scrolling_key_ = -n
        window.onkeyup = Vomnibar_.HandleKeydown_;
        VPort_.postToOwner_({ N: VomnibarNS.kFReq.scroll, k: key, b: char });
        return;
      } else if (char === kChar.delete || char === kChar.tab) {
        a.keyResult_ = SimpleKeyResult.Suppress;
      } else {
        action = (n !== kKeyCode.space || mainModifier === "c")
            && a.ctrlCharOrShiftKeyMap_[char] || AllowedActions.nothing
      }
    }
    else if (mainModifier === "s") {
      action = (n !== kKeyCode.space || !a.inOldShift_) && a.ctrlCharOrShiftKeyMap_[char] || AllowedActions.nothing
    }
    else if (action = a.normalMap_[char] || AllowedActions.nothing) { /* empty */ }
    else if (char > kChar.maxNotF_num && char < kChar.minNotF_num) { // "f" + N
      a.keyResult_ = SimpleKeyResult.Nothing;
      return;
    } else if (focused && (char === kChar.home || char === kChar.end)) { // home/end on macOS scrolls a page if possible
      action = char > kChar.h ? AllowedActions.home : AllowedActions.end
    }
    else if (n === kKeyCode.backspace) { focused && (a.keyResult_ = SimpleKeyResult.Suppress); return }
    else if (char !== kChar.space) { /* empty */ }
    else if (!focused) { action = AllowedActions.focus; }
    else if (!mapped && (a.selection_ >= 0 || a.completions_.length <= 1)
        && a.input_.value.endsWith(a.lastParsed_.endsWith(" ") ? "   " : "  ")) {
      return a.onEnter_(true);
    }
    if (action) {
      return a.onAction_(action);
    }

    if (focused || char.length !== 1 || isNaN(ind = parseInt(char, 10))) {
      a.keyResult_ = (focused ? !(Build.OS !== kBOS.MAC as number && n === kKeyCode.menuKey && a.os_) : key.length > 1)
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
    case AllowedActions.blurInput: a.blurWanted_ = 1; a.input_.blur(); break
    case AllowedActions.backspace: case AllowedActions.blur:
      !a.focused_ ? a.focus_() : action === AllowedActions.blur ? a.focus_(false) : document.execCommand("delete")
      break;
    case AllowedActions.up: case AllowedActions.down:
      if (a.timer_) {
        a.onUpdate_ = () => { Vomnibar_.selection_ = -1, Vomnibar_.isSelOriginal_ = false; Vomnibar_.onAction_(action) }
        a.timer_ > 0 && a.update_(0, a.onUpdate_)
        return
      }
      sel = a.completions_.length + 1;
      sel = (sel + a.selection_ + (action - AllowedActions.up)) % sel - 1;
      return a.updateSelection_(sel);
    case AllowedActions.toggle: return a.toggleInput_();
    case AllowedActions.pageup: case AllowedActions.pagedown: return a.goPage_(action !== AllowedActions.pageup);
    case AllowedActions.remove: return a.removeCur_();
    case AllowedActions.copy: case AllowedActions.copyWithTitle:
      let item = a.completions_[a.selection_] as SuggestionEx, title = item.title, type = item.e, math = type === "math"
      let mathSearch = !a.selection_ && a.completions_.length > 1 && a.completions_[1].e === "math"
      VUtils_.ensureText_(item)
      title = action === AllowedActions.copyWithTitle
          && type !== "search" && !math && title !== item.u && title !== item.t ? title : ""
      return VPort_.post_({ H: kFgReq.omniCopy, t: math ? item.textSplit + " = " + item.t : title
          , u: math ? "" : mathSearch ? a.completions_[1].t : item.u })
    case AllowedActions.copyPlain: case AllowedActions.pastePlain:
      const navClip = navigator.clipboard
      const plain = (!(Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Chrome
            && Build.MinCVer < BrowserVer.MinEnsured$Clipboard$and$$writeText || Build.BTypes & BrowserType.Firefox
            && Build.MinFFVer < FirefoxBrowserVer.MinEnsured$dom$events$asyncclipboard
          ) || navClip) && action === AllowedActions.copyPlain ? getSelection() + "" : ""
      action === AllowedActions.copyPlain ? plain && void navClip!.writeText!(plain) : document.execCommand("paste")
      action === AllowedActions.copyPlain && plain && VPort_.post_({ H: kFgReq.omniCopied, t: plain })
      break
    case AllowedActions.home: case AllowedActions.end:
      sel = action === AllowedActions.home ? 0 : a.input_.value.length
      a.input_.setSelectionRange(sel, sel)
      a.input_.scrollLeft = sel ? a.input_.scrollWidth : 0
      break
    case AllowedActions.altAtOnce:
      a.toggleAlt_(Vomnibar_.inAlt_ ? 0 : 1)
      break
    }
  },
  // b(2): left; d(4): right-extend-delete; f(6): right; (7): right-extend; (8): left-extend; w: left-delete
  // -1: delete a left word; -2: delete from current to start; -3: delete all
  onWordAction_ (code: number, delayed?: boolean | BOOL, mode?: 0 | 1 | 2 | 3): void {
    const BTy = !Build.BTypes || Build.BTypes & (Build.BTypes - 1) ? Vomnibar_.browser_ : Build.BTypes as never
    const re = <RegExpOne> (!(Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox
            && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp)
        ? /[^\p{L}\p{Nd}_]+/u
        : ((Build.BTypes === BrowserType.Chrome as number
              || Build.BTypes & BrowserType.Chrome && BTy & BrowserType.Chrome)
            ? Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
              && Vomnibar_.browserVer_ > BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp - 1
            : Build.BTypes === BrowserType.Firefox as number
              || Build.BTypes & BrowserType.Firefox && BTy & BrowserType.Firefox
            ? Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
              && Vomnibar_.browserVer_ > FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp - 1
            : !(Build.BTypes === BrowserType.Edge as number
                || Build.BTypes & BrowserType.Edge && BTy & BrowserType.Edge))
        ? new RegExp("[^\\p{L}\\p{Nd}_]+", "u") : /[^\w\u0386-\u03fb\u4e00-\u9fff]+/)
    const isDel = code === 4 || code < 0 || code > 9
    const isExtend = isDel || code > 6 || mode === 3, isRight = code > 3 && code < 8
    const input = Vomnibar_.input_, spacesRe = <RegExpOne> /\s+/
    if (Build.BTypes !== BrowserType.Firefox as number
        && (!(Build.BTypes & BrowserType.Firefox) || BTy !== BrowserType.Firefox)
        && !(Build.BTypes & BrowserType.Chrome && delayed)
        && !(code < -1 || isDel && input.selectionStart !== input.selectionEnd)) {
      getSelection().modify(isExtend ? "extend" : "move", isRight?"forward":"backward", mode===2?"character":"word")
    }
    const { value: str, selectionStart: start, selectionEnd: end } = input
    let isFwd = input.selectionDirection !== "backward", anchor0 = isFwd ? start : end, focus1 = isFwd ? end : start
    let a2 = anchor0, focus = focus1, s1: string
    // test string: " a+ bc +dw+ef  + daf + ++  +++  sdf fas sdd  "
    if (code < -1) { // Cmd (+ Shift)? + backspace
      a2 = 0, focus = code < -2 ? str.length : end
    } else if (isDel && anchor0 !== focus1) { // Ctrl + backspace / Alt+D
    } else if (Build.BTypes !== BrowserType.Firefox as number
        && (!(Build.BTypes & BrowserType.Firefox) || BTy !== BrowserType.Firefox) && mode && mode < 3) { /* empty */
    } else if (Build.BTypes !== BrowserType.Firefox as number
        && (!(Build.BTypes & BrowserType.Firefox) || BTy !== BrowserType.Firefox)) {
      const notNewCr = !(Build.BTypes & BrowserType.Chrome && BTy & BrowserType.Chrome)
          || Build.MinCVer < BrowserVer.MinOnWindows$Selection$$extend$stopWhenWhiteSpaceEnd
              && Vomnibar_.browserVer_ < BrowserVer.MinOnWindows$Selection$$extend$stopWhenWhiteSpaceEnd
      while (focus > 0 && re.test(s1 = str[focus] || "")
          && (!isExtend || spacesRe.test(s1) || (s1 = str[focus - 1] || "") && !spacesRe.test(s1) && re.test(s1))) {
        if (notNewCr) { isRight ? focus++ : focus--; continue }
        getSelection().modify(isExtend ? "extend" : "move", isRight ? "forward" : "backward"
            , spacesRe.test(s1) ? "character" : "word")
        focus = input.selectionDirection !== "backward" ? input.selectionEnd : input.selectionStart
      }
      notNewCr || (focus1 = focus)
    } else if (mode === 2) {
      focus += isRight ? focus < str.length ? 1 : 0 : focus > 0 ? -1 : 0
      focus += focus < str.length && (<RegExpOne> /[\udc00-\udcff]/).test(str[focus]) ? isRight ? 1 : -1 : 0
    } else if (isRight) {
      let arr = re.exec(str.slice(focus)), i1 = arr ? arr.index : 0
      s1 = arr ? arr[0] : ""
      focus = !arr ? str.length : focus + i1 + (!isExtend || !(arr = (<RegExpOne> /\S/).exec(s1)) ? s1.length
          : arr.index || (i1 ? 0 : (arr = spacesRe.exec(s1)) ? arr.index + arr[0].length : s1.length))
    } else {
      a2 = focus = str.slice(0, focus).trimRight().length
      while (0 <= --focus && re.test(str[focus]) && (!isExtend || !spacesRe.test(str[focus]))) { /**/ }
      if (!isExtend || focus === a2 - 1) { while (0 <= focus && !re.test(str[focus])) { focus-- } }
      a2 = anchor0, focus++
    }
    if (a2 !== anchor0 || focus !== focus1) {
      isExtend || (a2 = focus)
      input.setSelectionRange(focus < a2 ? focus : a2, focus < a2 ? a2 : focus, focus < a2 ? "backward" : "forward")
    }
    isDel && a2 !== focus && document.execCommand("delete")
    const { scrollWidth: sw, clientWidth: cw } = input
    if (sw < cw + 1) { return }
    const curPos = input.scrollLeft, st = getComputedStyle(input), font = st.font!
    const canvas = Vomnibar_._canvas || (Vomnibar_._canvas = document.createElement("canvas"))
    const context = canvas.getContext("2d")!
    if (context.font !== font) { context.font = font }
    const nearLeft = focus + focus < str.length
    const textWidth = context.measureText(nearLeft ? str.slice(0, focus) : str.slice(focus)).width
    const focusPos = (nearLeft ? textWidth + (0 | +st.paddingLeft!) + (0 | +st.paddingRight!) : sw - textWidth) - cw
    if (curPos < focusPos + 4 ? curPos < sw - cw : curPos > focusPos + cw - 4 && curPos > 0) {
      input.scrollLeft = Math.min(Math.max(0, curPos < focusPos + 4 ? focusPos + 40 : focusPos + cw - 40), sw - cw)
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
  onEnter_ (event?: KeyStat | true | -2 | string, newSel?: number | null): void {
    const a = Vomnibar_, options = a.options_
    let sel = newSel != null ? newSel : a.selection_;
    if (typeof event === "string") {
      event = (event.includes("a-") ? KeyStat.altKey : 0) + (event.includes("c-") ? KeyStat.ctrlKey : 0)
          + (event.includes("m-") ? KeyStat.metaKey : 0) + (event.includes("s-") ? KeyStat.shiftKey : 0);
    }
    const eventKey = typeof event === "number" && event >= 0 ? event : 0
    a.actionType_ = event == null ? a.actionType_
      : event === true ? null
      : event === -2 ? ReuseType.newBg
      : event & (KeyStat.PrimaryModifier | KeyStat.shiftKey) && options.clickLike ? a.parseClickEventAs_(event)
      : event & KeyStat.PrimaryModifier ? event & KeyStat.shiftKey ? ReuseType.newBg : ReuseType.newFg
      : event & KeyStat.shiftKey ? ReuseType.current : null
    if (sel === -1) {
      const input = a.input_.value.trim();
      if (!input) {
        return;
      }
      if ((options.searchInput === false || options.itemField) && !event && !input.includes("://")) {
        if (!input.includes(":")) { return }
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
    const useItem = sel >= 0, testUrl = options.testUrl
    const item: SuggestionE | UrlInfo = useItem ? a.completions_[sel] : { u: a.input_.value.trim() },
    inputSed = options.sed, sed2 = options.itemSedKeys || null,
    itemSed = sed2 ? { r: true, k: sed2 + "" } : null, itemKeyword = options.itemKeyword, field = options.itemField,
    action = a.actionType_ ?? (options.newtab ? ReuseType.newFg : ReuseType.current), https = a.isHttps_,
    navReq: Req.fg<kFgReq.openUrl> | null = useItem && item.s != null && !itemSed && !itemKeyword
        ? null : { H: kFgReq.openUrl, f: false, r: action,
      h: useItem ? null : https && ("." + item.u.split("/", 1)[0]).endsWith("." + https[1]) ? https[0] : null,
      u: field && useItem ? field in item ? item[field as keyof typeof item] + "" : "" : item.u,
      o: { i: options.incognito,
           s: useItem ? itemSed || { r: false, k: "" } : typeof inputSed === "object" ? inputSed instanceof Array
              ? null : inputSed : { r: inputSed, k: options.inputSedKeys || options.sedKeys || options.sedKey },
          k: (useItem || !field) && itemKeyword || null, p: options.position,
          t: useItem ? !!testUrl : testUrl != null ? testUrl : "whole" }
    }, sessionReq: Req.fg<kFgReq.gotoSession> | null = navReq ? null : { H: kFgReq.gotoSession,
      a: a.actionType_ === null ? 1 : action === ReuseType.newFg ? 2 : 0, s: item.s!
    },
    func = function (this: void): void {
      !VPort_ ? 0 : navReq ? Vomnibar_.navigateToUrl_(navReq, action)
        : Vomnibar_.gotoSession_(sessionReq!, (item as SuggestionE).e === "tab");
      (<RegExpOne> /a?/).test("");
    };
    if (!useItem && eventKey & KeyStat.altKey && action > ReuseType.newBg
        && (<RegExpOne> /^\w+(-\w+)?$/).test(item.u)) {
      const domains = a.completions_.filter(i => i.e === "domain");
      navReq!.u = domains.length ? domains[0].u : `www.${item.u}.com`
    }
    if (action > ReuseType.newBg || eventKey & KeyStat.altKey) {
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
              || Build.BTypes & BrowserType.Firefox && Build.OS & kBOS.MAC
                  && (Build.BTypes === BrowserType.Firefox as number || a.browser_ === BrowserType.Firefox)
                  && keyCode === kKeyCode.os_ff_mac
              ? KeyStat.metaKey : 0)
          + (event.shiftKey || keyCode === kKeyCode.shiftKey ? KeyStat.shiftKey : 0)
      if (!a.isActive_) { return }
      a.lastKey_ = kKeyCode.None
      a.onEnter_(key, (typeof key2 === "string" ? key2 === "a-" + kChar.enter : key2 === KeyStat.altKey)
          ? !a.selection_ && a.isSelOriginal_ ? -1 : a.selection_ : null)
    }
  },
  parseClickEventAs_ (event: KeyStat): ReuseType {
    const a = Vomnibar_, type = a.options_.clickLike === true ? "chrome" : a.options_.clickLike + "",
    hasCtrl = event & KeyStat.PrimaryModifier, hasShift = event & KeyStat.shiftKey,
    likeVivaldi = type.endsWith("2") ? type.includes("chro") : type.includes("viva")
    return likeVivaldi ? hasCtrl ? hasShift ? ReuseType.newWnd : ReuseType.newBg : ReuseType.newFg
        // likeChrome / likeFirefox
        : hasCtrl ? !!hasShift !== !!a.options_.activeOnCtrl ? ReuseType.newFg : ReuseType.newBg : ReuseType.newWnd
  },
  removeCur_ (): void {
    if (Vomnibar_.selection_ < 0 || Vomnibar_.timer_) { return }
    const completion = Vomnibar_.completions_[Vomnibar_.selection_], type = completion.e;
    if (type !== "tab" && (type !== "history" || (Build.BTypes !== BrowserType.Firefox as number
          && (!(Build.BTypes & BrowserType.Firefox) || Vomnibar_.browser_ !== BrowserType.Firefox)
          && completion.s != null))) {
      VPort_.post_({ H: kFgReq.removeSug, t: "e" })
      return;
    }
    VPort_.post_({ H: kFgReq.removeSug, t: type, s: completion.s, u: completion.u })
    Vomnibar_.refresh_()
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
          item = item.parentElement as HTMLElement | null) { /* empty */ }
    const ind = ([] as Array<Node | null>).indexOf.call(Vomnibar_.list_.children, item);
    ind >= 0 && (el.href = Vomnibar_.completions_[ind].u);
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
    const a = Vomnibar_, input = a.input_
    const { target, deltaX: rawDeltaX, deltaY: rawDeltaY, deltaMode: mode } = event
    const deltaX = !rawDeltaY || rawDeltaX && Math.abs(rawDeltaX / rawDeltaY) > 1 ? rawDeltaX : 0
    const deltaY = deltaX ? 0 : rawDeltaY, hasXAndY = rawDeltaX && rawDeltaY, absDelta = Math.abs(deltaY || deltaX)
    let total = 0, scale = 0
    if (Build.BTypes & BrowserType.Firefox && Build.OS & kBOS.MAC) {
      a._nearWheelHasDeltaXY = Math.max(a._nearWheelHasDeltaXY ? 1 : 0,
          Math.min(a._nearWheelDeltaLimited + (hasXAndY ? 1 : -1), 9))
    }
    else if (hasXAndY) { a._nearWheelHasDeltaXY = 1 }
    let notTouchpad: boolean | 2 | 3 = mode === /*WheelEvent.DOM_DELTA_LINE*/ 1 ? 2 : !mode &&!hasXAndY&&!!absDelta && 3
    if (notTouchpad === 3) {
      const legacyWheelDelta = deltaX ? (event as any).wheelDeltaX : (event as any).wheelDeltaY as number
      const absLegacyDelta = legacyWheelDelta && Math.abs(legacyWheelDelta) || 0
      const absMinStep = Math.abs(a.wheelMinStep_)
      scale = absLegacyDelta ? absLegacyDelta / absDelta : 0
      // if touchpad, then 1) isScaled; 2) absDelta should be int, unless on firefox + non-mac
      const isScaled = !!scale && Math.abs(absLegacyDelta / Math.round(scale) - absDelta) <= 1
          && (!!(Build.BTypes & BrowserType.Firefox) || Build.OS === kBOS.MAC as number || (absDelta|0) === absDelta)
      a._nearWheelDeltaLimited = Math.max(-9, Math.min(a._nearWheelDeltaLimited + (absDelta < 12 ? 1 : -1), 9))
      if (Build.BTypes & BrowserType.Firefox && Build.OS & kBOS.MAC && (!(Build.OS & ~kBOS.MAC) || !a.os_)
          && (Build.BTypes === BrowserType.Firefox as number || a.browser_ & BrowserType.Firefox)
          && a._nearWheelDeltaLimited < -5 && a._nearWheelHasDeltaXY < 2) {
        a._nearWheelHasDeltaXY = 0
      }
      if (absLegacyDelta && !isScaled
          || absMinStep > 9 && (absDelta >= absMinStep || absLegacyDelta >= absMinStep) && !a._nearWheelHasDeltaXY) {
        notTouchpad = 2
      } else if (a._nearWheelHasDeltaXY) {
        notTouchpad = false
      } else if (Build.OS !== kBOS.MAC as number && (!(Build.OS & kBOS.MAC) || a.os_)) { // win or linux
        notTouchpad = (absDelta | 0) === absDelta && absDelta >= 20 && (!absLegacyDelta
            ? a._nearWheelDeltaLimited < 3 : (absDelta % 10) === 0 || absLegacyDelta >= 80 && (absLegacyDelta%10) === 0)
      } else {
        notTouchpad = absDelta >= 4 && a._nearWheelDeltaLimited < (Build.BTypes === BrowserType.Firefox as number
            || Build.BTypes & BrowserType.Firefox && a.browser_ & BrowserType.Firefox ? 2
            : /* safari or (chrome w/o legacy) */ (absDelta | 0) !== absDelta ? 5 : 3)
      }
    }
    if (notTouchpad satisfies boolean | 2 === 2) { a._nearWheelHasDeltaXY = a._nearWheelDeltaLimited = 0 }
    if (!a.isActive_ || target == input && deltaX && (deltaX < 0 ? input.scrollLeft > 0
          : input.scrollLeft + 1e-2 < input.scrollWidth - input.clientWidth)) { a.wheelDelta_ = 0; return }
    VUtils_.Stop_(event, 1);
    if (hasXAndY && Math.abs(rawDeltaX - rawDeltaY) < 0.5 || !absDelta) { return }
    const forward = !!notTouchpad !== (a.wheelMinStep_ < 0)
    if (target === input) {
      if (deltaY) {
        total = (a.wheelStart_ ? 0 : a.wheelDelta_) + deltaY
        if (Math.abs(total) >= 10) { // on mac, touchpad may cause a hook (curve)
          a.onWordAction_((total > 0) === forward ? 6 : 2, 0, notTouchpad ? 1 : 2)
          total = (Math.abs(total) % 10) * (total > 0 ? 1 : -1)
        }
      }
      a.wheelDelta_ = total
      return
    }
    if (deltaX || a.isSearchOnTop_ || a.inputBar_.contains(target as Element) && a.inputBar_ !== target) { return }
    const now = Date.now()
    if (now - a.wheelTime_ > (!mode && !notTouchpad
                              ? GlobalConsts.TouchpadTimeout : GlobalConsts.WheelTimeout)
        || now - a.wheelTime_ < -33) {
      a.wheelDelta_ = 0;
      a.wheelStart_ = 0;
    }
    a.wheelTime_ = now;
    scale = Math.max(1, 1 + Math.log(a.wheelSpeed_))
    total = a.wheelDelta_ + (notTouchpad
          ? deltaY * (GlobalConsts.VomnibarWheelStepForPage / 3) * a.wheelSpeed_
          : notTouchpad || mode ? /* WheelEvent.DOM_DELTA_PAGE */ deltaY * GlobalConsts.VomnibarWheelStepForPage
          : deltaY * scale)
    if (Math.abs(total) < GlobalConsts.VomnibarWheelStepForPage
        || a.wheelStart_ && now - a.wheelStart_ > -33 && now - a.wheelStart_ <
            GlobalConsts.VomnibarWheelIntervalForPage / scale
    ) {
      a.wheelDelta_ = total;
      return;
    }
    a.wheelDelta_ = (Math.abs(total) % GlobalConsts.VomnibarWheelStepForPage) * (total > 0 ? 1 : -1)
    a.wheelStart_ = now;
    a.goPage_(deltaY > 0);
  },
  OnInput_ (this: void, event: InputEvent): void {
    const a = Vomnibar_, s0 = a.lastQuery_
    let s1 = a.input_.value, str = s1.trim(), inputType: number = a.inputType_
    a.blurWanted_ = a.inputType_ = a._nearWheelHasDeltaXY = a._nearWheelDeltaLimited = 0
    if (Build.BTypes & BrowserType.Chrome && s1 === "/" && a.isEdg_ && a.input_.selectionEnd && !event.isComposing) {
      s1 = a.input_.value = " /" // disable the popup menu for auto-completion from edge://settings/personalinfo
    }
    if (str === (a.selection_ === -1 || a.isSelOriginal_ ? s0 : a.lastParsed_.trim()||a.completions_[a.selection_].t)) {
      return;
    }
    if (a.matchType_ === CompletersNS.MatchType.emptyResult && s0 !== null && str.startsWith(s0)) {
      if (!str.includes(" /", s0.length) || (<RegExpOne> /^\/|\s\//).test(str.slice(0, s0.length - 1))
          || !(a.mode_.e ? a.mode_.e & CompletersNS.SugType.kBookmark : "bomni bookmarks".includes(a.mode_.o))) {
        return
      }
    }
    a.lastParsed_ = ""
    if (!str) { a.isHttps_ = a.baseHttps_ = null; }
    let i = a.input_.selectionStart, arr: RegExpExecArray | null;
    if (i >= 2 && s1[i - 1] === " " && s1[i - 2] !== " " && (s0 === null || str.startsWith(s0))
        && (str.length > (str.includes(" ") ? 3 : 6) || (<RegExpOne> /[\x80-\uffff]/).test(str))) { inputType = 2 }
    if (a.isSearchOnTop_) { /* empty */ }
    else if (i > s1.length - 2) {
      if (s1.endsWith(" +") && !a.timer_ && str.slice(0, -2).trimRight() === s0) {
        return;
      }
    } else if (s0 && (arr = a._pageNumRe.exec(s0)) && str.endsWith(arr[0])) {
      const j = arr[0].length, s2 = s1.slice(0, s1.trimRight().length - j);
      if (s2.trim() !== s0.slice(0, -j).trimRight()) {
        a.input_.value = s2.trimRight();
        a.input_.setSelectionRange(i, i);
      }
    }
    a.isInputComposing_ && (!event || event.isComposing === false) && (a.isInputComposing_ = null)
    a.update_(inputType ? 0 : -1, a.inAlt_ ? a.toggleAlt_ : null)
  },
  omni_ (response: BgVomnibarSpecialReq[kBgReq.omni_omni]): void {
    const a = Vomnibar_, autoSelect = a.options_.autoSelect
    const completions = response.l, len = completions.length, notEmpty = len > 0, oldH = a.height_, list = a.list_;
    const height = a.height_ = Math.ceil(notEmpty ? len * a.itemHeight_ + a.baseHeightIfNotEmpty_ : a.heightIfEmpty_),
    wdZoom = Build.MinCVer < BrowserVer.MinEnsuredChildFrameUseTheSameDevicePixelRatioAsParent
          && (Build.BTypes === BrowserType.Chrome as number
              || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome)
        ? a.docZoom_ * devicePixelRatio : a.docZoom_,
    msg: VomnibarNS.FReq[VomnibarNS.kFReq.style] & VomnibarNS.Msg<VomnibarNS.kFReq.style> = {
      N: VomnibarNS.kFReq.style, h: height * wdZoom
    };
    if (!a.isActive_) { return; }
    if (height > oldH) { VPort_.postToOwner_(msg) }
    a.total_ = response.t;
    a.showFavIcon_ = response.i;
    a.matchType_ = response.m;
    a.sugTypes_ = response.s;
    a.resMode_ = response.r && response.r + " "
    a.completions_ = completions;
    a.isSearchOnTop_ = len > 0 && completions[0].e === "search" && !(completions[0] as CompletersNS.SearchSuggestion).n
    a.selection_ = a.isSearchOnTop_ || (autoSelect == null ? response.a : autoSelect && notEmpty) ? 0 : -1
    a.isSelOriginal_ = true;
    a.ParseCompletions_(a.completions_)
    a.renderItems_(a.completions_, list);
    if (!oldH) { a.bodySt_.display = "" }
    a.toggleInputMode_()
    if (Build.BTypes === BrowserType.Firefox as number
        || Build.BTypes & BrowserType.Firefox && a.browser_ & BrowserType.Firefox) {
      a.toggleAttr_("mozactionhint", a.isSearchOnTop_ ? "Search" : "Go", 1)
    } else {
      a.toggleAttr_("enterkeyhint", a.isSearchOnTop_ ? "Search" : "Go")
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
      a.toggleAlt_()
      a.onUpdate_ = null
    }
    height >= oldH ? a.postUpdate_()
        : requestAnimationFrame((): void => { VPort_.postToOwner_(msg); Vomnibar_.postUpdate_() })
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
      return func()
    }
  },
  toggleInputMode_ (): void {
    Vomnibar_.isInputComposing_ || Vomnibar_.lastQuery_ === null ||
    Vomnibar_.toggleAttr_("inputmode", Vomnibar_.isSearchOnTop_
        || !(<RegExpOne> /[\/:]/).test(Vomnibar_.lastQuery_) ? "search" : "url")
  },
  toggleAttr_: <V extends "Search" | "Go" | "search" | "url"> (attr: "inputmode" | "enterkeyhint" | "mozactionhint"
      , value: V, trans?: V extends "Search" | "Go" ? 1 : 0) => {
    if (trans && Vomnibar_.pageType_ === VomnibarNS.PageType.inner) {
      value = chrome.i18n.getMessage(value) as never || value
    }
    if (Vomnibar_.noInputMode_) {
      Vomnibar_.input_.removeAttribute(attr)
    } else if (Vomnibar_.input_.getAttribute(attr) !== value) {
      Vomnibar_.input_.setAttribute(attr, value);
    }
  },
  toggleStyle_ (req: BgVomnibarSpecialReq[kBgReq.omni_toggleStyle]): void {
    const enable = !Vomnibar_.styles_.includes(` ${req.t || "dark"} `)
    VPort_.post_({ H: kFgReq.omniToggleMedia, t: req.t, b: req.b, v: enable })
  },
  onStyleUpdate_ (omniStyles: string): void {
    Vomnibar_.styles_ = omniStyles;
    const body = document.body as HTMLBodyElement
    const dark = omniStyles.includes(" dark ")
    if (Build.BTypes & BrowserType.Firefox && Vomnibar_.options_.d && !omniStyles.includes(" ignore-filter ")) {
      Vomnibar_.darkBtn_ && (Vomnibar_.darkBtn_.style.display = "none")
      Vomnibar_.styles_ = omniStyles = (dark ? omniStyles.replace(" dark ", " ") : omniStyles + "dark ") + "filtered "
    } else if (Vomnibar_.darkBtn_) {
      if (!Vomnibar_.darkBtn_.childElementCount) {
        Vomnibar_.darkBtn_.textContent = dark ? "\u2600" : "\u263D";
      }
      Vomnibar_.darkBtn_.classList.toggle("toggled", dark);
      if (Build.BTypes & BrowserType.Firefox) {
        Vomnibar_.darkBtn_.style.display = ""
      }
    }
    const monospaceURL = omniStyles.includes(" mono-url ");
    Vomnibar_.showTime_ = !omniStyles.includes("time ") ? 0 : omniStyles.includes(" absolute-num-time ") ? 1
        : omniStyles.includes(" absolute-time ") ? 2 : 3
    Vomnibar_.updateQueryFlag_(CompletersNS.QueryFlags.ShowTime, Vomnibar_.showTime_ > 0);
    let newClassName = ""
    // Note: should not use style[title], because "title" on style/link has special semantics
    // https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
    const styles = document.querySelectorAll("style[id]")
    for (let i = 0; i < styles.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
      const style = styles[i] as HTMLStyleElement
      const key = (style.id !== "time" ? " " : "") + style.id + " ", isCustom = key === " custom "
      const found = isCustom || omniStyles.includes(key)
      if (style.dataset.media) {
        style.media = found ? "" : Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinForcedColorsMode
            && Vomnibar_.isEdg_ && Vomnibar_.browserVer_ < BrowserVer.MinForcedColorsMode
            ? style.dataset.media.replace("forced-colors", "-ms-high-contrast")
            : style.dataset.media
      } else {
        style.sheet!.disabled = !found;
      }
      isCustom || found && (newClassName += " has-" + style.id)
      if (found) {
        omniStyles = omniStyles.replace(key, " ");
      }
    }
    Vomnibar_.wheelSpeed_ = 1
    Vomnibar_.wheelMinStep_ = 0
    Vomnibar_.noInputMode_ = false
    Vomnibar_.altChars_ = null
    omniStyles = omniStyles.replace(<RegExpG & RegExpSearchable<2>> /\b([\w-]+)=([\w.]+)/g, (_, key, val): string => {
      let val2: string[]
      key === "wheel-speed" && (Vomnibar_.wheelSpeed_ = Math.max(0.1, Math.min(parseFloat(val) || 1, 10)))
      key === "wheel-min-step" && (Vomnibar_.wheelMinStep_ = Math.max(-2e3, Math.min(parseInt(val) || 0, 2e3)))
      key === "inputmode" && (Vomnibar_.noInputMode_ = val === "no" || val === "false" || val === "0")
      key === "alt-characters" && (
          val2 = val ? val.replace(<RegExpG> /["'<>]/g, "").split(val.includes(",") ? "," : "") : [],
          Vomnibar_.altChars_ = val2.length > 3 ? val2 : null)
      return ""
    })
    omniStyles = omniStyles.trim().replace(Vomnibar_.spacesRe_, " ");
    newClassName += " " + omniStyles
    body.classList.contains("inactive") && (newClassName += " inactive")
    newClassName = newClassName.trimLeft()
    body.className !== newClassName && (body.className = newClassName);
    if (!!(Vomnibar_.mode_.f & CompletersNS.QueryFlags.MonospaceURL) !== monospaceURL) {
      Vomnibar_.updateQueryFlag_(CompletersNS.QueryFlags.MonospaceURL, monospaceURL);
      if (Vomnibar_.isActive_ && !Vomnibar_.init_) {
        Vomnibar_.refresh_(Build.MinCVer < BrowserVer.Min$document$$hidden && Build.BTypes & BrowserType.Chrome
            && Vomnibar_.browserVer_ < BrowserVer.Min$document$$hidden ? document.webkitHidden : document.hidden);
      }
    }
  },
  updateOptions_ (delta: Req.bg<kBgReq.omni_updateOptions>["d"], confVer: number): void {
    VUtils_.safer_(delta)
    if (!Vomnibar_.init_) {
      const styles = delta.t
      styles != null && Vomnibar_.onStyleUpdate_(` ${styles} `)
      delta.c != null && Vomnibar_.onCss_(delta.c)
    }
    delta.n != null && (Vomnibar_.maxMatches_ = delta.n);
    delta.i != null && (Vomnibar_.queryInterval_ = delta.i)
    delta.m !== undefined && (Vomnibar_.mappedKeyRegistry_ = delta.m)
    delta.l != null && (Vomnibar_.keyLayout_ = delta.l)
    if (delta.s != null) {
      let sizes = delta.s.split(","), n = +sizes[0], m = Math.min, M = Math.max;
      Vomnibar_.heightIfEmpty_ = M(24, m(n || VomnibarNS.PixelData.OthersIfEmpty, 320));
      n = +sizes[1];
      Vomnibar_.baseHeightIfNotEmpty_ = M(24, m(Vomnibar_.heightIfEmpty_
          + (n || (VomnibarNS.PixelData.OthersIfNotEmpty - VomnibarNS.PixelData.OthersIfEmpty)), 320));
      n = +sizes[2];
      Vomnibar_.itemHeight_ = M(14, m(n || VomnibarNS.PixelData.Item, 120));
      n = sizes.length > 3 ? +sizes[3] : 0
      Vomnibar_.wndRatioX_ = M(0.3, m(n || VomnibarNS.PixelData.WindowSizeRatioX, 0.95));
      n = sizes.length > 4 ? +sizes[4] : 0
      Vomnibar_.maxWidthInPixel_ = M(200, m(n || VomnibarNS.PixelData.MaxWidthInPixel, 8192))
    }
    VPort_._confVersion = confVer
  },
  OnWndFocus_ (this: void, event: Event): void {
    const a = Vomnibar_, byCode = a.codeFocusTime_ && performance.now() - a.codeFocusTime_ < 120,
    blurred = event.type === "blur", target = event.target, isWnd = target === window
    if ((Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
          ? !event.isTrusted : event.isTrusted === false) || !VPort_) { return; }
    a.codeFocusReceived_ = true;
    a._nearWheelHasDeltaXY = a._nearWheelDeltaLimited = 0
    blurred && a.onWndBlur2_ && isWnd && a.onWndBlur2_()
    if (!isWnd || !a.isActive_) {
      target === a.input_ &&
      (Vomnibar_.focused_ = !blurred) && (Vomnibar_.blurWanted_ = 0)
      return;
    }
    a.codeFocusTime_ = 0;
    if (byCode) {
      a.blurred_(blurred);
      return;
    }
    setTimeout(a.blurred_, 50, null);
    if (!blurred) {
      VPort_.post_({ H: kFgReq.cmd, i: 0 })
      if (a.pageType_ !== VomnibarNS.PageType.inner && VPort_) {
        setTimeout(function (): void {
          VPort_ && !VPort_._port && VPort_.postToOwner_({ N: VomnibarNS.kFReq.broken });
        }, 50);
      }
    } else {
      Vomnibar_.inAlt_ < 0 && Vomnibar_.toggleAlt_()
      Vomnibar_._canvas = Vomnibar_.lastQuery_ = null
    }
  },
  blurred_ (this: void, blurred?: boolean | null): void {
    if (!Vomnibar_) { return; }
    const doc = document, a = (doc.body as HTMLBodyElement).classList
    // Document.hidden is since C33, according to MDN
    !Vomnibar_.isActive_ || (blurred != null ? !blurred : (Build.MinCVer < BrowserVer.Min$document$$hidden
            && Build.BTypes & BrowserType.Chrome && Vomnibar_.browserVer_ < BrowserVer.Min$document$$hidden
            ? doc.webkitHidden : doc.hidden) || doc.hasFocus())
        ? a.remove("inactive") : a.add("inactive")
  },
  onWndFreeze_ (event: Event): void {
    if (VPort_._port && event.isTrusted) {
      try {
        VPort_._port.disconnect()
      } catch { /* empty */ }
      VPort_._port = null
    }
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
    if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes&~BrowserType.Chrome) || a.browser_ === BrowserType.Chrome)
        && (Build.MinCVer >= BrowserVer.MinFreezeEvent || ver > BrowserVer.MinFreezeEvent - 1)) {
      listen("freeze", a.onWndFreeze_, true);
    }
    input.oninput = a.OnInput_ as (e: Event) => void
    input.onselect = a.OnSelect_;
    input.onpaste = (): void => { Vomnibar_.inputType_ = 1 }

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
          || ver > BrowserVer.MinBorderWidth$Ensure1$Or$Floor - 1
          || Build.MinCVer < BrowserVer.MinRoundedBorderWidthIsNotEnsured
              && ver < BrowserVer.MinRoundedBorderWidthIsNotEnsured)
        || Build.BTypes & BrowserType.Edge
            && (Build.BTypes === BrowserType.Edge as number || a.browser_ === BrowserType.Edge)) {
      const css = document.createElement("style");
      css.textContent = Build.BTypes === BrowserType.Chrome as number
        || Build.BTypes & BrowserType.Chrome && a.browser_ === BrowserType.Chrome
        ? `body::after, #input, .item { border-width: ${
          Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo &&
          ver < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo ? 1 : 0.01}px; }`
        : "#input::-ms-clear { display: none; }";
      document.head!.appendChild(css);
    }
    if (Build.BTypes !== BrowserType.Firefox as number
        && (!(Build.BTypes & BrowserType.Firefox) || a.browser_ !== BrowserType.Firefox)) {
      let func = function (this: HTMLInputElement, event: CompositionEvent): void {
        const doesStart = event.type === "compositionstart", box = Vomnibar_.input_
        Vomnibar_.isInputComposing_ = doesStart ? [box.selectionStart, box.value.length - box.selectionEnd] : null
      };
      input.addEventListener("compositionstart", func);
      input.addEventListener("compositionend", func);
    } else {
      listen("keyup", a.HandleKeyup_ff_!, true);
    }
    a.styleEl_ && document.head!.appendChild(a.styleEl_);
    a.darkBtn_ = document.querySelector("#toggle-dark") as HTMLElement | null;
    a.darkBtn_ && (a.darkBtn_.onclick = (event: MouseEventToPrevent): void => {
      Vomnibar_.toggleStyle_({ t: "", b: event.ctrlKey || event.metaKey })
      VUtils_.Stop_(event, 1)
      Vomnibar_.input_.focus();
    });
    a.onStyleUpdate_(a.styles_);
    a.onCss_(a.customCss_)
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
          && (Build.BTypes === BrowserType.Chrome as number || a.browser_ === BrowserType.Chrome)
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
  onCss_ (css: string): void {
    let st = Vomnibar_.styleEl_;
    if (!css) {
      st && st.remove();
      Vomnibar_.styleEl_ = null;
      return;
    }
    if (!st) {
      st = Vomnibar_.styleEl_ = <HTMLStyleElement | null> document.querySelector("#custom")
        || document.createElement("style");
      st.id = "custom";
      st.parentNode || document.head!.appendChild(st)
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
    if (Build.BTypes === BrowserType.Firefox as number
        || Build.BTypes & BrowserType.Firefox && a.browser_ & BrowserType.Firefox) {
      // we know that Firefox uses `data:...` as icons
      fav = 2;
    } else if (type === VomnibarNS.PageType.web) { /* empty */ }
    else if (type === VomnibarNS.PageType.inner) {
      fav = canShowOnExtOrWeb ? 2 : 0;
    } else if (canShowOnExtOrWeb && (str = docEl.dataset.favicons) != null) {
      fav = !str || str.toLowerCase() === "true" ? 2 : 0;
    } else if (canShowOnExtOrWeb && (f = chrome.runtime.getManifest) && (manifest = f())) {
      const arr = manifest.permissions || [];
      fav = Build.MV3 ? arr.includes("favicon") ? 2 : 0
          : arr.indexOf("<all_urls>") >= 0 || arr.join().includes("://favicon/") ? 1 : 0
    }
    a.mode_.i = fav;
  },
  HandleKeydown_ (this: void, event: KeyboardEventToPrevent): void {
    if (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome) ? !event.isTrusted
        : event.isTrusted !== true && !(event.isTrusted == null && event instanceof KeyboardEvent)) { return; }
    Vomnibar_.keyResult_ = SimpleKeyResult.Prevent as SimpleKeyResult;
    let keyCode = event.keyCode, stop: 0 | 1 | 2 | 3 = 3, now = 0
    if (Build.BTypes & BrowserType.Firefox && (Build.BTypes === BrowserType.Firefox as number
          || Vomnibar_.browser_ & BrowserType.Firefox) && keyCode === kKeyCode.esc
        && !!Vomnibar_.HandleKeyup_ff_ && event.type[3] < kChar.e && event.key === "Escape") {
      removeEventListener("keyup", Vomnibar_.HandleKeyup_ff_!, true)
      Vomnibar_.HandleKeyup_ff_ = null
    }
    if (Vomnibar_.last_scrolling_key_) {
      const hasChar = keyCode > kKeyCode.maxAcsKeys || keyCode < kKeyCode.minAcsKeys,
      isSameChar = keyCode === Math.abs(Vomnibar_.last_scrolling_key_)
      stop = event.repeat || hasChar && isSameChar && event.type[3] < kChar.e ? 0 : 1
      if (hasChar && !isSameChar) { stop = 3 }
      else if (Vomnibar_.last_scrolling_key_ > 0) { stop = event.type[3] < kChar.e ? 0 : 2 }
      else if (stop || (now = event.timeStamp) - Vomnibar_.lastScrolling_ > 40 || now < Vomnibar_.lastScrolling_) {
        VPort_.postToOwner_({ N: stop ? VomnibarNS.kFReq.stopScroll : VomnibarNS.kFReq.scrollGoing })
        Vomnibar_.lastScrolling_ = now;
      }
      if (stop) {
        Vomnibar_.last_scrolling_key_ = hasChar || stop > 1 ? kKeyCode.None : Math.abs(Vomnibar_.last_scrolling_key_)
        if (!Vomnibar_.last_scrolling_key_) { window.onkeyup = null as never }
      }
    }
    if (stop === 3 && Vomnibar_.isActive_) {
      /*#__NOINLINE__*/ Vomnibar_.onKeydown_(event)
    }
    if (Vomnibar_.keyResult_ === SimpleKeyResult.Nothing) { return; }
    VUtils_.Stop_(event, Vomnibar_.keyResult_ === SimpleKeyResult.Prevent);
  },
  HandleKeyup_ff_: Build.BTypes & BrowserType.Firefox ? (event: KeyboardEventToPrevent): void => {
    event.keyCode === kKeyCode.esc && event.key === "Escape" && Vomnibar_.HandleKeydown_(event)
  } : 0 as never as null,
  _onAltUp (event?: KeyboardEvent): void {
    const listened = Vomnibar_._listenedAltDown
    if (!event || (typeof listened === "string" ? Vomnibar_.getMappedKey_(event).key : event.keyCode) === listened) {
      removeEventListener("keyup", Vomnibar_._onAltUp, true)
      event && Vomnibar_.toggleAlt_(Vomnibar_.inAlt_ < 0 ? 1 : 0)
      Vomnibar_._listenedAltDown = 0
    }
  },
  toggleAlt_ (enable?: BOOL): void {
    const inAlt = Vomnibar_.inAlt_
    enable = enable || 0
    if (inAlt !== enable) {
      if ((inAlt > 0) !== !!enable) {
        (document.body as HTMLBodyElement).classList.toggle("alt", !!enable);
        for (let i = 0, end = enable ? Vomnibar_.list_.childElementCount : 0; i < end; i++) {
          ((Vomnibar_.list_.children as NodeList)[i] as Element).classList.add("alt-index")
        }
      }
      inAlt < 0 && clearTimeout(-inAlt)
      enable || Vomnibar_._onAltUp()
      Vomnibar_.inAlt_ = enable
    }
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
      enable = Vomnibar_.styles_.includes(flag - CompletersNS.QueryFlags.ShowTime ? " mono-url " : "time ")
    }
    const newFlag = (Vomnibar_.mode_.f & ~flag) | (enable ? flag : 0);
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
    e: CompletersNS.SugType.Empty,
    r: 0,
    f: CompletersNS.QueryFlags.None,
    i: 0 as 0 | 1 | 2,
    q: ""
  } satisfies EnsureItemsNonNull<Req.fg<kFgReq.omni>> as EnsureItemsNonNull<Req.fg<kFgReq.omni>>,
  spacesRe_: <RegExpG> /\s+/g,
  fetch_ (): void {
    const a = Vomnibar_, mayUseCache = a.lastQuery_ !== null
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
      if (a.options_.icase) {
        const prefix = (<RegExpOne> /^:[WBH] /).test(str) ? 3 : 0
        str = prefix ? str.slice(0, prefix) + str.slice(prefix).toLowerCase() : str.toLowerCase()
      }
      if (str === mode.q && mayUseCache) { return a.postUpdate_(); }
      mode.t = a.matchType_ < CompletersNS.MatchType.someMatches || !str.startsWith(mode.q) ? CompletersNS.SugType.Empty
        : a.matchType_ === CompletersNS.MatchType.searchWanted
        ? !str.includes(" ") ? CompletersNS.SugType.search : CompletersNS.SugType.Empty
        : (newMatchType = a.matchType_, a.sugTypes_);
      mode.q = str;
      a.matchType_ = newMatchType;
      a.onInnerWidth_();
    } else {
      a.useInput_ = true;
      if (a.options_.icase) {
        mode.q = mode.q.toLowerCase();
      }
    }
    VPort_.post_(mode);
    if (mode.f & CompletersNS.QueryFlags.NoSessions && (a.options_.noSessions === "start")) {
      mode.f &= ~CompletersNS.QueryFlags.NoSessions
    }
  },

  _favPrefix: "",
  ParseCompletions_ (this: void, items: SuggestionE[]): void {
    const arr1: SuggestionE[] = [], arr2: SuggestionE[] = []
    let str: string | undefined;
    for (const item of items) {
      item.r = Vomnibar_.showRelevancy_ ? `\n\t\t\t<span class="relevancy">${item.r}</span>` : "";
      (str = item.label) && (item.label = ` <span class="label">${str}</span>`);
      if (!(Build.BTypes & BrowserType.Firefox)
          || (Build.BTypes !== BrowserType.Firefox as number && Vomnibar_.browser_ !== BrowserType.Firefox)) {
        (item.e === "history" || item.e === "tab" || item.v ? arr1 : arr2).push(item)
      }
    }
    if (Build.BTypes & BrowserType.Firefox
        && (Build.BTypes === BrowserType.Firefox as number || Vomnibar_.browser_ === BrowserType.Firefox)) {
      return;
    }
    let n1 = arr1.length, i = 0
    arr1.sort((i, j): number => !i.v !== !j.v ? i.v ? -1 : 1 : i.u.length - j.u.length)
    for (const item of arr1.concat(arr2)) {
      item.favIcon = (str = Vomnibar_.showFavIcon_ ? item.u : "") && Vomnibar_._favPrefix +
        (Build.MV3 ? encodeURIComponent : VUtils_.escapeCSSUrlInAttr_mv2_not_ff_
            )(Vomnibar_._parseFavIcon_not_ff(item, i++ < n1, str) || "about:blank") + "&quot;);"
    }
  },
  _parseFavIcon_not_ff (item: SuggestionE, visited: boolean, url: string): string {
    let str = url.slice(0, 11).toLowerCase(), optionsPage = "/" + GlobalConsts.OptionsPage
    return str.startsWith("vimium://")
      ? Vomnibar_.pageType_ !== VomnibarNS.PageType.ext
        ? chrome.runtime.getURL(optionsPage) : location.protocol + "//" + VHost_ + optionsPage
      : url.length > 512 || str === "javascript:" || str.startsWith("data:") ? ""
      : VUtils_.getCachedFavIcons_(url, visited, item.v || "", str)
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
    const doRefresh = (wait: number): void => {
      let oldSel = Vomnibar_.selection_, origin = Vomnibar_.isSelOriginal_
      Vomnibar_.useInput_ = false
      Vomnibar_.onInnerWidth_()
      Vomnibar_.update_(wait, (): void => {
        const len = Vomnibar_.completions_.length
        if (!origin && oldSel >= 0) {
          const newSel = Math.min(oldSel, len - 1)
          Vomnibar_.isSelOriginal_ = false
          Vomnibar_.selection_ < 0 && Vomnibar_.selection_--
          Vomnibar_.updateSelection_(newSel)
        }
        Vomnibar_.focused_ || Vomnibar_.blurWanted_ || Vomnibar_.focus_()
      });
    }
    Vomnibar_.focused_ || getSelection().removeAllRanges()
    if (!waitFocus) { doRefresh(150); return }
    window.onfocus = function (e: Event): void {
      window.onfocus = null as never;
      (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
          ? e.isTrusted : e.isTrusted !== false) && VPort_._port && doRefresh(17)
    };
  },
  OnPageHide_ (e?: Event): void {
    if (!VPort_
        || e && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !e.isTrusted : e.isTrusted === false)) { return; }
    Vomnibar_.isActive_ = false;
    Vomnibar_.timer_ > 0 && clearTimeout(Vomnibar_.timer_);
    VPort_._port?.disconnect()
    VPort_._port = null
    VPort_.postToOwner_({ N: VomnibarNS.kFReq.unload });
  }
},
VUtils_ = {
  safer_: (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
      && !Object.setPrototypeOf
      ? <T extends object> (obj: T) => ("__proto__" in obj && ((obj as any).__proto__ = null), obj as T & SafeObject)
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null)
    ) as <T extends object> (opt: T) => T & SafeObject,
  makeListRenderer_ (this: void, template: string): Render {
    const a = template.trim().replace(<RegExpG> /\s{2,}/g, " ").replace(<RegExpG> /> /g, ">").split(/\{\{(\w+)}}/g)
        .map(function (this: string[], placeholder, index) {
      const id = index & 1 ? this.indexOf(placeholder) + 2 : 0
      return ({ i: id, n: id < 2 ? placeholder : "" })
    }, ["typeIcon", "altIndex", "time", "index",
        Build.BTypes & BrowserType.Firefox && (Build.BTypes === BrowserType.Firefox as number
            || Vomnibar_.browser_ === BrowserType.Firefox) ? "favIcon" : ""])
    const parser = Build.BTypes !== BrowserType.Firefox as number ? 0 as never : new DOMParser();
    return (objectArray, element): void => {
      const altChars = Vomnibar_.altChars_
      let html = "", len = a.length - 1, index = 0, j: number, val: SuggestionE
      VUtils_.timeCache_ = 0
      for (; index < objectArray.length; index++) {
        val = objectArray[index]
        for (j = 0; j < len; j += 2) {
          html += a[j].n;
          const { i: id, n: propName } = a[j + 1]
          html += id === 1 ? val[propName as keyof SuggestionE] || ""
              : id === 2 ? Vomnibar_.getTypeIcon_(val)
              : id === 3 ? altChars !== null
                ? index < altChars.length ? altChars[index]
                  : index >= altChars.length * altChars.length ? ""
                  : altChars[((index / altChars.length) | 0) % altChars.length] + altChars[index % altChars.length]
                : index < 9 || Vomnibar_.maxMatches_ > 10 ? index + 1 + "" : "0"
              : id === 4 ? Vomnibar_.showTime_ ? VUtils_.timeStr_(val.visit) : ""
              : id === 5 ? index + 1 + ""
              : ""
        }
        html += a[len].n
      }
      if (Build.BTypes !== BrowserType.Firefox as number) {
        element.innerHTML = html;
      } else {
        element.innerHTML = "";
        element.append!(
          ... <Element[]> <ArrayLike<Element>> parser.parseFromString(html, "text/html").body.children);
      }
      if (Build.BTypes & BrowserType.Firefox
          && (Build.BTypes === BrowserType.Firefox as number || Vomnibar_.browser_ === BrowserType.Firefox)) {
        /*#__NOINLINE__*/ VUtils_.assignFavIcons_ff_(objectArray, element)
      }
    };
  },
  _cachedFavicons: {} as Dict<string>,
  getCachedFavIcons_ (url: string, visited: boolean, favIcon: string, scheme?: string): string {
    scheme = scheme || url.slice(0, 11).toLowerCase()
    let hasHost = scheme.startsWith("http")
        || scheme.lastIndexOf("-", scheme.indexOf(":") + 1 || 8) > 0 && url.lastIndexOf("://", 21) > 0, i: number,
    host = hasHost ? (i = url.indexOf("/", url.indexOf("://") + 3), i > 0 ? url.slice(0, i + 1) : url + "/") : null
    return host && VUtils_._cachedFavicons[host]
        || (Build.BTypes & BrowserType.Firefox
            && (Build.BTypes === BrowserType.Firefox as number || Vomnibar_.browser_ === BrowserType.Firefox)
            && favIcon && (favIcon = VUtils_.urlToCssAttr_(favIcon)),
            visited && host && (VUtils_._cachedFavicons[host] = favIcon || url), favIcon || !visited && host || url)
  },
  urlToCssAttr_ (url: string): string {
    return `url("${url.replace(<RegExpG & RegExpSearchable<0>> /"/g, (): string => "%22")}")`
  },
  assignFavIcons_ff_: Build.BTypes & BrowserType.Firefox ? ((objectArray, element): void => {
    const els = element.querySelectorAll(".icon") as NodeListOf<HTMLElement>
    if (objectArray.length === 0 || els.length !== objectArray.length) { return }
    const todos: [number, SuggestionE][] = []
    for (let index = 0; index < objectArray.length; index++) {
      let item: SuggestionE = objectArray[index], favIcon = item.favIcon
      if (!favIcon) { /* empty */ }
      else if (favIcon.length < 500) {
        els[index].style.backgroundImage = VUtils_.getCachedFavIcons_(item.u, true, favIcon)
      } else {
        todos.push([index, item])
      }
    }
    todos.length > 0 && setTimeout((): void => {
      if (Vomnibar_.completions_ !== objectArray) { return }
      for (const [index, item] of todos) {
        els[index].style.backgroundImage = VUtils_.getCachedFavIcons_(item.u, true, item.favIcon!)
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
    if (Build.OS & kBOS.WIN && Vomnibar_.os_ > kOS.MAX_NOT_WIN && url.startsWith("file://")) {
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
    let protocol = str.startsWith("http://") ? ProtocolType.http : str === "https://" ? ProtocolType.https
        : ProtocolType.others
    protocol >= url.length && (protocol = ProtocolType.others)
    let wantScheme = !protocol;
    if (protocol === ProtocolType.https) {
      let j = url.indexOf("/", protocol);
      if (j > 0 ? j < url.length : /* domain has port */ (<RegExpOne> /:\d+\/?$/).test(url)) {
        wantScheme = sug.e !== "search" || !!text && url.lastIndexOf(text, 8) === 8
      }
    }
    if (!text) {
      text = !wantScheme && protocol ? url.slice(protocol) : url
    } else if (protocol) {
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
    return protocol
  },
  onHTMLEntity (_s0: string, str: string): string {
    return str === "amp" ? "&" : str === "apos" ? "'" : str === "quot" ? '"'
      : str === "gt" ? ">" : str === "lt" ? "<" : "";
  },
  escapeCSSUrlInAttr_mv2_not_ff_: !Build.MV3 && Build.BTypes !== BrowserType.Firefox as number ? (s0: string): string => {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === kCharCode.and ? "&amp;" : i === kCharCode.quote1 ? "&apos;"
        : i < kCharCode.quote1 ? "%22" : i === kCharCode.lt ? "%3C" : "%3E";
    }
    VUtils_.escapeCSSUrlInAttr_mv2_not_ff_ = function (s): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return VUtils_.escapeCSSUrlInAttr_mv2_not_ff_(s0);
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
      if (!VUtils_.timeCache_) {
        const now = new Date()
        VUtils_.timeCache_ = +now
        tzOffset = now.getTimezoneOffset() * 1000 * 60
      }
      // Chrome (including Edge C) 37 and 83 has a bug that the unit of Session.lastVisitTime is second
      const negPos = parseInt(((VUtils_.timeCache_ - t) / 1000) as any as string)
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
          if (Build.BTypes !== BrowserType.Firefox as number
              && Build.MinCVer < BrowserVer.MinEnsured$Intl$$DateTimeFormat$$$formatToParts) {
            dateTimeFormatter = dateTimeFormatter.formatToParts ? dateTimeFormatter : 1
          }
        }
        if (Build.BTypes !== BrowserType.Firefox as number
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
  _macroTasks: [] as Array<() => void>,
  nextTask_ (callback: (this: void) => void): void {
    VUtils_._macroTasks.length || (postMessage(0, "*"), VUtils_._onMacroTasks
        && (addEventListener("message", VUtils_._onMacroTasks, true), VUtils_._onMacroTasks = null as never))
    VUtils_._macroTasks.push(callback)
  },
  _onMacroTasks (): void { for (const cb of VUtils_._macroTasks.splice(0, VUtils_._macroTasks.length)) { cb() } },
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
  _confVersion: 0,
  postToOwner_: null as never as <K extends keyof VomnibarNS.FReq> (this: void
      , msg: VomnibarNS.FReq[K] & VomnibarNS.Msg<K>) => void | 1,
  post_<K extends keyof FgReq> (request: FgReq[K] & Req.baseFg<K>): void {
    if (VPort_._port) {
      try {
        VPort_._port.postMessage<K>(request)
        return
      } catch {
        VPort_._port = null as never;
      }
    }
    try {
      VPort_.connect_(PortType.omnibar | PortType.reconnect)
    } catch {
      VPort_ = null as never;
      this.postToOwner_({ N: VomnibarNS.kFReq.broken });
      return
    }
    VPort_._port!.postMessage<K>(request)
  },
  _Listener<T extends ValidBgVomnibarReq> (this: void, response: Req.bg<T>): void {
    const name = response.N;
    name === kBgReq.omni_omni ? Vomnibar_.options_ && Vomnibar_.omni_(response) :
    name === kBgReq.omni_parsed ? Vomnibar_.parsed_(response) :
    name === kBgReq.omni_init ? Vomnibar_.secret_ && Vomnibar_.secret_(response) :
    name === kBgReq.omni_returnFocus ? VPort_.postToOwner_({ N: VomnibarNS.kFReq.focus, l: response.l }) :
    name === kBgReq.omni_toggleStyle ? Vomnibar_.toggleStyle_(response) :
    name === kBgReq.omni_updateOptions ? Vomnibar_.updateOptions_(response.d, response.v) :
    name === kBgReq.omni_refresh
        ? Build.MV3 ? (VPort_._port!.disconnect(), VPort_.connect_(PortType.omnibar | PortType.reconnect)) : 0 :
    name === kBgReq.injectorRun || name === kBgReq.showHUD ? 0 :
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
  _ClearPort (this: void): void {
    VPort_._port = null
    Build.MV3 && !Vomnibar_.isActive_ && Vomnibar_.OnPageHide_()
  },
  connect_ (type: PortType): FgPort {
    type |= VPort_._confVersion << PortType.OFFSET_SETTINGS
    const data = { name: VCID_ ? PortNameEnum.Prefix + type + (PortNameEnum.Delimiter + BuildStr.Commit)
        : Build.BTypes === BrowserType.Edge as number
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

if (Build.BTypes === BrowserType.Chrome as number ? false : !(Build.BTypes & BrowserType.Chrome) ? true
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
        || Build.BTypes !== BrowserType.Chrome as number && VCID_.includes("-")) {
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
    window.onpagehide = Vomnibar_.OnPageHide_;
    VPort_.postToOwner_({ N: VomnibarNS.kFReq.iframeIsAlive, o: options ? 1 : 0 });
    if (options) {
      Vomnibar_.activate_(options);
    }
  },
  onUnknownMsg = (event: MessageEvent): void => {
    if (event.source !== parent) { return }
    const data: VomnibarNS.MessageData = event.data
    if (!(data && data.length === 3 && data[0] === "VimiumC"
          && typeof data[1] === "string" && typeof data[2] === "object")) { return }
    isWeb && VUtils_.Stop_(event, 0) // smell like VomnibarNS.MessageData
    if (data[1].length === GlobalConsts.VomnibarSecretLength) {
      handler(data[1], event.ports[0] as VomnibarNS.IframePort, data[2])
    }
  },
  autoUnloadTimer = !Build.NDEBUG && (Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Chrome
        && Build.MinCVer < BrowserVer.MinSafeGlobal$frameElement
        ? ((): Element | null | void => { try { return frameElement } catch { /* empty */ } })() : frameElement)
      ? 0 : setTimeout(function (): void {
    if (!Build.NDEBUG) {
      console.log("Error: Vomnibar page hadn't received a valid secret")
      debugger // eslint-disable-line no-debugger
    }
    location.href = "about:blank"
  }, 700)
  Vomnibar_.secret_ = function (this: void, { l: payload, s: secret, v: confVersion }): void {
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
      Vomnibar_.browserVer_ = Math.abs(payload.v as BrowserVer || BrowserVer.assumedVer)
      Vomnibar_.isEdg_ = payload.v! < 0
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      Build.OS & kBOS.MAC && Build.OS !== kBOS.MAC as number &&
      (payload.o || (Vomnibar_.keyIdCorrectionOffset_old_cr_ = 300))
    }
    if (Build.OS & (Build.OS - 1)) { Vomnibar_.os_ = payload.o }
    Vomnibar_.styles_ = ` ${payload.t} `
    Vomnibar_.customCss_ = payload.c
    Vomnibar_.updateOptions_(payload, confVersion)
    _sec = secret;
    for (const i of unsafeMsg) {
      if (i[0] === secret) {
        unsafeMsg.length = 0;
        return handler(i[0], i[1], i[2]);
      }
    }
  };
    addEventListener("message", onUnknownMsg, true);
  VPort_.connect_(PortType.omnibar);
})();
