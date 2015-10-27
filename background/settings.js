"use strict";
var Settings = {
  _buffer: { __proto__: null },
  bufferToLoad: null,
  frameIdsForTab: null,
  keyToSet: [],
  timerForSet: 0,
  urlForTab: null,
  extIds: [chrome.runtime.id],
  get: function(key) {
    if (key in this._buffer) {
      return this._buffer[key];
    } else {
      return this._buffer[key] = !(key in localStorage) ? this.defaults[key]
        : (key in this.NonJSON) ? localStorage[key]
        : JSON.parse(localStorage[key]);
    }
  },
  set: function(key, value) {
    var ref;
    this._buffer[key] = value;
    if (key in this.nonPersistent) {
    } else if (value === this.defaults[key]) {
      delete localStorage[key];
      this.Sync.clear(key);
    } else {
      this.Sync.set(key, localStorage[key] = (key in this.NonJSON)
        ? value : JSON.stringify(value));
    }
    if (ref = this.updateHooks[key]) {
      ref.call(this, value, key);
    }
  },
  setUnique: function(key, value) {
    this._buffer[key] = value; this.keyToSet.push(key);
    this.timerForSet || (this.timerForSet = setTimeout(this.onUnique, 17));
  },
  onUnique: function() { // has been bound
    var ref = this.keyToSet, i = ref.length, key, vals = this._buffer;
    this.keyToSet = []; this.timerForSet = 0;
    while (0 <= --i) {
      key = ref[i];
      this.set(key, vals[key]);
    }
  },
  postUpdate: function(key, value) {
    this.updateHooks[key].call(this, value !== undefined ? value : this.get(key), key);
  },
  updateHooks: {
    __proto__: null,
    broadcast: function (request) {
      chrome.tabs.query(request.onReady ? {status: "complete"} : {},
      function(tabs) {
        for (var i = tabs.length, t = chrome.tabs, req = request; 0 <= --i; ) {
          t.sendMessage(tabs[i].id, req, null);
        }
      });
      var r = chrome.runtime, arr = Settings.extIds, i, req;
      req = {"vimium++": {request: request}};
      // NOTE: injector only begin to work when dom is ready
      for (i = arr.length; 1 <= --i; ) {
        r.sendMessage(arr[i], req, null);
      }
    },
    bufferToLoad: function() {
      var _i, key, ref = this.valuesToLoad, ref2;
      ref2 = this.bufferToLoad = Utils.makeNullProto();
      for (_i = ref.length; 0 <= --_i;) {
        key = ref[_i];
        ref2[key] = this.get(key);
      }
    },
    enableDefaultMappings: function() {
      this.setUnique("postKeyMappings", 1);
    },
    files: function() {
      var files = this.files, id;
      for (id in files) {
        Utils.fetchHttpContents(files[id], this.set.bind(this, id));
      }
    },
    newTabUrl: function(url) {
      url = /^\/?pages\/[a-zA-Z0-9_%]+.html?/.test(url)
        ? chrome.runtime.getURL(url) : Utils.convertToUrl(url);
      if (this.get("newTabUrl_f") !== url) { this.setUnique('newTabUrl_f', url); }
      else { this.postUpdate('newTabUrl_f', url); }
    },
    searchEngines: function() {
      this.set("searchEnginesMap", { "": [], __proto__: null });
    },
    searchEnginesMap: function(value) {
      Utils.parseSearchEngines(this.get("searchEngines"), value);
      Utils.parseSearchEngines("~:" + this.get("searchUrl"), value);
    },
    searchUrl: function(value) {
      Utils.parseSearchEngines("~:" + value, this.get("searchEnginesMap"));
      this.postUpdate("newTabUrl");
    },
    baseCSS: function(css) {
      css += this.get("userDefinedCss");
      this.set("innerCss", css);
    },
    userDefinedCss: function(css) {
      this.postUpdate("baseCSS");
      this.postUpdate("broadcast", {
        name: "insertInnerCss",
        onReady: true,
        css: this.get("innerCss")
      });
    },
    userDefinedOuterCss: function(css) {
      this.postUpdate("broadcast", {
        name: "insertCSS",
        onReady: true,
        css: css
      });
    }
  },
  // clear localStorage & sync, if value === @defaults[key]
  defaults: {
    __proto__: null,
    UILanguage: null,
    deepHints: false,
    enableDefaultMappings: true,
    exclusionRules: [{pattern: "http*://mail.google.com/*", passKeys: ""}],
    findModeRawQuery: "",
    grabBackFocus: true,
    hideHud: false,
    isClickListened: true,
    keyboard: [500, 33],
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    newTabUrl: "",
    newTabUrl_f: "",
    nextPatterns: "\u4e0b\u9875,\u4e0b\u4e00\u9875,\u4e0b\u4e00\u7ae0,\u540e\u4e00\u9875"
      + ",next,more,newer,>,\u2192,\xbb,\u226b,>>",
    previousPatterns: "\u4e0a\u9875,\u4e0a\u4e00\u9875,\u4e0a\u4e00\u7ae0,\u524d\u4e00\u9875"
      + ",prev,previous,back,older,<,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: "http://www.baidu.com/s?ie=utf-8&wd=%s Baidu",
    searchEngines: "b|ba|baidu|Baidu: www.baidu.com/s?ie=utf-8&wd=%s \u767e\u5ea6\n\
bi|bing|Bing: http://www.bing.com/search?q=%s Bing\n\
g|go|gg|google|Google: http://www.google.com/search?q=%s Google\n\
js\\:|Js: javascript:\\ %S; Javascript\n\
w|wiki:\\\n  http://www.wikipedia.org/w/index.php?search=%s Wikipedia (en-US)",
    searchEnginesMap: { "": [] }, // may be modified, but this action is safe
    showActionIcon: true,
    showAdvancedCommands: 0,
    showAdvancedOptions: 1,
    showOmniRelevancy: false,
    smoothScroll: true,
    userDefinedCss: "",
    userDefinedOuterCss: "",
    vimSync: false
  },
  NonJSON: {
    __proto__: null, findModeRawQuery: 1,
    keyMappings: 1, linkHintCharacters: 1,
    newTabUrl: 1, newTabUrl_f: 1, nextPatterns: 1, previousPatterns: 1,
    searchEngines: 1, searchUrl: 1, userDefinedCss: 1, userDefinedOuterCss: 1
  },
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: { __proto__: null,
    baseCSS: 1, exclusionTemplate: 1, helpDialog: 1, innerCss: 1,
    searchEnginesMap: 1, settingsVersion: 1, vomnibar: 1
  },
  files: {
    __proto__: null,
    baseCSS: "front/vimium.min.css",
    exclusionTemplate: "pages/exclusions.html",
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
    , "findModeRawQuery" //
    , "grabBackFocus", "hideHud", "isClickListened", "keyboard" //
    , "linkHintCharacters", "nextPatterns" //
    , "previousPatterns", "regexFindMode", "scrollStepSize", "smoothScroll" //
  ],
  Sync: null,
  CONST: {
    ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html", // should keep lower case
    ChromeVersion: 37, ContentScripts: null, CurrentVersion: "",
    OnMac: false, OptionsPage: "", Timer: 0
  }
};

Settings.onUnique = Settings.onUnique.bind(Settings);
// note: if changed, ../pages/newtab.js also needs change.
Settings.defaults.newTabUrl = Settings.CONST.ChromeInnerNewTab;
Settings.updateHooks.keyMappings = Settings.updateHooks.enableDefaultMappings;

(function() {
  var ref, i, func;
  func = (function(path) { return this(path); }).bind(chrome.runtime.getURL);
  ref = chrome.runtime.getManifest();
  Settings.CONST.CurrentVersion = ref.version;
  Settings.CONST.OptionsPage = func(ref.options_page);
  ref = ref.content_scripts[0].js;
  ref[ref.length - 1] = "content/inject_end.js";
  ref = ref.map(func);
  Settings.CONST.ContentScripts = {js: ref};

  i = navigator.appVersion.match(/Chrom(?:e|ium)\/([^\s]*)/)[1];
  Settings.CONST.ChromeVersion = parseFloat(i);

  func = function() {};
  Settings.Sync = {__proto__: null, clear: func, set: func};
})();

chrome.runtime.getPlatformInfo(function(info) {
  Settings.CONST.OnMac = info.os === "mac";
});
