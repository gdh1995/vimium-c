const enum ClickType {
  Default = 0,
  click = Default, edit, listener,
  classname = 4, tabindex,
  maxNotBox = 6, minBox = maxNotBox + 1,
  frame = minBox, scrollX, scrollY,
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
    execute_ (this: {}, linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintsNS.HintItem, "refer">): void | boolean;
  }
  interface Options extends SafeObject {
    action?: string;
    mode?: string | number;
    url?: boolean;
    keyword?: string;
    newtab?: boolean;
    toggle?: {
      [selector: string]: string;
    };
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
  isActive_: false,
  noHUD_: false,
  options_: null as never as HintsNS.Options,
  timer_: 0,
  run (this: void, count: number, options: FgOptions): void {
    const a = VHints;
    if (a.isActive_) { return; }
    if (VEvent.checkHidden_(kFgCmd.linkHints, count, options)) {
      return a.clean_();
    }
    VUtils.remove_(a);
    if (document.body === null) {
      a.clean_();
      if (!a.timer_ && document.readyState === "loading") {
        VUtils.push_(VDom.UI.SuppressMost_, a);
        a.timer_ = setTimeout(a.run.bind(a as never, count, options), 300);
        return;
      }
      if (!VDom.isHTML_()) { return; }
    }
    a.setModeOpt_((count as number) | 0, options);
    let str = options.characters ? options.characters + "" : VUtils.cache_.linkHintCharacters;
    if (str.length < 3) {
      a.clean_(1);
      return VHUD.tip_("Characters for LinkHints are too few.", 1000);
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
      if (a.tryNestedFrame_("VHints", "run", (count as number) | 0, options)) {
        return a.clean_();
      }
    }
    if (elements.length === 0) {
      a.clean_(1);
      return VHUD.tip_("No links to select.", 1000);
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
    VUtils.push_(a.onKeydown_, a);
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
    return VHUD.show_((a.modeOpt_ as HintsNS.ModeOpt)[a.mode_] + msg, true);
  },
  SetHUDLater_ (this: void): void {
    const a = VHints;
    if (a && a.isActive_) { a.pTimer_ = 0; return a.setMode_(a.mode_); }
  },
  ActivateAndFocus_ (this: void, a: number, b: FgOptions): void {
    return VEvent.focusAndListen_(() => {
      VHints.isActive_ = false;
      VHints.run(a, b);
    });
  },
  tryNestedFrame_ (mode: "VHints" | "VScroller" | "VOmni", action: "run" | "Sc"
      , count: number, options: SafeObject): boolean {
    const a = this;
    if (a.frameNested_ !== null) {
      mode !== "VHints" && VDom.prepareCrop_();
      a.checkNestedFrame_();
    }
    interface VWindow extends Window {
      VHints: typeof VHints;
      VScroller: typeof VScroller;
      VOmni: typeof VOmni;
      VEvent: VEventModeTy;
      VDom: typeof VDom;
    }
    let frame = a.frameNested_, child: VWindow = null as never, err = true, done = false;
    if (!frame) { return false; }
    try {
      if (frame.contentDocument && (child = frame.contentWindow as VWindow).VDom.isHTML_()) {
        if (mode === "VHints") {
          (done = child.VHints.isActive_) && child.VHints.deactivate_(1);
        }
        err = child.VEvent.keydownEvents_(VEvent.keydownEvents_());
      }
    } catch {}
    if (err) {
      // It's cross-site, or Vimium C on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      a.frameNested_ = null;
      return false;
    }
    child.VEvent.focusAndListen_(done ? null : function (): void {
      return (child[mode as "VHints"])[action as "run"](count, options);
    });
    if (done) { return true; }
    if (document.readyState !== "complete") { a.frameNested_ = false; }
    return true;
  },
  maxLeft_: 0,
  maxTop_: 0,
  maxRight_: 0,
  zIndexes_: null as null | false | HintsNS.Stacks,
  createHint_ (link: Hint): HintsNS.HintItem {
    let marker = VDom.createElement_("span") as HintsNS.HintItem["marker"], i: number;
    i = link.length < 4 ? link[1][0] : (link as Hint4)[3][0][0] + (link as Hint4)[3][1];
    const hint: HintsNS.HintItem = {
      marker, target: link[0],
      key: "",
      refer: link.length > 4 ? (link as Hint5)[4] : null,
    };
    if (link[2] < ClickType.minBox) {
      marker.className = "LH";
    } else {
      marker.className = "LH BH";
      hint.refer = link[0];
    }
    const st = marker.style;
    st.left = i + "px";
    if (i > this.maxLeft_ && this.maxRight_) {
      st.maxWidth = this.maxRight_ - i + "px";
    }
    i = link[1][1];
    st.top = i + "px";
    if (i > this.maxTop_) {
      st.maxHeight = this.maxTop_ - i + GlobalConsts.MaxHeightOfLinkHintMarker + "px";
    }
    return hint;
  },
  adjustMarkers_ (elements: Hint[]): void {
    const zi = VDom.bZoom_, root = VDom.UI.UI;
    let i = elements.length - 1;
    if (!root || elements[i][0] !== VOmni.box_ && !root.querySelector("#HelpDialog")) { return; }
    const z = ("" + 1 / zi).substring(0, 5), arr = this.hints_ as HintsNS.HintItem[],
    mr = this.maxRight_ * zi, mt = this.maxTop_ * zi;
    while (0 <= i && root.contains(elements[i][0])) {
      let st = arr[i--].marker.style;
      Build.BTypes & ~BrowserType.Firefox && (st.zoom = z);
      st.maxWidth && (st.maxWidth = mr - elements[i][1][0] + "px");
      st.maxHeight && (st.maxHeight = mt - elements[i][1][1] + 18 + "px");
    }
  },
  btnRe_: <RegExpOne> /\b(?:[Bb](?:utto|t)n|[Cc]lose)(?:$|\s)/,
  /**
   * Must ensure only call `VScroller.shouldScroll` during `@getVisibleElements`
   */
  GetClickable_ (this: Hint[], element: Element): void {
    let arr: Rect | null, isClickable = null as boolean | null, s: string | null, type = ClickType.Default;
    if (!(element instanceof HTMLElement) || Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(element)) {
      if (element instanceof SVGElement) {
        type = VUtils.clickable_.has(element) || element.getAttribute("onclick")
            || VHints.ngEnabled_ && element.getAttribute("ng-click")
            || (s = element.getAttribute("jsaction")) && VHints.checkJSAction_(s) ? ClickType.listener
          : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 ? ClickType.tabindex
          : type;
        if (type > ClickType.Default && (arr = VDom.getVisibleClientRect_(element))) {
          this.push([element, arr, type]);
        }
      }
      return;
    }
    // according to https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow,
    // elements of the types below should refuse `attachShadow`
    switch ((element.tagName as string).toLowerCase()) {
    case "a": case "details": isClickable = true; break;
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
      if ((element as HTMLTextAreaElement | HTMLInputElement).disabled && VHints.mode1_ <= HintMode.LEAVE) { return; }
      if (!(element as HTMLTextAreaElement | HTMLInputElement).readOnly || VHints.mode_ >= HintMode.min_job
        || element instanceof HTMLInputElement && VDom.uneditableInputs_[element.type]) {
        isClickable = true;
      }
      break;
    case "label":
      if ((element as HTMLLabelElement).control) {
        let el2 = (element as HTMLLabelElement).control as HTMLElement, arr2: Hint[] = [];
        if (el2.getAttribute("disabled")) { return; }
        VHints.GetClickable_.call(arr2, el2);
        isClickable = arr2.length === 0;
      }
      break;
    case "button": case "select":
      isClickable = !(element as HTMLButtonElement | HTMLSelectElement).disabled || VHints.mode1_ > HintMode.LEAVE;
      break;
    case "object": case "embed":
      s = (element as HTMLObjectElement | HTMLEmbedElement).type;
      if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
      if (element instanceof HTMLObjectElement && element.useMap) {
        VDom.getClientRectsForAreas_(element as HTMLObjectElement, this as Hint5[]);
      }
      return;
    case "img":
      if ((element as HTMLImageElement).useMap) {
        VDom.getClientRectsForAreas_(element as HTMLImageElement, this as Hint5[]);
      }
      if ((VHints.forHover_ && !(element.parentNode instanceof HTMLAnchorElement))
        || ((s = element.style.cursor as string) ? s !== "default"
          : (s = getComputedStyle(element).cursor as string) && (s.indexOf("zoom") >= 0 || s.startsWith("url"))
        )) {
        isClickable = true;
      }
      break;
    // elements of the types above should refuse `attachShadow`
    case "div": case "ul": case "pre": case "ol": case "code":
      type = (type = element.clientHeight) && type + 5 < element.scrollHeight ? ClickType.scrollY
        : (type = element.clientWidth) && type + 5 < element.scrollWidth ? ClickType.scrollX : ClickType.Default;
      // no break;
    default:
      if (element.shadowRoot) {
        ([].forEach as HintsNS.ElementIterator<Hint>).call(
          element.shadowRoot.querySelectorAll("*"), VHints.GetClickable_, this);
        return;
      }
    }
    if (isClickable === null) {
      type = (s = element.contentEditable) !== "inherit" && s && s !== "false" ? ClickType.edit
        : (VUtils.clickable_.has(element) && VHints.isClickListened_) || element.getAttribute("onclick")
          || VHints.ngEnabled_ && element.getAttribute("ng-click")
          || (s = element.getAttribute("role")) && (s = s.toLowerCase()
            , s === "button" || s === "link" || s === "tab"
              || s === "checkbox" || s === "radio" || s.startsWith("menuitem"))
          || VHints.forHover_ && element.getAttribute("onmouseover")
          || (s = element.getAttribute("jsaction")) && VHints.checkJSAction_(s) ? ClickType.listener
        : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 ? ClickType.tabindex
        : type > ClickType.tabindex ? type : (s = element.className) && VHints.btnRe_.test(s) ? ClickType.classname
        : ClickType.Default;
    }
    if (!isClickable && type === ClickType.Default) { return; }
    if (element === document.documentElement || element === document.body) { return; }
    if ((arr = VDom.getVisibleClientRect_(element))
        && (type < ClickType.scrollX
          || VScroller.shouldScroll_unsafe_(element as SafeHTMLElement, type - ClickType.scrollX as 0 | 1) > 0)
        && ((s = element.getAttribute("aria-hidden")) == null || s && s.toLowerCase() !== "true")
        && ((s = element.getAttribute("aria-disabled")) == null || (s && s.toLowerCase() !== "true")
          || VHints.mode_ >= HintMode.min_job) // note: might need to apply aria-disable on FOCUS/HOVER/LEAVE mode?
    ) { this.push([element as SafeHTMLElement, arr, type]); }
  },
  noneActionRe_: <RegExpOne> /\._\b(?![\$\.])/,
  checkJSAction_ (str: string): boolean {
    for (let s of str.split(";")) {
      s = s.trim();
      const t = s.startsWith("click:") ? (s = s.substring(6)) : s && s.indexOf(":") === -1 ? s : null;
      if (t && t !== "none" && !this.noneActionRe_.test(t)) {
        return true;
      }
    }
    return false;
  },
  GetEditable_ (this: Hint[], element: Element): void {
    if (!(element instanceof HTMLElement) || Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(element)) { return; }
    let arr: Rect | null, type = ClickType.Default, s: string;
    switch ((element.tagName as string).toLowerCase()) {
    case "input":
      if (VDom.uneditableInputs_[(element as HTMLInputElement).type]) {
        return;
      } // no break;
    case "textarea":
      if ((element as HTMLInputElement | HTMLTextAreaElement).disabled ||
          (element as HTMLInputElement | HTMLTextAreaElement).readOnly) { return; }
      break;
    default:
      if ((s = element.contentEditable) === "inherit" || !s || s === "false") {
        if (element.shadowRoot) {
          ([].forEach as HintsNS.ElementIterator<Hint>).call(
            element.shadowRoot.querySelectorAll("*"), VHints.GetEditable_, this);
        }
        return;
      }
      type = ClickType.edit;
      break;
    }
    if (arr = VDom.getVisibleClientRect_(element)) {
      this.push([element as SafeHTMLElement, arr, type]);
    }
  },
  GetLinks_ (this: Hint[], element: Element): void {
    let a: string | null, arr: Rect | null;
    if (element instanceof HTMLAnchorElement && ((a = element.getAttribute("href")) && a !== "#"
        && !VUtils.jsRe_.test(a)
        || element.dataset.vimUrl != null)) {
      if (arr = VDom.getVisibleClientRect_(element)) {
        this.push([element, arr, ClickType.click]);
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
    if (element instanceof HTMLImageElement) { return VHints._getImagesInImg(this, element); }
    if (!(element instanceof HTMLElement) || Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(element)) { return; }
    let str = element.dataset.src || element.getAttribute("href"), cr: Rect | null;
    if (!VUtils.isImageUrl_(str)) {
      str = element.style.backgroundImage as string;
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
    box = !wholeDoc && D.webkitFullscreenElement || D, isD = box === D,
    querySelectorAll = Build.BTypes & ~BrowserType.Firefox
      ? isD ? D.querySelectorAll : Element.prototype.querySelectorAll : box.querySelectorAll;
    wantClickable && Sc.getScale_();
    let list: HintsNS.ElementList | null = querySelectorAll.call(box, query);
    if (!wholeDoc && a.tooHigh_ && isD && list.length >= GlobalConsts.LinkHintLimitToCheckViewportFirst) {
      list = a.getElementsInViewPort_(list);
    }
    const forEach = (list.forEach || output.forEach) as HintsNS.ElementIterator<Hint | Element>;
    forEach.call(list, filter, output);
    if (wholeDoc) { /* this requires not detecting scrollable elements if wholeDoc */ return output; }
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
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
          || uiRoot !== VDom.UI.box_)
        && !notWantVUI
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1
          || uiRoot.mode === "closed"
          || !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoShadowDOMv0)
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
    (key: string, filter: HintsNS.Filter<HTMLElement>, notWantVUI?: true, wholeDoc?: true): HTMLElement[];
    (key: string, filter: HintsNS.Filter<Hint>, notWantVUI?: boolean): Hint[];
  },
  getElementsInViewPort_ (list: HintsNS.ElementList): HintsNS.ElementList {
    const result: Element[] = [], height = innerHeight;
    for (let i = 1, len = list.length; i < len; i++) { // skip docEl
      const el = list[i];
      if (Build.BTypes & ~BrowserType.Firefox && VDom.notSafe_(el)) { continue; }
      const cr = el.getBoundingClientRect();
      if (cr.bottom > 0 && cr.top < height) {
        result.push(el);
        continue;
      }
      const last = el.lastElementChild;
      if (!last) { continue; }
      while (list[++i] !== last) { /* empty */ }
      i--;
    }
    return result.length > 12 ? result : list;
  },
  deduplicate_ (list: Hint[]): void {
    let j = list.length, i: number, k: ClickType;
    while (0 < --j) {
      if (list[i = j][2] !== ClickType.classname) { /* empty */ }
      else if ((k = list[--j][2]) > ClickType.frame || !this._isDescendant(list[i][0], list[j][0])) {
        continue;
      } else if (VDom.isContaining_(list[j][1], list[i][1])) {
        list.splice(i, 1);
        continue;
      } else if (k < ClickType.listener || j === 0) {
        continue;
      }
      while (0 < j && (k = list[j - 1][2]) >= ClickType.listener && k <= ClickType.tabindex
          && this._isDescendant(list[j][0], list[j - 1][0])) {
        j--;
        if (j === i - 3) { break; }
      }
      if (j < i) {
        list.splice(j, i - j);
      }
    }
  },
  _isDescendant (d: Element, p: Element): boolean {
    // Note: currently, not compute normal shadowDOMs / even <slot>s (too complicated)
    let i = 3, c: EnsuredMountedElement | null | undefined, f: Node | null;
    while (0 < i-- && (c = VDom.GetParent_(d, PNType.DirectElement) as EnsuredMountedElement | null) !== p && c) {
      d = c;
    }
    if (c !== p) { return false; }
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
      : document.webkitIsFullScreen ? 0 : this._getNestedFrame(output);
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
    if (
      ((element instanceof HTMLIFrameElement) || (element instanceof HTMLFrameElement))
        && (rect = element.getClientRects()[0])
        && (rect2 = (document.documentElement as HTMLHtmlElement).getBoundingClientRect())
        && rect.top - rect2.top < 20 && rect.left - rect2.left < 20
        && rect2.right - rect.right < 20 && rect2.bottom - rect.bottom < 20
        && getComputedStyle(element).visibility === "visible"
    ) {
      return element;
    }
    return null;
  },
  getVisibleElements_ (view: ViewBox): Hint[] {
    const a = this;
    let _i: number = a.mode1_;
    const isNormal = _i < HintMode.min_job,
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
      if (visibleElement[2] > ClickType.maxNotBox) { continue; }
      let r = visibleElement[1];
      for (_i = _len; _j <= --_i; ) {
        t = visibleElements[_i][1];
        if (r[3] <= t[1] || r[2] <= t[0] || r[0] >= t[2] || r[1] >= t[3]) { continue; }
        if (visibleElements[_i][2] > ClickType.maxNotBox) { continue; }
        obj[0] = []; obj[1] = t;
        r2 !== null ? r2.forEach(func) : func(r);
        if ((r2 = obj[0]).length === 0) { break; }
      }
      if (r2 === null) { continue; }
      if (r2.length > 0) {
        t = r2[0];
        t[1] > a.maxTop_ && t[1] > r[1] || t[0] > a.maxLeft_ && t[0] > r[0] ||
          r2.length === 1 && (t[3] - t[1] < 3 || t[2] - t[0] < 3) || (visibleElement[1] = t);
      } else if ((reason = visibleElement[2]) === ClickType.classname
            || (reason === ClickType.listener ? isNormal : reason === ClickType.tabindex)
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
    } else if (VKeyboard.isEscape_(event)) {
      a.clean_();
    } else if ((i = event.keyCode) === VKeyCodes.esc) {
      return HandlerResult.Suppress;
    } else if (i === VKeyCodes.ime) {
      a.clean_(1);
      VHUD.tip_("LinkHints exits because you're inputting");
      return HandlerResult.Nothing;
    } else if (i > VKeyCodes.f1 && i <= VKeyCodes.f12) {
      a.ResetMode_();
      if (i !== VKeyCodes.f2) { return HandlerResult.Nothing; }
      i = VKeyboard.getKeyStat_(event);
      let deep = a.queryInDeep_, reinit = true;
      if (i & KeyStat.shiftKey) {
        if (i & ~KeyStat.shiftKey) {
          reinit = !!VSettings.execute_;
          if (reinit) {
            (VSettings as EnsureNonNull<VSettingsTy>).execute_(kContentCmd.FindAllOnClick);
          }
        } else {
          a.isClickListened_ = !a.isClickListened_;
        }
      } else if (i === KeyStat.plain) {
        if ((Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinNoShadowDOMv0) {
          reinit = deep !== DeepQueryType.NotAvailable;
          a.queryInDeep_ = DeepQueryType.InDeep - deep;
        }
      } else if (i === KeyStat.ctrlKey || (i === VKeyCodes.metaKey && VUtils.cache_.onMac_)) {
        if ((Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinNoShadowDOMv0) {
          reinit = deep === DeepQueryType.NotDeep;
          a.queryInDeep_ = DeepQueryType.InDeep;
        }
      } else if (i === KeyStat.altKey) {
        reinit = (!(Build.BTypes & BrowserType.Edge) && Build.MinCVer >= BrowserVer.MinHTMLDialogElement)
          || typeof HTMLDialogElement === "function";
        a.dialogMode_ = reinit && !a.dialogMode_;
      } else {
        reinit = false;
      }
      reinit && setTimeout(a._reinit.bind(a, null, null), 0);
    } else if (i === VKeyCodes.shiftKey || i === VKeyCodes.ctrlKey || i === VKeyCodes.altKey
        || (i === VKeyCodes.metaKey && VUtils.cache_.onMac_)) {
      const mode = a.mode_,
      mode2 = i === VKeyCodes.altKey
        ? mode < HintMode.min_disable_queue
          ? ((mode >= HintMode.min_job ? HintMode.empty : HintMode.newTab) | mode) ^ HintMode.queue : mode
        : mode < HintMode.min_job
          ? i === VKeyCodes.shiftKey ? (mode | HintMode.focused) ^ HintMode.mask_focus_new
          : (mode | HintMode.newTab) ^ HintMode.focused
        : mode;
      if (mode2 !== mode) {
        a.setMode_(mode2);
        i = VKeyboard.getKeyStat_(event);
        (i & (i - 1)) || (a.lastMode_ = mode);
      }
    } else if (i <= VKeyCodes.down && i >= VKeyCodes.pageup) {
      VEvent.scroll_(event);
      a.ResetMode_();
    } else if (i === VKeyCodes.space) {
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
      VUtils.prevent_(event);
      a.execute_(linksMatched[0]);
    } else {
      const limit = a.keyStatus_.tab_ ? 0 : a.keyStatus_.newHintLength_;
      for (i = linksMatched.length; 0 <= --i; ) {
        let ref = linksMatched[i].marker.childNodes as NodeListOf<HTMLSpanElement>, j = ref.length - 1;
        while (limit <= --j) {
          ref[j].classList.remove("MC");
        }
        for (; 0 <= j; --j) {
          ref[j].classList.add("MC");
        }
      }
    }
    return HandlerResult.Prevent;
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
  } : null as never,
  ResetMode_ (): void {
    if (VHints.mode_ >= HintMode.min_disable_queue || VHints.lastMode_ === VHints.mode_) { return; }
    const d = VEvent.keydownEvents_();
    if (d[VKeyCodes.ctrlKey] || d[VKeyCodes.metaKey] || d[VKeyCodes.shiftKey] || d[VKeyCodes.altKey]) {
      return VHints.setMode_(VHints.lastMode_);
    }
  },
  resetHints_ (): void {
    let ref = this.hints_, i = 0, len = ref ? ref.length : 0;
    this.hints_ = this.zIndexes_ = null;
    this.pTimer_ > 0 && clearTimeout(this.pTimer_);
    while (i < len) { (ref as HintsNS.HintItem[])[i++].target = null as never; }
  },
  execute_ (hint: HintsNS.HintItem): void {
    const a = this;
    let rect: Rect | null | undefined, clickEl: HintsNS.LinkEl | null = hint.target;
    a.resetHints_();
    const str = (a.modeOpt_ as HintsNS.ModeOpt)[a.mode_] as string;
    (VHUD as Writeable<VHUDTy>).text_ = str; // in case pTimer > 0
    if (VDom.isInDOM_(clickEl)) {
      // must get outline first, because clickEl may hide itself when activated
      // must use UI.getRect, so that VDom.zooms are updated, and prepareCrop is called
      rect = VDom.UI.getRect_(clickEl, hint.refer !== clickEl ? hint.refer as HTMLElementUsingMap | null : null);
      const showRect = (a.modeOpt_ as HintsNS.ModeOpt).execute_.call(a, clickEl, rect, hint);
      if (showRect !== false && (rect || (rect = VDom.getVisibleClientRect_(clickEl)))) {
        setTimeout(function (): void {
          (showRect || document.hasFocus()) && VDom.UI.flash_(null, rect as Rect);
        }, 17);
      }
    } else {
      clickEl = null;
      VHUD.tip_("The link has been removed from page", 2000);
    }
    a.pTimer_ = -(VHUD.text_ !== str);
    if (!(a.mode_ & HintMode.queue)) {
      a._setupCheck(clickEl, null);
      return a.deactivate_(1);
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
    const a = this;
    if (!VSettings.enabled_) { return a.clean_(); }
    a.isActive_ = false;
    a.keyStatus_.tab_ = 0;
    a.zIndexes_ = null;
    a.resetHints_();
    const isClick = a.mode_ < HintMode.min_job;
    a.run(0, a.options_);
    return a._setupCheck(lastEl, rect, isClick);
  },
  _setupCheck (el?: HintsNS.LinkEl | null, r?: Rect | null, isClick?: boolean): void {
    this.timer_ && clearTimeout(this.timer_);
    this.timer_ = el && (isClick === true || this.mode_ < HintMode.min_job) ? setTimeout(function (i): void {
      !i && VHints && VHints._CheckLast(el, r);
    }, 255) : 0;
  },
  _CheckLast (this: void, el: HintsNS.LinkEl, r?: Rect | null): void {
    const _this = VHints;
    if (!_this) { return; }
    _this.timer_ = 0;
    const r2 = el.getBoundingClientRect(),
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
    alpha.hintKeystroke_ = alpha.chars_ = "";
    a.isActive_ = a.noHUD_ = a.tooHigh_ = false;
    VUtils.remove_(a);
    VEvent.onWndBlur_(null);
    if (a.box_) {
      a.box_.remove();
      a.box_ = null;
    }
    keepHUD || VHUD.hide_();
  },
  deactivate_ (onlySuppressRepeated: BOOL): void {
    this.clean_(this.pTimer_ < 0);
    return VDom.UI.suppressTail_(onlySuppressRepeated);
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
      let oldI = ref[i].zIndex || i;
      for (const j of stack) {
        const hint = ref[j], {style} = hint.marker, newI = hint.zIndex || j;
        style.zIndex = (hint.zIndex = oldI) as number | string as string;
        oldI = newI;
      }
      reverse && stack.reverse();
    }
  },
  MakeStacks_ (this: [Array<ClientRect | null>, HintsNS.Stacks], hint: HintsNS.HintItem, i: number) {
    let rects = this[0];
    if (hint.marker.style.visibility === "hidden") { rects.push(null); return; }
    const stacks = this[1], m = hint.marker.getClientRects()[0];
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
      const hint = hintItems[h], marker = hint.marker,
      hintString = hint.key = a.numberToHintString_(hints[h]), last = hintString.length - 1;
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
    if (key === VKeyCodes.tab) {
      if (!a.hintKeystroke_) {
        return false;
      }
      keyStatus.tab_ = (1 - keyStatus.tab_) as BOOL;
    } else if (keyStatus.tab_) {
      a.hintKeystroke_ = "";
      keyStatus.tab_ = 0;
    }
    keyStatus.known_ = 1;
    if (key === VKeyCodes.tab) { /* empty */ }
    else if (key === VKeyCodes.backspace || key === VKeyCodes.deleteKey || key === VKeyCodes.f1) {
      if (!a.hintKeystroke_) {
        return [];
      }
      a.hintKeystroke_ = a.hintKeystroke_.slice(0, -1);
    } else if ((keyChar = VKeyboard.char_(e).toUpperCase()) && keyChar.length === 1) {
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
        return hint.key === keyChar && ((arr as HintsNS.HintItem[]).push(hint), true);
      });
      if (arr.length === 1) { return arr; }
    }
    return hints.filter(function (hint) {
      const pass = (hint.key as string).startsWith(keyChar) === wanted;
      hint.marker.style.visibility = pass ? "" : "hidden";
      return pass;
    });
  },
  repeat_: Build.MinCVer >= BrowserVer.MinSafe$String$$StartsWith ? null
      : function (this: void, s: string, n: number): string {
    if (s.repeat) { return s.repeat(n); }
    for (var s2 = s; --n; ) { s2 += s; }
    return s2;
  }
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
  if (img instanceof HTMLImageElement) {
    text = img.currentSrc || img.getAttribute("src") && (img as HTMLImageElement).src;
  } else {
    text = img instanceof HTMLAnchorElement ? img.getAttribute("href") && img.href : "";
    if (!VUtils.isImageUrl_(text)) {
      let arr = (<RegExpI> /^url\(\s?['"]?((?:\\['"]|[^'"])+?)['"]?\s?\)/i).exec(img.style.backgroundImage as string);
      if (arr && arr[1]) {
        const a1 = document.createElement("a");
        a1.href = arr[1].replace(<RegExpG> /\\(['"])/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || forShow && text.startsWith("data:") || VUtils.jsRe_.test(text)
      || src.length > text.length + 7 && (text === (img as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  return text || VHUD.tip_("Not an image", 1000);
},

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
highlightChild_ (el: HTMLIFrameElement | HTMLFrameElement): false | void {
  interface VWindow extends Window {
    VEvent: VEventModeTy;
    VHints: typeof VHints;
  }
  let err: boolean | null = true, child: VWindow = null as never;
  try {
    err = !el.contentDocument ||
      (child = el.contentWindow as VWindow).VEvent.keydownEvents_(VEvent.keydownEvents_());
  } catch {}
  const { count_: count, options_: options } = this;
  options.mode = this.mode_;
  el.focus();
  if (err) {
    VPort.send_({
      c: kFgReq.execInChild,
      a: { u: el.src, c: kFgCmd.focusAndHint, n: count, a: options }
    }, function (res): void {
      if (!res) {
        el.contentWindow.focus();
      }
    });
    return;
  }
  child.VHints.ActivateAndFocus_(count, options);
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
    VDom.hover_(element, rect);
    type || element.tabIndex < 0 || element instanceof HTMLIFrameElement ||
      element instanceof HTMLFrameElement || element.focus();
    const a = this as typeof VHints;
    if (a.mode_ < HintMode.min_job) {
      return VHUD.tip_("Hover for scrolling", 1000);
    }
    const toggleMap = a.options_.toggle;
    if (!toggleMap || typeof toggleMap !== "object") { return; }
    VUtils.safer_(toggleMap);
    let ancestors = [], topest: Element | null = element, re = <RegExpOne> /^-?\d+/;
    for (let key in toggleMap) {
      // if no Element::closest, go up by 6 levels and then query the selector
      let selector = key, prefix = re.exec(key), upper = prefix && prefix[0];
      if (upper) {
        selector = selector.substring(upper.length);
      }
      let up = (upper as string | number as number) | 0, selected: Element | null = null;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest && !up) {
        up = element.closest ? 0 : 6;
      }
      selector = selector.trim();
      while (up && up + 1 >= ancestors.length && topest) {
        ancestors.push(topest);
        topest = VDom.GetParent_(topest, PNType.RevealSlotAndGotoParent)
      }
      try {
        if (selector && (selected = up
              ? (ancestors[Math.max(0, Math.min(up + 1, ancestors.length - 1))]).querySelector(selector)
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
  execute_ (this: void, element): void {
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
    let isUrl = a.mode1_ >= HintMode.min_link_job && a.mode1_ <= HintMode.max_link_job, str: string | null;
    if (isUrl) {
      str = a.getUrlData_(link as HTMLAnchorElement);
      str.length > 7 && str.toLowerCase().startsWith("mailto:") && (str = str.substring(7).trimLeft());
    }
    /** Note: SVGElement::dataset is only since `BrowserVer.Min$SVGElement$$dataset` */
    else if ((str = link.getAttribute("data-vim-text")) && (str = str.trim())) { /* empty */ }
    else {
      if (link instanceof HTMLInputElement) {
        const type = link.type;
        if (type === "password") {
          return VHUD.tip_("Sorry, Vimium C won't copy a password.", 2000);
        }
        if (!VDom.uneditableInputs_[type]) {
          str = (link.value || link.placeholder).trim();
        } else if (type === "file") {
          str = link.files && link.files.length > 0 ? link.files[0].name : "";
        } else if ("button image submit reset".indexOf(type) >= 0) {
          str = link.value.trim();
        }
      } else {
        str = link instanceof HTMLTextAreaElement ? link.value
          : link instanceof HTMLSelectElement ? (link.selectedIndex < 0 ? "" : link.options[link.selectedIndex].text)
          : link instanceof HTMLElement && (str = link.innerText.trim(),
              str.length > 7 && str.substring(0, 7).toLowerCase() === "mailto:" ? str.substring(7).trimLeft() : str)
            || (str = link.textContent.trim()) && str.replace(<RegExpG> /\s+/g, " ")
          ;
      }
      if (!str && link instanceof HTMLElement) {
        str = (link.title.trim() || link.getAttribute("aria-label") || "").trim();
      }
    }
    if (!str) {
      return VHUD.copied_("", isUrl ? "url" : "");
    }
    if (a.mode_ >= HintMode.min_edit && a.mode_ <= HintMode.max_edit) {
      let newtab = a.options_.newtab;
      newtab == null && (newtab = a.options_.force);
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
    str = isUrl ? VUtils.decodeURL_(str) : str;
    VPort.post_({
      H: kFgReq.copy,
      d: str
    });
    VHUD.copied_(str);
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
      text = text.substring(text.indexOf("/", i + 4) + 1);
    }
    if (text.length > 40) {
      text = text.substring(0, 39) + "\u2026";
    }
    a.href = url;
    a.download = img.getAttribute("download") || "";
    // todo: how to trigger download
    VDom.mouse_(a, "click", null);
    return VHUD.tip_("Download: " + text, 2000);
  }
} as HintsNS.ModeOpt,
{
  133: "Open image",
  197: "Open multiple image",
  execute_ (img: SafeHTMLElement): void {
    let text = (this as typeof VHints)._getImageUrl(img, 1);
    if (!text) { return; }
    VPort.post_({
      H: kFgReq.openImage,
      r: (this as typeof VHints).mode_ & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      f: img.getAttribute("download"),
      u: text,
      a: (this as typeof VHints).options_.auto
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
    const hadNoDownload = !link.hasAttribute("download");
    if (hadNoDownload) {
      link.download = "";
    }
    VDom.UI.click_(link, rect, {
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    });
    if (hadNoDownload) {
      link.removeAttribute("download");
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
    const a = this as typeof VHints, tag = link instanceof HTMLElement ? (link.tagName as string).toLowerCase() : "";
    if (tag === "iframe" || tag === "frame") {
      const highlight = link !== VOmni.box_;
      highlight ? a.highlightChild_(link as HTMLIFrameElement | HTMLFrameElement) : VOmni.focus_();
      a.mode_ = HintMode.DEFAULT;
      return highlight;
    }
    const { UI } = VDom;
    if (tag === "details") {
      // Specification: https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element
      // `HTMLDetailsElement::FindMainSummary()` in
      // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_details_element.cc?g=0&l=101
      for (let summaries = link.children, i = 0, len = summaries.length; i < len; i++) {
        const summary = summaries[i];
        // there's no window.HTMLSummaryElement on C70
        if ((Build.BTypes & ~BrowserType.Firefox ? summary.tagName + "" : summary.tagName as string
            ).toLowerCase() === "summary" && summary instanceof HTMLElement) {
          // `HTMLSummaryElement::DefaultEventHandler(event)` in
          // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/html/html_summary_element.cc?l=109
          rect = (link as HTMLDetailsElement).open || !rect ? VDom.getVisibleClientRect_(summary) : rect;
          UI.click_(summary, rect, null, true);
          rect && UI.flash_(null, rect);
          return false;
        }
      }
      (link as HTMLDetailsElement).open = !(link as HTMLDetailsElement).open;
      return;
    } else if (hint.refer && hint.refer === link) {
      return a.Modes_[0].execute_.call(a, link, rect, hint);
    } else if (VDom.getEditableType_<0>(link) >= EditableType.Editbox) {
      UI.simulateSelect_(link, rect, true);
      return false;
    }
    const mode = a.mode_ & HintMode.mask_focus_new, notMac = !VUtils.cache_.onMac_, newTab = mode >= HintMode.newTab;
    UI.click_(link, rect, {
      altKey: false,
      ctrlKey: newTab && notMac,
      metaKey: newTab && !notMac,
      shiftKey: mode === HintMode.OPEN_IN_NEW_FG_TAB
    }, mode !== HintMode.empty || link.tabIndex >= 0);
  }
} as HintsNS.ModeOpt
]
};
