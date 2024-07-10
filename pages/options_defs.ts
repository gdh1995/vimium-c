import {
  CurCVer_, OnChrome, OnFirefox, $, $$, nextTick_, post_, enableNextTick_, kReadyInfo, toggleReduceMotion_, OnEdge,
  CurFFVer_, OnSafari, prevent_, bTrans_
} from "./async_bg"
import type {
  AllowedOptions, Checker, PossibleOptionNames, KnownOptionsDataset, OptionErrorType, ExclusionRealNode,
  UniversalNumberOptions
} from "./options_base"
import { bgSettings_, Option_, ExclusionRulesOption_, oTrans_, delayBinding_ } from "./options_base"
import type { OptionalPermissionsOption_ } from "./options_permissions"
import { kPgReq } from "../background/page_messages"
import SettingsWithDefaults = SettingsNS.SettingsWithDefaults

Option_.syncToFrontend_ = []

Option_.prototype._onCacheUpdated = function<T extends keyof SettingsNS.AutoSyncedNameMap
    > (this: Option_<T>, func: (this: Option_<T>) => unknown): void {
  const val = func.call(this) as SettingsNS.PersistentSettings[T]
  if (this.field_ === "passEsc" || this.field_ === "ignoreReadonly") {
    this.locked_ || this.normalize_(val)
  } else if (VApi && !this.locked_) {
    const shortKey = bgSettings_.valuesToLoad_[this.field_ as keyof SettingsNS.AutoSyncedNameMap]
    const p = shortKey in bgSettings_.complexValuesToLoad_ ? post_(kPgReq.updatePayload, { key: shortKey, val })
        : Promise.resolve(val)
    void p.then((val2): void => {
      (VApi!.z! as Generalized<NonNullable<VApiTy["z"]>>)[shortKey] = val2 != null ? val2 : val as never
      if (shortKey === "l") {
        const misc = VApi!.y(), root = misc.r, frame = root && root.querySelector("iframe.Omnibar")
        frame && void post_(kPgReq.updateOmniPayload, { key: shortKey,
            val: (val2 != null ? val2 : val as never) as SettingsNS.DirectlySyncedItems[typeof shortKey][1] })
      }
      Option_.onFgCacheUpdated_?.()
    })
  }
}

Option_.prototype._manuallySyncCache = function<T extends "autoDarkMode" | "autoReduceMotion"
    > (this: Option_<T>, func: (this: Option_<T>) => unknown): void {
  const rawVal = func.call(this) as SettingsNS.PersistentSettings[T]
  if (this.locked_) { /* empty */ }
  else if (this.field_ === "autoReduceMotion") {
    const val = rawVal === 1 ? true : rawVal === 0 ? false : matchMedia("(prefers-reduced-motion: reduce)").matches
    VApi && (VApi.z!.m = val)
    toggleReduceMotion_(val)
  } else {
    this.onSave_()
  }
}

Option_.saveOptions_ = async function (): Promise<boolean> {
  const arr = Option_.all_, dirty: string[] = []
  bgSettings_.resetCache_()
  // eslint-disable-next-line dot-notation
  const permissions = (arr as Dict<Option_<any>>)["optionalPermissions"] as OptionalPermissionsOption_ | undefined
  const permissionsPromise = permissions && permissions.save_()
  await Promise.all([bgSettings_.preloadCache_(), permissionsPromise])
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions]
    if (!opt.saved_ && opt.isDirty_()) {
      dirty.push(opt.i18nName_())
    }
  }
  if (dirty.length > 0) {
    let ok = confirm(oTrans_("dirtyOptions", [dirty.join("\n  * ")]))
    if (!ok) {
      return false
    }
  }
  for (const i in arr) {
    const opt = arr[i as keyof AllowedOptions]
    if (!opt.saved_ && !opt.allowToSave_()) {
      return false
    }
  }
  enableNextTick_(kReadyInfo.LOCK)
  arr.vimSync.saved_ || await arr.vimSync.save_()
  arr.exclusionRules.saved_ || await arr.exclusionRules.save_()
  const q: Promise<void>[] = []
  for (const i in arr) {
    const item = arr[i as keyof AllowedOptions]
    item.saved_ || q.push(item.save_())
  }
  await Promise.all(q)
  enableNextTick_(kReadyInfo.NONE, kReadyInfo.LOCK)
  return true
}

Option_.needSaveOptions_ = function (): boolean {
  const arr = Option_.all_
  for (const i in arr) {
    if (!arr[i as keyof AllowedOptions].saved_) {
      return true
    }
  }
  return false
}

