/**
 * Note(gdh1995):
 * - @unknown_di_result: means it does not guarantee anything about @di
 * - @safe_di: means it accepts any @di and will force @di to be correct on return
 * - @tolerate_di_if_caret: means it only allows a mistaken di in caret mode, and always returns with a correct di
 * - @not_related_to_di: means it has no knowledge or influence on @di
 * - all others: need a correct @di, and will force @di to be correct on return
 */
import kDirTy = VisualModeNS.kDir
import ForwardDir = VisualModeNS.ForwardDir
import Mode = VisualModeNS.Mode
import kG = VisualModeNS.kG
import kVimG = VisualModeNS.kVimG
  /** although values are made by flags, these types are exclusive */
declare const enum DiType {
    Normal = 0,
    Unknown = 1,
    TextBox = 2,
    isUnsafe = 4,
    Complicated = 8,

    SafeUnknown = 1,
    UnsafeUnknown = 5,
    SafeTextBox = 2,
    UnsafeTextBox = 6,
    SafeComplicated = 8,
    UnsafeComplicated = 12,
}
type ValidDiTypes = DiType.Normal | DiType.UnsafeTextBox | DiType.SafeTextBox | DiType.Complicated
    | DiType.UnsafeComplicated;

import { VTr, isAlive_, VOther, clearTimeout_, safer, timeout_, fgCache, doc, chromeVer_ } from "../lib/utils"
import {
  getSelectionBoundingBox_, getZoom_, prepareCrop_, cropRectToVisible_, getSelection_, getSelectionFocusEdge_,
  editableTypes_, Getter_not_ff_, isInputInTextMode_, isHTML_, docEl_unsafe_, notSafe_not_ff_, getVisibleClientRect_,
  getEditableType_,
} from "../lib/dom_utils"
import { checkDocSelectable, getSelected, resetSelectionToDocStart, flash_ } from "./dom_ui"
import { prepareTop, clearTop, executeScroll, scrollIntoView_need_safe } from "./scroller"
import {
  toggleSelectableStyle, find_query, executeFind, find_hasResults, updateQuery as findUpdateQuery,
} from "./mode_find"
import { insert_Lock_ } from "./mode_insert"
import { hudShow, hudTip, hudHide } from "./hud"
import { post_, send_ } from "./port"
import { removeHandler_, pushHandler_, getMappedKey, keybody_, isEscape_, prevent_, ENT } from "../lib/keyboard_utils"

const kDir = ["backward", "forward"] as const
let _kGranularity: GranularityNames

let mode_ = Mode.NotActive
let modeName = ""
let hudTimer = TimerID.None
let currentCount = 0
let currentSeconds: SafeDict<VisualAction> | null = null
let retainSelection = false
let scope: ShadowRoot | null = null
let curSelection: Selection = null as never
/** need real diType */
let selType: () => SelType = null as never
let keyMap: SafeDict<VisualAction | SafeDict<VisualAction>> = null as never
let alterMethod: "move" | "extend" = "" as never
let di_: ForwardDir | kDirTy.unknown = kDirTy.unknown
let diType_: ValidDiTypes | DiType.UnsafeUnknown | DiType.SafeUnknown = DiType.UnsafeUnknown
/** 0 means it's invalid; >=2 means real_length + 2; 1 means uninited */
let oldLen_ = 0
let WordsRe_ff_old_cr: RegExpOne | RegExpU | null = null
let rightWhiteSpaceRe: RegExpOne | null = null
let kExtend = "extend" as const

export { mode_ as visual_mode, kDir, kExtend }

  /** @safe_di */
export const activate = (options: CmdOptions[kFgCmd.visualMode]): void => {
    init && init(options.w!, options.k!, _kGranularity = options.g!)
    removeHandler_(activate)
    checkDocSelectable();
    prepareTop()
    diType_ = DiType.UnsafeUnknown
    let theSelected = getSelected(1),
    sel: Selection = curSelection = theSelected[0],
    type: SelType = selType(), mode: CmdOptions[kFgCmd.visualMode]["m"] = options.m
    scope = theSelected[1]
    if (!mode_) { retainSelection = type === SelType.Range }
    if (mode !== Mode.Caret) {
      if (!insert_Lock_() && /* (type === SelType.Caret || type === SelType.Range) */ type) {
        const { left: l, top: t, right: r, bottom: b} = getSelectionBoundingBox_(sel);
        getZoom_(1);
        prepareCrop_();
        if (!cropRectToVisible_(l, t, (l || r) && r + 3, (t || b) && b + 3)) {
          resetSelectionToDocStart(sel);
        } else if (type === SelType.Caret) {
          extend(kDirTy.right)
          selType() === SelType.Range || extend(kDirTy.left)
        }
        type = selType()
      }
    }
    const isRange = type === SelType.Range, newMode = isRange ? mode : Mode.Caret,
    toCaret = newMode === Mode.Caret;
    hudTimer && clearTimeout_(hudTimer)
    hudShow(kTip.visualMode,
        [modeName = VTr(toCaret ? "Caret" : newMode === Mode.Line ? "Line" : "Visual")],
        !!options.r);
    if (newMode !== mode) {
      prompt(kTip.noUsableSel, 1000)
    }
    toggleSelectableStyle(1);
    di_ = isRange ? kDirTy.unknown : kDirTy.right
    mode_ = newMode
    alterMethod = toCaret ? "move" : kExtend
    if (/* type === SelType.None */ !type && establishInitialSelectionAnchor(theSelected[1])) {
      deactivate()
      return hudTip(kTip.needSel)
    }
    if (toCaret && isRange) {
      // `sel` is not changed by @establish... , since `isRange`
      mode = ("" + sel).length;
      collapseToRight((getDirection() & +(mode > 1)) as BOOL)
    }
    commandHandler(VisualAction.Noop, 1)
    pushHandler_(onKeydown, activate)
}

  /** @safe_di */
