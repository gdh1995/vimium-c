/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
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
  viewer?: null | ViewerType;
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

declare var browser: never;
if (typeof browser !== "undefined" && (browser && (browser as any).runtime) != null) {
  window.chrome = browser;
}
var _idRegex = <RegExpOne> /^#[0-9A-Z_a-z]+$/,
$ = function<T extends HTMLElement>(selector: string): T {
  if (_idRegex.test(selector)) {
    return document.getElementById(selector.substring(1)) as T;
  }
  return document.querySelector(selector) as T;
},
BG = window.chrome && chrome.extension && chrome.extension.getBackgroundPage() as Window;
if (!(BG && BG.Utils && BG.Utils.convertToUrl)) {
  BG = null as never;
}

let shownNode: ValidNodeTypes, bgLink = $<HTMLAnchorElement>('#bgLink'), url: string, type: ValidShowTypes, file: string;
let tempEmit: ((succeed: boolean) => void) | null = null;

window.onhashchange = function(this: void): void {
  let str: Urls.Url | null, ind: number;
  if (shownNode) {
    clean();
    bgLink.style.display = "none";
    shownNode.remove();
    shownNode = null as never;
  }
  type = file = "";

  url = location.hash;
  if (!location.hash && BG && BG.Settings && BG.Settings.temp.shownHash) {
    url = BG.Settings.temp.shownHash() || "";
    window.name = url;
  } else if (!url) {
    url = window.name;
  }
  if (url.length < 3) {}
  else if (url.startsWith("#!image")) {
    url = url.substring(8);
    type = "image";
  } else if (url.startsWith("#!url")) {
    url = url.substring(6);
    type = "url";
  }
  if (ind = url.indexOf("&") + 1) {
    if (url.startsWith("download=")) {
      file = decodeURLPart(url.substring(9, ind - 1));
      url = url.substring(ind);
    }
  }
  if (url.indexOf(":") <= 0 && url.indexOf("/") < 0) {
    url = decodeURLPart(url).trim();
  }
  if (!url) {
    type == "image" && (type = "");
  } else if (url.toLowerCase().startsWith("javascript:")) {
    type = url = file = "";
  } else if (BG) {
    str = BG.Utils.convertToUrl(url, null, Urls.WorkType.KeepAll);
    if (BG.Utils.lastUrlType <= Urls.Type.MaxOfInputIsPlainUrl) {
      url = str;
    }
  } else if (url.startsWith("//")) {
    url = "http:" + url;
  } else if ((<RegExpOne>/^([-.\dA-Za-z]+|\[[\dA-Fa-f:]+])(:\d{2,5})?\//).test(url)) {
    url = "http://" + url;
  }

  switch (type) {
  case "image":
    shownNode = (importBody as ImportBody)("shownImage");
    shownNode.classList.add("hidden");
    shownNode.onerror = function(): void {
      this.onerror = this.onload = null as never;
      (shownNode as HTMLImageElement).alt = "\xa0(fail to load)\xa0";
      if (BG && BG.Settings && BG.Settings.CONST.ChromeVersion >= BrowserVer.MinNoBorderForBrokenImage) {
        shownNode.classList.add("broken");
      }
      shownNode.classList.remove("hidden");
      setTimeout(showBgLink, 34);
      shownNode.onclick = function(e) {
        chrome.tabs && chrome.tabs.update ? chrome.tabs.update({ url })
        : clickLink({ target: "_top" }, e);
      };
    };
    if (url.indexOf(":") > 0 || url.lastIndexOf(".") > 0) {
      shownNode.src = url;
      shownNode.onclick = defaultOnClick;
      shownNode.onload = function(this: HTMLImageElement): void {
        this.onerror = this.onload = null as never;
        setTimeout(function() { // safe; because on C65, in some tests refreshing did not trigger replay
          (shownNode as HTMLImageElement).src = (shownNode as HTMLImageElement).src; // trigger replay for gif
        }, 0);
        showBgLink();
        shownNode.classList.remove("hidden");
        shownNode.classList.add("zoom-in");
        if (this.width >= window.innerWidth * 0.9) {
          (document.body as HTMLBodyElement).classList.add("filled");
        }
      };
    } else {
      url = "";
      (shownNode as any).onerror();
      (shownNode as HTMLImageElement).alt = "\xa0(null)\xa0";
    }
    if (file) {
      shownNode.setAttribute("download", file);
      shownNode.alt = file;
      shownNode.title = file;
    }
    break;
  case "url":
    shownNode = (importBody as ImportBody)("shownText");
    if (url && BG) {
      str = null;
      if (url.startsWith("vimium://")) {
        str = BG.Utils.evalVimiumUrl(url.substring(9), Urls.WorkType.ActIfNoSideEffects, true);
      }
      str = str !== null ? str : BG.Utils.convertToUrl(url, null, Urls.WorkType.ConvertKnown);
      if (typeof str === "string") {}
      else if (str instanceof BG.Promise) {
        str.then(function(arr) {
          showText(arr[1], arr[0] || (arr[2] || ""));
        });
        break;
      } else if (str instanceof BG.Array) {
        showText(str[1], str[0]);
        break;
      }
      url = str;
    }
    showText(type, url);
    break;
  default:
    url = "";
    shownNode = (importBody as ImportBody)("shownImage");
    shownNode.src = "../icons/vimium.png";
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
  bgLink.onclick = shownNode ? clickShownNode : defaultOnClick;

  str = $<HTMLTitleElement>('title').getAttribute('data-title') as string;
  str = BG ? BG.Utils.createSearch(file ? file.split(/\s+/) : [], str)
    : str.replace(<RegExpOne>/\$[sS](?:\{[^}]*})?/, file && (file + " | "));
  document.title = str;
};

if (!"".startsWith) {
String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.lastIndexOf(s, 0) === 0;
};
}
(window.onhashchange as () => void)();

