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
    EDIT_TEXT: 256
  },
  hintMarkerContainingDiv: null,
  hintMarkers: [],
  linkActivator: null,
  mode: 0,
  lastMode: 0,
  isClickListened: true,
  ngIgnored: true,
  ngAttribute: "",
  // find /^((?:x|data)[:_\-])?ng-|^ng:/, and ignore "data:", "data_" and "x_"
  ngAttributes: ["x:ng-click", "ng:click", "x-ng-click", "data-ng-click", "ng-click"],
  keepHUDAfterAct: false,
  keyStatus: {
    known: 1,
    newHintLength: 0,
    tab: 0
  },
  handlerId: 0,
  initTimer: 0,
  isActive: false,
  options: null,
  timer: 0,
  activateModeToOpenInNewTab: function() {
    this.activate(this.CONST.OPEN_IN_NEW_BG_TAB);
  },
  activateModeToOpenInNewForegroundTab: function() {
    this.activate(this.CONST.OPEN_IN_NEW_FG_TAB);
  },
  activateModeToCopyLinkUrl: function() {
    this.activate(this.CONST.COPY_LINK_URL);
  },
  activateModeToCopyLinkText: function() {
    this.activate(this.CONST.COPY_TEXT);
  },
  activateModeToSearchLinkText: function(_0, options) {
    this.activate(this.CONST.SEARCH_TEXT, options);
  },
  activateModeToOpenVomnibar: function(_0, options) {
    this.activate(this.CONST.EDIT_TEXT, options);
  },
  activateModeWithQueue: function() {
    this.activate(this.CONST.OPEN_WITH_QUEUE);
  },
  activateModeToOpenIncognito: function(_0, options) {
    this.activate(this.CONST.OPEN_INCOGNITO_LINK, options);
  },
  activateModeToDownloadLink: function() {
    this.activate(this.CONST.DOWNLOAD_LINK);
  },
  activateModeToDownloadImage: function() {
    this.activate(this.CONST.DOWNLOAD_IMAGE);
  },
  activateModeToOpenImage: function() {
    this.activate(this.CONST.OPEN_IMAGE);
  },
  activateModeToHover: function() {
    this.activate(this.CONST.HOVER);
  },
  activateModeToLeave: function() {
    this.activate(this.CONST.LEAVE);
  },
  activateMode: function() {
    this.activate(this.CONST.OPEN_IN_CURRENT_TAB);
  },
  activate: function(mode, options) {
    if (this.isActive) { return;}
    this.options = options || {};
    if (document.body == null) {
      if (!this.initTimer) {
        this.initTimer = setInterval(this.activate.bind(this, mode), 300);
      } else if (!document.head) {
        clearInterval(this.initTimer); // document is not a <html> document
        this.initTimer = 0;
        this.isActive = true; // disable self
        this.options = null;
      }
      return;
    } else if (this.initTimer) {
      clearInterval(this.initTimer);
      this.initTimer = 0;
    }
    if (this.options.mode != null) { mode = options.mode; }
    this.setOpenLinkMode(mode);
    handlerStack.remove(this.handlerId);
    if (this.hintMarkerContainingDiv) {
      this.hintMarkerContainingDiv.remove();
    }
    var elements, rect, style, width, height, x, y;

    if (!this.frameNested) {
      elements = this.getVisibleClickableElements();
    }
    if (this.frameNested) {
      if (this.tryNestedFrame("LinkHints.activate", [mode, this.options])) {
        VHUD.hide(true);
        return;
      }
      elements || (elements = this.getVisibleClickableElements());
    }
    this.hintMarkers = elements.map(this.createMarkerFor);
    elements = null;
    this.alphabetHints.fillInMarkers(this.hintMarkers);
    this.isActive = true;

    x = window.scrollX; y = window.scrollY;
    var container = document.documentElement;
    // NOTE: if zoom > 1, although document.documentElement.scrollHeight is integer,
    //   its real rect may has a float width, such as 471.333 / 472
    rect = container.getBoundingClientRect();
    width = rect.width; height = rect.height;
    width = width !== (width | 0) ? 1 : 0; height = height !== (height | 0) ? 1 : 0;
    width  = container.scrollWidth  - x - width ;
    height = container.scrollHeight - y - height;
    width  = Math.max(width,  container.clientWidth );
    height = Math.max(height, container.clientHeight);
    width  = Math.min(width,  window.innerWidth  + 60);
    height = Math.min(height, window.innerHeight + 20);
    this.hintMarkerContainingDiv = DomUtils.UI.addElementList(this.hintMarkers, {
      id: "HMC",
      className: "R"
    });
    style = this.hintMarkerContainingDiv.style;
    style.left = x + "px"; style.top = y + "px";
    style.width = width + "px"; style.height = height + "px";
    if (document.webkitFullscreenElement) { style.position = "fixed"; }
    this.keyStatus.tab = 0;
    this.handlerId = handlerStack.push(this.onKeyDownInMode, this);
    VInsertMode.onWndBlur = this.OnWndBlur;
  },
  setOpenLinkMode: function(mode) {
    var cons = this.CONST, tip, activator;
    switch (mode >= 128 ? ((mode | 64) ^ 64) : mode) {
    case cons.OPEN_IN_NEW_BG_TAB: tip = "Open link in new tab"; break;
    case cons.OPEN_IN_NEW_FG_TAB: tip = "Open link in new active tab"; break;
    case cons.OPEN_WITH_QUEUE: tip = "Open multiple links in new tabs"; break;
    case cons.OPEN_FG_WITH_QUEUE: tip = "Activate link and hold on"; break;
    case cons.HOVER:
      tip = mode >= 192 ? "Hover over nodes continuously" : "Hover over node";
      activator = this.FUNC.HOVER;
      break;
    case cons.LEAVE:
      tip = mode >= 192 ? "Simulate mouse leaving continuously" : "Simulate mouse leaving link";
      activator = this.FUNC.LEAVE;
      break;
    case cons.COPY_TEXT:
      tip = mode >= 192 ? "Copy link text one by one" : "Copy link text to Clipboard";
      activator = this.FUNC.COPY_TEXT;
      break;
    case cons.SEARCH_TEXT:
      tip = mode >= 192 ? "Search link text one by one" : "Search selected text";
      activator = this.FUNC.COPY_TEXT;
      break;
    case cons.EDIT_TEXT:
      tip = "Edit link " + (this.options.url ? "url" : "text") + " on Vomnibar";
      activator = this.options.url ? this.FUNC.COPY_LINK_URL : this.FUNC.COPY_TEXT;
      break;
    case cons.DOWNLOAD_IMAGE:
      tip = mode >= 192 ? "Download multiple images" : "Download image";
      activator = this.FUNC.DOWNLOAD_IMAGE;
      break;
    case cons.OPEN_IMAGE:
      tip = mode >= 192 ? "Open multiple image" : "Open image";
      activator = this.FUNC.OPEN_IMAGE;
      break;
    case cons.DOWNLOAD_LINK:
      tip = mode >= 192 ? "Download multiple links" : "Download link";
      activator = this.FUNC.DOWNLOAD_LINK;
      break;
    case cons.COPY_LINK_URL:
      tip = mode >= 192 ? "Copy link URL one by one" : "Copy link URL to Clipboard";
      activator = this.FUNC.COPY_LINK_URL;
      break;
    case cons.OPEN_INCOGNITO_LINK:
      tip = mode >= 192 ? "Open multi incognito tabs" : "Open link in incognito";
      activator = this.FUNC.OPEN_INCOGNITO_LINK;
      break;
    default:
      tip = "Open link in current tab";
      mode != 1 && (mode = 0);
      break;
    }
    if (!this.linkActivator) {
      this.linkActivator = mode < 128 ? this.FUNC.DEFAULT : activator;
    }
    VHUD.show(tip);
    this.mode = mode;
  },
  tryNestedFrame: function(command, args) {
    this.frameNested === false && this.checkNestedFrame();
    if (!this.frameNested) { return false; }
    var child, arr, done = false;
    try {
      child = this.frameNested.contentWindow;
      if (command.startsWith("LinkHints.activate") && child.LinkHints.isActive) {
        if (!this.frameNested.contentDocument.head) { throw Error("vimium-disabled"); }
        child.LinkHints.deactivate(true);
        done = true;
      }
      child.VInsertMode.keydownEvents(VInsertMode.keydownEvents());
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
    return arr[0][arr[1]].apply(arr[0], args) !== false;
  },
  createMarkerFor: function(link) {
    var marker = DomUtils.createElement("div"), rect;
    marker.className = "LH";
    marker.clickableItem = link[0];
    rect = link[1];
    marker.style.left = rect[0] + "px";
    marker.style.top = rect[1] + "px";
    return marker;
  },
  hashRe: /^#/,
  quoteRe: /"/g,
  btnRe: /\b[Bb](?:utto|t)n(?:$| )/,
  GetVisibleClickable: function(element) {
    var arr, isClickable = false, s, _i;
    switch (element.tagName.toLowerCase()) {
    case "a": case "frame": case "iframe": isClickable = true; break;
    case "textarea": isClickable = !element.disabled && (!element.readOnly
        || LinkHints.mode >= 128 || element.getAttribute("onclick")); break;
    case "input":
      isClickable = element.type !== "hidden" && !element.disabled //
        && (!element.readOnly || LinkHints.mode >= 128 ||
             element.getAttribute("onclick") || element.vimiumHasOnclick
             || (element.type in DomUtils.uneditableInputs));
      break;
    case "label":
      if (element.control) {
        arr = [];
        LinkHints.GetVisibleClickable.call(arr, element.control);
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
      // no "break;"
    default: 
      /* if ( ((s = element.getAttribute("aria-hidden"  )) != null && (s ? s.toLowerCase() === "true" : true)) //
        || ((s = element.getAttribute("aria-disabled")) != null && (s ? s.toLowerCase() === "true" : true)) ) {
        return;
      } */
      // NOTE: el.onclick will always be null, for it belongs to the normal `window` object
      //      so .attr("onclick") may be not right
      if ( element.getAttribute("onclick") //
        || ((s = element.getAttribute("role")) && (s = s.toLowerCase(), s === "button" || s === "link")) //
        || ((s = element.className) && LinkHints.btnRe.test(s))
        // NOTE: .attr("contenteditable") allows ["", "true", "false", "plaintext-only", or "inherit"]
        //       : without case; "contentEditable" is not accepted
        //    if the attr "contenteditable" is not set, .contentEditable will be "inherit"
        //       : otherwise "true" or "false"
        //    .isContentEditable can only be true or false, which may be inherited from its parent
        || (element.contentEditable === "true")
        || (LinkHints.isClickListened && element.vimiumHasOnclick)
        ) {
        isClickable = true;
        break;
      }
      if (LinkHints.ngIgnored) {}
      else if (s = LinkHints.ngAttribute) {
        if (element.getAttribute(s)) { isClickable = true; break; }
      } else {
        for (arr = LinkHints.ngAttributes, _i = arr.length; 0 <= --_i; ) {
          s = element.getAttribute(arr[_i]);
          if (s !== null) {
            LinkHints.ngAttribute = arr[_i];
            isClickable = !!s;
            break;
          }
        }
        if (isClickable) { break; }
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
      if (s == null || !(s === "" || parseInt(s, 10) >= -1)) {
        return; // work around
      }
      isClickable = true; _i = -1;
      break;
    }
    if (isClickable && (arr = DomUtils.getVisibleClientRect(element))) {
      this.push([element, arr, _i !== -1]); // {element, rect, notSecond}
    }
  },
  GetLinks: function(element) {
    var a = element.getAttribute("data-vim-url"), arr;
    // NOTE: not judge `.attr("data-vim-url") is "#" or ""`
    //   just in case that someone make "#" an event for downloading / ...
    //   : then he can set [href=#][data-vim-url] to enable LinkHints
    if (a != null || ((a = element.getAttribute("href")) && a !== "#")) {
      if (arr = DomUtils.getVisibleClientRect(element)) {
        this.push([element, arr, true]);
      }
    }
  },
  imageUrlRe: /\.(?:png|jpg|gif|jpeg|bmp|svg|ico|webp)\b/i,
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
      this.push([element, cr, true]);
    }
  },
  GetImagesInA: function(element) {
    var str = element.getAttribute("href"), cr;
    if (str && str.length > 4 && LinkHints.imageUrlRe.test(str)) {
      if (cr = DomUtils.getVisibleClientRect(element)) {
        this.push([element, cr, true]);
      }
    }
  },
  traverse: function(filters) {
    var output = [], key, func, container, ind;
    Object.setPrototypeOf(filters, null);
    DomUtils.prepareCrop();
    container = document.webkitFullscreenElement || document;
    if (this.ngIgnored && "*" in filters) {
      this.ngIgnored = container.querySelector('.ng-scope') === null;
    }
    this.isClickListened = Settings.cache.isClickListened;
    for (key in filters) {
      func = filters[key].bind(output);
      if (Settings.cache.deepHints) {
        output.forEach.call(container.querySelectorAll("* /deep/ " + key), func);
        continue;
      }
      output.forEach.call(container.getElementsByTagName(key), func);
      if (DomUtils.UI.root) {
        output.forEach.call(DomUtils.UI.root.querySelectorAll(key), func);
      }
    }
    if (!this.ngIgnored && !this.ngAttribute) { this.ngAttribute = "ng-click"; }
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
    var rect, element, str, func;
    if (window.frames[0] == null || document.webkitFullscreenElement !== null) {
      this.frameNested = null;
      return;
    }
    if (output == null) {
      output = [];
      if (document.body === null) {
        if (document.readyState === "complete") {
          this.frameNested = null;
        }
        return;
      }
      func = this.GetVisibleClickable.bind(output);
      DomUtils.prepareCrop();
      output.some.call(document.body.getElementsByTagName("*"), function(element) {
        func(element);
        return output.length > 1;
      });
    }
    if (output.length !== 1) {
      if (output.length !== 0 || document.readyState === "complete") {
        this.frameNested = null;
      }
      return;
    }
    element = output[0][0];
    str = element.tagName.toLowerCase();
    if (str !== "iframe" && str !== "frame") {
      this.frameNested = null;
    } else if ((rect = element.getClientRects()[0])
        && window.scrollY + rect.top < 20 && window.scrollX + rect.left < 20
        && element.scrollWidth > document.documentElement.scrollWidth - 40
        && element.scrollHeight > document.documentElement.scrollHeight - 40) {
      this.frameNested = element;
    } else if (document.readyState === "complete") {
      this.frameNested = null;
    }
  },
  getVisibleClickableElements: function() {
    var output = [], visibleElements, visibleElement, rects, _len, _i, _j, obj, func, r, t;
    _i = this.mode & ~64;
    visibleElements = this.traverse(
      (_i == this.CONST.DOWNLOAD_IMAGE || _i == this.CONST.OPEN_IMAGE)
      ? { img: this.GetImagesInImg, a: this.GetImagesInA }
      : _i == this.CONST.EDIT_TEXT && this.options.url
      || (_i < 256 && _i >= 136) ? { a: this.GetLinks }
      : { "*": this.GetVisibleClickable });
    if (this.frameNested) { return; }
    visibleElements.reverse();
    
    obj = [null, null];
    func = VRect.SubtractSequence.bind(obj);
    for (_len = visibleElements.length; 0 <= --_len; ) {
      visibleElement = visibleElements[_len];
      rects = [r = visibleElement[1]];
      for (_i = _len, _j = Math.max(0, _len - 32); _j <= --_i; ) {
        t = visibleElements[_i][1];
        if (r[3] <= t[1] || r[2] <= t[0] || r[0] >= t[2]) {
          continue;
        }
        obj[0] = [];
        obj[1] = t;
        rects.forEach(func);
        if ((rects = obj[0]).length === 0) {
          break;
        }
      }
      if (rects.length > 0) {
        output.push([visibleElement[0], rects[0]]); // {element, rect}
      } else if (visibleElement[2]) {
        output.push([visibleElement[0], visibleElement[1]]);
      }
    }
    return output;
  },
  onKeyDownInMode: function(event) {
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
        Settings.cache.isClickListened = !Settings.cache.isClickListened;
      } else {
        Settings.cache.deepHints = !Settings.cache.deepHints;
      }
      this.reinit();
    } else if (i === KeyCodes.shiftKey) {
      if (this.mode < 128) {
        if (KeyboardUtils.getKeyStat(event) === 8) {
          this.lastMode = this.mode;
        }
        this.setOpenLinkMode((this.mode | 1) ^ (this.mode < 64 ? 3 : 67));
      }
    } else if (i === KeyCodes.ctrlKey || i === KeyCodes.metaKey) {
      if (this.mode < 128) {
        if (!(event.shiftKey || event.altKey)) {
          this.lastMode = this.mode;
        }
        this.setOpenLinkMode((this.mode | 2) ^ 1);
      }
    } else if (i === KeyCodes.altKey) {
      if (this.mode < 256) {
        if (KeyboardUtils.getKeyStat(event) === 1) {
          this.lastMode = this.mode;
        }
        this.setOpenLinkMode(((this.mode >= 128 ? 0 : 2) | this.mode) ^ 64);
      }
    } else if (i >= KeyCodes.pageup && i <= KeyCodes.down) {
      MainPort.Listener({
        name: "execute",
        command: "scroll",
        count: 1,
        options: {event: event}
      });
    } else if (!(linksMatched = this.alphabetHints.matchHintsByKey(this.hintMarkers, event, this.keyStatus))){
      if (linksMatched === false) {
        this.reinit();
      }
    } else if (linksMatched.length === 0) {
      this.deactivate(this.keyStatus.known);
    } else if (linksMatched.length === 1) {
      DomUtils.suppressEvent(event);
      this.activateLink(linksMatched[0].clickableItem);
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
      LinkHints.setOpenLinkMode(mode);
    }
  },
  activateLink: function(clickEl) {
    var tempi, rect;
    if (this.mode >= 128) {}
    else if ((tempi = DomUtils.getEditableType(clickEl)) === 3) {
      this.deactivate(true); // always suppress tail even if fail to focus
      this.unhoverLast();
      DomUtils.UI.simulateSelect(clickEl, true);
      return;
    }
    else if (tempi > 0) { clickEl.focus(); }
    // must get outline first, because clickEl may hide itself when activated
    rect = DomUtils.UI.flashOutline(clickEl, true);
    if (this.linkActivator(clickEl) !== false) {
      DomUtils.UI.flashVRect(rect);
    }
    if (this.mode & 64) {
      this.reinit(clickEl, rect);
    } else {
      this.deactivate(true);
    }
  },
  lastHovered: null,
  unhoverLast: function(element) {
    (element instanceof Element) || (element = null);
    this.lastHovered && DomUtils.simulateMouse(this.lastHovered, "mouseout", null, element);
    this.lastHovered = element;
  },
  suppressTail: function(onlyRepeated) {
    var func, tick, timer;
    if (onlyRepeated) {
      func = function(event) {
        if (event.repeat) { return 2; }
        handlerStack.remove(this.handlerId);
        return 0;
      };
    } else {
      func = function() { tick = Date.now(); return 2; };
      tick = Date.now() + Settings.cache.keyboard[0];
      timer = setInterval(function() {
        if (Date.now() - tick > 150) {
          clearInterval(timer);
          handlerStack.remove(LinkHints.handlerId);
        }
      }, 75);
    }
    this.handlerId = handlerStack.push(func, this);
  },
  reinit: function(lastEl, rect) {
    this.isActive = false;
    this.activate(this.mode, this.options);
    this.timer && clearTimeout(this.timer);
    if (lastEl && this.mode < 128) {
      this.timer = setTimeout(this.TestLastEl, 255, lastEl, rect);
    } else {
      this.timer = 0;
    }
  },
  TestLastEl: function(el, r) {
    var r2;
    if (!LinkHints) { return; }
    LinkHints.timer = 0;
    if (!LinkHints.isActive || LinkHints.hintMarkers.length > 128
        || LinkHints.alphabetHints.hintKeystroke) {
      return;
    }
    DomUtils.prepareCrop();
    r2 = DomUtils.getVisibleClientRect(el);
    if (r2 && r && Math.abs(r2[0] - r[0]) < 100 && Math.abs(r2[1] - r[1]) < 60) {
      return;
    }
    LinkHints.reinit();
  },
  deactivate: function(suppressType) {
    this.alphabetHints.hintKeystroke = "";
    this.linkActivator = null;
    this.hintMarkers = [];
    if (this.hintMarkerContainingDiv) {
      this.hintMarkerContainingDiv.remove();
      this.hintMarkerContainingDiv = null;
    }
    this.keyStatus.tab = 0;
    handlerStack.remove(this.handlerId);
    this.handlerId = 0;
    VInsertMode.onWndBlur = null;
    if (this.keepHUDAfterAct) {
      this.keepHUDAfterAct = false;
    } else {
      VHUD.hide();
    }
    this.lastMode = this.mode = 0;
    this.options = null;
    this.isActive = false;
    if (suppressType != null) {
      this.suppressTail(suppressType);
    }
  },

