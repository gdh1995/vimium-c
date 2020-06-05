import {
  doc, isTop, injector, VOther, initialDocState, set_esc, esc, setupEventListener, set_isEnabled_,
  set_clickable_, clickable_, isAlive_, set_VTr, setupKeydownEvents, onWndFocus,
  set_readyState_, readyState_, set_allowScripts_, callFunc, recordLog, set_vApi, vApi,
} from "../lib/utils"
import { suppressTail_, getMappedKey } from "../lib/keyboard_utils"
import { frameElement_, set_OnDocLoaded_, getInnerHeight } from "../lib/dom_utils"
import {
  safePost, clearRuntimePort, runtime_port, SafeDestoryF, set_safeDestroy,
  runtimeConnect, safeDestroy, post_, send_,
} from "./port"
import {
  ui_box, adjustUI, doExitOnClick, getParentVApi, set_getParentVApi, set_getWndVApi_ff, learnCSS,
  setUICSS, ui_root, flash_,
} from "./dom_ui"
import { grabBackFocus } from "./insert"
import { currentKeys } from "./key_handler"
import { contentCommands_ } from "./commands"
import { hook, enableNeedToRetryParentClickable, focusAndRun } from "./request_handlers"

import { main as extend_click } from  "./extend_click.js"
import { activate as linkActivate, coreHints } from "./link_hints"
import { executeScroll, scrollTick, $sc, keyIsDown as scroll_keyIsDown } from "./scroller"
import { hudTip, hudCopied } from "./hud"
import { onLoad as findOnLoad, find_box, findCSS, styleInHUD } from "./mode_find"
import { activate as omniActivate } from "./omni"

const docReadyListeners: Array<(this: void) => void> = [], completeListeners: Array<(this: void) => void> = []
const RSC = "readystatechange"

let coreTester: { /** name */ n: BuildStr.CoreGetterFuncName; /** recvTick */ r: number; /** sendTick */ s: number;
    /** random key */ k: number; /** encrypt */ e (trustedRand: number, unsafeRand: number): string;
    /** compare_ */ c: Parameters<SandboxGetterFunc>[0]; }
  

set_safeDestroy((silent?: Parameters<SafeDestoryF>[0]): void => {
    if (!isAlive_) { return; }
    if (Build.BTypes & BrowserType.Firefox && silent === 9) {
      /*#__INLINE__*/ clearRuntimePort()
      return;
    }
    /*#__INLINE__*/ set_isEnabled_(!1)
    hook(HookAction.Destroy);

    contentCommands_[kFgCmd.reset](0);
    vApi.e && vApi.e(kContentCmd.Destroy);
    ui_box && adjustUI(2);
    doExitOnClick();

    /*#__INLINE__*/ set_esc(null as never)
    VApi = null as never;

    if (runtime_port) { try { runtime_port.disconnect(); } catch {} }
    silent || recordLog("Vimium C on %o has been destroyed at %o.")
    injector || (<RegExpOne> /a?/).test("");
})

set_vApi(VApi = {
  b: coreHints, e: null, z: null,
  p: post_, a: setupKeydownEvents, f: focusAndRun, d: safeDestroy,
  h: linkActivate, o: omniActivate, n: findOnLoad, c: executeScroll,
  k: scrollTick, $: $sc, l: learnCSS, u: suppressTail_,
  i: Build.BTypes & BrowserType.Firefox ? getInnerHeight : 0 as never,
  r: injector && [send_, safePost, (task: 0 | 1 | 2, arg?: string | ElementSet | VTransType): any => {
    task < 1 ? (arg = currentKeys, /*#__NOINLINE__*/ esc!(HandlerResult.Nothing))
      : task < 2 ? /*#__INLINE__*/ set_clickable_(arg as ElementSet)
      : /*#__INLINE__*/ set_VTr(arg as VTransType)
    return arg
  }], s: hudCopied, t: hudTip, m: getMappedKey,
  x: flash_,
  y: () => (Build.BTypes & BrowserType.Firefox ? {
    w: onWndFocus, b: find_box, c: clickable_, f: findCSS, g: setUICSS, k: scroll_keyIsDown, r: ui_root, s: styleInHUD
  } : { b: find_box, c: clickable_, f: findCSS, g: setUICSS, k: scroll_keyIsDown, r: ui_root, s: styleInHUD })
})

