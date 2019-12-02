/// <reference path="../lib/dom_utils.ts" />
/// <reference path="../lib/keyboard_utils.ts" />
/// <reference path="../content/dom_ui.ts" />
interface Window {
  readonly VHud?: VHUDTy;
  readonly VCui?: typeof VCui;
}
declare var VHud: VHUDTy, VApi: VApiTy;

interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEventToPrevent | null, hash?: "hash"): void;
}
interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEventToPrevent | null): void;
}
interface OptionWindow extends Window {
  _delayed: [string, MouseEventToPrevent | null];
}

Option_.syncToFrontend_ = [];

Option_.prototype._onCacheUpdated = function<T extends keyof SettingsNS.FrontendSettings
    > (this: Option_<T>, func: (this: Option_<T>) => void): void {
  func.call(this);
  if (window.VDom) {
    (VDom.cache_ as Generalized<typeof VDom.cache_>
        )[bgSettings_.valuesToLoad_[this.field_]] = this.readValueFromElement_();
  }
};

Option_.saveOptions_ = function (): boolean {
  const arr = Option_.all_, dirty: string[] = [];
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions];
    if (!opt.saved_
        && !(opt as Option_<any>).areEqual_(opt.previous_, bgSettings_.get_(opt.field_))) {
      dirty.push(opt.field_);
    }
  }
  if (dirty.length > 0) {
    let ok = confirm(pTrans_("dirtyOptions", [dirty.join("\n  * ")]));
    if (!ok) {
      return false;
    }
  }
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions];
    if (!opt.saved_ && !opt.allowToSave_()) {
      return false;
    }
  }
  arr.vimSync.saved_ || arr.vimSync.save_();
  arr.exclusionRules.saved_ || arr.exclusionRules.save_();
  for (const i in arr) {
    arr[i as keyof AllowedOptions].saved_ || arr[i as keyof AllowedOptions].save_();
  }
  return true;
};

Option_.needSaveOptions_ = function (): boolean {
  const arr = Option_.all_;
  for (const i in arr) {
    if (!arr[i as keyof AllowedOptions].saved_) {
      return true;
    }
  }
  return false;
};

Option_.prototype.areEqual_ = (a, b) => a === b;

