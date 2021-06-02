declare const enum OmniboxData {
  DefaultMaxChars = 128,
  MarginH = 160,
  MeanWidthOfChar = 7.72,
  PreservedTitle = 16,
}

BgUtils_.timeout_(150, function (): void {
  const browserAction = chrome.browserAction;
  if (!browserAction) { return; }
  let imageData: IconNS.StatusMap<IconNS.IconBuffer> | null, tabIds: Map<Frames.ValidStatus, number[] | null> | null
  let mayShowIcons = true;
  const func = Settings_.updateHooks_.showActionIcon,
  onerror = (err: any): void => {
      if (!mayShowIcons) { return; }
      mayShowIcons = false;
      console.log("Can not access binary icon data:", err);
      Backend_.setIcon_ = BgUtils_.blank_;
      browserAction.setTitle({ title: "Vimium C\n\nFailed in showing dynamic icons." });
  },
  loadBinaryImagesAndSetIcon = (type: Frames.ValidStatus): void => {
      const path = Settings_.icons_[type] as IconNS.BinaryPath;
      const loadFromRawArray = (array: ArrayBuffer): void => {
      const uint8Array = new Uint8ClampedArray(array), firstSize = array.byteLength / 5,
      small = (Math.sqrt(firstSize / 4) | 0) as IconNS.ValidSizes, large = (small + small) as IconNS.ValidSizes,
      cache = BgUtils_.safeObj_() as IconNS.IconBuffer;
      cache[small] = new ImageData(uint8Array.subarray(0, firstSize), small, small);
      cache[large] = new ImageData(uint8Array.subarray(firstSize), large, large);
      imageData![type] = cache;
      const arr = tabIds!.get(type)!
      tabIds!.delete(type)
      for (let w = 0, h = arr.length; w < h; w++) {
        Backend_.setIcon_(arr[w], type, true);
      }
      };
      if (Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
          || CurCVer_ >= BrowserVer.MinFetchExtensionFiles) {
        const p = fetch(path).then(r => r.arrayBuffer()).then(loadFromRawArray);
        if (!Build.NDEBUG) { p.catch(onerror); }
      } else {
        const req = new XMLHttpRequest() as ArrayXHR;
        req.open("GET", path, true);
        req.responseType = "arraybuffer";
        if (!Build.NDEBUG) { req.onerror = onerror; }
        req.onload = function (this: typeof req) { loadFromRawArray(this.response); };
        req.send();
      }
  };
  Settings_.temp_.IconBuffer_ = function (this: void, enabled?: boolean): boolean | void {
    if (enabled == null) { return !!imageData; }
    if (!enabled) {
      imageData && setTimeout(function () {
        if (Settings_.get_("showActionIcon")) { return; }
        imageData = null;
        if (Build.BTypes & BrowserType.Chrome) { tabIds = null; }
        if (Build.BTypes & ~BrowserType.Chrome
            && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
          Backend_.indexPorts_().forEach(({ cur_: { s: sender } }): void => {
            if (sender.status_ !== Frames.Status.enabled) {
              Backend_.setIcon_(sender.tabId_, Frames.Status.enabled)
            }
          })
          return;
        }
      }, 200);
      return;
    }
    if (imageData) { return; }
    if (!(Build.BTypes & BrowserType.Chrome)) {
      imageData = 1 as unknown as IconNS.StatusMap<IconNS.IconBuffer>;
    } else {
      imageData = [null, null, null];
      tabIds = new Map()
    }
    // only do partly updates: ignore "rare" cases like `sender.s` is enabled but the real icon isn't
    Backend_.indexPorts_().forEach(({ cur_: { s: sender } }): void => {
      if (sender.status_ !== Frames.Status.enabled) {
        Backend_.setIcon_(sender.tabId_, sender.status_)
      }
    })
  } as IconNS.AccessIconBuffer;
  Backend_.setIcon_ = function (this: void, tabId: number, type: Frames.ValidStatus, isLater?: true): void {
    if (tabId < 0) {
      return
    }
    /** Firefox does not use ImageData as inner data format
     * * https://dxr.mozilla.org/mozilla-central/source/toolkit/components/extensions/schemas/manifest.json#577
     *   converts ImageData objects in parameters into data:image/png,... URLs
     * * https://dxr.mozilla.org/mozilla-central/source/browser/components/extensions/parent/ext-browserAction.js#483
     *   builds a css text of "--webextension-***: url(icon-url)",
     *   and then set the style of an extension's toolbar button to it
     */
    if (Build.BTypes & ~BrowserType.Chrome
        && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
      browserAction.setIcon({ tabId, path: Settings_.icons_[type]! });
      return;
    }
    let data: IconNS.IconBuffer | null | undefined;
    if (data = imageData![type]) {
      const f = browserAction.setIcon
      const args: chrome.browserAction.TabIconDetails = { tabId, imageData: data }
      isLater ? f(args, BgUtils_.runtimeError_) : f(args);
    } else if (tabIds!.has(type)) {
      tabIds!.get(type)!.push(tabId)
    } else {
      setTimeout(loadBinaryImagesAndSetIcon, 0, type);
      tabIds!.set(type, [tabId])
    }
  };
  Settings_.updateHooks_.showActionIcon = function (value): void {
    func(value);
    Settings_.temp_.IconBuffer_!(value);
    let title = trans_("name");
    value || (title += "\n\n" + trans_("noActiveState"));
    browserAction.setTitle({ title });
  };
  Settings_.postUpdate_("showActionIcon");
});

