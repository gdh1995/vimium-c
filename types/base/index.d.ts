/// <reference path="es.d.ts" />
/// <reference path="lib.dom.d.ts" />
/// <reference path="chrome.d.ts" />
/// <reference path="base.d.ts" />

type Exclude<T, U> = T extends U ? never : T;  // Remove types from T that are assignable to U
type Extract<T, U> = T extends U ? T : never;  // Remove types from T that are not assignable to U
type Writable<T> = { -readonly [P in keyof T]-?: T[P] };
type NonNullable<T> = Exclude<T, null | undefined | void>;  // Remove null and undefined from T
type TypeName<T> =
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";
type Parameters<F extends Function> = F extends (...args: infer A) => any ? A : never;
type ThisParameter<F extends Function> = F extends (this: infer T, ...args: any) => any ? T : never;
type ConstructorParameters<T extends new (...args: any[]) => any> = T extends new (...args: infer P) => any ? P : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type InstanceType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer R ? R : any;
type Unpacked<T> =
    T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
    T extends Promise<infer U> ? U :
    T;

interface ThisType<T> {}

type Omit<T, K extends keyof T> = {
    [P in Exclude<keyof T, K>]: T[P];
};

type TypeToAssert<Parent, Child extends Parent, Key extends keyof Child, Others extends keyof Parent = never> =
    Key extends keyof Parent ? never :
    { readonly [P in Others]: unknown; } & { readonly [key in Key]?: Child[Key]; };

type UnionToIntersection<U> = (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never;
