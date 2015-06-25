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
    COPY_TEXT: 129,
    SEARCH_TEXT: 130,
    DOWNLOAD_IMAGE: 131,
    OPEN_IMAGE: 132,
    DOWNLOAD_LINK: 136,
    COPY_LINK_URL: 137,
    OPEN_INCOGNITO_LINK: 138
  },
  FUNC: null,
  alphabetHints: null,
  filterHints: null,
  spanWrap: null,
  numberToHintString: null,
  getUrlData: null,
  hintMarkerContainingDiv: null,
  hintMarkers: [],
  linkActivator: null,
  mode: 0,
  delayMode: false,
  keepHUDAfterAct: false,
  keyStatus: {
    delay: 0,
    tab: false
  },
  handlerId: 0,
  initScrollY: 0,
  initScrollX: 0,
  initTimer: 0,
  isActive: false,
  markerMatcher: null,
  options: {},
  init: function() {
    this.filterHints.spanWrap = this.alphabetHints.spanWrap = this.spanWrap;
    this.filterHints.numberToHintString = this.alphabetHints.numberToHintString = this.numberToHintString;
    this.init = null;
  },
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
    this._activateMode(this.CONST.SEARCH_TEXT);
    this.options = options || {};
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
    var elements = this.getVisibleClickableElements(), rect, style;

    if (Settings.values.filterLinkHints) {
      this.markerMatcher = this.filterHints;
      elements.sort(function(a, b) {
        return a[0].innerHTML.length - b[0].innerHTML.length;
      })
    } else {
      this.markerMatcher = this.alphabetHints;
    }
    this.hintMarkers = elements.map(this.createMarkerFor);
    elements = null;
    this.markerMatcher.fillInMarkers(this.hintMarkers);
    this.isActive = true;

    // NOTE: if zoom > 1, although document.documentElement.scrollHeight is integer,
    //   its real rect may has a float width, such as 471.333 / 472
    rect = VRect.fromClientRect(document.documentElement.getBoundingClientRect());
    rect[0] = this.initScrollX = window.scrollX;
    rect[1] = this.initScrollY = window.scrollY;
    rect[2] = Math.min(rect[2], window.innerWidth + 60);
    rect[3] = Math.min(rect[3], window.innerHeight + 20);
    this.initScrollX = window.scrollX;
    this.initScrollY = window.scrollY;
    this.hintMarkerContainingDiv = DomUtils.addElementList(this.hintMarkers, {
      id: "vimHMC",
      className: "vimB vimR"
    });
    if (style = this.hintMarkerContainingDiv.style) {
      style.left = rect[0] + "px", style.top = rect[1] + "px";
      style.width = rect[2] + "px", style.height = rect[3] + "px";
    } else {
      this.deactivate();
      this.isActive = true;
      return;
    }
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
      tip = mode >= 192 ? "Hover nodes continuously" : "Hover selected";
      activator = this.FUNC.HOVER;
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
    var marker = document.createElement("div"), rect;
    marker.className = "vimB vimI vimLH";
    marker.clickableItem = link[0];
    rect = link[1];
    marker.style.left = rect[0] + "px";
    marker.style.top = rect[1] + "px";
    return marker;
  },
  hashRegex: /^#/,
  quoteRegex: /"/g,
  GetVisibleClickable: function(element) {
    var arr, isClickable = false, s, _i;
    switch (element.tagName.toLowerCase()) {
    case "a": isClickable = true; break;
    case "textarea": isClickable = !element.disabled && !element.readOnly; break;
    case "input":
      isClickable = !(element.type === "hidden" || element.disabled //
        || (element.readOnly && !(element.type in DomUtils.unselectableInputs)));
      break;
    case "button": case "select": isClickable = !element.disabled; break;
    case "script": case "link": case "style":
      return;
    case "img":
      if ((s = element.useMap) && (arr = element.getClientRects()).length > 0
          && arr[0].height > 3 && arr[0].width > 3) {
        // replace is necessary: chrome allows "&quot;", and also allows no "#"
        s = s.replace(LinkHints.hashRegex, "").replace(LinkHints.quoteRegex, '\\"');
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
        /* || ((s = element.className) && s.toLowerCase().indexOf("button") >= 0) */
        || ((s = element.getAttribute("role")) && (s = s.toLowerCase(), s === "button" || s === "link")) //
        // NOTE: .attr("contenteditable") allows ["", "true", "false", "plaintext-only", or "inherit"]
        //       : without case; "contentEditable" is not accepted
        //    if the attr "contenteditable" is not set, .contentEditable will be "inherit"
        //       : otherwise "true" or "false"
        //    .isContentEditable can only be true or false, which may be inherited from its parent
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
      if (s == null || !(s === "" || parseInt(s, 10) >= -1)) {
        return; // work around
      }
      isClickable = true, _i = -1;
      break;
    }
    if (isClickable && (arr = DomUtils.getVisibleClientRect(element))) {
      this.push([element, arr, _i !== -1]); // {element, rect, notSecond}
    }
  },
  GetLinks: function(element) {
    var a = element.getAttribute("data-vim-url"), arr;
    // NOTE: not judge `attr[data=vim-url] is "#"`
    //   just in case that someone make "#" an event for downloading / ...
    //   : then he can set [href=#][data-vim-url=...] to enable LinkHints
    if (a || ((a = element.getAttribute("href")) && a !== "#")) {
      if (arr = DomUtils.getVisibleClientRect(element)) {
        this.push([element, arr, true]);
      }
    }
  },
  imageUrlRegex: /\.(?:png|jpg|gif|jpeg|bmp|svg|ico|webp)\b/i,
  GetImages: function(element) {
    var str, rect, cr, w, h;
    if (element.nodeName.toLowerCase() === "img") {
      if (!element.src) { return; }
      else if ((w = element.width) < 8 && (h = element.height) < 8) {
        if (w !== h || (w !== 0 && w !== 3)) { return; }
        rect = element.getBoundingClientRect();
        w = rect.left, h = rect.top;
        cr = VRect.cropRectToVisible(w, h, w + 8, h + 8);
      } else if (DomUtils.isStyleVisible(element)) {
        rect = element.getBoundingClientRect();
        w = rect.right + (rect.width < 3 ? 3 : 0);
        h = rect.bottom + (rect.height < 3 ? 3 : 0);
        cr = VRect.cropRectToVisible(rect.left, rect.top, w, h);
      }
    } else if ((str = element.href) && LinkHints.imageUrlRegex.test(str)) {
      cr = DomUtils.getVisibleClientRect(element);
    }
    if (cr) {
      this.push([element, cr, true]);
    }
  },
  getVisibleClickableElements: function() {
    var output = [], visibleElements = [], visibleElement, rects, rects2, _len, _i;
    DomUtils.prepareCrop();
    if (this.mode == this.CONST.DOWNLOAD_IMAGE || this.mode == this.CONST.OPEN_IMAGE) {
      output.forEach.call(document.querySelectorAll(
        "a[href],img[src]"), this.GetImages.bind(visibleElements));
    } else if (this.mode >= 136) {
      output.forEach.call(document.querySelectorAll(
          "a[href],a[data-vim-url]"), this.GetLinks.bind(visibleElements));
    } else {
      output.forEach.call(document.documentElement.getElementsByTagName("*") //
        , this.GetVisibleClickable.bind(visibleElements));
    }
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
    if (this.delayMode || event.repeat) {
      // NOTE: should always prevent repeated keys.
    } else if ((_i = event.keyCode) === KeyCodes.esc) {
      if (KeyboardUtils.isPlain(event)) {
        this.deactivate();
      } else {
        return true;
      }
    } else if (_i > KeyCodes.f1 && _i <= KeyCodes.f12) {
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
    } else if (event.ctrlKey || event.metaKey) {
      if (event.shiftKey || event.altKey) {}
      else if (_i >= KeyCodes.left && _i <= KeyCodes.down) {
        MainPort.Listener({
          name: "executePageCommand",
          command: (_i === KeyCodes.left ? "scrollLeft"
            : _i === KeyCodes.up ? "scrollUp"
            : _i === KeyCodes.right ? "scrollRight"
            : "scrollDown"
          ),
          count: 1
        });
      }
    } else if (!(linksMatched = this.markerMatcher.matchHintsByKey(this.hintMarkers, event, this.keyStatus))){
      if (linksMatched === false) {
        this.reinit();
      }
    } else if (linksMatched.length === 0) {
      this.deactivate();
    } else if (linksMatched.length === 1) {
      DomUtils.suppressEvent(event);
      this.activateLink(linksMatched[0]);
    } else {
      _limit = this.keyStatus.tab ? 0 : this.markerMatcher.hintKeystrokeQueue.length;
      for (_i = linksMatched.length; 0 <= --_i; ) {
        _ref = linksMatched[_i].childNodes;
        for (_j = _ref.length; _limit <= --_j; ) {
          _ref[_j].classList.remove("vimMC");
        }
        for (; 0 <= _j; --_j) {
          _ref[_j].classList.add("vimMC");
        }
      }
    }
    return false;
  },
  activateLink: function(matchedLink) {
    var clickEl = matchedLink.clickableItem, temp, rect, parEl;
    this.delayMode = true;
    if (this.mode < 128) {
      if (DomUtils.isSelectable(clickEl)) {
        DomUtils.simulateSelect(clickEl);
        this.deactivate();
        return;
      }
      if (clickEl.nodeName.toLowerCase() === "input") {
        temp = clickEl.type;
        if (temp !== "button" && temp !== "submit" && temp !== "image") {
          clickEl.focus();
        }
      }
    }
    if (clickEl.classList.contains("vimOIUrl")
      && DomUtils.isDOMDescendant(Vomnibar.vomnibarUI.box, clickEl)) {
      rect = Vomnibar.vomnibarUI.computeHint(clickEl.parentElement.parentElement, clickEl);
    }
    if (rect) {
    } else if (clickEl.nodeName.toLowerCase() !== "area") {
      rect = VRect.fromClientRect(clickEl.getBoundingClientRect());
    } else {
      parEl = clickEl;
      while (parEl = parEl.parentElement) {
      if (parEl.nodeName.toLowerCase() !== "map") { continue; }
      temp = parEl.name.replace(LinkHints.quoteRegex, '\\"');
      parEl = document.querySelector('img[usemap="#' + temp + '"],img[usemap="'
        + temp + '"]');
      if (parEl) {
        DomUtils.getClientRectsForAreas(rect = [], parEl.getBoundingClientRect()
          , true, [clickEl]);
        rect = rect[0];
      }
      break;
      }
      rect || (rect = [0, 0, 0, 0]);
    }
    DomUtils.flashVRect(rect);
    this.linkActivator(clickEl);
    if ((this.mode & 64) === 64) {
      this.reinit();
    } else {
      this.deactivateWith();
    }
  },
  reinit: function() {
    var mode = this.mode, linkActivator = this.linkActivator;
    this.deactivateWith(function() {
      this.linkActivator = linkActivator;
      this._activateMode(mode);
    });
  },
  deactivate: function(callback) {
    this.markerMatcher.deactivate();
    this.linkActivator = null;
    this.hintMarkers = [];
    if (this.hintMarkerContainingDiv) {
      DomUtils.removeNode(this.hintMarkerContainingDiv);
      this.hintMarkerContainingDiv = null;
    }
    this.keyStatus.tab = false;
    handlerStack.remove(this.handlerId);
    this.handlerId = 0;
    if (this.keepHUDAfterAct) {
      this.keepHUDAfterAct = false;
    } else {
      VHUD.hide();
    }
    this.mode = 0;
    this.isActive = false;
    this.delayMode = false;
    if (callback) {
      callback.call(this);
    }
  },
  deactivateWith: function(callback) {
    var delay = this.keyStatus.delay;
    if (delay) {
      setTimeout(this.deactivate.bind(this, callback), delay);
    } else {
      this.deactivate(callback);
    }
  },
  destroy: function() {
    if (this.isActive) {
      this.deactivate();
    }
    LinkHints = null;
  }
};