export const deactivate = (isEsc?: 1): void => {
    if (!mode_) { return; }
    di_ = kDirTy.unknown
    diType_ = DiType.UnsafeUnknown
    getDirection("")
    const oldDiType: DiType = diType_
    removeHandler_(activate)
    if (!retainSelection) {
      collapseToFocus(isEsc && mode_ !== Mode.Caret ? 1 : 0)
    }
    mode_ = Mode.NotActive; modeName = ""
    const el = insert_Lock_();
    oldDiType & (DiType.TextBox | DiType.Complicated) ||
    el && el.blur();
    toggleSelectableStyle(0);
    /*#__INLINE__*/ clearTop()
    retainSelection = false
    resetKeys()
    curSelection = null as never
    scope = null
    hudHide();
}

  /** @unknown_di_result */
const onKeydown = (event: HandlerNS.Event): HandlerResult => {
    const doPass = event.i === kKeyCode.ime || event.i === kKeyCode.menuKey && fgCache.o,
    key = doPass ? "" : getMappedKey(event, kModeId.Visual), keybody = keybody_(key);
    if (!key || isEscape_(key)) {
      !key || currentCount || currentSeconds ? resetKeys() : deactivate(1)
      // if doPass, then use nothing to bubble such an event, so handlers like LinkHints will also exit
      return key ? HandlerResult.Prevent : doPass ? HandlerResult.Nothing : HandlerResult.Suppress;
    }
    if (keybody_(key) === ENT) {
      resetKeys()
      if (key.includes("s-") && mode_ !== Mode.Caret) { retainSelection = true }
      "cm".includes(key[0]) ? deactivate() : yank(key[0] === "a" ? 9 : 8)
      return HandlerResult.Prevent;
    }
    const count = currentCount, childAction = currentSeconds && currentSeconds[key],
    newActions = childAction != null ? childAction : keyMap[key]
    if (typeof newActions !== "number") {
      // asserts newActions is SafeDict<VisualAction> | null | undefined
      currentCount = !newActions && key.length < 2 && +key < 10 ? currentSeconds ? +key : +key + count * 10 : 0
      currentSeconds = newActions || null
      return newActions ? HandlerResult.Prevent
          : keybody.length > 1 || key !== keybody && key[0] !== "s"
          ? keybody < kChar.f1 || keybody > kChar.maxF_num ? HandlerResult.Suppress : HandlerResult.Nothing
          : HandlerResult.Prevent;
    }
    resetKeys()
    prevent_(event.e);
    di_ = kDirTy.unknown // make @di safe even when a user modifies the selection
    diType_ = DiType.UnsafeUnknown
    commandHandler(newActions, count || 1)
    return HandlerResult.Prevent;
}

  /** @not_related_to_di */
const resetKeys = (): void => {
  currentCount = 0; currentSeconds = null
}

  /** @unknown_di_result */
