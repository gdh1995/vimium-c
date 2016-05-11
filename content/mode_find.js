"use strict";
var VFindMode = {
  isActive: false,
  query: "",
  parsedQuery: "",
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
    if (!document.head) { return false; }
    if (this.isActive) {
      this.box.contentWindow.focus();
      this.input.focus();
      this.box.contentWindow.getSelection().selectAllChildren(this.input);
      return;
    }
    
    Marks.setPreviousPosition();
    this.init && this.init();
    this.options = Object.setPrototypeOf(options || {}, null);
    var query = options.query;
    if (query != null) {
      query !== this.query && this.updateQuery(query);
      this.execute(null, options);
      if (this.hasResults) {
        this.focusFoundLink(window.getSelection().anchorNode);
        this.postMode.activate();
      } else {
        VHUD.showForDuration("No matches for '" + query + "'", 1000);
      }
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
    this.parsedQuery = this.query = "";
    this.initialRange = this.regexMatches = null;
    this.matchCount = 0;
    this.isActive = false;
  },
  OnMousedown: function(event) { if (event.target !== VFindMode.input) { event.preventDefault(); VFindMode.input.focus(); } },
  onKeydown: function(event) {
    var i = event.keyCode, n = i, el, el2;
    i = event.altKey ? 0 : i === KeyCodes.enter ? (this.saveQuery(), 2)
      : (i === KeyCodes.backspace || i === KeyCodes.deleteKey) ? +!this.query.length
      : i === KeyCodes.esc && KeyboardUtils.isPlain(event) ? 3 : 0;
    if (!i) {
      if (!KeyboardUtils.isPlain(event)) { return; }
      if (n === KeyCodes.f1) { this.box.contentDocument.execCommand("delete"); }
      else if (n === KeyCodes.f1 + 1) { window.focus(); }
      else { return; }
    }
    DomUtils.suppressEvent(event);
    if (!i) { return; }
    el = this.refocus();
    if (i < 2 || !this.hasResults) { return; }
    if (i === 3 && this.styleIn.parentNode) {
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
  saveQuery: function() {
    Settings.set("findModeRawQuery", this.query);
  },
  postMode: {
    lock: null,
    activate: function() {
      var el = VInsertMode.lock, Exit = this.exit;
      Exit();
      if (!el || DomUtils.getEditableType(el) < 2) { return; }
      // TODO: onblur won't be called on Vomnibar.input
      el.addEventListener("blur", Exit);
      this.lock = el;
      addEventListener("click", Exit, true);
      VInsertMode.setupSuppress(Exit);
      handlerStack.push(this.onKeydown, this);
    },
    onKeydown: function(event) {
      var exit = event.keyCode === KeyCodes.esc && KeyboardUtils.isPlain(event);
      exit ? this.exit() : handlerStack.remove(this);
      return 2 * exit;
    },
    exit: function() {
      if (!this.lock) { return; }
      this.lock.removeEventListener("blur", this.exit, true);
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
    count = this.matchCount;
    this.countEl.textContent = this.parsedQuery ? "(" + (count || (this.hasResults ? "Some" : "No")) + " match" + (count !== 1 ? "es)" : ")") : "";
    count = this.input.getBoundingClientRect().width + this.countEl.getBoundingClientRect().width;
    this.box.style.width = (count | 0) + 4 + "px";
    // TODO: prevent VInsertMode from locking
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
      re = query && new RegExp(query, this.ignoreCase ? "g" : "gi");
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
  getQuery: function(dir) {
    return this.isRegex ? this.getNextQueryFromRegexMatches(dir) : this.parsedQuery;
  },
  execute: function(query, options) {
    options || (options = {});
    var el, found, count = options.count | 0, dir = options.dir || 1, q;
    options.noColor || this.toggleStyle('add');
    do {
      q = query != null ? query : this.getQuery(dir);
      found = window.find(q, options.caseSensitive || !this.ignoreCase, dir < 0, true, false, true, false);
    } while (0 < --count && found);
    options.noColor || setTimeout(this.bindSel.bind(this, "add", 0), 0);
    (el = VInsertMode.lock) && DomUtils.getEditableType(el) > 1 && !DomUtils.isSelected(document.activeElement) && el.blur();
    return this.hasResults = found;
  },
  RestoreHighlight: function() { VFindMode.toggleStyle('remove'); },
  bindSel: function(action) { document[action + "EventListener"]("selectionchange", this.RestoreHighlight, true); },
  toggleStyle: function(action) {
    this.bindSel("remove");
    document.documentElement.classList[action]("vimiumFindMode");
    action === "add" ? DomUtils.UI.addElement(this.styleIn) : this.styleIn.remove();
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
