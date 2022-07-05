import {
  contentPayload_, extAllowList_, newTabUrls_, omniPayload_, OnChrome, OnEdge, OnFirefox, framesForOmni_, sync_, IsEdg_,
  settingsCache_, bgIniting_, set_bgIniting_, CurCVer_, CONST_, OnOther_, onInit_, storageCache_, searchEngines_,
  set_hasEmptyLocalStorage_, set_newTabUrl_f, newTabUrl_f, set_vomnibarPage_f, IsLimited, updateHooks_,set_CurFFVer_,
  CurFFVer_, set_os_, os_
} from "./store"
import { asyncIter_, nextTick_, safeObj_ } from "./utils"
import { browser_, normalizeExtOrigin_, Qs_ } from "./browser"
import { convertToUrl_, reformatURL_ } from "./normalize_urls"
import { parseSearchEngines_ } from "./parse_urls"
import { asyncIterFrames_ } from "./ports"
import SettingsWithDefaults = SettingsNS.SettingsWithDefaults

type SettingsUpdateMsg = {
  [K in keyof Req.bg<kBgReq.settingsUpdate>]: K extends "d"
      ? Array<keyof SettingsNS.FrontendSettingsSyncingItems> | SettingsNS.FrontendSettingCache
      : Req.bg<kBgReq.settingsUpdate>[K]
}
type PersistentKeys = keyof SettingsNS.PersistentSettings

let newSettingsToBroadcast_: Extract<SettingsUpdateMsg["d"], string[]> | null = null
let toSaveCache: SafeDict<unknown> | null = null

export const legacyStorage_ = Build.MV3 && IsLimited ? null : localStorage
export const local_ = browser_.storage.local
export const ready_: Promise<number> = Promise.all([
  OnFirefox ? browser_.runtime.getBrowserInfo().then((info): 0 | void => {
    const versionStr = info && info.version, ver = parseInt(versionStr || "0") || 0
    CONST_.BrowserName_ = info && info.name || ""
    set_CurFFVer_(ver || CurFFVer_)
    ; (contentPayload_.v as FirefoxBrowserVer) = (omniPayload_.v as FirefoxBrowserVer) = CurFFVer_
    if (Build.MinFFVer <= FirefoxBrowserVer.ESRPopupBlockerPassClicksFromExtensions
        && ver === FirefoxBrowserVer.ESRPopupBlockerPassClicksFromExtensions) {
      (contentPayload_.V as number) = parseInt(versionStr!.split(".")[1]) || 0
    }
  }) : 0,
  !OnEdge || browser_.runtime.getPlatformInfo ? Qs_(browser_.runtime.getPlatformInfo).then((info): void => {
    const os = (OnChrome ? info.os : info.os || "").toLowerCase(),
    types = !(Build.OS & (Build.OS - 1)) ? null as never : !OnChrome || Build.MinCVer >= BrowserVer.MinRuntimePlatformOs
      ? browser_.runtime.PlatformOs! : browser_.runtime.PlatformOs || { MAC: "mac", WIN: "win" },
    osEnum = !(Build.OS & (Build.OS - 1)) || os === types.WIN ? kOS.win : os === types.MAC ? kOS.mac : kOS.unixLike
    CONST_.Platform_ = os
    if (Build.OS & (Build.OS - 1)) {
      (omniPayload_ as Writable<typeof omniPayload_>).o = (contentPayload_ as Writable<typeof contentPayload_>).o
          = osEnum
      set_os_!(osEnum)
    }
  }) : void (CONST_.Platform_ = "win"),
  Qs_(local_.get.bind(local_)).then((items): number => { // Q_(local_.get) is illegal on Edge 98
    const cache = settingsCache_ as Generalized<SettingsWithDefaults>
    Object.assign(cache, defaults_)
    items = items || {}
    for (let item of Object.entries!(items)) {
      if (item[0] in defaults_) {
        cache[item[0] as PersistentKeys] = item[1] as string | number | boolean
      } else {
        storageCache_.set!(item[0] as SettingsNS.LocalSettingNames, item[1] as string)
      }
    }
    let n = 0
    if (legacyStorage_) {
      n = legacyStorage_.length
      for (let i = 0; i < n; i++) {
        const key: string = legacyStorage_.key(i)!, str = legacyStorage_.getItem(key)!
        if (key in defaults_) {
          const initial = defaults_[key as PersistentKeys]
          const value = typeof initial === "string" ? str
              : initial === false || initial === true ? str === "true" : JSON.parse<typeof initial>(str)
          cache[key as PersistentKeys] = value
        } else {
          storageCache_.set!(key as SettingsNS.LocalSettingNames, str)
        }
      }
    }
    const done = n + Object.keys(items).length
    set_hasEmptyLocalStorage_(done === 0)
    contentPayload_.g = (cache as typeof settingsCache_).grabBackFocus
    type kPayload = keyof typeof valuesToLoad_;
    for (let _i in valuesToLoad_) {
      updatePayload_(valuesToLoad_[_i as kPayload], (cache as typeof settingsCache_)[_i as kPayload], contentPayload_)
    }
    omniPayload_.a = contentPayload_.a
    omniPayload_.l = contentPayload_.l
    return done
  })
]).then((i): number => {
  updatePayload_("i", settingsCache_.ignoreCapsLock, contentPayload_)
  set_bgIniting_(bgIniting_ | BackendHandlersNS.kInitStat.settings)
  return i[2]
})

