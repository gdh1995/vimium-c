import {
  CurCVer_, OnChrome, $, $$, nextTick_, pageLangs_, type TransTy, pageTrans_, post_, enableNextTick_, kReadyInfo,
  onDicts_, curPagePath_, setupPageOs_
} from "./async_bg"
import { kPgReq } from "../background/page_messages"
import type * as i18n_options from "../i18n/zh/options.json"

export type AllowedOptions = SettingsNS.PersistentSettings
export type PossibleOptionNames<T> = PossibleKeys<AllowedOptions, T>
type UniNumberKeys<T, K> = K extends keyof T ? T[K] extends number ? number extends T[K] ? K : never : never : never
export type UniversalNumberOptions = UniNumberKeys<AllowedOptions, keyof AllowedOptions>
interface BaseChecker<V extends AllowedOptions[keyof AllowedOptions]> {
  init_? (): any;
  check_ (value: V): V | Promise<V>
}
export type Checker<T extends keyof AllowedOptions> = BaseChecker<AllowedOptions[T]>
import type {
  NumberOption_, JSONOptionNames, JSONOption_, TextualizedOptionNames, TextOption_, BooleanOption_
} from "./options_defs"
type OptionType<T extends keyof AllowedOptions> = T extends "exclusionRules" ? ExclusionRulesOption_
    : AllowedOptions[T] extends 0 | 1 | 2 ? BooleanOption_<T>
    : T extends UniversalNumberOptions ? NumberOption_<T>
    : T extends JSONOptionNames ? JSONOption_<T>
    : T extends TextualizedOptionNames ? TextOption_<T>
    : AllowedOptions[T] extends boolean | null ? BooleanOption_<T>
    : never;
export interface KnownOptionsDataset extends KnownDataset {
  iT: string // title in i18n
  i: string // text in i18n
  for: "css-selector[:css-selectors]" // label's targets
  check: "check" // event name used in BooleanOption_
  map: string // json array of `[0|1|2, 0|1|2, (0|1|2)?]`, used in BooleanOption_
  allowNull: "true" | "1" // does allow null value, used in BooleanOption
  converter: "lower" | "upper" | "chars" | "lower chars" // converter names for string values
  model: string // enum of option types
  autoResize: keyof AllowedOptions // enum of option names
  delay: "" | "continue" | "event" // work type when delaying click events
  permission: "webNavigation" | "C76" | string // required permissions
  vimUrl: `vimium://${string}`
}
export declare const enum kExclusionChange { NONE = 0, pattern = 1, passKeys = 2, mismatches = 4, deleted = 8 }

const _globalDelegates: {
  [type: string]: { selector_: string | Node, handler_ (ev: Event): void, capture_: boolean | "on" }[] | null
} = {}

export const showI18n_ = (): void => {
    if (pageLangs_ === "en") { return }
    const lang1 = pageLangs_.split(",")[0]
    const langInput = navigator.language as string || lang1
    let el: HTMLElement | null = $("#keyMappings"), t: string | null | undefined = el && oTrans_("keyMappingsP")
    t && ((el as HTMLInputElement).placeholder = t)
    if (langInput && (!lang1.startsWith("zh") || langInput !== "zh-CN")) {
      for (el of $$("input[type=text], textarea")) {
        el.lang = langInput as ""
      }
    }
    for (el of $$("[data-i]")) {
      const i = (el.dataset as KnownOptionsDataset).i, isTitle = i.endsWith("-t")
      t = pageTrans_(isTitle ? i.slice(0, -2) : i)
      t != null && (isTitle ? el.title = t : el.textContent = t)
    }
    (document.documentElement as HTMLHtmlElement).lang = lang1 === "zh" ? "zh-CN" as "" : lang1.replace("_", "-") as ""
}

(window as unknown as any).__extends = function<Child, Super, Base> (
    child: (new <Args extends any[]> (...args: Args) => Child) & {
        prototype?: Super & { "constructor": new () => Child };
    }, parent: (new <Args extends any[]> (...args: Args) => Super) & {
        prototype: Base & { "constructor": new () => Super };
    }): void {
  interface Middle {
    prototype?: Base & { "constructor": new () => Super };
    new (): Super & { "constructor": new () => Child };
  }
  const __: Middle = function (this: Super & { "constructor": new () => Child }): void {
    this.constructor = child;
  } as {} as Middle;
  __.prototype = parent.prototype;
  child.prototype = new __();
}

