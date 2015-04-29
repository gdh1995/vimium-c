"use strict";
var LinkHints = {
  CONST: {
    // focused: 1; new tab: 2; queue: 64; job: 128
    OPEN_IN_CURRENT_TAB: 0, // also 1
    OPEN_IN_NEW_BG_TAB: 2,
    OPEN_IN_NEW_FG_TAB: 1 + 2,
    OPEN_WITH_QUEUE: 2 + 64,
    OPEN_FG_WITH_QUEUE: 1 + 2 + 64,
    DOWNLOAD_LINK: 128 + 0,
    COPY_LINK_URL: 128 + 1,
    COPY_LINK_TEXT: 128 + 2,
    HOVER: 128 + 3,
    OPEN_INCOGNITO: 128 + 4
  },
  alphabetHints: null,
  filterHints: null,
  spanWrap: null,
  numberToHintString: null,
  hintMarkerContainingDiv: null,
  hintMarkers: [],
  linkActivator: null,
  mode: 0,
  delayMode: false,
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
  init: function() {
    this.filterHints.spanWrap = this.alphabetHints.spanWrap = this.spanWrap;
    this.filterHints.numberToHintString = this.alphabetHints.numberToHintString = this.numberToHintString;
  },
  activateModeToOpenInNewTab: function() {
    return this.activateMode(this.CONST.OPEN_IN_NEW_BG_TAB);
  },
  activateModeToOpenInNewForegroundTab: function() {
    return this.activateMode(this.CONST.OPEN_IN_NEW_FG_TAB);
  },
  activateModeToCopyLinkUrl: function() {
    return this.activateMode(this.CONST.COPY_LINK_URL);
  },
  activateModeToCopyLinkText: function() {
    return this.activateMode(this.CONST.COPY_LINK_TEXT);
  },
  activateModeWithQueue: function(mode) {
    return this.activateMode(mode || this.CONST.OPEN_WITH_QUEUE);
  },
  activateModeToOpenIncognito: function() {
    return this.activateMode(this.CONST.OPEN_INCOGNITO);
  },
  activateModeToDownloadLink: function() {
    return this.activateMode(this.CONST.DOWNLOAD_LINK);
  },
  activateModeToHover: function() {
    return this.activateMode(this.CONST.HOVER);
  },
  activateMode: function(mode) {
    if (this.isActive) {
      return;
    } else if (document.body == null) {
      if (!this.initTimer) {
        this.initTimer = setInterval(this.activateMode.bind(this, mode), 300);
      } else if (document.head == null) {
        clearInterval(this.initTimer); // document is not a <html> document
        this.initTimer = 0;
      }
      return;
    }
    if (this.initTimer) {
      clearInterval(this.initTimer);
      this.initTimer = 0;
    }
    this.markerMatcher = settings.values.filterLinkHints ? this.filterHints : this.alphabetHints;
    this.setOpenLinkMode(mode || 0);
    this.hintMarkers = this.getVisibleClickableElements().map(this.createMarkerFor);
    this.markerMatcher.fillInMarkers(this.hintMarkers);
    this.isActive = true;
    this.initScrollX = window.scrollX;
    this.initScrollY = window.scrollY;
    this.hintMarkerContainingDiv = DomUtils.addElementList(this.hintMarkers, {
      id: "vimHMC",
      className: "vimB vimR"
    });
    this.ensureRightBottom();
    this.hintMarkerContainingDiv.style.left = window.scrollX + "px";
    this.hintMarkerContainingDiv.style.top = window.scrollY + "px";
    this.handlerId = handlerStack.push({
      keydown: this.onKeyDownInMode,
      _this: this
    });
  },
  setOpenLinkMode: function(mode) {
    var cons = this.CONST;
    switch (mode >= 128 ? ((mode | 64) ^ 64) : mode) {
    case cons.OPEN_IN_NEW_BG_TAB:
      HUD.show("Open a link in new tab");
      break;
    case cons.OPEN_IN_NEW_FG_TAB: 
      HUD.show("Open in new active tab");
      break;
    case cons.OPEN_WITH_QUEUE:
      HUD.show("Open multiple tabs");
      break;
    case cons.OPEN_FG_WITH_QUEUE:
      HUD.show("activate link and hold on");
      break;
    case cons.COPY_LINK_URL:
      HUD.show(mode >= 192 ? "Copy link URL one by one" : "Copy link URL to Clipboard");
      this.linkActivator = this.linkActivator || function(link) {
        var str = (link.getAttribute("data-vim-url") || link.href).trim() || "";
        if (!str) return;
        // NOTE: url should not be modified
        // although BackendUtils.convertToUrl does replace '\u3000' with ' '
        str = Utils.decodeURL(str);
        mainPort.postMessage({
          handler: "copyToClipboard",
          data: str
        });
        // HUD.showForDuration("copy URL: " + ((str.length > 28)
          // ? (str.substring(0, 25) + "...") : str), 2000);
      };
      break;
    case cons.COPY_LINK_TEXT:
      HUD.show(mode >= 192 ? "Copy link text one by one" : "Copy link text to Clipboard");
      this.linkActivator = this.linkActivator || function(link) {
        var str = (link.getAttribute("data-vim-text") || "").trim() || link.innerText.trim();
        str = str || Utils.decodeTextFromHtml(link.innerHTML).trim() || link.title.trim();
        if (!str) return;
        str = Utils.correctSpace(str);
        mainPort.postMessage({
          handler: "copyToClipboard",
          data: str
        });
        // HUD.showForDuration("copy text: " + ((str.length > 18)
          // ? (str.substring(0, 15) + "...") : str), 2000);
      };
      break;
    case cons.OPEN_INCOGNITO:
      HUD.show(mode >= 192 ? "Open multi incognito tabs" : "Open link in incognito");
      this.linkActivator = this.linkActivator || function(link) {
        mainPort.postMessage({
          handler: 'openUrlInIncognito',
          url: (link.getAttribute("data-vim-url") || link.href).trim(),
          active: (this.mode & 64) !== 64
        });
      };
      break;
    case cons.DOWNLOAD_LINK:
      HUD.show(mode >= 192 ? "Download multiple links" : "Download a link");
      this.linkActivator = this.linkActivator || function(link) {
        var isA = (link.nodeName.toLowerCase() === "a"), oldDownload, oldUrl;
        if (isA) {
          oldUrl = link.getAttribute("href");
          oldDownload = link.getAttribute("data-vim-url");
          if (oldDownload && (oldDownload = oldDownload.trim())) {
            link.href = oldDownload;
          }
          oldDownload = link.getAttribute("download");
          if (oldDownload == null) {
            link.download = "";
          }
        }
        DomUtils.simulateClick(link, {
          altKey: true,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false
        });
        if (isA) {
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
      };
      break;
    case cons.HOVER:
      HUD.show(mode >= 192 ? "hover objects continuously" : "hover selected");
      this.linkActivator = this.linkActivator || function(link) {
        DomUtils.simulateHover(link);
      };
      break;
    default:
      HUD.show("Open link in current tab");
      mode != 1 && (mode = 0);
      break;
    }
    if (!this.linkActivator && mode < 128) {
      this.linkActivator = function(link) {
        // NOTE: not clear last hovered item, for that it may be a menu
        DomUtils.simulateClick(link, {
          altKey: false,
          ctrlKey: (this.mode & 2) === 2 && KeyboardUtils.platform !== "Mac",
          metaKey: (this.mode & 2) === 2 && KeyboardUtils.platform === "Mac",
          shiftKey: (this.mode & 3) === 3
        });
      };
    }
    this.mode = mode;
  },
  createMarkerFor: function(link) {
    var marker = document.createElement("div"), rect;
    marker.className = "vimB vimI vimLH";
    marker.clickableItem = link[0];
    marker.rect = rect = link[1];
    marker.style.left = rect[0] + "px";
    marker.style.top = rect[1] + "px";
    return marker;
  },
  ensureRightBottom: function() {
    var ww, wh, _ref = this.hintMarkers, _i = _ref.length, el, temp, pos, str;
    if (_i <= 0) {
      return;
    }
    ww = window.innerWidth, wh = window.innerHeight - 13;
    str = wh + "px";
    while (0 <= --_i) {
      el = _ref[_i];
      pos = el.innerText.length;
      pos = ww - (pos <= 3 ? pos * 10 + 4 : 40);
      if (el.rect[0] > pos) {
        el.style.left = pos + "px";
      }
      if (el.rect[1] > wh) {
        el.style.top = str;
      }
    }
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
      if ((s = element.useMap) && (arr = element.getClientRects()).length > 0) {
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
      if (s == null || !(s === "" || parseInt(s) >= 0)) {
        return; // work around
      }
      isClickable = true, _i = -1;
      break;
    }
    if (isClickable && (arr = DomUtils.getVisibleClientRect(element))) {
      this.push([element, arr, _i !== -1]); // {element, rect, notSecond}
    }
  },
  getVisibleClickableElements: function() {
    var output = [], visibleElements = [], visibleElement, rects, rects2, _len, _i;
    output.forEach.call(document.documentElement.getElementsByTagName("*") //
      , this.GetVisibleClickable.bind(visibleElements));
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
    } else if ((_i = event.keyCode) === KeyCodes.esc) {
      if (KeyboardUtils.isPlain(event)) {
        this.deactivateMode();
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
      this.setOpenLinkMode((this.mode >= 128) ? (this.mode ^ 64) : ((this.mode | 2) ^ 64));
    } else if (!(linksMatched = this.markerMatcher.matchHintsByKey(this.hintMarkers, event, this.keyStatus))){
      if (linksMatched === false) {
        this.reinit();
      }
    } else if (linksMatched.length === 0) {
      this.deactivateMode();
    } else if (linksMatched.length === 1) {
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
    var clickEl = matchedLink.clickableItem, temp, rect;
    this.delayMode = true;
    if (DomUtils.isSelectable(clickEl)) {
      DomUtils.simulateSelect(clickEl);
      this.deactivateMode();
    } else {
      if (clickEl.nodeName.toLowerCase() === "input" && clickEl.type !== "button"
          && clickEl.type !== "submit" && clickEl.type !== "image") {
        clickEl.focus();
      }
      if (clickEl.classList.contains("vimOIUrl")) {
        var parEl = clickEl;
        do {
          parEl = parEl.parentElement;
        } while (parEl && !parEl.classList.contains("vimOItem"));
        if (parEl) {
          rect = Vomnibar.vomnibarUI.computeHint(parEl);
        }
      }
      if (!rect) {
        temp = [];
        this.GetVisibleClickable.call(temp, clickEl);
        if (temp.length === 1) {
          rect = temp[0][1];
        } else {
          rect = matchedLink.rect;
          var dx = window.scrollX - this.initScrollX, dy = window.scrollY - this.initScrollY;
          rect[0] -= dx, rect[2] -= dx, rect[1] -= dy, rect[3] -= dy;
        }
        temp = null;
      }
      DomUtils.flashVRect(rect);
      this.linkActivator(clickEl);
      if ((this.mode & 64) === 64) {
        this.reinit();
      } else {
        this.deactivateMode();
      }
    }
  },
  reinit: function() {
    var mode = this.mode, linkActivator = this.linkActivator;
    this.deactivateMode(function() {
      this.linkActivator = linkActivator;
      this.activateModeWithQueue(mode);
    });
  },
  deactivate2: function(callback) {
    if (this.markerMatcher.deactivate) {
      this.markerMatcher.deactivate();
    }
    this.linkActivator = null;
    this.hintMarkers = [];
    if (this.hintMarkerContainingDiv) {
      DomUtils.removeNode(this.hintMarkerContainingDiv);
      this.hintMarkerContainingDiv = null;
    }
    this.keyStatus.tab = false;
    handlerStack.remove(this.handlerId);
    this.handlerId = 0;
    HUD.hide();
    this.mode = 0;
    this.isActive = false;
    this.delayMode = false;
    if (callback) {
      callback.call(this);
    }
  },
  deactivateMode: function(callback) {
    var delay = this.keyStatus.delay;
    if (delay) {
      setTimeout(this.deactivate2.bind(this, callback), delay);
    } else {
      this.deactivate2(callback);
    }
  },
  destroy: function() {
    if (this.isActive) {
      this.keyStatus.delay = 0;
      this.deactivateMode();
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
    linkHintCharacters = settings.values.linkHintCharacters || "";
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
    } else {
      if (keyStatus.tab) {
        this.hintKeystrokeQueue = [];
        keyStatus.tab = false;
      }
      if (key === KeyCodes.backspace || key === KeyCodes.deleteKey || key === KeyCodes.f1) {
        if (!this.hintKeystrokeQueue.pop()) {
          return [];
        }
      } else if (keyChar = KeyboardUtils.getKeyChar(event).toLowerCase()) {
        this.hintKeystrokeQueue.push(keyChar);
      } else {
        return null;
      }
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
    return (this.numberToHintString(linkHintNumber + 1, settings.values.linkHintNumbers || "")).toUpperCase();
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
    if (key === KeyCodes.tab) {
      if (this.hintKeystrokeQueue.length === 0) {
        return false;
      }
      keyStatus.tab = !keyStatus.tab;
    } else if (key === KeyCodes.enter) {
      keyStatus.tab = false;
      for (var marker, _i = 0, _len = hintMarkers.length; _i < _len; _i++) {
        marker = hintMarkers[_i];
        if (marker.style.display !== "none") {
          keyStatus.delay = 0;
          return [marker];
        }
      }
      return null;
    } else {
      if (keyStatus.tab) {
        this.hintKeystrokeQueue = [];
        keyStatus.tab = false;
      }
      if (key === KeyCodes.backspace || key === KeyCodes.deleteKey || key === KeyCodes.f1) {
        if (!this.hintKeystrokeQueue.pop() && !this.linkTextKeystrokeQueue.pop()) {
          return [];
        }
      } else if (keyChar = KeyboardUtils.getKeyChar(event).toLowerCase()) {
        if ((settings.values.linkHintNumbers || "").indexOf(keyChar) >= 0) {
          this.hintKeystrokeQueue.push(keyChar);
        } else {
          this.hintKeystrokeQueue = [];
          this.linkTextKeystrokeQueue.push(keyChar);
          userIsTypingLinkText = true;
        }
      } else {
        return null;
      }
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