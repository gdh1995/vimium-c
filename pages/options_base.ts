/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
/// <reference path="../types/bg.exclusions.d.ts" />
type AllowedOptions = SettingsNS.PersistentSettings;
interface Checker<T extends keyof AllowedOptions> {
  init? (): any;
  check (value: AllowedOptions[T]): AllowedOptions[T];
}

const KeyRe = <RegExpG> /<(?!<)(?:a-)?(?:c-)?(?:m-)?(?:[A-Z][\dA-Z]+|[a-z][\da-z]+|\S)>|\S/g,
__extends = function(child: Function, parent: Function): void {
  function __(this: { constructor: Function } ) { this.constructor = parent; }
  __.prototype = parent.prototype;
  child.prototype = new (__ as any)();
  (child as any).__super__ = parent.prototype;
},
debounce = function<T> (this: void, func: (this: T) => void
    , wait: number, bound_context: T, also_immediate: number
    ): (this: void) => void {
  let timeout = 0, timestamp: number;
  const later = function() {
    const last = Date.now() - timestamp;
    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
      return;
    }
    timeout = 0;
    if (timestamp !== also_immediate) {
      return func.call(bound_context);
    }
  };
  also_immediate = also_immediate ? 1 : 0;
  return function() {
    timestamp = Date.now();
    if (timeout) { return; }
    timeout = setTimeout(later, wait);
    if (also_immediate) {
      also_immediate = timestamp;
      return func.call(bound_context);
    }
  };
} as <T> (this: void, func: (this: T) => void
          , wait: number, bound_context: T, also_immediate: BOOL
          ) => (this: void) => void;

var $ = document.getElementById.bind(document) as <T extends HTMLElement>(id: string) => T
  , BG = chrome.extension.getBackgroundPage() as Window, bgSettings = BG.Settings;

abstract class Option<T extends keyof AllowedOptions> {
  readonly element: HTMLElement;
  readonly field: T;
  previous: AllowedOptions[T];
  saved: boolean;
  locked?: boolean;
  readonly onUpdated: (this: void) => void;
  checker?: Checker<T>;

  static all = Object.create(null) as {
    [T in keyof AllowedOptions]: Option<T>;
  } & SafeObject;
  static syncToFrontend: Array<keyof SettingsNS.FrontendSettings>;

constructor (element: HTMLElement, onUpdated: (this: Option<T>) => void) {
  this.element = element;
  this.field = element.id as T;
  this.previous = this.onUpdated = null as never;
  this.saved = true;
  if (this.field in bgSettings.bufferToLoad) {
    onUpdated = this._onCacheUpdated.bind(this, onUpdated);
  }
  this.fetch();
  (Option.all as SafeDict<Option<keyof AllowedOptions>>)[this.field] = this;
  this.onUpdated = debounce(onUpdated, 330, this, 1);
}

fetch (): void {
  this.saved = true;
  return this.populateElement(this.previous = bgSettings.get(this.field));
}
normalize (value: AllowedOptions[T], isJSON: boolean, str?: string): AllowedOptions[T] {
  const checker = this.checker;
  if (isJSON) {
    str = checker || !str ? JSON.stringify(checker ? checker.check(value) : value) : str;
    return BG.JSON.parse(str);
  }
  return checker ? checker.check(value) : value;
}
save (): void {
  let value = this.readValueFromElement(), notJSON = typeof value !== "object"
    , previous = notJSON ? JSON.stringify(this.previous) : this.previous, str: string;
  if (typeof value === "object") {
    str = JSON.stringify(value);
    if (str === previous) { return; }
    previous = str;
    if (str === JSON.stringify(bgSettings.defaults[this.field])) {
      value = bgSettings.defaults[this.field];
    } else {
      value = this.normalize(value, true, str);
      str = "";
    }
  } else if (value === previous) {
    return;
  } else {
    value = this.normalize(value, false);
  }
  bgSettings.set(this.field, value);
  this.previous = value = bgSettings.get(this.field);
  this.saved = true;
  if (previous !== (notJSON ? value : JSON.stringify(value))) {
    this.populateElement(value);
  }
  if (this.field in bgSettings.bufferToLoad) {
    Option.syncToFrontend.push(this.field as keyof SettingsNS.FrontendSettings);
  }
}
abstract readValueFromElement (): AllowedOptions[T];
abstract populateElement (value: AllowedOptions[T]): void;
_onCacheUpdated: <T extends keyof SettingsNS.FrontendSettings>(this: Option<T>
  , onUpdated: (this: Option<T>) => void) => void;
areEqual: (this: Option<T>, a: AllowedOptions[T], b: AllowedOptions[T]) => boolean;
atomicUpdate: (this: Option<T> & {element: TextElement}, value: string, undo: boolean, locked: boolean) => void;

static areJSONEqual (this: void, a: object, b: object): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
static saveOptions: (this: void) => void;
static needSaveOptions: (this: void) => boolean;
}


