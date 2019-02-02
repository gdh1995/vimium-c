/// <reference no-default-lib="true"/>
/// <reference path="../types/base/index.d.ts" />
/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
interface ImportBody {
  (id: "shownImage"): HTMLImageElement
  (id: "shownText"): HTMLDivElement
}
declare var VPort: Readonly<VPort>, VHUD: Readonly<VHUD>,
  VKeyboard: { char (event: KeyboardEvent): string; key (event: EventControlKeys, ch: string): string; },
  Viewer: new (root: HTMLElement) => ViewerType;
interface Window {
  readonly VKeyboard?: typeof VKeyboard
  readonly VPort?: typeof VPort;
  readonly VHUD?: typeof VHUD;
  readonly Viewer: typeof Viewer;
}
interface VDomProto {
  readonly UI: Readonly<DomUI>;
}
interface ViewerType {
  readonly visible: boolean;
  readonly viewed: boolean;
  destroy(): any;
  show(): any;
  zoom(ratio: number, hasTooltip: boolean): ViewerType;
  rotate(degree: number): any;
}
type ValidShowTypes = "image" | "url" | "";
type ValidNodeTypes = HTMLImageElement | HTMLDivElement;

declare var browser: unknown;
if (typeof browser !== "undefined" && (browser && (browser as typeof chrome).runtime) != null) {
  window.chrome = browser as typeof chrome;
}
var $ = function<T extends HTMLElement>(selector: string): T {
  return document.querySelector(selector) as T;
},
BG_ = window.chrome && chrome.extension && chrome.extension.getBackgroundPage() as Window as Window & { Settings: SettingsTmpl };
if (!(BG_ && BG_.Utils && BG_.Utils.convertToUrl)) {
  BG_ = null as never;
}

var VShown: ValidNodeTypes | null = null;
let bgLink = $<HTMLAnchorElement>('#bgLink');
let tempEmit: ((succeed: boolean) => void) | null = null;
let viewer: ViewerType | null = null;
let VData: {
  full: string;
  type: ValidShowTypes;
  original: string;
  url: string;
  file?: string;
  auto?: boolean | "once";
} = null as never;
let encryptKey = window.name && +window.name.split(' ')[0] || 0;

