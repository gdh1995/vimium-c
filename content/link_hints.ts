/**
 * focused: 1; new tab: 2; queue: 64; job: 128
 */
const enum HintMode {
  empty = 0, focused = 1, newTab = 2, queue = 64,
  mask_focus_new = focused | newTab, mask_queue_focus_new = mask_focus_new | queue,
  min_job = 128, min_link_job = 136, min_disable_queue = 256,
  DEFAULT = empty,
  OPEN_IN_CURRENT_TAB = DEFAULT, // also 1
  OPEN_IN_NEW_BG_TAB = newTab,
  OPEN_IN_NEW_FG_TAB = newTab | focused,
  OPEN_WITH_QUEUE = queue | newTab,
  OPEN_FG_WITH_QUEUE = queue | newTab | focused,
  HOVER = min_job,
  LEAVE,
  COPY_TEXT,
  SEARCH_TEXT,
  DOWNLOAD_IMAGE,
  OPEN_IMAGE,
  DOWNLOAD_LINK = min_link_job,
  COPY_LINK_URL,
  OPEN_INCOGNITO_LINK,
  EDIT_LINK_URL = min_disable_queue,
    max_link_job = EDIT_LINK_URL,
    min_edit = EDIT_LINK_URL,
  EDIT_TEXT,
    max_edit = EDIT_TEXT,
  FOCUS_EDITABLE,
}
const enum ClickType {
  Default = 0,
  click = Default, edit, listener,
  classname = 4, tabindex,
  maxNotBox = 6, frame = maxNotBox + 1, scrollX, scrollY,
}
declare namespace HintsNS {
  type LinkEl = Hint[0];
  interface ModeOpt {
    [mode: number]: string | undefined;
    activator (this: any, linkEl: LinkEl, hintEl: HTMLSpanElement): void | false;
  }
  interface Options extends SafeObject {
    mode?: string;
    url?: boolean;
  }
  type NestedFrame = false | 0 | null | HTMLIFrameElement | HTMLFrameElement;
  interface ElementIterator<T> {
    (this: { [index: number]: Element, length: number}, fn: (this: T[], value: Element) => void, self: T[]): void;
  }
  interface Filter<T> {
    (this: T[], element: Element): void;
  }
  type LinksMatched = false | null | Marker[];
  type Stack = number[];
  type Stacks = Stack[];
  interface KeyStatus {
    known: boolean;
    newHintLength: number;
    tab: 0 | 1;
  }
  interface VWindow extends Window {
    VHints: typeof VHints,
    VEventMode: typeof VEventMode,
    VDom: {
      isHTML (): boolean;
    };
  }
  interface ElementList { readonly length: number; [index: number]: Element; }
}

