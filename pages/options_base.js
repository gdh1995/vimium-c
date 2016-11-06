"use strict";

var $, bgSettings, BG,
KeyRe = /<(?!<)(?:a-)?(?:c-)?(?:m-)?(?:[A-Z][0-9A-Z]+|[a-z][0-9a-z]+|\S)>|\S/g,
__extends = function(child, parent) {
  Object.setPrototypeOf(child.prototype, parent.prototype);
  child.__super__ = parent.prototype;
};

$ = document.getElementById.bind(document);
BG = chrome.extension.getBackgroundPage();
bgSettings = BG.Settings;

function Option(element, onUpdated) {
  this.element = element;
  this.field = element.id;
  if (this.field in bgSettings.bufferToLoad) {
    this.onUpdated1 = onUpdated;
    onUpdated = this._onUpdated;
  }
  this.onUpdated = onUpdated.bind(this);
  this.previous = null;
  this.saved = true;
  this.fetch();
  Option.all[this.field] = this;
}

Option.all = Object.create(null);

Option.prototype.fetch = function() {
  this.populateElement(this.previous = bgSettings.get(this.field));
  this.saved = true;
};

Option.prototype.save = function() {
  var value = this.readValueFromElement(), previous = this.previous, notJSON = true;
  if (typeof value === "object") {
    value = JSON.stringify(value);
    previous = JSON.stringify(this.previous);
    if (value === previous) { return; }
    previous = value;
    notJSON = false;
    if (value === JSON.stringify(bgSettings.defaults[this.field])) {
      value = bgSettings.defaults[this.field];
    } else {
      value = BG.JSON.parse(value);
      if (this.checker) {
        value = this.checker.check(value);
      }
    }
  } else if (value === previous) {
    return;
  } else {
    previous = value;
    if (this.checker) {
      value = this.checker.check(value);
    }
  }
  bgSettings.set(this.field, value);
  this.previous = value = bgSettings.get(this.field);
  this.saved = true;
  if (previous !== (notJSON ? value : JSON.stringify(value))) {
    this.populateElement(value);
  }
  if (this.field in bgSettings.bufferToLoad) {
    Option.syncToFrontend.push(this.field);
  }
};

Option.areJSONEqual = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
};

function ExclusionRulesOption() {
  var _this = this;
  this.fetch = function() {};
  ExclusionRulesOption.__super__.constructor.apply(this, arguments);
  bgSettings.fetchFile("exclusionTemplate", function() {
    _this.element.innerHTML = bgSettings.cache.exclusionTemplate;
    _this.template = $('exclusionRuleTemplate').content.firstChild;
    _this.list = _this.element.getElementsByTagName('tbody')[0];
    delete _this.fetch;
    _this.fetch();
    _this.list.addEventListener("input", _this.onUpdated);
    _this.list.addEventListener("click", function(e) { _this.onRemoveRow(e); });
    $("exclusionAddButton").onclick = function() { _this.addRule(null); };
    _this.onInit();
  });
}
__extends(ExclusionRulesOption, Option);

ExclusionRulesOption.prototype.onRowChange = function() {};

ExclusionRulesOption.prototype.addRule = function(pattern) {
  var element;
  element = this.appendRule(this.list, {
    pattern: pattern || "",
    passKeys: ""
  });
  this.getPattern(element).focus();
  if (pattern) {
    this.onUpdated();
  }
  this.onRowChange(1);
  return element;
};

ExclusionRulesOption.prototype.populateElement = function(rules) {
  this.list.textContent = "";
  var frag = document.createDocumentFragment();
  rules.forEach(this.appendRule.bind(this, frag));
  this.list.appendChild(frag);
  this.onRowChange(rules.length);
};

ExclusionRulesOption.prototype.appendRule = function(list, rule) {
  var row, el, value;
  row = document.importNode(this.template, true);
  el = row.querySelector('.pattern');
  el.value = value = rule.pattern;
  if (!value) {
    el.placeholder = ":https://mail.google.com/";
  }
  el = row.querySelector('.passKeys');
  el.value = rule.passKeys.trimRight();
  if (!value) {
    el.placeholder = "f g j k";
    el.addEventListener("input", ExclusionRulesOption.OnNewPassKeyInput);
  }
  list.appendChild(row);
  return row;
};

ExclusionRulesOption.OnNewPassKeyInput = function() {
  this.removeEventListener("input", ExclusionRulesOption.OnNewPassKeyInput);
  this.title = "Example: " + this.placeholder;
  this.placeholder = "";
};

ExclusionRulesOption.prototype.onRemoveRow = function(event) {
  if (!event.target.classList.contains("exclusionRemoveButton")) {
    return;
  }
  var row1 = event.target.parentNode.parentNode;
  if (row1.classList.contains("exclusionRuleInstance")) {
    row1.remove();
    this.onUpdated();
    this.onRowChange(0);
  }
};

ExclusionRulesOption.prototype.reChar = /^[\^*]|[^\\][$()*+?\[\]{|}]/;
ExclusionRulesOption.prototype._escapeRe = /\\(.)/g;
ExclusionRulesOption.prototype.readValueFromElement = function(part) {
  var element, passKeys, pattern, rules, _i, _len, _ref, passArr;
  rules = [];
  _ref = this.element.getElementsByClassName("exclusionRuleInstance");
  part = (part === true);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    element = _ref[_i];
    if (part && element.style.display === "none") {
      continue;
    }
    pattern = this.getPattern(element).value.trim();
    if (!pattern) {
      continue;
    }
    if (pattern[0] === ":" || element.style.display === "none") {}
    else if (this.reChar.test(pattern)) {
      pattern = pattern[0] === "^" ? pattern
        : (pattern.indexOf("://") === -1 ? "^http://" : "^") +
          (pattern[0] === "*" ? "." + pattern : pattern);
    } else {
      pattern = pattern.replace(this._escapeRe, "$1");
      pattern = (pattern.indexOf("://") === -1 ? ":http://" : ":") + pattern;
    }
    passKeys = this.getPassKeys(element).value;
    if (passKeys) {
      passArr = passKeys.match(KeyRe);
      passKeys = passArr ? (passArr.sort().join(" ") + " ") : "";
    }
    rules.push({
      pattern: pattern,
      passKeys: passKeys
    });
  }
  return rules;
};

