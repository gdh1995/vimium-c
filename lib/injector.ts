/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
var VimiumInjector: VimiumInjectorTy | undefined | null = VimiumInjector || {
  id: "",
  alive: -1,
  host: "",
  version: "",
  cache: null,
  // eslint-disable-next-line id-blacklist
  clickable: undefined,
  reload: null as never,
  checkIfEnabled: null as never,
  $h: "",
  $m: null as never,
  $r: null as never,
  $p: null,
  getCommandCount: null as never,
  callback: null,
  destroy: null
};
if (Build.BTypes & BrowserType.Chrome && Build.BTypes & ~BrowserType.Chrome) { var browser: unknown; }
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6WeakMapAndWeakSet) {
  var WeakSet: WeakSetConstructor | undefined;
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback
    || Build.BTypes & BrowserType.Edge) {
  var requestIdleCallback: RequestIdleCallback | undefined;
}
/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

(function (_a0: 1, injectorBuilder: (scriptSrc: string) => VimiumInjectorTy["reload"]): void {
let runtime = ((!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
      : !!(browser && (browser as typeof chrome).runtime && (browser as typeof chrome).runtime.connect)
    ) ? browser as typeof chrome : chrome).runtime;
const curEl = document.currentScript as HTMLScriptElement, scriptSrc = curEl.src, i0 = scriptSrc.indexOf("://") + 3,
onIdle = Build.MinCVer < BrowserVer.MinEnsured$requestIdleCallback && Build.BTypes & BrowserType.Chrome
    || Build.BTypes & BrowserType.Edge
  ? window.requestIdleCallback as Exclude<Window["requestIdleCallback"], Element | Window | HTMLCollection>
  : requestIdleCallback;
let tick = 1, extID = scriptSrc.slice(i0, scriptSrc.indexOf("/", i0));
if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && extID.indexOf("-") > 0) {
  extID = curEl.dataset.vimiumId || BuildStr.FirefoxID;
}
extID = curEl.dataset.extensionId || extID;
VimiumInjector.id = extID;
function handler(this: void, res: ExternalMsgs[kFgReq.inject]["res"] | undefined | false): void {
  type LastError = chrome.runtime.LastError;
  let str: string | undefined, noBackend: boolean, err = runtime.lastError as void | LastError;
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
      setTimeout(call, 200 * tick);
      tick++;
      noBackend = true;
    }
    if (!noBackend) {
      str = str || ` (${tick} retries).`;
      const colorRed = "color:red", colorAuto = "color:auto";
      console.log("%cVimium C%c: %cfail%c to inject into %c%s%c %s"
        , colorRed, colorAuto, colorRed, colorAuto, "color:#0c85e9"
        , host, colorAuto, str);
      oldCallback && (_old as Ensure<VimiumInjectorTy, "callback">).callback(-1, str);
    }
  }
  if (_old && typeof _old.destroy === "function") {
    _old.destroy(true);
  }

  const _new = VimiumInjector = {
    id: extID,
    alive: 0,
    host: !(Build.BTypes & ~BrowserType.Chrome) ? extID : res ? res.host : "",
    version: res ? res.version : "",
    cache: null,
    clickable: oldClickable,
    reload: injectorBuilder(scriptSrc),
    checkIfEnabled: null as never,
    $h: res ? res.h : "",
    $m (task): void { VimiumInjector && VimiumInjector.$r(task.t); },
    $r (): void { /* empty */ },
    $p: null,
    getCommandCount: null as never,
    callback: oldCallback || null,
    destroy: null
  };
  const docEl = document.documentElement;
  if (!res || !(docEl instanceof HTMLHtmlElement)) {
    return err as void;
  }
  const insertAfter = document.contains(curEl) ? curEl : (document.head || docEl).lastChild as Node
    , insertBefore = insertAfter.nextSibling
    , parentElement = insertAfter.parentElement as Element;
  let scripts: HTMLScriptElement[] = [];
  for (const i of res.s as NonNullable<typeof res.s>) {
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
  oldCallback && (_new as Ensure<VimiumInjectorTy, "callback">).callback(0, "loading");
}
function call(): void {
  runtime.sendMessage(extID, <ExternalMsgs[kFgReq.inject]["req"]> {
    handler: kFgReq.inject, scripts: true
  }, handler);
}
function start(): void {
  removeEventListener("DOMContentLoaded", start);
  (Build.MinCVer >= BrowserVer.MinEnsured$requestIdleCallback || !(Build.BTypes & BrowserType.Chrome))
    && !(Build.BTypes & BrowserType.Edge) || onIdle
  ? (onIdle as Exclude<typeof onIdle, null | undefined>)(function (): void {
    (onIdle as Exclude<typeof onIdle, null | undefined>)(function (): void { setTimeout(call, 0); }, {timeout: 67});
  }, {timeout: 330}) : setTimeout(call, 67);
}
if (document.readyState !== "loading") {
  start();
} else {
  addEventListener("DOMContentLoaded", start, true);
}
})(1, function (scriptSrc): VimiumInjectorTy["reload"] {
  return function (async): void {
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
      if (!docEl) { return; }
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = false;
      script.src = scriptSrc;
      console.log("%cVimium C%c begins to reload%s."
        , "color:red", "color:auto"
        , async === InjectorTask.reload ? " because it has been updated." : "");
      (document.head || document.body || docEl).appendChild(script);
    }
    async ? setTimeout(doReload, 200) : doReload();
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
      || window.WeakSet ? new (WeakSet as WeakSetConstructor)<Element>() : {
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
