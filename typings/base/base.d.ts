type BOOL = 0 | 1;
type _IfMixOr<T, R> = string extends T ? string | R : number extends T ? number | R : boolean extends T ? true | R : T
type IfTrueOr<T, R> = T extends false | 0 | "" | null | undefined | void ? R : _IfMixOr<T, R>

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
type MayHasUndefined<T> = { [P in keyof T]: T[P] | undefined }
type EnsureExisting<T> = MayHasUndefined<{ [P in keyof T]-?: T[P] }>
type PickIn<T, K extends string> = Pick<T, K & keyof T>

type PartialOf<T, Keys extends keyof T> = { [P in Keys]?: T[P]; };
type PartialOrEnsured<T, EnsuredKeys extends keyof T> = {
  [P in EnsuredKeys]: T[P];
} & PartialOf<T, Exclude<keyof T, EnsuredKeys>>
type WithEnsured<T, EnsuredKeys extends keyof T> = { [P in EnsuredKeys]-?: NonNullable<T[P]>; } & Omit<T, EnsuredKeys>
type WithoutUndef<T, EnsuredKeys extends keyof T> = {
    [P in EnsuredKeys]-?: Exclude<T[P], undefined> } & Omit<T, EnsuredKeys>

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
    character = 0, word = 1, lineBoundary = 3, line = 4, sentence = 5, paragraphboundary = 6, paragraph = 7,
    documentBoundary = 8,
  }
}
type GranularityNames = readonly ["character", "word", /** VimG.vimWord */ "", "lineboundary", "line"
    , "sentence", "paragraphboundary", "paragraph", "documentboundary"]
interface Selection {
  modify(alert: "extend" | "move", direction: "forward" | "backward",
         granularity: GranularityNames[VisualModeNS.kG]): void | 1;
}
interface AllowToString { toString(): string }
interface ElementWithToStr extends Element, AllowToString {}
interface SelWithToStr extends Selection, AllowToString {}
interface Range extends AllowToString {}
interface Function extends AllowToString {}

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

interface HTMLElement { inert: boolean }

interface HTMLAnchorElement { className: string }
interface HTMLAreaElement { className: string }
interface HTMLEditableELement {
  setRangeText(replacement: string): void
  setRangeText(replacement: string, start: number | null, end: number | null, selectMode?: string): void
}
interface HTMLInputElement extends HTMLEditableELement {
  className: string
  showPicker? (): void
}
interface HTMLSelectElement extends HTMLEditableELement {
  showPicker? (): void
}
interface HTMLTextAreaElement extends HTMLEditableELement {}
interface HTMLSummaryElement extends SafeHTMLElement { localName: "summary" }
interface HTMLLabelableElement extends SafeHTMLElement {
  localName: "button" | "input" | "meter" | "output" | "progress" | "select" | "textarea"
}

declare var Response: { new (blob: Blob): Response }

interface Performance { timeOrigin?: number }

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
  interface UpdateProperties {
    autoDiscardable?: boolean
  }
  export function group (options: { tabIds: number | number[], groupId?: number, createProperties?: {
      windowId?: number } }): Promise<number>
  export function ungroup (tabIds: number | number[], callback?: () => void): void
}

declare namespace chrome.tabGroups {
  interface TabGroup {
    id: number
    collapsed: boolean
    color: "grey" | "blue" | "red"
    title?: string
    windowId: number
  }
  export function update (groupId: number, properties: PartialOf<TabGroup, "collapsed" | "color" | "title">
      ): Promise<TabGroup | undefined>
  export function query (queryInfo: PartialOf<TabGroup, "collapsed" | "color" | "title" | "windowId">
      ): Promise<TabGroup | undefined>
  export function move (groupId: number, prop: {index: number, windowId?: number}, callback: (_: unknown) => void): void
}

