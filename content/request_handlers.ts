import {
  chromeVer_, clickable_, doc, esc, fgCache, injector, isEnabled_, isLocked_, isAlive_, isTop, math, includes_,
  keydownEvents_, safeObj, set_chromeVer_, set_clickable_, set_fgCache, set_isLocked_, OnChrome, OnFirefox,
  set_isEnabled_, set_onWndFocus, onWndFocus, timeout_, safer,
  interval_, getTime, vApi, clearInterval_, locHref, set_firefoxVer_, firefoxVer_,
} from "../lib/utils"
import { set_keyIdCorrectionOffset_old_cr_, handler_stack } from "../lib/keyboard_utils"
import {
  editableTypes_, markFramesetTagUnsafe_old_cr, OnDocLoaded_, BU, notSafe_not_ff_,
  htmlTag_, querySelector_unsafe_, isHTML_, createElement_, setClassName_s, fullscreenEl_unsafe_,
  docEl_unsafe_, scrollIntoView_, activeEl_unsafe_, CLK, ElementProto, isIFrameElement, DAC, removeEl_s, toggleClass_s
} from "../lib/dom_utils"
import {
  port_callbacks, post_, safePost, set_requestHandlers, requestHandlers, hookOnWnd, set_hookOnWnd,
  HookAction, contentCommands_, runFallbackKey,
} from "./port"
import {
  addUIElement, adjustUI, createStyle, getParentVApi, getBoxTagName_old_cr, setUICSS, ui_box, evalIfOK, checkHidden,
} from "./dom_ui"
import { hudTip, hud_box } from "./hud"
import {
  currentKeys, mappedKeys, set_keyFSM, anyClickHandler, onKeydown, onKeyup,
  set_isPassKeysReversed, isPassKeysReversed, set_passKeys, set_mappedKeys, set_mapKeyTypes, keyFSM,
} from "./key_handler"
import { HintManager, kSafeAllSelector, set_kSafeAllSelector } from "./link_hints"
import { createMark, gotoMark } from "./marks"
import { set_findCSS, styleInHUD, styleSelectable } from "./mode_find"
import {
  exitGrab, grabBackFocus, insertInit, set_grabBackFocus, onFocus, onBlur, insert_Lock_, raw_insert_lock
} from "./insert"
import { onActivate } from "./scroller"
import { Status as VomnibarStatus, omni_status, omni_box } from "./omni"

let framemask_more = false
let framemask_node: HTMLDivElement | null = null
let framemask_fmTimer: ValidIntervalID = TimerID.None
let needToRetryParentClickable: BOOL = 0

/** require `WeakSet` MUST exist; should ensure `clickable_.forEach` MUST exist */
export function set_needToRetryParentClickable (_newNeeded: 1): void { needToRetryParentClickable = _newNeeded }

