const enum ClickType {
  Default = 0, edit,
  MaxNotWeak = edit, attrListener, codeListener, classname, tabindex, MinNotWeak,
  MaxNotBox = 6, frame, scrollX, scrollY,
}
const enum DeepQueryType {
  NotDeep = 0, // must be 0 because of `InDeep - deep`
  NotAvailable = 1,
  InDeep = 2,
}
declare namespace HintsNS {
  type LinkEl = Hint[0];
  interface ModeOpt {
    [mode: number]: string | undefined;
    execute_ (this: {}, linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintsNS.HintItem, "refer_">): void | boolean;
  }
  interface Options extends SafeObject {
    action?: string;
    mode?: string | number;
    url?: boolean;
    keyword?: string;
    newtab?: boolean;
    button?: "right";
    touch?: boolean | null;
    toggle?: {
      [selector: string]: string;
    };
    mapKey?: boolean;
    auto?: boolean;
    /** @deprecated */
    force?: boolean;
  }
  type NestedFrame = false | 0 | null | HTMLIFrameElement | HTMLFrameElement;
  interface ElementIterator<T> {
    // tslint:disable-next-line: callable-types
    (this: { [index: number]: Element, length: number}, fn: (this: T[], value: Element) => void, self: T[]): void;
  }
  interface Filter<T> {
    // tslint:disable-next-line: callable-types
    (this: T[], element: Element): void;
  }
  type LinksMatched = false | null | HintItem[];
  type Stack = number[];
  type Stacks = Stack[];
  interface KeyStatus {
    known_: BOOL;
    newHintLength_: number;
    tab_: BOOL;
  }
  type ElementList = NodeListOf<Element> | Element[];
}

