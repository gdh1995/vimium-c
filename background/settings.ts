import SettingsWithDefaults = SettingsNS.SettingsWithDefaults;
type WritableSettingsCache = SettingsNS.FullCache;
type SettingsUpdateMsg = {
  [K in keyof Req.bg<kBgReq.settingsUpdate>]: K extends "d"
      ? Array<keyof SettingsNS.FrontendSettingsSyncingItems> | SettingsNS.FrontendSettingCache
      : Req.bg<kBgReq.settingsUpdate>[K]
}

const As_ = <T> (i: T): T => i;
const AsC_ = <T extends kCName> (i: T): T => i // lgtm [js/unused-local-variable]
// eslint-disable-next-line no-var
var Settings_ = {
  cache_: BgUtils_.safeObj_() as Readonly<SettingsNS.FullCache>,
  temp_: {
    isHighContrast_ff_: false,
    hasEmptyLocalStorage_: localStorage.length <= 0,
    backupSettingsToLocal_: null as null | ((wait: number) => void) | true,
    onInstall_: null as Parameters<chrome.runtime.RuntimeInstalledEvent["addListener"]>[0] | null,
    initing_: BackendHandlersNS.kInitStat.START,
    newSettingsToBroadcast_: null as Extract<SettingsUpdateMsg["d"], string[]> | null,
    IconBuffer_: null as IconNS.AccessIconBuffer | null,
    loadI18nPayload_: null as (() => void) | null,
    omniStyleOverridden_: false,
    shownHash_: null as ((this: void) => string) | null
  },
  payload_: <SettingsNS.FrontendSettingCache> As_<SettingsNS.DeclaredFrontendValues>({
    v: !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome
       ? CurCVer_
       : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox
       ? CurFFVer_ : 0,
    d: "",
    m: false,
    g: false,
    o: kOS.win
  }),
  omniPayload_: <SettingsNS.VomnibarPayload> As_<SettingsNS.DeclaredVomnibarPayload>({
    v: !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome
        ? CurCVer_
        : !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && OnOther & BrowserType.Firefox
        ? CurFFVer_ : 0,
    o: kOS.win,
    a: 0,
    n: 0,
    t: 0,
    l: "",
    s: "",
    c: "",
    k: null
  }),
  i18nPayload_: null as string[] | null,
  newTabs_: new Map() as ReadonlyMap<string, Urls.NewTabType>,
  extAllowList_: null as never as Map<string, boolean | string>,
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
    type PersistentKeys = keyof SettingsNS.PersistentSettings;
    (a.cache_ as Generalized<SettingsNS.FullCache>)[key] = value;
    if (!(key in a.nonPersistent_)) {
      const initial = a.defaults_[key as PersistentKeys];
      if (value === initial) {
        a.storage_.removeItem(key);
        a.sync_(key as PersistentKeys, null);
      } else {
        a.storage_.setItem(key, typeof initial === "string" ? value as string : JSON.stringify(value));
        a.sync_(key as PersistentKeys, value as FullSettings[PersistentKeys]);
      }
      if (key in a.valuesToLoad_) {
        a.updatePayload_(a.valuesToLoad_[key as keyof typeof a.valuesToLoad_]
            , value as FullSettings[keyof typeof a.valuesToLoad_], a.payload_)
      }
    }
    let ref: SettingsNS.SimpleUpdateHook<K> | undefined;
    if (ref = a.updateHooks_[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref.call(a, value, key);
    }
  },
  postUpdate_: function<K extends keyof SettingsWithDefaults> (this: {}, key: K, value?: FullSettings[K]): void {
    type AllK = keyof SettingsWithDefaults;
    return (Settings_.updateHooks_[key] as SettingsNS.SimpleUpdateHook<AllK>).call(
      this as typeof Settings_,
      value !== undefined ? value : Settings_.get_(key), key);
  } as {
    <K extends SettingsNS.NullableUpdateHooks>(key: K, value?: FullSettings[K] | null): void;
    <K extends SettingsNS.EnsuredUpdateHooks | keyof SettingsWithDefaults>(key: K, value?: FullSettings[K]): void;
  },
  broadcast_<K extends kBgReq.settingsUpdate | kBgReq.url | kBgReq.keyFSM> (
      request: K extends kBgReq.settingsUpdate ? SettingsUpdateMsg : Req.bg<K>): void {
    if (request.N !== kBgReq.settingsUpdate) {
      Settings_._BroadcastSettingsUpdates(request);
    } else if ((request.d as Extract<SettingsUpdateMsg["d"], string[]>).length == null) {
      Settings_._BroadcastSettingsUpdates(request)
    } else {
      let cur = request.d as Extract<SettingsUpdateMsg["d"], string[]>,
      old = Settings_.temp_.newSettingsToBroadcast_
      if (old) {
        cur = cur.concat(old)
      } else if ((Build.MinCVer >= BrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Chrome))
          && (Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Firefox))
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) {
        queueMicrotask(Settings_._BroadcastSettingsUpdates.bind(null, request));
      } else {
        void Promise.resolve(request).then(Settings_._BroadcastSettingsUpdates)
      }
      Settings_.temp_.newSettingsToBroadcast_ = cur;
      request.d = null as never
    }
  },
  _BroadcastSettingsUpdates<K extends keyof BgReq> (this: void
      , request: K extends kBgReq.settingsUpdate ? SettingsUpdateMsg : Req.bg<K>): void {
    if (request.N === kBgReq.settingsUpdate && !request.d) {
      const obj = Settings_.temp_.newSettingsToBroadcast_!
      const d: BgReq[kBgReq.settingsUpdate]["d"] = (request as Req.bg<kBgReq.settingsUpdate>).d = {}
      for (const key of obj) {
        (d as Generalized<typeof d>)[key] = Settings_.payload_[key]
      }
      Settings_.temp_.newSettingsToBroadcast_ = null;
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.BuildMinForOf) {
      Backend_.indexPorts_().forEach((frames: Frames.Frames): void => {
        for (const port of frames.ports_) {
          port.postMessage(request as Req.baseBg<K> as Req.bg<K>)
        }
      })
    } else for (const frames of Backend_.indexPorts_().values()) { // eslint-disable-line curly
      for (let port of frames.ports_) {
        port.postMessage(request as Req.baseBg<K> as Req.bg<K>)
      }
    }
  },
  broadcastOmni_<K extends ValidBgVomnibarReq> (request: Req.bg<K>): void {
    for (const frame of Backend_.indexPorts_(GlobalConsts.VomnibarFakeTabId)) {
      frame.postMessage(request);
    }
  },
  /** @argument value may come from `LinkHints.*::characters` and `kBgCmd.toggle::value` */
  updatePayload_: function (shortKey: keyof SettingsNS.FrontendSettingsSyncingItems, value: any
      , obj?: Partial<SettingsNS.FrontendSettingCache>
      ): SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][1] {
    type SettingType<T> = T extends keyof SettingsNS.FullSettings ? SettingsNS.FullSettings[T] : never
    type ValType<T extends keyof SettingsNS.AutoSyncedItems> = SettingType<SettingsNS.AutoSyncedItems[T][0]>;
    switch (shortKey) {
    case "c": case "n": value = (value as ValType<"c" | "n">).toLowerCase().toUpperCase(); break
    case "i":
      value = value === !!value ? value
        : (value as ValType<"i">) > 1 || (value as ValType<"i">) > 0 && !Settings_.payload_.o; break
    case "l": value = value === !!value ? value ? 2 : 0 : value; break
    case "d": value = value ? " D" : ""; break
    // no default:
    }
    return obj ? (obj as Generalized<SettingsNS.FrontendSettingCache>)[shortKey] = value : value
  } as <T extends keyof (SettingsNS.FrontendSettingsSyncingItems)>
      (shortKey: T
      , value: T extends keyof SettingsNS.AutoSyncedItems ? FullSettings[SettingsNS.AutoSyncedItems[T][0]]
          : T extends keyof SettingsNS.ManuallySyncedItems
            ? T extends "d" ? FullSettings["autoDarkMode"] : SettingsNS.ManuallySyncedItems[T][1]
          : never
      , obj?: Partial<SettingsNS.FrontendSettingCache>
      ) => (SettingsNS.FrontendSettingsSyncingItems)[T][1],
  updateOmniStyles_: BgUtils_.blank_ as (key: MediaNS.kName, embed?: 1 | undefined) => void,
  updateMediaQueries_: BgUtils_.blank_ as (this: void) => void,
  updateHooks_: As_<{ [key in SettingsNS.DeclaredUpdateHooks]: SettingsNS.UpdateHook<key>; } & SafeObject>({
    __proto__: null as never,
    extAllowList (val): void {
      const old = Settings_.extAllowList_;
      const map = old || (Settings_.extAllowList_ = new Map())
      if (old && Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
        map.forEach((v, k): void => { v !== false && map.delete(k) })
      }
      if (!val) { return; }
      for (let arr = val.split("\n"), i = arr.length, wordCharRe = /^[\da-z_]/i as RegExpI; 0 <= --i; ) {
        if ((val = arr[i].trim()) && wordCharRe.test(val)) {
          map.set(val, true)
        }
      }
    },
    grabBackFocus (this: {}, value: FullSettings["grabBackFocus"]): void {
      Settings_.payload_.g = value;
    },
    newTabUrl (this: {}, url): void {
      url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(url)
        ? chrome.runtime.getURL(url) : BgUtils_.convertToUrl_(url);
      Settings_.set_("newTabUrl_f", url)
    },
    searchEngines (this: {}): void {
      const a = Settings_;
      const map = a.cache_.searchEngineMap
      map.clear()
      "searchKeywords" in a.cache_ && a.set_("searchKeywords", null);
      // Note: this requires `searchUrl` must be a valid URL
      if (!(Build.NDEBUG || BgUtils_.protocolRe_.test(a.get_("searchUrl")))) {
        console.log('Assert error: BgUtils_.protocolRe_.test(Settings_.get_("searchUrl"))');
      }
      const rules = BgUtils_.parseSearchEngines_("~:" + a.get_("searchUrl") + "\n" + a.get_("searchEngines"), map)
      return a.set_("searchEngineRules", rules);
    },
    searchUrl (str): void {
      const cache = Settings_.cache_ as WritableSettingsCache;
      const map = cache.searchEngineMap
      if (str) {
        BgUtils_.parseSearchEngines_("~:" + str, map)
      } else {
        map.clear()
        map.set("~", { name_: "~", blank_: "", url_: Settings_.get_("searchUrl").split(" ", 1)[0] })
        cache.searchEngineRules = [];
        Build.MayOverrideNewTab && Settings_.get_("focusNewTabContent", true);
        if (Settings_.get_("newTabUrl_f", true)) {
          return
        }
      }
      return Settings_.postUpdate_("newTabUrl");
    },
    mapModifier (this: {}, value: FullSettings["mapModifier"]): void {
      type DeltaType = BgVomnibarSpecialReq[kBgReq.omni_updateOptions]["d"]
      Settings_.broadcastOmni_({ N: kBgReq.omni_updateOptions, d:
        As_<Pick<DeltaType, SelectNameToKey<SettingsNS.AllVomnibarItems>["mapModifier"]>>({ a: value })
      })
    },
    vomnibarPage (this: {}, url): void {
      const a = Settings_, cur = a.storage_.getItem("vomnibarPage_f");
      if (cur && !url) {
        (a.cache_ as WritableSettingsCache).vomnibarPage_f = cur;
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
      const a = Settings_, defaultOptions = a.defaults_.vomnibarOptions,
      payload = a.omniPayload_;
      let isSame = true;
      let { actions, maxMatches, queryInterval, styles, sizes } = defaultOptions;
      if (options !== defaultOptions && options && typeof options === "object") {
        const newMaxMatches = Math.max(3, Math.min((options.maxMatches | 0) || maxMatches
            , GlobalConsts.MaxLimitOfVomnibarMatches)),
        newActions = ((options.actions || "") + "").trim(),
        newInterval = +options.queryInterval,
        newSizes = ((options.sizes || "") + "").trim(),
        newStyles = ((options.styles || "") + "").trim(),
        newQueryInterval = Math.max(0, Math.min(newInterval >= 0 ? newInterval : queryInterval, 1200));
        isSame = maxMatches === newMaxMatches && queryInterval === newQueryInterval
                  && newSizes === sizes && actions === newActions
                  && styles === newStyles;
        if (!isSame) {
          maxMatches = newMaxMatches;
          queryInterval = newQueryInterval;
          sizes = newSizes;
          styles = newStyles;
        }
        options.actions = newActions
        options.maxMatches = newMaxMatches;
        options.queryInterval = newQueryInterval;
        options.sizes = newSizes;
        options.styles = newStyles;
      }
      if (Build.BTypes & BrowserType.Firefox && a.temp_.isHighContrast_ff_
          && !(<RegExpOne> /(^|\s)high-contrast(\s|$)/).test(styles)) {
        styles += " high-contrast"
      }
      (a.cache_ as WritableSettingsCache).vomnibarOptions = isSame ? defaultOptions : options!;
      payload.n = maxMatches;
      payload.t = queryInterval;
      payload.l = sizes;
      payload.s = styles;
      a.updateOmniStyles_(MediaNS.kName.PrefersReduceMotion, 1);
      a.updateOmniStyles_(MediaNS.kName.PrefersColorScheme, 1);
      a.broadcastOmni_({ N: kBgReq.omni_updateOptions, d: {
        n: maxMatches,
        t: queryInterval,
        l: sizes,
        s: payload.s
      } });
    }
  }) as { [key in SettingsNS.DeclaredUpdateHooks]: SettingsNS.UpdateHook<key>; } as SettingsNS.FullUpdateHookMap,
  reloadCSS_: null as never as <T extends -1 | 2> (action: T, customCSS?: string
      ) => T extends -1 ? SettingsNS.MergedCustomCSS : void,
  /** can only fetch files in the `[ROOT]/front` folder */
  fetchFile_ (file: keyof SettingsNS.ReadableFiles, callback: (this: void, text: string) => any): void {
    let filePath = this.CONST_[file];
    if (!Build.NDEBUG && !filePath) { throw Error("unknown file: " + file); } // just for debugging
    filePath = "/front/" + filePath;
    if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
        || CurCVer_ >= BrowserVer.MinFetchExtensionFiles) {
      void fetch(filePath).then(r => r.text()).then(callback)
      return;
    }
    const req = new XMLHttpRequest() as TextXHR;
    req.open("GET", filePath, true);
    req.responseType = "text";
    req.onload = function (): void { callback(this.responseText) }
    req.send();
  },
  // clear localStorage & sync, if value === @defaults[key]
  // the default of all nullable fields must be set to null for compatibility with @Sync.set
  defaults_: As_<Readonly<SettingsWithDefaults> & SafeObject>({
    __proto__: null as never,
    autoDarkMode: true,
    autoReduceMotion: false,
    clipSub: `p=^git@([^/:]+):=https://$1/=
p@^https://item\\.m\\.jd\\.com/product/(\\d+)\\.html\\b@https://item.jd.com/$1.html@`,
    dialogMode: false,
    exclusionListenHash: true,
    exclusionOnlyFirstMatch: false,
    exclusionRules: [{pattern: ":https://mail.google.com/", passKeys: ""}] as ExclusionsNS.StoredRule[],
    extAllowList: !(Build.BTypes & ~BrowserType.Chrome)
      || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome
? `# modified versions of X New Tab and PDF Viewer,
# NewTab Adapter, and Shortcuts Forwarding Tool
hdnehngglnbnehkfcidabjckinphnief
nacjakoppgmdcpemlfnfegmlhipddanj
cglpcedifkgalfdklahhcchnjepcckfn
clnalilglegcjmlgenoppklmfppddien`
: !(Build.BTypes & ~BrowserType.Firefox)
  || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
? `# extension id or hostname
newtab-adapter@gdh1995.cn
shortcut-forwarding-tool@gdh1995.cn`
: "",
    filterLinkHints: false,
    findModeRawQueryList: "",
    focusNewTabContent: true,
    grabBackFocus: false,
    hideHud: false,
    ignoreCapsLock: 0,
    ignoreKeyboardLayout: 0,
    innerCSS: "",
    keyboard: [560, 33],
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    linkHintNumbers: "0123456789",
    localeEncoding: "gbk",
    mapModifier: 0,
    mouseReachable: true,
    newTabUrl: "",
    newTabUrl_f: "",
    nextPatterns: "\u4e0b\u4e00\u5c01,\u4e0b\u9875,\u4e0b\u4e00\u9875,\u4e0b\u4e00\u7ae0,\u540e\u4e00\u9875\
,next,more,newer,>,\u203a,\u2192,\xbb,\u226b,>>",
    omniBlockList: "",
    previousPatterns: "\u4e0a\u4e00\u5c01,\u4e0a\u9875,\u4e0a\u4e00\u9875,\u4e0a\u4e00\u7ae0,\u524d\u4e00\u9875\
,prev,previous,back,older,<,\u2039,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: (navigator.language as string).startsWith("zh") ? "https://www.baidu.com/s?ie=utf-8&wd=%s \u767e\u5ea6"
      : "https://www.google.com/search?q=%s Google",
    searchEngines: (navigator.language as string).startsWith("zh")
? `b|ba|baidu|Baidu|\u767e\u5ea6: https://www.baidu.com/s?ie=utf-8&wd=%s \\
  blank=https://www.baidu.com/ \u767e\u5ea6
bi: https://cn.bing.com/search?q=$s
bi|bing|Bing|\u5fc5\u5e94: https://www.bing.com/search?q=%s \\
  blank=https://cn.bing.com/ \u5fc5\u5e94
g|go|gg|google|Google|\u8c37\u6b4c: https://www.google.com/search?q=%s\\
  www.google.com re=/^(?:\\.[a-z]{2,4})?\\/search\\b.*?[#&?]q=([^#&]*)/i\\
  blank=https://www.google.com/ Google
d|ddg|duckduckgo: https://duckduckgo.com/?q=%s DuckDuckGo
qw|qwant: https://www.qwant.com/?q=%s Qwant

b.m|bm|map|b.map|bmap|\u5730\u56fe|\u767e\u5ea6\u5730\u56fe: \\
  https://api.map.baidu.com/geocoder?output=html&address=%s&src=vimium-c\\
  blank=https://map.baidu.com/
gd|gaode|\u9ad8\u5fb7\u5730\u56fe: https://www.gaode.com/search?query=%s \\
  blank=https://www.gaode.com
g.m|gm|g.map|gmap: https://www.google.com/maps?q=%s \\
  blank=https://www.google.com/maps \u8c37\u6b4c\u5730\u56fe
bili|bilibili|bz|Bili: https://search.bilibili.com/all?keyword=%s \\
  blank=https://www.bilibili.com/ \u54d4\u54e9\u54d4\u54e9
y|yt: https://www.youtube.com/results?search_query=%s \\
  blank=https://www.youtube.com/ YouTube

w|wiki: https://www.wikipedia.org/w/index.php?search=%s Wikipedia
b.x|b.xs|bx|bxs|bxueshu: https://xueshu.baidu.com/s?ie=utf-8&wd=%s \\
  blank=https://xueshu.baidu.com/ \u767e\u5ea6\u5b66\u672f
gs|g.s|gscholar|g.x|gx|gxs: https://scholar.google.com/scholar?q=$s \\
  scholar.google.com re=/^(?:\\.[a-z]{2,4})?\\/scholar\\b.*?[#&?]q=([^#&]*)/i\\
  blank=https://scholar.google.com/ \u8c37\u6b4c\u5b66\u672f

t|tb|taobao|ali|\u6dd8\u5b9d: https://s.taobao.com/search?ie=utf8&q=%s \\
  blank=https://www.taobao.com/ \u6dd8\u5b9d
j|jd|jingdong|\u4eac\u4e1c: https://search.jd.com/Search?enc=utf-8&keyword=%s\\
  blank=https://jd.com/ \u4eac\u4e1c
az|amazon: https://www.amazon.com/s/?field-keywords=%s \\
  blank=https://www.amazon.com/ \u4e9a\u9a6c\u900a

v.m|v\\:math: vimium://math\\ $S re= \u8ba1\u7b97\u5668
gh|github: https://github.com/search?q=$s \\
  blank=https://github.com/ GitHub 仓库
ge|gitee: https://search.gitee.com/?type=repository&q=$s \\
  blank=https://gitee.com/ Gitee 仓库
js\\:|Js: javascript:\\ $S; JavaScript`

: `bi: https://cn.bing.com/search?q=$s
bi|bing: https://www.bing.com/search?q=%s \\
  blank=https://www.bing.com/ Bing
b|ba|baidu|\u767e\u5ea6: https://www.baidu.com/s?ie=utf-8&wd=%s \\
  blank=https://www.baidu.com/ \u767e\u5ea6
g|go|gg|google|Google: https://www.google.com/search?q=%s \\
  www.google.com re=/^(?:\\.[a-z]{2,4})?\\/search\\b.*?[#&?]q=([^#&]*)/i\\
  blank=https://www.google.com/ Google
d|ddg|duckduckgo: https://duckduckgo.com/?q=%s DuckDuckGo
qw|qwant: https://www.qwant.com/?q=%s Qwant

g.m|gm|g.map|gmap: https://www.google.com/maps?q=%s \\
  blank=https://www.google.com/maps Google Maps
b.m|bm|map|b.map|bmap|\u767e\u5ea6\u5730\u56fe: \\
  https://api.map.baidu.com/geocoder?output=html&address=%s&src=vimium-c
y|yt: https://www.youtube.com/results?search_query=%s \\
  blank=https://www.youtube.com/ YouTube
w|wiki: https://www.wikipedia.org/w/index.php?search=%s Wikipedia
g.s|gs|gscholar: https://scholar.google.com/scholar?q=$s \\
  scholar.google.com re=/^(?:\\.[a-z]{2,4})?\\/scholar\\b.*?[#&?]q=([^#&]*)/i\\
  blank=https://scholar.google.com/ Google Scholar

a|ae|ali|alie|aliexp: https://www.aliexpress.com/wholesale?SearchText=%s \\
  blank=https://www.aliexpress.com/ AliExpress
j|jd|jb|joy|joybuy: https://www.joybuy.com/search?keywords=%s \\
  blank=https://www.joybuy.com/ Joybuy
az|amazon: https://www.amazon.com/s/?field-keywords=%s \\
  blank=https://www.amazon.com/ Amazon

v.m|v\\:math: vimium://math\\ $S re= Calculate
gh|github: https://github.com/search?q=$s \\
  blank=https://github.com/ GitHub Repo
ge|gitee: https://search.gitee.com/?type=repository&q=$s \\
  blank=https://gitee.com/ Gitee 仓库
js\\:|Js: javascript:\\ $S; JavaScript`,
    showActionIcon: true,
    showAdvancedCommands: true,
    showAdvancedOptions: true,
    showInIncognito: false,
    notifyUpdate: true,
    smoothScroll: true,
    vomnibarOptions: {
      maxMatches: 10,
      queryInterval: 333,
      sizes: VomnibarNS.PixelData.OthersIfEmpty + ","
          + (VomnibarNS.PixelData.OthersIfNotEmpty - VomnibarNS.PixelData.OthersIfEmpty) + ","
          + VomnibarNS.PixelData.Item
          ,
      styles: "mono-url",
      actions: ""
    },
    userDefinedCss: "",
    vimSync: null,
    vomnibarPage: "front/vomnibar.html",
    vomnibarPage_f: "",
    waitForEnter: true
  }),
  legacyNames_: As_<SettingsNS.LegacyNames & SafeObject>({ __proto__: null as never,
    extWhiteList: "extAllowList",
    phraseBlacklist: "omniBlockList"
  }),
  // not set localStorage, neither sync, if key in @nonPersistent
  // not clean if exists (for simpler logic)
  nonPersistent_: As_<TypedSafeEnum<SettingsNS.NonPersistentSettings>>({ __proto__: null as never,
    helpDialog: 1, searchEngineMap: 1, searchEngineRules: 1, searchKeywords: 1
  }),
  frontUpdateAllowed_: As_<ReadonlyArray<keyof SettingsNS.FrontUpdateAllowedSettings>>(["showAdvancedCommands"]),
  icons_: !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome
      ? As_<readonly [IconNS.BinaryPath, IconNS.BinaryPath, IconNS.BinaryPath]>([
    "icons/enabled.bin", "icons/partial.bin", "icons/disabled.bin"
  ]) : As_<readonly [IconNS.ImagePath, IconNS.ImagePath, IconNS.ImagePath]>([
    { 19: "/icons/enabled_19.png", 38: "/icons/enabled_38.png" },
    { 19: "/icons/partial_19.png", 38: "/icons/partial_38.png" },
    { 19: "/icons/disabled_19.png", 38: "/icons/disabled_38.png" }
  ]),
  valuesToLoad_: <SettingsNS.AutoSyncedNameMap> As_<SettingsNS.AutoSyncedNameMap & SafeObject>({
    __proto__: null as never,
    filterLinkHints: "f",
    ignoreCapsLock: "i",
    ignoreKeyboardLayout: "l",
    mapModifier: "a",
    mouseReachable: "e",
    keyboard: "k", linkHintCharacters: "c", linkHintNumbers: "n",
    regexFindMode: "r", smoothScroll: "s", scrollStepSize: "t", waitForEnter: "w"
  }),
  sync_: BgUtils_.blank_ as SettingsNS.Sync["set"],
  restore_: null as (() => Promise<void> | null) | null,
  CONST_: {
    AllowClipboardRead_: true,
    BaseCSSLength_: 0,
    // should keep lower case
    NtpNewTab_: Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
        ? Build.MayOverrideNewTab ? "https://www.msn.cn/spartan/ntp" : "h"
        : Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
        ? IsEdg_ ? "https://www.msn.cn/spartan/ntp" : "chrome-search://local-ntp/local-ntp.html" : "pages/blank.html",
    BlankNewTab_: "pages/blank.html",
    DisallowIncognito_: false,
    ContentScripts_: null as never as string[],
    VerCode_: "", VerName_: "",
    GitVer: BuildStr.Commit as string,
    Injector_: "/lib/injector.js",
    KnownPages_: ["blank", "newtab", "options", "show"],
    MathParser: "/lib/math_parser.js",
    HelpDialogJS: "/background/help_dialog.js" as const,
    InjectEnd_: "content/injected_end.js",
    NewTabForNewUser_: Build.MayOverrideNewTab ? "pages/options.html#!newTabUrl" : "",
    OverrideNewTab_: Build.MayOverrideNewTab ? true : false,
    OptionsUIOpenInTab_: Build.NoDialogUI ? true : false,
    OptionsPage_: "pages/options.html", Platform_: "browser",
    baseCSS: "vimium-c.css",
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
      changelog: "/RELEASE-NOTES.md",
      help: "/wiki",
      home: "",
      license: "/LICENSE.txt",
      permissions: "/PRIVACY-POLICY.md#permissions-required",
      policy: "/PRIVACY-POLICY.md",
      popup: "options.html",
      privacy: "/PRIVACY-POLICY.md#privacy-policy",
      readme: "#readme",
      release: "/RELEASE-NOTES.md",
      "release-notes": "/RELEASE-NOTES.md",
      settings: "options.html",
      wiki: "/wiki",
      __proto__: null as never
    },
    GlobalCommands_: null as never as StandardShortcutNames[],
    ShowPage_: "pages/show.html",
    VomnibarPageInner_: "", VomnibarScript_: "/front/vomnibar.js", VomnibarScript_f_: ""
  }
};

