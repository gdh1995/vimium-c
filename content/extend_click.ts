import {
  clickable_, setupEventListener, timeout_, doc, isAlive_, set_noRAF_old_cr_, math, isTop, OnChrome, readyState_,
  loc_, getTime, recordLog, VTr, vApi, Stop_, isTY, OnEdge, abs_, isEnabled_, clearTimeout_, fgCache, queueTask_
} from "../lib/utils"
import {
  createElement_, set_createElement_, OnDocLoaded_, runJS_, rAF_, removeEl_s, dispatchEvent_, HTMLElementProto,
  parentNode_unsafe_s, onReadyState_, getEventPath, appendNode_s, htmlTag_, setOrRemoveAttr_s, attr_s
} from "../lib/dom_utils"
import { HookAction, hookOnWnd, safeDestroy, setupBackupTimer_cr } from "./port"
import { coreHints, doesWantToReloadLinkHints, hintOptions, reinitLinkHintsIn } from "./link_hints"
import { grabBackFocus, insertInit } from "./insert"

export const ec_main_not_ff = (Build.BTypes !== BrowserType.Firefox as number ? (): void => {
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
/** Note: on Firefox, a `[sec, cmd]` can not be visited by the main world:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#Constructors_from_the_page_context.
 */
  // `high bits >> kContentCmd.MaskedBitNumber` mean secret, `lower bits` mean content cmd
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

  const kInjectManually = !Build.MV3 || (!!(Build.BTypes & ~BrowserType.ChromeOrFirefox) && !OnChrome)
      || Build.MinCVer < BrowserVer.MinRegisterContentScriptsWorldInMV3 && !("onbeforematch" in HTMLElementProto!)
  const kSA = InnerConsts.kSecretAttr
  const kVOnClick1 = InnerConsts.kVOnClick
    , outKMK = GlobalConsts.MarkAcrossJSWorlds
    , appInfo = OnChrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        ? !queueTask_
          ? navigator.userAgent!.match(<RegExpOne & RegExpSearchable<1>> /\bChrom(?:e|ium)\/(\d+)/) : 0 as const
        : [BrowserVer.Min$queueMicrotask]
    , tmpChromeVer: BrowserVer | 1 | 0 = OnChrome
        && (Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage
            || Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
            || Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage)
        ? appInfo && <BrowserVer> +appInfo[1] || 0
        : OnChrome ? 1 : 0
  const secret: string = !kInjectManually ? ""
      : ((math.random() * GlobalConsts.SecretRange + GlobalConsts.SecretBase) | 0) + ""
  const onClick = (function (this: Element | Window, event2: Event): void {
    const isSafe = this === box,
    rawDetail = (
        event2 as NonNullable<ConstructorParameters<CustomEventCls>[1]>
        ).detail as NonNullable<ConstructorParameters<CustomEventCls>[1]>["detail"] | undefined,
    detail = isSafe && rawDetail && isTY(rawDetail, kTY.obj) ? rawDetail satisfies readonly unknown[] : 0,
    fromAttrs: 0 | 1 | 2 = detail && (detail[1] + 1) as 1 | 2;
    let path: ReturnType<typeof getEventPath>, reHint: number | undefined, mismatch: 1 | undefined,
    docChildren: HTMLCollectionOf<Element> | undefined, boxChildren: HTMLCollectionOf<Element> | undefined,
    target = detail ? null : isSafe || !kInjectManually && box == null
        ? (event2 as DelegateEventCls["prototype"]).relatedTarget as Element | null | undefined
        : (!OnEdge
            && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)
            ? getEventPath(event2)![0] as Element
            : (path = getEventPath(event2)) && path.length > 1 ? path[0] as Element : null)
    Stop_(event2)
    if (!box) {
      if (!kInjectManually && readyState_ > "l" && target && htmlTag_<1>(target)) {
        if (attr_s(target, kSA) === "" + Build.RandomClick) {
          box = target satisfies SafeHTMLElement as HTMLDivElement
          readyTimeout = timeout_(initOnDocReady, InnerConsts.DelayToWaitDomReady)
          OnDocLoaded_(initOnDocReady)
          setOrRemoveAttr_s(target, kSA, "")
          vApi.e = execute
        } else {
          execute(kContentCmd.Destroy)
        }
      }
      return
    }
    let tickDoc = 0, tickBox = 0
    if (detail) {
      for (const index of detail[0]) {
        if (!Build.NDEBUG && index === InnerConsts.SignalDocWrite || index === InnerConsts.SignalDocOpen) {
          if (isEnabled_ || !fgCache) {
            hookOnWnd(HookAction.Install)
            setupEventListener(0, kVOnClick1, onClick)
            insertInit()
            timeout_(onReadyState_, 18)
            Build.NDEBUG || reHookTimes++ ||
            console.log("Vimium C: auto re-init after `document.%s()` on %o at %o."
                , index === InnerConsts.SignalDocOpen ? "open" : "write"
                , detail[2]!.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"), getTime())
          }
        } else {
          let isBox = index < InnerConsts.SignalDocOpen
          let list = isBox ? boxChildren : docChildren
          if (!list) {
            list = (isBox ? box : doc).getElementsByTagName("*")
            isBox ? boxChildren = list : docChildren = list
          }
          const el = list[isBox ? InnerConsts.OffsetForBoxChildren - index : index]
          el && clickable_.add(el);
          if (!Build.NDEBUG) { isBox ? tickBox++ : tickDoc++ }
        }
      }
    } else if (/* safer */ target && (isSafe && !rawDetail || (kInjectManually ? +secret : Build.RandomClick
          ) % InnerConsts.kModToExposeSecret + <string> target.tagName === rawDetail)) {
      clickable_.add(target);
    } else {
      mismatch = 1
    }
    box.textContent = ""
    if (mismatch) {
      if (!Build.NDEBUG && target && !isSafe && (kInjectManually || target as EventTarget !== window)) {
        console.error("extend click: unexpected: detail =", rawDetail, target);
      }
      return;
    }
    if (!Build.NDEBUG && (!detail || tickDoc || tickBox) && (++counterResolvePath <= 32
        || Math.floor(Math.log(counterResolvePath) / Math.log(1.414)) !==
           Math.floor(Math.log(counterResolvePath - 1) / Math.log(1.414)))) {
      console.log(`Vimium C: extend click: resolve ${detail ? "[%o + %o]" : "%o%s"} in %o @t=%o .`
        , detail ? tickDoc
          : target && (isTY(target.localName) ? `<${target.localName}>` : (target as ElementWithToStr) + "")
        , detail ? detail[1] ? -0 : tickBox
          : (event2 as FocusEvent).relatedTarget ? " (detached)"
          : this === window ? " (path on window)" : " (path on box)"
        , loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/;]+\/?)(;[^\/]+)?$/, "$1")
        , getTime() % 3600000);
    }
    if (isFirstResolve & fromAttrs) {
      isFirstResolve ^= fromAttrs;
      coreHints.h < 0 && doesWantToReloadLinkHints("lo") && (reHint = GlobalConsts.MinCancelableInBackupTimer)
    }
    if (coreHints.h > 0 && !reHint && hintOptions.autoReload && doesWantToReloadLinkHints("de")) {
      reHint = abs_(getTime() - coreHints.h) < GlobalConsts.ExtendClick_DelayToStartIteration + 200
          ? InnerConsts.DelayForNext + 17 : 0
    }
    reHint && reinitLinkHintsIn(reHint)
  })
  const dispatchCmd = (cmd: SecondLevelContentCmds, element?: SafeHTMLElement | null): void => {
    const msg = (((kInjectManually ? +secret : Build.RandomClick) << kContentCmd.MaskedBitNumber) | cmd)
      // Not use CustomEvent.detail, because it's a getter property since BrowserVer.Min$CustomEvent$$detail$getter
      setOrRemoveAttr_s(box!, kSA, "" + msg)
      dispatchEvent_(box!, Build.MV3 && Build.BTypes & BrowserType.Chrome
          ? new FocusEvent(InnerConsts.kCmd, { relatedTarget: element }) : new Event(InnerConsts.kCmd))
      setOrRemoveAttr_s(box!, kSA, "")
  }
  const execute = (cmd: ValidContentCommands, element?: SafeHTMLElement): void => {
    if (cmd < kContentCmd._minSuppressClickable) {
      cmd - kContentCmd.ManuallyReportKnownAtOnce || (isFirstResolve = 0)
      Build.MV3 && OnChrome ? dispatchCmd(cmd as ValidContentCommands & ContentCommandsNotSuppress, element) :
      dispatchCmd(cmd as ValidContentCommands & ContentCommandsNotSuppress);
      return;
    }
    /** this function should keep idempotent */
    setupEventListener(0, kVOnClick1, onClick, 1)
    if (box) {
      setupEventListener(box, kVOnClick1, onClick, 1);
      dispatchCmd(kContentCmd.Destroy);
    }
    box = vApi.e = script = null as never
  }
  const initOnDocReady = (): void => {
    clearTimeout_(readyTimeout)
    if (!box) { return }
    if (kInjectManually) {
      if (!script) { return }
      appendNode_s(script, box)
      dispatchEvent_(script, new Event(outKMK + Build.RandomClick))
      if (parentNode_unsafe_s(box)) {
        // normally, if here, must have: limited by CSP; not C or C >= MinEnsuredNewScriptsFromExtensionOnSandboxedPage
        // ignore the rare (unexpected) case that injected code breaks even when not limited by CSP,
        //     which might mean curCVer has no ES6...
        execute(kContentCmd.SuppressClickable)
        runJS_("`${" + outKMK + "=>" + secret + "}`")
        return
      }
      script = null as never
      removeEl_s(box)
    }
    setupEventListener(box, kVOnClick1, onClick)
    isTop && OnDocLoaded_(timeout_.bind(null
        , (): void => { isFirstResolve = 0; }, GlobalConsts.ExtendClick_EndTimeOfAutoReloadLinkHints), 1)
  }
  let script: HTMLScriptElement, box: HTMLDivElement | undefined | null, counterResolvePath = 0, reHookTimes = 0,
  isFirstResolve: number = isTop ? 3 : 0, readyTimeout: ValidTimeoutID

  if (!Build.NDEBUG && isFirstTime && readyState_ === "complete") {
    alert("Vimium C: Error! should not run extend_click twice")
    return
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
  script = createElement_(kInjectManually ? "script" : "p" as never)
  if ((script as Element as ElementToHTML).lang == null || kInjectManually && !isAlive_) {
    set_createElement_(doc.createElementNS.bind(doc, VTr(kTip.XHTML) as "http://www.w3.org/1999/xhtml"
        ) as typeof createElement_)
    kInjectManually && isFirstTime != null && OnDocLoaded_(extendClick) // retry after a while, using a real <script>
    return
  }
  if (!kInjectManually) {
    if (grabBackFocus) {
      if (Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinCSAcceptWorldInManifest) {
        // MS Edge may get a wrong order between dynamic and static scripts, but not reproduced on Chrome / Edge 126
        dispatchEvent(new Event(kVOnClick1))
      }
      setupEventListener(0, kVOnClick1, onClick);
      OnDocLoaded_(() => { // check CSP script-src or JS-disabled-in-CS
        box || execute(kContentCmd.Destroy)
      })
    }
    return
  }

// #region injected code
  /** the `InnerVerifier` needs to satisfy
   * * never return any object (aka. keep void) if only "not absolutely safe"
   * * never change the global environment / break this closure
   * * must look like a real task and contain random string
   */
  interface InnerVerifier { (maybeSecret: string): void }
  let injected: string = (Build.NDEBUG && Build.Inline ? VTr(isFirstTime ? kTip.extendClick
            : Build.MV3 ? kTip.removeEventScript : kTip.removeCurScript)
          : !isFirstTime && VTr(Build.MV3 ? kTip.removeEventScript : kTip.removeCurScript))
        || "'use strict';(" + (function VC(this: void): void {

type FUNC = (this: unknown, ...args: never[]) => unknown;
type OnEventSetter = (this: HTMLElement, handler: (this: HTMLElement, event: MouseEventToPrevent) => unknown) => void
const V = /** verifier */ (maybeSecret: string): void | boolean => {
    I = GlobalConsts.MarkAcrossJSWorlds === maybeSecret
},
MayChrome = !!(Build.BTypes & BrowserType.Chrome),
MayEdge = !!(Build.BTypes & BrowserType.Edge),
MayNotEdge = !!(Build.BTypes & ~(BrowserType.Edge | BrowserType.Firefox)),
MayES5 = !!(Build.BTypes & BrowserType.Chrome) && Build.MinCVer < BrowserVer.MinTestedES6Environment,
EnsuredGetRootNode = !(Build.BTypes & BrowserType.Edge)
    && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$Node$$getRootNode),
MayNoSetProto = !!(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf),
doc0 = document,
SetProp = MayNoSetProto ? null : Object.setPrototypeOf,
kAEL = "addEventListener", kToS = "toString", kProto = "prototype", kByTag = "getElementsByTagName",
ETP = EventTarget[kProto], _listen = ETP[kAEL],
toRegister: Element[] = [],
_call = _listen.call,
apply = !(Build.BTypes & BrowserType.Chrome)
    || Build.MinCVer >= BrowserVer.MinEnsured$Reflect$$apply$And$$construct || typeof Reflect === "object"
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    ? Reflect!.apply as <T, A extends any[], R> (func: (this: T, ...a: A) => R, thisArg: T, args: A | IArguments) => R
    : _call.bind(_call.apply as any) as never,
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
call = _call.bind(_call as any) as <T, A extends any[], R>(func: (this: T, ...a: A) => R, thisArg: T, ...args: A) => R,
_dispatch = ETP.dispatchEvent,
HtmlElProto = HTMLElement[kProto], ElCls = Element, ElProto = ElCls[kProto],
Append = !MayChrome || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
    ? ElProto.append! : ElProto.appendChild, GetAttr = ElProto.getAttribute,
Remove = ElProto.remove,
getElementsByTagNameInEP = ElProto[kByTag],
nodeIndexList: number[] = [], Slice = (nodeIndexList as unknown[] as Element[]).slice,
IndexOf = _call.bind(nodeIndexList.indexOf) as <T>(list: ArrayLike<T>, item: T) => number,
forEach = nodeIndexList.forEach as <T> (this: T[], callback: (item: T, index: number) => unknown) => void,
splice = nodeIndexList.splice as <T> (this: T[], start: number, deleteCount?: number) => T[],
pushInDocument = nodeIndexList.push.bind(nodeIndexList),
CECls = CustomEvent as CustomEventCls, StopProp = CECls[kProto].stopImmediatePropagation as (this: Event) => void,
DECls = FocusEvent as DelegateEventCls,
FProto = Function[kProto], _toString = FProto[kToS],
clearTimeout1 = clearTimeout,
DocCls = Document[kProto] as Partial<Document> as Pick<Document, "createElement" | typeof kByTag> & {
      open (): void, write (markup: string): void },
getElementsByTagNameInDoc = DocCls[kByTag],
_docOpen = DocCls.open, _docWrite = DocCls.write,
OwnProp_cr_mv3 = Build.MV3 && Build.BTypes & BrowserType.Chrome
    && Build.MinCVer < BrowserVer.MinRegisterContentScriptsWorldInMV3
    ? Object.getOwnPropertyDescriptor : 0 as never as null,
relatedTargetGetter = Build.MV3 && Build.BTypes & BrowserType.Chrome
    && Build.MinCVer < BrowserVer.MinRegisterContentScriptsWorldInMV3
    ? OwnProp_cr_mv3!(DECls[kProto], "relatedTarget"
      )!.get as (this: FocusEvent) => EventTarget | null : 0 as never as null,
kOC = InnerConsts.kVOnClick, kRC = Build.RandomClick, kEventName2 = kOC + kRC, kFn = "function",
StringSplit = !(Build.NDEBUG && Build.Mangle) ? "".split : 0 as never, StringSlice = kEventName2.slice,
checkIsNotVerifier = (func?: InnerVerifier | unknown): void | 42 => {
  if (!(Build.NDEBUG && Build.Mangle) && !verifierPrefixLen) {
    verifierLen = (verifierStrPrefix = call(_toString, V)).length,
    verifierPrefixLen = (verifierStrPrefix = call(StringSplit, verifierStrPrefix, sec)[0]).length
  }
  func && (func as InnerVerifier)(
        call(StringSlice, call(_toString, func as InnerVerifier)
          , !(Build.NDEBUG && Build.Mangle) ? verifierPrefixLen! - GlobalConsts.LengthOfMarkAcrossJSWorlds
              /** `16` is for {@see #BrowserVer.MinEnsured$Function$$toString$preservesWhitespace} */
              : MayES5 ? 16 : 7
          , (Build.NDEBUG && Build.Mangle ? MayES5?16:7 : verifierPrefixLen! - GlobalConsts.LengthOfMarkAcrossJSWorlds)
            + GlobalConsts.LengthOfMarkAcrossJSWorlds + GlobalConsts.SecretStringLength)
  )
},
enqueue = (a: Element, listener: any): void => {
  if (typeof listener === "function" && a.localName !== "a") {
    pushToRegister(a as Element)
    timer = timer || (queueMicroTask_(delayToStartIteration), 1);
  }
},
hooks = {
  toString: function toString(this: FUNC): string {
    const a = this, args = arguments, hookedInd = IndexOf(hookedFuncs, a)
    const str = apply(_toString, hookedInd < 0 ? a : hookedFuncs[hookedInd - 1], args)
    const mayStrBeToStr: boolean
        = str !== (myAELStr
                  || (myToStrStr = call(_toString, myToStr),
                      Build.NDEBUG && Build.Mangle
                      ? verifierStrPrefix = call(StringSlice, call(_toString, V), 0
                        , GlobalConsts.LengthOfMarkAcrossJSWorlds + (MayES5 ? 16 : 7))
                      : (verifierLen = (verifierStrPrefix = call(_toString, V)).length,
                        verifierPrefixLen = (verifierStrPrefix = call(StringSplit, verifierStrPrefix, sec)[0]).length),
                      myAELStr = call(_toString, myAEL)))
    args.length === 2 && args[0] === GlobalConsts.MarkAcrossJSWorlds && checkIsNotVerifier(args[1])
    detectDisabled && str === detectDisabled && executeCmd()
    return mayStrBeToStr && str !== myToStrStr
        ? str.length !== (!(Build.NDEBUG && Build.Mangle) ? verifierLen
              : GlobalConsts.LengthOfMarkAcrossJSWorlds + GlobalConsts.SecretStringLength + (MayES5 ? 22 : 13))
          || call(StringSlice, str, 0
              , !(Build.NDEBUG && Build.Mangle) ? verifierPrefixLen! : GlobalConsts.LengthOfMarkAcrossJSWorlds
                  + (MayES5 ? 16 : 7)) !== verifierStrPrefix
          ? str : call(_toString, noop)
        : (I = 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
          mayStrBeToStr ? call(a as any, noop, kMk, V) : (a as any)(kMk, noop, 0, V), I)
        ? call(_toString, mayStrBeToStr ? _toString : _listen) : str
  },
  addEventListener: function addEventListener(this: EventTarget, type: string
      , listener: EventListenerOrEventListenerObject): void {
    const a = this, args = arguments
    const ret = args.length === 4 && type === GlobalConsts.MarkAcrossJSWorlds ? checkIsNotVerifier(args[3])
        : apply(_listen, a, args)
    if (type === "click" || type === "mousedown" || type === "pointerdown" || type === "dblclick"
        ? a instanceof ElCls && a !== toRegister[toRegister.length - 1]
        : type === kEventName2 && !isReRegistering
          // note: window.history is mutable on C35, so only these can be used: top,window,location,document
          && a && !(a as Window).window && (a as Node).nodeType === kNode.ELEMENT_NODE) {
      enqueue(a as Element, listener)
    }
    return ret as void
  },
  open: function open(this: Document): void { return docOpenHook(0, this, arguments) },
  write: function write(this: Document): void { return docOpenHook(1, this, arguments) },
  "set onclick": function (val): void { call(hookedFuncs[0], this, val); val && enqueue(this, val) } as OnEventSetter,
  "set onmousedown": function (v): void { call(hookedFuncs[2], this, v); v && enqueue(this, v) } as OnEventSetter
},
myAEL = (/*#__NOINLINE__*/ hooks)[kAEL], myToStr = (/*#__NOINLINE__*/ hooks)[kToS],
myDocOpen = (/*#__NOINLINE__*/ hooks).open, myDocWrite = (/*#__NOINLINE__*/ hooks).write,
hookedFuncs = [0 as never as OnEventSetter, 0 as never as Function, 0 as never as OnEventSetter, 0 as never as Function
    , _listen, myAEL, _toString, myToStr, _docOpen, myDocOpen, _docWrite, myDocWrite] as const

let root = (Build.MV3 ? ( // @ts-ignore
    event as Event
    ).target : doc0.currentScript) as HTMLScriptElement | HTMLDivElement, timer = 1,
sec = root.dataset.vimium!,
/** kMarkToVerify */ kMk = GlobalConsts.MarkAcrossJSWorlds as const,
detectDisabled: string | 0 = kMk + "=>" + sec,
myAELStr: string | undefined, myToStrStr: string | undefined,
verifierStrPrefix: string | undefined, verifierPrefixLen: number | undefined, verifierLen: number | undefined,
/** verifierIsLastMatched */ I: BOOL | boolean | undefined,
getRootNode = (EnsuredGetRootNode ? _call.bind(ElProto.getRootNode!) : ElProto.getRootNode) as never as {
  (self: Node, options?: { composed?: boolean }): Node } | undefined,
contains = EnsuredGetRootNode || getRootNode ? null : ElProto.contains.bind(doc0), // in fact, it is Node::contains
kGetComposedRoot = { __proto__: null, composed: !0 },
// here `setTimeout` is normal and will not use TimerType.fake
setTimeout_ = setTimeout as SafeSetTimeout,
unsafeDispatchCounter = 0,
allNodesInDocument = null as Element[] | null, allNodesForDetached = null as Element[] | null,
pushToRegister = (nodeIndexList as unknown[] as Element[]).push.bind(toRegister),
queueMicroTask_: (callback: () => void) => void =
    MayEdge || MayChrome && Build.MinCVer < BrowserVer.Min$queueMicrotask
    ? MayNotEdge ? (window as PartialOf<typeof globalThis, "queueMicrotask">).queueMicrotask! : 0 as never
    : queueMicrotask,
isReRegistering: number = 4
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
    cls: Cls, data: Cls extends new (type: infer _, init: infer B) => any ? B & { __proto__?: null } : never,
    target?: Element): void => {
  apply(_dispatch, target || root, [new cls(kOC, MayNoSetProto ? data as object : SetProp!(data as object, null)
  )])
}
const prepareRegister = (element: Element): void => {
  if (EnsuredGetRootNode || getRootNode ? getRootNode!(element) === doc0 : contains!(element)) {
    pushInDocument(
      IndexOf(allNodesInDocument = allNodesInDocument || call(Slice, call(getElementsByTagNameInDoc, doc0, "*"))
        , element));
    return;
  }
  // here element is inside a #shadow-root or not connected
  const doc1 = element.ownerDocument;
  // in case element is <form> / <frameset> / adopted into another document, or aEL is from another frame
  if (doc1 !== doc0) {
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
  if (EnsuredGetRootNode || getRootNode) {
    parent = getRootNode!(element)
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
    pushInDocument(InnerConsts.OffsetForBoxChildren -
      IndexOf(allNodesForDetached = allNodesForDetached || call(Slice, call(getElementsByTagNameInEP, root, "*"))
        , element));
  // Note: ignore the case that a plain #document-fragment has a fake .host
  }
  else if (type !== kNode.DOCUMENT_FRAGMENT_NODE) { /* empty */ }
  else if (unsafeDispatchCounter < InnerConsts.MaxUnsafeEventsInOneTick - 2) {
    if (MayNotEdge && (tempParent = (parent as TypeToAssert<DocumentFragment, ShadowRoot, "host">).host)) {
      parent = (EnsuredGetRootNode || getRootNode)
          && (tempParent as NonNullable<ShadowRoot["host"]>).shadowRoot // an open shadow tree
          && getRootNode!(element, kGetComposedRoot)
      if (parent && (parent === doc0 || (<NodeToElement> parent).nodeType === kNode.ELEMENT_NODE)
          && typeof (s = element.tagName) === "string") {
        parent !== doc0 && parent !== root && call(Append, root, parent);
        unsafeDispatchCounter++;
        safeDispatch_(CECls, MayNoSetProto
            ? { detail: +sec % InnerConsts.kModToExposeSecret + s, composed: !0, __proto__: null }
            : { detail: +sec % InnerConsts.kModToExposeSecret + s, composed: !0 }, element)
      }
    } else {
      unsafeDispatchCounter++;
      safeDispatch_(DECls, MayNoSetProto ? { relatedTarget: element, __proto__: null } : { relatedTarget: element })
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
    safeDispatch_(CECls, MayNoSetProto
        ? { detail: [nodeIndexList, fromAttrs], __proto__: null } : { detail: [nodeIndexList, fromAttrs] })
    nodeIndexList.length = 0
  }
  allNodesInDocument = allNodesForDetached = null
}
const safeReRegister = (element: Element, doc1: Document): void => {
  const localAEL = doc1[kAEL], localREL = doc1.removeEventListener;
  if (typeof localAEL == kFn && typeof localREL == kFn && localAEL !== myAEL) {
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
      ? (detail >> kContentCmd.MaskedBitNumber) === +sec
        ? detail & ((1 << kContentCmd.MaskedBitNumber) - 1) : kContentCmd._fake
      : eventOrDestroy ? kContentCmd._fake : kContentCmd.Destroy;
  // always stopProp even if the secret does not match, so that an attacker can not detect secret by enumerating numbers
  detail && call(StopProp, eventOrDestroy!);
  if (cmd < kContentCmd._minSuppressClickable) {
    if (Build.MV3 && Build.BTypes & BrowserType.Chrome && cmd > kContentCmd.ShowPicker_cr_mv3 - 1) {
      (call(relatedTargetGetter!, eventOrDestroy as FocusEvent) as HTMLInputElement | HTMLSelectElement).showPicker!()
    } else {
      next(clearTimeout1(timer)) // lgtm [js/superfluous-trailing-arguments]
    }
    return;
  }
  root = (toRegister.length = detectDisabled = 0) as never
  pushToRegister = setTimeout_ = noop
  timer = 1
}
const docOpenHook = (isWrite: BOOL, self: unknown, args: IArguments): void => {
  const first = doc0.readyState < "l" && (isWrite || args.length < 3) && self === doc0
  const oriHref = Build.NDEBUG || !first ? "" : location.host && location.pathname || location.href
  const ret = apply(isWrite ? _docWrite : _docOpen, self, args)
  if (first) {
    if (Build.NDEBUG) {
      root && doRegister(0, pushInDocument(InnerConsts.SignalDocOpen)) // lgtm [js/superfluous-trailing-arguments]
    } else if (root) {
      safeDispatch_(CECls, MayNoSetProto
          ? { detail: [ [isWrite ? InnerConsts.SignalDocWrite : InnerConsts.SignalDocOpen as number] , 0, oriHref],
              __proto__: null }
          : { detail: [ [isWrite ? InnerConsts.SignalDocWrite : InnerConsts.SignalDocOpen as number] , 0, oriHref] })
    }
  }
  return ret
}
const noop = (): 1 => { return 1 }

if (!MayNotEdge
    || (MayEdge || MayChrome && Build.MinCVer < BrowserVer.Min$queueMicrotask) && typeof queueMicroTask_ !== kFn) {
  if (MayChrome && Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
    const promise_ = Promise
    queueMicroTask_ = (promise_.resolve ? promise_.resolve() : promise_.resolved!()) as any
  } else {
    queueMicroTask_ = Promise.resolve() as any
  }
  queueMicroTask_ = (queueMicroTask_ as any as Promise<void>).then.bind(queueMicroTask_ as any as Promise<void>);
}
if (!EnsuredGetRootNode && getRootNode) { getRootNode = _call.bind(getRootNode as any) as any }
for (; isReRegistering; ) {
  const propName = (isReRegistering -= 2) ? "onmousedown" : "onclick"
  const propDesc = (Build.MV3 && Build.BTypes & BrowserType.Chrome
      && Build.MinCVer < BrowserVer.MinRegisterContentScriptsWorldInMV3
      ? OwnProp_cr_mv3! : Object.getOwnPropertyDescriptor)(HtmlElProto, propName)!
  if (!MayChrome || Build.MinCVer >= BrowserVer.MinOnclickInHTMLElementPrototype || propDesc) {
    (hookedFuncs as Writable<typeof hookedFuncs>)[isReRegistering] = propDesc.set as OnEventSetter
    ; (hookedFuncs as Writable<typeof hookedFuncs>)[isReRegistering + 1] = propDesc.set =
        hooks[("set " + propName) as `set ${typeof propName}`]
    Object.defineProperty(HtmlElProto, propName, propDesc)
  }
}
// only the below can affect outsides
call(Remove, root)
call(_listen, root, kMk + kRC, (): void => {
  root = call(getElementsByTagNameInEP, root as HTMLScriptElement, "*")[0] as HTMLDivElement
  call(Remove, root)
  call(_listen, root, InnerConsts.kCmd, executeCmd, !0)
  timer = toRegister.length > 0 ? setTimeout_(next, InnerConsts.DelayForNext) : 0
  detectDisabled = 0
})
ETP[kAEL] = myAEL;
FProto[kToS] = myToStr
DocCls.open = myDocOpen
DocCls.write = myDocWrite

      }).toString() + ")();" /** need "toString()": {@link ../scripts/dependencies.js#patchExtendClick} */

// #endregion injected code

  if (isFirstTime) {
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6MethodFunction
        && tmpChromeVer >= BrowserVer.MinEnsuredES6MethodFunction) {
      injected = injected.replace(<RegExpG> /: ?function \w+/g, "");
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6ArrowFunction
        && tmpChromeVer < BrowserVer.MinEnsuredES6ArrowFunction) {
      injected = injected.replace(<RegExpG> (Build.NDEBUG && Build.Mangle ? /\(([\w,]*\))=>/g : /\(([\w, ]*\))=>/g)
          , "function($1")
    }
    injected = injected.replace(outKMK, "$&" + secret as `$&${typeof secret}`)
    script.dataset.vimium = secret
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
  if (OnChrome && Build.MinCVer <= BrowserVer.NoRAFOrRICOnSandboxedPage
      && tmpChromeVer === BrowserVer.NoRAFOrRICOnSandboxedPage) {
    set_noRAF_old_cr_(1)
    rAF_((): void => { set_noRAF_old_cr_(0) })
  }
  // not check MinEnsuredNewScriptsFromExtensionOnSandboxedPage
  // for the case JavaScript is disabled in CS: https://github.com/philc/vimium/issues/3187
  if (!parentNode_unsafe_s(script)) { // It succeeded in hooking.
    box = createElement_("div")
    vApi.e = execute;
    // wait the inner listener of `start` to finish its work
    if (isFirstTime) {
      readyTimeout = timeout_(initOnDocReady, InnerConsts.DelayToWaitDomReady)
      OnDocLoaded_(initOnDocReady)
    }
    return
  }
  // else: CSP script-src before C68, CSP sandbox before C68 or JS-disabled-in-CS on C/E
  removeEl_s(script)
  execute(kContentCmd.Destroy);
  if (!OnChrome || !Build.NDEBUG && !injected) {
    // on Edge (EdgeHTML), `setTimeout` and `requestAnimationFrame` work well
    return;
  }
  // ensured on Chrome
  if (Build.MinCVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage
      && tmpChromeVer && tmpChromeVer < BrowserVer.MinEventListenersFromExtensionOnSandboxedPage) {
    recordLog(kTip.logNotWorkOnSandboxed)()
    safeDestroy(1)
  } else if (!Build.MV3) {
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
if (!(Build.NDEBUG
      || BrowserVer.MinEnsuredNewScriptsFromExtensionOnSandboxedPage <= BrowserVer.NoRAFOrRICOnSandboxedPage)) {
  console.log("Assert error: Warning: may no timer function on sandbox page!");
}

if (!(Build.NDEBUG || BrowserVer.Min$beforematch$Event === BrowserVer.MinRegisterContentScriptsWorldInMV3)) {
  console.log("Assert error: BrowserVer.Min$beforematch$Event === BrowserVer.MinRegisterContentScriptsWorldInMV3")
}
