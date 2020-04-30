import {
  browserVer, clickable_, doc, esc, fgCache, injector, isEnabled_, isLocked_, isAlive_, isTop,
  keydownEvents_, safeObj, set_browserVer, set_clickable_, set_fgCache, set_VOther, set_isLocked_,
  setupEventListener, set_isEnabled_, suppressCommonEvents, set_onWndFocus, VOther, onWndFocus, timeout_, safer,
  allowScripts_, loc_, interval_, getTime,
} from "../lib/utils"
import { port_callbacks, post_, safePost, set_requestHandlers, requestHandlers } from "./port"
import {
  addUIElement, adjustUI, createStyle, ensureBorder, getParentVApi,
  removeSelection, setUICSS, setupExitOnClick, ui_box, ui_root, evalIfOK, checkHidden,
} from "./dom_ui"
import { enableHUD, hudCopied, hudTip, hud_box } from "./hud"
import {
  currentKeys, mappedKeys, set_keyFSM, anyClickHandler, onKeydown, onKeyup, passKeys,
  set_isPassKeysReverted, isPassKeysReverted, set_passKeys, set_mappedKeys,
} from "./key_handler"
import { HintManager, kSafeAllSelector, set_kSafeAllSelector } from "./link_hints"
import { createMark } from "./marks"
import { set_findCSS, styleInHUD } from "./mode_find"
import {
  exitGrab, grabBackFocus, insertInit, raw_insert_lock, set_grabBackFocus, onFocus, onBlur,
} from "./mode_insert"
import { prompt as visualPrompt, visual_mode } from "./mode_visual"
import {
  currentScrolling, onActivate, set_currentScrolling, clearCachedScrollable,
} from "./scroller"
import { activate as omniActivate, omni_status, onKeydown as omniOnKeydown, omni_box } from "./vomnibar"
import { contentCommands_ } from "./commands"
import {
  set_keyIdCorrectionOffset_old_cr_, handler_stack, Stop_, prevent_, removeHandler_, pushHandler_, isEscape_, key_,
} from "../lib/keyboard_utils"
import {
  editableTypes_, markFramesetTagUnsafe, setNotSafe_not_ff, OnDocLoaded_, frameElement_,
  notSafe_not_ff_, htmlTag_, querySelector_unsafe_, isHTML_, createElement_, lastHovered_, set_lastHovered_,
  docEl_unsafe_, scrollIntoView_, activeEl_unsafe_, 
} from "../lib/dom_utils"

let framemask_more = false
let framemask_node: HTMLDivElement | null = null
let framemask_fmTimer = TimerID.None
let needToRetryParentClickable: BOOL = 0

export const enableNeedToRetryParentClickable = (): void => { needToRetryParentClickable = 1 }