if (!(Build.BTypes & BrowserType.Edge) || chrome.runtime.getPlatformInfo) {
chrome.runtime.getPlatformInfo(function (info): void {
  const os = (Build.BTypes & ~BrowserType.Chrome ? info.os || "" : info.os).toLowerCase(),
  types = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinRuntimePlatformOs
    ? chrome.runtime.PlatformOs!
    : chrome.runtime.PlatformOs || { MAC: "mac", WIN: "win" },
  osEnum = os === types.WIN ? kOS.win : os === types.MAC ? kOS.mac : kOS.unixLike,
  ignoreCapsLock = Settings_.get_("ignoreCapsLock");
  Settings_.CONST_.Platform_ = os;
  (Settings_.omniPayload_ as Writable<typeof Settings_.omniPayload_>).o =
  (Settings_.payload_ as Writable<typeof Settings_.payload_>).o = osEnum;
  Settings_.updatePayload_("i", ignoreCapsLock, Settings_.payload_)
  Settings_.temp_.initing_ |= BackendHandlersNS.kInitStat.platformInfo;
  Backend_ && Backend_.onInit_!();
});
} else {
  Settings_.CONST_.Platform_ = Build.BTypes & BrowserType.Edge
    && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge) ? "win" : "unknown";
  Settings_.updatePayload_("i", Settings_.get_("ignoreCapsLock"), Settings_.payload_)
  Settings_.temp_.initing_ |= BackendHandlersNS.kInitStat.platformInfo;
}

