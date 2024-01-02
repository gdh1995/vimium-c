import {
  blank_, set_sync_, sync_, set_restoreSettings_, OnChrome, OnEdge, updateHooks_, storageCache_, CurCVer_, CurFFVer_,
  hasEmptyLocalStorage_, set_updateToLocal_, updateToLocal_, settingsCache_, installation_, set_installation_, OnSafari,
  OnFirefox
} from "./store"
import * as BgUtils_ from "./utils"
import { browser_, runtimeError_ } from "./browser"
import * as settings_ from "./settings"

import SettingsWithDefaults = SettingsNS.SettingsWithDefaults

type SettingsToSync = SettingsNS.PersistentSettings
type SettingsToUpdate = { [key in keyof SettingsToSync]?: SettingsToSync[key] | null }
interface SerializationMetaData { $_serialize: "split"; k: string; s: number }
interface SingleSerialized { $_serialize: "single"; d: any }
type MultiLineSerialized = Dict<SerializationMetaData | string> & {
    [key in keyof SettingsToUpdate]: SerializationMetaData }
type StorageChange = chrome.storage.StorageChange

const doNotSync: PartialTypedSafeEnum<SettingsToSync> & { readonly [key in SettingsNS.LocalSettingNames]?: 1 } =
    BgUtils_.safer_({
  // Note(gdh1995): need to keep synced with pages/options_ext.ts#_importSettings
  findModeRawQueryList: 1, innerCSS: 1, keyboard: 1, newTabUrl_f: 1
  , vomnibarPage_f: 1
} as const)
const browserStorage_ = browser_.storage
const kCloud = "sync.cloud:"

let __sync: chrome.storage.StorageArea | undefined
let to_update: SettingsToUpdate | null = null, toCleanDuringUpgrade: SettingsNS.LocalSettingNames[] | null = null
let keyInDownloading: keyof SettingsWithDefaults | SettingsNS.LocalSettingNames | "" = ""
let changes_to_merge: EnsuredDict<StorageChange> | null = null
let textDecoder: TextDecoder | null = null
let longDelayedAction = 0
let innerRestoreSettings: Promise<void> | null = null

const storage = (): chrome.storage.StorageArea & {
  onChanged?: chrome.events.Event<(changes: EnsuredDict<StorageChange>, exArg: FakeArg) => void>
} => __sync || (__sync = browserStorage_ && browserStorage_.sync)

const HandleSyncAreaUpdate = (changes: EnsuredDict<StorageChange>): void => {
  HandleStorageUpdate(changes, "sync")
}

const HandleStorageUpdate = (changes: EnsuredDict<StorageChange>, area: string | FakeArg): void => {
  if (!(OnChrome && Build.MinCVer >= BrowserVer.Min$StorageArea$$onChanged
        || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.Min$StorageArea$$onChanged) && area !== "sync") { return }
  const waitAndUpdate = (items: Dict<any>): void => {
    if (changes_to_merge) {
      BgUtils_.safer_(items)
      for (const key in changes_to_merge) {
        const key2 = key.split(":")[0], isSame = key2 === key
        if (isSame || !(key2 in changes_to_merge)) {
          const change = isSame ? changes_to_merge[key] : null
          storeAndPropagate(key2, change != null ? change.newValue : items[key2], items)
        }
      }
      changes_to_merge = null
    }
  }
  BgUtils_.safer_(changes)
  changes_to_merge ? Object.assign(changes_to_merge, changes) : (changes_to_merge = changes)
  if (innerRestoreSettings) {
    void innerRestoreSettings.then(() => HandleStorageUpdate({}, area))
    return
  }
  changes = changes_to_merge
  changes_to_merge = null
  for (const key in changes) {
    const change = changes[key], is_part = key.includes(":"),
    result = is_part ? 8 : storeAndPropagate(key, change != null ? change.newValue : null)
    if (result === 8) {
      changes_to_merge = changes
      storage().get(waitAndUpdate)
      return
    }
    delete changes[key]
  }
}

function _now(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60).toJSON().slice(0, -5).replace("T", " ")
}