Option_.prototype.i18nName_ = function (): string {
  let el: EnsuredMountedHTMLElement | null = this.element_ as EnsuredMountedHTMLElement
  if (this instanceof BooleanOption_) { return el.nextElementSibling.textContent }
  if (OnChrome && Build.MinCVer < BrowserVer.Min$Element$$closest && CurCVer_ < BrowserVer.Min$Element$$closest) {
    while (el && el.localName !== "tr") {
      el = el.parentElement as EnsuredMountedHTMLElement | null
    }
  } else {
    el = el.closest!("tr") as EnsuredMountedHTMLElement | null
  }
  if (!Build.NDEBUG) {
    el = el && el.querySelector(".caption") as EnsuredMountedHTMLElement | null
    if (!el) {
      console.log("[WARNING] No i18n name found for Option #" + this.field_)
      return this.field_
    }
  } else {
    el = el!.querySelector(".caption") as EnsuredMountedHTMLElement
  }
  return (el.innerText as string).replace(<RegExpG> /[\r\n]/g, "")
}

interface NumberChecker extends Checker<"scrollStepSize"> {
  min: number | null; max: number | null; default: number
  check_ (value: number): number
}
// in fact, it's IntegerOption
export class NumberOption_<T extends UniversalNumberOptions> extends Option_<T> {
  override readonly element_: HTMLInputElement
  override previous_: number
  wheelTime_: number
  override checker_: NumberChecker
  override init_ (): void {
    let s: string, i: number
    this.checker_ = {
      min: (s = this.element_.min) && !isNaN(i = parseFloat(s)) ? i : null,
      max: (s = this.element_.max) && !isNaN(i = parseFloat(s)) ? i : null,
      default: 0,
      check_: NumberOption_.Check_
    }
    delayBinding_(this.element_, "input", this.onUpdated_)
    delayBinding_(this.element_, "focus", this.addWheelListener_.bind(this))
    nextTick_((): void => {
      this.checker_.default = bgSettings_.defaults_[this.field_]
    })
  }
  override populateElement_ (value: number): void {
    this.element_.value = "" + value
  }
  override readValueFromElement_ (): number {
    return Math.round(parseFloat(this.element_.value))
  }
  addWheelListener_ (): void {
    const el = this.element_, func = (e: WheelEvent): void => this.onWheel_(e as WheelEvent & ToPrevent),
    onBlur = (): void => {
      el.removeEventListener("wheel", func, {passive: false})
      el.removeEventListener("blur", onBlur)
      this.wheelTime_ = 0
    }
    this.wheelTime_ = 0
    el.addEventListener("wheel", func, {passive: false})
    el.addEventListener("blur", onBlur)
  }
  onWheel_ (event: WheelEvent & ToPrevent): void {
    prevent_(event)
    const oldTime = this.wheelTime_
    let i = Date.now() // safe for time changes
    if (i - oldTime < 100 && i + 99 > oldTime && oldTime) { return }
    this.wheelTime_ = i
    const el = this.element_, inc = (event.deltaY || event.deltaX) > 0, val0 = el.value
    let val: string, func: undefined | ((n: string) => number) | (
          (this: HTMLInputElement, n?: number) => void) = inc ? el.stepUp : el.stepDown
    if (typeof func === "function") {
      func.call(el)
      val = el.value
      el.value = val0
    } else {
      func = parseFloat
      let step = func(el.step) || 1
      i = (+el.value || 0) + (inc ? step : -step)
      isNaN(step = func(el.max)) || (i = Math.min(i, step))
      isNaN(step = func(el.min)) || (i = Math.max(i, step))
      val = "" + i
    }
    return this.atomicUpdate_(val, oldTime > 0, false)
  }
  static Check_ (this: NumberChecker, value: number): number {
    if (isNaN(value)) { value = this.default }
    value = this.min != null ? Math.max(this.min, value) : value
    return this.max != null ? Math.min(this.max, value) : value
  }
}

export class BooleanOption_<T extends keyof AllowedOptions> extends Option_<T> {
  override readonly element_: HTMLInputElement
  override previous_: SettingsWithDefaults[T]
  map_: readonly any[]
  true_index_: 2 | 1
  static readonly map_for_2_ = [false, true] as const
  static readonly map_for_3_ = [false, null, true] as const
  inner_status_: 0 | 1 | 2
  override init_ (): void {
    const el = this.element_ as HTMLInputElement & { dataset: KnownOptionsDataset }
    let map = el.dataset.map
    this.map_ = map ? JSON.parse(map) : el.dataset.allowNull ? BooleanOption_.map_for_3_ : BooleanOption_.map_for_2_
    this.true_index_ = (this.map_.length - 1) as 2 | 1
    if (this.true_index_ > 1 && this.field_ !== "vimSync") {
      delayBinding_(el, "input", this.onTripleStatusesClicked.bind(this), true)
    }
    delayBinding_(el, "change", this.onUpdated_)
  }
  override populateElement_ (value: SettingsWithDefaults[T]): void {
    // support false/true when .map_ is like [0, 1, 2]
    const is_true = value === true || value === this.map_[this.true_index_]
    this.element_.checked = is_true
    this.element_.indeterminate = this.true_index_ > 1 && value === this.map_[1]
    this.inner_status_ = is_true ? this.true_index_ : Math.max(0, this.map_.indexOf(value)) as 0 | 1 | 2
  }
  override readValueFromElement_ (): SettingsWithDefaults[T] {
    let value = this.element_.indeterminate ? this.map_[1] : this.map_[this.element_.checked ? this.true_index_ : 0]
    return value
  }
  onTripleStatusesClicked (event: Event): void {
    this.inner_status_ = BooleanOption_.ToggleTripleStatuses(this.inner_status_, event)
  }
  static ToggleTripleStatuses (old: 0 | 1 | 2, event: Event): 0 | 1 | 2 {
    const elemenc = event.target as HTMLInputElement
    prevent_(event as EventToPrevent)
    const newVal = old === 2 ? 1 : old ? 0 : 2
    elemenc.indeterminate = old === 2
    elemenc.checked = newVal === 2
    return newVal
  }
  override normalize_(value: SettingsWithDefaults[T]): SettingsWithDefaults[T] {
    if ((this.element_.dataset as KnownOptionsDataset).map && typeof value === "boolean") {
      value = this.map_[value ? this.true_index_ : 0]
    }
    return value
  }
  static ToggleDisabled_ (el: HTMLInputElement, disabled: boolean): void {
    el.disabled = disabled
    const text = el.nextElementSibling as HTMLElement
    text.tabIndex = disabled ? -1 : 0
    OnSafari || OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredAriaProperties ? text.ariaDisabled = disabled || null :
    disabled ? text.setAttribute("aria-disabled", "true") : text.removeAttribute("aria-disabled")
  }
}

