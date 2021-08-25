import {
  injector, safer, timeout_, isAlive_, isTop, set_i18n_getMsg, locHref, OnEdge, OnChrome, OnFirefox, isTY
} from "../lib/utils"
import { suppressTail_ } from "../lib/keyboard_utils"
import { docHasFocus_ } from "../lib/dom_utils"
import { style_ui } from "./dom_ui"
import { hudTip } from "./hud"

export interface Port extends chrome.runtime.Port {
  postMessage<k extends keyof FgRes>(request: Req.fgWithRes<k>): 1;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  postMessage<k extends keyof FgReq>(request: Req.fg<k>): 1;
  onMessage: chrome.events.Event<(message: any, port: Port, exArg: FakeArg) => void>;
}
export declare const enum HookAction { Install = 0, SuppressListenersOnDocument = 1, Suppress = 2, Destroy = 3 }
export type SafeDestoryF = (silent?: boolean | BOOL | 9) => void

let port_callbacks: { [msgId: number]: <k extends keyof FgRes>(this: void, res: FgRes[k]) => void }
let port_: Port | null = null
let tick = 1
let safeDestroy: SafeDestoryF
let requestHandlers: { [k in keyof BgReq]: (this: void, request: BgReq[k]) => unknown }
let contentCommands_: {
  [k in keyof CmdOptions]:
    k extends kFgCmd.framesGoBack | kFgCmd.insertMode ? (msg: CmdOptions[k], count?: number) => void :
    (this: void, options: CmdOptions[k] & SafeObject, count: number, key?: -42 | 0 | 1 | 2 | TimerType.fake) => void;
}
let hookOnWnd: (action: HookAction) => void

export { port_ as runtime_port, safeDestroy, requestHandlers, contentCommands_, hookOnWnd }

export function set_port_ (_newRuntimePort: null): void { port_ = _newRuntimePort }
export function set_safeDestroy (_newSafeDestroy: SafeDestoryF): void { safeDestroy = _newSafeDestroy }
export function set_requestHandlers (_newHandlers: typeof requestHandlers): void { requestHandlers = _newHandlers }
export function set_contentCommands_ (_newCmds: typeof contentCommands_): void { contentCommands_ = _newCmds }
export function set_hookOnWnd (_newHookOnWnd: typeof hookOnWnd): void { hookOnWnd = _newHookOnWnd }

export const post_ = <k extends keyof FgReq>(request: FgReq[k] & Req.baseFg<k>): 1 | void => {
  port_!.postMessage(request);
}

export const send_  = <k extends keyof FgRes> (cmd: k, args: Req.fgWithRes<k>["a"]
    , callback: (this: void, res: FgRes[k]) => void): void => {
  (post_ as Port["postMessage"])({ H: kFgReq.msg, i: ++tick, c: cmd, a: args })
  ; port_callbacks = port_callbacks || safer({})
  port_callbacks[tick] =
          callback as <K2 extends keyof FgRes>(this: void, res: FgRes[K2]) => void
}

export const onPortRes_ = function<k extends keyof FgRes> (response: Omit<Req.res<k>, "N">): void {
  const id = response.m, handler = port_callbacks[id]
  delete port_callbacks[id]
  handler(response.r)
}

export const safePost = <k extends keyof FgReq> (request: FgReq[k] & Req.baseFg<k>): void => {
  try {
    if (!port_) {
      runtimeConnect();
      injector && timeout_((): void => { port_ || safeDestroy(); }, 50);
    } else if (OnFirefox && injector) {
      (requestHandlers[kBgReq.injectorRun] as VimiumInjectorTy["$m"])(InjectorTask.recheckLiving)
    }
    post_(request);
  } catch { // this extension is reloaded or disabled
    safeDestroy();
  }
}

export const runtimeConnect = (function (this: void): void {
  const api = OnChrome ? chrome : browser as typeof chrome,
  status = requestHandlers[kBgReq.init] ? PortType.initing
      : PortType.reconnect + (PortType.hasCSS * <number> <boolean | number> !!style_ui),
  name = (PortType.isTop === 1 ? <number> <boolean | number> isTop : PortType.isTop * <number> <number | boolean> isTop)
      + PortType.hasFocus * <number> <number | boolean> docHasFocus_() + status,
  data = { name: injector ? PortNameEnum.Prefix + name + injector.$h
                  : OnEdge ? name + PortNameEnum.Delimiter + locHref() : "" + name },
  connect = api.runtime.connect
  port_ = injector ? connect(injector.id, data) as Port : connect(data) as Port
  port_.onDisconnect.addListener((): void => {
    port_ = null
    timeout_(function (i): void {
      if (OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) {
        safeDestroy()
      } else {
        try { port_ || !isAlive_ || runtimeConnect() } catch { safeDestroy() }
      }
    }, requestHandlers[kBgReq.init] ? 2000 : 5000);
  });
  port_.onMessage.addListener(<T extends keyof BgReq> (response: Req.bg<T>): void => {
    type TypeToCheck = { [k in keyof BgReq]: (this: void, request: BgReq[k]) => unknown };
    type TypeChecked = { [k in keyof BgReq]: <T2 extends keyof BgReq>(this: void, request: BgReq[T2]) => unknown };
    (requestHandlers as TypeToCheck as TypeChecked)[response.N](response);
  })
  set_i18n_getMsg(api.i18n.getMessage)
})

export const runFallbackKey = ((options: Req.FallbackOptions
    , anotherTip: kTip | 0 | false | 2, tipArgs?: string | Array<string | number>, wait?: number): void => {
  const fallback = !anotherTip ? options.$then : options.$else, context = options.$f
  if (fallback && isTY(fallback)) {
    if (!(Build.NDEBUG || Build.Minify)) {
      console.log("Vimium C: run another command %o for type & tip = %o", fallback, anotherTip)
    }
    suppressTail_(wait || 60, 0)
    post_({
      H: kFgReq.nextKey, k: fallback, f: { c: context, r: options.$retry, u: anotherTip, w: wait }
    })
  } else {
    const tip = anotherTip && anotherTip !== 2 ? anotherTip : context ? context.t : 0
    tip && hudTip(tip, 0, tipArgs)
  }
}) as {
  /** if `anotherTip` is `0` / `false`, then use `.$then`; otherwise use `.$else` */
  (options: Req.FallbackOptions, anotherTip: 0 | 2 | false, tipArgs?: "" | TimerType.fake, wait?: number): void
  (options: Req.FallbackOptions, anotherTip: kTip, tipArgs?: string | Array<string | number>): void
}
