import { loc_, locHref, OnFirefox, timeout_ } from "../lib/utils"
import {
  createElement_, dispatchEvent_, newEvent_, scrollingEl_, textContent_s, OnDocLoaded_
} from "../lib/dom_utils"
import { post_, runFallbackKey } from "./port"
import { hudHide, hudShow, hudTip, hud_tipTimer } from "./hud"
import { removeHandler_, getMappedKey, isEscape_, replaceOrSuppressMost_, hasShift_ff } from "../lib/keyboard_utils"
import { makeElementScrollBy_ } from "./scroller"

// [1..9]
let previous: MarksNS.ScrollInfo[] = []

export const dispatchMark = ((mark?: MarksNS.ScrollInfo | 0 | undefined, global?: boolean
    ): MarksNS.ScrollInfo | MarksNS.ScrollInfo | null => {
  let a = createElement_("a"), oldStr: string | undefined, newStr: string, match: string[],
  newMark: MarksNS.ScrollInfo | 0 | null | undefined
  mark && textContent_s(a, oldStr = mark + "")
  global || (a.dataset.local = "")
  newMark = !dispatchEvent_(window, newEvent_("vimiumMark", 0, 0, 0
        , { relatedTarget: a }, FocusEvent)) ? null
      : (newStr = textContent_s(a)) === oldStr ? mark
      : (match = newStr.split(",")).length > 1 ? ([~~match[0], ~~match[1]] as const
          ).concat(match.slice(2) as never) as [number, number, string]
      : mark
  return mark ? newMark as NonNullable<typeof mark> | null : newMark || [scrollX | 0, scrollY | 0]
}) as {
  (mark: MarksNS.ScrollInfo, global?: boolean): MarksNS.ScrollInfo | null
  (mark?: 0, global?: boolean): MarksNS.ScrollInfo // create: return `Writable<MarksNS.ScrollInfo>`
}

export const setPreviousMarkPosition = (idx: number): void => {
  const arr = dispatchMark()
  arr.length === 2 && (arr as Writable<MarksNS.ScrollInfo>).push(loc_.hash)
  previous[idx] = arr
}

export const activate = (options: CmdOptions[kFgCmd.marks], count: number): void => {
  hudShow(kTip.raw, options.t)
  replaceOrSuppressMost_(kHandler.marks, (event): HandlerResult => {
  let storage: typeof localStorage, local: boolean
  if (event.i === kKeyCode.ime) { return HandlerResult.Nothing }
  let keyChar = getMappedKey(event, kModeId.Marks)
  let tempPos: MarksNS.ScrollInfo | undefined
  if (keyChar.length !== 1 && !isEscape_(keyChar)) {
    return HandlerResult.Suppress
  }
  removeHandler_(kHandler.marks)
  keyChar < kChar.minNotNum && keyChar > kChar.maxNotNum && options.n && (count = +keyChar || 10, keyChar = "'")
  if (isEscape_(keyChar)) {
    hudHide()
  } else if ("`'".includes(keyChar)) {
    if (options.a) {
      setPreviousMarkPosition(count)
    } else {
      tempPos = previous[count]
      setPreviousMarkPosition(tempPos ? 1 : count)
      tempPos && scrollToMark(dispatchMark(tempPos))
    }
    post_({ H: kFgReq.didLocalMarkTask, c: options, i: count, n: !tempPos })
  } else {
    local = (OnFirefox ? hasShift_ff!(event.e) : event.e.shiftKey) !== options.s
    post_<kFgReq.marks>({
      H: kFgReq.marks, c: options, l: local, k: event.i, n: keyChar,
      s: options.a ? dispatchMark(0, !local) : local && (storage = localStorage)
          ? storage.getItem(`vimiumMark|${locHref().split("#", 1)[0]}|${keyChar}`) : 0,
      u: locHref()
    });
    timeout_((): void => { hud_tipTimer || hudHide() }, 100)
  }
  return HandlerResult.Prevent
  })
}

export const scrollToMark = (scroll: MarksNS.ScrollInfo | null | undefined): void => {
  if (scroll) {
    if (scroll[1] === 0 && scroll[2] && scroll[0] === 0) {
      loc_.hash = scroll[2];
    } else {
      makeElementScrollBy_(scrollingEl_(1), scroll[0] - scrollX, scroll[1] - scrollY)
    }
  }
}

export const goToMark_ = (options: CmdOptions[kFgCmd.goToMark]): void => {
  const cb = (): void => {
    options.t && setPreviousMarkPosition(1)
    scrollToMark(dispatchMark(options.s, options.g))
    hudTip(kTip.raw, (options.g satisfies boolean as boolean | number as number + 1) as 1 | 2, options.t)
    runFallbackKey(options.f, 0)
  }
  options.w ? OnDocLoaded_(timeout_.bind(0, cb, options.w), 1) : cb()
}
