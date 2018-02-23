/// <reference path="../content/base.d.ts" />
(function(this: void): void {
  if (!window.VSettings) { return; }
  type Listener = (this: void, e: Event) => void;
  let d: Document | Document["documentElement"] = document
    , script = d.createElement("script") as HTMLScriptElement | Element
    , installer: Listener | null, box: EventTarget
    , secret = "" + ((Math.random() * 1e6 + 1) | 0);
  if (!(script instanceof HTMLScriptElement)) { return; }
  addEventListener("VimiumHook", installer = function(event) {
    const t = event.target;
    if (!(t instanceof Element) || t.getAttribute("data-secret") !== secret) { return; }
    event.stopImmediatePropagation();
    removeEventListener("VimiumHook", installer, true);
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
    removeEventListener("VimiumHook", installer, true);
    removeEventListener("VimiumOnclick", onclick, true);
    if (box) {
      box.removeEventListener("VimiumOnclick", onclick, true);
      box.dispatchEvent(new CustomEvent("VimiumUnhook", {detail: secret}));
      box = null as never;
    }
    VSettings && (VSettings.uninit = null);
  }
  VSettings.uninit = function(): void { VSettings.uninit = null; VDom.documentReady(destroy); };
  script.type = "text/javascript";
  let str = func.toString(), appVer = navigator.appVersion.match(<RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/);
  if (appVer && +appVer[1] >= BrowserVer.MinEnsureMethodFunction) {
    str = str.replace(<RegExpG> /: ?function \w+/g, "");
  }
  script.async = false;
  script.textContent = '"use strict";(' + str + ')(' + secret + ');';
  d = (d as Document).documentElement || d;
  d.insertBefore(script, d.firstChild);
  script.remove();
  VDom.documentReady(function() { box || destroy(); });
  if (script.hasAttribute("data-vimium-hook")) { return; } // It succeeded to hook.
  console.info("Some functions of Vimium++ may not work because %o is sandboxed.", window.location.pathname.replace(<RegExpOne> /^.*\/([^\/]+)\/?$/, "$1"));
  interface TimerLib extends Window { setInterval: typeof setInterval; setTimeout: typeof setTimeout; }
  (window as TimerLib).setTimeout = (window as TimerLib).setInterval =
  function (func: (info?: TimerType) => void, _timeout: number): number {
    requestAnimationFrame(() => func(TimerType.fake));
    return 1;
  };

function func(this: void, sec: number): void {
const _listen = EventTarget.prototype.addEventListener, toRegister: Element[] = [],
_apply = _listen.apply, _call = _listen.call,
call = _call.bind(_call) as <T, R, A, B, C>(func: (this: T, a?: A, b?: B, c?: C) => R, self: T, a?: A, b?: B, c?: C) => R,
dispatch = _call.bind(EventTarget.prototype.dispatchEvent),
append = _call.bind(document.appendChild) as (parent: Node, node: Node) => Node,
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
rel = removeEventListener, ct = clearTimeout,
hooks = {
  toString: function toString(this: Function): string {
    const a = this;
    return toStringApply(a === addEventListener ? _listen : a === toString ? funcToString : a, arguments as any);
  },
  addEventListener: function addEventListener(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject): any {
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
document.currentScript && call(Attr, document.currentScript, "data-vimium-hook", "");

let handler = function(this: void): void {
  rel("DOMContentLoaded", handler, true);
  ct(timer);
  const docEl = document.documentElement as HTMLElement | SVGElement;
  if (!docEl) { return destroy(); }
  box = call(Create, document, "div") as HTMLDivElement;
  append(docEl, box);
  listen(box, "VimiumUnhook", destroy as (e: CustomEvent) => void, true);
  call(Attr, box, "data-secret", "" + sec);
  dispatch(box, new CE("VimiumHook"));
  remove(box);
  handler = Create = null as never;
  timer = toRegister.length > 0 ? next() : 0;
},
register = toRegister.push.bind<Element[], Element, number>(toRegister),
Create = document.createElement as Document["createElement"],
box: HTMLDivElement, timer = setTimeout(handler, 1000),
next = setTimeout.bind(null as never, function(): void {
  const len = toRegister.length, start = len > 9 ? len - 10 : 0, delta = len - start;
  timer = start > 0 ? next() : 0;
  if (len > 0) {
    // skip some nodes if only crashing, so that there would be less crash logs in console
    for (let i of splice(start, delta)) { reg(i); }
  }
}, 1);
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
    regFragment(e2, e1, element, event);
  }
}
function regFragment(root: DocumentFragment, e1: Element, element: Element, event: CustomEvent) {
  try {
    const after = e1.nextSibling;
    append(box, e1);
    dispatch(element, event);
    call<Node, Node, Node, Node | null, 1>(Insert, root, e1, after);
  } catch (e) {}
}
function destroy(e?: CustomEvent): void {
  if (e && e.detail !== "" + sec) { return; }
  e && call(Stop, e);
  EventTarget.prototype.addEventListener === addEventListener && (EventTarget.prototype.addEventListener = _listen);
  Function.prototype.toString === toString && (Function.prototype.toString = toString);
  next = register = function() { return 1; };
  toRegister.length = 0;
  ct(timer);
  timer = 1;
  let a = box;
  box = null as never;
  a && call(rel as any, a, "VimiumUnhook", destroy, true);
}
// only the below can affect outsides
if (typeof E !== "function") {
  return destroy();
}
EventTarget.prototype.addEventListener = addEventListener;
Function.prototype.toString = toString;
_listen("DOMContentLoaded", handler, true);
}
})();