ExclusionRulesOption.prototype.areEqual = Option.areJSONEqual;

ExclusionRulesOption.prototype.getPattern = function(element) {
  return element.getElementsByClassName("pattern")[0];
};

ExclusionRulesOption.prototype.getPassKeys = function(element) {
  return element.getElementsByClassName("passKeys")[0];
};

if (location.pathname.indexOf("/popup.html", location.pathname.length - 11) !== -1)
chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
  var exclusions, onUpdated, saveOptions, updateState, status = 0, ref
    , bgExclusions = BG.Exclusions;

exclusions = Object.setPrototypeOf({
  url: "",
  init: function(url, element, onUpdated, onInit) {
    this.url = url;
    this.rebuildTesters();
    this.onInit = onInit;
    ExclusionRulesOption.call(this, element, onUpdated);
    this.element.addEventListener("input", this.OnInput);
    this.init = null;
  },
  rebuildTesters: function() {
    var rules = bgSettings.get("exclusionRules")
      , ref = bgExclusions.testers = Object.create(null)
      , ref2 = bgExclusions.rules, _i, _len;
    for (_i = 0, _len = rules.length; _i < _len; _i++) {
      ref[rules[_i].pattern] = ref2[_i * 2];
    }
    this.rebuildTesters = null;
  },
  addRule: function() {
    ExclusionRulesOption.prototype.addRule.call(this, this.generateDefaultPattern());
  },
  populateElement: function(rules) {
    var element, elements, haveMatch, pattern, _i, _len;
    ExclusionRulesOption.prototype.populateElement.call(this, rules);
    elements = this.element.getElementsByClassName("exclusionRuleInstance");
    haveMatch = -1;
    for (_i = 0, _len = elements.length; _i < _len; _i++) {
      element = elements[_i];
      pattern = this.getPattern(element).value.trim();
      if (bgExclusions.testers[pattern](this.url)) {
        haveMatch = _i;
      } else {
        element.style.display = "none";
      }
    }
    if (haveMatch >= 0) {
      this.getPassKeys(elements[haveMatch]).focus();
    } else {
      this.addRule();
    }
  },
  OnInput: function(event) {
    var patternElement = event.target;
    if (!patternElement.classList.contains("pattern")) {
      return;
    }
    if (bgExclusions.getRe(patternElement.value)(exclusions.url)) {
      patternElement.title = patternElement.style.color = "";
    } else {
      patternElement.style.color = "red";
      patternElement.title = "Red text means that the pattern does not\nmatch the current URL.";
    }
  },
  generateDefaultPattern: function() {
    var url = this.url.lastIndexOf("https:", 0) === 0
      ? "^https?://" + this.url.split("/", 3)[2].replace(/\./g, "\\.") + "/"
      : /^[^:]+:\/\/./.test(this.url)
      ? ":" + (this.url.split("/", 3).join("/") + "/")
      : ":" + this.url;
    this.generateDefaultPattern = function() { return url; };
    return url;
  }
}, ExclusionRulesOption.prototype);

  var escapeRe = /[&<>]/g, escapeCallback = function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  };
  updateState = function() {
    var pass = bgExclusions.getTemp(exclusions.url, exclusions.readValueFromElement(true));
    $("state").innerHTML = "Vimium++ will " + (pass
      ? "exclude: <span class='code'>" + pass.replace(escapeRe, escapeCallback) + "</span>"
      : pass !== null ? "be disabled" : "be enabled");
  };
  onUpdated = function() {
    if (status != 1) {
      status = 1;
      var btn = $("saveOptions");
      $("helpSpan").innerHTML = "Type <strong>Ctrl-Enter</strong> to save and close.";
      btn.removeAttribute("disabled");
      btn.firstChild.data = "Save Changes";
    }
    if (!exclusions.init) {
      updateState();
    }
  };
  saveOptions = function() {
    var btn = $("saveOptions"), testers;
    if (btn.disabled) {
      return;
    }
    testers = bgExclusions.testers;
    exclusions.save();
    bgExclusions.testers = testers;
    btn.firstChild.data = "Saved";
    btn.disabled = true;
    status = 0;
  };
  $("saveOptions").onclick = saveOptions;
  document.addEventListener("keyup", function(event) {
    if (event.ctrlKey && event.keyCode === 13) {
      if (status === 1) {
        saveOptions();
      }
      setTimeout(window.close, 300);
    }
  });
  ref = bgSettings.indexPorts(tabs[0].id);
  exclusions.init(ref ? ref[0].sender.url : tabs[0].url, $("exclusionRules"), onUpdated, updateState);
  ref = null;
  $("optionsLink").onclick = function(event) {
    event.preventDefault();
    BG.g_requestHandlers.focusOrLaunch({ url: this.href });
    window.close();
  };
  window.exclusions = exclusions;
  window.onunload = function() {
    bgExclusions.testers = null;
  };
});
