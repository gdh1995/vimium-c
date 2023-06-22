import {
  curTabId_, Completion_, omniPayload_, reqH_, OnFirefox, CurCVer_, IsEdg_, OnChrome, restoreSettings_, blank_,
  set_needIcon_, set_setIcon_, CONST_, installation_, updateToLocal_, set_updateToLocal_, vomnibarBgOptions_, Origin2_,
  framesForTab_, onInit_, updateHooks_, settingsCache_
} from "./store"
import {
  Tabs_, browser_, getCurWnd, runtimeError_, watchPermissions_, browserWebNav_, runContentScriptsOn_, import2
} from "./browser"
import * as BgUtils_ from "./utils"
import * as settings_ from "./settings"
import { extTrans_, i18nLang_, trans_ } from "./i18n"
import { convertToUrl_, formatVimiumUrl_ } from "./normalize_urls"
import { decodeFileURL_ } from "./normalize_urls"
import { focusOrLaunch_, openUrlReq } from "./open_urls"

import SugType = CompletersNS.SugType
import MatchType = CompletersNS.MatchType

declare const enum OmniboxData {
  DefaultMaxChars = 128,
  MarginH = 160,
  MeanWidthOfChar = 7.72,
  PreservedTitle = 16,
}

updateHooks_.showActionIcon = (value): void => {
    const api = Build.MV3 ? (browser_ as any).action as never : browser_.browserAction
    if (!api) {
      updateHooks_.showActionIcon = undefined
      return
    }
    set_needIcon_(value)
    void import2<typeof import("./action_icon")>("/background/action_icon.js").then(m => { m.toggleIconBuffer_() })
    Promise.resolve(extTrans_("name")).then((title): void => {
      value || (title += "\n\n" + extTrans_("noActiveState"))
      api.setTitle({ title })
    })
}
void settings_.ready_.then((): void => {
  if (settingsCache_.showActionIcon) {
    updateHooks_.showActionIcon!(true, "showActionIcon")
  } else {
    set_setIcon_(blank_)
  }
})

Build.MV3 || setTimeout((): void => {
  void import("/background/sync.js" as string)
}, 100);

