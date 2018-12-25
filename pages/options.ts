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

Option_.syncToFrontend_ = [];

Option_.prototype._onCacheUpdated = function<T extends keyof SettingsNS.FrontendSettings
    > (this: Option_<T>, func: (this: Option_<T>) => void): void {
  func.call(this);
  if (window.VSettings) {
    window.VSettings.cache[this.field_] = this.readValueFromElement_();
  }
};

Option_.saveOptions_ = function(): boolean {
  const arr = Option_.all_;
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions];
    if (!opt.saved_ && !opt.allowToSave_()) {
      return false;
    }
  }
  arr.vimSync.saved_ || arr.vimSync.save_();
  for (const i in arr) {
    arr[i as keyof AllowedOptions].saved_ || arr[i as keyof AllowedOptions].save_();
  }
  return true;
};

Option_.needSaveOptions_ = function(): boolean {
  const arr = Option_.all_;
  for (const i in arr) {
    if (!arr[i as keyof AllowedOptions].saved_) {
      return true;
    }
  }
  return false;
};

Option_.prototype.areEqual_ = function<T extends keyof AllowedOptions
    >(a: AllowedOptions[T], b: AllowedOptions[T]): boolean {
  return a === b;
};

interface NumberChecker extends Checker<"scrollStepSize"> {
  min: number | null;
  max: number | null;
  default: number;
  check_ (value: number): number;
}

class NumberOption_<T extends keyof AllowedOptions> extends Option_<T> {
readonly element_: HTMLInputElement;
previous_: number;
wheelTime_: number;
checker_: NumberChecker;
constructor (element: HTMLInputElement, onUpdated: (this: NumberOption_<T>) => void) {
  super(element, onUpdated);
  let s: string, i: number;
  this.checker_ = {
    min: (s = element.min) && !isNaN(i = parseFloat(s)) ? i : null,
    max: (s = element.max) && !isNaN(i = parseFloat(s)) ? i : null,
    default: bgSettings_.defaults[this.field_] as number,
    check_: NumberOption_.Check_
  };
  this.element_.oninput = this.onUpdated_;
  this.element_.onfocus = this.addWheelListener_.bind(this);
}
populateElement_ (value: number): void {
  this.element_.value = "" + value;
}
readValueFromElement_ (): number {
  return parseFloat(this.element_.value);
}
addWheelListener_ (): void {
  const el = this.element_, func = (e: WheelEvent): void => this.onWheel_(e), onBlur = (): void => {
    el.removeEventListener("wheel", func, {passive: false});
    el.removeEventListener("blur", onBlur);
    this.wheelTime_ = 0;
  };
  this.wheelTime_ = 0;
  el.addEventListener("wheel", func, {passive: false});
  el.addEventListener("blur", onBlur);
}
onWheel_ (event: WheelEvent): void {
  event.preventDefault();
  const oldTime = this.wheelTime_;
  let i = Date.now();
  if (i - oldTime < 100 && oldTime > 0) { return; }
  this.wheelTime_ = i;
  const el = this.element_, inc = event.wheelDelta > 0, val0 = el.value;
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
  return this.atomicUpdate_(val, oldTime > 0, false);
}
static Check_ (this: NumberChecker, value: number): number {
  if (isNaN(value)) { value = this.default; }
  value = this.min != null ? Math.max(this.min, value) : value;
  return this.max != null ? Math.min(this.max, value) : value;
}
}

class TextOption_<T extends keyof AllowedOptions> extends Option_<T> {
readonly element_: TextElement;
readonly converter_: string;
previous_: string;
constructor (element: TextElement, onUpdated: (this: TextOption_<T>) => void) {
  super(element, onUpdated);
  this.element_.oninput = this.onUpdated_;
  this.converter_ = this.element_.getAttribute("data-converter") || "";
}
whiteRe_: RegExpG;
whiteMaskRe_: RegExpG;
populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void {
  value = (value as string).replace(this.whiteRe_, '\xa0');
  if (enableUndo !== true) {
    this.element_.value = value as string;
    return;
  }
  return this.atomicUpdate_(value as string, true, true);
}
readValueFromElement_ (): AllowedOptions[T] {
  let value = this.element_.value.trim().replace(this.whiteMaskRe_, ' ');
  if (value && this.converter_) {
    value = this.converter_ === "lower" ? value.toLowerCase()
      : this.converter_ === "upper" ? value.toUpperCase()
      : value;
  }
  return value;
}
}
TextOption_.prototype.whiteRe_ = <RegExpG> / /g;
TextOption_.prototype.whiteMaskRe_ = <RegExpG> /\xa0/g;

