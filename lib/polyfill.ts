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
  const symMatch = typeof Symbol === "function" && Symbol.match as symbol | string as "Symbol(Symbol.match)" || null,
  S = String, RE = RegExp, TE = TypeError;

  "".startsWith || (
  String.prototype.startsWith = function startsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString), a = this != null && err !== 1 ? S(this) : "";
    if (err === 1 || err === 2) { return !((err === 1 ? this : searchString) + ""); }
    if (err !== null) { throw new TE(err.replace("${func}", "startsWith")); }
    let b = S(searchString), c = +arguments[1];
    c = c > 0 ? c | 0 : 0;
    c > a.length && (c = a.length);
    return a.lastIndexOf(b, c) === c;
  });

  "".endsWith || (
  String.prototype.endsWith = function endsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString), a = this != null && err !== 1 ? S(this) : "";
    if (err === 1 || err === 2) { return !((err === 1 ? this : searchString) + ""); }
    if (err !== null) { throw new TE(err.replace("${func}", "endsWith")); }
    let b = S(searchString), p: primitive | object = arguments[1], l = a.length, u: undefined, c: number;
    c = (p === u ? l : (c = +<number | string>p) > 0 ? c | 0 : 0) - b.length;
    c > l && (c = l);
    return c >= 0 && a.indexOf(b, c) === c;
  });

  function check(a: primitive | object, b: primitive | object): null | string | 1 | 2 {
    /** note: should never call `valueOf` or `toString` on a / b */
    if (a == null) { return "String.prototype.${func} called on null or undefined"; }
    if (!b) { return null; }
    let t: 0 | 1 | 2 = typeof a === "symbol" ? 1 : typeof b === "symbol" ? 2 : 0;
    if (t) { return t; }
    interface PossibleTypeOfB {
      [key: string]: Function | primitive;
    }
    let f: Function | primitive, u: undefined, i = symMatch && (f = (b as PossibleTypeOfB)[symMatch]) !== u ? f : b instanceof RE;
    return i ? "First argument to String.prototype.${func} must not be a regular expression" : null;
  }
})();
