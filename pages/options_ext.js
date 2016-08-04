"use strict";

$("showCommands").onclick = function(event) {
  if (!window.DomUtils) { return; }
  var node, root = DomUtils.UI.root;
  event && event.preventDefault();
  Vomnibar.input && Vomnibar.input.blur();
  if (!root) {}
  else if (root.querySelector('.HelpCommandName')) {
    node = root.getElementById("HelpDialog");
    DomUtils.UI.addElement(node);
    node.click();
    return;
  } else if (node = root.getElementById("HClose")) {
    node.onclick();
  }
  MainPort.port.postMessage({
    handler: "initHelp",
    unbound: true,
    names: true,
    title: "Command Listing"
  });
  setTimeout(function() {
    var node = DomUtils.UI.root && DomUtils.UI.root.getElementById("HelpDialog");
    if (!node) { return; }
    node.onclick = function(event) {
      var target = event.target, str;
      if (target.classList.contains("HelpCommandName")) {
        str = target.innerText.slice(1, -1);
        MainPort.port.postMessage({
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
    el.textContent = text, el.timer = 0;
  }, 1000, element, element.textContent);
  element.textContent = "(Sorted)";
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
    var storage = localStorage, i, len, key, mark_head, all = bgSettings.defaults
      , storedVal;
    mark_head = BG.Marks.getMarkKey("");
    for (i = 0, len = storage.length; i < len; i++) {
      key = storage.key(i);
      if (key === "name" || key === "time" || key.startsWith(mark_head)) {
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
  delete exported_object.newTabUrl_f;
  d = new Date();
  exported_object.time = d.getTime();
  exported_data = JSON.stringify(exported_object, null, '\t');
  exported_object = null;
  file_name = 'vimium++_';
  if (event && (event.ctrlKey || event.metaKey || event.shiftKey)) {
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
  console.log("EXPORT settings to", file_name, "at", formatDate(d));
};

var importSettings = function(time, new_data) {
  time = +(new_data && new_data.time || time) || 0;
  if (!new_data || new_data.name !== "Vimium++" || (time < 10000 && time > 0)) {
    window.VHUD && VHUD.showForDuration("No settings data found!", 2000);
    return;
  } else if (!confirm(
    "You are loading a settings copy exported" + (time ? " at:\n        "
    + formatDate(time) : " before.")
    + "\n\nAre you sure you want to continue?"
  )) {
    window.VHUD && VHUD.showForDuration("You cancelled importing.", 1000);
    return;
  }

  var storage = localStorage, i, key, new_value, func, all = bgSettings.defaults
    , _ref = Option.all, _key, item;
  func = function(val) {
    return typeof val !== "string" || val.length <= 72 ? val
      : val.substring(0, 68).trimRight() + " ...";
  };
  console.log("IMPORT settings at", formatDate(new Date(time)));
  Object.setPrototypeOf(new_data, null);
  delete new_data.name;
  delete new_data.time;
  delete new_data.findModeRawQuery;
  storage.removeItem("findModeRawQuery");
  for (i = storage.length; 0 <= --i; ) {
    key = storage.key(i);
    if (!(key in new_data)) {
      new_data[key] = null;
    }
  }
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
      console.log("import", key, func(new_value));
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
          console.log("reset", key, func(new_value));
          continue;
        }
        new_value = bgSettings.get(key);
      } else {
        new_value = storage.getItem(key);
      }
      storage.removeItem(key);
      console.log("remove", key, ":=", func(new_value));
      continue;
    }
    if (new_value.join && typeof all[key] === "string") {
      new_value = new_value.join("\n").trim();
    }
    if (key in all) {
      if (bgSettings.get(key) !== new_value) {
        bgSettings.set(key, new_value);
        console.log("update", key, func(new_value));
      }
    } else {
      storage.setItem(key, new_value);
      console.log("save", key, func(new_value));
    }
  }
  $("saveOptions").onclick(false);
  window.VHUD && VHUD.showForDuration("Import settings data: OK!", 1000);
  console.log("IMPORT settings: finished");
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
    setTimeout(importSettings, 17, lastModified, data);
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
    setTimeout(importSettings, 17, 0, this.response);
  };
  req.send();
};

if (window._delayed) {
  window._delayed = $(window._delayed);
  window._delayed.onclick && window._delayed.onclick();
  delete window._delayed;
}
