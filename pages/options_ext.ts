interface Window {
  readonly VDom?: typeof VDom;
  readonly VPort?: Readonly<VPort>;
  readonly VHUD?: Readonly<VHUD>;
}
declare var VDom: {
  readonly UI: Readonly<DomUI>;
  readonly mouse: VDomMouse;
}, VPort: Readonly<VPort>, VHUD: Readonly<VHUD>;

$<ElementWithDelay>("#showCommands").onclick = function(event): void {
  if (!window.VDom) { return; }
  let node: HTMLElement, root = VDom.UI.root;
  event && event.preventDefault();
  if (!root) {}
  else if (root.querySelector('.HelpCommandName')) {
    node = root.getElementById("HelpDialog") as HTMLElement;
    VDom.UI.addElement(node);
    node.click();
    return;
  } else if (node = root.getElementById("HClose") as HTMLElement) {
    (node as { onclick (e?: MouseEvent): void; }).onclick();
  }
  VPort.post({
    handler: "initHelp",
    unbound: true,
    names: true,
    title: "Command Listing"
  });
  const isIniting = !event;
  setTimeout(function(): void {
    const node = VDom.UI.root && VDom.UI.root.getElementById("HelpDialog") as HTMLElement;
    if (!node) { return; }
    if (isIniting) {
      (node.querySelector("#HClose") as HTMLElement).addEventListener("click", function(): void {
        window.location.hash = "";
      });
    }
    node.onclick = function(event: MouseEvent): void {
      let target = event.target as HTMLElement, str: string;
      if (target.classList.contains("HelpCommandName")) {
        str = target.innerText.slice(1, -1);
        VPort.post({
          handler: "copyToClipboard",
          data: str
        });
        return VHUD.showCopied(str);
      }
    };
  }, 100);
};

ExclusionRulesOption.prototype.sortRules = function(this: ExclusionRulesOption
    , element?: HTMLElement & { timer?: number }): void {
  interface Rule extends ExclusionsNS.StoredRule {
    key: string;
  }
  if (element && element.timer) { return; }
  const rules = this.readValueFromElement() as Rule[], hostRe = <RegExpOne> /^([:^]?[a-z\-?*]+:\/\/)?([^\/]+)(\/.*)?/;
  let rule: Rule, key, arr;
  for (rule of rules) {
    if ((arr = hostRe.exec(key = rule.pattern)) && arr[1] && arr[2]) {
      key = arr[3] || "";
      arr = arr[2].split(".");
      arr.reverse();
      key = arr.join(".") + key;
    }
    rule.key = key;
  }
  rules.sort(function(a, b) { return a.key < b.key ? -1 : a.key === b.key ? 0 : 1; });
  this.populateElement(rules);
  if (!element) { return; }
  element.timer = setTimeout(function(el, text) {
    (el.firstChild as Text).data = text, el.timer = 0;
  }, 1000, element, (element.firstChild as Text).data);
  (element.firstChild as Text).data = "(Sorted)";
};

$("#exclusionSortButton").onclick = function(): void {
  return (Option.all.exclusionRules as ExclusionRulesOption).sortRules(this);
};

function formatDate(time: number | Date): string {
  return new Date(+time - new Date().getTimezoneOffset() * 1000 * 60
    ).toJSON().substring(0, 19).replace('T', ' ');
}

interface ExportedSettings {
  name: "Vimium++";
  author?: string;
  description?: string;
  time?: number;
  environment?: {
    chrome: number;
    extension: string;
    platform: string;
  };
  findModeRawQueryList?: never;
  [key: string]: any;
}