(OnChrome || OnFirefox) && ((): void => {
  const omnibox = browser_.omnibox
  if (!omnibox) { return; }
  type OmniboxCallback = (this: void, suggestResults: chrome.omnibox.SuggestResult[]) => true | void;
  const enum FirstSugType {
    Default = 0,
    defaultOpen = 1, search, plainOthers
  }
  interface SuggestCallback {
    suggest_: OmniboxCallback | null;
    sent_: boolean;
    key_: string;
  }
  interface SubInfo { type_?: "history" | "tab"; sessionId_?: CompletersNS.SessionId | null; url_: string }
  let colon2 = ": ", msg_inited = false, openColon = "Open: "
  const onDel = (!OnFirefox || Build.DetectAPIOnFirefox) ? omnibox.onDeleteSuggestion : null,
  mayDelete = OnChrome && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
      || (!OnFirefox || Build.DetectAPIOnFirefox) && !!onDel && typeof onDel.addListener === "function"
  let last: string | null = null, firstResultUrl = "", lastSuggest: SuggestCallback | null = null
    , timer = 0, subInfoMap: Map<string, SubInfo> | null = null
    , maxChars = OmniboxData.DefaultMaxChars
    , suggestions: chrome.omnibox.SuggestResult[] | null = null, cleanTimer = 0, inputTime: number
    , defaultSuggestionType = FirstSugType.Default, matchType: CompletersNS.MatchType = CompletersNS.MatchType.Default
    , matchedSugTypes = CompletersNS.SugType.Empty;
  const
  maxResults = OnFirefox || OnChrome && Build.MinCVer < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12
      && CurCVer_ < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12 ? 6 : 12
  const normalizeInput = (input: string): string => {
    input = input.trim().replace(BgUtils_.spacesRe_, " ")
    if (vomnibarBgOptions_.actions.includes("icase")) {
      const prefix = (<RegExpOne> /^:[WBH] /).test(input) ? 3 : 0
      input = prefix ? input.slice(0, prefix) + input.slice(prefix).toLowerCase() : input.toLowerCase()
    }
    return input
  }
  function clean(): void {
    if (lastSuggest) { lastSuggest.suggest_ = null; }
    subInfoMap = suggestions = lastSuggest = last = null;
    if (cleanTimer) { clearTimeout(cleanTimer); }
    if (timer) { clearTimeout(timer); }
    inputTime = matchType = matchedSugTypes = cleanTimer = timer = 0;
    firstResultUrl = "";
    BgUtils_.resetRe_();
  }
  function tryClean(): void {
    const delta = Date.now() - inputTime; // safe for time changes
    if (delta > 5000 || delta < -GlobalConsts.ToleranceOfNegativeTimeDelta) {
      return clean();
    }
    cleanTimer = setTimeout(tryClean, 30000);
  }
  function onTimer(): void {
    timer = 0;
    const arr = lastSuggest;
    if (!arr || arr.sent_) { return; }
    lastSuggest = null;
    if (arr.suggest_) {
      const now = Date.now(); // safe for time changes
      if (now < inputTime) {
        inputTime = now - 1000;
      }
      return onInput(arr.key_, arr.suggest_);
    }
  }
  function onComplete(this: null, suggest: SuggestCallback, response: Suggestion[]
      , autoSelect: boolean, newMatchType: CompletersNS.MatchType, newMatchedSugTypes: CompletersNS.SugType): void {
// Note: in https://chromium.googlesource.com/chromium/src/+/master/chrome/browser/autocomplete/keyword_extensions_delegate_impl.cc#167 ,
// the block of `case extensions::NOTIFICATION_EXTENSION_OMNIBOX_SUGGESTIONS_READY:`
//   always refuses suggestions from old input_ids
    if (!suggest.suggest_) {
      lastSuggest === suggest && (lastSuggest = null);
      return;
    }
    lastSuggest = null;
    let notEmpty = response.length > 0, sug: Suggestion = notEmpty ? response[0] : null as never
      , defaultDesc: string | undefined
    matchType = newMatchType;
    matchedSugTypes = newMatchedSugTypes;
    suggestions = [];
    const urlDict = new Set!<string>()
    const showTypeLetter = ` ${omniPayload_.t} `.includes(" type-letter ")
    for (let i = 0, di = autoSelect ? 0 : 1, len = response.length; i < len; i++) {
      const sugItem = response[i], { title, u: rawUrl, e: type } = sugItem
      let url = rawUrl, desc = "", hasSessionId = sugItem.s != null
        , canBeDeleted = (OnChrome && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
              || (!OnFirefox || Build.DetectAPIOnFirefox) && mayDelete)
            && !(autoSelect && i === 0) && (
          type === "tab" ? sugItem.s !== curTabId_ : type === "history" && (OnFirefox || !hasSessionId)
        );
      url = BgUtils_.encodeAsciiURI_(url, 1)
      url.startsWith("file") && (url = decodeFileURL_(url))
      url = url.replace(<RegExpG> /%20/g, " ")
      urlDict.has(url) ? (url = `:${i + di} ${url}`) : urlDict.add(url)
      if (canBeDeleted) {
        desc = ` ~${i + di}~`
      }
      if (OnFirefox) {
        desc = (title && title + " - ") + sugItem.textSplit! + desc
      } else {
        desc = (title || showTypeLetter ? (title ? title + " <dim>" : "<dim>")
                  + (showTypeLetter ? `[${sugItem.e[0].toUpperCase()}] ` : "")
                  + (title ? "-</dim> <url>" : "</dim><url>") : "<url>"
            ) + sugItem.textSplit! + "</url>" + (desc && `<dim>${desc}</dim>`)
      }
      const msg: chrome.omnibox.SuggestResult = { content: url, description: desc };
      canBeDeleted && (msg.deletable = true);
      if (canBeDeleted || hasSessionId) {
        if (!subInfoMap) { subInfoMap = new Map() }
        subInfoMap.has(url) || subInfoMap.set(url, { type_: <SubInfo["type_"]> type,
            sessionId_: hasSessionId ? sugItem.s! : null, url_: rawUrl })
      }
      suggestions.push(msg);
    }
    last = suggest.key_;
    if (!autoSelect) {
      if (OnFirefox) {
        defaultDesc = openColon + "<input>"
      } else if (defaultSuggestionType !== FirstSugType.defaultOpen) {
        defaultDesc = `<dim>${openColon}</dim><url>%s</url>`
        defaultSuggestionType = FirstSugType.defaultOpen;
      }
    } else if (sug.e === "search") {
      let text = (sug as CompletersNS.SearchSuggestion).p;
      if (OnFirefox) {
        defaultDesc = (text && text + colon2) + sug.textSplit!
      } else {
        defaultDesc = (text && `<dim>${BgUtils_.escapeText_(text) + colon2}</dim>`) + `<url>${sug.textSplit}</url>`
      }
      defaultSuggestionType = FirstSugType.search;
      if (sug = response[1]) {
        switch (sug.e) {
        case "math":
          suggestions[1].description = OnFirefox
              ? sug.textSplit! + " = " + sug.t
              : `${sug.textSplit} = <url><match>${sug.t}</match></url>`
          break;
        }
      }
    } else {
      defaultSuggestionType = FirstSugType.plainOthers;
      defaultDesc = suggestions[0].description;
    }
    if (autoSelect) {
      firstResultUrl = response[0].u;
      if (subInfoMap && suggestions.length > 0 && firstResultUrl !== suggestions[0].content) {
        subInfoMap.set(firstResultUrl, subInfoMap.get(suggestions[0].content)!)
      }
      suggestions.shift();
    }
    defaultDesc && browser_.omnibox.setDefaultSuggestion({ description: defaultDesc })
    suggest.suggest_(suggestions);
    BgUtils_.resetRe_();
    return;
  }
  function onInput(this: void, key: string, suggest: OmniboxCallback): void {
    key = normalizeInput(key)
    if (lastSuggest) {
      let same = key === lastSuggest.key_;
      lastSuggest.suggest_ = same ? suggest : null;
      if (same) {
        return;
      }
    }
    if (key === last) {
      suggestions && suggest(suggestions);
      return;
    }
    if (matchType === CompletersNS.MatchType.emptyResult && key.startsWith(last!)) {
      if (OnFirefox) {
        // note: firefox always uses a previous version of "default suggestion" for `current` query
        // which is annoying, so here should not show dynamic content;
        // in other cases like searching, do show the real result to provide as much info as possible
        browser_.omnibox.setDefaultSuggestion({ description: "Open: <input>" })
      }
      // avoid Chrome showing results from its inner search engine because of `suggest` being destroyed
      suggest([]);
      return;
    }
    lastSuggest = { suggest_: suggest, key_: key, sent_: false };
    if (timer) { return; }
    const now = Date.now(),
    delta = omniPayload_.i + inputTime - now; /** it's made safe by {@see #onTimer} */
    if (delta > 30 && delta < 3000) { // in case of system time jumping
      timer = setTimeout(onTimer, delta);
      return;
    }
    lastSuggest.sent_ = true;
    cleanTimer || (cleanTimer = setTimeout(tryClean, 30000));
    inputTime = now;
    subInfoMap = suggestions = null; firstResultUrl = "";
    const type: SugType = matchType < MatchType.someMatches || !key.startsWith(last!) ? SugType.Empty
      : matchType === MatchType.searchWanted ? !key.includes(" ") ? SugType.search : SugType.Empty
      : matchedSugTypes;
    Completion_.filter_(key
      , { o: "omni", t: type, r: maxResults, c: maxChars, f: CompletersNS.QueryFlags.AddressBar }
      , onComplete.bind(null, lastSuggest));
  }
  function onEnter(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition): void {
    const arr = lastSuggest;
    if (arr && arr.suggest_) {
      arr.suggest_ = onEnter.bind(null, text, disposition);
      if (arr.sent_) { return; }
      timer && clearTimeout(timer);
      return onTimer();
    }
    text = normalizeInput(text)
    if (last === null && text) {
      // need a re-computation
      // * may has been cleaned, or
      // * search `v `"t.e abc", and then input "t.e abc", press Down to select `v `"t.e abc", and then press Enter
      return Completion_.filter_(text
          , { o: "omni", t: SugType.Empty, r: 3, c: maxChars, f: CompletersNS.QueryFlags.AddressBar }
          , function (sugs, autoSelect): void {
        return autoSelect ? open(sugs[0].u, disposition, sugs[0].s) : open(text, disposition);
      });
    }
    if (firstResultUrl && text === last) { text = firstResultUrl; }
    const info = subInfoMap?.get(text), sessionId = info?.sessionId_
    clean();
    return open(info ? info.url_ : text, disposition, sessionId)
  }
  function open(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition
      , sessionId?: CompletersNS.SessionId | null): void {
    if (!text) {
      text = convertToUrl_("")
    } else if (text[0] === ":" && (<RegExpOne> /^:([1-9]|1[0-2]) /).test(text)) {
      text = text.slice(text[2] === " " ? 3 : 4);
    }
    if (text.slice(0, 7).toLowerCase() === "file://") {
      text = BgUtils_.getImageExtRe_().test(text)
        ? formatVimiumUrl_("show image " + text, false, Urls.WorkType.Default)
        : text
    }
    return sessionId != null ? reqH_[kFgReq.gotoSession]({ s: sessionId }) : openUrlReq({
      u: text,
      r: (disposition === "currentTab" ? ReuseType.current
        : disposition === "newForegroundTab" ? ReuseType.newFg : ReuseType.newBg)
    })
  }
  omnibox.onInputStarted.addListener(function (): void {
    getCurWnd(false, (wnd): void => {
      const width = wnd && wnd.width;
      maxChars = width
        ? Math.floor((width - OmniboxData.MarginH / (Build.MV3 ? 1 : devicePixelRatio)) / OmniboxData.MeanWidthOfChar)
        : OmniboxData.DefaultMaxChars;
    });
    if (!msg_inited) {
      msg_inited = true
      Promise.resolve(extTrans_("i18n")).then((): void => { if (i18nLang_() !== "en") {
        void Promise.resolve(trans_("colon")).then((colon): void => {
          colon2 = colon + <string> trans_("NS") || colon2
          openColon = trans_("OpenC") as string || openColon
        })
      } })
    }
    if (cleanTimer) {
      return clean();
    }
  });
  omnibox.onInputChanged.addListener(onInput);
  omnibox.onInputEntered.addListener(onEnter);
  (OnChrome && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
    || (!OnFirefox || Build.DetectAPIOnFirefox) && mayDelete) &&
  onDel!.addListener(function (text): void {
    // eslint-disable-next-line radix
    const ind = parseInt(text.slice(text.lastIndexOf("~", text.length - 2) + 1)) - 1;
    const url = suggestions && suggestions[ind].content, info = url && subInfoMap ? subInfoMap.get(url) : null,
    type = info && info.type_;
    if (!type) {
      console.log("Error: want to delete a suggestion but no related info found (may spend too long before deleting).");
      return;
    }
    reqH_[kFgReq.removeSug]({ t: type, s: info.sessionId_, u: info.url_ })
  })
})()

