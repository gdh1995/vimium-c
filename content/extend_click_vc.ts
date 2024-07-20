"use strict";
Build.MV3 && Build.BTypes & BrowserType.Chrome && (function VC(this: void, delayed?: 1): void {
  const enum InnerConsts {
    MaxElementsInOneTickDebug = 1024,
    MaxElementsInOneTickRelease = 512,
    MaxUnsafeEventsInOneTick = 12,
    DelayToWaitDomReady = 1000,
    DelayForNext = 36,
    DelayForNextComplicatedCase = 1,
    TimeoutOf3rdPartyFunctionsCache = 1e4, // 10 seconds
    SignalDocOpen = -3,
    SignalDocWrite = -4,
    OffsetForBoxChildren = -8,
    kSecretAttr = "data-vimium",

    kVOnClick = "VimiumCClickable",
    kHook = "VimiumC",
    kCmd = "VC",
    kModToExposeSecret = 1e4,
    kRandStrLenInBuild = 7,
  }
  type ClickableEventDetail = [ inDocument: number[], fromAttrs: BOOL, originalDocHref?: string ] | string
  type CommandEventDetail = 42 | -42
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
  interface InnerVerifier { (maybeSecret: string): void }

type FUNC = (this: unknown, ...args: never[]) => unknown;
type OnEventSetter = (this: HTMLElement, handler: (this: HTMLElement, event: MouseEventToPrevent) => unknown) => void
const V = /** verifier */ (maybeSecret: string): void | boolean => {
    I = GlobalConsts.MarkAcrossJSWorlds + Build.RandomClick === maybeSecret
},
doc0 = document, SetProp = Object.setPrototypeOf as <T extends object>(object: T, proto: null) => T,
kAEL = "addEventListener", kToS = "toString", kProto = "prototype", kByTag = "getElementsByTagName",
ETP = EventTarget[kProto], _listen = ETP[kAEL],
toRegister: Element[] = [],
_call = _listen.call,
apply = Reflect!.apply as <T, A extends any[], R>(func: (this: T, ...a: A) => R, thisArg: T, args: A | IArguments) => R,
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
call = _call.bind(_call as any) as <T, A extends any[], R>(func: (this: T, ...a: A) => R, thisArg: T, ...args: A) => R,
_dispatch = ETP.dispatchEvent,
HtmlElProto = HTMLElement[kProto], ElCls = Element, ElProto = ElCls[kProto],
Append = ElProto.append!, GetAttr = ElProto.getAttribute,
Remove = ElProto.remove,
getElementsByTagNameInEP = ElProto[kByTag],
nodeIndexList: number[] = [], Slice = (nodeIndexList as unknown[] as Element[]).slice,
IndexOf = _call.bind(nodeIndexList.indexOf) as <T>(list: ArrayLike<T>, item: T) => number,
forEach = nodeIndexList.forEach as <T> (this: T[], callback: (item: T, index: number) => unknown) => void,
splice = nodeIndexList.splice as <T> (this: T[], start: number, deleteCount?: number) => T[],
pushInDocument = nodeIndexList.push.bind(nodeIndexList),
CECls = CustomEvent as CustomEventCls, StopProp = CECls[kProto].stopImmediatePropagation as (this: Event) => void,
DECls = FocusEvent as DelegateEventCls,
Func = Function, FProto = Func[kProto], _toString = FProto[kToS],
clearTimeout1 = clearTimeout,
DocCls = Document[kProto] as Partial<Document> as Pick<Document, "createElement" | typeof kByTag> & {
      open (): void, write (markup: string): void },
getElementsByTagNameInDoc = DocCls[kByTag],
OwnProp = Object.getOwnPropertyDescriptor,
relatedTargetGetter = Build.BTypes & BrowserType.Chrome
    ? OwnProp(DECls[kProto], "relatedTarget"
      )!.get as (this: FocusEvent) => EventTarget | null : 0 as never as null,
kOC = InnerConsts.kVOnClick, kRC = "" + Build.RandomClick, kEventName2 = kOC + kRC,
StringSplit = !(Build.NDEBUG && Build.Mangle) ? "".split : 0 as never, StringSlice = kEventName2.slice,
checkIsNotVerifier = (func?: InnerVerifier | unknown): void | 42 => {
  if (!(Build.NDEBUG && Build.Mangle) && !verifierPrefixLen) {
    verifierLen = (verifierStrPrefix = call(_toString, V)).length,
    verifierPrefixLen = (verifierStrPrefix = call(StringSplit, verifierStrPrefix, kRC)[0]).length
  }
  func && (func as InnerVerifier)(
        call(StringSlice, call(_toString, func as InnerVerifier)
          , Build.NDEBUG && Build.Mangle ? 7 : verifierPrefixLen! - GlobalConsts.LengthOfMarkAcrossJSWorlds
          , (Build.NDEBUG && Build.Mangle ? 7 : verifierPrefixLen! - GlobalConsts.LengthOfMarkAcrossJSWorlds)
            + GlobalConsts.LengthOfMarkAcrossJSWorlds + InnerConsts.kRandStrLenInBuild)
  )
},
enqueue = (a: Element, listener: any): void => {
  if (typeof listener === "function" && a.localName !== "a") {
    pushToRegister(a as Element)
    timer = timer || (queueMicroTask_(delayToStartIteration), 1);
  }
},
hooks = {
  toString (this: FUNC): string {
    const a = this, args = arguments, hookedInd = IndexOf(hookedFuncs, a)
    const str = apply(_toString, hookedInd < 0 ? a : hookedFuncs[hookedInd - 1], args)
    const mayStrBeToStr: boolean
        = str !== (myAELStr
                  || (myToStrStr = call(_toString, myToStr),
                      Build.NDEBUG && Build.Mangle
                      ? verifierStrPrefix = call(StringSlice, call(_toString, V), 0
                          , GlobalConsts.LengthOfMarkAcrossJSWorlds + 7)
                      : (verifierLen = (verifierStrPrefix = call(_toString, V)).length,
                         verifierPrefixLen = (verifierStrPrefix = call(StringSplit, verifierStrPrefix, kRC)[0]).length),
                      myAELStr = call(_toString, myAEL)))
    args.length === 2 && args[0] === GlobalConsts.MarkAcrossJSWorlds && checkIsNotVerifier(args[1])
    return mayStrBeToStr && str !== myToStrStr
        ? str.length !== (!(Build.NDEBUG && Build.Mangle) ? verifierLen
              : GlobalConsts.LengthOfMarkAcrossJSWorlds + InnerConsts.kRandStrLenInBuild + 13)
          || call(StringSlice, str, 0
                , Build.NDEBUG && Build.Mangle ? GlobalConsts.LengthOfMarkAcrossJSWorlds + 7 : verifierPrefixLen!
              ) !== verifierStrPrefix
          ? str : call(_toString, noop)
        : (I = 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
          mayStrBeToStr ? call(a as any, noop, kMk, V) : (a as any)(kMk, noop, 0, V), I)
        ? call(_toString, mayStrBeToStr ? _toString : _listen) : str
  },
  addEventListener (this: EventTarget, type: string
      , listener: EventListenerOrEventListenerObject): void {
    let a = this, args = arguments
    // bing.com and google.com add lots of touch and wheel event listeners
    const useEval = typeof type === "string" && type < "DOMSv" && (type > "DOMCi" ? type > "DOMNo" : type > "DOMCh")
    useEval && tryEval && tryEval()
    const ret = args.length === 4 && type === GlobalConsts.MarkAcrossJSWorlds ? checkIsNotVerifier(args[3])
        : useEval && evaledAEL ? evaledAEL(apply, [_listen, a, args]) : apply(_listen, a, args)
    if (type === "click" || type === "mousedown" || type === "pointerdown" || type === "dblclick"
        ? listener && a instanceof ElCls && a.localName !== "a" && a !== toRegister[toRegister.length - 1]
        : type === kEventName2 && !isReRegistering
          // note: window.history is mutable on C35, so only these can be used: top,window,location,document
          && a && !(a as Window).window && (a as Node).nodeType === kNode.ELEMENT_NODE) {
      enqueue(a as Element, listener)
    }
    return ret as void
  }
},
myAEL = (/*#__NOINLINE__*/ hooks)[kAEL], myToStr = (/*#__NOINLINE__*/ hooks)[kToS],
hookedFuncs = [0 as never as OnEventSetter, 0 as never as Function, 0 as never as OnEventSetter, 0 as never as Function
    , _listen, myAEL, _toString, myToStr] as const

let root = doc0.createElement("div"), timer = 1,
/** kMarkToVerify */ kMk = GlobalConsts.MarkAcrossJSWorlds as const,
myAELStr: string | undefined, myToStrStr: string | undefined,
verifierStrPrefix: string | undefined, verifierPrefixLen: number | undefined, verifierLen: number | undefined,
/** verifierIsLastMatched */ I: BOOL | boolean | undefined,
getRootNode = (_call.bind(ElProto.getRootNode!)) as never as {
  (self: Node, options?: { composed?: boolean }): Node },
kGetComposedRoot = SetProp({ composed: !0 }, null),
// here `setTimeout` is normal and will not use TimerType.fake
setTimeout_ = setTimeout as SafeSetTimeout,
unsafeDispatchCounter = 0,
allNodesInDocument = null as Element[] | null, allNodesForDetached = null as Element[] | null,
pushToRegister = (nodeIndexList as unknown[] as Element[]).push.bind(toRegister),
queueMicroTask_ = queueMicrotask,
evaledAEL: Function | undefined,
isReRegistering: BOOL = 0, hasKnownDocOpened: 0 | 1 | 2 = 0
let tryEval: (() => void) | 0 = ("." + location.host).endsWith(".bing.com") ? 0 : (): void => {
  try { evaledAEL = new Func(`let ${kAEL}=(f,a)=>f(...a)\nreturn ` + kAEL)(tryEval = 0) } catch {}
}
// To avoid a host script detect Vimum C by code like:
// ` a1 = setTimeout(()=>{}); $0.addEventListener('click', ()=>{}); a2=setTimeout(()=>{}); [a1, a2] `
const delayToStartIteration = (): void => { timer = setTimeout_(next, GlobalConsts.ExtendClick_DelayToStartIteration) }
const next: (_unused?: unknown) => void = (): void => {
  const len = toRegister.length,
  start = len > (Build.NDEBUG ? InnerConsts.MaxElementsInOneTickRelease : InnerConsts.MaxElementsInOneTickDebug)
    ? len - (Build.NDEBUG ? InnerConsts.MaxElementsInOneTickRelease : InnerConsts.MaxElementsInOneTickDebug) : 0
  timer = start && setTimeout_(next, InnerConsts.DelayForNext)
  if (!len) { return; }
  call(Remove, root); // just safer
  // skip some nodes if only crashing, so that there would be less crash logs in console
  unsafeDispatchCounter = 0
  apply(forEach, apply(splice, toRegister, [start, len - start]), [prepareRegister])
  doRegister(0);
}
const safeDispatch_ = <Cls extends CustomEventCls | DelegateEventCls> (
    cls: Cls, data: Cls extends new (type: infer _, init: infer B) => any ? B : never, target?: Element): void => {
  apply(_dispatch, target || root, [new cls(kOC, SetProp(data as object, null))])
}
const prepareRegister = (element: Element): void => {
  if (getRootNode(element) === doc0) {
    pushInDocument(
      IndexOf(allNodesInDocument = allNodesInDocument || call(Slice, call(getElementsByTagNameInDoc, doc0, "*"))
        , element));
    return;
  }
  // here element is inside a #shadow-root or not connected
  const doc1 = element.ownerDocument;
  // in case element is <form> / <frameset> / adopted into another document, or aEL is from another frame
  if (doc1 !== doc0) {
    if ((doc1 as Exclude<typeof doc1, Window>).nodeType === kNode.DOCUMENT_NODE
        && (doc1 as Document).defaultView) {
      // just smell like a Document
      /*#__NOINLINE__*/
      safeReRegister(element, doc1 as Document);
    } // `defaultView` is to check whether element is in a DOM tree of a real frame
    // Note: on C72, ownerDocument of elements under <template>.content
    // is a fake "about:blank" document object
    return;
  }
  let parent: Node | null | undefined = getRootNode(element), tempParent: Node | RadioNodeList | null | undefined
  // Document::nodeType is not changable (except overridden by an element like <img>), so the comparsion below is safe
  let type = parent.nodeType, s: Element["tagName"];
  // note: the below may change DOM trees,
  // so `dispatch` MUST NEVER throw. Otherwise a page might break
  if (type === kNode.ELEMENT_NODE) {
    parent !== root && call(Append, root, parent as Element);
    pushInDocument(InnerConsts.OffsetForBoxChildren -
      IndexOf(allNodesForDetached = allNodesForDetached || call(Slice, call(getElementsByTagNameInEP, root, "*"))
        , element));
  // Note: ignore the case that a plain #document-fragment has a fake .host
  }
  else if (type !== kNode.DOCUMENT_FRAGMENT_NODE) { /* empty */ }
  else if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick - 2) {
    if (tempParent = (parent as TypeToAssert<DocumentFragment, ShadowRoot, "host">).host) {
      parent = (tempParent as NonNullable<ShadowRoot["host"]>).shadowRoot // an open shadow tree
          && getRootNode(element, kGetComposedRoot)
      if (parent && (parent === doc0 || (<NodeToElement> parent).nodeType === kNode.ELEMENT_NODE)
          && typeof (s = element.tagName) === "string") {
        parent !== doc0 && parent !== root && call(Append, root, parent);
        unsafeDispatchCounter++;
        safeDispatch_(CECls, {detail: Build.RandomClick % InnerConsts.kModToExposeSecret + s, composed: !0}, element)
      }
    } else {
      unsafeDispatchCounter++;
      safeDispatch_(DECls, { relatedTarget: element })
    }
  } else {
      pushToRegister(element)
      if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick + 1) {
        unsafeDispatchCounter = InnerConsts.MaxUnsafeEventsInOneTick + 1; // a fake value to run it only once a tick
        clearTimeout1(timer);
        timer = setTimeout_(next, InnerConsts.DelayForNextComplicatedCase);
      }
  }
}
const doRegister: (fromAttrs: BOOL, _unused?: number) => void = (fromAttrs: BOOL): void => {
  if (nodeIndexList.length) {
    unsafeDispatchCounter++
    safeDispatch_(CECls, { detail: [nodeIndexList, fromAttrs] })
    nodeIndexList.length = 0
  }
  allNodesInDocument = allNodesForDetached = null
}
const safeReRegister = (element: Element, doc1: Document): void => {
  const localAEL = doc1[kAEL], localREL = doc1.removeEventListener, F = "function"
  if (typeof localAEL == F && typeof localREL == F && localAEL !== myAEL) {
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
  const detail = eventOrDestroy && root && +call(GetAttr, root, InnerConsts.kSecretAttr)! as CommandEventDetail | 0,
  cmd: SecondLevelContentCmds | kContentCmd._fake = detail
      ? (detail >> kContentCmd.MaskedBitNumber) === Build.RandomClick
        ? detail & ((1 << kContentCmd.MaskedBitNumber) - 1) : kContentCmd._fake
      : eventOrDestroy ? kContentCmd._fake : kContentCmd.Destroy;
  // always stopProp even if the secret does not match, so that an attacker can not detect secret by enumerating numbers
  detail && call(StopProp, eventOrDestroy!);
  if (cmd < kContentCmd._minSuppressClickable) {
    if (Build.BTypes & BrowserType.Chrome && cmd > kContentCmd.ShowPicker_cr_mv3 - 1) {
      // not hook showPicker - it seems not needed
      (call(relatedTargetGetter!, eventOrDestroy as FocusEvent) as HTMLInputElement | HTMLSelectElement).showPicker!()
    } else {
      next(clearTimeout1(timer)) // lgtm [js/superfluous-trailing-arguments]
    }
    return;
  }
  root = (toRegister.length = 0) as never
  pushToRegister = setTimeout_ = noop
  timer = 1
}
const onDocOpen = (isWrite?: 0 | 2, oriHref?: string): void => {
  if (hasKnownDocOpened === 1) {
    hasKnownDocOpened = 0
    if (Build.NDEBUG) {
      root && doRegister(0, pushInDocument(InnerConsts.SignalDocOpen)) // lgtm [js/superfluous-trailing-arguments]
    } else if (root) {
      safeDispatch_(CECls, { detail: [
        [isWrite ? InnerConsts.SignalDocWrite : InnerConsts.SignalDocOpen as number]
      , 0, oriHref] })
    }
  }
}
const noop = (): 1 => { return 1 }
const docEl = doc0.documentElement;
const defineProp = Object.defineProperty, dbgLoc = Build.NDEBUG ? null as never : location
const dataset = (root as Element as TypeToAssert<Element, HTMLElement, "dataset", "tagName">).dataset
if (!docEl || (Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinCSAcceptWorldInManifest)
    && delayed && !(!docEl.lastChild && docEl.parentNode === doc0)) {
    return
}
if (dataset && (
  dataset.vimium = kRC,

// only the below can affect outsides

  _dispatch(new DECls(kOC, {relatedTarget: root})),
  !dataset.vimium
)) {
  root[kAEL](InnerConsts.kCmd, executeCmd, !0)
  timer = toRegister.length > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0
  ETP[kAEL] = myAEL
  FProto[kToS] = myToStr
  for (let i of [0, 2] as const) { /*#__ENABLE_SCOPED__*/
    let propName: "onmousedown" | "onclick" | "open" | "write" = i ? "onmousedown" : "onclick"
    const setterName = ("set " + propName) as `set ${typeof propName}`
    const proxy = {
      [setterName] (this: HTMLElement, val: (this: HTMLElement, event: MouseEventToPrevent) => unknown): void {
        call(hookedFuncs[i], this, val); val && enqueue(this, val)
      }
    }
    const propDesc = OwnProp(HtmlElProto, propName)!
    ; (hookedFuncs as Writable<typeof hookedFuncs>)[i] = propDesc.set as OnEventSetter
    ; (hookedFuncs as Writable<typeof hookedFuncs>)[i + 1] = propDesc.set = proxy[setterName]
    defineProp(HtmlElProto, propName, propDesc)
    let _docFunc = DocCls[propName = i ? "write" : "open"]
    defineProp(DocCls, propName, {
      enumerable: true, configurable: true,
      set (newDocFunc) { _docFunc = newDocFunc },
      get () {
        const oriHref = Build.NDEBUG ? "" : dbgLoc.host && dbgLoc.pathname || dbgLoc.href
        if (doc0.readyState > "l") {
          if (hasKnownDocOpened === 1) {
            Build.NDEBUG ? onDocOpen() : onDocOpen(i, oriHref)
            hasKnownDocOpened = 2
          }
        } else if (hasKnownDocOpened !== 1) {
          hasKnownDocOpened = 1
          queueMicroTask_(Build.NDEBUG ? onDocOpen : () => { onDocOpen(i, oriHref) })
        }
        return _docFunc
      }
    })
  }
} else if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinCSAcceptWorldInManifest) && !delayed) {
  const listenOpt: EventListenerOptions = { capture: true, once: true }
  const postStart = (event: EventToPrevent): void => {
    queueMicroTask_((): void => VC(1))
    call(StopProp, event)
  }
  _listen(kOC, postStart, listenOpt)
  _listen("readystatechange", removeEventListener.bind(window, kOC, postStart, listenOpt), listenOpt)
}

})()
