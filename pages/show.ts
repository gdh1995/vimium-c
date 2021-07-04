/// <reference path="../lib/base.d.ts" />
import {
  CurCVer_, CurFFVer_, BG_, bgSettings_, OnChrome, OnFirefox, OnEdge, $, _pTrans, asyncBackend_, browser_, nextTick_,
  enableNextTick_, kReadyInfo, import2
} from "./async_bg"

interface VDataTy {
  full: string
  type: "image" | "url" | "";
  original: string;
  url: string;
  file?: string;
  auto?: boolean | "once";
  pixel?: boolean
  incognito?: boolean;
  error?: string;
}
interface KnownShowDataset extends KnownDataset {
  i: string // text in i18n
  text: string // names of type tips in i18n
  colon: string // colon string in i18n
}

let VData: VDataTy = null as never

interface ViewerType {
  scrollbarWidth: number
  hiding: boolean
  isShown: boolean
  readonly played: boolean;
  readonly viewed: boolean;
  readonly imageData: {
    naturalWidth: number, naturalHeight: number, aspectRatio: number
    ratio: number, width: number, height: number
    left: number, top: number
  }
  initialImageData: unknown;
  destroy(): any;
  show(): any;
  play(fullscreen: true): any;
  zoom(ratio: number, hasTooltip: boolean): ViewerType;
  zoomTo(ratio: number): ViewerType;
  rotate(degree: number): any;
}
type ViewerModule = new (root: HTMLElement) => ViewerType
interface ImportBody {
  (id: "shownImage"): HTMLImageElement;
  (id: "shownText"): HTMLDivElement;
}
type ValidNodeTypes = HTMLImageElement | HTMLDivElement;

const blobCache: Dict<Blob> = {}
const body = document.body as HTMLBodyElement

let ViewerModule: ViewerModule | undefined
let VShown: ValidNodeTypes | null = null;
let bgLink = $<HTMLAnchorElement & SafeHTMLElement>("#bgLink");
let tempEmit: ((succeed: boolean) => void) | null = null;
let viewer_: ViewerType | null = null;
let _initialViewerData: unknown = null;
let encryptKey = +window.name || 0;
let ImageExtRe = <RegExpI> /\.(avif|bmp|gif|icon?|jpe?g|a?png|tiff?|webp)(?=[.\-_]|\b)/i;
let _shownBlobURL = "", _shownBlob: Blob | null | 0 = null;
let loadingTimer: (() => void) | null | undefined
let _nextUrl: string | undefined

