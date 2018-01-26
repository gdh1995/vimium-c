/// <reference path="../content/base.d.ts" />
(function(this: void): void {
  if (!window.VSettings) { return; }
  type Listener = (this: void, e: Event) => void;
  let d: Document | Document["documentElement"] = document
    , script = d.createElement("script") as HTMLScriptElement | Element
    , installer: Listener | null, box: EventTarget
    , secret = "" + ((Math.random() * 1e6 + 1) | 0);
  if (!(script instanceof HTMLScriptElement)) { return; }
  addEventListener("VimiumReg", installer = function(event) {
    const t = event.target;
    if (!(t instanceof Element) || t.getAttribute("data-secret") !== secret) { return; }
    removeEventListener("VimiumReg", installer, true);
    t.removeAttribute("data-secret");
    t.addEventListener("VimiumOnclick", onclick, true);
    box = t;
    installer = null;
  }, true);
  function onclick(event: Event): void {
    (event.target as Element).vimiumHasOnclick = true;
    event.stopPropagation();
  }
  addEventListener("VimiumOnclick", onclick, true);
  function destroy() {
    removeEventListener("VimiumReg", installer, true);
    removeEventListener("VimiumOnclick", onclick, true);
    if (box) {
      box.removeEventListener("VimiumOnclick", onclick, true);
      box.dispatchEvent(new CustomEvent("VimiumDestroy", {detail: secret}));
      box = null as never;
    }
    VSettings && (VSettings.onDestroy = null);
  }
  window.VSettings.onDestroy = destroy;
  script.type = "text/javascript";
  let str = func.toString(), appVer = navigator.appVersion.match(<RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/);
  if (!appVer || +appVer[1] >= BrowserVer.MinEnsureMethodFunction) {
    str = str.replace(<any>(typeof NDEBUG === "undefined" ? /: ?function(?: \w+)?/g : /:function/g), "");
  }
  script.textContent = '"use strict";(' + str + ')(' + secret + ');';
  d = (d as Document).documentElement || d;
  d.insertBefore(script, d.firstChild);
  script.remove();
  VDom.documentReady(function() { box || destroy(); });

function func(this: void, sec: number): void {
const _listen = EventTarget.prototype.addEventListener, toRegister: Element[] = [],
_dispatch = EventTarget.prototype.dispatchEvent, dispatch = _dispatch.call.bind(_dispatch),
_append = document.appendChild, append = _append.call.bind(_append) as (parent: Node, node: Node) => Node,
_removeNode = document.removeChild, removeNode = _removeNode.call.bind(_removeNode),
contains = document.contains.bind(document),
splice = toRegister.splice.bind<Element[], number, number, Element[]>(toRegister),
register = toRegister.push.bind<Element[], Element, number>(toRegister),
CE = CustomEvent, HA = HTMLAnchorElement,
HF = HTMLFormElement, E = typeof Element === "function" ? Element : HTMLElement,
funcToString = Function.prototype.toString, toStringApply = funcToString.apply.bind(funcToString),
apply = _listen.apply.bind(_listen) as (self: EventTarget, args: any) => void,
call = _listen.call.bind(_listen) as (self: EventTarget, ty: string, func?: null | ((e: Event) => void), opts?: boolean) => void,
hooks = {
  toString(this: Function): string {
    const a = this;
    return toStringApply(a === addEventListener ? _listen : a === toString ? funcToString : a, arguments as any);
  },
  addEventListener(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject) {
    const a = this;
    if (type === "click" && listener && !(a instanceof HA || a instanceof HF) && a instanceof E) {
      register(a as Element);
      if (timer === 0) { timer = next(); }
    }
    const len = arguments.length;
    return len === 2 ? call(a, type, listener) : len === 3 ? call(a, type, listener, arguments[2]) : apply(a, arguments as any);
  }
},
{ toString, addEventListener } = hooks
;

let handler = function(this: void): void {
  rel("DOMContentLoaded", handler, true);
  ct(loadTimeout);
  const docEl = document.documentElement as HTMLElement | SVGElement;
  if (!docEl) { return; }
  box = createElement("div");
  box.setAttribute("data-secret", "" + sec);
  call(box, "VimiumDestroy", function(e: CustomEvent): void {
    if (e.detail === "" + sec) {
      EventTarget.prototype.addEventListener === addEventListener && (EventTarget.prototype.addEventListener = _listen);
      Function.prototype.toString === toString && (Function.prototype.toString = toString);
      box = null as never;
    }
  });
  append(docEl, box);
  dispatch(box, new CE("VimiumReg"));
  removeNode(docEl, box);
  handler = rel = ct = createElement = null as never;
  timer = toRegister.length > 0 ? next() : 0;
},
rel = removeEventListener, ct = clearTimeout,
createElement = document.createElement.bind(document) as Document["createElement"],
box: HTMLDivElement, loadTimeout = setTimeout(handler, 1000),
timer = -1, next = setTimeout.bind(null as never, iter, 1);
function iter(): void {
  const len = toRegister.length, delta = len > 9 ? 10 : len;
  if (len > 0) {
    for (let i of splice(len - delta, delta)) { reg(i); }
  }
  timer = toRegister.length > 0 ? next() : 0;
}
function reg(this: void, element: Element): void {
  const event = new CE("VimiumOnclick");
  if (contains(element)) {
    dispatch(element, event);
    return;
  }
  let e1, e2;
  for (e1 = element; (e2 = e1.parentElement) != null; e1 = e2) {
    if (e2 instanceof HF) { return; }
  }
  if (e1.parentNode != null) { return; }
  // NOTE: ignore nodes belonging to a shadowRoot
  append(box, e1);
  dispatch(element, event);
  removeNode(box, e1);
}
EventTarget.prototype.addEventListener = addEventListener;
Function.prototype.toString = toString;
_listen("DOMContentLoaded", handler, true);
}
})();
