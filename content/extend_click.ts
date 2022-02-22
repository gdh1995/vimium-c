import {
  clickable_, setupEventListener, timeout_, doc, isAlive_, set_noRAF_old_cr_, math, isTop, OnChrome, readyState_,
  loc_, getTime, recordLog, VTr, vApi, Stop_, isTY, OnEdge
} from "../lib/utils"
import {
  createElement_, set_createElement_, OnDocLoaded_, runJS_, rAF_, removeEl_s, attr_s, setOrRemoveAttr_s,
  parentNode_unsafe_s
} from "../lib/dom_utils"
import { safeDestroy, setupBackupTimer_cr } from "./port"
import { coreHints, doesWantToReloadLinkHints, hintOptions } from "./link_hints"
import { grabBackFocus } from "./insert"

export const main_not_ff = (Build.BTypes & ~BrowserType.Firefox ? (): void => {
(function extendClick(this: void, isFirstTime?: boolean): void {
/** Note(gdh1995):
 * According to source code of C72,
 *     getElementsByTagName has a special cache (per container node) for tag name queries,
 * and I think it's shared across V8 worlds.
 * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/container_node.cc?type=cs&q=getElementsByTagName&g=0&l=1578
 */
  const enum InnerConsts {
    MaxElementsInOneTickDebug = 1024,
    MaxElementsInOneTickRelease = 512,
    MaxUnsafeEventsInOneTick = 12,
    DelayToWaitDomReady = 1000,
    DelayForNext = 36,
    DelayForNextComplicatedCase = 1,
    TimeoutOf3rdPartyFunctionsCache = 1e4, // 10 seconds
    kSecretAttr = "data-vimium",

    kVOnClick = "VimiumCClickable",
    kHook = "VimiumC",
    kCmd = "VC",
    kModToExposeSecret = 1e4,
    kRandStrLenInBuild = 7,
  }
  type ClickableEventDetail = [ inDocument: number[], forDetached: number[], fromAttrs: BOOL ] | string
/** Note: on Firefox, a `[sec, cmd]` can not be visited by the main world:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#Constructors_from_the_page_context.
 */
  // `high bits` mean secret, `lower bits >> kContentCmd.MaskedBitNumber` mean content cmd
  type CommandEventDetail = number;
  interface CustomEventCls {
    prototype: CustomEvent;
    new <Type extends InnerConsts & string>(typeArg: Type, eventInitDict?: { detail?:
      Type extends InnerConsts.kVOnClick ? ClickableEventDetail
        : Type extends InnerConsts.kCmd ? CommandEventDetail
        : never;
      composed?: boolean; }): CustomEvent;
  }
  interface DelegateEventCls {
    prototype: FocusEvent;
    new (typeArg: InnerConsts.kVOnClick | GlobalConsts.MarkAcrossJSWorlds
        , eventInitDict: Pick<FocusEventInit, "relatedTarget" | "composed">): FocusEvent;
  }

  const kVOnClick1 = InnerConsts.kVOnClick
    , outKMK = GlobalConsts.MarkAcrossJSWorlds
    , kHookRand = (outKMK + BuildStr.RandomClick) as InnerConsts.kHook
    , appInfo = OnChrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        ? !isTY((window as PartialOf<typeof globalThis, "queueMicrotask">).queueMicrotask, kTY.func)
          ? navigator.userAgent!.match(<RegExpOne & RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/) : 0 as const
        : [BrowserVer.Min$queueMicrotask]
    , tmpChromeVer: BrowserVer | 1 | 0 = OnChrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        ? appInfo && <BrowserVer> +appInfo[1] || 0
        : OnChrome ? 1 : 0
    , secret: string = ((math.random() * GlobalConsts.SecretRange + GlobalConsts.SecretBase) | 0) + ""
    , script = createElement_("script");
  let hook = function (event: Event): void {
    const t = (event as TypeToAssert<Event, DelegateEventCls["prototype"], "relatedTarget">).relatedTarget,
    S = InnerConsts.kSecretAttr;
    // use `instanceof` to require the `t` element is a new instance which has never entered this extension world
    if (++hookRetryTimes > GlobalConsts.MaxRetryTimesForSecret
        || !(t instanceof Element)) { return; }
    Stop_(event);
    if (t.localName !== "div" || attr_s(t as SafeElement, S) !== secret) { return }
    setupEventListener(0, kHookRand, hook, 1);
    hook = null as never;
    if (box == null) {
      setOrRemoveAttr_s(t as SafeElement, S)
      setupEventListener(t, kVOnClick1, onClick);
      box = t;
    }
  };
  function onClick(this: Element | Window, event: Event): void {
    Stop_(event)
    if (!box) { return; }
    const rawDetail = (
        event as TypeToAssert<Event, (CustomEventCls | DelegateEventCls)["prototype"], "detail">
        ).detail as ClickableEventDetail | null | undefined,
    isSafe = this === box,
    detail = rawDetail && isTY(rawDetail, kTY.obj) && isSafe ? rawDetail : "",
    fromAttrs: 0 | 1 | 2 = detail ? (detail[2] + 1) as 1 | 2 : 0;
    let path: typeof event.path,
    reHint = 0,
    target = detail ? null : (event as DelegateEventCls["prototype"]).relatedTarget as Element | null
        || (!OnEdge
            && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)
            ? event.path![0] as Element
            : (path = event.path) && path.length > 1 ? path[0] as Element : null)
    if (detail) {
      resolve(0, detail[0]); resolve(1, detail[1]);
    } else if (/* safer */ target
        && (isSafe && !rawDetail || +secret % InnerConsts.kModToExposeSecret + <string> target.tagName === rawDetail)) {
      clickable_.add(target);
    } else {
      if (!Build.NDEBUG && !isSafe && target
          && +secret % InnerConsts.kModToExposeSecret + <string> target.tagName !== rawDetail) {
        console.error("extend click: unexpected: detail =", rawDetail, target);
        return;
      }
    }
    if (!Build.NDEBUG && (++counterResolvePath <= 32
        || Math.floor(Math.log(counterResolvePath) / Math.log(1.414)) !==
           Math.floor(Math.log(counterResolvePath - 1) / Math.log(1.414)))) {
      console.log(`Vimium C: extend click: resolve ${detail ? "[%o + %o]" : "<%o>%s"} in %o @t=%o .`
        , detail ? detail[0].length
          : target && (isTY(target.localName) ? target.localName : (target as ElementWithToStr) + "")
        , detail ? detail[2] ? -0 : detail[1].length
          : (event as FocusEvent).relatedTarget ? " (detached)"
          : this === window ? " (path on window)" : " (path on box)"
        , loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/;]+\/?)(;[^\/]+)?$/, "$1")
        , getTime() % 3600000);
    }
    if (isFirstResolve & fromAttrs) {
      isFirstResolve ^= fromAttrs;
      coreHints.h - 1 || doesWantToReloadLinkHints("lo") && (reHint = 34)
    }
    if (coreHints.h > 1 && !reHint && hintOptions.autoReload && doesWantToReloadLinkHints("de")) {
      reHint = math.abs(getTime() - coreHints.h) < GlobalConsts.ExtendClick_DelayToStartIteration + 100
          ? InnerConsts.DelayForNext + 17 : 0
    }
    reHint && timeout_(coreHints.x, reHint)
  }
  const resolve = (isBox: BOOL, nodeIndexArray: number[]): void => {
    if (!nodeIndexArray.length) { return; }
    const list = (isBox ? box as Element : doc).getElementsByTagName("*");
    for (const index of nodeIndexArray) {
      let el = list[index];
      el && clickable_.add(el);
    }
  }
  const dispatchCmd = (cmd: SecondLevelContentCmds): void => {
    box && box.dispatchEvent(new (CustomEvent as CustomEventCls)(
        InnerConsts.kCmd, {
      detail: (+secret << kContentCmd.MaskedBitNumber) | cmd
    }));
  }
  const execute = (cmd: ValidContentCommands): void => {
    if (cmd < kContentCmd._minSuppressClickable) {
      isFirstResolve = 0;
      dispatchCmd(cmd as ValidContentCommands & ContentCommandsNotSuppress);
      return;
    }
    /** this function should keep idempotent */
    if (box) {
      setupEventListener(box, kVOnClick1, onClick, 1);
      setupEventListener(0, kVOnClick1, onClick, 1);
      dispatchCmd(kContentCmd.Destroy);
    }
    if (box == null && isFirstTime) {
      setupEventListener(0, kHookRand, hook, 1);
      if (cmd === kContentCmd.DestroyForCSP) {
        // normally, if here, must have: limited by CSP; not C or C >= MinEnsuredNewScriptsFromExtensionOnSandboxedPage
        // ignore the rare (unexpected) case that injected code breaks even when not limited by CSP,
        //     which might mean curCVer has no ES6...
        runJS_("`${" + outKMK + "=>" + secret + "}`")
      }
    }
    box = 0;
    vApi.e = null;
  }

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
    set_createElement_(doc.createElementNS.bind(doc, VTr(kTip.XHTML) as "http://www.w3.org/1999/xhtml"
        ) as typeof createElement_)
    isFirstTime != null && OnDocLoaded_(extendClick); // retry after a while, using a real <script>
    return
  }
  script.dataset.vimium = secret

  let box: Element | undefined | 0, hookRetryTimes = 0, counterResolvePath = 0,
  isFirstResolve: 0 | 1 | 2 | 3 | 4 = isTop ? 3 : 4

