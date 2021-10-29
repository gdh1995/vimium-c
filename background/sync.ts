import {
  blank_, set_sync_, sync_, restoreSettings_, set_restoreSettings_, contentPayload_, OnChrome, OnEdge,
  hasEmptyLocalStorage_, set_backupToLocal_, backupToLocal_, OnFirefox
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

const doNotSync: PartialTypedSafeEnum<SettingsToSync> = BgUtils_.safer_({
  // Note(gdh1995): need to keep synced with pages/options_ext.ts#_importSettings
  findModeRawQueryList: 1, innerCSS: 1, keyboard: 1, newTabUrl_f: 1
  , vomnibarPage_f: 1
} as const)
const browserStorage_ = browser_.storage

let __sync: chrome.storage.StorageArea | undefined
let to_update: SettingsToUpdate | null = null
let keyInDownloading: keyof SettingsWithDefaults | "" = ""
let changes_to_merge: EnsuredDict<StorageChange> | null = null
let textDecoder: TextDecoder | null = null
let restoringPromise: Promise<void> | null = null
let cachedSync: SettingsWithDefaults["vimSync"]
let longDelayedAction: number = 0

const storage = (): chrome.storage.StorageArea & {
  onChanged?: chrome.events.Event<(changes: EnsuredDict<StorageChange>, exArg: FakeArg) => void>
} => __sync || (__sync = browserStorage_ && browserStorage_.sync)

const HandleSyncAreaUpdate = (changes: EnsuredDict<StorageChange>): void => {
  HandleStorageUpdate(changes, "sync")
}

const HandleStorageUpdate = (changes: EnsuredDict<StorageChange>, area: string | FakeArg): void => {
  if (area !== "sync") { return }
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
  const needToRestoreFirst = restoreSettings_ && restoreSettings_()
  changes_to_merge ? Object.assign(changes_to_merge, changes) : (changes_to_merge = changes)
  if (needToRestoreFirst) {
    void needToRestoreFirst.then(() => HandleStorageUpdate({}, area))
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

const log: (... _: any[]) => void = function (): void {
  console.log.apply(console, [`[${_now()}]`].concat([].slice.call(arguments as any)))
}

/** return `8` only when expect a valid `map` */
const storeAndPropagate = (key: string, value: any, map?: Dict<any>): void | 8 => {
  if (!(key in settings_.defaults_) || key in settings_.nonPersistent_ || !shouldSyncKey(key)) { return }
  const defaultVal = settings_.defaults_[key]
  const serialized = value && typeof value === "object"
      && (value as Partial<SerializationMetaData | SingleSerialized>).$_serialize || ""
  if (serialized) {
    if (serialized === "split" && !map) { return 8 }
    value = deserialize(key, value, map)
    if (value === 8) { // still lack fields
      return
    }
  }
  if (value == null) {
    if (localStorage.getItem(key) != null) {
      restoringPromise ||
      log("sync.this: reset", key)
      setAndPost(key, defaultVal)
    }
    return
  }
  let curVal = restoringPromise ? defaultVal : settings_.get_(key)
    , curJSON: string | boolean | number, jsonVal: string | boolean | number
    , notJSON: boolean
  if (notJSON = typeof defaultVal !== "object") {
    jsonVal = value as string | boolean | number
    curJSON = curVal as string | boolean | number
  } else {
    jsonVal = JSON.stringify(value)
    curJSON = JSON.stringify(curVal)
  }
  if (jsonVal === curJSON) { return }
  curVal = notJSON ? defaultVal : JSON.stringify(defaultVal)
  if (jsonVal === curVal) {
    value = defaultVal
  }
  restoringPromise ||
  log("sync.this: update", key,
    typeof value === "string"
    ? (value.length > 32 ? value.slice(0, 30) + "..." : value).replace(<RegExpG> /\n/g, "\\n")
    : value)
  setAndPost(key, value)
}

const setAndPost = (key: keyof SettingsToSync, value: any): void => {
  keyInDownloading = key
  settings_.set_(key, value)
  keyInDownloading = ""
  if (key in settings_.valuesToLoad_) {
    settings_.broadcast_({ N: kBgReq.settingsUpdate, d: [
      settings_.valuesToLoad_[key as keyof typeof settings_.valuesToLoad_]
    ] })
  }
}

const TrySet = <K extends keyof SettingsToSync>(key: K, value: SettingsToSync[K] | null): void => {
  if (!shouldSyncKey(key) || key === keyInDownloading) { return }
  if (!to_update) {
    setTimeout(DoUpdate, 800)
    to_update = BgUtils_.safeObj_() as SettingsToUpdate
  }
  to_update[key] = value
}

if (!Build.NDEBUG) {
  (globalThis as any).serializeSync = (key: any, val: any, enc?: any): any => {
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
    let result = deserialize(key, val, items)
    return result != null ? result : val
  }
}

const SetLocal = <K extends keyof SettingsToSync>(key: K, value: SettingsToSync[K] | null): void => {
  if (!storage()) {
    set_sync_(blank_)
    return
  }
  const local_ = browserStorage_.local
  const cb = (): void => {
    const err = runtimeError_()
    if (err) {
      log("storage.local: Failed to update", key, ":", err.message || err)
      return err
    }
  }
  value == null ? local_.remove(key, cb) : local_.set({ [key]: value }, cb)
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
      for (; pos < end && ((encoded as Uint8Array)[pos] & 0xc0) === 0x80; pos--) { /* empty */ }
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
  const items = to_update, removed: string[] = [], updated: string[] = [], reset: string[] = [],
  delayedSerializedItems: EnsuredSafeDict<MultiLineSerialized> = BgUtils_.safeObj_(),
  serializedDict: Dict<boolean | string | number | object> = {}
  to_update = null
  if (!items || sync_ !== TrySet) { return }
  let encoder = (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder) && !OnEdge
      || (globalThis as any).TextEncoder ? new TextEncoder() : null
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
      reset.push(key)
      removed.push(key)
    }
    for (; startToResetList < GlobalConsts.MaxSyncedSlices; startToResetList++) {
      reset.push(key + ":" + startToResetList)
    }
  }
  textDecoder = encoder = null as never
  if (removed.length > 0) {
    log("sync.cloud: reset", removed.join(", "))
  }
  if (reset.length > 0) {
    storage().remove(reset)
  }
  if (updated.length > 0) {
    log("sync.cloud: update", updated.join(", "))
    storage().set(serializedDict)
  }
  for (let key in delayedSerializedItems) {
    storage().set(delayedSerializedItems[key], (): void => {
      const err = runtimeError_()
      if (err) {
        log("Failed to update", key, ":", err.message || err)
      } else {
        log("sync.cloud: update (serialized) " + key)
      }
      return err
    })
  }
}

const shouldSyncKey = (key: string): key is keyof SettingsToSync => !(key in doNotSync)

const saveAllToLocal = (timeout: number): void => {
  set_backupToLocal_(null)
  longDelayedAction && clearTimeout(longDelayedAction)
  longDelayedAction = setTimeout((): void => {
    longDelayedAction = 0
    browserStorage_.local.get((items): void => {
      if (settings_.get_("vimSync") || !localStorage.length) { return }
      log("storage.local: backup all settings from localStorage")
      BgUtils_.safer_(items)
      for (let i = 0, end = localStorage.length; i < end; i++) {
        const key = localStorage.key(i)!
        if (key in settings_.defaults_ && (shouldSyncKey(key) || key === "keyboard")) {
          const defaultVal = settings_.defaults_[key], value = items[key], curVal = settings_.get_(key)
          let curJSON = curVal, jsonVal: string = value
          if (typeof defaultVal === "object") { jsonVal = JSON.stringify(value), curJSON = JSON.stringify(curVal) }
          if (curJSON !== jsonVal) {
            SetLocal(key, curVal)
          }
          delete items[key]
        }
      }
      const left = Object.keys(items)
      if (left.length > 0) { browserStorage_.local.remove(left) }
    })
  }, timeout)
}

interface LocalSettings extends Dict<any> { vimSync?: SettingsNS.BackendSettings["vimSync"] }
const beginToRestore = (items: LocalSettings, kSources: 1 | 2 | 3, resolve: () => void): void => {
  kSources & 2 && browserStorage_.local.get((items2: LocalSettings): void => {
    const err = runtimeError_()
    err && set_restoreSettings_(null)
    if (err || !hasEmptyLocalStorage_ && settings_.get_("vimSync") === true) {
      (kSources -= 2) || resolve()
      return err
    }
    BgUtils_.safer_(items2)
    let vimSync2 = items2.vimSync, nowDoRestore = vimSync2 !== undefined || Object.keys(items2).length > 0
    delete items2.vimSync
    if (nowDoRestore) {
      log("storage.local: restore settings to localStorage")
    }
    for (let key in items2) {
      if (key in settings_.defaults_) {
        let val = items2[key]
        keyInDownloading = key as keyof SettingsWithDefaults
        val = val == null ? settings_.defaults_[key as keyof SettingsWithDefaults] : val
        settings_.set_(key as keyof SettingsWithDefaults, val)
      }
    }
    keyInDownloading = ""
    if (vimSync2 != null) {
      settings_.set_("vimSync", vimSync2)
    }
    setTimeout((): void => {
      settings_.broadcast_({ N: kBgReq.settingsUpdate, d: contentPayload_ })
    }, 100);
    (kSources -= 2) || resolve()
  })
  if (kSources === 2) { return }
  BgUtils_.safer_(items)
  const vimSync = items.vimSync || settings_.get_("vimSync")
  if (!vimSync) {
    cachedSync = vimSync
    set_sync_(SetLocal)
    --kSources || resolve()
    return // no settings have been modified
  } else if (!items.vimSync) {
    // cloud may be empty, but the local computer wants to sync, so enable it
    log("sync.cloud: enable vimSync")
    items.vimSync = vimSync
    storage().set({ vimSync })
  }
  const toReset: string[] = []
  for (const key in items) { if (key in settings_.legacyNames_) { toReset.push(key) } }
  const toRemove: string[] = [], toAdd: Dict<string> = {}
  for (let key of toReset) {
    const newKey = settings_.legacyNames_[key as keyof SettingsNS.LegacyNames]
    for (let i = -1, j: string; i < GlobalConsts.MaxSyncedSlices && (j = i < 0 ? key : key + ":" + i) in items; i++) {
      const newJ = i < 0 ? newKey : newKey + ":" + i
      toAdd[newJ] = items[newJ] = items[j]
      delete items[j]
      toRemove.push(j)
    }
  }
  if (toReset.length > 0) {
    browserStorage_.onChanged.removeListener(HandleStorageUpdate)
    set_sync_(blank_)
    storage().remove(toRemove)
    storage().set(toAdd, runtimeError_)
    toReset.length = 0
  }
  for (let i = 0, end = localStorage.length; i < end; i++) {
    const key = localStorage.key(i)!
    // although storeAndPropagate indeed checks @shouldSyncKey(key)
    // here check it for easier debugging
    if (!(key in items) && key in settings_.defaults_ && shouldSyncKey(key)) {
      toReset.push(key)
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
  settings_.postUpdate_("vimSync")
  setTimeout((): void => { --kSources || resolve() }, 4)
  restoringPromise && kSources !== 3 &&
  log("sync.cloud: download settings to localStorage")
}

settings_.updateHooks_.vimSync = (value): void => {
  cachedSync = value
  if (!storage()) { return }
  const areaOnChanged_cr = OnChrome && Build.MinCVer > BrowserVer.Min$StorageArea$$onChanged
      ? storage().onChanged! : OnChrome ? storage().onChanged : null
  const event = OnChrome && Build.MinCVer > BrowserVer.Min$StorageArea$$onChanged
      ? areaOnChanged_cr! : OnChrome && areaOnChanged_cr || browserStorage_.onChanged
  const listener = OnChrome && (Build.MinCVer > BrowserVer.Min$StorageArea$$onChanged || areaOnChanged_cr)
      ? HandleSyncAreaUpdate : HandleStorageUpdate
  if (!value) {
    event.removeListener(listener)
    if (sync_ !== SetLocal) {
      set_sync_(SetLocal)
      saveAllToLocal(600)
    }
    return
  } else if (sync_ !== TrySet) {
    event.addListener(listener)
    set_sync_(TrySet)
    longDelayedAction && clearTimeout(longDelayedAction)
    longDelayedAction = 0;
    const testLocal = (): void => {
      browserStorage_.local.get((items) => {
        if (OnFirefox && Object.keys(items).length === 0) { return }
        delete (items as SettingsNS.FullCache).vimSync
        log("switch to sync.cloud, when old settings data in storage.local is:", "\n" + JSON.stringify(items, null, 2))
        longDelayedAction = setTimeout((): void => {
          longDelayedAction = 0
          browserStorage_.local.clear()
        }, 8000)
      })
    }
    OnFirefox ? /*#__INLINE__*/ testLocal() : browserStorage_.local.getBytesInUse((bytesInLocal): void => {
      bytesInLocal > 0 && /*#__INLINE__*/ testLocal()
    })
  }
}

set_restoreSettings_((): Promise<void> | null => {
  if (restoringPromise) { /* empty */ }
  else if (!localStorage.length) {
    // eslint-disable-next-line arrow-body-style
    restoringPromise = new Promise<void>(resolve => {
        cachedSync ? storage().get(items => {
          const err = runtimeError_()
          err ? (set_restoreSettings_(null), resolve()) : beginToRestore(items, 1, resolve)
          return err
        }) : beginToRestore({}, 2, resolve)
    }).then(_ => { restoringPromise = null })
  } else {
    return null
  }
  return restoringPromise
})

cachedSync = settings_.get_("vimSync")
if (cachedSync === false || !cachedSync && !hasEmptyLocalStorage_) {
  let doBackup = backupToLocal_ === true
  set_backupToLocal_(doBackup ? null : saveAllToLocal)
  doBackup && saveAllToLocal(6000)
  set_sync_(SetLocal)
} else {
!storage() ? (set_sync_(blank_), set_restoreSettings_(null)) : storage().get((items): void => {
  const err = runtimeError_()
  if (err) {
    log("Error: failed to get storage:", err, "\n\tSo disable syncing temporarily.")
    settings_.updateHooks_.vimSync = undefined
    set_sync_(blank_)
    set_restoreSettings_(null)
    return err
  }
  restoringPromise = Promise.resolve()
  restoringPromise = new Promise<void>(r => beginToRestore(items, 3, r)).then<void>(_ => { restoringPromise = null })
})
}
