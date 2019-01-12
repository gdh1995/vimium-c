import ExcCls = ExclusionsNS.ExclusionsCls;
declare var Exclusions: ExcCls;

if (Settings.get("vimSync")
    || ((localStorage.getItem("exclusionRules") !== "[]" || !Backend.onInit_)
        && !Settings.updateHooks_.exclusionRules)) {
var Exclusions: ExcCls = Exclusions && !(Exclusions instanceof Promise) ? Exclusions : {
  testers: null as SafeDict<ExclusionsNS.Tester> | null,
  getRe (this: ExcCls, pattern: string): ExclusionsNS.Tester {
    let func: ExclusionsNS.Tester | undefined = (this.testers as ExclusionsNS.TesterDict)[pattern], re: RegExp | null;
    if (func) { return func; }
    if (pattern[0] === '^' && (re = Utils.makeRegexp_(pattern, "", false))) {
      func = re as RegExpOne;
    } else {
      func = pattern.substring(1);
    }
    return (this.testers as ExclusionsNS.TesterDict)[pattern] = func;
  },
  _listening: false,
  _listeningHash: false,
  onlyFirstMatch_: false,
  rules: [],
  setRules_ (this: ExcCls, rules: ExclusionsNS.StoredRule[]): void {
    let onURLChange: null | ExclusionsNS.Listener;
    if (rules.length === 0) {
      this.rules = [];
      Backend.getExcluded_ = Utils.getNull_;
      if (this._listening && (onURLChange = this.getOnURLChange_())) {
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
    this.rules = this.format_(rules);
    this.onlyFirstMatch_ = Settings.get("exclusionOnlyFirstMatch");
    this.testers = null;
    Backend.getExcluded_ = this.GetPattern_;
    if (this._listening) { return; }
    this._listening = true;
    onURLChange = this.getOnURLChange_();
    if (!onURLChange) { return; }
    chrome.webNavigation.onHistoryStateUpdated.addListener(onURLChange);
    if (Settings.get("exclusionListenHash") && !this._listeningHash) {
      this._listeningHash = true;
      chrome.webNavigation.onReferenceFragmentUpdated.addListener(onURLChange);
    }
  },
  GetPattern_ (this: void, url: string): string | null {
    let rules = Exclusions.rules, matchedKeys = "";
    for (let _i = 0, _len = rules.length; _i < _len; _i += 2) {
      const rule = rules[_i] as ExclusionsNS.Tester;
      if (typeof rule === "string" ? url.startsWith(rule) : rule.test(url)) {
        const str = rules[_i + 1] as string;
        if (str.length === 0 || Exclusions.onlyFirstMatch_) { return str; }
        matchedKeys += str;
      }
    }
    return matchedKeys || null;
  },
  getOnURLChange_ (this: ExcCls): null | ExclusionsNS.Listener {
    const onURLChange: null | ExclusionsNS.Listener = !chrome.webNavigation ? null
      : Settings.CONST.ChromeVersion >= BrowserVer.MinWithFrameId ? Backend.checkIfEnabled_
      : function(details: chrome.webNavigation.WebNavigationCallbackDetails) {
        const ref = Backend.indexPorts(details.tabId),
        msg: Req.bg<kBgReq.url> = { N: kBgReq.url, H: kFgReq.checkIfEnabled as kFgReq.checkIfEnabled };
        // force the tab's ports to reconnect and refresh their pass keys
        for (let i = ref ? ref.length : 0; 0 < --i; ) {
          (ref as Frames.Frames)[i].postMessage(msg);
        }
      };
    this.getOnURLChange_ = () => onURLChange;
    return onURLChange;
  },
  format_ (this: ExcCls, rules: ExclusionsNS.StoredRule[]): ExclusionsNS.Rules {
    const out = [] as ExclusionsNS.Rules;
    for (let _i = 0, _len = rules.length; _i < _len; _i++) {
      const rule = rules[_i];
      out.push(this.getRe(rule.pattern), rule.passKeys);
    }
    return out;
  },
  getTemp (this: ExcCls, url: string, rules: ExclusionsNS.StoredRule[]): string | null {
    const old = this.rules;
    this.rules = this.format_(rules);
    const ret = this.GetPattern_(url);
    this.rules = old;
    return ret;
  },
  RefreshStatus_ (old_is_empty: boolean): void {
    const always_enabled = Exclusions.rules.length > 0 ? null : <Req.bg<kBgReq.reset>> {
      N: kBgReq.reset,
      p: null
    };
    if (old_is_empty) {
      always_enabled || Settings.broadcast({
        N: kBgReq.url,
        H: kFgReq.checkIfEnabled
      } as Req.fg<kFgReq.checkIfEnabled> & Req.bg<kBgReq.url>);
      return;
    }
    const ref = Backend.indexPorts(),
    needIcon = !!(Backend.IconBuffer_ && (Backend.IconBuffer_() || Settings.get("showActionIcon")));
    let pass: string | null = null, status: Frames.ValidStatus = Frames.Status.enabled;
    for (const tabId in ref) {
      const frames = ref[+tabId] as Frames.Frames, status0 = frames[0].s.s;
      for (let i = frames.length; 0 < --i; ) {
        const port = frames[i];
        if (always_enabled) {
          if (port.s.s === Frames.Status.enabled) {
            continue;
          }
        } else {
          pass = Backend.getExcluded_(port.s.u);
          status = pass === null ? Frames.Status.enabled : pass
            ? Frames.Status.partial : Frames.Status.disabled;
          if (!pass && port.s.s === status) {
            continue;
          }
        }
        if (port.s.f & Frames.Flags.locked) { continue; }
        port.postMessage(always_enabled || { N: kBgReq.reset, p: pass });
        port.s.s = status;
      }
      if (needIcon && status0 !== (status = frames[0].s.s)) {
        Backend.setIcon_(+tabId, status);
      }
    }
  },
  destroy_ (): void {
    Settings.updateHooks_.exclusionRules = Settings.updateHooks_.exclusionOnlyFirstMatch =
    Settings.updateHooks_.exclusionListenHash = void 0 as never;
  }
};

Exclusions.setRules_(Settings.get("exclusionRules"));

Settings.updateHooks_.exclusionRules = function(this: void, rules: ExclusionsNS.StoredRule[]): void {
  setTimeout(function() {
    const is_empty = Exclusions.rules.length <= 0;
    Exclusions.setRules_(rules);
    setTimeout(Exclusions.RefreshStatus_, 17, is_empty);
  }, 17);
};

Settings.updateHooks_.exclusionOnlyFirstMatch = function(this: void, value: boolean): void {
  Exclusions.onlyFirstMatch_ = value;
};

Settings.updateHooks_.exclusionListenHash = function(this: void, value: boolean): void {
  const _this = Exclusions;
  if (!_this._listening) { return; }
  const l = _this.getOnURLChange_();
  if (!l) { return; }
  _this._listeningHash = value;
  const e = chrome.webNavigation.onReferenceFragmentUpdated;
  value ? e.addListener(l) : e.removeListener(l);
};
} else {
  var Exclusions: ExcCls = null as never;
}