interface NumberChecker extends Checker<"scrollStepSize"> {
  min: number | null;
  max: number | null;
  default: number;
  check_ (value: number): number;
}
type UniversalNumberSettings = Exclude<PossibleOptionNames<number>, "ignoreCapsLock">;
class NumberOption_<T extends UniversalNumberSettings> extends Option_<T> {
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
    default: bgSettings_.defaults_[this.field_] as number,
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
  const el = this.element_, func = (e: WheelEvent & ToPrevent): void => this.onWheel_(e), onBlur = (): void => {
    el.removeEventListener("wheel", func, {passive: false});
    el.removeEventListener("blur", onBlur);
    this.wheelTime_ = 0;
  };
  this.wheelTime_ = 0;
  el.addEventListener("wheel", func, {passive: false});
  el.addEventListener("blur", onBlur);
}
onWheel_ (event: WheelEvent & ToPrevent): void {
  event.preventDefault();
  const oldTime = this.wheelTime_;
  let i = Date.now(); // safe for time changes
  if (i - oldTime < 100 && i + 99 > oldTime && oldTime > 0) { return; }
  this.wheelTime_ = i;
  const el = this.element_, inc = (event.deltaY || event.deltaX) > 0, val0 = el.value;
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

type TextualizedOptionNames = PossibleOptionNames<string | object>;
type TextOptionNames = PossibleOptionNames<string>;
class TextOption_<T extends TextualizedOptionNames> extends Option_<T> {
readonly element_: TextElement;
readonly converter_: string[];
needToCovertToCharsOnRead_: boolean;
constructor (element: TextElement, onUpdated: (this: TextOption_<T>) => void) {
  super(element, onUpdated);
  const converter = this.element_.dataset.converter || "", ops = converter ? converter.split(" ") : [];
  this.element_.oninput = this.onUpdated_;
  this.converter_ = ops;
  this.needToCovertToCharsOnRead_ = false;
  if (ops.indexOf("chars") >= 0) {
    (this as Option_<TextOptionNames>).checker_ = TextOption_.charsChecker_;
  }
}
fetch_ (): void {
  super.fetch_();
  // allow old users to correct mistaken chars and save
  this.needToCovertToCharsOnRead_ = this.converter_.indexOf("chars") >= 0
    && TextOption_.charsChecker_.check_(this.previous_ as AllowedOptions[TextOptionNames]) === this.previous_;
}
populateElement_ (value: AllowedOptions[T] | string, enableUndo?: boolean): void {
  const value2 = (value as string).replace(<RegExpG> / /g, "\xa0");
  if (enableUndo !== true) {
    this.element_.value = value2;
  } else {
    this.atomicUpdate_(value2, true, true);
  }
}
/** @returns string */
readValueFromElement_ (): AllowedOptions[T] {
  let value = this.element_.value.trim().replace(<RegExpG> /\xa0/g, " "), ops = this.converter_;
  if (value && ops.length > 0) {
    ops.indexOf("lower") >= 0 && (value = value.toLowerCase());
    ops.indexOf("upper") >= 0 && (value = value.toUpperCase());
    if (this.needToCovertToCharsOnRead_) {
      value = TextOption_.toChars_(value);
    }
  }
  return value as AllowedOptions[T];
}
static charsChecker_: Checker<TextOptionNames> = {
  check_ (value: string): string {
    return TextOption_.toChars_(value);
  }
};
static toChars_ (value: string): string {
  let str2 = "";
  for (let ch of value.replace(<RegExpG> /\s/g, "")) {
    if (str2.indexOf(ch) < 0) {
      str2 += ch;
    }
  }
  return str2;
}
}

class NonEmptyTextOption_<T extends TextOptionNames> extends TextOption_<T> {
readValueFromElement_ (): string {
  let value = super.readValueFromElement_() as string;
  if (!value) {
    value = bgSettings_.defaults_[this.field_] as string;
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
  if (!(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
    if (this.element_.value !== value) {
      this.element_.value = value;
    }
  }
  this.locked_ = false;
};

type JSONOptionNames = PossibleOptionNames<object>;
/** in fact, JSONOption_ should accept all of `JSONOptionNames`; */
class JSONOption_<T extends JSONOptionNames> extends TextOption_<T> {
populateElement_ (obj: AllowedOptions[T], enableUndo?: boolean): void {
  const one = this.element_ instanceof HTMLInputElement, s0 = JSON.stringify(obj, null, one ? 1 : 2),
  s1 = one ? s0.replace(<RegExpG & RegExpSearchable<1>> /(,?)\n\s*/g, (_, s) => s ? ", " : "") : s0;
  super.populateElement_(s1, enableUndo);
}
readValueFromElement_ (): AllowedOptions[T] {
  let value = super.readValueFromElement_(), obj: AllowedOptions[T] = null as never;
  if (value) {
    try {
      obj = JSON.parse<AllowedOptions[T]>(value as AllowedOptions[T] & string);
    } catch {
    }
  } else {
    obj = bgSettings_.defaults_[this.field_];
    this.populateElement_(obj, true);
  }
  return obj;
}
}

class MaskedText_<T extends TextOptionNames> extends TextOption_<T> {
  masked_: boolean;
  _myCancelMask: (() => void) | null;
  constructor (element: TextElement, onUpdated: (this: TextOption_<T>) => void) {
    super(element, onUpdated);
    this.masked_ = true;
    nextTick_(() => {
      this.element_.classList.add("masked");
    });
    this._myCancelMask = this.cancelMask_.bind(this);
    (this.element_ as HTMLTextAreaElement).addEventListener("focus", this._myCancelMask);
  }
  cancelMask_ (): void {
    if (!this._myCancelMask) { return; }
    this.element_.removeEventListener("focus", this._myCancelMask);
    this.element_.classList.remove("masked");
    this._myCancelMask = null;
    this.masked_ = false;
    this.element_.removeAttribute("placeholder");
    this.fetch_();
  }
  populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void {
    if (this.masked_) {
      let s: string = this.element_.dataset.mask || "";
      s = pTrans_(s || "clickToUnmask") || s;
      s && (this.element_.placeholder = s);
      return;
    }
    super.populateElement_(value, enableUndo);
  }
  readValueFromElement_ (): AllowedOptions[T] {
    return this.masked_ ? this.previous_ : super.readValueFromElement_();
  }
}

(JSONOption_.prototype as JSONOption_<JSONOptionNames>).areEqual_ = Option_.areJSONEqual_;

class BooleanOption_<T extends keyof AllowedOptions> extends Option_<T> {
  readonly element_: HTMLInputElement;
  previous_: FullSettings[T];
  map_: any[];
  true_index_: 2 | 1;
  static readonly map_for_2_ = [false, true] as const;
  static readonly map_for_3_ = [false, null, true] as const;
  inner_status_: 0 | 1 | 2;
  constructor (element: HTMLInputElement, onUpdated: (this: BooleanOption_<T>) => void) {
    super(element, onUpdated);
    let map = element.dataset.map;
    this.map_ = map ? JSON.parse(map)
        : this.element_.dataset.allowNull ? BooleanOption_.map_for_3_ : BooleanOption_.map_for_2_;
    this.true_index_ = (this.map_.length - 1) as 2 | 1;
    if (this.true_index_ > 1 && this.field_ !== "vimSync") {
      this.element_.addEventListener("change", this.onTripleStatusesClicked.bind(this), true);
    }
    this.element_.onchange = this.onUpdated_;
  }
  populateElement_ (value: FullSettings[T]): void {
    this.element_.checked = value === this.map_[this.true_index_];
    this.element_.indeterminate = this.true_index_ > 1 && value === this.map_[1];
    this.inner_status_ = this.map_.indexOf(value) as 0 | 1 | 2;
  }
  readValueFromElement_ (): FullSettings[T] {
    let value = this.element_.indeterminate ? this.map_[1] : this.map_[this.element_.checked ? this.true_index_ : 0];
    if (this.field_ === "ignoreCapsLock" && window.VDom && VDom.cache_) {
      VDom.cache_.i = value > 1 || value === 1 && !bgSettings_.payload_.o;
    }
    return value;
  }
  onTripleStatusesClicked (event: EventToPrevent): void {
    if (this.inner_status_ === 0) {
      event.preventDefault();
      this.element_.indeterminate = true;
      this.element_.checked = false;
      this.inner_status_ = 1;
    } else {
      this.inner_status_ = this.element_.checked ? 2 : 0;
    }
  }
}

ExclusionRulesOption_.prototype.onRowChange_ = function (this: ExclusionRulesOption_, isAdd: number): void {
  if (this.list_.length !== isAdd) { return; }
  isAdd && !BG_.Exclusions && BG_.BgUtils_.require_("Exclusions");
  const el = $("#exclusionToolbar"), options = el.querySelectorAll("[data-model]");
  el.style.visibility = isAdd ? "" : "hidden";
  for (let i = 0, len = options.length; i < len; i++) {
    const opt = Option_.all_[options[i].id as keyof AllowedOptions],
    style = (opt.element_.parentNode as HTMLElement).style;
    style.visibility = isAdd || opt.saved_ ? "" : "visible";
    style.display = !isAdd && opt.saved_ ? "none" : "";
  }
};

TextOption_.prototype.showError_ = function<T extends TextualizedOptionNames>(this: TextOption_<T>
    , msg: string, tag?: OptionErrorType | null, errors?: boolean): void {
  errors != null || (errors = !!msg);
  const { element_: el } = this, { classList: cls } = el, par = el.parentElement as HTMLElement;
  let errEl = el.nextElementSibling as HTMLElement | null;
  errEl = errEl && errEl.classList.contains("tip") ? errEl : null;
  nextTick_(() => {
  if (errors) {
    if (errEl == null) {
      errEl = document.createElement("div");
      errEl.className = "tip";
      par.insertBefore(errEl, el.nextElementSibling as Element | null);
    }
    errEl.textContent = msg;
    tag !== null && cls.add(tag || "has-error");
  } else {
    cls.remove("has-error"), cls.remove("highlight");
    errEl && errEl.remove();
  }
  });
};

setupBorderWidth_ && nextTick_(setupBorderWidth_);
nextTick_(versionEl => {
  const docCls = (document.documentElement as HTMLHtmlElement).classList;
  const kEventName = "DOMContentLoaded", onload = () => {
    removeEventListener(kEventName, onload);
    bgSettings_.payload_.d && docCls.add("auto-dark");
    bgSettings_.payload_.r && docCls.add("less-motion");
  };
  addEventListener(kEventName, onload);
  versionEl.textContent = bgSettings_.CONST_.VerName_;
}, $<HTMLElement>(".version"));

interface SaveBtn extends HTMLButtonElement {
  onclick (this: SaveBtn, virtually?: MouseEvent | false): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}
let optionsInit1_ = function (): void {
  const saveBtn = $<SaveBtn>("#saveOptions"), exportBtn = $<HTMLButtonElement>("#exportButton");
  let status = false;

  function onUpdated<T extends keyof AllowedOptions>(this: Option_<T>): void {
    if (this.locked_) { return; }
    if (this.saved_ = this.areEqual_(this.readValueFromElement_(), this.previous_)) {
      if (status && !Option_.needSaveOptions_()) {
        if (Build.BTypes & BrowserType.Firefox
            && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
          saveBtn.blur();
        }
        saveBtn.disabled = true;
        (saveBtn.firstChild as Text).data = pTrans_("o115");
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
    (saveBtn.firstChild as Text).data = pTrans_("o115_2");
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      exportBtn.blur();
    }
    exportBtn.disabled = true;
  }

  saveBtn.onclick = function (virtually): void {
    if (virtually !== false) {
      if (!Option_.saveOptions_()) {
        return;
      }
    }
    const toSync = Option_.syncToFrontend_;
    Option_.syncToFrontend_ = [];
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      this.blur();
    }
    this.disabled = true;
    (this.firstChild as Text).data = pTrans_("o115_3");
    exportBtn.disabled = false;
    status = false;
    window.onbeforeunload = null as never;
    if (toSync.length === 0) { return; }
    setTimeout(doSyncToFrontend, 100, toSync);
  };
  function doSyncToFrontend(toSync: typeof Option_.syncToFrontend_): void {
    const delta: BgReq[kBgReq.settingsUpdate]["d"] = Object.create(null),
    req: Req.bg<kBgReq.settingsUpdate> = { N: kBgReq.settingsUpdate, d: delta };
    for (const key of toSync) {
      (delta as Generalized<typeof delta>)[bgSettings_.valuesToLoad_[key]] = bgSettings_.get_(key);
    }
    bgSettings_.broadcast_(req);
  }

  let advancedMode = false, _element: HTMLElement = $<AdvancedOptBtn>("#advancedOptionsButton");
  (_element as AdvancedOptBtn).onclick = function (this: AdvancedOptBtn, _0, init): void {
    if (init == null || (init === "hash" && bgSettings_.get_("showAdvancedOptions") === false)) {
      advancedMode = !advancedMode;
      bgSettings_.set_("showAdvancedOptions", advancedMode);
    } else {
      advancedMode = bgSettings_.get_("showAdvancedOptions");
    }
    const el = $("#advancedOptions");
    nextTick_((): void => {
    (el.previousElementSibling as HTMLElement).style.display = el.style.display = advancedMode ? "" : "none";
    let s = advancedMode ? "Hide" : "Show";
    (this.firstChild as Text).data = pTrans_(s) || s;
    this.setAttribute("aria-checked", "" + advancedMode);
    }, 9);
  };
  (_element as AdvancedOptBtn).onclick(null, true);

  if (Build.MayOverrideNewTab && bgSettings_.CONST_.OverrideNewTab_) {
    $("#focusNewTabContent").dataset.model = "Boolean";
    nextTick_(box => box.style.display = "", $("#focusNewTabContentBox"));
    nextTick_(([el1, el2]) => el2.previousElementSibling !== el1 && el2.parentElement.insertBefore(el1, el2)
      , [$<HTMLElement>("#newTabUrlBox"), $<EnsuredMountedHTMLElement>("searchUrlBox")] as const);
  }
  if (!Build.NoDialogUI && bgSettings_.CONST_.OptionsUIOpenInTab_) {
    $("#dialogMode").dataset.model = "Boolean";
    nextTick_(box => box.style.display = "", $("#dialogModeBox"));
  }
  if (!(Build.BTypes & BrowserType.Chrome)
      || Build.BTypes & ~BrowserType.Chrome && bgOnOther_ !== BrowserType.Chrome) {
    $("#hookAccessKeys").removeAttribute("data-model");
    nextTick_(box => box.style.display = "none", $("#hookAccessKeysBox"));
  }

  let _ref: {length: number, [index: number]: HTMLElement} = $$("[data-model]");
  const types = {
    Number: NumberOption_,
    Text: TextOption_,
    NonEmptyText: NonEmptyTextOption_,
    JSON: JSONOption_,
    MaskedText: MaskedText_,
    Boolean: BooleanOption_,
    ExclusionRules: ExclusionRulesOption_,
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    _element = _ref[_i];
    const cls = types[_element.dataset.model as "Text"];
    // tslint:disable-next-line: no-unused-expression
    const instance = new cls(_element as TextElement, onUpdated);
    instance.fetch_();
    (Option_.all_ as SafeDict<Option_<keyof AllowedOptions>>)[instance.field_] = instance;
  }
  nextTick_(() => {
    const ref = Option_.all_;
    Option_.suppressPopulate_ = false;
    for (let key in ref) {
      ref[key as "vimSync"].populateElement_(ref[key as "vimSync"].previous_);
    }
  });
  if (Option_.all_.exclusionRules.previous_.length > 0) {
    nextTick_(el => {
      el.style.visibility = "";
    }, $("#exclusionToolbar"));
  }

  _ref = $$("[data-check]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _element = _ref[_i];
    _element.addEventListener(_element.dataset.check || "input", loadChecker);
  }

  document.addEventListener("keyup", function (this: void, event): void {
    const el = event.target as Element, i = event.keyCode;
    if (i !== kKeyCode.enter) {
      if (i !== kKeyCode.space) { return; }
      if (el instanceof HTMLSpanElement && el.parentElement instanceof HTMLLabelElement) {
        event.preventDefault();
        click(el.parentElement.control as HTMLElement);
      }
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      el.hasAttribute("href") || setTimeout(function (el1) {
        click(el1);
        el1.blur();
      }, 0, el);
    } else if (event.ctrlKey || event.metaKey) {
      el.blur && el.blur();
      if (status) {
        return saveBtn.onclick();
      }
    }
  });

  let func: (this: HTMLElement, event: MouseEventToPrevent) => void = function (this: HTMLElement): void {
    const target = $("#" + this.dataset.autoResize as string);
    let height = target.scrollHeight, width = target.scrollWidth, dw = width - target.clientWidth;
    if (height <= target.clientHeight && dw <= 0) { return; }
    const maxWidth = Math.max(Math.min(innerWidth, 1024) - 120, 550);
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
    _ref[_i].onclick = func;
  }

  func = function (event): void {
    let str = this.dataset.delay as string, e = null as MouseEventToPrevent | null;
    if (str !== "continue") {
      event && event.preventDefault();
    }
    if (str === "event") { e = event || null; }
    (window as OptionWindow)._delayed = ["#" + this.id, e];
    if (document.readyState === "complete") {
      loadJS("options_ext.js");
      return;
    }
    window.addEventListener("load", function onLoad(event1): void {
      if (event1.target === document) {
        window.removeEventListener("load", onLoad);
        loadJS("options_ext.js");
      }
    });
  } as ElementWithDelay["onclick"];
  _ref = $$("[data-delay]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredWebkitUserSelectAll
      && bgBrowserVer_ < BrowserVer.MinEnsuredWebkitUserSelectAll) {
  _ref = $$(".sel-all");
  func = function (this: HTMLElement, event): void {
    if (event.target !== this) { return; }
    event.preventDefault();
    getSelection().selectAllChildren(this);
  } as ElementWithDelay["onmousedown"];
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onmousedown = func;
  }
  }

  let setUI = function (curTabId: number | null): void {
    const ratio = BG_.devicePixelRatio, element2 = document.getElementById("openInTab") as HTMLAnchorElement;
    const mainHeader = document.getElementById("mainHeader") as HTMLElement;
    element2.onclick = function (this: HTMLAnchorElement): void {
      setTimeout(window.close, 17);
    };
    nextTick_(() => {
    (document.body as HTMLBodyElement).classList.add("dialog-ui");
    mainHeader.remove();
    element2.style.display = "";
    (element2.nextElementSibling as Element).remove();
    });
    if (Build.MinCVer >= BrowserVer.MinCorrectBoxWidthForOptionsUI
        || !(Build.BTypes & BrowserType.Chrome)
        || bgBrowserVer_ >= BrowserVer.MinCorrectBoxWidthForOptionsUI) { return; }
    ratio > 1 && ((document.body as HTMLBodyElement).style.width = 910 / ratio + "px");
    ( !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$Tabs$$getZoom)
      || Build.BTypes & BrowserType.ChromeOrFirefox && chrome.tabs.getZoom) &&
    chrome.tabs.getZoom(curTabId, function (zoom): void {
      if (!zoom) { return chrome.runtime.lastError; }
      const ratio2 = Math.round(devicePixelRatio / zoom * 1024) / 1024;
      (document.body as HTMLBodyElement).style.width = ratio2 !== 1 ? 910 / ratio2 + "px" : "";
    });
  }, opt: Option_<keyof AllowedOptions>;
  if (Build.NoDialogUI) { /* empty */ }
  else if (location.hash.toLowerCase() === "#dialog-ui") {
    setUI(null);
    setUI = null as never;
  } else if (chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs): void {
      let url: string;
      if (document.hasFocus() && tabs[0] && (url = tabs[0].url).indexOf("-") > 0
              && url.lastIndexOf(location.protocol, 0) < 0) {
        setUI(tabs[0].id);
      }
      setUI = null as never;
    });
  }
  opt = Option_.all_.keyMappings;
  opt.onSave_ = function (): void {
    const errors = bgSettings_.temp_.cmdErrors_,
    msg = !errors ? "" : pTrans_("openBgLogs", [pTrans_(errors === 1 ? "error" : "errors", [errors])]);
    if (bgSettings_.payload_.L && !msg) {
      let str = Object.keys(BG_.CommandsData_.keyMap_).join(""), mapKey = BG_.CommandsData_.mappedKeyRegistry_;
      str += mapKey ? Object.keys(mapKey).join("") : "";
      if ((<RegExpOne> /[^ -\xff]/).test(str)) {
        this.showError_(pTrans_("ignoredNonEN"), null);
        return;
      }
    }
    this.showError_(msg);
  };
  opt.onSave_();

  let optChars = Option_.all_.linkHintCharacters, optNums = Option_.all_.linkHintNumbers;
  opt = Option_.all_.filterLinkHints;
  optChars.onSave_ = optNums.onSave_ = function (this: Option_<"linkHintCharacters" | "linkHintNumbers">): void {
    this.showError_(!this.element_.style.display && this.previous_.length < GlobalConsts.MinHintCharSetSize
        ? pTrans_("hintCharsTooFew") : "");
  };
  opt.onSave_ = function (): void {
    nextTick_(el => {
      const enableFilterLinkHints = Option_.all_.filterLinkHints.readValueFromElement_();
      el.style.display = optNums.element_.style.display = enableFilterLinkHints ? "" : "none";
      optChars.element_.style.display = enableFilterLinkHints ? "none" : "";
      optChars.onSave_();
      optNums.onSave_();
    }, $<HTMLElement>("#waitForEnterBox"));
  };
  opt.onSave_();
  opt.element_.addEventListener("change", opt.onSave_.bind(opt), true);

  opt = Option_.all_.vomnibarPage;
  opt.onSave_ = function (this: Option_<"vomnibarPage">): void {
    let {element_: element2} = this, url: string = this.previous_
      , isExtPage = !url.lastIndexOf(location.protocol, 0) || !url.lastIndexOf("front/", 0);
    if (Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
        && Build.BTypes & BrowserType.Chrome
        && bgBrowserVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
      nextTick_(() => {
        element2.style.textDecoration = isExtPage ? "" : "line-through";
      });
      return this.showError_(
        url === bgSettings_.defaults_.vomnibarPage ? ""
          : pTrans_("onlyExtVomnibar", [BrowserVer.Min$tabs$$executeScript$hasFrameIdArg]),
        null);
    }
    url = bgSettings_.cache_.vomnibarPage_f || url; // for the case Chrome is initing
    if (isExtPage) { /* empty */ }
    // Note: the old code here thought on Firefox web pages couldn't be used, but it was just because of wrappedJSObject
    else if (url.lastIndexOf("file://", 0) !== -1) {
      return this.showError_(pTrans_("fileVomnibar"), "highlight");
    } else if (url.lastIndexOf("http://", 0) !== -1) {
      return this.showError_(pTrans_("httpVomnibar"), "highlight");
    }
    return this.showError_("");
  };
  opt.onSave_();

  _ref = $$("[data-permission]");
  _ref.length > 0 && ((els: typeof _ref): void => {
    const manifest = chrome.runtime.getManifest();
    for (const key of manifest.permissions || []) {
      manifest[key] = true;
    }
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      let key = el.dataset.permission as string;
      if (key[0] === "C") {
        if (!(Build.BTypes & BrowserType.Chrome)
            || Build.BTypes & ~BrowserType.Chrome && bgOnOther_ !== BrowserType.Chrome) {
          if (key === "C") { // hide directly
            nextTick_(parentEl => {
              parentEl.style.display = "none";
            }, (el as EnsuredMountedHTMLElement).parentElement.parentElement.parentElement);
          }
          continue;
        } else if (bgBrowserVer_ >= +key.slice(1)) {
          continue;
        }
        key = pTrans_("beforeChromium", [key.slice(1)]);
      } else {
        if (key in manifest) { continue; }
        key = pTrans_("lackPermission", [key ? ":\n* " + key : ""]);
      }
      key = pTrans_("invalidOption", [key]);
      nextTick_(el1 => {
        (el1 as TextElement).disabled = true;
        if (el1 instanceof HTMLInputElement && el1.type === "checkbox") {
          el1 = el1.parentElement as HTMLElement;
          el1.title = key;
        } else {
          (el1 as TextElement).value = "";
          el1.title = key;
          (el1.parentElement as HTMLElement).onclick = onclick;
        }
      }, el);
    }
    function onclick(this: HTMLElement): void {
      const el = this.querySelector("[data-permission]") as TextElement | null;
      this.onclick = null as never;
      if (!el) { return; }
      const key = el.dataset.permission;
      el.placeholder = pTrans_("lackPermission", [key ? `: "${key}"` : ""]);
    }
  })(_ref);
  if (BG_.Settings_.CONST_.GlobalCommands_.length === 0) {
    nextTick_(ref2 => {
      for (let _i = ref2.length; 0 <= --_i; ) {
        ref2[_i].remove();
      }
    }, $$(".require-shortcuts"));
  }
  if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)) {
    nextTick_(tipForNoShadow => {
      tipForNoShadow.innerHTML = '(On Edge, may need "<kbd>#VimiumUI</kbd>" as prefix if no Shadow DOM)';
    }, $("#tipForNoShadow"));
  }

  nextTick_(ref2 => {
  for (let _i = ref2.length; 0 <= --_i; ) {
    const element = ref2[_i] as HTMLInputElement;
    let str = element.dataset.href as string;
    str = BG_.BgUtils_.convertToUrl_(str, null, Urls.WorkType.ConvertKnown);
    element.removeAttribute("data-href");
    element.setAttribute("href", str);
  }
  }, $$("[data-href]"));

  function onBeforeUnload(): string {
    return pTrans_("beforeUnload");
  }

  _element = $<HTMLAnchorElement>("#openExtensionPage");
  if (Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && Build.BTypes & BrowserType.Chrome
      && bgBrowserVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    (_element as HTMLAnchorElement).href = "chrome://extensions/configureCommands";
  } else if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
    nextTick_(([el, el2, el3]) => {
      el.textContent = el.href = "about:addons";
      const el1 = el.parentElement as HTMLElement, prefix = GlobalConsts.FirefoxAddonPrefix;
      el1.insertBefore(new Text(pTrans_("manageShortcut")), el);
      el1.insertBefore(new Text(pTrans_("manageShortcut_2")), el.nextSibling);
      el2.href = prefix + "shortcut-forwarding-tool/";
      el3.href = prefix + "newtab-adapter/";
    }, [_element as HTMLAnchorElement,
        $<HTMLAnchorElement>("#shortcutHelper"), $<HTMLAnchorElement>("#newTabAdapter")] as const);
  }
  (_element as HTMLAnchorElement).onclick = function (event): void {
    event.preventDefault();
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      window.VHud ? VHud.tip_(kTip.haveToOpenManually) : alert(pTrans_("" + kTip.haveToOpenManually));
    } else {
      BG_.Backend_.focus_({ u: this.href, r: ReuseType.reuse, p: true });
    }
  };

  if (Build.BTypes & BrowserType.ChromeOrFirefox
      && (!(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
          || (bgOnOther_ & BrowserType.ChromeOrFirefox))) {
    nextTick_(el => {
      const children = el.children, anchor = children[1] as HTMLAnchorElement, name = pTrans_("NewTabAdapter");
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
        children[0].textContent = "moz";
        anchor.textContent = name;
        anchor.href = GlobalConsts.FirefoxAddonPrefix + "newtab-adapter/";
      }
      anchor.title = name + " - " + pTrans_(Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox) ? "addons" : "webstore");
    }, $("#chromeExtVomnibar"));
  }

  if (BG_.Backend_.setIcon_ === BG_.BgUtils_.blank_ && Option_.all_.showActionIcon.previous_) {
    nextTick_(el2 => {
    let element = Option_.all_.showActionIcon.element_;
    (element as EnsuredMountedHTMLElement).nextElementSibling.classList.add("has-error");
    el2.textContent = pTrans_("notReadCanvas");
    }, $("#showActionIconHelp"));
  }

  _ref = $$(".ref-text");
  const updateRefStat = function (this: BooleanOption_<PossibleOptionNames<boolean>>): void {
    nextTick_(ref2 => {
      ref2.textContent = pTrans_(this.previous_ ? "o145_2" : "o144");
    }, $(`#${this.element_.id}Status`));
  },
  onRefStatClick = function (this: HTMLElement, event: MouseEventToPrevent): void {
    if (!advancedMode) {
      $<AdvancedOptBtn>("#advancedOptionsButton").onclick(null);
    }
    event.preventDefault();
    nextTick_(node2 => {
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
        && bgBrowserVer_ < BrowserVer.MinScrollIntoViewOptions
      ? window.VDom ? VDom.view_(node2) : (node2 as EnsureItemsNonNull<SafeHTMLElement>).scrollIntoViewIfNeeded()
      : node2.scrollIntoView({ block: "center" });
      node2.focus();
    }, Option_.all_[this.getAttribute("for") as "ignoreKeyboardLayout"].element_.nextElementSibling as SafeHTMLElement);
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    const name = _ref[_i].getAttribute("for") as string as PossibleOptionNames<boolean>;
    opt = Option_.all_[name];
    opt.onSave_ = updateRefStat;
    opt.onSave_();
    _ref[_i].onclick = onRefStatClick;
  }
},
optionsInitAll_ = function (): void {

optionsInit1_();

const newTabUrlOption = Option_.all_.newTabUrl;
newTabUrlOption.checker_ = {
  check_ (value: string): string {
    let url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(value)
        ? chrome.runtime.getURL(value) : BG_.BgUtils_.convertToUrl_(value.toLowerCase());
    url = url.split("?", 1)[0].split("#", 1)[0];
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
      let err = "";
      if ((<RegExpI> /^chrome|^(javascript|data|file):|^about:(?!(newtab|blank)\/?$)/i).test(url)) {
        err = pTrans_("refusedURLs", [url]);
        console.log("newTabUrl checker:", err);
      }
      Option_.all_.newTabUrl.showError_(err);
    }
    return value.lastIndexOf("http", 0) < 0 && (url in bgSettings_.newTabs_
      || (<RegExpI> /^(?!http|ftp)[a-z\-]+:\/?\/?newtab\b\/?/i).test(value)
      ) ? bgSettings_.defaults_.newTabUrl : value;
  }
};
newTabUrlOption.checker_.check_(newTabUrlOption.previous_);

