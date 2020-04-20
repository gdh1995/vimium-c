/// <reference path="../lib/base.d.ts" />

import {
  doc, isTop, isEnabled_, injector, VOther, initialDocState, setEsc, esc, setupEventListener, setVEnabled,
  setClickable, clickable_, isLocked_, isAlive_, setTr, timeout_,
} from "../lib/utils.js"
import {
  safePost, setRuntimePort, runtime_port, Port, SafeDestoryF, setSafeDestroy,
  setRuntimeConnect, runtimeConnect,
} from "../lib/port.js"
import {
  ui_box, adjustUI, doExitOnClick, getParentVApi, setParentVApiGetter, style_ui, setGetWndVApi,
} from "./dom_ui.js"
import { grabBackFocus } from "./mode_insert.js"
import { currentKeys, passKeys } from "./key_handler.js"
import { contentCommands_ } from "./commands.js"
import { requestHandlers, hook, enableNeedToRetryParentClickable } from "./request_handler.js"

import { main as extend_click } from  "./extend_click.js"
import * as VDom from "../lib/dom_utils.js"

  let coreTester: { name_: string; rand_: number; recvTick_: number; sendTick_: number;
        encrypt_ (trustedRand: number, unsafeRand: number): string;
        compare_: Parameters<SandboxGetterFunc>[0]; }

setSafeDestroy(safeDestroy)

