import {
  clickable_, timeout_, loc_, getTime, clearTimeout_, vApi, recordLog, doc, setupEventListener, VTr, raw_unwrap_ff,
  isTY,
  OnFirefox
} from "../lib/utils"
import { CLK, MDW, OnDocLoaded_, isHTML_, set_createElement_, createElement_ } from "../lib/dom_utils"
import { grabBackFocus } from "./insert"
import { coreHints, doesWantToReloadLinkHints } from "./link_hints"
/* eslint-disable @typescript-eslint/await-thenable */

declare function exportFunction(func: unknown, targetScope: object
    , options?: { defineAs?: string; allowCrossOriginArguments?: boolean }): unknown

/** `null`: disabled; `false`: nothing to do; `true`: begin to watch; `Event`: watching; `0`: page prevented */
let clickEventToPrevent_: BOOL | Event | null = null
let isClickEventPreventedByPage: BOOL = 0
let preventEventOnWindow: ((wnd: Window) => Promise<void>) | undefined

export const main_ff = (OnFirefox ? (): void => {
(function (): void {
  const apply = OnDocLoaded_.apply, call = OnDocLoaded_.call
  const doExport = <T extends object, K extends (keyof T) & string> (obj: T, name: K, func: T[K]): void => {
    exportFunction(func, obj, { defineAs: name, allowCrossOriginArguments: true })
  }
  try {
    const PEventTarget = (window as PartialOf<typeof globalThis, "EventTarget">).EventTarget,
    Cls = PEventTarget && PEventTarget.prototype,
    wrappedCls = Cls && raw_unwrap_ff(Cls),
    _listen = wrappedCls && wrappedCls.addEventListener,
    newListen = function (this: EventTarget, type: string
        , listener: EventListenerOrEventListenerObject): void {
      const a = this, args = arguments, len = args.length
      len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2])
        : (apply as (this: (this: EventTarget, ...args: any[]) => void
              , self: EventTarget, args: IArguments) => void
          ).call(_listen as (this: EventTarget, ...args1: any[]) => void, a, args)
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
    resolve = !Build.NDEBUG ? (): void => {
      (++counterResolvePath <= 32 || Math.floor(Math.log(counterResolvePath) / Math.log(1.414)) !==
           Math.floor(Math.log(counterResolvePath - 1) / Math.log(1.414))) &&
      console.log("Vimium C: extend click: resolve %o in %o @t=%o .", resolved
          , loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"), getTime() % 3600000)
      timer && clearTimeout_(timer)
      timer = resolved = 0
    } : 0 as never

    let alive = false, timer: ValidTimeoutID = TimerID.None, resolved = 0, counterResolvePath = 0
    if (grabBackFocus) {
      if (alive = isTY(_listen, kTY.func)) {
        doExport(Cls!, _listen.name as "addEventListener", newListen)
        vApi.e = (cmd: ValidContentCommands): void => { alive = alive && cmd < kContentCmd._minSuppressClickable }
      }
      OnDocLoaded_((): void => {
        timeout_(function (): void {
          coreHints.h - 1 || doesWantToReloadLinkHints("lo") && timeout_(coreHints.x, 34)
        }, GlobalConsts.ExtendClick_DelayToFindAll)
      }, 1)
    }
  } catch (e) {
    Build.NDEBUG || (recordLog("Vimium C: extending click crashed in %o @t=%o ."), console.log(e))
  }
  if (!isHTML_()) {
    // for <script>
    set_createElement_(doc.createElementNS.bind(doc, VTr(kTip.XHTML) as "http://www.w3.org/1999/xhtml"
        ) as typeof createElement_)
  }
  /**
   * This idea of hooking and appending `preventDefault` is from lydell's `LinkHints`:
   * https://github.com/lydell/LinkHints/blob/efa18fdfbf95016bd706b83a2d51545cb157b440/src/worker/Program.js#L1337-L1631
   */
  try {
    const enum kAct { prevent = 0, stopImm = 1, stopProp = 2 }
    type Pair<Key extends kAct> = readonly [() => void, Key]
    const PEvent = (window as PartialOf<typeof globalThis, "Event">).Event,
    EventCls = PEvent && PEvent.prototype as EventToPrevent,
    wrappedCls = EventCls && raw_unwrap_ff(EventCls),
    stdMembers: readonly [Pair<kAct.prevent>, Pair<kAct.stopImm>, Pair<kAct.stopProp>] & { [i in kAct]: Pair<i> }
        = grabBackFocus && wrappedCls ? [[wrappedCls.preventDefault, kAct.prevent]
            , [wrappedCls.stopImmediatePropagation, kAct.stopImm]
            , [wrappedCls.stopPropagation, kAct.stopProp]] as const : [] as never,
    tryToPreventClick = (event: Event): void => {
      if (event !== clickEventToPrevent_) { /* empty */ }
      else if (event.defaultPrevented) {
        isClickEventPreventedByPage = 1
      } else if (isHandingTheSecondTime) { // MUST NOT clear `clickEventToPrevent_` here
        callPreviousPreventSafely(event)
        if (!Build.NDEBUG) {
          console.log("Vimium C: event#click calls .prevetDefault at %o on %o"
              , event.eventPhase > 2 ? "bubble" : event.eventPhase > 1 ? "target" : "capture"
              , event.currentTarget === window ? "#window" : event.currentTarget)
        }
      } else {
        void listenToPreventClick(event)
        isHandingTheSecondTime = 1
      }
    },
    callPreviousPreventSafely = (event: Event): void => {
      // avoid re-entry during calling the previous `preventDefault`
      if (notDuringAct) {
        isClickEventPreventedByPage = 0
        notDuringAct = 0
        try { call.call(stdMembers[kAct.prevent][0], event) } catch (e) {}
        notDuringAct = 1
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
      await (phase > /** Event.CAPTURING_PHASE */ 1 && localSetupListener(0, 3))
      localSetupListener(1, 1), localSetupListener(1, 3)
    }
    preventEventOnWindow = async (wnd: Window): Promise<void> => {
      isClickEventPreventedByPage = notDuringAct = isHandingTheSecondTime = 1
      await setupEventListener(wnd, CLK, tryToPreventClick, 0, 3)
      setupEventListener(wnd, CLK, tryToPreventClick, 1, 3)
    }
    let isHandingTheSecondTime: BOOL, notDuringAct: BOOL

    for (const [stdFunc, idx] of stdMembers.every(i => isTY(i[0], kTY.func)) ? stdMembers : [] as never) {
      doExport(EventCls!, stdFunc.name as "preventDefault" | "stopPropagation" | "stopImmediatePropagation"
          , function (this: EventToPrevent): any {
        const self = this, ret = apply.call(stdFunc, self, arguments)
        self !== clickEventToPrevent_ ? 0
        : idx < kAct.stopImm || self.defaultPrevented ? isClickEventPreventedByPage = 1 // idx === kAct.prevent
        : idx > kAct.stopImm ? void listenToPreventClick(self) // idx === kAct.stopProp
        : callPreviousPreventSafely(self) // idx === kAct.stopImm
        return ret
      });
    }
    clickEventToPrevent_ = 0
  } catch (e) {
    Build.NDEBUG || (recordLog("Vimium C: hooking Event::preventDefault crashed in %o @t=%o ."), console.log(e))
  }
})()
} : 0 as never) as () => void

export const beginToPreventClick_ff = (doesBeginPrevent: boolean): void => {
  clickEventToPrevent_ = clickEventToPrevent_ != null ? <BOOL> +doesBeginPrevent : clickEventToPrevent_
}

export const wrappedDispatchMouseEvent_ff = (targetElement: Element, mouseEventMayBePrevented: MouseEvent): boolean => {
  let view: Window | undefined
  clickEventToPrevent_ = clickEventToPrevent_ && (mouseEventMayBePrevented.type === CLK
      && (view = (targetElement.ownerDocument as Document).defaultView) === window
      && mouseEventMayBePrevented || 0)
  if (!(Build.NDEBUG || !view || view !== raw_unwrap_ff(window))) {
    console.log("Assert error: a target element is bound to window.wrappedJSObject");
  }
  if (clickEventToPrevent_) {
    void preventEventOnWindow!(view!)
  }
  const rawDispatchRetVal = targetElement.dispatchEvent(mouseEventMayBePrevented),
  wrappedRetVal = rawDispatchRetVal || !!clickEventToPrevent_ && !isClickEventPreventedByPage
  if (!Build.NDEBUG && mouseEventMayBePrevented.type === CLK) {
    console.log("Vimium C: dispatch a click event and returned is %o, %s %o, so return %o"
        , rawDispatchRetVal, "clickEventToPrevent_ is"
        , clickEventToPrevent_ && isTY(clickEventToPrevent_, kTY.obj) ? "<Event>" : clickEventToPrevent_
        , wrappedRetVal)
  }
  clickEventToPrevent_ = clickEventToPrevent_ && 0
  return wrappedRetVal
}
