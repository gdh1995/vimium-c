/// <reference path="../types/bg.exclusions.d.ts" />
import ExcCls = ExclusionsNS.ExclusionsCls;
declare var Exclusions: ExcCls;

if (!(Settings.get("exclusionRules", true).length <= 0 && document.readyState !== "complete" || Settings.updateHooks.exclusionRules)) {
var Exclusions: ExcCls = Exclusions && !(Exclusions instanceof Promise) ? Exclusions : {
  testers: null as SafeDict<ExclusionsNS.Tester> | null,
  getRe (this: ExcCls, pattern: string): ExclusionsNS.Tester {
    let func: ExclusionsNS.Tester | undefined = (this.testers as ExclusionsNS.TesterDict)[pattern], re: RegExp | null;
    if (func) { return func; }
    if (pattern[0] === '^' && (re = Utils.makeRegexp(pattern, "", false))) {
      func = re.test.bind(re);
    } else {
      func = this._startsWith.bind(pattern.substring(1));
    }
    return (this.testers as ExclusionsNS.TesterDict)[pattern] = func;
  },
  _startsWith: function(this: string, url: string): boolean {
    return url.startsWith(this);
  },
  _listening: false,
  _listeningHash: false,
  onlyFirstMatch: false,
  rules: [],
  setRules (this: ExcCls, rules: ExclusionsNS.StoredRule[]): void {
    let onURLChange: null | ExclusionsNS.Listener;
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
    this.testers || (this.testers = Object.create<ExclusionsNS.Tester>(null));
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
  GetPattern (this: void, url: string): string | null {
    let rules = Exclusions.rules, matchedKeys = "";
    for (let _i = 0, _len = rules.length; _i < _len; _i += 2) {
      if ((rules[_i] as ExclusionsNS.Tester)(url)) {
        const str = rules[_i + 1] as string;
        if (str.length === 0 || Exclusions.onlyFirstMatch) { return str; }
        matchedKeys += str;
      }
    }
    return matchedKeys || null;
  },
  getOnURLChange (this: ExcCls): null | ExclusionsNS.Listener {
    const onURLChange: null | ExclusionsNS.Listener = !chrome.webNavigation ? null
      : Settings.CONST.ChromeVersion >= 41 ? g_requestHandlers.checkIfEnabled
      : function(details: chrome.webNavigation.WebNavigationCallbackDetails) {
        const ref = Settings.indexPorts(details.tabId), msg = { name: "checkIfEnabled" as "checkIfEnabled" };
        // force the tab's ports to reconnect and refresh their pass keys
        for (let i = ref ? ref.length : 0; 0 < --i; ) {
          (ref as Frames.Frames)[i].postMessage(msg);
        }
      };
    this.getOnURLChange = function(this: void) { return onURLChange; };
    return onURLChange;
  },
  format (this: ExcCls, rules: ExclusionsNS.StoredRule[]): ExclusionsNS.Rules {
    const out = [] as ExclusionsNS.Rules;
    for (let _i = 0, _len = rules.length; _i < _len; _i++) {
      const rule = rules[_i];
      out.push(this.getRe(rule.pattern), rule.passKeys);
    }
    return out;
  },
  getTemp (this: ExcCls, url: string, rules: ExclusionsNS.StoredRule[]): string | null {
    const old = this.rules;
    this.rules = this.format(rules);
    const ret = this.GetPattern(url);
    this.rules = old;
    return ret;
  },
  RefreshStatus (old_is_empty: boolean): void {
    const always_enabled = Exclusions.rules.length > 0 ? null : {
      name: "reset" as "reset",
      passKeys: null
    };
    if (old_is_empty) {
      always_enabled || Settings.broadcast({
        name: "checkIfEnabled"
      });
      return;
    }
    const ref: Frames.FramesMap = Settings.indexPorts(),
    needIcon = !!(Settings.IconBuffer && (Settings.IconBuffer() || Settings.get("showActionIcon")));
    let pass: string | null = null, status: Frames.ValidStatus = Frames.BaseStatus.enabled;
    for (let tabId in ref) {
      const frames = ref[tabId] as Frames.Frames, status0 = frames[0].sender.status;
      for (let i = frames.length; 0 < --i; ) {
        const port = frames[i];
        if (always_enabled) {
          if (port.sender.status === 0) {
            continue;
          }
        } else {
          pass = Settings.getExcluded(port.sender.url);
          status = pass === null ? Frames.BaseStatus.enabled : pass
            ? Frames.BaseStatus.partial : Frames.BaseStatus.disabled;
          if (!pass && port.sender.status === status) {
            continue;
          }
        }
        port.postMessage(always_enabled || { name: "reset", passKeys: pass });
        port.sender.status = status;
      }
      if (needIcon && status0 !== (status = frames[0].sender.status)) {
        g_requestHandlers.SetIcon((tabId as (string | number) as number) | 0, status);
      }
    }
  }
};

Exclusions.setRules(Settings.get("exclusionRules"));

Settings.updateHooks.exclusionRules = function(this: void, rules: ExclusionsNS.StoredRule[]): void {
  setTimeout(function() {
    const is_empty = Exclusions.rules.length <= 0;
    Exclusions.setRules(rules);
    setTimeout(Exclusions.RefreshStatus, 17, is_empty);
  }, 17);
};

Settings.updateHooks.exclusionOnlyFirstMatch = function(this: void, value: boolean): void {
  Exclusions.onlyFirstMatch = value;
};

Settings.updateHooks.exclusionListenHash = function(this: void, value: boolean): void {
  const _this = Exclusions;
  if (!_this._listening) { return; }
  const onURLChange = _this.getOnURLChange();
  if (!onURLChange) { return; }
  _this._listeningHash = value;
  chrome.webNavigation.onReferenceFragmentUpdated[value ? "addListener" : "removeListener"](onURLChange);
};
}
Settings.Init && Settings.Init();
