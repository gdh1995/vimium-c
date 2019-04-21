if (VDom && VDom.docNotCompleteWhenVimiumIniting_ && VimiumInjector === undefined) {
(function (this: void): void {
/** Note(gdh1995):
 * According to source code of C72,
 *     getElementsByTagName has a special cache (per container node) for tag name queries,
 * and I think it's shared across V8 worlds.
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/container_node.cc?type=cs&q=getElementsByTagName&g=0&l=1578
 */
  const enum InnerConsts {
    MaxElementsInOneTickDebug = 512,
    MaxElementsInOneTickRelease = 256,
    MaxUnsafeEventsInOneTick = 12,
    DelayToWaitDomReady = 1000,
    DelayToFindAll = 600,
    DelayToStartIteration = 333,
    DelayForNext = 36,
    DelayForNextComplicatedCase = 1,
    kSecretAttr = "data-vimium",

    kVOnClick = "VimiumOnclick",
    kHook = "VimiumHook",
    kCmd = "Vimium",
  }
  type ClickableEventDetail = [ /** inDocument */ number[], /** forDetached */ number[] | null ];
  type CommandEventDetail = [ /** secret */ number, /* command */ kContentCmd ];
  interface VimiumCustomEventCls {
    prototype: CustomEvent;
    new <Type extends InnerConsts & string>(typeArg: Type, eventInitDict?: { detail?:
      Type extends InnerConsts.kVOnClick ? ClickableEventDetail
        : Type extends InnerConsts.kCmd ? CommandEventDetail
        : Type extends InnerConsts.kHook ? /** secret */ number
        : never;
    }): CustomEvent;
  }

  const kClick1 = InnerConsts.kVOnClick, kHook = InnerConsts.kHook
    , d = document, docEl = d.documentElement
    , script: HTMLScriptElement | Element = d.createElement("script") as HTMLScriptElement | Element
    , secret: number = (Math.random() * 1e6 + 1) | 0;
  let box: Element | null | false = null;
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

  function hook(event: CustomEvent): void {
    const t = event.target;
    if (event.detail !== secret || !(t instanceof Element)) { return; }
    // it's unhooking is delayed, so here may no VUtils
    event.stopImmediatePropagation();
    removeEventListener(kHook, hook, true);
    if (box === null) {
      t.removeAttribute(InnerConsts.kSecretAttr);
      t.addEventListener(kClick1, onClick, true);
      box = t;
    }
  }
  addEventListener(kHook, hook, true);
  function onClick(event: CustomEvent): void {
    VUtils.Stop_(event);
    let detail = event.detail as ClickableEventDetail | null;
    if (!Build.NDEBUG) {
      console.log(`Vimium C: extend click: resolve ${
          detail ? Build.BTypes & ~BrowserType.Firefox ? "[%o + %o]" : "[%o+%o]" : "<%o>%s"
        } in %o @t=%o`
        , detail ? detail[0].length
          : (Build.BTypes & ~BrowserType.Firefox ? (event.target as Element).tagName + ""
              : (event.target as Element).tagName as string).toLowerCase()
        , detail ? detail[1] ? detail[1].length : -0 : ""
        , location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
        , Date.now() % 3600000);
    }
    if (detail) {
      resolve(0, detail[0]); detail[1] && resolve(1, detail[1]);
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
    isBox && ((box as Element).textContent = "");
  }
  function dispatchCmd(cmd: ValidContentCmds) {
    (box as Exclude<typeof box, null | false | undefined>).dispatchEvent(new CustomEvent(InnerConsts.kCmd, {
      detail: <CommandEventDetail> [ secret, cmd ]
    }));
  }
  function execute(cmd: ValidContentCmds): void {
    if (cmd < kContentCmd._minNotDispatchDirectly) {
      box && dispatchCmd(cmd);
      return;
    }
    const r = removeEventListener, settings = VSettings;
    /** this function should keep idempotent */
    if (box) {
      r.call(box, kClick1, onClick, true);
      dispatchCmd(kContentCmd.Destroy);
    }
    if (box === null) {
      // in case of untrusted DOMReady events
      setTimeout(function (): void { r(kHook, hook, true); }, InnerConsts.DelayToWaitDomReady + 100);
    }
    box = false;
    settings && (settings.execute_ = null);
  }
  VSettings.execute_ = execute;

  const appInfo = Build.BTypes & BrowserType.Chrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        ? navigator.appVersion.match(<RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/) : 0 as 0
    , appVer: BrowserVer | 0 = Build.BTypes & BrowserType.Chrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        && appInfo && <BrowserVer> +appInfo[1] || 0;
  if (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage && Build.BTypes & BrowserType.Chrome) {
    VDom.allowRAF_ = appVer !== BrowserVer.NoRAFOrRICOnSandboxedPage ? 1 : 0;
  }
  let injected: string = '"use strict";(' + (function VC(this: void): void {
type FUNC = (this: unknown, ...args: never[]) => unknown;
const ETP = EventTarget.prototype, _listen = ETP.addEventListener,
toRegister: Element[] & { p (el: Element): void | 1; s: Element[]["splice"] } = [] as any,
_apply = _listen.apply, _call = _listen.call,
call = _call.bind(_call) as <T, A extends any[], R>(func: (this: T, ...args: A) => R, thisArg: T, ...args: A) => R,
dispatch = _call.bind<(evt: Event) => boolean, [EventTarget, Event], boolean>(ETP.dispatchEvent),
doc = document, cs = doc.currentScript as HTMLScriptElement, Create = doc.createElement as Document["createElement"],
E = Element, EP = E.prototype, Append = EP.appendChild, Contains = EP.contains, Insert = EP.insertBefore,
Attr = EP.setAttribute, HasAttr = EP.hasAttribute, Remove = EP.remove,
contains = Contains.bind(doc),
nodeIndexListInDocument: number[] = [], nodeIndexListForDetached: number[] = [],
getElementsByTagNameInDoc = doc.getElementsByTagName, getElementsByTagNameInEP = EP.getElementsByTagName,
IndexOf = _call.bind(toRegister.indexOf) as never as (list: HTMLCollectionOf<Element>, item: Element) => number,
push = nodeIndexListInDocument.push,
pushInDocument = push.bind(nodeIndexListInDocument), pushForDetached = push.bind(nodeIndexListForDetached),
CE = CustomEvent as VimiumCustomEventCls, HA = HTMLAnchorElement, DF = DocumentFragment,
FP = Function.prototype, funcToString = FP.toString,
listen = _call.bind<(this: EventTarget,
        type: string, listener: EventListenerOrEventListenerObject, useCapture?: EventListenerOptions) => any,
    [EventTarget, string, EventListenerOrEventListenerObject, EventListenerOptions?], any>(_listen),
rEL = removeEventListener, clearTimeout_ = clearTimeout,
sec: number = +<string> cs.dataset.vimium,
kVOnClick = InnerConsts.kVOnClick,
kOnDomRead = "DOMContentLoaded",
hooks = {
  toString: function toString(this: FUNC): string {
    let a = this;
    return call(_apply as (this: (this: FUNC, ...args: Array<{}>) => string, self: FUNC, args: IArguments) => string,
                funcToString,
                a === myAEL ? _listen : a === hooks.toString ? funcToString : a, arguments);
  },
  addEventListener: function addEventListener(this: EventTarget, type: string
      , listener: EventListenerOrEventListenerObject): void {
    let a = this, args = arguments, len = args.length;
    len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2])
      : call(_apply as (this: (this: EventTarget, ...args: Array<{}>) => void
                        , self: EventTarget, args: IArguments) => void,
             _listen as (this: EventTarget, ...args: Array<{}>) => void, a, args);
    if (type === "click" ? listener && !(a instanceof HA) && a instanceof E
        : Build.BTypes & ~BrowserType.Firefox && type === kVOnClick
          // note: window.history is mutable on C35, so only these can be used: top,window,location,document
          && a && !(a as Window).window && (a as Node).nodeType === /* Node.ELEMENT_NODE */ 1) {
      toRegister.p(a as Element);
      timer || (timer = setTimeout_(next, InnerConsts.DelayToStartIteration));
    }
    // returns void: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/events/event_target.idl
  }
}, myAEL = hooks.addEventListener;

let handler = function (this: void): void {
  rEL(kOnDomRead, handler, true);
  clearTimeout_(timer);
  const docEl2 = docChildren[0] as Element | null,
  el = call(Create, doc, "div") as HTMLDivElement,
  key = InnerConsts.kSecretAttr;
  handler = docChildren = null as never;
  if (!docEl2) { return executeCmd(); }
  call(Attr, el, key, "");
  listen(el, InnerConsts.kCmd, executeCmd, true);
  call(Append, docEl2, el), dispatch(el, new CE(InnerConsts.kHook, {detail: sec})), call(Remove, el);
  if (call(HasAttr, el, key)) {
    executeCmd();
  } else {
    root = el;
    timer = toRegister.length > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0;
  }
},
// here `setTimeout` is normal and won't use TimerType.fake
setTimeout_ = setTimeout as SafeSetTimeout,
delayFindAll = function (e?: Event): void {
  if (e && (e.target !== window
          || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !e.isTrusted : e.isTrusted === false))) { return; }
  rEL("load", delayFindAll, true);
  delayFindAll = null as never;
  setTimeout_(findAllOnClick, InnerConsts.DelayToFindAll);
},
docChildren = doc.children,
unsafeDispatchCounter = 0,
allNodesInDocument = null as HTMLCollectionOf<Element> | null,
allNodesForDetached = null as HTMLCollectionOf<Element> | null,
next = function (): void {
  const len = toRegister.length,
  start = len > (Build.NDEBUG ? InnerConsts.MaxElementsInOneTickRelease : InnerConsts.MaxElementsInOneTickDebug)
    ? len - (Build.NDEBUG ? InnerConsts.MaxElementsInOneTickRelease : InnerConsts.MaxElementsInOneTickDebug) : 0,
  delta = len - start;
  timer = start > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0;
  if (!len) { return; }
  unsafeDispatchCounter = 0;
  call(Remove, root);
  // skip some nodes if only crashing, so that there would be less crash logs in console
  const slice = toRegister.s(start, delta);
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < slice.length; i++) {
    prepareRegister(slice[i]); // avoid for-of, in case Array::[[Symbol.iterator]] was modified
  }
  doRegister();
  allNodesInDocument = allNodesForDetached = null;
}
, root: HTMLDivElement, timer = setTimeout_(handler, InnerConsts.DelayToWaitDomReady)
, SR: typeof ShadowRoot = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0
      ? ShadowRoot : window.ShadowRoot as typeof ShadowRoot
;
function prepareRegister(this: void, element: Element): void {
  if (contains(element)) {
    pushInDocument(
      IndexOf(allNodesInDocument || (allNodesInDocument = call(getElementsByTagNameInDoc, doc, "*"))
        , element));
    return;
  }
  const doc1 = element.ownerDocument;
  // in case element is <form> / <frameset> / adopted into another document, or aEL is from another frame
  if (doc1 !== doc) {
    // on Firefox, element.__proto__ is auto-updated when it's adopted
    // so here we don't want to check this a too rare case if Firefox is the only supported
    if (Build.BTypes & ~BrowserType.Firefox
        && doc1.nodeType === /* Node.DOCUMENT_NODE */ 9 && doc1.defaultView) {
      safeReRegister(element, doc1);
    } // `defaultView` is to check whether element is in a real frame's DOM tree
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
    root !== e1 && call(Append, root, e1);
    pushForDetached(
      IndexOf(allNodesForDetached || (allNodesForDetached = call(getElementsByTagNameInEP, root, "*"))
        , element));
  } else if (e2 instanceof DF && !(e2 instanceof SR || ((e3 = e1.nextSibling) && e3.parentElement))) {
    // NOTE: ignore nodes belonging to a shadowRoot,
    // in case of `<html> -> ... -> <div> -> #shadow-root -> ... -> <iframe>`,
    // because `<iframe>` will destroy if removed
    if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick - 2) {
      doRegister();
      call(Append, root, e1);
      unsafeDispatchCounter++;
      dispatch(element, new CE(kVOnClick));
      call(Insert, e2, e1, e3);
    } else {
      toRegister.p(element);
      if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick + 1) {
        unsafeDispatchCounter = InnerConsts.MaxUnsafeEventsInOneTick + 1; // a fake value to run it only once a tick
        clearTimeout_(timer);
        timer = setTimeout_(next, InnerConsts.DelayForNextComplicatedCase);
      }
    }
  }
}
function doRegister(onlyInDocument?: 1): void {
  if (nodeIndexListInDocument.length || nodeIndexListForDetached.length) {
    unsafeDispatchCounter++;
    dispatch(root, new CE(kVOnClick, {
      detail: [nodeIndexListInDocument, onlyInDocument ? null : nodeIndexListForDetached]
    }));
    nodeIndexListInDocument.length = nodeIndexListForDetached.length = 0;
  }
}
function safeReRegister(element: Element, doc1: Document): void {
  const localAEL = doc1.addEventListener, localREL = doc1.removeEventListener, kFunc = "function";
  if (typeof localAEL === kFunc && typeof localREL === kFunc && localAEL !== myAEL) {
    try {
      call(localAEL, element, kVOnClick, noop);
    } catch {}
    try {
      call(localREL, element, kVOnClick, noop);
    } catch {}
  }
}
function findAllOnClick(cmd?: kContentCmd.FindAllOnClick): void {
  if (!root) { return; }
  call(Remove, root);
  allNodesInDocument = call(getElementsByTagNameInDoc, doc, "*");
  let len = allNodesInDocument.length, i = 0;
  !cmd && len > GlobalConsts.maxElementsWhenScanOnClick && (len = 0); // stop it
  for (; i < len; i++) {
    const el: Element | HTMLElement = allNodesInDocument[i];
    if ((el as HTMLElement).onclick && !call(HasAttr, el, "onclick")
        && !(el instanceof HA)) { // ignore <button>s to iter faster
      pushInDocument(i);
    }
  }
  doRegister(1);
  allNodesInDocument = null;
}
function executeCmd(eventOrDestroy?: Event): void {
  const detail: CommandEventDetail = eventOrDestroy && (eventOrDestroy as CustomEvent).detail,
  cmd = detail ? detail[0] === sec ? detail[1] : kContentCmd._fake
        : eventOrDestroy ? kContentCmd._fake : kContentCmd.Destroy;
  if (cmd !== kContentCmd.Destroy) {
    cmd === kContentCmd.FindAllOnClick && findAllOnClick(cmd);
    return;
  }
  toRegister.length = 0;
  toRegister.p = setTimeout_ = Build.BTypes & ~BrowserType.Firefox ? noop as () => 1 : function (): 1 { return 1; };
  root = null as never;
  clearTimeout_(timer);
  timer = 1;
  delayFindAll && delayFindAll(); // clean the "load" listener
}
function noop(): void | 1 { return; }
toRegister.p = push as any, toRegister.s = toRegister.splice;
!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinShadowDOMV0 ||
(!SR || SR instanceof E) && (SR = CE as never);
// only the below can affect outsides
cs.remove();
ETP.addEventListener = myAEL;
FP.toString = hooks.toString;
_listen(kOnDomRead, handler, true);
_listen("load", delayFindAll, true);
  }).toString() + ")();" /** need "toString()": {@see Gulpfile.js#patchExtendClick} */;
  if (Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction && Build.BTypes & BrowserType.Chrome &&
      appVer >= BrowserVer.MinEnsuredES6MethodFunction) {
    injected = injected.replace(<RegExpG> /: ?function \w+/g, "");
  }
  script.textContent = injected;
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
  docEl ? Build.BTypes & ~BrowserType.Firefox ? script.insertBefore.call(docEl, script, docEl.firstChild)
    : docEl.insertBefore(script, docEl.firstChild) : d.appendChild(script);
  VDom.OnDocLoaded_(function (): void { box === null && setTimeout(function (): void {
    box || execute(kContentCmd.Destroy);
  }, 17); });
  if ((Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
        && !(Build.BTypes & ~BrowserType.Chrome))
      || !script.parentNode) { // It succeeded to hook.
    Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage ||
    !(Build.BTypes & BrowserType.Chrome) ||
    VDom.allowRAF_ || requestAnimationFrame(() => { VDom.allowRAF_ = 1; });
    return;
  }
  // else: sandboxed or JS-disabled; Firefox == * or Chrome < 68 (MinEnsuredNewScriptsFromExtensionOnSandboxedPage)
  script.remove();
  if (!(Build.BTypes & BrowserType.Chrome)
      || Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
      || Build.BTypes & ~BrowserType.Chrome && !appVer) {
    VDom.allowScripts_ = 0;
    return;
  }
  // else: Chrome < MinEnsuredNewScriptsFromExtensionOnSandboxedPage
  const breakTotally = Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage
      && appVer && appVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage;
  console.info((Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage && breakTotally
                ? "Vimium C can" : "Some functions of Vimium C may")
      + " not work because %o is sandboxed.",
    location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"));
  if (Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage && breakTotally) {
    VSettings.destroy_(true);
    return;
  }
  VDom.allowScripts_ = 0;
  interface TimerLib extends Window {
    setInterval: typeof setInterval;
    setTimeout: typeof setTimeout | (
      (this: void, handler: (this: void, i: TimerType.fake | undefined) => void, timeout: number) => number);
  }
  (window as TimerLib).setTimeout = (window as TimerLib).setInterval =
  function (func: (info: TimerType.fake | undefined) => void, timeout: number): number {
    let f = Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback && timeout > 9 ? window.requestIdleCallback : null
      , cb = () => func(TimerType.fake);
    // in case there's `$("#requestIdleCallback")`
    return (BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage || VDom && VDom.allowRAF_)
      ? (Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback ? f && !(f instanceof Element) : timeout > 9)
      ? ((Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback ? f : requestIdleCallback
          ) as Exclude<typeof f, null | undefined | Element>)(cb, { timeout })
      : requestAnimationFrame(cb)
      : (Promise.resolve(1).then(cb), 1);
  };
})();
}