alphabetHints: {
  chars: "",
  hintKeystroke: "",
  spanWrap: function(hintString) {
    for (var i = 0, j = -1, end = hintString.length, html = new Array(end * 3); i < end; i++) {
      html[j + 1] = "<span>";
      html[j + 2] = hintString[i];
      html[j += 3] = "</span>";
    }
    return html.join("");
  },
  numberToHintString: function(number, characterSet, numHintDigits) {
    var base, hintString, remainder;
    base = characterSet.length;
    hintString = "";
    do {
      remainder = number % base;
      hintString = characterSet[remainder] + hintString;
      number = (number - remainder) / base;
    } while (number > 0);
    number = numHintDigits - hintString.length;
    if (number > 0) {
      hintString = characterSet[0].repeat(number) + hintString;
    }
    return hintString;
  },
  fillInMarkers: function(hintMarkers) {
    var hintStrings, marker, end;
    this.chars = Settings.cache.linkHintCharacters.toUpperCase();
    this.hintKeystroke = "";
    end = hintMarkers.length;
    hintStrings = this.hintStrings(end);
    while (0 <= --end) {
      marker = hintMarkers[end];
      marker.innerHTML = this.spanWrap(marker.hintString = hintStrings[end]);
    }
    return hintMarkers;
  },
  hintStrings: function(linkCount) {
    var dn, hintStrings, i, chars, end;
    hintStrings = new Array(linkCount);
    chars = this.chars;
    end = chars.length;
    dn = Math.ceil(Math.log(linkCount) / Math.log(end));
    end = Math.floor((Math.pow(end, dn) - linkCount) / (end - 1));
    i = 0;
    if (end > 0) {
      --dn;
      for (; i < end; ++i) {
        hintStrings[i] = this.numberToHintString(i, chars, dn);
      }
      ++dn;
      end *= chars.length - 1;
    }
    for (; i < linkCount; ++i) {
      hintStrings[i] = this.numberToHintString(i + end, chars, dn);
    }
    return this.shuffleHints(hintStrings);
  },
  shuffleHints: function(hints) {
    var result, count, len, dn, more, start;
    count = hints.length; len = this.chars.length;
    if (count <= len) { return hints; }
    result = new Array(count);
    more = count % len; count -= more; dn = count / len; start = more * dn;
    while (start <= --count) {
      result[count + more] = hints[count % dn * len + Math.floor(count / dn)];
    }
    count = start + more; ++dn;
    while (0 <= --count) {
      result[count] = hints[count % dn * len + Math.floor(count / dn)];
    }
    return result;
  },
  matchHintsByKey: function(hintMarkers, event, keyStatus) {
    var keyChar, key = event.keyCode;
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
    return hintMarkers.filter(keyStatus.tab ? function(linkMarker) {
      var pass = ! linkMarker.hintString.startsWith(keyChar);
      linkMarker.style.display = pass ? "" : "none";
      return pass;
    } : function(linkMarker) {
      var pass = linkMarker.hintString.startsWith(keyChar);
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
    child.VInsertMode.keydownEvents(VInsertMode.keydownEvents());
  } catch (e) {
    child.focus();
    return;
  }
  var cmd = {
    name: "focusFrame",
    frameId: -2
  }
  if (box) {
    cmd.box = [box.width, box.height];
  }
  child.MainPort.Listener(cmd);
  return false;
},

FUNC: {
  COPY_LINK_URL: function(link) {
    var str = this.getUrlData(link);
    if (!str) {
      VHUD.showForDuration("No url found", 1000);
      this.keepHUDAfterAct = true;
      return;
    }
    if (this.mode === this.CONST.EDIT_TEXT) {
      Vomnibar.activate(1, {
        url: str,
        keyword: this.options.keyword
      });
      return;
    }
    // NOTE: url should not be modified
    // although BackendUtils.convertToUrl does replace '\u3000' with ' '
    str = Utils.decodeURL(str);
    MainPort.port.postMessage({
      handler: "copyToClipboard",
      data: str
    });
    this.keepHUDAfterAct = true;
    VHUD.showCopied(str);
  },
  HOVER: function(element) {
    this.lastHovered = element;
    Scroller.current = element;
    DomUtils.simulateMouse(element, "mouseover");
  },
  LEAVE: function(element) {
    DomUtils.simulateMouse(element, "mouseout");
  },
  COPY_TEXT: function(link) {
    var str = (link.getAttribute("data-vim-text") || "").trim();
    if (str) {}
    else if ((str = link.nodeName.toLowerCase()) === "input") {
      str = link.type;
      if (str === "password") {
        str = "";
      } else if (!(str in DomUtils.uneditableInputs)) {
        str = (link.value || link.placeholder).trim();
      } else if (str === "file") {
        str = link.files.length > 0 ? link.files[0].name : "";
      } else if ("button submit reset".indexOf(str) >= 0) {
        str = link.value.trim() || link.title.trim();
      } else {
        str = link.title.trim(); // including `[type="image"]`
      }
    } else {
      str = str === "textarea" ? link.value
        : str === "select" ? (link.selectedIndex < 0 ? "" : link.options[link.selectedIndex].text)
        // .innerText is "" if "display:block; height:0px; overflow:hidden; width:0px;"
        : (link.innerText || Utils.decodeTextFromHtml(link.innerHTML));
      str = str.trim() || link.title.trim();
    }
    if (!str) {
      VHUD.showForDuration("No text found", 1000);
      this.keepHUDAfterAct = true;
      return;
    }
    if (this.mode === this.CONST.EDIT_TEXT) {
      Vomnibar.activateInNewTab(1, {
        url: str,
        keyword: this.options.keyword
      });
      return;
    } else if ((this.mode & ~64) === this.CONST.SEARCH_TEXT) {
      MainPort.port.postMessage({
        handler: "openUrlInNewTab",
        active: !(this.mode & 64),
        keyword: this.options.keyword,
        url: str
      });
      return;
    }
    MainPort.port.postMessage({
      handler: "copyToClipboard",
      data: str
    });
    this.keepHUDAfterAct = true;
    VHUD.showCopied(str);
  },
  OPEN_INCOGNITO_LINK: function(link) {
    var url = this.getUrlData(link);
    if (Utils.evalIfOK(url)) { return; }
    MainPort.port.postMessage({
      handler: "openUrlInIncognito",
      active: !(this.mode & 64),
      keyword: this.options.keyword,
      url: url
    });
  },
  DOWNLOAD_IMAGE: function(img) {
    var text = img.nodeName.toLowerCase() === "a" ? img.href : img.src, i, a;
    this.keepHUDAfterAct = true;
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
  },
  OPEN_IMAGE: function(img) {
    var text = img.nodeName.toLowerCase() === "a" ? img.href : img.src;
    if (!text) {
      this.keepHUDAfterAct = true;
      VHUD.showForDuration("Not an image", 1000);
      return;
    }
    MainPort.port.postMessage({
      handler: "openImageUrl",
      active: !(this.mode & 64),
      url: text
    });
  },
  DOWNLOAD_LINK: function(link) {
    var oldDownload, oldUrl;
    this.unhoverLast(link);
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
  },
  DEFAULT: function(link) {
    var mode = this.mode & 3, alterTarget, tag = link.nodeName.toLowerCase();
    this.unhoverLast(link);
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
};