if (!(Build.BTypes & BrowserType.Firefox)) { /* empty */ }
else if (Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox || injector !== void 0) {
    /*#__INLINE__*/ set_getWndVApi_ff(wnd => wnd.VApi);
    /*#__INLINE__*/ set_getParentVApi(() => frameElement_() && (parent as Window).VApi)
} else {
    coreTester = {
      n: BuildStr.CoreGetterFuncName,
      k: 0,
      r: 0,
      s: 0,
      e (trustedRand: number, unsafeRand: number): string {
        trustedRand += (unsafeRand >= 0 && unsafeRand < 1 ? unsafeRand : trustedRand);
        let a = (0x8000 * trustedRand) | 0,
        host = new URL((browser as typeof chrome).runtime.getURL("")).host.replace(<RegExpG> /-/g, "");
        return ((host + (
              typeof BuildStr.RandomReq === "number" ? (BuildStr.RandomReq as number | string as number).toString(16)
              : BuildStr.RandomReq)
            ).match(<RegExpG> /[\da-f]{1,4}/gi)!
            ).map((i, ind) => parseInt(i, 16) & (ind & 1 ? ~a : a)).join("");
      },
      c (rand2: number, testEncrypted: string): boolean {
        const diff = coreTester.e(coreTester.k, +rand2) !== testEncrypted, d2 = coreTester.r > 64;
        coreTester.r += d2 ? 0 : diff ? 2 : 1;
        return diff || d2; // hide the real result if too many errors
      }
    };
    /** Note: this function needs to be safe enough */
    /*#__INLINE__*/ set_getWndVApi_ff((anotherWnd: Window): VApiTy | null | void => {
      coreTester.r = -1;
      // Sometimes a `anotherWnd` has neither `.wrappedJSObject` nor `coreTester`,
      // usually when a child frame is hidden. Tested on QQMail (destkop version) on Firefox 74.
      // So add `|| anotherWnd` for less exceptions
      try {
        let core: ReturnType<SandboxGetterFunc>,
        wrapper = (anotherWnd.wrappedJSObject || anotherWnd)[coreTester.n], getter = wrapper && wrapper._get;
        return getter && (core = getter(coreTester.c, coreTester.k = Math.random())) &&
          !coreTester.r ? core : null;
      } catch {}
    })
    // on Firefox, such a exported function can only be called from privileged environments
    wrappedJSObject[coreTester.n] = Object.defineProperty<SandboxGetterFunc>(
        (new window.Object() as any).wrappedJSObject as object,
        "_get", { configurable: false, enumerable: false, writable: false,
                  value (comparer, rand1) {
      let rand2 = Math.random();
      // an ES6 method function is always using the strict mode, so the arguments are inaccessible outside it
      if (coreTester.s > GlobalConsts.MaxRetryTimesForSecret
          // if `comparer` is a Proxy, then `toString` returns "[native code]", so the line below is safe
          || hook.toString.call(comparer) !== coreTester.c + ""
          || comparer(rand2, coreTester.e(rand2, +rand1))) {
        if (coreTester.s <= GlobalConsts.MaxRetryTimesForSecret) {
          coreTester.s++;
        }
        return;
      }
      return vApi;
    }});
}
if (!(isTop || injector)) {
  const parApi = frameElement_() && getParentVApi();
  if (!parApi) {
      if ((Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
          || WeakSet) && <boolean> grabBackFocus) {
        /*#__INLINE__*/ enableNeedToRetryParentClickable()
        if (Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
            || (Build.MinCVer >= BrowserVer.Min$Set$Has$$forEach ? Set : Set && Set.prototype.forEach)) {
          /*#__INLINE__*/ set_clickable_(new Set!<Element>())
        } else {
          type ElementArraySet = Element[] & ElementSet
          /*#__INLINE__*/ set_clickable_([] as any as ElementArraySet)
          clickable_.add = (clickable_ as ElementArraySet).push;
          // a temp collection on a very old Chrome, so it's okay just to ignore its elements
          clickable_.has =
              Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes || !(Build.BTypes & BrowserType.Chrome)
              ? (clickable_ as ElementArraySet).includes! : () => !1;
        }
      }
  } else if (Build.BTypes & BrowserType.Firefox) {
    /*#__NOINLINE__*/ (function (): void {
      try { // `vApi` is still unsafe
          const state = parApi.y()
          if ((!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox
                ? state.b && XPCNativeWrapper(state.b) : state.b) === frameElement_()) {
            safeDestroy(1);
            parApi.n()
          } else {
            /*#__INLINE__*/ set_clickable_(state.c)
          }
          return;
      } catch (e) {
        if (!Build.NDEBUG) {
          console.log("Assert error: Parent frame check breaks:", e);
        }
      }
      if ((!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
          && <boolean> /** is_readyState_loading */ grabBackFocus) {
        // here the parent `core` is invalid - maybe from a fake provider
        /*#__INLINE__*/ set_getParentVApi(() => null);
      }
    })()
  } else {
      // if not `vfind`, then a parent may have destroyed for unknown reasons
      if (parApi.y().b === frameElement_()) {
        safeDestroy(1);
        parApi.n();
      } else {
        /*#__INLINE__*/ set_clickable_(parApi.y().c)
      }
  }
}

if (isAlive_) {
    interface ElementWithClickable { vimiumClick?: boolean }
    /*#__INLINE__*/ set_clickable_(!(Build.BTypes & BrowserType.Firefox)
        || Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox
        ? clickable_ ||
          (Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
              || WeakSet ? new WeakSet!<Element>() as never : {
            add (element: Element): any { (element as ElementWithClickable).vimiumClick = true; },
            has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumClick; }
          })
        : /* now know it's on Firefox */ clickable_ || new WeakSet!<Element>())
    // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
    hook(HookAction.Install);
    if (initialDocState < "i") {
      /*#__INLINE__*/ set_OnDocLoaded_(callFunc)
    } else {
      /*#__INLINE__*/ set_OnDocLoaded_((callback, onloaded) => {
        readyState_ < "l" && !onloaded ? callback() : (onloaded ? completeListeners : docReadyListeners).push(callback)
      })
    }

    runtimeConnect();

  if (injector === void 0) {
    /*#__INLINE__*/ extend_click()
  } else {
    /*#__INLINE__*/ set_allowScripts_(0)
  }

  initialDocState < "i" || setupEventListener(0, RSC, function _onReadyStateChange(): void {
    set_readyState_(doc.readyState)
    const loaded = readyState_ < "i", arr = loaded ? completeListeners : docReadyListeners
    if (loaded) {
      set_OnDocLoaded_(callFunc)
      setupEventListener(0, RSC, _onReadyStateChange, 1)
    }
    arr.forEach(callFunc)
    arr.length = 0
  })
}

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
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
