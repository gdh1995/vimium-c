type TextElement = HTMLInputElement | HTMLTextAreaElement;
interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEvent | null, hash?: "hash"): void;
}
interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEvent | null): void;
}
interface OptionWindow extends Window {
  _delayed: [string, MouseEvent | null];
}

const $$ = document.querySelectorAll.bind(document) as <T extends HTMLElement>(selector: string) => NodeListOf<T>;

Option.syncToFrontend = [];

Option.prototype._onCacheUpdated = function<T extends keyof SettingsNS.FrontendSettings
    > (this: Option<T>, func: (this: Option<T>) => void): void {
  func.call(this);
  if (window.VSettings) {
    window.VSettings.cache[this.field] = this.readValueFromElement();
  }
};

Option.saveOptions = function(): void {
  const arr = Option.all;
  for (let i in arr) {
    arr[i as keyof AllowedOptions].saved || arr[i as keyof AllowedOptions].save();
  }
};

Option.needSaveOptions = function(): boolean {
  const arr = Option.all;
  for (let i in arr) {
    if (!arr[i as keyof AllowedOptions].saved) {
      return true;
    }
  }
  return false;
};

Option.prototype.areEqual = function<T extends keyof AllowedOptions
    >(a: AllowedOptions[T], b: AllowedOptions[T]): boolean {
  return a === b;
};

Option.prototype.atomicUpdate = function<T extends keyof AllowedOptions
    >(this: Option<T> & {element: TextElement}, value: string
      , undo: boolean, locked: boolean): void {
  if (undo) {
    this.locked = true;
    document.activeElement !== this.element && this.element.focus();
    document.execCommand("undo");
  }
  this.locked = locked;
  this.element.select();
  document.execCommand("insertText", false, value);
  this.locked = false;
};

class NumberOption<T extends keyof AllowedOptions> extends Option<T> {
readonly element: HTMLInputElement;
previous: number;
wheelTime: number;
constructor (element: HTMLInputElement, onUpdated: (this: NumberOption<T>) => void) {
  super(element, onUpdated);
  this.element.oninput = this.onUpdated;
  this.element.onfocus = this.addWheelListener.bind(this);
}
populateElement (value: number): void {
  this.element.value = "" + value;
}
readValueFromElement (): number {
  return parseFloat(this.element.value);
}
addWheelListener (): void {
  const el = this.element, func = (e: WheelEvent): void => this.onWheel(e), onBlur = (): void => {
    el.removeEventListener("mousewheel", func, {passive: false});
    el.removeEventListener("blur", onBlur);
    this.wheelTime = 0;
  };
  this.wheelTime = 0;
  el.addEventListener("mousewheel", func, {passive: false});
  el.addEventListener("blur", onBlur);
}
onWheel (event: WheelEvent): void {
  event.preventDefault();
  const oldTime = this.wheelTime;
  let i = Date.now();
  if (i - oldTime < 100 && oldTime > 0) { return; }
  this.wheelTime = i;
  const el = this.element, inc = event.wheelDelta > 0, val0 = el.value;
  let val: string, func: undefined | ((n: string) => number) | (
        (this: HTMLInputElement, n?: number) => void) = inc ? el.stepUp : el.stepDown;
  if (typeof func === "function") {
    (func as (this: HTMLInputElement, n?: number) => void).call(el);
    val = el.value;
    el.value = val0;
  } else {
    func = parseFloat;
    let step = func(el.step) || 1;
    i = (+el.value || 0) + (inc ? step : -step);
    isNaN(step = func(el.max)) || (i = Math.min(i, step));
    isNaN(step = func(el.min)) || (i = Math.max(i, step));
    val = "" + i;
  }
  return this.atomicUpdate(val, oldTime > 0, false);
}
}

class TextOption<T extends keyof AllowedOptions> extends Option<T> {
readonly element: TextElement;
readonly converter: string;
previous: string;
constructor (element: TextElement, onUpdated: (this: TextOption<T>) => void) {
  super(element, onUpdated);
  this.element.oninput = this.onUpdated;
  this.converter = this.element.getAttribute("data-converter") || "";
}
whiteRe: RegExpG;
whiteMaskRe: RegExpG;
populateElement (value: AllowedOptions[T], enableUndo?: boolean): void {
  value = (value as string).replace(this.whiteRe, '\xa0');
  if (enableUndo !== true) {
    this.element.value = value as string;
    return;
  }
  return this.atomicUpdate(value as string, true, true);
}
readValueFromElement (): AllowedOptions[T] {
  let value = this.element.value.trim().replace(this.whiteMaskRe, ' ');
  if (value && this.converter) {
    value = this.converter === "lower" ? value.toLowerCase()
      : this.converter === "upper" ? value.toUpperCase()
      : value;
  }
  return value;
}
}
TextOption.prototype.whiteRe = <RegExpG> / /g;
TextOption.prototype.whiteMaskRe = <RegExpG> /\xa0/g;

