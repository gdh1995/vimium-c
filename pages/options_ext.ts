$<ElementWithDelay>("#showCommands").onclick = function (event): void {
  if (!window.VDom || !VDom.cache_) { return; }
  let node: HTMLElement | null, root = VCui.root_;
  event && event.preventDefault();
  if (!root) { /* empty */ }
  else if (node = root.querySelector("#HClose") as HTMLElement | null) {
    const isCommand = root.querySelector(".HelpCommandName") != null;
    click(node);
    if (isCommand) { return; }
  }
  VApi.post_({ H: kFgReq.initHelp });
  if (event) { return; }
  setTimeout(function (): void {
    const node2 = VCui.root_ && VCui.root_.querySelector("#HelpDialog") as HTMLElement;
    if (!node2) { return; }
    (node2.querySelector("#HClose") as HTMLElement).addEventListener("click", function (): void {
      location.hash = "";
    });
  }, 100);
};

ExclusionRulesOption_.prototype.sortRules_ = function (this: ExclusionRulesOption_
    , element?: HTMLElement): void {
  interface Rule extends ExclusionsNS.StoredRule {
    key_: string;
  }
  if (element && this.timer_) { return; }
  const rules = this.readValueFromElement_() as Rule[],
  hostRe = <RegExpOne> /^([:^]?[a-z\-?*]+:\/\/)?((?:[^\/]|\/])+)(\/[^\]].*|\/?$)/,
  escapedDotRe = <RegExpG> /\\\./g;
  let key: Rule["pattern"], arr: string[] | null;
  for (const rule of rules) {
    if ((arr = hostRe.exec(key = rule.pattern.replace("(?:[^./]+\\.)*?", "*."))) && arr[1] && arr[2]) {
      key = arr[3] ? arr[3].replace(escapedDotRe, ".") : "";
      arr = arr[2].replace(escapedDotRe, ".").split(".");
      arr.reverse();
      key = arr.join(".") + key;
    }
    rule.key_ = key;
  }
  rules.sort((a, b) => a.key_ < b.key_ ? -1 : a.key_ === b.key_ ? 0 : 1);
  this.populateElement_(rules);
  this.onUpdated_();
  if (!element) { return; }
  let self = this;
  this.timer_ = setTimeout(function (el, text) {
    (el.firstChild as Text).data = text, self.timer_ = 0;
  }, 1000, element, (element.firstChild as Text).data);
  (element.firstChild as Text).data = pTrans_("o3_2");
};

$("#exclusionSortButton").onclick = function (): void {
  return (Option_.all_.exclusionRules as ExclusionRulesOption_).sortRules_(this);
};

function formatDate_(time: number | Date): string {
  return new Date(+time - new Date().getTimezoneOffset() * 1000 * 60
    ).toJSON().slice(0, 19).replace("T", " ");
}

interface ExportedSettings {
  name: "Vimium C";
  author?: string;
  description?: string;
  time?: number;
  environment?: {
    chrome?: number;
    extension?: string;
    platform?: string;
  };
  findModeRawQueryList?: never;
  [key: string]: any;
}

let _lastBlobURL = "";

window.addEventListener("unload", function (): void {
  _lastBlobURL && URL.revokeObjectURL(_lastBlobURL);
});

