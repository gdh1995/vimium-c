import { injector, safeObj, timeout_ } from "./utils.js"

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
let runtimeConnect: (this: void) => void
let safeDestroy: SafeDestoryF

export { port_ as runtime_port, port_callbacks, runtimeConnect, safeDestroy }
export const setRuntimePort = (newPort: Port | null) => { port_ = newPort }
export const setRuntimeConnect = (connector: (this: void) => void): void => { runtimeConnect = connector }
export const setSafeDestroy = (newDestroy: SafeDestoryF): void => { safeDestroy = newDestroy }

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