class NonEmptyTextOption<T extends keyof AllowedOptions> extends TextOption<T> {
readValueFromElement (): string {
  let value = super.readValueFromElement() as string;
  if (!value) {
    value = bgSettings.defaults[this.field] as string;
    this.populateElement(value, true);
  }
  return value;
}
}

class JSONOption<T extends keyof AllowedOptions> extends TextOption<T> {
populateElement (obj: AllowedOptions[T], enableUndo?: boolean): void {
  const one = this.element instanceof HTMLInputElement, s0 = JSON.stringify(obj, null, one ? 1 : 2),
  s1 = one ? s0.replace(<RegExpG & RegExpSearchable<1>> /(,?)\n\s*/g, function(_, s) { return s ? ", " : ""; }) : s0;
  super.populateElement(s1, enableUndo);
}
readValueFromElement (): AllowedOptions[T] {
  let value = super.readValueFromElement(), obj: AllowedOptions[T] = null as never;
  if (value) {
    try {
      obj = JSON.parse<AllowedOptions[T]>(value as string);
    } catch (e) {
    }
  } else {
    obj = bgSettings.defaults[this.field];
    this.populateElement(obj, true);
  }
  return obj;
}
}

JSONOption.prototype.areEqual = Option.areJSONEqual;

class CheckBoxOption<T extends keyof AllowedOptions> extends Option<T> {
readonly element: HTMLInputElement;
previous: boolean;
constructor (element: HTMLInputElement, onUpdated: (this: CheckBoxOption<T>) => void) {
  super(element, onUpdated);
  this.element.onchange = this.onUpdated;
}
populateElement (value: boolean): void {
  this.element.checked = value;
}
readValueFromElement (): boolean {
  return this.element.checked;
}
}

ExclusionRulesOption.prototype.onRowChange = function(this: ExclusionRulesOption, isAdd: number): void {
  const count = this.list.childElementCount;
  if (count - isAdd !== 0) { return; }
  BG.Utils.require("Exclusions");
  const el = $("exclusionToolbar"), options = el.querySelectorAll('[data-model]');
  el.style.visibility = count > 0 ? "" : "hidden";
  for (let i = 0, len = options.length; i < len; i++) {
    const opt = Option.all[options[i].id as keyof AllowedOptions],
    style = (opt.element.parentNode as HTMLElement).style;
    style.visibility = isAdd || opt.saved ? "" : "visible";
    style.display = !isAdd && opt.saved ? "none" : "";
  }
};

ExclusionRulesOption.prototype.onInit = function(this: ExclusionRulesOption): void {
  if (this.previous.length > 0) {
    $("exclusionToolbar").style.visibility = "";
  }
};

interface SaveBtn extends HTMLButtonElement {
  onclick (this: SaveBtn, virtually?: MouseEvent | false): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}
