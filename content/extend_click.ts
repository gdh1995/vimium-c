if (VDom && VimiumInjector === undefined) {
(function extendClick(this: void, isFirstTime?: boolean): void | false | undefined {
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
    DelayToStartIteration = 666,
    DelayForNext = 36,
    DelayForNextComplicatedCase = 1,
    kSecretAttr = "data-vimium",
    SecretUpperLimit = 1e5,
    MaxRetryTimesForHook = 99,

    kVOnClick = "VimiumOnclick",
    kHook = "VimiumHook",
    kCmd = "Vimium",
  }
  type ClickableEventDetail = [ /** inDocument */ number[], /** forDetached */ number[] | null ];
  /**
   * Note: on FF 66.0.3 x64 (Win 10), a '[sec, cmd]' from {@link ../front/vomnibar#VSettings.destroy_}
   *     will cause "permission error" when reading property [0] on main world.
   * `high bits` mean secret, `lower bits >> kContentCmd.MaskedBitNumber` mean content cmd
   */
  type CommandEventDetail = number;
  interface VimiumCustomEventCls {
    prototype: CustomEvent;
    new <Type extends InnerConsts & string>(typeArg: Type, eventInitDict?: { detail?:
      Type extends InnerConsts.kVOnClick ? ClickableEventDetail
        : Type extends InnerConsts.kCmd ? CommandEventDetail
        : Type extends InnerConsts.kHook ? /** secret */ number
        : never;
    }): CustomEvent;
  }

  if (!(Build.NDEBUG || !isFirstTime || (VDom.createElement_ + "").indexOf("instanceof HTMLElement") >= 0)) {
    console.log("Assert error: VDom.createElement_ should have not been called");
  }
  const kVOnClick1 = InnerConsts.kVOnClick, kHook = InnerConsts.kHook
    , d = document, docEl = d.documentElement
    , script = VDom.createElement_<1>("script")
    , secret: number = (Math.random() * InnerConsts.SecretUpperLimit + 1) | 0;
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
  if (!(script instanceof HTMLScriptElement)) {
    if (!(Build.BTypes & ~BrowserType.Chrome)
        && Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage
        && Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage) {
      return;
    }
    return isFirstTime != null && VDom.OnDocLoaded_(extendClick); // retry after a while, using a real <script>
  }

  let box: Element | undefined | 0, hookRetryTimes = 0,
  hook = function (event: CustomEvent): void {
    const t = event.target;
    if (++hookRetryTimes > InnerConsts.MaxRetryTimesForHook
        || event.detail !== secret || !(t instanceof Element)) { return; }
    // it's unhooking is delayed, so here may no VLib
    event.stopImmediatePropagation();
    removeEventListener(kHook, hook, true);
    hook = null as never;
    if (box == null) {
      t.removeAttribute(InnerConsts.kSecretAttr);
      t.addEventListener(kVOnClick1, onClick, true);
      box = t;
    }
  };
  function onClick(event: CustomEvent): void {
    VLib.Stop_(event);
    let detail = event.detail as ClickableEventDetail | null;
    if (!Build.NDEBUG) {
      let target = event.target as Element;
      console.log(`Vimium C: extend click: resolve ${
          detail ? Build.BTypes & ~BrowserType.Firefox ? "[%o + %o]" : "[%o+%o]" : "<%o>%s"
        } in %o @t=%o .`
        , detail ? detail[0].length
          : (Build.BTypes & ~BrowserType.Firefox && typeof target.tagName !== "string" ? target + ""
              : target.tagName as string).toLowerCase()
        , detail ? detail[1] ? detail[1].length : -0 : ""
        , location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
        , Date.now() % 3600000);
    }
    if (detail) {
      resolve(0, detail[0]); detail[1] && resolve(1, detail[1]);
    } else {
      VLib.clickable_.add(event.target as Element);
    }
  }
  function resolve(isBox: BOOL, nodeIndexList: number[]): void {
    if (!nodeIndexList.length) { return; }
    let list = isBox ? (box as Element).getElementsByTagName("*") : document.getElementsByTagName("*");
    for (const index of nodeIndexList) {
      let el = list[index];
      el && VLib.clickable_.add(el);
    }
    isBox && ((box as Element).textContent = "");
  }
  function dispatchCmd(cmd: ValidContentCmds) {
    (box as Exclude<typeof box, 0 | undefined>).dispatchEvent(new CustomEvent(InnerConsts.kCmd, {
      detail: <CommandEventDetail> (secret << kContentCmd.MaskedBitNumber) | cmd
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
      r.call(box, kVOnClick1, onClick, !0);
      dispatchCmd(kContentCmd.Destroy);
    }
    if (box == null && isFirstTime) {
      r(kHook, hook, !0);
      if (cmd === kContentCmd.DestroyForCSP) {
        // normally, if here, must have: limited by CSP; not C or C >= MinEnsuredNewScriptsFromExtensionOnSandboxedPage
        // ignore the rare (unexpected) case that injected code breaks even when not limited by CSP,
        //     which might mean curCVer has no ES6...
        VDom.runJS_("`${Vimium" + secret + "=>9}`");
      }
    }
    box = 0;
    settings && (settings.execute_ = null);
  }

  const appInfo = Build.BTypes & BrowserType.Chrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        ? navigator.appVersion.match(<RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/) : 0 as 0
    , appVer: BrowserVer | 0 = Build.BTypes & BrowserType.Chrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
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
E = Element, EP = E.prototype, Append = EP.appendChild, Insert = EP.insertBefore,
Attr = EP.setAttribute, HasAttr = EP.hasAttribute, Remove = EP.remove,
StopProp = Event.prototype.stopImmediatePropagation as (this: Event) => void,
contains = EP.contains.bind(doc), // in fact, it's Node.prototype.contains
nodeIndexListInDocument: number[] = [], nodeIndexListForDetached: number[] = [],
getElementsByTagNameInDoc = doc.getElementsByTagName, getElementsByTagNameInEP = EP.getElementsByTagName,
IndexOf = _call.bind(toRegister.indexOf) as never as (list: HTMLCollectionOf<Element>, item: Element) => number,
push = nodeIndexListInDocument.push,
pushInDocument = push.bind(nodeIndexListInDocument), pushForDetached = push.bind(nodeIndexListForDetached),
CE = CustomEvent as VimiumCustomEventCls, HA = HTMLAnchorElement,
FP = Function.prototype, funcToString = FP.toString,
listen = _call.bind<(this: EventTarget,
        type: string, listener: EventListenerOrEventListenerObject, useCapture?: EventListenerOptions) => any,
    [EventTarget, string, EventListenerOrEventListenerObject, EventListenerOptions?], any>(_listen),
rEL = removeEventListener, clearTimeout_ = clearTimeout,
sec: number = +<string> cs.dataset.vimium,
kVOnClick = InnerConsts.kVOnClick,
kOnDomReady = "DOMContentLoaded",
kValue = "value",
hooks = {
  toString: function toString(this: FUNC): string {
    const a = this,
    str = call(_apply as (this: (this: FUNC, ...args: Array<{}>) => string, self: FUNC, args: IArguments) => string,
                funcToString,
                a === myAEL ? _listen : a === hooks.toString ? funcToString : a, arguments);
    detectDisabled && str === `Vimium${sec}=>9` && executeCmd();
    return str;
  },
  addEventListener: function addEventListener(this: EventTarget, type: string
      , listener: EventListenerOrEventListenerObject): void {
    const a = this, args = arguments, len = args.length;
    len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2])
      : call(_apply as (this: (this: EventTarget, ...args: Array<{}>) => void
                        , self: EventTarget, args: IArguments) => void,
             _listen as (this: EventTarget, ...args: Array<{}>) => void, a, args);
    if (type === "click" ? listener && !(a instanceof HA) && a instanceof E
        : type === kVOnClick
          // note: window.history is mutable on C35, so only these can be used: top,window,location,document
          && a && !(a as Window).window && (a as Node).nodeType === kNode.ELEMENT_NODE) {
      toRegister.p(a as Element);
      timer = timer || setTimeout_(next, InnerConsts.DelayToStartIteration);
    }
    // returns void: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/events/event_target.idl
  }
}, myAEL = hooks.addEventListener;

let handler = function (this: void): void {
  /** not check if a DOMReady event is trusted: keep the same as {@link ../lib/dom_utils.ts#VDom.OnDocLoaded_ } */
  rEL(kOnDomReady, handler, !0);
  clearTimeout_(timer);
  detectDisabled = 0;
  const docEl2 = docChildren[0] as Element | null,
  el = call(Create, doc, "div") as HTMLDivElement,
  key = InnerConsts.kSecretAttr;
  handler = docChildren = null as never;
  if (!docEl2) { return executeCmd(); }
  call(Attr, el, key, "");
  listen(el, InnerConsts.kCmd, executeCmd, !0);
  call(Append, docEl2, el), dispatch(el, new CE(InnerConsts.kHook, {detail: sec})), call(Remove, el);
  if (call(HasAttr, el, key)) {
    executeCmd();
  } else {
    root = el;
    timer = toRegister.length > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0;
  }
},
detectDisabled: BOOL = 1,
// here `setTimeout` is normal and won't use TimerType.fake
setTimeout_ = setTimeout as SafeSetTimeout,
delayFindAll = function (e?: Event): void {
  if (e && (e.target !== doc
          || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
              ? !e.isTrusted : e.isTrusted === !1))) { return; }
  rEL("load", delayFindAll, !0);
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
  call(Remove, root);
  // skip some nodes if only crashing, so that there would be less crash logs in console
  const slice = toRegister.s(start, delta);
  // tslint:disable-next-line: prefer-for-of
  for (let i = unsafeDispatchCounter = 0; i < slice.length; i++) {
    prepareRegister(slice[i]); // avoid for-of, in case Array::[[Symbol.iterator]] was modified
  }
  doRegister();
  allNodesInDocument = allNodesForDetached = null;
}
, root: HTMLDivElement, timer = setTimeout_(handler, InnerConsts.DelayToWaitDomReady)
;
function prepareRegister(this: void, element: Element): void {
  if (contains(element)) {
    pushInDocument(
      IndexOf(allNodesInDocument = allNodesInDocument || call(getElementsByTagNameInDoc, doc, "*")
        , element));
    return;
  }
  // here element is inside a #shadow-root or not connected
  const doc1 = element.ownerDocument;
  // in case element is <form> / <frameset> / adopted into another document, or aEL is from another frame
  if (doc1 !== doc) {
    // although on Firefox element.__proto__ is auto-updated when it's adopted
    // but aEl may be called before real insertion
    if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
          || (doc1 as WindowWithTop).top !== top)
        && (doc1 as Exclude<typeof doc1, Window>).nodeType === kNode.DOCUMENT_NODE
        && (doc1 as Document).defaultView) {
      // just smell like a Document
      safeReRegister(element, doc1 as Document);
    } // `defaultView` is to check whether element is in a real frame's DOM tree
    // Note: on C72, ownerDocument of elements under <template>.content
    // is a fake "about:blank" document object
    return;
  }
  let e1: Element | null = element, e2: Node | RadioNodeList | null, e3: Node | RadioNodeList | null | undefined;
  for (; e2 = e1.parentElement as Exclude<Element["parentElement"], Window>; e1 = e2 as Element) {
    // according to tests and source code, <frameset>'s named getter requires <frame>.contentDocument is valid
    // so here pe and pn won't be Window if only ignoring the case of `<div> -> #shadow-root -> <frameset>`
    if (Build.BTypes & ~BrowserType.Firefox
        && e2 !== (e3 = e1.parentNode as Exclude<Element["parentNode"], Window>)
        && kValue in e2) {
      // here skips more cases than a most precise solution, but it's enough
      if (!e3 || kValue in e3) { return; }
      if (e3.nodeType !== kNode.ELEMENT_NODE) { break; }
      e2 = e3 as Element;
    }
  }
  // note: the below changes DOM trees,
  // so `dispatch` MUST NEVER throw. Otherwises a page might break
  if (!(e2 = e1.parentNode as Exclude<Element["parentNode"], Window>)) {
    root !== e1 && call(Append, root, e1);
    pushForDetached(
      IndexOf(allNodesForDetached = allNodesForDetached || call(getElementsByTagNameInEP, root, "*")
        , element));
  // Note: ignore the case that a plain #document-fragment has a fake .host
  } else if (e2.nodeType === kNode.DOCUMENT_FRAGMENT_NODE
      && !((e2 as ShadowRoot | DocumentFragment & { host?: undefined }).host
    // here use a larger matching of `"value" in`, so that a RadioNodeList cann't crash the block below
            || Build.BTypes & ~BrowserType.Firefox && (e3 = e1.nextSibling) && e3.parentElement !== null)) {
    // not register, if ShadowRoot or .nextSibling is not real
    // NOTE: ignore nodes belonging to a shadowRoot,
    // in case of `<html> -> ... -> <div> -> #shadow-root -> ... -> <iframe>`,
    // because `<iframe>` will destroy if removed
    if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick - 2) {
      doRegister();
      Build.BTypes & ~BrowserType.Firefox || (e3 = e1.nextSibling);
      call(Append, root, e1);
      unsafeDispatchCounter++;
      dispatch(element, new CE(kVOnClick));
      call(Insert, e2, e1, e3 as Exclude<typeof e3, undefined>);
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
  let localAEL = doc1.addEventListener, localREL = doc1.removeEventListener, kFunc = "function";
  // tslint:disable-next-line: triple-equals
  if (typeof localAEL == kFunc && typeof localREL == kFunc && localAEL !== myAEL) {
    try {
      // Note: here may break in case .addEventListener is an <embed> or overridden by host code
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
  len = cmd || len < GlobalConsts.MinElementCountToStopScanOnClick ? len : 0; // stop it
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
  cmd = detail ? (detail >> kContentCmd.MaskedBitNumber) === sec ? detail & ((1 << kContentCmd.MaskedBitNumber) - 1)
        : kContentCmd._fake
        : eventOrDestroy ? kContentCmd._fake : kContentCmd.Destroy;
  // always stop prop even if the secret doesn't match, so that an attacker can not detect secret by enumerating numbers
  detail && call(StopProp, eventOrDestroy as Event);
  if (cmd < kContentCmd.Destroy) {
    cmd === kContentCmd.FindAllOnClick && findAllOnClick(cmd);
    return;
  }
  toRegister.length = detectDisabled = 0;
  toRegister.p = setTimeout_ = Build.BTypes & ~BrowserType.Firefox ? noop as () => 1 : function (): 1 { return 1; };
  root = null as never;
  clearTimeout_(timer);
  timer = 1;
  rEL(kOnDomReady, handler, !0);
  delayFindAll && delayFindAll(); // clean the "load" listener
}
function noop(): void | 1 { return; }

toRegister.p = push as any, toRegister.s = toRegister.splice;
// only the below can affect outsides
cs.remove();
ETP.addEventListener = myAEL;
FP.toString = hooks.toString;
_listen(kOnDomReady, handler, !0);
_listen("load", delayFindAll, !0);

  }).toString() + ")();" /** need "toString()": {@see Gulpfile.js#patchExtendClick} */;
  if (isFirstTime) {
    if (Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction && Build.BTypes & BrowserType.Chrome &&
        appVer >= BrowserVer.MinEnsuredES6MethodFunction) {
      injected = injected.replace(<RegExpG> /: ?function \w+/g, "");
    }
    VSettings.execute_ = execute;
    addEventListener(kHook, hook, !0);
  } else if (Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
      || Build.BTypes & ~BrowserType.Chrome) {
    injected = 'document.currentScript.dataset.vimium=""';
  }
  /**
   * According to `V8CodeCache::ProduceCache` and `V8CodeCache::GetCompileOptions`
   *     in third_party/blink/renderer/bindings/core/v8/v8_code_cache.cc,
   *   and ScriptController::ExecuteScriptAndReturnValue
   *     in third_party/blink/renderer/bindings/core/v8/script_controller.cc,
   * inlined script are not cached for `v8::ScriptCompiler::kNoCacheBecauseInlineScript`.
   * But here it still uses the same script, just for my personal preference.
   */
  if (!(Build.BTypes & BrowserType.Chrome) || isFirstTime
      || (Build.BTypes & ~BrowserType.Chrome
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage)
          && appVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage) {
  script.textContent = injected;
  script.type = "text/javascript";
  script.dataset.vimium = secret as number | string as string;
  docEl ? Build.BTypes & ~BrowserType.Firefox ? script.insertBefore.call(docEl, script, docEl.firstChild)
    : docEl.insertBefore(script, docEl.firstChild) : d.appendChild(script);
  isFirstTime ? (script.dataset.vimium = "") : script.remove();
  }
  if (!(Build.NDEBUG || !isFirstTime || (VDom.OnDocLoaded_ + "").indexOf("DOMContentLoaded") >= 0)) {
    console.log("Assert error: VDom.OnDocLoaded_ should have not been called");
  }
  if ((Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
        && !(Build.BTypes & ~BrowserType.Chrome))
      ? true : isFirstTime ? !script.parentNode
      : !(Build.BTypes & ~BrowserType.Chrome)
        && Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
      ? true
      : !script.dataset.vimium) { // It succeeded to hook.
    VDom.OnDocLoaded_(function (): void {
      box || execute(kContentCmd.DestroyForCSP);
    });
    Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage ||
    !(Build.BTypes & BrowserType.Chrome) ||
    VDom.allowRAF_ || requestAnimationFrame(() => { VDom.allowRAF_ = 1; });
    return;
  }
  // else: sandboxed or JS-disabled; Firefox == * or Chrome < 68 (MinEnsuredNewScriptsFromExtensionOnSandboxedPage)
  VDom.allowScripts_ = 0;
  script.remove();
  execute(kContentCmd.Destroy);
  if (!(Build.BTypes & BrowserType.Chrome)
      || Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
      || Build.BTypes & ~BrowserType.Chrome && !appVer) {
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
  interface TimerLib extends Window {
    setInterval: typeof setInterval;
    setTimeout: typeof setTimeout | (
      (this: void, handler: (this: void, fake?: TimerType.fake) => void, timeout: number) => number);
  }
  let rIC = Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback ? window.requestIdleCallback : 0 as const;
  if (Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback) {
    // tslint:disable-next-line: triple-equals
    rIC = typeof rIC != "function" || rIC instanceof Element ? 0 : rIC;
  }
  // here rIC is (not defined), 0 or real
  (window as TimerLib).setTimeout = (window as TimerLib).setInterval =
  function (func: (info?: TimerType.fake) => void, timeout: number): number {
    const cb = () => func(TimerType.fake);
    // in case there's `$("#requestIdleCallback")`
    return (BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage || VDom && VDom.allowRAF_)
      ? timeout > 19 && (Build.MinCVer >= BrowserVer.MinEnsured$requestIdleCallback || rIC)
      ? ((Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback ? rIC : requestIdleCallback
          ) as RequestIdleCallback)(cb, { timeout })
      : requestAnimationFrame(cb)
      : (Promise.resolve(1).then(cb), 1);
  };
})(VDom.docNotCompleteWhenVimiumIniting_);
}