window.onhashchange = function(this: void): void {
  if (VShown) {
    clean();
    bgLink.style.display = "none";
    VShown.remove();
    VShown = null;
  }

  VData = Object.create(null);
  let url = location.hash, type: ValidShowTypes = "", file = "";
  if (!url && BG_ && BG_.Settings && BG_.Settings.temp.shownHash) {
    url = BG_.Settings.temp.shownHash();
    encryptKey = encryptKey || Math.round(Math.random() * 0x100000000) || 0xc3e73c18;
    let encryptedUrl = encrypt(url, encryptKey, true);
    if (history.state) {
      history.pushState(encryptedUrl, "", "");
    } else {
      history.replaceState(encryptedUrl, "", "");
    }
    window.name = encryptKey + " " + url;
  } else if (url || !history.state) {
  } else if (encryptKey) {
    url = encrypt(history.state, encryptKey, false);
    window.name = encryptKey + " " + url;
  } else {
    history.replaceState(null, "", ""); // clear useless data
  }
  VData.full = url;
  if (url.length < 3) {}
  else if (url.startsWith("#!image")) {
    url = url.substring(8);
    type = "image";
  } else if (url.startsWith("#!url")) {
    url = url.substring(6);
    type = "url";
  }
  for (let ind: number; ind = url.indexOf("&") + 1; ) {
    if (url.startsWith("download=")) {
      file = VData.file = decodeURLPart(url.substring(9, ind - 1));
      url = url.substring(ind);
    } else if (url.startsWith("auto=")) {
      let i = url.substring(5, 12).split('&', 1)[0].toLowerCase();
      VData.auto = i === "once" ? i : i === "true" ? true : i === "false" ? false : parseInt(i) > 0;
      url = url.substring(ind);
    } else {
      break;
    }
  }
  if (url.indexOf(":") <= 0 && url.indexOf("/") < 0) {
    url = decodeURLPart(url).trim();
  }
  if (!url) {
    type == "image" && (type = "");
  } else if (url.toLowerCase().startsWith("javascript:")) {
    type = url = file = VData.file = "";
  } else if (BG_) {
    const str = BG_.Utils.convertToUrl(url, null, Urls.WorkType.KeepAll);
    if (BG_.Utils.lastUrlType <= Urls.Type.MaxOfInputIsPlainUrl) {
      url = str;
    }
  } else if (url.startsWith("//")) {
    url = "http:" + url;
  } else if ((<RegExpOne>/^([-.\dA-Za-z]+|\[[\dA-Fa-f:]+])(:\d{2,5})?\//).test(url)) {
    url = "http://" + url;
  }
  VData.type = type;
  VData.url = VData.original = url;

  switch (type) {
  case "image":
    if (VData.auto) {
      let newUrl = parseSmartImageUrl_(url);
      if (newUrl) {
        console.log("Auto predict a better URL of\n %o =>\n %o", url, newUrl);
        url = VData.url = newUrl;
      }
    }
    VShown = (importBody as ImportBody)("shownImage");
    VShown.classList.add("hidden");
    VShown.onerror = function(): void {
      if (VData.url !== VData.original) {
        disableAutoAndReload_();
        return;
      }
      resetOnceProperties_();
      VData.auto = false;
      this.onerror = this.onload = null as never;
      this.alt = "\xa0(fail to load)\xa0";
      if (BG_ && BG_.Settings && BG_.ChromeVer >= BrowserVer.MinNoBorderForBrokenImage) {
        this.classList.add("broken");
      }
      this.classList.remove("hidden");
      setTimeout(showBgLink, 34);
      this.onclick = function(e) {
        !e.ctrlKey && !e.shiftKey && !e.altKey && chrome.tabs && chrome.tabs.update ? chrome.tabs.update({ url: VData.url })
        : clickLink({ target: "_top" }, e);
      };
    };
    if (url.indexOf(":") > 0 || url.lastIndexOf(".") > 0) {
      VShown.src = url;
      VShown.onclick = defaultOnClick;
      VShown.onload = function(this: HTMLImageElement): void {
        const width = this.naturalWidth;
        if (width < 12 && this.naturalHeight < 12) {
          if (VData.auto) {
            disableAutoAndReload_();
            return;
          } else if (width < 2 && this.naturalHeight < 2) {
            console.log("The image is too small to see");
            this.onerror(null as never);
            return;
          }
        }
        if (VData.url !== VData.original) {
          VData.original = VData.url;
        }
        resetOnceProperties_();
        this.onerror = this.onload = null as never;
        setTimeout(function() { // safe; because on C65, in some tests refreshing did not trigger replay
          (VShown as HTMLImageElement).src = (VShown as HTMLImageElement).src; // trigger replay for gif
        }, 0);
        showBgLink();
        this.classList.remove("hidden");
        this.classList.add("zoom-in");
        if (width >= window.innerWidth * 0.9) {
          (document.body as HTMLBodyElement).classList.add("filled");
        }
      };
    } else {
      url = VData.url = "";
      (VShown as any).onerror();
      VShown.alt = "\xa0(null)\xa0";
    }
    if (file) {
      VShown.setAttribute("download", file);
      VShown.alt = file;
      VShown.title = file;
    }
    break;
  case "url":
    VShown = (importBody as ImportBody)("shownText");
    if (url && BG_) {
      let str: Urls.Url | null = null;
      if (url.startsWith("vimium://")) {
        str = BG_.Utils.evalVimiumUrl(url.substring(9), Urls.WorkType.ActIfNoSideEffects, true);
      }
      str = str !== null ? str : BG_.Utils.convertToUrl(url, null, Urls.WorkType.ConvertKnown);
      if (typeof str === "string") {}
      else if (str instanceof BG_.Promise) {
        str.then(function(arr) {
          showText(arr[1], arr[0] || (arr[2] || ""));
        });
        break;
      } else if (str instanceof BG_.Array) {
        showText(str[1], str[0]);
        break;
      }
      url = str;
    }
    showText(type, url);
    break;
  default:
    url = "";
    VShown = (importBody as ImportBody)("shownImage");
    VShown.src = "../icons/vimium.png";
    bgLink.style.display = "none";
    break;
  }

  bgLink.setAttribute("data-vim-url", url);
  if (file) {
    bgLink.setAttribute("data-vim-text", file);
    bgLink.download = file;
  } else {
    bgLink.removeAttribute("data-vim-text");
    bgLink.removeAttribute("download");
  }
  bgLink.onclick = VShown ? clickShownNode : defaultOnClick;

  let str = $<HTMLTitleElement>('title').getAttribute('data-title') as string;
  str = BG_ ? BG_.Utils.createSearch(file ? file.split(/\s+/) : [], str, "")
    : str.replace(<RegExpOne>/\$[sS](?:\{[^}]*})?/, file && (file + " | "));
  document.title = str;
};