export const debounce_ = function<T> (func: (this: T) => unknown
    , wait: number, bound_context: T, also_immediate: number
    ): (this: void) => void {
  let timeout = 0, timestamp: number;
  const later = function (): void {
    const last = Date.now() - timestamp; // safe for time changes
    if (last < wait - /* for resolution tolerance */ 4 && last >= 0) {
      timeout = setTimeout(later, wait - last);
      return;
    }
    timeout = 0;
    if (timestamp !== also_immediate) {
      func.call(bound_context)
    }
  };
  also_immediate = also_immediate ? 1 : 0;
  return function (): void {
    timestamp = Date.now(); // safe for time changes
    if (timeout) {
      if (also_immediate) {
        also_immediate = timestamp - 1
      }
      return
    }
    timeout = setTimeout(later, wait);
    if (also_immediate) {
      also_immediate = timestamp;
      func.call(bound_context)
    }
  };
} as <T> (func: (this: T) => void, wait: number, bound_context: T, also_immediate: BOOL) => (this: void) => void

export const didBindEvent_ = (ev: Event | string): void => {
  const type = typeof ev !== "string" ? ev.type : ev
  for (const delegate of _globalDelegates[type] || []) {
    for (const el of typeof delegate.selector_ === "string" ? $$(delegate.selector_) : [delegate.selector_]) {
      if (delegate.capture_ !== "on") {
        el.addEventListener(type, delegate.handler_, delegate.capture_)
      } else {
        (el as HTMLElement | Document)[("on" + type) as "onclick"] = delegate.handler_
      }
    }
  }
  _globalDelegates[type] = null
  removeEventListener(type, didBindEvent_, true)
}
export const delayBinding_ = (selector_: string | HTMLElement | Document
    , type: string, handler_: (ev: EventToPrevent) => void, capture_?: boolean | "on") => {
  let handlers = _globalDelegates[type]
  if (!handlers) {
    addEventListener(type, didBindEvent_, true)
    handlers = _globalDelegates[type] = []
  }
  handlers.push({ selector_, handler_, capture_: capture_ || false })
}

//#region async settings

import SettingsWithDefaults = SettingsNS.SettingsWithDefaults
import PersistentSettings = SettingsNS.PersistentSettings
type UpdateLock = [id: typeof _updateLock, count: number]
const _updateLock = "__locking"
let settingsCache_ = null as {
  [key in keyof SettingsWithDefaults]?: SettingsWithDefaults[key] | UpdateLock
} | Promise<void> | null

export const setupSettingsCache_ = (cache: Partial<SettingsNS.PersistentSettings>): void => { settingsCache_ = cache }
export const getSettingsCache_ = () => settingsCache_ as Partial<SettingsNS.PersistentSettings>

