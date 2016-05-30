"use strict";
var Settings = {
  cache: Object.create(null),
  bufferToLoad: null,
  extWhiteList: null,
  globalCommand: null,
  Init: null,
  get: function(key, forCache) {
    if (key in this.cache) {
      return this.cache[key];
    }
    var value = !(key in localStorage) ? this.defaults[key]
        : (key in this.NonJSON) ? localStorage[key]
        : JSON.parse(localStorage[key]);
    if (forCache) {
      this.cache[key] = value;
    }
    return value;
  },
  set: function(key, value) {
    var ref;
    this.cache[key] = value;
    if (key in this.nonPersistent) {
    } else if (value === this.defaults[key]) {
      delete localStorage[key];
      this.Sync.set(key, null);
    } else {
      localStorage[key] = (key in this.NonJSON) ? value : JSON.stringify(value)
      this.Sync.set(key, value);
    }
    if (ref = this.updateHooks[key]) {
      ref.call(this, value, key);
    }
  },
  postUpdate: function(key, value) {
    this.updateHooks[key].call(this, value !== undefined ? value : this.get(key), key);
  },
  broadcast: function (request) {
    var ref = this.indexPorts(), tabId, frames, i;
    for (tabId in ref) {
      frames = ref[tabId];
      for (i = frames.length; 0 < --i; ) {
        frames[i].postMessage(request);
      }
    }
  },
  updateHooks: {
    __proto__: null,
    bufferToLoad: function() {
      var _i, key, ref = this.valuesToLoad, ref2;
      ref2 = this.bufferToLoad = Object.create(null);
      for (_i = ref.length; 0 <= --_i;) {
        key = ref[_i];
        ref2[key] = this.get(key);
      }
    },
    extWhiteList: function(val) {
      var arr = val.split("\n"), i, map;
      map = this.extWhiteList = Object.create(null);
      for (i = arr.length; 0 <= --i; ) {
        if ((val = arr[i]) && (val = val.trim()).length === 32) {
          map[val] = true;
        }
      }
    },
    newTabUrl: function(url) {
      url = /^\/?pages\/[a-z]+.html\b/i.test(url)
        ? chrome.runtime.getURL(url) : Utils.convertToUrl(url);
      this.set('newTabUrl_f', url);
    },
    searchEngines: function() {
      this.set("searchEngineMap", Object.create(null));
    },
    searchEngineMap: function(value) {
      Utils.parseSearchEngines("~:" + this.get("searchUrl"), value);
      var rules = Utils.parseSearchEngines(this.get("searchEngines"), value);
      this.set("searchEngineRules", rules);
    },
    searchUrl: function(str) {
      var map, obj, ind;
      if (str) {
        Utils.parseSearchEngines("~:" + str, map = this.cache.searchEngineMap);
        obj = map["~"];
        str = obj.url.replace(Utils.spacesRe, "%20");
        if (obj.name) { str += " " + obj.name; }
        if (str !== arguments[0]) {
          this.set("searchUrl", str);
          return;
        }
      } else if (str = this.get("newTabUrl_f", true)) {
        this.updateHooks.newTabUrl_f(str);
        return;
      } else {
        str = this.get("searchUrl");
        ind = str.indexOf(" ");
        if (ind > 0) { str = str.substring(0, ind); }
        this.get("searchEngineMap", true)["~"] = { url: str };
      }
      this.postUpdate("newTabUrl");
    },
    baseCSS: function(css) {
      css += this.get("userDefinedCss");
      this.set("innerCss", css);
    },
    vimSync: function() {
      setTimeout(function() { window.location.reload(); }, 1000);
    },
    userDefinedCss: function() {
      this.postUpdate("baseCSS");
      this.broadcast({
        name: "insertInnerCss",
        css: this.cache.innerCss
      });
    },
    userDefinedOuterCss: function(css) {
      this.broadcast({
        name: "insertCSS",
        css: css
      });
    }
  },
  indexFrame: null,
  indexPorts: null,
  reloadFiles: function() {
    var files = this.files, id, func = function() {
      Settings.set(this.id, this.responseText);
    };
    for (id in files) {
      Utils.fetchHttpContents(files[id], func).id = id;
    }
  },
  contentScripts: function(callback) {
    setTimeout(function() { callback(Settings.CONST.ContentScripts); }, 18);
    return true;
  },
  // clear localStorage & sync, if value === @defaults[key]
  // the default of any dict field should be set to null, for @Sync
  defaults: {
    __proto__: null,
    autoClearCS: true,
    deepHints: false,
    exclusionRules: [{pattern: "^https?://mail.google.com/", passKeys: ""}],
    extWhiteList: "hdnehngglnbnehkfcidabjckinphnief",
    findModeRawQueryList: "",
    grabBackFocus: true,
    hideHud: false,
    keyboard: [500, 33],
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    localeEncoding: "GBK",
    newTabUrl: "",
    nextPatterns: "\u4e0b\u9875,\u4e0b\u4e00\u9875,\u4e0b\u4e00\u7ae0,\u540e\u4e00\u9875"
      + ",next,more,newer,>,\u203a,\u2192,\xbb,\u226b,>>",
    previousPatterns: "\u4e0a\u9875,\u4e0a\u4e00\u9875,\u4e0a\u4e00\u7ae0,\u524d\u4e00\u9875"
      + ",prev,previous,back,older,<,\u2039,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: "http://www.baidu.com/s?ie=UTF-8&wd=$s Baidu",
    searchEngines: "b|ba|baidu|Baidu: www.baidu.com/s?ie=UTF-8&wd=$s \u767e\u5ea6\n\
g|go|gg|google|Google: http://www.google.com/search?q=$s Google\n\
js\\:|Js: javascript:\\ $S; Javascript\n\
w|wiki:\\\n  http://www.wikipedia.org/w/index.php?search=$s Wikipedia (en-US)",
    searchEngineMap: {}, // may be modified, but this action is safe
    showActionIcon: true,
    showAdvancedCommands: false,
    showAdvancedOptions: false,
    smoothScroll: true,
    tinyMemory: false,
    userDefinedCss: "",
    userDefinedOuterCss: "",
    vimSync: false
  },
  NonJSON: {
    __proto__: null, extWhiteList: 1, findModeRawQueryList: 1,
    keyMappings: 1, linkHintCharacters: 1, localeEncoding: 1,
    newTabUrl: 1, newTabUrl_f: 1, nextPatterns: 1, previousPatterns: 1,
    searchEngines: 1, searchUrl: 1, userDefinedCss: 1, userDefinedOuterCss: 1
  },
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: { __proto__: null,
    baseCSS: 1, exclusionTemplate: 1, helpDialog: 1, innerCss: 1,
    searchEngineMap: 1, searchEngineRules: 1, vomnibar: 1
  },
  files: {
    __proto__: null,
    baseCSS: "front/vimium.min.css",
    exclusionTemplate: "front/exclusions.html",
    helpDialog: "front/help_dialog.html",
    vomnibar: "front/vomnibar.html"
  },
  icons: {
    __proto__: null,
    disabled: { "19": "icons/disabled_19.png", "38": "icons/disabled_38.png" },
    enabled: { "19": "icons/enabled_19.png", "38": "icons/enabled_38.png" },
    partial: { "19": "icons/partial_19.png", "38": "icons/partial_38.png" }
  },
  valuesToLoad: ["deepHints" //
    , "grabBackFocus", "hideHud", "keyboard" //
    , "linkHintCharacters", "nextPatterns", "previousPatterns" //
    , "scrollStepSize", "smoothScroll" //
  ],
  Sync: {
    set: function() {}
  },
  CONST: {
    ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html", // should keep lower case
    ChromeVersion: 37, ContentScripts: null, CurrentVersion: "",
    OnMac: false, OptionsPage: ""
  }
};

// note: if changed, ../pages/newtab.js also needs change.
Settings.defaults.newTabUrl = Settings.CONST.ChromeInnerNewTab;
Settings.CONST.ChromeVersion = +navigator.appVersion.match(/Chrom(?:e|ium)\/(\d+\.\d+)/)[1];

setTimeout(function() {
  chrome.runtime.getPlatformInfo(function(info) {
    Settings.CONST.OnMac = info.os === "mac";
  });

  var ref, i, origin = location.origin, prefix = origin + "/",
  func = function(path) {
    return (path.charCodeAt(0) === 47 ? origin : prefix) + path;
  };
  ref = chrome.runtime.getManifest();
  Settings.CONST.CurrentVersion = ref.version;
  Settings.CONST.OptionsPage = func(ref.options_page);
  ref = ref.content_scripts[0].js;
  ref[ref.length - 1] = "/content/inject_end.js";
  Settings.CONST.ContentScripts = ref.map(func);
  Settings.contentScripts = function(callback) { callback(this.CONST.ContentScripts); };
}, 17);
