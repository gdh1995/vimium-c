/// <reference path="../lib/base.d.ts" />
/// <reference path="../background/exclusions.ts" />

export type AllowedOptions = SettingsNS.PersistentSettings
export type PossibleOptionNames<T> = PossibleKeys<AllowedOptions, T>
interface BaseChecker<V extends AllowedOptions[keyof AllowedOptions]> {
  init_? (): any;
  check_ (value: V): V;
}
export type Checker<T extends keyof AllowedOptions> = BaseChecker<AllowedOptions[T]>
import {
  UniversalNumberSettings, NumberOption_, JSONOptionNames, JSONOption_, TextualizedOptionNames, TextOption_,
  BooleanOption_
} from "./options_defs"
type OptionType<T extends keyof AllowedOptions> = T extends "exclusionRules" ? ExclusionRulesOption_
    : T extends UniversalNumberSettings ? NumberOption_<T>
    : T extends JSONOptionNames ? JSONOption_<T>
    : T extends TextualizedOptionNames ? TextOption_<T>
    : NonNullable<AllowedOptions[T]> extends boolean | number ? BooleanOption_<T>
    : never;
export interface KnownOptionsDataset extends KnownDataset {
  iT: string // title in i18n
  i: string // text in i18n
  check: "check" // event name used in BooleanOption_
  map: string // json array of `[0|1|2, 0|1|2, (0|1|2)?]`, used in BooleanOption_
  allowNull: "true" | "1" // does allow null value, used in BooleanOption
  converter: "lower" | "upper" | "chars" | "lower chars" // converter names for string values
  model: string // enum of option types
  autoResize: keyof AllowedOptions // enum of option names
  delay: "" | "continue" | "event" // work type when delaying click events
  permission: "webNavigation" | "C76" | string // required permissions
  href: `vimium://${string}`
}

import { CurCVer_, BG_, bgSettings_, OnFirefox, OnEdge, OnChrome } from "./async_bg"

export const $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T

export const pTrans_: typeof chrome.i18n.getMessage = OnFirefox
      ? (i, j) => BG_.trans_(i, j) : chrome.i18n.getMessage;

export const $$ = ((selector: string, root?: HTMLElement | ShadowRoot | null) => {
  const list = (root || document).querySelectorAll(selector)
  return OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$forEach$ForDOMListTypes
      && Build.MinCVer >= BrowserVer.MinTestedES6Environment
      && CurCVer_ < BrowserVer.MinEnsured$ForOf$forEach$ForDOMListTypes
      ? [].slice.call(list) : list
}) as <T extends HTMLElement>(selector: string, root?: HTMLElement | ShadowRoot | null) => ArrayLike<T>

const lang_ = chrome.i18n.getMessage("lang1")
if (lang_) {
    const langInput = navigator.language as string || pTrans_("lang2")
    let t = pTrans_("keyMappingsP"), el: HTMLElement | null = $("#keyMappings");
    t && el && ((el as HTMLInputElement).placeholder = t);
    if (langInput && (lang_ !== "zh" || langInput !== "zh-CN")) {
      for (el of $$("input[type=text], textarea") as HTMLElement[]) {
        el.lang = langInput as ""
      }
    }
    for (el of $$("[data-i]") as HTMLElement[]) {
      const i = (el.dataset as KnownOptionsDataset).i!, isTitle = i.endsWith("-t")
      t = pTrans_(isTitle ? i.slice(0, -2) : i);
      (t || i === "NS") && (isTitle ? el.title = t : el!.innerText = t)
    }
    (document.documentElement as HTMLHtmlElement).lang = lang_ === "zh" ? "zh-CN" as "" : lang_ as "";
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

export const nextTick_ = ((): { <T>(task: (self: T) => void, self: T): void; (task: (this: void) => void): void } => {
  type Callback = () => void;
  const tasks: Callback[] = [],
  ticked = function (): void {
    const oldSize = tasks.length;
    for (const task of tasks) {
      task();
    }
    if (tasks.length > oldSize) {
      tasks.splice(0, oldSize);
      if (OnChrome ? Build.MinCVer >= BrowserVer.Min$queueMicrotask
          : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask
          : !OnEdge) {
        queueMicrotask(ticked);
      } else {
        Promise.resolve().then(ticked);
      }
    } else {
      tasks.length = 0;
    }
  };
  return <T> (task: ((firstArg: T) => void) | ((this: void) => void), context?: T): void => {
    if (tasks.length <= 0) {
      if (OnChrome ? Build.MinCVer >= BrowserVer.Min$queueMicrotask
          : OnFirefox ? Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask
          : !OnEdge) {
        queueMicrotask(ticked);
      } else {
        Promise.resolve().then(ticked);
      }
    }
    if (context as unknown as number === 9) {
      // here ignores the case of re-entry
      tasks.unshift(task as (this: void) => void);
    } else {
      tasks.push(context ? (task as (firstArg: T) => void).bind(null, context) : task as (this: void) => void);
    }
  };
})()

export const debounce_ = function<T> (func: (this: T) => void
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
      return func.call(bound_context);
    }
  };
  also_immediate = also_immediate ? 1 : 0;
  return function () {
    timestamp = Date.now(); // safe for time changes
    if (timeout) { return; }
    timeout = setTimeout(later, wait);
    if (also_immediate) {
      also_immediate = timestamp;
      return func.call(bound_context);
    }
  };
} as <T> (func: (this: T) => void, wait: number, bound_context: T, also_immediate: BOOL) => (this: void) => void


