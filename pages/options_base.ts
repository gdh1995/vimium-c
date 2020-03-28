/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
/// <reference path="../background/utils.ts" />
/// <reference path="../background/settings.ts" />
/// <reference path="../background/exclusions.ts" />
type AllowedOptions = SettingsNS.PersistentSettings;
type PossibleOptionNames<T> = PossibleKeys<AllowedOptions, T>;
interface BaseChecker<V extends AllowedOptions[keyof AllowedOptions]> {
  init_? (): any;
  check_ (value: V): V;
}
type Checker<T extends keyof AllowedOptions> = BaseChecker<AllowedOptions[T]>;
interface BgWindow extends Window {
  BgUtils_: typeof BgUtils_;
  Settings_: typeof Settings_;
}

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
(function (): void {
  const StringCls = String.prototype;
  /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
  if (!"".startsWith) {
    StringCls.startsWith = function (this: string, s: string): boolean {
      return this.lastIndexOf(s, 0) === 0;
    };
    StringCls.endsWith = function (this: string, s: string): boolean {
      const i = this.length - s.length;
      return i >= 0 && this.indexOf(s, i) === i;
    };
  }
  StringCls.includes = function (this: string, s: string, pos?: number): boolean {
    // eslint-disable-next-line @typescript-eslint/prefer-includes
    return this.indexOf(s, pos) >= 0;
  };
})();
}

// eslint-disable-next-line no-var
declare var bgOnOther_: BrowserType;
if (!(Build.BTypes & ~BrowserType.Chrome) ? false : !(Build.BTypes & BrowserType.Chrome) ? true
    : typeof browser !== "undefined" && (browser && (browser as typeof chrome).runtime) != null) {
  window.chrome = browser as typeof chrome;
}
// eslint-disable-next-line no-var
var $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T
  , BG_ = chrome.extension.getBackgroundPage() as Window as BgWindow
  , pTrans_: typeof chrome.i18n.getMessage = Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || BG_.OnOther === BrowserType.Firefox)
      ? (i, j) => BG_.trans_(i, j) : chrome.i18n.getMessage;
if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
  (window as any).bgOnOther_ = BG_.OnOther as BrowserType;
}

const $$ = document.querySelectorAll.bind(document) as <T extends HTMLElement>(selector: string) => NodeListOf<T>,
lang_ = chrome.i18n.getMessage("lang1");

if (lang_) {
  (function () {
    let t = pTrans_("keyMappingsP"), el: HTMLElement | null = $("#keyMappings");
    t && el && ((el as HTMLInputElement).placeholder = t);
    for (el of $$("[data-i]") as ArrayLike<Element> as Element[] as HTMLElement[]) {
      t = pTrans_(el.dataset.i as string);
      el.innerText = t;
    }
    for (el of $$("[data-i-t]") as ArrayLike<Element> as Element[] as HTMLElement[]) {
      t = pTrans_(el.dataset.iT as string);
      t && (el.title = t);
    }
    (document.documentElement as HTMLHtmlElement).lang = lang_ as "";
    t = pTrans_("vOptions");
    t && (document.title = t);
  })();
}

const __extends = function<Child, Super, Base> (
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
},
nextTick_ = (function (): { <T>(task: (self: T) => void, context: T): void; (task: (this: void) => void): void } {
  type Callback = () => void;
  const tasks: Callback[] = [],
  ticked = function (): void {
    const oldSize = tasks.length;
    for (const task of tasks) {
      task();
    }
    if (tasks.length > oldSize) {
      tasks.splice(0, oldSize);
      if ((Build.MinCVer >= BrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Chrome))
          && (Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Firefox))
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) {
        queueMicrotask(ticked);
      } else {
        Promise.resolve().then(ticked);
      }
    } else {
      tasks.length = 0;
    }
  };
  return function <T> (task: ((firstArg: T) => void) | ((this: void) => void), context?: T): void {
    if (tasks.length <= 0) {
      if ((Build.MinCVer >= BrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Chrome))
          && (Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask || !(Build.BTypes & BrowserType.Firefox))
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) {
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
})(),
debounce_ = function<T> (this: void, func: (this: T) => void
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
} as <T> (this: void, func: (this: T) => void
          , wait: number, bound_context: T, also_immediate: BOOL
          ) => (this: void) => void,
