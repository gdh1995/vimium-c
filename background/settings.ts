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
    browser_: !(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
        || !(Build.BTypes & ~BrowserType.Edge) ? Build.BTypes as number as BrowserType : OnOther,
    browserVer_: Build.BTypes & BrowserType.Chrome ? ChromeVer : BrowserVer.assumedVer,
    grabBackFocus_: false,
    onMac_: false
  } as SettingsNS.FrontendSettingCache & SafeObject,
  newTabs_: Object.create(null) as ReadonlySafeDict<Urls.NewTabType>,
  extWhiteList_: null as never as SafeDict<boolean>,
  storage_: localStorage,
  get_<K extends keyof SettingsWithDefaults> (key: K, forCache?: boolean): SettingsWithDefaults[K] {
    if (key in this.cache_) {
      return (this.cache_ as SettingsWithDefaults)[key];
    }
    const initial = this.defaults_[key], str = this.storage_.getItem(key);
    const value = str == null ? initial : typeof initial === "string" ? str
        : initial === false || initial === true ? str === "true"
        : JSON.parse<typeof initial>(str);
    forCache && ((this.cache_ as SettingsNS.FullCache)[key] = value);
    return value;
  },
  set_<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void {
    const a = this;
    (a.cache_ as SettingsNS.FullCache)[key] = value;
    if (!(key in a.nonPersistent_)) {
      const initial = a.defaults_[key as keyof SettingsNS.PersistentSettings];
      if (value === initial) {
        a.storage_.removeItem(key);
        a.sync_(key as keyof SettingsNS.PersistentSettings, null);
      } else {
        a.storage_.setItem(key, typeof initial === "string" ? value as string : JSON.stringify(value));
        a.sync_(key as keyof SettingsNS.PersistentSettings, value as
          FullSettings[keyof SettingsNS.PersistentSettings]);
      }
      if (key in a.payload_) {
        a.payload_[key as keyof SettingsNS.FrontendSettings] =
          value as FullSettings[keyof SettingsNS.FrontendSettings];
      }
    }
    let ref: SettingsNS.SimpleUpdateHook<K> | undefined;
    if (ref = a.updateHooks_[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(a, value, key);
    }
  },
  postUpdate_: function<K extends keyof SettingsWithDefaults> (this: {}, key: K, value?: FullSettings[K]): void {
    return ((this as typeof Settings).updateHooks_[key] as SettingsNS.SimpleUpdateHook<K>).call(
      this as typeof Settings,
      value !== undefined ? value : (this as typeof Settings).get_(key), key);
  } as {
    <K extends SettingsNS.NullableUpdateHooks>(key: K, value?: FullSettings[K] | null): void;
    <K extends SettingsNS.EnsuredUpdateHooks | keyof SettingsWithDefaults>(key: K, value?: FullSettings[K]): void;
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
      for (let arr = val.split("\n"), i = arr.length, wordCharRe = /^[\da-z]/i as RegExpI; 0 <= --i; ) {
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
      const a = this as typeof Settings, cacheId = a.CONST_.StyleCacheId_,
      browserVer = ChromeVer,
      browserInfo = cacheId.substring(cacheId.indexOf(",") + 1),
      hasAll = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All
          || browserInfo.indexOf("a") >= 0;
      if (Build.MinCVer < BrowserVer.MinUnprefixedUserSelect && Build.BTypes & BrowserType.Chrome
            && browserVer < BrowserVer.MinUnprefixedUserSelect
          || (!(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox)) {
        css = css.replace(<RegExpG> /user-select\b/g, "-webkit-$&");
      }
      if (!Build.NDEBUG) {
        css = css.replace(<RegExpG> /\r\n?/g, "\n");
      }
      const findOffset = css.lastIndexOf("/*#find*/");
      let findCSS = css.substring(findOffset + /* '/*#find*\/\n' */ 10);
      css = css.substring(0, findOffset - /* `\n` */ 1);
      if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All || hasAll) {
        // Note: must not move "all:" into ":host" even when "s" and >= MinSelector$deep$InDynamicCSSMeansNothing
        // in case that ":host" is set [style="all:unset"]
        const ind2 = css.indexOf("all:"), ind1 = css.lastIndexOf("{", ind2),
        ind3 = Build.MinCVer >= BrowserVer.MinEnsuredSafeInnerCSS || !(Build.BTypes & BrowserType.Chrome)
              || browserVer >= BrowserVer.MinEnsuredSafeInnerCSS
          ? css.indexOf(";", ind2) : css.length;
        css = css.substring(0, ind1 + 1) + css.substring(ind2, ind3 + 1)
            + css.substring(css.indexOf("\n", ind3) + 1 || css.length);
      } else {
        css = css.replace(<RegExpOne> /all:\s?\w+;?\n?/, "");
      }
      if ((Build.MinCVer >= BrowserVer.MinEnsuredDisplayContents || !(Build.BTypes & BrowserType.Chrome)
            || browserVer >= BrowserVer.MinEnsuredDisplayContents)
          && !(Build.BTypes & BrowserType.Edge
                && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge))) {
        const ind2 = css.indexOf("display:"), ind1 = css.lastIndexOf("{", ind2);
        css = css.substring(0, ind1 + 1) + css.substring(ind2);
      } else {
        css = css.replace("contents", "block");
      }
      if (Build.MinCVer < BrowserVer.MinSpecCompliantShadowBlurRadius
          && Build.BTypes & BrowserType.Chrome
          && browserVer < BrowserVer.MinSpecCompliantShadowBlurRadius) {
        css = css.replace("3px 5px", "3px 7px");
      }
      if ((Build.BTypes & (BrowserType.Chrome | BrowserType.Edge) && Build.MinCVer < BrowserVer.MinCSS$Color$$RRGGBBAA
          && ((!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && OnOther === BrowserType.Edge)
            || ChromeVer < BrowserVer.MinCSS$Color$$RRGGBBAA
          ))) {
        css = css.replace(<RegExpG & RegExpSearchable<0>> /#[0-9a-z]{8}/gi, function (s: string): string {
          const color = parseInt(s.slice(1), 16),
          r = color >>> 24, g = (color >> 16) & 0xff, b = (color >> 8) & 0xff, alpha = (color & 0xff) / 255 + "";
          return `rgba(${r},${g},${b},${alpha.slice(0, 4)})`;
        });
      }
      if (!( !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
            || !(Build.BTypes & ~BrowserType.Firefox) && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && browserInfo.indexOf("s") < 0) {
        // Note: &vimium.min.css: this requires `:host{` is at the beginning
        const hostEnd = css.indexOf("}") + 1, secondEnd = css.indexOf("}", hostEnd) + 1,
        prefix = "#VimiumUI";
        let body = css.substring(secondEnd);
        if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All || hasAll) {
          body = body.replace(<RegExpG> /\b[IL]H\s?\{/g, "$&all:inherit;");
        }
        body += `\n${prefix}:before,${prefix}:after,.R:before,.R:after{display:none!important}`;
        css = prefix + css.substring(5, hostEnd) +
          // Note: &vimium.min.css: this requires no ID/attr selectors in base styles
          body.replace(<RegExpG> /\.[A-Z]/g, `${prefix} $&`);
      }
      css = cacheId + css.length + "\n" + css;
      const css2 = a.parseCustomCSS_(a.get_("userDefinedCss"));
      css2.ui && (css += "\n" + css2.ui);
      if (Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
          && Build.BTypes & BrowserType.Chrome
          && browserVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo) {
        css = css.replace(<RegExpG> /\b(border(?:-\w*-?width)?: ?)(0\.5px|\S+.\/\*!DPI\*\/)/g, "$11px \/\*!DPI\*\/");
      }
      a.storage_.setItem("findCSS", findCSS.length + "\n" + findCSS + (css2.find ? "\n" + css2.find : ""));
      a.storage_.setItem("omniCSS", css2.omni || "");
      return a.set_("innerCSS", css);
    },
    userDefinedCss (this: {}, css2Str): void {
      const a = this as typeof Settings;
      let css = a.storage_.getItem("innerCSS") as string, headEnd = css.indexOf("\n");
      css = css.substring(0, headEnd + 1 + +css.substring(0, headEnd).split(",")[2]);
      const css2 = a.parseCustomCSS_(css2Str);
      let innerCSS = css2.ui ? css + "\n" + css2.ui : css;
      {
        css = a.storage_.getItem("findCSS") as string;
        headEnd = css.indexOf("\n");
        css = css.slice(0, headEnd + 1 + +css.substring(0, headEnd));
        let find2 = css2.find;
        a.storage_.setItem("findCSS", find2 ? css + "\n" + find2 : css);
        a.storage_.setItem("omniCSS", css2.omni || "");
      }
      a.set_("innerCSS", innerCSS);
      const cache = a.cache_;
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
      const a = this as typeof Settings, cache = a.cache_ as Writeable<typeof Settings.cache_>;
      let findCSS = a.storage_.getItem("findCSS"), omniCSS = a.storage_.getItem("omniCSS");
      if (!findCSS || omniCSS == null) { Settings.fetchFile_("baseCSS"); return; }
      findCSS = findCSS.substring(findCSS.indexOf("\n") + 1);
      const index = findCSS.indexOf("\n") + 1, index2 = findCSS.indexOf("\n", index);
      // Note: The lines below are allowed as a special use case
      cache.innerCSS = css.substring(css.indexOf("\n") + 1);
      cache.findCSS_ = [findCSS.substring(0, index - 1),
          findCSS.substring(index, index2), findCSS.substring(index2 + 1)];
      cache.omniCSS_ = omniCSS;
    },
    vomnibarPage (this: {}, url): void {
      const a = this as typeof Settings, cur = localStorage.getItem("vomnibarPage_f");
      if (cur && !url) {
        (a.cache_ as Writeable<typeof Settings.cache_>).vomnibarPage_f = cur;
        return;
      }
      url = url || a.get_("vomnibarPage");
      if (url === a.defaults_.vomnibarPage) {
        url = a.CONST_.VomnibarPageInner_;
      } else if (url.startsWith("front/")) {
        url = chrome.runtime.getURL(url);
      } else {
        url = Utils.convertToUrl_(url);
        url = Utils.reformatURL_(url);
        if (Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
            && Build.BTypes & BrowserType.Chrome
            && ChromeVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg && !url.startsWith(BrowserProtocol_)) {
          url = a.CONST_.VomnibarPageInner_;
        } else {
          url = url.replace(":version", "" + parseFloat(a.CONST_.VerCode_));
        }
      }
      a.set_("vomnibarPage_f", url);
    },
    vomnibarOptions (this: {}, options: SettingsNS.BackendSettings["vomnibarOptions"] | null): void {
      const a = this as typeof Settings, defaultOptions = a.defaults_.vomnibarOptions;
      let isSame = true;
      if (options !== defaultOptions && options && typeof options === "object") {
        const { maxMatches: defaultMatches, queryInterval: defaultInterval } = defaultOptions,
        maxMatches = Math.max(3, Math.min((options.maxMatches | 0) || defaultMatches
            , GlobalConsts.MaxLimitOfVomnibarMatches)),
        newInterval = +options.queryInterval,
        newStyles = ((options.styles || "") + "").trim(),
        queryInterval = Math.max(0, Math.min(newInterval >= 0 ? newInterval : defaultInterval, 1200));
        isSame = defaultMatches === maxMatches && defaultInterval === queryInterval
                && !newStyles;
        if (!isSame) {
          options.maxMatches = maxMatches;
          options.queryInterval = queryInterval;
          options.styles = newStyles;
        }
      }
      (a.cache_ as Writeable<typeof a.cache_>).vomnibarOptions = options = isSame ? defaultOptions
        : options as NonNullable<typeof options>;
      const request2: Req.bg<kBgReq.omni_globalOptions> = { N: kBgReq.omni_globalOptions, o: options };
      for (const frame of Backend.indexPorts_(GlobalConsts.VomnibarFakeTabId)) {
        frame.postMessage(request2);
      }
    }
  } as { [key in SettingsNS.DeclaredUpdateHooks]: SettingsNS.UpdateHook<key>; } as SettingsNS.FullUpdateHookMap,
  /** can only fetch files in the `[ROOT]/front` folder */
  fetchFile_ (file: "words" | keyof SettingsNS.CachedFiles, callback?: (this: void) => any): TextXHR | null {
    if (callback && file in this.cache_) { callback(); return null; }
    const fileName = this.CONST_[file];
    if (!fileName) { throw Error("unknown file: " + file); } // just for debugging
    const req = new XMLHttpRequest() as TextXHR;
    req.open("GET", "/front/" + fileName, true);
    req.responseType = "text";
    req.onload = function (): void {
      const text = this.responseText;
      if (file === "baseCSS") {
        Settings.postUpdate_(file, text);
      } else if ((Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
          || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
              && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
          && file === "words") {
        Settings.CONST_.words = text.replace(<RegExpG> /[\n\r]/g, "");
      } else {
        Settings.set_(file as Exclude<typeof file, "baseCSS" | "words">, text);
      }
      callback && setTimeout(callback, 0);
      return;
    };
    req.send();
    return req as TextXHR;
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
    extWhiteList: !(Build.BTypes & ~BrowserType.Chrome)
      || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome
? `# modified { Vomnibar Page, X New Tab, PDF Viewer }
ekohaelnhhdhbccgefjmjpdjoijhojgd
hdnehngglnbnehkfcidabjckinphnief
nacjakoppgmdcpemlfnfegmlhipddanj`
: !(Build.BTypes & ~BrowserType.Firefox)
  || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
? `# extension id or hostname
# like "${BuildStr.FirefoxID}"`
: "",
    findModeRawQueryList: "",
    focusNewTabContent: true,
    grabBackFocus: false,
    hideHud: false,
    innerCSS: "",
    keyboard: [560, 33],
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
js\\:|Js: javascript:\\ $S; JavaScript
w|wiki:\\\n  https://www.wikipedia.org/w/index.php?search=%s Wikipedia
v.m|v\\:math: vimium://math\\ $S re= Calculate

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
    vomnibarOptions: {
      maxMatches: 10,
      queryInterval: 500,
      styles: "",
    },
    userDefinedCss: "",
    vimSync: null,
    vomnibarPage: "front/vomnibar.html",
    vomnibarPage_f: "",
    phraseBlacklist: ""
  } as Readonly<SettingsWithDefaults> & SafeObject,
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent_: { __proto__: null as never,
    baseCSS: 1, exclusionTemplate: 1, helpDialog: 1,
    searchEngineMap: 1, searchEngineRules: 1, searchKeywords: 1
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
    "deepHints", "keyboard", "linkHintCharacters" //
    , "regexFindMode", "scrollStepSize", "smoothScroll" //
  ] as ReadonlyArray<keyof SettingsNS.FrontendSettings>,
  sync_: Utils.blank_ as SettingsNS.Sync["set"],
  CONST_: {
    AllowClipboardRead_: true,
    BaseCSSLength_: 0,
    // should keep lower case
    NtpNewTab_: "chrome-search://local-ntp/local-ntp.html",
    DisallowIncognito_: false,
    ContentScripts_: null as never as string[],
    VerCode_: "", VerName_: "",
    GitVer: BuildStr.Commit as string,
    StyleCacheId_: "",
    KnownPages_: ["blank", "newtab", "options", "show"],
    MathParser: "/lib/math_parser.js",
    HelpDialog: "/background/help_dialog.js",
    Commands: "/background/commands.js",
    Exclusions: "/background/exclusions.js",
    InjectEnd_: "content/injected_end.js",
    NewTabForNewUser_: "pages/options.html#!newTabUrl",
    OptionsPage_: "pages/options.html", Platform_: "browser",
    baseCSS: "vimium.min.css",
    exclusionTemplate: "exclusions.html",
    helpDialog: "help_dialog.html",
    words: Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
      || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      ? "words.txt" : "",
    PolyFill_: Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && Build.BTypes & BrowserType.Chrome
      ? "lib/polyfill.js" : "",
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
    GlobalCommands_: null as never as kShortcutNames[],
    ShowPage_: "pages/show.html",
    VomnibarPageInner_: "", VomnibarScript_: "/front/vomnibar.js", VomnibarScript_f_: ""
  }
};

