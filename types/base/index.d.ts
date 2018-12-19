/// <reference path="es.d.ts" />
/// <reference path="lib.dom.d.ts" />
/// <reference path="chrome.d.ts" />
/// <reference path="base.d.ts" />

type Exclude<T, U> = T extends U ? never : T;  // Remove types from T that are assignable to U
type Extract<T, U> = T extends U ? T : never;  // Remove types from T that are not assignable to U
type Writeable<T> = { -readonly [P in keyof T]-?: T[P] };
type NonNullable<T> = Exclude<T, null | undefined>;  // Remove null and undefined from T
type TypeName<T> =
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
type Unpacked<T> =
    T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
    T extends Promise<infer U> ? U :
    T;
