"use strict";
var Sync = {
  debug: window._DEBUG,
  storage: chrome.storage.sync,
  doNotSync: ["settingsVersion", "previousVersion"],
  init: function() {
    chrome.storage.onChanged.addListener(this.handleStorageUpdate.bind(this));
    this.fetchAsync();
  },
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
