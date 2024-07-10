import {
  doc, isTop, injector, isAsContent, set_esc, esc, setupEventListener, set_isEnabled_, XrayedObject, runtime_ff,
  set_clickable_, clickable_, isAlive_, set_VTr, setupKeydownEvents, onWndFocus, includes_,
  set_readyState_, readyState_, callFunc, recordLog, set_vApi, vApi, locHref, unwrap_ff, raw_unwrap_ff, math, OnFirefox,
  OnChrome, OnEdge, fgCache
} from "../lib/utils"
import { suppressTail_, getMappedKey } from "../lib/keyboard_utils"
import {
  frameElement_, runJS_, OnDocLoaded_, set_OnDocLoaded_, onReadyState_, set_onReadyState_, isHTML_,
} from "../lib/dom_utils"
import { wndSize_ } from "../lib/rect"
import {
  HookAction, safePost, set_port_, runtime_port, set_safeDestroy,
  runtimeConnect, safeDestroy, post_, send_, hookOnWnd, requestHandlers, contentCommands_,
} from "./port"
import {
  ui_box, adjustUI, getParentVApi, set_getParentVApi, set_getWndVApi_ff, learnCSS, ui_root, flash_
} from "./dom_ui"
import { grabBackFocus } from "./insert"
import { currentKeys, inheritKeyMappings, keyFSM, mapKeyTypes, mappedKeys } from "./key_handler"
import { coreHints } from "./link_hints"
import { executeScroll, scrollTick, $sc, keyIsDown as scroll_keyIsDown } from "./scroller"
import { find_box, find_input } from "./mode_find"
import { filterTextToGoNext, jumpToNextLink } from "./pagination"
import { set_needToRetryParentClickable, focusAndRun } from "./request_handlers"
import { RSC } from "./commands"
import { ec_main_not_ff } from  "./extend_click"
import { main_ff as extend_click_ff, unblockClick_old_ff } from  "./extend_click_ff"
import { hudTip } from "./hud"

const docReadyListeners: Array<(this: void) => void> = []
let completeListeners: Array<(this: void) => void> = []
let oldHasVC: BOOL = 0

set_OnDocLoaded_((callback, onloaded): ReturnType<typeof OnDocLoaded_> => {
  readyState_ > "l" || readyState_ > "i" && onloaded
  ? (onloaded ? completeListeners : docReadyListeners).push(callback) : callback()
})

set_onReadyState_((event): ReturnType<typeof onReadyState_> => {
  set_readyState_(event && (!OnChrome || event !== TimerType.fake) ? doc.readyState : "c")
  if (readyState_ < "l") {
    docReadyListeners.forEach(callFunc)
    docReadyListeners.length = 0
    if (readyState_ < "i") {
      completeListeners.forEach(callFunc)
      completeListeners = docReadyListeners
      setupEventListener(0, RSC, onReadyState_, 1, 1)
    }
  }
})

set_safeDestroy(((silent): void => {
    if (!isAlive_) { return; }
    if (OnFirefox && silent === 9) {
      set_port_(null)
      return;
    }
    set_isEnabled_(!1)
    set_VTr(locHref)
    hookOnWnd(HookAction.Destroy);

    contentCommands_[kFgCmd.insertMode]({r: 2})
    vApi.e && vApi.e(kContentCmd.Destroy);
    ui_box && adjustUI(2);

    set_esc(null as never)
    VApi = null as never;

    if (!Build.NDEBUG) {
      injector || define.noConflict() // eslint-disable-line @typescript-eslint/no-unsafe-call
    }

    if (runtime_port) { try { runtime_port.disconnect(); } catch {} }
    silent || recordLog("Vimium C on %o has been destroyed at %o.")()
}) satisfies typeof safeDestroy)

