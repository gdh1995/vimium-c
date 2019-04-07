interface ElementWithClickable {
  vimiumHasOnclick?: boolean;
}
var VUtils = {
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
    str = str.substring(str.lastIndexOf("/", str.lastIndexOf("?") + 1 || end), end);
    return this._imageUrlRe.test(str);
  },
  safer_<T extends object> (this: void, opt: T): T & SafeObject { return Object.setPrototypeOf(opt, null); },
  decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try { url = (decode || decodeURI)(url); } catch {}
    return url;
  },
  /**
   * Handler section
   */
  Stop_ (this: void, event: Event): void { event.stopImmediatePropagation(); },
  prevent_ (event: Event): void { event.preventDefault(); this.Stop_(event); },
  suppressAll_ (target: EventTarget, name: string, disable?: boolean): void {
    (disable ? removeEventListener : addEventListener).call(target, name, this.Stop_,
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
  /**
   * Miscellaneous section
   */
  clickable_: Build.MinCVer >= BrowserVer.MinEnsuredES6WeakMapAndWeakSet || !(Build.BTypes & BrowserType.Chrome)
      || window.WeakSet ? new WeakSet<Element>() : {
    add (element: Element): void { (element as ElementWithClickable).vimiumHasOnclick = true; },
    has (element: Element): boolean { return !!(element as ElementWithClickable).vimiumHasOnclick; }
  },
  cache_: null as never as SettingsNS.FrontendSettingCache
};
