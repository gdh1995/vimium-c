"use strict";

var $, ExclusionRulesOption, bgSettings, bgExclusions, BG,
KeyRe = /<(?:(?:a-(?:c-)?(?:m-)?|c-(?:m-)?|m-)(?:[A-Z][0-9A-Z]+|[a-z][0-9a-z]+|[^\s])|[A-Z][0-9A-Z]+|[a-z][0-9a-z]+)>|[^\s]/g,
__hasProp = Object.prototype.hasOwnProperty,
__extends = function(child, parent) {
  for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
  function Ctor() { this.constructor = child; } Ctor.prototype = parent.prototype;
  child.prototype = new Ctor(); child.__super__ = parent.prototype;
  return child;
};

$ = document.getElementById.bind(document);
BG = chrome.extension.getBackgroundPage();
bgSettings = BG.Settings;
bgExclusions = BG.Exclusions;
$("exclusionScrollBox").innerHTML = bgSettings.get("exclusionTemplate");

function Option(element, onUpdated) {
  this.element = element;
  this.field = element.id;
  if (this.field in bgSettings.bufferToLoad) {
    this.onUpdated1 = onUpdated;
    onUpdated = this._onUpdated;
  }
  this.onUpdated = onUpdated.bind(this);
  this.previous = null;
  this.fetch();
  Option.all.push(this);
}

Option.all = [];
Option.syncToFrontend = [];

Option.prototype._onUpdated = function() {
  this.onUpdated1();
  Settings.values[this.field] = this.readValueFromElement();
};

Option.prototype.fetch = function() {
  this.populateElement(this.previous = bgSettings.get(this.field));
};

Option.prototype.save = function() {
  var value = this.readValueFromElement();
  if (!this.areEqual(value, this.previous)) {
    bgSettings.set(this.field, this.previous = value);
    value = bgSettings.get(this.field);
    if (this.previous !== value) {
      this.populateElement(this.previous = value);
    }
    if (this.field in bgSettings.bufferToLoad) {
      Option.syncToFrontend.push(this.field);
    }
  }
};

Option.prototype.areEqual = function(a, b) {
  return a === b;
};

Option.areJSONEqual = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
};

function ExclusionRulesOption() {
  var _this = this;
  this.template = $('exclusionRuleTemplate').content.children[0];
  ExclusionRulesOption.__super__.constructor.apply(this, arguments);
  $("exclusionAddButton").addEventListener("click", function() { _this.addRule(null); });
  this.element.addEventListener("input", this.onUpdated);
  this.element.addEventListener("click", function(e) { _this.onRemoveRow(e); });
}
__extends(ExclusionRulesOption, Option);

ExclusionRulesOption.prototype.addRule = function(pattern) {
  var element, exclusionScrollBox;
  element = this.appendRule(this.element, {
    pattern: pattern || "",
    passKeys: ""
  });
  this.getPattern(element).focus();
  exclusionScrollBox = this.element.parentElement;
  exclusionScrollBox.scrollTop = exclusionScrollBox.scrollHeight;
  if (pattern) {
    this.onUpdated();
  }
  return element;
};

ExclusionRulesOption.prototype.populateElement = function(rules) {
  var frag = document.createDocumentFragment(), head;
  head = this.element.querySelector('tr');
  frag.appendChild(head);
  this.element.textContent = "";
  rules.forEach(this.appendRule.bind(this, frag));
  this.element.appendChild(frag);
};

ExclusionRulesOption.prototype.appendRule = function(list, rule) {
  var row;
  row = document.importNode(this.template, true);
  row.querySelector('.pattern').value = rule.pattern;
  row.querySelector('.passKeys').value = rule.passKeys;
  list.appendChild(row);
  return row;
};

ExclusionRulesOption.prototype.onRemoveRow = function(event) {
  if (!event.target.classList.contains("exclusionRemoveButton")) {
    return;
  }
  var row1 = event.target.parentNode.parentNode;
  if (row1.classList.contains("exclusionRuleInstance")) {
    row1.remove();
    this.onUpdated();
  }
};

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
  if (JSON.stringify(rules) === JSON.stringify(bgSettings.defaults[this.field])) {
    rules = bgSettings.defaults[this.field];
  }
  return rules;
};

ExclusionRulesOption.prototype.flatten = function(rule) {
  return (rule && rule.pattern) ? (rule.pattern + "\r" + rule.passKeys) : "";
};

ExclusionRulesOption.prototype.areEqual = Option.areJSONEqual;

ExclusionRulesOption.prototype.getPattern = function(element) {
  return element.querySelector(".pattern");
};