const commandHandler = (command: VisualAction, count: number): void => {
    let mode = mode_
    if (command > VisualAction.MaxNotScroll) {
      executeScroll(1, command - VisualAction.ScrollDown ? -count : count, 0)
      return;
    }
    if (command > VisualAction.MaxNotNewMode) {
      if (command === VisualAction.EmbeddedFindMode) {
        clearTimeout_(hudTimer)
        post_({ H: kFgReq.findFromVisual });
        return;
      }
      activate(safer<CmdOptions[kFgCmd.visualMode]>({
        m: command - VisualAction.MaxNotNewMode
      }));
      return
    }
    if (scope && !curSelection.rangeCount) {
      scope = null
      curSelection = getSelection_()
      if (command < VisualAction.MaxNotFind + 1 && !curSelection.rangeCount) {
        deactivate()
        return hudTip(kTip.loseSel);
      }
    }
    if (command === VisualAction.HighlightRange) {
      return highlightRange(curSelection)
    }
    mode === Mode.Caret && collapseToFocus(0)
    if (command > VisualAction.MaxNotFind) {
      findV(command - VisualAction.PerformFind ? count : -count)
      return;
    } else if (command > VisualAction.MaxNotYank) {
      command === VisualAction.YankLine && selectLine(count)
      yank(([8, 8, 9, ReuseType.current, ReuseType.newFg] as const)[command - VisualAction.Yank])
      if (command !== VisualAction.YankWithoutExit) { return; }
    } else if (command > VisualAction.MaxNotLexical) {
      selectLexicalEntity((command - VisualAction.MaxNotLexical
          ) as kG.sentence | kG.word, count)
    } else if (command === VisualAction.Reverse) {
      reverseSelection()
    } else if (command >= VisualAction.MinWrapSelectionModify) {
      runMovements((command & 1) as 0 | 1, command >> 1, count)
    }
    if (mode === Mode.Caret) {
      extend(kDirTy.right)
      if (selType() === SelType.Caret) {
        extend(kDirTy.left)
      }
    } else if (mode === Mode.Line) {
      ensureLine(command)
    }
    getDirection("")
    if (diType_ & DiType.Complicated) { return }
    const focused = getSelectionFocusEdge_(curSelection, di_ as ForwardDir)
    if (focused) {
      scrollIntoView_need_safe(focused)
    }
}

  /** @safe_di requires selection is None on called, and may change `selection_` */
const establishInitialSelectionAnchor = (sr?: ShadowRoot | null): boolean => {
    if (!(Build.NDEBUG || curSelection && curSelection.type === "None")) {
      console.log('Assert error: VVisual.selection_ && VVisual.selection_.type === "None"');
    }
    let node: Text | null, str: string | undefined, offset: number
    if (!isHTML_()) { return true; }
    getZoom_(1);
    prepareCrop_();
    const nodes = doc.createTreeWalker(sr || doc.body || docEl_unsafe_()!
            , NodeFilter.SHOW_TEXT);
    while (node = nodes.nextNode() as Text | null) {
      if (50 <= (str = node.data).length && 50 < str.trim().length) {
        const element = node.parentElement;
        if (element && (!(Build.BTypes & ~BrowserType.Firefox) || !notSafe_not_ff_!(element))
            && getVisibleClientRect_(element as SafeElement) && !getEditableType_(element)) {
          break;
        }
      }
    }
    if (!node) {
      if (sr) {
        curSelection = getSelection_()
        scope = null
        return establishInitialSelectionAnchor()
      }
      return true;
    }
    offset = str!.match(<RegExpOne> /^\s*/)![0].length;
    curSelection.collapse(node, offset)
    di_ = kDirTy.right
    return !curSelection.rangeCount
}

  /** @not_related_to_di */
export const prompt = (tid: kTip, duration: number, args?: string[]): void => {
  hudTimer && clearTimeout_(hudTimer)
  hudTimer = timeout_(ResetHUD, duration)
  hudShow(tid, args)
}

  /** @not_related_to_di */
const ResetHUD = (i?: TimerType.fake): void => {
  if (!isAlive_ || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) {
    return
  }
  hudTimer = TimerID.None
  if (modeName) { hudShow(kTip.visualMode, [modeName]) }
}

const findV = (count: number): void => {
    if (!find_query) {
      send_(kFgReq.findQuery, {}, function (query): void {
        if (query) {
          findUpdateQuery(query);
          findV(count)
        } else {
          prompt(kTip.noOldQuery, 1000)
        }
      });
      return;
    }
    const sel = curSelection, range = sel.rangeCount && (getDirection(""), !diType_) && sel.getRangeAt(0)
    executeFind(null, { noColor: true, n: count });
    if (find_hasResults) {
      diType_ = DiType.UnsafeUnknown
      if (mode_ === Mode.Caret && selType() === SelType.Range) {
        activate(safer<CmdOptions[kFgCmd.visualMode]>({
          m: Mode.Visual
        }));
      } else {
        di_ = kDirTy.unknown
        commandHandler(VisualAction.Noop, 1)
      }
    } else {
      range && !sel.rangeCount && sel.addRange(range)
      prompt(kTip.noMatchFor, 1000, [find_query])
    }
}

  /**
   * @safe_di if action !== true
   * @not_related_to_di otherwise
   */
const yank = (action: /* copy but not exit */ 9 | /* copy&exit */ 8 | ReuseType.current | ReuseType.newFg): void => {
    const str = "" + curSelection
    if (action < 9) {
      deactivate()
    }
    post_(action < 8 ? { H: kFgReq.openUrl, u: str, r: action } : { H: kFgReq.copy, s: str });
}

export const highlightRange = (sel: Selection): void => {
    const br = sel.rangeCount > 0 ? getSelectionBoundingBox_(sel) : null;
    if (br && br.height > 0 && br.right > 0) { // width may be 0 in Caret mode
      let cr = cropRectToVisible_(br.left - 4, br.top - 5, br.right + 3, br.bottom + 4);
      cr && flash_(null, cr, 660, " Sel");
    }
}

  /** @unknown_di_result */
