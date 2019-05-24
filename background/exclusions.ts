if (Settings.get_("vimSync")
    || ((localStorage.getItem("exclusionRules") !== "[]" || !Backend.onInit_)
        && !Settings.updateHooks_.exclusionRules)) {
var Exclusions = {
  testers_: null as SafeDict<ExclusionsNS.Tester> | null,
  getRe_ (pattern: string): ExclusionsNS.Tester {
    type TesterDict = NonNullable<typeof Exclusions.testers_>;
    let func: ExclusionsNS.Tester | undefined = (this.testers_ as TesterDict)[pattern], re: RegExp | null;
    if (func) { return func; }
    if (pattern[0] === "^") {
      if (re = Utils.makeRegexp_(pattern.startsWith("^$|") ? pattern.substring(3) : pattern, "", false)) {
        func = re as RegExpOne;
      } else {
        console.log("Failed in creating an RegExp from %o", pattern);
      }
    }
    return (this.testers_ as TesterDict)[pattern] = func || pattern.substring(1);
  },
  _listening: false,
  _listeningHash: false,
  onlyFirstMatch_: false,
  rules_: [] as ExclusionsNS.Rules,
  setRules_ (rules: ExclusionsNS.StoredRule[]): void {
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
    Backend.getExcluded_ = this.GetPassKeys_;
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
  GetPassKeys_ (this: void, url: string, sender: Frames.Sender): string | null {
    let rules = Exclusions.rules_, matchedKeys = "";
    for (let _i = 0, _len = rules.length; _i < _len; _i += 2) {
      const rule = rules[_i] as ExclusionsNS.Tester;
      if (typeof rule === "string" ? url.startsWith(rule) : rule.test(url)) {
        const str = rules[_i + 1] as string;
        if (str.length === 0 || Exclusions.onlyFirstMatch_ || str[0] === "^" && str.length > 2) { return str; }
        matchedKeys += str;
      }
    }
    if (!matchedKeys && sender.i && url.lastIndexOf("://", 5) < 0 && !Utils.protocolRe_.test(url)) {
      const mainFrame = Backend.indexPorts_(sender.t, 0);
      if (mainFrame) {
        return Backend.getExcluded_(mainFrame.s.u, mainFrame.s);
      }
    }
    return matchedKeys || null;
  },
  getOnURLChange_ (): null | ExclusionsNS.Listener {
    const onURLChange: null | ExclusionsNS.Listener = !chrome.webNavigation ? null
      : Build.MinCVer >= BrowserVer.MinWithFrameId || !(Build.BTypes & BrowserType.Chrome)
        || ChromeVer >= BrowserVer.MinWithFrameId
      ? function (details): void { Backend.checkIfEnabled_(details); }
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
  format_ (rules: ExclusionsNS.StoredRule[]): ExclusionsNS.Rules {
    const out = [] as ExclusionsNS.Rules;
    for (let _i = 0, _len = rules.length; _i < _len; _i++) {
      const rule = rules[_i];
      out.push(this.getRe_(rule.pattern), Utils.formatKeys_(rule.passKeys));
    }
    return out;
  },
  getAllPassed_ (): SafeEnum | true | null {
    const rules = this.rules_, all = Object.create(null) as SafeDict<1>;
    let tick = 0;
    for (let _i = 1, _len = rules.length; _i < _len; _i += 2) {
      const passKeys = rules[_i] as string;
      if (passKeys) {
        if (passKeys[0] === "^" && passKeys.length > 2) { return true; }
        for (const ch of passKeys.split(" ")) { all[ch] = 1; tick++; }
      }
    }
    return tick ? all : null;
  },
  getTemp_ (url: string, sender: Frames.Sender, rules: ExclusionsNS.StoredRule[]): string | null {
    const old = this.rules_;
    this.rules_ = this.format_(rules);
    const ret = this.GetPassKeys_(url, sender);
    this.rules_ = old;
    return ret;
  },
  RefreshStatus_ (this: void, old_is_empty: boolean): void {
    const always_enabled = Exclusions.rules_.length > 0 ? null : <Req.bg<kBgReq.reset>> {
      N: kBgReq.reset,
      p: null
    };
    Utils.require_("Commands").then(() => Settings.postUpdate_("keyMappings", null));
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
          pass = Backend.getExcluded_(port.s.u, port.s);
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
  var Exclusions = null as never as typeof Exclusions;
}