export abstract class Option_<T extends keyof AllowedOptions> {
  readonly element_: HTMLElement;
  readonly field_: T;
  previous_: AllowedOptions[T];
  saved_: boolean;
  locked_?: boolean;
  readonly onUpdated_: (this: void) => void;
  onSave_ (): void { /* empty */ }
  checker_?: Checker<T>;

  static all_: { [T in keyof AllowedOptions]: OptionType<T> } & SafeObject
  static syncToFrontend_: Array<keyof SettingsNS.AutoSyncedNameMap>;
  static suppressPopulate_ = true;

constructor (element: HTMLElement, onUpdated: () => void) {
  this.element_ = element;
  this.field_ = element.id as T;
  this.previous_ = this.onUpdated_ = null as never;
  this.saved_ = false;
  if (this.field_ in bgSettings_.valuesToLoad_) {
    onUpdated = this._onCacheUpdated.bind(this, onUpdated);
  }
  this.onUpdated_ = debounce_(onUpdated, 330, this, 1);
  this.init_(element)
}

fetch_ (): void {
  this.saved_ = true;
  this.previous_ = bgSettings_.get_(this.field_);
  if (!Option_.suppressPopulate_) {
    this.populateElement_(this.previous_);
  }
}
normalize_ (value: AllowedOptions[T], isJSON: boolean, str?: string): AllowedOptions[T] {
  const checker = this.checker_;
  if (isJSON) {
    str = checker || !str ? JSON.stringify(checker ? checker.check_(value) : value) : str;
    return BG_.JSON.parse(str);
  }
  return checker ? checker.check_(value) : value;
}
allowToSave_ (): boolean { return true; }
save_ (): void {
  let value = this.readValueFromElement_(), isJSON = typeof value === "object"
    , previous = isJSON ? JSON.stringify(this.previous_) : this.previous_
    , pod = isJSON ? JSON.stringify(value) : value as string
  if (pod === previous) { return; }
  previous = pod;
  value = this.normalize_(value, isJSON, isJSON ? pod as string : "");
  this.previous_ = value = this.executeSave_(value, isJSON, pod)
  this.saved_ = true
  if (previous !== (isJSON ? JSON.stringify(value) : value) || this.doesPopulateOnSave_(value)) {
    this.populateElement_(value, true)
  }
  this.onSave_()
}
_isDirty (): boolean {
  return !this.areEqual_(this.previous_, bgSettings_.get_(this.field_))
}
executeSave_ (value: AllowedOptions[T], isJSON: boolean, pod: string): AllowedOptions[T] {
  if (isJSON) {
    pod = JSON.stringify(value);
    if (pod === JSON.stringify(bgSettings_.defaults_[this.field_])) {
      value = bgSettings_.defaults_[this.field_];
    }
  }
  bgSettings_.set_<keyof AllowedOptions>(this.field_, value);
  if (this.field_ in bgSettings_.valuesToLoad_) {
    Option_.syncToFrontend_.push(this.field_ as keyof typeof bgSettings_.valuesToLoad_);
  }
  return bgSettings_.get_(this.field_)
}
abstract init_ (element: HTMLElement): void
abstract readValueFromElement_ (): AllowedOptions[T];
abstract populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void;
doesPopulateOnSave_ (_val: AllowedOptions[T]): boolean { return false }
_onCacheUpdated: (this: Option_<T>, onUpdated: (this: Option_<T>) => void) => void;
areEqual_: (this: Option_<T>, a: AllowedOptions[T], b: AllowedOptions[T]) => boolean;
atomicUpdate_: (this: Option_<T> & {element_: TextElement}, value: string, undo: boolean, locked: boolean) => void;

static areJSONEqual_ (this: void, a: object, b: object): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
static saveOptions_: (this: void) => boolean;
static needSaveOptions_: (this: void) => boolean;
showError_: (msg: string, tag?: OptionErrorType | null, errors?: boolean) => void;
}
export type OptionErrorType = "has-error" | "highlight"

