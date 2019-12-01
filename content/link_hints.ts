const enum ClickType {
  Default = 0, edit,
  MaxNotWeak = edit, attrListener, MinWeak = attrListener, codeListener, classname, tabindex, MaxWeak = tabindex,
  MinNotWeak, // should <= MaxNotBox
  MaxNotBox = 6, frame, scrollX, scrollY,
}
declare namespace HintsNS {
  type LinkEl = Hint[0];
  interface Executor {
    // tslint:disable-next-line: callable-types
    (linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintsNS.HintItem, "r">): void | boolean;
  }
  interface ModeOpt extends ReadonlyArray<Executor | HintMode> {
    [0]: Executor;
    [1]: HintMode;
  }
  interface Options extends SafeObject {
    action?: string;
    character?: string;
    useFilter?: boolean;
    mode?: string | number;
    url?: boolean;
    keyword?: string;
    dblclick?: boolean;
    newtab?: boolean | "force";
    button?: "right";
    touch?: boolean | null;
    join?: FgReq[kFgReq.copy]["j"];
    toggle?: {
      [selector: string]: string;
    };
    mapKey?: boolean;
    auto?: boolean;
  }
  type NestedFrame = false | 0 | null | HTMLIFrameElement | HTMLFrameElement;
  interface Filter<T> {
    // tslint:disable-next-line: callable-types
    (this: void, hints: T[], element: SafeHTMLElement): void;
  }
  type Stack = number[];
  type Stacks = Stack[];
  interface KeyStatus {
    hints_: HintItem[];
    keySequence_: string;
    textSequence_: string;
    known_: BOOL;
    tab_: number;
  }
  type HintSources = SafeElement[] | NodeListOf<SafeElement>;
}

