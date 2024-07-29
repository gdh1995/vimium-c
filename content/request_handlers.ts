import {
  chromeVer_, clickable_, doc, esc, fgCache, injector, isEnabled_, isLocked_, isAlive_, isTop, abs_, includes_,
  keydownEvents_, set_chromeVer_, set_clickable_, set_fgCache, set_isLocked_, OnChrome, OnFirefox, safeCall, recordLog,
  set_isEnabled_, set_onWndFocus, onWndFocus, timeout_, safer, set_os_, safeObj, set_keydownEvents_, setupEventListener,
  interval_, getTime, vApi, locHref, set_firefoxVer_, firefoxVer_, os_, isAsContent, isIFrameInAbout_,
  OnEdge, inherited_, clearTimeout_, setupTimerFunc_cr_mv3, set_weakRef_ff, weakRef_ff, deref_, set_confVersion
} from "../lib/utils"
import { set_keyIdCorrectionOffset_old_cr_, handler_stack, suppressTail_ } from "../lib/keyboard_utils"
import {
  editableTypes_, markFramesetTagUnsafe_old_cr, OnDocLoaded_, BU, docHasFocus_, deepActiveEl_unsafe_, HTMLElementProto,
  hasTag_, querySelector_unsafe_, isHTML_, createElement_, setClassName_s, onReadyState_,
  docEl_unsafe_, scrollIntoView_, CLK, ElementProto_not_ff, isIFrameElement, DAC, removeEl_s, toggleClass_s, getElDesc_
} from "../lib/dom_utils"
import {
  onPortRes_, post_, safePost, set_requestHandlers, requestHandlers, hookOnWnd, set_hookOnWnd, onFreezePort,
  HookAction, contentCommands_, runFallbackKey, runtime_port, runtimeConnect, set_port_, setupBackupTimer_cr, send_,
} from "./port"
import {
  addUIElement, adjustUI, createStyle, getParentVApi, getBoxTagName_old_cr, setUICSS, ui_box, evalIfOK, checkHidden,
  onToggle,
} from "./dom_ui"
import { hudTip, hud_box } from "./hud"
import {
  currentKeys, mappedKeys, set_keyFSM, anyClickHandler, onKeydown, onKeyup,
  set_isPassKeysReversed, isPassKeysReversed, set_passKeys, set_mappedKeys, set_mapKeyTypes, keyFSM,
} from "./key_handler"
import { HintManager, kSafeAllSelector, set_kSafeAllSelector } from "./link_hints"
import { dispatchMark } from "./marks"
import {
  set_findCSS, styleInHUD, deactivate as findExit, toggleSelectableStyle, styleSelColorIn, styleSelColorOut
} from "./mode_find"
import { exitGrab, grabBackFocus, insertInit, set_grabBackFocus, onFocus, onBlur, insert_Lock_ } from "./insert"
import { onActivate, setNewScrolling } from "./scroller"
import { hide as omniHide } from "./omni"

let frame_mask: BOOL | 2 | undefined
let needToRetryParentClickable: BOOL = 0

/** require `WeakSet` MUST exist; should ensure `clickable_.forEach` MUST exist */
export function set_needToRetryParentClickable (_newNeeded: 1): void { needToRetryParentClickable = _newNeeded }