document.addEventListener("keydown", function(this: void, event): void {
  if (type === "image" && imgOnKeydown(event)) {
    return;
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey
    || event.shiftKey || event.repeat) { return; }
  const str = String.fromCharCode(event.keyCode as VKeyCodes | KnownKey as KnownKey);
  if (str === 'S') {
    return clickLink({
      download: file
    }, event);
  } else if (str === "C") {
    return getSelection().toString() ? copyThing(event) : undefined;
  } else if (str === "A") {
    return toggleInvert(event);
  }
});

function showBgLink(this: void): void {
  const height = shownNode.scrollHeight, width = shownNode.scrollWidth;
  bgLink.style.height = height + "px";
  bgLink.style.width = width + "px";
  bgLink.style.display = "";
}

function clickLink(this: void, options: { [key: string]: string; }, event: MouseEvent | KeyboardEvent): void {
  event.preventDefault();
  if (!url) { return; }
  const a = document.createElement('a');
  Object.setPrototypeOf(options, null);
  for (const i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = url;
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
  if ((shownNode as HTMLImageElement).alt) { return false; }
  if (keyCode === VKeyCodes.space || keyCode === VKeyCodes.enter) {
    event.preventDefault();
    simulateClick(shownNode, event);
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
  if (window.viewer && window.viewer.viewed) {
    doImageAction(window.viewer, action);
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
    return clickLink({ download: file }, event);
  } else switch (type) {
  case "url": clickLink({ target: "_blank" }, event); break;
  case "image":
    if ((shownNode as HTMLImageElement).alt) { return; }
    loadViewer().then(showSlide).catch(defaultOnError);
    break;
  default: break;
  }
}

function clickShownNode(event: MouseEvent): void {
  event.preventDefault();
  if (shownNode.onclick) {
    shownNode.onclick(event);
  }
}

function showText(tip: string, body: string | string[]): void {
  $("#textTip").setAttribute("data-text", tip);
  const textBody = $("#textBody");
  if (body) {
    textBody.textContent = typeof body !== "string" ? body.join(" ") : body;
    shownNode.onclick = copyThing;
  } else {
    textBody.classList.add("null");
  }
  return showBgLink();
}

function copyThing(event: Event): void {
  event.preventDefault();
  let str = url;
  if (type == "url") {
    str = $("#textBody").textContent;
  }
  if (!(str && window.VPort)) { return; }
  VPort.post({
    handler: "copy",
    data: str
  });
  return VHUD.copied(str);
}

function toggleInvert(event: Event): void {
  if (type === "image") {
    if ((shownNode as HTMLImageElement).alt || window.viewer && window.viewer.visible) {
      event.preventDefault();
    } else {
      shownNode.classList.toggle("invert");
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
  const v = window.viewer = window.viewer || new Viewer(shownNode);
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
  if (type === "image") {
    (document.body as HTMLBodyElement).classList.remove("filled");
    if (window.viewer) {
      window.viewer.destroy();
      window.viewer = null;
    }
  }
}