$<ElementWithDelay>("#exportButton").onclick = function (event): void {
  if (_lastBlobURL) {
    URL.revokeObjectURL(_lastBlobURL);
    _lastBlobURL = "";
  }
  let exported_object: ExportedSettings | null;
  const all_static = event ? event.ctrlKey || event.metaKey || event.shiftKey : false;
  const d = new Date();
  exported_object = Object.create(null) as ExportedSettings & SafeObject;
  exported_object.name = "Vimium C";
  if (!all_static) {
    exported_object["@time"] = d.toLocaleString();
    exported_object.time = d.getTime();
  }
  exported_object.environment = {
    extension: bgSettings_.CONST_.VerCode_,
    platform: bgSettings_.CONST_.Platform_
  };
  if (Build.BTypes & BrowserType.Chrome
      && (!(Build.BTypes & ~BrowserType.Chrome) || bgOnOther_ === BrowserType.Chrome)) {
    exported_object.environment.chrome = bgBrowserVer_;
  }
  const storedKeys: Array<keyof SettingsNS.PersistentSettings> = [],
  storage = localStorage, all = bgSettings_.defaults_;
  for (let i = 0, len = storage.length; i < len; i++) {
    const key = storage.key(i) as string;
    if (!key.includes("|") && !key.endsWith("_f")
        && key !== "findModeRawQueryList"
        && !key.endsWith("CSS") // ignore innerCSS, findCSS, omniCSS
    ) {
      storedKeys.push(key as keyof SettingsNS.PersistentSettings);
    }
  }
  storedKeys.sort();
  for (const key of storedKeys) {
    const storedVal = storage.getItem(key) as string;
    if (typeof all[key] !== "string") {
      exported_object[key] = (key in all) ? bgSettings_.get_(key) : storedVal;
    } else if (storedVal.includes("\n")) {
      (exported_object[key] = storedVal.split("\n")).push("");
    } else {
      exported_object[key] = storedVal;
    }
  }
  let exported_data = JSON.stringify(exported_object, null, "\t"), d_s = formatDate_(d);
  if (exported_object.environment.platform === "win") {
    // in case "endings" didn't work
    exported_data = exported_data.replace(<RegExpG> /\n/g, "\r\n");
  }
  exported_object = null;
  let file_name = "vimium_c-";
  if (all_static) {
    file_name += "settings";
  } else {
    file_name += d_s.replace(<RegExpG> /[\-:]/g, "").replace(" ", "_");
  }
  file_name += ".json";
  const blob = new Blob([exported_data], {type: "application/json", endings: "native"});

  type BlobSaver = (blobData: Blob, fileName: string) => any;
  interface NavigatorEx extends Navigator { msSaveOrOpenBlob?: BlobSaver }
  if (Build.BTypes & BrowserType.Edge && (navigator as NavigatorEx).msSaveOrOpenBlob) {
    (navigator as NavigatorEx & {msSaveOrOpenBlob: BlobSaver}).msSaveOrOpenBlob(blob, file_name);
  } else {
    const nodeA = document.createElement("a");
    nodeA.download = file_name;
    nodeA.href = URL.createObjectURL(blob);
    click(nodeA);
    // not `URL.revokeObjectURL(nodeA.href);` so that it works almost all the same
    // on old Chrome before BrowserVer.MinCanNotRevokeObjectURLAtOnce
    _lastBlobURL = nodeA.href;
  }
  console.info("EXPORT settings to %c%s%c at %c%s%c."
    , "color:darkred", file_name, "color:auto", "color:darkblue", d_s, "color:auto");
};

