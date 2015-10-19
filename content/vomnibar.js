"use strict";
var Vomnibar = {
  vomnibarUI: null,
  defaultRefreshInterval: 500,
  background: null,
  activateWithCompleter: function(completerName, selectFirstResult, forceNewTab, initialQueryValue, force_current) {
    if (window.top !== window && !force_current) {
      MainPort.sendCommadToFrame(0, "Vomnibar.activateWithCompleter"//
        , [completerName, selectFirstResult, forceNewTab, initialQueryValue]);
      return;
    }
    var bg = this.background, completer = bg.Completer, vomnibarUI = this.vomnibarUI;
    if (vomnibarUI.init) {
      // <svg> document has not head nor body; document with pdf <embed> has body
      if (!(document.head || document.body)) {
        return;
      }
      var box = DomUtils.createElement("div");
      completer.init(bg);
      vomnibarUI.init(box, bg, completer);
    }
    completer.setName(completerName);
    vomnibarUI.initialSelectionValue = selectFirstResult ? 0 : -1;
    vomnibarUI.refreshInterval = this.defaultRefreshInterval || 250;
    vomnibarUI.forceNewTab = forceNewTab ? true : false;
    if (!initialQueryValue) {
      vomnibarUI.reset();
    } else if (typeof initialQueryValue === "string") {
      vomnibarUI.reset(initialQueryValue);
    } else if (initialQueryValue = DomUtils.getSelectionText()) {
      vomnibarUI.forceNewTab = true;
      this.ActivateText(initialQueryValue);
    } else {
      vomnibarUI.handlerId = handlerStack.push({
        keydown: function() { return false; }
      });
      MainPort.sendMessage({
        handler: "parseSearchUrl",
        url: window.location.href
      }, this.ActivateText);
    }
  },
  ActivateText: function(url) {
    if (url) {
      Vomnibar.vomnibarUI.reset(url, url.indexOf(' ') + 1, url.length);
    } else {
      Vomnibar.vomnibarUI.reset(Utils.decodeURL(window.location.href));
    }
  },
  activate: function(_0, options) {
    var keyword = options.keyword;
    this.activateWithCompleter("omni", false, false, keyword ? (keyword + " ") : false);
  },
  activateInNewTab: function(_0, options) {
    var keyword = options.keyword;
    this.activateWithCompleter("omni", false, true, keyword ? (keyword + " ") : false);
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
  activateEditUrl: function() {
    this.activateWithCompleter("omni", false, false, true);
  },
  activateEditUrlInNewTab: function() {
    this.activateWithCompleter("omni", false, true, true);
  }
};

Vomnibar.vomnibarUI = {
  _waitInit: 1,
  background: null,
  box: null,
  completer: null,
  completionInput: {
    url: "",
    text: "",
    type: "input",
    action: "navigateToUrl"
  },
  completions: null,
  focused: true,
  forceNewTab: false,
  handlerId: 0,
  initialSelectionValue: -1,
  input: null,
  isSelectionChanged: false,
  list: null,
  onUpdate: null,
  refreshInterval: 0,
  renderItems: null,
  selection: -1,
  timer: 0,
  show: function() {
    this.box.style.display = "";
    this.input.value = this.completionInput.text;
    VInsertMode.heldEl = this.input;
    VInsertMode.focus = VInsertMode.holdFocus;
    this.input.focus();
    this.focused = true;
  },
  hide: function() {
    if (this.timer > 0) {
      window.clearTimeout(this.timer);
      this.timer = 0;
    }
    this.box.style.display = "none";
    this.input.blur();
    this.list.innerHTML = "";
    this.input.value = "";
    handlerStack.remove(this.handlerId);
    this.handlerId = 0;
    this.onUpdate = null;
    this.completionInput.text = "";
    this.completionInput.url = "";
    this.completions = [];
    VInsertMode.heldEl = null;
  },
  reset: function(input, start, end) {
    input || (input = "");
    handlerStack.remove(this.handlerId);
    this.handlerId = handlerStack.push({
      keydown: this.onKeydown,
      keypress: this.onKeypress,
      _this: this
    });
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
    // work-around: For a node in a shadowRoot, if it's in the DOM tree,
    // then its children won't have `.style` if created by setting `.innerHTML`
    this.list.remove();
    this.list.innerHTML = this.renderItems(this.completions);
    this.box.appendChild(this.list);
    this.background.cleanCompletions(this.completions);
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
    if (this.selection === -1) {
      VInsertMode.focus = VInsertMode.holdFocus;
      this.input.focus();
      this.input.value = this.completionInput.text;
    } else {
      if (!this.focused) this.input.blur();
      var ref = this.completions[this.selection];
      if (!ref.text) {
        ref.text = Utils.isJSUrl(ref.url) ? ref.url : Utils.decodeURL(ref.url);
      }
      this.input.value = ref.text;
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
  onKeypress: function() {
    return VInsertMode.lock === this.input ? -1 : true;
  },
  onKeydown: function(event) {
    var action = "", n = event.keyCode, focused = VInsertMode.lock === this.input;
    if ((!focused && VInsertMode.lock) || event.altKey) { return true; }
    if (event.shiftKey || !(event.ctrlKey || event.metaKey)) {}
    else if (n === KeyCodes.up || n === KeyCodes.down) {
      MainPort.Listener({
        name: "execute", count: 1, options: {},
        command: n === KeyCodes.up ? "scrollUp" : "scrollDown"
      });
      return false;
    }
    else if (n === 74 || n === 78) { action = "down"; } // 'J' or 'N'
    else if (n === 75 || n === 80) { action = "up"; } // 'K' or 'P'

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
    else if (n === KeyCodes.backspace) { if (!focused) { return false; } }
    else if (n !== KeyCodes.space) {}
    else if (!focused) { action = "focus"; }
    else if ((this.selection >= 0
        || this.completions.length <= 1) && this.input.value.endsWith("  ")) {
      action = "enter";
    }

    if (action || n <= 32) {}
    else if (KeyboardUtils.getKeyChar(event).length !== 1) {
      if (n > KeyCodes.f1 && n <= KeyCodes.f12) { focused = false; }
    }
    else if (focused && (this.selection < 0 || !this.isSelectionChanged)) {}
    else if (n >= 48 && n < 58) {
      n = (n - 48) || 10;
      if (event.shiftKey || n > this.completions.length) { return false; }
      this.selection = n - 1;
      this.isSelectionChanged = true;
      action = "enter";
    }
    if (action) {
      this.onAction(action);
      return false;
    }
    return focused ? -1 : true;
  },
  onAction: function(action) {
    var sel;
    switch(action) {
    case "dismiss": this.hide(); break;
    case "focus":
      VInsertMode.focus = VInsertMode.holdFocus; this.input.focus();
      this.focused = document.activeElement === this.input;
      break;
    case "blur": this.focused = false; this.input.blur(); break;
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
        if (this.timer && (this.selection === -1 || !this.isSelectionChanged)) {
          this.update(0, this.onEnter);
        }
      } else if (this.selection >= 0 || this.input.value.trim().length > 0) {
        this.onEnter();
      }
      break;
    default: break;
    }
  },
  onEnter: function() {
    this.background.performAction(this.selection === -1 ? this.completionInput
      : this.completions[this.selection], this.forceNewTab);
    this.hide();
  },
  onClick: function(event) {
    var el = event.target, _i;
    if (el === this.input.parentElement) {
      this.onAction("focus");
    } else if (el === this.input) {
      this.focused = true;
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
    str = str.trimRight();
    if ((this.selection === -1 ? this.completionInput.url : this.completions[this.selection].text) !== str) {
      this.update();
      this.completionInput.url = str;
    }
    return false;
  },
  onTimer: function() {
    this.timer = -1;
    this.completer.filter(this.completionInput.url, this.onCompletions);
  },
  onCompletions: function(completions) {
    if (this._waitInit) {
      this.completions = completions;
      return;
    }
    var func = function(completions) {
      this.completions = completions;
      this.populateUI();
      if (this.timer > 0) { return; }
      this.timer = 0;
      if (this.onUpdate) {
        this.onUpdate();
        this.onUpdate = null;
      }
    };
    this.onCompletions = func = func.bind(this);
    func(completions);
  },
  init: function(box, background, completer) {
    this.background = background;
    this.box = box;
    box.className = "R";
    box.id = "Omnibar";
    box.style.display = "none";
    MainPort.sendMessage({
      handler: "initVomnibar"
    }, this.init_dom.bind(this));
    this.completer = completer;
    this.onTimer = this.onTimer.bind(this);
    this.onCompletions = this.onCompletions.bind(this);
    box.addEventListener("click", this.onClick = this.onClick.bind(this));
    box.addEventListener("mousewheel", DomUtils.SuppressPropagation);
    var str;
    if (location.protocol.startsWith("chrome") && chrome.runtime.getManifest
        && (str = chrome.runtime.getManifest().permissions)) {
      str = str.join("/");
      this.background.showFavIcon = str.indexOf("<all_urls>") >= 0 || str.indexOf("chrome://favicon/") >= 0;
    }
    this.init = null;
  },
  init_dom: function(response) {
    var str;
    this.background.showRelevancy = response.relevancy;
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
    }
    DomUtils.UI.addElement(this.box);
    this.input.oninput = this.onInput.bind(this);
    this.input.onselect = this.OnSelected;
  },
  computeHint: function(li, a) {
    var i = [].indexOf.call(this.list.children, li), item, rect;
    if (i === -1) { return null; }
    if (!a.hasAttribute("data-vim-url")) {
      item = this.completions[i];
      a.setAttribute("data-vim-text", item.title);
      a.setAttribute("data-vim-url", item.url);
    }
    rect = VRect.fromClientRect(li.getBoundingClientRect());
    rect[0] += 10; rect[2] -= 12; rect[3] -= 3;
    return rect;
  }
};

Vomnibar.background = {
  Completer: {
    name: "",
    _refreshed: [],
    init: function(background) {
      this._refreshed = [];
      this.onFilter = this.onFilter.bind(this);
      this.mapResult = background.resolve.bind(background);
      this.background = background;
      this.init = null;
    },
    setName: function(name) {
      this.name = name;
      if (this._refreshed.indexOf(name) < 0) {
        this._refreshed.push(name);
        this.refresh();
      }
    },
    refresh: function() {
      MainPort.port.postMessage({
        handler: "refreshCompleter",
        omni: this.name
      });
    },
    filter: function(query, callback) {
      this._callback = callback;
      this._id = MainPort.sendMessage({
        handlerOmni: this.name,
        query: query && query.trim().replace(this.whiteSpaceRe, ' ')
      }, this.onFilter);
    },
    whiteSpaceRe: /\s+/g,
    _id: -2,
    _callback: null,
    background: null,
    mapResult: null,
    onFilter: function(results, msgId) {
      if (this._id !== msgId) { return; }
      var callback = this._callback;
      this._callback = null;
      if (callback) {
        this.background.maxCharNum = Math.floor((window.innerWidth * 0.8 - 70) / 7.72);
        callback(msgId > 0 ? results.map(this.mapResult) : []);
      }
    }
  },

  showRelevancy: false,
  maxCharNum: 160,
  showFavIcon: false,
  resolve: function(result) {
    this.prepareToRender(result);
    result.action = (result.type === "tab") ? "switchToTab"
      : result.hasOwnProperty('sessionId') ? "restoreSession"
      : "navigateToUrl";
    return result;
  },
  highlightTitle: function(string, ranges) {
    var _i, out, start, end;
    if (ranges.length === 0) {
      return Utils.escapeHtml(string);
    }
    out = [];
    for(_i = 0, end = 0; _i < ranges.length; _i += 2) {
      start = ranges[_i];
      out.push(Utils.escapeHtml(string.substring(end, start)));
      end = ranges[_i + 1];
      out.push("<span class=\"OSTitle\">");
      out.push(Utils.escapeHtml(string.substring(start, end)));
      out.push("</span>");
    }
    out.push(Utils.escapeHtml(string.substring(end)));
    return out.join("");
  },
  cutUrl: function(string, ranges, strCoded) {
    var out = [], cutStart = -1, temp, lenCut, i, end, start;
    if (! (string.length <= this.maxCharNum)) {
      cutStart = strCoded.indexOf(":");
      if (cutStart < 0) {}
      else if (string.substring(cutStart, cutStart + 3) !== "://") { ++cutStart; }
      else {
        cutStart = strCoded.indexOf("/", cutStart + 4);
        if (cutStart >= 0) {
          temp = string.indexOf("://");
          cutStart = string.indexOf("/", (temp < 0 || temp > cutStart) ? 0 : (temp + 4));
        }
      }
    }
    cutStart = (cutStart < 0) ? string.length : (cutStart + 1);
    for(i = 0, lenCut = 0, end = 0; i < ranges.length; i += 2) {
      start = ranges[i];
      temp = (end >= cutStart) ? end : cutStart;
      if (temp + 20 > start) {
        out.push(Utils.escapeHtml(string.substring(end, start)));
      } else {
        out.push(Utils.escapeHtml(string.substring(end, temp + 10)));
        out.push("...");
        out.push(Utils.escapeHtml(string.substring(start - 6, start)));
        lenCut += start - temp - 19;
      }
      end = ranges[i + 1];
      out.push("<span class=\"OSUrl\">");
      out.push(Utils.escapeHtml(string.substring(start, end)));
      out.push("</span>");
    }
    temp = this.maxCharNum + lenCut;
    if (! (string.length > temp)) {
      out.push(Utils.escapeHtml(string.substring(end)));
    } else {
      out.push(Utils.escapeHtml(string.substring(end,
        (temp - 3 > end) ? (temp - 3) : (end + 10))));
      out.push("...");
    }
    return out.join("");
  },
  prepareToRender: function(item) {
    item.textSplit = this.cutUrl(item.text, item.textSplit, item.url);
    item.titleSplit = this.highlightTitle(item.title, item.titleSplit);
    if (this.showFavIcon && item.url.indexOf("://") >= 0) {
      item.favIconUrl = " OIIcon\" style=\"background-image: url('" + Utils.escapeHtml(item.favIconUrl ||
        ("chrome://favicon/size/16/" + item.url)) + "')";
    } else {
      item.favIconUrl = "";
    }
    if (this.showRelevancy) {
      item.relevancy = "\n\t\t\t<span class=\"OIRelevancy\">" + item.relevancy + "</span>";
    } else {
      item.relevancy = "";
    }
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
    switchToTab: function() {
      MainPort.port.postMessage({
        handler: "selectTab",
        tabId: this.sessionId
      });
    },
    restoreSession: function() {
      MainPort.port.postMessage({
        handler: "restoreSession",
        sessionId: this.sessionId
      });
    }
  }
};