$<ElementWithDelay>("#exportButton").onclick = function(event): void {
  let exported_object: ExportedSettings | null;
  const all_static = event ? event.ctrlKey || event.metaKey || event.shiftKey : false;
  exported_object = Object.create(null) as ExportedSettings & SafeObject;
  exported_object.name = "Vimium++";
  if (!all_static) {
    exported_object.time = 0;
  }
  exported_object.environment = {
    chrome: bgSettings.CONST.ChromeVersion,
    extension: bgSettings.CONST.CurrentVersion,
    platform: bgSettings.CONST.Platform
  };
  (function() {
    const storage = localStorage, all = bgSettings.defaults;
    for (let i = 0, len = storage.length, j: string[]; i < len; i++) {
      const key = storage.key(i) as string as keyof SettingsNS.PersistentSettings;
      if (key.indexOf("|") >= 0 || key.substring(key.length - 2) === "_f" || key === "findModeRawQueryList") {
        continue;
      }
      const storedVal = storage.getItem(key) as string;
      if (typeof all[key] !== "string") {
        exported_object[key] = (key in all) ? bgSettings.get(key) : storedVal;
      } else if (storedVal.indexOf("\n") > 0) {
        exported_object[key] = j = storedVal.split("\n");
        j.push("");
      } else {
        exported_object[key] = storedVal;
      }
    }
  })();
  const d = new Date();
  if (!all_static) {
    exported_object.time = d.getTime();
  }
  const exported_data = JSON.stringify(exported_object, null, '\t'), d_s = formatDate(d);
  exported_object = null;
  let file_name = 'vimium++_';
  if (all_static) {
    file_name += "settings";
  } else {
    file_name += d_s.replace(<RegExpG> /[\-:]/g, "").replace(" ", "_");
  }
  file_name += '.json';

  const nodeA = document.createElement("a");
  nodeA.download = file_name;
  nodeA.href = URL.createObjectURL(new Blob([exported_data]));
  nodeA.click();
  URL.revokeObjectURL(nodeA.href);
  console.info("EXPORT settings to %c%s%c at %c%s%c."
    , "color: darkred", file_name, "color: auto"
    , "color: darkblue", d_s, "color: auto");
};

function _importSettings(time: number | string | Date, new_data: ExportedSettings | null, is_recommended?: boolean): void {
  time = +new Date(new_data && new_data.time || time) || 0;
  if (!new_data || new_data.name !== "Vimium++" || (time < 10000 && time > 0)) {
    const err_msg = new_data ? "No settings data found!" : "Fail to parse the settings";
    window.VHUD ? VHUD.showForDuration(err_msg, 2000) : alert(err_msg);
    return;
  } else if (!confirm(
    (is_recommended !== true ? "You are loading a settings copy exported"
      + (time ? " at:\n        " + formatDate(time) : " before.")
      : "You are loading the recommended settings.")
    + "\n\nAre you sure you want to continue?"
  )) {
    window.VHUD && VHUD.showForDuration("You cancelled importing.", 1000);
    return;
  }

  const logUpdate = function(method: string, key: string, ...args: any[]): any {
    let val = args.pop();
    val = typeof val !== "string" || val.length <= 72 ? val
      : val.substring(0, 68).trimRight() + " ...";
    return console.log("%s %c%s%c", method, "color: darkred", key, "color: auto", ...args, val);
  } as {
    (method: string, key: string, val: any): any;
    (method: string, key: string, actionName: string, val: any): any;
  };
  if (time > 10000) {
    console.info("IMPORT settings saved at %c%s%c"
      , "color: darkblue", formatDate(time), "color: auto");
  } else {
    console.info("IMPORT settings:", is_recommended ? "recommended" : "saved before");
  }

  Object.setPrototypeOf(new_data, null);
  delete new_data.name;
  delete new_data.time;
  delete new_data.environment;
  delete new_data.author;
  delete new_data.description;

  const storage = localStorage, all = bgSettings.defaults, _ref = Option.all;
  for (let i = storage.length; 0 <= --i; ) {
    const key = storage.key(i) as string;
    if (key.indexOf("|") >= 0) { continue; }
    if (!(key in new_data)) {
      new_data[key] = null;
    }
  }
  delete new_data.findModeRawQuery;
  delete new_data.findModeRawQueryList;
  delete new_data.newTabUrl_f;
  for (let _key in _ref) {
    const item: Option<any> = _ref[_key as keyof AllowedOptions];
    let key: keyof AllowedOptions = item.field, new_value: any = new_data[key];
    delete new_data[key];
    if (new_value == null) {
      // NOTE: we assume all nullable settings have the same default value: null
      new_value = all[key];
    } else {
      if (new_value instanceof Array && typeof all[key] === "string") {
        new_value = new_value.join("\n").trim();
      }
      new_value = item.normalize(new_value, typeof all[key] === "object");
    }
    if (!item.areEqual(bgSettings.get(key), new_value)) {
      logUpdate("import", key, new_value);
      bgSettings.set(key, new_value);
      if (key in bgSettings.bufferToLoad) {
        Option.syncToFrontend.push(key as keyof SettingsNS.FrontendSettings);
      }
    } else if (item.saved) {
      continue;
    }
    item.fetch();
  }
  for (let key in new_data) {
    let new_value = new_data[key];
    type SettingKeys = keyof SettingsNS.SettingsWithDefaults;
    if (new_value == null) {
      if (key in all) {
        new_value = all[key as SettingKeys];
        if (bgSettings.get(key as SettingKeys) !== new_value) {
          bgSettings.set(key as SettingKeys, new_value);
          logUpdate("reset", key, new_value);
          continue;
        }
        new_value = bgSettings.get(key as SettingKeys);
      } else {
        new_value = storage.getItem(key as SettingKeys);
      }
      storage.removeItem(key as SettingKeys);
      logUpdate("remove", key, ":=", new_value);
      continue;
    }
    if (new_value instanceof Array && typeof all[key as SettingKeys] === "string") {
      new_value = new_value.join("\n").trim();
    }
    if (key in all) {
      if (bgSettings.get(key as SettingKeys) !== new_value) {
        bgSettings.set(key as SettingKeys, new_value);
        logUpdate("update", key, new_value);
      }
    } else {
      storage.setItem(key, new_value);
      logUpdate("save", key, new_value);
    }
  }
  $<SaveBtn>("#saveOptions").onclick(false);
  if ($("#advancedOptionsButton").getAttribute("aria-checked") != '' + bgSettings.get("showAdvancedOptions")) {
    $<AdvancedOptBtn>("#advancedOptionsButton").onclick(null, true);
  }
  console.info("IMPORT settings: finished.");
  if (window.VHUD) { return VHUD.showForDuration("Import settings data: OK!", 1000); }
}

