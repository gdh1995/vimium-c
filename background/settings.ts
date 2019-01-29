import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;

var Settings = {
  cache: Object.create(null) as Readonly<SettingsNS.FullCache>,
  temp: {
    cmdErrors: 0,
    shownHash: null
  } as Writeable<SettingsTmpl["temp"]>,
  payload: Object.create(null) as SettingsNS.FrontendSettingCache & SafeObject,
  newTabs: Object.create(null) as SafeDict<Urls.NewTabType>,
  extWhiteList_: null as never as SafeDict<boolean>,
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
    if (!(key in this.nonPersistent_)) {
      const initial = this.defaults[key as keyof SettingsNS.PersistentSettings];
      if (value === initial) {
        localStorage.removeItem(key);
        this.sync_(key as keyof SettingsNS.PersistentSettings, null);
      } else {
        localStorage.setItem(key, typeof initial === "string" ? value as string : JSON.stringify(value));
        this.sync_(key as keyof SettingsNS.PersistentSettings, value as
          FullSettings[keyof SettingsNS.PersistentSettings]);
      }
    }
    let ref: SettingsNS.UpdateHook<K> | undefined;
    if (ref = this.updateHooks_[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(this, value, key);
    }
  },
  postUpdate_: function<K extends keyof SettingsWithDefaults> (this: SettingsTmpl, key: K, value?: FullSettings[K]): void {
    return ((this as typeof Settings).updateHooks_[key] as SettingsNS.UpdateHook<K>).call(this,
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
      const frames = ref[+tabId] as Frames.Frames;
      for (let i = frames.length; 0 < --i; ) {
        frames[i].postMessage(request);
      }
    }
  },
  buildPayload_ (): void {
    const ref = (this as typeof Settings).valuesToLoad_, ref2 = this.payload;
    for (let _i = ref.length; 0 <= --_i;) {
      let key = ref[_i];
      ref2[key] = this.get(key);
    }
  },
  updateHooks_: {
    __proto__: null as never,
    grabBackFocus (value: FullSettings["grabBackFocus"]): void {
      (this as typeof Settings).payload.grabFocus = value;
    },
    extWhiteList (val): void {
      const old = (this as typeof Settings).extWhiteList_;
      const map = (this as typeof Settings).extWhiteList_ = Object.create<boolean>(null);
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
    newTabUrl (this: SettingsTmpl, url): void {
      url = (<RegExpI>/^\/?pages\/[a-z]+.html\b/i).test(url)
        ? chrome.runtime.getURL(url) : Utils.convertToUrl(url);
      return this.set('newTabUrl_f', url);
    },
    searchEngines (): void {
      return this.set("searchEngineMap", Object.create<Search.Engine>(null));
    },
    searchEngineMap (value: FullSettings["searchEngineMap"]): void {
      "searchKeywords" in this.cache && this.set("searchKeywords", null);
      // Note: this requires `searchUrl` must be a valid URL
      const rules = Utils.parseSearchEngines("~:" + this.get("searchUrl") + "\n" + this.get("searchEngines"), value);
      return this.set("searchEngineRules", rules);
    },
    searchUrl (str): void {
      if (str) {
        Utils.parseSearchEngines("~:" + str, this.cache.searchEngineMap);
      } else {
        (this.cache as any).searchEngineMap = { "~": { name: "~", url: this.get("searchUrl").split(" ", 1)[0] } };
        (this.cache as any).searchEngineRules = [];
        if (str = this.get("newTabUrl_f", true)) {
          return ((this as typeof Settings).updateHooks_.newTabUrl_f as (this: void, url_f: string) => void)(str);
        }
      }
      return (this as typeof Settings).postUpdate_("newTabUrl");
    },
    baseCSS (this: SettingsTmpl, css): void {
      const cacheId = (this as typeof Settings).CONST.StyleCacheId_,
      browserVer = this.CONST.ChromeVersion,
      browserInfo = cacheId.substring(cacheId.indexOf(",") + 1),
      findOffset = css.lastIndexOf("/*Find*/"),
      findCSS = css.substring(findOffset + /* '/*Find*\/\n' */ 9),
      hasAll = browserInfo.lastIndexOf("a") >= 0;
      css = css.substring(0, findOffset - /* `\n` */ 1);
      if (hasAll) {
        const ind2 = css.indexOf("all:"), ind1 = css.lastIndexOf("{", ind2);
        css = css.substring(0, ind1 + 1) + css.substring(ind2);
      } else {
        css = css.replace(<RegExpOne> /all:\s?initial;?\n?/, "");
      }
      if (browserVer >= BrowserVer.MinEnsuredDisplayContents && OnOther !== BrowserType.Edge) {
        const ind2 = css.indexOf("display:"), ind1 = css.lastIndexOf("{", ind2);
        css = css.substring(0, ind1 + 1) + css.substring(ind2);
      } else {
        css = css.replace("contents", "unset");
      }
      if (browserVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo) {
        css += "\n.HUD,.IH,.LH{border-width:1px}";
      }
      if (browserVer < BrowserVer.MinUnprefixedUserSelect) {
        css = css.replace(<RegExpG> /user-select\b/g, "-webkit-$&");
      }
      if (browserVer >= BrowserVer.MinSpecCompliantShadowBlurRadius) {
        css = css.replace("3px 7px", "3px 5px");
      }
      if (browserInfo.lastIndexOf("s") < 0) {
        // Note: &vimium.min.css: this requires `:host{` is at the beginning
        const hostEnd = css.indexOf("}") + 1, secondEnd = css.indexOf("}", hostEnd) + 1,
        prefix = "#VimiumUI";
        let body = css.substring(secondEnd);
        if (hasAll) {
          body = body.replace(<RegExpG> /\b[IL]H\s?\{/g, "$&all:inherit;");
        }
        body += `\n${prefix}:before,${prefix}:after,.R:before,.R:after{display:none!important}`;
        css = prefix + css.substring(5, hostEnd) +
          // Note: &vimium.min.css: this requires no ID/attr selectors in base styles
          body.replace(<RegExpG> /\.[A-Z]/g, `${prefix} $&`);
      }
      css = cacheId + css.length + "\n" + css;
      let css2 = this.get("userDefinedCss");
      css2 && (css += "\n" + css2);
      localStorage.setItem("findCSS", findCSS);
      return this.set("innerCSS", css);
    },
    userDefinedCss (this: SettingsTmpl, css2): void {
      let css = localStorage.getItem("innerCSS") as string, headEnd = css.indexOf("\n");
      css = css.substring(0, headEnd + 1 + +css.substring(0, headEnd).split(",")[2]);
      this.set("innerCSS", css2 ? css + "\n" + css2 : css);
      const ref = Backend.indexPorts(), request: Req.bg<kBgReq.showHUD> = { N: kBgReq.showHUD, S: this.cache.innerCSS };
      for (const tabId in ref) {
        const frames = ref[+tabId] as Frames.Frames;
        for (let i = frames.length; 0 < --i; ) {
          if (frames[i].s.f & Frames.Flags.hasCSS) {
            frames[i].postMessage(request);
          }
        }
      }
    },
    innerCSS (this: SettingsTmpl, css): void {
      const findCSS = localStorage.getItem("findCSS");
      if (!findCSS) { Settings.fetchFile("baseCSS"); return; }
      const index = findCSS.indexOf('\n');
      // Note: The lines below are allowed as a special use case
      (this.cache as SettingsNS.FullCache).innerCSS = css.substring(css.indexOf("\n") + 1);
      (this.cache as SettingsNS.FullCache).findCSS = [findCSS.substring(0, index), findCSS.substring(index + 1)];
    },
    vomnibarPage (this: SettingsTmpl, url): void {
      if (url === this.defaults.vomnibarPage) {
        url = (this as typeof Settings).CONST.VomnibarPageInner_;
      } else if (url.startsWith("front/")) {
        url = chrome.runtime.getURL(url);
      } else {
        url = Utils.convertToUrl(url);
        url = Utils.reformatURL_(url);
        if (!url.startsWith(BrowserProtocol) && this.CONST.ChromeVersion < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
          url = (this as typeof Settings).CONST.VomnibarPageInner_;
        } else {
          url = url.replace(":version", "" + parseFloat((this as typeof Settings).CONST.VerCode));
        }
      }
      this.set("vomnibarPage_f", url);
    }
  } as SettingsNS.DeclaredUpdateHookMap & SettingsNS.SpecialUpdateHookMap as SettingsNS.UpdateHookMap,
  fetchFile (file: keyof SettingsNS.CachedFiles, callback?: (this: void) => any): TextXHR | null {
    if (callback && file in this.cache) { callback(); return null; }
    const url = this.CONST.XHRFiles_[file];
    if (!url) { throw Error("unknown file: " + file); } // just for debugging
    return Utils.fetchHttpContents_(url, function(): void {
      if (file === "baseCSS") {
        Settings.postUpdate_(file, this.responseText);
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
    findCSS: null as never as FullSettings["findCSS"],
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
    searchUrl: navigator.language.startsWith("zh") ? "https://www.baidu.com/s?ie=utf-8&wd=%s Baidu"
      : "https://www.google.com/search?q=%s Google",
    searchEngines: `b|ba|baidu: https://www.baidu.com/s?ie=utf-8&wd=%s Baidu
bi|bing: https://www.bing.com/search?q=%s Bing
g|go|gg|google: https://www.google.com/search?q=%s Google
js\\:|Js: javascript:\\ $S; Javascript
w|wiki:\\\n  https://www.wikipedia.org/w/index.php?search=%s Wikipedia

# More examples.
#
# (Vimium C supports search completion Google, Wikipedia,
# and so on, as above, and for these.)
#
# l: https://www.google.com/search?q=%s&btnI I'm feeling lucky
# y: https://www.youtube.com/results?search_query=%s Youtube
# gm: https://www.google.com/maps?q=%s Google maps
# d: https://duckduckgo.com/?q=%s DuckDuckGo
# az: https://www.amazon.com/s/?field-keywords=%s Amazon
# qw: https://www.qwant.com/?q=%s Qwant`,
    searchEngineMap: {},
    showActionIcon: true,
    showAdvancedCommands: false,
    showAdvancedOptions: false,
    smoothScroll: true,
    userDefinedCss: "",
    vimSync: null,
    vomnibarPage: ""
  } as Readonly<SettingsWithDefaults> & SafeObject,
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent_: { __proto__: null as never,
    baseCSS: 1, exclusionTemplate: 1, helpDialog: 1,
    searchEngineMap: 1, searchEngineRules: 1, searchKeywords: 1, vomnibarPage_f: 1
  } as TypedSafeEnum<SettingsNS.NonPersistentSettings>,
  frontUpdateAllowed_: { __proto__: null as never,
    showAdvancedCommands: 1
  } as TypedSafeEnum<SettingsNS.FrontUpdateAllowedSettings>,
  icons_: [
    { "19": "/icons/enabled_19.png", "38": "/icons/enabled_38.png" },
    { "19": "/icons/partial_19.png", "38": "/icons/partial_38.png" },
    { "19": "/icons/disabled_19.png", "38": "/icons/disabled_38.png" }
  ] as [IconNS.PathBuffer, IconNS.PathBuffer, IconNS.PathBuffer],
  valuesToLoad_: ["deepHints", "keyboard", "linkHintCharacters" //
    , "regexFindMode", "scrollStepSize", "smoothScroll" //
  ] as ReadonlyArray<keyof SettingsNS.FrontendSettings>,
  sync_: function (): void {} as SettingsNS.Sync["set"],
  CONST: {
    AllowClipboardRead_: true,
    BaseCSSLength_: 0,
    // should keep lower case
    NtpNewTab_: "chrome-search://local-ntp/local-ntp.html",
    DisallowIncognito_: false,
    VimiumNewTab: "",
    ChromeVersion: BrowserVer.MinSupported,
    ContentScripts_: null as never as string[],
    VerCode: "", VerName: "",
    StyleCacheId_: "",
    KnownPages_: ["blank", "newtab", "options", "show"],
    MathParser: "/lib/math_parser.js",
    HelpDialog: "/background/help_dialog.js",
    Commands: "/background/commands.js",
    Exclusions: "/background/exclusions.js",
    XHRFiles_: {
      baseCSS: "/front/vimium.min.css",
      exclusionTemplate: "/front/exclusions.html",
      helpDialog: "/front/help_dialog.html"
    },
    InjectEnd_: "content/injected_end.js",
    OptionsPage: "pages/options.html", Platform: "", PolyFill_: "lib/polyfill.js",
    RedirectedUrls_: {
      about: "https://github.com/gdh1995/vimium-c",
      help: "https://github.com/gdh1995/vimium-c/wiki",
      license: "https://raw.githubusercontent.com/gdh1995/vimium-c/master/LICENSE.txt",
      permissions: "https://github.com/gdh1995/vimium-c/blob/master/PRIVACY-POLICY.md#permissions-required",
      policy: "https://github.com/gdh1995/vimium-c/blob/master/PRIVACY-POLICY.md",
      popup: "options.html",
      privacy: "https://github.com/gdh1995/vimium-c/blob/master/PRIVACY-POLICY.md#privacy-policy",
      readme: "https://github.com/gdh1995/vimium-c#readme",
      settings: "options.html",
      wiki: "https://github.com/gdh1995/vimium-c/wiki",
      __proto__: null as never
    } as SafeDict<string>,
    GlobalCommands: null as never as string[],
    ShowPage_: "pages/show.html",
    VomnibarPageInner_: "front/vomnibar.html", VomnibarScript_: "front/vomnibar.js", VomnibarScript_f_: ""
  }
};

Settings.CONST.ChromeVersion = 0 | (!OnOther && navigator.appVersion.match(/\bChrom(?:e|ium)\/(\d+)/)
  || [0, BrowserVer.assumedVer])[1] as number;
Settings.payload.onMac = false;
Settings.payload.grabFocus = Settings.get("grabBackFocus");
Settings.payload.browser = OnOther;
Settings.payload.browserVer = Settings.CONST.ChromeVersion;
chrome.runtime.getPlatformInfo ? chrome.runtime.getPlatformInfo(function(info): void {
  const os = (info.os || "").toLowerCase(), types = chrome.runtime.PlatformOs;
  Settings.CONST.Platform = os;
  Settings.payload.onMac = os === (types ? types.MAC : "mac");
}) : (Settings.CONST.Platform = OnOther === BrowserType.Edge ? "win" : "unknown");

(function(): void {
  const ref = chrome.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  urls = ref.chrome_url_overrides, ref2 = ref.content_scripts[0].js,
  { CONST: obj, defaults } = Settings, newtab = urls && urls.newtab,
  // on Edge, https://www.msn.cn/spartan/ntp also works with some complicated search parameters
  // on Firefox, both "about:newtab" and "about:home" work,
  //   but "about:newtab" skips extension hooks and uses last configured URL, so it's better.
  CommonNewTab = OnOther === BrowserType.Edge ? "about:home" : "about:newtab", ChromeNewTab = "chrome://newtab",
  ref3 = Settings.newTabs as SafeDict<Urls.NewTabType>;
  function func(path: string): string {
    return (path.charCodeAt(0) === KnownKey.slash ? origin : path.startsWith(prefix) ? "" : prefix) + path;
  }
  (defaults as SettingsWithDefaults).newTabUrl = OnOther ? CommonNewTab : newtab ? obj.NtpNewTab_ : ChromeNewTab;
  ref3[CommonNewTab] = newtab ? Urls.NewTabType.vimium : Urls.NewTabType.browser;
  OnOther || (ref3[ChromeNewTab] = newtab ? Urls.NewTabType.vimium : Urls.NewTabType.browser);
  newtab && (ref3[func(obj.VimiumNewTab = newtab)] = Urls.NewTabType.vimium);
  (defaults as SettingsWithDefaults).vomnibarPage = obj.VomnibarPageInner_;
  obj.GlobalCommands = Object.keys(ref.commands || {}).map(i => i === "quickNext" ? "nextTab" : i);
  obj.VerCode = ref.version;
  obj.VerName = ref.version_name || ref.version;
  obj.OptionsPage = func(ref.options_page || obj.OptionsPage);
  obj.AllowClipboardRead_ = ref.permissions != null && ref.permissions.indexOf("clipboardRead") >= 0;
  obj.ShowPage_ = func(obj.ShowPage_);
  obj.VomnibarPageInner_ = func(obj.VomnibarPageInner_);
  obj.VomnibarScript_f_ = func(obj.VomnibarScript_);
  ref2.push(obj.InjectEnd_);
  if ("".startsWith.name !== "startsWith") {
    ref2.unshift(obj.PolyFill_);
  }
  obj.ContentScripts_ = ref2.map(func);

  const hasAll = "all" in (document.documentElement as HTMLElement).style;
  obj.StyleCacheId_ = obj.VerCode + "," + Settings.CONST.ChromeVersion
    + (window.ShadowRoot ? "s" : "") + (hasAll ? "a" : "") + ",";
  const innerCSS = localStorage.getItem("innerCSS");
  if (innerCSS && innerCSS.startsWith(obj.StyleCacheId_)) {
    Settings.postUpdate_("innerCSS", innerCSS);
    return;
  }
  Settings.fetchFile("baseCSS");
})();
