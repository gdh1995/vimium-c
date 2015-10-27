"use strict";
var LinkHints = {
  CONST: {
    // focused: 1; new tab: 2; queue: 64; job: 128
    // >=128: "&4" means "must be links" and [data-vim-url] is used firstly
    //   &~64 >= 136 means only `<a>`
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
    OPEN_INCOGNITO_LINK: 138
  },
  FUNC: null,
  alphabetHints: null,
  getUrlData: null,
  hintMarkerContainingDiv: null,
  hintMarkers: [],
  linkActivator: null,
  mode: 0,
  isClickListened: true,
  ngIgnored: true,
  ngAttribute: "",
  // find /^((?:x|data)[:_\-])?ng-|^ng:/, and ignore "data:", "data_" and "x_"
  ngAttributes: ["x:ng-click", "ng:click", "x-ng-click", "data-ng-click", "ng-click"],
  keepHUDAfterAct: false,
  keyStatus: {
    known: 1,
    tab: 0
  },
  handlerId: 0,
  initScrollY: 0,
  initScrollX: 0,
  initTimer: 0,
  isActive: false,
  options: {},
  activateModeToOpenInNewTab: function() {
    this._activateMode(this.CONST.OPEN_IN_NEW_BG_TAB);
  },
  activateModeToOpenInNewForegroundTab: function() {
    this._activateMode(this.CONST.OPEN_IN_NEW_FG_TAB);
  },
  activateModeToCopyLinkUrl: function() {
    this._activateMode(this.CONST.COPY_LINK_URL);
  },
  activateModeToCopyLinkText: function() {
    this._activateMode(this.CONST.COPY_TEXT);
  },
  activateModeToSearchLinkText: function(_0, options) {
    this.options = options;
    this._activateMode(this.CONST.SEARCH_TEXT);
  },
  activateModeWithQueue: function() {
    this._activateMode(this.CONST.OPEN_WITH_QUEUE);
  },
  activateModeToOpenIncognito: function() {
    this._activateMode(this.CONST.OPEN_INCOGNITO_LINK);
  },
  activateModeToDownloadLink: function() {
    this._activateMode(this.CONST.DOWNLOAD_LINK);
  },
  activateModeToDownloadImage: function() {
    this._activateMode(this.CONST.DOWNLOAD_IMAGE);
  },
  activateModeToOpenImage: function() {
    this._activateMode(this.CONST.OPEN_IMAGE);
  },
  activateModeToHover: function() {
    this._activateMode(this.CONST.HOVER);
  },
  activateModeToLeave: function() {
    this._activateMode(this.CONST.LEAVE);
  },
  activateMode: function() {
    this._activateMode(this.CONST.OPEN_IN_CURRENT_TAB);
  },
  _activateMode: function(mode) {
    if (this.isActive) {
      return;
    } else if (document.body == null) {
      if (!this.initTimer) {
        this.initTimer = setInterval(this._activateMode.bind(this, mode), 300);
      } else if (!document.head) {
        clearInterval(this.initTimer); // document is not a <html> document
        this.initTimer = 0;
        this.isActive = true; // disable self
      }
      return;
    } else if (this.initTimer) {
      clearInterval(this.initTimer);
      this.initTimer = 0;
    }
    this.setOpenLinkMode(mode);
    var elements, rect, style, width, height;

    elements = this.getVisibleClickableElements();
    this.hintMarkers = elements.map(this.createMarkerFor);
    elements = null;
    this.alphabetHints.fillInMarkers(this.hintMarkers);
    this.isActive = true;

    this.initScrollX = window.scrollX; this.initScrollY = window.scrollY;
    var container = document.documentElement;
    // NOTE: if zoom > 1, although document.documentElement.scrollHeight is integer,
    //   its real rect may has a float width, such as 471.333 / 472
    rect = container.getBoundingClientRect();
    width = rect.width; height = rect.height;
    width = width !== (width | 0) ? 1 : 0; height = height !== (height | 0) ? 1 : 0;
    width  = container.scrollWidth  - this.initScrollX - width ;
    height = container.scrollHeight - this.initScrollY - height;
    width  = Math.max(width,  container.clientWidth );
    height = Math.max(height, container.clientHeight);
    width  = Math.min(width,  window.innerWidth  + 60);
    height = Math.min(height, window.innerHeight + 20);
    this.hintMarkerContainingDiv = DomUtils.UI.addElementList(this.hintMarkers, {
      id: "HMC",
      className: "R"
    });
    style = this.hintMarkerContainingDiv.style;
    style.left = this.initScrollX + "px"; style.top = this.initScrollY + "px";
    style.width = width + "px"; style.height = height + "px";
    if (document.webkitFullscreenElement) { style.position = "fixed"; }
    this.handlerId = handlerStack.push({
      keydown: this.onKeyDownInMode,
      _this: this
    });
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
             element.getAttribute("onclick") || element.hasOnclick
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
        || (LinkHints.isClickListened && element.hasOnclick)
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
    // NOTE: not judge `.attr("data-vim-url") is "#"`
    //   just in case that someone make "#" an event for downloading / ...
    //   : then he can set [href=#][data-vim-url=...] to enable LinkHints
    if (a || ((a = element.getAttribute("href")) && a !== "#")) {
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
      rect = element.getBoundingClientRect();
      w = rect.left; h = rect.top;
      cr = VRect.cropRectToVisible(w, h, w + 8, h + 8);
    } else if (DomUtils.isStyleVisible(window.getComputedStyle(element))) {
      rect = element.getBoundingClientRect();
      w = rect.right + (rect.width < 3 ? 3 : 0);
      h = rect.bottom + (rect.height < 3 ? 3 : 0);
      cr = VRect.cropRectToVisible(rect.left, rect.top, w, h);
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
  traverse: function(map) {
    var output = [], key, func, container;
    Utils.setNullProto(map);
    DomUtils.prepareCrop();
    container = document.webkitFullscreenElement || document;
    if (this.ngIgnored && "*" in map) {
      this.ngIgnored = container.querySelector('.ng-scope') === null;
    }
    this.isClickListened = Settings.values.isClickListened;
    for (key in map) {
      if (Settings.values.deepHints) {
        output.forEach.call(container.querySelectorAll("* /deep/ " + key)
          , map[key].bind(output));
        continue;
      }
      func = map[key].bind(output);
      output.forEach.call(container.getElementsByTagName(key), func);
      output.forEach.call(DomUtils.UI.root.querySelectorAll(key), func);
    }
    if (!this.ngIgnored && !this.ngAttribute) { this.ngAttribute = "ng-click"; }
    return output;
  },
  getVisibleClickableElements: function() {
    var output = [], visibleElements, visibleElement, rects, rects2, _len, _i;
    _i = this.mode & ~64;
    visibleElements = this.traverse(
      (_i == this.CONST.DOWNLOAD_IMAGE || _i == this.CONST.OPEN_IMAGE)
      ? { img: this.GetImagesInImg, a: this.GetImagesInA }
      : _i >= 136 ? { a: this.GetLinks }
      : { "*": this.GetVisibleClickable });
    visibleElements.reverse();
    for (_len = visibleElements.length; 0 <= --_len; ) {
      visibleElement = visibleElements[_len];
      rects = [visibleElement[1]];
      for (_i = 0; _i < _len; _i++) {
        rects.forEach(VRect.SubtractSequence.bind(rects2 = [], visibleElements[_i][1]));
        if ((rects = rects2).length === 0) {
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
    var linksMatched, _i, _j, _ref, _limit;
    if (event.repeat) {
      // NOTE: should always prevent repeated keys.
    } else if ((_i = event.keyCode) === KeyCodes.esc) {
      if (KeyboardUtils.isPlain(event)) {
        this.deactivate();
      } else {
        return true;
      }
    } else if (_i > KeyCodes.f1 && _i <= KeyCodes.f12) {
      if (_i === KeyCodes.f1 + 1) {
        if (event.shiftKey) {
          Settings.values.isClickListened = !Settings.values.isClickListened;
        } else {
          Settings.values.deepHints = !Settings.values.deepHints;
        }
        this.reinit();
        return false;
      }
      return true;
    } else if (_i === KeyCodes.shiftKey) {
      if (this.mode < 128) {
        this.setOpenLinkMode((this.mode | 1) ^ (this.mode < 64 ? 3 : 67));
      }
    } else if (_i === KeyCodes.ctrlKey || _i === KeyCodes.metaKey) {
      if (this.mode < 128) {
        this.setOpenLinkMode((this.mode | 2) ^ 1);
      }
    } else if (_i === KeyCodes.altKey) {
      this.setOpenLinkMode(((this.mode >= 128 ? 0 : 2) | this.mode) ^ 64);
    } else if (_i >= KeyCodes.pageup && _i <= KeyCodes.down) {
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
      this.deactivate();
      this.suppressTail(this.keyStatus.known);
    } else if (linksMatched.length === 1) {
      DomUtils.suppressEvent(event);
      this.activateLink(linksMatched[0].clickableItem);
    } else {
      _limit = this.keyStatus.tab ? 0 : this.alphabetHints.hintKeystrokeQueue.length;
      for (_i = linksMatched.length; 0 <= --_i; ) {
        _ref = linksMatched[_i].childNodes;
        for (_j = _ref.length; _limit <= --_j; ) {
          _ref[_j].classList.remove("MC");
        }
        for (; 0 <= _j; --_j) {
          _ref[_j].classList.add("MC");
        }
      }
    }
    return false;
  },
  activateLink: function(clickEl) {
    var tempi;
    if (this.mode >= 128) {}
    else if ((tempi = DomUtils.getEditableType(clickEl)) === 3) {
      DomUtils.simulateSelect(clickEl);
      DomUtils.UI.flashOutline(clickEl);
      this.deactivate();
      return;
    }
    else if (tempi > 0) { clickEl.focus(); }
    DomUtils.UI.flashOutline(clickEl);
    this.linkActivator(clickEl);
    if ((this.mode & 64) === 64) {
      this.reinit();
    } else {
      this.deactivate();
    }
  },
  lastHovered: null,
  unhoverLast: function(element) {
    if (!(element instanceof Element)) {
      element = null;
    }
    this.lastHovered && DomUtils.simulateMouse(this.lastHovered, "mouseout", element);
    this.lastHovered = element;
  },
  suppressTail: function(onlyRepeated) {
    var func, handlerId, tick, timer;
    if (onlyRepeated) {
      func = function(event) {
        if (event.repeat) { return false; }
        handlerStack.remove(handlerId);
        return true;
      };
    } else {
      func = function(event) { tick = Date.now(); return false; };
      tick = Date.now() + Settings.values.keyboard[0];
      timer = setInterval(function() {
        if (Date.now() - tick > 150) {
          clearInterval(timer);
          handlerStack.remove(handlerId);
        }
      }, 75);
    }
    handlerId = handlerStack.push({ keydown: func, keypress: func });
  },
  reinit: function() {
    var mode = this.mode, linkActivator = this.linkActivator, options = this.options;
    this.deactivate();
    this.linkActivator = linkActivator;
    this.options = options;
    this._activateMode(mode);
  },
  deactivate: function() {
    this.alphabetHints.deactivate();
    this.linkActivator = null;
    this.hintMarkers = [];
    if (this.hintMarkerContainingDiv) {
      this.hintMarkerContainingDiv.remove();
      this.hintMarkerContainingDiv = null;
    }
    this.keyStatus.tab = 0;
    handlerStack.remove(this.handlerId);
    this.handlerId = 0;
    if (this.keepHUDAfterAct) {
      this.keepHUDAfterAct = false;
    } else {
      VHUD.hide();
    }
    this.mode = 0;
    this.options = null;
    this.isActive = false;
  }
};

LinkHints.alphabetHints = {
  chars: "",
  hintKeystrokeQueue: [],
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
    this.chars = Settings.values.linkHintCharacters.toUpperCase();
    end = hintMarkers.length;
    hintStrings = this.hintStrings(end);
    while (0 <= --end) {
      marker = hintMarkers[end];
      marker.innerHTML = this.spanWrap(marker.hintString = hintStrings[end]);
    };
    return hintMarkers;
  },
  hintStrings: function(linkCount) {
    var dn, hintStrings, i, len, end, a;
    hintStrings = new Array(linkCount);
    len = this.chars.length;
    a = Math.log(linkCount) / Math.log(len);
    dn = Math.ceil(a);
    i = 0;
    if (dn >= 2 && dn > a) {
      a = Math.pow(len, a - Math.floor(a));
      end = Math.floor((len - a) / (len - 1) * len) * Math.pow(len, dn - 2);
      for (; i < end; ++i) {
        hintStrings[i] = this.numberToHintString(i, this.chars, dn - 1);
      }
      end *= len - 1;
    } else {
      end = 0;
    }
    for (; i < linkCount; ++i) {
      hintStrings[i] = this.numberToHintString(i + end, this.chars, dn);
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
      if (this.hintKeystrokeQueue.length === 0) {
        return false;
      }
      keyStatus.tab = keyStatus.tab ? 0 : 1;
    } else if (keyStatus.tab) {
      this.hintKeystrokeQueue = [];
      keyStatus.tab = 0;
    }
    if (key === KeyCodes.tab) {}
    else if (key === KeyCodes.backspace || key === KeyCodes.deleteKey || key === KeyCodes.f1) {
      if (!this.hintKeystrokeQueue.pop()) {
        keyStatus.known = 1;
        return [];
      }
    } else if (key === KeyCodes.space) {
      keyStatus.known = 1;
      return [];
    } else if (keyChar = KeyboardUtils.getKeyChar(event).toUpperCase()) {
      if (this.chars.indexOf(keyChar) === -1) {
        keyStatus.known = 1;
        return [];
      }
      this.hintKeystrokeQueue.push(keyChar);
    } else {
      return null;
    }
    keyStatus.known = 0;
    keyChar = this.hintKeystrokeQueue.join("");
    return hintMarkers.filter(keyStatus.tab ? function(linkMarker) {
      var pass = ! linkMarker.hintString.startsWith(keyChar);
      linkMarker.style.display = pass ? "" : "none";
      return pass;
    } : function(linkMarker) {
      var pass = linkMarker.hintString.startsWith(keyChar);
      linkMarker.style.display = pass ? "" : "none";
      return pass;
    });
  },
  deactivate: function() {
    this.hintKeystrokeQueue = [];
  }
};

LinkHints.getUrlData = function(link) {
  var str = link.getAttribute("data-vim-url");
  if (str) {
    link = DomUtils.createElement("a");
    link.href = str.trim();
  }
  return link.href;
};

LinkHints.FUNC = {
  COPY_LINK_URL: function(link) {
    var str = this.getUrlData(link);
    if (!str) {
      VHUD.showForDuration("No url found", 1000);
      this.keepHUDAfterAct = true;
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
      } else if (["button", "submit", "reset"].indexOf(str) >= 0) {
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
    if ((this.mode & ~64) === this.CONST.SEARCH_TEXT) {
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
    a.download = "";
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
      link.contentWindow.focus();
      return;
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
};
