/// <reference path="../lib/base.d.ts" />

import {
  doc, isTop, injector, VOther, initialDocState, set_esc, esc, setupEventListener, set_isEnabled_,
  set_clickable_, clickable_, isAlive_, set_VTr, setupKeydownEvents, onWndFocus,
  set_readyState_, readyState_, loc_, set_allowScripts_, callFunc,
} from "../lib/utils"
import { suppressTail_, key_ } from "../lib/keyboard_utils"
import { frameElement_, set_OnDocLoaded_ } from "../lib/dom_utils"
import {
  safePost, clearRuntimePort, runtime_port, SafeDestoryF, set_safeDestroy,
  runtimeConnect, safeDestroy, post_, send_,
} from "./port"
import {
  ui_box, adjustUI, doExitOnClick, getParentVApi, set_getParentVApi, set_getWndVApi_ff, learnCSS,
  setUICSS, addUIElement, ui_root, flash_,
} from "./dom_ui"
import { grabBackFocus, insert_Lock_ } from "./mode_insert"
import { currentKeys } from "./key_handler"
import { contentCommands_ } from "./commands"
import { hook, enableNeedToRetryParentClickable, focusAndRun } from "./request_handler"

import { main as extend_click } from  "./extend_click.js"
import { activate as linkActivate, coreHints } from "./link_hints"
import { executeScroll, scrollTick, $sc, keyIsDown as scroll_keyIsDown } from "./scroller"
import { hudTip } from "./hud"
import { onLoad as findOnLoad, find_box, findCSS, styleInHUD } from "./mode_find"
import { activate as omniActivate } from "./vomnibar"

const docReadyListeners: Array<(this: void) => void> = [], completeListeners: Array<(this: void) => void> = []
const kReadystatechange = "readystatechange"

let coreTester: { name_: string; rand_: number; recvTick_: number; sendTick_: number;
        encrypt_ (trustedRand: number, unsafeRand: number): string;
        compare_: Parameters<SandboxGetterFunc>[0]; }
  

set_safeDestroy((silent?: Parameters<SafeDestoryF>[0]): void => {
    if (!isAlive_) { return; }
    if (Build.BTypes & BrowserType.Firefox && silent === 9) {
      /*#__INLINE__*/ clearRuntimePort()
      return;
    }
    /*#__INLINE__*/ set_isEnabled_(!1)
    hook(HookAction.Destroy);

    contentCommands_[kFgCmd.reset](0);
    VApi.e && VApi.e(kContentCmd.Destroy);
    ui_box && adjustUI(2);
    doExitOnClick();

    /*#__INLINE__*/ set_esc(null as never)
    VApi = null as never;

    silent || console.log("%cVimium C%c in %o has been destroyed at %o."
      , "color:red", "color:auto"
      , loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
      , Date.now());

    if (runtime_port) { try { runtime_port.disconnect(); } catch {} }
    injector || (<RegExpOne> /a?/).test("");
})

VApi = {
  b: coreHints, e: null, z: null,
  p: post_, s: send_, a: setupKeydownEvents, f: focusAndRun, d: safeDestroy,
  h: linkActivate, o: omniActivate, n: findOnLoad, c: executeScroll,
  k: scrollTick, $: $sc, l: learnCSS, u: suppressTail_,
  i: Build.BTypes & BrowserType.Firefox ? () => innerHeight : 0 as never,
  r: injector && set_VTr, t: hudTip, m: key_, q: insert_Lock_,
  g: setUICSS, w: addUIElement, x: flash_,
  y () {
    return {
      w: onWndFocus,
      b: find_box,
      k: scroll_keyIsDown,
      c: clickable_,
      r: ui_root,
      f: findCSS,
      s: styleInHUD
    }
  }
}

