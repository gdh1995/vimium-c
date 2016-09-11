"use strict";
var VHints = {
  CONST: {
    // focused: 1; new tab: 2; queue: 64; job: 128
    // >=128: "&4" means "must be links" and [data-vim-url] is used firstly
    //   &~64 >= 136 means only `<a>`
    // >= 256: queue not allowed
    OPEN_IN_CURRENT_TAB: 0, // also 1
    OPEN_IN_NEW_BG_TAB: 2,
    OPEN_IN_NEW_FG_TAB: 3,
    OPEN_WITH_QUEUE: 66,
    OPEN_FG_WITH_QUEUE: 67,
    HOVER: 128,
    LEAVE: 129,
    COPY_TEXT: 130,
    SEARCH_TEXT: 131,
    DOWNLOAD_IMAGE: 132,
    OPEN_IMAGE: 133,
    DOWNLOAD_LINK: 136,
    COPY_LINK_URL: 137,
    OPEN_INCOGNITO_LINK: 138,
    FOCUS_EDITABLE: 258,
    EDIT_LINK_URL: 257,
    EDIT_TEXT: 256
  },
  box: null,
  hintMarkers: null,
  mode: 0,
  modeOpt: null,
  count: 0,
  lastMode: 0,
  isClickListened: true,
  ngEnabled: null,
  keyStatus: {
    known: 1,
    newHintLength: 0,
    tab: 0
  },
  initTimer: 0,
  isActive: false,
  options: null,
  timer: 0,
  activate: function(count, options) {
    if (this.isActive) { return; }
    if (document.body == null) {
      if (!this.initTimer && document.readyState === "loading") {
        this.initTimer = setTimeout(this.activate.bind(this, count, options), 300);
        return;
      }
      if (!(document.documentElement instanceof HTMLElement)) { return; }
    }
    VHandler.remove(this);
    this.setModeOpt(Object.setPrototypeOf(options || {}, null), count | 0);

    var elements, style, x, y;
    if (!this.frameNested) {
      elements = this.getVisibleElements();
    }
    if (this.frameNested) {
      if (this.tryNestedFrame("VHints.activate", [count, this.options])) {
        this.clean();
        return;
      }
      elements || (elements = this.getVisibleElements());
    }
    if (elements.length <= 0) {
      this.clean(true);
      VHUD.showForDuration("No links to select.", 1000);
      return;
    }

    x = window.scrollX; y = window.scrollY;
    this.initBox(x, y, elements.length);
    this.box && this.box.remove();
    this.hintMarkers = elements.map(this.createMarkerFor, this);
    elements = null;
    this.alphabetHints.initMarkers(this.hintMarkers);

    this.setMode(this.mode);
    this.box = VDom.UI.addElementList(this.hintMarkers, {
      id: "HMC",
      className: "R LS"
    });
    style = this.box.style;
    style.left = x + "px"; style.top = y + "px";
    if (document.webkitIsFullScreen) { style.position = "fixed"; }

    this.isActive = true;
    this.keyStatus.tab = 0;
    VHandler.push(this.onKeydown, this);
    VEventMode.onWndBlur(this.ResetMode);
  },
  setModeOpt: function(options, count) {
    if (this.options === options) { return; }
    var ref = this.Modes, i, ref2 = this.CONST, mode = ref2[options.mode] | 0, modeOpt;
    if (mode == ref2.EDIT_TEXT && options.url) {
      mode = ref2.EDIT_LINK_URL;
    } else if (mode == ref2.EDIT_LINK_URL || (mode & ~64) == ref2.COPY_LINK_URL) {
      options.url = true;
    }
    if (count > 1) { mode <= 256 ? (mode |= 64) : (count = 1); }
    for (i in ref) {
      if (ref.hasOwnProperty(i) && ref[i].hasOwnProperty(mode)) {
        modeOpt = ref[i];
        break;
      }
    }
    if (!modeOpt) {
      modeOpt = ref.DEFAULT;
      mode = count > 1 ? this.CONST.OPEN_WITH_QUEUE : this.CONST.OPEN_IN_CURRENT_TAB;
    }
    this.modeOpt = modeOpt;
    this.mode = mode;
    this.options = options;
    this.count = count;
  },
  setMode: function(mode) {
    this.mode = mode;
    VHUD.show(this.modeOpt[mode]);
  },
  tryNestedFrame: function(command, args) {
    this.frameNested === false && this.checkNestedFrame();
    if (!this.frameNested) { return false; }
    var child, done = false;
    try {
      child = this.frameNested.contentWindow;
      if (command.startsWith("VHints.activate")) {
        if (!child.document.head) { throw Error("vimium-disabled"); }
        (done = child.VHints.isActive) && child.VHints.deactivate(true);
      }
      child.VEventMode.keydownEvents(VEventMode.keydownEvents());
    } catch (e) {
      // It's cross-site, or Vimium on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      this.frameNested = null;
      return false;
    }
    child.focus();
    if (done) { return true; }
    if (document.readyState !== "complete") { this.frameNested = false; }
    return VUtils.execCommand(child, command, args) !== false;
  },
  maxLeft: 0,
  maxTop: 0,
  maxRight: 0,
  maxBottom: 0,
  initBox: function(x, y, count) {
    if (document.webkitIsFullScreen) {
      this.maxLeft = window.innerWidth; this.maxTop = window.innerHeight;
      return;
    }
    var box = document.documentElement, rect, width, height;
    // NOTE: if zoom > 1, although document.documentElement.scrollHeight is integer,
    //   its real rect may has a float width, such as 471.333 / 472
    rect = box.getBoundingClientRect();
    width = rect.width; height = rect.height;
    width  = box.scrollWidth  - x - (width !== (width | 0));
    height = box.scrollHeight - y - (height !== (height | 0));
    this.maxRight  = Math.min(Math.max(width,  box.clientWidth ), window.innerWidth  + 64);
    this.maxBottom = Math.min(Math.max(height, box.clientHeight), window.innerHeight + 20);
    count = Math.ceil(Math.log(count) / Math.log(VSettings.cache.linkHintCharacters.length));
    this.maxLeft = this.maxRight - (11 * count) - 8;
    this.maxTop = this.maxBottom - 15;
  },
  createMarkerFor: function(link) {
    var marker = VDom.createElement("div"), i;
    marker.clickableItem = link[0];
    marker.className = "LH";
    i = link.length < 5 ? link[1][0] : link[4][0][0] + link[4][1];
    marker.style.left = i + "px";
    if (i > this.maxLeft) {
      marker.style.maxWidth = this.maxRight - i + "px";
    }
    i = link[1][1];
    marker.style.top = i + "px";
    if (i > this.maxTop) {
      marker.style.maxHeight = this.maxBottom - i + "px";
    }
    link[3] && (marker.linkRect = link[3]);
    link[2] > 7 && (marker.wantScroll = true);
    return marker;
  },
  hashRe: /^#/,
  quoteRe: /"/g,
  btnRe: /\b[Bb](?:utto|t)n(?:$| )/,
  GetClickable: function(element) {
    var arr, isClickable = null, s, type = 0;
    switch (element.tagName.toLowerCase()) {
    case "a": case "frame": case "details": isClickable = true; break;
    case "iframe": isClickable = element !== VFindMode.box; break;
    case "input": if (element.type === "hidden") { return; } // no break;
    case "textarea":
      if (element.disabled && VHints.mode <= VHints.CONST.LEAVE) { return; }
      if (!element.readOnly || VHints.mode >= 128
        || element instanceof HTMLInputElement && (element.type in VDom.uneditableInputs)) {
        isClickable = true;
      }
      break;
    case "label":
      if (element.control) {
        if (element.control.disabled) { return; }
        VHints.GetClickable.call(arr = [], element.control);
        isClickable = arr.length === 0;
      }
      break;
    case "button": case "select":
      isClickable = !element.disabled || VHints.mode > VHints.CONST.LEAVE; break;
    case "object": case "embed":
      s = element.type;
      if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
      return;
    case "img":
      if ((s = element.useMap) && (arr = element.getClientRects()).length > 0
          && arr[0].height >= 3 && arr[0].width >= 3) {
        // replace is necessary: chrome allows "&quot;", and also allows no "#"
        s = s.replace(VHints.hashRe, "").replace(VHints.quoteRe, '\\"');
        VDom.getClientRectsForAreas(this, arr[0], document.querySelector('map[name="' + s + '"]'));
      }
      if ((VHints.mode >= 128 && VHints.mode <= VHints.CONST.LEAVE
          && !(element.parentNode instanceof HTMLAnchorElement))
        || element.style.cursor || (s = getComputedStyle(element).cursor)
          && (s.startsWith("url") || s.indexOf("zoom") >= 0)) {
        isClickable = true;
      }
      break;
    case "div": case "ul": case "pre": case "ol":
      type = (type = element.clientHeight) && type + 5 < element.scrollHeight ? 9
        : (type = element.clientWidth) && type + 5 < element.scrollWidth ? 8 : 0;
      break;
    }
    if (isClickable === null) {
      type = (s = element.getAttribute("role")) && (s = s.toLowerCase(), s === "button" || s === "link")
          || element.contentEditable === "true" ? 1
        : (element.vimiumHasOnclick && VHints.isClickListened) || element.getAttribute("onclick")
          || VHints.ngEnabled && element.getAttribute("ng-click")
          || (s = element.getAttribute("jsaction")) && VHints.checkJSAction(s) ? 2
        : (s = element.getAttribute("tabindex")) != null && (s === "" || parseInt(s, 10) >= 0) ? 7
        : type > 7 ? type : (s = element.className) && VHints.btnRe.test(s) ? 4 : 0;
    }
    if ((isClickable || type) && (arr = VDom.getVisibleClientRect(element))
        && (type < 8 || VScroller.isScrollable(element, type - 8))
        && ((s = element.getAttribute("aria-hidden")) == null || s && s.toLowerCase() !== "true")
        && ((s = element.getAttribute("aria-disabled")) == null || (s && s.toLowerCase() !== "true")
          || VHints.mode >= 128)
    ) { this.push([element, arr, type]); }
  },
  checkJSAction: function(s) {
    for (var arr = s.split(";"), _i = arr.length; 0 <= --_i; ) {
      s = arr[_i].trim();
      if (s.startsWith("click:") || (s !== "none" && s && s.indexOf(":") === -1)) {
        return true;
      }
    }
  },
  GetEditable: function(element) {
    var arr;
    switch (element.tagName.toLowerCase()) {
    case "input":
      if (element.type === "hidden" || element.type in VDom.uneditableInputs) {
        return;
      } // no break;
    case "textarea":
      if (element.disabled || element.readOnly) { return; }
      break;
    default:
      if (element.contentEditable !== "true") { return; }
      break;
    }
    if (arr = VDom.getVisibleClientRect(element)) {
      this.push([element, arr, 1]);
    }
  },
  GetLinks: function(element) {
    var a, arr;
    if ((a = element.getAttribute("href")) && a !== "#"
        && (a.charCodeAt(10) !== 58 || a.substring(0, 11).toLowerCase() !== "javascript:")
        || element.hasAttribute("data-vim-url")) {
      if (arr = VDom.getVisibleClientRect(element)) {
        this.push([element, arr]);
      }
    }
  },
  imageUrlRe: /\.(?:bmp|gif|ico|jpe?g|png|svg|webp)\b/i,
  GetImagesInImg: function(element) {
    var rect, cr, w, h;
    if (!element.src) { return; }
    else if ((w = element.width) < 8 && (h = element.height) < 8) {
      if (w !== h || (w !== 0 && w !== 3)) { return; }
      rect = element.getClientRects()[0];
      if (rect) {
        w = rect.left; h = rect.top;
        cr = VRect.cropRectToVisible(w, h, w + 8, h + 8, 3);
      }
    } else if (rect = element.getClientRects()[0]) {
      w = rect.right + (rect.width < 3 ? 3 : 0);
      h = rect.bottom + (rect.height < 3 ? 3 : 0);
      if (cr = VRect.cropRectToVisible(rect.left, rect.top, w, h, 3)) {
        if (!VDom.isStyleVisible(window.getComputedStyle(element))) {
          cr = null;
        }
      }
    }
    if (cr) {
      this.push([element, cr]);
    }
  },
  GetImagesInA: function(element) {
    var str = element.getAttribute("href"), cr;
    if (str && str.length > 4 && VHints.imageUrlRe.test(str)) {
      if (cr = VDom.getVisibleClientRect(element)) {
        this.push([element, cr]);
      }
    }
  },
  traverse: function(filters, box) {
    var output = [], key, func, wantClickable = filters["*"] === this.GetClickable;
    Object.setPrototypeOf(filters, null);
    VDom.prepareCrop();
    box = box || document.webkitFullscreenElement || document;
    if (this.ngEnabled === null && ("*" in filters)) {
      this.ngEnabled = document.querySelector('.ng-scope') != null;
    }
    for (key in filters) {
      func = filters[key].bind(output);
      if (VSettings.cache.deepHints) {
        output.forEach.call(box.querySelectorAll("* /deep/ " + key), func);
        continue;
      }
      output.forEach.call(box.getElementsByTagName(key), func);
      if (VDom.UI.root) {
        output.forEach.call(VDom.UI.root.querySelectorAll(key), func);
      }
    }
    if (wantClickable) { this.deduplicate(output); }
    if (this.frameNested !== false) {}
    else if (wantClickable) {
      this.checkNestedFrame(output);
    } else if (output.length > 0) {
      this.frameNested = null;
    } else {
      this.checkNestedFrame();
    }
    return output;
  },
  deduplicate: function(list) {
    var j = list.length - 1, i, k, el, first, TextCls = Text;
    while (0 < j) {
      if (list[i = j][2] !== 4) {
        el = list[j][0];
      } else if (list[i][0].parentNode !== (el = list[--j][0])
        || (k = list[j][2]) > 7 || el.childElementCount !== 1
        || (k >= 2 && (first = el.firstChild) instanceof TextCls && first.textContent.trim())
      ) {
        continue;
      } else if (VRect.isContaining(list[j][1], list[i][1])) {
        list.splice(i, 1);
        continue;
      } else if (k < 2 || j === 0) {
        continue;
      }
      if (el.parentNode !== list[--j][0]) { continue; }
      do {
        if ((k = list[j][2]) < 2 || k > 7
          || (el = list[j][0]).childElementCount !== 1
          || (first = el.firstChild) instanceof TextCls && first.textContent.trim()
        ) {
          break;
        }
      } while (0 < j-- && el.parentNode === list[j][0]);
      if (j + 1 < i) {
        list.splice(j + 1, i - j - 1);
      }
    }
    i = list[0] ? +(list[0][0] === document.documentElement) : 0;
    if (list[i] && list[i][0] === document.body) { ++i; }
    if (i > 0) { i === 1 ? list.shift() : list.splice(0, i); }
  },
  frameNested: false,
  checkNestedFrame: function(output) {
    var res = this._getNestedFrame(output);
    this.frameNested = res === false && document.readyState === "complete" ? null : res;
  },
  _getNestedFrame: function(output) {
    var rect, rect2, element, func;
    if (window.frames[0] == null) { return false; }
    if (document.webkitIsFullScreen) { return null; }
    if (output == null) {
      if (document.body === null) { return false; }
      output = [];
      func = this.GetClickable.bind(output);
      VDom.prepareCrop();
      output.forEach.call(document.getElementsByTagName("iframe"), func);
      if (output.length === 0 && document.body instanceof HTMLFrameSetElement) {
        output.forEach.call(document.body.getElementsByTagName("frame"), func);
      }
    }
    if (output.length !== 1) {
      return output.length !== 0 && null;
    }
    element = output[0][0];
    if (
      ((element instanceof HTMLIFrameElement) || (element instanceof HTMLFrameElement))
        && (rect = element.getClientRects()[0])
        && (rect2 = document.documentElement.getBoundingClientRect())
        && rect.top - rect2.top < 20 && rect.left - rect2.left < 20
        && rect2.right - rect.right < 20 && rect2.bottom - rect.bottom < 20
        && getComputedStyle(element).visibility === 'visible'
    ) {
      return element;
    }
    return null;
  },
  getVisibleElements: function() {
    var visibleElements, visibleElement, _len, _i, _j, obj, func
      , r, r0, r2 = null, r2s, t, isNormal, reason, _k, _ref;
    _i = this.mode & ~64;
    visibleElements = this.traverse(
      (_i === this.CONST.DOWNLOAD_IMAGE || _i === this.CONST.OPEN_IMAGE)
      ? { img: this.GetImagesInImg, a: this.GetImagesInA }
      : _i === this.CONST.EDIT_LINK_URL || (_i < 256 && _i >= 136) ? { a: this.GetLinks }
      : {"*": _i === this.CONST.FOCUS_EDITABLE ? this.GetEditable
              : this.GetClickable});
    isNormal = this.mode < 128;
    visibleElements.reverse();

    obj = [r2s = [], null];
    func = VRect.SubtractSequence.bind(obj);
    for (_len = visibleElements.length, _j = Math.max(0, _len - 16); 0 < --_len; ) {
      _j > 0 && --_j;
      visibleElement = visibleElements[_len];
      r0 = r = visibleElement[1];
      for (_i = _len; _j <= --_i; ) {
        t = visibleElements[_i][1];
        if (r[3] <= t[1] || r[2] <= t[0] || r[0] >= t[2]) {
          continue;
        }
        obj[1] = t;
        r2 ? r2.forEach(func) : func(r);
        if (r2s.length === 1) {
          r = r2s[0]; r2 = null;
          r2s.length = 0;
          continue;
        }
        r2 = r2s;
        if (r2s.length === 0) { break; }
        obj[0] = r2s = [];
      }
      if (!r2) { if (r0 !== r) { visibleElement[1] = r; } continue; }
      if (r2.length > 0) {
        visibleElement[1] = r2[0];
      } else if ((reason = visibleElement[2]) === 4 || (reason === 2 ? isNormal : reason === 7)
          && visibleElement[0].contains(visibleElements[_i][0])) {
        visibleElements.splice(_len, 1);
      } else {
        _ref = visibleElement[4] || [r0, 0];
        r0 = _ref[0];
        for (_k = _len; _i <= --_k; ) {
          t = visibleElements[_k][1];
          if (r0[0] >= t[0] && r0[1] >= t[1] && r0[0] < t[0] + 20 && r0[1] < t[1] + 15) {
            visibleElements[_k][4] = [r0, _ref[1] + 13];
            break;
          }
        }
      }
      r2 = null;
    }
    return visibleElements.reverse();
  },
  onKeydown: function(event) {
    var linksMatched, i, j, ref, limit;
    if (event.repeat) {
      // NOTE: should always prevent repeated keys.
    } else if ((i = event.keyCode) === VKeyCodes.esc) {
      return VKeyboard.isPlain(event) ? (this.deactivate(), 2) : 0;
    } else if (i > VKeyCodes.f1 && i <= VKeyCodes.f12) {
      this.ResetMode();
      if (i !== VKeyCodes.f1 + 1) { return 0; }
      i = VKeyboard.getKeyStat(event);
      if (i === 8) {
        this.isClickListened = !this.isClickListened;
      } else if (i === 0) {
        VSettings.cache.deepHints = !VSettings.cache.deepHints;
      }
      setTimeout(this.reinit.bind(this, null), 0);
    } else if (i === VKeyCodes.shiftKey) {
      if (this.mode < 128) {
        if (VKeyboard.getKeyStat(event) === 8) {
          this.lastMode = this.mode;
        }
        this.setMode((this.mode | 1) ^ (this.mode < 64 ? 3 : 67));
      }
    } else if (i === VKeyCodes.ctrlKey || i === VKeyCodes.metaKey && VKeyboard.onMac) {
      if (this.mode < 128) {
        if (!(event.shiftKey || event.altKey)) {
          this.lastMode = this.mode;
        }
        this.setMode((this.mode | 2) ^ 1);
      }
    } else if (i === VKeyCodes.altKey) {
      if (this.mode < 256) {
        if (VKeyboard.getKeyStat(event) === 1) {
          this.lastMode = this.mode;
        }
        this.setMode(((this.mode >= 128 ? 0 : 2) | this.mode) ^ 64);
      }
    } else if (i >= VKeyCodes.pageup && i <= VKeyCodes.down) {
      VEventMode.scroll(event);
      this.ResetMode();
    } else if (!(linksMatched = this.alphabetHints.matchHintsByKey(this.hintMarkers, event, this.keyStatus))){
      if (linksMatched === false) {
        setTimeout(this.reinit.bind(this, null), 0);
      }
    } else if (linksMatched.length === 0) {
      this.deactivate(this.keyStatus.known);
    } else if (linksMatched.length === 1) {
      VUtils.Prevent(event);
      this.activateLink(linksMatched[0]);
    } else {
      limit = this.keyStatus.tab ? 0 : this.keyStatus.newHintLength;
      for (i = linksMatched.length; 0 <= --i; ) {
        ref = linksMatched[i].childNodes;
        for (j = ref.length; limit <= --j; ) {
          ref[j].classList.remove("MC");
        }
        for (; 0 <= j; --j) {
          ref[j].classList.add("MC");
        }
      }
    }
    return 2;
  },
  ResetMode: function() {
    if (VHints.mode > 255 || VHints.lastMode === VHints.mode) { return; }
    var d = VEventMode.keydownEvents();
    if (d[VKeyCodes.ctrlKey] || d[VKeyCodes.metaKey] || d[VKeyCodes.shiftKey] || d[VKeyCodes.altKey]) {
      VHints.setMode(VHints.lastMode);
    }
  },
  activateLink: function(hintEl) {
    var rect, clickEl = hintEl.clickableItem, ref = this.hintMarkers, len, i;
    for (len = ref.length, i = 0; i < len; i++) { ref[i++].clickableItem = null; }
    this.hintMarkers = ref = null;
    if (VDom.isInDocument(clickEl)) {
      // must get outline first, because clickEl may hide itself when activated
      rect = hintEl.linkRect || VDom.UI.getVRect(clickEl);
      if (this.modeOpt.activator.call(this, clickEl, hintEl) !== false) {
        VDom.UI.flashVRect(rect);
      }
    } else {
      clickEl = null;
      VHUD.showForDuration("The link has been removed from the page", 2000);
    }
    if (!(this.mode & 64)) {
      this.deactivate(true);
      return;
    }
    setTimeout(function() {
      var _this = VHints;
      _this.reinit(clickEl, rect);
      if (1 === --_this.count && _this.isActive) {
        _this.setMode(_this.mode & ~64);
      }
    }, 0);
  },
  reinit: function(lastEl, rect) {
    this.isActive = false;
    this.activate(0, this.options);
    this.timer && clearTimeout(this.timer);
    if (lastEl && this.mode < 128) {
      this.timer = setTimeout(this.TestLastEl, 255, lastEl, rect);
    } else {
      this.timer = 0;
    }
  },
  TestLastEl: function(el, r) {
    var r2, _this = VHints;
    if (!_this) { return; }
    _this.timer = 0;
    if (!_this.isActive || _this.hintMarkers.length > 128 || _this.alphabetHints.hintKeystroke) {
      return;
    }
    VDom.prepareCrop();
    r2 = VDom.getVisibleClientRect(el);
    if (r2 && r && Math.abs(r2[0] - r[0]) < 100 && Math.abs(r2[1] - r[1]) < 60) {
      return;
    }
    _this.reinit();
  },
  clean: function(keepHUD) {
    this.options = this.modeOpt = null;
    this.lastMode = this.mode = this.count =
    this.maxLeft = this.maxTop = this.maxRight = this.maxBottom = 0;
    if (this.box) {
      this.box.remove();
      this.hintMarkers = this.box = null;
    }
    keepHUD || VHUD.hide();
    var alpha = this.alphabetHints;
    alpha.hintKeystroke = alpha.chars = "";
    alpha.countMax = 0;
    VEventMode.onWndBlur(null);
  },
  deactivate: function(suppressType) {
    this.clean(VHUD.box.textContent !== this.modeOpt[this.mode]);
    VHandler.remove(this);
    this.isActive = false;
    suppressType != null && VDom.UI.suppressTail(suppressType);
  },

alphabetHints: {
  chars: "",
  hintKeystroke: "",
  countMax: 0,
  countLimit: 0,
  numberToHintString: function(number) {
    var base, hintString, remainder, characterSet = this.chars;
    base = characterSet.length;
    hintString = "";
    do {
      remainder = number % base;
      number = (number / base) | 0;
      hintString = characterSet[remainder] + hintString;
    } while (number > 0);
    number = this.countMax - hintString.length - (number < this.countLimit);
    if (number > 0) {
      hintString = this.repeat(characterSet[0], number) + hintString;
    }
    return hintString;
  },
  initMarkers: function(hintMarkers) {
    var hints, hintString, marker, end, i, len, node;
    this.chars = VSettings.cache.linkHintCharacters.toUpperCase();
    this.hintKeystroke = "";
    end = hintMarkers.length;
    hints = this.buildHintIndexes(end);
    while (0 <= --end) {
      marker = hintMarkers[end];
      hintString = this.numberToHintString(hints[end]);
      marker.hintString = hintString;
      for (i = 0, len = hintString.length; i < len; i++) {
        node = document.createElement('span');
        node.textContent = hintString[i];
        marker.appendChild(node);
      }
    }
    this.countMax -= this.countLimit > 0;
    this.countLimit = 0;
  },
  buildHintIndexes: function(linkCount) {
    var dn, hints, i, end;
    end = this.chars.length;
    dn = Math.ceil(Math.log(linkCount) / Math.log(end));
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
  shuffleHints: function(hints) {
    var result, count, len, start, i, j, max, j0;
    count = hints.length; len = this.chars.length;
    start = (count % len);
    max = count - start + len;
    result = [];
    for (j0 = i = 0; i < len; i++, j0++) {
      if (i === start) { max -= len; }
      for (j = j0; j < max; j += len) {
        result.push(hints[j]);
      }
    }
    return result;
  },
  matchHintsByKey: function(hintMarkers, event, keyStatus) {
    var keyChar, key = event.keyCode, wanted, arr = null;
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
    } else if (key === VKeyCodes.space) {
      return [];
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
    wanted = !keyStatus.tab;
    if (arr !== null && keyChar.length >= this.countMax) {
      hintMarkers.some(function(linkMarker) {
        return linkMarker.hintString === keyChar && arr.push(linkMarker);
      });
      if (arr.length === 1) { return arr; }
    }
    return hintMarkers.filter(function(linkMarker) {
      var pass = linkMarker.hintString.startsWith(keyChar) === wanted;
      linkMarker.style.display = pass ? "" : "none";
      return pass;
    });
  },
  repeat: function(s, n) {
    if (s.repeat) { return s.repeat(n); }
    for (var s2 = s; --n; ) { s2 += s; }
    return s2;
  }
},

getUrlData: function(link) {
  var str = link.getAttribute("data-vim-url");
  if (str) {
    link = VDom.createElement("a");
    link.href = str.trim();
  }
  return link.href;
},

highlightChild: function(child, box) {
  try {
    child.VEventMode.keydownEvents();
  } catch (e) {
    child.focus();
    return;
  }
  child.VPort.Listener({
    name: "focusFrame",
    box: box && [box.width, box.height],
    frameId: -2
  });
  var lh = child.VHints;
  lh.isActive = false;
  lh.activate(this.count, this.options);
  lh.isActive && lh.setMode(this.mode);
  return false;
},

Modes: {
HOVER: {
  128: "Hover over node",
  192: "Hover over nodes continuously",
  activator: function(element) {
    var last = VDom.lastHovered;
    last && VDom.isInDocument(last) &&
    VDom.simulateMouse(last, "mouseout", null, last === element ? null : element);
    VScroller.current = element;
    VDom.lastHovered = element;
    VDom.simulateMouse(element, "mouseover");
    this.mode < 128 && VHUD.showForDuration("Hover for scrolling", 1000);
  }
},
LEAVE: {
  129: "Simulate mouse leaving link",
  193: "Simulate mouse leaving continuously",
  activator: function(element) {
    VDom.simulateMouse(element, "mouseout");
  }
},
COPY_TEXT: {
  130: "Copy link text to Clipboard",
  131: "Search selected text",
  137: "Copy link URL to Clipboard",
  194: "Copy link text one by one",
  195: "Search link text one by one",
  201: "Copy link URL one by one",
  256: "Edit link text on Vomnibar",
  257: "Edit link url on Vomnibar",
  activator: function(link) {
    var isUrl = !!this.options.url, str;
    if (isUrl) { str = this.getUrlData(link); }
    else if ((str = link.getAttribute("data-vim-text")) && (str = str.trim())) {}
    else if ((str = link.nodeName.toLowerCase()) === "input") {
      str = link.type;
      if (str === "password") {
        str = "";
      } else if (!(str in VDom.uneditableInputs)) {
        str = (link.value || link.placeholder).trim();
      } else if (str === "file") {
        str = link.files.length > 0 ? link.files[0].name : "";
      } else if (["button", "submit", "reset"].indexOf(str) >= 0) {
        str = link.value.trim() || link.title.trim();
      } else {
        str = link.title.trim(); // including `[type="image"]`
      }
    } else {
      str = str === "textarea" ? link.value
        : str === "select" ? (link.selectedIndex < 0 ? "" : link.options[link.selectedIndex].text)
        : link.innerText.trim() || (str = link.textContent.trim()) && str.replace(/\s+/g, " ")
        ;
      str = str.trim() || link.title.trim();
    }
    if (!str) {
      VHUD.showCopied("", isUrl && "url");
      return;
    }
    if (this.mode >= this.CONST.EDIT_TEXT && this.mode <= this.CONST.EDIT_LINK_URL) {
      Vomnibar.activate(1, {
        force: !isUrl,
        url: str,
        keyword: this.options.keyword
      });
      return;
    } else if ((this.mode & ~64) === this.CONST.SEARCH_TEXT) {
      VPort.port.postMessage({
        handler: "openUrl",
        reuse: -2 + !(this.mode & 64),
        keyword: this.options.keyword,
        url: str
      });
      return;
    }
    // NOTE: url should not be modified
    // although BackendUtils.convertToUrl does replace '\u3000' with ' '
    str = isUrl ? VUtils.decodeURL(str) : str;
    VPort.port.postMessage({
      handler: "copyToClipboard",
      data: str
    });
    VHUD.showCopied(str);
  }
},
OPEN_INCOGNITO_LINK: {
  138: "Open link in incognito",
  202: "Open multi incognito tabs",
  activator: function(link) {
    var url = this.getUrlData(link);
    if (VUtils.evalIfOK(url)) { return; }
    VPort.port.postMessage({
      handler: "openUrl",
      incognito: true,
      active: !(this.mode & 64),
      keyword: this.options.keyword,
      url: url
    });
  }
},
DOWNLOAD_IMAGE: {
  132: "Download image",
  196: "Download multiple images",
  activator: function(img) {
    var text = img instanceof HTMLAnchorElement ? img.href : img.src, i, a;
    if (!text) {
      VHUD.showForDuration("Not an image", 1000);
      return;
    }
    i = text.indexOf("://");
    if (i > 0) {
      text = text.substring(text.indexOf('/', i + 4) + 1);
    }
    if (text.length > 39) {
      text = text.substring(0, 36) + "...";
    }
    a = VDom.createElement("a");
    a.href = img.src;
    a.download = img.getAttribute("download") || "";
    a.click();
    VHUD.showForDuration("Download: " + text, 2000);
  }
},
OPEN_IMAGE: {
  133: "Open image",
  197: "Open multiple image",
  activator: function(img) {
    var text = img instanceof HTMLAnchorElement ? img.href : img.src, url, str;
    if (!text) {
      VHUD.showForDuration("Not an image", 1000);
      return;
    }
    url = "vimium://show image ";
    if (str = img.getAttribute("download")) {
      url += "download=" + encodeURIComponent(str) + "&";
    }
    VPort.port.postMessage({
      handler: "openUrl",
      reuse: this.mode & 64 ? -2 : -1,
      url: url + text
    });
  }
},
DOWNLOAD_LINK: {
  136: "Download link",
  200: "Download multiple links",
  activator: function(link) {
    var oldDownload, oldUrl;
    oldUrl = link.getAttribute("href");
    if (!oldUrl || oldUrl === "#") {
      oldDownload = link.getAttribute("data-vim-url");
      if (oldDownload && (oldDownload = oldDownload.trim())) {
        link.href = oldDownload;
      }
    }
    oldDownload = link.getAttribute("download");
    if (oldDownload == null) {
      link.download = "";
    }
    VDom.simulateClick(link, {
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false
    });
    if (typeof oldDownload === "string") {
      link.setAttribute("download", oldDownload);
    } else if (oldDownload === null) {
      link.removeAttribute("download");
    }
    if (typeof oldUrl === "string") {
      link.setAttribute("href", oldUrl);
    } else if (oldUrl === null) {
      link.removeAttribute("href");
    }
  }
},
FOCUS_EDITABLE: {
  258: "Select an editable area",
  activator: function(link) {
    VDom.UI.simulateSelect(link, true);
    return false;
  }
},
DEFAULT: {
  0: "Open link in current tab",
  2: "Open link in new tab",
  3: "Open link in new active tab",
  66: "Open multiple links in new tabs",
  67: "Activate link and hold on",
  activator: function(link, hint) {
    var mode, alterTarget, tag, ret;
    mode = VDom.getEditableType(link);
    if (mode === 3) {
      VDom.UI.simulateSelect(link, true);
      return false;
    } else if (hint.wantScroll) {
      this.Modes.HOVER.activator.call(this, link);
      return;
    } else if (mode > 0) {
      link.focus();
    }
    mode = this.mode & 3;

    tag = link.nodeName.toLowerCase();
    if (tag === "iframe" || tag === "frame") {
      ret = link === Vomnibar.box ? (Vomnibar.focus(), false)
        : this.highlightChild(link.contentWindow, link.getClientRects()[0]);
      this.mode = 0;
      return ret;
    } else if (tag === "details") {
      link.open = !link.open;
      return;
    }
    if (mode >= 2 && tag === "a") {
      alterTarget = link.getAttribute('target');
      link.target = "_top";
    }
    // NOTE: not clear last hovered item, for that it may be a menu
    VDom.simulateClick(link, {
      altKey: false,
      ctrlKey: mode >= 2 && !VKeyboard.onMac,
      metaKey: mode >= 2 &&  VKeyboard.onMac,
      shiftKey: mode === 3
    });
    if (alterTarget === undefined) {}
    else if (alterTarget === null) {
      link.removeAttribute("target");
    } else {
      link.setAttribute("target", alterTarget);
    }
  }
}
}
};
