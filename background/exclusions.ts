import { CurCVer_, framesForTab_, iconData_, keyFSM_, OnChrome, reqH_, setIcon_ } from "./store"
import * as BgUtils_ from "./utils"
import { browserWebNav_ } from "./browser"
import { formatVimiumUrl_ } from "./normalize_urls"
import * as settings from "./settings"
import { asyncIterFrames_ } from "./ports"

export const createRule_ = (pattern: string, keys: string): ExclusionsNS.Tester => {
    let re: RegExp | null | undefined
    let rule: ExclusionsNS.Tester
    keys = keys && keys.replace(<RegExpG> /<(\S+)>/g, "$1");
    if (pattern[0] === "^") {
      if (re = BgUtils_.makeRegexp_(pattern.startsWith("^$|") ? pattern.slice(3) : pattern, "", 0)) {
        /* empty */
      } else {
        console.log("Failed in creating an RegExp from %o", pattern);
      }
    }
    rule = re ? {
      t: kMatchUrl.RegExp,
      v: re as RegExpOne,
      k: keys
    } : {
      t: kMatchUrl.StringPrefix,
      v: pattern.startsWith(":vimium://")
          ? formatVimiumUrl_(pattern.slice(10), false, Urls.WorkType.ConvertKnown) : pattern.slice(1),
      k: keys
    }
    return rule
}

