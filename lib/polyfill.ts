/// <reference no-default-lib="true"/>
/// <reference path="../types/base/index.d.ts" />

type primitiveObject = boolean | number | string;
type primitive = primitiveObject | null | undefined;
type ObjectCoercible = primitiveObject | {
    toString: () => primitive,
  } | {
    valueOf: () => primitive,
  };
type anyNotSymbol = ObjectCoercible | null | undefined;
interface String {
  endsWith(this: string, searchString: string, pos?: number | undefined): boolean;
  endsWith(this: ObjectCoercible, searchString?: anyNotSymbol, pos?: anyNotSymbol): boolean;
  startsWith(this: string, searchString: string, pos?: number | undefined): boolean;
  startsWith(this: ObjectCoercible, searchString?: anyNotSymbol, pos?: anyNotSymbol): boolean;
}

(function (): void {
  const symMatch = typeof Symbol === "function" && Symbol.match || null;

  "".startsWith || (
  String.prototype.startsWith = function startsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString);
    if (err !== null) { throw new TypeError(err.replace("${func}", "startsWith")); }
    let a = "" + this, b = "" + searchString, c = +arguments[1];
    a = String(this), b = String(searchString);
    c = c > 0 ? Math.min(c | 0, a.length) : 0;
    return a.lastIndexOf(b, c) === c;
  });

  "".endsWith || (
  String.prototype.endsWith = function endsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString);
    if (err !== null) { throw new TypeError(err.replace("${func}", "endsWith")); }
    let a = "" + this, b = "" + searchString, p: any = arguments[1], c = +p, u: undefined;
    a = String(this), b = String(searchString);
    c = (p === u ? a.length : c > 0 ? Math.min(c | 0, a.length) : 0) - b.length;
    return c >= 0 && a.indexOf(b, c) === c;
  });

  function check(a: any, b: any): null | string {
    /** note: should never call `valueOf` or `toString` on a / b */
    if (a == null) { return "String.prototype.${func} called on null or undefined"; }
    if (!b) { return null; }
    let f: any, u: undefined, i = symMatch && (f = b[symMatch]) !== u ? f : b instanceof RegExp;
    return i ? "First argument to String.prototype.${func} must not be a regular expression" : null;
  }
})();
