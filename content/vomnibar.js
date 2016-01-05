"use strict";
var Vomnibar = {
activateWithCompleter: function(completerName, selectFirstResult, forceNewTab
    , initialQueryValue, keyword, force_current) {
  var vomnibarUI = this.vomnibarUI, args;
  if (vomnibarUI.init) {
    force_current |= 0;
    if (force_current < 2) {
      args = [].slice.call(arguments, 0, 5);
      args.push(force_current);
      if (MainPort.sendCommandToContainer("Vomnibar.activateWithCompleter", args)) {
        return;
      }
    }
    // <svg> document has not head nor body; document with pdf <embed> has body
    if (!document.body) { return false; }
    var box = DomUtils.createElement("div");
    this.background.init();
    vomnibarUI.init(box);
  }
  this.background.name = completerName;
  vomnibarUI.initialSelectionValue = selectFirstResult ? 0 : -1;
  vomnibarUI.forceNewTab = forceNewTab ? true : false;
  handlerStack.remove(vomnibarUI.handlerId);
  vomnibarUI.handlerId = handlerStack.push(handlerStack.SuppressMost);
  if (initialQueryValue == null) {
    vomnibarUI.reset(keyword ? keyword + " " : "");
    return;
  }
  if (initialQueryValue === true) {
    if (initialQueryValue = DomUtils.getSelectionText()) {
      vomnibarUI.forceNewTab = true;
    } else {
      initialQueryValue = window.location.href;
    }
  }
  if (initialQueryValue.indexOf("://") === -1) {
    this.activateText(initialQueryValue, keyword, "");
    return;
  }
  MainPort.sendMessage({
    handler: "parseSearchUrl",
    url: initialQueryValue
  }, this.activateText.bind(this, initialQueryValue, keyword));
},
  activateText: function(url, keyword, search) {
    var start;
    if (search) {
      start = search.start;
      url = search.url;
      keyword || (keyword = search.keyword);
    } else {
      url = search === null ? Utils.decodeURL(url)
        : Utils.decodeURL(url, window.decodeURIComponent);
    }
    url = url.trim().replace(Utils.spacesRe, " ");
    if (keyword) {
      start = (start || 0) + keyword.length + 1;
      Vomnibar.vomnibarUI.reset(keyword + " " + url, start, start + url.length);
    } else {
      Vomnibar.vomnibarUI.reset(url);
    }
  },
  activate: function(_0, options) {
    this.activateWithCompleter("omni", false, false, options.url, options.keyword);
  },
  activateInNewTab: function(_0, options) {
    this.activateWithCompleter("omni", false, true, options.url, options.keyword);
  },
  activateTabSelection: function() {
    this.activateWithCompleter("tabs", true);
  },
  activateBookmarks: function() {
    this.activateWithCompleter("bookmarks", true);
  },
  activateBookmarksInNewTab: function() {
    this.activateWithCompleter("bookmarks", true, true);
  },
  activateHistory: function() {
    this.activateWithCompleter("history", true);
  },
  activateHistoryInNewTab: function() {
    this.activateWithCompleter("history", true, true);
  },

vomnibarUI: {
  _waitInit: 1,
  box: null,
  completionInput: {
    url: "",
    text: "",
    type: "input",
    action: "navigateToUrl"
  },
  completions: null,
  forceNewTab: false,
  handlerId: 0,
  initialSelectionValue: -1,
  input: null,
  isSelectionChanged: false,
  list: null,
  onUpdate: null,
  refreshInterval: 500,
  renderItems: null,
  selection: -1,
  timer: 0,
  show: function() {
    DomUtils.UI.addElement(this.box);
    this.box.style.display = "";
    this.input.value = this.completionInput.text;
    VInsertMode.focus = VInsertMode.holdFocus;
    VInsertMode.heldEl = this.input;
    this.input.focus();
    handlerStack.remove(this.handlerId);
    this.handlerId = handlerStack.push(this.onKeydown, this);
  },
  hide: function() {
    if (this.timer > 0) {
      window.clearTimeout(this.timer);
      this.timer = 0;
    }
    this.box.style.display = "none";
    this.list.textContent = "";
    this.input.value = "";
    handlerStack.remove(this.handlerId);
    this.handlerId = 0;
    this.onUpdate = null;
    this.completionInput.text = "";
    this.completionInput.url = "";
    this.completions = [];
    VInsertMode.focus = VInsertMode.lockFocus;
  },
  reset: function(input, start, end) {
    input || (input = "");
    this.completionInput.text = input;
    this.completionInput.url = input.trimRight();
    this.update(0, input && start <= end ? function() {
      this.show();
      this.input.setSelectionRange(start, end);
    } : this.show);
  },
  update: function(updateDelay, callback) {
    this.onUpdate = callback;
    if (typeof updateDelay === "number") {
      if (this.timer > 0) {
        window.clearTimeout(this.timer);
      }
      if (updateDelay <= 0) {
        this.onTimer();
        return;
      }
    } else if (this.timer > 0) {
      return;
    } else {
      updateDelay = this.refreshInterval;
    }
    this.timer = setTimeout(this.onTimer, updateDelay);
  },
  populateUI: function() {
    // work-around: For a node in a shadowRoot, if it's in the XML DOM tree,
    // then its children won't have `.style` if created by setting `.innerHTML`
    this.list.remove();
    this.list.innerHTML = this.renderItems(this.completions);
    this.box.appendChild(this.list);
    Vomnibar.background.cleanCompletions(this.completions);
    if (this.completions.length > 0) {
      this.list.style.display = "";
      this.list.lastElementChild.classList.add("OBItem");
      this.input.parentElement.classList.add("OWithList");
      this.selection = (this.completions[0].type === "search") ? 0 : this.initialSelectionValue;
    } else {
      this.list.style.display = "none";
      this.input.parentElement.classList.remove("OWithList");
      this.selection = -1;
    }
    this.isSelectionChanged = false;
    this.updateSelection(this.selection);
  },
  updateInput: function() {
    var focused = this.input.focused;
    if (this.selection === -1) {
      this.input.focus();
      this.input.focused = focused;
      this.input.value = this.completionInput.text;
    } else {
      if (!focused) this.input.blur();
      this.input.value = this.completions[this.selection].text;
    }
  },
  updateSelection: function(sel) {
    var _ref = this.list.children, old = this.selection;
    this.selection = sel;
    if (old >= 0 && old < _ref.length) {
      _ref[old].classList.remove("S");
    }
    if (sel >= 0 && sel < _ref.length) {
      _ref[sel].classList.add("S");
    }
  },
  onKeydown: function(event) {
    var action = "", n = event.keyCode, focused = VInsertMode.lock === this.input;
    if ((!focused && VInsertMode.lock) || event.altKey) { return 0; }
    if (event.shiftKey || !(event.ctrlKey || event.metaKey)) {}
    else if (n === KeyCodes.up || n === KeyCodes.down) {
      MainPort.Listener({
        name: "execute", count: 1, options: {},
        command: n === KeyCodes.up ? "scrollUp" : "scrollDown"
      });
      return 2;
    }
    else if (n === 74 || n === 78) { action = "down"; } // 'J' or 'N'
    else if (n === 75 || n === 80) { action = "up"; } // 'K' or 'P'
    else if (n === 219 || n === 91) { action = "dismiss"; } // '['

    if (action) {}
    else if (n === KeyCodes.enter) {
      if (event.shiftKey || event.ctrlKey || event.metaKey) { this.forceNewTab = true; }
      action = "enter";
    }
    else if (event.ctrlKey || event.metaKey) {}
    else if (event.shiftKey) {
      if (n === KeyCodes.tab) { action = "up"; }
      else if (n === KeyCodes.f1) { action = focused ? "blur" : "focus"; }
    }
    else if (n === KeyCodes.tab) { action = "down"; }
    else if (n === KeyCodes.esc) { action = "dismiss"; }
    else if (n === KeyCodes.up) { action = "up"; }
    else if (n === KeyCodes.down) { action = "down"; }
    else if (n === KeyCodes.f1) { action = focused ? "backspace" : "focus"; }
    else if (n === KeyCodes.f1 + 1) { action = focused ? "blur" : "focus"; }
    else if (n === KeyCodes.backspace) { if (!focused) { return 2; } }
    else if (n !== KeyCodes.space) {}
    else if (!focused) { action = "focus"; }
    else if ((this.selection >= 0
        || this.completions.length <= 1) && this.input.value.endsWith("  ")) {
      action = "enter";
    }

    if (action || n <= 32) {}
    else if (KeyboardUtils.getKeyChar(event, event.shiftKey).length !== 1) {
      if (n > KeyCodes.f1 && n <= KeyCodes.f12) { focused = false; }
    }
    else if (focused && (this.selection < 0 || !this.isSelectionChanged)) {}
    else if (n >= 48 && n < 58) {
      n = (n - 48) || 10;
      if (event.shiftKey || n > this.completions.length) { return 2; }
      this.selection = n - 1;
      this.isSelectionChanged = true;
      action = "enter";
    }
    if (action) {
      this.onAction(action);
      return 2;
    }
    return focused ? 1 : 0;
  },
  onAction: function(action) {
    var sel;
    switch(action) {
    case "dismiss":
      DomUtils.UI.removeSelection() || this.hide();
      break;
    case "focus":
      this.input.focus();
      break;
    case "blur": this.input.blur(); break;
    case "backspace": DomUtils.simulateBackspace(this.input); break;
    case "up":
      this.isSelectionChanged = true;
      sel = this.selection;
      if (sel < 0) sel = this.completions.length;
      sel -= 1;
      this.updateSelection(sel);
      this.updateInput();
      break;
    case "down":
      this.isSelectionChanged = true;
      sel = this.selection + 1;
      if (sel >= this.completions.length) sel = -1;
      this.updateSelection(sel);
      this.updateInput(); 
      break;
    case "enter":
      if (this.timer) {
        if (this.selection === -1 || !this.isSelectionChanged) {
          this.update(0, this.onEnter);
        }
      } else if (this.selection >= 0 || this.completionInput.url.length > 0) {
        this.onEnter();
      }
      break;
    default: break;
    }
  },
  onEnter: function() {
    Vomnibar.background.performAction(this.selection === -1 ? this.completionInput
      : this.completions[this.selection], this.forceNewTab);
    this.hide();
  },
  onClick: function(event) {
    var el = event.target, _i;
    if (el === this.input.parentElement) {
      this.onAction("focus");
    } else if (el === this.input) {
      event.stopImmediatePropagation();
      return;
    } else if (el === this.list || this.timer) {}
    else if (window.getSelection().type !== "Range") {
      var ind = [].indexOf;
      _i = ind.call(event.path, this.list);
      _i = _i > 0 ? ind.call(this.list.children, event.path[_i - 1]) : -1;
      if (_i >= 0) {
        this.selection = _i;
        this.isSelectionChanged = true;
        this.forceNewTab || (this.forceNewTab = event.shiftKey || event.ctrlKey || event.metaKey);
        this.onAction("enter");
      }
    }
    DomUtils.suppressEvent(event);
  },
  onMenu: function (event) {
    var path = event.path, _i, el;
    for (_i = 0; (el = path[_i]) !== this.list; ++_i) {
      if (el.classList.contains("OIUrl")) { break; }
    }
    if (el === this.list) { return; }
    _i = [].indexOf.call(this.list.children, el.parentElement.parentElement);
    el.href = this.completions[_i].url;
    DomUtils.SuppressPropagation(event);
  },
  OnSelected: function() {
    var el = this, left;
    if (el.selectionStart !== 0 || el.selectionDirection !== "backward") { return; }
    left = el.value;
    if (el.value.charCodeAt(el.selectionEnd - 1) !== 32) { return; }
    left = left.substring(0, el.selectionEnd).trimRight();
    if (left.indexOf(" ") === -1) {
      el.setSelectionRange(0, left.length);
    }
  },
  onInput: function() {
    var str = this.input.value.trimLeft();
    this.completionInput.text = str;
    if ((str = str.trimRight()) !== ((this.selection === -1 || !this.isSelectionChanged)
          ? this.completionInput.url : this.completions[this.selection].text)) {
      // here's no race condition
      this.completionInput.url = str;
      this.update();
    }
    return false;
  },
  onTimer: function() {
    this.timer = -1;
    Vomnibar.background.filter(this.completionInput.url);
  },
  onCompletions: function(completions) {
    if (this._waitInit) {
      this.completions = completions;
      return;
    }
    var onCompletions = function(completions) {
      this.completions = completions;
      this.populateUI();
      if (this.timer > 0) { return; }
      this.timer = 0;
      if (this.onUpdate) {
        this.onUpdate();
        this.onUpdate = null;
      }
    };
    this.onCompletions = onCompletions;
    this.onCompletions(completions);
  },
  init: function(box) {
    var _this = this, str;
    this.box = box;
    box.className = "R";
    box.id = "Omnibar";
    box.style.display = "none";
    MainPort.sendMessage({
      handler: "initVomnibar"
    }, function(response) { _this.init_dom(response); });
    this.onTimer = this.onTimer.bind(this);
    box.addEventListener("click", function (event) { _this.onClick(event); });
    box.addEventListener("mousewheel", DomUtils.SuppressPropagation);
    if (window.location.protocol.startsWith("chrome") && chrome.runtime.getManifest
        && (str = chrome.runtime.getManifest().permissions)) {
      str = str.join("/");
      Vomnibar.background.showFavIcon = str.indexOf("<all_urls>") >= 0 ||
          str.indexOf("chrome://favicon/") >= 0;
    }
    this.init = null;
  },
  init_dom: function(response) {
    var _this = this, str;
    Vomnibar.background.showRelevancy = response.relevancy;
    this.box.innerHTML = response.html;
    this.input = this.box.querySelector("#OInput");
    this.list = this.box.querySelector("#OList");
    str = this.box.querySelector("#OITemplate").outerHTML;
    str = str.substring(str.indexOf('>') + 1, str.lastIndexOf('<'));
    this.renderItems = Utils.makeListRenderBySplit(str);
    this._waitInit = 0;
    this.init_dom = null;
    if (this.completions) {
      this.onCompletions(this.completions);
    } else {
      // setup DOM node on initing, so that we do less when showing
      DomUtils.UI.addElement(this.box);
    }
    this.input.oninput = this.onInput.bind(this);
    this.input.onselect = this.OnSelected;
    this.list.addEventListener("contextmenu", function(event) { _this.onMenu(event); });
  },
  computeHint: function(li, a) {
    var i = [].indexOf.call(this.list.children, li), item, rect;
    if (i === -1) { return null; }
    item = this.completions[i];
    a.setAttribute("data-vim-text", item.title);
    a.href = item.url;
    rect = VRect.fromClientRect(li.getBoundingClientRect());
    rect[0] += 10; rect[2] -= 12; rect[3] -= 3;
    return rect;
  }
},

background: {
  name: "",
  init: function() {
    this.parse = this.parse.bind(this);
  },
  filter: function(query) {
    MainPort.port.postMessage({
      handler: "omni",
      type: this.name,
      clientWidth: window.innerWidth,
      showFavIcon: Vomnibar.background.showFavIcon,
      maxResults: 10,
      query: query && query.replace(Utils.spacesRe, ' ')
    });
  },

  showRelevancy: false,
  parse: function(item) {
    var str;
    if (this.showFavIcon && (str = item.favIconUrl)) {
      item.favIconUrl = " OIIcon\" style=\"background-image: url('" +
        (str[0] !== "/" ? str : "chrome://favicon/size/16" + str) + "')";
    } else {
      item.favIconUrl = "";
    }
    if (this.showRelevancy) {
      item.relevancy = "\n\t\t\t<span class=\"OIRelevancy\">" + item.relevancy + "</span>";
    } else {
      item.relevancy = "";
    }
    item.action = item.hasOwnProperty('sessionId') ? "gotoSession"
      : "navigateToUrl";
    return item;
  },
  cleanCompletions: function(list) {
    for (var _i = list.length, item; 0 <= --_i; ) {
      item = list[_i];
      delete item.textSplit;
      delete item.titleSplit;
      delete item.favIconUrl;
      delete item.relevancy;
    }
  },
  performAction: function(item, arg) {
    var action = this.completionActions[item.action] || item.action;
    if (typeof action !== "function") return;
    return action.call(item, arg);
  },
  completionActions: {
    navigateToUrl: function(openInNewTab) {
      if (Utils.evalIfOK(this.url)) { return; }
      MainPort.port.postMessage({
        handler: (openInNewTab ? "openUrlInNewTab" : "openUrlInCurrentTab"),
        url: this.url
      });
    },
    gotoSession: function() {
      MainPort.port.postMessage(typeof this.sessionId === "number" ? {
        handler: "selectTab",
        tabId: this.sessionId
      } : {
        handler: "restoreSession",
        sessionId: this.sessionId
      });
    }
  }
}
};