bgBrowserVer_ = Build.BTypes & BrowserType.Chrome ? BG_.CurCVer_ : BrowserVer.assumedVer;

let bgSettings_ = BG_.Settings_;

abstract class Option_<T extends keyof AllowedOptions> {
  readonly element_: HTMLElement;
  readonly field_: T;
  previous_: AllowedOptions[T];
  saved_: boolean;
  locked_?: boolean;
  readonly onUpdated_: (this: void) => void;
  onSave_ (): void { /* empty */ }
  checker_?: Checker<T>;

  static all_ = Object.create(null) as {
    [T in keyof AllowedOptions]: Option_<T>;
  } & SafeObject;
  static syncToFrontend_: Array<keyof SettingsNS.FrontendSettings>;
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
    , pod = isJSON ? JSON.stringify(value) : value;
  if (pod === previous) { return; }
  previous = pod;
  value = this.normalize_(value, isJSON, isJSON ? pod as string : "");
  if (isJSON) {
    pod = JSON.stringify(value);
    if (pod === JSON.stringify(bgSettings_.defaults_[this.field_])) {
      value = bgSettings_.defaults_[this.field_];
    }
  }
  bgSettings_.set_<keyof AllowedOptions>(this.field_, value);
  this.previous_ = value = bgSettings_.get_(this.field_);
  this.saved_ = true;
  if (previous !== (isJSON ? JSON.stringify(value) : value)) {
    this.populateElement_(value, true);
  }
  if (this.field_ in bgSettings_.valuesToLoad_) {
    Option_.syncToFrontend_.push(this.field_ as keyof SettingsNS.FrontendSettings);
  }
  this.onSave_();
}
abstract readValueFromElement_ (): AllowedOptions[T];
abstract populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void;
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
type OptionErrorType = "has-error" | "highlight";

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
interface ExclusionVisibleVirtualNode extends ExclusionBaseVirtualNode {
  rule_: ExclusionsNS.StoredRule;
  changed_: boolean;
  visible_: true;
  $pattern_: HTMLInputElement & ExclusionRealNode;
  $keys_: HTMLInputElement & ExclusionRealNode;
}
interface ExclusionRealNode extends HTMLElement {
  vnode: ExclusionVisibleVirtualNode;
}

