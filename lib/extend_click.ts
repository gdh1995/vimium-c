/// <reference path="../content/base.d.ts" />
(function(this: void, func: (this: void) => void): void {
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
  window.VSettings && (window.VSettings.onDestroy = function() {
    removeEventListener("VimiumReg", installer, true);
    removeEventListener("VimiumOnclick", onclick, true);
    box && box.removeEventListener("VimiumOnclick", onclick, true);
  });
  script.type = "text/javascript";
  script.textContent = '"use strict";(' + func.toString() + ')();';
  d = (d as Document).documentElement || d;
  d.insertBefore(script, d.firstChild).remove();

})(function(this: void): void {
const _listen = EventTarget.prototype.addEventListener, toRegister: Element[] = [],
splice = toRegister.splice.bind<Element[], number, number, Element[]>(toRegister),
register = toRegister.push.bind<Element[], Element, number>(toRegister);

let handler = function(this: void): void {
  removeEventListener("DOMContentLoaded", handler, true);
  clearTimeout(loadTimeout);
  box = document.createElement("div");
  (document.documentElement as HTMLElement | SVGElement).appendChild(box);
  box.dispatchEvent(new CustomEvent("VimiumReg"));
  box.remove();
  handler = null as never;
  timer = toRegister.length > 0 ? next() : 0;
},
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
  const event = new CustomEvent("VimiumOnclick");
  if (document.contains(element)) {
    element.dispatchEvent(event);
    return;
  }
  let e1, e2;
  for (e1 = element; (e2 = e1.parentElement) != null; e1 = e2) {}
  if (e1.parentNode != null) { return; }
  // NOTE: ignore nodes belonging to a shadowRoot
  box.appendChild(e1);
  element.dispatchEvent(event);
  e1.remove();
}
EventTarget.prototype.addEventListener = function(this: EventTarget, type: string
    , listener: EventListenerOrEventListenerObject, useCapture?: boolean) {
  if (type === "click" && this instanceof Element) {
    register(this as Element);
    if (timer === 0) { timer = next(); }
  }
  return _listen.call(this, type, listener, useCapture);
};
_listen("DOMContentLoaded", handler, true);
});