(function (): void {
  const ref = chrome.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  ref2 = ref.content_scripts[0].js,
  settings = Settings_,
  { CONST_: obj, defaults_: defaults, valuesToLoad_, payload_ } = settings,
  // on Edge, https://www.msn.cn/spartan/ntp also works with some complicated search parameters
  // on Firefox, both "about:newtab" and "about:home" work,
  //   but "about:newtab" skips extension hooks and uses last configured URL, so it's better.
  EdgNewTab = "edge://newtab",
  CommonNewTab = Build.BTypes & BrowserType.Edge
      && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge)
    ? "about:home" : "about:newtab", ChromeNewTab = "chrome://newtab",
  ref3 = settings.newTabs_ as Map<string, Urls.NewTabType>
  function func(path: string): string {
    return (path.charCodeAt(0) === kCharCode.slash ? origin : path.startsWith(prefix) ? "" : prefix) + path;
  }
  if (Build.MayOverrideNewTab) {
    const overrides = ref.chrome_url_overrides, hasNewTab = overrides && overrides.newtab;
    settings.CONST_.OverrideNewTab_ = !!hasNewTab;
    ref3.set(func(hasNewTab || "pages/newtab.html"), Urls.NewTabType.vimium)
  }
  if (!Build.NoDialogUI) {
    const options_ui = ref.options_ui, open_in_tab = options_ui && options_ui.open_in_tab;
    settings.CONST_.OptionsUIOpenInTab_ = !!open_in_tab;
  }
  if (Build.MayOverrideNewTab && !settings.CONST_.OverrideNewTab_) {
    obj.NewTabForNewUser_ = (Build.BTypes & ~BrowserType.Chrome
        && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome))
        ? CommonNewTab : ChromeNewTab;
  }
  (defaults as SettingsWithDefaults).newTabUrl = Build.MayOverrideNewTab && settings.CONST_.OverrideNewTab_
      ? obj.NtpNewTab_
      : (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome))
      ? IsEdg_ ? EdgNewTab : ChromeNewTab : CommonNewTab;
  // note: on firefox, "about:newtab/" is invalid, but it's OKay if still marking the URL a NewTab URL.
  ref3.set(CommonNewTab, Urls.NewTabType.browser); ref3.set(CommonNewTab + "/", Urls.NewTabType.browser)
  if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
    ref3.set(ChromeNewTab, Urls.NewTabType.browser); ref3.set(ChromeNewTab + "/", Urls.NewTabType.browser)
  }
  if (Build.BTypes & BrowserType.Chrome && IsEdg_) {
    ref3.set(EdgNewTab, Urls.NewTabType.browser); ref3.set(EdgNewTab + "/", Urls.NewTabType.browser)
  }
  if (Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)) {
    const chromeNewTabPage = "chrome://new-tab-page"
    ref3.set(chromeNewTabPage, Urls.NewTabType.browser); ref3.set(chromeNewTabPage + "/", Urls.NewTabType.browser)
  }
  (settings.cache_ as WritableSettingsCache).searchEngineMap = new Map()
  obj.GlobalCommands_ = (<Array<StandardShortcutNames | kShortcutAliases>> Object.keys(ref.commands || {})
      ).map(i => i === kShortcutAliases.nextTab1 ? "nextTab" : i)
  obj.VerCode_ = ref.version;
  obj.VerName_ = ref.version_name || ref.version;
  obj.OptionsPage_ = func(ref.options_page || obj.OptionsPage_);
  obj.AllowClipboardRead_ = ref.permissions != null && ref.permissions.indexOf("clipboardRead") >= 0;
  obj.ShowPage_ = func(obj.ShowPage_);
  obj.VomnibarPageInner_ = func(defaults.vomnibarPage);
  obj.VomnibarScript_f_ = func(obj.VomnibarScript_);
  obj.HomePage_ = ref.homepage_url || obj.HomePage_;
  obj.RedirectedUrls_.release += "#" + obj.VerCode_.replace(<RegExpG> /\D/g, "");
  obj.Injector_ = func(obj.Injector_);
  ref2.push(obj.InjectEnd_);
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith
      && CurCVer_ < BrowserVer.MinSafe$String$$StartsWith
      && "".includes.name !== "includes") {
    ref2.unshift(obj.PolyFill_);
  }
  obj.ContentScripts_ = ref2.map(func);

  payload_.g = settings.get_("grabBackFocus")
  if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
    (settings.omniPayload_ as Writable<typeof settings.omniPayload_>).b = OnOther
  }
  type PayloadNames = keyof typeof valuesToLoad_;
  for (let _i in valuesToLoad_) {
    settings.updatePayload_(valuesToLoad_[_i as PayloadNames], settings.get_(_i as PayloadNames), payload_)
  }

  for (let oldKey in settings.legacyNames_) {
    let oldVal = settings.storage_.getItem(oldKey);
    if (oldVal != null) {
      settings.set_(settings.legacyNames_[oldKey as keyof typeof settings.legacyNames_], oldVal);
      settings.storage_.removeItem(oldKey);
    }
  }
  if (settings.temp_.hasEmptyLocalStorage_) {
    if (Build.MayOverrideNewTab) {
      settings.set_("newTabUrl", obj.NewTabForNewUser_);
    }
    const platform = (navigator.platform || "").toLowerCase()
    if (platform.startsWith("mac") || platform.startsWith("ip")) {
      settings.set_("ignoreKeyboardLayout", 1)
    }
  }
})();