void ready_.then((): void => { onInit_ && onInit_() })

export const set_ = <K extends keyof SettingsWithDefaults> (key: K, value: SettingsWithDefaults[K]): void => {
    (settingsCache_ as Generalized<SettingsWithDefaults>)[key] = value
    if (!toSaveCache) { toSaveCache = safeObj_(), setTimeout(saveAllLocally, 0) }
    const initial = defaults_[key as PersistentKeys]
    Build.MV3 || legacyStorage_!.removeItem(key)
    toSaveCache[key] = value !== initial ? value : null
    sync_(key, value)
      if (key in valuesToLoad_) {
        updatePayload_(valuesToLoad_[key as keyof typeof valuesToLoad_]
            , value as SettingsWithDefaults[keyof typeof valuesToLoad_], contentPayload_)
      }
    let ref: SettingsNS.SimpleUpdateHook<K> | undefined;
    if (ref = updateHooks_[key as keyof SettingsWithDefaults] as (SettingsNS.UpdateHook<K> | undefined)) {
      return ref(value, key)
    }
}

export const setInLocal_ = (key: SettingsNS.LocalSettingNames, value: string | null): void => {
  const old = storageCache_.get(key)
  if ((old !== undefined ? old : null) === value) { return }
  if (!toSaveCache) { toSaveCache = safeObj_(), setTimeout(saveAllLocally, 0) }
  toSaveCache[key] = value
  if (value !== null) {
    storageCache_.set!(key, value)
  } else {
    storageCache_.delete!(key)
  }
}

const saveAllLocally = (): void => {
  const toSet = toSaveCache!, toRemove: string[] = []
  toSaveCache = null
  for (let [key, value] of Object.entries!(toSet)) {
    value === null && (toRemove.push(key), delete toSet[key])
  }
  local_.remove(toRemove)
  local_.set(toSet)
}

export const postUpdate_ = (<K extends keyof SettingsWithDefaults> (key: K, value?: SettingsWithDefaults[K]): void => {
    type AllK = keyof SettingsWithDefaults;
    return (updateHooks_[key] as SettingsNS.SimpleUpdateHook<AllK>)(value !== undefined ? value
        : settingsCache_[key], key)
}) as {
    <K extends SettingsNS.NullableUpdateHooks>(key: K, value?: SettingsWithDefaults[K] | null): void
    <K extends keyof SettingsWithDefaults>(key: K, value?: SettingsWithDefaults[K]): void
}
export const broadcast_ = <K extends kBgReq.settingsUpdate | kBgReq.url | kBgReq.keyFSM> (
      request: K extends kBgReq.settingsUpdate ? SettingsUpdateMsg : Req.bg<K>): void => {
    if (request.N !== kBgReq.settingsUpdate) {
      _BroadcastSettingsUpdates(request)
    } else if ((request.d as Extract<SettingsUpdateMsg["d"], string[]>).length == null) {
      _BroadcastSettingsUpdates(request)
    } else {
      let cur = request.d as Extract<SettingsUpdateMsg["d"], string[]>,
      old = newSettingsToBroadcast_
      if (old) {
        cur = cur.concat(old)
      } else {
        nextTick_(_BroadcastSettingsUpdates.bind(null, request))
      }
      newSettingsToBroadcast_ = cur
      request.d = null as never
    }
}

