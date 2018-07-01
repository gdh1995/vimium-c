import SettingsToSync = SettingsNS.PersistentSettings;
declare const enum OmniboxData {
  DefaultMaxChars = 128,
  MarginH = 160,
  MeanWidthOfChar = 7.72,
  PreservedTitle = 16,
}

if (Settings.get("vimSync")) setTimeout(function() {
  type SettingsToUpdate = {
    [key in keyof SettingsToSync]?: SettingsToSync[key] | null
  };
  Utils.GC();
  if (!chrome.storage) { return; }
  const Sync = {
    storage: chrome.storage.sync,
    to_update: null as SettingsToUpdate | null,
    doNotSync: Object.setPrototypeOf({
      findModeRawQueryList: 1, keyboard: 1, newTabUrl_f: 1
    }, null) as TypedSafeEnum<SettingsToSync>,
    HandleStorageUpdate: function(changes, area): void {
      if (area !== "sync") { return; }
      Object.setPrototypeOf(changes, null);
      for (const key in changes) {
        const change = changes[key];
        Sync.storeAndPropagate(key, change != null ? change.newValue : null);
      }
    } as SettingsNS.OnSyncUpdate,
    storeAndPropagate (key: string, value: any): void {
      if (!(key in Settings.defaults) || key in Settings.nonPersistent || !this.shouldSyncKey(key)) { return; }
      const defaultVal = Settings.defaults[key];
      if (value == null) {
        if (localStorage.getItem(key) != null) {
          this.doSet(key, defaultVal);
        }
        return;
      }
      let curVal = Settings.get(key), curJSON: string, jsonVal: string, notJSON: boolean;
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
      this.doSet(key, value);
    },
    doSet(key: keyof SettingsWithDefaults, value: any): void {
      const wanted: SettingsNS.DynamicFiles | "" = key === "keyMappings" ? "Commands"
          : key.startsWith("exclusion") ? "Exclusions" : "";
      if (!wanted) {
        return Settings.set(key, value);
      }
      Utils.require(wanted).then(() => Settings.set(key, value));
      Utils.GC();
    },
    set<K extends keyof SettingsToSync> (key: K, value: SettingsToSync[K] | null): void {
      if (!this.shouldSyncKey(key)) { return; }
      let items = this.to_update;
      if (!items) {
        setTimeout(this.DoUpdate, 60000);
        items = this.to_update = Object.create(null) as SettingsToUpdate;
      }
      items[key] = value;
    },
    DoUpdate (this: void): void {
      let items = Sync.to_update, removed = [] as string[], left = 0;
      Sync.to_update = null;
      if (!items || Settings.Sync !== Sync) { return; }
      for (const key in items) {
        if (items[key as keyof SettingsToUpdate] != null) {
          ++left;
        } else {
          delete items[key as keyof SettingsToUpdate];
          removed.push(key);
        }
      }
      if (removed.length > 0) {
        Sync.storage.remove(removed);
      }
      if (left > 0) {
        Sync.storage.set(items);
      }
    },
    shouldSyncKey (key: string): key is keyof SettingsToSync {
      return !(key in this.doNotSync);
    }
  };
  Settings.Sync = Sync;
  chrome.storage.onChanged.addListener(Sync.HandleStorageUpdate);
  Sync.storage.get(null, function(items): void {
    if (chrome.runtime.lastError) {
      Settings.postUpdate("vimSync", false);
      return chrome.runtime.lastError;
    }
    Object.setPrototypeOf(items, null);
    for (const key in items) {
      Sync.storeAndPropagate(key, items[key]);
    }
  });
}, 400);