export type TextualizedOptionNames = PossibleOptionNames<string | object>
type TextOptionNames = PossibleOptionNames<string>
export class TextOption_<T extends TextualizedOptionNames> extends Option_<T> {
  override readonly element_: TextElement
  override checker_?: Checker<T> & { ops_?: string[], status_: 0 | 1 | 2 | 3 }
  _lastError = false
  override init_ (): void {
    const converter = (this.element_.dataset as KnownOptionsDataset).converter || ""
    const ops = converter ? converter.split(" ") : []
    delayBinding_(this.element_, "input", this.onUpdated_)
    if (ops.length > 0) {
      (this as any as TextOption_<TextOptionNames>).checker_ = {
        ops_: ops,
        status_: 0,
        check_: TextOption_.normalizeByOps_
      }
    }
  }
  override fetch_ (): void | Promise<void> {
    let p = super.fetch_()
    const checker = this.checker_
    if (checker) {
      // allow old users to correct mistaken chars and save
      checker.status_ = 0
      if (!p) {
        checker.status_ = checker.check_(this.previous_) === this.previous_ ? 1 : 0
      } else {
        p = p.then((): void => {
          checker.status_ = checker.check_(this.previous_) === this.previous_ ? 1 : 0
        })
      }
    }
    return p
  }
  override populateElement_ (value: AllowedOptions[T] | string, enableUndo?: boolean): void {
    // not replace spaces with \xa0 - the old issue is not reproducible even on Chrome 35/48 + Win 10
    const value2 = OnEdge ? this.formatValue_(value).replace(<RegExpG> / /g, "\xa0") : this.formatValue_(value)
    if (enableUndo !== true) {
      this.element_.value = value2
    } else {
      this.atomicUpdate_(value2, true, true)
    }
  }
  readRaw_ (): string { return this.element_.value.trim().replace(<RegExpG> /\xa0/g, " ") }
  formatValue_ (value: AllowedOptions[T] | string): string { return value as string }
  /** @returns `string` in fact */
  override readValueFromElement_ (): AllowedOptions[T] {
    let value = this.readRaw_()
    const checker = (this as any as TextOption_<TextOptionNames>).checker_
    if (value && checker && checker.check_ === TextOption_.normalizeByOps_) {
      checker.status_ |= 2
      value = TextOption_.normalizeByOps_.call(checker, value)
      checker.status_ &= ~2
    }
    return value as AllowedOptions[T]
  }
  override doesPopulateOnSave_ (val: AllowedOptions[T]): boolean { return this.formatValue_(val) !== this.readRaw_() }
  showError_ (msg: string, tag?: OptionErrorType | null): void {
    const hasError = !!msg
    if (!hasError && !this._lastError) { return }
    this._lastError = hasError
    TextOption_.showError_(msg, tag, this.element_)
  }
  static showError_ (msg: string, tag: OptionErrorType | null | undefined, el: HTMLElement): void {
    const hasError = !!msg
    const { classList: cls, parentElement: par } = el as EnsuredMountedHTMLElement
    let errEl = el.nextElementSibling as HTMLElement | null
    errEl = errEl && errEl.classList.contains("tip") ? errEl : null
    if (!hasError && !errEl) { return }
    nextTick_((): void => {
      if (hasError) {
        if (errEl == null) {
          errEl = document.createElement("div")
          errEl.className = "tip"
          OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
              ? par.insertBefore(errEl, el.nextElementSibling as Element | null) : el.after!(errEl)
        }
        errEl.textContent = msg
        tag !== null && cls.add(tag || "has-error")
      } else {
        cls.remove("has-error"), cls.remove("highlight")
        errEl && errEl.remove()
      }
    })
  }
  static normalizeByOps_ (this: NonNullable<TextOption_<TextOptionNames>["checker_"]>, value: string): string {
    const ops = this.ops_!
    ops.indexOf("lower") >= 0 ? value = value.toUpperCase().toLowerCase()
    : ops.indexOf("upper") >= 0 ? (value = value.toLowerCase().toUpperCase()) : 0
    value = OnChrome && Build.MinCVer < BrowserVer.Min$String$$Normalize && !value.normalize ? value : value.normalize()
    if (ops.indexOf("chars") < 0 || this.status_ & 2 && !(this.status_ & 1)) {
      return value
    }
    let str2 = ""
    for (let ch of value.replace(<RegExpG> /\s/g, "")) {
      if (!str2.includes(ch)) {
        str2 += ch
      }
    }
    return str2
  }
}