const _BroadcastSettingsUpdates = <K extends keyof BgReq> (
      request: K extends kBgReq.settingsUpdate ? SettingsUpdateMsg : Req.bg<K>): void => {
    if (request.N === kBgReq.settingsUpdate && !request.d) {
      const obj = newSettingsToBroadcast_!
      const d: BgReq[kBgReq.settingsUpdate]["d"] = (request as Req.bg<kBgReq.settingsUpdate>).d = {}
      for (const key of obj) {
        (d as Generalized<typeof d>)[key] = contentPayload_[key]
      }
      newSettingsToBroadcast_ = null
    }
    asyncIterFrames_((frames: Frames.Frames): void => {
      for (const port of frames.ports_) {
        port.postMessage(request as Req.baseBg<K> as Req.bg<K>)
      }
    })
}

export const broadcastOmni_ = <K extends ValidBgVomnibarReq> (request: Req.bg<K>): void => {
  asyncIter_(framesForOmni_.slice(0), (frame): number => {
    framesForOmni_.includes(frame) && frame.postMessage(request)
    return 1
  })
}

  /** @argument value may come from `LinkHints.*::characters` and `kBgCmd.toggle::value` */
export const updatePayload_ = function (shortKey: keyof SettingsNS.FrontendSettingsSyncingItems, value: any
      , obj?: Partial<SettingsNS.FrontendSettingCache>
      ): SettingsNS.FrontendSettingsSyncingItems[keyof SettingsNS.FrontendSettingsSyncingItems][1] {
    type SettingType<T> = T extends keyof SettingsWithDefaults ? SettingsWithDefaults[T] : never
    type ValType<T extends keyof SettingsNS.AutoSyncedItems> = SettingType<SettingsNS.AutoSyncedItems[T][0]>;
    switch (shortKey) {
    case "c": case "n": value = (value as ValType<"c" | "n">).toLowerCase().toUpperCase(); break
    case "i":
      value = value === !!value ? value
        : (value as ValType<"i">) > 1 || (value as ValType<"i">) > 0 && (!!(Build.OS & (1 << kOS.mac)) && !os_); break
    case "l":
      value = value === !!value ? value ? kKeyLayout.alwaysIgnore : kKeyLayout.NONE | 0xfc
          : (value & 2 ? kKeyLayout.alwaysIgnore : value & 1 ? kKeyLayout.ignoreIfAlt : kKeyLayout.NONE
              ) | (value & 0xfc || 0xfc)
      break
    case "d": value = value ? " D" : ""; break
    // no default:
    }
    return obj ? (obj as Generalized<SettingsNS.FrontendSettingCache>)[shortKey] = value : value
} as <T extends keyof (SettingsNS.FrontendSettingsSyncingItems)> (shortKey: T
      , value: T extends keyof SettingsNS.AutoSyncedItems ? SettingsWithDefaults[SettingsNS.AutoSyncedItems[T][0]]
          : T extends keyof SettingsNS.ManuallySyncedItems
            ? T extends "d" ? SettingsWithDefaults["autoDarkMode"] : SettingsNS.ManuallySyncedItems[T][1]
          : never
      , obj?: Partial<SettingsNS.FrontendSettingCache>
) => (SettingsNS.FrontendSettingsSyncingItems)[T][1]

