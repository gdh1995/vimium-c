/// <reference path="../content/base.d.ts" />
(function(this: void): void {
  if (!window.VSettings) { return; }
  type Listener = (this: void, e: Event) => void;
  let d: Document | Document["documentElement"] = document
    , script = d.createElement("script") as HTMLScriptElement | Element
    , installer: Listener | null, onclick: Listener | null, box: EventTarget;
  if (!(script instanceof HTMLScriptElement)) { return; }
  addEventListener("VimiumReg", installer = function(event) {
    removeEventListener("VimiumReg", installer, true);
    box = event.target;
    box.addEventListener("VimiumOnclick", onclick, true);
    installer = null;
  }, true);
  addEventListener("VimiumOnclick", onclick = function(event) {
    (event.target as Element).vimiumHasOnclick = true;
    event.stopPropagation();
  }, true);
  function destroy() {
    removeEventListener("VimiumReg", installer, true);
    removeEventListener("VimiumOnclick", onclick, true);
    box && box.removeEventListener("VimiumOnclick", onclick, true);
    box = null as never;
    VSettings && (VSettings.onDestroy = null);
  }
  window.VSettings.onDestroy = destroy;
  script.type = "text/javascript";
  script.textContent = '"use strict";(' + func.toString() + ')();';
  d = (d as Document).documentElement || d;
  d.insertBefore(script, d.firstChild);
  script.remove();
  VDom.documentReady(function() { box || destroy(); });

function func(this: void): void {
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
newToString = function toString(this: Function): string {
  return toStringApply(this === addEventListener ? _listen : this === newToString ? funcToString : this, arguments as any);
},
apply = _listen.apply.bind(_listen) as (self: EventTarget, args: any) => void,
call = _listen.call.bind(_listen) as (self: EventTarget, ty: string, func?: null | ((e: Event) => void), opts?: boolean) => void
;

let handler = function(this: void): void {
  rel("DOMContentLoaded", handler, true);
  ct(loadTimeout);
  const docEl = document.documentElement as HTMLElement | SVGElement;
  if (!docEl) { return; }
  box = createElement("div");
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
// Note: these arg names are correct only since BrowserVer.Min$addEventListener$$length$Is2
function addEventListener(this: EventTarget, type: string
    , listener: EventListenerOrEventListenerObject) {
  if (type === "click" && listener && !(this instanceof HA || this instanceof HF) && this instanceof E) {
    register(this as Element);
    if (timer === 0) { timer = next(); }
  }
  const len = arguments.length;
  return len === 2 ? call(this, type, listener) : len === 3 ? call(this, type, listener, arguments[2])
    : apply(this, arguments as any);
}
EventTarget.prototype.addEventListener = addEventListener;
Function.prototype.toString = newToString;
_listen("DOMContentLoaded", handler, true);
addEventListener.prototype = newToString.prototype = void 0;
}
})();