const log: (... _: any[]) => void = console.log.bind(console, "[%s]", { toString: _now })

/** return `8` only when expect a valid `map` */
const storeAndPropagate = (key: string, value: any, map?: Dict<any>): void | 8 => {
  const serialized = value && typeof value === "object"
      && (value as Partial<SerializationMetaData | SingleSerialized>).$_serialize || ""
  let tmpStr: string | undefined
  if (!(key in settings_.defaults_) || !shouldSyncKey(key)) {
    const toUpgrade = serialized || !settings_.needToUpgradeSettings_ ? -1
        : (settings_.kSettingsToUpgrade_ as string[]).indexOf(key)
    if (toUpgrade >= 0 && (tmpStr = storageCache_.get(key as (typeof settings_.kSettingsToUpgrade_)[0])
          , tmpStr != null ? tmpStr + "" : null) !== (value != null ? value + "" : null)) {
      settings_.setInLocal_(key as (typeof settings_.kSettingsToUpgrade_)[0], value != null ? value : null)
      settings_.reloadFromLegacy_(toUpgrade)
    }
    return
  }
  const defaultVal = settings_.defaults_[key], kThis = "sync.this:"
  if (serialized) {
    if (serialized === "split" && !map) { return 8 }
    value = deserialize(key, value as SingleSerialized | SerializationMetaData, map)
    if (value === 8) { // still lack fields
      return
    }
  }
  if (value == null) {
    if (settingsCache_[key] != defaultVal) {
      innerRestoreSettings || log(kThis, "reset", key)
      setAndPost(key, defaultVal)
    }
    return
  }
  let curVal = settingsCache_[key], curJSON: string | boolean | number
  let jsonVal: string | boolean | number, notJSON: boolean
  if (notJSON = typeof defaultVal !== "object" || !value || typeof value !== "object") {
    jsonVal = value as string | boolean | number
    curJSON = curVal as string | boolean | number
  } else {
    jsonVal = JSON.stringify(value)
    curJSON = JSON.stringify(curVal)
  }
  if (jsonVal === curJSON) { return }
  if (jsonVal === (notJSON ? defaultVal : JSON.stringify(defaultVal))) {
    value = defaultVal
  }
  innerRestoreSettings ||
  log(kThis, "update", key, typeof value === "string"
    ? (value.length > 32 ? value.slice(0, 30) + "..." : value).replace(<RegExpG> /\n/g, "\\n")
    : value)
  setAndPost(key, value)
}

const setAndPost = (key: keyof SettingsToSync, value: any): void => {
  keyInDownloading = key
  if (key === "keyLayout") {
    value = (value & ~kKeyLayout.inPrivResistFp_ff) | (settingsCache_[key] & kKeyLayout.inPrivResistFp_ff)
  }
  settings_.set_(key, value) // eslint-disable-line @typescript-eslint/no-unsafe-argument
  keyInDownloading = ""
  if (key in settings_.valuesToLoad_) {
    settings_.broadcast_({ N: kBgReq.settingsUpdate, d: [
      settings_.valuesToLoad_[key as keyof typeof settings_.valuesToLoad_]
    ] })
  }
}

const TrySet = <K extends SettingsNS.LocalSettingNames | keyof SettingsToSync> (key: K
    , value: K extends keyof SettingsToSync ? SettingsToSync[K] | null : null): void => {
  const type = shouldSyncKey(key) ? 1 : settings_.kSettingsToUpgrade_.includes(key) ? 2 : 0
  if (!type || key === keyInDownloading) { return }
  if (!to_update) {
    setTimeout(DoUpdate, 800)
    to_update = BgUtils_.safeObj_() as SettingsToUpdate
  }
  if (type === 1) {
    if (key === "keyLayout") {
      (value as SettingsToSync["keyLayout"]) = (value as SettingsToSync["keyLayout"]) & ~kKeyLayout.inPrivResistFp_ff
    }
    (to_update as Generalized<SettingsToUpdate>)[key as keyof SettingsToSync] = value
  } else {
    (toCleanDuringUpgrade || (toCleanDuringUpgrade = [])).push(key as SettingsNS.LocalSettingNames)
  }
}

