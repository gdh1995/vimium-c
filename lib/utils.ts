interface ElementWithClickable { vimiumHasOnclick?: boolean; }
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6WeakMapAndWeakSet) {
  var WeakSet: WeakSetConstructor | undefined;
}
var VLib = {
  /**
   * tool function section
   */
  jsRe_: <RegExpI & RegExpOne> /^javascript:/i,
  _imageUrlRe: <RegExpI & RegExpOne> /\.(?:bmp|gif|icon?|jpe?g|png|svg|tiff?|webp)\b/i,
  isImageUrl_ (str: string | null): boolean {
    if (!str || str[0] === "#" || str.length < 5 || str.startsWith("data:") || this.jsRe_.test(str)) {
      return false;
    }
    const end = str.lastIndexOf("#") + 1 || str.length;
    // tslint:disable-next-line: ban-types
    str = (str as EnsureNonNull<String>).substring(str.lastIndexOf("/", str.lastIndexOf("?") + 1 || end), end);
    return this._imageUrlRe.test(str);
  },
  safer_: (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
      && !Object.setPrototypeOf ? function <T extends object> (obj: T): T & SafeObject {
        (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null)
    ) as (<T extends object> (opt: T) => T & SafeObject),
  decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try { url = (decode || decodeURI)(url); } catch {}
    return url;
  },
  /**
   * Handler section
   */
  Stop_ (this: void, event: Pick<Event, "stopImmediatePropagation">): void { event.stopImmediatePropagation(); },
  prevent_ (event: Pick<Event, "preventDefault" | "stopImmediatePropagation">): void {
    event.preventDefault(); this.Stop_(event);
  },
  suppressAll_ (this: void, target: EventTarget, name: string, disable?: boolean): void {
    (disable ? removeEventListener : addEventListener).call(target, name, VLib.Stop_,
      {passive: true, capture: true} as EventListenerOptions | boolean as boolean);
  },
  _keydownHandlers: [] as Array<{ func: (event: HandlerNS.Event) => HandlerResult; env: object; }>,
  push_<T extends object> (func: HandlerNS.Handler<T>, env: T): number {
    return this._keydownHandlers.push({ func, env });
  },
  bubbleEvent_ (event: HandlerNS.Event): HandlerResult {
    for (let ref = this._keydownHandlers, i = ref.length; 0 <= --i; ) {
      const item = ref[i],
      result = item.func.call(item.env, event);
      if (result !== HandlerResult.Nothing) {
        return result;
      }
    }
    return HandlerResult.Default;
  },
  remove_ (env: object): void {
    for (let ref = this._keydownHandlers, i = ref.length; 0 <= --i; ) {
      if (ref[i].env === env) {
        i === ref.length - 1 ? ref.length-- : ref.splice(i, 1);
        break;
      }
    }
  },
  /*
   * Miscellaneous section
   */
  clickable_: Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
      || WeakSet ? new (WeakSet as WeakSetConstructor)<Element>() as never : <Pick<WeakSet<Element>, "add" | "has">> {
    add (element: Element): void { (element as ElementWithClickable).vimiumHasOnclick = true; },
    has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumHasOnclick; }
  }
};
