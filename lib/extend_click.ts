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
    event.stopImmediatePropagation();
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
_apply = _listen.apply, _call = _listen.call,
call = _call.bind(_call) as <T, R, A, B, C>(func: (this: T, a?: A, b?: B, c?: C) => R, self: T, a?: A, b?: B, c?: C) => R,
_dispatch = EventTarget.prototype.dispatchEvent, dispatch = _call.bind(_dispatch),
_append = document.appendChild, append = _call.bind(_append) as (parent: Node, node: Node) => Node,
Contains = document.contains, contains = Contains.bind(document),
Insert = document.insertBefore,
splice = toRegister.splice.bind<Element[], number, number, Element[]>(toRegister),
CE = CustomEvent, HA = HTMLAnchorElement, DF = DocumentFragment, SR = ShadowRoot,
HF = HTMLFormElement, E = typeof Element === "function" ? Element : HTMLElement,
funcToString = Function.prototype.toString, toStringApply = _apply.bind(funcToString),
listenA = _apply.bind(_listen) as (self: EventTarget, args: any) => void,
listen = _call.bind(_listen) as (self: EventTarget, ty: string, func?: null | ((e: Event) => void), opts?: boolean) => void,
Stop = KeyboardEvent.prototype.stopImmediatePropagation,
Attr = E.prototype.setAttribute, _remove = E.prototype.remove, remove = _call.bind(_remove),
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
    return len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, arguments[2]) : listenA(a, arguments as any);
  }
},
{ toString, addEventListener } = hooks
;

let handler = function(this: void): void {
  rel("DOMContentLoaded", handler, true);
  ct(timer);
  const docEl = document.documentElement as HTMLElement | SVGElement;
  if (!docEl) { return destroy(); }
  box = call(Create, document, "div") as HTMLDivElement;
  append(docEl, box);
  listen(box, "VimiumDestroy", destroy as (e: CustomEvent) => void, true);
  call(Attr, box, "data-secret", "" + sec);
  dispatch(box, new CE("VimiumReg"));
  remove(box);
  handler = ct = Create = null as never;
  timer = toRegister.length > 0 ? next() : 0;
},
register = toRegister.push.bind<Element[], Element, number>(toRegister),
rel = removeEventListener, ct = clearTimeout,
Create = document.createElement as Document["createElement"],
box: HTMLDivElement, timer = setTimeout(handler, 1000),
next = setTimeout.bind(null as never, iter, 1);
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
  let e1: Element | null = element, e2: Node | null;
  for (; e2 = e1.parentElement; e1 = e2 as Element) {
    if (e2 instanceof HF && (e1 = e2.parentElement) && !call(Contains, e1, e2)) {
      e1 = e2.parentNode as Element | null;
      if (!e1 || !call(Contains, e1, e2)) { return; }
      e2 = e1;
    }
  }
  if ((e2 = e1.parentNode) == null) {
    append(box, e1);
    dispatch(element, event);
    remove(e1);
  } else if (!(e2 instanceof SR) && e2 instanceof DF && !(e1 instanceof HF)) {
    // NOTE: ignore nodes belonging to a shadowRoot,
    // in case of `<html> -> ... -> <div> -> #shadow-root -> ... -> <iframe>`,
    // because `<iframe>` will destroy if removed
    const after = e1.nextSibling;
    append(box, e1);
    dispatch(element, event);
    call<Node, Node, Node, Node | null, 1>(Insert, e2, e1, after);
  }
}
function destroy(e?: CustomEvent): void {
  if (e && e.detail !== "" + sec) { return; }
  e && call(Stop, e);
  EventTarget.prototype.addEventListener === addEventListener && (EventTarget.prototype.addEventListener = _listen);
  Function.prototype.toString === toString && (Function.prototype.toString = toString);
  next = register = function() { return 1; };
  toRegister.length = 0;
  timer = 1;
  let a = box;
  box = null as never;
  a && call(rel as any, a, "VimiumDestroy", destroy, true);
}
EventTarget.prototype.addEventListener = addEventListener;
Function.prototype.toString = toString;
_listen("DOMContentLoaded", handler, true);
}
})();
