"use strict";
var Exclusions = Exclusions && !(Exclusions instanceof Promise) ? Exclusions : {
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
  _listeningHash: false,
  onlyFirstMatch: false,
  rules: [],
  setRules: function(rules) {
    var onURLChange;
    if (rules.length === 0) {
      this.rules = [];
      Settings.getExcluded = Utils.getNull;
      if (this._listening && (onURLChange = this.getOnURLChange())) {
        chrome.webNavigation.onHistoryStateUpdated.removeListener(onURLChange);
        if (this._listeningHash) {
          this._listeningHash = false;
          chrome.webNavigation.onReferenceFragmentUpdated.removeListener(onURLChange);
        }
      }
      this._listening = false;
      return;
    }
    this.testers || (this.testers = Object.create(null));
    this.rules = this.format(rules);
    this.onlyFirstMatch = Settings.get("exclusionOnlyFirstMatch");
    this.testers = null;
    Settings.getExcluded = this.GetPattern;
    if (this._listening) { return; }
    this._listening = true;
    onURLChange = this.getOnURLChange();
    if (!onURLChange) { return; }
    chrome.webNavigation.onHistoryStateUpdated.addListener(onURLChange);
    if (Settings.get("exclusionListenHash") && !this._listeningHash) {
      this._listeningHash = true;
      chrome.webNavigation.onReferenceFragmentUpdated.addListener(onURLChange);
    }
  },
  GetPattern: function(url) {
    var rules = Exclusions.rules, _i, _len, matchedKeys = "", str;
    for (_i = 0, _len = rules.length; _i < _len; _i += 2) {
      if (rules[_i](url)) {
        str = rules[_i + 1];
        if (str.length === 0 || Exclusions.onlyFirstMatch) { return str; }
        matchedKeys += str;
      }
    }
    return matchedKeys || null;
  },
  getOnURLChange: function() {
    var onURLChange = !chrome.webNavigation ? null
      : Settings.CONST.ChromeVersion >= 41 ? g_requestHandlers.checkIfEnabled
      : function(details) {
        var ref = Settings.indexPorts(details.tabId), i, msg = { name: "checkIfEnabled" };
        // force the tab's ports to reconnect and refresh their pass keys
        for (i = ref && ref.length; 0 < --i; ) {
          ref[i].postMessage(msg);
        }
      };
    this.getOnURLChange = function() { return onURLChange; };
    return onURLChange;
  },
  format: function(rules) {
    var _i, _len, rule, out = [];
    for (_i = 0, _len = rules.length; _i < _len; _i++) {
      rule = rules[_i];
      out.push(this.getRe(rule.pattern), rule.passKeys);
    }
    return out;
  },
  getTemp: function(url, rules) {
    var old = this.rules;
    this.rules = this.format(rules);
    url = this.GetPattern(url);
    this.rules = old;
    return url;
  },
  RefreshStatus: function(old_is_empty) {
    var ref = Settings.indexPorts(), tabId, frames
      , needIcon = !!(Settings.IconBuffer &&
          (Settings.IconBuffer() || Settings.get("showActionIcon")))
      , i, always_enabled, pass, status = 0, status0, port;
    always_enabled = Exclusions.rules.length > 0 ? null : {
      name: "reset",
      passKeys: null
    };
    if (old_is_empty) {
      always_enabled || Settings.broadcast({
        name: "checkIfEnabled"
      });
      return;
    }
    for (tabId in ref) {
      frames = ref[tabId];
      status0 = frames[0].sender.status;
      for (i = frames.length; 0 < --i; ) {
        port = frames[i];
        if (always_enabled) {
          if (port.sender.status === 0) {
            continue;
          }
        } else {
          pass = Settings.getExcluded(port.sender.url);
          status = pass === null ? 0 : pass ? 1 : 2;
          if (!pass && port.sender.status === status) {
            continue;
          }
        }
        port.postMessage(always_enabled || { name: "reset", passKeys: pass });
        port.sender.status = status;
      }
      if (needIcon && status0 !== (status = frames[0].sender.status)) {
        g_requestHandlers.SetIcon(tabId | 0, status);
      }
    }
  }
};

Exclusions.setRules(Settings.get("exclusionRules"));

if (!Exclusions._listening && document.readyState !== "complete") {
  Exclusions = null;
} else if (!Settings.updateHooks.exclusionRules) {
Settings.updateHooks.exclusionRules = function(rules) {
  setTimeout(function() {
    var is_empty = Exclusions.rules.length <= 0;
    Exclusions.setRules(rules);
    setTimeout(Exclusions.RefreshStatus, 17, is_empty);
  }, 17);
};

Settings.updateHooks.exclusionOnlyFirstMatch = function(value) {
  Exclusions.onlyFirstMatch = value;
};

Settings.updateHooks.exclusionListenHash = function(value) {
  var _this = Exclusions, onURLChange;
  if (!_this._listening) { return; }
  onURLChange = _this.getOnURLChange();
  if (!onURLChange) { return; }
  _this._listeningHash = value;
  chrome.webNavigation.onReferenceFragmentUpdated[
      value ? "addListener" : "removeListener"](onURLChange);
};
}
Settings.Init && Settings.Init();
