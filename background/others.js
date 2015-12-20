"use strict";

if (Settings.get("vimSync") === true) setTimeout(function() {
  Settings.Sync = {
    storage: chrome.storage.sync,
    doNotSync: ["settingsVersion", "previousVersion", "keyboard"],
    fetchAsync: function() {
      var _this = this;
      this.storage.get(null, function(items) {
        var key, value, hasOwn;
        if (chrome.runtime.lastError) {
          return chrome.runtime.lastError;
        }
        hasOwn = Object.prototype.hasOwnProperty;
        for (key in items) {
          if (!hasOwn.call(items, key)) continue;
          value = items[key];
          _this.storeAndPropagate(key, value);
        }
      });
    },
    HandleStorageUpdate: function(changes) {
      var change, key;
      var _this = Settings.Sync, func = Object.prototype.hasOwnProperty;
      for (key in changes) {
        if (!func.call(changes, key)) continue;
        change = changes[key];
        _this.storeAndPropagate(key, change != null ? change.newValue : undefined);
      }
    },
    storeAndPropagate: function(key, value) {
      var defaultValue, defaultValueJSON;
      if (!(key in Settings.defaults)) {
        return;
      }
      if (!this.shouldSyncKey(key)) {
        return;
      }
      if (value && key in localStorage && localStorage[key] === value) {
        return;
      }
      defaultValue = Settings.defaults[key];
      defaultValueJSON = JSON.stringify(defaultValue);
      if (value && value !== defaultValueJSON) {
        value = JSON.parse(value);
      } else {
        value = defaultValue;
      }
      Settings.set(key, value);
    },
    set: function(key, value) {
      if (this.shouldSyncKey(key)) {
        var settings = {};
        settings[key] = value;
        this.storage.set(settings);
      }
    },
    clear: function(key) {
      if (this.shouldSyncKey(key)) {
        this.storage.remove(key);
      }
    },
    shouldSyncKey: function(key) {
      return this.doNotSync.index(key) < 0;
    }
  };
  chrome.storage.onChanged.addListener(Settings.Sync.HandleStorageUpdate);
  Settings.Sync.fetchAsync();
}, 100);

if (chrome.browserAction) setTimeout(function() {
  var func;
  g_requestHandlers.SetIcon = function(tabId, type, pass) {
    chrome.browserAction.setIcon({
      tabId: tabId,
      path: Settings.icons[type ||
        (pass === null ? "enabled" : pass ? "partial" : "disabled")]
    });
  };
  func = Settings.updateHooks.showActionIcon;
  Settings.updateHooks.showActionIcon = function (value) {
    func.call(Settings, value);
    if (value) {
      chrome.browserAction.setTitle({
        title: "Vimium++"
      });
      chrome.browserAction.enable();
    } else {
      chrome.browserAction.disable();
      chrome.browserAction.setTitle({
        title: "Vimium++\nThis icon is not in use"
      });
    }
  };
  Settings.postUpdate("showActionIcon");
}, 50);

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
chrome.runtime.onInstalled.addListener(function(details) {
window.b = setTimeout(function() {
  var reason = details.reason, func;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion; }
  else { return; }
  if (Settings.CONST.Timer > 0) {
    clearTimeout(Settings.CONST.Timer);
    Settings.CONST.Timer = 0;
  }

  chrome.tabs.query({
    status: "complete"
  }, function(tabs) {
    var _i = tabs.length, tabId, _j, _len, callback, url, t = chrome.tabs, ref, contentScripts, js;
    callback = function() { return chrome.runtime.lastError; };
    contentScripts = chrome.runtime.getManifest().content_scripts[0];
    ref = {file: "", allFrames: contentScripts.all_frames};
    js = contentScripts.js;
    js.pop();
    for (; 0 <= --_i; ) {
      url = tabs[_i].url;
      if (url.startsWith("chrome") || url.indexOf("://") === -1) continue;
      tabId = tabs[_i].id;
      for (_j = 0, _len = js.length; _j < _len; ++_j) {
        ref.file = js[_j];
        t.executeScript(tabId, ref, callback);
      }
    }
    console.log("%cVimium++%c has %cinstalled%c", "color:blue", "color:auto"
      , "color:red", "color:auto;", "with", details, ".");
  });

  if (!reason || !chrome.notifications) { return; }

  func = function(versionA, versionB) {
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
  if (func(Settings.CONST.CurrentVersion, reason) <= 0) { return; }

  reason = "vimium++_upgradeNotification";
  chrome.notifications.create(reason, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
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
}, 200);

//* #if DEBUG
var a, b, c, cb, log;
cb = function(b) { a = b; console.log(b); };
setTimeout(function() {
  a = c = null; b = cb; log = function() {
    console.log.apply(console, arguments);
  };
}, 2000); // #endif */
