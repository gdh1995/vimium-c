"use strict";
var Exclusions = {
  re: {},
  _emptyStringRe: /^$/,
  _starRe: /\*/g,
  _caretRe: /^\^/,
  _regChars: /[^\\][\$\(\)\*\+\.\?\[\]\^\{\|\}]|/,
  _escapeRe: /\\./g,
  getRe: function(pattern) {
    var re = this.re[pattern];
    if (re) { return re; }
    if (!this._regChars.test(pattern)) {
      re = this._startsWith.bind(pattern.replace(this._escapeRe, "$&"));
    } else try {
      re = new RegExp("^" + pattern.replace(this._starRe, ".*").replace(this._caretRe, ""));
      re = re.test.bind(re);
    } catch (e) {
      re = this._startsWith.bind(pattern);
    }
    return this.re[pattern] = re;
  },
  _startsWith: function(url) {
    return url.startsWith(this);
  },
  _listening: false,
  rules: [],
  setRules: function(rules) {
    this.re = Utils.makeNullProto();
    this.rules = this.Format(rules);
    if (this.rules.length === 0) {
      this.getPattern = function() { return null; };
      if (this._listening) {
        chrome.webNavigation.onHistoryStateUpdated.removeListener(this.onURLChange);
        chrome.webNavigation.onReferenceFragmentUpdated.removeListener(this.onURLChange);
        this._listening = false;
      }
      return;
    }
    if (!this._listening) {
      chrome.webNavigation.onHistoryStateUpdated.addListener(this.onURLChange);
      chrome.webNavigation.onReferenceFragmentUpdated.addListener(this.onURLChange);
      this._listening = true;
    }
    this.getPattern = function(url) {
      var rules = this.rules, _i, _len, matchedKeys = "", str;
      for (_i = 0, _len = rules.length; _i < _len; _i++) {
        if (rules[_i][0](url)) {
          str = rules[_i][1];
          if (!str) { return ""; }
          matchedKeys += str;
        }
      }
      return matchedKeys || null;
    };
  },
  onURLChange: (Settings.CONST.ChromeVersion >= 41
  ? function(details) {
    g_requestHandlers.SendToTab(g_requestHandlers.checkIfEnabled(details)
      , details.tabId, details.frameId, {name: "checkIfEnabled"});
  } : function(details) {
    g_requestHandlers.SendToTab({name: "checkIfEnabled"}, details.tabId);
  }),
  Format: function(rules) {
    var _i = rules.length, rule, out = new Array(_i);
    while (0 <= --_i) {
      rule = rules[_i];
      out[_i] = [this.getRe(rule.pattern), rule.passKeys];
    }
    return out;
  },
  rebuildRe: function() {
    var rules = Settings.get("exclusionRules"), ref = this.re = Utils.makeNullProto()
      , ref2 = this.rules, _i, _j, pattern;
    for (_i = rules.length, _j = 0; 0 <= --_i; ) {
      if (pattern = rules[_i].pattern) {
        ref[pattern] = ref2[_j++][0];
      }
    }
  },
  getPattern: null,
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
    name: "reset",
    passKeys: null
  } : {
    name: "checkIfEnabled"
  });
};
