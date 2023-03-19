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
type PromiseOr<T> = T | Promise<T>
type Unpacked<T> =
    T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
    T extends Promise<infer U> ? U :
    T;

// not write `{ [k extends Exclude<...>]: ... }` to avoid losing property tracking
type Omit<T, K extends keyof T> = T extends object ? Pick<T, Exclude<keyof T, K>> : never

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

interface FinalizationRegistry<T> {
    /**
     * Registers an object with the registry.
     * @param target The target object to register.
     * @param heldValue The value to pass to the finalizer for this object. This cannot be the
     * target object.
     * @param unregisterToken The token to pass to the unregister method to unregister the target
     * object. If provided (and not undefined), this must be an object. If not provided, the target
     * cannot be unregistered.
     */
    register(target: object, heldValue: T, unregisterToken?: object): void;

    /**
     * Unregisters an object from the registry.
     * @param unregisterToken The token that was used as the unregisterToken argument when calling
     * register to register the target object.
     */
    unregister(unregisterToken: object): void;
}

interface FinalizationRegistryConstructor {
    readonly prototype: FinalizationRegistry<any>;

    /**
     * Creates a finalization registry with an associated cleanup callback
     * @param cleanupCallback The callback to call after an object in the registry has been reclaimed.
     */
    new<T>(cleanupCallback: (heldValue: T) => void): FinalizationRegistry<T>;
}

declare var FinalizationRegistry: FinalizationRegistryConstructor;

type ReplaceStrOnce <A extends string, S extends string, T extends string>
    = string extends S ? string : string extends A ? string : A extends `${infer x}${S}${infer y}` ? `${x}${T}${y}` : A
type ReplaceStrAll <A extends string, S extends string, T extends string>
    = string extends S ? string : string extends A ? string
      : A extends `${infer x}${S}${infer y}` ? ReplaceStrAll<`${x}${T}${y}`, S, T> : A
type Lowercase<S extends string> = intrinsic;
type Uppercase<S extends string> = intrinsic;
interface String {
  replace <Self extends string, S extends string, T extends string> (
      this: Self, searchValue: RegExpG & { source: S }, replaceValue: T): ReplaceStrAll<Self, S , T>
  replace <Self extends string, S extends string, T extends string> (
      this: Self, searchValue: S, replaceValue: T
    ): T extends `${"" | "$&"}${number}` ? string : string extends T ? string | symbol : ReplaceStrOnce<Self, S , T>
  replace(searchValue: RegExpSearchable<5>, replacer: (this: void, substring: string,
      a: string, b: string, c: string, d: string, e: string, index: number, source: string
    ) => string): string
  toLowerCase <Self extends string> (this: Self): string extends Self ? string : `${Lowercase<Self>}`
  toUpperCase <Self extends string> (this: Self): string extends Self ? string : `${Uppercase<Self>}`
}

type NormalizeKeywords<K extends string> = K extends `${infer x}-${infer y}`
    ? `${Lowercase<x>}${NormalizeKeywords<y>}` : Lowercase<K>

type DeepKeys<T> = T extends [infer T1, ...infer T2] ? DeepKeys<T1> | DeepKeys<T2>
    : T extends { [keys in infer K]: infer V } ? K & string | DeepKeys<V> : never
type StringWithOneEnd<A extends string, S extends string>
    = string extends S ? never : string extends A ? never : A extends `${string}${S}` | `${S}${string}` ? A : never