!(Build.BTypes & BrowserType.Edge) ||
chrome.runtime.getPlatformInfo ? chrome.runtime.getPlatformInfo(function (info): void {
  const os = (!(Build.BTypes & ~BrowserType.Chrome) ? info.os : info.os || "").toLowerCase(),
  types = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinRuntimePlatformOs
    ? chrome.runtime.PlatformOs as EnsureNonNull<typeof chrome.runtime.PlatformOs>
    : chrome.runtime.PlatformOs || { MAC: "mac", WIN: "win" };
  Settings.CONST_.Platform_ = os;
  (Settings.payload_ as Writeable<SettingsNS.FrontendConsts>).onMac_ = os === types.MAC || (os === types.WIN && 0);
}) : (Settings.CONST_.Platform_ = Build.BTypes & BrowserType.Edge
    && (!(Build.BTypes & BrowserType.Edge) || OnOther === BrowserType.Edge) ? "win" : "unknown");

if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
  || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
  ( (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox))
    ? !Build.NativeWordMoveOnFirefox
    : Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      && ChromeVer < (
        BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
        ? BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        : BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
      && (!(Build.BTypes & BrowserType.Edge) || OnOther !== BrowserType.Edge)
  ) &&
  ( Build.BTypes & ~BrowserType.Firefox
    && Build.MinCVer < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
    && (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces <= BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
      || ChromeVer < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp)
    && (Build.NativeWordMoveOnFirefox || !(Build.BTypes & BrowserType.Firefox) || OnOther !== BrowserType.Firefox)
  || !function (): boolean | void {
    try {
      return new RegExp("\\p{L}", "u").test("a");
    } catch {}
  }()) ? Settings.fetchFile_("words") : (Settings.CONST_.words = "");
}