export const bgSettings_ = {
  platform_: "" as "win" | "linux" | "mac" | "unknown",
  defaults_: null as never as SettingsWithDefaults,
  resetCache_ (): void { settingsCache_ = null },
  preloadCache_ (this: void): Promise<void> {
    if (settingsCache_) { return settingsCache_ instanceof Promise ? settingsCache_ : Promise.resolve()  }
    bgSettings_.defaults_ || post_(kPgReq.settingsDefaults).then((res): void => {
      bgSettings_.defaults_ = res[0]
      Build.OS & (Build.OS - 1) && (setupPageOs_(res[1]))
      bgSettings_.platform_ = res[2] as typeof bgSettings_.platform_
      enableNextTick_(kReadyInfo.options)
    })
    return settingsCache_ = post_(kPgReq.settingsCache).then((res): void => { settingsCache_ = res })
  },
  get_ <T extends keyof SettingsWithDefaults> (key: T): SettingsWithDefaults[T] | Promise<SettingsWithDefaults[T]> {
    if (settingsCache_ == null) { void this.preloadCache_() }
    if (settingsCache_ instanceof Promise) {
      return settingsCache_.then(() => this.get_(key))
    }
    const cached = settingsCache_![key]
    if (!Build.NDEBUG && cached && cached instanceof Array && cached[0] === _updateLock) {
      throw new Error("unexpected bgSettings_.get_() when set_() is still waiting, with key = " + key)
    }
    return cached !== void 0 ? cached as SettingsWithDefaults[T] : this.defaults_[key]
  },
  set_ <T extends keyof PersistentSettings> (key: T, val: PersistentSettings[T] | null): Promise<void> {
    if (Build.NDEBUG) { /* empty */ }
    else if (settingsCache_ == null || settingsCache_ instanceof Promise) {
      throw new Error("invalid settingsCache_ when bgSettings_.set_() with key = " + key)
    } else {
      let lock = settingsCache_[key]
      if (lock instanceof Array && lock[0] === _updateLock) {
        lock[1]++
        console.trace("Warning: %o times of bgSettings_.set_() with key =", lock[1], key)
      } else {
        settingsCache_[key] = [_updateLock, 1]
      }
    }
    const val0 = bgSettings_.defaults_[key]
    let val2 = val
    if (val0 !== void 0 && (typeof val0 === "object" ? JSON.stringify(val) === JSON.stringify(val0) : val === val0)) {
      val2 = null
    }
    return post_(kPgReq.setSetting, { key, val: val2 }).then((val3): void => {
      if (Build.NDEBUG) { /* empty */ }
      else if (settingsCache_ == null || settingsCache_ instanceof Promise) {
        throw new Error("settingsCache_ became invalid when bgSettings_.set_() with key = " + key)
      } else {
        const lock = settingsCache_[key] as UpdateLock
        if (--lock[1] > 0) { return }
      }
      (settingsCache_ as Dict<any>)[key] = val3 !== null ? val3 : val
    })
  },
  valuesToLoad_: {
    __proto__: null as never,
    filterLinkHints: "f", hideHud: "h", ignoreReadonly: "y", keyLayout: "l", mouseReachable: "e",
    keyboard: "k", keyupTime: "u", linkHintCharacters: "c", linkHintNumbers: "n", passEsc: "p",
    regexFindMode: "r", smoothScroll: "s", scrollStepSize: "t", waitForEnter: "w"
  } satisfies SettingsNS.AutoSyncedNameMap & SafeObject as SettingsNS.AutoSyncedNameMap,
  complexValuesToLoad_: {
    __proto__: null as never, c: 1, n: 1, l: 1, d: 1, p: 1, y: 1
  } satisfies TypedSafeEnum<SettingsNS.FrontendComplexSyncingItems>
}

bgSettings_.preloadCache_()

; !!Build.NDEBUG && !(Build.BTypes & BrowserType.Edge)
    && !(Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredES$TopLevelAwait)
    && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES$TopLevelAwait) &&
onDicts_( // eslint-disable-next-line spaced-comment
  /*! @OUTPUT {await } */ // @ts-ignore
  Promise.all(
    pageLangs_.split(",").map(lang => // @ts-ignore
        import(
          `/i18n/${lang}/${curPagePath_}.js`)))
)

//#endregion

export abstract class Option_<T extends keyof AllowedOptions> {
  readonly element_: HTMLElement;
  readonly field_: T;
  previous_: AllowedOptions[T];
  saved_: boolean;
  locked_: boolean
  readonly onUpdated_: (this: void) => void;
  onSave_ (): void | Promise<void> { /* empty */ }
  checker_?: Checker<T>;

  static all_ = {} as { [N in keyof AllowedOptions]: OptionType<N> }
  static syncToFrontend_: Array<keyof SettingsNS.AutoSyncedNameMap> = null as never
  static onFgCacheUpdated_: (() => void) | null = null
  static suppressPopulate_ = false

  constructor (element: HTMLElement, onUpdated: () => unknown) {
    const field = element.id as T;
    this.field_ = field
    this.element_ = element;
    this.previous_ = this.onUpdated_ = null as never;
    this.saved_ = false;
    this.locked_ = false
    if (field in bgSettings_.valuesToLoad_) {
      onUpdated = this._onCacheUpdated.bind(this, onUpdated);
    } else if (field === "autoDarkMode" || field === "autoReduceMotion") {
      onUpdated = this._manuallySyncCache.bind(this, onUpdated);
    }
    this.onUpdated_ = debounce_(onUpdated, 330, this, 1);
    this.init_(element)
  }

