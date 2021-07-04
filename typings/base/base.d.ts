type BOOL = 0 | 1;
interface Function { readonly arguments: IArguments }
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
interface EnsuredDict<T> { [key: string]: T }
interface EnsuredSafeDict<T> extends EnsuredDict<T>, SafeObject {}

type EnsureItemsNonNull<T> = { [P in keyof T]-?: NonNullable<T[P]> };
type OnlyEnsureItemsNonNull<T> = { [P in keyof T]: NonNullable<T[P]> }; // for lang server to show comments
type EnsureNonNull<T> = EnsureItemsNonNull<NonNullable<T>>;
type Ensure<T, K extends keyof T> = { -readonly [P in K]-?: NonNullable<T[P]> };
type PickIn<T, K extends string> = Pick<T, K & keyof T>

type PartialOf<T, Keys extends keyof T> = { [P in Keys]?: T[P]; };
type PartialOrEnsured<T, EnsuredKeys extends keyof T> = {
  [P in EnsuredKeys]: T[P];
} & PartialOf<T, Exclude<keyof T, EnsuredKeys>>
type WithEnsured<T, EnsuredKeys extends keyof T> = { [P in EnsuredKeys]-?: NonNullable<T[P]>; } & Omit<T, EnsuredKeys>

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
type SelectNVType<T extends { [k in K]: [string, any] }, K extends keyof T = keyof T> = {
  [k in K as T[k][0]]: T[k][1]
};
type SelectNameToKey<T extends { [k in K]: [string, any] }, K extends keyof T = keyof T> = {
  [k in K as T[k][0]]: k
}

// type EmptyArray = never[];
declare const enum TimerType {
  _native = 0, fake = 9, noTimer = 1,
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
    character = 0, word = 1, lineBoundary = 3, line = 4, sentence = 5, paragraph = 6, documentBoundary = 7,
  }
}
type GranularityNames = readonly ["character", "word", /** VimG.vimWord */ "", "lineboundary", "line"
    , "sentence", "paragraph", "documentboundary"]
interface Selection {
  modify(alert: "extend" | "move", direction: "forward" | "backward",
         granularity: GranularityNames[VisualModeNS.kG]): void | 1;
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

interface HTMLEditableELement {
  setRangeText(replacement: string): void
  setRangeText(replacement: string, start: number | null, end: number | null, selectMode?: string): void
}

interface HTMLInputElement extends HTMLEditableELement {}
interface HTMLTextAreaElement extends HTMLEditableELement {}

declare var Response: { new (blob: Blob): Response }

declare namespace chrome.tabs {
  type GroupId = "firefox-default" | "unknown1" | "unknown2" | number
  interface Tab {
    groupId?: number
    cookieStoreId?: GroupId
  }
  interface CreateProperties {
    groupId?: Tab["groupId"]
    cookieStoreId?: GroupId
    openInReaderMode?: boolean
  }
  export function group (options: { tabIds: number | number[], groupId?: number }): Promise<object>
}

declare namespace chrome.bookmarks {
  export function create(bookmark: BookmarkCreateArg, callback?: (result: BookmarkTreeNode) => void): 1;
}

declare namespace chrome.clipboard {
  export function setImageData(data: ArrayBuffer, format: "png"): void
}

declare module chrome.downloads {
  export interface DownloadOptions {
    url: string
    filename?: string
    headers?: readonly { name: string, value: string }[]
    incognito?: boolean
  }
  export function setShelfEnabled(enable: boolean, _exArg?: FakeArg): void
  export const download: ((opts: DownloadOptions, cb?: () => void) => Promise<string>) | undefined
}

declare module chrome.permissions {
  export type kPermissions = "downloads" | "downloads.shelf"
      | "chrome://new-tab-page/*" | "chrome://newtab/*" | "chrome://*/*"
      | "clipboardRead" | "contentSettings" | "notifications" | "cookies"
  export interface Request { origins?: kPermissions[]; permissions?: kPermissions[] }
  export function contains(query: Request, callback: (result: boolean) => void): void
  export function contains(query: Request): Promise<boolean>
  export function remove(query: Request, callback: (result: boolean) => void): void
  export function request(query: Request, callback: (result: boolean) => void): void
  export const onAdded: chrome.events.Event<(changes: Request, _fake: FakeArg) => void>
  export const onRemoved: chrome.events.Event<(changes: Request, _fake: FakeArg) => void>
}

interface HTMLMediaElement {
  controls: boolean
  paused: boolean
  play(): void
  pause(): void
}
interface Element { mozRequestFullScreen(): void }
interface Document { mozCancelFullScreen(): void }
interface HTMLElementTagNameMap { "slot": HTMLSlotElement; "nav": HTMLElement }

interface Navigator {
  scheduling?: {
    isInputPending (options?: { includeContinuous?: boolean }): boolean // options must be an cls intance on C84 if exp
    isFramePending? (options?: {}): boolean
  }
}

declare module crypto {
  const getRandomValues: (buffer: Uint8Array) => unknown
}
