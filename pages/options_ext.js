"use strict";

$("showCommands").onclick = function(event) {
  if (!window.VDom) { return; }
  var node, root = VDom.UI.root;
  event && event.preventDefault();
  if (!root) {}
  else if (root.querySelector('.HelpCommandName')) {
    node = root.getElementById("HelpDialog");
    VDom.UI.addElement(node);
    node.click();
    return;
  } else if (node = root.getElementById("HClose")) {
    node.onclick();
  }
  VPort.port.postMessage({
    handler: "initHelp",
    unbound: true,
    names: true,
    title: "Command Listing"
  });
  setTimeout(function() {
    var node = VDom.UI.root && VDom.UI.root.getElementById("HelpDialog");
    if (!node) { return; }
    node.onclick = function(event) {
      var target = event.target, str;
      if (target.classList.contains("HelpCommandName")) {
        str = target.innerText.slice(1, -1);
        VPort.port.postMessage({
          handler: "copyToClipboard",
          data: str
        });
        VHUD.showCopied(str);
      }
    };
  }, 50);
};

ExclusionRulesOption.prototype.sortRules = function(element) {
  if (element && element.timer) { return; }
  var rules = this.readValueFromElement(), _i, rule, key, arr
    , hostRe = /^([:^]?[a-z\-?*]+:\/\/)?([^\/]+)(\/.*)?/;
  for (_i = 0; _i < rules.length; _i++) {
    rule = rules[_i];
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
    el.firstChild.data = text, el.timer = 0;
  }, 1000, element, element.firstChild.data);
  element.firstChild.data = "(Sorted)";
};

$("exclusionSortButton").onclick = function() { Option.all.exclusionRules.sortRules(this); };

var formatDate = function(time) {
  return new Date(time - new Date().getTimezoneOffset() * 1000 * 60
    ).toJSON().substring(0, 19).replace('T', ' ');
};

$("exportButton").onclick = function(event) {
  var exported_object, exported_data, file_name, d, nodeA;
  exported_object = Object.create(null);
  exported_object.name = "Vimium++";
  exported_object.time = 0;
  (function() {
    var storage = localStorage, i, len, key, storedVal, all = bgSettings.defaults;
    for (i = 0, len = storage.length; i < len; i++) {
      key = storage.key(i);
      if (key.indexOf("|") >= 0 || key.substring(key.length - 2) === "_f") {
        continue;
      }
      storedVal = storage.getItem(key);
      if (typeof all[key] !== "string") {
        exported_object[key] = (key in all) ? bgSettings.get(key) : storedVal;
      } else if (storage.getItem(key).indexOf("\n") > 0) {
        exported_object[key] = storedVal.split("\n");
        exported_object[key].push("");
      } else {
        exported_object[key] = storedVal;
      }
    }
  })();
  delete exported_object.findModeRawQueryList;
  d = new Date();
  exported_object.time = d.getTime();
  exported_data = JSON.stringify(exported_object, null, '\t');
  exported_object = null;
  file_name = 'vimium++_';
  if (event && (event.ctrlKey || event.shiftKey)) {
    file_name += "settings";
  } else {
    file_name += formatDate(d).replace(/[\-:]/g, "").replace(" ", "_");
  }
  file_name += '.json';

  nodeA = document.createElement("a");
  nodeA.download = file_name;
  nodeA.href = URL.createObjectURL(new Blob([exported_data]));
  nodeA.click();
  URL.revokeObjectURL(nodeA.href);
  console.info("EXPORT settings to %c%s%c at %c%s%c."
    , "color: darkred", file_name, "color: auto"
    , "color: darkblue", formatDate(d), "color: auto");
};

