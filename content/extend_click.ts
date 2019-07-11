if (VDom && VimiumInjector === undefined) {
(function extendClick(this: void, isFirstTime?: boolean): void {
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
    TimeoutOf3rdPartyFunctionsCache = 1e4, // 10 seconds
    kSecretAttr = "data-vimium",

    kVOnClick = "VimiumOnclick",
    kHook = "VimiumHook",
    kCmd = "Vimium",
  }
  type ClickableEventDetail = [ /** inDocument */ number[], /** forDetached */ number[]
          , /** fromAttrs */ BOOL ];
/** Note: on Firefox, a `[sec, cmd]` can not be visited by the main world:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#Constructors_from_the_page_context.
 */
  // `high bits` mean secret, `lower bits >> kContentCmd.MaskedBitNumber` mean content cmd
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

  if (!(Build.NDEBUG || !isFirstTime || (VDom.createElement_ + "").indexOf('"lang"') >= 0)) {
    console.log("Assert error: VDom.createElement_ should have not been called");
  }
  const kVOnClick1 = InnerConsts.kVOnClick
    , kHook = (InnerConsts.kHook + BuildStr.RandomName0) as InnerConsts.kHook
    , docEl = document.documentElement
    , secret: number = (Math.random() * kContentCmd.SecretRange + 1) | 0
    , script = VDom.createElement_("script");
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
  if ((script as Element as ElementToHTML).lang == null) {
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)) {
      if (!(docEl && (docEl as ElementToHTMLorSVG).tabIndex != null)) {
        // Raw XML: should never create any HTMLElement instance
        VDom.allowScripts_ = 0;
        return;
      }
    } else if (!(Build.BTypes & BrowserType.Edge)
        && Build.MinCVer > BrowserVer.NoRAFOrRICOnSandboxedPage
        && Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage) {
      return;
    }
    isFirstTime != null && VDom.OnDocLoaded_(extendClick); // retry after a while, using a real <script>
    return;
  }

  let box: Element | undefined | 0, hookRetryTimes = 0,
  isFirstResolve: 0 | 1 | 2 | 3 = isFirstTime && window === top ? 3 : 0,
  hook = function (event: CustomEvent): void {
    const t = event.target;
    // use `instanceof` to require the `t` element is a new instance which has never entered this extension world
    if (++hookRetryTimes > GlobalConsts.MaxRetryTimesForSecret
        || event.detail !== secret || !(t instanceof Element)) { return; }
    // it's unhooking is delayed, so here may no VKey
    event.stopImmediatePropagation();
    removeEventListener(kHook, hook, true);
    hook = null as never;
    if (box == null) {
      t.removeAttribute(InnerConsts.kSecretAttr);
      t.addEventListener(kVOnClick1, onClick, true);
      box = t;
    }
  },
  delayFindAll = function (e: Event): void {
    if (e && (e.target !== document
            || (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
                ? !e.isTrusted : e.isTrusted === !1))) { return; }
    removeEventListener("load", delayFindAll, !0);
    delayFindAll = null as never;
    box && setTimeout(function (): void {
      box && dispatchCmd(kContentCmd.FindAllOnClick);
      isFirstResolve = 0;
    }, InnerConsts.DelayToFindAll);
  };
  function onClick(event: CustomEvent): void {
    VKey.Stop_(event);
    let detail = event.detail as ClickableEventDetail | null, fromAttrs: 1 | 2 = detail ? (detail[2] + 1) as 1 | 2 : 1;
    if (!Build.NDEBUG) {
      let target = event.target as Element;
      console.log(`Vimium C: extend click: resolve ${
          detail ? Build.BTypes & ~BrowserType.Firefox ? "[%o + %o]" : "[%o+%o]" : "<%o>%s"
        } in %o @t=%o .`
        , detail ? detail[0].length
          : Build.BTypes & ~BrowserType.Firefox && typeof target.localName !== "string" ? target + ""
          : target.localName as string
        , detail ? detail[2] ? -0 : detail[1].length : ""
        , location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
        , Date.now() % 3600000);
    }
    if (detail) {
      resolve(0, detail[0]); resolve(1, detail[1]);
    } else {
      VDom.clickable_.add(event.target as Element);
    }
    if (isFirstResolve & fromAttrs) {
      isFirstResolve ^= fromAttrs;
      VHints.isActive_ && setTimeout(VHints.CheckLast_, 34);
    }
  }
  function resolve(isBox: BOOL, nodeIndexList: number[]): void {
    if (!nodeIndexList.length) { return; }
    let list = isBox ? (box as Element).getElementsByTagName("*") : document.getElementsByTagName("*");
    for (const index of nodeIndexList) {
      let el = list[index];
      el && VDom.clickable_.add(el);
    }
    isBox && ((box as Element).textContent = "");
  }
  function dispatchCmd(cmd: ValidContentCmds) {
    (box as Exclude<typeof box, 0 | undefined>).dispatchEvent(new CustomEvent(
        (InnerConsts.kCmd + BuildStr.RandomName1) as InnerConsts.kCmd, {
      detail: <CommandEventDetail> (secret << kContentCmd.MaskedBitNumber) | cmd
    }));
  }
  function execute(cmd: ValidContentCmds): void {
    if (cmd < kContentCmd._minNotDispatchDirectly) {
      if (cmd === kContentCmd.FindAllOnClick) {
        isFirstResolve = 0;
      }
      box && dispatchCmd(cmd);
      return;
    }
    const r = removeEventListener, events = VEvent;
    /** this function should keep idempotent */
    if (box) {
      r.call(box, kVOnClick1, onClick, !0);
      dispatchCmd(kContentCmd.Destroy);
    }
    if (box == null && isFirstTime) {
      r(kHook, hook, !0);
      if (Build.BTypes & ~BrowserType.Firefox
          && (!(Build.BTypes & BrowserType.Firefox) || VOther !== BrowserType.Firefox)
          && cmd === kContentCmd.DestroyForCSP) {
        // normally, if here, must have: limited by CSP; not C or C >= MinEnsuredNewScriptsFromExtensionOnSandboxedPage
        // ignore the rare (unexpected) case that injected code breaks even when not limited by CSP,
        //     which might mean curCVer has no ES6...
        VDom.runJS_("`${Vimium" + secret + "=>9}`");
      }
    }
    box = 0;
    events && (events.execute_ = null);
  }

  const appInfo = Build.BTypes & BrowserType.Chrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        && (!(Build.BTypes & ~BrowserType.Chrome) || VOther === BrowserType.Chrome)
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

  /** the `InnerVerifier` needs to satisfy
   * * never return any object (aka. keep void) if only "not absolutely safe"
   * * never change the global environment / break this closure
   * * must look like a real task and contain raondom string
   */
  interface InnerVerifier {
    (maybeSecret: string, maybeAnotherVerifierInner: InnerVerifier | unknown): void;
    // tslint:disable-next-line: ban-types
    (maybeSecret: string): [EventTarget["addEventListener"], Function["toString"], Function["toString"]?] | void;
  }
  type PublicFunction = (maybeKNeedToVerify: string, verifierFunc: InnerVerifier | unknown) => void | string;
  let injected: string = '"use strict";(' + (function VC(this: void): void {

function verifier(maybeSecret: string, maybeVerifierB?: InnerVerifier | unknown): ReturnType<InnerVerifier> {
  if (maybeSecret === BuildStr.MarkForName3 + BuildStr.RandomName3
      && noAbnormalVerifyingFound) {
    if (!maybeVerifierB) {
      return Build.BTypes & BrowserType.Firefox ? [myAEL, myToStr, myToSource] : [myAEL, myToStr];
    } else if (Build.BTypes & BrowserType.Firefox) {
      [anotherAEL, anotherToStr, anotherToSource] =
          (maybeVerifierB as InnerVerifier)(decryptFromVerifier(maybeVerifierB)
          ) as NonNullable<ReturnType<InnerVerifier>>;
      setTimeout_(function (): void {
        anotherAEL = anotherToStr = anotherToSource = 0;
      }, InnerConsts.TimeoutOf3rdPartyFunctionsCache);
    } else {
      [anotherAEL, anotherToStr] = (maybeVerifierB as InnerVerifier)(decryptFromVerifier(maybeVerifierB)
          ) as NonNullable<ReturnType<InnerVerifier>>;
    }
  } else {
    noAbnormalVerifyingFound = 0;
  }
}
type FUNC = (this: unknown, ...args: never[]) => unknown;
const doc = document, cs = doc.currentScript as HTMLScriptElement,
sec: number = +<string> cs.dataset.vimium,
ETP = EventTarget.prototype, _listen = ETP.addEventListener,
toRegister: Element[] & { p (el: Element): void | 1; s: Element[]["splice"] } = [] as any,
_apply = _listen.apply, _call = _listen.call,
call = _call.bind(_call) as <T, A extends any[], R>(func: (this: T, ...args: A) => R, thisArg: T, ...args: A) => R,
dispatch = _call.bind<(evt: Event) => boolean, [EventTarget, Event], boolean>(ETP.dispatchEvent),
E = Element, EP = E.prototype, Append = EP.appendChild, Insert = EP.insertBefore,
Attr = EP.setAttribute, HasAttr = EP.hasAttribute, Remove = EP.remove,
StopProp = Event.prototype.stopImmediatePropagation as (this: Event) => void,
contains = EP.contains.bind(doc), // in fact, it is Node.prototype.contains
nodeIndexListInDocument: number[] = [], nodeIndexListForDetached: number[] = [],
getElementsByTagNameInDoc = doc.getElementsByTagName, getElementsByTagNameInEP = EP.getElementsByTagName,
IndexOf = _call.bind(toRegister.indexOf) as never as (list: HTMLCollectionOf<Element>, item: Element) => number,
push = nodeIndexListInDocument.push,
pushInDocument = push.bind(nodeIndexListInDocument), pushForDetached = push.bind(nodeIndexListForDetached),
CE = CustomEvent as VimiumCustomEventCls, HA = HTMLAnchorElement,
FP = Function.prototype, _toString = FP.toString,
_toSource = Build.BTypes & BrowserType.Firefox && (FP as {toSource?: any}).toSource,
listen = _call.bind<(this: EventTarget,
        type: string, listener: EventListenerOrEventListenerObject, useCapture?: EventListenerOptions) => any,
    [EventTarget, string, EventListenerOrEventListenerObject, EventListenerOptions?], any>(_listen),
rEL = removeEventListener, clearTimeout_ = clearTimeout,
kVOnClick = InnerConsts.kVOnClick,
kEventName2 = kVOnClick + BuildStr.RandomName2,
kOnDomReady = "DOMContentLoaded",
kValue = "value",
StringIndexOf = kValue.indexOf, StringSubstr = kValue.substr,
decryptFromVerifier = (func: InnerVerifier | unknown): string => {
  const str = call(_toString, func as InnerVerifier), offset = call(StringIndexOf, str, kMarkToVerify);
  return call(StringSubstr, str, offset
      , GlobalConsts.MarkForName3Length + GlobalConsts.SecretStringLength);
},
hooks = {
  // the code below must include direct reference to at least one property in `hooks`
  // so that uglifyJS / terse won't remove the `hooks` variable
  /** Create */ C: doc.createElement as Document["createElement"],
  toString: function toString(this: FUNC): string {
    const a = this, args = arguments;
    if (BuildStr.RandomName3 && args.length === 2 && (args[0] as any) === kMarkToVerify) {
      // randomize the body of this function
      (args[1] as InnerVerifier)(
          decryptFromVerifier(Build.BTypes & BrowserType.Firefox ? args[1] : args[1] || BuildStr.RandomName3_public),
          verifier);
    }
    const replaced = a === myAEL || BuildStr.RandomName3 && a === anotherAEL ? _listen
        : a === myToStr || BuildStr.RandomName3 && a === anotherToStr ? _toString
        : Build.BTypes & BrowserType.Firefox
          && (a === myToSource || BuildStr.RandomName3 && a === anotherToSource) ? _toSource
        : 0,
    str = call(_apply as (this: (this: FUNC, ...args: Array<{}>) => string, self: FUNC, args: IArguments) => string,
                _toString, replaced || a, args),
    expectedFunc = replaced ? 0 : str === sAEL ? _listen : str === sToStr ? _toString
        : Build.BTypes & BrowserType.Firefox && _toSource &&  str === myToSourceObj.s ? _toSource
        : 0;
    Build.BTypes & ~BrowserType.Firefox &&
    detectDisabled && str === detectDisabled && executeCmd();
    return !expectedFunc
        ? BuildStr.RandomName3 && call(StringIndexOf, str, kMarkToVerify) > 0 ? call(_toString, noop) : str
        : !BuildStr.RandomName3 ? str
        : (
          noAbnormalVerifyingFound && (a as PublicFunction)(kMarkToVerify, verifier),
          a === anotherAEL ? call(_toString, _listen) : a === anotherToStr ? call(_toString, _toString)
          : Build.BTypes & BrowserType.Firefox && a === anotherToSource ? call(_toString, _toSource)
          : (noAbnormalVerifyingFound = 0, str)
        );
  },
  addEventListener: function addEventListener(this: EventTarget, type: string
      , listener: EventListenerOrEventListenerObject): void {
    const a = this, args = arguments, len = args.length;
    if (BuildStr.RandomName3 && type === kMarkToVerify) {
      (listener as any as InnerVerifier)(
        decryptFromVerifier(Build.BTypes & BrowserType.Firefox ? listener : listener || BuildStr.RandomName3_public),
        verifier);
      return;
    }
    len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2])
      : call(_apply as (this: (this: EventTarget, ...args: Array<{}>) => void
                        , self: EventTarget, args: IArguments) => void,
             _listen as (this: EventTarget, ...args: Array<{}>) => void, a, args);
    if (type === "click" ? listener && !(a instanceof HA) && a instanceof E
        : type === kEventName2
          // note: window.history is mutable on C35, so only these can be used: top,window,location,document
          && a && !(a as Window).window && (a as Node).nodeType === kNode.ELEMENT_NODE) {
      toRegister.p(a as Element);
      timer = timer || setTimeout_(next, InnerConsts.DelayToStartIteration);
    }
    // returns void: https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/events/event_target.idl
  }
},
noop = (): 1 => 1,
myAEL = hooks.addEventListener, myToStr = hooks.toString,
myToSourceObj = Build.BTypes & BrowserType.Firefox && _toSource ? {
  s: 0 as number | string as string,
  toSource (this: any): string {
    const args = arguments;
    if (BuildStr.RandomName3 && args.length === 2 && (args[0] as any) === kMarkToVerify) {
      // randomize the body of this function
      (args[1] as InnerVerifier)(
        decryptFromVerifier(Build.BTypes & BrowserType.Firefox ? args[1] : args[1] || BuildStr.RandomName3_public),
        verifier);
    }
    return call(_apply as (this: (this: FUNC, ...args: Array<{}>) => string, self: FUNC, args: IArguments) => string,
        typeof this === "function" ? myToStr : _toSource as typeof myToStr, this, args);
  }
} : 0 as never,
myToSource = Build.BTypes & BrowserType.Firefox && _toSource && myToSourceObj.toSource,
sAEL = myAEL + "", sToStr = myToStr + "";
if (Build.BTypes & BrowserType.Firefox && _toSource) {
  myToSourceObj.s = myToSource + "";
}

