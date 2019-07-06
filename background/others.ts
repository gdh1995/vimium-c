declare const enum OmniboxData {
  DefaultMaxChars = 128,
  MarginH = 160,
  MeanWidthOfChar = 7.72,
  PreservedTitle = 16,
}

// Note: if localStorage is cleaned
//       (considering: newTabUrl (the alerting one), newTabUrl_f, vomnibarPage_f, innerCSS, findCSS, omniCSS),
//       try to get vimSync from storage.sync
declare const enum SyncConsts {
  LocalItemCountWhenInstalled = 6,
}
BgUtils_.timeout_(1000, function (): void {
  type SettingsToSync = SettingsNS.PersistentSettings;
  type SettingsToUpdate = {
    [key in keyof SettingsToSync]?: SettingsToSync[key] | null
  };
  function storage(): chrome.storage.StorageArea { return chrome.storage && chrome.storage.sync; }
  let to_update: SettingsToUpdate | null = null, keyInDownloading: keyof SettingsToUpdate | "" = "",
  doNotSync: PartialTypedSafeEnum<SettingsToSync> = BgUtils_.safer_({
    // Note(gdh1995): need to keep synced with pages/options_ext.ts#_importSettings
    findModeRawQueryList: 1 as 1, innerCSS: 1 as 1, keyboard: 1 as 1, newTabUrl_f: 1 as 1
    , vomnibarPage_f: 1 as 1
  });
  function HandleStorageUpdate(changes: { [key: string]: chrome.storage.StorageChange }, area: string): void {
    if (area !== "sync") { return; }
    BgUtils_.safer_(changes);
    for (const key in changes) {
      const change = changes[key];
      storeAndPropagate(key, change != null ? change.newValue : null);
    }
  }
  function now() {
    return new Date().toLocaleString();
  }
  function storeAndPropagate(key: string, value: any): void {
    if (!(key in Settings_.defaults_) || key in Settings_.nonPersistent_ || !shouldSyncKey(key)) { return; }
    const defaultVal = Settings_.defaults_[key];
    if (value == null) {
      if (localStorage.getItem(key) != null) {
        console.log(now(), "sync.this: reset", key);
        doSet(key, defaultVal);
      }
      return;
    }
    let curVal = Settings_.get_(key), curJSON: string, jsonVal: string, notJSON: boolean;
    if (notJSON = typeof defaultVal === "string") {
      jsonVal = value as string;
      curJSON = curVal as string;
    } else {
      jsonVal = JSON.stringify(value);
      curJSON = JSON.stringify(curVal);
    }
    if (jsonVal === curJSON) { return; }
    curVal = notJSON ? defaultVal : JSON.stringify(defaultVal);
    if (jsonVal === curVal) {
      value = defaultVal;
    }
    console.log(now(), "sync.this: update", key,
      typeof value === "string"
      ? (value.length > 32 ? value.slice(0, 30) + "..." : value).replace(<RegExpG> /\n/g, "\\n")
      : value);
    doSet(key, value);
  }
  function doSet(key: keyof SettingsToSync, value: any): void {
    const Cmd = "Commands", Excl = "Exclusions",
    wanted: SettingsNS.DynamicFiles | "" = key === "keyMappings" ? Cmd
        : key.startsWith("exclusion") ? Excl : "";
    if (!wanted) {
      return setAndPost(key, value);
    }
    Promise.all<false | object>([wanted === Excl && BgUtils_.require_(Cmd), BgUtils_.require_(wanted)]).then(
        () => setAndPost(key, value));
    BgUtils_.GC_();
  }
  function setAndPost(key: keyof SettingsToSync, value: any): void {
    keyInDownloading = key;
    Settings_.set_(key, value);
    keyInDownloading = "";
    if (key in Settings_.payload_) {
      const req: Req.bg<kBgReq.settingsUpdate> = { N: kBgReq.settingsUpdate, d: {
        [key as keyof SettingsNS.FrontendSettings]: Settings_.get_(key as keyof SettingsNS.FrontendSettings)
      } };
      Settings_.broadcast_(req);
    }
    BgUtils_.GC_();
  }
  function TrySet<K extends keyof SettingsToSync>(this: void, key: K, value: SettingsToSync[K] | null) {
    if (!shouldSyncKey(key) || key === keyInDownloading) { return; }
    if (!to_update) {
      setTimeout(DoUpdate, 800);
      to_update = BgUtils_.safeObj_() as SettingsToUpdate;
    }
    to_update[key] = value;
  }
  function DoUpdate(this: void): void {
    const items = to_update, removed: string[] = [], updated: string[] = [], reseted: string[] = [],
    serializedDict: Dict<boolean | string | number | object> = {};
    to_update = null;
    if (!items || Settings_.sync_ !== TrySet) { return; }
    for (const key in items) {
      let value = items[key as keyof SettingsToUpdate];
      if (value != null) {
          serializedDict[key] = value;
          updated.push(key);
      } else {
        reseted.push(key);
        removed.push(key);
      }
    }
    if (removed.length > 0) {
      console.log(now(), "sync.cloud: reset", removed.join(", "));
      storage().remove(reseted);
    }
    if (updated.length > 0) {
      console.log(now(), "sync.cloud: update", updated.join(", "));
      storage().set(serializedDict);
    }
    }
  }
  function shouldSyncKey(key: string): key is keyof SettingsToSync {
    return !(key in doNotSync);
  }
  Settings_.updateHooks_.vimSync = function (value): void {
    if (!storage()) { return; }
    const event = chrome.storage.onChanged;
    if (!value) {
      event.removeListener(HandleStorageUpdate);
      Settings_.sync_ = BgUtils_.blank_;
    } else if (Settings_.sync_ !== TrySet) {
      event.addListener(HandleStorageUpdate);
      Settings_.sync_ = TrySet;
    }
  };
  const sync1 = Settings_.get_("vimSync");
  if (sync1 === false || (!sync1 && (localStorage.length > SyncConsts.LocalItemCountWhenInstalled
                                    || Settings_.get_("newTabUrl") !== Settings_.CONST_.NewTabForNewUser_))) {
    return;
  }
  if (!storage()) { return; }
  storage().get(null, function (items): void {
    const err = BgUtils_.runtimeError_();
    if (err) {
      console.log(now(), "Error: failed to get storage:", err
        , "\n\tSo disable syncing temporarily.");
      Settings_.updateHooks_.vimSync = Settings_.sync_ = BgUtils_.blank_;
      return err;
    }
    BgUtils_.safer_(items);
    const vimSync = items.vimSync || Settings_.get_("vimSync");
    if (!vimSync) {
      return; // no settings have been modified
    } else if (!items.vimSync) {
      // cloud may be empty, but the local computer wants to sync, so enable it
      console.log("sync.cloud: enable vimSync");
      items.vimSync = vimSync;
      storage().set({ vimSync });
    }
    const toReset: string[] = [];
    for (let i = 0, end = localStorage.length; i < end; i++) {
      const key = localStorage.key(i) as string;
      // although storeAndPropagate indeed checks @shouldSyncKey(key)
      // here check it for easier debugging
      if (!(key in items) && key in Settings_.defaults_ && shouldSyncKey(key)) {
        toReset.push(key);
      }
    }
    for (let key of toReset) {
      storeAndPropagate(key, null);
    }
    for (const key in items) {
      storeAndPropagate(key, items[key]);
    }
    Settings_.postUpdate_("vimSync");
  });
});

