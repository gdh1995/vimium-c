import {
  chromeVer_, doc, esc, EscF, fgCache, isTop, safeObj, set_esc, VOther, VTr, safer, timeout_, loc_, weakRef_, deref_,
  keydownEvents_,
  parseSedOptions,
} from "../lib/utils"
import { isHTML_, htmlTag_, createElement_, frameElement_, querySelectorAll_unsafe_ } from "../lib/dom_utils"
import {
  pushHandler_, removeHandler_, getMappedKey, prevent_, isEscape_, keybody_, DEL, BSP, ENTER,
} from "../lib/keyboard_utils"
import {
  view_, wndSize_, isNotInViewport, getZoom_, prepareCrop_, getViewBox_, padClientRect_,
  getBoundingClientRect_, setBoundary_, wdZoom_, dScale_,
} from "../lib/rect"
import { post_ } from "./port"
import {
  addElementList, ensureBorder, evalIfOK, getSelected, getSelectionText, getParentVApi, curModalElement
} from "./dom_ui"
import { hudHide, hudShow, hudTip, hud_text } from "./hud"
import { onKeyup2, set_onKeyup2, passKeys, installTempCurrentKeyStatus, set_passKeys } from "./key_handler"
import { activate as linkActivate, clear as linkClear, kEditableSelector, kSafeAllSelector } from "./link_hints"
import { activate as markActivate, gotoMark } from "./marks"
import { activate as findActivate, deactivate as findDeactivate, execCommand, init as findInit } from "./mode_find"
import {
  exitInputHint, insert_inputHint, insert_last_, raw_insert_lock, resetInsert, set_is_last_mutable,
  set_inputHint, set_insert_global_, set_isHintingInput, set_insert_last_, onWndBlur, exitPassMode, set_exitPassMode,
} from "./insert"
import { activate as visualActivate, deactivate as visualDeactivate } from "./visual"
import { activate as scActivate, clearCachedScrollable } from "./scroller"
import { activate as omniActivate } from "./omni"
import { findNextInText, findNextInRel } from "./pagination"
import { traverse, getEditable, filterOutNonReachable } from "./local_links"
import { select_, unhover_, resetLastHovered } from "./async_dispatcher"

interface SpecialCommands {
  [kFgCmd.reset] (this: void, isAlive: BOOL | CmdOptions[kFgCmd.reset] & SafeObject): void;
  [kFgCmd.showHelp] (msg: CmdOptions[kFgCmd.showHelp] | "e"): void;
}

