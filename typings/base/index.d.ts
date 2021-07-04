/// <reference path="es.d.ts" />
/// <reference path="lib.dom.d.ts" />
/// <reference path="chrome.d.ts" />
/// <reference path="base.d.ts" />

type Exclude<T, U> = T extends U ? never : T;  // Remove types from T that are assignable to U
type Extract<T, U> = T extends U ? T : never;  // Remove types from T that are not assignable to U
type Writable<T> = { -readonly [P in keyof T]-?: T[P] };
type NonNullable<T> = T extends null | undefined | void ? never : T;  // Remove null and undefined from T
type TypeName<T> =
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";
type ToString<T> = T extends null ? "null" : T extends undefined ? "undefined" :
    T extends boolean ? T extends true ? "true" : "false" :
    T extends string ? string extends T ? string : T :
    T extends number ? number extends T ? string : `${T}` :
    unknown
type Parameters<F extends Function> = F extends (...args: infer A) => any ? A : never;
type ConstructorParameters<T extends new (...args: any[]) => any> = T extends new (...args: infer P) => any ? P : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type InstanceType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer R ? R : any;
type Unpacked<T> =
    T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
    T extends Promise<infer U> ? U :
    T;

// not write `{ [k extends Exclude<...>]: ... }` to avoid losing property tracking
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

type TypeToAssert<Parent, Child extends Parent, Key extends keyof Child, Others extends keyof Parent = never> =
    { readonly [P in Others]: unknown; } & { readonly [key in Key]?: Child[key]; };
type TypeToPick<Parent, Child extends Parent, Key extends keyof Child> =
    { readonly [key in Key]?: Child[key]; };

type UnionToIntersection<U> = (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never;

interface WeakRef<V extends object> { deref (): V | undefined }
interface WeakRefConstructor {
  new <V extends object = object>(entries: V): WeakRef<V>
  readonly prototype: WeakRef<object>
}
/** WeakRefConstructor | undefined */
declare var WeakRef: unknown

type ReplaceStrOnce <A extends string, S extends string, T extends string>
    = string extends S ? string : string extends A ? string : A extends `${infer x}${S}${infer y}` ? `${x}${T}${y}` : A
type ReplaceStrAll <A extends string, S extends string, T extends string>
    = string extends S ? string : string extends A ? string
      : A extends `${infer x}${S}${infer y}` ? ReplaceStrAll<`${x}${T}${y}`, S, T> : A
type Lowercase<S extends string> = intrinsic;
type Uppercase<S extends string> = intrinsic;
type StringIncluded<A extends string, S extends string>
    = string extends S ? string : string extends A ? string : A extends `${string}${S}${string}` ? A : never
type StringEndsWith<A extends string, S extends string>
    = string extends S ? string : string extends A ? string : A extends `${string}${S}` ? A : never
type StringSliced<A extends string, T extends string>
    = string extends T ? string : string extends A ? string : A extends `${string}${T}${string}` ? T
        : "__invalid__" | 42 | { _fake: 42 } | false
interface String {
  replace <Self extends string, S extends string, T extends string> (
     this: Self, searchValue: RegExpG & { source: S }, replaceValue: T): ReplaceStrAll<Self, S , T>
  replace <Self extends string, S extends string, T extends string> (
     this: Self, searchValue: S, replaceValue: T
     ): T extends `${"" | "$&"}${number}` ? string : string extends T ? string | symbol : ReplaceStrOnce<Self, S , T>
  toLowerCase <Self extends string> (this: Self): `${Lowercase<Self>}`
  toUpperCase <Self extends string> (this: Self): `${Uppercase<Self>}`
}

type NormalizeKeywords<K extends string> = K extends `${infer x}-${infer y}`
    ? `${Lowercase<x>}${NormalizeKeywords<y>}` : Lowercase<K>