class NonEmptyTextOption_<T extends keyof AllowedOptions> extends TextOption_<T> {
readValueFromElement_ (): string {
  let value = super.readValueFromElement_() as string;
  if (!value) {
    value = bgSettings_.defaults[this.field_] as string;
    this.populateElement_(value, true);
  }
  return value;
}
}

TextOption_.prototype.atomicUpdate_ = NumberOption_.prototype.atomicUpdate_ = function<T extends keyof AllowedOptions
    >(this: Option_<T> & {element_: TextElement}, value: string
      , undo: boolean, locked: boolean): void {
  if (undo) {
    this.locked_ = true;
    document.activeElement !== this.element_ && this.element_.focus();
    document.execCommand("undo");
  }
  this.locked_ = locked;
  this.element_.select();
  document.execCommand("insertText", false, value);
  this.locked_ = false;
};

class JSONOption_<T extends keyof AllowedOptions> extends TextOption_<T> {
populateElement_ (obj: AllowedOptions[T], enableUndo?: boolean): void {
  const one = this.element_ instanceof HTMLInputElement, s0 = JSON.stringify(obj, null, one ? 1 : 2),
  s1 = one ? s0.replace(<RegExpG & RegExpSearchable<1>> /(,?)\n\s*/g, (_, s) => s ? ", " : "") : s0;
  super.populateElement_(s1, enableUndo);
}
readValueFromElement_ (): AllowedOptions[T] {
  let value = super.readValueFromElement_(), obj: AllowedOptions[T] = null as never;
  if (value) {
    try {
      obj = JSON.parse<AllowedOptions[T]>(value as string);
    } catch (e) {
    }
  } else {
    obj = bgSettings_.defaults[this.field_];
    this.populateElement_(obj, true);
  }
  return obj;
}
}

JSONOption_.prototype.areEqual_ = Option_.areJSONEqual_;

class BooleanOption_<T extends keyof AllowedOptions> extends Option_<T> {
readonly element_: HTMLInputElement;
previous_: boolean | null;
constructor (element: HTMLInputElement, onUpdated: (this: BooleanOption_<T>) => void) {
  super(element, onUpdated);
  this.element_.onchange = this.onUpdated_;
}
populateElement_ (value: boolean | null): void {
  this.element_.checked = value || false;
  this.element_.indeterminate = value === null;
  }
readValueFromElement_ (): boolean | null {
  return this.element_.indeterminate ? null : this.element_.checked;
}
}

ExclusionRulesOption_.prototype.onRowChange_ = function(this: ExclusionRulesOption_, isAdd: number): void {
  const count = this.list_.childElementCount;
  if (count - isAdd !== 0) { return; }
  isAdd && (BG_.Exclusions || BG_.Utils.require("Exclusions"));
  const el = $("#exclusionToolbar"), options = el.querySelectorAll('[data-model]');
  el.style.visibility = count > 0 ? "" : "hidden";
  for (let i = 0, len = options.length; i < len; i++) {
    const opt = Option_.all_[options[i].id as keyof AllowedOptions],
    style = (opt.element_.parentNode as HTMLElement).style;
    style.visibility = isAdd || opt.saved_ ? "" : "visible";
    style.display = !isAdd && opt.saved_ ? "none" : "";
  }
};

ExclusionRulesOption_.prototype.onInit_ = function(this: ExclusionRulesOption_): void {
  if (this.previous_.length > 0) {
    $("#exclusionToolbar").style.visibility = "";
  }
};

TextOption_.prototype.showError_ = function<T extends keyof AllowedOptions>(this: TextOption_<T>
    , msg: string, tag?: OptionErrorType | null, errors?: boolean): void {
  errors != null || (errors = !!msg);
  const { element_: el } = this, { classList: cls } = el, par = el.parentElement as HTMLElement;
  let errEl = par.querySelector(".tip") as HTMLElement | null;
  if (errors) {
    if (errEl == null) {
      errEl = document.createElement("div");
      errEl.className = "tip";
      par.insertBefore(errEl, par.querySelector(".nonEmptyTip"));
    }
    errEl.textContent = msg;
    tag !== null && cls.add(tag || "has-error");
  } else {
    cls.remove("has-error"), cls.remove("highlight");
    errEl && errEl.remove();
  }
}

