/// <reference path="../typings/base/index.d.ts" />
/// <reference path="../typings/lib/index.d.ts" />
/// <reference path="../typings/lib/window.d.ts" />
/// <reference path="../typings/build/index.d.ts" />

interface KnownDataset {
  vimiumId: string
  extensionId: string
  blockFocus: "" | "true" | "false" // if "true" then do grab
  vimiumHooks: "" | "true" | "false" // if "false" then not hook addEventListener
}

// eslint-disable-next-line no-var, @typescript-eslint/no-unused-vars
var VimiumInjector: VimiumInjectorTy | undefined | null
((): void => {
  const old = VimiumInjector, cur: VimiumInjectorTy = {
    id: "", alive: -1, host: "", version: "", cache: null,
    clickable: undefined, eval: null, reload: null as never, checkIfEnabled: null as never,
    $: null as never, $h: null as never, $m: null as never, $r: null as never, $g: null,
    getCommandCount: null as never, callback: null, destroy: null
  };
  if (old) {
    for (let key of <Array<keyof VimiumInjectorTy>> Object.keys(old)) {
      (cur as Generalized<VimiumInjectorTy>)[key] = old[key]
    }
  }
  cur.alive = -1
  cur.$g = null
  VimiumInjector = cur
})();

(function (_a0: 1, injectorBuilder: (scriptSrc: string) => VimiumInjectorTy["reload"]): void {
const MayChrome = !!(Build.BTypes & BrowserType.Chrome), MayNotChrome = Build.BTypes !== BrowserType.Chrome as number
const MayEdge = !!(Build.BTypes & BrowserType.Edge)
const mayBrowser_ = MayChrome && MayNotChrome
    && typeof browser === "object" && !("tagName" in (browser as unknown as Element))
    ? (browser as typeof chrome) : null
const useBrowser = !MayNotChrome ? false : !MayChrome ? true
    : !!(mayBrowser_ && mayBrowser_.runtime && mayBrowser_.runtime.connect)
let runtime = (useBrowser ? (browser as typeof chrome) : chrome).runtime
const curEl = document.currentScript as HTMLScriptElement, scriptSrc = curEl.src, i0 = scriptSrc.indexOf("://") + 3
const confBlockFocus = curEl.dataset.blockFocus
let onIdle = MayChrome && Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback || MayEdge
    ? window.requestIdleCallback : requestIdleCallback
let tick = 1, extHost = scriptSrc.slice(i0, scriptSrc.indexOf("/", i0)), extID = extHost;
if (!MayChrome || MayNotChrome && extID.indexOf("-") > 0) {
  extID = curEl.dataset.vimiumId || BuildStr.FirefoxID;
}
extID = curEl.dataset.extensionId || extID;
if (Build.BTypes & ~(BrowserType.Firefox | BrowserType.Edge) && extID === extHost
    && (!(Build.BTypes & BrowserType.Firefox) || location.protocol.startsWith("moz-"))) {
  if (((runtime.getManifest() || {}).manifest_version || 3) >= 3) {
    alert("Require [data-extension-id] on <script> of vimium-c/injector.js")
    return
  }
}
VimiumInjector.id = extID;
if (MayChrome && Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback || MayEdge) {
  onIdle = typeof onIdle !== "function" || "tagName" in (onIdle as unknown as Element) ? null as never : onIdle
}
type LastError = chrome.runtime.LastError;
function handler(this: void, res: ExternalMsgs[kFgReq.inject]["res"] | undefined | false, err?: LastError): void {
  let str: string | undefined, noBackend: boolean
  const _old = VimiumInjector, oldClickable = _old && _old.clickable, oldCallback = _old && _old.callback;
  if (!res) {
    const msg: string | void = err && err.message,
    host = runtime.id || location.host || location.protocol;
    noBackend = !!(msg && msg.lastIndexOf("not exist") >= 0 && runtime.id);
    if (res === false) { // disabled
      str = ": not in the allow list.";
    } else if (!noBackend && err) {
      str = msg ? `:\n\t${msg}` : ": no backend found.";
    } else if (tick > 3) {
      str = msg ? `:\n\t${msg}` : `: retried but failed (${res}).`;
      noBackend = false;
    } else {
      setTimeout(safeCall, 200 * tick);
      tick++;
      noBackend = true;
    }
    if (!noBackend) {
      str = str || ` (${tick} retries).`;
      const colorRed = "color:red", colorAuto = "color:auto";
      console.log("%cVimium C%c: %cfail%c to inject into %c%s%c %s"
        , colorRed, colorAuto, colorRed, colorAuto, "color:#0c85e9"
        , host, colorAuto, str);
      oldCallback && _old.callback!(-1, str)
    }
  }
  if (_old && typeof _old.destroy === "function") {
    _old.destroy(true);
  }

  const verHash = res ? res.h : ""
  const newInjector = VimiumInjector = {
    id: extID,
    alive: 0,
    host: !MayNotChrome ? extID : res ? res.host : "",
    version: res ? res.version : "",
    cache: null,
    clickable: oldClickable,
    eval: null,
    reload: injectorBuilder(scriptSrc),
    checkIfEnabled: null as never,
    $: null as never,
    $h (stat_num) { return PortNameEnum.Prefix + stat_num + verHash },
    $m (task): void { VimiumInjector && VimiumInjector.$r(typeof task === "object" ? task.t : task); },
    $r (): void { /* empty */ },
    $g: confBlockFocus != null ? (confBlockFocus === "" || confBlockFocus.toLowerCase() === "true") : null,
    getCommandCount: null as never,
    callback: oldCallback || null,
    destroy: null
  };
  const docEl = document.documentElement;
  if (!res || !(docEl instanceof HTMLHtmlElement)) {
    return err as void;
  }
  const insertAfter = document.contains(curEl) ? curEl : (document.head || docEl).lastChild! || document.head
    , insertBefore = insertAfter.nextSibling
    , parentElement = insertAfter.parentElement as Element;
  const fragment = Build.Inline ? null : document.createDocumentFragment()
  const hasFrag = !(Build.BTypes & BrowserType.Chrome)
      || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend || !Build.Inline && fragment!.append
  let scripts: HTMLScriptElement[] = [];
  for (const i of res.s!) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = false;
    script.src = i;
    Build.Inline ? parentElement.insertBefore(script, insertBefore)
    : hasFrag || fragment!.appendChild(script)
    scripts.push(script);
  }
  Build.Inline || (hasFrag && fragment!.append!(...scripts), parentElement.insertBefore(fragment!, insertBefore))
  scripts.length > 0 && (scripts[scripts.length - 1].onload = function (): void {
    this.onload = null as never;
    for (let i = scripts.length; 0 <= --i; ) { scripts[i].remove(); }
  });
  oldCallback && newInjector.callback!(0, "loading");
}
const call = useBrowser ? (): void => {
  (runtime.sendMessage(extID, <ExternalMsgs[kFgReq.inject]["req"]> {
    handler: kFgReq.inject, scripts: true
  }) as any as Promise<ExternalMsgs[kFgReq.inject]["res"]>).then(handler, err => handler(undefined, err as LastError))
} : (): void => {
  runtime.sendMessage(extID, <ExternalMsgs[kFgReq.inject]["req"]> {
    handler: kFgReq.inject, scripts: true
  }, (res): void => {
    const err = runtime.lastError as void | LastError
    err ? handler(undefined, err) : handler(res as ExternalMsgs[kFgReq.inject]["res"])
    return err as void
  });
}
const safeCall = (): void => {
  try {
    call()
  } catch (ex) {
    console.log("Can not send message to the extension of %o: %s", extID, ex && (ex as Error).message || (ex + ""))
  }
}
function start(): void {
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once) {
    removeEventListener("DOMContentLoaded", start, true)
  }
  // requestAnimationFrame((): void => {})
  !(MayChrome && Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback || MayEdge) || onIdle
  ? (onIdle as RequestIdleCallback)((): void => {
    (onIdle as RequestIdleCallback)!((): void => { setTimeout(safeCall, 0); }, {timeout: 67});
  }, {timeout: 330}) : setTimeout(safeCall, 67);
}
if (document.readyState !== "loading") {
  start();
} else {
  addEventListener("DOMContentLoaded", start, { capture: true, once: true })
}
})(1, function (scriptSrc): VimiumInjectorTy["reload"] {
  return function (isAsync): void {
    const injector = VimiumInjector;
    if (injector) {
      const oldClickable = injector.clickable;
      if (typeof injector.destroy === "function") {
        injector.destroy(true);
      }
      injector.clickable = oldClickable;
    }
    function doReload(): void {
      const docEl = document.documentElement as HTMLHtmlElement | null;
      const parentNode = document.head || document.body || docEl
      const script = document.createElement("script");
      if (!parentNode) { return }
      script.type = "text/javascript";
      script.async = false;
      script.src = scriptSrc;
      console.log("%cVimium C%c begins to reload%s."
        , "color:red", "color:auto"
        , isAsync === InjectorTask.reload ? " because it has been updated." : "");
      if (Build.BTypes && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend) {
        parentNode.appendChild(script)
      } else {
        parentNode.append!(script)
      }
    }
    isAsync ? setTimeout(doReload, 200) : doReload();
  };
});

