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
type OnlyEnsureItemsNonNull<T> = { [P in keyof T]: NonNullable<T[P]> }; // for lang server to show comments
type EnsureNonNull<T> = EnsureItemsNonNull<NonNullable<T>>;
type Ensure<T, K extends keyof T> = { -readonly [P in K]-?: NonNullable<T[P]> };

type PartialOrEnsured<T, EnsuredKeys extends keyof T> = {
  [P in EnsuredKeys]: T[P];
} & {
  [P in Exclude<keyof T, EnsuredKeys>]?: T[P];
};

// this is to fix a bug of TypeScript ~3.5
type Generalized<T, K extends keyof T = keyof T> = { [k in K]: __GeneralizedValues<T, K>; };
type __GeneralizedValues<T, K> = K extends keyof T ? T[K] : never;

type PossibleKeys<T, V, K extends keyof T = keyof T> = K extends keyof T ? T[K] extends V ? K : never : never;

type TypedSafeEnum<Type> = {
  readonly [key in keyof Type]: 1;
} & SafeObject;
type PartialTypedSafeEnum<Type> = {
  readonly [key in keyof Type]?: 1;
} & SafeObject;
type MappedType<Type, NewValue> = {
  [key in keyof Type]: NewValue;
};

type SelectValueType<T> = {
  [k in keyof T]: T[k] extends [string, infer V] ? V : unknown;
};
type SelectNameType<T> = {
  [k in keyof T]: T[k] extends [infer FullK, any] ? FullK : T[k] extends string ? T[k] : never;
};
type SelectNVType<T extends { [k in K]: [string, any] }, K extends string = (keyof T) & string> = {
  [name in T[K][0]]: K extends keyof T ? T[K][0] extends name ? T[K][1] : never : never;
};
type SelectNameToKey<T extends { [k in K]: [string, any] }, K extends string = (keyof T) & string> = {
  [name in T[K][0]]: K extends keyof T ? T[K][0] extends name ? K : never : never;
}

// type EmptyArray = never[];
declare const enum TimerType {
  _native = 0,
  fake = -1,
  noTimer = 1,
}
type SafeSetTimeout = (this: void, handler: (this: void) => void, timeout: number) => number;
declare var setTimeout: SetTimeout, setInterval: SetInterval;
interface SetTimeout {
  (this: void, handler: (this: void, fake?: TimerType.fake) => void, timeout: number): number;
}
interface SetInterval {
  (this: void, handler: (this: void, fake?: TimerType.fake) => void, interval: number): number;
}

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

declare namespace VisualModeNS {
  const enum kG {
    character = 0, line = 1, lineBoundary = 2, paragraph = 3, sentence = 4, word = 6, documentBoundary = 7,
  }
}
type GranularityNames = readonly ["character", "line", "lineboundary", /* 3 */ "paragraph",
      "sentence", /** VimG.vimWord */ "", /* 6 */ "word",
      "documentboundary"]
interface Selection {
  modify(alert: "extend" | "move", direction: "forward" | "backward",
         granularity: Exclude<GranularityNames[number], "">): void | 1;
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
  readonly previousElementSibling: EnsuredMountedHTMLElement;
  readonly nextElementSibling: EnsuredMountedHTMLElement;
}
