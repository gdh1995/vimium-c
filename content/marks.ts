import { VTr } from "../lib/utils.js"
import { post_ } from "../lib/port.js"
import { hudHide, hudShow, hudTip } from "./hud.js"

let onKeyChar: ((event: HandlerNS.Event, keyChar: string) => void) | null = null
let prefix = true
let swap = true
let mcount = 0
// [0..8]
let previous: MarksNS.FgMark[] = []

export const activate = (count: number, options: CmdOptions[kFgCmd.marks]): void => {
    const isGo = options.mode !== "create";
    onKeyChar = isGo ? goto : create
    mcount = count < 0 || count > 9 ? 0 : count - 1
    prefix = options.prefix !== false
    swap = !!options.swap
    VKey.removeHandler_(activate)
    VKey.pushHandler_(onKeydownM, activate)
    hudShow(isGo ? kTip.nowGotoMark : kTip.nowCreateMark);
}

const onKeydownM = (event: HandlerNS.Event): HandlerResult => {
    if (event.i === kKeyCode.ime) { return HandlerResult.Nothing; }
    let key = VKey.key_(event, kModeId.Marks), notEsc = !VKey.isEscape_(key);
    if (notEsc && key.length !== 1) {
      return HandlerResult.Suppress;
    }
    VKey.removeHandler_(activate)
    notEsc ? onKeyChar!(event, key) : hudHide()
    prefix = swap = true
    onKeyChar = null
    return HandlerResult.Prevent;
}

const getLocationKey = (keyChar: string): string => {
    return `vimiumMark|${location.href.split("#", 1)[0]}|${keyChar}`;
}

export const setPreviousMarkPosition = (idx?: number): void => {
  previous[idx! | 0] = [ scrollX, scrollY, location.hash ]
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
      createMark({n: keyChar}, "local")
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
        let pos = null, key = getLocationKey(keyChar), storage = localStorage, markString = storage.getItem(key)
        if (markString && (pos = JSON.parse(markString)) && typeof pos === "object") {
          const { scrollX, scrollY, hash } = VKey.safer_(pos)
          if (scrollX >= 0 && scrollY >= 0) {
            (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).o = {
              x: scrollX | 0, y: scrollY | 0, h: "" + (hash || "")
            }
            storage.removeItem(key)
          }
        }
      } catch {}
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).l = true;
      (req as MarksNS.FgQuery as MarksNS.FgLocalQuery).u = location.href;
    }
    post_(req);
}

export const scrollToMark = (scroll: Readonly<MarksNS.FgMark>): void => {
    if (scroll[1] === 0 && scroll[2] && scroll[0] === 0) {
      location.hash = scroll[2];
    } else {
      scrollTo(scroll[0], scroll[1]);
    }
}

export const createMark = (req: BgReq[kBgReq.createMark], local?: "local"): void => {
    post_<kFgReq.marks>({
      H: kFgReq.marks,
      a: kMarkAction.create,
      l: !!local,
      n: req.n,
      u: location.href,
      s: [scrollX | 0, scrollY | 0]
    })
    hudTip(kTip.didNormalMarkTask, 1000,
        [ VTr(kTip.didCreate), VTr(local || "global"), req.n ])
}

export const gotoMark = (_0: number, { n: a, s: scroll, k: typeKey, l: local }: CmdOptions[kFgCmd.goToMarks]): void => {
    a && setPreviousMarkPosition()
    scrollToMark(scroll)
    local || VApi.focusAndRun_()
    if (a) {
      hudTip(kTip.didNormalMarkTask, local ? 1000 : 2000,
          [ VTr(kTip.didJumpTo), VTr(typeKey), a ]);
    }
}
