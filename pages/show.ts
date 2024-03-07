import {
  CurCVer_, CurFFVer_, OnChrome, OnFirefox, OnEdge, $, pageTrans_, browser_, nextTick_, enableNextTick_, kReadyInfo,
  import2_, TransTy, isVApiReady_, post_, disconnect_, simulateClick_, ValidFetch, hasShift_, setupPageOs_, isRepeated_, prevent_
} from "./async_bg"
import { kPgReq } from "../background/page_messages"
import type * as i18n_action from "../i18n/zh/action.json"

interface VDataTy {
  full: string
  type: "image" | "url" | "text" | ""
  original: string;
  url: string;
  rawSrc?: string
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
    ratio: number, oldRatio: number, oldXY?: [number, number]
    width: number, height: number, left: number, top: number, x: number, y: number
  }
  toggle(originalEvent: Event): ViewerType
  initImage(done: () => void): void
  destroy(): any;
  show(): any;
  play(fullscreen: true): any;
  zoom(ratio: number, hasTooltip: boolean): ViewerType;
  zoomTo(ratio: number, hasTooltip?: boolean, _originalEvent?: Event): ViewerType;
  rotate(degree: number): any;
}
type ViewerModule = new (root: HTMLElement) => ViewerType
interface ImportBody {
  (id: "shownImage"): HTMLImageElement;
  (id: "shownText"): HTMLDivElement;
}
type ValidNodeTypes = HTMLImageElement | HTMLDivElement;

const useBG = true
const blobCache: Dict<Blob> = {}
const body = document.body as HTMLBodyElement

let ViewerModule: ViewerModule | undefined
let VShown: ValidNodeTypes | null = null;
let bgLink = $<HTMLAnchorElement & SafeHTMLElement>("#bgLink");
let tempEmit: ((succeed: boolean) => void) | null = null;
let viewer_: ViewerType | null = null;
let encryptKey = +window.name || 0;
let zoomToFit = false, duringToggle = false
let ImageExtRe = <RegExpI> /\.(?:avif|bmp|gif|icon?|jpe?g|a?png|svg|tiff?|webp)(?=[.\-_]|\b)/i;
let _shownBlobURL = "", _shownBlob: Blob | null | 0 = null;
let loadingTimer: (() => void) | null | undefined
let _nextUrl: string | undefined