export class NonEmptyTextOption_<T extends TextOptionNames> extends TextOption_<T> {
  override readValueFromElement_ (): string {
    if (!this.element_.value.trim()) {
      this.populateElement_(bgSettings_.defaults_[this.field_], true)
    }
    return super.readValueFromElement_()
  }
}

export class CssSelectorOption_<T extends "passEsc" | "ignoreReadonly"> extends NonEmptyTextOption_<T> {
  override readRaw_ (): string {
    const value = super.readRaw_()
    return value.replace(<RegExpOne> /:default\([^)]*\)/, GlobalConsts.kCssDefault)
  }
  override formatValue_(value: string): string {
    value = value.replace(<RegExpG & RegExpSearchable<1>> /(?:^# |\/\/)[^\n]*|([,>] ?)(?!$|\n)/g, (full, s): string => {
      return s ? s !== ">" ? ", " : " > " : full
    })
    value = value.replace(<RegExpOne&RegExpSearchable<2>>/(^|\n):default(?!\()(, \S)?/, (_, prefix, suffix): string => {
      const val_with_default = `${GlobalConsts.kCssDefault}(${this.getRealDefault()})`
      return prefix + CssSelectorOption_.WrapAndOutput_(val_with_default) + (suffix ? ",\n" + suffix[2] : "")
    })
    return value
  }
  getRealDefault(): string {
    return bTrans_((this.field_ === "passEsc" ? "" + kTip.defaultPassEsc : "" + kTip.defaultIgnoreReadonly))
  }
  static WrapAndOutput_ (line: string): string {
    const hostSep = line.indexOf("##")
    let str = hostSep >= 0 ? line.slice(0, hostSep + 2) : ""
    let output = ""
    line = hostSep >= 0 ? line.slice(hostSep + 2) : line
    line = line.replace(<RegExpSearchable<1>> /,|>/g, s => s === "," ? ", " : " > ").trimRight()
    for (const i of line.split(", ")) {
      if (str && str.length + i.length > 62) {
        output = str.endsWith("#") ? str : (output ? output + "\n" : "") + str + ","
        str = "  " + i
      } else {
        str = str ? str + (str.endsWith("#") ? "" : ", ") + i : i
      }
    }
    return str ? (output ? output + "\n" : "") + str.trimRight() : output
  }
}

export type JSONOptionNames = PossibleOptionNames<object>
export class JSONOption_<T extends JSONOptionNames> extends TextOption_<T> {
  override formatValue_ (obj: AllowedOptions[T]): string {
    const one = this.element_ instanceof HTMLInputElement, s0 = JSON.stringify(obj, null, one ? 1 : 2)
    return one ? s0.replace(<RegExpG & RegExpSearchable<1>> /(,?)\n\s*/g, (_, s) => s ? ", " : "") : s0
  }
  override readValueFromElement_ (): AllowedOptions[T] {
    let value = super.readValueFromElement_(), obj: AllowedOptions[T] = null as never
    if (value) {
      try {
        obj = JSON.parse<AllowedOptions[T]>(value as AllowedOptions[T] & string)
      } catch { /* empty */ }
    } else {
      obj = bgSettings_.defaults_[this.field_]
      this.populateElement_(obj, true)
    }
    return obj
  }
  static stableClone_<T> (src: T): T {
    if (!src || typeof src !== "object") { return src }
    if (src instanceof Array) { return src.map(JSONOption_.stableClone_) as T }
    const dest: Dict<unknown> = {}
    for (let key of Object.keys(src).sort()) {
      dest[key] = JSONOption_.stableClone_((src as Dict<unknown>)[key])
    }
    return dest as T
  }
  override areEqual_ (a: object, b: object): boolean {
    return JSON.stringify(a) === JSON.stringify(JSONOption_.stableClone_(b))
  }
  override normalize_(value: object): SettingsNS.PersistentSettings[T] {
    return JSONOption_.stableClone_(value) as SettingsNS.PersistentSettings[T]
  }
}

