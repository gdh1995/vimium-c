/// <reference path="../content/base.d.ts" />
/// <reference path="../lib/keyboard_utils.ts" />
/// <reference path="../background/bg.d.ts" />
/// <reference path="../background/utils.ts" />
/// <reference path="../background/settings.ts" />
interface ImportBody {
  (id: "shownImage"): HTMLImageElement;
  (id: "shownText"): HTMLDivElement;
}
declare var VPort: VPortTy, VHud: VHUDTy,
  Viewer: new (root: HTMLElement) => ViewerType;
interface Window {
  readonly VPort?: VPortTy;
  readonly VHud?: VHUDTy;
  readonly Viewer: typeof Viewer;
}
interface BgWindow extends Window {
  BgUtils_: typeof BgUtils_;
  Settings_: typeof Settings_;
}
interface ViewerType {
  readonly isShown: boolean;
  readonly played: boolean;
  readonly viewed: boolean;
  destroy(): any;
  show(): any;
  play(fullscreen: true): any;
  zoom(ratio: number, hasTooltip: boolean): ViewerType;
  rotate(degree: number): any;
}
type ValidShowTypes = "image" | "url" | "";
type ValidNodeTypes = HTMLImageElement | HTMLDivElement;
interface VDataTy {
  type: ValidShowTypes;
  original: string;
  url: string;
  file?: string;
  auto?: boolean | "once";
  error?: string;
}

if (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser !== "undefined" && (browser && (browser as typeof chrome).runtime) != null) {
  window.chrome = browser as typeof chrome;
}
var $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T,
BG_ = window.chrome && chrome.extension && chrome.extension.getBackgroundPage() as Window as BgWindow;
if (!(BG_ && BG_.BgUtils_ && BG_.BgUtils_.convertToUrl_)) {
  BG_ = null as never;
}

let VShown: ValidNodeTypes | null = null;
let bgLink = $<HTMLAnchorElement>("#bgLink");
let tempEmit: ((succeed: boolean) => void) | null = null;
let viewer_: ViewerType | null = null;
var VData: VDataTy = null as never;
let encryptKey = window.name && +window.name.split(" ")[0] || 0;
let ImageExtRe = <RegExpI> /\.(bmp|gif|icon?|jpe?g|png|tiff?|webp)(?=[.\-_]|\b)/i;