BgUtils_.timeout_(600, function (): void {
  const omnibox = chrome.omnibox;
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
  interface SubInfo {
    type_?: "history" | "tab";
    sessionId_?: number | string;
  }
  const colon2 = trans_("colon") + trans_("NS")
  const onDel = (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox)
      ? omnibox.onDeleteSuggestion : null,
  mayDelete = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
      || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox)
          && !!onDel && typeof onDel.addListener === "function";
  let last: string | null = null, firstResultUrl = "", lastSuggest: SuggestCallback | null = null
    , timer = 0, subInfoMap: Map<string, SubInfo> | null = null
    , maxChars = OmniboxData.DefaultMaxChars
    , suggestions: chrome.omnibox.SuggestResult[] | null = null, cleanTimer = 0, inputTime: number
    , defaultSuggestionType = FirstSugType.Default, matchType: CompletersNS.MatchType = CompletersNS.MatchType.Default
    , matchedSugTypes = CompletersNS.SugType.Empty;
  const
  maxResults = !(Build.BTypes & ~BrowserType.Firefox)
    || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
    || Build.MinCVer < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12
      && Build.BTypes & BrowserType.Chrome
      && CurCVer_ < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12 ? 6 : 12
  ;
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
      , defaultDesc: string | undefined, info: SubInfo = {};
    matchType = newMatchType;
    matchedSugTypes = newMatchedSugTypes;
    if (notEmpty
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
            || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && mayDelete
            || response[0].s != null)) {
      subInfoMap = new Map()
    }
    suggestions = [];
    const urlDict: TextSet = new Set!()
    const showTypeLetter = ` ${Settings_.omniPayload_.s} `.includes(" type-letter ")
    for (let i = 0, di = autoSelect ? 0 : 1, len = response.length; i < len; i++) {
      let sugItem = response[i], { title, u: url, e: type } = sugItem, desc = "", hasSessionId = sugItem.s != null
        , canBeDeleted = (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
              || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && mayDelete)
            && !(autoSelect && i === 0) && (
          type === "tab" ? sugItem.s !== TabRecency_.curTab_
          : type === "history" && (!(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox || !hasSessionId)
        );
      if (urlDict.has(url)) {
        url = `:${i + di} ${url}`
      } else {
        urlDict.add(url)
      }
      url = BgUtils_.encodeAsciiURI(url, 1).replace(<RegExpG> /%20/g, " ")
      url = BgUtils_.decodeFileURL_(url)
      if (canBeDeleted) {
        info.type_ = <SubInfo["type_"]> type;
        desc = ` ~${i + di}~`
      }
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        desc = (title && title + " - ") + sugItem.textSplit! + desc
      } else {
        desc = (title || showTypeLetter ? (title ? title + " <dim>" : "<dim>")
                  + (showTypeLetter ? `[${sugItem.e[0].toUpperCase()}] ` : "")
                  + (title ? "-</dim> <url>" : "</dim><url>") : "<url>"
            ) + sugItem.textSplit! + "</url>" + (desc && `<dim>${desc}</dim>`)
      }
      const msg: chrome.omnibox.SuggestResult = { content: url, description: desc };
      canBeDeleted && (msg.deletable = true);
      hasSessionId && (info.sessionId_ = sugItem.s!);
      if (canBeDeleted || hasSessionId) {
        subInfoMap!.set(url, info)
        info = {};
      }
      suggestions.push(msg);
    }
    last = suggest.key_;
    if (!autoSelect) {
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        defaultDesc = trans_("OpenC") + "<input>";
      } else if (defaultSuggestionType !== FirstSugType.defaultOpen) {
        defaultDesc = `<dim>${trans_("OpenC")}</dim><url>%s</url>`;
        defaultSuggestionType = FirstSugType.defaultOpen;
      }
    } else if (sug.e === "search") {
      let text = (sug as CompletersNS.SearchSuggestion).p;
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        defaultDesc = (text && text + colon2) + sug.textSplit!
      } else {
        defaultDesc = (text && `<dim>${BgUtils_.escapeText_(text) + colon2}</dim>`) + `<url>${sug.textSplit}</url>`
      }
      defaultSuggestionType = FirstSugType.search;
      if (sug = response[1]) {
        switch (sug.e) {
        case "math":
          suggestions[1].description = Build.BTypes & BrowserType.Firefox
                && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
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
      suggestions.shift();
    }
    defaultDesc && chrome.omnibox.setDefaultSuggestion({ description: defaultDesc });
    suggest.suggest_(suggestions);
    BgUtils_.resetRe_();
    return;
  }
  function onInput(this: void, key: string, suggest: OmniboxCallback): void {
    key = key.trim().replace(BgUtils_.spacesRe_, " ");
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
      // avoid Chrome showing results from its inner search engine because of `suggest` being destroyed
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        // note: firefox always uses a previous version of "default suggestion" for `current` query
        // which is annoying, so here should not show dynamic content;
        // in other cases like searching, do show the real result to provide as much info as possible
        chrome.omnibox.setDefaultSuggestion({ description: "Open: <input>" });
      }
      suggest([]);
      return;
    }
    lastSuggest = { suggest_: suggest, key_: key, sent_: false };
    if (timer) { return; }
    const now = Date.now(),
    delta = Settings_.omniPayload_.t + inputTime - now; /** it's made safe by {@see #onTimer} */
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
    text = text.trim().replace(BgUtils_.spacesRe_, " ");
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
    const sessionId = subInfoMap && subInfoMap.get(text) && subInfoMap.get(text)!.sessionId_
    clean();
    return open(text, disposition, sessionId);
  }
  function open(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition
      , sessionId?: string | number | null): void {
    if (!text) {
      text = BgUtils_.convertToUrl_("");
    } else if (text[0] === ":" && (<RegExpOne> /^:([1-9]|1[0-2]) /).test(text)) {
      text = text.slice(text[2] === " " ? 3 : 4);
    }
    if (text.slice(0, 7).toLowerCase() === "file://") {
      text = BgUtils_.showFileUrl_(text);
    }
    return sessionId != null ? Backend_.reqH_[kFgReq.gotoSession]({ s: sessionId })
        : Backend_.reqH_[kFgReq.openUrl]({
      u: text,
      r: (disposition === "currentTab" ? ReuseType.current
        : disposition === "newForegroundTab" ? ReuseType.newFg : ReuseType.newBg)
    }, null as never as Frames.Port);
  }
  omnibox.onInputStarted.addListener(function (): void {
    chrome.windows.getCurrent(function (wnd?: chrome.windows.Window): void {
      const width = wnd && wnd.width;
      maxChars = width
        ? Math.floor((width - OmniboxData.MarginH / devicePixelRatio) / OmniboxData.MeanWidthOfChar)
        : OmniboxData.DefaultMaxChars;
    });
    if (cleanTimer) {
      return clean();
    }
  });
  omnibox.onInputChanged.addListener(onInput);
  omnibox.onInputEntered.addListener(onEnter);
  (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
    || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && mayDelete) &&
  onDel!.addListener(function (text): void {
    // eslint-disable-next-line radix
    const ind = parseInt(text.slice(text.lastIndexOf("~", text.length - 2) + 1)) - 1;
    let url = suggestions && suggestions[ind].content, info = url && subInfoMap && subInfoMap.get(url) || null,
    type = info && info.type_;
    if (!type) {
      console.log("Error: want to delete a suggestion but no related info found (may spend too long before deleting).");
      return;
    }
    if (url![0] === ":") {
      url = url!.slice(url!.indexOf(" ") + 1);
    }
    Backend_.reqH_[kFgReq.removeSug]({ t: type, u: type === "tab" ? info!.sessionId_ as string : url! }, null)
  });
});