// #region injected code
  /** the `InnerVerifier` needs to satisfy
   * * never return any object (aka. keep void) if only "not absolutely safe"
   * * never change the global environment / break this closure
   * * must look like a real task and contain random string
   */
  interface InnerVerifier { (maybeSecret: string): void }
  let injected: string = (Build.NDEBUG ? VTr(isFirstTime ? kTip.extendClick : kTip.removeCurScript)
          : !isFirstTime && VTr(kTip.removeCurScript))
        || "'use strict';(" + (function VC(this: void): void {

type FUNC = (this: unknown, ...args: never[]) => unknown;
const V = /** verifier */ (maybeSecret: string): void | boolean => {
    I = GlobalConsts.MarkAcrossJSWorlds + BuildStr.RandomClick === maybeSecret
},
MayChrome = !!(Build.BTypes & BrowserType.Chrome),
MayEdge = !!(Build.BTypes & BrowserType.Edge), MayNotEdge = !!(Build.BTypes & ~BrowserType.Edge),
MayES5 = MayChrome && Build.MinCVer < BrowserVer.MinTestedES6Environment,
doc0 = document, curScript = doc0.currentScript as HTMLScriptElement,
sec = curScript.dataset.vimium!,
kAEL = "addEventListener", kToS = "toString", kProto = "prototype", kByTag = "getElementsByTagName",
ETP = EventTarget[kProto], _listen = ETP[kAEL],
toRegister: Element[] & { p (el: Element): void | 1; s: Element[]["splice"] } = [] as any,
_apply = _listen.apply, _call = _listen.call,
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
call = _call.bind(_call as any) as <T, A extends any[], R>(func: (this: T, ...a: A) => R, thisArg: T, ...args: A) => R,
dispatch = _call.bind<(this: (this: EventTarget, ev: Event) => boolean
    , self: EventTarget, evt: Event) => boolean>(ETP.dispatchEvent),
ElCls = Element, ElProto = ElCls[kProto],
Append = !MayChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
    ? ElProto.append! : ElProto.appendChild,
GetRootNode = ElProto.getRootNode,
Attr = ElProto.setAttribute, HasAttr = ElProto.hasAttribute, Remove = ElProto.remove,
StopProp = Event[kProto].stopImmediatePropagation as (this: Event) => void,
contains = ElProto.contains.bind(doc0), // in fact, it is Node::contains
nodeIndexListInDocument: number[] = [], nodeIndexListForDetached: number[] = [],
getElementsByTagNameInDoc = doc0[kByTag], getElementsByTagNameInEP = ElProto[kByTag],
IndexOf = _call.bind(toRegister.indexOf) as never as (list: HTMLCollectionOf<Element>, item: Element) => number,
push = (toRegister as { p (el: Element | number): void | number}).p = nodeIndexListInDocument.push,
pushInDocument = push.bind(nodeIndexListInDocument), pushForDetached = push.bind(nodeIndexListForDetached),
CECls = CustomEvent as CustomEventCls,
DECls = FocusEvent as DelegateEventCls,
FProto = Function[kProto], _toString = FProto[kToS],
listen = _call.bind<(this: (this: EventTarget,
          type: string, listener: EventListenerOrEventListenerObject, useCapture?: EventListenerOptions | boolean
        ) => 42 | void,
        self: EventTarget, name: string, listener: EventListenerOrEventListenerObject,
        opts?: EventListenerOptions | boolean
    ) => 42 | void>(_listen),
rEL = MayChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once
    ? removeEventListener : 0 as never as null, clearTimeout1 = clearTimeout,
kVOnClick = InnerConsts.kVOnClick,
kRand = BuildStr.RandomClick, kEventName2 = kVOnClick + kRand,
kReady = "readystatechange", kFunc = "function",
docCreateElement = doc0.createElement,
StringSplit = !Build.NDEBUG ? kReady.split : 0 as never, StringSubstr = kReady.substr,
checkIsNotVerifier = (func?: InnerVerifier | unknown): void | 42 => {
  if (!Build.NDEBUG && !verifierPrefixLen) {
    verifierLen = (verifierStrPrefix = call(_toString, V)).length,
    verifierPrefixLen = (verifierStrPrefix = call(StringSplit, verifierStrPrefix, sec)[0]).length
  }
  func && (func as InnerVerifier)(
        call(StringSubstr, call(_toString, func as InnerVerifier)
          , !Build.NDEBUG ? verifierPrefixLen!
                - (GlobalConsts.LengthOfMarkAcrossJSWorlds + InnerConsts.kRandStrLenInBuild)
              /** `16` is for {@see #BrowserVer.MinEnsured$Function$$toString$preservesWhitespace} */
              : MayES5 ? 16 : 7
          , GlobalConsts.LengthOfMarkAcrossJSWorlds + InnerConsts.kRandStrLenInBuild + GlobalConsts.SecretStringLength)
  )
}
const hooks = {
  toString: function toString(this: FUNC): string {
    const a = this, args = arguments;
    const str = call(_apply as (this: (this: FUNC, ...args: any[]) => string, self: FUNC, args: IArguments) => string,
        _toString, a, args)
    const mayStrBeToStr: boolean
        = str !== (myAELStr
                  || (myToStrStr = call(_toString, myToStr),
                      Build.NDEBUG
                      ? verifierStrPrefix = call(StringSubstr, call(_toString, V), 0
                        , GlobalConsts.LengthOfMarkAcrossJSWorlds + InnerConsts.kRandStrLenInBuild + (MayES5 ? 16 : 7))
                      : (verifierLen = (verifierStrPrefix = call(_toString, V)).length,
                        verifierPrefixLen = (verifierStrPrefix = call(StringSplit, verifierStrPrefix, sec)[0]).length),
                      myAELStr = call(_toString, myAEL)))
    args[0] === kMk + BuildStr.RandomClick && checkIsNotVerifier(args[1])
    detectDisabled && str === detectDisabled && executeCmd()
    return mayStrBeToStr && str !== myToStrStr
        ? str.length !== (!Build.NDEBUG ? verifierLen
              : GlobalConsts.LengthOfMarkAcrossJSWorlds + GlobalConsts.SecretStringLength + (MayES5 ? 22 : 13))
          || call(StringSubstr, str, 0, !Build.NDEBUG ? verifierPrefixLen! : GlobalConsts.LengthOfMarkAcrossJSWorlds
                  + InnerConsts.kRandStrLenInBuild + (MayES5 ? 16 : 7)) !== verifierStrPrefix
          ? str : call(_toString, noop)
        : a === myToStr || a === myAEL || (I = 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
          mayStrBeToStr ? call(a as any, noop, kMk + kRand, V) : (a as any)(kMk + kRand, noop, 0, V), I)
        ? call(_toString, mayStrBeToStr ? _toString : _listen) : str
  },
  addEventListener: function addEventListener(this: EventTarget, type: string
      , listener: EventListenerOrEventListenerObject): void {
    const a = this, args = arguments, len = args.length;
    const ret = type === GlobalConsts.MarkAcrossJSWorlds + BuildStr.RandomClick ? checkIsNotVerifier(args[3])
        : len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2] as EventListenerOptions)
        : call(_apply as (this: (this: EventTarget, ...args: any[]) => void, o: EventTarget, args: IArguments) => void,
             _listen as (this: EventTarget, ...args1: any[]) => void, a, args);
    if (type === "click" || type === "mousedown" || type === "dblclick"
        ? listener && a instanceof ElCls && a.localName !== "a"
        : type === kEventName2 && !isReRegistering
          // note: window.history is mutable on C35, so only these can be used: top,window,location,document
          && a && !(a as Window).window && (a as Node).nodeType === kNode.ELEMENT_NODE) {
      toRegister.p(a as Element);
      timer = timer || (queueMicroTask_(delayToStartIteration), 1);
    }
    return ret as void
  }
},
myAEL = (/*#__NOINLINE__*/ hooks)[kAEL], myToStr = (/*#__NOINLINE__*/ hooks)[kToS]

