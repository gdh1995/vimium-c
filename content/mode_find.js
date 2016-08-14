"use strict";
var VFindMode = {
  isActive: false,
  query: "",
  parsedQuery: "",
  historyIndex: 0,
  isRegex: false,
  ignoreCase: false,
  hasResults: false,
  matchCount: 0,
  scrollX: 0,
  scrollY: 0,
  initialRange: null,
  activeRegexIndex: 0,
  regexMatches: null,
  box: null,
  input: null,
  countEl: null,
  styleIn: null,
  options: null,
  cssSel: "::selection{background:#ff9632;}",
  cssOut: ".vimiumFindMode body{-webkit-user-select:auto !important;}\n.vimiumFindMode ",
  cssIFrame: '*{font:normal normal normal 12px Helvetica,Arial,sans-serif !important;\
height:14px;line-height:12px;margin:0;overflow-y:hidden;vertical-align:top;white-space:nowrap;cursor:default;}\
body{cursor:text;display:inline-block;padding:0 3px 0 1px;min-width:7px;}body *{cursor:text;display:inline;}body br{display:none;}',
  activate: function(options) {
    if (!document.body) { return false; }
    options = Object.setPrototypeOf(options || {}, null);
    var query = options.query;
    if (this.isActive) {
      if (query != null) {
        this.findAndFocus(this.query || query, {dir: options.dir || 1, count: options.count || 1});
        return;
      }
      this.box.contentWindow.focus();
      this.input.focus();
      this.box.contentDocument.execCommand("selectAll", false);
      return;
    }

    query !== this.query && VMarks.setPreviousPosition();
    this.options = options;
    if (query != null) {
      this.findAndFocus(query, options);
      return;
    }
    if (options.returnToViewport) {
    this.scrollX = window.scrollX;
    this.scrollY = window.scrollY;
    }
    this.parsedQuery = this.query = "";
    this.regexMatches = null;
    this.activeRegexIndex = 0;
    this.getCurrentRange();
    this.init && this.init();

    var el, wnd, doc;
    el = this.box = VDom.createElement("iframe");
    el.className = "R HUD LS";
    el.style.width = "0px";
    VHUD.box ? VDom.UI.root.insertBefore(el, VHUD.box) : VDom.UI.addElement(el);
    wnd = el.contentWindow;
    wnd.onmousedown = el.onmousedown = this.OnMousedown;
    wnd.onkeydown = this.onKeydown.bind(this);
    wnd.onfocus = VEventMode.on("WndFocus");
    doc = wnd.document;
    el = this.input = doc.body;
    el.contentEditable = "plaintext-only";
    el.oninput = this.onInput.bind(this);
    doc.documentElement.appendChild(this.countEl = doc.createElement("span"));
    
    el = VDom.UI.createStyle(this.cssIFrame, doc);
    doc.head.appendChild(el);
    doc.documentElement.insertBefore(new wnd.Text("/"), doc.body);

    VDom.UI.focus(this.input);
    this.isActive = true;
  },
  init: function() {
    var ref = this.postMode, UI = VDom.UI;
    ref.exit = ref.exit.bind(ref);
    this.styleIn = UI.createStyle(this.cssSel);
    UI.init && UI.init(false);
    UI.box.appendChild(UI.createStyle(this.cssOut + this.cssSel));
    UI.adjust();
    this.init = null;
  },
  findAndFocus: function(query, options) {
    if (query !== this.query) {
      this.updateQuery(query);
      if (this.isActive) {
        this.input.textContent = query.replace(/^ /, '\xa0');
        this.showCount();
      }
    }
    this.init && this.init();
    var style = this.isActive || VHUD.opacity !== 1 ? null : VHUD.box.style;
    style && (style.visibility = "hidden");
    this.execute(null, options);
    style && (style.visibility = "");
    if (!this.hasResults) {
      this.isActive || VHUD.showForDuration("No matches for '" + this.query + "'", 1000);
      return;
    }
    this.focusFoundLink(window.getSelection().anchorNode);
    this.postMode.activate();
  },
  deactivate: function() { // need keep @hasResults
    this.checkReturnToViewPort();
    window.focus();
    var el = VDom.getSelectionFocusElement();
    el && el.focus();
    this.box.remove();
    if (this.box === VDom.lastHovered) { VDom.lastHovered = null; }
    this.box = this.input = this.countEl = this.options = null;
    this.styleIn.remove();
    this.parsedQuery = this.query = "";
    this.initialRange = this.regexMatches = null;
    this.historyIndex = this.matchCount = this.scrollY = this.scrollX = 0;
    this.isActive = false;
    return el;
  },
  OnMousedown: function(event) { if (event.target !== VFindMode.input) { event.preventDefault(); VFindMode.input.focus(); } },
  onKeydown: function(event) {
    var i = event.keyCode, n = i, el, el2;
    i = event.altKey ? 0 : i === VKeyCodes.enter ? (this.saveQuery(), 2)
      : (i === VKeyCodes.backspace || i === VKeyCodes.deleteKey) ? +!this.query.length
      : 0;
    if (!i) {
      if (!VKeyboard.isPlain(event)) {
        if (event.shiftKey || !(event.ctrlKey || event.metaKey)) { return; }
        else if (n >= 74 && n <= 75) { this.execute(null, { dir: 74 - n }); }
        else { return; }
      }
      else if (n === VKeyCodes.f1) { this.box.contentDocument.execCommand("delete"); }
      else if (n === VKeyCodes.f1 + 1) { window.focus(); }
      else if (n === VKeyCodes.esc) { i = 3; }
      else if (n === VKeyCodes.up || n === VKeyCodes.down) { this.nextQuery(n === VKeyCodes.up ? 1 : -1); }
      else { return; }
    }
    VUtils.Prevent(event);
    if (!i) { return; }
    var hasStyle = !!this.styleIn.parentNode;
    el = this.deactivate();
    if ((i === 3 || !this.hasResults) && hasStyle) {
      this.toggleStyle("remove");
      this.restoreSelection(true);
    }
    if (i < 2 || !this.hasResults) { return; }
    if (!el || el !== VEventMode.lock()) {
      el = window.getSelection().anchorNode;
      if (el && !this.focusFoundLink(el) && i === 3 && (el2 = document.activeElement)) {
        VDom.getEditableType(el2) === 3 && el.contains(el2) && VDom.UI.simulateSelect(el2);
      }
    }
    i === 2 && this.postMode.activate();
  },
  focusFoundLink: function(el) {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el instanceof HTMLAnchorElement) {
        el.focus();
        return true;
      }
    }
  },
  nextQuery: function(dir) {
    var ind = this.historyIndex + dir;
    if (ind < 0) { return; }
    this.historyIndex = ind;
    if (dir < 0) {
      this.box.contentDocument.execCommand("undo", false);
      this.box.contentWindow.getSelection().collapseToEnd();
      return;
    }
    VPort.sendMessage({ handler: "findQuery", index: ind }, this.SetQuery);
  },
  SetQuery: function(query) {
    var _this = VFindMode, doc;
    if (query === _this.query) { return; }
    if (!query && _this.historyIndex > 0) { --_this.historyIndex; return; }
    (doc = _this.box.contentDocument).execCommand("selectAll", false);
    doc.execCommand("insertText", false, query.replace(/^ /, '\xa0'));
    _this.onInput();
  },
  saveQuery: function() {
    this.query && VPort.port.postMessage({ handler: "findQuery", query: this.query });
  },
  postMode: {
    lock: null,
    activate: function() {
      var el = VEventMode.lock(), Exit = this.exit;
      if (!el || el === Vomnibar.input) { Exit(); return; }
      VHandler.push(this.onKeydown, this);
      if (el === this.lock) { return; }
      if (!this.lock) {
        addEventListener("click", Exit, true);
        VEventMode.setupSuppress(Exit);
      }
      Exit(true);
      this.lock = el;
      el.addEventListener("blur", Exit, true);
    },
    onKeydown: function(event) {
      var exit = event.keyCode === VKeyCodes.esc && VKeyboard.isPlain(event);
      exit ? this.exit() : VHandler.remove(this);
      return 2 * exit;
    },
    exit: function(skip) {
      if (skip instanceof Event && skip.isTrusted === false) { return; }
      this.lock && this.lock.removeEventListener("blur", this.exit, true);
      if (!this.lock || skip === true) { return; }
      this.lock = null;
      removeEventListener("click", this.exit, true);
      VHandler.remove(this);
      VEventMode.exitSuppress();
    }
  },
  onInput: function() {
    var query = this.input.textContent.replace('\xa0', " ");
    this.checkReturnToViewPort();
    this.updateQuery(query);
    this.restoreSelection();
    this.execute(!this.isRegex ? this.parsedQuery : this.regexMatches ? this.regexMatches[0] : "");
    this.showCount();
  },
  showCount: function() {
    var count = this.matchCount;
    this.countEl.textContent = this.parsedQuery ? "(" + (count || (this.hasResults ? "Some" : "No")) + " match" + (count !== 1 ? "es)" : ")") : "";
    count = this.input.getBoundingClientRect().width + this.countEl.getBoundingClientRect().width;
    this.box.style.width = (count | 0) + 4 + "px";
  },
  checkReturnToViewPort: function() {
    this.options.returnToViewport && window.scrollTo(this.scrollX, this.scrollY);
  },
  _ctrlRe: /(\\\\?)([rRI]?)/g,
  escapeAllRe: /[$()*+.?\[\\\]\^{|}]/g,
  updateQuery: function(query) {
    this.query = query;
    this.isRegex = this.options ? this.options.isRegex : false;
    this.hasNoIgnoreCaseFlag = false;
    query = this.parsedQuery = query.replace(this._ctrlRe, this.FormatQuery);
    this.ignoreCase = !this.hasNoIgnoreCaseFlag && !/[A-Z]/.test(query);
    this.isRegex || (query = this.isActive && query.replace(this.escapeAllRe, "\\$&"));

    var re, matches;
    if (query) {
      try { re = new RegExp(query, this.ignoreCase ? "gi" : "g"); } catch (e) {}
    }
    matches = re && (document.webkitFullscreenElement || document.documentElement).innerText.match(re);
    this.regexMatches = this.isRegex && matches || null;
    this.activeRegexIndex = 0;
    this.matchCount = matches ? matches.length : 0;
  },
  FormatQuery: function(match, slashes, flag) {
    if (!flag || slashes.length != 1) { return match; }
    if (flag === 'I') { VFindMode.hasNoIgnoreCaseFlag = true; }
    else { VFindMode.isRegex = flag === 'r'; }
    return "";
  },
  restoreSelection: function(isCur) {
    var sel = window.getSelection(), range;
    range = !isCur ? this.initialRange : sel.isCollapsed ? null : sel.getRangeAt(0);
    if (!range) { return; }
    sel.removeAllRanges();
    sel.addRange(range);
  },
  getNextQueryFromRegexMatches: function(dir) {
    if (!this.regexMatches) { return ""; }
    var count = this.matchCount;
    this.activeRegexIndex = count = (this.activeRegexIndex + dir + count) % count;
    return this.regexMatches[count];
  },
  execute: function(query, options) {
    options || (options = {});
    var el, found, count = options.count | 0, dir = options.dir || 1, q;
    options.noColor || this.toggleStyle('add');
    do {
      q = query != null ? query : this.isRegex ? this.getNextQueryFromRegexMatches(dir) : this.parsedQuery;
      found = window.find(q, options.caseSensitive || !this.ignoreCase, dir < 0, true, false, true, false);
    } while (0 < --count && found);
    options.noColor || setTimeout(this.hookSel.bind(this, "add"), 0);
    (el = VEventMode.lock()) && VDom.getEditableType(el) > 1 && !VDom.isSelected(document.activeElement) && el.blur();
    this.hasResults = found;
  },
  RestoreHighlight: function() { VFindMode.toggleStyle('remove'); },
  hookSel: function(action) { document[action + "EventListener"]("selectionchange", this.RestoreHighlight, true); },
  toggleStyle: function(action) {
    this.hookSel("remove");
    document.documentElement.classList[action]("vimiumFindMode");
    action !== "add" ? this.styleIn && this.styleIn.remove() :
    VDom.UI.root && VDom.UI.addElement(this.styleIn);
  },
  getCurrentRange: function() {
    var sel = window.getSelection(), range;
    if (sel.type == "None") {
      range = this.initialRange = document.createRange();
      range.setStart(document.body, 0);
      range.setEnd(document.body, 0);
    } else {
      sel.type == "Range" && sel.collapseToStart();
      this.initialRange = sel.getRangeAt(0);
    }
  }
};