function _importSettings(time: number, new_data: ExportedSettings, is_recommended?: boolean): void {
  let env = new_data.environment, plat = env && env.platform || ""
    , ext_ver = env && parseFloat(env.extension || 0) || 0
    , newer = ext_ver > parseFloat(bgSettings_.CONST_.VerCode_);
  plat && (plat = ("" + plat).slice(0, 10));
  if (!confirm(pTrans_("confirmImport", [
        pTrans_(is_recommended !== true ? "backupFile" : "recommendedFile"),
        ext_ver > 1 ? pTrans_("fileVCVer").replace("*", "" + ext_ver) : "",
        (ext_ver > 1 ? pTrans_("fileVCVer_2").replace("*", "" + ext_ver) : "") + (newer ? pTrans_("fileVCNewer") : ""),
        plat ? pTrans_("filePlatform", [pTrans_(plat) || plat[0].toUpperCase() + plat.slice(1)])
          : pTrans_("commonPlatform"),
        time ? pTrans_("atTime", [formatDate_(time)]) : pTrans_("before")]))) {
    window.VHud && VHud.tip_(kTip.cancelImport, 1000);
    return;
  }
  const setProto_old_cr = Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf
      && Build.BTypes & BrowserType.Chrome ? Object.setPrototypeOf : 0 as never as null;
  if (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome) {
    setProto_old_cr ? setProto_old_cr(new_data, null) : ((new_data as any).__proto__ = null);
  } else {
    Object.setPrototypeOf(new_data, null);
  }
  if (new_data.vimSync == null) {
    const now = bgSettings_.get_("vimSync"), keep = now && confirm(pTrans_("keepSyncing"));
    new_data.vimSync = keep || null;
    if (now) {
      console.log("Before importing: You chose to", keep ? "keep settings synced." : "stop syncing settings.");
    }
    // if `new_data.vimSync` was undefined, then now it's null
    // this is useful, in case the below "iterating over localStorage and setting-null" was changed
  }

  const logUpdate = function (method: string, key: string, a2: string | any, a3?: any): any {
    let hasA3 = arguments.length > 3, val = hasA3 ? a3 : a2, args = ["%s %c%s", method, "color:darkred", key];
    val = typeof val !== "string" || val.length <= 72 ? val
      : val.slice(0, 71).trimRight() + "\u2026";
    hasA3 && args.push(a2);
    args.push(val);
    console.log(...args);
  } as {
    (method: string, key: string, val: any): any;
    (method: string, key: string, actionName: string, val: any): any;
  };
  if (time > 10000) {
    console.info("IMPORT settings saved at %c%s%c.", "color:darkblue", formatDate_(time), "color:auto");
  } else {
    console.info("IMPORT settings:", is_recommended ? "recommended." : "saved before.");
  }

  const delKeys = (keys: string): void => keys.split(" ").forEach(k => delete new_data[k]);
  delKeys("name time environment author description");
  for (let key in new_data) {
    if (key[0] === "@") {
      delete new_data[key];
    }
  }

  const storage = localStorage, all = bgSettings_.defaults_, _ref = Option_.all_,
  otherLineEndRe = <RegExpG> /\r\n?/g;
  for (let i = storage.length; 0 <= --i; ) {
    const key = storage.key(i) as string;
    if (key.includes("|")) { continue; }
    if (!(key in new_data)) {
      new_data[key] = null;
    }
  }
  delKeys("findModeRawQuery findModeRawQueryList innerCSS findCSS omniCSS newTabUrl_f hookAccessKeys vomnibarPage_f");
  if (Build.BTypes & BrowserType.Firefox) {
    delKeys("i18n_f");
  }
  for (let key in bgSettings_.legacyNames_) {
    if (key in new_data) {
      new_data[bgSettings_.legacyNames_[key as keyof SettingsNS.LegacyNames]] = new_data[key];
      delete new_data[key];
    }
  }
  if (new_data.vimSync !== bgSettings_.get_("vimSync")) {
    logUpdate("import", "vimSync", new_data.vimSync);
    bgSettings_.set_("vimSync", new_data.vimSync);
    _ref.vimSync.fetch_();
  }
  { // delay the update of keyMappings
    const tmp1 = _ref.keyMappings;
    if (tmp1 !== undefined) {
      delete _ref.keyMappings;
      _ref.keyMappings = tmp1;
    }
  }
  for (const _key in _ref) {
    const item: Option_<any> = _ref[_key as keyof AllowedOptions];
    let key: keyof AllowedOptions = item.field_, new_value: any = new_data[key];
    delete new_data[key];
    if (new_value == null) {
      // NOTE: we assume all nullable settings have the same default value: null
      new_value = all[key];
    } else {
      if (typeof all[key] === "string") {
        if (new_value instanceof Array) {
          new_value = new_value.join("\n").trimRight();
        }
        new_value = new_value.replace(otherLineEndRe, "\n");
      }
      new_value = item.normalize_(new_value, typeof all[key] === "object");
    }
    if (!item.areEqual_(bgSettings_.get_(key), new_value)) {
      logUpdate("import", key, new_value);
      bgSettings_.set_(key, new_value);
      if (key in bgSettings_.valuesToLoad_) {
        Option_.syncToFrontend_.push(key as keyof SettingsNS.FrontendSettings);
      }
      item.fetch_();
      item.onSave_ && item.onSave_();
    } else if (item.saved_) {
      continue;
    } else {
      item.fetch_();
    }
  }
  for (const key in new_data) {
    let new_value = new_data[key];
    type SettingKeys = keyof SettingsNS.SettingsWithDefaults;
    if (new_value == null) {
      if (key in all) {
        new_value = all[key as SettingKeys];
        if (bgSettings_.get_(key as SettingKeys) !== new_value) {
          bgSettings_.set_(key as SettingKeys, new_value);
          logUpdate("reset", key, new_value);
          continue;
        }
        new_value = bgSettings_.get_(key as SettingKeys);
      } else {
        new_value = storage.getItem(key as SettingKeys);
      }
      storage.removeItem(key as SettingKeys);
      logUpdate("remove", key, ":=", new_value);
      continue;
    }
    if (typeof all[key as SettingKeys] === "string") {
      if (new_value instanceof Array) {
        new_value = new_value.join("\n").trimRight();
      }
      new_value = new_value.replace(otherLineEndRe, "\n");
    }
    if (key in all) {
      if (bgSettings_.get_(key as SettingKeys) !== new_value) {
        bgSettings_.set_(key as SettingKeys, new_value);
        logUpdate("update", key, new_value);
      }
    } else {
      storage.setItem(key, new_value);
      logUpdate("save", key, new_value);
    }
  }
  $<SaveBtn>("#saveOptions").onclick(false);
  if ($("#advancedOptionsButton").getAttribute("aria-checked") !== "" + bgSettings_.get_("showAdvancedOptions")) {
    $<AdvancedOptBtn>("#advancedOptionsButton").onclick(null, true);
  }
  console.info("IMPORT settings: finished.");
  const node = window.VDom && VCui.root_ && VCui.root_.querySelector("#HClose") as HTMLElement;
  if (node) { // reload help dialog
    node.click();
    $("#showCommands").click();
  }
  if (window.VHud) { VHud.tip_(kTip.importOK, 1000); }
}

