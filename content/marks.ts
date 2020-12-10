import { VTr, safer, loc_, vApi, locHref, isTY, isTop } from "../lib/utils"
import { post_ } from "./port"
import { hudHide, hudShow, hudTip } from "./hud"
import { removeHandler_, getMappedKey, isEscape_, replaceOrSuppressMost_ } from "../lib/keyboard_utils"
import { createElement_, textContent_s } from "../lib/dom_utils"

// [0..8]
let previous: Readonly<MarksNS.FgMark>[] = []

const dispatchMark = ((mark?: Readonly<MarksNS.FgMark> | null | undefined
    ): Readonly<MarksNS.FgMark> | MarksNS.FgMark | null => {
  let a = createElement_("a"), oldStr: string | undefined, newStr: string, match: string[],
  newMark: Readonly<MarksNS.FgMark> | null | undefined
  mark && textContent_s(a, oldStr = mark + "")
  newMark = !dispatchEvent(new FocusEvent("vimiumMark", { relatedTarget: a })) ? null
      : (newStr = textContent_s(a)) === oldStr ? mark
      : (match = newStr.split(",")).length > 1 ? [~~match[0], ~~match[1], match[2]] : mark
  return mark ? newMark as Readonly<MarksNS.FgMark> | MarksNS.FgMark | null : newMark || [scrollX | 0, scrollY | 0]
}) as {
  (mark: Readonly<MarksNS.FgMark>): Readonly<MarksNS.FgMark> | null | MarksNS.FgMark
  (mark?: undefined): MarksNS.FgMark
}

export const setPreviousMarkPosition = (idx?: number): void => {
  (previous[idx! | 0] = dispatchMark()).push(loc_.hash)
}

export const activate = (options: CmdOptions[kFgCmd.marks], count: number): void => {
  const isCreate = options.mode === "create"
  const mcount = count < 2 || count > 9 ? 0 : count - 1
  const prefix = options.prefix !== !1
  const swap = !!options.swap
  hudShow(<number> <number | boolean> isCreate + kTip.nowGotoMark)
  replaceOrSuppressMost_(kHandler.marks, (event): HandlerResult => {
  if (event.i === kKeyCode.ime) { return HandlerResult.Nothing }
  const keyChar = getMappedKey(event, kModeId.Marks)
  if (keyChar.length !== 1 && !isEscape_(keyChar)) {
    return HandlerResult.Suppress
  }
  removeHandler_(kHandler.marks)
  if (isEscape_(keyChar)) {
    hudHide()
  } else if ("`'".includes(keyChar)) {
    if (isCreate) {
      setPreviousMarkPosition(mcount)
      hudTip(kTip.didCreateLastMark, 1000)
    } else {
      const pos = previous[mcount]
      setPreviousMarkPosition(pos ? 0 : mcount)
      pos && scrollToMark(pos)
      hudTip(kTip.didLocalMarkTask, 1000,
          [VTr(pos ? kTip.didJumpTo : kTip.didCreate), mcount ? mcount + 1 : VTr(kTip.lastMark)])
    }
  } else if (isCreate) {
    if (event.e.shiftKey !== swap) {
      if (isTop) {
        createMark({n: keyChar})
      } else {
        post_({H: kFgReq.marks, a: kMarkAction.create, n: keyChar})
        hudHide()
      }
    } else {
      createMark({n: keyChar}, 2)
    }
  } else {
    const req: Extract<Req.fg<kFgReq.marks>, { a: kMarkAction.goto }> = {
      H: kFgReq.marks, a: kMarkAction.goto,
      p: prefix,
      n: keyChar
    }
    if (event.e.shiftKey !== swap) {
      hudHide()
    } else {
      try {
        let pos: {scrollX: number, scrollY: number, hash?: string} | null = null
        const key = `vimiumMark|${locHref().split("#", 1)[0]}|${keyChar}`
        let storage = localStorage, markString = storage && storage.getItem(key)
        if (markString && (pos = JSON.parse(markString)) && isTY(pos, kTY.obj)) {
          safer(pos)
          const scrollX = pos.scrollX, scrollY = pos.scrollY, hash = pos.hash
          if (scrollX >= 0 && scrollY >= 0) {
            (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).o = {
              x: scrollX | 0, y: scrollY | 0, h: "" + (hash || "")
            }
          }
        }
      } catch {}
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).l = 2;
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).u = locHref()
    }
    post_(req);
  }
  return HandlerResult.Prevent
  })
}

export const scrollToMark = ((scroll: Readonly<MarksNS.FgMark> | null | undefined): void => {
  scroll = dispatchMark(scroll!)
  if (scroll) {
    if (scroll[1] === 0 && scroll[2] && scroll[0] === 0) {
      loc_.hash = scroll[2];
    } else {
      scrollTo(scroll[0], scroll[1]);
    }
  }
}) as (scroll: Readonly<MarksNS.FgMark>) => void

export const createMark = (req: BgReq[kBgReq.createMark], local?: 0 | 2): void => {
    post_<kFgReq.marks>({
      H: kFgReq.marks,
      a: kMarkAction.create,
      l: local,
      n: req.n,
      u: locHref(),
      s: dispatchMark()
    })
    hudTip(kTip.didNormalMarkTask, 1000,
        [ VTr(kTip.didCreate), VTr(local ? kTip.local : kTip.global), req.n ])
}

export const gotoMark = ({ n: a, s: scroll, l: local }: CmdOptions[kFgCmd.goToMarks]): void => {
    a && setPreviousMarkPosition()
    scrollToMark(scroll)
    local || vApi.f()
    if (a) {
      hudTip(kTip.didNormalMarkTask, local ? 1000 : 2000,
          [ VTr(kTip.didJumpTo), VTr(kTip.global + local), a ])
    }
}

if (!(Build.NDEBUG || kTip.nowGotoMark + 1 === kTip.nowCreateMark)) {
  console.log("Assert error: kTip.nowGotoMark + 1 === kTip.nowCreateMark")
}
