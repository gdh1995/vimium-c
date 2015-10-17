"use strict";
var Settings, VHUD, MainPort, VInsertMode;
(function() {
  var Commands, ELs, HUD, KeydownEvents, checkValidKey, currentSeconds //
    , executeFind, exitFindMode //
    , findAndFocus, findChangeListened, findMode //
    , findModeAnchorNode, findModeQuery, findModeQueryHasResults, firstKeys //
    , focusFoundLink, followLink, frameId, FrameMask //
    , getNextQueryFromRegexpMatches, getVisibleInputs, goBy //
    , handleDeleteForFindMode, handleEnterForFindMode, handleEscapeForFindMode //
    , handleKeyCharForFindMode, initIfEnabled, InsertMode //
    , isEnabledForUrl, isInjected, keyQueue, mainPort //
    , passKeys, performFindInPlace, requestHandlers //
    , restoreDefaultSelectionHighlight, secondKeys, settings //
    , showFindModeHUDForQuery, updateFindModeQuery
    ;
  
  isInjected = window.VimiumInjector ? true : false;

  frameId = window.top === window ? 0 : ((Math.random() * 9999997) | 0) + 2;

  findMode = false;
  
  findChangeListened = 0;

  findModeQuery = {
    rawQuery: "",
    matchCount: 0,
    parsedQuery: "",
    isRe: false,
    ignoreCase: false,
    activeRegexpIndex: 0,
    regexMatches: null
  };

  findModeQueryHasResults = false;

  findModeAnchorNode = null;

  isEnabledForUrl = false;

  KeydownEvents = new Uint8Array(256);

  keyQueue = false;

  firstKeys = {};

  secondKeys = {"": {}};

  currentSeconds = {};

  passKeys = null;
  
  MainPort = mainPort = {
    port: null,
    _callbacks: { __proto__: null },
    _lastMsg: 1,
    sendMessage: function(request, callback) {
      var id = ++this._lastMsg;
      this.port.postMessage({_msgId: id, request: request});
      this._callbacks[id] = callback;
      return id;
    },
    safePost: function(request, ifConnected, ifReconnect) {
      try {
        if (!this.port) {
          this.connect();
          ifReconnect && ifReconnect();
        }
        ifConnected && ifConnected();
        this.port.postMessage(request);
      } catch (e) { // this extension is reloaded or disabled
        ELs.destroy();
        return true;
      }
    },
    sendCommadToFrame: function(target, command, args) {
      this.port.postMessage({
        handler: "dispatchCommand", tabId: ELs.focusMsg.tabId,
        frameId: target, source: frameId,
        command: command, args: args
      });
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
      port = this.port = chrome.runtime.connect("hfjbmagddngcpeloejdejnfgbamkjaeg", { name: "vimium++" });
      port.onDisconnect.addListener(this.ClearPort);
      port.onMessage.addListener(this.Listener);
    }
  };
  mainPort.connect();

  Settings = settings = {
    values: null,
    isLoading: 0,
    onDestroy: {},
    set: function(key, value) {
      this.values[key] = value;
      mainPort.port.postMessage({
        handler: "setSetting",
        key: key,
        value: value
      });
    },
    load: function(request, onerror) {
      request = {
        handlerSettings: "load",
        request: request
      };
      mainPort.port.postMessage(request);
      if (onerror) {
        onerror = onerror.bind(null, request.request);
      }
      this.isLoading = setInterval(mainPort.safePost.bind(
        mainPort, request, onerror, null), 2000);
    },
    ReceiveSettings: function(response) {
      var ref = response.load;
      Utils.setNullProto(ref);
      settings.values = ref;
      clearInterval(settings.isLoading);
      response = response.response;
      requestHandlers[response.name](response);
    },
    OnUpdate: function(response) {
      var _this = settings;
      Utils.setNullProto(response);
      delete response.name;
      for (i in response) {
        settings.values[i] = response[i];
      }
    }
  };

  ELs = { //
    focusMsg: {
      handler: "frameFocused",
      tabId: 0,
      status: "disabled",
      url: window.location.href,
      frameId: frameId
    }, //
    onKeydown: null, onKeypress: null, onKeyup: null, //
    onFocus: null, onBlur: null, onActivate: null, //
    onWndFocus: function(){}, onUnload: null, onHashChagne: null, //
    onMessage: null, destroy: null //
  };

  initIfEnabled = function(newPassKeys) {
    initIfEnabled = function(newPassKeys) {
      if (newPassKeys) {
        var pass = Utils.makeNullProto(), arr = newPassKeys.split(' ')
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
    KeyboardUtils.init();
    InsertMode.init();
    // Assume that all the below listeners won't throw any port exception
    window.addEventListener("keydown", ELs.onKeydown, true);
    window.addEventListener("keypress", ELs.onKeypress = function(event) {
      if (isEnabledForUrl && handlerStack.bubbleEvent("keypress", event)) {
        var keyChar;
        if (findMode && (keyChar = String.fromCharCode(event.charCode))) {
          handleKeyCharForFindMode(keyChar);
          DomUtils.suppressEvent(event);
        }
      }
    }, true);
    window.addEventListener("keyup", ELs.onKeyup = function(event) {
      if (isEnabledForUrl) {
        if (Scroller.keyIsDown) { Scroller.keyIsDown = 0; }
        if (KeydownEvents[event.keyCode]) {
          KeydownEvents[event.keyCode] = 0;
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    }, true);
    window.addEventListener("focus", ELs.onFocus = function(event) {
      var target = event.target;
      if (target === window) { ELs.onWndFocus(); }
      else if (!isEnabledForUrl) {}
      else if (findMode) {} // TODO: check findMode
      else if (DomUtils.getEditableType(target)) { InsertMode.focus(event); }
      else if (target.shadowRoot) {
        target = target.shadowRoot;
        target.addEventListener("focus", ELs.onFocus, true);
        target.addEventListener("blur", ELs.onBlur, true);
      }
    }, true);
    window.addEventListener("blur", ELs.onBlur = function(event) {
      var target = event.target;
      if (target === window) {
        // NOTE: Scroller will be set null when destroying, and window.onblur
        //   won't be used any more, so we needn't make Scroller {}
        // NOTE: so does InsertMode
        if (Scroller.keyIsDown) { Scroller.keyIsDown = 0; }
        KeydownEvents = new Uint8Array(256);
      } else if (!isEnabledForUrl) {}
      else if (InsertMode.lock === target) { InsertMode.lock = null; }
      else if (target.shadowRoot) {
        target = target.shadowRoot;
        // NOTE: if destroyed, this page must have lost its focus before, so
        // a blur event must have been bubbled from shadowRoot to a real lock.
        // Then, we don't need to worry about ELs or InsertMode being null.
        target.removeEventListener("focus", ELs.onFocus, true);
        target.removeEventListener("blur", ELs.onBlur, true);
        target.addEventListener("blur", InsertMode.OnShadowBlur, true);
      }
    }, true);
    document.addEventListener("DOMActivate", ELs.onActivate = function(event) {
      Scroller.current = event.path[0];
    }, true);
  };

  Commands = {
    __proto__: null,
    Vomnibar: Vomnibar,
    LinkHints: LinkHints,
    Marks: Marks,

    toggleSwitchTemp: function(_0, options) {
      var key = options.key, values = settings.values;
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
      var values = settings.values, val = options.value || "sadjklewcmpgh";
      if (values.linkHintCharacters === val) {
        val = values.linkHintCharacters = values.oldLinkHintCharacters;
        values.oldLinkHintCharacters = "";
      } else {
        values.oldLinkHintCharacters = values.linkHintCharacters;
        values.linkHintCharacters = val;
      }
      HUD.showForDuration('Now link hints use "' + val + '".', 1500);
    },
    scroll: function(_0, options) {
      var event = options.event, keyCode, command;
      if (!event || event.shiftKey || event.altKey) { return; }
      keyCode = event.keyCode;
      if (!(keyCode >= KeyCodes.pageup && keyCode <= KeyCodes.down)) { return; }
      if (keyCode >= KeyCodes.left) {
        command = KeyboardUtils.keyNames[keyCode].replace(/./, function(a) {
          return a.toUpperCase();
        });
        if (event.ctrlKey || event.metaKey) {
          command = "Px" + command;
        }
      } else if (event.ctrlKey || event.metaKey) {
        return;
      } else {
        command = ["PageUp", "PageDown", "ToBottom", "ToTop"][keyCode - KeyCodes.pageup];
      }
      Commands["scroll" + command](1, {});
    },
    scrollToBottom: function() {
      Marks.setPreviousPosition();
      Scroller.scrollTo("y", "max");
    },
    scrollToTop: function() {
      Marks.setPreviousPosition();
      Scroller.scrollTo("y", 0);
    },
    scrollToLeft: function() {
      Scroller.scrollTo("x", 0);
    },
    scrollToRight: function() {
      Scroller.scrollTo("x", "max");
    },
    scrollUp: function(count) {
      Scroller.scrollBy("y", -count * settings.values.scrollStepSize);
    },
    scrollDown: function(count) {
      Scroller.scrollBy("y", count * settings.values.scrollStepSize);
    },
    scrollPageUp: function(count) {
      Scroller.scrollBy("y", -count / 2, "viewSize");
    },
    scrollPageDown: function(count) {
      Scroller.scrollBy("y", count / 2, "viewSize");
    },
    scrollFullPageUp: function(count) {
      Scroller.scrollBy("y", -count, "viewSize");
    },
    scrollFullPageDown: function(count) {
      Scroller.scrollBy("y", count, "viewSize");
    },
    scrollLeft: function(count) {
      Scroller.scrollBy("x", -count * settings.values.scrollStepSize, "", true);
    },
    scrollRight: function(count) {
      Scroller.scrollBy("x", count * settings.values.scrollStepSize, "", true);
    },
    scrollPxUp: function(count) {
      Scroller.scrollBy("y", -count);
    },
    scrollPxDown: function(count) {
      Scroller.scrollBy("y", count);
    },
    scrollPxLeft: function(count) {
      Scroller.scrollBy("x", -count);
    },
    scrollPxRight: function(count) {
      Scroller.scrollBy("x", count);
    },

    performFind: function(count) {
      findAndFocus(count);
    },
    performBackwardsFind: function(count) {
      findAndFocus(count, true);
    },
    enterInsertMode: function() {
      InsertMode.global = true;
      HUD.show("Insert mode");
    },
    enterFindMode: function() {
      Marks.setPreviousPosition();
      findModeQuery.rawQuery = "";
      findMode = true;
      HUD.show("/");
    },
    goPrevious: function() {
      goBy("prev", settings.values.previousPatterns);
    },
    goNext: function() {
      goBy("next", settings.values.nextPatterns);
    },
    reload: function() {
      window.location.reload();
    },
    switchFocus: function() {
      var newEl = document.activeElement;
      if (newEl !== document.body) {
        InsertMode.last = newEl;
        InsertMode.mutable = false;
        if (newEl && newEl.blur) {
          newEl.blur();
        }
        return;
      }
      newEl = InsertMode.last;
      if (!newEl) { return; }
      else if (!DomUtils.isVisibile(newEl)) {
        newEl.scrollIntoViewIfNeeded();
        if (!DomUtils.isVisibile(newEl)) { return; }
      }
      InsertMode.last = null;
      InsertMode.mutable = true;
      DomUtils.simulateSelect(newEl);
    },
    simBackspace: function() {
      var el = document.activeElement;
      if (el && el === document.body) { Commands.switchFocus(); }
      else if (DomUtils.getEditableType(el) !== 3) {}
      else if (DomUtils.isVisibile(el)) { DomUtils.simulateBackspace(el); }
      else { el.scrollIntoViewIfNeeded(); }
    },
    goBack: function(count) {
      history.go(-Math.min(count, history.length - 1));
    },
    goForward: function(count) {
      history.go(Math.min(count, history.length - 1));
    },
    showHelp: function(_0, _1, force_current) {
      if (window.top !== window && !force_current) {
        mainPort.sendCommadToFrame(0, "showHelp", [0, null]);
        return;
      }
      mainPort.sendMessage({
        handler: "initHelp"
      }, requestHandlers.showHelpDialog);
    },
    autoCopy: function(_0, options) {
      var str = DomUtils.getSelectionText() ||
        (options.url ? location.href : document.title.trim());
      if (str = str.trim()) {
        mainPort.port.postMessage({
          handler: "copyToClipboard",
          data: str
        });
        HUD.showCopied(str);
      } else {
        HUD.showForDuration("No text found!", 1000);
      }
    },
    autoOpen: function(_0, options) {
      var str;
      if (str = DomUtils.getSelectionText()) {
        Utils.evalIfOK(str) || mainPort.port.postMessage({
          handler: "openUrlInNewTab",
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
            handler: "openUrl_fInNewTab",
            url: str
          });
        } else {
          HUD.showForDuration("No text found!", 1000);
        }
      });
    },
    searchAs: function() {
      mainPort.sendMessage({
        handler: "searchAs",
        url: window.location.href,
        search: DomUtils.getSelectionText()
      }, function(response) {
        if (response) {
          HUD.showForDuration("No " + response + " found!", 1000);
        }
      });
    },
    focusInput: function(count) {
      var hintContainingDiv, hints, selectedInputIndex, visibleInputs;
      visibleInputs = getVisibleInputs(DomUtils.evaluateXPath(
        './/input[not(@disabled or @readonly) and (@type="text" or @type="search" or @type="email" or @type="url" or @type="number" or @type="password" or @type="date" or @type="tel" or not(@type))] | .//xhtml:input[not(@disabled or @readonly) and (@type="text" or @type="search" or @type="email" or @type="url" or @type="number" or @type="password" or @type="date" or @type="tel" or not(@type))] | .//textarea[not(@disabled or @readonly)] | .//xhtml:textarea[not(@disabled or @readonly)] | .//*[@contenteditable="" or translate(@contenteditable, "TRUE", "true")="true"] | .//xhtml:*[@contenteditable="" or translate(@contenteditable, "TRUE", "true")="true"]'
        , XPathResult.ORDERED_NODE_SNAPSHOT_TYPE));
      selectedInputIndex = visibleInputs.length;
      if (selectedInputIndex === 0) {
        return;
      } else if (selectedInputIndex === 1) {
        DomUtils.simulateSelect(visibleInputs[0]);
        DomUtils.UI.flashOutline(visibleInputs[0]);
        return;
      }
      if (count === 1 && InsertMode.last) {
        selectedInputIndex = Math.max(0, visibleInputs.indexOf(InsertMode.last));
      } else {
        selectedInputIndex = Math.min(count, selectedInputIndex) - 1;
      }
      DomUtils.simulateSelect(visibleInputs[selectedInputIndex]);
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
      hintContainingDiv = DomUtils.UI.addElementList(hints, {
        id: "IMC",
        className: "R"
      });
      hintContainingDiv.style.left = window.scrollX + "px";
      hintContainingDiv.style.top = window.scrollY + "px";
      handlerStack.push({
        keydown: function(event) {
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
            DomUtils.simulateSelect(visibleInputs[selectedInputIndex]);
          } else if (event.keyCode === KeyCodes.f12) {
            return true;
          } else if (event.keyCode !== KeyCodes.shiftKey) {
            hintContainingDiv.remove();
            handlerStack.remove(this.handlerId);
            return true;
          }
          return false;
        }
      });
    }
  };

  ELs.onKeydown = function(event) {
    if (Scroller.keyIsDown) {
      if (event.repeat) {
        Scroller.keyIsDown = Scroller.Core.maxInterval;
        DomUtils.suppressEvent(event);
        return;
      }
      Scroller.keyIsDown = 0;
    }
    if (isEnabledForUrl) {
      if (!handlerStack.bubbleEvent("keydown", event)) {
        KeydownEvents[event.keyCode] = 1;
        return;
      }
    } else {
      return;
    }
    var keyChar, key = event.keyCode, action = 0;
    if (InsertMode.isActive()) {
      if (key === KeyCodes.esc) {
        if (KeyboardUtils.isPlain(event)) {
          InsertMode.exit(event);
          action = 2;
        }
      }
      else if (InsertMode.global) {}
      else if (key >= KeyCodes.f1 && key <= KeyCodes.f12) {
        action = checkValidKey(event, KeyboardUtils.getKeyName(event));
      }
    }
    else if (findMode) {
      if (key === KeyCodes.esc) {
        if (KeyboardUtils.isPlain(event)) {
          handleEscapeForFindMode();
          action = 2;
        }
      } else if (key === KeyCodes.backspace || key === KeyCodes.deleteKey) {
        handleDeleteForFindMode();
        action = 2;
      } else if (key === KeyCodes.enter) {
        handleEnterForFindMode();
        action = 2;
      } else if (event.metaKey || event.ctrlKey || event.altKey) {}
      else if (event.keyIdentifier.startsWith("U+")) {
        action = 1;
      } else if (! (key in KeyboardUtils.keyNames)) {
        action = 1;
      }
    }
    else if (key >= 32) {
      if (keyChar = KeyboardUtils.getKeyChar(event)) {
        action = checkValidKey(event, keyChar);
      }
    }
    else if (key === KeyCodes.esc && KeyboardUtils.isPlain(event)) {
      if (keyQueue) {
        mainPort.port.postMessage({ handler: "esc" });
        keyQueue = false;
        currentSeconds = secondKeys[""];
        action = 2;
      } else if (window.getSelection().type === "Range") {
        window.getSelection().removeAllRanges();
        action = 2;
      }
    }
    if (action <= 0) { return; }
    if (action === 2) {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
    KeydownEvents[key] = 1;
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
    global: false,
    handlerId: 0,
    heldEl: null,
    last: null,
    loading: (document.readyState !== "complete"),
    lock: null,
    mutable: true,
    init: function() {
      var activeEl = document.activeElement;
      this.focus = this.lockFocus;
      this.init = null;
      this.exitGrab = this.exitGrab.bind(this);
      if (settings.values.grabBackFocus && this.loading) {
        if (activeEl) {
          activeEl.blur();
          if (DomUtils.getEditableType(document.activeElement)) {
            this.lock = document.activeElement;
            return;
          }
        }
        this.setupGrab();
        return;
      }
      if (activeEl != null && (activeEl !== document.body
          ? DomUtils.getEditableType(activeEl) : activeEl.isContentEditable)) {
        this.lock = activeEl;
      }
    },
    setupGrab: function() {
      this.focus = this.grabBackFocus;
      this.handlerId = this.handlerId || handlerStack.push({
        _this: this,
        keydown: this.exitGrab
      });
      window.addEventListener("mousedown", this.exitGrab, true);
    },
    exitGrab: function() {
      if (this.focus === this.grabBackFocus) {
        this.focus = this.lockFocus;
      }
      window.removeEventListener("mousedown", this.exitGrab, true);
      handlerStack.remove(this.handlerId);
      this.handlerId = 0;
      return true;
    },
    grabBackFocus: function(event) {
      if (settings.values.grabBackFocus) {
        DomUtils.suppressEvent(event);
        event.target.blur();
      } else { // just in case that we open options.html and change its checkbox
        this.lockFocus(event);
      }
    },
    holdFocus: function(event) {
      if (this.heldEl === event.target) { event.stopImmediatePropagation(); }
      this.focus = this.lockFocus;
      this.focus(event);
    },
    lockFocus: function(event) {
      var target = event.target;
      // NOTE: should not filter out `<select>` for windows
      this.lock = target;
      if (this.mutable && this.heldEl !== target) {
        this.last = target;
      }
    },
    isActive: function() {
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
      if (this.global) {
        this.lock = null; this.global = false;
        HUD.hide();
      }
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
    },
    OnShadowBlur: function(event) {
      this.removeEventListener("blur", InsertMode.OnShadowBlur, true);
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
    element = Vomnibar.vomnibarUI.box;
    if (element && element.style.display !== "none") {
      results.unshift(Vomnibar.vomnibarUI.input);
    }
    return results;
  };
  
  updateFindModeQuery = function() {
    var escapeRe, hasNoIgnoreCaseFlag, parsedNonRegexpQuery, pattern, text;
    findModeQuery.isRe = settings.values.regexFindMode;
    hasNoIgnoreCaseFlag = false;
    findModeQuery.parsedQuery = findModeQuery.rawQuery.replace(/\\./g, function(match) {
      switch (match) {
      case "\\r":
        findModeQuery.isRe = true;
        break;
      case "\\R":
        findModeQuery.isRe = false;
        break;
      case "\\I":
        hasNoIgnoreCaseFlag = true;
        break;
      case "\\\\":
        return "\\";
      default:
        return match;
      }
      return "";
    });
    findModeQuery.ignoreCase = !hasNoIgnoreCaseFlag && !Utils.upperRe.test(findModeQuery.parsedQuery);
    if (findModeQuery.isRe) {
      try {
        pattern = new RegExp(findModeQuery.parsedQuery, "g" + (findModeQuery.ignoreCase ? "i" : ""));
      } catch (_error) {
        return;
      }
      text = document.documentElement.innerText;
      findModeQuery.regexMatches = text.match(pattern);
      findModeQuery.activeRegexpIndex = 0;
      findModeQuery.matchCount = (findModeQuery.regexMatches || []).length;
    } else {
      escapeRe = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
      parsedNonRegexpQuery = findModeQuery.parsedQuery.replace(escapeRe, function(ch) {
        return "\\" + ch;
      });
      pattern = new RegExp(parsedNonRegexpQuery, "g" + (findModeQuery.ignoreCase ? "i" : ""));
      text = document.documentElement.innerText;
      findModeQuery.matchCount = (text.match(pattern) || []).length;
    }
  };

  handleKeyCharForFindMode = function(keyChar) {
    findModeQuery.rawQuery += keyChar;
    updateFindModeQuery();
    performFindInPlace();
    showFindModeHUDForQuery();
  };

  handleEscapeForFindMode = function() {
    var range, selection;
    exitFindMode();
    restoreDefaultSelectionHighlight();
    selection = window.getSelection();
    if (!selection.isCollapsed) {
      range = selection.getRangeAt(0);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    focusFoundLink();
    if (findModeQueryHasResults && DomUtils.canTakeInput(findModeAnchorNode)) {
      InsertMode.lock = document.activeElement;
      DomUtils.simulateSelect(document.activeElement);
    }
  };

  handleDeleteForFindMode = function() {
    if (! findModeQuery.rawQuery) {
      exitFindMode();
      performFindInPlace();
    } else {
      findModeQuery.rawQuery = findModeQuery.rawQuery.substring(0, findModeQuery.rawQuery.length - 1);
      updateFindModeQuery();
      performFindInPlace();
      showFindModeHUDForQuery();
    }
  };

  handleEnterForFindMode = function() {
    exitFindMode();
    focusFoundLink();
    settings.set("findModeRawQuery", findModeQuery.rawQuery);
  };

  performFindInPlace = function() {
    var cachedScrollX = window.scrollX, cachedScrollY = window.scrollY
      , query = findModeQuery.isRe ? getNextQueryFromRegexpMatches(0) : findModeQuery.parsedQuery;
    executeFind(query, {
      backwards: true,
      caseSensitive: !findModeQuery.ignoreCase
    });
    window.scrollTo(cachedScrollX, cachedScrollY);
    executeFind(query, {
      caseSensitive: !findModeQuery.ignoreCase
    });
  };

  executeFind = function(query, options) {
    var oldFindMode = findMode, result;
    HUD.hide(true);
    result = options.repeat;
    do {
      findModeQueryHasResults = window.find(query, options.caseSensitive
        , options.backwards, true, false, true, false);
    } while (findModeQueryHasResults && 0 < --result);
    if (findChangeListened === 0) {
      findChangeListened = setTimeout(function() {
        document.addEventListener("selectionchange", restoreDefaultSelectionHighlight, true);
      }, 1000);
    }
    findMode = oldFindMode;
    findModeAnchorNode = window.getSelection().anchorNode;
  };

  restoreDefaultSelectionHighlight = function() {
    document.removeEventListener("selectionchange", restoreDefaultSelectionHighlight, true);
    if (findChangeListened) {
      clearTimeout(findChangeListened);
      findChangeListened = 0;
    }
  };

  focusFoundLink = function() {
    if (!findModeQueryHasResults) { return; }
    var node = window.getSelection().anchorNode;
    while (node && node !== document.body) {
      if (node.nodeName.toLowerCase() === "a") {
        node.focus();
        return;
      }
      node = node.parentNode;
    }
  };

  getNextQueryFromRegexpMatches = function(stepSize) {
    var totalMatches;
    if (!findModeQuery.regexMatches) {
      return "";
    }
    totalMatches = findModeQuery.regexMatches.length;
    findModeQuery.activeRegexpIndex += stepSize + totalMatches;
    findModeQuery.activeRegexpIndex %= totalMatches;
    return findModeQuery.regexMatches[findModeQuery.activeRegexpIndex];
  };

  findAndFocus = function(count, backwards) {
    var mostRecentQuery, query;
    Marks.setPreviousPosition();
    mostRecentQuery = settings.values.findModeRawQuery;
    if (mostRecentQuery !== findModeQuery.rawQuery) {
      findModeQuery.rawQuery = mostRecentQuery;
      updateFindModeQuery();
    }
    query = findModeQuery.isRe ? getNextQueryFromRegexpMatches(backwards ? -1 : 1) : findModeQuery.parsedQuery;
    executeFind(query, {
      repeat: count,
      backwards: backwards,
      caseSensitive: !findModeQuery.ignoreCase
    });
    if (!findModeQueryHasResults) {
      HUD.showForDuration("No matches for '" + findModeQuery.rawQuery + "'", 1000);
      return;
    }
    focusFoundLink();
    // NOTE: this `if` should not be removed
    if (DomUtils.canTakeInput(findModeAnchorNode)) {
      handlerStack.push({
        keydown: function(event) {
          handlerStack.remove(this.handlerId);
          if (event.keyCode === KeyCodes.esc && KeyboardUtils.isPlain(event)) {
            InsertMode.lock = document.activeElement;
            DomUtils.simulateSelect(document.activeElement);
            return false;
          }
          return true;
        }
      });
    }
  };

  followLink = function(linkElement) {
    if (linkElement.nodeName.toLowerCase() === "link") {
      window.location.href = linkElement.href;
      return;
    }
    linkElement.scrollIntoViewIfNeeded();
    linkElement.focus();
    DomUtils.UI.flashOutline(linkElement);
    DomUtils.simulateClick(linkElement);
  };
  
  goBy = function(relName, pattern) {
    if (relName && typeof relName === "string" && goBy.findAndFollowRel(relName)) {
      return true;
    }
    pattern = typeof pattern === "string" && (pattern = pattern.trim())
      ? pattern.toLowerCase().split(/\s*,\s*/).filter(function(s) { return s.length;})
      : (pattern instanceof Array) ? pattern : [];
    if (pattern.length > 0) {
      goBy.findAndFollowLink(pattern);
    }
  };

  goBy.findAndFollowLink = function(linkStrings) {
    var boundingClientRect, candidateLinks, computedStyle, exactWordRe, link, linkString, links, linksXPath, _i, _j, _len, _len1;
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
      computedStyle = window.getComputedStyle(link);
      if (computedStyle.visibility !== "visible" || computedStyle.display === "none") {
        continue;
      }
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

  showFindModeHUDForQuery = function() {
    if (findModeQueryHasResults || !findModeQuery.parsedQuery) {
      HUD.show("/" + findModeQuery.rawQuery + " (" + findModeQuery.matchCount + " Matches)");
    } else {
      HUD.show("/" + findModeQuery.rawQuery + " (No Matches)");
    }
  };

  exitFindMode = function() {
    findMode = false;
    HUD.hide();
  };

  FrameMask = {
    more: false,
    node: null,
    timer: 0,
    timeout: 200,
    Focus: function(request) {
      if (DomUtils.isSandboxed()) {
        // Do not destroy self, just in case of Marks.goTo / ...
        setTimeout(ELs.onUnload, 20);
      }
      if (request.frameId === -1) {}
      else if (DomUtils.isSandboxed() || window.innerWidth < 3 || window.innerHeight < 3) {
        mainPort.port.postMessage({
          handler: "nextFrame",
          tabId: ELs.focusMsg.tabId,
          frameId: frameId
        });
        return;
      }
      window.focus();
      var _this = FrameMask, dom1;
      if (dom1 = _this.node) {
        _this.more = true;
      } else {
        dom1 = DomUtils.createElement("div");
        dom1.className = "R";
        dom1.id = "HighlightMask";
        DomUtils.UI.addElement(_this.node = dom1);
        _this.timer = setInterval(_this.Remove, _this.timeout);
      }
      dom1.style.borderColor = request.frameId !== -1 ? "yellow" : "lightsalmon";
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
    _element: null,
    opacity: 0,
    durationTimer: 0,
    showCopied: function(text) {
      if (text.startsWith("chrome-")) {
        text = text.substring(text.indexOf('/', text.indexOf('/') + 2));
      }
      if (text.length > 43) {
        text = text.substring(0, 40) + "...";
      }
      this.showForDuration("copy: " + text, 2000);
    },
    showForDuration: function(text, duration) {
      if (this.show(text)) {
        this.durationTimer = setTimeout(this.hide, duration, false);
      }
    },
    show: function(text) {
      if (!this.enabled()) {
        return false;
      }
      var el = this._element;
      if (!el) {
        el = DomUtils.createElement("div");
        el.className = "R";
        el.id = "HUD";
        el.style.opacity = 0;
        DomUtils.UI.addElement(this._element = el);
      } else if (this.durationTimer) {
        clearTimeout(this.durationTimer);
        this.durationTimer = 0;
      }
      el.innerText = text;
      el.style.visibility = "";
      if (!this.tweenId) {
        this.tweenId = setInterval(this.tween, 40);
      }
      this.opacity = 1;
      return true;
    },
    tween: function() {
      var hud = HUD, el = hud._element, opacity = +el.style.opacity;
      if (opacity !== hud.opacity) {
        opacity += opacity < hud.opacity ? 0.25 : -0.25;
        el.style.opacity = opacity;
        if (opacity !== hud.opacity) {
          return;
        }
      }
      if (opacity == 0) {
        el.style.visibility = "hidden";
        el.innerText = "";
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
      if (!(el = hud._element) || el.style.visibility === "hidden") {
        return;
      }
      if (immediate) {
        el.style.visibility = "hidden";
        el.innerText = "";
        el.style.opacity = 0;
      } else if (!hud.tweenId) {
        hud.tweenId = setInterval(hud.tween, 40);
      }
      hud.opacity = 0;
    },
    enabled: function() {
      return document.body && settings.values.hideHud === false;
    }
  };

  requestHandlers = {
    __proto__: null,
    checkIfEnabled: function() {
      mainPort.safePost({
        handler: "checkIfEnabled",
        frameId: frameId,
        tabId: ELs.focusMsg.tabId,
        url: window.location.href
      });
    },
    init: function(request) {
      var r = requestHandlers;
      ELs.focusMsg.tabId = request.tabId;
      r.refreshKeyMappings(request);
      KeyboardUtils.onMac = request.onMac;
      // here assume the changed url does not influence passKeys,
      // since we do not know when the url will become useful
      r.reset(request);
      r.init = null;
    },
    reset: function(request) {
      var passKeys = request.passKeys;
      if (isEnabledForUrl = (passKeys !== "")) {
        ELs.focusMsg.status = passKeys ? "partial" : "enabled";
        initIfEnabled(passKeys);
      } else {
        ELs.focusMsg.status = "disabled";
      }
      ELs.focusMsg.url = window.location.href;
    },
    settings: settings.ReceiveSettings,
    settingsUpdate: settings.OnUpdate,
    reg: function(request) {
      if (document.body && document.body.nodeName.toLowerCase() !== "frameset") {
        return mainPort.safePost({
          handlerSettings: request ? request.work : "reg",
          frameId: frameId
        });
      }
    },
    insertCSS: function(request) {
      var css = request.css;
      DomUtils.UI.insertCSS(css[0], css[1]);
    },
    focusFrame: FrameMask.Focus,
    refreshKeyMappings: function(request) {
      var arr = request.firstKeys, i = arr.length, map, key, sec, sec2;
      map = firstKeys = Utils.makeNullProto();
      while (0 <= --i) {
        map[arr[i]] = true;
      }
      sec = request.secondKeys;
      Utils.setNullProto(sec);
      sec2 = secondKeys = Utils.makeNullProto();
      for (key in sec) {
        arr = sec[key];
        map = sec2[key] = Utils.makeNullProto();
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
    refreshTabId: function(request) {
      ELs.focusMsg.tabId = request.tabId;
      mainPort.port.postMessage({
        handler: "refreshTabId",
        tabId: request.tabId
      });
    },
    execute: function(request) {
      keyQueue = false;
      currentSeconds = secondKeys[""];
      var components = request.command.split('.'), obj = Commands, _i, _len;
      for (_i = 0, _len = components.length - 1; _i < _len; _i++) {
        obj = obj[components[_i]];
      }
      obj[components[_len]](request.count, request.options);
    },
    dispatchCommand: function(request) {
      if (!isEnabledForUrl) {
        request.args.push(true);
        mainPort.sendCommadToFrame(request.source, request.command, request.args);
        return;
      }
      var components = request.command.split('.'), obj = Commands, _i, _len;
      for (_i = 0, _len = components.length - 1; _i < _len; _i++) {
        obj = obj[components[_i]];
      }
      obj[components[_len]].apply(obj, request.args);
    },
    createMark: Marks.CreateGlobalMark,
    scroll: Marks.Goto,
    showHUD: function(request) {
      HUD.showForDuration(request.text, request.time);
    },
    showCopied: function(request) {
      HUD.showCopied(request.text);
    },
    showHelpDialog: null
  };

  requestHandlers.showHelpDialog = function(response) {
    var container, handlerId, oldShowHelp, hide, node1, //
    showAdvancedCommands, shouldShowAdvanced = response.advanced === true;
    if (!document.body) {
      return;
    }
    container = DomUtils.createElement("div");
    if (!container.style) {
      Commands.showHelp = requestHandlers.showHelpDialog = function() {};
      return;
    }
    container.innerHTML = response.html;
    container = container.firstElementChild;
    DomUtils.UI.addElement(container);
    container.addEventListener("mousewheel", DomUtils.SuppressPropagation);
    container.addEventListener("click", DomUtils.SuppressPropagation);

    hide = function() {
      handlerStack.remove(handlerId);
      container.remove();
      Commands.showHelp = oldShowHelp;
      container = null;
      delete settings.onDestroy.helpDialog;
    };
    showAdvancedCommands = function(visible) {
      var advancedEls, el, _i, _len;
      container.querySelector("#AdvancedCommands").innerHTML = visible
        ? "Hide advanced commands" : "Show advanced commands...";
      advancedEls = container.getElementsByClassName("HelpAdvanced");
      visible = visible ? "" : "none";
      for (_i = 0, _len = advancedEls.length; _i < _len; _i++) {
        el = advancedEls[_i];
        el.style.display = visible;
      }
    };
    
    settings.onDestroy.helpDialog = hide;
    oldShowHelp = Commands.showHelp;
    container.querySelector("#AdvancedCommands").onclick = function() {
      shouldShowAdvanced = !shouldShowAdvanced;
      showAdvancedCommands(shouldShowAdvanced);
      settings.set("showAdvancedCommands", shouldShowAdvanced);
    };
    container.querySelector("#CloseButton").onclick = Commands.showHelp = hide;
    node1 = container.querySelector("#OptionsPage");
    if (! window.location.href.startsWith(response.optionUrl)) {
      node1.href = response.optionUrl;
      node1.onclick = function(event) {
        mainPort.port.postMessage({ handler: "focusOrLaunch", url: this.href });
        hide();
        DomUtils.suppressEvent(event);
      };
    } else {
      node1.remove();
    }
    showAdvancedCommands(shouldShowAdvanced);
    node1 = container.querySelector("#HelpDialog");
    window.focus();
    Scroller.current = node1;
    handlerId = handlerStack.push({
      keydown: function(event) {
        if (event.keyCode === KeyCodes.esc && !VInsertMode.lock
            && KeyboardUtils.isPlain(event)) {
          hide();
          return false;
        }
        return true;
      }
    });
  };


  mainPort.connect();

  settings.load({
    handler: "init",
    focused: document.hasFocus(), // .hasFocus has a time cost less than 0.8 us
    url: window.location.href
  }, function(request) {
    request.focused = document.hasFocus();
    request.url = window.location.href;
    if (document.readyState !== "loading") {
      requestHandlers.reg({name: "doreg"});
    }
  });

  DomUtils.DocumentReady(function() {
    // NOTE: when port is disconnected:
    // * if backend asks to re-reg, then rH.reg will call safePost;
    // * if extension is stopped, then ELs.destroy is called when focused,
    // so, only being removed without pre-focusing and before a "rereg" message
    //   may meet a null port
    ELs.onUnload = function() {
      var ref;
      try {
        (ref = mainPort.port) && ref.postMessage({
          handlerSettings: "unreg",
          frameId: frameId,
          tabId: ELs.focusMsg.tabId
        });
      } catch (e) {}
    };
    if (isInjected || requestHandlers.reg()) {
      return;
    }
    window.onunload = ELs.onUnload;
    // NOTE: here, we should always postMessage, since
    //     NO other message will be sent if not isEnabledForUrl,
    // which would make the auto-destroy logic not work.
    ELs.onWndFocus = mainPort.safePost.bind(
      mainPort, ELs.focusMsg, null, null //
    );
  });

  ELs.onMessage = function(request, id) {
    id = request.frameId;
    if (id === undefined || id === frameId) {
      if (!mainPort.port) {
        mainPort.connect();
      }
      requestHandlers[request.name](request); // do not check `handler != null`
    }
  };
  if (isInjected) {
    settings.RequestHandlers = requestHandlers;
    settings.ELs = ELs;
    settings.Commands = Commands;
  } else {
    chrome.runtime.onMessage.addListener(ELs.onMessage);
  }

  ELs.destroy = function() {
    isEnabledForUrl = false;
    if (!isInjected) {
      window.onunload = null;
    }
    window.removeEventListener("keydown", this.onKeydown, true);
    window.removeEventListener("keypress", this.onKeypress, true);
    window.removeEventListener("keyup", this.onKeyup, true);
    window.removeEventListener("focus", this.onFocus, true);
    window.removeEventListener("blur", this.onBlur, true);
    window.removeEventListener("mousedown", InsertMode.exitGrab, true);
    document.removeEventListener("DOMActivate", this.onActivate, true);
    document.removeEventListener("webkitfullscreenchange", DomUtils.UI.Adjust);
    DomUtils.UI.container && DomUtils.UI.container.remove();

    clearInterval(settings.isLoading);
    clearInterval(FrameMask.timer);
    clearInterval(HUD.tweenId);
    clearTimeout(HUD.durationTimer);

    var ref = settings.onDestroy, i;
    Utils.setNullProto(ref);
    for (i in ref) {
      ref[i].call(this);
    }
    Utils = KeyCodes = KeyboardUtils = DomUtils = VRect = handlerStack = //
    LinkHints = Vomnibar = Scroller = Marks = //
    Settings = VHUD = MainPort = VInsertMode = null;

    console.log("%cVimium++ %c#%d%c in %c%s%c has destroyed at %o." //
      , "color:red", "color:blue", frameId, "color:auto"
      , "color:darkred", location.pathname.replace(/^.*\/([^\/]+)\/?$/, "$1")
      , "color:auto", Date.now()
    );

    if (!isInjected) {
      window.frameId = frameId;
      // only the below may throw errors
      try {
        chrome.runtime.onMessage.removeListener(this.onMessage);
      } catch (e) {}
      chrome = null;
    }
  };
})();