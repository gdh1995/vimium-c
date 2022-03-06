import {
  chromeVer_, doc, esc, fgCache, isTop, set_esc, VTr, safer, timeout_, loc_, weakRef_not_ff, weakRef_ff, deref_,
  keydownEvents_, parseSedOptions, Stop_, suppressCommonEvents, setupEventListener, vApi, locHref, isTY, min_,
  OnChrome, OnFirefox, OnEdge, firefoxVer_, safeCall, parseOpenPageUrlOptions, os_, abs_, Lower
} from "../lib/utils"
import {
  isHTML_, hasTag_, createElement_, querySelectorAll_unsafe_, SafeEl_not_ff_, docEl_unsafe_, MDW, CLK, derefInDoc_,
  querySelector_unsafe_, DAC, removeEl_s, appendNode_s, setClassName_s, INP, contains_s, toggleClass_s, modifySel,
  focus_, testMatch, docHasFocus_, deepActiveEl_unsafe_, getEditableType_, textOffset_, kDir
} from "../lib/dom_utils"
import {
  pushHandler_, removeHandler_, getMappedKey, prevent_, isEscape_, keybody_, DEL, BSP, ENTER, handler_stack,
  getKeyStat_, suppressTail_
} from "../lib/keyboard_utils"
import {
  view_, wndSize_, isNotInViewport, getZoom_, prepareCrop_, getViewBox_, padClientRect_, isSelARange,
  getBoundingClientRect_, setBoundary_, wdZoom_, dScale_
} from "../lib/rect"
import { post_, set_contentCommands_, runFallbackKey } from "./port"
import {
  addElementList, ensureBorder, evalIfOK, getSelected, getSelectionText, getParentVApi, curModalElement, createStyle,
  getBoxTagName_old_cr, setupExitOnClick, addUIElement, removeSelection, ui_root, kExitOnClick, collpaseSelection,
  hideHelp, set_hideHelp, set_helpBox, checkHidden, flash_,
} from "./dom_ui"
import { hudHide, hudShow, hudTip, hud_text } from "./hud"
import { onPassKey, set_onPassKey, passKeys, set_nextKeys, set_passKeys, keyFSM, onEscDown } from "./key_handler"
import { InputHintItem, activate as linkActivate, clear as linkClear, kSafeAllSelector } from "./link_hints"
import { activate as markActivate } from "./marks"
import { FindAction, activate as findActivate, deactivate as findDeactivate, execCommand } from "./mode_find"
import {
  exitInputHint, insert_inputHint, insert_last_, raw_insert_lock, insert_Lock_, resetInsert, set_is_last_mutable,
  set_inputHint, set_insert_global_, set_isHintingInput, set_insert_last_, onWndBlur, exitInsertMode, set_passAsNormal,
} from "./insert"
import { activate as visualActivate, deactivate as visualDeactivate } from "./visual"
import {
  activate as scActivate, set_cachedScrollable, onActivate, currentScrolling, set_currentScrolling
} from "./scroller"
import { activate as omniActivate, hide as omniHide } from "./omni"
import { findNextInText, findNextInRel } from "./pagination"
import { traverse, getEditable, filterOutNonReachable } from "./local_links"
import {
  select_, unhover_async, set_lastHovered_, hover_async, lastHovered_, catchAsyncErrorSilently, setupIDC_cr, click_async
} from "./async_dispatcher"
/* eslint-disable @typescript-eslint/no-floating-promises */

export const RSC = "readystatechange"

