"use strict";
var Settings = {
  _buffer: {},
  bufferToLoad: null,
  frameIdsForTab: null,
  urlForTab: null,
  extIds: [chrome.runtime.id],
  get: function(key) {
    if (! (key in this._buffer)) {
      return this._buffer[key] = !(key in localStorage) ? this.defaults[key]
        : (key in this.NonJSON) ? localStorage[key]
        : JSON.parse(localStorage[key]);
    }
    return this._buffer[key];
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
      var _i, key, ref = this.valuesToLoad, ref2 = this.bufferToLoad = {};
      ref2.__proto__ = null;
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
      this.set("searchEnginesMap", { "": [] });
    },
    searchUrl: function(value) {
      this.parseSearchEngines("~:" + value);
    },
    searchEnginesMap: function(value) {
      this.parseSearchEngines(this.get("searchEngines"), value);
      this.parseSearchEngines("~:" + this.get("searchUrl"), value);
      this.postUpdate("postSearchEnginesMap", null);
    },
    userDefinedCss: function(css) {
      if (css && (css = css.replace(/\r/g, ""))) {
        if (css.indexOf("\n") >= 0) {
          css = (css.startsWith('\n') ? "" : '\n') + css + (css.endsWith('\n') ? "" : '\n');
        }
      } else {
        css = "";
      }
      this.set("userDefinedCss_f", css);
    }
  },
  parseSearchEngines: function(searchEnginesText, map) {
    var a, pairs, key, val, name, obj, _i, _j, _len, _len2, key0, //
    rEscapeSpace = /\\\s/g, rSpace = /\s/, rEscapeS = /\\s/g, rColon = /\\:/g;
    map = map || this.get("searchEnginesMap");
    a = searchEnginesText.replace(/\\\n/g, '').split('\n');
    for (_i = 0, _len = a.length; _i < _len; _i++) {
      val = a[_i].trim();
      if (!(val.charCodeAt(0) > 35)) { continue; } // mask: /[ !"#]/
      _j = 0;
      do {
        _j = val.indexOf(":", _j + 1);
      } while (val[_j - 1] === '\\');
      if (_j <= 0 || !(key = val.substring(0, _j).trimRight())) continue;
      val = val.substring(_j + 1).trimLeft();
      if (!val) continue;
      val = val.replace(rEscapeSpace, "\\s");
      _j = val.search(rSpace);
      if (_j > 0) {
        name = val.substring(_j + 1).trimLeft();
        key0 = "";
        val = val.substring(0, _j);
      } else {
        name = null;
      }
      val = val.replace(rEscapeS, " ");
      obj = {url: val};
      key = key.replace(rColon, ":");
      pairs = key.split('|');
      for (_j = 0, _len2 = pairs.length; _j < _len2; _j++) {
        if (key = pairs[_j].trim()) {
          if (name) {
            if (!key0) { key0 = key; }
          } else {
            key0 = name = key;
          }
          map[key] = obj;
        }
      }
      if (!name) continue;
      obj.name = name;
      obj.$s = val.indexOf("%s") + 1;
      obj.$S = val.indexOf("%S") + 1;
      if (pairs = this.reparseSearchUrl(obj, key0)) {
        map[""].push(pairs);
      }
    }
  },
  reparseSearchUrl: function (pattern, name) {
    var url, ind = pattern.$s || pattern.$S, prefix;
    if (!ind || !Utils.hasOrdinaryUrlPrefix(url = pattern.url)) { return; }
    url = url.substring(0, ind - 1);
    if (ind = (url.indexOf("?") + 1) || (url.indexOf("#") + 1)) {
      prefix = url.substring(0, ind - 1);
      url = url.substring(ind);
      if (ind = url.lastIndexOf("&") + 1) {
        url = url.substring(ind);
      }
      if (url && url !== "=" && !url.endsWith("/")) {
        url = url.toLowerCase().replace(RegexpCache._escapeRegex, "\\$&");
        if (prefix.startsWith("https://")) {
          prefix = "http" + prefix.substring(5);
        }
        return [prefix, new RegExp("[?#&]" + url + "([^&#]*)", "i"), name];
      }
      url = pattern.url.substring(0, (pattern.$s || pattern.$S) - 1);
    }
    prefix = url;
    url = pattern.url.substring(url.length + 2);
    if (ind = (url.indexOf("?") + 1) || (url.indexOf("#") + 1)) {
      url = url.substring(0, ind);
    }
    url = url.toLowerCase().replace(RegexpCache._escapeRegex, "\\$&");
    if (prefix.startsWith("https://")) {
      prefix = "http" + prefix.substring(5);
    }
    return [prefix, new RegExp("^([^?#]*)" + url, "i"), name];
  },
  // clear localStorage & sync, if value === @defaults[key]
  defaults: {
    UILanguage: null,
    exclusionRules: [{pattern: "http*://mail.google.com/*", passKeys: ""}],
    filterLinkHints: false,
    findModeRawQuery: "",
    hideHud: false,
    keyMappings: "",
    linkHintCharacters: "asdqwerzxcv",
    linkHintNumbers: "1234567890",
    newTabUrl: "",
    nextPatterns: "next,more,>,\u2192,\xbb,\u226b,>>",
    previousPatterns: "prev,previous,back,<,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: "http://www.baidu.com/s?ie=utf-8&wd=%s Baidu",
    searchEngines: "b|ba|baidu|Baidu: www.baidu.com/s?ie=utf-8&wd=%s \u767e\u5ea6"
      + "\nbi|bing|Bing: https://www.bing.com/search?q=%s Bing"
      + "\ng|go|gg|google|Google: http://www.google.com/search?q=%s Google"
      + "\njs\\:: javascript:\\ %S; Javascript"
      + "\nw|wiki:\\\n  http://www.wikipedia.org/w/index.php?search=%s Wikipedia (en-US)"
      ,
    showActionIcon: true,
    showAdvancedCommands: 0,
    showAdvancedOptions: 1,
    showOmniRelevancy: false,
    smoothScroll: true,
    userDefinedCss: "",
    vimSync: false
  },
  NonJSON: {
    findModeRawQuery: true,
    keyMappings: true, linkHintCharacters: true, linkHintNumbers: true,
    newTabUrl: true, nextPatterns: true, previousPatterns: true,
    searchEngines: true, searchUrl: true, userDefinedCss: true
  },
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: {
    exclusionTemplate: true,
    help_dialog: true,
    newTabUrl_f: true,
    searchEnginesMap: true,
    settingsVersion: true,
    userDefinedCss_f: true,
    vomnibar: true
  },
  files: {
    exclusionTemplate: "pages/exclusions.html",
    help_dialog: "pages/help_dialog.html",
    vomnibar: "pages/vomnibar.html"
  },
  icons: {
    disabled: {
      "19": "icons/disabled_19.png",
      "38": "icons/disabled_38.png"
    },
    enabled: {
      "19": "icons/enabled_19.png",
      "38": "icons/enabled_38.png"
    },
    partial: {
      "19": "icons/partial_19.png",
      "38": "icons/partial_38.png"
    }
  },
  valuesToLoad: ["filterLinkHints", "findModeRawQuery", "findModeRawQueryList" //
    , "hideHud", "linkHintCharacters", "linkHintNumbers", "nextPatterns" //
    , "previousPatterns", "regexFindMode", "scrollStepSize", "smoothScroll" //
  ],
  Sync: null,
  CONST: {
    ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html", // should keep lower case
    ChromeVersion: 37,
    ContentScripts: null,
    CurrentVersion: "",
    OnMac: false,
    OptionsPage: "",
    Timer: 0
  } 
};
Settings.__proto__ = null;
Settings._buffer.__proto__ = null;
Settings.updateHooks.__proto__ = null;
Settings.defaults.__proto__ = null;
Settings.NonJSON.__proto__ = null;
Settings.nonPersistent.__proto__ = null;
Settings.icons.__proto__ = null;
Settings.CONST.__proto__ = null;

