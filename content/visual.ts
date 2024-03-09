/**
 * Note(gdh1995):
 * - @unknown_di_result: means it does not guarantee anything about @di
 * - @safe_di: means it accepts any @di and will force @di to be correct on return
 * - @tolerate_di_if_caret: means it only allows a wrong di in caret mode, and always returns with a correct di
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
    | DiType.UnsafeComplicated | DiType.UnsafeUnknown | DiType.SafeUnknown
declare const enum kYank { // should have no overlap with ReuseType
  MIN = 7, Exit = 7, NotExit = 8, RichTextButNotExit = 9,
}
declare const enum SelType { None = 0, Caret = 1, Range = 2 }
type InfoToMoveRightByWord = [newSelectionLength: number, lengthOfChange: number, toGoLeft: number]

import {
  safer, os_, doc, chromeVer_, tryCreateRegExp, esc, OnFirefox, OnChrome, safeCall, parseOpenPageUrlOptions,
} from "../lib/utils"
import {
  removeHandler_, getMappedKey, keybody_, isEscape_, prevent_, ENTER, suppressTail_, replaceOrSuppressMost_
} from "../lib/keyboard_utils"
import {
  getSelection_, getSelectionFocusEdge_, isHTML_, docEl_unsafe_, isSafeEl_, getEditableType_,
  getNodeChild_, rangeCount_, getAccessibleSelectedNode, scrollingEl_, isNode_,
  getDirectionOfNormalSelection, selOffset_, modifySel, parentNode_unsafe_s, textOffset_, inputSelRange
} from "../lib/dom_utils"
import {
  prepareCrop_, cropRectToVisible_, getVisibleClientRect_, set_scrollingTop, selRange_, cropRectS_
} from "../lib/rect"
import {
  getSelectionBoundingBox_, doesSelectRightInEditableLock,
  checkDocSelectable, getSelected, resetSelectionToDocStart, flash_, collpaseSelection, getSelectionText
} from "./dom_ui"
import { executeScroll, scrollIntoView_s, getPixelScaleToScroll } from "./scroller"
import {
  toggleSelectableStyle, find_query, executeFind, find_hasResults, updateQuery as findUpdateQuery, findCSS, set_findCSS,
  execCommand,
} from "./mode_find"
import { insert_Lock_, raw_insert_lock } from "./insert"
import { hudTip, hudHide } from "./hud"
import { post_, send_, runFallbackKey, contentCommands_ } from "./port"
import { currentKeys, set_currentKeys } from "./key_handler"

let modeName: Mode
/** need real diType */
let kGranularity: GranularityNames
let keyMap: VisualModeNS.SafeKeyMap
let WordsRe_ff_old_cr: RegExpOne | RegExpU | null
let rightWhiteSpaceRe: RegExpOne | null
/** @safe_di */
let deactivate: (isEscOrReinit?: 1 | 2) => void

export { modeName as visual_mode_name, deactivate }

  /** count = 0 means fromFind */
