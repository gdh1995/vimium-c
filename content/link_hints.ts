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
    (this: void, linkEl: LinkEl, rect: Rect | null, hintEl: Pick<HintItem, "r">): void | boolean;
  }
  interface ModeOpt extends ReadonlyArray<Executor | HintMode> {
    [0]: Executor;
    [1]: HintMode;
  }
  interface Options extends SafeObject {
    action?: string;
    characters?: string;
    useFilter?: boolean;
    mode?: string | number;
    url?: boolean;
    keyword?: string;
    dblclick?: boolean;
    newtab?: boolean | "force";
    button?: "right";
    touch?: null | boolean | "auto";
    join?: FgReq[kFgReq.copy]["j"];
    toggle?: {
      [selector: string]: string;
    };
    mapKey?: true | false;
    auto?: boolean;
    noCtrlPlusShift?: boolean;
    swapCtrlAndShift?: boolean;
    hideHud?: boolean;
    hideHUD?: boolean;
  }
  type NestedFrame = false | 0 | null | HTMLIFrameElement | HTMLFrameElement;
  interface Filter<T> {
    // tslint:disable-next-line: callable-types
    (this: void, hints: T[], element: SafeHTMLElement): void;
  }
  type Stack = number[];
  type Stacks = Stack[];
  interface KeyStatus {
    hints_: readonly HintItem[];
    keySequence_: string;
    textSequence_: string;
    known_: BOOL;
    tab_: number;
  }
  type HintSources = readonly SafeElement[] | NodeListOf<SafeElement>;

  interface BaseHinter {
    isActive_: boolean;
    readonly hints_: unknown;
    keyCode_: kKeyCode;
    collectFrameHints_: unknown;
    render_ (hints: readonly HintItem[], arr: ViewBox, hud: VHUDTy): void;
    execute_ (hint: HintItem, event?: HandlerNS.Event): void;
    clean_ (keepHudOrEvent?: BOOL | Event, suppressTimeout?: number): void;
  }
  interface Master extends BaseHinter {
    readonly keyStatus_: KeyStatus;
    readonly frameList_: FrameHintsInfo[];
    mode_: HintMode;
    mode1_: HintMode;
    box_: HTMLDivElement | HTMLDialogElement | null;
    _master: null;
    setMode_ (mode: HintMode, silent?: 1): void;
    ResetMode_ (): void;
    onKeydown_ (event: KeyboardEventToPrevent): HandlerResult;
    _reinit (slave?: BaseHinter | null, lastEl?: LinkEl | null, rect?: Rect | null): void;
    resetHints_ (): void;
    keydownEvents_ (this: void): Pick<VApiTy, "keydownEvents_"> | KeydownCacheArray;
    onFrameUnload_ (slave: HintsNS.Slave): void;
    _setupCheck (slave?: BaseHinter | null, el?: HintsNS.LinkEl | null, r?: Rect | null): void;
  }
  interface Slave extends BaseHinter {
    _master: Master | null;
  }
  interface ChildFrame {
    v: Rect | null;
    s: Slave;
  }
  interface FrameHintsInfo {
    h: readonly HintItem[];
    v: ViewBox;
    s: Master | Slave;
  }
}