let doInit = (): void => {
  if (MayChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once) {
    doInit && rEL!(kReady, doInit, !0)
  }
  if (!detectDisabled) { return }
  detectDisabled = 0;
  // note: `HTMLCollection::operator []` can not be overridden by `Object.defineProperty` on C32/83
  const docEl2 = MayEdge ? (docChildren as Extract<typeof docChildren, Function>)(0)
      : (docChildren as Exclude<typeof docChildren, Function>)[0] as Element | null,
  el = call(docCreateElement, doc0, "div") as HTMLDivElement,
  S = InnerConsts.kSecretAttr;
  if (MayChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once) {
    doInit = null as never
  }
  docChildren = null as never;
  if (!docEl2) { return executeCmd(); }
  call(Attr, el, S, sec);
  listen(el, InnerConsts.kCmd, executeCmd, !0);
  dispatch(window, new DECls((kMk + kRand) as typeof kMk, {relatedTarget: el}));
  if (call(HasAttr, el, S)) {
    executeCmd();
  } else {
    root = el;
    timer = toRegister.length > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0;
  }
},
/** kMarkToVerify */ kMk = GlobalConsts.MarkAcrossJSWorlds as const,
detectDisabled: string | 0 = kMk + "=>" + sec,
myAELStr: string | undefined, myToStrStr: string | undefined,
verifierStrPrefix: string | undefined, verifierPrefixLen: number | undefined, verifierLen: number | undefined,
/** verifierIsLastMatched */ I: BOOL | boolean | undefined,
// here `setTimeout` is normal and will not use TimerType.fake
setTimeout_ = setTimeout as SafeSetTimeout,
docChildren: Document["children"] | ((index: number) => Element | null) = doc0.children,
unsafeDispatchCounter = 0,
allNodesInDocument = null as HTMLCollectionOf<Element> | null,
allNodesForDetached = null as HTMLCollectionOf<Element> | null,
root: HTMLDivElement, timer = setTimeout_(doInit, InnerConsts.DelayToWaitDomReady),
queueMicroTask_: (callback: () => void) => void =
    MayEdge || MayChrome && Build.MinCVer < BrowserVer.Min$queueMicrotask
    ? MayNotEdge ? (window as PartialOf<typeof globalThis, "queueMicrotask">).queueMicrotask! : 0 as never
    : queueMicrotask,
