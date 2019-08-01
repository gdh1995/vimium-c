import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;

var Settings_ = {
  cache_: BgUtils_.safeObj_() as Readonly<SettingsNS.FullCache>,
  temp_: {
    hasEmptyLocalStorage_: false,
    backupSettingsToLocal_: null as null | ((wait: number) => void) | true,
    onInstall_: null as Parameters<chrome.runtime.RuntimeInstalledEvent["addListener"]>[0] | null,
    cmdErrors_: 0,
    shownHash_: null as ((this: void) => string) | null
  },
  payload_: (Build.BTypes & BrowserType.Chrome ? {
    __proto__: null as never,
    v: CurCVer_,
    r: false,
    d: "",
    g: false,
    m: false
  } : {
    __proto__: null as never, r: false, d: "", g: false, m: false
  }) as SettingsNS.FrontendSettingsWithoutSyncing & SettingsNS.FrontendSettingsSyncedManually
      & SafeObject as SettingsNS.FrontendSettingCache & SafeObject,
  omniPayload_: (Build.BTypes & BrowserType.Chrome ? {
    v: CurCVer_,
    m: 0,
    c: "",
    M: 0,
    i: 0,
    n: "",
    s: ""
  } : {
    m: 0, c: "", M: 0, i: 0, n: "", s: ""
  }) as VomnibarPayload,
  newTabs_: BgUtils_.safeObj_() as ReadonlySafeDict<Urls.NewTabType>,
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
    forCache && ((this.cache_ as Generalized<SettingsNS.FullCache>)[key] = value as SettingsWithDefaults[K]);
    return value as SettingsWithDefaults[K];
  },
  set_<K extends keyof FullSettings> (key: K, value: FullSettings[K]): void {
    const a = this;
    (a.cache_ as Generalized<SettingsNS.FullCache>)[key] = value;
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
      if (key in a.valuesToLoad_) {
        (a.payload_ as Generalized<typeof a.payload_>)[a.valuesToLoad_[key as keyof SettingsNS.FrontendSettings]] =
          value as FullSettings[keyof SettingsNS.FrontendSettings];
      }
    }
    let ref: SettingsNS.SimpleUpdateHook<K> | undefined;
    if (ref = a.updateHooks_[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(a, value, key);
    }
  },
  postUpdate_: function<K extends keyof SettingsWithDefaults> (this: {}, key: K, value?: FullSettings[K]): void {
    type AllK = keyof SettingsWithDefaults;
    return ((this as typeof Settings_).updateHooks_[key as AllK] as SettingsNS.SimpleUpdateHook<AllK>).call(
      this as typeof Settings_,
      value !== undefined ? value : (this as typeof Settings_).get_(key), key);
  } as {
    <K extends SettingsNS.NullableUpdateHooks>(key: K, value?: FullSettings[K] | null): void;
    <K extends SettingsNS.EnsuredUpdateHooks | keyof SettingsWithDefaults>(key: K, value?: FullSettings[K]): void;
  },
  broadcast_<K extends keyof BgReq> (request: Req.bg<K>): void {
    const ref = Backend_.indexPorts_();
    for (const tabId in ref) {
      const frames = ref[+tabId] as Frames.Frames;
      for (let i = frames.length; 0 < --i; ) {
        frames[i].postMessage(request);
      }
    }
  },
  broadcastOmni_<K extends ValidBgVomnibarReq> (request: Req.bg<K>): void {
    for (const frame of Backend_.indexPorts_(GlobalConsts.VomnibarFakeTabId)) {
      frame.postMessage(request);
    }
  },
  updateOmniStyles_: BgUtils_.blank_ as (key: MediaNS.kName, embed?: 1 | undefined) => void,
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
      const old = (this as typeof Settings_).extWhiteList_;
      const map = (this as typeof Settings_).extWhiteList_ = BgUtils_.safeObj_<boolean>();
      if (old && Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
        for (const key in old) { if (old[key] === false) { map[key] = false; } }
      }
      if (!val) { return; }
      for (let arr = val.split("\n"), i = arr.length, wordCharRe = /^[\da-z_]/i as RegExpI; 0 <= --i; ) {
        if ((val = arr[i].trim()) && wordCharRe.test(val)) {
          map[val] = true;
        }
      }
    },
    grabBackFocus (this: {}, value: FullSettings["grabBackFocus"]): void {
      (this as typeof Settings_).payload_.g = value;
    },
    newTabUrl (this: {}, url): void {
      url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(url)
        ? chrome.runtime.getURL(url) : BgUtils_.convertToUrl_(url);
      return (this as typeof Settings_).set_("newTabUrl_f", url);
    },
    searchEngines (this: {}): void {
      return (this as typeof Settings_).set_("searchEngineMap", BgUtils_.safeObj_<Search.Engine>());
    },
    searchEngineMap (this: {}, value: FullSettings["searchEngineMap"]): void {
      const a = this as typeof Settings_;
      "searchKeywords" in a.cache_ && a.set_("searchKeywords", null);
      // Note: this requires `searchUrl` must be a valid URL
      if (!(Build.NDEBUG || BgUtils_.protocolRe_.test(a.get_("searchUrl")))) {
        console.log('Assert error: BgUtils_.protocolRe_.test(Settings_.get_("searchUrl"))');
      }
      const rules = BgUtils_.parseSearchEngines_("~:" + a.get_("searchUrl") + "\n" + a.get_("searchEngines"), value);
      return a.set_("searchEngineRules", rules);
    },
    searchUrl (str): void {
      const cache = (this as typeof Settings_).cache_ as Writable<typeof Settings_.cache_>;
      if (str) {
        BgUtils_.parseSearchEngines_("~:" + str, cache.searchEngineMap);
      } else {
        const initialMap: { "~": Search.Engine } = {
          "~": { name_: "~", blank_: "", url_: (this as typeof Settings_).get_("searchUrl").split(" ", 1)[0] }
        };
        cache.searchEngineMap = initialMap as SafeObject & typeof initialMap;
        cache.searchEngineRules = [];
        Build.MayOverrideNewTab && (this as typeof Settings_).get_("focusNewTabContent", true);
        if (str = (this as typeof Settings_).get_("newTabUrl_f", true)) {
          return ((this as typeof Settings_).updateHooks_.newTabUrl_f as (this: void, url_f: string) => void)(str);
        }
      }
      return (this as typeof Settings_).postUpdate_("newTabUrl");
    },
    baseCSS (this: {}, css): void {
      const a = this as typeof Settings_, cacheId = a.CONST_.StyleCacheId_,
      browserVer = CurCVer_,
      browserInfo = cacheId.slice(cacheId.indexOf(",") + 1),
      hasAll = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All
          || browserInfo.indexOf("a") >= 0;
      if (!(Build.NDEBUG || css.startsWith(":host{"))) {
        console.log('Assert error: `css.startsWith(":host{")` in Settings_.updateHooks_.baseCSS');
      }
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
      let findCSS = css.slice(findOffset + /* '/*#find*\/\n' */ 10);
      css = css.slice(0, findOffset - /* `\n` */ 1);
      if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All || hasAll) {
        // Note: must not move "all:" into ":host" even when "s" and >= MinSelector$deep$InDynamicCSSMeansNothing
        // in case that ":host" is set [style="all:unset"]
        const ind2 = css.indexOf("all:"), ind1 = css.lastIndexOf("{", ind2),
        ind3 = Build.MinCVer >= BrowserVer.MinEnsuredSafeInnerCSS || !(Build.BTypes & BrowserType.Chrome)
              || browserVer >= BrowserVer.MinEnsuredSafeInnerCSS
          ? css.indexOf(";", ind2) : css.length;
        css = css.slice(0, ind1 + 1) + css.slice(ind2, ind3 + 1)
            + css.slice(css.indexOf("\n", ind3) + 1 || css.length);
      } else {
        css = css.replace(<RegExpOne> /all:\s?\w+;?\n?/, "");
      }
      if ((Build.MinCVer >= BrowserVer.MinEnsuredDisplayContents || !(Build.BTypes & BrowserType.Chrome)
            || browserVer >= BrowserVer.MinEnsuredDisplayContents)
          && !(Build.BTypes & BrowserType.Edge
                && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge))) {
        const ind2 = css.indexOf("display:"), ind1 = css.lastIndexOf("{", ind2);
        css = css.slice(0, ind1 + 1) + css.slice(ind2);
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
            || CurCVer_ < BrowserVer.MinCSS$Color$$RRGGBBAA
          ))) {
        css = css.replace(<RegExpG & RegExpSearchable<0>> /#[0-9a-z]{8}/gi, function (s: string): string {
          const color = parseInt(s.slice(1), 16),
          r = color >>> 24, g = (color >> 16) & 0xff, b = (color >> 8) & 0xff, alpha = (color & 0xff) / 255 + "";
          return `rgba(${r},${g},${b},${alpha.slice(0, 4)})`;
        });
      }
      if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
          && (Build.MinCVer >= BrowserVer.MinAbsolutePositionNotCauseScrollbar
              || CurCVer_ >= BrowserVer.MinAbsolutePositionNotCauseScrollbar)) {
        const beforeLH = css.indexOf(".LH"), endLH = css.indexOf("}", beforeLH);
        css = css.slice(0, beforeLH) + css.slice(beforeLH, endLH).replace("box-sizing:border-box;", "") +
            css.slice(endLH);
      }
      if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
          && browserInfo.indexOf("s") < 0) {
        // Note: &vimium.min.css: this requires `:host{` is at the beginning
        const hostEnd = css.indexOf("}") + 1, secondEnd = css.indexOf("}", hostEnd) + 1,
        prefix = "#VimiumUI";
        let body = css.slice(secondEnd);
        if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All || hasAll) {
          body = body.replace(<RegExpG> /\b[IL]H\s?\{/g, "$&all:inherit;");
        }
        body += `\n${prefix}:before,${prefix}:after,.R:before,.R:after{display:none!important}`;
        css = prefix + css.slice(5, hostEnd) +
            // Note: &vimium.min.css: this requires no ID/attr selectors in base styles
            body.replace(<RegExpG> /\.(?!D\{)[A-Z]/g, `${prefix} $&`).replace(new RegExp(`>${prefix} `, "g"), ">");
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
      const a = this as typeof Settings_;
      let css = a.storage_.getItem("innerCSS") as string, headEnd = css.indexOf("\n");
      css = css.slice(0, headEnd + 1 + +css.slice(0, headEnd).split(",")[2]);
      const css2 = a.parseCustomCSS_(css2Str);
      let innerCSS = css2.ui ? css + "\n" + css2.ui : css;
      {
        css = a.storage_.getItem("findCSS") as string;
        headEnd = css.indexOf("\n");
        css = css.slice(0, headEnd + 1 + +css.slice(0, headEnd));
        let find2 = css2.find;
        a.storage_.setItem("findCSS", find2 ? css + "\n" + find2 : css);
        a.storage_.setItem("omniCSS", css2.omni || "");
      }
      a.set_("innerCSS", innerCSS);
      const cache = a.cache_;
      innerCSS = cache.innerCSS;
      const ref = Backend_.indexPorts_(), request: Req.bg<kBgReq.showHUD> = {
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
      a.broadcastOmni_({ N: kBgReq.omni_updateOptions, d: { c: a.omniPayload_.c } });
    },
    innerCSS (this: {}, css): void {
      const a = this as typeof Settings_, cache = a.cache_ as Writable<typeof Settings_.cache_>;
      let findCSS = a.storage_.getItem("findCSS"), omniCSS = a.storage_.getItem("omniCSS");
      if (!findCSS || omniCSS == null) { Settings_.fetchFile_("baseCSS"); return; }
      findCSS = findCSS.slice(findCSS.indexOf("\n") + 1);
      const index = findCSS.indexOf("\n") + 1, index2 = findCSS.indexOf("\n", index);
      // Note: The lines below are allowed as a special use case
      cache.innerCSS = css.slice(css.indexOf("\n") + 1);
      cache.findCSS_ = { c: findCSS.slice(0, index - 1), s: findCSS.slice(index, index2),
          i: findCSS.slice(index2 + 1) };
      a.omniPayload_.c = omniCSS;
    },
    vomnibarPage (this: {}, url): void {
      const a = this as typeof Settings_, cur = localStorage.getItem("vomnibarPage_f");
      if (cur && !url) {
        (a.cache_ as Writable<typeof Settings_.cache_>).vomnibarPage_f = cur;
        return;
      }
      url = url || a.get_("vomnibarPage");
      if (url === a.defaults_.vomnibarPage) {
        url = a.CONST_.VomnibarPageInner_;
      } else if (url.startsWith("front/")) {
        url = chrome.runtime.getURL(url);
      } else {
        url = BgUtils_.convertToUrl_(url);
        url = BgUtils_.reformatURL_(url);
        if (Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
            && Build.BTypes & BrowserType.Chrome
            && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg && !url.startsWith(BrowserProtocol_)) {
          url = a.CONST_.VomnibarPageInner_;
        } else {
          url = url.replace(":version", "" + parseFloat(a.CONST_.VerCode_));
        }
      }
      a.set_("vomnibarPage_f", url);
    },
    vomnibarOptions (this: {}, options: SettingsNS.BackendSettings["vomnibarOptions"] | null): void {
      const a = this as typeof Settings_, defaultOptions = a.defaults_.vomnibarOptions,
      payload = a.omniPayload_;
      let isSame = true;
      let { maxMatches, queryInterval, styles, sizes } = defaultOptions;
      if (options !== defaultOptions && options && typeof options === "object") {
        const newMaxMatches = Math.max(3, Math.min((options.maxMatches | 0) || maxMatches
            , GlobalConsts.MaxLimitOfVomnibarMatches)),
        newInterval = +options.queryInterval,
        newStyles = ((options.styles || "") + "").trim(),
        // use `<=` in case of further updates
        newSizes = ((options.sizes || "") + "").trim(),
        newQueryInterval = Math.max(0, Math.min(newInterval >= 0 ? newInterval : queryInterval, 1200));
        isSame = maxMatches === newMaxMatches && queryInterval === newQueryInterval
                  && newSizes === sizes
                  && styles === newStyles;
        if (!isSame) {
          maxMatches = newMaxMatches;
          queryInterval = newQueryInterval;
          sizes = newSizes;
          styles = newStyles;
        }
        options.maxMatches = newMaxMatches;
        options.queryInterval = newQueryInterval;
        options.sizes = newSizes;
        options.styles = newStyles;
      }
      (a.cache_ as Writable<typeof a.cache_>).vomnibarOptions = options = isSame ? defaultOptions
        : options as NonNullable<typeof options>;
      payload.M = maxMatches;
      payload.i = queryInterval;
      payload.n = sizes;
      payload.s = styles;
      a.updateOmniStyles_(MediaNS.kName.PrefersReduceMotion, 1);
      a.updateOmniStyles_(MediaNS.kName.PrefersColorScheme, 1);
      a.broadcastOmni_({ N: kBgReq.omni_updateOptions, d: {
        M: maxMatches,
        i: queryInterval,
        n: sizes,
        s: payload.s
      } });
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
        Settings_.postUpdate_(file, text);
      } else if ((Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
          || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
              && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
          && file === "words") {
        Settings_.CONST_.words = text.replace(<RegExpG> /[\n\r]/g, "");
      } else {
        Settings_.set_(file as Exclude<typeof file, "baseCSS" | "words">, text);
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
    acceptAllShortcuts: false,
    autoDarkMode: true,
    autoReduceMotion: false,
    dialogMode: false,
    exclusionListenHash: true,
    exclusionOnlyFirstMatch: false,
    exclusionRules: [{pattern: ":https://mail.google.com/", passKeys: ""}] as ExclusionsNS.StoredRule[],
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
      sizes: VomnibarNS.PixelData.OthersIfEmpty + ","
          + (VomnibarNS.PixelData.OthersIfNotEmpty - VomnibarNS.PixelData.OthersIfEmpty) + ","
          + VomnibarNS.PixelData.Item
          ,
      styles: "mono-url"
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
  frontUpdateAllowed_: ["showAdvancedCommands"] as Array<keyof SettingsNS.FrontUpdateAllowedSettings>,
  icons_: [
    { 19: "/icons/enabled_19.png", 38: "/icons/enabled_38.png" },
    { 19: "/icons/partial_19.png", 38: "/icons/partial_38.png" },
    { 19: "/icons/disabled_19.png", 38: "/icons/disabled_38.png" }
  ] as [IconNS.PathBuffer, IconNS.PathBuffer, IconNS.PathBuffer],
  valuesToLoad_: { __proto__: null as never,
    keyboard: "k", linkHintCharacters: "l",
    regexFindMode: "R", smoothScroll: "S", scrollStepSize: "t"
  } as SettingsNS.FrontendSettingNameMap & SafeObject,
  sync_: BgUtils_.blank_ as SettingsNS.Sync["set"],
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
    NewTabForNewUser_: Build.MayOverrideNewTab ? "pages/options.html#!newTabUrl" : "",
    OverrideNewTab_: Build.MayOverrideNewTab ? true : false,
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
    ? chrome.runtime.PlatformOs as NonNullable<typeof chrome.runtime.PlatformOs>
    : chrome.runtime.PlatformOs || { MAC: "mac", WIN: "win" };
  Settings_.CONST_.Platform_ = os;
  (Settings_.omniPayload_ as Writable<typeof Settings_.omniPayload_>).m =
  (Settings_.payload_ as Writable<typeof Settings_.payload_>).m = os === types.MAC || (os === types.WIN && 0);
}) : (Settings_.CONST_.Platform_ = Build.BTypes & BrowserType.Edge
    && (!(Build.BTypes & BrowserType.Edge) || OnOther === BrowserType.Edge) ? "win" : "unknown");

if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
  || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
  ( (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox))
    ? !Build.NativeWordMoveOnFirefox
    : Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      && CurCVer_ < (
        BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
        ? BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        : BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
      && (!(Build.BTypes & BrowserType.Edge) || OnOther !== BrowserType.Edge)
  ) &&
  ( Build.BTypes & ~BrowserType.Firefox
    && Build.MinCVer < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
    && (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces <= BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
      || CurCVer_ < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp)
    && (Build.NativeWordMoveOnFirefox || !(Build.BTypes & BrowserType.Firefox) || OnOther !== BrowserType.Firefox)
  || !function (): boolean | void {
    try {
      return new RegExp("\\p{L}", "u").test("a");
    } catch {}
  }()) ? Settings_.fetchFile_("words") : (Settings_.CONST_.words = "");
}

(function (): void {
  const ref = chrome.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  ref2 = ref.content_scripts[0].js,
  settings = Settings_,
  { CONST_: obj, defaults_: defaults, valuesToLoad_, payload_ } = settings,
  // on Edge, https://www.msn.cn/spartan/ntp also works with some complicated search parameters
  // on Firefox, both "about:newtab" and "about:home" work,
  //   but "about:newtab" skips extension hooks and uses last configured URL, so it's better.
  CommonNewTab = Build.BTypes & BrowserType.Edge
      && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
    ? "about:home" : "about:newtab", ChromeNewTab = "chrome://newtab",
  ref3 = settings.newTabs_ as SafeDict<Urls.NewTabType>;
  function func(path: string): string {
    return (path.charCodeAt(0) === kCharCode.slash ? origin : path.startsWith(prefix) ? "" : prefix) + path;
  }
  if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
    (payload_ as Writable<typeof payload_>).b =
        (settings.omniPayload_ as Writable<VomnibarPayload>).b = OnOther;
  }
  if (Build.MayOverrideNewTab) {
    const overrides = ref.chrome_url_overrides, hasNewTab = overrides && overrides.newtab;
    Settings_.CONST_.OverrideNewTab_ = !!hasNewTab;
    ref3[func(hasNewTab || "pages/newtab.html")] = Urls.NewTabType.vimium;
  }
  if (!Build.MayOverrideNewTab || !Settings_.CONST_.OverrideNewTab_) {
    obj.NewTabForNewUser_ = (Build.BTypes & ~BrowserType.Chrome
        && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
        ? CommonNewTab : ChromeNewTab;
  }
  (defaults as SettingsWithDefaults).newTabUrl = (Build.BTypes & ~BrowserType.Chrome
      && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
      ? Build.MayOverrideNewTab && Settings_.CONST_.OverrideNewTab_
        ? Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
          ? "https://www.msn.cn/spartan/ntp" : "pages/blank.html"
        : CommonNewTab
      : (Build.MayOverrideNewTab && Settings_.CONST_.OverrideNewTab_) ? obj.NtpNewTab_ : ChromeNewTab;
  // note: on firefox, "about:newtab/" is invalid, but it's OKay if still marking the URL a NewTab URL.
  ref3[CommonNewTab] = ref3[CommonNewTab + "/"] = Urls.NewTabType.browser;
  (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) ||
  (ref3[ChromeNewTab] = ref3[ChromeNewTab + "/"] = Urls.NewTabType.browser);
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
      && CurCVer_ < BrowserVer.MinSafe$String$$StartsWith
      && "".startsWith.name !== "startsWith") {
    ref2.unshift(obj.PolyFill_);
  }
  obj.ContentScripts_ = ref2.map(func);

  payload_.g = settings.get_("grabBackFocus");
  for (let _i in valuesToLoad_) {
    const key = valuesToLoad_[_i as keyof SettingsNS.FrontendSettingNameMap];
    (payload_ as Generalized<typeof payload_>)[key] = settings.get_(_i as keyof SettingsNS.FrontendSettingNameMap);
  }

  if (settings.temp_.hasEmptyLocalStorage_ = localStorage.length <= 0) {
    settings.set_("newTabUrl", obj.NewTabForNewUser_);
  }
  obj.StyleCacheId_ = obj.VerCode_ + "," + CurCVer_
    + ( (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        ? ""
        : (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            ? window.ShadowRoot || (document.body as HTMLElement).webkitCreateShadowRoot : window.ShadowRoot)
        ? "s" : "")
    + (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinSafeCSS$All ? ""
      : (Build.MinCVer > BrowserVer.MinSafeCSS$All || CurCVer_ > BrowserVer.MinSafeCSS$All)
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
