import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;

const Settings = {
  cache: Object.create(null) as SettingsNS.FullCache,
  temp: {
    shownHash: null as null | ((this: void) => string)
  },
  bufferToLoad: Object.create(null) as SettingsNS.FrontendSettingCache & SafeObject,
  extWhiteList: null as SafeDict<true> | null,
  Init: null as ((this: void) => void) | null,
  IconBuffer: null as IconNS.AccessIconBuffer | null,
  globalCommand: null as never as (command: string, options?: CommandsNS.RawOptions | null, count?: number) => void,
  getExcluded: Utils.getNull as (this: void, url: string) => string | null,
  get<K extends keyof SettingsWithDefaults> (key: K, forCache?: boolean): SettingsWithDefaults[K] {
    if (key in this.cache) {
      return (this.cache as SettingsWithDefaults)[key];
    }
    const initial = this.defaults[key];
    const value = !(key in localStorage) ? initial
        : typeof initial === "string" ? localStorage.getItem(key) as string
        : initial === false || initial === true ? localStorage.getItem(key) === "true"
        : JSON.parse<typeof initial>(localStorage.getItem(key) as string);
    if (forCache) {
      this.cache[key] = value;
    }
    return value;
  },
  set<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void {
    this.cache[key] = value;
    if (!(key in this.nonPersistent)) {
      const initial = this.defaults[key as keyof SettingsNS.PersistentSettings];
      if (value === initial) {
        localStorage.removeItem(key);
        this.Sync.set(key as keyof SettingsNS.PersistentSettings, null);
      } else {
        localStorage.setItem(key, typeof initial === "string" ? value as string : JSON.stringify(value));
        this.Sync.set(key as keyof SettingsNS.PersistentSettings, value as
          FullSettings[keyof SettingsNS.PersistentSettings]);
      }
    }
    let ref: SettingsNS.UpdateHook<K> | undefined;
    if (ref = this.updateHooks[key] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(this, value, key);
    }
  },
  postUpdate<K extends keyof FullSettings> (key: K, value?: FullSettings[K] | null | undefined): void {
    return (this.updateHooks[key] as SettingsNS.UpdateHook<K>).call(this,
      value !== undefined ? value : this.get(key as keyof SettingsWithDefaults), key);
  },
  broadcast<K extends keyof BgReq> (request: Req.bg<K>): void {
    let ref = this.indexPorts(), tabId: string, frames: Frames.Frames, i: number;
    for (tabId in ref) {
      frames = ref[tabId] as Frames.Frames;
      for (i = frames.length; 0 < --i; ) {
        frames[i].postMessage(request);
      }
    }
  },
  updateHooks: {
    __proto__: null as never,
    bufferToLoad: function() {
      const ref = (this as typeof Settings).valuesToLoad, ref2 = (this as typeof Settings).bufferToLoad;
      for (let _i = ref.length; 0 <= --_i;) {
        let key = ref[_i];
        ref2[key] = (this as typeof Settings).get(key);
      }
    },
    extWhiteList: function(val) {
      const map = (this as typeof Settings).extWhiteList = Object.create<true>(null);
      if (!val) { return; }
      for (let arr = val.split("\n"), i = arr.length, wordCharRe = /^[\dA-Za-z]/ as RegExpOne; 0 <= --i; ) {
        if ((val = arr[i].trim()) && wordCharRe.test(val)) {
          map[val] = true;
        }
      }
    },
    newTabUrl: function(url): void {
      url = (<RegExpI>/^\/?pages\/[a-z]+.html\b/i).test(url)
        ? chrome.runtime.getURL(url) : Utils.convertToUrl(url);
      return (this as typeof Settings).set('newTabUrl_f', url);
    },
    searchEngines: function(): void {
      return (this as typeof Settings).set("searchEngineMap", Object.create<Search.Engine>(null));
    },
    searchEngineMap: function(value): void {
      (this as typeof Settings).set("searchKeywords", null);
      Utils.parseSearchEngines("~:" + (this as typeof Settings).get("searchUrl"), value);
      const rules = Utils.parseSearchEngines((this as typeof Settings).get("searchEngines"), value);
      return (this as typeof Settings).set("searchEngineRules", rules);
    },
    searchUrl: function(str): void {
      let map: FullSettings["searchEngineMap"], str2: string;
      if (str) {
        Utils.parseSearchEngines("~:" + str, map = (this as typeof Settings).cache.searchEngineMap);
        const obj = map["~"] as Search.Engine;
        str2 = obj.url.replace(Utils.spacesRe, "%20");
        if (obj.name) { str2 += " " + obj.name; }
        if (str2 !== str) {
          return (this as typeof Settings).set("searchUrl", str2);
        }
      } else if (str = (this as typeof Settings).get("newTabUrl_f", true)) {
        return ((this as typeof Settings).updateHooks.newTabUrl_f as (this: void, url_f: string) => void)(str);
      } else {
        str = (this as typeof Settings).get("searchUrl");
        const ind = str.indexOf(" ");
        if (ind > 0) { str = str.substring(0, ind); }
        (this as typeof Settings).get("searchEngineMap", true)["~"] = { name: "~", url: str };
      }
      return (this as typeof Settings).postUpdate("newTabUrl");
    },
    baseCSS: function(css): void {
      (this as typeof Settings).CONST.BaseCSSLength = css.length;
      css += (this as typeof Settings).get("userDefinedCss");
      (this as typeof Settings).cache.baseCSS = "";
      return (this as typeof Settings).set("innerCSS", css);
    },
    vimSync: function(value) {
      if (value) {
        setTimeout(alert, 17, "Warning: the current settings will be OVERRIDDEN the next time Vimium++ starts!\n"
          + 'Please back up your settings using the "Export Settings" button RIGHT NOW!');
      }
      if (value || !(this as typeof Settings).Sync.HandleStorageUpdate) { return; }
      setTimeout(function() {
        chrome.storage.onChanged.removeListener(Settings.Sync.HandleStorageUpdate as SettingsNS.OnSyncUpdate);
        Settings.Sync = { set: function() {} };
      }, 100);
    },
    userDefinedCss: function(css): void {
      css = (this as typeof Settings).cache.innerCSS.substring(0, (this as typeof Settings).CONST.BaseCSSLength) + css;
      (this as typeof Settings).set("innerCSS", css);
      return (this as typeof Settings).broadcast({
        name: "insertInnerCSS",
        css: (this as typeof Settings).cache.innerCSS
      });
    }
  } as SettingsNS.DeclaredUpdateHookMap as SettingsNS.UpdateHookMap,
  indexFrame: null as never as (this: void, tabId: number, frameId: number) => Port | null,
  indexPorts: null as never as Window["Settings"]["indexPorts"],
  fetchFile (file: keyof SettingsNS.CachedFiles, callback?: (this: void) => any): TextXHR | null {
    if (callback && file in this.cache) { callback(); return null; }
    return Utils.fetchHttpContents(this.CONST.XHRFiles[file], function() {
      Settings.set(file, this.responseText);
      callback && callback();
      return;
    });
  },
  // clear localStorage & sync, if value === @defaults[key]
  // the default of all nullable fields must be set to null for compatibility with @Sync.set
  defaults: {
    __proto__: null as never,
    deepHints: false,
    dialogMode: false,
    exclusionListenHash: true,
    exclusionOnlyFirstMatch: false,
    exclusionRules: [{pattern: "^https?://mail.google.com/", passKeys: ""}] as ExclusionsNS.StoredRule[],
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
  } as SettingsWithDefaults & SafeObject,
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: { __proto__: null as never,
    baseCSS: 1, exclusionTemplate: 1, helpDialog: 1, innerCSS: 1,
    searchEngineMap: 1, searchEngineRules: 1, searchKeywords: 1
  } as TypedSafeEnum<SettingsNS.NonPersistentSettings>,
  frontUpdateAllowed: { __proto__: null as never,
    showAdvancedCommands: 1
  } as TypedSafeEnum<SettingsNS.FrontUpdateAllowedSettings>,
  icons: [
    { "19": "/icons/enabled_19.png", "38": "/icons/enabled_38.png" },
    { "19": "/icons/partial_19.png", "38": "/icons/partial_38.png" },
    { "19": "/icons/disabled_19.png", "38": "/icons/disabled_38.png" }
  ] as [IconNS.PathBuffer, IconNS.PathBuffer, IconNS.PathBuffer],
  valuesToLoad: ["deepHints", "grabBackFocus", "keyboard", "linkHintCharacters" //
    , "regexFindMode", "scrollStepSize", "smoothScroll", "userDefinedOuterCss" //
  ] as Array<keyof SettingsNS.FrontendSettings>,
  Sync: {
    set: function() {}
  } as SettingsNS.Sync,
  CONST: {
    BaseCSSLength: 0,
    ChromeNewTab: "chrome://newtab",
    ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html", // should keep lower case
    DefaultNewTabPage: "pages/newtab.html",
    ChromeVersion: 37, ContentScripts: null as never as string[], CurrentVersion: "", CurrentVersionName: "",
    KnownPages: ["blank", "newtab", "options", "show"],
    MathParser: "/lib/math_parser.js",
    HelpDialog: "/background/help_dialog.js",
    Commands: "/background/commands.js",
    Exclusions: "/background/exclusions.js",
    XHRFiles: {
      baseCSS: "/front/vimium.min.css",
      exclusionTemplate: "/front/exclusions.html",
      helpDialog: "/front/help_dialog.html"
    },
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
      __proto__: null as never
    } as SafeDict<string>,
    ShowHelper: "pages/show_helper.js", ShowPage: "show.html",
    VomnibarPage: "front/vomnibar.html"
  }
};

