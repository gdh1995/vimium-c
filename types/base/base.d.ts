type BOOL = 0 | 1;
interface Dict<T> {
  [key: string]: T | undefined;
}
type SafeObject = {
  readonly __proto__: never;
};
interface SafeDict<T> extends Dict<T>, SafeObject {}
interface ReadonlySafeDict<T> extends SafeDict<T> {
  readonly [key: string]: T | undefined;
}
interface SafeEnum extends ReadonlySafeDict<1> {}
interface EnsuredSafeDict<T> extends SafeDict<T> {
  [key: string]: T;
}

type TypedSafeEnum<Type> = {
  readonly [key in keyof Type]: 1;
} & SafeObject;
type MappedType<Type, NewValue> = {
  [key in keyof Type]: NewValue;
};

type NotReadonly<T> = {
  [key in keyof T]: T[key];
}

// type EmptyArray = never[];

declare function setInterval<T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setInterval<T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setInterval<T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
declare function setInterval(this: void, handler: (this: void, ) => void, timeout: number): number;
declare function setTimeout <T1, T2, T3>(this: void, handler: (this: void, a1: T1, a2: T2, a3: T3) => void,
  timeout: number, a1: T1, a2: T2, a3: T3): number;
declare function setTimeout <T1, T2>(this: void, handler: (this: void, a1: T1, a2: T2) => void,
  timeout: number, a1: T1, a2: T2): number;
declare function setTimeout <T1>(this: void, handler: (this: void, a1: T1) => void, timeout: number, a1: T1): number;
declare function setTimeout (this: void, handler: (this: void) => void, timeout: number): number;

interface String {
  endsWith(searchString: string): boolean;
  startsWith(searchString: string): boolean;
  trimLeft(): string;
  trimRight(): string;
}

interface Window {
  readonly Promise: PromiseConstructor;
  readonly Array: ArrayConstructor;
  readonly JSON: JSON;
}

interface Selection {
  modify(alert: "extend" | "move", direction: "forward" | "backward",
         granularity: "character" | "word" | "sentence" | "line" | "paragraph" | "lineboundary" | "documentboundary" |
           "sentenceboundary" | "paragraphboundary"): void | 1;
  extentOffset: number;
  baseOffset: number;
}

interface Range {
  anchorOffset: number;
  focusOffset: number;
}

interface EnsuredMountedElement extends Element {
    readonly firstElementChild: EnsuredMountedElement;
    readonly lastElementChild: EnsuredMountedElement;
    readonly parentNode: EnsuredMountedElement;
}
