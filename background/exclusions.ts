// eslint-disable-next-line no-var
var Exclusions = {
  testers_: null as never as Map<string, ExclusionsNS.Tester>,
  createRule_ (pattern: string, keys: string): ExclusionsNS.Tester {
    let cur: ExclusionsNS.Tester | undefined = this.testers_.get(pattern), re: RegExp | null | undefined
    let rule: ExclusionsNS.Tester
    keys = keys && keys.replace(<RegExpG> /<(\S+)>/g, "$1");
    if (cur) {
      return {
        t: cur.t as ExclusionsNS.TesterType.RegExp,
        v: (cur as ExclusionsNS.RegExpTester).v,
        k: keys
      };
    }
    if (pattern[0] === "^") {
      if (re = BgUtils_.makeRegexp_(pattern.startsWith("^$|") ? pattern.slice(3) : pattern, "", 0)) {
        /* empty */
      } else {
        console.log("Failed in creating an RegExp from %o", pattern);
      }
    }
    rule = re ? {
      t: ExclusionsNS.TesterType.RegExp,
      v: re as RegExpOne,
      k: keys
    } : {
      t: ExclusionsNS.TesterType.StringPrefix,
      v: pattern.startsWith(":vimium://")
          ? BgUtils_.formatVimiumUrl_(pattern.slice(10), false, Urls.WorkType.ConvertKnown) : pattern.slice(1),
      k: keys
    }
    this.testers_.set(pattern, rule)
    return rule
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
    this.testers_ || (this.testers_ = new Map())
    this.rules_ = rules.map(this.Format_)
    this.testers_ = null as never;
    Backend_.getExcluded_ = this.GetPassKeys_;
    this.updateListeners_();
  },
  GetPassKeys_ (this: void, url: string, sender: Frames.Sender): string | null {
    let matchedKeys = "";
    for (const rule of Exclusions.rules_) {
      if (rule.t === ExclusionsNS.TesterType.StringPrefix
          ? url.startsWith(rule.v) : rule.v.test(url)) {
        const str = rule.k;
        if (str.length === 0 || Exclusions.onlyFirstMatch_ || str[0] === "^" && str.length > 2) { return str; }
        matchedKeys += str;
      }
    }
    if (!matchedKeys && sender.frameId_ && url.lastIndexOf("://", 5) < 0 && !BgUtils_.protocolRe_.test(url)) {
      const mainFrame = Backend_.indexPorts_(sender.tabId_, 0);
      if (mainFrame) {
        return Backend_.getExcluded_(mainFrame.s.url_, mainFrame.s);
      }
    }
    return matchedKeys || null;
  },
  getOnURLChange_ (): null | ExclusionsNS.Listener {
    const onURLChange: null | ExclusionsNS.Listener = !chrome.webNavigation ? null
      : Build.MinCVer >= BrowserVer.MinWithFrameId || !(Build.BTypes & BrowserType.Chrome)
        || CurCVer_ >= BrowserVer.MinWithFrameId
      ? function (details): void { Backend_.reqH_[kFgReq.checkIfEnabled](details) }
      : function (details: chrome.webNavigation.WebNavigationCallbackDetails) {
        const ref = Backend_.indexPorts_(details.tabId),
        msg: Req.bg<kBgReq.url> = { N: kBgReq.url, H: kFgReq.checkIfEnabled };
        // force the tab's ports to reconnect and refresh their pass keys
        for (const port of ref ? ref.ports_ : []) {
          port.postMessage(msg)
        }
      };
    this.getOnURLChange_ = () => onURLChange;
    return onURLChange;
  },
  Format_: (rule: ExclusionsNS.StoredRule): ExclusionsNS.Tester => Exclusions.createRule_(rule.pattern, rule.passKeys),
  getAllPassed_ (): SafeEnum | true | null {
    let all = BgUtils_.safeObj_() as SafeDict<1>, tick = 0;
    for (const { k: passKeys } of this.rules_) {
      if (passKeys) {
        if (passKeys[0] === "^" && passKeys.length > 2) { return true; }
        for (const ch of passKeys.split(" ")) { all[ch] = 1; tick++; }
      }
    }
    return tick ? all : null;
  },
  getTemp_ (url: string, sender: Frames.Sender, rules: ExclusionsNS.StoredRule[]): string | null {
    const old = this.rules_;
    this.rules_ = rules.map(this.Format_)
    const ret = this.GetPassKeys_(url, sender);
    this.rules_ = old;
    return ret;
  },
  RefreshStatus_ (this: void, old_is_empty: boolean): void {
    const always_enabled = Exclusions.rules_.length > 0 ? null : <Req.bg<kBgReq.reset>> {
      N: kBgReq.reset, p: null, f: 0
    };
    if (old_is_empty) {
      always_enabled || Settings_.broadcast_<kBgReq.url>({
        N: kBgReq.url,
        H: kFgReq.checkIfEnabled
      });
      return;
    }
    const
    needIcon = !!Settings_.temp_.IconBuffer_ && (Settings_.temp_.IconBuffer_() || Settings_.get_("showActionIcon"));
    let pass: string | null = null, status: Frames.ValidStatus = Frames.Status.enabled;
    Backend_.indexPorts_().forEach((frames): void => {
      const status0 = frames.cur_.s.status_;
      for (const port of frames.ports_) {
        if (always_enabled) {
          if (port.s.status_ === Frames.Status.enabled) {
            continue;
          }
        } else {
          pass = Backend_.getExcluded_(port.s.url_, port.s);
          status = pass === null ? Frames.Status.enabled : pass
            ? Frames.Status.partial : Frames.Status.disabled;
          if (!pass && port.s.status_ === status) {
            continue;
          }
        }
        if (frames.lock_) { continue }
        port.postMessage(always_enabled || { N: kBgReq.reset, p: pass, f: 0 });
        port.s.status_ = status;
      }
      if (needIcon && status0 !== (status = frames.cur_.s.status_)) {
        Backend_.setIcon_(frames.cur_.s.tabId_, status)
      }
    })
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
}, CommandsData_: CommandsDataTy;

Settings_.updateHooks_.exclusionRules = function (this: void, rules: ExclusionsNS.StoredRule[]): void {
  const isEmpty = !Exclusions.rules_.length, curKeyFSM = CommandsData_.keyFSM_
  Exclusions.setRules_(rules);
  setTimeout(function (): void {
    setTimeout(Exclusions.RefreshStatus_, 10, isEmpty);
    if (CommandsData_.keyFSM_ === curKeyFSM) {
      Settings_.postUpdate_("keyMappings", null)
    }
  }, 1);
};

Settings_.updateHooks_.exclusionOnlyFirstMatch = function (this: void, value: boolean): void {
  Exclusions.onlyFirstMatch_ = value;
};

Settings_.updateHooks_.exclusionListenHash = Exclusions.updateListeners_;