const extend = (d: ForwardDir, g?: kG): void | 1 => {
  curSelection.modify(kExtend, kDir[d], _kGranularity[g || kG.character])
  diType_ &= ~DiType.isUnsafe
}

  /** @unknown_di_result */
const modify = (d: ForwardDir, g: kG): void => {
  curSelection.modify(alterMethod, kDir[d], _kGranularity[g])
}

  /**
   * if `isMove`, then must has collapsed;
   *
   * if return `''`, then `@hasModified_` is not defined
   */
const getNextRightCharacter = (isMove: BOOL): string => {
    const diType = diType_
    oldLen_ = 0
    if (diType & DiType.TextBox) {
      const el = insert_Lock_() as TextElement;
      return el.value.charAt(TextOffset(el
          , di_ === kDirTy.right || el.selectionDirection !== kDir[0]))
    }
    const sel = curSelection
    if (!diType) {
      let focusNode = sel.focusNode!;
      if (focusNode.nodeType === kNode.TEXT_NODE) {
        const i = sel.focusOffset, str = (focusNode as Text).data;
        if (str.charAt(i).trim() || i && str.charAt(i - 1).trim() && str.slice(i).trimLeft()
              && (str[i] !== "\n" && !(Build.BTypes & BrowserType.Firefox && str[i] === "\r"))) {
          return str[i];
        }
      }
    }
    let oldLen = 0;
    if (!isMove) {
      const beforeText = "" + sel;
      if (beforeText && (!getDirection(beforeText) || selType() === SelType.Caret)) {
        return beforeText[0];
      }
      oldLen = beforeText.length
    }
    // here, the real di must be kDir.right (range if in visual mode else caret)
    oldLen_ || extend(kDirTy.right)
    const afterText = "" + sel, newLen = afterText.length;
    if (newLen !== oldLen) {
      // if isMove, then cur sel is >= 1 char & di is right
      isMove && collapseToRight(newLen === 1 ? kDirTy.right : kDirTy.left)
      oldLen_ = isMove && newLen !== 1 ? 0 : 2 + oldLen
      return afterText[newLen - 1];
    }
    return "";
}

const runMovements = (direction: ForwardDir, granularity: kG | kVimG.vimWord
      , count: number): void => {
    const shouldSkipSpaceWhenMovingRight = granularity === kVimG.vimWord
    const isFirefox = !(Build.BTypes & ~BrowserType.Firefox)
      || !!(Build.BTypes & BrowserType.Firefox) && VOther === BrowserType.Firefox;
    let fixWord: BOOL = 0;
    if (shouldSkipSpaceWhenMovingRight || granularity === kG.word) {
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/editing_behavior.h?type=cs&q=ShouldSkipSpaceWhenMovingRight&g=0&l=99
      if (direction &&
          (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && isFirefox
            ? !Build.NativeWordMoveOnFirefox || shouldSkipSpaceWhenMovingRight
            : (fgCache.o > kOS.MAX_NOT_WIN) !== shouldSkipSpaceWhenMovingRight)) {
        fixWord = 1;
        if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && isFirefox
            ? !Build.NativeWordMoveOnFirefox : !shouldSkipSpaceWhenMovingRight) {
          count--;
        }
      }
      granularity = kG.word
    }
    const oldDi = di_
    while (0 < count--) {
      curSelection.modify(alterMethod, kDir[direction], _kGranularity[granularity as kG])
    }
    // it's safe to remove `isUnsafe` here, because:
    // either `count > 0` or `fixWord && _moveRight***()`
    mode_ !== Mode.Caret && (diType_ &= ~DiType.isUnsafe)
    di_ = direction === oldDi ? direction : kDirTy.unknown
    if (granularity === kG.lineBoundary) {
      prompt(kTip.selectLineBoundary, 2000)
    }
    if (fixWord) {
      if (!shouldSkipSpaceWhenMovingRight) { // not shouldSkipSpace -> go left
        if (!(Build.BTypes & BrowserType.Firefox) || !Build.NativeWordMoveOnFirefox
            || Build.BTypes & ~BrowserType.Firefox && !isFirefox) {
          moveRightByWordButNotSkipSpace!()
        }
        return;
      }
      !Build.NativeWordMoveOnFirefox &&
      (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && isFirefox) &&
      moveRightByWordButNotSkipSpace!() || moveRightForSpaces()
    }
}

  /**
   * Chrome use ICU4c's RuleBasedBreakIterator and then DictionaryBreakEngine -> CjkBreakEngine
   * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/
   *  selection_modifier.cc?type=cs&q=ModifyExtendingForwardInternal&g=0&l=342
   *  selection_modifier.cc?type=cs&q=ModifyMovingForward&g=0&l=423
   *  visible_units_word.cc?type=cs&q=NextWordPositionInternal&g=0&l=97
   * https://cs.chromium.org/chromium/src/third_party/icu/source/common/
   *  rbbi.cpp?type=cs&q=RuleBasedBreakIterator::following&g=0&l=601
   *  rbbi_cache.cpp?type=cs&q=BreakCache::following&g=0&l=248
   *  rbbi_cache.cpp?type=cs&q=BreakCache::nextOL&g=0&l=278
   */
