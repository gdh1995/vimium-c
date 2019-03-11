if (VSettings && document.readyState !== "complete"
    && VimiumInjector === undefined) {
(function (this: void): void {
/** Note(gdh1995):
 * According to source code of C72,
 *     getElementsByTagName has a special cache (per container node) for tag name queries,
 * and I think it's shared across V8 worlds.
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/container_node.cc?type=cs&q=getElementsByTagName&g=0&l=1578
 */
  const enum InnerConsts {
    MaxElementsInOneTick = 64,
    MaxUnsafeEventsInOneTick = 10,
  }
  let d: Document | Document["documentElement"] = document
    , script: HTMLScriptElement | Element = d.createElement("script") as HTMLScriptElement | Element
    , box: EventTarget | null | false = null
    , secret: number = (Math.random() * 1e6 + 1) | 0;
/**
 * Note:
 *   should not create HTML/SVG elements before document gets ready,
 *   otherwise the default XML parser will not enter a "xml_viewer_mode"
 * Stack trace:
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/xml/parser/xml_document_parser.cc?q=XMLDocumentParser::end&l=390
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/xml/parser/xml_document_parser.cc?q=XMLDocumentParser::DoEnd&l=1543
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/xml/parser/xml_document_parser.cc?g=0&q=HasNoStyleInformation&l=106
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/document.cc?g=0&q=Document::CreateRawElement&l=946
 * Vimium issue: https://github.com/philc/vimium/pull/1797#issuecomment-135761835
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
  interface ClickableEvent extends CustomEvent {
    detail: [number[], number[]];
  }
  function onclick(event: CustomEvent): void {
    event.stopImmediatePropagation();
    let detail = event.detail as ClickableEvent["detail"] | null;
    if (detail) {
      resolve(0, detail[0]); resolve(1, detail[1]);
    } else {
      VUtils.clickable_.add(event.target as Element);
    }
  }
  function resolve(isBox: BOOL, nodeIndexList: number[]): void {
    if (!nodeIndexList.length) { return; }
    let list = isBox ? (box as Element).getElementsByTagName("*") : document.getElementsByTagName("*");
    for (const index of nodeIndexList) {
      let el = list[index];
      el && VUtils.clickable_.add(el);
    }
  }
  function destroyServer() {
    const r = removeEventListener, settings = VSettings;
    /** this function should keep idempotent */
    if (box) {
      r.call(box, "VimiumOnclick", onclick, true);
      box.dispatchEvent(new CustomEvent("VimiumUnhook", {detail: secret}));
    }
    if (box === null) {
      setTimeout(function (): void { r("VimiumHook", installer, true); }, 1100);
    }
    box = false;
    settings && (settings.stop_ = null);
  }
  VSettings.stop_ = destroyServer;

  let injected: string = '"use strict";(' + (function VC(this: void): void {
type Call1<T, A, R> = (this: (this: T, a: A) => R, thisArg: T, a: A) => R;
type Call3o<T, A, B, C, R> = (this: (this: T, a: A, b: B, c?: C) => R, thisArg: T, a: A, b: B, c?: C) => R;
type FUNC = (this: unknown, ...args: unknown[]) => unknown;
interface CollectionEx extends HTMLCollectionOf<Element> { indexOf: Element[]["indexOf"]; }
const ETP = EventTarget.prototype, _listen = ETP.addEventListener, toRegister: Element[] = [],
_apply = _listen.apply, _call = _listen.call,
call = _call.bind(_call) as <T, R, A, B, C>(
        func: (this: T, a?: A, b?: B, c?: C) => R, self: T, a?: A, b?: B, c?: C) => R,
dispatch = (_call as Call1<EventTarget, Event, boolean>).bind(ETP.dispatchEvent),
doc = document, cs = doc.currentScript as HTMLScriptElement, Create = doc.createElement as Document["createElement"],
E = Element, EP = E.prototype, Append = EP.appendChild, Contains = EP.contains, Insert = EP.insertBefore,
Attr = EP.setAttribute, HasAttr = EP.hasAttribute, Remove = EP.remove,
contains = Contains.bind(doc),
nodeIndexListInDocument: number[] = [], nodeIndexListForDetached: number[] = [],
getElementsByTagNameInDoc = doc.getElementsByTagName, getElementsByTagNameInEP = EP.getElementsByTagName,
IndexOf = _call.bind(toRegister.indexOf) as never as (this: void, list: CollectionEx, item: Element) => number,
push = nodeIndexListInDocument.push,
pushInDocument = push.bind(nodeIndexListInDocument), pushForDetached = push.bind(nodeIndexListForDetached),
CE = CustomEvent, HA = HTMLAnchorElement, DF = DocumentFragment,
FP = Function.prototype, funcToString = FP.toString,
listen = (_call as Call3o<EventTarget, string, null | ((e: Event) => void), boolean, void>).bind(_listen) as (this: void
  , T: EventTarget, a: string, b: null | ((e: Event) => void), c?: boolean) => void,
rel = removeEventListener, ct = clearTimeout,
sec: number = +<string> cs.dataset.vimium,
hooks = {
  toString: function toString(this: FUNC): string {
    const a = this;
    return call(_apply as (this: (this: FUNC, ...args: Array<{}>) => string, self: FUNC, args: IArguments) => string,
                funcToString,
                a === hooks.addEventListener ? _listen : a === hooks.toString ? funcToString : a, arguments);
  },
  addEventListener: function addEventListener(this: EventTarget, type: string
      , listener: EventListenerOrEventListenerObject): void {
    const a = this;
    if (type === "click" && listener && !(a instanceof HA) && a instanceof E) {
      toRegister.push(a);
      timer || (timer = next());
    }
    const args = arguments, len = args.length;
    return len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2])
      : call(_apply as (this: (this: EventTarget, ...args: Array<{}>) => void
                        , self: EventTarget, args: IArguments) => void,
             _listen as (this: EventTarget, ...args: Array<{}>) => void, a, args);
  }
};

let handler = function (this: void): void {
  rel("DOMContentLoaded", handler, true);
  ct(timer);
  const docEl = docChildren[0] as HTMLElement | SVGElement | null;
  handler = docChildren = null as never;
  if (!docEl) { return destroyClient(); }
  const el = call(Create, document, "div") as HTMLDivElement, key = "data-vimium";
  call(Attr, el, key, "");
  listen(el, "VimiumUnhook", destroyClient, true);
  call(Append, docEl, el), dispatch(el, new CE("VimiumHook", {detail: sec})), call(Remove, el);
  if (call(HasAttr, el, key)) {
    destroyClient();
  } else {
    root = el;
    timer = toRegister.length > 0 ? next() : 0;
  }
},
docChildren = doc.children,
unsafeDispatchCounter = 0,
allNodesInDocument = null as CollectionEx | null, allNodesForDetached = null as CollectionEx | null,
next = setTimeout.bind(window as never, function (): void {
  const len = toRegister.length,
  start = len > InnerConsts.MaxElementsInOneTick ? len - InnerConsts.MaxElementsInOneTick : 0,
  delta = len - start;
  timer = start > 0 ? next() : 0;
  if (!len) { return; }
  unsafeDispatchCounter = 0;
  // skip some nodes if only crashing, so that there would be less crash logs in console
  const slice = toRegister.splice(start, delta);
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < slice.length; i++) {
    prepareRegister(slice[i]); // avoid for-of, in case Array::[[Symbol.iterator]] was modified
  }
  doRegister();
  allNodesInDocument = allNodesForDetached = null;
}, 1)
, root: HTMLDivElement, timer = setTimeout(handler, 1000)
, SR: typeof ShadowRoot = window.ShadowRoot as typeof ShadowRoot
;
function prepareRegister(this: void, element: Element): void {
  if (contains(element)) {
    pushInDocument(
      IndexOf(allNodesInDocument || (allNodesInDocument = call(getElementsByTagNameInDoc, doc, "*") as CollectionEx)
        , element));
    return;
  }
  if (element.ownerDocument !== doc) { // in case element is moved / adopted
    // Note: on C72, ownerDocument of elements under <template>.content
    // is a fake "about:blank" document object
    return;
  }
  let e1: Element | null = element, e2: Node | null, e3: Node | null;
  for (; e2 = e1.parentElement; e1 = e2 as Element) {
    if (e2 !== (e3 = e1.parentNode as Element)) {
      e2 = call(Contains, e2, e1) ? e2 as Element : call(Contains, e3, e1) ? e3 as Element : null;
      if (!e2) { return; }
    }
  }
  // note: the below changes DOM trees,
  // so `dispatch` MUST NEVER throw. Otherwises a page might break
  if ((e2 = e1.parentNode) == null) {
    call(Append, root, e1);
    pushForDetached(
      IndexOf(allNodesForDetached || (allNodesForDetached = call(getElementsByTagNameInEP, root, "*") as CollectionEx)
        , element));
  } else if (e2 instanceof DF && !(e2 instanceof SR || ((e3 = e1.nextSibling) && e3.parentElement))) {
    // NOTE: ignore nodes belonging to a shadowRoot,
    // in case of `<html> -> ... -> <div> -> #shadow-root -> ... -> <iframe>`,
    // because `<iframe>` will destroy if removed
    if (unsafeDispatchCounter < 10) {
      unsafeDispatchCounter++;
      doRegister();
      call(Append, root, e1);
      dispatch(element, new CE("VimiumOnclick"));
      call<Node, Node, Node, Node | null, 1>(Insert, e2, e1, e3);
    } else {
      toRegister.push(element);
      timer || (timer = next());
    }
  }
}
function doRegister(): void {
  if (nodeIndexListInDocument.length || nodeIndexListForDetached.length) {
    dispatch(root, new CE("VimiumOnclick", { detail: [nodeIndexListInDocument, nodeIndexListForDetached] }));
    nodeIndexListForDetached.length && (root.textContent = "");
    nodeIndexListInDocument.length = nodeIndexListForDetached.length = 0;
  }
}
function destroyClient(e?: Event): void {
  if (e && (e as CustomEvent).detail !== sec) { return; }
  toRegister.length = 0;
  toRegister.push = next = function () { return 1; };
  root = null as never;
  ct(timer);
}
toRegister.push = push as any, toRegister.splice = toRegister.splice;
!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0 ||
(!SR || SR instanceof E) && (SR = CE as never);
// only the below can affect outsides
cs.remove();
ETP.addEventListener = hooks.addEventListener;
FP.toString = hooks.toString;
_listen("DOMContentLoaded", handler, true);
  }).toString() + ")();"
    , appInfo = navigator.appVersion.match(<RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/)
    , appVer = appInfo && +appInfo[1] || 0
    ;
  Build.MinCVer <= BrowserVer.NoRAForRICOnSandboxedPage &&
    (VDom.allowRAF_ = appVer !== BrowserVer.NoRAForRICOnSandboxedPage);
  if (Build.MinCVer < BrowserVer.MinEnsureMethodFunction &&
      appVer >= BrowserVer.MinEnsureMethodFunction) {
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
  script.dataset.vimium = secret as number | string as string;
  script.textContent = injected;
  d = (d as Document).documentElement || d;
  d.insertBefore(script, d.firstChild);
  VDom.DocReady_(function () { box === null && setTimeout(function () { box || destroyServer(); }, 17); });
  if (!script.parentNode) { // It succeeded to hook.
    Build.MinCVer > BrowserVer.NoRAForRICOnSandboxedPage ||
    VDom.allowRAF_ || requestAnimationFrame(() => { VDom.allowRAF_ = true; });
    return;
  }
  // else: sandboxed or JS-disabled
  script.remove();
  const breakTotally = Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage
      && appVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage && appVer;
  console.info((breakTotally ? "Vimium C can" : "Some functions of Vimium C may")
      + " not work because %o is sandboxed.",
    location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"));
  if (breakTotally) {
    VSettings.destroy_(true);
    return;
  }
  VDom.allowScripts_ = false;
  interface TimerLib extends Window {
    setInterval: typeof setInterval;
    setTimeout: typeof setTimeout | (
      (this: void, handler: (this: void, i: TimerType.fake | undefined) => void, timeout: number) => number);
  }
  (window as TimerLib).setTimeout = (window as TimerLib).setInterval =
  function (func: (info: TimerType.fake | undefined) => void, timeout: number): number {
    let f = timeout > 10 ? window.requestIdleCallback : null, cb = () => func(TimerType.fake);
    // in case there's `$("#requestIdleCallback")`
    return (Build.MinCVer > BrowserVer.NoRAForRICOnSandboxedPage || VDom && VDom.allowRAF_)
      ? f && !(Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback && f instanceof Element)
        ? (f as Exclude<typeof f, null | Element>)(cb, { timeout }) : requestAnimationFrame(cb)
      : (Promise.resolve(1).then(cb), 1);
  };
})();
}
