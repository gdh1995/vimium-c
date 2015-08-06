"use strict";

if (Settings.get("vimSync") === true) {
  Settings.Sync = {
    __proto__: null,
    storage: chrome.storage.sync,
    doNotSync: ["settingsVersion", "previousVersion"],
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
    handleStorageUpdate: function(changes, area) {
      var change, key;
      for (key in changes) {
        if (!Object.prototype.hasOwnProperty.call(changes, key)) continue;
        change = changes[key];
        this.storeAndPropagate(key, change != null ? change.newValue : undefined);
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
  chrome.storage.onChanged.addListener(Settings.Sync.handleStorageUpdate.bind(Settings.Sync));
  Settings.Sync.fetchAsync();
}

if (chrome.browserAction && chrome.browserAction.setIcon) (function() {
  g_requestHandlers.SetIcon = function(tabId, type, pass) {
    chrome.browserAction.setIcon({
      tabId: tabId,
      path: Settings.icons[type ||
        (pass === null ? "enabled" : pass ? "partial" : "disabled")]
    });
  };
  Settings.updateHooks.showActionIcon = (function (value) {
    this(value);
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
  }).bind(Settings.updateHooks.showActionIcon);
  Settings.postUpdate("showActionIcon");
})();

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
chrome.runtime.onInstalled.addListener(window.b = function(details) {
  var contentScripts, func, js, css, reason = details.reason;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion; }
  else { return; }
  if (Settings.CONST.Timer > 0) {
    clearTimeout(Settings.CONST.Timer);
    Settings.CONST.Timer = 0;
  }

  contentScripts = chrome.runtime.getManifest().content_scripts[0];
  if (contentScripts.all_frames) {
    func = function(url) { return {file: url, allFrames: true}; };
  } else {
    func = function(url) { return {file: url, allFrames: false}; };
  }
  css = (contentScripts.css || []).map(func);
  js = contentScripts.js.map(func);
  contentScripts = null;
  chrome.tabs.query({
    status: "complete"
  }, function(tabs) {
    var _i = tabs.length, tabId, _j, _len, callback, url, t = chrome.tabs;
    callback = function() { return chrome.runtime.lastError; };
    for (; 0 <= --_i; ) {
      url = tabs[_i].url;
      if (url.startsWith("chrome") || url.indexOf("://") === -1) continue;
      tabId = tabs[_i].id;
      for (_j = 0, _len = css.length; _j < _len; ++_j)
        t.insertCSS(tabId, css[_j], callback);
      for (_j = 0, _len = js.length; _j < _len; ++_j)
        t.executeScript(tabId, js[_j], callback);
    }
    console.log("%cVimium++ %chas %cinstalled", "color:blue", "color:auto", "color:red", details);
  });

  if (!reason && chrome.notifications && chrome.notifications.create) { return; }

  func = function(versionA, versionB) {
    var a, b, i, _i, _ref;
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
});
setTimeout(function() {
  chrome.runtime.onInstalled.removeListener(window.b);
  window.b = null;
}, 50);

var a, b, c, cb, log; // #if DEBUG
cb = function(b) { a = b; console.log(b); };
setTimeout(function() {
  a = c = null, b = cb, log = console.log.bind(console);
}, 100); // #endif
