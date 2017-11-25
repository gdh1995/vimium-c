const Clipboard = {
  getTextArea (): HTMLTextAreaElement {
    const el = document.createElement("textarea");
    el.style.position = "absolute";
    el.style.left = "-99px";
    el.style.width = "0";
    el.contentEditable = "true";
    this.getTextArea = () => el;
    return el;
  },
  tailSpacesRe: <RegExpG & RegExpSearchable<0>> /[ \t]+\n/g,
  format (data: string): string {
    data = data.replace(Utils.A0Re, " ").replace(this.tailSpacesRe, "\n");
    let i = data.charCodeAt(data.length - 1);
    if (i !== 32 && i !== 9) {
    } else if (i = data.lastIndexOf('\n') + 1) {
      data = data.substring(0, i) + data.substring(i).trimRight();
    } else if ((i = data.charCodeAt(0)) !== 32 && i !== 9) {
      data = data.trimRight();
    }
    return data;
  },
  copy (data: string): void {
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
  paste (): string | null {
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
    (port = Settings.indexPorts(tabId, 0) || port) && port.postMessage({
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
      return g_requestHandlers.ShowHUD(`${local ? "Local" : "Global"} mark not set : ' ${markName} '.`);
    }
    const markInfo: MarksNS.MarkToGo & MarksNS.StoredMark = JSON.parse(str);
    markInfo.markName = markName;
    markInfo.prefix = request.prefix !== false && markInfo.scroll[1] === 0 && markInfo.scroll[0] === 0 &&
        !!Utils.IsURLHttp(markInfo.url);
    if (Settings.indexPorts(markInfo.tabId)) {
      chrome.tabs.get(markInfo.tabId, Marks.checkTab.bind(markInfo));
    } else {
      return g_requestHandlers.focusOrLaunch(markInfo);
    }
  },
  checkTab (this: MarksNS.MarkToGo, tab: chrome.tabs.Tab): void {
    const url = tab.url.split("#", 1)[0];
    if (url === this.url || this.prefix && this.url.startsWith(url)) {
      g_requestHandlers.gotoSession({ sessionId: tab.id });
      return Marks.scrollTab(this, tab);
    } else {
      return g_requestHandlers.focusOrLaunch(this);
    }
  },
  getLocationKey (markName: string, url: string | undefined): string {
    return (url ? "vimiumMark|" + Utils.prepareReparsingPrefix(url.split('#', 1)[0])
      : "vimiumGlobalMark") + "|" + markName;
  },
  scrollTab (this: void, markInfo: MarksNS.InfoToGo, tab: chrome.tabs.Tab): void {
    const tabId = tab.id, port = Settings.indexPorts(tabId, 0);
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
    return g_requestHandlers.ShowHUD(`${count} ${url ? "local" : "global"} mark${count !== 1 ? "s have" : " has"} been removed.`);
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
  initI (): string[] {
    const list = this.listI = (this.list as string[]).slice(0);
    chrome.windows.onRemoved.addListener(this.OnWndRemvoed);
    return list;
  },
  query (incognito: boolean, query?: string, index?: number): string | void {
    this.init && this.init();
    const list = incognito ? this.listI || this.initI() : (this.list as string[]);
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
  },
  OnWndRemvoed (this: void): void {
    const _this = FindModeHistory;
    if (!_this.listI) { return; }
    _this.timer = _this.timer || setTimeout(_this.TestIncognitoWnd, 34);
  },
  TestIncognitoWnd (this: void): void {
    FindModeHistory.timer = 0;
    if (Settings.CONST.ChromeVersion >= BrowserVer.MinNoUnmatchedIncognito) {
      let left = false, arr = Settings.indexPorts();
      for (let i in arr) {
        if ((arr[i] as Frames.Frames)[0].sender.incognito) { left = true; break; }
      }
      if (left) { return; }
    }
    chrome.windows.getAll(function(wnds): void {
      wnds.some(wnd => wnd.incognito) || FindModeHistory.cleanI();
    });
  },
  cleanI (): void {
    this.listI = null;
    chrome.windows.onRemoved.removeListener(this.OnWndRemvoed);
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
    for (let i in ref) {
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
    let a = tabs[0];
    if (chrome.runtime.lastError || !a) { return chrome.runtime.lastError; }
    TabRecency.last = a.id;
    TabRecency.incognito = +a.incognito;
  });
  TabRecency.rCompare = function(a, b): number {
    return (cache[b.id] as number) - (cache[a.id] as number);
  };
}, 120);

chrome.extension.isAllowedIncognitoAccess && chrome.extension.isAllowedIncognitoAccess(function(isAllowedAccess): void {
  const notAllowed = Settings.CONST.DisallowIncognito = isAllowedAccess === false;
  if (notAllowed) {
    console.log("Sorry, but some commands of Vimium++ need the permission to run Vimium++ in incognito mode.");
  }
});