Option_.all_.userDefinedCss.onSave_ = function () {
  if (!window.VDom || !VDom.cache_) { return; }
  const root = VCui.root_;
  let debuggedStyle = root && root.querySelector("style.debugged") as HTMLStyleElement | null;
  if (!debuggedStyle) { return; }
  setTimeout(function () {
    (debuggedStyle as HTMLStyleElement).remove();
    const iframes = VCui.root_.querySelectorAll("iframe");
    for (let i = 0, end = iframes.length; i < end; i++) {
      const frame = iframes[i], isFind = frame.classList.contains("HUD"),
      doc = frame.contentDocument as HTMLDocument,
      style = doc.querySelector("style.debugged") as HTMLStyleElement | null;
      if (!style) { /* empty */ }
      else if (isFind) {
        style.remove();
      } else {
        style.classList.remove("debugged");
      }
    }
    Option_.all_.userDefinedCss.element_.classList.remove("debugging");
  }, 500);
};

Option_.all_.autoDarkMode.onSave_ = function (): void {
  (document.documentElement as HTMLHtmlElement).classList.toggle("auto-dark", this.previous_);
};
Option_.all_.autoReduceMotion.onSave_ = function (): void {
  (document.documentElement as HTMLHtmlElement).classList.toggle("less-motion", this.previous_);
};