setTimeout((function() { if (!chrome.browserAction) { return; }
  const func = Settings.updateHooks.showActionIcon;
  let imageData: IconNS.StatusMap<IconNS.IconBuffer> | null, tabIds: IconNS.StatusMap<number[]> | null;
  function loadImageAndSetIcon(type: Frames.ValidStatus, path: IconNS.PathBuffer) {
    let img: HTMLImageElement, cache = Object.create(null) as IconNS.IconBuffer, count = 0,
    onerror = function(this: HTMLImageElement): void {
      console.error("Could not load action icon: " + this.getAttribute("src"));
    },
    onload = function(this: HTMLImageElement): void {
      let canvas: HTMLCanvasElement | null = document.createElement("canvas")
        , w: number, h: number, ctx: CanvasRenderingContext2D | null;
      canvas.width = w = this.width, canvas.height = h = this.height;
      ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this, 0, 0, w, h);
      cache[w as 19 | 38] = ctx.getImageData(0, 0, w, h);
      if (count++) { return; }
      canvas = ctx = null;
      (imageData as IconNS.StatusMap<IconNS.IconBuffer>)[type] = cache;
      const arr = (tabIds as IconNS.StatusMap<number[]>)[type] as number[];
      delete (tabIds as IconNS.StatusMap<number[]>)[type];
      for (w = 0, h = arr.length; w < h; w++) {
        Backend.setIcon(arr[w], type);
      }
    };
    Object.setPrototypeOf(path, null);
    for (const i in path) {
      img = new Image();
      img.onload = onload, img.onerror = onerror;
      img.src = path[i as IconNS.ValidSizes];
    }
  }
  Backend.IconBuffer = function(this: void, enabled?: boolean): IconNS.StatusMap<IconNS.IconBuffer> | null | void {
    if (enabled === undefined) { return imageData; }
    if (!enabled) {
      imageData && setTimeout(function() {
        if (Settings.get("showActionIcon")) { return; }
        imageData = tabIds = null;
      }, 200);
      return;
    }
    if (imageData) { return; }
    imageData = Object.create(null);
    tabIds = Object.create(null);
  } as IconNS.AccessIconBuffer;
  Backend.setIcon = function(this: void, tabId: number, type: Frames.ValidStatus): void {
    let data: IconNS.IconBuffer | undefined, path: IconNS.PathBuffer;
    if (data = (imageData as IconNS.StatusMap<IconNS.IconBuffer>)[type]) {
      chrome.browserAction.setIcon({
        tabId,
        imageData: data
      });
    } else if ((tabIds as IconNS.StatusMap<number[]>)[type]) {
      ((tabIds as IconNS.StatusMap<number[]>)[type] as number[]).push(tabId);
    } else if (path = Settings.icons[type]) {
      setTimeout(loadImageAndSetIcon, 0, type, path);
      (tabIds as IconNS.StatusMap<number[]>)[type] = [tabId];
    }
  };
  Settings.updateHooks.showActionIcon = function(value): void {
    func(value);
    (Backend.IconBuffer as IconNS.AccessIconBuffer)(value);
    let title = "Vimium++";
    if (value) {
      chrome.browserAction.enable();
    } else {
      chrome.browserAction.disable();
      title += "\n\nThis icon is disabled by your settings."
    }
    chrome.browserAction.setTitle({ title });
  };
  Settings.postUpdate("showActionIcon");
}), 150);