// note: if changed, ../pages/newtab.js also needs change.
Settings.defaults.newTabUrl = Settings.CONST.ChromeInnerNewTab;

(function() {
  var ref, ref2, ref3, i, func;
  func = (function(path) { return this(path); }).bind(chrome.runtime.getURL);
  ref = chrome.runtime.getManifest();
  Settings.CONST.CurrentVersion = ref.version;
  Settings.CONST.OptionsPage = func(ref.options_page);
  ref = ref.content_scripts;
  ref3 = { all_frames: false, css: [], js: [] };
  ref3.__proto__ = null;
  for (i = 0; i < ref.length; i++) {
    ref2 = ref[i];
    if (ref2.matches.indexOf("<all_urls>") === -1) { continue; }
    ref3.all_frames || (ref3.all_frames = ref2.all_frames);
    ref3.css = ref3.css.concat(ref2.css.map(func));
    ref3.js = ref3.js.concat(ref2.js.map(func));
  }
  ref3.js.push(func("content/inject-end.js"));
  Settings.CONST.ContentScripts = ref3;

  i = navigator.appVersion.indexOf("Chrome");
  Settings.CONST.ChromeVersion = parseFloat(navigator.appVersion.substring(i + 7));

  func = function() {};
  Settings.Sync = {clear: func, set: func};
  Settings.Sync.__proto__ = null;
})();

chrome.runtime.getPlatformInfo(function(info) {
  Settings.CONST.OnMac = info.os === "mac";
});