set_contentCommands_([
  /* kFgCmd.framesGoBack: */ (options: CmdOptions[kFgCmd.framesGoBack], rawStep?: number): void => {
    const maxStep = min_(rawStep! < 0 ? -rawStep! : rawStep!, history.length - 1),
    reuse = (options as Extract<typeof options, {r?: null}>).reuse,
    realStep = rawStep! < 0 ? -maxStep : maxStep;
    if (options.r) {
      timeout_((): void => {
        if (!options.u) {
          if (checkHidden(kFgCmd.framesGoBack, options as typeof options & SafeObject, 1)) { return }
          loc_.reload(!!options.hard)
        } else {
          loc_.href = options.u
        }
        runFallbackKey(options, !1)
      }, 17)
    }
    else if ((OnChrome ? Build.MinCVer >= BrowserVer.Min$tabs$$goBack
              : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.Min$tabs$$goBack : !OnEdge)
        || (OnChrome && chromeVer_ > BrowserVer.Min$tabs$$goBack - 1
              || OnFirefox && firefoxVer_ > FirefoxBrowserVer.Min$tabs$$goBack - 1
            ) && maxStep > 1 && !reuse
        || maxStep && reuse && reuse !== "current" // then reuse !== ReuseType.current
    ) {
      // maxStep > 1 && reuse == null || maxStep && reuse && !isCurrent
      post_({ H: kFgReq.framesGoBack, s: realStep, o: options })
    } else {
      maxStep && history.go(realStep);
      runFallbackKey(options, maxStep ? !1 : 2)
    }
  },
  /* kFgCmd.findMode: */ findActivate,
  /* kFgCmd.linkHints: */ linkActivate,
  /* kFgCmd.marks: */ markActivate,
  /* kFgCmd.scroll: */ scActivate,
  /* kFgCmd.visualMode: */ visualActivate,
  /* kFgCmd.vomnibar: */ omniActivate,
  /* kFgCmd.insertMode: */ (opt: CmdOptions[kFgCmd.insertMode]): void => {
    if (opt.u) {
      const done = opt.i ? 9 : derefInDoc_(lastHovered_) ? 0 : 2
      catchAsyncErrorSilently(unhover_async()).then((): void => {
        hudTip(kTip.didUnHoverLast)
        done < 9 && runFallbackKey(opt as Extract<typeof opt, { u: true }>, done)
      })
    }
    if (opt.r) {
      set_cachedScrollable(0), set_currentScrolling(null)
      hover_async()
      resetInsert(), linkClear((2 - opt.r) as BOOL), visualDeactivate && visualDeactivate()
      findDeactivate && findDeactivate(FindAction.ExitNoAnyFocus)
      omniHide(), hideHelp && hideHelp()
      onWndBlur()
    }
    if (opt.i) {
      set_insert_global_(opt)
      opt.h && hudShow(kTip.raw, opt.h)
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
    options.n && post_({ H: kFgReq.optionToggled, k: options.n, v: val })
  },
  /* kFgCmd.passNextKey: */ (options: CmdOptions[kFgCmd.passNextKey], count0: number): void => {
    const keys = safer<{ [keyCode in kKeyCode]: number | false }>({})
    const ignoreCase = options.ignoreCase
    const expectedKeys = options.expect, hasExpected = isTY(expectedKeys) && !!expectedKeys
    let keyCount = 0, count = count0 > 0 ? count0 : -count0
    removeHandler_(kHandler.passNextKey)
    onPassKey ? onPassKey() : esc!(HandlerResult.ExitNormalMode); // singleton
    if (hasExpected || !!options.normal === (count0 > 0)) {
      const oldEsc = esc!, oldPassKeys = passKeys
      if (!hasExpected && !oldPassKeys && !insert_Lock_() && !isTY(options.normal)) { return hudTip(kTip.noPassKeys) }
      set_passKeys(null)
      hasExpected && pushHandler_((event): HandlerResult => {
        const rawKey = getMappedKey(event, raw_insert_lock ? kModeId.Insert : kModeId.Normal)
        const key = rawKey.length > 1 ? `<${rawKey}>` : ignoreCase ? Lower(rawKey) : rawKey
        const matched = !!key && (ignoreCase ? Lower(expectedKeys) : expectedKeys).slice(count - 1).startsWith(key)
        matched && (count += key.length)
        if (count > expectedKeys.length || key && !matched) {
          count = +!matched
          esc!(HandlerResult.ExitNormalMode)
          matched || suppressTail_(GlobalConsts.TimeOfSuppressingTailKeydownEvents, 0)
        } else {
          esc!(HandlerResult.Nothing)
        }
        return HandlerResult.Prevent
      }, kHandler.passNextKey)
      set_passAsNormal(1)
      set_esc((i: HandlerResult): HandlerResult => {
        if (i === HandlerResult.Prevent && 0 >= --count || i === HandlerResult.ExitNormalMode) {
          removeHandler_(kHandler.passNextKey)
          set_passKeys(oldPassKeys)
          set_esc(oldEsc)
          set_passAsNormal(0)
          hudHide()
          runFallbackKey(options, count ? 2 : 0)
          return oldEsc(HandlerResult.Prevent);
        }
        if (i - HandlerResult.RefreshPassAsNormal) {
          oldEsc(HandlerResult.Nothing)
          set_nextKeys(keyFSM)
        }
        if (keyCount - count || !hud_text) {
          keyCount = count;
          hudShow(expectedKeys ? kTip.expectKeys : kTip.normalMode
              , expectedKeys ? expectedKeys.slice(count - 1) : count > 1 ? VTr(kTip.nTimes, [count]) : "")
        }
        return i;
      })
      esc!(HandlerResult.Nothing);
      return;
    }
    const shouldExit_delayed_mac = Build.OS & (1 << kOS.mac) ? (event: KeyboardEvent, isDown: BOOL): boolean => {
      if (!os_ && keyCount && (isDown || !getKeyStat_(event))) {
        for (const rawKey in keys) {
          const key = +rawKey
          if (keys[key] && event.timeStamp - <number> keys[key] > (
                (key > kKeyCode.altKey ? key < kKeyCode.maxNotMetaKey + 1 || key > kKeyCode.minNotMetaKeyOrMenu - 1
                  : key < kKeyCode.shiftKey) ? fgCache.k[0] + 800 : 5e3)) {
            keys[key] = false, --keyCount
          }
        }
        keyCount > 0 || (keyCount = 0, --count) || onPassKey!()
      }
      return !count
    } : null
    pushHandler_(event => {
      if (!event.e.repeat && (Build.OS & (1 << kOS.mac) ? shouldExit_delayed_mac!(event.e, 1) : !count)) {
        return HandlerResult.Nothing
      }
      keyCount += !keys[event.i] as boolean | BOOL as BOOL
      keys[event.i] = Build.OS & ~(1 << kOS.mac) && os_ ? 1 : event.e.timeStamp
      return HandlerResult.PassKey;
    }, kHandler.passNextKey)
    set_onPassKey((event): void => {
      if (event && (Build.OS & (1 << kOS.mac) ? shouldExit_delayed_mac!(event, 0) : !count)) { /* empty */ }
      else if (event && keys[event.keyCode] ? --keyCount > 0 || (keyCount = 0, --count)
          : event === 0 && keyCount || count) {
        keys[event! && event.keyCode] = 0
        keyCount || hudShow(kTip.passNext, count > 1 ? VTr(kTip.nTimes, [count]) : "")
      } else {
        removeHandler_(kHandler.passNextKey)
        set_onPassKey(null)
        hudHide()
        runFallbackKey(options, count ? 2 : 0)
      }
    })
    onPassKey!(0)
  },
  /* kFgCmd.goNext: */ (req: CmdOptions[kFgCmd.goNext]): void => {
    let parApi: VApiTy | null | void, chosen: GoNextBaseCandidate | false | 0 | void
    if (!isTop && (parApi = getParentVApi())
        && !parApi.a(keydownEvents_)) {
      parApi.f(kFgCmd.goNext, req as CmdOptions[kFgCmd.goNext] & FgOptions, 1)
    } else if (chosen = isHTML_()
        && (req.r && findNextInRel(req.r) || req.p.length && findNextInText(req.p, req))) {
      chosen[1].j(chosen[0])
    } else {
      runFallbackKey(req, kTip.noLinksToGo, VTr(kTip.prev + <number> <boolean | number> req.n))
    }
  },
  /* kFgCmd.autoOpen: */ (options: CmdOptions[kFgCmd.autoOpen]): void => {
    const selected = options.selected, opts2 = parseOpenPageUrlOptions(options),
    str = options.s && !selected ? "" : getSelectionText(1) || (options.text || "") + "",
    urlOpt = options.url, getUrl = urlOpt === "raw" ? locHref : vApi.u,
    url = str.trim(), copied = options.copied
    options.copy && (url || !options.o) && post_({
      H: kFgReq.copy,
      s: str as never as undefined,
      e: parseSedOptions(options),
      u: (str ? "" : urlOpt ? getUrl() : doc.title) as "url",
      d: options.decoded || options.decode
    })
    options.o && (url && evalIfOK(url) || post_({
      H: kFgReq.openUrl, c: copied, u: url, o: opts2, n: options
    }))
    options.s && !options.o && post_({
      H: kFgReq.searchAs, u: getUrl(), c: copied, t: selected ? url : "", o: opts2, n: options
    })
  },
  /* kFgCmd.focusInput: */ (options: CmdOptions[kFgCmd.focusInput], count: number): void => {
    const S = "IH IHS"
    const act = options.act || options.action, known_last = derefInDoc_(insert_last_)
    const selectOrClick = (el: SafeHTMLElement, rect?: Rect | null, onlyOnce?: true): Promise<void> => {
      return getEditableType_(el) ? select_(el, rect, onlyOnce, action, onlyOnce)
          : click_async(el, rect, true).then((): void => { onlyOnce && flash_(el) })
    }
    OnFirefox && insert_Lock_()
    if (act && (act[0] !== "l" || known_last && !raw_insert_lock)) {
      let newEl: LockableElement | null | undefined = raw_insert_lock, ret: kTip | 0 | -1 = 0;
      if (newEl) {
        if (act === BSP) {
          if (view_(newEl)) { execCommand(DEL, doc); }
        } else {
          set_insert_last_(OnFirefox ? weakRef_ff(newEl, kElRef.lastEditable) : weakRef_not_ff!(newEl))
          set_is_last_mutable(0)
          newEl.blur();
        }
      } else if (!(newEl = deref_(insert_last_))) {
        ret = kTip.noFocused
      } else if (act !== "last-visible" && view_(newEl) || !isNotInViewport(newEl)) {
        set_insert_last_(null)
        set_is_last_mutable(1)
        getZoom_(newEl);
        prepareCrop_();
        select_(newEl, null, !!options.flash, options.select, true);
      } else {
        ret = act[0] === "l" ? -1 : kTip.focusedIsHidden
      }
      if (ret >= 0) {
        runFallbackKey(options, ret)
        return;
      }
    }
    insert_inputHint && (insert_inputHint.h = null as never);
    const arr = getViewBox_()
    prepareCrop_(1);
    // here those editable and inside UI root are always detected, in case that a user modifies the shadow DOM
    const visibleInputs = traverse(!OnFirefox
          ? VTr(kTip.editableSelector) + kSafeAllSelector : VTr(kTip.editableSelector), options, getEditable
        ) as (Hint & { [0]: SafeHTMLElement })[],
    action = options.select, keep = options.keep, pass = options.passExitKey, reachable = options.reachable;
    if (reachable != null ? reachable : fgCache.e) {
      curModalElement || filterOutNonReachable(visibleInputs as Hint[], 1)
    }
    let sel = visibleInputs.length, firstInput = visibleInputs[0]
    if (sel < 2) {
      exitInputHint();
      sel ? selectOrClick(firstInput[0], firstInput[1], true).then((): void => {
        runFallbackKey(options, options.verify === !1 || insert_Lock_() || deepActiveEl_unsafe_()
            ? 0 : kTip.noInputToFocus)
      }) : runFallbackKey(options, kTip.noInputToFocus)
      return
    }
    let ind = 0
    for (; ind < sel; ind++) {
      const hint = visibleInputs[ind], j = hint[0].tabIndex;
      hint[2] = j > 0 ? (OnChrome ? Build.MinCVer >= BrowserVer.MinStableSort : !OnEdge) ? j : j + ind / 8192
          : j < 0 ? -ind - sel : -ind
    }
    visibleInputs.sort((a, b) => a[2] < 1 || b[2] < 1 ? b[2] - a[2] : a[2] - b[2])
    let hints: InputHintItem[] = visibleInputs.map((link): InputHintItem => {
      const marker = createElement_("span") as InputHintItem["m"],
      rect = padClientRect_(getBoundingClientRect_(link[0]), 3);
      rect.l--, rect.t--, rect.r--, rect.b--;
      setClassName_s(marker, "IH")
      setBoundary_(marker.style, rect);
      return {m: marker, d: link[0]};
    })
    count -= (count > 0) as boolean | BOOL as BOOL
    if (abs_(count) > 2 * sel) {
      sel = count < 0 ? 0 : sel - 1
    } else {
      ind = !known_last || count ? sel : 0
      for (ind = 0; ind < sel && hints[ind].d !== known_last; ind++) { /* empty */ }
      if (ind >= sel) {
        let preferredSelector = (options.prefer || "") + ""
        for (ind = preferredSelector && safeCall(testMatch, preferredSelector, visibleInputs[0]) === false ? 0 : sel;
            ind < sel && !testMatch(preferredSelector, visibleInputs[ind]); ind++) { /* empty */ }
      }
      sel = (((ind + count) % sel) + sel) % sel
    }
    setClassName_s(hints[sel].m, S)
    exitInputHint() // avoid masking inputs
    selectOrClick(hints[sel].d, visibleInputs[sel][1]).then((): void => {
    ensureBorder(wdZoom_ / dScale_)
    set_inputHint({ b: addElementList<false>(hints, arr), h: hints })
    hints = 0 as never
    pushHandler_((event): HandlerResult => {
      const keyCode = event.i, isIME = keyCode === kKeyCode.ime, repeat = event.e.repeat,
      key = isIME || repeat ? "" : getMappedKey(event, kModeId.Insert)
      if (OnFirefox && !insert_Lock_()) {
        exitInputHint()
        return HandlerResult.Prevent
      }
      if (key === kChar.tab || key === `s-${kChar.tab}`) {
        const hints2 = insert_inputHint!.h, oldSel = sel, len = hints2.length;
        sel = (oldSel + (key < "t" ? len - 1 : 1)) % len;
        set_isHintingInput(1)
        prevent_(event.e); // in case that selecting is too slow
        selectOrClick(hints2[sel].d).then((): void => {
          set_isHintingInput(0)
          setClassName_s(hints2[oldSel].m, "IH")
          setClassName_s(hints2[sel].m, S)
        })
        return HandlerResult.Prevent;
      }
      // check `!key` for mapModifier
      else if (keyCode === kKeyCode.shiftKey || (keep && !key && (keyCode === kKeyCode.altKey
                        || keyCode === kKeyCode.ctrlKey
                        || keyCode > kKeyCode.maxNotMetaKey && keyCode < kKeyCode.minNotMetaKeyOrMenu))
              || repeat) {
        return HandlerResult.Nothing;
      }
      else if (keep ? isEscape_(key) || (
          keybody_(key) === ENTER
          && (/* a?c?m?-enter */ key < "s" && (key[0] !== "e" || hasTag_(INP, insert_inputHint!.h[sel].d)))
        ) : !isIME && keyCode !== kKeyCode.f12
      ) {
        exitInputHint();
        return !isEscape_(key) ? HandlerResult.Nothing : keep || !raw_insert_lock ? HandlerResult.Prevent
          : pass ? HandlerResult.PassKey : HandlerResult.Nothing;
      } else {
        return HandlerResult.Nothing;
      }
    }, kHandler.focusInput)
    })
  },
  /* kFgCmd.editText: */ (options: CmdOptions[kFgCmd.editText], count: number) => {
    const lock = insert_Lock_()
    const editable = lock && getEditableType_<0>(lock) === EditableType.TextBox ? lock as TextElement : 0;
    (editable || options.dom) && timeout_((): void => {
      let commands = options.run.split(<RegExpG> /,\s*/g), sel: Selection | undefined, absCount = abs_(count)
      let cur: string | 0, offset: number
      let start: number, end: number, start0: number
      while (0 < absCount--) {
        for (var i = 0; i < commands.length; i += 3) {
          var cmd = commands[i], a1 = commands[i + 1], a2 = commands[i + 2] // eslint-disable-line no-var
          if (cmd === "exec") {
            execCommand(a1, doc, commands[i + 2])
          } else if (cmd === "replace") {
            start = editable && textOffset_(editable), end = editable && textOffset_(editable, 1)
            cur = 0, offset = 0, start0 = start
            execCommand("insertText", doc
                , a1.replace(<RegExpG & RegExpSearchable<0>> /[$%]s|(?:%[a-f\d]{2})+/gi, (s, ind): string => {
              if (s[1] !== "s") {
                offset -= s.length
                s = safeCall(decodeURIComponent, s) || s
                offset += s.length
                return s
              } else {
                cur === 0 && (cur = getSelectionText(1), start += ind + offset)
                offset += cur.length - 2
                end = start0 + ind + offset + 2
                return cur
              }
            }))
            editable === insert_Lock_() && editable.setSelectionRange(start, end, kDir[1])
          } else if (sel = sel || getSelected(), cmd === "collapse") {
            collpaseSelection(sel, a1 === "end")
          } else {
            modifySel(sel, cmd === "auto" ? isSelARange(sel) : cmd < kChar.f
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                , a1 === "count" ? count > 0 : a1 > kChar.f, a2 as any)
          }
        }
      }
      runFallbackKey(options, 0)
    }, 0);
  },
  /* kFgCmd.scrollSelect: */ (options: CmdOptions[kFgCmd.scrollSelect], count: number): void => {
    const { dir, position: pos } = options
    const el = insert_Lock_()
    if (!el || !hasTag_("select", el)) { return }
    let max = el.options.length, old = el.selectedIndex
      , absCount = count > 0 ? count : -count, step: number
    if (pos) {
      step = (pos > "e" && pos < "m" && pos !== "home") === count > 0 ? max - absCount : absCount - 1
    } else {
      step = old + (isTY(dir) ? dir > "p" ? -1 : 1 : dir || 1) * count
    }
    step = step >= max ? max - 1 : step < 0 ? 0 : step
    el.selectedIndex = step
    runFallbackKey(options, step !== old ? 0 : 2)
  },
  /* kFgCmd.toggleStyle: */ (options: CmdOptions[kFgCmd.toggleStyle]): void => {
    let id = options.id, nodes = querySelectorAll_unsafe_(id ? "#" + id : options.selector!),
    disable = options.disabled, el = nodes && nodes[0], par: SafeElement | null
    if (el) {
      ((el as HTMLStyleElement).sheet || el as HTMLLinkElement).disabled =
          disable != null ? !!disable : !(el as HTMLStyleElement | HTMLLinkElement).disabled
    } else if (id) {
      el = createStyle(options.css!)
      el.id = id
      par = OnFirefox ? (doc.head || docEl_unsafe_()) as SafeElement | null : SafeEl_not_ff_!(doc.head)
      par && appendNode_s(par, el)
    }
    (el || id) && runFallbackKey(options, 0)
  },
  /* kFgCmd.dispatchEventCmd: */ (options: CmdOptions[kFgCmd.dispatchEventCmd], count: number): void => {
    const type = options.type, rawClass = options.class
    const evClass = (rawClass && (rawClass[0].toUpperCase() + rawClass.slice(1)) || "Keyboard") + "Event"
    let event: Event | "" | undefined, delay = options.delay, init: EventInit = options.init as undefined || options
    let useResult: BOOL | boolean | undefined, result: boolean | undefined
    if (options.esc) {
      keydownEvents_[kKeyCode.None] = 0
      const ok = !!insert_Lock_() || count > 0
      raw_insert_lock ? exitInsertMode(raw_insert_lock) : ok && onEscDown(0, kKeyCode.None, count > 1)
      keydownEvents_[kKeyCode.None] = 0
      useResult = 1, result = ok
    } else {
      OnChrome && setupIDC_cr!(init)
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event = type && new (window as any)[evClass](type, init)
      } catch {}
      if (event) {
        if (OnChrome && Build.MinCVer < BrowserVer.Min$Event$$IsTrusted
            && chromeVer_ < BrowserVer.Min$Event$$IsTrusted) {
          (event as Writable<typeof event>).isTrusted = false
        }
        const match = options.match
        const el = match ? safeCall(querySelector_unsafe_, match)
            : deepActiveEl_unsafe_() || derefInDoc_(currentScrolling) || deepActiveEl_unsafe_(1)
        const activeEl = OnFirefox ? el : SafeEl_not_ff_!(el as Exclude<typeof el, void>)
        const useClick = options.click
        useResult = !useClick && options.return && !!activeEl
        // earlier, in case listeners are too slow
        useResult || runFallbackKey(options, activeEl && activeEl !== doc.body ? 0 : 2, "", delay)
        activeEl && (useClick && (activeEl as Partial<HTMLElement>).click
            ? (activeEl as HTMLElement).click() : result = activeEl.dispatchEvent(event))
      } else {
        hudTip(kTip.raw, 0, `Can not create ${evClass}#${type}`)
      }
      useResult && runFallbackKey(options, result ? 0 : 2, "", delay)
    }
  },
  /* kFgCmd.showHelpDialog: */ ((options: CmdOptions[kFgCmd.showHelpDialog]): any => {
    // Note: not suppress key on the top, because help dialog may need a while to render,
    // and then a keyup may occur before or after it
    const html = options.h, notHTML = !isHTML_(), oldHide = hideHelp
    oldHide && oldHide()
    if (oldHide && !options.f || html && notHTML) { return }
    if (!html) {
      isTop && notHTML || post_({ H: kFgReq.initHelp,
          a: options as CmdOptions[kFgCmd.showHelpDialog] as ShowHelpDialogOptions,
          w: wndSize_(1) < 400 || wndSize_() < 320 || notHTML })
      return
    }
    let shouldShowAdvanced = options.c, optionUrl = options.o
    const outerBox = createElement_(OnChrome
        && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div")
    setClassName_s(outerBox, "R H" + fgCache.d)
    let box: SafeHTMLElement
    if (OnFirefox) {
      // on FF66, if a page is limited by "script-src 'self'; style-src 'self'"
      //   then `<style>`s created by `.innerHTML = ...` has no effects;
      //   so need `doc.createElement('style').textContent = ...`
      box = new DOMParser().parseFromString((html as Exclude<typeof html, string>).b, "text/html"
          ).body.firstChild as SafeHTMLElement
      box.prepend!(createStyle((html as Exclude<typeof html, string>).h))
      outerBox.append!(box)
    } else {
      outerBox.innerHTML = html as string
      box = outerBox.lastChild as SafeHTMLElement
    }
    box.onclick = Stop_
    suppressCommonEvents(box, MDW)
    if (!OnChrome || Build.MinCVer >= BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument
        || chromeVer_ > BrowserVer.MinMayNoDOMActivateInClosedShadowRootPassedToFrameDocument - 1) {
      setupEventListener(box, OnChrome ? DAC : CLK, onActivate)
    }

    const closeBtn = querySelector_unsafe_("#HCls", box) as HTMLElement,
    optLink = querySelector_unsafe_("#HOpt", box) as HTMLAnchorElement,
    advCmd = querySelector_unsafe_("#HAdv", box) as HTMLElement,
    toggleAdvanced = (): void => {
      const el2 = advCmd.firstChild as HTMLElement
      el2.innerText = el2.dataset["sh"[+shouldShowAdvanced] as "s" | "h"]!
      toggleClass_s(box, "HelpDA")
    }
    set_hideHelp(closeBtn.onclick = (event?: EventToPrevent): void => {
      set_hideHelp(null)
      set_helpBox(null)
      event && prevent_(event)
      advCmd.onclick = optLink.onclick = closeBtn.onclick = null as never
      let i: Element | null | undefined = deref_(lastHovered_)
      i && contains_s(outerBox, i) && set_lastHovered_(null)
      if ((i = deref_(currentScrolling)) && contains_s(box, i)) {
        set_currentScrolling(null)
        set_cachedScrollable(0)
      }
      removeHandler_(kHandler.helpDialog)
      removeEl_s(outerBox)
      setupExitOnClick(kExitOnClick.helpDialog | kExitOnClick.REMOVE)
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
      post_({ H: kFgReq.setSetting, k: 0, v: shouldShowAdvanced })
    }
    shouldShowAdvanced && toggleAdvanced()
    ensureBorder(wdZoom_) // safe to skip `getZoom_`
    addUIElement(outerBox, AdjustType.Normal, true)
    options.e && setupExitOnClick(kExitOnClick.helpDialog)
    docHasFocus_() || vApi.f()
    set_currentScrolling(OnFirefox ? weakRef_ff(box, kElRef.currentScrolling) : weakRef_not_ff!(box))
    set_helpBox(box)
    handler_stack.splice((handler_stack.indexOf(kHandler.omni) + 1 || handler_stack.length + 2) - 2, 0, event => {
      if (!insert_Lock_() && isEscape_(getMappedKey(event, kModeId.Normal))) {
        removeSelection(ui_root) || hideHelp!()
        return HandlerResult.Prevent
      }
      return HandlerResult.Nothing
    }, kHandler.helpDialog)
    // if no [tabindex=0], `.focus()` works if :exp and since MinElement$Focus$MayMakeArrowKeySelectIt or on Firefox
    timeout_((): void => { focus_(box) }, 17)
  }) as (options: CmdOptions[kFgCmd.showHelpDialog]) => void
])