  fetch_ (): void | Promise<void> {
    this.saved_ = true;
    const value = this.innerFetch_()
    if (value instanceof Promise) {
      return value.then(Option_.prototype.fetch_.bind(this))
    }
    this.previous_ = value
    if (!Option_.suppressPopulate_) {
      nextTick_((): void => { this.populateElement_(this.previous_) })
    }
  }
  innerFetch_ (): AllowedOptions[T] | Promise<AllowedOptions[T]> {
    return bgSettings_.get_(this.field_)
  }
  normalize_ (value: AllowedOptions[T]): AllowedOptions[T] | Promise<AllowedOptions[T]> {
    const checker = this.checker_;
    return checker ? checker.check_(value) : value
  }
  allowToSave_ (): boolean { return true; }
  async save_ (): Promise<void> {
    let value = this.readValueFromElement_(), isJSON = typeof value === "object"
      , previous = isJSON ? JSON.stringify(this.previous_) : this.previous_
      , pod = isJSON ? JSON.stringify(value) : value as string
    if (pod === previous) { return }
    previous = pod;
    const _val = this.normalize_(value)
    value = _val instanceof Promise ? await _val : _val
    value = await this.executeSave_(value)
    this.previous_ = value
    this.saved_ = true
    if (previous !== (isJSON ? JSON.stringify(value) : value) || this.doesPopulateOnSave_(value)) {
      nextTick_((): void => { this.populateElement_(this.previous_, true) })
    }
    return this.onSave_()
  }
  isDirty_ (): boolean {
    const latest = this.innerFetch_() as AllowedOptions[T]
    const diff = !this.areEqual_(this.previous_, latest)
    if (diff && this.areEqual_(latest, this.readValueFromElement_())) {
      this.previous_ = latest
      this.saved_ = true
      return false
    }
    return diff
  }
  async executeSave_ (value: AllowedOptions[T] | null): Promise<AllowedOptions[T]> {
    await bgSettings_.set_<keyof AllowedOptions>(this.field_, value)
    if (this.field_ in bgSettings_.valuesToLoad_) {
      Option_.syncToFrontend_.push(this.field_ as keyof typeof bgSettings_.valuesToLoad_);
    }
    return this.innerFetch_()
  }
  abstract init_ (element: HTMLElement): void
  abstract readValueFromElement_ (): AllowedOptions[T];
  abstract populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void;
  doesPopulateOnSave_ (_val: AllowedOptions[T]): boolean { return false }
  areEqual_ (this: Option_<T>, old: AllowedOptions[T], newVal: AllowedOptions[T]): boolean { return old === newVal }
  _onCacheUpdated: (this: Option_<T>, onUpdated: (this: Option_<T>) => unknown) => void;
  _manuallySyncCache: (this: Option_<T>, onUpdated: (this: Option_<T>) => unknown) => void;
  atomicUpdate_: (this: Option_<T> & {element_: TextElement}, value: string, undo: boolean, locked: boolean) => void;

  static saveOptions_: (this: void) => Promise<boolean>
  static needSaveOptions_: (this: void) => boolean;
  i18nName_: () => string
}
export type OptionErrorType = "has-error" | "highlight"

export interface ExclusionBaseVirtualNode {
  rule_: ExclusionsNS.StoredRule
  matcher_: Promise<ValidUrlMatchers | false> | ValidUrlMatchers | false | null
  changed_: kExclusionChange
  visible_: boolean;
  $pattern_: Element | null; $keys_: Element | null; savedRule_: ExclusionsNS.StoredRule
}
interface ExclusionInvisibleVirtualNode extends ExclusionBaseVirtualNode {
  changed_: kExclusionChange.NONE
  visible_: false;
  $pattern_: null;
  $keys_: null;
}
export interface ExclusionVisibleVirtualNode extends ExclusionBaseVirtualNode {
  visible_: true;
  $pattern_: HTMLInputElement & ExclusionRealNode;
  $keys_: HTMLInputElement & ExclusionRealNode;
}
export interface ExclusionRealNode extends HTMLElement {
  vnode: ExclusionVisibleVirtualNode;
}

