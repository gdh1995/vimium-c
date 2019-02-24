import SettingsToSync = SettingsNS.PersistentSettings;
declare const enum OmniboxData {
  DefaultMaxChars = 128,
  MarginH = 160,
  MeanWidthOfChar = 7.72,
  PreservedTitle = 16,
}

// Note: if localStorage is cleaned
//       (considering: newTabUrl (the alerting one), newTabUrl_f, innerCSS, findCSS, omniCSS),
//       try to get vimSync from storage.sync
setTimeout(function() {
  type SettingsToUpdate = {
    [key in keyof SettingsToSync]?: SettingsToSync[key] | null
  };
  Utils.GC_();
  function storage(): chrome.storage.StorageArea { return chrome.storage && chrome.storage.sync; }
  let to_update: SettingsToUpdate | null = null,
  doNotSync: PartialTypedSafeEnum<SettingsToSync> = Object.setPrototypeOf({
    // Note(gdh1995): need to keep synced with pages/options_ext.ts#_importSettings
    findModeRawQueryList: 1 as 1, innerCSS: 1 as 1, keyboard: 1 as 1, newTabUrl_f: 1 as 1
  }, null);
    function HandleStorageUpdate(changes: { [key: string]: chrome.storage.StorageChange }, area: string): void {
      if (area !== "sync") { return; }
      Object.setPrototypeOf(changes, null);
      for (const key in changes) {
        const change = changes[key];
        storeAndPropagate(key, change != null ? change.newValue : null);
      }
    }
    function storeAndPropagate (key: string, value: any): void {
      if (!(key in Settings.defaults_) || key in Settings.nonPersistent_ || !shouldSyncKey(key)) { return; }
      const defaultVal = Settings.defaults_[key];
      if (value == null) {
        if (localStorage.getItem(key) != null) {
          console.log(new Date().toLocaleString(), "sync.local: reset", key);
          doSet(key, defaultVal);
        }
        return;
      }
      let curVal = Settings.get_(key), curJSON: string, jsonVal: string, notJSON: boolean;
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
      console.log(new Date().toLocaleString(), "sync.local: update", key,
        typeof value === "string"
        ? (value.length > 32 ? value.substring(0, 30) + "..." : value).replace(<RegExpG>/\n/g, "\\n")
        : value);
      doSet(key, value);
    }
    function doSet(key: keyof SettingsWithDefaults, value: any): void {
      const wanted: SettingsNS.DynamicFiles | "" = key === "keyMappings" ? "Commands"
          : key.startsWith("exclusion") ? "Exclusions" : "";
      if (!wanted) {
        return setAndPost(key, value);
      }
      Utils.require_(wanted).then(() => setAndPost(key, value));
      Utils.GC_();
    }
    function setAndPost(key: keyof SettingsWithDefaults, value: any): void {
      Settings.set_(key, value);
      if (key in Settings.payload_) {
        const delta: BgReq[kBgReq.settingsUpdate]["d"] = Object.create(null),
        req: Req.bg<kBgReq.settingsUpdate> = { N: kBgReq.settingsUpdate, d: delta };
        delta[key as keyof SettingsNS.FrontendSettings] = Settings.get_(key as keyof SettingsNS.FrontendSettings);
        Settings.broadcast_(req);
      }
    }
  function TrySet<K extends keyof SettingsToSync> (this: void, key: K, value: SettingsToSync[K] | null) {
    if (!shouldSyncKey(key)) { return; }
    if (!to_update) {
      setTimeout(DoUpdate, 800);
      to_update = Object.create(null) as SettingsToUpdate;
    }
    to_update[key] = value;
  }
    function DoUpdate (this: void): void {
      let items = to_update, removed = [] as string[], left = 0;
      to_update = null;
      if (!items || Settings.sync_ !== TrySet) { return; }
      for (const key in items) {
        if (items[key as keyof SettingsToUpdate] != null) {
          ++left;
        } else {
          delete items[key as keyof SettingsToUpdate];
          removed.push(key);
        }
      }
      if (removed.length > 0) {
        console.log(new Date().toLocaleString(), "sync.cloud: reset", removed.join(" "));
        storage().remove(removed);
      }
      if (left > 0) {
        console.log(new Date().toLocaleString(), "sync.cloud: update", Object.keys(items).join(" "));
        storage().set(items);
      }
    }
  function shouldSyncKey (key: string): key is keyof SettingsToSync {
    return !(key in doNotSync);
  }
  Settings.updateHooks_.vimSync = function (value): void {
    if (!storage()) { return; }
    const event = chrome.storage.onChanged;
    if (!value) {
      event.removeListener(HandleStorageUpdate);
      Settings.sync_ = Utils.blank_;
    } else if (Settings.sync_ !== TrySet) {
      event.addListener(HandleStorageUpdate);
      Settings.sync_ = TrySet;
    }
  };
  const sync1 = Settings.get_("vimSync");
  if (sync1 === false || (!sync1 && (localStorage.length > 5
                                    || Settings.get_("newTabUrl") !== Settings.CONST_.NewTabForNewUser_))) {
    return;
  }
  if (!storage()) { return; }
  storage().get(null, function(items): void {
    const err = Utils.runtimeError_();
    if (err) {
      console.log(new Date().toLocaleString(), "Error: failed to get storage:", err
        , "\n\tSo disable syncing temporarily.");
      Settings.updateHooks_.vimSync = Settings.sync_ = Utils.blank_;
      return err;
    }
    Object.setPrototypeOf(items, null);
    const vimSync = items.vimSync || Settings.get_("vimSync");
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
      if (!(key in items) && key in Settings.defaults_ && shouldSyncKey(key)) {
        toReset.push(key);
      }
    }
    for (let key of toReset) {
      storeAndPropagate(key, null);
    }
    for (const key in items) {
      storeAndPropagate(key, items[key]);
    }
    Settings.postUpdate_("vimSync");
  });
}, 1000);

