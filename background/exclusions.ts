if (Settings_.get_("vimSync")
    || ((localStorage.getItem("exclusionRules") !== "[]" || !Backend_.onInit_)
        && !Settings_.updateHooks_.exclusionRules)) {
var Exclusions = {
  testers_: null as SafeDict<ExclusionsNS.Tester> | null,
  getRe_ (pattern: string): ExclusionsNS.Tester {
    type TesterDict = NonNullable<typeof Exclusions.testers_>;
    let cur: ExclusionsNS.Tester | undefined = (this.testers_ as TesterDict)[pattern], re: RegExp | null | undefined;
    if (cur) { return cur; }
    if (pattern[0] === "^") {
      if (re = BgUtils_.makeRegexp_(pattern.startsWith("^$|") ? pattern.slice(3) : pattern, "", false)) {
        /* empty */
      } else {
        console.log("Failed in creating an RegExp from %o", pattern);
      }
    }
    return (this.testers_ as TesterDict)[pattern] = <typeof cur> re || pattern.slice(1);
  },
  _listening: false,
  _listeningHash: false,
  onlyFirstMatch_: Settings_.get_("exclusionOnlyFirstMatch"),
  rules_: [] as ExclusionsNS.Rules,
  setRules_ (rules: ExclusionsNS.StoredRule[]): void {
    if (rules.length === 0) {
      this.rules_ = [];
      Backend_.getExcluded_ = BgUtils_.getNull_;
      this.updateListeners_();
      return;
    }
    this.testers_ || (this.testers_ = Object.create<ExclusionsNS.Tester>(null));
    this.rules_ = this.format_(rules);
    this.testers_ = null;
    Backend_.getExcluded_ = this.GetPassKeys_;
    this.updateListeners_();
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
    if (!matchedKeys && sender.i && url.lastIndexOf("://", 5) < 0 && !BgUtils_.protocolRe_.test(url)) {
      const mainFrame = Backend_.indexPorts_(sender.t, 0);
      if (mainFrame) {
        return Backend_.getExcluded_(mainFrame.s.u, mainFrame.s);
      }
    }
    return matchedKeys || null;
  },
  getOnURLChange_ (): null | ExclusionsNS.Listener {
    const onURLChange: null | ExclusionsNS.Listener = !chrome.webNavigation ? null
      : Build.MinCVer >= BrowserVer.MinWithFrameId || !(Build.BTypes & BrowserType.Chrome)
        || CurCVer_ >= BrowserVer.MinWithFrameId
      ? function (details): void { Backend_.checkIfEnabled_(details); }
      : function (details: chrome.webNavigation.WebNavigationCallbackDetails) {
        const ref = Backend_.indexPorts_(details.tabId),
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
      out.push(this.getRe_(rule.pattern), BgUtils_.formatKeys_(rule.passKeys));
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
    if (old_is_empty) {
      always_enabled || Settings_.broadcast_({
        N: kBgReq.url,
        H: kFgReq.checkIfEnabled
      } as Req.fg<kFgReq.checkIfEnabled> & Req.bg<kBgReq.url>);
      return;
    }
    const ref = Backend_.indexPorts_(),
    needIcon = !!(Backend_.IconBuffer_ && (Backend_.IconBuffer_() || Settings_.get_("showActionIcon")));
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
          pass = Backend_.getExcluded_(port.s.u, port.s);
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
        Backend_.setIcon_(+tabId, status);
      }
    }
  },
  updateListeners_ (this: void): void {
    const a = Exclusions, listenHistory = a.rules_.length > 0,
    l = a.getOnURLChange_(),
    listenHash = listenHistory && Settings_.get_("exclusionListenHash");
    if (!l) { return; }
    if (a._listening !== listenHistory) {
      a._listening = listenHistory;
      const e = chrome.webNavigation.onHistoryStateUpdated;
      listenHistory ? e.addListener(l) : e.removeListener(l);
    }
    if (a._listeningHash !== listenHash) {
      a._listeningHash = listenHash;
      const e = chrome.webNavigation.onReferenceFragmentUpdated;
      listenHash ? e.addListener(l) : e.removeListener(l);
    }
  }
};

Exclusions.setRules_(Settings_.get_("exclusionRules"));

Settings_.updateHooks_.exclusionRules = function (this: void, rules: ExclusionsNS.StoredRule[]): void {
  const isEmpty = Exclusions.rules_.length <= 0, curKeyMap = CommandsData_.keyMap_;
  Exclusions.setRules_(rules);
  BgUtils_.GC_();
  setTimeout(function (): void {
    setTimeout(Exclusions.RefreshStatus_, 10, isEmpty);
    if (CommandsData_.keyMap_ === curKeyMap) {
      BgUtils_.require_("Commands").then(() => Settings_.postUpdate_("keyMappings", null));
    }
  }, 1);
};

Settings_.updateHooks_.exclusionOnlyFirstMatch = function (this: void, value: boolean): void {
  Exclusions.onlyFirstMatch_ = value;
};

Settings_.updateHooks_.exclusionListenHash = Exclusions.updateListeners_;
} else {
  var Exclusions = null as never as typeof Exclusions;
}