var importSettings = function(time, new_data, is_recommended) {
  time = +new Date(new_data && new_data.time || time) || 0;
  if (!new_data || new_data.name !== "Vimium++" || (time < 10000 && time > 0)) {
    key = "No settings data found!";
    window.VHUD ? VHUD.showForDuration(key, 2000) : alert(new_data ? key : "Fail to parse the settings");
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

  var storage = localStorage, i, key, new_value, logUpdate, all = bgSettings.defaults
    , _ref = Option.all, _key, item;
  logUpdate = function(method, key, val) {
    var args = [].slice.call(arguments, 2);
    val = args.pop();
    val = typeof val !== "string" || val.length <= 72 ? val
      : val.substring(0, 68).trimRight() + " ...";
    args.push(val);
    args = ["%s %c%s%c", method, "color: darkred", key, "color: auto"].concat(args);
    console.log.apply(console, args);
  };
  if (time > 10000) {
    console.info("IMPORT settings saved at %c%s%c"
      , "color: darkblue", formatDate(new Date(time)), "color: auto");
  } else {
    console.info("IMPORT settings:", is_recommended ? "recommended" : "saved before");
  }

  Object.setPrototypeOf(new_data, null);
  delete new_data.name;
  delete new_data.time;
  delete new_data.author;
  delete new_data.description;
  for (i = storage.length; 0 <= --i; ) {
    key = storage.key(i);
    if (key.indexOf("|") >= 0) { continue; }
    if (!(key in new_data)) {
      new_data[key] = null;
    }
  }
  delete new_data.findModeRawQuery;
  delete new_data.findModeRawQueryList;
  delete new_data.newTabUrl_f;
  for (_key in _ref) {
    item = _ref[_key];
    key = item.field;
    new_value = new_data[key];
    delete new_data[key];
    if (new_value == null) {
      // NOTE: we assume all nullable settings have the same default value: null
      new_value = all[key];
    } else if (new_value.join && typeof all[key] === "string") {
      new_value = new_value.join("\n").trim();
    }
    if (!item.areEqual(bgSettings.get(key), new_value)) {
      logUpdate("import", key, new_value);
      bgSettings.set(key, new_value);
      if (key in bgSettings.bufferToLoad) {
        Option.syncToFrontend.push(key);
      }
    } else if (item.saved) {
      continue;
    }
    item.fetch();
  }
  for (key in new_data) {
    new_value = new_data[key];
    if (new_value == null) {
      if (key in all) {
        new_value = all[key];
        if (bgSettings.get(key) !== new_value) {
          bgSettings.set(key, new_value);
          logUpdate("reset", key, new_value);
          continue;
        }
        new_value = bgSettings.get(key);
      } else {
        new_value = storage.getItem(key);
      }
      storage.removeItem(key);
      logUpdate("remove", key, ":=", new_value);
      continue;
    }
    if (new_value.join && typeof all[key] === "string") {
      new_value = new_value.join("\n").trim();
    }
    if (key in all) {
      if (bgSettings.get(key) !== new_value) {
        bgSettings.set(key, new_value);
        logUpdate("update", key, new_value);
      }
    } else {
      storage.setItem(key, new_value);
      logUpdate("save", key, new_value);
    }
  }
  $("saveOptions").onclick(false);
  if ($("advancedOptionsButton").getAttribute("data-checked") != '' + bgSettings.get("showAdvancedOptions")) {
    $("advancedOptionsButton").onclick(null, true);
  }
  window.VHUD && VHUD.showForDuration("Import settings data: OK!", 1000);
  console.info("IMPORT settings: finished.");
};

var _el = $("settingsFile");
_el.onclick = null;
_el.onchange = function() {
  var file = this.files[0], reader, lastModified;
  this.value = "";
  if (!file) { return; }
  reader = new FileReader();
  lastModified = file.lastModified;
  reader.onload = function() {
    var result = this.result, data;
    try {
      data = result && JSON.parse(result);
    } catch (e) {}
    setTimeout(importSettings, 17, lastModified, data, false);
  };
  reader.readAsText(file);
};

_el = $("importOptions");
_el.onclick = null;
_el.onchange = function() {
  if (this.value === "Exported File") {
    $("settingsFile").click();
    return;
  }
  var req = new XMLHttpRequest();
  req.open("GET", "../settings_template.json", true);
  req.responseType = "json";
  req.onload = function() {
    setTimeout(importSettings, 17, 0, this.response, true);
  };
  req.send();
};

window._delayed && (function() {
  var arr = window._delayed, node, event;
  delete window._delayed;
  node = $(arr[0]);
  event = arr[1];
  node.onclick && node.onclick(event);
})();
