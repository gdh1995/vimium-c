/// <reference path="../lib/dom_utils.ts" />
/// <reference path="../lib/keyboard_utils.ts" />
interface Window {
  readonly VPort?: VPortTy;
  readonly VHud?: VHUDTy;
  // readonly VDom?: typeof VDom;
}
declare var VPort: VPortTy, VHud: VHUDTy, VEvent: VEventModeTy;

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
  if (window.VDom) {
    (VDom.cache_ as Generalized<typeof VDom.cache_>
        )[bgSettings_.valuesToLoad_[this.field_]] = this.readValueFromElement_();
  }
};

Option_.saveOptions_ = function (): boolean {
  const arr = Option_.all_, dirty: string[] = [];
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions];
    if (!opt.saved_ && !opt.areEqual_(opt.previous_ as never, bgSettings_.get_(opt.field_) as never)) {
      dirty.push(opt.field_);
    }
  }
  if (dirty.length > 0) {
    let ok = confirm(
`Such options have been changed at other places:
  * ${dirty.join("\n  * ")}
Continue to save and override these changes?`);
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

type TextOptionNames = PossibleOptionNames<string>;
class TextOption_<T extends TextOptionNames> extends Option_<T> {
readonly element_: TextElement;
readonly converter_: string[];
needToCovertToCharsOnRead_: boolean;
previous_: string;
constructor (element: TextElement, onUpdated: (this: TextOption_<T>) => void) {
  super(element, onUpdated);
  const conv = this.element_.dataset.converter || "", ops = conv ? conv.split(" ") : [];
  this.element_.oninput = this.onUpdated_;
  this.converter_ = ops;
  this.needToCovertToCharsOnRead_ = false;
  if (ops.indexOf("chars") >= 0) {
    this.checker_ = TextOption_.charsChecker;
  }
}
whiteRe_: RegExpG;
whiteMaskRe_: RegExpG;
fetch_ (): void {
  super.fetch_();
  // allow old users to correct mistaken chars and save
  this.needToCovertToCharsOnRead_ = this.converter_.indexOf("chars") >= 0
    && TextOption_.charsChecker.check_(this.previous_) === this.previous_;
}
populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void {
  value = (value as string).replace(this.whiteRe_, "\xa0");
  if (enableUndo !== true) {
    this.element_.value = value as string;
    return;
  }
  return this.atomicUpdate_(value as string, true, true);
}
readValueFromElement_ (): AllowedOptions[T] {
  let value = this.element_.value.trim().replace(this.whiteMaskRe_, " "), ops = this.converter_;
  if (value && ops.length > 0) {
    ops.indexOf("lower") >= 0 && (value = value.toLowerCase());
    ops.indexOf("upper") >= 0 && (value = value.toUpperCase());
    if (this.needToCovertToCharsOnRead_) {
      value = TextOption_.toChars(value);
    }
  }
  return value;
}
static charsChecker: BaseChecker<string> = {
  check_ (value: string): string {
    return TextOption_.toChars(value);
  }
};
static toChars (value: string): string {
  let str2 = "";
  for (let ch of value.replace(<RegExpG> /\s/g, "")) {
    if (str2.indexOf(ch) < 0) {
      str2 += ch;
    }
  }
  return str2;
}
}
TextOption_.prototype.whiteRe_ = <RegExpG> / /g;
TextOption_.prototype.whiteMaskRe_ = <RegExpG> /\xa0/g;

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
class JSONOption_<T extends TextOptionNames> extends TextOption_<T> {
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
      this.element_.placeholder = this.element_.dataset.mask || "  # Click to unmask the content\u2026";
      return;
    }
    super.populateElement_(value, enableUndo);
  }
  readValueFromElement_ (): AllowedOptions[T] {
    return this.masked_ ? this.previous_ : super.readValueFromElement_();
  }
}

