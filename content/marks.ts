import { VTr, safer, loc_, vApi } from "../lib/utils"
import { post_ } from "./port"
import { hudHide, hudShow, hudTip } from "./hud"
import { removeHandler_, pushHandler_, getMappedKey, isEscape_ } from "../lib/keyboard_utils"

let onKeyChar: ((event: HandlerNS.Event, keyChar: string) => void) | null = null
let prefix = true
let swap = true
let mcount = 0
// [0..8]
let previous: MarksNS.FgMark[] = []

export const activate = (options: CmdOptions[kFgCmd.marks], count: number): void => {
    const isGo = options.mode !== "create";
    onKeyChar = isGo ? goto : create
    mcount = count < 0 || count > 9 ? 0 : count - 1
    prefix = options.prefix !== false
    swap = !!options.swap
    removeHandler_(activate)
    hudShow(isGo ? kTip.nowGotoMark : kTip.nowCreateMark);
  pushHandler_((event: HandlerNS.Event): HandlerResult => {
    let key: string
    if (event.i === kKeyCode.ime) { return HandlerResult.Nothing; }
    key = getMappedKey(event, kModeId.Marks)
    if (key.length !== 1 && !isEscape_(key)) {
      return HandlerResult.Suppress;
    }
    removeHandler_(activate)
    isEscape_(key) ? hudHide() : onKeyChar!(event, key)
    prefix = swap = true
    onKeyChar = null
    return HandlerResult.Prevent;
  }, activate)
}

export const setPreviousMarkPosition = (idx?: number): void => {
  previous[idx! | 0] = [ scrollX, scrollY, loc_.hash ]
}

const create = (event: HandlerNS.Event, keyChar: string): void => {
    if (keyChar === "`" || keyChar === "'") {
      setPreviousMarkPosition(mcount)
      hudTip(kTip.didCreateLastMark, 1000)
    } else if (event.e.shiftKey !== swap) {
      if (top === window) {
        createMark({n: keyChar})
      } else {
        post_({H: kFgReq.marks, a: kMarkAction.create, n: keyChar})
        hudHide()
      }
    } else {
      createMark({n: keyChar}, 2)
    }
}

const goto = (event: HandlerNS.Event, keyChar: string): void => {
    if (keyChar === "`" || keyChar === "'") {
      const count = mcount, pos = previous[count]
      setPreviousMarkPosition(pos ? 0 : count)
      if (pos) {
        scrollToMark(pos)
      }
      return hudTip(kTip.didLocalMarkTask, 1000,
          [VTr(pos ? kTip.didJumpTo : kTip.didCreate), count ? count + 1 : VTr(kTip.lastMark)])
    }
    const req: Extract<Req.fg<kFgReq.marks>, { a: kMarkAction.goto }> = {
      H: kFgReq.marks, a: kMarkAction.goto,
      p: prefix,
      n: keyChar
    }
    if (event.e.shiftKey !== swap) {
      hudHide()
    } else {
      try {
        let pos = null, key = `vimiumMark|${loc_.href.split("#", 1)[0]}|${keyChar}`
        let storage = localStorage, markString = storage.getItem(key)
        if (markString && (pos = JSON.parse(markString)) && typeof pos === "object") {
          safer(pos)
          const scrollX = pos.scrollX, scrollY = pos.scrollY, hash = pos.hash
          if (scrollX >= 0 && scrollY >= 0) {
            (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).o = {
              x: scrollX | 0, y: scrollY | 0, h: "" + (hash || "")
            }
            storage.removeItem(key)
          }
        }
      } catch {}
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).l = 2;
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).u = loc_.href;
    }
    post_(req);
}

export const scrollToMark = (scroll: Readonly<MarksNS.FgMark>): void => {
    if (scroll[1] === 0 && scroll[2] && scroll[0] === 0) {
      loc_.hash = scroll[2];
    } else {
      scrollTo(scroll[0], scroll[1]);
    }
}

export const createMark = (req: BgReq[kBgReq.createMark], local?: 0 | 2): void => {
    post_<kFgReq.marks>({
      H: kFgReq.marks,
      a: kMarkAction.create,
      l: local,
      n: req.n,
      u: loc_.href,
      s: [scrollX | 0, scrollY | 0]
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
