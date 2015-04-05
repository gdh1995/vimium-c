"use strict";
var Exclusions = {
  _cache: {},
  _emptyStringRegex: /^$/,
  _sharpRegex: /\*/g,
  getRegex: function(pattern) {
    var regexp;
    if (regexp = this._cache[pattern]) {
      return regexp;
    }
    try {
      return this._cache[pattern] = new RegExp("^" + pattern.replace(this._sharpRegex, ".*") + "$");
    } catch (e) {
      return this._cache[pattern] = this._emptyStringRegex;
    }
  },
  rules: Settings.get("exclusionRules"),
  getRule: function(url, rules) {
    var rule, _i, _len, _ref, matchedPatterns = [], matchedKeys = [];
    if (rules == null) {
      rules = this.rules;
    }
    for (_i = 0, _len = rules.length; _i < _len; _i++) {
      rule = rules[_i];
      if (rule.pattern && 0 <= url.search(this.getRegex(rule.pattern))) {
        if (!rule.passKeys) {
          return rule;
        }
        matchedPatterns.push(rule.pattern);
        matchedKeys.push(rule.passKeys);
      }
    }
    return (matchedKeys.length === 0) ? null : {
      pattern: matchedPatterns.join(" | "),
      passKeys: Utils.distinctCharacters(matchedKeys.join(""))
    };
  }
};