var VHints = {
  CONST_: {
    focus: HintMode.FOCUS,
    hover: HintMode.HOVER,
    input: HintMode.FOCUS_EDITABLE,
    leave: HintMode.UNHOVER,
    unhover: HintMode.UNHOVER,
    text: HintMode.COPY_TEXT,
    "copy-text": HintMode.COPY_TEXT,
    url: HintMode.COPY_URL,
    image: HintMode.OPEN_IMAGE
  } as Dict<HintMode>,
  box_: null as HTMLDivElement | HTMLDialogElement | null,
  dialogMode_: false,
  wantDialogMode_: null as boolean | null,
  hints_: null as readonly HintsNS.HintItem[] | null,
  frameList_: [] as HintsNS.FrameHintsInfo[],
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
  _removeFlash: null as (() => void) | null,
  /** must be called from a master, required by {@link #VHints.delayToExecute_ } */
  _onTailEnter: null as HandlerNS.VoidEventHandler | null,
  _onWaitingKey: null as HandlerNS.VoidEventHandler | null,
  doesMapKey_: false,
  keyCode_: kKeyCode.None,
  isActive_: false,
  hasExecuted_: 0 as BOOL,
  noHUD_: false,
  options_: null as never as HintsNS.Options,
  timer_: 0,
  yankedList_: [] as string[],
  kSafeAllSelector_: Build.BTypes & ~BrowserType.Firefox ? ":not(form)" as const : "*" as const,
  kEditableSelector_: "input,textarea,[contenteditable]" as const,
  _master: null as HintsNS.Master | null,
  hud_: null as never as VHUDTy,
  _wrap: !(Build.BTypes & BrowserType.Firefox) ? 0 as never
      : <T extends object> (obj: T): T => (obj as XrayedObject<T>).wrappedJSObject || obj,
  /** return whether the element's VHints is not accessible */
  _addChildFrame: null as ((this: {}, el: HTMLIFrameElement | HTMLFrameElement, rect: Rect | null) => boolean) | null,
  activate_ (this: void, count: number, options: HintsNS.Options): void {
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
    }
    const upper = Build.BTypes & BrowserType.Firefox ? VDom.parentCore_() : VDom.frameElement_() && parent as Window;
    if (upper && upper.VCui) {
      (upper.VCui as typeof VCui).learnCss_(VCui);
      // recursively go up and use the topest frame in a same origin
      (upper.VHints as typeof VHints).activate_(count, options);
      return;
    }
    const useFilter0 = options.useFilter, useFilter = useFilter0 != null ? !!useFilter0 : VDom.cache_.f,
    frameList: HintsNS.FrameHintsInfo[] = a.frameList_ = [{h: [], v: null as never, s: a}],
    toClean: HintsNS.Slave[] = [],
    s0 = options.characters, chars = (s0 ? s0 + "" : useFilter ? VDom.cache_.n : VDom.cache_.c).toUpperCase();
    if (chars.length < GlobalConsts.MinHintCharSetSize) {
      a.clean_(1);
      return VHud.tip_(kTip.fewChars, 1000);
    }
    a.dialogMode_ = !!(a.wantDialogMode_ != null ? a.wantDialogMode_ : document.querySelector("dialog[open]"))
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinEnsuredHTMLDialogElement
            || typeof HTMLDialogElement === "function");
    let allHints: readonly HintsNS.HintItem[], child: HintsNS.ChildFrame | undefined, insertPos = 0
      , frameInfo: HintsNS.FrameHintsInfo, total: number;
    {
      const childFrames: HintsNS.ChildFrame[] = [],
      addChild: typeof a._addChildFrame = function (el, rect) {
        const core = a.detectUsableChild_(el),
        slave: HintsNS.Slave | null | undefined = core && core.VHints as typeof VHints | undefined;
        if (slave) {
          ((core as ContentWindowCore).VCui as typeof VCui).learnCss_(VCui);
          childFrames.splice(insertPos, 0, {
            v: rect && (this as typeof a).getPreciseChildRect_(el, rect),
            s: slave
          });
        }
        return !slave;
      };
      a.collectFrameHints_(count, options, chars, useFilter, null, null, frameList[0], addChild);
      allHints = frameList[0].h;
      while (child = childFrames.pop()) {
        if (child.v) {
          insertPos = childFrames.length;
          frameList.push(frameInfo = {h: [], v: null as never, s: child.s});
          (child.s.collectFrameHints_ as typeof a.collectFrameHints_)(count, options, chars, useFilter
                , child.v, a as typeof a & { _master: null }, frameInfo, addChild);
          // ensure allHints always belong to the master frame
          allHints = frameInfo.h.length ? allHints.concat(frameInfo.h) : allHints;
        } else if (child.s.isActive_ as typeof a.isActive_) {
          toClean.push(child.s);
        }
      }
      for (const i of toClean) { (i as HintsNS.Slave | typeof a)._master = null; (i.clean_ as typeof a.clean_)(); }
      total = allHints.length;
      if (!total || total > GlobalConsts.MaxCountToHint) {
        a.clean_(1);
        return VHud.tip_(total ? kTip.tooManyLinks : kTip.noLinks, 1000);
      }
      a.hints_ = a.keyStatus_.hints_ = allHints;
    }
    a.doesMapKey_ = options.mapKey !== false;
    a.noHUD_ = !(useFilter || frameList[0].v[3] > 40 && frameList[0].v[2] > 320)
        || (options.hideHUD || options.hideHud) === true;
    useFilter ? a.filterEngine_.getMatchingHints_(a.keyStatus_, "", "", 0) : a.initAlphabetEngine_(allHints);
    a.renderMarkers_(allHints);
    a.hud_ = VHud;
    a.setMode_(a.mode_);
    for (const frame of frameList) {
      (frame.s.render_ as typeof a.render_)(frame.h, frame.v, VHud);
    }
  },
  collectFrameHints_ (count: number, options: FgOptions, chars: string, useFilter: boolean, outerView: Rect | null
      , master: HintsNS.Master | null, frameInfo: HintsNS.FrameHintsInfo
      , addChildFrame: (this: {}, el: HTMLIFrameElement | HTMLFrameElement, rect: Rect | null) => boolean
      ): void {
    const a = this;
    a._master = Build.BTypes & BrowserType.Firefox ? master && a._wrap(master) : master;
    a.resetHints_();
    a.setModeOpt_(count, options);
    a.chars_ = chars;
    a.useFilter_ = useFilter;
    if (!VDom.isHTML_()) {
      return;
    }

    const view = VDom.getViewBox_(1) as ViewBox;
    VDom.prepareCrop_(1, outerView);
    if (a.tooHigh_ !== null) {
      a.tooHigh_ = (VDom.scrollingEl_(1) as HTMLElement).scrollHeight / innerHeight
        > GlobalConsts.LinkHintTooHighThreshold;
    }
    a._addChildFrame = addChildFrame;
    const elements = a.getVisibleElements_(view);
    const hintItems = elements.map(a.createHint_, a);
    a._addChildFrame = null as never;
    VDom.bZoom_ !== 1 && a.adjustMarkers_(elements, hintItems);
    frameInfo.h = hintItems;
    frameInfo.v = view;
  },
  render_ (hints: readonly HintsNS.HintItem[], arr: ViewBox, hud: VHUDTy): void {
    const a = this, master = a._master || a;
    if (a.box_) { a.box_.remove(); a.box_ = null; }
    a.hud_ = Build.BTypes & BrowserType.Firefox ? a._wrap(hud) : hud;
    VCui.ensureBorder_(VDom.wdZoom_ / VDom.dScale_);
    if (hints.length) {
      a.box_ = VCui.addElementList_(hints, arr, (master as typeof a).dialogMode_);
    } else if (a === master) {
      VCui.adjust_();
    }
    VApi.keydownEvents_((master.keydownEvents_ as typeof a.keydownEvents_)());
    VApi.onWndBlur_(master.ResetMode_ as typeof a.ResetMode_);
    VKey.removeHandler_(a);
    VKey.pushHandler_(a.onKeydown_, a);
    a._master && VKey.SetupEventListener_(0, "unload", a.clean_);
    a.isActive_ = true;
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
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
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
    return a.hud_.show_(kTip.raw, [msg], true);
  },
  SetHUDLater_ (this: void): void {
    const a = VHints;
    if (a && a.isActive_) { a.pTimer_ = 0; a.setMode_(a.mode_); }
  },
  getPreciseChildRect_ (frameEl: HTMLIFrameElement | HTMLElement, view: Rect): Rect | null {
    const max = Math.max, min = Math.min, kVisible = "visible", D = VDom, brect = D.getBoundingClientRect_(frameEl),
    docEl = document.documentElement, body = document.body, inBody = !!body && VDom.IsInDOM_(frameEl, body, 1),
    zoom = (Build.BTypes & BrowserType.Chrome ? D.docZoom_ * (inBody ? D.bZoom_ : 1) : 1
        ) / D.dScale_ / (inBody ? D.bScale_ : 1);
    let x0 = min(view.l, brect.left), y0 = min(view.t, brect.top), l = x0, t = y0, r = view.r, b = view.b;
    for (let el: Element | null = frameEl; el = D.GetParent_(el, PNType.RevealSlotAndGotoParent); ) {
      const st = getComputedStyle(el);
      if (st.overflow !== kVisible) {
        let outer = D.getBoundingClientRect_(el), hx = st.overflowX !== kVisible, hy = st.overflowY !== kVisible,
        scale = el !== docEl && inBody ? D.dScale_ * D.bScale_ : D.dScale_;
        hx && (l = max(l, outer.left), r = l + min(r - l, outer.width , hy ? el.clientWidth * scale : r));
        hy && (t = max(t, outer.top ), b = t + min(b - t, outer.height, hx ? el.clientHeight * scale : b));
      }
    }
    l = max(l, view.l), t = max(t, view.t);
    return l + 7 < r && t + 7 < b ? {
        l: (l - x0) * zoom, t: (t - y0) * zoom, r: (r - x0) * zoom, b: (b - y0) * zoom} : null;
  },
  TryNestedFrame_ (cmd: Exclude<FgCmdAcrossFrames, kFgCmd.linkHints>, count: number, options: SafeObject): boolean {
    const a = this;
    if (a.frameNested_ !== null) {
      VDom.prepareCrop_();
      a.checkNestedFrame_();
    }
    if (!a.frameNested_) { return false; }
    // let events: VApiTy | undefined, core: ContentWindowCore | null | 0 | void | undefined = null;
    const core = a.detectUsableChild_(a.frameNested_);
    if (core) {
      core.VApi.focusAndRun_(cmd, count, options);
      if (document.readyState !== "complete") { a.frameNested_ = false; }
    } else {
      // It's cross-site, or Vimium C on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      a.frameNested_ = null;
    }
    return !!core;
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
  adjustMarkers_ (elements: readonly Hint[], arr: readonly HintsNS.HintItem[]): void {
    const zi = VDom.bZoom_, root = VCui.root_;
    let i = elements.length - 1;
    if (!root || i < 0 || elements[i][0] !== VOmni.box_ && !root.querySelector("#HelpDialog")) { return; }
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
      if (isClickable = element !== VFind.box_) {
        arr = VDom.getVisibleClientRect_(element);
        if (element !== VOmni.box_) {
          isClickable = _this._addChildFrame ? _this._addChildFrame(
              element as HTMLIFrameElement | HTMLFrameElement, arr) : !!arr;
        } else if (arr) {
          (arr as WritableRect).l += 12; (arr as WritableRect).t += 9;
        }
      }
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
        : (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
            ? (anotherEl = (element as XrayedObject<SafeHTMLElement>).wrappedJSObject || element).onclick
              || (anotherEl as TypeToAssert<Element, SafeHTMLElement, "onmousedown", "tagName">).onmousedown
            : element.getAttribute("onclick"))
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
        && VDom.isAriaNotTrue_(element, kAria.hidden)
        && (_this.mode_ > HintMode.min_job - 1 || VDom.isAriaNotTrue_(element, kAria.disabled))
    ) { hints.push([element, tag === "img" ? VDom.getCroppedRect_(element, arr) : arr, type]); }
  },
  _getClickableInMaybeSVG (hints: Hint[], element: SafeElement & { __other: 1 | 2; }): void {
    let anotherEl: SVGElement;
    let arr: Rect | null | undefined, s: string | null , type = ClickType.Default;
    const isSVG = (element as ElementToHTMLorSVG).tabIndex != null;
    { // not HTML*
      {
        /** not use .codeListener, {@see #VHints.deduplicate_} */
        type = VDom.clickable_.has(element)
            || isSVG && (!(Build.BTypes & ~BrowserType.Firefox)
                || Build.BTypes & BrowserType.Firefox && VOther & BrowserType.Firefox
                ? ((anotherEl = (element as XrayedObject<SVGElement>).wrappedJSObject || element as SVGElement)
                    ).onclick || anotherEl.onmousedown
                : element.getAttribute("onclick"))
            || (s = element.getAttribute("role")) && (<RegExpI> /^button$/i).test(s)
            || this.ngEnabled_ && element.getAttribute("ng-click")
            || this.jsaEnabled_ && (s = element.getAttribute("jsaction")) && this.checkJSAction_(s)
          ? ClickType.attrListener
          : isSVG && (element as SVGElement).tabIndex >= 0 ? ClickType.tabindex
          : ClickType.Default;
        if (type > ClickType.Default && (arr = VDom.getVisibleClientRect_(element))
            && VDom.isAriaNotTrue_(element as SafeElement, kAria.hidden)
            && (this.mode_ > HintMode.min_job - 1 || VDom.isAriaNotTrue_(element as SafeElement, kAria.disabled))
            ) {
          hints.push([element as SVGElement | OtherSafeElement, arr, type]);
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
    if (cr && VDom.isStyleVisible_(element)) {
      hints.push([element, cr, ClickType.Default]);
    }
  },
  GetImages_ (this: void, hints: Hint[], element: SafeHTMLElement): void {
    const tag = element.localName;
    if (tag === "img") {
      VHints._getImagesInImg(hints, element as HTMLImageElement);
      return;
    }
    let str: string | null, cr: Rect | null;
    if (VHints.mode1_ === HintMode.DOWNLOAD_MEDIA && (tag === "video" || tag === "audio")) {
      str = (element as unknown as HTMLImageElement).currentSrc || (element as unknown as HTMLImageElement).src;
    } else {
      str = element.dataset.src || element.getAttribute("href");
      if (!VHints.isImageUrl_(str)) {
        str = element.style.backgroundImage as string;
        str = str && (<RegExpI> /^url\(/i).test(str) ? str : "";
      }
    }
    if (str) {
      if (cr = VDom.getVisibleClientRect_(element)) {
        hints.push([element, cr, ClickType.Default]);
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
    let list: HintsNS.HintSources | null = querySelectorAll.call(box, selector) as NodeListOf<SafeElement>;
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
      list = a.addChildTrees_(list, querySelectorAll.call(box, a.kSafeAllSelector_) as NodeListOf<SafeElement>);
    }
    if (!wholeDoc && a.tooHigh_ && isD && list.length >= GlobalConsts.LinkHintPageHeightLimitToCheckViewportFirst) {
      list = a.getElementsInViewport_(list);
    }
    if (!Build.NDEBUG && isInAnElement) {
      // just for easier debugging
      list = [].slice.call(list);
      (list as SafeElement[]).unshift(wholeDoc as unknown as SafeElement);
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
            let sub_tree: HintsNS.HintSources = shadowRoot.querySelectorAll(selector) as NodeListOf<SafeElement>;
            if (!matchAll) {
              sub_tree = a.addChildTrees_(sub_tree,
                  shadowRoot.querySelectorAll(a.kSafeAllSelector_) as NodeListOf<SafeElement>);
            }
            cur_scope[1] = i;
            tree_scopes.push([sub_tree, i = 0]);
            break;
          }
        } else if (wantClickable) {
          a._getClickableInMaybeSVG(output as Exclude<typeof output, SafeHTMLElement[]>
              , el as (typeof el) & { __other: 1 | 2 });
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
    if (Build.BTypes & ~BrowserType.Edge && uiRoot
        && ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          || uiRoot !== VCui.box_)
        // now must have shadow DOM, because `UI.root_` !== `UI.box_`
        && !notWantVUI
        && (Build.NDEBUG && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
          || uiRoot.mode === "closed")
        ) {
      const bz = d.bZoom_, notHookScroll = Sc.scrolled_ === 0;
      if (bz !== 1 && isD) {
        d.bZoom_ = 1;
        d.prepareCrop_(1);
      }
      for (const el of (<ShadowRoot> uiRoot).querySelectorAll(selector)) {
        filter(output, el as SafeHTMLElement);
      }
      d.bZoom_ = bz;
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
    }
    return output as Hint[];
  } as {
    (key: string, filter: HintsNS.Filter<SafeHTMLElement>, notWantVUI?: true, wholeDoc?: true): SafeHTMLElement[];
    (key: string, filter: HintsNS.Filter<Hint>, notWantVUI?: boolean): Hint[];
  },
  addChildTrees_ (list: HintsNS.HintSources, allNodes: NodeListOf<SafeElement>): HintsNS.HintSources {
    let matchWebkit = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                      && VDom.cache_.v < BrowserVer.MinEnsuredUnprefixedShadowDOMV0;
    let hosts: SafeElement[] = [], matched: SafeElement | undefined;
    for (let i = 0, len = allNodes.length; i < len; i++) {
      let el = allNodes[i], tag: string;
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            && matchWebkit ? el.webkitShadowRoot : el.shadowRoot) {
        hosts.push(matched = el);
      } else if (((tag = el.localName) === "iframe" || tag === "frame") && this._addChildFrame
          && VDom.htmlTag_(el)) {
        if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            || el !== VOmni.box_ && el !== VFind.box_) {
          this._addChildFrame(el as HTMLIFrameElement | HTMLFrameElement, VDom.getVisibleClientRect_(el));
        }
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
    let i = list.length, j: number, k: ClickType, s: string, notRemoveParents: boolean;
    let element: Element, prect: Rect, crect: Rect | null;
    while (0 <= --i) {
      k = list[i][2];
      notRemoveParents = k === ClickType.classname;
      if (!notRemoveParents) {
        if (k === ClickType.codeListener) {
          if (s = ((element = list[i][0]) as SafeHTMLElement).localName, s === "i") {
            if (notRemoveParents
                = i > 0 && (<RegExpOne> /\b(button|a$)/).test(list[i - 1][0].localName)
                && !element.innerHTML.trim()
                && this._isDescendant(element as SafeHTMLElement, list[i - 1][0], false) ) {
              // icons: button > i
              list.splice(i, 1);
            }
          } else if (s === "div"
              && (j = i + 1) < list.length
              && (s = list[j][0].localName, s === "div" || s === "a")) {
            prect = list[i][1]; crect = list[j][1];
            if (notRemoveParents
                = crect.l < prect.l + /* icon_16 */ 19 && crect.t < prect.t + 9
                && crect.l > prect.l - 4 && crect.t > prect.t - 4 && crect.b > prect.b - 9
                && (s !== "a" || element.contains(list[j][0]))) {
              // the `<a>` is a single-line box's most left element and the first clickable element,
              // so think the box is just a layout container
              // for [i] is `<div>`, not limit the height of parent `<div>`,
              // if there's more content, it should have hints for itself
              list.splice(i, 1);
            }
          }
        } else if (k === ClickType.tabindex
            && (element = list[i][0]).childElementCount === 1 && i + 1 < list.length) {
          element = element.lastElementChild as Element;
          prect = list[i][1]; crect = VDom.getVisibleClientRect_(element);
          if (crect && VDom.isContaining_(crect, prect) && VDom.htmlTag_(element)) {
            if (list[i + 1][0].parentNode !== element) {
              list[i] = [element as SafeHTMLElement, crect, ClickType.tabindex];
            } else if (list[i + 1][2] === ClickType.codeListener) {
              // [tabindex] > :listened, then [i] is only a layout container
              list.splice(i, 1);
            }
          }
        } else if (notRemoveParents
            = k === ClickType.edit && i > 0 && (element = list[i - 1][0]) === list[i][0].parentElement
            && element.childElementCount < 2 && element.localName === "a"
            && !(element as HTMLElement | Element & { innerText?: undefined }).innerText) {
          // a rare case that <a> has only a clickable <input>
          list.splice(--i, 1);
        }
        j = i;
      }
      else if (i + 1 < list.length && list[j = i + 1][2] === ClickType.Default
          && this._isDescendant(element = list[i + 1][0], list[i][0], false)
          && (<RegExpOne> /\b(button|a$)/).test((element as Hint[0]).localName)) {
        list.splice(i, 1);
      }
      else if (j = i - 1, i < 1 || (k = list[j][2]) > ClickType.MaxWeak
          || !this._isDescendant(list[i][0], list[j][0], true)) {
        /* empty */
      } else if (VDom.isContaining_(list[j][1], list[i][1])) {
        list.splice(i, 1);
      } else {
        notRemoveParents = k < ClickType.MinWeak;
      }
      if (notRemoveParents) { continue; }
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
  _isDescendant: function (c: Element, p: Hint[0], shouldBeSingleChild: boolean): boolean {
    // Note: currently, not compute normal shadowDOMs / even <slot>s (too complicated)
    let i = 3, f: Node | null;
    while (0 < i--
        && (c = Build.BTypes & ~BrowserType.Firefox ? VDom.GetParent_(c, PNType.DirectElement) as Element
                : c.parentElement as Element | null as Element)
        && c !== p
        && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
              && VDom.unsafeFramesetTag_ && VDom.notSafe_(c))
        ) { /* empty */ }
    if (c !== p
        || !shouldBeSingleChild || (<RegExpOne> /\b(button|a$)/).test(p.localName)) {
      return c === p;
    }
    for (; c.childElementCount === 1
          && ((f = c.firstChild as Node).nodeType !== kNode.TEXT_NODE || !(f as Text).data.trim())
          && ++i < 3
        ; c = c.lastElementChild as Element | null as Element) { /* empty */ }
    return i > 2;
  } as (c: Element, p: Hint[0], shouldBeSingleChild: boolean) => boolean,
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
        && VDom.isStyleVisible_(element)
    ) {
      return element as HTMLFrameElement | HTMLIFrameElement;
    }
    return null;
  },
  getVisibleElements_ (view: ViewBox): readonly Hint[] {
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
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && a.maxRight_ > 0) {
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
    if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar)
        && GlobalConsts.MaxLengthOfShownText > 0 && a.useFilter_) {
      a.maxLeft_ -= 16 * (GlobalConsts.MaxLengthOfShownText >>> 2);
    }
    return visibleElements.reverse();
  },
  keydownEvents_: () => Build.BTypes & BrowserType.Firefox ? VApi.keydownEvents_() : VApi,
  onKeydown_ (event: KeyboardEventToPrevent): HandlerResult {
    const a = this;
    let matchedHint: ReturnType<typeof VHints.matchHintsByKey_>, i: number;
    if (a._master) {
      VApi.keydownEvents_((a._master.keydownEvents_ as typeof a.keydownEvents_)());
      return (a._master.onKeydown_ as typeof a.onKeydown_)(event);
    } else if (Build.BTypes & BrowserType.Chrome && a._onWaitingKey) {
      a._onWaitingKey(event);
    } else if (event.repeat || !a.isActive_) {
      // NOTE: should always prevent repeated keys.
    } else if ((i = event.keyCode) === kKeyCode.ime) {
      a.clean_(1);
      VHud.tip_(kTip.exitForIME);
      return HandlerResult.Nothing;
    } else if (VKey.isEscape_(event)) {
      a.clean_();
    } else if (i === kKeyCode.esc) {
      return HandlerResult.Suppress;
    } else if (Build.BTypes & BrowserType.Chrome && a._onTailEnter && i !== kKeyCode.f12) {
      a._onTailEnter(event);
    } else if (i > kKeyCode.f1 ? i < kKeyCode.f12 + 1 : i > kKeyCode.f1 - 1) {
      if (i > kKeyCode.f2) { a.ResetMode_(); return HandlerResult.Nothing; }
      i = VKey.getKeyStat_(event);
      if (event.keyCode < kKeyCode.f2) {
        a.ResetMode_();
        if (i & KeyStat.altKey && a.useFilter_) {
          (a.locateHint_(a.filterEngine_.activeHint_ as HintsNS.HintItem) as typeof a)._highlightHint(
              a.filterEngine_.activeHint_ as HintsNS.HintItem);
        } else if (i & KeyStat.shiftKey) {
          for (const frame of this.frameList_) {
            ((frame.s as typeof VHints).box_ as SafeHTMLElement).classList.toggle("HM1");
          }
        }
        return HandlerResult.Prevent;
      }
      if (i === KeyStat.altKey) {
        a.wantDialogMode_ = !a.wantDialogMode_;
      } else if (i & KeyStat.shiftKey) {
        a.isClickListened_ = !a.isClickListened_;
      } else if (i & KeyStat.PrimaryModifier) {
        a.options_.useFilter = VDom.cache_.f = !a.useFilter_;
      } else {
        if (Build.BTypes & BrowserType.Firefox
              && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
              && a.isClickListened_
            || !VApi.execute_) {
          a.ResetMode_(); return HandlerResult.Prevent;
        }
        a.isClickListened_ = true;
        if (Build.BTypes & ~BrowserType.Firefox) {
          (VApi as EnsureNonNull<VApiTy>).execute_(kContentCmd.ManuallyFindAllOnClick);
        }
      }
      a.ResetMode_(1);
      setTimeout(a._reinit.bind(a, null, null, null), 0);
    } else if ((i < kKeyCode.maxAcsKeys + 1 && i > kKeyCode.minAcsKeys - 1 || i === kKeyCode.metaKey && !VDom.cache_.o)
        && (!VDom.cache_.a || event.location !== VDom.cache_.a)) {
      const mode = a.mode_, mode1 = a.mode1_,
      mode2 = mode1 > HintMode.min_copying - 1 && mode1 < HintMode.max_copying + 1
        ? i === kKeyCode.ctrlKey || i === kKeyCode.metaKey ? (mode1 | HintMode.queue) ^ HintMode.list
          : i === kKeyCode.altKey ? (mode & ~HintMode.list) ^ HintMode.queue
          : mode
        : i === kKeyCode.altKey
        ? mode < HintMode.min_disable_queue
          ? ((mode1 < HintMode.min_job ? HintMode.newTab : HintMode.empty) | mode) ^ HintMode.queue : mode
        : mode1 < HintMode.min_job
        ? (i === kKeyCode.shiftKey) === !a.options_.swapCtrlAndShift
          ? (mode | HintMode.focused) ^ HintMode.mask_focus_new
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
    } else if (i === kKeyCode.tab && !a.useFilter_ && !a.keyStatus_.keySequence_) {
      a.tooHigh_ = null;
      a.ResetMode_();
      setTimeout(a._reinit.bind(a, null, null, null), 0);
    } else if (i === kKeyCode.space && (!a.useFilter_ || VKey.getKeyStat_(event))) {
      a.keyStatus_.textSequence_ = a.keyStatus_.textSequence_.replace("  ", " ");
      a.zIndexes_ !== 0 && a.rotateHints_(event.shiftKey);
      a.ResetMode_();
    } else if (matchedHint = a.matchHintsByKey_(a.keyStatus_, event), matchedHint === 0) {
      // then .a.keyStatus_.hintSequence_ is the last key char
      a.clean_(0, a.keyStatus_.known_ ? 0 : VDom.cache_.k[0]);
    } else if (matchedHint !== 2) {
      a.lastMode_ = a.mode_;
      a.locateHint_(matchedHint).execute_(matchedHint, event);
    }
    return HandlerResult.Prevent;
  },
  locateHint_ (matchedHint: HintsNS.HintItem): HintsNS.BaseHinter {
    /** safer; necessary since {@link #VHints._highlightChild} calls {@link #VHints.detectUsableChild_} */
    const arr = this.frameList_;
    for (const list of arr.length > 1 && matchedHint ? arr : []) {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
          ? list.h.indexOf(matchedHint) >= 0
          : (list.h as ReadonlyArrayWithIncludes<HintsNS.HintItem>).includes(matchedHint)) {
        return list.s;
      }
    }
    return this;
  },
  _highlightHint (hint: HintsNS.HintItem): void {
    VCui.flash_(hint.m, null, 660, " Sel");
    (this.box_ as NonNullable<typeof VHints.box_>).classList.toggle("HMM");
  },
  ResetMode_ (silent?: 1): void {
    let a = VHints, d: KeydownCacheArray;
    if (a.lastMode_ !== a.mode_ && a.mode_ < HintMode.min_disable_queue) {
      d = VApi.keydownEvents_();
      if (d[kKeyCode.ctrlKey] || d[kKeyCode.metaKey] || d[kKeyCode.shiftKey] || d[kKeyCode.altKey]) {
        a.setMode_(a.lastMode_, silent);
      }
    }
  },
  delayToExecute_ (slave: HintsNS.BaseHinter, hint: HintsNS.HintItem, flashEl: SafeHTMLElement | null): void {
    const a = this, waitEnter = Build.BTypes & BrowserType.Chrome && VDom.cache_.w,
    callback: (event?: HandlerNS.Event) => void = event => {
      let closed: void | 1 | 2 = 1;
      try {
        closed = (slave as typeof VHints).CheckLast_(1);
      } catch {}
      if (closed !== 2) {
        a.isActive_ && (a.clean_(), VHud.tip_(kTip.linkRemoved));
        return;
      }
      if (event) {
        const i = event.keyCode, key = event.key;
        tick = waitEnter && (i === kKeyCode.space || key === "Space") ? tick + 1 : 0;
        tick === 3 || i === kKeyCode.enter || key === "Enter" ? slave.execute_(hint, event)
        // tslint:disable-next-line: no-unused-expression
        : (i === kKeyCode.f1 || key === "F1") && flashEl ? flashEl.classList.toggle("Sel") : 0;
      } else {
        slave.execute_(hint);
      }
    };
    let tick = 0;
    a._onTailEnter = callback;
    (a.box_ as NonNullable<typeof a.box_>).remove();
    a.box_ = null;
    Build.BTypes & BrowserType.Firefox && (slave = a._wrap(slave));
    if (Build.BTypes & BrowserType.Chrome && !waitEnter) {
      a._onWaitingKey = VKey.suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents, callback);
      VKey.removeHandler_(a._onWaitingKey);
    } else {
      VHud.show_(kTip.waitEnter);
    }
  },
  execute_ (hint: HintsNS.HintItem, event?: HandlerNS.Event): void {
    const a = this, master = a._master, masterOrA = master || a, keyStatus = masterOrA.keyStatus_;
    let rect: Rect | null | undefined, clickEl: HintsNS.LinkEl | null = hint.d;
    if (master) {
      VApi.keydownEvents_((master.keydownEvents_ as typeof a.keydownEvents_)());
      a.setMode_(master.mode_ as typeof a.mode_, 1);
    }
    if (event) {
      VKey.prevent_(event);
      VApi.keydownEvents_()[a.keyCode_ = event.keyCode] = 1;
    }
    masterOrA.resetHints_(); // here .keyStatus_ is reset
    (a.hud_ as Writable<VHUDTy>).t = "";
    if (VDom.IsInDOM_(clickEl)) {
      // must get outline first, because clickEl may hide itself when activated
      // must use UI.getRect, so that VDom.zooms are updated, and prepareCrop is called
      rect = VCui.getRect_(clickEl, hint.r !== clickEl ? hint.r as HTMLElementUsingMap | null : null);
      rect = VDom.getCroppedRect_(clickEl, rect);
      if (keyStatus.textSequence_ && !keyStatus.keySequence_ && !keyStatus.known_) {
        if ((!(Build.BTypes & BrowserType.Chrome)
              || Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome
              || Build.MinCVer < BrowserVer.MinUserActivationV2 && VDom.cache_.v < BrowserVer.MinUserActivationV2)
            && !VDom.cache_.w) {
          // e.g.: https://github.com/philc/vimium/issues/3103#issuecomment-552653871
          VKey.suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents);
        } else {
          a._removeFlash = rect && VCui.flash_(null, rect, -1);
          return (masterOrA as typeof a).delayToExecute_(a, hint, rect && VCui.lastFlashEl_);
        }
      }
      master && focus();
      // tolerate new rects in some cases
      const showRect = a.modeOpt_[0](clickEl, rect, hint);
      if (!a._removeFlash && showRect !== false && (rect || (rect = VDom.getVisibleClientRect_(clickEl)))) {
        setTimeout(function (): void {
          (showRect || document.hasFocus()) && VCui.flash_(null, rect as Rect);
        }, 17);
      }
    } else {
      clickEl = null;
      a.hud_.tip_(kTip.linkRemoved, 2000);
    }
    a._removeFlash && a._removeFlash();
    a._removeFlash = null;
    (masterOrA as typeof a).pTimer_ = -!!a.hud_.t;
    if (!(a.mode_ & HintMode.queue)) {
      masterOrA._setupCheck(a, clickEl);
      masterOrA.clean_(<1 | 0> -(masterOrA as typeof a).pTimer_, 0);
      (<RegExpOne> /0?/).test("");
      return;
    }
    (masterOrA as typeof a).postExecute_(a, clickEl, rect);
  },
  postExecute_ (slave: HintsNS.BaseHinter, clickEl: HintsNS.LinkEl | null, rect?: Rect | null): void {
    const a = this;
    a.isActive_ = false;
    a._setupCheck();
    setTimeout(function (): void {
      a._reinit(slave, clickEl, rect);
      if (a.isActive_ && 1 === --a.count_) {
        a.setMode_(a.mode1_);
      }
    }, a.frameList_.length > 1 ? 50 : 18);
  },
  /** should only be called on master */
  _reinit (slave?: HintsNS.BaseHinter | null, lastEl?: HintsNS.LinkEl | null, rect?: Rect | null): void {
    const a = this, events = VApi;
    if (!events || events.keydownEvents_(Build.BTypes & BrowserType.Firefox ? events.keydownEvents_() : events)) {
      events && a.clean_();
      return;
    }
    a.isActive_ = false;
    a.resetHints_();
    a.activate_(0, a.options_);
    a._setupCheck(slave, lastEl, rect);
  },
  /** should only be called on master */
  _setupCheck (slave?: HintsNS.BaseHinter | null, el?: HintsNS.LinkEl | null, r?: Rect | null): void {
    const a = this;
    a.timer_ && clearTimeout(a.timer_);
    a.timer_ = slave && el && a.mode1_ < HintMode.min_job ? setTimeout(function (i): void {
      a.timer_ = 0;
      let reinit: BOOL | void = 0;
      try {
        Build.BTypes & BrowserType.Firefox && (slave = a._wrap(slave as NonNullable<typeof slave>));
        Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i ||
        slave && (reinit = (slave as typeof VHints).CheckLast_(el, r));
      } catch {}
      reinit && a._reinit();
      for (const frame of a.isActive_ ? a.frameList_ : []) {
        (frame.s as typeof a).hasExecuted_ = 1;
      }
    }, a.frameList_.length > 1 ? 380 : 255) : 0;
  },
  // if not el, then reinit if only no key stroke and hints.length < 64
  CheckLast_: function (this: void, el?: HintsNS.LinkEl | TimerType.fake | 1, r?: Rect | null): void | BOOL | 2 {
    const _this = VHints;
    if (!_this) { return; }
    if (window.closed) { return 1; }
    if (el === 1) { return 2; }
    const master = _this._master || _this;
    const r2 = el && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinNo$TimerType$$Fake
                      || el !== TimerType.fake) ? VDom.getBoundingClientRect_(el as HintsNS.LinkEl) : 0,
    hidden = !r2 || r2.width < 2 && r2.height < 2
        || !VDom.isStyleVisible_(el as HintsNS.LinkEl); // use 2px: may be safer
    if (hidden && VDom.lastHovered_ === el) {
      VDom.lastHovered_ = null;
    }
    if ((!r2 || r) && master.isActive_
        && (master.hints_ as NonNullable<typeof _this.hints_>).length < (
              (master.frameList_ as typeof _this.frameList_).length > 1 ? 200 : 100)
        && !master.keyStatus_.keySequence_
        && (hidden || Math.abs((r2 as ClientRect).left - (r as Rect).l) > 100
            || Math.abs((r2 as ClientRect).top - (r as Rect).t) > 60)) {
      if (_this._master) { return 1; }
      master._reinit();
    }
  } as {
    (el?: HintsNS.LinkEl | TimerType.fake, r?: Rect | null): void | BOOL;
    (el: 1, r?: Rect | null): void | 1 | 2;
  },
  resetHints_ (): void {
    // here should not consider about ._master
    const a = this;
    a._onWaitingKey = a._onTailEnter =
    a.hints_ = a.zIndexes_ = a.filterEngine_.activeHint_ = a.filterEngine_.reForMatch_ = null as never;
    a.pTimer_ > 0 && (clearTimeout(a.pTimer_), a.pTimer_ = 0);
    a.hasExecuted_ = 0;
    a.keyStatus_.hints_ = null as never;
    a.keyStatus_ = {
      hints_: null as never,
      keySequence_: "", textSequence_: "",
      known_: 0, tab_: 0
    };
    for (const frame of a.frameList_) {
      frame.h = [];
    }
  },
  clean_ (keepHudOrEvent?: 0 | 1 | 2 | Event, suppressTimeout?: number): void {
    const a = VHints, master = a && a._master;
    if (!a) { return; }
    if (keepHudOrEvent === 2 || keepHudOrEvent && keepHudOrEvent !== 1
        && (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted
            ? keepHudOrEvent.isTrusted !== !1 : keepHudOrEvent.isTrusted)
        && keepHudOrEvent.target === document) {
      master && (master.onFrameUnload_ as typeof a.onFrameUnload_)(a);
      if (keepHudOrEvent !== 2) {
        return;
      }
    }
    a._master = null;
    master && (master.clean_ as typeof a.clean_)(keepHudOrEvent, suppressTimeout);
    a.frameList_.forEach(a._CleanFrameInfo, suppressTimeout);
    a.yankedList_ = a.frameList_ = [];
    VKey.SetupEventListener_(0, "unload", a.clean_, 1);
    a.resetHints_();
    VKey.removeHandler_(a);
    suppressTimeout != null && VKey.suppressTail_(suppressTimeout);
    VApi.onWndBlur_(null);
    a._removeFlash && a._removeFlash();
    a._removeFlash = a.hud_ =
    a.options_ = a.modeOpt_ = null as never;
    a.lastMode_ = a.mode_ = a.mode1_ = a.count_ =
    a.maxLeft_ = a.maxTop_ = a.maxRight_ =
    a.maxPrefixLen_ = a.hasExecuted_ = 0;
    a.keyCode_ = kKeyCode.None;
    a.useFilter_ =
    a.isActive_ = a.noHUD_ = a.tooHigh_ = a.doesMapKey_ = false;
    a.chars_ = "";
    if (a.box_) {
      a.box_.remove();
      a.box_ = null;
    }
    keepHudOrEvent === 1 || VHud.hide_();
  },
  _CleanFrameInfo (this: number, frameInfo: HintsNS.FrameHintsInfo): void {
    try {
      let frame = frameInfo.s, hasMaster = (frame as typeof frame | typeof VHints)._master;
      (frame as typeof frame | typeof VHints)._master = null;
      hasMaster && (frame.clean_ as typeof VHints.clean_)(1, this);
    } catch { /* empty */ }
  },
  onFrameUnload_ (slave: HintsNS.Slave): void {
    const a = this, frames = a.frameList_, len = frames.length;
    const wrappedSlave = Build.BTypes & BrowserType.Firefox ? a._wrap(slave) : 0 as never;
    let i = 0, offset = 0;
    while (i < len && frames[i].s !== (Build.BTypes & BrowserType.Firefox ? wrappedSlave : slave)) {
      offset += frames[i++].h.length;
    }
    if (i >= len || !a.isActive_ || a.timer_) { return; }
    const keyStat = a.keyStatus_, hints = keyStat.hints_ = a.hints_ as NonNullable<typeof a.hints_>,
    deleteCount = frames[i].h.length;
    deleteCount && (hints as HintsNS.HintItem[]).splice(offset, deleteCount); // remove `readonly` by intent
    frames.splice(i, 1);
    if (!deleteCount) { return; }
    VKey.suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents);
    if (!hints.length) {
      a.clean_(1);
      VHud.tip_(kTip.frameUnloaded);
      return;
    }
    a.zIndexes_ = null;
    keyStat.known_ = keyStat.tab_ = 0;
    if (a.useFilter_) {
      a.filterEngine_.getMatchingHints_(keyStat, "", "", 1);
    } else {
      for (const link of hints) { link.m.innerText = ""; }
      a.initAlphabetEngine_(hints);
      a.renderMarkers_(hints);
    }
  },
  /** require `.zIndexes_` is not `0` */
  rotateHints_ (reverse?: boolean) {
    const a = this, frames = a.frameList_,
    saveCache = !a.keyStatus_.keySequence_ && !a.keyStatus_.textSequence_;
    for (const list of frames) {
      (list.s as typeof a)._rotateHints(list.h, reverse, saveCache);
    }
  },
  _rotateHints (totalHints: readonly HintsNS.HintItem[], reverse: boolean | undefined, saveIfNoOverlap: boolean): void {
    const a = this;
    let stacks = a.zIndexes_;
    if (!stacks) {
      stacks = [] as HintsNS.Stacks;
      totalHints.forEach(a.MakeStacks_, [[], stacks] as [Array<ClientRect | null>, HintsNS.Stacks]);
      stacks = stacks.filter(stack => stack.length > 1);
      if (stacks.length <= 0) {
        a.zIndexes_ = saveIfNoOverlap ? 0 : null;
        return;
      }
      a.zIndexes_ = stacks;
    }
    for (const stack of stacks) {
      for (let length = stack.length, j = reverse ? length - 1 : 0, end = reverse ? -1 : length
            , max = Math.max.apply(Math, stack)
            , oldI: number = totalHints[stack[reverse ? 0 : length - 1]].z as number
          ; j !== end; reverse ? j-- : j++) {
        const hint = totalHints[stack[j]], { m: { style, classList } } = hint, newI = hint.z as number;
        style.zIndex = (hint.z = oldI) as number | string as string;
        classList.toggle("OH", oldI < max); classList.toggle("SH", oldI >= max);
        oldI = newI;
      }
    }
  },
  MakeStacks_ (this: [Array<ClientRect | null>, HintsNS.Stacks], hint: HintsNS.HintItem, i: number) {
    let rects = this[0];
    if (hint.m.style.visibility) { rects.push(null); return; }
    hint.z = hint.z || i + 1;
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
  activeHint_: null as HintsNS.FilteredHintItem | null,
  reForMatch_: null as never as RegExpG & RegExpOne & RegExpSearchable<0>,
  getRe_ (forMatch: BOOL): RegExpG & RegExpOne & RegExpSearchable<0> {
    const chars = VHints.chars_, kNum = "0123456789",
    accepted_numbers = !forMatch || chars === kNum ? ""
        : !(Build.BTypes & BrowserType.Chrome)
          || Build.MinCVer >= BrowserVer.MinTestedES6Environment
              && Build.MinCVer >= BrowserVer.MinEnsuredES6SpreadOperator
              && Build.MinCVer >= BrowserVer.MinEnsuredES6$String$$StartsWithEndsWithAndRepeatAndIncludes
        ? [... <string[]> <unknown> kNum].filter(ch => !(chars as Ensure<string, "includes">).includes(ch)).join("")
        : kNum.replace(new RegExp(`[${chars.replace(<RegExpG> /\D/g, "")}]`, "g"), ""),
    accepted_words = forMatch ? "[^" + GlobalConsts.KeyboardLettersLl + accepted_numbers
        : "[^" + GlobalConsts.LettersLlLuAndOtherASCII;
    return new RegExp(accepted_words + GlobalConsts.KeyboardLettersLo + "]+", "g"
        ) as RegExpG & RegExpOne & RegExpSearchable<0>;
  },
  GenerateHintStrings_ (this: void, hints: readonly HintsNS.HintItem[]): void {
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
    let el = hint[0], text: string = "", show = false
      , localName = el.localName, isHTML = "lang" in el
      , ind: number;
    switch (isHTML ? localName : "") {
    case "input": case "textarea": case "select":
      let labels = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).labels;
      if (labels && labels.length > 0
          && (text = (labels[0] as SafeHTMLElement).innerText).trim()) {
        show = !0;
      } else if (localName[0] === "s") {
        const selected = (el as HTMLSelectElement).selectedOptions[0];
        text = selected ? selected.label : "";
      } else {
        if (localName[0] === "i") {
          if ((el as HTMLInputElement).type === "file") {
            text = "Choose File";
          } else if ((el as HTMLInputElement).type === "password") {
            break;
          }
        }
        text = text || (el as HTMLInputElement | HTMLTextAreaElement).value
            || (el as HTMLInputElement | HTMLTextAreaElement).placeholder;
        if (localName[0] === "t" && !(el as HTMLTextAreaElement).scrollTop) {
          ind = text.indexOf("\n") + 1;
          // tslint:disable-next-line: no-unused-expression
          ind && (ind = text.indexOf("\n", ind)) > 0 ? text = text.slice(0, ind) : 0;
        }
      }
      break;
    case "img":
      text = (el as HTMLImageElement).alt || (el as HTMLImageElement).title;
      // no break;
    case "details":
      text = text || "Open"; show = !0;
      break;
    default: // include SVGElement and OtherSafeElement
      if (show = hint[2] > ClickType.MaxNotBox) {
        text = hint[2] > ClickType.frame ? "Scroll" : "Frame";
      } else if (isHTML && (text = (el as SafeHTMLElement).innerText.trim())) {
        ind = text.indexOf("\n") + 1;
        // tslint:disable-next-line: no-unused-expression
        ind && (ind = text.indexOf("\n", ind)) > 0 ? text = text.slice(0, ind) : 0;
      } else if (localName === "a" && isHTML) {
          let el2 = el.firstElementChild as Element | null;
          text = el2 && VDom.htmlTag_(el2) === "img"
              ? (el2 as HTMLImageElement).alt || (el2 as HTMLImageElement).title : "";
          show = !!text;
      } else if (!isHTML && (el as ElementToHTMLorSVG).tabIndex != null) {
        // demo: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text
        const el2 = localName === "text" ? el as SVGTextElement : el.querySelector("text");
        text = el2 ? el2.innerHTML : text;
        show = !!text;
      } else if (isHTML) { // plain Element
        // demo: https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfrac on Firefox
        text = el.textContent;
      }
      text = isHTML ? text || (el as SafeHTMLElement).title : text;
      break;
    }
    if (text) {
      text = text.trim().slice(0, GlobalConsts.MaxLengthOfHintText).trim();
      if (text && text[0] === ":") {
        text = text.replace(<RegExpOne> /^[:\s]+/, "");
      }
    }
    return { t: show && text ? ":" + text : text, w: null };
  },
  getMatchingHints_ (keyStatus: HintsNS.KeyStatus, text: string, seq: string
      , inited: 0 | 1 | 2): HintsNS.HintItem | 2 | 0 {
    const H = VHints, fullHints = H.hints_ as readonly HintsNS.FilteredHintItem[],
    a = this,
    oldTextSeq = inited > 1 ? keyStatus.textSequence_ : "a";
    let hints = keyStatus.hints_ as HintsNS.FilteredHintItem[];
    if (oldTextSeq !== text) {
      const t2 = text.trim(), t1 = oldTextSeq.trim();
      keyStatus.textSequence_ = text;
      if (t1 !== t2) {
        H.zIndexes_ = H.zIndexes_ && null;
        const search = t2.split(" "),
        oldKeySeq = keyStatus.keySequence_,
        oldHints = t2.startsWith(t1) ? hints : fullHints,
        hasSearch = !!t2,
        indStep = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
            ? 0 : 1 / (1 + oldHints.length);
        let newLen = 2,
        ind = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
            ? 0 : hasSearch ? 1 : GlobalConsts.MaxLengthOfHintText + 1;
        keyStatus.keySequence_ = "";
        if (hasSearch && !fullHints[0].h.w) {
          for (const {h: textHint} of fullHints) {
            // cache lower-case versions for smaller memory usage
            const words = textHint.w = (textHint.t = textHint.t.toLowerCase()).split(a.reForMatch_);
            words[0] || words.shift();
            words.length && (words[words.length - 1] || words.pop());
          }
        }
        hasSearch && (hints = []);
        for (const hint of oldHints) {
          if (hasSearch) {
            const s = a.scoreHint_(hint.h, search);
            (hint.i = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
                && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
                ? s : s && s + (ind -= indStep)) &&
            hints.push(hint);
          } else {
            hint.i = !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
                && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
                ? hint.h.t.length + 1
                : (ind -= indStep) - hint.h.t.length;
          }
        }
        newLen = hints.length;
        if (newLen) {
          keyStatus.hints_ = hasSearch ? hints : hints = oldHints.slice(0);
          if (hasSearch && newLen < 2) { // in case of only 1 hint in fullHints
            return hints[0];
          }
          if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
              && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)) {
            hints.sort((x1, x2) => x1.i - x2.i);
          } else {
            hints.sort((x1, x2) => x2.i - x1.i);
          }
          a.GenerateHintStrings_(hints);
        }
        // hints[].zIndex is reset in .MakeStacks_
        if (inited && (newLen || oldKeySeq)) {
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
          return 2;
        }
      }
      inited && H.setMode_(H.mode_);
    }
    if (keyStatus.keySequence_ !== seq) {
      keyStatus.keySequence_ = seq;
      H.zIndexes_ = H.zIndexes_ && null;
      let index = 0, base = H.chars_.length, last = hints.length;
      for (const ch of seq) { index = index * base + H.chars_.indexOf(ch); }
      if (index * base > last) { return index > last ? 0 : hints[index - 1]; }
      for (const { m: marker, a: key } of hints) {
        const match = key.startsWith(seq);
        marker.style.visibility = match ? "" : "hidden";
        if (match) {
          let child = marker.firstChild as Text | HintsNS.MarkerElement, el: HintsNS.MarkerElement;
          if (child.nodeType === kNode.TEXT_NODE) {
            el = marker.insertBefore(VDom.createElement_("span") as HintsNS.MarkerElement, child);
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
    const oldActive = a.activeHint_;
    const newActive = hints[(keyStatus.tab_ < 0 ? (keyStatus.tab_ += hints.length) : keyStatus.tab_) % hints.length];
    if (oldActive !== newActive) {
      if (oldActive) {
        oldActive.m.classList.remove("MH");
        oldActive.m.style.zIndex = "";
      }
      newActive.m.classList.add("MH");
      newActive.m.style.zIndex = fullHints.length as number | string as string;
      a.activeHint_ = newActive;
    }
    return 2;
  },
  /**
   * total / Math.log(~)
   * * `>=` 1 / `Math.log`(1 + (MaxLengthOfHintText = 256)) `>` 0.18
   * * margin `>=` `0.0001267`
   *
   * so, use `~ * 1e4` to ensure delta > 1
   */
  scoreHint_ (textHint: HintsNS.HintText, searchWords: readonly string[]): number {
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
    if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)) {
      return total && Math.log(1 + textHint.t.length) / total;
    }
    return total * GlobalConsts.MatchingScoreFactorForHintText / Math.log(1 + textHint.t.length);
  }
},
  renderMarkers_ (hintItems: readonly HintsNS.HintItem[]): void {
    const a = VHints, doc = document, useFilter = a.useFilter_,
    noAppend = !!(Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$append
        && VDom.cache_.v < BrowserVer.MinEnsured$ParentNode$$append;
    let exclusionRe: RegExpG | undefined;
    for (const hint of hintItems) {
      let right: string, marker = hint.m;
      if (useFilter) {
        marker.textContent = hint.a;
        right = (hint.h as HintsNS.HintText).t;
        if (!right || right[0] !== ":") { continue; }
        right = (hint.h as HintsNS.HintText).t = right.slice(1);
        right = right.replace(exclusionRe = exclusionRe || a.filterEngine_.getRe_(0), " "
            ).replace(<RegExpOne> /^[^\w\x80-\uffff]+|:[:\s]*$/, "").trim();
        right = right.length > GlobalConsts.MaxLengthOfShownText
            ? right.slice(0, GlobalConsts.MaxLengthOfShownText - 2).trimRight() + "\u2026" // the "\u2026" is wide
            : right;
        if (!right) { continue; }
        right = ": " + right;
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
  initAlphabetEngine_ (hintItems: readonly HintsNS.HintItem[]): void {
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
  matchHintsByKey_ (keyStatus: HintsNS.KeyStatus, e: KeyboardEvent): HintsNS.HintItem | 0 | 2 {
    const h = VHints, {useFilter_: useFilter, filterEngine_: filterEngine} = h;
    let keyChar: string
      , {keySequence_: sequence, textSequence_: textSeq, tab_: oldTab, hints_: hints} = keyStatus
      , key = e.keyCode, doesDetectMatchSingle: 0 | 1 | 2 = 0
      , textSeq0 = textSeq, isSpace = key === kKeyCode.space;
    textSeq = textSeq && textSeq.replace("  ", " ");
    keyStatus.tab_ = isSpace ? oldTab
        : key === kKeyCode.tab ? useFilter ? oldTab - 2 * +e.shiftKey + 1 : 1 - oldTab
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
    } else if (useFilter && key === kKeyCode.enter || isSpace && textSeq0 !== textSeq) {
      // keep .known_ to be 1 - needed by .execute_
      return filterEngine.activeHint_ as NonNullable<typeof filterEngine.activeHint_>;
    } else if (isSpace) { // then useFilter is true
      textSeq = textSeq0 + " ";
    } else if ((keyChar = VKey.char_(e)) && keyChar.length < 2
        && (keyChar = h.doesMapKey_ ? VApi.mapKey_(keyChar, e, keyChar) : keyChar).length < 2) {
      keyChar = useFilter ? keyChar : keyChar.toUpperCase();
      if (h.chars_.indexOf(keyChar) >= 0) {
        sequence += keyChar;
        doesDetectMatchSingle = useFilter || sequence.length < h.maxPrefixLen_ ? 1 : 2;
      } else if (useFilter) {
        let lower = keyChar.toLowerCase();
        if (keyChar !== lower && h.chars_ !== h.chars_.toLowerCase() // ignore {Lo} in h.chars_
            /** this line requires lower.length must be 1 or 0 */
            || (filterEngine.reForMatch_ || (filterEngine.reForMatch_ = filterEngine.getRe_(1))).test(lower)) {
          return 2;
        } else {
          sequence = "";
          textSeq = textSeq !== " " ? textSeq + lower : lower;
        }
      } else {
        return 0;
      }
    } else {
      return 2;
    }
    keyStatus.known_ = 0;
    h.hasExecuted_ = 0;
    if (doesDetectMatchSingle > 1) {
      for (const hint of hints) { if (hint.a === sequence) { return hint; } }
    }
    if (useFilter) {
      return filterEngine.getMatchingHints_(keyStatus, textSeq, sequence, 2);
    } else {
      h.zIndexes_ = h.zIndexes_ && null;
      keyStatus.keySequence_ = sequence;
      const notDoSubCheck = !keyStatus.tab_, wanted = notDoSubCheck ? sequence : sequence.slice(0, -1);
      hints = keyStatus.hints_ = (doesDetectMatchSingle ? hints : h.hints_ as readonly HintsNS.HintItem[]
          ).filter(hint => {
        const pass = hint.a.startsWith(wanted) && (notDoSubCheck || !hint.a.startsWith(sequence));
        hint.m.style.visibility = pass ? "" : "hidden";
        return pass;
      });
      const limit = sequence.length - keyStatus.tab_;
      for (const { m: { childNodes: ref } } of hints) {
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/dom_token_list.cc?q=DOMTokenList::setValue&g=0&l=258
// shows that `.classList.add()` costs more
        for (let j = ref.length - 1; 0 <= --j; ) {
          !(ref[j] as Exclude<HintsNS.MarkerElement, Text>).className !== (j < limit) ||
          ((ref[j] as Exclude<HintsNS.MarkerElement, Text>).className = j < limit ? "MC" : "");
        }
      }
      return hints.length ? 2 : 0;
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
        const a1 = VDom.createElement_("a");
        a1.href = arr[1].replace(<RegExpG> /\\(['"])/g, "$1");
        text = a1.href;
      }
    }
  }
  if (!text || VDom.jsRe_.test(text)
      || src.length > text.length + 7 && (text === (img as HTMLElement & {href?: string}).href)) {
    text = src;
  }
  return text || this.hud_.tip_(kTip.notImg, 1000);
},
getImageName_: (img: SafeHTMLElement): string | null =>
  img.getAttribute("download") || img.getAttribute("alt") || img.title,

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
detectUsableChild_ (el: HTMLIFrameElement | HTMLFrameElement
    ): ContentWindowCore & Ensure<ContentWindowCore, "VApi"> | null {
  let err: boolean | null = true, childEvents: VApiTy | undefined,
  core: ContentWindowCore | void | undefined | 0;
  try {
    err = !el.contentDocument
        || !(core = Build.BTypes & BrowserType.Firefox ? VDom.getWndCore_(el.contentWindow) : el.contentWindow)
        || !(childEvents = core.VApi)
        || childEvents.keydownEvents_(Build.BTypes & BrowserType.Firefox ? VApi.keydownEvents_() : VApi);
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
  return err ? null : core as Exclude<typeof core, 0 | null | undefined | void> & Ensure<ContentWindowCore, "VApi">;
},
_highlightChild (el: HintsNS.LinkEl, tag: string): 0 | 1 | 2 {
  if (!(<RegExpOne> /^i?frame$/).test(tag)) {
    return 0;
  }
  const a = this, { count_: count, options_: options } = a;
  options.mode = a.mode_;
  (a._master || a).mode_ = a.mode_ = HintMode.DEFAULT;
  if (el === VOmni.box_) {
    VOmni.focus_();
    return 1;
  }
  const core = a.detectUsableChild_(el as HTMLIFrameElement | HTMLFrameElement);
  (el as HTMLIFrameElement | HTMLFrameElement).focus();
  if (!core) {
    VApi.send_(kFgReq.execInChild, {
      u: (el as HTMLIFrameElement | HTMLFrameElement).src,
      c: kFgCmd.linkHints, n: count, k: a.keyCode_, a: options
    }, function (res): void {
      if (!res) {
        (el as HTMLIFrameElement | HTMLFrameElement).contentWindow.focus();
      }
    });
  } else {
    core.VApi.focusAndRun_(kFgCmd.linkHints, count, options, 1);
  }
  return 2;
},

Modes_: [
[
  (element, rect): void => {
    const a = VHints, type = VDom.getEditableType_<0>(element), toggleMap = a.options_.toggle;
    const exit: HandlerNS.Handler<any> = event => {
      VKey.removeHandler_(a);
      if (VKey.isEscape_(event) && !VApi.lock_()) {
        VDom.hover_();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    };
    // here not check VDom.lastHovered on purpose
    // so that "HOVER" -> any mouse events from users -> "HOVER" can still work
    VCui.activeEl_ = element;
    VDom.hover_(element, VDom.center_(rect));
    type || element.focus && !(<RegExpI> /^i?frame$/).test(VDom.htmlTag_(element)) && element.focus();
    if (a.mode1_ < HintMode.min_job) { // called from Modes[-1]
      return a.hud_.tip_(kTip.hoverScrollable, 1000);
    }
    a.mode_ & HintMode.queue || VKey.pushHandler_(exit, exit);
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
  (element: HintsNS.LinkEl): void => {
    const a = VDom;
    if (a.lastHovered_ !== element) {
      a.hover_();
    }
    a.lastHovered_ = element;
    a.hover_();
    if (document.activeElement === element) { element.blur && element.blur(); }
  }
  , HintMode.UNHOVER, HintMode.UNHOVER | HintMode.queue
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
    else if ((str = link.getAttribute("data-vim-text"))
        && (str = str.trim())) { /* empty */ }
    else {
      const tag = VDom.htmlTag_(link), isChild = a._highlightChild(link, tag);
      if (isChild) { return isChild > 1; }
      if (tag === "input") {
        let type = (link as HTMLInputElement).type, f: HTMLInputElement["files"];
        if (type === "password") {
          return a.hud_.tip_(kTip.ignorePassword, 2000);
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
      return a.hud_.copied_("", isUrl ? "url" : "");
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
        return a.hud_.show_(kTip.noNewToCopy);
      }
      shownText = `[${lastYanked.length + 1}] ` + str;
      lastYanked.push(str);
    }
    VApi.post_({
      H: kFgReq.copy,
      j: a.options_.join,
      d: lastYanked || str
    });
    a.hud_.copied_(shownText);
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
      VHints.openUrl_(url, true);
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
    /** @todo: how to trigger download */
    VDom.mouse_(a, "click", [0, 0], {altKey_: !0, ctrlKey_: !1, metaKey_: !1, shiftKey_: !1});
    VHints.hud_.tip_(kTip.downloaded, 2000, [text]);
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
      link[kDownload] = "";
    }
    VCui.click_(link, rect, 0, {
      altKey_: !0,
      ctrlKey_: !1,
      metaKey_: !1,
      shiftKey_: !1
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
  , HintMode.DOWNLOAD_LINK
  , HintMode.DOWNLOAD_LINK | HintMode.queue
] as HintsNS.ModeOpt,
[
  (link, rect): void | false => {
    if (VHints.mode_ < HintMode.min_disable_queue) {
      VDom.view_(link);
      link.focus && link.focus();
      VHints._removeFlash || VCui.flash_(link);
    } else {
      VCui.simulateSelect_(link as HintsNS.InputHintItem["d"], rect, !VHints._removeFlash);
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
          VCui.click_(summary, rect, 1);
          a._removeFlash || rect && VCui.flash_(null, rect);
          return false;
      }
      (link as HTMLDetailsElement).open = !(link as HTMLDetailsElement).open;
      return;
    } else if (hint.r && hint.r === link) {
      a.Modes_[0][0](link, rect, hint);
      return;
    } else if (VDom.getEditableType_<0>(link) >= EditableType.TextBox) {
      VCui.simulateSelect_(link as LockableElement, rect, !a._removeFlash);
      return false;
    }
    const mask = a.mode_ & HintMode.mask_focus_new, isMac = !VDom.cache_.o,
    isRight = a.options_.button === "right",
    dblClick = !!a.options_.dblclick && !isRight,
    specialActions = isRight || dblClick,
    newTab = mask > HintMode.newTab - 1 && !specialActions,
    newtab_n_active = newTab && mask > HintMode.newtab_n_active - 1,
    ctrl = newTab && !(a.options_.noCtrlPlusShift && newtab_n_active),
    openUrlInNewTab = dblClick ? kClickAction.forceToDblclick : specialActions || tag !== "a" ? kClickAction.none
        : a.options_.newtab === "force" ? newTab
            ? kClickAction.forceToOpenInNewTab | kClickAction.newTabFromMode : kClickAction.forceToOpenInNewTab
        : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
          ? newTab // need to work around Firefox's popup blocker
            ? kClickAction.plainMayOpenManually | kClickAction.newTabFromMode : kClickAction.plainMayOpenManually
        : kClickAction.none;
    VCui.click_(link, rect, mask > 0 || <number> (link as ElementToHTMLorSVG).tabIndex >= 0, {
      altKey_: !1,
      ctrlKey_: ctrl && !isMac,
      metaKey_: ctrl && isMac,
      shiftKey_: newtab_n_active
    }, openUrlInNewTab, isRight ? kClickButton.second : kClickButton.none
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