export const activate = (options: CmdOptions[kFgCmd.visualMode], count: number): void => {
  /** @safe_di requires selection is None on called, and may change `selection_`; not use `diType_` */
  const establishInitialSelectionAnchor = (): number => {
    if (!(Build.NDEBUG || curSelection && curSelection.type === "None")) {
      console.log('Assert error: VVisual.selection_ && VVisual.selection_.type === "None"')
    }
    let node: Text | null, str: string | undefined, offset: number
    if (!isHTML_()) { return 0 }
    prepareCrop_()
    const nodes = doc.createTreeWalker(scope || doc.body || docEl_unsafe_()!, NodeFilter.SHOW_TEXT)
    while (node = nodes.nextNode() as Text | null) {
      if (50 <= (str = node.data).length && 50 < str.trim().length) {
        const element = node.parentElement
        if (element && isSafeEl_(element) && getVisibleClientRect_(element) && !getEditableType_(element)) {
          break
        }
      }
    }
    if (!node) {
      if (scope) {
        curSelection = getSelection_()
        scope = null
        return establishInitialSelectionAnchor()
      }
      return 0
    }
    offset = str!.match(<RegExpOne> /^\s*/)![0].length
    curSelection.collapse(node, offset)
    di_ = kDirTy.right
    return rangeCount_(curSelection)
  }

  /**
   * @safe_di if action !== true
   * @not_related_to_di otherwise
   */
  const yank = (action: kYank | ReuseType.current | ReuseType.newFg): void => {
    const str = getSelectionText(1, curSelection)
    action < kYank.NotExit && deactivate()
    if (!str && !options.t) { hudTip(kTip.noTextCopied) }
    else if (str && action < kYank.MIN) {
      post_({ H: kFgReq.openUrl, u: str, r: action as ReuseType, o: parseOpenPageUrlOptions(options) })
    } else if (options.t || action > kYank.RichTextButNotExit - 1) {
      execCommand("copy", doc)
      hudTip(kTip.copiedIs, 0, "# " + str)
    } else {
      post_({ H: kFgReq.copy, s: str, o: parseOpenPageUrlOptions(options) })
    }
  }

  /** @safe_di if not `magic` */
  const getDirection = function (magic?: string): kDirTy.left | kDirTy.right | kDirTy.unknown {
    if (di_ !== kDirTy.unknown) { return di_ }
    const oldDiType = diType_, sel = curSelection, anchorNode = getAccessibleSelectedNode(sel)
    let num1 = -2, num2: number
    if (OnFirefox && !anchorNode) {
      diType_ = DiType.Normal
      return di_ = kDirTy.right
    }
    if (!oldDiType || (oldDiType & (DiType.Unknown | DiType.Complicated))) {
      const focusNode = getAccessibleSelectedNode(sel, 1)
      // common HTML nodes
      if (anchorNode !== focusNode) {
        diType_ = DiType.Normal
        return di_ = getDirectionOfNormalSelection(sel, anchorNode, focusNode)
      }
      num1 = selOffset_(sel)
      // here rechecks `!anchorNode` is just for safety.
      if ((num2 = selOffset_(sel, 1) - num1) || !anchorNode || isNode_(anchorNode, kNode.TEXT_NODE)) {
        diType_ = DiType.Normal
        return di_ = num2 >= 0 ? kDirTy.right : kDirTy.left
      }
    }
    // editable text elements
    if (!OnFirefox && raw_insert_lock && parentNode_unsafe_s(raw_insert_lock) === anchorNode) {
      if (oldDiType & DiType.Unknown && getEditableType_<0>(raw_insert_lock) > EditableType.MaxNotEditableElement) {
        const child = getNodeChild_(anchorNode!, sel, num1 + 2)
        if (raw_insert_lock === child || /** tend to trust that the selected is a textbox */ !child) {
          if (!OnChrome || Build.MinCVer >= BrowserVer.Min$selectionStart$MayBeNull
              || chromeVer_ > BrowserVer.Min$selectionStart$MayBeNull - 1
              ? textOffset_(raw_insert_lock as TextElement) != null
              : safeCall(textOffset_, raw_insert_lock as TextElement) != null) {
            diType_ = DiType.TextBox | (oldDiType & DiType.isUnsafe)
          }
        }
      }
      if (diType_ & DiType.TextBox) {
        return di_ = doesSelectRightInEditableLock() ? kDirTy.right : kDirTy.left
      }
    }
    // nodes under shadow DOM or in other unknown edge cases
    // (edge case: an example is, focusNode is a <div> and focusOffset points to #text, and then collapse to it)
    diType_ = oldDiType & DiType.Unknown
        ? DiType.Complicated | (oldDiType & DiType.isUnsafe) : oldDiType & (DiType.UnsafeComplicated)
    if (magic === "") { return kDirTy.unknown }
    const initial = magic || "" + <SelWithToStr> sel
    num1 = initial.length
    if (!num1) {
      return di_ = kDirTy.right
    }
    extend(kDirTy.right)
    diType_ = diType_ && selOffset_(sel) !== selOffset_(sel, 1) ? DiType.Normal
      : diType_ & ~DiType.isUnsafe
    num2 = ("" + <SelWithToStr> sel).length - num1
    /**
     * Note (tested on C70):
     * the `extend` above may go back by 2 steps when cur pos is the right of an element with `select:all`,
     * so a detection and the third `extend` may be necessary
     */
    if (num2 && !magic) {
      extend(kDirTy.left)
      "" + <SelWithToStr> sel !== initial && extend(kDirTy.right)
    } else {
      oldLen_ = 2 + num1
    }
    return di_ = num2 >= 0 || magic && num2 === -num1 ? kDirTy.right : kDirTy.left
  } as ({
    /** `""` means only checking type, and may not detect `di_` when `DiType.Complicated` */
    (magic: ""): unknown
    /** `char[1..]` means initial selection text and not to extend back when `oldLen_ >= 2` */
    (magic?: string): kDirTy.left | kDirTy.right
  })

  /**
   * @must_be_range_and_know_di_if_unsafe `selType == Range && getDirection_()` is safe enough
   * @fix_unsafe_in_diType
   * @di_will_be_1
   */
  const collapseToRight = (/** to-right if text is left-to-right */ toRight: ForwardDir): void => {
    const sel = curSelection
    if (diType_ & DiType.isUnsafe) {
      // Chrome 60/70 need this "extend" action; otherwise a text box would "blur" and a mess gets selected
      const sameEnd = toRight === <ForwardDir> di_
      const fixSelAll = sameEnd && (diType_ & DiType.Complicated) && ("" + <SelWithToStr> sel).length
      // r / r : l ; r / l : r ; l / r : l ; l / l : r
      extend(1 - <ForwardDir> di_)
      sameEnd && extend(toRight)
      fixSelAll && ("" + <SelWithToStr> sel).length !== fixSelAll && extend(1 - toRight)
    }
    collpaseSelection(sel, toRight)
    di_ = kDirTy.right
  }

  /** @unknown_di_result */
  const extend = (d: ForwardDir, g?: kG): void | 1 => {
    modifySel(curSelection, 1, d, kGranularity[(g! | 0) as kG])
    diType_ &= ~DiType.isUnsafe
  }

  /** @unknown_di_result */
  const modify = (d: ForwardDir, g: kG): void => {
    modifySel(curSelection, (Mode.Caret - mode_) as 2 | 1 | 0, d, kGranularity[g])
  }

  const selType = (): SelType => {
    const type = typeIdx[curSelection.type]
    return OnChrome && Build.MinCVer <= BrowserVer.$Selection$NotShowStatusInTextBox
        && chromeVer_ === BrowserVer.$Selection$NotShowStatusInTextBox
        && type === SelType.Caret && diType_ && ("" + <SelWithToStr> curSelection) ? SelType.Range : type
  }

  /** @tolerate_di_if_caret di will be 1 */
  const collapseToFocus = (toFocus: BOOL): void => {
    selType() === SelType.Range && /* range-and-know-di */ collapseToRight((getDirection() ^ toFocus ^ 1) as BOOL)
    di_ = kDirTy.right
  }

  /** @unknown_di_result */
const commandHandler = (command: VisualAction, count: number): void => {

const findV = (count1: number): void => {
    if (!find_query) {
      send_(kFgReq.findQuery, 1, (query): void => {
        if (query) {
          findUpdateQuery(query);
          findV(count1)
        } else {
          hudTip(kTip.noOldQuery, 1)
        }
      });
      return;
    }
    const sel = curSelection, range = rangeCount_(sel) && (getDirection(""), !diType_) && selRange_(sel)
    executeFind("", { noColor: 1, c: count1 })
    if (find_hasResults) {
      diType_ = DiType.UnsafeUnknown
      if (mode_ === Mode.Caret && selType() === SelType.Range) {
        options.m = Mode.Visual;
        contentCommands_[kFgCmd.visualMode](options as typeof options & SafeObject, 1)
      } else {
        di_ = kDirTy.unknown
        commandHandler(VisualAction.Noop, 1)
      }
    } else {
      range && !rangeCount_(sel) && resetSelectionToDocStart(sel, range)
      hudTip(kTip.noMatchFor, 1, find_query)
    }
}

/** if return `''`, then `@hasModified_` is not defined; `isMove` must be "in caret" */
const getNextRightCharacter = (isMove: BOOL): string => {
    const sel = curSelection
    oldLen_ = 0
    if (!OnFirefox && diType_ & DiType.TextBox) {
      return (raw_insert_lock as TextElement).value.charAt(textOffset_(raw_insert_lock as TextElement
          , di_ === kDirTy.right || doesSelectRightInEditableLock())!)
    }
    if (!diType_) {
      const focusNode = getAccessibleSelectedNode(sel, 1)
      if (OnFirefox && !focusNode) { return "" }
      if (isNode_(focusNode!, kNode.TEXT_NODE)) {
        const i = selOffset_(sel, 1), str = focusNode.data;
        if (str.charAt(i).trim() || i && str.charAt(i - 1).trim() && str.slice(i).trimLeft()
              && (OnFirefox ? str[i] !== "\n" && str[i] !== "\r" : str[i] !== "\n")) {
          return str[i];
        }
      }
    }
    let oldLen = 0;
    if (!isMove) {
      const beforeText = "" + <SelWithToStr> sel
      if (beforeText && (!getDirection(beforeText) || selType() === SelType.Caret)) {
        return beforeText[0];
      }
      oldLen = beforeText.length
    }
    // here, the real di must be kDir.right (range if in visual mode else caret)
    oldLen_ || extend(kDirTy.right)
    const afterText = "" + <SelWithToStr> sel, newLen = afterText.length;
    if (newLen - oldLen) {
      // if isMove, then cur sel is >= 1 char & di is right
      isMove && /* extend() make diType safe */ collapseToRight(newLen - 1 ? kDirTy.left : kDirTy.right)
      oldLen_ = isMove && newLen - 1 ? 0 : 2 + oldLen
      return afterText[newLen - 1] || ""
    }
    return "";
}

const runMovements = (direction: ForwardDir, granularity: kG | kVimG.vimWord, count1: number): void => {
    const isMove = mode_ - Mode.Caret ? 0 : 1
    const shouldSkipSpaceWhenMovingRight = granularity === kVimG.vimWord
    let fixWord: boolean | undefined
    // https://source.chromium.org/chromium/chromium/src/+/67fe5a41bff92a7bd4f425a24e4858317f8700e5
    let fixDeltaHasOnlySpaces_cr_win: InfoToMoveRightByWord | null | undefined
    if (OnFirefox && granularity > kG.documentBoundary - 1) {
      // getDirection(); diType_ & DiType.TextBox || // on Firefox, Selection::modify never works in text boxes
      curSelection.extend(docEl_unsafe_()!, direction ? docEl_unsafe_()!.childElementCount : 0)
      di_ = kDirTy.unknown
      count1 = 0
      if (isMove) {
        collapseToFocus(1)
        modify(direction, kG.line), di_ = kDirTy.unknown
      }
    }
    else if (shouldSkipSpaceWhenMovingRight || granularity === kG.word) {
// https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/editing/editing_behavior.h?type=cs&q=ShouldSkipSpaceWhenMovingRight&g=0&l=99
      if (!direction) { /* empty */ }
      else if (OnFirefox) {
        fixWord = !Build.NativeWordMoveOnFirefox || shouldSkipSpaceWhenMovingRight
        if (!Build.NativeWordMoveOnFirefox) { count1 -= fixWord as boolean | BOOL as BOOL }
      } else {
        fixWord = !(Build.OS & kBOS.WIN) ? shouldSkipSpaceWhenMovingRight
            : Build.OS === kBOS.WIN as number ? !shouldSkipSpaceWhenMovingRight
            : (os_ > kOS.MAX_NOT_WIN) !== shouldSkipSpaceWhenMovingRight
        OnChrome && Build.OS & kBOS.WIN && (Build.OS === kBOS.WIN as number || os_ > kOS.MAX_NOT_WIN)
            && (Build.MinCVer >= BrowserVer.MinOnWindows$Selection$$extend$stopWhenWhiteSpaceEnd
                || chromeVer_ > BrowserVer.MinOnWindows$Selection$$extend$stopWhenWhiteSpaceEnd - 1)
            && (fixDeltaHasOnlySpaces_cr_win = moveRightByWordButNotSkipSpaces!(0))
            && (fixDeltaHasOnlySpaces_cr_win = --count1 ? null : fixDeltaHasOnlySpaces_cr_win)
        if (Build.OS & kBOS.WIN) {
          count1 -= (Build.OS !== kBOS.WIN as number ? fixWord > // lgtm [js/implicit-operand-conversion]
              shouldSkipSpaceWhenMovingRight : fixWord) as unknown as BOOL // lgtm [js/implicit-operand-conversion]
        }
      }
      granularity = kG.word
    }
    const oldDi = di_
    while (0 < count1--) {
      modify(direction, granularity as kG)
    // it's safe to remove `isUnsafe` here, because:
    // either `count > 0` or `fixWord && _moveRight***()`
      diType_ &= isMove ? ~DiType.isUnsafe : diType_
      di_ = direction - oldDi ? kDirTy.unknown : oldDi
    }
    granularity - kG.lineBoundary || hudTip(kTip.selectLineBoundary, 2)
    if (!fixWord) {
      OnChrome && Build.OS & kBOS.WIN && fixDeltaHasOnlySpaces_cr_win !== undefined
          && isMove && /* moveRightByWordButNotSkipSpaces->extend() make diType safe */ collapseToRight(kDirTy.right)
      return
    }
    if (OnFirefox && Build.NativeWordMoveOnFirefox) { /* then shouldSkipSpaceWhenMovingRight is true */ }
    else if (!shouldSkipSpaceWhenMovingRight) { // OnFirefox || OS === Win
      OnChrome && Build.OS & kBOS.WIN
          ? moveRightByWordButNotSkipSpaces!(fixDeltaHasOnlySpaces_cr_win)
          : moveRightByWordButNotSkipSpaces!()
      return
    } else if (OnFirefox && moveRightByWordButNotSkipSpaces!()) {
      return
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
      !OnChrome || Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      || rightWhiteSpaceRe ? rightWhiteSpaceRe!.test(ch) : !WordsRe_ff_old_cr!.test(ch)
    ));
    if (ch && oldLen_) {
      const num1 = oldLen_ - 2, num2 = isMove || ("" + <SelWithToStr> curSelection).length
      modify(kDirTy.left, kG.character)
      if (!isMove) {
        // in most cases, initial selection won't be a caret at the middle of `[style=user-select:all]`
        // - so correct selection won't be from the middle to the end
        // if in the case, selection can not be kept during @getDi,
        // so it's okay to ignore the case
        ("" + <SelWithToStr> curSelection).length - num1 && extend(kDirTy.right)
        di_ = num2 < num1 ? kDirTy.left : kDirTy.right
      }
    }
}

  /**
   * if Build.NativeWordMoveOnFirefox, then should never be called if browser is Firefox
   *
   * when by word, not skip following spaces
   */
const moveRightByWordButNotSkipSpaces = OnFirefox && Build.NativeWordMoveOnFirefox ? null
      : ((testOnlySpace_cr_win?: InfoToMoveRightByWord | null | 0): InfoToMoveRightByWord | null | boolean => {
  let newLen: number, changeLen: number, toGoLeft: number
  if (OnChrome && Build.OS & kBOS.WIN && testOnlySpace_cr_win) {
    newLen = testOnlySpace_cr_win[0], changeLen = testOnlySpace_cr_win[1], toGoLeft = testOnlySpace_cr_win[2]
  } else {
    let oldStr = "" + <SelWithToStr> curSelection, oldLen = oldStr.length
    getDirection()
    extend(kDirTy.right, kG.word)
    let newStr: string | RegExpExecArray | null = ("" + <SelWithToStr> curSelection)
    newLen = newStr.length
    if (!di_) { di_ = newStr ? kDirTy.unknown : kDirTy.right }
    newStr = di_ < kDirTy.unknown ? newStr.slice(oldLen)
        : getDirection() ? oldStr + newStr : oldStr.slice(0, oldLen - newLen)
    changeLen = newStr.length
    // now di_ is correct, and can be left / right
    newStr = (OnFirefox ? WordsRe_ff_old_cr!
        : !OnChrome || Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
          ? rightWhiteSpaceRe! : (rightWhiteSpaceRe || WordsRe_ff_old_cr)!
        ).exec(newStr)
    toGoLeft = newStr ? newStr[0].length : 0
    toGoLeft = newStr ? (OnFirefox ? false : !OnChrome ? true
          : Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces || rightWhiteSpaceRe)
        ? toGoLeft : changeLen - newStr.index - toGoLeft : 0
    if (OnChrome && testOnlySpace_cr_win === 0) {
      return toGoLeft < changeLen ? [newLen, changeLen, toGoLeft] : null
    }
  }
    const needBack = toGoLeft > 0 && toGoLeft < changeLen
    if (needBack) {
      // after word are some spaces (>= C59) or non-word chars (< C59 || Firefox)
      if (OnFirefox || !(diType_ & DiType.TextBox)) {
        while (toGoLeft > 0) {
          extend(kDirTy.left)
          newLen || (di_ = kDirTy.left)
          changeLen = newLen - ("" + <SelWithToStr> curSelection).length
          toGoLeft -= changeLen > 0 ? changeLen : -changeLen || toGoLeft
          newLen -= changeLen
        }
        if (toGoLeft < 0) { // may be a "user-select: all"
          extend(kDirTy.right)
        }
      } else {
        let start = textOffset_(raw_insert_lock as TextElement)!, end = start + newLen
        di_ as ForwardDir ? (end -= toGoLeft) :  (start -= toGoLeft)
        inputSelRange(raw_insert_lock as TextElement, start < end ? start : end, start < end ? end : start
            , di_ = start > end ? kDirTy.left : kDirTy.right)
      }
    }
    mode_ - Mode.Caret || /* extend() make diType safe */ collapseToRight(kDirTy.right)
    return needBack
}) as {
  (bySpace_cr: 0): InfoToMoveRightByWord | null
  (bySpace_cr?: InfoToMoveRightByWord | null | undefined): boolean
}

  /** @tolerate_di_if_caret */
const reverseSelection = (): void => {
    if (selType() !== SelType.Range) {
      di_ = kDirTy.right
      return;
    }
    const sel = curSelection, direction = getDirection(), newDi = (1 - direction) as ForwardDir
    if (!OnFirefox && diType_ & DiType.TextBox) {
      // Note: on C72/60/35, it can trigger document.onselectionchange
      //      and on C72/60, it can trigger <input|textarea>.onselect
      inputSelRange(raw_insert_lock as TextElement, textOffset_(raw_insert_lock as TextElement)!
          , textOffset_(raw_insert_lock as TextElement, 1)!, newDi)
    } else if (diType_ & DiType.Complicated) {
      let length = ("" + <SelWithToStr> sel).length, i = 0;
      /* range-and-know-di */ collapseToRight(direction)
      for (; i < length; i++) { extend(newDi) }
      for (let tick = 0; tick < 16 && (i = ("" + <SelWithToStr> sel).length - length); tick++) {
        extend(i < 0 ? newDi : direction)
      }
    } else {
      const node = getAccessibleSelectedNode(sel), offset = selOffset_(sel)
      /* range-and-know-di */ collapseToRight(direction);
      (!OnFirefox || node) && sel.extend(node!, offset)
    }
    di_ = newDi
}

  /** after called, VVisual must exit at once */
const selectLine = (count1: number): void => {
  const oldDi = getDirection()
  mode_ = Mode.Visual // safer
  {
    oldDi && reverseSelection()
    modify(kDirTy.left, kG.lineBoundary)
    di_ = kDirTy.left // safe
    reverseSelection()
  }
  while (0 < --count1) { modify(kDirTy.right, kG.line) }
  modify(kDirTy.right, kG.lineBoundary)
  const ch = getNextRightCharacter(0)
  const num1 = oldLen_
  if (ch && num1 && ch !== "\n") {
    if (!OnFirefox || ch !== "\r") {
      extend(kDirTy.left);
      ("" + <SelWithToStr> curSelection).length + 2 - num1 && extend(kDirTy.right)
    }
  }
}

const ensureLine = (command1: number, s0: string): void => {
  let di = getDirection(), len = 2, noBacked: BOOL | false = 0
  if (command1 < VisualAction.MinNotWrapSelectionModify && command1 >= VisualAction.MinWrapSelectionModify
      && !diType_ && (di && selType() === SelType.Caret || (OnFirefox ? (<RegExpOne> /^\r?\n$/).test(
          "" + <SelWithToStr> curSelection) : "" + <SelWithToStr> curSelection === "\n"))) {
    selType() === SelType.Range && collpaseSelection(curSelection, 1 - di)
    di = di_ = (1 & ~command1) as ForwardDir
    modify(di, kG.lineBoundary)
    selType() !== SelType.Range && modify(di, kG.line)
    noBacked = len = 1
  }
  for (; 0 < len--; ) {
    if (noBacked !== !1) {
      reverseSelection()
      di = di_ = (1 - di) as ForwardDir
    }
    let s1 = noBacked ? "" : "" + <SelWithToStr> curSelection, backed: string | 0 = 0
    if (!(di ? s1.endsWith("\n") : s1.startsWith("\n"))) {
      const r1 = !diType_ && s1 && getAccessibleSelectedNode(curSelection, 1)
      const r2 = r1 && selOffset_(curSelection, 1)
      if (s1 && (len || !(<RegExpOne>/\r|\n/).test(s1.slice(di ? OnFirefox ? -3 : -2 : 0).slice(0, OnFirefox ?3 :2)))) {
        modify(1 - di, kG.character)
        backed = "" + <SelWithToStr> curSelection
        backed + "\n" === s1 ? backed = 0
        : backed === s1 && (backed = 0, // sel.addRange will reset selection direction on C107, so have to use extend
            r1 ? curSelection.extend(r1, r2 as number) : modify(di, kG.character))
      }
      modify(di, kG.lineBoundary + <BOOL> noBacked); kG.lineBoundary satisfies 3; kG.line satisfies 4
      const reduced = !len && r1 && di !== (command1 & 1)
      const s2 = backed || reduced ? "" + <SelWithToStr> curSelection : ""
      if (backed && s2 === backed) {
        modify(di, kG.character)
        modify(di, kG.lineBoundary)
      } else if (reduced && (s2.length >= s0.length)) {
        curSelection.extend(r1, r2 as number)
      }
    }
    if (noBacked && !diType_) { len++, noBacked = !1 }
  }
}

  let mode = mode_, s0_line: string = ""
  if (command > VisualAction.MaxNotScroll) {
    executeScroll(1, command - VisualAction.ScrollDown ? -count : count, kScFlag.scBy)
    return;
  }
  if (command > VisualAction.MaxNotNewMode) {
    if (command > VisualAction.EmbeddedFindMode - 1) {
      hudHide() // it should auto keep HUD showing the mode text
      post_({ H: kFgReq.findFromVisual, c: command })
    } else {
      options.m = command - VisualAction.MaxNotNewMode;
      contentCommands_[kFgCmd.visualMode](options as typeof options & SafeObject, 1)
    }
    return
  }
  if (scope && !rangeCount_(curSelection)) {
    scope = null
    curSelection = getSelection_()
  }
  if (command < VisualAction.MaxNotFind + 1
      && !(rangeCount_(curSelection) && getAccessibleSelectedNode(curSelection) )) {
    deactivate()
    suppressTail_(1500)
    return hudTip(kTip.loseSel, 2)
  }
  if (command === VisualAction.HighlightRange) {
    highlightRange(curSelection)
    return
  }
  mode === Mode.Caret && (command > VisualAction.MaxNotFind || command < VisualAction.MaxNotYank + 1)
      && collapseToFocus(0)
  if (command > VisualAction.MaxNotFind) {
    findV(command - VisualAction.PerformFind ? count : -count)
    return;
  }
  if (command > VisualAction.MaxNotYank) {
    command === VisualAction.YankLine && selectLine(count)
    yank(([kYank.Exit, kYank.Exit, kYank.NotExit, ReuseType.current, ReuseType.newFg, kYank.RichTextButNotExit
          ] as const)[command - VisualAction.Yank])
    return
  } else if (command > VisualAction.MaxNotLexical) {
    const entity = (command - VisualAction.MaxNotLexical) as kG.sentence | kG.word
    mode_ = VisualModeNS.Mode.Visual
    collapseToFocus(0)
    extend(kDirTy.right)
    extend(kDirTy.left, OnFirefox && !(entity - kG.sentence) ? kG.lineBoundary : entity)
    di_ = kDirTy.left // safe
    collapseToFocus(1)
    runMovements(kDirTy.right, !(entity - kG.paragraphboundary) ? kG.paragraph
        : !(entity - kG.lineBoundary) ? kG.line : entity, count)
    mode_  = mode
    mode = VisualModeNS.Mode.Visual
  } else if (command === VisualAction.Reverse) {
    reverseSelection()
  } else if (command >= VisualAction.MinWrapSelectionModify) {
    s0_line += mode === Mode.Line ? <SelWithToStr> curSelection : s0_line
    runMovements((command & 1) as 0 | 1, command >> 1, count)
  }
  if (mode === Mode.Caret) {
    extend(kDirTy.right)
    if (selType() === SelType.Caret) {
      extend(kDirTy.left)
    }
  } else if (mode === Mode.Line) {
    ensureLine(command, s0_line)
  }
  getDirection("")
  diType_ & DiType.Complicated ||
  scrollIntoView_s(getSelectionFocusEdge_(curSelection, di_), getSelectionBoundingBox_(curSelection)
      , command < VisualAction.MinNotWrapSelectionModify ? (command & VisualAction.inc) as 0 | 1 : 2)
}

    const typeIdx = { None: SelType.None, Caret: SelType.Caret, Range: SelType.Range }
    const initialScope: {r?: ShadowRoot | null} = {}
    let mode_: Mode = options.m || Mode.Visual
    let curSelection: Selection
    let currentPrefix: string = ""
    let retainSelection: BOOL | boolean | undefined
    let di_: ForwardDir | kDirTy.unknown = kDirTy.unknown
    let diType_: ValidDiTypes = DiType.UnsafeUnknown
    /** 0 means it's invalid; >=2 means real_length + 2; 1 means uninited */
    let oldLen_ = 0

    set_findCSS(options.f || findCSS)
  if (!keyMap) {
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
 * if no unicode RegExp, The list of words will be loaded into {@link background/store.ts#visualWordsRe_}
 */
  // icu@u_isalnum: http://icu-project.org/apiref/icu4c/uchar_8h.html#a5dff81615fcb62295bf8b1c63dd33a14
      if (OnFirefox && !Build.NativeWordMoveOnFirefox
          || OnChrome && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
              && chromeVer_ < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
          if (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces <= BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
              && OnChrome) {
            WordsRe_ff_old_cr = tryCreateRegExp(options.w!)!
          } else if (Build.BTypes === BrowserType.Firefox as number
              && Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp) {
            // note: here thinks the `/^[^]*[~~~]/` has acceptable performance
            WordsRe_ff_old_cr = <RegExpU> /^[^]*[\p{L}\p{Nd}_]/u
          } else {
            WordsRe_ff_old_cr = tryCreateRegExp(options.w! || "^[^]*[\\p{L}\\p{Nd}_]", options.w! ? "" : "u" as never)!
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
      (!OnChrome
        || Build.MinCVer >= BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
        || chromeVer_ > BrowserVer.MinSelExtendForwardOnlySkipWhitespaces - 1) &&
      // on Firefox 65 stable, Win 10 x64, there're '\r\n' parts in Selection.toString()
      // ignore "\ufeff" for shorter code since it's too rare
      (rightWhiteSpaceRe = <RegExpOne> (OnFirefox ? /[^\S\n\r\u2029\u202f]+$/ : /[^\S\n\u2029\u202f]+$/))
      safer(keyMap = options.k! as VisualModeNS.SafeKeyMap)
      kGranularity = options.g!
  }
  /** @safe_di */
  deactivate = (isEscOrReinit?: 1 | 2): void => {
      if (isEscOrReinit === 2) {
        (contentCommands_[kFgCmd.visualMode] as typeof activate)(options, 0)
        return
      }
      di_ = kDirTy.unknown
      diType_ = DiType.UnsafeUnknown
      getDirection("")
      const oldDiType: DiType = diType_
      removeHandler_(kHandler.visual)
      if (!retainSelection) {
        collapseToFocus(isEscOrReinit && mode_ !== Mode.Caret ? 1 : 0)
      }
      modeName = Mode.NotActive
      deactivate = null as never
      const el = insert_Lock_()
      oldDiType & (DiType.TextBox | DiType.Complicated) || el && el.blur()
      toggleSelectableStyle()
      set_scrollingTop(null)
      hudHide()
  }

    checkDocSelectable();
    set_scrollingTop(scrollingEl_(1))
    getPixelScaleToScroll()
    curSelection = getSelected(initialScope)
    let scope = initialScope.r as Exclude<typeof initialScope.r, undefined>, diff: number
    toggleSelectableStyle(1)
  {
    let type: SelType = selType()
    retainSelection = type === SelType.Range
    if (!modeName || mode_ !== Mode.Caret) {
      if (!insert_Lock_() && /* (type === SelType.Caret || type === SelType.Range) */ type) {
        prepareCrop_();
        const br = getSelectionBoundingBox_(curSelection, 1)
        if (!br || !cropRectS_(br)) {
          resetSelectionToDocStart(curSelection)
        } else if (type === SelType.Caret) {
          extend(kDirTy.right)
          selType() === SelType.Range || extend(kDirTy.left)
        }
        type = selType()
      }
    }
    diff = type - SelType.Range && mode_ - Mode.Caret
    modeName = mode_ = diff ? Mode.Caret : mode_
    di_ = type - SelType.Caret ? kDirTy.unknown : kDirTy.right

    if (OnFirefox && raw_insert_lock
        || /* type === SelType.None */ !type && (options.$else || !establishInitialSelectionAnchor())) {
        deactivate()
        runFallbackKey(options, kTip.needSel)
        return
    }
    if (mode_ === Mode.Caret && type > SelType.Range - 1) {
        // `sel` is not changed by @establish... , since `isRange`
      getDirection()
      collapseToRight(options.s != null ? <BOOL> +!options.s : di_
          && <BOOL> +(("" + <SelWithToStr> curSelection).length > 1))
    }
  }
  replaceOrSuppressMost_(kHandler.visual, (event: HandlerNS.Event): HandlerResult => {
    const doPass = Build.OS !== kBOS.MAC as number && (!(Build.OS & kBOS.MAC) || os_) && event.i === kKeyCode.menuKey
        || event.i === kKeyCode.ime,
    key = doPass ? "" : getMappedKey(event, kModeId.Visual), keybody = keybody_(key);
    let count: number
    if (!key || isEscape_(key)) {
      !key || currentKeys || currentPrefix ? event.v && (currentPrefix = "") : deactivate(1)
      // if doPass, then use nothing to bubble such an event, so handlers like LinkHints will also exit
      return event.v ? HandlerResult.Prevent
          : esc!(key ? HandlerResult.Prevent : doPass ? HandlerResult.Nothing : HandlerResult.Suppress)
    }
    if (keybody_(key) === ENTER) {
      currentPrefix = ""
      if (key > "s" && mode_ !== Mode.Caret) { retainSelection = 1 }
      "cm".includes(key[0]) ? deactivate() : yank(key < "b" ? kYank.NotExit : kYank.Exit)
      return esc!(HandlerResult.Prevent)
    }
    const childAction = keyMap[currentPrefix + key],
    newActions = (<RegExpOne> /^v\d/).test(key) ? +key.slice(1) : key === "0" && currentKeys ? void 0
        : childAction || keyMap[key]
    if (!(newActions! >= 0)) {
      // asserts newActions is VisualAction.NextKey | undefined (NaN)
      currentPrefix = newActions! < 0 ? key : ""
      return keybody < kChar.minNotF_num && keybody > kChar.maxNotF_num ? HandlerResult.Nothing
          : newActions ? HandlerResult.Prevent
          : (set_currentKeys(key.length < 2 && +key < 10 ? currentKeys + key : ""),
              keybody.length > 1 || key !== keybody && key < "s" ? HandlerResult.Suppress : HandlerResult.Prevent)
    }
    prevent_(event.e);
    count = !currentPrefix || childAction ? (<number> <number | string> currentKeys) | 0 || 1 : 1
    currentPrefix = "", esc!(HandlerResult.Nothing)
    di_ = kDirTy.unknown // make @di safe even when a user modifies the selection
    diType_ = DiType.UnsafeUnknown
    commandHandler(newActions as Extract<typeof newActions, number>, count)
    return HandlerResult.Prevent;
  })

  commandHandler(VisualAction.Noop, 1)
  diff ? hudTip(kTip.noUsableSel, 1) : hudHide(count ? void 0 : TimerType.noTimer)
}

export const highlightRange = (sel: Selection): void => {
  const br = getSelectionBoundingBox_(sel)
  if (br) { // width may be 0 in Caret mode
    let cr = cropRectToVisible_(br.l - 4, br.t - 5, br.r + 3, br.b + 4)
    cr && flash_(null, cr, 660, " Sel")
  }
}

if (!(Build.NDEBUG || kYank.MIN > ReuseType.MAX)) { console.log("Assert error: kYank.MIN > ReuseType.MAX") }