OnChrome && Build.OnBrowserNativePages && ((): void => {
  let status: 0 | 1 | 2 | 3 = 0, listened = false, refreshTimer = 0
  const protocol = IsEdg_ ? "edge:" : "chrome:",
  ntp = !IsEdg_ ? protocol + "//newtab/" : "", ntp2 = !IsEdg_ ? protocol + "//new-tab-page/" : ""
  const onCommitted = (nav: chrome.webNavigation.WebNavigationTransitionCallbackDetails): void => {
    if (nav.frameId === 0 && nav.url.startsWith(protocol)
        && status & (!IsEdg_ && (nav.url.startsWith(ntp) || nav.url.startsWith(ntp2)) ? 2 : 1) && !refreshTimer) {
      runContentScriptsOn_(nav.tabId)
    }
  }
  watchPermissions_([ { origins: ["chrome://*/*"] },
    (Build.MinCVer >= BrowserVer.MinChromeURL$NewTabPage || CurCVer_ > BrowserVer.MinChromeURL$NewTabPage - 1)
    && !IsEdg_ ? { origins: ["chrome://new-tab-page/*"] } : null
  ], function onChange (allowList): void | false {
    status = ((allowList[0] ? 1 : 0) + (allowList[1] ? 2 : 0)) as 0 | 1 | 2 | 3
    if (status & 1 && !settingsCache_.allBrowserUrls) { status ^= 1 }
    if (listened !== !!status) {
      const webNav = browserWebNav_()
      if (!webNav) { return false }
      // tabs.onUpdated can be triggered too many times: https://github.com/gdh1995/vimium-c/issues/381
      webNav.onCommitted[(listened = !listened) ? "addListener" : "removeListener"](onCommitted)
    }
    refreshTimer = refreshTimer || status && setTimeout((): void => {
      status ? Tabs_.query({ url: protocol + "//*/*" }, (tabs): void => {
        refreshTimer = 0
        for (const tab of tabs || []) {
          if (!framesForTab_.has(tab.id) && (status & (tab.url.startsWith(ntp) || tab.url.startsWith(ntp2) ? 2 : 1))) {
            runContentScriptsOn_(tab.id)
          }
        }
        return runtimeError_()
      }) : refreshTimer = 0
    }, 120)
    if (status && !updateHooks_.allBrowserUrls) {
      updateHooks_.allBrowserUrls = onChange.bind(null, allowList, false)
    }
  })
})()

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
installation_ && void Promise.all([installation_, settings_.ready_]).then(([details]): void => {
  const reason = details && details.reason;
  const oldVer = reason === "install" ? "" : reason === "update" && details!.previousVersion! || "none"
  if (oldVer === "none") { return }

  setTimeout((): void => {
  OnFirefox || Tabs_.query({ status: "complete" }, (tabs): void => {
    const allowedRe = <RegExpOne> /^(file|ftps?|https?):/
    for (const tab of tabs) {
      allowedRe.test(tab.url) && !framesForTab_.has(tab.id) && runContentScriptsOn_(tab.id)
    }
  });
  console.log("%cVimium C%c has been %cinstalled%c with %o at %c%s%c.", "color:red", "color:auto"
      , "color:#0c85e9", "color:auto", details, "color:#0c85e9", BgUtils_.now(), "color:auto")

  if (CONST_.DisallowIncognito_) {
    console.log("Sorry, but some commands of Vimium C require the permission to run in incognito mode.");
  }

  if (!oldVer) {
      const delay = (): void => {
        if (onInit_ || restoreSettings_) { ++tick < 25 && setTimeout(delay, 200); return }
        focusOrLaunch_({ u: CONST_.OptionsPage_ + (Build.NDEBUG ? "#commands" : "#installed") })
      }
      let tick = 0
      delay()
    return
  }
  settings_.postUpdate_("vomnibarPage")
  if (parseFloat(oldVer) >= parseFloat(CONST_.VerCode_)) {
    if (oldVer >= "1.99.98" || CONST_.VerCode_ < "1.99.98") { return }
  }

  if (Build.MV3) { /* empty */ }
  else if (updateToLocal_) {
    (updateToLocal_ as Exclude<typeof updateToLocal_, true | null>)(6000)
  } else {
    set_updateToLocal_(true)
  }
  settings_.postUpdate_("newTabUrl")

  if (!settingsCache_.notifyUpdate) { return }

  let noteId = "vimium_c-upgrade-notification"
  void Promise.all([ trans_("Upgrade"), trans_("upgradeMsg", [CONST_.VerName_]), trans_("upgradeMsg2")
      , trans_("clickForMore") ]).then(([upgrade, msg, msg2, clickForMore]): void => {
  const args: chrome.notifications.NotificationOptions = {
    type: "basic",
    iconUrl: Origin2_ + "icons/icon128.png",
    title: "Vimium C " + upgrade,
    message: msg + msg2 + "\n\n" + clickForMore
  };
  if (OnChrome && Build.MinCVer < BrowserVer.Min$NotificationOptions$$isClickable$IsDeprecated
      && CurCVer_ < BrowserVer.Min$NotificationOptions$$isClickable$IsDeprecated) {
    args.isClickable = true; // not supported on Firefox
  }
  if (OnChrome && CurCVer_ >= BrowserVer.Min$NotificationOptions$$silent) {
    args.silent = true;
  }
  const browserNotifications = browser_.notifications
  browserNotifications && browserNotifications.create(noteId, args, function (notificationId): void {
    let err: any;
    if (err = runtimeError_()) { return err }
    noteId = notificationId || noteId
    browserNotifications.onClicked.addListener(function callback(id): void {
      if (id !== id) { return; }
      browserNotifications.clear(id)
      focusOrLaunch_({ u: convertToUrl_("vimium://release") })
      browserNotifications.onClicked.removeListener(callback)
    });
  });
  })
  }, 500)
})

setTimeout((): void => {
  const doc = (globalThis as MaybeWithWindow).document
  if (OnChrome && Build.MinCVer < BrowserVer.MinSetInnerTextOnHTMLHtmlElement) {
    (doc!.body as HTMLBodyElement).innerHTML = ""
  } else if (doc && doc.body) {
    (doc.body as HTMLBodyElement).innerText = ""
  }
  BgUtils_.resetRe_();
  if (!Build.NDEBUG) {
    type GlobalExForDebug = (typeof globalThis) & { a: unknown; cb: (i: any) => void }
    (globalThis as GlobalExForDebug).a = null;
    (globalThis as GlobalExForDebug).cb = (b): void => { (globalThis as GlobalExForDebug).a = b; console.log("%o", b) }
  }
}, 1000)