// note: if changed, ../pages/newtab.js also needs change.
Settings.defaults.newTabUrl = Settings.CONST.ChromeInnerNewTab;
Settings.CONST.ChromeVersion = 0 | (navigator.appVersion.match(/\bChrom(?:e|ium)\/(\d+)/) || [0, 53])[1] as number;
chrome.runtime.getPlatformInfo(function(info): void {
  Settings.CONST.Platform = info.os;
  Settings.bufferToLoad.onMac = info.os === (chrome.runtime.PlatformOs ? chrome.runtime.PlatformOs.MAC : "mac");
});

setTimeout(function() {
  let ref, origin = location.origin, prefix = origin + "/", obj: typeof Settings.CONST,
  func = function(path: string): string {
    return (path.charCodeAt(0) === 47 ? origin : prefix) + path;
  };
  ref = chrome.runtime.getManifest();
   ref.chrome_url_overrides && ref.chrome_url_overrides.newtab;
  obj = Settings.CONST;
  obj.CurrentVersion = ref.version;
  obj.CurrentVersionName = ref.version_name || ref.version;
  obj.OptionsPage = func(ref.options_page || obj.OptionsPage);
  obj.ShowPage = Utils.formatVimiumUrl(obj.ShowPage, false, Urls.WorkType.Default);
  obj.VomnibarPage = func(obj.VomnibarPage);
  ref = ref.content_scripts[0].js;
  ref[ref.length - 1] = "/content/inject_end.js";
  if (obj.ChromeVersion < 41) { ref.unshift(obj.PolyFill); }
  obj.ContentScripts = ref.map(func);
}, 17);
