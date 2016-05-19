"use strict";
var LinkHints = {
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
    EDIT_LINK_URL: 257,
    EDIT_TEXT: 256
  },
  box: null,
  hintMarkers: [],
  mode: 0,
  modeOpt: null,
  count: 0,
  lastMode: 0,
  isClickListened: true,
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
      if (!this.initTimer) {
        this.initTimer = setTimeout(this.activate.bind(this, count, options), 300);
      } else if (!document.head) {
        this.isActive = true; // disable self
      }
      return;
    }
    handlerStack.remove(this);
    if (this.box) {
      this.box.remove();
    }
    this.setModeOpt(Object.setPrototypeOf(options || {}, null), count | 0);

    var elements, style, x, y;
    if (!this.frameNested) {
      elements = this.getVisibleElements();
    }
    if (this.frameNested) {
      if (this.tryNestedFrame("LinkHints.activate", [count, this.options])) {
        this.clean();
        VHUD.hide(true);
        return;
      }
      elements || (elements = this.getVisibleElements());
    }
    if (elements.length <= 0 || elements.length > 4000) {
      this.clean();
      VHUD.showForDuration((elements.length > 4000 ? "Too many" : "No")
        + " links to select.", 1000);
      return;
    }

    x = window.scrollX; y = window.scrollY;
    this.initBox(x, y, elements.length);
    this.hintMarkers = elements.map(this.createMarkerFor, this);
    elements = null;
    this.alphabetHints.initMarkers(this.hintMarkers);

    VHUD.show(this.modeOpt[this.mode]);
    this.box = DomUtils.UI.addElementList(this.hintMarkers, {
      id: "HMC",
      className: "R"
    });
    style = this.box.style;
    style.left = x + "px"; style.top = y + "px";
    if (document.webkitIsFullScreen) { style.position = "fixed"; }

    this.isActive = true;
    this.keyStatus.tab = 0;
    handlerStack.push(this.onKeydown, this);
    VEventMode.onWndBlur(this.OnWndBlur);
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
    var child, arr, done = false;
    try {
      child = this.frameNested.contentWindow;
      if (command.startsWith("LinkHints.activate") && child.LinkHints.isActive) {
        if (!child.document.head) { throw Error("vimium-disabled"); }
        child.LinkHints.deactivate(true);
        done = true;
      }
      child.VEventMode.keydownEvents(VEventMode.keydownEvents());
    } catch (e) {
      // It's cross-site, or Vimium on the child is wholly disabled
      // * Cross-site: it's in an abnormal situation, so we needn't focus the child;
      this.frameNested = null;
      return false;
    }
    child.focus();
    if (done !== false) { return true; }
    if (document.readyState !== "complete") { this.frameNested = false; }
    arr = Utils.findCommand(child, command);
    return arr[0][arr[1]](args[0], args[1], args[2]) !== false;
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
    count = Math.ceil(Math.log(count) / Math.log(Settings.cache.linkHintCharacters.length));
    this.maxLeft = this.maxRight - (11 * count) - 8;
    this.maxTop = this.maxBottom - 15;
  },
  createMarkerFor: function(link) {
    var marker = DomUtils.createElement("div"), i;
    marker.clickableItem = link[0];
    marker.className = "LH";
    var i = link[1][0];
    marker.style.left = i + "px";
    if (i > this.maxLeft) {
      marker.style.maxWidth = this.maxRight - i + "px";
    }
    i = link[1][1];
    marker.style.top = i + "px";
    if (i > this.maxTop) {
      marker.style.maxHeight = this.maxBottom - i + "px";
    }
    link.length >= 4 && (marker.linkRect = link[3]);
    return marker;
  },
  hashRe: /^#/,
  quoteRe: /"/g,
  btnRe: /\b[Bb](?:utto|t)n(?:$| )/,
  GetClickable: function(element) {
    var arr, isClickable = null, s, _i;
    switch (element.tagName.toLowerCase()) {
    case "a": case "frame": isClickable = true; break;
    case "iframe": isClickable = element !== VFindMode.box; break;
    case "input": if (element.type === "hidden") { return; } // no "break;"
    case "textarea":
      isClickable = !element.disabled && (!element.readOnly
        || LinkHints.mode >= 128 || element.vimiumHasOnclick || element.getAttribute("onclick")
        || element instanceof HTMLInputElement && (element.type in DomUtils.uneditableInputs));
      break;
    case "label":
      if (element.control) {
        arr = [];
        LinkHints.GetClickable.call(arr, element.control);
        isClickable = arr.length === 0;
      }
      break;
    case "button": case "select": isClickable = !element.disabled; break;
    case "object": case "embed":
      s = element.type;
      if (s && s.endsWith("x-shockwave-flash")) { isClickable = true; break; }
      return;
    case "img":
      if ((s = element.useMap) && (arr = element.getClientRects()).length > 0
          && arr[0].height >= 3 && arr[0].width >= 3) {
        // replace is necessary: chrome allows "&quot;", and also allows no "#"
        s = s.replace(LinkHints.hashRe, "").replace(LinkHints.quoteRe, '\\"');
        DomUtils.getClientRectsForAreas(this, arr[0], document.querySelector('map[name="' + s + '"]'));
      }
      isClickable = (s = getComputedStyle(element).cursor) && s.indexOf("zoom") >= 0
        || LinkHints.mode >= 128 && LinkHints.mode <= LinkHints.CONST.LEAVE;
      break;
    }
    while (isClickable === null) {
      if ((element.vimiumHasOnclick && LinkHints.isClickListened) || element.getAttribute("onclick")
        || ((s = element.getAttribute("role")) && (s = s.toLowerCase(), s === "button" || s === "link")) //
        || ((s = element.className) && LinkHints.btnRe.test(s))
        || (element.contentEditable === "true")
        ) {
        isClickable = true;
        break;
      }
      if (s = element.getAttribute("jsaction")) {
        arr = s.split(";");
        _i = arr.length;
        while (0 <= --_i) {
          s = arr[_i].trim();
          if (s.startsWith("click:") || (s !== "none" && s.indexOf(":") === -1)) {
            isClickable = true;
            break;
          }
        }
        if (isClickable) { break; }
      }
      s = element.getAttribute("tabindex");
      if (s != null && (s === "" || parseInt(s, 10) >= 0)) {
        if (arr = DomUtils.getVisibleClientRect(element)) {
          this.push([element, arr, 0]);
        }
      }
      return;
    }
    if (isClickable && (arr = DomUtils.getVisibleClientRect(element))) {
      this.push([element, arr]);
    }
  },
  GetLinks: function(element) {
    var a, arr;
    if ((a = element.getAttribute("href")) && a !== "#"
        || element.hasAttribute("data-vim-url")) {
      if (arr = DomUtils.getVisibleClientRect(element)) {
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
        cr = VRect.cropRectToVisible(w, h, w + 8, h + 8);
      }
    } else if (rect = element.getClientRects()[0]) {
      w = rect.right + (rect.width < 3 ? 3 : 0);
      h = rect.bottom + (rect.height < 3 ? 3 : 0);
      if (cr = VRect.cropRectToVisible(rect.left, rect.top, w, h)) {
        if (!DomUtils.isStyleVisible(window.getComputedStyle(element))) {
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
    if (str && str.length > 4 && LinkHints.imageUrlRe.test(str)) {
      if (cr = DomUtils.getVisibleClientRect(element)) {
        this.push([element, cr]);
      }
    }
  },
  traverse: function(filters) {
    var output = [], key, func, box, ind;
    Object.setPrototypeOf(filters, null);
    DomUtils.prepareCrop();
    box = document.webkitFullscreenElement || document;
    for (key in filters) {
      func = filters[key].bind(output);
      if (Settings.cache.deepHints) {
        output.forEach.call(box.querySelectorAll("* /deep/ " + key), func);
        continue;
      }
      output.forEach.call(box.getElementsByTagName(key), func);
      if (DomUtils.UI.root) {
        output.forEach.call(DomUtils.UI.root.querySelectorAll(key), func);
      }
    }
    if ("*" in filters) {
      ind = output[0] ? +(output[0][0] === document.documentElement) : 0;
      if (output[ind] && output[ind][0] === document.body) { ++ind; }
      if (ind > 0) { output.splice(0, ind); }
    }
    if (this.frameNested !== false) {}
    else if ("*" in filters) {
      this.checkNestedFrame(output);
    } else if (output.length > 0) {
      this.frameNested = null;
    } else {
      this.checkNestedFrame();
    }
    return output;
  },
  frameNested: false,
  checkNestedFrame: function(output) {
    var res = this._getNestedFrame(output);
    this.frameNested = res === false && document.readyState === "complete" ? null : res;
  },
  _getNestedFrame: function(output) {
    var rect, element, str, func;
    if (window.frames[0] == null) { return false; }
    if (document.webkitIsFullScreen) { return null; }
    if (output == null) {
      if (document.body === null) { return false; }
      output = [];
      func = this.GetClickable.bind(output);
      DomUtils.prepareCrop();
      output.forEach.call(document.getElementsByTagName("iframe"), func);
      if (output.length === 0 && document.body instanceof HTMLFrameSetElement) {
        output.forEach.call(document.body.getElementsByTagName("frame"), func);
      }
    }
    if (output.length !== 1) {
      return output.length !== 0 && null;
    }
    element = output[0][0];
    str = element.tagName.toLowerCase();
    if (str !== "iframe" && str !== "frame") {
      return null;
    }
    if ((rect = element.getClientRects()[0])
        && window.scrollY + rect.top < 20 && window.scrollX + rect.left < 20
        && rect.right > document.documentElement.scrollWidth - 20
        && rect.bottom > document.documentElement.scrollHeight - 20
        && getComputedStyle(element).visibility === 'visible'
    ) {
      return element;
    }
    return null;
  },
  getVisibleElements: function() {
    var visibleElements, visibleElement, rects, _len, _i, _j, obj, func, r, t;
    _i = this.mode & ~64;
    visibleElements = this.traverse(
      (_i == this.CONST.DOWNLOAD_IMAGE || _i == this.CONST.OPEN_IMAGE)
      ? { img: this.GetImagesInImg, a: this.GetImagesInA }
      : _i == this.CONST.EDIT_LINK_URL
      || (_i < 256 && _i >= 136) ? { a: this.GetLinks }
      : { "*": this.GetClickable });
    if (this.frameNested) { return; }
    if (visibleElements.length > 4000) { return visibleElements; }
    visibleElements.reverse();

    obj = [null, null];
    func = VRect.SubtractSequence;
    for (_len = visibleElements.length, _j = Math.max(0, _len - 32); 0 <= --_len; ) {
      _j > 0 && --_j;
      visibleElement = visibleElements[_len];
      rects = [r = visibleElement[1]];
      for (_i = _len; _j <= --_i; ) {
        t = visibleElements[_i][1];
        if (r[3] <= t[1] || r[2] <= t[0] || r[0] >= t[2]) {
          continue;
        }
        obj[0] = [];
        obj[1] = t;
        rects.forEach(func, obj);
        if ((rects = obj[0]).length === 0) {
          break;
        }
      }
      if (rects.length > 0) {
        visibleElement[1] = rects[0];
      } else if (visibleElement.length === 3) {
        visibleElements.splice(_len, 1);
      }
    }
    return visibleElements.reverse();
  },
  onKeydown: function(event) {
    var linksMatched, i, j, ref, limit;
    if (event.repeat) {
      // NOTE: should always prevent repeated keys.
    } else if ((i = event.keyCode) === KeyCodes.esc) {
      if (KeyboardUtils.isPlain(event)) {
        this.deactivate(); // do not suppress tail
      } else {
        return 0;
      }
    } else if (i > KeyCodes.f1 && i <= KeyCodes.f12) {
      if (i !== KeyCodes.f1 + 1) { return 0; }
      if (event.shiftKey) {
        this.isClickListened = !this.isClickListened;
      } else {
        Settings.cache.deepHints = !Settings.cache.deepHints;
      }
      this.reinit();
    } else if (i === KeyCodes.shiftKey) {
      if (this.mode < 128) {
        if (KeyboardUtils.getKeyStat(event) === 8) {
          this.lastMode = this.mode;
        }
        this.setMode((this.mode | 1) ^ (this.mode < 64 ? 3 : 67));
      }
    } else if (i === KeyCodes.ctrlKey || i === KeyCodes.metaKey && KeyboardUtils.onMac) {
      if (this.mode < 128) {
        if (!(event.shiftKey || event.altKey)) {
          this.lastMode = this.mode;
        }
        this.setMode((this.mode | 2) ^ 1);
      }
    } else if (i === KeyCodes.altKey) {
      if (this.mode < 256) {
        if (KeyboardUtils.getKeyStat(event) === 1) {
          this.lastMode = this.mode;
        }
        this.setMode(((this.mode >= 128 ? 0 : 2) | this.mode) ^ 64);
      }
    } else if (i >= KeyCodes.pageup && i <= KeyCodes.down) {
      VEventMode.scroll(event);
    } else if (!(linksMatched = this.alphabetHints.matchHintsByKey(this.hintMarkers, event, this.keyStatus))){
      if (linksMatched === false) {
        this.reinit();
      }
    } else if (linksMatched.length === 0) {
      this.deactivate(this.keyStatus.known);
    } else if (linksMatched.length === 1) {
      DomUtils.suppressEvent(event);
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
  OnWndBlur: function(keydowns) {
    var mode = LinkHints.mode, stat = 0;
    if (mode >= 256) { return; }
    if (keydowns[KeyCodes.altKey]) {
      stat = 1;
      mode = mode ^ 64;
    }
    if (mode >= 128) {}
    else if (stat > 0 || keydowns[KeyCodes.ctrlKey] || keydowns[KeyCodes.metaKey]
      || keydowns[KeyCodes.shiftKey]) {
      mode = LinkHints.lastMode;
    }
    if (mode !== LinkHints.mode) {
      LinkHints.setMode(mode);
    }
  },
  activateLink: function(hintEl) {
    var rect, clickEl = hintEl.clickableItem;
    this.clean();
    // must get outline first, because clickEl may hide itself when activated
    rect = hintEl.linkRect || DomUtils.UI.getVRect(clickEl);
    if (this.modeOpt.activator.call(this, clickEl) !== false) {
      DomUtils.UI.flashVRect(rect);
    }
    if (!(this.mode & 64)) {
      this.deactivate(true, true);
      return;
    }
    this.reinit(clickEl, rect);
    if (1 === --this.count) {
      this.setMode(this.mode & ~64);
    }
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
    var r2, _this = LinkHints;
    if (!_this) { return; }
    _this.timer = 0;
    if (!_this.isActive || _this.hintMarkers.length > 128 || _this.alphabetHints.hintKeystroke) {
      return;
    }
    DomUtils.prepareCrop();
    r2 = DomUtils.getVisibleClientRect(el);
    if (r2 && r && Math.abs(r2[0] - r[0]) < 100 && Math.abs(r2[1] - r[1]) < 60) {
      return;
    }
    _this.reinit();
  },
  clean: function() {
    this.hintMarkers = [];
    if (this.box) {
      this.box.remove();
      this.box = null;
    }
    VHUD.hide();
  },
  deactivate: function(suppressType, skipClean) {
    skipClean === true || this.clean();
    this.alphabetHints.hintKeystroke = "";
    this.options = this.modeOpt = null;
    this.lastMode = this.mode = this.count = 0;
    handlerStack.remove(this);
    VEventMode.onWndBlur(null);
    this.isActive = false;
    suppressType != null && DomUtils.UI.suppressTail(suppressType);
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
      hintString = characterSet[0].repeat(number) + hintString;
    }
    return hintString;
  },
  initMarkers: function(hintMarkers) {
    var hints, hintString, marker, end, i, len, node;
    this.chars = Settings.cache.linkHintCharacters.toUpperCase();
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
    return hintMarkers;
  },
  buildHintIndexes: function(linkCount) {
    var dn, hints, i, end;
    hints = new Array(linkCount);
    end = this.chars.length;
    dn = Math.ceil(Math.log(linkCount) / Math.log(end));
    end = ((Math.pow(end, dn) - linkCount) / (end - 1)) | 0;
    this.countMax = dn; this.countLimit = end;
    for (i = 0; i < end; ++i) {
      hints[i] = i;
    }
    end *= this.chars.length - 1;
    for (; i < linkCount; ++i) {
      hints[i] = i + end;
    }
    return this.shuffleHints(hints);
  },
  shuffleHints: function(hints) {
    var result, count, len, start, i, j, max;
    count = hints.length; len = this.chars.length;
    result = new Array(count);
    start = count % len;
    max = count - start;
    for (i = len; 0 <= --i; ) {
      for (j = max + i; 0 <= (j -= len); ) {
        result[--count] = hints[j];
      }
      if (i == start) { max += len; }
    }
    return result;
  },
  matchHintsByKey: function(hintMarkers, event, keyStatus) {
    var keyChar, key = event.keyCode, wanted;
    if (key === KeyCodes.tab) {
      if (!this.hintKeystroke) {
        return false;
      }
      keyStatus.tab = keyStatus.tab ? 0 : 1;
    } else if (keyStatus.tab) {
      this.hintKeystroke = "";
      keyStatus.tab = 0;
    }
    keyStatus.known = 1;
    if (key === KeyCodes.tab) {}
    else if (key === KeyCodes.backspace || key === KeyCodes.deleteKey || key === KeyCodes.f1) {
      if (!this.hintKeystroke) {
        return [];
      }
      this.hintKeystroke = this.hintKeystroke.slice(0, -1);
    } else if (key === KeyCodes.space) {
      return [];
    } else if (keyChar = KeyboardUtils.getKeyChar(event, false).toUpperCase()) {
      if (this.chars.indexOf(keyChar) === -1) {
        return [];
      }
      this.hintKeystroke += keyChar;
    } else {
      return null;
    }
    keyChar = this.hintKeystroke;
    keyStatus.newHintLength = keyChar.length;
    keyStatus.known = 0;
    wanted = !keyStatus.tab;
    return hintMarkers.filter(function(linkMarker) {
      var pass = linkMarker.hintString.startsWith(keyChar) === wanted;
      linkMarker.style.display = pass ? "" : "none";
      return pass;
    });
  }
},

getUrlData: function(link) {
  var str = link.getAttribute("data-vim-url");
  if (str) {
    link = DomUtils.createElement("a");
    link.href = str.trim();
  }
  return link.href;
},

highlightChild: function(child, box) {
  try {
    child.VEventMode.keydownEvents();
  } catch (e) {
    this.mode = 0;
    child.focus();
    return;
  }
  child.MainPort.Listener({
    name: "focusFrame",
    box: box && [box.width, box.height],
    frameId: -2
  });
  child.LinkHints.activate(this.count, this.options);
  child.LinkHints.setMode(this.mode);
  this.mode = 0;
  return false;
},

Modes: {
HOVER: {
  128: "Hover over node",
  192: "Hover over nodes continuously",
  activator: function(element) {
    var last = DomUtils.lastHovered;
    last && DomUtils.simulateMouse(last, "mouseout", null, last === element ? null : element);
    Scroller.current = element;
    DomUtils.lastHovered = element;
    DomUtils.simulateMouse(element, "mouseover");
  }
},
LEAVE: {
  129: "Simulate mouse leaving link",
  193: "Simulate mouse leaving continuously",
  activator: function(element) {
    DomUtils.simulateMouse(element, "mouseout");
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
      } else if (!(str in DomUtils.uneditableInputs)) {
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
      MainPort.port.postMessage({
        handler: "openUrl",
        reuse: -2 + !(this.mode & 64),
        keyword: this.options.keyword,
        url: str
      });
      return;
    }
    // NOTE: url should not be modified
    // although BackendUtils.convertToUrl does replace '\u3000' with ' '
    str = isUrl ? Utils.decodeURL(str) : str;
    MainPort.port.postMessage({
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
    if (Utils.evalIfOK(url)) { return; }
    MainPort.port.postMessage({
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
    a = DomUtils.createElement("a");
    a.href = img.src;
    a.download = img.getAttribute("download") || "";
    a.click();
    VHUD.showForDuration("download: " + text, 2000);
  }
},
OPEN_IMAGE: {
  133: "Open image",
  197: "Open multiple image",
  activator: function(img) {
    var text = img instanceof HTMLAnchorElement ? img.href : img.src;
    if (!text) {
      VHUD.showForDuration("Not an image", 1000);
      return;
    }
    MainPort.port.postMessage({
      handler: "openImageUrl",
      active: !(this.mode & 64),
      download: img.getAttribute("download"),
      url: text
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
    DomUtils.simulateClick(link, {
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
DEFAULT: {
  0: "Open link in current tab",
  2: "Open link in new tab",
  3: "Open link in new active tab",
  66: "Open multiple links in new tabs",
  67: "Activate link and hold on",
  activator: function(link) {
    var mode, alterTarget, tag = link.nodeName.toLowerCase();
    mode = DomUtils.getEditableType(link);
    if (mode === 3) {
      DomUtils.UI.simulateSelect(link, true);
      return false;
    } else if (mode > 0) {
      link.focus();
    }
    mode = this.mode & 3;

    if (tag === "iframe" || tag === "frame") {
      return this.highlightChild(link.contentWindow, link.getClientRects()[0]);
    }
    if (mode >= 2 && tag === "a") {
      alterTarget = link.getAttribute('target');
      link.target = "_top";
    }
    // NOTE: not clear last hovered item, for that it may be a menu
    DomUtils.simulateClick(link, {
      altKey: false,
      ctrlKey: mode >= 2 && !KeyboardUtils.onMac,
      metaKey: mode >= 2 &&  KeyboardUtils.onMac,
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