setTimeout(function() { if (!chrome.browserAction) { return; }
  const func = Settings.updateHooks_.showActionIcon;
  let imageData: IconNS.StatusMap<IconNS.IconBuffer> | null, tabIds: IconNS.StatusMap<number[]> | null;
  function loadImageAndSetIcon(type: Frames.ValidStatus, path: IconNS.PathBuffer) {
    let img: HTMLImageElement, cache = Object.create(null) as IconNS.IconBuffer, count = 0,
    ctx: CanvasRenderingContext2D | null = null;
    function onerror(this: HTMLImageElement): void {
      console.error("Could not load action icon: " + this.getAttribute("src"));
    }
    function onload(this: HTMLImageElement): void {
      if (!ctx) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = IconNS.PixelConsts.MaxSize;
        ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      }
      let w = this.width, h = this.height;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this, 0, 0, w, h);
      cache[w as number | string as string as IconNS.ValidSizes] = ctx.getImageData(0, 0, w, h);
      if (count++) {
        ctx = null; return;
      }
      (imageData as IconNS.StatusMap<IconNS.IconBuffer>)[type] = cache;
      const arr = (tabIds as IconNS.StatusMap<number[]>)[type] as number[];
      delete (tabIds as IconNS.StatusMap<number[]>)[type];
      for (w = 0, h = arr.length; w < h; w++) {
        Backend.setIcon_(arr[w], type, true);
      }
    };
    Object.setPrototypeOf(path, null);
    for (const i in path) {
      img = new Image();
      img.onload = onload, img.onerror = onerror;
      img.src = path[i as IconNS.ValidSizes];
    }
  }
  Backend.IconBuffer_ = function(this: void, enabled?: boolean): IconNS.StatusMap<IconNS.IconBuffer> | null | void {
    if (enabled === undefined) { return imageData; }
    if (!enabled) {
      imageData && setTimeout(function() {
        if (Settings.get_("showActionIcon")) { return; }
        imageData = tabIds = null;
      }, 200);
      return;
    }
    if (imageData) { return; }
    imageData = Object.create(null);
    tabIds = Object.create(null);
  } as IconNS.AccessIconBuffer;
  Backend.setIcon_ = function(this: void, tabId: number, type: Frames.ValidStatus, isLater?: true): void {
    let data: IconNS.IconBuffer | undefined, path: IconNS.PathBuffer;
    if (OnOther === BrowserType.Edge) {
      path = Settings.icons_[type];
      chrome.browserAction.setIcon({ tabId, path });
      return;
    }
    if (data = (imageData as IconNS.StatusMap<IconNS.IconBuffer>)[type]) {
      const f = chrome.browserAction.setIcon, args: chrome.browserAction.TabIconDetails = {
        tabId,
        imageData: data
      };
      isLater ? f(args, Utils.runtimeError_) : f(args);
    } else if ((tabIds as IconNS.StatusMap<number[]>)[type]) {
      ((tabIds as IconNS.StatusMap<number[]>)[type] as number[]).push(tabId);
    } else if (path = Settings.icons_[type]) {
      setTimeout(loadImageAndSetIcon, 0, type, path);
      (tabIds as IconNS.StatusMap<number[]>)[type] = [tabId];
    }
  };
  Settings.updateHooks_.showActionIcon = function(value): void {
    func(value);
    (Backend.IconBuffer_ as IconNS.AccessIconBuffer)(value);
    let title = "Vimium C";
    value || (title += "\n\nAs configured, here's no active state.");
    chrome.browserAction.setTitle({ title });
  };
  Settings.postUpdate_("showActionIcon");
}, 150);

