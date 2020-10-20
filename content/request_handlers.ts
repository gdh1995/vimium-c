import {
  chromeVer_, clickable_, doc, esc, fgCache, injector, isEnabled_, isLocked_, isAlive_, isTop, math,
  keydownEvents_, safeObj, set_chromeVer_, set_clickable_, set_fgCache, set_VOther, set_isLocked_,
  set_isEnabled_, set_onWndFocus, VOther, onWndFocus, timeout_, safer,
  interval_, getTime, vApi, clearInterval_, locHref,
} from "../lib/utils"
import { set_keyIdCorrectionOffset_old_cr_, handler_stack } from "../lib/keyboard_utils"
import {
  editableTypes_, markFramesetTagUnsafe, setNotSafe_not_ff, OnDocLoaded_, frameElement_, BU,
  htmlTag_, querySelector_unsafe_, isHTML_, createElement_, setClassName_s,
  docEl_unsafe_, scrollIntoView_, activeEl_unsafe_, CLK, ElementProto, isIFrameElement, DAC, removeEl_s, toggleClass
} from "../lib/dom_utils"
import {
  port_callbacks, post_, safePost, set_requestHandlers, requestHandlers, hookOnWnd, set_hookOnWnd,
  contentCommands_,
} from "./port"
import {
  addUIElement, adjustUI, createStyle, getParentVApi, getBoxTagName_cr_, setUICSS, ui_box, evalIfOK, checkHidden,
} from "./dom_ui"
import { hudTip, hud_box } from "./hud"
import {
  currentKeys, mappedKeys, set_keyFSM, anyClickHandler, onKeydown, onKeyup, passKeys,
  set_isPassKeysReversed, isPassKeysReversed, set_passKeys, set_mappedKeys, set_mapKeyTypes,
} from "./key_handler"
import { HintManager, kSafeAllSelector, set_kSafeAllSelector } from "./link_hints"
import { createMark } from "./marks"
import { set_findCSS, styleInHUD, styleSelectable } from "./mode_find"
import { exitGrab, grabBackFocus, insertInit, set_grabBackFocus, onFocus, onBlur } from "./insert"
import { onActivate } from "./scroller"
import { omni_status, omni_box } from "./omni"

let framemask_more = false
let framemask_node: HTMLDivElement | null = null
let framemask_fmTimer = TimerID.None
let needToRetryParentClickable: BOOL = 0

/** require `WeakSet` MUST exist; should ensure `clickable_.forEach` MUST exist */
export const enableNeedToRetryParentClickable = (): void => { needToRetryParentClickable = 1 }