set_requestHandlers([
  /* kBgReq.init: */ function (request: BgReq[kBgReq.init]): void {
    set_fgCache(vApi.z = request.c || vApi.z)
    OnChrome && set_chromeVer_(fgCache.v as BrowserVer)
    OnFirefox && set_firefoxVer_(fgCache.v as FirefoxBrowserVer)
    Build.OS & (Build.OS - 1) && set_os_(fgCache.o)
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      Build.OS !== kBOS.MAC as number && Build.OS & kBOS.MAC && !os_ && set_keyIdCorrectionOffset_old_cr_(300)
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
    if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinWeakRefReliableForDom
        && firefoxVer_ < FirefoxBrowserVer.MinWeakRefReliableForDom && weakRef_ff !== deref_) {
      set_weakRef_ff(/*#__INLINE__*/ _weakRef_old_ff as typeof weakRef_ff)
    }
    if (request.f) {
      set_grabBackFocus(grabBackFocus && !(request.f & Frames.Flags.userActed))
      set_isLocked_(request.f & Frames.Flags.MASK_LOCK_STATUS)
    }
    inherited_ ? esc!(HandlerResult.Nothing) : requestHandlers[kBgReq.keyFSM](request);
    (requestHandlers[kBgReq.reset] as (request: BgReq[kBgReq.reset | kBgReq.init], initing?: 1) => void)(request, 1)
    if (Build.MV3 && OnChrome && !vApi.e && isAsContent) { /*#__ENABLE_SCOPED__*/
      const t = timeout_, i = interval_, ct = clearTimeout_
      t((): void => { /*#__INLINE__*/ setupTimerFunc_cr_mv3(t, i, ct) }, 0)
      /*#__INLINE__*/ setupBackupTimer_cr()
      send_(kFgReq.wait, 0, () => timeout_ !== t && recordLog(kTip.logNotWorkOnSandboxed)())
    }
    if (isEnabled_) {
      set_keydownEvents_(safeObj<any>(null))
      insertInit(injector ? injector.$g : fgCache.g && grabBackFocus as boolean, 1)
      if (OnChrome && Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
          && chromeVer_ > BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow - 1) {
        hookOnWnd(HookAction.SuppressListenersOnDocument);
      }
      OnFirefox || isIFrameInAbout_ && !vApi.e && timeout_(hookOnWnd.bind(0, HookAction.Install), 1e3)
      !Build.MV3 && OnChrome && timeout_ === interval_ && recordLog(kTip.logNotWorkOnSandboxed)()
    } else {
      set_grabBackFocus(false)
      hookOnWnd(HookAction.Suppress);
      vApi.e && vApi.e(kContentCmd.SuppressClickable);
    }
    if (OnChrome && Build.MinCVer < BrowserVer.MinFreezeEvent && chromeVer_ < BrowserVer.MinFreezeEvent) {
      setupEventListener(0, "freeze", onFreezePort, 1)
    }
    requestHandlers[kBgReq.init] = null as never;
    OnChrome && request.d && set_port_(null) // in case `port.onDisconnect` was not triggered
    OnDocLoaded_(function (): void {
      set_onWndFocus(safePost.bind(0, <Req.fg<kFgReq.onFrameFocused>> { H: kFgReq.onFrameFocused }))
      isTop || docHasFocus_() && onWndFocus()
      isTop || timeout_(function (): void {
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
        } else if (Build.NDEBUG && parApi) {
          set_clickable_(parApi.y().c)
          oldSet.forEach(clickable_.add, clickable_);
        } else {
          set_clickable_(new WeakSet!<Element>(oldSet))
        }
        const manager = parHints && parHints.p || parHints
        manager && manager.h && abs_(getTime() - abs_(manager.h)) < 1200 && manager.i(1)
      }, 330);
    });
    isAsContent || (injector || vApi).$r!(InjectorTask.extInited);
  },
  /* kBgReq.reset: */ function (request: BgReq[kBgReq.reset | kBgReq.init], initing?: 1): void {
    const newPassKeys = request.p, old = isEnabled_
    set_isEnabled_(newPassKeys !== "")
    if (newPassKeys) {
      set_isPassKeysReversed(newPassKeys[0] === "^" && newPassKeys.length > 2)
      const arr = (isPassKeysReversed ? newPassKeys.slice(2) : newPassKeys).split(" ")
      if (OnChrome && Build.MinCVer < BrowserVer.Min$Set$accept$Symbol$$Iterator
          && chromeVer_ < BrowserVer.Min$Set$accept$Symbol$$Iterator) {
        type StringArraySet = string[] & Set<string>;
        (arr as StringArraySet).has = Build.MinCVer >= BrowserVer.MinEnsuredES$Array$$Includes ? arr.includes
            : includes_
        set_passKeys(arr as StringArraySet)
      } else {
        set_passKeys(new Set!(arr))
      }
    } else {
      set_passKeys(newPassKeys as Exclude<typeof newPassKeys, string> | "")
    }
    if (initing) {
      return;
    }
    esc!(HandlerResult.ExitNormalMode) // for passNextKey#normal
    set_isLocked_((request as BgReq[kBgReq.reset]).f)
    // if true, recover listeners on shadow roots;
    // otherwise listeners on shadow roots will be removed on next blur events
    if (isEnabled_) {
      set_keydownEvents_(keydownEvents_ || safeObj(null))
      old || insertInit();
      (old && !isLocked_) || hookOnWnd(HookAction.Install);
      // here should not return even if old - a url change may mean the fullscreen mode is changed
    } else {
      contentCommands_[kFgCmd.insertMode]({r: 1})
    }
    onReadyState_()
    if (ui_box) { adjustUI(+isEnabled_ ? 1 : 2) }
  },
  /* kBgReq.injectorRun: */ injector! && injector.$m,
  /* kBgReq.url: */ (request: BgReq[kBgReq.url]): void => {
    delete (request as Partial<Req.bg<kBgReq.url>>).N
    request.u = (request.U & 1 ? vApi.u : locHref)()
    request.U & 2 && ((request as Extract<Req.queryUrl<kFgReq.marks>, {s: any}>).s = dispatchMark(0
        , !(request as Extract<Req.queryUrl<kFgReq.marks>, {s: any}>).l))
    post_<kFgReq.marks>(request as WithEnsured<Req.queryUrl<kFgReq.marks>, "u">)
  },
  /* kBgReq.msg: */ onPortRes_,
  /* kBgReq.eval: */ evalIfOK,
  /* kBgReq.settingsUpdate: */ ({ d: delta, v: newConfVersion }: BgReq[kBgReq.settingsUpdate]): void => {
    type Keys = keyof typeof delta;
    safer(delta);
    for (const i in delta) {
      (fgCache as Generalized<typeof fgCache>)[i as Keys] = (delta as EnsureItemsNonNull<typeof delta>)[i as Keys];
      const i2 = "_" + i as Keys;
      (i2 in fgCache) && delete safer(fgCache)[i2]
    }
    delta.d != null && hud_box && toggleClass_s(hud_box, "D", !!delta.d)
    newConfVersion && set_confVersion(newConfVersion)
  },
  /* kBgReq.focusFrame: */ (req: BgReq[kBgReq.focusFrame]): void => {
    // Note: .c, .S are ensured to exist
    let mask = req.m, div: Element | null;
    req.H && setUICSS(req.H);
    if (mask === FrameMaskType.NormalNext
      && (checkHidden()
          // check <div> to detect whether no other visible elements except <frame>s in this frame
          || (doc.body && hasTag_("frameset", doc.body))
              && (div = querySelector_unsafe_("div"), !div || div === ui_box && !handler_stack.length))
    ) {
      post_({ H: kFgReq.nextFrame, k: req.k, f: req.f })
      return;
    }
    mask === FrameMaskType.onOmniHide ? (omniHide(0), vApi.f()) : (mask || req.c) && timeout_((): void => {
      vApi.f(req.c, req.a!, req.n!)
      isAlive_ && runFallbackKey(req.f, mask === FrameMaskType.OnlySelf ? 2 : 0)
    }, 1)
    keydownEvents_[req.k] = 1;
    (mask === FrameMaskType.OnlySelf && req.f.$else) || showFrameMask(mask)
  },
  /* kBgReq.exitGrab: */ exitGrab as (this: void, request: Req.bg<kBgReq.exitGrab>) => void,
  /* kBgReq.keyFSM: */ function (request: BgReq[kBgReq.keyFSM]): void {
    safer(set_keyFSM(request.k || keyFSM))
    set_mapKeyTypes(request.t)
    set_mappedKeys(request.m)
    mappedKeys && safer(mappedKeys)
    set_confVersion(request.v)
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
    if (isEnabled_) { // in case of $then / $else
      (contentCommands_ as TypeToCheck as TypeChecked)[request.c](safer(options || {}), request.n)
    }
  } as (req: BaseExecute<object, keyof CmdOptions>) => void,
  /* kBgReq.showHUD: */ <VApiTy["t"]> function (req: BgReq[kBgReq.showHUD]): void {
    if (req.H) {
      setUICSS(req.H);
      if (req.f) {
        set_findCSS(req.f)
        styleInHUD && createStyle(req.f.i, styleInHUD)
        styleSelColorIn && (createStyle(req.f.c, styleSelColorIn), createStyle(req.f.c, styleSelColorOut))
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        findExit && toggleSelectableStyle(1)
      }
    }
    req.k && hudTip(req.k, req.d, req.t)
    req.l && hud_box && toggleClass_s(hud_box, "HL", 1)
  },
  /* kBgReq.count: */ function (request: BgReq[kBgReq.count]): void {
    let n = currentKeys === "-" ? -1 : parseInt(currentKeys, 10) || 1, count2: 0 | 1 | 2 | 3 = 0
    esc!(HandlerResult.Nothing);
    exitGrab();
    if (request.m) {
      post_({ H: kFgReq.beforeCmd, i: request.i })
      const now = getTime(), result = safeCall(confirm, request.m)
      count2 = abs_(getTime() - now) > 9 ? result ? 3 : 1 : 2
    }
    post_({ H: kFgReq.cmd, n, i: request, r: count2 });
  },
  /* kBgReq.queryForRunAs: */ (request: BgReq[kBgReq.queryForRunKey]): void => {
    const lock = insert_Lock_() || deepActiveEl_unsafe_(1)
    post_({ H: kFgReq.respondForRunKey, r: request, e: getElDesc_(lock) })
  },
  /* kBgReq.suppressForAWhile: */ (request: BgReq[kBgReq.suppressForAWhile]): void => { suppressTail_(request.t) },
  /* kBgReq.refreshPort: */ ((req?: BgReq[kBgReq.refreshPort] | 0, updates?: number): void => {
    (req = req || (updates! & ~PortType.refreshInBatch)) && runtime_port && runtime_port.disconnect()
    !req && runtime_port || runtimeConnect(updates)
  }) satisfies VApiTy["q"]
])