function safeDestroy (silent?: Parameters<SafeDestoryF>[0]): void {
    if (!isAlive_) { return; }
    if (Build.BTypes & BrowserType.Firefox && silent === 9) {
      /*#__INLINE__*/ setRuntimePort(null)
      return;
    }
    /*#__INLINE__*/ setVEnabled(!1)
    hook(HookAction.Destroy);

    contentCommands_[kFgCmd.reset](0);
    VApi.execute_ && VApi.execute_(kContentCmd.Destroy);
    ui_box && adjustUI(2);
    doExitOnClick();

    /*#__INLINE__*/ setEsc(null as never)
    VApi = null as never;

    silent || console.log("%cVimium C%c in %o has been destroyed at %o."
      , "color:red", "color:auto"
      , location.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1")
      , Date.now());

    if (runtime_port) { try { runtime_port.disconnect(); } catch {} }
    injector || (<RegExpOne> /a?/).test("");
}

  if (injector) {
    injector.$p = [safePost, function () {
      let keys = currentKeys; esc!(HandlerResult.Nothing); return keys;
    }, setClickable];
  }

  if (!(Build.BTypes & BrowserType.Firefox)) { /* empty */ }
  else if (Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox || injector !== void 0) {
    /*#__INLINE__*/ setGetWndVApi(wnd => wnd.VApi);
    /*#__INLINE__*/ setParentVApiGetter(() => VDom.frameElement_() && (parent as Window).VApi)
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
    /*#__INLINE__*/ setGetWndVApi((anotherWnd: Window): VApiTy | null | void => {
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
  isTop || injector ||
  function (): void { // if injected, `parentFrame_` still needs a value
    const parEl = VDom.frameElement_();
    if (!parEl) {
      if ((Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
          || WeakSet) && <boolean> grabBackFocus) {
        /*#__INLINE__*/ enableNeedToRetryParentClickable()
        if (Build.MinCVer >= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
            || Set) {
          /*#__INLINE__*/ setClickable(new Set!<Element>())
        } else {
          let arr: Element[] & ElementSet = [] as any;
          /*#__INLINE__*/ setClickable(arr)
          arr.add = arr.push;
          // a temp collection, so it's okay just to ignore its elements
          arr.has = Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes || !(Build.BTypes & BrowserType.Chrome)
              ? arr.includes! : () => !1;
        }
      }
      return;
    }
    const parApi = getParentVApi();
    if (Build.BTypes & BrowserType.Firefox) {
      try { // `vApi` is still unsafe
      if (parApi) {
          const state = parApi.misc_()
          if ((!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox
                ? state.find_box_ && XPCNativeWrapper(state.find_box_) : state.find_box_) === parEl) {
            safeDestroy(1);
            parApi.findOnLoad_()
          } else {
            /*#__INLINE__*/ setClickable(state.clickable_)
          }
          return;
        }
      } catch (e) {
        if (!Build.NDEBUG) {
          console.log("Assert error: Parent frame check breaks:", e);
        }
      }
      if ((!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)
          && <boolean> /** is_readyState_loading */ grabBackFocus) {
        // here the parent `core` is invalid - maybe from a fake provider
        /*#__INLINE__*/ setParentVApiGetter(() => null);
      }
    } else {
      // if not `vfind`, then a parent may have destroyed for unknown reasons
      const state = parApi && parApi.misc_()
      if (state && state.find_box_ === parEl) {
        safeDestroy(1);
        parApi!.findOnLoad_();
      } else {
        /*#__INLINE__*/ setClickable(parApi as never && state!.clickable_)
      }
    }
  }();
  if (isAlive_) {
    interface ElementWithClickable { vimiumClick?: boolean }
    /*#__INLINE__*/ setClickable(!(Build.BTypes & BrowserType.Firefox)
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
    {
      let execute = (callback: (this: void) => void): void => { callback(); },
      listeners1: Array<(this: void) => void> = [], listeners2: Array<(this: void) => void> = [],
      Name = "readystatechange",
      onReadyStateChange = function (): void {
        const stat = doc.readyState, loaded = stat < "i", arr = loaded ? listeners2 : listeners1;
        VDom.setReadyState(stat)
        if (loaded) {
          setupEventListener(0, Name, onReadyStateChange, 1);
          /*#__INLINE__*/ VDom.setOnDocLoaded(execute)
          onReadyStateChange = execute as any
        }
        arr.forEach(execute);
        arr.length = 0;
      };
      /*#__INLINE__*/ VDom.setOnDocLoaded(initialDocState < "i" ? execute : (
      setupEventListener(0, Name, onReadyStateChange),
          (callback, onloaded) => {
        VDom.readyState_ < "l" && !onloaded ? callback() : (onloaded ? listeners2 : listeners1).push(callback);
      }))
    }
    
    /*#__INLINE__*/ setRuntimeConnect((function (this: void): void {
      const api = Build.BTypes & ~BrowserType.Chrome
          && (!(Build.BTypes & BrowserType.Chrome) || VOther !== BrowserType.Chrome)
          ? browser as typeof chrome : chrome,
      status = requestHandlers[0] ? PortType.initing
        : (isEnabled_ ? passKeys ? PortType.knownPartial : PortType.knownEnabled : PortType.knownDisabled)
        + (isLocked_ ? PortType.isLocked : 0) + (style_ui ? PortType.hasCSS : 0),
      name = PortType.isTop * +isTop + PortType.hasFocus * +doc.hasFocus() + status,
      data = { name: injector ? PortNameEnum.Prefix + name + injector.$h
          : !(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && VOther & BrowserType.Edge
          ? name + PortNameEnum.Delimiter + location.href
          : "" + name
      },
      connect = api.runtime.connect, trans = api.i18n.getMessage,
      port = injector ? connect(injector.id, data) as Port : connect(data) as Port
      /*#__INLINE__*/ setRuntimePort(port)
      port.onDisconnect.addListener((): void => {
        /*#__INLINE__*/ setRuntimePort(null)
        timeout_(function (i): void {
          if (!(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i)) {
            try { runtime_port || !isAlive_ || runtimeConnect(); return; } catch {}
          }
          safeDestroy();
        }, requestHandlers[kBgReq.init] ? 2000 : 5000);
      });
      port.onMessage.addListener(<T extends keyof BgReq> (response: Req.bg<T>): void => {
        type TypeToCheck = { [k in keyof BgReq]: (this: void, request: BgReq[k]) => void };
        type TypeChecked = { [k in keyof BgReq]: <T2 extends keyof BgReq>(this: void, request: BgReq[T2]) => void };
        (requestHandlers as TypeToCheck as TypeChecked)[response.N](response);
      });
      setTr((tid, args) => trans("" + tid, args));
    }))
    runtimeConnect();
    if (injector === void 0) {
      /*#__INLINE__*/ extend_click();
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