export const createSimpleUrlMatcher_ = (host: string): ValidUrlMatchers | null => {
    let ind: number
    if (host[0] === "^") {
      host = host.startsWith("^$|") ? host.slice(3) : host
      ind = ".*$".includes(host.slice(-2)) ? host.endsWith(".*$") ? 3 : host.endsWith(".*") ? 2 : 0 : 0
      host = ind !== 0 && host[host.length - ind] !== "\\" ? host.slice(0, -ind) : host
      const re = BgUtils_.makeRegexp_(host, "")
      return re ? { t: kMatchUrl.RegExp, v: re as RegExpOne } : null
    } else if (host === "localhost" || !host.includes("/") && host.includes(".")
        && (!(<RegExpOne> /:(?!\d+$)/).test(host) || BgUtils_.isIPHost_(host, 6))) { // ignore rare `IPV6 + :port`
      host = host.toLowerCase()
      host = host.endsWith("*") ? host.slice(0, -1) : host
      return { t: kMatchUrl.RegExp, v: new RegExp(
        "^https?://" + (!host.startsWith("*") || host[1] === "."
          ? (host = host.replace(<RegExpG> /\./g, "\\."), // lgtm [js/incomplete-sanitization]
            !host.startsWith("*") ? host : host.replace("*\\.", "(?:[^./]+\\.)*?"))
          : "[^/]" + host), ""
      ) }
    } else {
      host = (host[0] === ":" ? host.slice(1) : host).replace(<RegExpOne> /([\/?#])\*$/, "$1")
      host = host.startsWith("vimium://")
          ? formatVimiumUrl_(host.slice(9), false, Urls.WorkType.ConvertKnown) : host
      ind = host.indexOf("://")
      return {
        t: kMatchUrl.StringPrefix,
        v: ind > 0 && host.indexOf("/", ind + 3) < 0 ? host + "/" : host
      }
    }
}

export const matchSimply_ = (matcher: ValidUrlMatchers, url: string): boolean =>
      matcher.t === kMatchUrl.StringPrefix ? url.startsWith(matcher.v) : matcher.v.test(url)

let listening_ = false
let listeningHash_ = false
let _onlyFirstMatch: boolean
let rules_: ExclusionsNS.Rules = []

export { listening_ as exclusionListening_, listeningHash_ as exclusionListenHash_ }

const setRules_ = (rules: ExclusionsNS.StoredRule[]): void => {
    if (rules.length === 0) {
      rules_ = []
      updateListeners_()
      return;
    }
    rules_ = rules.map(rule => createRule_(rule.pattern, rule.passKeys))
    updateListeners_()
}

export const parseMatcher_ = (pattern: string | null): BaseUrlMatcher[] => {
  const res = pattern ? [createRule_(pattern, "")] : rules_
  return res.map<BaseUrlMatcher>(i => ({ t: i.t, v: i.t === kMatchUrl.StringPrefix ? i.v : i.v.source }))
}

export const getExcluded_ = (url: string, sender: Frames.Sender): string | null => {
    let matchedKeys = "";
    for (const rule of rules_) {
      if (rule.t === kMatchUrl.StringPrefix
          ? url.startsWith(rule.v) : rule.v.test(url)) {
        const str = rule.k;
        if (str.length === 0 || _onlyFirstMatch || str[0] === "^" && str.length > 2) { return str }
        matchedKeys += str;
      }
    }
    if (!matchedKeys && sender.frameId_ && url.lastIndexOf("://", 5) < 0 && !BgUtils_.protocolRe_.test(url)) {
      const top = framesForTab_.get(sender.tabId_)?.top_
      if (top != null) {
        return getExcluded_(top.s.url_, top.s)
      }
    }
    return matchedKeys || null;
}

let getOnURLChange_ = (): null | ExclusionsNS.Listener => {
  const onURLChange: null | ExclusionsNS.Listener = !browserWebNav_()! ? null
      : !OnChrome || Build.MinCVer >= BrowserVer.MinWithFrameId || CurCVer_ >= BrowserVer.MinWithFrameId
      ? (details): void => { reqH_[kFgReq.checkIfEnabled](details) }
      : (details): void => {
        const ref = framesForTab_.get(details.tabId),
        msg: Req.bg<kBgReq.url> = { N: kBgReq.url, H: kFgReq.checkIfEnabled };
        // force the tab's ports to reconnect and refresh their pass keys
        for (const port of ref ? ref.ports_ : []) {
          port.postMessage(msg)
        }
      };
  getOnURLChange_ = () => onURLChange
  return onURLChange
}

export const getAllPassed_ = (): SafeEnum | true | null => {
    let all = BgUtils_.safeObj_() as SafeDict<1>, tick = 0;
    for (const { k: passKeys } of rules_) {
      if (passKeys) {
        if (passKeys[0] === "^" && passKeys.length > 2) { return true; }
        for (const ch of passKeys.split(" ")) { all[ch] = 1; tick++; }
      }
    }
    return tick ? all : null;
}

export const RefreshStatus_ = (old_is_empty: boolean): void => {
    const always_enabled = rules_.length > 0 ? null : <Req.bg<kBgReq.reset>> {
      N: kBgReq.reset, p: null, f: 0
    };
    if (old_is_empty) {
      always_enabled || settings.broadcast_<kBgReq.url>({
        N: kBgReq.url,
        H: kFgReq.checkIfEnabled
      });
      return;
    }
    const needIcon = iconData_ != null || iconData_ !== undefined && settings.get_("showActionIcon")
    const oldRules: unknown = rules_
    asyncIterFrames_((frames): void => {
      const status0 = frames.cur_.s.status_, curFrame = frames.cur_.s
      for (const port of frames.ports_) {
        let pass: string | null = null, status: Frames.ValidStatus = Frames.Status.enabled
        if (always_enabled) {
          if (port.s.status_ === Frames.Status.enabled) {
            continue;
          }
        } else {
          pass = getExcluded_(port.s.url_, port.s)
          status = pass === null ? Frames.Status.enabled : pass ? Frames.Status.partial : Frames.Status.disabled
          if (!pass && port.s.status_ === status) {
            continue;
          }
        }
        if (frames.lock_) { continue }
        port.postMessage(always_enabled || { N: kBgReq.reset, p: pass, f: 0 });
        port.s.status_ = status;
      }
      if (needIcon && status0 !== curFrame.status_) {
        setIcon_(curFrame.tabId_, curFrame.status_)
      }
    }, () => oldRules === rules_)
}

export const updateListeners_ = (): void => {
    const listenHistory = rules_.length > 0,
    l = getOnURLChange_(),
    listenHash = listenHistory && settings.get_("exclusionListenHash")
    if (!l) { return; }
    if (listening_ !== listenHistory) {
      listening_ = listenHistory
      const e = browserWebNav_()!.onHistoryStateUpdated
      listenHistory ? e.addListener(l) : e.removeListener(l);
      if (listening_) {
        _onlyFirstMatch = settings.get_("exclusionOnlyFirstMatch")
      }
    }
    if (listeningHash_ !== listenHash) {
      listeningHash_ = listenHash
      const e = browserWebNav_()!.onReferenceFragmentUpdated
      listenHash ? e.addListener(l) : e.removeListener(l);
    }
}

settings.updateHooks_.exclusionRules = (rules: ExclusionsNS.StoredRule[]): void => {
  const isEmpty = !rules_.length, curKeyFSM = keyFSM_
  setRules_(rules)
  setTimeout((): void => {
    setTimeout(RefreshStatus_, 10, isEmpty)
    if (keyFSM_ === curKeyFSM) {
      settings.postUpdate_("keyMappings", null)
    }
  }, 1);
};

settings.updateHooks_.exclusionOnlyFirstMatch = (value: boolean): void => {
  _onlyFirstMatch = value
};

settings.updateHooks_.exclusionListenHash = updateListeners_

if (settings.storage_.getItem("exclusionRules") !== "[]") {
  setRules_(settings.get_("exclusionRules"))
}