export const showFrameMask = (mask: FrameMaskType): void => {
  if (!isTop && mask === FrameMaskType.NormalNext) {
    let docEl = docEl_unsafe_();
    if (docEl) {
      OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions && chromeVer_<BrowserVer.MinScrollIntoViewOptions
      ? ElementProto_not_ff!.scrollIntoViewIfNeeded!.call(docEl) : scrollIntoView_(docEl)
    }
  }
  if (mask < FrameMaskType.minWillMask || !isHTML_()) { return; }
  if (frame_mask && (!OnChrome || timeout_ !== interval_)) {
    frame_mask = 2
    return
  }
  let framemask_node: HTMLBodyElement | HTMLDivElement, framemask_fmTimer: ValidIntervalID
    framemask_node = createElement_(OnChrome
        && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div")
    setClassName_s(framemask_node, "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : ""))
    framemask_fmTimer = interval_((): void => { // safe-interval
      if (frame_mask === 2) { frame_mask = 1; return }
      frame_mask = 0 as never
      clearTimeout_(framemask_fmTimer)
      removeEl_s(framemask_node)
    }, isTop ? 200 : 350);
  frame_mask = 1
  addUIElement(framemask_node, AdjustType.DEFAULT);
}

set_hookOnWnd((function (action: HookAction): void {
  let f = action ? removeEventListener : addEventListener, t = true
  if (OnChrome && Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
        && (action || chromeVer_ < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)) {
    f.call(doc, CLK, anyClickHandler, t)
    f.call(doc, DAC, onActivate, t)
    if (action === HookAction.SuppressListenersOnDocument) { return; }
  }
  f(BU, onBlur, t)
  OnChrome && f(CLK, anyClickHandler, t)
  f(OnChrome ? DAC: CLK, onActivate, t)
  if (action !== HookAction.Suppress) {
    f("focus", onFocus, t)
    // https://developer.chrome.com/blog/page-lifecycle-api/
    OnChrome && f("freeze", onFreezePort, t)
    if (OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredPopover
        || !OnEdge && (HTMLElementProto! as Partial<PopoverElement>).showPopover) {
      f("toggle", onToggle, t)
    }
  }
  f("keydown", onKeydown, t)
  f("keyup", onKeyup, t)
}) satisfies typeof hookOnWnd)

export const focusAndRun = (cmd?: FgCmdAcrossFrames, options?: FgOptions, count?: number
    , showBorder?: 0 | 1 | 2, childFrame?: SafeHTMLElement | null | void): void => {
  exitGrab();
  let oldOnWndFocus = onWndFocus, failed = true;
  set_onWndFocus((): void => { failed = false })
  if (OnFirefox) {
    const cur = deepActiveEl_unsafe_()
    cur && isIFrameElement(cur, 1) && cur.blur()
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
    setNewScrolling(childFrame || null)
    if (cmd) {
      type TypeChecked = { [key in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
          options: CmdOptions[T2] & FgOptions, count: number, exArgsOrForce?: 0 | 1 | 2) => void; };
      (contentCommands_ as TypeChecked)[cmd](options!, count!, showBorder);
    }
    showBorder! & 1 && showFrameMask(FrameMaskType.ForcedSelf);
  }
}

export const _weakRef_old_ff = !OnFirefox || Build.MinFFVer >= FirefoxBrowserVer.MinWeakRefReliableForDom ? null
    : <T extends object>(val: T | null | undefined, id: kElRef): WeakRef<T> | null | undefined =>
          val && ((window as any)["__ref_" + id] = new (WeakRef as WeakRefConstructor)(val))

if (!(Build.NDEBUG || FrameMaskType.NoMaskAndNoFocus === 0)) {
  alert("Assert error: require FrameMaskType.NoMaskAndNoFocus === 0")
}