window.onhashchange = function (this: void): void {
  if (VShown) {
    clean();
    bgLink.style.display = "none";
    VShown.remove();
    VShown = null;
  }

  VData = Object.create(null);
  let url = location.hash, type: ValidShowTypes = "", file = "";
  if (!url && BG_ && BG_.Settings_ && BG_.Settings_.temp_.shownHash_) {
    url = BG_.Settings_.temp_.shownHash_();
    encryptKey = encryptKey || Math.floor(Math.random() * 0x100000000) || 0xc3e73c18;
    let encryptedUrl = encrypt(url, encryptKey, true);
    if (history.state) {
      history.pushState(encryptedUrl, "", "");
    } else {
      history.replaceState(encryptedUrl, "", "");
    }
    window.name = encryptKey + " " + url;
  }
  else if (url || !history.state) { /* empty */ }
  else if (encryptKey) {
    url = encrypt(history.state, encryptKey, false);
    window.name = encryptKey + " " + url;
  } else {
    history.replaceState(null, "", ""); // clear useless data
  }
  VData.full = url;
  if (url.length < 3) { /* empty */ }
  else if (url.startsWith("#!image")) {
    url = url.slice(8);
    type = "image";
  } else if (url.startsWith("#!url")) {
    url = url.slice(6);
    type = "url";
  }
  for (let ind: number; ind = url.indexOf("&") + 1; ) {
    if (url.startsWith("download=")) {
      // avoid confusing meanings in title content
      file = decodeURLPart(url.slice(9, ind - 1)).split(<RegExpOne> /\||\uff5c| [-\xb7] /, 1)[0].trim();
      file = file.replace(<RegExpG> /[\r\n"]/g, "");
      VData.file = file;
      url = url.slice(ind);
    } else if (url.startsWith("auto=")) {
      let i = url.slice(5, 12).split("&", 1)[0].toLowerCase();
      VData.auto = i === "once" ? i : i === "true" ? true : i === "false" ? false : parseInt(i, 10) > 0;
      url = url.slice(ind);
    } else {
      break;
    }
  }
  if (url.indexOf(":") <= 0 && url.indexOf("/") < 0) {
    url = decodeURLPart(url).trim();
  }
  if (!url) {
    type === "image" && (type = "");
  } else if (url.toLowerCase().startsWith("javascript:")) {
    type = url = file = VData.file = "";
  } else if (BG_) {
    const str2 = BG_.BgUtils_.convertToUrl_(url, null, Urls.WorkType.KeepAll);
    if (BG_.BgUtils_.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl) {
      url = str2;
    }
  } else if (url.startsWith("//")) {
    url = "http:" + url;
  } else if ((<RegExpOne> /^([-.\dA-Za-z]+|\[[\dA-Fa-f:]+])(:\d{2,5})?\//).test(url)) {
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
    VShown.onerror = function (): void {
      if (VData.url !== VData.original) {
        disableAutoAndReload_();
        return;
      }
      resetOnceProperties_();
      VData.auto = false;
      this.onerror = this.onload = null as never;
      this.alt = VData.error = "\xa0(fail in loading)\xa0";
      if (Build.MinCVer >= BrowserVer.MinNoBorderForBrokenImage || !(Build.BTypes & BrowserType.Chrome)
          || BG_ && BG_.Settings_
            && BG_.CurCVer_ >= BrowserVer.MinNoBorderForBrokenImage) {
        this.classList.add("broken");
      }
      this.classList.remove("hidden");
      setTimeout(showBgLink, 34);
      this.onclick = function (e) {
        !e.ctrlKey && !e.shiftKey && !e.altKey && chrome.tabs && chrome.tabs.update
        ? chrome.tabs.update({ url: VData.url })
        : clickLink({ target: "_top" }, e);
      };
    };
    if (url.indexOf(":") > 0 || url.lastIndexOf(".") > 0) {
      VShown.src = url;
      VShown.onclick = defaultOnClick;
      VShown.onload = function (this: HTMLImageElement): void {
        const width = this.naturalWidth;
        if (width < 12 && this.naturalHeight < 12) {
          if (VData.auto) {
            disableAutoAndReload_();
            return;
          } else if (width < 2 && this.naturalHeight < 2) {
            console.log("The image is too small to see.");
            this.onerror(null as never);
            return;
          }
        }
        if (VData.url !== VData.original) {
          VData.original = VData.url;
        }
        resetOnceProperties_();
        this.onerror = this.onload = null as never;
        setTimeout(function () { // safe; because on C65, in some tests refreshing did not trigger replay
          (VShown as HTMLImageElement).src = (VShown as HTMLImageElement).src; // trigger replay for gif
        }, 0);
        showBgLink();
        this.classList.remove("hidden");
        this.classList.add("zoom-in");
        if (width >= innerWidth * 0.9) {
          (document.body as HTMLBodyElement).classList.add("filled");
        }
      };
    } else {
      url = VData.url = "";
      (VShown as HTMLImageElement).onerror(null as never);
      VShown.alt = VData.error = "\xa0(null)\xa0";
    }
    if (file) {
      VData.file = file = tryToFixFileExt_(file) || file;
      const path = file.split(<RegExpOne> /\/\\/);
      VShown.setAttribute("download", path[path.length - 1]);
      VShown.alt = file;
      VShown.title = file;
    }
    break;
  case "url":
    VShown = (importBody as ImportBody)("shownText");
    if (url && BG_) {
      let str1: Urls.Url | null = null;
      if (url.startsWith("vimium://")) {
        str1 = BG_.BgUtils_.evalVimiumUrl_(url.slice(9), Urls.WorkType.ActIfNoSideEffects, true);
      }
      str1 = str1 !== null ? str1 : BG_.BgUtils_.convertToUrl_(url, null, Urls.WorkType.ConvertKnown);
      if (typeof str1 === "string") {
        str1 = BG_.BgUtils_.detectLinkDeclaration_(str1);
        str1 = BG_.BgUtils_.reformatURL_(str1);
      }
      else if (str1 instanceof BG_.Promise) {
        str1.then(function (arr) {
          showText(arr[1], arr[0] || (arr[2] || ""));
        });
        break;
      } else if (str1 instanceof BG_.Array) {
        showText(str1[1], str1[0]);
        break;
      }
      url = str1;
    }
    if (typeof url === "string") {
      url = tryDecryptUrl(url) || url;
    }
    showText(type, url);
    break;
  default:
    url = "";
    VShown = (importBody as ImportBody)("shownImage");
    VShown.src = "../icons/icon128.png";
    bgLink.style.display = "none";
    break;
  }

  bgLink.dataset.vimUrl = url;
  if (file) {
    bgLink.dataset.vimText = file;
    bgLink.download = file;
  } else {
    bgLink.removeAttribute("data-vim-text");
    bgLink.removeAttribute("download");
  }
  bgLink.onclick = VShown ? clickShownNode : defaultOnClick;
};

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".startsWith) {
String.prototype.startsWith = function (this: string, s: string): boolean {
  return this.lastIndexOf(s, 0) === 0;
};
String.prototype.endsWith = function (this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
};
}
(window.onhashchange as () => void)();

window.onpopstate = function () {
  (window.onhashchange as () => void)();
};

document.addEventListener("keydown", function (this: void, event): void {
  if (VData.type === "image" && imgOnKeydown(event)) {
    return;
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey
    || event.shiftKey || event.repeat) { return; }
  const str = String.fromCharCode(event.keyCode as kKeyCode | kCharCode as kCharCode);
  if (str === "S") {
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
  const a = document.createElement("a"), setProto = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf
      && Build.BTypes & BrowserType.Chrome ? Object.setPrototypeOf : 0 as never;
  if (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome) {
    setProto ? setProto(options, null) : ((options as any).__proto__ = null);
  } else {
    Object.setPrototypeOf(options, null);
  }
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
  if (VData.error) { return false; }
  if (keyCode === kKeyCode.space || keyCode === kKeyCode.enter) {
    event.preventDefault();
    if (keyCode === kKeyCode.enter && viewer_ && viewer_.isShown && !viewer_.played) {
      viewer_.play(true);
    } else if (!viewer_ || !viewer_.isShown) {
      simulateClick(VShown as ValidNodeTypes, event);
    }
    return true;
  }
  if (!window.VKey) {
    return false;
  }
  let ch = VKey.char_(event);
  // todo: map key
  if (!ch) { return false; }
  let action: number = 0;
  switch (VEvent.mapKey_(ch, event)) {
  case "<c-=>": case "+": case "=": case "<up>": action = 1; break;
  case "<left>": action = -2; break;
  case "<right>": action = 2; break;
  case "<c-->": case "-": case "<down>": action = -1; break;
  default: return false;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (viewer_ && viewer_.viewed) {
    doImageAction(viewer_, action);
  } else {
    let p = loadViewer().then(showSlide);
    p.then(function (viewer) {
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
  } catch {}
  return url;
}

function importBody(id: string): HTMLElement {
  const templates = $<HTMLTemplateElement>("#bodyTemplate"),
  // note: content has no getElementById on Chrome before BrowserVer.Min$DocumentFragment$$getElementById
  node = document.importNode(templates.content.querySelector("#" + id) as HTMLElement, true);
  (document.body as HTMLBodyElement).insertBefore(node, templates);
  return node;
}

function defaultOnClick(event: MouseEvent): void {
  if (event.altKey) {
    event.stopImmediatePropagation();
    return clickLink({ download: VData.file || "" }, event);
  } else { switch (VData.type) {
  case "url": clickLink({ target: "_blank" }, event); break;
  case "image":
    if (VData.error) { return; }
    loadViewer().then(showSlide).catch(defaultOnError);
    break;
  default: break;
  } }
}

function clickShownNode(event: MouseEvent): void {
  event.preventDefault();
  if ((VShown as ValidNodeTypes).onclick) {
    (VShown as ValidNodeTypes).onclick(event);
  }
}

function showText(tip: string, body: string | string[]): void {
  $("#textTip").dataset.text = tip;
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
  const str = VData.type === "url" ? $("#textBody").textContent : VData.url;
  if (!(str && window.VPort)) { return; }
  VPort.post_({
    H: kFgReq.copy,
    d: str
  });
  return VHud.copied_(str);
}

function toggleInvert(event: Event): void {
  if (VData.type === "image") {
    if (VData.error || viewer_ && viewer_.isShown) {
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
  return (window as any)[name] = new Promise(function (resolve, reject) {
    const script = document.createElement("script");
    script.src = src;
    if (!Build.NDEBUG) {
      script.onerror = function () {
        reject("ImportError: " + name);
      };
    }
    script.onload = function () {
      const obj = (window as any)[name];
      Build.NDEBUG || obj ? resolve(obj) : (this.onerror as () => void)();
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
  err && console.log("%o", err);
}

function loadViewer(): Promise<Window["Viewer"]> {
  if (window.Viewer) {
    return Promise.resolve(Viewer);
  }
  loadCSS("../lib/viewer.min.css");
  return requireJS("Viewer", "../lib/viewer.min.js").then<Window["Viewer"]>(function (ViewerModule): Window["Viewer"] {
    ViewerModule.setDefaults({
      navbar: false,
      shown (this: void) {
        bgLink.style.display = "none";
      },
      viewed (): void { if (tempEmit) { return tempEmit(true); } },
      hide (this: void) {
        bgLink.style.display = "";
        if (tempEmit) { return tempEmit(false); }
      }
    });
    return ViewerModule;
  });
}

function showSlide(ViewerModule: Window["Viewer"]): Promise<ViewerType> | ViewerType {
  const needToScroll = scrollX || scrollY;
  const sel = getSelection();
  sel.type === "Range" && sel.collapseToStart();
  const v = viewer_ = viewer_ || new ViewerModule(VShown as HTMLImageElement);
  v.isShown || v.show();
  needToScroll && scrollTo(0, 0);
  if (v.viewed) { return v; }
  return new Promise<ViewerType>(function (resolve, reject): void {
    tempEmit = function (succeed): void {
      tempEmit = null;
      succeed ? resolve(v) : reject("failed to view the image");
    };
  });
}

function clean() {
  if (VData.type === "image") {
    (document.body as HTMLBodyElement).classList.remove("filled");
    (VShown as HTMLImageElement).removeAttribute("src");
    if (viewer_) {
      viewer_.destroy();
      viewer_ = null;
    }
  }
}

function parseSmartImageUrl_(originUrl: string): string | null {
  function safeParseURL(url1: string): URL | null { try { return new URL(url1); } catch {} return null; }
  const parsed = safeParseURL(originUrl);
  if (!parsed || !(<RegExpI> /^s?ftp|^http/i).test(parsed.protocol)) { return null; }
  let search = parsed.search;
  function DecodeURLPart_(this: void, url1: string | undefined): string {
    if (!url1) { return ""; }
    try {
      url1 = decodeURIComponent(url1);
    } catch {}
    return url1;
  }
  if (search.length > 10) {
    const keyRe = <RegExpOne> /^(?:imgurl|mediaurl|objurl|origin(?:al)?|real\w*|src|url)$/i,
    encodedSignRe = <RegExpOne> /%(?:3[aA]|2[fF])/;
    for (const item of search.slice(1).split("&")) {
      const key = item.split("=", 1)[0];
      search = item.slice(key.length + 1);
      if (search.length > 7) {
        search.indexOf("://") < 0 && encodedSignRe.test(search) && (search = DecodeURLPart_(search).trim());
        if (search.indexOf("/") > 0 && safeParseURL(search) != null) {
          if (keyRe.test(key)) {
            return search;
          }
          let arr = search.split("?")[0].split("/");
          if (ImageExtRe.test(arr[arr.length - 1]) && key.toLowerCase().indexOf("thumb") < 0) {
            return search;
          }
        }
      }
    }
  }
  let arr1: RegExpExecArray | null = null;
  if ((arr1 = (<RegExpOne> /[?&]s=\d{2,4}(&|$)/).exec(search = parsed.search)) && search.split("=").length <= 3) {
    return parsed.origin + parsed.pathname;
  }
  const path = search = parsed.pathname;
  let offset = search.lastIndexOf("/") + 1;
  search = search.slice(offset);
  let index = search.lastIndexOf("@") + 1 || search.lastIndexOf("!") + 1;
  let found: boolean | 0 = index > 2 || ImageExtRe.test(search), arr2: RegExpExecArray | null = null;
  if (found) {
    offset += index;
    search = search.slice(index);
    let re = <RegExpG & RegExpI // tslint:disable-next-line: max-line-length
> /(?:[.\-_]|\b)(?:[1-9]\d{2,3}[a-z]{1,3}[_\-]?|[1-9]\d?[a-z][_\-]?|0[a-z][_\-]?|[1-9]\d{1,3}[_\-]|[1-9]\d{1,2}(?=[.\-_]|\b)){2,6}(?=[.\-_]|\b)/gi;
    for (; arr2 = re.exec(search); arr1 = arr2) { /* empty */ }
    if (arr1 && (<RegExpI> /.[_\-].|\d\dx\d/i).test(arr1[0])) {
      let next = arr1.index + arr1[0].length;
      arr2 = ImageExtRe.exec(search.slice(next));
      offset += arr1.index;
      let len = arr1[0].length;
      if (arr2 && arr2.index === 0) {
        len += arr2[0].length;
      }
      search = path.slice(offset + len);
      if ((<RegExpOne> /[@!]$/).test(search || path.charAt(offset - 1))) {
        if (search) {
          search = search.slice(0, -1);
        } else {
          offset--;
        }
      } else if (!search && arr2 && arr2.index === 0
          && !ImageExtRe.test(path.slice(Math.max(0, offset - 6), offset))) {
        search = arr2[0];
      }
    } else if (arr1 = (<RegExpOne> /\b([\da-f]{8,48})([_-][a-z]{1,2})\.[a-z]{2,4}$/).exec(search)) {
      offset += arr1.index + arr1[1].length;
      search = search.slice(arr1.index + arr1[1].length + arr1[2].length);
    } else {
      found = false;
    }
  }
  if (found || index > 2) { found = found || 0; }
  else if (arr1 = (<RegExpOne> /_(0x)?[1-9]\d{2,3}(x0)?\./).exec(search)) {
    search = search.slice(0, arr1.index) + search.slice(arr1.index + arr1[0].length - 1);
  } else if (search.startsWith("thumb_")) {
    search = search.slice(6);
  } else if ((<RegExpOne> /^[1-9]\d+$/).test(search) && +search > 0 && +search < 640) {
    offset--;
    search = "";
  } else {
    found = 0;
  }
  return found !== 0 ? parsed.origin + path.slice(0, offset) + search : null;
}

function tryToFixFileExt_(file: string): string | void {
  if (!file || (<RegExpOne> /.\.[a-z]{3,4}\b/i).test(file)) { return; }
  const ext = ImageExtRe.exec(VData.url);
  if (ext) {
    return file + ext[0];
  }
}

function tryDecryptUrl(url: string): string {
  const schema = url.split(":", 1)[0];
  switch (schema.toLowerCase()) {
  case "thunder": case "flashget": case "qqdl":
    url = url.slice(schema.length + 3).split("&", 1)[0];
    break;
  default: return "";
  }
  try {
    url = atob(url);
  } catch { return ""; }
  if (url.startsWith("AA") && url.endsWith("ZZ")) {
    url = url.slice(2, -2);
  }
  if (url.startsWith("[FLASHGET]") && url.endsWith("[FLASHGET]")) {
    url = url.slice(10, -10);
  }
  return tryDecryptUrl(url) || url;
}

function disableAutoAndReload_(): void {
  console.log("Failed to visit the predicted URL, so go back to the original version.");
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
      const ch = useCodePoint ? (message.codePointAt as NonNullable<string["codePointAt"]>)(i) : message.charCodeAt(i);
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
      //   arr.push(0xf8 | (ch >> 24), 0x80 | ((ch >> 18) & 0x3f), 0x80 | ((ch >> 12) & 0x3f)
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
      decoded.push(((ch & 0x07) << 18) | ((arr[i + 1] & 0x3f) << 12) | ((arr[i + 2] & 0x3f) << 6)
        | (arr[i + 3] & 0x3f));
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
  return (useCodePoint ? String.fromCodePoint as NonNullable<typeof String.fromCharCode> : String.fromCharCode
    ).apply(String, decoded);
}
