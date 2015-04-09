"use strict";
var Settings = {
  _buffer: {},
  get: function(key) {
    if (! (key in this._buffer)) {
      return this._buffer[key] = (key in localStorage) ? JSON.parse(localStorage[key]) : this.defaults[key];
    }
    return this._buffer[key];
  },
  set: function(key, value) {
    var ref = this.defaults[key], clear = false, i;
    if (value === ref) {
      clear = true;
    } else if (key in this.enforceBoolean && value !== this.enforceBoolean[key]) {
      value = ref;
      clear = true;
    }
    this._buffer[key] = value;
    if ((i = this.valuesToLoad.indexOf(key)) >= 0) {
      this.bufferToLoad[i] = value;
    }
    if ((ref = this.postUpdateHooks[key]) && ref.call(this, value, key) === false) {
      return;
    } else if (key in this.nonPersistent) {
      return;
    }
    if (clear) {
      if (key in localStorage) delete localStorage[key];
      Sync.clear(key);
    } else {
      Sync.set(key, localStorage[key] = JSON.stringify(value));
    }
  },
  clear: function(key) {
    this.set(key, this.defaults[key]);
  },
  hasPersistent: function(key) {
    return key in localStorage;
  },
  storage: function(key, value) {
    if (value === undefined) {
      return JSON.parse(localStorage[key] || "null");
    }
    localStorage[key] = JSON.stringify(value);
  },
  postUpdate: function(key, virtualValue) {
    var ref = this.postUpdateHooks[key];
    if (ref) {
      ref.call(this, virtualValue !== undefined ? virtualValue : this.get(key), key);
    }
  },
  setUpdateHook: function(key, func) {
    this.postUpdateHooks[key] = func;
  },
  postUpdateHooks: {
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
      return false;
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
    var a, pairs, key, val, name, obj, _i, _j, _len, _len2, key0 //
      , rEscapeSpace = /\\\s/g, rSpace = /\s/, rEscapeS = /\\s/g;
    map = map || this.get("searchEnginesMap");
    a = searchEnginesText.replace(/\\\n/g, '').split('\n');
    for (_i = 0, _len = a.length; _i < _len; _i++) {
      val = a[_i].trim();
      if (!val || val[0] === '#') continue;
      _j = val.indexOf(":");
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
    var url = pattern.url, insert = pattern.$s || pattern.$S, ind;
    if (insert && Utils.hasOrdinaryUrlPrefix(url)) {
      if (ind = (url.indexOf("?") + 1) || (url.indexOf("#") + 1)) {
        var prefix = url.substring(0, ind - 1);
        url = url.substring(ind, insert - 1);
        if (ind = url.lastIndexOf("&") + 1) {
          url = url.substring(ind);
        }
        if (url && url !== "=") {
          url = url.toLowerCase().replace(RegexpCache._escapeRegEx, "\\$&");
          if (prefix.startsWith("https://")) {
            prefix = "http" + prefix.substring(5);
          }
          return [prefix, new RegExp("[?#&]" + url + "([^&#]*)", "i"), name];
        }
      }
    }
  },
  readFile: function(id, url) {
    var _this = this;
    this.set(id, "");
    url = url || this.files[id];
    fetchHttpContents(url, this.set.bind(this, id));
  },
  reloadFiles: function() {
    var files = this.files, id;
    for (id in files) {
      this.set(id, "");
      fetchHttpContents(files[id], this.set.bind(this, id));
    }
  },
  // clear localStorage & sync, if value === @defaults[key]
  defaults: {
    UILanguage: null,
    showAdvancedCommands: 0,
    showAdvancedOptions: 1,
    showActionIcon: false,
    vimSync: false,
    showOmniRelevancy: false,
    scrollStepSize: 100,
    smoothScroll: true,
    keyMappings: "",
    linkHintCharacters: "asdqwerzxcv",
    linkHintNumbers: "1234567890",
    filterLinkHints: false,
    hideHud: false,
    regexFindMode: false,
    findModeRawQuery: "",
    userDefinedCss: "",
    exclusionRules: [
      {
        pattern: "http*://mail.google.com/*",
        passKeys: ""
      }
    ],
    previousPatterns: "prev,previous,back,<,\u2190,\xab,\u226a,<<",
    nextPatterns: "next,more,>,\u2192,\xbb,\u226b,>>",
    searchUrl: "http://www.baidu.com/s?ie=utf-8&wd=%s Baidu",
    searchEngines: "w|wiki|Wiki:\\\n  http://www.wikipedia.org/w/index.php?search=%s Wikipedia (en-US)\nBaidu|baidu|ba:\\\n  www.baidu.com/s?ie=utf-8&wd=%s",
    newTabUrl: "/index.html" // note: if changed, /pages/newtab.html also needs change.
  },
  // accept only if value === @enforceBoolean[key], so that we get boolean options
  enforceBoolean: {
    showActionIcon: true,
    vimSync: true
  },
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: {
    help_dialog: true,
    searchEnginesMap: true,
    settingsVersion: true,
    userDefinedCss_f: true,
    vomnibar: true
  },
  files: {
    vomnibar: "pages/vomnibar.html",
    help_dialog: "pages/help_dialog.html"
  },
  icons: {
    enabled: "img/icons/browser_action_enabled.png",
    partial: "img/icons/browser_action_partial.png",
    disabled: "img/icons/browser_action_disabled.png"
  },
  valuesToLoad: ["scrollStepSize", "linkHintCharacters", "linkHintNumbers", "filterLinkHints" //
    , "hideHud", "previousPatterns", "nextPatterns", "findModeRawQuery", "regexFindMode" //
    , "showAdvancedCommands", "smoothScroll", "showOmniRelevancy" //
    , "findModeRawQueryList"
  ],
  bufferToLoad: null,
  ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html" // should keep lower case
};