isReRegistering: BOOL | boolean = 0
// To avoid a host script detect Vimum C by code like:
// ` a1 = setTimeout(()=>{}); $0.addEventListener('click', ()=>{}); a2=setTimeout(()=>{}); [a1, a2] `
const delayToStartIteration = (): void => { setTimeout_(next, GlobalConsts.ExtendClick_DelayToStartIteration) }
const next = (): void => {
  const len = toRegister.length,
  start = len > (Build.NDEBUG ? InnerConsts.MaxElementsInOneTickRelease : InnerConsts.MaxElementsInOneTickDebug)
    ? len - (Build.NDEBUG ? InnerConsts.MaxElementsInOneTickRelease : InnerConsts.MaxElementsInOneTickDebug) : 0,
  delta = len - start;
  timer = start > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0;
  if (!len) { return; }
  call(Remove, root); // just safer
  // skip some nodes if only crashing, so that there would be less crash logs in console
  const slice = toRegister.s(start, delta);
  for (let i = unsafeDispatchCounter = 0; i < slice.length; i++) {
    prepareRegister(slice[i]); // avoid for-of, in case Array::[[Symbol.iterator]] was modified
  }
  doRegister(0);
  allNodesInDocument = allNodesForDetached = null;
}
const prepareRegister = (element: Element): void => {
  if (contains(element)) {
    pushInDocument(
      IndexOf(allNodesInDocument = allNodesInDocument || call(getElementsByTagNameInDoc, doc0, "*")
        , element));
    return;
  }
  // here element is inside a #shadow-root or not connected
  const doc1 = element.ownerDocument;
  // in case element is <form> / <frameset> / adopted into another document, or aEL is from another frame
  if (doc1 !== doc0) {
    // although on Firefox element.__proto__ is auto-updated when it is adopted
    // but aEl may be called before real insertion
    if ((!MayChrome || Build.MinCVer >= BrowserVer.MinFramesetHasNoNamedGetter || (doc1 as WindowWithTop).top !== top)
        && (doc1 as Exclude<typeof doc1, Window>).nodeType === kNode.DOCUMENT_NODE
        && (doc1 as Document).defaultView) {
      // just smell like a Document
      /*#__NOINLINE__*/
      safeReRegister(element, doc1 as Document);
    } // `defaultView` is to check whether element is in a DOM tree of a real frame
    // Note: on C72, ownerDocument of elements under <template>.content
    // is a fake "about:blank" document object
    return;
  }
  let parent: Node | RadioNodeList | null | undefined, tempParent: Node | RadioNodeList | null | undefined;
  if (!MayEdge && (!MayChrome || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode) || GetRootNode) {
    parent = call(GetRootNode!, element);
  } else {
    // according to tests and source code, the named getter for <frameset> requires <frame>.contentDocument is valid
    // so here pe and pn will not be Window if only ignoring the case of `<div> -> #shadow-root -> <frameset>`
    let kValue = "value", curEl: Element | null = element;
    for (;  parent     = curEl.parentNode    as Exclude<Element["parentNode"],    Window>
          , tempParent = curEl.parentElement as Exclude<Element["parentElement"], Window>
        ; curEl = tempParent as Element) {
      // here skips more cases than an "almost precise" solution, but it is enough
      if (tempParent !== parent && kValue in tempParent) {
        if (!parent || parent.nodeType !== kNode.ELEMENT_NODE) { break; }
        if (kValue in parent) { return; }
        tempParent = parent as Element;
      }
    }
    parent = parent || curEl;
  }
  // Document::nodeType is not changable (except overridden by an element like <img>), so the comparsion below is safe
  let type = parent.nodeType, s: Element["tagName"];
  // note: the below may change DOM trees,
  // so `dispatch` MUST NEVER throw. Otherwise a page might break
  if (type === kNode.ELEMENT_NODE) {
    parent !== root && call(Append, root, parent as Element);
    pushForDetached(
      IndexOf(allNodesForDetached = allNodesForDetached || call(getElementsByTagNameInEP, root, "*")
        , element));
  // Note: ignore the case that a plain #document-fragment has a fake .host
  }
  else if (type !== kNode.DOCUMENT_FRAGMENT_NODE) { /* empty */ }
  else if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick - 2) {
    if (MayNotEdge && (tempParent = (parent as TypeToAssert<DocumentFragment, ShadowRoot, "host">).host)) {
      parent = (!MayEdge && (!MayChrome || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode) || GetRootNode)
          && (tempParent as NonNullable<ShadowRoot["host"]>).shadowRoot // an open shadow tree
          && call(GetRootNode!, element, {composed: !0});
      if (parent && (parent === doc0 || (<NodeToElement> parent).nodeType === kNode.ELEMENT_NODE)
          && typeof (s = element.tagName) === "string") {
        parent !== doc0 && parent !== root && call(Append, root, parent);
        unsafeDispatchCounter++;
        dispatch(element, new CECls(kVOnClick, {detail: +sec % InnerConsts.kModToExposeSecret + s, composed: !0}))
      }
    } else {
      unsafeDispatchCounter++;
      dispatch(root, new DECls(kVOnClick, {relatedTarget: element}));
    }
  } else {
      toRegister.p(element);
      if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick + 1) {
        unsafeDispatchCounter = InnerConsts.MaxUnsafeEventsInOneTick + 1; // a fake value to run it only once a tick
        clearTimeout1(timer);
        timer = setTimeout_(next, InnerConsts.DelayForNextComplicatedCase);
      }
  }
}
const doRegister = (fromAttrs: BOOL): void => {
  if (nodeIndexListInDocument.length + nodeIndexListForDetached.length) {
    unsafeDispatchCounter++
    dispatch(root, new CECls(kVOnClick, { detail: [nodeIndexListInDocument, nodeIndexListForDetached, fromAttrs] }))
  }
  nodeIndexListInDocument.length = nodeIndexListForDetached.length = 0
// check lastChild, so avoid a mutation scope created in
// https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/dom/node.cc;l=2117;drc=06e052d21baaa5afc7c851ed43c6a90e53dc6156
  root.textContent = "";
}
const safeReRegister = (element: Element, doc1: Document): void => {
  const localAEL = doc1[kAEL], localREL = doc1.removeEventListener;
  if (typeof localAEL == kFunc && typeof localREL == kFunc && localAEL !== myAEL) {
    isReRegistering = 1;
    try {
      // Note: here may break in case .addEventListener is an <embed> or overridden by host code
      call(localAEL, element, kEventName2, noop);
    } catch {}
    try {
      call(localREL, element, kEventName2, noop);
    } catch {}
    isReRegistering = 0;
  }
}
const executeCmd = (eventOrDestroy?: Event): void => {
  const detail: CommandEventDetail = eventOrDestroy && (eventOrDestroy as CustomEvent).detail,
  cmd: SecondLevelContentCmds | kContentCmd._fake = detail
      ? (detail >> kContentCmd.MaskedBitNumber) === +sec ? detail & ((1 << kContentCmd.MaskedBitNumber) - 1)
        : kContentCmd._fake
      : eventOrDestroy ? kContentCmd._fake : kContentCmd.Destroy;
  // always stopProp even if the secret does not match, so that an attacker can not detect secret by enumerating numbers
  detail && call(StopProp, eventOrDestroy!);
  let len: number, i: number, tag: Element["localName"]
  if (cmd < kContentCmd._minSuppressClickable) {
    if (!cmd || !root) { return; }
    call(Remove, root);
    allNodesInDocument = call(getElementsByTagNameInDoc, doc0, "*");
    len = allNodesInDocument.length, i = unsafeDispatchCounter = 0
    len = len < GlobalConsts.MinElementCountToStopScanOnClick || cmd === kContentCmd.ManuallyFindAllOnClick
        ? len : 0; // stop it
    for (; i < len; i++) {
      const el: Element | HTMLElement = allNodesInDocument[i];
      if (((el as HTMLElement).onclick || (el as HTMLElement).onmousedown) && !call(HasAttr, el, "onclick")
          && (tag = el.localName) !== "a" && tag !== "button") { // ignore <button>s to iter faster
        pushInDocument(i);
      }
    }
    doRegister(1);
    allNodesInDocument = null;
    return;
  }
  toRegister.length = detectDisabled = 0;
  toRegister.p = setTimeout_ = noop;
  root = null as never;
  clearTimeout1(timer);
  timer = 1;
}
const noop = (): 1 => { return 1 }

