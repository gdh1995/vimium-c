import {
  CurCVer_, framesForTab_, iconData_, keyFSM_, needIcon_, OnChrome, OnFirefox, reqH_, setIcon_, settingsCache_,
  updateHooks_
} from "./store"
import * as BgUtils_ from "./utils"
import { browserWebNav_ } from "./browser"
import { formatVimiumUrl_ } from "./normalize_urls"
import * as settings from "./settings"
import { asyncIterFrames_, resetInnerKeepAliveTick_ } from "./ports"

export const createRule_ = (pattern: string, keys: string): ExclusionsNS.Tester => {
    let re: RegExp | null | undefined, newPattern: URLPattern | null | undefined
    let rule: ExclusionsNS.Tester
    keys = keys && keys.replace(<RegExpG> /<(\S+)>/g, "$1");
    if (pattern[0] === "^") {
      if (re = BgUtils_.makeRegexp_(pattern.startsWith("^$|") ? pattern.slice(3) : pattern, "", 0)) {
        /* empty */
      } else {
        console.log("Failed in creating an RegExp from %o", pattern);
      }
    } else if (pattern[0] === "`") {
      if (!(newPattern = BgUtils_.makePattern_(pattern.slice(1), 0))) {
        console.log("Failed in creating an URLPattern from %o", pattern)
      }
    }
    rule = re ? { t: kMatchUrl.RegExp, v: re as RegExpOne, k: keys }
        : newPattern ? { t: kMatchUrl.Pattern, v: { p: newPattern, s: pattern.slice(1) }, k: keys }
        : {
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
    } else if (host[0] === "`") {
      const slice = host.slice(1), newPattern = BgUtils_.makePattern_(slice)
      return newPattern ? { t: kMatchUrl.Pattern, v: { p: newPattern, s: slice } } : null
    } else if (host === "localhost" || !host.includes("/") && host.includes(".")
        && (!(<RegExpOne> /:(?!\d+$)/).test(host) || BgUtils_.isIPHost_(host, 6))) { // ignore rare `IPV6 + :port`
      host = host.toLowerCase()
      host = host.endsWith("*") ? host.slice(0, (<RegExpOne> /^[^\\]\.\*$/).test(host.slice(-3)) ? -2 : -1) : host
      host = host.startsWith(".*") && !(<RegExpOne> /[(\\[]/).test(host) ? "*." + host.slice(2) : host
      let host2: string
      const re = BgUtils_.makeRegexp_("^https?://" + (!host.startsWith("*") || host[1] === "."
            ? (host2 = host.replace(<RegExpG> /\./g, "\\."), // lgtm [js/incomplete-sanitization]
              !host2.startsWith("*") ? host2 : host2.replace("*\\.", "(?:[^./]+\\.)*?"))
            : "[^/]" + host)
            , "", 0)
      return re ? { t: kMatchUrl.RegExp, v: re as RegExpOne } : host.includes("*") ? null
          : { t: kMatchUrl.StringPrefix, v: "https://" + (host.startsWith(".") ? host.slice(1) : host) + "/" }
    } else {
      host = (host[0] === ":" ? host.slice(1) : host).replace(<RegExpOne> /([\/?#])\*$/, "$1")
      host = host.startsWith("vimium://") ? formatVimiumUrl_(host.slice(9), false, Urls.WorkType.ConvertKnown)
          : host.startsWith("extension:") ? OnChrome ? "chrome-" + host : OnFirefox ? "moz-" + host
            : location.protocol + host.slice(10)
          : host
      ind = host.indexOf("://")
      return {
        t: kMatchUrl.StringPrefix,
        v: ind > 0 && ind + 3 < host.length && host.indexOf("/", ind + 3) < 0 ? host + "/" : host
      }
    }
}

export const matchSimply_ = (matcher: ValidUrlMatchers, url: string): boolean =>
    matcher.t === kMatchUrl.RegExp ? matcher.v.test(url)
    : matcher.t === kMatchUrl.StringPrefix ? url.startsWith(matcher.v) : matcher.v.p.test(url)

let listening_ = false
let listeningHash_ = false
let _onlyFirstMatch = false
let rules_: ExclusionsNS.Rules = []

export { listening_ as exclusionListening_, listeningHash_ as exclusionListenHash_ }

const setRules_ = (rules: ExclusionsNS.StoredRule[]): void => {
    rules_ = rules.map(rule => createRule_(rule.pattern, rule.passKeys))
}

export const parseMatcher_ = (pattern: string | null): BaseUrlMatcher[] => {
  const res = pattern ? [createRule_(pattern, "")] : rules_
  return res.map<BaseUrlMatcher>(i => ({ t: i.t, v: i.t === kMatchUrl.RegExp ? i.v.source
      : i.t === kMatchUrl.StringPrefix ? i.v : i.v.s }))
}

export const getExcluded_ = (url: string, sender: Frames.Sender): string | null => {
    let matchedKeys = "";
    for (const rule of rules_) {
      if (rule.t === kMatchUrl.RegExp ? rule.v.test(url)
          : rule.t === kMatchUrl.StringPrefix ? url.startsWith(rule.v)
          : rule.v.p.test(url)) {
        const str = rule.k;
        if (str.length === 0 || str[0] === "^" && str.length > 2 || _onlyFirstMatch) { return str && str.trim() }
        matchedKeys += str;
      }
    }
    if (!matchedKeys && sender.frameId_ && url.lastIndexOf("://", 5) < 0 && !BgUtils_.protocolRe_.test(url)) {
      const top = framesForTab_.get(sender.tabId_)?.top_
      if (top != null) {
        return getExcluded_(top.s.url_, top.s)
      }
    }
    return matchedKeys ? matchedKeys.trim() : null
}

let getOnURLChange_ = (): null | ExclusionsNS.Listener => {
  const onURLChange: null | ExclusionsNS.Listener = !browserWebNav_()
      || !(OnChrome || OnFirefox || browserWebNav_()!.onHistoryStateUpdated) ? null
      : !OnChrome || Build.MinCVer >= BrowserVer.MinWithFrameId || CurCVer_ >= BrowserVer.MinWithFrameId
      ? (details): void => { reqH_[kFgReq.checkIfEnabled](details); resetInnerKeepAliveTick_() }
      : (details): void => {
        const ref = framesForTab_.get(details.tabId),
        msg: Req.bgUrl<kFgReq.checkIfEnabled> = { N: kBgReq.url, H: kFgReq.checkIfEnabled, U: 0 }
        ref && ref.flags_ & Frames.Flags.ResReleased && (ref.flags_ |= Frames.Flags.UrlUpdated)
        // force the tab's ports to reconnect and refresh their pass keys
        for (const port of ref ? ref.ports_ : []) {
          port.postMessage(msg)
        }
        resetInnerKeepAliveTick_()
      };
  getOnURLChange_ = () => onURLChange
  return onURLChange
}

export const getAllPassed_ = (): Set<string> | true | null => {
    const allPassKeys = new Set!<string>()
    for (const { k: passKeys } of rules_) {
      if (passKeys) {
        if (passKeys[0] === "^" && passKeys.length > 2) { return true; }
        for (const key of passKeys.split(" ")) { allPassKeys.add(key) }
      }
    }
    return allPassKeys.size ? allPassKeys : null
}

export const RefreshStatus_ = (old_is_empty: boolean): void => {
    const always_enabled = rules_.length > 0 ? null : <Req.bg<kBgReq.reset>> {
      N: kBgReq.reset, p: null, f: 0
    };
    if (old_is_empty) {
      always_enabled || settings.broadcast_({ N: kBgReq.url, H: kFgReq.checkIfEnabled, U: 0
          } satisfies Req.bgUrl<kFgReq.checkIfEnabled>)
      return;
    }
    const needIcon = iconData_ != null || iconData_ !== undefined && needIcon_
    const oldRules: unknown = rules_
    asyncIterFrames_(Frames.Flags.UrlUpdated, (frames): void => {
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

const updateListeners_ = (): void => {
    const listen = rules_.length > 0, l = listen || listening_ ? getOnURLChange_() : null
    if (!l) { return; }
    if (listening_ !== listen) {
      listening_ = listen
      const e = browserWebNav_()!.onHistoryStateUpdated
      listen ? e.addListener(l) : e.removeListener(l)
    }
    const listenHash = listen && settingsCache_.exclusionListenHash
    if (listeningHash_ !== listenHash) {
      listeningHash_ = listenHash
      const e = browserWebNav_()!.onReferenceFragmentUpdated
      listenHash ? e.addListener(l) : e.removeListener(l);
    }
}

updateHooks_.exclusionRules = (rules: ExclusionsNS.StoredRule[]): void => {
  const isEmpty = !rules_.length, curKeyFSM = keyFSM_
  setRules_(rules)
  _onlyFirstMatch = settingsCache_.exclusionOnlyFirstMatch
  updateListeners_()
  setTimeout((): void => {
    setTimeout(RefreshStatus_, 10, isEmpty)
    if (keyFSM_ === curKeyFSM) {
      settings.postUpdate_("keyMappings", null)
    }
  }, 1);
};

updateHooks_.exclusionOnlyFirstMatch = (value: boolean): void => {
  _onlyFirstMatch = value
};

updateHooks_.exclusionListenHash = updateListeners_

void settings.ready_.then((): void => {
  setRules_(settingsCache_.exclusionRules)
  _onlyFirstMatch = settingsCache_.exclusionOnlyFirstMatch
})
