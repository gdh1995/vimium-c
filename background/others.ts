import SettingsToSync = SettingsNS.PersistentSettings;

if (Settings.get("vimSync") === true) setTimeout(function() { if (!chrome.storage) { return; }
  type SettingsToUpdate = {
    [key in keyof SettingsToSync]?: SettingsToSync[key] | null
  };
  const Sync = {
    storage: chrome.storage.sync,
    to_update: null as SettingsToUpdate | null,
    doNotSync: Object.setPrototypeOf({
      findModeRawQueryList: 1, keyboard: 1, newTabUrl_f: 1
    }, null) as TypedSafeEnum<SettingsToSync>,
    HandleStorageUpdate: function(changes, area) {
      if (area !== "sync") { return; }
      Object.setPrototypeOf(changes, null);
      for (let key in changes) {
        let change = changes[key];
        Sync.storeAndPropagate(key, change != null ? change.newValue : null);
      }
    } as SettingsNS.OnSyncUpdate,
    storeAndPropagate (key: string, value: any) {
      if (!(key in Settings.defaults) || key in Settings.nonPersistent || !this.shouldSyncKey(key)) { return; }
      const defaultVal = Settings.defaults[key];
      if (value == null) {
        if (key in localStorage) {
          Settings.set(key, defaultVal);
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
      Settings.set(key, value);
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
      let items = Sync.to_update, removed = [] as string[], key: keyof SettingsToUpdate, left = 0;
      Sync.to_update = null;
      if (!items || Settings.Sync !== Sync) { return; }
      for (key in items) {
        if (items[key] != null) {
          ++left;
        } else {
          delete items[key];
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
    let key, value: void;
    if (value = chrome.runtime.lastError) { return value; }
    Object.setPrototypeOf(items, null);
    for (key in items) {
      Sync.storeAndPropagate(key, items[key]);
    }
  });
}, 400);

setTimeout((function() { if (!chrome.browserAction) { return; }
  const func = Settings.updateHooks.showActionIcon;
  let imageData: IconNS.StatusMap<IconNS.IconBuffer> | null, tabIds: IconNS.StatusMap<number[]> | null;
  function loadImageAndSetIcon(type: Frames.ValidStatus, path: IconNS.PathBuffer) {
    let img: HTMLImageElement, i: IconNS.ValidSizes, cache = Object.create(null) as IconNS.IconBuffer, count = 0,
    onerror = function(this: HTMLImageElement): void {
      console.error('Could not load action icon \'' + this.src + '\'.');
    },
    onload = function(this: HTMLImageElement): void {
      let canvas: HTMLCanvasElement | null = document.createElement('canvas')
        , w: number, h: number, ctx: CanvasRenderingContext2D | null;
      canvas.width = w = this.width, canvas.height = h = this.height;
      ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this, 0, 0, w, h);
      cache[w as 19 | 38] = ctx.getImageData(0, 0, w, h);
      if (count++) { return; }
      canvas = ctx = null;
      (imageData as IconNS.StatusMap<IconNS.IconBuffer>)[type] = cache;
      const arr = (tabIds as IconNS.StatusMap<number[]>)[type] as number[];
      delete (tabIds as IconNS.StatusMap<number[]>)[type];
      for (w = 0, h = arr.length; w < h; w++) {
        g_requestHandlers.SetIcon(arr[w], type);
      }
    };
    Object.setPrototypeOf(path, null);
    for (i in path) {
      img = new Image();
      img.onload = onload, img.onerror = onerror;
      img.src = path[i];
    }
  }
  Settings.IconBuffer = function(this: void, enabled?: boolean): IconNS.StatusMap<IconNS.IconBuffer> | null | void {
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
  g_requestHandlers.SetIcon = function(this: void, tabId: number, type: Frames.ValidStatus): void {
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
  Settings.updateHooks.showActionIcon = function(value) {
    func(value);
    (Settings.IconBuffer as IconNS.AccessIconBuffer)(value);
    let title = "Vimium++";
    if (value) {
      chrome.browserAction.enable();
    } else {
      chrome.browserAction.disable();
      title += "\n\nThis icon is disabled by your settings."
    }
    return chrome.browserAction.setTitle({ title });
  };
  Settings.postUpdate("showActionIcon");
}), 150);

setTimeout((function() { if (!chrome.omnibox) { return; }
  interface OmniboxCallback extends Partial<CompletersNS.QueryStatus> {
    (this: void, suggestResults: chrome.omnibox.SuggestResult[]): true;
    (this: void): void;
  }
  const enum FirstSugType {
    Default = 0,
    defaultOpen = 1, search, plainOthers
  }
  let last: string = "", firstResult: Suggestion | null, lastSuggest: OmniboxCallback | null
    , tempRequest: [string, OmniboxCallback] | null
    , timeout = 0, sessionIds: SafeDict<string | number> | null
    , suggestions = null as chrome.omnibox.SuggestResult[] | null, outTimeout = 0, outTime: number
    , defaultSuggestionType = FirstSugType.Default, matchType: CompletersNS.MatchType = CompletersNS.MatchType.Default
    , firstType: CompletersNS.ValidTypes | "";
  const defaultSug: chrome.omnibox.Suggestion = { description: "<dim>Open: </dim><url>%s</url>" },
  formatSessionId = function(sug: Suggestion) {
    if (sug.sessionId != null) {
      (sessionIds as SafeDict<string | number>)[sug.url] = sug.sessionId;
    }
  },
  format = function(this: void, sug: Readonly<Suggestion>): chrome.omnibox.SuggestResult {
    let str = "<url>" + sug.textSplit;
    str += sug.title ? "</url><dim> - " + Utils.escapeText(sug.title) + "</dim>" : "</url>";
    return {
      content: sug.url,
      description: str
    };
  },
  clean = function(): true {
    if (lastSuggest) { lastSuggest.isOff = true; }
    sessionIds = tempRequest = suggestions = lastSuggest = firstResult = null;
    if (outTimeout) { clearTimeout(outTimeout); }
    outTime = matchType = outTimeout = 0;
    firstType = last = "";
    return Utils.resetRe();
  },
  outClean = function() {
    if (Date.now() - outTime > 5000) {
      outTimeout = 0;
      clean();
    } else {
      outTimeout = setTimeout(outClean, 30000);
    }
  },
  onTimer = function() {
    timeout = 0;
    let arr;
    if (arr = tempRequest) {
      tempRequest = null;
      return onInput(arr[0], arr[1]);
    }
  },
  onComplete = function(this: null, suggest: OmniboxCallback, response: Suggestion[]
      , autoSelect: boolean, newMatchType: CompletersNS.MatchType): void {
    if (!lastSuggest || suggest.isOff) { return; }
    if (suggest === lastSuggest) { lastSuggest = null; }
    let sug: Suggestion | undefined = response[0];
    if (sug && "sessionId" in sug) {
      sessionIds = Object.create(null);
      response.forEach(formatSessionId);
    }
    firstType = response.length > 0 ? response[0].type as CompletersNS.ValidTypes : "";
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
    outTimeout || setTimeout(outClean, 30000);
    Utils.resetRe();
    suggest(suggestions);
    return;
  },
  onInput = function(this: void, key: string, suggest: OmniboxCallback): void {
    key = key.trim().replace(Utils.spacesRe, " ");
    if (key === last) { suggestions && suggest(suggestions as chrome.omnibox.SuggestResult[]); return; }
    lastSuggest && (lastSuggest.isOff = true);
    if (timeout) {
      tempRequest = [key, suggest];
      return;
    } else if (matchType === CompletersNS.MatchType.emptyResult && key.startsWith(last)) {
      suggest([]);
      return;
    }
    timeout = setTimeout(onTimer, 500);
    outTime = Date.now();
    sessionIds = suggestions = firstResult = null;
    let newMatchType: CompletersNS.MatchType = CompletersNS.MatchType.Default;
    const type: CompletersNS.ValidTypes = matchType < CompletersNS.MatchType.singleMatch
        || !key.startsWith(last) ? "omni"
      : matchType === CompletersNS.MatchType.searchWanted ? "search"
      : (newMatchType = matchType, firstType || "omni");
    matchType = newMatchType;
    last = key;
    lastSuggest = suggest;
    return Completers.filter(key, { type, maxResults: 6 }, onComplete.bind(null, suggest));
  },
  onEnter = function(this: void, text: string, disposition?: string): void {
    text = text.trim();
    if (tempRequest && tempRequest[0] === text) {
      tempRequest = [text, onEnter.bind(null, text, disposition) as OmniboxCallback];
      return onTimer();
    } else if (lastSuggest) {
      return;
    }
    if (firstResult && text === last) { text = firstResult.url; }
    const sessionId = sessionIds && sessionIds[text];
    clean();
    return sessionId != null ? g_requestHandlers.gotoSession({ sessionId }) : g_requestHandlers.openUrl({
      url: text,
      reuse: (disposition === "currentTab" ? ReuseType.current
        : disposition === "newForegroundTab" ? ReuseType.newFg : ReuseType.newBg)
    });
  };
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
    const t = chrome.tabs, callback = function() { return chrome.runtime.lastError; },
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
    console.log("%cVimium++%c has %cinstalled%c with %O at %c%s%c .", "color:red", "color:auto"
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
      return g_requestHandlers.focusOrLaunch({
        url: "https://github.com/gdh1995/vimium-plus#release-notes"
      });
    });
  });
}, 500);
});

setTimeout((function() {
  if (a) {
    a.removeListener(cb);
    chrome.runtime.onInstalled = a = null as never;
  }
  cb = function(b) { a = b; console.log(b); };
  Utils.resetRe();
}), 1200);