function importSettings_(time: number | string | Date, data: string, is_recommended?: boolean): void {
  let new_data: ExportedSettings | null = null, e: Error | null = null, err_msg = "";
  try {
    let d = parseJSON_(is_recommended ? data : data.replace(<RegExpG> /\xa0/g, " "));
    if (d instanceof Error) { e = d; }
    else if (!d) { err_msg = pTrans_("notJSON"); }
    else { new_data = d; }
  } catch (_e) { e = _e; }
  if (e != null) {
    err_msg = e ? (e.message || e) + "" : pTrans_("exc") + (e !== "" ? e : pTrans_("unknown"));
    let arr = (<RegExpSearchable<2> & RegExpOne> /^(\d+):(\d+)$/).exec(err_msg);
    err_msg = !arr ? err_msg : pTrans_("JSONParseError", [arr[1], arr[2]]);
  }
  if (!new_data) {
    return alert(err_msg);
  }
  {
    time = +new Date(new_data && new_data.time || (typeof time === "object" ? +time : time)) || 0;
    if ((new_data.name !== "Vimium C" && new_data.name !== "Vimium++") || (time < 10000 && time > 0)) {
      err_msg = pTrans_("notVCJSON");
      return alert(err_msg);
    }
  }
  const promisedChecker = Option_.all_.keyMappings.checker_ ? 1 : new Promise<1>(function (resolve): void {
    const element = $<HTMLScriptElement>("script[src*=options_checker]") || loadJS("options_checker.js"),
    cb = function (): void {
      element.removeEventListener("load", cb);
      resolve(1);
    };
    (loadChecker as CheckerLoader).info_ = "";
    element.addEventListener("load", cb);
  }), t2 = time, d2 = new_data;
  Promise.all([BG_.BgUtils_.require_("Commands"), BG_.BgUtils_.require_("Exclusions"), promisedChecker]
      ).then(function (): void {
    setTimeout(_importSettings, 17, t2, d2, is_recommended);
  });
}

