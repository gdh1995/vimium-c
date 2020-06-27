import {
  clickable_, timeout_, loc_, getTime, clearTimeout_, vApi, recordLog, doc, setupEventListener,
} from "../lib/utils"
import { CLK, MDW, OnDocLoaded_, isHTML_, set_createElement_, createElement_ } from "../lib/dom_utils"
import { grabBackFocus } from "./insert"
import { coreHints } from "./link_hints"

declare function exportFunction<T extends object, K extends keyof T>(this: void, func: T[K], targetScope: T
  , options?: { defineAs: K; allowCrossOriginArguments?: boolean }): void

/** `null`: disabled; `false`: nothing to do; `true`: begin to watch; `Event`: watching; `0`: page prevented */
let clickEventToPrevent_: boolean | Event | null | 0 = null
let preventEventOnWindow: ((wnd: Window) => Promise<void>) | undefined

export const main_ff = (Build.BTypes & BrowserType.Firefox ? (): void => {
(function (): void {
  const apply = OnDocLoaded_.apply, call = OnDocLoaded_.call
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
    listen = call.bind<(this: (this: EventTarget,
            type: string, listener: EventListenerOrEventListenerObject, useCapture?: EventListenerOptions | boolean
          ) => 42 | void,
          self: EventTarget, name: string, listener: EventListenerOrEventListenerObject,
          opts?: EventListenerOptions | boolean
        ) => 42 | void>(_listen!),
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
  try {
    const enum kAct { prevent = 0, stopImm = 1, stopProp = 2 }
    type Pair<Key extends kAct> = readonly [() => void, Key]
    const PEvent = (window as any).Event as typeof Event | undefined,
    EventCls = PEvent && PEvent.prototype as EventToPrevent,
    wrappedCls = EventCls && (EventCls as any).wrappedJSObject as typeof EventCls | undefined,
    stdMembers: readonly [Pair<kAct.prevent>, Pair<kAct.stopImm>, Pair<kAct.stopProp>] & { [i in kAct]: Pair<i> }
        = grabBackFocus && wrappedCls ? [[wrappedCls.preventDefault, kAct.prevent]
            , [wrappedCls.stopImmediatePropagation, kAct.stopImm]
            , [wrappedCls.stopPropagation, kAct.stopProp]] as const : [] as never,
    tryToPreventClick = (event: Event): void => {
      if (event !== clickEventToPrevent_) { /* empty */ }
      else if (event.defaultPrevented) {
        clickEventToPrevent_ = 0
      } else if (isHandingTheSecondTime) { // MUST NOT clear `clickEventToPrevent_` here
        call.call(stdMembers[kAct.prevent][0], event)
        if (!Build.NDEBUG) {
          console.log("Vimium C: event#click calls .prevetDefault at %o on %o"
              , event.eventPhase > 2 ? "bubble" : event.eventPhase > 1 ? "target" : "capture"
              , event.currentTarget === window ? "#window" : event.currentTarget)
        }
      } else {
        listenToPreventClick(event)
        isHandingTheSecondTime = 1
      }
    },
    listenToPreventClick = async (event: Event): Promise<void> => {
      const curTarget = event.currentTarget,
      phase = event.eventPhase,
      localSetupListener = setupEventListener.bind(null, curTarget, CLK, tryToPreventClick)
      isHandingTheSecondTime = 0
      // ensure listener is the latest one
      localSetupListener(1, 1), localSetupListener(1, 3)
      phase < /** Event.BUBBLING_PHASE  */ 3 && localSetupListener(0, 1)
      await phase > /** Event.CAPTURING_PHASE */ 1 && localSetupListener(0, 3)
      localSetupListener(1, 1), localSetupListener(1, 3)
    }
    preventEventOnWindow = async (wnd: Window): Promise<void> => (
      isHandingTheSecondTime = 1,
      await setupEventListener(wnd, CLK, tryToPreventClick, 0, 3),
      setupEventListener(wnd, CLK, tryToPreventClick, 1, 3)
    )
    let isHandingTheSecondTime: BOOL

    for (const [stdFunc, idx] of stdMembers.every(i => typeof i[1] === "function") ? stdMembers : [] as never) {
      exportFunction(function (this: EventToPrevent): any {
        const self = this, ret = apply.call(stdFunc, self, arguments)
        self !== clickEventToPrevent_ ? 0
        : idx < kAct.stopImm || self.defaultPrevented ? /*#__INLINE__*/ clickEventToPrevent_ = 0 // idx === kAct.prevent
        : idx > kAct.stopImm ? /*#__NOINLINE__*/ listenToPreventClick(self) // idx === kAct.stopProp
        : call.call(stdMembers[kAct.prevent][0], self) // idx === kAct.stopImm
        return ret
      }, EventCls!, { defineAs: stdFunc.name as "preventDefault" | "stopPropagation" });
    }
    clickEventToPrevent_ = false
  } catch (e) {
    Build.NDEBUG || (recordLog("Vimium C: hooking Event::preventDefault crashed in %o @t=%o ."), console.log(e))
  }
})()
} : 0 as never) as () => void

export const beginToPreventClick_ff = (doesBeginPrevent: boolean): void => {
  clickEventToPrevent_ = clickEventToPrevent_ != null ? doesBeginPrevent : clickEventToPrevent_
}

export const wrappedDispatchMouseEvent_ff = (targetElement: Element, mouseEventMayBePrevented: MouseEvent): boolean => {
  clickEventToPrevent_ = clickEventToPrevent_ && mouseEventMayBePrevented.type === CLK && mouseEventMayBePrevented
  if (!(Build.NDEBUG || mouseEventMayBePrevented.type !== CLK
        || (targetElement.ownerDocument as Document).defaultView === window)) {
    console.log("Assert error: a target element is bound to a different window instance");
  }
  if (clickEventToPrevent_) {
    preventEventOnWindow!((targetElement.ownerDocument as Document).defaultView)
  }
  const rawDispatchRetVal = targetElement.dispatchEvent(mouseEventMayBePrevented),
  wrappedRetVal = rawDispatchRetVal || !!clickEventToPrevent_
  if (!Build.NDEBUG && mouseEventMayBePrevented.type === CLK) {
    console.log("Vimium C: dispatch a click event and returned is %o, %s %o, so return %o"
        , rawDispatchRetVal, "clickEventToPrevent_ is"
        , clickEventToPrevent_ && typeof clickEventToPrevent_ === "object" ? "<Event>" : clickEventToPrevent_
        , wrappedRetVal)
  }
  clickEventToPrevent_ = clickEventToPrevent_ && 0
  return wrappedRetVal
}