export class ExclusionRulesOption_ extends Option_<"exclusionRules"> {
  template_: HTMLTableRowElement;
  list_: Array<ExclusionVisibleVirtualNode | ExclusionInvisibleVirtualNode>;
  $list_: HTMLTableSectionElement;
  dragged_: HTMLTableRowElement | null;
  _rendered: boolean
  override init_ (element: HTMLElement): void {
    this.template_ = (element.querySelector("#exclusionTemplate") as HTMLTemplateElement
        ).content.querySelector(".exclusionRule") as HTMLTableRowElement;
    this.$list_ = element.querySelector("tbody") as HTMLTableSectionElement;
    this.list_ = [];
    delayBinding_(this.$list_, "input", ExclusionRulesOption_.MarkChanged_)
    delayBinding_(this.$list_, "input", this.onUpdated_)
    delayBinding_(this.$list_, "click", e => { this.onRemoveRow_(e) })
    this._rendered = false
    delayBinding_("#exclusionAddButton", "click", () => this.addRule_(""), "on")
  }
onRowChange_ (_isInc: number): void { /* empty */ }
static MarkChanged_ (this: void, event: Event): void {
  const target = event.target as HTMLInputElement & Partial<ExclusionRealNode>
  const vnode = target.vnode;
  vnode && (vnode.changed_ |= target.classList.contains("pattern")
      ? kExclusionChange.pattern : kExclusionChange.passKeys)
}
addRule_ (pattern: string, autoFocus?: false | undefined): void {
  const isInited = autoFocus !== false, old = isInited && this.$list_.childElementCount
  const vnode = this.appendRuleTo_(this.$list_, { passKeys: "", pattern })
  pattern && (vnode.savedRule_ = { passKeys: "", pattern: "" })
  const item = this.list_[this.list_.length - 1] as ExclusionVisibleVirtualNode;
  if (isInited) {
    old >= 4 && this.element_.scrollBy(0, 40)
    nextTick_(() => item.$pattern_.focus());
  }
  if (pattern) {
    this.onUpdated_();
  }
  this.onRowChange_(1);
}
override populateElement_ (rules: ExclusionsNS.StoredRule[]): void {
  if (!this._rendered) {
    this._rendered = true
    for (const el of pageLangs_ !== "en" ? $$("[title]", this.template_) : []) {
      const t = pageTrans_(el.title)
      t && (el.title = t)
    }
  }
  if (OnChrome && Build.MinCVer < BrowserVer.MinTbodyAcceptInnerTextSetter) {
    this.$list_.textContent = "";
  } else {
    (this.$list_ as HTMLElement).innerText = "";
  }
  this.list_ = [];
  if (rules.length <= 0) { /* empty */ }
  else if (rules.length === 1) {
    this.appendRuleTo_(this.$list_, rules[0]);
  } else {
    const frag = document.createDocumentFragment();
    rules.forEach(this.appendRuleTo_.bind(this, frag));
    this.$list_.appendChild(frag);
  }
  return this.onRowChange_(rules.length);
}
checkNodeVisible_ (_vnode: ExclusionBaseVirtualNode): boolean { return true }
appendRuleTo_ (this: ExclusionRulesOption_
    , list: HTMLTableSectionElement | DocumentFragment, rule_: ExclusionsNS.StoredRule): ExclusionBaseVirtualNode {
  const { passKeys, pattern } = rule_, vnode = {
    // rebuild a rule, to ensure a consistent memory layout
    rule_, matcher_: null, changed_: kExclusionChange.NONE, visible_: false,
    $pattern_: null, $keys_: null, savedRule_: rule_
  } satisfies ExclusionInvisibleVirtualNode as ExclusionVisibleVirtualNode | ExclusionInvisibleVirtualNode
  vnode.visible_ = this.checkNodeVisible_(vnode)
  if (!vnode.visible_) {
    this.list_.push(vnode);
    return vnode
  }
  const row = document.importNode(this.template_, true),
  patternEl = row.querySelector(".pattern") as HTMLInputElement & ExclusionRealNode,
  passKeysEl = row.querySelector(".passKeys") as HTMLInputElement & ExclusionRealNode,
  trimmedKeys = passKeys.trimRight();
  patternEl.value = pattern;
  if (pattern) {
    patternEl.placeholder = "";
  }
  passKeysEl.value = trimmedKeys;
  if (trimmedKeys) {
    passKeysEl.placeholder = "";
  }
  vnode.$pattern_ = patternEl; vnode.$keys_ = passKeysEl;
  patternEl.vnode = vnode;
  passKeysEl.vnode = vnode;
  this.updateVNode_(vnode, pattern, passKeys)
  this.list_.push(vnode);
  list.appendChild(row);
  return vnode
}
static OnNewKeys_ (vnode: ExclusionVisibleVirtualNode): void {
  if (vnode.rule_.pattern && vnode.$keys_.placeholder) {
    vnode.$keys_.placeholder = "";
  }
}
onRemoveRow_ (event: EventToPrevent): void {
  let element = event.target as EnsuredMountedElement
  element.localName === "path" && (element = element.parentElement)
  element.localName === "svg" && (element = element.parentElement)
  if (!element.classList.contains("remove")) { return; }
  element = element.parentNode.parentNode
  if (element.classList.contains("exclusionRule")) {
    const vnode = (element.querySelector(".pattern") as ExclusionRealNode).vnode;
    element.remove();
    event.preventDefault()
    if (vnode.changed_ & kExclusionChange.mismatches && vnode.savedRule_.pattern) {
      Object.assign<ExclusionBaseVirtualNode, Partial<ExclusionBaseVirtualNode>>(vnode, {
          rule_: { passKeys: "", pattern: ""}, matcher_: false,
          changed_: kExclusionChange.mismatches | kExclusionChange.deleted, $pattern_: null, $keys_: null })
    } else {
      this.list_.splice(this.list_.indexOf(vnode), 1);
    }
    this.onUpdated_();
    return this.onRowChange_(0);
  }
}

static onFormatKey_ (this: void, old: string, modifiers: string, ch: string): string {
  const chLower = ch.toLowerCase()
  return !modifiers && ch.length === 1 ? ch : ch !== chLower ? `<${modifiers}s-${chLower}>` : old
}
static formatKeys_ (keys: string): string {
  return keys && keys.replace(<RegExpG & RegExpSearchable<2>> /<(?!<)((?:[acm]-){0,3})(\S|[A-Za-z]\w+)>/g
      , ExclusionRulesOption_.onFormatKey_)
}
override readValueFromElement_ (part?: boolean): AllowedOptions["exclusionRules"] {
  const rules: ExclusionsNS.StoredRule[] = [];
  part = (part === true);
  for (const vnode of this.list_) {
    if (part && !vnode.visible_) {
      continue;
    }
    const changed = vnode.changed_
    if (!changed || !(changed & (kExclusionChange.pattern | kExclusionChange.passKeys))) {
      if (vnode.rule_.pattern) {
        rules.push(vnode.rule_);
      }
      continue;
    }
    let pattern = changed & kExclusionChange.pattern ? vnode.$pattern_.value.trim() : vnode.rule_.pattern;
    let fixTail = false, passKeys = changed & kExclusionChange.passKeys ? vnode.$keys_.value : vnode.rule_.passKeys
    if (!pattern) {
      this.updateVNode_(vnode, "", passKeys);
      continue;
    }
    if (changed & kExclusionChange.pattern) {
    const isOtherProtocol = (<RegExpI> /^(about|vimium):/i).test(pattern)
    let schemeLen = pattern.startsWith(":") ? 0 : pattern.indexOf("://");
    if (!schemeLen) { /* empty */ }
    else if (!(<RegExpOne> /^[\^*]|[^\\][$()*+?\[\]{|}]/).test(pattern)) {
      fixTail = !pattern.includes("/", schemeLen + 3) && !isOtherProtocol;
      pattern = pattern.replace(<RegExpG> /\\(.)/g, "$1");
      pattern = (schemeLen < 0 && !isOtherProtocol ? ":http://" : ":") + pattern;
    } else if (pattern.startsWith("`")) {
      /* empty */
    } else if (!pattern.startsWith("^")) {
      fixTail = !pattern.includes("/", schemeLen + 3);
      if (pattern.endsWith("*")) {
        pattern = pattern.slice(0, (<RegExpOne> /^[^\\]\.\*$/).test(pattern.slice(-3)) ? -2 : -1)
        fixTail = false
      }
      pattern = pattern.startsWith(".*") && !(<RegExpOne> /[(\\[]/).test(pattern) ? "*." + pattern.slice(2) : pattern
      let host2 = pattern
      host2 = (schemeLen < 0 && !isOtherProtocol ? "^https?://" : "^") +
          (!host2.startsWith("*") || host2[1] === "."
            ? ((host2 = host2.replace(<RegExpG> /\./g, "\\.")), // lgtm [js/incomplete-sanitization]
              !host2.startsWith("*") ? host2.replace("://*\\.", "://(?:[^./]+\\.)*?")
                : host2.replace("*\\.", "(?:[^./]+\\.)*?"))
            : "[^/]" + host2);
      pattern = _testRe(host2, "") ? host2
          : pattern.includes("*") || pattern.includes("/") || isOtherProtocol ? ":" + pattern
          : ":https://" + (pattern.startsWith(".") ? pattern.slice(1) : pattern)
    } else {
      const ind = ".*$".includes(pattern.slice(-2)) ? pattern.endsWith(".*$") ? 3 : pattern.endsWith(".*") ? 2 : 0 : 0
      pattern = ind !== 0 && pattern[pattern.length - ind] !== "\\" ? pattern.slice(0, -ind) : pattern
    }
    if (fixTail) {
      pattern += "/";
    }
    }
    if (changed & kExclusionChange.passKeys && passKeys) {
      passKeys = ExclusionRulesOption_.formatKeys_(passKeys)
      const passArr = passKeys.match(<RegExpG> /<(?!<)(?:a-)?(?:c-)?(?:m-)?(?:s-)?(?:[a-z]\w+|[^\sA-Z])>|\S/g);
      if (passArr) {
        const isReversed = passArr[0] === "^" && passArr.length > 1;
        isReversed && passArr.shift();
        passArr.sort();
        isReversed ? passArr.unshift("^") : passArr[0] === "^" && (passArr.shift(), passArr.push("^"));
      }
      passKeys = passArr ? (passArr.join(" ") + " ") : "";
      passKeys = passKeys.replace(<RegExpG> /<escape>/gi, "<esc>");
    }
    this.updateVNode_(vnode, pattern, passKeys);
    rules.push(vnode.rule_);
  }
  return rules;
}
updateVNode_ (vnode: ExclusionVisibleVirtualNode, pattern: string, keys: string): void {
  const hasNewKeys = !vnode.rule_.passKeys && !!keys;
  vnode.rule_ = { passKeys: keys, pattern }
  vnode.matcher_ = null
  vnode.changed_ &= ~(kExclusionChange.pattern | kExclusionChange.passKeys)
  if (hasNewKeys) {
    ExclusionRulesOption_.OnNewKeys_(vnode);
  }
}
override onSave_ (): void {
  for (let i = 0, rules = this.list_; i < rules.length; i++) {
    const rule = rules[i]
    if (!rule.visible_) { continue; }
    if (rule.changed_ & kExclusionChange.deleted) { rules.splice(i--, 1); continue }
    rule.savedRule_ = rule.rule_
    if (rule.$pattern_.value !== rule.rule_.pattern) {
      rule.$pattern_.value = rule.rule_.pattern;
    }
    const passKeys = rule.rule_.passKeys.trim();
    if (rule.$keys_.value !== passKeys) {
      rule.$keys_.value = passKeys;
    }
  }
}
override areEqual_ (this: void, a: object, b: object): boolean { return JSON.stringify(a) === JSON.stringify(b) }
sortRules_: (el?: HTMLElement) => void;
timer_?: number;
}

const _testRe = (pattern: string, suffix: string): RegExp | null => {
  try {
    return new RegExp(pattern, suffix as "");
  } catch {
    return null
  }
}

export let setupBorderWidth_ = (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
      && CurCVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo)
    || devicePixelRatio < 2 && (!OnChrome || Build.MinCVer >= BrowserVer.MinRoundedBorderWidthIsNotEnsured
        || CurCVer_ >= BrowserVer.MinRoundedBorderWidthIsNotEnsured)
    ? (): void => {
  const css = document.createElement("style"), ratio = devicePixelRatio;
  const onlyInputs = (!OnChrome || Build.MinCVer >= BrowserVer.MinRoundedBorderWidthIsNotEnsured
    || CurCVer_ >= BrowserVer.MinRoundedBorderWidthIsNotEnsured) && ratio >= 1;
  let scale: string | number = !OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
    || onlyInputs || CurCVer_ >= BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo ? 1 / ratio : 1;
  scale = scale + 0.00000999;
  scale = ("" + scale).slice(0, 7).replace(<RegExpOne> /\.?0+$/, "");
  css.textContent = onlyInputs ? `html { --vc-tiny: ${scale}px; }` : `* { border-width: ${scale}px !important; }`;
  (document.head as HTMLHeadElement).appendChild(css);
} : null;

export const oTrans_: TransTy<keyof typeof i18n_options> = (k, a): string => pageTrans_(k, a) || ""

if (!Build.NDEBUG) { Object.assign(window as any, { Option_, oTrans_ }) }