let _el: HTMLInputElement | HTMLSelectElement | null = $<HTMLInputElement>("#settingsFile");
_el.onclick = null as never;
_el.onchange = function (this: HTMLInputElement): void {
  const file = (this.files as FileList)[0];
  this.value = "";
  if (!file) { return; }
  const max_size = Option_.all_.vimSync.previous_ ? GlobalConsts.SYNC_QUOTA_BYTES : GlobalConsts.LOCAL_STORAGE_BYTES;
  if (file.size && file.size > max_size) {
    alert(pTrans_("JSONTooLarge", [file.name, max_size / 1024]));
    return;
  }
  const reader = new FileReader(), lastModified = file.lastModified || file.lastModifiedDate || 0;
  reader.onload = function (this: FileReader) {
    let result: string = this.result;
    return importSettings_(lastModified, result, false);
  };
  reader.readAsText(file);
};

_el = $<HTMLSelectElement>("#importOptions");
_el.onclick = null as never;
_el.onchange = function (this: HTMLSelectElement): void {
  $("#importButton").focus();
  if (this.value === "exported") {
    click($("#settingsFile"));
    return;
  }
  const recommended = "../settings_template.json";
  if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
      || bgBrowserVer_ >= BrowserVer.MinFetchExtensionFiles) {
    fetch(recommended).then(r => r.text()).then(t => importSettings_(0, t, true));
    return;
  }
  const req = new XMLHttpRequest();
  req.open("GET", recommended, true);
  req.responseType = "text";
  req.onload = function (this: XMLHttpRequest): void {
    return importSettings_(0, this.responseText, true);
  };
  req.send();
};
_el = null;

(window as OptionWindow)._delayed && (function () {
  const arr = (window as OptionWindow)._delayed;
  delete (window as OptionWindow)._delayed;
  const node = $<ElementWithDelay>(arr[0]), event = arr[1];
  node.onclick && node.onclick(event);
})();

function parseJSON_(text: string): any {
  const notLFRe = <RegExpG & RegExpSearchable<0>> /[^\r\n]+/g
    , errMsgRe = <RegExpSearchable<3> & RegExpOne> /\b(?:position (\d+)|line (\d+) column (\d+))/
    , stringOrCommentRe = <RegExpG & RegExpSearchable<0>
        > /"(?:\\[\\\"]|[^"])*"|'(?:\\[\\\']|[^'])*'|\/\/[^\r\n]*|\/\*[^]*?\*\/|#[^\r\n]*/g
    ;
  if (!text || !(text = text.trimRight())) { return null; }
  let match: string[] | null, kSpaces = " ";
  try {
    const obj = JSON.parse(text.replace(stringOrCommentRe, onReplace));
    clean();
    return obj;
  } catch (e) {
    match = errMsgRe.exec(e + "");
    clean();
    if (!match || !match[0]) { throw e; }
  }
  let err_line: number, err_offset: number;
  if (match[2]) {
    err_line = +match[2]; err_offset = +match[3];
  } else if (+match[1] > 0) {
    const lineEnd = !text.includes("\r") ? "\n" : text.includes("\r\n") ? "\r\n" : "\r"
      , arr = text.slice(0, +match[1]).split(lineEnd);
    err_line = arr.length; err_offset = arr[err_line - 1].length + 1;
  } else {
    err_line = err_offset = 1;
  }
  return new SyntaxError(err_line + ":" + err_offset);

  function clean(this: void): boolean { return (<RegExpOne> /a?/).test(""); }
  function spaceN(this: void, str: string): string {
    let n = str.length;
    for (; kSpaces.length < n; kSpaces += kSpaces) { /* empty */ }
    return kSpaces.slice(0, n);
  }
  function onReplace(this: void, str: string): string {
    let ch = str[0];
    return ch === "/" || ch === "#" ? str.startsWith("/*") ? str.replace(notLFRe, spaceN) : spaceN(str) : str;
  }
}