BgUtils_.timeout_(150, function (): void {
  if (!chrome.browserAction) { return; }
  const func = Settings_.updateHooks_.showActionIcon;
  let imageData: IconNS.StatusMap<IconNS.IconBuffer> | null, tabIds: IconNS.StatusMap<number[]> | null;
  let mayShowIcons = true;
  function loadImageAndSetIcon(type: Frames.ValidStatus, path: IconNS.PathBuffer) {
    let img: HTMLImageElement, cache = BgUtils_.safeObj_() as IconNS.IconBuffer, count = 0,
    ctx: CanvasRenderingContext2D | null = null;
    function onerror(this: HTMLImageElement, err: Event | 1 | null): void {
      console.log("%cError:%c %s %s", "color:red", "color:auto"
        , err === 1 ? "Could not read image data from a <canvas> for"
          : "Could not load action icon:", this.getAttribute("src"));
      if (!mayShowIcons) { return; }
      mayShowIcons = false;
      Backend_.setIcon_ = BgUtils_.blank_;
      tabIds = null;
      chrome.browserAction.setTitle({ title: "Vimium C\n\nFailed in showing dynamic icons." });
    }
    function onload(this: HTMLImageElement): void {
      if (!mayShowIcons) { return; }
      if (!ctx) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = IconNS.PixelConsts.MaxSize;
        ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      }
      let w = this.width, h = this.height;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this, 0, 0, w, h);
      // in case of https://peter.sh/experiments/chromium-command-line-switches/#disable-reading-from-canvas
      // and tested on C54 and C74
      try {
        cache[w as number | string as IconNS.ValidSizes] = ctx.getImageData(0, 0, w, h);
      } catch {
        this.onerror(1 as never);
      }
      if (count++ || !mayShowIcons) {
        ctx = null; return;
      }
      (imageData as Exclude<typeof imageData, null>)[type] = cache;
      const arr = (tabIds as IconNS.StatusMap<number[]>)[type] as number[];
      delete (tabIds as IconNS.StatusMap<number[]>)[type];
      for (w = 0, h = arr.length; w < h; w++) {
        Backend_.setIcon_(arr[w], type, true);
      }
    }
    BgUtils_.safer_(path);
    for (const i in path) {
      img = new Image();
      img.onload = onload, img.onerror = onerror;
      img.src = path[i as IconNS.ValidSizes];
    }
  }
  Backend_.IconBuffer_ = function (this: void, enabled?: boolean): object | null | void {
    if (enabled === undefined) { return imageData; }
    if (!enabled) {
      imageData && setTimeout(function () {
        if (Settings_.get_("showActionIcon")) { return; }
        imageData = tabIds = null;
      }, 200);
      return;
    }
    if (imageData) { return; }
    imageData = BgUtils_.safeObj_();
    tabIds = BgUtils_.safeObj_();
  } as IconNS.AccessIconBuffer;
  Backend_.setIcon_ = function (this: void, tabId: number, type: Frames.ValidStatus, isLater?: true): void {
    let data: IconNS.IconBuffer | undefined, path: IconNS.PathBuffer;
    /** Firefox does not use ImageData as inner data format
     * * https://dxr.mozilla.org/mozilla-central/source/toolkit/components/extensions/schemas/manifest.json#577
     *   converts ImageData objects in parameters into data:image/png,... URLs
     * * https://dxr.mozilla.org/mozilla-central/source/browser/components/extensions/parent/ext-browserAction.js#483
     *   builds a css text of "--webextension-***: url(icon-url)",
     *   and then set the style of an extension's toolbar button to it
     */
    if (Build.BTypes & ~BrowserType.Chrome
        && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
      path = Settings_.icons_[type];
      chrome.browserAction.setIcon({ tabId, path });
      return;
    }
    if (data = (imageData as Exclude<typeof imageData, null>)[type]) {
      const f = chrome.browserAction.setIcon, args: chrome.browserAction.TabIconDetails = {
        tabId,
        imageData: data
      };
      isLater ? f(args, BgUtils_.runtimeError_) : f(args);
    } else if ((tabIds as IconNS.StatusMap<number[]>)[type]) {
      ((tabIds as IconNS.StatusMap<number[]>)[type] as number[]).push(tabId);
    } else if (path = Settings_.icons_[type]) {
      setTimeout(loadImageAndSetIcon, 0, type, path);
      (tabIds as IconNS.StatusMap<number[]>)[type] = [tabId];
    }
  };
  Settings_.updateHooks_.showActionIcon = function (value): void {
    func(value);
    (Backend_.IconBuffer_ as IconNS.AccessIconBuffer)(value);
    let title = "Vimium C";
    value || (title += "\n\nAs configured, here's no active state.");
    chrome.browserAction.setTitle({ title });
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
  type SubInfoMap = SafeDict<SubInfo>;
  const onDel = (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox)
      ? omnibox.onDeleteSuggestion : null,
  wantDeletable = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeletable
      || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox)
          && !!onDel && typeof onDel.addListener === "function";
  let last: string | null = null, firstResultUrl: string = "", lastSuggest: SuggestCallback | null = null
    , timer = 0, subInfoMap: SubInfoMap | null = null
    , maxChars = OmniboxData.DefaultMaxChars
    , suggestions: chrome.omnibox.SuggestResult[] | null = null, cleanTimer = 0, inputTime: number
    , defaultSuggestionType = FirstSugType.Default, matchType: CompletersNS.MatchType = CompletersNS.MatchType.Default
    , matchedSugTypes = CompletersNS.SugType.Empty;
  const
  matchTagRe = Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
      ? <RegExpG> /<\/?match>/g : null as never,
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
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeletable
            || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && wantDeletable
            || "sessionId" in response[0])) {
      subInfoMap = BgUtils_.safeObj_<SubInfo>();
    }
    suggestions = [];
    const urlDict = BgUtils_.safeObj_<number>();
    for (let i = 0, di = autoSelect ? 0 : 1, len = response.length; i < len; i++) {
      let sugItem = response[i], { title, url, type } = sugItem, tail = "", hasSessionId = sugItem.sessionId != null
        , deletable = (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeletable
              || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && wantDeletable)
            && !(autoSelect && i === 0) && (
          type === "tab" ? sugItem.sessionId !== TabRecency_.last_ : type === "history" && !hasSessionId
        );
      if (url in urlDict) {
        url = `:${i + di} ` + url;
      } else {
        urlDict[url] = 1;
      }
      if (deletable) {
        info.type_ = <SubInfo["type_"]> type;
        tail = ` ~${i + di}~`;
      }
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        tail = (sugItem.textSplit as string).replace(matchTagRe, "")
          + (title && " - " + title.replace(matchTagRe, "")) + tail;
      } else {
        tail = title ? `</url><dim> - ${title}${tail}</dim>` : tail ? `</url><dim>${tail}</dim>` : "</url>";
        tail = "<url>" + (sugItem.textSplit as string) + tail;
      }
      const msg: chrome.omnibox.SuggestResult = { content: url, description: tail };
      deletable && (msg.deletable = true);
      hasSessionId && (info.sessionId_ = sugItem.sessionId as string | number);
      if (deletable || hasSessionId) {
        (subInfoMap as SubInfoMap)[url] = info;
        info = {};
      }
      suggestions.push(msg);
    }
    last = suggest.key_;
    if (!autoSelect) {
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        defaultDesc = "Open: <input>";
      } else if (defaultSuggestionType !== FirstSugType.defaultOpen) {
        defaultDesc = "<dim>Open: </dim><url>%s</url>";
        defaultSuggestionType = FirstSugType.defaultOpen;
      }
    } else if (sug.type === "search") {
      let text = (sug as CompletersNS.SearchSuggestion).pattern;
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        defaultDesc = (text && `${BgUtils_.escapeText_(text)} - `) + (sug.textSplit as string).replace(matchTagRe, "");
      } else {
        defaultDesc = (text && `<dim>${BgUtils_.escapeText_(text)} - </dim>`) + `<url>${sug.textSplit}</url>`;
      }
      defaultSuggestionType = FirstSugType.search;
      if (sug = response[1]) {
        switch (sug.type) {
        case "math":
          suggestions[1].description = Build.BTypes & BrowserType.Firefox
                && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
              ? (sug.textSplit as string).replace(matchTagRe, "") + " = sug.text"
              : `<dim>${sug.textSplit} = </dim><url><match>${sug.text}</match></url>`;
          break;
        }
      }
    } else {
      defaultSuggestionType = FirstSugType.plainOthers;
      defaultDesc = suggestions[0].description;
    }
    if (autoSelect) {
      firstResultUrl = response[0].url;
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
    if (matchType === CompletersNS.MatchType.emptyResult && key.startsWith(last as string)) {
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
    delta = Settings_.omniPayload_.i + inputTime - now; /** it's made safe by {@see #onTimer} */
    if (delta > 30 && delta < 3000) { // in case of system time jumping
      timer = setTimeout(onTimer, delta);
      return;
    }
    lastSuggest.sent_ = true;
    cleanTimer || (cleanTimer = setTimeout(tryClean, 30000));
    inputTime = now;
    subInfoMap = suggestions = null; firstResultUrl = "";
    const type: SugType = matchType < MatchType.someMatches || !key.startsWith(last as string) ? SugType.Empty
      : matchType === MatchType.searchWanted ? key.indexOf(" ") < 0 ? SugType.search : SugType.Empty
      : matchedSugTypes;
    Completion_.filter_(key
      , { o: "omni", t: type, r: maxResults, c: maxChars, f: CompletersNS.QueryFlags.SingleLine }
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
          , { o: "omni", t: SugType.Empty, r: 3, c: maxChars, f: CompletersNS.QueryFlags.SingleLine }
          , function (sugs, autoSelect): void {
        return autoSelect ? open(sugs[0].url, disposition, sugs[0].sessionId) : open(text, disposition);
      });
    }
    if (firstResultUrl && text === last) { text = firstResultUrl; }
    const sessionId = subInfoMap && subInfoMap[text] && (subInfoMap[text] as SubInfo).sessionId_;
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
    return sessionId != null ? Backend_.gotoSession_({ s: sessionId }) : Backend_.openUrl_({
      u: text,
      o: true,
      r: (disposition === "currentTab" ? ReuseType.current
        : disposition === "newForegroundTab" ? ReuseType.newFg : ReuseType.newBg)
    });
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
  (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeletable
    || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && wantDeletable) &&
  (onDel as NonNullable<typeof onDel>).addListener(function (text): void {
    // tslint:disable-next-line: radix
    const ind = parseInt(text.slice(text.lastIndexOf("~", text.length - 2) + 1)) - 1;
    let url = suggestions && suggestions[ind].content, info = url && subInfoMap && subInfoMap[url],
    type = info && info.type_;
    if (!type) {
      console.log("Error: want to delete a suggestion but no related info found (may spend too long before deleting).");
      return;
    }
    if ((url as string)[0] === ":") {
      url = (url as string).slice((url as string).indexOf(" ") + 1);
    }
    return Backend_.removeSug_({ t: type, u: type === "tab" ? (info as SubInfo).sessionId_ as string : url as string });
  });
});

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
chrome.runtime.onInstalled.addListener(Settings_.temp_.onInstall_ =
function (details: chrome.runtime.InstalledDetails): void {
  let reason = details.reason;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion as string; }
  else { return; }

  setTimeout(function () {
  Build.BTypes & ~BrowserType.Firefox &&
  (!(Build.BTypes & BrowserType.Firefox) || OnOther !== BrowserType.Firefox) &&
  chrome.tabs.query({
    status: "complete"
  }, function (tabs) {
    const t = chrome.tabs, callback = BgUtils_.runtimeError_,
    offset = location.origin.length, js = Settings_.CONST_.ContentScripts_;
    for (let _i = tabs.length, _len = js.length - 1; 0 <= --_i; ) {
      let url = tabs[_i].url;
      if (url.startsWith(BrowserProtocol_) || url.indexOf("://") === -1) { continue; }
      let tabId = tabs[_i].id;
      for (let _j = 0; _j < _len; ++_j) {
        t.executeScript(tabId, {file: js[_j].slice(offset), allFrames: true}, callback);
      }
    }
  });
  function now() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60
      ).toJSON().slice(0, 19).replace("T", " ");
  }
  console.log("%cVimium C%c has been %cinstalled%c with %o at %c%s%c.", "color:red", "color:auto"
    , "color:#0c85e9", "color:auto", details, "color:#0c85e9", now(), "color:auto");

  if (Settings_.CONST_.DisallowIncognito_) {
    console.log("Sorry, but some commands of Vimium C require the permission to run in incognito mode.");
  }

  if (!reason) { return; }

  if (parseFloat(Settings_.CONST_.VerCode_) <= parseFloat(reason)) { return; }

  reason = "vimium-c_upgrade-notification";
  const args: chrome.notifications.NotificationOptions = {
    type: "basic",
    iconUrl: location.origin + "/icons/icon128.png",
    title: "Vimium C Upgrade",
    message: `Vimium C has been upgraded to v${Settings_.CONST_.VerName_}.`
      + "\nNow LinkHints always searches shadow DOMs.",
    contextMessage: "Click here for more information."
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
      Backend_.focus_({
        u: BgUtils_.convertToUrl_("vimium://changelog")
      });
    });
  });
  }, 500);
});