var VHints = {
  CONST: {
    OPEN_IN_CURRENT_TAB: HintMode.OPEN_IN_CURRENT_TAB,
    OPEN_IN_NEW_BG_TAB: HintMode.OPEN_IN_NEW_BG_TAB,
    OPEN_IN_NEW_FG_TAB: HintMode.OPEN_IN_NEW_FG_TAB,
    OPEN_WITH_QUEUE: HintMode.OPEN_WITH_QUEUE,
    OPEN_FG_WITH_QUEUE: HintMode.OPEN_FG_WITH_QUEUE,
    HOVER: HintMode.HOVER,
    LEAVE: HintMode.LEAVE,
    COPY_TEXT: HintMode.COPY_TEXT,
    SEARCH_TEXT: HintMode.SEARCH_TEXT,
    DOWNLOAD_IMAGE: HintMode.DOWNLOAD_IMAGE,
    OPEN_IMAGE: HintMode.OPEN_IMAGE,
    DOWNLOAD_LINK: HintMode.DOWNLOAD_LINK,
    COPY_LINK_URL: HintMode.COPY_LINK_URL,
    OPEN_INCOGNITO_LINK: HintMode.OPEN_INCOGNITO_LINK,
    FOCUS_EDITABLE: HintMode.FOCUS_EDITABLE,
    EDIT_LINK_URL: HintMode.EDIT_LINK_URL,
    EDIT_TEXT: HintMode.EDIT_TEXT
  } as Dict<HintMode>,
  box: null as HTMLDivElement | null,
  hintMarkers: null as HintsNS.Marker[] | null,
  mode: 0 as HintMode,
  mode1: 0 as HintMode,
  modeOpt: null as HintsNS.ModeOpt | null,
  forHover: false,
  count: 0,
  lastMode: 0 as HintMode,
  tooHigh: false,
  isClickListened: true,
  ngEnabled: null as boolean | null,
  keyStatus: {
    known: false,
    newHintLength: 0,
    tab: 0
  } as HintsNS.KeyStatus,
  initTimer: 0,
  isActive: false,
  noHUD: false,
  options: null as never as FgOptions,
  timer: 0,
  activate (count?: number, options?: FgOptions | null): void {
    if (this.isActive) { return; }
    if (document.body == null) {
      if (!this.initTimer && document.readyState === "loading") {
        this.initTimer = setTimeout(this.activate.bind(this, count, options), 300);
        return;
      }
      if (!VDom.isHTML()) { return; }
    }
    VHandler.remove(this);
    this.setModeOpt((count as number) | 0, Object.setPrototypeOf(options || (options = {} as any as FgOptions), null));
    let str = options.characters ? options.characters + "" : VSettings.cache.linkHintCharacters;
    if (str.length < 3) {
      this.clean(true);
      return VHUD.showForDuration("Characters for LinkHints are too few.", 1000);
    }

    let elements: Hint[] | undefined;
    const arr = VDom.getViewBox();
    this.tooHigh = (document.documentElement as HTMLElement).scrollHeight  / window.innerHeight > 20;
    this.maxLeft = arr[2], this.maxTop = arr[3], this.maxRight = arr[4];
    if (!this.frameNested) {
      elements = this.getVisibleElements();
    }
    if (this.frameNested) {
      if (this.tryNestedFrame("VHints.activate", (count as number) | 0, this.options)) {
        return this.clean();
      }
      elements || (elements = this.getVisibleElements());
    }
    if ((elements as Hint[]).length <= 0) {
      this.clean(true);
      return VHUD.showForDuration("No links to select.", 1000);
    }

    if (this.box) { this.box.remove(); this.box = null; }
    this.hintMarkers = (elements as Hint[]).map(this.createMarkerFor, this);
    this.adjustMarkers(elements as Hint[]);
    elements = undefined;
    this.alphabetHints.initMarkers(this.hintMarkers, str);

    this.noHUD = arr[3] <= 40 || arr[2] <= 320;
    this.setMode(this.mode);
    this.box = VDom.UI.addElementList(this.hintMarkers, arr);

    this.isActive = true;
    VHandler.push(this.onKeydown, this);
    return VEventMode.onWndBlur(this.ResetMode);
  },
  setModeOpt (count: number, options: HintsNS.Options): void {
    if (this.options === options) { return; }
    let ref = this.Modes, mode = (this.CONST[options.mode as string] as number) | 0, modeOpt: HintsNS.ModeOpt | undefined;
    if (mode === HintMode.EDIT_TEXT && options.url) {
      mode = HintMode.EDIT_LINK_URL;
    }
    if (count > 1) { mode <= HintMode.min_disable_queue ? (mode |= HintMode.queue) : (count = 1); }
    for (let i in ref) {
      if (ref.hasOwnProperty(i) && ((ref as Dict<HintsNS.ModeOpt>)[i] as HintsNS.ModeOpt).hasOwnProperty(mode)) {
        modeOpt = (ref as Dict<HintsNS.ModeOpt>)[i] as HintsNS.ModeOpt;
        break;
      }
    }
    if (!modeOpt) {
      modeOpt = ref.DEFAULT;
      mode = count > 1 ? HintMode.OPEN_WITH_QUEUE : HintMode.OPEN_IN_CURRENT_TAB;
    }
    this.modeOpt = modeOpt;
    this.options = options;
    this.count = count;
    return this.setMode(mode, true);
  },
  setMode (mode: HintMode, slient?: true): void {
    this.mode = mode;
    this.mode1 = mode = mode & ~HintMode.queue;
    this.forHover = mode >= HintMode.HOVER && mode <= HintMode.LEAVE;
    if (slient || this.noHUD) { return; }
    return VHUD.show((this.modeOpt as HintsNS.ModeOpt)[mode] as string);
  },
  tryNestedFrame (command: string, a: number, b: FgOptions): boolean {
    this.frameNested === false && this.checkNestedFrame();
    if (!this.frameNested) { return false; }
    let child: HintsNS.VWindow, done = false;
    try {
      child = this.frameNested.contentWindow as HintsNS.VWindow;
      if (!child.VDom.isHTML()) { throw Error("vimium-disabled"); }
      if (command === "VHints.activate") {
        (done = child.VHints.isActive) && child.VHints.deactivate(true);
      }
      child.VEventMode.keydownEvents(VEventMode.keydownEvents());
    } catch (e) {
      // It's cross-site, or Vimium++ on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      this.frameNested = null;
      return false;
    }
    child.focus();
    if (done) { return true; }
    if (document.readyState !== "complete") { this.frameNested = false; }
    VUtils.execCommand(child, command, a, b);
    return true;
  },
  maxLeft: 0,
  maxTop: 0,
  maxRight: 0,
  zIndexes: null as null | false | HintsNS.Stacks,
  createMarkerFor (link: Hint) {
    let marker = VDom.createElement("span") as HintsNS.Marker, i: number;
    marker.clickableItem = link[0];
    i = link.length < 5 ? link[1][0] : (link[4] as [VRect, number])[0][0] + (link[4] as [VRect, number])[1];
    marker.className = link[2] < 7 ? "LH" : "LH BH";
    const st = marker.style;
    st.left = i + "px";
    if (i > this.maxLeft) {
      st.maxWidth = this.maxRight - i + "px";
    }
    i = link[1][1];
    st.top = i + "px";
    if (i > this.maxTop) {
      st.maxHeight = this.maxTop - i + 15 + "px";
    }
    link[3] && (marker.linkRect = link[3]);
    return marker;
  },
  adjustMarkers (elements: Hint[]): void {
    if (VDom.bodyZoom === 1 || !VDom.UI.root) { return; }
    const root = VDom.UI.root, z = "" + 1 / VDom.bodyZoom;
    let arr = this.hintMarkers as HintsNS.Marker[], i = elements.length - 1;
    if (elements[i][0] === Vomnibar.box) { arr[i--].style.zoom = z; }
    if (!root.querySelector('#HelpDialog') || i < 0) { return; }
    while (0 <= i && root.contains(elements[i][0])) { arr[i--].style.zoom = z; }
  },
  btnRe: <RegExpOne> /\b(?:[Bb](?:utto|t)n|[Cc]lose)(?:$| )/,
  GetClickable (this: Hint[], element: Element): void {
    let arr: VRect | null, isClickable = null as boolean | null, s: string | null, type = ClickType.Default;
    if (!(element instanceof HTMLElement) || element instanceof HTMLFormElement) {
      if (element instanceof SVGElement) {
        type = element.vimiumHasOnclick || element.getAttribute("onclick")
            || VHints.ngEnabled && element.getAttribute("ng-click")
            || (s = element.getAttribute("jsaction")) && VHints.checkJSAction(s) ? ClickType.listener
          : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 ? ClickType.tabindex
          : type;
        if (type > ClickType.Default && (arr = VDom.getVisibleClientRect(element))) {
          this.push([element, arr, type]);
        }
      }
      return;
    }
    switch (element.tagName.toLowerCase()) {
    case "a": case "details": isClickable = true; break;
    case "frame": case "iframe":
      isClickable = element !== VFindMode.box;
      type = isClickable ? ClickType.frame : ClickType.Default;
      break;
    case "input": if ((element as HTMLInputElement).type === "hidden") { return; } // no break;
    case "textarea":
      if ((element as HTMLTextAreaElement | HTMLInputElement).disabled && VHints.mode1 <= HintMode.LEAVE) { return; }
      if (!(element as HTMLTextAreaElement | HTMLInputElement).readOnly || VHints.mode >= HintMode.min_job
        || element instanceof HTMLInputElement && (element.type in VDom.uneditableInputs)) {
        isClickable = true;
      }
      break;
    case "label":
      if ((element as HTMLLabelElement).control) {
        let el2 = (element as HTMLLabelElement).control as HTMLElement, arr2: Hint[] = [];
        if (el2.getAttribute("disabled")) { return; }
        VHints.GetClickable.call(arr2, el2);
        isClickable = arr2.length === 0;
      }
      break;
    case "button": case "select":
      isClickable = !(element as HTMLButtonElement | HTMLSelectElement).disabled || VHints.mode1 > HintMode.LEAVE; break;
    case "object": case "embed":
      s = (element as HTMLObjectElement | HTMLEmbedElement).type;
      if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
      return;
    case "img":
      if ((element as HTMLImageElement).useMap && VDom.getClientRectsForAreas(element as HTMLImageElement, this)) { return; }
      if ((VHints.forHover && !(element.parentNode instanceof HTMLAnchorElement))
        || ((s = element.style.cursor as string) ? s !== "default"
          : (s = getComputedStyle(element).cursor as string) && (s.indexOf("zoom") >= 0 || s.startsWith("url"))
        )) {
        isClickable = true;
      }
      break;
    case "div": case "ul": case "pre": case "ol":
      type = (type = element.clientHeight) && type + 5 < element.scrollHeight ? ClickType.scrollY
        : (type = element.clientWidth) && type + 5 < element.scrollWidth ? ClickType.scrollX : ClickType.Default;
      break;
    }
    if (isClickable === null) {
      type = (s = element.contentEditable) !== "inherit" && s && s !== "false" ? ClickType.edit
        : (element.vimiumHasOnclick && VHints.isClickListened) || element.getAttribute("onclick")
          || VHints.ngEnabled && element.getAttribute("ng-click")
          || (s = element.getAttribute("role")) && (s = s.toLowerCase()
            , s === "button" || s === "link" || s === "checkbox" || s === "radio" || s.startsWith("menuitem"))
          || VHints.forHover && element.getAttribute("onmouseover")
          || (s = element.getAttribute("jsaction")) && VHints.checkJSAction(s) ? ClickType.listener
        : (s = element.getAttribute("tabindex")) && parseInt(s, 10) >= 0 ? ClickType.tabindex
        : type > ClickType.tabindex ? type : (s = element.className) && VHints.btnRe.test(s) ? ClickType.classname
        : ClickType.Default;
    }
    if ((isClickable || type > ClickType.Default) && (arr = VDom.getVisibleClientRect(element))
        && (type < ClickType.scrollX || VScroller.isScrollable(element, type - 8 as 0 | 1))
        && ((s = element.getAttribute("aria-hidden")) == null || s && s.toLowerCase() !== "true")
        && ((s = element.getAttribute("aria-disabled")) == null || (s && s.toLowerCase() !== "true")
          || VHints.mode >= HintMode.min_job)
    ) { this.push([element, arr, type]); }
  },
  noneActionRe: <RegExpOne> /\._\b(?![\$\.])/,
  checkJSAction (str: string): boolean {
    for (let s of str.split(";")) {
      s = s.trim();
      const t = s.startsWith("click:") ? (s = s.substring(6)) : s && s.indexOf(":") === -1 ? s : null;
      if (t && t !== "none" && !this.noneActionRe.test(t)) {
        return true;
      }
    }
    return false;
  },
  GetEditable (this: Hint[], element: Element): void {
    if (!(element instanceof HTMLElement) || element instanceof HTMLFormElement) { return; }
    let arr: VRect | null, type = ClickType.Default, s: string;
    switch (element.tagName.toLowerCase()) {
    case "input":
      if ((element as HTMLInputElement).type in VDom.uneditableInputs) {
        return;
      } // no break;
    case "textarea":
      if ((element as HTMLInputElement | HTMLTextAreaElement).disabled ||
          (element as HTMLInputElement | HTMLTextAreaElement).readOnly) { return; }
      break;
    default:
      if ((s = element.contentEditable) === "inherit" || !s || s === "false") { return; }
      type = 1;
      break;
    }
    if (arr = VDom.getVisibleClientRect(element)) {
      this.push([element, arr, type]);
    }
  },
  GetLinks (this: Hint[], element: Element): void {
    let a: string | null, arr: VRect | null;
    if (element instanceof HTMLAnchorElement && ((a = element.getAttribute("href")) && a !== "#"
        && (a.charCodeAt(10) !== 58 || a.substring(0, 11).toLowerCase() !== "javascript:")
        || element.hasAttribute("data-vim-url"))) {
      if (arr = VDom.getVisibleClientRect(element)) {
        this.push([element, arr, ClickType.click]);
      }
    }
  },
  imageUrlRe: <RegExpI> /\.(?:bmp|gif|ico|jpe?g|png|svg|webp)\b/i,
  getImagesInImg (arr: Hint[], element: HTMLImageElement): void {
    if (!element.src) { return; }
    let rect: ClientRect | undefined, cr: VRect | null = null, w: number, h: number;
    if ((w = element.width) < 8 && (h = element.height) < 8) {
      if (w !== h || (w !== 0 && w !== 3)) { return; }
      rect = element.getClientRects()[0];
      if (rect) {
        w = rect.left; h = rect.top;
        cr = VRect.cropRectToVisible(w, h, w + 8, h + 8);
      }
    } else if (rect = element.getClientRects()[0]) {
      w = rect.right + (rect.width < 3 ? 3 : 0);
      h = rect.bottom + (rect.height < 3 ? 3 : 0);
      cr = VRect.cropRectToVisible(rect.left, rect.top, w, h);
    }
    if (cr && window.getComputedStyle(element).visibility === "visible") {
      arr.push([element, cr, ClickType.Default]);
    }
  },
  GetImages (this: Hint[], element: Element): void {
    if (element instanceof HTMLImageElement) { return VHints.getImagesInImg(this, element); }
    if (!(element instanceof HTMLAnchorElement)) { return; }
    let str = element.getAttribute("href"), cr: VRect | null;
    if (str && str.length > 4 && VHints.imageUrlRe.test(str)) {
      if (cr = VDom.getVisibleClientRect(element)) {
        this.push([element, cr, ClickType.Default]);
      }
    }
  },
  traverse: function (this: any, key: string
      , filter: HintsNS.Filter<Hint | Element>, root?: Document | Element): Hint[] | Element[] {
    VDom.prepareCrop();
    if ((this as typeof VHints).ngEnabled === null && key === "*") {
      (this as typeof VHints).ngEnabled = document.querySelector('.ng-scope') != null;
    }
    let query: string = key, addUI = true;
    if (VSettings.cache.deepHints) {
      // `/deep/` is only applyed on Shadow DOM v0, and Shadow DOM v1 does not support it at all
      // ref: https://groups.google.com/a/chromium.org/forum/#!topic/blink-dev/HX5Y8Ykr5Ns
      query = "* /deep/ " + key;
      addUI = typeof Element.prototype.attachShadow === "function";
    }
    const output: Hint[] | Element[] = [], isTag = (<RegExpOne>/^\*$|^[a-z]+$/).test(query),
    box = root || document.webkitFullscreenElement || document;
    let list: HintsNS.ElementList | null = isTag ? box.getElementsByTagName(query) : box.querySelectorAll(query);
    if (!root && (this as typeof VHints).tooHigh && box === document && list.length >= 15000) {
      list = (this as typeof VHints).getElementsInViewPort(list);
    }
    (output.forEach as HintsNS.ElementIterator<Hint | Element>).call(list, filter, output);
    if (root) { return output; }
    list = null;
    if (addUI && VDom.UI.root) {
      (Array.prototype.forEach as any).call(VDom.UI.root.querySelectorAll(key), filter, output);
    }
    const wantClickable = (filter as Function) === (this as typeof VHints).GetClickable && key === "*";
    if (wantClickable) { (this as typeof VHints).deduplicate(output as Hint[]); }
    if ((this as typeof VHints).frameNested !== false) {}
    else if (wantClickable) {
      (this as typeof VHints).checkNestedFrame(output as Hint[]);
    } else if (output.length > 0) {
      (this as typeof VHints).frameNested = null;
    } else {
      (this as typeof VHints).checkNestedFrame();
    }
    return output as Hint[];
  } as {
    (key: string, filter: HintsNS.Filter<HTMLElement>, root: Document | Element): HTMLElement[];
    (key: string, filter: HintsNS.Filter<Hint>): Hint[];
  },
  getElementsInViewPort (list: HintsNS.ElementList): HintsNS.ElementList {
    const result: Element[] = [], height = window.innerHeight;
    for (let i = 1, len = list.length; i < len; i++) { // skip docEl
      const el = list[i];
      if (el instanceof HTMLFormElement) { continue; }
      const cr = el.getBoundingClientRect();
      if (cr.top < height && cr.bottom > 0) {
        result.push(el);
        continue;
      }
      const last = el.lastElementChild;
      if (!last) { continue; }
      while (list[++i] !== last) {}
      i--;
    }
    return result.length > 12 ? result : list;
  },
  deduplicate (list: Hint[]): void {
    let j = list.length, i: number, k: ClickType;
    while (0 < --j) {
      if (list[i = j][2] !== ClickType.classname) {
      } else if ((k = list[--j][2]) > ClickType.frame || !this.isDescendant(list[i][0], list[j][0])) {
        continue;
      } else if (VRect.isContaining(list[j][1], list[i][1])) {
        list.splice(i, 1);
        continue;
      } else if (k < ClickType.listener || j === 0) {
        continue;
      }
      while (0 < j && (k = list[j - 1][2]) >= ClickType.listener && k <= ClickType.tabindex
          && this.isDescendant(list[j][0], list[j - 1][0])) {
        j--;
        if (j === i - 3) { break; }
      }
      if (j < i) {
        list.splice(j, i - j);
      }
    }
    i = list[0] ? +(list[0][0] === document.documentElement) : 0;
    if (list[i] && list[i][0] === document.body) { ++i; }
    if (i > 0) { i === 1 ? list.shift() : list.splice(0, i); }
  },
  isDescendant (d: Node, p: Element): boolean {
    let i = 3, c: EnsuredMountedElement | null | undefined, f: Node | null;
    for (; 0 < i-- && (c = d.parentNode as EnsuredMountedElement | null) !== p && c; d = c) {}
    if (c !== p) { return false; }
    for (; ; ) {
      if (c.childElementCount !== 1 || ((f = c.firstChild) instanceof Text && f.data.trim())) { return false; }
      if (i === 2) { break; }
      c = c.firstElementChild; i++;
    }
    return true;
  },
  frameNested: false as HintsNS.NestedFrame,
  checkNestedFrame: function(output?: Hint[]): void {
    const res = this._getNestedFrame(output);
    this.frameNested = res === false && document.readyState === "complete" ? null : res;
  },
  _getNestedFrame (output?: Hint[]): HintsNS.NestedFrame {
    if (window.frames[0] == null) { return false; }
    if (document.webkitIsFullScreen) { return 0; }
    if (output == null) {
      if (!VDom.isHTML()) { return false; }
      output = [];
      VDom.prepareCrop();
      type Iter = HintsNS.ElementIterator<Hint>;
      ([].forEach as Iter).call(document.querySelectorAll("iframe,frame"), this.GetClickable, output = []);
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
        && getComputedStyle(element).visibility === 'visible'
    ) {
      return element;
    }
    return null;
  },
  getVisibleElements (): Hint[] {
    let _i: number = this.mode1;
    const isNormal = _i < HintMode.min_job, visibleElements = _i === HintMode.DOWNLOAD_IMAGE
        || _i === HintMode.OPEN_IMAGE ? this.traverse("a[href],img[src]", this.GetImages)
      : _i >= HintMode.min_link_job && _i <= HintMode.max_link_job ? this.traverse("a", this.GetLinks)
      : this.traverse("*", _i === HintMode.FOCUS_EDITABLE ? this.GetEditable : this.GetClickable);
    if (this.maxRight > 0) {
      _i = Math.ceil(Math.log(visibleElements.length) / Math.log(VSettings.cache.linkHintCharacters.length));
      this.maxLeft -= 11 * _i + 8;
    }
    visibleElements.reverse();

    const obj = [null as never, null as never] as [VRect[], VRect], func = VRect.SubtractSequence.bind(obj);
    let r2 = null as VRect[] | null, t: VRect, reason: ClickType, visibleElement: Hint;
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
        t[1] > this.maxTop && t[1] > r[1] || t[0] > this.maxLeft && t[0] > r[0] ||
          r2.length === 1 && !VRect.testCrop(t) || (visibleElement[1] = t);
      } else if ((reason = visibleElement[2]) === ClickType.classname
            || (reason === ClickType.listener ? isNormal : reason === ClickType.tabindex)
          && visibleElement[0].contains(visibleElements[_i][0])) {
        visibleElements.splice(_len, 1);
      } else {
        const _ref = visibleElement[4] || [r, 0];
        r = _ref[0];
        for (let _k = _len; _i <= --_k; ) {
          t = visibleElements[_k][1];
          if (r[0] >= t[0] && r[1] >= t[1] && r[0] < t[0] + 20 && r[1] < t[1] + 15) {
            visibleElements[_k][4] = [r, _ref[1] + 13];
            break;
          }
        }
      }
      r2 = null;
    }
    return visibleElements.reverse();
  },
  onKeydown (event: KeyboardEvent): HandlerResult {
    let linksMatched: HintsNS.LinksMatched, i: number;
    if (event.repeat) {
      // NOTE: should always prevent repeated keys.
    } else if (VKeyboard.isEscape(event)) {
      this.deactivate();
    } else if ((i = event.keyCode) === VKeyCodes.esc) {
      return HandlerResult.Suppress;
    } else if (i > VKeyCodes.f1 && i <= VKeyCodes.f12) {
      this.ResetMode();
      if (i !== VKeyCodes.f2) { return HandlerResult.Nothing; }
      i = VKeyboard.getKeyStat(event);
      if (i === KeyStat.shiftKey) {
        this.isClickListened = !this.isClickListened;
      } else if (i === KeyStat.plain) {
        VSettings.cache.deepHints = !VSettings.cache.deepHints;
      }
      setTimeout(this.reinit.bind(this, null), 0);
    } else if (i === VKeyCodes.shiftKey) {
      if (this.mode < HintMode.min_job) {
        if (VKeyboard.getKeyStat(event) === KeyStat.shiftKey) {
          this.lastMode = this.mode;
        }
        this.setMode((this.mode | HintMode.focused) ^ (this.mode < HintMode.queue ?
          HintMode.mask_focus_new : HintMode.mask_queue_focus_new));
      }
    } else if (i === VKeyCodes.ctrlKey || i === VKeyCodes.metaKey) {
      if (this.mode < HintMode.min_job) {
        if (!(event.shiftKey || event.altKey)) {
          this.lastMode = this.mode;
        }
        this.setMode((this.mode | HintMode.newTab) ^ HintMode.focused);
      }
    } else if (i === VKeyCodes.altKey) {
      if (this.mode < HintMode.min_disable_queue) {
        if (VKeyboard.getKeyStat(event) === KeyStat.altKey) {
          this.lastMode = this.mode;
        }
        this.setMode(((this.mode >= HintMode.min_job ? HintMode.empty : HintMode.newTab) | this.mode) ^ HintMode.queue);
      }
    } else if (i >= VKeyCodes.pageup && i <= VKeyCodes.down) {
      VEventMode.scroll(event);
      this.ResetMode();
    } else if (i === VKeyCodes.space) {
      this.zIndexes === false || this.rotateHints(event.shiftKey);
      event.shiftKey && this.ResetMode();
    } else if (!(linksMatched = this.alphabetHints.matchHintsByKey(this.hintMarkers as HintsNS.Marker[], event, this.keyStatus))){
      if (linksMatched === false) {
        setTimeout(this.reinit.bind(this, null), 0);
      }
    } else if (linksMatched.length === 0) {
      this.deactivate(this.keyStatus.known);
    } else if (linksMatched.length === 1) {
      VUtils.Prevent(event);
      this.activateLink(linksMatched[0]);
    } else {
      const limit = this.keyStatus.tab ? 0 : this.keyStatus.newHintLength;
      for (i = linksMatched.length; 0 <= --i; ) {
        let ref = linksMatched[i].childNodes as NodeListOf<HTMLSpanElement>, j = ref.length;
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
  ResetMode (): void {
    if (VHints.mode >= HintMode.min_disable_queue || VHints.lastMode === VHints.mode) { return; }
    const d = VEventMode.keydownEvents();
    if (d[VKeyCodes.ctrlKey] || d[VKeyCodes.metaKey] || d[VKeyCodes.shiftKey] || d[VKeyCodes.altKey]) {
      return VHints.setMode(VHints.lastMode);
    }
  },
  _resetMarkers (): void {
    let ref = this.hintMarkers, i = 0, len = ref ? ref.length : 0;
    this.hintMarkers = this.zIndexes = null;
    while (i < len) { (ref as HintsNS.Marker[])[i++].clickableItem = null as never; }
  },
  activateLink (hintEl: HintsNS.Marker): void {
    let rect: VRect | null | undefined, clickEl: HintsNS.LinkEl | null = hintEl.clickableItem;
    this._resetMarkers();
    if (VDom.isInDOM(clickEl)) {
      // must get outline first, because clickEl may hide itself when activated
      rect = hintEl.linkRect || VDom.UI.getVRect(clickEl);
      if ((this.modeOpt as HintsNS.ModeOpt).activator.call(this, clickEl, hintEl) !== false && rect) {
        setTimeout(function(force) {
          (force || document.hasFocus()) && VDom.UI.flash(null, rect as VRect);
        }, 17, clickEl instanceof HTMLIFrameElement || clickEl instanceof HTMLFrameElement);
      }
    } else {
      clickEl = null;
      VHUD.showForDuration("The link has been removed from the page", 2000);
    }
    if (!(this.mode & HintMode.queue)) {
      this.setupCheck(clickEl, null);
      return this.deactivate(true);
    }
    this.isActive = false;
    setTimeout(function(): void {
      const _this = VHints;
      _this.reinit(clickEl, rect);
      if (1 === --_this.count && _this.isActive) {
        return _this.setMode(_this.mode1);
      }
    }, 0);
  },
  reinit (lastEl?: HintsNS.LinkEl | null, rect?: VRect | null): void {
    this.isActive = false;
    this.keyStatus.tab = 0;
    this.zIndexes = null;
    this._resetMarkers();
    const isClick = this.mode < HintMode.min_job;
    this.activate(0, this.options);
    return this.setupCheck(lastEl, rect, isClick);
  },
  setupCheck (el?: HintsNS.LinkEl | null, r?: VRect | null, isClick?: boolean): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = 0; }
    if (el && (isClick === true || this.mode < HintMode.min_job)) {
      this.timer = setTimeout(this.CheckLast, 255, el, r);
    }
  },
  CheckLast (this: void, el: HintsNS.LinkEl, r?: VRect | null): void {
    const _this = VHints;
    if (!_this) { return; }
    _this.timer = 0;
    VDom.prepareCrop();
    const r2 = VDom.getVisibleClientRect(el);
    if (!r2 && VDom.lastHovered === el) {
      VDom.lastHovered = null;
    }
    if (r && _this.isActive && (_this.hintMarkers as HintsNS.Marker[]).length < 64
        && !_this.alphabetHints.hintKeystroke
        && (!r2 || Math.abs(r2[0] - r[0]) > 100 || Math.abs(r2[1] - r[1]) > 60)) {
      return _this.reinit();
    }
  },
  clean (keepHUD?: boolean): void {
    this.options = this.modeOpt = this.zIndexes = this.hintMarkers = null as never;
    this.lastMode = this.mode = this.mode1 = this.count =
    this.maxLeft = this.maxTop = this.maxRight = 0;
    this.tooHigh = false;
    if (this.box) {
      this.box.remove();
      this.box = null;
    }
    keepHUD || VHUD.hide();
    const alpha = this.alphabetHints;
    alpha.hintKeystroke = alpha.chars = "";
    alpha.countMax = 0;
    return VEventMode.onWndBlur(null);
  },
  deactivate (suppressType?: boolean): void {
    this.clean(VHUD.text !== (this.modeOpt as HintsNS.ModeOpt)[this.mode] as string);
    this.keyStatus.tab = this.keyStatus.newHintLength = 0;
    VHandler.remove(this);
    this.isActive = this.noHUD = false;
    if (suppressType != null) { return VDom.UI.suppressTail(suppressType); }
  },
  rotateHints (reverse?: boolean): void {
    let ref = this.hintMarkers as HintsNS.Marker[], stacks = this.zIndexes;
    if (!stacks) {
      stacks = [] as HintsNS.Stacks;
      ref.forEach(this.MakeStacks, [[], stacks] as [Array<ClientRect | null>, HintsNS.Stacks]);
      stacks = stacks.filter(function(stack) { return stack.length > 1; });
      if (stacks.length <= 0) {
        this.zIndexes = this.keyStatus.newHintLength <= 0 ? false : null;
        return;
      }
      this.zIndexes = stacks;
    }
    for (const stack of stacks) {
      reverse && stack.reverse();
      const i = stack[stack.length - 1];
      let oldI = ref[i].style.zIndex || i;
      for (const j of stack) {
        const style = ref[j].style, newI = style.zIndex || j;
        style.zIndex = oldI as string;
        oldI = newI;
      }
      reverse && stack.reverse();
    }
  },
  MakeStacks (this: [Array<ClientRect | null>, HintsNS.Stacks], marker: HintsNS.Marker, i: number) {
    let rects = this[0];
    if (marker.style.visibility === "hidden") { rects.push(null); return; }
    const stacks = this[1], m = marker.getClientRects()[0];
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
      if (k >= len3) {}
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
  unhoverLast (): void {
    VDom.unhoverLast(null);
    return VHUD.showForDuration("The last element is unhovered");
  },

alphabetHints: {
  chars: "",
  hintKeystroke: "",
  countMax: 0,
  countLimit: 0,
  numberToHintString (number: number): string {
    const characterSet = this.chars, base = characterSet.length;
    let hintString = "";
    do {
      let remainder = number % base;
      number = (number / base) | 0;
      hintString = characterSet[remainder] + hintString;
    } while (number > 0);
    number = this.countMax - hintString.length - +(number < this.countLimit);
    if (number > 0) {
      hintString = this.repeat(characterSet[0], number) + hintString;
    }
    return hintString;
  },
  initMarkers (hintMarkers: HintsNS.Marker[], str: string): void {
    this.chars = str.toUpperCase();
    this.hintKeystroke = "";
    for (let end = hintMarkers.length, hints = this.buildHintIndexes(end); 0 <= --end; ) {
      const marker = hintMarkers[end],
      hintString = this.numberToHintString(hints[end]);
      marker.hintString = hintString;
      for (let i = 0, len = hintString.length; i < len; i++) {
        const node = document.createElement('span');
        node.textContent = hintString[i];
        marker.appendChild(node);
      }
    }
    this.countMax -= (this.countLimit > 0) as boolean | number as number;
    this.countLimit = 0;
  },
  buildHintIndexes (linkCount: number): number[] {
    let hints: number[], i: number, end = this.chars.length;
    const dn = Math.ceil(Math.log(linkCount) / Math.log(end));
    end = ((Math.pow(end, dn) - linkCount) / (end - 1)) | 0;
    this.countMax = dn; this.countLimit = end;
    for (hints = [], i = 0; i < end; i++) {
      hints.push(i);
    }
    for (end *= this.chars.length - 1; i < linkCount; i++) {
      hints.push(i + end);
    }
    return this.shuffleHints(hints);
  },
  shuffleHints (hints: number[]): number[] {
    const result: number[] = [], count = hints.length, len = this.chars.length, start = (count % len);
    for (let max = count - start + len, i = 0; i < len; i++) {
      if (i === start) { max -= len; }
      for (let j = i; j < max; j += len) {
        result.push(hints[j]);
      }
    }
    return result;
  },
  matchHintsByKey (hintMarkers: HintsNS.Marker[], event: KeyboardEvent, keyStatus: HintsNS.KeyStatus): HintsNS.LinksMatched {
    let keyChar: string, key = event.keyCode, arr = null as HintsNS.Marker[] | null;
    if (key === VKeyCodes.tab) {
      if (!this.hintKeystroke) {
        return false;
      }
      keyStatus.tab = keyStatus.tab ? 0 : 1;
    } else if (keyStatus.tab) {
      this.hintKeystroke = "";
      keyStatus.tab = 0;
    }
    keyStatus.known = true;
    if (key === VKeyCodes.tab) {}
    else if (key === VKeyCodes.backspace || key === VKeyCodes.deleteKey || key === VKeyCodes.f1) {
      if (!this.hintKeystroke) {
        return [];
      }
      this.hintKeystroke = this.hintKeystroke.slice(0, -1);
    } else if (keyChar = VKeyboard.getKeyChar(event).toUpperCase()) {
      if (this.chars.indexOf(keyChar) === -1) {
        return [];
      }
      this.hintKeystroke += keyChar;
      arr = [];
    } else {
      return null;
    }
    keyChar = this.hintKeystroke;
    keyStatus.newHintLength = keyChar.length;
    keyStatus.known = false;
    VHints.zIndexes && (VHints.zIndexes = null);
    const wanted = !keyStatus.tab;
    if (arr !== null && keyChar.length >= this.countMax) {
      hintMarkers.some(function(linkMarker): boolean {
        return linkMarker.hintString === keyChar && ((arr as HintsNS.Marker[]).push(linkMarker), true);
      });
      if (arr.length === 1) { return arr; }
    }
    return hintMarkers.filter(function(linkMarker) {
      const pass = linkMarker.hintString.startsWith(keyChar) === wanted;
      linkMarker.style.visibility = pass ? "" : "hidden";
      return pass;
    });
  },
  repeat (this: void, s: string, n: number): string {
    if (s.repeat) { return s.repeat(n); }
    for (var s2 = s; --n; ) { s2 += s; }
    return s2;
  }
},

getUrlData (link: HTMLAnchorElement): string {
  const str = link.getAttribute("data-vim-url");
  if (str) {
    link = VDom.createElement("a");
    link.href = str.trim();
  }
  return link.href;
},

highlightChild (child: HintsNS.VWindow): false | void {
  setTimeout(function() { child.focus(); }, 0);
  try {
    child.VEventMode.keydownEvents(VEventMode.keydownEvents());
  } catch (e) {
    return;
  }
  child.VEventMode.exitGrab();
  const lh = child.VHints;
  lh.isActive = false;
  lh.activate(this.count, this.options);
  lh.isActive && lh.setMode(this.mode);
  return false;
},

Modes: {
HOVER: {
  "128": "Hover over node",
  "192": "Hover over nodes continuously",
  activator (element): void {
    const type = VDom.getEditableType(element);
    VDom.unhoverLast(element);
    VScroller.current = element;
    if (!type && element.tabIndex >= 0) { element.focus(); }
    if ((this as typeof VHints).mode < HintMode.min_job) {
      return VHUD.showForDuration("Hover for scrolling", 1000);
    }
  }
} as HintsNS.ModeOpt,
LEAVE: {
  "129": "Simulate mouse leaving link",
  "193": "Simulate mouse leaving continuously",
  activator (this: void, element: HintsNS.LinkEl): void {
    VDom.mouse(element, "mouseout");
    if (document.activeElement === element) { element.blur(); }
  }
} as HintsNS.ModeOpt,
COPY_TEXT: {
  "130": "Copy link text to Clipboard",
  "131": "Search selected text",
  "137": "Copy link URL to Clipboard",
  "194": "Copy link text one by one",
  "195": "Search link text one by one",
  "201": "Copy link URL one by one",
  "256": "Edit link url on Vomnibar",
  "257": "Edit link text on Vomnibar",
  activator (link): void {
    let isUrl = this.mode1 >= HintMode.min_link_job && this.mode1 <= HintMode.max_link_job, str: string | null;
    if (isUrl) { str = this.getUrlData(link); }
    else if ((str = link.getAttribute("data-vim-text")) && (str = str.trim())) {}
    else if (link instanceof HTMLInputElement) {
      str = link.type;
      if (str === "password") {
        str = "";
      } else if (!(str in VDom.uneditableInputs)) {
        str = (link.value || link.placeholder).trim();
      } else if (str === "file") {
        str = link.files && link.files.length > 0 ? link.files[0].name : "";
      } else if (["button", "submit", "reset"].indexOf(str) >= 0) {
        str = link.value.trim() || link.title.trim();
      } else {
        str = link.title.trim(); // including `[type="image"]`
      }
    } else {
      str = link instanceof HTMLTextAreaElement ? link.value
        : link instanceof HTMLSelectElement ? (link.selectedIndex < 0 ? "" : link.options[link.selectedIndex].text)
        : link instanceof HTMLElement && link.innerText.trim()
          || (str = link.textContent.trim()) && str.replace(<RegExpG> /\s+/g, " ")
        ;
      str = str.trim() || (link instanceof HTMLElement ? link.title.trim() : "");
    }
    if (!str) {
      return VHUD.showCopied("", isUrl ? "url" : "");
    }
    if (this.mode >= HintMode.min_edit && this.mode <= HintMode.max_edit) {
      const force = this.options.force;
      VPort.post<"activateVomnibar", 1, { count: number } & Partial<VomnibarNS.ContentOptions>>({
        handler: "activateVomnibar",
        count: 1,
        force: force != null ? !!force : !isUrl,
        url: str,
        keyword: (this.options.keyword || "") + ""
      });
      return;
    } else if (this.mode1 === HintMode.SEARCH_TEXT) {
      VPort.post({
        handler: "openUrl",
        reuse: this.mode & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
        url: str,
        keyword: (this.options.keyword || "") + ""
      });
      return;
    }
    // NOTE: url should not be modified
    // although BackendUtils.convertToUrl does replace '\u3000' with ' '
    str = isUrl ? VUtils.decodeURL(str) : str;
    VPort.post({
      handler: "copyToClipboard",
      data: str
    });
    VHUD.showCopied(str);
  }
} as HintsNS.ModeOpt,
OPEN_INCOGNITO_LINK: {
  "138": "Open link in incognito",
  "202": "Open multi incognito tabs",
  activator (link): void {
    const url = this.getUrlData(link);
    if (VUtils.evalIfOK(url)) { return; }
    VPort.post({
      handler: "openUrl",
      incognito: true,
      reuse: this.mode & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      keyword: (this.options.keyword || "") + "",
      url
    });
  }
} as HintsNS.ModeOpt,
DOWNLOAD_IMAGE: {
  "132": "Download image",
  "196": "Download multiple images",
  activator (this: void, img: HTMLAnchorElement | HTMLImageElement): void {
    let text = img instanceof HTMLAnchorElement ? img.href : img.src;
    if (!text) {
      VHUD.showForDuration("Not an image", 1000);
      return;
    }
    const i = text.indexOf("://"), a = VDom.createElement("a");
    if (i > 0) {
      text = text.substring(text.indexOf('/', i + 4) + 1);
    }
    if (text.length > 39) {
      text = text.substring(0, 36) + "...";
    }
    a.href = (img as HTMLImageElement).src;
    a.download = img.getAttribute("download") || "";
    a.click();
    return VHUD.showForDuration("Download: " + text, 2000);
  }
} as HintsNS.ModeOpt,
OPEN_IMAGE: {
  "133": "Open image",
  "197": "Open multiple image",
  activator (img: HTMLAnchorElement | HTMLImageElement): void {
    let text = img instanceof HTMLAnchorElement ? img.href : img.src, url: string, str: string | null;
    if (!text) {
      return VHUD.showForDuration("Not an image", 1000);
    }
    url = "vimium://show image ";
    if (str = img.getAttribute("download")) {
      url += "download=" + encodeURIComponent(str) + "&";
    }
    VPort.post({
      handler: "openUrl",
      reuse: this.mode & HintMode.queue ? ReuseType.newBg : ReuseType.newFg,
      url: url + text
    });
  }
} as HintsNS.ModeOpt,
DOWNLOAD_LINK: {
  "136": "Download link",
  "200": "Download multiple links",
  activator (this: void, link: HTMLAnchorElement): void {
    let oldDownload: string | null, oldUrl: string | null, changed = false;
    oldUrl = link.getAttribute("href");
    if (!oldUrl || oldUrl === "#") {
      oldDownload = link.getAttribute("data-vim-url");
      if (oldDownload && (oldDownload = oldDownload.trim())) {
        link.href = oldDownload;
        changed = true;
      }
    }
    oldDownload = link.getAttribute("download");
    if (oldDownload == null) {
      link.download = "";
    }
    VDom.UI.click(link, {
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    });
    if (oldDownload === null) {
      link.removeAttribute("download");
    }
    if (!changed) {}
    else if (typeof oldUrl === "string") {
      link.setAttribute("href", oldUrl);
    } else if (oldUrl === null) {
      link.removeAttribute("href");
    }
  }
} as HintsNS.ModeOpt,
FOCUS_EDITABLE: {
  "258": "Select an editable area",
  activator (link): false {
    VDom.UI.simulateSelect(link, true);
    return false;
  }
} as HintsNS.ModeOpt,
DEFAULT: {
  "0": "Open link in current tab",
  "2": "Open link in new tab",
  "3": "Open link in new active tab",
  "66": "Open multiple links in new tabs",
  "67": "Activate link and hold on",
  activator (link, hint): void | false {
    if (link instanceof HTMLIFrameElement || link instanceof HTMLFrameElement) {
      const ret = link === Vomnibar.box ? (Vomnibar.focus(1), false)
        : (this as typeof VHints).highlightChild(link.contentWindow as HintsNS.VWindow);
      (this as typeof VHints).mode = HintMode.DEFAULT;
      return ret;
    } else if (link instanceof HTMLDetailsElement) {
      link.open = !link.open;
      return;
    } else if (hint.classList.contains("BH")) {
      return (this as typeof VHints).Modes.HOVER.activator.call(this, link, hint);
    } else if (VDom.getEditableType(link) >= EditableType.Editbox) {
      VDom.UI.simulateSelect(link, true);
      return false;
    }
    const mode = this.mode & HintMode.mask_focus_new, onMac = VSettings.cache.onMac;
    let alterTarget: string | null | undefined;
    if (mode >= HintMode.newTab && link instanceof HTMLAnchorElement) {
      alterTarget = link.getAttribute('target');
      if (alterTarget !== "_top") {
        link.target = "_top";
      } else {
        alterTarget = undefined;
      }
    }
    // NOTE: not clear last hovered item, for that it may be a menu
    VDom.UI.click(link, {
      altKey: false,
      ctrlKey: mode >= HintMode.newTab && !onMac,
      metaKey: mode >= HintMode.newTab &&  onMac,
      shiftKey: mode === HintMode.OPEN_IN_NEW_FG_TAB
    }, mode !== HintMode.empty || link.tabIndex >= 0);
    if (alterTarget === undefined) {}
    else if (alterTarget === null) {
      link.removeAttribute("target");
    } else {
      link.setAttribute("target", alterTarget);
    }
  }
} as HintsNS.ModeOpt
}
};