var VHints = {
  CONST_: {
    focus: HintMode.FOCUS,
    hover: HintMode.HOVER,
    leave: HintMode.LEAVE,
    unhover: HintMode.LEAVE,
    text: HintMode.COPY_TEXT,
    "copy-text": HintMode.COPY_TEXT,
    url: HintMode.COPY_LINK_URL,
    image: HintMode.OPEN_IMAGE
  } as Dict<HintMode>,
  box_: null as HTMLDivElement | HTMLDialogElement | null,
  dialogMode_: false,
  hints_: null as HintsNS.HintItem[] | null,
  mode_: 0 as HintMode,
  mode1_: 0 as HintMode,
  modeOpt_: null as HintsNS.ModeOpt | null,
  queryInDeep_: Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0
    ? DeepQueryType.NotDeep : DeepQueryType.NotAvailable,
  forHover_: false,
  count_: 0,
  lastMode_: 0 as HintMode,
  tooHigh_: false as null | boolean,
  pTimer_: 0, // promptTimer
  isClickListened_: true,
  ngEnabled_: null as boolean | null,
  keyStatus_: {
    known_: 0,
    newHintLength_: 0,
    tab_: 0
  } as HintsNS.KeyStatus,
  keyCode_: kKeyCode.None,
  isActive_: false,
  noHUD_: false,
  options_: null as never as HintsNS.Options,
  timer_: 0,
  activate_ (this: void, count: number, options: FgOptions): void {
    const a = VHints;
    if (a.isActive_) { return; }
    if (VEvent.checkHidden_(kFgCmd.linkHints, count, options)) {
      return a.clean_();
    }
    VKey.removeHandler_(a);
    if (document.body === null) {
      a.clean_();
      if (!a.timer_ && VDom.OnDocLoaded_ !== VDom.execute_) {
        VKey.pushHandler_(VKey.SuppressMost_, a);
        a.timer_ = setTimeout(a.activate_.bind(a as never, count, options), 300);
        return;
      }
      if (!VDom.isHTML_()) { return; }
    }
    a.setModeOpt_(count, options);
    let str = options.characters ? options.characters + "" : VDom.cache_.linkHintCharacters;
    if (str.length < 3) {
      a.clean_(1);
      return VHud.tip_("Characters for LinkHints are too few.", 1000);
    }
    a.alphabetHints_.chars_ = str.toUpperCase();

    const arr: ViewBox = VDom.getViewBox_(1) as ViewBox;
    VDom.prepareCrop_();
    if (a.tooHigh_ !== null) {
      a.tooHigh_ = (VDom.scrollingEl_(1) as HTMLElement).scrollHeight / innerHeight
        > GlobalConsts.LinkHintTooHighThreshold;
    }
    let elements = a.getVisibleElements_(arr);
    if (a.frameNested_) {
      if (a.TryNestedFrame_(kFgCmd.linkHints, count, options)) {
        return a.clean_();
      }
    }
    if (elements.length === 0) {
      a.clean_(1);
      return VHud.tip_("No links to select.", 1000);
    }

    if (a.box_) { a.box_.remove(); a.box_ = null; }
    a.hints_ = elements.map(a.createHint_, a);
    VDom.bZoom_ !== 1 && a.adjustMarkers_(elements);
    elements = null as never;
    a.alphabetHints_.initMarkers_(a.hints_);

    a.noHUD_ = arr[3] <= 40 || arr[2] <= 320 || (options.hideHUD || options.hideHud) === true;
    VDom.UI.ensureBorder_(VDom.wdZoom_);
    a.setMode_(a.mode_, false);
    a.box_ = VDom.UI.addElementList_(a.hints_, arr, a.dialogMode_);
    a.dialogMode_ && (a.box_ as HTMLDialogElement).showModal();

    a.isActive_ = true;
    VKey.pushHandler_(a.onKeydown_, a);
    VEvent.onWndBlur_(a.ResetMode_);
  },
  setModeOpt_ (count: number, options: HintsNS.Options): void {
    const a = this;
    if (a.options_ === options) { return; }
    let ref = a.Modes_, modeOpt: HintsNS.ModeOpt | undefined,
    mode = (<number> options.mode > 0 ? options.mode as number
      : a.CONST_[options.action || options.mode as string] as number | undefined | {} as number) | 0;
    if (mode === HintMode.EDIT_TEXT && options.url) {
      mode = HintMode.EDIT_LINK_URL;
    }
    count = Math.abs(count);
    if (count > 1) { mode < HintMode.min_disable_queue ? (mode |= HintMode.queue) : (count = 1); }
    for (let _i = ref.length; 0 <= --_i; ) {
      if (ref[_i].hasOwnProperty(mode)) {
        modeOpt = ref[_i];
        break;
      }
    }
    if (!modeOpt) {
      modeOpt = ref[8];
      mode = count > 1 ? HintMode.OPEN_WITH_QUEUE : HintMode.OPEN_IN_CURRENT_TAB;
    }
    a.modeOpt_ = modeOpt;
    a.options_ = options;
    a.count_ = count;
    return a.setMode_(mode, true);
  },
  setMode_ (mode: HintMode, slient?: boolean): void {
    const a = this;
    a.lastMode_ = a.mode_ = mode;
    a.mode1_ = mode = mode & ~HintMode.queue;
    a.forHover_ = mode >= HintMode.HOVER && mode <= HintMode.LEAVE;
    if (slient || a.noHUD_) { return; }
    if (a.pTimer_ < 0) {
      a.pTimer_ = setTimeout(a.SetHUDLater_, 1000);
      return;
    }
    const msg = a.dialogMode_ ? " (modal UI)" : "";
    return VHud.show_((a.modeOpt_ as HintsNS.ModeOpt)[a.mode_] + msg, true);
  },
  SetHUDLater_ (this: void): void {
    const a = VHints;
    if (a && a.isActive_) { a.pTimer_ = 0; return a.setMode_(a.mode_); }
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
    let events: VEventModeTy | undefined, core: ContentWindowCore | null | 0 | void | undefined = null;
    if (!frame) { return false; }
    try {
      if (frame.contentDocument
          && (core = Build.BTypes & BrowserType.Firefox ? VDom.getWndCore_(frame.contentWindow) : frame.contentWindow)
          && core.VDom && (core.VDom as typeof VDom).isHTML_()) {
        if (cmd === kFgCmd.linkHints) {
          (done = (core as VWindow).VHints.isActive_) && (core as VWindow).VHints.deactivate_(0);
        }
        events = core.VEvent as VEventModeTy;
        err = events.keydownEvents_(Build.BTypes & BrowserType.Firefox ? VEvent.keydownEvents_() : VEvent);
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
  zIndexes_: null as null | false | HintsNS.Stacks,
  createHint_ (link: Hint): HintsNS.HintItem {
    let i: number = link.length < 4 ? link[1][0] : (link as Hint4)[3][0][0] + (link as Hint4)[3][1];
    const marker = VDom.createElement_("span") as HintsNS.MarkerElement, st = marker.style,
    isBox = link[2] > ClickType.MaxNotBox,
    hint: HintsNS.HintItem = {
      key_: "", target_: link[0], marker_: marker,
      refer_: link.length > 4 ? (link as Hint5)[4] : isBox ? link[0] : null,
    };
    marker.className = isBox ? "LH BH" : "LH";
    st.left = i + "px";
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && i > this.maxLeft_ && this.maxRight_) {
      st.maxWidth = this.maxRight_ - i + "px";
    }
    i = link[1][1];
    st.top = i + "px";
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && i > this.maxTop_) {
      st.maxHeight = this.maxTop_ - i + GlobalConsts.MaxHeightOfLinkHintMarker + "px";
    }
    return hint;
  },
  adjustMarkers_ (elements: Hint[]): void {
    const zi = VDom.bZoom_, root = VDom.UI.UI;
    let i = elements.length - 1;
    if (!root || elements[i][0] !== VOmni.box_ && !root.querySelector("#HelpDialog")) { return; }
    const z = Build.BTypes & ~BrowserType.Firefox ? ("" + 1 / zi).slice(0, 5) : "",
    arr = this.hints_ as HintsNS.HintItem[],
    mr = Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
        ? this.maxRight_ * zi : 0,
    mt = Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
        ? this.maxTop_ * zi : 0;
    while (0 <= i && root.contains(elements[i][0])) {
      let st = arr[i--].marker_.style;
      Build.BTypes & ~BrowserType.Firefox && (st.zoom = z);
      if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinAbsolutePositionNotCauseScrollbar) {
        continue;
      }
      st.maxWidth && (st.maxWidth = mr - elements[i][1][0] + "px");
      st.maxHeight && (st.maxHeight = mt - elements[i][1][1] + 18 + "px");
    }
  },
  btnRe_: <RegExpOne> /\b(?:[Bb](?:utto|t)n|[Cc]lose)(?:$|[-\s_])/,
  roleRe_: <RegExpI> /^(?:button|checkbox|link|radio|tab)$|^menuitem/i,
  /**
   * Must ensure only call {@link scroller.ts#VScroller.shouldScroll_need_safe_} during {@link #getVisibleElements_}
   */
  GetClickable_ (this: Hint[], element: Element): void {
    let arr: Rect | null | undefined, isClickable = null as boolean | null, s: string | null, type = ClickType.Default;
    if ((element as ElementToHTML).lang == null) { // not HTML*
      if ("tabIndex" in <ElementToHTMLorSVG> element) { // SVG*
        // not need to distinguish attrListener and codeListener
        type = VDom.clickable_.has(element) || element.getAttribute("onclick")
            || VHints.ngEnabled_ && element.getAttribute("ng-click")
            || (s = element.getAttribute("jsaction")) && VHints.checkJSAction_(s) ? ClickType.attrListener
          : (element as SVGElement).tabIndex >= 0 ? ClickType.tabindex
          : ClickType.Default;
        if (type > ClickType.Default && (arr = VDom.getVisibleClientRect_(element))) {
          this.push([element as SVGElement, arr, type]);
        }
      }
      return;
    }
    const unsafeTag = element.tagName, tag = typeof unsafeTag === "string" ? unsafeTag.toLowerCase() : "";
    if (tag) {
      if (Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter || !(Build.BTypes & BrowserType.Chrome)
          ? unsafeTag === "form" : unsafeTag === "form" || unsafeTag === VDom.unsafeFramesetTag_) {
        return;
      }
    }
    // according to https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow,
    // elements of the types below (except <div>) should refuse `attachShadow`
    switch (tag) {
    case "": // not safe
      return;
    case "a":
      isClickable = true;
      arr = VHints.checkAnchor_(element as Parameters<typeof VHints.checkAnchor_>[0]);
      break;
    case "audio": case "video": isClickable = true; break;
    case "frame": case "iframe":
      if (element === VOmni.box_) {
        if (arr = VDom.getVisibleClientRect_(element)) {
          (arr as WritableRect)[0] += 12; (arr as WritableRect)[1] += 9;
          this.push([element as SafeHTMLElement, arr, ClickType.frame]);
        }
        return;
      }
      isClickable = element !== VFind.box_;
      type = isClickable ? ClickType.frame : ClickType.Default;
      break;
    case "input":
      if ((element as HTMLInputElement).type === "hidden") { return; } // no break;
    case "textarea":
      if ((element as TextElement).disabled && VHints.mode1_ <= HintMode.LEAVE) { return; }
      if (!(element as TextElement).readOnly || VHints.mode_ >= HintMode.min_job
          || tag[0] === "i"
              && VDom.uneditableInputs_[(element as HTMLInputElement).type]) {
        isClickable = true;
      }
      break;
    case "details":
      isClickable = VHints.isNotReplacedBy_(VDom.findMainSummary_(element as HTMLDetailsElement), this);
      break;
    case "label":
      isClickable = VHints.isNotReplacedBy_((element as HTMLLabelElement).control as SafeHTMLElement | null);
      break;
    case "button": case "select":
      isClickable = !(element as HTMLButtonElement | HTMLSelectElement).disabled || VHints.mode1_ > HintMode.LEAVE;
      break;
    case "object": case "embed":
      s = (element as HTMLObjectElement | HTMLEmbedElement).type;
      if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
      if (tag[0] === "o"
          && (element as HTMLObjectElement).useMap) {
        VDom.getClientRectsForAreas_(element as HTMLObjectElement, this as Hint5[]);
      }
      return;
    case "img":
      if ((element as HTMLImageElement).useMap) {
        VDom.getClientRectsForAreas_(element as HTMLImageElement, this as Hint5[]);
      }
      if ((VHints.forHover_ && VDom.htmlTag_(element.parentNode as Element) !== "a")
          || ((s = (element as HTMLElement).style.cursor as string) ? s !== "default"
              : (s = getComputedStyle(element).cursor as string) && (s.indexOf("zoom") >= 0 || s.startsWith("url"))
          )) {
        isClickable = true;
      }
      break;
    // elements of the types above should refuse `attachShadow`
    case "div": case "ul": case "pre": case "ol": case "code": case "table": case "tbody":
      type = (type = element.clientHeight) && type + 5 < element.scrollHeight ? ClickType.scrollY
        : (type = element.clientWidth) && type + 5 < element.scrollWidth ? ClickType.scrollX : ClickType.Default;
      // no break;
    default:
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            && VDom.cache_.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          ? element.webkitShadowRoot : element.shadowRoot) {
        VHints.detectMore_(element as SafeHTMLElement, VHints.GetClickable_, this);
        return;
      }
    }
    if (isClickable === null) {
      type = (s = (element as SafeHTMLElement).contentEditable) !== "inherit" && s && s !== "false" ? ClickType.edit
        : element.getAttribute("onclick")
          || (s = element.getAttribute("role")) && VHints.roleRe_.test(s)
          || VHints.ngEnabled_ && element.getAttribute("ng-click")
          || VHints.forHover_ && element.getAttribute("onmouseover")
          || (s = element.getAttribute("jsaction")) && VHints.checkJSAction_(s) ? ClickType.attrListener
        : VDom.clickable_.has(element) && VHints.isClickListened_
          && VHints.inferTypeOfListener_(element as SafeHTMLElement, tag)
        ? ClickType.codeListener
        : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 ? ClickType.tabindex
        : type > ClickType.tabindex ? type : (s = element.className) && VHints.btnRe_.test(s) ? ClickType.classname
        : ClickType.Default;
    }
    if (!isClickable && type === ClickType.Default) { return; }
    if ((arr = arr || VDom.getVisibleClientRect_(element))
        && (type < ClickType.scrollX
          || VScroller.shouldScroll_need_safe_(element as SafeHTMLElement, type - ClickType.scrollX as 0 | 1) > 0)
        && ((s = element.getAttribute("aria-hidden")) == null || s && s.toLowerCase() !== "true")
        && ((s = element.getAttribute("aria-disabled")) == null || (s && s.toLowerCase() !== "true")
          || VHints.mode_ >= HintMode.min_job) // note: might need to apply aria-disable on FOCUS/HOVER/LEAVE mode?
    ) { this.push([element as SafeHTMLElement, arr, type]); }
  },
  noneActionRe_: <RegExpOne> /\._\b(?![\$\.])/,
  checkJSAction_ (str: string): boolean {
    for (let s of str.split(";")) {
      s = s.trim();
      const t = s.startsWith("click:") ? (s = s.slice(6)) : s && s.indexOf(":") === -1 ? s : null;
      if (t && t !== "none" && !this.noneActionRe_.test(t)) {
        return true;
      }
    }
    return false;
  },
  _HNTagRe: <RegExpOne> /h\d/,
  checkAnchor_ (anchor: HTMLAnchorElement & EnsuredMountedHTMLElement): Rect | null {
    // for Google search result pages
    let el = (anchor.rel || anchor.hasAttribute("ping"))
        && anchor.firstElementChild as Element | null;
    return el && this._HNTagRe.test(VDom.htmlTag_(el))
        && this.isNotReplacedBy_(el as SafeHTMLElement) ? VDom.getVisibleClientRect_(el) : null;
  },
  isNotReplacedBy_ (element: SafeHTMLElement | null | void, isExpected?: Hint[]): boolean | null {
    const arr2: Hint[] = [], a = this, clickListened = a.isClickListened_;
    if (element) {
      if (!isExpected && (element as TypeToAssert<HTMLElement, HTMLInputElement, "disabled">).disabled) { return !1; }
      isExpected && (VDom.clickable_.add(element), a.isClickListened_ = true);
      a.GetClickable_.call(arr2, element);
      if (!clickListened && isExpected && arr2.length && arr2[0][2] === ClickType.codeListener) {
        a.isClickListened_ = clickListened;
        a.GetClickable_.call(arr2, element);
        if (arr2.length < 2) { // note: excluded during normal logic
          isExpected.push(arr2[0]);
        }
      }
    }
    return element ? !arr2.length : !!isExpected || null;
  },
  inferTypeOfListener_ (el: SafeHTMLElement, tag: string): boolean {
    let replacer = tag === "div" ? !el.className && !el.id && el.querySelector("a")
        : tag === "tr" ? el.querySelector("input[type=checkbox]")
        : tag === "table",
    el2: Element["firstElementChild"];
    if (!replacer && tag === "div") {
      el2 = el.firstElementChild;
      if (VDom.clickable_.has(el2 as Element) && ((tag = VDom.htmlTag_(el2 as Element)) === "div" || tag === "span")
          && (el2 as HTMLDivElement).getClientRects().length) {
        replacer = true;
      }
    }
    // Note: should avoid nested calling to isNotReplacedBy_
    return !replacer || replacer !== true && !!this.isNotReplacedBy_(replacer as SafeHTMLElement);
  },
  /** Note: required by {@link #kFgCmd.focusInput}, should only add SafeHTMLElement instances */
  GetEditable_ (this: Hint[], element: Element): void {
    let arr: Rect | null, type = ClickType.Default, s: string;
    switch (VDom.htmlTag_(element)) {
    case "": /* not SafeHTMLElement: */ return;
    case "input":
      if (VDom.uneditableInputs_[(element as HTMLInputElement).type]) {
        return;
      } // no break;
    case "textarea":
      if ((element as TextElement).disabled || (element as TextElement).readOnly) { return; }
      break;
    default:
      if ((s = (element as SafeHTMLElement).contentEditable) === "inherit" || !s || s === "false") {
        if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
              && VDom.cache_.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            ? element.webkitShadowRoot : element.shadowRoot) {
          VHints.detectMore_(element as SafeHTMLElement, VHints.GetEditable_, this);
        }
        return;
      }
      type = ClickType.edit;
      break;
    }
    if (arr = VDom.getVisibleClientRect_(element)) {
      this.push([element as HintsNS.InputHintItem["target_"], arr, type]);
    }
  },
  GetLinks_ (this: Hint[], element: Element): void {
    let a: string | null, arr: Rect | null;
    if (VDom.htmlTag_(element) === "a" && ((a = element.getAttribute("href")) && a !== "#"
        && !VHints.jsRe_.test(a)
        || (element as HTMLAnchorElement).dataset.vimUrl != null)) {
      if (arr = VDom.getVisibleClientRect_(element)) {
        this.push([element as HTMLAnchorElement, arr, ClickType.Default]);
      }
    }
  },
  _getImagesInImg (arr: Hint[], element: HTMLImageElement): void {
    // according to https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement#Browser_compatibility,
    // <img>.currentSrc is since C45
    if (!element.getAttribute("src") && !element.currentSrc && !element.dataset.src) { return; }
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
      arr.push([element, cr, ClickType.Default]);
    }
  },
  GetImages_ (this: Hint[], element: Element): void {
    const tag = VDom.htmlTag_(element);
    if (!tag) { return; }
    if (tag === "img") {
      VHints._getImagesInImg(this, element as HTMLImageElement);
      return;
    }
    let str = (element as SafeHTMLElement).dataset.src || element.getAttribute("href"), cr: Rect | null;
    if (!VHints.isImageUrl_(str)) {
      str = (element as SafeHTMLElement).style.backgroundImage as string;
      // skip "data:" URLs, becase they are not likely to be big images
      str = (str.startsWith("url") || str.startsWith("URL")) && str.lastIndexOf("data:", 9) < 0 ? str : "";
    }
    if (str) {
      if (cr = VDom.getVisibleClientRect_(element)) {
        this.push([element as SafeHTMLElement, cr, ClickType.Default]);
      }
    }
  },
  /** @safe_even_if_any_overridden_property */
  traverse_: function (key: string
      , filter: HintsNS.Filter<Hint | Element>, notWantVUI?: boolean
      , wholeDoc?: true): Hint[] | Element[] {
    const a = VHints, matchAll = key === "*", D = document;
    if (a.ngEnabled_ === null && matchAll) {
      a.ngEnabled_ = D.querySelector(".ng-scope") != null;
    }
    const output: Hint[] | Element[] = [],
    query = !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0)
      || matchAll || a.queryInDeep_ !== DeepQueryType.InDeep ? key : a.getDeepDescendantCombinator_() + key,
    Sc = VScroller,
    wantClickable = matchAll && filter === a.GetClickable_,
    box = !wholeDoc && (!(Build.BTypes & ~BrowserType.Chrome)
          || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
        ? D.fullscreenElement : D.webkitFullscreenElement) || D, isD = box === D,
    querySelectorAll = Build.BTypes & ~BrowserType.Firefox
      ? isD ? D.querySelectorAll : Element.prototype.querySelectorAll : box.querySelectorAll;
    wantClickable && Sc.getScale_();
    let list: HintsNS.ElementList | null = querySelectorAll.call(box, query);
    if (!wholeDoc && a.tooHigh_ && isD && list.length >= GlobalConsts.LinkHintPageHeightLimitToCheckViewportFirst) {
      list = a.getElementsInViewPort_(list);
    }
    const forEach = (list.forEach || output.forEach) as HintsNS.ElementIterator<Hint | Element>;
    forEach.call(list, filter, output);
    if (wholeDoc) {
      // this requires not detecting scrollable elements if wholeDoc
      if (!(Build.NDEBUG || filter !== a.GetClickable_)) {
        console.log("Assert error: `filter !== VHints.GetClickable_` in VHints.traverse_");
      }
      return output;
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0
        && output.length === 0 && !matchAll && a.queryInDeep_ === DeepQueryType.NotDeep && !a.tooHigh_) {
      a.queryInDeep_ = DeepQueryType.InDeep;
      if (a.getDeepDescendantCombinator_()) {
        forEach.call(
          querySelectorAll.call(box, a.getDeepDescendantCombinator_() + key), filter, output);
      }
    }
    list = null;
    const uiRoot = VDom.UI.UI;
    if (uiRoot
        && ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          || uiRoot !== VDom.UI.box_)
        && !notWantVUI
        && ( !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0)
          || (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          || uiRoot.mode === "closed"
          || !matchAll && a.queryInDeep_ !== DeepQueryType.InDeep)
        ) {
      const d = VDom, z = d.dbZoom_, bz = d.bZoom_, notHookScroll = Sc.scrolled_ === 0;
      if (bz !== 1 && isD) {
        d.dbZoom_ = z / bz;
        d.prepareCrop_();
      }
      forEach.call(
        (uiRoot as ShadowRoot).querySelectorAll(key), filter, output);
      d.dbZoom_ = z;
      if (notHookScroll) {
        Sc.scrolled_ = 0;
      }
    }
    Sc.scrolled_ === 1 && Sc.supressScroll_();
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
  getElementsInViewPort_ (list: HintsNS.ElementList): HintsNS.ElementList {
    const result: Element[] = [], height = innerHeight;
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
  detectMore_<T extends Hint | Element> (element: SafeHTMLElement, func: HintsNS.Filter<T>, dest: T[]): boolean | void {
    ([].forEach as HintsNS.ElementIterator<T>).call(
      (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
          && VDom.cache_.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
        ? element.webkitShadowRoot as ShadowRoot : element.shadowRoot as ShadowRoot).querySelectorAll("*"),
      func, dest);
  },
  deduplicate_ (list: Hint[]): void {
    let j = list.length, i: number, k: ClickType, s: string;
    while (0 < --j) {
      k = list[i = j][2];
      if (k === ClickType.codeListener) {
        if (VDom.hasTag_need_safe_(list[j][0] as Exclude<Hint[0], SVGElement>, "div")
            && ++i < list.length
            && (s = list[i][0].tagName.toLowerCase(), s === "div" || s === "a")) {
          const prect = list[j][1], crect = list[i][1];
          if (crect[0] < prect[0] + /* icon_16 */ 18 && crect[1] < prect[1] + 9
              && crect[0] > prect[0] - 4 && crect[1] > prect[1] - 4 && crect[3] > prect[3] - 9
              && (s !== "a" || list[j][0].contains(list[i][0]))) {
            // the `<a>` is a single-line box's most left element and the first clickable element,
            // so think the box is just a layout container
            // for [i] is `<div>`, not limit the height of parent `<div>`,
            // if there's more content, it should have hints for itself
            list.splice(j, 1);
          }
        }
        continue;
      } else if (k !== ClickType.classname) { /* empty */ }
      else if ((k = list[--j][2]) > ClickType.frame || !this._isDescendant(list[i][0], list[j][0])) {
        continue;
      } else if (VDom.isContaining_(list[j][1], list[i][1])) {
        list.splice(i, 1);
        continue;
      } else if (k < ClickType.attrListener || j === 0) {
        continue;
      }
      for (; 0 < j && j > i - 3
            && (k = list[j - 1][2]) > ClickType.MaxNotWeak && k < ClickType.MinNotWeak
            && this._isDescendant(list[j][0], list[j - 1][0])
          ; j--) { /* empty */ }
      if (j < i) {
        list.splice(j, i - j);
      }
    }
    while (list.length && (list[0][0] === document.documentElement || list[0][0] === document.body)) {
      list.shift();
    }
  },
  _isDescendant (d: Element, p: Hint[0]): boolean {
    // Note: currently, not compute normal shadowDOMs / even <slot>s (too complicated)
    let i = 3, c: EnsuredMountedElement | null | undefined, f: Node | null;
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
    for (; ; ) {
      if (c.childElementCount !== 1 || ((f = c.firstChild) instanceof Text && f.data.trim())) { return false; }
      if (i === 2) { break; }
      c = c.firstElementChild; i++;
    }
    return true;
  },
  frameNested_: false as HintsNS.NestedFrame,
  checkNestedFrame_ (output?: Hint[]): void {
    const res = output && output.length > 1 ? null : !frames.length ? false
      : (!(Build.BTypes & ~BrowserType.Firefox) ? fullScreen
          : !(Build.BTypes & ~BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
          ? document.fullscreenElement : document.webkitIsFullScreen)
      ? 0 : this._getNestedFrame(output);
    this.frameNested_ = res === false && document.readyState === "complete" ? null : res;
  },
  _getNestedFrame (output?: Hint[]): HintsNS.NestedFrame {
    if (output == null) {
      if (!VDom.isHTML_()) { return false; }
      output = [];
      type Iter = HintsNS.ElementIterator<Hint>;
      (output.forEach as {} as Iter).call(
        document.querySelectorAll("a,button,input,frame,iframe"), this.GetClickable_, output);
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
    const a = this;
    let _i: number = a.mode1_;
    const
    visibleElements = _i === HintMode.DOWNLOAD_IMAGE || _i === HintMode.OPEN_IMAGE
      ? a.traverse_("a[href],img[src],[data-src],div[style],span[style]", a.GetImages_, true)
      : _i >= HintMode.min_link_job && _i <= HintMode.max_link_job ? a.traverse_("a", a.GetLinks_)
      : a.traverse_("*", _i === HintMode.FOCUS_EDITABLE ? a.GetEditable_ : a.GetClickable_
          );
    a.maxLeft_ = view[2], a.maxTop_ = view[3], a.maxRight_ = view[4];
    if (a.maxRight_ > 0) {
      _i = Math.ceil(Math.log(visibleElements.length) / Math.log(a.alphabetHints_.chars_.length));
      a.maxLeft_ -= 16 * _i + 12;
    }
    visibleElements.reverse();

    const obj = [null as never, null as never] as [Rect[], Rect], func = VDom.SubtractSequence_.bind(obj);
    let r2 = null as Rect[] | null, t: Rect, reason: ClickType, visibleElement: Hint;
    for (let _len = visibleElements.length, _j = Math.max(0, _len - 16); 0 < --_len; ) {
      _j > 0 && --_j;
      visibleElement = visibleElements[_len];
      if (visibleElement[2] > ClickType.MaxNotBox) { continue; }
      let r = visibleElement[1];
      for (_i = _len; _j <= --_i; ) {
        t = visibleElements[_i][1];
        if (r[3] <= t[1] || r[2] <= t[0] || r[0] >= t[2] || r[1] >= t[3]) { continue; }
        if (visibleElements[_i][2] > ClickType.MaxNotBox) { continue; }
        obj[0] = []; obj[1] = t;
        r2 !== null ? r2.forEach(func) : func(r);
        if ((r2 = obj[0]).length === 0) { break; }
      }
      if (r2 === null) { continue; }
      if (r2.length > 0) {
        t = r2[0];
        t[1] > a.maxTop_ && t[1] > r[1] || t[0] > a.maxLeft_ && t[0] > r[0] ||
          r2.length === 1 && (t[3] - t[1] < 3 || t[2] - t[0] < 3) || (visibleElement[1] = t);
      } else if ((reason = visibleElement[2]) > ClickType.MaxNotWeak && reason < ClickType.MinNotWeak
          && visibleElement[0].contains(visibleElements[_i][0])) {
        visibleElements.splice(_len, 1);
      } else {
        visibleElement.length > 3 && (r = (visibleElement as Hint4)[3][0]);
        for (let _k = _len; _i <= --_k; ) {
          t = visibleElements[_k][1];
          if (r[0] >= t[0] && r[1] >= t[1] && r[0] < t[0] + 10 && r[1] < t[1] + 8) {
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
  onKeydown_ (event: KeyboardEvent): HandlerResult {
    const a = this;
    let linksMatched: HintsNS.LinksMatched, i: number;
    if (event.repeat || !a.isActive_) {
      // NOTE: should always prevent repeated keys.
    } else if (VKey.isEscape_(event)) {
      a.clean_();
    } else if ((i = event.keyCode) === kKeyCode.esc) {
      return HandlerResult.Suppress;
    } else if (i === kKeyCode.ime) {
      a.clean_(1);
      VHud.tip_("LinkHints exits because you're inputting");
      return HandlerResult.Nothing;
    } else if (i > kKeyCode.f1 && i <= kKeyCode.f12) {
      a.ResetMode_();
      if (i !== kKeyCode.f2) { return HandlerResult.Nothing; }
      i = VKey.getKeyStat_(event);
      let deep = a.queryInDeep_, reinit = true;
      if (i & KeyStat.shiftKey) {
        if (i & ~KeyStat.shiftKey) {
          reinit = !!VEvent.execute_;
          if (reinit) {
            (VEvent as EnsureNonNull<VEventModeTy>).execute_(kContentCmd.FindAllOnClick);
          }
        } else {
          a.isClickListened_ = !a.isClickListened_;
        }
      } else if (i === KeyStat.plain) {
        if ((Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinNoShadowDOMv0) {
          reinit = deep !== DeepQueryType.NotAvailable;
          a.queryInDeep_ = DeepQueryType.InDeep - deep;
        }
      } else if (i === KeyStat.ctrlKey || (i === kKeyCode.metaKey && VDom.cache_.m)) {
        if ((Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinNoShadowDOMv0) {
          reinit = deep === DeepQueryType.NotDeep;
          a.queryInDeep_ = DeepQueryType.InDeep;
        }
      } else if (i === KeyStat.altKey) {
        reinit = (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement)
          || typeof HTMLDialogElement === "function"; // safe enough even if it's an <embed>
        a.dialogMode_ = reinit && !a.dialogMode_;
      } else {
        reinit = false;
      }
      reinit && setTimeout(a._reinit.bind(a, null, null), 0);
    } else if (i === kKeyCode.shiftKey || i === kKeyCode.ctrlKey || i === kKeyCode.altKey
        || (i === kKeyCode.metaKey && VDom.cache_.m)) {
      const mode = a.mode_,
      mode2 = i === kKeyCode.altKey
        ? mode < HintMode.min_disable_queue
          ? ((mode >= HintMode.min_job ? HintMode.empty : HintMode.newTab) | mode) ^ HintMode.queue : mode
        : mode < HintMode.min_job
          ? i === kKeyCode.shiftKey ? (mode | HintMode.focused) ^ HintMode.mask_focus_new
          : (mode | HintMode.newTab) ^ HintMode.focused
        : mode;
      if (mode2 !== mode) {
        a.setMode_(mode2);
        i = VKey.getKeyStat_(event);
        (i & (i - 1)) || (a.lastMode_ = mode);
      }
    } else if (i <= kKeyCode.down && i >= kKeyCode.pageup) {
      VEvent.scroll_(event);
      a.ResetMode_();
    } else if (i === kKeyCode.space) {
      a.zIndexes_ === false || a.rotateHints_(event.shiftKey);
      event.shiftKey && a.ResetMode_();
    } else if (!(linksMatched
        = a.alphabetHints_.matchHintsByKey_(a.hints_ as HintsNS.HintItem[], event, a.keyStatus_))) {
      if (linksMatched === false) {
        a.tooHigh_ = null;
        setTimeout(a._reinit.bind(a, null, null), 0);
      }
    } else if (linksMatched.length === 0) {
      a.deactivate_(a.keyStatus_.known_);
    } else if (linksMatched.length === 1) {
      VKey.prevent_(event);
      /** safer; necessary for {@link #VHints._highlightChild} */
      VEvent.keydownEvents_()[i] = 1;
      a.keyCode_ = i;
      a.execute_(linksMatched[0]);
    } else {
      a.hideSpans_(linksMatched);
    }
    return HandlerResult.Prevent;
  },
  hideSpans_ (linksMatched: HintsNS.HintItem[]): void {
    const limit = this.keyStatus_.tab_ ? 0 : this.keyStatus_.newHintLength_;
    let newClass: string;
    for (const { marker_: { childNodes: ref } } of linksMatched) {
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/dom_token_list.cc?q=DOMTokenList::setValue&g=0&l=258
// shows that `.classList.add()` costs more
      for (let j = ref.length - 1; 0 <= --j; ) {
        newClass = j < limit ? "MC" : "";
        (ref[j] as Exclude<HintsNS.MarkerElement, Text>).className !== newClass &&
        ((ref[j] as Exclude<HintsNS.MarkerElement, Text>).className = newClass);
      }
    }
  },
  getDeepDescendantCombinator_: Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinNoShadowDOMv0 ? function (this: {}): string {
    let v0 = "* /deep/ ";
    try {
      document.querySelector(v0 + "html");
    } catch {
      (this as typeof VHints).queryInDeep_ = DeepQueryType.NotAvailable;
      v0 = "";
    }
    (this as typeof VHints).getDeepDescendantCombinator_ = () => v0;
    return v0;
  } : 0 as never,
  ResetMode_ (): void {
    if (VHints.mode_ >= HintMode.min_disable_queue || VHints.lastMode_ === VHints.mode_) { return; }
    const d = VEvent.keydownEvents_();
    if (d[kKeyCode.ctrlKey] || d[kKeyCode.metaKey] || d[kKeyCode.shiftKey] || d[kKeyCode.altKey]) {
      return VHints.setMode_(VHints.lastMode_);
    }
  },
  resetHints_ (): void {
    let ref = this.hints_, i = 0, len = ref ? ref.length : 0;
    this.hints_ = this.zIndexes_ = null;
    this.pTimer_ > 0 && clearTimeout(this.pTimer_);
    while (i < len) { (ref as HintsNS.HintItem[])[i++].target_ = null as never; }
  },
  execute_ (hint: HintsNS.HintItem): void {
    const a = this;
    let rect: Rect | null | undefined, clickEl: HintsNS.LinkEl | null = hint.target_;
    a.resetHints_();
    const str = (a.modeOpt_ as HintsNS.ModeOpt)[a.mode_] as string;
    (VHud as Writable<VHUDTy>).text_ = str; // in case pTimer > 0
    if (VDom.isInDOM_(clickEl)) {
      // must get outline first, because clickEl may hide itself when activated
      // must use UI.getRect, so that VDom.zooms are updated, and prepareCrop is called
      rect = VDom.UI.getRect_(clickEl, hint.refer_ !== clickEl ? hint.refer_ as HTMLElementUsingMap | null : null);
      const showRect = (a.modeOpt_ as HintsNS.ModeOpt).execute_.call(a, clickEl, rect, hint);
      if (showRect !== false && (rect || (rect = VDom.getVisibleClientRect_(clickEl)))) {
        setTimeout(function (): void {
          (showRect || document.hasFocus()) && VDom.UI.flash_(null, rect as Rect);
        }, 17);
      }
    } else {
      clickEl = null;
      VHud.tip_("The link has been removed from page", 2000);
    }
    a.pTimer_ = -(VHud.text_ !== str);
    if (!(a.mode_ & HintMode.queue)) {
      a._setupCheck(clickEl, null);
      return a.deactivate_(0);
    }
    a.isActive_ = false;
    a._setupCheck();
    setTimeout(function (): void {
      const _this = VHints;
      _this._reinit(clickEl, rect);
      if (1 === --_this.count_ && _this.isActive_) {
        return _this.setMode_(_this.mode1_);
      }
    }, 18);
  },
  _reinit (lastEl?: HintsNS.LinkEl | null, rect?: Rect | null): void {
    const a = this, events = VEvent;
    if (events.keydownEvents_(Build.BTypes & BrowserType.Firefox ? events.keydownEvents_() : events)) {
      a.clean_();
      return;
    }
    a.isActive_ = false;
    a.keyStatus_.tab_ = 0;
    a.zIndexes_ = null;
    a.resetHints_();
    const isClick = a.mode_ < HintMode.min_job;
    a.activate_(0, a.options_);
    a._setupCheck(lastEl, rect, isClick);
  },
  _setupCheck (el?: HintsNS.LinkEl | null, r?: Rect | null, isClick?: boolean): void {
    this.timer_ && clearTimeout(this.timer_);
    this.timer_ = el && (isClick === true || this.mode_ < HintMode.min_job) ? setTimeout(function (i): void {
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i ||
      VHints && VHints._CheckLast(el, r);
    }, 255) : 0;
  },
  _CheckLast (this: void, el: HintsNS.LinkEl, r?: Rect | null): void {
    const _this = VHints;
    if (!_this) { return; }
    _this.timer_ = 0;
    const r2 = VDom.getBoundingClientRect_(el),
    hidden = r2.width < 1 && r2.height < 1 || getComputedStyle(el).visibility !== "visible";
    if (hidden && VDom.lastHovered_ === el) {
      VDom.lastHovered_ = null;
    }
    if (r && _this.isActive_ && (_this.hints_ as HintsNS.HintItem[]).length < 64
        && !_this.alphabetHints_.hintKeystroke_
        && (hidden || Math.abs(r2.left - r[0]) > 100 || Math.abs(r2.top - r[1]) > 60)) {
      return _this._reinit();
    }
  },
  clean_ (keepHUD?: boolean | BOOL): void {
    const a = this;
    const ks = a.keyStatus_, alpha = a.alphabetHints_;
    a.options_ = a.modeOpt_ = a.zIndexes_ = a.hints_ = null as never;
    a.pTimer_ > 0 && clearTimeout(a.pTimer_);
    a.lastMode_ = a.mode_ = a.mode1_ = a.count_ = a.pTimer_ =
    a.maxLeft_ = a.maxTop_ = a.maxRight_ =
    ks.tab_ = ks.newHintLength_ = ks.known_ = alpha.countMax_ = 0;
    a.keyCode_ = kKeyCode.None;
    alpha.hintKeystroke_ = alpha.chars_ = "";
    a.isActive_ = a.noHUD_ = a.tooHigh_ = false;
    VKey.removeHandler_(a);
    VEvent.onWndBlur_(null);
    if (a.box_) {
      a.box_.remove();
      a.box_ = null;
    }
    keepHUD || VHud.hide_();
  },
  deactivate_ (isLastKeyKnown: BOOL): void {
    this.clean_(this.pTimer_ < 0);
    (<RegExpOne> /0?/).test("");
    VKey.suppressTail_(isLastKeyKnown ? 0 : VDom.cache_.keyboard[0]);
  },
  rotateHints_ (reverse?: boolean): void {
    const a = this;
    let ref = a.hints_ as HintsNS.HintItem[], stacks = a.zIndexes_;
    if (!stacks) {
      stacks = [] as HintsNS.Stacks;
      ref.forEach(a.MakeStacks_, [[], stacks] as [Array<ClientRect | null>, HintsNS.Stacks]);
      stacks = stacks.filter(stack => stack.length > 1);
      if (stacks.length <= 0) {
        a.zIndexes_ = a.keyStatus_.newHintLength_ <= 0 ? false : null;
        return;
      }
      a.zIndexes_ = stacks;
    }
    for (const stack of stacks) {
      reverse && stack.reverse();
      const i = stack[stack.length - 1];
      let oldI = ref[i].zIndex_ || i;
      for (const j of stack) {
        const hint = ref[j], {style} = hint.marker_, newI = hint.zIndex_ || j;
        style.zIndex = (hint.zIndex_ = oldI) as number | string as string;
        oldI = newI;
      }
      reverse && stack.reverse();
    }
  },
  MakeStacks_ (this: [Array<ClientRect | null>, HintsNS.Stacks], hint: HintsNS.HintItem, i: number) {
    let rects = this[0];
    if (hint.marker_.style.visibility === "hidden") { rects.push(null); return; }
    const stacks = this[1], m = hint.marker_.getClientRects()[0];
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

alphabetHints_: {
  chars_: "",
  hintKeystroke_: "",
  countMax_: 0,
  countLimit_: 0,
  numberToHintString_ (num: number): string {
    const characterSet = this.chars_, base = characterSet.length;
    let hintString = "";
    do {
      let remainder = num % base;
      num = (num / base) | 0;
      hintString = characterSet[remainder] + hintString;
    } while (num > 0);
    num = this.countMax_ - hintString.length - +(num < this.countLimit_);
    if (num > 0) {
      hintString = (Build.MinCVer >= BrowserVer.MinSafe$String$$StartsWith
              || !(Build.BTypes & BrowserType.Chrome)
          ? (characterSet[0] as Ensure<string, "repeat">).repeat(num)
          : (this as Ensure<typeof VHints.alphabetHints_, "repeat_">).repeat_(characterSet[0], num)
        ) + hintString;
    }
    return hintString;
  },
  initMarkers_ (hintItems: HintsNS.HintItem[]): void {
    const a = this;
    a.hintKeystroke_ = "";
    for (let end = hintItems.length, hints = a.buildHintIndexes_(end), h = 0; h < end; h++) {
      const hint = hintItems[h], marker = hint.marker_,
      hintString = hint.key_ = a.numberToHintString_(hints[h]), last = hintString.length - 1;
      for (let i = 0; i < last; i++) {
        const node = document.createElement("span");
        node.textContent = hintString[i];
        marker.appendChild(node);
      }
      marker.insertAdjacentText("beforeend", hintString[last]);
    }
    a.countMax_ -= (a.countLimit_ > 0) as boolean | number as number;
    a.countLimit_ = 0;
  },
  buildHintIndexes_ (linkCount: number): number[] {
    const hints: number[] = [], result: number[] = [], len = this.chars_.length, count = linkCount, start = count % len;
    let i = this.countMax_ = Math.ceil(Math.log(count) / Math.log(len)), max = count - start + len
      , end = this.countLimit_ = ((Math.pow(len, i) - count) / (len - 1)) | 0;
    for (i = 0; i < end; i++) {
      hints.push(i);
    }
    for (end *= len - 1; i < count; i++) {
      hints.push(i + end);
    }
    for (i = 0; i < len; i++) {
      if (i === start) { max -= len; }
      for (let j = i; j < max; j += len) {
        result.push(hints[j]);
      }
    }
    return result;
  },
  matchHintsByKey_ (hints: HintsNS.HintItem[], e: KeyboardEvent, keyStatus: HintsNS.KeyStatus): HintsNS.LinksMatched {
    const a = this;
    let keyChar: string, key = e.keyCode, arr = null as HintsNS.HintItem[] | null;
    if (key === kKeyCode.tab) {
      if (!a.hintKeystroke_) {
        return false;
      }
      keyStatus.tab_ = (1 - keyStatus.tab_) as BOOL;
    } else if (keyStatus.tab_) {
      a.hintKeystroke_ = "";
      keyStatus.tab_ = 0;
    }
    keyStatus.known_ = 1;
    if (key === kKeyCode.tab) { /* empty */ }
    else if (key === kKeyCode.backspace || key === kKeyCode.deleteKey || key === kKeyCode.f1) {
      if (!a.hintKeystroke_) {
        return [];
      }
      a.hintKeystroke_ = a.hintKeystroke_.slice(0, -1);
    } else if ((keyChar = VKey.char_(e).toUpperCase()) && keyChar.length === 1
        && (keyChar = VHints.options_.mapKey ? VEvent.mapKey_(keyChar) : keyChar).length === 1) {
      if (a.chars_.indexOf(keyChar) === -1) {
        return [];
      }
      a.hintKeystroke_ += keyChar;
      arr = [];
    } else {
      return null;
    }
    keyChar = a.hintKeystroke_;
    keyStatus.newHintLength_ = keyChar.length;
    keyStatus.known_ = 0;
    VHints.zIndexes_ && (VHints.zIndexes_ = null);
    const wanted = !keyStatus.tab_;
    if (arr !== null && keyChar.length >= a.countMax_) {
      hints.some(function (hint): boolean {
        return hint.key_ === keyChar && ((arr as HintsNS.HintItem[]).push(hint), true);
      });
      if (arr.length === 1) { return arr; }
    }
    return hints.filter(function (hint) {
      const pass = (hint.key_ as string).startsWith(keyChar) === wanted;
      hint.marker_.style.visibility = pass ? "" : "hidden";
      return pass;
    });
  },
  repeat_: !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinSafe$String$$StartsWith ? 0 as never
      : function (this: void, s: string, n: number): string {
    if (s.repeat) { return s.repeat(n); }
    for (var s2 = s; --n; ) { s2 += s; }
    return s2;
  }
},

decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
  try { url = (decode || decodeURI)(url); } catch {}
  return url;
},
jsRe_: <RegExpI & RegExpOne> /^javascript:/i,
_imageUrlRe: <RegExpI & RegExpOne> /\.(?:bmp|gif|icon?|jpe?g|png|svg|tiff?|webp)\b/i,
isImageUrl_ (str: string | null): boolean {
  if (!str || str[0] === "#" || str.length < 5 || str.startsWith("data:") || this.jsRe_.test(str)) {
    return false;
  }
  const end = str.lastIndexOf("#") + 1 || str.length;
  // tslint:disable-next-line: ban-types
  str = (str as EnsureNonNull<String>).substring(str.lastIndexOf("/", str.lastIndexOf("?") + 1 || end), end);
  return this._imageUrlRe.test(str);
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
/** return: img is HTMLImageElement | HTMLAnchorElement */
_getImageUrl (img: SafeHTMLElement, forShow?: 1): string | void {
  let text: string | null, src = img.dataset.src || "";
  if (VDom.hasTag_need_safe_(img, "img")) {
    text = img.currentSrc || img.getAttribute("src") && (img as HTMLImageElement).src;
  } else {
    text = VDom.hasTag_need_safe_(img, "a") ? img.getAttribute("href") && img.href : "";
    if (!this.isImageUrl_(text)) {
      let arr = (<RegExpI> /^url\(\s?['"]?((?:\\['"]|[^'"])+?)['"]?\s?\)/i).exec(img.style.backgroundImage as string);
      if (arr && arr[1]) {
        const a1 = document.createElement("a");
        a1.href = arr[1].replace(<RegExpG> /\\(['"])/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || forShow && text.startsWith("data:") || this.jsRe_.test(text)
      || src.length > text.length + 7 && (text === (img as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  return text || VHud.tip_("Not an image", 1000);
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
  VPort.post_(opt);
},
_highlightChild (el: HTMLIFrameElement | HTMLFrameElement): false | void {
  let err: boolean | null = true, childEvents: VEventModeTy | undefined,
  core: ContentWindowCore | void | undefined | 0;
  try {
    err = !el.contentDocument
        || !(core = Build.BTypes & BrowserType.Firefox ? VDom.getWndCore_(el.contentWindow) : el.contentWindow)
        || !(childEvents = core.VEvent)
        || childEvents.keydownEvents_(Build.BTypes & BrowserType.Firefox ? VEvent.keydownEvents_() : VEvent);
  } catch (e) {
    if (!Build.NDEBUG) {
      let notDocError = true;
      if (Build.BTypes & BrowserType.Chrome && VDom.cache_.v < BrowserVer.Min$ContentDocument$NotThrow) {
        try {
          notDocError = el.contentDocument !== undefined;
        } catch { notDocError = false; }
      }
      if (notDocError) {
        console.log("Assert error: Child frame check breaks:", e);
      }
    }
  }
  const { count_: count, options_: options } = this;
  options.mode = this.mode_;
  el.focus();
  if (err) {
    VPort.send_(kFgReq.execInChild, {
      u: el.src, c: kFgCmd.linkHints, n: count, k: this.keyCode_, a: options
    }, function (res): void {
      if (!res) {
        el.contentWindow.focus();
      }
    });
    return;
  }
  (childEvents as NonNullable<typeof childEvents>).focusAndRun_(kFgCmd.linkHints, count, options, 1);
  return false;
},

Modes_: [
{
  128: "Hover over node",
  192: "Hover over nodes continuously",
  execute_ (element, rect): void {
    const type = VDom.getEditableType_<0>(element);
    // here not check VDom.lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    VScroller.current_ = element;
    VDom.hover_(element, VDom.center_(rect));
    type || element.tabIndex < 0 ||
    (<RegExpI> /^i?frame$/).test(VDom.htmlTag_(element)) && element.focus && element.focus();
    const a = this as typeof VHints;
    if (a.mode_ < HintMode.min_job) {
      return VHud.tip_("Hover for scrolling", 1000);
    }
    const toggleMap = a.options_.toggle;
    if (!toggleMap || typeof toggleMap !== "object") { return; }
    VKey.safer_(toggleMap);
    let ancestors: Element[] = [], topest: Element | null = element, re = <RegExpOne> /^-?\d+/;
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
      while (up && up + 1 >= ancestors.length && topest) {
        ancestors.push(topest);
        topest = VDom.GetParent_(topest, PNType.RevealSlotAndGotoParent);
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
} as HintsNS.ModeOpt,
{
  129: "Simulate mouse leaving link",
  193: "Simulate mouse leaving continuously",
  execute_ (this: void, element: SafeHTMLElement | SVGElement): void {
    const a = VDom;
    if (a.lastHovered_ !== element) {
      a.hover_(null);
    }
    a.lastHovered_ = element;
    a.hover_(null);
    if (document.activeElement === element) { element.blur(); }
  }
} as HintsNS.ModeOpt,
{
  130: "Copy link text to Clipboard",
  131: "Search selected text",
  137: "Copy link URL to Clipboard",
  194: "Copy link text one by one",
  195: "Search link text one by one",
  201: "Copy link URL one by one",
  256: "Edit link URL on Vomnibar",
  257: "Edit link text on Vomnibar",
  execute_ (link): void {
    const a = this as typeof VHints;
    let isUrl = a.mode1_ >= HintMode.min_link_job && a.mode1_ <= HintMode.max_link_job, str: string | null | undefined;
    if (isUrl) {
      str = a.getUrlData_(link as HTMLAnchorElement);
      str.length > 7 && str.toLowerCase().startsWith("mailto:") && (str = str.slice(7).trimLeft());
    }
    /** Note: SVGElement::dataset is only since `BrowserVer.Min$SVGElement$$dataset` */
    else if ((str = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$SVGElement$$dataset
          ?  link.getAttribute("data-vim-text") : (link.dataset as NonNullable<typeof link.dataset>).vimText)
        && (str = str.trim())) { /* empty */ }
    else {
      const tag = VDom.htmlTag_(link);
      if (tag === "input") {
        let type = (link as HTMLInputElement).type, f: HTMLInputElement["files"];
        if (type === "password") {
          return VHud.tip_("Sorry, Vimium C won't copy a password.", 2000);
        }
        if (!VDom.uneditableInputs_[type]) {
          str = ((link as HTMLInputElement).value || (link as HTMLInputElement).placeholder).trim();
        } else if (type === "file") {
          str = (f = (link as HTMLInputElement).files) && f.length > 0 ? f[0].name : "";
        } else if ("button image submit reset".indexOf(type) >= 0) {
          str = (link as HTMLInputElement).value.trim();
        }
      } else {
        str = tag === "textarea" ? (link as HTMLTextAreaElement).value
          : tag === "select" ? ((link as HTMLSelectElement).selectedIndex < 0
              ? "" : (link as HTMLSelectElement).options[(link as HTMLSelectElement).selectedIndex].text)
          : tag && (str = (link as SafeHTMLElement).innerText.trim(),
              str.length > 7 && str.slice(0, 7).toLowerCase() === "mailto:" ? str.slice(7).trimLeft() : str)
            || (str = link.textContent.trim()) && str.replace(<RegExpG> /\s+/g, " ")
          ;
      }
      if (!str && tag) {
        str = ((link as SafeHTMLElement).title.trim() || link.getAttribute("aria-label") || "").trim();
      }
    }
    if (!str) {
      return VHud.copied_("", isUrl ? "url" : "");
    }
    if (a.mode_ >= HintMode.min_edit && a.mode_ <= HintMode.max_edit) {
      let newtab = a.options_.newtab;
      newtab == null && (newtab = a.options_.force);
      // this frame is normal, so during Vomnibar.activate, checkHidden will only pass (in most cases)
      (VPort as ComplicatedVPort).post_<kFgReq.vomnibar, { c: number } & Partial<VomnibarNS.ContentOptions>>({
        H: kFgReq.vomnibar,
        c: 1,
        newtab: newtab != null ? !!newtab : !isUrl,
        url: str,
        keyword: (a.options_.keyword || "") + ""
      });
      return;
    } else if (a.mode1_ === HintMode.SEARCH_TEXT) {
      a.openUrl_(str);
      return;
    }
    // NOTE: url should not be modified
    // although BackendUtils.convertToUrl does replace '\u3000' with ' '
    str = isUrl ? a.decodeURL_(str) : str;
    VPort.post_({
      H: kFgReq.copy,
      d: str
    });
    VHud.copied_(str);
  }
} as HintsNS.ModeOpt,
{
  138: "Open link in incognito window",
  202: "Open multi incognito tabs",
  execute_ (link: HTMLAnchorElement): void {
    const url = (this as typeof VHints).getUrlData_(link);
    if (!VPort.evalIfOK_(url)) {
      return (this as typeof VHints).openUrl_(url, true);
    }
  }
} as HintsNS.ModeOpt,
{
  132: "Download image",
  196: "Download multiple images",
  execute_ (img: SafeHTMLElement): void {
    let text = (this as typeof VHints)._getImageUrl(img);
    if (!text) { return; }
    const url = text, i = text.indexOf("://"), a = VDom.createElement_("a");
    if (i > 0) {
      text = text.slice(text.indexOf("/", i + 4) + 1);
    }
    if (text.length > 40) {
      text = text.slice(0, 39) + "\u2026";
    }
    a.href = url;
    a.download = (this as typeof VHints).getImageName_(img) || "";
    // todo: how to trigger download
    VDom.mouse_(a, "click", [0, 0]);
    return VHud.tip_("Download: " + text, 2000);
  }
} as HintsNS.ModeOpt,
{
  133: "Open image",
  197: "Open multiple image",
  execute_ (img: SafeHTMLElement): void {
    const a = this as typeof VHints, text = a._getImageUrl(img, 1);
    if (!text) { return; }
    VPort.post_({
      H: kFgReq.openImage,
      r: a.mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      f: a.getImageName_(img),
      u: text,
      a: a.options_.auto
    });
  }
} as HintsNS.ModeOpt,
{
  136: "Download link",
  200: "Download multiple links",
  execute_ (this: void, link: HTMLAnchorElement, rect): void {
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
    VDom.UI.click_(link, rect, {
      altKey_: true,
      ctrlKey_: false,
      metaKey_: false,
      shiftKey_: false
    });
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
} as HintsNS.ModeOpt,
{
  134: "Focus node",
  198: "Focus nodes continuously",
  258: "Select an editable area",
  execute_ (link, rect): void | false {
    if ((this as typeof VHints).mode_ < HintMode.min_disable_queue) {
      VDom.view_(link);
      link.focus();
      VDom.UI.flash_(link);
    } else {
      VDom.UI.simulateSelect_(link, rect, true);
    }
    return false;
  }
} as HintsNS.ModeOpt,
{
  0: "Open link in current tab",
  2: "Open link in new tab",
  3: "Open link in new active tab",
  64: "Open multiple links in current tab",
  66: "Open multiple links in new tabs",
  67: "Activate link and hold on",
  execute_ (link, rect, hint): void | boolean {
    const a = this as typeof VHints, tag = VDom.htmlTag_(link);
    if ((<RegExpOne> /^i?frame$/).test(tag)) {
      const highlight = link !== VOmni.box_;
      highlight ? a._highlightChild(link as HTMLIFrameElement | HTMLFrameElement) : VOmni.focus_();
      a.mode_ = HintMode.DEFAULT;
      return highlight;
    }
    const { UI } = VDom;
    if (tag === "details") {
      const summary = VDom.findMainSummary_(link as HTMLDetailsElement);
      if (summary) {
          // `HTMLSummaryElement::DefaultEventHandler(event)` in
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_summary_element.cc?l=109
          rect = (link as HTMLDetailsElement).open || !rect ? VDom.getVisibleClientRect_(summary) : rect;
          UI.click_(summary, rect, null, true);
          rect && UI.flash_(null, rect);
          return false;
      }
      (link as HTMLDetailsElement).open = !(link as HTMLDetailsElement).open;
      return;
    } else if (hint.refer_ && hint.refer_ === link) {
      return a.Modes_[0].execute_.call(a, link, rect, hint);
    } else if (VDom.getEditableType_<0>(link) >= EditableType.Editbox) {
      UI.simulateSelect_(link, rect, true);
      return false;
    }
    const mode = a.mode_ & HintMode.mask_focus_new, notMac = !VDom.cache_.m, newTab = mode >= HintMode.newTab,
    isRight = a.options_.button === "right";
    UI.click_(link, rect, {
      altKey_: false,
      ctrlKey_: newTab && notMac,
      metaKey_: newTab && !notMac,
      shiftKey_: mode === HintMode.OPEN_IN_NEW_FG_TAB
    }, mode > 0 || link.tabIndex >= 0
    , isRight ? 2 : 0
    , !(Build.BTypes & BrowserType.Chrome) || isRight || mode ? 0 : a.options_.touch);
  }
} as HintsNS.ModeOpt
]
};
