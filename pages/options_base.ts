/// <reference path="../content/base.d.ts" />
/// <reference path="../background/bg.d.ts" />
/// <reference path="../background/bg.exclusions.d.ts" />
type AllowedOptions = SettingsNS.PersistentSettings;
interface Checker<T extends keyof AllowedOptions> {
  init? (): any;
  check (value: AllowedOptions[T]): AllowedOptions[T];
}

declare var browser: never;
if (typeof browser !== "undefined" && (browser && (browser as any).runtime) != null) {
  window.chrome = browser;
}
const KeyRe = <RegExpG> /<(?!<)(?:a-)?(?:c-)?(?:m-)?(?:[A-Z][\dA-Z]+|[a-z][\da-z]+|\S)>|\S/g,
__extends = function(child: Function, parent: Function): void {
  function __(this: { constructor: Function } ) { this.constructor = child; }
  __.prototype = parent.prototype;
  child.prototype = new (__ as any)();
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

var _idRegex = <RegExpOne> /^#[0-9A-Z_a-z]+$/,
$ = function<T extends HTMLElement>(selector: string): T {
  if (selector[0] === "#") {
    return document.getElementById(selector.substring(1)) as T;
  }
  return document.querySelector(selector) as T;
},
BG = chrome.extension.getBackgroundPage() as Window, bgSettings = BG.Settings;

abstract class Option<T extends keyof AllowedOptions> {
  readonly element: HTMLElement;
  readonly field: T;
  previous: AllowedOptions[T];
  saved: boolean;
  locked?: boolean;
  readonly onUpdated: (this: void) => void;
  onSave?(): void;
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
allowToSave (): boolean { return true; }
save (): void {
  let value = this.readValueFromElement(), isJSON = typeof value === "object"
    , previous = isJSON ? JSON.stringify(this.previous) : this.previous
    , pod = isJSON ? JSON.stringify(value) : value;
  if (pod === previous) { return; }
  previous = pod;
  value = this.normalize(value, isJSON, isJSON ? pod as string : "");
  if (isJSON) {
    pod = JSON.stringify(value);
    if (pod === JSON.stringify(bgSettings.defaults[this.field])) {
      value = bgSettings.defaults[this.field];
    }
  }
  bgSettings.set(this.field, value);
  this.previous = value = bgSettings.get(this.field);
  this.saved = true;
  if (previous !== (isJSON ? JSON.stringify(value) : value)) {
    this.populateElement(value, true);
  }
  if (this.field in bgSettings.bufferToLoad) {
    Option.syncToFrontend.push(this.field as keyof SettingsNS.FrontendSettings);
  }
  this.onSave && this.onSave();
}
abstract readValueFromElement (): AllowedOptions[T];
abstract populateElement (value: AllowedOptions[T], enableUndo?: boolean): void;
_onCacheUpdated: (this: Option<T>, onUpdated: (this: Option<T>) => void) => void;
areEqual: (this: Option<T>, a: AllowedOptions[T], b: AllowedOptions[T]) => boolean;
atomicUpdate: (this: Option<T> & {element: TextElement}, value: string, undo: boolean, locked: boolean) => void;

static areJSONEqual (this: void, a: object, b: object): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
static saveOptions: (this: void) => boolean;
static needSaveOptions: (this: void) => boolean;
showError: (msg: string, tag?: OptionErrorType | null, errors?: boolean) => void;
}
type OptionErrorType = "has-error" | "highlight";


class ExclusionRulesOption extends Option<"exclusionRules"> {
  template: HTMLTableRowElement;
  list: HTMLTableSectionElement;
constructor (element: HTMLElement, onUpdated: (this: ExclusionRulesOption) => void) {
  super(element, onUpdated);
  bgSettings.fetchFile("exclusionTemplate", (): void => {
    this.element.innerHTML = bgSettings.cache.exclusionTemplate as string;
    this.template = $<HTMLTemplateElement>("#exclusionRuleTemplate").content.firstChild as HTMLTableRowElement;
    this.list = this.element.getElementsByTagName('tbody')[0] as HTMLTableSectionElement;
    this.fetch = super.fetch;
    this.fetch();
    this.list.addEventListener("input", this.onUpdated);
    this.list.addEventListener("click", e => this.onRemoveRow(e));
    $("#exclusionAddButton").onclick = () => this.addRule("");
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
  if (rules.length <= 0) {}
  else if (rules.length === 1) {
    this.appendRule(this.list, rules[0]);
  } else {
    const frag = document.createDocumentFragment();
    rules.forEach(this.appendRule.bind(this, frag));
    this.list.appendChild(frag);
  }
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

_reChar: RegExpOne;
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
    else if (this._reChar.test(pattern)) {
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
timer?: number;
}
ExclusionRulesOption.prototype._reChar = <RegExpOne> /^[\^*]|[^\\][$()*+?\[\]{|}]/;
ExclusionRulesOption.prototype._escapeRe = <RegExpG> /\\(.)/g;

if (bgSettings.CONST.ChromeVersion >= BrowserVer.MinSmartSpellCheck) {
  (document.documentElement as HTMLElement).removeAttribute("spellcheck");
}

if (bgSettings.CONST.ChromeVersion < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
  || window.devicePixelRatio < 2 && bgSettings.CONST.ChromeVersion >= BrowserVer.MinRoundedBorderWidthIsNotEnsured
) (function(): void {
  const css = document.createElement("style"), ratio = window.devicePixelRatio, version = bgSettings.CONST.ChromeVersion;
  const onlyInputs = version >= BrowserVer.MinRoundedBorderWidthIsNotEnsured && ratio >= 1;
  let scale: string | number = onlyInputs || version >= BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo ? 1.12 / ratio : 1;
  scale = ("" + scale).substring(0, 7);
  css.textContent = onlyInputs ? `input, textarea { border-width: ${scale}px; }`
    : `* { border-width: ${scale}px !important; }`;
  (document.head as HTMLHeadElement).appendChild(css);
})();

$<HTMLElement>(".version").textContent = bgSettings.CONST.CurrentVersion;

location.pathname.indexOf("/popup.html") !== -1 && BG.Utils.require("Exclusions").then((function(callback) {
  return function() {
    chrome.tabs.query({currentWindow: true as true, active: true as true}, callback);
  };
})(function(tabs: [chrome.tabs.Tab] | never[]): void {
interface PopExclusionRulesOption extends ExclusionRulesOption {
  inited: 0 | 1 /* no initial matches */ | 2 /* some matched */ | 3 /* is saving (temp status) */;
  init(this: PopExclusionRulesOption, element: HTMLElement
    , onUpdated: (this: PopExclusionRulesOption) => void, onInit: (this: PopExclusionRulesOption) => void
    ): void;
  rebuildTesters (this: PopExclusionRulesOption): void;
  addRule (): HTMLTableRowElement;
  populateElement (rules: ExclusionsNS.StoredRule[]): void;
  OnInput (this: void, event: Event): void;
  generateDefaultPattern (this: PopExclusionRulesOption): string;
}
  let ref = BG.Backend.indexPorts(tabs[0].id), blockedMsg = $("#blocked-msg");
  const notRunnable = !ref && !(tabs[0] && tabs[0].url && tabs[0].status === "loading"
    && (tabs[0].url.lastIndexOf("http", 0) === 0 || tabs[0].url.lastIndexOf("ftp", 0) === 0));
  if (notRunnable) {
    const body = document.body as HTMLBodyElement;
    body.textContent = "";
    blockedMsg.style.display = "";
    (blockedMsg.querySelector(".version") as HTMLElement).textContent = bgSettings.CONST.CurrentVersion;
    const refreshTip = blockedMsg.querySelector("#refresh-after-install") as HTMLElement;
    if (!tabs[0] || !tabs[0].url || !(tabs[0].url.lastIndexOf("http", 0) === 0 || tabs[0].url.lastIndexOf("ftp", 0) === 0)) {
      refreshTip.remove();
    } else if (BG.IsEdge) {
      (refreshTip.querySelector(".action") as HTMLElement).textContent = "open a new web page";
    }
    body.style.width = "auto";
    body.appendChild(blockedMsg);
    (document.documentElement as HTMLHtmlElement).style.height = "";
  } else {
    blockedMsg.remove();
    blockedMsg = null as never;
  }
  const element = $<HTMLAnchorElement>(".options-link"), optionsUrl = bgSettings.CONST.OptionsPage;
  element.href !== optionsUrl && (element.href = optionsUrl);
  element.onclick = function(this: HTMLAnchorElement, event: Event): void {
    event.preventDefault();
    const a: MarksNS.FocusOrLaunch = BG.Object.create(null);
    a.url = bgSettings.CONST.OptionsPage;
    BG.Backend.focus(a);
    window.close();
  };
  if (notRunnable) {
    return;
  }

const bgExclusions: ExclusionsNS.ExclusionsCls = BG.Exclusions,
tabId = ref ? ref[0].sender.tabId : tabs[0].id,
stateLine = $("#state"), saveBtn = $<HTMLButtonElement>("#saveOptions"),
url = ref ? ref[0].sender.url : tabs[0].url,
exclusions: PopExclusionRulesOption = Object.setPrototypeOf({
  inited: 0,
  init (this: PopExclusionRulesOption, element: HTMLElement
      , onUpdated: (this: ExclusionRulesOption) => void, onInit: (this: ExclusionRulesOption) => void
      ): void {
    this.rebuildTesters();
    this.onInit = onInit;
    (ExclusionRulesOption as any).call(this, element, onUpdated);
    this.element.addEventListener("input", this.OnInput);
    this.init = null as never;
  },
  rebuildTesters (this: PopExclusionRulesOption): void {
    const rules = bgSettings.get("exclusionRules")
      , ref1 = bgExclusions.testers = BG.Object.create(null)
      , ref2 = bgExclusions.rules;
    for (let _i = 0, _len = rules.length; _i < _len; _i++) {
      ref1[rules[_i].pattern] = ref2[_i * 2];
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
      const rule = (bgExclusions.testers as EnsuredSafeDict<ExclusionsNS.Tester>)[pattern];
      if (typeof rule === "string" ? !url.lastIndexOf(rule, 0) : rule.test(url)) {
        haveMatch = _i;
      } else {
        element.style.display = "none";
      }
    }
    if (this.inited === 0) {
      if (haveMatch >= 0) {
        this.getPassKeys(elements[haveMatch]).focus();
      } else {
        this.addRule();
      }
      this.inited = haveMatch >= 0 ? 2 : 1;
    }
    this.populateElement = null as never;
  },
  OnInput (this: void, event: Event): void {
    const patternElement = event.target as HTMLInputElement;
    if (!patternElement.classList.contains("pattern")) {
      return;
    }
    const rule = bgExclusions.getRe(patternElement.value);
    if (typeof rule === "string" ? !url.lastIndexOf(rule, 0) : rule.test(url)) {
      patternElement.title = patternElement.style.color = "";
    } else {
      patternElement.style.color = "red";
      patternElement.title = "Red text means that the pattern does not\nmatch the current URL.";
    }
  },
  generateDefaultPattern (this: PopExclusionRulesOption): string {
    const url2 = url.lastIndexOf("https:", 0) === 0
      ? "^https?://" + url.split("/", 3)[2].replace(<RegExpG>/[.[\]]/g, "\\$&") + "/"
      : (<RegExpOne>/^[^:]+:\/\/./).test(url) && url.lastIndexOf("file:", 0) < 0
      ? ":" + (url.split("/", 3).join("/") + "/")
      : ":" + url;
    this.generateDefaultPattern = () => url2;
    return url2;
  }
}, ExclusionRulesOption.prototype);

  let saved = true, oldPass: string | null = null, curLockedStatus = Frames.Status.__fake;
  function collectPass(pass: string): string {
    pass = pass.trim();
    const dict = Object.create<1>(null);
    for (let i of pass.split(" ")) {
      const n = i.charCodeAt(0);
      i = n === KnownKey.lt ? "&lt;" : n === KnownKey.gt ? "&gt;" : n === KnownKey.and ? "&amp;" : i;
      dict[i] = 1;
    }
    return Object.keys(dict).join(" ");
  }
  function updateState(initing: boolean): void {
    let pass = bgExclusions.getTemp(url, exclusions.readValueFromElement(true));
    pass && (pass = collectPass(pass));
    if (initing) {
      oldPass = exclusions.inited >= 2 ? pass : null;
    }
    const isSaving = exclusions.inited === 3;
    exclusions.inited = 2;
    const same = pass === oldPass;
    let html = '<span class="Vim">Vim</span>ium <span class="C">C</span> '
      + (isSaving ? pass ? "becomes to exclude" : "becomes"
        : (same ? "keeps to " : "will ") + (pass ? "exclude" : "be"))
      + (pass
      ? `: <span class="state-value code">${pass}</span>`
      : `:<span class="state-value fixed-width">${pass !== null ? 'disabled' : ' enabled'}</span>`);
    if (curLockedStatus !== Frames.Status.__fake && !isSaving && same) {
      html += ` (on this tab, ${curLockedStatus === Frames.Status.enabled ? "enabled" : "disabled"} for once)`;
    }
    stateLine.innerHTML = html;
    saveBtn.disabled = same;
    (saveBtn.firstChild as Text).data = same ? "No Changes" : "Save Changes";
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
      (saveBtn.firstChild as Text).data = "Save Changes";
    }
    if (!exclusions.init) {
      updateState(false);
    }
  }
  function saveOptions(this: void): void {
    if (saveBtn.disabled) {
      return;
    }
    const testers = bgExclusions.testers;
    BG.Backend.forceStatus("reset", tabId);
    exclusions.save();
    setTimeout(function() {
      bgExclusions.testers = testers;
    }, 50);
    exclusions.inited = 3;
    updateState(true);
    (saveBtn.firstChild as Text).data = "Saved";
    saveBtn.disabled = true;
    saved = true;
  }
  saveBtn.onclick = saveOptions;
  document.addEventListener("keyup", function(event): void {
    if (event.keyCode === VKeyCodes.enter && (event.ctrlKey || event.metaKey)) {
      setTimeout(window.close, 300);
      if (!saved) { return saveOptions(); }
    }
  });
  exclusions.init($("#exclusionRules"), onUpdated, function (): void {
    let sender = ref ? ref[0].sender : { status: Frames.Status.enabled, flags: Frames.Flags.Default }, el: HTMLElement
      , newStat = sender.status !== Frames.Status.disabled ? "Disable" as "Disable" : "Enable" as "Enable";
    curLockedStatus = sender.flags & Frames.Flags.locked ? sender.status : Frames.Status.__fake;
    ref = null;
    el = $<HTMLElement>("#toggleOnce");
    el.textContent = newStat + " for once";
    el.onclick = forceState.bind(null, newStat);
    if (sender.flags & Frames.Flags.locked) {
      el = el.nextElementSibling as HTMLElement;
      el.classList.remove("hidden");
      el = el.firstElementChild as HTMLElement;
      el.onclick = forceState.bind(null, "Reset");
    }
    setTimeout(function(): void {
      (document.documentElement as HTMLHtmlElement).style.height = "";
    }, 17);
    this.onInit = null as never;
    return updateState(true);
  });
  interface WindowEx extends Window { exclusions?: PopExclusionRulesOption; }
  (window as WindowEx).exclusions = exclusions;
  window.onunload = function(): void {
    bgExclusions.testers = null;
    BG.Utils.GC();
  };

  function forceState(act: "Reset" | "Enable" | "Disable", event?: Event): void {
    event && event.preventDefault();
    BG.Backend.forceStatus(act.toLowerCase() as "reset" | "enable" | "disable", tabId);
    window.close();
  }
}));