interface ExclusionBaseVirtualNode {
  rule_: ExclusionsNS.StoredRule;
  changed_: boolean;
  visible_: boolean;
}
interface ExclusionInvisibleVirtualNode extends ExclusionBaseVirtualNode {
  changed_: false;
  visible_: false;
  $pattern_: null;
  $keys_: null;
}
export interface ExclusionVisibleVirtualNode extends ExclusionBaseVirtualNode {
  rule_: ExclusionsNS.StoredRule;
  changed_: boolean;
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
  onInited_?: () => void;
  init_ (element: HTMLElement): void {
    this.template_ = (element.querySelector("#exclusionTemplate") as HTMLTemplateElement
        ).content.querySelector(".exclusionRule") as HTMLTableRowElement;
    if (lang_) {
      let el: HTMLElement, t: string | null
      for (el of $$("[data-i]", element) as HTMLElement[]) {
        t = pTrans_((el.dataset as KnownOptionsDataset).i!);
        t && (el.innerText = t);
      }
      for (el of $$("[title]", this.template_) as HTMLElement[]) {
        t = el.title
        if (t) {
          t = pTrans_(t)
          t && (el.title = t)
        } else {
          t = pTrans_(el.getAttribute("title")!)
          t && el.setAttribute("title", t)
        }
      }
    }
    this.$list_ = element.querySelector("tbody") as HTMLTableSectionElement;
    this.list_ = [];
    this.$list_.addEventListener("input", ExclusionRulesOption_.MarkChanged_);
    this.$list_.addEventListener("input", this.onUpdated_);
    this.$list_.addEventListener("click", e => this.onRemoveRow_(e));
    $("#exclusionAddButton").onclick = () => this.addRule_("");
    if (Option_.syncToFrontend_) { // is on options page
      this.template_.draggable = true;
    }
    nextTick_(() => this.onInited_ && this.onInited_());
  }
onRowChange_ (_isInc: number): void { /* empty */ }
static MarkChanged_ (this: void, event: Event): void {
  const vnode = (event.target as HTMLInputElement & Partial<ExclusionRealNode>).vnode;
  vnode && (vnode.changed_ = true);
}
addRule_ (pattern: string, autoFocus?: false | undefined): void {
  this.appendRuleTo_(this.$list_, {
    pattern,
    passKeys: ""
  });
  const item = this.list_[this.list_.length - 1] as ExclusionVisibleVirtualNode;
  if (autoFocus !== false) {
    nextTick_(() => item.$pattern_.focus());
  }
  if (pattern) {
    this.onUpdated_();
  }
  this.onRowChange_(1);
}
populateElement_ (rules: ExclusionsNS.StoredRule[]): void {
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
isPatternMatched_ (_pattern: string): boolean { return true; }
appendRuleTo_ (this: ExclusionRulesOption_
    , list: HTMLTableSectionElement | DocumentFragment, { pattern, passKeys }: ExclusionsNS.StoredRule): void {
  const vnode: ExclusionVisibleVirtualNode | ExclusionInvisibleVirtualNode = {
    // rebuild a rule, to ensure a consistent memory layout
    rule_: { pattern, passKeys },
    changed_: false,
    visible_: false,
    $pattern_: null,
    $keys_: null
  };
  if (!this.isPatternMatched_(pattern)) {
    this.list_.push(vnode);
    return;
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
  const vnode2 = vnode as ExclusionVisibleVirtualNode | ExclusionInvisibleVirtualNode as ExclusionVisibleVirtualNode;
  vnode2.visible_ = true;
  vnode2.$pattern_ = patternEl; vnode2.$keys_ = passKeysEl;
  patternEl.vnode = vnode2;
  passKeysEl.vnode = vnode2;
  this.list_.push(vnode2);
  list.appendChild(row);
}
static OnNewKeys_ (vnode: ExclusionVisibleVirtualNode): void {
  if (vnode.rule_.pattern && vnode.$keys_.placeholder) {
    vnode.$keys_.placeholder = "";
  }
}
onRemoveRow_ (event: Event): void {
  let element = event.target as EnsuredMountedElement
  element.localName === "path" && (element = element.parentElement.parentElement)
  if (!element.classList.contains("remove")) { return; }
  element = element.parentNode.parentNode
  if (element.classList.contains("exclusionRule")) {
    const vnode = (element.querySelector(".pattern") as ExclusionRealNode).vnode;
    element.remove();
    this.list_.splice(this.list_.indexOf(vnode), 1);
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
readValueFromElement_ (part?: boolean): AllowedOptions["exclusionRules"] {
  const rules: ExclusionsNS.StoredRule[] = [];
  part = (part === true);
  for (const vnode of this.list_) {
    if (part && !vnode.visible_) {
      continue;
    }
    if (!vnode.changed_) {
      if (vnode.rule_.pattern) {
        rules.push(vnode.rule_);
      }
      continue;
    }
    let pattern = vnode.$pattern_.value.trim();
    let fixTail = false, passKeys = vnode.$keys_.value;
    if (!pattern) {
      this.updateVNode_(vnode, "", passKeys);
      continue;
    }
    let schemeLen = pattern.startsWith(":") ? 0 : pattern.indexOf("://");
    if (!schemeLen) { /* empty */ }
    else if (!(<RegExpOne> /^[\^*]|[^\\][$()*+?\[\]{|}]/).test(pattern)) {
      fixTail = !pattern.includes("/", schemeLen + 3) && !pattern.startsWith("vimium:");
      pattern = pattern.replace(<RegExpG> /\\(.)/g, "$1");
      pattern = (schemeLen < 0 ? ":http://" : ":") + pattern;
    } else if (!pattern.startsWith("^")) {
      fixTail = !pattern.includes("/", schemeLen + 3);
      pattern = (schemeLen < 0 ? "^https?://" : "^") +
          (!pattern.startsWith("*") || pattern[1] === "."
            ? ((pattern = pattern.replace(<RegExpG> /\./g, "\\.")), // lgtm [js/incomplete-sanitization]
              !pattern.startsWith("*") ? pattern.replace("://*\\.", "://(?:[^./]+\\.)*?")
                : pattern.replace("*\\.", "(?:[^./]+\\.)*?"))
            : "[^/]" + pattern);
    }
    if (fixTail) {
      pattern += "/";
    }
    if (passKeys) {
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
    let tip = passKeys ? passKeys.length > 1 && passKeys[0] === "^" ? "only hook such keys" : "pass through such keys"
              : "completely disabled";
    vnode.$keys_.title !== tip && (vnode.$keys_.title = tip);
    this.updateVNode_(vnode, pattern, passKeys);
    rules.push(vnode.rule_);
  }
  return rules;
}
updateVNode_ (vnode: ExclusionVisibleVirtualNode, pattern: string, keys: string): void {
  const hasNewKeys = !vnode.rule_.passKeys && !!keys;
  vnode.rule_ = { pattern, passKeys: keys };
  vnode.changed_ = false;
  if (hasNewKeys) {
    ExclusionRulesOption_.OnNewKeys_(vnode);
  }
}
onSave_ (): void {
  for (let rule of this.list_) {
    if (!rule.visible_) { continue; }
    if (rule.$pattern_.value !== rule.rule_.pattern) {
      rule.$pattern_.value = rule.rule_.pattern;
    }
    const passKeys = rule.rule_.passKeys.trim();
    if (rule.$keys_.value !== passKeys) {
      rule.$keys_.value = passKeys;
    }
  }
}

readonly areEqual_ = Option_.areJSONEqual_;
sortRules_: (el?: HTMLElement) => void;
timer_?: number;
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
  css.textContent = onlyInputs ? `html { --tiny: ${scale}px; }` : `* { border-width: ${scale}px !important; }`;
  (document.head as HTMLHeadElement).appendChild(css);
} : null;