if (!"".startsWith) {
String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.lastIndexOf(s, 0) === 0;
};
}
(window.onhashchange as () => void)();

window.onpopstate = function() {
  (window.onhashchange as () => void)();
};

document.addEventListener("keydown", function(this: void, event): void {
  if (VData.type === "image" && imgOnKeydown(event)) {
    return;
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey
    || event.shiftKey || event.repeat) { return; }
  const str = String.fromCharCode(event.keyCode as VKeyCodes | KnownKey as KnownKey);
  if (str === 'S') {
    return clickLink({
      download: VData.file || ""
    }, event);
  } else if (str === "C") {
    "" + getSelection() && copyThing(event);
    return;
  } else if (str === "A") {
    return toggleInvert(event);
  }
});

function showBgLink(this: void): void {
  const height = (VShown as ValidNodeTypes).scrollHeight, width = (VShown as ValidNodeTypes).scrollWidth;
  bgLink.style.height = height + "px";
  bgLink.style.width = width + "px";
  bgLink.style.display = "";
}

function clickLink(this: void, options: { [key: string]: string; }, event: MouseEvent | KeyboardEvent): void {
  event.preventDefault();
  if (!VData.url) { return; }
  const a = document.createElement('a');
  Object.setPrototypeOf(options, null);
  for (const i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = VData.url;
  simulateClick(a, event);
}

function simulateClick(a: HTMLElement, event: MouseEvent | KeyboardEvent): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, 0, null);
  return a.dispatchEvent(mouseEvent);
}

