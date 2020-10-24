import {
  chromeVer_, doc, esc, EscF, fgCache, isTop, set_esc, VOther, VTr, safer, timeout_, loc_, weakRef_, deref_,
  keydownEvents_, parseSedOptions, Stop_, suppressCommonEvents, setupEventListener, vApi, locHref, isTY, max_, min_
} from "../lib/utils"
import {
  isHTML_, htmlTag_, createElement_, frameElement_, querySelectorAll_unsafe_, SafeEl_not_ff_, docEl_unsafe_, MDW, CLK,
  querySelector_unsafe_, DAC, removeEl_s, appendNode_s, setClassName_s, INP, contains_s, toggleClass
} from "../lib/dom_utils"
import {
  pushHandler_, removeHandler_, getMappedKey, prevent_, isEscape_, keybody_, DEL, BSP, ENTER, handler_stack,
  replaceOrSuppressMost_
} from "../lib/keyboard_utils"
import {
  view_, wndSize_, isNotInViewport, getZoom_, prepareCrop_, getViewBox_, padClientRect_,
  getBoundingClientRect_, setBoundary_, wdZoom_, dScale_,
} from "../lib/rect"
import { post_, set_contentCommands_ } from "./port"
import {
  addElementList, ensureBorder, evalIfOK, getSelected, getSelectionText, getParentVApi, curModalElement, createStyle,
  getBoxTagName_cr_, setupExitOnClick, addUIElement, removeSelection, ui_root, kExitOnClick, collpaseSelection,
  hideHelp, set_hideHelp,
} from "./dom_ui"
import { hudHide, hudShow, hudTip, hud_text } from "./hud"
import { onKeyup2, set_onKeyup2, passKeys, installTempCurrentKeyStatus, set_passKeys } from "./key_handler"
import { activate as linkActivate, clear as linkClear, kSafeAllSelector } from "./link_hints"
import { activate as markActivate, gotoMark } from "./marks"
import { activate as findActivate, deactivate as findDeactivate, execCommand, init as findInit } from "./mode_find"
import {
  exitInputHint, insert_inputHint, insert_last_, raw_insert_lock, resetInsert, set_is_last_mutable,
  set_inputHint, set_insert_global_, set_isHintingInput, set_insert_last_, onWndBlur, exitPassMode, set_exitPassMode,
} from "./insert"
import { activate as visualActivate, deactivate as visualDeactivate, kExtend } from "./visual"
import {
  activate as scActivate, set_cachedScrollable, onActivate, currentScrolling, set_currentScrolling
} from "./scroller"
import { activate as omniActivate, hide as omniHide } from "./omni"
import { findNextInText, findNextInRel } from "./pagination"
import { traverse, getEditable, filterOutNonReachable } from "./local_links"
import { select_, unhover_, set_lastHovered_, lastHovered_ } from "./async_dispatcher"

export const RSC = "readystatechange"