setTimeout(function() { if (!chrome.omnibox) { return; }
  interface OmniboxCallback {
    (this: void, suggestResults: chrome.omnibox.SuggestResult[]): true | void;
  }
  const enum FirstSugType {
    Default = 0,
    defaultOpen = 1, search, plainOthers
  }
  interface SuggestCallback {
    suggest: OmniboxCallback | null;
    sent: boolean;
    key: string;
  }
  interface SubInfo {
    type?: "history" | "tab";
    sessionId?: number | string;
  }
  type SubInfoMap = SafeDict<SubInfo>;
  let last: string | null = null, firstResultUrl: string = "", lastSuggest: SuggestCallback | null = null
    , timer = 0, subInfoMap: SubInfoMap | null = null
    , maxChars = OmniboxData.DefaultMaxChars
    , suggestions: chrome.omnibox.SuggestResult[] | null = null, cleanTimer = 0, inputTime: number
    , defaultSuggestionType = FirstSugType.Default, matchType: CompletersNS.MatchType = CompletersNS.MatchType.Default
    // since BrowserVer.MinOmniboxSupportDeletable
    , wantDeletable = chrome.omnibox.onDeleteSuggestion && typeof chrome.omnibox.onDeleteSuggestion.addListener === "function"
    , firstType: CompletersNS.ValidTypes | "";
  const defaultSug: chrome.omnibox.Suggestion = { description: "<dim>Open: </dim><url>%s</url>" },
  matchTagRe = OnOther === BrowserType.Firefox ? <RegExpG>/<\/?match>/g : null as never,
  maxResults = ChromeVer < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12 ? 6 : 12
  ;
  function clean(): void {
    if (lastSuggest) { lastSuggest.suggest = null; }
    subInfoMap = suggestions = lastSuggest = last = null;
    if (cleanTimer) { clearTimeout(cleanTimer); }
    if (timer) { clearTimeout(timer); }
    inputTime = matchType = cleanTimer = timer = 0;
    firstType = firstResultUrl = "";
    Utils.resetRe_();
  }
  function tryClean(): void {
    if (Date.now() - inputTime > 5000) {
      return clean();
    }
    cleanTimer = setTimeout(tryClean, 30000);
  }
  function onTimer(): void {
    timer = 0;
    const arr = lastSuggest;
    if (!arr || arr.sent) { return; }
    lastSuggest = null;
    if (arr.suggest) {
      return onInput(arr.key, arr.suggest);
    }
  }
  function onComplete(this: null, suggest: SuggestCallback, response: Suggestion[]
      , autoSelect: boolean, newMatchType: CompletersNS.MatchType): void {
    // Note: in https://chromium.googlesource.com/chromium/src/+/master/chrome/browser/autocomplete/keyword_extensions_delegate_impl.cc#167 ,
    // the block of `case extensions::NOTIFICATION_EXTENSION_OMNIBOX_SUGGESTIONS_READY:`
    //   always refuses suggestions from old input_ids
    if (!suggest.suggest) {
      lastSuggest === suggest && (lastSuggest = null);
      return;
    }
    lastSuggest = null;
    let notEmpty = response.length > 0, sug: Suggestion = notEmpty ? response[0] : null as never
      , info: SubInfo = {};
    firstType = notEmpty ? sug.type as CompletersNS.ValidTypes : "";
    matchType = newMatchType;
    if (notEmpty && (wantDeletable || "sessionId" in response[0])) {
      subInfoMap = Object.create<SubInfo>(null);
    }
    suggestions = [];
    const urlDict = Object.create<number>(null);
    for (let i = 0, di = autoSelect ? 0 : 1, len = response.length; i < len; i++) {
      let sug = response[i], { title, url, type } = sug, tail = "", hasSessionId = sug.sessionId != null
        , deletable = wantDeletable && !(autoSelect && i === 0) && (
          type === "tab" ? sug.sessionId !== TabRecency_.last_ : type === "history" && !hasSessionId
        );
      if (url in urlDict) {
        url = `:${i + di} ` + url;
      } else {
        urlDict[url] = 1;
      }
      if (deletable) {
        info.type = <SubInfo["type"]>type;
        tail = ` ~${i + di}~`;
      }
      if (OnOther === BrowserType.Firefox) {
        tail = (sug.textSplit as string).replace(matchTagRe, "") + (title && " - " + title.replace(matchTagRe, "")) + tail;
      } else {
        tail = title ? `</url><dim> - ${title}${tail}</dim>` : tail ? `</url><dim>${tail}</dim>` : "</url>";
        tail = "<url>" + (sug.textSplit as string) + tail;
      }
      const msg: chrome.omnibox.SuggestResult = { content: url, description: tail };
      deletable && (msg.deletable = true);
      hasSessionId && (info.sessionId = sug.sessionId as string | number);
      if (deletable || hasSessionId) {
        (subInfoMap as SubInfoMap)[url] = info;
        info = {};
      }
      suggestions.push(msg);
    }
    if (!autoSelect) {
      if (defaultSuggestionType !== FirstSugType.defaultOpen) {
        chrome.omnibox.setDefaultSuggestion(defaultSug);
        defaultSuggestionType = FirstSugType.defaultOpen;
      }
    } else if (sug.type === "search") {
      let text = (sug as CompletersNS.SearchSuggestion).pattern;
      text = (text && `<dim>${Utils.escapeText_(text)} - </dim>`) + `<url>${sug.textSplit}</url>`;
      defaultSuggestionType = FirstSugType.search;
      chrome.omnibox.setDefaultSuggestion({ description: text });
      if (sug = response[1]) switch (sug.type) {
      case "math":
        suggestions[1].description = `<dim>${sug.textSplit} = </dim><url><match>${sug.text}</match></url>`;
        break;
      }
    } else {
      defaultSuggestionType = FirstSugType.plainOthers;
      chrome.omnibox.setDefaultSuggestion({ description: suggestions[0].description });
    }
    if (autoSelect) {
      firstResultUrl = response[0].url;
      suggestions.shift();
    }
    last = suggest.key;
    Utils.resetRe_();
    suggest.suggest(suggestions);
    return;
  }
  function onInput(this: void, key: string, suggest: OmniboxCallback): void {
    key = key.trim().replace(Utils.spacesRe_, " ");
    if (lastSuggest) {
      let same = key === lastSuggest.key;
      lastSuggest.suggest = same ? suggest : null;
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
      suggest([]);
      return;
    }
    lastSuggest = { suggest, key, sent: false };
    if (timer) { return; }
    const now = Date.now(), delta = 600 + inputTime - now;
    if (delta > 50) {
      timer = setTimeout(onTimer, delta);
      return;
    }
    lastSuggest.sent = true;
    cleanTimer || (cleanTimer = setTimeout(tryClean, 30000));
    inputTime = now;
    subInfoMap = suggestions = null; firstResultUrl = "";
    const type: CompletersNS.ValidTypes = matchType < CompletersNS.MatchType.singleMatch
        || !key.startsWith(last as string) ? "omni"
      : matchType === CompletersNS.MatchType.searchWanted ? "search"
      : firstType || "omni";
    return Completion_.filter_(key, { t: type, r: maxResults, c: maxChars, s: true }, onComplete.bind(null, lastSuggest));
  }
  function onEnter(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition): void {
    const arr = lastSuggest;
    if (arr && arr.suggest) {
      arr.suggest = onEnter.bind(null, text, disposition);
      if (arr.sent) { return; }
      timer && clearTimeout(timer);
      return onTimer();
    }
    text = text.trim().replace(Utils.spacesRe_, " ");
    if (last === null && text) {
      // need a re-computation
      // * may has been cleaned, or
      // * search `v `"t.e abc", and then input "t.e abc", press Down to select `v `"t.e abc", and then press Enter
      return Completion_.filter_(text, { t: "omni", r: 3, c: maxChars, s: true }, function(sugs, autoSelect): void {
        return autoSelect ? open(sugs[0].url, disposition, sugs[0].sessionId) :  open(text, disposition);
      });
    }
    if (firstResultUrl && text === last) { text = firstResultUrl; }
    const sessionId = subInfoMap && subInfoMap[text] && (subInfoMap[text] as SubInfo).sessionId;
    clean();
    return open(text, disposition, sessionId);
  }
  function open(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition, sessionId?: string | number | null): void {
    if (!text) {
      text = Utils.convertToUrl_("");
    } else if (text[0] === ":" && (<RegExpOne>/^:([1-9]|1[0-2]) /).test(text)) {
      text = text.substring(text[2] === " " ? 3 : 4);
    }
    if (text.substring(0, 7).toLowerCase() === "file://") {
      text = Utils.showFileUrl_(text);
    }
    return sessionId != null ? Backend.gotoSession_({ s: sessionId }) : Backend.openUrl_({
      u: text,
      o: true,
      r: (disposition === "currentTab" ? ReuseType.current
        : disposition === "newForegroundTab" ? ReuseType.newFg : ReuseType.newBg)
    });
  }
  chrome.omnibox.onInputStarted.addListener(function(): void {
    chrome.windows.getCurrent(function(wnd?: chrome.windows.Window): void {
      const width = wnd && wnd.width;
      maxChars = width ? Math.floor((width - OmniboxData.MarginH / devicePixelRatio) / OmniboxData.MeanWidthOfChar)
        : OmniboxData.DefaultMaxChars;
    });
    if (cleanTimer) {
      return clean();
    }
  });
  chrome.omnibox.onInputChanged.addListener(onInput);
  chrome.omnibox.onInputEntered.addListener(onEnter);
  wantDeletable && (chrome.omnibox.onDeleteSuggestion as chrome.omnibox.OmniboxDeleteSuggestionEvent).addListener(function(text): void {
    const ind = parseInt(text.substring(text.lastIndexOf("~", text.length - 2) + 1)) - 1;
    let url = suggestions && suggestions[ind].content, info = url && subInfoMap && subInfoMap[url],
    type = info && info.type;
    if (!type) {
      console.log("Error: want to delete a suggestion but no related info found (may spend too long before deleting).");
      return;
    }
    if ((url as string)[0] === ":") {
      url = (url as string).substring((url as string).indexOf(" ") + 1);
    }
    return Backend.removeSug_({ t: type, u: type === "tab" ? (info as SubInfo).sessionId as string : url as string });
  });
}, 600);

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
chrome.runtime.onInstalled && chrome.runtime.onInstalled.addListener(Settings.temp_.onInstall_ =
function(details: chrome.runtime.InstalledDetails): void {
  let reason = details.reason;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion as string; }
  else { return; }

setTimeout(function() {
  chrome.tabs.query({
    status: "complete"
  }, function(tabs) {
    const t = chrome.tabs, callback = Utils.runtimeError_,
    offset = location.origin.length + 1, js = Settings.CONST_.ContentScripts_;
    for (let _i = tabs.length, _len = js.length - 1; 0 <= --_i; ) {
      let url = tabs[_i].url;
      if (url.startsWith(BrowserProtocol) || url.indexOf("://") === -1) { continue; }
      let tabId = tabs[_i].id;
      for (let _j = 0; _j < _len; ++_j) {
        t.executeScript(tabId, {file: js[_j].substring(offset), allFrames: true}, callback);
      }
    }
  });
  function now() {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60
      ).toJSON().substring(0, 19).replace('T', ' ');
  }
  console.log("%cVimium C%c has been %cinstalled%c with %o at %c%s%c.", "color:red", "color:auto"
    , "color:#0c85e9", "color:auto", details, "color:#0c85e9", now(), "color:auto");

  if (Settings.CONST_.DisallowIncognito_) {
    console.log("Sorry, but some commands of Vimium C require the permission to run in incognito mode.");
  }

  if (!reason) { return; }

  if (parseFloat(Settings.CONST_.VerCode_) <= parseFloat(reason)) { return; }

  reason = "vimium-c_upgrade-notification";
  chrome.notifications && chrome.notifications.create(reason, {
    type: "basic",
    iconUrl: location.origin + "/icons/icon128.png",
    title: "Vimium C Upgrade",
    message: "Vimium C has been upgraded to version " + Settings.CONST_.VerName_
      + ". Click here for more information.",
    isClickable: true
  }, function(notificationId): void {
    let err: any;
    if (err = Utils.runtimeError_()) { return err; }
    reason = notificationId || reason;
    chrome.notifications.onClicked.addListener(function(id): void {
      if (id !== reason) { return; }
      Backend.focus_({
        u: Utils.convertToUrl_('vimium://changelog')
      });
    });
  });
}, 500);
});