export const contentCommands_: {
  [k in kFgCmd & number]:
    k extends keyof SpecialCommands ? SpecialCommands[k] :
    k extends kFgCmd.reload | kFgCmd.autoCopy ? (options: CmdOptions[k]) => void :
    (this: void, options: CmdOptions[k] & SafeObject, count: number, key?: -42) => void;
} = [
  /* kFgCmd.framesGoBack: */ function (options: CmdOptions[kFgCmd.framesGoBack], rawStep: number): void {
    const maxStep = Math.min(rawStep > 0 ? rawStep : -rawStep, history.length - 1),
    reuse = options.reuse,
    realStep = rawStep < 0 ? -maxStep : maxStep;
    if ((!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
        && maxStep > 1
        && (Build.MinCVer >= BrowserVer.Min$Tabs$$goBack || chromeVer_ >= BrowserVer.Min$Tabs$$goBack)
        && !options.local
        || maxStep && reuse
    ) {
      post_({ H: kFgReq.framesGoBack, s: realStep, r: reuse, p: options.position });
    } else {
      maxStep && history.go(realStep);
    }
  },
  /* kFgCmd.findMode: */ findActivate,
  /* kFgCmd.linkHints: */ linkActivate,
  /* kFgCmd.unhoverLast: */ function (this: void): void {
    unhover_();
    hudTip(kTip.didUnHoverLast);
  },
  /* kFgCmd.marks: */ markActivate,
  /* kFgCmd.goToMarks: */ gotoMark,
  /* kFgCmd.scroll: */ scActivate,
  /* kFgCmd.visualMode: */ visualActivate,
  /* kFgCmd.vomnibar: */ omniActivate,
  /* kFgCmd.reset: */ (isAlive): void => {
    /*#__INLINE__*/ clearCachedScrollable()
    /*#__INLINE__*/ resetLastHovered()
    /*#__INLINE__*/ resetInsert()
    linkClear(<BOOL> +!!isAlive); visualDeactivate();
    findInit || findDeactivate(FindNS.Action.ExitNoAnyFocus);
    onWndBlur();
  },

  /* kFgCmd.toggle: */ function (options: CmdOptions[kFgCmd.toggle]): void {
    const key = options.k, backupKey = "_" + key as typeof key,
    cache = safer(fgCache), cur = cache[key];
    let val = options.v, u: undefined;
    if (val === null && (cur === !!cur)) {
      val = !cur;
    }
    if (cache[backupKey] === u) {
      (cache as Generalized<typeof cache>)[backupKey] = cur;
    } else if (cur === val) {
      val = cache[backupKey];
      cache[backupKey] = u as never;
    }
    (cache as Generalized<typeof cache>)[key] = val as typeof cur;
    let notBool = val !== !!val;
    options.n && hudTip(notBool ? kTip.useVal : val ? kTip.turnOn : kTip.turnOff,
        1000, [options.n, notBool ? JSON.stringify(val) : ""]);
  },
  /* kFgCmd.insertMode: */ function (opt: CmdOptions[kFgCmd.insertMode]): void {
    /*#__INLINE__*/ set_insert_global_(opt)
    if (opt.h) { hudShow(kTip.raw, opt.h); }
  },
  /* kFgCmd.passNextKey: */ function (options: CmdOptions[kFgCmd.passNextKey], count0: number): void {
    let keyCount = 0, count = count0 > 0 ? count0 : -count0
    if (!!options.normal === (count0 > 0)) {
      esc!(HandlerResult.ExitPassMode); // singleton
      if (!passKeys) {
        return hudTip(kTip.noPassKeys);
      }
      const oldEsc = esc!, oldPassKeys = passKeys;
      /*#__INLINE__*/ set_passKeys(null)
      /*#__INLINE__*/ set_esc(function (i: HandlerResult): HandlerResult {
        if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.ExitPassMode) {
          hudHide();
          /*#__INLINE__*/ set_passKeys(oldPassKeys)
          /*#__INLINE__*/ set_esc(oldEsc)
          return oldEsc(HandlerResult.Prevent);
        }
        installTempCurrentKeyStatus()
        if (keyCount - count || !hud_text) {
          keyCount = count;
          hudShow(kTip.normalMode, [count > 1 ? VTr(kTip.nTimes, [count]) : ""]);
        }
        return i;
      } as EscF);
      esc!(HandlerResult.Nothing);
      return;
    }
    exitPassMode && exitPassMode();
    const keys = safeObj<BOOL>(null);
    pushHandler_(function (event) {
      keyCount += +!keys[event.i];
      keys[event.i] = 1;
      return HandlerResult.PassKey;
    }, keys);
    /*#__INLINE__*/ set_onKeyup2((event): void => {
      if (keyCount === 0 || --keyCount || --count) {
        keys[event ? event.keyCode : kKeyCode.None] = 0;
        hudShow(kTip.passNext, [count > 1 ? VTr(kTip.nTimes, [count]) : ""]);
      } else {
        exitPassMode!();
      }
    })
    /*#__INLINE__*/ set_exitPassMode((): void => {
      /*#__INLINE__*/ set_exitPassMode(null)
      /*#__INLINE__*/ set_onKeyup2(null)
      removeHandler_(keys);
      hudHide();
    })
    onKeyup2!();
  },
  /* kFgCmd.goNext: */ function (req: CmdOptions[kFgCmd.goNext]): void {
    let isNext = !req.r.includes("prev"), parApi: VApiTy | null | void, chosen: GoNextBaseCandidate | false | 0 | null
    if (!isTop && (parApi = Build.BTypes & BrowserType.Firefox ? getParentVApi() : frameElement_() && getParentVApi())
        && !parApi.a(keydownEvents_)) {
      parApi.f(kFgCmd.goNext, 1, req as CmdOptions[kFgCmd.goNext] & FgOptions)
    } else if (chosen = isHTML_()
        && (findNextInRel(req.r) || req.p.length && findNextInText(req.p, isNext, req.l, req.m))) {
      chosen[1].j(chosen[0])
    } else {
      hudTip(kTip.noLinksToGo, 0, [VTr(kTip.prev + <number> <boolean | number> isNext)]);
    }
  },
  /* kFgCmd.reload: */ function (options: CmdOptions[kFgCmd.reload]): void {
    timeout_(function () {
      options.url ? (loc_.href = options.url) : loc_.reload(!!options.hard);
    }, 17);
  },
  /* kFgCmd.showHelp: */ function (options: CmdOptions[kFgCmd.showHelp] | "e"): void {
    if (options === "e") { return; }
    let wantTop = wndSize_(1) < 400 || wndSize_() < 320
    if (!isHTML_()) {
      if (isTop) { return; }
      wantTop = true;
    }
    post_({ H: kFgReq.initHelp, w: wantTop, a: options });
  },
  /* kFgCmd.autoCopy: */ function (options: CmdOptions[kFgCmd.autoCopy]): void {
    let str = getSelectionText(1);
    post_({
      H: kFgReq.copy,
      s: str as never as undefined,
      e: parseSedOptions(options),
      u: (str ? "" : options.url ? loc_.href : doc.title) as "url",
      d: options.decoded || options.decode
    });
  },
  /* kFgCmd.autoOpen: */ function (options: CmdOptions[kFgCmd.autoOpen]): void {
    let url = getSelectionText();
    url && evalIfOK(url) || post_({ H: kFgReq.openUrl, c: !url, k: options.keyword, t: options.testUrl, u: url })
    url && options.copy && contentCommands_[kFgCmd.autoCopy](options);
  },
  /* kFgCmd.searchAs: */ function (options: CmdOptions[kFgCmd.searchAs]): void {
    post_({
      H: kFgReq.searchAs,
      u: loc_.href,
      c: options.copied,
      s: parseSedOptions(options),
      t: options.selected ? getSelectionText() : ""
    });
  },
  /* kFgCmd.focusInput: */ function (options: CmdOptions[kFgCmd.focusInput], count: number): void {
    const S = "IH IHS"
    const act = options.act || options.action, known_last = deref_(insert_last_);
    if (act && (act[0] !== "l" || known_last && !raw_insert_lock)) {
      let newEl: LockableElement | null | undefined = raw_insert_lock, ret: BOOL = 1;
      if (newEl) {
        if (act === BSP) {
          if (view_(newEl)) { execCommand(DEL, doc); }
        } else {
          /*#__INLINE__*/ set_insert_last_(weakRef_(newEl))
          /*#__INLINE__*/ set_is_last_mutable(0)
          newEl.blur();
        }
      } else if (!(newEl = known_last)) {
        hudTip(kTip.noFocused, 1200);
      } else if (act !== "last-visible" && view_(newEl) || !isNotInViewport(newEl)) {
        /*#__INLINE__*/ set_insert_last_(null)
        /*#__INLINE__*/ set_is_last_mutable(1)
        getZoom_(newEl);
        prepareCrop_();
        select_(newEl, null, !!options.flash, options.select, true);
      } else if (act[0] === "l") {
        ret = 0;
      } else {
        hudTip(kTip.focusedIsHidden, 2000);
      }
      if (ret) {
        return;
      }
    }
    insert_inputHint && (insert_inputHint.h = null as never);
    const arr: ViewOffset = getViewBox_();
    prepareCrop_(1);
    interface InputHint extends Hint { [0]: HintsNS.InputHintItem["d"] }
    // here those editable and inside UI root are always detected, in case that a user modifies the shadow DOM
    const visibleInputs = traverse(Build.BTypes & ~BrowserType.Firefox
          ? kEditableSelector + kSafeAllSelector : kEditableSelector, getEditable
        ) as InputHint[],
    action = options.select, keep = options.keep, pass = options.passExitKey, reachable = options.reachable;
    if (reachable != null ? reachable : fgCache.e) {
      curModalElement || filterOutNonReachable(visibleInputs)
    }
    let sel = visibleInputs.length;
    if (!sel) {
      exitInputHint();
      return hudTip(kTip.noInputToFocus, 1000);
    } else if (sel < 2) {
      exitInputHint();
      select_(visibleInputs[0][0], visibleInputs[0][1], true, action, true)
      return
    }
    const preferredSelector = options.prefer
    const preferred: Element[] = [].slice.call(preferredSelector && querySelectorAll_unsafe_(preferredSelector) || [])
    for (let ind = 0; ind < sel; ind++) {
      const hint = visibleInputs[ind], j = hint[0].tabIndex;
      hint[2] = preferred.indexOf(hint[0]) >= 0 ? 0.5 : j < 1 ? -ind
          : !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
            && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinStableSort)
          ? j : j + ind / 8192;
    }
    const hints: HintsNS.InputHintItem[] = visibleInputs.sort(
        (a, b) => a[2] < 1 || b[2] < 1 ? b[2] - a[2] : a[2] - b[2]).map(
        function (link): HintsNS.InputHintItem {
      const marker = createElement_("span") as HintsNS.BaseHintItem["m"],
      rect = padClientRect_(getBoundingClientRect_(link[0]), 3);
      rect.l--, rect.t--, rect.r--, rect.b--;
      marker.className = "IH";
      setBoundary_(marker.style, rect);
      return {m: marker, d: link[0]};
    })
    if (count === 1 && known_last) {
      sel = Math.max(0, hints.map(link => link.d).indexOf(known_last))
    } else {
      sel = count > 0 ? Math.min(count, sel) - 1 : Math.max(0, sel + count);
    }
    hints[sel].m.className = S
    ensureBorder(wdZoom_ / dScale_);
    select_(hints[sel].d, visibleInputs[sel][1], false, action, false).then((): void => {
      insert_inputHint!.b = addElementList<false>(hints, arr)
    })
    exitInputHint();
    /*#__INLINE__*/ set_inputHint({ b: null, h: hints })
    pushHandler_((event) => {
      const keyCode = event.i, isIME = keyCode === kKeyCode.ime, repeat = event.e.repeat,
      key = isIME || repeat ? "" : getMappedKey(event, kModeId.Insert)
      if (key === kChar.tab || key === `s-${kChar.tab}`) {
        const hints2 = insert_inputHint!.h, oldSel = sel, len = hints2.length;
        sel = (oldSel + (key < "t" ? len - 1 : 1)) % len;
        /*#__INLINE__*/ set_isHintingInput(1);
        prevent_(event.e); // in case that selecting is too slow
        select_(hints2[sel].d, null, false, action).then((): void => {
          /*#__INLINE__*/ set_isHintingInput(0)
          hints2[oldSel].m.className = "IH"
          hints2[sel].m.className = S
        })
        return HandlerResult.Prevent;
      }
      // check `!key` for mapModifier
      else if (!key && (keyCode === kKeyCode.shiftKey || keep && (keyCode === kKeyCode.altKey
                        || keyCode === kKeyCode.ctrlKey
                        || keyCode > kKeyCode.maxNotMetaKey && keyCode < kKeyCode.minNotMetaKeyOrMenu))
              || repeat) {
        return HandlerResult.Nothing;
      }
      else if (keep ? isEscape_(key) || (
          keybody_(key) === ENTER
          && (/* a?c?m?-enter */ key < "s" && (key[0] !== "e" || htmlTag_(insert_inputHint!.h[sel].d) === "input"))
        ) : !isIME && keyCode !== kKeyCode.f12
      ) {
        exitInputHint();
        return !isEscape_(key) ? HandlerResult.Nothing : keep || !raw_insert_lock ? HandlerResult.Prevent
          : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
      } else {
        return HandlerResult.Nothing;
      }
    }, insert_inputHint!);
  },
  /* kFgCmd.editText: */ function (options: CmdOptions[kFgCmd.editText], count: number) {
    (raw_insert_lock || options.dom) && timeout_((): void => {
      let commands = options.run.split(","), sel: Selection | undefined;
      while (0 < count--) {
        for (let i = 0; i < commands.length; i += 3) {
          if (commands[i] !== "exec") {
            sel = sel || getSelected()[0];
            sel.modify(commands[i] as any, commands[i + 1] as any, commands[i + 2] as any);
          } else {
            execCommand(commands[i + 1], doc, commands[i + 2]);
          }
        }
      }
    }, 0);
  }
]
