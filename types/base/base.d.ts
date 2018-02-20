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

// type EmptyArray = never[];

declare function setInterval(this: void, handler: (this: void) => void, timeout: number): number;
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
  readonly Object: ObjectConstructor;
}

type SelectionType = "Range" | "Caret" | "None";
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
