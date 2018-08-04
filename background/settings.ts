import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;

var Settings = {
  cache: Object.create(null) as Readonly<SettingsNS.FullCache>,
  temp: {
    shownHash: null as null | ((this: void) => string)
  } as {
    shownHash: null | ((this: void) => string);
    [key: string]: ((this: void) => any) | undefined | null;
  },
  bufferToLoad: Object.create(null) as SettingsNS.FrontendSettingCache & SafeObject,
  newTabs: Object.create(null) as SafeDict<Urls.NewTabType>,
  extWhiteList: null as never as SafeDict<boolean>,
  get<K extends keyof SettingsWithDefaults> (key: K, forCache?: boolean): SettingsWithDefaults[K] {
    if (key in this.cache) {
      return (this.cache as SettingsWithDefaults)[key];
    }
    const initial = this.defaults[key], str = localStorage.getItem(key);
    const value = str == null ? initial : typeof initial === "string" ? str
        : initial === false || initial === true ? str === "true"
        : JSON.parse<typeof initial>(str);
    forCache && ((this.cache as SettingsNS.FullCache)[key] = value);
    return value;
  },
  set<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void {
    (this.cache as SettingsNS.FullCache)[key] = value;
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
    if (ref = this.updateHooks[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(this, value, key);
    }
  },
  postUpdate: function<K extends keyof SettingsWithDefaults> (this: Window["Settings"], key: K, value?: FullSettings[K]): void {
    return ((this as typeof Settings).updateHooks[key] as SettingsNS.UpdateHook<K>).call(this,
      value !== undefined ? value : this.get(key), key);
  } as {
    <K extends keyof SettingsNS.NullableUpdateHookMap>(key: K, value?: FullSettings[K] | null): void;
    <K extends keyof SettingsNS.SpecialUpdateHookMap>(key: K, value: null): void;
    <K extends keyof SettingsNS.EnsuredUpdateHookMaps>(key: K, value?: FullSettings[K]): void;
    <K extends keyof SettingsWithDefaults>(key: K, value?: FullSettings[K]): void;
  },
  broadcast<K extends keyof BgReq> (request: Req.bg<K>): void {
    const ref = Backend.indexPorts();
    for (const tabId in ref) {
      const frames = ref[tabId] as Frames.Frames;
      for (let i = frames.length; 0 < --i; ) {
        frames[i].postMessage(request);
      }
    }
  },
  updateHooks: {
    __proto__: null as never,
    bufferToLoad (): void {
      const ref = (this as typeof Settings).valuesToLoad, ref2 = this.bufferToLoad;
      for (let _i = ref.length; 0 <= --_i;) {
        let key = ref[_i];
        ref2[key] = this.get(key);
      }
    },
    grabBackFocus (value: FullSettings["grabBackFocus"]): void {
      (this as typeof Settings).bufferToLoad.grabFocus = value;
    },
    extWhiteList (val): void {
      const old = (this as typeof Settings).extWhiteList;
      const map = (this as typeof Settings).extWhiteList = Object.create<boolean>(null);
      if (old) {
        for (const key in old) { if (old[key] === false) { map[key] = false; } }
      }
      if (!val) { return; }
      for (let arr = val.split("\n"), i = arr.length, wordCharRe = /^[\dA-Za-z]/ as RegExpOne; 0 <= --i; ) {
        if ((val = arr[i].trim()) && wordCharRe.test(val)) {
          map[val] = true;
        }
      }
    },
    newTabUrl (url): void {
      url = (<RegExpI>/^\/?pages\/[a-z]+.html\b/i).test(url)
        ? chrome.runtime.getURL(url) : Utils.convertToUrl(url);
      return this.set('newTabUrl_f', url);
    },
    searchEngines (): void {
      return this.set("searchEngineMap", Object.create<Search.Engine>(null));
    },
    searchEngineMap (value: FullSettings["searchEngineMap"]): void {
      "searchKeywords" in this.cache && this.set("searchKeywords", null);
      Utils.parseSearchEngines("~:" + this.get("searchUrl"), value);
      const rules = Utils.parseSearchEngines(this.get("searchEngines"), value);
      return this.set("searchEngineRules", rules);
    },
    searchUrl (str): void {
      if (str) {
        Utils.parseSearchEngines("~:" + str, this.cache.searchEngineMap);
      } else if (str = this.get("newTabUrl_f", true)) {
        return ((this as typeof Settings).updateHooks.newTabUrl_f as (this: void, url_f: string) => void)(str);
      } else {
        str = this.get("searchUrl").split(" ", 1)[0];
        this.get("searchEngineMap", true)["~"] = { name: "~", url: str };
      }
      return (this as typeof Settings).postUpdate("newTabUrl");
    },
    baseCSS (css): void {
      if ("all" in (document.documentElement as HTMLElement).style) {
        css = ".R{" + css.substring(css.indexOf("all:"));
      }
      if (this.CONST.ChromeVersion < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo) {
        css += ".HUD,.IH,.LH{border-width:1px}\n";
      }
      const cacheId = Settings.CONST.CurrentVersion + "," + Settings.CONST.ChromeVersion + ",";
      css = cacheId + css.length + "\n" + css;
      let css2 = this.get("userDefinedCss");
      css2 && (css += "\n" + css2);
      return this.set("innerCSS", css);
    },
    vimSync (value): void {
      if (value || !(this as typeof Settings).Sync.HandleStorageUpdate) { return; }
      chrome.storage.onChanged.removeListener(Settings.Sync.HandleStorageUpdate as SettingsNS.OnSyncUpdate);
      Settings.Sync = { set () {} };
    },
    userDefinedCss (css2): void {
      let css = localStorage.getItem("innerCSS") as string, headEnd = css.indexOf("\n");
      css = css.substring(0, headEnd + 1 + +css.substring(0, headEnd).split(",")[2]);
      this.set("innerCSS", css2 ? css + "\n" + css2 : css);
      const ref = Backend.indexPorts(), request = { name: "showHUD" as "showHUD", CSS: this.cache.innerCSS };
      for (const tabId in ref) {
        const frames = ref[tabId] as Frames.Frames;
        for (let i = frames.length; 0 < --i; ) {
          if (frames[i].sender.flags & Frames.Flags.hasCSS) {
            frames[i].postMessage(request);
          }
        }
      }
    },
    innerCSS (css): void {
      // Note: The line below is allowed as a special use case
      (this.cache as SettingsNS.FullCache).innerCSS = css.substring(css.indexOf("\n") + 1);
    },
    vomnibarPage (url): void {
      if (url === this.defaults.vomnibarPage) {
        url = (this as typeof Settings).CONST.VomnibarPageInner;
      } else if (url.startsWith("front/")) {
        url = chrome.runtime.getURL(url);
      } else {
        url = Utils.convertToUrl(url);
        url = Utils.reformatURL(url);
        if (!url.startsWith("chrome") && this.CONST.ChromeVersion < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
          url = (this as typeof Settings).CONST.VomnibarPageInner;
        } else {
          url = url.replace(":version", "" + parseFloat((this as typeof Settings).CONST.CurrentVersion));
        }
      }
      this.set("vomnibarPage_f", url);
    }
  } as SettingsNS.DeclaredUpdateHookMap & SettingsNS.SpecialUpdateHookMap as SettingsNS.UpdateHookMap,
  fetchFile (file: keyof SettingsNS.CachedFiles, callback?: (this: void) => any): TextXHR | null {
    if (callback && file in this.cache) { callback(); return null; }
    const url = this.CONST.XHRFiles[file];
    if (!url) { throw Error("unknown file: " + file); } // just for debugging
    return Utils.fetchHttpContents(url, function(): void {
      if (file === "baseCSS") {
        Settings.postUpdate(file, this.responseText);
      } else {
        Settings.set(file, this.responseText);
      }
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
    extWhiteList: `# modified { Vomnibar Page, X New Tab, PDF Viewer }
ekohaelnhhdhbccgefjmjpdjoijhojgd
hdnehngglnbnehkfcidabjckinphnief
nacjakoppgmdcpemlfnfegmlhipddanj`,
    findModeRawQueryList: "",
    grabBackFocus: false,
    hideHud: false,
    innerCSS: "",
    keyboard: [500, 33],
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    localeEncoding: "gbk",
    newTabUrl: "",
    newTabUrl_f: "",
    nextPatterns: "\u4e0b\u9875,\u4e0b\u4e00\u9875,\u4e0b\u4e00\u7ae0,\u540e\u4e00\u9875\
,next,more,newer,>,\u203a,\u2192,\xbb,\u226b,>>",
    previousPatterns: "\u4e0a\u9875,\u4e0a\u4e00\u9875,\u4e0a\u4e00\u7ae0,\u524d\u4e00\u9875\
,prev,previous,back,older,<,\u2039,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: "https://www.baidu.com/s?ie=utf-8&wd=%s Baidu",
    searchEngines: `b|ba|baidu: https://www.baidu.com/s?ie=utf-8&wd=%s Baidu
bi|bing: https://www.bing.com/search?q=%s Bing
g|go|gg|google: https://www.google.com/search?q=%s Google
js\\:|Js: javascript:\\ $S; Javascript
w|wiki:\\\n  https://www.wikipedia.org/w/index.php?search=%s Wikipedia

# More examples.
#
# (Vimium++ supports search completion Google, Wikipedia,
# and so on, as above, and for these.)
#
# l: https://www.google.com/search?q=%s&btnI I'm feeling lucky
# y: https://www.youtube.com/results?search_query=%s Youtube
# gm: https://www.google.com/maps?q=%s Google maps
# d: https://duckduckgo.com/?q=%s DuckDuckGo
# az: https://www.amazon.com/s/?field-keywords=%s Amazon
# qw: https://www.qwant.com/?q=%s Qwant`,
    searchEngineMap: {}, // may be modified, but this action is safe
    showActionIcon: true,
    showAdvancedCommands: false,
    showAdvancedOptions: false,
    smoothScroll: true,
    userDefinedCss: "",
    vimSync: false,
    vomnibarPage: ""
  } as Readonly<SettingsWithDefaults> & SafeObject,
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent: { __proto__: null as never,
    baseCSS: 1, exclusionTemplate: 1, helpDialog: 1,
    searchEngineMap: 1, searchEngineRules: 1, searchKeywords: 1, vomnibarPage_f: 1
  } as TypedSafeEnum<SettingsNS.NonPersistentSettings>,
  frontUpdateAllowed: { __proto__: null as never,
    showAdvancedCommands: 1
  } as TypedSafeEnum<SettingsNS.FrontUpdateAllowedSettings>,
  icons: [
    { "19": "/icons/enabled_19.png", "38": "/icons/enabled_38.png" },
    { "19": "/icons/partial_19.png", "38": "/icons/partial_38.png" },
    { "19": "/icons/disabled_19.png", "38": "/icons/disabled_38.png" }
  ] as [IconNS.PathBuffer, IconNS.PathBuffer, IconNS.PathBuffer],
  valuesToLoad: ["deepHints", "keyboard", "linkHintCharacters" //
    , "regexFindMode", "scrollStepSize", "smoothScroll" //
  ] as ReadonlyArray<keyof SettingsNS.FrontendSettings>,
  Sync: {
    set: function() {}
  } as SettingsNS.Sync,
  CONST: {
    AllowClipboardRead: true,
    BaseCSSLength: 0,
    BrowserNewTab: "about:newtab",
    BrowserNewTab2: "chrome://newtab",
    // note: if changed, ../pages/newtab.js also needs change.
    ChromeInnerNewTab: "chrome-search://local-ntp/local-ntp.html", // should keep lower case
    DisallowIncognito: false,
    VimiumNewTab: "",
    ChromeVersion: BrowserVer.MinSupported,
    ContentScripts: null as never as string[],
    CurrentVersion: "", CurrentVersionName: "",
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
    InjectEnd: "content/inject_end.js",
    OptionsPage: "pages/options.html", Platform: "", PolyFill: "lib/polyfill.js",
    RedirectedUrls: {
      about: "https://github.com/gdh1995/vimium-plus",
      help: "https://github.com/philc/vimium/wiki",
      license: "https://raw.githubusercontent.com/gdh1995/vimium-plus/master/LICENSE.txt",
      permissions: "https://github.com/gdh1995/vimium-plus/blob/master/PRIVACY-POLICY.md#permissions-required",
      policy: "https://github.com/gdh1995/vimium-plus/blob/master/PRIVACY-POLICY.md",
      popup: "options.html",
      privacy: "https://github.com/gdh1995/vimium-plus/blob/master/PRIVACY-POLICY.md#privacy-policy",
      readme: "https://github.com/gdh1995/vimium-plus#readme",
      settings: "options.html",
      __proto__: null as never
    } as SafeDict<string>,
    GlobalCommands: null as never as string[],
    ShowPage: "pages/show.html",
    VomnibarPageInner: "front/vomnibar.html", VomnibarScript: "front/vomnibar.js", VomnibarScript_f: ""
  }
};

Settings.CONST.ChromeVersion = 0 | (navigator.appVersion.match(/\bChrom(?:e|ium)\/(\d+)/)
  || [0, BrowserVer.assumedVer])[1] as number;
Settings.bufferToLoad.onMac = false;
Settings.bufferToLoad.grabFocus = Settings.get("grabBackFocus");
Settings.bufferToLoad.browserVer = Settings.CONST.ChromeVersion;
chrome.runtime.getPlatformInfo(function(info): void {
  const os = (info.os || "").toLowerCase(), types = chrome.runtime.PlatformOs;
  Settings.CONST.Platform = os;
  Settings.bufferToLoad.onMac = os === (types ? types.MAC : "mac");
});

(function(): void {
  const ref = chrome.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  urls = ref.chrome_url_overrides, ref2 = ref.content_scripts[0].js,
  { CONST: obj } = Settings, ref3 = Settings.newTabs as SafeDict<Urls.NewTabType>;
  let newtab = urls && urls.newtab;
  function func(path: string): string {
    return (path.charCodeAt(0) === KnownKey.slash ? origin : prefix) + path;
  }
  (Settings.defaults as SettingsWithDefaults).vomnibarPage = obj.VomnibarPageInner;
  (Settings.defaults as SettingsWithDefaults).newTabUrl = newtab ? obj.ChromeInnerNewTab : obj.BrowserNewTab;
  ref3[obj.BrowserNewTab] = ref3[obj.BrowserNewTab2] = Urls.NewTabType.browser;
  newtab && (ref3[func(obj.VimiumNewTab = newtab)] = Urls.NewTabType.vimium);
  obj.GlobalCommands = Object.keys(ref.commands || {}).map(i => i === "quickNext" ? "nextTab" : i);
  obj.CurrentVersion = ref.version;
  obj.CurrentVersionName = ref.version_name || ref.version;
  obj.OptionsPage = func(ref.options_page || obj.OptionsPage);
  obj.AllowClipboardRead = ref.permissions != null && ref.permissions.indexOf("clipboardRead") >= 0;
  obj.ShowPage = func(obj.ShowPage);
  obj.VomnibarPageInner = func(obj.VomnibarPageInner);
  obj.VomnibarScript_f = func(obj.VomnibarScript);
  ref2[ref2.length - 1] = obj.InjectEnd;
  if ("".startsWith.name !== "startsWith") {
    ref2.unshift(obj.PolyFill);
  }
  obj.ContentScripts = ref2.map(func);

  const innerCSS = localStorage.getItem("innerCSS");
  if (innerCSS) {
    const cacheId = obj.CurrentVersion + "," + Settings.CONST.ChromeVersion + ",";
    if (innerCSS.startsWith(cacheId)) {
      Settings.postUpdate("innerCSS", innerCSS);
      return;
    }
  }
  Settings.fetchFile("baseCSS");
})();