setTimeout((function() { if (!chrome.omnibox) { return; }
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
  let last: string | null = null, firstResult: Suggestion | null, lastSuggest: SuggestCallback | null
    , timer = 0, sessionIds: SafeDict<string | number> | null
    , maxChars = OmniboxData.DefaultMaxChars
    , suggestions = null as chrome.omnibox.SuggestResult[] | null, cleanTimer = 0, inputTime: number
    , defaultSuggestionType = FirstSugType.Default, matchType: CompletersNS.MatchType = CompletersNS.MatchType.Default
    , firstType: CompletersNS.ValidTypes | "";
  const defaultSug: chrome.omnibox.Suggestion = { description: "<dim>Open: </dim><url>%s</url>" },
  maxResults = Settings.CONST.ChromeVersion < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12 ? 6 : 12
  ;
  function formatSessionId(sug: Suggestion) {
    if (sug.sessionId != null) {
      (sessionIds as SafeDict<string | number>)[sug.url] = sug.sessionId;
    }
  }
  function format(this: void, sug: Readonly<Suggestion>): chrome.omnibox.SuggestResult {
    let str = "<url>" + sug.textSplit;
    str += sug.title ? "</url><dim> - " + sug.title + "</dim>" : "</url>";
    return {
      content: sug.url,
      description: str
    };
  }
  function clean(): void {
    if (lastSuggest) { lastSuggest.suggest = null; }
    sessionIds = suggestions = lastSuggest = firstResult = last = null;
    if (cleanTimer) { clearTimeout(cleanTimer); }
    if (timer) { clearTimeout(timer); }
    inputTime = matchType = cleanTimer = timer = 0;
    firstType = "";
    Utils.resetRe();
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
    let sug: Suggestion | undefined = response[0];
    if (sug && "sessionId" in sug) {
      sessionIds = Object.create(null);
      response.forEach(formatSessionId);
    }
    firstType = sug ? sug.type as CompletersNS.ValidTypes : "";
    matchType = newMatchType;
    if (autoSelect) {
      firstResult = response.shift() as Suggestion;
    }
    suggestions = response.map(format);
    if (!autoSelect) {
      if (defaultSuggestionType !== FirstSugType.defaultOpen) {
        chrome.omnibox.setDefaultSuggestion(defaultSug);
        defaultSuggestionType = FirstSugType.defaultOpen;
      }
    } else if (sug.type === "search") {
      let text = (sug as CompletersNS.SearchSuggestion).pattern;
      text = (text && `<dim>${Utils.escapeText(text)} - </dim>`) + `<url>${sug.textSplit}</url>`;
      defaultSuggestionType = FirstSugType.search;
      chrome.omnibox.setDefaultSuggestion({ description: text });
      if (sug = response[0]) switch (sug.type) {
      case "math":
        suggestions[0].description = `<dim>${sug.textSplit} = </dim><url><match>${sug.text}</match></url>`;
        break;
      }
    } else {
      defaultSuggestionType = FirstSugType.plainOthers;
      chrome.omnibox.setDefaultSuggestion({ description: format(sug).description });
    }
    last = suggest.key;
    Utils.resetRe();
    suggest.suggest(suggestions);
    return;
  }
  function onInput(this: void, key: string, suggest: OmniboxCallback): void {
    key = key.trim().replace(Utils.spacesRe, " ");
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
    sessionIds = suggestions = firstResult = null;
    const type: CompletersNS.ValidTypes = matchType < CompletersNS.MatchType.singleMatch
        || !key.startsWith(last as string) ? "omni"
      : matchType === CompletersNS.MatchType.searchWanted ? "search"
      : firstType || "omni";
    return Completers.filter(key, { type, maxResults, maxChars, singleLine: true }, onComplete.bind(null, lastSuggest));
  }
  function onEnter(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition): void {
    text = text.trim().replace(Utils.spacesRe, " ");
    const arr = lastSuggest;
    if (arr && arr.suggest) {
      arr.suggest = onEnter.bind(null, text, disposition);
      if (arr.sent) { return; }
      timer && clearTimeout(timer);
      return onTimer();
    }
    if (last === null && text) {
      // need a re-computation
      // * may has been cleaned, or
      // * search `v `"t.e abc", and then input "t.e abc", press Down to select `v `"t.e abc", and then press Enter
      return Completers.filter(text, { type: "omni", maxResults: 3, maxChars, singleLine: true }, function(sugs, autoSelect): void {
        return autoSelect ? open(sugs[0].url, disposition, sugs[0].sessionId) :  open(text, disposition);
      });
    }
    if (firstResult && text === last) { text = firstResult.url; }
    const sessionId = sessionIds && sessionIds[text];
    clean();
    return open(text, disposition, sessionId);
  }
  function open(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition, sessionId?: string | number | null): void {
    if (!text) {
      text = Utils.convertToUrl("");
    }
    if (text.substring(0, 7).toLowerCase() === "file://") {
      text = Utils.showFileUrl(text);
    }
    return sessionId != null ? Backend.gotoSession({ sessionId }) : Backend.openUrl({
      url: text,
      omni: true,
      reuse: (disposition === "currentTab" ? ReuseType.current
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
}), 600);

var a: any, cb: (i: any) => void;
// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
(a = chrome.runtime.onInstalled) && (a as typeof chrome.runtime.onInstalled).addListener(cb =
function(details: chrome.runtime.InstalledDetails) {
  let reason = details.reason;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion as string; }
  else { return; }

setTimeout(function() {
  chrome.tabs.query({
    status: "complete"
  }, function(tabs) {
    const t = chrome.tabs, callback = () => chrome.runtime.lastError,
      contentScripts = chrome.runtime.getManifest().content_scripts[0],
      ref = {file: "", allFrames: contentScripts.all_frames},
      js = contentScripts.js;
    for (let _i = tabs.length, _len = js.length - 1; 0 <= --_i; ) {
      let url = tabs[_i].url;
      if (url.startsWith("chrome") || url.indexOf("://") === -1) { continue; }
      let tabId = tabs[_i].id;
      for (let _j = 0; _j < _len; ++_j) {
        ref.file = js[_j];
        t.executeScript(tabId, ref, callback);
      }
    }
    function now() {
      return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60
        ).toJSON().substring(0, 19).replace('T', ' ');
    }
    console.log("%cVimium++%c has been %cinstalled%c with %o at %c%s%c.", "color:red", "color:auto"
      , "color:#0c85e9", "color:auto", details, "color:#0c85e9", now(), "color:auto");
  });

  if (!reason) { return; }

  if (parseFloat(Settings.CONST.CurrentVersion) <= parseFloat(reason)) { return; }

  reason = "vimium++_upgradeNotification";
  chrome.notifications && chrome.notifications.create(reason, {
    type: "basic",
    iconUrl: location.origin + "/icons/icon128.png",
    title: "Vimium++ Upgrade",
    message: "Vimium++ has been upgraded to version " + Settings.CONST.CurrentVersionName
      + ". Click here for more information.",
    isClickable: true
  }, function(notificationId): void {
    const popup = chrome.notifications, e: void = chrome.runtime.lastError;
    chrome.notifications = null as never;
    if (e) { return e; }
    reason = notificationId || reason;
    popup.onClicked.addListener(function(id): void {
      if (id !== reason) { return; }
      return Backend.focus({
        url: "https://github.com/gdh1995/vimium-plus#release-notes"
      });
    });
  });
}, 500);
});

Utils.GC = function(): void {
  let timestamp = 0, timeout = 0;
  Utils.GC = function(): void {
    if (!(Commands || Exclusions)) { return; }
    timestamp = Date.now();
    if (timeout > 0) { return; }
    timeout = setTimeout(later, GlobalConsts.TimeoutToReleaseBackendModules);
  };
  return Utils.GC();
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
    Settings.updateHooks.keyMappings = void 0 as never;
    Commands = null as never;
    if (Exclusions && Exclusions.rules.length === 0) {
      Exclusions.destroy();
      Exclusions = null as never;
    }
  }
};

Backend.Init && Backend.Init();

setTimeout((function(): void {
  if (a) {
    a.removeListener(cb);
    chrome.runtime.onInstalled = a = null as never;
  }
  cb = function(b) { a = b; console.log(b); };
  Utils.resetRe();
}), 1200);