(Option_.all_.exclusionRules as ExclusionRulesOption_).onInited_ = onExclusionRulesInited;

optionsInit1_ = optionsInitAll_ = null as never;
(window.onhashchange as () => void)();
};

function onExclusionRulesInited(this: ExclusionRulesOption_): void {
const exclusionRules = this, table = exclusionRules.$list_;
table.ondragstart = event => {
  let dragged = exclusionRules.dragged_ = event.target as HTMLTableRowElement;
  dragged.style.opacity = "0.5";
  if (!(Build.BTypes & ~BrowserType.Firefox)
      || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
    event.dataTransfer.setData("text/plain", "");
  }
};
table.ondragend = () => {
  const dragged = exclusionRules.dragged_;
  exclusionRules.dragged_ = null;
  dragged && (dragged.style.opacity = "");
};
table.ondragover = event => event.preventDefault();
table.ondrop = event => {
  event.preventDefault();
  const dragged = exclusionRules.dragged_;
  let target = event.target as Element | null;
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest) {
    while (target && target.classList.contains("exclusionRule")) {
      target = target.parentElement as SafeHTMLElement | null;
    }
  } else {
    target = (target as Ensure<Element, "closest">).closest(".exclusionRule");
  }
  if (!dragged || !target || dragged === target) { return; }
  exclusionRules.$list_.insertBefore(dragged, target);
  const list = exclusionRules.list_, srcNode = (dragged.querySelector(".pattern") as ExclusionRealNode).vnode,
  targetNode = (target.querySelector(".pattern") as ExclusionRealNode).vnode;
  list.splice(list.indexOf(srcNode), 1);
  list.splice(list.indexOf(targetNode), 0, srcNode);
  exclusionRules.onUpdated_();
};
}

