$<ElementWithDelay>("#showCommands").onclick = function (event): void {
  if (!window.VDom) { return; }
  let node: HTMLElement | null, root = VDom.UI.UI;
  event && event.preventDefault();
  if (!root) { /* empty */ }
  else if (node = root.querySelector("#HClose") as HTMLElement | null) {
    const isCommand = root.querySelector(".HelpCommandName") != null;
    click(node);
    if (isCommand) { return; }
  }
  VPort.post_({
    H: kFgReq.initHelp,
    b: true,
    n: true,
    t: "Command Listing"
  });
  if (event) { return; }
  setTimeout(function (): void {
    const node2 = VDom.UI.UI && VDom.UI.UI.querySelector("#HelpDialog") as HTMLElement;
    if (!node2) { return; }
    (node2.querySelector("#HClose") as HTMLElement).addEventListener("click", function (): void {
      location.hash = "";
    });
  }, 100);
};

ExclusionRulesOption_.prototype.sortRules_ = function (this: ExclusionRulesOption_
    , element?: HTMLElement): void {
  interface Rule extends ExclusionsNS.StoredRule {
    key: string;
  }
  if (element && this.timer_) { return; }
  const rules = this.readValueFromElement_() as Rule[], hostRe = <RegExpOne> /^([:^]?[a-z\-?*]+:\/\/)?([^\/]+)(\/.*)?/;
  let key: Rule["pattern"], arr: string[] | null;
  for (const rule of rules) {
    if ((arr = hostRe.exec(key = rule.pattern)) && arr[1] && arr[2]) {
      key = arr[3] || "";
      arr = arr[2].split(".");
      arr.reverse();
      key = arr.join(".") + key;
    }
    rule.key = key;
  }
  rules.sort((a, b) => a.key < b.key ? -1 : a.key === b.key ? 0 : 1);
  this.populateElement_(rules);
  if (!element) { return; }
  let self = this;
  this.timer_ = setTimeout(function (el, text) {
    (el.firstChild as Text).data = text, self.timer_ = 0;
  }, 1000, element, (element.firstChild as Text).data);
  (element.firstChild as Text).data = "(Sorted)";
};

$("#exclusionSortButton").onclick = function (): void {
  return (Option_.all_.exclusionRules as ExclusionRulesOption_).sortRules_(this);
};