function imgOnKeydown(event: KeyboardEvent): boolean {
  const { keyCode } = event;
  if ((VShown as HTMLImageElement).alt) { return false; }
  if (keyCode === VKeyCodes.space || keyCode === VKeyCodes.enter) {
    event.preventDefault();
    simulateClick(VShown as ValidNodeTypes, event);
    return true;
  }
  if (!window.VKeyboard) {
    return false;
  }
  let ch = VKeyboard.char(event);
  if (!ch) { return false; }
  let action: number = 0;
  switch (VKeyboard.key(event, ch)) {
  case "<c-=>": case "+": case "=": case "<up>": action = 1; break;
  case "<left>": action = -2; break;
  case "<right>": action = 2; break;
  case "<c-->": case "-": case "<down>": action = -1; break;
  default: return false;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (viewer && viewer.viewed) {
    doImageAction(viewer, action);
  } else {
    let p = loadViewer().then(showSlide);
    p.then(function(viewer) {
      doImageAction(viewer, action);
    }).catch(defaultOnError);
  }
  return true;
}

function doImageAction(viewer: ViewerType, action: number) {
  if (action === 2 || action === -2) {
    viewer.rotate(action * 45);
  } else {
    viewer.zoom(action / 10, true);
  }
}

function decodeURLPart(url: string): string {
  try {
    url = decodeURIComponent(url);
  } catch (e) {}
  return url;
}

function importBody(id: string): HTMLElement {
  const templates = $<HTMLTemplateElement>('#bodyTemplate'),
  // note: content has no getElementById on Chrome before BrowserVer.Min$DocumentFragment$$getElementById
  node = document.importNode(templates.content.querySelector("#" + id) as HTMLElement, true);
  (document.body as HTMLBodyElement).insertBefore(node, templates);
  return node;
}

function defaultOnClick(event: MouseEvent): void {
  if (event.altKey) {
    event.stopImmediatePropagation();
    return clickLink({ download: VData.file || "" }, event);
  } else switch (VData.type) {
  case "url": clickLink({ target: "_blank" }, event); break;
  case "image":
    if ((VShown as HTMLImageElement).alt) { return; }
    loadViewer().then(showSlide).catch(defaultOnError);
    break;
  default: break;
  }
}

function clickShownNode(event: MouseEvent): void {
  event.preventDefault();
  if ((VShown as ValidNodeTypes).onclick) {
    (VShown as ValidNodeTypes).onclick(event);
  }
}

function showText(tip: string, body: string | string[]): void {
  $("#textTip").setAttribute("data-text", tip);
  const textBody = $("#textBody");
  if (body) {
    textBody.textContent = typeof body !== "string" ? body.join(" ") : body;
    (VShown as ValidNodeTypes).onclick = copyThing;
  } else {
    textBody.classList.add("null");
  }
  return showBgLink();
}

function copyThing(event: Event): void {
  event.preventDefault();
  const str = VData.type == "url" ? $("#textBody").textContent : VData.url;
  if (!(str && window.VPort)) { return; }
  VPort.post({
    H: kFgReq.copy,
    data: str
  });
  return VHUD.copied(str);
}

function toggleInvert(event: Event): void {
  if (VData.type === "image") {
    if ((VShown as HTMLImageElement).alt || viewer && viewer.visible) {
      event.preventDefault();
    } else {
      (VShown as ValidNodeTypes).classList.toggle("invert");
    }
  }
}

function requireJS(name: string, src: string): Promise<any> {
  if ((window as any)[name]) {
    return Promise.resolve((window as any)[name]);
  }
  return (window as any)[name] = new Promise(function(resolve, reject) {
    const script = document.createElement("script");
    script.src = src;
    script.onerror = function() {
      reject("ImportError: " + name);
    };
    script.onload = function() {
      const obj = (window as any)[name];
      obj ? resolve(obj) : (this.onerror as () => void)();
    };
    (document.head as HTMLHeadElement).appendChild(script);
  });
}

function loadCSS(src: string): void {
  if ($('link[href="' + src + '"]')) {
    return;
  }
  const obj = document.createElement("link");
  obj.rel = "stylesheet";
  obj.href = src;
  (document.head as HTMLHeadElement).insertBefore(obj, $('link[href$="show.css"]'));
}

function defaultOnError(err: any): void {
  err && console.log(err);
}

function loadViewer(): Promise<Window["Viewer"]> {
  if (window.Viewer) {
    return Promise.resolve(Viewer);
  }
  loadCSS("../lib/viewer.min.css");
  return requireJS("Viewer", "../lib/viewer.min.js").then<Window["Viewer"]>(function(Viewer): Window["Viewer"] {
    Viewer.setDefaults({
      navbar: false,
      shown: function(this: void) {
        bgLink.style.display = "none";
      },
      viewed: function(): void { if (tempEmit) { return tempEmit(true); } },
      hide: function(this: void) {
        bgLink.style.display = "";
        if (tempEmit) { return tempEmit(false); }
      }
    });
    return Viewer;
  });
}

function showSlide(Viewer: Window["Viewer"]): Promise<ViewerType> | ViewerType {
  const sel = getSelection();
  sel.type == "Range" && sel.collapseToStart();
  const v = viewer = viewer || new Viewer(VShown as HTMLImageElement);
  v.visible || v.show();
  if (v.viewed) { return v; }
  return new Promise<ViewerType>(function(resolve, reject): void {
    tempEmit = function(succeed): void {
      tempEmit = null;
      succeed ? resolve(v) : reject("failed to view the image");
    };
  });
}

function clean() {
  if (VData.type === "image") {
    (document.body as HTMLBodyElement).classList.remove("filled");
    if (viewer) {
      viewer.destroy();
      viewer = null;
    }
  }
}

function parseSmartImageUrl_(originUrl: string): string | null {
  function safeParseURL(url1: string): URL | null { try { return new URL(url1); } catch (e) {} return null; }
  const parsed = safeParseURL(originUrl);
  if (!parsed || !(<RegExpI>/^s?ftp|^http/i).test(parsed.protocol)) { return null; }
  let search = parsed.search;
  const ImageExtRe = <RegExpI>/\.(?:bmp|gif|icon?|jpe?g|png|tiff?|webp)(?=[.\-_]|\b)/i;
  function DecodeURLPart_(this: void, url1: string | undefined): string {
    if (!url1) { return ""; }
    try {
      url1 = decodeURIComponent(url1);
    } catch (e) {}
    return url1;
  }
  if (search.length > 10) {
    const keyRe = <RegExpOne>/^(?:imgurl|mediaurl|objurl|origin(?:al)?|real\w*|src|url)$/i,
    encodedSignRe = <RegExpOne>/%(?:3[aA]|2[fF])/;
    for (const item of search.substring(1).split('&')) {
      const key = item.split('=', 1)[0];
      search = item.substring(key.length + 1);
      if (search.length > 7) {
        search.indexOf("://") < 0 && encodedSignRe.test(search) && (search = DecodeURLPart_(search).trim());
        if (search.indexOf("/") > 0 && safeParseURL(search) != null) {
          if (keyRe.test(key)) {
            return search;
          }
          let arr = search.split('?')[0].split("/");
          if (ImageExtRe.test(arr[arr.length - 1]) && key.toLowerCase().indexOf("thumb") < 0) {
            return search;
          }
        }
      }
    }
  }
  const path = search = parsed.pathname;
  let offset = search.lastIndexOf('/') + 1;
  search = search.substring(offset);
  let index = search.lastIndexOf('@') + 1 || search.lastIndexOf('!') + 1;
  let found = true, arr1: RegExpExecArray | null = null, arr2: RegExpExecArray | null = null;
  if (index > 2) {
    offset += index;
    search = search.substring(index);
    let re = <RegExpG & RegExpI>/(?:[.\-_]|\b)(?:[1-9]\d{2,3}[a-z]{1,3}[_\-]?|[1-9]\d?[a-z][_\-]?|0[a-z][_\-]?|[1-9]\d{1,3}[_\-]|[1-9]\d{1,2}(?=[.\-_]|\b)){2,6}(?=[.\-_]|\b)/gi;
    for (; arr2 = re.exec(search); arr1 = arr2) {}
    if (arr1 && (<RegExpI>/.[_\-].|\d\dx\d/i).test(arr1[0])) {
      let next = arr1.index + arr1[0].length;
      arr2 = ImageExtRe.exec(search.substring(next));
      offset += arr1.index;
      let len = arr1[0].length;
      if (arr2 && arr2.index === 0) {
        len += arr2[0].length;
      }
      search = path.substring(offset + len);
      if ((<RegExpOne>/[@!]$/).test(search || path.charAt(offset - 1))) {
        if (search) {
          search = search.substring(0, search.length - 1);
        } else {
          offset--;
        }
      }
    } else {
      found = false;
    }
  } else if (arr1 = (<RegExpOne>/_(0x)?[1-9]\d{2,3}(x0)?\./).exec(search)) {
    search = search.substring(0, arr1.index) + search.substring(arr1.index + arr1[0].length - 1);
  } else if (search.startsWith("thumb_")) {
    search = search.substring(6);
  } else if ((<RegExpOne>/^[1-9]\d+$/).test(search) && +search > 0 && +search < 640) {
    offset--;
    search = "";
  } else {
    found = false;
  }
  return found ? parsed.origin + path.substring(0, offset) + search : null;
}

function disableAutoAndReload_(): void {
  console.log("Failed to visit the predicted URL, so go back to the original version");
  resetOnceProperties_();
  VData.auto = false;
  (window.onhashchange as () => void)();
}

function resetOnceProperties_() {
  let changed = false;
  if (VData.auto === "once") {
    VData.auto = false;
    changed = true;
  }
  changed && recoverHash_();
  return changed;
}

function recoverHash_(): void {
  const type = VData.type;
  if (!type) {
    return;
  }
  let url = "#!" + type + " "
      + (VData.file ? "download=" + encodeURIComponent(VData.file) + "&" : "")
      + (VData.auto ? "auto=" + (VData.auto === "once" ? "once" : 1) + "&" : "")
      + VData.original;
  window.name = encryptKey + " " + url;
  VData.full = url;
  let encryptedUrl = encrypt(url, encryptKey, true);
  history.replaceState(encryptedUrl, "", "");
}

function encrypt(message: string, password: number, doEncrypt: boolean): string {
  const arr: number[] = [], useCodePoint = !!("".codePointAt && String.fromCodePoint);
  if (doEncrypt) {
    // Unicode <-> UTF8 : https://www.ibm.com/support/knowledgecenter/en/ssw_aix_71/com.ibm.aix.nlsgdrf/utf-8.htm
    for (let i = 0; i < message.length; i++) {
      const ch = useCodePoint ? (message.codePointAt as NonNullable<String["codePointAt"]>)(i) : message.charCodeAt(i);
      if (ch == null || isNaN(ch)) { break; }
      if (ch <= 0x7f) {
        arr.push(ch);
      } else if (ch <= 0x7ff) {
        arr.push(0xc0 | (ch >> 6), 0x80 | (ch & 0x3f));
      } else if (ch <= 0xffff) {
        arr.push(0xe0 | (ch >> 12), 0x80 | ((ch >> 6) & 0x3f), 0x80 | (ch & 0x3f));
      } else if (ch <= 0x1fffff) {
        arr.push(0xf0 | (ch >> 18), 0x80 | ((ch >> 12) & 0x3f), 0x80 | ((ch >> 6) & 0x3f), 0x80 | (ch & 0x3f));
      // } else if (ch <= 0x3ffffff) {
      //   arr.push(0xf8 | (ch >>> 24), 0x80 | ((ch >> 18) & 0x3f), 0x80 | ((ch >> 12) & 0x3f)
      //     , 0x80 | ((ch >> 6) & 0x3f), 0x80 | (ch & 0x3f));
      // } else {
      //   arr.push(0xfc | (ch >>> 30), 0x80 | ((ch >> 24) & 0x3f), 0x80 | ((ch >> 18) & 0x3f)
      //     , 0x80 | ((ch >> 12) & 0x3f), 0x80 | ((ch >> 6) & 0x3f), 0x80 | (ch & 0x3f));
      }
    }
  } else {
    for (let i = 0; i < message.length; i++) {
      const ch = message.charCodeAt(i);
      if (ch == null || isNaN(ch)) { break; }
      arr.push(ch);
    }
  }
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i] ^ (0xff & (password >>> (8 * (i & 3))));
  }
  if (doEncrypt) {
    return String.fromCharCode.apply(String, arr);
  }
  const decoded: number[] = [];
  for (let i = 0; i < arr.length; ) {
    const ch = arr[i];
    if (ch <= 0x7f) {
      decoded.push(ch);
      i++;
    } else if (ch < 0xc1) {
      decoded.push(((ch & 0x1f) << 6) | (arr[i + 1] & 0x3f));
      i += 2;
    } else if (ch < 0xe1) {
      decoded.push(((ch & 0x0f) << 12) | ((arr[i + 1] & 0x3f) << 6) | (arr[i + 2] & 0x3f));
      i += 3;
    } else if (ch < 0xf1) {
      decoded.push(((ch & 0x07) << 18) | ((arr[i + 1] & 0x3f) << 12) | ((arr[i + 2] & 0x3f) << 6) | (arr[i + 3] & 0x3f));
      i += 4;
    // } else if (ch < 0xf9) {
    //   decoded.push(((ch & 0x03) << 24) | ((arr[i + 1] & 0x3f) << 18) | ((arr[i + 2] & 0x3f) << 12)
    //     | ((arr[i + 3] & 0x3f) << 6) | (arr[i + 4] & 0x3f));
    //   i += 5;
    // } else {
    //   decoded.push(((ch & 0x03) << 30) | ((arr[i + 1] & 0x3f) << 24) | ((arr[i + 2] & 0x3f) << 18)
    //     | ((arr[i + 3] & 0x3f) << 12) | ((arr[i + 4] & 0x3f) << 6) | (arr[i + 5] & 0x3f));
    //   i += 6;
    }
  }
  return (useCodePoint ? String.fromCodePoint as NonNullable<typeof String.fromCharCode> : String.fromCharCode).apply(String, decoded);
}
