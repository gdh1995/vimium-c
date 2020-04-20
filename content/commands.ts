import { browserVer, doc, esc, EscF, fgCache, isTop, safer, setEsc, VOther, VTr } from "../lib/utils.js"
import { post_ } from "../lib/port.js"
import { addElementList, ensureBorder, evalIfOK, getSelected, getSelectionText, select_ } from "./dom_ui.js"
import { hudHide, hudShow, hudTip, hud_text } from "./hud.js"
import { onKeyup2, passKeys, setOnKeyUp2, setTempCurrentKeyStatus, setTempPassKeys } from "./key_handler.js"
import {
  activate as linkActivate, clear as linkClear,
  getEditable, kEditableSelector, kSafeAllSelector, traverse,
} from "./link_hints.js"
import { activate as markActivate, gotoMark } from "./marks.js"
import { activate as findActivate, deactivate as findDeactivate, execCommand, init as findInit } from "./mode_find.js"
import {
  exitInputHint,
  insert_inputHint, insert_last, raw_insert_lock, resetInsert,
  setInputHint, setInsertGlobal, setInsertHinting, setInsertLast, onWndBlur, exitPassMode, setExitPassMode,
} from "./mode_insert.js"
import { activate as visualActivate, deactivate as visualDeactivate } from "./mode_visual.js"
import { activate as scActivate, setCachedScrollable, setCurrentScrolling } from "./scroller.js"
import { activate as omniActivate } from "./vomnibar.js"
import { findAndFollowLink, findAndFollowRel } from "./pagination.js"

interface SpecialCommands {
  [kFgCmd.reset] (this: void, isAlive: BOOL | CmdOptions[kFgCmd.reset] & SafeObject): void;
  [kFgCmd.showHelp] (msg?: number | "e"): void;
}