function importSettings(time: number | string | Date
    , new_data: ExportedSettings | null, is_recommended?: boolean): void {
  const promisedChecker = Option.all.keyMappings.checker ? 1 : new Promise<1>(function(resolve): void {
    const element = loadJS("options_checker.js");
    element.onload = function(): void { resolve(1); };
    element.remove();
  });
  Promise.all([BG.Utils.require("Commands"), BG.Utils.require("Exclusions"), promisedChecker]).then(function() {
    setTimeout(_importSettings, 17, time, new_data, is_recommended);
  });
}

let _el: HTMLInputElement | HTMLSelectElement | null = $<HTMLInputElement>("#settingsFile");
_el.onclick = null as never;
_el.onchange = function(this: HTMLInputElement): void {
  const file = (this.files as FileList)[0];
  this.value = "";
  if (!file) { return; }
  const reader = new FileReader(), lastModified = file.lastModified || file.lastModifiedDate || 0;
  reader.onload = function(this: FileReader) {
    let result: string = this.result, data: ExportedSettings | null = null;
    try {
      data = result ? JSON.parse<ExportedSettings>(result) : null;
    } catch (e) {}
    return importSettings(lastModified, data, false);
  };
  reader.readAsText(file);
};

_el = $<HTMLSelectElement>("#importOptions");
_el.onclick = null as never;
_el.onchange = function(this: HTMLSelectElement): void {
  if (this.value === "exported") {
    $("#settingsFile").click();
    return;
  }
  const req = new XMLHttpRequest();
  req.open("GET", "../settings_template.json", true);
  req.responseType = "json";
  req.onload = function(this: XMLHttpRequest): void {
    return importSettings(0, this.response as ExportedSettings | null, true);
  };
  req.send();
};
_el = null;

(window as OptionWindow)._delayed && (function() {
  const arr = (window as OptionWindow)._delayed;
  delete (window as OptionWindow)._delayed;
  const node = $<ElementWithDelay>(arr[0]), event = arr[1];
  node.onclick && node.onclick(event);
})();