set_requestHandlers([
  /* kBgReq.init: */ function (request: BgReq[kBgReq.init]): void {
    const {c: load, s: flags} = request;
    if (Build.BTypes & BrowserType.Chrome) {
      /*#__INLINE__*/ set_browserVer(load.v as BrowserVer);
    }
    if (<number> Build.BTypes !== BrowserType.Chrome && <number> Build.BTypes !== BrowserType.Firefox
        && <number> Build.BTypes !== BrowserType.Edge) {
      /*#__INLINE__*/ set_VOther(load.b!)
    }
    /*#__INLINE__*/ set_fgCache(VApi.z = load)
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      load.o || /*#__INLINE__*/ set_keyIdCorrectionOffset_old_cr_(300);
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNoKeygenElement
        || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinNoKeygenElement) {
      /** here should keep the same as {@link ../background/settings.ts#Settings_.payload_} */
      if (Build.BTypes & BrowserType.Chrome
          ? Build.MinCVer < BrowserVer.MinNoKeygenElement && browserVer < BrowserVer.MinNoKeygenElement
          : Build.BTypes & BrowserType.Firefox
          ? Build.MinFFVer < FirefoxBrowserVer.MinNoKeygenElement
            && <FirefoxBrowserVer | 0> load.v < FirefoxBrowserVer.MinNoKeygenElement
          : false) {
        (editableTypes_ as Writable<typeof editableTypes_>).keygen = EditableType.Select;
      }
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
        && browserVer < BrowserVer.MinFramesetHasNoNamedGetter) {
      set_kSafeAllSelector(kSafeAllSelector + ":not(" + (/*#__INLINE__*/ markFramesetTagUnsafe()) + ")");
    }
    if (Build.BTypes & ~BrowserType.Firefox && Build.BTypes & BrowserType.Firefox
        && VOther === BrowserType.Firefox) {
      setNotSafe_not_ff((_el): _el is HTMLFormElement => false)
    }
    requestHandlers[kBgReq.keyFSM](request);
    if (flags) {
      /*#__INLINE__*/ set_grabBackFocus(grabBackFocus && !(flags & Frames.Flags.userActed))
      /*#__INLINE__*/ set_isLocked_(!!(flags & Frames.Flags.locked))
    }
    (requestHandlers[kBgReq.reset] as (request: BgReq[kBgReq.reset], initing?: 1) => void)(request, 1);
    if (isEnabled_) {
      insertInit();
      if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
          && Build.BTypes & BrowserType.Chrome
          && browserVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow) {
        hook(HookAction.SuppressListenersOnDocument);
      }
    } else {
      /*#__INLINE__*/ set_grabBackFocus(false)
      hook(HookAction.Suppress);
      VApi.e && VApi.e(kContentCmd.SuppressClickable);
    }
    requestHandlers[kBgReq.init] = null as never;
    OnDocLoaded_(function (): void {
      /*#__INLINE__*/ enableHUD()
      /*#__INLINE__*/ set_onWndFocus(safePost.bind(0, <Req.fg<kFgReq.focus>> { H: kFgReq.focus }))
      timeout_(function (): void {
        const parApi = !(Build.BTypes & ~BrowserType.Firefox)
            || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
            ? getParentVApi() : allowScripts_ && frameElement_() && getParentVApi(),
        parHints = parApi && parApi.b as HintManager;
        if (needToRetryParentClickable) {
        const oldSet = clickable_ as any as Element[] & Set<Element>
        /*#__INLINE__*/ set_clickable_(parApi ? parApi.y().c : new WeakSet!<Element>())
        if (!Build.NDEBUG && parApi) {
          // here assumes that `set` is not a temp array but a valid WeakSet / Set
          let count: number;
          if (Build.MinCVer >= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
              || oldSet.size != null) {
            count = oldSet.size;
            if (Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)) {
              oldSet.forEach(clickable_.add, clickable_);
            } else {
              oldSet.forEach(el => clickable_.add(el));
            }
          } else {
            count = oldSet.filter(el => clickable_.add(el)).length;
          }
          console.log(`Vimium C: extend click: ${count ? "add " + count : "no"} local items to the parent's set.`);
        } else if (Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)) {
          oldSet.forEach(clickable_.add, clickable_);
        } else {
          oldSet.forEach(el => clickable_.add(el));
        }
        }
        if (parHints && (parHints.p || parHints).h) {
          (parHints.p || parHints).i();
        }
      }, 330);
    });
    injector && injector.$r(InjectorTask.extInited);
  },
  /* kBgReq.reset: */ function (request: BgReq[kBgReq.reset], initing?: 1): void {
    const newPassKeys = request.p, newEnabled = newPassKeys !== "", old = isEnabled_;
    /*#__INLINE__*/ set_passKeys(newPassKeys && safeObj<1>(null))
    if (newPassKeys) {
      /*#__INLINE__*/ set_isPassKeysReverted(newPassKeys[0] === "^" && newPassKeys.length > 2);
      for (const ch of (isPassKeysReverted ? newPassKeys.slice(2) : newPassKeys).split(" ")) {
        (passKeys as SafeDict<1>)[ch] = 1;
      }
    }
    /*#__INLINE__*/ set_isEnabled_(newEnabled);
    if (initing) {
      return;
    }
    /*#__INLINE__*/ set_isLocked_(!!request.f)
    // if true, recover listeners on shadow roots;
    // otherwise listeners on shadow roots will be removed on next blur events
    if (newEnabled) {
      esc!(HandlerResult.Nothing); // for passNextKey#normal
      old || insertInit();
      (old && !isLocked_) || hook(HookAction.Install);
      // here should not return even if old - a url change may mean the fullscreen mode is changed
    } else {
      contentCommands_[kFgCmd.reset](1);
    }
    if (ui_box) { adjustUI(+newEnabled ? 1 : 2); }
  },
  /* kBgReq.injectorRun: */ injector ? injector.$m : null as never,
  /* kBgReq.url: */ function<T extends keyof FgReq> (this: void, request: BgReq[kBgReq.url] & Req.fg<T>): void {
    delete (request as Req.bg<kBgReq.url>).N;
    request.u = loc_.href;
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
    const cache = fgCache;
    for (const i in delta) {
      (cache as Generalized<typeof cache>)[i as Keys] = (delta as EnsureItemsNonNull<typeof delta>)[i as Keys];
      const i2 = "_" + i as Keys;
      (i2 in cache) && (safer(cache)[i2] = undefined as never);
    }
    delta.d != null && hud_box && hud_box.classList.toggle("D", !!delta.d);
  },
  /* kBgReq.focusFrame: */ (req: BgReq[kBgReq.focusFrame]): void => {
    // Note: .c, .S are ensured to exist
    let mask = req.m, div: Element | null, body: Element | null;
    req.H && setUICSS(req.H);
    if (mask !== FrameMaskType.NormalNext) { /* empty */ }
    else if (checkHidden()
      // check <div> to detect whether no other visible elements except <frame>s in this frame
      || (Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter && Build.BTypes & BrowserType.Chrome
            // treat a doc.body of <form> as <frameset> to simplify logic
            ? notSafe_not_ff_!(body = doc.body) || body && htmlTag_(body) === "frameset"
            : doc.body && htmlTag_(doc.body) === "frameset")
          && (div = querySelector_unsafe_("div"), !div || div === ui_box && !handler_stack.length)
    ) {
      post_({
        H: kFgReq.nextFrame,
        k: req.k
      });
      return;
    }
    mask && timeout_((): void => { focusAndRun() }, 1); // require FrameMaskType.NoMaskAndNoFocus is 0
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
    const map = request.k, func = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf
      && Build.BTypes & BrowserType.Chrome && browserVer < BrowserVer.Min$Object$$setPrototypeOf
      ? safer : Object.setPrototypeOf;
    func(map, null);
    function iter(obj: ReadonlyChildKeyFSM): void {
      func(obj, null);
      for (const key in obj) {
        type ObjItem = Exclude<NonNullable<(typeof obj)[string]>, KeyAction.cmd>;
        obj[key] !== KeyAction.cmd && iter(obj[key] as ObjItem);
      }
    }
    for (const key in map) {
      const sec = map[key]!;
      sec && sec !== KeyAction.count && iter(sec);
    }
    /*#__INLINE__*/ set_keyFSM(map)
    /*#__INLINE__*/ set_mappedKeys(request.m)
    mappedKeys && func(mappedKeys, null);
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
  /* kBgReq.showHUD: */ function (req: Req.bg<kBgReq.showHUD>): void {
    if (req.H) {
      setUICSS(req.H);
      if (req.f) {
        /*#__INLINE__*/ set_findCSS(req.f)
        styleInHUD && (styleInHUD.textContent = req.f.i);
      }
    }
    req.c
      ? visual_mode ? visualPrompt(kTip.copiedIs, 2000, [hudCopied(req.t, "", 1)])
        : hudCopied(req.t)
      : req.t ? hudTip(kTip.raw, 0, [req.t])
    : 0;
  },
  /* kBgReq.count: */ function (request: BgReq[kBgReq.count]): void {
    let n = parseInt(currentKeys, 10) || 1, count2: 0 | 1 | 2 | 3 = 0;
    esc!(HandlerResult.Nothing);
    exitGrab();
    if (Build.BTypes & ~BrowserType.Chrome && request.m) {
      const now = getTime(), result = confirm(request.m);
      count2 = Math.abs(getTime() - now) > 9 ? result ? 3 : 1 : 2;
    }
    post_({ H: kFgReq.cmd, c: request.c, n, i: request.i, r: count2 });
  },
  /* kBgReq.showHelpDialog: */ ({ h: html, c: shouldShowAdvanced, o: optionUrl, H: CSS
      , e: exitOnClick }: BgReq[kBgReq.showHelpDialog]): void => {
    // Note: not suppress key on the top, because help dialog may need a while to render,
    // and then a keyup may occur before or after it
    if (CSS) { setUICSS(CSS); }
    const oldShowHelp = contentCommands_[kFgCmd.showHelp];
    oldShowHelp("e");
    if (!isHTML_()) { return; }
    if (oldShowHelp !== contentCommands_[kFgCmd.showHelp]) { return; } // an old dialog exits
    let box: SafeHTMLElement;
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)) {
      // on FF66, if a page is limited by "script-src 'self'; style-src 'self'"
      //   then `<style>`s created by `.innerHTML = ...` has no effects;
      //   so need `doc.createElement('style').textContent = ...`
      box = new DOMParser().parseFromString((html as Exclude<typeof html, string>).b, "text/html"
          ).body.firstChild as SafeHTMLElement;
      box.prepend!(createStyle((html as Exclude<typeof html, string>).h));
    } else {
      box = createElement_("div");
      box.innerHTML = html as string;
      box = box.firstChild as SafeHTMLElement;
    }
    box.onclick = Stop_;
    suppressCommonEvents(box, "mousedown");
    if (Build.MinCVer >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument
        || !(Build.BTypes & BrowserType.Chrome)
        || browserVer >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument) {
      setupEventListener(box,
        (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
          : VOther !== BrowserType.Chrome)
        ? "click" : "DOMActivate", onActivate);
    }

    const query = box.querySelector.bind(box), closeBtn = query("#HClose") as HTMLElement,
    optLink = query("#HOpt") as HTMLAnchorElement, advCmd = query("#HAdv") as HTMLElement,
    hide: (this: void, e?: (EventToPrevent) | CmdOptions[kFgCmd.showHelp] | "e") => void = function (event): void {
      if (event instanceof Event) {
        prevent_(event);
      }
      advCmd.onclick = optLink.onclick = closeBtn.onclick = null as never;
      let i: Element | null = lastHovered_;
      i && box.contains(i) && /*#__INLINE__*/ set_lastHovered_(null);
      if ((i = currentScrolling) && box.contains(i)) {
        /*#__INLINE__*/ set_currentScrolling(null);
        /*#__INLINE__*/ clearCachedScrollable();
      }
      removeHandler_(box);
      box.remove();
      contentCommands_[kFgCmd.showHelp] = oldShowHelp;
      setupExitOnClick(1, 0);
    };
    closeBtn.onclick = contentCommands_[kFgCmd.showHelp] = hide;
    if (! loc_.href.startsWith(optionUrl)) {
      optLink.href = optionUrl;
      optLink.onclick = function (event) {
        post_({ H: kFgReq.focusOrLaunch, u: optionUrl });
        hide(event);
      };
    } else {
      optLink.remove();
    }
    function toggleAdvanced(this: void): void {
      const el2 = advCmd.firstChild as HTMLElement;
      el2.innerText = el2.dataset[shouldShowAdvanced ? "h" : "s"]!;
      box.classList.toggle("HelpDA");
    }
    advCmd.onclick = function (event) {
      prevent_(event);
      shouldShowAdvanced = !shouldShowAdvanced;
      toggleAdvanced();
      post_({
        H: kFgReq.setSetting,
        k: 0,
        v: shouldShowAdvanced
      });
    };
    shouldShowAdvanced && toggleAdvanced();
    ensureBorder()
    addUIElement(box, AdjustType.Normal, true)
    exitOnClick && setupExitOnClick(1, hide)
    doc.hasFocus() || focusAndRun();
    /*#__INLINE__*/ set_currentScrolling(box)
    pushHandler_(function (event) {
      if (!raw_insert_lock && isEscape_(key_(event, kModeId.Normal))) {
        removeSelection(ui_root) || hide();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    }, box);
    if (omni_status >= VomnibarNS.Status.Showing) {
      removeHandler_(omniActivate);
      pushHandler_(omniOnKeydown, omniActivate);
    }
    // if no [tabindex=0], `.focus()` works if :exp and since MinElement$Focus$MayMakeArrowKeySelectIt or on Firefox
    timeout_((): void => box.focus(), 17);
  }
])