set_vApi(VApi = {
  a: setupKeydownEvents, b: coreHints, c: executeScroll, d: safeDestroy, e: null, f: focusAndRun, g: filterTextToGoNext,
  h: hudTip, i: OnFirefox ? wndSize_ : 0 as never, j: jumpToNextLink, k: scrollTick, l: learnCSS, n: 0 as never as null,
  p: post_, q: requestHandlers[kBgReq.refreshPort],
  r: isAsContent as false || [send_, safePost, (task: 0 | 1 | 2, arg?: string | ElementSet | VTransType): any => {
    task < 1 ? (arg = currentKeys, /*#__NOINLINE__*/ esc!(HandlerResult.Nothing))
      : task < 2 ? set_clickable_(arg as ElementSet)
      : set_VTr(arg as VTransType)
    return arg
  }, getMappedKey],
  s: suppressTail_, t: requestHandlers[kBgReq.showHUD],
  u: locHref, v: runJS_, x: flash_,
  y: OnFirefox ? () => ( {
    w: onWndFocus, b: find_box, c: clickable_, k: scroll_keyIsDown, r: ui_root, f: find_input,
    m: [keyFSM, mappedKeys, mapKeyTypes, fgCache || null ]
  } ) : () => ( {  b: find_box, c: clickable_, k: scroll_keyIsDown, r: ui_root, f: find_input,
    m: [keyFSM, mappedKeys, mapKeyTypes, fgCache || null ] } ),
  z: null,
  $: $sc
})

if (OnFirefox && isAsContent) {
  ((): void => {
    type Comparer = (this: void, rand2: number, testEncrypted: string) => boolean
    type SandboxGetterFunc = (this: void, comparer: Comparer, rand1: number) => VApiTy | 0 | null | undefined | void
    interface GetterWrapper { _get: SandboxGetterFunc }
    type WindowWithGetter = Window & { __VimiumC__: GetterWrapper }
    let randomKey = 0, recvTick = 0, sendTick = 0
    const name = BuildStr.CoreGetterFuncName as string as "__VimiumC__"
    const encrypt = (trustedRand: number, unsafeRand: number): string => {
        trustedRand += (unsafeRand >= 0 && unsafeRand < 1 ? unsafeRand : trustedRand);
        let a = (0x8000 * trustedRand) | 0,
        host = new URL(runtime_ff!.getURL("")).host.replace(<RegExpG> /-/g, "");
        return ((host + Build.RandomReq.toString(16)
            ).match(<RegExpG> /[\da-f]{1,4}/gi)!
            ).map((i, ind) => parseInt(i, 16) & (ind & 1 ? ~a : a)).join("");
    }
    const comparer: Comparer = (rand2, testEncrypted): boolean => {
        "use strict";
        // eslint-disable-next-line spaced-comment
        /*! @OUTPUT {"use strict";} */
        const diff = encrypt(randomKey, +rand2) !== testEncrypted, d2 = recvTick > 64
        recvTick += d2 ? 0 : diff ? 2 : 1
        return diff || d2; // hide the real result if too many errors
    }
    const getterWrapper: GetterWrapper = Object.defineProperty(raw_unwrap_ff(new window.Object() as GetterWrapper)!
          , "_get", { value (maybeComparer, rand1): VApiTy | void {
        let rand2 = math.random(), toStr = hookOnWnd.toString
        // an ES6 method function is always using the strict mode, so the arguments are inaccessible outside it
        if (sendTick > GlobalConsts.MaxRetryTimesForSecret
            // if `comparer` is a Proxy, then `toString` returns "[native code]", so the line below is safe
            || toStr.call(maybeComparer) !== toStr.call(comparer)
            || maybeComparer(rand2, encrypt(rand2, +rand1))) {
          if (sendTick < GlobalConsts.MaxRetryTimesForSecret + 10) {
            sendTick++
          }
          return
        }
        return vApi
    } })
    /** Note: this function needs to be safe enough */
    set_getWndVApi_ff((anotherWnd: Window): VApiTy | null | void => {
      recvTick = -1
      // Sometimes an `anotherWnd` has neither `.wrappedJSObject` nor `coreTester`,
      // usually when a child frame is hidden. Tested on QQMail (destkop version) on Firefox 74.
      // So add `|| anotherWnd` for less exceptions
      try {
        let core: ReturnType<SandboxGetterFunc>,
        wrapper = unwrap_ff(anotherWnd as XrayedObject<WindowWithGetter>)[name],
        getter = wrapper && wrapper._get
        return getter && (core = getter(comparer, randomKey = math.random())) && !recvTick ? core : null
      } catch {}
    })
    // on Firefox, such an exposed function can only be called from privileged environments
    try {
      const wnd = raw_unwrap_ff(window as XrayedObject<WindowWithGetter>)!
      grabBackFocus || isHTML_() && wnd[name] && (oldHasVC = 1)
      wnd[name] = getterWrapper
    } catch { // if window[name] is not configurable
      set_getWndVApi_ff((): void => { /* empty */ })
    }
  })()
}
if (!(isTop || injector)) {
  const scoped_parApi = OnFirefox ? frameElement_() && getParentVApi() : getParentVApi()
  if (!scoped_parApi) {
      if ((!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet
          || WeakSet) && <boolean> grabBackFocus) {
        set_needToRetryParentClickable(1)
        if (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
            || (Build.MinCVer >= BrowserVer.Min$Set$Has$$forEach ? Set : Set && Set.prototype.forEach)) {
          set_clickable_(new Set!<Element>())
        } else {
          type ElementArraySet = Element[] & ElementSet
          set_clickable_([] as any as ElementArraySet)
          clickable_.add = (clickable_ as ElementArraySet).push;
          // a temp collection on a very old Chrome, so it's okay just to ignore its elements
          clickable_.has =
              !OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES$Array$$Includes
              ? (clickable_ as ElementArraySet).includes : includes_
        }
      }
  } else if (OnFirefox) {
    /*#__NOINLINE__*/ (function (parApi: VApiTy): void {
      try { // `vApi` is still unsafe
          const state = parApi.y()
          if ((state.b && ( // @ts-ignore
                XPCNativeWrapper as <T extends object> (wrapped: T) => XrayedObject<T>
              )(state.b)) === frameElement_()) {
            safeDestroy(1);
            parApi.n!()
          } else {
            set_clickable_(state.c)
            /*#__INLINE__*/ inheritKeyMappings(state)
          }
          return;
      } catch (e) {
        if (!Build.NDEBUG) {
          console.log("Assert error: Parent frame check breaks:", e);
        }
      }
      if (<boolean> /** is_readyState_loading */ grabBackFocus) {
        // here the parent `core` is invalid - maybe from a fake provider
        set_getParentVApi(() => null)
      }
    })(scoped_parApi)
  } else {
    const state = scoped_parApi.y()
      // if not `vfind`, then a parent may have destroyed for unknown reasons
    if (state.b === frameElement_()) {
        safeDestroy(1);
        scoped_parApi.n!()
    } else {
      set_clickable_(state.c)
      /*#__INLINE__*/ inheritKeyMappings(state)
    }
  }
}