async function App (this: void): Promise<void> {
  if (VShown) {
    clean();
    bgLink.style.display = "none";
    VShown.remove();
    VShown = null;
  }

  VData = (window as any).VData = Object.create(null)
  let url = location.hash, type: VDataTy["type"] = "", file = ""
  let _shownHash: string | null
  if (_nextUrl || !url && useBG && (_shownHash = await post_(kPgReq.shownHash))) {
    url = _nextUrl || _shownHash!
    _nextUrl = ""
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
    url = encrypt_(history.state as string, encryptKey, false)
    window.name = "" + encryptKey;
  } else {
    history.replaceState(null, "", ""); // clear useless data
  }
  VData.full = url;
  if (url.length < 3) { /* empty */ }
  else if (url.startsWith("#!image")) {
    url = url.slice(7);
    type = "image";
  } else if ((<RegExpOne> /^#!(url|text)\b/).test( url)) {
    type = url[2] === "u" ? "url" : "text"
    url = url.slice(type === "url" ? 5 : 6)
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
    } else if (key === "src") {
      VData.rawSrc = decodeURLPart_(val)
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
  { const url2 = decodeURLPart_(url, url.includes(":") || url.includes("/") ? decodeURI : null)
  url = (url2 != url && !(<RegExpOne> /[%\n]/).test(url2) ? url2 : url).trim() }
  if (!url) {
    type === "image" && (type = "");
  } else if (url.toLowerCase().startsWith("javascript:")) {
    type = url = file = VData.file = "";
  } else if (useBG) {
    const res = await post_(kPgReq.convertToUrl, [url, Urls.WorkType.KeepAll])
    if (res[1] <= Urls.Type.MaxOfInputIsPlainUrl) {
      url = res[0]
    }
  } else if (url.startsWith("//")) {
    url = "http:" + url;
  } else if ((<RegExpOne> /^([-.\dA-Za-z]+|\[[\dA-Fa-f:]+])(:\d{2,5})?\//).test(url)) {
    url = "http://" + url;
  }
  VData.type = type;
  (<RegExpI> /^data:/i).test(url) && (url = "data:" + url.slice(5).replace(<RegExpG> /#/g, "%23"))
  VData.url = VData.original = url;

  switch (type) {
  case "image":
    if (VData.auto) {
      let usableSrc = (<RegExpI> /^(blob|data):/i).test(url.slice(0, 5)) && VData.rawSrc || url
      let newUrl = await parseClearImageUrl_(
          useBG && await post_(kPgReq.substitute, [usableSrc, SedContext.image]) || usableSrc, usableSrc)
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
      this.onclick = async function (e) {
        if (useBG && await post_(kPgReq.checkHarmfulUrl, VData.url)) {
          return;
        }
        !e.ctrlKey && !e.shiftKey && !e.altKey && browser_.tabs && browser_.tabs.update
        ? browser_.tabs.update({ url: VData.url })
        : clickLink({ target: "_top" }, e);
      };
    };
    if ((<RegExpOne> /[:.]/).test(url)) {
      VShown.alt = sTrans_("loading")
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
        this.alt = file
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
              const t = pageTrans_(isTitle ? s.slice(0, -2) : s)
              t && (isTitle ? arr[i].title = t : arr[i]!.textContent = t)
            }
            OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
                ? body.insertBefore(el, body.firstChild) : body.prepend!(el)
          }
        }
        if (width >= innerWidth * 0.9) {
          body.classList.add("filled");
        }
      };
      const setUrlDirectly = await doesSetUrlDirectly(url)
      fetchImage_(url, VShown, setUrlDirectly)
    } else {
      url = VData.url = "";
      VShown.onerror(null as never);
      VShown.alt = VData.error = sTrans_("none")
    }
    if (file) {
      VData.file = file = tryToFixFileExt_(file) || file;
      const path = file.split(<RegExpOne> /[/\\]+/);
      path.length > 1 && VShown.setAttribute("download", path[path.length - 1]);
      VShown.setAttribute("aria-title", file)
    }
    break;
  case "url": case "text":
    VShown = (importBody as ImportBody)("shownText");
    if (url && type !== "text") {
      let str1 = await post_(kPgReq.showUrl, url)
      if (typeof str1 !== "string") {
        showText(str1[1], str1[0] || (str1[2] || ""))
        break;
      }
      url = str1;
    }
    url = tryDecryptUrl(url) || url;
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

export const sTrans_: TransTy<keyof typeof i18n_action> = (k, a): string => pageTrans_(k, a) || ""

enableNextTick_(kReadyInfo.show)
void isVApiReady_.then((): void => { VApi!.u = getContentUrl_ })

nextTick_((): void => {
  window.onhashchange = App // eslint-disable-line @typescript-eslint/no-misused-promises
  window.onpopstate = App // eslint-disable-line @typescript-eslint/no-misused-promises
  void App().then((): void => { void isVApiReady_.then(disconnect_) })
  void post_(kPgReq.showInit).then((conf): void => { setupPageOs_(conf.os) })
})

window.onpagehide = destroyObject_;

body.ondrop = (e): void => {
  const files = e.dataTransfer.files
  if (files.length === 1) {
    const file = files.item(0), name = file.name
    if (file.type.startsWith("image/") || ImageExtRe.test(name)) {
      prevent_(e as Event as EventToPrevent)
      _nextUrl = "#!image download=" + encodeAsciiComponent_(name) + "&" + URL.createObjectURL(file);
      void App()
    }
  }
}

body.ondragover = body.ondragenter = (e): void => {
  const items = e.dataTransfer.items
  if (items.length === 1) {
    const item = items[0]
    if (item.type.startsWith("image/")) {
      prevent_(e as Event as EventToPrevent)
    }
  }
}

document.addEventListener("keydown", function (this: void, event): void {
  if (VData.type === "image" && imgOnKeydown(event)) {
    return;
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey || isRepeated_(event) || hasShift_(event)) { return }
  const str = String.fromCharCode(event.keyCode as kKeyCode | kCharCode as kCharCode);
  if (str === "S") {
    clickLink({
      download: VData.file || ""
    }, event);
  } else if (str === "C") {
    copyThing(event);
  } else if (str === "A") {
    toggleInvert(event);
  } else if (str === "O") {
    prevent_(event)
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (): void => {
      const file = input.files && input.files[0]
      if (file) {
        _nextUrl = "#!image download=" + encodeAsciiComponent_(file.name) + "&" + URL.createObjectURL(file);
        void App()
      }
    }
    document.body!.appendChild(input)
    setTimeout((): void => { input.remove() }, 0)
    input.click()
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
  prevent_(event)
  if (!VData.url) { return; }
  const a = document.createElement("a")
    Object.setPrototypeOf(options, null);
  for (const i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = VData.url; // lgtm [js/client-side-unvalidated-url-redirection] lgtm [js/xss] lgtm [js/xss-through-dom]
  if (!OnFirefox) {
    simulateClick_(a, event)
    return
  }
  browser_.permissions.contains({ permissions: ["downloads"] }, (permitted: boolean): void => {
    if (!permitted) {
      simulateClick_(a, event);
    } else {
      const opts: chrome.downloads.DownloadOptions = { url: a.href }
      if (a.download) { opts.filename = a.download }
      (browser as typeof chrome).downloads.download!(opts).catch((): void => { /* empty */ })
    }
    return browser_.runtime.lastError
  })
}

function imgOnKeydown(event: KeyboardEventToPrevent): boolean {
  if (VData.error) { return false; }
  const {keyCode} = event,
  key = VApi && VApi.z ? VApi.r[3]({c: kChar.INVALID, e: event, i: keyCode, v: ""}, kModeId.Show)
      : keyCode === kKeyCode.space ? kChar.space : keyCode === kKeyCode.enter ? kChar.enter : "",
  keybody = (key.slice(key.lastIndexOf("-") + 1) || key && kChar.minus) as kChar;
  if (keybody === kChar.space || keybody === kChar.enter) {
    if (VData.pixel) {
      const active = document.activeElement, banner = active && document.querySelector("#snapshot-banner")
      if (banner && banner.contains(active)) {
        const close = banner.querySelector(".banner-close") as SVGElement
        if (close.contains(active)) {
          close.onclick(null as never)
        }
        return true
      }
    }
    prevent_(event)
    if (keybody === kChar.enter && viewer_ && viewer_.isShown && !viewer_.hiding && !viewer_.played) {
      viewer_.play(true);
    } else if (!viewer_ || !viewer_.isShown || viewer_.hiding) {
      simulateClick_(VShown as ValidNodeTypes, event);
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
  prevent_(event)
  event.stopImmediatePropagation();
  if (viewer_ && viewer_.viewed) {
    doImageAction(viewer_, action);
  } else {
    zoomToFit = false
    loadViewer().then(showSlide).then(function (viewer) {
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
  notInsert || (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
      ? (document.body as HTMLBodyElement).insertBefore(node, templates) : templates.before!(node))
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
    zoomToFit = event.ctrlKey || event.metaKey
    loadViewer().then(showSlide).catch(defaultOnError)
    break;
  default: break;
  } }
}

function clickShownNode(event: MouseEventToPrevent): void {
  prevent_(event)
  const a = VShown as ValidNodeTypes;
  if (a.onclick) {
    a.onclick(event);
  }
}

function showText(tip: string | Urls.kEval, details: string | string[]): void {
  tip = typeof tip === "number" ? ["math", "copy", "search", "ERROR", "status", "paste", "run"
      , "url", "run-one-key"][tip] : tip;
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
  const sel = getSelection(), selText = "" + <SelWithToStr> sel
  if (selText && (VData.type !== "image" || selText.trim() !== (VShown as HTMLImageElement).alt.trim())) {
    // on Firefox, Selection will grab .alt text
    return
  }
  if (VData.type === "image" && VData.url) {
    if (sel.type === "Range" && !VData.url.startsWith(location.protocol)) {
      // e.g. Ctrl+A and then Ctrl+C; work well with MS Word
      if (VApi) { VApi.h(kTip.raw, 0, sTrans_("imgCopied", ["HTML"])) }
      return;
    }
    prevent_(event)
    const clipboard = navigator.clipboard;
    if (OnFirefox || OnChrome
          && Build.MinCVer >= BrowserVer.MinEnsured$Clipboard$$write$and$ClipboardItem
        || clipboard && clipboard.write) {
      const blobPromise = _shownBlob != null ? Promise.resolve(_shownBlob) : (fetch as ValidFetch)(VData.url, {
        cache: "force-cache",
        referrer: "no-referrer"
      }).then(res => res.blob()).catch(() => (_copyStr(VData.url), 0 as const)
      ).then(blob => _shownBlob = blob),
      navClipPromise = blobPromise.then<0 | void>(blob => {
        if (!blob) { return 0 }
        if (OnFirefox && !globalThis.ClipboardItem) { throw new Error("") } // dom.events.asyncClipboard.clipboardItem
        const kPngType = "image/png", item: { [mime: string]: Blob } = {
          // Chrome 79 refuses image/jpeg
          [kPngType]: blob.type !== kPngType ? new Blob([blob], {type: kPngType}) : blob,
        }
        if ((<RegExpI> /^(http|ftp|file)/i).test(VData.url)) {
          item["text/plain"] = new Blob([VData.url], {type: "text/plain"})
        }
        const doWrite = (): Promise<void> => clipboard!.write!([new ClipboardItem(item) as object])
        if (!OnChrome
            || Build.MinCVer < BrowserVer.MinClipboardWriteHTML && CurCVer_ < BrowserVer.MinClipboardWriteHTML) {
          return doWrite()
        }
        const img = document.createElement("img")
        img.src = VData.url // lgtm [js/client-side-unvalidated-url-redirection] lgtm [js/xss] lgtm [js/xss-through-dom]
        VData.file && (img.setAttribute("aria-title", img.alt = VData.file))
        item["text/html"] = new Blob([img.outerHTML], {type: "text/html"})
        return doWrite().catch(() => (delete item["text/html"], doWrite()))
      }),
      finalPromise = OnFirefox
          ? navClipPromise.catch((): PromiseOr<void> => {
            const clip = _shownBlob && (browser as typeof chrome).clipboard
            return clip ? (Build.MinFFVer < FirefoxBrowserVer.Min$Blob$$arrayBuffer
                  && !(_shownBlob as Blob).arrayBuffer ? new Response(_shownBlob as Blob) : _shownBlob as Blob
                ).arrayBuffer().then(arr => clip.setImageData(arr, "png")) : void 0
          }) : navClipPromise;
      finalPromise.then((result: void | 0) => {
        if (VApi && result !== 0) { VApi.h(kTip.raw, 0, sTrans_("imgCopied", ["PNG"])) }
      }, (ex): void => { console.log("On copy image:", ex); _copyStr(VData.url) })
      return;
    }
  }
  const str = VData.type === "url" ? $("#textBody").textContent : VData.url;
  _copyStr(str, event);
}

function _copyStr(str: string, event?: EventToPrevent): void {
  if (!(str && VApi)) { return; }
  event && prevent_(event)
  VApi.p({
    H: kFgReq.copy,
    s: str
  });
}

function toggleInvert(event: KeyboardEventToPrevent): void {
  if (VData.type === "image") {
    if (VData.error || viewer_ && viewer_.isShown && !viewer_.hiding) {
      prevent_(event)
    } else {
      (VShown as ValidNodeTypes).classList.toggle("invert");
    }
  }
}

function loadCSS(src: string): void | Promise<void> {
  if ($('link[href="' + src + '"]')) {
    return;
  }
  const obj = document.createElement("link");
  obj.rel = "stylesheet";
  obj.href = src;
  return new Promise((resolve): void => {
    obj.onload = (): void => { obj.onload = null as never; resolve() }
    const link = $('link[href$="show.css"]')
    OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
        ? (document.head as HTMLHeadElement).insertBefore(obj, link) : link.before!(obj)
  })
}

function defaultOnError(err: any): void {
  err && console.log("%o", err);
}

function loadViewer(): Promise<ViewerModule> {
  if (ViewerModule) {
    return Promise.resolve(ViewerModule)
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  !Build.NDEBUG && (window as any).define && (window as any).define.noConflict()
  return Promise.all([import2_("../lib/viewer.js"), loadCSS("../lib/viewer.css")])
      .then(([viewerJS]: any): ViewerModule => {
    viewerJS = viewerJS && typeof viewerJS === "function" ? viewerJS
        : (window as unknown as { Viewer: typeof viewerJS }).Viewer
    viewerJS.setDefaults({ // eslint-disable-line @typescript-eslint/no-unsafe-call
      navbar: false,
      shown (this: void) {
        bgLink.style.display = "none";
      },
      viewed (): void { if (tempEmit) { tempEmit(true); } },
      zoom (event: CustomEvent) {
        if (!duringToggle) { return }
        const { ratio } = event.detail as { ratio: number, oldRatio: number }
        const imageData = viewer_!.imageData, { width, height, naturalWidth, naturalHeight } = imageData
        const newWidth = naturalWidth * ratio, newHeight = naturalHeight * ratio;
        const offsetWidth = newWidth - width, offsetHeight = newHeight - height;
        // will run ` imageData.x -= offsetWidth / 2, imageData.y -= offsetHeight / 2 `
        if (ratio === 1) {
          imageData.oldXY = [imageData.x, imageData.y]
          imageData.x = ((innerWidth - newWidth) / 2) | 0, imageData.y = ((innerHeight as number - newHeight) / 2) | 0
        } else {
          if (!imageData.oldXY) { return }
          imageData.x = imageData.oldXY![0], imageData.y = imageData.oldXY![1]
        }
        imageData.x += offsetWidth / 2, imageData.y += offsetHeight / 2
      },
      hide (this: void) {
        bgLink.style.display = "";
        if (tempEmit) { tempEmit(false); }
      }
    });
    const prototype = viewerJS.prototype as ViewerType, oldInit = prototype.initImage, oldToggle = prototype.toggle
    prototype.initImage = function (done): void {
      const args = [].slice.call(arguments);
      (args[0] as typeof done) = function (this: unknown): void {
        const imageData = viewer_ && viewer_.imageData
        if (imageData) {
          const nw = imageData.naturalWidth, nh = imageData.naturalHeight
          const doc = document, fulled = !!(OnFirefox ? doc.mozFullScreenElement
              : !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement)
              ? doc.fullscreenElement : doc.webkitFullscreenElement)
          const dw = fulled ? window.screen.availWidth : nw, dh = fulled ? window.screen.availHeight : nh
          if (fulled ? nw >= dw && nh >= dh : !zoomToFit && imageData.ratio < 1) {
            const ratio = fulled ? Math.max(dw / nw, dh / nh) : 1
            imageData.left = imageData.x = fulled ? ((dw - nw * ratio) / 2) | 0 : 0
            imageData.top = imageData.y = fulled ? ((dh - nh * ratio) / 2) | 0 : 0
            imageData.width = Math.round(nw * ratio), imageData.height = Math.round(nh * ratio)
            imageData.ratio = ratio
          }
        }
        done.apply(this, arguments)
      }
      oldInit.apply(this, args as unknown as IArguments)
    }
    prototype.toggle = function (event): ViewerType {
      duringToggle = !event && !!viewer_ && (this.imageData.ratio !== 1 || this.imageData.oldRatio !== 1)
      const ret = oldToggle.apply(this, arguments)
      duringToggle = false
      return ret
    }
    ViewerModule = viewerJS
    return viewerJS
  });
}

function showSlide(viewerModule: ViewerModule): Promise<ViewerType> | ViewerType {
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

async function parseClearImageUrl_(originUrl: string, stdUrl?: string): Promise<string | null> {
  function safeParseURL(url1: string): URL | null { try { return new URL(url1); } catch {} return null; }
  const parsed = safeParseURL(originUrl);
  if (!parsed || !(<RegExpI> /^(ht|s?f)tp/i).test(parsed.protocol)) { return null; }
  let {origin, pathname: path} = parsed
  let search = parsed.search;
  function DecodeURLPart_(this: void, url1: string | undefined): string {
    try {
      url1 = decodeURIComponent(url1 || "");
    } catch {}
    return url1 as string;
  }
  if (OnChrome && Build.MinCVer < BrowserVer.MinNew$URL$NotDecodePathname
      && CurCVer_ < BrowserVer.MinNew$URL$NotDecodePathname && originUrl.split(/[?#]/)[0].includes("%")) {
    path = originUrl.split(/[?#]/, 1)[0].slice(origin.length)
  }
  stdUrl = stdUrl || originUrl
  if (search.length > 10) {
    for (const item of search.slice(1).split("&")) {
      const key = item.split("=", 1)[0];
      let val0 = item.slice(key.length + 1), val = val0;
      if (val.length > 7) {
        if (!val.includes("://") && (<RegExpOne> /%(?:3[aA]|2[fF])/).test(val)) {
          val = DecodeURLPart_(val).trim();
        }
        if (val.includes("/") && !!safeParseURL(val)) {
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
      if ((<RegExpI> /^(x-)?(\w+)-?process\b/i).test(key) && val0.toLowerCase().includes("image/")
          && (<RegExpI> /resize|quality/i).test(val0)) {
        search = search.replace(key + "=" + val0, "")
        return origin + path + (search.length > 1 ? search : "")
      }
    }
  }
  let arr1: RegExpExecArray | null = null;
  if ((arr1 = (<RegExpOne> /[?&]s=\d{2,4}(&|$)/).exec(search)) && search.split("=").length <= 4) {
    return origin + path;
  }
  let secondFound = 0
  for (const i of ["/revision/latest/scale-"]) {
    if (path.includes(i)) {
      path = path.split(i)[0]
      secondFound = 1
    }
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
      if (path.lastIndexOf("@", offset + len) >= 0 && search.includes("!")) {
        const tail = search.slice(search.indexOf("!")).toLowerCase()
        if (tail.includes("cover") && (<RegExpI> /^![a-z\d_\.-]+\.(avif|jpe?g|a?png|svg|webp)$/).test(tail)) {
          search = search.split("!")[0]
        }
      }
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
    } else if (arr1 = (<RegExpOne> /\b((?:[1-9]\d{1,3}[whxyp][_\-x]?){1,2})\.[a-z]{2,4}$/).exec(search)) {
      offset += arr1.index;
      search = search.slice(arr1.index + arr1[1].length);
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
  return found !== 0 ? origin + path.slice(0, offset) + search : secondFound ? origin + path
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

const doesSetUrlDirectly = (url: string): boolean | Promise<boolean> => {
  const url_prefix = url.slice(0, 20).toLowerCase()
  if (url_prefix.startsWith("blob:") || (url_prefix.startsWith("data:") && url.length > 1e4)) {
    return false
  }
  if (!(<RegExpOne> /^(ht|s?f)tp|^data:/).test(url_prefix)
      || OnChrome && Build.MinCVer < BrowserVer.MinEnsured$fetch
          && !(window as any).fetch
      || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredFetchRequestCache
          // has known MinMaybe$fetch$And$Request == MinMaybe$fetch == 41
          && !((Build.MinCVer >= BrowserVer.MinEnsured$fetch || typeof Request === "function")
                && "cache" in Request.prototype)) {
    return true
  }
  if (VData.incognito) { return false }
  return post_(kPgReq.settingItem, { key: "showInIncognito" }).then((i): boolean => !i)
}

function fetchImage_(url: string, element: HTMLImageElement, setUrlDirectly: boolean): void {
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
  if (setUrlDirectly) {
    element.src = url; // lgtm [js/client-side-unvalidated-url-redirection] lgtm [js/xss] lgtm [js/xss-through-dom]
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
    }) : (fetch as ValidFetch)(url, is_blob || is_data ? {} : {
      cache: "no-store",
      referrer: "no-referrer"
    }).then(res => res.blob()))).then(blob => {
      blobCache[url] = blob
      return _shownBlobURL = URL.createObjectURL(_shownBlob = blob)
    }, () => url).then(newUrl => {
      element.src = newUrl; // lgtm [js/client-side-unvalidated-url-redirection] lgtm [js/xss] lgtm [js/xss-through-dom]
      text.parentNode ? body.replaceChild(element, text) : body.appendChild(element)
    });
  }
  const timer = setTimeout(() => {
    if (!element.parentNode || element.scrollHeight >= 24 || element.scrollWidth >= 80) { // some pixels drawn
      clearTimer();
    } else if (!text.parentNode) {
      OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
          ? body.insertBefore(text, element) : element.before!(text)
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
  void App()
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
      + (VData.file ? "download=" + encodeAsciiComponent_(VData.file) + "&" : "")
      + (VData.rawSrc ? "src=" + encodeAsciiComponent_(VData.rawSrc) + "&" : "")
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
  Object.assign(window as any, {
    showBgLink, clickLink, simulateClick: simulateClick_, imgOnKeydown, doImageAction, decodeURLPart_,
    importBody, defaultOnClick, clickShownNode, showText, copyThing, _copyStr, toggleInvert, import2: import2_, loadCSS,
    defaultOnError, loadViewer, showSlide, clean, parseClearImageUrl_, tryToFixFileExt_, fetchImage_,
    destroyObject_, tryDecryptUrl, disableAutoAndReload_, resetOnceProperties_, recoverHash_, encrypt_,
    getOmni_: getContentUrl_,
    VShown: () => ({
      VShown, bgLink, tempEmit, viewer_, encryptKey, ImageExtRe, _shownBlobURL,
    })
  })
}
