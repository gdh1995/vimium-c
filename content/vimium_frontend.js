"use strict";
(function() {
  var HUD, firstKeys, secondKeys, currentSeconds //
    , enterInsertModeWithoutShowingIndicator, executeFind, exitFindMode //
    , exitInsertMode, findAndFocus, findMode, findChangeListened //
    , findModeAnchorNode, findModeQuery, findModeQueryHasResults, focusFoundLink, followLink //
    , frameId, getNextQueryFromRegexMatches, handleDeleteForFindMode //
    , handleEnterForFindMode, handleEscapeForFindMode, handleKeyCharForFindMode, KeydownEvents //
    , /* CursorHider, */ ELs //
    , initializeWhenEnabled, insertModeLock //
    , isEnabledForUrl, isInsertMode //
    , checkValidKey, getFullCommand, keyQueue //
    , setPassKeys, performFindInPlace //
    , restoreDefaultSelectionHighlight //
    , settings, showFindModeHUDForQuery, textInputXPath, oldActivated //
    , updateFindModeQuery, goBy, getVisibleInputs, mainPort, requestHandlers //
    ;
  
  frameId = window.top === window ? 0 : Math.floor(Math.random() * 9999997) + 2;

  insertModeLock = null;

  findMode = false;
  
  findChangeListened = 0;

  findModeQuery = {
    rawQuery: "",
    matchCount: 0,
    parsedQuery: "",
    isRegex: false,
    ignoreCase: false,
    activeRegexIndex: 0,
    regexMatches: null
  };

  findModeQueryHasResults = false;

  findModeAnchorNode = null;

  isEnabledForUrl = false;

  keyQueue = false;

  firstKeys = {};

  secondKeys = {"": {}};

  currentSeconds = {};
  
  oldActivated = {
    target: null,
    isSecond: false
  };

  textInputXPath = DomUtils.makeXPath([
    'input[not(@disabled or @readonly) and (@type="text" or @type="search" or @type="email" \
or @type="url" or @type="number" or @type="password" or @type="date" or @type="tel" or not(@type))]',
    "textarea",
    "*[@contenteditable='' or translate(@contenteditable, 'TRUE', 'true')='true']"
  ]);
  
  mainPort = {
    _port: null,
    _callbacks: {},
    postMessage: function(request, callback) {
      if (callback) {
        request = {
          _msgId: Utils.createUniqueId(),
          request: request
        };
      }
      this._get().postMessage(request);
      if (callback) {
        this._callbacks[request._msgId] = callback;
      }
      return callback ? request._msgId : 0;
    },
    Listener: function(response) {
      var id, handler;
      if (id = response._msgId) {
        handler = mainPort._callbacks[id];
        delete mainPort._callbacks[id];
        handler(response.response, id);
      } else {
        requestHandlers[response.name](response);
      }
    },
    ClearPort: function() {
      mainPort._port = null;
    },
    _get: function() {
      var port;
      if (port = this._port) {
        return port;
      }
      port = this._port = chrome.runtime.connect("hfjbmagddngcpeloejdejnfgbamkjaeg", { name: "vimium++" });
      port.onDisconnect.addListener(this.ClearPort);
      port.onMessage.addListener(this.Listener);
      return port;
    }
  };

  settings = {
    values: null,
    isLoading: 0,
    ondestroy: {},
    set: function(key, value) {
      this.values[key] = value;
      mainPort.postMessage({
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
      mainPort.postMessage(request);
      this.isLoading = setInterval(function() {
        try {
          if (onerror) { onerror(request.request); }
          mainPort.postMessage(request);
        } catch (e) {
          ELs.destroy();
        }
      }, 2000);
    },
    ReceiveSettings: function(response) {
      var _this = settings, ref, i;
      if (ref = response.load) {
        _this.values = ref;
      } else {
        extend(_this.values, response.values);
      }
      if (i = _this.isLoading) {
        clearInterval(i);
        _this.isLoading = 0;
      }
      if (response = response.response) {
        requestHandlers[response.name](response);
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
    }, css: null, //
    onKeydown: null, onKeypress: null, onKeyup: null, //
    docOnFocus: null, onBlur: null, onActivate: null, //
    destroy: null //
  };

  initializeWhenEnabled = function(newPassKeys) {
    (initializeWhenEnabled = setPassKeys)(newPassKeys);
    LinkHints.init();
    Scroller.init();
    // CursorHider.init();
    window.addEventListener("keydown", ELs.onKeydown, true);
    window.addEventListener("keypress", ELs.onKeypress, true);
    window.addEventListener("keyup", ELs.onKeyup = function(event) {
      if (isEnabledForUrl) {
        var handledKeydown = KeydownEvents.pop(event);
        if (handlerStack.bubbleEvent("keyup", event) && handledKeydown) {
          DomUtils.suppressPropagation(event);
        }
      }
    }, true);
    // it seems window.addEventListener("focus") doesn't work (only now).
    document.addEventListener("focus", ELs.docOnFocus = function(event) {
      if (isEnabledForUrl && DomUtils.getEditableType(event.target) && !findMode) {
        enterInsertModeWithoutShowingIndicator(event.target);
        // it seems we do not need to check DomUtils.getEditableType(event.target) >= 2
        if (!oldActivated.target || oldActivated.isSecond) {
          oldActivated.target = event.target;
          oldActivated.isSecond = true;
        }
      }
    }, true);
    document.addEventListener("blur", ELs.onBlur = function(event) {
      if (isEnabledForUrl && DomUtils.getEditableType(event.target)) {
        exitInsertMode(event.target);
      }
    }, true);
    document.addEventListener("DOMActivate", ELs.onActivate = function(event) {
      if (isEnabledForUrl) {
        handlerStack.bubbleEvent("DOMActivate", event);
      }
    }, true);
    if (document.activeElement && DomUtils.getEditableType(document.activeElement) >= 2 && !findMode) {
      enterInsertModeWithoutShowingIndicator(document.activeElement);
    }
  };

  extend(window, {
    scrollToBottom: function() {
      Scroller.scrollTo("y", "max");
    },
    scrollToTop: function() {
      Scroller.scrollTo("y", 0);
    },
    scrollToLeft: function() {
      Scroller.scrollTo("x", 0);
    },
    scrollToRight: function() {
      Scroller.scrollTo("x", "max");
    },
    scrollUp: function(count) {
      Scroller.scrollBy("y", -count * (settings.values.scrollStepSize || 100));
    },
    scrollDown: function(count) {
      Scroller.scrollBy("y", count * (settings.values.scrollStepSize || 100));
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
      Scroller.scrollBy("x", -count * (settings.values.scrollStepSize || 60));
    },
    scrollRight: function(count) {
      Scroller.scrollBy("x", count * (settings.values.scrollStepSize || 60));
    },

    reload: function() {
      window.location.reload();
    },
    switchFocus: function() {
      var newEl = document.activeElement;
      if (newEl !== document.body) {
        oldActivated.target = newEl;
        oldActivated.isSecond = false;
        if (newEl && newEl.blur) {
          newEl.blur();
        }
        return;
      }
      newEl = oldActivated.target;
      if (!newEl || !DomUtils.isVisibile(newEl)) {
        return;
      }
      document.activeElement = newEl;
      oldActivated.target = null;
      if (newEl.scrollIntoViewIfNeeded) {
        newEl.scrollIntoViewIfNeeded();
      } else if (newEl.scrollIntoView) {
        newEl.scrollIntoView();
      }
      DomUtils.SimulateHover(newEl);
      if (newEl.focus) {
        newEl.focus();
      }
    },
    simBackspace: function() {
      var el = document.activeElement;
      if (el && el === document.body) {
        switchFocus();
      } else if (!DomUtils.isVisibile(el) || DomUtils.getEditableType(el) < 2) {
        return;
      }
      DomUtils.simulateBackspace(el);
    },
    goBack: function(count) {
      history.go(-count);
    },
    goForward: function(count) {
      history.go(count);
    },
    goUp: function(count) {
      var url, urlsplit;
      url = window.location.href;
      if (url[url.length - 1] === "/") {
        url = url.substring(0, url.length - 1);
      }
      urlsplit = url.split("/");
      if (urlsplit.length > 3) {
        urlsplit = urlsplit.slice(0, Math.max(3, urlsplit.length - count));
        window.location.href = urlsplit.join('/');
      }
    },
    goToRoot: function() {
      window.location.href = window.location.origin;
    },
    showHelp: function(_0, force_current) {
      if (window.top !== window && !force_current) {
        sendMessageToFrames(0, "showHelp", [1, true]);
        return;
      }
      mainPort.postMessage({
        handler: "initHelp",
      }, showHelpDialog);
    },
    autoCopy: function() {
      var sel = document.getSelection(), str;
      if (sel.type !== "Range" || !(str = sel.toString().trim())) {
        mainPort.postMessage({
          handler: "copyCurrentUrl"
        });
        return;
      }
      mainPort.postMessage({
        handler: "copyToClipboard",
        data: str
      });
      HUD.showCopied(str);
    },
    autoSearch: function() {
      var sel = document.getSelection(), str;
      if (sel.type !== "Range" || !(str = sel.toString().trim())) {
        HUD.showForDuration("No text found!", 1000);
        return;
      }
      mainPort.postMessage({
        handler: "openUrlInNewTab",
        url: str
      });
    },
    focusInput: function(count) {
      var hintContainingDiv, hints, selectedInputIndex, visibleInputs;
      visibleInputs = getVisibleInputs(DomUtils.evaluateXPath(textInputXPath, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE));
      if (visibleInputs.length === 0) {
        return;
      }
      selectedInputIndex = Math.min(count - 1, visibleInputs.length - 1);
      DomUtils.simulateSelect(visibleInputs[selectedInputIndex].element);
      if (visibleInputs.length === 1) {
        return;
      }
      hints = visibleInputs.map(function(tuple) {
        var hint = document.createElement("div");
        hint.className = "vimB vimI vimIH";
        hint.style.left = (tuple.rect[0] - 1) + "px";
        hint.style.top = (tuple.rect[1] - 1) + "px";
        hint.style.width = (tuple.rect[2] - tuple.rect[0]) + "px";
        hint.style.height = (tuple.rect[3] - tuple.rect[1]) + "px";
        return hint;
      });
      hints[selectedInputIndex].classList.add('vimS');
      hintContainingDiv = DomUtils.addElementList(hints, {
        id: "vimIMC",
        className: "vimB vimR"
      });
      hintContainingDiv.style.left = window.scrollX + "px";
      hintContainingDiv.style.top = window.scrollY + "px";
      handlerStack.push({
        keydown: function(event) {
          if (event.keyCode === KeyCodes.tab) {
            hints[selectedInputIndex].classList.remove('vimS');
            if (event.shiftKey) {
              if (--selectedInputIndex === -1) {
                selectedInputIndex = hints.length - 1;
              }
            } else if (++selectedInputIndex === hints.length) {
              selectedInputIndex = 0;
            }
            hints[selectedInputIndex].classList.add('vimS');
            DomUtils.simulateSelect(visibleInputs[selectedInputIndex].element);
          } else if (event.keyCode !== KeyCodes.shiftKey) {
            DomUtils.removeNode(hintContainingDiv);
            handlerStack.remove();
            return true;
          }
          return false;
        }
      });
    }
  });

  KeydownEvents = {
    _handledEvents: {},
    stringify: function(event) {
      return (event.metaKey + event.altKey * 2 + event.ctrlKey * 4) + "" //
         + event.keyCode + event.keyIdentifier;
    },
    push: function(event) {
      this._handledEvents[this.stringify(event)] = true;
    },
    pop: function(event) {
      var key = this.stringify(event), value = this._handledEvents[key];
      delete this._handledEvents[key];
      return value;
    }
  };

  ELs.onKeypress = function(event) {
    if (!isEnabledForUrl || !handlerStack.bubbleEvent("keypress", event) || event.keyCode < 32) {
      return;
    }
    var keyChar = String.fromCharCode(event.charCode);
    if (!keyChar) {
      return;
    }
    // it seems event can not be <a/c/m-*>
    if (findMode) {
      handleKeyCharForFindMode(keyChar);
      DomUtils.suppressEvent(event);
    } else if (isInsertMode()) {
    } else if (checkValidKey(keyChar)) { // keyChar is just the full command
      DomUtils.suppressEvent(event);
    }
  };

  ELs.onKeydown = function(event) {
    if (!isEnabledForUrl) {
      return;
    } else if (!handlerStack.bubbleEvent("keydown", event)) {
      KeydownEvents.push(event);
      return;
    }
    var keyChar, key = event.keyCode, action = 0;
    if (isInsertMode()) {
      if (key === KeyCodes.esc) {
        if (KeyboardUtils.isPlain(event)) {
          if (DomUtils.getEditableType(event.srcElement)) {
            event.srcElement.blur();
          }
          exitInsertMode();
          action = 2;
        }
      // TODO: insert mode: active or passive ?
      } else if (key >= KeyCodes.f1 && key <= KeyCodes.f12) {
        keyChar = getFullCommand(event, KeyboardUtils.getKeyName(event));
        action = checkValidKey(keyChar);
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
      } else if (event.metaKey || event.ctrlKey || event.altKey) {
      } else if (event.keyIdentifier.startsWith("U+")) {
        action = 1;
      } else if (! (key in KeyboardUtils.keyNames)) {
        action = 1;
      }
    }
    else if (key === KeyCodes.esc) {
      if (keyQueue && KeyboardUtils.isPlain(event)) {
        mainPort.postMessage({ handler: "esc" });
        keyQueue = false;
        currentSeconds = secondKeys[""];
        action = 2;
      }
    } else if (!(keyChar = KeyboardUtils.getKeyChar(event))) {
    }
    else if ((key >= 32 && (event.metaKey || event.ctrlKey || event.altKey)) //
          || ! event.keyIdentifier.startsWith("U+")) {
      keyChar = getFullCommand(event, keyChar);
      action = checkValidKey(keyChar);
    } else if (checkValidKey(keyChar, true)) { // keyChar is just the full command
      action = 1;
    }
    if (action <= 0) {
      return;
    }
    if (action === 2) {
      DomUtils.suppressEvent(event);
    } else {
      DomUtils.suppressPropagation(event);
    }
    KeydownEvents.push(event);
  };

  (function() {
    var passKeys;
    setPassKeys = function(newPassKeys) {
      var passStr;
      if (passStr = newPassKeys) {
        var arr = newPassKeys.split(' '), _i;
        passKeys = {};
        passKeys.__proto__ = null;
        for (_i = arr.length; 0 <= --_i; ) {
          passKeys[arr[_i]] = true;
        }
      } else {
        passKeys = null;
      }
    };
    checkValidKey = function(key, noPost) {
      if (keyQueue) {
        if ((key in firstKeys) || (key in currentSeconds)) {
        } else {
          mainPort.postMessage({ handler: "esc" });
          keyQueue = false;
          currentSeconds = secondKeys[""];
          return 0;
        }
      } else if (passKeys && (key in passKeys) || !(key in firstKeys)) {
        return 0;
      }
      if (!noPost) {
        mainPort.postMessage({ handlerKey: key });
      }
      return 2;
    };
  })();

  getFullCommand = function(event, keyChar) {
    var left = event.altKey ? "<a-" : "<";
    if (event.ctrlKey) {
      return left + (event.metaKey ? "c-m-" : "c-") + keyChar + ">";
    } else if (event.metaKey) {
      return left + "m-" + keyChar + ">";
    } else if (event.altKey || keyChar.length > 1) {
      return left + keyChar + ">";
    } else {
      return keyChar;
    }
  };

  window.enterInsertMode = function(target) {
    enterInsertModeWithoutShowingIndicator(target);
    HUD.show("Insert mode");
  };

  enterInsertModeWithoutShowingIndicator = function(target) {
    insertModeLock = target;
  };

  exitInsertMode = function(target) {
    if (target === undefined || insertModeLock === target) {
      insertModeLock = null;
      HUD.hide();
    }
  };

  isInsertMode = function() {
    if (insertModeLock !== null) {
      return true;
    }
    var el = document.activeElement;
    if (el && el.isContentEditable) {
      enterInsertModeWithoutShowingIndicator(el);
      return true;
    }
    return false;
  };

  getVisibleInputs = function(pathSet) {
    for (var element, rect, results = [], i = 0, _ref = pathSet.snapshotLength; i < _ref; ++i) {
      element = pathSet.snapshotItem(i);
      rect = DomUtils.getVisibleClientRect(element);
      if (rect) {
        results.push({
          element: element,
          rect: rect
        });
      }
    }
    return results;
  };
  
  updateFindModeQuery = function() {
    var error, escapeRegEx, hasNoIgnoreCaseFlag, parsedNonRegexQuery, pattern, text, _ref;
    findModeQuery.isRegex = settings.values.regexFindMode ? true : false;
    hasNoIgnoreCaseFlag = false;
    findModeQuery.parsedQuery = findModeQuery.rawQuery.replace(/\\./g, function(match) {
      switch (match) {
        case "\\r":
          findModeQuery.isRegex = true;
          return "";
        case "\\R":
          findModeQuery.isRegex = false;
          return "";
        case "\\I":
          hasNoIgnoreCaseFlag = true;
          return "";
        case "\\\\":
          return "\\";
        default:
          return match;
      }
    });
    findModeQuery.ignoreCase = !hasNoIgnoreCaseFlag && !Utils.hasUpperCase(findModeQuery.parsedQuery);
    if (findModeQuery.isRegex) {
      try {
        pattern = new RegExp(findModeQuery.parsedQuery, "g" + (findModeQuery.ignoreCase ? "i" : ""));
      } catch (_error) {
        error = _error;
        return;
      }
      text = document.documentElement.innerText;
      findModeQuery.regexMatches = text.match(pattern);
      findModeQuery.activeRegexIndex = 0;
      findModeQuery.matchCount = (findModeQuery.regexMatches || []).length;
    } else {
      escapeRegEx = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
      parsedNonRegexQuery = findModeQuery.parsedQuery.replace(escapeRegEx, function(ch) {
        return "\\" + ch;
      });
      pattern = new RegExp(parsedNonRegexQuery, "g" + (findModeQuery.ignoreCase ? "i" : ""));
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
      DomUtils.simulateSelect(document.activeElement);
      enterInsertModeWithoutShowingIndicator(document.activeElement);
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
    // document.body.classList.add("vimFindMode");
    settings.set("findModeRawQuery", findModeQuery.rawQuery);
  };

  performFindInPlace = function() {
    var cachedScrollX = window.scrollX, cachedScrollY = window.scrollY
      , query = findModeQuery.isRegex ? getNextQueryFromRegexMatches(0) : findModeQuery.parsedQuery;
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
    findMode = true;
    // document.body.classList.add("vimFindMode");
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
    findModeAnchorNode = document.getSelection().anchorNode;
  };

  restoreDefaultSelectionHighlight = function() {
    // document.body.classList.remove("vimFindMode");
    document.removeEventListener("selectionchange", restoreDefaultSelectionHighlight, true);
    if (findChangeListened) {
      clearTimeout(findChangeListened);
      findChangeListened = 0;
    }
  };

  focusFoundLink = function() {
    if (findModeQueryHasResults) {
      var link, node = window.getSelection().anchorNode;
      while (node && node !== document.body) {
        if (node.nodeName.toLowerCase() === "a") {
          node.focus();
          return;
        }
        node = node.parentNode;
      }
    }
  };

  getNextQueryFromRegexMatches = function(stepSize) {
    var totalMatches;
    if (!findModeQuery.regexMatches) {
      return "";
    }
    totalMatches = findModeQuery.regexMatches.length;
    findModeQuery.activeRegexIndex += stepSize + totalMatches;
    findModeQuery.activeRegexIndex %= totalMatches;
    return findModeQuery.regexMatches[findModeQuery.activeRegexIndex];
  };

  findAndFocus = function(count, backwards) {
    var mostRecentQuery, query;
    mostRecentQuery = settings.values.findModeRawQuery || "";
    if (mostRecentQuery !== findModeQuery.rawQuery) {
      findModeQuery.rawQuery = mostRecentQuery;
      updateFindModeQuery();
    }
    query = findModeQuery.isRegex ? getNextQueryFromRegexMatches(backwards ? -1 : 1) : findModeQuery.parsedQuery;
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
          handlerStack.remove();
          if (event.keyCode === KeyCodes.esc && KeyboardUtils.isPlain(event)) {
            DomUtils.simulateSelect(document.activeElement);
            enterInsertModeWithoutShowingIndicator(document.activeElement);
            return false;
          }
          return true;
        }
      });
    }
  };

  window.performFind = function(count) {
    findAndFocus(count);
  };

  window.performBackwardsFind = function(count) {
    findAndFocus(count, true);
  };

  followLink = function(linkElement) {
    if (linkElement.nodeName.toLowerCase() === "link") {
      window.location.href = linkElement.href;
    } else {
      linkElement.scrollIntoView();
      linkElement.focus();
      DomUtils.simulateClick(linkElement, {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false
      });
    }
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
    var boundingClientRect, candidateLinks, computedStyle, exactWordRegex, link, linkString, links, linksXPath, _i, _j, _len, _len1;
    linksXPath = DomUtils.makeXPath(["a", "*[@onclick or @role='link' or contains(@class, 'button')]"]);
    links = DomUtils.evaluateXPath(linksXPath, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    candidateLinks = [];
    _len = links.snapshotLength;
    while (0 <= --_len) {
      link = links.snapshotItem(_len);
      boundingClientRect = link.getBoundingClientRect();
      if (boundingClientRect.width === 0 || boundingClientRect.height === 0) {
        continue;
      }
      computedStyle = window.getComputedStyle(link, null);
      if (computedStyle.getPropertyValue("visibility") !== "visible" || computedStyle.getPropertyValue("display") === "none") {
        continue;
      }
      linkString = link.innerText.toLowerCase();
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
      link.wordCount = link.innerText.trim().split(/\s+/).length;
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
      exactWordRegex = /\b/.test(linkString[0]) || /\b/.test(linkString[linkString.length - 1]) ? new RegExp("\\b" + linkString + "\\b", "i") : new RegExp(linkString, "i");
      for (_j = 0, _len1 = candidateLinks.length; _j < _len1; _j++) {
        link = candidateLinks[_j];
        if (exactWordRegex.test(link.innerText)) {
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

  window.goPrevious = function() {
    goBy("prev", settings.values.previousPatterns || "");
  };

  window.goNext = function() {
    goBy("next", settings.values.nextPatterns || "");
  };

  showFindModeHUDForQuery = function() {
    if (findModeQueryHasResults || !findModeQuery.parsedQuery) {
      HUD.show("/" + findModeQuery.rawQuery + " (" + findModeQuery.matchCount + " Matches)");
    } else {
      HUD.show("/" + findModeQuery.rawQuery + " (No Matches)");
    }
  };

  window.enterFindMode = function() {
    findModeQuery.rawQuery = "";
    findMode = true;
    HUD.show("/");
  };

  exitFindMode = function() {
    findMode = false;
    HUD.hide();
  };

  window.showHelpDialog = function(response) {
    var container, handlerId, oldShowHelp, hide, toggleAdvancedCommands, //
    showAdvancedCommands, shouldShowAdvanced = response.advanced === true;
    if (!document.body) {
      return;
    }
    container = document.createElement("div");
    if (!container.style) {
      window.showHelp = window.showHelpDialog = function() {};
      return;
    }
    container.id = "vimHelpDialogContainer";
    container.className = "vimB vimR";
    document.documentElement.appendChild(container);
    container.addEventListener("mousewheel", DomUtils.suppressPropagation, false);
    container.innerHTML = response.html;

    hide = function(event) {
      handlerStack.remove(handlerId);
      DomUtils.removeNode(container);
      window.showHelp = oldShowHelp;
      settings.ondestroy.helpDialog = null;
      if (event) {
        DomUtils.suppressEvent(event);
      }
      container.innerHTML = "";
      container = null;
    };
    toggleAdvancedCommands = function(event) {
      shouldShowAdvanced = !shouldShowAdvanced;
      showAdvancedCommands(shouldShowAdvanced);
      settings.set("showAdvancedCommands", shouldShowAdvanced);
      DomUtils.suppressEvent(event);
    };
    showAdvancedCommands = function(visible) {
      var advancedEls, el, _i, _len;
      document.getElementById("vimAdvancedCommands").innerHTML = visible ? "Hide advanced commands" : "Show advanced commands...";
      advancedEls = container.getElementsByClassName("vimHelpAdvanced");
      visible = visible ? "table-row" : "none";
      for (_i = 0, _len = advancedEls.length; _i < _len; _i++) {
        el = advancedEls[_i];
        el.style.display = visible;
      }
    };
    
    settings.ondestroy.helpDialog = hide;
    oldShowHelp = window.showHelp;
    document.getElementById("vimAdvancedCommands").addEventListener("click" //
      , toggleAdvancedCommands, false);
    document.getElementById("vimCloseButton").addEventListener("click" //
      , window.showHelp = hide, false);
    if (! window.location.href.startsWith("chrome-extension://hfjbmagddngcpeloejdejnfgbamkjaeg/pages/options.html")) {
      document.getElementById("vimOptionsPage").addEventListener("click", function(event) {
        mainPort.postMessage({
          handler: "openRawUrl",
          url: "/pages/options.html"
        });
        hide(event);
      }, false);
    } else {
      DomUtils.removeNode(document.getElementById("vimOptionsPage"));
    }
    document.getElementById("vimHelpDialog").style.maxHeight = window.innerHeight - 80;
    showAdvancedCommands(shouldShowAdvanced);
    window.focus();
    container.querySelector(".vimHelpTr").click();
    handlerId = handlerStack.push({
      keydown: function(event) {
        if (event.keyCode === KeyCodes.esc && KeyboardUtils.isPlain(event)) {
          hide(event);
          return false;
        }
        return true;
      }
    });
  };

  HUD = {
    _tweenId: 0,
    _element: null,
    opacity: 0,
    _durationTimer: 0,
    showCopied: function(text) {
      if (text.startsWith("chrome-ext")) {
        text = text.substring(text.indexOf('/', text.indexOf('/') + 2));
      }
      if (text.length > 43) {
        text = text.substring(0, 40) + "...";
      }
      this.showForDuration("copy: " + text, 2000);
    },
    showForDuration: function(text, duration) {
      if (this.show(text)) {
        this._durationTimer = setTimeout(this.hide, duration, false);
      }
    },
    show: function(text) {
      if (!this.enabled()) {
        return false;
      }
      var el = this._element;
      if (!el) {
        el = document.createElement("div");
        if (!el.style) {
          this.enabled = function() { return false; }
          return false;
        }
        el.className = "vimB vimR";
        el.id = "vimHUD";
        el.style.opacity = "0";
        document.documentElement.appendChild(this._element = el);
      } else if (this._durationTimer) {
        clearTimeout(this._durationTimer);
        this._durationTimer = 0;
      }
      el.innerText = text;
      el.style.display = "";
      if (!this._tweenId) {
        this._tweenId = setInterval(this.tween, 40);
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
        el.style.display = "none";
        el.innerText = "";
      }
      clearInterval(hud._tweenId);
      hud._tweenId = 0;
    },
    hide: function(immediate) {
      var hud = HUD, el;
      if (hud._durationTimer) {
        clearTimeout(hud._durationTimer);
        hud._durationTimer = 0;
      }
      if (!(el = hud._element) || el.style.display === "none") {
        return;
      }
      if (immediate) {
        el.style.display = "none";
        el.innerText = "";
        el.style.opacity = 0;
      } else if (!hud._tweenId) {
        hud._tweenId = setInterval(hud.tween, 40);
      }
      hud.opacity = 0;
    },
    enabled: function() {
      return document.body && settings.values.hideHud === false;
    },
    destroy: function() {
      clearInterval(this._tweenId);
      clearTimeout(this._durationTimer);
      this._element && DomUtils.removeNode(this._element);
      HUD = null;
    }
  };

  window.settings = settings;

  window.HUD = HUD;

  window.mainPort = mainPort;

  requestHandlers = {
    checkIfEnabled: function() {
      mainPort.postMessage({
        handler: "checkIfEnabled",
        url: window.location.href
      }, requestHandlers.setPassKeys);
    },
    ifEnabled: function(response) {
      ELs.focusMsg.tabId = response.tabId;
      requestHandlers.refreshKeyMappings(response);
      requestHandlers.refreshKeyQueue(response);
      requestHandlers.setPassKeys(response.passKeys);
    },
    setPassKeys: function(passKeys) {
      if (isEnabledForUrl = (passKeys !== "")) {
        ELs.focusMsg.status = passKeys ? "partial" : "enabled";
        initializeWhenEnabled(passKeys);
      } else {
        ELs.focusMsg.status = "disabled";
      }
    },
    settings: settings.ReceiveSettings,
    reRegisterFrame: function(request) {
      if (document.body && document.body.nodeName.toLowerCase() !== "frameset") {
        mainPort.postMessage({
          handlerSettings: request ? request.work : "reg",
          frameId: frameId
        });
      }
    },
    registerFrame: function(request) {
      // reRegisterFrame is called only when document.ready
      var css = ELs.css = document.createElement("style");
      css.id = "vimUserCss";
      css.type = "text/css";
      css.innerHTML = request.css;
      document.head.appendChild(css);
    },
    showHUDforDuration: function(request) {
      HUD.showForDuration(request.text, request.duration);
    },
    focusFrame: function(request) {
      if (frameId !== request.frameId) {
        return;
      }
      if (window.onunload == null || window.innerWidth < 3 || window.innerHeight < 3) {
        mainPort.postMessage({
          handler: "nextFrame",
          tabId: ELs.focusMsg.tabId,
          frameId: frameId
        });
        if (window.onunload == null) {
          setTimeout(mainPort.postMessage.bind(mainPort, {
            handlerSettings: "unreg", // sandboxed
            frameId: frameId
          }, null), 20);
        }
        return;
      }
      window.focus();
      if (!settings.values.highlightTimer) {
        var dom1 = document.createElement("div");
        dom1.className = "vimB vimR";
        dom1.id = "vimHighlightMask";
        document.documentElement.appendChild(dom1);
      } else {
        clearTimeout(settings.values.highlightTimer);
      }
      settings.values.highlightTimer = setTimeout(requestHandlers.removeHighlightMask, 200);
    },
    removeHighlightMask: function() {
      var maskNode = document.getElementById("vimHighlightMask");
      if (maskNode) {
        DomUtils.removeNode(maskNode);
      }
      settings.values.highlightTimer = 0;
    },
    refreshKeyMappings: function(response) {
      var arr = response.firstKeys, i = arr.length, map, key, sec, sec2;
      map = firstKeys = {};
      map.__proto__ = null;
      while (0 <= --i) {
        map[arr[i]] = true;
      }
      sec = response.secondKeys;
      sec2 = secondKeys = {};
      sec2.__proto__ = null;
      for (key in sec) {
        arr = sec[key];
        map = sec2[key] = {};
        map.__proto__ = null;
        i = arr.length;
        while (0 <= --i) {
          map[arr[i]] = true;
        }
      }
    },
    refreshKeyQueue: function(response) {
      if (response.currentFirst !== null) {
        keyQueue = true;
        currentSeconds = secondKeys[response.currentFirst];
      } else {
        keyQueue = false;
        currentSeconds = secondKeys[""];
      }
    },
    esc: function() {
      keyQueue = false;
      currentSeconds = secondKeys[""];
    },
    executePageCommand: function(request) {
      keyQueue = false;
      currentSeconds = secondKeys[""];
      Utils.invokeCommandString(request.command, request.count);
    },
    dispatchMsg: function(request) {
      if (request.target != null && request.target !== frameId) {
        return;
      }
      if (!isEnabledForUrl) {
        sendMessageToFrames(request.source, request.command, request.args);
        return;
      }
      var components = request.command.split('.'), obj = window, _i, _len, _ref;
      for (_i = 0, _len = components.length - 1; _i < _len; _i++) {
        obj = obj[components[_i]];
      }
      obj[components[_len]].apply(obj, request.args);
    },
    setScrollPosition: function(request) {
      var scrollX = request.scroll[0], scrollY = request.scroll[1];
      if (scrollX > 0 || scrollY > 0) {
        DomUtils.DocumentReady(window.scrollTo.bind(window, scrollX, scrollY));
      }
    }
  };

  window.sendMessageToFrames = function(target, command, args) {
    mainPort.postMessage({
      handler: "dispatchMsg", tabId: ELs.focusMsg.tabId,
      target: target, source: frameId,
      command: command, args: args
    });
  };

  settings.load({
    handler: "initIfEnabled",
    focused: document.hasFocus(), // TODO: check if .hasFocus is too slow
    url: window.location.href
  }, function(request) {
    request.focused = document.hasFocus();
    if (document.readyState !== "loading") {
      requestHandlers.reRegisterFrame({
        work: "doreg"
      });
    }
  });

  DomUtils.DocumentReady(function() {
    requestHandlers.reRegisterFrame();
    window.onunload = function() {
      try {
        mainPort.postMessage({
          handlerSettings: "unreg",
          frameId: frameId
        });
      } catch (e) {
      }
    };
    // NOTE: here, we should always postMessage, since
    //     NO other message will be sent if not isEnabledForUrl,
    // which would make the auto-destroy logic not work.
    window.onfocus = (function() {
      try {
        this();
      } catch (e) {
        // this extension is reloaded
        ELs.destroy();
      }
    }).bind(mainPort.postMessage.bind( //
      mainPort, ELs.focusMsg, requestHandlers.refreshKeyQueue //
    ));
  });

  chrome.runtime.onMessage &&
  chrome.runtime.onMessage.addListener(function(request, handler) {
    if (isEnabledForUrl || request.frameId === 0) {
      requestHandlers[request.name](request); // do not check `handler != null`
    }
  });

  ELs.destroy = function() {
    isEnabledForUrl = false;
    try {
    window.onfocus = null;
    window.onunload = null;
    window.removeEventListener("keydown", this.onKeydown, true);
    window.removeEventListener("keypress", this.onKeypress, true);
    window.removeEventListener("keyup", this.onKeyup, true);
    document.removeEventListener("focus", this.docOnFocus, true);
    document.removeEventListener("blur", this.onBlur, true);
    document.removeEventListener("DOMActivate", this.onActivate, true);
    Vomnibar.destroy();
    LinkHints.destroy();
    HUD.destroy();
    if (settings.isLoading) {
      clearInterval(settings.isLoading);
    }
    var ref = settings.ondestroy, i, func;
    for (i in ref) {
      func = ref[i];
      ref[i] = null;
      func();
    }
    func = null;
    mainPort = null;
    requestHandlers = null;
    if (ELs.css) {
      DomUtils.removeNode(ELs.css);
    }
    } catch (e) {}
    console.log("%cVimium++ %c#" + frameId + "%c has destroyed."//
      , "color:red", "color:blue", "color:auto");
    window.frameId = frameId;
    window.tabId = ELs.focusMsg.tabId;
    window.isEnabledForUrl = false;
    ELs = null;
  };

})();