const moveRightForSpaces = (): void => {
    const isMove = mode_ === Mode.Caret ? 1 : 0
    let ch: string;
    getDirection("")
    oldLen_ = 1
    do {
      if (!oldLen_) {
        modify(kDirTy.right, kG.character)
        // right / unknown are kept, left is replaced with right, so that keep @di safe
        di_ = di_ || kDirTy.unknown
      }
      ch = getNextRightCharacter(isMove)
      // (t/b/r/c/e/) visible_units.cc?q=SkipWhitespaceAlgorithm&g=0&l=1191
    } while (ch && (
      !(Build.BTypes & ~BrowserType.Firefox) || Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      || rightWhiteSpaceRe ? rightWhiteSpaceRe!.test(ch) : !WordsRe_ff_old_cr!.test(ch)
    ));
    if (ch && oldLen_) {
      const num1 = oldLen_ - 2, num2 = isMove || ("" + curSelection).length
      modify(kDirTy.left, kG.character)
      if (!isMove) {
        // in most cases, initial selection won't be a caret at the middle of `[style=user-select:all]`
        // - so correct selection won't be from the middle to the end
        // if in the case, selection can not be kept during @getDi,
        // so it's okay to ignore the case
        ("" + curSelection).length - num1 && extend(kDirTy.right)
        di_ = num2 < num1 ? kDirTy.left : kDirTy.right
      }
    }
}

  /**
   * if Build.NativeWordMoveOnFirefox, then should never be called if browser is Firefox
   */
const moveRightByWordButNotSkipSpace = !(Build.BTypes & ~BrowserType.Firefox) && Build.NativeWordMoveOnFirefox ? null
      : (): boolean => {
    const sel = curSelection
    let str = "" + sel, len = str.length, di = getDirection()
    extend(kDirTy.right, kG.word)
    const str2 = "" + sel;
    if (!di) { di_ = str2 ? kDirTy.unknown : kDirTy.right }
    str = di ? str2.slice(len) : getDirection() ? str + str2 : str.slice(0, len - str2.length)
    // now di_ is correct, and can be left / right
    let match = (!(Build.BTypes & BrowserType.Firefox)
        ? Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
          ? rightWhiteSpaceRe! : (rightWhiteSpaceRe || WordsRe_ff_old_cr)!
        : !(Build.BTypes & ~BrowserType.Firefox) ? WordsRe_ff_old_cr!
        : (Build.NativeWordMoveOnFirefox || VOther !== BrowserType.Firefox)
          && rightWhiteSpaceRe || WordsRe_ff_old_cr!
        ).exec(str),
    toGoLeft = match ? (!(Build.BTypes & BrowserType.Firefox)
      ? Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
        || <Exclude<typeof rightWhiteSpaceRe, null>> rightWhiteSpaceRe
      : Build.BTypes & ~BrowserType.Firefox
        && (Build.NativeWordMoveOnFirefox || VOther !== BrowserType.Firefox)
        && <Exclude<typeof rightWhiteSpaceRe, null>> rightWhiteSpaceRe
      )
      ? match[0].length : str.length - match.index - match[0].length : 0;
    const needBack = toGoLeft > 0 && toGoLeft < str.length;
    if (needBack) {
      // after word are some spaces (>= C59) or non-word chars (< C59 || Firefox)
      len = str2.length;
      if (!(diType_ & DiType.TextBox)) {
        while (toGoLeft > 0) {
          extend(kDirTy.left)
          len || (di_ = kDirTy.left)
          const reduced = len - ("" + sel).length;
          toGoLeft -= Math.abs(reduced) || toGoLeft;
          len -= reduced;
        }
        if (toGoLeft < 0) { // may be a "user-select: all"
          extend(kDirTy.right)
        }
      } else {
        di = di_ as ForwardDir
        let el = insert_Lock_() as TextElement,
        start = TextOffset(el, 0), end = start + len
        di ? (end -= toGoLeft) :  (start -= toGoLeft);
        di = di && start > end ? (di_ = kDirTy.left) : kDirTy.right
        // di is BOOL := start < end; a.di_ will be correct
        el.setSelectionRange(di ? start : end, di ? end : start
          , kDir[<ForwardDir> di_])
      }
    }
    mode_ === Mode.Caret && collapseToRight(kDirTy.right)
    return needBack;
}

  /** @tolerate_di_if_caret */