Utils.GC_ = function(): void {
  let timestamp = 0, timeout = 0;
  Utils.GC_ = function(): void {
    if (!(Commands || Exclusions)) { return; }
    timestamp = Date.now();
    if (timeout > 0) { return; }
    timeout = setTimeout(later, GlobalConsts.TimeoutToReleaseBackendModules);
  };
  return Utils.GC_();
  function later(): void {
    const last = Date.now() - timestamp;
    if (last < GlobalConsts.TimeoutToReleaseBackendModules && last > -5000) {
      timeout = setTimeout(later, GlobalConsts.TimeoutToReleaseBackendModules - last);
      return;
    }
    timeout = 0;
    const existing = chrome.extension.getViews
    ? chrome.extension.getViews().filter(function (wnd): boolean {
      return wnd.location.pathname.startsWith("/pages/");
    }).length > 0 : false;
    if (existing) { return; }
    Settings.updateHooks_.keyMappings = void 0 as never;
    Commands = null as never;
    if (Exclusions && Exclusions.rules.length === 0) {
      Exclusions.destroy_();
      Exclusions = null as never;
    }
  }
};

setTimeout(function(): void {
  chrome.runtime.onInstalled.removeListener(Settings.temp_.onInstall_ as NonNullable<typeof Settings.temp_.onInstall_>);
  Settings.temp_.onInstall_ = null;
  (document.documentElement as HTMLHtmlElement).textContent = '';
  Utils.resetRe_();
  if (typeof NDEBUG === "undefined" || !NDEBUG) {
    interface WindowExForDebug extends Window { a: unknown; cb: (i: any) => void; }
    (window as WindowExForDebug).a = null;
    (window as WindowExForDebug).cb = function(b) { (window as WindowExForDebug).a = b; console.log(b); };
  }
}, 1200);
// setTimeout(() => console.log("RegExp.input:", (RegExp as any).input, "."), 3600);