class ExclusionRulesOption_ extends Option_<"exclusionRules"> {
  template_: HTMLTableRowElement;
  list_: Array<ExclusionVisibleVirtualNode | ExclusionInvisibleVirtualNode>;
  $list_: HTMLTableSectionElement;
  dragged_: HTMLTableRowElement | null;
  inited_: boolean;
  onInited_?: () => void;
constructor (element: HTMLElement, onUpdated: (this: ExclusionRulesOption_) => void) {
  super(element, onUpdated);
  this.inited_ = false;
  bgSettings_.fetchFile_("exclusionTemplate", (): void => {
    const container = document.createElement("div");
    if (Build.BTypes & ~BrowserType.Firefox) {
      container.innerHTML = bgSettings_.cache_.exclusionTemplate as string;
    } else {
      const parsed = new DOMParser().parseFromString(bgSettings_.cache_.exclusionTemplate as string, "text/html").body;
      (container as Ensure<Element, "append">).append(... <Element[]> <ArrayLike<Element>> parsed.children);
    }
    this.template_ = (container.querySelector("#exclusionTemplate") as HTMLTemplateElement
        ).content.firstChild as HTMLTableRowElement;
    if (lang_) {
      let el: HTMLElement, t: string;
      for (el of container.querySelectorAll("[data-i]") as ArrayLike<Element> as Element[] as HTMLElement[]) {
        t = pTrans_(el.dataset.i as string);
        t && (el.innerText = t);
      }
      for (el of this.template_.querySelectorAll("[title]") as ArrayLike<Element> as Element[] as HTMLElement[]) {
        t = pTrans_(el.title);
        t && (el.title = t);
      }
    }
    this.$list_ = container.querySelector("tbody") as HTMLTableSectionElement;
    this.list_ = [];
    this.$list_.addEventListener("input", ExclusionRulesOption_.MarkChanged_);
    this.$list_.addEventListener("input", this.onUpdated_);
    this.$list_.addEventListener("click", e => this.onRemoveRow_(e));
    $("#exclusionAddButton").onclick = () => this.addRule_("");
    let table = container.firstElementChild as HTMLElement;
    table.remove();
    this.template_.remove();
    if (Option_.syncToFrontend_) { // is on options page
      this.template_.draggable = true;
    }
    this.inited_ = true;
    if (this.saved_) { // async and .fetch called
      nextTick_(() => this.populateElement_(this.previous_));
    }
    nextTick_(table1 => this.element_.appendChild(table1), table);
    nextTick_(() => this.onInited_ && this.onInited_());
  });
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
  if (!this.inited_) { return; }
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinTbodyAcceptInnerTextSetter) {
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
  let element = event.target as HTMLElement;
  if (!element.classList.contains("exclusionRemove")) { return; }
  element = (element.parentNode as Node).parentNode as HTMLElement;
  if (element.classList.contains("exclusionRule")) {
    const vnode = (element.querySelector(".pattern") as ExclusionRealNode).vnode;
    element.remove();
    this.list_.splice(this.list_.indexOf(vnode), 1);
    this.onUpdated_();
    return this.onRowChange_(0);
  }
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
    let schemaLen = pattern.startsWith(":") ? 0 : pattern.indexOf("://");
    if (!schemaLen) { /* empty */ }
    else if (!(<RegExpOne> /^[\^*]|[^\\][$()*+?\[\]{|}]/).test(pattern)) {
      fixTail = !pattern.includes("/", schemaLen + 3) && !pattern.startsWith("vimium:");
      pattern = pattern.replace(<RegExpG> /\\(.)/g, "$1");
      pattern = (schemaLen < 0 ? ":http://" : ":") + pattern;
    } else if (!pattern.startsWith("^")) {
      fixTail = !pattern.includes("/", schemaLen + 3);
      pattern = (schemaLen < 0 ? "^https?://" : "^") +
          (!pattern.startsWith("*") || pattern[1] === "."
            ? ((pattern = pattern.replace(<RegExpG> /\./g, "\\.")),
              !pattern.startsWith("*") ? pattern.replace("://*\\.", "://(?:[^./]+\\.)*?")
                : pattern.replace("*\\.", "(?:[^./]+\\.)*?"))
            : "[^/]" + pattern);
    }
    if (fixTail) {
      pattern += "/";
    }
    if (passKeys) {
      passKeys = BG_.BgUtils_.formatKeys_(passKeys);
      const passArr = passKeys.match(<RegExpG> /<(?!<)(?:a-)?(?:c-)?(?:m-)?(?:s-)?(?:[a-z][\da-z]+|[^\sA-Z])>|\S/g);
      if (passArr) {
        const isReverted = passArr[0] === "^" && passArr.length > 1;
        isReverted && passArr.shift();
        passArr.sort();
        isReverted ? passArr.unshift("^") : passArr[0] === "^" && (passArr.shift(), passArr.push("^"));
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

let setupBorderWidth_ = (Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
      && Build.BTypes & BrowserType.Chrome
      && bgBrowserVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo)
    || devicePixelRatio < 2 && (Build.MinCVer >= BrowserVer.MinRoundedBorderWidthIsNotEnsured
        || bgBrowserVer_ >= BrowserVer.MinRoundedBorderWidthIsNotEnsured)
    ? (): void => {
  const css = document.createElement("style"), ratio = devicePixelRatio;
  const onlyInputs = (Build.MinCVer >= BrowserVer.MinRoundedBorderWidthIsNotEnsured
    || bgBrowserVer_ >= BrowserVer.MinRoundedBorderWidthIsNotEnsured) && ratio >= 1;
  let scale: string | number = Build.MinCVer >= BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
    || onlyInputs || bgBrowserVer_ >= BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo ? 1 / ratio : 1;
  scale = scale + 0.00000999;
  scale = ("" + scale).slice(0, 7).replace(<RegExpOne> /\.?0+$/, "");
  css.textContent = onlyInputs ? `input, textarea { border-width: ${scale}px; }`
  : `* { border-width: ${scale}px !important; }`;
  (document.head as HTMLHeadElement).appendChild(css);
} : null;

location.pathname.toLowerCase().includes("/popup.html") &&
Promise.all([ BG_.BgUtils_.require_("Exclusions"),
    BG_.BgUtils_.GC_(1), bgSettings_.restore_ && bgSettings_.restore_()
]).then((callback => () => {
    chrome.tabs.query({currentWindow: true as true, active: true as true}, callback);
})(function (activeTabs: [chrome.tabs.Tab] | never[]): void {
  const curTab = activeTabs[0], _url = curTab.url;
  let ref = BG_.Backend_.indexPorts_(curTab.id), blockedMsg = $("#blocked-msg");
  const notRunnable = !(ref || curTab && _url && curTab.status === "loading" && (<RegExpOne> /^(ht|s?f)tp/).test(_url));
  if (notRunnable) {
    const body = document.body as HTMLBodyElement, docEl = document.documentElement as HTMLHtmlElement;
    body.innerText = "";
    blockedMsg.style.display = "";
    (blockedMsg.querySelector(".version") as HTMLElement).textContent = bgSettings_.CONST_.VerName_;
    const refreshTip = blockedMsg.querySelector("#refresh-after-install") as HTMLElement;
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox
        || !curTab || !_url || !(<RegExpI> /^(ht|s?f)tp/i).test(_url)
        ) {
      refreshTip.remove();
    } else if (Build.BTypes & BrowserType.Edge
        && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)) {
      (refreshTip.querySelector(".action") as HTMLElement).textContent = "open a new web page";
    }
    body.style.width = "auto";
    body.appendChild(blockedMsg);
    const extHost = _url.startsWith(location.protocol) && !_url.startsWith(location.origin) ? new URL(_url).host : "",
    extStat = extHost ? bgSettings_.extAllowList_[extHost] : null;
    if (extStat != null && (Build.BTypes & ~BrowserType.Chrome ? !extStat || typeof extStat === "string" : !extStat)) {
      const refusedEl = $<EnsuredMountedHTMLElement>("#injection-refused");
      refusedEl.style.display = "";
      refusedEl.nextElementSibling.remove();
      $<HTMLAnchorElement>("#doAllowExt").onclick = function () {
        let list = bgSettings_.get_("extAllowList"), old = list.split("\n"), extIdToAdd = extHost;
        if (Build.BTypes & ~BrowserType.Chrome) {
          let maybeId = bgSettings_.extAllowList_[extHost];
          extIdToAdd = typeof maybeId === "string" && maybeId ? maybeId : extIdToAdd;
        }
        if (old.indexOf(extIdToAdd) < 0) {
          const ind = old.indexOf("# " + extIdToAdd) + 1 || old.indexOf("#" + extIdToAdd) + 1;
          old.splice(ind ? ind - 1 : old.length, ind ? 1 : 0, extIdToAdd);
          list = old.join("\n");
          bgSettings_.set_("extAllowList", list);
        }
        this.onclick = null as never;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs1): void => {
          const cb = () => {
            setTimeout((): void => location.reload(), 500);
            return chrome.runtime.lastError;
          };
          tabs1 && tabs1[0] ? chrome.tabs.reload(tabs1[0].id, cb) : chrome.tabs.reload(cb);
          return chrome.runtime.lastError;
        })
      };
    }
    docEl.classList.toggle("auto-dark", !!bgSettings_.payload_.d);
    docEl.style.height = "";
  } else {
    nextTick_(versionEl => {
      blockedMsg.remove();
      blockedMsg = null as never;
      const docCls = (document.documentElement as HTMLHtmlElement).classList;
      docCls.toggle("auto-dark", !!bgSettings_.payload_.d);
      docCls.toggle("less-motion", !!bgSettings_.payload_.m);
      versionEl.textContent = bgSettings_.CONST_.VerName_;
    }, $<HTMLElement>(".version"));
  }
  const element = $<HTMLAnchorElement>(".options-link"), optionsUrl = bgSettings_.CONST_.OptionsPage_;
  element.href !== optionsUrl && (element.href = optionsUrl);
  element.onclick = function (this: HTMLAnchorElement, event: EventToPrevent): void {
    event.preventDefault();
    const a: MarksNS.FocusOrLaunch = BG_.Object.create(null);
    a.u = bgSettings_.CONST_.OptionsPage_;
    BG_.Backend_.focus_(a);
    window.close();
  };
  if (notRunnable) {
    return;
  }

  const bgExclusions = BG_.Exclusions as typeof Exclusions,
  frameInfo: Frames.Sender = ref && (!ref[0].s.i || BG_.BgUtils_.protocolRe_.test(ref[0].s.u)) ? ref[0].s : {
    /** must keep aligned with {@link ../background/main.ts#formatPortSender} */
    i: 0,
    a: curTab.incognito,
    s: Frames.Status.enabled, // not real
    f: Frames.Flags.blank,
    t: curTab.id,
    u: _url
  },
  topUrl = frameInfo.i && ((BG_.Backend_.indexPorts_(curTab.id, 0)
      || {} as Frames.Port).s || {} as Frames.Sender).u || "",
  stateAction = $<EnsuredMountedHTMLElement>("#state-action"), saveBtn = $<HTMLButtonElement>("#saveOptions"),
  stateValue = stateAction.nextElementSibling, stateTail = stateValue.nextElementSibling,
  url = frameInfo.u;
  class PopExclusionRulesOption extends ExclusionRulesOption_ {
    addRule_ (_pattern: string, autoFocus?: false): void {
      super.addRule_(PopExclusionRulesOption.generateDefaultPattern_(), autoFocus);
    }
    isPatternMatched_ (pattern: string): boolean {
      if (!pattern) { return false; }
      const rule = bgExclusions.testers_[pattern] as NonNullable<(typeof bgExclusions.testers_)[string]>;
      if (rule.t === ExclusionsNS.TesterType.StringPrefix
          ? url.startsWith(rule.v) && (!topUrl || topUrl.startsWith(rule.v))
          : rule.v.test(url) && (!topUrl || rule.v.test(topUrl))) {
        return true;
      }
      return false;
    }
    populateElement_ (rules1: ExclusionsNS.StoredRule[]): void {
      super.populateElement_(rules1);
      const a = this;
      if (!a.inited_) { return; }
      a.populateElement_ = null as never; // ensure .populateElement_ is only executed for once
      (document.documentElement as HTMLHtmlElement).style.height = "";
      PopExclusionRulesOption.prototype.isPatternMatched_ = ExclusionRulesOption_.prototype.isPatternMatched_;
      let visible_ = a.list_.filter(i => i.visible_) as ExclusionVisibleVirtualNode[], some = visible_.length > 0;
      let element1: SafeHTMLElement;
      inited = some ? 2 : 1;
      if (some) {
        element1 = visible_[0].$keys_;
        updateState(true);
      } else {
        a.addRule_("", false);
        element1 = (a.list_[a.list_.length - 1] as ExclusionVisibleVirtualNode).$keys_;
      }
      nextTick_(() => element1.focus());
    }
    updateVNode_ (vnode: ExclusionVisibleVirtualNode, pattern: string, keys: string): void {
      const patternIsSame = vnode.rule_.pattern === pattern;
      super.updateVNode_(vnode, pattern, keys);
      if (patternIsSame) {
        return;
      }
      const parsedPattern = bgExclusions.createRule_(pattern, ""), patternElement = vnode.$pattern_;
      if (parsedPattern.t === ExclusionsNS.TesterType.StringPrefix
          ? url.startsWith(parsedPattern.v) : parsedPattern.v.test(url)) {
        patternElement.title = patternElement.style.color = "";
      } else {
        patternElement.style.color = "red";
        patternElement.title = "Red text means that the pattern does not\nmatch the current URL.";
      }
    }
    static generateDefaultPattern_ (this: void): string {
      const url2 = url.startsWith("http:")
        ? "^https?://" + url.split("/", 3)[2].replace(<RegExpG> /[.[\]]/g, "\\$&") + "/"
        : url.startsWith(location.origin)
        ? ":vimium:/" + new URL(url).pathname.replace("/pages", "")
        : (<RegExpOne> /^[^:]+:\/\/./).test(url) && !url.startsWith("file:")
        ? ":" + (url.split("/", 3).join("/") + "/")
        : ":" + url;
      PopExclusionRulesOption.generateDefaultPattern_ = () => url2;
      return url2;
    }
  }

  let saved = true, oldPass: string | null = null, curLockedStatus = Frames.Status.__fake
    , inited: 0 | 1 /* no initial matches */ | 2 /* some matched */ | 3 /* is saving (temp status) */ = 0
  ;
  function collectPass(pass: string): string {
    pass = pass.trim();
    const isReverted = pass.startsWith("^");
    isReverted && (pass = pass.slice(1).trimLeft());
    const dict = Object.create<1>(null);
    for (let i of pass.split(" ")) {
      dict[i] = 1;
    }
    return (isReverted ? "^ " : "") + Object.keys(dict).sort().join(" ");
  }
  function updateState(updateOldPass: boolean): void {
    const isSaving = inited === 3;
    let pass = isSaving ? bgExclusions.GetPassKeys_(url, frameInfo)
          : bgExclusions.getTemp_(url, frameInfo, exclusions.readValueFromElement_(true));
    pass && (pass = collectPass(pass));
    if (updateOldPass) {
      oldPass = inited >= 2 ? pass : null;
    }
    inited = 2;
    const same = pass === oldPass;
    const isReverted = !!pass && pass.length > 2 && pass[0] === "^";
    stateAction.textContent =
      (isSaving ? pass ? pTrans_("o137") + pTrans_(isReverted ? "o138" : "o139") : pTrans_("o140")
        : pTrans_(same ? "o141" : "o142") + pTrans_(pass ? isReverted ? "o138" : "o139" : same ? "o143" : "o143_2")
        ).replace(" to be", "")
      + pTrans_("colon") + (pass ? pTrans_("NS") : "");
    stateValue.className = pass ? "code" : "fixed-width";
    stateValue.textContent = pass ? isReverted ? pass.slice(2) : pass
      : pTrans_(pass !== null ? "o144" : "o145") + pTrans_("o146");
    stateTail.textContent = curIsLocked && !isSaving && same
      ? pTrans_("o147", [pTrans_(curLockedStatus !== Frames.Status.enabled ? "o144" : "o145")])
      : curIsLocked ? pTrans_("o148") : "";
    saveBtn.disabled = same;
    (saveBtn.firstChild as Text).data = pTrans_(same ? "o115" : "o115_2");
  }
  function onUpdated(this: void): void {
    if (saved) {
      saved = false;
      let el = $("#helpSpan");
      if (el) {
        (el.nextElementSibling as HTMLElement).style.display = "";
        el.remove();
      }
      saveBtn.removeAttribute("disabled");
      (saveBtn.firstChild as Text).data = pTrans_("o115_2");
    }
    updateState(inited < 2);
  }
  function saveOptions(this: void): void {
    if (saveBtn.disabled) {
      return;
    }
    const testers = bgExclusions.testers_;
    BG_.Backend_.forceStatus_("reset silent", frameInfo.t);
    exclusions.save_();
    setTimeout(function () {
      bgExclusions.testers_ = testers;
    }, 50);
    inited = 3;
    updateState(true);
    (saveBtn.firstChild as Text).data = pTrans_("o115_3");
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      saveBtn.blur();
    }
    saveBtn.disabled = true;
    saved = true;
  }
  saveBtn.onclick = saveOptions;
  document.addEventListener("keyup", function (event): void {
    if (event.keyCode === kKeyCode.enter && (event.ctrlKey || event.metaKey)) {
      setTimeout(window.close, 300);
      if (!saved) { return saveOptions(); }
    }
  });

  const rules = bgSettings_.get_("exclusionRules")
    , ref1 = bgExclusions.testers_ = BG_.Object.create(null)
    , ref2 = bgExclusions.rules_;
  for (let _i = 0, _len = rules.length; _i < _len; _i++) {
    ref1[rules[_i].pattern] = ref2[_i];
  }
  const toggleAction = frameInfo.s !== Frames.Status.disabled ? "Disable" : "Enable"
    , curIsLocked = !!(frameInfo.f & Frames.Flags.locked);
  curLockedStatus = curIsLocked ? frameInfo.s : Frames.Status.__fake;
  let el0 = $<EnsuredMountedHTMLElement>("#toggleOnce"), el1 = el0.nextElementSibling;
  nextTick_(() => {
  el0.firstElementChild.textContent = (pTrans_(toggleAction) || toggleAction) + (curIsLocked ? "" : pTrans_("Once"));
  el0.onclick = forceState.bind(null, toggleAction);
  stateValue.id = "state-value";
  if (curIsLocked) {
    el1.classList.remove("hidden");
    el1.firstElementChild.onclick = forceState.bind(null, "Reset");
  } else {
    el1.remove();
  }
  });
  if (!(Build.BTypes & BrowserType.Chrome)
      || Build.BTypes & ~BrowserType.Chrome && bgOnOther_ !== BrowserType.Chrome
      || !bgSettings_.payload_.o
      ) {
    window.addEventListener("keydown", function (event): void {
      if (event.altKey
          && (event.keyCode === kKeyCode.X || curIsLocked && event.keyCode === kKeyCode.Z)
          && !(event.shiftKey || event.ctrlKey || event.metaKey)
          ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        forceState(event.keyCode === kKeyCode.X ? toggleAction : "Reset");
      }
    });
  }
  Option_.suppressPopulate_ = false;
  let exclusions: PopExclusionRulesOption = null as never;
  exclusions = new PopExclusionRulesOption($("#exclusionRules"), onUpdated);
  exclusions.fetch_();
  if (!Build.NDEBUG) {
    interface WindowEx extends Window { exclusions?: PopExclusionRulesOption }
    (window as WindowEx).exclusions = exclusions;
  }
  window.onunload = function (): void {
    bgExclusions.testers_ = null as never;
    BG_.BgUtils_.GC_(-1);
  };
  setupBorderWidth_ && nextTick_(setupBorderWidth_);

  function forceState(act: "Reset" | "Enable" | "Disable", event?: EventToPrevent): void {
    event && event.preventDefault();
    BG_.Backend_.forceStatus_(act.toLowerCase() as "reset" | "enable" | "disable", frameInfo.t);
    window.close();
  }
}));