export const showFrameMask = (mask: FrameMaskType): void => {
  if (!isTop && mask === FrameMaskType.NormalNext) {
    let docEl = docEl_unsafe_();
    if (docEl) {
    Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
      && (!(Build.BTypes & ~BrowserType.Chrome) || browserVer < BrowserVer.MinScrollIntoViewOptions)
    ? Element.prototype.scrollIntoViewIfNeeded!.call(docEl)
    : scrollIntoView_(docEl);
    }
  }
  if (mask < FrameMaskType.minWillMask || !isHTML_()) { return; }
  if (framemask_node) {
    framemask_more = true;
  } else {
    framemask_node = createElement_("div");
    framemask_node.className = "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : "");
    framemask_fmTimer = interval_((fake?: TimerType.fake): void => { // safe-interval
      const more_ = framemask_more;
      framemask_more = false;
      if (more_ && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                      && fake)) { return; }
      if (framemask_node) { framemask_node.remove(); framemask_node = null; }
      clearInterval(framemask_fmTimer);
    }, isTop ? 200 : 350);
  }
  addUIElement(framemask_node);
}

export const hook = (function (action: HookAction): void {
  let f = action ? removeEventListener : addEventListener;
  if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
      && Build.BTypes & BrowserType.Chrome) {
    if (!(Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome)
        && (action || browserVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow)) {
      f.call(doc, "DOMActivate", onActivate, true);
      f.call(doc, "click", anyClickHandler, true);
    }
    if (action === HookAction.SuppressListenersOnDocument) { return; }
  }
  f("keydown", onKeydown, true);
  f("keyup", onKeyup, true);
  action !== HookAction.Suppress && f("focus", onFocus, true);
  f("blur", onBlur, true);
  if (!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome) {
    f("click", anyClickHandler, true);
  }
  f(Build.BTypes & ~BrowserType.Chrome && VOther !== BrowserType.Chrome
      ? "click" : "DOMActivate", onActivate, true);
})