class ExclusionRulesOption extends Option<"exclusionRules"> {
  template: HTMLTableRowElement;
  list: HTMLTableSectionElement;
constructor (element: HTMLElement, onUpdated: (this: ExclusionRulesOption) => void) {
  super(element, onUpdated);
  bgSettings.fetchFile("exclusionTemplate", (): void => {
    this.element.innerHTML = bgSettings.cache.exclusionTemplate as string;
    this.template = $<HTMLTemplateElement>('exclusionRuleTemplate').content.firstChild as HTMLTableRowElement;
    this.list = this.element.getElementsByTagName('tbody')[0] as HTMLTableSectionElement;
    this.fetch = super.fetch;
    this.fetch();
    this.list.addEventListener("input", this.onUpdated);
    this.list.addEventListener("click", e => this.onRemoveRow(e));
    $("exclusionAddButton").onclick = () => this.addRule("");
    return this.onInit();
  });
}
fetch(): void {}
onRowChange (_isInc: number): void {}
addRule (pattern: string): HTMLTableRowElement {
  const element = this.appendRule(this.list, {
    pattern: pattern,
    passKeys: ""
  });
  this.getPattern(element).focus();
  if (pattern) {
    this.onUpdated();
  }
  this.onRowChange(1);
  return element;
}
populateElement (rules: ExclusionsNS.StoredRule[]): void {
  this.list.textContent = "";
  const frag = document.createDocumentFragment();
  rules.forEach(this.appendRule.bind(this, frag));
  this.list.appendChild(frag);
  return this.onRowChange(rules.length);
}
appendRule (list: HTMLTableSectionElement | DocumentFragment, rule: ExclusionsNS.StoredRule): HTMLTableRowElement {
  const row = document.importNode(this.template, true);
  let el = row.querySelector('.pattern') as HTMLInputElement, value: string;
  el.value = value = rule.pattern;
  if (value) {
    el.placeholder = "";
  }
  el = row.querySelector('.passKeys') as HTMLInputElement;
  el.value = value = rule.passKeys.trimRight();
  if (value) {
    el.placeholder = "";
  } else {
    el.addEventListener("input", ExclusionRulesOption.OnNewPassKeyInput);
  }
  list.appendChild(row);
  return row;
}
static OnNewPassKeyInput (this: HTMLInputElement): void {
  this.removeEventListener("input", ExclusionRulesOption.OnNewPassKeyInput);
  this.title = "Example: " + this.placeholder;
  this.placeholder = "";
}
onRemoveRow (event: Event): void {
  let element = event.target as HTMLElement;
  for (let i = 0; i < 2; i++) {
    if (element.classList.contains("exclusionRemoveButton")) { break; }
    element = element.parentElement as HTMLElement;
  }
  element = (element.parentNode as Node).parentNode as HTMLElement;
  if (element.classList.contains("exclusionRuleInstance")) {
    element.remove();
    this.onUpdated();
    return this.onRowChange(0);
  }
}

reChar: RegExpOne;
_escapeRe: RegExpG;
readValueFromElement (part?: boolean): AllowedOptions["exclusionRules"] {
  const rules: ExclusionsNS.StoredRule[] = [],
  _ref = this.element.getElementsByClassName<HTMLTableRowElement>("exclusionRuleInstance");
  part = (part === true);
  for (let _i = 0, _len = _ref.length; _i < _len; _i++) {
    const element = _ref[_i];
    if (part && element.style.display === "none") {
      continue;
    }
    let pattern = this.getPattern(element).value.trim();
    if (!pattern) {
      continue;
    }
    if (pattern[0] === ":" || element.style.display === "none") {}
    else if (this.reChar.test(pattern)) {
      pattern = pattern[0] === "^" ? pattern
        : (pattern.indexOf("://") === -1 ? "^http://" : "^") +
          (pattern[0] === "*" ? "." + pattern : pattern);
    } else {
      pattern = pattern.replace(this._escapeRe, "$1");
      pattern = (pattern.indexOf("://") === -1 ? ":http://" : ":") + pattern;
    }
    let passKeys = this.getPassKeys(element).value;
    if (passKeys) {
      const passArr = passKeys.match(KeyRe);
      passKeys = passArr ? (passArr.sort().join(" ") + " ") : "";
    }
    rules.push({
      pattern: pattern,
      passKeys: passKeys
    });
  }
  return rules;
}

readonly areEqual = Option.areJSONEqual;
getPattern (element: HTMLTableRowElement): HTMLInputElement {
  return element.getElementsByClassName<HTMLInputElement>("pattern")[0];
}
getPassKeys (element: HTMLTableRowElement): HTMLInputElement {
  return element.getElementsByClassName<HTMLInputElement>("passKeys")[0];
}
onInit (): void {}
sortRules: (el?: HTMLElement) => void;
}
ExclusionRulesOption.prototype.reChar = <RegExpOne> /^[\^*]|[^\\][$()*+?\[\]{|}]/;
ExclusionRulesOption.prototype._escapeRe = <RegExpG> /\\(.)/g;

