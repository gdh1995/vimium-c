"use strict";
var Settings, VHUD, MainPort, VInsertMode;
(function() {
  var Commands, ELs, HUD, KeydownEvents, checkValidKey, currentSeconds //
    , firstKeys //
    , followLink, FrameMask //
    , getVisibleInputs, goBy //
    , initIfEnabled, InsertMode //
    , isEnabledForUrl, isInjected, keyQueue, mainPort //
    , passKeys, requestHandlers //
    , secondKeys, settings //
    ;

  isInjected = window.VimiumInjector ? true : false;

  isEnabledForUrl = false;

  KeydownEvents = null;

  keyQueue = false;

  firstKeys = null;

  secondKeys = null;

  currentSeconds = null;

  passKeys = null;

  MainPort = mainPort = {
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
          this.connect();
          ifReconnect && ifReconnect();
        }
        this.port.postMessage(request);
      } catch (e) { // this extension is reloaded or disabled
        ELs.destroy();
        return true;
      }
    },
    sendCommand: function(target, command, args) {
      this.port.postMessage({
        handler: "dispatchCommand",
        frameId: target,
        command: command, args: args
      });
    },
    sendCommandToContainer: function(command, args) {
      if (window.top !== window && args[2] === 0) {
        args[2] = 1;
        if (this.sendCommandToTop(command, args)) { return true; }
      }
      args[2] = 2;
      return LinkHints.tryNestedFrame(command, args);
    },
    sendCommandToTop: function(command, args) {
      var top = window.top, topF, top2;
      try {
        topF = top.LinkHints.frameNested;
        if (!topF) { top.VInsertMode.keydownEvents(); }
      } catch (e) { if (e.message != "vimium-disabled") {
        this.sendCommand(0, command, args);
        return true;
      } else {
        top = null;
        for (top2 = window.parent; top2 !== top; top2 = top2.parent) {
          try { top2.VInsertMode.keydownEvents(); top = top2; } catch (e) {}
        }
        if (!top) { return false; }
      } }
      if (topF) {
        do { top = topF.contentWindow; } while (topF = top.LinkHints.frameNested);
        if (window === top) { return false; }
      }
      top.VInsertMode.keydownEvents(KeydownEvents);
      top.MainPort.Listener({
        name: "dispatchCommand", command: command, args: args
      });
      return true;
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
    connect: function() {
      var port;
      port = this.port = chrome.runtime.connect("hfjbmagddngcpeloejdejnfgbamkjaeg", {
         name: "vimium++." + ((window.top === window) * 4 + document.hasFocus() * 2 + !requestHandlers.init),
      });
      port.onDisconnect.addListener(this.ClearPort);
      port.onMessage.addListener(this.Listener);
    }
  };

  Settings = settings = {
    cache: null,
    isLoading: 0,
    onDestroy: null,
    set: function(key, value) {
      this.cache[key] = value;
      mainPort.port.postMessage({
        handler: "setSetting",
        key: key,
        value: value
      });
    }
  };

  ELs = { //
    onKeydown: function(event) {
      if (Scroller.keyIsDown) {
        if (event.repeat) {
          Scroller.keyIsDown = Scroller.Core.maxInterval;
          DomUtils.suppressEvent(event);
          return;
        }
        Scroller.keyIsDown = 0;
      }
      var keyChar, key = event.keyCode, action = 0;
      if (isEnabledForUrl) {
        if (action = handlerStack.bubbleEvent(event)) {
          if (action === 2) {
            event.preventDefault();
          } else if (action < 0) {
            return;
          }
          event.stopImmediatePropagation();
          KeydownEvents[key] = 1;
          return;
        }
      } else {
        return;
      }
      if (InsertMode.isActive()) {
        if (InsertMode.global ? key === InsertMode.global.code
              && KeyboardUtils.getKeyStat(event) === InsertMode.global.stat
            : key === KeyCodes.esc ? KeyboardUtils.isPlain(event)
            : key === 219 || key === 91 ? KeyboardUtils.getKeyStat(event) === 2
            : false
        ) {
          InsertMode.exit(event);
          action = 2;
        }
        else if (InsertMode.global) {}
        else if (key >= KeyCodes.f1 && key <= KeyCodes.f12) {
          action = checkValidKey(event, KeyboardUtils.keyName(key, event.shiftKey));
        }
      }
      else if (key >= 32) {
        if (keyChar = KeyboardUtils.getKeyChar(event, event.shiftKey)) {
          action = checkValidKey(event, keyChar);
          if (action === 0 && InsertMode.suppressType && keyChar.length === 1) {
            action = 2;
          }
        }
      }
      else if (key === KeyCodes.esc && KeyboardUtils.isPlain(event)) {
        if (keyQueue) {
          mainPort.port.postMessage({ handler: "esc" });
          keyQueue = false;
          currentSeconds = secondKeys[""];
          action = 2;
        } else if (DomUtils.UI.removeSelection(window)) {
          action = 2;
        } else if (event.repeat) {
          document.activeElement.blur();
        }
      }
      if (action === 0) { return; }
      if (action === 2) {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      KeydownEvents[key] = 1;
    },
    onKeypress: function(event) {
      if (isEnabledForUrl && InsertMode.lock === InsertMode.heldEl) {
        event.stopImmediatePropagation();
      }
    },
    onKeyup: function(event) {
      if (isEnabledForUrl) {
        Scroller.keyIsDown = 0;
        if (InsertMode.suppressType && window.getSelection().type !== InsertMode.suppressType) {
          InsertMode.exitSuppress();
        }
        if (KeydownEvents[event.keyCode]) {
          KeydownEvents[event.keyCode] = 0;
          event.preventDefault();
        } else if (InsertMode.lock !== InsertMode.heldEl) {
          return;
        }
        event.stopImmediatePropagation();
      }
    },
    onFocus: function(event) {
      var target = event.target;
      if (target === window) { ELs.onWndFocus(); }
      else if (!isEnabledForUrl) {}
      else if (DomUtils.getEditableType(target)) {
        InsertMode.focus(event);
      } else if (target.shadowRoot) {
        if (target !== DomUtils.UI.box) {
          target = target.shadowRoot;
          target.addEventListener("focus", ELs.onFocus, true);
          target.addEventListener("blur", InsertMode.OnShadowBlur, true);
          return;
        }
        event.stopImmediatePropagation();
        target = DomUtils.UI.root.activeElement;
        if (target === InsertMode.heldEl) {
          InsertMode.lock = target;
          target.focused = true;
        }
      }
    },
    onBlur: function(event) {
      var target = event.target;
      if (target === window) {
        Scroller.keyIsDown = 0;
        InsertMode.onWndBlur && InsertMode.onWndBlur(KeydownEvents);
        KeydownEvents = new Uint8Array(256);
      } else if (!isEnabledForUrl) {}
      else if (InsertMode.lock === target) {
        InsertMode.lock = null;
      } else if (target.shadowRoot) {
        if (target === DomUtils.UI.box) {
          event.stopImmediatePropagation();
          if (InsertMode.lock === InsertMode.heldEl) {
            InsertMode.lock.focused = false;
            InsertMode.lock = null;
          }
          return;
        }
        target = target.shadowRoot;
        // NOTE: if destroyed, this page must have lost its focus before, so
        // a blur event must have been bubbled from shadowRoot to a real lock.
        // Then, we don't need to worry about ELs or InsertMode being null.
        target.removeEventListener("focus", ELs.onFocus, true);
        target.vimiumBlurred = true;
      }
    },
    onActivate: function(event) {
      Scroller.current = event.path[0];
    },
    onWndFocus: function(){}, //
    destroy: null
  };

  initIfEnabled = function(newPassKeys) {
    initIfEnabled = function(newPassKeys) {
      if (newPassKeys) {
        var pass = Object.create(null), arr = newPassKeys.split(' ')
          , i = 0, len = arr.length;
        do {
          pass[arr[i]] = true;
        } while (len > ++i);
        passKeys = pass;
      } else {
        passKeys = null;
      }
    };
    initIfEnabled(newPassKeys);
    InsertMode.init();
    var f = addEventListener;
    f("keydown", ELs.onKeydown, true);
    f("keypress", ELs.onKeypress, true);
    f("keyup", ELs.onKeyup, true);
    f("focus", ELs.onFocus, true);
    f("blur", ELs.onBlur, true);
    document.addEventListener("DOMActivate", ELs.onActivate, true);
  };

  Commands = {
    Vomnibar: Vomnibar,
    LinkHints: LinkHints,
    Marks: Marks,

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
      Marks.setPreviousPosition();
      var axis = options.axis || "y", dest = options.dest ||
          (axis === "y" ? (count - 1) * settings.cache.scrollStepSize : 0);
      Scroller.scrollTo(axis, dest);
    },
    scrollBy: function(count, options) {
      var axis = options.axis || "y", dir = options.dir || 1,
        view = options.view;
      if (!view) {
        dir *= settings.cache.scrollStepSize;
      }
      Scroller.scrollBy(axis, dir * count, typeof view === "string" ? view : ""
        , axis !== "y" && !view);
    },

    enterInsertMode: function(_0, options) {
      var code = options.code || KeyCodes.esc, stat = options.stat || 0, str;
      InsertMode.global = { code: code, stat: stat };
      if (settings.cache.hideHud) { return; }
      str = "Insert mode";
      if (options.code || options.stat >= 0) {
        str += ": " + (KeyboardUtils.keyNames[code] || code) + "/" + stat;
      }
      HUD.show(str);
    },
    passNextKey: function(count) {
      var keys = Object.create(null), keyCount = 0;
      handlerStack.push(function(event) {
        keyCount += !keys[event.keyCode];
        keys[event.keyCode] = 1;
        return -1;
      }, keys);
      function onKeyup(event) {
        if (keyCount === 0 || --keyCount || --count) {
          keys[event.keyCode] = 0;
          HUD.show("Pass next key: " + count);
          return;
        }
        exit();
      }
      function exit() {
        handlerStack.remove(keys);
        removeEventListener("keyup", onKeyup, true);
        HUD.hide();
      }
      addEventListener("keyup", onKeyup, true);
      VInsertMode.onWndBlur = exit;
      HUD.show("Pass next key: " + count);
    },
    goNext: function(_0, options) {
      var dir = options.dir;
      goBy(dir || "next", settings.cache[dir === "prev" ? "previousPatterns" : "nextPatterns"]);
    },
    reload: function() {
      setTimeout(function() { window.location.reload(); }, 17);
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
      else if (!DomUtils.isVisibile(newEl)) {
        newEl.scrollIntoViewIfNeeded();
        if (!DomUtils.isVisibile(newEl)) {
          HUD.showForDuration("The last focused is hidden", 2000);
          return;
        }
      }
      InsertMode.last = null;
      InsertMode.mutable = true;
      DomUtils.UI.simulateSelect(newEl, false, true);
    },
    simBackspace: function() {
      var el = InsertMode.lock;
      if (!el) { Commands.switchFocus(); }
      else if (DomUtils.isVisibile(el)) { document.execCommand("delete"); }
      else { el.scrollIntoViewIfNeeded(); }
    },
    goBack: function(count, options) {
      var step = Math.min(count, history.length - 1);
      step > 0 && history.go(step * (options.dir || -1));
    },
    goUp: function(count, _1, force_current) {
      var url, urlsplit;
      url = window.location.href;
      if (url.indexOf("://") === -1) { return; }
      if (url.endsWith("/")) { url = url.slice(0, -1); }
      urlsplit = url.split("/");
      if (urlsplit.length <= 3) { return; }
      urlsplit.length = Math.max(3, urlsplit.length - count);
      url = urlsplit.join('/');
      if (url.endsWith("#!")) { url = url.slice(0, -2); }
      window.location.href = url;
    },
    showHelp: function(_0, _1, force_current) {
      force_current |= 0;
      if (force_current < 2 &&
        mainPort.sendCommandToContainer("showHelp", [1, _1, force_current])) {
        return;
      }
      if (!document.body) { return false; }
      mainPort.port.postMessage({handler: "initHelp"});
    },
    autoCopy: function(_0, options) {
      var str = DomUtils.getSelectionText() ||
        (options.url ? window.location.href : document.title.trim());
      str && mainPort.port.postMessage({
        handler: "copyToClipboard",
        data: str
      });
      HUD.showCopied(str);
    },
    autoOpen: function(_0, options) {
      var str;
      if (str = DomUtils.getSelectionText()) {
        Utils.evalIfOK(str) || mainPort.port.postMessage({
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
          Utils.evalIfOK(str) || mainPort.port.postMessage({
            handler: "openUrl",
            url: str
          });
        } else {
          HUD.showCopied("");
        }
      });
    },
    searchAs: function() {
      mainPort.sendMessage({
        handler: "searchAs",
        url: window.location.href,
        search: DomUtils.getSelectionText()
      }, function(response) {
        response && HUD.showForDuration(response, 1000);
      });
    },
    focusInput: function(count) {
      var box, hints, selectedInputIndex, visibleInputs;
      visibleInputs = getVisibleInputs(DomUtils.evaluateXPath(
        './/input[not(@disabled or @readonly) and (@type="text" or @type="search" or @type="email" or @type="url" or @type="number" or @type="password" or @type="date" or @type="tel" or not(@type))] | .//xhtml:input[not(@disabled or @readonly) and (@type="text" or @type="search" or @type="email" or @type="url" or @type="number" or @type="password" or @type="date" or @type="tel" or not(@type))] | .//textarea[not(@disabled or @readonly)] | .//xhtml:textarea[not(@disabled or @readonly)] | .//*[@contenteditable="" or translate(@contenteditable, "TRUE", "true")="true"] | .//xhtml:*[@contenteditable="" or translate(@contenteditable, "TRUE", "true")="true"]'
        , XPathResult.ORDERED_NODE_SNAPSHOT_TYPE));
      selectedInputIndex = visibleInputs.length;
      if (selectedInputIndex === 0) {
        return;
      } else if (selectedInputIndex === 1) {
        DomUtils.UI.simulateSelect(visibleInputs[0], true, true);
        return;
      }
      if (count === 1 && InsertMode.last) {
        selectedInputIndex = Math.max(0, visibleInputs.indexOf(InsertMode.last));
      } else {
        selectedInputIndex = Math.min(count, selectedInputIndex) - 1;
      }
      DomUtils.UI.simulateSelect(visibleInputs[selectedInputIndex]);
      hints = visibleInputs.map(function(element) {
        var hint = DomUtils.createElement("div"), style = hint.style
          , rect = element.getBoundingClientRect();
        hint.className = "IH";
        style.left = (rect.left | 0) - 1 + "px";
        style.top = (rect.top | 0) - 1 + "px";
        style.width = (rect.width | 0) + "px";
        style.height = (rect.height | 0) + "px";
        return hint;
      });
      hints[selectedInputIndex].classList.add("S");
      box = DomUtils.UI.addElementList(hints, {
        id: "IMC",
        className: "R"
      });
      box.style.left = window.scrollX + "px";
      box.style.top = window.scrollY + "px";
      handlerStack.push(function(event) {
        if (event.keyCode === KeyCodes.tab) {
          hints[selectedInputIndex].classList.remove("S");
          if (event.shiftKey) {
            if (--selectedInputIndex === -1) {
              selectedInputIndex = hints.length - 1;
            }
          } else if (++selectedInputIndex === hints.length) {
            selectedInputIndex = 0;
          }
          hints[selectedInputIndex].classList.add("S");
          DomUtils.UI.simulateSelect(visibleInputs[selectedInputIndex]);
        } else if (event.keyCode === KeyCodes.f12) {
          return KeyboardUtils.isPlain(event) ? 0 : 2;
        } else if (!event.repeat && event.keyCode !== KeyCodes.shiftKey) {
          this.remove();
          handlerStack.remove(this);
          return 0;
        }
        return 2;
      }, box);
    }
  };

  checkValidKey = function(event, key) {
    var left = event.altKey ? "<a-" : "<";
    if (event.ctrlKey) {
      key = left + (event.metaKey ? "c-m-" : "c-") + key + ">";
    } else if (event.metaKey) {
      key = left + "m-" + key + ">";
    } else if (event.altKey || key.length > 1) {
      key = left + key + ">";
    }
    if (keyQueue) {
      if (!((key in firstKeys) || (key in currentSeconds))) {
        mainPort.port.postMessage({ handler: "esc" });
        keyQueue = false;
        currentSeconds = secondKeys[""];
        return 0;
      }
    } else if (passKeys && (key in passKeys) || !(key in firstKeys)) {
      return 0;
    }
    mainPort.port.postMessage({ handlerKey: key });
    return 2;
  };

  VInsertMode = InsertMode = {
    focus: null,
    global: null,
    suppressType: null,
    heldEl: false,
    last: null,
    loading: (document.readyState !== "complete"),
    lock: null,
    mutable: true,
    onExitSuppress: null,
    onWndBlur: null,
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
      if (notBody && DomUtils.getEditableType(activeEl)) {
        this.lock = activeEl;
      }
    },
    setupGrab: function() {
      this.focus = this.grabBackFocus;
      handlerStack.push(this.ExitGrab, this);
      addEventListener("mousedown", this.ExitGrab, true);
    },
    ExitGrab: function() {
      var _this = InsertMode;
      _this.focus = _this.lockFocus;
      removeEventListener("mousedown", _this.ExitGrab, true);
      handlerStack.remove(_this);
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
        DomUtils.getEditableType(target) && target.blur();
      }
      if (this.global) {
        this.lock = null; this.global = null;
        HUD.hide(true);
      }
    },
    setupSuppress: function(onExit) {
      this.suppressType = window.getSelection().type;
      this.onExitSuppress = onExit;
    },
    exitSuppress: function() {
      var f = this.onExitSuppress;
      this.onExitSuppress = this.suppressType = null;
      f && f();
    },
    keydownEvents: function(arr) {
      if (!isEnabledForUrl) { throw Error("vimium-disabled"); }
      if (!arr) { return KeydownEvents; }
      KeydownEvents = arr;
    },
    scroll: function(event) {
      var options, keyCode, ctrl;
      if (!event || event.shiftKey || event.altKey) { return; }
      keyCode = event.keyCode;
      if (!(keyCode >= KeyCodes.pageup && keyCode <= KeyCodes.down)) { return; }
      ctrl = event.ctrlKey || event.metaKey;
      if (keyCode >= KeyCodes.left) {
        options = { axis: keyCode & 1 && "x", view: +ctrl, dir: keyCode < KeyCodes.left + 2 && -1 };
      } else if (ctrl) { return; }
      else if (keyCode > KeyCodes.pageup + 1) {
        return Commands.scrollTo(1, { dest: keyCode & 1 && "max" });
      } else {
        options = { view: "viewSize", dir: keyCode === KeyCodes.pageup ? -0.5 : 0.5 };
      }
      Commands.scrollBy(1, options);
    },
    OnShadowBlur: function(event) {
      if (this.vimiumBlurred) {
        this.vimiumBlurred = false;
        this.removeEventListener("blur", InsertMode.OnShadowBlur, true);
      }
      ELs.onBlur(event);
    }
  };

  getVisibleInputs = function(pathSet) {
    DomUtils.prepareCrop();
    for (var element, results = [], i = 0, _ref = pathSet.snapshotLength; i < _ref; ++i) {
      element = pathSet.snapshotItem(i);
      if (DomUtils.getVisibleClientRect(element)) {
        results.push(element);
      }
    }
    element = Vomnibar.box;
    if (element && element.style.display !== "none") {
      results.unshift(Vomnibar.input);
    }
    return results;
  };

  followLink = function(linkElement) {
    if (linkElement instanceof HTMLLinkElement) {
      window.location.href = linkElement.href;
      return;
    }
    linkElement.scrollIntoViewIfNeeded();
    DomUtils.UI.flashVRect(DomUtils.UI.getVRect(linkElement));
    DomUtils.simulateClick(linkElement);
  };

  goBy = function(relName, pattern) {
    if (relName && typeof relName === "string" && goBy.findAndFollowRel(relName)) {
      return true;
    }
    pattern = typeof pattern === "string" && (pattern = pattern.trim())
      ? pattern.toLowerCase().split(/\s*,\s*/).filter(function(s) { return s.length; })
      : (pattern instanceof Array) ? pattern : [];
    if (pattern.length > 0) {
      goBy.findAndFollowLink(pattern);
    }
  };

  goBy.findAndFollowLink = function(linkStrings) {
    var boundingClientRect, candidateLinks, exactWordRe, link, linkString, links, linksXPath, _i, _j, _len, _len1;
    linksXPath = './/a | .//xhtml:a | .//*[@onclick or @role="link"] | .//xhtml:*[@onclick or @role="link"]';
    links = DomUtils.evaluateXPath(linksXPath, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    candidateLinks = [];
    _len = links.snapshotLength;
    while (0 <= --_len) {
      link = links.snapshotItem(_len);
      boundingClientRect = link.getBoundingClientRect();
      if (boundingClientRect.width < 0.5 || boundingClientRect.height < 0.5) {
        continue;
      }
      if (!DomUtils.isStyleVisible(window.getComputedStyle(link))) { continue; }
      linkString = (link.innerText || link.title).toLowerCase();
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
    while (0 <= --_len) {
      link = candidateLinks[_len];
      link.wordCount = (link.innerText || link.title).trim().split(/\s+/).length;
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
      exactWordRe = /\b/.test(linkString[0]) || /\b/.test(linkString.slice(-1))
        ? new RegExp("\\b" + linkString + "\\b", "i") : new RegExp(linkString, "i");
      for (_j = 0, _len1 = candidateLinks.length; _j < _len1; _j++) {
        link = candidateLinks[_j];
        if (exactWordRe.test(link.innerText || link.title)) {
          followLink(link);
          return true;
        }
      }
    }
    return false;
  };

  goBy.findAndFollowRel = function(value) {
    var element, elements, relTags, tag, _i, _j, _len, _len1;
    relTags = ["link", "a", "area"];
    for (_i = 0, _len = relTags.length; _i < _len; _i++) {
      tag = relTags[_i];
      elements = document.getElementsByTagName(tag);
      for (_j = 0, _len1 = elements.length; _j < _len1; _j++) {
        element = elements[_j];
        if (element.hasAttribute("rel") && element.rel.toLowerCase() === value) {
          followLink(element);
          return true;
        }
      }
    }
    return false;
  };

  FrameMask = {
    more: false,
    node: null,
    timer: 0,
    Focus: function(request) {
      if (request.frameId < 0) {}
      else if (window.innerWidth < 3 || window.innerHeight < 3
        || document.body instanceof HTMLFrameSetElement) {
        mainPort.port.postMessage({
          frameId: request.frameId,
          handler: "nextFrame"
        });
        return;
      }
      window.focus();
      document.documentElement.scrollIntoViewIfNeeded();
      if (!document.body || document.readyState !== "complete") { return; }
      var _this = FrameMask, dom1;
      if (dom1 = _this.node) {
        _this.more = true;
      } else {
        dom1 = DomUtils.createElement("div");
        dom1.setAttribute("style", "background:none;border:5px solid yellow;box-shadow:none;\
box-sizing:border-box;display:block;float:none;height:100%;left:0;margin:0;\
opacity:1;pointer-events:none;position:fixed;top:0;width:100%;z-index:2147483647;");
        _this.node = dom1;
        _this.timer = setInterval(_this.Remove, 200);
      }
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
    showCopied: function(text, e) {
      if (!text) {
        this.showForDuration("No " + (e || text) + " found!", 1000);
        return;
      }
      if (text.startsWith("chrome-")) {
        text = text.substring(text.indexOf('/', text.indexOf('/') + 2));
      }
      if (text.length > 43) {
        text = text.substring(0, 40) + "...";
      }
      this.showForDuration("copy: " + text, 2000);
    },
    showForDuration: function(text, duration) {
      this.show(text);
      this.durationTimer = this.enabled && setTimeout(this.hide, duration);
    },
    show: function(text) {
      if (!this.enabled) { return; }
      var el = this.box;
      if (!el) {
        el = DomUtils.createElement("div");
        el.className = "R HUD";
        el.style.opacity = 0;
        el.style.visibility = "hidden";
        DomUtils.UI.addElement(this.box = el);
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
          DomUtils.UI.adjust();
        }
        opacity += opacity < hud.opacity ? 0.25 : -0.25;
        el.style.opacity = opacity;
        if (opacity !== hud.opacity) {
          return;
        }
      }
      if (opacity == 0) {
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
      if (immediate === true) {
        clearInterval(hud.tweenId);
        hud.tweenId = 0;
        el = hud.box;
        el.style.visibility = "hidden";
        el.textContent = "";
        el.style.opacity = 0;
      } else if (!hud.tweenId && hud.box) {
        hud.tweenId = setInterval(hud.tween, 40);
      }
    },
    enabled: false
  };

  requestHandlers = {
    init: function(request) {
      var r = requestHandlers;
      settings.cache = request.load;
      clearInterval(settings.isLoading);
      KeyboardUtils.onMac = request.onMac;
      r.refreshKeyMappings(request);
      r.reset(request);
      InsertMode.loading = false;
      r.init = null;
    },
    reset: function(request) {
      var passKeys = request.passKeys;
      if (isEnabledForUrl = (passKeys !== "")) {
        initIfEnabled(passKeys);
      }
      DomUtils.UI.box && DomUtils.UI.toggle(isEnabledForUrl);
    },
    checkIfEnabled: function() {
      mainPort.port.postMessage({
        handler: "checkIfEnabled",
        url: window.location.href
      });
    },
    settingsUpdate: function(response) {
      var ref = settings.cache, i;
      Object.setPrototypeOf(response, null);
      delete response.name;
      for (i in response) {
        ref[i] = response[i];
      }
    },
    insertCSS: function(request) {
      DomUtils.UI.insertCSS(request.css, isEnabledForUrl);
    },
    insertInnerCss: DomUtils.UI.insertInnerCSS,
    focusFrame: FrameMask.Focus,
    refreshKeyMappings: function(request) {
      var arr = request.firstKeys, i = arr.length, map, key, sec, sec2;
      map = firstKeys = Object.create(null);
      while (0 <= --i) {
        map[arr[i]] = true;
      }
      sec = request.secondKeys;
      Object.setPrototypeOf(sec, null);
      sec2 = secondKeys = Object.create(null);
      for (key in sec) {
        arr = sec[key];
        map = sec2[key] = Object.create(null);
        i = arr.length;
        while (0 <= --i) {
          map[arr[i]] = true;
        }
      }
      requestHandlers.refreshKeyQueue(request);
    },
    refreshKeyQueue: function(request) {
      if (request.currentFirst !== null) {
        keyQueue = true;
        currentSeconds = secondKeys[request.currentFirst]; // less possible
      } else {
        keyQueue = false;
        currentSeconds = secondKeys[""];
      }
    },
    execute: function(request) {
      keyQueue = false;
      currentSeconds = secondKeys[""];
      var arr = Utils.findCommand(Commands, request.command);
      arr[0][arr[1]](request.count, request.options || {});
    },
    dispatchCommand: function(request) {
      var args = request.args;
      if (!isEnabledForUrl && request.source >= 0) {
        args[2] = 2;
        mainPort.sendCommand(request.source, request.command, args);
        return;
      }
      window.focus();
      var arr = Utils.findCommand(Commands, request.command);
      arr[0][arr[1]](args[0], args[1], args[2]);
    },
    omni: function(response) { Vomnibar.onCompletions(response.list); },
    performFind: function(request) { VFindMode.activate(request); },
    createMark: Marks.CreateGlobalMark,
    scroll: Marks.Goto,
    showHUD: function(request) {
      HUD.showForDuration(request.text, 1500);
    },
    showCopied: function(request) {
      HUD.showCopied(request.text);
    },
  showHelpDialog: function(response) {
    var box, oldShowHelp, hide, node1, //
    toggleAdvanced, shouldShowAdvanced = response.advanced === true;
    box = DomUtils.createElement("div");
    box.innerHTML = response.html;
    box = box.firstElementChild;
    box.onmousewheel = DomUtils.SuppressPropagation;
    box.onclick = DomUtils.SuppressPropagation;
    box.vimiumHasOnclick = false;

    hide = function() {
      if (box.contains(LinkHints.lastHovered)) {
        LinkHints.lastHovered = null;
      }
      handlerStack.remove(box);
      box.remove();
      Commands.showHelp = oldShowHelp;
      box = null;
    };
    toggleAdvanced = function() {
      box.querySelector("#AdvancedCommands").textContent =
        (shouldShowAdvanced ? "Hide" : "Show") + " advanced commands";
      box.classList.toggle("HelpAdvanced");
    };

    oldShowHelp = Commands.showHelp;
    box.querySelector("#AdvancedCommands").onclick = function() {
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      settings.set("showAdvancedCommands", shouldShowAdvanced);
    };
    box.querySelector("#HClose").onclick = Commands.showHelp = hide;
    node1 = box.querySelector("#OptionsPage");
    if (! window.location.href.startsWith(response.optionUrl)) {
      node1.href = response.optionUrl;
      node1.onclick = function(event) {
        event.preventDefault();
        mainPort.port.postMessage({ handler: "focusOrLaunch", url: this.href });
        hide();
      };
    } else {
      node1.remove();
    }
    shouldShowAdvanced && toggleAdvanced();
    DomUtils.UI.addElement(box);
    window.focus();
    Scroller.current = box;
    handlerStack.push(function(event) {
      if (event.keyCode === KeyCodes.esc && !InsertMode.lock
          && KeyboardUtils.isPlain(event)) {
        DomUtils.UI.removeSelection() || hide();
        return 2;
      }
      return 0;
    }, box);
  }
  };


  mainPort.connect();
  settings.isLoading = setInterval(function() {
    mainPort.connect();
  }, 2000);

  DomUtils.documentReady(function() {
    HUD.enabled = !!document.body;
    if (isInjected || mainPort.safePost({ handler: "reg",
      visible: window.innerHeight > 9 && window.innerWidth > 9
    })) {
      return;
    }
    // NOTE: here, we should always postMessage, since
    //     NO other message will be sent if not isEnabledForUrl,
    // which would make the auto-destroy logic not work.
    ELs.onWndFocus = mainPort.safePost.bind(mainPort, { handler: "frameFocused" });
  });

  isInjected && (settings.ELs = ELs, settings.checkIfEnabled = requestHandlers.checkIfEnabled);

  ELs.destroy = function() {
    var f = removeEventListener;
    isEnabledForUrl = false;
    clearInterval(settings.isLoading);

    f("keydown", this.onKeydown, true);
    f("keypress", this.onKeypress, true);
    f("keyup", this.onKeyup, true);
    f("focus", this.onFocus, true);
    f("blur", this.onBlur, true);
    f("mousedown", InsertMode.ExitGrab, true);
    document.removeEventListener("DOMActivate", this.onActivate, true);
    DomUtils.UI.box && DomUtils.UI.box.remove();
    (f = settings.onDestroy) && f();

    Utils = KeyCodes = KeyboardUtils = DomUtils = VRect = handlerStack = //
    LinkHints = Vomnibar = Scroller = Marks = VFindMode = //
    Settings = VHUD = MainPort = VInsertMode = null;

    console.log("%cVimium++%c in %c%s%c has destroyed at %o."
      , "color:red", "color:auto", "color:darkred"
      , window.location.pathname.replace(/^.*\/([^\/]+)\/?$/, "$1")
      , "color:auto", Date.now());

    if (!isInjected) {
      chrome = null;
    }
  };
})();