function formatDate(time: number | Date): string {
  return new Date(+time - new Date().getTimezoneOffset() * 1000 * 60
    ).toJSON().substring(0, 19).replace("T", " ");
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
function cleanRes() {
  if (_lastBlobURL) {
    URL.revokeObjectURL(_lastBlobURL);
    _lastBlobURL = "";
  }
}

$<ElementWithDelay>("#exportButton").onclick = function (event): void {
  cleanRes();
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
  for (let storage = localStorage, all = bgSettings_.defaults_, i = 0, len = storage.length, j: string[]
      ; i < len; i++) {
    const key = storage.key(i) as string as keyof SettingsNS.PersistentSettings;
    if (key.indexOf("|") >= 0 || key.substring(key.length - 2) === "_f"
        || key === "findModeRawQueryList"
        || key.lastIndexOf("CSS") === key.length - 3 // ignore innerCSS, findCSS, omniCSS
    ) {
      continue;
    }
    const storedVal = storage.getItem(key) as string;
    if (typeof all[key] !== "string") {
      exported_object[key] = (key in all) ? bgSettings_.get_(key) : storedVal;
    } else if (storedVal.indexOf("\n") > 0) {
      exported_object[key] = j = storedVal.split("\n");
      j.push("");
    } else {
      exported_object[key] = storedVal;
    }
  }
  let exported_data = JSON.stringify(exported_object, null, "\t"), d_s = formatDate(d);
  if (exported_object.environment.platform === "win") {
    // in case "endings" didn't work
    exported_data = exported_data.replace(<RegExpG> /\n/g, "\r\n");
  }
  exported_object = null;
  let file_name = "vimium-c_";
  if (all_static) {
    file_name += "settings";
  } else {
    file_name += d_s.replace(<RegExpG> /[\-:]/g, "").replace(" ", "_");
  }
  file_name += ".json";
  const blob = new Blob([exported_data], {type: "application/json", endings: "native"});

  type BlobSaver = (blobData: Blob, fileName: string) => any;
  interface NavigatorEx extends Navigator { msSaveOrOpenBlob?: BlobSaver; }
  if ((navigator as NavigatorEx).msSaveOrOpenBlob) {
    (navigator as NavigatorEx & {msSaveOrOpenBlob: BlobSaver}).msSaveOrOpenBlob(blob, file_name);
  } else {
    const nodeA = document.createElement("a");
    nodeA.download = file_name;
    nodeA.href = URL.createObjectURL(blob);
    _lastBlobURL = nodeA.href;
    click(nodeA);
  }
  console.info("EXPORT settings to %c%s%c at %c%s%c."
    , "color:darkred", file_name, "color:auto", "color:darkblue", d_s, "color:auto");
};

function _importSettings(time: number, new_data: ExportedSettings, is_recommended?: boolean): void {
  let env = new_data.environment, plat = env && env.platform || ""
    , ext_ver = env && parseFloat(env.extension || 0) || 0
    , newer = ext_ver > parseFloat(bgSettings_.CONST_.VerCode_);
  plat && (plat = ("" + plat).substring(0, 10));
  if (!confirm(
`You are loading ${is_recommended !== true ? "a settings copy" : "the recommended settings:"}
      * from ${ext_ver > 1 ? `version ${ext_ver} of ` : "" }Vimium C${newer ? " (newer)" : ""}
      * for ${plat ? `the ${plat[0].toUpperCase() + plat.substring(1)} platform` : "common platforms" }
      * exported ${time ? "at " + formatDate(time) : "before"}

Are you sure you want to continue?`
  )) {
    window.VHUD && VHUD.tip_("You cancelled importing.", 1000);
    return;
  }
  Object.setPrototypeOf(new_data, null);
  if (new_data.vimSync == null) {
    const now = bgSettings_.get_("vimSync"), keep = now && confirm(
      "Do you want to keep settings synchronized with your current Google account?"
    );
    new_data.vimSync = keep || null;
    if (now) {
      console.log("Before importing: You chose to " + (keep ? "keep settings synced." : "stop syncing settings."));
    }
    // if `new_data.vimSync` was undefined, then now it's null
    // this is useful, in case the below itering localStorage and setting-null was changed
  }

  const logUpdate = function (method: string, key: string, ...args: any[]): any {
    let val = args.pop();
    val = typeof val !== "string" || val.length <= 72 ? val
      : val.substring(0, 71).trimRight() + "\u2026";
    return console.log("%s %c%s", method, "color:darkred", key, ...args, val);
  } as {
    (method: string, key: string, val: any): any;
    (method: string, key: string, actionName: string, val: any): any;
  };
  if (time > 10000) {
    console.info("IMPORT settings saved at %c%s%c.", "color:darkblue", formatDate(time), "color:auto");
  } else {
    console.info("IMPORT settings:", is_recommended ? "recommended" : "saved before");
  }

  delete new_data.name;
  delete new_data.time;
  delete new_data.environment;
  delete new_data.author;
  delete new_data.description;
  for (let key in new_data) {
    if (key[0] === "@") {
      delete new_data[key];
    }
  }

  const storage = localStorage, all = bgSettings_.defaults_, _ref = Option_.all_,
  otherLineEndRe = <RegExpG> /\r\n?/g;
  for (let i = storage.length; 0 <= --i; ) {
    const key = storage.key(i) as string;
    if (key.indexOf("|") >= 0) { continue; }
    if (!(key in new_data)) {
      new_data[key] = null;
    }
  }
  delete new_data.findModeRawQuery;
  delete new_data.findModeRawQueryList;
  delete new_data.innerCSS;
  delete new_data.findCSS;
  delete new_data.omniCSS;
  delete new_data.newTabUrl_f;
  if (new_data.vimSync !== bgSettings_.get_("vimSync")) {
    logUpdate("import", "vimSync", new_data.vimSync);
    bgSettings_.set_("vimSync", new_data.vimSync);
    _ref.vimSync.fetch_();
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
      if (key in bgSettings_.payload_) {
        Option_.syncToFrontend_.push(key as keyof SettingsNS.FrontendSettings);
      }
    } else if (item.saved_) {
      continue;
    }
    item.fetch_();
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
  const node = window.VDom && VDom.UI.UI && VDom.UI.UI.querySelector("#HClose") as HTMLElement;
  if (node) { // reload help dialog
    node.click();
    $("#showCommands").click();
  }
  if (window.VHUD) { return VHUD.tip_("Import settings data: OK!", 1000); }
}

function importSettings(time: number | string | Date
    , data: string, is_recommended?: boolean): void {
  let new_data: ExportedSettings | null = null, e: Error | null = null, err_msg: string = "";
  try {
    let d = parseJSON(data);
    if (d instanceof Error) { e = d; }
    else if (!d) { err_msg = "No JSON data found!"; }
    else { new_data = d; }
  } catch (_e) { e = _e; }
  if (e != null) {
    err_msg = e ? e.message + "" : "Error: " + (e !== "" ? e : "(unknown)");
    let arr = (<RegExpSearchable<2> & RegExpOne> /^(\d+):(\d+)$/).exec(err_msg);
    err_msg = !arr ? err_msg :
`Sorry, Vimium C can not parse the JSON file:
  an unexpect character at line ${arr[1]}, column ${arr[2]}`;
  }
  if (new_data) {
    time = +new Date(new_data && new_data.time || (typeof time === "object" ? +time : time)) || 0;
    if ((new_data.name !== "Vimium C" && new_data.name !== "Vimium++") || (time < 10000 && time > 0)) {
      err_msg = "Sorry, no Vimium C settings data found!";
      new_data = null;
    }
  }
  if (err_msg) {
    return alert(err_msg);
  }
  const promisedChecker = Option_.all_.keyMappings.checker_ ? 1 : new Promise<1>(function (resolve): void {
    const element = loadJS("options_checker.js");
    element.onload = function (): void { resolve(1); };
  });
  Promise.all([BG_.Utils.require_("Commands"), BG_.Utils.require_("Exclusions"), promisedChecker]).then(function () {
    setTimeout(_importSettings, 17, time, new_data, is_recommended);
  });
}

let _el: HTMLInputElement | HTMLSelectElement | null = $<HTMLInputElement>("#settingsFile");
_el.onclick = null as never;
_el.onchange = function (this: HTMLInputElement): void {
  const file = (this.files as FileList)[0];
  this.value = "";
  if (!file) { return; }
  const reader = new FileReader(), lastModified = file.lastModified || file.lastModifiedDate || 0;
  reader.onload = function (this: FileReader) {
    let result: string = this.result;
    return importSettings(lastModified, result, false);
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
  const req = new XMLHttpRequest();
  req.open("GET", "../settings_template.json", true);
  req.responseType = "text";
  req.onload = function (this: XMLHttpRequest): void {
    return importSettings(0, this.responseText, true);
  };
  req.send();
};
_el = null;

(window as OptionWindow)._delayed && (function () {
  const arr = (window as OptionWindow)._delayed;
  delete (window as OptionWindow)._delayed;
  const node = $<ElementWithDelay>(arr[0]), event = arr[1];
  node.onclick && node.onclick(event);
  BG_.Utils.GC_();
})();

function parseJSON(text: string): any {
  const notLFRe = <RegExpG & RegExpSearchable<0>> /[^\r\n]+/g
    , errMsgRe = <RegExpSearchable<3> & RegExpOne> /\b(?:position (\d+)|line (\d+) column (\d+))/
    , stringOrCommentRe = <RegExpG & RegExpSearchable<0>
        > /"(?:\\[\\\"]|[^"])*"|'(?:\\[\\\']|[^'])*'|\/\/[^\r\n]*|\/\*[^]*?\*\//g
    ;
  if (!text || !(text = text.trimRight())) { return null; }
  let match: string[] | null;
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
    const LF = text.indexOf("\r") < 0 ? "\n" : text.indexOf("\r\n") < 0 ? "\r\n" : "\r"
      , arr = text.substring(0, +match[1]).split(LF);
    err_line = arr.length; err_offset = arr[err_line - 1].length + 1;
  } else {
    err_line = err_offset = 1;
  }
  return new SyntaxError(err_line + ":" + err_offset);

  function clean(this: void): boolean { return (<RegExpOne> /a?/).test(""); }
  function spaceN(this: void, str: string): string {
    if (" ".repeat) { return (" " as Ensure<string, "repeat">).repeat(str.length); }
    for (var s2 = "", n = str.length; 0 < n--; ) { s2 += " "; }
    return s2;
  }
  function onReplace(this: void, str: string): string {
    let ch = str[0];
    return ch === "/" || ch === "#" ? str[0] === "/*" ? str.replace(notLFRe, spaceN) : spaceN(str) : str;
  }
}