$("#userDefinedCss").addEventListener("input", debounce_(function (): void {
  if (!window.VDom || !VDom.cache_) { return; }
  const root = VCui.root_ as VUIRoot | null, self = Option_.all_.userDefinedCss;
  let styleDebug = root && root.querySelector("style.debugged") as HTMLStyleElement | null;
  if (styleDebug) {
    if (styleDebug.nextElementSibling) {
      (root as VUIRoot).appendChild(styleDebug);
    }
  } else {
    if (self.saved_) {
      return;
    }
    styleDebug = document.createElement("style");
    styleDebug.className = "debugged";
    const patch = function (): void {
      /** Note: should keep the same as {@link ../background/settings.ts#Settings_.updateHooks_.userDefinedCss } */
      let css = localStorage.getItem("innerCSS") as string, headEnd = css.indexOf("\n");
      css = css.substr(headEnd + 1, +css.slice(0, headEnd).split(",")[2]);
      VCui.css_(css);
      (VCui.root_ as NonNullable<VUIRoot>).appendChild(styleDebug as HTMLStyleElement);
    };
    if (root) {
      patch();
    } else {
      VCui.add_(styleDebug);
      styleDebug.remove();
      setTimeout(patch, 200);
    }
  }
  const newVal = self.readValueFromElement_(),
  isSame = newVal === self.previous_,
  css2 = bgSettings_.parseCustomCSS_(newVal);
  if (isSame) {
    self.element_.classList.remove("debugging");
  } else {
    self.element_.classList.add("debugging");
  }
  styleDebug.textContent = css2.ui || "";
  const iframes = root ? root.querySelectorAll("iframe") : [];
  for (let i = 0, end = iframes.length; i < end; i++) {
    type StyleEl = HTMLStyleElement;
    const frame = iframes[i], isFind = frame.classList.contains("HUD"),
    doc = frame.contentDocument as HTMLDocument,
    root2 = isFind ? (VCui.styleFind_ as StyleEl).parentNode as HTMLElement : doc;
    styleDebug = root2.querySelector("style.debugged") as HTMLStyleElement | null;
    if (!styleDebug) {
      if (isFind) {
        const oldCSS2 = bgSettings_.parseCustomCSS_(bgSettings_.get_("userDefinedCss")).find || "";
        if (oldCSS2) {
          const str = bgSettings_.cache_.findCSS_.i;
          (VCui.styleFind_ as StyleEl).textContent = str.slice(0, -oldCSS2.length - 1);
        }
        styleDebug = doc.createElement("style");
        styleDebug.type = "text/css";
        styleDebug.parentNode || root2.appendChild(styleDebug);
      } else {
        styleDebug = doc.querySelector("#custom") as HTMLStyleElement | null;
        if (!styleDebug) {
          /** should keep the same as {@link ../front/vomnibar#Vomnibar_.css_} */
          styleDebug = doc.createElement("style");
          styleDebug.type = "text/css";
          styleDebug.id = "custom";
        }
        styleDebug.parentNode || (doc.head as HTMLHeadElement).appendChild(styleDebug);
      }
      styleDebug.classList.add("debugged");
    }
    styleDebug.textContent = isFind ? css2.find || ""
      : (isSame ? "" : "\n.transparent { opacity: 1; }\n") + (css2.omni && css2.omni + "\n" || "");
    const UI = window.VCui, findCss = UI && UI.findCss_;
    if (isFind && findCss) {
      /** Note: should keep the same as {@link ../background/settings.ts#Settings_.updateHooks_.userDefinedCss } */
      let css = localStorage.getItem("findCSS") as string, defaultLen = parseInt(css, 10);
      findCss.i = findCss.i.slice(0, defaultLen - findCss.c.length - findCss.s.length - 1)
        + "\n" + (css2.find || "");
    }
  }
}, 1800, $("#userDefinedCss") as HTMLTextAreaElement, 0));

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && bgBrowserVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  $("select").classList.add("font-fix");
}