if (!Build.NDEBUG) {
  (globalThis as any).serializeSync = (key: any, val: any, enc?: any): any => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    let serialized = serialize(key, val, (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder)
        && !OnEdge || enc ? new TextEncoder() : null)
    return serialized ? typeof serialized === "object" ?  serialized
        : <SingleSerialized> { $_serialize: "single", d: JSON.parse(serialized) } : val
  }
  (globalThis as any).deserializeSync = (key: any, val: any, items?: any): any => {
    if (items) {
      val = val || items[key] || val
    } else {
      items = val
      val = items && items[key] || val
    }
    if (!val || !val.$_serialize) { return val }
    let result = deserialize(key, val, items) // eslint-disable-line @typescript-eslint/no-unsafe-argument
    return result != null ? result : val
  }
}

/** Chromium's base::JsonWriter will translate all "<" to "\u003C"
 * https://cs.chromium.org/chromium/src/extensions/browser/api/storage/settings_storage_quota_enforcer.cc?dr=CSs&q=Allocate&g=0&l=37e
 * https://cs.chromium.org/chromium/src/base/json/json_writer.cc?dr=CSs&q=EscapeJSONString&g=0&l=104
 * https://cs.chromium.org/chromium/src/base/json/string_escape.cc?dr=CSs&q=EscapeSpecialCodePoint&g=0&l=35
 */
