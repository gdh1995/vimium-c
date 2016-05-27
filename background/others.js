"use strict";

if (Settings.get("vimSync") === true) setTimeout(function() { if (!chrome.storage) { return; }
  Settings.Sync = {
    storage: chrome.storage.sync,
    to_update: null,
    doNotSync: Object.setPrototypeOf({
      findModeRawQueryList: 1, keyboard: 1
    }, null),
    HandleStorageUpdate: function(changes) {
      var change, key;
      var _this = Settings.Sync;
      Object.setPrototypeOf(changes, null);
      for (key in changes) {
        change = changes[key];
        _this.storeAndPropagate(key, change != null ? change.newValue : null);
      }
    },
    storeAndPropagate: function(key, value) {
      var curVal, jsonVal, defaultVal = Settings.defaults[key];
      if (!this.shouldSyncKey(key)) { return; }
      if (value == null) {
        if (key in localStorage) {
          Settings.set(key, defaultVal);
        }
        return;
      }
      curVal = Settings.get(key);
      if (key in Settings.NonJSON) {
        jsonVal = value;
      } else {
        jsonVal = JSON.stringify(value);
        curVal = JSON.stringify(curVal);
      }
      if (jsonVal === curVal) { return; }
      curVal = (key in Settings.NonJSON) ? defaultVal : JSON.stringify(defaultVal);
      if (jsonVal === curVal) {
        value = defaultVal;
      }
      Settings.set(key, value);
    },
    set: function(key, value) {
      if (!this.shouldSyncKey(key)) { return; }
      var items = this.to_update;
      if (!items) {
        setTimeout(this.DoUpdate, 60000);
        items = this.to_update = Object.create(null);
      }
      items[key] = value;
    },
    DoUpdate: function() {
      var _this = Settings.Sync, items = _this.to_update, removed = [], key, left = 0;
      _this.to_update = null;
      if (!items) { return; }
      for (key in items) {
        if (items[key] != null) {
          ++left;
        } else {
          delete items[key];
          removed.push(key);
        }
      }
      if (removed.length > 0) {
        _this.storage.remove(removed);
      }
      if (left > 0) {
        _this.storage.set(items);
      }
    },
    shouldSyncKey: function(key) {
      return (key in Settings.defaults) && !(key in this.doNotSync);
    }
  };
  chrome.storage.onChanged.addListener(Settings.Sync.HandleStorageUpdate);
  Settings.Sync.storage.get(null, function(items) {
    var key, value;
    if (value = chrome.runtime.lastError) { return value; }
    Object.setPrototypeOf(items, null);
    for (key in items) {
      Settings.Sync.storeAndPropagate(key, items[key]);
    }
  });
}, 400);

setTimeout(function() { if (!chrome.browserAction) { return; }
  var func = Settings.updateHooks.showActionIcon, imageData;
  function loadImageAndSetIcon(tabId, type, path) {
    var img = new Image(), img2 = new Image(), i, cache = Object.create(null), count = 0;
    img.onerror = img2.onerror = function() {
      console.error('Could not load action icon \'' + this.src + '\'.');
    };
    img.onload = img2.onload = function() {
      var canvas = document.createElement('canvas'), w = this.width, h = this.h, ctx;
      w = canvas.width = this.width, h = canvas.height = this.height;
      ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this, 0, 0, w, h);
      cache[w] = ctx.getImageData(0, 0, w, h);
      imageData[type] = cache;
      if (0 >= --count) { return; }
      g_requestHandlers.SetIcon(tabId, type);
    };
    for (i in path) { (count++ ? img2 : img).src = path[i]; }
  };
  g_requestHandlers.SetIcon = function(tabId, type) {
    var data = imageData[type], path;
    if (data) {
      chrome.browserAction.setIcon({
        tabId: tabId,
        imageData: data
      });
    } else if (path = Settings.icons[type]) {
      setTimeout(loadImageAndSetIcon, 0, tabId, type, path);
    }
  };
  Settings.updateHooks.showActionIcon = function (value) {
    func.call(this, value);
    if (value) {
      imageData || (imageData = Object.create(null));
      chrome.browserAction.setTitle({
        title: "Vimium++"
      });
      chrome.browserAction.enable();
    } else {
      imageData = null;
      chrome.browserAction.disable();
      chrome.browserAction.setTitle({
        title: "Vimium++\nThis icon is not in use"
      });
    }
  };
  Settings.postUpdate("showActionIcon");
}, 150);