export class MaskedText_<T extends TextOptionNames> extends TextOption_<T> {
  override readonly element_: HTMLTextAreaElement
  masked_: boolean
  _myCancelMask: (() => void) | null
  override init_ (): void {
    super.init_()
    this.masked_ = true
    this._myCancelMask = this.cancelMask_.bind(this);
    delayBinding_(this.element_, "focus", this._myCancelMask)
  }
  cancelMask_ (): void {
    if (!this._myCancelMask) { return }
    this.element_.removeEventListener("focus", this._myCancelMask)
    this.element_.classList.remove("masked")
    this._myCancelMask = null
    this.masked_ = false
    this.element_.removeAttribute("placeholder")
    void this.fetch_()
  }
  override populateElement_ (value: AllowedOptions[T], enableUndo?: boolean): void {
    if (this.masked_) {
      this.element_.placeholder = oTrans_("clickToUnmask")
      return
    }
    super.populateElement_(value, enableUndo)
  }
  override readRaw_(): string {
    return this.masked_ ? this.previous_ : super.readRaw_()
  }
}

TextOption_.prototype.atomicUpdate_ = NumberOption_.prototype.atomicUpdate_ = function(
    value: string, undo: boolean, locked: boolean): void {
  const input = this.element_, initialValue = input.value
  let selection = input.selectionDirection !== "backward" ? input.selectionEnd : input.selectionStart
  let newFocused = false
  if (undo) {
    this.locked_ = true
    newFocused = document.activeElement !== input
    newFocused && input.focus()
    document.execCommand("undo")
  }
  this.locked_ = locked
  if (selection == null) {
    input.select()
    document.execCommand("insertText", false, value)
    if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinInputSupportExecCommand
        && CurFFVer_ < FirefoxBrowserVer.MinInputSupportExecCommand) {
      if (input.value !== value) { input.value = value }
    }
    newFocused && this.element_.blur()
  } else {
  const oldValue = undo ? input.value : initialValue
  let left = input.scrollLeft, top = input.scrollTop
  let diffStart = 0, diffLast = oldValue.length - 1, newLast = value.length - 1
  let limit = Math.min(diffLast, newLast)
  while (diffStart <= limit && oldValue[diffStart] === value[diffStart]) { diffStart++ }
  limit = Math.max(diffStart, diffLast - (newLast - diffStart))
  while (limit <= diffLast && oldValue[diffLast] === value[newLast]) { diffLast--, newLast-- }
  input.setSelectionRange(diffStart, diffLast + 1)
  const diffValue = value.slice(diffStart, newLast + 1)
  document.execCommand("insertText", false, diffValue)
  if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinInputSupportExecCommand
      && CurFFVer_ < FirefoxBrowserVer.MinInputSupportExecCommand) {
    if (input.value !== value) {
      input.value = value
      this.onUpdated_()
    }
  }
  newFocused && input.blur()
  if (initialValue !== oldValue) {
    diffStart = 0, diffLast = initialValue.length - 1, newLast = value.length - 1
    limit = Math.min(diffLast, newLast)
    while (diffStart <= limit && initialValue[diffStart] === value[diffStart]) { diffStart++ }
    limit = Math.max(diffStart, diffLast - (newLast - diffStart))
    while (limit <= diffLast && initialValue[diffLast] === value[newLast]) { diffLast--, newLast-- }
  }
  if (!selection) {
    left = top = 0
  } else if (selection === initialValue.length) {
    left = input.scrollWidth, top = input.scrollHeight
    selection = value.length
  } else if (selection < diffStart) { /* empty */ }
  else if (selection > diffLast) {
    selection += newLast - diffLast
  } else {
    const oldOffset = initialValue.slice(0, selection).split("\n"), rows = oldOffset.length
    const newOffset = value.split("\n").slice(0, rows)
    newOffset.length === rows && (newOffset[rows - 1] = newOffset[rows - 1].slice(0, oldOffset[rows - 1].length))
    selection = newOffset.reduce((i, j): number => i + j.length, 0) + newOffset.length - 1
  }
  input.scrollTo(left, top)
  input.setSelectionRange(selection, selection)
  }
  this.locked_ = false
}

ExclusionRulesOption_.prototype.onRowChange_ = function (this: ExclusionRulesOption_, isAdd: number): void {
  if (this.list_.length !== isAdd) { return }
  const el = $("#exclusionToolbar"), options = $$("[data-model]", el)
  el.style.visibility = isAdd ? "" : "hidden"
  for (const optionEl of options) {
    const opt = Option_.all_[optionEl.id as keyof AllowedOptions],
    style = (opt.element_.parentNode as HTMLElement).style
    style.visibility = isAdd || opt.saved_ ? "" : "visible"
    style.display = !isAdd && opt.saved_ ? "none" : ""
  }
}

export interface SaveBtn extends HTMLButtonElement { onclick (this: SaveBtn, virtually?: MouseEvent | false): void }
export const saveBtn_ = $<SaveBtn>("#saveOptions")
export const exportBtn_ = $<HTMLButtonElement>("#exportButton")
export let savedStatus_: (newStat?: boolean | null) => boolean
export let registerClass_: (type: string, cls: new (el: HTMLElement, cb: () => void) => Option_<"nextPatterns">) => void

