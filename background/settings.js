"use strict";
var Settings = {
  __proto__: null,
  _buffer: { __proto__: null },
  bufferToLoad: null,
  frameIdsForTab: null,
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
      ref2 = this.bufferToLoad = { __proto__: null };
      for (_i = ref.length; 0 <= --_i;) {
        key = ref[_i];
        ref2[key] = this.get(key);
      }
    },
    files: function() {
      var files = this.files, id;
      for (id in files) {
        Utils.fetchHttpContents(files[id], this.set.bind(this, id));
      }
    },
    searchEngines: function() {
      this.set("searchEnginesMap", { "": [], __proto__: null });
    },
    searchUrl: function(value) {
      Utils.parseSearchEngines("~:" + value, this.get("searchEnginesMap"));
    },
    searchEnginesMap: function(value) {
      Utils.parseSearchEngines(this.get("searchEngines"), value);
      this.postUpdate("searchUrl");
    },
    userDefinedCss: function(cssi) {
      var csso;
      cssi && (cssi = cssi.trim());
      csso = this.get("userDefinedOuterCss");
      csso && (csso = csso.trim());
      this.set("userDefinedCss_f", (cssi || csso) ? [cssi, csso] : null);
    },
    userDefinedOuterCss: function() {
      this.postUpdate("userDefinedCss");
    }
  },
  // clear localStorage & sync, if value === @defaults[key]
  defaults: {
    __proto__: null,
    UILanguage: null,
    deepHints: false,
    exclusionRules: [{pattern: "http*://mail.google.com/*", passKeys: ""}],
    filterLinkHints: false,
    findModeRawQuery: "",
    grabBackFocus: true,
    hideHud: false,
    keyboard: [500, 33],
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    linkHintNumbers: "1234567890",
    newTabUrl: "",
    newTabUrl_f: "",
    nextPatterns: "next,more,newer,>,\u2192,\xbb,\u226b,>>",
    previousPatterns: "prev,previous,back,older,<,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: "http://www.baidu.com/s?ie=utf-8&wd=%s Baidu",
    searchEngines: "b|ba|baidu|Baidu: www.baidu.com/s?ie=utf-8&wd=%s \u767e\u5ea6\n\
bi|bing|Bing: https://www.bing.com/search?q=%s Bing\n\
g|go|gg|google|Google: http://www.google.com/search?q=%s Google\n\
js\\:|Js: javascript:\\ %S; Javascript\n\
w|wiki:\\\n  http://www.wikipedia.org/w/index.php?search=%s Wikipedia (en-US)",
    searchEnginesMap: { "": [] },
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
    keyMappings: 1, linkHintCharacters: 1, linkHintNumbers: 1,
    newTabUrl: 1, newTabUrl_f: 1, nextPatterns: 1, previousPatterns: 1,
    searchEngines: 1, searchUrl: 1, userDefinedCss: 1, userDefinedOuterCss: 1
  },
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: { __proto__: null,
    baseCSS: 1, exclusionTemplate: 1, help_dialog: 1, 
    searchEnginesMap: 1, settingsVersion: 1, userDefinedCss_f: 1,
    userDefinedOuterCss_f: 1, vomnibar: 1
  },
  files: {
    __proto__: null,
    baseCSS: "pages/vimium.min.css",
    exclusionTemplate: "pages/exclusions.html",
    help_dialog: "pages/help_dialog.html",
    vomnibar: "pages/vomnibar.html"
  },
  icons: {
    __proto__: null,
    disabled: { "19": "icons/disabled_19.png", "38": "icons/disabled_38.png" },
    enabled: { "19": "icons/enabled_19.png", "38": "icons/enabled_38.png" },
    partial: { "19": "icons/partial_19.png", "38": "icons/partial_38.png" }
  },
  valuesToLoad: ["deepHints" //
    , "filterLinkHints", "findModeRawQuery", "findModeRawQueryList" //
    , "grabBackFocus", "hideHud", "keyboard" //
    , "linkHintCharacters", "linkHintNumbers", "nextPatterns" //
    , "previousPatterns", "regexFindMode", "scrollStepSize", "smoothScroll" //
  ],
  Sync: null,
  CONST: {
    ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html", // should keep lower case
    ChromeVersion: 37, ContentScripts: null, CurrentVersion: "",
    OnMac: false, OptionsPage: "", Timer: 0, __proto__: null
  }
};

// note: if changed, ../pages/newtab.js also needs change.
Settings.defaults.newTabUrl = Settings.CONST.ChromeInnerNewTab;

(function() {
  var ref, i, func;
  func = (function(path) { return this(path); }).bind(chrome.runtime.getURL);
  ref = chrome.runtime.getManifest();
  Settings.CONST.CurrentVersion = ref.version;
  Settings.CONST.OptionsPage = func(ref.options_page);
  Settings.CONST.ContentScripts = ref = ref.content_scripts[0];
  ref.css = ref.css ? ref.css.map(func) : [];
  ref.js  = ref.js  ? ref.js .map(func) : [];
  ref.js.push(func("content/inject_end.js"));

  i = navigator.appVersion.indexOf("Chrome");
  Settings.CONST.ChromeVersion = parseFloat(navigator.appVersion.substring(i + 7));

  func = function() {};
  Settings.Sync = {__proto__: null, clear: func, set: func};
})();

chrome.runtime.getPlatformInfo(function(info) {
  Settings.CONST.OnMac = info.os === "mac";
});
