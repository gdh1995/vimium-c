import {
  clickable_, timeout_, loc_, getTime, clearTimeout_, vApi, recordLog, doc, setupEventListener, VTr, raw_unwrap_ff,
  isTY, OnFirefox, isAsContent, isEnabled_, reflectApply_not_cr, fgCache, abs_
} from "../lib/utils"
import {
  CLK, MDW, OnDocLoaded_, isHTML_, set_createElement_, createElement_, onReadyState_, dispatchAsync_
} from "../lib/dom_utils"
import { grabBackFocus, insertInit } from "./insert"
import { HookAction, hookOnWnd } from "./port"
import { coreHints, doesWantToReloadLinkHints, hintOptions, reinitLinkHintsIn } from "./link_hints"
import { noopHandler } from "./key_handler"
/* eslint-disable @typescript-eslint/await-thenable */

declare function exportFunction(func: unknown, targetScope: object
    , options?: { defineAs?: string; allowCrossOriginArguments?: boolean }): unknown

/** `null`: disabled; `false`: nothing to do; `true`: begin to watch; `Event`: watching; `0`: page prevented */
let clickEventToPrevent_: boolean | 0 | Event | undefined
let clickAnchor_: HTMLAnchorElement & SafeHTMLElement | false | 0 | undefined = 0
let isClickEventPreventedByPage: 0 | 1 | 2 | 3 = 0
let preventEventOnWindow: ((wnd: Window) => (event: Event) => void) | undefined
let hookMethods: (setter: typeof eportToMainWorld, event: EventToPrevent) => void

export { clickEventToPrevent_ }

const eportToMainWorld = <T extends object, K extends (keyof T) & string> (obj: T, name: K, func: T[K]): void => {
  exportFunction(func, obj, { defineAs: name, allowCrossOriginArguments: true })
}

