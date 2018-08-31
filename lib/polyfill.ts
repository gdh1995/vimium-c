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
  const symMatch = typeof Symbol === "function" && Symbol.match || null,
  S = String, RE = RegExp, TE = TypeError;

  "".startsWith || (
  String.prototype.startsWith = function startsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString);
    if (err === true) { return !(this + "" + searchString); }
    if (err !== null) { throw new TE(err.replace("${func}", "startsWith")); }
    let a = S(this), b = S(searchString), c = +arguments[1];
    c = c > 0 ? c | 0 : 0;
    c > a.length && (c = a.length);
    return a.lastIndexOf(b, c) === c;
  });

  "".endsWith || (
  String.prototype.endsWith = function endsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString);
    if (err === true) { return !(this + "" + searchString); }
    if (err !== null) { throw new TE(err.replace("${func}", "endsWith")); }
    let a = S(this), b = S(searchString), p: any = arguments[1], l = a.length, u: undefined,
    c = (p === u ? l : (c = +p) > 0 ? c | 0 : 0) - b.length;
    c > l && (c = l);
    return c >= 0 && a.indexOf(b, c) === c;
  });

  function check(a: any, b: any): null | string | true {
    /** note: should never call `valueOf` or `toString` on a / b */
    if (a == null) { return "String.prototype.${func} called on null or undefined"; }
    if (!b) { return null; }
    if (typeof a === "symbol" || typeof b === "symbol") { return true; }
    let f: any, u: undefined, i = symMatch && (f = b[symMatch]) !== u ? f : b instanceof RE;
    return i ? "First argument to String.prototype.${func} must not be a regular expression" : null;
  }
})();
