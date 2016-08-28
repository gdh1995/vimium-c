"use strict";
/* eslint no-native-reassign: "off" */
var VSettings, VHUD, VPort, VEventMode;
(function() {
  var Commands, ELs, HUD, KeydownEvents, checkValidKey, currentSeconds //
    , esc, FrameMask, InsertMode, Pagination //
    , isEnabledForUrl, isInjected, mainPort, onKeyup2 //
    , parsePassKeys, passKeys, requestHandlers, keyMap, settings //
    ;

  isInjected = window.VimiumInjector ? true : null;

  isEnabledForUrl = false;

  KeydownEvents = currentSeconds = onKeyup2 = passKeys = null;

  VPort = mainPort = {
    port: null,
    _callbacks: Object.create(null),
    _id: 1,
    sendMessage: function(request, callback) {
      var id = ++this._id;
      this.port.postMessage({_msgId: id, request: request});
      this._callbacks[id] = callback;
    },
    safePost: function(request, ifReconnect) {
      try {
        if (!this.port) {
          this.connect(0);
          ifReconnect && ifReconnect();
        }
        this.port.postMessage(request);
      } catch (e) { // this extension is reloaded or disabled
        settings.destroy();
        return true;
      }
    },
    Listener: function(response) {
      var id, handler, arr;
      if (id = response._msgId) {
        arr = mainPort._callbacks;
        handler = arr[id];
        delete arr[id];
        handler(response.response, id);
      } else {
        requestHandlers[response.name](response);
      }
    },
    ClearPort: function() {
      mainPort.port = null;
    },
    connect: function(isFirst) {
      var port;
      port = this.port = chrome.runtime.connect(isInjected && VimiumInjector.id, {
         name: "vimium++." + ((window.top === window) * 4 + document.hasFocus() * 2 + isFirst),
      });
      port.onDisconnect.addListener(this.ClearPort);
      port.onMessage.addListener(this.Listener);
    }
  };
  mainPort.connect(1);

  VSettings = settings = {
    cache: null,
    destroy: null,
    timer: 0,
    onDestroy: null
  };

  ELs = { //
    onKeydown: function(event) {
      if (!isEnabledForUrl || event.isTrusted === false) { return; }
      if (VScroller.keyIsDown) {
        if (event.repeat) {
          VScroller.keyIsDown = VScroller.Core.maxInterval;
          VUtils.Prevent(event);
          return;
        }
        VScroller.keyIsDown = 0;
      }
      var keyChar, key = event.keyCode, action = 0;
      if (action = VHandler.bubbleEvent(event)) {
        if (action < 0) { return; }
        if (action === 2) { event.preventDefault(); }
        event.stopImmediatePropagation();
        KeydownEvents[key] = 1;
        return;
      }
      if (InsertMode.isActive()) {
        if (InsertMode.global ? key === InsertMode.global.code
              && VKeyboard.getKeyStat(event) === InsertMode.global.stat
            : key === VKeyCodes.esc ? VKeyboard.isPlain(event)
            : key === 219 ? VKeyboard.getKeyStat(event) === 2
            : false
        ) {
          InsertMode.exit(event);
          action = 2;
        }
        else if (InsertMode.global) {}
        else if (key >= VKeyCodes.f1 && key <= VKeyCodes.f12) {
          action = checkValidKey(event, VKeyboard.getKeyName(event));
        }
      }
      else if (key >= 32) {
        if (keyChar = VKeyboard.getKeyChar(event)) {
          action = checkValidKey(event, keyChar);
          if (action === 0 && InsertMode.suppressType && keyChar.length === 1) {
            action = 2;
          }
        }
      }
      else if (key !== VKeyCodes.esc || !VKeyboard.isPlain(event)) {}
      else if (currentSeconds) {
        mainPort.port.postMessage({ handler: "esc" });
        esc();
        action = 2;
      } else if (VDom.UI.removeSelection(window)) {
        action = 2;
      } else if (event.repeat) {
        document.activeElement.blur();
      }
      if (action === 0) { return; }
      if (action === 2) {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      KeydownEvents[key] = 1;
    },
    onKeyup: function(event) {
      if (!isEnabledForUrl || event.isTrusted === false) { return; }
      VScroller.keyIsDown = 0;
      if (InsertMode.suppressType && window.getSelection().type !== InsertMode.suppressType) {
        VEventMode.exitSuppress();
      }
      if (KeydownEvents[event.keyCode]) {
        KeydownEvents[event.keyCode] = 0;
        event.preventDefault();
      } else {
        onKeyup2 && onKeyup2(event);
        return;
      }
      event.stopImmediatePropagation();
    },
    onFocus: function(event) {
      if (event.isTrusted === false) { return; }
      var target = event.target;
      if (target === window) { ELs.OnWndFocus(); }
      else if (!isEnabledForUrl) {}
      else if (VDom.getEditableType(target)) { InsertMode.focus(event); }
      else if (!target.shadowRoot) {}
      else if (target !== VDom.UI.box) {
        target = target.shadowRoot;
        target.addEventListener("focus", ELs.onFocus, true);
        target.addEventListener("blur", ELs.onShadowBlur, true);
      } else {
        InsertMode.lock = null;
        event.stopImmediatePropagation();
      }
    },
    onBlur: function(event) {
      if (event.isTrusted === false) { return; }
      var target = event.target;
      if (target === window) {
        VScroller.keyIsDown = 0;
        ELs.OnWndBlur && ELs.OnWndBlur();
        KeydownEvents = new Uint8Array(256);
        esc();
      } else if (!isEnabledForUrl) {}
      else if (InsertMode.lock === target) { InsertMode.lock = null; }
      else if (!target.shadowRoot) {}
      else if (target === VDom.UI.box) {
        InsertMode.lock = null;
      } else {
        target = target.shadowRoot;
        // NOTE: if destroyed, this page must have lost its focus before, so
        // a blur event must have been bubbled from shadowRoot to a real lock.
        // Then, we don't need to worry about ELs or InsertMode being null.
        target.removeEventListener("focus", ELs.onFocus, true);
        target.vimiumBlurred = true;
      }
    },
    onActivate: function(event) {
      VScroller.current = event.path[0];
    },
    OnWndFocus: function() {},
    OnWndBlur: null,
    onShadowBlur: function(event) {
      if (event.isTrusted === false) { return; }
      if (this.vimiumBlurred) {
        this.vimiumBlurred = false;
        this.removeEventListener("blur", ELs.onShadowBlur, true);
      }
      ELs.onBlur(event);
    },
    hook: function(f, c) {
      f("keydown", this.onKeydown, true);
      f("keyup", this.onKeyup, true);
      c || f("focus", this.onFocus, true);
      f("blur", this.onBlur, true);
      f.call(document, "DOMActivate", ELs.onActivate, true);
    }
  };
  ELs.hook(addEventListener);

  esc = function() { currentSeconds = null; };

  parsePassKeys = function(newPassKeys) {
    var pass = Object.create(null), arr = newPassKeys.split(' ')
      , i = 0, len = arr.length;
    do {
      pass[arr[i]] = true;
    } while (len > ++i);
    return pass;
  };

  Commands = {
    Vomnibar: Vomnibar,
    VHints: VHints,
    VMarks: VMarks,

    toggleSwitchTemp: function(_0, options) {
      var key = options.key, values = settings.cache;
      if (typeof values[key] !== "boolean") {
        HUD.showForDuration("`" + key + "` is not a boolean switch", 2000);
      } else if (values[key] = typeof options.value === "boolean"
          ? options.value : !values[key]) {
        HUD.showForDuration("Now `" + key + "` is on.", 1000);
      } else {
        HUD.showForDuration("`" + key + "` has been turned off", 1000);
      }
    },
    toggleLinkHintCharacters: function(_0, options) {
      var values = settings.cache, val = options.value || "sadjklewcmpgh";
      if (values.linkHintCharacters === val) {
        val = values.linkHintCharacters = values.oldLinkHintCharacters;
        values.oldLinkHintCharacters = "";
      } else {
        values.oldLinkHintCharacters = values.linkHintCharacters;
        values.linkHintCharacters = val;
      }
      HUD.showForDuration('Now link hints use "' + val + '".', 1500);
    },
    scrollTo: function(count, options) {
      VMarks.setPreviousPosition();
      VScroller.scrollTo(options.axis === "x" ? 0 : 1, count - 1, options.dest === "max");
    },
    scrollBy: function(count, options) {
      VScroller.scrollBy(options.axis === "x" ? 0 : 1, (options.dir || 1) * count, options.view);
    },

    enterVisualMode: function(_0, options) { VVisualMode.activate(options); },
    enterInsertMode: function(_0, options) {
      var code = options.code || VKeyCodes.esc, stat = options.stat, str;
      InsertMode.global = { code: code, stat: stat };
      if (options.hideHud) { return; }
      str = "Insert mode";
      if (code !== VKeyCodes.esc || stat > 0) {
        str += ": " + (VKeyboard.keyNames[code] || code) + "/" + stat;
      }
      HUD.show(str);
    },
    passNextKey: function(count) {
      var keys = Object.create(null), keyCount = 0;
      VHandler.push(function(event) {
        keyCount += !keys[event.keyCode];
        keys[event.keyCode] = 1;
        return -1;
      }, keys);
      onKeyup2 = function(event) {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event.keyCode] = 0;
          HUD.show("Pass next " + (count > 1 ? count + " keys." : "key."));
          return;
        }
        ELs.OnWndBlur();
      };
      ELs.OnWndBlur = function() {
        onKeyup2 = null;
        VHandler.remove(keys);
        ELs.OnWndBlur = null;
        HUD.hide();
      };
      onKeyup2({keyCode: 0});
    },
    goNext: function(_0, options) {
      Pagination.goBy(options.dir, options.patterns);
    },
    reload: function(url) {
      setTimeout(function() {
        url === 1 ? window.location.reload() : (window.location.href = url);
      }, 17);
    },
    switchFocus: function() {
      var newEl = InsertMode.lock;
      if (newEl) {
        InsertMode.last = newEl;
        InsertMode.mutable = false;
        newEl.blur();
        return;
      }
      newEl = InsertMode.last;
      if (!newEl) {
        HUD.showForDuration("Nothing was focused", 1200);
        return;
      }
      else if (!VDom.isVisibile(newEl)) {
        newEl.scrollIntoViewIfNeeded();
        if (!VDom.isVisibile(newEl)) {
          HUD.showForDuration("The last focused is hidden", 2000);
          return;
        }
      }
      InsertMode.last = null;
      InsertMode.mutable = true;
      VDom.UI.simulateSelect(newEl, false, true);
    },
    simBackspace: function() {
      var el = InsertMode.lock;
      if (!el) { Commands.switchFocus(); }
      else if (VDom.isVisibile(el)) { document.execCommand("delete"); }
      else { el.scrollIntoViewIfNeeded(); }
    },
    goBack: function(count, options) {
      var step = Math.min(count, history.length - 1);
      step > 0 && history.go(step * (options.dir || -1));
    },
    goUp: function(count) {
      mainPort.sendMessage({
        handler: "parseUpperUrl",
        url: window.location.href,
        upper: -count
      }, function(result) {
        if (result.path != null) {
          return Commands.reload(result.url);
        }
        HUD.showForDuration(result.url, 1500);
      });
    },
    showHelp: function(_0, _1, forceCurrent) {
      forceCurrent |= 0;
      if (forceCurrent < 2 &&
          VHints.tryNestedFrame("showHelp", [1, _1, 2])) {
        return;
      }
      if (!document.body) { return false; }
      mainPort.port.postMessage({handler: "initHelp"});
    },
    autoCopy: function(_0, options) {
      var str = VDom.getSelectionText() ||
        (options.url ? window.location.href : document.title.trim());
      str && mainPort.port.postMessage({
        handler: "copyToClipboard",
        data: str
      });
      HUD.showCopied(str);
    },
    autoOpen: function(_0, options) {
      var str;
      if (str = VDom.getSelectionText()) {
        VUtils.evalIfOK(str) || mainPort.port.postMessage({
          handler: "openUrl",
          keyword: options.keyword,
          url: str
        });
        return;
      }
      mainPort.sendMessage({
        handler: "getCopiedUrl_f",
        keyword: options.keyword
      }, function(str) {
        if (str) {
          VUtils.evalIfOK(str);
        } else if (str === "") {
          HUD.showCopied("");
        }
      });
    },
    searchAs: function() {
      mainPort.sendMessage({
        handler: "searchAs",
        url: window.location.href,
        search: VDom.getSelectionText()
      }, function(str) {
        str && HUD.showForDuration(str, 1000);
      });
    },
    focusInput: function(count) {
      var box, hints, selectedInputIndex, visibleInputs;
      visibleInputs = VHints.traverse({"*": VHints.GetEditable});
      selectedInputIndex = visibleInputs.length;
      if (selectedInputIndex === 0) {
        return;
      } else if (selectedInputIndex === 1) {
        VDom.UI.simulateSelect(visibleInputs[0][0], true, true);
        return;
      }
      hints = visibleInputs.map(function(link) {
        var hint = VDom.createElement("div"), rect = link[1];
        rect[0]--, rect[1]--, rect[2]--, rect[3]--;
        hint.className = "IH";
        hint.clickableItem = link[0];
        VRect.setBoundary(hint.style, rect, true);
        return hint;
      });
      if (count === 1 && InsertMode.last) {
        selectedInputIndex = Math.max(0, visibleInputs
          .map(function(link) { return link[0]; }).indexOf(InsertMode.last));
      } else {
        selectedInputIndex = Math.min(count, selectedInputIndex) - 1;
      }
      VDom.UI.simulateSelect(visibleInputs[selectedInputIndex][0]);
      hints[selectedInputIndex].classList.add("S");
      box = VDom.UI.addElementList(hints, {
        id: "IMC",
        className: "R LS"
      });
      VHandler.push(function(event) {
        if (event.keyCode === VKeyCodes.tab) {
          hints[selectedInputIndex].classList.remove("S");
          if (event.shiftKey) {
            if (--selectedInputIndex === -1) {
              selectedInputIndex = hints.length - 1;
            }
          } else if (++selectedInputIndex === hints.length) {
            selectedInputIndex = 0;
          }
          hints[selectedInputIndex].classList.add("S");
          VDom.UI.simulateSelect(hints[selectedInputIndex].clickableItem);
        } else if (event.keyCode === VKeyCodes.f12) {
          return VKeyboard.isPlain(event) ? 0 : 2;
        } else if (!event.repeat && event.keyCode !== VKeyCodes.shiftKey
            && event.keyCode !== VKeyCodes.altKey) {
          this.remove();
          VHandler.remove(this);
          return 0;
        }
        return 2;
      }, box);
    }
  };

  checkValidKey = function(event, key) {
    key = VKeyboard.getKey(event, key);
    if (currentSeconds) {
      if (!((key in keyMap) || (key in currentSeconds))) {
        mainPort.port.postMessage({ handler: "esc" });
        esc();
        return 0;
      }
    } else if (passKeys && (key in passKeys) || !(key in keyMap)) {
      return 0;
    }
    mainPort.port.postMessage({ handlerKey: key });
    return 2;
  };

  InsertMode = {
    focus: null,
    global: null,
    suppressType: null,
    last: null,
    loading: (document.readyState !== "complete"),
    lock: null,
    mutable: true,
    init: function() {
      var activeEl = document.activeElement, notBody = activeEl !== document.body;
      this.focus = this.lockFocus;
      this.init = null;
      KeydownEvents = new Uint8Array(256);
      if (settings.cache.grabBackFocus && this.loading) {
        if (notBody) {
          activeEl.blur();
          notBody = (activeEl = document.activeElement) !== document.body;
        }
        if (!notBody) {
          this.setupGrab();
          return;
        }
      }
      if (notBody && VDom.getEditableType(activeEl)) {
        this.lock = activeEl;
      }
    },
    setupGrab: function() {
      this.focus = this.grabBackFocus;
      VHandler.push(this.ExitGrab, this);
      addEventListener("mousedown", this.ExitGrab, true);
    },
    ExitGrab: function() {
      var _this = InsertMode;
      _this.focus = _this.lockFocus;
      removeEventListener("mousedown", _this.ExitGrab, true);
      VHandler.remove(_this);
      return 0;
    },
    grabBackFocus: function(event) {
      event.stopImmediatePropagation();
      event.target.blur();
    },
    lockFocus: function(event) {
      var target = event.target;
      // NOTE: should not filter out `<select>` for windows
      this.lock = target;
      if (this.mutable) {
        this.last = target;
      }
    },
    isActive: function() {
      if (this.suppressType) { return false; }
      if (this.lock !== null || this.global) {
        return true;
      }
      var el;
      if ((el = document.activeElement) && el.isContentEditable) {
        this.lock = el;
        return true;
      } else {
        return false;
      }
    },
    exit: function(event) {
      var target = event.target;
      if (target.shadowRoot) {
        if (target = this.lock) {
          this.lock = null;
          target.blur();
        }
      } else {
        if (target === this.lock) { this.lock = null; }
        VDom.getEditableType(target) && target.blur();
      }
      if (this.global) {
        this.lock = null; this.global = null;
        HUD.hide(true);
      }
    },
    onExitSuppress: null,
  };

  VEventMode = {
    lock: function() { return InsertMode.lock; },
    onWndFocus: isInjected && function(f) { ELs.OnWndFocus = f; },
    onWndBlur: function(f) { ELs.OnWndBlur = f; },
    on: function(name) { return ELs["On" + name]; },
    scroll: function(event) {
      var keyCode, ctrl;
      if (!event || event.shiftKey || event.altKey) { return; }
      keyCode = event.keyCode;
      if (!(keyCode >= VKeyCodes.pageup && keyCode <= VKeyCodes.down)) { return; }
      ctrl = event.ctrlKey || event.metaKey;
      if (keyCode >= VKeyCodes.left) {
        VScroller.scrollBy(1 - (keyCode & 1), keyCode < VKeyCodes.left + 2 ? -1 : 1, +ctrl);
      } else if (ctrl) { return; }
      else if (keyCode > VKeyCodes.pageup + 1) {
        Commands.scrollTo(1, { dest: (keyCode & 1) && "max" });
      } else {
        VScroller.scrollBy(1, keyCode === VKeyCodes.pageup ? -0.5 : 0.5, "viewSize");
      }
    },
    setupSuppress: function(onExit) {
      InsertMode.suppressType = window.getSelection().type;
      InsertMode.onExitSuppress = onExit;
    },
    exitSuppress: function() {
      var f = InsertMode.onExitSuppress;
      InsertMode.onExitSuppress = InsertMode.suppressType = null;
      f && f();
    },
    keydownEvents: function(arr) {
      if (!isEnabledForUrl) { throw Error("vimium-disabled"); }
      if (!arr) { return KeydownEvents; }
      KeydownEvents = arr;
    }
  };

  Pagination = {
  followLink: function(linkElement) {
    if (linkElement instanceof HTMLLinkElement) {
      return Commands.reload(linkElement.href);
    }
    linkElement.scrollIntoViewIfNeeded();
    VDom.UI.flashVRect(VDom.UI.getVRect(linkElement));
    setTimeout(function() { VDom.simulateClick(linkElement); }, 0);
  },
  goBy: function(relName, pattern) {
    if (relName && typeof relName === "string" && this.findAndFollowRel(relName)) {
      return true;
    }
    var arr = typeof pattern === "string" && (pattern = pattern.trim())
      ? pattern.toLowerCase().split(/\s*,\s*/).filter(function(s) { return s.length; })
      : (pattern instanceof Array) ? pattern : [],
    isNext = relName === "next";
    if (arr.length > 0 && this.findAndFollowLink(arr, isNext ? "<" : ">")) {
      return true;
    }
    VHUD.showForDuration('No links to go ' + (isNext ? "next" : "previous"), 1500);
    return false;
  },
  GetLinks: function(element) {
    var isClickable, s, rect;
    isClickable = element instanceof HTMLAnchorElement
      || element.vimiumHasOnclick || element.getAttribute("onclick")
      || (s = element.getAttribute("role")) && s.toLowerCase() === "link"
      || VHints.ngEnabled && element.getAttribute("ng-click");
    if (!isClickable) { return; }
    if ((s = element.getAttribute("aria-disabled")) != null && (!s || s.toLowerCase() === "true")) { return; }
    rect = element.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2 && VDom.isStyleVisible(window.getComputedStyle(element))) {
      this.push(element);
    }
  },
  findAndFollowLink: function(linkStrings, refusedStr) {
    var candidateLinks, exactWordRe, link, linkString, links, _i, _j, _len, _len1, re1, re2;
    links = VHints.traverse({"*": this.GetLinks});
    candidateLinks = [];
    links.push(null);
    for (_len = links.length - 1; 0 <= --_len; ) {
      link = links[_len];
      if (link.contains(links[_len + 1])) { continue; }
      linkString = link.innerText;
      if (linkString.length > 127) { continue; }
      if (!linkString && !(linkString = link.title)) { continue; }
      if (linkString.indexOf(refusedStr) !== -1) { continue; }
      linkString = linkString.toLowerCase();
      for (_j = 0, _len1 = linkStrings.length; _j < _len1; _j++) {
        if (linkString.indexOf(linkStrings[_j]) !== -1) {
          candidateLinks.push(link);
          break;
        }
      }
    }
    _len = candidateLinks.length;
    if (_len === 0) {
      return;
    }
    re1 = /\s+/, re2 = /\b/;
    links = null;
    while (0 <= --_len) {
      link = candidateLinks[_len];
      link.wordCount = (link.innerText || link.title).trim().split(re1).length;
      link.originalIndex = _len;
    }
    candidateLinks = candidateLinks.sort(function(a, b) {
      return (a.wordCount - b.wordCount) || (a.originalIndex - b.originalIndex);
    });
    _len = candidateLinks[0].wordCount + 1;
    candidateLinks = candidateLinks.filter(function(a) {
      return a.wordCount <= _len;
    });
    for (_i = 0, _len = linkStrings.length; _i < _len; _i++) {
      linkString = linkStrings[_i];
      exactWordRe = re2.test(linkString[0]) || re2.test(linkString.slice(-1))
        ? new RegExp("\\b" + linkString + "\\b", "i") : new RegExp(linkString, "i");
      for (_j = 0, _len1 = candidateLinks.length; _j < _len1; _j++) {
        link = candidateLinks[_j];
        if (exactWordRe.test(link.innerText || link.title)) {
          this.followLink(link);
          return true;
        }
      }
    }
    return false;
  },
  findAndFollowRel: function(relName) {
    var element, elements, relTags, _i, _len, s;
    elements = document.querySelectorAll("[rel]");
    relTags = Object.setPrototypeOf({a: 1, area: 1, link: 1}, null);
    for (_i = 0, _len = elements.length; _i < _len; _i++) {
      element = elements[_i];
      if ((element.tagName.toLowerCase() in relTags)
          && (s = element.rel) && s.toLowerCase() === relName) {
        this.followLink(element);
        return true;
      }
    }
    return false;
  }
  };

  FrameMask = {
    more: false,
    node: null,
    timer: 0,
    Focus: function(request) {
      if (request.frameId < 0) {}
      else if (window.innerWidth < 3 || window.innerHeight < 3
        || window.top !== window && document.readyState !== "complete"
        || document.body instanceof HTMLFrameSetElement) {
        mainPort.port.postMessage({
          handler: "nextFrame"
        });
        return;
      }
      window.focus();
      esc();
      document.documentElement.scrollIntoViewIfNeeded();
      if (!document.body || document.readyState !== "complete" || request.highlight === false) { return; }
      var _this = FrameMask, dom1;
      if (dom1 = _this.node) {
        _this.more = true;
      } else {
        dom1 = VDom.createElement("div");
        dom1.setAttribute("style", "background:none;border:5px solid yellow;box-shadow:none;\
box-sizing:border-box;display:block;float:none;height:100%;left:0;margin:0;\
opacity:1;pointer-events:none;position:fixed;top:0;width:100%;z-index:2147483647;");
        _this.node = dom1;
        _this.timer = setInterval(_this.Remove, 200);
      }
      VDom.UI.root && isEnabledForUrl ? VDom.UI.addElement(dom1) :
      (document.webkitFullscreenElement || document.documentElement).appendChild(dom1);
      if (request.box) {
        dom1.style.maxWidth = request.box[0] + "px";
        dom1.style.maxHeight = request.box[1] + "px";
      }
      dom1.style.borderColor = request.frameId === -1 ? "lightsalmon" : "yellow";
    },
    Remove: function() {
      var _this = FrameMask;
      if (_this.more) {
        _this.more = false;
        return;
      }
      _this.node.remove();
      _this.node = null;
      clearInterval(_this.timer);
    }
  };

  VHUD = HUD = {
    tweenId: 0,
    box: null,
    opacity: 0,
    durationTimer: 0,
    showCopied: function(text, e, virtual) {
      if (!text) {
        if (virtual) { return text; }
        this.showForDuration("No " + (e || "text") + " found!", 1000);
        return;
      }
      if (text.startsWith("chrome-")) {
        text = text.substring(text.indexOf('/', text.indexOf('/') + 2));
      }
      if (text.length > 43) {
        text = text.substring(0, 40) + "...";
      }
      text = "copy: " + text;
      if (virtual) { return text; }
      this.showForDuration(text, 2000);
    },
    showForDuration: function(text, duration) {
      this.show(text);
      this.durationTimer = this.enabled && setTimeout(this.hide, duration);
    },
    show: function(text) {
      if (!this.enabled) { return; }
      var el = this.box;
      if (!el) {
        el = VDom.createElement("div");
        el.className = "R HUD";
        el.style.opacity = 0;
        el.style.visibility = "hidden";
        VDom.UI.addElement(this.box = el);
      } else if (this.durationTimer) {
        clearTimeout(this.durationTimer);
        this.durationTimer = 0;
      }
      el.textContent = text;
      if (!this.tweenId) {
        this.tweenId = setInterval(this.tween, 40);
      }
      this.opacity = 1;
    },
    tween: function() {
      var hud = HUD, el = hud.box, opacity = +el.style.opacity;
      if (opacity !== hud.opacity) {
        if (opacity === 0) {
          el.style.visibility = "";
          VDom.UI.adjust();
        }
        opacity += opacity < hud.opacity ? 0.25 : -0.25;
        el.style.opacity = opacity;
        if (opacity !== hud.opacity) {
          return;
        }
      }
      if (opacity === 0) {
        el.style.visibility = "hidden";
        el.textContent = "";
      }
      clearInterval(hud.tweenId);
      hud.tweenId = 0;
    },
    hide: function(immediate) {
      var hud = HUD, el;
      if (hud.durationTimer) {
        clearTimeout(hud.durationTimer);
        hud.durationTimer = 0;
      }
      hud.opacity = 0;
      if (!hud.box) {}
      else if (immediate === true) {
        clearInterval(hud.tweenId);
        hud.tweenId = 0;
        el = hud.box;
        el.style.visibility = "hidden";
        el.textContent = "";
        el.style.opacity = 0;
      } else if (!hud.tweenId) {
        hud.tweenId = setInterval(hud.tween, 40);
      }
    },
    enabled: false
  };

  requestHandlers = {
    init: function(request) {
      var r = requestHandlers;
      settings.cache = request.load;
      clearInterval(settings.timer);
      VKeyboard.onMac = request.onMac;
      r.keyMap(request);
      r.reset(request);
      InsertMode.loading = false;
      r.init = null;
    },
    reset: function(request) {
      var newPassKeys = request.passKeys, enabled;
      enabled = isEnabledForUrl = (newPassKeys !== "");
      enabled && InsertMode.init && InsertMode.init();
      enabled === !requestHandlers.init && ELs.hook(enabled ? addEventListener : removeEventListener, 1);
      if (!enabled) {
        VScroller.current = VDom.lastHovered = InsertMode.last = InsertMode.lock = null;
        VHints.deactivate(); Vomnibar.hide();
      }
      passKeys = newPassKeys && parsePassKeys(newPassKeys);
      VDom.UI.box && VDom.UI.toggle(enabled);
    },
    checkIfEnabled: function() {
      mainPort.port.postMessage({
        handler: "checkIfEnabled",
        url: window.location.href
      });
    },
    settingsUpdate: function(request) {
      var ref = settings.cache, i;
      Object.setPrototypeOf(request, null);
      delete request.name;
      for (i in request) {
        ref[i] = request[i];
      }
    },
    insertCSS: function(request) {
      VDom.UI.insertCSS(request.css, isEnabledForUrl);
    },
    insertInnerCss: VDom.UI.insertInnerCSS,
    focusFrame: FrameMask.Focus,
    keyMap: function(request) {
      var map = keyMap = request.keyMap, key, sec, func = Object.setPrototypeOf;
      func(map, null);
      for (key in map) {
        sec = map[key];
        sec && func(sec, null);
      }
    },
    key: function(request) {
      currentSeconds = request.key !== null ? keyMap[request.key] : null;
    },
    execute: function(request) {
      esc();
      VUtils.execCommand(Commands, request.command, [request.count, request.options, 0]);
    },
    performFind: function(request) { VFindMode.activate(request); },
    createMark: VMarks.CreateGlobalMark,
    scroll: VMarks.Goto,
    showHUD: function(request) {
      HUD.showForDuration(request.text, 1500);
    },
    showCopied: function(request) {
      HUD.showCopied(request.text);
    },
  showHelpDialog: function(request) {
    var box, oldShowHelp, hide, node1, //
    toggleAdvanced, shouldShowAdvanced = request.advanced === true;
    box = VDom.createElement("div");
    box.innerHTML = request.html;
    box = box.firstElementChild;
    hide = function(event) { event.stopImmediatePropagation(); };
    box.onclick = hide;
    box.addEventListener("mousewheel", hide, {passive: true});

    hide = function(event) {
      event && event.preventDefault && event.preventDefault();
      box.contains(VDom.lastHovered) && (VDom.lastHovered = null);
      box.contains(VScroller.current) && (VScroller.current = null);
      VHandler.remove(box);
      box.remove();
      Commands.showHelp = oldShowHelp;
    };
    toggleAdvanced = function() {
      box.querySelector("#AdvancedCommands").textContent =
        (shouldShowAdvanced ? "Hide" : "Show") + " advanced commands";
      box.classList.toggle("HelpAdvanced");
    };

    oldShowHelp = Commands.showHelp;
    box.querySelector("#AdvancedCommands").onclick = function(event) {
      event.preventDefault();
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      mainPort.port.postMessage({
        handler: "setSetting",
        key: "showAdvancedCommands",
        value: shouldShowAdvanced
      });
    };
    box.querySelector("#HClose").onclick = Commands.showHelp = hide;
    node1 = box.querySelector("#OptionsPage");
    if (! window.location.href.startsWith(request.optionUrl)) {
      node1.href = request.optionUrl;
      node1.onclick = function(event) {
        event.preventDefault();
        mainPort.port.postMessage({ handler: "focusOrLaunch", url: this.href });
        hide();
      };
    } else {
      node1.remove();
    }
    shouldShowAdvanced && toggleAdvanced();
    VDom.UI.addElement(box);
    window.focus();
    VScroller.current = box;
    VHandler.push(function(event) {
      if (event.keyCode === VKeyCodes.esc && !InsertMode.lock
          && VKeyboard.isPlain(event)) {
        VDom.UI.removeSelection() || hide();
        return 2;
      }
      return 0;
    }, box);
  }
  };

  settings.timer = setInterval(function() {
    mainPort.connect(1);
  }, 2000);

  VDom.documentReady(function() {
    HUD.enabled = !!document.body;
    if (isInjected || mainPort.safePost({ handler: "reg",
      visible: window.innerHeight > 9 && window.innerWidth > 9
    })) {
      return;
    }
    // NOTE: here, we should always postMessage, since
    //     NO other message will be sent if not isEnabledForUrl,
    // which would make the logic of auto-destroying not work.
    ELs.OnWndFocus = mainPort.safePost.bind(mainPort, { handler: "frameFocused" });
  });

  settings.destroy = function() {
    var f = removeEventListener, el;
    isEnabledForUrl = false;
    clearInterval(settings.timer);

    ELs.hook(f);
    f("mousedown", InsertMode.ExitGrab, true);
    VEventMode.exitSuppress();
    VFindMode.toggleStyle("remove");
    (el = VDom.UI.box) && el.remove();
    (f = settings.onDestroy) && f();

    VUtils = VKeyCodes = VKeyboard = VDom = VRect = VHandler = //
    VHints = Vomnibar = VScroller = VMarks = VFindMode = //
    VSettings = VHUD = VPort = VEventMode = VVisualMode = null;

    console.log("%cVimium++%c in %c%s%c has destroyed at %o."
      , "color:red", "color:auto", "color:darkred"
      , window.location.pathname.replace(/^.*\/([^\/]+)\/?$/, "$1")
      , "color:auto", Date.now());

    if (!isInjected && !location.protocol.startsWith("chrome")) {
      chrome = null;
    }
  };
})();