(!document.currentScript
  || ((document.currentScript as HTMLScriptElement).dataset.vimiumHooks || "").toLowerCase() !== "false"
  ) && VimiumInjector.clickable !== null &&
(function (): void {
type ListenerEx = EventTarget["addEventListener"] & { vimiumHooked?: boolean };
type _EventTargetEx = typeof EventTarget;
interface EventTargetEx extends _EventTargetEx {
  vimiumRemoveHooks: (this: void) => void;
}
interface ElementWithClickable {
  vimiumClick?: boolean;
}
VimiumInjector.clickable = VimiumInjector.clickable
    || ( Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
        || typeof WeakSet === "function" && !("tagName" in (WeakSet as unknown as Element))
        ? new WeakSet!<Element>() : <WeakSet<Element>> {
  add (element: Element) { (element as ElementWithClickable).vimiumClick = true; return this; },
  has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumClick; },
  delete (element: Element): boolean {
    const oldVal = (element as ElementWithClickable).vimiumClick;
    oldVal && ((element as ElementWithClickable).vimiumClick = false);
    return !!oldVal;
  }
});

const obj = EventTarget as EventTargetEx, cls = obj.prototype, _listen = cls.addEventListener as ListenerEx;
if (_listen.vimiumHooked === true) { return; }

const HACls = HTMLAnchorElement, ElCls = Element;

const newListen: ListenerEx = cls.addEventListener =
function addEventListener(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject) {
  if (type === "click" && !(this instanceof HACls) && listener && this instanceof ElCls) {
    const injector = VimiumInjector;
    injector && injector.clickable && injector.clickable.add(this);
  }
  const args = arguments, len = args.length;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return len === 2 ? _listen.call(this, type, listener) : len === 3 ? _listen.call(this, type, listener, args[2])
    : _listen.apply(this, args);
},
funcCls = Function.prototype, funcToString = funcCls.toString,
newToString = funcCls.toString = function toString(this: (this: unknown, ...args: unknown[]) => unknown): string {
  return funcToString.apply(this === newListen ? _listen : this === newToString ? funcToString : this, arguments);
};
newListen.vimiumHooked = true;
obj.vimiumRemoveHooks = function () {
  delete (obj as Partial<EventTargetEx>).vimiumRemoveHooks
  cls.addEventListener === newListen && (cls.addEventListener = _listen);
  funcCls.toString === newToString && (funcCls.toString = funcToString);
};
newListen.prototype = newToString.prototype = void 0;
})();
