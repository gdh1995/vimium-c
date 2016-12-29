type primitiveObject = boolean | number | string;
type primitive = primitiveObject | null | undefined;
type ObjectCoercible = primitiveObject | {
  toString: () => primitive,
} | {
    valueOf: () => primitive,
  };
type anyNotSymbol = ObjectCoercible | null | undefined;
interface String {
  endsWith(searchString: string, position?: number | undefined): boolean;
  endsWith(this: ObjectCoercible, searchString?: anyNotSymbol, position?: anyNotSymbol): boolean;
  startsWith(searchString: string, position?: number | undefined): boolean;
  startsWith(this: ObjectCoercible, searchString?: anyNotSymbol, position?: anyNotSymbol): boolean;
}
declare var Symbol: {
  (description?: anyNotSymbol): symbol;
  readonly match: symbol;
};

(function (): void {
  if (String.prototype.startsWith) { return; }
  String.prototype.startsWith = function startsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    let err = check(this, searchString, "startsWith");
    if (err !== null) { throw new TypeError(err); }
    let a = "" + this, b = "" + searchString, c = +arguments[1];
    a = String(this), b = String(searchString);
    c = c > 0 ? Math.min(c | 0, a.length) : 0;
    return a.lastIndexOf(b, c) === c;
  };

  if (String.prototype.endsWith) { return; }
  String.prototype.endsWith = function endsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    let err = check(this, searchString, "endsWith");
    if (err !== null) { throw new TypeError(err); }
    let a = "" + this, b = "" + searchString, p: any = arguments[1], c = +p, u: undefined;
    a = String(this), b = String(searchString);
    c = (p === u ? a.length : c > 0 ? Math.min(c | 0, a.length) : 0) - b.length;
    return c >= 0 && a.indexOf(b, c) === c;
  };

  function check(a: any, b: any, func: string): null | string {
    if (a == null) { return `String.prototype.${func} called on null or undefined`; }
    if (!b) { return null; }
    let i: any, f: any, u: undefined;
    i = typeof Symbol === "function" && Symbol.match && (f = b[Symbol.match]) !== u ? f : b instanceof RegExp;
    return i ? `First argument to String.prototype.${func} must not be a regular expression` : null;
  }
})();