interface SaveBtn extends HTMLButtonElement {
  onclick (this: SaveBtn, virtually?: MouseEvent | false): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}
(function() {
  const saveBtn = $<SaveBtn>("#saveOptions"), exportBtn = $<HTMLButtonElement>("#exportButton");
  let status = false;

  function onUpdated<T extends keyof AllowedOptions> (this: Option_<T>): void {
    if (this.locked_) { return; }
    if (this.saved_ = this.areEqual_(this.readValueFromElement_(), this.previous_)) {
      if (status && !Option_.needSaveOptions_()) {
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
      if (!Option_.saveOptions_()) {
        return;
      }
    }
    const toSync = Option_.syncToFrontend_;
    Option_.syncToFrontend_ = [];
    this.disabled = true;
    (this.firstChild as Text).data = "Saved";
    exportBtn.disabled = false;
    status = false;
    window.onbeforeunload = null as never;
    if (toSync.length === 0) { return; }
    setTimeout(doSyncToFrontend, 100, toSync);
  };
  function doSyncToFrontend (toSync: typeof Option_.syncToFrontend_): void {
    const ref = bgSettings_.payload, delta: BgReq[kBgReq.settingsUpdate]["delta"] = {},
    req: Req.bg<kBgReq.settingsUpdate> = { N: kBgReq.settingsUpdate, delta };
    for (const key of toSync) {
      delta[key] = ref[key] = bgSettings_.get(key);
    }
    bgSettings_.broadcast(req);
  }

  let _ref: NodeListOf<HTMLElement> = $$("[data-model]"), element: HTMLElement;
  const types = {
    Number: NumberOption_,
    Text: TextOption_,
    NonEmptyText: NonEmptyTextOption_,
    JSON: JSONOption_,
    Boolean: BooleanOption_,
    ExclusionRules: ExclusionRulesOption_,
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
    if (init == null || (init === "hash" && bgSettings_.get("showAdvancedOptions") === false)) {
      advancedMode = !advancedMode;
      bgSettings_.set("showAdvancedOptions", advancedMode);
    } else {
      advancedMode = bgSettings_.get("showAdvancedOptions");
    }
    const el = $("#advancedOptions");
    (el.previousElementSibling as HTMLElement).style.display = el.style.display = advancedMode ? "" : "none";
    (this.firstChild as Text).data = (advancedMode ? "Hide" : "Show") + " Advanced Options";
    this.setAttribute("aria-checked", "" + advancedMode);
  };
  (element as AdvancedOptBtn).onclick(null, true);

  document.addEventListener("keydown", function(this: void, event): void {
    if (event.keyCode !== VKeyCodes.space) {
      if (!window.VKeyboard) { return; }
      let wanted = event.keyCode === VKeyCodes.questionWin || event.keyCode === VKeyCodes.questionMac ? "?" : "";
      if (wanted && VKeyboard.char(event) === wanted && VKeyboard.key(event, wanted) === wanted) {
        if (!VEvent.lock()) {
          $("#showCommands").click();
        }
      }
      return;
    }
    const el = event.target as Element;
    if (el instanceof HTMLSpanElement && el.parentElement instanceof HTMLLabelElement) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", function(this: void, event): void {
    const el = event.target as Element, i = event.keyCode;
    if (i !== VKeyCodes.enter) {
      if (i !== VKeyCodes.space) { return; }
      if (el instanceof HTMLSpanElement && el.parentElement instanceof HTMLLabelElement) {
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

  _ref = document.getElementsByClassName("nonEmptyTip") as HTMLCollectionOf<HTMLElement>;
  for (let _i = _ref.length; 0 <= --_i; ) {
    element = _ref[_i];
    element.className += " info";
    element.textContent = "Delete all to reset this option.";
  }

  let func: (this: HTMLElement, event: MouseEvent) => void = function(this: HTMLElement): void {
    const target = $("#" + this.getAttribute("data-auto-resize") as string);
    let height = target.scrollHeight, width = target.scrollWidth, dw = width - target.clientWidth;
    if (height <= target.clientHeight && dw <= 0) { return; }
    const maxWidth = Math.max(Math.min(window.innerWidth, 1024) - 120, 550);
    target.style.maxWidth = width > maxWidth ? maxWidth + "px" : "";
    target.style.height = target.style.width = "";
    dw = width - target.clientWidth;
    let delta = target.offsetHeight - target.clientHeight;
    delta = dw > 0 ? Math.max(26, delta) : delta + 18;
    height += delta;
    if (dw > 0) {
      target.style.width = target.offsetWidth + dw + 4 + "px";
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
    window.addEventListener("load", function onLoad(event): void {
      if (event.target === window) {
        window.removeEventListener("load", onLoad);
        loadJS("options_ext.js");
      }
    });
  } as ElementWithDelay["onclick"];
  _ref = $$("[data-delay]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  _ref = $$(".sel-all");
  func = function(this: HTMLElement, event: MouseEvent): void {
    if (event.target !== this) { return; }
    getSelection().selectAllChildren(this);
    event.preventDefault();
  } as ElementWithDelay["onmousedown"];
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onmousedown = func;
  }

  function setUI(curTabId: number | null): void {
    const ratio = BG_.devicePixelRatio, element = document.getElementById("openInTab") as HTMLAnchorElement;
    (document.body as HTMLBodyElement).classList.add("dialog-ui");
    (document.getElementById("mainHeader") as HTMLElement).remove();
    element.onclick = function(this: HTMLAnchorElement): void {
      setTimeout(window.close, 17);
    };
    element.style.display = "";
    (element.nextElementSibling as Element).remove();
    if (bgSettings_.CONST.ChromeVersion >= BrowserVer.MinCorrectBoxWidthForOptionUI
        // not reset body width if not on Chrome
        || location.protocol !== "chrome-extension:") { return; }
    ratio > 1 && ((document.body as HTMLBodyElement).style.width = 910 / ratio + "px");
    chrome.tabs.getZoom && chrome.tabs.getZoom(curTabId, function(zoom): void {
      // >= BrowserVer.Min$Tabs$$getZoom
      if (!zoom) { return chrome.runtime.lastError; }
      const ratio = Math.round(window.devicePixelRatio / zoom * 1024) / 1024;
      (document.body as HTMLBodyElement).style.width = ratio !== 1 ? 910 / ratio + "px" : "";
    });
  }
  if (typeof NO_DIALOG_UI !== "undefined" && NO_DIALOG_UI) {}
  else if (window.location.hash === "#dialog-ui") {
    setUI(null);
  } else if (chrome.tabs.query)
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs): void {
    let url: string;
    if (document.hasFocus() && tabs[0] && (url = tabs[0].url).indexOf("-") > 0
            && url.lastIndexOf(location.protocol, 0) < 0) {
      setUI(tabs[0].id);
    }
  });
  Option_.all_.keyMappings.onSave_ = function(): void {
    const { errors } = BG_.CommandsData,
    msg = !errors ? "" : (errors === 1 ? "There's 1 error." : `There're ${errors} errors`
      ) + " found.\nPlease see logs of background page for more details.";
    return this.showError_(msg);
  };
  Option_.all_.keyMappings.onSave_();

  Option_.all_.linkHintCharacters.onSave_ = function(): void {
    const errors = this.previous_.length < 3;
    return this.showError_(errors ? "Characters for LinkHints are too few." : "");
  };
  Option_.all_.linkHintCharacters.onSave_();

  Option_.all_.vomnibarPage.onSave_ = function(): void {
    let {element_: element} = this, url: string = this.previous_
      , isExtPage = !url.lastIndexOf(location.protocol, 0) || !url.lastIndexOf("front/", 0);
    if (bgSettings_.CONST.ChromeVersion < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
      element.style.textDecoration = isExtPage ? "" : "line-through";
      return this.showError_(`Only extension vomnibar pages can work before Chrome ${BrowserVer.Min$tabs$$executeScript$hasFrameIdArg}.`, null);
    }
    url = bgSettings_.cache.vomnibarPage_f || url; // for the case Chrome is initing
    if (isExtPage) {
    } else if (url.lastIndexOf("file://", 0) !== -1) {
      return this.showError_("A file page of vomnibar is limited by Chrome to only work on file://* pages.", "highlight");
    } else if (url.lastIndexOf("http://", 0) !== -1) {
      return this.showError_("A HTTP page of vomnibar is limited by Chrome and doesn't work on HTTPS pages.", "highlight");
    }
    return this.showError_("");
  };
  Option_.all_.vomnibarPage.onSave_();

  _ref = $$("[data-permission]");
  _ref.length > 0 && (function(this: void, els: NodeListOf<HTMLElement>): void {
    const manifest = chrome.runtime.getManifest(), permissions = manifest.permissions || [];
    for (const key of permissions) {
      manifest[key] = true;
    }
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      let key = el.getAttribute("data-permission") as string;
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
  if (BG_.Settings.CONST.GlobalCommands.length === 0) {
    _ref = $$(".require-shortcuts");
    for (let _i = _ref.length; 0 <= --_i; ) {
      _ref[_i].remove();
    }
  }

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

  element = $<HTMLAnchorElement>("#openExtensionPage");
  if (bgSettings_.CONST.ChromeVersion < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    (element as HTMLAnchorElement).href = "chrome://extensions/configureCommands";
    (element.parentElement as HTMLElement).insertBefore(document.createTextNode('"Keyboard shortcuts" of '), element);
  }
  (element as HTMLAnchorElement).onclick = function(event): void {
    event.preventDefault();
    return BG_.Backend.focus({ url: this.href, reuse: ReuseType.reuse, prefix: true });
  }
})();


$("#importButton").onclick = function(): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? (opt as any).onchange() : click($("#settingsFile"));
};

$("#browserName").textContent = (BG_.IsEdge ? "MS Edge"
  : BG_.IsFirefox ? "Firefox" : ((<RegExpOne>/\bChrom(e|ium)/).exec(navigator.appVersion) || ["Chrome"])[0]
  ) + (!BG_.NotChrome ? " " + bgSettings_.CONST.ChromeVersion : ""
  ) + (", " + bgSettings_.CONST.Platform[0].toUpperCase() + bgSettings_.CONST.Platform.substring(1));

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
    const callback = function(event?: Event): void {
      if (event && event.target !== window) { return; }
      if (window.onload) {
        window.onload = null as never;
        window.scrollTo(0, 0);
      }
      window.VDom ? VDom.view(node as Element)
        : (node as HTMLElement).scrollIntoViewIfNeeded ? (node as any).scrollIntoViewIfNeeded()
        : (node as HTMLElement).scrollIntoView();
    }
    if (document.readyState === "complete") { return callback(); }
    window.scrollTo(0, 0);
    window.onload = callback;
  }
};
window.location.hash.length > 4 && (window as any).onhashchange();

// below is for programmer debugging
window.onunload = function(): void {
  BG_.removeEventListener("unload", OnBgUnload);
  BG_.Utils.GC();
};

function OnBgUnload(): void {
  BG_.removeEventListener("unload", OnBgUnload);
  setTimeout(function(): void {
    BG_ = chrome.extension.getBackgroundPage() as Window as Window & { Settings: SettingsTmpl };
    if (!BG_) { // a user may call `close()` in the console panel
      window.onbeforeunload = null as any;
      window.close();
      return;
    }
    bgSettings_ = BG_.Settings;
    if (!bgSettings_) { BG_ = null as never; return; }
    BG_.addEventListener("unload", OnBgUnload);
    if (BG_.document.readyState !== "loading") { return callback(); }
    BG_.addEventListener("DOMContentLoaded", function load(): void {
      BG_.removeEventListener("DOMContentLoaded", load, true);
      return callback();
    }, true);
  }, 100);
  function callback() {
    const ref = Option_.all_;
    for (const key in ref) {
      const opt = ref[key as keyof AllowedOptions], { previous_: previous } = opt;
      if (typeof previous === "object" && previous) {
        opt.previous_ = bgSettings_.get(opt.field_);
      }
    }
    if (!Option_.all_.keyMappings.saved_) {
      BG_.Commands || BG_.Utils.require("Commands");
    }
    if ((Option_.all_.exclusionRules as ExclusionRulesOption_).list_.childElementCount > 0) {
      BG_.Exclusions || BG_.Utils.require("Exclusions");
    }
  }
}
BG_.addEventListener("unload", OnBgUnload);

document.addEventListener("click", function onClickOnce(): void {
  if (!window.VDom || !VDom.UI.R) { return; }
  document.removeEventListener("click", onClickOnce, true);
  (VDom.UI.R as Node).addEventListener("click", function(event): void {
    let target = event.target as HTMLElement, str: string;
    if (VPort && target.classList.contains("HelpCommandName")) {
      str = target.textContent.slice(1, -1);
      VPort.post({
        H: kFgReq.copy,
        data: str
      });
      return VHUD.copied(str);
    }
  }, true);
}, true);

function click(a: Element): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , false, false, false, false, 0, null);
  return a.dispatchEvent(mouseEvent);
}
