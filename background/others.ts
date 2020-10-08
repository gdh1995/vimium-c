declare const enum OmniboxData {
  DefaultMaxChars = 128,
  MarginH = 160,
  MeanWidthOfChar = 7.72,
  PreservedTitle = 16,
}

BgUtils_.timeout_(1000, function (): void {
  type SettingsToSync = SettingsNS.PersistentSettings;
  type SettingsToUpdate = {
    [key in keyof SettingsToSync]?: SettingsToSync[key] | null
  };
  interface SerializationMetaData {
    $_serialize: "split";
    k: string;
    s: number;
  }
  interface SingleSerialized {
    $_serialize: "single";
    d: any;
  }
  type MultiLineSerialized = { [key: string]: SerializationMetaData | string | undefined } & {
      [key in keyof SettingsToUpdate]: SerializationMetaData };
  type StorageChange = chrome.storage.StorageChange
  const storage = (): chrome.storage.StorageArea & {
    onChanged?: chrome.events.Event<(changes: { [key: string]: StorageChange }, exArg: FakeArg) => void>
  } => __sync || (__sync = chrome.storage && chrome.storage.sync)
  let __sync: chrome.storage.StorageArea | undefined
  let to_update: SettingsToUpdate | null = null, keyInDownloading: keyof SettingsWithDefaults | "" = "",
  changes_to_merge: { [key: string]: StorageChange } | null = null,
  textDecoder: TextDecoder | null = null,
  restoringPromise: Promise<void> | null = null,
  cachedSync = Settings_.get_("vimSync"),
  doNotSync: PartialTypedSafeEnum<SettingsToSync> = BgUtils_.safer_({
    // Note(gdh1995): need to keep synced with pages/options_ext.ts#_importSettings
    findModeRawQueryList: 1, innerCSS: 1, keyboard: 1, newTabUrl_f: 1
    , vomnibarPage_f: 1
  } as const);
  function HandleSyncAreaUpdate(changes: { [key: string]: StorageChange }): void {
    HandleStorageUpdate(changes, "sync");
  }
  function HandleStorageUpdate(changes: { [key: string]: StorageChange }, area: string | FakeArg): void {
    if (area !== "sync") { return; }
    BgUtils_.safer_(changes);
    const needToRestoreFirst = Settings_.restore_ && Settings_.restore_();
    if (needToRestoreFirst) {
      changes_to_merge && BgUtils_.extendIf_(changes, changes_to_merge);
      changes_to_merge = changes;
      needToRestoreFirst.then(_ => HandleStorageUpdate({}, area));
      return;
    }
    if (changes_to_merge) {
      BgUtils_.extendIf_(changes, changes_to_merge);
      changes_to_merge = null;
    }
    for (const key in changes) {
      const change = changes[key], is_part = key.includes(":"),
      result = is_part ? 8 : storeAndPropagate(key, change != null ? change.newValue : null);
      if (result === 8) {
        changes_to_merge = changes;
        storage().get(waitAndUpdate);
        return;
      }
      delete changes[key];
    }
    function waitAndUpdate(items: { [key: string]: any }): void {
      if (changes_to_merge) {
        BgUtils_.safer_(items);
        for (const key in changes_to_merge) {
          const key2 = key.split(":")[0], isSame = key2 === key;
          if (isSame || !(key2 in changes_to_merge)) {
            const change = isSame ? changes_to_merge[key] : null;
            storeAndPropagate(key2, change != null ? change.newValue : items[key2], items);
          }
        }
        changes_to_merge = null;
      }
    }
  }
  function log(... _: any[]): void {
    console.log.apply(console, [new Date().toLocaleString()].concat.call([].slice.call(arguments as any, 0)) as any)
  }
  /** return `8` only when expect a valid `map` */
  function storeAndPropagate(key: string, value: any, map?: Dict<any>): void | 8 {
    if (!(key in Settings_.defaults_) || key in Settings_.nonPersistent_ || !shouldSyncKey(key)) { return; }
    const defaultVal = Settings_.defaults_[key];
    const serialized = value && typeof value === "object"
        && (value as Partial<SerializationMetaData | SingleSerialized>).$_serialize || "";
    if (serialized) {
      if (serialized === "split" && !map) { return 8; }
      value = deserialize(key, value, map);
      if (value === 8) { // still lack fields
        return;
      }
    }
    if (value == null) {
      if (localStorage.getItem(key) != null) {
        restoringPromise ||
        log("sync.this: reset", key);
        doSet(key, defaultVal);
      }
      return;
    }
    let curVal = restoringPromise ? defaultVal : Settings_.get_(key)
      , curJSON: string | boolean | number, jsonVal: string | boolean | number
      , notJSON: boolean;
    if (notJSON = typeof defaultVal !== "object") {
      jsonVal = value as string | boolean | number;
      curJSON = curVal as string | boolean | number;
    } else {
      jsonVal = JSON.stringify(value);
      curJSON = JSON.stringify(curVal);
    }
    if (jsonVal === curJSON) { return; }
    curVal = notJSON ? defaultVal : JSON.stringify(defaultVal);
    if (jsonVal === curVal) {
      value = defaultVal;
    }
    restoringPromise ||
    log("sync.this: update", key,
      typeof value === "string"
      ? (value.length > 32 ? value.slice(0, 30) + "..." : value).replace(<RegExpG> /\n/g, "\\n")
      : value);
    doSet(key, value);
  }
  function doSet(key: keyof SettingsToSync, value: any): void {
    const wanted = key === "keyMappings" || key === "exclusionRules" ? "KeyMappings" : ""
    if (!wanted) {
      return setAndPost(key, value);
    }
    BgUtils_.require_(wanted).then(setAndPost.bind(null, key, value))
    BgUtils_.GC_();
  }
  function setAndPost(key: keyof SettingsToSync, value: any): void {
    keyInDownloading = key;
    Settings_.set_(key, value);
    keyInDownloading = "";
    if (key in Settings_.valuesToLoad_) {
      Settings_.broadcast_({ N: kBgReq.settingsUpdate, d: [
        Settings_.valuesToLoad_[key as keyof typeof Settings_.valuesToLoad_]
      ] });
    }
  }
  function TrySet<K extends keyof SettingsToSync>(this: void, key: K, value: SettingsToSync[K] | null): void {
    if (!shouldSyncKey(key) || key === keyInDownloading) { return; }
    if (!to_update) {
      setTimeout(DoUpdate, 800);
      to_update = BgUtils_.safeObj_() as SettingsToUpdate;
    }
    to_update[key] = value;
  }
  if (!Build.NDEBUG) {
    (window as any).serializeSync = function (key: any, val: any, enc?: any): any {
      let serialized = serialize(key, val
            , (Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !(Build.BTypes & BrowserType.Chrome))
              && !(Build.BTypes & BrowserType.Edge) || enc ? new TextEncoder() : null);
      return serialized ? typeof serialized === "object" ?  serialized
          : <SingleSerialized> { $_serialize: "single", d: JSON.parse(serialized) } : val;
    };
    (window as any).deserializeSync = function (key: any, val: any, items?: any): any {
      if (items) {
        val = val || items[key] || val;
      } else {
        items = val;
        val = items && items[key] || val;
      }
      if (!val || !val.$_serialize) { return val; }
      let result = deserialize(key, val, items);
      return result != null ? result : val;
    };
  }
  function SetLocal<K extends keyof SettingsToSync>(this: void, key: K, value: SettingsToSync[K] | null): void {
    if (!storage()) {
      Settings_.sync_ = BgUtils_.blank_;
      return;
    }
    const local_ = chrome.storage.local
    const cb = () => {
      const err = BgUtils_.runtimeError_();
      if (err) {
        log("storage.local: Failed to update", key, ":", err.message || err);
        return err;
      }
    }
    value == null ? local_.remove(key, cb) : local_.set({ [key]: value }, cb);
  }

/** Chromium's base::JsonWriter will translate all "<" to "\u003C"
 * https://cs.chromium.org/chromium/src/extensions/browser/api/storage/settings_storage_quota_enforcer.cc?dr=CSs&q=Allocate&g=0&l=37e
 * https://cs.chromium.org/chromium/src/base/json/json_writer.cc?dr=CSs&q=EscapeJSONString&g=0&l=104
 * https://cs.chromium.org/chromium/src/base/json/string_escape.cc?dr=CSs&q=EscapeSpecialCodePoint&g=0&l=35
 */
  function fixCharsInJSON(text: string): string {
    return text.replace(<RegExpSearchable<0>> /[<`\u2028\u2029]/g
        , s => s === "<" ? "`l" : s === "`" ? "`d" : s === "\u2028" ? "`r" : "`n");
  }
  function escapeQuotes(text: string): string {
    return text.replace(<RegExpSearchable<0>> /"|\\[\\"]/g, s => s === '"' ? "`q" : s === '\\"' ? "`Q" : "`S");
  }
  function revertEscaping(text: string): string {
    const map: Dict<string> = { Q: '\\"', S: "\\\\", d: "`", l: "<", n: "\u2029", q: '"', r: "\u2028" };
    return text.replace(<RegExpSearchable<0>> /`[QSdlnqr]/g, s => map[s[1]]!);
  }
  // Note: allow failures
  function deserialize(key: keyof SettingsToUpdate, value: SingleSerialized | SerializationMetaData
      , map?: Dict<any>): string | object | null | 8 {
    let serialized = "";
    switch (value.$_serialize) {
    case "split":
      // check whether changes are only synced partially
      for (let { k: prefix, s: slice } = value, i = 0; i < slice; i++) {
        let part = map![key + ":" + i];
        if (!part || !part.startsWith(prefix)) { return 8; } // only parts
        serialized += part.slice(prefix.length);
      }
      break;
    case "single":
      return JSON.parse(revertEscaping(JSON.stringify(value.d)));
    default: // in case of methods in newer versions
      log("Error: can not support the data format in synced settings data:"
          , key, ":"
          , (value as unknown as SerializationMetaData | SingleSerialized).$_serialize);
      return null;
    }
    if (typeof Settings_.defaults_[key] === "string") {
      serialized = revertEscaping(serialized);
      return serialized;
    }
    serialized = revertEscaping(JSON.stringify(serialized));
    return JSON.parse(serialized.slice(1, -1));
  }
  function serialize(key: keyof SettingsToUpdate, value: boolean | string | number | object
      , encoder: TextEncoder | null): MultiLineSerialized | void | string {
    if (!value || (typeof value !== "string" ? typeof value !== "object"
        : value.length < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM / 6 - 40)) { return; }
    let jsonStr = JSON.stringify(value), encoded: Uint8Array | string = "";
    if (jsonStr.length < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM / 6 - 40) { return; }
    jsonStr = fixCharsInJSON(jsonStr);
    if (jsonStr.length * /* utf-8 limit */ 4 < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM - 99) { return jsonStr; }
    if ((Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !(Build.BTypes & BrowserType.Chrome))
        && !(Build.BTypes & BrowserType.Edge) || encoder) {
      encoded = encoder!.encode(jsonStr);
    } else {
      encoded = jsonStr = jsonStr.replace(<RegExpG & RegExpSearchable<0>> /[^\x00-\xff]/g, s => {
        let ch = s.charCodeAt(0); return "\\u" + (ch > 0xfff ? "" : "0") + ch.toString(16);
      });
    }
    if (encoded.length < GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM - 99) { return jsonStr; }
    let slice = 0, prefix = Date.now().toString(36) + ":", dict: MultiLineSerialized = {};
    jsonStr = typeof Settings_.defaults_[key] === "string" ? jsonStr.slice(1, -1) : escapeQuotes(jsonStr);
    if ((Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !(Build.BTypes & BrowserType.Chrome))
        && !(Build.BTypes & BrowserType.Edge) || encoder) {
      textDecoder || (textDecoder = new TextDecoder());
      encoded = encoder!.encode(jsonStr);
    } else {
      encoded = jsonStr.replace(<RegExpG & RegExpSearchable<0>> /[^\x00-\xff]/g, s => {
        let ch = s.charCodeAt(0); return "\\u" + (ch > 0xfff ? "" : "0") + ch.toString(16);
      });
    }
    for (let start = 0, end = encoded.length; start < end; ) {
      let pos = Math.min(start + (GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM - 40 - 16 - 2), end), part: string,
      delta = 0;
      if ((Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !(Build.BTypes & BrowserType.Chrome))
          && !(Build.BTypes & BrowserType.Edge) || encoder) {
        // find a boundary of char points
        for (; pos < end && ((encoded as Uint8Array)[pos] & 0xc0) === 0x80; pos--) { /* empty */ }
        part = textDecoder!.decode((encoded as Uint8Array).subarray(start, pos));
      } else {
        part = (encoded as string).slice(start, pos);
      }
      jsonStr = part.slice(-6);
      delta = jsonStr.lastIndexOf("\\");
      if (delta > jsonStr.length - 2) {
        part += "b";
        delta = 1;
      } else if (delta > 0 && jsonStr[delta + 1] === "u") {
        delta = jsonStr.length - delta; // then delta in [2..5]
        for (let i = delta; i++ < 6; part += "b") { /* empty */ }
      } else {
        delta = 0;
      }
      part = JSON.parse(`"${part}"`);
      if (delta) {
        let hadConsumedSlash = part.endsWith("b");
        if (!hadConsumedSlash) { pos -= delta; }
        part = part.slice(0, delta > 1 && hadConsumedSlash ? delta - 6 : -1);
      }
      dict[key + ":" + slice++] = prefix + part;
      start = pos;
      if (slice >= GlobalConsts.MaxSyncedSlices) {
        // force to throw all the left, so that all slices can be cleaned when the value gets short again
        break;
      }
    }
    // for (let start = 0, end = string.length, part: string; start < end; start += part.length) {
    //   part = BgUtils_.unicodeSubstring_(string, start,
    //       Math.min(start + ((((GlobalConsts.SYNC_QUOTA_BYTES_PER_ITEM) / 4) | 0) - 12), end));
    //   dict[key + ":" + slice++] = prefix + part;
    // }
    dict[key] = { $_serialize: "split", k: prefix, s: slice };
    return dict;
  }
  function DoUpdate(this: void): void {
    const items = to_update, removed: string[] = [], updated: string[] = [], reset: string[] = [],
    delayedSerializedItems: EnsuredSafeDict<MultiLineSerialized> = BgUtils_.safeObj_(),
    serializedDict: Dict<boolean | string | number | object> = {};
    to_update = null;
    if (!items || Settings_.sync_ !== TrySet) { return; }
    let encoder = (Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !(Build.BTypes & BrowserType.Chrome))
        && !(Build.BTypes & BrowserType.Edge) || (window as any).TextEncoder ? new TextEncoder() : null;
    for (const _key in items) {
      const key = _key as keyof SettingsToUpdate;
      let value = items[key],
      defaultVal = Settings_.defaults_[key],
      startToResetList = typeof defaultVal === "string"
          || typeof defaultVal === "object" && key !== "vimSync"
          ? 0 : GlobalConsts.MaxSyncedSlices;
      if (value != null) {
        let serialized = serialize(key, value, encoder);
        if (serialized && typeof serialized === "object") {
          delayedSerializedItems[key] = serialized;
          startToResetList = serialized[key]!.s;
        } else {
          serializedDict[key] = serialized ? <SingleSerialized> {
              $_serialize: "single", d: JSON.parse(serialized) } : value;
          updated.push(key);
        }
      } else {
        reset.push(key);
        removed.push(key);
      }
      for (; startToResetList < GlobalConsts.MaxSyncedSlices; startToResetList++) {
        reset.push(key + ":" + startToResetList);
      }
    }
    textDecoder = encoder = null as never;
    if (removed.length > 0) {
      log("sync.cloud: reset", removed.join(", "));
    }
    if (reset.length > 0) {
      storage().remove(reset);
    }
    if (updated.length > 0) {
      log("sync.cloud: update", updated.join(", "));
      storage().set(serializedDict);
    }
    for (let key in delayedSerializedItems) {
      storage().set(delayedSerializedItems[key], (): void => {
        const err = BgUtils_.runtimeError_();
        if (err) {
          log("Failed to update", key, ":", err.message || err);
        } else {
          log("sync.cloud: update (serialized) " + key);
        }
        return err;
      });
    }
  }
  function shouldSyncKey(key: string): key is keyof SettingsToSync {
    return !(key in doNotSync);
  }
  function saveAllToLocal(timeout: number): void {
    Settings_.temp_.backupSettingsToLocal_ = null;
    BgUtils_.timeout_(timeout, () => { chrome.storage.local.get((items): void => {
      if (Settings_.get_("vimSync") || !localStorage.length) { return; }
      log("storage.local: backup all settings from localStorage");
      BgUtils_.safer_(items);
      for (let i = 0, end = localStorage.length; i < end; i++) {
        const key = localStorage.key(i)!;
        if (key in Settings_.defaults_ && (shouldSyncKey(key) || key === "keyboard")) {
          const defaultVal = Settings_.defaults_[key], value = items[key], curVal = Settings_.get_(key);
          let curJSON = curVal, jsonVal: string = value;
          if (typeof defaultVal === "object") { jsonVal = JSON.stringify(value); curJSON = JSON.stringify(curVal); }
          if (curJSON !== jsonVal) {
            SetLocal(key, curVal);
          }
          delete items[key];
        }
      }
      const left = Object.keys(items);
      if (left.length > 0) { chrome.storage.local.remove(left); }
    }); });
  }
  Settings_.updateHooks_.vimSync = function (value): void {
    cachedSync = value;
    if (!storage()) { return; }
    const areaOnChanged = !(Build.BTypes & BrowserType.Chrome) && Build.MinCVer > BrowserVer.Min$StorageArea$$onChanged
        ? storage().onChanged!
        : !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther & BrowserType.Chrome
        ? storage().onChanged : null
    const event = !(Build.BTypes & BrowserType.Chrome) && Build.MinCVer > BrowserVer.Min$StorageArea$$onChanged
        ? areaOnChanged! : Build.BTypes & BrowserType.Chrome && areaOnChanged || chrome.storage.onChanged
    const listener = !(Build.BTypes & BrowserType.Chrome) && Build.MinCVer > BrowserVer.Min$StorageArea$$onChanged
        || Build.BTypes & BrowserType.Chrome && areaOnChanged ? HandleSyncAreaUpdate : HandleStorageUpdate
    if (!value) {
      event.removeListener(listener)
      if (Settings_.sync_ !== SetLocal) {
        Settings_.sync_ = SetLocal;
        saveAllToLocal(600);
      }
      return;
    } else if (Settings_.sync_ !== TrySet) {
      event.addListener(listener)
      Settings_.sync_ = TrySet;
      chrome.storage.local.clear();
    }
  };
  function beginToRestore(items: Dict<any>, kSources: 1 | 2 | 3, resolve: (this: void) => void): void {
    kSources & 2 && chrome.storage.local.get((items2): void => {
      const err = BgUtils_.runtimeError_();
      if (err) {
        Settings_.restore_ = null;
        (kSources -= 2) || resolve();
        return err;
      }
      BgUtils_.safer_(items2);
      let vimSync2 = items2.vimSync, nowDoRestore = vimSync2 !== undefined || Object.keys(items2).length > 0;
      delete items2.vimSync;
      if (nowDoRestore) {
        log("storage.local: restore settings to localStorage");
      }
      for (let key in items2) {
        if (key in Settings_.defaults_) {
          let val = items2[key]
          keyInDownloading = key as keyof SettingsWithDefaults;
          val = val == null ? Settings_.defaults_[key as keyof SettingsWithDefaults] : val
          Settings_.set_(key as keyof SettingsWithDefaults, val);
        }
      }
      keyInDownloading = "";
      if (vimSync2 != null) {
        Settings_.set_("vimSync", vimSync2);
      }
      BgUtils_.timeout_(100, () => {
        Settings_.broadcast_({ N: kBgReq.settingsUpdate, d: Settings_.payload_ });
      });
      (kSources -= 2) || resolve();
    });
    if (kSources === 2) { return; }
    BgUtils_.safer_(items);
    const vimSync = items.vimSync || Settings_.get_("vimSync");
    if (!vimSync) {
      cachedSync = vimSync;
      Settings_.sync_ = SetLocal;
      --kSources || resolve();
      return; // no settings have been modified
    } else if (!items.vimSync) {
      // cloud may be empty, but the local computer wants to sync, so enable it
      log("sync.cloud: enable vimSync");
      items.vimSync = vimSync;
      storage().set({ vimSync });
    }
    const toReset: string[] = [];
    for (const key in items) { if (key in Settings_.legacyNames_) { toReset.push(key); } }
    const toRemove: string[] = [], toAdd: Dict<string> = {};
    for (let key of toReset) {
      const newKey = Settings_.legacyNames_[key as keyof SettingsNS.LegacyNames];
      for (let i = -1, j: string; i < GlobalConsts.MaxSyncedSlices && (j = i < 0 ? key : key + ":" + i) in items; i++) {
        const newJ = i < 0 ? newKey : newKey + ":" + i;
        toAdd[newJ] = items[newJ] = items[j];
        delete items[j];
        toRemove.push(j);
      }
    }
    if (toReset.length > 0) {
      chrome.storage.onChanged.removeListener(HandleStorageUpdate);
      Settings_.sync_ = BgUtils_.blank_;
      storage().remove(toRemove);
      storage().set(toAdd, BgUtils_.runtimeError_);
      toReset.length = 0;
    }
    for (let i = 0, end = localStorage.length; i < end; i++) {
      const key = localStorage.key(i)!;
      // although storeAndPropagate indeed checks @shouldSyncKey(key)
      // here check it for easier debugging
      if (!(key in items) && key in Settings_.defaults_ && shouldSyncKey(key)) {
        toReset.push(key);
      }
    }
    for (let key of toReset) {
      storeAndPropagate(key, null);
    }
    for (const key in items) {
      if (!key.includes(":")) {
        storeAndPropagate(key, items[key], items);
      }
    }
    Settings_.postUpdate_("vimSync");
    BgUtils_.timeout_(4, () => { --kSources || resolve(); });
    restoringPromise &&
    log("sync.cloud: download settings to localStorage");
  }
  Settings_.restore_ = () => {
    if (restoringPromise) { /* empty */ }
    else if (!localStorage.length) {
      BgUtils_.GC_();
      // eslint-disable-next-line arrow-body-style
      restoringPromise = BgUtils_.require_("KeyMappings").then(_ => {
        return new Promise<void>(resolve => {
          cachedSync ? storage().get(items => {
            const err = BgUtils_.runtimeError_();
            err ? (Settings_.restore_ = null, resolve()) : beginToRestore(items, 1, resolve);
            return err;
          }) : beginToRestore({}, 2, resolve);
        })
      }).then(_ => { restoringPromise = null })
    } else {
      return null;
    }
    return restoringPromise;
  };
  if (cachedSync === false || !cachedSync && !Settings_.temp_.hasEmptyLocalStorage_) {
    let doBackup = Settings_.temp_.backupSettingsToLocal_;
    Settings_.temp_.backupSettingsToLocal_ = doBackup ? null : saveAllToLocal;
    doBackup && saveAllToLocal(6000);
    Settings_.sync_ = SetLocal;
    return;
  }
  BgUtils_.GC_();
  if (!storage()) { Settings_.restore_ = null; return }
  storage().get(items => {
    const err = BgUtils_.runtimeError_();
    if (err) {
      log("Error: failed to get storage:", err, "\n\tSo disable syncing temporarily.");
      Settings_.updateHooks_.vimSync = Settings_.sync_ = BgUtils_.blank_;
      Settings_.restore_ = null;
      return err;
    }
    restoringPromise = Promise.resolve();
    restoringPromise = new Promise(r => beginToRestore(items, 3, r)).then<void>(_ => { restoringPromise = null; });
  });
});

BgUtils_.timeout_(150, function (): void {
  const browserAction = chrome.browserAction;
  if (!browserAction) { return; }
  let imageData: IconNS.StatusMap<IconNS.IconBuffer> | null, tabIds: IconNS.StatusMap<number[]> & SafeObject | null;
  let mayShowIcons = true;
  const func = Settings_.updateHooks_.showActionIcon,
  onerror = (err: any): void => {
      if (!mayShowIcons) { return; }
      mayShowIcons = false;
      console.log("Can not access binary icon data:", err);
      Backend_.setIcon_ = BgUtils_.blank_;
      browserAction.setTitle({ title: "Vimium C\n\nFailed in showing dynamic icons." });
  },
  loadBinaryImagesAndSetIcon = (type: Frames.ValidStatus): void => {
      const path = Settings_.icons_[type] as IconNS.BinaryPath;
      const loadFromRawArray = (array: ArrayBuffer): void => {
      const uint8Array = new Uint8ClampedArray(array), firstSize = array.byteLength / 5,
      small = (Math.sqrt(firstSize / 4) | 0) as IconNS.ValidSizes, large = (small + small) as IconNS.ValidSizes,
      cache = BgUtils_.safeObj_() as IconNS.IconBuffer;
      cache[small] = new ImageData(uint8Array.subarray(0, firstSize), small, small);
      cache[large] = new ImageData(uint8Array.subarray(firstSize), large, large);
      imageData![type] = cache;
      const arr = tabIds![type]!;
      delete tabIds![type];
      for (let w = 0, h = arr.length; w < h; w++) {
        Backend_.setIcon_(arr[w], type, true);
      }
      };
      if (Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
          || CurCVer_ >= BrowserVer.MinFetchExtensionFiles) {
        const p = fetch(path).then(r => r.arrayBuffer()).then(loadFromRawArray);
        if (!Build.NDEBUG) { p.catch(onerror); }
      } else {
        const req = new XMLHttpRequest() as ArrayXHR;
        req.open("GET", path, true);
        req.responseType = "arraybuffer";
        if (!Build.NDEBUG) { req.onerror = onerror; }
        req.onload = function (this: typeof req) { loadFromRawArray(this.response); };
        req.send();
      }
  };
  Settings_.temp_.IconBuffer_ = function (this: void, enabled?: boolean): boolean | void {
    if (enabled == null) { return !!imageData; }
    if (!enabled) {
      imageData && setTimeout(function () {
        if (Settings_.get_("showActionIcon")) { return; }
        imageData = null;
        if (Build.BTypes & BrowserType.Chrome) { tabIds = null; }
        if (Build.BTypes & ~BrowserType.Chrome
            && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
          const ref2 = Backend_.indexPorts_();
          for (const tabId in ref2) {
            if (ref2[+tabId]![0].s.s !== Frames.Status.enabled) {
              Backend_.setIcon_(+tabId, Frames.Status.enabled);
            }
          }
          return;
        }
      }, 200);
      return;
    }
    if (imageData) { return; }
    if (!(Build.BTypes & BrowserType.Chrome)) {
      imageData = 1 as unknown as IconNS.StatusMap<IconNS.IconBuffer>;
    } else {
      imageData = [null, null, null];
      tabIds = BgUtils_.safeObj_();
    }
    // only do partly updates: ignore "rare" cases like `sender.s` is enabled but the real icon isn't
    const ref = Backend_.indexPorts_();
    for (const tabId in ref) {
      const sender = ref[+tabId]![0].s;
      if (sender.s !== Frames.Status.enabled) {
        Backend_.setIcon_(sender.t, sender.s);
      }
    }
  } as IconNS.AccessIconBuffer;
  Backend_.setIcon_ = function (this: void, tabId: number, type: Frames.ValidStatus, isLater?: true): void {
    /** Firefox does not use ImageData as inner data format
     * * https://dxr.mozilla.org/mozilla-central/source/toolkit/components/extensions/schemas/manifest.json#577
     *   converts ImageData objects in parameters into data:image/png,... URLs
     * * https://dxr.mozilla.org/mozilla-central/source/browser/components/extensions/parent/ext-browserAction.js#483
     *   builds a css text of "--webextension-***: url(icon-url)",
     *   and then set the style of an extension's toolbar button to it
     */
    if (Build.BTypes & ~BrowserType.Chrome
        && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
      browserAction.setIcon({ tabId, path: Settings_.icons_[type]! });
      return;
    }
    let data: IconNS.IconBuffer | null | undefined;
    if (data = imageData![type]) {
      const f = browserAction.setIcon, args: chrome.browserAction.TabIconDetails = {
        tabId,
        imageData: data
      };
      isLater ? f(args, BgUtils_.runtimeError_) : f(args);
    } else if (tabIds![type]) {
      tabIds![type]!.push(tabId);
    } else {
      setTimeout(loadBinaryImagesAndSetIcon, 0, type);
      tabIds![type] = [tabId];
    }
  };
  Settings_.updateHooks_.showActionIcon = function (value): void {
    func(value);
    Settings_.temp_.IconBuffer_!(value);
    let title = trans_("name");
    value || (title += "\n\n" + trans_("noActiveState"));
    browserAction.setTitle({ title });
  };
  Settings_.postUpdate_("showActionIcon");
});

BgUtils_.timeout_(600, function (): void {
  const omnibox = chrome.omnibox;
  if (!omnibox) { return; }
  type OmniboxCallback = (this: void, suggestResults: chrome.omnibox.SuggestResult[]) => true | void;
  const enum FirstSugType {
    Default = 0,
    defaultOpen = 1, search, plainOthers
  }
  interface SuggestCallback {
    suggest_: OmniboxCallback | null;
    sent_: boolean;
    key_: string;
  }
  interface SubInfo {
    type_?: "history" | "tab";
    sessionId_?: number | string;
  }
  type SubInfoMap = SafeDict<SubInfo>;
  const onDel = (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox)
      ? omnibox.onDeleteSuggestion : null,
  mayDelete = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
      || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox)
          && !!onDel && typeof onDel.addListener === "function";
  let last: string | null = null, firstResultUrl = "", lastSuggest: SuggestCallback | null = null
    , timer = 0, subInfoMap: SubInfoMap | null = null
    , maxChars = OmniboxData.DefaultMaxChars
    , suggestions: chrome.omnibox.SuggestResult[] | null = null, cleanTimer = 0, inputTime: number
    , defaultSuggestionType = FirstSugType.Default, matchType: CompletersNS.MatchType = CompletersNS.MatchType.Default
    , matchedSugTypes = CompletersNS.SugType.Empty;
  const
  maxResults = !(Build.BTypes & ~BrowserType.Firefox)
    || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
    || Build.MinCVer < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12
      && Build.BTypes & BrowserType.Chrome
      && CurCVer_ < BrowserVer.MinOmniboxUIMaxAutocompleteMatchesMayBe12 ? 6 : 12
  ;
  function clean(): void {
    if (lastSuggest) { lastSuggest.suggest_ = null; }
    subInfoMap = suggestions = lastSuggest = last = null;
    if (cleanTimer) { clearTimeout(cleanTimer); }
    if (timer) { clearTimeout(timer); }
    inputTime = matchType = matchedSugTypes = cleanTimer = timer = 0;
    firstResultUrl = "";
    BgUtils_.resetRe_();
  }
  function tryClean(): void {
    const delta = Date.now() - inputTime; // safe for time changes
    if (delta > 5000 || delta < -GlobalConsts.ToleranceOfNegativeTimeDelta) {
      return clean();
    }
    cleanTimer = setTimeout(tryClean, 30000);
  }
  function onTimer(): void {
    timer = 0;
    const arr = lastSuggest;
    if (!arr || arr.sent_) { return; }
    lastSuggest = null;
    if (arr.suggest_) {
      const now = Date.now(); // safe for time changes
      if (now < inputTime) {
        inputTime = now - 1000;
      }
      return onInput(arr.key_, arr.suggest_);
    }
  }
  function onComplete(this: null, suggest: SuggestCallback, response: Suggestion[]
      , autoSelect: boolean, newMatchType: CompletersNS.MatchType, newMatchedSugTypes: CompletersNS.SugType): void {
// Note: in https://chromium.googlesource.com/chromium/src/+/master/chrome/browser/autocomplete/keyword_extensions_delegate_impl.cc#167 ,
// the block of `case extensions::NOTIFICATION_EXTENSION_OMNIBOX_SUGGESTIONS_READY:`
//   always refuses suggestions from old input_ids
    if (!suggest.suggest_) {
      lastSuggest === suggest && (lastSuggest = null);
      return;
    }
    lastSuggest = null;
    let notEmpty = response.length > 0, sug: Suggestion = notEmpty ? response[0] : null as never
      , defaultDesc: string | undefined, info: SubInfo = {};
    matchType = newMatchType;
    matchedSugTypes = newMatchedSugTypes;
    if (notEmpty
        && (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
            || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && mayDelete
            || response[0].s != null)) {
      subInfoMap = BgUtils_.safeObj_<SubInfo>();
    }
    suggestions = [];
    const urlDict = BgUtils_.safeObj_<number>();
    for (let i = 0, di = autoSelect ? 0 : 1, len = response.length; i < len; i++) {
      let sugItem = response[i], { title, u: url, e: type } = sugItem, tail = "", hasSessionId = sugItem.s != null
        , canBeDeleted = (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
              || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && mayDelete)
            && !(autoSelect && i === 0) && (
          type === "tab" ? sugItem.s !== TabRecency_.curTab_ : type === "history" && !hasSessionId
        );
      if (url in urlDict) {
        url = `:${i + di} ` + url;
      } else {
        urlDict[url] = 1;
      }
      if (canBeDeleted) {
        info.type_ = <SubInfo["type_"]> type;
        tail = ` ~${i + di}~`;
      }
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        tail = sugItem.textSplit! + (title && " - " + title) + tail;
      } else {
        tail = title ? `</url><dim> - ${title}${tail}</dim>` : tail ? `</url><dim>${tail}</dim>` : "</url>";
        tail = "<url>" + sugItem.textSplit! + tail;
      }
      const msg: chrome.omnibox.SuggestResult = { content: url, description: tail };
      canBeDeleted && (msg.deletable = true);
      hasSessionId && (info.sessionId_ = sugItem.s!);
      if (canBeDeleted || hasSessionId) {
        subInfoMap![url] = info;
        info = {};
      }
      suggestions.push(msg);
    }
    last = suggest.key_;
    if (!autoSelect) {
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        defaultDesc = "Open: <input>";
      } else if (defaultSuggestionType !== FirstSugType.defaultOpen) {
        defaultDesc = "<dim>Open: </dim><url>%s</url>";
        defaultSuggestionType = FirstSugType.defaultOpen;
      }
    } else if (sug.e === "search") {
      let text = (sug as CompletersNS.SearchSuggestion).p;
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        defaultDesc = (text && `${text} - `) + sug.textSplit!;
      } else {
        defaultDesc = (text && `<dim>${BgUtils_.escapeText_(text)} - </dim>`) + `<url>${sug.textSplit}</url>`;
      }
      defaultSuggestionType = FirstSugType.search;
      if (sug = response[1]) {
        switch (sug.e) {
        case "math":
          suggestions[1].description = Build.BTypes & BrowserType.Firefox
                && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
              ? sug.textSplit! + " = " + sug.t
              : `<dim>${sug.textSplit} = </dim><url><match>${sug.t}</match></url>`;
          break;
        }
      }
    } else {
      defaultSuggestionType = FirstSugType.plainOthers;
      defaultDesc = suggestions[0].description;
    }
    if (autoSelect) {
      firstResultUrl = response[0].u;
      suggestions.shift();
    }
    defaultDesc && chrome.omnibox.setDefaultSuggestion({ description: defaultDesc });
    suggest.suggest_(suggestions);
    BgUtils_.resetRe_();
    return;
  }
  function onInput(this: void, key: string, suggest: OmniboxCallback): void {
    key = key.trim().replace(BgUtils_.spacesRe_, " ");
    if (lastSuggest) {
      let same = key === lastSuggest.key_;
      lastSuggest.suggest_ = same ? suggest : null;
      if (same) {
        return;
      }
    }
    if (key === last) {
      suggestions && suggest(suggestions);
      return;
    }
    if (matchType === CompletersNS.MatchType.emptyResult && key.startsWith(last!)) {
      // avoid Chrome showing results from its inner search engine because of `suggest` being destroyed
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        // note: firefox always uses a previous version of "default suggestion" for `current` query
        // which is annoying, so here should not show dynamic content;
        // in other cases like searching, do show the real result to provide as much info as possible
        chrome.omnibox.setDefaultSuggestion({ description: "Open: <input>" });
      }
      suggest([]);
      return;
    }
    lastSuggest = { suggest_: suggest, key_: key, sent_: false };
    if (timer) { return; }
    const now = Date.now(),
    delta = Settings_.omniPayload_.t + inputTime - now; /** it's made safe by {@see #onTimer} */
    if (delta > 30 && delta < 3000) { // in case of system time jumping
      timer = setTimeout(onTimer, delta);
      return;
    }
    lastSuggest.sent_ = true;
    cleanTimer || (cleanTimer = setTimeout(tryClean, 30000));
    inputTime = now;
    subInfoMap = suggestions = null; firstResultUrl = "";
    const type: SugType = matchType < MatchType.someMatches || !key.startsWith(last!) ? SugType.Empty
      : matchType === MatchType.searchWanted ? !key.includes(" ") ? SugType.search : SugType.Empty
      : matchedSugTypes;
    Completion_.filter_(key
      , { o: "omni", t: type, r: maxResults, c: maxChars, f: CompletersNS.QueryFlags.AddressBar }
      , onComplete.bind(null, lastSuggest));
  }
  function onEnter(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition): void {
    const arr = lastSuggest;
    if (arr && arr.suggest_) {
      arr.suggest_ = onEnter.bind(null, text, disposition);
      if (arr.sent_) { return; }
      timer && clearTimeout(timer);
      return onTimer();
    }
    text = text.trim().replace(BgUtils_.spacesRe_, " ");
    if (last === null && text) {
      // need a re-computation
      // * may has been cleaned, or
      // * search `v `"t.e abc", and then input "t.e abc", press Down to select `v `"t.e abc", and then press Enter
      return Completion_.filter_(text
          , { o: "omni", t: SugType.Empty, r: 3, c: maxChars, f: CompletersNS.QueryFlags.AddressBar }
          , function (sugs, autoSelect): void {
        return autoSelect ? open(sugs[0].u, disposition, sugs[0].s) : open(text, disposition);
      });
    }
    if (firstResultUrl && text === last) { text = firstResultUrl; }
    const sessionId = subInfoMap && subInfoMap[text] && subInfoMap[text]!.sessionId_;
    clean();
    return open(text, disposition, sessionId);
  }
  function open(this: void, text: string, disposition?: chrome.omnibox.OnInputEnteredDisposition
      , sessionId?: string | number | null): void {
    if (!text) {
      text = BgUtils_.convertToUrl_("");
    } else if (text[0] === ":" && (<RegExpOne> /^:([1-9]|1[0-2]) /).test(text)) {
      text = text.slice(text[2] === " " ? 3 : 4);
    }
    if (text.slice(0, 7).toLowerCase() === "file://") {
      text = BgUtils_.showFileUrl_(text);
    }
    return sessionId != null ? Backend_.reqH_[kFgReq.gotoSession]({ s: sessionId })
        : Backend_.reqH_[kFgReq.openUrl]({
      u: text,
      r: (disposition === "currentTab" ? ReuseType.current
        : disposition === "newForegroundTab" ? ReuseType.newFg : ReuseType.newBg)
    }, null as never as Frames.Port);
  }
  omnibox.onInputStarted.addListener(function (): void {
    chrome.windows.getCurrent(function (wnd?: chrome.windows.Window): void {
      const width = wnd && wnd.width;
      maxChars = width
        ? Math.floor((width - OmniboxData.MarginH / devicePixelRatio) / OmniboxData.MeanWidthOfChar)
        : OmniboxData.DefaultMaxChars;
    });
    if (cleanTimer) {
      return clean();
    }
  });
  omnibox.onInputChanged.addListener(onInput);
  omnibox.onInputEntered.addListener(onEnter);
  (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinOmniboxSupportDeleting
    || (Build.BTypes & ~BrowserType.Firefox || Build.DetectAPIOnFirefox) && mayDelete) &&
  onDel!.addListener(function (text): void {
    // eslint-disable-next-line radix
    const ind = parseInt(text.slice(text.lastIndexOf("~", text.length - 2) + 1)) - 1;
    let url = suggestions && suggestions[ind].content, info = url && subInfoMap && subInfoMap[url] || null,
    type = info && info.type_;
    if (!type) {
      console.log("Error: want to delete a suggestion but no related info found (may spend too long before deleting).");
      return;
    }
    if (url![0] === ":") {
      url = url!.slice(url!.indexOf(" ") + 1);
    }
    return Backend_.removeSug_({ t: type, u: type === "tab" ? info!.sessionId_ as string : url! });
  });
});

declare const enum I18nConsts {
  storageKey = "i18n_f",
}
if (Build.BTypes & BrowserType.Firefox
    && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
setTimeout(function (loadI18nPayload: () => void): void {
  const nativeTrans = trans_, lang2 = nativeTrans("lang2"), lang1 = trans_("lang1"),
  i18nVer = `${lang2 || lang1 || "en"},${Settings_.CONST_.VerCode_},`,
  // eslint-disable-next-line arrow-body-style
  newTrans: typeof chrome.i18n.getMessage = (messageName, substitutions): string => {
    return i18nKeys.has(messageName) ? nativeTrans(messageName, substitutions) : "";
  };
  let oldStr = localStorage.getItem(I18nConsts.storageKey), keyArrays: string[] = [], i18nKeys: Set<string>, toDos = 0,
  fixTrans = (updateCache: BOOL): void => {
    i18nKeys = new Set!<string>(keyArrays);
    trans_ = newTrans;
    keyArrays = fixTrans = null as never;
    if (updateCache) {
      localStorage.setItem(I18nConsts.storageKey, i18nVer + [...(i18nKeys as any)].join(","));
    }
    Settings_.temp_.loadI18nPayload_ = loadI18nPayload;
  };
  if (oldStr && oldStr.startsWith(i18nVer)) {
    keyArrays = oldStr.slice(i18nVer.length).split(",");
    fixTrans(0);
    return;
  }
  const onload = (messages: Dict<{ message: string }>): void => {
    keyArrays = keyArrays.concat(Object.keys(messages));
    if (0 === --toDos) {
      fixTrans(1);
    }
  };
  for (const langName of new Set!<string>(["en", lang1, lang2]) as any) {
    if (langName) {
      fetch(`/_locales/${langName}/messages.json`).then(r => r.json<Dict<any>>()).then(onload);
      toDos++;
    }
  }
}, 33, Settings_.temp_.loadI18nPayload_!);
Settings_.temp_.loadI18nPayload_ = null;
}

// According to tests: onInstalled will be executed after 0 ~ 16 ms if needed
chrome.runtime.onInstalled.addListener(Settings_.temp_.onInstall_ =
function (details: chrome.runtime.InstalledDetails): void {
  let reason = details.reason;
  if (reason === "install") { reason = ""; }
  else if (reason === "update") { reason = details.previousVersion!; }
  else { return; }
  if (Settings_.temp_.onInstall_) {
    chrome.runtime.onInstalled.removeListener(Settings_.temp_.onInstall_)
    Settings_.temp_.onInstall_ = null
  } else {
    return
  }

  BgUtils_.timeout_(500, function (): void {
  Build.BTypes & ~BrowserType.Firefox &&
  (!(Build.BTypes & BrowserType.Firefox) || OnOther !== BrowserType.Firefox) &&
  chrome.tabs.query({
    status: "complete"
  }, function (tabs) {
    const t = chrome.tabs, callback = BgUtils_.runtimeError_,
    allowedRe = <RegExpOne> /^(file|ftps?|https?):/,
    offset = location.origin.length, js = Settings_.CONST_.ContentScripts_;
    for (let _i = tabs.length, _len = js.length - 1; 0 <= --_i; ) {
      if (!allowedRe.test(tabs[_i].url)) { continue; }
      let tabId = tabs[_i].id;
      for (let _j = 0; _j < _len; ++_j) {
        t.executeScript(tabId, {file: js[_j].slice(offset), allFrames: true}, callback);
      }
    }
  });
  function now(): string {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60).toJSON().slice(0, -5).replace("T", " ")
  }
  console.log("%cVimium C%c has been %cinstalled%c with %o at %c%s%c.", "color:red", "color:auto"
    , "color:#0c85e9", "color:auto", details, "color:#0c85e9", now(), "color:auto");

  if (Settings_.CONST_.DisallowIncognito_) {
    console.log("Sorry, but some commands of Vimium C require the permission to run in incognito mode.");
  }

  if (!reason) {
    const p = Settings_.restore_ && Settings_.restore_() || Promise.resolve()
    p.then(() => {
      Backend_.reqH_[kFgReq.focusOrLaunch]({ u: Settings_.CONST_.OptionsPage_ + (Build.NDEBUG ? "#commands" : "#installed") })
    })
    return
  }
  if (parseFloat(Settings_.CONST_.VerCode_) <= parseFloat(reason)) { return; }

  const ref1 = Settings_.temp_;
  if (ref1.backupSettingsToLocal_) {
    (ref1.backupSettingsToLocal_ as Exclude<typeof ref1.backupSettingsToLocal_, true | null>)(6000);
  } else {
    ref1.backupSettingsToLocal_ = true;
  }

  if (!Settings_.get_("notifyUpdate")) { return; }

  reason = "vimium_c-upgrade-notification";
  const args: chrome.notifications.NotificationOptions = {
    type: "basic",
    iconUrl: location.origin + "/icons/icon128.png",
    title: "Vimium C " + trans_("Upgrade"),
    message: trans_("upgradeMsg", [Settings_.CONST_.VerName_]) + trans_("upgradeMsg2")
        + "\n\n" + trans_("clickForMore")
  };
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$NotificationOptions$$isClickable$IsDeprecated
      && CurCVer_ < BrowserVer.Min$NotificationOptions$$isClickable$IsDeprecated) {
    args.isClickable = true; // not supported on Firefox
  }
  if (Build.BTypes & BrowserType.Chrome
      && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
      && CurCVer_ >= BrowserVer.Min$NotificationOptions$$silent) {
    args.silent = true;
  }
  chrome.notifications && chrome.notifications.create(reason, args, function (notificationId): void {
    let err: any;
    if (err = BgUtils_.runtimeError_()) { return err; }
    reason = notificationId || reason;
    chrome.notifications.onClicked.addListener(function (id): void {
      if (id !== reason) { return; }
      chrome.notifications.clear(reason);
      Backend_.reqH_[kFgReq.focusOrLaunch]({
        u: BgUtils_.convertToUrl_("vimium://release")
      });
    });
  });
  });
});

BgUtils_.GC_ = function (inc0?: number): void {
  /**
   * GC should work as a "robust" debouncing function,
   * which means `later` should never be called in the next real-world time period after once GC().
   * As a result, `Date.now` is not strong enough, so a frequent `clearTimeout` is necessary.
   */
  let now = 0, timeout = 0, referenceCount = 0;
  BgUtils_.GC_ = function (inc?: number): void {
    inc && (referenceCount = referenceCount + inc > 0 ? referenceCount + inc : 0);
    if (referenceCount > 0 || !KeyMappings) {
      if (timeout) { clearTimeout(timeout); timeout = 0; }
      return;
    }
    now = performance.now();
    timeout = timeout || setTimeout(later, GlobalConsts.TimeoutToReleaseBackendModules);
  };
  return BgUtils_.GC_(inc0);
  function later(): void {
    if (Math.abs(performance.now() - now) < GlobalConsts.ToleranceForTimeoutToGC) {
      timeout = setTimeout(later, GlobalConsts.TimeoutToReleaseBackendModules);
      return;
    }
    timeout = 0;
    const hook = Settings_.updateHooks_;
    if (KeyMappings) {
      hook.keyMappings = null as never;
      KeyMappings = null as never;
    }
  }
};

BgUtils_.timeout_(1200, function (): void {
  Settings_.temp_.onInstall_ && chrome.runtime.onInstalled.removeListener(Settings_.temp_.onInstall_);
  Settings_.temp_.onInstall_ = null;
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSetInnerTextOnHTMLHtmlElement) {
    (document.documentElement as HTMLHtmlElement).innerHTML = "";
  } else {
    (document.documentElement as HTMLHtmlElement).innerText = "";
  }
  BgUtils_.resetRe_();
  if (!Build.NDEBUG) {
    interface WindowExForDebug extends Window { a: unknown; cb: (i: any) => void }
    (window as WindowExForDebug).a = null;
    (window as WindowExForDebug).cb = function (b) { (window as WindowExForDebug).a = b; console.log("%o", b); };
  }
});