export const contentCommands_: {
  [k in kFgCmd & number]:
    k extends keyof SpecialCommands ? SpecialCommands[k] :
    (this: void, count: number, options: CmdOptions[k] & SafeObject, key?: -42) => void;
} = [
  /* kFgCmd.framesGoBack: */ function (rawStep: number, options: CmdOptions[kFgCmd.framesGoBack]): void {
    const maxStep = Math.min(Math.abs(rawStep), history.length - 1),
    reuse = options.reuse,
    realStep = rawStep < 0 ? -maxStep : maxStep;
    if ((!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && VOther === BrowserType.Chrome)
        && maxStep > 1
        && (Build.MinCVer >= BrowserVer.Min$Tabs$$goBack || browserVer >= BrowserVer.Min$Tabs$$goBack)
        && !options.local
        || maxStep && reuse
    ) {
      post_({ H: kFgReq.framesGoBack, s: realStep, r: reuse });
    } else {
      maxStep && history.go(realStep);
    }
  },
  /* kFgCmd.findMode: */ findActivate,
  /* kFgCmd.linkHints: */ linkActivate,
  /* kFgCmd.unhoverLast: */ function (this: void): void {
    VDom.unhover_();
    hudTip(kTip.didUnHoverLast);
  },
  /* kFgCmd.marks: */ markActivate,
  /* kFgCmd.goToMarks: */ gotoMark,
  /* kFgCmd.scroll: */ scActivate,
  /* kFgCmd.visualMode: */ visualActivate,
  /* kFgCmd.vomnibar: */ omniActivate ,
  /* kFgCmd.reset: */ (isAlive): void => {
    /*#__INLINE__*/ setCurrentScrolling(null);
    /*#__INLINE__*/ setCachedScrollable(null);
    VDom.lastHovered_ = null
    resetInsert()
    linkClear(isAlive ? 2 : 0); visualDeactivate();
    findInit || findDeactivate(FindNS.Action.ExitNoAnyFocus);
    onWndBlur();
  },

  /* kFgCmd.toggle: */ function (_0: number, options: CmdOptions[kFgCmd.toggle]): void {
    const key = options.k, backupKey = "_" + key as typeof key,
    cache = VKey.safer_(fgCache), cur = cache[key];
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
  /* kFgCmd.insertMode: */ function (_0: number, opt: CmdOptions[kFgCmd.insertMode]): void {
    /*#__INLINE__*/ setInsertGlobal(opt)
    if (opt.h) { hudShow(kTip.raw, opt.h); }
  },
  /* kFgCmd.passNextKey: */ function (count0: number, options: CmdOptions[kFgCmd.passNextKey]): void {
    let keyCount = 0, count = Math.abs(count0);
    if (!!options.normal === (count0 > 0)) {
      esc(HandlerResult.ExitPassMode); // singleton
      if (!passKeys) {
        return hudTip(kTip.noPassKeys);
      }
      const oldEsc = esc, oldPassKeys = passKeys;
      /*#__INLINE__*/ setTempPassKeys(null)
      /*#__INLINE__*/ setEsc(function (i: HandlerResult): HandlerResult {
        if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.ExitPassMode) {
          hudHide();
          /*#__INLINE__*/ setTempPassKeys(oldPassKeys)
          /*#__INLINE__*/ setEsc(oldEsc)
          return oldEsc(HandlerResult.Prevent);
        }
        setTempCurrentKeyStatus()
        if (keyCount - count || !hud_text) {
          keyCount = count;
          hudShow(kTip.normalMode, [count > 1 ? VTr(kTip.nTimes, [count]) : ""]);
        }
        return i;
      } as EscF);
      esc(HandlerResult.Nothing);
      return;
    }
    exitPassMode && exitPassMode();
    const keys = safer<BOOL>(null);
    VKey.pushHandler_(function (event) {
      keyCount += +!keys[event.i];
      keys[event.i] = 1;
      return HandlerResult.PassKey;
    }, keys);
    /*#__INLINE__*/ setOnKeyUp2((event): void => {
      if (keyCount === 0 || --keyCount || --count) {
        keys[event ? event.keyCode : kKeyCode.None] = 0;
        hudShow(kTip.passNext, [count > 1 ? VTr(kTip.nTimes, [count]) : ""]);
      } else {
        exitPassMode!();
      }
    })
    /*#__INLINE__*/ setExitPassMode((): void => {
      /*#__INLINE__*/ setExitPassMode(null)
      /*#__INLINE__*/ setOnKeyUp2(null)
      VKey.removeHandler_(keys);
      hudHide();
    })
    onKeyup2!();
  },
  /* kFgCmd.goNext: */ function (_0: number, {r: rel, p: patterns, l, m }: CmdOptions[kFgCmd.goNext]): void {
    if (!VDom.isHTML_() || findAndFollowRel(rel)) { return; }
    const isNext = rel === "next";
    if (patterns.length <= 0 || !findAndFollowLink(patterns, isNext, l, m)) {
      return hudTip(kTip.noLinksToGo, 0, [VTr(rel)]);
    }
  },
  /* kFgCmd.reload: */ function (_0: number, options: CmdOptions[kFgCmd.reload]): void {
    VKey.timeout_(function () {
      options.url ? (location.href = options.url) : location.reload(!!options.hard);
    }, 17);
  },
  /* kFgCmd.showHelp: */ function (msg?: number | "e", options?: CmdOptions[kFgCmd.showHelp]): void {
    if (msg === "e") { return; }
    let wantTop = innerWidth < 400 || innerHeight < 320;
    if (!VDom.isHTML_()) {
      if (isTop) { return; }
      wantTop = true;
    }
    post_({ H: kFgReq.initHelp, w: wantTop, a: options });
  },
  /* kFgCmd.autoCopy: */ function (_0: number, options: CmdOptions[kFgCmd.autoCopy]): void {
    let str = getSelectionText(1);
    post_({
      H: kFgReq.copy,
      s: str as never as undefined,
      e: options.sed,
      u: (str ? "" : options.url ? location.href : doc.title) as "url",
      d: options.decoded || options.decode
    });
  },
  /* kFgCmd.autoOpen: */ function (_0: number, options: CmdOptions[kFgCmd.autoOpen]): void {
    let url = getSelectionText();
    url && evalIfOK(url) || post_({
      H: kFgReq.openUrl,
      c: !url,
      k: options.keyword, u: url
    });
  },
  /* kFgCmd.searchAs: */ function (_0: number, options: CmdOptions[kFgCmd.searchAs]): void {
    post_({
      H: kFgReq.searchAs,
      u: location.href,
      c: options.copied,
      s: options.sed,
      t: options.selected ? getSelectionText() : ""
    });
  },
  /* kFgCmd.focusInput: */ function (count: number, options: CmdOptions[kFgCmd.focusInput]): void {
    const act = options.act || options.action;
    if (act && (act[0] !== "l" || insert_last && !raw_insert_lock)) {
      let newEl = raw_insert_lock, ret: BOOL = 1;
      if (newEl) {
        if (act === "backspace") {
          if (VDom.view_(newEl)) { execCommand("delete", doc); }
        } else {
          setInsertLast(newEl, 0)
          newEl.blur();
        }
      } else if (!(newEl = insert_last)) {
        hudTip(kTip.noFocused, 1200);
      } else if (act !== "last-visible" && VDom.view_(newEl) || !VDom.NotVisible_(newEl)) {
        setInsertLast(null, 1)
        VDom.getZoom_(newEl);
        VDom.prepareCrop_();
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
    const arr: ViewOffset = VDom.getViewBox_();
    VDom.prepareCrop_(1);
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
      const marker = VDom.createElement_("span") as HintsNS.BaseHintItem["m"],
      rect = VDom.padClientRect_(VDom.getBoundingClientRect_(link[0]), 3);
      rect.l--, rect.t--, rect.r--, rect.b--;
      marker.className = "IH";
      VDom.setBoundary_(marker.style, rect);
      return {m: marker, d: link[0]};
    });
    if (count === 1 && insert_last) {
      sel = Math.max(0, visibleInputs.map(link => link[0]).indexOf(insert_last));
    } else {
      sel = count > 0 ? Math.min(count, sel) - 1 : Math.max(0, sel + count);
    }
    hints[sel].m.className = "IH IHS";
    select_(visibleInputs[sel][0], visibleInputs[sel][1], false, action, false);
    ensureBorder(VDom.wdZoom_ / VDom.dScale_);
    const box = addElementList<false>(hints, arr), keep = !!options.keep, pass = !!options.passExitKey;
    // delay exiting the old to avoid some layout actions
    // although old elements can not be GC-ed before this line, it has little influence
    exitInputHint();
    /*#__INLINE__*/ setInputHint({ b: box, h: hints });
    VKey.pushHandler_(function (event) {
      const keyCode = event.i, isIME = keyCode === kKeyCode.ime, repeat = event.e.repeat,
      key = isIME || repeat ? "" : VKey.key_(event, kModeId.Insert)
      if (key === kChar.tab || key === `s-${kChar.tab}`) {
        const hints2 = this.h, oldSel = sel, len = hints2.length;
        sel = (oldSel + (key < "t" ? len - 1 : 1)) % len;
        setInsertHinting(1);
        VKey.prevent_(event.e); // in case that selecting is too slow
        select_(hints2[sel].d, null, false, action);
        hints2[oldSel].m.className = "IH";
        hints2[sel].m.className = "IH IHS";
        setInsertHinting(0);
        return HandlerResult.Prevent;
      }
      // check `!key` for mapModifier
      if (!key && (keyCode === kKeyCode.shiftKey || keep && (keyCode === kKeyCode.altKey
          || keyCode === kKeyCode.ctrlKey
          || keyCode > kKeyCode.maxNotMetaKey && keyCode < kKeyCode.minNotMetaKeyOrMenu))) { /* empty */ }
      else if (repeat) { return HandlerResult.Nothing; }
      else if (keep ? VKey.isEscape_(key) || (
          VKey.keybody_(key) === kChar.enter
          && (/* a?c?m?-enter */ key < "s" && (key[0] !== "e" || this.h[sel].d.localName === "input"))
        ) : !isIME && keyCode !== kKeyCode.f12
      ) {
        exitInputHint();
        return !VKey.isEscape_(key) ? HandlerResult.Nothing : keep || !raw_insert_lock ? HandlerResult.Prevent
          : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
      }
      return HandlerResult.Nothing;
    }, insert_inputHint!);
  },
  /* kFgCmd.editText: */ function (count: number, options: CmdOptions[kFgCmd.editText]) {
    (raw_insert_lock || options.dom) && VKey.timeout_((): void => {
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