JSONOption_.prototype.areEqual_ = Option_.areJSONEqual_;

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
    if (this.field_ === "ignoreCapsLock" && window.VDom) {
      VKey.ignoreCapsLock_ = VDom.cache_.i = value > 1 || value === 1 && !!bgSettings_.payload_.m;
    }
    return value;
  }
  onTripleStatusesClicked (event: Event): void {
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

TextOption_.prototype.showError_ = function<T extends TextOptionNames>(this: TextOption_<T>
    , msg: string, tag?: OptionErrorType | null, errors?: boolean): void {
  errors != null || (errors = !!msg);
  const { element_: el } = this, { classList: cls } = el, par = el.parentElement as HTMLElement;
  let errEl = par.querySelector(".tip") as HTMLElement | null;
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

if ((Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo
  && Build.BTypes & BrowserType.Chrome
  && bgBrowserVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo)
|| devicePixelRatio < 2 && (Build.MinCVer >= BrowserVer.MinRoundedBorderWidthIsNotEnsured
  || bgBrowserVer_ >= BrowserVer.MinRoundedBorderWidthIsNotEnsured)
) { nextTick_((): void => {
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
}); }

nextTick_(versionEl => {
  const docCls = (document.documentElement as HTMLHtmlElement).classList;
  bgSettings_.payload_.d && docCls.add("auto-dark");
  bgSettings_.payload_.r && docCls.add("less-motion");
  versionEl.textContent = bgSettings_.CONST_.VerName_;
}, $<HTMLElement>(".version"));

interface SaveBtn extends HTMLButtonElement {
  onclick (this: SaveBtn, virtually?: MouseEvent | false): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}
(function () {
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
    (this.firstChild as Text).data = "Saved";
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
    (this.firstChild as Text).data = (advancedMode ? "Hide" : "Show") + " Advanced Options";
    this.setAttribute("aria-checked", "" + advancedMode);
    }, 9);
  };
  (_element as AdvancedOptBtn).onclick(null, true);

  if (!(Build.MayOverrideNewTab && bgSettings_.CONST_.OverrideNewTab_)) {
    nextTick_(context => {
      context[0].remove();
      context[1].remove();
    }, [
      $<EnsuredMountedElement & HTMLElement>("#focusNewTabContent").parentElement.parentElement.parentElement,
      $<EnsuredMountedElement & HTMLElement>("#newTabUrlRefer")
    ]);
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

  nextTick_(ref1 => {
  for (let _i = ref1.length; 0 <= --_i; ) {
    const element = ref1[_i];
    element.className += " info";
    element.textContent = "Delete all to reset this option.";
  }
  }, $$(".nonEmptyTip") as NodeListOf<HTMLElement>);

  let func: (this: HTMLElement, event: MouseEvent) => void = function (this: HTMLElement): void {
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
  nextTick_(ref => {
    for (let _i = ref.length; 0 <= --_i; ) {
    const element = ref[_i];
    element.tabIndex = 0;
    element.textContent = "Auto resize";
    element.setAttribute("role", "button");
    }
  }, _ref);

  func = function (event): void {
    let str = this.dataset.delay as string, e = null as MouseEvent | null;
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

  _ref = $$(".sel-all");
  func = function (this: HTMLElement, event: MouseEvent): void {
    if (event.target !== this) { return; }
    event.preventDefault();
    getSelection().selectAllChildren(this);
  } as ElementWithDelay["onmousedown"];
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onmousedown = func;
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
    if (Build.MinCVer >= BrowserVer.MinCorrectBoxWidthForOptionUI
        || !(Build.BTypes & BrowserType.Chrome)
        || bgBrowserVer_ >= BrowserVer.MinCorrectBoxWidthForOptionUI) { return; }
    nextTick_(() => {
    ratio > 1 && ((document.body as HTMLBodyElement).style.width = 910 / ratio + "px");
    });
    chrome.tabs.getZoom && chrome.tabs.getZoom(curTabId, function (zoom): void {
      // >= BrowserVer.Min$Tabs$$getZoom
      if (!zoom) { return chrome.runtime.lastError; }
      const ratio2 = Math.round(devicePixelRatio / zoom * 1024) / 1024;
      (document.body as HTMLBodyElement).style.width = ratio2 !== 1 ? 910 / ratio2 + "px" : "";
    });
  };
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
  Option_.all_.keyMappings.onSave_ = function (): void {
    const errors = bgSettings_.temp_.cmdErrors_,
    msg = !errors ? "" : (errors === 1 ? "There's 1 error" : `There're ${errors} errors`
      ) + " found.\nPlease see logs of background page for more details.";
    return this.showError_(msg);
  };
  Option_.all_.keyMappings.onSave_();

  Option_.all_.linkHintCharacters.onSave_ = function (): void {
    const errors = this.previous_.length < 3;
    return this.showError_(errors ? "Characters for LinkHints are too few." : "");
  };
  Option_.all_.linkHintCharacters.onSave_();

  Option_.all_.vomnibarPage.onSave_ = function (): void {
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
          : `Only extension vomnibar pages can work before Chrome ${BrowserVer.Min$tabs$$executeScript$hasFrameIdArg}.`,
        null);
    }
    url = bgSettings_.cache_.vomnibarPage_f || url; // for the case Chrome is initing
    if (isExtPage) { /* empty */ }
    else if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
      // Note(gdh1995): tests on FF 66.0.3 (stable) / 67.0b19 (beta) (x64, Win 10)
      //     shows that the web page iframe may fail to receive ANY messages from content/vomnibar.ts,
      //     and neither re-sending nor re-adding-listener can work.
      // This bug often occurs after Vimium C gets reloaded and the test page gets refreshed,
      // and after further several refreshing, sometimes it may work - sometimes still not.
      return this.showError_("A web page of vomnibar may fail because of bugs of Firefox."
        , "highlight");
    }
    else if (url.lastIndexOf("file://", 0) !== -1) {
      return this.showError_("A file page of vomnibar is limited by Chrome to only work on file://* pages."
        , "highlight");
    } else if (url.lastIndexOf("http://", 0) !== -1) {
      return this.showError_("A HTTP page of vomnibar is limited by Chrome and doesn't work on HTTPS pages."
        , "highlight");
    }
    return this.showError_("");
  };
  Option_.all_.vomnibarPage.onSave_();

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
        key = "on Chromium browsers before v" + key.slice(1);
      } else {
        if (key in manifest) { continue; }
        key = `for lacking permission${key ? ":\n* " + key : ""}`;
      }
      key = "This option is invalid " + key;
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
      el.placeholder = `lacking permission${key ? ` "${key}"` : ""}`;
    }
  })(_ref);
  if (BG_.Settings_.CONST_.GlobalCommands_.length === 0) {
    nextTick_(ref2 => {
      for (let _i = ref2.length; 0 <= --_i; ) {
        ref2[_i].remove();
      }
    }, $$(".require-shortcuts"));
  }
  if ((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredShadowDOMV1)
      && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
      && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)) {
    nextTick_(tipForNoShadow => {
      tipForNoShadow.remove();
    }, $("#tipForNoShadow"));
  }

  nextTick_(ref2 => {
  function toggleHide(element2: HTMLElement): void | 1 {
    element2.tabIndex = -1;
    return element2.setAttribute("aria-hidden", "true");
  }

  for (let _i = ref2.length; 0 <= --_i; ) {
    let element = ref2[_i] as HTMLInputElement;
    if ((element as HTMLInputElement).disabled) { continue; }
    toggleHide(element);
    toggleHide(element.parentElement as HTMLElement);
    element = element.nextElementSibling as HTMLInputElement;
    element.classList.add("checkboxHint");
    element.setAttribute("role", "checkbox");
    element.tabIndex = 0;
    element.setAttribute("aria-hidden", "false");
  }
  }, $$('[data-model="Boolean"]'));

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
    return "You have unsaved changes to options.";
  }

  _element = $<HTMLAnchorElement>("#openExtensionPage");
  if (Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && Build.BTypes & BrowserType.Chrome
      && bgBrowserVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    nextTick_(el => {
      el.href = "chrome://extensions/configureCommands";
      (el.parentElement as HTMLElement).insertBefore(document.createTextNode('"Keyboard shortcuts" of '), el);
    }, _element as HTMLAnchorElement);
  } else if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
    nextTick_(el => {
      el.textContent = el.href = "about:addons";
      (el.parentElement as HTMLElement).insertBefore(
        document.createTextNode('"Manage Shortcuts" in "Tools Menu" of '), el);
    }, _element as HTMLAnchorElement);
  }
  (_element as HTMLAnchorElement).onclick = function (event): void {
    event.preventDefault();
    return BG_.Backend_.focus_({ u: this.href, r: ReuseType.reuse, p: true });
  };

  if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
    _element = $("#chromeExtVomnibar");
    nextTick_(el => {
      (el.nextSibling as Text).remove();
      el.remove();
    }, _element);
  }

  if (Build.MayOverrideNewTab && bgSettings_.CONST_.OverrideNewTab_) {
    Option_.all_.focusNewTabContent.onSave_ = function (): void {
      nextTick_(ref2 => {
        ref2[0].textContent = ref2[1];
      }, [$("#focusNewTabStatus"), this.previous_ ? "enabled" : "disabled"] as const);
    };
    Option_.all_.focusNewTabContent.onSave_();
    $("#focusNewTabTitle").onclick = function (): void {
      if (!advancedMode) {
        $<AdvancedOptBtn>("#advancedOptionsButton").onclick(null);
      }
      const node2 = Option_.all_.focusNewTabContent.element_.nextElementSibling as SafeHTMLElement;
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
        && bgBrowserVer_ < BrowserVer.MinScrollIntoViewOptions
      ? window.VDom ? VDom.view_(node2) : (node2 as EnsureItemsNonNull<SafeHTMLElement>).scrollIntoViewIfNeeded()
      : node2.scrollIntoView({ block: "center" });
      node2.focus();
    };
  }
  if (BG_.Backend_.setIcon_ === BG_.BgUtils_.blank_ && Option_.all_.showActionIcon.previous_) {
    nextTick_(() => {
    let element = Option_.all_.showActionIcon.element_;
    (element as EnsuredMountedHTMLElement).nextElementSibling.classList.add("has-error");
    (element as EnsuredMountedHTMLElement).parentNode.parentNode.nextElementSibling.firstElementChild.textContent =
        'Sorry, but the icon can not be dynamic if the browser flag "--disable-reading-from-canvas" is enabled';
    });
  }
})();

