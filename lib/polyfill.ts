type ObjectCoercible = Object;
type anyNotSymbol = any;
interface String {
  endsWith(searchString: string, position?: number | undefined): boolean;
  endsWith(this: ObjectCoercible, searchString?: anyNotSymbol, position?: anyNotSymbol): boolean;
  startsWith(searchString: string, position?: number | undefined): boolean;
  startsWith(this: ObjectCoercible, searchString?: anyNotSymbol, position?: anyNotSymbol): boolean;
}

(function (): void {
  if (String.prototype.startsWith) { return; }
  String.prototype.startsWith = function startsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    let err = check(this, searchString);
    if (err !== null) { throw new TypeError(err("startsWith")); }
    let a = "" + this, b = "" + searchString, c = +arguments[1];
    c = c > 0 ? Math.min(c, a.length) | 0 : 0;
    return a.lastIndexOf(b, c) === c;
  };

  if (String.prototype.endsWith) { return; }
  String.prototype.endsWith = function endsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    let err = check(this, searchString);
    if (err !== null) { throw new TypeError(err("startsWith")); }
    let a = "" + this, b = "" + searchString, p: any = arguments[1], c = +p, l = a.length, u: undefined;
    c = (p === u ? l : c > 0 ? Math.min(c, l) | 0 : 0) - b.length;
    return c >= 0 && a.indexOf(b, c) === c;
  };

  function check(a: any, b: any): null | ((name: string) => string) {
    if (a == null) { return errNullThis; }
    if (!b) { return null; }
    let i: any, f: any, u: undefined;
    i = typeof Symbol === "function" && Symbol.match && (f = b[Symbol.match]) !== u ? f : b instanceof RegExp;
    return i ? errSearchRegExp : null;
  }

  function errNullThis(name: string): string {
    return `String.prototype.${name} called on null or undefined`;
  }

  function errSearchRegExp(name: string): string {
    return `First argument to String.prototype.${name} must not be a regular expression`;
  }
})();
