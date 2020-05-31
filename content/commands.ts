import {
  chromeVer_, doc, esc, EscF, fgCache, isTop, safeObj, set_esc, VOther, VTr, safer, timeout_, loc_, weakRef_, deref_,
} from "../lib/utils"
import {
  unhover_, resetLastHovered, isHTML_, view_, isNotInViewport, getZoom_, prepareCrop_, getViewBox_, createElement_,
  padClientRect_, getBoundingClientRect_, setBoundary_, wdZoom_, dScale_, getInnerHeight, getInnerWidth, htmlTag_,
} from "../lib/dom_utils"
import {
  pushHandler_, removeHandler_, getMappedKey, prevent_, isEscape_, keybody_, DEL, BSP, ENTER
} from "../lib/keyboard_utils"
import { post_ } from "./port"
import {
  addElementList, ensureBorder, evalIfOK, getSelected, getSelectionText, select_, flash_, click_,
} from "./dom_ui"
import { hudHide, hudShow, hudTip, hud_text } from "./hud"
import {
  onKeyup2, set_onKeyup2, passKeys, setTempCurrentKeyStatus, set_passKeys,
} from "./key_handler"
import {
  activate as linkActivate, clear as linkClear, kEditableSelector, kSafeAllSelector,
} from "./link_hints"
import { activate as markActivate, gotoMark } from "./marks"
import { activate as findActivate, deactivate as findDeactivate, execCommand, init as findInit } from "./mode_find"
import {
  exitInputHint, insert_inputHint, insert_last_, raw_insert_lock, resetInsert,
  set_inputHint, set_insert_global_, set_isHintingInput, set_insert_last_, onWndBlur, exitPassMode, set_exitPassMode,
  set_is_last_mutable,
} from "./insert"
import { activate as visualActivate, deactivate as visualDeactivate } from "./visual"
import { activate as scActivate, clearCachedScrollable } from "./scroller"
import { activate as omniActivate } from "./omni"
import { findAndFollowLink, findAndFollowRel } from "./pagination"
import { traverse, getEditable } from "./local_links"

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
        setTempCurrentKeyStatus()
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
  /* kFgCmd.goNext: */ function ({r: rel, p: patterns, l, m }: CmdOptions[kFgCmd.goNext]): void {
    const isNext = !rel.includes("prev")
    const linkElement: SafeHTMLElement | false | null = isHTML_() && findAndFollowRel(rel)
        || patterns.length > 0 && findAndFollowLink(patterns, isNext, l, m)
    if (linkElement) {
      let url = htmlTag_(linkElement) === "link" && (linkElement as HTMLLinkElement).href
      view_(linkElement)
      flash_(linkElement)
      if (url) {
        contentCommands_[kFgCmd.reload](safer({ url }))
      } else {
        timeout_((): void => { click_(linkElement); }, 100)
      }
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
    let wantTop = getInnerWidth() < 400 || getInnerHeight() < 320
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
      e: options.sed,
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
      s: options.sed,
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
    action = options.select;
    let sel = visibleInputs.length;
    if (sel === 0) {
      exitInputHint();
      return hudTip(kTip.noInputToFocus, 1000);
    } else if (sel === 1) {
      exitInputHint();
      return select_(visibleInputs[0][0], visibleInputs[0][1], true, action, true);
    }
    for (let ind = 0; ind < sel; ind++) {
      const hint = visibleInputs[ind], j = hint[0].tabIndex;
      hint[2] = j < 1 ? -ind
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
    }), known_last2 = deref_(insert_last_)
    if (count === 1 && known_last2) {
      sel = Math.max(0, visibleInputs.map(link => link[0]).indexOf(known_last2));
    } else {
      sel = count > 0 ? Math.min(count, sel) - 1 : Math.max(0, sel + count);
    }
    hints[sel].m.className = S
    select_(visibleInputs[sel][0], visibleInputs[sel][1], false, action, false);
    ensureBorder(wdZoom_ / dScale_);
    const box = addElementList<false>(hints, arr), keep = options.keep, pass = options.passExitKey;
    // delay exiting the old to avoid some layout actions
    // although old elements can not be GC-ed before this line, it has little influence
    exitInputHint();
    /*#__INLINE__*/ set_inputHint({ b: box, h: hints });
    pushHandler_(function (event) {
      const keyCode = event.i, isIME = keyCode === kKeyCode.ime, repeat = event.e.repeat,
      key = isIME || repeat ? "" : getMappedKey(event, kModeId.Insert)
      if (key === kChar.tab || key === `s-${kChar.tab}`) {
        const hints2 = this.h, oldSel = sel, len = hints2.length;
        sel = (oldSel + (key < "t" ? len - 1 : 1)) % len;
        /*#__INLINE__*/ set_isHintingInput(1);
        prevent_(event.e); // in case that selecting is too slow
        select_(hints2[sel].d, null, false, action);
        hints2[oldSel].m.className = "IH";
        hints2[sel].m.className = S
        /*#__INLINE__*/ set_isHintingInput(0);
        return HandlerResult.Prevent;
      }
      // check `!key` for mapModifier
      if (!key && (keyCode === kKeyCode.shiftKey || keep && (keyCode === kKeyCode.altKey
          || keyCode === kKeyCode.ctrlKey
          || keyCode > kKeyCode.maxNotMetaKey && keyCode < kKeyCode.minNotMetaKeyOrMenu))) { /* empty */ }
      else if (repeat) { return HandlerResult.Nothing; }
      else if (keep ? isEscape_(key) || (
          keybody_(key) === ENTER
          && (/* a?c?m?-enter */ key < "s" && (key[0] !== "e" || htmlTag_(this.h[sel].d) === "input"))
        ) : !isIME && keyCode !== kKeyCode.f12
      ) {
        exitInputHint();
        return !isEscape_(key) ? HandlerResult.Nothing : keep || !raw_insert_lock ? HandlerResult.Prevent
          : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
      }
      return HandlerResult.Nothing;
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
