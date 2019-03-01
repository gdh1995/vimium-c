declare namespace ExclusionsNS {
  type Tester = RegExpOne | string;
  type TesterDict = SafeDict<ExclusionsNS.Tester>;
  type Rules = Array<Tester | string>;

  interface ExclusionsCls {
    _listening: boolean;
    _listeningHash: boolean;
    onlyFirstMatch_: boolean;
    rules_: Rules;
    testers_: SafeDict<Tester> | null;
    getRe_ (pattern: string): Tester;
    setRules_ (newRules: StoredRule[]): void;
    GetPattern_ (this: void, url: string): string | null;
    getOnURLChange_ (): null | Listener;
    format_ (rules: StoredRule[]): Rules;
    getTemp_ (this: ExclusionsCls, url: string, rules: StoredRule[]): string | null;
    RefreshStatus_ (this: void, old_is_empty: boolean): void;
  }
}
import ExcCls = ExclusionsNS.ExclusionsCls;
declare var Exclusions: ExcCls;

if (Settings.get_("vimSync")
    || ((localStorage.getItem("exclusionRules") !== "[]" || !Backend.onInit_)
        && !Settings.updateHooks_.exclusionRules)) {
var Exclusions: ExcCls = Exclusions && !(Exclusions instanceof Promise) ? Exclusions : {
  testers_: null as SafeDict<ExclusionsNS.Tester> | null,
  getRe_ (this: ExcCls, pattern: string): ExclusionsNS.Tester {
    let func: ExclusionsNS.Tester | undefined = (this.testers_ as ExclusionsNS.TesterDict)[pattern], re: RegExp | null;
    if (func) { return func; }
    if (pattern[0] === "^" && (re = Utils.makeRegexp_(pattern, "", false))) {
      func = re as RegExpOne;
    } else {
      func = pattern.substring(1);
    }
    return (this.testers_ as ExclusionsNS.TesterDict)[pattern] = func;
  },
  _listening: false,
  _listeningHash: false,
  onlyFirstMatch_: false,
  rules_: [],
  setRules_ (this: ExcCls, rules: ExclusionsNS.StoredRule[]): void {
    let onURLChange: null | ExclusionsNS.Listener;
    if (rules.length === 0) {
      this.rules_ = [];
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
    this.testers_ || (this.testers_ = Object.create<ExclusionsNS.Tester>(null));
    this.rules_ = this.format_(rules);
    this.onlyFirstMatch_ = Settings.get_("exclusionOnlyFirstMatch");
    this.testers_ = null;
    Backend.getExcluded_ = this.GetPattern_;
    if (this._listening) { return; }
    this._listening = true;
    onURLChange = this.getOnURLChange_();
    if (!onURLChange) { return; }
    chrome.webNavigation.onHistoryStateUpdated.addListener(onURLChange);
    if (Settings.get_("exclusionListenHash") && !this._listeningHash) {
      this._listeningHash = true;
      chrome.webNavigation.onReferenceFragmentUpdated.addListener(onURLChange);
    }
  },
  GetPattern_ (this: void, url: string): string | null {
    let rules = Exclusions.rules_, matchedKeys = "";
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
      : ChromeVer >= BrowserVer.MinWithFrameId ? Backend.checkIfEnabled_
      : function (details: chrome.webNavigation.WebNavigationCallbackDetails) {
        const ref = Backend.indexPorts_(details.tabId),
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
      out.push(this.getRe_(rule.pattern), rule.passKeys);
    }
    return out;
  },
  getTemp_ (this: ExcCls, url: string, rules: ExclusionsNS.StoredRule[]): string | null {
    const old = this.rules_;
    this.rules_ = this.format_(rules);
    const ret = this.GetPattern_(url);
    this.rules_ = old;
    return ret;
  },
  RefreshStatus_ (old_is_empty: boolean): void {
    const always_enabled = Exclusions.rules_.length > 0 ? null : <Req.bg<kBgReq.reset>> {
      N: kBgReq.reset,
      p: null
    };
    if (old_is_empty) {
      always_enabled || Settings.broadcast_({
        N: kBgReq.url,
        H: kFgReq.checkIfEnabled
      } as Req.fg<kFgReq.checkIfEnabled> & Req.bg<kBgReq.url>);
      return;
    }
    const ref = Backend.indexPorts_(),
    needIcon = !!(Backend.IconBuffer_ && (Backend.IconBuffer_() || Settings.get_("showActionIcon")));
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
  }
};

Exclusions.setRules_(Settings.get_("exclusionRules"));

Settings.updateHooks_.exclusionRules = function (this: void, rules: ExclusionsNS.StoredRule[]): void {
  setTimeout(function () {
    const is_empty = Exclusions.rules_.length <= 0;
    Exclusions.setRules_(rules);
    setTimeout(Exclusions.RefreshStatus_, 17, is_empty);
  }, 17);
};

Settings.updateHooks_.exclusionOnlyFirstMatch = function (this: void, value: boolean): void {
  Exclusions.onlyFirstMatch_ = value;
};

Settings.updateHooks_.exclusionListenHash = function (this: void, value: boolean): void {
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
