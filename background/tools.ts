type CSTypes = chrome.contentSettings.ValidTypes;
type Tab = chrome.tabs.Tab;
const VClipboard = {
  getTextArea (): HTMLTextAreaElement {
    const el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-99px";
    el.style.width = "0";
    this.getTextArea = () => el;
    return el;
  },
  tailSpacesRe: <RegExpG & RegExpSearchable<0>> /[ \t]+\n/g,
  format (data: string): string {
    data = data.replace(Utils.A0Re, " ").replace(this.tailSpacesRe, "\n");
    let i = data.charCodeAt(data.length - 1);
    if (i !== KnownKey.space && i !== KnownKey.tab) {
    } else if (i = data.lastIndexOf('\n') + 1) {
      data = data.substring(0, i) + data.substring(i).trimRight();
    } else if ((i = data.charCodeAt(0)) !== KnownKey.space && i !== KnownKey.tab) {
      data = data.trimRight();
    }
    return data;
  },
  copy (data: string): void | Promise<string> {
    data = this.format(data);
    const textArea = this.getTextArea();
    textArea.value = data;
    (document.documentElement as HTMLHtmlElement).appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    textArea.value = "";
    Utils.resetRe();
  },
  paste (): string | null | Promise<string | null> {
    if (!Settings.CONST.AllowClipboardRead) { return null; }
    const textArea = this.getTextArea();
    (document.documentElement as HTMLHtmlElement).appendChild(textArea);
    textArea.focus();
    document.execCommand("paste");
    let value = textArea.value;
    textArea.remove();
    textArea.value = "";
    value = value.replace(Utils.A0Re, " ");
    Utils.resetRe();
    return value;
  }
},
ContentSettings = {
  makeKey (this: void, contentType: CSTypes, url?: string): string {
    return "vimiumContent|" + contentType + (url ? "|" + url : "");
  },
  onRuntimeError (this: void): void { return chrome.runtime.lastError; },
  complain (this: void, contentType: CSTypes, url: string): boolean {
    if (!chrome.contentSettings) {
      Backend.showHUD("This version of Vimium++ has no permissions to set CSs");
      return true;
    }
    if (!chrome.contentSettings[contentType] || (<RegExpOne>/^[A-Z]/).test(contentType)) {
      Backend.showHUD("Unknown content settings type: " + contentType);
      return true;
    }
    if (Utils.protocolRe.test(url) && !url.startsWith("chrome")) {
      return false;
    }
    Backend.complain("change its content settings");
    return true;
  },
  parsePattern (this: void, pattern: string, level: number): string[] {
    if (pattern.startsWith("file:")) {
      const a = Settings.CONST.ChromeVersion >= BrowserVer.MinFailToToggleImageOnFileURL ? 1 : level > 1 ? 2 : 0;
      if (a) {
        Backend.complain(a === 1 ? `set file CSs since Chrome ${BrowserVer.MinFailToToggleImageOnFileURL}` : "set CS of file folders");
        return [];
      }
      return [pattern.split(<RegExpOne>/[?#]/, 1)[0]];
    }
    if (pattern.startsWith("ftp:")) {
      Backend.complain("set FTP pages' content settings");
      return [];
    }
    let info: string[] = pattern.match(/^([^:]+:\/\/)([^\/]+)/) as RegExpMatchArray
      , hosts = Utils.hostRe.exec(info[2]) as RegExpExecArray & string[4]
      , result: string[], host = hosts[3] + (hosts[4] || "");
    pattern = info[1];
    result = [pattern + host + "/*"];
    if (level < 2 || Utils.isIPHost(hosts[3])) { return result; }
    hosts = null as never;
    const arr = host.toLowerCase().split("."), i = arr.length,
    minLen = Utils.isTld(arr[i - 1]) === Urls.TldType.NotTld ? 1
      : i > 2 && arr[i - 1].length === 2 && Utils.isTld(arr[i - 2]) === Urls.TldType.ENTld ? 3 : 2,
    end = Math.min(arr.length - minLen, level - 1);
    for (let j = 0; j < end; j++) {
      host = host.substring(arr[j].length + 1);
      result.push(pattern + host + "/*");
    }
    result.push(pattern + "*." + host + "/*");
    if (end === arr.length - minLen && pattern === "http://") {
      result.push("https://*." + host + "/*");
    }
    return result;
  },
  Clear (this: void, contentType: CSTypes, tab?: Readonly<{ incognito: boolean }> ): void {
    if (!chrome.contentSettings) { return; }
    const cs = chrome.contentSettings[contentType];
    if (!cs || !cs.clear) { return; }
    if (tab) {
      cs.clear({ scope: (tab.incognito ? "incognito_session_only" : "regular") });
      return;
    }
    cs.clear({ scope: "regular" });
    cs.clear({ scope: "incognito_session_only" }, ContentSettings.onRuntimeError);
    localStorage.removeItem(ContentSettings.makeKey(contentType));
  },
  clearCS (options: CommandsNS.Options, port: Port): void {
    const ty = "" + options.type as CSTypes;
    if (!this.complain(ty, "https://a.cc/")) {
      this.Clear(ty, port.sender);
      return Backend.showHUD(ty + " content settings have been cleared.");
    }
  },
  toggleCS (count: number, options: CommandsNS.Options, tabs: [Tab]): void {
    const ty = "" + options.type as CSTypes, tab = tabs[0];
    return options.incognito ? this.ensureIncognito(count, ty, tab)
      : this.toggleCurrent(count, ty, tab, options.action === "reopen");
  },
  toggleCurrent (this: void, count: number, contentType: CSTypes, tab: Tab, reopen: boolean): void {
    const pattern = Utils.removeComposedScheme(tab.url);
    if (ContentSettings.complain(contentType, pattern)) { return; }
    chrome.contentSettings[contentType].get({
      primaryUrl: pattern,
      incognito: tab.incognito
    }, function (opt): void {
      ContentSettings.setAllLevels(contentType, pattern, count, {
        scope: tab.incognito ? "incognito_session_only" : "regular",
        setting: (opt && opt.setting === "allow") ? "block" : "allow"
      }, function(err): void {
        if (err) { return; }
        if (!tab.incognito) {
          const key = ContentSettings.makeKey(contentType);
          localStorage.getItem(key) !== "1" && localStorage.setItem(key, "1");
        }
        if (tab.incognito || reopen) {
          ++tab.index;
          return Backend.reopenTab(tab);
        } else if (tab.index > 0 && chrome.sessions) {
          return Backend.reopenTab(tab, true);
        }
        chrome.windows.getCurrent({populate: true}, function(wnd) {
          !wnd || wnd.type !== "normal" ? chrome.tabs.reload(ContentSettings.onRuntimeError)
            : Backend.reopenTab(tab, wnd.tabs.length > 1 && !!chrome.sessions);
          return chrome.runtime.lastError;
        });
      });
    });
  },
  ensureIncognito (this: void, count: number, contentType: CSTypes, tab: Tab): void {
    if (Settings.CONST.DisallowIncognito) {
      return Backend.complain("change incognito settings");
    }
    const pattern = Utils.removeComposedScheme(tab.url);
    if (ContentSettings.complain(contentType, pattern)) { return; }
    chrome.contentSettings[contentType].get({primaryUrl: pattern, incognito: true }, function(opt): void {
      if (chrome.runtime.lastError) {
        chrome.contentSettings[contentType].get({primaryUrl: pattern}, function (opt) {
          if (opt && opt.setting === "allow") { return; }
          const tabOpt: chrome.windows.CreateData = {type: "normal", incognito: true, focused: false, url: "about:blank"};
          chrome.windows.create(tabOpt, function (wnd: chrome.windows.Window): void {
            const leftTabId = (wnd.tabs as Tab[])[0].id;
            return ContentSettings.setAndUpdate(count, contentType, tab, pattern, wnd.id, true, function(): void {
              chrome.tabs.remove(leftTabId);
            });
          });
        });
        return chrome.runtime.lastError;
      }
      if (opt && opt.setting === "allow" && tab.incognito) {
        return ContentSettings.updateTab(tab);
      }
      chrome.windows.getAll(function(wnds): void {
        wnds = wnds.filter(wnd => wnd.incognito && wnd.type === "normal");
        if (!wnds.length) {
          console.log("%cContentSettings.ensure", "color:red"
            , "get incognito content settings", opt, " but can not find an incognito window.");
          return;
        } else if (opt && opt.setting === "allow") {
          return ContentSettings.updateTab(tab, wnds[wnds.length - 1].id);
        }
        const wndId = tab.windowId, isIncNor = tab.incognito && wnds.some(wnd => wnd.id === wndId);
        return ContentSettings.setAndUpdate(count, contentType, tab, pattern, isIncNor ? undefined : wnds[wnds.length - 1].id);
      });
    });
  },
  // `callback` must be executed
  setAndUpdate: function (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string
      , wndId?: number, syncState?: boolean, callback?: (this: void) => void): void {
    const cb = ContentSettings.updateTabAndWindow.bind(null, tab, wndId, callback);
    return ContentSettings.setAllLevels(contentType, pattern, count
      , { scope: "incognito_session_only", setting: "allow" }
      , syncState && (wndId as number) !== tab.windowId
      ? function(err): void {
        if (err) { return cb(err); }
        chrome.windows.get(tab.windowId, cb);
      } : cb);
  } as {
    (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string
      , wndId: number, syncState: boolean, callback?: (this: void) => void): void;
    (this: void, count: number, contentType: CSTypes, tab: Tab, pattern: string, wndId?: number): void;
  },
  setAllLevels (this: void, contentType: CSTypes, url: string, count: number
      , settings: Readonly<Pick<chrome.contentSettings.SetDetails, "scope" | "setting">>
      , callback: (this: void, has_err: boolean) => void): void {
    let left: number, has_err = false;
    const ref = chrome.contentSettings[contentType], func = function() {
      const err = chrome.runtime.lastError;
      err && console.log("[%o]", Date.now(), err);
      if (has_err) { return err; }
      --left; has_err = !!err;
      if (has_err || left === 0) {
        setTimeout(callback, 0, has_err);
      }
      return err;
    }, arr = ContentSettings.parsePattern(url, count | 0);
    left = arr.length;
    if (left <= 0) { return callback(true); }
    Object.setPrototypeOf(settings, null);
    for (const pattern of arr) {
      const info = Utils.extendIf(Object.create(null) as chrome.contentSettings.SetDetails, settings);
      info.primaryPattern = pattern;
      ref.set(info, func);
    }
  },
  updateTabAndWindow (this: void, tab: Tab, wndId: number | undefined, callback: ((this: void) => void) | undefined
      , oldWnd: chrome.windows.Window | boolean): void {
    if (oldWnd !== true) { ContentSettings.updateTab(tab, wndId); }
    callback && callback();
    if (oldWnd === true) { return; }
    wndId && chrome.windows.update(wndId, {
      focused: true,
      state: oldWnd ? oldWnd.state : undefined
    });
  },
  updateTab (this: void, tab: Tab, newWindowId?: number): void {
    tab.active = true;
    if (typeof newWindowId !== "number" || tab.windowId === newWindowId) {
      ++tab.index;
    } else {
      (tab as chrome.tabs.CreateProperties).index = undefined;
      tab.windowId = newWindowId;
    }
    Backend.reopenTab(tab);
  }
},
Marks = { // NOTE: all public members should be static
  _set ({ local, markName, url, scroll }: MarksNS.NewMark, tabId?: number): void {
    localStorage.setItem(this.getLocationKey(markName, local ? url : "")
      , JSON.stringify<MarksNS.StoredMark | MarksNS.ScrollInfo>(local ? scroll
        : { tabId: tabId as number, url, scroll }));
  },
  _goto (port: Port, options: CmdOptions["Marks.goTo"]) {
    port.postMessage<1, "Marks.goTo">({ name: "execute", command: "Marks.goTo", count: 1, options, CSS: null});
  },
  createMark (this: void, request: MarksNS.NewTopMark | MarksNS.NewMark, port: Port): void {
    let tabId = port.sender.tabId;
    if (request.scroll) {
      return Marks._set(request as MarksNS.NewMark, tabId);
    }
    (port = Backend.indexPorts(tabId, 0) || port) && port.postMessage({
      name: "createMark",
      markName: request.markName,
    });
  },
  gotoMark (this: void, request: MarksNS.FgQuery, port: Port): void {
    const { local, markName } = request,
    str = localStorage.getItem(Marks.getLocationKey(markName, local ? request.url : ""));
    if (local) {
      let scroll: MarksNS.FgMark | null = str ? JSON.parse(str) as MarksNS.FgMark : null;
      if (!scroll) {
        let oldPos = (request as MarksNS.FgLocalQuery).old, x: number, y: number;
        if (oldPos && (x = +oldPos.scrollX) >= 0 && (y = +oldPos.scrollY) >= 0) {
          (request as MarksNS.NewMark).scroll = scroll = [x, y];
          Marks._set(request as MarksNS.NewMark);
        }
      }
      if (scroll) {
        return Marks._goto(port, { markName, scroll, local: true });
      }
    }
    if (!str) {
      return Backend.showHUD(`${local ? "Local" : "Global"} mark not set : ' ${markName} '.`);
    }
    const markInfo: MarksNS.MarkToGo & MarksNS.StoredMark = JSON.parse(str);
    markInfo.markName = markName;
    markInfo.prefix = request.prefix !== false && markInfo.scroll[1] === 0 && markInfo.scroll[0] === 0 &&
        !!Utils.IsURLHttp(markInfo.url);
    if (Backend.indexPorts(markInfo.tabId)) {
      chrome.tabs.get(markInfo.tabId, Marks.checkTab.bind(markInfo));
    } else {
      return Backend.focus(markInfo);
    }
  },
  checkTab (this: MarksNS.MarkToGo, tab: chrome.tabs.Tab): void {
    const url = tab.url.split("#", 1)[0];
    if (url === this.url || this.prefix && this.url.startsWith(url)) {
      Backend.gotoSession({ sessionId: tab.id });
      return Marks.scrollTab(this, tab);
    } else {
      return Backend.focus(this);
    }
  },
  getLocationKey (markName: string, url: string | undefined): string {
    return (url ? "vimiumMark|" + Utils.prepareReparsingPrefix(url.split('#', 1)[0])
      : "vimiumGlobalMark") + "|" + markName;
  },
  scrollTab (this: void, markInfo: MarksNS.InfoToGo, tab: chrome.tabs.Tab): void {
    const tabId = tab.id, port = Backend.indexPorts(tabId, 0);
    port && Marks._goto(port, { markName: markInfo.markName, scroll: markInfo.scroll });
    if (markInfo.tabId !== tabId && markInfo.markName) {
      return Marks._set(markInfo as MarksNS.MarkToGo, tabId);
    }
  },
  clear (this: void, url?: string): void {
    const key_start = Marks.getLocationKey("", url), storage = localStorage;
    let key: string, i: number, count = 0;
    for (i = storage.length; 0 <= --i; ) {
      key = storage.key(i) as string;
      if (key.startsWith(key_start)) {
        count++;
        storage.removeItem(key);
      }
    }
    return Backend.showHUD(`${count} ${url ? "local" : "global"} mark${count !== 1 ? "s have" : " has"} been removed.`);
  }
},
FindModeHistory = {
  key: "findModeRawQueryList" as "findModeRawQueryList",
  max: 50,
  list: null as string[] | null,
  listI: null as string[] | null,
  timer: 0,
  init (): void {
    const str: string = Settings.get(this.key);
    this.list = str ? str.split("\n") : [];
    this.init = null as never;
  },
  query (incognito: boolean, query?: string, index?: number): string | void {
    this.init && this.init();
    const list = incognito ? this.listI || (IncognitoWatcher.watch(),
                            this.listI = (this.list as string[]).slice(0)) : (this.list as string[]);
    if (!query) {
      return list[list.length - (index || 1)] || "";
    }
    if (incognito) {
      return this.refreshIn(query, list, true);
    }
    const str = this.refreshIn(query, list);
    str && Settings.set(this.key, str);
    if (this.listI) { return this.refreshIn(query, this.listI, true); }
  },
  refreshIn: function (this: any, query: string, list: string[], skipResult?: boolean): string | void {
    const ind = list.lastIndexOf(query);
    if (ind >= 0) {
      if (ind === list.length - 1) { return; }
      list.splice(ind, 1);
    }
    else if (list.length >= (this as typeof FindModeHistory).max) { list.shift(); }
    list.push(query);
    if (!skipResult) {
      return list.join("\n");
    }
  } as {
    (query: string, list: string[], skipResult?: false): string | void;
    (query: string, list: string[], skipResult: true): void;
  },
  removeAll (incognito: boolean): void {
    if (incognito) {
      this.listI && (this.listI = []);
      return;
    }
    this.init = null as never;
    this.list = [];
    Settings.set(this.key, "");
  }
},
IncognitoWatcher = {
  watching: false,
  timer: 0,
  watch (): void {
    if (this.watching) { return; }
    chrome.windows.onRemoved.addListener(this.OnWndRemvoed);
    this.watching = true;
  },
  OnWndRemvoed (this: void): void {
    const _this = IncognitoWatcher;
    if (!_this.watching) { return; }
    _this.timer = _this.timer || setTimeout(_this.TestIncognitoWnd, 34);
  },
  TestIncognitoWnd (this: void): void {
    IncognitoWatcher.timer = 0;
    if (Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito) {
      let left = false, arr = Backend.indexPorts();
      for (const i in arr) {
        if ((arr[i] as Frames.Frames)[0].sender.incognito) { left = true; break; }
      }
      if (left) { return; }
    }
    chrome.windows.getAll(function(wnds): void {
      wnds.some(wnd => wnd.incognito) || IncognitoWatcher.cleanI();
    });
  },
  cleanI (): void {
    FindModeHistory.listI = null;
    chrome.windows.onRemoved.removeListener(this.OnWndRemvoed);
    this.watching = false;
  }
},
TabRecency = {
  tabs: Object.create<number>(null) as SafeDict<number>,
  last: (chrome.tabs.TAB_ID_NONE || GlobalConsts.TabIdNone) as number,
  incognito: IncognitoType.mayFalse,
  rCompare: null as never as (a: {id: number}, b: {id: number}) => number,
};

setTimeout(function() {
  const cache = TabRecency.tabs, noneWnd = chrome.windows.WINDOW_ID_NONE || GlobalConsts.WndIdNone;
  let stamp = 1, time = 0;
  function clean(): void {
    const ref = cache;
    for (const i in ref) {
      if ((ref[i] as number) <= 896) { delete ref[i]; }
      else { (ref as EnsuredSafeDict<number>)[i] -= 895; }
    }
    stamp = 128;
  }
  function listener({ tabId }: { tabId: number }): void {
    const now = Date.now();
    if (now - time > 500) {
      cache[TabRecency.last] = ++stamp;
      if (stamp === 1023) { clean(); }
    }
    TabRecency.last = tabId; time = now;
  }
  function onWndFocus(tabs: [chrome.tabs.Tab] | never[]) {
    let a = tabs[0];
    if (a) {
      TabRecency.incognito = +a.incognito;
      return listener({ tabId: a.id });
    }
  }
  chrome.tabs.onActivated.addListener(listener);
  chrome.windows.onFocusChanged.addListener(function(windowId): void {
    if (windowId === noneWnd) { return; }
    chrome.tabs.query({windowId, active: true}, onWndFocus);
  });
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs: CurrentTabs): void {
    time = Date.now();
    const a = tabs && tabs[0];
    if (!a) { return chrome.runtime.lastError; }
    TabRecency.last = a.id;
    TabRecency.incognito = a.incognito ? IncognitoType.true : IncognitoType.mayFalse;
  });
  TabRecency.rCompare = function(a, b): number {
    return (cache[b.id] as number) - (cache[a.id] as number);
  };

  for (const i of ["images", "plugins", "javascript", "cookies"] as CSTypes[]) {
    localStorage.getItem(ContentSettings.makeKey(i)) != null &&
    setTimeout(ContentSettings.Clear, 100, i);
  }
}, 120);

chrome.extension.isAllowedIncognitoAccess && chrome.extension.isAllowedIncognitoAccess(function(isAllowedAccess): void {
  const notAllowed = Settings.CONST.DisallowIncognito = isAllowedAccess === false;
  if (notAllowed) {
    console.log("Sorry, but some commands of Vimium++ need the permission to run in incognito mode.");
  }
});