set_contentCommands_([
  /* kFgCmd.framesGoBack: */ (options: CmdOptions[kFgCmd.framesGoBack], rawStep?: number): void => {
    const maxStep = min_(rawStep! < 0 ? -rawStep! : rawStep!, history.length - 1),
    reuse = (options as typeof options & {r: 0}).reuse,
    isCurrent = reuse === "current" || reuse === ReuseType.current,
    realStep = rawStep! < 0 ? -maxStep : maxStep;
    if (options.r) {
      timeout_((): void => {
        options.url ? (loc_.href = options.url) : loc_.reload(!!options.hard)
      }, 17)
    }
    else if ((!(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && VOther & BrowserType.Chrome)
        && maxStep > 1
        && (Build.MinCVer >= BrowserVer.Min$Tabs$$goBack || chromeVer_ >= BrowserVer.Min$Tabs$$goBack)
        && (reuse == null || !isCurrent)
        || maxStep && reuse && !isCurrent
    ) {
      post_({ H: kFgReq.framesGoBack, s: realStep, r: reuse, p: options.position });
    } else {
      maxStep && history.go(realStep);
    }
  },
  /* kFgCmd.findMode: */ findActivate,
  /* kFgCmd.linkHints: */ linkActivate,
  /* kFgCmd.marks: */ markActivate,
  /* kFgCmd.goToMarks: */ gotoMark,
  /* kFgCmd.scroll: */ scActivate,
  /* kFgCmd.visualMode: */ visualActivate,
  /* kFgCmd.vomnibar: */ omniActivate,
  /* kFgCmd.insertMode: */ (opt: CmdOptions[kFgCmd.insertMode]): void => {
    if (opt.u) {
      unhover_()
      hudTip(kTip.didUnHoverLast)
    }
    if (opt.r) {
      set_cachedScrollable(0), set_currentScrolling(null), set_lastHovered_(null)
      resetInsert(), linkClear((2 - opt.r) as BOOL), visualDeactivate()
      findInit || findDeactivate(FindNS.Action.ExitNoAnyFocus)
      omniHide(), hideHelp && hideHelp()
      onWndBlur()
    }
    if (opt.i) {
      set_insert_global_(opt)
      opt.h && hudShow(kTip.raw, opt.h!)
    }
  },

  /* kFgCmd.toggle: */ (options: CmdOptions[kFgCmd.toggle]): void => {
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
  /* kFgCmd.passNextKey: */ (options: CmdOptions[kFgCmd.passNextKey], count0: number): void => {
    let keyCount = 0, count = count0 > 0 ? count0 : -count0
    if (!!options.normal === (count0 > 0)) {
      esc!(HandlerResult.ExitPassMode); // singleton
      if (!passKeys) {
        return hudTip(kTip.noPassKeys);
      }
      const oldEsc = esc!, oldPassKeys = passKeys;
      set_passKeys(null)
      set_esc(((i: HandlerResult): HandlerResult => {
        if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.ExitPassMode) {
          hudHide();
          set_passKeys(oldPassKeys)
          set_esc(oldEsc)
          return oldEsc(HandlerResult.Prevent);
        }
        installTempCurrentKeyStatus()
        if (keyCount - count || !hud_text) {
          keyCount = count;
          hudShow(kTip.normalMode, count > 1 ? VTr(kTip.nTimes, [count]) : "")
        }
        return i;
      }) as EscF)
      esc!(HandlerResult.Nothing);
      return;
    }
    const keys = safer<{ [keyCode in kKeyCode]: BOOL }>({})
    replaceOrSuppressMost_(kHandler.passNextKey, event => {
      keyCount += +!keys[event.i];
      keys[event.i] = 1;
      return HandlerResult.PassKey;
    })
    set_onKeyup2((event): void => {
      if (keyCount === 0 || --keyCount || --count) {
        keys[event && event.keyCode] = 0
        hudShow(kTip.passNext, count > 1 ? VTr(kTip.nTimes, [count]) : "");
      } else {
        exitPassMode!();
      }
    })
    onKeyup2!(<0> kKeyCode.None)
    set_exitPassMode((): void => {
      set_exitPassMode(null)
      set_onKeyup2(null)
      removeHandler_(kHandler.passNextKey)
      hudHide();
    })
  },
  /* kFgCmd.goNext: */ (req: CmdOptions[kFgCmd.goNext]): void => {
    let isNext = !req.r.includes("prev"), parApi: VApiTy | null | void, chosen: GoNextBaseCandidate | false | 0 | null
    if (!isTop && (parApi = Build.BTypes & BrowserType.Firefox ? getParentVApi() : frameElement_() && getParentVApi())
        && !parApi.a(keydownEvents_)) {
      parApi.f(kFgCmd.goNext, req as CmdOptions[kFgCmd.goNext] & FgOptions, 1)
    } else if (chosen = isHTML_()
        && (req.r && findNextInRel(req.r) || req.p.length && findNextInText(req.p, isNext, req.l, req.m))) {
      chosen[1].j(chosen[0])
    } else {
      hudTip(kTip.noLinksToGo, 0, VTr(kTip.prev + <number> <boolean | number> isNext));
    }
  },
  /* kFgCmd.autoOpen: */ (options: CmdOptions[kFgCmd.autoOpen]): void => {
    let selected = options.selected,
    str = options.s && !selected ? "" : getSelectionText(1) || (options.text || "") + "",
    url = str.trim()
    options.copy && (url || !options.o) && post_({
      H: kFgReq.copy,
      s: str as never as undefined,
      e: parseSedOptions(options),
      u: (str ? "" : options.url ? vApi.u() : doc.title) as "url",
      d: options.decoded || options.decode
    })
    options.o && (url && evalIfOK(url) || post_({
      H: kFgReq.openUrl, c: !url, k: options.keyword, t: options.testUrl, u: url, r: options.reuse
    }))
    options.s && post_({
      H: kFgReq.searchAs,
      u: vApi.u(),
      c: options.copied,
      s: parseSedOptions(options),
      t: selected ? url : ""
    })
  },
  /* kFgCmd.focusInput: */ (options: CmdOptions[kFgCmd.focusInput], count: number): void => {
    const S = "IH IHS"
    const act = options.act || options.action, known_last = deref_(insert_last_);
    if (act && (act[0] !== "l" || known_last && !raw_insert_lock)) {
      let newEl: LockableElement | null | undefined = raw_insert_lock, ret: BOOL = 1;
      if (newEl) {
        if (act === BSP) {
          if (view_(newEl)) { execCommand(DEL, doc); }
        } else {
          set_insert_last_(weakRef_(newEl))
          set_is_last_mutable(0)
          newEl.blur();
        }
      } else if (!(newEl = known_last)) {
        hudTip(kTip.noFocused, 1200);
      } else if (act !== "last-visible" && view_(newEl) || !isNotInViewport(newEl)) {
        set_insert_last_(null)
        set_is_last_mutable(1)
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
          ? VTr(kTip.editableSelector) + kSafeAllSelector : VTr(kTip.editableSelector), getEditable
        ) as InputHint[],
    action = options.select, keep = options.keep, pass = options.passExitKey, reachable = options.reachable;
    if (reachable != null ? reachable : fgCache.e) {
      curModalElement || filterOutNonReachable(visibleInputs, 1)
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
          (link): HintsNS.InputHintItem => {
      const marker = createElement_("span") as HintsNS.BaseHintItem["m"],
      rect = padClientRect_(getBoundingClientRect_(link[0]), 3);
      rect.l--, rect.t--, rect.r--, rect.b--;
      setClassName_s(marker, "IH")
      setBoundary_(marker.style, rect);
      return {m: marker, d: link[0]};
    })
    if (count === 1 && known_last) {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Array$$find$$findIndex) {
        sel = max_(0, hints.map(link => link.d).indexOf(known_last))
      } else {
        sel = max_(0, hints.findIndex(link => link.d === known_last))
      }
    } else {
      sel = count > 0 ? min_(count, sel) - 1 : max_(0, sel + count);
    }
    setClassName_s(hints[sel].m, S)
    ensureBorder(wdZoom_ / dScale_);
    select_(hints[sel].d, visibleInputs[sel][1], false, action, false).then((): void => {
      insert_inputHint!.b = addElementList<false>(hints, arr)
    })
    exitInputHint();
    set_inputHint({ b: null, h: hints })
    pushHandler_((event) => {
      const keyCode = event.i, isIME = keyCode === kKeyCode.ime, repeat = event.e.repeat,
      key = isIME || repeat ? "" : getMappedKey(event, kModeId.Insert)
      if (key === kChar.tab || key === `s-${kChar.tab}`) {
        const hints2 = insert_inputHint!.h, oldSel = sel, len = hints2.length;
        sel = (oldSel + (key < "t" ? len - 1 : 1)) % len;
        set_isHintingInput(1)
        prevent_(event.e); // in case that selecting is too slow
        select_(hints2[sel].d, null, false, action).then((): void => {
          set_isHintingInput(0)
          setClassName_s(hints2[oldSel].m, "IH")
          setClassName_s(hints2[sel].m, S)
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
          && (/* a?c?m?-enter */ key < "s" && (key[0] !== "e" || htmlTag_(insert_inputHint!.h[sel].d) === INP))
        ) : !isIME && keyCode !== kKeyCode.f12
      ) {
        exitInputHint();
        return !isEscape_(key) ? HandlerResult.Nothing : keep || !raw_insert_lock ? HandlerResult.Prevent
          : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
      } else {
        return HandlerResult.Nothing;
      }
    }, kHandler.focusInput)
  },
  /* kFgCmd.editText: */ (options: CmdOptions[kFgCmd.editText], count: number) => {
    (raw_insert_lock || options.dom) && timeout_((): void => {
      let commands = options.run.split(<RegExpG> /,\s*/g), sel: Selection | undefined;
      while (0 < count--) {
        for (let i = 0; i < commands.length; i += 3) {
          const cmd = commands[i], a1 = commands[i + 1], a2 = commands[i + 2]
          if (cmd === "exec") {
            execCommand(a1, doc, commands[i + 2])
          } else if (cmd === "replace") {
            (raw_insert_lock as HTMLInputElement).setRangeText(a1, null, null, a2)
          } else if (sel = sel || getSelected(), cmd === "collapse") {
            collpaseSelection(sel, a1 === "end")
          } else {
            sel.modify(cmd === "auto" ? sel.type === "Range" ? kExtend : "move" : cmd as any,
                a1 as any, a2 as any)
          }
        }
      }
    }, 0);
  },
  /* kFgCmd.scrollSelect: */ ({ dir, position: pos }: CmdOptions[kFgCmd.scrollSelect], count: number): void => {
    const el = raw_insert_lock as HTMLSelectElement | null
    if (!el || htmlTag_(el) !== "select") { return }
    let max = el.options.length
      , absCount = count > 0 ? count : -count, step: number
    if (pos) {
      step = (pos > "e" && pos < "m" && pos !== "home") === count > 0 ? max - absCount : absCount - 1
    } else {
      step = el.selectedIndex + (isTY(dir) ? dir > "p" ? -1 : 1 : dir || 1) * count
    }
    step = step >= max ? max - 1 : step < 0 ? 0 : step
    el.selectedIndex = step
  },
  /* kFgCmd.toggleStyle: */ (options: CmdOptions[kFgCmd.toggleStyle]): void => {
    let id = options.id, nodes = querySelectorAll_unsafe_(id ? "#" + id : options.selector!),
    el = nodes && nodes[0], par: SafeElement | null
    if (el) {
      (el as HTMLStyleElement | HTMLLinkElement).disabled = !(el as HTMLStyleElement | HTMLLinkElement).disabled
    } else if (id) {
      el = createStyle(options.css!)
      el.id = id
      par = Build.BTypes & ~BrowserType.Firefox ? SafeEl_not_ff_!(doc.head)
          : (doc.head || docEl_unsafe_()) as SafeElement | null
      par && appendNode_s(par, el)
    }
  },
  /* kFgCmd.showHelpDialog: */ ((options: Exclude<CmdOptions[kFgCmd.showHelpDialog], {h?: null}>): any => {
    // Note: not suppress key on the top, because help dialog may need a while to render,
    // and then a keyup may occur before or after it
    const html = options.h, isNowHTML = isHTML_()
    if (hideHelp || html && !isNowHTML) { hideHelp && hideHelp(); return }
    if (!html) {
      isTop && !isNowHTML || post_({ H: kFgReq.initHelp,
          a: options as CmdOptions[kFgCmd.showHelpDialog] as ShowHelpDialogOptions,
          w: wndSize_(1) < 400 || wndSize_() < 320 || isNowHTML })
      return
    }
    let shouldShowAdvanced = options.c, optionUrl = options.o
    let box: SafeHTMLElement, outerBox: SafeHTMLElement | undefined
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || VOther === BrowserType.Firefox)) {
      // on FF66, if a page is limited by "script-src 'self'; style-src 'self'"
      //   then `<style>`s created by `.innerHTML = ...` has no effects;
      //   so need `doc.createElement('style').textContent = ...`
      box = new DOMParser().parseFromString((html as Exclude<typeof html, string>).b, "text/html"
          ).body.firstChild as SafeHTMLElement
      box.prepend!(createStyle((html as Exclude<typeof html, string>).h))
    } else {
      outerBox = createElement_(Build.BTypes & BrowserType.Chrome ? getBoxTagName_cr_() : "div")
      setClassName_s(outerBox, "R H")
      outerBox.innerHTML = html as string
      box = outerBox.lastChild as SafeHTMLElement
    }
    box.onclick = Stop_
    suppressCommonEvents(box, MDW)
    if (Build.MinCVer >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument
        || !(Build.BTypes & BrowserType.Chrome)
        || chromeVer_ > BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument - 1) {
      setupEventListener(box,
        (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
          : VOther !== BrowserType.Chrome) ? CLK : DAC, onActivate)
    }

    const closeBtn = querySelector_unsafe_("#HCls", box) as HTMLElement,
    optLink = querySelector_unsafe_("#HOpt", box) as HTMLAnchorElement,
    advCmd = querySelector_unsafe_("#HAdv", box) as HTMLElement,
    toggleAdvanced = (): void => {
      const el2 = advCmd.firstChild as HTMLElement
      el2.innerText = el2.dataset[shouldShowAdvanced ? "h" : "s"]!
      toggleClass(box, "HelpDA")
    }
    set_hideHelp(closeBtn.onclick = (event?: EventToPrevent): void => {
      set_hideHelp(null)
      event && prevent_(event)
      advCmd.onclick = optLink.onclick = closeBtn.onclick = null as never
      let i: Element | null | undefined = deref_(lastHovered_)
      i && contains_s(box, i) && set_lastHovered_(null)
      if ((i = deref_(currentScrolling)) && contains_s(box, i)) {
        set_currentScrolling(null)
        set_cachedScrollable(0)
      }
      removeHandler_(kHandler.helpDialog)
      removeEl_s(box)
      setupExitOnClick(kExitOnClick.helpDialog | kExitOnClick.REMOVE)
      closeBtn.click()
    })
    if (! locHref().startsWith(optionUrl)) {
      optLink.href = optionUrl
      optLink.onclick = event => {
        post_({ H: kFgReq.focusOrLaunch, u: optionUrl })
        hideHelp!(event)
      }
    } else {
      removeEl_s(optLink)
    }
    advCmd.onclick = event => {
      prevent_(event)
      shouldShowAdvanced = !shouldShowAdvanced
      toggleAdvanced()
      post_({
        H: kFgReq.setSetting,
        k: 0,
        v: shouldShowAdvanced
      })
    }
    shouldShowAdvanced && toggleAdvanced()
    ensureBorder() // safe to skip `getZoom_`
    addUIElement(outerBox || box, AdjustType.Normal, true)
    options.e && setupExitOnClick(kExitOnClick.helpDialog)
    doc.hasFocus() || vApi.f()
    set_currentScrolling(weakRef_(box))
    handler_stack.splice((handler_stack.indexOf(kHandler.omni) + 1 || handler_stack.length + 2) - 2, 0, event => {
      if (!raw_insert_lock && isEscape_(getMappedKey(event, kModeId.Normal))) {
        removeSelection(ui_root) || hideHelp!()
        return HandlerResult.Prevent
      }
      return HandlerResult.Nothing
    }, kHandler.helpDialog)
    // if no [tabindex=0], `.focus()` works if :exp and since MinElement$Focus$MayMakeArrowKeySelectIt or on Firefox
    timeout_((): void => { box.focus() }, 17)
  }) as (options: CmdOptions[kFgCmd.showHelpDialog]) => any
])