declare const enum I18nConsts {
  storageKey = "i18n_f",
}
if (Build.BTypes & BrowserType.Firefox
    && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
setTimeout(function (loadI18nPayload: () => void): void {
  const nativeTrans = trans_, lang2 = nativeTrans("lang2"), lang1 = trans_("lang1"),
  i18nVer = `${lang2 || lang1 || "en"},${Settings_.CONST_.VerCode_},`,
  // eslint-disable-next-line arrow-body-style
  newTrans: typeof chrome.i18n.getMessage = (messageName, substitutions): string => {
    return i18nKeys.has(messageName) || "0" <= messageName && messageName < "9" + kChar.minNotNum
        ? nativeTrans(messageName, substitutions) : ""
  };
  let oldStr = localStorage.getItem(I18nConsts.storageKey), keyArrays: string[] = [], i18nKeys: Set<string>, toDos = 0,
  fixTrans = (updateCache: BOOL): void => {
    i18nKeys = new Set!<string>(keyArrays);
    trans_ = newTrans;
    keyArrays = fixTrans = null as never;
    if (updateCache) {
      localStorage.setItem(I18nConsts.storageKey, i18nVer + [...(i18nKeys as any)].join(","));
    }
    Settings_.temp_.loadI18nPayload_ = loadI18nPayload;
  };
  if (oldStr && oldStr.startsWith(i18nVer)) {
    keyArrays = oldStr.slice(i18nVer.length).split(",");
    fixTrans(0);
    return;
  }
  const onload = (messages: Dict<{ message: string }>): void => {
    keyArrays = keyArrays.concat(Object.keys(messages).filter(i => !("0" <= i && i < "9" + kChar.minNotNum)))
    if (0 === --toDos) {
      fixTrans(1);
    }
  };
  for (const langName of new Set!<string>(["en", lang1, lang2]) as unknown as string[]) {
    if (langName) {
      void fetch(`/_locales/${langName}/messages.json`).then(r => r.json<Dict<any>>()).then(onload)
      toDos++;
    }
  }
}, 33, Settings_.temp_.loadI18nPayload_!);
Settings_.temp_.loadI18nPayload_ = null;
}

Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
&& BgUtils_.timeout_(100, (): void => {
  let status: 0 | 1 | 2 | 3 = 0, protocol = IsEdg_ ? "edge:" : "chrome:", ntp = protocol + "//newtab/"
  const onTabsUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void => {
    if (tab.url.startsWith(protocol) && status & (tab.url === ntp ? 2 : 1)
        && changeInfo.status === "loading") {
      const js = Settings_.CONST_.ContentScripts_, offset = location.origin.length
      for (let _j = 0, _len = js.length - 1; _j < _len; ++_j) {
        chrome.tabs.executeScript(tabId, { file: js[_j].slice(offset) }, BgUtils_.runtimeError_)
      }
    }
  }
  const recheck = (): void => {
    chrome.permissions.contains({ origins: ["chrome://*/*"] }, allAllowed => {
      const err = BgUtils_.runtimeError_()
      if (err) { return err }
      const cb = (ntpAllowed: boolean | null): void => {
        chrome.permissions.onAdded[allAllowed && ntpAllowed !== false ? "removeListener" : "addListener"](recheck)
        status = ((allAllowed ? 1 : 0) + (ntpAllowed ? 2 : 0)) as 0 | 1 | 2 | 3
        chrome.permissions.onRemoved[status ? "addListener" : "removeListener"](recheck)
        chrome.tabs.onUpdated[status ? "addListener" : "removeListener"](onTabsUpdated)
      }
      if ((Build.MinCVer >= BrowserVer.MinChromeURL$NewTabPage || CurCVer_ > BrowserVer.MinChromeURL$NewTabPage - 1)
          && !IsEdg_) {
        chrome.permissions.contains({ origins: ["chrome://new-tab-page/"] }, cb)
      } else {
        cb(null)
      }
    })
  }
  recheck()
})

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
chrome.runtime.onInstalled.addListener(Settings_.temp_.onInstall_ =
function (details: chrome.runtime.InstalledDetails): void {
  let reason = details.reason;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion!; }
  else { return; }
  if (Settings_.temp_.onInstall_) {
    chrome.runtime.onInstalled.removeListener(Settings_.temp_.onInstall_)
    Settings_.temp_.onInstall_ = null
  } else {
    return
  }

  BgUtils_.timeout_(500, function (): void {
  Build.BTypes & ~BrowserType.Firefox &&
  (!(Build.BTypes & BrowserType.Firefox) || OnOther !== BrowserType.Firefox) &&
  chrome.tabs.query({
    status: "complete"
  }, function (tabs) {
    const t = chrome.tabs, callback = BgUtils_.runtimeError_,
    allowedRe = <RegExpOne> /^(file|ftps?|https?):/,
    offset = location.origin.length, js = Settings_.CONST_.ContentScripts_;
    for (let _i = tabs.length, _len = js.length - 1; 0 <= --_i; ) {
      if (!allowedRe.test(tabs[_i].url)) { continue; }
      let tabId = tabs[_i].id;
      for (let _j = 0; _j < _len; ++_j) {
        t.executeScript(tabId, {file: js[_j].slice(offset), allFrames: true}, callback);
      }
    }
  });
  function now(): string {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60).toJSON().slice(0, -5).replace("T", " ")
  }
  console.log("%cVimium C%c has been %cinstalled%c with %o at %c%s%c.", "color:red", "color:auto"
    , "color:#0c85e9", "color:auto", details, "color:#0c85e9", now(), "color:auto");

  if (Settings_.CONST_.DisallowIncognito_) {
    console.log("Sorry, but some commands of Vimium C require the permission to run in incognito mode.");
  }

  if (!reason) {
    const p = Settings_.restore_ && Settings_.restore_() || Promise.resolve()
    void p.then(() => Backend_.onInit_ ? new Promise(resolve => setTimeout(resolve, 200)) : 0).then((): void => {
      Backend_.reqH_[kFgReq.focusOrLaunch]({
        u: Settings_.CONST_.OptionsPage_ + (Build.NDEBUG ? "#commands" : "#installed")
      })
    })
    return
  }
  if (parseFloat(Settings_.CONST_.VerCode_) <= parseFloat(reason)) { return; }

  const ref1 = Settings_.temp_;
  if (ref1.backupSettingsToLocal_) {
    (ref1.backupSettingsToLocal_ as Exclude<typeof ref1.backupSettingsToLocal_, true | null>)(6000);
  } else {
    ref1.backupSettingsToLocal_ = true;
  }

  if (!Settings_.get_("notifyUpdate")) { return; }

  reason = "vimium_c-upgrade-notification";
  const args: chrome.notifications.NotificationOptions = {
    type: "basic",
    iconUrl: location.origin + "/icons/icon128.png",
    title: "Vimium C " + trans_("Upgrade"),
    message: trans_("upgradeMsg", [Settings_.CONST_.VerName_]) + trans_("upgradeMsg2")
        + "\n\n" + trans_("clickForMore")
  };
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$NotificationOptions$$isClickable$IsDeprecated
      && CurCVer_ < BrowserVer.Min$NotificationOptions$$isClickable$IsDeprecated) {
    args.isClickable = true; // not supported on Firefox
  }
  if (Build.BTypes & BrowserType.Chrome
      && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
      && CurCVer_ >= BrowserVer.Min$NotificationOptions$$silent) {
    args.silent = true;
  }
  chrome.notifications && chrome.notifications.create(reason, args, function (notificationId): void {
    let err: any;
    if (err = BgUtils_.runtimeError_()) { return err; }
    reason = notificationId || reason;
    chrome.notifications.onClicked.addListener(function (id): void {
      if (id !== reason) { return; }
      chrome.notifications.clear(reason);
      Backend_.reqH_[kFgReq.focusOrLaunch]({
        u: BgUtils_.convertToUrl_("vimium://release")
      });
    });
  });
  });
});

BgUtils_.timeout_(1200, function (): void {
  Settings_.temp_.onInstall_ && chrome.runtime.onInstalled.removeListener(Settings_.temp_.onInstall_);
  Settings_.temp_.onInstall_ = null;
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSetInnerTextOnHTMLHtmlElement) {
    (document.documentElement as HTMLHtmlElement).innerHTML = "";
  } else {
    (document.documentElement as HTMLHtmlElement).innerText = "";
  }
  BgUtils_.resetRe_();
  if (!Build.NDEBUG) {
    interface WindowExForDebug extends Window { a: unknown; cb: (i: any) => void }
    (window as WindowExForDebug).a = null;
    (window as WindowExForDebug).cb = function (b) { (window as WindowExForDebug).a = b; console.log("%o", b); };
  }
});