location.pathname.indexOf("/popup.html") !== -1 && BG.Utils.require("Exclusions").then((function(callback) {
  return function() {
    chrome.tabs.query({currentWindow: true as true, active: true as true}, callback);
  };
})((function(tabs: [chrome.tabs.Tab] | never[]): void {
interface PopExclusionRulesOption extends ExclusionRulesOption {
  url: string;
  init(this: PopExclusionRulesOption, url: string, element: HTMLElement
    , onUpdated: (this: PopExclusionRulesOption) => void, onInit: (this: PopExclusionRulesOption) => void
    ): void;
  rebuildTesters (this: PopExclusionRulesOption): void;
  addRule (): HTMLTableRowElement;
  populateElement (rules: ExclusionsNS.StoredRule[]): void;
  OnInput (this: void, event: Event): void;
  generateDefaultPattern (this: PopExclusionRulesOption): string;
}

const bgExclusions: ExclusionsNS.ExclusionsCls = BG.Exclusions, escapeRe = <RegExpG & RegExpSearchable<0>> /[&<>]/g,
exclusions: PopExclusionRulesOption = Object.setPrototypeOf({
  url: "",
  init (this: PopExclusionRulesOption, url: string, element: HTMLElement
      , onUpdated: (this: ExclusionRulesOption) => void, onInit: (this: ExclusionRulesOption) => void
      ): void {
    this.url = url;
    this.rebuildTesters();
    this.onInit = onInit;
    (ExclusionRulesOption as any).call(this, element, onUpdated);
    this.element.addEventListener("input", this.OnInput);
    this.init = null as never;
  },
  rebuildTesters (this: PopExclusionRulesOption): void {
    const rules = bgSettings.get("exclusionRules")
      , ref = bgExclusions.testers = BG.Object.create(null)
      , ref2 = bgExclusions.rules;
    for (let _i = 0, _len = rules.length; _i < _len; _i++) {
      ref[rules[_i].pattern] = ref2[_i * 2];
    }
    this.rebuildTesters = null as never;
  },
  addRule (this: PopExclusionRulesOption): HTMLTableRowElement {
    return ExclusionRulesOption.prototype.addRule.call(this, this.generateDefaultPattern());
  },
  populateElement (this: PopExclusionRulesOption, rules: ExclusionsNS.StoredRule[]): void {
    ExclusionRulesOption.prototype.populateElement.call(this, rules);
    const elements = this.element.getElementsByClassName<HTMLTableRowElement>("exclusionRuleInstance");
    let haveMatch = -1;
    for (let _i = 0, _len = elements.length; _i < _len; _i++) {
      const element = elements[_i];
      const pattern = this.getPattern(element).value.trim();
      if ((bgExclusions.testers as EnsuredSafeDict<ExclusionsNS.Tester>)[pattern](this.url)) {
        haveMatch = _i;
      } else {
        element.style.display = "none";
      }
    }
    if (haveMatch >= 0) {
      this.getPassKeys(elements[haveMatch]).focus();
    } else {
      this.addRule();
    }
    this.populateElement = null as never;
  },
  OnInput (this: void, event: Event): void {
    const patternElement = event.target as HTMLInputElement;
    if (!patternElement.classList.contains("pattern")) {
      return;
    }
    if (bgExclusions.getRe(patternElement.value)(exclusions.url)) {
      patternElement.title = patternElement.style.color = "";
    } else {
      patternElement.style.color = "red";
      patternElement.title = "Red text means that the pattern does not\nmatch the current URL.";
    }
  },
  generateDefaultPattern (this: PopExclusionRulesOption): string {
    const url = this.url.lastIndexOf("https:", 0) === 0
      ? "^https?://" + this.url.split("/", 3)[2].replace(<RegExpG>/\./g, "\\.") + "/"
      : (<RegExpOne>/^[^:]+:\/\/./).test(this.url)
      ? ":" + (this.url.split("/", 3).join("/") + "/")
      : ":" + this.url;
    this.generateDefaultPattern = function() { return url; };
    return url;
  }
}, ExclusionRulesOption.prototype);

  let saved = true;
  function escapeCallback(c: string): string {
    const n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  }
  function updateState(): void {
    const pass = bgExclusions.getTemp(exclusions.url, exclusions.readValueFromElement(true));
    $("state").innerHTML = "Vimium++ will " + (pass
      ? "exclude: <span class='code'>" + pass.replace(escapeRe, escapeCallback) + "</span>"
      : pass !== null ? "be disabled" : "be enabled");
  }
  function onUpdated(this: void): void {
    if (saved) {
      saved = false;
      const btn = $("saveOptions");
      $("helpSpan").innerHTML = "Type <strong>Ctrl-Enter</strong> to save and close.";
      btn.removeAttribute("disabled");
      (btn.firstChild as Text).data = "Save Changes";
    }
    if (!exclusions.init) {
      updateState();
    }
  }
  function saveOptions(this: void): void {
    const btn = $<HTMLButtonElement>("saveOptions");
    if (btn.disabled) {
      return;
    }
    const testers = bgExclusions.testers;
    exclusions.save();
    bgExclusions.testers = testers;
    (btn.firstChild as Text).data = "Saved";
    btn.disabled = true;
    saved = true;
  }
  $("saveOptions").onclick = saveOptions;
  document.addEventListener("keyup", function(event): void {
    if ((event.ctrlKey || event.metaKey) && event.keyCode === 13) {
      setTimeout(window.close, 300);
      if (!saved) { return saveOptions(); }
    }
  });
  const ref = bgSettings.indexPorts(tabs[0].id);
  exclusions.init(ref ? ref[0].sender.url : tabs[0].url, $("exclusionRules"), onUpdated, updateState);
  $("optionsLink").onclick = function(this: HTMLAnchorElement, event: Event): void {
    event.preventDefault();
    const a: MarksNS.FocusOrLaunch = BG.Object.create(null);
    a.url = bgSettings.CONST.OptionsPage;
    BG.g_requestHandlers.focusOrLaunch(a);
    window.close();
  };
  interface WindowEx extends Window { exclusions?: PopExclusionRulesOption; }
  (window as WindowEx).exclusions = exclusions;
  window.onunload = function(): void {
    bgExclusions.testers = null;
  };
})));
