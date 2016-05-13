"use strict";
var VFindMode = {
  isActive: false,
  query: "",
  parsedQuery: "",
  partialQuery: "",
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
  cssIFrame: '*{font:normal normal normal 12px "Helvetica Neue",Helvetica,Arial,sans-serif !important;\
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
      this.box.contentWindow.getSelection().selectAllChildren(this.input);
      return;
    }

    query !== this.query && Marks.setPreviousPosition();
    this.init && this.init();
    this.options = options;
    if (query != null) {
      this.findAndFocus(query, options);
      return;
    }
    this.scrollX = window.scrollX;
    this.scrollY = window.scrollY;
    this.parsedQuery = this.query = "";
    this.regexMatches = null;
    this.activeRegexIndex = 0;
    this.getCurrentRange();

    var el, wnd, doc;
    DomUtils.UI.addElement(el = this.box = DomUtils.createElement("iframe"));
    DomUtils.UI.root.insertBefore(el, VHUD.box);
    el.className = "R HUD";
    el.style.width = "0px";
    el.onmousedown = this.OnMousedown;
    wnd = el.contentWindow;
    wnd.onmousedown = this.OnMousedown;
    wnd.onkeydown = this.onKeydown.bind(this);
    doc = wnd.document;
    el = this.input = doc.body;
    el.contentEditable = "plaintext-only";
    el.oninput = this.onInput.bind(this);
    doc.documentElement.appendChild(this.countEl = doc.createElement("span"));
    
    el = DomUtils.UI.createStyle(this.cssIFrame, doc);
    doc.head.appendChild(el);
    doc.documentElement.insertBefore(new wnd.Text("/"), doc.body);

    DomUtils.UI.focus(this.input);
    this.isActive = true;
  },
  init: function() {
    var ref = this.postMode, UI = DomUtils.UI;
    ref.exit = ref.exit.bind(ref);
    this.styleIn = UI.createStyle(this.cssSel);
    UI.init && UI.init();
    UI.box.appendChild(UI.createStyle(".vimiumFindMode " + this.cssSel));
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
    this.execute(null, options);
    if (!this.hasResults) {
      this.isActive || VHUD.showForDuration("No matches for '" + this.query + "'", 1000);
      return;
    }
    this.focusFoundLink(window.getSelection().anchorNode);
    this.postMode.activate();
  },
  refocus: function() {
    this.checkReturnToViewPort();
    window.focus();
    var el = DomUtils.getSelectionFocusElement();
    el && el.focus();
    this.exit();
    return el;
  },
  exit: function() { // need keep @hasResults
    this.box.remove();
    this.box = this.input = this.countEl = this.options = null;
    this.styleIn.remove();
    this.partialQuery = this.parsedQuery = this.query = "";
    this.initialRange = this.regexMatches = null;
    this.historyIndex = this.matchCount = 0;
    this.isActive = false;
  },
  OnMousedown: function(event) { if (event.target !== VFindMode.input) { event.preventDefault(); VFindMode.input.focus(); } },
  onKeydown: function(event) {
    var i = event.keyCode, n = i, el, el2;
    i = event.altKey ? 0 : i === KeyCodes.enter ? (this.saveQuery(), 2)
      : (i === KeyCodes.backspace || i === KeyCodes.deleteKey) ? +!this.query.length
      : 0;
    if (!i) {
      if (!KeyboardUtils.isPlain(event)) {
        if (event.shiftKey || !(event.ctrlKey || event.metaKey)) { return; }
        else if (n === 74 || n === 78 || n === 75 || n === 80) { this.execute(null, {dir: (n % 5) ? 1 : -1 }); }
      }
      else if (n === KeyCodes.f1) { this.box.contentDocument.execCommand("delete"); }
      else if (n === KeyCodes.f1 + 1) { window.focus(); }
      else if (n === KeyCodes.esc) { i = 3; }
      else if (n === KeyCodes.up || n === KeyCodes.down) { this.nextQuery(n === KeyCodes.up ? 1 : -1); }
      else { return; }
    }
    DomUtils.suppressEvent(event);
    if (!i) { return; }
    var hasStyle = !!this.styleIn.parentNode;
    el = this.refocus();
    if (i < 2 || !this.hasResults) { return; }
    if (i === 3 && hasStyle) {
      this.toggleStyle("remove");
      this.restoreSelection(true);
    }
    if (!el || el !== VInsertMode.lock) {
      el = window.getSelection().anchorNode;
      if (el && !this.focusFoundLink(el) && i === 3 && (el2 = document.activeElement)) {
        DomUtils.getEditableType(el2) === 3 && el.contains(el2) && DomUtils.UI.simulateSelect(el2);
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
    var ind = this.historyIndex + dir, query;
    if (ind === 1 && dir > 0) { this.partialQuery = this.query; }
    else if (ind < 1) { query = ind < 0 ? (ind = 0, this.query) : this.partialQuery; }
    this.historyIndex = ind;
    if (ind < 1) { this.SetQuery(query); return; }
    MainPort.sendMessage({ handler: "findQuery", index: ind }, this.SetQuery );
  },
  SetQuery: function(query) {
    var _this = VFindMode, sel;
    if (query === _this.query) { return; }
    if (!query && _this.historyIndex > 0) { --_this.historyIndex; return; }
    _this.input.textContent = query.replace(/^ /, '\xa0');
    sel = _this.box.contentWindow.getSelection();
    sel.selectAllChildren(_this.input);
    sel.collapseToEnd();
    _this.onInput();
  },
  saveQuery: function() {
    this.query && MainPort.port.postMessage({ handler: "findQuery", query: this.query });
  },
  postMode: {
    lock: null,
    activate: function() {
      var el = VInsertMode.lock, Exit = this.exit;
      if (!el || el === Vomnibar.input) { Exit(); return; }
      handlerStack.push(this.onKeydown, this);
      if (el === this.lock) { return; }
      if (!this.lock) {
        addEventListener("click", Exit, true);
        VInsertMode.setupSuppress(Exit);
      }
      this.exit(true);
      this.lock = el;
      el.addEventListener("blur", Exit, true);
    },
    onKeydown: function(event) {
      var exit = event.keyCode === KeyCodes.esc && KeyboardUtils.isPlain(event);
      exit ? this.exit() : handlerStack.remove(this);
      return 2 * exit;
    },
    exit: function(skip) {
      this.lock && this.lock.removeEventListener("blur", this.exit, true);
      if (!this.lock || skip === true) { return; }
      this.lock = null;
      removeEventListener("click", this.exit, true);
      handlerStack.remove(this);
      VInsertMode.exitSuppress();
    }
  },
  onInput: function() {
    var query = this.input.textContent.replace('\xa0', " "), count;
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
  escapeAllRe: /[\$\(\)\*\+\.\?\[\\\]\^\{\|\}]/g,
  updateQuery: function(query) {
    this.query = query;
    this.isRegex = this.options.isRegex;
    this.hasNoIgnoreCaseFlag = false;
    query = this.parsedQuery = query.replace(this._ctrlRe, this.FormatQuery);
    this.ignoreCase = !this.hasNoIgnoreCaseFlag && !/[A-Z]/.test(query);
    this.isRegex || (query = query.replace(this.escapeAllRe, "\\$&"));

    var re, matches;
    try {
      re = query && new RegExp(query, this.ignoreCase ? "gi" : "g");
    } catch (e) {}
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
    sel.removeAllRanges()
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
    (el = VInsertMode.lock) && DomUtils.getEditableType(el) > 1 && !DomUtils.isSelected(document.activeElement) && el.blur();
    return this.hasResults = found;
  },
  RestoreHighlight: function() { VFindMode.toggleStyle('remove'); },
  hookSel: function(action) { document[action + "EventListener"]("selectionchange", this.RestoreHighlight, true); },
  toggleStyle: function(action) {
    this.hookSel("remove");
    document.documentElement.classList[action]("vimiumFindMode");
    action !== "add" ? this.styleIn.remove() : (this.isActive || DomUtils.UI.root) && DomUtils.UI.addElement(this.styleIn);
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
