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
  activate: function(count, options) {
    this.options = Object.setPrototypeOf(options || {}, null);
    this.getCurrentRange();
    this.query = "";
    this.scrollX = window.scrollX;
    this.scrollY = window.scrollY;
    if (this.isActive) {
      this.input.focus();
      this.box.contentWindow.getSelection().selectAllChildren(this.input);
      return;
    }

    var el, wnd, doc;
    DomUtils.UI.addElement(el = this.box = DomUtils.createElement("iframe"));
    el.className = "R HUD";
    el.style.width = "0px";
    wnd = el.contentWindow;
    wnd.onmousedown = this.OnMousedown;
    wnd.onkeydown = this.onKeydown.bind(this);
    doc = wnd.document;
    el = this.input = VInsertMode.heldEl = doc.body;
    el.contentEditable = "plaintext-only";
    el.oninput = this.onInput.bind(this);
    doc.documentElement.appendChild(this.countEl = doc.createElement("span"));
    
    el = DomUtils.UI.createStyle('*{font:normal normal normal 12px "Helvetica Neue",Helvetica,Arial,sans-serif !important;\
height:12px;line-height:12px;margin:0;overflow-y:hidden;white-space:nowrap;}\
body{display:inline;margin-left:1px;}body *{display:inline;}body br{display:none;}', doc);
    doc.head.appendChild(el);
    doc.documentElement.insertBefore(new wnd.Text("/"), doc.body);

    this.init && this.init();
    if (DomUtils.UI.box.style.display !== "none") {
      this.input.focus();
    }
    this.isActive = true;
  },
  init: function() {
    var ref = this.postMode, el, css;
    ref.exit = ref.exit.bind(ref);
    this.styleIn = DomUtils.UI.createStyle(css = "::selection{background:#ff9632;}");
    el = DomUtils.UI.createStyle(".vimiumFindMode " + css);
    DomUtils.UI.box.appendChild(el);
    this.init = null;
  },
  findAndFocus: function(count, backwards) {
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
    removeEventListener("click", this.OnClick, true);
    this.box.remove();
    this.parsedQuery = this.query = "";
    VInsertMode.heldEl = this.initialRange = this.regexMatches = null;
    this.matchCount = 0;
    this.isActive = false;
  },
  OnMousedown: function(event) { if (event.target !== VFindMode.input) { DomUtils.suppressEvent(event); } },
  onKeydown: function(event) {
    var i = event.keyCode, el, el2;
    i = event.altKey ? 0 : i === KeyCodes.enter ? (this.saveQuery(), 2)
      : (i === KeyCodes.backspace || i === KeyCodes.deleteKey) ? +!this.query.length
      : i === KeyCodes.esc && KeyboardUtils.isPlain(event) ? 3 : 0;
    if (!i) { return; }
    DomUtils.suppressEvent(event);
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
  },
  postMode: {
    lock: null,
    first: true,
    activate: function() {
      var el = VInsertMode.lock, Exit = this.exit;
      this.lock && Exit();
      if (!el || DomUtils.getEditableType(el) < 2) { return; }
      // TODO: onblur won't be called on Vomnibar.input
      el.addEventListener("blur", Exit);
      this.lock = el;
      this.first = true;
      addEventListener("click", Exit, true);
      VInsertMode.setupSuppress(Exit);
      handlerStack.push(this.onKeydown, this);
    },
    onKeydown: function(event) {
      if (!this.first) {}
      else if (event.keyCode === KeyCodes.esc && KeyboardUtils.isPlain(event)) {
        this.exit();
      } else {
        this.first = false;
      }
      return 2;
    },
    exit: function() {
      this.lock.removeEventListener("blur", this.exit, true);
      this.lock = null;
      removeEventListener("click", this.exit, true);
      VInsertMode.exitSuppress();
      handlerStack.remove(this);
    }
  },
  onInput: function() {
    var query = this.query = this.input.textContent.replace("\u00A0", " "), count;
    this.checkReturnToViewPort();
    this.updateQuery();
    this.restoreSelection();
    this.execute(this.isRegex ? this.getNextQueryFromRegexMatches(0) : this.parsedQuery);
    count = this.matchCount;
    this.countEl.textContent = query ? " (" + (count || "No") + " match" + (count !== 1 ? "es)" : ")") : "";
    var count = this.input.getBoundingClientRect().width + this.countEl.getBoundingClientRect().width;
    this.box.style.width = (count | 0) + 4 + "px";
  },
  checkReturnToViewPort: function() {
    this.options.returnToViewport && window.scrollTo(this.scrollX, this.scrollY);
  },
  _ctrlRe: /(\\\\?)([rRI]?)/g,
  escapeAllRe: /[\$\(\)\*\+\.\?\[\\\]\^\{\|\}]/g,
  updateQuery: function() {
    this.isRegex = Settings.cache.regexFindMode;
    this.hasNoIgnoreCaseFlag = false;
    var query = this.parsedQuery = this.query.replace(this._ctrlRe, this.FormatQuery);
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
  getNextQueryFromRegexMatches: function(step) {
    if (!this.regexMatches) { return ""; }
    var count = this.matchCount;
    this.activeRegexIndex = count = (this.activeRegexIndex + step + count) % count;
    return this.regexMatches[count];
  },
  execute: function(query, options) {
    var el;
    options || (options = {});
    options.noColor || this.toggleStyle('add');
    this.hasResults = window.find(query, options.caseSensitive || !this.ignoreCase
      , !!options.backwards, true, false, true, false);
    options.noColor || setTimeout(this.bindSel.bind(this, "add", 0), 0);
    (el = VInsertMode.lock) && DomUtils.getEditableType(el) > 1 && !DomUtils.isSelected(document.activeElement) && el.blur();
  },
  RestoreHighlight: function() { VFindMode.toggleStyle('remove'); },
  bindSel: function(action) { document[action + "EventListener"]("selectionchange", this.RestoreHighlight, true); },
  toggleStyle: function(action) {
    this.bindSel("remove");
    document.documentElement.classList[action]("vimiumFindMode");
    action === "add" ? DomUtils.UI.addElement(this.styleIn) : this.styleIn.remove();;
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