if (isAlive_) {
    interface ElementWithClickable { vimiumClick?: boolean }
    set_clickable_(clickable_ || (!OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet)
          || WeakSet ? new WeakSet!<Element>() as never : {
        add (element: Element): any { (element as ElementWithClickable).vimiumClick = true },
        has: (element: Element): boolean => !!(element as ElementWithClickable).vimiumClick
    }))
    // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
    hookOnWnd(HookAction.Install);
    runtimeConnect();

  if (isAsContent) {
    if (OnFirefox) {
      /*#__INLINE__*/ extend_click_ff(oldHasVC)
    } else {
      ec_main_not_ff()
    }
  }
  OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinPopupBlockerPassOrdinaryClicksDuringExtMessages
      && !runtime_ff!.getFrameId && unblockClick_old_ff()

  readyState_ < "i" || setupEventListener(0, RSC, onReadyState_, 0, 1)
}

if (OnChrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
    const StringCls = String.prototype;
    /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
    if (!"".startsWith) {
      StringCls.startsWith = function (this: string, s: string): boolean {
        return this.lastIndexOf(s, 0) === 0;
      };
      StringCls.endsWith = function (this: string, s: string): boolean {
        const i = this.length - s.length;
        return i >= 0 && this.indexOf(s, i) === i;
      };
    } else if (Build.MinCVer <= BrowserVer.Maybe$Promise$onlyHas$$resolved) {
      Promise.resolve || (Promise.resolve = Promise.resolved!)
    }
    StringCls.includes = function (this: string, s: string, pos?: number): boolean {
    // eslint-disable-next-line @typescript-eslint/prefer-includes
      return this.indexOf(s, pos) >= 0;
    };
}

if (!(Build.NDEBUG || GlobalConsts.MaxNumberOfNextPatterns <= 255)) {
  console.log("Assert error: GlobalConsts.MaxNumberOfNextPatterns <= 255");
}

if (!(Build.NDEBUG || BrowserVer.Min$Set$Has$$forEach <= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol)) {
  console.log("Assert error: BrowserVer.Min$Set$Has$$forEach <= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol");
}

if (!Build.NDEBUG) {
  (contentCommands_ as unknown as any[]).forEach((x, i) => x || alert(`Assert error: missing contentCommands_[${i}]`));
  (requestHandlers as unknown as any[]).forEach((x, i) => x ||
      i === kBgReq.injectorRun || alert(`Assert error: missing requestHandlers[${i}]`))
}