set_requestHandlers([
  /* kBgReq.init: */ function (request: BgReq[kBgReq.init]): void {
    const load = request.c, flags = request.f
    OnChrome && set_chromeVer_(load.v as BrowserVer)
    OnFirefox && set_firefoxVer_(load.v as FirefoxBrowserVer)
    set_fgCache(vApi.z = load)
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      load.o || set_keyIdCorrectionOffset_old_cr_(300)
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinNoKeygenElement && chromeVer_ < BrowserVer.MinNoKeygenElement
        || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinNoKeygenElement
            && firefoxVer_ < FirefoxBrowserVer.MinNoKeygenElement) {
      editableTypes_.keygen = EditableType.Select
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
        && chromeVer_ < BrowserVer.MinFramesetHasNoNamedGetter) {
      set_kSafeAllSelector(kSafeAllSelector + ":not(" + (/*#__INLINE__*/ markFramesetTagUnsafe_old_cr()) + ")");
    }
    if (flags) {
      set_grabBackFocus(grabBackFocus && !(flags & Frames.Flags.userActed))
      set_isLocked_(flags & Frames.Flags.MASK_LOCK_STATUS)
    }
    requestHandlers[kBgReq.keyFSM](request);
    (requestHandlers[kBgReq.reset] as (request: BgReq[kBgReq.reset | kBgReq.init], initing?: 1) => void)(request, 1)
    if (isEnabled_) {
      insertInit();
      if (OnChrome && Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
          && chromeVer_ > BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow - 1) {
        hookOnWnd(HookAction.SuppressListenersOnDocument);
      }
    } else {
      set_grabBackFocus(false)
      hookOnWnd(HookAction.Suppress);
      vApi.e && vApi.e(kContentCmd.SuppressClickable);
    }
    requestHandlers[kBgReq.init] = null as never;
    OnDocLoaded_(function (): void {
      set_onWndFocus(safePost.bind(0, <Req.fg<kFgReq.onFrameFocused>> { H: kFgReq.onFrameFocused }))
      timeout_(function (): void {
        const parApi = getParentVApi(),
        oldSet = clickable_ as any as Element[] & Set<Element>,
        parHints = parApi && parApi.b as HintManager;
        if (!needToRetryParentClickable) { /* empty */ }
        else if (!Build.NDEBUG && parApi) {
          let count = 0;
          set_clickable_(parApi.y().c)
          oldSet.forEach(el => { clickable_.has(el) || (clickable_.add(el), count++) })
          console.log(`Vimium C: extend click: ${count ? "add " + count : "no"} local items sent to the parent's set.`)
        } else if (OnChrome && Build.MinCVer < BrowserVer.MinNewWeakSetWithSetOrArray) {
          set_clickable_(parApi ? parApi.y().c : new WeakSet!<Element>())
          oldSet.forEach(clickable_.add, clickable_)
        } else if (parApi) {
          set_clickable_(parApi.y().c)
          oldSet.forEach(clickable_.add, clickable_);
        } else {
          set_clickable_(new WeakSet!<Element>(oldSet))
        }
        const manager = parHints && parHints.p || parHints
        if (manager && manager.h && manager.h - 1) {
          const delta = getTime() - manager.h
          delta < 1200 && delta >= 0 && manager!.i(1)
        }
      }, 330);
    });
    injector && injector.$r(InjectorTask.extInited);
  },
  /* kBgReq.reset: */ function (request: BgReq[kBgReq.reset | kBgReq.init], initing?: 1): void {
    const newPassKeys = request.p, old = isEnabled_
    set_isEnabled_(newPassKeys !== "")
    if (newPassKeys) {
      const arr = (isPassKeysReversed ? newPassKeys.slice(2) : newPassKeys).split(" ")
      set_isPassKeysReversed(newPassKeys[0] === "^" && newPassKeys.length > 2)
      if (OnChrome && Build.MinCVer < BrowserVer.Min$Set$accept$Symbol$$Iterator
          && chromeVer_ < BrowserVer.Min$Set$accept$Symbol$$Iterator) {
        type StringArraySet = string[] & Set<string>;
        (arr as StringArraySet).has = Build.MinCVer >= BrowserVer.MinEnsuredES6$Array$$Includes ? arr.includes!
            : includes_
        set_passKeys(arr as StringArraySet)
      } else {
        set_passKeys(new Set!(arr))
      }
    } else {
      set_passKeys(newPassKeys as Exclude<typeof newPassKeys, string>) // ignore `""`
    }
    if (initing) {
      return;
    }
    set_isLocked_((request as BgReq[kBgReq.reset]).f)
    // if true, recover listeners on shadow roots;
    // otherwise listeners on shadow roots will be removed on next blur events
    if (isEnabled_) {
      esc!(HandlerResult.ExitPassMode); // for passNextKey#normal
      old || insertInit();
      (old && !isLocked_) || hookOnWnd(HookAction.Install);
      // here should not return even if old - a url change may mean the fullscreen mode is changed
    } else {
      contentCommands_[kFgCmd.insertMode]({r: 1})
    }
    if (ui_box) { adjustUI(+isEnabled_ ? 1 : 2) }
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
      (i2 in fgCache) && delete safer(fgCache)[i2]
    }
    delta.d != null && hud_box && toggleClass_s(hud_box, "D", !!delta.d)
  },
  /* kBgReq.focusFrame: */ (req: BgReq[kBgReq.focusFrame]): void => {
    // Note: .c, .S are ensured to exist
    let mask = req.m, div: Element | null;
    req.H && setUICSS(req.H);
    if (mask === FrameMaskType.NormalNext
      && (checkHidden()
          // check <div> to detect whether no other visible elements except <frame>s in this frame
          || (doc.body && htmlTag_(doc.body) === "frameset")
              && (div = querySelector_unsafe_("div"), !div || div === ui_box && !handler_stack.length))
    ) {
      post_({ H: kFgReq.nextFrame, k: req.k, f: req.f })
      return;
    }
    (mask || req.c) && timeout_((): void => {
      vApi.f(req.c, req.a!, req.n!)
      isAlive_ && runFallbackKey(req.f, mask === FrameMaskType.OnlySelf ? 2 : 0)
    }, 1); // require FrameMaskType.NoMaskAndNoFocus is 0
    keydownEvents_[req.k] = 1;
    showFrameMask(mask);
  },
  /* kBgReq.exitGrab: */ exitGrab as (this: void, request: Req.bg<kBgReq.exitGrab>) => void,
  /* kBgReq.keyFSM: */ function (request: BgReq[kBgReq.keyFSM]): void {
    safer(set_keyFSM(request.k || keyFSM))
    set_mapKeyTypes(request.t)
    set_mappedKeys(request.m)
    mappedKeys && safer(mappedKeys)
    esc!(HandlerResult.Nothing) // so that passNextKey#normal refreshes nextKeys to the new keyFSM
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
        set_findCSS(req.f)
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
    if (!OnChrome && request.m) {
      const now = getTime(), result = confirm(request.m);
      count2 = math.abs(getTime() - now) > 9 ? result ? 3 : 1 : 2
    }
    post_({ H: kFgReq.cmd, c: request.c, n, i: request.i, r: count2 });
  },
  /* kBgReq.queryForRunAs: */ (request: BgReq[kBgReq.queryForRunKey]): void => {
    const lock = (OnFirefox ? insert_Lock_() : raw_insert_lock) || activeEl_unsafe_()
    const tag = (OnFirefox ? !lock : !lock || notSafe_not_ff_!(lock))
        ? "" : lock!.localName as string
    post_({ H: kFgReq.respondForRunKey, n: request.n,
      t: tag, c: tag && lock!.className, i: tag && lock!.id, f: !fullscreenEl_unsafe_()
    })
  },
  /* kBgReq.goToMark: */ gotoMark
])