export const createNewOption_ = ((): <T extends keyof AllowedOptions> (_element: HTMLElement) => Option_<T> => {
  let status = false
  savedStatus_ = newStat => status = newStat != null ? newStat : status
  const onUpdated = function <T extends keyof AllowedOptions>(this: Option_<T>): unknown {
    if (this.locked_) { return }
    const rawVal = this.readValueFromElement_()
    if (this.saved_ = this.areEqual_(this.previous_, rawVal)) {
      if (status && !Option_.needSaveOptions_()) {
        if (OnFirefox) {
          saveBtn_.blur()
        }
        saveBtn_.disabled = true;
        (saveBtn_.firstChild as Text).data = oTrans_("115")
        exportBtn_.disabled = false
        savedStatus_(false)
        window.onbeforeunload = null as never
      }
      return rawVal
    } else if (status) {
      return rawVal
    }
    window.onbeforeunload = onBeforeUnload
    savedStatus_(true)
    saveBtn_.disabled = false;
    (saveBtn_.firstChild as Text).data = oTrans_("115_2")
    if (OnFirefox) {
      exportBtn_.blur()
    }
    exportBtn_.disabled = true
    return rawVal
  }

  const types = {
    Number: NumberOption_, Boolean: BooleanOption_,
    Text: TextOption_, NonEmptyText: NonEmptyTextOption_, JSON: JSONOption_, MaskedText: MaskedText_,
    ExclusionRules: ExclusionRulesOption_, CssSelector: CssSelectorOption_,
  }
  const createOption = <T extends keyof AllowedOptions> (element: HTMLElement): Option_<T> => {
    const cls = types[(element.dataset as KnownOptionsDataset).model as "Text"]
    const instance = new cls(element as TextElement, onUpdated)
    return Option_.all_[instance.field_] = instance as any
  }
  Option_.suppressPopulate_ = true
  for (const el of ($$('[data-model]:not([data-model=""])') as HTMLElement[])) { createOption(el) }
  registerClass_ = (name, cls) => { (types as Dict<new (el: any, cb: () => void) => any>)[name] = cls }
  return createOption
})()

{
  const exclusionRules = Option_.all_.exclusionRules, table = exclusionRules.$list_
  table.ondragstart = (event): void => {
    const dragged = event.target as HTMLTableRowElement | HTMLInputElement
    const cur = document.activeElement!
    if (cur.localName === "input") { cur !== dragged && prevent_(event as Event as EventToPrevent); return }
    exclusionRules.dragged_ = dragged as HTMLTableRowElement
    dragged.style.opacity = "0.5"
    if (OnFirefox) {
      event.dataTransfer.setData("text/plain", "")
    }
  }
  table.ondragend = (): void => {
    const dragged = exclusionRules.dragged_
    exclusionRules.dragged_ = null
    dragged && (dragged.style.opacity = "")
  }
  table.ondragover = (event): void => { exclusionRules.dragged_ && prevent_(event) }
  table.ondrop = (event): void => {
    prevent_(event)
    const dragged = exclusionRules.dragged_
    if (!dragged) { return }
    let target: Element | null = event.target as Element
    if (OnChrome && Build.MinCVer < BrowserVer.Min$Element$$closest && CurCVer_ < BrowserVer.Min$Element$$closest) {
      while (target && target.classList.contains("exclusionRule")) {
        target = target.parentElement as SafeHTMLElement | null
      }
    } else {
      target = target.closest!(".exclusionRule")
    }
    if (!target || dragged === target) { return }
    OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
        ? exclusionRules.$list_.insertBefore(dragged, target) : target.before!(dragged)
    const list = exclusionRules.list_, srcNode = (dragged.querySelector(".pattern") as ExclusionRealNode).vnode,
    targetNode = (target.querySelector(".pattern") as ExclusionRealNode).vnode
    list.splice(list.indexOf(srcNode), 1)
    list.splice(list.indexOf(targetNode), 0, srcNode)
    exclusionRules.onUpdated_()
  }
}

const keyMappingsOption_ = Option_.all_.keyMappings
const normalizeKeyMappings = (value: string): string => {
  const re = new RegExp(`^${kMappingsFlag.char0}${kMappingsFlag.char1}[^\\n]*|^[^]`
      , "gm" as "g") as RegExpG & RegExpSearchable<0>
  let arr: RegExpExecArray | null
  while (arr = re.exec(value)) {
    const line = arr[0]
    if (!line || line[0] === "\n") { /* empty */ }
    else if (line[0] !== kMappingsFlag.char0) { break }
    else if (line[1] === kMappingsFlag.char1) {
      const flag = line.slice(2).trim()
      if (flag === kMappingsFlag.noCheck) {
        value = value.slice(0, arr.index) + value.slice(arr.index + line.length).trimLeft()
        break
      }
    }
  }
  value = value.replace(<RegExpG> /\.activateMode(?:To)?/g, ".activate")
  return value
}
keyMappingsOption_.innerFetch_ = function (): Promise<string> | string {
  const val = (Option_.prototype as Option_<"keyMappings">).innerFetch_.call(this)
  return val instanceof Promise ? val.then(normalizeKeyMappings) : normalizeKeyMappings(val)
}
keyMappingsOption_.normalize_ = function (value: string): string {
  value = normalizeKeyMappings(value)
  return Option_.prototype.normalize_.call(this, value)
}
export const onKeyMappingsError_ = (err: string | true): void => {
  err === true ? keyMappingsOption_.showError_(oTrans_("ignoredNonEN"), null)
  : keyMappingsOption_.showError_(err)
}

