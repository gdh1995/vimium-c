"use strict";
var Vomnibar = {
activate: function(_0, options, forceCurrent) {
  var url, keyword;
  if (this.init) {
    forceCurrent |= 0;
    if (forceCurrent < 2 &&
      MainPort.sendCommandToContainer("Vomnibar.activate", [1, options, forceCurrent])) {
      return;
    }
    if (!(document.documentElement instanceof HTMLHtmlElement)) { return false; }
    this.init();
  }
  Object.setPrototypeOf(options = options || {}, null);
  this.mode.type = options.mode || "omni";
  this.forceNewTab = options.force ? true : false;
  handlerStack.remove(this);
  handlerStack.push(DomUtils.UI.SuppressMost, this);
  url = options.url;
  keyword = options.keyword;
  if (url == null) {
    this.reset(keyword ? keyword + " " : "");
    return;
  }
  if (url === true) {
    if (url = DomUtils.getSelectionText()) {
      this.forceNewTab = true;
    } else {
      url = window.location.href;
    }
  }
  if (url.indexOf("://") === -1) {
    this._activateText(url, keyword, "");
    return;
  }
  MainPort.sendMessage({
    handler: "parseSearchUrl",
    url: url
  }, this._activateText.bind(this, url, keyword));
},
  _activateText: function(url, keyword, search) {
    var start;
    if (search) {
      start = search.start;
      url = search.url;
      keyword || (keyword = search.keyword);
    } else if (search === null) {
      url = Utils.decodeURL(url).replace(/\s$/g, "%20");
    } else {
      url = Utils.decodeURL(url, decodeURIComponent).trim().replace(/\s+/g, " ");
    }
    if (keyword) {
      start = (start || 0) + keyword.length + 1;
      this.reset(keyword + " " + url, start, start + url.length);
    } else {
      this.reset(url);
    }
  },

  box: null,
  inputText: "",
  completions: null,
  isSearchOnTop: false,
  notOnlySearch: true,
  actionType: false,
  input: false,
  isSelectionOrigin: true,
  list: null,
  onUpdate: null,
  refreshInterval: 500,
  renderItems: null,
  selection: -1,
  timer: 0,
  wheelTimer: 0,
  show: function() {
    var width = document.documentElement.clientWidth * 0.8;
    if (width !== (width | 0)) {
      this.box.style.width = (width | 0) / (width / 0.8) * 100 + "%";
    }
    this.box.style.display = "";
    this.input.value = this.inputText;
    DomUtils.UI.addElement(this.box);
    DomUtils.UI.focus(this.input);
    handlerStack.remove(this);
    handlerStack.push(this.onKeydown, this);
    this.box.onmousewheel = this.onWheel;
  },
  hide: function() {
    clearTimeout(this.timer);
    this.timer = 0;
    this.box.style.display = "none";
    this.box.style.width = "";
    this.box.onmousewheel = null;
    this.list.textContent = "";
    this.input.value = "";
    handlerStack.remove(this);
    this.onUpdate = null;
    this.mode.query = this.inputText = "";
    this.completions = [];
  },
  reset: function(input, start, end) {
    input || (input = "");
    this.inputText = input;
    this.mode.query = input.trimRight();
    this.completions = [];
    this.update(0, input && start <= end ? function() {
      this.show();
      this.input.setSelectionRange(start, end);
    } : this.show);
  },
  update: function(updateDelay, callback) {
    this.onUpdate = callback;
    if (typeof updateDelay === "number") {
      if (this.timer > 0) {
        clearTimeout(this.timer);
      }
      if (updateDelay <= 0) {
        this.filter();
        return;
      }
    } else if (this.timer > 0) {
      return;
    } else {
      updateDelay = this.refreshInterval;
    }
    this.timer = setTimeout(this.OnTimer, updateDelay);
  },
  populateUI: function() {
    // work-around: For a node in a shadowRoot, if it's in the XML DOM tree,
    // then its children won't have `.style` if created by setting `.innerHTML`
    var list = this.list, barCls = this.input.parentElement.classList;
    list.remove();
    list.innerHTML = this.renderItems(this.completions);
    this.box.appendChild(list);
    this.selection = -1;
    if (this.completions.length > 0) {
      list.style.display = "";
      list.lastElementChild.classList.add("OBItem");
      barCls.add("OWithList");
      if (this.autoSelect || this.mode.type !== "omni") {
        this.selection = 0;
        list.firstElementChild.classList.add("S");
      };
    } else {
      list.style.display = "none";
      barCls.remove("OWithList");
    }
    this.isSearchOnTop = this.completions.length > 0 && this.completions[0].type === "search";
    this.isSelectionOrigin = true;
  },
  updateInput: function(sel) {
    var focused = this.input.focused, line, str;
    if (sel === -1) {
      this.input.focus();
      this.input.focused = focused;
      this.input.value = this.inputText;
      return;
    }
    if (!focused) this.input.blur();
    line = this.completions[sel];
    str = line.text;
    if (line.type !== "history" && line.type !== "tab") {
      this.input.value = str;
      if (line.type === "math") {
        this.input.select();
      }
      return;
    }
    if (line.parsed) {
      this.input.value = line.parsed;
      return;
    }
    if (line.url.toLowerCase().startsWith("http") && str.lastIndexOf("://", 5) < 0) {
      str = (line.url[5] === ':' ? "http://" : "https://") + str;
    }
    MainPort.sendMessage({
      handler: "parseSearchUrl",
      url: str
    }, function(search) {
      line.parsed = search ? search.keyword + " " + search.url : line.text;
      sel === Vomnibar.selection && (Vomnibar.input.value = line.parsed);
    });
  },
  toggleInput: function() {
    if (this.selection < 0) { return; }
    var line = this.completions[this.selection], str = this.input.value.trim();
    this.input.value = str === line.url ? (line.parsed || line.text)
      : str === line.text ? line.url : line.text;
  },
  updateSelection: function(sel) {
    if (this.timer) { return; }
    var _ref = this.list.children, old = this.selection;
    if (old >= 0) {
      _ref[old].classList.remove("S");
    }
    if (this.isSelectionOrigin || old < 0) {
      this.inputText = this.input.value;
    }
    if (sel >= 0) {
      _ref[sel].classList.add("S");
    }
    this.updateInput(sel);
    this.selection = sel;
    this.isSelectionOrigin = false;
  },
  ctrlMap: {
    66: "pageup", 74: "down", 75: "up", 219: "dismiss", 221: "toggle"
    , 78: "down", 80: "up" // TODO: check <c-p>, <c-n>
  },
  normalMap: {
    9: "down", 27: "dismiss", 33: "pageup", 34: "pagedown", 38: "up", 40: "down"
    , 112: "backspace", 113: "blur"
  },
  onKeydown: function(event) {
    var action = "", n = event.keyCode, focused = VEventMode.lock() === this.input;
    if ((!focused && VEventMode.lock())) { return 0; }
    if (event.altKey || event.metaKey) {
      if (!focused || event.ctrlKey || event.shiftKey) {}
      else if (n >= 66 && n <= 70 && n !== 67) {
        this.onBashAction(n - 64);
        return 2;
      }
      if (event.altKey) {
        return 0;
      }
    }
    if (n === KeyCodes.enter) {
      this.onEnter(event);
      return 2;
    }
    else if (event.ctrlKey || event.metaKey) {
      if (event.shiftKey) { action = n === 70 ? "pagedown" : n === 66 ? "pageup" : ""; }
      else if (n === KeyCodes.up || n === KeyCodes.down) {
        MainPort.Listener({
          name: "execute", count: 1,
          command: "scrollBy",
          options: { dir: n - 39 }
        });
        return 2;
      }
      else { action = this.ctrlMap[n] || ""; }
    }
    else if (event.shiftKey) {
      action = n === KeyCodes.up ? "pageup" : n === KeyCodes.down ? "pagedown"
        : n === KeyCodes.tab ? "up" : "";
    }
    else if (action = this.normalMap[n] || "") {}
    else if (n === KeyCodes.backspace) { return focused ? 1 : 2; }
    else if (n !== KeyCodes.space) {}
    else if (!focused) { action = "focus"; }
    else if ((this.selection >= 0
        || this.completions.length <= 1) && this.input.value.endsWith("  ")) {
      this.onEnter(event);
      return 2;
    }

    if (action || n <= 32) {}
    else if (KeyboardUtils.getKeyChar(event).length !== 1) {
      if (n > KeyCodes.f1 && n <= KeyCodes.f12) { focused = false; }
    }
    else if (!focused && n >= 48 && n < 58) {
      n = (n - 48) || 10;
      if (event.shiftKey || n > this.completions.length) { return 2; }
      this.selection = n - 1;
      this.isSelectionOrigin = false;
      action = "enter";
    }
    if (action) {
      this.onAction(action);
      return 2;
    }
    return focused && n !== KeyCodes.menuKey ? 1 : 0;
  },
  onAction: function(action) {
    switch(action) {
    case "dismiss": DomUtils.UI.removeSelection() || this.hide(); break;
    case "focus": this.input.focus(); break;
    case "backspace": case "blur":
      VEventMode.lock() !== this.input ? this.input.focus() :
      action === "blur" ? this.input.blur() : document.execCommand("delete");
      break;
    case "up": case "down":
      var sel = this.completions.length + 1;
      sel = (sel + this.selection + (action === "up" ? 0 : 2)) % sel - 1;
      this.updateSelection(sel);
      break;
    case "toggle": this.toggleInput(); break;
    case "pageup": case "pagedown": this.goPage(action === "pageup" ? -1 : 1); break;
    case "enter": this.onEnter(true); break;
    default: break;
    }
  },
  onBashAction: function(code) {
    var sel = window.getSelection();
    sel.collapseToStart();
    sel.modify(code === 4 ? "extend" : "move", code < 4 ? "backward" : "forward", "word");
    code === 4 && document.execCommand("delete");
  },
  _pageNumRe: /(?:^|\s)(\+\d{0,2})$/,
  goPage: function(sel) {
    var i, arr, len = this.completions.length,
    n = this.mode.maxResults,
    str = len ? this.completions[0].type : "";
    if (this.isSearchOnTop) { return; }
    str = (this.isSelectionOrigin || this.selection < 0 ? this.input.value : this.inputText).trimRight();
    arr = this._pageNumRe.exec(str);
    i = (arr && arr[0]) | 0;
    if (len >= n) { sel *= n; }
    else if (i > 0 && sel < 0) { sel *= i >= n ? n : 1; }
    else if (len < (len && this.completions[0].type === "tab" ? 3 : n)) { return; }

    sel += i;
    sel = sel < 0 ? 0 : sel > 90 ? 90 : sel;
    if (sel == i) { return; }
    if (arr) { str = str.substring(0, str.length - arr[0].length); }
    str = str.trimRight();
    i = Math.min(this.input.selectionEnd, str.length);
    if (sel > 0) { str += " +" + sel; }
    sel = this.input.selectionStart;
    arr = [this.input.selectionDirection];
    this.input.value = str;
    this.input.setSelectionRange(sel, i, arr[0]);
    this.update();
  },
  onEnter: function(event) {
    var sel = this.selection, item;
    this.actionType = event == null ? this.actionType : event === true ? -this.forceNewTab
      : event.ctrlKey || event.metaKey ? -1 - event.shiftKey
      : event.shiftKey ? 0 : -this.forceNewTab;
    if (this.timer) {
      if (sel === -1 || this.isSelectionOrigin) {
        this.update(0, this.onEnter);
        return;
      }
    } else if (sel === -1 && this.input.value.length === 0) {
      return;
    }
    item = sel >= 0 ? this.completions[sel] : { url: this.input.value.trim() };
    this.actionType > -2 && this.hide();
    item.hasOwnProperty('sessionId') ? this.gotoSession(item) : this.navigateToUrl(item);
  },
  onClick: function(event) {
    var el = event.target, _i;
    if (el === this.input.parentElement) {
      this.onAction("focus");
    } else if (el === this.input) {
      return;
    } else if (el === this.list || this.timer) {}
    else if (window.getSelection().type !== "Range") {
      while(el && el.parentNode != this.list) { el = el.parentNode; }
      _i = el ? [].indexOf.call(this.list.children, el) : -1;
      if (_i >= 0) {
        this.selection = _i;
        this.isSelectionOrigin = false;
        this.onEnter(event);
      }
    }
    event.preventDefault();
  },
  OnMenu: function (event) {
    for (var _i, el = event.target; el; el = el.parentNode) {
      if (el.classList.contains("OIUrl")) { break; }
    }
    if (!el) { return; }
    _i = [].indexOf.call(Vomnibar.list.children, el.parentNode.parentNode);
    el.href = Vomnibar.completions[_i].url;
  },
  OnSelect: function() {
    var el = this, left, end;
    if (el.selectionStart !== 0 || el.selectionDirection !== "backward") { return; }
    left = el.value;
    end = el.selectionEnd - 1;
    if (left.charCodeAt(end) !== 32 || end === left.length - 1) { return; }
    left = left.substring(0, end).trimRight();
    if (left.indexOf(" ") === -1) {
      el.setSelectionRange(0, left.length, 'backward');
    }
  },
  OnTimer: function() { Vomnibar && Vomnibar.filter(); },
  onWheel: function(event) {
    if (event.ctrlKey || event.metaKey) { return; }
    Utils.Prevent(event);
    var delta = 80 * (KeyboardUtils.onMac ? 2.5 : 1);
    if (event.deltaX || Date.now() - this.wheelTimer < delta) { return; }
    this.wheelTimer = Date.now();
    this.goPage(event.deltaY > 0 ? 1 : -1);
  },
  onInput: function() {
    var s0 = this.mode.query, s1 = this.input.value, str, i, j, arr;
    if ((str = s1.trim()) === (this.selection === -1 || this.isSelectionOrigin
        ? s0 : this.completions[this.selection].text)) {
      return;
    }
    if (this.completions.length > this.isSearchOnTop || this.timer || !(s1.startsWith(s0) && s0)) {
      this.notOnlySearch = true;
    } else if (this.isSearchOnTop) {
      this.notOnlySearch = false;
    } else {
      return;
    }
    i = this.input.selectionStart;
    if (this.isSearchOnTop) {}
    else if (i > s1.length - 2) {
      if (s1.endsWith(" +") && !this.timer && str.substring(0, str.length - 2).trimRight() === s0) {
        return;
      }
    } else if ((arr = this._pageNumRe.exec(s0)) && str.endsWith(arr[0])) {
      s1 = s1.trimRight(); j = arr[0].length;
      s1 = s1.substring(0, s1.length - j).trimRight();
      if (s1.trimLeft() !== s0.substring(0, s0.length - j).trimRight()) {
        this.input.value = s1;
        this.input.setSelectionRange(i, i);
      }
    }
    this.update();
  },
  onCompletions: function(completions) {
    if (this.initDom) {
      this.completions = completions;
      return;
    }
    this.onCompletions = function(completions) {
      if (!this.completions) { return; }
      completions.forEach(this.Parse, this.mode);
      this.completions = completions;
      this.populateUI();
      if (this.timer > 0) { return; }
      this.timer = 0;
      if (this.onUpdate) {
        this.onUpdate();
        this.onUpdate = null;
      }
      this.CleanCompletions(this.completions);
    };
    this.onCompletions(completions);
  },
  init: function() {
    var box, opts, arr;
    this.box = box = DomUtils.createElement("div");
    box.className = "R";
    box.id = "Omnibar";
    box.style.display = "none";
    MainPort.sendMessage({
      handler: "initVomnibar"
    }, function(response) { Vomnibar.initDom(response); });
    box.onclick = function(e) { Vomnibar.onClick(e) };
    if (window.location.protocol.startsWith("chrome") && chrome.runtime.getManifest
        && (opts = chrome.runtime.getManifest())) {
      arr = opts.permissions || [];
      this.mode.showFavIcon = arr.join("/").indexOf("<all_urls>") >= 0 ||
          arr.concat(opts.optional_permissions).join("/").indexOf("chrome://favicon/") >= 0;
    }
    this.onWheel = this.onWheel.bind(this);
    Object.setPrototypeOf(this.ctrlMap, null);
    Object.setPrototypeOf(this.normalMap, null);
    this.init = null;
  },
  initDom: function(response) {
    var _this = this, str;
    this.box.innerHTML = response;
    this.input = this.box.querySelector("#OInput");
    this.list = this.box.querySelector("#OList");
    str = this.box.querySelector("#OITemplate").outerHTML;
    str = str.substring(str.indexOf('>') + 1, str.lastIndexOf('<'));
    this.renderItems = Utils.makeListRenderBySplit(str);
    this.initDom = null;
    if (this.completions) {
      this.onCompletions(this.completions);
    } else {
      // setup DOM node on initing, so that we do less when showing
      DomUtils.UI.addElement(this.box);
    }
    this.input.oninput = this.onInput.bind(this);
    this.input.onselect = this.OnSelect;
    this.input.onfocus = this.input.onblur = VEventMode.on("UI");
    this.box.querySelector("#OClose").onclick = function() { Vomnibar.hide(); };
    this.list.oncontextmenu = this.OnMenu;
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
  },

  mode: {
    handler: "omni",
    type: "",
    clientWidth: 0,
    showRelevancy: false,
    showFavIcon: false,
    maxResults: 10,
    query: ""
  },
  filter: function(query) {
    var mode = this.mode, str = this.input ? this.input.value.trim() : "";
    if (str && str === mode.query) { return; }
    mode.clientWidth = document.documentElement.clientWidth,
    mode.query = str;
    this.timer = -1;
    if (this.notOnlySearch) {
      return MainPort.port.postMessage(mode);
    }
    str = mode.handler;
    mode.type = "search";
    MainPort.port.postMessage(mode);
    mode.type = str;
  },

  Parse: function(item) {
    var str;
    item.favIconUrl = this.showFavIcon && (str = item.favIconUrl) ?
      ' OIIcon" style="background-image: url(&quot;chrome://favicon/size/16/' + str + "&quot;)" : "";
    item.relevancy = this.showRelevancy ? '\n\t\t\t<span class="OIRelevancy">'
      + item.relevancy + "</span>" : "";
  },
  CleanCompletions: function(list) {
    for (var _i = list.length, item; 0 <= --_i; ) {
      item = list[_i];
      delete item.textSplit;
      delete item.titleSplit;
      delete item.favIconUrl;
      delete item.relevancy;
    }
  },
  navigateToUrl: function(item) {
    if (Utils.evalIfOK(item.url)) { return; }
    MainPort.port.postMessage({
      handler: "openUrl",
      reuse: this.actionType,
      url: item.url
    });
  },
  gotoSession: function(item) {
    MainPort.port.postMessage({
      handler: "gotoSession",
      active: this.actionType > -2,
      sessionId: item.sessionId
    });
    this.actionType < -1 && this.update(50);
  }
};
