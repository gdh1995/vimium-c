"use strict";
var Exclusions = {
  testers: {},
  getRe: function(pattern) {
    var func = this.testers[pattern], re;
    if (func) { return func; }
    if (pattern[0] === '^' && (re = Utils.makeRegexp(pattern, "", false))) {
      func = re.test.bind(re);
    } else {
      func = this._startsWith.bind(pattern.substring(1));
    }
    return this.testers[pattern] = func;
  },
  _startsWith: function(url) {
    return url.startsWith(this);
  },
  _listening: false,
  rules: [],
  setRules: function(rules) {
    if (rules.length === 0) {
      this.rules = [];
      this.getPattern = function() { return null; };
      if (this._listening && chrome.webNavigation) {
        chrome.webNavigation.onHistoryStateUpdated.removeListener(this.onURLChange);
        chrome.webNavigation.onReferenceFragmentUpdated.removeListener(this.onURLChange);
      }
      this._listening = false;
      this.testers = Utils.makeNullProto();
      return;
    }
    this.rules = this.format(rules);
    this.testers = Utils.makeNullProto();
    if (!this._listening && chrome.webNavigation) {
      chrome.webNavigation.onHistoryStateUpdated.addListener(this.onURLChange);
      chrome.webNavigation.onReferenceFragmentUpdated.addListener(this.onURLChange);
    }
    this._listening = true;
    this.getPattern = this._getPattern;
  },
  getPattern: null,
  _getPattern: function(url) {
    var rules = this.rules, _i, _len, matchedKeys = "", str;
    for (_i = 0, _len = rules.length; _i < _len; _i++) {
      if (rules[_i][0](url)) {
        str = rules[_i][1];
        if (!str) { return ""; }
        matchedKeys += str;
      }
    }
    return matchedKeys || null;
  },
  onURLChange: (Settings.CONST.ChromeVersion >= 41
  ? function(details) {
    g_requestHandlers.SendToTab(g_requestHandlers.checkIfEnabled(details)
      , details.tabId, details.frameId, {name: "checkIfEnabled"});
  } : function(details) {
    g_requestHandlers.SendToTab({name: "checkIfEnabled"}, details.tabId);
  }),
  format: function(rules) {
    var _i = rules.length, rule, out = new Array(_i);
    while (0 <= --_i) {
      rule = rules[_i];
      out[_i] = [this.getRe(rule.pattern), rule.passKeys];
    }
    return out;
  },
  getTemp: function(url, rules) {
    var old = this.rules;
    this.rules = this.format(rules);
    url = this._getPattern(url);
    this.rules = old;
    return url;
  }
};

Settings.updateHooks.exclusionRules = function(rules) {
  Exclusions.setRules(rules);
  g_requestHandlers.esc();
  this.postUpdate("broadcast", Exclusions.rules.length === 0 ? {
    name: "reset",
    passKeys: null
  } : {
    name: "checkIfEnabled"
  });
};