ExclusionRulesOption.prototype.getPassKeys = function(element) {
  return element.querySelector(".passKeys");
};

if (location.pathname.indexOf("/popup.html", location.pathname.length - 11) !== -1) {
chrome.tabs.query({currentWindow: true, active: true}, function(tab) {
  var exclusions, onUpdated, saveOptions, updateState, url, status = 0;

exclusions = {
  url: "",
  hasNew: false,
  init: function(url, element, onUpdated) {
    this.url = url;
    this.__proto__ = ExclusionRulesOption.prototype;
    ExclusionRulesOption.call(this, element, onUpdated);
    this.element.addEventListener("input", this.OnInput);
    this.init = null;
  },
  addRule: function() {
    this.__proto__.addRule.call(this, this.generateDefaultPattern());
  },
  populateElement: function(rules) {
    var element, elements, haveMatch, pattern, _i, _len;
    this.__proto__.populateElement.call(this, rules);
    elements = this.element.getElementsByClassName("exclusionRuleInstance");
    haveMatch = -1;
    for (_i = 0, _len = elements.length; _i < _len; _i++) {
      element = elements[_i];
      pattern = this.getPattern(element).value.trim();
      if (bgExclusions.re[pattern](this.url)) {
        haveMatch = _i;
      } else {
        element.style.display = "none";
      }
    }
    if (haveMatch >= 0) {
      this.getPassKeys(elements[haveMatch]).focus();
    } else {
      this.hasNew = true;
      this.addRule();
    }
  },
  OnInput: function(event) {
    var patternElement = event.target;
    if (!patternElement.classList.contains("pattern")) {
      return;
    }
    if (bgExclusions.getRe(patternElement.value)(this.url)) {
      patternElement.title = patternElement.style.color = "";
    } else {
      patternElement.style.color = "red";
      patternElement.title = "Red text means that the pattern does not\nmatch the current URL.";
    }
  },
  httpRe: /^https?:\/\/./,
  urlRe: /^[a-z]{3,}:\/\/./,
  generateDefaultPattern: function() {
    var url = this.httpRe.test(this.url)
      ? ("https?://" + this.url.split("/", 3)[2] + "/")
      : this.urlRe.test(this.url)
      ? (this.url.split("/", 3).join("/") + "/")
      : this.url;
    this.generateDefaultPattern = function() { return url; };
    return url;
  }
};

  tab = tab[0];
  url = bgSettings.urlForTab[tab.id] || tab.url;
  var escapeRe = /[&<>]/g, escapeCallback = function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  };
  updateState = function() {
    var pass = bgExclusions.getTemp(url, exclusions.readValueFromElement(true));
    $("state").innerHTML = "Vimium++ will " + (pass
      ? "exclude: <span class='code'>" + pass.replace(escapeRe, escapeCallback) + "</span>"
      : pass !== null ? "be disabled" : "be enabled");
  };
  onUpdated = function() {
    if (status != 1) {
      status = 1;
      var btn = $("saveOptions");
      $("helpText").innerHTML = "Type <strong>Ctrl-Enter</strong> to save and close.";
      btn.removeAttribute("disabled");
      btn.textContent = "Save Changes";
    }
    if (!exclusions.init) {
      exclusions.hasNew = true;
      updateState();
    }
  };
  saveOptions = function() {
    var btn = $("saveOptions");
    if (btn.disabled) {
      return;
    }
    exclusions.save();
    exclusions.hasNew = true;
    btn.textContent = "Saved";
    btn.disabled = true;
    status = 0;
    // Here, since the popup page is showing, needIcon must be true.
    // Although the tab calls window.onfocus after this popup page closes,
    // it is too early for the tab to know new exclusion rules.
    BG.g_requestHandlers.SetIcon(tab.id, null, bgExclusions.getPattern(url));
  };
  $("saveOptions").onclick = saveOptions;
  document.addEventListener("keyup", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.keyCode === 13) {
      if (status === 1) {
        saveOptions();
      }
      setTimeout(window.close, 300);
    }
  });
  exclusions.init(url, $("exclusionRules"), onUpdated);
  updateState();
  var link = $("optionsLink");
  link.href = bgSettings.CONST.OptionsPage;
  link.onclick = function(event) {
    BG.g_requestHandlers.focusOrLaunch({ url: this.href });
    event.preventDefault();
    event.stopImmediatePropagation();
    window.close();
  };
  window.onunload = function() {
    if (exclusions.hasNew) {
      bgExclusions.rebuildRe();
    }
  };
});

}
