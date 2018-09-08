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
  jsRe: <RegExpI & RegExpOne> /^javascript:/i,
  _imageUrlRe: <RegExpI & RegExpOne> /\.(?:bmp|gif|ico|jpe?g|png|svg|tiff?|webp)\b/i,
  isImageUrl (str: string | null): boolean {
    if (!str || str[0] === "#" || str.length < 5 || str.startsWith("data:") || this.jsRe.test(str)) {
      return false;
    }
    const end = str.lastIndexOf('#') + 1 || str.length;
    str = str.substring(str.lastIndexOf("/", str.lastIndexOf('?') + 1 || end), end);
    return this._imageUrlRe.test(str);
  },
  safer<T extends object> (this: void, opt: T): T & SafeObject { return Object.setPrototypeOf(opt, null); },
  execCommand (parent: object, command: string, a: number, b: object | null): void {
    let keys = command.split('.'), i: number, len: number;
    for (i = 0, len = keys.length - 1; i < len; i++) {
      parent = (parent as any)[keys[i]];
    }
    return (parent as any)[keys[i]](a, b ? this.safer(b) : Object.create(null));
  },
  decodeURL (this: void, url: string): string {
    try { url = decodeURI(url); } catch (e) {}
    return url;
  },
  hasUpperCase (this: void, s: string): boolean { return s.toLowerCase() !== s; },
  /**
   * Handler section
   */
  Stop (this: void, event: Event): void { event.stopImmediatePropagation(); },
  prevent (event: Event): void { event.preventDefault(); this.Stop(event); },
  suppressAll (target: EventTarget, name: string, disable?: boolean): void {
    (disable ? removeEventListener : addEventListener).call(target, name, this.Stop, {passive: true, capture: true} as any);
  },
  _stack: [] as { func: (event: HandlerNS.Event) => HandlerResult, env: any}[],
  push<T extends object> (func: HandlerNS.Handler<T>, env: T): number {
    return this._stack.push({ func, env });
  },
  bubbleEvent (event: HandlerNS.Event): HandlerResult {
    for (let ref = this._stack, i = ref.length; 0 <= --i; ) {
      const item = ref[i],
      result = item.func.call(item.env, event);
      if (result !== HandlerResult.Nothing) {
        return result;
      }
    }
    return HandlerResult.Default;
  },
  remove (env: object): void {
    for (let ref = this._stack, i = ref.length; 0 <= --i; ) {
      if (ref[i].env === env) {
        i === ref.length - 1 ? ref.length-- : ref.splice(i, 1);
        break;
      }
    }
  }
};
