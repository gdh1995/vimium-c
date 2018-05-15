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
  evalIfOK (url: string): boolean {
    if (!this.jsRe.test(url)) {
      return false;
    }
    ";".indexOf(url.substring(11).trim()) < 0 && setTimeout(function(): void {
      const script = document.createElementNS("http://www.w3.org/1999/xhtml", "script") as HTMLScriptElement;
      script.type = "text/javascript";
      script.textContent = VUtils.decodeURL(url).substring(11).trim();
      (document.documentElement as HTMLElement).appendChild(script).remove();
    }, 0);
    return true;
  },
  safer<T extends object> (this: void, opt?: T | null | undefined): T & SafeObject {
    return opt ? Object.setPrototypeOf(opt, null) : Object.create(null);
  },
  execCommand (parent: object, command: string, a: number, b: object | null): void {
    let keys = command.split('.'), i: number, len: number;
    for (i = 0, len = keys.length - 1; i < len; i++) {
      parent = (parent as any)[keys[i]];
    }
    return (parent as any)[keys[i]](a, this.safer(b));
  },
  decodeURL (this: void, url: string): string {
    try { url = decodeURI(url); } catch (e) {}
    return url;
  },
  hasUpperCase (this: void, s: string): boolean { return s.toLowerCase() !== s; },
  /**
   * Handler section
   */
  wrap (focus: (this: void, event: FocusEvent) => void, blur: (this: void, event: FocusEvent) => void): FocusListenerWrapper {
    var d = { focus, blur } as FocusListenerWrapper["inner"];
    function f(this: EventTarget, event: FocusEvent): void {
      if (d) { return d[event.type as "focus" | "blur"](event); }
      const r = this.removeEventListener.bind(this) as Element["removeEventListener"];
      r("focus", f, true); r("blur", f, true);
    }
    return { inner: d, outer: f, set (this: void, obj: FocusListenerWrapper["inner"]): void { d = obj; } };
  },
  Stop (this: void, event: Event): void { event.stopImmediatePropagation(); },
  prevent (event: Event): void { event.preventDefault(); return this.Stop(event); },
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