var VHints = {
  CONST_: {
    focus: HintMode.FOCUS,
    hover: HintMode.HOVER,
    input: HintMode.FOCUS_EDITABLE,
    leave: HintMode.LEAVE,
    unhover: HintMode.LEAVE,
    text: HintMode.COPY_TEXT,
    "copy-text": HintMode.COPY_TEXT,
    url: HintMode.COPY_URL,
    image: HintMode.OPEN_IMAGE
  } as Dict<HintMode>,
  box_: null as HTMLDivElement | HTMLDialogElement | null,
  dialogMode_: false,
  wantDialogMode_: null as boolean | null,
  fullHints_: null as never as HintsNS.HintItem[],
  mode_: 0 as HintMode,
  mode1_: 0 as HintMode,
  modeOpt_: null as never as HintsNS.ModeOpt,
  forHover_: false,
  count_: 0,
  lastMode_: 0 as HintMode,
  tooHigh_: false as null | boolean,
  pTimer_: 0, // promptTimer
  isClickListened_: true,
  ngEnabled_: null as boolean | null,
  jsaEnabled_: null as boolean | null,
  chars_: "",
  useFilter_: false,
  keyStatus_: {
    hints_: null as never,
    keySequence_: "",
    textSequence_: "",
    known_: 0,
    tab_: 0
  } as HintsNS.KeyStatus,
  doesMapKey_: false,
  keyCode_: kKeyCode.None,
  isActive_: false,
  noHUD_: false,
  options_: null as never as HintsNS.Options,
  timer_: 0,
  yankedList_: [] as string[],
  kSafeAllSelector_: Build.BTypes & ~BrowserType.Firefox ? ":not(form)" as const : "*" as const,
  kEditableSelector_: "input,textarea,[contenteditable]" as const,
  activate_ (this: void, count: number, options: FgOptions): void {
    const a = VHints;
    if (a.isActive_) { return; }
    if (VApi.checkHidden_(kFgCmd.linkHints, count, options)) {
      return a.clean_();
    }
    if (document.body === null) {
      a.clean_();
      if (!a.timer_ && VDom.OnDocLoaded_ !== VDom.execute_) {
        VKey.pushHandler_(VKey.SuppressMost_, a);
        a.timer_ = setTimeout(a.activate_.bind(a as never, count, options), 300);
        return;
      }
      if (!VDom.isHTML_()) { return; }
    }
    const useFilter0 = options.useFilter, useFilter = useFilter0 != null ? !!useFilter0 : VDom.cache_.f,
    s0 = options.characters, str = s0 ? s0 + "" : useFilter ? VDom.cache_.n : VDom.cache_.l;
    if (str.length < 3) {
      a.clean_(1);
      return VHud.tip_(kTip.fewChars, 1000);
    }
    VKey.removeHandler_(a);
    a.setModeOpt_(count, options);
    a.chars_ = str.toUpperCase();
    a.useFilter_ = useFilter;
    a.doesMapKey_ = options.mapKey !== false;

    const arr: ViewBox = VDom.getViewBox_(1) as ViewBox;
    VDom.prepareCrop_(1);
    if (a.tooHigh_ !== null) {
      a.tooHigh_ = (VDom.scrollingEl_(1) as HTMLElement).scrollHeight / innerHeight
        > GlobalConsts.LinkHintTooHighThreshold;
    }
    a.dialogMode_ = !!(a.wantDialogMode_ != null ? a.wantDialogMode_ : document.querySelector("dialog[open]"))
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement
            || typeof HTMLDialogElement === "function");
    let elements = a.getVisibleElements_(arr);
    if (a.frameNested_) {
      if (a.TryNestedFrame_(kFgCmd.linkHints, count, options)) {
        return a.clean_();
      }
    }
    if (elements.length === 0) {
      a.clean_(1);
      return VHud.tip_(kTip.noLinks, 1000);
    }

    if (a.box_) { a.box_.remove(); a.box_ = null; }
    const hints = a.fullHints_ = a.keyStatus_.hints_ = elements.map(a.createHint_, a);
    VDom.bZoom_ !== 1 && a.adjustMarkers_(elements, hints);
    elements = null as never;
    useFilter ? a.filterEngine_.getMatchingHints_(a.keyStatus_, "", "") : a.initAlphabetEngine_(hints);
    a.renderMarkers_(hints);

    a.noHUD_ = !(useFilter || arr[3] > 40 && arr[2] > 320) || (options.hideHUD || options.hideHud) === true;
    VCui.ensureBorder_(VDom.wdZoom_);
    a.setMode_(a.mode_);
    a.box_ = VCui.addElementList_(hints, arr, a.dialogMode_);
    a.dialogMode_ && (a.box_ as HTMLDialogElement).showModal();

    a.isActive_ = true;
    VKey.pushHandler_(a.onKeydown_, a);
    VApi.onWndBlur_(a.ResetMode_);
  },
  setModeOpt_ (count: number, options: HintsNS.Options): void {
    const a = this;
    if (a.options_ === options) { return; }
    let modeOpt: HintsNS.ModeOpt | undefined,
    mode = (<number> options.mode > 0 ? + <number> options.mode
      : a.CONST_[options.action || options.mode as string] as number | undefined | {} as number) | 0;
    if (mode === HintMode.EDIT_TEXT && options.url) {
      mode = HintMode.EDIT_LINK_URL;
    }
    if (mode === HintMode.COPY_TEXT && options.join) {
      mode = HintMode.COPY_TEXT | HintMode.queue | HintMode.list;
    }
    count = Math.abs(count);
    if (count > 1) { mode < HintMode.min_disable_queue ? (mode |= HintMode.queue) : (count = 1); }
    for (let modes of a.Modes_) {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Array$$Includes
          ? modes.indexOf(mode) > 0 : (modes as ReadonlyArrayWithIncludes<(typeof modes)[number]>).includes(mode)) {
        modeOpt = modes;
        break;
      }
    }
    if (!modeOpt) {
      modeOpt = a.Modes_[8];
      mode = count > 1 ? HintMode.OPEN_WITH_QUEUE : HintMode.OPEN_IN_CURRENT_TAB;
    }
    a.modeOpt_ = modeOpt;
    a.options_ = options;
    a.count_ = count;
    a.setMode_(mode, 1);
  },
  setMode_ (mode: HintMode, silent?: 1): void {
    const a = this;
    a.lastMode_ = a.mode_ = mode;
    a.mode1_ = mode = mode & ~HintMode.queue;
    a.forHover_ = mode > HintMode.min_hovering - 1 && mode < HintMode.max_hovering + 1;
    if (silent || a.noHUD_) { return; }
    if (a.pTimer_ < 0) {
      a.pTimer_ = setTimeout(a.SetHUDLater_, 1000);
      return;
    }
    let msg = VTr(a.mode_), textSeq = a.keyStatus_.textSequence_;
    msg += a.useFilter_ ? ` [${textSeq}]` : "";
    msg += a.dialogMode_ ? VTr(kTip.modalHints) : "";
    return VHud.show_(kTip.raw, [msg], true);
  },
  SetHUDLater_ (this: void): void {
    const a = VHints;
    if (a && a.isActive_) { a.pTimer_ = 0; a.setMode_(a.mode_); }
  },
  TryNestedFrame_ (cmd: FgCmdAcrossFrames, count: number, options: SafeObject): boolean {
    const a = this;
    if (a.frameNested_ !== null) {
      cmd !== kFgCmd.linkHints && VDom.prepareCrop_();
      a.checkNestedFrame_();
    }
    interface VWindow extends Window {
      VHints: typeof VHints;
    }
    let frame = a.frameNested_, err = true, done = false;
    let events: VApiTy | undefined, core: ContentWindowCore | null | 0 | void | undefined = null;
    if (!frame) { return false; }
    try {
      if (frame.contentDocument
          && (core = Build.BTypes & BrowserType.Firefox ? VDom.getWndCore_(frame.contentWindow) : frame.contentWindow)
          && core.VDom && (core.VDom as typeof VDom).isHTML_()) {
        if (cmd === kFgCmd.linkHints) {
          (done = (core as VWindow).VHints.isActive_) && (core as VWindow).VHints.deactivate_(1);
        }
        events = core.VApi as VApiTy;
        err = events.keydownEvents_(Build.BTypes & BrowserType.Firefox ? VApi.keydownEvents_() : VApi);
      }
    } catch (e) {
      if (!Build.NDEBUG) {
        let notDocError = true;
        if (Build.BTypes & BrowserType.Chrome && VDom.cache_.v < BrowserVer.Min$ContentDocument$NotThrow) {
          try {
            notDocError = frame.contentDocument !== undefined;
          } catch { notDocError = false; }
        }
        if (notDocError) {
          console.log("Assert error: Child frame check breaks:", e);
        }
      }
    }
    if (err) {
      // It's cross-site, or Vimium C on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      a.frameNested_ = null;
      return false;
    }
    done ? (events as NonNullable<typeof events>).focusAndRun_()
    : (events as NonNullable<typeof events>).focusAndRun_(cmd, count, options);
    if (done) { return true; }
    if (document.readyState !== "complete") { a.frameNested_ = false; }
    return true;
  },
  maxLeft_: 0,
  maxTop_: 0,
  maxRight_: 0,
  zIndexes_: null as null | 0 | HintsNS.Stacks,
  createHint_ (link: Hint): HintsNS.HintItem {
    let i: number = link.length < 4 ? link[1].l : (link as Hint4)[3][0].l + (link as Hint4)[3][1];
    const marker = VDom.createElement_("span") as HintsNS.MarkerElement, st = marker.style,
    isBox = link[2] > ClickType.MaxNotBox;
    marker.className = isBox ? "LH BH" : "LH";
    st.left = i + "px";
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && i > this.maxLeft_ && this.maxRight_) {
      st.maxWidth = this.maxRight_ - i + "px";
    }
    i = link[1].t;
    st.top = i + "px";
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && i > this.maxTop_) {
      st.maxHeight = this.maxTop_ - i + GlobalConsts.MaxHeightOfLinkHintMarker + "px";
    }
    return { // the order of keys is for easier debugging
      a: "",
      d: link[0],
      h: this.useFilter_ ? this.filterEngine_.generateHintText_(link) : null,
      i: 0,
      m: marker,
      r: link.length > 4 ? (link as Hint5)[4] : isBox ? link[0] : null
    };
  },
  adjustMarkers_ (elements: Hint[], arr: HintsNS.HintItem[]): void {
    const zi = VDom.bZoom_, root = VCui.root_;
    let i = elements.length - 1;
    if (!root || elements[i][0] !== VOmni.box_ && !root.querySelector("#HelpDialog")) { return; }
    const z = Build.BTypes & ~BrowserType.Firefox ? ("" + 1 / zi).slice(0, 5) : "",
    mr = Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
        ? this.maxRight_ * zi : 0,
    mt = Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
        ? this.maxTop_ * zi : 0;
    while (0 <= i && root.contains(elements[i][0])) {
      let st = arr[i--].m.style;
      Build.BTypes & ~BrowserType.Firefox && (st.zoom = z);
      if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinAbsolutePositionNotCauseScrollbar) {
        continue;
      }
      st.maxWidth && (st.maxWidth = mr - elements[i][1].l + "px");
      st.maxHeight && (st.maxHeight = mt - elements[i][1].t + 18 + "px");
    }
  },
  /**
   * Must ensure only call {@link scroller.ts#VSc.shouldScroll_need_safe_} during {@link #getVisibleElements_}
   */
  GetClickable_ (this: void, hints: Hint[], element: SafeHTMLElement): void {
    let arr: Rect | null | undefined, isClickable = null as boolean | null, s: string | null
      , type = ClickType.Default, anotherEl: Element | null, clientSize: number = 0;
    const tag = element.localName, _this = VHints;
    switch (tag) {
    case "a":
      isClickable = true;
      arr = _this.checkAnchor_(element as HTMLAnchorElement & EnsuredMountedHTMLElement);
      break;
    case "audio": case "video": isClickable = true; break;
    case "frame": case "iframe":
      if (element === VOmni.box_) {
        if (arr = VDom.getVisibleClientRect_(element)) {
          (arr as WritableRect).l += 12; (arr as WritableRect).t += 9;
        }
      }
      isClickable = element !== VFind.box_;
      type = isClickable ? ClickType.frame : ClickType.Default;
      break;
    case "input":
      if ((element as HTMLInputElement).type === "hidden") { return; } // no break;
    case "textarea":
      // on C75, a <textarea disabled> is still focusable
      if ((element as TextElement).disabled && _this.mode1_ < HintMode.max_mouse_events + 1) { return; }
      if (!(element as TextElement).readOnly || _this.mode1_ > HintMode.min_job - 1
          || tag === "input"
              && VDom.uneditableInputs_[(element as HTMLInputElement).type]) {
        type = ClickType.edit;
        isClickable = true;
      }
      break;
    case "details":
      isClickable = _this.isNotReplacedBy_(VDom.findMainSummary_(element as HTMLDetailsElement), hints);
      break;
    case "label":
      isClickable = _this.isNotReplacedBy_((element as HTMLLabelElement).control as SafeHTMLElement | null);
      break;
    case "button": case "select":
      isClickable = !(element as HTMLButtonElement | HTMLSelectElement).disabled
        || _this.mode1_ > HintMode.max_mouse_events;
      break;
    case "object": case "embed":
      s = (element as HTMLObjectElement | HTMLEmbedElement).type;
      if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
      if (tag !== "embed"
          && (element as HTMLObjectElement).useMap) {
        VDom.getClientRectsForAreas_(element as HTMLObjectElement, hints as Hint5[]);
      }
      return;
    case "img":
      if ((element as HTMLImageElement).useMap) {
        VDom.getClientRectsForAreas_(element as HTMLImageElement, hints as Hint5[]);
      }
      if ((_this.forHover_ && (!(anotherEl = element.parentElement) || VDom.htmlTag_(anotherEl) !== "a"))
          || ((s = (element as HTMLElement).style.cursor as string) ? s !== "default"
              : (s = getComputedStyle(element).cursor as string) && (s.indexOf("zoom") >= 0 || s.startsWith("url"))
          )) {
        isClickable = true;
      }
      break;
    case "div": case "ul": case "pre": case "ol": case "code": case "table": case "tbody":
      clientSize = 1;
      break;
    }
    if (isClickable === null) {
      type = (s = element.contentEditable) !== "inherit" && s && s !== "false" ? ClickType.edit
        : element.getAttribute("onclick")
          || (s = element.getAttribute("role")) && (<RegExpI> /^(?:button|checkbox|link|radio|tab)$|^menuitem/i).test(s)
          || _this.ngEnabled_ && element.getAttribute("ng-click")
          || _this.forHover_ && element.getAttribute("onmouseover")
          || _this.jsaEnabled_ && (s = element.getAttribute("jsaction")) && _this.checkJSAction_(s)
        ? ClickType.attrListener
        : VDom.clickable_.has(element) && _this.isClickListened_
          && _this.inferTypeOfListener_(element, tag)
        ? ClickType.codeListener
        : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 && !element.shadowRoot ? ClickType.tabindex
        : clientSize
          && ((clientSize = element.clientHeight) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
                && clientSize + 5 < element.scrollHeight ? ClickType.scrollY
              : clientSize > /* scrollbar:12 + font:9 */ 20
                && (clientSize = element.clientWidth) > GlobalConsts.MinScrollableAreaSizeForDetection - 1
                && clientSize + 5 < element.scrollWidth ? ClickType.scrollX
              : ClickType.Default)
          || ((s = element.className)
                && (<RegExpOne> /\b(?:[Bb](?:utto|t)n|[Cc]lose|hate|like)(?:$|[-\s_])/).test(s)
                && (!(anotherEl = element.parentElement)
                    || (s = VDom.htmlTag_(anotherEl), s.indexOf("button") < 0 && s !== "a"))
              || element.hasAttribute("aria-selected") ? ClickType.classname : ClickType.Default);
    }
    if ((isClickable || type !== ClickType.Default)
        && (arr = arr || VDom.getVisibleClientRect_(element))
        && (type < ClickType.scrollX
          || VSc.shouldScroll_need_safe_(element, type - ClickType.scrollX as 0 | 1) > 0)
        && ((s = element.getAttribute("aria-hidden")) == null || s && s.toLowerCase() !== "true")
        && ((s = element.getAttribute("aria-disabled")) == null || (s && s.toLowerCase() !== "true")
            || _this.mode_ > HintMode.min_job - 1)
    ) { hints.push([element, tag === "img" ? VDom.getCroppedRect_(element, arr) : arr, type]); }
  },
  _getClickableInMaybeSVG (hints: Hint[], element: SVGElement | Element): void {
    let arr: Rect | null | undefined, s: string | null , type = ClickType.Default;
    { // not HTML*
      // never accept raw `Element` instances, so that properties like .tabIndex and .dataset are ensured
      if ((element as ElementToHTMLorSVG).tabIndex != null) { // SVG*
        // not need to distinguish attrListener and codeListener
        type = VDom.clickable_.has(element) || element.getAttribute("onclick")
            || this.ngEnabled_ && element.getAttribute("ng-click")
            || this.jsaEnabled_ && (s = element.getAttribute("jsaction")) && this.checkJSAction_(s)
          ? ClickType.attrListener
          : (element as SVGElement).tabIndex >= 0 ? ClickType.tabindex
          : ClickType.Default;
        if (type > ClickType.Default && (arr = VDom.getVisibleClientRect_(element))) {
          hints.push([element as SVGElement, arr, type]);
        }
      }
    }
  },
  checkJSAction_ (str: string): boolean {
    for (let s of str.split(";")) {
      s = s.trim();
      const t = s.startsWith("click:") ? (s = s.slice(6)) : s && s.indexOf(":") === -1 ? s : null;
      if (t && t !== "none" && !(<RegExpOne> /\._\b(?![\$\.])/).test(t)) {
        return true;
      }
    }
    return false;
  },
  checkAnchor_ (anchor: HTMLAnchorElement & EnsuredMountedHTMLElement): Rect | null {
    // for Google search result pages
    let mayBeSearchResult = !!(anchor.rel
          || (Build.BTypes & ~BrowserType.Chrome ? anchor.getAttribute("ping") : anchor.ping)),
    el = mayBeSearchResult || anchor.childElementCount === 1 ? anchor.firstElementChild as Element | null : null,
    tag = el ? VDom.htmlTag_(el) : "";
    return el && (mayBeSearchResult
          // use `^...$` to exclude custom tags
        ? (<RegExpOne> /^h\d$/).test(tag) && this.isNotReplacedBy_(el as HTMLHeadingElement & SafeHTMLElement)
          ? VDom.getVisibleClientRect_(el) : null
        : tag === "img" && !anchor.clientHeight
          ? VDom.getCroppedRect_(el as HTMLImageElement, VDom.getVisibleClientRect_(el))
        : null);
  },
  isNotReplacedBy_ (element: SafeHTMLElement | null, isExpected?: Hint[]): boolean | null {
    const arr2: Hint[] = [], a = this, clickListened = a.isClickListened_;
    if (element) {
      if (!isExpected && (element as TypeToAssert<HTMLElement, HTMLInputElement, "disabled">).disabled) { return !1; }
      isExpected && (VDom.clickable_.add(element), a.isClickListened_ = !0);
      a.GetClickable_(arr2, element);
      a.isClickListened_ = clickListened;
      if (!clickListened && isExpected && arr2.length && arr2[0][2] === ClickType.codeListener) {
        a.GetClickable_(arr2, element);
        if (arr2.length < 2) { // note: excluded during normal logic
          isExpected.push(arr2[0]);
        }
      }
    }
    return element ? !arr2.length : !!isExpected || null;
  },
  inferTypeOfListener_ (el: SafeHTMLElement, tag: string): boolean {
    // Note: should avoid nested calling to isNotReplacedBy_
    let el2: Element | null | undefined;
    return tag !== "div" && tag !== "li"
        ? tag === "tr" ? !!this.isNotReplacedBy_(el.querySelector("input[type=checkbox]") as SafeHTMLElement | null)
          : tag !== "table"
        : !(el2 = el.firstElementChild as Element | null) ||
          !(!el.className && !el.id && tag === "div"
            || ((tag = VDom.htmlTag_(el2)) === "div" || tag === "span") && VDom.clickable_.has(el2)
                && el2.getClientRects().length
            || ((tag !== "div"
                  || !!(el2 = (el2 as HTMLHeadingElement).firstElementChild as Element | null,
                        tag = el2 ? VDom.htmlTag_(el2) : ""))
                && (<RegExpOne> /^h\d$/).test(tag)
                && (el2 = (el2 as HTMLHeadingElement).firstElementChild as Element | null)
                && VDom.htmlTag_(el2) === "a")
          );
  },
  /** Note: required by {@link #kFgCmd.focusInput}, should only add LockableElement instances */
  GetEditable_ (this: void, hints: Hint[], element: SafeHTMLElement): void {
    let arr: Rect | null, s: string;
    switch (element.localName) {
    case "input":
      if (VDom.uneditableInputs_[(element as HTMLInputElement).type]) {
        return;
      } // no break;
    case "textarea":
      if ((element as TextElement).disabled || (element as TextElement).readOnly) { return; }
      break;
    default:
      if ((s = element.contentEditable) === "inherit" || s === "false" || !s) {
        return;
      }
      break;
    }
    if (arr = VDom.getVisibleClientRect_(element)) {
      hints.push([element as HintsNS.InputHintItem["d"], arr, ClickType.edit]);
    }
  },
  GetLinks_ (this: void, hints: Hint[], element: SafeHTMLElement): void {
    let a: string | null, arr: Rect | null;
    if (element.localName === "a" && ((a = element.getAttribute("href")) && a !== "#"
        && !VDom.jsRe_.test(a)
        || (element as HTMLAnchorElement).dataset.vimUrl != null)) {
      if (arr = VDom.getVisibleClientRect_(element)) {
        hints.push([element as HTMLAnchorElement, arr, ClickType.Default]);
      }
    }
  },
  _getImagesInImg (hints: Hint[], element: HTMLImageElement): void {
    // according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement#Browser_compatibility,
    // <img>.currentSrc is since C45
    const src: string | null | undefined = element.getAttribute("src") || element.currentSrc || element.dataset.src;
    if (!src) { return; }
    let rect: ClientRect | undefined, cr: Rect | null = null, w: number, h: number;
    if ((w = element.width) < 8 && (h = element.height) < 8) {
      if (w !== h || (w !== 0 && w !== 3)) { return; }
      rect = element.getClientRects()[0];
      if (rect) {
        w = rect.left; h = rect.top;
        cr = VDom.cropRectToVisible_(w, h, w + 8, h + 8);
      }
    } else if (rect = element.getClientRects()[0]) {
      w = rect.right + (rect.width < 3 ? 3 : 0);
      h = rect.bottom + (rect.height < 3 ? 3 : 0);
      cr = VDom.cropRectToVisible_(rect.left, rect.top, w, h);
    }
    if (cr && getComputedStyle(element).visibility === "visible") {
      hints.push([element, cr, ClickType.Default]);
    }
  },
  GetImages_ (this: void, hints: Hint[], element: Element): void {
    const tag = element.localName;
    if (tag === "img") {
      VHints._getImagesInImg(hints, element as HTMLImageElement);
      return;
    }
    let str: string | null, cr: Rect | null;
    if (VHints.mode1_ === HintMode.DOWNLOAD_MEDIA && (tag === "video" || tag === "audio")) {
      str = (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src;
    } else {
      str = (element as SafeHTMLElement).dataset.src || element.getAttribute("href");
      if (!VHints.isImageUrl_(str)) {
        str = (element as SafeHTMLElement).style.backgroundImage as string;
        str = str && (<RegExpI> /^url\(/i).test(str) ? str : "";
      }
    }
    if (str) {
      if (cr = VDom.getVisibleClientRect_(element)) {
        hints.push([element as SafeHTMLElement, cr, ClickType.Default]);
      }
    }
  },
  /** @safe_even_if_any_overridden_property */
  traverse_: function (selector: string
      , filter: HintsNS.Filter<Hint | SafeHTMLElement>, notWantVUI?: boolean
      , wholeDoc?: true): Hint[] | Element[] {
    if (!Build.NDEBUG && Build.BTypes & ~BrowserType.Firefox && selector === "*") {
      selector = VHints.kSafeAllSelector_; // for easier debugging
    }
    const a = VHints, matchAll = selector === a.kSafeAllSelector_, D = document,
    output: Hint[] | SafeHTMLElement[] = [],
    d = VDom, uiRoot = VCui.root_,
    Sc = VSc,
    wantClickable = filter === a.GetClickable_,
    isInAnElement = !Build.NDEBUG && !!wholeDoc && (wholeDoc as unknown) instanceof Element,
    box = !wholeDoc && VDom.fullscreenEl_unsafe_()
        || !Build.NDEBUG && isInAnElement && wholeDoc as unknown as Element
        || D,
    isD = box === D,
    querySelectorAll = Build.BTypes & ~BrowserType.Firefox
      ? /* just smaller code */ (isD ? D : Element.prototype).querySelectorAll : box.querySelectorAll;
    let list: HintsNS.HintSources | null = querySelectorAll.call(box, selector) as NodeListOf<SafeElement>,
    shadowQueryAll: ShadowRoot["querySelectorAll"] | undefined;
    wantClickable && Sc.getScale_();
    if (matchAll) {
      if (a.ngEnabled_ === null) {
        a.ngEnabled_ = !!D.querySelector(".ng-scope");
      }
      if (a.jsaEnabled_ === null) {
        a.jsaEnabled_ = !!D.querySelector("[jsaction]");
      }
    }
    if (!matchAll) {
      list = a.addShadowHosts_(list, querySelectorAll.call(box, a.kSafeAllSelector_) as NodeListOf<SafeElement>);
    }
    if (!wholeDoc && a.tooHigh_ && isD && list.length >= GlobalConsts.LinkHintPageHeightLimitToCheckViewportFirst) {
      list = a.getElementsInViewport_(list);
    }
    if (!Build.NDEBUG && isInAnElement) {
      // just for easier debugging
      list = [].slice.call(list);
      list.unshift(wholeDoc as unknown as SafeElement);
    }
    for (const tree_scopes: Array<[HintsNS.HintSources, number]> = [[list, 0]]; tree_scopes.length > 0; ) {
      let cur_scope = tree_scopes[tree_scopes.length - 1], [cur_tree, i] = cur_scope, len = cur_tree.length
        , el: SafeElement & {lang?: undefined} | SafeHTMLElement, shadowRoot: ShadowRoot | null | undefined;
      for (; i < len; ) {
        el = cur_tree[i++] as SafeElement & {lang?: undefined} | SafeHTMLElement;
        if (el.lang != null) {
          filter(output, el);
          shadowRoot = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                && VDom.cache_.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
              ? el.webkitShadowRoot as ShadowRoot | null | undefined : el.shadowRoot as ShadowRoot | null | undefined;
          if (shadowRoot) {
            shadowQueryAll || (shadowQueryAll = shadowRoot.querySelectorAll);
            let sub_tree: HintsNS.HintSources = shadowQueryAll.call(shadowRoot, selector) as NodeListOf<SafeElement>;
            if (!matchAll) {
              sub_tree = a.addShadowHosts_(sub_tree,
                  shadowQueryAll.call(shadowRoot, a.kSafeAllSelector_) as NodeListOf<SafeElement>);
            }
            cur_scope[1] = i;
            tree_scopes.push([sub_tree, i = 0]);
            break;
          }
        } else if (wantClickable) {
          a._getClickableInMaybeSVG(output as Exclude<typeof output, SafeHTMLElement[]>, el);
        }
      }
      if (i >= len) {
        tree_scopes.pop();
      }
    }
    if (wholeDoc && (Build.NDEBUG || !isInAnElement)) {
      // this requires not detecting scrollable elements if wholeDoc
      if (!(Build.NDEBUG || !wantClickable && !isInAnElement)) {
        console.log("Assert error: `!wantClickable if wholeDoc` in VHints.traverse_");
      }
      return output;
    }
    list = null;
    if (uiRoot
        && ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          || uiRoot !== VCui.box_)
        // now must have shadow DOM, because `UI.root_` !== `UI.box_`
        && !notWantVUI
        && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1
          || uiRoot.mode === "closed")
        ) {
      const z = d.dbZoom_, bz = d.bZoom_, notHookScroll = Sc.scrolled_ === 0;
      if (bz !== 1 && isD) {
        d.dbZoom_ = z / bz;
        d.prepareCrop_(1);
      }
      for (const el of (<ShadowRoot> uiRoot).querySelectorAll(selector)) {
        filter(output, el as SafeHTMLElement);
      }
      d.dbZoom_ = z;
      if (notHookScroll) {
        Sc.scrolled_ = 0;
      }
    }
    Sc.scrolled_ === 1 && Sc.suppressScroll_();
    if (wantClickable) { a.deduplicate_(output as Hint[]); }
    if (a.frameNested_ === null) { /* empty */ }
    else if (wantClickable) {
      a.checkNestedFrame_(output as Hint[]);
    } else if (output.length > 0) {
      a.frameNested_ = null;
    } else {
      a.checkNestedFrame_();
    }
    return output as Hint[];
  } as {
    (key: string, filter: HintsNS.Filter<SafeHTMLElement>, notWantVUI?: true, wholeDoc?: true): SafeHTMLElement[];
    (key: string, filter: HintsNS.Filter<Hint>, notWantVUI?: boolean): Hint[];
  },
  addShadowHosts_ (list: HintsNS.HintSources, allNodes: NodeListOf<SafeElement>): HintsNS.HintSources {
    let matchWebkit = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                      && VDom.cache_.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0;
    let hosts: SafeElement[] = [], matched: SafeElement | undefined;
    for (let i = 0, len = allNodes.length; i < len; i++) {
      let el = allNodes[i];
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            && matchWebkit ? el.webkitShadowRoot : el.shadowRoot) {
        hosts.push(matched = el);
      }
    }
    return matched ? [].slice.call<ArrayLike<SafeElement>, [], SafeElement[]>(list).concat(hosts) : list;
  },
  getElementsInViewport_ (list: HintsNS.HintSources): HintsNS.HintSources {
    const result: SafeElement[] = [], height = innerHeight;
    for (let i = 1, len = list.length; i < len; i++) { // skip docEl
      const el = list[i];
      const cr = VDom.getBoundingClientRect_(el);
      if (cr.bottom > 0 && cr.top < height) {
        result.push(el);
        continue;
      }
      const last = el.lastElementChild;
      if (!last) { continue; }
      if (Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(el)) { continue; }
      while (list[++i] !== last) { /* empty */ }
      i--;
    }
    return result.length > 12 ? result : list;
  },
  deduplicate_ (list: Hint[]): void {
    let i = list.length, j = 0, k: ClickType, s: string;
    let element: Element, prect: Rect, crect: Rect | null;
    while (0 <= --i) {
      k = list[i][2];
      if (k !== ClickType.classname) {
        if (k === ClickType.codeListener) {
          if (((element = list[i][0]) as Exclude<Hint[0], SVGElement>).localName === "div"
              && (j = i + 1) < list.length
              && (s = list[j][0].localName, s === "div" || s === "a")) {
            prect = list[i][1]; crect = list[j][1];
            if (crect.l < prect.l + /* icon_16 */ 19 && crect.t < prect.t + 9
                && crect.l > prect.l - 4 && crect.t > prect.t - 4 && crect.b > prect.b - 9
                && (s !== "a" || element.contains(list[j][0]))) {
              // the `<a>` is a single-line box's most left element and the first clickable element,
              // so think the box is just a layout container
              // for [i] is `<div>`, not limit the height of parent `<div>`,
              // if there's more content, it should have hints for itself
              list.splice(i, 1);
            }
            continue;
          }
        } else if (k === ClickType.tabindex
            && (element = list[i][0]).childElementCount === 1 && i + 1 < list.length
            && list[i + 1][0].parentNode !== element) {
          element = element.lastElementChild as Element;
          prect = list[i][1]; crect = VDom.getVisibleClientRect_(element);
          if (crect && VDom.isContaining_(crect, prect) && VDom.htmlTag_(element)) {
            list[i] = [element as SafeHTMLElement, crect, ClickType.tabindex];
          }
        } else if (k === ClickType.edit && i > 0 && (element = list[i - 1][0]) === list[i][0].parentElement
            && element.childElementCount < 2 && element.localName === "a"
            && !VDom.getEditableType_(list[i][0])) {
          // a rare case that <a> has only a clickable <input>
          list.splice(--i, 1);
          continue;
        }
        j = i;
      }
      else if (i + 1 < list.length && list[j = i + 1][2] === ClickType.Default
          && this._isDescendant(element = list[i + 1][0], list[i][0], false)
          && (<RegExpOne> /\b(button|a$)/).test((element as Hint[0]).localName)) {
        list.splice(i, 1);
        continue;
      }
      else if (i > 0 && (k = list[j = i - 1][2]) > ClickType.MaxWeak
          || !this._isDescendant(list[i][0], list[j][0], true)) {
        continue;
      } else if (VDom.isContaining_(list[j][1], list[i][1])) {
        list.splice(i, 1);
        continue;
      } else if (k < ClickType.MinWeak) {
        continue;
      }
      for (; j > i - 3 && 0 < j
            && (k = list[j - 1][2]) > ClickType.MaxNotWeak && k < ClickType.MinNotWeak
            && this._isDescendant(list[j][0], list[j - 1][0], true)
          ; j--) { /* empty */ }
      if (j < i) {
        list.splice(j, i - j);
        i = j;
      }
    }
    while (list.length && (list[0][0] === document.documentElement || list[0][0] === document.body)) {
      list.shift();
    }
  },
  _isDescendant (d: Element, p: Hint[0], shouldBeSingleChild: boolean): boolean {
    // Note: currently, not compute normal shadowDOMs / even <slot>s (too complicated)
    let i = 3, c: EnsuredMountedElement | null | undefined, f: Node | null, s: string;
    while (0 < i--
        && (c = (Build.BTypes & ~BrowserType.Firefox ? VDom.GetParent_(d, PNType.DirectElement)
                : d.parentElement as Element | null) as EnsuredMountedElement | null)
        && c !== <Element> p
        && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
              && VDom.unsafeFramesetTag_ && (c as Element["firstElementChild"] as WindowWithTop).top === top)
        ) {
      d = c;
    }
    if (c !== <Element> p) { return false; }
    if (shouldBeSingleChild && (s = p.localName).indexOf("button") < 0 && s !== "a") {
      for (; ; ) {
        if (c.childElementCount !== 1 || ((f = c.firstChild) instanceof Text && f.data.trim())) { return false; }
        if (i++ === 2) { break; }
        c = c.lastElementChild;
      }
    }
    return true;
  },
  frameNested_: false as HintsNS.NestedFrame,
  checkNestedFrame_ (output?: Hint[]): void {
    const res = output && output.length > 1 ? null : !frames.length ? false
      : VDom.fullscreenEl_unsafe_()
      ? 0 : this._getNestedFrame(output);
    this.frameNested_ = res === false && document.readyState === "complete" ? null : res;
  },
  _getNestedFrame (output?: Hint[]): HintsNS.NestedFrame {
    if (output == null) {
      if (!VDom.isHTML_()) { return false; }
      output = [];
      for (let el of document.querySelectorAll("a,button,input,frame,iframe")) {
        if ((el as ElementToHTML).lang != null) {
          this.GetClickable_(output, el as SafeHTMLElement);
        }
      }
    }
    if (output.length !== 1) {
      return output.length !== 0 && null;
    }
    let rect: ClientRect | undefined, rect2: ClientRect, element = output[0][0];
    if ((<RegExpI> /^i?frame$/).test(VDom.htmlTag_(element))
        && (rect = element.getClientRects()[0])
        && (rect2 = VDom.getBoundingClientRect_(document.documentElement as HTMLElement))
        && rect.top - rect2.top < 20 && rect.left - rect2.left < 20
        && rect2.right - rect.right < 20 && rect2.bottom - rect.bottom < 20
        && getComputedStyle(element).visibility === "visible"
    ) {
      return element as HTMLFrameElement | HTMLIFrameElement;
    }
    return null;
  },
  getVisibleElements_ (view: ViewBox): Hint[] {
    let a = this, _i: number = a.mode1_,
    visibleElements = _i > HintMode.min_media - 1 && _i < HintMode.max_media + 1
      // not check `img[src]` in case of `<img srcset=... >`
      ? a.traverse_("a[href],img,div[style],span[style],[data-src]"
          + (Build.BTypes & ~BrowserType.Firefox ? a.kSafeAllSelector_ : "")
          + (_i - HintMode.DOWNLOAD_MEDIA ? "" : ",video,audio"), a.GetImages_, true)
      : _i > HintMode.min_link_job - 1 && _i < HintMode.max_link_job + 1 ? a.traverse_("a", a.GetLinks_)
      : _i - HintMode.FOCUS_EDITABLE ? a.traverse_(a.kSafeAllSelector_, a.GetClickable_)
      : a.traverse_(Build.BTypes & ~BrowserType.Firefox
            ? a.kEditableSelector_ + a.kSafeAllSelector_ : a.kEditableSelector_, a.GetEditable_);
    a.maxLeft_ = view[2], a.maxTop_ = view[3], a.maxRight_ = view[4];
    if (a.maxRight_ > 0) {
      _i = Math.ceil(Math.log(visibleElements.length) / Math.log(a.chars_.length));
      a.maxLeft_ -= 16 * _i + 12;
    }
    visibleElements.reverse();

    const obj = {l: null as never, t: null as never} as {l: Rect[], t: Rect}, func = VDom.SubtractSequence_.bind(obj);
    let r2 = null as Rect[] | null, t: Rect, reason: ClickType, visibleElement: Hint;
    for (let _len = visibleElements.length, _j = Math.max(0, _len - 16); 0 < --_len; ) {
      _j > 0 && --_j;
      visibleElement = visibleElements[_len];
      if (visibleElement[2] > ClickType.MaxNotBox) { continue; }
      let r = visibleElement[1];
      for (_i = _len; _j <= --_i; ) {
        t = visibleElements[_i][1];
        if (r.b > t.t && r.r > t.l && r.l < t.r && r.t < t.b && visibleElements[_i][2] < ClickType.MaxNotBox + 1) {
          obj.l = []; obj.t = t;
          r2 !== null ? r2.forEach(func) : func(r);
          if ((r2 = obj.l).length === 0) { break; }
        }
      }
      if (r2 === null) { continue; }
      if (r2.length > 0) {
        t = r2[0];
        t.t > a.maxTop_ && t.t > r.t || t.l > a.maxLeft_ && t.l > r.l ||
          r2.length === 1 && (t.b - t.t < 3 || t.r - t.l < 3) || (visibleElement[1] = t);
      } else if ((reason = visibleElement[2]) > ClickType.MaxNotWeak && reason < ClickType.MinNotWeak
          && visibleElement[0].contains(visibleElements[_i][0])) {
        visibleElements.splice(_len, 1);
      } else {
        visibleElement.length > 3 && (r = (visibleElement as Hint4)[3][0]);
        for (let _k = _len; _i <= --_k; ) {
          t = visibleElements[_k][1];
          if (r.l >= t.l && r.t >= t.t && r.l < t.l + 10 && r.t < t.t + 8) {
            const offset: HintOffset = [r, visibleElement.length > 3 ? (visibleElement as Hint4)[3][1] + 13 : 13],
            hint2 = visibleElements[_k] as Hint4;
            hint2.length > 3 ? (hint2[3] = offset) : (hint2 as {} as HintOffset[]).push(offset);
            break;
          }
        }
      }
      r2 = null;
    }
    return visibleElements.reverse();
  },
  onKeydown_ (event: KeyboardEventToPrevent): HandlerResult {
    const a = this;
    let matchedHint: ReturnType<typeof VHints.matchHintsByKey_>, i: number;
    if (event.repeat || !a.isActive_) {
      // NOTE: should always prevent repeated keys.
    } else if ((i = event.keyCode) === kKeyCode.ime) {
      a.clean_(1);
      VHud.tip_(kTip.exitForIME);
      return HandlerResult.Nothing;
    } else if (VKey.isEscape_(event)) {
      a.clean_();
    } else if (i === kKeyCode.esc) {
      return HandlerResult.Suppress;
    } else if (i > kKeyCode.f1 && i <= kKeyCode.f12) {
      a.ResetMode_();
      if (i !== kKeyCode.f2) { return HandlerResult.Nothing; }
      i = VKey.getKeyStat_(event);
      if (i === KeyStat.altKey) {
        a.wantDialogMode_ = !a.wantDialogMode_;
      } else if (i & KeyStat.shiftKey) {
        a.isClickListened_ = !a.isClickListened_;
      } else if (i & KeyStat.PrimaryModifier) {
        a.options_.useFilter = VDom.cache_.f = !a.useFilter_;
      } else {
        if (!VApi.execute_) { return HandlerResult.Prevent; }
        a.isClickListened_ = true;
        (VApi as EnsureNonNull<VApiTy>).execute_(kContentCmd.ManuallyFindAllOnClick);
      }
      setTimeout(a._reinit.bind(a, null, null), 0);
    } else if (i < kKeyCode.maxAcsKeys + 1 && i > kKeyCode.minAcsKeys - 1
        || (i === kKeyCode.metaKey && !VDom.cache_.o)) {
      const mode = a.mode_, mode1 = a.mode1_,
      mode2 = mode1 > HintMode.min_copying - 1 && mode1 < HintMode.max_copying + 1
        ? i === kKeyCode.ctrlKey ? (mode1 | HintMode.queue) ^ HintMode.list
          : i === kKeyCode.altKey ? (mode & ~HintMode.list) ^ HintMode.queue
          : mode
        : i === kKeyCode.altKey
        ? mode < HintMode.min_disable_queue
          ? ((mode1 < HintMode.min_job ? HintMode.newTab : HintMode.empty) | mode) ^ HintMode.queue : mode
        : mode1 < HintMode.min_job
          ? i === kKeyCode.shiftKey ? (mode | HintMode.focused) ^ HintMode.mask_focus_new
          : (mode | HintMode.newTab) ^ HintMode.focused
        : mode;
      if (mode2 !== mode) {
        a.setMode_(mode2);
        i = VKey.getKeyStat_(event);
        (i & (i - 1)) || (a.lastMode_ = mode);
      }
    } else if (i <= kKeyCode.down && i >= kKeyCode.pageup) {
      VSc.BeginScroll_(event);
      a.ResetMode_();
    } else if (i === kKeyCode.tab && !a.keyStatus_.keySequence_ && !a.keyStatus_.textSequence_) {
      a.tooHigh_ = null;
      a.ResetMode_();
      setTimeout(a._reinit.bind(a, null, null), 0);
    } else if (i === kKeyCode.space && (!a.useFilter_ || VKey.getKeyStat_(event))) {
      a.zIndexes_ === 0 || a.rotateHints_(event.shiftKey);
      a.ResetMode_();
    } else if (matchedHint = a.matchHintsByKey_(a.keyStatus_, event), matchedHint === 0) {
      // then .a.keyStatus_.hintSequence_ is the last key char
      a.deactivate_(a.keyStatus_.known_);
    } else if (matchedHint !== 1) {
      VKey.prevent_(event);
      /** safer; necessary for {@link #VHints._highlightChild} */
      VApi.keydownEvents_()[i] = 1;
      a.keyCode_ = i;
      a.execute_(matchedHint);
    }
    return HandlerResult.Prevent;
  },
  hideSpans_ (linksMatched: HintsNS.HintItem[]): void {
    const limit = this.keyStatus_.keySequence_.length - this.keyStatus_.tab_;
    for (const { m: { childNodes: ref } } of linksMatched) {
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/dom_token_list.cc?q=DOMTokenList::setValue&g=0&l=258
// shows that `.classList.add()` costs more
      for (let j = ref.length - 1; 0 <= --j; ) {
        !(ref[j] as Exclude<HintsNS.MarkerElement, Text>).className !== (j < limit) ||
        ((ref[j] as Exclude<HintsNS.MarkerElement, Text>).className = j < limit ? "MC" : "");
      }
    }
  },
  ResetMode_ (): void {
    let a = VHints, d: KeydownCacheArray;
    if (a.lastMode_ !== a.mode_ && a.mode_ < HintMode.min_disable_queue) {
      d = VApi.keydownEvents_();
      if (d[kKeyCode.ctrlKey] || d[kKeyCode.metaKey] || d[kKeyCode.shiftKey] || d[kKeyCode.altKey]) {
        a.setMode_(a.lastMode_);
      }
    }
  },
  doesDelayToExecute_ (hint: HintsNS.HintItem, rect: Rect | null): void | 1 {
    const a = this, K = VKey, cache = VDom.cache_;
    if (!(Build.BTypes & BrowserType.Chrome)
        || Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome
        || Build.MinCVer < BrowserVer.MinUserActivationV2 && cache.v < BrowserVer.MinUserActivationV2
        ) {
      if (!cache.w) {
        K.suppressTail_(200);
        return 1;
      }
    }
    (a.box_ as NonNullable<typeof a.box_>).remove();
    const removeFlash = rect && VCui.flash_(null, rect, -1),
    callback = (doesContinue?: boolean): void => {
      doesContinue && a.isActive_ ? a.execute_(hint, removeFlash) : removeFlash && removeFlash();
    };
    if (!(Build.BTypes & BrowserType.Chrome) || cache.w) {
      K.pushHandler_(event => {
        const code = event.keyCode,
        action = code === kKeyCode.ime || K.isEscape_(event) ? 2
            : code === kKeyCode.enter || event.key === "Enter" ? 1
            : 0;
        if (action) {
          K.removeHandler_(callback);
          K.prevent_(event);
          callback(action < 2);
        }
        return action > 1 ? HandlerResult.Nothing : HandlerResult.Prevent;
      }, callback);
    } else {
      K.suppressTail_(200, callback);
    }
  },
  execute_ (hint: HintsNS.HintItem, removeFlash?: (() => void) | null): void {
    const a = this, keyStatus = a.keyStatus_;
    let rect: Rect | null | undefined, clickEl: HintsNS.LinkEl | null = hint.d;
    a.resetHints_(); // here .keyStatus_ is reset
    (VHud as Writable<VHUDTy>).t = "";
    if (VDom.IsInDOM_(clickEl)) {
      // must get outline first, because clickEl may hide itself when activated
      // must use UI.getRect, so that VDom.zooms are updated, and prepareCrop is called
      rect = VCui.getRect_(clickEl, hint.r !== clickEl ? hint.r as HTMLElementUsingMap | null : null);
      if (keyStatus.textSequence_ && !keyStatus.keySequence_ && !keyStatus.known_) {
        if (!a.doesDelayToExecute_(hint, rect)) { return; }
      }
      // tolerate new rects in some cases
      const showRect = a.modeOpt_[0](clickEl, rect, hint);
      removeFlash ? removeFlash()
      : showRect !== false && (rect || (rect = VDom.getVisibleClientRect_(clickEl)))
      ? setTimeout(function (): void {
          (showRect || document.hasFocus()) && VCui.flash_(null, rect as Rect);
        }, 17)
      // tslint:disable-next-line: no-unused-expression
      : 0;
    } else {
      removeFlash && removeFlash();
      clickEl = null;
      VHud.tip_(kTip.linkRemoved, 2000);
    }
    a.pTimer_ = -!!VHud.t;
    if (!(a.mode_ & HintMode.queue)) {
      a._setupCheck(clickEl);
      return a.deactivate_(1);
    }
    a.isActive_ = false;
    a._setupCheck();
    setTimeout(function (): void {
      const _this = VHints;
      _this._reinit(clickEl, rect);
      if (1 === --_this.count_ && _this.isActive_) {
        _this.setMode_(_this.mode1_);
      }
    }, 18);
  },
  _reinit (lastEl?: HintsNS.LinkEl | null, rect?: Rect | null): void {
    const a = this, events = VApi;
    if (events.keydownEvents_(Build.BTypes & BrowserType.Firefox ? events.keydownEvents_() : events)) {
      a.clean_();
      return;
    }
    a.isActive_ = false;
    a.resetHints_();
    const isClick = a.mode1_ < HintMode.min_job;
    a.activate_(0, a.options_);
    a._setupCheck(lastEl, rect, isClick);
  },
  _setupCheck (el?: HintsNS.LinkEl | null, r?: Rect | null, isClick?: boolean): void {
    const a = this;
    a.timer_ && clearTimeout(a.timer_);
    a.timer_ = el && (isClick || a.mode1_ < HintMode.min_job) ? setTimeout(function (i): void {
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i ||
      VHints && VHints.CheckLast_(el, r);
    }, 255) : 0;
  },
  // if not el, then reinit if only no key stroke and hints.length < 64
  CheckLast_ (this: void, el?: HintsNS.LinkEl | TimerType.fake, r?: Rect | null): void {
    const _this = VHints, events = VApi;
    if (!_this) { return; }
    _this.timer_ = 0;
    if (events.keydownEvents_(Build.BTypes & BrowserType.Firefox ? events.keydownEvents_() : events)) {
      return _this.clean_();
    }
    const r2 = el && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinNo$TimerType$$Fake
                      || el !== TimerType.fake) ? VDom.getBoundingClientRect_(el as HintsNS.LinkEl) : 0,
    hidden = !r2 || r2.width < 1 && r2.height < 1 || getComputedStyle(el as HintsNS.LinkEl).visibility !== "visible";
    if (hidden && VDom.lastHovered_ === el) {
      VDom.lastHovered_ = null;
    }
    if ((!r2 || r) && _this.isActive_ && _this.fullHints_.length < 64
        && !_this.keyStatus_.keySequence_
        && (hidden || Math.abs((r2 as ClientRect).left - (r as Rect).l) > 100
            || Math.abs((r2 as ClientRect).top - (r as Rect).t) > 60)) {
      return _this._reinit();
    }
  },
  resetHints_ (): void {
    const a = this;
    a.fullHints_ = a.zIndexes_ = a.filterEngine_.activeHint_ = null as never;
    a.pTimer_ > 0 && clearTimeout(a.pTimer_);
    a.pTimer_ = 0;
    a.keyStatus_ = {
      hints_: null as never,
      keySequence_: "", textSequence_: "",
      known_: 0, tab_: 0
    };
  },
  clean_ (keepHUD?: boolean | BOOL): void {
    const a = this;
    a.resetHints_();
    a.options_ = a.modeOpt_ = null as never;
    a.lastMode_ = a.mode_ = a.mode1_ = a.count_ =
    a.maxLeft_ = a.maxTop_ = a.maxRight_ =
    a.maxPrefixLen_ = 0;
    a.keyCode_ = kKeyCode.None;
    a.yankedList_ = [];
    a.useFilter_ =
    a.isActive_ = a.noHUD_ = a.tooHigh_ = a.doesMapKey_ = false;
    a.chars_ = "";
    VKey.removeHandler_(a);
    VApi.onWndBlur_(null);
    if (a.box_) {
      a.box_.remove();
      a.box_ = null;
    }
    keepHUD || VHud.hide_();
  },
  deactivate_ (isLastKeyKnown: BOOL): void {
    this.clean_(this.pTimer_ < 0);
    (<RegExpOne> /0?/).test("");
    VKey.suppressTail_(isLastKeyKnown ? 0 : VDom.cache_.k[0]);
  },
  rotateHints_ (reverse?: boolean): void {
    const a = this, ref = a.keyStatus_.hints_;
    let stacks = a.zIndexes_;
    if (!stacks) {
      stacks = [] as HintsNS.Stacks;
      ref.forEach(a.MakeStacks_, [[], stacks] as [Array<ClientRect | null>, HintsNS.Stacks]);
      stacks = stacks.filter(stack => stack.length > 1);
      if (stacks.length <= 0) {
        a.zIndexes_ = a.keyStatus_.keySequence_ || a.keyStatus_.textSequence_ ? null : 0;
        return;
      }
      a.zIndexes_ = stacks;
    }
    for (const stack of stacks) {
      reverse && stack.reverse();
      const i = stack[stack.length - 1], max = reverse ? stack[0] : i;
      let oldI: number = ref[i].i || i;
      for (const j of stack) {
        const hint = ref[j], { m: marker_ } = hint, { classList } = marker_, newI = hint.i || j;
        marker_.style.zIndex = (hint.i = oldI) as number | string as string;
        classList.toggle("OH", oldI < max); classList.toggle("SH", oldI >= max);
        oldI = newI;
      }
      reverse && stack.reverse();
    }
  },
  MakeStacks_ (this: [Array<ClientRect | null>, HintsNS.Stacks], hint: HintsNS.HintItem, i: number) {
    let rects = this[0];
    if (hint.m.style.visibility === "hidden") { rects.push(null); return; }
    if (VHints.useFilter_) { hint.i = 0; }
    const stacks = this[1], m = hint.m.getClientRects()[0];
    rects.push(m);
    let stackForThisMarker = null as HintsNS.Stack | null;
    for (let j = 0, len2 = stacks.length; j < len2; ) {
      let stack = stacks[j], k = 0, len3 = stack.length;
      for (; k < len3; k++) {
        const t = rects[stack[k]] as ClientRect;
        if (m.bottom > t.top && m.top < t.bottom && m.right > t.left && m.left < t.right) {
          break;
        }
      }
      if (k >= len3) { /* empty */ }
      else if (stackForThisMarker) {
        stackForThisMarker.push(...stack);
        stacks.splice(j, 1); len2--;
        continue;
      } else {
        stack.push(i);
        stackForThisMarker = stack;
      }
      j++;
    }
    stackForThisMarker || stacks.push([i]);
  },