$("#importButton").onclick = function (): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : click($("#settingsFile"));
};

nextTick_(el => {
el.textContent = (Build.BTypes & BrowserType.Edge
        && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)
    ? "MS Edge (EdgeHTML)"
    : Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)
    ? "Firefox " + BG_.CurFFVer_
    : ((<RegExpOne> /\sEdg\//).test(navigator.appVersion) ? ["MS Edge"]
        : (<RegExpOne> /\bChromium\b/).exec(navigator.appVersion) || ["Chrome"])[0] + " " + bgBrowserVer_
  ) + pTrans_("comma") + (pTrans_(bgSettings_.CONST_.Platform_)
        || bgSettings_.CONST_.Platform_[0].toUpperCase() + bgSettings_.CONST_.Platform_.slice(1));
}, $("#browserName"));

function loadJS(file: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = file;
  (document.head as HTMLHeadElement).appendChild(script);
  return script;
}

interface CheckerLoader { info_?: string; }
function loadChecker(this: HTMLElement): void {
  if ((loadChecker as CheckerLoader).info_ != null) { return; }
  (loadChecker as CheckerLoader).info_ = this.id;
  loadJS("options_checker.js");
}

document.addEventListener("keydown", function (this: void, event): void {
  if (event.keyCode !== kKeyCode.space) {
    if (!window.VKey || !VKey.cache_) { return; }
    let ch: string | undefined;
    if (!Build.NDEBUG && (ch = VKey.char_(event)) && VKey.key_(event, ch) === "<a-f12>") {
      $<HTMLOptionElement>("#recommendedSettings").selected = true;
      let el2 = $<HTMLSelectElement>("#importOptions");
      el2.onchange ? (el2 as any).onchange() : setTimeout(() => {
        el2.onchange && (el2 as any).onchange();
      }, 100) && el2.click();
      return;
    }
    let wanted = event.keyCode === kKeyCode.questionWin || event.keyCode === kKeyCode.questionMac ? "?" : "";
    if (wanted && (!Build.NDEBUG ? <string> ch : VKey.char_(event)) === wanted
        && VApi.mapKey_(wanted, event) === wanted) {
      if (!Build.NDEBUG && !VApi.lock_()) {
        console.log('The document receives a "?" key which has been passed (excluded) by Vimium C,',
          "so open the help dialog.");
      }
      if (!VApi.lock_()) {
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

window.onhashchange = function (this: void): void {
  let hash = location.hash, node: HTMLElement | null;
  hash = hash.slice(hash[1] === "!" ? 2 : 1);
  if (Build.MayOverrideNewTab
      && !hash && Option_.all_.newTabUrl.previous_ === bgSettings_.CONST_.NewTabForNewUser_) {
    hash = "newTabUrl";
  }
  if (!hash || !(<RegExpI> /^[a-z][a-z\d_-]*$/i).test(hash)) { return; }
  if (node = $(`[data-hash="${hash}"]`) as HTMLElement | null) {
    if (node.onclick) {
      nextTick_(() => {
        (node as ElementWithHash).onclick(null, "hash");
      });
    }
  } else if ((node = $("#" + hash))) {
    nextTick_((): void => {
    if ((node as HTMLElement).dataset.model) {
      (node as HTMLElement).classList.add("highlight");
    }
    const callback = function (event?: Event): void {
      if (event && event.target !== window) { return; }
      if (window.onload) {
        window.onload = null as never;
        window.scrollTo(0, 0);
      }
      const node2 = node as Element;
      window.VDom ? VDom.view_(node2)
        : (Build.BTypes & BrowserType.Chrome && node2.scrollIntoViewIfNeeded || node2.scrollIntoView).call(node2);
    };
    if (document.readyState === "complete") { return callback(); }
    window.scrollTo(0, 0);
    window.onload = callback;
    });
  }
};

bgSettings_.restore_ && bgSettings_.restore_() ? (
  Build.NDEBUG || console.log("Now restore settings before page loading"),
  (bgSettings_.restore_() as NonNullable<ReturnType<typeof bgSettings_.restore_>>).then(optionsInitAll_)
) : optionsInitAll_();

// below is for programmer debugging
window.onunload = function (): void {
  BG_.removeEventListener("unload", OnBgUnload);
  BG_.BgUtils_.GC_(-1);
};
BG_.BgUtils_.GC_(1);

function OnBgUnload(): void {
  BG_.removeEventListener("unload", OnBgUnload);
  setTimeout(function (): void {
    BG_ = chrome.extension.getBackgroundPage() as Window | null as typeof BG_;
    if (!BG_) { // a user may call `close()` in the console panel
      window.onbeforeunload = null as any;
      window.close();
      return;
    }
    bgSettings_ = BG_.Settings_;
    if (!bgSettings_) { BG_ = null as never; return; }
    BG_.addEventListener("unload", OnBgUnload);
    if (BG_.document.readyState !== "loading") { setTimeout(callback, 67); return; }
    BG_.addEventListener("DOMContentLoaded", function load(): void {
      BG_.removeEventListener("DOMContentLoaded", load, true);
      setTimeout(callback, 100);
    }, true);
  }, 200);
  function callback() {
    const ref = Option_.all_;
    for (const key in ref) {
      const opt = ref[key as keyof AllowedOptions], { previous_: previous } = opt;
      if (typeof previous === "object" && previous) {
        opt.previous_ = bgSettings_.get_(opt.field_);
      }
    }
    let needExclusions = false, needCommands = false;
    if ((Option_.all_.exclusionRules as ExclusionRulesOption_).list_.length > 0) {
      needExclusions = needCommands = true;
    } else if (Option_.all_.keyMappings.checker_) {
      needCommands = true;
    }
    needExclusions && !BG_.Exclusions && BG_.BgUtils_.require_("Exclusions");
    needCommands && !BG_.Commands && BG_.BgUtils_.require_("Commands");
    BG_.BgUtils_.GC_(1);
  }
}
BG_.addEventListener("unload", OnBgUnload);

const cmdRegistry = BG_.CommandsData_.keyToCommandRegistry_["?"];
if (!cmdRegistry || cmdRegistry.alias_ !== kBgCmd.showHelp) { (function (): void {
  const arr = BG_.CommandsData_.keyToCommandRegistry_;
  let matched = "";
  for (let key in arr) {
    const item = arr[key] as CommandsNS.Item;
    if (item.alias_ === kBgCmd.showHelp) {
      matched = matched && matched.length < key.length ? matched : key;
    }
  }
  if (matched) {
    nextTick_(el => el.textContent = matched, $("#questionShortcut"));
  }
})(); }

document.addEventListener("click", function onClickOnce(): void {
  if (!window.VDom || !VCui.root_) { return; }
  document.removeEventListener("click", onClickOnce, true);
  (VCui.root_ as Node).addEventListener("click", function (event): void {
    let target = event.target as HTMLElement, str: string;
    if (VApi && target.classList.contains("HelpCommandName")) {
      str = target.textContent.slice(1, -1);
      VApi.post_({
        H: kFgReq.copy,
        d: str
      });
      return VHud.copied_(str);
    }
  }, true);
}, true);

function click(a: Element): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , false, false, false, false, 0, null);
  return a.dispatchEvent(mouseEvent);
}