export const main_ff = (OnFirefox ? (ecOut_oldHasVC: number): void => {
(function (oldHasVC: number): void {
  const enum InnerConsts {
    DelayForNext = 36,
  }
  const PEventTarget = (window as PartialOf<typeof globalThis, "EventTarget">).EventTarget,
  ETCls = PEventTarget && PEventTarget.prototype,
  wrappedET = ETCls && raw_unwrap_ff(ETCls),
  newListen = function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject): void {
      const a = this, args = arguments, len = args.length
      len === 2 ? listen(a, type, listener) : len === 3 ? listen(a, type, listener, args[2] as EventListenerOptions)
        : reflectApply_not_cr!(_listen!, a, args)
      if ((type === CLK || type === MDW || type === "dblclick") && alive
          && listener && !(a instanceof HTMLAnchorElement) && a instanceof Element) {
        if (!Build.NDEBUG) {
          clickable_.has(a) || resolved++
        }
        timer = timer || (coreHints.h > 0 ? timeout_(onRegister, GlobalConsts.ExtendClick_DelayToStartIteration) : 0)
        clickable_.add(a)
      }
  },
  DocCls = Document.prototype as unknown as { open (): void, write (markup: string): void },
  wrappedDocCls = raw_unwrap_ff(DocCls),
  docOpenHook = (isWrite: BOOL, self: unknown, args: IArguments): void => {
    const first = doc.readyState < "l" && (isWrite || args.length < 3) && self === doc
    const oriHref = Build.NDEBUG || !first ? "" : location.host && location.pathname || location.href
    const ret = reflectApply_not_cr!(isWrite ? _docWrite : _docOpen!, self, args)
    if (first && (isEnabled_ || !fgCache)) {
      hookOnWnd(HookAction.Install)
      insertInit()
      timeout_(onReadyState_, 18)
      Build.NDEBUG || reHookTimes++ ||
      console.log("Vimium C: auto re-init after `document.%s()` on %o at %o."
          , isWrite ? "write" : "open"
          , oriHref.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"), getTime())
    }
    return ret
  },
  newDocOpen = function open(this: Document): void {
    return docOpenHook(0, this, arguments)
  },
  newDocWrite = function write(this: Document): void {
    return docOpenHook(1, this, arguments)
  }
  let onRegister = (): void => {
    if (coreHints.h > 0 && hintOptions.autoReload && doesWantToReloadLinkHints("de")
        && abs_(getTime() - coreHints.h) < GlobalConsts.ExtendClick_DelayToStartIteration + 200) {
      reinitLinkHintsIn(InnerConsts.DelayForNext + 17)
    }
    if (!Build.NDEBUG) {
      (++counterResolvePath <= 32 || Math.floor(Math.log(counterResolvePath) / Math.log(1.414)) !==
           Math.floor(Math.log(counterResolvePath - 1) / Math.log(1.414))) &&
      console.log("Vimium C: extend click: resolve %o in %o @t=%o .", resolved
          , loc_.pathname.replace(<RegExpOne> /^.*(\/[^\/]+\/?)$/, "$1"), getTime() % 3600000)
    }
    clearTimeout_(timer)
    timer = 0
    Build.NDEBUG || (resolved = 0)
  }
  let alive = false, timer: ValidTimeoutID = TimerID.None, resolved = 0, counterResolvePath = 0
  let reHookTimes = 0
  let _listen: EventTarget["addEventListener"] | undefined, _docOpen: (typeof DocCls)["open"] | undefined
  let _docWrite: (typeof DocCls)["write"]
  let listen: (self: EventTarget, name: string
      , listener: EventListenerOrEventListenerObject, opts?: EventListenerOptions | boolean) => void
  isHTML_() || set_createElement_(doc.createElementNS.bind(doc, VTr(kTip.XHTML) as "http://www.w3.org/1999/xhtml"
      ) as typeof createElement_)
  try {
    _listen = wrappedET && wrappedET.addEventListener
    if (alive = isTY(_listen, kTY.func)) {
      if (grabBackFocus) {
        // here allow `doc.write(obj)` to call `obj.toString()` - https://github.com/gdh1995/vimium-c/issues/1043
        _docOpen = wrappedDocCls!.open, _docWrite = wrappedDocCls!.write
      } else {
        if (oldHasVC & 1 && newListen.toString.call(_listen) === ETCls!.addEventListener + "") {
          try {
            _listen(CLK, noopHandler)
            setupEventListener(0, CLK, noopHandler, 1, 3)
          } catch {
            _listen = doc.addEventListener
            _docOpen = (doc as unknown as typeof DocCls).open, _docWrite = (doc as unknown as typeof DocCls).write
          }
        }
      }
      if (_docOpen) {
        listen = setupEventListener.call.bind<(this: (this: EventTarget,
                type: string, listener: EventListenerOrEventListenerObject, useCapture?: EventListenerOptions | boolean
              ) => 42 | void,
              self: EventTarget, name: string, listener: EventListenerOrEventListenerObject,
              opts?: EventListenerOptions | boolean
            ) => 42 | void>(_listen!)
        eportToMainWorld(ETCls!, _listen.name as "addEventListener", newListen)
        eportToMainWorld(DocCls, "open", newDocOpen)
        eportToMainWorld(DocCls, "write", newDocWrite)
        vApi.e = (cmd: ValidContentCommands): void => { alive = alive && cmd < kContentCmd._minSuppressClickable }
      }
    }
    grabBackFocus && OnDocLoaded_((): void => {
        timeout_(function (): void {
          coreHints.h < 0 && doesWantToReloadLinkHints("lo") &&
          reinitLinkHintsIn(GlobalConsts.MinCancelableInBackupTimer)
        }, GlobalConsts.ExtendClick_EndTimeOfAutoReloadLinkHints)
    }, 1)
  } catch (e) {
    Build.NDEBUG || (recordLog("Vimium C: extending click crashed in %o @t=%o .")(), console.log(e))
  }
})(ecOut_oldHasVC)
} : 0 as never) as (ecOut_oldHasVC: number) => void