Option_.all_.newTabUrl.checker_ = {
  check_ (value: string): string {
    let url = (<RegExpI> /^\/?pages\/[a-z]+.html\b/i).test(value)
        ? chrome.runtime.getURL(value) : BG_.BgUtils_.convertToUrl_(value.toLowerCase());
    url = url.split("?", 1)[0].split("#", 1)[0];
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && bgOnOther_ === BrowserType.Firefox) {
      if ((<RegExpI> /^chrome|^(javascript|data|file):|^about:(?!(newtab|blank)\/?$)/i).test(url)) {
        const err = `The URL "${url}" is refused by the Firefox browser to be opened by a web-extension.`;
        console.log("newTabUrl checker:", err);
        Option_.all_.newTabUrl.showError_(err);
      } else {
        Option_.all_.newTabUrl.showError_("");
      }
    }
    return value.lastIndexOf("http", 0) < 0 && (url in bgSettings_.newTabs_
      || (<RegExpI> /^[a-z\-]+:\/?\/?newtab\b\/?/i).test(value)
      ) ? bgSettings_.defaults_.newTabUrl : value;
  }
};
Option_.all_.newTabUrl.checker_.check_(Option_.all_.newTabUrl.previous_);

$("#userDefinedCss").addEventListener("input", debounce_(function (): void {
  if (!window.VDom) { return; }
  const root = VDom.UI.UI as VUIRoot | null, self = Option_.all_.userDefinedCss;
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
    const patch = function () {
      /** Note: shoule keep the same as {@link ../background/settings.ts#Settings_.updateHooks_.userDefinedCss } */
      let css = localStorage.getItem("innerCSS") as string, headEnd = css.indexOf("\n");
      css = css.substr(headEnd + 1, +css.slice(0, headEnd).split(",")[2]);
      VDom.UI.css_(css);
      (VDom.UI.UI as NonNullable<VUIRoot>).appendChild(styleDebug as HTMLStyleElement);
    };
    if (root) {
      patch();
    } else {
      VDom.UI.add_(styleDebug);
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
    const frame = iframes[i], isFind = frame.classList.contains("HUD"),
    doc = frame.contentDocument as HTMLDocument;
    styleDebug = doc.querySelector("style.debugged") as HTMLStyleElement | null;
    if (!styleDebug) {
      if (isFind) {
        const oldCSS2 = bgSettings_.parseCustomCSS_(bgSettings_.get_("userDefinedCss")).find || "";
        if (oldCSS2) {
          const str = bgSettings_.cache_.findCSS_.i;
          (doc.querySelector("style") as HTMLStyleElement).textContent = str.slice(0, -oldCSS2.length - 1);
        }
        styleDebug = doc.createElement("style");
        styleDebug.type = "text/css";
      } else {
        styleDebug = doc.querySelector("#custom") as HTMLStyleElement | null;
        if (!styleDebug) {
          /** shoule keep the same as {@link ../front/vomnibar#Vomnibar_.css_} */
          styleDebug = doc.createElement("style");
          styleDebug.type = "text/css";
          styleDebug.id = "custom";
        }
      }
      styleDebug.classList.add("debugged");
      styleDebug.parentNode || (doc.head as HTMLHeadElement).appendChild(styleDebug);
    }
    styleDebug.textContent = isFind ? css2.find || ""
      : (isSame ? "" : "\n.transparent { opacity: 1; }\n") + (css2.omni && css2.omni + "\n" || "");
    const vfind = window.VFind as NonNullable<Window["VFind"]>;
    if (isFind && vfind.css_) {
      /** Note: shoule keep the same as {@link ../background/settings.ts#Settings_.updateHooks_.userDefinedCss } */
      let css = localStorage.getItem("findCSS") as string, defaultLen = parseInt(css, 10);
      vfind.css_.i = vfind.css_.i.slice(0, defaultLen - vfind.css_.c.length - vfind.css_.s.length - 1)
        + "\n" + (css2.find || "");
    }
  }
}, 1800, $("#userDefinedCss") as HTMLTextAreaElement, 0));