if (!MayNotEdge
    || (MayEdge || MayChrome && Build.MinCVer < BrowserVer.Min$queueMicrotask) && typeof queueMicroTask_ !== kFunc) {
  if (MayChrome && Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
    const promise_ = Promise
    queueMicroTask_ = (promise_.resolve ? promise_.resolve() : promise_.resolved!()) as any
  } else {
    queueMicroTask_ = Promise.resolve() as any
  }
  queueMicroTask_ = (queueMicroTask_ as any as Promise<void>).then.bind(queueMicroTask_ as any as Promise<void>);
}
if (MayEdge) {
  docChildren = docChildren.item.bind(docChildren)
}
toRegister.s = toRegister.splice;
// only the below can affect outsides
curScript.remove();
ETP[kAEL] = myAEL;
if (MayChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once) {
  _listen(kReady, doInit, !0);
} else {
  _listen(kReady, doInit, {capture: !0, once: !0});
}
FProto[kToS] = myToStr

      }).toString() + ")();" /** need "toString()": {@link ../scripts/dependencies.js#patchExtendClick} */

// #endregion injected code

  if (isFirstTime) {
    if (!Build.NDEBUG && readyState_ === "complete") {
      alert("Vimium C: Error! should not run extend_click twice")
      return
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
        && tmpChromeVer >= BrowserVer.MinEnsuredES6MethodFunction) {
      injected = injected.replace(<RegExpG> /: ?function \w+/g, "");
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6ArrowFunction
        && tmpChromeVer < BrowserVer.MinEnsuredES6ArrowFunction) {
      injected = injected.replace(<RegExpG> (Build.Minify ? /\(([\w,]*\))=>/g : /\(([\w, ]*\))=>/g), "function($1")
    }
    injected = injected.replace("" + BuildStr.RandomClick, `$&${secret}`)
    vApi.e = execute;
    setupEventListener(0, kHookRand, hook);
    setupEventListener(0, kVOnClick1, onClick);
  }
  /**
   * According to `V8CodeCache::ProduceCache` and `V8CodeCache::GetCompileOptions`
   *     in third_party/blink/renderer/bindings/core/v8/v8_code_cache.cc,
   *   and ScriptController::ExecuteScriptAndReturnValue
   *     in third_party/blink/renderer/bindings/core/v8/script_controller.cc,
   * inlined script are not cached for `v8::ScriptCompiler::kNoCacheBecauseInlineScript`.
   * But here it still uses the same script, just for my personal preference.
   */
  runJS_(injected, script)
  script.dataset.vimium = "";
  if (!(Build.NDEBUG
        || BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage <= BrowserVer.NoRAFOrRICOnSandboxedPage)) {
    console.log("Assert error: Warning: may no timer function on sandbox page!");
  }
  if (OnChrome && Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
      && tmpChromeVer === BrowserVer.NoRAFOrRICOnSandboxedPage) {
    set_noRAF_old_cr_(1)
    rAF_((): void => { set_noRAF_old_cr_(0) })
  }
  // not check MinEnsuredNewScriptsFromExtensionOnSandboxedPage
  // for the case JavaScript is disabled in CS: https://github.com/philc/vimium/issues/3187
  if (!parentNode_unsafe_s(script)) { // It succeeded in hooking.
    // wait the inner listener of `start` to finish its work
    OnDocLoaded_((): void => {
      // only for new versions of Chrome (and Edge);
      // CSP would block a <script> before MinEnsuredNewScriptsFromExtensionOnSandboxedPage
      // if !box, avoid checking isFirstTime, so that auto clean VApi.execute_
      !box ? execute(kContentCmd.DestroyForCSP) : isFirstTime && isAlive_ &&
      OnDocLoaded_(timeout_.bind(null, (): void => {
        isFirstResolve && dispatchCmd(kContentCmd.AutoFindAllOnClick);
        isFirstResolve = 0;
      }, GlobalConsts.ExtendClick_DelayToFindAll), 1);
    });
    return
  }
  // else: CSP script-src before C68, CSP sandbox before C68 or JS-disabled-in-CS on C/E
  removeEl_s(script)
  execute(kContentCmd.Destroy);
  if (!OnChrome) {
    // on Edge (EdgeHTML), `setTimeout` and `requestAnimationFrame` work well
    return;
  }
  // ensured on Chrome
  recordLog(kTip.logNotWorkOnSandboxed)
  if (Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage
      && tmpChromeVer && tmpChromeVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage) {
    safeDestroy(1)
  } else {
    /*#__INLINE__*/ setupBackupTimer_cr()
  }
})(grabBackFocus as boolean)
} : 0 as never) as () => void

if (!(Build.NDEBUG || BrowserVer.Min$queueMicrotask >= BrowserVer.NoRAFOrRICOnSandboxedPage
    && BrowserVer.Min$queueMicrotask >= BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
    && BrowserVer.Min$queueMicrotask >= BrowserVer.MinEnsuredES6MethodFunction
    && BrowserVer.Min$queueMicrotask >= BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)) {
  alert(`Assert error: missing chrome version detection before ${BrowserVer.Min$queueMicrotask}`)
}
