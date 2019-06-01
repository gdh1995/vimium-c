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
type EnsureItemsNonNull<T> = { [P in keyof T]-?: NonNullable<T[P]> };
type EnsureNonNull<T> = EnsureItemsNonNull<NonNullable<T>>;
type Ensure<T, K extends keyof T> = { -readonly [P in K]-?: NonNullable<T[P]> };

type PartialOrEnsured<T, EnsuredKeys extends keyof T> = {
  [P in EnsuredKeys]: T[P];
} & {
  [P in Exclude<keyof T, EnsuredKeys>]?: T[P];
};

type TypedSafeEnum<Type> = {
  readonly [key in keyof Type]: 1;
} & SafeObject;
type PartialTypedSafeEnum<Type> = {
  readonly [key in keyof Type]?: 1;
} & SafeObject;
type MappedType<Type, NewValue> = {
  [key in keyof Type]: NewValue;
};

// type EmptyArray = never[];
declare const enum TimerType {
  _native = 0,
  fake = -1,
  noTimer = -2,
}
type SafeSetTimeout = (this: void, handler: (this: void) => void, timeout: number) => number;
declare function setTimeout (this: void
  , handler: (this: void, i: TimerType.fake | undefined) => void, timeout: number): number;
declare function setInterval(this: void, handler: (this: void, fake?: TimerType.fake) => void, interval: number): number;

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
  readonly Object: ObjectConstructor;
}

interface Selection {
  modify(alert: "extend" | "move", direction: "forward" | "backward",
         granularity: "character" | "word" | "sentence" | "line" | "paragraph" | "lineboundary" | "documentboundary" |
           "sentenceboundary" | "paragraphboundary"): void | 1;
}

interface EnsuredMountedElement extends Element {
    readonly firstElementChild: EnsuredMountedElement;
    readonly lastElementChild: EnsuredMountedElement;
    readonly parentNode: EnsuredMountedElement;
    readonly parentElement: EnsuredMountedElement;
}

interface EnsuredMountedHTMLElement extends HTMLElement {
  readonly firstElementChild: EnsuredMountedHTMLElement;
  readonly lastElementChild: EnsuredMountedHTMLElement;
  readonly parentNode: EnsuredMountedHTMLElement;
  readonly parentElement: EnsuredMountedHTMLElement;
  readonly nextElementSibling: EnsuredMountedHTMLElement;
}
