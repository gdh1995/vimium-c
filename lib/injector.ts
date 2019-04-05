declare var browser: unknown;
var VimiumInjector: VimiumInjectorTy | undefined | null, VimiumClickable: WeakSet<Element> | undefined | null;
(function (injectorBuilder: (scriptSrc: string) => VimiumInjectorTy["reload"]) {
let runtime = ((!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
  : typeof browser !== "undefined" && browser &&
  !((browser as typeof chrome | Element) instanceof Element)) ? browser as typeof chrome : chrome).runtime;
const curEl = document.currentScript as HTMLScriptElement, scriptSrc = curEl.src, i0 = scriptSrc.indexOf("://") + 3,
onIdle = window.requestIdleCallback;
let tick = 1, extHost = scriptSrc.substring(i0, scriptSrc.indexOf("/", i0));
if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && extHost.indexOf("-") > 0) {
  extHost = curEl.dataset.vimiumId || BuildStr.FirefoxID;
}
function handler(this: void, res: ExternalMsgs[kFgReq.inject]["res"] | undefined | false): void {
  type LastError = chrome.runtime.LastError;
  let str: string | undefined, noBackend: boolean, err = runtime.lastError as void | LastError;
  if (!res) {
    const msg: string | void = err && err.message,
    host = runtime.id || location.host || location.protocol;
    noBackend = !!(msg && msg.lastIndexOf("not exist") >= 0 && runtime.id);
    if (res === false) { // disabled
      str = ": not in the white list.";
    } else if (!noBackend && err) {
      str = msg ? `:\n\t${msg}` : ": no backend found.";
    } else if (tick > 3) {
      str = msg ? `:\n\t${msg}` : `: retried but failed (${res}).`;
      noBackend = false;
    } else {
      setTimeout(call, 200 * tick);
      tick++;
      noBackend = true;
    }
    if (!noBackend) {
      console.log("%cVimium C%c: %cfail%c to inject into %c%s%c %s"
        , "color:red", "color:auto", "color:red", "color:auto", "color:#0c85e9"
        , host, "color:auto", str ? str : ` (${tick} retries).`);
    }
  }
  if (VimiumInjector && typeof VimiumInjector.destroy === "function") {
    VimiumInjector.destroy(true);
  }

  VimiumInjector = {
    id: extHost,
    alive: 0,
    version: res ? res.version : "",
    versionHash: res ? res.versionHash : "",
    clickable: VimiumClickable,
    reload: injectorBuilder(scriptSrc),
    checkIfEnabled: null as never,
    $run (task): void { VimiumInjector && VimiumInjector.$_run(task.t); },
    $_run (): void {},
    getCommandCount: null as never,
    destroy: null
  };
  const docEl = document.documentElement;
  if (!res || !docEl) {
    return err as void;
  }
  const inserAfter = document.contains(curEl) ? curEl : (document.head || docEl).lastChild as Node
    , insertBefore = inserAfter.nextSibling
    , parentElement = inserAfter.parentElement as Element;
  let scripts: HTMLScriptElement[] = [];
  for (const i of res.scripts) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = false;
    script.src = i;
    parentElement.insertBefore(script, insertBefore);
    scripts.push(script);
  }
  scripts.length > 0 && (scripts[scripts.length - 1].onload = function (): void {
    this.onload = null as never;
    for (let i = scripts.length; 0 <= --i; ) { scripts[i].remove(); }
  });
}
function call() {
  runtime.sendMessage(extHost, <ExternalMsgs[kFgReq.inject]["req"]> { handler: kFgReq.inject }, handler);
}
function start() {
  removeEventListener("DOMContentLoaded", start);
  onIdle && !(Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback && Build.BTypes & BrowserType.Chrome
              && onIdle instanceof Element)
  ? (onIdle as Exclude<typeof onIdle, null | Element>)(function (): void {
    (onIdle as Exclude<typeof onIdle, null | Element>)(function (): void { setTimeout(call, 0); }, {timeout: 67});
  }, {timeout: 330}) : setTimeout(call, 67);
}
if (document.readyState !== "loading") {
  start();
} else {
  addEventListener("DOMContentLoaded", start, true);
}
})(function (scriptSrc): VimiumInjectorTy["reload"] {
  return function (async): void {
    if (VimiumInjector && typeof VimiumInjector.destroy === "function") {
      VimiumInjector.destroy(true);
    }
    function inject(): void {
      const docEl = document.documentElement as HTMLHtmlElement | null;
      if (!docEl) { return; }
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = false;
      script.src = scriptSrc;
      console.log("%cVimium C%c begins to reload"
          + (async === InjectorTask.reload ? " because it has been updated." : ".")
        , "color:red", "color:auto");
      (document.head || document.body || docEl).appendChild(script);
    }
    async ? setTimeout(inject, 200) : inject();
  };
});

(!document.currentScript
  || ((document.currentScript as HTMLScriptElement).dataset.vimiumHooks || "").toLowerCase() !== "false"
  ) && VimiumClickable !== null &&
(function (): void {
type ListenerEx = EventTarget["addEventListener"] & { vimiumHooked?: boolean; };
type _EventTargetEx = typeof EventTarget;
interface EventTargetEx extends _EventTargetEx {
  vimiumRemoveHooks: (this: void) => void;
}
interface ElementWithClickable {
  vimiumHasOnclick?: boolean;
}
VimiumClickable = VimiumClickable ? VimiumClickable
    : Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
      || window.WeakSet ? new WeakSet<Element>() : {
  add (element: Element) { (element as ElementWithClickable).vimiumHasOnclick = true; return this; },
  has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumHasOnclick; },
  delete (element: Element): boolean {
    const oldVal = (element as ElementWithClickable).vimiumHasOnclick;
    oldVal && ((element as ElementWithClickable).vimiumHasOnclick = false);
    return !!oldVal;
  }
};

const obj = EventTarget as EventTargetEx, cls = obj.prototype, _listen = cls.addEventListener as ListenerEx;
if (_listen.vimiumHooked === true) { return; }

const HA = HTMLAnchorElement, E = Element;

const newListen: ListenerEx = cls.addEventListener =
function addEventListener(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject) {
  if (type === "click" && !(this instanceof HA) && listener && this instanceof E) {
    VimiumClickable && VimiumClickable.add(this as Element);
  }
  const args = arguments, len = args.length;
  return len === 2 ? _listen.call(this, type, listener) : len === 3 ? _listen.call(this, type, listener, args[2])
    : _listen.apply(this, args);
},
funcCls = Function.prototype, funcToString = funcCls.toString,
newToString = funcCls.toString = function toString(this: (this: unknown, ...args: unknown[]) => unknown): string {
  return funcToString.apply(this === newListen ? _listen : this === newToString ? funcToString : this, arguments);
};
newListen.vimiumHooked = true;
obj.vimiumRemoveHooks = function () {
  delete obj.vimiumRemoveHooks;
  cls.addEventListener === newListen && (cls.addEventListener = _listen);
  funcCls.toString === newToString && (funcCls.toString = funcToString);
};
newListen.prototype = newToString.prototype = void 0;
})();
