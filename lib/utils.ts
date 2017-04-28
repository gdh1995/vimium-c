if (!String.prototype.startsWith) {
String.prototype.startsWith = function(this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
String.prototype.endsWith || (String.prototype.endsWith = function(this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
}
var VUtils = {
  evalIfOK (this: void, url: string): boolean {
    if (url.substring(0, 11).toLowerCase() !== "javascript:") {
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
  execCommand (this: void, parent: object, command: string, a: number, b: object | null): void {
    let keys = command.split('.'), i: number, len: number;
    for (i = 0, len = keys.length - 1; i < len; i++) {
      parent = (parent as any)[keys[i]];
    }
    return (parent as any)[keys[i]](a, Object.setPrototypeOf(b || {}, null));
  },
  decodeURL (this: void, url: string): string {
    try { url = decodeURI(url); } catch (e) {}
    return url;
  },
  hasUpperCase (this: void, s: string) { return s.toLowerCase() !== s; },
  Prevent (this: void, event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, VHandler = {
  stack: [] as Array<[(event: HandlerNS.Event) => HandlerResult, any]>,
  push<T extends object> (func: HandlerNS.Handler<T>, env: T): number {
    return this.stack.push([func, env]);
  },
  bubbleEvent (event: HandlerNS.Event): HandlerResult {
    for (let ref = this.stack, i = ref.length; 0 <= --i; ) {
      const item = ref[i],
      result = item[0].call(item[1], event);
      if (result !== HandlerResult.Nothing) {
        return result;
      }
    }
    return HandlerResult.Default;
  },
  remove (env: object): void {
    let ref = this.stack, i = ref.length;
    while (0 <= --i) {
      if (ref[i][1] === env) {
        ref.splice(i, 1);
        break;
      }
    }
  }
};
