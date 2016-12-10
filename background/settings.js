"use strict";
var Settings = {
  cache: Object.create(null),
  bufferToLoad: null,
  extWhiteList: null,
  globalCommand: null,
  Init: null,
  IconBuffer: null,
  get: function(key, forCache) {
    if (key in this.cache) {
      return this.cache[key];
    }
    var initial = this.defaults[key];
    var value = !(key in localStorage) ? initial
        : typeof initial === "string" ? localStorage.getItem(key)
        : initial === false || initial === true ? localStorage.getItem(key) === "true"
        : JSON.parse(localStorage.getItem(key));
    if (forCache) {
      this.cache[key] = value;
    }
    return value;
  },
  set: function(key, value) {
    var ref, initial;
    this.cache[key] = value;
    if (!(key in this.nonPersistent)) {
      initial = this.defaults[key];
      if (value === initial) {
        localStorage.removeItem(key);
        this.Sync.set(key, null);
      } else {
        localStorage.setItem(key, typeof initial === "string" ? value : JSON.stringify(value));
        this.Sync.set(key, value);
      }
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
      ref2.onMac = this.CONST.Platform === "mac";
    },
    extWhiteList: function(val) {
      var map, arr, i, wordCharRe;
      map = this.extWhiteList = Object.create(null);
      if (!val) { return; }
      wordCharRe = /^[\dA-Za-z]/;
      for (arr = val.split("\n"), i = arr.length; 0 <= --i; ) {
        if ((val = arr[i].trim()) && wordCharRe.test(val)) {
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
      this.set("searchKeywords", null);
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
      this.CONST.BaseCSSLength = css.length;
      css += this.get("userDefinedCss");
      this.cache.baseCSS = null;
      this.set("innerCSS", css);
    },
    vimSync: function(value) {
      if (value) {
        setTimeout(alert, 17, "Warning: the current settings will be OVERRIDDEN the next time Vimium++ starts!\n"
          + 'Please back up your settings using the "Export Settings" button RIGHT NOW!');
      }
      if (value || !this.Sync.HandleStorageUpdate) { return; }
      setTimeout(function() {
        chrome.storage.onChanged.removeListener(Settings.Sync.HandleStorageUpdate);
        Settings.Sync = { set: function() {} };
      }, 100);
    },
    userDefinedCss: function(css) {
      css = this.cache.innerCSS.substring(0, this.CONST.BaseCSSLength) + css;
      this.set("innerCSS", css);
      this.broadcast({
        name: "insertInnerCSS",
        css: this.cache.innerCSS
      });
    }
  },
  indexFrame: null,
  indexPorts: null,
  fetchFile: function(file, callback) {
    if (callback && file in this.cache) { return callback(); }
    Utils.fetchHttpContents(this.files[file], function() {
      Settings.set(file, this.responseText);
      callback && callback();
      return;
    });
  },
  // clear localStorage & sync, if value === @defaults[key]
  // the default of any nullable field must be set to null for compatibility with @Sync.set
  defaults: {
    __proto__: null,
    deepHints: false,
    dialogMode: false,
    exclusionListenHash: true,
    exclusionOnlyFirstMatch: false,
    exclusionRules: [{pattern: "^https?://mail.google.com/", passKeys: ""}],
    extWhiteList: "",
    findModeRawQueryList: "",
    grabBackFocus: false,
    hideHud: false,
    keyboard: [500, 33],
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    localeEncoding: "gbk",
    newTabUrl: "",
    newTabUrl_f: "",
    nextPatterns: "\u4e0b\u9875,\u4e0b\u4e00\u9875,\u4e0b\u4e00\u7ae0,\u540e\u4e00\u9875"
      + ",next,more,newer,>,\u203a,\u2192,\xbb,\u226b,>>",
    previousPatterns: "\u4e0a\u9875,\u4e0a\u4e00\u9875,\u4e0a\u4e00\u7ae0,\u524d\u4e00\u9875"
      + ",prev,previous,back,older,<,\u2039,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: "https://www.baidu.com/s?ie=UTF-8&wd=$s Baidu",
    searchEngines: "b|ba|baidu: https://www.baidu.com/s?ie=UTF-8&wd=$s Baidu\n\
bi|bing: https://www.bing.com/search?q=%s Bing\n\
g|go|gg|google: https://www.google.com/search?q=$s Google\n\
js\\:|Js: javascript:\\ $S; Javascript\n\
w|wiki:\\\n  https://www.wikipedia.org/w/index.php?search=$s Wikipedia\n\
\n\
# More examples.\n\
#\n\
# (Vimium++ supports search completion Google, Wikipedia,\n\
# and so on, as above, and for these.)\n\
#\n\
# l: https://www.google.com/search?q=%s&btnI I'm feeling lucky\n\
# y: https://www.youtube.com/results?search_query=%s Youtube\n\
# gm: https://www.google.com/maps?q=%s Google maps\n\
# d: https://duckduckgo.com/?q=%s DuckDuckGo\n\
# az: https://www.amazon.com/s/?field-keywords=%s Amazon\n\
# qw: https://www.qwant.com/?q=%s Qwant",
    searchEngineMap: {}, // may be modified, but this action is safe
    showActionIcon: true,
    showAdvancedCommands: false,
    showAdvancedOptions: false,
    smoothScroll: true,
    userDefinedCss: "",
    userDefinedOuterCss: "",
    vimSync: false
  },
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: { __proto__: null,
    baseCSS: 1, exclusionTemplate: 1, helpDialog: 1, innerCSS: 1,
    searchEngineMap: 1, searchEngineRules: 1, searchKeywords: 1
  },
  frontUpdateAllowed: { __proto__: null,
    showAdvancedCommands: 1
  },
  files: {
    __proto__: null,
    baseCSS: "front/vimium.min.css",
    exclusionTemplate: "front/exclusions.html",
    helpDialog: "front/help_dialog.html",
    vomnibar: "front/vomnibar.html"
  },
  icons: [
    { "19": "icons/enabled_19.png", "38": "icons/enabled_38.png" },
    { "19": "icons/partial_19.png", "38": "icons/partial_38.png" },
    { "19": "icons/disabled_19.png", "38": "icons/disabled_38.png" }
  ],
  valuesToLoad: ["deepHints", "grabBackFocus", "keyboard", "linkHintCharacters" //
    , "regexFindMode", "scrollStepSize", "smoothScroll", "userDefinedOuterCss" //
  ],
  Sync: {
    set: function() {}
  },
  CONST: {
    BaseCSSLength: 0,
    ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html", // should keep lower case
    ChromeVersion: 37, ContentScripts: null, CurrentVersion: "",
    KnownPages: ["blank", "newtab", "options", "show"],
    MathParser: "lib/math_parser.js",
    OptionsPage: "pages/options.html", Platform: "", PolyFill: "lib/polyfill.js",
    RedirectedUrls: {
      about: "https://github.com/gdh1995/vimium-plus",
      help: "https://github.com/philc/vimium/wiki",
      license: "https://raw.githubusercontent.com/gdh1995/vimium-plus/master/LICENSE.txt",
      permissions: "https://github.com/gdh1995/vimium-plus/blob/master/PRIVACY-POLICY.txt#permissions-required",
      policy: "https://github.com/gdh1995/vimium-plus/blob/master/PRIVACY-POLICY.txt",
      popup: "options.html",
      privacy: "https://github.com/gdh1995/vimium-plus/blob/master/PRIVACY-POLICY.txt#privacy-policy",
      readme: "https://github.com/gdh1995/vimium-plus/blob/master/README.md",
      settings: "options.html",
      __proto__: null
    },
    VomnibarPage: ""
  }
};

// note: if changed, ../pages/newtab.js also needs change.
Settings.defaults.newTabUrl = Settings.CONST.ChromeInnerNewTab;
Settings.CONST.ChromeVersion = 0 | (navigator.appVersion.match(/\bChrom(?:e|ium)\/(\d+)/) || [0, 53])[1];

setTimeout(function() {
  chrome.runtime.getPlatformInfo(function(info) {
    Settings.CONST.Platform = info.os;
  });

  var ref, origin = location.origin, prefix = origin + "/", obj,
  func = function(path) {
    return (path.charCodeAt(0) === 47 ? origin : prefix) + path;
  };
  ref = chrome.runtime.getManifest();
  obj = Settings.CONST;
  obj.CurrentVersion = ref.version;
  obj.OptionsPage = func(ref.options_page || obj.OptionsPage);
  obj.VomnibarPage = func(Settings.files.vomnibar);
  ref = ref.content_scripts[0].js;
  ref[ref.length - 1] = "/content/inject_end.js";
  if (obj.ChromeVersion < 41) { ref.unshift(obj.PolyFill); }
  obj.ContentScripts = ref.map(func);
}, 17);
