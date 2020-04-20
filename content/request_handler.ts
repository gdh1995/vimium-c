import {
  browserVer, clickable_, doc, esc, fgCache, injector, isEnabled_, isLocked_,
  isTop, keydownEvents_, safer, setChromeVer, setClickable, setFgCache, setOnOther, setStatusLocked,
  setupEventListener, setVEnabled, suppressCommonEvents, setOnWndFocus, VOther, onWndFocus, isAlive_,
} from "../lib/utils.js"
import { port_callbacks, post_, safePost } from "../lib/port.js"
import {
  addUIElement, adjustUI, createStyle, ensureBorder, getParentVApi,
  removeSelection, setUICSS, setupExitOnClick, ui_box, ui_root, evalIfOK, checkHidden,
} from "./dom_ui.js"
import { enableHUD, hudCopied, hudTip, hud_box } from "./hud.js"
import {
  currentKeys, getMappedKey, mappedKeys, setKeyFSM, setPassKeys, anyClickHandler, onKeydown, onKeyup,
} from "./key_handler.js"
import { HintMaster, kSafeAllSelector, setkSafeAllSelector } from "./link_hints.js"
import { createMark } from "./marks.js"
import { setFindCSS, styleInHUD } from "./mode_find.js"
import {
  exitGrab, grabBackFocus, insertInit, raw_insert_lock, setGrabBackFocus, onFocus, onBlur,
} from "./mode_insert.js"
import { prompt as visualPrompt, visual_mode } from "./mode_visual.js"
import { currentScrolling, onActivate, setCachedScrollable, setCurrentScrolling } from "./scroller.js"
import { activate as omniActivate, omni_status, onKeydown as omniOnKeydown, omni_box } from "./vomnibar.js"
import { contentCommands_ } from "./commands.js"

let framemask_more = false
let framemask_node: HTMLDivElement | null = null
let framemask_fmTimer = TimerID.None
let needToRetryParentClickable: BOOL = 0

export const enableNeedToRetryParentClickable = (): void => { needToRetryParentClickable = 1 }