let handler = function (this: void): void {
  /** not check if a DOMReady event is trusted: keep the same as {@link ../lib/dom_utils.ts#VDom.OnDocLoaded_ } */
  rEL(kOnDomReady, handler, !0);
  clearTimeout_(timer);
  detectDisabled = 0;
  const docEl2 = docChildren[0] as Element | null,
  el = call(hooks.C, doc, "div") as HTMLDivElement,
  key = InnerConsts.kSecretAttr;
  handler = docChildren = null as never;
  if (!docEl2) { return executeCmd(); }
  call(Attr, el, key, "");
  listen(el, (InnerConsts.kCmd + BuildStr.RandomName1) as InnerConsts.kCmd, executeCmd, !0);
  call(Append, docEl2, el),
  dispatch(el, new CE((InnerConsts.kHook + BuildStr.RandomName0) as InnerConsts.kHook, {detail: sec})),
  call(Remove, el);
  if (call(HasAttr, el, key)) {
    executeCmd();
  } else {
    root = el;
    timer = toRegister.length > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0;
  }
},
kMarkToVerify = BuildStr.MarkForName3 as const, // declare it later so that terser v3.10.3 won't embed it in 2-pass mode
detectDisabled: string | 0 = `Vimium${sec}=>9`,
noAbnormalVerifyingFound: BOOL = 1,
anotherAEL: typeof myAEL | undefined | 0, anotherToStr: typeof myToStr | undefined | 0,
anotherToSource: typeof myToSource | undefined | 0,
// here `setTimeout` is normal and will not use TimerType.fake
setTimeout_ = setTimeout as SafeSetTimeout,
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
  doRegister(0);
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
    // although on Firefox element.__proto__ is auto-updated when it is adopted
    // but aEl may be called before real insertion
    if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter
          || (doc1 as WindowWithTop).top !== top)
        && (doc1 as Exclude<typeof doc1, Window>).nodeType === kNode.DOCUMENT_NODE
        && (doc1 as Document).defaultView) {
      // just smell like a Document
      safeReRegister(element, doc1 as Document);
    } // `defaultView` is to check whether element is in a DOM tree of a real frame
    // Note: on C72, ownerDocument of elements under <template>.content
    // is a fake "about:blank" document object
    return;
  }
  let e1: Element | null = element, e2: Node | RadioNodeList | null, e3: Node | RadioNodeList | null | undefined;
  for (; e2 = e1.parentElement as Exclude<Element["parentElement"], Window>; e1 = e2 as Element) {
    // according to tests and source code, the named getter for <frameset> requires <frame>.contentDocument is valid
    // so here pe and pn will not be Window if only ignoring the case of `<div> -> #shadow-root -> <frameset>`
    if (Build.BTypes & ~BrowserType.Firefox
        && e2 !== (e3 = e1.parentNode as Exclude<Element["parentNode"], Window>)
        && kValue in e2) {
      // here skips more cases than a most precise solution, but it is enough
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
    // here use a larger matching of `"value" in`, so that a RadioNodeList can not crash the block below
            || Build.BTypes & ~BrowserType.Firefox && (e3 = e1.nextSibling) && e3.parentElement !== null)) {
    // not register, if ShadowRoot or .nextSibling is not real
    // NOTE: ignore nodes belonging to a shadowRoot,
    // in case of `<html> -> ... -> <div> -> #shadow-root -> ... -> <iframe>`,
    // because `<iframe>` will destroy if removed
    if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick - 2) {
      doRegister(0);
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
function doRegister(fromAttrs: BOOL): void {
  if (nodeIndexListInDocument.length || nodeIndexListForDetached.length) {
    unsafeDispatchCounter++;
    dispatch(root, new CE(kVOnClick, {
      detail: [nodeIndexListInDocument, nodeIndexListForDetached, fromAttrs]
    }));
    nodeIndexListInDocument.length = nodeIndexListForDetached.length = 0;
  }
}
function safeReRegister(element: Element, doc1: Document): void {
  const localAEL = doc1.addEventListener, localREL = doc1.removeEventListener, kFunc = "function";
  // tslint:disable-next-line: triple-equals
  if (typeof localAEL == kFunc && typeof localREL == kFunc && localAEL !== myAEL) {
    try {
      // Note: here may break in case .addEventListener is an <embed> or overridden by host code
      call(localAEL, element, kEventName2, noop);
    } catch {}
    try {
      call(localREL, element, kEventName2, noop);
    } catch {}
  }
}
function findAllOnClick(cmd?: kContentCmd.FindAllOnClick): void {
  if (!root) { return; }
  call(Remove, root);
  allNodesInDocument = call(getElementsByTagNameInDoc, doc, "*");
  let len = allNodesInDocument.length, i = unsafeDispatchCounter = 0;
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
  // always stopProp even if the secret does not match, so that an attacker can not detect secret by enumerating numbers
  detail && call(StopProp, eventOrDestroy as Event);
  if (cmd < kContentCmd.Destroy) {
    cmd === kContentCmd.FindAllOnClick && findAllOnClick(cmd);
    return;
  }
  toRegister.length = detectDisabled = 0;
  toRegister.p = setTimeout_ = noop;
  root = null as never;
  clearTimeout_(timer);
  timer = 1;
  rEL(kOnDomReady, handler, !0);
}

toRegister.p = push as any, toRegister.s = toRegister.splice;
// only the below can affect outsides
cs.remove();
ETP.addEventListener = myAEL;
FP.toString = myToStr;
if (Build.BTypes & BrowserType.Firefox && _toSource) {
  (FP as {toSource?: any}).toSource = myToSource;
}
_listen(kOnDomReady, handler, !0);

  }).toString() + ")();" /** need "toString()": {@see Gulpfile.js#patchExtendClick} */;
  if (isFirstTime) {
    if (Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction && Build.BTypes & BrowserType.Chrome &&
        appVer >= BrowserVer.MinEnsuredES6MethodFunction) {
      injected = injected.replace(<RegExpG> /: ?function \w+/g, "");
    }
    if (BuildStr.RandomName3) {
      injected = injected.replace(BuildStr.RandomName3 + '"'
          , ((Math.random() * GlobalConsts.SecretRange + GlobalConsts.SecretBase) | 0) + '"');
    }
    VEvent.execute_ = execute;
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
    : docEl.insertBefore(script, docEl.firstChild) : document.appendChild(script);
  isFirstTime ? (script.dataset.vimium = "") : script.remove();
  }
  if (!(Build.NDEBUG || !isFirstTime || (VDom.OnDocLoaded_ + "").indexOf("DOMContentLoaded") >= 0)) {
    console.log("Assert error: VDom.OnDocLoaded_ should have not been called");
  }
  if (!(Build.NDEBUG
        || BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage <= BrowserVer.NoRAFOrRICOnSandboxedPage)) {
    console.log("Assert error: Warning: may no timer function on sandbox page!");
  }
  if ((Build.MinCVer >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
        && !(Build.BTypes & ~BrowserType.Chrome))
      ? true : isFirstTime ? !script.parentNode
      : !script.dataset.vimium) { // It succeeded to hook.
    !(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox ||
    VDom.OnDocLoaded_(function (): void {
      box || execute(kContentCmd.DestroyForCSP);
    });
    addEventListener("load", delayFindAll, !0);
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
      // still check appVer, so that treat it as a latest version if appVer parsing is failed
      && appVer && appVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage;
  console.info((Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage && breakTotally
                ? "Vimium C can" : "Some functions of Vimium C may")
      + " not work because %o is sandboxed.",
    location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"));
  if (Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage && breakTotally) {
    VEvent.destroy_(1);
    return;
  }
  let rIC = Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback || Build.BTypes & BrowserType.Edge
      ? window.requestIdleCallback : 0 as const;
  if (Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback) {
    // use `instanceof` to require `rIC` is a new instance in this world
    // tslint:disable-next-line: triple-equals
    rIC = typeof rIC != "function" || rIC instanceof Element ? 0 : rIC;
  }
  // here rIC is (not defined), 0 or real
  setTimeout = (setInterval = function (func: (info?: TimerType.fake) => void, timeout: number): number {
    const cb = () => func(TimerType.fake);
    // in case there's `$("#requestIdleCallback")`
    return timeout > 19
      && (Build.MinCVer >= BrowserVer.MinEnsured$requestIdleCallback && !(Build.BTypes & BrowserType.Edge)
          || rIC)
      ? ((Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback ? rIC : requestIdleCallback
          ) as RequestIdleCallback)(cb, { timeout })
      : requestAnimationFrame(cb)
      ;
  } as any);
})(VDom.docNotCompleteWhenVimiumIniting_);
}
