import { clickable_, timeout_, loc_, getTime, clearTimeout_, vApi, recordLog, doc } from "../lib/utils"
import { CLK, MDW, OnDocLoaded_, isHTML_, set_createElement_, createElement_ } from "../lib/dom_utils"
import { grabBackFocus } from "./insert"
import { coreHints } from "./link_hints"

declare function exportFunction<T extends object, K extends keyof T>(this: void, func: T[K], targetScope: T
  , options?: { defineAs: K; allowCrossOriginArguments?: boolean }): void

export const main_ff = (Build.BTypes & BrowserType.Firefox ? (): void => {
(function (): void {
  try {
    const PEventTarget = (window as any).EventTarget as typeof EventTarget | undefined,
    Cls = PEventTarget && PEventTarget.prototype,
    wrappedCls = Cls && (Cls as any).wrappedJSObject as typeof Cls | undefined,
    _listen = wrappedCls && wrappedCls.addEventListener,
    newListen = function (this: EventTarget, type: string
        , listener: EventListenerOrEventListenerObject): void {
      const a = this, args = arguments, len = args.length
      len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2])
        : (apply as (this: (this: EventTarget, ...args: any[]) => void
              , self: EventTarget, args: IArguments) => void
          ).call(_listen as (this: EventTarget, ...args: any[]) => void, a, args)
      if ((type === CLK || type === MDW || type === "dblclick") && alive
          && listener && !(a instanceof HTMLAnchorElement) && a instanceof Element) {
        if (!Build.NDEBUG) {
          clickable_.has(a) || resolved++
          timer = timer || timeout_(resolve, GlobalConsts.ExtendClick_DelayToStartIteration)
        }
        clickable_.add(a)
      }
    },
    listen = newListen.call.bind<(this: (this: EventTarget,
            type: string, listener: EventListenerOrEventListenerObject, useCapture?: EventListenerOptions | boolean
          ) => 42 | void,
          self: EventTarget, name: string, listener: EventListenerOrEventListenerObject,
          opts?: EventListenerOptions | boolean
        ) => 42 | void>(_listen!), apply = newListen.apply,
    resolve = Build.NDEBUG ? 0 as never : (): void => {
      console.log("Vimium C: extend click: resolve %o in %o @t=%o .", resolved
          , loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"), getTime() % 3600000)
      timer && clearTimeout_(timer)
      timer = resolved = 0
    }
  
    let alive = false, timer = TimerID.None, resolved = 0
    if (grabBackFocus) {
      if (alive = typeof _listen === "function") {
        exportFunction(newListen, Cls!, { defineAs: _listen.name as "addEventListener" })
        vApi.e = (cmd: ValidContentCommands): void => { alive = alive && cmd < kContentCmd._minSuppressClickable }
      }
      OnDocLoaded_((): void => {
        timeout_(function (): void {
          coreHints.h - 1 || timeout_(coreHints.x, 34)
        }, GlobalConsts.ExtendClick_DelayToFindAll)
      }, 1)
    }
  } catch (e) {
    Build.NDEBUG || (recordLog("Vimium C: extending click crashed in %o @t=%o ."), console.log(e))
  }
  if (!isHTML_()) {
    // for <script>
    set_createElement_(doc.createElementNS.bind(doc, "http://www.w3.org/1999/xhtml") as typeof createElement_)
  }
})()
} : 0 as never) as () => void