export const requestHandlers: { [k in keyof BgReq]: (this: void, request: BgReq[k]) => void } = [
  /* kBgReq.init: */ function (request: BgReq[kBgReq.init]): void {
    const r = requestHandlers, {c: load, s: flags} = request;
    if (Build.BTypes & BrowserType.Chrome) {
      /*#__INLINE__*/ setChromeVer(load.v as BrowserVer);
    }
    if (<number> Build.BTypes !== BrowserType.Chrome && <number> Build.BTypes !== BrowserType.Firefox
        && <number> Build.BTypes !== BrowserType.Edge) {
      /*#__INLINE__*/ setOnOther(load.b!)
    }
    VDom.cache_ = (VKey.cacheK_ = load) as EnsureItemsNonNull<typeof load>;
    /*#__INLINE__*/ setFgCache(load)
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$KeyboardEvent$$Key) {
      load.o || (VKey.keyIdCorrectionOffset_old_cr_ = 300);
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
        (VDom.editableTypes_ as Writable<typeof VDom.editableTypes_>).keygen = EditableType.Select;
      }
    }
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinFramesetHasNoNamedGetter
        && browserVer < BrowserVer.MinFramesetHasNoNamedGetter) {
      setkSafeAllSelector(kSafeAllSelector + ":not(" + (VDom.unsafeFramesetTag_old_cr_ = "frameset") + ")");
    }
    if (Build.BTypes & ~BrowserType.Firefox && Build.BTypes & BrowserType.Firefox
        && VOther === BrowserType.Firefox) {
      VDom.notSafe_not_ff_ = (_el): _el is HTMLFormElement => false;
      VDom.isHTML_ = (): boolean => doc instanceof HTMLDocument;
    }
    r[kBgReq.keyFSM](request);
    if (flags) {
      setGrabBackFocus(grabBackFocus && !(flags & Frames.Flags.userActed))
      /*#__INLINE__*/ setStatusLocked(!!(flags & Frames.Flags.locked))
    }
    (r[kBgReq.reset] as (request: BgReq[kBgReq.reset], initing?: 1) => void)(request, 1);
    if (isEnabled_) {
      insertInit();
      if (Build.MinCVer < BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow
          && Build.BTypes & BrowserType.Chrome
          && browserVer >= BrowserVer.Min$Event$$Path$IncludeWindowAndElementsIfListenedOnWindow) {
        hook(HookAction.SuppressListenersOnDocument);
      }
    } else {
      setGrabBackFocus(false)
      hook(HookAction.Suppress);
      VApi.execute_ && VApi.execute_(kContentCmd.SuppressClickable);
    }
    r[kBgReq.init] = null as never;
    VDom.OnDocLoaded_(function (): void {
      /*#__INLINE__*/ enableHUD()
      /*#__INLINE__*/ setOnWndFocus(safePost.bind(0, <Req.fg<kFgReq.focus>> { H: kFgReq.focus }))
      VKey.timeout_(function (): void {
        const parApi = !(Build.BTypes & ~BrowserType.Firefox)
            || Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox
            ? getParentVApi() : VDom.allowScripts_ && VDom.frameElement_() && getParentVApi(),
        parHints = parApi && parApi.baseHinter_ as HintMaster;
        if (needToRetryParentClickable) {
        const oldSet = clickable_ as any as Element[] & Set<Element>
        /*#__INLINE__*/ setClickable(parApi ? parApi.clickable_() : new WeakSet!<Element>())
        if (!Build.NDEBUG && parApi) {
          // here assumes that `set` is not a temp array but a valid WeakSet / Set
          let count: number;
          if (Build.MinCVer >= BrowserVer.MinES6$ForOf$Map$SetAnd$Symbol || !(Build.BTypes & BrowserType.Chrome)
              || oldSet.size != null) {
            count = oldSet.size;
            oldSet.forEach(el => clickable_.add(el));
          } else {
            count = oldSet.filter(el => clickable_.add(el)).length;
          }
          console.log(`Vimium C: extend click: ${count ? "add " + count : "no"} local items to the parent's set.`);
        } else {
          oldSet.forEach(el => clickable_.add(el));
        }
        }
        if (parHints && (parHints._master || parHints).hasExecuted_) {
          (parHints._master || parHints).reinit_();
        }
      }, 330);
    });
    injector && injector.$r(InjectorTask.extInited);
  },
  /* kBgReq.reset: */ function (request: BgReq[kBgReq.reset], initing?: 1): void {
    const newPassKeys = request.p, newEnabled = newPassKeys !== "", old = isEnabled_;
    /*#__INLINE__*/ setPassKeys(newPassKeys);
    /*#__INLINE__*/ setVEnabled(newEnabled);
    if (initing) {
      return;
    }
    /*#__INLINE__*/ setStatusLocked(!!request.f)
    // if true, recover listeners on shadow roots;
    // otherwise listeners on shadow roots will be removed on next blur events
    if (newEnabled) {
      esc(HandlerResult.Nothing); // for passNextKey#normal
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
    request.u = location.href;
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
    VKey.safer_(delta);
    const cache = fgCache;
    for (const i in delta) {
      (cache as Generalized<typeof cache>)[i as Keys] = (delta as EnsureItemsNonNull<typeof delta>)[i as Keys];
      const i2 = "_" + i as Keys;
      (i2 in cache) && (VKey.safer_(cache)[i2] = undefined as never);
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
            ? VDom.notSafe_not_ff_!(body = doc.body) || body && VDom.htmlTag_(body) === "frameset"
            : doc.body && VDom.htmlTag_(doc.body) === "frameset")
          && (div = VDom.querySelector_unsafe_("div"), !div || div === ui_box && !VKey._handlers.length)
    ) {
      post_({
        H: kFgReq.nextFrame,
        k: req.k
      });
      return;
    }
    mask && VKey.timeout_((): void => { focusAndRun() }, 1); // require FrameMaskType.NoMaskAndNoFocus is 0
    if (req.c) {
      type TypeChecked = { [key1 in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
          count: number, options: CmdOptions[T2] & FgOptions) => void; };
      (contentCommands_ as TypeChecked)[req.c](req.n!, req.a!);
    }
    keydownEvents_[req.k] = 1;
    showFrameMask(mask);
  },
  /* kBgReq.exitGrab: */ exitGrab as (this: void, request: Req.bg<kBgReq.exitGrab>) => void,
  /* kBgReq.keyFSM: */ function (request: BgReq[kBgReq.keyFSM]): void {
    const map = request.k, func = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf
      && Build.BTypes & BrowserType.Chrome && browserVer < BrowserVer.Min$Object$$setPrototypeOf
      ? VKey.safer_ : Object.setPrototypeOf;
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
    /*#__INLINE__*/ setKeyFSM(map, request.m)
    mappedKeys && func(mappedKeys, null);
  },
  /* kBgReq.execute: */ function<O extends keyof CmdOptions> (request: BaseExecute<CmdOptions[O], O>): void {
    if (request.H) { setUICSS(request.H); }
    esc(HandlerResult.Nothing);
    const options: CmdOptions[O] | null = request.a;
    type Keys = keyof CmdOptions;
    type TypeToCheck = {
      [key in Keys]: (this: void, count: number, options: CmdOptions[key] & SafeObject) => void;
    };
    type TypeChecked = {
      [key in Keys]: <T2 extends Keys>(this: void, count: number, options: CmdOptions[T2] & SafeObject) => void;
    };
    (contentCommands_ as TypeToCheck as TypeChecked)[request.c](request.n, options ? VKey.safer_(options) : safer(null));
  } as (req: BaseExecute<object, keyof CmdOptions>) => void,
  /* kBgReq.createMark: */ createMark,
  /* kBgReq.showHUD: */ function (req: Req.bg<kBgReq.showHUD>): void {
    if (req.H) {
      setUICSS(req.H);
      if (req.f) {
        /*#__INLINE__*/ setFindCSS(req.f)
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
    esc(HandlerResult.Nothing);
    exitGrab();
    if (Build.BTypes & ~BrowserType.Chrome && request.m) {
      const now = Date.now(), result = confirm(request.m);
      count2 = Math.abs(Date.now() - now) > 9 ? result ? 3 : 1 : 2;
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
    if (!VDom.isHTML_()) { return; }
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
      box = VDom.createElement_("div");
      box.innerHTML = html as string;
      box = box.firstChild as SafeHTMLElement;
    }
    box.onclick = VKey.Stop_;
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
    optLink = query("#OptionsPage") as HTMLAnchorElement, advCmd = query("#AdvancedCommands") as HTMLElement,
    hide: (this: void, e?: (EventToPrevent) | number | "e") => void = function (event): void {
      if (event instanceof Event) {
        VKey.prevent_(event);
      }
      advCmd.onclick = optLink.onclick = closeBtn.onclick = null as never;
      let i: Element | null = VDom.lastHovered_;
      i && box.contains(i) && (VDom.lastHovered_ = null);
      if ((i = currentScrolling) && box.contains(i)) {
        /*#__INLINE__*/ setCurrentScrolling(null);
        /*#__INLINE__*/ setCachedScrollable(null);
      }
      VKey.removeHandler_(box);
      box.remove();
      contentCommands_[kFgCmd.showHelp] = oldShowHelp;
      setupExitOnClick(1, 0);
    };
    closeBtn.onclick = contentCommands_[kFgCmd.showHelp] = hide;
    if (! location.href.startsWith(optionUrl)) {
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
      VKey.prevent_(event);
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
    setCurrentScrolling(box)
    VKey.pushHandler_(function (event) {
      if (!raw_insert_lock && VKey.isEscape_(getMappedKey(event, kModeId.Normal))) {
        removeSelection(ui_root) || hide();
        return HandlerResult.Prevent;
      }
      return HandlerResult.Nothing;
    }, box);
    if (omni_status >= VomnibarNS.Status.Showing) {
      VKey.removeHandler_(omniActivate);
      VKey.pushHandler_(omniOnKeydown, omniActivate);
    }
    // if no [tabindex=0], `.focus()` works if :exp and since MinElement$Focus$MayMakeArrowKeySelectIt or on Firefox
    VKey.timeout_((): void => box.focus(), 17);
  }
]

export const showFrameMask = (mask: FrameMaskType): void => {
  if (!isTop && mask === FrameMaskType.NormalNext) {
    let docEl = VDom.docEl_unsafe_();
    if (docEl) {
    Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
      && (!(Build.BTypes & ~BrowserType.Chrome) || browserVer < BrowserVer.MinScrollIntoViewOptions)
    ? Element.prototype.scrollIntoViewIfNeeded!.call(docEl)
    : VDom.scrollIntoView_(docEl);
    }
  }
  if (mask < FrameMaskType.minWillMask || !VDom.isHTML_()) { return; }
  if (framemask_node) {
    framemask_more = true;
  } else {
    framemask_node = VDom.createElement_("div");
    framemask_node.className = "R Frame" + (mask === FrameMaskType.OnlySelf ? " One" : "");
    framemask_fmTimer = setInterval((fake?: TimerType.fake): void => { // safe-interval
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
  let old = onWndFocus, failed = true;
  /*#__INLINE__*/ setOnWndFocus((): void => { failed = false; })
  if (!(Build.BTypes & BrowserType.Firefox)
      || (Build.BTypes & ~BrowserType.Firefox && VOther !== BrowserType.Firefox)) {
    /* empty */
  } else if (omni_status === VomnibarNS.Status.Showing) {
    omni_box.blur();
  } else {
    // cur is safe because on Firefox
    const cur = VDom.activeEl_unsafe_() as SafeElement | null;
    cur && (<RegExpOne> /^i?frame$/).test(cur.localName) && cur.blur && cur.blur();
  }
  focus();
  /** Maybe a `doc.open()` has been called
   * Step 8 of https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#document-open-steps
   * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/doc.cc?q=Document::open&l=3107
   */
  failed && isEnabled_ && hook(HookAction.Install);
  // the line below is always necessary: see https://github.com/philc/vimium/issues/2551#issuecomment-316113725
  /*#__INLINE__*/ setOnWndFocus(old)
  old()
  if (isAlive_ as any) {
    esc(HandlerResult.Nothing);
    if (cmd) {
      type TypeChecked = { [key in FgCmdAcrossFrames]: <T2 extends FgCmdAcrossFrames>(this: void,
          count: number, options: CmdOptions[T2] & FgOptions) => void; };
      (contentCommands_ as TypeChecked)[cmd](count!, options!);
    }
    showBorder && showFrameMask(FrameMaskType.ForcedSelf);
  }
}