set_requestHandlers([
  /* kBgReq.init: */ function (request: BgReq[kBgReq.init]): void {
    const load = request.c, flags = request.s
    if (Build.BTypes & BrowserType.Chrome) {
      /*#__INLINE__*/ set_chromeVer_(load.v as BrowserVer);
    }
    if (<number> Build.BTypes !== BrowserType.Chrome && <number> Build.BTypes !== BrowserType.Firefox
        && <number> Build.BTypes !== BrowserType.Edge) {
      /*#__INLINE__*/ set_VOther(load.b!)
    }
    /*#__INLINE__*/ set_fgCache(vApi.z = load)
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      load.o || /*#__INLINE__*/ set_keyIdCorrectionOffset_old_cr_(300);
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoKeygenElement
        || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinNoKeygenElement) {
      /** here should keep the same as {@link ../background/settings.ts#Settings_.payload_} */
      if (Build.BTypes & BrowserType.Chrome
          ? Build.MinCVer < BrowserVer.MinNoKeygenElement && chromeVer_ < BrowserVer.MinNoKeygenElement
          : Build.BTypes & BrowserType.Firefox
          ? Build.MinFFVer < FirefoxBrowserVer.MinNoKeygenElement
            && <FirefoxBrowserVer | 0> load.v < FirefoxBrowserVer.MinNoKeygenElement
          : false) {
        (editableTypes_ as Writable<typeof editableTypes_>).keygen = EditableType.Select;
      }
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
        && chromeVer_ < BrowserVer.MinFramesetHasNoNamedGetter) {
      set_kSafeAllSelector(kSafeAllSelector + ":not(" + (/*#__INLINE__*/ markFramesetTagUnsafe()) + ")");
    }
    if (Build.BTypes & ~BrowserType.Firefox && Build.BTypes & BrowserType.Firefox
        && VOther === BrowserType.Firefox) {
      setNotSafe_not_ff((_el): _el is HTMLFormElement => false)
    }
    if (flags) {
      /*#__INLINE__*/ set_grabBackFocus(grabBackFocus && !(flags & Frames.Flags.userActed))
      set_isLocked_(Frames.Flags.locked === 1 ? (flags & Frames.Flags.locked) as BOOL
          : flags & Frames.Flags.locked ? 1 : 0)
    }
    requestHandlers[kBgReq.keyFSM](request);
    (requestHandlers[kBgReq.reset] as (request: BgReq[kBgReq.reset], initing?: 1) => void)(request, 1);
    if (isEnabled_) {
      insertInit();
      if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
          && Build.BTypes & BrowserType.Chrome
          && chromeVer_ > BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow - 1) {
        hookOnWnd(HookAction.SuppressListenersOnDocument);
      }
    } else {
      /*#__INLINE__*/ set_grabBackFocus(false)
      hookOnWnd(HookAction.Suppress);
      vApi.e && vApi.e(kContentCmd.SuppressClickable);
    }
    requestHandlers[kBgReq.init] = null as never;
    OnDocLoaded_(function (): void {
      /*#__INLINE__*/ set_onWndFocus(safePost.bind(0, <Req.fg<kFgReq.onFrameFocused>> { H: kFgReq.onFrameFocused }))
      timeout_(function (): void {
        const parApi = !(Build.BTypes & ~BrowserType.Firefox)
            || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
            ? getParentVApi() : frameElement_() && getParentVApi(),
        oldSet = clickable_ as any as Element[] & Set<Element>,
        parHints = parApi && parApi.b as HintManager;
        if (!needToRetryParentClickable) { /* empty */ }
        else if (!Build.NDEBUG && parApi) {
          let count = 0;
          set_clickable_(parApi.y().c)
          oldSet.forEach(el => { clickable_.has(el) || (clickable_.add(el), count++) })
          console.log(`Vimium C: extend click: ${count ? "add " + count : "no"} local items to the parent's set.`);
        } else if (Build.MinCVer < BrowserVer.MinNewWeakSetWithSetOrArray && Build.BTypes & BrowserType.Chrome) {
          set_clickable_(parApi ? parApi.y().c : new WeakSet!<Element>())
          oldSet.forEach(clickable_.add, clickable_)
        } else if (parApi) {
          set_clickable_(parApi.y().c)
          oldSet.forEach(clickable_.add, clickable_);
        } else {
          set_clickable_(new WeakSet!<Element>(oldSet))
        }
        const manager = parHints && parHints.p || parHints
        manager && manager.h > 1 && getTime() - manager.h < 1200 && manager.i(1)
      }, 330);
    });
    injector && injector.$r(InjectorTask.extInited);
  },
  /* kBgReq.reset: */ function (request: BgReq[kBgReq.reset], initing?: 1): void {
    const newPassKeys = request.p, newEnabled = newPassKeys !== "", old = isEnabled_;
    /*#__INLINE__*/ set_passKeys(newPassKeys && safeObj<1>(null))
    if (newPassKeys) {
      /*#__INLINE__*/ set_isPassKeysReversed(newPassKeys[0] === "^" && newPassKeys.length > 2);
      for (const keyStr of (isPassKeysReversed ? newPassKeys.slice(2) : newPassKeys).split(" ")) {
        (passKeys as SafeDict<1>)[keyStr] = 1;
      }
    }
    /*#__INLINE__*/ set_isEnabled_(newEnabled);
    if (initing) {
      return;
    }
    /*#__INLINE__*/ set_isLocked_(request.f!)
    // if true, recover listeners on shadow roots;
    // otherwise listeners on shadow roots will be removed on next blur events
    if (newEnabled) {
      esc!(HandlerResult.Nothing); // for passNextKey#normal
      old || insertInit();
      (old && !isLocked_) || hookOnWnd(HookAction.Install);
      // here should not return even if old - a url change may mean the fullscreen mode is changed
    } else {
      contentCommands_[kFgCmd.insertMode]({r: 1})
    }
    if (ui_box) { adjustUI(+newEnabled ? 1 : 2); }
  },
  /* kBgReq.injectorRun: */ injector ? injector.$m : 0 as never,
  /* kBgReq.url: */ function<T extends keyof FgReq> (this: void, request: BgReq[kBgReq.url] & Req.fg<T>): void {
    delete request.N
    request.u = (request.H === kFgReq.copy ? vApi.u : locHref)()
    post_<T>(request);
  },
  /* kBgReq.msg: */ function<k extends keyof FgRes> (response: Omit<Req.res<k>, "N">): void {
    const id = response.m, handler = port_callbacks[id];
    delete port_callbacks[id];
    handler(response.r);
  },
  /* kBgReq.eval: */ evalIfOK,
  /* kBgReq.settingsUpdate: */function ({ d: delta }: BgReq[kBgReq.settingsUpdate]): void {
    type Keys = keyof typeof delta;
    safer(delta);
    for (const i in delta) {
      (fgCache as Generalized<typeof fgCache>)[i as Keys] = (delta as EnsureItemsNonNull<typeof delta>)[i as Keys];
      const i2 = "_" + i as Keys;
      (i2 in fgCache) && (safer(fgCache)[i2] = void 0 as never);
    }
    delta.d != null && hud_box && toggleClass(hud_box, "D", !!delta.d)
  },
  /* kBgReq.focusFrame: */ (req: BgReq[kBgReq.focusFrame]): void => {
    // Note: .c, .S are ensured to exist
    let mask = req.m, div: Element | null;
    req.H && setUICSS(req.H);
    if (mask !== FrameMaskType.NormalNext) { /* empty */ }
    else if (checkHidden()
      // check <div> to detect whether no other visible elements except <frame>s in this frame
      || (doc.body && htmlTag_(doc.body) === "frameset")
          && (div = querySelector_unsafe_("div"), !div || div === ui_box && !handler_stack.length)
    ) {
      post_({
        H: kFgReq.nextFrame,
        k: req.k
      });
      return;
    }
    mask && timeout_((): void => { vApi.f() }, 1); // require FrameMaskType.NoMaskAndNoFocus is 0
    if (req.c) {
      type TypeChecked = { [key1 in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
          options: CmdOptions[T2] & FgOptions, count: number) => void; };
      (contentCommands_ as TypeChecked)[req.c](req.a!, req.n!);
    }
    keydownEvents_[req.k] = 1;
    showFrameMask(mask);
  },
  /* kBgReq.exitGrab: */ exitGrab as (this: void, request: Req.bg<kBgReq.exitGrab>) => void,
  /* kBgReq.keyFSM: */ function (request: BgReq[kBgReq.keyFSM]): void {
    safer(set_keyFSM(request.k))
    set_mapKeyTypes(request.t)
    /*#__INLINE__*/ set_mappedKeys(request.m)
    mappedKeys && safer(mappedKeys)
  },
  /* kBgReq.execute: */ function<O extends keyof CmdOptions> (request: BaseExecute<CmdOptions[O], O>): void {
    if (request.H) { setUICSS(request.H); }
    esc!(HandlerResult.Nothing);
    const options: CmdOptions[O] | null = request.a;
    type Keys = keyof CmdOptions;
    type TypeToCheck = {
      [key in Keys]: (this: void, options: CmdOptions[key] & SafeObject, count: number) => void;
    };
    type TypeChecked = {
      [key in Keys]: <T2 extends Keys>(this: void, options: CmdOptions[T2] & SafeObject, count: number) => void;
    };
    (contentCommands_ as TypeToCheck as TypeChecked)[request.c](options ? safer(options) : safeObj(null), request.n);
  } as (req: BaseExecute<object, keyof CmdOptions>) => void,
  /* kBgReq.createMark: */ createMark,
  /* kBgReq.showHUD: */ <VApiTy["t"]> function (req: BgReq[kBgReq.showHUD]): void {
    if (req.H) {
      setUICSS(req.H);
      if (req.f) {
        /*#__INLINE__*/ set_findCSS(req.f)
        styleInHUD && createStyle(req.f.i, styleInHUD)
        styleSelectable && createStyle(req.f.s, styleSelectable)
      }
    }
    req.k ? hudTip(req.k, req.d, [req.t || ""]) : 0
  },
  /* kBgReq.count: */ function (request: BgReq[kBgReq.count]): void {
    let n = parseInt(currentKeys, 10) || 1, count2: 0 | 1 | 2 | 3 = 0;
    esc!(HandlerResult.Nothing);
    exitGrab();
    if (Build.BTypes & ~BrowserType.Chrome && request.m) {
      const now = getTime(), result = confirm(request.m);
      count2 = math.abs(getTime() - now) > 9 ? result ? 3 : 1 : 2
    }
    post_({ H: kFgReq.cmd, c: request.c, n, i: request.i, r: count2 });
  }
])