if (!(Build.BTypes & BrowserType.Firefox)) { /* empty */ }
else if (Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox || injector !== void 0) {
    /*#__INLINE__*/ set_getWndVApi_ff(wnd => wnd.VApi);
    /*#__INLINE__*/ set_getParentVApi(() => frameElement_() && (parent as Window).VApi)
} else {
    coreTester = {
      name_: BuildStr.CoreGetterFuncName as const,
      rand_: 0,
      recvTick_: 0,
      sendTick_: 0,
      encrypt_ (trustedRand: number, unsafeRand: number): string {
        trustedRand += (unsafeRand >= 0 && unsafeRand < 1 ? unsafeRand : trustedRand);
        let a = (0x8000 * trustedRand) | 0,
        host = new URL((browser as typeof chrome).runtime.getURL("")).host.replace(<RegExpG> /-/g, "");
        return ((host + (
              typeof BuildStr.RandomReq === "number" ? (BuildStr.RandomReq as number | string as number).toString(16)
              : BuildStr.RandomReq)
            ).match(<RegExpG> /[\da-f]{1,4}/gi)!
            ).map((i, ind) => parseInt(i, 16) & (ind & 1 ? ~a : a)).join("");
      },
      compare_ (rand2: number, testEncrypted: string): boolean {
        const diff = coreTester.encrypt_(coreTester.rand_, +rand2) !== testEncrypted, d2 = coreTester.recvTick_ > 64;
        coreTester.recvTick_ += d2 ? 0 : diff ? 2 : 1;
        return diff || d2; // hide the real result if too many errors
      }
    };
    /** Note: this function needs to be safe enough */
    /*#__INLINE__*/ set_getWndVApi_ff((anotherWnd: Window): VApiTy | null | void => {
      coreTester.recvTick_ = -1;
      try {
        let core: ReturnType<SandboxGetterFunc>,
        wrapper = anotherWnd.wrappedJSObject[coreTester.name_], getter = wrapper && wrapper._get;
        return getter && (core = getter(coreTester.compare_, coreTester.rand_ = Math.random())) &&
          !coreTester.recvTick_ ? core : null;
      } catch {}
    })
    // on Firefox, such a exported function can only be called from privileged environments
    wrappedJSObject[coreTester.name_] = Object.defineProperty<SandboxGetterFunc>(
        (new window.Object() as any).wrappedJSObject as object,
        "_get", { configurable: false, enumerable: false, writable: false,
                  value (comparer, rand1) {
      let rand2 = Math.random();
      // an ES6 method function is always using the strict mode, so the arguments are inaccessible outside it
      if (coreTester.sendTick_ > GlobalConsts.MaxRetryTimesForSecret
          // if `comparer` is a Proxy, then `toString` returns "[native code]", so the line below is safe
          || hook.toString.call(comparer) !== coreTester.compare_ + ""
          || comparer(rand2, coreTester.encrypt_(rand2, +rand1))) {
        if (coreTester.sendTick_ <= GlobalConsts.MaxRetryTimesForSecret) {
          coreTester.sendTick_++;
        }
        return;
      }
      return VApi;
    }});
}
if (!(isTop || injector)) {
  const parApi = frameElement_() && getParentVApi();
  if (!parApi) {
      if ((Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
          || WeakSet) && <boolean> grabBackFocus) {
        /*#__INLINE__*/ enableNeedToRetryParentClickable()
        if (Build.MinCVer >= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
            || Set) {
          /*#__INLINE__*/ set_clickable_(new Set!<Element>())
        } else {
          type ElementArraySet = Element[] & ElementSet
          /*#__INLINE__*/ set_clickable_([] as any as ElementArraySet)
          clickable_.add = (clickable_ as ElementArraySet).push;
          // a temp collection, so it's okay just to ignore its elements
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
        ( Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
            || WeakSet ? new WeakSet!<Element>() as never : {
      add (element: Element): any { (element as ElementWithClickable).vimiumClick = true; },
      has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumClick; }
    }) : /* now know it's on Firefox */
        clickable_ || new WeakSet!<Element>())
    // here we call it before vPort.connect, so that the code works well even if runtime.connect is sync
    hook(HookAction.Install);
    if (initialDocState < "i") {
      /*#__INLINE__*/ set_OnDocLoaded_(callFunc)
    } else {
      setupEventListener(0, kReadystatechange, function onReadyStateChange(): void {
        const stat = doc.readyState, loaded = stat < "i", arr = loaded ? completeListeners : docReadyListeners;
        /*#__INLINE__*/ set_readyState_(stat)
        if (loaded) {
          setupEventListener(0, kReadystatechange, onReadyStateChange, 1);
          /*#__INLINE__*/ set_OnDocLoaded_(callFunc)
        }
        arr.forEach(callFunc);
        arr.length = 0;
      })
      /*#__INLINE__*/ set_OnDocLoaded_((callback, onloaded) => {
        readyState_ < "l" && !onloaded ? callback() : (onloaded ? completeListeners : docReadyListeners).push(callback)
      })
    }

    runtimeConnect();

  if (injector === void 0) {
      /*#__INLINE__*/ extend_click();
  } else if (/*#__INLINE__*/ set_allowScripts_(0), injector) {
    injector.$p = [safePost, function () {
      let keys = currentKeys; esc!(HandlerResult.Nothing); return keys;
    }, set_clickable_];
  }
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
