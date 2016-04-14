"use strict";
var Exclusions = {
  testers: null,
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
    this.onURLChange || (this.onURLChange = g_requestHandlers.checkIfEnabled);
    if (rules.length === 0) {
      this.rules = [];
      this.getPattern = function() { return null; };
      if (this._listening && chrome.webNavigation) {
        chrome.webNavigation.onHistoryStateUpdated.removeListener(this.onURLChange);
        chrome.webNavigation.onReferenceFragmentUpdated.removeListener(this.onURLChange);
      }
      this._listening = false;
      return;
    }
    this.testers || (this.testers = Object.create(null));
    this.rules = this.format(rules);
    this.testers = null;
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
  onURLChange: Settings.CONST.ChromeVersion < 41 && function(details) {
    var ref = Settings.framesForTab[details.tabId], i;
    // force the tab's ports to reconnect and refresh their pass keys
    for (i = ref && ref.length; 0 < --i; ) {
      ref[i].disconnect();
    }
  },
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
  },
  RefreshStatus: function() {
    var ref = Settings.framesForTab, tabId, frames, i, req, pass, status = "enabled";
    req = Exclusions.rules.length <= 0 ? null : {
      name: "reset",
      passKeys: null
    };
    for (tabId in ref) {
      frames = ref[tabId];
      for (i = frames.length; 0 < --i; ) {
        if (req) {
          if (port.sender.status === "enabled") {
            continue;
          }
        } else {
          pass = Exclusions.getPattern(port.sender.url);
          status = pass === null ? "enabled" : pass ? "partial" : "disabled";
          if (!pass && port.sender.status === status) {
            continue;
          }
        }
        port.postMessage(req || { name: "reset", passKeys: pass });
        port.sender.status = status;
      }
    }
  }
};

Settings.updateHooks.exclusionRules = function(rules) {
  Exclusions.setRules(rules);
  g_requestHandlers.esc();
  setTimeout(Exclusions.RefreshStatus, 17);
};