const linkHintCharactersOption_ = Option_.all_.linkHintCharacters
const linkHintNumbersOption_ = Option_.all_.linkHintNumbers
const filterLinkHintsOption_ = Option_.all_.filterLinkHints
linkHintCharactersOption_.onSave_ = linkHintNumbersOption_.onSave_ = function (): void {
  this.showError_(!this.element_.style.display && this.previous_.length < GlobalConsts.MinHintCharSetSize
      ? "Too few characters for LinkHints" : "")
}
filterLinkHintsOption_.onSave_ = function (): void {
  nextTick_((): void => {
    const enableFilterLinkHints = filterLinkHintsOption_.readValueFromElement_() // also used during change events
    linkHintNumbersOption_.element_.style.display = enableFilterLinkHints ? "" : "none"
    linkHintCharactersOption_.element_.style.display = enableFilterLinkHints ? "none" : ""
    BooleanOption_.ToggleDisabled_(Option_.all_.waitForEnter.element_, !enableFilterLinkHints)
    void linkHintCharactersOption_.onSave_()
    void linkHintNumbersOption_.onSave_()
  })
}
delayBinding_(filterLinkHintsOption_.element_, "change", filterLinkHintsOption_.onSave_, true)

const keyLayout = Option_.all_.keyLayout
const [elAlwaysIgnore, elIgnoreIfAlt, elIgnoreIfNotASCII, elIgnoreCaps, elMapModifier, elInPrivResistFp] =
    $$<HTMLInputElement>("input", keyLayout.element_)
keyLayout.readValueFromElement_ = (): number => {
  let flags: kKeyLayout = 0
  if (elAlwaysIgnore.checked) {
    flags = kKeyLayout.alwaysIgnore
  } else {
    flags |= elIgnoreIfAlt.checked ? kKeyLayout.ignoreIfAlt : 0
    flags |= elIgnoreIfNotASCII.checked ? kKeyLayout.ignoreIfNotASCII
        : elIgnoreIfNotASCII.indeterminate ? kKeyLayout.inCmdIgnoreIfNotASCII : 0
    flags |= elIgnoreCaps.checked ? kKeyLayout.ignoreCaps : elIgnoreCaps.indeterminate ? kKeyLayout.ignoreCapsOnMac : 0
  }
  flags |= elMapModifier.checked ? kKeyLayout.mapRightModifiers
      : elMapModifier.indeterminate ? kKeyLayout.mapLeftModifiers : 0
  flags |= elInPrivResistFp.checked ? kKeyLayout.inPrivResistFp_ff : 0
  const old = keyLayout.previous_
  if (old & kKeyLayout.fromOld && (old & ~kKeyLayout.fromOld) === flags) { flags |= kKeyLayout.fromOld }
  return flags
}
let _lastKeyLayoutValue: kKeyLayout
let _iprf_visible = true
keyLayout.populateElement_ = (value: number): void => {
  const always = !!(value & kKeyLayout.alwaysIgnore)
  elAlwaysIgnore.checked = always
  elIgnoreIfAlt.checked = always || !!(value & kKeyLayout.ignoreIfAlt)
  elIgnoreIfNotASCII.checked = always || !!(value & kKeyLayout.ignoreIfNotASCII)
  elIgnoreIfNotASCII.indeterminate = !!(value & kKeyLayout.inCmdIgnoreIfNotASCII)
  elIgnoreCaps.checked = always || !!(value & kKeyLayout.ignoreCaps)
  elIgnoreCaps.indeterminate = !!(value & kKeyLayout.ignoreCapsOnMac)
  elInPrivResistFp.checked = !!(value & kKeyLayout.inPrivResistFp_ff)
  elMapModifier.checked = !!(value & kKeyLayout.mapRightModifiers)
  elMapModifier.indeterminate = !!(value & (kKeyLayout.mapLeftModifiers))
  _lastKeyLayoutValue = value
  onAlwaysIgnoreChange()
  if (Option_.onFgCacheUpdated_) {
    void post_(kPgReq.updatePayload, { key: "l", val: value }).then((val2): void => {
      (VApi!.z! as Generalized<NonNullable<VApiTy["z"]>>).l = val2 != null ? val2 : value
      Option_.onFgCacheUpdated_!()
    })
  }
  if (!OnFirefox && _iprf_visible) {
    (elInPrivResistFp as HTMLElement as EnsuredMountedHTMLElement
        ).parentElement.parentElement.parentElement.style.display = "none"
    _iprf_visible = false
  }
}
const onAlwaysIgnoreChange = (ev?: EventToPrevent): void => {
  const always = elAlwaysIgnore.checked
  BooleanOption_.ToggleDisabled_(elIgnoreIfAlt, always)
  BooleanOption_.ToggleDisabled_(elIgnoreIfNotASCII, always)
  BooleanOption_.ToggleDisabled_(elIgnoreCaps, always)
  if (!ev) { /* empty */ }
  else if (always) {
    elIgnoreIfAlt.checked = elIgnoreIfNotASCII.checked = elIgnoreCaps.checked = true
    elIgnoreIfNotASCII.indeterminate = elIgnoreCaps.indeterminate = false
  } else {
    const old = keyLayout.innerFetch_()
    if (typeof old === "number" && !(_lastKeyLayoutValue & kKeyLayout.alwaysIgnore)) {
      _lastKeyLayoutValue === old ? keyLayout.fetch_() : keyLayout.populateElement_(_lastKeyLayoutValue)
      ev.stopImmediatePropagation()
      nextTick_(keyLayout.onUpdated_)
    }
  }
}