(function() {
  const saveBtn = $<SaveBtn>("saveOptions"), exportBtn = $<HTMLButtonElement>("exportButton");
  let status = false;

  function onUpdated<T extends keyof AllowedOptions> (this: Option<T>): void {
    if (this.locked) { return; }
    if (this.saved = this.areEqual(this.readValueFromElement(), this.previous)) {
      if (status && !Option.needSaveOptions()) {
        saveBtn.disabled = true;
        (saveBtn.firstChild as Text).data = "No Changes";
        exportBtn.disabled = false;
        status = false;
        window.onbeforeunload = null as never;
      }
      return;
    } else if (status) {
      return;
    }
    window.onbeforeunload = onBeforeUnload;
    status = true;
    saveBtn.disabled = false;
    (saveBtn.firstChild as Text).data = "Save Changes";
    exportBtn.disabled = true;
  }

  saveBtn.onclick = function(virtually): void {
    if (virtually !== false) {
      Option.saveOptions();
    }
    const toSync = Option.syncToFrontend;
    Option.syncToFrontend = [];
    this.disabled = true;
    (this.firstChild as Text).data = "No Changes";
    exportBtn.disabled = false;
    status = false;
    window.onbeforeunload = null as never;
    if (toSync.length === 0) { return; }
    setTimeout(doSyncToFrontend, 100, toSync);
  };
  function doSyncToFrontend (toSync: typeof Option.syncToFrontend): void {
    const ref = bgSettings.bufferToLoad, obj: BgReq["settingsUpdate"] = {name: "settingsUpdate"};
    let key: keyof SettingsNS.FrontendSettings;
    for (key of toSync) {
      obj[key] = ref[key] = bgSettings.get(key);
    }
    bgSettings.broadcast(obj);
  }

  let _ref: NodeListOf<HTMLElement> = $$("[data-model]"), element: HTMLElement;
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    const cls = (window as any)[(element.getAttribute("data-model") as string) + "Option"];
    new (cls as any)(element, onUpdated);
  }

  _ref = $$("[data-check]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.addEventListener(element.getAttribute("data-check") || "input", loadChecker);
  }

  let advancedMode = false;
  element = $<AdvancedOptBtn>("advancedOptionsButton");
  (element as AdvancedOptBtn).onclick = function(this: AdvancedOptBtn, _0, init): void {
    if (init == null || (init === "hash" && bgSettings.get("showAdvancedOptions") === false)) {
      advancedMode = !advancedMode;
      bgSettings.set("showAdvancedOptions", advancedMode);
    } else {
      advancedMode = bgSettings.get("showAdvancedOptions");
    }
    const el = $("advancedOptions");
    (el.previousElementSibling as HTMLElement).style.display = el.style.display = advancedMode ? "" : "none";
    (this.firstChild as Text).data = (advancedMode ? "Hide" : "Show") + " Advanced Options";
    this.setAttribute("aria-checked", "" + advancedMode);
  };
  (element as AdvancedOptBtn).onclick(null, true);

  document.addEventListener("keydown", function(this: void, event): void {
    if (event.keyCode !== VKeyCodes.space) { return; }
    const el = event.target;
    if ((el instanceof HTMLLabelElement) && !el.isContentEditable) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", function(this: void, event): void {
    const el = event.target as Element, i = event.keyCode;
    if (i !== VKeyCodes.enter) {
      if (i !== VKeyCodes.space) { return; }
      if ((el instanceof HTMLLabelElement) && !el.isContentEditable) {
        (el.control as HTMLElement).click();
        event.preventDefault();
      }
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      el.hasAttribute('href') || setTimeout(function(el) {
        el.click();
        el.blur();
      }, 0, el);
    } else if (event.ctrlKey || event.metaKey) {
      el.blur && el.blur();
      if (status) {
        return saveBtn.onclick();
      }
    }
  });

  _ref = document.getElementsByClassName("nonEmptyTextOption") as HTMLCollectionOf<HTMLElement>;
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.className += " example info";
    element.textContent = "Delete all to reset this option.";
  }

  let func: (this: HTMLElement, event: MouseEvent) => void = function(this: HTMLElement): void {
    const target = $(this.getAttribute("data-auto-resize") as string);
    if (target.scrollHeight <= target.clientHeight && target.scrollWidth <= target.clientWidth) { return; }
    target.style.height = target.style.width = "";
    target.style.maxWidth = Math.min(window.innerWidth, 1024) - 120 + "px";
    let height = target.scrollHeight,
    delta = target.offsetHeight - target.clientHeight;
    delta = target.scrollWidth > target.clientWidth ? Math.max(26, delta) : delta + 18;
    height += delta;
    delta = target.scrollWidth - target.clientWidth;
    if (delta > 0) {
      target.style.width = target.offsetWidth + delta + "px";
    }
    target.style.height = height + "px";
  };
  _ref = $$("[data-auto-resize]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.onclick = func;
    element.tabIndex = 0;
    element.textContent = "Auto resize";
  }

  func = function(event): void {
    let str = this.getAttribute("data-delay") as string, e = null as MouseEvent | null;
    if (str !== "continue") {
      event && event.preventDefault();
    }
    if (str === "event") { e = event || null; }
    (window as OptionWindow)._delayed = [this.id, e];
    loadJS("options_ext.js");
  } as ElementWithDelay["onclick"];
  _ref = $$("[data-delay]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  if (bgSettings.CONST.ChromeVersion < BrowserVer.MinWithFrameId) {
    element = $("vomnibarPage");
    element.title = `Vimium++ can not use a HTTP pages as Vomnibar before Chrome ${BrowserVer.MinWithFrameId}`;
    if ("chrome /front/".indexOf(Option.all.vomnibarPage.previous.substring(0, 6)) === -1) {
      element.style.textDecoration = "line-through";
    }
  }

  if (window.location.hash === "#chrome-ui") {
    (document.getElementById("mainHeader") as HTMLElement).remove();
    element = document.getElementById("openInTab") as HTMLAnchorElement;
    element.style.display = "";
    element.onclick = function(this: HTMLAnchorElement): void {
      this.href = bgSettings.CONST.OptionsPage;
      this.target = "_blank";
      window.close();
    };
    (element.previousElementSibling as Element).remove();
    _ref = $$("body,button,header");
    for (let _i = _ref.length; 0 <= --_i; ) {
      _ref[_i].classList.add("chrome-ui");
    }
    devicePixelRatio !== 1 && ((document.body as HTMLBodyElement).style.width = 940 / devicePixelRatio + "px");
  }

  _ref = $$("[data-permission]");
  _ref.length > 0 && (function(this: void, els: NodeListOf<HTMLElement>): void {
    const manifest = chrome.runtime.getManifest(), permissions = manifest.permissions;
    let key: string;
    for (key of permissions) {
      manifest[key] = true;
    }
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      key = el.getAttribute("data-permission") as string;
      if (key in manifest) continue;
      (el as HTMLInputElement | HTMLTextAreaElement).disabled = true;
      key = `This option is disabled for lacking permission${key ? ":\n* " + key : ""}`;
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.checked = false;
        el = el.parentElement as HTMLElement;
        el.title = key;
      } else {
        (el as HTMLInputElement | HTMLTextAreaElement).value = "";
        el.title = key;
        (el.parentElement as HTMLElement).onclick = onclick;
      }
    }
    function onclick(this: HTMLElement): void {
      const el = this.querySelector("[data-permission]") as HTMLInputElement | HTMLTextAreaElement | null;
      this.onclick = null as never;
      if (!el) { return; }
      const key = el.getAttribute("data-permission");
      el.placeholder = `lacking permission${key ? ` "${key}"` : ""}`;
    }
  })(_ref);

  $("innerNewTab").textContent = bgSettings.CONST.ChromeInnerNewTab;

  function toggleHide(element: HTMLElement): void | 1 {
    element.tabIndex = -1;
    return element.setAttribute("aria-hidden", "true");
  }

  _ref = $$('[data-model="CheckBox"]');
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i] as HTMLInputElement;
    if ((element as HTMLInputElement).disabled) { continue; }
    toggleHide(element);
    toggleHide(element.parentElement as HTMLElement);
    element = element.nextElementSibling as HTMLInputElement;
    element.classList.add("checkboxHint");
    element.setAttribute("role", "button");
    element.tabIndex = 0;
    element.setAttribute("aria-hidden", "false");
  }

  function onBeforeUnload(): string {
    return "You have unsaved changes to options.";
  }
})();

$("importButton").onclick = function(): void {
  const opt = $<HTMLSelectElement>("importOptions");
  opt.onchange ? (opt as any).onchange() : $("settingsFile").click();
};

function loadJS(file: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = file;
  return (document.head as HTMLHeadElement).appendChild(script);
}

interface CheckerLoader { info?: string; }
function loadChecker(this: HTMLElement): void {
  if ((loadChecker as CheckerLoader).info != null) { return; }
  (loadChecker as CheckerLoader).info = this.id;
  loadJS("options_checker.js");
}

window.onhashchange = function(this: void): void {
  let hash = window.location.hash, node: ElementWithHash | null;
  hash = hash.substring(hash[1] === "!" ? 2 : 1);
  if (!hash || (<RegExpI> /[^a-z\d_\.]/i).test(hash)) { return; }
  if (node = document.querySelector(`[data-hash="${hash}"]`) as HTMLElement | null) {
    if (node.onclick) {
      return node.onclick(null, "hash");
    }
  }
};
window.location.hash.length > 4 && setTimeout(window.onhashchange as (this: void) => void, 100);