const reverseSelection = (): void => {
    if (selType() !== SelType.Range) {
      di_ = kDirTy.right
      return;
    }
    const sel = curSelection, direction = getDirection(), newDi = (1 - direction) as ForwardDir
    if (diType_ & DiType.TextBox) {
      const el = insert_Lock_() as TextElement;
      // Note: on C72/60/35, it can trigger document.onselectionchange
      //      and on C72/60, it can trigger <input|textarea>.onselect
      el.setSelectionRange(TextOffset(el, 0), TextOffset(el, 1), kDir[newDi])
    } else if (diType_ & DiType.Complicated) {
      let length = ("" + sel).length, i = 0;
      collapseToRight(direction)
      for (; i < length; i++) { extend(newDi) }
      for (let tick = 0; tick < 16 && (i = ("" + sel).length - length); tick++) {
        extend(i < 0 ? newDi : direction)
      }
    } else {
      const { anchorNode, anchorOffset } = sel;
      collapseToRight(direction)
      sel.extend(anchorNode!, anchorOffset);
    }
    di_ = newDi
}

  /**
   * @safe_di if not `magic`
   *
   * @param {string} magic two means
   * * `""` means only checking type, and may not detect `di_` when `DiType.Complicated`;
   * * `char[1..]` means initial selection text and not to extend back when `oldLen_ >= 2`
   */
const getDirection = function (magic?: string
      ): kDirTy.left | kDirTy.right | kDirTy.unknown {
    if (di_ !== kDirTy.unknown) { return di_ }
    const oldDiType = diType_, sel = curSelection, { anchorNode } = sel
    let num1 = -1, num2: number;
    if (!oldDiType || (oldDiType & (DiType.Unknown | DiType.Complicated))) {
      const { focusNode } = sel;
      // common HTML nodes
      if (anchorNode !== focusNode) {
        num1 = Build.BTypes & ~BrowserType.Firefox
          ? Node.prototype.compareDocumentPosition.call(anchorNode!, focusNode!)
          : anchorNode!.compareDocumentPosition(focusNode!);
        diType_ = DiType.Normal
        return di_ = (
            num1 & (kNode.DOCUMENT_POSITION_CONTAINS | kNode.DOCUMENT_POSITION_CONTAINED_BY)
            ? sel.getRangeAt(0).endContainer === anchorNode
            : (num1 & kNode.DOCUMENT_POSITION_PRECEDING)
          ) ? kDirTy.left : kDirTy.right; // return `right` in case of unknown cases
      }
      num1 = sel.anchorOffset;
      // here rechecks `!anchorNode` is just for safety.
      if ((num2 = sel.focusOffset - num1) || !anchorNode || anchorNode.nodeType === kNode.TEXT_NODE) {
        diType_ = DiType.Normal
        return di_ = num2 >= 0 ? kDirTy.right : kDirTy.left
      }
    }
    // editable text elements
    const lock = insert_Lock_();
    if (lock && lock.parentNode === anchorNode) { // safe because lock is LockableElement
      type TextModeElement = TextElement;
      if ((oldDiType & DiType.Unknown)
          && editableTypes_[lock.localName]! > EditableType.MaxNotTextModeElement) {
        let cn: Node["childNodes"];
        const child = (!(Build.BTypes & ~BrowserType.Firefox) ? (anchorNode as Element).childNodes as NodeList
            : Build.MinCVer >= BrowserVer.MinParentNodeGetterInNodePrototype
            ? Getter_not_ff_!<Node, "childNodes", true>(Node, anchorNode as Element, "childNodes")
            : (cn = (anchorNode as Element).childNodes) instanceof NodeList && !("value" in cn) ? cn
            : Getter_not_ff_!(Node, anchorNode as Element, "childNodes") || []
            )[num1 >= 0 ? num1 : sel.anchorOffset] as Node | undefined;
        if (lock === child || /** tend to trust that the selected is a textbox */ !child) {
          if (Build.MinCVer >= BrowserVer.Min$selectionStart$MayBeNull || !(Build.BTypes & BrowserType.Chrome)
              ? (lock as TextModeElement).selectionEnd != null : isInputInTextMode_(lock as TextModeElement)) {
            diType_ = DiType.TextBox | (oldDiType & DiType.isUnsafe)
          }
        }
      }
      if (diType_ & DiType.TextBox) {
        return di_ = (lock as TextModeElement).selectionDirection !== kDir[0]
          ? kDirTy.right : kDirTy.left;
      }
    }
    // nodes under shadow DOM or in other unknown edge cases
    // (edge case: an example is, focusNode is a <div> and focusOffset points to #text, and then collapse to it)
    diType_ = oldDiType & DiType.Unknown
      ? DiType.Complicated | (oldDiType & DiType.isUnsafe)
      : oldDiType & (DiType.Complicated | DiType.isUnsafe)
    if (magic === "") { return kDirTy.unknown; }
    const initial = magic || "" + sel;
    num1 = initial.length;
    if (!num1) {
      return di_ = kDirTy.right
    }
    extend(kDirTy.right)
    diType_ = diType_ && sel.anchorOffset !== sel.focusOffset ? DiType.Normal
      : diType_ & ~DiType.isUnsafe
    num2 = ("" + sel).length - num1;
    /**
     * Note (tested on C70):
     * the `extend` above may go back by 2 steps when cur pos is the right of an element with `select:all`,
     * so a detection and the third `extend` may be necessary
     */
    if (num2 && !magic) {
      extend(kDirTy.left)
      "" + sel !== initial && extend(kDirTy.right)
    } else {
      oldLen_ = 2 + num1
    }
    return di_ = num2 >= 0 || magic && num2 === -num1 ? kDirTy.right : kDirTy.left
} as {
    (magic: ""): kDirTy.unknown | -1;
    (magic?: string): kDirTy.left | kDirTy.right;
}

  /** @tolerate_di_if_caret di will be 1 */
