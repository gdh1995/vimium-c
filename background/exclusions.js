"use strict";
var Exclusions = {
  __proto__: null,
  re: {},
  _emptyStringRegex: /^$/,
  _starRegex: /\*/g,
  _caretRegex: /^\^/,
  _regChars: /[^\\][\[\]\|\(\)\^\$\*]|/,
  _escapeRegex: /\\./g,
  getRegex: function(pattern) {
    var regex = this.re[pattern];
    if (regex) { return regex; }
    if (!this._regChars.test(pattern)) {
      regex = this._startsWith.bind(pattern.replace(this._escapeRegex, "$&"));
    } else try {
      regex = new RegExp("^" + pattern.replace(this._starRegex, ".*").replace(this._caretRegex, ""));
      regex = regex.test.bind(regex);
    } catch (e) {
      regex = this._startsWith.bind(pattern);
    }
    return this.re[pattern] = regex;
  },
  _startsWith: function(url) {
    return url.startsWith(this);
  },
  _listening: false,
  rules: [],
  setRules: function(rules) {
    this.re = { __proto__: null };
    this.rules = this.Format(rules);
    if (this.rules.length === 0) {
      this.getPattern = this._getNull;
      chrome.webNavigation.onHistoryStateUpdated.removeListener(this.onURLChange);
      chrome.webNavigation.onReferenceFragmentUpdated.removeListener(this.onURLChange);
      this._listening = false;
      return;
    }
    if (!this._listening) {
      chrome.webNavigation.onHistoryStateUpdated.addListener(this.onURLChange);
      chrome.webNavigation.onReferenceFragmentUpdated.addListener(this.onURLChange);
      this._listening = true;
    }
    this.getPattern = this._getPatternByRules;
  },
  onURLChange: (Settings.CONST.ChromeVersion >= 41
  ? function(details) {
    var response = g_requestHandlers.checkIfEnabled(details);
    response.name = "updateEnabled";
    g_requestHandlers.sendToTab(response, details.tabId
      , details.frameId, {name: "checkIfEnabled"});
  } : function(details) {
    g_requestHandlers.sendToTab({name: "checkIfEnabled"}, details.tabId);
  }),
  Format: function(rules) {
    var keyRegex = Commands.keyRegex, _i, rule, pattern, pass, arr, out = [];
    for (_i = rules.length; 0 <= --_i; ) {
      pattern = (rule = rules[_i]).pattern;
      if (!pattern) { continue; }
      pass = rule.passKeys;
      out.push([this.getRegex(pattern), pass && (arr = pass.match(keyRegex))
        ? (arr.sort().join(" ") + " ") : ""]);
    }
    return out;
  },
  rebuildRegex: function() {
    var rules = Settings.get("exclusionRules"), ref = this.re = { __proto__: null }
      , ref2 = this.rules, _i, _j, pattern;
    for (_i = rules.length, _j = 0; 0 <= --_i; ) {
      pattern = rules[_i].pattern;
      if (!pattern) { continue; }
      ref[pattern] = ref2[_j++][0];
    }
  },
  getPattern: null,
  _getNull: function() {
    return null;
  },
  _getPatternByRules: function(url) {
    var rules = this.rules, _i, _len, matchedKeys = "";
    for (_i = 0, _len = rules.length; _i < _len; _i++) {
      if (rules[_i][0](url)) {
        if (!rules[_i][1]) {
          return "";
        }
        matchedKeys += rules[_i][1];
      }
    }
    return matchedKeys || null;
  },
  getTemp: function(url, rules) {
    var old = this.rules;
    this.rules = this.Format(rules);
    url = this._getPatternByRules(url);
    this.rules = old;
    return url;
  }
};

Settings.updateHooks.exclusionRules = function(rules) {
  Exclusions.setRules(rules);
  g_requestHandlers.esc();
  this.postUpdate("broadcast", Exclusions.rules.length === 0 ? {
    name: "setEnabled",
    passKeys: null
  } : {
    name: "checkIfEnabled"
  });
};