const fixCharsInJSON = (text: string): string =>
    text.replace(<RegExpSearchable<0>> /[<`\u2028\u2029]/g
        , s => s === "<" ? "`l" : s === "`" ? "`d" : s === "\u2028" ? "`r" : "`n")

const escapeQuotes = (text: string): string =>
    text.replace(<RegExpSearchable<0>> /"|\\[\\"]/g, s => s === '"' ? "`q" : s === '\\"' ? "`Q" : "`S")

const revertEscaping = (text: string): string => {
  const map: Dict<string> = { Q: '\\"', S: "\\\\", d: "`", l: "<", n: "\u2029", q: '"', r: "\u2028" }
  return text.replace(<RegExpSearchable<0>> /`[QSdlnqr]/g, s => map[s[1]]!)
}

// Note: allow failures
const deserialize = (key: keyof SettingsToUpdate, value: SingleSerialized | SerializationMetaData
    , map?: Dict<any>): string | object | null | 8 => {
  let serialized = ""
  switch (value.$_serialize) {
  case "split":
    // check whether changes are only synced partially
    for (let { k: prefix, s: slice } = value, i = 0; i < slice; i++) {
      let part = map![key + ":" + i]
      if (!part || typeof part !== "string" || !part.startsWith(prefix)) { return 8 } // only parts
      serialized += part.slice(prefix.length)
    }
    break
  case "single":
    return JSON.parse(revertEscaping(JSON.stringify(value.d)))
  default: // in case of methods in newer versions
    log("Error: can not support the data format in synced settings data:"
        , key, ":"
        , (value as unknown as SerializationMetaData | SingleSerialized).$_serialize)
    return null
  }
  if (typeof settings_.defaults_[key] === "string") {
    serialized = revertEscaping(serialized)
    return serialized
  }
  serialized = revertEscaping(JSON.stringify(serialized))
  return JSON.parse(serialized.slice(1, -1))
}

const serialize = (key: keyof SettingsToUpdate, value: boolean | string | number | object
    , encoder: TextEncoder | null): MultiLineSerialized | void | string => {
  if (!value || (typeof value !== "string" ? typeof value !== "object"
      : value.length < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM / 6 - 40)) { return }
  let jsonStr = JSON.stringify(value), encoded: Uint8Array | string = ""
  if (jsonStr.length < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM / 6 - 40) { return }
  const ensureSingleBytes = (str: string): string =>
      str.replace(<RegExpG & RegExpSearchable<0>> /[^\x00-\xff]/g, ch => {
        let code = ch.charCodeAt(0)
        return "\\u" + (code > 0xfff ? "" : "0") + code.toString(16)
      })
  const hasEncoder = (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder) && !OnEdge || !!encoder
  const lenStdJSON = jsonStr.length
  jsonStr = fixCharsInJSON(jsonStr)
  const lenPreConverted = jsonStr.length // /[<`\u2028\u2029]/g, and `"\\u003C".length` is 6
  if ((lenPreConverted - lenStdJSON) * 3 + lenStdJSON * 3 < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM - 99) { return }
  if (hasEncoder) {
    encoded = encoder!.encode(jsonStr)
  } else {
    encoded = jsonStr = ensureSingleBytes(jsonStr)
  }
  if (encoded.length < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM - 99) {
    const lenUpperLimit = hasEncoder ? encoded.length + (lenPreConverted - lenStdJSON) * 4
        : Math.ceil((encoded.length - lenPreConverted) / 5 * 3 + (lenPreConverted - lenStdJSON) * 6
          + (lenStdJSON - (encoded.length - lenPreConverted) / 5 - (lenPreConverted - lenStdJSON)))
    return lenUpperLimit < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM - 99 ? void 0 : jsonStr
  }
  let slice = 0, prefix = Date.now().toString(36) + ":", dict: MultiLineSerialized = {}
  jsonStr = typeof settings_.defaults_[key] === "string" ? jsonStr.slice(1, -1) : escapeQuotes(jsonStr)
  if (hasEncoder) {
    textDecoder || (textDecoder = new TextDecoder())
    encoded = encoder!.encode(jsonStr)
  } else {
    encoded = ensureSingleBytes(jsonStr)
  }
  for (let start = 0, end = encoded.length; start < end; ) {
    let pos = Math.min(start + (GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM - 40 - 16 - 2), end), part: string,
    delta = 0
    if (hasEncoder) {
      // find a boundary of char points
      for (; pos < end && ((encoded as Uint8Array)[pos] & 0xc0) === 0x80; pos++) { /* empty */ }
      part = textDecoder!.decode((encoded as Uint8Array).subarray(start, pos))
    } else {
      part = (encoded as string).slice(start, pos)
    }
    jsonStr = part.slice(-6)
    delta = pos < end ? jsonStr.lastIndexOf("\\") : -1
    if (delta > 0 && delta > jsonStr.length - 2) {
      part += "b"
      delta = 1
    } else if (delta > 0 && jsonStr[delta + 1] === "u") {
      delta = jsonStr.length - delta // then delta in [2..5]
      for (let i = delta; i++ < 6; part += "b") { /* empty */ }
    } else {
      delta = 0
    }
    part = JSON.parse(`"${part}"`)
    if (delta) {
      let hadConsumedSlash = part.endsWith("b")
      if (!hadConsumedSlash) { pos -= delta }
      part = part.slice(0, delta > 1 && hadConsumedSlash ? delta - 6 : -1)
    }
    dict[key + ":" + slice++] = prefix + part
    start = pos
    if (slice >= GlobalConsts.MaxSyncedSlices) {
      // force to throw all the left, so that all slices can be cleaned when the value gets short again
      break
    }
  }
  dict[key] = { $_serialize: "split", k: prefix, s: slice }
  return dict
}

const DoUpdate = (): void => {
  const items = to_update, upgradedItems = toCleanDuringUpgrade
  const removed: string[] = [], updated: string[] = [], reset: string[] = [],
  delayedSerializedItems: EnsuredSafeDict<MultiLineSerialized> = BgUtils_.safeObj_(),
  serializedDict: Dict<boolean | string | number | object> = {}
  to_update = toCleanDuringUpgrade = null
  if (!items || sync_ !== TrySet) { return }
  let encoder = ((!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder) && !OnEdge
      || (globalThis as any).TextEncoder) && Object.keys(items).length > 0 ? new TextEncoder() : null
  for (const _key in items) {
    const key = _key as keyof SettingsToUpdate
    let value = items[key],
    defaultVal = settings_.defaults_[key],
    startToResetList = typeof defaultVal === "string"
        || typeof defaultVal === "object" && key !== "vimSync"
        ? 0 : GlobalConsts.MaxSyncedSlices
    if (value != null) {
      let serialized = serialize(key, value, encoder)
      if (serialized && typeof serialized === "object") {
        delayedSerializedItems[key] = serialized
        startToResetList = serialized[key]!.s
      } else {
        serializedDict[key] = serialized ? <SingleSerialized> {
            $_serialize: "single", d: JSON.parse(serialized) } : value
        updated.push(key)
      }
    } else {
      removed.push(key)
    }
    for (; startToResetList < GlobalConsts.MaxSyncedSlices; startToResetList++) {
      reset.push(key + ":" + startToResetList)
    }
  }
  textDecoder = encoder = null as never
  upgradedItems && removed.push(...upgradedItems)
  reset.push(...removed)

  if (removed.length > 0) {
    log(kCloud, "reset", removed.join(", "))
  }
  if (reset.length > 0) {
    storage().remove(reset)
  }
  if (updated.length > 0) {
    log(kCloud, "update", updated.join(", "))
    storage().set(serializedDict)
  }
  for (let key in delayedSerializedItems) {
    storage().set(delayedSerializedItems[key], (): void => {
      const err = runtimeError_()
      if (err) {
        log("Failed to update", key, ":", err.message || err)
      } else {
        log(kCloud, "update (serialized) " + key)
      }
      return err
    })
  }
}

const shouldSyncKey = (key: string): key is keyof SettingsToSync => !(key in doNotSync)

const updateLegacyToLocal = Build.MV3 ? null : (timeout: number): void => {
  set_updateToLocal_(null)
  longDelayedAction && clearTimeout(longDelayedAction)
  longDelayedAction = setTimeout((): void => {
    longDelayedAction = 0
    settings_.local_.get((items): void => {
      const legacy = settings_.legacyStorage_mv2_!
      if (!legacy.length) { return }
      log("storage.local: update settings from localStorage")
      BgUtils_.safer_(items)
      const toAdd = BgUtils_.safeObj_<string>()
      for (let i = 0, end = legacy.length; i < end; i++) {
        const key = legacy.key(i)! as keyof SettingsNS.SettingsWithDefaults, value = items[key]
        if (key in settings_.defaults_) {
          const defaultVal = settings_.defaults_[key], curVal = settingsCache_[key]
          let curJSON = curVal, jsonVal: string = value
          if (typeof defaultVal === "object") { jsonVal = JSON.stringify(value), curJSON = JSON.stringify(curVal) }
          if (curJSON !== jsonVal) {
            settings_.set_(key, curVal)
          }
        } else if (items[key] !== value && key as typeof key | SettingsNS.LocalSettingNames !== "i18n_f") {
          toAdd[key] = value
        }
      }
      if (Object.keys(toAdd).length > 0) { settings_.local_.set(toAdd) }
      legacy.clear()
    })
  }, timeout)
}

interface LocalSettings extends Dict<any> { vimSync?: SettingsNS.BackendSettings["vimSync"] }
const beginToRestore = (items: LocalSettings, resolve: () => void): void => {
  BgUtils_.safer_(items)
  const vimSync = items.vimSync || settingsCache_.vimSync == null && hasEmptyLocalStorage_
  updateHooks_.vimSync!(false, "vimSync") // turn off sync_ for a
  if (!vimSync) {
    resolve()
    return // no settings have been modified
  } else if (!items.vimSync) {
    // cloud may be empty, but the local computer wants to sync, so enable it
    log(kCloud, "enable vimSync")
    items.vimSync = true
    storage().set({ vimSync: true })
  }
  const toReset: string[] = []
  const legacy = Build.MV3 ? null : settings_.legacyStorage_mv2_
  for (let key in settingsCache_) {
    // although storeAndPropagate indeed checks @shouldSyncKey(key)
    // here check it for easier debugging
    if (settingsCache_[key as keyof SettingsNS.SettingsWithDefaults] !==
          settings_.defaults_[key as keyof SettingsNS.SettingsWithDefaults]) {
      if (!(key in items) && shouldSyncKey(key)) {
        if (key !== "keyLayout" || !(settings_.needToUpgradeSettings_ & 2))
          toReset.push(key)
      }
      legacy && legacy.length && legacy.removeItem(key)
    }
  }
  for (let key of toReset) {
    storeAndPropagate(key, null)
  }
  for (const key in items) {
    if (!key.includes(":")) {
      storeAndPropagate(key, items[key], items)
    }
  }
  Build.MV3 || updateLegacyToLocal!(60)
  settings_.postUpdate_("vimSync")
  setTimeout((): void => { resolve() }, 4)
  log(kCloud, "download settings")
}

updateHooks_.vimSync = (value): void => {
  if (!storage()) { return }
  const areaOnChanged = (OnChrome
      ? Build.MinCVer >= BrowserVer.Min$StorageArea$$onChanged || CurCVer_ > BrowserVer.Min$StorageArea$$onChanged - 1
      : OnFirefox ? (Build.MinFFVer >= FirefoxBrowserVer.Min$StorageArea$$onChanged
          || CurFFVer_ > FirefoxBrowserVer.Min$StorageArea$$onChanged - 1)
      : OnSafari && storage().onChanged)
      ? storage().onChanged! : OnChrome ? storage().onChanged : null
  const event = (OnChrome && Build.MinCVer >= BrowserVer.Min$StorageArea$$onChanged
      || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.Min$StorageArea$$onChanged)
      ? areaOnChanged! : areaOnChanged || browserStorage_.onChanged
  const listener = !(OnChrome && Build.MinCVer >= BrowserVer.Min$StorageArea$$onChanged
      || OnFirefox && Build.MinFFVer >= FirefoxBrowserVer.Min$StorageArea$$onChanged) && areaOnChanged
      ? HandleSyncAreaUpdate : HandleStorageUpdate
  if (!value) {
    event.removeListener(listener)
    set_sync_(blank_)
    return
  } else if (sync_ !== TrySet) {
    event.addListener(listener)
    set_sync_(TrySet)
    Build.MV3 || updateLegacyToLocal!(60)
  } else if (to_update) {
    log(kCloud, "save immediately")
    DoUpdate()
  }
}

void settings_.ready_.then((): void => {
  const vimSync = settingsCache_.vimSync
  if (vimSync === false || !vimSync && !hasEmptyLocalStorage_) {
    if (!Build.MV3) {
      let doUpdate = updateToLocal_ === true
      set_updateToLocal_(doUpdate ? null : updateLegacyToLocal!)
      doUpdate && updateLegacyToLocal!(6000)
    }
    Build.MV3 || "showActionIcon" in updateHooks_ ? set_installation_(null)
        : setTimeout((): void => { set_installation_(null) }, 1000)
  } else if (installation_) { // on startup
    innerRestoreSettings = installation_.then((reason): boolean => {
      Build.MV3 || "showActionIcon" in updateHooks_ ? set_installation_(null)
          : setTimeout((): void => { set_installation_(null) }, 1000)
      return !!reason && reason.reason === "install"
    }).then((installed): Promise<void> => new Promise((r): void => {
      storage() ? storage().get((items): void => {
        const err = runtimeError_()
        const first = installed && hasEmptyLocalStorage_ && (err || Object.keys(items).length === 0)
        const callback = first ? (): void => { settings_.set_("keyLayout", kKeyLayout.IfFirstlyInstalled); r() } : r
        if (err) {
          updateHooks_.vimSync = blank_
          callback()
          log("Error: failed to get storage:", err, "\n\tSo disable syncing temporarily.")
        } else {
          beginToRestore(items, callback)
        }
        return err
      }) : r()
    })).then((): void => {
      set_restoreSettings_(null), innerRestoreSettings = null
    })
    set_restoreSettings_(Promise.race([innerRestoreSettings, new Promise((resolve): void => {
      setTimeout(resolve, 800)
    })]).then((): void => {
      set_restoreSettings_(null)
      settingsCache_.vimSync && sync_ !== TrySet && settings_.postUpdate_("vimSync")
    }))
  } else { // on reload ./sync
    settings_.postUpdate_("vimSync")
  }
})