Object.assign(updateHooks_, As_<{ [key in SettingsNS.DeclaredUpdateHooks]: SettingsNS.UpdateHook<key> }>({
    extAllowList (val): void {
      const map = extAllowList_
      map.forEach((v, k): void => { v !== false && map.delete(k) })
      if (!val) { return; }
      for (let arr = val.split("\n"), i = arr.length, wordCharRe = /^[\da-z_]/i as RegExpI; 0 <= --i; ) {
        if ((val = arr[i].trim()) && wordCharRe.test(val)) {
          map.set(val, true)
        }
      }
    },
    grabBackFocus (value: SettingsWithDefaults["grabBackFocus"]): void { contentPayload_.g = value },
    ignoreKeyboardLayout (): void {
      omniPayload_.l = contentPayload_.l
      broadcastOmni_({ N: kBgReq.omni_updateOptions, d: { l: contentPayload_.l } })
    },
    newTabUrl (url): void {
      url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(url)
        ? browser_.runtime.getURL(url) : normalizeExtOrigin_(convertToUrl_(url))
      set_newTabUrl_f(url)
      setInLocal_("newTabUrl_f", url)
    },
    searchEngines (): void {
      searchEngines_.map.clear()
      searchEngines_.keywords = null
      searchEngines_.rules = parseSearchEngines_("~:" + settingsCache_.searchUrl + "\n" + settingsCache_.searchEngines
          , searchEngines_.map).reverse()
    },
    searchUrl (str): void {
      const map = searchEngines_.map
      if (str) {
        parseSearchEngines_("~:" + str, map)
      } else {
        map.clear()
        map.set("~", { name_: "~", blank_: "", url_: settingsCache_.searchUrl.split(" ", 1)[0] })
        searchEngines_.rules = []
        set_newTabUrl_f(storageCache_.get("newTabUrl_f") || "")
        if (newTabUrl_f) { return }
      }
      postUpdate_("newTabUrl")
    },
    mapModifier (value: SettingsWithDefaults["mapModifier"]): void {
      type DeltaType = BgVomnibarSpecialReq[kBgReq.omni_updateOptions]["d"]
      broadcastOmni_({ N: kBgReq.omni_updateOptions, d:
        As_<Pick<DeltaType, SelectNameToKey<SettingsNS.AllVomnibarItems>["mapModifier"]>>({ a: value })
      })
    },
    vomnibarPage (url): void {
      const cur = storageCache_.get("vomnibarPage_f")
      if (cur && !url) {
        set_vomnibarPage_f(cur)
        return;
      }
      url = url ? normalizeExtOrigin_(url) : settingsCache_.vomnibarPage
      if (url === defaults_.vomnibarPage) {
        url = CONST_.VomnibarPageInner_
      } else if (url.startsWith("front/")) {
        url = browser_.runtime.getURL(url)
      } else {
        url = convertToUrl_(url)
        url = reformatURL_(url)
        if (OnChrome && Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
            && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
            && !url.startsWith(CONST_.BrowserProtocol_)) {
          url = CONST_.VomnibarPageInner_
        } else {
          url = url.replace(":version", `${parseFloat(CONST_.VerCode_)}`)
        }
      }
      set_vomnibarPage_f(url)
      setInLocal_("vomnibarPage_f", url)
    }
}))

  // the default of all nullable fields must be set to null for compatibility with @Sync.set