setTimeout(function() { if (!chrome.omnibox) { return; }
  var last, firstUrl, lastSuggest, spanRe = /<(\/?)span(?: [^>]+)?>/g,
  tempRequest, timeout = 0, sessionIds, suggestions = null,
  defaultSug = { description: "<dim>Open: </dim><url>%s</url>" },
  formatSessionId = function(sug) {
    if (sug.sessionId != null) {
      sessionIds[sug.url] = sug.sessionId;
    }
  },
  format = function(sug) {
    var str;
    if (sug.description) {
      str = sug.description;
    } else {
      str = "<url>" + sug.textSplit.replace(spanRe, "<$1match>");
      str += sug.title ? "</url><dim> - " + Utils.escapeText(sug.title) + "</dim>"
        : "</url>";
    }
    return {
      content: sug.url,
      description: str
    }
  },
  clean = function() {
    firstUrl = "";
    last = sessionIds = tempRequest = suggestions = null;
    if (lastSuggest) {
      lastSuggest.isOff = true;
      lastSuggest = null;
    }
  },
  onTimer = function() {
    timeout = 0;
    var arr;
    if (arr = tempRequest) {
      tempRequest = null;
      onInput(arr[0], arr[1]);
    }
  },
  onComplete = function(suggest, response) {
    if (!lastSuggest || suggest.isOff) { return; }
    if (suggest === lastSuggest) { lastSuggest = null; }
    var sug = response[0];
    if (!sug || sug.type !== "search") {
      chrome.omnibox.setDefaultSuggestion(defaultSug);
      sessionIds = Object.create(null);
      response.forEach(formatSessionId);
    } else {
      firstUrl = sug.url;
      var text = sug.titleSplit.replace(spanRe, "");
      text = Utils.escapeText(text.substring(0, text.indexOf(":")));
      text = "<dim>" + text + " - </dim><url>" +
        sug.textSplit.replace(spanRe, "<$1match>") + "</url>";
      chrome.omnibox.setDefaultSuggestion({ description: text });
      response.shift();
      if (sug = response[0]) switch (sug.type) {
      case "math":
        sug.description = "<dim>" + sug.textSplit + " = </dim><url><match>" +
          sug.titleSplit + "</match></url>";
        break;
      }
    }
    response = response.map(format);
    suggest(suggestions = response);
  },
  onInput = function(key, suggest) {
    key = key.trim();
    if (key === last) { suggestions && suggest(suggestions); return; }
    lastSuggest && (lastSuggest.isOff = true);
    if (timeout) {
      tempRequest = [key, suggest];
      return;
    }
    timeout = setTimeout(onTimer, 300);
    firstUrl = "";
    sessionIds = suggestions = null;
    last = key;
    lastSuggest = suggest;
    Completers.omni.filter(key, {
      maxResults: 6
    }, onComplete.bind(null, suggest));
  },
  onEnter = function(text, disposition) {
    if (tempRequest && tempRequest[0] === text) {
      tempRequest = [text, onEnter.bind(null, text, disposition)];
      onTimer();
      return;
    } else if (lastSuggest) {
      return;
    }
    if (text === last && firstUrl) { text = firstUrl; }
    var sessionId = sessionIds && sessionIds[text];
    clean();
    if (sessionId == null) {
      g_requestHandlers.openUrl({
        url: text,
        reuse: (disposition === "currentTab" ? 0
          : disposition === "newForegroundTab" ? -1 : -2)
      });
    } else if (typeof sessionId === "number") {
      g_requestHandlers.selectTab({ tabId: sessionId });
    } else {
      g_requestHandlers.restoreSession({ sessionId: sessionId });
    }
  };
  chrome.omnibox.onInputChanged.addListener(onInput);
  chrome.omnibox.onInputEntered.addListener(onEnter);
  chrome.omnibox.onInputCancelled.addListener(clean);
}, 600);

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
chrome.runtime.onInstalled.addListener(window.b = function(details) {
  var reason = details.reason;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion; }
  else { return; }

setTimeout(function() {
  chrome.tabs.query({
    status: "complete"
  }, function(tabs) {
    var _i = tabs.length, tabId, _j, _len, callback, url, t = chrome.tabs, ref, contentScripts, js;
    callback = function() { return chrome.runtime.lastError; };
    contentScripts = chrome.runtime.getManifest().content_scripts[0];
    ref = {file: "", allFrames: contentScripts.all_frames};
    js = contentScripts.js;
    _len = js.length - 1;
    for (; 0 <= --_i; ) {
      url = tabs[_i].url;
      if (url.startsWith("chrome") || url.indexOf("://") === -1) continue;
      tabId = tabs[_i].id;
      for (_j = 0; _j < _len; ++_j) {
        ref.file = js[_j];
        t.executeScript(tabId, ref, callback);
      }
    }
    function now() {
      return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60
        ).toJSON().substring(0, 19).replace('T', ' ');
    };
    console.log("%cVimium++%c has %cinstalled%c with %O at %c%s%c .", "color:red", "color:auto"
      , "color:blue", "color:auto;", details, "color:#1c00cf", now(), "color:auto");
  });

  if (!reason) { return; }

  function compareVersion(versionA, versionB) {
    var a, b, i, _ref;
    versionA = versionA.split('.');
    versionB = versionB.split('.');
    for (i = 0, _ref = Math.max(versionA.length, versionB.length); i < _ref; ++i) {
      a = parseInt(versionA[i] || 0, 10);
      b = parseInt(versionB[i] || 0, 10);
      if (a < b) {
        return -1;
      } else if (a > b) {
        return 1;
      }
    }
    return 0;
  };
  if (compareVersion(Settings.CONST.CurrentVersion, reason) <= 0) { return; }

  reason = "vimium++_upgradeNotification";
  chrome.notifications && chrome.notifications.create(reason, {
    type: "basic",
    iconUrl: location.origin + "/icons/icon128.png",
    title: "Vimium++ Upgrade",
    message: "Vimium++ has been upgraded to version " + Settings.CONST.CurrentVersion
      + ". Click here for more information.",
    isClickable: true
  }, function(notificationId) {
    if (chrome.runtime.lastError) {
      return chrome.runtime.lastError;
    }
    reason = notificationId || reason;
    chrome.notifications.onClicked.addListener(function(id) {
      if (id !== reason) { return; }
      g_requestHandlers.focusOrLaunch({
        url: "https://github.com/gdh1995/vimium-plus#release-notes"
      });
    });
  });
}, 500);
});

setTimeout(function() {
  chrome.runtime.onInstalled.removeListener(window.b);
  window.b = null;

  document.head.remove();
  document.body.remove();
}, 200);

//* #if DEBUG
var a, b, c, cb, log;
cb = function(b) { a = b; console.log(b); };
setTimeout(function() {
  a = c = null; b = cb;
  log = console.log.bind(console);
}, 2000); // #endif */