function App (this: void): void {
  if (VShown) {
    clean();
    bgLink.style.display = "none";
    VShown.remove();
    VShown = null;
  }

  VData = (window as any).VData = Object.create(null)
  let url = location.hash, type: VDataTy["type"] = "", file = ""
  let _shownHash: string | null
  if (_nextUrl || !url && asyncBackend_ && (_shownHash = asyncBackend_.shownHash_())) {
    url = _nextUrl || _shownHash!
    _nextUrl = _shownHash = ""
    if ((<RegExpI> /^[^:]+[ &]data:/i).test(url)) {
      encryptKey = -1;
    }
    encryptKey = encryptKey || Math.floor(Math.random() * 0x100000000) || 0xc3e73c18;
    let encryptedUrl = encrypt_(url, encryptKey, true);
    if (history.state) {
      history.pushState(encryptedUrl, "", "");
    } else {
      history.replaceState(encryptedUrl, "", "");
    }
    window.name = "" + encryptKey;
  }
  else if (url || !history.state) { /* empty */ }
  else if (encryptKey) {
    url = encrypt_(history.state, encryptKey, false);
    window.name = "" + encryptKey;
  } else {
    history.replaceState(null, "", ""); // clear useless data
  }
  VData.full = url;
  if (url.length < 3) { /* empty */ }
  else if (url.startsWith("#!image")) {
    url = url.slice(7);
    type = "image";
  } else if (url.startsWith("#!url")) {
    url = url.slice(5);
    type = "url";
  }
  url = url.startsWith("%20") ? url.slice(3) : url.trim();
  for (let ind = 0; ind = url.indexOf("&") + 1; url = url.slice(ind)) {
    let ind2 = url.slice(0, ind).indexOf("="),
    key = ind2 > 0 ? url.slice(0, ind2) : "", val = ind2 > 0 ? url.slice(ind2 + 1, ind - 1) : "";
    if (key === "download") {
      // avoid confusing meanings in title content
      file = decodeURLPart_(val).split(<RegExpOne> /\||\uff5c| [-\xb7] /, 1)[0].trim();
      file = file.replace(<RegExpG> /[\r\n"]/g, "");
      VData.file = file;
    } else {
      val = val.toLowerCase();
      if (key === "auto") {
        VData.auto = val === "once" ? val : val === "true" ? true : val === "false" ? false : parseInt(val, 10) > 0;
      } else if (key === "pixel") {
        VData.pixel = val === "1" || val === "true"
      } else if (key === "incognito") {
        VData.incognito = val === "true" || val !== "false" && parseInt(val, 10) > 0;
      } else {
        break;
      }
    }
  }
  url = decodeURLPart_(url, !url.includes(":") && !url.includes("/") ? null : decodeURI).trim();
  if (!url) {
    type === "image" && (type = "");
  } else if (url.toLowerCase().startsWith("javascript:")) {
    type = url = file = VData.file = "";
  } else if (BG_) {
    const str2 = asyncBackend_.convertToUrl_(url, null, Urls.WorkType.KeepAll)
    if (asyncBackend_.lastUrlType_() <= Urls.Type.MaxOfInputIsPlainUrl) {
      url = str2;
    }
  } else if (url.startsWith("//")) {
    url = "http:" + url;
  } else if ((<RegExpOne> /^([-.\dA-Za-z]+|\[[\dA-Fa-f:]+])(:\d{2,5})?\//).test(url)) {
    url = "http://" + url;
  }
  VData.type = type;
  (<RegExpI> /^data:/i).test(url) && (url = "data:" + url.slice(5));
  VData.url = VData.original = url;

  switch (type) {
  case "image":
    if (VData.auto) {
      let newUrl = parseSmartImageUrl_(url);
      if (newUrl) {
        console.log("Auto predict a better URL:\n %o =>\n %o", url, newUrl);
        url = VData.url = newUrl;
      }
    }
    VShown = (importBody as ImportBody)("shownImage");
    VShown.onerror = function (): void {
      if (VData.url !== VData.original && VData.url) {
        disableAutoAndReload_();
        return;
      }
      resetOnceProperties_();
      VData.auto = false;
      this.onerror = this.onload = null as never;
      this.alt = VData.error = sTrans_("failInLoading")
      if (!OnChrome || Build.MinCVer >= BrowserVer.MinNoBorderForBrokenImage
          || CurCVer_ >= BrowserVer.MinNoBorderForBrokenImage) {
        this.classList.add("broken");
      }
      setTimeout(showBgLink, 34);
      this.onclick = function (e) {
        if (BG_ && asyncBackend_.checkHarmfulUrl_(VData.url)) {
          return;
        }
        !e.ctrlKey && !e.shiftKey && !e.altKey && browser_.tabs && browser_.tabs.update
        ? browser_.tabs.update({ url: VData.url })
        : clickLink({ target: "_top" }, e);
      };
    };
    if ((<RegExpOne> /[:.]/).test(url)) {
      VShown.onclick = defaultOnClick;
      VShown.onload = function (this: HTMLImageElement): void {
        const width = this.naturalWidth, height = this.naturalHeight;
        if (width < 12 && height < 12) {
          if (VData.auto) {
            disableAutoAndReload_();
            return;
          } else if (width < 2 && height < 2) {
            console.log("The image is too small to see.");
            this.onerror(null as never);
            return;
          }
        }
        VData.original = VData.url;
        resetOnceProperties_();
        const url_prefix = VData.url.slice(0, 6).toLowerCase(), is_blob = url_prefix.startsWith("blob:")
        if (is_blob || url_prefix.startsWith("data:") && !this.src.startsWith("data")) {
          bgLink.dataset.vimUrl = VData.original = VData.url = this.src;
          recoverHash_(is_blob ? 0 : 1)
        }
        this.onerror = this.onload = null as never;
        this.src.startsWith("blob:") ||
        setTimeout(function () { // safe; because on C65, in some tests refreshing did not trigger replay
          (VShown as HTMLImageElement).src = (VShown as HTMLImageElement).src; // trigger replay for gif
        }, 0);
        showBgLink();
        this.classList.add("zoom-in");
        if (VData.pixel) {
          body.classList.add("pixel")
          const dpr = devicePixelRatio
          if (width > innerWidth * dpr * 0.9 && height > (innerHeight as number) * dpr * 0.9) {
            const el = importBody("snapshot-banner", true);
            (el.querySelector(".banner-close") as SVGElement)!.onclick = _e => { el.remove() }
            let arr = el.querySelectorAll("[data-i]") as ArrayLike<Element> as HTMLElement[]
            for (let i = 0; i < arr.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
              const s = (arr[i].dataset as KnownShowDataset).i, isTitle = s.endsWith("-t")
              const t = (sTrans_ as typeof _pTrans)(isTitle ? s.slice(0, -2) : s)
              t && (isTitle ? arr[i].title = t : arr[i]!.textContent = t)
            }
            body.insertBefore(el, body.firstChild)
          }
        }
        if (width >= innerWidth * 0.9) {
          body.classList.add("filled");
        }
      };
      fetchImage_(url, VShown);
    } else {
      url = VData.url = "";
      VShown.onerror(null as never);
      VShown.alt = VData.error = sTrans_("none")
    }
    if (file) {
      VData.file = file = tryToFixFileExt_(file) || file;
      const path = file.split(<RegExpOne> /[/\\]+/);
      path.length > 1 && VShown.setAttribute("download", path[path.length - 1]);
      VShown.alt = file;
      VShown.setAttribute("aria-title", file)
    }
    break;
  case "url":
    VShown = (importBody as ImportBody)("shownText");
    if (url && BG_) {
      let str1: Urls.Url | null = null;
      if (url.startsWith("vimium://")) {
        str1 = asyncBackend_.evalVimiumUrl_(url.slice(9), Urls.WorkType.ActIfNoSideEffects, true)
      }
      str1 = str1 !== null ? str1 : asyncBackend_.convertToUrl_(url, null, Urls.WorkType.ConvertKnown)
      if (typeof str1 === "string") {
        str1 = asyncBackend_.findUrlInText_(str1, "whole")
        str1 = asyncBackend_.reformatURL_(str1)
      }
      else if (str1 instanceof BG_.Promise) {
        void str1.then(function (arr): void {
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
}

import type * as i18n_options from "../i18n/zh/show.json"

export const sTrans_ = _pTrans as (key: keyof typeof i18n_options, arg1?: (string | number)[]) => string

enableNextTick_(kReadyInfo.platformInfo)

nextTick_((): void => {
  window.onhashchange = App
  window.onpopstate = App
  App()
})

addEventListener(GlobalConsts.kLoadEvent, function onContentLoaded(): void {
  if (OnChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once) {
    removeEventListener(GlobalConsts.kLoadEvent, onContentLoaded, { capture: true })
  }
  window.VApi && (VApi.u = getContentUrl_)
}, { once: true, capture: true })

window.onunload = destroyObject_;

body.ondrop = (e): void => {
  const files = e.dataTransfer.files
  if (files.length === 1) {
    const file = files.item(0), name = file.name
    if (file.type.startsWith("image/") || ImageExtRe.test(name)) {
      (e as Event as EventToPrevent).preventDefault()
      _nextUrl = "#!image download=" + name + "&" + URL.createObjectURL(file);
      App()
    }
  }
}

body.ondragover = body.ondragenter = (e): void => {
  const items = e.dataTransfer.items
  if (items.length === 1) {
    const item = items[0]
    if (item.type.startsWith("image/")) {
      (e as Event as EventToPrevent).preventDefault()
    }
  }
}

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
    copyThing(event);
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

function clickLink(this: void, options: { [key: string]: string }
    , event: MouseEventToPrevent | KeyboardEventToPrevent): void {
  event.preventDefault();
  if (!VData.url) { return; }
  const a = document.createElement("a")
    Object.setPrototypeOf(options, null);
  for (const i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = VData.url; // lgtm [js/client-side-unvalidated-url-redirection]
  if (!OnFirefox) {
    simulateClick(a, event)
    return
  }
  browser_.permissions.contains({ permissions: ["downloads"] }, (permitted: boolean): void => {
    if (!permitted) {
      simulateClick(a, event);
    } else {
      const opts: chrome.downloads.DownloadOptions = { url: a.href }
      if (a.download) { opts.filename = a.download }
      (browser as typeof chrome).downloads.download!(opts).catch((): void => { /* empty */ })
    }
    return browser_.runtime.lastError
  })
}

function simulateClick(a: HTMLElement, event: MouseEvent | KeyboardEvent): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, 0, null);
  return a.dispatchEvent(mouseEvent);
}

function imgOnKeydown(event: KeyboardEventToPrevent): boolean {
  if (VData.error) { return false; }
  const {keyCode} = event,
  key = window.VApi && VApi.z ? VApi.m({c: kChar.INVALID, e: event, i: keyCode}, kModeId.Show)
      : keyCode === kKeyCode.space ? kChar.space : keyCode === kKeyCode.enter ? kChar.enter : "",
  keybody = (key.slice(key.lastIndexOf("-") + 1) || key && kChar.minus) as kChar;
  if (keybody === kChar.space || keybody === kChar.enter) {
    if (VData.pixel) {
      const active = document.activeElement, banner = active && document.querySelector("#snapshot-banner")
      if (banner && banner.contains(active!)) {
        const close = banner.querySelector(".banner-close") as SVGElement
        if (close.contains(active!)) {
          close.onclick(null as never)
        }
        return true
      }
    }
    event.preventDefault();
    if (keybody === kChar.enter && viewer_ && viewer_.isShown && !viewer_.hiding && !viewer_.played) {
      viewer_.play(true);
    } else if (!viewer_ || !viewer_.isShown || viewer_.hiding) {
      simulateClick(VShown as ValidNodeTypes, event);
    }
    return true;
  }
  let action = 0;
  switch (key) {
  case "c-=": case "m-=": case "+": case "=": case "up": action = 1; break;
  case "left": action = -2; break;
  case "right": action = 2; break;
  case "c--": case "m--": case "-": case "down": action = -1; break;
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

function doImageAction(viewer: ViewerType, action: number): void {
  if (action === 2 || action === -2) {
    viewer.rotate(action * 45);
  } else {
    viewer.zoom(action / 10, true);
  }
}

function decodeURLPart_(url: string, func?: typeof decodeURI | null): string {
  try {
    url = (func || decodeURIComponent)(url);
  } catch {}
  return url;
}

function importBody(id: string, notInsert?: boolean): HTMLElement {
  const templates = $<HTMLTemplateElement>("#bodyTemplate"),
  // note: content has no getElementById on Chrome before BrowserVer.Min$DocumentFragment$$getElementById
  node = document.importNode(templates.content.querySelector("#" + id) as HTMLElement, true);
  notInsert || (document.body as HTMLBodyElement).insertBefore(node, templates)
  return node;
}

function defaultOnClick(event: MouseEventToPrevent): void {
  if (event.altKey) {
    event.stopImmediatePropagation();
    return clickLink({ download: VData.file || "" }, event);
  } else { switch (VData.type) {
  case "url": clickLink({ target: "_blank" }, event); break;
  case "image":
    if (VData.error) { return; }
    const isCtrl = event.ctrlKey || event.metaKey
    loadViewer().then(exports => showSlide(exports, isCtrl)).catch(defaultOnError)
    break;
  default: break;
  } }
}

function clickShownNode(event: MouseEventToPrevent): void {
  event.preventDefault();
  const a = VShown as ValidNodeTypes;
  if (a.onclick) {
    a.onclick(event);
  }
}

function showText(tip: string | Urls.kEval, details: string | string[]): void {
  tip = typeof tip === "number" ? ["math", "copy", "search", "ERROR", "status", "paste"
      , "url"
      ][tip] : tip;
  ($("#textTip").dataset as KnownShowDataset).text = sTrans_(`t_${tip as "math" | "copy"}`) || tip;
  ($(".colon").dataset as KnownShowDataset).colon = sTrans_("colon") + sTrans_("NS")
  const textBody = $("#textBody");
  if (details) {
    textBody.textContent = typeof details !== "string" ? details.join(" ") : details;
    (VShown as ValidNodeTypes).onclick = copyThing;
  } else {
    textBody.classList.add("null");
  }
  return showBgLink();
}

function copyThing(event: EventToPrevent): void {
  const sel = getSelection(), selText = "" + sel
  if (selText && (VData.type !== "image" || selText.trim() !== (VShown as HTMLImageElement).alt.trim())) {
    // on Firefox, Selection will grab .alt text
    return
  }
  if (VData.type === "image" && VData.url) {
    if (sel.type === "Range" && !VData.url.startsWith(location.protocol)) {
      // e.g. Ctrl+A and then Ctrl+C; work well with MS Word
      return;
    }
    event.preventDefault();
    const clipboard = navigator.clipboard;
    if (OnFirefox || OnChrome
          && Build.MinCVer >= BrowserVer.MinEnsured$Clipboard$$write$and$ClipboardItem
        || clipboard && clipboard.write) {
      const blobPromise = _shownBlob != null ? Promise.resolve(_shownBlob) : fetch(VData.url, {
        cache: "force-cache",
        referrer: "no-referrer"
      }).then(res => res.blob()).catch(() => (_copyStr(VData.url), 0 as const)
      ).then(blob => _shownBlob = blob),
      navClipPromise = blobPromise.then<0 | void>(blob => {
        if (!blob) { return }
        const item: { [mime: string]: Blob } = {
          // Chrome 79 refuses image/jpeg
          "image/png": new Blob([blob], {type: "image/png"}),
          "text/html": new Blob,
          "text/plain": new Blob([VData.url], {type: "text/plain"})
        }
        const doWrite = (): Promise<void> => clipboard!.write!([new ClipboardItem(item)])
        if (!OnChrome
            || Build.MinCVer < BrowserVer.MinClipboardWriteHTML && CurCVer_ < BrowserVer.MinClipboardWriteHTML) {
          return doWrite()
        }
        const img = document.createElement("img")
        img.src = VData.url // lgtm [js/client-side-unvalidated-url-redirection]
        VData.file && (img.setAttribute("aria-title", img.alt = VData.file))
        item["text/html"] = new Blob([img.outerHTML], {type: "text/html"})
        return doWrite().catch(() => (delete item["text/html"], doWrite()))
      }),
      finalPromise = OnFirefox
          ? navClipPromise.catch((): any => {
            const clip = _shownBlob && (browser as typeof chrome).clipboard
            return clip && (Build.MinFFVer < FirefoxBrowserVer.Min$Blob$$arrayBuffer
                  && !(_shownBlob as Blob).arrayBuffer ? new Response(_shownBlob as Blob) : _shownBlob as Blob
                ).arrayBuffer().then(arr => clip.setImageData(arr, "png"))
          }) : navClipPromise;
      finalPromise.catch(ex => { console.log(ex); _copyStr(VData.url); });
      return;
    }
  }
  const str = VData.type === "url" ? $("#textBody").textContent : VData.url;
  _copyStr(str, event);
}

function _copyStr(str: string, event?: EventToPrevent): void {
  if (!(str && window.VApi)) { return; }
  event && event.preventDefault();
  VApi.p({
    H: kFgReq.copy,
    s: str
  });
}

function toggleInvert(event: EventToPrevent): void {
  if (VData.type === "image") {
    if (VData.error || viewer_ && viewer_.isShown && !viewer_.hiding) {
      event.preventDefault();
    } else {
      (VShown as ValidNodeTypes).classList.toggle("invert");
    }
  }
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

function loadViewer(): Promise<ViewerModule> {
  if (ViewerModule) {
    return Promise.resolve(ViewerModule)
  }
  loadCSS("../lib/viewer.min.css");
  return import2("../lib/viewer.min.js").then((viewerJS: any): ViewerModule => {
    viewerJS = viewerJS && typeof viewerJS === "function" ? viewerJS
        : (window as unknown as { Viewer: typeof viewerJS }).Viewer
    viewerJS.setDefaults({ // eslint-disable-line @typescript-eslint/no-unsafe-call
      navbar: false,
      shown (this: void) {
        bgLink.style.display = "none";
      },
      viewed (): void { if (tempEmit) { tempEmit(true); } },
      hide (this: void) {
        bgLink.style.display = "";
        if (tempEmit) { tempEmit(false); }
      }
    });
    ViewerModule = viewerJS
    return viewerJS
  });
}

function showSlide(viewerModule: ViewerModule, zoomToFit?: boolean): Promise<ViewerType> | ViewerType {
  const needToScroll = scrollX || scrollY;
  const sel = getSelection();
  sel.type === "Range" && sel.collapseToStart();
  const v = viewer_ = viewer_ || new viewerModule(VShown as HTMLImageElement);
  v.scrollbarWidth = 0
  if (v.hiding) {
    v.isShown = false
  }
  v.isShown || v.show();
  v.hiding = false
  needToScroll && scrollTo(0, 0);
  if (v.viewed) { v.zoomTo(1); return v; }
  Object.defineProperty(v, "initialImageData", {
    configurable: true,
    enumerable: true,
    get: () => _initialViewerData,
    set (val: unknown): void {
      _initialViewerData = val
      if (viewer_ && !zoomToFit) {
        zoomToFit = true
        const imageData = viewer_.imageData
        const ratio = 1
        // the following lines are from viewer.js:src/js/methods.js#zoomTo
        const newWidth = imageData.naturalWidth * ratio
        const newHeight = imageData.naturalHeight * ratio
        const offsetWidth = newWidth - imageData.width
        const offsetHeight = newHeight - imageData.height
        imageData.left -= offsetWidth / 2
        imageData.top -= offsetHeight / 2
        imageData.width = newWidth
        imageData.height = newHeight
        imageData.ratio = ratio
      }
    }
  })
  return new Promise<ViewerType>(function (resolve, reject): void {
    tempEmit = function (succeed): void {
      tempEmit = null;
      succeed ? resolve(v) : reject("failed to view the image");
    };
  });
}

function clean(): void {
  destroyObject_();
  _shownBlob = null
  if (loadingTimer) {
    loadingTimer()
    loadingTimer = null
  }
  if (VData.type === "image") {
    const boxClass = (document.body as HTMLBodyElement).classList
    VShown!.classList.remove("svg")
    boxClass.remove("pixel")
    boxClass.remove("filled");
    (VShown as HTMLImageElement).removeAttribute("src");
    (VShown as HTMLImageElement).onerror = (VShown as HTMLImageElement).onload = null as never
    if (viewer_) {
      viewer_.destroy();
      viewer_ = null;
    }
  }
}

function parseSmartImageUrl_(originUrl: string): string | null {
  const stdUrl = originUrl;
  originUrl = BG_ && asyncBackend_.substitute_(originUrl, SedContext.image) || originUrl
  function safeParseURL(url1: string): URL | null { try { return new URL(url1); } catch {} return null; }
  const parsed = safeParseURL(originUrl);
  if (!parsed || !(<RegExpI> /^(ht|s?f)tp/i).test(parsed.protocol)) { return null; }
  const {origin, pathname: path} = parsed;
  let search = parsed.search;
  function DecodeURLPart_(this: void, url1: string | undefined): string {
    try {
      url1 = decodeURIComponent(url1 || "");
    } catch {}
    return url1 as string;
  }
  if (search.length > 10) {
    for (const item of search.slice(1).split("&")) {
      const key = item.split("=", 1)[0];
      let val0 = item.slice(key.length + 1), val = val0;
      if (val.length > 7) {
        if (!val.includes("://") && (<RegExpOne> /%(?:3[aA]|2[fF])/).test(val)) {
          val = DecodeURLPart_(val).trim();
        }
        if (val.includes("/") && safeParseURL(val) != null) {
          if ((<RegExpOne> /^(?:imgurl|mediaurl|objurl|origin(?:al)?|real\w*|src|url)$/i).test(key)) {
            return val;
          }
          let arr = val.split("?")[0].split("/");
          if (ImageExtRe.test(arr[arr.length - 1]) && !(<RegExpI> /\bthumb/i).test(key)) {
            return val;
          }
        } else if (key === "id" && (<RegExpOne> /&w=\d{2,4}&h=\d{2,4}/).test(search)) {
          return origin + path + "?id=" + val0;
        }
      }
      if (key === "name" && (<RegExpOne> /^(\d{2,4}x\d{2,4}|small)$/i).test(val0)
          && search.toLowerCase().includes("format=")) {
        return origin + path + search.replace(val, "large")
      }
    }
  }
  let arr1: RegExpExecArray | null = null;
  if ((arr1 = (<RegExpOne> /[?&]s=\d{2,4}(&|$)/).exec(search)) && search.split("=").length <= 3) {
    return origin + path;
  }
  search = path;
  let offset = search.lastIndexOf("/") + 1;
  search = search.slice(offset);
  let index = search.lastIndexOf("@") + 1 || search.lastIndexOf("!") + 1;
  let found: boolean | 0 = index > 2 || ImageExtRe.test(search), arr2: RegExpExecArray | null = null;
  if (found) {
    offset += index;
    search = search.slice(index);
    let re = <RegExpG & RegExpI // eslint-disable-next-line max-len
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
    } else if (arr1 = (<RegExpOne> /\b([\da-f]{8,48})([_-](?:[a-z]{1,2}|\d{3,4}[whp]?))\.[a-z]{2,4}$/).exec(search)) {
      offset += arr1.index + arr1[1].length;
      search = search.slice(arr1.index + arr1[1].length + arr1[2].length);
    } else {
      found = false;
    }
  }
  if (found || index > 2) { found = found || 0; }
  else if (arr1 = (<RegExpOne> /_(0x)?[1-9]\d{2,3}([whp]|x0)?\./).exec(search)) {
    search = search.slice(0, arr1.index) + search.slice(arr1.index + arr1[0].length - 1);
  } else if (search.startsWith("thumb_")) {
    search = search.slice(6);
  } else if ((<RegExpOne> /^[1-9]\d+$/).test(search) && +search > 0 && +search < 640) {
    offset--;
    search = "";
  } else if (ImageExtRe.test(search) && (<RegExpOne> /^\/(small|(thumb|mw|orj)[1-9]\d{2,3})\//).test(path)) {
    found = true
    search = "/large" + path.slice(path.indexOf("/", 1))
    offset = 0
  } else {
    found = 0;
  }
  return found !== 0 ? origin + path.slice(0, offset) + search
      : stdUrl !== originUrl ? originUrl : null;
}

function tryToFixFileExt_(file: string): string | void {
  if (!file || (<RegExpOne> /.\.[a-z]{3,4}\b/i).test(file)) { return; }
  const ext = ImageExtRe.exec(VData.url);
  if (ext) {
    return file + ext[0];
  }
  const type = _shownBlob ? _shownBlob.type.toLowerCase() : "";
  if (type.startsWith("image/")) {
    const map = {
      jpeg: "jpg", png: 0, bmp: 0, svg: 0, gif: 0, tif: 0, ico: 0
    } as const;
    for (const key in map) {
      if (map.hasOwnProperty(key) && type.includes(key)) {
        return map[key as keyof typeof map] || "." + key;
      }
    }
  }
}

function fetchImage_(url: string, element: HTMLImageElement): void {
  const text = new Text(),
  clearTimer = loadingTimer = (): void => {
    element.removeEventListener("load", clearTimer);
    element.removeEventListener("error", clearTimer);
    clearTimeout(timer);
    text.remove();
    loadingTimer === clearTimer && (loadingTimer = null)
  };
  element.addEventListener("load", clearTimer, true);
  element.addEventListener("error", clearTimer, true);
  const url_prefix = url.slice(0, 20).toLowerCase()
  const is_blob = url_prefix.startsWith("blob:"), is_data = url_prefix.startsWith("data:")
  if (is_data && url_prefix.startsWith("data:image/svg+xml,")) {
    element.classList.add("svg")
  }
  if (!is_blob && (!is_data || url.length < 1e4)
      && ((!VData.incognito && !bgSettings_.get_("showInIncognito"))
          || !(<RegExpOne> /^(ht|s?f)tp|^data:/).test(url_prefix)
          || OnChrome && Build.MinCVer < BrowserVer.MinEnsured$fetch
              && !(window as any).fetch
          || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredFetchRequestCache
              // has known MinMaybe$fetch$And$Request == MinMaybe$fetch == 41
              && !("cache" in Request.prototype))) {
    element.src = url; // lgtm [js/client-side-unvalidated-url-redirection]
  } else {
    destroyObject_();
    body.replaceChild(text, element);
    void Promise.resolve(blobCache[url] || (OnChrome && Build.MinCVer < BrowserVer.MinFetchDataURL
        && CurCVer_ < BrowserVer.MinFetchDataURL ? new Promise<Blob>((resolve, reject): void => {
      const req = new XMLHttpRequest() as BlobXHR
      req.responseType = "blob"
      req.onload = function (): void { resolve(this.response) }
      req.onerror = function (e): void { reject("Error: " + e.message) }
      req.open("GET", url, true)
      req.send()
    }) : fetch(url, is_blob || is_data ? {} : {
      cache: "no-store",
      referrer: "no-referrer"
    }).then(res => res.blob()))).then(blob => {
      blobCache[url] = blob
      return _shownBlobURL = URL.createObjectURL(_shownBlob = blob)
    }, () => url).then(newUrl => {
      element.src = newUrl; // lgtm [js/client-side-unvalidated-url-redirection]
      text.parentNode ? body.replaceChild(element, text) : body.appendChild(element)
    });
  }
  const timer = setTimeout(() => {
    if (!element.parentNode || element.scrollHeight >= 24 || element.scrollWidth >= 80) { // some pixels drawn
      clearTimer();
    } else if (!text.parentNode) {
      body.insertBefore(text, element);
      text.data = sTrans_("loading")
    }
  }, 400);
}

function destroyObject_(): void {
  if (_shownBlobURL) {
    URL.revokeObjectURL(_shownBlobURL);
    _shownBlobURL = "";
  }
}

function tryDecryptUrl(url: string): string {
  const scheme = url.split(":", 1)[0];
  switch (scheme.toLowerCase()) {
  case "thunder": case "flashget": case "qqdl":
    url = url.slice(scheme.length + 3).split("&", 1)[0];
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
  App()
}

function resetOnceProperties_(): boolean {
  let changed = false;
  if (VData.auto === "once") {
    VData.auto = false;
    changed = true;
  }
  changed && recoverHash_();
  return changed;
}

function recoverHash_(notUpdateHistoryState?: BOOL): void {
  const type = VData.type;
  if (!type) {
    return;
  }
  let url = "#!" + type + " "
      + (VData.incognito ? "incognito=1&" : "")
      + (VData.file ? "download=" + encodeAsciiComponent_(VData.file)
          + "&" : "")
      + (VData.auto ? "auto=" + (VData.auto === "once" ? "once" : 1) + "&" : "")
      + (VData.pixel ? "pixel=1&" : "")
      + VData.original;
  VData.full = url;
  if (notUpdateHistoryState) { return; }
  let encryptedUrl = encrypt_(url, encryptKey, true);
  history.replaceState(encryptedUrl, "", "");
}

function encodeAsciiComponent_ (url: string): string { return url.replace(
    OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    ? <RegExpG & RegExpSearchable<0>> /[\x00-`{-\u0390\u03ca-\u4dff\u9fa6-\uffff\s]+/g // Greek letters / CJK
    : <RegExpG & RegExpSearchable<0>> new RegExp("[^\\p{L}\\p{N}]+", "ug" as "g"),
    encodeURIComponent)
}

function encrypt_(message: string, password: number, doEncrypt: boolean): string {
  if (password === -1) { return message; }
  const arr: number[] = [];
  if (doEncrypt) {
    message = encodeURIComponent(message);
  } else {
    try {
      message = atob(message);
    } catch { message = ""; }
  }
  for (const ch of message) {
    arr.push(ch.charCodeAt(0));
  }
  for (let i = 0; i < arr.length; i++) {
    arr[i] = 0xff & (arr[i] ^ (password >>> (8 * (i & 3))));
  }
  message = String.fromCharCode(... arr);
  if (doEncrypt) {
    message = btoa(message);
  } else {
    try {
      message = decodeURIComponent(message);
    } catch { message = ""; }
  }
  return message;
}

function getContentUrl_(): string {
  if (!VData || !VData.full) { return location.href }
  return location.href.split("#", 1)[0] + VData.full;
}

if (!Build.NDEBUG) {
  const exported: Dict<any> = {
    showBgLink, clickLink, simulateClick, imgOnKeydown, doImageAction, decodeURLPart_,
    importBody, defaultOnClick, clickShownNode, showText, copyThing, _copyStr, toggleInvert, import2, loadCSS,
    defaultOnError, loadViewer, showSlide, clean, parseSmartImageUrl_, tryToFixFileExt_, fetchImage_,
    destroyObject_, tryDecryptUrl, disableAutoAndReload_, resetOnceProperties_, recoverHash_, encrypt_, getOmni_: getContentUrl_,
  };
  for (let key in exported) { if (exported.hasOwnProperty(key)) { (window as any)[key] = exported[key]; } }
  (window as any).VShown = () => ({
    VShown, bgLink, tempEmit, viewer_, encryptKey, ImageExtRe, _shownBlobURL,
  })
}