export const defaults_ = As_<Readonly<SettingsWithDefaults> & SafeObject>({
    __proto__: null as never,
    allBrowserUrls: false,
    autoDarkMode: 2,
    autoReduceMotion: 2,
    clipSub: `p=^git@([^/:]+):=https://$1/=
s@^https://(?:www\\.)?google\\.com(?:\\.[^/]+)?/url\\?(?:[^&#]+&)*?url=([^&#]+)@$1@,matched,decodecomp
p@^https://item\\.m\\.jd\\.com/product/(\\d+)\\.html\\b@https://item.jd.com/$1.html@`,
    exclusionListenHash: true,
    exclusionOnlyFirstMatch: false,
    exclusionRules: [{pattern: ":https://mail.google.com/", passKeys: ""}] as ExclusionsNS.StoredRule[],
    extAllowList: OnChrome
? `# modified versions of X New Tab and PDF Viewer,
# NewTab Adapter, and Shortcuts Forwarding Tool
hdnehngglnbnehkfcidabjckinphnief
nacjakoppgmdcpemlfnfegmlhipddanj
cglpcedifkgalfdklahhcchnjepcckfn
clnalilglegcjmlgenoppklmfppddien
# EdgeTranslate
bocbaocobfecmglnmeaeppambideimao
bfdogplmndidlpjfhoijckpakkdjkkil
# SalaDict
cdonnmffkdaoajfknoeeecmchibpmkmg
idghocbbahafpfhjnfhpbfbmpegphmmp`
: OnFirefox
? `# extension id or hostname
newtab-adapter@gdh1995.cn
shortcut-forwarding-tool@gdh1995.cn
nickyfeng@edgetranslate.com
saladict@crimx.com`
: "",
    filterLinkHints: false,
    grabBackFocus: false,
    hideHud: false,
    ignoreCapsLock: 0,
    ignoreKeyboardLayout: 0,
    keyboard: [560, 33],
    keyupTime: 120,
    keyMappings: "",
    linkHintCharacters: "sadjklewcmpgh",
    linkHintNumbers: "0123456789",
    localeEncoding: "gbk",
    mapModifier: 0,
    mouseReachable: true,
    /** mutable */ newTabUrl: "",
    nextPatterns: "\u4e0b\u4e00\u5c01,\u4e0b\u9875,\u4e0b\u4e00\u9875,\u4e0b\u4e00\u7ae0,\u540e\u4e00\u9875\
,\u4e0b\u4e00\u5f20,next,more,newer,>,\u203a,\u2192,\xbb,\u226b,>>",
    omniBlockList: "",
    passEsc: "[aria-controls],[role=combobox],#kw.s_ipt", // MS Bing / Google / Baidu
    previousPatterns: "\u4e0a\u4e00\u5c01,\u4e0a\u9875,\u4e0a\u4e00\u9875,\u4e0a\u4e00\u7ae0,\u524d\u4e00\u9875\
,\u4e0a\u4e00\u5f20,prev,previous,back,older,<,\u2039,\u2190,\xab,\u226a,<<",
    regexFindMode: false,
    scrollStepSize: 100,
    searchUrl: (navigator.language as string).startsWith("zh") ? "https://www.baidu.com/s?ie=utf-8&wd=%s \u767e\u5ea6"
      : "https://www.google.com/search?q=%s Google",
    searchEngines: (navigator.language as string).startsWith("zh")
? `b|ba|baidu|Baidu|\u767e\u5ea6: https://www.baidu.com/s?ie=utf-8&wd=%s \\
  blank=https://www.baidu.com/ \u767e\u5ea6
bi: https://www.bing.com/search?q=$s
bi|bing|Bing|\u5fc5\u5e94: https://cn.bing.com/search?q=%s \\
  blank=https://cn.bing.com/ \u5fc5\u5e94
g|go|gg|google|Google|\u8c37\u6b4c: https://www.google.com/search?q=%s\\
  www.google.com re=/^(?:\\.[a-z]{2,4})?\\/search\\b.*?[#&?]q=([^#&]*)/i\\
  blank=https://www.google.com/ Google
br|brave: https://search.brave.com/search?q=%s Brave
d|dd|ddg|duckduckgo: https://duckduckgo.com/?q=%s DuckDuckGo
ec|ecosia: https://www.ecosia.org/search?q=%s Ecosia
qw|qwant: https://www.qwant.com/?q=%s Qwant
ya|yd|yandex: https://yandex.com/search/?text=%s Yandex
yh|yahoo: https://search.yahoo.com/search?p=%s Yahoo
maru|mailru|mail.ru: https://go.mail.ru/search?q=%s Mail.ru

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
az|amazon: https://www.amazon.com/s?k=%s \\
  blank=https://www.amazon.com/ \u4e9a\u9a6c\u900a

\\:i: vimium://sed/s/^//,lower\\ $S re= Lower case
v.m|math: vimium://math\\ $S re= \u8ba1\u7b97\u5668
v.p: vimium://parse\\ $S re= Redo Search
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
br|brave: https://search.brave.com/search?q=%s Brave
d|dd|ddg|duckduckgo: https://duckduckgo.com/?q=%s DuckDuckGo
ec|ecosia: https://www.ecosia.org/search?q=%s Ecosia
qw|qwant: https://www.qwant.com/?q=%s Qwant
ya|yd|yandex: https://yandex.com/search/?text=%s Yandex
yh|yahoo: https://search.yahoo.com/search?p=%s Yahoo
maru|mailru|mail.ru: https://go.mail.ru/search?q=%s Mail.ru

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
az|amazon: https://www.amazon.com/s?k=%s \\
  blank=https://www.amazon.com/ Amazon

\\:i: vimium://sed/s/^//,lower\\ $S re= Lower case
v.m|math: vimium://math\\ $S re= Calculate
v.p: vimium://parse\\ $S re= Redo Search
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
      actions: "" as never,
      maxMatches: 10,
      queryInterval: 333,
      sizes: VomnibarNS.PixelData.OthersIfEmpty + ","
          + (VomnibarNS.PixelData.OthersIfNotEmpty - VomnibarNS.PixelData.OthersIfEmpty) + ","
          + VomnibarNS.PixelData.Item + "," + VomnibarNS.PixelData.WindowSizeX
          ,
      styles: "mono-url"
    },
    userDefinedCss: "",
    vimSync: null,
    vomnibarPage: "front/vomnibar.html",
    waitForEnter: true
})

export const frontUpdateAllowed_ = As_<ReadonlyArray<keyof SettingsNS.FrontUpdateAllowedSettings>>([
  "showAdvancedCommands"
])

export const valuesToLoad_ = <SettingsNS.AutoSyncedNameMap> As_<SettingsNS.AutoSyncedNameMap & SafeObject>({
    __proto__: null as never,
    filterLinkHints: "f",
    ignoreCapsLock: "i",
    ignoreKeyboardLayout: "l",
    mapModifier: "a",
    mouseReachable: "e",
    keyboard: "k", keyupTime: "u", linkHintCharacters: "c", linkHintNumbers: "n", passEsc: "p",
    regexFindMode: "r", smoothScroll: "s", scrollStepSize: "t", waitForEnter: "w"
})

bgIniting_ < BackendHandlersNS.kInitStat.FINISHED && ((): void => {
  const ref = browser_.runtime.getManifest(), { origin } = location, prefix = origin + "/",
  ref2 = ref.content_scripts[0].js,
  obj = CONST_,
  // on Edge, https://www.msn.cn/spartan/ntp also works with some complicated search parameters
  // on Firefox, both "about:newtab" and "about:home" work,
  //   but "about:newtab" skips extension hooks and uses last configured URL, so it's better.
  EdgNewTab = "edge://newtab",
  CommonNewTab = OnEdge ? "about:home" : "about:newtab", ChromeNewTab = "chrome://newtab",
  ref3 = newTabUrls_ as Map<string, Urls.NewTabType>,
  func = (path: string): string => {
    return (path.charCodeAt(0) === kCharCode.slash ? origin : path.startsWith(prefix) ? "" : prefix) + path;
  }
  (defaults_ as SettingsWithDefaults).newTabUrl = OnChrome ? IsEdg_ ? EdgNewTab : ChromeNewTab : CommonNewTab
  // note: on firefox, "about:newtab/" is invalid, but it's OKay if still marking the URL a NewTab URL.
  ref3.set(CommonNewTab, Urls.NewTabType.browser); ref3.set(CommonNewTab + "/", Urls.NewTabType.browser)
  if (OnChrome) {
    ref3.set(ChromeNewTab, Urls.NewTabType.browser); ref3.set(ChromeNewTab + "/", Urls.NewTabType.browser)
    // should not add "chrome://new-tab-page" to newTabUrl, since it can be opened manually and the tab.url keeps it
    if (IsEdg_) {
      ref3.set(EdgNewTab, Urls.NewTabType.browser); ref3.set(EdgNewTab + "/", Urls.NewTabType.browser)
    }
    const chromeNewTabPage = "chrome://new-tab-page"
    ref3.set(chromeNewTabPage, Urls.NewTabType.cNewNTP); ref3.set(chromeNewTabPage + "/", Urls.NewTabType.cNewNTP)
  }
  obj.GlobalCommands_ = (<Array<StandardShortcutNames | kShortcutAliases>> Object.keys(ref.commands || {})
      ).map(i => i === kShortcutAliases.nextTab1 ? "nextTab" : i)
  obj.VerCode_ = ref.version;
  obj.VerName_ = ref.version_name || ref.version;
  obj.OptionsPage_ = func(ref.options_page || obj.OptionsPage_);
  obj.AllowClipboardRead_ = ref.permissions != null && ref.permissions.indexOf("clipboardRead") >= 0;
  obj.ShowPage_ = func(obj.ShowPage_);
  obj.VomnibarPageInner_ = func(defaults_.vomnibarPage)
  obj.VomnibarScript_f_ = func(obj.VomnibarScript_);
  obj.HomePage_ = ref.homepage_url || obj.HomePage_;
  obj.Injector_ = func(obj.Injector_);
  ref2.push("content/injected_end.js")
  if (OnChrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith
      && CurCVer_ < BrowserVer.MinSafe$String$$StartsWith
      && "".includes.name !== "includes") {
    ref2.unshift("lib/polyfill.js")
  }
  obj.ContentScripts_ = ref2.map(func);

  if (!Build.BTypes || Build.BTypes & (Build.BTypes - 1)) {
    (omniPayload_ as Writable<typeof omniPayload_>).b = OnOther_
  }
})()
