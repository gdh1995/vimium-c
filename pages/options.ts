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

interface NumberChecker {
  min: number | null;
  max: number | null;
  default: number;
  check (value: number): number;
}

class NumberOption<T extends keyof AllowedOptions> extends Option<T> {
readonly element: HTMLInputElement;
previous: number;
wheelTime: number;
checker: NumberChecker;
constructor (element: HTMLInputElement, onUpdated: (this: NumberOption<T>) => void) {
  super(element, onUpdated);
  let s: string, i: number;
  this.checker = {
    min: (s = element.min) && !isNaN(i = parseFloat(s)) ? i : null,
    max: (s = element.max) && !isNaN(i = parseFloat(s)) ? i : null,
    default: bgSettings.defaults[this.field] as number,
    check: NumberOption.Check
  };
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
static Check (this: NumberChecker, value: number): number {
  if (isNaN(value)) { value = this.default; }
  value = this.min != null ? Math.max(this.min, value) : value;
  return this.max != null ? Math.min(this.max, value) : value;
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

class BooleanOption<T extends keyof AllowedOptions> extends Option<T> {
readonly element: HTMLInputElement;
previous: boolean;
constructor (element: HTMLInputElement, onUpdated: (this: BooleanOption<T>) => void) {
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
  BG.Exclusions || BG.Utils.require("Exclusions");
  const el = $("#exclusionToolbar"), options = el.querySelectorAll('[data-model]');
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
    $("#exclusionToolbar").style.visibility = "";
  }
};

interface SaveBtn extends HTMLButtonElement {
  onclick (this: SaveBtn, virtually?: MouseEvent | false): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}
(function() {
  const saveBtn = $<SaveBtn>("#saveOptions"), exportBtn = $<HTMLButtonElement>("#exportButton");
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
  const types = {
    Number: NumberOption,
    Text: TextOption,
    NonEmptyText: NonEmptyTextOption,
    JSON: JSONOption,
    Boolean: BooleanOption,
    ExclusionRules: ExclusionRulesOption,
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    const cls = types[element.getAttribute("data-model") as "Text"];
    new (cls as any)(element, onUpdated);
  }

  _ref = $$("[data-check]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.addEventListener(element.getAttribute("data-check") || "input", loadChecker);
  }

  let advancedMode = false;
  element = $<AdvancedOptBtn>("#advancedOptionsButton");
  (element as AdvancedOptBtn).onclick = function(this: AdvancedOptBtn, _0, init): void {
    if (init == null || (init === "hash" && bgSettings.get("showAdvancedOptions") === false)) {
      advancedMode = !advancedMode;
      bgSettings.set("showAdvancedOptions", advancedMode);
    } else {
      advancedMode = bgSettings.get("showAdvancedOptions");
    }
    const el = $("#advancedOptions");
    (el.previousElementSibling as HTMLElement).style.display = el.style.display = advancedMode ? "" : "none";
    (this.firstChild as Text).data = (advancedMode ? "Hide" : "Show") + " Advanced Options";
    this.setAttribute("aria-checked", "" + advancedMode);
  };
  (element as AdvancedOptBtn).onclick(null, true);

  document.addEventListener("keydown", function(this: void, event): void {
    if (event.keyCode !== VKeyCodes.space) { return; }
    const el = event.target as Element;
    if (el.parentElement instanceof HTMLLabelElement) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", function(this: void, event): void {
    const el = event.target as Element, i = event.keyCode;
    if (i !== VKeyCodes.enter) {
      if (i !== VKeyCodes.space) { return; }
      if (el.parentElement instanceof HTMLLabelElement) {
        event.preventDefault();
        click(el.parentElement.control as HTMLElement);
      }
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      el.hasAttribute('href') || setTimeout(function(el) {
        click(el);
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
    const target = $("#" + this.getAttribute("data-auto-resize") as string);
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
    element.setAttribute("role", "button");
  }

  func = function(event): void {
    let str = this.getAttribute("data-delay") as string, e = null as MouseEvent | null;
    if (str !== "continue") {
      event && event.preventDefault();
    }
    if (str === "event") { e = event || null; }
    (window as OptionWindow)._delayed = ["#" + this.id, e];
    if (document.readyState === "complete") {
      loadJS("options_ext.js");
      return;
    }
    window.onload = function(): void {
      window.onload = null as never;
      loadJS("options_ext.js");
    };
  } as ElementWithDelay["onclick"];
  _ref = $$("[data-delay]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  if (bgSettings.CONST.ChromeVersion < BrowserVer.MinWithFrameId) {
    element = $("#vomnibarPage");
    element.title = `Vimium++ can not use a HTTP pages as Vomnibar before Chrome ${BrowserVer.MinWithFrameId}`;
    if ("chrome /front/".indexOf(Option.all.vomnibarPage.previous.substring(0, 6)) === -1) {
      element.style.textDecoration = "line-through";
    }
  }
  if (bgSettings.CONST.ChromeVersion < BrowserVer.MinUserSelectAll) {
    _ref = $$(".sel-all");
    func = function(this: HTMLElement, event: MouseEvent): void {
      if (event.target !== this) { return; }
      window.getSelection().selectAllChildren(this);
      event.preventDefault();
    } as ElementWithDelay["onmousedown"];
    for (let _i = _ref.length; 0 <= --_i; ) {
      _ref[_i].onmousedown = func;
    }
  }

  function setUI(curTabId: number | null): void {
    const ratio = BG.devicePixelRatio, element = document.getElementById("openInTab") as HTMLAnchorElement;
    (document.body as HTMLBodyElement).classList.add("chrome-ui");
    (document.getElementById("mainHeader") as HTMLElement).remove();
    element.onclick = function(this: HTMLAnchorElement): void {
      setTimeout(window.close, 17);
    };
    element.style.display = "";
    (element.nextElementSibling as Element).remove();
    ratio > 1 && ((document.body as HTMLBodyElement).style.width = 925 / ratio + "px");
    chrome.tabs.getZoom && chrome.tabs.getZoom(curTabId, function(zoom): void {
      if (!zoom) { return chrome.runtime.lastError; }
      const ratio = Math.round(devicePixelRatio / zoom * 1024) / 1024;
      (document.body as HTMLBodyElement).style.width = ratio !== 1 ? 925 / ratio + "px" : "";
    });
  }
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs): void {
    if (window.location.hash === "#chrome-ui" || tabs[0] && tabs[0].url.lastIndexOf("chrome-extension:") < 0) {
      // if tabs is empty, then we are debugging, and then this page should be a standalone tab
      setUI(tabs[0] ? tabs[0].id : null);
    }
    return chrome.runtime.lastError;
  })

  _ref = $$("[data-permission]");
  _ref.length > 0 && (function(this: void, els: NodeListOf<HTMLElement>): void {
    const manifest = chrome.runtime.getManifest(), permissions = manifest.permissions || [];
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

  $("#innerNewTab").textContent = bgSettings.CONST.ChromeInnerNewTab;

  function toggleHide(element: HTMLElement): void | 1 {
    element.tabIndex = -1;
    return element.setAttribute("aria-hidden", "true");
  }

  _ref = $$('[data-model="Boolean"]');
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

$("#importButton").onclick = function(): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? (opt as any).onchange() : click($("#settingsFile"));
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
  let hash = window.location.hash, node: HTMLElement | null;
  hash = hash.substring(hash[1] === "!" ? 2 : 1);
  if (!hash || (<RegExpI> /[^a-z\d_\.]/i).test(hash)) { return; }
  if (node = $(`[data-hash="${hash}"]`) as HTMLElement | null) {
    if (node.onclick) {
      return (node as ElementWithHash).onclick(null, "hash");
    }
  } else if ((node = $("#" + hash))) {
    if (node.getAttribute("data-model")) {
      node.classList.add("highlight");
    }
    window.scrollTo(0, 0);
    setTimeout(function() {
      window.VDom && VDom.ensureInView(node as Element);
    }, 200);
  }
};
window.location.hash.length > 4 && (window as any).onhashchange();

// below is for programmer debugging
window.onunload = function(): void {
  BG.removeEventListener("unload", OnBgUnload);
};

function OnBgUnload(): void {
  BG.removeEventListener("unload", OnBgUnload);
  setTimeout(function(): void {
    BG = chrome.extension.getBackgroundPage() as Window;
    if (!BG) { // a user may call `close()` in the console panel
      window.onbeforeunload = null as any;
      window.close();
    }
    bgSettings = BG.Settings;
    BG.addEventListener("unload", OnBgUnload);
    if (BG.document.readyState !== "loading") { return callback(); }
    BG.addEventListener("DOMContentLoaded", function load(): void {
      BG.removeEventListener("DOMContentLoaded", load, true);
      return callback();
    }, true);
  }, 100);
  function callback() {
    const ref = Option.all;
    for (const key in ref) {
      const opt = ref[key as keyof AllowedOptions], { previous } = opt;
      if (typeof previous === "object" && previous) {
        opt.previous = bgSettings.get(opt.field);
      }
    }
  }
}
BG.addEventListener("unload", OnBgUnload);

function click(a: Element): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , false, false, false, false, 0, null);
  return a.dispatchEvent(mouseEvent);
}