filterEngine_: {
  activeHint_: null as HintsNS.FilterHintItem | null,
  getRe_ (matches: string): RegExpG {
    const chars = VHints.chars_;
    return new RegExp(matches + (chars === "0123456789" ? "\\d" : chars.replace(<RegExpG> /\D+/g, "")) + "]+", "g");
  },
  GenerateHintStrings_ (this: void, hints: HintsNS.HintItem[]): void {
    const H = VHints, chars = H.chars_, base = chars.length, is10Digits = chars === "0123456789",
    count = hints.length;
    for (let i = 0; i < count; i++) {
      let hintString = "", num = is10Digits ? 0 : i + 1;
      for (; num; num = (num / base) | 0) {
        hintString = chars[num % base] + hintString;
      }
      hints[i].a = is10Digits ? i + 1 + "" : hintString;
    }
  },
  generateHintText_ (hint: Hint): HintsNS.HintText {
    let el = hint[0] as SafeHTMLElement, text: string = "", show = false;
    switch ("lang" in el ? el.localName : "") { // skip SVGElement
    case "input": case "textarea": case "select":
      let labels = (el as HTMLInputElement).labels;
      if (labels && labels.length > 0
          && (text = (labels[0] as SafeHTMLElement).innerText).trim()) {
        show = !0;
      } else if (el.localName === "select") {
        const selected = (el as HTMLSelectElement).selectedOptions[0];
        text = selected ? selected.label : "";
      } else if ((el as HTMLInputElement).type === "file") {
        text = "Choose File";
      } else if ((el as HTMLInputElement).type !== "password") {
        text = (el as HTMLInputElement).value || (el as HTMLInputElement).placeholder || "";
      }
      break;
    case "img":
      text = (el as HTMLImageElement).alt || (el as HTMLImageElement).title;
      show = !0;
      break;
    case "a":
      text = el.textContent.trim();
      if (!text) {
        let el2 = el.firstElementChild as Element | null;
        text = el2 && VDom.htmlTag_(el2) === "img"
            ? (el2 as HTMLImageElement).alt || (el2 as HTMLImageElement).title : "";
        show = !!text;
        text = text || el.title;
      }
      break;
    case "details":
      text = "Open"; show = !0;
      break;
    default:
      if (show = hint[2] > ClickType.MaxNotBox) {
        text = hint[2] > ClickType.frame ? "Scroll" : "Frame";
      } else {
        text = el.textContent.trim() || el.title;
      }
      break;
    }
    if (text) {
      text = text.slice(0, 256).trim();
      text.endsWith(":") && (text = text.substr(0, -1).trim());
      text && text[0] === ":" && (text = text.substr(1).trim());
    }
    return { t: show && text ? ": " + text : text, w: null };
  },
  getMatchingHints_ (keyStatus: HintsNS.KeyStatus, seq: string, text: string): HintsNS.HintItem | 1 | 0 {
    const H = VHints, fullHints = H.fullHints_ as HintsNS.FilterHintItem[],
    a = this, oldActive = a.activeHint_, inited = !!oldActive,
    oldTextSeq = inited ? keyStatus.textSequence_ : "a";
    let hints = keyStatus.hints_ as HintsNS.FilterHintItem[];
    if (oldTextSeq !== text) {
      const t2 = text.trim(), t1 = oldTextSeq.trim(),
      oldKeySeq = keyStatus.keySequence_,
      oldHints = t2.startsWith(t1) ? hints : fullHints;
      let newLen = 2, ind = 1;
      keyStatus.textSequence_ = t1 !== t2 ? text
          : t1 === oldTextSeq ? t2 && text
          : t2 !== text ? oldTextSeq : text;
      keyStatus.keySequence_ = "";
      if (t1 !== t2) {
        const search = t2.split(" "),
        hasSearch = !!t2, indStep = 1 / (1 + oldHints.length);
        if (hasSearch && !fullHints[0].h.w) {
          const exclusionRe = a.getRe_("[\\W");
          for (const {h: textHint} of fullHints) {
            const words = textHint.w = textHint.t.toLowerCase().split(exclusionRe);
            words[0] || words.shift();
            words.length && (words[words.length - 1] || words.pop());
          }
        }
        hasSearch && (hints = []);
        for (const hint of oldHints) {
          if (hasSearch) {
            const s = a.scoreHint_(hint.h, search);
            (hint.i = s && s + (ind -= indStep)) && hints.push(hint);
          } else {
            hint.i = (ind -= indStep) - hint.h.t.length;
          }
        }
        newLen = hints.length;
        if (newLen) {
          keyStatus.hints_ = hasSearch ? hints : hints = oldHints.slice(0);
          if (hasSearch && newLen < 2) { // in case of only 1 hint in fullHints
            return hints[0];
          }
          hints.sort((x1, x2) => x2.i - x1.i);
          a.GenerateHintStrings_(hints);
        }
        // hints[].zIndex is reset in .MakeStacks_
      }
      if (inited && (t1 !== t2 && newLen || oldKeySeq)) {
        for (const hint of newLen ? hints : oldHints) {
          const el = hint.m.firstElementChild as Element | null;
          el && el.remove();
          (hint.m.firstChild as Text).data = hint.a;
        }
        for (const hint of oldHints) {
          hint.m.style.visibility = hint.i !== 0 ? "" : "hidden";
        }
      }
      if (!newLen) {
        keyStatus.textSequence_ = oldTextSeq;
        return 1;
      }
      inited && H.setMode_(H.mode_);
    }
    if (keyStatus.keySequence_ !== seq) {
      keyStatus.keySequence_ = seq;
      let index = 0, base = H.chars_.length, end = hints.length;
      for (const ch of seq) { index = index * base + H.chars_.indexOf(ch); }
      if (index * base >= end) { return index <= end ? hints[index - 1] : 0; }
      for (const { m: marker, a: key } of hints) {
        const match = key.startsWith(seq), createEl = VDom.createElement_;
        marker.style.visibility = match ? "" : "hidden";
        if (match) {
          let child = marker.firstChild as Text | HintsNS.MarkerElement, el: HintsNS.MarkerElement;
          if (child instanceof Text) {
            el = marker.insertBefore(createEl("span") as HintsNS.MarkerElement, child);
            el.className = "MC";
          } else {
            el = child;
            child = child.nextSibling as Text;
          }
          el.textContent = seq;
          child.data = key.slice(seq.length);
        }
      }
    }
    hints = seq ? hints.filter(hint => hint.a.startsWith(seq)) : hints;
    const newActive = hints[(keyStatus.tab_ < 0 ? (keyStatus.tab_ += hints.length) : keyStatus.tab_) % hints.length];
    if (oldActive !== newActive) {
      if (oldActive) {
        oldActive.m.classList.remove("MC");
        oldActive.m.style.zIndex = "";
      }
      newActive.m.classList.add("MC");
      newActive.m.style.zIndex = fullHints.length as number | string as string;
      a.activeHint_ = newActive;
    }
    return 1;
  },
  /**
   * total / Math.log(~)
   * * `>=` 1 / `Math.log`(1 + 256) `>` 0.18
   * * margin `>=` `0.0001267`
   *
   * so, use `~ * 1e4` to ensure delta > 1
   */
  scoreHint_ (textHint: HintsNS.HintText, searchWords: string[]): number {
    let words = textHint.w as NonNullable<HintsNS.HintText["w"]>, total = 0;
    if (!words.length) { return 0; }
    for (const search of searchWords) {
      let max = 0;
      for (const word of words) {
        const pos = word.indexOf(search);
        max = pos < 0 ? max : Math.max(max,
            pos ? 1 : words.length - search.length ? max ? 2 : 6 : max ? 4 : 8);
      }
      if (!max) { return 0; }
      total += max;
    }
    return total * 1e4 / Math.log(1 + textHint.t.length);
  }
},
  renderMarkers_ (hintItems: HintsNS.HintItem[]): void {
    const a = VHints, doc = document, useFilter = a.useFilter_,
    exclusionRe = useFilter as true | never && a.filterEngine_.getRe_("[^\\x21-\\x7e]+|["),
    noAppend = !!(Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$append
        && VDom.cache_.v < BrowserVer.MinEnsured$ParentNode$$append;
    for (const hint of hintItems) {
      let right: string, marker = hint.m;
      if (useFilter) {
        marker.textContent = hint.a;
        right = (hint.h as HintsNS.HintText).t;
        if (!right || right[0] !== ":") { continue; }
        right = right.replace(exclusionRe, " ").trim();
        right = right.length > 34 ? right.slice(0, 34).trimRight() + "\u2026" : right;
      } else {
        right = hint.a.slice(-1);
        for (const ch of hint.a.slice(0, -1)) {
          const node = doc.createElement("span");
          node.textContent = ch;
          marker.appendChild(node);
        }
      }
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$append && noAppend) {
        marker.insertAdjacentText("beforeend", right);
      } else {
        (marker as Ensure<HTMLElement, "append">).append(right);
      }
    }
  },
  maxPrefixLen_: 0,
  initAlphabetEngine_ (hintItems: HintsNS.HintItem[]): void {
    const M = Math, C = M.ceil, charSet = this.chars_, step = charSet.length,
    chars2 = " " + charSet,
    count = hintItems.length, start = (C((count - 1) / (step - 1)) | 0) || 1,
    bitStep = C(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Math$$log2
          ? M.log(step + 1) / M.LN2 : M.log2(step + 1)) | 0;
    let hints: number[] = [0], next = 1, bitOffset = 0;
    for (let offset = 0, hint = 0; offset < start; ) {
      if (next === offset) { next = next * step + 1, bitOffset += bitStep; }
      hint = hints[offset++];
      for (let ch = 1; ch <= step; ch++) { hints.push((ch << bitOffset) | hint); }
    }
    this.maxPrefixLen_ = (bitOffset / bitStep - +(next > start)) | 0;
    while (next-- > start) { hints[next] <<= bitStep; }
    hints = hints.slice(start, start + count).sort((i, j) => i - j);
    for (let i = 0, mask = (1 << bitStep) - 1; i < count; i++) {
      let hintString = "", num = hints[i];
      if (!(num & mask)) { num >>= bitStep; }
      for (; num; num >>>= bitStep) { // use ">>>" to prevent potential typos from causing a dead loop
        hintString += chars2[num & mask];
      }
      hintItems[i].a = hintString;
    }
  },
  matchHintsByKey_ (keyStatus: HintsNS.KeyStatus, e: KeyboardEvent): HintsNS.HintItem | 0 | 1 {
    const h = VHints, {useFilter_: useFilter} = h;
    let keyChar: string
      , {keySequence_: sequence, textSequence_: textSeq, tab_: oldTab, hints_: hints} = keyStatus
      , key = e.keyCode, doesDetectMatchSingle: 0 | 1 | 2 = 0;
    keyStatus.tab_ = key === kKeyCode.tab ? useFilter ? oldTab - 2 * +e.shiftKey + 1 : 1 - oldTab
        : (useFilter || oldTab && (sequence = sequence.slice(0, -1)), 0);
    keyStatus.known_ = 1;
    if (key === kKeyCode.tab) {
      h.ResetMode_();
    }
    else if (key === kKeyCode.backspace || key === kKeyCode.deleteKey || key === kKeyCode.f1) {
      if (!sequence && !textSeq) {
        return 0;
      }
      sequence ? sequence = sequence.slice(0, -1) : textSeq = textSeq.slice(0, -1);
    } else if (key === kKeyCode.space) { // then useFilter is true
      sequence = "";
      textSeq += " ";
    } else if (key === kKeyCode.enter && useFilter) {
      // keep .known_ to be 1 - needed by .execute_
      return h.filterEngine_.activeHint_ as NonNullable<typeof h.filterEngine_.activeHint_>;
    } else if ((keyChar = VKey.char_(e)) && keyChar.length < 2
        && (keyChar = h.doesMapKey_ ? VApi.mapKey_(keyChar, e, keyChar) : keyChar).length < 2) {
      keyChar = useFilter ? keyChar : keyChar.toUpperCase();
      if (h.chars_.indexOf(keyChar) >= 0) {
        sequence += keyChar;
        doesDetectMatchSingle = useFilter || sequence.length < h.maxPrefixLen_ ? 1 : 2;
      } else if (!useFilter) {
        return 0;
      } else if (keyChar !== keyChar.toLowerCase() && (<RegExpOne> /[A-Z]/).test(h.chars_)
          || (<RegExpOne> /\W/).test(keyChar)) {
        return 1;
      } else {
        sequence = "";
        textSeq += keyChar.toLowerCase();
      }
    } else {
      return 1;
    }
    keyStatus.known_ = 0;
    h.zIndexes_ = h.zIndexes_ && null;
    if (doesDetectMatchSingle > 1) {
      for (const hint of hints) { if (hint.a === sequence) { return hint; } }
    }
    if (useFilter) {
      return h.filterEngine_.getMatchingHints_(keyStatus, sequence, textSeq);
    } else {
      keyStatus.keySequence_ = sequence;
      keyStatus.textSequence_ = textSeq;
      const notDoSubCheck = !keyStatus.tab_, wanted = notDoSubCheck ? sequence : sequence.slice(0, -1);
      hints = keyStatus.hints_ = (doesDetectMatchSingle ? hints : h.fullHints_).filter(function (hint): boolean {
        const pass = hint.a.startsWith(wanted) && (notDoSubCheck || !hint.a.startsWith(sequence));
        hint.m.style.visibility = pass ? "" : "hidden";
        return pass;
      });
      h.hideSpans_(hints);
      return hints.length ? 1 : 0;
    }
  },

decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
  try { url = (decode || decodeURI)(url); } catch {}
  return url;
},
isImageUrl_ (str: string | null): boolean {
  if (!str || str[0] === "#" || str.length < 5 || VDom.jsRe_.test(str)) {
    return false;
  }
  const end = str.lastIndexOf("#") + 1 || str.length;
  // tslint:disable-next-line: ban-types
  str = (str as EnsureNonNull<String>).substring(str.lastIndexOf("/", str.lastIndexOf("?") + 1 || end), end);
  return (<RegExpI & RegExpOne> /\.(?:bmp|gif|icon?|jpe?g|a?png|svg|tiff?|webp)\b/i).test(str);
},
getUrlData_ (link: HTMLAnchorElement): string {
  const str = link.dataset.vimUrl;
  if (str) {
    link = VDom.createElement_("a");
    link.href = str.trim();
  }
  // $1.href is ensured well-formed by @GetLinks_
  return link.href;
},
/** return: img is HTMLImageElement | HTMLAnchorElement | HTMLElement[style={backgroundImage}] */
_getImageUrl (img: SafeHTMLElement): string | void {
  let text: string | null, src = img.dataset.src || "", elTag = img.localName, n: number,
  notImg: 0 | 1 | 2 = elTag !== "img" ? 1 : 0;
  if (!notImg) {
    text = (img as HTMLImageElement).currentSrc || img.getAttribute("src") && (img as HTMLImageElement).src;
    if ((n = (img as HTMLImageElement).naturalWidth) && n < 3
        && (n = (img as HTMLImageElement).naturalHeight) && n < 3) {
      notImg = 2;
      text = "";
    }
  } else {
    text = elTag === "a" ? img.getAttribute("href") && (img as HTMLAnchorElement).href : "";
  }
  if (notImg) {
    if (!this.isImageUrl_(text)) {
      let arr = (<RegExpI> /^url\(\s?['"]?((?:\\['"]|[^'"])+?)['"]?\s?\)/i).exec(
        (notImg > 1 ? getComputedStyle(img) : img.style).backgroundImage as string);
      if (arr && arr[1]) {
        const a1 = document.createElement("a");
        a1.href = arr[1].replace(<RegExpG> /\\(['"])/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || VDom.jsRe_.test(text)
      || src.length > text.length + 7 && (text === (img as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  return text || VHud.tip_(kTip.notImg, 1000);
},
getImageName_: (img: SafeHTMLElement): string | null =>
  img.getAttribute("download") || img.title || img.getAttribute("alt"),

openUrl_ (url: string, incognito?: boolean): void {
  let kw = this.options_.keyword, opt: Req.fg<kFgReq.openUrl> = {
    H: kFgReq.openUrl,
    r: this.mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
    u: url,
    k: kw != null ? kw + "" : ""
  };
  incognito && (opt.i = incognito);
  VApi.post_(opt);
},
_highlightChild (el: HintsNS.LinkEl, tag: string): 0 | 1 | 2 {
  if (!(<RegExpOne> /^i?frame$/).test(tag)) {
    return 0;
  }
  const { count_: count, options_: options } = this;
  options.mode = this.mode_;
  this.mode_ = HintMode.DEFAULT;
  if (el === VOmni.box_) {
    VOmni.focus_();
    return 1;
  }
  let err: boolean | null = true, childEvents: VApiTy | undefined,
  core: ContentWindowCore | void | undefined | 0;
  try {
    err = !(el as HTMLIFrameElement | HTMLFrameElement).contentDocument
        || !(core = Build.BTypes & BrowserType.Firefox
              ? VDom.getWndCore_((el as HTMLIFrameElement | HTMLFrameElement).contentWindow)
              : (el as HTMLIFrameElement | HTMLFrameElement).contentWindow)
        || !(childEvents = core.VApi)
        || childEvents.keydownEvents_(Build.BTypes & BrowserType.Firefox ? VApi.keydownEvents_() : VApi);
  } catch (e) {
    if (!Build.NDEBUG) {
      let notDocError = true;
      if (Build.BTypes & BrowserType.Chrome && VDom.cache_.v < BrowserVer.Min$ContentDocument$NotThrow) {
        try {
          notDocError = (el as HTMLIFrameElement | HTMLFrameElement).contentDocument !== undefined;
        } catch { notDocError = false; }
      }
      if (notDocError) {
        console.log("Assert error: Child frame check breaks:", e);
      }
    }
  }
  el.focus();
  if (err) {
    VApi.send_(kFgReq.execInChild, {
      u: (el as HTMLIFrameElement | HTMLFrameElement).src,
      c: kFgCmd.linkHints, n: count, k: this.keyCode_, a: options
    }, function (res): void {
      if (!res) {
        (el as HTMLIFrameElement | HTMLFrameElement).contentWindow.focus();
      }
    });
  } else {
    (childEvents as NonNullable<typeof childEvents>).focusAndRun_(kFgCmd.linkHints, count, options, 1);
  }
  return 2;
},

Modes_: [
[
  (element, rect): void => {
    const a = VHints, type = VDom.getEditableType_<0>(element), toggleMap = a.options_.toggle;
    // here not check VDom.lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    VCui.activeEl_ = element;
    VDom.hover_(element, VDom.center_(rect));
    type || element.tabIndex < 0 ||
    (<RegExpI> /^i?frame$/).test(VDom.htmlTag_(element)) && element.focus && element.focus();
    if (a.mode1_ < HintMode.min_job) { // called from Modes[-1]
      return VHud.tip_(kTip.hoverScrollable, 1000);
    }
    if (!toggleMap || typeof toggleMap !== "object") { return; }
    VKey.safer_(toggleMap);
    let ancestors: Element[] = [], top: Element | null = element, re = <RegExpOne> /^-?\d+/;
    for (let key in toggleMap) {
      // if no Element::closest, go up by 6 levels and then query the selector
      let selector = key, prefix = re.exec(key), upper = prefix && prefix[0];
      if (upper) {
        selector = selector.slice(upper.length);
      }
      let up = (upper as string | number as number) | 0, selected: Element | null = null;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest && !up) {
        up = element.closest ? 0 : 6;
      }
      selector = selector.trim();
      while (up && up + 1 >= ancestors.length && top) {
        ancestors.push(top);
        top = VDom.GetParent_(top, PNType.RevealSlotAndGotoParent);
      }
      try {
        if (selector && (selected = up
              ? Build.BTypes & ~BrowserType.Firefox
                ? Element.prototype.querySelector.call(ancestors[Math.max(0, Math.min(up + 1, ancestors.length - 1))]
                    , selector)
                : (ancestors[Math.max(0, Math.min(up + 1, ancestors.length - 1))]).querySelector(selector)
              : (element as EnsureNonNull<Element>).closest(selector))) {
          for (const clsName of toggleMap[key].split(" ")) {
            clsName.trim() && selected.classList.toggle(clsName);
          }
        }
      } catch {}
      if (selected) {
        break;
      }
    }
  }
  , HintMode.HOVER
  , HintMode.HOVER | HintMode.queue
] as HintsNS.ModeOpt,
[
  (element: Hint[0]): void => {
    const a = VDom;
    if (a.lastHovered_ !== element) {
      a.hover_(null);
    }
    a.lastHovered_ = element;
    a.hover_(null);
    if (document.activeElement === element) { element.blur(); }
  }
  , HintMode.LEAVE
  , HintMode.LEAVE | HintMode.queue
] as HintsNS.ModeOpt,
[
  (link): boolean | void => {
    const a = VHints, mode1 = a.mode1_;
    let isUrl = mode1 > HintMode.min_link_job - 1 && mode1 < HintMode.max_link_job + 1,
        str: string | null | undefined;
    if (isUrl) {
      str = a.getUrlData_(link as HTMLAnchorElement);
      str && (<RegExpI> /^mailto:./).test(str) && (str = str.slice(7).trim());
    }
    /** Note: SVGElement::dataset is only since `BrowserVer.Min$SVGElement$$dataset` */
    else if ((str = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$SVGElement$$dataset
          ?  link.getAttribute("data-vim-text") : (link.dataset as NonNullable<typeof link.dataset>).vimText)
        && (str = str.trim())) { /* empty */ }
    else {
      const tag = VDom.htmlTag_(link), isChild = a._highlightChild(link, tag);
      if (isChild) { return isChild > 1; }
      if (tag === "input") {
        let type = (link as HTMLInputElement).type, f: HTMLInputElement["files"];
        if (type === "password") {
          return VHud.tip_(kTip.ignorePassword, 2000);
        }
        if (!VDom.uneditableInputs_[type]) {
          str = (link as HTMLInputElement).value || (link as HTMLInputElement).placeholder;
        } else if (type === "file") {
          str = (f = (link as HTMLInputElement).files) && f.length > 0 ? f[0].name : "";
        } else if ("button image submit reset".indexOf(type) >= 0) {
          str = (link as HTMLInputElement).value;
        }
      } else {
        str = tag === "textarea" ? (link as HTMLTextAreaElement).value
          : tag === "select" ? ((link as HTMLSelectElement).selectedIndex < 0
              ? "" : (link as HTMLSelectElement).options[(link as HTMLSelectElement).selectedIndex].text)
          : tag && (str = (link as SafeHTMLElement).innerText.trim(),
              (<RegExpI> /^mailto:./).test(str) ? str.slice(7).trim() : str)
            || (str = link.textContent.trim()) && str.replace(<RegExpG> /\s+/g, " ")
          ;
      }
      str = str && str.trim();
      if (!str && tag) {
        str = (link as SafeHTMLElement).title.trim() || (link.getAttribute("aria-label") || "").trim();
      }
    }
    if (!str) {
      return VHud.copied_("", isUrl ? "url" : "");
    }
    if (mode1 > HintMode.min_edit - 1 && mode1 < HintMode.max_edit + 1) {
      let newtab = a.options_.newtab;
      // this frame is normal, so during Vomnibar.activate, checkHidden will only pass (in most cases)
      (VApi as ComplicatedVPort).post_<kFgReq.vomnibar, { c: number } & Partial<VomnibarNS.ContentOptions>>({
        H: kFgReq.vomnibar,
        c: 1,
        newtab: newtab != null ? !!newtab : !isUrl,
        url: str,
        keyword: (a.options_.keyword || "") + ""
      });
      return;
    } else if (mode1 === HintMode.SEARCH_TEXT) {
      return a.openUrl_(str);
    }
    // then mode1 can only be copy
    // NOTE: url should not be modified
    // although BackendUtils.convertToUrl does replace '\u3000' with ' '
    str = isUrl ? a.decodeURL_(str) : str;
    let shownText = str, lastYanked = mode1 & HintMode.list ? a.yankedList_ : 0 as const;
    if (lastYanked) {
      if (lastYanked.indexOf(str) >= 0) {
        return VHud.show_(kTip.noNewToCopy);
      }
      shownText = `[${lastYanked.length + 1}] ` + str;
      lastYanked.push(str);
    }
    VApi.post_({
      H: kFgReq.copy,
      j: a.options_.join,
      d: lastYanked || str
    });
    return VHud.copied_(shownText);
  }
  , HintMode.SEARCH_TEXT
  , HintMode.COPY_TEXT
  , HintMode.COPY_URL
  , HintMode.SEARCH_TEXT | HintMode.queue
  , HintMode.COPY_TEXT | HintMode.queue
  , HintMode.COPY_TEXT | HintMode.queue | HintMode.list
  , HintMode.COPY_URL | HintMode.queue
  , HintMode.COPY_URL | HintMode.queue | HintMode.list
  , HintMode.EDIT_LINK_URL
  , HintMode.EDIT_TEXT
] as HintsNS.ModeOpt,
[
  (link: HTMLAnchorElement): void => {
    const url = VHints.getUrlData_(link);
    if (!VApi.evalIfOK_(url)) {
      return VHints.openUrl_(url, true);
    }
  }
  , HintMode.OPEN_INCOGNITO_LINK
  , HintMode.OPEN_INCOGNITO_LINK | HintMode.queue
] as HintsNS.ModeOpt,
[
  (element: SafeHTMLElement): void => {
    let tag = element.localName, text: string | void;
    if (tag === "video" || tag === "audio") {
      text = (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src;
    } else {
      text = VHints._getImageUrl(element);
    }
    if (!text) { return; }
    const url = text, i = text.indexOf("://"), a = VDom.createElement_("a");
    if (i > 0) {
      text = text.slice(text.indexOf("/", i + 4) + 1);
    }
    if (text.length > 40) {
      text = text.slice(0, 39) + "\u2026";
    }
    a.href = url;
    a.download = VHints.getImageName_(element) || "";
    // todo: how to trigger download
    VDom.mouse_(a, "click", [0, 0]);
    return VHud.tip_(kTip.downloaded, 2000, [text]);
  }
  , HintMode.DOWNLOAD_MEDIA
  , HintMode.DOWNLOAD_MEDIA | HintMode.queue
] as HintsNS.ModeOpt,
[
  (img: SafeHTMLElement): void => {
    const a = VHints, text = a._getImageUrl(img);
    if (!text) { return; }
    VApi.post_({
      H: kFgReq.openImage,
      r: a.mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      f: a.getImageName_(img),
      u: text,
      a: a.options_.auto
    });
  }
  , HintMode.OPEN_IMAGE
  , HintMode.OPEN_IMAGE | HintMode.queue
] as HintsNS.ModeOpt,
[
  (link: HTMLAnchorElement, rect): void => {
    let oldUrl: string | null = link.getAttribute("href"), changed = false;
    if (!oldUrl || oldUrl === "#") {
      let newUrl = link.dataset.vimUrl;
      if (newUrl && (newUrl = newUrl.trim())) {
        link.href = newUrl;
        changed = true;
      }
    }
    const kDownload = "download", hadNoDownload = !link.hasAttribute(kDownload);
    if (hadNoDownload) {
      link.download = "";
    }
    VCui.click_(link, rect, {
      altKey_: true,
      ctrlKey_: false,
      metaKey_: false,
      shiftKey_: false
    }, 0, 0);
    if (hadNoDownload) {
      link.removeAttribute(kDownload);
    }
    if (!changed) { /* empty */ }
    else if (oldUrl != null) {
      link.setAttribute("href", oldUrl);
    } else {
      link.removeAttribute("href");
    }
  }
  , HintMode.DOWNLOAD_LINK
  , HintMode.DOWNLOAD_LINK | HintMode.queue
] as HintsNS.ModeOpt,
[
  (link, rect): void | false => {
    if (VHints.mode_ < HintMode.min_disable_queue) {
      VDom.view_(link);
      link.focus();
      VCui.flash_(link);
    } else {
      VCui.simulateSelect_(link as HintsNS.InputHintItem["d"], rect, true);
    }
    return false;
  }
  , HintMode.FOCUS
  , HintMode.FOCUS | HintMode.queue
  , HintMode.FOCUS_EDITABLE
] as HintsNS.ModeOpt,
[
  (link, rect, hint): void | boolean => {
    const a = VHints, tag = VDom.htmlTag_(link), isChild = a._highlightChild(link, tag);
    if (isChild) {
      return isChild > 1;
    }
    if (tag === "details") {
      const summary = VDom.findMainSummary_(link as HTMLDetailsElement);
      if (summary) {
          // `HTMLSummaryElement::DefaultEventHandler(event)` in
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_summary_element.cc?l=109
          rect = (link as HTMLDetailsElement).open || !rect ? VDom.getVisibleClientRect_(summary) : rect;
          VCui.click_(summary, rect, null, 1);
          rect && VCui.flash_(null, rect);
          return false;
      }
      (link as HTMLDetailsElement).open = !(link as HTMLDetailsElement).open;
      return;
    } else if (hint.r && hint.r === link) {
      return a.Modes_[0][0](link, rect, hint);
    } else if (VDom.getEditableType_<0>(link) >= EditableType.TextBox) {
      VCui.simulateSelect_(link as LockableElement, rect, true);
      return false;
    }
    const mask = a.mode_ & HintMode.mask_focus_new, isMac = !VDom.cache_.o,
    isRight = a.options_.button === "right",
    dblClick = !!a.options_.dblclick,
    specialActions = isRight || dblClick,
    newTab = mask > HintMode.newTab - 1 && !specialActions,
    openUrlInNewTab = specialActions || tag !== "a" ? 0
        : a.options_.newtab === "force" ? newTab ? 6 : 2
        : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
          ? newTab ? 5 : 1 // need to work around Firefox's popup blocker
        : 0;
    VCui.click_(link, rect, {
      altKey_: false,
      ctrlKey_: newTab && !isMac,
      metaKey_: newTab && isMac,
      shiftKey_: newTab && mask > HintMode.mask_focus_new - 1
    }, mask > 0 || link.tabIndex >= 0
    , dblClick ? 8 : openUrlInNewTab
    , isRight ? 2 : 0
    , !(Build.BTypes & BrowserType.Chrome) || specialActions || newTab ? 0 : a.options_.touch);
  }
  , HintMode.OPEN_IN_CURRENT_TAB
  , HintMode.OPEN_IN_NEW_BG_TAB
  , HintMode.OPEN_IN_NEW_FG_TAB
  , HintMode.OPEN_IN_CURRENT_TAB | HintMode.queue
  , HintMode.OPEN_IN_NEW_BG_TAB | HintMode.queue
  , HintMode.OPEN_IN_NEW_FG_TAB | HintMode.queue
] as HintsNS.ModeOpt
] as const
};
if (!(Build.NDEBUG || HintMode.min_not_hint <= <number> kTip.START_FOR_OTHERS)) {
  console.log("Assert error: HintMode.min_not_hint <= kTip.START_FOR_OTHERS");
}
if (!(Build.NDEBUG || VHints.Modes_.length === 9)) {
  console.log("Assert error: VHints.Modes_ should have 9 items");
}
