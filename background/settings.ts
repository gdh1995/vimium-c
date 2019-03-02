import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;

var Settings = {
  cache_: Object.create(null) as Readonly<SettingsNS.FullCache>,
  temp_: {
    onInstall_: null as Parameters<chrome.runtime.RuntimeInstalledEvent["addListener"]>[0] | null,
    cmdErrors_: 0,
    shownHash_: null as ((this: void) => string) | null
  },
  payload_: {
    __proto__: null as never,
    browser_: OnOther,
    browserVer_: ChromeVer,
    grabBackFocus_: false,
    onMac_: false
  } as SettingsNS.FrontendSettingCache & SafeObject,
  newTabs_: Object.create(null) as SafeDict<Urls.NewTabType>,
  extWhiteList_: null as never as SafeDict<boolean>,
  get_<K extends keyof SettingsWithDefaults> (key: K, forCache?: boolean): SettingsWithDefaults[K] {
    if (key in this.cache_) {
      return (this.cache_ as SettingsWithDefaults)[key];
    }
    const initial = this.defaults_[key], str = localStorage.getItem(key);
    const value = str == null ? initial : typeof initial === "string" ? str
        : initial === false || initial === true ? str === "true"
        : JSON.parse<typeof initial>(str);
    forCache && ((this.cache_ as SettingsNS.FullCache)[key] = value);
    return value;
  },
  set_<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void {
    (this.cache_ as SettingsNS.FullCache)[key] = value;
    if (!(key in this.nonPersistent_)) {
      const initial = this.defaults_[key as keyof SettingsNS.PersistentSettings];
      if (value === initial) {
        localStorage.removeItem(key);
        this.sync_(key as keyof SettingsNS.PersistentSettings, null);
      } else {
        localStorage.setItem(key, typeof initial === "string" ? value as string : JSON.stringify(value));
        this.sync_(key as keyof SettingsNS.PersistentSettings, value as
          FullSettings[keyof SettingsNS.PersistentSettings]);
      }
      if (key in this.payload_) {
        this.payload_[key as keyof SettingsNS.FrontendSettings] =
          value as FullSettings[keyof SettingsNS.FrontendSettings];
      }
    }
    let ref: SettingsNS.UpdateHook<K> | undefined;
    if (ref = this.updateHooks_[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(this, value, key);
    }
  },
  postUpdate_: function<K extends keyof SettingsWithDefaults> (this: {}, key: K, value?: FullSettings[K]): void {
    return ((this as typeof Settings).updateHooks_[key] as SettingsNS.UpdateHook<K>).call(this as typeof Settings,
      value !== undefined ? value : (this as typeof Settings).get_(key), key);
  } as {
    <K extends keyof SettingsNS.NullableUpdateHookMap>(key: K, value?: FullSettings[K] | null): void;
    <K extends keyof SettingsNS.SpecialUpdateHookMap>(key: K, value: null): void;
    <K extends keyof SettingsNS.EnsuredUpdateHookMaps>(key: K, value?: FullSettings[K]): void;
    <K extends keyof SettingsWithDefaults>(key: K, value?: FullSettings[K]): void;
  },
  broadcast_<K extends keyof BgReq> (request: Req.bg<K>): void {
    const ref = Backend.indexPorts_();
    for (const tabId in ref) {
      const frames = ref[+tabId] as Frames.Frames;
      for (let i = frames.length; 0 < --i; ) {
        frames[i].postMessage(request);
      }
    }
  },
  parseCustomCSS_ (css: string): SettingsNS.ParsedCustomCSS {
    const arr = css ? css.split(<RegExpG & RegExpSearchable<1>> /\/\*\s?#!?([A-Za-z]+)\s?\*\//g) : [""];
    const map: SettingsNS.ParsedCustomCSS = { ui: arr[0].trim() };
    for (let i = 1; i < arr.length; i += 2) {
      let key = arr[i].toLowerCase();
      map[key === "vomnibar" ? "omni" : key as "ui" | "find"] = arr[i + 1].trim();
    }
    return map;
  },
  updateHooks_: {
    __proto__: null as never,
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
    grabBackFocus (this: {}, value: FullSettings["grabBackFocus"]): void {
      (this as typeof Settings).payload_.grabBackFocus_ = value;
    },
    newTabUrl (this: {}, url): void {
      url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(url)
        ? chrome.runtime.getURL(url) : Utils.convertToUrl_(url);
      return (this as typeof Settings).set_("newTabUrl_f", url);
    },
    searchEngines (this: {}): void {
      return (this as typeof Settings).set_("searchEngineMap", Object.create<Search.Engine>(null));
    },
    searchEngineMap (this: {}, value: FullSettings["searchEngineMap"]): void {
      const a = this as typeof Settings;
      "searchKeywords" in a.cache_ && a.set_("searchKeywords", null);
      // Note: this requires `searchUrl` must be a valid URL
      const rules = Utils.parseSearchEngines_("~:" + a.get_("searchUrl") + "\n" + a.get_("searchEngines"), value);
      return a.set_("searchEngineRules", rules);
    },
    searchUrl (str): void {
      const cache = (this as typeof Settings).cache_ as Writeable<typeof Settings.cache_>;
      if (str) {
        Utils.parseSearchEngines_("~:" + str, cache.searchEngineMap);
      } else {
        const initialMap: { "~": Search.Engine } = {
          "~": { name: "~", blank: "", url: (this as typeof Settings).get_("searchUrl").split(" ", 1)[0] }
        };
        cache.searchEngineMap = initialMap as SafeObject & typeof initialMap;
        cache.searchEngineRules = [];
        if (str = (this as typeof Settings).get_("newTabUrl_f", true)) {
          return ((this as typeof Settings).updateHooks_.newTabUrl_f as (this: void, url_f: string) => void)(str);
        }
      }
      return (this as typeof Settings).postUpdate_("newTabUrl");
    },
    baseCSS (this: {}, css): void {
      const cacheId = (this as typeof Settings).CONST_.StyleCacheId_,
      browserVer = ChromeVer,
      browserInfo = cacheId.substring(cacheId.indexOf(",") + 1),
      hasAll = browserInfo.lastIndexOf("a") >= 0;
      if (browserVer < BrowserVer.MinUnprefixedUserSelect || OnOther === BrowserType.Firefox) {
        css = css.replace(<RegExpG> /user-select\b/g, "-webkit-$&");
      }
      const findOffset = css.lastIndexOf("/*#find*/");
      let findCSS = css.substring(findOffset + /* '/*#find*\/\n' */ 10);
      css = css.substring(0, findOffset - /* `\n` */ 1);
      if (hasAll) {
        // Note: must not move "all:" into ":host" even when "s" and >= MinSelector$deep$InDynamicCSSMeansNothing
        // in case that ":host" is set [style="all:unset"]
        const ind2 = css.indexOf("all:"), ind1 = css.lastIndexOf("{", ind2),
        ind3 = browserVer >= BrowserVer.MinEnsuredSafeInnerCSS ? css.indexOf(";", ind2) : css.length;
        css = css.substring(0, ind1 + 1) + css.substring(ind2, ind3 + 1)
            + css.substring(css.indexOf("\n", ind3) + 1 || css.length);
      } else {
        css = css.replace(<RegExpOne> /all:\s?initial;?\n?/, "");
      }
      if (browserVer >= BrowserVer.MinEnsuredDisplayContents && OnOther !== BrowserType.Edge) {
        const ind2 = css.indexOf("display:"), ind1 = css.lastIndexOf("{", ind2);
        css = css.substring(0, ind1 + 1) + css.substring(ind2);
      } else {
        css = css.replace("contents", "block");
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
      const css2 = (this as typeof Settings).parseCustomCSS_((this as typeof Settings).get_("userDefinedCss"));
      css2.ui && (css += "\n" + css2.ui);
      if (browserVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo) {
        css = css.replace(<RegExpG> /\b(border(?:-\w*-?width)?: ?)(0\.5px|\S+.\/\*!DPI\*\/)/g, "$11px \/\*!DPI\*\/");
      }
      localStorage.setItem("findCSS", findCSS.length + "\n" + findCSS + (css2.find ? "\n" + css2.find : ""));
      localStorage.setItem("omniCSS", css2.omni || "");
      return (this as typeof Settings).set_("innerCSS", css);
    },
    userDefinedCss (this: {}, css2Str): void {
      let css = localStorage.getItem("innerCSS") as string, headEnd = css.indexOf("\n");
      css = css.substring(0, headEnd + 1 + +css.substring(0, headEnd).split(",")[2]);
      const css2 = (this as typeof Settings).parseCustomCSS_(css2Str);
      let innerCSS = css2.ui ? css + "\n" + css2.ui : css;
      {
        css = localStorage.getItem("findCSS") as string;
        headEnd = css.indexOf("\n");
        css = css.slice(0, headEnd + 1 + +css.substring(0, headEnd));
        let find2 = css2.find;
        localStorage.setItem("findCSS", find2 ? css + "\n" + find2 : css);
        localStorage.setItem("omniCSS", css2.omni || "");
      }
      (this as typeof Settings).set_("innerCSS", innerCSS);
      const cache = (this as typeof Settings).cache_;
      innerCSS = cache.innerCSS;
      const ref = Backend.indexPorts_(), request: Req.bg<kBgReq.showHUD> = {
        N: kBgReq.showHUD, S: innerCSS, f: cache.findCSS_
      };
      for (const tabId in ref) {
        const frames = ref[+tabId] as Frames.Frames;
        for (let i = frames.length; 0 < --i; ) {
          const status = frames[i].s;
          if (status.f & Frames.Flags.hasCSS) {
            frames[i].postMessage(request);
            status.f |= Frames.Flags.hasFindCSS;
          }
        }
      }
      const request2: Req.bg<kBgReq.showHUD> & BgCSSReq = { N: kBgReq.showHUD, S: cache.omniCSS_ };
      for (const frame of Backend.indexPorts_(GlobalConsts.VomnibarFakeTabId)) {
        frame.postMessage(request2);
      }
    },
    innerCSS (this: {}, css): void {
      const storage = localStorage, cache = (this as typeof Settings).cache_ as Writeable<typeof Settings.cache_>;
      let findCSS = storage.getItem("findCSS"), omniCSS = storage.getItem("omniCSS");
      if (!findCSS || omniCSS == null) { Settings.fetchFile_("baseCSS"); return; }
      findCSS = findCSS.substring(findCSS.indexOf("\n") + 1);
      const index = findCSS.indexOf("}") + 1, index2 = findCSS.indexOf("\n", index);
      // Note: The lines below are allowed as a special use case
      cache.innerCSS = css.substring(css.indexOf("\n") + 1);
      cache.findCSS_ = [findCSS.substring(0, index), findCSS.substring(index, index2), findCSS.substring(index2 + 1)];
      cache.omniCSS_ = omniCSS;
    },
    vomnibarPage (this: {}, url): void {
      if (url === (this as typeof Settings).defaults_.vomnibarPage) {
        url = (this as typeof Settings).CONST_.VomnibarPageInner_;
      } else if (url.startsWith("front/")) {
        url = chrome.runtime.getURL(url);
      } else {
        url = Utils.convertToUrl_(url);
        url = Utils.reformatURL_(url);
        if (!url.startsWith(BrowserProtocol) && ChromeVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
          url = (this as typeof Settings).CONST_.VomnibarPageInner_;
        } else {
          url = url.replace(":version", "" + parseFloat((this as typeof Settings).CONST_.VerCode_));
        }
      }
      (this as typeof Settings).set_("vomnibarPage_f", url);
    }
  } as SettingsNS.DeclaredUpdateHookMap & SettingsNS.SpecialUpdateHookMap as SettingsNS.UpdateHookMap,
  fetchFile_ (file: keyof SettingsNS.CachedFiles, callback?: (this: void) => any): TextXHR | null {
    if (callback && file in this.cache_) { callback(); return null; }
    const url = this.CONST_.XHRFiles_[file];
    if (!url) { throw Error("unknown file: " + file); } // just for debugging
    return Utils.fetchHttpContents_(url, function (): void {
      if (file === "baseCSS") {
        Settings.postUpdate_(file, this.responseText);
      } else {
        Settings.set_(file, this.responseText);
      }
      callback && callback();
      return;
    });
  },
  // clear localStorage & sync, if value === @defaults[key]
  // the default of all nullable fields must be set to null for compatibility with @Sync.set
  defaults_: {
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
    searchUrl: navigator.language.startsWith("zh") ? "https://www.baidu.com/s?ie=utf-8&wd=%s \u767e\u5ea6"
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
    vomnibarPage: "front/vomnibar.html",
    phraseBlacklist: ""
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
    { 19: "/icons/enabled_19.png", 38: "/icons/enabled_38.png" },
    { 19: "/icons/partial_19.png", 38: "/icons/partial_38.png" },
    { 19: "/icons/disabled_19.png", 38: "/icons/disabled_38.png" }
  ] as [IconNS.PathBuffer, IconNS.PathBuffer, IconNS.PathBuffer],
  valuesToLoad_: [
    /** required in {@link main.ts#BackgroundCommands[kBgCmd.toggle]}: must be the first element */
    , "deepHints", "keyboard", "linkHintCharacters" //
    , "regexFindMode", "scrollStepSize", "smoothScroll" //
  ] as ReadonlyArray<keyof SettingsNS.FrontendSettings>,
  sync_: Utils.blank_ as SettingsNS.Sync["set"],
  CONST_: {
    AllowClipboardRead_: true,
    BaseCSSLength_: 0,
    // should keep lower case
    NtpNewTab_: "chrome-search://local-ntp/local-ntp.html",
    DisallowIncognito_: false,
    VimiumNewTab_: "",
    ContentScripts_: null as never as string[],
    VerCode_: "", VerName_: "",
    StyleCacheId_: "",
    KnownPages_: ["blank", "newtab", "options", "show"],
    MathParser: "/lib/math_parser.js",
    HelpDialog: "/background/help_dialog.js",
    Commands: "/background/commands.js",
    Exclusions: "/background/exclusions.js",
    XHRFiles_: {
      baseCSS: "/front/vimium.min.css",
      exclusionTemplate: "/front/exclusions.html",
      helpDialog: "/front/help_dialog.html",
    } as { [name in keyof SettingsNS.CachedFiles]: string },
    WordsRe_: "/front/words.txt",
    InjectEnd_: "content/injected_end.js",
    NewTabForNewUser_: "pages/options.html#!newTabUrl",
    OptionsPage_: "pages/options.html", Platform_: "browser", PolyFill_: "lib/polyfill.js",
    HomePage_: "https://github.com/gdh1995/vimium-c",
    RedirectedUrls_: {
      about: "",
      changelog: "#release-notes",
      help: "/wiki",
      home: "",
      license: "/blob/master/LICENSE.txt",
      permissions: "/blob/master/PRIVACY-POLICY.md#permissions-required",
      policy: "/blob/master/PRIVACY-POLICY.md",
      popup: "options.html",
      privacy: "/blob/master/PRIVACY-POLICY.md#privacy-policy",
      readme: "#readme",
      settings: "options.html",
      wiki: "/wiki",
      __proto__: null as never
    } as SafeDict<string>,
    GlobalCommands_: null as never as string[],
    ShowPage_: "pages/show.html",
    VomnibarPageInner_: "", VomnibarScript_: "front/vomnibar.js", VomnibarScript_f_: ""
  }
};

chrome.runtime.getPlatformInfo ? chrome.runtime.getPlatformInfo(function (info): void {
  const os = (info.os || "").toLowerCase(), types = chrome.runtime.PlatformOs || { MAC: "mac", WIN: "win" };
  Settings.CONST_.Platform_ = os;
  (Settings.payload_ as Writeable<SettingsNS.FrontendConsts>).onMac_ = os === types.MAC || (os === types.WIN && 0);
}) : (Settings.CONST_.Platform_ = OnOther === BrowserType.Edge ? "win" : "unknown");

(OnOther || ChromeVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp) && !function (): boolean | void {
  try {
    return new RegExp("\\p{L}", "u").test("a");
  } catch (e) {}
}() && Utils.fetchHttpContents_(Settings.CONST_.WordsRe_, function (): void {
  Settings.CONST_.WordsRe_ = this.responseText.replace(<RegExpG> /\r?\n/g, "");
});
Settings.CONST_.WordsRe_ = "";

(function (): void {
  const ref = chrome.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  urls = ref.chrome_url_overrides, ref2 = ref.content_scripts[0].js,
  settings = Settings,
  { CONST_: obj, defaults_: defaults, valuesToLoad_, payload_ } = settings,
  newtab = urls && urls.newtab,
  // on Edge, https://www.msn.cn/spartan/ntp also works with some complicated search parameters
  // on Firefox, both "about:newtab" and "about:home" work,
  //   but "about:newtab" skips extension hooks and uses last configured URL, so it's better.
  CommonNewTab = OnOther === BrowserType.Edge ? "about:home" : "about:newtab", ChromeNewTab = "chrome://newtab",
  ref3 = settings.newTabs_ as SafeDict<Urls.NewTabType>;
  function func(path: string): string {
    return (path.charCodeAt(0) === KnownKey.slash ? origin : path.startsWith(prefix) ? "" : prefix) + path;
  }
  (defaults as SettingsWithDefaults).newTabUrl = OnOther ? CommonNewTab : newtab ? obj.NtpNewTab_ : ChromeNewTab;
  ref3[CommonNewTab] = newtab ? Urls.NewTabType.vimium : Urls.NewTabType.browser;
  OnOther || (ref3[ChromeNewTab] = newtab ? Urls.NewTabType.vimium : Urls.NewTabType.browser);
  newtab && (ref3[func(obj.VimiumNewTab_ = newtab)] = Urls.NewTabType.vimium);
  obj.GlobalCommands_ = Object.keys(ref.commands || {}).map(i => i === "quickNext" ? "nextTab" : i);
  obj.VerCode_ = ref.version;
  obj.VerName_ = ref.version_name || ref.version;
  obj.OptionsPage_ = func(ref.options_page || obj.OptionsPage_);
  obj.AllowClipboardRead_ = ref.permissions != null && ref.permissions.indexOf("clipboardRead") >= 0;
  obj.ShowPage_ = func(obj.ShowPage_);
  obj.VomnibarPageInner_ = func(defaults.vomnibarPage);
  obj.VomnibarScript_f_ = func(obj.VomnibarScript_);
  obj.HomePage_ = ref.homepage_url || obj.HomePage_;
  ref2.push(obj.InjectEnd_);
  if ("".startsWith.name !== "startsWith"
      && ChromeVer < BrowserVer.MinEnsured$String$$StartsWithAndRepeatAndIncludes + 1) {
    ref2.unshift(obj.PolyFill_);
  }
  obj.ContentScripts_ = ref2.map(func);

  payload_.grabBackFocus_ = settings.get_("grabBackFocus");
  for (let _i = valuesToLoad_.length; 0 <= --_i;) {
    const key = valuesToLoad_[_i];
    payload_[key] = settings.get_(key);
  }

  if (localStorage.length <= 0) {
    settings.set_("newTabUrl", obj.NewTabForNewUser_);
  }
  const hasAll = ChromeVer > BrowserVer.MinSafeCSS$All && "all" in (document.documentElement as HTMLElement).style;
  obj.StyleCacheId_ = obj.VerCode_ + "," + ChromeVer
    + (window.ShadowRoot ? "s" : "") + (hasAll ? "a" : "") + ",";
  const innerCSS = localStorage.getItem("innerCSS");
  if (innerCSS && innerCSS.startsWith(obj.StyleCacheId_)) {
    settings.postUpdate_("innerCSS", innerCSS);
    return;
  }
  settings.fetchFile_("baseCSS");
})();