BgUtils_.GC_ = function (inc0?: number): void {
  let timestamp = 0, timeout = 0, referenceCount = 0;
  BgUtils_.GC_ = function (inc?: number): void {
    inc && (referenceCount += inc);
    if (!(Commands || Exclusions && Exclusions.rules_.length <= 0)) { return; }
    timestamp = Date.now(); // safe for time changes
    if (timeout > 0 || referenceCount > 0) { return; }
    referenceCount < 0 && (referenceCount = 0); // safer
    timeout = setTimeout(later, GlobalConsts.TimeoutToReleaseBackendModules);
  };
  return BgUtils_.GC_(inc0);
  function later(): void {
    const last = Date.now() - timestamp; // safe for time changes
    if (last < GlobalConsts.TimeoutToReleaseBackendModules - 1000 // for small time adjust
        && last > -GlobalConsts.ToleranceOfNegativeTimeDelta) {
      timeout = setTimeout(later, GlobalConsts.TimeoutToReleaseBackendModules - last);
      return;
    }
    timeout = 0;
    const existing = !(Build.BTypes & ~BrowserType.Chrome) || chrome.extension.getViews
    ? chrome.extension.getViews().some(function (wnd): boolean {
      const path = wnd.location.pathname.toLowerCase();
      return path.startsWith("/pages/options") || path.startsWith("/pages/popup");
    }) : false;
    if (existing) { return; }
    const hook = Settings_.updateHooks_;
    if (Commands) {
      hook.keyMappings = null as never;
      Commands = null as never;
    }
    if (Exclusions && Exclusions.rules_.length === 0) {
      hook.exclusionRules = hook.exclusionOnlyFirstMatch =
      hook.exclusionListenHash = null as never;
      Exclusions = null as never;
    }
  }
};

BgUtils_.timeout_(1200, function (): void {
  chrome.runtime.onInstalled.removeListener(
      Settings_.temp_.onInstall_ as NonNullable<typeof Settings_.temp_.onInstall_>);
  Settings_.temp_.onInstall_ = null;
  (document.documentElement as HTMLHtmlElement).textContent = "";
  BgUtils_.resetRe_();
  if (!Build.NDEBUG) {
    interface WindowExForDebug extends Window { a: unknown; cb: (i: any) => void; }
    (window as WindowExForDebug).a = null;
    (window as WindowExForDebug).cb = function (b) { (window as WindowExForDebug).a = b; console.log("%o", b); };
  }
});
