if (!"".startsWith) {
String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
"".endsWith || (String.prototype.endsWith = function(this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
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
    const end = str.lastIndexOf('#') + 1 || str.length;
    str = str.substring(str.lastIndexOf("/", str.lastIndexOf('?') + 1 || end), end);
    return this._imageUrlRe.test(str);
  },
  safer_<T extends object> (this: void, opt: T): T & SafeObject { return Object.setPrototypeOf(opt, null); },
  decodeURL_ (this: void, url: string, decode?: (this: void, url: string) => string): string {
    try { url = (decode || decodeURI)(url); } catch (e) {}
    return url;
  },
  hasUpperCase_ (this: void, s: string): boolean { return s.toLowerCase() !== s; },
  /**
   * Handler section
   */
  Stop_ (this: void, event: Event): void { event.stopImmediatePropagation(); },
  prevent_ (event: Event): void { event.preventDefault(); this.Stop_(event); },
  suppressAll_ (target: EventTarget, name: string, disable?: boolean): void {
    (disable ? removeEventListener : addEventListener).call(target, name, this.Stop_,
      {passive: true, capture: true} as EventListenerOptions | boolean as boolean);
  },
  _stack: [] as { func: (event: HandlerNS.Event) => HandlerResult; env: object; }[],
  push_<T extends object> (func: HandlerNS.Handler<T>, env: T): number {
    return this._stack.push({ func, env });
  },
  bubbleEvent_ (event: HandlerNS.Event): HandlerResult {
    for (let ref = this._stack, i = ref.length; 0 <= --i; ) {
      const item = ref[i],
      result = item.func.call(item.env, event);
      if (result !== HandlerResult.Nothing) {
        return result;
      }
    }
    return HandlerResult.Default;
  },
  cache_: null as never as SettingsNS.FrontendSettingCache,
  remove_ (env: object): void {
    for (let ref = this._stack, i = ref.length; 0 <= --i; ) {
      if (ref[i].env === env) {
        i === ref.length - 1 ? ref.length-- : ref.splice(i, 1);
        break;
      }
    }
  }
};