(function (): void {
  const ref = chrome.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  ref2 = ref.content_scripts[0].js,
  settings = Settings,
  { CONST_: obj, defaults_: defaults, valuesToLoad_, payload_ } = settings,
  // on Edge, https://www.msn.cn/spartan/ntp also works with some complicated search parameters
  // on Firefox, both "about:newtab" and "about:home" work,
  //   but "about:newtab" skips extension hooks and uses last configured URL, so it's better.
  CommonNewTab = Build.BTypes & BrowserType.Edge
      && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
    ? "about:home" : "about:newtab", ChromeNewTab = "chrome://newtab",
  ref3 = settings.newTabs_ as SafeDict<Urls.NewTabType>;
  function func(path: string): string {
    return (path.charCodeAt(0) === KnownKey.slash ? origin : path.startsWith(prefix) ? "" : prefix) + path;
  }
  (defaults as SettingsWithDefaults).newTabUrl = (Build.BTypes & ~BrowserType.Chrome
      && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
      ? CommonNewTab : Build.OverrideNewTab ? obj.NtpNewTab_ : ChromeNewTab;
  // note: on firefox, "about:newtab/" is invalid, but it's OKay if still marking the URL a NewTab URL.
  /** Note: .vimium and .browser should never exist in the same time
   * use {@link #Build.OverrideNewTab} to decide which one
   * required by {@link main.ts#tabsCreate}
   */
  ref3[CommonNewTab] = ref3[CommonNewTab + "/"] = Build.OverrideNewTab
      ? Urls.NewTabType.vimium : Urls.NewTabType.browser;
  (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) ||
  (ref3[ChromeNewTab] = ref3[ChromeNewTab + "/"] = Build.OverrideNewTab
      ? Urls.NewTabType.vimium : Urls.NewTabType.browser);
  if (Build.OverrideNewTab) {
    type Overridden = EnsureNonNull<typeof ref.chrome_url_overrides>;
    ref3[func((ref.chrome_url_overrides as Overridden).newtab)] = Urls.NewTabType.vimium;
  }
  obj.GlobalCommands_ = (<Array<kShortcutNames | kShortcutAliases & string>> Object.keys(ref.commands || {})
      ).map(i => i === kShortcutAliases.nextTab1 ? kShortcutNames.nextTab : i);
  obj.VerCode_ = ref.version;
  obj.VerName_ = ref.version_name || ref.version;
  obj.OptionsPage_ = func(ref.options_page || obj.OptionsPage_);
  obj.AllowClipboardRead_ = ref.permissions != null && ref.permissions.indexOf("clipboardRead") >= 0;
  obj.ShowPage_ = func(obj.ShowPage_);
  obj.VomnibarPageInner_ = func(defaults.vomnibarPage);
  obj.VomnibarScript_f_ = func(obj.VomnibarScript_);
  obj.HomePage_ = ref.homepage_url || obj.HomePage_;
  ref2.push(obj.InjectEnd_);
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith
      && ChromeVer < BrowserVer.MinSafe$String$$StartsWith
      && "".startsWith.name !== "startsWith") {
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
  obj.StyleCacheId_ = obj.VerCode_ + "," + ChromeVer
    + (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
          || !(Build.BTypes & ~BrowserType.Firefox) && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1
        ? "" : window.ShadowRoot ? "s" : "")
    + (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All ? ""
      : (Build.MinCVer > BrowserVer.MinSafeCSS$All || ChromeVer > BrowserVer.MinSafeCSS$All)
        && (!(Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge))
          || "all" in (document.documentElement as HTMLHtmlElement).style)
      ? "a" : "")
    + ",";
  const innerCSS = localStorage.getItem("innerCSS");
  if (innerCSS && innerCSS.startsWith(obj.StyleCacheId_)) {
    settings.postUpdate_("innerCSS", innerCSS);
    return;
  }
  localStorage.removeItem("vomnibarPage_f");
  settings.fetchFile_("baseCSS");
})();
