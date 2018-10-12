window.VimiumInjector === undefined &&
VSettings && document.readyState !== "complete" &&
(function(this: void): void {
  let d: Document | Document["documentElement"] = document
    , script = d.createElement("script") as HTMLScriptElement | Element
    , box: EventTarget | null | false = null
    , secret = "" + ((Math.random() * 1e6 + 1) | 0);
  /**
   * As said in https://github.com/philc/vimium/pull/1797#issuecomment-135761835
   * it's safe enough if only no `document.createElementNS` on scripts initing
   */
  if (!(script instanceof HTMLScriptElement)) { return; }

  function installer(event: CustomEvent): void {
    const t = event.target;
    if (!(t instanceof Element) || event.detail !== secret) { return; }
    event.stopImmediatePropagation();
    removeEventListener("VimiumHook", installer, true);
    if (box === null) {
      t.removeAttribute("data-vimium");
      t.addEventListener("VimiumOnclick", onclick, true);
      box = t;
    }
  }
  addEventListener("VimiumHook", installer, true);
  function onclick(event: Event): void {
    (event.target as Element).vimiumHasOnclick = true;
    event.stopPropagation();
  }
  addEventListener("VimiumOnclick", onclick, true);
  function destroy() {
    const r = removeEventListener;
    /** this function should keep idempotent */
    r("VimiumOnclick", onclick, true);
    if (box) {
      r.call(box, "VimiumOnclick", onclick, true);
      box.dispatchEvent(new CustomEvent("VimiumUnhook", {detail: secret}));
    }
    if (box === null) {
      setTimeout(function(): void { r("VimiumHook", installer, true); }, 1100);
    }
    box = false;
    VSettings && (VSettings.uninit_ = null);
  }
  VSettings.uninit_ = destroy;

  let injected: Function | string = '"use strict";(' + (function VC(this: void): void {
type Call1<T, A, R> = (this: (this: T, a: A) => R, thisArg: T, a: A) => R;
type Call3o<T, A, B, C, R> = (this: (this: T, a: A, b: B, c?: C) => R, thisArg: T, a: A, b: B, c?: C) => R;

const ETP = EventTarget.prototype, _listen = ETP.addEventListener, toRegister: Element[] = [],
_apply = _listen.apply, _call = _listen.call,
call = _call.bind(_call) as <T, R, A, B, C>(func: (this: T, a?: A, b?: B, c?: C) => R, self: T, a?: A, b?: B, c?: C) => R,
dispatch = (_call as Call1<EventTarget, Event, boolean>).bind(ETP.dispatchEvent),
d = document, cs = d.currentScript as HTMLScriptElement, Create = d.createElement as Document["createElement"],
E = Element, EP = E.prototype, Append = EP.appendChild, Contains = EP.contains, Insert = EP.insertBefore,
Attr = EP.setAttribute, HasAttr = EP.hasAttribute, Remove = EP.remove,
contains = Contains.bind(d),
CE = CustomEvent, HA = HTMLAnchorElement, DF = DocumentFragment, HF = HTMLFormElement,
FP = Function.prototype, funcToString = FP.toString,
listen = (_call as Call3o<EventTarget, string, null | ((e: Event) => void), boolean, void>).bind(_listen) as (this: void
  , T: EventTarget, a: string, b: null | ((e: Event) => void), c?: boolean) => void,
rel = removeEventListener, ct = clearTimeout,
sec = <string>cs.getAttribute("data-vimium"),
hooks = {
  toString: function toString(this: Function): string {
    const a = this;
    return call(_apply as (this: (this: Function, ...args: {}[]) => string, self: Function, args: IArguments) => string,
                funcToString,
                a === hooks.addEventListener ? _listen : a === hooks.toString ? funcToString : a, arguments);
  },
  addEventListener: function addEventListener(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject): void {
    const a = this;
    if (type === "click" && listener && !(a instanceof HA || a instanceof HF) && a instanceof E) {
      toRegister.push(a);
      if (timer === 0) { timer = next(); }
    }
    const args = arguments, len = args.length;
    return len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2])
      : call(_apply as (this: (this: EventTarget, ...args: {}[]) => void, self: EventTarget, args: IArguments) => void,
             _listen as (this: EventTarget, ...args: {}[]) => void, a, args);
  }
}
;

let handler = function(this: void): void {
  rel("DOMContentLoaded", handler, true);
  ct(timer);
  const d = document, docEl = docChildren[0] as HTMLElement | SVGElement | null;
  handler = docChildren = null as never;
  console.log('get docEl:', docEl);
  if (!docEl) { return destroy(); }
  const el = call(Create, d, "div") as HTMLDivElement, key = "data-vimium";
  call(Attr, el, key, "");
  listen(el, "VimiumUnhook", destroy as (e: CustomEvent) => void, true);
  call(Append, docEl, el), dispatch(el, new CE("VimiumHook", {detail: sec})), call(Remove, el);
  if (call(HasAttr, el, key)) {
    destroy();
  } else {
    box = el;
    timer = toRegister.length > 0 ? next() : 0;
  }
},
docChildren = d.children,
next = setTimeout.bind(null as never, function(): void {
  const len = toRegister.length, start = len > 9 ? len - 10 : 0, delta = len - start;
  timer = start > 0 ? next() : 0;
  if (len > 0) {
    // skip some nodes if only crashing, so that there would be less crash logs in console
    for (const i of toRegister.splice(start, delta)) { reg(i); }
  }
}, 1)
, box: HTMLDivElement, timer = setTimeout(handler, 1000)
, SR: typeof ShadowRoot = window.ShadowRoot as typeof ShadowRoot
;
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
  // note: the below changes DOM trees,
  // so `dispatch` MUST NEVER throw. Otherwises a page might break
  if ((e2 = e1.parentNode) == null) {
    call(Append, box, e1);
    dispatch(element, event);
    call(Remove, e1);
  } else if (e2 instanceof DF && !(e2 instanceof SR) && !(e1 instanceof HF)) {
    // NOTE: ignore nodes belonging to a shadowRoot,
    // in case of `<html> -> ... -> <div> -> #shadow-root -> ... -> <iframe>`,
    // because `<iframe>` will destroy if removed
    const after = e1.nextSibling;
    call(Append, box, e1);
    dispatch(element, event);
    call<Node, Node, Node, Node | null, 1>(Insert, e2, e1, after);
  }
}
function destroy(e?: CustomEvent): void {
  if (e && e.detail !== sec) { return; }
  toRegister.length = 0;
  toRegister.push = next = function() { return 1; };
  box = null as never;
  ct(timer);
}
toRegister.push = toRegister.push, toRegister.splice = toRegister.splice;
(!SR || SR instanceof E) && (SR = CE as never);
// only the below can affect outsides
cs.remove();
ETP.addEventListener = hooks.addEventListener;
FP.toString = hooks.toString;
_listen("DOMContentLoaded", handler, true);
  }).toString() + ')();'
    , appInfo = navigator.appVersion.match(<RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/)
    , appVer = appInfo && +appInfo[1] || 0
    , safeRAF = VDom.allowRAF_ = appVer !== BrowserVer.NoRAForRICOnSandboxedPage
    ;
  // the block below is also correct on Edge
  if (appVer >= BrowserVer.MinEnsureMethodFunction && appVer) {
    injected = injected.replace(<RegExpG> /: ?function \w+/g, "");
  }
  /**
   * According to `V8CodeCache::ProduceCache` and `V8CodeCache::GetCompileOptions`
   *     in third_party/blink/renderer/bindings/core/v8/v8_code_cache.cc,
   *   and ScriptController::ExecuteScriptAndReturnValue
   *     in third_party/blink/renderer/bindings/core/v8/script_controller.cc,
   * inlined script are not cached for `v8::ScriptCompiler::kNoCacheBecauseInlineScript`.
   * But here it still uses the same script, just for my personal preference.
   */
  script.type = "text/javascript";
  script.setAttribute("data-vimium", secret);
  script.textContent = injected;
  d = (d as Document).documentElement || d;
  d.insertBefore(script, d.firstChild);
  VDom.DocReady(function() { box === null && setTimeout(function() { box || destroy(); }, 17); });
  if (!script.parentNode) { // It succeeded to hook.
    safeRAF || requestAnimationFrame(() => { VDom.allowRAF_ = true; });
    return;
  }
  // else: sandboxed or JS-disabled
  script.remove();
  const breakTotally = appVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage && appVer;
  console.info((breakTotally ? "Vimium C can" : "Some functions of Vimium C may")
      + " not work because %o is sandboxed.",
    location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"));
  if (breakTotally) {
    VSettings.destroy_(true);
    return;
  }
  VDom.Scripts = false;
  interface TimerLib extends Window { setInterval: typeof setInterval; setTimeout: typeof setTimeout; }
  (window as TimerLib).setTimeout = (window as TimerLib).setInterval =
  function (func: (info: TimerType.fake | undefined) => void, timeout: number): number {
    let f = timeout > 10 ? window.requestIdleCallback : null, cb = () => func(TimerType.fake);
    // in case there's `$("#requestIdleCallback")`
    return VDom.allowRAF_ ? f && !(f instanceof Element) ? f(cb, { timeout }) : requestAnimationFrame(cb) : (Promise.resolve(1).then(cb), 1);
  };
})();
