import {
  CurCVer_, OnChrome, OnFirefox, $, $$, nextTick_, bTrans_, post_, enableNextTick_, kReadyInfo, toggleReduceMotion
} from "./async_bg"
import {
  bgSettings_, Option_, AllowedOptions, Checker, PossibleOptionNames, ExclusionRulesOption_, oTrans_,
  KnownOptionsDataset, OptionErrorType, ExclusionRealNode, UniversalNumberOptions
} from "./options_base"
import type { OptionalPermissionsOption_ } from "./options_permissions"
import { kPgReq } from "../background/page_messages"

Option_.all_ = Object.create(null)
Option_.syncToFrontend_ = []

Option_.prototype._onCacheUpdated = function<T extends keyof SettingsNS.AutoSyncedNameMap
    > (this: Option_<T>, func: (this: Option_<T>) => void): void {
  func.call(this)
  if (VApi) {
    const shortKey = bgSettings_.valuesToLoad_[this.field_], val = this.readValueFromElement_()
    void post_(kPgReq.updatePayload, { key: shortKey, val }).then((val2): void => {
      VApi!.z![shortKey] = val2 !== void 0 ? val2 : val as any
    })
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
    if (!opt.saved_ && opt._isDirty()) {
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
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest
      && CurCVer_ < BrowserVer.MinEnsured$Element$$Closest) {
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

Option_.prototype.areEqual_ = (a, b) => a === b

interface NumberChecker extends Checker<"scrollStepSize"> {
  min: number | null; max: number | null; default: number
  check_ (value: number): number
}
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
    this.element_.oninput = this.onUpdated_
    this.element_.onfocus = this.addWheelListener_.bind(this)
    void bgSettings_.preloadCache_().then((): void => {
      this.checker_.default = bgSettings_.defaults_[this.field_]
    })
  }
  override populateElement_ (value: number): void {
    this.element_.value = "" + value
  }
  override readValueFromElement_ (): number {
    return parseFloat(this.element_.value)
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
    event.preventDefault()
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
  override previous_: FullSettings[T]
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
      el.addEventListener("change", this.onTripleStatusesClicked.bind(this), true)
    }
    el.onchange = this.onUpdated_
  }
  override populateElement_ (value: FullSettings[T]): void {
    // support false/true when .map_ is like [0, 1, 2]
    const is_true = value === true || value === this.map_[this.true_index_]
    this.element_.checked = is_true
    this.element_.indeterminate = this.true_index_ > 1 && value === this.map_[1]
    this.inner_status_ = is_true ? this.true_index_ : Math.max(0, this.map_.indexOf(value)) as 0 | 1 | 2
  }
  override readValueFromElement_ (): FullSettings[T] {
    let value = this.element_.indeterminate ? this.map_[1] : this.map_[this.element_.checked ? this.true_index_ : 0]
    return value
  }
  onTripleStatusesClicked (event: Event): void {
    (event as EventToPrevent).preventDefault()
    const old = this.inner_status_
    this.inner_status_ = old === 2 ? 1 : old ? 0 : 2
    this.element_.indeterminate = old === 2
    this.element_.checked = this.inner_status_ === 2
  }
  override normalize_(value: FullSettings[T]): FullSettings[T] {
    if ((this.element_.dataset as KnownOptionsDataset).map && typeof value === "boolean") {
      value = this.map_[value ? this.true_index_ : 0]
    }
    return value
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
    this.element_.oninput = this.onUpdated_
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
    const value2 = this.formatValue_(value).replace(<RegExpG> / /g, "\xa0")
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
          par.insertBefore(errEl, el.nextElementSibling as Element | null)
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
    let value = super.readValueFromElement_()
    if (!value) {
      value = bgSettings_.defaults_[this.field_]
      this.populateElement_(value, true)
    }
    return value
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
}

export class MaskedText_<T extends TextOptionNames> extends TextOption_<T> {
  override readonly element_: HTMLTextAreaElement
  masked_: boolean
  _myCancelMask: (() => void) | null
  override init_ (): void {
    super.init_()
    this.masked_ = true
    this._myCancelMask = this.cancelMask_.bind(this);
    this.element_.addEventListener("focus", this._myCancelMask)
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
  let newFocused = false
  if (undo) {
    this.locked_ = true
    newFocused = document.activeElement !== this.element_
    newFocused && this.element_.focus()
    document.execCommand("undo")
  }
  this.locked_ = locked
  this.element_.select()
  document.execCommand("insertText", false, value)
  if (OnFirefox) {
    if (this.element_.value !== value) {
      this.element_.value = value
    }
  }
  newFocused && this.element_.blur()
  this.locked_ = false
}

JSONOption_.prototype.areEqual_ = Option_.areJSONEqual_

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
export const saveBtn = $<SaveBtn>("#saveOptions")
export const exportBtn = $<HTMLButtonElement>("#exportButton")
export let savedStatus: (newStat?: boolean | null) => boolean
export let registerClass: (type: string, cls: new (el: HTMLElement, cb: () => void) => Option_<"nextPatterns">) => void

export const createNewOption = ((): <T extends keyof AllowedOptions> (_element: HTMLElement) => Option_<T> => {
  let status = false
  savedStatus = newStat => status = newStat != null ? newStat : status
  const onUpdated = function <T extends keyof AllowedOptions>(this: Option_<T>): void {
    if (this.locked_) { return }
    if (this.saved_ = this.areEqual_(this.readValueFromElement_(), this.previous_)) {
      if (status && !Option_.needSaveOptions_()) {
        if (OnFirefox) {
          saveBtn.blur()
        }
        saveBtn.disabled = true;
        (saveBtn.firstChild as Text).data = oTrans_("o115")
        exportBtn.disabled = false
        savedStatus(false)
        window.onbeforeunload = null as never
      }
      return
    } else if (status) {
      return
    }
    window.onbeforeunload = (): string => oTrans_("beforeUnload")
    savedStatus(true)
    saveBtn.disabled = false;
    (saveBtn.firstChild as Text).data = oTrans_("o115_2")
    if (OnFirefox) {
      exportBtn.blur()
    }
    exportBtn.disabled = true
  }

  const types = {
    Number: NumberOption_, Boolean: BooleanOption_,
    Text: TextOption_, NonEmptyText: NonEmptyTextOption_, JSON: JSONOption_, MaskedText: MaskedText_,
    ExclusionRules: ExclusionRulesOption_
  }
  const createOption = <T extends keyof AllowedOptions> (element: HTMLElement): Option_<T> => {
    const cls = types[(element.dataset as KnownOptionsDataset).model as "Text"]
    const instance = new cls(element as TextElement, onUpdated)
    return Option_.all_[instance.field_] = instance as any
  }
  Option_.suppressPopulate_ = true
  for (const el of ($$("[data-model]") as HTMLElement[])) { createOption(el) }
  registerClass = (name, cls) => { (types as Dict<new (el: any, cb: () => void) => any>)[name] = cls }
  return createOption
})()

{
  const exclusionRules = Option_.all_.exclusionRules, table = exclusionRules.$list_
  table.ondragstart = (event): void => {
    let dragged = exclusionRules.dragged_ = event.target as HTMLTableRowElement
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
  table.ondragover = (event): void => { event.preventDefault() }
  table.ondrop = (event): void => {
    event.preventDefault()
    const dragged = exclusionRules.dragged_
    let target: Element | null = event.target as Element
    if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$Element$$Closest
        && CurCVer_ < BrowserVer.MinEnsured$Element$$Closest) {
      while (target && target.classList.contains("exclusionRule")) {
        target = target.parentElement as SafeHTMLElement | null
      }
    } else {
      target = target.closest!(".exclusionRule")
    }
    if (!dragged || !target || dragged === target) { return }
    exclusionRules.$list_.insertBefore(dragged, target)
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
export const onKeyMappingsError = (err: string | true): void => {
  err === true ? keyMappingsOption_.showError_(oTrans_("ignoredNonEN"), null)
  : keyMappingsOption_.showError_(err)
}
void post_(kPgReq.keyMappingErrors).then(onKeyMappingsError)

const linkHintCharactersOption_ = Option_.all_.linkHintCharacters
const linkHintNumbersOption_ = Option_.all_.linkHintNumbers
const filterLinkHintsOption_ = Option_.all_.filterLinkHints
linkHintCharactersOption_.onSave_ = linkHintNumbersOption_.onSave_ = function (): void {
  this.showError_(!this.element_.style.display && this.previous_.length < GlobalConsts.MinHintCharSetSize
      ? bTrans_("" + kTip.fewChars) : "")
}
filterLinkHintsOption_.onSave_ = function (): void {
  nextTick_((el): void => {
    const enableFilterLinkHints = filterLinkHintsOption_.readValueFromElement_() // also used during change events
    el.style.display = linkHintNumbersOption_.element_.style.display = enableFilterLinkHints ? "" : "none"
    linkHintCharactersOption_.element_.style.display = enableFilterLinkHints ? "none" : ""
    void linkHintCharactersOption_.onSave_()
    void linkHintNumbersOption_.onSave_()
  }, $("#waitForEnterBox"))
}

Option_.all_.ignoreKeyboardLayout.onSave_ = function (): void {
  nextTick_(el => { el.style.display = this.readValueFromElement_() > 1 ? "none" : "" }, $("#ignoreCapsLockBox"))
}

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
    toggleReduceMotion(value === 2 ? matchMedia("(prefers-reduced-motion: reduce)").matches : value > 0)
  })
}

Option_.all_.passEsc.readValueFromElement_ = function (): string {
  return NonEmptyTextOption_.prototype.readValueFromElement_.call(this).replace(<RegExpG> /, /g, ",")
}
Option_.all_.passEsc.formatValue_ = (value: string): string => value.replace(<RegExpG> /,/g, ", ")