Option_.all_.userDefinedCss.onSave_ = function () {
  if (!window.VDom) { return; }
  const root = VDom.UI.UI;
  let styledebugged = root && root.querySelector("style.debugged") as HTMLStyleElement | null;
  if (!styledebugged) { return; }
  setTimeout(function () {
    (styledebugged as HTMLStyleElement).remove();
    const iframes = VDom.UI.UI.querySelectorAll("iframe");
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

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && bgBrowserVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  $("select").classList.add("font-fix");
}

$("#importButton").onclick = function (): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : click($("#settingsFile"));
};

nextTick_(el1 => {
  el1.textContent = bgSettings_.defaults_.newTabUrl;
}, $("#defaultNewTab"));

nextTick_(el => {
el.textContent = (Build.BTypes & BrowserType.Edge
        && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)
    ? "MS Edge"
    : Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)
    ? "Firefox"
    : ((<RegExpOne> /\bChrom(e|ium)/).exec(navigator.appVersion) || ["Chrome"])[0]
  ) + (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)
    ? " " + (navigator.userAgent.match(/\bFirefox\/(\d+)/) || [0, ""])[1]
    : Build.BTypes & BrowserType.Chrome
        && (!(Build.BTypes & ~BrowserType.Chrome) || bgOnOther_ === BrowserType.Chrome)
    ? " " + bgBrowserVer_ : ""
  ) + (", " + bgSettings_.CONST_.Platform_[0].toUpperCase() + bgSettings_.CONST_.Platform_.slice(1));
}, $("#browserName"));