export const showFrameMask = (mask: FrameMaskType): void => {
  if (!isTop && mask === FrameMaskType.NormalNext) {
    let docEl = docEl_unsafe_();
    if (docEl) {
      OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
      ? ElementProto().scrollIntoViewIfNeeded!.call(docEl) : scrollIntoView_(docEl)
    }
  }
  if (mask < FrameMaskType.minWillMask || !isHTML_()) { return; }
  if (framemask_node) {
    framemask_more = true;
  } else {
    framemask_node = createElement_(OnChrome
        && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div")
    setClassName_s(framemask_node, "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : ""))
    framemask_fmTimer = interval_((fake?: TimerType.fake): void => { // safe-interval
      const more_ = framemask_more;
      framemask_more = false;
      if (more_ && !(OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && fake)) { return }
      if (framemask_node) { removeEl_s(framemask_node); framemask_node = null; }
      clearInterval_(framemask_fmTimer);
    }, isTop ? 200 : 350);
  }
  addUIElement(framemask_node, AdjustType.DEFAULT);
}

set_hookOnWnd(((action: HookAction): void => {
  let f = action ? removeEventListener : addEventListener, t = true
  if (OnChrome && Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
        && (action || chromeVer_ < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)) {
      f.call(doc, DAC, onActivate, t)
      f.call(doc, CLK, anyClickHandler, t)
    if (action === HookAction.SuppressListenersOnDocument) { return; }
  }
  f("keydown", onKeydown, t)
  f("keyup", onKeyup, t)
  action !== HookAction.Suppress && f("focus", onFocus, t)
  f(BU, onBlur, t)
  OnChrome && f(CLK, anyClickHandler, t)
  f(OnChrome ? DAC: CLK, onActivate, t)
}))

export const focusAndRun = (cmd?: FgCmdAcrossFrames, options?: FgOptions, count?: number, showBorder?: 1 | 2): void => {
  exitGrab();
  let oldOnWndFocus = onWndFocus, failed = true;
  set_onWndFocus((): void => { failed = false })
  if (OnFirefox) {
    omni_status === VomnibarStatus.Showing && omni_box!.blur()
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
  set_onWndFocus(oldOnWndFocus)
  oldOnWndFocus()
  if (isAlive_) {
    esc!(HandlerResult.Nothing);
    if (cmd) {
      type TypeChecked = { [key in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
          options: CmdOptions[T2] & FgOptions, count: number, exArgsOrForce?: 1 | 2) => void; };
      (contentCommands_ as TypeChecked)[cmd](options!, count!, showBorder);
    }
    showBorder! & 1 && showFrameMask(FrameMaskType.ForcedSelf);
  }
}