const collapseToFocus = (toFocus: BOOL) => {
  selType() === SelType.Range && collapseToRight((getDirection() ^ toFocus ^ 1) as BOOL)
  di_ = kDirTy.right
}

  /**
   * @must_be_range_and_know_di_if_unsafe `selType == Range && getDirection_()` is safe enough
   *
   * @fix_unsafe_in_diType
   *
   * @di_will_be_1
   */
const collapseToRight = (/** to-right if text is left-to-right */ toRight: ForwardDir): void => {
    const sel = curSelection
    if (diType_ & DiType.isUnsafe) {
      // Chrome 60/70 need this "extend" action; otherwise a text box would "blur" and a mess gets selected
      const sameEnd = toRight === <ForwardDir> di_
      const fixSelAll = sameEnd && (diType_ & DiType.Complicated) && ("" + sel).length
      // r / r : l ; r / l : r ; l / r : l ; l / l : r
      extend(1 - <ForwardDir> di_)
      sameEnd && extend(toRight)
      fixSelAll && ("" + sel).length !== fixSelAll && extend(1 - toRight)
    }
    toRight ? sel.collapseToEnd() : sel.collapseToStart();
    di_ = kDirTy.right
}

const selectLexicalEntity = (entity: kG.sentence | kG.word, count: number): void => {
  collapseToFocus(1)
  entity - kG.word || modify(kDirTy.right, kG.character)
  modify(kDirTy.left, entity)
  di_ = kDirTy.left // safe
  collapseToFocus(1)
  runMovements(kDirTy.right, entity, count)
}

  /** after called, VVisual must exit at once */
const selectLine = (count: number): void => {
  const oldDi = getDirection()
  mode_ = Mode.Visual // safer
  alterMethod = kExtend
  {
    oldDi && reverseSelection()
    modify(kDirTy.left, kG.lineBoundary)
    di_ = kDirTy.left // safe
    reverseSelection()
  }
  while (0 < --count) { modify(kDirTy.right, kG.line) }
  modify(kDirTy.right, kG.lineBoundary)
  const ch = getNextRightCharacter(0)
  const num1 = oldLen_
    if (ch && num1 && ch !== "\n" && !(Build.BTypes & BrowserType.Firefox && ch === "\r")) {
    extend(kDirTy.left);
    ("" + curSelection).length + 2 - num1 && extend(kDirTy.right)
  }
}

const ensureLine = (command: number): void => {
  let di = getDirection()
    if (di && command < VisualAction.MinNotWrapSelectionModify
      && command >= VisualAction.MinWrapSelectionModify && !diType_ && selType() === SelType.Caret) {
      di = (1 & ~command) as ForwardDir; // old Di
    modify(di, kG.lineBoundary)
    selType() !== SelType.Range && modify(di, kG.line)
    di_ = di
    reverseSelection()
    let len = (curSelection + "").length
    modify(di = di_ = 1 - di, kG.lineBoundary);
    (curSelection + "").length - len || modify(di, kG.line)
      return;
    }
    for (let mode = 2; 0 < mode--; ) {
    reverseSelection()
    di = di_ = (1 - di) as ForwardDir
    modify(di, kG.lineBoundary)
  }
}

  /** @argument el must be in text mode  */
const TextOffset = (el: TextElement, di: ForwardDir | boolean): number => {
    return (di ? el.selectionEnd : el.selectionStart)!;
}

