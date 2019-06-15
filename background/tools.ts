type CSTypes = chrome.contentSettings.ValidTypes;
type Tab = chrome.tabs.Tab;
type MarkStorage = Pick<Storage, "setItem"> & SafeDict<string>;
const Clipboard_ = {
  getTextArea_ (): HTMLTextAreaElement {
    const el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-99px";
    el.style.width = "0";
    Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
      && (el.contentEditable = "true");
    return el;
  },
  tailSpacesOrNewLineRe_: <RegExpG & RegExpSearchable<0>> /[ \t]+(\r\n?|\n)|\r\n?/g,
  format_ (data: string): string {
    data = data.replace(BgUtils_.A0Re_, " ").replace(this.tailSpacesOrNewLineRe_, "\n");
    let i = data.charCodeAt(data.length - 1);
    if (i !== kCharCode.space && i !== kCharCode.tab) { /* empty */ }
    else if (i = data.lastIndexOf("\n") + 1) {
      data = data.slice(0, i) + data.slice(i).trimRight();
    } else if ((i = data.charCodeAt(0)) !== kCharCode.space && i !== kCharCode.tab) {
      data = data.trimRight();
    }
    return data;
  },
  reformat_ (copied: string): string {
    copied = copied.replace(BgUtils_.A0Re_, " ");
    BgUtils_.resetRe_();
    return copied;
  },
  paste_: Settings_.CONST_.AllowClipboardRead_
    ? Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
  ? function (this: object): Promise<string> | null {
    const clipboard = navigator.clipboard as EnsureNonNull<Navigator["clipboard"]> | undefined;
    return (Build.MinFFVer >= FirefoxBrowserVer.MinUsable$Navigator$$Clipboard || clipboard)
      ? (clipboard as NonNullable<typeof clipboard>).readText().then(
        (this as typeof Clipboard_).reformat_)
      : null;
  } : function (this: object): string {
    const textArea = (this as typeof Clipboard_).getTextArea_();
    textArea.maxLength = GlobalConsts.MaxBufferLengthForPasting;
    (document.documentElement as HTMLHtmlElement).appendChild(textArea);
    textArea.focus();
    document.execCommand("paste");
    let value = textArea.value.slice(0, GlobalConsts.MaxBufferLengthForPasting);
    textArea.value = "";
    textArea.remove();
    textArea.removeAttribute("maxlength");
    return (this as typeof Clipboard_).reformat_(value);
  } : function (this: void): null { return null; }
},
ContentSettings_ = Build.PContentSettings ? {
  makeKey_ (this: void, contentType: CSTypes, url?: string): string {
    return "vimiumContent|" + contentType + (url ? "|" + url : "");
  },
  complain_ (this: void, contentType: CSTypes, url: string): boolean {
    const css = chrome.contentSettings;
    if (!css) {
      Backend_.showHUD_("This version of Vimium C has no permissions to set CSs");
      return true;
    }
    if (!css[contentType] || (<RegExpOne> /^[A-Z]/).test(contentType) || !css[contentType].get) {
      Backend_.showHUD_("Unknown content settings type: " + contentType);
      return true;
    }
    if (BgUtils_.protocolRe_.test(url) && !url.startsWith(BrowserProtocol_)) {
      return false;
    }
    Backend_.complain_("change its content settings");
    return true;
  },
  parsePattern_ (this: void, pattern: string, level: number): string[] {
    if (pattern.startsWith("file:")) {
      const a = Build.MinCVer >= BrowserVer.MinFailToToggleImageOnFileURL
          || CurCVer_ >= BrowserVer.MinFailToToggleImageOnFileURL ? 1 : level > 1 ? 2 : 0;
      if (a) {
        Backend_.complain_(a === 1 ? `set file CSs since Chrome ${BrowserVer.MinFailToToggleImageOnFileURL}`
          : "set CS of file folders");
        return [];
      }
      return [pattern.split(<RegExpOne> /[?#]/, 1)[0]];
    }
    if (pattern.startsWith("ftp:")) {
      Backend_.complain_("set FTP pages' content settings");
      return [];
    }
    let info: string[] = pattern.match(/^([^:]+:\/\/)([^\/]+)/) as RegExpMatchArray
      , hosts = BgUtils_.hostRe_.exec(info[2]) as RegExpExecArray & string[4]
      , result: string[], host = hosts[3] + (hosts[4] || "");
    pattern = info[1];
    result = [pattern + host + "/*"];
    if (level < 2 || BgUtils_.isIPHost_(hosts[3], 0)) { return result; }
    hosts = null as never;
    const [arr, partsNum] = BgUtils_.splitByPublicSuffix_(host),
    end = Math.min(arr.length - partsNum, level - 1);
    for (let j = 0; j < end; j++) {
      host = host.slice(arr[j].length + 1);
      result.push(pattern + host + "/*");
    }
    result.push(pattern + "*." + host + "/*");
    if (end === arr.length - partsNum && pattern === "http://") {
      result.push("https://*." + host + "/*");
    }
    return result;
  },
  Clear_ (this: void, contentType: CSTypes, tab?: Readonly<Pick<Frames.Sender, "a">>): void {
    const css = chrome.contentSettings, cs = css && css[contentType],
    kIncognito = "incognito_session_only", kRegular = "regular";
    if (!cs || !cs.clear) { return; }
    if (tab) {
      cs.clear({ scope: (tab.a ? kIncognito : kRegular) });
      return;
    }
    cs.clear({ scope: kRegular });
    cs.clear({ scope: kIncognito }, BgUtils_.runtimeError_);
    localStorage.removeItem(ContentSettings_.makeKey_(contentType));
  },
  clearCS_ (options: CommandsNS.Options, port: Port): void {
    const ty = "" + options.type as CSTypes;
    if (!this.complain_(ty, "http://a.cc/")) {
      this.Clear_(ty, port.s);
      return Backend_.showHUD_(ty + " content settings have been cleared.");
    }
  },
  toggleCS_ (count: number, options: CommandsNS.Options, tabs: [Tab]): void {
    const ty = "" + options.type as CSTypes, tab = tabs[0];
    return options.incognito ? this.ensureIncognito_(count, ty, tab)
      : this.toggleCurrent_(count, ty, tab, options.action === "reopen");
  },
  toggleCurrent_ (this: void, count: number, contentType: CSTypes, tab: Tab, reopen: boolean): void {
    const pattern = BgUtils_.removeComposedScheme_(tab.url);
    if (ContentSettings_.complain_(contentType, pattern)) { return; }
    chrome.contentSettings[contentType].get({
      primaryUrl: pattern,
      incognito: tab.incognito
    }, function (opt): void {
      ContentSettings_.setAllLevels_(contentType, pattern, count, {
        scope: tab.incognito ? "incognito_session_only" : "regular",
        setting: (opt && opt.setting === "allow") ? "block" : "allow"
      }, function (err): void {
        if (err) { return; }
        if (!tab.incognito) {
          const key = ContentSettings_.makeKey_(contentType);
          localStorage.getItem(key) !== "1" && localStorage.setItem(key, "1");
        }
        if (tab.incognito || reopen) {
          ++tab.index;
          return Backend_.reopenTab_(tab);
        } else if (tab.index > 0 && chrome.sessions) {
          return Backend_.reopenTab_(tab, true);
        }
        chrome.windows.getCurrent({populate: true}, function (wnd) {
          !wnd || wnd.type !== "normal" ? chrome.tabs.reload(BgUtils_.runtimeError_)
            : Backend_.reopenTab_(tab, wnd.tabs.length > 1 && !!chrome.sessions);
          return BgUtils_.runtimeError_();
        });
      });
    });
  },
  ensureIncognito_ (this: void, count: number, contentType: CSTypes, tab: Tab): void {
    if (Settings_.CONST_.DisallowIncognito_) {
      return Backend_.complain_("change incognito settings");
    }
    const pattern = BgUtils_.removeComposedScheme_(tab.url);
    if (ContentSettings_.complain_(contentType, pattern)) { return; }
    chrome.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function (opt): void {
      if (BgUtils_.runtimeError_()) {
        chrome.contentSettings[contentType].get({primaryUrl: pattern}, function (opt2) {
          if (opt2 && opt2.setting === "allow") { return; }
          const wndOpt: chrome.windows.CreateData = {
            type: "normal", incognito: true, focused: false, url: "about:blank"
          };
          if (Build.BTypes & BrowserType.Firefox
              && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
            delete wndOpt.focused;
          }
          chrome.windows.create(wndOpt, function (wnd: chrome.windows.Window): void {
            const leftTabId = (wnd.tabs as Tab[])[0].id;
            return ContentSettings_.setAndUpdate_(count, contentType, tab, pattern, wnd.id, true, function (): void {
              chrome.tabs.remove(leftTabId);
            });
          });
        });
        return BgUtils_.runtimeError_();
      }
      if (opt && opt.setting === "allow" && tab.incognito) {
        return ContentSettings_.updateTab_(tab);
      }
      chrome.windows.getAll(function (wnds): void {
        wnds = wnds.filter(wnd => wnd.incognito && wnd.type === "normal");
        if (!wnds.length) {
          console.log("%cContentSettings.ensure", "color:red"
            , "get incognito content settings", opt, " but can not find an incognito window.");
          return;
        } else if (opt && opt.setting === "allow") {
          return ContentSettings_.updateTab_(tab, wnds[wnds.length - 1].id);
        }
        const wndId = tab.windowId, isIncNor = tab.incognito && wnds.some(wnd => wnd.id === wndId);
        return ContentSettings_.setAndUpdate_(count, contentType, tab, pattern
          , isIncNor ? undefined : wnds[wnds.length - 1].id);
      });
    });
  },
  // `callback` must be executed
  setAndUpdate_: function (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string
      , wndId?: number, syncState?: boolean, callback?: (this: void) => void): void {
    const cb = ContentSettings_.updateTabAndWindow_.bind(null, tab, wndId, callback);
    return ContentSettings_.setAllLevels_(contentType, pattern, count
      , { scope: "incognito_session_only", setting: "allow" }
      , syncState && (wndId as number) !== tab.windowId
      ? function (err): void {
        if (err) { return cb(err); }
        chrome.windows.get(tab.windowId, cb);
      } : cb);
  } as {
    (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string
      // tslint:disable-next-line: unified-signatures
      , wndId: number, syncState: boolean, callback?: (this: void) => void): void;
    (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string, wndId?: number): void;
  },
  setAllLevels_ (this: void, contentType: CSTypes, url: string, count: number
      , settings: Readonly<Pick<chrome.contentSettings.SetDetails, "scope" | "setting">>
      , callback: (this: void, has_err: boolean) => void): void {
    let left: number, has_err = false;
    const ref = chrome.contentSettings[contentType], func = function () {
      const err = BgUtils_.runtimeError_();
      err && console.log("[%o]", Date.now(), err);
      if (has_err) { return err; }
      --left; has_err = !!<boolean> <boolean | void> err;
      if (has_err || left === 0) {
        setTimeout(callback, 0, has_err);
      }
      return err;
    }, arr = ContentSettings_.parsePattern_(url, count | 0);
    left = arr.length;
    if (left <= 0) { return callback(true); }
    BgUtils_.safer_(settings);
    for (const pattern of arr) {
      const info = BgUtils_.extendIf_(BgUtils_.safeObj_() as chrome.contentSettings.SetDetails, settings);
      info.primaryPattern = pattern;
      ref.set(info, func);
    }
  },
  updateTabAndWindow_ (this: void, tab: Tab, wndId: number | undefined, callback: ((this: void) => void) | undefined
      , oldWnd: chrome.windows.Window | boolean): void {
    if (oldWnd !== true) { ContentSettings_.updateTab_(tab, wndId); }
    callback && callback();
    if (oldWnd === true) { return; }
    wndId && chrome.windows.update(wndId, {
      focused: true,
      state: oldWnd ? oldWnd.state : undefined
    });
  },
  updateTab_ (this: void, tab: Tab, newWindowId?: number): void {
    tab.active = true;
    if (typeof newWindowId !== "number" || tab.windowId === newWindowId) {
      ++tab.index;
    } else {
      (tab as chrome.tabs.CreateProperties).index = undefined;
      tab.windowId = newWindowId;
    }
    Backend_.reopenTab_(tab);
  }
} : {
  complain_ () {
    Backend_.showHUD_("This version of Vimium C has no permissions to set CSs");
  }
} as never,
Marks_ = { // NOTE: all public members should be static
  cache_: localStorage,
  cacheI_: null as MarkStorage | null,
  _storage (): MarkStorage {
    const map: MarkStorage = BgUtils_.safeObj_();
    map.setItem = function (k: string, v: string): void { this[k] = v; };
    return map;
  },
  _set ({ l: local, n: markName, u: url, s: scroll }: MarksNS.NewMark, incognito: boolean, tabId?: number): void {
    const storage = incognito ? this.cacheI_ || (IncognitoWatcher_.watch_(), this.cacheI_ = this._storage())
      : this.cache_;
    if (local && scroll[0] === 0 && scroll[1] === 0) {
      if (scroll.length === 2) {
        const i = url.indexOf("#");
        i > 0 && i < url.length - 1 && scroll.push(url.slice(i));
      } else if ((scroll[2] || "").length < 2) { // '#' or (wrongly) ''
        scroll.pop();
      }
    }
    storage.setItem(this.getLocationKey_(markName, local ? url : "")
      , JSON.stringify<MarksNS.StoredGlobalMark | MarksNS.ScrollInfo>(local ? scroll
        : { tabId: tabId as number, url, scroll }));
  },
  _goto (port: Port, options: CmdOptions[kFgCmd.goToMarks]) {
    port.postMessage<1, kFgCmd.goToMarks>({ N: kBgReq.execute, S: null, c: kFgCmd.goToMarks, n: 1, a: options});
  },
  createMark_ (this: void, request: MarksNS.NewTopMark | MarksNS.NewMark, port: Port): void {
    let tabId = port.s.t;
    if (request.s) {
      return Marks_._set(request as MarksNS.NewMark, port.s.a, tabId);
    }
    (port = Backend_.indexPorts_(tabId, 0) || port) && port.postMessage({
      N: kBgReq.createMark,
      n: request.n,
    });
  },
  gotoMark_ (this: void, request: MarksNS.FgQuery, port: Port): void {
    const { l: local, n: markName } = request, key = Marks_.getLocationKey_(markName, local ? request.u : "");
    const str = Marks_.cacheI_ && port.s.a && Marks_.cacheI_[key] || Marks_.cache_.getItem(key);
    if (local) {
      let scroll: MarksNS.FgMark | null = str ? JSON.parse(str) as MarksNS.FgMark : null;
      if (!scroll) {
        let oldPos = (request as MarksNS.FgLocalQuery).o, x: number, y: number;
        if (oldPos && (x = +oldPos.x) >= 0 && (y = +oldPos.y) >= 0) {
          (request as MarksNS.NewMark).s = scroll = [x, y, oldPos.h];
          Marks_._set(request as MarksNS.NewMark, port.s.a);
        }
      }
      if (scroll) {
        return Marks_._goto(port, { n: markName, s: scroll, l: true });
      }
    }
    if (!str) {
      return Backend_.showHUD_(`${local ? "Local" : "Global"} mark not set : ' ${markName} '.`);
    }
    const stored = JSON.parse(str) as MarksNS.StoredGlobalMark;
    const tabId = +stored.tabId, markInfo: MarksNS.MarkToGo = {
      u: stored.url, s: stored.scroll, t: stored.tabId,
      n: markName, p: true,
    };
    markInfo.p = request.p !== false && markInfo.s[1] === 0 && markInfo.s[0] === 0 &&
        !!BgUtils_.IsURLHttp_(markInfo.u);
    if (tabId >= 0 && Backend_.indexPorts_(tabId)) {
      chrome.tabs.get(tabId, Marks_.checkTab_.bind(markInfo));
    } else {
      return Backend_.focus_(markInfo);
    }
  },
  checkTab_ (this: MarksNS.MarkToGo, tab: chrome.tabs.Tab): void {
    const url = tab.url.split("#", 1)[0];
    if (url === this.u || this.p && this.u.startsWith(url)) {
      Backend_.gotoSession_({ s: tab.id });
      return Marks_.scrollTab_(this, tab);
    } else {
      return Backend_.focus_(this);
    }
  },
  getLocationKey_ (markName: string, url: string | undefined): string {
    return (url ? "vimiumMark|" + BgUtils_.prepareReparsingPrefix_(url.split("#", 1)[0])
      : "vimiumGlobalMark") + "|" + markName;
  },
  scrollTab_ (this: void, markInfo: MarksNS.InfoToGo, tab: chrome.tabs.Tab): void {
    const tabId = tab.id, port = Backend_.indexPorts_(tabId, 0);
    port && Marks_._goto(port, { n: markInfo.n, s: markInfo.s });
    if (markInfo.t !== tabId && markInfo.n) {
      return Marks_._set(markInfo as MarksNS.MarkToGo, TabRecency_.incognito_ === IncognitoType.true, tabId);
    }
  },
  clear_ (this: void, url?: string): void {
    const key_start = Marks_.getLocationKey_("", url);
    let toRemove: string[] = [], storage = Marks_.cache_;
    for (let i = 0, end = storage.length; i < end; i++) {
      const key = storage.key(i) as string;
      if (key.startsWith(key_start)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) { storage.removeItem(key); }
    let num = toRemove.length;
    if (Marks_.cacheI_) {
      const storage2 = Marks_.cacheI_;
      for (const key in storage2) {
        if (key.startsWith(key_start)) {
          num++;
          delete storage2[key];
        }
      }
    }
    return Backend_.showHUD_(`${num} ${url ? "local" : "global"} mark${num !== 1 ? "s have" : " has"} been removed.`);
  }
},
FindModeHistory_ = {
  key_: "findModeRawQueryList" as const,
  list_: null as string[] | null,
  listI_: null as string[] | null,
  timer_: 0,
  init_ (): void {
    const str: string = Settings_.get_(this.key_);
    this.list_ = str ? str.split("\n") : [];
    this.init_ = null as never;
  },
  query_: function (incognito: boolean, query?: string, nth?: number): string | void {
    const a = FindModeHistory_;
    a.init_ && a.init_();
    const list = incognito ? a.listI_ || (IncognitoWatcher_.watch_(),
                            a.listI_ = (a.list_ as string[]).slice(0)) : (a.list_ as string[]);
    if (!query) {
      return list[list.length - (nth || 1)] || "";
    }
    if (incognito) {
      return a.refreshIn_(query, list, true);
    }
    const str = a.refreshIn_(query, list);
    str && Settings_.set_(a.key_, str);
    if (a.listI_) { return a.refreshIn_(query, a.listI_, true); }
  } as {
    (incognito: boolean, query?: undefined | "", nth?: number): string;
    (incognito: boolean, query: string, nth?: undefined): void;
    (incognito: boolean, query: string | undefined, nth: number | undefined): void | string;
  },
  refreshIn_: function (query: string, list: string[], skipResult?: boolean): string | void {
    const ind = list.lastIndexOf(query);
    if (ind >= 0) {
      if (ind === list.length - 1) { return; }
      list.splice(ind, 1);
    }
    else if (list.length >= GlobalConsts.MaxFindHistory) { list.shift(); }
    list.push(query);
    if (!skipResult) {
      return list.join("\n");
    }
  } as {
    (query: string, list: string[], skipResult?: false): string | void;
    (query: string, list: string[], skipResult: true): void;
  },
  removeAll_ (incognito: boolean): void {
    if (incognito) {
      this.listI_ && (this.listI_ = []);
      return;
    }
    this.init_ = null as never;
    this.list_ = [];
    Settings_.set_(this.key_, "");
  }
},
IncognitoWatcher_ = {
  watching_: false,
  timer_: 0,
  watch_ (): void {
    if (this.watching_) { return; }
    chrome.windows.onRemoved.addListener(this.OnWndRemoved_);
    this.watching_ = true;
  },
  OnWndRemoved_ (this: void): void {
    const _this = IncognitoWatcher_;
    if (!_this.watching_) { return; }
    _this.timer_ = _this.timer_ || setTimeout(_this.TestIncognitoWnd_, 34);
  },
  TestIncognitoWnd_ (this: void): void {
    IncognitoWatcher_.timer_ = 0;
    if (Build.MinCVer >= BrowserVer.MinNoUnmatchedIncognito || !(Build.BTypes & BrowserType.Chrome)
        || CurCVer_ >= BrowserVer.MinNoUnmatchedIncognito) {
      let left = false, arr = Backend_.indexPorts_();
      for (const i in arr) {
        if ((arr[+i] as Frames.Frames)[0].s.a) { left = true; break; }
      }
      if (left) { return; }
    }
    chrome.windows.getAll(function (wnds): void {
      wnds.some(wnd => wnd.incognito) || IncognitoWatcher_.cleanI_();
    });
  },
  cleanI_ (): void {
    FindModeHistory_.listI_ = null;
    Marks_.cacheI_ = null;
    chrome.windows.onRemoved.removeListener(this.OnWndRemoved_);
    this.watching_ = false;
  }
},
MediaWatcher_ = {
  _watchers: [
    !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinMediaQuery$PrefersReducedMotion)
      && !(Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersReducedMotion)
    ? MediaNS.Watcher.NotWatching
    : Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    ? CurCVer_ >= BrowserVer.MinMediaQuery$PrefersReducedMotion ? MediaNS.Watcher.NotWatching
      : MediaNS.Watcher.InvalidMedia
    : Build.DetectAPIOnFirefox ? MediaNS.Watcher.WaitToTest : MediaNS.Watcher.NotWatching,
    !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinMediaQuery$PrefersColorScheme)
      && !(Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme)
    ? MediaNS.Watcher.NotWatching
    : Build.BTypes & BrowserType.Chrome && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    ? CurCVer_ >= BrowserVer.MinMediaQuery$PrefersColorScheme ? MediaNS.Watcher.NotWatching
      : MediaNS.Watcher.InvalidMedia
    : MediaNS.Watcher.WaitToTest
  ] as { [k in MediaNS.kName]: MediaNS.Watcher | MediaQueryList } & Array<MediaNS.Watcher | MediaQueryList>,
  _timer: 0,
  get_ (key: MediaNS.kName): boolean | null {
    let watcher = MediaWatcher_._watchers[key];
    return typeof watcher === "object" ? watcher.matches : null;
  },
  listen_ (key: MediaNS.kName, doListen: boolean): void {
    let a = MediaWatcher_, watchers = a._watchers, cur = watchers[key],
    name = !key ? "prefers-reduced-motion" as const : "prefers-color-scheme" as const;
    if (cur === MediaNS.Watcher.WaitToTest && doListen) {
      watchers[key] = cur = matchMedia(`(${name})`).matches ? MediaNS.Watcher.NotWatching
          : MediaNS.Watcher.InvalidMedia;
    }
    if (doListen && cur === MediaNS.Watcher.NotWatching) {
      const query = matchMedia(`(${name}: ${!key ? "reduce" : "dark"})`);
      query.onchange = a.OnChange_;
      watchers[key] = query;
      if (Build.BTypes & BrowserType.Chrome
          && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
          && CurCVer_ < BrowserVer.MinMediaChangeEventsOnBackgroundPage
          && !a._timer) {
        a._timer = setInterval(MediaWatcher_.RefreshAll_, GlobalConsts.MediaWatchInterval);
      }
      a.update_(key);
    } else if (!doListen && typeof cur === "object") {
      cur.onchange = null;
      watchers[key] = MediaNS.Watcher.NotWatching;
      a.update_(key);
    }
  },
  update_ (this: void, key: MediaNS.kName, embed?: 1): void {
    const settings = Settings_, payload = settings.payload_,
    omniToggled = key ? "dark" : "less-motion",
    matched = MediaWatcher_.get_(key), bMatched = !!matched;
    if (!key) {
      if (payload.r !== bMatched) {
        payload.r = bMatched;
        embed || settings.broadcast_({ N: kBgReq.settingsUpdate, d: { r: bMatched } });
      }
    } else {
      if (!!payload.d !== bMatched) {
        payload.d = bMatched ? " D" : "";
        embed || settings.broadcast_({ N: kBgReq.settingsUpdate, d: { d: payload.d } });
      }
    }
    Backend_.setOmniStyle_({
      t: omniToggled,
      e: matched != null ? matched : ` ${settings.cache_.vomnibarOptions.styles} `.indexOf(` ${omniToggled} `) >= 0,
      b: !embed
    });
  },
  RefreshAll_: Build.BTypes & BrowserType.Chrome ? function (this: void): void {
    for (let arr = MediaWatcher_._watchers, i = arr.length; 0 <= --i; ) {
      typeof arr[i] === "object" && MediaWatcher_.update_(i);
    }
  } : 0 as never,
  OnChange_ (this: MediaQueryList): void {
    if (Build.BTypes & BrowserType.Chrome && MediaWatcher_._timer > 0) {
      clearInterval(MediaWatcher_._timer);
      MediaWatcher_._timer = -1;
    }
    MediaWatcher_.update_(MediaWatcher_._watchers.indexOf(this));
  }
},
TabRecency_ = {
  tabs_: BgUtils_.safeObj_<number>() as SafeDict<number>,
  last_: (chrome.tabs.TAB_ID_NONE || GlobalConsts.TabIdNone) as number,
  lastWnd_: (chrome.windows.WINDOW_ID_NONE || GlobalConsts.WndIdNone) as number,
  incognito_: Build.MinCVer >= BrowserVer.MinNoUnmatchedIncognito || !(Build.BTypes & BrowserType.Chrome)
      ? IncognitoType.ensuredFalse : IncognitoType.mayFalse,
  rCompare_: null as never as (a: {id: number}, b: {id: number}) => number,
};

BgUtils_.timeout_(120, function (): void {
  const cache = TabRecency_.tabs_, noneWnd = chrome.windows.WINDOW_ID_NONE || GlobalConsts.WndIdNone;
  let stamp = 1, time = 0;
  function clean(): void {
    const ref = cache;
    for (const i in ref) {
      if ((ref[i] as number) <= 896) { delete ref[i]; }
      else { (ref as EnsuredSafeDict<number>)[i] -= 895; }
    }
    stamp = 128;
  }
  function listener(info: { tabId: number }): void {
    const now = performance.now();
    if (now - time > 666) {
      cache[TabRecency_.last_] = ++stamp;
      if (stamp === 1023) { clean(); }
    }
    TabRecency_.last_ = info.tabId; time = now;
  }
  function onWndFocus(tabs: [chrome.tabs.Tab] | never[]) {
    if (!tabs) { return BgUtils_.runtimeError_(); }
    let a = tabs[0];
    if (a) {
      TabRecency_.lastWnd_ = a.windowId;
      TabRecency_.incognito_ = a.incognito ? IncognitoType.true
        : Build.MinCVer >= BrowserVer.MinNoUnmatchedIncognito || !(Build.BTypes & BrowserType.Chrome)
        ? IncognitoType.ensuredFalse : IncognitoType.mayFalse;
      return listener({ tabId: a.id });
    }
  }
  chrome.tabs.onActivated.addListener(listener);
  chrome.windows.onFocusChanged.addListener(function (windowId): void {
    if (windowId === noneWnd) { return; }
    // here windowId may pointer to a devtools window on C45 - see BrowserVer.Min$windows$APIsFilterOutDevToolsByDefault
    chrome.tabs.query({windowId, active: true}, onWndFocus);
  });
  chrome.tabs.query({currentWindow: true, active: true}, function (tabs: CurrentTabs): void {
    time = performance.now();
    const a = tabs && tabs[0];
    if (!a) { return BgUtils_.runtimeError_(); }
    TabRecency_.last_ = a.id;
    TabRecency_.lastWnd_ = a.windowId;
    TabRecency_.incognito_ = a.incognito ? IncognitoType.true
      : Build.MinCVer >= BrowserVer.MinNoUnmatchedIncognito || !(Build.BTypes & BrowserType.Chrome)
      ? IncognitoType.ensuredFalse : IncognitoType.mayFalse;
  });
  TabRecency_.rCompare_ = function (a, b): number {
    return (cache[b.id] as number) - (cache[a.id] as number);
  };

  const settings = Settings_;
  settings.updateHooks_.autoDarkMode = settings.updateHooks_.autoReduceMotion = (value: boolean
      , keyName: "autoReduceMotion" | "autoDarkMode"): void => {
    const key = keyName.length > 12 ? MediaNS.kName.PrefersReduceMotion
        : MediaNS.kName.PrefersColorScheme;
    MediaWatcher_.listen_(key, value);
  };
  settings.postUpdate_("autoDarkMode");
  settings.postUpdate_("autoReduceMotion");
  settings.updateOmniStyles_ = MediaWatcher_.update_;

  if (!Build.PContentSettings) { return; }
  for (const i of ["images", "plugins", "javascript", "cookies"] as const) {
    localStorage.getItem(ContentSettings_.makeKey_(i)) != null &&
    setTimeout(ContentSettings_.Clear_, 100, i);
  }
});

BgUtils_.copy_ = Build.BTypes & BrowserType.Firefox
    && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
    && (Build.MinFFVer >= FirefoxBrowserVer.MinUsable$Navigator$$Clipboard || navigator.clipboard)
? function (this: void, data: string): void {
  (navigator.clipboard as EnsureNonNull<Navigator["clipboard"]>).writeText(Clipboard_.format_(data));
} : function (this: void, data: string): void {
  data = Clipboard_.format_(data);
  const textArea = Clipboard_.getTextArea_();
  textArea.value = data;
  (document.documentElement as HTMLHtmlElement).appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
  textArea.value = "";
  BgUtils_.resetRe_();
};
(Backend_.onInit_ as NonNullable<BackendHandlersNS.BackendHandlers["onInit_"]>)();

chrome.extension.isAllowedIncognitoAccess &&
chrome.extension.isAllowedIncognitoAccess(function (isAllowedAccess): void {
  Settings_.CONST_.DisallowIncognito_ = isAllowedAccess === false;
});