export const unblockClick_old_ff = (): void => {
  let notDuringAct: BOOL
  /**
   * This idea of hooking and appending `preventDefault` is from lydell's `LinkHints`:
   * https://github.com/lydell/LinkHints/blob/efa18fdfbf95016bd706b83a2d51545cb157b440/src/worker/Program.js#L1337-L1631
   */
  try {
    const enum kAct { prevent = 0, stopImm = 1, stopProp = 2 }
    type Pair<Key extends kAct> = readonly [() => void, Key]
    const PEvent = (window as PartialOf<typeof globalThis, "Event">).Event,
    EventCls = PEvent && PEvent.prototype as EventToPrevent,
    wrappedCls = isAsContent ? EventCls && raw_unwrap_ff(EventCls) : EventCls,
    stdMembers: readonly [Pair<kAct.prevent>, Pair<kAct.stopImm>, Pair<kAct.stopProp>] & { [i in kAct]: Pair<i> }
        = wrappedCls ? [[wrappedCls.preventDefault, kAct.prevent]
            , [wrappedCls.stopImmediatePropagation, kAct.stopImm]
            , [wrappedCls.stopPropagation, kAct.stopProp]] as const : [] as never,
    tryToPreventClick = (event: Event): void => {
      if (event !== clickEventToPrevent_) { /* empty */ }
      else if (event.defaultPrevented) {
        isClickEventPreventedByPage & 2 || (isClickEventPreventedByPage = 1)
      } else { // MUST NOT clear `clickEventToPrevent_` here
        callPreviousPreventSafely(event)
        if (!Build.NDEBUG) {
          console.log("Vimium C: event#click calls .prevetDefault at %o on %o"
              , event.eventPhase > 2 ? "bubble" : event.eventPhase > 1 ? "target" : "capture"
              , event.currentTarget === window ? "#window" : event.currentTarget)
        }
      }
    },
    callPreviousPreventSafely = (event: Event): void => {
      // avoid re-entry during calling the previous `preventDefault`
      if (notDuringAct && (!clickAnchor_ || clickAnchor_.target === "_blank")) {
        isClickEventPreventedByPage = 0
        notDuringAct = 0
        try { reflectApply_not_cr!(stdMembers[kAct.prevent][0], event, []) } catch (e) {}
        notDuringAct = 1
      }
    }

    hookMethods = (setter, event): void => {
      for (const [stdFunc, idx] of stdMembers) { /*#__ENABLE_SCOPED__*/
        setter(event, stdFunc.name as "preventDefault" | "stopImmediatePropagation" | "stopPropagation"
            , function (this: EventToPrevent): any {
          const self = this, ret = reflectApply_not_cr!(stdFunc, self, arguments)
          self !== clickEventToPrevent_ ? 0
          : idx < kAct.stopImm ? isClickEventPreventedByPage = 1 // idx === kAct.prevent
          : self.defaultPrevented ? isClickEventPreventedByPage & 2 || (isClickEventPreventedByPage = 1)
          : idx > kAct.stopImm // remove `listenToPreventClick` because new listeners in currentTarget won't be executed
          ? (Build.NDEBUG ? callPreviousPreventSafely(self) : tryToPreventClick(self), isClickEventPreventedByPage = 2)
          : callPreviousPreventSafely(self) // idx === kAct.stopImm
          return ret
        });
      }
    }
    if (grabBackFocus && isAsContent && stdMembers.every(i => isTY(i[0], kTY.func))) {
      hookMethods(eportToMainWorld, EventCls!)
    }
    preventEventOnWindow = (wnd: Window): ((event: Event) => void) => {
      isClickEventPreventedByPage = notDuringAct = 1
      setupEventListener(wnd, CLK, tryToPreventClick, 0, 3)
      return tryToPreventClick
    }
    clickEventToPrevent_ = 0
  } catch (e) {
    Build.NDEBUG || (recordLog("Vimium C: hooking Event::preventDefault crashed in %o @t=%o .")(), console.log(e))
  }
}

export const prepareToBlockClick_old_ff = (doesBeginPrevent: boolean
    , anchor: HTMLAnchorElement & SafeHTMLElement | false): void => {
  clickEventToPrevent_ = clickEventToPrevent_ != null ? doesBeginPrevent : clickEventToPrevent_
  clickAnchor_ = clickEventToPrevent_ && anchor
}

export const dispatchAndBlockClickOnce_old_ff = async (targetElement: SafeElement, clickEvent: MouseEvent
    ): Promise<boolean> => {
  const view = (targetElement.ownerDocument as Document).defaultView
  const doesBlock = view === window
  let toRemove: ((event: Event) => void) | undefined
  if (!(Build.NDEBUG || view !== raw_unwrap_ff(window))) {
    console.log("Assert error: a target element is bound to window.wrappedJSObject");
  }
  if (doesBlock) {
    clickEventToPrevent_ = clickEvent
    toRemove = preventEventOnWindow!(view)
    isAsContent || hookMethods((a, k, v): void => { a[k] = v }, clickEvent as MouseEventToPrevent)
  }
  const rawDispatchRetVal = await dispatchAsync_(targetElement, clickEvent),
  wrappedRetVal = rawDispatchRetVal || doesBlock && !(isClickEventPreventedByPage & 1)
  toRemove && setupEventListener(view, CLK, toRemove, 1, 3)
  if (!Build.NDEBUG) {
    console.log("Vimium C: try blocking a click event, and the returned is %o when %s %o, so return %o"
        , rawDispatchRetVal, "clickEventToPrevent_ is"
        , clickEventToPrevent_ && isTY(clickEventToPrevent_, kTY.obj) ? "<Event>" : clickEventToPrevent_
        , wrappedRetVal)
  }
  clickEventToPrevent_ = clickAnchor_ = 0
  return wrappedRetVal
}
