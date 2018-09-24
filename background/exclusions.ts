import ExcCls = ExclusionsNS.ExclusionsCls;
declare var Exclusions: ExcCls;

if (Settings.get("vimSync")
    || ((localStorage.getItem("exclusionRules") !== "[]" || !Backend.onInit)
        && !Settings.updateHooks.exclusionRules)) {
var Exclusions: ExcCls = Exclusions && !(Exclusions instanceof Promise) ? Exclusions : {
  testers: null as SafeDict<ExclusionsNS.Tester> | null,
  getRe (this: ExcCls, pattern: string): ExclusionsNS.Tester {
    let func: ExclusionsNS.Tester | undefined = (this.testers as ExclusionsNS.TesterDict)[pattern], re: RegExp | null;
    if (func) { return func; }
    if (pattern[0] === '^' && (re = Utils.makeRegexp(pattern, "", false))) {
      func = re as RegExpOne;
    } else {
      func = pattern.substring(1);
    }
    return (this.testers as ExclusionsNS.TesterDict)[pattern] = func;
  },
  _listening: false,
  _listeningHash: false,
  onlyFirstMatch: false,
  rules: [],
  setRules (this: ExcCls, rules: ExclusionsNS.StoredRule[]): void {
    let onURLChange: null | ExclusionsNS.Listener;
    if (rules.length === 0) {
      this.rules = [];
      Backend.getExcluded = Utils.getNull;
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
    Backend.getExcluded = this.GetPattern;
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
      const rule = rules[_i] as ExclusionsNS.Tester;
      if (typeof rule === "string" ? url.startsWith(rule) : rule.test(url)) {
        const str = rules[_i + 1] as string;
        if (str.length === 0 || Exclusions.onlyFirstMatch) { return str; }
        matchedKeys += str;
      }
    }
    return matchedKeys || null;
  },
  getOnURLChange (this: ExcCls): null | ExclusionsNS.Listener {
    const onURLChange: null | ExclusionsNS.Listener = !chrome.webNavigation ? null
      : Settings.CONST.ChromeVersion >= BrowserVer.MinWithFrameId ? Backend.checkIfEnabled
      : function(details: chrome.webNavigation.WebNavigationCallbackDetails) {
        const ref = Backend.indexPorts(details.tabId),
        msg = { name: "url" as "url", handler: "checkIfEnabled" as "checkIfEnabled" };
        // force the tab's ports to reconnect and refresh their pass keys
        for (let i = ref ? ref.length : 0; 0 < --i; ) {
          (ref as Frames.Frames)[i].postMessage(msg);
        }
      };
    this.getOnURLChange = () => onURLChange;
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
        name: "url",
        handler: "checkIfEnabled"
      });
      return;
    }
    const ref = Backend.indexPorts(),
    needIcon = !!(Backend.IconBuffer && (Backend.IconBuffer() || Settings.get("showActionIcon")));
    let pass: string | null = null, status: Frames.ValidStatus = Frames.Status.enabled;
    for (const tabId in ref) {
      const frames = ref[tabId] as Frames.Frames, status0 = frames[0].sender.status;
      for (let i = frames.length; 0 < --i; ) {
        const port = frames[i];
        if (always_enabled) {
          if (port.sender.status === Frames.Status.enabled) {
            continue;
          }
        } else {
          pass = Backend.getExcluded(port.sender.url);
          status = pass === null ? Frames.Status.enabled : pass
            ? Frames.Status.partial : Frames.Status.disabled;
          if (!pass && port.sender.status === status) {
            continue;
          }
        }
        if (port.sender.flags & Frames.Flags.locked) { continue; }
        port.postMessage(always_enabled || { name: "reset", passKeys: pass });
        port.sender.status = status;
      }
      if (needIcon && status0 !== (status = frames[0].sender.status)) {
        Backend.setIcon((tabId as (string | number) as number) | 0, status);
      }
    }
  },
  destroy (): void {
    Settings.updateHooks.exclusionRules = Settings.updateHooks.exclusionOnlyFirstMatch =
    Settings.updateHooks.exclusionListenHash = void 0 as never;
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
  const l = _this.getOnURLChange();
  if (!l) { return; }
  _this._listeningHash = value;
  const e = chrome.webNavigation.onReferenceFragmentUpdated;
  value ? e.addListener(l) : e.removeListener(l);
};
} else {
  var Exclusions: ExcCls = null as never;
}
