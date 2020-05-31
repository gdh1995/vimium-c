import {
  loc_, injector, safeObj, timeout_, isAlive_, VOther, isEnabled_, isLocked_, isTop, doc, set_i18n_getMsg,
} from "../lib/utils"
import { passKeys } from "../content/key_handler"
import { style_ui } from "../content/dom_ui"

export interface Port extends chrome.runtime.Port {
  postMessage<k extends keyof FgRes>(request: Req.fgWithRes<k>): 1;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  postMessage<k extends keyof FgReq>(request: Req.fg<k>): 1;
  onMessage: chrome.events.Event<(message: any, port: Port, exArg: FakeArg) => void>;
}
export type SafeDestoryF = (silent?: boolean | BOOL | 9) => void

const port_callbacks: { [msgId: number]: <k extends keyof FgRes>(this: void, res: FgRes[k]) => void } = safeObj(null)
let port_: Port | null = null
let tick = 1
let safeDestroy: SafeDestoryF
let requestHandlers: { [k in keyof BgReq]: (this: void, request: BgReq[k]) => void }

export { port_ as runtime_port, port_callbacks, safeDestroy, requestHandlers }

export function clearRuntimePort (): void { port_ = null }
export function set_safeDestroy (_newSafeDestroy: SafeDestoryF): void { safeDestroy = _newSafeDestroy }
export function set_requestHandlers (_newHandlers: typeof requestHandlers): void { requestHandlers = _newHandlers }

export const post_ = <k extends keyof FgReq>(request: FgReq[k] & Req.baseFg<k>): 1 | void => {
  port_!.postMessage(request);
}

export const send_  = <k extends keyof FgRes> (cmd: k, args: Req.fgWithRes<k>["a"]
    , callback: (this: void, res: FgRes[k]) => void): void => {
  let id = ++tick;
  (post_ as Port["postMessage"])({ H: kFgReq.msg, i: id, c: cmd, a: args });
  port_callbacks[id] = callback as <K2 extends keyof FgRes>(this: void, res: FgRes[K2]) => void;
}

export const safePost = <k extends keyof FgReq> (request: FgReq[k] & Req.baseFg<k>): void => {
  try {
    if (!port_) {
      runtimeConnect();
      injector && timeout_((): void => { port_ || safeDestroy(); }, 50);
    } else if (Build.BTypes & BrowserType.Firefox && injector) {
      injector.$r(InjectorTask.recheckLiving);
    }
    post_(request);
  } catch { // this extension is reloaded or disabled
    safeDestroy();
  }
}

export const runtimeConnect = (function (this: void): void {
  const api = Build.BTypes & ~BrowserType.Chrome
      && (!(Build.BTypes & BrowserType.Chrome) || VOther !== BrowserType.Chrome)
      ? browser as typeof chrome : chrome,
  status = requestHandlers[kBgReq.init] ? PortType.initing
    : (isEnabled_ ? passKeys ? PortType.knownPartial : PortType.knownEnabled : PortType.knownDisabled)
    + (isLocked_ ? PortType.isLocked : 0) + (style_ui ? PortType.hasCSS : 0),
  name = PortType.isTop * +isTop + PortType.hasFocus * +doc.hasFocus() + status,
  data = { name: injector ? PortNameEnum.Prefix + name + injector.$h
      : !(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && VOther & BrowserType.Edge
      ? name + PortNameEnum.Delimiter + loc_.href
      : "" + name
  },
  connect = api.runtime.connect
  port_ = injector ? connect(injector.id, data) as Port : connect(data) as Port
  port_.onDisconnect.addListener((): void => {
    port_ = null
    timeout_(function (i): void {
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && i) {
        safeDestroy()
      } else {
        try { port_ || !isAlive_ || runtimeConnect() } catch { safeDestroy() }
      }
    }, requestHandlers[kBgReq.init] ? 2000 : 5000);
  });
  port_.onMessage.addListener(<T extends keyof BgReq> (response: Req.bg<T>): void => {
    type TypeToCheck = { [k in keyof BgReq]: (this: void, request: BgReq[k]) => void };
    type TypeChecked = { [k in keyof BgReq]: <T2 extends keyof BgReq>(this: void, request: BgReq[T2]) => void };
    (requestHandlers as TypeToCheck as TypeChecked)[response.N](response);
  });
  /*#__INLINE__*/ set_i18n_getMsg(api.i18n.getMessage)
})
