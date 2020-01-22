/// <reference no-default-lib="true"/>
/// <reference path="../types/base/es.d.ts" />

(function (): void {
  type primitiveObject = boolean | number | string;
  type primitive = primitiveObject | null | undefined;
  type ObjectCoercible = primitiveObject | {
      toString: () => primitive,
    } | {
      valueOf: () => primitive,
    };
  type anyNotSymbol = ObjectCoercible | null | undefined;
  interface StandardString {
    endsWith(this: string, searchString: string, pos?: number | undefined): boolean;
    endsWith(this: ObjectCoercible, searchString?: anyNotSymbol, pos?: anyNotSymbol): boolean;
    includes(this: string, searchString: string, pos?: number | undefined): boolean;
    includes(this: ObjectCoercible, searchString?: anyNotSymbol, pos?: anyNotSymbol): boolean;
    startsWith(this: string, searchString: string, pos?: number | undefined): boolean;
    startsWith(this: ObjectCoercible, searchString?: anyNotSymbol, pos?: anyNotSymbol): boolean;
  }

  const symMatch = typeof Symbol === "function" && typeof Symbol.match === "symbol" &&
                    Symbol.match as symbol | string | false as "Symbol(Symbol.match)" | false,
  S = String as StringConstructor & { readonly prototype: StandardString }, TE = TypeError,
  StringCls = S.prototype,
  toStr = Object.prototype.toString;

  "".startsWith || (
  StringCls.startsWith = function startsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString), a = this != null && err !== 1 ? S(this) : "";
    if (err !== 0) {
      if (err === 1 || err === 2) { return !((err < 2 ? this : searchString) + ""); }
      throw new TE(err.replace("${func}", "startsWith"));
    }
    let b = S(searchString), args = arguments, c = args.length > 1 ? +args[1] : 0;
    c = c > 0 ? c | 0 : 0;
    c > a.length && (c = a.length);
    return a.lastIndexOf(b, c) === c;
  });

  "".endsWith || (
  StringCls.endsWith = function endsWith(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString), a = this != null && err !== 1 ? S(this) : "";
    if (err !== 0) {
      if (err === 1 || err === 2) { return !((err < 2 ? this : searchString) + ""); }
      throw new TE(err.replace("${func}", "endsWith"));
    }
    let b = S(searchString), args = arguments, u: undefined, c: number
      , p: primitive | object = args.length > 1 ? args[1] : u, l = a.length;
    c = (p === u ? l : (c = +<number | string> p) > 0 ? c | 0 : 0) - b.length;
    c > l && (c = l);
    return c >= 0 && a.indexOf(b, c) === c;
  });

  "".includes || (
  StringCls.includes = function includes(this: ObjectCoercible, searchString: anyNotSymbol): boolean {
    const err = check(this, searchString), a = this != null && err !== 1 ? S(this) : "";
    if (err !== 0) {
      if (err === 1 || err === 2) { return !((err < 2 ? this : searchString) + ""); }
      throw new TE(err.replace("${func}", "includes"));
    }
    let b = S(searchString), args = arguments, c = args.length > 1 ? +args[1] : 0;
    c = c > 0 ? c | 0 : 0;
    c > a.length && (c = a.length);
    return a.indexOf(b, c) >= 0;
  });

  function check(a: primitive | object, b: primitive | object): 0 | string | 1 | 2 {
    /** note: should never call `valueOf` or `toString` on a / b */
    if (a == null) { return "String.prototype.${func} called on null or undefined"; }
    if (!b) { return 0; }
    let t: 0 | 1 | 2 = typeof a === "symbol" ? 1 : typeof b === "symbol" ? 2 : 0;
    if (t) { return t; }
    interface PossibleTypeOfB {
      [key: string]: ((this: string, re: RegExp) => boolean) | primitive;
    }
    let f: PossibleTypeOfB[string], u: undefined
      , i = symMatch && (f = (b as PossibleTypeOfB)[symMatch]) !== u ? f
          : toStr.call(b) === "[object RegExp]";
    return i ? "First argument to String.prototype.${func} must not be a regular expression" : 0;
  }
})();