export const focusAndRun = (cmd?: FgCmdAcrossFrames, count?: number, options?: FgOptions, showBorder?: 1): void => {
  exitGrab();
  let oldOnWndFocus = onWndFocus, failed = true;
  /*#__INLINE__*/ set_onWndFocus((): void => { failed = false; })
  if (!(Build.BTypes & BrowserType.Firefox)
      || (Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox)) {
    /* empty */
  } else if (omni_status === VomnibarNS.Status.Showing) {
    omni_box.blur();
  } else {
    // cur is safe because on Firefox
    const cur = activeEl_unsafe_() as SafeElement | null;
    cur && (<RegExpOne> /^i?frame$/).test(cur.localName) && cur.blur && cur.blur();
  }
  focus();
  /** Maybe a `doc.open()` has been called
   * Step 8 of https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#document-open-steps
   * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/doc.cc?q=Document::open&l=3107
   */
  failed && isEnabled_ && hook(HookAction.Install);
  // the line below is always necessary: see https://github.com/philc/vimium/issues/2551#issuecomment-316113725
  /*#__INLINE__*/ set_onWndFocus(oldOnWndFocus)
  oldOnWndFocus()
  if (isAlive_) {
    esc!(HandlerResult.Nothing);
    if (cmd) {
      type TypeChecked = { [key in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
          options: CmdOptions[T2] & FgOptions, count: number) => void; };
      (contentCommands_ as TypeChecked)[cmd](options!, count!);
    }
    showBorder && showFrameMask(FrameMaskType.ForcedSelf);
  }
}