/** @not_related_to_di */
let init = (words: string, map: VisualModeNS.KeyMap, _g: any) => {
  const func = safer, typeIdx = { None: SelType.None, Caret: SelType.Caret, Range: SelType.Range }
  init = null as never
  selType = Build.BTypes & BrowserType.Chrome
      && Build.MinCVer <= BrowserVer.$Selection$NotShowStatusInTextBox
      && chromeVer_ === BrowserVer.$Selection$NotShowStatusInTextBox
  ? (): SelType => {
    let type = typeIdx[curSelection.type];
    return type === SelType.Caret && diType_ && ("" + curSelection) ? SelType.Range : type;
  } : (): SelType => {
    return typeIdx[curSelection.type]
  };
/**
 * Call stack (Chromium > icu):
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/visible_units_word.cc?type=cs&q=NextWordPositionInternal&g=0&l=86
 * * https://cs.chromium.org/chromium/src/third_party/blink/renderer/platform/wtf/text/unicode.h?type=cs&q=IsAlphanumeric&g=0&l=177
 * * https://cs.chromium.org/chromium/src/third_party/icu/source/common/uchar.cpp?q=u_isalnum&g=0&l=151
 * Result: \p{L | Nd} || '_' (\u005F)
 * Definitions:
 * * General Category (Unicode): https://unicode.org/reports/tr44/#GC_Values_Table
 * * valid GC in RegExp: https://tc39.github.io/proposal-regexp-unicode-property-escapes/#sec-runtime-semantics-unicodematchpropertyvalue-p-v
 * * \w in RegExp: https://unicode.org/reports/tr18/#word
 *   * \w = \p{Alpha | gc=Mark | Digit | gc=Connector_Punctuation | Join_Control}
 *   * Alphabetic: https://unicode.org/reports/tr44/#Alphabetic
 * But \p{L} = \p{Lu | Ll | Lt | Lm | Lo}, so it's much more accurate to use \p{L}
 * if no unicode RegExp, The list of words will be loaded into {@link background/settings.ts#Settings_.CONST_.WordsRe_}
 */
  // icu@u_isalnum: http://icu-project.org/apiref/icu4c/uchar_8h.html#a5dff81615fcb62295bf8b1c63dd33a14
  if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
      || Build.BTypes & ~BrowserType.Firefox && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Chrome
            && chromeVer_ < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
        || Build.BTypes & BrowserType.Firefox && Build.BTypes & BrowserType.Edge
            && VOther === BrowserType.Firefox) {
      // Firefox && not native || Chrome && not only white spaces
      if (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces <= BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
          && !(Build.BTypes & ~BrowserType.Chrome)
          ) {
        WordsRe_ff_old_cr = new RegExp(words, "");
      } else {
        // note: here thinks the `/[^]*[~~~]/` has acceptable performance
        WordsRe_ff_old_cr = new RegExp(words || "[^]*[\\p{L}\\p{Nd}_]", words ? "" : "u");
      }
    }
  }
/** C72
 * The real is ` (!IsSpaceOrNewline(c) && c != kNoBreakSpaceCharacter) || c == '\n' `
 * in https://cs.chromium.org/chromium/src/third_party/blink/renderer/platform/wtf/text/string_impl.h?type=cs&q=IsSpaceOrNewline&sq=package:chromium&g=0&l=800
 * `IsSpaceOrNewline` says "Bidi=WS" doesn't include '\n'", it's because:
 * * the upstream is (2002/11/07) https://chromium.googlesource.com/chromium/src/+/68f88bec7f005b2abc9018b086396a88f1ffc18e%5E%21/#F3 ,
 * * and then the specification it used in `< 128 ? isspace : DirWS` was https://unicode.org/Public/2.1-Update4/PropList-2.1.9.txt
 * * it thinks the "White space" and "Bidi: Whitespace" properties are different, and Bidi:WS only includes 0020,2000..200B,2028,3000
 * While the current https://unicode.org/reports/tr44/#BC_Values_Table does not:
 * * in https://unicode.org/Public/UCD/latest/ucd/PropList.txt , WS covers `WebTemplateFramework::IsASCIISpace` totally (0009..000D,0020)
 * /\s/
 * * Run ` for(var a="",i=0,ch=''; i<=0xffff; i++) /\s/.test(String.fromCharCode(i)) && (a+='\\u' + (0x10000 + i).toString(16).slice(1)); a; ` gets
 * * \u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff (C72)
 * * when <= C58 (Min$Space$NotMatch$U180e$InRegExp), there's \u180e (it's added by Unicode standard v4.0.0 and then removed since v6.3.0)
 * * compared to "\p{WS}", it ("\s") lacks \u0085 (it's added in v3.0.0), but adds an extra \ufeff
 * * "\s" in regexp is not affected by the "unicode" flag https://mathiasbynens.be/notes/es6-unicode-regex
 * During tests: not skip \u0085\u180e\u2029\u202f\ufeff since C59; otherwise all including \u0085\ufeff are skipped
 */
  /** Changes
   * MinSelExtendForwardOnlySkipWhitespaces=59
   *  : https://chromium.googlesource.com/chromium/src/+/117a5ba5073a1c78d08d3be3210afc09af96158c%5E%21/#F2
   * Min$Space$NotMatch$U180e$InRegExp=59
   */
  (!(Build.BTypes & BrowserType.Chrome)
    || Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
    || (Build.BTypes & BrowserType.Firefox && VOther === BrowserType.Firefox)
    || chromeVer_ >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) &&
  // on Firefox 65 stable, Win 10 x64, there're '\r\n' parts in Selection.toString()
  (rightWhiteSpaceRe = <RegExpOne> (Build.BTypes & BrowserType.Firefox
      ? /[^\S\n\r\u2029\u202f\ufeff]+$/ : /[^\S\n\u2029\u202f\ufeff]+$/));
  func(keyMap = map as VisualModeNS.SafeKeyMap)
  func(map.a as Dict<VisualAction>); func(map.g as Dict<VisualAction>)
}