delayBinding_(keyLayout.element_, "input", (event): void => {
  const el = event.target as HTMLInputElement
  if (el === elAlwaysIgnore) {
    onAlwaysIgnoreChange(event)
  } else {
    const kMid = el === elIgnoreIfNotASCII ? kKeyLayout.inCmdIgnoreIfNotASCII
        : el === elIgnoreCaps ? kKeyLayout.ignoreCapsOnMac : el === elMapModifier ? kKeyLayout.mapLeftModifiers : 0
    const kTrue = el === elIgnoreIfNotASCII ? kKeyLayout.ignoreIfNotASCII : el === elIgnoreCaps ? kKeyLayout.ignoreCaps
        : el === elMapModifier ? kKeyLayout.mapRightModifiers : kKeyLayout.ignoreIfAlt
    if (kMid) {
      const newVal = BooleanOption_.ToggleTripleStatuses(_lastKeyLayoutValue & kTrue ? 2
          : _lastKeyLayoutValue & kMid ? 1 : 0, event)
      _lastKeyLayoutValue = (_lastKeyLayoutValue & ~(kMid | kTrue)) | (newVal > 1 ? kTrue : newVal ? kMid : 0)
    } else {
      _lastKeyLayoutValue = (_lastKeyLayoutValue & ~kTrue) | (el.checked ? kTrue : 0)
    }
  }
}, true)

Option_.all_.vomnibarPage.onSave_ = function (): void {
  const {element_: element2} = this, url: string = this.previous_
    , isExtPage = url.startsWith(location.protocol) || url.startsWith("front/")
  if (OnChrome && Build.MinCVer < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg
      && CurCVer_ < BrowserVer.Min$tabs$$executeScript$hasFrameIdArg) {
    nextTick_((): void => {
      element2.style.textDecoration = isExtPage ? "" : "line-through"
    })
    return this.showError_(url === bgSettings_.defaults_.vomnibarPage ? ""
          : oTrans_("onlyExtVomnibar", [BrowserVer.Min$tabs$$executeScript$hasFrameIdArg])
        , null)
  }
  if (isExtPage) { this.showError_("") }
  // Note: the old code here thought on Firefox web pages couldn't be used, but it was just because of wrappedJSObject
  else if (url.startsWith("file:")) {
    this.showError_(oTrans_("fileVomnibar"), "highlight")
  } else if ((<RegExpI> /^http:\/\/(?!localhost[:/])/i).test(url)) {
    this.showError_(oTrans_("httpVomnibar"), "highlight")
  } else {
    this.showError_("")
  }
}

Option_.all_.userDefinedCss.onSave_ = function () {
  if (!this.element_.classList.contains("debugging")) { return }
  nextTick_((): void => {
    const root = VApi!.y().r
    for (const frame of $$<HTMLIFrameElement>("iframe", root)) {
      const isFind = frame.classList.contains("HUD"),
      style = frame.contentDocument!.querySelector("style.debugged") as HTMLStyleElement | null
      if (!style) { /* empty */ }
      else if (isFind) {
        style.remove()
      } else {
        style.classList.remove("debugged")
      }
    }
    this.element_.classList.remove("debugging")
  })
}

Option_.all_.autoReduceMotion.onSave_ = function (): void {
  nextTick_(() => {
    const value = this.previous_
    toggleReduceMotion_(value === 2 ? matchMedia("(prefers-reduced-motion: reduce)").matches : value > 0)
  })
}

const onBeforeUnload = (): string => {
  setTimeout((): void => { // wait until the confirmation dialog returning
    setTimeout((): void => { // ensure the result is neither closing nor reloading
      for (const i of Object.values(Option_.all_)) {
        if (i instanceof TextOption_ && i._lastError) { continue }
        let node = i.element_
        if (node.localName === "input" && (node as HTMLInputElement).type === "checkbox") {
          const p1 = node.parentElement as EnsuredMountedHTMLElement, p2 = p1.parentElement
          node = p2.localName === "td" ? p2 : p1
        }
        node.classList.toggle("highlight", !i.saved_)
      }
    }, 300)
  }, 17)
  return !(Build.BTypes & BrowserType.Chrome && Build.MinCVer
    < BrowserVer.MinNoCustomMessageOnBeforeUnload) ? oTrans_("beforeUnload") : "Not saved yet"
}