declare namespace chrome.scripting {
  interface ScriptInjection<Args extends (string | number | boolean | null)[], Res> {
    args?: Args // C92+
    files?: string[]
    injectImmediately?: boolean // C102+
    target?: {
      allFrames?: boolean
      frameIds?: number[]
      tabId: number
    }
    world?: "ISOLATED" | "MAIN" // "ISOLATED" is since C95+
    func?: (...args: Args) => Res // C92+
  }
  interface RegisteredContentScript {
    allFrames?: boolean
    css?: string[]
    excludeMatches?: string[]
    id: string
    js?: string[] /// files
    matches: string[]
    persistAcrossSessions?: boolean // default to true
    runAt?: "document_start" | "document_end" | "document_idle"
    world?: "ISOLATED" | "MAIN"
  }
  export function executeScript<Args extends (string | number | boolean | null)[], Res>(
      injection: ScriptInjection<Args, Res>, callback?: (results: {frameId: number, result: Res}[]) => void): 1
  export function registerContentScripts(scripts: RegisteredContentScript[]): Promise<void>
}

declare namespace chrome.search {
  export function query(queryInfo: { disposition?: "CURRENT_TAB" | "NEW_TAB" | "NEW_WINDOW", text: string }): 1;
  export function search(queryInfo: { query: string, tabId?: number }): 1;
}

