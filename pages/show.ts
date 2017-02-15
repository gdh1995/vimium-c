/// <reference path="../types/base/index.d.ts" />
/// <reference path="../types/lib/index.d.ts" />
/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
interface ImportBody {
  (id: "shownImage"): HTMLImageElement
  (id: "shownText"): HTMLDivElement
}
interface Window {
  viewer: null | {
    destroy(): any;
    show(): any;
  };
}

var $ = document.getElementById.bind(document) as (id: string) => HTMLElement;
let shownNode: HTMLImageElement | HTMLDivElement, bgLink = $('bgLink') as HTMLAnchorElement,
    url: string, type: string, file: string;

var BG = window.chrome && chrome.extension && chrome.extension.getBackgroundPage() as Window;
if (!(BG && BG.Utils && BG.Utils.convertToUrl)) {
  BG = null as never;
}

window.onhashchange = function(this: void): void {
  let str: Urls.Url, ind: number;
  if (shownNode) {
    clean();
    bgLink.style.display = "none";
    shownNode.remove();
    shownNode = null as never;
  }
  type = file = "";

  url = location.hash || window.name;
  if (!url && BG && BG.Settings && BG.Settings.temp.shownHash) {
    url = BG.Settings.temp.shownHash() || "";
    window.name = url;
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
    shownNode.onerror = function(this: void): void {
      (shownNode as HTMLImageElement).alt = "\xa0fail to load\xa0";
      shownNode.classList.remove("hidden");
      setTimeout(showBgLink, 34);
      shownNode.onclick = chrome.tabs && chrome.tabs.update ? function() {
        chrome.tabs.update({url: url});
      } : clickLink.bind(null, { target: "_top" });
    };
    if (url.indexOf(":") > 0 || url.lastIndexOf(".") > 0) {
      shownNode.src = url;
      shownNode.onclick = defaultOnClick;
      shownNode.onload = function(this: HTMLImageElement): void {
        showBgLink();
        shownNode.classList.remove("hidden");
        shownNode.classList.add("zoom-in");
        if (this.width >= window.innerWidth * 0.9) {
          (document.body as HTMLBodyElement).classList.add("close");
        }
      };
    } else {
      url = "";
      (shownNode.onerror as () => void)();
      shownNode.setAttribute("alt", "\xa0(null)\xa0");
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
      str = BG.Utils.convertToUrl(url, null, Urls.WorkType.ActIfNoSideEffects);
      if (BG.Utils.lastUrlType !== 5) {}
      else if (str instanceof BG.Promise) {
        str.then(function(arr) {
          showText(arr[1], arr[0] || (arr[2] || ""));
        });
        break;
      } else if (str instanceof BG.Array) {
        showText(str[1], str[0]);
        break;
      }
      url = str as string;
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

  str = (document.querySelector('title') as HTMLTitleElement).getAttribute('data-title') as string;
  str = BG ? BG.Utils.createSearch(file ? file.split(/\s+/) : [], str)
    : str.replace(<RegExpOne>/\$[sS](?:\{[^}]*})?/, file && (file + " | "));
  document.title = str;
};

if (!String.prototype.startsWith) {
String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.lastIndexOf(s, 0) === 0;
};
}
(window.onhashchange as () => void)();

document.addEventListener("keydown", function(this: void, event): void {
  if (!(event.ctrlKey || event.metaKey) || event.altKey
    || event.shiftKey || event.repeat) { return; }
  const str = String.fromCharCode(event.keyCode);
  if (str === 'S') {
    return clickLink({
      download: file
    }, event);
  } else if (str === "C") {
    return window.getSelection().toString() ? copyThing(event) : undefined;
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
  for (let i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = url;
  if (window.VDom) {
    window.VDom.mouse(a, "click", event);
  } else {
    a.click();
  }
}

function decodeURLPart(url: string): string {
  try {
    url = decodeURIComponent(url);
  } catch (e) {}
  return url;
}

function importBody(id: string): HTMLElement {
  const templates = $('bodyTemplate') as HTMLTemplateElement,
  node = document.importNode(templates.content.getElementById(id) as HTMLElement, true);
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
    loadViewer(toggleSlide).catch(defaultOnError);
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
  $("textTip").setAttribute("data-text", tip);
  const textBody = $("textBody");
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
    str = $("textBody").textContent;
  }
  if (!(str && window.VPort)) { return; }
  return window.VPort.send({
    handler: "copyToClipboard",
    data: str
  } as FgReq["copyToClipboard"], function() {
    return window.VHUD.showCopied(str);
  });
}

function toggleInvert(event: Event): void {
  if (type === "image") {
    if ((document.documentElement as HTMLHtmlElement).innerText) {
      event.preventDefault();
    } else {
      shownNode.classList.toggle("invert");
    }
  }
}

function loadJS(name: string, src: string): Promise<any> {
  if ((window as any)[name]) {
    return Promise.resolve((window as any)[name]);
  }
  return new Promise(function(resolve, reject) {
    const script = document.createElement("script");
    script.src = src;
    script.onerror = function() {
      reject("ImportError: " + name);
    };
    script.onload = function() {
      const obj = (window as any)[name];
      obj ? resolve(obj) : (this.onerror as () => void)();
    };
    (document.head as HTMLHeadElement).appendChild(script).remove();
  });
}

function loadCSS(src: string): void {
  if (document.querySelector('link[href="' + src + '"]')) {
    return;
  }
  const obj = document.createElement("link");
  obj.rel = "stylesheet";
  obj.href = src;
  (document.head as HTMLHeadElement).insertBefore(obj, document.querySelector('link[href$="show.css"]'));
}

function defaultOnError(err: any): void {
  err && console.log(err);
}

function loadViewer(func: (viewer: any) => void): Promise<void> {
  loadCSS("../lib/viewer.min.css");
  return loadJS("Viewer", "../lib/viewer.min.js").then<void>(function(Viewer): void {
    Viewer.setDefaults({
      navbar: false,
      ready: function(this: void) {
        const btns = (document.querySelector('.viewer-toolbar') as HTMLElement).children;
        for (let i = btns.length; 0 <= --i; ) {
          btns[i].vimiumHasOnclick = true;
        }
      },
      shown: function(this: void) {
        bgLink.style.display = "none";
      },
      hide: function(this: void) {
        bgLink.style.display = "";
      }
    });
    return func(Viewer);
  });
}

function toggleSlide(Viewer: any): void {
  const sel = window.getSelection();
  sel.type == "Range" && sel.collapseToStart();
  window.viewer = window.viewer || new Viewer(shownNode);
  (window.viewer as any).show();
}

function clean() {
  if (type === "image") {
    (document.body as HTMLBodyElement).classList.remove("close");
    if (window.viewer) {
      window.viewer.destroy();
      window.viewer = null;
    }
  }
}