export const showFrameMask = (mask: FrameMaskType): void => {
  if (!isTop && mask === FrameMaskType.NormalNext) {
    let docEl = docEl_unsafe_();
    if (docEl) {
    Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
      && (!(Build.BTypes & ~BrowserType.Chrome) || chromeVer_ < BrowserVer.MinScrollIntoViewOptions)
    ? ElementProto().scrollIntoViewIfNeeded!.call(docEl)
    : scrollIntoView_(docEl);
    }
  }
  if (mask < FrameMaskType.minWillMask || !isHTML_()) { return; }
  if (framemask_node) {
    framemask_more = true;
  } else {
    framemask_node = createElement_(Build.BTypes & BrowserType.Chrome ? getBoxTagName_cr_() : "div")
    setClassName_s(framemask_node, "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : ""))
    framemask_fmTimer = interval_((fake?: TimerType.fake): void => { // safe-interval
      const more_ = framemask_more;
      framemask_more = false;
      if (more_ && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                      && fake)) { return; }
      if (framemask_node) { removeEl_s(framemask_node); framemask_node = null; }
      clearInterval_(framemask_fmTimer);
    }, isTop ? 200 : 350);
  }
  addUIElement(framemask_node);
}

set_hookOnWnd(((action: HookAction): void => {
  let f = action ? removeEventListener : addEventListener
  if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
      && Build.BTypes & BrowserType.Chrome) {
    if (!(Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome)
        && (action || chromeVer_ < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)) {
      f.call(doc, DAC, onActivate, true)
      f.call(doc, CLK, anyClickHandler, true);
    }
    if (action === HookAction.SuppressListenersOnDocument) { return; }
  }
  f("keydown", onKeydown, true);
  f("keyup", onKeyup, true);
  action !== HookAction.Suppress && f("focus", onFocus, true);
  f(BU, onBlur, true);
  if (!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome) {
    f(CLK, anyClickHandler, true);
  }
  f(Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome
      ? CLK : DAC, onActivate, true)
}))