declare namespace chrome.storage {
  var session: LocalStorageArea & {
    setAccessLevel (level: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS"): Promise<void>
    get <K extends string> (field: K | K[]): Promise<Record<K, unknown>>
  }
}

declare namespace chrome.bookmarks {
  export function create(bookmark: BookmarkCreateArg, callback?: (result: BookmarkTreeNode) => void): 1;
}

declare namespace chrome.clipboard {
  export function setImageData(data: ArrayBuffer, format: "jpeg" | "png"): Promise<void>
}
declare namespace chrome.extension {
  export const getBackgroundPage: (() => Window | null) | undefined
}
declare namespace chrome.dom {
  export const openOrClosedShadowRoot: ((element: HTMLElement) => ShadowRoot | null) | undefined
}
declare namespace chrome.runtime {
  interface BrowserInfo {
    name: string
    version: string
  }
  interface Manifest {
    host_permissions: chrome.permissions.kPermission[]
    optional_host_permissions: chrome.permissions.kPermission[]
  }
  interface MessageSender {
    documentLifecycle?: "prerender" | "active" | "cached" | "pending_deletion"
  }
  export function getBrowserInfo(exArg?: FakeArg): Promise<BrowserInfo>
  export const getFrameId: ((frame: Window | HTMLIFrameElement | HTMLFrameElement) => number) | undefined
}

declare namespace chrome.offscreen {
  export type kReason = "CLIPBOARD" | "MATCH_MEDIA" | "BLOBS"
  export const Reason: {
    BLOBS: "BLOBS",
    CLIPBOARD: "CLIPBOARD",
    MATCH_MEDIA?: "MATCH_MEDIA",
  }
  export function createDocument(args: { reasons: kReason[], url: string, justification: string }, cb: () => void): void
  export function closeDocument(callback: (_fake: FakeArg) => void): void
}

declare module chrome.downloads {
  export interface DownloadOptions {
    url: string
    filename?: string
    headers?: readonly { name: string, value: string }[]
    incognito?: boolean
  }
  export function setShelfEnabled(enable: boolean, _exArg?: FakeArg): void
  export const download: {
    (opts: DownloadOptions, cb: () => void): void | 1
    (opts: DownloadOptions): Promise<string>
  } | undefined
}

declare module chrome.permissions {
  export type kPermission = "bookmarks" | "downloads" | "downloads.shelf" | "history"
      | "chrome://new-tab-page/*" | "chrome://newtab/*" | "chrome://*/*"
      | "clipboardRead" | "contentSettings" | "notifications" | "cookies"
  export interface Request { origins?: kPermission[]; permissions?: kPermission[] }
  export function contains(query: Request, callback: (result: boolean) => void): void
  export function contains(query: Request): Promise<boolean>
  export function remove(query: Request, callback: (result: boolean) => void): void
  export function request(query: Request, callback: (result: boolean) => void): void
  export const onAdded: chrome.events.Event<(changes: Request, _fake: FakeArg) => void>
  export const onRemoved: chrome.events.Event<(changes: Request, _fake: FakeArg) => void>
}

interface Element {
  after? (...nodes: (Element | Text | string)[]): void
  before? (...nodes: (Element | Text | string)[]): void
  role?: string | null
  ariaLabel?: string | null
  ariaSelected?: boolean | null
  ariaMultiLine?: boolean | null
  ariaDisabled?: boolean | string | null
  ariaHasPopup?: string | null
  ariaHidden?: string | null
  ariaReadOnly?: string | null
}
interface FocusOptions {
  preventScroll?: boolean
}
interface HTMLElement {
  focus (options?: FocusOptions): void
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
interface HTMLSelectElement { localName: "select" }
interface HTMLElementTagNameMap {
  [localName: `${string}-${string}`]: HTMLElement
  [localName: `${string}_${string}`]: HTMLUnknownElement
}

interface ObjectConstructor {
  values <T extends object> (target: T): Array<T[keyof T]>
  entries? (object: object): [property: string, value: unknown][]
  getOwnPropertySymbols? (o: object): symbol[]
  getOwnPropertyDescriptor (o: any, propertyKey: symbol): PropertyDescriptor | undefined
  getOwnPropertyDescriptors? (o: object): PropertyDescriptorMap
  hasOwn? (object: object, prop: string): boolean
  hasOwn? <T extends object> (object: object, prop: string): prop is (keyof T) & string
}

interface NavigatorID {
  readonly appCodeName: string;
  readonly appName: string;
  /** @deprecated */ readonly appVersion?: string;
  /** @deprecated */ readonly platform?: string;
  readonly product: string;
  readonly productSub: string;
  /** @deprecated */ readonly userAgent?: string;
  readonly vendor: string;
  readonly vendorSub: string;
}

interface UABrandInfo { brand: string, version: string }
interface Navigator {
  scheduling?: {
    isInputPending (options?: { includeContinuous?: boolean }): boolean // options must be an cls intance on C84 if exp
    isFramePending? (options?: {}): boolean
  }
  userAgentData?: {
    brands: UABrandInfo[]
    uaList?: UABrandInfo[]
    mobile: boolean
    platform: string
  }
  permissions?: { // now is only useful on Chrome; query::state is since C44
    query (permissionDescriptor: { name: kNavPermissionName }): Promise<{ state: kNavPermissionState }>
  }
}
type kNavPermissionName = "clipboard-read" | "clipboard-write"
type kNavPermissionState = "granted" | "denied" | "prompt"

interface URLPatternDict {
  hash: string
  hostname: string
  password?: string
  pathname: string
  port: string
  protocol: string
  search: string
  username?: string
}
interface URLPattern extends URLPatternDict {
  exec (url: string): URLPatternResult
  test (url: string): boolean
}
interface URLPatternResult {}
declare var URLPattern: {
  new (template: string, base: string, options?: { ignoreCase?: boolean }): URLPattern // tested on Chrome 110
  new (template: string | URLPatternDict): URLPattern
} | undefined

declare module crypto {
  const getRandomValues: (buffer: Uint8Array) => unknown
}

interface PopoverElement extends SafeHTMLElement {
  popover: null | "auto" | "manual"
  hidePopover (): void
  showPopover (): void
  togglePopover (forced?: boolean): void
}

declare const enum Instruction { next = 0, return = 2, /** aka. "goto" */ break = 3, yield = 4 }

interface Reflect {
  apply<F extends Function>(target: F
      , thisArgument: ThisParameterType<F>, argumentList: Parameters<F> | IArguments): ReturnType<F>
  apply (target: Function, thisArgument: unknown, argumentList: unknown[]): unknown
  construct (target: new (...args: unknown[]) => object, argumentList: unknown[], newTarget?: object): object
}
declare var Reflect: Reflect | undefined

declare var InstallTrigger: object | undefined, MathMLElement: object | undefined, safari: object | null | undefined

interface CSS { escape? (value: string): string }
interface CSSStyleDeclaration { colorScheme?: string }

interface KeyboardEventInit { keyCode?: number; which?: number }

type GlobalFetch = (input: string, init?: Partial<Request & {signal: object}>) => Promise<Response>
declare var queueMicrotask: (callback: (this: void) => void) => void

interface HTMLImageElement { referrerpolicy?: string }
interface HTMLFrameElement { sandbox?: DOMTokenList }