function loadJS(file: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = file;
  return (document.head as HTMLHeadElement).appendChild(script);
}

interface CheckerLoader { info_?: string; }
function loadChecker(this: HTMLElement): void {
  if ((loadChecker as CheckerLoader).info_ != null) { return; }
  (loadChecker as CheckerLoader).info_ = this.id;
  loadJS("options_checker.js");
}

document.addEventListener("keydown", function (this: void, event): void {
  if (event.keyCode !== kKeyCode.space) {
    if (!window.VKey) { return; }
    if (!Build.NDEBUG && VKey.key_(event, VKey.char_(event)) === "<a-f12>") {
      $<HTMLOptionElement>("#recommendedSettings").selected = true;
      let el2 = $<HTMLSelectElement>("#importOptions");
      el2.onchange ? (el2 as any).onchange() : setTimeout(() => {
        el2.onchange && (el2 as any).onchange();
      }, 100) && el2.click();
      return;
    }
    let wanted = event.keyCode === kKeyCode.questionWin || event.keyCode === kKeyCode.questionMac ? "?" : "";
    if (wanted && VKey.char_(event) === wanted && VKey.key_(event, wanted) === wanted) {
      if (!Build.NDEBUG && !VEvent.lock_()) {
        console.log('The document receives a "?" key which has been passed (excluded) by Vimium C,',
          "so open the help dialog.");
      }
      if (!VEvent.lock_()) {
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
  if (!hash && Option_.all_.newTabUrl.previous_ === bgSettings_.CONST_.NewTabForNewUser_) {
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
window.onhashchange(null as never);

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
  if (!window.VDom || !VDom.UI.UI) { return; }
  document.removeEventListener("click", onClickOnce, true);
  (VDom.UI.UI as Node).addEventListener("click", function (event): void {
    let target = event.target as HTMLElement, str: string;
    if (VPort && target.classList.contains("HelpCommandName")) {
      str = target.textContent.slice(1, -1);
      VPort.post_({
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
