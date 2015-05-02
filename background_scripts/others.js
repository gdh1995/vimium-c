"use strict";

if (Settings.get("vimSync") === true) {
  var Sync = {
    debug: window._DEBUG,
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
  chrome.storage.onChanged.addListener(Sync.handleStorageUpdate.bind(Sync));
  Sync.fetchAsync();
}

if (chrome.browserAction && chrome.browserAction.setIcon) (function() {
  var currentBadge, badgeTimer, updateBadge, time1 = 50, set, shouldShow;
  chrome.browserAction.setBadgeBackgroundColor({color: [82, 156, 206, 255]});
  updateBadge = function(badge) {
    badgeTimer = 0;
    chrome.browserAction.setBadgeText({text: badge});
  };
  g_requestHandlers.setBadge = function(request) {
    var badge = request.badge;
    if (shouldShow && badge != null && badge !== currentBadge) {
      currentBadge = badge;
      if (badgeTimer) {
        clearTimeout(badgeTimer);
      }
      badgeTimer = setTimeout(updateBadge, time1, badge);
    }
  };
  g_requestHandlers.setIcon = function(tabId, type) {
    if (shouldShow) {
      chrome.browserAction.setIcon({
        tabId: tabId,
        path: Settings.icons[type]
      });
    }
  };
  set = function (value) {
    if (value === shouldShow) { return; }
    // TODO: hide icon
    if (shouldShow = value) {
      chrome.browserAction.enable();
    } else {
      chrome.browserAction.disable();
    }
  };
  Settings.updateHooks.showActionIcon = set;
  set(Settings.get("showActionIcon"));
})();

chrome.runtime.onInstalled.addListener(function(details) {
  var contentScripts, js, css, allFrames, _i, _len, reason = details.reason;
  if (["chrome_update", "shared_module_update"].indexOf(reason) >= 0) { return; }
  if (window.b > 0) {
    clearTimeout(window.b);
    window.b = window.cb;
  }
  contentScripts = chrome.runtime.getManifest().content_scripts[0];
  js = contentScripts.js;
  css = (details.reason === "install" || window._DEBUG >= 3) ? contentScripts.css : [];
  allFrames = contentScripts.all_frames;
  contentScripts = null;
  for (_i = css.length; 0 <= --_i; ) {
    css[_i] = {file: css[_i], allFrames: allFrames};
  }
  for (_i = js.length; 0 <= --_i; ) {
    js[_i] = {file: js[_i], allFrames: allFrames};
  }
  chrome.tabs.query({
    windowType: "normal",
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
    console.log("%cvim %chas %cinstalled", "color:blue", "color:auto", "color:red", details);
  });

  var func = function(versionA, versionB) {
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
  var key = Settings.storage("previousVersion"), currentVersion = Utils.getCurrentVersion();
  if (!key) {
    Settings.storage("previousVersion", currentVersion);
    return;
  } else if (func(currentVersion, key) !== 1) {
    return;
  }
  func = function() {
    var key = "vim++_upgradeNotification";
    chrome.notifications.create(key, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("favicon.ico"),
      title: "Vimium++ Upgrade",
      message: "Vimium++ has been upgraded to version " + currentVersion
        + ". Click here for more information.",
      isClickable: true
    }, function() {
      if (chrome.runtime.lastError) {
        return chrome.runtime.lastError;
      }
      Settings.storage("previousVersion", currentVersion);
      chrome.notifications.onClicked.addListener(function(id) {
        if (id !== key) { return; }
        chrome.tabs.create({
          url: "https://github.com/gdh1995/vim-plus#release-notes"
        }, function(tab) {
          chrome.windows.update(tab.windowId, {focused: true});
        });
        chrome.notifications.clear(key, function() {
          return chrome.runtime.lastError;
        });
      });
    });
  };
  if (chrome.notifications && chrome.notifications.create) {
    func();
  } else {
    chrome.permissions.onAdded.addListener(func);
  }
});