LinkHints.alphabetHints = {
  hintKeystrokeQueue: [],
  spanWrap: null,
  numberToHintString: null,
  logXOfBase: function(x, base) {
    return Math.log(x) / Math.log(base);
  },
  fillInMarkers: function(hintMarkers) {
    var hintStrings, idx, marker, _len;
    hintStrings = this.hintStrings(hintMarkers.length);
    for (idx = 0, _len = hintMarkers.length; idx < _len; ++idx) {
      marker = hintMarkers[idx];
      marker.hintString = hintStrings[idx];
      marker.innerHTML = this.spanWrap(marker.hintString.toUpperCase());
    }
    return hintMarkers;
  },
  hintStrings: function(linkCount) {
    var digitsNeeded, hintStrings, i, linkHintCharacters, longHintCount, shortHintCount, start, _ref;
    linkHintCharacters = Settings.values.linkHintCharacters;
    digitsNeeded = Math.ceil(this.logXOfBase(linkCount, linkHintCharacters.length));
    shortHintCount = Math.floor((Math.pow(linkHintCharacters.length, digitsNeeded) - linkCount) / linkHintCharacters.length);
    longHintCount = linkCount - shortHintCount;
    hintStrings = [];
    if (digitsNeeded > 1) {
      for (i = 0; i < shortHintCount; ++i) {
        hintStrings.push(this.numberToHintString(i, linkHintCharacters, digitsNeeded - 1));
      }
    }
    start = shortHintCount * linkHintCharacters.length;
    for (i = start, _ref = start + longHintCount; i < _ref; ++i) {
      hintStrings.push(this.numberToHintString(i, linkHintCharacters, digitsNeeded));
    }
    return this.shuffleHints(hintStrings, linkHintCharacters.length);
  },
  shuffleHints: function(hints, characterSetLength) {
    var buckets, result, i, _len;
    buckets = new Array(characterSetLength);
    for (i = 0, _len = characterSetLength; i < _len; ++i) {
      buckets[i] = [];
    }
    for (i = 0, _len = hints.length; i < _len; ++i) {
      buckets[i % characterSetLength].push(hints[i]);
    }
    result = [];
    for (i = 0, _len = characterSetLength; i < _len; ++i) {
      result = result.concat(buckets[i]);
    }
    return result;
  },
  matchHintsByKey: function(hintMarkers, event, keyStatus) {
    var keyChar, key = event.keyCode;
    if (key === KeyCodes.tab) {
      if (this.hintKeystrokeQueue.length === 0) {
        return false;
      }
      keyStatus.tab = !keyStatus.tab;
    } else if (keyStatus.tab) {
      this.hintKeystrokeQueue = [];
      keyStatus.tab = false;
    }
    if (key === KeyCodes.tab) {}
    else if (key === KeyCodes.backspace || key === KeyCodes.deleteKey || key === KeyCodes.f1) {
      if (!this.hintKeystrokeQueue.pop()) {
        return [];
      }
    } else if (key === KeyCodes.space) {
      return [];
    } else if (keyChar = KeyboardUtils.getKeyChar(event).toLowerCase()) {
      this.hintKeystrokeQueue.push(keyChar);
    } else {
      return null;
    }
    keyChar = this.hintKeystrokeQueue.join("");
    keyStatus.delay = 0;
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

LinkHints.filterHints = {
  hintKeystrokeQueue: [],
  linkTextKeystrokeQueue: [],
  labelMap: {},
  spanWrap: null,
  numberToHintString: null,
  generateLabelMap: function() {
    var forElement, label, labelText, labels, _i, _len;
    labels = document.querySelectorAll("label");
    for (_i = 0, _len = labels.length; _i < _len; _i++) {
      label = labels[_i];
      forElement = label.getAttribute("for");
      if (forElement) {
        labelText = label.textContent.trim();
        if (labelText[labelText.length - 1] === ":") {
          labelText = labelText.substring(0, labelText.length - 1);
        }
        this.labelMap[forElement] = labelText;
      }
    }
  },
  generateHintString: function(linkHintNumber) {
    return (this.numberToHintString(linkHintNumber + 1, Settings.values.linkHintNumbers || "")).toUpperCase();
  },
  generateLinkText: function(element) {
    var linkText, nodeName, showLinkText;
    linkText = "";
    showLinkText = false;
    nodeName = element.nodeName.toLowerCase();
    if (nodeName === "input") {
      if (this.labelMap[element.id]) {
        linkText = this.labelMap[element.id];
        showLinkText = true;
      } else if (element.type !== "password") {
        linkText = element.value;
        if (!linkText && element.placeholder) {
          linkText = element.placeholder;
        }
      }
    } else if (nodeName === "a" && !element.textContent.trim() && element.firstElementChild && element.firstElementChild.nodeName.toLowerCase() === "img") {
      linkText = element.firstElementChild.alt || element.firstElementChild.title;
      if (linkText) {
        showLinkText = true;
      }
    } else {
      linkText = element.textContent || element.innerHTML;
    }
    return {
      text: linkText,
      show: showLinkText
    };
  },
  renderMarker: function(marker) {
    marker.innerHTML = marker.showLinkText ? this.spanWrap(marker.hintString + ": " + marker.linkText) : this.spanWrap(marker.hintString);
  },
  fillInMarkers: function(hintMarkers) {
    var idx, linkTextObject, marker, _i, _len;
    this.generateLabelMap();
    for (idx = _i = 0, _len = hintMarkers.length; _i < _len; idx = ++_i) {
      marker = hintMarkers[idx];
      marker.hintString = this.generateHintString(idx);
      linkTextObject = this.generateLinkText(marker.clickableItem);
      marker.linkText = linkTextObject.text;
      marker.linkTextLower = linkTextObject.text.toLowerCase();
      marker.showLinkText = linkTextObject.show;
      this.renderMarker(marker);
    }
    return hintMarkers;
  },
  matchHintsByKey: function(hintMarkers, event, keyStatus) {
    var key = event.keyCode, keyChar, userIsTypingLinkText = false;
    if (key === KeyCodes.enter) {
      keyStatus.tab = false;
      for (var marker, _i = 0, _len = hintMarkers.length; _i < _len; _i++) {
        marker = hintMarkers[_i];
        if (marker.style.display !== "none") {
          keyStatus.delay = 0;
          return [marker];
        }
      }
      return null;
    }
    if (key === KeyCodes.tab) {
      if (this.hintKeystrokeQueue.length === 0) {
        return false;
      }
      keyStatus.tab = !keyStatus.tab;
    } else if (keyStatus.tab) {
      this.hintKeystrokeQueue = [];
      keyStatus.tab = false;
    }
    if (key === KeyCodes.tab) {}
    else if (key === KeyCodes.backspace || key === KeyCodes.deleteKey || key === KeyCodes.f1) {
      if (!this.hintKeystrokeQueue.pop() && !this.linkTextKeystrokeQueue.pop()) {
        return [];
      }
    } else if (!(keyChar = KeyboardUtils.getKeyChar(event).toLowerCase())) {
      return null;
    } else if (key !== KeyCodes.space && (Settings.values.linkHintNumbers).indexOf(keyChar) >= 0) {
      this.hintKeystrokeQueue.push(keyChar);
    } else {
      this.hintKeystrokeQueue = [];
      this.linkTextKeystrokeQueue.push(keyChar);
      userIsTypingLinkText = true;
    }
    keyChar = this.hintKeystrokeQueue.join("");
    hintMarkers = this.filterLinkHints(hintMarkers).filter(keyStatus.tab ? function(linkMarker) {
      var pass = ! linkMarker.hintString.startsWith(keyChar);
      linkMarker.style.display = pass ? "" : "none";
      return pass;
    } : function(linkMarker) {
      var pass = linkMarker.hintString.startsWith(keyChar);
      linkMarker.style.display = pass ? "" : "none";
      return pass;
    });
    keyStatus.delay = (hintMarkers.length === 1 && userIsTypingLinkText) ? 200 : 0;
    return hintMarkers;
  },
  filterLinkHints: function(hintMarkers) {
    var linkMarker, linkSearchString, linksMatched, oldHintString, _i, _len, doLinkSearch;
    linksMatched = [];
    linkSearchString = this.linkTextKeystrokeQueue.join("");
    doLinkSearch = linkSearchString.length > 0;
    for (_i = 0, _len = hintMarkers.length; _i < _len; _i++) {
      linkMarker = hintMarkers[_i];
      if (doLinkSearch && linkMarker.linkTextLower.indexOf(linkSearchString) === -1) {
        linkMarker.style.display = "none";
        continue;
      }
      oldHintString = linkMarker.hintString;
      linkMarker.hintString = this.generateHintString(linksMatched.length);
      if (linkMarker.hintString !== oldHintString) {
        this.renderMarker(linkMarker);
      }
      linkMarker.style.display = "";
      linksMatched.push(linkMarker);
    }
    return linksMatched;
  },
  deactivate: function() {
    this.hintKeystrokeQueue = [];
    this.linkTextKeystrokeQueue = [];
    this.labelMap = {};
  }
};

LinkHints.spanWrap = function(hintString) {
  for (var _i = 0, _j = -1, _len = hintString.length, innerHTML = new Array(_len * 3); _i < _len; _i++) {
    innerHTML[++_j] = "<span class=\"vimB vimI\">";
    innerHTML[++_j] = hintString[_i];
    innerHTML[++_j] = "</span>";
  }
  return innerHTML.join("");
};

LinkHints.numberToHintString = function(number, characterSet, numHintDigits) {
  var base, hintString, leftLength, remainder;
  if (numHintDigits == null) {
    numHintDigits = 0;
  }
  base = characterSet.length;
  hintString = [];
  remainder = 0;
  while (true) {
    remainder = number % base;
    hintString.unshift(characterSet[remainder]);
    number -= remainder;
    number /= Math.floor(base);
    if (!(number > 0)) {
      break;
    }
  }
  leftLength = numHintDigits - hintString.length;
  while (0 <= --leftLength) {
    hintString.unshift(characterSet[0]);
  }
  return hintString.join("");
};

LinkHints.getUrlData = function(link) {
  var str = link.getAttribute("data-vim-url");
  if (str) {
    link = document.createElement("a");
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
    handlerStack.bubbleEvent("DOMActivate", {
      preventDefault: function() {},
      stopImmediatePropagation: function() {},
      target: element
    });
    DomUtils.simulateHover(element);
  },
  COPY_TEXT: function(link) {
    var str = (link.getAttribute("data-vim-text") || "").trim();
    str = str ? str
      : (str = link.nodeName.toLowerCase()) === "textarea" ? link.value
      : (str === "input" && !(link.type in DomUtils.inputsNoFocus)) ? link.value
      // .innerText is "" if "display:block; height:0px; overflow:hidden; width:0px;"
      : (link.innerText.trim() || Utils.decodeTextFromHtml(link.innerHTML));
    str = (str.trim() || link.title).replace(Utils.spacesRegex, ' ').trim();
    if (!str) {
      VHUD.showForDuration("No text found", 1000);
      this.keepHUDAfterAct = true;
      return;
    }
    if (this.mode === this.CONST.SEARCH_TEXT) {
      MainPort.port.postMessage({
        handler: "openUrlInNewTab",
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
      keyword: this.options.keyword,
      url: url,
      active: (this.mode & 64) !== 64
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
    a = document.createElement("a");
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
      url: text
    });
  },
  DOWNLOAD_LINK: function(link) {
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
  },
  DEFAULT: function(link) {
    var mode = this.mode & 3, alterTarget;
    if (mode >= 2 && link.nodeName.toLowerCase() === "a") {
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

LinkHints.__proto__ = null;
LinkHints.alphabetHints.__proto__ = null;
LinkHints.filterHints.__proto__ = null;
LinkHints.CONST.__proto__ = null;
LinkHints.FUNC.__proto__ = null;