export const focusAndRun = (cmd?: FgCmdAcrossFrames, options?: FgOptions, count?: number, showBorder?: 1 | 2): void => {
  exitGrab();
  let oldOnWndFocus = onWndFocus, failed = true;
  /*#__INLINE__*/ set_onWndFocus((): void => { failed = false; })
  if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox) {
    omni_status === VomnibarNS.Status.Showing && omni_box.blur()
    // cur is safe because on Firefox
    const cur = activeEl_unsafe_() as SafeElement | null;
    cur && isIFrameElement(cur) && cur.blur()
  }
  focus();
  /** Maybe a `doc.open()` has been called
   * Step 8 of https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#document-open-steps
   * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/doc.cc?q=Document::open&l=3107
   */
  (failed || !isEnabled_) && hookOnWnd(HookAction.Install)
  // the line below is always necessary: see https://github.com/philc/vimium/issues/2551#issuecomment-316113725
  /*#__INLINE__*/ set_onWndFocus(oldOnWndFocus)
  oldOnWndFocus()
  if (isAlive_) {
    esc!(HandlerResult.Nothing);
    if (cmd) {
      type TypeChecked = { [key in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
          options: CmdOptions[T2] & FgOptions, count: number, exArgsOrForce?: number) => void; };
      (contentCommands_ as TypeChecked)[cmd](options!, count!, showBorder);
    }
    showBorder! & 1 && showFrameMask(FrameMaskType.ForcedSelf);
  }
}
